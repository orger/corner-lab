import test from 'node:test';
import assert from 'node:assert/strict';
import { createProgressView, progressSets } from '../app/progress.js';

const additionalSets = [
  ['square1-obl', 'Square-1 · OBL', 'sq1obl'],
  ['square1-ep', 'Square-1 · EP', 'sq1ep'],
  ['skewb-ns2', 'Skewb · NS2', 'skewbns2'],
].map(([id, label, branch]) => ({ id, label, branch,
  cases: ['a', 'b', 'zero'].map(suffix => ({ id: `${branch}-${suffix}`, name: `${label} ${suffix}` })) }));
const at = (caseId, seconds, day, extra = {}) => ({ caseId, seconds,
  createdAt: `2026-11-${String(day).padStart(2, '0')}T12:00:00.000Z`, timingMode: 'simple', ...extra });
function harness(data) {
  const view = createProgressView({ getData: () => data, render: () => {}, cases2: [{ id: 'cll', set: 'CLL' }],
    casesEdges: [{ id: 'edge' }], casesCentres: [{ id: 'centre' }], casesSquare1: [{ id: 'shape' }], additionalSets });
  return { view, change: (field, value, checked = false) => view.change({ target: { dataset: { progress: field }, value, checked } }) };
}

test('additional progress descriptors extend the full-set list without changing existing callers', () => {
  const baseline = progressSets(), expanded = progressSets({ additionalSets });
  assert.deepEqual(expanded.slice(0, baseline.length), baseline);
  assert.deepEqual(expanded.slice(baseline.length), additionalSets);
  assert.equal(progressSets({ additionalSets: [{ id: 'empty', label: 'Empty', branch: 'empty', cases: [] }] }).length, baseline.length);
});

test('each new trainer opens its own complete-set chart and weights cases equally', () => {
  const data = { attempts: [at('cll', 99, 1)], lte: { attempts: [] }, ltc: { attempts: [] }, sq1: { attempts: [] } };
  for (const [index, set] of additionalSets.entries()) {
    const base = index * 10;
    data[set.branch] = { settings: { selectedCases: [set.cases[0].id] }, attempts: [
      at(set.cases[0].id, base + 2, 1), at(set.cases[1].id, base + 10, 2),
      at(set.cases[0].id, base + 4, 3), at(set.cases[0].id, base + 6, 4),
      at('foreign-case', 1000, 5),
    ] };
  }
  const before = structuredClone(data), h = harness(data);
  h.change('window', '2');
  for (const [index, set] of additionalSets.entries()) {
    const html = h.view.content({ trainer: set.id }), state = h.view.snapshot();
    assert.equal(state.setId, set.id);
    assert.equal(state.result.value, index * 10 + 7.5);
    assert.equal(state.result.totalCases, 3);
    assert.equal(state.result.contributingCaseCount, 2);
    assert.equal(state.result.missingCaseCount, 1);
    assert.equal(state.result.points.length, 4);
    assert.deepEqual(state.result.cases.map(item => item.total), [3, 1, 0]);
    assert.match(html, /2 \/ 3 cases included/);
    assert.doesNotMatch(html, /data-progress="mode"|NaN|Infinity/);
    if (set.branch.startsWith('sq1')) assert.match(html, /all algorithm choices and starting alignments/);
  }
  assert.deepEqual(data, before);
  for (const [trainer, id] of [['2x2', 'cll'], ['5x5', 'edges'], ['5x5-centres', 'centres'], ['square1', 'square1']]) {
    h.view.content({ trainer });
    assert.equal(h.view.snapshot().setId, id);
  }
});

test('new set chart windows and timing filters use solve time, excluding DNF and assisted records', () => {
  for (const set of additionalSets) {
    const id = set.cases[0].id;
    const data = { [set.branch]: { attempts: [at(id, 2, 1), at(id, 4, 2, { timingMode: 'inspection', inspectionSeconds: 100 }),
      at(id, 20, 3, { recallFail: true }), at(id, 100, 4, { dnf: true }), at(id, 200, 5, { assisted: true })] } };
    const h = harness(data);
    h.view.content({ trainer: set.id });
    assert.equal(h.view.snapshot().result.value, 26 / 3);
    h.change('window', '2'); h.view.content({ trainer: set.id });
    assert.equal(h.view.snapshot().result.value, 12);
    h.change('clean', '', true); h.view.content({ trainer: set.id });
    assert.equal(h.view.snapshot().result.value, 3);
    h.change('timing', 'inspection'); h.view.content({ trainer: set.id });
    assert.equal(h.view.snapshot().result.value, 4);
    h.change('timing', 'simple'); h.view.content({ trainer: set.id });
    assert.equal(h.view.snapshot().result.value, 2);
  }
});

test('date bounds survive new set choices and other options while remaining on Insights', () => {
  const data = {};
  for (const [index, set] of additionalSets.entries()) {
    data[set.branch] = { attempts: (index === 0 ? [1, 3, 5, 7, 9] : index === 1 ? [2, 4, 6, 8] : []).map(day => at(set.cases[0].id, 20 - day, day)) };
  }
  const h = harness(data), context = 'square1-obl';
  h.view.content({ trainer: context });
  h.change('range-start', '1');
  h.change('range-end', '3');
  const dates = () => h.view.snapshot().displayedPoints.map(point => point.date);
  h.change('set', 'square1-ep'); h.view.content({ trainer: context });
  assert.deepEqual(dates(), [4, 6].map(day => at('', 0, day).createdAt));
  h.change('window', '2'); h.change('timing', 'simple'); h.view.content({ trainer: context });
  assert.deepEqual(dates(), [4, 6].map(day => at('', 0, day).createdAt));
  h.change('set', 'skewb-ns2');
  assert.doesNotMatch(h.view.content({ trainer: context }), /NaN|Infinity|data-progress="range-start"/);
  assert.deepEqual(dates(), []);
  h.change('set', 'square1-obl'); h.view.content({ trainer: context });
  assert.deepEqual(dates(), [3, 5, 7].map(day => at('', 0, day).createdAt));
});
