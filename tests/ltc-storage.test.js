import test from 'node:test';
import assert from 'node:assert/strict';
import { freshLTEData, validateLTEData, freshLTCData, validateLTCData } from '../app/lte-storage.js';
import { freshData, validateData } from '../app/storage.js';
import { CASES_CENTRES } from '../app/catalog-centres.js';
import { CASES5 } from '../app/catalog5.js';

const firstCase = CASES_CENTRES[0], firstAlgorithm = firstCase.algorithms[0];
const edgeCase = CASES5[0], edgeAlgorithm = edgeCase.algorithms[0];
function solve(item, algorithm, overrides = {}) {
  return {
    id: 'shared-solve-id', caseId: item.id, group: item.group, set: item.set,
    algorithmId: algorithm.id, algorithm: algorithm.alg,
    orientation: "y'", scrambleStyle: 'provided', timingMode: 'inspection', inspectionAudio: true,
    seconds: 8.43, inspectionSeconds: 6.19, recallFail: false, dnf: false,
    assisted: false, createdAt: '2026-10-04T10:00:00Z', sessionId: 'session-1',
    scramble: "Rw U2 Rw'", solution: algorithm.alg, ...overrides,
  };
}
function fixture() {
  const data = freshLTCData();
  data.settings.selectedCases = [firstCase.id];
  data.preferences[firstCase.id] = firstAlgorithm.id;
  data.attempts = [solve(firstCase, firstAlgorithm)];
  data.presets = [{ id: 'shared-practice-id', name: 'First centre case', settings: structuredClone(data.settings) }];
  return data;
}

test('centres start with every PDF case selected and fully independent data', () => {
  const data = freshLTCData(), second = freshLTCData(), edges = freshLTEData();
  assert.ok(CASES_CENTRES.length > 0);
  assert.deepEqual(data.settings.selectedCases, CASES_CENTRES.map(item => item.id));
  assert.ok(data.settings.selectedCases.every(id => id.startsWith('LTC-')));
  assert.deepEqual(validateLTCData(data), data);
  assert.deepEqual({ ...data.settings, selectedCases: [] }, { ...edges.settings, selectedCases: [] });
  data.settings.selectedCases.pop(); data.settings.orientations.push('y');
  data.attempts.push({}); data.preferences[firstCase.id] = firstAlgorithm.id;
  assert.equal(second.settings.selectedCases.length, CASES_CENTRES.length);
  assert.deepEqual(second.settings.orientations, ['']);
  assert.deepEqual(second.attempts, []);
  assert.deepEqual(second.preferences, {});
  assert.deepEqual(edges, freshLTEData());
});

test('centres settings, preferences, historical moves and presets round-trip detached', () => {
  const input = fixture();
  input.settings.scrambleStyle = 'varied';
  input.attempts[0].algorithm = 'Historical moves preserved verbatim';
  input.attempts[0].scramble = "  Rw U2' Rw'  ";
  input.attempts[0].inspectionSeconds = 90000;
  const before = structuredClone(input), output = validateLTCData(input);
  assert.deepEqual(output, input);
  output.settings.selectedCases.pop(); output.settings.orientations.push('y2');
  output.preferences[firstCase.id] = 'changed'; output.attempts[0].seconds = 50;
  output.presets[0].name = 'Changed'; output.presets[0].settings.selectedCases.pop();
  assert.deepEqual(input, before);
  input.attempts[0].inspectionSeconds = null;
  delete input.attempts[0].set;
  assert.deepEqual(validateLTCData(input), input);
});

test('centre speed window defaults for old practices and validates current and saved values', () => {
  const legacy = fixture();
  delete legacy.settings.slowWindow;
  delete legacy.presets[0].settings.slowWindow;
  const before = structuredClone(legacy), migrated = validateLTCData(legacy);
  assert.equal(migrated.settings.slowWindow, 20);
  assert.equal(migrated.presets[0].settings.slowWindow, 20);
  assert.deepEqual(migrated.attempts, legacy.attempts);
  assert.deepEqual(migrated.preferences, legacy.preferences);
  assert.deepEqual(legacy, before);
  const data = fixture();
  data.settings.slowWindow = 1000;
  data.presets[0].settings.slowWindow = 1;
  assert.deepEqual(validateLTCData(data), data);
  for (const value of [0, -1, 1.5, 1001, NaN, Infinity, '20', null, undefined, true, [], {}]) {
    for (const preset of [false, true]) {
      const input = fixture();
      (preset ? input.presets[0].settings : input.settings).slowWindow = value;
      assert.throws(() => validateLTCData(input), /recent clean solves/);
    }
  }
});

test('5×5 catalogs cannot exchange cases, preferences, algorithms, groups or sets', () => {
  const crosses = [
    [fixture, validateLTCData, edgeCase, edgeAlgorithm, CASES_CENTRES],
    [() => {
      const data = freshLTEData();
      data.attempts = [solve(edgeCase, edgeAlgorithm)];
      data.presets = [{ id: 'p', name: 'Edges', settings: structuredClone(data.settings) }];
      return data;
    }, validateLTEData, firstCase, firstAlgorithm, CASES5],
  ];
  for (const [fresh, validate, otherCase, otherAlgorithm, catalog] of crosses) {
    const mutations = [
      data => { data.settings.selectedCases = [otherCase.id]; },
      data => { data.presets[0].settings.selectedCases = [otherCase.id]; },
      data => { data.preferences[otherCase.id] = otherAlgorithm.id; },
      data => { data.preferences[catalog[0].id] = otherAlgorithm.id; },
      data => { data.attempts[0] = solve(otherCase, otherAlgorithm); },
      data => { data.attempts[0].algorithmId = otherAlgorithm.id; },
      data => { data.attempts[0].set = otherCase.set; },
      data => { data.attempts[0].group = 'group from another catalog'; },
      data => { data.attempts[0].algorithmId = catalog[1].algorithms[0].id; },
    ];
    for (const mutate of mutations) {
      const data = fresh(); mutate(data);
      assert.throws(() => validate(data), String(mutate));
    }
  }
  const input = fixture();
  for (const item of CASES_CENTRES) for (const algorithm of item.algorithms) {
    input.preferences[item.id] = algorithm.id;
    input.attempts = [solve(item, algorithm)];
    assert.deepEqual(validateLTCData(input), input);
  }
});

test('centres malformed backups fail before use, including sparse and duplicate records', () => {
  for (const input of [null, [], 1, 'text', {}, { ...fixture(), unexpected: true },
    { ...fixture(), attempts: {} }, { ...fixture(), attempts: Array(1) },
    { ...fixture(), presets: null }, { ...fixture(), presets: Array(1) },
    Object.assign(Object.create({ inherited: true }), fixture()), JSON.parse('{"__proto__":{}}')]) {
    assert.throws(() => validateLTCData(input));
  }
  const mutations = [
    data => { data.settings.selectedCases = [firstCase.id, firstCase.id]; },
    data => { data.settings.orientations = []; },
    data => { data.settings.scrambleStyle = 'unknown'; },
    data => { data.settings.record = 'true'; },
    data => { data.settings.timingMode = 'countdown'; },
    data => { data.settings.inspectionAudio = 1; },
    data => { data.preferences = []; },
    data => { data.preferences[firstCase.id] = {}; },
    data => { data.attempts[0].seconds = NaN; },
    data => { data.attempts[0].seconds = 86401; },
    data => { data.attempts[0].inspectionSeconds = Infinity; },
    data => { data.attempts[0].createdAt = 'not a date'; },
    data => { data.attempts[0].dnf = 'false'; },
    data => { delete data.attempts[0].algorithmId; },
    data => { data.attempts.push(structuredClone(data.attempts[0])); },
    data => { data.presets.push(structuredClone(data.presets[0])); },
    data => { data.presets[0].name = ''; },
  ];
  for (const mutate of mutations) {
    const data = fixture(); mutate(data);
    assert.throws(() => validateLTCData(data), String(mutate));
  }
});

test('adding centres to an old backup leaves all existing practices, preferences and history unchanged', () => {
  const input = freshData();
  input.initialized = true; input.trainer = '5x5'; delete input.ltc;
  input.settings.selectedCases = ['CLL-S1'];
  input.lte.settings.selectedCases = [edgeCase.id];
  input.lte.settings.scrambleStyle = 'varied';
  input.lte.preferences[edgeCase.id] = edgeAlgorithm.id;
  input.lte.attempts = [solve(edgeCase, edgeAlgorithm)];
  input.lte.presets = [{ id: 'p', name: 'My edge cases', settings: structuredClone(input.lte.settings) }];
  const before = structuredClone(input), output = validateData(input);
  assert.equal(output.trainer, '5x5');
  assert.deepEqual(output.ltc, freshLTCData());
  for (const key of ['settings', 'preferences', 'attempts', 'presets', 'lte']) assert.deepEqual(output[key], input[key]);
  assert.deepEqual(input, before);
  delete input.trainer; delete input.lte;
  const early = validateData(input);
  assert.equal(early.trainer, '2x2');
  assert.deepEqual(early.lte, freshLTEData());
  assert.deepEqual(early.ltc, freshLTCData());
});

test('all three trainers round-trip together, allow shared record IDs and stay independent', () => {
  const input = freshData();
  input.initialized = true; input.trainer = '5x5-centres'; input.ltc = fixture();
  input.attempts = [{ id: 'shared-solve-id', caseId: 'CLL-S1', seconds: 2.4,
    createdAt: '2026-10-04T10:00:00Z', recallFail: true, dnf: false, assisted: false,
    timingMode: 'simple', inspectionAudio: false, bottomAuf: '', initialAuf: '', finishCaseId: '' }];
  input.lte.attempts = [solve(edgeCase, edgeAlgorithm)];
  input.lte.preferences[edgeCase.id] = edgeAlgorithm.id;
  input.lte.presets = [{ id: 'shared-practice-id', name: 'Edges', settings: structuredClone(input.lte.settings) }];
  const before = structuredClone(input), output = validateData(input);
  assert.deepEqual(output, input);
  output.ltc.attempts = [];
  output.ltc.preferences = {};
  output.ltc.settings.selectedCases = [];
  assert.deepEqual(output.attempts, input.attempts);
  assert.deepEqual(output.lte, input.lte);
  assert.deepEqual(input, before);
});

test('an explicit malformed centres branch is rejected rather than silently reset', () => {
  for (const ltc of [null, [], undefined, {}, { ...freshLTCData(), extra: true }]) {
    const input = freshData(); input.ltc = ltc;
    assert.throws(() => validateData(input));
  }
});
