import test from 'node:test';
import assert from 'node:assert/strict';
import { freshData, validateData, loadData, saveData, download } from '../app/storage.js';
import { CASES } from '../app/catalog.js';
import { FIRST_FACE_CASES, DEFAULT_FIRST_FACE_CASE_IDS } from '../app/first-face-cases.js';
import { applyAlg, inverse, solvedState, finishOptions } from '../app/cube.js';

const sune = CASES.find(item => item.id === 'CLL-S1');
const fixture = () => {
  const data = freshData();
  data.initialized = true;
  data.settings.selectedCases = ['CLL-S1'];
  data.preferences = { 'CLL-S1': { selected: 'personal-sune', custom: [{ id: 'personal-sune', alg: sune.algorithms[0].alg, source: 'Personal algorithm' }] } };
  data.attempts = [{ id: 'solve-1', caseId: 'CLL-S1', set: 'CLL', group: 'Sune', algorithmId: 'personal-sune', algorithm: sune.algorithms[0].alg, mode: 'last-layer', timingMode: 'simple', inspectionAudio: false, initialAuf: '', preAuf: '', postAuf: 'U2', bottomAuf: '', orientation: 'y', color: 'orange', finish: '', finishCaseId: '', seconds: 3.12, recallFail: false, dnf: false, assisted: false, createdAt: '2026-09-10T12:00:00.000Z', sessionId: 'session-1', inspectionSeconds: null, scramble: "R U R'", solution: "R U' R'" }];
  data.presets = [{ id: 'practice-1', name: 'Sune with AUF', settings: structuredClone(data.settings) }];
  return data;
};

test('current backups round-trip without changing content or retaining mutable references', () => {
  const input = fixture();
  const output = validateData(input);
  assert.deepEqual(output, input);
  output.settings.selectedCases.push('EG1-S1');
  output.preferences['CLL-S1'].custom[0].alg = 'R';
  output.attempts[0].seconds = 99;
  output.presets[0].settings.colors.push('blue');
  assert.equal(input.settings.selectedCases.length, 1);
  assert.equal(input.preferences['CLL-S1'].custom[0].alg, sune.algorithms[0].alg);
  assert.equal(input.attempts[0].seconds, 3.12);
  assert.deepEqual(input.presets[0].settings.colors, ['white']);
});

test('Learning mode round-trips for every trainer and saved practice without changing history', () => {
  const input = fixture();
  input.lte.presets = [{ id: 'edges', name: 'Learning edges', settings: structuredClone(input.lte.settings) }];
  input.ltc.presets = [{ id: 'centres', name: 'Learning centres', settings: structuredClone(input.ltc.settings) }];
  for (const branch of [input, input.lte, input.ltc]) {
    branch.settings.strategy = 'learning';
    branch.presets[0].settings.strategy = 'learning';
  }
  const before = structuredClone(input);
  const output = validateData(input);
  assert.deepEqual(output, before);
  for (const branch of [output, output.lte, output.ltc]) {
    assert.equal(branch.settings.strategy, 'learning');
    assert.equal(branch.presets[0].settings.strategy, 'learning');
    branch.settings.strategy = 'uniform';
  }
  assert.deepEqual(input, before, 'validation and edits do not mutate backup history or settings');
  assert.equal(freshData().settings.strategy, 'uniform', 'Balanced remains the default');
});

test('Learning strategy support does not allow unknown strategies in any trainer or preset', () => {
  for (const branchName of ['2x2', 'lte', 'ltc']) for (const preset of [false, true]) {
    const input = fixture();
    const branch = branchName === '2x2' ? input : input[branchName];
    if (!branch.presets.length) branch.presets = [{ id: 'practice', name: 'Practice', settings: structuredClone(branch.settings) }];
    (preset ? branch.presets[0].settings : branch.settings).strategy = 'learning-unknown';
    assert.throws(() => validateData(input), /strategy/, `${branchName} ${preset ? 'preset' : 'settings'}`);
  }
});

test('recent-speed window persists independently for all trainers and saved practices', () => {
  const input = fixture();
  assert.equal(input.settings.slowWindow, 20);
  assert.equal(input.lte.settings.slowWindow, 20);
  assert.equal(input.ltc.settings.slowWindow, 20);
  input.settings.slowWindow = 1;
  input.presets[0].settings.slowWindow = 1000;
  input.lte.settings.slowWindow = 10;
  input.ltc.settings.slowWindow = 50;
  input.lte.presets = [{ id: 'edges', name: 'Edges', settings: { ...input.lte.settings, slowWindow: 15 } }];
  input.ltc.presets = [{ id: 'centres', name: 'Centres', settings: { ...input.ltc.settings, slowWindow: 30 } }];
  const output = validateData(input);
  assert.deepEqual(output, input);
  output.settings.slowWindow = 5;
  assert.equal(input.settings.slowWindow, 1);
  assert.equal(output.presets[0].settings.slowWindow, 1000);
  assert.equal(output.lte.settings.slowWindow, 10);
  assert.equal(output.ltc.settings.slowWindow, 50);
  assert.equal(freshData().settings.slowWindow, 20);
});

test('legacy recent-speed settings gain defaults without altering original content or histories', () => {
  const input = fixture();
  input.lte.presets = [{ id: 'edges', name: 'Edges', settings: structuredClone(input.lte.settings) }];
  input.ltc.presets = [{ id: 'centres', name: 'Centres', settings: structuredClone(input.ltc.settings) }];
  const branches = data => [data, data.lte, data.ltc];
  for (const branch of branches(input)) {
    delete branch.settings.slowWindow;
    for (const preset of branch.presets) delete preset.settings.slowWindow;
  }
  const before = structuredClone(input), output = validateData(input);
  for (const [index, branch] of branches(output).entries()) {
    const previous = branches(before)[index];
    assert.deepEqual(branch.settings, { ...previous.settings, slowWindow: 20 });
    assert.deepEqual(branch.presets, previous.presets.map(p => ({ ...p, settings: { ...p.settings, slowWindow: 20 } })));
    assert.deepEqual(branch.attempts, previous.attempts);
    assert.deepEqual(branch.preferences, previous.preferences);
  }
  assert.equal(output.version, 1);
  assert.deepEqual(input, before);
});

test('2×2 speed window rejects invalid types and out-of-range counts in settings and presets', () => {
  for (const slowWindow of [0, -1, 1.5, 1001, NaN, Infinity, '20', '', null, undefined, true, [], {}]) {
    for (const preset of [false, true]) {
      const input = fixture();
      (preset ? input.presets[0].settings : input.settings).slowWindow = slowWindow;
      assert.throws(() => validateData(input), /recent clean solves/, `${preset ? 'preset' : 'practice'}: ${String(slowWindow)}`);
    }
  }
});

test('fresh and early version-1 records remain valid with safe defaults', () => {
  const input = freshData();
  input.attempts = [{ id: 'old-1', caseId: 'CLL-S1', seconds: 4, createdAt: '2026-09-10T12:00:00Z' }];
  delete input.settings.record;
  delete input.settings.showPreview;
  const output = validateData(input);
  assert.equal(output.initialized, true, 'loading existing data must not reset its saved selections');
  assert.equal(output.settings.record, true);
  assert.equal(output.settings.showPreview, false);
  assert.equal(output.attempts[0].assisted, false);
  assert.equal(output.attempts[0].recallFail, false);
  assert.equal(output.attempts[0].dnf, false);
  assert.equal(output.attempts[0].mode, undefined);
  assert.equal(output.attempts[0].initialAuf, '');
  assert.equal(Object.hasOwn(input, 'initialized'), false);
  assert.doesNotThrow(() => validateData(freshData()));
});

test('main and preset settings validate nonempty conditions and bounded choices', () => {
  const mutations = [
    s => { s.selectedCases = ['missing']; }, s => { s.selectedCases = ['CLL-S1', 'CLL-S1']; },
    s => { s.preAuf = []; }, s => { s.postAuf = ['R']; }, s => { s.orientations = ['x']; },
    s => { s.bottomAuf = []; }, s => { s.bottomAuf = ['U']; }, s => { s.bottomAuf = ['', '']; }, s => { s.bottomAuf = null; },
    s => { s.colors = ['white', 'white']; }, s => { s.colors = 'white'; }, s => { s.colors = ['purple']; },
    s => { s.finishIds = ['R R']; }, s => { s.finishIds = ['R U F L']; }, s => { s.finishIds = [null]; },
    s => { s.finishIds = ['FF-unknown']; }, s => { s.finishIds = ['FF-LS-Uminus3', 'FF-LS-Uminus3']; },
    s => { s.mode = 'invalid'; }, s => { s.strategy = 'fast'; },
    s => { s.timingMode = 'countdown'; }, s => { s.timingMode = null; }, s => { s.inspectionAudio = 'false'; },
    s => { s.record = 'false'; }, s => { s.showPreview = 0; }, s => { s.extra = true; },
    s => { delete s.selectedCases; }, s => { s.selectedCases = { length: 1 }; },
  ];
  for (const mutate of mutations) for (const preset of [false, true]) {
    const input = fixture(); mutate(preset ? input.presets[0].settings : input.settings);
    assert.throws(() => validateData(input), `${preset ? 'preset' : 'main'}: ${mutate}`);
  }
  const intentionallyEmpty = fixture();
  intentionallyEmpty.settings.selectedCases = []; intentionallyEmpty.settings.finishIds = [];
  assert.doesNotThrow(() => validateData(intentionallyEmpty));
});

test('preset shapes, names, IDs and settings cannot crash saved-practice rendering', () => {
  const invalid = [null, [], {}, { id: 'p', name: 'a', settings: null }, { id: 'p', name: 'a', settings: {} },
    { id: '', name: 'a', settings: freshData().settings }, { id: 'p', name: '', settings: freshData().settings },
    { id: 'p', name: 'x'.repeat(81), settings: freshData().settings }, { id: 'p', name: {}, settings: freshData().settings }];
  for (const value of invalid) { const input = fixture(); input.presets = [value]; assert.throws(() => validateData(input)); }
  const duplicate = fixture(); duplicate.presets.push(structuredClone(duplicate.presets[0]));
  assert.throws(() => validateData(duplicate), /Duplicate saved-practice ID/);
});

test('preferences require objects, unique custom IDs and a preferred choice belonging to the case', () => {
  const mutations = [
    d => { d.preferences = []; }, d => { d.preferences = 'x'; },
    d => { d.preferences['CLL-S1'] = []; }, d => { d.preferences['CLL-S1'] = 1; },
    d => { d.preferences['unknown'] = {}; }, d => { d.preferences['CLL-S1'].custom = 0; },
    d => { d.preferences['CLL-S1'].custom = [null]; }, d => { d.preferences['CLL-S1'].custom[0].alg = {}; },
    d => { d.preferences['CLL-S1'].custom[0].alg = 'R'; },
    d => { d.preferences['CLL-S1'].selected = {}; }, d => { d.preferences['CLL-S1'].selected = 'missing'; },
    d => { d.preferences['CLL-S1'].selected = CASES.find(c => c.id === 'CLL-S2').algorithms[0].id; },
    d => { d.preferences['CLL-S1'].custom[0].source = []; }, d => { d.preferences['CLL-S1'].custom[0].url = 'javascript:alert(1)'; },
    d => { d.preferences['CLL-S1'].custom.push(structuredClone(d.preferences['CLL-S1'].custom[0])); },
    d => { d.preferences['CLL-S1'].custom[0].id = sune.algorithms[0].id; },
    d => { d.preferences['CLL-S2'] = { custom: [{ id: 'personal-sune', alg: 'R' }] }; },
  ];
  for (const mutate of mutations) { const input = fixture(); mutate(input); assert.throws(() => validateData(input), String(mutate)); }
  const chosen = fixture(); chosen.preferences['CLL-S1'] = { selected: sune.algorithms[0].id };
  assert.equal(validateData(chosen).preferences['CLL-S1'].selected, sune.algorithms[0].id);
  chosen.preferences['CLL-S1'] = {};
  assert.deepEqual(validateData(chosen).preferences['CLL-S1'].custom, []);
  const rotated = fixture(); rotated.preferences['CLL-S1'].custom[0].alg += ' x';
  const normalized = validateData(rotated).preferences['CLL-S1'].custom[0].alg;
  assert.deepEqual(applyAlg(solvedState(), inverse(normalized)), applyAlg(solvedState(), inverse(sune.algorithms[0].alg)), 'valid rotated choices preserve the exact canonical case');
});

test('optional history fields, condition enums, flags and IDs are checked without coercion', () => {
  const badFields = { id: '', caseId: 'missing', seconds: -1, createdAt: 'not a date', algorithmId: [], algorithm: {}, mode: 'x', timingMode: 'countdown', inspectionAudio: 'true', preAuf: 'F', postAuf: null, bottomAuf: 'U', orientation: 'x', color: 'purple', finish: 1, finishCaseId: 'FF-unknown', recallFail: 'false', dnf: 0, assisted: null, sessionId: false, inspectionSeconds: -1, scramble: [], solution: false, set: 'EG2', group: 'Pi' };
  for (const [field, value] of Object.entries(badFields)) { const input = fixture(); input.attempts[0][field] = value; assert.throws(() => validateData(input), field); }
  for (const seconds of [NaN, Infinity, '3', 86401]) { const input = fixture(); input.attempts[0].seconds = seconds; assert.throws(() => validateData(input)); }
  const duplicate = fixture(); duplicate.attempts.push(structuredClone(duplicate.attempts[0]));
  assert.throws(() => validateData(duplicate), /Duplicate solve ID/);
  const historical = fixture(); historical.attempts[0].algorithmId = 'retired-algorithm-version'; historical.attempts[0].inspectionSeconds = 12.3;
  assert.doesNotThrow(() => validateData(historical));
});

test('bad top-level structures and prototype-shaped keys are rejected', () => {
  for (const value of [null, [], 1, 'text', {}, { ...freshData(), version: 2 }, { ...freshData(), initialized: 'true' }]) assert.throws(() => validateData(value));
  const malicious = fixture(); malicious.preferences = JSON.parse('{"__proto__":{}}');
  assert.throws(() => validateData(malicious));
  const sparse = fixture(); sparse.attempts = Array(1);
  assert.throws(() => validateData(sparse));
});

test('native first run never falls through to browser localStorage', async () => {
  const previousWindow = globalThis.window, previousStorage = globalThis.localStorage;
  globalThis.window = { cornerlabNative: { load: async () => null } };
  globalThis.localStorage = { getItem() { throw new Error('Browser storage must not be read'); } };
  try { assert.deepEqual(await loadData(), freshData()); }
  finally {
    if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow;
    if (previousStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = previousStorage;
  }
});

function browserStorage(t, { initial, legacy, openError, failWrites = 0 } = {}) {
  const names = ['window', 'localStorage', 'indexedDB'];
  const previous = new Map(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  t.after(() => {
    for (const [name, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  });
  const rows = new Map(initial === undefined ? [] : [['data', structuredClone(initial)]]);
  const legacyRows = new Map(legacy === undefined ? [] : [['corner-lab-v1', legacy]]);
  const writes = [], reads = [];
  let created = false, closes = 0;
  globalThis.window = {};
  globalThis.localStorage = {
    getItem(key) { reads.push(key); return legacyRows.get(key) ?? null; },
    setItem(key, value) { legacyRows.set(key, value); },
    removeItem(key) { legacyRows.delete(key); },
  };
  globalThis.indexedDB = {
    open(name, version) {
      assert.equal(name, 'corner-lab'); assert.equal(version, 1);
      const opening = {};
      queueMicrotask(() => {
        if (openError) { opening.error = openError; opening.onerror(); return; }
        const database = {
          objectStoreNames: { contains: () => created },
          createObjectStore(name) { assert.equal(name, 'state'); created = true; },
          close() { closes += 1; },
          transaction(name, mode) {
            assert.equal(name, 'state');
            const transaction = {
              objectStore() {
                return {
                  get(key) {
                    assert.equal(mode, 'readonly');
                    const request = {};
                    queueMicrotask(() => {
                      request.result = structuredClone(rows.get(key));
                      request.onsuccess?.();
                      queueMicrotask(() => transaction.oncomplete());
                    });
                    return request;
                  },
                  put(value, key) {
                    assert.equal(mode, 'readwrite');
                    const copy = structuredClone(value), request = {};
                    queueMicrotask(() => {
                      if (failWrites > 0) {
                        failWrites -= 1;
                        request.error = transaction.error = new Error('Storage quota exceeded');
                        transaction.onerror({ target: request });
                        transaction.onabort();
                        return;
                      }
                      request.result = key;
                      request.onsuccess?.();
                      queueMicrotask(() => {
                        rows.set(key, copy); writes.push(copy);
                        transaction.oncomplete();
                      });
                    });
                    return request;
                  },
                };
              },
            };
            return transaction;
          },
        };
        opening.result = database;
        if (!created) opening.onupgradeneeded();
        opening.onsuccess();
      });
      return opening;
    },
  };
  return { rows, legacyRows, writes, reads, get closes() { return closes; } };
}

test('browser migration commits existing history to IndexedDB before removing legacy data', async t => {
  const input = fixture(), storage = browserStorage(t, { legacy: JSON.stringify(input) });
  assert.deepEqual(await loadData(), input);
  assert.deepEqual(storage.rows.get('data'), input);
  assert.equal(storage.legacyRows.has('corner-lab-v1'), false);
  assert.equal(storage.writes.length, 1);
  assert.equal(storage.closes, 2);
  assert.deepEqual(await loadData(), input);
  assert.equal(storage.writes.length, 1, 'already migrated data is not rewritten on load');
});

test('failed migration leaves the legacy history intact and reports the failure', async t => {
  const legacy = JSON.stringify(fixture()), storage = browserStorage(t, { legacy, failWrites: 1 });
  await assert.rejects(loadData(), /quota/);
  assert.equal(storage.legacyRows.get('corner-lab-v1'), legacy);
  assert.equal(storage.rows.has('data'), false);
  assert.deepEqual(await loadData(), fixture(), 'a later successful retry can migrate it');
});

test('IndexedDB is authoritative and corruption never reloads a stale legacy copy', async t => {
  const input = fixture(), storage = browserStorage(t, { initial: input, legacy: JSON.stringify(freshData()) });
  assert.deepEqual(await loadData(), input);
  assert.deepEqual(storage.reads, [], 'existing database does not consult localStorage');
  storage.rows.set('data', { ...input, version: 99 });
  await assert.rejects(loadData(), /version 1 backup/);
  storage.rows.set('data', null);
  await assert.rejects(loadData(), /expected an object/);
  assert.deepEqual(storage.reads, [], 'corruption remains visible instead of silently losing history');
});

test('database open errors are surfaced without reading or writing stale localStorage', async t => {
  const storage = browserStorage(t, { legacy: JSON.stringify(fixture()), openError: new Error('Database access denied') });
  await assert.rejects(loadData(), /access denied/);
  await assert.rejects(saveData(fixture()), /access denied/);
  assert.deepEqual(storage.reads, []);
  assert.equal(storage.legacyRows.get('corner-lab-v1'), JSON.stringify(fixture()));
});

test('browser writes commit in order using snapshots and recover after a failed write', async t => {
  const storage = browserStorage(t, { failWrites: 1 }), input = fixture();
  await assert.rejects(saveData(input), /quota/);
  input.attempts[0].seconds = 4;
  const first = saveData(input);
  input.attempts[0].seconds = 5;
  const second = saveData(input);
  input.attempts[0].seconds = 6;
  await Promise.all([first, second]);
  assert.deepEqual(storage.writes.map(data => data.attempts[0].seconds), [4, 5]);
  assert.equal(storage.rows.get('data').attempts[0].seconds, 5);
  assert.equal(storage.legacyRows.size, 0);
});

test('browsers without IndexedDB retain the localStorage fallback', async t => {
  const input = fixture(), storage = browserStorage(t, { legacy: JSON.stringify(input) });
  delete globalThis.indexedDB;
  assert.deepEqual(await loadData(), input);
  input.attempts[0].seconds = 7;
  await saveData(input);
  assert.equal(JSON.parse(storage.legacyRows.get('corner-lab-v1')).attempts[0].seconds, 7);
  assert.equal(storage.writes.length, 0);
});

test('native saves continue using their bridge even when browser database access would fail', async t => {
  const storage = browserStorage(t, { openError: new Error('Must not open browser database') });
  const saved = [];
  globalThis.window.cornerlabNative = { save: async value => { saved.push(value); } };
  const input = fixture();
  const result = saveData(input);
  input.attempts[0].seconds = 9;
  await result;
  assert.equal(saved[0].attempts[0].seconds, 3.12);
  assert.deepEqual(storage.reads, []);
});

test('backup downloads attach the link before clicking it for Safari and remove it afterward', t => {
  const oldDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  t.after(() => {
    if (oldDocument) Object.defineProperty(globalThis, 'document', oldDocument);
    else delete globalThis.document;
  });
  let attached = false, removed = false, revoked = false;
  const anchor = { click() { assert.equal(attached, true); assert.equal(this.download, 'backup.json'); }, remove() { removed = true; } };
  globalThis.document = { createElement: () => anchor, body: { appendChild(value) { assert.equal(value, anchor); attached = true; } } };
  t.mock.method(URL, 'createObjectURL', () => 'blob:backup');
  t.mock.method(URL, 'revokeObjectURL', value => { assert.equal(value, 'blob:backup'); revoked = true; });
  t.mock.method(globalThis, 'setTimeout', callback => { callback(); });
  download('backup.json', '{}');
  assert.equal(anchor.hidden, true);
  assert.equal(removed, true);
  assert.equal(revoked, true);
});

test('timing settings default safely and migrate independently for main settings and presets', () => {
  assert.equal(freshData().settings.timingMode, 'simple');
  assert.equal(freshData().settings.inspectionAudio, false);
  const input = fixture();
  for (const settings of [input.settings, input.presets[0].settings]) {
    delete settings.timingMode; delete settings.inspectionAudio;
  }
  input.settings.mode = 'last-layer';
  input.presets[0].settings.mode = 'one-look';
  const migrated = validateData(input);
  assert.equal(migrated.settings.timingMode, 'simple');
  assert.equal(migrated.presets[0].settings.timingMode, 'inspection');
  assert.equal(migrated.settings.inspectionAudio, false);
  assert.equal(migrated.presets[0].settings.inspectionAudio, false);
  assert.equal(Object.hasOwn(input.settings, 'timingMode'), false);

  input.settings.timingMode = 'inspection'; input.settings.inspectionAudio = true;
  input.presets[0].settings.timingMode = 'simple'; input.presets[0].settings.inspectionAudio = true;
  const explicit = validateData(input);
  assert.equal(explicit.settings.timingMode, 'inspection', 'last-layer practice can use inspection');
  assert.equal(explicit.presets[0].settings.timingMode, 'simple', 'one-look practice can use simple timing');
  assert.equal(explicit.presets[0].settings.inspectionAudio, true);
});

test('legacy attempts infer inspection from finite elapsed inspection, including zero', () => {
  for (const [inspectionSeconds, timingMode] of [[undefined, 'simple'], [null, 'simple'], [0, 'inspection'], [12.3, 'inspection']]) {
    const input = fixture(), attempt = input.attempts[0];
    delete attempt.timingMode; delete attempt.inspectionAudio;
    if (inspectionSeconds === undefined) delete attempt.inspectionSeconds; else attempt.inspectionSeconds = inspectionSeconds;
    const migrated = validateData(input).attempts[0];
    assert.equal(migrated.timingMode, timingMode);
    assert.equal(migrated.inspectionAudio, false);
    assert.equal(migrated.seconds, 3.12, 'inspection never alters solve time');
  }
});

test('new timing metadata round-trips and permits manually entered solves without timed inspection', () => {
  const input = fixture();
  input.attempts[0].timingMode = 'inspection';
  input.attempts[0].inspectionAudio = true;
  input.attempts[0].inspectionSeconds = null;
  assert.deepEqual(validateData(input), input);
  delete input.attempts[0].inspectionSeconds;
  assert.equal(validateData(input).attempts[0].timingMode, 'inspection');
  input.attempts[0].inspectionSeconds = 9.1;
  assert.equal(validateData(input).attempts[0].seconds, 3.12);
});

test('new practices use the two first-face triggers and every bottom rotation', () => {
  const first = freshData(), second = freshData();
  assert.deepEqual(first.settings.finishIds, ['FF-LS-Uminus3', 'FF-LS-Uplus3']);
  assert.deepEqual(first.settings.bottomAuf, ['', 'D', 'D2', "D'"]);
  first.settings.finishIds.pop(); first.settings.bottomAuf.pop();
  assert.deepEqual(second.settings.finishIds, DEFAULT_FIRST_FACE_CASE_IDS);
  assert.deepEqual(second.settings.bottomAuf, ['', 'D', 'D2', "D'"]);
});

test('legacy finish subsets migrate to named primary cases without altering preferences or history', () => {
  const input = fixture();
  input.settings.finishIds = ["R U R'", "R2 U' R2", 'B'];
  input.presets[0].settings.finishIds = ["R' U' R"];
  delete input.settings.bottomAuf;
  delete input.presets[0].settings.bottomAuf;
  const before = structuredClone(input), result = validateData(input);
  assert.deepEqual(result.settings.finishIds, ['FF-LS-Uminus3', 'FF-LS-U3']);
  assert.deepEqual(result.presets[0].settings.finishIds, ['FF-LS-Uplus3']);
  assert.deepEqual(result.settings.bottomAuf, ['', 'D', 'D2', "D'"]);
  assert.deepEqual(result.presets[0].settings.bottomAuf, ['', 'D', 'D2', "D'"]);
  assert.deepEqual(result.preferences, before.preferences);
  assert.deepEqual(result.attempts, before.attempts);
  assert.deepEqual(input, before, 'migration must not mutate its input');
  result.settings.bottomAuf.pop();
  assert.equal(result.presets[0].settings.bottomAuf.length, 4);
});

test('legacy all-finish selection becomes all 36 named cases, while empty remains empty', () => {
  const input = fixture();
  input.settings.finishIds = finishOptions(3).map(item => item.id);
  input.presets[0].settings.finishIds = [];
  const result = validateData(input);
  assert.equal(input.settings.finishIds.length, 4338);
  assert.deepEqual(result.settings.finishIds, FIRST_FACE_CASES.map(item => item.id));
  assert.deepEqual(result.presets[0].settings.finishIds, []);
});

test('legacy unmatched selections receive the default pair and malformed strings still fail', () => {
  const input = fixture();
  input.settings.finishIds = ['B', "B U F'"];
  assert.deepEqual(validateData(input).settings.finishIds, DEFAULT_FIRST_FACE_CASE_IDS);
  for (const invalid of ['', 'unknown', 'R R', 'x', 'Rw', 'R U F L', "R  U R'", 'R3']) {
    input.settings.finishIds = [invalid];
    assert.throws(() => validateData(input), invalid);
  }
  input.settings.finishIds = ['FF-LS-Uminus3', "R U R'", 'R'];
  assert.deepEqual(validateData(input).settings.finishIds, ['FF-LS-Uminus3', 'FF-UD-QT1']);
});

test('legacy finish history retains move text and gains only inferred first-face identity and no bottom or initial rotation', () => {
  for (const [finish, finishCaseId] of [["R U R'", 'FF-LS-Uminus3'], ["R' U' R", 'FF-LS-Uplus3'], ["R2 U' R2", 'FF-LS-U3'], ["B U F'", ''], ['', ''], [undefined, '']]) {
    const input = fixture(), attempt = input.attempts[0];
    attempt.mode = 'one-look';
    delete attempt.bottomAuf; delete attempt.initialAuf; delete attempt.finishCaseId;
    if (finish === undefined) delete attempt.finish; else attempt.finish = finish;
    const before = structuredClone(input), result = validateData(input).attempts[0];
    assert.equal(result.finish, finish);
    assert.equal(result.finishCaseId, finishCaseId);
    assert.equal(result.bottomAuf, '');
    assert.equal(result.initialAuf, '');
    assert.equal(result.seconds, attempt.seconds);
    assert.equal(result.timingMode, attempt.timingMode);
    assert.equal(result.inspectionAudio, attempt.inspectionAudio);
    assert.deepEqual(input, before);
  }
});

test('every catalog first-face algorithm and explicit bottom rotation round-trips', () => {
  const input = fixture();
  input.settings.finishIds = FIRST_FACE_CASES.map(item => item.id);
  input.settings.bottomAuf = ["D'"];
  input.attempts = FIRST_FACE_CASES.flatMap(item => item.algorithms.map(algorithm => ({
    ...input.attempts[0], id: algorithm.id, mode: 'one-look', finish: algorithm.alg,
    finishCaseId: item.id, bottomAuf: 'D2',
  })));
  assert.deepEqual(validateData(input), input);
  for (const [field, value] of [['bottomAuf', null], ['bottomAuf', 'D3'], ['finishCaseId', null], ['finishCaseId', 1], ['finishCaseId', 'R']]) {
    const invalid = structuredClone(input);
    invalid.attempts[0][field] = value;
    assert.throws(() => validateData(invalid), `${field}: ${value}`);
  }
});

test('one-look initial AUF round-trips separately from last-layer and bottom AUFs', () => {
  for (const initialAuf of ['', 'U', 'U2', "U'"]) {
    const input = fixture();
    Object.assign(input.attempts[0], {
      mode: 'one-look', timingMode: 'inspection', initialAuf,
      preAuf: 'U2', postAuf: "U'", bottomAuf: 'D2',
      finish: "R U' R'", finishCaseId: 'FF-LS-Uplus3', inspectionSeconds: 11.2,
    });
    const result = validateData(JSON.parse(JSON.stringify(input)));
    assert.deepEqual(result, input);
    assert.equal(Object.hasOwn(result.settings, 'initialAuf'), false);
    assert.deepEqual(result.presets, input.presets, 'initial AUF adds history without changing practice presets');
  }
});

test('initial AUF rejects unsupported moves and non-text values without coercion', () => {
  for (const initialAuf of ['D', 'y', 'U3', 'U U', null, undefined, 0, false, [], {}]) {
    const input = fixture();
    input.attempts[0].initialAuf = initialAuf;
    assert.throws(() => validateData(input), /initialAuf/);
  }
});

test('changed insertion keeps its stable selection and historical move text', () => {
  const input = fixture();
  input.settings.finishIds = ["R' U' R", "R U' R'"];
  input.presets[0].settings.finishIds = ['FF-LS-Uplus3'];
  input.attempts = ["R' U' R", "R U' R'"].map((finish, index) => {
    const attempt = { ...input.attempts[0], id: `insertion-${index}`, mode: 'one-look', finish };
    delete attempt.finishCaseId;
    delete attempt.initialAuf;
    return attempt;
  });
  const before = structuredClone(input);
  const result = validateData(input);
  assert.deepEqual(result.settings.finishIds, ['FF-LS-Uplus3']);
  assert.deepEqual(result.presets, input.presets);
  assert.deepEqual(result.attempts.map(attempt => attempt.finish), ["R' U' R", "R U' R'"]);
  assert.deepEqual(result.attempts.map(attempt => attempt.finishCaseId), ['FF-LS-Uplus3', 'FF-LS-Uplus3']);
  assert.deepEqual(result.attempts.map(attempt => attempt.initialAuf), ['', '']);
  assert.deepEqual(result.preferences, input.preferences);
  assert.deepEqual(result.lte, input.lte);
  assert.deepEqual(result.ltc, input.ltc);
  assert.deepEqual(input, before, 'migration must not rewrite the saved backup');
});
