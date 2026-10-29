import test from 'node:test';
import assert from 'node:assert/strict';
import { rollingSetProgress, progressCoordinates, progressSets, createProgressView } from '../app/progress.js';

const at = (caseId, seconds, day, extras = {}) => ({ caseId, seconds, createdAt: `2026-10-${String(day).padStart(2, '0')}T12:00:00.000Z`, mode: 'last-layer', timingMode: 'simple', ...extras });
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} should equal ${expected}`);

test('each case has equal weight despite unequal practice frequency', () => {
  const attempts = [at('a', 2, 1), at('b', 10, 2), at('a', 4, 3), at('a', 6, 4), at('a', 8, 5)];
  const result = rollingSetProgress({ attempts, caseIds: ['a', 'b'], windowSize: 1 });
  assert.deepEqual(result.points.map(point => point.value), [2, 6, 7, 8, 9]);
  assert.equal(result.value, 9);
  assert.notEqual(result.value, 6); // Overall solve mean would weight a four times.
  assert.deepEqual(result.cases.map(item => item.total), [4, 1]);
});

test('short case histories contribute immediately and cases with zero solves are omitted', () => {
  const result = rollingSetProgress({ attempts: [at('a', 2, 1), at('a', 4, 2), at('b', 10, 3)], caseIds: ['a', 'b', 'c'], windowSize: 2 });
  assert.deepEqual(result.points.map(point => point.value), [2, 3, 6.5]);
  assert.equal(result.value, 6.5);
  assert.equal(result.contributingCaseCount, 2);
  assert.equal(result.readyCaseCount, 1);
  assert.equal(result.missingCaseCount, 1);
  assert.equal(result.underfilledCaseCount, 1);
  assert.equal(result.solvesNeeded, 3);
  assert.deepEqual(result.cases.map(item => item.needed), [0, 1, 2]);
});

test('each dated point preserves its own case coverage and full-window counts', () => {
  const result = rollingSetProgress({ attempts: [at('a', 2, 1), at('a', 4, 2), at('b', 10, 3), at('c', 18, 4), at('b', 14, 5)], caseIds: ['a', 'b', 'c', 'd'], windowSize: 2 });
  assert.deepEqual(result.points.map(point => point.contributingCaseCount), [1, 1, 2, 3, 3]);
  assert.deepEqual(result.points.map(point => point.fullWindowCount), [0, 1, 1, 1, 2]);
  assert.ok(result.points.every(point => point.totalCases === 4));
  near(result.points[3].value, (3 + 10 + 18) / 3);
  assert.equal(result.value, 11);
});

test('windows roll independently while unpractised cases retain older results', () => {
  const attempts = [at('a', 2, 1), at('a', 4, 2), at('b', 10, 3), at('b', 14, 4), at('a', 8, 10), at('a', 10, 15)];
  const result = rollingSetProgress({ attempts, caseIds: ['a', 'b'], windowSize: 2 });
  assert.deepEqual(result.points.map(point => point.value), [2, 3, 6.5, 7.5, 9, 10.5]);
  assert.deepEqual(result.cases.map(item => item.mean), [9, 12]);
  assert.equal(result.cases[1].lastSolvedAt, attempts[3].createdAt);
});

test('historical points do not borrow any future results', () => {
  const first = [at('a', 8, 1), at('b', 10, 2), at('a', 6, 3)];
  const more = [...first, at('b', 2, 4), at('a', 1, 5)];
  const baseline = rollingSetProgress({ attempts: first, caseIds: ['a', 'b'], windowSize: 1 });
  const extended = rollingSetProgress({ attempts: more, caseIds: ['a', 'b'], windowSize: 1 });
  assert.deepEqual(extended.points.slice(0, baseline.points.length), baseline.points);
  const cutoff = rollingSetProgress({ attempts: more, caseIds: ['a', 'b'], windowSize: 1, asOf: first.at(-1).createdAt });
  assert.deepEqual(cutoff, baseline);
});

test('input history is sorted without mutating it, and same dates combine into one point', () => {
  const attempts = [at('a', 4, 3), at('b', 10, 2), at('a', 2, 1), at('b', 6, 3)];
  const before = structuredClone(attempts);
  const result = rollingSetProgress({ attempts, caseIds: ['a', 'b'], windowSize: 1 });
  assert.deepEqual(attempts, before);
  assert.deepEqual(result.points.map(point => point.value), [2, 6, 5]);
  assert.deepEqual(result.points.map(point => point.eligibleCount), [1, 2, 4]);
  assert.deepEqual(result.points.map(point => point.date), [at('', 0, 1).createdAt, at('', 0, 2).createdAt, at('', 0, 3).createdAt]);
  assert.deepEqual(result.points.map(point => point.contributingCaseCount), [1, 2, 2]);
});

test('successful recall lapses are included by default, with a clean-only option', () => {
  const attempts = [at('a', 3, 1), at('a', 30, 2, { recallFail: true })];
  assert.equal(rollingSetProgress({ attempts, caseIds: ['a'], windowSize: 2 }).value, 16.5);
  const clean = rollingSetProgress({ attempts, caseIds: ['a'], windowSize: 2, cleanOnly: true });
  assert.equal(clean.value, 3);
  assert.equal(clean.eligibleCount, 1);
});

test('DNFs, assisted solves, invalid times, invalid dates and foreign cases never enter windows', () => {
  const attempts = [at('a', 4, 1), at('a', 12, 2, { dnf: true }), at('a', 15, 3, { assisted: true }), at('a', 0, 4), at('a', -1, 5), at('a', NaN, 6), at('a', Infinity, 7), at('a', 10, 8, { createdAt: 'nonsense' }), at('x', 99, 9), at('a', 6, 10), null, at('a', 2, 11, { createdAt: '' })];
  const result = rollingSetProgress({ attempts, caseIds: ['a'], windowSize: 2 });
  assert.equal(result.eligibleCount, 2);
  assert.equal(result.value, 5);
  assert.equal(result.points.length, 2);
});

test('practice mode and timing filters stay independent, with legacy fallbacks', () => {
  const attempts = [at('a', 2, 1), at('a', 8, 2, { mode: 'one-look', timingMode: 'inspection', inspectionSeconds: 12 }), at('a', 4, 3, { mode: undefined, timingMode: undefined }), at('a', 6, 4, { timingMode: undefined, inspectionSeconds: 9 })];
  assert.equal(rollingSetProgress({ attempts, caseIds: ['a'], windowSize: 1, mode: 'one-look' }).value, 8);
  assert.equal(rollingSetProgress({ attempts, caseIds: ['a'], windowSize: 2, mode: 'last-layer', timingMode: 'simple' }).value, 3);
  assert.equal(rollingSetProgress({ attempts, caseIds: ['a'], windowSize: 1, mode: 'last-layer', timingMode: 'inspection' }).value, 6);
});

test('empty or duplicate catalog IDs cannot distort case coverage', () => {
  const empty = rollingSetProgress({ attempts: [at('a', 2, 1)], caseIds: [] });
  assert.equal(empty.value, null);
  assert.equal(empty.totalCases, 0);
  assert.equal(empty.eligibleCount, 0);
  assert.equal(rollingSetProgress({ attempts: [at('a', 2, 1)], caseIds: ['a', 'a', ''], windowSize: 1 }).value, 2);
});

test('N and cutoff validation prevent misleading calculations', () => {
  for (const windowSize of [0, -1, 101, 2.5, NaN, Infinity, '5']) assert.throws(() => rollingSetProgress({ windowSize }), RangeError);
  assert.throws(() => rollingSetProgress({ asOf: 'invalid' }), RangeError);
  assert.equal(rollingSetProgress({ windowSize: 100 }).windowSize, 100);
});

test('date axis uses elapsed time rather than equally spaced solves', () => {
  const result = rollingSetProgress({ attempts: [at('a', 3, 1), at('a', 4, 2), at('a', 2, 11)], caseIds: ['a'], windowSize: 1 });
  const plot = progressCoordinates(result.points);
  const [a, b, c] = plot.points;
  near((b.x - a.x) / (c.x - a.x), 0.1);
  assert.equal(a.x, plot.left);
  assert.equal(c.x, plot.width - plot.right);
  assert.ok(plot.ticks.every(tick => Number.isFinite(tick.y)));
});

test('single-point and flat charts have finite, legible coordinates', () => {
  const plot = progressCoordinates([{ timestamp: 1, value: 3 }]);
  assert.equal(plot.points[0].x, (plot.left + plot.width - plot.right) / 2);
  assert.ok(Number.isFinite(plot.points[0].y));
  assert.ok(plot.max > plot.min);
  const flat = progressCoordinates([{ timestamp: 1, value: 3 }, { timestamp: 4, value: 3 }]);
  assert.equal(flat.points[0].y, flat.points[1].y);
  assert.deepEqual(progressCoordinates([]).points, []);
});

const cases2 = [{ id: 'c', set: 'CLL', name: 'C1' }, { id: 'e', set: 'EG1', name: 'E1' }, { id: 'f', set: 'EG2', name: 'F1' }];
const casesEdges = [{ id: 'edge', name: 'Edge' }];
const casesCentres = [{ id: 'centre', name: 'Centre' }];

test('complete set choices include all seven 2×2 combinations plus both 5×5 sets', () => {
  const sets = progressSets({ cases2, casesEdges, casesCentres });
  assert.equal(sets.length, 9);
  assert.deepEqual(sets.find(set => set.id === 'cll-eg2').cases.map(item => item.id), ['c', 'f']);
  assert.deepEqual(sets.find(set => set.id === 'cll-eg1-eg2').cases.map(item => item.id), ['c', 'e', 'f']);
  assert.equal(sets.find(set => set.id === 'centres').branch, 'ltc');
  assert.equal(sets.find(set => set.id === 'edges').branch, 'lte');
});

function harness(data = {}) {
  let renders = 0;
  const view = createProgressView({ getData: () => data, render: () => renders++, cases2, casesEdges, casesCentres });
  const change = (field, value, checked) => view.change({ target: { dataset: { progress: field }, value, checked } });
  return { view, change, get renders() { return renders; } };
}

test('view reads each trainer history independently and defaults to last-layer practice', () => {
  const data = { attempts: [at('c', 3, 1), at('c', 20, 2, { mode: 'one-look' })], lte: { attempts: [at('edge', 10, 1)] }, ltc: { attempts: [at('centre', 30, 1)] } };
  const before = structuredClone(data);
  const h = harness(data);
  h.change('window', '1');
  h.view.content({ trainer: '2x2' });
  assert.equal(h.view.snapshot().result.value, 3);
  h.change('mode', 'one-look');
  h.view.content({ trainer: '2x2' });
  assert.equal(h.view.snapshot().result.value, 20);
  h.view.content({ trainer: '5x5' });
  assert.equal(h.view.snapshot().setId, 'edges');
  assert.equal(h.view.snapshot().result.value, 10);
  h.view.content({ trainer: '5x5-centres' });
  assert.equal(h.view.snapshot().result.value, 30);
  assert.deepEqual(data, before);
});

test('combined sets use the entire catalogue even when practice selection is smaller', () => {
  const h = harness({ settings: { selectedCases: ['c'] }, attempts: [at('c', 2, 1), at('e', 8, 2), at('f', 20, 3)] });
  h.view.content({ trainer: '2x2' });
  h.change('window', '1');
  h.change('set', 'cll-eg2');
  h.view.content({ trainer: '2x2' });
  assert.equal(h.view.snapshot().result.value, 11);
  assert.equal(h.view.snapshot().result.totalCases, 2);
  assert.equal(h.view.snapshot().setId, 'cll-eg2');
});

test('a single short case history displays the aggregate curve and case coverage', () => {
  const h = harness({ attempts: [at('c', 2, 1)] });
  h.view.content({ trainer: '2x2' });
  h.change('set', 'cll-eg1-eg2');
  const html = h.view.content({ trainer: '2x2' });
  assert.match(html, /1 \/ 3 cases included/);
  assert.match(html, /Cases with fewer than 5 eligible solves/);
  assert.match(html, /class="progress-plot"/);
  assert.equal(h.view.snapshot().result.value, 2);
  assert.equal(h.view.snapshot().result.fullWindowCount, 0);
});

test('no eligible results shows an empty chart without suggesting all cases are required', () => {
  const h = harness({ attempts: [at('c', 2, 1, { dnf: true })] });
  const html = h.view.content({ trainer: '2x2' });
  assert.match(html, /Record a solve to begin/);
  assert.match(html, /curve starts with your first eligible solve/);
  assert.doesNotMatch(html, /class="progress-plot"/);
  assert.equal(h.view.snapshot().result.value, null);
});

test('complete UI includes dated chart, accessible slider and exact value table', () => {
  const h = harness({ attempts: [at('c', 2, 1), at('c', 4, 2)] });
  h.change('window', '1');
  let html = h.view.content({ trainer: '2x2' });
  assert.match(html, /class="progress-plot"/);
  assert.match(html, /aria-label="Set average over time/);
  assert.match(html, /Plotted values · 2 dates/);
  assert.match(html, /aria-valuetext=".*4\.00s/);
  h.change('point', '0');
  html = h.view.content({ trainer: '2x2' });
  assert.match(html, /aria-valuetext=".*2\.00s/);
  assert.equal(h.view.snapshot().selectedPoint, 0);
});

test('selected-date details and table show historical coverage rather than today’s coverage', () => {
  const h = harness({ attempts: [at('c', 2, 1), at('e', 8, 2), at('c', 4, 3)] });
  h.view.content({ trainer: '2x2' });
  h.change('set', 'cll-eg1-eg2');
  h.change('window', '2');
  let html = h.view.content({ trainer: '2x2' });
  assert.match(html, /aria-valuetext="[^\"]*2 \/ 3 cases included · 1 with 2 solves/);
  h.change('point', '0');
  html = h.view.content({ trainer: '2x2' });
  assert.match(html, /aria-valuetext="[^\"]*1 \/ 3 cases included · 0 with 2 solves/);
  assert.match(html, /<th>Cases included<\/th><th>Cases with N solves<\/th>/);
  assert.match(html, /<td>2\.00s<\/td><td>1 \/ 3<\/td><td>0<\/td>/);
});

test('progress controls are scoped, bounded, and do not save practice settings', () => {
  const h = harness();
  assert.equal(h.view.change({ target: { dataset: {} } }), false);
  assert.equal(h.view.input({ target: { dataset: {} } }), false);
  assert.equal(h.view.input({ target: { dataset: { progress: 'point' } } }), true);
  assert.equal(h.view.click({ target: {} }), false);
  assert.equal(h.renders, 0);
  h.change('window', '10000'); assert.equal(h.view.snapshot().windowSize, 100);
  h.change('window', '-1'); assert.equal(h.view.snapshot().windowSize, 1);
  h.change('window', 'bad'); assert.equal(h.view.snapshot().windowSize, 1);
  h.change('window', ''); assert.equal(h.view.snapshot().windowSize, 1);
  h.change('set', 'unknown'); assert.equal(h.view.snapshot().setId, 'cll');
  h.change('clean', '', true); assert.equal(h.view.snapshot().cleanOnly, true);
});

test('repeated keyboard slider changes keep focus and the values table expanded', () => {
  let renders = 0, target, details;
  const doc = {
    activeElement: null,
    querySelector: selector => selector === '.progress-card [data-progress="point"]' ? target : null,
    querySelectorAll: selector => selector === '.progress-card [data-progress-details]' ? details : [],
  };
  function makeTarget(value) {
    return { dataset: { progress: 'point' }, value, ownerDocument: doc,
      focus(options) { assert.deepEqual(options, { preventScroll: true }); doc.activeElement = this; } };
  }
  target = makeTarget('0');
  doc.activeElement = target;
  details = [{ dataset: { progressDetails: 'values' }, open: true }];
  const view = createProgressView({ getData: () => ({}), cases2, casesEdges, casesCentres, render: () => {
    renders++;
    target = makeTarget(String(renders));
    details = [{ dataset: { progressDetails: 'values' }, open: false }];
    doc.activeElement = null;
  } });
  view.change({ target });
  assert.equal(doc.activeElement, target);
  assert.equal(details[0].open, true);
  target.value = '1';
  view.change({ target });
  assert.equal(doc.activeElement, target);
  assert.equal(details[0].open, true);
  assert.equal(view.snapshot().selectedPoint, 1);
  assert.equal(renders, 2);
});

test('other chart controls preserve detail states without stealing focus on blur', () => {
  let details = [{ dataset: { progressDetails: 'needed' }, open: true }, { dataset: { progressDetails: 'values' }, open: false }];
  const otherControl = { id: 'another-control' };
  let focusCalls = 0;
  const doc = {
    activeElement: otherControl,
    querySelectorAll: () => details,
    querySelector: () => ({ focus: () => focusCalls++ }),
  };
  const view = createProgressView({ getData: () => ({}), cases2, casesEdges, casesCentres, render: () => {
    details = [{ dataset: { progressDetails: 'needed' }, open: false }, { dataset: { progressDetails: 'values' }, open: true }];
  } });
  view.change({ target: { dataset: { progress: 'window' }, value: '3', ownerDocument: doc } });
  assert.equal(view.snapshot().windowSize, 3);
  assert.deepEqual(details.map(item => item.open), [true, false]);
  assert.equal(doc.activeElement, otherControl);
  assert.equal(focusCalls, 0);
});

test('slider drag does not replace its input before the release event', () => {
  const h = harness();
  assert.equal(h.view.input({ target: { dataset: { progress: 'point' }, value: '7' } }), true);
  assert.equal(h.renders, 0);
  assert.equal(h.view.snapshot().selectedPoint, null);
  h.change('point', '7');
  assert.equal(h.renders, 1);
  assert.equal(h.view.snapshot().selectedPoint, 7);
});

test('date-range zoom removes early fluctuations from both plotted axes and values table', () => {
  const data = { attempts: [at('c', 100, 1), at('c', 50, 2), at('c', 4, 10), at('c', 3, 20), at('c', 3.5, 22)] };
  const before = structuredClone(data);
  const h = harness(data);
  h.change('window', '1');
  h.view.content({ trainer: '2x2' });
  const full = structuredClone(h.view.snapshot().result);
  h.change('range-start', '2');
  const html = h.view.content({ trainer: '2x2' });
  const snapshot = h.view.snapshot();
  assert.deepEqual(snapshot.result, full, 'zoom does not change historical rolling averages');
  assert.deepEqual(snapshot.displayedPoints.map(point => point.value), [4, 3, 3.5]);
  assert.equal(snapshot.rangeStart, 2);
  assert.equal(snapshot.rangeEnd, 4);
  const plot = progressCoordinates(snapshot.displayedPoints);
  assert.ok(plot.max < 5, 'old outliers no longer dominate the vertical axis');
  assert.equal(plot.first, Date.parse(at('c', 0, 10).createdAt));
  assert.equal(plot.last, Date.parse(at('c', 0, 22).createdAt));
  assert.match(html, /Plotted values · 3 dates/);
  assert.match(html, /CHANGE OVER SHOWN RANGE/);
  assert.doesNotMatch(html, /<td>100\.00s<\/td>|<td>50\.00s<\/td>/);
  h.change('point', '0');
  const selected = h.view.content({ trainer: '2x2' });
  assert.match(selected, /data-progress="point"[^>]*aria-valuetext="[^\"]*4\.00s/);
  assert.deepEqual(data, before);
});

test('zoom retains older per-case solves needed to calculate each historical point', () => {
  const h = harness({ attempts: [at('c', 2, 1), at('c', 6, 2), at('e', 10, 3), at('c', 8, 4)] });
  h.view.content({ trainer: '2x2' });
  h.change('set', 'cll-eg1');
  h.change('window', '2');
  h.view.content({ trainer: '2x2' });
  h.change('range-start', '2');
  h.change('range-end', '2');
  const html = h.view.content({ trainer: '2x2' });
  assert.deepEqual(h.view.snapshot().displayedPoints.map(point => point.value), [7]);
  assert.equal(h.view.snapshot().displayedPoints[0].fullWindowCount, 1);
  assert.equal(h.view.snapshot().result.value, 8.5, 'all-history summary remains explicitly separate');
  assert.match(html, /LATEST SET AVERAGE · ALL HISTORY/);
  assert.match(html, /Plotted values · 1 dates/);
  assert.doesNotMatch(html, /NaN|Infinity/);
});

test('range controls stay ordered and bounded and All time restores the full curve', () => {
  const h = harness({ attempts: [at('c', 2, 1), at('c', 4, 2), at('c', 6, 3)] });
  h.view.content({ trainer: '2x2' });
  h.change('range-start', '999');
  h.change('range-end', '-10');
  h.view.content({ trainer: '2x2' });
  assert.equal(h.view.snapshot().rangeStart, 2);
  assert.equal(h.view.snapshot().rangeEnd, 2);
  h.change('range-start', 'bad');
  h.change('range-end', '');
  assert.equal(h.view.snapshot().displayedPoints.length, 1);
  assert.equal(h.view.click({ target: { closest: () => ({ dataset: { action: 'unrelated' } }) } }), false);
  assert.equal(h.view.click({ target: { closest: () => ({ dataset: { action: 'progress-all-time' } }) } }), true);
  const html = h.view.content({ trainer: '2x2' });
  assert.equal(h.view.snapshot().displayedPoints.length, 3);
  assert.equal(h.view.snapshot().rangeStart, 0);
  assert.equal(h.view.snapshot().rangeEnd, 2);
  assert.match(html, /data-action="progress-all-time" disabled/);
});

test('range boundaries follow dates across new records, deletions and option changes', () => {
  const data = { attempts: [at('c', 2, 1), at('c', 4, 2), at('c', 6, 3), at('c', 8, 4)] };
  const h = harness(data);
  h.view.content({ trainer: '2x2' });
  h.change('range-start', '1');
  h.change('range-end', '2');
  data.attempts.unshift(at('c', 1, 1, { createdAt: '2026-09-30T12:00:00Z' }));
  data.attempts.push(at('c', 10, 5));
  h.view.content({ trainer: '2x2' });
  assert.deepEqual(h.view.snapshot().displayedPoints.map(point => point.date), [at('c', 0, 2).createdAt, at('c', 0, 3).createdAt]);
  h.change('range-end', '5');
  data.attempts.push(at('c', 12, 6));
  h.view.content({ trainer: '2x2' });
  assert.equal(h.view.snapshot().displayedPoints.at(-1).date, at('c', 0, 6).createdAt, 'right edge follows new results');
  data.attempts = data.attempts.filter(attempt => Date.parse(attempt.createdAt) > Date.parse(at('c', 0, 4).createdAt));
  h.view.content({ trainer: '2x2' });
  assert.equal(h.view.snapshot().rangeStart, 0);
  assert.equal(h.view.snapshot().rangeEnd, 1);
  h.change('range-start', '1');
  h.change('timing', 'simple');
  h.view.content({ trainer: '2x2' });
  assert.equal(h.view.snapshot().rangeStart, 1);
  h.change('clean', '', true);
  h.view.content({ trainer: '2x2' });
  assert.equal(h.view.snapshot().rangeStart, 1);
  h.change('mode', 'one-look');
  const empty = h.view.content({ trainer: '2x2' });
  assert.equal(h.view.snapshot().displayedPoints.length, 0);
  assert.doesNotMatch(empty, /data-progress="range-start"|NaN|Infinity/);
  h.change('mode', 'last-layer');
  h.view.content({ trainer: '2x2' });
  assert.deepEqual(h.view.snapshot().displayedPoints.map(point => point.date), [at('c', 0, 6).createdAt]);
});

test('algorithm set changes preserve dates rather than observation indices, including empty and non-overlapping sets', () => {
  const data = {
    attempts: [1, 3, 5, 7, 9].map(day => at('c', 10, day)).concat([2, 4, 6, 8].map(day => at('e', 12, day))),
    lte: { attempts: [at('edge', 20, 1), at('edge', 18, 2)] },
    ltc: { attempts: [at('centre', 30, 10), at('centre', 25, 11)] },
  };
  const h = harness(data);
  h.view.content({ trainer: '2x2' });
  h.change('range-start', '1');
  h.change('range-end', '3');
  const dates = () => h.view.snapshot().displayedPoints.map(point => point.date);
  const set = value => { h.change('set', value); return h.view.content({ trainer: '2x2' }); };
  set('eg1');
  assert.deepEqual(dates(), [4, 6].map(day => at('', 0, day).createdAt));
  assert.equal(h.view.snapshot().rangeEnd, 2, 'a different history density must not retain the old index');
  set('cll-eg1');
  assert.deepEqual(dates(), [3, 4, 5, 6, 7].map(day => at('', 0, day).createdAt));
  const empty = set('eg2');
  assert.deepEqual(dates(), []);
  assert.doesNotMatch(empty, /data-progress="range-start"|NaN|Infinity/);
  set('edges');
  assert.deepEqual(dates(), [at('', 0, 2).createdAt], 'an older history displays the closest available endpoint');
  set('centres');
  assert.deepEqual(dates(), [at('', 0, 10).createdAt], 'a newer history displays the closest available endpoint');
  set('cll');
  assert.deepEqual(dates(), [3, 5, 7].map(day => at('', 0, day).createdAt), 'temporary clamping does not overwrite the chosen dates');
  h.view.click({ target: { closest: () => ({ dataset: { action: 'progress-all-time' } }) } });
  set('eg1');
  assert.deepEqual(dates(), [2, 4, 6, 8].map(day => at('', 0, day).createdAt), 'All time clears the shared date bounds');
});

test('N, mode, timing and recall options preserve the selected dates across sparse results', () => {
  const h = harness({ attempts: [
    at('c', 10, 1), at('c', 20, 3, { recallFail: true }), at('c', 8, 4),
    at('c', 7, 5, { timingMode: 'inspection' }), at('c', 6, 7), at('c', 5, 9),
    at('c', 15, 2, { mode: 'one-look' }), at('c', 14, 6, { mode: 'one-look' }), at('c', 12, 8, { mode: 'one-look' }),
  ] });
  h.view.content({ trainer: '2x2' });
  h.change('range-start', '1');
  h.change('range-end', '4');
  const change = (field, value, checked) => {
    h.change(field, value, checked);
    h.view.content({ trainer: '2x2' });
    return h.view.snapshot().displayedPoints.map(point => point.date);
  };
  const dates = days => days.map(day => at('', 0, day).createdAt);
  assert.deepEqual(change('window', '2'), dates([3, 4, 5, 7]));
  assert.equal(h.view.snapshot().displayedPoints[0].value, 15, 'N still updates the rolling average');
  assert.deepEqual(change('clean', '', true), dates([4, 5, 7]));
  assert.deepEqual(change('timing', 'simple'), dates([4, 7]));
  assert.deepEqual(change('mode', 'one-look'), dates([6]));
  assert.deepEqual(change('timing', 'inspection'), []);
  assert.deepEqual(change('mode', 'last-layer'), dates([5]));
  assert.deepEqual(change('timing', 'all'), dates([4, 5, 7]));
  assert.deepEqual(change('clean', '', false), dates([3, 4, 5, 7]), 'original endpoints return after filtering is reversed');
});

test('range controls support every trainer, singleton data and safe drag release', () => {
  const data = { attempts: [at('c', 3, 1)], lte: { attempts: [at('edge', 10, 1), at('edge', 8, 2)] }, ltc: { attempts: [at('centre', 20, 1), at('centre', 15, 2)] } };
  const h = harness(data);
  const singleton = h.view.content({ trainer: '2x2' });
  assert.match(singleton, /data-progress="range-start"[^>]*disabled/);
  assert.match(singleton, /data-progress="range-end"[^>]*disabled/);
  for (const trainer of ['5x5', '5x5-centres']) {
    h.view.content({ trainer });
    assert.equal(h.view.snapshot().displayedPoints.length, 2);
    const renders = h.renders;
    assert.equal(h.view.input({ target: { dataset: { progress: 'range-start' }, value: '1' } }), true);
    assert.equal(h.renders, renders, 'drag does not replace the active slider');
    h.change('range-start', '1');
    h.view.content({ trainer });
    assert.equal(h.view.snapshot().displayedPoints.length, 1);
  }
});


test('All time remains available when deletions make a pinned end match the current last point', () => {
  const data = { attempts: [at('c', 2, 1), at('c', 4, 2), at('c', 6, 3)] };
  const h = harness(data);
  h.view.content({ trainer: '2x2' });
  h.change('range-end', '1');
  data.attempts.pop();
  const pinned = h.view.content({ trainer: '2x2' });
  assert.equal(h.view.snapshot().displayedPoints.length, 2);
  assert.match(pinned, /data-action="progress-all-time" >All time/);
  h.view.click({ target: { closest: () => ({ dataset: { action: 'progress-all-time' } }) } });
  data.attempts.push(at('c', 8, 4));
  const reset = h.view.content({ trainer: '2x2' });
  assert.equal(h.view.snapshot().displayedPoints.length, 3);
  assert.equal(h.view.snapshot().displayedPoints.at(-1).date, at('c', 0, 4).createdAt);
  assert.match(reset, /data-action="progress-all-time" disabled/);
});
