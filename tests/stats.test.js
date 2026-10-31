import test from 'node:test';
import assert from 'node:assert/strict';
import { summarize, summarizeInspection, caseWeight, chooseWeightedCase, createLearningSampler, filterAttempts, resetAttempts,
  rankedCases, recentAttempts, recentAlgorithmAttempts, recentCleanAttempts,
  DEFAULT_SPEED_WINDOW, MAX_SPEED_WINDOW, DEFAULT_RANK_COUNT, MAX_RANK_COUNT, DEFAULT_INSIGHTS_WINDOW, MAX_INSIGHTS_WINDOW } from '../app/stats.js';

const attempts = times => times.map((seconds, index) => ({ id: `attempt-${index}`, caseId: 'CLL-H1', set: 'CLL', group: 'H', seconds, createdAt: '2026-09-10T10:00:00Z' }));

test('stable slow execution is separate from isolated recall lapses', () => {
  const slow = summarize(attempts([10, 10.2, 9.8, 10, 10.1, 9.9]));
  const lapse = summarize(attempts([3, 3, 3.1, 2.9, 3, 20]));
  assert.equal(slow.typical, 10);
  assert.equal(slow.lapseCount, 0);
  assert.equal(lapse.typical, 3);
  assert.equal(lapse.slowOutlierCount, 1);
  assert.equal(lapse.lapseRate, 1 / 6);
  assert.ok(lapse.p90 > lapse.typical * 3);
  assert.ok(caseWeight(attempts([10, 10.2, 9.8, 10, 10.1, 9.9]), 'slow') > caseWeight(attempts([3, 3, 3.1, 2.9, 3, 20]), 'slow'));
  assert.ok(caseWeight(attempts([3, 3, 3.1, 2.9, 3, 20]), 'inconsistent') > caseWeight(attempts([10, 10.2, 9.8, 10, 10.1, 9.9]), 'inconsistent'));
});

test('explicit failures are counted once, assistance excluded from performance', () => {
  const result = summarize([...attempts([4, 5]), { seconds: 40, recallFail: true, dnf: true }, { seconds: 100, assisted: true }]);
  assert.equal(result.count, 4);
  assert.equal(result.eligibleCount, 3);
  assert.equal(result.successCount, 2);
  assert.equal(result.explicitFailureCount, 1);
  assert.equal(result.lapseRate, 1 / 3);
  assert.equal(result.typical, 4.5);
  assert.equal(result.assistedCount, 1);
});

test('outliers require sufficient samples; empty and invalid times have no median', () => {
  assert.equal(summarize(attempts([3, 3, 100])).slowOutlierCount, 0);
  assert.equal(summarize([]).median, null);
  assert.equal(summarize([{ seconds: NaN }, { seconds: -4 }, { dnf: true }]).median, null);
  assert.equal(summarize(attempts([3, 3, 3, 3, 3])).sufficient, true);
});

test('filter and reset combine case, condition, set and date scopes', () => {
  const values = [
    { ...attempts([3])[0], id: 'a', color: 'white', mode: 'recognition' },
    { ...attempts([4])[0], id: 'b', color: 'yellow', mode: 'recognition' },
    { ...attempts([5])[0], id: 'c', set: 'EG1', color: 'white', mode: 'one-look' },
  ];
  assert.deepEqual(filterAttempts(values, { set: ['CLL'], color: 'white' }).map(item => item.id), ['a']);
  assert.deepEqual(resetAttempts(values, { set: 'CLL', color: 'white' }).map(item => item.id), ['b', 'c']);
  assert.equal(filterAttempts(values, { since: '2026-09-11' }).length, 0);
  assert.equal(resetAttempts(values, {}).length, 0);
  assert.equal(values.length, 3);
});

test('weighted selection preserves all cases and prioritizes unpractised cases', () => {
  const choices = [{ id: 'a' }, { id: 'b' }];
  const results = attempts([3, 3, 3, 3, 3]).map(item => ({ ...item, caseId: 'a' }));
  assert.equal(chooseWeightedCase([], results), null);
  assert.equal(chooseWeightedCase(choices, results, 'uniform', () => 0).id, 'a');
  assert.equal(chooseWeightedCase(choices, results, 'uniform', () => 1).id, 'b');
  assert.equal(chooseWeightedCase(choices, results, 'new', () => 0.3).id, 'b');
  assert.ok(caseWeight([], 'new') > caseWeight(results, 'new'));
});

test('learning gives every selected case exactly once in each shuffled batch', () => {
  const cases = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
  const before = structuredClone(cases);
  const draws = [0, 0.5, 0.99, 0.99, 0.1, 0.5];
  let drawIndex = 0;
  const sampler = createLearningSampler({ random: () => draws[drawIndex++ % draws.length] });
  const batches = [];
  for (let batch = 1; batch <= 10; batch++) {
    const batchIds = [];
    for (let position = 1; position <= cases.length; position++) {
      const chosen = sampler.next(cases);
      assert.ok(cases.includes(chosen), 'returns the actual selected case object');
      batchIds.push(chosen.id);
      assert.deepEqual(sampler.snapshot(), { batchNumber: batch, position, total: cases.length });
    }
    assert.deepEqual([...batchIds].sort(), ['a', 'b', 'c', 'd']);
    batches.push(batchIds);
  }
  assert.notDeepEqual(batches[0], batches[1], 'a fresh shuffle runs after each batch');
  assert.equal(drawIndex, 10 * (cases.length - 1));
  assert.deepEqual(cases, before);
});

test('learning selection order and duplicate IDs do not restart or duplicate a batch', () => {
  const cases = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const sampler = createLearningSampler({ random: () => 0.99 });
  assert.equal(sampler.next(cases).id, 'a');
  const updatedB = { id: 'b', name: 'Current case object' };
  assert.equal(sampler.next([cases[2], updatedB, cases[0], updatedB]), updatedB);
  assert.deepEqual(sampler.snapshot(), { batchNumber: 1, position: 2, total: 3 });
  assert.equal(sampler.next(cases).id, 'c');
});

test('learning restarts for changed membership, algorithm key or explicit reset', () => {
  const sampler = createLearningSampler({ random: () => 0.99 });
  const cases = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  sampler.next(cases, 'alg-v1'); sampler.next(cases, 'alg-v1');
  const replacement = [{ id: 'b' }, { id: 'c' }, { id: 'd' }];
  assert.equal(sampler.next(replacement, 'alg-v1').id, 'b');
  assert.deepEqual(sampler.snapshot(), { batchNumber: 1, position: 1, total: 3 });
  assert.equal(sampler.next(replacement, 'alg-v2').id, 'b');
  assert.deepEqual(sampler.snapshot(), { batchNumber: 1, position: 1, total: 3 });
  sampler.reset();
  assert.deepEqual(sampler.snapshot(), { batchNumber: 0, position: 0, total: 0 });
  assert.equal(sampler.next(replacement, 'alg-v2').id, 'b');
  assert.deepEqual(sampler.snapshot(), { batchNumber: 1, position: 1, total: 3 });
});

test('learning handles empty, single-case and boundary random values safely', () => {
  for (const draw of [-1, 0, 0.9999999999999999, 1, 2, NaN, Infinity]) {
    const sampler = createLearningSampler({ random: () => draw });
    assert.equal(sampler.next([]), null);
    const cases = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    assert.deepEqual(cases.map(() => sampler.next(cases).id).sort(), ['a', 'b', 'c']);
    assert.equal(sampler.next([]), null);
    assert.deepEqual(sampler.snapshot(), { batchNumber: 0, position: 0, total: 0 });
    const one = [{ id: 'only' }];
    assert.equal(sampler.next(one), one[0]);
    assert.equal(sampler.next(one), one[0]);
    assert.deepEqual(sampler.snapshot(), { batchNumber: 2, position: 1, total: 1 });
    const copy = sampler.snapshot(); copy.position = 999;
    assert.equal(sampler.snapshot().position, 1, 'snapshot is detached from internal state');
  }
});

test('speed practice responds to recent improvement using a separate clean window for every case', () => {
  const choices = [{ id: 'a' }, { id: 'b' }];
  const history = [
    ...attempts([...Array(30).fill(20), ...Array(5).fill(5)]).map(a => ({ ...a, caseId: 'a' })),
    ...attempts(Array(50).fill(10)).map(a => ({ ...a, caseId: 'b' })),
  ];
  const before = structuredClone(history);
  assert.equal(chooseWeightedCase(choices, history, 'slow', () => 0.5, 5).id, 'b');
  assert.equal(chooseWeightedCase(choices, history, 'slow', () => 0.5, 100).id, 'a');
  assert.deepEqual(history, before, 'selection must preserve stored order and records');
  assert.equal(summarize(history.filter(a => a.caseId === 'a')).median, 20, 'general statistics still use their full input');
});

test('speed comparison baseline also uses the recent median, keeping unpractised cases neutral', () => {
  const choices = [{ id: 'a' }, { id: 'b' }, { id: 'new' }];
  const history = [
    ...attempts([...Array(30).fill(20), ...Array(5).fill(10)]).map(a => ({ ...a, caseId: 'a' })),
    ...attempts(Array(5).fill(5)).map(a => ({ ...a, caseId: 'b' })),
  ];
  // The recent baseline is 7.5s: weights 16/9, 4/9, 1. A lifetime baseline
  // of 12.5s would incorrectly make the unpractised case win this draw.
  assert.equal(chooseWeightedCase(choices, history, 'slow', () => 0.6, 5).id, 'b');
  assert.equal(caseWeight([], 'slow', 7.5, 5), 1);
});

test('recent speed windows order by solve date and keep input order for timestamp ties', () => {
  const history = [
    { seconds: 10, createdAt: '2026-10-18T10:00:00Z' },
    { seconds: 100, createdAt: '2026-10-16T10:00:00Z' },
    { seconds: 5, createdAt: '2026-10-17T10:00:00Z' },
  ];
  assert.equal(caseWeight(history, 'slow', 5, 1), 1.6, 'newest date wins over last array entry');
  assert.equal(caseWeight([{ seconds: 100 }, { seconds: 10 }], 'slow', 5, 1), 1.6, 'undated input uses storage order');
  assert.equal(caseWeight(attempts([100, 10]), 'slow', 5, 1), 1.6, 'equal timestamps use storage order');
});

test('recall failures, DNFs, assistance and invalid times never consume a clean speed slot', () => {
  const clean = attempts([5, 5, 5, 5, 5]);
  const recentFailures = [
    { seconds: 500, recallFail: true }, { seconds: 500, dnf: true },
    { seconds: 500, assisted: true }, { seconds: 0 }, { seconds: -5 },
    { seconds: NaN }, { seconds: Infinity }, { seconds: '500' }, null,
  ].map(a => a && ({ ...a, createdAt: '2026-10-18T10:00:00Z' }));
  assert.equal(caseWeight([...clean, ...recentFailures], 'slow', 5, 5), 1);
  assert.equal(caseWeight(recentFailures, 'slow', 5, 5), 1, 'no clean samples remain neutral');
  assert.equal(caseWeight(attempts([100, 100, 100, 100, 100, 10]), 'slow', 5, 1), 1.6,
    'confidence uses the one sample in the window, not all earlier clean solves');
  assert.equal(caseWeight(attempts([10, 10]), 'slow', 5, 20), 2.2, 'fewer than N uses available clean solves');
});

test('window changes leave other focus strategies unchanged and invalid helper values use the default', () => {
  const history = [...attempts([...Array(30).fill(20), ...Array(DEFAULT_SPEED_WINDOW).fill(5)]), { seconds: 200, recallFail: true }];
  for (const strategy of ['uniform', 'random', 'inconsistent', 'new', 'least-practised', 'least-practiced']) {
    assert.equal(caseWeight(history, strategy, 5, 1), caseWeight(history, strategy, 5, MAX_SPEED_WINDOW));
    const cases = [{ id: 'CLL-H1' }, { id: 'other' }];
    assert.equal(chooseWeightedCase(cases, history, strategy, () => 0.4, 1).id,
      chooseWeightedCase(cases, history, strategy, () => 0.4, MAX_SPEED_WINDOW).id);
  }
  assert.equal(caseWeight(history, 'slow'), 1, 'the default is the last 20 clean solves');
  for (const window of [0, -1, 1.5, NaN, Infinity, '5', null, MAX_SPEED_WINDOW + 1]) {
    assert.equal(caseWeight(history, 'slow', 5, window), caseWeight(history, 'slow', 5, DEFAULT_SPEED_WINDOW));
  }
});

test('ranked pools use only selected measured cases, preserving catalog order for tied medians', () => {
  const choices = ['b', 'a', 'c', 'unmeasured', 'tie'].map(id => ({ id }));
  const history = [
    { caseId: 'a', seconds: 2 }, { caseId: 'b', seconds: 4 },
    { caseId: 'c', seconds: 10 }, { caseId: 'tie', seconds: 4 },
    { caseId: 'outside-selection', seconds: 1000 },
    { caseId: 'unmeasured', seconds: 50, recallFail: true },
    { caseId: 'unmeasured', seconds: 1, assisted: true },
  ];
  const before = structuredClone({ choices, history });
  assert.deepEqual(rankedCases(choices, history, 'slowest', 2).map(item => item.id), ['c', 'b']);
  assert.deepEqual(rankedCases(choices, history, 'fastest', 2).map(item => item.id), ['a', 'b']);
  assert.deepEqual(rankedCases(choices, history, 'fastest', 99).map(item => item.id), ['a', 'b', 'tie', 'c']);
  assert.equal(rankedCases(choices, history, 'slowest', 1)[0], choices[2]);
  assert.deepEqual(rankedCases([...choices, choices[0]], history, 'slowest', 99).map(item => item.id), ['c', 'b', 'tie', 'a']);
  assert.deepEqual({ choices, history }, before, 'ranking never modifies input records or selections');
});

test('rankings respond to the recent clean window and failures do not replace a clean time', () => {
  const choices = [{ id: 'improved' }, { id: 'steady' }];
  const history = [
    ...attempts([20, 20, 20, 3]).map(item => ({ ...item, caseId: 'improved' })),
    ...attempts([7, 7, 7, 7]).map(item => ({ ...item, caseId: 'steady' })),
    { caseId: 'improved', seconds: 100, recallFail: true },
    { caseId: 'improved', seconds: 100, dnf: true },
    { caseId: 'improved', seconds: 100, assisted: true },
  ];
  assert.equal(rankedCases(choices, history, 'slowest', 1, 1)[0].id, 'steady');
  assert.equal(rankedCases(choices, history, 'slowest', 1, 20)[0].id, 'improved');
  assert.equal(rankedCases(choices, history, 'fastest', 1, 1)[0].id, 'improved');
  assert.equal(rankedCases(choices, history, 'fastest', 1, 20)[0].id, 'steady');
});

test('ranked sampling stays inside its pool and samples its members uniformly', () => {
  const choices = ['a', 'b', 'c', 'd'].map(id => ({ id }));
  const history = choices.map((item, i) => ({ caseId: item.id, seconds: i + 1 }));
  for (const [strategy, expected] of [['fastest', ['a', 'b']], ['slowest', ['d', 'c']]]) {
    const draws = Array.from({ length: 100 }, (_, i) => chooseWeightedCase(choices, history, strategy, () => i / 100, 20, 2).id);
    assert.deepEqual([...new Set(draws)], expected);
    assert.equal(draws.filter(id => id === expected[0]).length, 50);
    assert.equal(draws.filter(id => id === expected[1]).length, 50);
    for (const value of [-1, 0, NaN, Infinity]) {
      assert.equal(chooseWeightedCase(choices, history, strategy, () => value, 20, 2).id, expected[0]);
    }
    for (const value of [1, 5]) {
      assert.equal(chooseWeightedCase(choices, history, strategy, () => value, 20, 2).id, expected[1]);
    }
  }
});

test('unmeasured ranked practice builds a baseline without assigning fictitious slow or fast times', () => {
  const choices = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const failedHistory = [{ caseId: 'b', seconds: 500, recallFail: true }];
  for (const strategy of ['slowest', 'fastest']) {
    assert.deepEqual(rankedCases([], failedHistory, strategy, 1), []);
    assert.deepEqual(rankedCases(choices, failedHistory, strategy, 1), choices);
    assert.equal(chooseWeightedCase(choices, failedHistory, strategy, () => 1, 20, 1), choices[2]);
    assert.equal(chooseWeightedCase([], failedHistory, strategy), null);
    const measured = [...failedHistory, { caseId: 'b', seconds: 5 }];
    assert.deepEqual(rankedCases(choices, measured, strategy, 3), [choices[1]], 'only measured members can be ranked');
  }
});

test('rank count bounds use a safe default while large valid counts include every measured selected case', () => {
  const choices = Array.from({ length: 7 }, (_, i) => ({ id: `case-${i}` }));
  const history = choices.map((item, i) => ({ caseId: item.id, seconds: i + 1 }));
  assert.equal(DEFAULT_RANK_COUNT, 5);
  for (const value of [0, -1, 1.5, '2', null, NaN, Infinity, MAX_RANK_COUNT + 1]) {
    assert.deepEqual(rankedCases(choices, history, 'fastest', value), choices.slice(0, DEFAULT_RANK_COUNT));
  }
  assert.deepEqual(rankedCases(choices, history, 'fastest', MAX_RANK_COUNT), choices);
});

test('recent Insights outcomes use dates and stable ties, including failures and assisted solves in the window', () => {
  const records = [
    { id: 'newer', seconds: 7, createdAt: '2026-10-20T10:00:00Z' },
    { id: 'old', seconds: 10, createdAt: '2026-10-18T10:00:00Z' },
    { id: 'tie-clean', seconds: 3, createdAt: '2026-10-20T10:00:00Z' },
    { id: 'tie-failure', seconds: 100, recallFail: true, createdAt: '2026-10-20T10:00:00Z' },
    { id: 'assisted', seconds: 1, assisted: true, createdAt: '2026-10-21T10:00:00Z' },
    { id: 'undated', seconds: 20 },
    null, false, [], 'invalid',
  ];
  const before = structuredClone(records);
  assert.deepEqual(recentAttempts(records, 3).map(item => item.id), ['tie-clean', 'tie-failure', 'assisted']);
  assert.equal(summarize(recentAttempts(records, 3)).median, 3);
  assert.equal(summarize(recentAttempts(records, 3)).lapseRate, 1 / 2);
  assert.deepEqual(recentCleanAttempts(records, 3).map(item => item.id), ['old', 'newer', 'tie-clean']);
  assert.deepEqual(recentAttempts([{ id: 'first' }, { id: 'last' }], 1).map(item => item.id), ['last']);
  assert.deepEqual(records, before);
});

test('Insights applies a separate recent window to each case and exact algorithm before grouping', () => {
  const record = (id, caseId, algorithmId, algorithm) => ({ id, caseId, algorithmId, algorithm, seconds: 3 });
  const records = [
    record('old-a', 'a', 'preferred', 'R U'), record('old-b', 'b', 'preferred', 'R U'),
    record('old-alt', 'a', 'alternative', 'R U2'), record('old-revised', 'a', 'preferred', 'R U2'),
    record('new-a', 'a', 'preferred', 'R U'), record('new-b', 'b', 'preferred', 'R U'),
    record('new-alt', 'a', 'alternative', 'R U2'), record('new-revised', 'a', 'preferred', 'R U2'),
  ];
  const before = structuredClone(records);
  const selected = recentAlgorithmAttempts(records, 1);
  assert.deepEqual(selected.map(item => item.id), ['new-a', 'new-b', 'new-alt', 'new-revised']);
  assert.equal(selected[0], records[4]);
  assert.equal(selected.length, 4, 'a per-algorithm window is not a global recent-result limit');
  assert.deepEqual(records, before);
});

test('Insights recent windows follow the supplied filters and validate helper bounds', () => {
  const records = Array.from({ length: 30 }, (_, i) => ({
    id: `outcome-${i}`, caseId: 'a', algorithmId: 'preferred', algorithm: 'R U',
    seconds: i + 1, color: i >= 25 ? 'yellow' : 'white',
  }));
  assert.deepEqual(recentAlgorithmAttempts(filterAttempts(records, { color: 'white' }), 2).map(item => item.id), ['outcome-23', 'outcome-24']);
  assert.equal(DEFAULT_INSIGHTS_WINDOW, 20);
  for (const value of [0, -1, 1.5, '2', null, NaN, Infinity, MAX_INSIGHTS_WINDOW + 1]) {
    assert.deepEqual(recentAttempts(records, value), records.slice(-DEFAULT_INSIGHTS_WINDOW));
    assert.deepEqual(recentAlgorithmAttempts(records, value), records.slice(-DEFAULT_INSIGHTS_WINDOW));
  }
  assert.deepEqual(recentAlgorithmAttempts([], 1), []);
  assert.deepEqual(recentAlgorithmAttempts(records, MAX_INSIGHTS_WINDOW), records);
});

test('one-look inspection uses strict thresholds and counts a measured zero', () => {
  const times = [0, 7.99, 8, 11.99, 12, 14.99, 15];
  const result = summarizeInspection(times.map(inspectionSeconds => ({ mode: 'one-look', timingMode: 'inspection', inspectionSeconds })));
  assert.equal(result.count, 7);
  assert.ok(Math.abs(result.average - 69.97 / 7) < 1e-12);
  assert.equal(result.under15Rate, 6 / 7);
  assert.equal(result.under12Rate, 4 / 7);
  assert.equal(result.under8Rate, 2 / 7);
});

test('inspection summaries count timed failures and legacy measurements, excluding assistance and untimed results', () => {
  const oneLook = { mode: 'one-look', timingMode: 'inspection', inspectionSeconds: 10 };
  const records = [
    oneLook,
    { ...oneLook, inspectionSeconds: 20, dnf: true },
    { ...oneLook, inspectionSeconds: 6, recallFail: true },
    { mode: 'one-look', inspectionSeconds: 0 },
    { ...oneLook, assisted: true },
    { ...oneLook, mode: 'last-layer' },
    { ...oneLook, timingMode: 'simple' },
    { ...oneLook, timingMode: 'manual' },
    { ...oneLook, inspectionSeconds: null },
    { ...oneLook, inspectionSeconds: undefined },
    { ...oneLook, inspectionSeconds: -1 },
    { ...oneLook, inspectionSeconds: Infinity },
    { ...oneLook, inspectionSeconds: NaN },
    { ...oneLook, inspectionSeconds: '8' },
    null,
    false,
  ];
  const snapshot = structuredClone(records);
  assert.deepEqual(summarizeInspection(records), { count: 4, average: 9, under15Rate: 3 / 4, under12Rate: 3 / 4, under8Rate: 1 / 2 });
  assert.deepEqual(records, snapshot, 'statistics must not rewrite historical records');
});

test('missing one-look inspections display no average or percentage', () => {
  const empty = { count: 0, average: null, under15Rate: null, under12Rate: null, under8Rate: null };
  assert.deepEqual(summarizeInspection(), empty);
  assert.deepEqual(summarizeInspection([{ mode: 'one-look', seconds: 5, inspectionSeconds: null }]), empty);
});

test('inspection metrics honor the same case and date scope as solve statistics', () => {
  const records = [
    { ...attempts([3])[0], mode: 'one-look', inspectionSeconds: 6 },
    { ...attempts([3])[0], mode: 'one-look', inspectionSeconds: 20, caseId: 'CLL-T1' },
    { ...attempts([3])[0], mode: 'one-look', inspectionSeconds: 30, createdAt: '2026-09-09T10:00:00Z' },
  ];
  assert.deepEqual(summarizeInspection(filterAttempts(records, { caseId: 'CLL-H1', since: '2026-09-10' })),
    { count: 1, average: 6, under15Rate: 1, under12Rate: 1, under8Rate: 1 });
});
