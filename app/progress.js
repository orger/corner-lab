import { CASES } from './catalog.js';
import { CASES5 } from './catalog5.js';

const stamp = value => typeof value === 'string' && value.trim() ? Date.parse(value) : NaN;
const effectiveTiming = attempt => attempt.timingMode || (Number.isFinite(attempt.inspectionSeconds) ? 'inspection' : 'simple');

/**
 * One vote per case, irrespective of how often that case is practised.
 * Every practised case contributes its last up-to-windowSize eligible results.
 * Unpractised cases are omitted; an older case's window stays in the average
 * until that case is practised again. Each point retains its own coverage.
 * Simultaneous results are applied together, so tied timestamps have one point.
 * Nothing is inferred from results recorded after a plotted timestamp.
 */
export function rollingSetProgress({ attempts = [], caseIds = [], windowSize = 5, mode = 'all', timingMode = 'all', cleanOnly = false, asOf } = {}) {
  if (!Number.isInteger(windowSize) || windowSize < 1 || windowSize > 100) throw new RangeError('Solves per case must be a whole number from 1 to 100.');
  const cutoff = asOf === undefined ? Infinity : stamp(asOf);
  if (Number.isNaN(cutoff)) throw new RangeError('Invalid progress cutoff date.');
  const ids = [...new Set(caseIds.filter(id => typeof id === 'string' && id))];
  const windows = new Map(ids.map(id => [id, { times: [], total: 0, sum: 0, lastSolvedAt: null }]));
  const eligible = attempts.map((attempt, index) => ({ attempt, index, timestamp: stamp(attempt?.createdAt) })).filter(({ attempt, timestamp }) =>
    attempt && windows.has(attempt.caseId) && Number.isFinite(attempt.seconds) && attempt.seconds > 0 &&
    Number.isFinite(timestamp) && timestamp <= cutoff && !attempt.dnf && !attempt.assisted && (!cleanOnly || !attempt.recallFail) &&
    (mode === 'all' || (attempt.mode || 'last-layer') === mode) &&
    (timingMode === 'all' || effectiveTiming(attempt) === timingMode)
  ).sort((a, b) => a.timestamp - b.timestamp || a.index - b.index);
  const points = [];
  let readyCaseCount = 0, contributingCaseCount = 0, sumOfMeans = 0;
  for (let index = 0; index < eligible.length;) {
    const timestamp = eligible[index].timestamp;
    do {
      const { attempt } = eligible[index];
      const window = windows.get(attempt.caseId);
      const wasReady = window.times.length === windowSize;
      if (!window.times.length) contributingCaseCount++;
      if (window.times.length) sumOfMeans -= window.sum / window.times.length;
      window.times.push(attempt.seconds);
      window.sum += attempt.seconds;
      if (window.times.length > windowSize) window.sum -= window.times.shift();
      window.total++;
      window.lastSolvedAt = new Date(timestamp).toISOString();
      sumOfMeans += window.sum / window.times.length;
      if (!wasReady && window.times.length === windowSize) readyCaseCount++;
      index++;
    } while (index < eligible.length && eligible[index].timestamp === timestamp);
    points.push({ timestamp, date: new Date(timestamp).toISOString(), value: sumOfMeans / contributingCaseCount, eligibleCount: index, contributingCaseCount, totalCases: ids.length, fullWindowCount: readyCaseCount });
  }
  const cases = ids.map(caseId => {
    const window = windows.get(caseId);
    return { caseId, count: window.times.length, total: window.total, needed: Math.max(0, windowSize - window.times.length), ready: window.times.length === windowSize, mean: window.times.length ? window.sum / window.times.length : null, lastSolvedAt: window.lastSolvedAt };
  });
  return {
    points, cases, windowSize, totalCases: ids.length, readyCaseCount, fullWindowCount: readyCaseCount, contributingCaseCount,
    missingCaseCount: cases.filter(item => !item.count).length,
    underfilledCaseCount: cases.filter(item => item.count && !item.ready).length,
    solvesNeeded: cases.reduce((total, item) => total + item.needed, 0),
    eligibleCount: eligible.length,
    value: points.at(-1)?.value ?? null,
    firstDate: eligible.length ? new Date(eligible[0].timestamp).toISOString() : null,
    lastDate: eligible.length ? new Date(eligible.at(-1).timestamp).toISOString() : null,
  };
}

/** All combinations refer to complete catalogues, never the practice selection. */
export function progressSets({ cases2 = CASES, casesEdges = CASES5, casesCentres = [] } = {}) {
  const combinations = [['CLL'], ['EG1'], ['EG2'], ['CLL', 'EG1'], ['CLL', 'EG2'], ['EG1', 'EG2'], ['CLL', 'EG1', 'EG2']];
  return [
    ...combinations.map(sets => ({ id: sets.join('-').toLowerCase(), label: `2×2 · ${sets.join(' + ')}`, branch: '2x2', cases: cases2.filter(item => sets.includes(item.set)) })),
    { id: 'edges', label: '5×5 · Last two edges', branch: 'lte', cases: casesEdges },
    { id: 'centres', label: '5×5 · Last two centres', branch: 'ltc', cases: casesCentres },
  ].filter(set => set.cases.length);
}

const esc = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const seconds = value => Number.isFinite(value) ? `${value.toFixed(2)}s` : '—';
const dateLabel = value => new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const dateTimeLabel = value => new Date(value).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
const option = (value, label, current) => `<option value="${esc(value)}" ${value === current ? 'selected' : ''}>${esc(label)}</option>`;

/** True elapsed-date coordinates; a single observation is centred on the plot. */
export function progressCoordinates(points, { width = 900, height = 270, left = 64, right = 25, top = 24, bottom = 52 } = {}) {
  if (!points.length) return { points: [], ticks: [], width, height, left, right, top, bottom };
  const first = points[0].timestamp, last = points.at(-1).timestamp;
  let low = Infinity, high = -Infinity;
  for (const point of points) { low = Math.min(low, point.value); high = Math.max(high, point.value); }
  const padding = Math.max(0.2, (high - low) * 0.15, high * 0.03);
  const min = Math.max(0, low - padding), max = high + padding;
  const plotWidth = width - left - right, plotHeight = height - top - bottom;
  const y = value => top + (1 - (value - min) / (max - min)) * plotHeight;
  return { width, height, left, right, top, bottom, first, last, min, max,
    points: points.map(point => ({ ...point, x: first === last ? left + plotWidth / 2 : left + (point.timestamp - first) / (last - first) * plotWidth, y: y(point.value) })),
    ticks: Array.from({ length: 5 }, (_, index) => { const value = min + (max - min) * index / 4; return { value, y: y(value) }; }),
  };
}

function chartHTML(result, selectedIndex) {
  const plot = progressCoordinates(result.points);
  const current = plot.points[selectedIndex];
  const path = plot.points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ');
  const coverage = point => `${point.contributingCaseCount} / ${point.totalCases} cases included · ${point.fullWindowCount} with ${result.windowSize} solves`;
  const marks = plot.points.length <= 250 ? plot.points.map((point, index) => `<circle cx="${point.x}" cy="${point.y}" r="${index === selectedIndex ? 5 : 3}" class="progress-dot"><title>${esc(`${dateTimeLabel(point.date)} · ${seconds(point.value)} · ${coverage(point)}`)}</title></circle>`).join('') : '';
  return `<div class="progress-plot"><svg viewBox="0 0 ${plot.width} ${plot.height}" role="img" aria-label="Set average over time. Each practised case has equal weight. The horizontal axis is date; the vertical axis is seconds."><title>Algorithm-set progress by date</title><desc>Average of the latest up to ${result.windowSize} solves of each practised case. Cases with no eligible solves are omitted. ${result.points.length} observations; latest ${seconds(result.value)}. Use the date slider or the values table for exact values.</desc>${plot.ticks.map(tick => `<line x1="${plot.left}" x2="${plot.width - plot.right}" y1="${tick.y}" y2="${tick.y}" class="progress-grid-line"/><text x="${plot.left - 11}" y="${tick.y + 4}" text-anchor="end" class="progress-axis">${tick.value.toFixed(2)}</text>`).join('')}<text x="${plot.left - 11}" y="12" text-anchor="end" class="progress-axis">seconds</text><path d="${path}" class="progress-line"/>${marks}<line x1="${current.x}" x2="${current.x}" y1="${plot.top}" y2="${plot.height - plot.bottom}" class="progress-cursor"/><circle cx="${current.x}" cy="${current.y}" r="5" class="progress-current"/><text x="${plot.left}" y="${plot.height - 24}" class="progress-axis">${esc(dateLabel(plot.first))}</text>${plot.first !== plot.last ? `<text x="${plot.width - plot.right}" y="${plot.height - 24}" text-anchor="end" class="progress-axis">${esc(dateLabel(plot.last))}</text>` : ''}<text x="${plot.width / 2}" y="${plot.height - 3}" text-anchor="middle" class="progress-axis">Date</text></svg></div><div class="progress-point-picker"><label for="progress-point">Explore dates</label><input id="progress-point" type="range" min="0" max="${plot.points.length - 1}" step="1" value="${selectedIndex}" data-progress="point" ${plot.points.length === 1 ? 'disabled' : ''} aria-valuetext="${esc(`${dateTimeLabel(current.date)}: ${seconds(current.value)}; ${coverage(current)}`)}"><output for="progress-point"><strong>${seconds(current.value)}</strong><span>${esc(dateTimeLabel(current.date))}</span><span>${esc(coverage(current))}</span></output></div>`;
}

/**
 * The host injects content({trainer}) in Insights and routes change/input/click
 * before its own handlers. Each handler returns true only for progress controls.
 * Chart controls are session-only; solve data and practice settings never change.
 */
export function createProgressView({ getData, render, cases2 = CASES, casesEdges = CASES5, casesCentres = [] }) {
  const sets = progressSets({ cases2, casesEdges, casesCentres });
  let context = null, setId = sets[0]?.id, windowSize = 5, mode = 'last-layer', timingMode = 'all', cleanOnly = false, selectedPoint = null;
  let lastResult = null, displayedPoints = [], rangeStart = 0, rangeEnd = 0;
  let rangeStartDate = null, rangeEndDate = null;
  function resetRange() { rangeStartDate = null; rangeEndDate = null; selectedPoint = null; }
  function activeSet() { return sets.find(set => set.id === setId) || sets[0]; }
  function updateContext(trainer) {
    if (!trainer || trainer === context) return;
    context = trainer;
    const desired = /centr|ltc/.test(trainer) ? 'centres' : trainer === '5x5' || trainer === 'lte' ? 'edges' : 'cll';
    if (sets.some(set => set.id === desired)) setId = desired;
    resetRange();
  }
  function resultFor(set) {
    const data = getData();
    return rollingSetProgress({ attempts: set.branch === '2x2' ? data.attempts || [] : data[set.branch]?.attempts || [], caseIds: set.cases.map(item => item.id), windowSize, mode: set.branch === '2x2' ? mode : 'all', timingMode, cleanOnly });
  }
  // The zoom is applied after calculating historical averages. Date boundaries
  // survive option changes, ordinary renders and deletions; a null end follows
  // new observations. Keep the chosen dates even when a filter has no results.
  function updateRange(points) {
    if (!points.length) { rangeStart = 0; rangeEnd = 0; displayedPoints = []; return; }
    const start = rangeStartDate === null ? 0 : points.findIndex(point => point.timestamp >= rangeStartDate);
    let end = rangeEndDate === null ? points.length - 1 : points.findLastIndex(point => point.timestamp <= rangeEndDate);
    rangeStart = start < 0 ? points.length - 1 : start;
    rangeEnd = Math.max(rangeStart, end < 0 ? 0 : end);
    displayedPoints = points.slice(rangeStart, rangeEnd + 1);
  }
  function rangeHTML(points) {
    const start = points[rangeStart], end = points[rangeEnd], single = points.length === 1;
    return `<div class="progress-range" role="group" aria-label="Chart date range"><div class="progress-range-heading"><div><h3>Chart date range</h3><p>Zoom in on recent progress. Both axes adjust to the selected dates.</p></div><button class="button tiny" data-action="progress-all-time" ${rangeStartDate === null && rangeEndDate === null ? 'disabled' : ''}>All time</button></div><div class="progress-range-controls"><label for="progress-range-start">Range start<output for="progress-range-start">${esc(dateTimeLabel(start.date))}</output><input id="progress-range-start" type="range" min="0" max="${rangeEnd}" step="1" value="${rangeStart}" data-progress="range-start" aria-valuetext="${esc(dateTimeLabel(start.date))}" ${single ? 'disabled' : ''}></label><label for="progress-range-end">Range end<output for="progress-range-end">${esc(dateTimeLabel(end.date))}</output><input id="progress-range-end" type="range" min="${rangeStart}" max="${points.length - 1}" step="1" value="${rangeEnd}" data-progress="range-end" aria-valuetext="${esc(dateTimeLabel(end.date))}" ${single ? 'disabled' : ''}></label></div></div>`;
  }
  function content({ trainer } = {}) {
    updateContext(trainer);
    const set = activeSet();
    if (!set) return '';
    const result = lastResult = resultFor(set);
    updateRange(result.points);
    const currentIndex = selectedPoint === null ? displayedPoints.length - 1 : Math.max(0, Math.min(displayedPoints.length - 1, selectedPoint));
    const current = displayedPoints[currentIndex];
    const first = displayedPoints[0], last = displayedPoints.at(-1), latest = result.points.at(-1);
    const change = first && last ? last.value - first.value : null;
    const displayedResult = { ...result, points: displayedPoints, value: last?.value ?? null };
    const coverageLabel = `${result.contributingCaseCount} / ${result.totalCases} cases included`;
    const name = id => { const item = set.cases.find(item => item.id === id); return item ? `${item.set && set.branch === '2x2' ? item.set + ' · ' : ''}${item.name || item.id}` : id; };
    const missing = result.cases.filter(item => !item.ready);
    // The table follows the slider: every point is accessible in a 50-row page.
    const tableStart = Math.max(0, Math.floor(Math.max(0, currentIndex) / 50) * 50);
    const tablePoints = displayedPoints.slice(tableStart, tableStart + 50);
    return `<section class="card progress-card" aria-labelledby="progress-title"><div class="progress-heading"><div><div class="eyebrow">EVERY PRACTISED CASE COUNTS EQUALLY</div><h2 id="progress-title">Full-set progress</h2><p>One line for the set: average each case’s last up to N solves, then average those case times.</p></div><span class="badge">${result.totalCases} cases in this set</span></div><div class="progress-controls"><label>Full algorithm set<select data-progress="set">${sets.map(item => option(item.id, item.label, setId)).join('')}</select></label><label>Solves per case (N)<input type="number" min="1" max="100" step="1" value="${windowSize}" data-progress="window" aria-label="Solves per case N"></label>${set.branch === '2x2' ? `<label>Practice mode<select data-progress="mode">${option('last-layer', 'Last layer', mode)}${option('one-look', 'One look', mode)}</select></label>` : ''}<label>Timing<select data-progress="timing">${option('all', 'Both timer options', timingMode)}${option('simple', 'Start → stop', timingMode)}${option('inspection', 'Inspect → solve → stop', timingMode)}</select></label><label class="progress-clean"><input type="checkbox" data-progress="clean" ${cleanOnly ? 'checked' : ''}>Exclude marked recall lapses</label></div><div class="progress-summary"><div><span class="eyebrow">LATEST SET AVERAGE · ALL HISTORY</span><strong>${seconds(result.value)}</strong><small>${latest ? esc(dateTimeLabel(latest.date)) : 'Record a solve to begin'}</small></div><div><span class="eyebrow">CURRENT CASE COVERAGE</span><strong class="progress-coverage-value">${coverageLabel}</strong><small>${result.fullWindowCount} cases have ${windowSize} solves · ${result.missingCaseCount} have none</small></div>${first && last && displayedPoints.length > 1 ? `<div><span class="eyebrow">CHANGE OVER SHOWN RANGE</span><strong class="${change < 0 ? 'progress-improved' : ''}">${change > 0 ? '+' : ''}${seconds(change)}</strong><small>${esc(dateLabel(first.date))} · lower is faster</small></div>` : ''}</div>${result.points.length ? rangeHTML(result.points) + chartHTML(displayedResult, currentIndex) : `<div class="progress-baseline"><div class="progress-coverage-track" role="progressbar" aria-label="Cases contributing to the set average" aria-valuemin="0" aria-valuemax="${result.totalCases}" aria-valuenow="${result.contributingCaseCount}"><span style="width:${100 * result.contributingCaseCount / result.totalCases}%"></span></div><p>The curve starts with your first eligible solve. A case with fewer than ${windowSize} solves uses the times available; a case with no eligible solves is left out.</p></div>`}<p class="progress-method">Tracks this complete set, independent of the practice selection and other Insights filters. Each case with any eligible solves has equal weight; cases with no eligible solves are omitted. Shorter histories use all available times up to N. Includes all algorithm choices and grips${set.branch === '2x2' ? ', AUFs and colours' : ''}. DNFs and assisted solves are excluded; ${cleanOnly ? 'marked recall lapses are also excluded' : 'completed recall lapses remain included'}. Inspection time is excluded. The date-range sliders zoom both axes without changing the underlying averages; earlier solves still contribute to each case’s rolling window. The latest average and current coverage above use all history. Each point uses only results recorded by that date; cases keep their last up to N times until practised again. Including a newly practised case can change the average, so check the case coverage for the selected date.</p>${missing.length ? `<details class="progress-details" data-progress-details="needed"><summary>Cases with fewer than ${windowSize} eligible solves (${missing.length})</summary><div class="progress-table-wrap"><table><thead><tr><th>Case</th><th>Eligible solves</th><th>Used in average</th></tr></thead><tbody>${missing.map(item => `<tr><td>${esc(name(item.caseId))}</td><td>${item.count} / ${windowSize}</td><td>${item.count ? seconds(item.mean) : 'Not yet included'}</td></tr>`).join('')}</tbody></table></div></details>` : ''}${result.points.length ? `<details class="progress-details" data-progress-details="values"><summary>Plotted values · ${displayedPoints.length} dates</summary><p>Showing dates ${tableStart + 1}–${Math.min(tableStart + 50, displayedPoints.length)}. Use the date slider to view another block.</p><div class="progress-table-wrap"><table><thead><tr><th>Date</th><th>Set average</th><th>Cases included</th><th>Cases with N solves</th></tr></thead><tbody>${tablePoints.map(point => `<tr ${point === current ? 'class="progress-selected-row"' : ''}><td>${esc(dateTimeLabel(point.date))}</td><td>${seconds(point.value)}</td><td>${point.contributingCaseCount} / ${point.totalCases}</td><td>${point.fullWindowCount}</td></tr>`).join('')}</tbody></table></div></details>` : ''}</section>`;
  }
  function change(event) {
    const field = event.target?.dataset?.progress;
    if (!['set', 'window', 'mode', 'timing', 'clean', 'point', 'range-start', 'range-end'].includes(field)) return false;
    const doc = event.target.ownerDocument;
    const hadFocus = doc?.activeElement === event.target;
    const detailStates = new Map([...(doc?.querySelectorAll?.('.progress-card [data-progress-details]') ?? [])]
      .map(detail => [detail.dataset.progressDetails, detail.open]));
    const value = event.target.value;
    if (field === 'set' && sets.some(set => set.id === value)) setId = value;
    if (field === 'window') { const parsed = Number(value); if (Number.isFinite(parsed) && value !== '') windowSize = Math.max(1, Math.min(100, Math.round(parsed))); }
    if (field === 'mode' && ['last-layer', 'one-look'].includes(value)) mode = value;
    if (field === 'timing' && ['all', 'simple', 'inspection'].includes(value)) timingMode = value;
    if (field === 'clean') cleanOnly = Boolean(event.target.checked);
    if (field === 'point') selectedPoint = Math.max(0, Number.parseInt(value, 10) || 0);
    else selectedPoint = null;
    if ((field === 'range-start' || field === 'range-end') && lastResult?.points.length) {
      updateRange(lastResult.points);
      const parsed = Number(value), max = lastResult.points.length - 1;
      if (value !== '' && Number.isFinite(parsed)) {
        const index = Math.round(parsed);
        if (field === 'range-start') {
          rangeStart = Math.max(0, Math.min(rangeEnd, index));
          rangeStartDate = rangeStart === 0 ? null : lastResult.points[rangeStart].timestamp;
        } else {
          rangeEnd = Math.max(rangeStart, Math.min(max, index));
          rangeEndDate = rangeEnd === max ? null : lastResult.points[rangeEnd].timestamp;
        }
      }
      updateRange(lastResult.points);
    }
    render();
    // The host replaces its page HTML. Keep keyboard navigation and expanded
    // tables intact; do not steal focus when a number field changed on blur.
    for (const detail of doc?.querySelectorAll?.('.progress-card [data-progress-details]') ?? []) {
      if (detailStates.has(detail.dataset.progressDetails)) detail.open = detailStates.get(detail.dataset.progressDetails);
    }
    if (hadFocus) doc?.querySelector?.(`.progress-card [data-progress="${field}"]`)?.focus?.({ preventScroll: true });
    return true;
  }
  return {
    content, change,
    // Wait for change (release) before rendering a slider, preserving its
    // native drag and pointer capture while the user is moving the thumb.
    input: event => Boolean(event.target?.dataset?.progress),
    click: event => {
      const target = event.target?.closest?.('[data-action]');
      if (target?.dataset?.action !== 'progress-all-time') return false;
      resetRange();
      if (lastResult) updateRange(lastResult.points);
      render();
      target.ownerDocument?.querySelector?.('.progress-card [data-progress="range-start"]')?.focus?.({ preventScroll: true });
      return true;
    },
    snapshot: () => ({ setId, windowSize, mode, timingMode, cleanOnly, selectedPoint, result: lastResult, displayedPoints, rangeStart, rangeEnd }),
  };
}
