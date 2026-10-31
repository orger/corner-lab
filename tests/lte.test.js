import test from 'node:test';
import assert from 'node:assert/strict';
import { createLTETrainer } from '../app/lte.js';
import { freshData, validateData } from '../app/storage.js';
import { CASES5 } from '../app/catalog5.js';
import { applyAlg, solvedState, isSolved } from '../app/cube5.js';

const firstCase = CASES5[0];
const defaultAlgorithm = item => item.algorithms.find(algorithm => algorithm.id === item.defaultAlgorithmId);
function attempt(overrides = {}) {
  return {
    id: 'result-1', caseId: firstCase.id, group: firstCase.group, set: 'L2E',
    algorithmId: defaultAlgorithm(firstCase).id, algorithm: defaultAlgorithm(firstCase).alg,
    orientation: '', scrambleStyle: 'provided', timingMode: 'simple', inspectionAudio: false,
    seconds: 5.1, inspectionSeconds: null, recallFail: false, dnf: false, assisted: false,
    createdAt: '2026-09-27T10:00:00Z', sessionId: 'session-fixture', scramble: 'R', solution: "R'",
    ...overrides,
  };
}

function controller(settings = {}, random = () => 0.25, { canSave = () => true } = {}) {
  const data = freshData();
  data.initialized = true;
  Object.assign(data.lte.settings, { selectedCases: [firstCase.id], showPreview: false }, settings);
  const nodes = new Map([['#lte-timer-display', { innerHTML: '' }], ['#lte-library-results', { innerHTML: '' }]]);
  const frames = new Map(), saves = [], toasts = [], audioCalls = [], dialogs = [], downloads = [];
  let time = 0, frameId = 0, page = 'train', renders = 0, trainer;
  const document = { querySelector: selector => nodes.get(selector) || null, activeElement: null };
  const modal = (title, body, footer) => {
    dialogs.push({ title, body, footer });
    nodes.set('.modal', { querySelectorAll: () => [] });
  };
  const closeModal = () => nodes.delete('.modal');
  trainer = createLTETrainer({
    getData: () => data, persist: () => saves.push(structuredClone(data)), canSave,
    render: () => { renders++; trainer?.afterRender(); }, toast: message => toasts.push(message),
    navigate: value => { page = value; }, modal, closeModal,
    exportBackup: () => {}, importBackup: () => {}, download: (...args) => downloads.push(args),
    document, window: { confirm: () => true }, now: () => time, random,
    requestFrame: callback => { const id = ++frameId; frames.set(id, callback); return id; },
    cancelFrame: id => frames.delete(id),
    createAudio: () => ({ start: () => audioCalls.push('start'), cancel: () => audioCalls.push('cancel') }),
  });
  trainer.next(false);
  return {
    trainer, data, nodes, saves, toasts, audioCalls, dialogs, downloads, closeModal,
    setTime: value => { time = value; }, snapshot: trainer.snapshot,
    renderCount: () => renders, currentPage: () => page,
    frame: () => { const next = frames.entries().next().value; if (next) { frames.delete(next[0]); next[1](); } },
    click(action, dataset = {}) {
      const element = { dataset: { action, ...dataset } };
      return trainer.click({ target: { matches: () => false, closest: selector => selector === '[data-action]' ? element : null } });
    },
    change(dataset = {}, value = '', extras = {}) {
      return trainer.change({ target: { dataset, value, type: 'select', ...extras } });
    },
    key(kind = 'keydown', code = 'Space', options = {}) {
      const target = options.target || 'body';
      const event = {
        code, key: code === 'Space' ? ' ' : code, repeat: false, prevented: false,
        preventDefault() { this.prevented = true; },
        target: { matches: selectors => selectors.split(',').includes(target), isContentEditable: target === 'contenteditable' },
        ...options,
      };
      if (typeof event.target === 'string') event.target = { matches: selectors => selectors.split(',').includes(target), isContentEditable: target === 'contenteditable' };
      if (kind === 'keydown') trainer.keydown(event, page); else trainer.keyup(event);
      return event;
    },
  };
}

test('all 13 LTE cases default to supplied solutions and the corresponding supplied setup state', () => {
  const ui = controller();
  for (const item of CASES5) {
    ui.data.lte.settings.selectedCases = [item.id];
    ui.trainer.next(false);
    const current = ui.snapshot().current;
    assert.ok(current, `${item.id}: ${ui.toasts.join(', ')}`);
    assert.equal(current.case.id, item.id);
    assert.equal(current.algorithm.id, item.defaultAlgorithmId);
    assert.deepEqual(current.state, applyAlg(solvedState(), defaultAlgorithm(item).setupAlg), item.id);
    assert.equal(isSolved(applyAlg(current.state, current.solution)), true, item.id);
  }
  assert.deepEqual(ui.data.lte.preferences, {}, 'default choices require no redundant preferences');
  assert.equal(ui.toasts.length, 0);
});

test('all 27 supplied algorithm choices persist per case and apply to the next drill', async () => {
  const ui = controller();
  const unchanged2x2 = structuredClone({ settings: ui.data.settings, preferences: ui.data.preferences, attempts: ui.data.attempts });
  for (const item of CASES5) for (const algorithm of item.algorithms) {
    ui.data.lte.settings.selectedCases = [item.id];
    const oldCurrent = ui.snapshot().current;
    await ui.click('lte-detail', { id: item.id });
    await ui.change({}, algorithm.id, { name: 'lte-algorithm', type: 'radio' });
    assert.equal(ui.data.lte.preferences[item.id], algorithm.id);
    assert.equal(ui.snapshot().current, oldCurrent, 'preference changes must not silently replace the displayed scramble');
    ui.closeModal(); ui.trainer.next(false);
    assert.equal(ui.snapshot().current.algorithm.id, algorithm.id);
    assert.equal(isSolved(applyAlg(ui.snapshot().current.state, ui.snapshot().current.solution)), true);
  }
  assert.deepEqual({ settings: ui.data.settings, preferences: ui.data.preferences, attempts: ui.data.attempts }, unchanged2x2);
  assert.doesNotThrow(() => validateData(ui.saves.at(-1)));
});

test('simple LTE timing uses two presses and records grip, scramble style and algorithm choice', async () => {
  const ui = controller({ orientations: ["y'"], scrambleStyle: 'varied', timingMode: 'simple', inspectionAudio: true });
  ui.data.lte.preferences[firstCase.id] = firstCase.algorithms[0].id;
  ui.trainer.next(false);
  const current = ui.snapshot().current;
  ui.setTime(1000); await ui.click('lte-timer');
  assert.equal(ui.snapshot().phase, 'running');
  assert.equal(ui.trainer.active(), true);
  ui.setTime(2300); ui.frame();
  assert.match(ui.nodes.get('#lte-timer-display').innerHTML, /1.*30/);
  ui.setTime(4250); await ui.click('lte-timer');
  const result = ui.data.lte.attempts[0];
  assert.equal(ui.snapshot().phase, 'done');
  assert.equal(result.seconds, 3.25);
  assert.equal(result.inspectionSeconds, null);
  assert.equal(result.timingMode, 'simple');
  assert.equal(result.inspectionAudio, false);
  assert.equal(result.orientation, "y'");
  assert.equal(result.scrambleStyle, 'varied');
  assert.equal(result.algorithmId, firstCase.algorithms[0].id);
  assert.equal(result.algorithm, current.algorithm.alg);
  assert.equal(result.scramble, current.scramble);
  assert.equal(result.solution, current.solution);
  assert.equal(ui.audioCalls.includes('start'), false);
  assert.deepEqual(ui.data.attempts, []);
  assert.doesNotThrow(() => validateData(ui.saves.at(-1)));
});

test('three LTE Space presses separate inspection and solving, with held-key protection and cues', () => {
  const ui = controller({ timingMode: 'inspection', inspectionAudio: true });
  assert.equal(ui.key().prevented, true);
  assert.equal(ui.snapshot().phase, 'inspecting');
  assert.equal(ui.audioCalls.filter(call => call === 'start').length, 1);
  ui.setTime(1000); ui.key('keydown', 'Space', { repeat: true }); ui.key();
  assert.equal(ui.snapshot().phase, 'inspecting');
  ui.key('keyup'); ui.setTime(12500);
  const cancels = ui.audioCalls.filter(call => call === 'cancel').length;
  ui.key();
  assert.equal(ui.snapshot().phase, 'running');
  assert.ok(ui.audioCalls.filter(call => call === 'cancel').length > cancels);
  ui.key();
  assert.equal(ui.snapshot().phase, 'running');
  ui.key('keyup'); ui.setTime(16000); ui.key();
  const result = ui.data.lte.attempts[0];
  assert.equal(result.seconds, 3.5);
  assert.equal(result.inspectionSeconds, 12.5, 'a zero-valued start timestamp is valid');
  assert.equal(result.timingMode, 'inspection');
  assert.equal(result.inspectionAudio, true);
  ui.key();
  assert.equal(ui.snapshot().phase, 'done');
  assert.equal(ui.data.lte.attempts.length, 1);
});

test('active LTE timing blocks navigation and settings; Escape and leaving silence cues without saving', async () => {
  const ui = controller({ timingMode: 'inspection', inspectionAudio: true });
  for (const phase of ['inspecting', 'running']) {
    await ui.click('lte-timer');
    if (phase === 'running') await ui.click('lte-timer');
    assert.equal(ui.snapshot().phase, phase);
    const current = ui.snapshot().current;
    await ui.click('nav', { page: 'library' }); await ui.click('lte-next');
    await ui.click('lte-timing', { mode: 'simple' });
    await ui.change({ lteSetting: 'inspectionAudio' }, '', { type: 'checkbox', checked: false });
    await ui.change({ lteSetting: 'scrambleStyle' }, 'varied');
    ui.key('keydown', 'n');
    assert.equal(ui.currentPage(), 'train');
    assert.equal(ui.snapshot().current, current);
    assert.equal(ui.data.lte.settings.timingMode, 'inspection');
    assert.equal(ui.data.lte.settings.inspectionAudio, true);
    assert.equal(ui.data.lte.settings.scrambleStyle, 'provided');
    const cancels = ui.audioCalls.length;
    ui.key('keydown', 'Escape');
    assert.equal(ui.snapshot().phase, 'ready');
    assert.ok(ui.audioCalls.length > cancels);
    assert.deepEqual(ui.data.lte.attempts, []);
  }
  await ui.click('lte-timer');
  const cancels = ui.audioCalls.length;
  ui.trainer.leave();
  assert.ok(ui.audioCalls.length > cancels);
  assert.deepEqual(ui.data.lte.attempts, []);
});

test('LTE keyboard timing ignores form fields and dialogs and supports silent zero-length inspection', async () => {
  const ui = controller({ timingMode: 'inspection', inspectionAudio: false });
  for (const target of ['input', 'textarea', 'select', 'contenteditable']) {
    ui.key('keydown', 'Space', { target }); ui.key('keyup', 'Space', { target });
    assert.equal(ui.snapshot().phase, 'ready');
  }
  await ui.click('lte-detail', { id: firstCase.id });
  ui.key(); ui.key('keyup');
  assert.equal(ui.snapshot().phase, 'ready');
  ui.closeModal();
  await ui.click('lte-timer'); await ui.click('lte-timer');
  ui.setTime(2000); await ui.click('lte-timer');
  assert.equal(ui.data.lte.attempts[0].inspectionSeconds, 0);
  assert.equal(ui.data.lte.attempts[0].seconds, 2);
  assert.equal(ui.data.lte.attempts[0].inspectionAudio, false);
  assert.equal(ui.audioCalls.includes('start'), false);
});

test('LTE manual results respect recording and reveal flags, with later recall/DNF edits', async () => {
  const ui = controller({ record: false, timingMode: 'inspection', inspectionAudio: true });
  ui.nodes.set('#lte-manual', { value: '2.73' });
  await ui.click('lte-reveal'); await ui.click('lte-manual');
  assert.equal(ui.snapshot().lastResult.seconds, 2.73);
  assert.equal(ui.snapshot().lastResult.assisted, true);
  assert.equal(ui.snapshot().lastResult.inspectionSeconds, null);
  assert.equal(ui.snapshot().lastResult.inspectionAudio, false);
  assert.deepEqual(ui.data.lte.attempts, []);
  ui.data.lte.settings.record = true;
  await ui.click('lte-next');
  ui.nodes.set('#lte-manual', { value: '3.14' }); await ui.click('lte-manual');
  assert.equal(ui.data.lte.attempts.length, 1);
  assert.equal(ui.data.lte.attempts[0].assisted, false);
  await ui.change({ lteFlag: 'recallFail' }, '', { type: 'checkbox', checked: true });
  await ui.change({ lteFlag: 'dnf' }, '', { type: 'checkbox', checked: true });
  assert.equal(ui.data.lte.attempts[0].recallFail, true);
  assert.equal(ui.data.lte.attempts[0].dnf, true);
  assert.doesNotThrow(() => validateData(ui.saves.at(-1)));
  await ui.click('lte-discard');
  assert.deepEqual(ui.data.lte.attempts, []);
});

test('LTE results show the save failure even when the attempted result remains in memory', async () => {
  const ui = controller({}, () => 0.25, { canSave: () => false });
  ui.nodes.set('#lte-manual', { value: '3.14' });
  await ui.click('lte-manual');
  assert.equal(ui.data.lte.attempts.length, 1, 'unsaved results remain available for backup export');
  assert.equal(ui.snapshot().lastResult.seconds, 3.14);
  const html = ui.trainer.content('train');
  assert.match(html, /Not saved — export backup/);
  assert.match(html, /Save error/);
  assert.doesNotMatch(html, />Recorded<|Saved on this Mac/);
});

test('LTE solves over 24 hours are cancelled instead of persisting an unloadable record', async () => {
  const ui = controller();
  await ui.click('lte-timer');
  ui.setTime(86400001); await ui.click('lte-timer');
  assert.equal(ui.snapshot().phase, 'ready');
  assert.equal(ui.snapshot().lastResult, null);
  assert.deepEqual(ui.data.lte.attempts, []);
  assert.equal(ui.saves.length, 0);
  assert.doesNotThrow(() => validateData(ui.data));
});

test('an overnight LTE inspection followed by a short solve remains reloadable', async () => {
  const ui = controller({ timingMode: 'inspection' });
  await ui.click('lte-timer');
  ui.setTime(90000000); await ui.click('lte-timer');
  ui.setTime(90002000); await ui.click('lte-timer');
  assert.equal(ui.data.lte.attempts[0].seconds, 2);
  assert.equal(ui.data.lte.attempts[0].inspectionSeconds, 90000);
  const reloaded = validateData(ui.saves.at(-1));
  assert.equal(reloaded.lte.attempts[0].seconds, 2);
  assert.equal(reloaded.lte.attempts[0].inspectionSeconds, 90000);
});

test('weighted LTE practice uses only selected algorithms, grips, scramble styles and timing conditions', () => {
  const ui = controller({ orientations: ['y2'], timingMode: 'inspection', inspectionAudio: true, scrambleStyle: 'varied', strategy: 'slow' });
  const accepted = attempt({ id: 'matching', orientation: 'y2', timingMode: 'inspection', inspectionAudio: true, scrambleStyle: 'varied' });
  const mismatches = {
    caseId: CASES5[1].id, algorithmId: firstCase.algorithms[0].id,
    orientation: '', timingMode: 'simple', inspectionAudio: false, scrambleStyle: 'provided',
  };
  ui.data.lte.attempts = [accepted, ...Object.entries(mismatches).map(([field, value]) => ({ ...accepted, id: field, [field]: value, seconds: 999 }))];
  assert.deepEqual(ui.trainer.scoped().map(a => a.id), ['matching']);
  ui.data.lte.settings.timingMode = 'simple';
  assert.deepEqual(ui.trainer.scoped().map(a => a.id), ['timingMode']);
});

test('LTE Speed practice samples by the adjustable recent clean median after matching conditions', async () => {
  const [first, second] = CASES5;
  const ui = controller({ selectedCases: [first.id, second.id], strategy: 'slow', slowWindow: 20 });
  const records = (item, times) => times.map((seconds, index) => attempt({
    id: `${item.id}-${index}`, caseId: item.id, group: item.group,
    algorithmId: defaultAlgorithm(item).id, algorithm: defaultAlgorithm(item).alg,
    seconds, createdAt: new Date(Date.UTC(2026, 9, 1, 0, index)).toISOString(),
  }));
  const firstRecords = records(first, [...Array(10).fill(20), ...Array(5).fill(1)]);
  const secondRecords = records(second, Array(15).fill(6));
  const late = { ...firstRecords.at(-1), createdAt: '2026-10-18T12:00:00Z', seconds: 99 };
  ui.data.lte.attempts = [...firstRecords, ...secondRecords,
    { ...late, id: 'lapse', recallFail: true }, { ...late, id: 'dnf', dnf: true },
    { ...late, id: 'assisted', assisted: true }, { ...late, id: 'other-style', scrambleStyle: 'varied' },
    { ...late, id: 'other-grip', orientation: 'y' },
  ];
  ui.trainer.next(false);
  assert.equal(ui.snapshot().current.case.id, first.id, 'longer window still reflects earlier slow execution');
  const current = ui.snapshot().current, history = structuredClone(ui.data.lte.attempts);
  await ui.change({ lteSetting: 'slowWindow' }, '5', { type: 'number' });
  assert.equal(ui.snapshot().current, current, 'changing N takes effect on the next setup');
  assert.equal(ui.data.lte.settings.slowWindow, 5);
  assert.equal(ui.saves.at(-1).lte.settings.slowWindow, 5);
  assert.equal(validateData(ui.saves.at(-1)).lte.settings.slowWindow, 5);
  ui.trainer.next(false);
  assert.equal(ui.snapshot().current.case.id, second.id, 'recent speed now prioritizes the other case');
  assert.deepEqual(ui.data.lte.attempts, history, 'selection never truncates stored history');
  assert.match(ui.trainer.content('train'), /latest 5 clean solves/);
  assert.match(ui.trainer.content('train'), /Clean solves per case \(N\)/);
  await ui.change({ lteSetting: 'strategy' }, 'uniform');
  assert.doesNotMatch(ui.trainer.content('train'), /data-lte-setting="slowWindow"/);
  assert.equal(ui.data.lte.settings.slowWindow, 5, 'switching focus keeps the chosen window');
});

test('LTE Speed window rejects invalid edits and is locked during timing', async () => {
  const ui = controller({ strategy: 'slow', slowWindow: 20 });
  for (const value of ['', '0', '-1', '2.5', '1001', 'NaN']) {
    const saved = ui.saves.length;
    await ui.change({ lteSetting: 'slowWindow' }, value, { type: 'number' });
    assert.equal(ui.data.lte.settings.slowWindow, 20);
    assert.equal(ui.saves.length, saved);
    assert.match(ui.toasts.at(-1), /whole number from 1 to 1,000/);
  }
  await ui.click('lte-timer');
  assert.match(ui.trainer.content('train'), /data-lte-setting="slowWindow" value="20" disabled/);
  await ui.change({ lteSetting: 'slowWindow' }, '5', { type: 'number' });
  assert.equal(ui.data.lte.settings.slowWindow, 20);
  assert.equal(ui.snapshot().phase, 'running');
});

test('filtered LTE reset intersects conditions and leaves 2×2 data, other results and preferences intact', async () => {
  const ui = controller();
  ui.data.attempts = [{ id: 'shared-id', caseId: 'CLL-S1', seconds: 9, createdAt: '2026-09-27T10:00:00Z' }];
  ui.data.lte.preferences[firstCase.id] = defaultAlgorithm(firstCase).id;
  ui.data.lte.presets = [{ id: 'preset', name: 'Keep me', settings: structuredClone(ui.data.lte.settings) }];
  const base = attempt({ id: 'shared-id', timingMode: 'inspection' });
  const mismatches = {
    caseId: CASES5[1].id, orientation: 'y', timingMode: 'simple', inspectionAudio: true,
    scrambleStyle: 'varied', algorithmId: firstCase.algorithms[0].id, createdAt: '2026-09-01T10:00:00Z',
  };
  const others = Object.entries(mismatches).map(([field, value]) => ({ ...base, id: field, [field]: value }));
  ui.data.lte.attempts = [base, ...others];
  const unchanged = structuredClone({ attempts: ui.data.attempts, preferences: ui.data.lte.preferences, presets: ui.data.lte.presets });
  const filters = { selectionOnly: true, orientation: 'none', timingMode: 'inspection', inspectionAudio: 'off', scrambleStyle: 'provided', algorithmId: base.algorithmId, since: '2026-09-20' };
  for (const [field, value] of Object.entries(filters)) await ui.change({ lteFilter: field }, value, field === 'selectionOnly' ? { type: 'checkbox', checked: true } : {});
  assert.deepEqual(ui.trainer.filtered().map(a => a.id), ['shared-id']);
  await ui.click('lte-reset');
  assert.match(ui.dialogs.at(-1).body, /<strong>1<\/strong>/);
  assert.equal(ui.data.lte.attempts.length, 8);
  await ui.click('lte-confirm-reset');
  assert.deepEqual(ui.data.lte.attempts.map(a => a.id), others.map(a => a.id));
  assert.deepEqual({ attempts: ui.data.attempts, preferences: ui.data.lte.preferences, presets: ui.data.lte.presets }, unchanged);
  await ui.click('lte-clear-filters');
  assert.equal(ui.trainer.filtered().length, others.length);
  assert.match(ui.trainer.content('insights'), /Individual results/);
});

test('LTE saved practices restore independent cases, grips, timing, scramble style and Speed window', async () => {
  const ui = controller({ selectedCases: [CASES5[2].id], orientations: ['y'], timingMode: 'inspection', inspectionAudio: true, scrambleStyle: 'varied', strategy: 'slow', slowWindow: 7 });
  const savedSettings = structuredClone(ui.data.lte.settings), unchanged2x2 = structuredClone(ui.data.settings);
  ui.nodes.set('#lte-preset-name', { value: 'Centres from varied setups' });
  await ui.click('lte-save-preset');
  const preset = ui.data.lte.presets[0];
  ui.data.lte.settings.selectedCases.push(firstCase.id);
  ui.data.lte.settings.scrambleStyle = 'provided';
  ui.data.lte.settings.orientations = [''];
  ui.data.lte.settings.slowWindow = 100;
  assert.deepEqual(preset.settings, savedSettings);
  await ui.click('lte-load-preset', { id: preset.id });
  assert.deepEqual(ui.data.lte.settings, savedSettings);
  assert.equal(ui.snapshot().current.case.id, CASES5[2].id);
  assert.deepEqual(ui.data.settings, unchanged2x2);
  assert.doesNotThrow(() => validateData(ui.saves.at(-1)));
});

test('LTE case selection can be emptied and search selects only matching rows', async () => {
  const ui = controller();
  await ui.change({ lteCase: firstCase.id }, '', { type: 'checkbox', checked: false });
  await ui.click('lte-next'); await ui.click('lte-timer');
  assert.equal(ui.snapshot().current, null);
  assert.equal(ui.snapshot().phase, 'ready');
  assert.deepEqual(ui.data.lte.attempts, []);
  assert.match(ui.trainer.content('train'), /Select at least one case/);
  ui.trainer.input({ target: { id: 'lte-search', value: 'LTE-03' } });
  await ui.click('lte-select', { value: 'all' });
  assert.deepEqual(ui.data.lte.settings.selectedCases, ['LTE-03']);
  await ui.click('lte-grip', { value: '' });
  assert.deepEqual(ui.data.lte.settings.orientations, [''], 'one grip must remain selected');
  await ui.click('lte-next');
  assert.equal(ui.snapshot().current.case.id, 'LTE-03');
});

test('Learning visits all selected edge cases exactly once in each shuffled batch', () => {
  const ids = CASES5.map(item => item.id);
  const ui = controller({ selectedCases: ids, strategy: 'learning' });
  const batches = [[], []];
  for (let index = 0; index < ids.length * 2; index++) {
    if (index) ui.trainer.next(false);
    const current = ui.snapshot().current;
    const batchNumber = Math.floor(index / ids.length) + 1;
    batches[batchNumber - 1].push(current.case.id);
    assert.deepEqual(current.learningBatch, { batchNumber, position: index % ids.length + 1, total: ids.length });
  }
  for (const batch of batches) assert.deepEqual([...batch].sort(), [...ids].sort());
  assert.match(ui.trainer.content('train'), /Learning · once per shuffled batch/);
  assert.match(ui.trainer.content('train'), /Learning batch 2 · case 13 of 13/);
  assert.match(ui.trainer.content('train'), /Skipped cases count toward the batch/);
  assert.deepEqual(ui.data.lte.attempts, [], 'generating cases never creates solve results');
});

test('Learning batch progress survives views, reveal, cancelled timing and retries', async () => {
  const ui = controller({ selectedCases: CASES5.slice(0, 3).map(item => item.id), strategy: 'learning' });
  const first = ui.snapshot().current;
  for (const page of ['library', 'insights', 'settings', 'train']) {
    await ui.click('nav', { page });
    ui.trainer.content(page);
    assert.equal(ui.snapshot().current, first);
  }
  await ui.click('lte-reveal');
  await ui.click('lte-timer');
  ui.key('keydown', 'Escape');
  assert.equal(ui.snapshot().current, first);
  assert.equal(first.learningBatch.position, 1);
  ui.nodes.set('#lte-manual', { value: '5' });
  await ui.click('lte-manual');
  await ui.click('lte-discard');
  assert.equal(ui.snapshot().current, first);
  assert.equal(first.learningBatch.position, 1);
  await ui.click('lte-next');
  assert.notEqual(ui.snapshot().current.case.id, first.case.id);
  assert.equal(ui.snapshot().current.learningBatch.position, 2);
});

test('Learning starts fresh when edge selections, algorithms, focus or saved practice change', async () => {
  const ids = CASES5.slice(0, 3).map(item => item.id);
  const ui = controller({ selectedCases: ids, strategy: 'learning' });
  ui.trainer.next(false);
  await ui.change({ lteCase: ids[0] }, '', { type: 'checkbox', checked: false });
  await ui.change({ lteCase: CASES5[3].id }, '', { type: 'checkbox', checked: true });
  const newIds = [...ids.slice(1), CASES5[3].id], drawn = [];
  for (let index = 0; index < 3; index++) {
    ui.trainer.next(false);
    const current = ui.snapshot().current;
    drawn.push(current.case.id);
    assert.equal(current.learningBatch.batchNumber, 1);
    assert.equal(current.learningBatch.position, index + 1);
  }
  assert.deepEqual(drawn.sort(), [...newIds].sort());
  const item = CASES5[1], alternative = item.algorithms.find(algorithm => algorithm.id !== item.defaultAlgorithmId);
  await ui.click('lte-detail', { id: item.id });
  await ui.change({}, alternative.id, { name: 'lte-algorithm', type: 'radio' });
  ui.closeModal();
  ui.trainer.next(false);
  assert.deepEqual(ui.snapshot().current.learningBatch, { batchNumber: 1, position: 1, total: 3 });
  await ui.change({ lteSetting: 'strategy' }, 'uniform');
  assert.doesNotMatch(ui.trainer.content('train'), /Learning batch/);
  await ui.change({ lteSetting: 'strategy' }, 'learning');
  ui.trainer.next(false);
  assert.equal(ui.snapshot().current.learningBatch.position, 1);
  ui.nodes.set('#lte-preset-name', { value: 'Learning these edges' });
  await ui.click('lte-save-preset');
  const preset = ui.data.lte.presets[0];
  assert.equal(preset.settings.strategy, 'learning');
  ui.trainer.next(false);
  assert.equal(ui.snapshot().current.learningBatch.position, 2);
  await ui.click('lte-load-preset', { id: preset.id });
  assert.deepEqual(ui.snapshot().current.learningBatch, { batchNumber: 1, position: 1, total: 3 });
  assert.equal(validateData(ui.saves.at(-1)).lte.presets[0].settings.strategy, 'learning');
});

test('Learning safely handles empty and single-case edge selections', () => {
  const ui = controller({ selectedCases: [], strategy: 'learning' });
  assert.equal(ui.snapshot().current, null);
  ui.data.lte.settings.selectedCases = [firstCase.id];
  for (let batch = 1; batch <= 3; batch++) {
    ui.trainer.next(false);
    assert.equal(ui.snapshot().current.case.id, firstCase.id);
    assert.deepEqual(ui.snapshot().current.learningBatch, { batchNumber: batch, position: 1, total: 1 });
  }
  ui.trainer.reset();
  assert.deepEqual(ui.snapshot().current.learningBatch, { batchNumber: 1, position: 1, total: 1 });
});

const caseRecords = (item, times, prefix = item.id, algorithm = defaultAlgorithm(item)) => times.map((seconds, index) => attempt({
  id: `${prefix}-${index}`, caseId: item.id, group: item.group,
  algorithmId: algorithm.id, algorithm: algorithm.alg,
  seconds, createdAt: new Date(Date.UTC(2026, 9, index + 1)).toISOString(),
}));

const focusTable = html => {
  const start = html.indexOf('<h2>Where to focus</h2>');
  return html.slice(start, html.indexOf('</table>', start) + 8);
};

test('ranked LTE modes use only the fastest or slowest N matching preferred algorithms without changing selections', async () => {
  const [first, second, third, unmeasured] = CASES5;
  let draw = .25;
  const ids = [first, second, third, unmeasured].map(item => item.id);
  const ui = controller({ selectedCases: ids, strategy: 'slowest', rankCount: 1, slowWindow: 1 }, () => draw);
  ui.data.lte.attempts = [
    ...caseRecords(first, [30, 1]), ...caseRecords(second, [6, 6]), ...caseRecords(third, [10, 10]),
    attempt({ id: 'stale-version', caseId: first.id, group: first.group, algorithmId: defaultAlgorithm(first).id, algorithm: 'R U2', seconds: 999 }),
    attempt({ id: 'other-grip', caseId: third.id, group: third.group, algorithmId: defaultAlgorithm(third).id, algorithm: defaultAlgorithm(third).alg, orientation: 'y', seconds: 999 }),
  ];
  const history = structuredClone(ui.data.lte.attempts);
  ui.trainer.next(false);
  assert.equal(ui.snapshot().current.case.id, third.id);
  assert.match(ui.trainer.content('train'), /Slowest N algs/);
  assert.match(ui.trainer.content('train'), /Number of algorithms \(N\)/);
  assert.match(ui.trainer.content('train'), /slowest 1 measured algorithm/);
  const displayed = ui.snapshot().current;
  await ui.change({ lteSetting: 'strategy' }, 'fastest');
  assert.equal(ui.snapshot().current, displayed, 'focus changes keep the setup currently on screen');
  ui.trainer.next(false);
  assert.equal(ui.snapshot().current.case.id, first.id, 'the old 30s result does not override the latest clean result');
  await ui.change({ lteSetting: 'rankCount' }, '2', { type: 'number' });
  const seen = new Set();
  for (const value of [0, .49, .5, .99]) { draw = value; ui.trainer.next(false); seen.add(ui.snapshot().current.case.id); }
  assert.deepEqual([...seen], [first.id, second.id]);
  assert.deepEqual(ui.data.lte.settings.selectedCases, ids);
  assert.deepEqual(ui.data.lte.attempts, history);
  assert.match(ui.trainer.content('train'), /fastest 2 measured algorithms/);
});

test('ranked LTE controls explain an unmeasured baseline and validate both configurable counts while idle', async () => {
  const ui = controller({ selectedCases: CASES5.slice(0, 3).map(item => item.id), strategy: 'fastest', rankCount: 5, insightsWindow: 20 });
  assert.ok(ui.snapshot().current);
  assert.match(ui.trainer.content('train'), /All selected cases appear equally until a ranking can be built/);
  for (const [setting, initial, invalid] of [['rankCount', 5, ['', '0', '-1', '1.5', '130']], ['insightsWindow', 20, ['', '0', '-1', '1.5', '1001']]]) {
    for (const value of invalid) {
      const saved = ui.saves.length;
      await ui.change({ lteSetting: setting }, value, { type: 'number' });
      assert.equal(ui.data.lte.settings[setting], initial);
      assert.equal(ui.saves.length, saved);
      assert.match(ui.toasts.at(-1), /whole number/);
    }
  }
  await ui.change({ lteSetting: 'rankCount' }, '3', { type: 'number' });
  await ui.change({ lteSetting: 'insightsWindow' }, '7', { type: 'number' });
  assert.equal(validateData(ui.saves.at(-1)).lte.settings.rankCount, 3);
  assert.equal(validateData(ui.saves.at(-1)).lte.settings.insightsWindow, 7);
  ui.nodes.set('#lte-preset-name', { value: 'Lucky cases' });
  await ui.click('lte-save-preset');
  const preset = ui.data.lte.presets.at(-1);
  ui.data.lte.settings.rankCount = 9; ui.data.lte.settings.insightsWindow = 10;
  await ui.click('lte-load-preset', { id: preset.id });
  assert.equal(ui.data.lte.settings.rankCount, 3);
  assert.equal(ui.data.lte.settings.insightsWindow, 7);
  await ui.click('lte-timer');
  assert.match(ui.trainer.content('train'), /data-lte-setting="rankCount" value="3" disabled/);
  for (const setting of ['rankCount', 'insightsWindow', 'slowWindow']) {
    const before = ui.data.lte.settings[setting], saved = ui.saves.length;
    await ui.change({ lteSetting: setting }, '1', { type: 'number' });
    assert.equal(ui.data.lte.settings[setting], before);
    assert.equal(ui.saves.length, saved);
  }
});

test('LTE Insights windows each algorithm before grouping and keeps full history, exports and reset scope', async () => {
  const [first, second] = CASES5;
  const alternative = first.algorithms.find(algorithm => algorithm.id !== first.defaultAlgorithmId);
  assert.ok(alternative);
  const ui = controller({ selectedCases: [first.id, second.id], insightsWindow: 2 });
  ui.data.lte.attempts = [
    ...caseRecords(first, [100, 2, 4], 'first'),
    ...caseRecords(first, [200, 6, 8], 'alternative', alternative),
    ...caseRecords(second, [300, 10, 12], 'second'),
  ];
  const history = structuredClone(ui.data.lte.attempts);
  const initial = focusTable(ui.trainer.content('insights'));
  assert.match(initial, /Recent solves per algorithm/);
  assert.match(initial, /<th>Clean average<\/th><th>Clean median<\/th>/);
  assert.match(initial, new RegExp(`<td>${first.id}[^<]*<\\/td><td>4<\\/td><td>5\\.00s<\\/td><td>5\\.00s<\\/td>`));
  assert.match(initial, new RegExp(`<td>${second.id}[^<]*<\\/td><td>2<\\/td><td>11\\.00s<\\/td>`));
  await ui.change({ lteSetting: 'insightsWindow' }, '1', { type: 'number' });
  const narrowed = focusTable(ui.trainer.content('insights'));
  assert.match(narrowed, new RegExp(`<td>${first.id}[^<]*<\\/td><td>2<\\/td><td>6\\.00s<\\/td>`));
  assert.equal(ui.trainer.filtered().length, 9);
  assert.deepEqual(ui.data.lte.attempts, history);
  await ui.click('lte-csv');
  assert.equal(ui.downloads.at(-1)[1].split('\n').length, 10, 'CSV retains all nine original results');
  await ui.click('lte-reset');
  assert.match(ui.dialogs.at(-1).body, /<strong>9<\/strong>/, 'reset still describes the complete filtered history');
});

test('LTE recent Insights includes failures and assisted results in its lookback count', () => {
  const ui = controller({ insightsWindow: 2 });
  ui.data.lte.attempts = [
    ...caseRecords(firstCase, [100, 2, 40, 30]),
  ];
  ui.data.lte.attempts[2].dnf = true;
  ui.data.lte.attempts[3].assisted = true;
  const table = focusTable(ui.trainer.content('insights'));
  assert.match(table, /<td>2<\/td><td>—s<\/td><td>—s<\/td><td>—s<\/td><td>40\.00s<\/td><td>100%<\/td>/);
  assert.equal(ui.trainer.filtered().length, 4);
  assert.match(ui.trainer.content('insights'), /4 results match your filters/);
});

test('LTE algorithm Insights keeps changed move text under the same ID in separate recent-window rows', async () => {
  const ui = controller({ insightsWindow: 1 });
  const current = defaultAlgorithm(firstCase);
  ui.data.lte.attempts = [
    ...caseRecords(firstCase, [100, 60], 'old-revision', { ...current, alg: "R U R'" }),
    ...caseRecords(firstCase, [20, 4], 'current-revision'),
  ];
  await ui.change({}, 'algorithmId', { id: 'lte-insight-group' });
  const table = focusTable(ui.trainer.content('insights'));
  assert.match(table, /Historical algorithm · R U R&#39;<\/td><td>1<\/td><td>60\.00s<\/td>/);
  assert.match(table, /<td>1<\/td><td>4\.00s<\/td><td>4\.00s<\/td>/);
  assert.equal((table.match(/<tr><td>/g)||[]).length, 2, 'each move-text revision has one row with its own lookback');
  assert.equal(ui.trainer.filtered().length, 4, 'the summary does not change full history');
});
