import test from 'node:test';
import assert from 'node:assert/strict';
import { createLTETrainer } from '../app/lte.js';
import { freshData, validateData } from '../app/storage.js';
import { CASES_CENTRES } from '../app/catalog-centres.js';
import { createCentresDrill } from '../app/centres-drill.js';
import { centreSVG5 } from '../app/centres-view.js';
import { applyAlg, solvedState, inverse, reductionStatus } from '../app/cube5.js';

function controller(settings = {}) {
  const data = freshData(), saves = [], toasts = [], dialogs = [], nodes = new Map();
  Object.assign(data.ltc.settings, settings);
  const trainer = createLTETrainer({
    kind: 'centres', catalog: CASES_CENTRES, storageKey: 'ltc', setId: 'L2C',
    diagram: centreSVG5, buildDrill: createCentresDrill,
    getData: () => data, persist: () => saves.push(structuredClone(data)), render() {},
    toast: message => toasts.push(message), navigate() {},
    modal: (title, body, footer) => dialogs.push({ title, body, footer }), closeModal() {},
    exportBackup() {}, importBackup() {}, download() {},
    document: { querySelector: selector => nodes.get(selector) || null },
    window: { confirm: () => true }, now: () => 0, random: () => .25,
    requestFrame: () => 1, cancelFrame() {}, createAudio: () => ({ start() {}, cancel() {} }),
  });
  trainer.next(false);
  return {
    data, trainer, saves, toasts, dialogs, nodes,
    click(action, dataset = {}) {
      const element = { dataset: { action, ...dataset } };
      return trainer.click({ target: { matches: () => false, closest: selector => selector === '[data-action]' ? element : null } });
    },
    change(dataset, value, extras = {}) {
      return trainer.change({ target: { dataset, value, type: 'select', ...extras } });
    },
  };
}

test('centres controller builds every PDF case with its supplied solution and solved other centres', () => {
  const ui = controller();
  for (const item of CASES_CENTRES) {
    ui.data.ltc.settings.selectedCases = [item.id];
    ui.trainer.next(false);
    const current = ui.trainer.snapshot().current;
    assert.ok(current, `${item.id}: ${ui.toasts.join(', ')}`);
    assert.equal(current.algorithm.id, item.defaultAlgorithmId);
    assert.deepEqual(current.state, applyAlg(solvedState(), inverse(item.algorithms[0].alg)));
    assert.equal(reductionStatus(current.state).centres.filter(centre => centre.solved).length, 4, item.id);
    assert.equal(reductionStatus(applyAlg(current.state, current.solution)).centres.filter(centre => centre.solved).length, 6, item.id);
  }
  assert.deepEqual(ui.data.ltc.preferences, {});
  assert.deepEqual(ui.toasts, []);
});

test('centres preferences, grips and Speed-window saved practices remain separate from the edge and 2×2 trainers', async () => {
  const ui = controller({ selectedCases: ['LTC-19'], orientations: ['y'], scrambleStyle: 'varied', timingMode: 'inspection', inspectionAudio: true, strategy: 'slow', slowWindow: 12 });
  const unchanged2 = structuredClone({ settings: ui.data.settings, preferences: ui.data.preferences, attempts: ui.data.attempts });
  const unchangedEdges = structuredClone(ui.data.lte);
  const item = CASES_CENTRES.at(-1), current = ui.trainer.snapshot().current;
  await ui.click('lte-detail', { id: item.id });
  await ui.change({}, item.algorithms[0].id, { name: 'lte-algorithm', type: 'radio' });
  assert.equal(ui.data.ltc.preferences[item.id], item.algorithms[0].id);
  assert.equal(ui.trainer.snapshot().current, current, 'saving a preference does not replace a displayed setup');
  await ui.click('lte-grip', { value: 'y2' });
  const selected = structuredClone(ui.data.ltc.settings);
  ui.nodes.set('#lte-preset-name', { value: 'My centre practice' });
  await ui.click('lte-save-preset');
  const preset = ui.data.ltc.presets[0];
  ui.data.ltc.settings.selectedCases = ['LTC-01']; ui.data.ltc.settings.orientations = [''];
  ui.data.ltc.settings.slowWindow = 3;
  await ui.click('lte-load-preset', { id: preset.id });
  assert.deepEqual(ui.data.ltc.settings, selected);
  assert.equal(ui.trainer.snapshot().current.case.id, item.id);
  assert.deepEqual(ui.data.lte, unchangedEdges);
  assert.deepEqual({ settings: ui.data.settings, preferences: ui.data.preferences, attempts: ui.data.attempts }, unchanged2);
  assert.doesNotThrow(() => validateData(ui.saves.at(-1)));
});

test('centres Speed practice uses its own adjustable recent clean window and persists numeric edits', async () => {
  const [first, second] = CASES_CENTRES;
  const ui = controller({ selectedCases: [first.id, second.id], strategy: 'slow', slowWindow: 20 });
  const unchangedEdges = structuredClone(ui.data.lte), unchanged2 = structuredClone(ui.data.settings);
  const records = (item, times) => times.map((seconds, index) => ({
    id: `${item.id}-${index}`, caseId: item.id, group: item.group,
    algorithmId: item.defaultAlgorithmId, algorithm: item.algorithms[0].alg,
    orientation: '', scrambleStyle: 'provided', timingMode: 'simple', inspectionAudio: false,
    seconds, inspectionSeconds: null, recallFail: false, dnf: false, assisted: false,
    createdAt: new Date(Date.UTC(2026, 9, 1, 0, index)).toISOString(),
    sessionId: 'speed-test', scramble: '', solution: item.algorithms[0].alg,
  }));
  ui.data.ltc.attempts = [
    ...records(first, [...Array(10).fill(20), ...Array(5).fill(1)]),
    ...records(second, Array(15).fill(6)),
  ];
  ui.trainer.next(false);
  assert.equal(ui.trainer.snapshot().current.case.id, first.id);
  await ui.change({ lteSetting: 'slowWindow' }, '5', { type: 'number' });
  assert.equal(ui.data.ltc.settings.slowWindow, 5);
  ui.trainer.next(false);
  assert.equal(ui.trainer.snapshot().current.case.id, second.id);
  assert.match(ui.trainer.content('train'), /latest 5 clean solves/);
  assert.equal(validateData(ui.saves.at(-1)).ltc.settings.slowWindow, 5);
  await ui.change({ lteSetting: 'slowWindow' }, '2.5', { type: 'number' });
  assert.equal(ui.data.ltc.settings.slowWindow, 5);
  assert.deepEqual(ui.data.lte, unchangedEdges);
  assert.deepEqual(ui.data.settings, unchanged2);
});

test('centres views explain the PDF notation and training step without edge setup-column claims', async () => {
  const ui = controller();
  const pages = ['train', 'library', 'insights', 'settings'].map(page => ui.trainer.content(page));
  const combined = pages.join('\n');
  assert.match(pages[0], /Scrambled centre pattern/);
  assert.match(pages[1], /19 unsolved cases/);
  assert.match(pages[3], /CubeSkills Last Two Centers PDF/);
  assert.match(pages[3], /M turns only the middle slice/);
  assert.doesNotMatch(combined, /first column|second column|27 sequences|13 rows|Reverse direction|Complete the edge pairing/);
  assert.doesNotMatch(combined, /undefined|Invalid Date/);
  await ui.click('lte-detail', { id: 'LTC-19' });
  assert.match(ui.dialogs.at(-1).body, /M/);
  assert.doesNotMatch(ui.dialogs.at(-1).body, /first column|second column|Reverse direction/);
});

test('Learning visits all 19 centre cases once per batch and keeps other trainers independent', async () => {
  const ui = controller({ strategy: 'learning' });
  const previousEdges = structuredClone(ui.data.lte), previous2 = structuredClone(ui.data.settings);
  const expected = CASES_CENTRES.map(item => item.id).sort(), batches = [[], []];
  for (let index = 0; index < expected.length * 2; index++) {
    if (index) ui.trainer.next(false);
    const current = ui.trainer.snapshot().current, batchNumber = Math.floor(index / expected.length) + 1;
    batches[batchNumber - 1].push(current.case.id);
    assert.deepEqual(current.learningBatch, { batchNumber, position: index % expected.length + 1, total: 19 });
  }
  for (const batch of batches) assert.deepEqual(batch.sort(), expected);
  assert.match(ui.trainer.content('train'), /Learning batch 2 · case 19 of 19/);
  assert.deepEqual(ui.data.lte, previousEdges);
  assert.deepEqual(ui.data.settings, previous2);
  ui.nodes.set('#lte-preset-name', { value: 'Learn all centres' });
  await ui.click('lte-save-preset');
  const preset = ui.data.ltc.presets[0];
  await ui.change({ lteSetting: 'strategy' }, 'uniform');
  await ui.click('lte-load-preset', { id: preset.id });
  assert.equal(ui.data.ltc.settings.strategy, 'learning');
  assert.deepEqual(ui.trainer.snapshot().current.learningBatch, { batchNumber: 1, position: 1, total: 19 });
  assert.equal(validateData(ui.saves.at(-1)).ltc.presets[0].settings.strategy, 'learning');
});
