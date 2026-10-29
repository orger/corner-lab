import test from 'node:test';
import assert from 'node:assert/strict';
import { freshLTEData, validateLTEData } from '../app/lte-storage.js';
import { freshData, validateData } from '../app/storage.js';
import { CASES5 } from '../app/catalog5.js';
import { CASES } from '../app/catalog.js';

const firstCase = CASES5[0], firstAlgorithm = firstCase.algorithms[0];
function fixture() {
  const data = freshLTEData();
  data.settings.selectedCases = [firstCase.id];
  data.preferences[firstCase.id] = firstAlgorithm.id;
  data.attempts = [{
    id: 'solve-1', caseId: firstCase.id, group: firstCase.group, set: 'L2E',
    algorithmId: firstAlgorithm.id, algorithm: firstAlgorithm.alg,
    orientation: "y'", scrambleStyle: 'provided', timingMode: 'inspection', inspectionAudio: true,
    seconds: 8.43, inspectionSeconds: 6.19, recallFail: false, dnf: false,
    assisted: false, createdAt: '2026-09-27T10:00:00Z', sessionId: 'session-1',
    scramble: "r U2 r'", solution: firstAlgorithm.alg,
  }];
  data.presets = [{ id: 'practice-1', name: 'First LTE case', settings: structuredClone(data.settings) }];
  return data;
}

test('LTE defaults select every case and are independent of other fresh data', () => {
  const data = freshLTEData(), second = freshLTEData();
  assert.deepEqual(data.settings, {
    selectedCases: CASES5.map(item => item.id), orientations: [''],
    strategy: 'uniform', slowWindow: 20, scrambleStyle: 'provided', record: true, showPreview: true,
    timingMode: 'simple', inspectionAudio: false,
  });
  assert.deepEqual(validateLTEData(data), data);
  data.settings.selectedCases.pop(); data.settings.orientations.push('y');
  data.attempts.push({});
  assert.equal(second.settings.selectedCases.length, CASES5.length);
  assert.deepEqual(second.settings.orientations, ['']);
  assert.deepEqual(second.attempts, []);
});

test('LTE backup round-trips while detaching every mutable selection and history structure', () => {
  const input = fixture(), before = structuredClone(input), output = validateLTEData(input);
  assert.deepEqual(output, input);
  output.settings.selectedCases.push(CASES5[1].id);
  output.settings.orientations.push('y2');
  output.preferences[firstCase.id] = firstCase.algorithms[1].id;
  output.attempts[0].seconds = 50;
  output.presets[0].name = 'Changed';
  output.presets[0].settings.selectedCases.pop();
  assert.deepEqual(input, before);
});

test('edge speed window supports old backups and validates saved-practice values without coercion', () => {
  const legacy = fixture();
  delete legacy.settings.slowWindow;
  delete legacy.presets[0].settings.slowWindow;
  const before = structuredClone(legacy), migrated = validateLTEData(legacy);
  assert.equal(migrated.settings.slowWindow, 20);
  assert.equal(migrated.presets[0].settings.slowWindow, 20);
  assert.deepEqual(migrated.attempts, legacy.attempts);
  assert.deepEqual(migrated.preferences, legacy.preferences);
  assert.deepEqual(legacy, before);
  for (const count of [1, 20, 1000]) {
    const data = fixture();
    data.settings.slowWindow = count;
    data.presets[0].settings.slowWindow = 1001 - count;
    assert.deepEqual(validateLTEData(data), data);
  }
  for (const value of [0, -1, 1.5, 1001, NaN, Infinity, '20', null, undefined, true, [], {}]) {
    for (const preset of [false, true]) {
      const data = fixture();
      (preset ? data.presets[0].settings : data.settings).slowWindow = value;
      assert.throws(() => validateLTEData(data), /recent clean solves/);
    }
  }
});

test('LTE practice and preset selections reject unknown cases, orientations and malformed flags', () => {
  const changes = [
    s => { s.selectedCases = ['CLL-S1']; }, s => { s.selectedCases = ['LTE-99']; },
    s => { s.selectedCases = [firstCase.id, firstCase.id]; }, s => { s.selectedCases = 'LTE-01'; },
    s => { s.selectedCases = Array(1); }, s => { s.orientations = []; },
    s => { s.orientations = ['x']; }, s => { s.orientations = ['U']; },
    s => { s.orientations = ['', '']; }, s => { s.orientations = [null]; },
    s => { s.strategy = 'fast'; }, s => { s.record = 1; },
    s => { s.scrambleStyle = 'random-state'; }, s => { s.scrambleStyle = null; },
    s => { s.showPreview = 'true'; }, s => { s.timingMode = 'countdown'; },
    s => { s.inspectionAudio = 'false'; }, s => { s.extra = true; },
    s => { delete s.record; }, s => { delete s.selectedCases; },
  ];
  for (const change of changes) for (const preset of [false, true]) {
    const data = fixture();
    change(preset ? data.presets[0].settings : data.settings);
    assert.throws(() => validateLTEData(data), `${preset ? 'preset' : 'main'}: ${change}`);
  }
  const empty = fixture(); empty.settings.selectedCases = [];
  empty.settings.orientations = ['', 'y', 'y2', "y'"];
  assert.deepEqual(validateLTEData(empty), empty);
});

test('LTE algorithm preferences must choose a supplied algorithm belonging to that case', () => {
  for (const preferences of [
    [], null, 'text', { unknown: firstAlgorithm.id }, { [firstCase.id]: 'missing' },
    { [firstCase.id]: CASES5[1].algorithms[0].id }, { [firstCase.id]: {} },
    { [firstCase.id]: { selected: firstAlgorithm.id } },
    JSON.parse('{"__proto__":"LTE-01-a1"}'), JSON.parse('{"constructor":"LTE-01-a1"}'),
  ]) {
    const data = fixture(); data.preferences = preferences;
    assert.throws(() => validateLTEData(data));
  }
  const data = fixture();
  for (const item of CASES5) for (const algorithm of item.algorithms) {
    data.preferences[item.id] = algorithm.id;
    assert.equal(validateLTEData(data).preferences[item.id], algorithm.id);
  }
});

test('LTE solves validate required metadata, finite timing and exact case/algorithm membership', () => {
  const fields = {
    id: '', caseId: 'CLL-S1', group: 'unknown', set: 'CLL',
    algorithmId: CASES5[1].algorithms[0].id, algorithm: {}, orientation: 'x', scrambleStyle: 'unknown',
    timingMode: 'countdown', inspectionAudio: 'false', seconds: '4',
    inspectionSeconds: -1, recallFail: 0, dnf: 'false', assisted: null,
    createdAt: 'yesterday', sessionId: '', scramble: [], solution: false,
  };
  for (const [field, value] of Object.entries(fields)) {
    const data = fixture(); data.attempts[0][field] = value;
    assert.throws(() => validateLTEData(data), field);
  }
  for (const field of Object.keys(fixture().attempts[0]).filter(key => !['set', 'scrambleStyle'].includes(key))) {
    const data = fixture(); delete data.attempts[0][field];
    assert.throws(() => validateLTEData(data), `missing ${field}`);
  }
  for (const field of ['seconds', 'inspectionSeconds']) for (const value of [NaN, Infinity, -1, '3', ...(field === 'seconds' ? [86401] : [])]) {
    const data = fixture(); data.attempts[0][field] = value;
    assert.throws(() => validateLTEData(data), `${field} = ${value}`);
  }
  const extra = fixture(); extra.attempts[0].bottomAuf = '';
  assert.throws(() => validateLTEData(extra));
  const duplicate = fixture(); duplicate.attempts.push(structuredClone(duplicate.attempts[0]));
  assert.throws(() => validateLTEData(duplicate), /Duplicate 5×5 solve ID/);
});

test('LTE solves preserve historic move text and accept untimed inspection with optional set', () => {
  const data = fixture();
  const attempt = data.attempts[0];
  attempt.algorithm = "(r U2' r')  F2";
  attempt.scramble = "  r U2' r'  ";
  attempt.solution = 'Historic move text';
  attempt.inspectionSeconds = null;
  delete attempt.set;
  assert.deepEqual(validateLTEData(data), data);
  attempt.seconds = 0; attempt.inspectionSeconds = 0;
  assert.deepEqual(validateLTEData(data), data);
  attempt.seconds = 2; attempt.inspectionSeconds = 90000;
  assert.deepEqual(validateLTEData(data), data, 'overnight inspection must not prevent reloading a short solve');
});

test('scramble style round-trips and defaults to provided for interim LTE settings and attempts', () => {
  const data = fixture();
  data.settings.scrambleStyle = 'varied';
  data.presets[0].settings.scrambleStyle = 'varied';
  data.attempts[0].scrambleStyle = 'varied';
  assert.deepEqual(validateLTEData(data), data);
  delete data.settings.scrambleStyle;
  delete data.presets[0].settings.scrambleStyle;
  delete data.attempts[0].scrambleStyle;
  const migrated = validateLTEData(data);
  assert.equal(migrated.settings.scrambleStyle, 'provided');
  assert.equal(migrated.presets[0].settings.scrambleStyle, 'provided');
  assert.equal(migrated.attempts[0].scrambleStyle, 'provided');
  assert.equal(Object.hasOwn(data.attempts[0], 'scrambleStyle'), false);
});

test('LTE presets require valid names and unique IDs, with strict top-level structures', () => {
  for (const value of [null, [], 3, {}, { id: '', name: 'Name', settings: freshLTEData().settings },
    { id: 'p', name: ' ', settings: freshLTEData().settings },
    { id: 'p', name: 'x'.repeat(81), settings: freshLTEData().settings },
    { id: 'p', name: 'Name', settings: {} }]) {
    const data = fixture(); data.presets = [value];
    assert.throws(() => validateLTEData(data));
  }
  const duplicate = fixture(); duplicate.presets.push(structuredClone(duplicate.presets[0]));
  assert.throws(() => validateLTEData(duplicate), /Duplicate 5×5 saved-practice ID/);
  for (const value of [null, [], 1, 'text', {}, { ...fixture(), extra: true },
    { ...fixture(), attempts: {} }, { ...fixture(), presets: null },
    { ...fixture(), attempts: Array(1) }, { ...fixture(), presets: Array(1) },
    Object.assign(Object.create({ inherited: true }), fixture()),
    JSON.parse('{"__proto__":{}}')]) assert.throws(() => validateLTEData(value));
});

test('old 2×2 backups gain an independent LTE branch and default initial AUF while preserving saved content', () => {
  const input = freshData();
  input.initialized = true;
  delete input.trainer; delete input.lte;
  const item = CASES.find(item => item.id === 'CLL-S1');
  input.settings.selectedCases = [item.id];
  input.preferences[item.id] = { selected: item.algorithms[0].id, custom: [] };
  input.attempts = [{ id: 'old-2x2', caseId: item.id, seconds: 3.17, createdAt: '2026-09-10T12:00:00Z',
    recallFail: false, dnf: false, assisted: false, timingMode: 'simple', inspectionAudio: false,
    bottomAuf: '', finishCaseId: '' }];
  input.presets = [{ id: 'old-practice', name: 'Old CLL selection', settings: structuredClone(input.settings) }];
  const before = structuredClone(input), result = validateData(input);
  assert.equal(result.trainer, '2x2');
  assert.deepEqual(result.lte, freshLTEData());
  for (const key of ['settings', 'preferences', 'presets']) assert.deepEqual(result[key], input[key]);
  assert.deepEqual(result.attempts, input.attempts.map(attempt => ({ ...attempt, initialAuf: '' })));
  assert.equal(Object.hasOwn(input.attempts[0], 'initialAuf'), false, 'legacy input remains untouched');
  assert.deepEqual(input, before);
  result.lte.settings.orientations.push('y');
  assert.deepEqual(result.settings.orientations, ['']);
});

test('combined backups round-trip both trainers with separate IDs, selections and histories', () => {
  const data = freshData();
  data.initialized = true; data.trainer = '5x5'; data.lte = fixture();
  data.attempts = [{ id: data.lte.attempts[0].id, caseId: 'CLL-S1', seconds: 2.4,
    createdAt: '2026-09-10T12:00:00Z', recallFail: true, dnf: false, assisted: false,
    timingMode: 'simple', inspectionAudio: false, bottomAuf: '', initialAuf: '', finishCaseId: '' }];
  const output = validateData(data);
  assert.deepEqual(output, data);
  output.lte.attempts[0].seconds = 99;
  assert.equal(data.lte.attempts[0].seconds, 8.43);
  assert.equal(output.attempts[0].seconds, 2.4);
  delete data.trainer;
  assert.equal(validateData(data).trainer, '2x2');
  assert.deepEqual(validateData(data).lte, data.lte);
});

test('combined backups reject invalid trainer or explicit malformed LTE data', () => {
  for (const trainer of ['3x3', null, 5, {}, '']) {
    const input = freshData(); input.trainer = trainer;
    assert.throws(() => validateData(input));
  }
  for (const lte of [null, [], undefined, {}, { ...freshLTEData(), extra: true }]) {
    const input = freshData(); input.lte = lte;
    assert.throws(() => validateData(input));
  }
});
