import test from 'node:test';
import assert from 'node:assert/strict';
import { CASES_SQ1 } from '../app/catalog-square1.js';
import { CASES5 } from '../app/catalog5.js';
import { CASES_CENTRES } from '../app/catalog-centres.js';
import { freshSQ1Data, validateSQ1Data, freshLTEData, validateLTEData, freshLTCData, validateLTCData } from '../app/lte-storage.js';
import { freshData, validateData } from '../app/storage.js';

const firstCase = CASES_SQ1[0], firstAlgorithm = firstCase.algorithms[0];
function solve(item = firstCase) {
  const algorithm = item.algorithms[0];
  return {
    id: 'shared-solve', caseId: item.id, group: item.group, set: item.set,
    algorithmId: algorithm.id, algorithm: algorithm.alg,
    orientation: '', scrambleStyle: 'varied', timingMode: 'inspection', inspectionAudio: true,
    seconds: 8.43, inspectionSeconds: 6.19, recallFail: false, dnf: false, assisted: false,
    createdAt: '2026-11-18T12:00:00.000Z', sessionId: 'session-1',
    scramble: '(1,0) / (-1,2)', solution: algorithm.alg,
  };
}
function fixture() {
  const data = freshSQ1Data();
  data.settings.selectedCases = [firstCase.id];
  data.settings.strategy = 'learning';
  data.preferences[firstCase.id] = firstAlgorithm.id;
  data.attempts = [solve()];
  data.presets = [{ id: 'shared-practice', name: 'My cube shapes', settings: structuredClone(data.settings) }];
  return data;
}

test('Square-1 defaults and saved practices round-trip with detached settings and history', () => {
  const defaults = freshSQ1Data();
  assert.deepEqual(defaults.settings.selectedCases, CASES_SQ1.map(item => item.id));
  assert.deepEqual(defaults.settings.orientations, ['']);
  assert.equal(defaults.settings.slowWindow, 20);
  assert.equal(defaults.settings.rankCount, 5);
  assert.equal(defaults.settings.insightsWindow, 20);
  assert.equal(defaults.settings.scrambleStyle, 'disguised');
  assert.equal(defaults.settings.layerAlignment, 'random');
  assert.deepEqual(validateSQ1Data(defaults), defaults);
  const input = fixture(), before = structuredClone(input), output = validateSQ1Data(input);
  assert.deepEqual(output, input);
  output.settings.selectedCases = [];
  output.preferences[firstCase.id] = 'changed';
  output.attempts[0].seconds = 99;
  output.presets[0].settings.selectedCases = [];
  assert.deepEqual(input, before);
  assert.deepEqual(freshSQ1Data(), defaults);
});

test('old backups gain Square-1 without changing the three existing trainer histories', () => {
  const input = freshData();
  input.initialized = true;
  input.trainer = '5x5-centres';
  delete input.sq1;
  input.settings.selectedCases = ['CLL-S1'];
  input.attempts = [{ id: 'shared-solve', caseId: 'CLL-S1', seconds: 2.4,
    createdAt: '2026-10-04T10:00:00Z', recallFail: true, dnf: false, assisted: false,
    timingMode: 'simple', inspectionAudio: false, bottomAuf: '', initialAuf: '', finishCaseId: '' }];
  for (const [key, item] of [['lte', CASES5[0]], ['ltc', CASES_CENTRES[0]]]) {
    input[key].settings.selectedCases = [item.id];
    input[key].preferences[item.id] = item.algorithms[0].id;
    input[key].attempts = [solve(item)];
    input[key].presets = [{ id: 'shared-practice', name: key, settings: structuredClone(input[key].settings) }];
  }
  const before = structuredClone(input), result = validateData(input);
  assert.deepEqual(result.sq1, freshSQ1Data());
  const { sq1, ...previous } = result;
  assert.deepEqual(previous, input);
  assert.deepEqual(input, before, 'loading old data does not mutate its source');
  result.trainer = 'square1';
  result.sq1 = fixture();
  const roundTrip = validateData(result);
  assert.deepEqual(roundTrip, result);
  roundTrip.sq1.attempts = [];
  assert.equal(roundTrip.attempts.length, 1);
  assert.equal(roundTrip.lte.attempts.length, 1);
  assert.equal(roundTrip.ltc.attempts.length, 1);
});

test('Square-1 catalogue membership is isolated from cube cases and algorithm choices', () => {
  const changes = [
    data => { data.settings.selectedCases = [CASES5[0].id]; },
    data => { data.presets[0].settings.selectedCases = [CASES_CENTRES[0].id]; },
    data => { data.preferences[CASES5[0].id] = CASES5[0].algorithms[0].id; },
    data => { data.preferences[firstCase.id] = CASES_SQ1[1].algorithms[0].id; },
    data => { data.attempts[0].caseId = CASES5[0].id; },
    data => { data.attempts[0].algorithmId = CASES_SQ1[1].algorithms[0].id; },
    data => { data.attempts[0].set = 'L2E'; },
    data => { data.attempts[0].group = 'unknown'; },
  ];
  for (const change of changes) {
    const data = fixture(); change(data);
    assert.throws(() => validateSQ1Data(data), String(change));
  }
  for (const [fresh, validate] of [[freshLTEData, validateLTEData], [freshLTCData, validateLTCData]]) {
    const data = fresh(); data.attempts = [solve()];
    assert.throws(() => validate(data));
  }
  const data = fixture();
  for (const item of CASES_SQ1) for (const algorithm of item.algorithms) {
    data.preferences[item.id] = algorithm.id;
    data.attempts = [{ ...solve(item), algorithmId: algorithm.id, algorithm: algorithm.alg, solution: algorithm.alg }];
    assert.deepEqual(validateSQ1Data(data), data);
  }
});

test('Square-1 options validate main and saved practices without allowing cube rotations', () => {
  for (const strategy of ['uniform', 'learning', 'slow', 'slowest', 'fastest', 'inconsistent', 'new']) {
    const data = fixture();
    data.settings.strategy = strategy;
    data.settings.slowWindow = 1000;
    data.settings.rankCount = 1;
    data.settings.insightsWindow = 1000;
    data.settings.scrambleStyle = 'varied';
    data.presets[0].settings = structuredClone(data.settings);
    assert.deepEqual(validateSQ1Data(data), data);
  }
  const changes = [
    settings => { settings.orientations = ['y']; },
    settings => { settings.orientations = ['', 'y2']; },
    settings => { settings.orientations = []; },
    settings => { settings.selectedCases = [firstCase.id, firstCase.id]; },
    settings => { settings.scrambleStyle = 'random-state'; },
    settings => { settings.timingMode = 'countdown'; },
    settings => { settings.slowWindow = 0; },
    settings => { settings.rankCount = '5'; },
    settings => { settings.insightsWindow = 1.5; },
    settings => { settings.inspectionAudio = 'true'; },
  ];
  for (const change of changes) for (const preset of [false, true]) {
    const data = fixture(); change(preset ? data.presets[0].settings : data.settings);
    assert.throws(() => validateSQ1Data(data));
  }
  const data = fixture(); data.settings.selectedCases = [];
  assert.deepEqual(validateSQ1Data(data), data);
});

test('Square-1 keeps historical notation verbatim and rejects malformed move strings', () => {
  const data = fixture();
  data.attempts[0].algorithm = '  / (3, 0) / (-1, 1)  ';
  data.attempts[0].solution = ' / 3,0 / -1,1 ';
  data.attempts[0].inspectionSeconds = 90000;
  assert.deepEqual(validateSQ1Data(data), data, 'historical algorithm text is not rewritten to the current catalogue choice');
  for (const field of ['algorithm', 'scramble', 'solution']) for (const value of ['R U R\'', '(7,0)', '(1.5,0)', '(1,0', '<script>', {}, null]) {
    const changed = fixture(); changed.attempts[0][field] = value;
    assert.throws(() => validateSQ1Data(changed), `${field}: ${value}`);
  }
  data.attempts[0].scramble = '';
  data.attempts[0].solution = '';
  data.attempts[0].inspectionSeconds = null;
  assert.deepEqual(validateSQ1Data(data), data);
});

test('malformed Square-1 branches and timing records are rejected before use', () => {
  for (const sq1 of [null, undefined, [], {}, { ...freshSQ1Data(), extra: true }]) {
    const data = freshData(); data.sq1 = sq1;
    assert.throws(() => validateData(data));
  }
  const changes = [
    data => { data.attempts = Array(1); },
    data => { data.attempts.push(structuredClone(data.attempts[0])); },
    data => { data.presets.push(structuredClone(data.presets[0])); },
    data => { data.attempts[0].orientation = 'y'; },
    data => { data.attempts[0].seconds = Infinity; },
    data => { data.attempts[0].seconds = 86401; },
    data => { data.attempts[0].inspectionSeconds = -1; },
    data => { data.attempts[0].createdAt = 'not a date'; },
    data => { data.attempts[0].dnf = 'false'; },
    data => { delete data.attempts[0].algorithmId; },
  ];
  for (const change of changes) {
    const data = fixture(); change(data);
    assert.throws(() => validateSQ1Data(data), String(change));
  }
});

test('older Square-1 settings gain random alignment while all recorded conditions stay unchanged', () => {
  for (const style of ['provided', 'varied']) {
    const input = fixture();
    input.settings.scrambleStyle = style;
    delete input.settings.layerAlignment;
    input.presets[0].settings = structuredClone(input.settings);
    input.attempts[0].scrambleStyle = style;
    const before = structuredClone(input);
    const loaded = validateSQ1Data(input);
    assert.equal(loaded.settings.scrambleStyle, style, 'an explicitly saved setup choice is preserved');
    assert.equal(loaded.settings.layerAlignment, 'random');
    assert.equal(loaded.presets[0].settings.layerAlignment, 'random');
    assert.equal(loaded.presets[0].settings.scrambleStyle, style);
    assert.deepEqual(loaded.attempts, input.attempts);
    for (const field of ['layerAlignment', 'initialTop', 'initialBottom']) assert.equal(Object.hasOwn(loaded.attempts[0], field), false);
    assert.deepEqual(input, before, 'loading never mutates the older backup');
  }
});

test('Square-1 setup and alignment choices round-trip independently in settings and recorded results', () => {
  for (const style of ['provided', 'varied', 'disguised']) for (const alignment of ['random', 'reference']) {
    const input = fixture();
    input.settings.scrambleStyle = style;
    input.settings.layerAlignment = alignment;
    input.presets[0].settings = structuredClone(input.settings);
    Object.assign(input.attempts[0], { scrambleStyle: style, layerAlignment: alignment, initialTop: alignment === 'reference' ? 0 : -5, initialBottom: alignment === 'reference' ? 0 : 6 });
    assert.deepEqual(validateSQ1Data(input), input);
  }
  for (const value of ['fixed', '', true, null, 1]) for (const location of ['settings', 'preset', 'attempt']) {
    const input = fixture();
    (location === 'settings' ? input.settings : location === 'preset' ? input.presets[0].settings : input.attempts[0]).layerAlignment = value;
    assert.throws(() => validateSQ1Data(input), `${location} alignment ${value}`);
  }
  for (const field of ['initialTop', 'initialBottom']) for (const value of [-6, 7, 0.5, '1', null, NaN, Infinity]) {
    const input = fixture(); input.attempts[0][field] = value;
    assert.throws(() => validateSQ1Data(input), `${field} ${value}`);
  }
});

test('Square-1-only scramble styles and alignment fields do not change the 5×5 data format', () => {
  for (const [fresh, validate, item] of [[freshLTEData, validateLTEData, CASES5[0]], [freshLTCData, validateLTCData, CASES_CENTRES[0]]]) {
    const baseline = fresh();
    assert.equal(baseline.settings.scrambleStyle, 'provided');
    assert.equal(Object.hasOwn(baseline.settings, 'layerAlignment'), false);
    assert.deepEqual(validate(baseline), baseline);
    for (const field of ['layerAlignment', 'initialTop', 'initialBottom']) {
      const input = fresh(); input.attempts = [solve(item)];
      input.attempts[0][field] = field === 'layerAlignment' ? 'random' : 1;
      assert.throws(() => validate(input));
    }
    for (const location of ['settings', 'preset', 'attempt']) {
      const input = fresh(); input.attempts = [solve(item)];
      input.presets = [{ id: 'practice', name: '5×5 practice', settings: structuredClone(input.settings) }];
      (location === 'settings' ? input.settings : location === 'preset' ? input.presets[0].settings : input.attempts[0]).scrambleStyle = 'disguised';
      assert.throws(() => validate(input));
    }
    const input = fresh(); input.settings.layerAlignment = 'random';
    assert.throws(() => validate(input));
  }
});
