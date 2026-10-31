import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { CASES } from '../app/catalog.js';
import { CASES5 } from '../app/catalog5.js';
import { CASES_CENTRES } from '../app/catalog-centres.js';
import { centreSVG5 } from '../app/centres-view.js';
import { createCentresDrill } from '../app/centres-drill.js';
import { createProgressView } from '../app/progress.js';
import * as cube from '../app/cube.js';
import { createLTETrainer } from '../app/lte.js';
import * as firstFace from '../app/first-face-cases.js';
import * as cubeview from '../app/cubeview.js';
import * as stats from '../app/stats.js';
import { freshData, validateData } from '../app/storage.js';

// Execute the production controller with real physics/data modules and only a
// minimal DOM/storage boundary. This exercises its private sampling and save
// handlers without making browser-only production code depend on a test API.
const appSource = (await readFile(new URL('../app/app.js', import.meta.url), 'utf8'))
  .replace(/^import .*?;\s*$/gm, '');

async function controller(settings = {}, random = () => 0.25, stored = {}) {
  const nodes = new Map(), listeners = new Map(), windowListeners = new Map(), saves = [], audioCalls = [], downloads = [], windowEvents = [];
  let time = 1000;
  const node = selector => {
    if (!nodes.has(selector)) nodes.set(selector, {
      innerHTML: '', textContent: '', value: '', classList: { add() {}, remove() {} },
      focus() {}, select() {}, querySelectorAll() { return []; },
    });
    return nodes.get(selector);
  };
  const initial = freshData();
  initial.initialized = true;
  Object.assign(initial, stored);
  Object.assign(initial.settings, { selectedCases: ['CLL-S1'] }, settings);
  let id = 0;
  const document = {
    visibilityState: 'visible', hidden: false,
    querySelector: selector => selector === '.modal' ? (node('#modal-root').innerHTML ? node('.modal') : null) : node(selector),
    addEventListener: (name, handler) => listeners.set(name, handler),
  };
  const window = {
    confirm: () => true,
    addEventListener: (name, handler) => windowListeners.set(name, handler),
    dispatchEvent(event) {
      windowEvents.push(event);
      windowListeners.get(event.type)?.(event);
      return true;
    },
  };
  const context = vm.createContext({
    ...cube, ...cubeview, ...stats, ...firstFace, createLTETrainer, CASES, freshData, validateData,
    CASES_CENTRES, centreSVG5, createCentresDrill, createProgressView,
    loadData: async () => initial,
    saveData: async data => { saves.push(structuredClone(data)); },
    createInspectionAudio: () => ({
      start(...args) { audioCalls.push({ method: 'start', time, args }); return true; },
      cancel(...args) { audioCalls.push({ method: 'cancel', time, args }); },
      dispose() { audioCalls.push({ method: 'dispose', time }); },
    }),
    download(...args) { downloads.push(args); }, structuredClone,
    chooseWeightedCase: (cases, attempts, strategy, suppliedRandom, slowWindow, rankCount) => stats.chooseWeightedCase(cases, attempts, strategy, suppliedRandom || random, slowWindow, rankCount),
    document, window, navigator: {},
    CustomEvent: class CustomEvent {
      constructor(type, { detail } = {}) { this.type = type; this.detail = detail; }
    },
    Math: Object.assign(Object.create(Math), { random }),
    crypto: { randomUUID: () => `integration-${++id}` },
    performance: { now: () => time },
    setTimeout() { return 1; }, clearTimeout() {},
    requestAnimationFrame() { return 1; }, cancelAnimationFrame() {},
    confirm: () => true,
  });
  const api = await vm.runInContext(`(async () => { ${appSource}
    return {
      nextDrill, scopeAttempts, selectedCases, preferred, showCase, filteredInsights, insightsPage, insightTable, switchTrainer,
      lteSnapshot: () => lte.snapshot(),
      ltcSnapshot: () => ltc.snapshot(),
      progressSnapshot: () => progress.snapshot(),
      snapshot: () => ({ data, current, phase, lastResult }),
      setSettings: patch => { Object.assign(data.settings, patch); },
      setAttempts: attempts => { data.attempts = attempts; },
      setInsightFilters: filters => { insightFilters = filters; },
      setFinishSearch: (query, length, group = 'all') => { finishQuery = query; finishLength = length; finishGroup = group; },
      matchingFinishes,
    };
  })()`, context, { filename: 'app/app.js' });
  return {
    ...api, nodes, saves, audioCalls, downloads, windowEvents,
    timerActive: () => window.cornerlabTimerActive(),
    setTime: value => { time = value; },
    key(type, key = 'Space', { repeat = false, target = 'body' } = {}) {
      let prevented = false;
      listeners.get(type)?.({
        key: key === 'Space' ? ' ' : key, code: key, repeat,
        preventDefault() { prevented = true; },
        target: {
          dataset: {}, isContentEditable: target === 'contenteditable',
          matches: selector => selector.split(',').some(part => part.trim() === target),
        },
      });
      return { prevented };
    },
    change(id, properties = {}) {
      return listeners.get('change')({ target: { id, dataset: {}, ...properties } });
    },
    blur() { windowListeners.get('blur')?.(); },
    pagehide() { windowListeners.get('pagehide')?.(); },
    visibilityChange(hidden) {
      document.hidden = hidden;
      document.visibilityState = hidden ? 'hidden' : 'visible';
      listeners.get('visibilitychange')?.({ type: 'visibilitychange' });
    },
    async click(action, dataset = {}) {
      const element = { dataset: { action, ...dataset } };
      await listeners.get('click')({ target: {
        matches: () => false,
        closest: selector => selector === '[data-action]' ? element : null,
      } });
    },
  };
}

test('default first-face case IDs select precisely the two requested insertions', async () => {
  const defaults = freshData().settings.finishIds;
  assert.deepEqual(defaults, firstFace.DEFAULT_FIRST_FACE_CASE_IDS);
  assert.deepEqual(defaults.map(id => firstFace.FIRST_FACE_CASES.find(f => f.id === id).alg), ["R U R'", "R U' R'"]);
  const ui = await controller({ mode: 'one-look' });
  const { current } = ui.snapshot();
  assert.ok(current);
  assert.ok(defaults.includes(current.finishCaseId));
  assert.equal(cube.isFirstLayerComplete(current.afterSetupState, current.color), false);
  assert.equal(cube.isFirstLayerComplete(current.afterFinishState, current.color), true);
  assert.ok(cube.isSolved(cube.applyAlg(current.state, current.solution)));
});

test('one-look sampling independently preserves selected top, bottom and finish conditions for every LL case', async () => {
  const ui = await controller({
    mode: 'one-look', preAuf: ["U'"], postAuf: ['U2'], bottomAuf: ['D'],
    finishIds: ['FF-UU-BC1'],
  }, () => 0.99);
  for (const c of CASES) {
    ui.setSettings({ selectedCases: [c.id] });
    ui.nextDrill();
    const { current } = ui.snapshot();
    assert.ok(current, c.id);
    assert.equal(current.case.id, c.id);
    assert.equal(current.preAuf, "U'");
    assert.equal(current.postAuf, 'U2');
    assert.equal(current.bottomAuf, 'D');
    assert.equal(current.initialAuf, 'U2');
    assert.equal(current.initialAlignment, 'U2');
    assert.equal(current.finishCaseId, 'FF-UU-BC1');
    assert.equal(current.finish, 'R2');
    assert.ok(cube.isSolved(cube.applyAlg(current.state, current.solution)));
  }
  ui.setSettings({ mode: 'last-layer' });
  ui.nextDrill();
  assert.equal(ui.snapshot().current.bottomAuf, '');
  assert.equal(ui.snapshot().current.initialAuf, '');
  assert.equal(ui.snapshot().current.finishCaseId, '');
});

test('empty finish selection stays empty and explains how to begin', async () => {
  const ui = await controller({ mode: 'one-look', finishIds: [] });
  assert.equal(ui.snapshot().current, null);
  assert.match(ui.nodes.get('#toast').textContent, /Select at least one first-face case/);
  assert.deepEqual(ui.snapshot().data.settings.finishIds, []);
  await ui.click('finish-defaults');
  ui.nextDrill();
  assert.ok(ui.snapshot().current);
});

test('one-look samples every initial U position and retains it through reveal, history, filtering and export', async () => {
  for (const [index, initialAuf] of ['', 'U', "U'", 'U2'].entries()) {
    const ui = await controller({ mode: 'one-look', finishIds: ['FF-LS-Uplus3'], orientations: ['y'] }, () => (index + 0.5) / 4);
    const { current } = ui.snapshot();
    assert.equal(current.finish, "R U' R'");
    assert.equal(current.initialAuf, initialAuf);
    assert.equal(current.initialAlignment, cube.inverse(initialAuf));
    if (initialAuf) assert.ok(current.scramble.endsWith(initialAuf));
    assert.ok(cube.isSolved(cube.applyAlg(current.state, current.solution)));
    assert.doesNotMatch(ui.nodes.get('#app').innerHTML, /class="solution"/);
    ui.nodes.set('#manual-time', { value: '4.12' });
    await ui.click('manual');
    const saved = ui.snapshot().data.attempts[0];
    assert.equal(saved.initialAuf, initialAuf);
    assert.equal(validateData(structuredClone(ui.snapshot().data)).attempts[0].initialAuf, initialAuf);
    assert.match(ui.nodes.get('#app').innerHTML, /solution-label">Initial AUF/);
    await ui.click('attempt', { id: saved.id });
    assert.match(ui.nodes.get('#modal-root').innerHTML, /Initial AUF \(scramble\)/);
    await ui.click('close-modal');
    ui.setInsightFilters({ initialAuf: initialAuf || 'none' });
    assert.equal(ui.filteredInsights().length, 1);
    await ui.click('export-csv');
    const csv = ui.downloads.at(-1)[1], lines = csv.split('\n'), column = lines[0].split(',').indexOf('initialAuf');
    assert.ok(column >= 0);
    assert.equal(lines[1].split(',')[column], `"${initialAuf}"`);
    ui.setInsightFilters({ initialAuf: initialAuf === 'U' ? 'U2' : 'U' });
    assert.equal(ui.filteredInsights().length, 0);
  }
});

test('one-look focus preserves old insertion history without treating it as the replacement', async () => {
  const ui = await controller({ mode: 'one-look', finishIds: ['FF-LS-Uplus3'], timingMode: 'simple' });
  const current = ui.snapshot().current;
  const base = { ...current, caseId: current.case.id, algorithmId: current.algorithm.id, algorithm: current.algorithm.alg, timingMode: 'simple', seconds: 3 };
  ui.setAttempts([{ ...base, id: 'new' }, { ...base, id: 'old', finish: "R' U' R" }]);
  assert.deepEqual(Array.from(ui.scopeAttempts(), a => a.id), ['new']);
  assert.equal(ui.snapshot().data.attempts.length, 2);
  assert.equal(ui.snapshot().data.attempts[1].finish, "R' U' R");
});

test('one-look inspection summaries follow session and Insights filters and keep solve outcomes', async () => {
  const ui = await controller({ mode: 'one-look', timingMode: 'inspection' });
  ui.setTime(0); await ui.click('timer');
  ui.setTime(7000); await ui.click('timer');
  ui.setTime(10000); await ui.click('timer');
  const first = ui.snapshot().data.attempts[0];
  const section = html => html.match(/<section class="inspection-stats"[\s\S]*?<\/section>/)?.[0];
  let html = section(ui.nodes.get('#app').innerHTML);
  assert.match(html, /This session · 1 measured inspection/);
  assert.match(html, /7\.00<small>s/);
  assert.equal((html.match(/100%/g) || []).length, 3);
  ui.setAttempts([
    first,
    { ...first, id: 'recall', inspectionSeconds: 11, recallFail: true },
    { ...first, id: 'dnf', inspectionSeconds: 14, dnf: true },
    { ...first, id: 'slow', inspectionSeconds: 16 },
    { ...first, id: 'assisted', inspectionSeconds: 1, assisted: true },
    { ...first, id: 'untimed', inspectionSeconds: null, timingMode: 'simple' },
    { ...first, id: 'other-mode', inspectionSeconds: 1, mode: 'last-layer' },
    { ...first, id: 'other-case', inspectionSeconds: 30, caseId: 'CLL-S2' },
  ]);
  ui.setInsightFilters({ caseId: 'CLL-S1' });
  await ui.click('nav', { page: 'insights' });
  html = section(ui.nodes.get('#app').innerHTML);
  assert.match(html, /Matching results · 4 measured inspections/);
  assert.match(html, /12\.00<small>s/);
  for (const percent of ['75%', '50%', '25%']) assert.ok(html.includes(percent));
  ui.setInsightFilters({ mode: 'last-layer' });
  html = section(ui.insightsPage());
  assert.match(html, /0 measured inspections/);
  assert.doesNotMatch(html, /NaN|Infinity|0%/);
});

test('chosen custom algorithms retain exact case and color frame through the save handler', async () => {
  const ui = await controller();
  const c = CASES.find(c => c.id === 'CLL-S1');
  ui.showCase(c.id);
  // This identity extension keeps a distinct, legal expression after adjacent
  // cancellation, so the test exercises storage of a new personal choice.
  ui.nodes.set('#custom-alg', { value: `${c.algorithms[0].alg} (R U R' U')6 U' x` });
  await ui.click('save-alg');
  const preferred = ui.preferred(c);
  assert.equal(preferred.source, 'Personal algorithm');
  assert.equal(ui.snapshot().data.preferences[c.id].selected, preferred.id);
  assert.deepEqual(cube.applyAlg(cube.solvedState(), cube.inverse(preferred.alg)),
    cube.applyAlg(cube.solvedState(), cube.inverse(c.algorithms[0].alg)));
  for (const [color, face] of Object.entries(cube.COLOR_FACES)) {
    for (const orientation of ['', 'y', 'y2', "y'"]) {
      ui.setSettings({ colors: [color], orientations: [orientation], preAuf: ['U2'], postAuf: ["U'"] });
      ui.nextDrill();
      const { current } = ui.snapshot();
      assert.ok(current, `${color}/${orientation}`);
      assert.equal(current.algorithm.id, preferred.id);
      assert.equal(current.color, color);
      assert.equal(current.orientation, orientation);
      assert.equal(current.preAuf, 'U2');
      assert.equal(current.postAuf, "U'");
      assert.deepEqual(cube.facelets(current.afterFinishState).D, [face, face, face, face]);
      assert.ok(cube.isSolved(cube.applyAlg(current.state, current.solution)));
    }
  }
  assert.ok(ui.saves.some(data => data.preferences[c.id]?.selected === preferred.id));
});

test('a custom ending rotation simplifies back to and reuses an existing choice', async () => {
  const ui = await controller();
  const c = CASES.find(c => c.id === 'CLL-S1');
  ui.showCase(c.id);
  ui.nodes.set('#custom-alg', { value: `${c.algorithms[0].alg} x` });
  await ui.click('save-alg');
  assert.equal(ui.preferred(c).id, c.algorithms[0].id);
  assert.equal(ui.snapshot().data.preferences[c.id].custom.length, 0);
});

test('custom algorithm rejection keeps the previously chosen valid algorithm', async () => {
  const ui = await controller();
  const c = CASES.find(c => c.id === 'CLL-S1');
  const before = ui.preferred(c).id;
  ui.showCase(c.id);
  ui.nodes.set('#custom-alg', { value: 'R' });
  await ui.click('save-alg');
  assert.equal(ui.preferred(c).id, before);
  assert.match(ui.nodes.get('#custom-alg-error').innerHTML, /does not solve/);
});

test('first-face picker has the sheet cases with the preferred insertion, searchable by name, group and Unicode moves', async () => {
  const ui = await controller();
  ui.setFinishSearch('R U R′', '3');
  assert.deepEqual(Array.from(ui.matchingFinishes(), f => f.id), ['FF-LS-Uminus3']);
  for (const [length, count] of [['1', 3], ['3', 17], ['4', 2], ['5', 14], ['all', 36]]) {
    ui.setFinishSearch('', length);
    assert.equal(ui.matchingFinishes().length, count, length);
  }
  ui.setFinishSearch('U+3', 'all');
  assert.deepEqual(Array.from(ui.matchingFinishes(), f => f.id), ['FF-LS-Uplus3']);
  ui.setFinishSearch('', 'all', 'UD');
  assert.equal(ui.matchingFinishes().length, 12);
  await ui.click('finishes');
  assert.match(ui.nodes.get('#modal-root').innerHTML, /22 families/);
  assert.match(ui.nodes.get('#modal-root').innerHTML, /First-face sticker pattern/);
  assert.doesNotMatch(ui.nodes.get('#modal-root').innerHTML, /4,338|Page|incompatible/);
});

test('finish family and filtered bulk selections preserve unrelated choices', async () => {
  const ui = await controller({ finishIds: [] });
  await ui.click('finish-family', { family: 'UD-JK1' });
  assert.deepEqual(Array.from(ui.snapshot().data.settings.finishIds), ['FF-UD-JK1', 'FF-UD-QT1']);
  ui.setFinishSearch('', 'all', 'LS');
  await ui.click('finish-select', { value: 'all' });
  assert.equal(ui.snapshot().data.settings.finishIds.length, 7);
  await ui.click('finish-select', { value: 'none' });
  assert.deepEqual(Array.from(ui.snapshot().data.settings.finishIds), ['FF-UD-JK1', 'FF-UD-QT1']);
  ui.setFinishSearch('', 'all');
  await ui.click('finish-family', { family: 'UD-JK1' });
  assert.equal(ui.snapshot().data.settings.finishIds.length, 0);
  await ui.click('finish-defaults');
  assert.deepEqual(Array.from(ui.snapshot().data.settings.finishIds), firstFace.DEFAULT_FIRST_FACE_CASE_IDS);
});

test('practice weighting uses current algorithm and every selected condition only', async () => {
  const ui = await controller({
    mode: 'one-look', preAuf: [''], postAuf: ['U2'], colors: ['green'], orientations: ['y'],
    finishIds: ["FF-LS-Uminus3"], bottomAuf: ["D2"],
  });
  const c = CASES.find(c => c.id === 'CLL-S1');
  const accepted = {
    id: 'matching', caseId: c.id, algorithmId: c.algorithms[0].id, mode: 'one-look',
    preAuf: '', postAuf: 'U2', color: 'green', orientation: 'y', finish: "R U R'", finishCaseId: "FF-LS-Uminus3", bottomAuf: "D2", seconds: 3,
  };
  const mismatches = {
    caseId: 'CLL-S2', algorithmId: 'previous-algorithm', mode: 'last-layer',
    preAuf: 'U', postAuf: '', color: 'white', orientation: '', finishCaseId: "FF-LS-Uplus3", bottomAuf: "D",
  };
  ui.setAttempts([accepted, ...Object.entries(mismatches).map(([field, value]) => ({ ...accepted, id: field, [field]: value }))]);
  assert.deepEqual(Array.from(ui.scopeAttempts(), attempt => attempt.id), ['matching']);
  ui.setSettings({ mode: 'last-layer' });
  assert.deepEqual(Array.from(ui.scopeAttempts(), attempt => attempt.id), ['mode']);
});

test('2×2 Learning presents each selected case exactly once in every shuffled batch', async () => {
  const ids = ['CLL-S1', 'EG1-S1', 'EG2-S1'];
  const ui = await controller({ selectedCases: ids, strategy: 'learning', mode: 'one-look' });
  for (let batch = 1; batch <= 3; batch++) {
    const seen = [];
    for (let position = 1; position <= ids.length; position++) {
      const { current } = ui.snapshot();
      seen.push(current.case.id);
      assert.deepEqual(current.learningBatch, { batchNumber: batch, position, total: ids.length });
      assert.ok(cube.isSolved(cube.applyAlg(current.state, current.solution)));
      assert.match(ui.nodes.get('#app').innerHTML, new RegExp(`Learning batch ${batch} · case ${position} of 3`));
      if (position === 1) {
        await ui.click('nav', { page: 'insights' });
        await ui.click('nav', { page: 'train' });
        await ui.click('reveal');
        await ui.click('reveal');
        await ui.click('timer');
        ui.key('keydown', 'Escape');
        assert.equal(ui.snapshot().current, current, 'views, reveal and cancellation do not draw another case');
      }
      await ui.click('next');
    }
    assert.deepEqual(seen.slice().sort(), ids.slice().sort());
  }
  assert.equal(ui.snapshot().data.attempts.length, 0, 'skips consume positions without creating solves');
});

test('2×2 Learning starts a fresh batch on selection, algorithm, strategy and saved-practice changes', async () => {
  const ids = ['CLL-S1', 'CLL-S2', 'CLL-S3'];
  const ui = await controller({ selectedCases: ids, strategy: 'learning' });
  ui.nextDrill();
  assert.equal(ui.snapshot().current.learningBatch.position, 2);
  ui.setSettings({ selectedCases: [ids[0], ids[1], 'CLL-S4'] });
  ui.nextDrill();
  assert.deepEqual(ui.snapshot().current.learningBatch, { batchNumber: 1, position: 1, total: 3 });
  ui.setSettings({ selectedCases: ['CLL-S4', ids[1], ids[0]] });
  ui.nextDrill();
  assert.equal(ui.snapshot().current.learningBatch.position, 2, 'selection order alone keeps the batch');
  const c = CASES.find(c => c.id === ids[0]);
  assert.ok(c.algorithms.length > 1);
  ui.snapshot().data.preferences[c.id] = { selected: c.algorithms[1].id, custom: [] };
  ui.nextDrill();
  assert.equal(ui.snapshot().current.learningBatch.position, 1);
  await ui.change('focus-select', { value: 'uniform' });
  await ui.change('focus-select', { value: 'learning' });
  ui.nextDrill();
  assert.equal(ui.snapshot().current.learningBatch.position, 1);
  ui.nodes.set('#preset-name', { value: 'Learning batch' });
  await ui.click('save-preset');
  const preset = ui.snapshot().data.presets[0];
  ui.nextDrill();
  await ui.click('load-preset', { id: preset.id });
  assert.equal(ui.snapshot().data.settings.strategy, 'learning');
  assert.equal(ui.snapshot().current.learningBatch.position, 1);
  const backup = validateData(structuredClone(ui.snapshot().data));
  assert.equal(backup.presets[0].settings.strategy, 'learning');
  ui.setSettings({ selectedCases: [] }); ui.nextDrill();
  assert.equal(ui.snapshot().current, null);
  ui.setSettings({ selectedCases: [ids[0]] }); ui.nextDrill();
  assert.deepEqual(ui.snapshot().current.learningBatch, { batchNumber: 1, position: 1, total: 1 });
  ui.nextDrill();
  assert.equal(ui.snapshot().current.learningBatch.batchNumber, 2);
});

test('2×2 Speed uses the adjustable recent clean window after matching practice conditions', async () => {
  const ids = ['CLL-S1', 'CLL-S2'];
  const history = ids.flatMap(caseId => Array.from({ length: 20 }, (_, index) => ({
    id: `${caseId}-${index}`, caseId,
    algorithmId: CASES.find(c => c.id === caseId).algorithms[0].id,
    seconds: caseId === 'CLL-S1' ? index < 15 ? 20 : 2 : 6,
    createdAt: new Date(Date.UTC(2026, 9, 1, 0, index)).toISOString(),
    mode: 'last-layer', timingMode: 'simple', color: 'white', preAuf: '', postAuf: '', orientation: '',
  })));
  history.push(
    ...['recallFail', 'dnf', 'assisted'].map(flag => ({ ...history[19], id: flag, [flag]: true, seconds: 300, createdAt: '2026-10-18T12:00:00Z' })),
    { ...history[19], id: 'different-color', color: 'yellow', seconds: 300, createdAt: '2026-10-18T12:01:00Z' },
    { ...history[19], id: 'different-algorithm', algorithmId: 'previous-algorithm', seconds: 300, createdAt: '2026-10-18T12:02:00Z' },
  );
  const ui = await controller({ selectedCases: ids, strategy: 'slow', slowWindow: 5, preAuf: [''], postAuf: [''] }, () => 0.5, { attempts: history.slice().reverse() });
  assert.equal(ui.snapshot().current.case.id, 'CLL-S2', 'the currently slower case is favoured');
  await ui.change('speed-window', { value: '20' });
  assert.equal(ui.snapshot().data.settings.slowWindow, 20);
  ui.nextDrill();
  assert.equal(ui.snapshot().current.case.id, 'CLL-S1', 'a longer window includes older slow execution');
  await ui.change('speed-window', { value: '5' });
  ui.nextDrill();
  assert.equal(ui.snapshot().current.case.id, 'CLL-S2');
  assert.deepEqual(ui.snapshot().data.attempts, history.slice().reverse(), 'practice never trims history');
});

test('2×2 Speed window is validated, saved with practices and independent of other trainers', async () => {
  const ui = await controller();
  assert.doesNotMatch(ui.nodes.get('#app').innerHTML, /id="speed-window"/);
  await ui.change('focus-select', { value: 'slow' });
  assert.match(ui.nodes.get('#app').innerHTML, /Clean solves per case \(N\)/);
  assert.equal(ui.snapshot().data.settings.slowWindow, 20);
  for (const value of ['1', '1000', '7']) {
    await ui.change('speed-window', { value });
    assert.equal(ui.snapshot().data.settings.slowWindow, Number(value));
  }
  for (const value of ['', '0', '-1', '2.5', '1001', 'not-a-number']) {
    await ui.change('speed-window', { value });
    assert.equal(ui.snapshot().data.settings.slowWindow, 7);
    assert.match(ui.nodes.get('#toast').textContent, /whole number/);
  }
  assert.equal(ui.snapshot().data.lte.settings.slowWindow, 20);
  assert.equal(ui.snapshot().data.ltc.settings.slowWindow, 20);
  ui.nodes.set('#preset-name', { value: 'Recent speed' });
  await ui.click('save-preset');
  const preset = ui.snapshot().data.presets[0];
  assert.equal(preset.settings.slowWindow, 7);
  await ui.change('speed-window', { value: '40' });
  await ui.click('load-preset', { id: preset.id });
  assert.equal(ui.snapshot().data.settings.slowWindow, 7);
  assert.equal(validateData(structuredClone(ui.snapshot().data)).settings.slowWindow, 7);
  assert.ok(ui.saves.some(data => data.settings.slowWindow === 7));
  await ui.click('timer');
  assert.match(ui.nodes.get('#app').innerHTML, /id="speed-window"[^>]*disabled/);
  await ui.change('speed-window', { value: '2' });
  assert.equal(ui.snapshot().data.settings.slowWindow, 7, 'active timer blocks edits');
});

function rankedHistory(caseId, id, seconds, overrides = {}) {
  const item = CASES.find(item => item.id === caseId);
  return {
    id, caseId, set: item.set, group: item.group,
    algorithmId: item.algorithms[0].id, algorithm: item.algorithms[0].alg,
    seconds, createdAt: '2026-10-01T12:00:00Z',
    mode: 'last-layer', timingMode: 'simple', color: 'white', preAuf: '', postAuf: '', orientation: '',
    ...overrides,
  };
}
function summaryRows(html) {
  return [...html.matchAll(/<tr>([\s\S]*?)<\/tr>/g)]
    .map(([, row]) => [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(([, cell]) => cell.replace(/<[^>]*>/g, '').trim()))
    .filter(cells => cells.length);
}

test('2×2 ranked modes draw strictly and equally from the configured selected pool', async () => {
  const ids = ['CLL-S1', 'CLL-S2', 'CLL-S3', 'CLL-S4', 'CLL-S5'];
  const history = ids.slice(0, 4).map((id, index) => rankedHistory(id, `rank-${index}`, [2, 4, 8, 12][index]));
  history.push(rankedHistory('EG1-S1', 'unselected', 500));
  let draw = 0;
  const ui = await controller({ selectedCases: ids, strategy: 'slowest', rankCount: 2 }, () => draw, { attempts: history });
  for (const [strategy, expected] of [['slowest', ['CLL-S4', 'CLL-S3']], ['fastest', ['CLL-S1', 'CLL-S2']]]) {
    await ui.change('focus-select', { value: strategy });
    const actual = [];
    for (const value of [0, .49, .5, .99]) {
      draw = value; ui.nextDrill(); actual.push(ui.snapshot().current.case.id);
    }
    assert.deepEqual(actual, [expected[0], expected[0], expected[1], expected[1]], strategy);
    await ui.change('rank-count', { value: '1' });
    draw = .99; ui.nextDrill();
    assert.equal(ui.snapshot().current.case.id, expected[0]);
    await ui.change('rank-count', { value: '2' });
  }
  await ui.change('rank-count', { value: '129' });
  for (const value of [0, .25, .5, .99]) {
    draw = value; ui.nextDrill();
    assert.ok(ids.slice(0, 4).includes(ui.snapshot().current.case.id), 'unmeasured and unselected cases stay outside a measured pool');
  }
  assert.deepEqual(ui.snapshot().data.settings.selectedCases, ids);
  assert.deepEqual(ui.snapshot().data.attempts, history, 'ranking never trims or edits recorded history');
});

test('2×2 ranked modes respond to recent improvement and only use the current algorithm and conditions', async () => {
  const ids = ['CLL-S1', 'CLL-S2'];
  const history = ids.flatMap(caseId => Array.from({ length: 20 }, (_, index) => rankedHistory(
    caseId, `${caseId}-${index}`, caseId === ids[0] ? index < 15 ? 20 : 2 : 6,
    { createdAt: new Date(Date.UTC(2026, 9, 1, 0, index)).toISOString() },
  )));
  history.push(
    ...['recallFail', 'dnf', 'assisted'].map(flag => ({ ...history[19], id: flag, [flag]: true, seconds: 300, createdAt: '2026-10-18T12:00:00Z' })),
    { ...history[19], id: 'other-color', color: 'yellow', seconds: 300, createdAt: '2026-10-18T12:01:00Z' },
    { ...history[19], id: 'other-grip', orientation: 'y', seconds: 300, createdAt: '2026-10-18T12:02:00Z' },
    { ...history[19], id: 'old-algorithm', algorithmId: 'previous-algorithm', seconds: 300, createdAt: '2026-10-18T12:03:00Z' },
    { ...history[19], id: 'revised-text', algorithm: history[19].algorithm + ' U4', seconds: 300, createdAt: '2026-10-18T12:04:00Z' },
  );
  const ui = await controller({ selectedCases: ids, strategy: 'slowest', rankCount: 1, slowWindow: 5 }, () => .99, { attempts: history.slice().reverse() });
  assert.equal(ui.snapshot().current.case.id, ids[1]);
  assert.ok(!Array.from(ui.scopeAttempts(), a => a.id).some(id => ['other-color', 'other-grip', 'old-algorithm', 'revised-text'].includes(id)));
  await ui.change('focus-select', { value: 'fastest' }); ui.nextDrill();
  assert.equal(ui.snapshot().current.case.id, ids[0]);
  await ui.change('speed-window', { value: '20' }); ui.nextDrill();
  assert.equal(ui.snapshot().current.case.id, ids[1], 'longer history changes which case is fastest');
  await ui.change('focus-select', { value: 'slowest' }); ui.nextDrill();
  assert.equal(ui.snapshot().current.case.id, ids[0]);
  const item = CASES.find(item => item.id === ids[0]), alternative = item.algorithms[1];
  ui.showCase(item.id); await ui.click('choose-alg', { id: alternative.id }); await ui.click('close-modal');
  ui.nextDrill();
  assert.equal(ui.snapshot().current.case.id, ids[1], 'times for a former preferred algorithm cannot rank its replacement');
  assert.deepEqual(ui.snapshot().data.attempts, history.slice().reverse());
});

test('ranked modes can begin without clean history and retain every selected case for the baseline', async () => {
  const ids = ['CLL-S1', 'CLL-S2', 'CLL-S3'];
  let draw = 0;
  const history = ids.map((id, i) => rankedHistory(id, `assisted-${i}`, 2 + i, { assisted: true }));
  const ui = await controller({ selectedCases: ids, strategy: 'slowest', rankCount: 1 }, () => draw, { attempts: history });
  for (const strategy of ['slowest', 'fastest']) {
    await ui.change('focus-select', { value: strategy });
    const seen = [];
    for (const value of [0, .5, .99]) { draw = value; ui.nextDrill(); seen.push(ui.snapshot().current.case.id); }
    assert.deepEqual(seen, ids);
  }
  assert.match(ui.nodes.get('#app').innerHTML, /with no times yet, all selected cases are mixed/);
  assert.deepEqual(ui.snapshot().data.settings.selectedCases, ids);
});

test('rank counts and Insights windows validate edits, stay independent, and return with saved practices', async () => {
  const ui = await controller();
  assert.doesNotMatch(ui.nodes.get('#app').innerHTML, /id="rank-count"/);
  assert.equal(ui.snapshot().data.settings.insightsWindow, 20);
  await ui.change('focus-select', { value: 'fastest' });
  for (const value of ['1', '129', '4']) await ui.change('rank-count', { value });
  await ui.change('speed-window', { value: '7' });
  await ui.change('insights-window', { value: '17' });
  for (const [id, maximum, field, expected] of [['rank-count', 129, 'rankCount', 4], ['insights-window', 1000, 'insightsWindow', 17]]) {
    for (const value of ['', '0', '-1', '2.5', String(maximum + 1), 'not-a-number']) {
      await ui.change(id, { value });
      assert.equal(ui.snapshot().data.settings[field], expected);
      assert.match(ui.nodes.get('#toast').textContent, /whole number/);
    }
  }
  assert.match(ui.nodes.get('#app').innerHTML, /id="rank-count"[^>]*value="4"/);
  await ui.click('nav', { page: 'insights' });
  assert.match(ui.nodes.get('#app').innerHTML, /id="insights-window"[^>]*value="17"/);
  for (const branch of [ui.snapshot().data.lte, ui.snapshot().data.ltc]) {
    assert.equal(branch.settings.rankCount, 5);
    assert.equal(branch.settings.insightsWindow, 20);
  }
  ui.nodes.set('#preset-name', { value: 'Lucky-case PRs' }); await ui.click('save-preset');
  const preset = ui.snapshot().data.presets[0];
  await ui.change('focus-select', { value: 'slowest' });
  await ui.change('rank-count', { value: '8' }); await ui.change('speed-window', { value: '40' });
  await ui.change('insights-window', { value: '30' });
  await ui.click('load-preset', { id: preset.id });
  const { settings } = ui.snapshot().data;
  assert.equal(settings.strategy, 'fastest'); assert.equal(settings.rankCount, 4);
  assert.equal(settings.slowWindow, 7); assert.equal(settings.insightsWindow, 17);
  assert.doesNotThrow(() => validateData(structuredClone(ui.snapshot().data)));
  await ui.click('timer');
  assert.match(ui.nodes.get('#app').innerHTML, /id="rank-count"[^>]*disabled/);
  for (const [id, value] of [['rank-count', '2'], ['insights-window', '5'], ['speed-window', '2']]) await ui.change(id, { value });
  assert.equal(settings.rankCount, 4); assert.equal(settings.insightsWindow, 17); assert.equal(settings.slowWindow, 7);
});

test('Insights recent summaries use chronological per-algorithm windows while exports and resets keep the full filter scope', async () => {
  const make = (caseId, id, seconds, day, extra = {}) => rankedHistory(caseId, id, seconds, { createdAt: `2026-10-${String(day).padStart(2, '0')}T12:00:00Z`, ...extra });
  const history = [
    make('CLL-S1', 's1-latest-lapse', 8, 3, { recallFail: true }), make('CLL-S2', 's2-old', 60, 1),
    make('CLL-S1', 's1-old', 50, 1), make('CLL-S2', 's2-latest', 10, 3),
    make('CLL-S1', 's1-recent', 4, 2), make('CLL-S2', 's2-recent', 6, 2),
    make('EG1-S1', 'other-set', 99, 4),
  ];
  const ui = await controller({ insightsWindow: 2 }, () => .25, { attempts: history });
  for (const [branch, item] of [['lte', CASES5[0]], ['ltc', CASES_CENTRES[0]]]) {
    ui.snapshot().data[branch].attempts = [{
      id: `${branch}-keep`, caseId: item.id, set: item.set, group: item.group,
      algorithmId: item.algorithms[0].id, algorithm: item.algorithms[0].alg,
      seconds: 9, inspectionSeconds: null, timingMode: 'simple', inspectionAudio: false,
      orientation: '', scrambleStyle: 'provided', recallFail: false, dnf: false, assisted: false,
      createdAt: '2026-10-04T12:00:00Z', sessionId: 'other-trainer-session', scramble: 'R', solution: "R'",
    }];
  }
  const otherTrainers = structuredClone([ui.snapshot().data.lte, ui.snapshot().data.ltc]);
  ui.setInsightFilters({ set: 'CLL' }); await ui.click('nav', { page: 'insights' });
  const rows = summaryRows(ui.insightTable(ui.filteredInsights()));
  const s1 = rows.find(cells => cells[0] === 'CLL / S1'), s2 = rows.find(cells => cells[0] === 'CLL / S2');
  assert.deepEqual(s1.slice(1, 4), ['2', '4.00s', '4.00s'], 'the latest flagged result consumes a window slot but is not a clean time');
  assert.match(s1[6], /50%.*\(1\)/);
  assert.deepEqual(s2.slice(1, 4), ['2', '8.00s', '8.00s']);
  await ui.change('insight-group', { value: 'set' });
  assert.equal(summaryRows(ui.insightTable(ui.filteredInsights()))[0][1], '4', 'each case contributes its own window before grouping');
  await ui.change('insights-window', { value: '3' }); await ui.change('insight-group', { value: 'caseId' });
  assert.deepEqual(summaryRows(ui.insightTable(ui.filteredInsights())).find(cells => cells[0] === 'CLL / S1').slice(1, 4), ['3', '27.00s', '27.00s']);
  assert.equal(ui.filteredInsights().length, 6);
  assert.match(ui.insightsPage(), /6 results match these filters/);
  for (const attempt of history.slice(0, 6)) assert.ok(ui.insightsPage().includes(`data-id="${attempt.id}"`), 'individual history includes results beyond the table window');
  await ui.click('export-csv');
  const csv = ui.downloads.at(-1)[1];
  assert.equal(csv.trim().split('\n').length, 7);
  for (const attempt of history.slice(0, 6)) assert.ok(csv.includes(`"${attempt.id}"`));
  assert.ok(!csv.includes('"other-set"'));
  assert.deepEqual(ui.snapshot().data.attempts, history);
  await ui.click('reset-filtered');
  assert.match(ui.nodes.get('#modal-root').innerHTML, /<strong>6 results<\/strong>/);
  assert.deepEqual(ui.snapshot().data.attempts, history, 'the reset preview cannot delete history');
  await ui.click('confirm-reset');
  assert.deepEqual(Array.from(ui.snapshot().data.attempts, a => a.id), ['other-set']);
  assert.deepEqual([ui.snapshot().data.lte, ui.snapshot().data.ltc], otherTrainers);
});

test('Insights windows separate historical text revisions that share an algorithm ID and filter before taking recent solves', async () => {
  const s1 = CASES.find(item => item.id === 'CLL-S1');
  const history = [
    rankedHistory('CLL-S1', 'current-old', 2, { createdAt: '2026-10-01T12:00:00Z', color: 'green' }),
    rankedHistory('CLL-S1', 'revision-new', 200, { createdAt: '2026-10-03T12:00:00Z', algorithm: s1.algorithms[0].alg + ' U4', color: 'green' }),
    rankedHistory('CLL-S2', 's2-new', 8, { createdAt: '2026-10-03T12:00:00Z', color: 'green' }),
    rankedHistory('CLL-S1', 'current-new', 4, { createdAt: '2026-10-02T12:00:00Z', color: 'green' }),
    rankedHistory('CLL-S1', 'revision-old', 100, { createdAt: '2026-10-01T12:00:00Z', algorithm: s1.algorithms[0].alg + ' U4', color: 'green' }),
    rankedHistory('CLL-S1', 'newest-outside-filter', 1, { createdAt: '2026-10-04T12:00:00Z', color: 'white' }),
  ];
  const ui = await controller({ insightsWindow: 1 }, () => .25, { attempts: history });
  ui.setInsightFilters({ color: 'green' });
  let rows = summaryRows(ui.insightTable(ui.filteredInsights()));
  assert.deepEqual(rows.find(cells => cells[0] === 'CLL / S1').slice(1, 4), ['2', '102.00s', '102.00s']);
  await ui.change('insight-group', { value: 'algorithmId' });
  rows = summaryRows(ui.insightTable(ui.filteredInsights()));
  assert.equal(rows.length, 3, 'two text revisions sharing an ID remain separate algorithm rows');
  assert.ok(rows.every(cells => cells[1] === '1'));
  assert.deepEqual(rows.map(cells => cells[2]).sort(), ['200.00s', '4.00s', '8.00s']);
  assert.deepEqual(ui.snapshot().data.attempts, history);
});

test('invalid existing personal algorithms produce a controlled one-look startup error', async () => {
  for (const alg of ['R', 'invalid notation']) {
    const ui = await controller({ mode: 'one-look' }, () => 0.25, {
      preferences: { 'CLL-S1': { selected: 'bad-existing', custom: [{ id: 'bad-existing', alg, source: 'Personal algorithm' }] } },
    });
    assert.equal(ui.snapshot().current, null);
    assert.equal(ui.snapshot().phase, 'ready');
    assert.match(ui.nodes.get('#app').innerHTML, /Make every corner count/);
    assert.match(ui.nodes.get('#toast').textContent, /canonical color frame|Unsupported notation/);
    assert.equal(ui.snapshot().data.preferences['CLL-S1'].custom[0].alg, alg, 'existing data remains available for repair');
  }
});

test('Insights None filters and selected practice cases intersect precisely when resetting', async () => {
  const ui = await controller({ selectedCases: ['CLL-S1', 'CLL-S2'] });
  const base = {
    id: 'first-match', caseId: 'CLL-S1', set: 'CLL', group: 'Sune',
    seconds: 3, createdAt: '2026-09-10T10:00:00.000Z', mode: 'one-look',
    preAuf: '', postAuf: '', orientation: '', color: 'white',
  };
  const attempts = [
    base,
    { ...base, id: 'second-match', caseId: 'CLL-S2' },
    { ...base, id: 'unselected-case', caseId: 'CLL-S3' },
    { ...base, id: 'nonempty-recognition', preAuf: 'U' },
    { ...base, id: 'nonempty-finishing', postAuf: 'U2' },
    { ...base, id: 'nonempty-grip', orientation: 'y' },
    { ...base, id: 'different-mode', mode: 'last-layer' },
    { ...base, id: 'missing-recognition', preAuf: undefined },
  ];
  ui.setAttempts(attempts);
  ui.setInsightFilters({ selectionOnly: true, mode: 'one-look', preAuf: 'none', postAuf: 'none', orientation: 'none' });
  assert.deepEqual(Array.from(ui.filteredInsights(), attempt => attempt.id), ['first-match', 'second-match']);
  await ui.click('reset-filtered');
  assert.match(ui.nodes.get('#modal-root').innerHTML, /<strong>2 results<\/strong>/);
  assert.equal(ui.snapshot().data.attempts.length, 8, 'reviewing reset does not delete anything');
  await ui.click('confirm-reset');
  assert.deepEqual(Array.from(ui.snapshot().data.attempts, attempt => attempt.id), attempts.slice(2).map(attempt => attempt.id));
  assert.deepEqual(ui.snapshot().data.settings.selectedCases, ['CLL-S1', 'CLL-S2']);
  assert.ok(ui.saves.some(data => data.attempts.length === 6));
  ui.setInsightFilters({});
  assert.equal(ui.filteredInsights().length, 6);
});

test('historical results without optional session or algorithm metadata render in Insights', async () => {
  const oldAttempt = { id: 'historical-minimal', caseId: 'CLL-S1', seconds: 4.25, createdAt: '2025-01-01T10:00:00.000Z' };
  const ui = await controller({}, () => 0.25, { attempts: [oldAttempt] });
  await ui.click('nav', { page: 'insights' });
  const html = ui.nodes.get('#app').innerHTML;
  assert.match(html, /Individual results/);
  assert.match(html, /historical-minimal/);
  assert.match(html, /4\.25s/);
  assert.match(html, /1 results match these filters/);
  assert.doesNotMatch(html, /undefined|Invalid Date/);
  assert.equal(ui.filteredInsights().length, 1);
});

test('manual timer results remain unrecorded while recording is off', async () => {
  const ui = await controller({ record: false });
  ui.nodes.set('#manual-time', { value: '2.73' });
  await ui.click('manual');
  assert.equal(ui.snapshot().phase, 'done');
  assert.equal(ui.snapshot().lastResult.seconds, 2.73);
  assert.equal(ui.snapshot().data.attempts.length, 0);
  assert.equal(ui.saves.length, 0);
  assert.match(ui.nodes.get('#app').innerHTML, /Not recorded/);
  // The same actual timer path persists results again when recording is enabled.
  ui.setSettings({ record: true });
  await ui.click('next');
  ui.nodes.set('#manual-time', { value: '3.14' });
  await ui.click('manual');
  assert.equal(ui.snapshot().data.attempts.length, 1);
  assert.equal(ui.snapshot().data.attempts[0].seconds, 3.14);
  assert.ok(ui.saves.some(data => data.attempts.length === 1));
});

test('three Space presses time inspection and solve separately, ignoring repeat and held keys', async () => {
  const ui = await controller({ mode: 'one-look', timingMode: 'inspection', inspectionAudio: true });
  ui.setTime(0);
  assert.equal(ui.key('keydown').prevented, true);
  assert.equal(ui.snapshot().phase, 'inspecting');
  assert.equal(ui.snapshot().data.attempts.length, 0);
  assert.equal(ui.audioCalls.filter(call => call.method === 'start').length, 1);
  ui.setTime(1000);
  ui.key('keydown', 'Space', { repeat: true });
  ui.key('keydown');
  assert.equal(ui.snapshot().phase, 'inspecting', 'held Space cannot start the solve');
  ui.setTime(8000);
  ui.key('keyup');
  assert.equal(ui.snapshot().phase, 'inspecting', 'releasing Space does not advance phases');
  const cancelsBeforeSolve = ui.audioCalls.filter(call => call.method === 'cancel').length;
  ui.setTime(12500);
  ui.key('keydown');
  assert.equal(ui.snapshot().phase, 'running');
  assert.ok(ui.audioCalls.filter(call => call.method === 'cancel').length > cancelsBeforeSolve);
  assert.equal(ui.snapshot().data.attempts.length, 0, 'inspection alone is never a solve');
  ui.key('keydown', 'Space', { repeat: true });
  ui.key('keydown');
  assert.equal(ui.snapshot().phase, 'running', 'a held start press cannot immediately stop');
  ui.key('keyup');
  ui.setTime(15750);
  ui.key('keydown');
  assert.equal(ui.snapshot().phase, 'done');
  const attempt = ui.snapshot().data.attempts[0];
  assert.equal(attempt.seconds, 3.25, 'solve excludes the 12.5 second inspection');
  assert.equal(attempt.inspectionSeconds, 12.5, 'performance timestamp zero is valid');
  assert.equal(attempt.timingMode, 'inspection');
  assert.equal(attempt.inspectionAudio, true);
  ui.key('keydown', 'Space', { repeat: true });
  ui.key('keydown');
  assert.equal(ui.snapshot().phase, 'done', 'held stop press cannot skip the result');
  assert.equal(ui.snapshot().data.attempts.length, 1);
});

test('simple mouse timing uses two presses with no inspection audio or inspection duration', async () => {
  const ui = await controller({ timingMode: 'simple', inspectionAudio: false });
  ui.setTime(1000);
  await ui.click('timer');
  assert.equal(ui.snapshot().phase, 'running');
  assert.equal(ui.audioCalls.filter(call => call.method === 'start').length, 0);
  ui.setTime(4320);
  await ui.click('timer');
  const attempt = ui.snapshot().data.attempts[0];
  assert.equal(ui.snapshot().phase, 'done');
  assert.equal(attempt.seconds, 3.32);
  assert.equal(attempt.inspectionSeconds, null);
  assert.equal(attempt.timingMode, 'simple');
  assert.equal(attempt.inspectionAudio, false);
});

test('inspection mouse timing supports silent inspection and zero-length measured inspection', async () => {
  const ui = await controller({ timingMode: 'inspection', inspectionAudio: false });
  ui.setTime(0);
  await ui.click('timer');
  assert.equal(ui.snapshot().phase, 'inspecting');
  await ui.click('timer');
  assert.equal(ui.snapshot().phase, 'running');
  ui.setTime(2000);
  await ui.click('timer');
  assert.equal(ui.audioCalls.filter(call => call.method === 'start').length, 0);
  const attempt = ui.snapshot().data.attempts[0];
  assert.equal(attempt.seconds, 2);
  assert.equal(attempt.inspectionSeconds, 0, 'zero measured inspection differs from no measurement');
  assert.equal(attempt.timingMode, 'inspection');
  assert.equal(attempt.inspectionAudio, false);
});

test('Escape cancels inspection and solving, clears audio, and never records a result', async () => {
  for (const cancelPhase of ['inspecting', 'running']) {
    const ui = await controller({ timingMode: 'inspection', inspectionAudio: true });
    await ui.click('timer');
    if (cancelPhase === 'running') { ui.setTime(10000); await ui.click('timer'); }
    assert.equal(ui.snapshot().phase, cancelPhase);
    const cancelCount = ui.audioCalls.filter(call => call.method === 'cancel').length;
    ui.key('keydown', 'Escape');
    assert.equal(ui.snapshot().phase, 'ready');
    assert.equal(ui.snapshot().lastResult, null);
    assert.equal(ui.snapshot().data.attempts.length, 0);
    assert.equal(ui.saves.length, 0);
    assert.ok(ui.audioCalls.filter(call => call.method === 'cancel').length > cancelCount);
    await ui.click('timer');
    assert.equal(ui.snapshot().phase, 'inspecting', 'the next attempt begins fresh');
  }
});

test('active inspection and solving block navigation, next case, and practice-mode changes', async () => {
  const ui = await controller({ timingMode: 'inspection', inspectionAudio: true });
  for (const phase of ['inspecting', 'running']) {
    await ui.click('timer');
    assert.equal(ui.snapshot().phase, phase);
    const current = ui.snapshot().current;
    await ui.click('nav', { page: 'insights' });
    await ui.click('next');
    await ui.click('mode', { mode: 'one-look' });
    ui.key('keydown', 'n');
    assert.equal(ui.snapshot().phase, phase);
    assert.equal(ui.snapshot().current, current);
    assert.equal(ui.snapshot().data.settings.mode, 'last-layer');
    assert.match(ui.nodes.get('#app').innerHTML, /Make every corner count/);
    assert.equal(ui.snapshot().data.attempts.length, 0);
  }
});

test('Space in text inputs and dialogs does not start the timer', async () => {
  const ui = await controller({ timingMode: 'inspection' });
  for (const target of ['input', 'textarea', 'select', 'contenteditable']) {
    ui.key('keydown', 'Space', { target });
    ui.key('keyup', 'Space', { target });
    assert.equal(ui.snapshot().phase, 'ready');
  }
  ui.showCase('CLL-S1');
  ui.key('keydown');
  ui.key('keyup');
  assert.equal(ui.snapshot().phase, 'ready');
  await ui.click('close-modal');
  ui.key('keydown');
  assert.equal(ui.snapshot().phase, 'inspecting');
});

test('practice modes set timing defaults and the timing option can be chosen independently', async () => {
  const ui = await controller();
  await ui.click('mode', { mode: 'one-look' });
  assert.equal(ui.snapshot().data.settings.timingMode, 'inspection');
  await ui.click('timing-mode', { timing: 'simple' });
  assert.equal(ui.snapshot().data.settings.mode, 'one-look');
  assert.equal(ui.snapshot().data.settings.timingMode, 'simple');
  await ui.click('timer');
  assert.equal(ui.snapshot().phase, 'running');
  ui.key('keydown', 'Escape');
  await ui.click('mode', { mode: 'last-layer' });
  assert.equal(ui.snapshot().data.settings.timingMode, 'simple');
  await ui.click('timing-mode', { timing: 'inspection' });
  assert.equal(ui.snapshot().data.settings.mode, 'last-layer');
  await ui.click('timer');
  assert.equal(ui.snapshot().phase, 'inspecting');
});

test('timing and cue controls cannot alter an active attempt and metadata reflects the start', async () => {
  const ui = await controller({ timingMode: 'inspection', inspectionAudio: true });
  ui.setTime(1000);
  await ui.click('timer');
  await ui.click('timing-mode', { timing: 'simple' });
  await ui.change('inspection-audio', { checked: false });
  assert.equal(ui.snapshot().data.settings.timingMode, 'inspection');
  assert.equal(ui.snapshot().data.settings.inspectionAudio, true);
  // Active metadata remains captured even if preferences are updated externally.
  ui.setSettings({ timingMode: 'simple', inspectionAudio: false });
  ui.setTime(6000);
  await ui.click('timer');
  ui.setTime(8000);
  await ui.click('timer');
  const attempt = ui.snapshot().data.attempts[0];
  assert.equal(attempt.timingMode, 'inspection');
  assert.equal(attempt.inspectionAudio, true);
  assert.equal(attempt.inspectionSeconds, 5);
  assert.equal(attempt.seconds, 2);
});

test('timing and cue history filters include legacy inspection and reset original records by ID', async () => {
  const c = CASES.find(c => c.id === 'CLL-S1');
  const ui = await controller({ mode: 'one-look', timingMode: 'inspection', inspectionAudio: false });
  const base = {
    caseId: c.id, algorithmId: c.algorithms[0].id, set: 'CLL', group: 'Sune',
    mode: 'one-look', color: 'white', preAuf: '', postAuf: '', orientation: '', finish: "R U R'", finishCaseId: "FF-LS-Uminus3", bottomAuf: '',
    seconds: 3, createdAt: '2026-09-10T10:00:00.000Z',
  };
  const attempts = [
    { ...base, id: 'legacy-zero', inspectionSeconds: 0 },
    { ...base, id: 'modern-silent', timingMode: 'inspection', inspectionAudio: false, inspectionSeconds: 8 },
    { ...base, id: 'modern-audio', timingMode: 'inspection', inspectionAudio: true, inspectionSeconds: 12 },
    { ...base, id: 'modern-simple', timingMode: 'simple', inspectionAudio: false, inspectionSeconds: null },
    { ...base, id: 'legacy-simple' },
  ];
  ui.setAttempts(attempts);
  assert.deepEqual(Array.from(ui.scopeAttempts(), attempt => attempt.id), ['legacy-zero', 'modern-silent']);
  ui.setSettings({ inspectionAudio: true });
  assert.deepEqual(Array.from(ui.scopeAttempts(), attempt => attempt.id), ['modern-audio']);
  ui.setInsightFilters({ timingMode: 'inspection', inspectionAudio: 'off', selectionOnly: true });
  assert.deepEqual(Array.from(ui.filteredInsights(), attempt => attempt.id), ['legacy-zero', 'modern-silent']);
  assert.equal(Object.hasOwn(attempts[0], 'timingMode'), false, 'display normalization must not mutate historical data');
  await ui.click('attempt', { id: 'legacy-zero' });
  assert.match(ui.nodes.get('#modal-root').innerHTML, /0\.00s/);
  assert.match(ui.nodes.get('#modal-root').innerHTML, /Inspect → solve → stop/);
  await ui.click('close-modal');
  await ui.click('reset-filtered');
  await ui.click('confirm-reset');
  assert.deepEqual(Array.from(ui.snapshot().data.attempts, attempt => attempt.id), ['modern-audio', 'modern-simple', 'legacy-simple']);
  ui.setInsightFilters({ timingMode: 'inspection', inspectionAudio: 'on' });
  assert.deepEqual(Array.from(ui.filteredInsights(), attempt => attempt.id), ['modern-audio']);
  ui.setInsightFilters({ timingMode: 'simple', inspectionAudio: 'off' });
  assert.deepEqual(Array.from(ui.filteredInsights(), attempt => attempt.id), ['modern-simple', 'legacy-simple']);
});

test('leaving the page cancels pending inspection cues without saving an attempt', async () => {
  const ui = await controller({ timingMode: 'inspection', inspectionAudio: true });
  await ui.click('timer');
  const cancelCount = ui.audioCalls.filter(call => call.method === 'cancel').length;
  ui.pagehide();
  assert.ok(ui.audioCalls.filter(call => call.method === 'cancel').length > cancelCount);
  assert.equal(ui.snapshot().data.attempts.length, 0);
});

for (const trainer of ['2x2', '5x5', '5x5-centres']) {
  const isTwo = trainer === '2x2', branch = trainer === '5x5' ? 'lte' : 'ltc';
  const timer = isTwo ? 'timer' : 'lte-timer', cancel = isTwo ? 'cancel-timer' : 'lte-cancel';
  const trainerSnapshot = ui => isTwo ? ui.snapshot() : trainer === '5x5' ? ui.lteSnapshot() : ui.ltcSnapshot();
  const trainerData = ui => isTwo ? ui.snapshot().data : ui.snapshot().data[branch];
  const activityEvents = ui => ui.windowEvents.filter(event => event.type === 'cornerlab-timer-state').map(event => event.detail.active);

  test(`${trainer} touch Cancel clears inspection and solving without recording, and reports timer activity`, async () => {
    const ui = await controller({ timingMode: 'inspection', inspectionAudio: true });
    trainerData(ui).settings.timingMode = 'inspection';
    trainerData(ui).settings.inspectionAudio = true;
    ui.switchTrainer(trainer);
    assert.equal(ui.timerActive(), false);
    for (const phase of ['inspecting', 'running']) {
      const saveCount = ui.saves.length;
      await ui.click(timer);
      if (phase === 'running') { ui.setTime(5000); await ui.click(timer); }
      assert.equal(trainerSnapshot(ui).phase, phase);
      assert.equal(ui.timerActive(), true);
      assert.equal(activityEvents(ui).at(-1), true);
      assert.match(ui.nodes.get('#app').innerHTML, /<button\b[^>]*class="timer timer-touch-target"/);
      assert.ok(ui.nodes.get('#app').innerHTML.includes(`data-action="${cancel}"`));
      await ui.click(cancel);
      assert.equal(trainerSnapshot(ui).phase, 'ready');
      assert.equal(trainerSnapshot(ui).lastResult, null);
      assert.equal(trainerData(ui).attempts.length, 0);
      assert.equal(ui.saves.length, saveCount);
      assert.equal(ui.timerActive(), false);
      assert.equal(activityEvents(ui).at(-1), false);
    }
    assert.deepEqual(activityEvents(ui).slice(-4), [true, false, true, false]);
  });

  test(`${trainer} backgrounding or leaving aborts an active timer and preserves completed results`, async () => {
    const ui = await controller({ timingMode: 'inspection' });
    trainerData(ui).settings.timingMode = 'inspection';
    ui.switchTrainer(trainer);
    ui.setTime(1000); await ui.click(timer);
    ui.setTime(2000); await ui.click(timer);
    ui.setTime(5000); await ui.click(timer);
    const completed = structuredClone(trainerData(ui).attempts);
    assert.equal(completed.length, 1);
    assert.equal(ui.timerActive(), false);
    await ui.click(timer); // Load a fresh case after the completed result.
    for (const [phase, leave] of [['inspecting', () => ui.visibilityChange(true)], ['running', () => ui.pagehide()]]) {
      const saves = ui.saves.length;
      await ui.click(timer);
      if (phase === 'running') { ui.setTime(8000); await ui.click(timer); }
      assert.equal(trainerSnapshot(ui).phase, phase);
      ui.visibilityChange(false);
      assert.equal(trainerSnapshot(ui).phase, phase, 'becoming visible does not interrupt an active attempt');
      leave();
      assert.equal(trainerSnapshot(ui).phase, 'ready');
      assert.equal(trainerSnapshot(ui).lastResult, null);
      assert.deepEqual(structuredClone(trainerData(ui).attempts), completed);
      assert.equal(ui.saves.length, saves, 'interruption must not save an unfinished result');
      assert.equal(ui.timerActive(), false);
      assert.equal(activityEvents(ui).at(-1), false);
      ui.visibilityChange(false);
      assert.equal(trainerSnapshot(ui).phase, 'ready', 'returning never resumes the interrupted solve');
    }
  });
}


test('saved one-look results retain the PDF case and independent bottom rotation for filtering and reset', async () => {
  const ui = await controller({ mode: 'one-look', timingMode: 'simple', bottomAuf: ["D'"], finishIds: ['FF-DD-KT5'] });
  await ui.click('timer');
  ui.setTime(4000);
  await ui.click('timer');
  const { lastResult } = ui.snapshot();
  assert.equal(lastResult.finishCaseId, 'FF-DD-KT5');
  assert.equal(lastResult.bottomAuf, "D'");
  assert.equal(lastResult.finish, "R U2 R2 U R2");
  assert.equal(lastResult.seconds, 3);
  ui.setAttempts([lastResult, { ...lastResult, id: 'different-bottom', bottomAuf: '' }, { ...lastResult, id: 'different-face', finishCaseId: 'FF-UU-BC1' }]);
  ui.setInsightFilters({ finishCaseId: 'FF-DD-KT5', bottomAuf: "D'" });
  assert.deepEqual(Array.from(ui.filteredInsights(), a => a.id), [lastResult.id]);
  await ui.click('confirm-reset');
  assert.deepEqual(Array.from(ui.snapshot().data.attempts, a => a.id), ['different-bottom', 'different-face']);
});

test('switching trainers preserves two independent practice selections and returns to 2×2', async () => {
  const ui = await controller({selectedCases:['CLL-S1','EG1-O-Solved'],preAuf:['U2']});
  const before=structuredClone(ui.snapshot().data.settings);
  ui.switchTrainer('5x5');
  assert.equal(ui.snapshot().data.trainer,'5x5');
  assert.equal(ui.snapshot().data.lte.settings.selectedCases.length,13);
  assert.equal(ui.lteSnapshot().current.algorithm.id,ui.lteSnapshot().current.case.defaultAlgorithmId);
  assert.match(ui.nodes.get('#app').innerHTML,/Finish the last two/);
  assert.deepEqual(ui.snapshot().data.settings,before);
  ui.switchTrainer('2x2');
  assert.deepEqual(ui.snapshot().data.settings,before);
  assert.match(ui.nodes.get('#app').innerHTML,/Make every corner count/);
});

test('5×5 timer events are routed exclusively to LTE history and prevent switching during a solve', async () => {
  const ui = await controller();
  ui.switchTrainer('5x5');
  ui.setTime(1000); ui.key('keydown'); ui.key('keyup');
  assert.equal(ui.lteSnapshot().phase,'running');
  ui.switchTrainer('2x2');
  assert.equal(ui.snapshot().data.trainer,'5x5');
  ui.setTime(4250); ui.key('keydown'); ui.key('keyup');
  assert.equal(ui.lteSnapshot().phase,'done');
  assert.equal(ui.snapshot().data.lte.attempts.length,1);
  assert.equal(ui.snapshot().data.lte.attempts[0].seconds,3.25);
  assert.equal(ui.snapshot().data.attempts.length,0);
  assert.equal(ui.snapshot().phase,'ready');
  ui.switchTrainer('2x2');
  assert.equal(ui.snapshot().data.trainer,'2x2');
});

test('centres switching and selections preserve both existing trainers and a saved centres startup', async () => {
  const ui = await controller({ selectedCases: ['CLL-S1', 'EG2-S1'], colors: ['green'] });
  const data = ui.snapshot().data;
  data.lte.settings.selectedCases = ['LTE-03'];
  data.lte.preferences['LTE-03'] = 'LTE-03-a3';
  const before2 = structuredClone({ settings: data.settings, preferences: data.preferences });
  const beforeEdges = structuredClone(data.lte);
  await ui.change('trainer-select', { value: '5x5-centres' });
  assert.equal(data.trainer, '5x5-centres');
  assert.equal(data.ltc.settings.selectedCases.length, 19);
  assert.ok(ui.ltcSnapshot().current.case.id.startsWith('LTC-'));
  assert.match(ui.nodes.get('#app').innerHTML, /Complete the last two centres/);
  await ui.change('', { dataset: { lteCase: 'LTC-01' }, type: 'checkbox', checked: false });
  assert.equal(data.ltc.settings.selectedCases.includes('LTC-01'), false);
  assert.deepEqual(data.lte, beforeEdges);
  assert.deepEqual({ settings: data.settings, preferences: data.preferences }, before2);
  ui.switchTrainer('5x5');
  assert.equal(ui.lteSnapshot().current.case.id, 'LTE-03');
  assert.equal(ui.lteSnapshot().current.algorithm.id, 'LTE-03-a3');
  ui.switchTrainer('5x5-centres');
  assert.equal(data.ltc.settings.selectedCases.includes('LTC-01'), false);
  assert.equal(data.ltc.settings.selectedCases.length, 18);
  const stored = freshData();
  stored.trainer = '5x5-centres'; stored.ltc.settings.selectedCases = ['LTC-19'];
  const reloaded = await controller({}, () => .25, stored);
  assert.equal(reloaded.ltcSnapshot().current.case.id, 'LTC-19');
  assert.match(reloaded.nodes.get('#app').innerHTML, /Last two centres/);
});

for (const timingMode of ['simple', 'inspection']) test(`centres ${timingMode} timing records only centres and blocks changing trainers`, async () => {
  const ui = await controller();
  const data = ui.snapshot().data;
  data.ltc.settings.timingMode = timingMode;
  data.ltc.settings.inspectionAudio = true;
  ui.switchTrainer('5x5-centres');
  ui.setTime(0); ui.key('keydown'); ui.key('keyup');
  assert.equal(ui.ltcSnapshot().phase, timingMode === 'inspection' ? 'inspecting' : 'running');
  for (const trainer of ['2x2', '5x5']) {
    ui.switchTrainer(trainer);
    assert.equal(data.trainer, '5x5-centres');
  }
  if (timingMode === 'inspection') {
    ui.setTime(12000); ui.key('keydown'); ui.key('keyup');
    assert.equal(ui.ltcSnapshot().phase, 'running');
    assert.equal(ui.audioCalls.filter(call => call.method === 'start').length, 1);
    ui.switchTrainer('5x5');
    assert.equal(data.trainer, '5x5-centres');
  }
  ui.setTime(timingMode === 'inspection' ? 15500 : 3500);
  ui.key('keydown'); ui.key('keyup');
  const result = data.ltc.attempts[0];
  assert.equal(ui.ltcSnapshot().phase, 'done');
  assert.equal(result.seconds, 3.5);
  assert.equal(result.inspectionSeconds, timingMode === 'inspection' ? 12 : null);
  assert.equal(result.inspectionAudio, timingMode === 'inspection');
  assert.equal(result.set, 'L2C');
  assert.equal(data.attempts.length, 0);
  assert.equal(data.lte.attempts.length, 0);
  assert.match(ui.nodes.get('#app').innerHTML, /PREVIOUS SCRAMBLE · COMPLETED/);
  assert.doesNotThrow(() => validateData(ui.saves.at(-1)));
  ui.key('keydown'); ui.key('keyup');
  assert.equal(ui.ltcSnapshot().phase, 'ready');
  assert.doesNotMatch(ui.nodes.get('#app').innerHTML, /PREVIOUS SCRAMBLE · COMPLETED/);
  ui.switchTrainer('2x2');
  assert.equal(data.trainer, '2x2');
});

test('centres filtered reset affects only matching centres results even with shared history IDs', async () => {
  const ui = await controller();
  const data = ui.snapshot().data;
  const centre = CASES_CENTRES[0], edge = CASES5[0];
  const record = item => ({
    id: 'shared-id', caseId: item.id, set: item.set, group: item.group,
    algorithmId: item.algorithms[0].id, algorithm: item.algorithms[0].alg,
    orientation: '', scrambleStyle: 'provided', timingMode: 'simple', inspectionAudio: false,
    seconds: 5.5, inspectionSeconds: null, recallFail: false, dnf: false, assisted: false,
    createdAt: '2026-10-04T10:00:00Z', sessionId: 'session-1', scramble: 'R', solution: "R'",
  });
  data.attempts = [{ id: 'shared-id', caseId: 'CLL-S1', seconds: 4, createdAt: '2026-10-04T10:00:00Z' }];
  data.lte.attempts = [record(edge)];
  data.ltc.attempts = [record(centre), { ...record(centre), id: 'keep-grip', orientation: 'y' }];
  const before2 = structuredClone(data.attempts), beforeEdges = structuredClone(data.lte);
  ui.switchTrainer('5x5-centres');
  await ui.click('nav', { page: 'insights' });
  await ui.change('', { dataset: { lteFilter: 'orientation' }, value: 'none' });
  await ui.click('lte-reset');
  assert.match(ui.nodes.get('#modal-root').innerHTML, /<strong>1<\/strong> results/);
  assert.equal(data.ltc.attempts.length, 2, 'previewing reset must not delete results');
  await ui.click('lte-confirm-reset');
  assert.deepEqual(Array.from(data.ltc.attempts, attempt => attempt.id), ['keep-grip']);
  assert.deepEqual(data.attempts, before2);
  assert.deepEqual(data.lte, beforeEdges);
});

test('full-set progress controls work in every trainer without modifying practice selections or stored data', async () => {
  const ui = await controller();
  const data = ui.snapshot().data;
  data.attempts = Array.from({ length: 6 }, (_, index) => ({
    id: `chart-${index}`, caseId: 'CLL-S1', seconds: 20 - index,
    createdAt: new Date(Date.UTC(2026, 9, index + 1)).toISOString(),
    mode: 'last-layer', timingMode: 'simple',
  }));
  for (const [trainer, expectedSet] of [['2x2', 'cll'], ['5x5', 'edges'], ['5x5-centres', 'centres']]) {
    ui.switchTrainer(trainer);
    await ui.click('nav', { page: 'insights' });
    assert.match(ui.nodes.get('#app').innerHTML, /Full-set progress/);
    assert.equal(ui.progressSnapshot().setId, expectedSet);
    const before = structuredClone(data), saves = ui.saves.length;
    await ui.change('', { dataset: { progress: 'set' }, value: 'cll-eg1-eg2' });
    await ui.change('', { dataset: { progress: 'window' }, value: '3' });
    await ui.change('', { dataset: { progress: 'timing' }, value: 'inspection' });
    await ui.change('', { dataset: { progress: 'clean' }, type: 'checkbox', checked: true });
    const chart = ui.progressSnapshot();
    assert.equal(chart.setId, 'cll-eg1-eg2');
    assert.equal(chart.windowSize, 3);
    assert.equal(chart.timingMode, 'inspection');
    assert.equal(chart.cleanOnly, true);
    assert.equal(chart.result.totalCases, CASES.length);
    await ui.change('', { dataset: { progress: 'timing' }, value: 'all' });
    await ui.change('', { dataset: { progress: 'range-start' }, value: '2' });
    await ui.change('', { dataset: { progress: 'range-end' }, value: '4' });
    assert.equal(ui.progressSnapshot().rangeStart, 2);
    assert.equal(ui.progressSnapshot().rangeEnd, 4);
    assert.equal(ui.progressSnapshot().displayedPoints.length, 3);
    assert.equal(ui.progressSnapshot().result.points.length, 6, 'zoom retains full historical calculation');
    const selectedDates = ui.progressSnapshot().displayedPoints.map(point => point.date);
    for (const [field, value, checked] of [['window', '5'], ['clean', '', false], ['set', 'cll'], ['timing', 'simple']]) {
      await ui.change('', { dataset: { progress: field }, value, checked });
      assert.deepEqual(ui.progressSnapshot().displayedPoints.map(point => point.date), selectedDates, `${field} retains the chosen date range`);
    }
    await ui.change('', { dataset: { progress: 'mode' }, value: 'one-look' });
    assert.equal(ui.progressSnapshot().displayedPoints.length, 0);
    await ui.change('', { dataset: { progress: 'mode' }, value: 'last-layer' });
    assert.deepEqual(ui.progressSnapshot().displayedPoints.map(point => point.date), selectedDates, 'returning from empty results restores the range');
    await ui.click('progress-all-time');
    assert.equal(ui.progressSnapshot().displayedPoints.length, 6);
    assert.deepEqual(data, before);
    assert.equal(ui.saves.length, saves);
  }
});
