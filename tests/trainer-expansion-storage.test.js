import test from 'node:test';
import assert from 'node:assert/strict';
import { CASES_SQ1_OBL } from '../app/catalog-square1-obl.js';
import { CASES_SQ1_EP } from '../app/catalog-square1-ep.js';
import { CASES_SKEWB_NS2 } from '../app/catalog-skewb-ns2.js';
import { CASES_SQ1 } from '../app/catalog-square1.js';
import { CASES5 } from '../app/catalog5.js';
import { CASES_CENTRES } from '../app/catalog-centres.js';
import { freshSQ1OBLData, validateSQ1OBLData, freshSQ1EPData, validateSQ1EPData,
  freshSkewbNS2Data, validateSkewbNS2Data } from '../app/lte-storage.js';
import { freshData, validateData } from '../app/storage.js';
import { createSkewbDrill } from '../app/skewb.js';

const trainers = [
  { key: 'sq1obl', trainer: 'square1-obl', cases: CASES_SQ1_OBL, fresh: freshSQ1OBLData, validate: validateSQ1OBLData, alignment: true },
  { key: 'sq1ep', trainer: 'square1-ep', cases: CASES_SQ1_EP, fresh: freshSQ1EPData, validate: validateSQ1EPData, alignment: true },
  { key: 'skewbns2', trainer: 'skewb-ns2', cases: CASES_SKEWB_NS2, fresh: freshSkewbNS2Data, validate: validateSkewbNS2Data, alignment: false },
];
function attempt(item) {
  const alg = item.algorithms[0];
  return { id: 'shared-result', caseId: item.id, group: item.group, set: item.set,
    algorithmId: alg.id, algorithm: alg.alg, orientation: '', scrambleStyle: 'provided',
    timingMode: 'inspection', inspectionAudio: true, seconds: 4.25, inspectionSeconds: 9.75,
    recallFail: false, dnf: false, assisted: false, createdAt: '2026-11-19T13:00:00.000Z',
    sessionId: 'session', scramble: alg.alg, solution: alg.alg };
}
function fixture(trainer) {
  const value = trainer.fresh(), item = trainer.cases[0];
  value.settings.selectedCases = [item.id];
  value.settings.strategy = 'learning';
  value.preferences[item.id] = item.algorithms[0].id;
  value.attempts = [attempt(item)];
  value.presets = [{ id: 'shared-practice', name: trainer.key, settings: structuredClone(value.settings) }];
  return value;
}

test('new trainers have independent defaults, preferences, saved practices and detached histories', () => {
  const root = freshData();
  root.initialized = true;
  for (const trainer of trainers) {
    const defaults = trainer.fresh();
    assert.ok(trainer.cases.length > 0);
    assert.deepEqual(defaults.settings.selectedCases, trainer.cases.map(item => item.id));
    assert.deepEqual(defaults.settings.orientations, ['']);
    assert.equal(defaults.settings.scrambleStyle, 'disguised');
    assert.equal(defaults.settings.layerAlignment, trainer.alignment ? 'random' : undefined);
    assert.deepEqual(trainer.validate(defaults), defaults);
    root[trainer.key] = fixture(trainer);
  }
  const before = structuredClone(root);
  for (const trainer of trainers) {
    root.trainer = trainer.trainer;
    const output = validateData(root);
    assert.deepEqual(output, root);
    output[trainer.key].settings.selectedCases.length = 0;
    output[trainer.key].attempts[0].seconds = 100;
    output[trainer.key].presets[0].settings.selectedCases.length = 0;
    assert.deepEqual(root[trainer.key], before[trainer.key]);
  }
  const restored = validateData(JSON.parse(JSON.stringify(root)));
  restored.sq1obl.attempts.length = 0;
  assert.equal(restored.sq1ep.attempts.length, 1);
  assert.equal(restored.skewbns2.attempts.length, 1);
});

test('version-one backups gain the new branches without changing any existing history', () => {
  const input = freshData();
  input.initialized = true;
  input.trainer = 'square1';
  for (const trainer of trainers) delete input[trainer.key];
  input.settings.selectedCases = ['CLL-S1'];
  input.attempts = [{ id: 'shared-result', caseId: 'CLL-S1', seconds: 2.4,
    createdAt: '2026-10-04T10:00:00Z', recallFail: true, dnf: false, assisted: false,
    timingMode: 'simple', inspectionAudio: false, bottomAuf: '', initialAuf: '', finishCaseId: '' }];
  for (const [key, item] of [['lte', CASES5[0]], ['ltc', CASES_CENTRES[0]], ['sq1', CASES_SQ1[0]]]) {
    input[key].settings.selectedCases = [item.id];
    input[key].preferences[item.id] = item.algorithms[0].id;
    input[key].attempts = [attempt(item)];
    input[key].presets = [{ id: 'shared-practice', name: key, settings: structuredClone(input[key].settings) }];
  }
  input.sq1.attempts[0].scrambleStyle = 'varied';
  input.sq1.attempts[0].algorithm = '  / (3, 0) / (-1, 1)  ';
  const before = structuredClone(input), loaded = validateData(input);
  for (const trainer of trainers) {
    assert.deepEqual(loaded[trainer.key], trainer.fresh());
    delete loaded[trainer.key];
  }
  assert.deepEqual(loaded, input);
  assert.deepEqual(input, before);
  for (const field of ['layerAlignment', 'initialTop', 'initialBottom']) assert.equal(Object.hasOwn(loaded.sq1.attempts[0], field), false);
});

test('new trainer branches reject malformed roots and cross-trainer selectors and results', () => {
  for (const trainer of trainers) {
    for (const branch of [undefined, null, [], {}, { ...trainer.fresh(), extra: true }]) {
      const input = freshData(); input[trainer.key] = branch;
      assert.throws(() => validateData(input));
    }
    const other = trainers.find(item => item !== trainer), foreign = other.cases[0];
    const changes = [
      data => { data.settings.selectedCases = [foreign.id]; },
      data => { data.presets[0].settings.selectedCases = [foreign.id]; },
      data => { data.preferences[foreign.id] = foreign.algorithms[0].id; },
      data => { data.preferences[trainer.cases[0].id] = foreign.algorithms[0].id; },
      data => { data.attempts[0] = attempt(foreign); },
      data => { data.attempts[0].set = foreign.set; },
      data => { data.attempts[0].group = 'unknown'; },
      data => { data.attempts[0].algorithmId = foreign.algorithms[0].id; },
      data => { data.attempts.push(structuredClone(data.attempts[0])); },
      data => { data.presets.push(structuredClone(data.presets[0])); },
    ];
    for (const change of changes) {
      const input = fixture(trainer); change(input);
      assert.throws(() => trainer.validate(input), `${trainer.key}: ${change}`);
    }
  }
  const input = freshData(); input.trainer = 'skewb';
  assert.throws(() => validateData(input));
});

test('all new trainers validate common practice modes, windows, timing and setup choices', () => {
  for (const trainer of trainers) {
    for (const strategy of ['uniform', 'learning', 'slow', 'slowest', 'fastest', 'inconsistent', 'new']) {
      const input = fixture(trainer);
      input.settings.strategy = strategy;
      input.settings.slowWindow = 37;
      input.settings.rankCount = 3;
      input.settings.insightsWindow = 12;
      input.settings.timingMode = 'inspection';
      input.settings.inspectionAudio = true;
      input.presets[0].settings = structuredClone(input.settings);
      assert.deepEqual(trainer.validate(input), input);
    }
    const changes = [
      settings => { settings.selectedCases.push(settings.selectedCases[0]); },
      settings => { settings.orientations = ['y']; },
      settings => { settings.orientations = []; },
      settings => { settings.strategy = 'unknown'; },
      settings => { settings.scrambleStyle = 'varied'; },
      settings => { settings.timingMode = 'countdown'; },
      settings => { settings.slowWindow = 0; },
      settings => { settings.rankCount = '3'; },
      settings => { settings.insightsWindow = 1.5; },
      settings => { settings.inspectionAudio = 'true'; },
    ];
    for (const change of changes) for (const saved of [false, true]) {
      const input = fixture(trainer); change(saved ? input.presets[0].settings : input.settings);
      assert.throws(() => trainer.validate(input), `${trainer.key}: ${change}`);
    }
    const input = fixture(trainer);
    input.settings.selectedCases = [];
    input.settings.scrambleStyle = 'provided';
    assert.deepEqual(trainer.validate(input), input);
  }
});

test('new Square-1 stages retain recorded quarter turns and keep missing metadata absent', () => {
  for (const trainer of trainers.filter(item => item.alignment)) {
    for (const style of ['provided', 'disguised']) for (const alignment of ['random', 'reference']) {
      const input = fixture(trainer);
      input.settings.scrambleStyle = style;
      input.settings.layerAlignment = alignment;
      input.presets[0].settings = structuredClone(input.settings);
      for (const turn of [-3, 0, 3, 6]) {
        Object.assign(input.attempts[0], { scrambleStyle: style, layerAlignment: alignment, initialTop: turn, initialBottom: turn });
        assert.deepEqual(trainer.validate(input), input);
      }
    }
    const old = fixture(trainer);
    delete old.settings.layerAlignment;
    delete old.presets[0].settings.layerAlignment;
    const loaded = trainer.validate(old);
    assert.equal(loaded.settings.layerAlignment, 'random');
    assert.equal(loaded.presets[0].settings.layerAlignment, 'random');
    assert.deepEqual(loaded.attempts, old.attempts);
    for (const field of ['initialTop', 'initialBottom']) for (const value of [-6, -5, -2, 1, 5, 7, 1.5, '3', null, Infinity]) {
      const input = fixture(trainer); input.attempts[0][field] = value;
      assert.throws(() => trainer.validate(input));
    }
    for (const target of ['settings', 'preset', 'attempt']) {
      const input = fixture(trainer);
      (target === 'settings' ? input.settings : target === 'preset' ? input.presets[0].settings : input.attempts[0]).layerAlignment = 'fixed';
      assert.throws(() => trainer.validate(input));
    }
  }
  const trainer = trainers[2];
  for (const field of ['layerAlignment', 'initialTop', 'initialBottom']) {
    const input = fixture(trainer); input.attempts[0][field] = field === 'layerAlignment' ? 'random' : 3;
    assert.throws(() => trainer.validate(input));
  }
  for (const target of ['settings', 'preset']) {
    const input = fixture(trainer);
    (target === 'settings' ? input.settings : input.presets[0].settings).layerAlignment = 'random';
    assert.throws(() => trainer.validate(input));
  }
});

test('new histories preserve move text while rejecting malformed notation and timing data', () => {
  for (const trainer of trainers) {
    const input = fixture(trainer);
    input.attempts[0].algorithm = `  ${input.attempts[0].algorithm}  `;
    input.attempts[0].inspectionSeconds = 90000;
    assert.deepEqual(trainer.validate(input), input);
    for (const field of ['algorithm', 'scramble', 'solution']) for (const value of ['<script>', {}, null, trainer.alignment ? 'R U' : '(3,0) /']) {
      const invalid = fixture(trainer); invalid.attempts[0][field] = value;
      assert.throws(() => trainer.validate(invalid));
    }
    for (const [field, value] of [['seconds', Infinity], ['seconds', -1], ['inspectionSeconds', -1], ['dnf', 'false'], ['createdAt', 'yesterday'], ['orientation', 'y'], ['scrambleStyle', 'varied']]) {
      const invalid = fixture(trainer); invalid.attempts[0][field] = value;
      assert.throws(() => trainer.validate(invalid));
    }
    input.attempts[0].scramble = '';
    input.attempts[0].solution = '';
    input.attempts[0].inspectionSeconds = null;
    assert.deepEqual(trainer.validate(input), input);
  }
});

test('every supplied new case and algorithm choice can be retained in a backup', () => {
  for (const trainer of trainers) {
    for (const item of trainer.cases) for (const algorithm of item.algorithms) {
      const input = trainer.fresh();
      input.settings.selectedCases = [item.id];
      input.preferences[item.id] = algorithm.id;
      input.attempts = [{ ...attempt(item), algorithmId: algorithm.id, algorithm: algorithm.alg, scramble: '', solution: algorithm.alg }];
      assert.deepEqual(trainer.validate(input), input, `${trainer.key}: ${item.id} / ${algorithm.id}`);
    }
  }
});

test('older Skewb backups keep their 131-case selection, preferred algorithms and history', () => {
  const root = freshData();
  root.initialized = true;
  root.trainer = 'skewb-ns2';
  const branch = root.skewbns2;
  branch.settings.selectedCases = Array.from({ length: 131 }, (_, i) => `NS2-${String(i + 1).padStart(3, '0')}`);
  const oldCases = ['NS2-001', 'NS2-131'].map(id => CASES_SKEWB_NS2.find(item => item.id === id));
  branch.preferences = Object.fromEntries(oldCases.map(item => [item.id, item.algorithms.at(-1).id]));
  branch.attempts = oldCases.map((item, index) => ({ ...attempt(item), id: `old-ns2-${index}`,
    algorithm: `  ${item.algorithms[0].alg}  `, seconds: 6 + index }));
  branch.presets = [{ id: 'old-ns2-selection', name: 'Original NS2 cases', settings: structuredClone(branch.settings) }];
  const before = structuredClone(root);
  assert.deepEqual(validateData(JSON.parse(JSON.stringify(root))), before);
  assert.deepEqual(root, before);
  assert.equal(freshSkewbNS2Data().settings.selectedCases.length, 134, 'new installations include all added cases');
});

test('the three added easy Skewb cases retain independent preferences, solves and saved practice', () => {
  const root = freshData();
  root.initialized = true;
  root.trainer = 'skewb-ns2';
  const branch = root.skewbns2;
  branch.settings.selectedCases = ['NS2-132', 'NS2-133', 'NS2-134'];
  branch.settings.strategy = 'learning';
  const oldCase = CASES_SKEWB_NS2.find(item => item.id === 'NS2-001');
  branch.attempts = [{ ...attempt(oldCase), id: 'existing-skewb-result' }];
  for (const id of branch.settings.selectedCases) {
    const item = CASES_SKEWB_NS2.find(item => item.id === id);
    assert(item, `${id} must be selectable`);
    const algorithm = item.algorithms.at(-1);
    branch.preferences[id] = algorithm.id;
    const drill = createSkewbDrill({ caseId: id, alg: algorithm.alg, scrambleStyle: 'disguised', random: () => .25 });
    branch.attempts.push({ ...attempt(item), id: `easy-${id}`, algorithmId: algorithm.id, algorithm: algorithm.alg,
      scrambleStyle: 'disguised', scramble: drill.scramble, solution: drill.solution });
  }
  branch.presets = [{ id: 'easy-ns2', name: 'Pure Pi and one-hammer finishes', settings: structuredClone(branch.settings) }];
  const restored = validateData(JSON.parse(JSON.stringify(root)));
  assert.deepEqual(restored, root);
  assert.deepEqual(restored.skewbns2.attempts.map(record => record.caseId), ['NS2-001', 'NS2-132', 'NS2-133', 'NS2-134']);
  assert.deepEqual(restored.skewbns2.presets[0].settings.selectedCases, ['NS2-132', 'NS2-133', 'NS2-134']);
});
