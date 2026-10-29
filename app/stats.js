/** Robust training statistics. Times are seconds; rates are fractions from 0 to 1. */
export const MIN_SAMPLES = 5;
export const DEFAULT_SPEED_WINDOW = 20;
export const MAX_SPEED_WINDOW = 1000;

export function quantile(values, proportion) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.min(1, proportion)) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

export const median = values => quantile(values, 0.5);

const validTime = attempt => Number.isFinite(attempt.seconds) && attempt.seconds > 0;
const explicitLapse = attempt => Boolean(attempt.recallFail || attempt.dnf);
const unassisted = attempt => !attempt.assisted;

/**
 * Typical speed uses successful, unassisted solves with no marked recall failure.
 * A slow-tail lapse is > max(1.75 × median, median + 3 scaled MAD, median + 2s).
 * Outlier detection starts at five clean observations and is diagnostic, never
 * changes the original result. Explicit failures count immediately.
 */
export function summarize(attempts = []) {
  const recorded = attempts.filter(attempt => attempt && typeof attempt === 'object');
  const eligible = recorded.filter(unassisted);
  const timed = eligible.filter(validTime);
  const clean = timed.filter(attempt => !explicitLapse(attempt));
  const cleanTimes = clean.map(attempt => attempt.seconds);
  const typical = median(cleanTimes);
  const mad = typical === null ? null : median(cleanTimes.map(time => Math.abs(time - typical)));
  const robustSpread = mad === null ? null : mad * 1.4826;
  const sufficient = clean.length >= MIN_SAMPLES;
  const lapseThreshold = sufficient
    ? Math.max(typical * 1.75, typical + robustSpread * 3, typical + 2)
    : null;
  const slowOutliers = lapseThreshold === null ? [] : clean.filter(attempt => attempt.seconds > lapseThreshold);
  const explicitFailures = eligible.filter(explicitLapse);
  const lapseCount = explicitFailures.length + slowOutliers.length;
  const best = cleanTimes.length ? Math.min(...cleanTimes) : null;
  const average = cleanTimes.length ? cleanTimes.reduce((total, time) => total + time, 0) / cleanTimes.length : null;
  return {
    count: recorded.length,
    eligibleCount: eligible.length,
    timedCount: timed.length,
    successCount: clean.length,
    assistedCount: recorded.length - eligible.length,
    recallFailCount: eligible.filter(attempt => attempt.recallFail).length,
    dnfCount: eligible.filter(attempt => attempt.dnf).length,
    explicitFailureCount: explicitFailures.length,
    slowOutlierCount: slowOutliers.length,
    lapseCount,
    lapseRate: eligible.length ? lapseCount / eligible.length : null,
    median: typical,
    typical,
    average,
    best,
    mad,
    robustSpread,
    relativeSpread: typical ? robustSpread / typical : null,
    p90: quantile(timed.map(attempt => attempt.seconds), 0.9),
    cleanP90: quantile(cleanTimes, 0.9),
    lapseThreshold,
    sufficient,
    minSamples: MIN_SAMPLES,
  };
}

/**
 * One-look inspection includes measured, unassisted inspections regardless of
 * solve outcome. Missing durations and explicit start/stop timings do not count;
 * legacy records without a timing mode use their measured inspection duration.
 * "Under" is strict: an inspection of exactly 8, 12 or 15 seconds misses that
 * threshold. A measured zero is valid and differs from an absent measurement.
 */
export function summarizeInspection(attempts = []) {
  const times = attempts.filter(attempt =>
    attempt && typeof attempt === 'object' && attempt.mode === 'one-look' &&
    !attempt.assisted && Number.isFinite(attempt.inspectionSeconds) && attempt.inspectionSeconds >= 0 &&
    (attempt.timingMode === undefined || attempt.timingMode === 'inspection')
  ).map(attempt => attempt.inspectionSeconds);
  const count = times.length;
  const rateUnder = threshold => count ? times.filter(time => time < threshold).length / count : null;
  return {
    count,
    average: count ? times.reduce((sum, time) => sum + time / count, 0) : null,
    under15Rate: rateUnder(15),
    under12Rate: rateUnder(12),
    under8Rate: rateUnder(8),
  };
}

/** Empty scalar, empty array and "all" filters are unrestricted. */
export function attemptMatches(attempt, filters = {}) {
  return Object.entries(filters).every(([key, expected]) => {
    if (expected === undefined || expected === null || expected === '' || expected === 'all') return true;
    if (Array.isArray(expected) && !expected.length) return true;
    if (key === 'since') return new Date(attempt.createdAt).getTime() >= new Date(expected).getTime();
    if (key === 'until') return new Date(attempt.createdAt).getTime() <= new Date(expected).getTime();
    if (key === 'predicate') return typeof expected === 'function' ? expected(attempt) : true;
    if (Array.isArray(expected)) return expected.includes(attempt[key]);
    return attempt[key] === expected;
  });
}

export function filterAttempts(attempts, filters = {}) {
  return attempts.filter(attempt => attemptMatches(attempt, filters));
}

/** Returns a new array; callers persist it only after confirming scope in UI. */
export function resetAttempts(attempts, filters = {}) {
  return attempts.filter(attempt => !attemptMatches(attempt, filters));
}

export function groupAttempts(attempts, field = 'caseId') {
  const groups = new Map();
  for (const attempt of attempts) {
    const value = attempt[field] ?? 'unknown';
    if (!groups.has(value)) groups.set(value, []);
    groups.get(value).push(attempt);
  }
  return groups;
}

/** A session-local shuffled batch. Every selected case appears once before
 * another batch begins. Membership or the caller's algorithm/mode key starts
 * a fresh batch; reordering the same selection does not. Store IDs, not case
 * objects, so the caller's current object is returned on every draw.
 */
export function createLearningSampler({ random = Math.random } = {}) {
  let signature = null, order = [], batchNumber = 0, position = 0, total = 0;
  function reset() {
    signature = null; order = []; batchNumber = 0; position = 0; total = 0;
  }
  function next(cases = [], key = '') {
    const byId = new Map();
    for (const item of cases) {
      const id = item?.id ?? item?.caseId ?? item;
      if (typeof id === 'string' && id && !byId.has(id)) byId.set(id, item);
    }
    if (!byId.size) { reset(); return null; }
    const ids = [...byId.keys()].sort();
    const nextSignature = JSON.stringify([key, ids]);
    if (nextSignature !== signature) {
      reset(); signature = nextSignature; total = ids.length;
    }
    if (position === order.length) {
      order = [...ids];
      for (let index = order.length - 1; index > 0; index--) {
        const draw = random();
        const bounded = Number.isFinite(draw) ? Math.max(0, Math.min(1 - Number.EPSILON, draw)) : 0;
        const other = Math.floor(bounded * (index + 1));
        [order[index], order[other]] = [order[other], order[index]];
      }
      batchNumber++; position = 0;
    }
    return byId.get(order[position++]);
  }
  return { next, reset, snapshot: () => ({ batchNumber, position, total }) };
}

/** Callers scope algorithm and conditions before choosing the latest clean
 * results. Failed/assisted solves never consume a window slot. Timestamps take
 * priority over storage order; ties (and undated legacy input) keep input order.
 * Undated results precede dated ones. Invalid helper inputs use the default;
 * persisted settings and UI inputs are validated separately.
 */
function recentCleanAttempts(attempts, slowWindow) {
  const limit = Number.isInteger(slowWindow) && slowWindow >= 1 && slowWindow <= MAX_SPEED_WINDOW
    ? slowWindow : DEFAULT_SPEED_WINDOW;
  return attempts.map((attempt, index) => ({ attempt, index }))
    .filter(({ attempt }) => attempt && typeof attempt === 'object' && validTime(attempt) && unassisted(attempt) && !explicitLapse(attempt))
    .map(item => ({ ...item, timestamp: Number.isFinite(Date.parse(item.attempt.createdAt)) ? Date.parse(item.attempt.createdAt) : -Infinity }))
    .sort((a, b) => a.timestamp - b.timestamp || a.index - b.index)
    .slice(-limit).map(({ attempt }) => attempt);
}

/**
 * Weights remain positive so every selected case can appear. Slow weights use
 * the median of the latest N clean solves, inconsistent weights use lapses plus
 * relative MAD, and new weights favor fewer unassisted observations. Small
 * samples are shrunk toward a neutral baseline instead of letting one accidental
 * result dominate. Only slow practice limits its history to the recent window.
 */
export function caseWeight(attempts, strategy = 'uniform', baseline = 5, slowWindow = DEFAULT_SPEED_WINDOW) {
  if (strategy === 'uniform' || strategy === 'random') return 1;
  const stats = summarize(strategy === 'slow' ? recentCleanAttempts(attempts, slowWindow) : attempts);
  const n = stats.eligibleCount;
  if (strategy === 'new' || strategy === 'least-practised' || strategy === 'least-practiced') {
    return 1 + 12 / (1 + n);
  }
  const confidence = Math.min(1, stats.successCount / MIN_SAMPLES);
  if (strategy === 'slow') {
    const relative = stats.typical === null ? 1 : stats.typical / Math.max(0.1, baseline);
    return Math.max(0.2, Math.min(12, 1 + confidence * (relative * relative - 1)));
  }
  if (strategy === 'inconsistent') {
    // Beta smoothing keeps a single lapse informative without making it absolute.
    const smoothedLapses = (stats.lapseCount + 0.5) / (n + 5);
    return 1 + 12 * smoothedLapses + 4 * confidence * Math.min(1, stats.relativeSpread ?? 0);
  }
  return 1;
}

export function chooseWeightedCase(cases, attempts = [], strategy = 'uniform', random = Math.random, slowWindow = DEFAULT_SPEED_WINDOW) {
  if (!cases.length) return null;
  const groups = groupAttempts(attempts);
  const medians = cases.map(item => {
    const history = groups.get(item.id ?? item.caseId ?? item) ?? [];
    return summarize(strategy === 'slow' ? recentCleanAttempts(history, slowWindow) : history).typical;
  }).filter(value => value !== null);
  const baseline = median(medians) ?? 5;
  const weights = cases.map(item => caseWeight(groups.get(item.id ?? item.caseId ?? item) ?? [], strategy, baseline, slowWindow));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let target = Math.max(0, Math.min(0.999999999999, random())) * total;
  for (let index = 0; index < cases.length; index++) {
    target -= weights[index];
    if (target < 0) return cases[index];
  }
  return cases.at(-1);
}
