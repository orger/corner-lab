import test from 'node:test';
import assert from 'node:assert/strict';
import { createLTETrainer } from '../app/lte.js';
import { freshData, validateData } from '../app/storage.js';
import { CASES_SQ1 } from '../app/catalog-square1.js';
import { createSquare1Drill, solvedSquare1, applySquare1Alg, inverseSquare1, isCubeShape, parseSquare1Alg } from '../app/square1.js';
import { square1SVG } from '../app/square1-view.js';
import { getSquare1CaseNotes } from '../app/square1-case-notes.js';

function controller(settings = {}, options = {}) {
  const data = freshData();
  Object.assign(data.sq1.settings, { selectedCases: [CASES_SQ1[0].id] }, settings);
  const saves = [], toasts = [], dialogs = [], downloads = [], audio = [], nodes = new Map();
  let time = 0, page = 'train';
  const trainer = createLTETrainer({
    kind: 'square1', catalog: CASES_SQ1, storageKey: 'sq1', setId: 'CS',
    diagram: square1SVG, buildDrill: createSquare1Drill,
    previewState: alg => applySquare1Alg(solvedSquare1(), inverseSquare1(alg)),
    getData: () => data, persist: () => saves.push(structuredClone(data)), render() {},
    toast: message => toasts.push(message), navigate: value => { page = value; },
    modal: (title, body, footer) => dialogs.push({ title, body, footer }), closeModal() {},
    exportBackup() {}, importBackup() {}, download: (...args) => downloads.push(args),
    progressHTML: () => '<section>Full-set progress</section>',
    document: { querySelector: selector => nodes.get(selector) || null },
    window: { confirm: () => true }, now: () => time, random: () => .25,
    requestFrame: () => 1, cancelFrame() {},
    createAudio: () => ({ start: () => audio.push('start'), cancel: () => audio.push('cancel') }),
    ...options,
  });
  trainer.next(false);
  return {
    data, trainer, saves, toasts, dialogs, nodes, downloads, audio,
    setTime: value => { time = value; },
    currentPage: () => page,
    click(action, dataset = {}) {
      const element = { dataset: { action, ...dataset } };
      return trainer.click({ target: { matches: () => false, closest: selector => selector === '[data-action]' ? element : null } });
    },
    change(dataset, value, extras = {}) {
      return trainer.change({ target: { dataset, value, type: 'select', ...extras } });
    },
  };
}

const otherTrainers = data => structuredClone({ settings: data.settings, preferences: data.preferences, attempts: data.attempts, lte: data.lte, ltc: data.ltc });
const escaped = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll("'", '&#39;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

function attempt(item, overrides = {}) {
  return {
    id: `${item.id}-fixture`, caseId: item.id, set: 'CS', group: item.group,
    algorithmId: item.algorithms[0].id, algorithm: item.algorithms[0].alg,
    orientation: '', scrambleStyle: 'provided', timingMode: 'simple', inspectionAudio: false,
    seconds: 5, inspectionSeconds: null, recallFail: false, dnf: false, assisted: false,
    createdAt: '2026-11-18T10:00:00.000Z', sessionId: 'fixture',
    scramble: inverseSquare1(item.algorithms[0].alg), solution: item.algorithms[0].alg,
    ...overrides,
  };
}

test('Square-1 controller builds every case and uses shape diagrams throughout its pages', async () => {
  const ui = controller();
  for (const item of CASES_SQ1) {
    ui.data.sq1.settings.selectedCases = [item.id];
    ui.trainer.next(false);
    const current = ui.trainer.snapshot().current;
    assert.ok(current, `${item.id}: ${ui.toasts.join(', ')}`);
    assert.equal(current.case.id, item.id);
    assert.equal(isCubeShape(current.state), false);
    assert.equal(isCubeShape(applySquare1Alg(current.state, current.solution)), true);
  }
  const pages = ['train', 'library', 'insights', 'settings'].map(page => ui.trainer.content(page));
  assert.match(pages[0], /Scrambled shape pattern/);
  assert.match(pages[0], /Disguised scramble/);
  assert.match(pages[0], /Starting layer orientation/);
  assert.match(pages[0], /Random top &amp; bottom turns/);
  assert.doesNotMatch(pages[0], /option value="varied"/);
  assert.match(pages[1], /top \/ bottom shape pairs/);
  assert.match(pages[2], /Full-set progress/);
  assert.match(pages[3], /30° steps/);
  assert.doesNotMatch(pages.join('\n'), /5×5|5 × 5|Rw|PDF|first column|Starting grip|View all six faces/);
  await ui.click('lte-detail', { id: CASES_SQ1[0].id });
  assert.match(ui.dialogs.at(-1).body, /reference alignment/);
  assert.doesNotMatch(ui.dialogs.at(-1).body, /Rw|5×5|PDF/);
  assert.deepEqual(ui.toasts, []);
});

test('Square-1 random alignment reveals the complete solution and keeps timing data isolated', async () => {
  const ui = controller({ selectedCases: [CASES_SQ1.at(-1).id], scrambleStyle: 'varied' });
  const before = otherTrainers(ui.data);
  const current = ui.trainer.snapshot().current;
  assert.match(ui.trainer.content('train'), /option value="varied" selected>Inverse algorithm \(legacy\)/);
  await ui.click('lte-reveal');
  assert.ok(ui.trainer.content('train').includes(`<span class="solution-label">Solve</span>${escaped(current.solution)}</p>`));
  assert.equal(isCubeShape(applySquare1Alg(current.state, current.solution)), true);
  ui.setTime(1000); await ui.click('lte-timer');
  assert.equal(ui.trainer.snapshot().phase, 'running');
  assert.doesNotMatch(ui.trainer.content('train'), /sq1-preview/);
  ui.setTime(4250); await ui.click('lte-timer');
  const result = ui.data.sq1.attempts[0];
  assert.equal(result.seconds, 3.25);
  assert.equal(result.assisted, true);
  assert.equal(result.inspectionSeconds, null);
  assert.equal(result.scrambleStyle, 'varied');
  assert.equal(result.scramble, current.scramble);
  assert.equal(result.solution, current.solution);
  assert.match(ui.trainer.content('train'), /PREVIOUS SCRAMBLE · COMPLETED/);
  assert.deepEqual(otherTrainers(ui.data), before);
  assert.doesNotThrow(() => validateData(ui.saves.at(-1)));
});

test('cube-shape route and recognition notes appear after an attempt and stay with its case', async () => {
  const item = CASES_SQ1.find(item => getSquare1CaseNotes(item.id)?.tip);
  assert(item, 'the supplied table contains recognition notes');
  const notes = getSquare1CaseNotes(item.id);
  const ui = controller({ selectedCases: [item.id], timingMode: 'inspection' });
  const current = ui.trainer.snapshot().current;
  assert.doesNotMatch(ui.trainer.content('train'), /sq1-case-notes/);
  await ui.click('lte-timer');
  assert.doesNotMatch(ui.trainer.content('train'), /sq1-case-notes/);
  ui.setTime(4000); await ui.click('lte-timer');
  assert.doesNotMatch(ui.trainer.content('train'), /sq1-case-notes/);
  ui.setTime(6250); await ui.click('lte-timer');
  const html = ui.trainer.content('train');
  assert.match(html, /aria-label="Your cube-shape notes"/);
  assert.ok(html.includes(escaped(notes.label)));
  assert.ok(html.includes(`<dd>${escaped(notes.route)}</dd>`));
  assert.ok(html.includes(`<dd>${escaped(notes.tip)}</dd>`));
  assert.ok(html.includes(`<span class="solution-label">Solve</span>${escaped(current.solution)}</p>`), 'personal route does not replace the chosen algorithm');
  assert.match(html, /Your route may differ from the move sequence above/);
  assert.equal(ui.data.sq1.attempts[0].assisted, false);
  assert.equal(ui.data.sq1.attempts[0].inspectionSeconds, 4);
  assert.equal(ui.data.sq1.attempts[0].solution, current.solution);
  assert.doesNotThrow(() => validateData(ui.saves.at(-1)));
  await ui.click('lte-reveal');
  assert.doesNotMatch(ui.trainer.content('train'), /sq1-case-notes/);
  await ui.click('lte-next');
  assert.doesNotMatch(ui.trainer.content('train'), /sq1-case-notes/);
});

test('early cube-shape notes use the existing assisted reveal and disappear during solving', async () => {
  const item = CASES_SQ1.find(item => getSquare1CaseNotes(item.id)?.tip);
  const ui = controller({ selectedCases: [item.id] });
  await ui.click('lte-reveal');
  assert.match(ui.trainer.content('train'), /sq1-case-notes/);
  await ui.click('lte-timer');
  assert.doesNotMatch(ui.trainer.content('train'), /sq1-case-notes/);
  ui.setTime(2000); await ui.click('lte-timer');
  assert.match(ui.trainer.content('train'), /sq1-case-notes/);
  assert.equal(ui.data.sq1.attempts[0].assisted, true);
  // A different trainer kind must never show cube-shape notes, even if a
  // supplied catalogue happens to use one of the same identifiers.
  const other = controller({ selectedCases: [item.id] }, { kind: 'square1-obl' });
  await other.click('lte-reveal');
  assert.doesNotMatch(other.trainer.content('train'), /sq1-case-notes|Your shape route/);
});

test('Square-1 three-press timing records inspection separately and cancellation silences cues', async () => {
  const ui = controller({ timingMode: 'inspection', inspectionAudio: true });
  await ui.click('lte-timer');
  assert.equal(ui.trainer.snapshot().phase, 'inspecting');
  assert.equal(ui.audio.filter(call => call === 'start').length, 1);
  const current = ui.trainer.snapshot().current;
  await ui.click('nav', { page: 'library' });
  await ui.change({ lteSetting: 'scrambleStyle' }, 'varied');
  assert.equal(ui.currentPage(), 'train');
  assert.equal(ui.trainer.snapshot().current, current);
  assert.equal(ui.data.sq1.settings.scrambleStyle, 'disguised');
  ui.setTime(12500); await ui.click('lte-timer');
  assert.equal(ui.trainer.snapshot().phase, 'running');
  ui.setTime(17000); await ui.click('lte-timer');
  assert.equal(ui.data.sq1.attempts[0].inspectionSeconds, 12.5);
  assert.equal(ui.data.sq1.attempts[0].seconds, 4.5);
  assert.equal(ui.data.sq1.attempts[0].inspectionAudio, true);
  assert.doesNotThrow(() => validateData(ui.saves.at(-1)));
  await ui.click('lte-next'); await ui.click('lte-timer');
  ui.trainer.interrupt();
  assert.equal(ui.trainer.snapshot().phase, 'ready');
  assert.equal(ui.data.sq1.attempts.length, 1);
  assert.equal(ui.audio.at(-1), 'cancel');
});

test('Square-1 learning batches cover only selected cases and preferences apply to later drills', async () => {
  const chosen = CASES_SQ1.slice(0, 4), ids = chosen.map(c => c.id);
  const ui = controller({ strategy: 'learning', selectedCases: ids });
  for (let batch = 0; batch < 2; batch++) {
    const seen = [];
    for (let i = 0; i < ids.length; i++) {
      seen.push(ui.trainer.snapshot().current.case.id);
      if (i < ids.length - 1) ui.trainer.next(false);
    }
    assert.deepEqual([...seen].sort(), [...ids].sort());
    if (batch === 0) ui.trainer.next(false);
  }
  const item = chosen[0], current = ui.trainer.snapshot().current;
  await ui.click('lte-detail', { id: item.id });
  await ui.change({}, item.algorithms[0].id, { name: 'lte-algorithm' });
  assert.equal(ui.trainer.snapshot().current, current);
  assert.equal(ui.data.sq1.preferences[item.id], item.algorithms[0].id);
  await ui.click('lte-only-case', { id: item.id });
  assert.equal(ui.trainer.snapshot().current.case.id, item.id);
  assert.equal(ui.trainer.snapshot().current.learningBatch.total, 1);
  await ui.change({ lteCase: item.id }, '', { type: 'checkbox', checked: false });
  await ui.click('lte-next');
  assert.equal(ui.trainer.snapshot().current, null);
  assert.match(ui.trainer.content('train'), /Select at least one case/);
  assert.doesNotThrow(() => validateData(ui.saves.at(-1)));
});

test('Square-1 saved practices restore subset and conditions without introducing cube grips', async () => {
  const ui = controller({ selectedCases: CASES_SQ1.slice(0, 2).map(c => c.id), scrambleStyle: 'varied', strategy: 'slowest', slowWindow: 7, rankCount: 1 });
  const settings = structuredClone(ui.data.sq1.settings);
  await ui.click('lte-grip', { value: 'y' });
  assert.deepEqual(ui.data.sq1.settings.orientations, ['']);
  ui.nodes.set('#lte-preset-name', { value: 'Shapes to learn' });
  await ui.click('lte-save-preset');
  ui.data.sq1.settings.scrambleStyle = 'provided';
  ui.data.sq1.settings.slowWindow = 2;
  ui.data.sq1.settings.layerAlignment = 'reference';
  await ui.click('lte-load-preset', { id: ui.data.sq1.presets[0].id });
  assert.deepEqual(ui.data.sq1.settings, settings);
  assert.doesNotThrow(() => validateData(ui.saves.at(-1)));
});

test('Square-1 insight inspection metrics respect filters and explicit assisted flags', async () => {
  const ui = controller(), [a, b] = CASES_SQ1;
  ui.data.sq1.attempts = [
    attempt(a, { id: 'a7', timingMode: 'inspection', inspectionSeconds: 7 }),
    attempt(a, { id: 'a8', timingMode: 'inspection', inspectionSeconds: 8, recallFail: true }),
    attempt(a, { id: 'a15', timingMode: 'inspection', inspectionSeconds: 15, dnf: true }),
    attempt(a, { id: 'a1', timingMode: 'inspection', inspectionSeconds: 1, assisted: true }),
    attempt(a, { id: 'manual', inspectionSeconds: null }),
    attempt(b, { id: 'b1', timingMode: 'inspection', inspectionSeconds: 1 }),
  ];
  await ui.change({ lteFilter: 'caseId' }, a.id);
  const html = ui.trainer.content('insights');
  assert.match(html, /3 measured inspections/);
  assert.match(html, /Average inspection<\/div><div class="metric-value">10.00s/);
  assert.match(html, /Under 15 seconds<\/div><div class="metric-value">67%/);
  assert.match(html, /Under 12 seconds<\/div><div class="metric-value">67%/);
  assert.match(html, /Under 8 seconds<\/div><div class="metric-value">33%/);
  const others = otherTrainers(ui.data);
  await ui.click('lte-csv');
  assert.equal(ui.downloads[0][0], 'Corner-Lab-Square1-cube-shape-results.csv');
  assert.ok(ui.downloads[0][1].includes('a7'));
  assert.ok(!ui.downloads[0][1].includes('b1'));
  await ui.click('lte-reset');
  assert.match(ui.dialogs.at(-1).title, /Square-1/);
  await ui.click('lte-confirm-reset');
  assert.deepEqual(ui.data.sq1.attempts.map(a => a.id), ['b1']);
  assert.deepEqual(otherTrainers(ui.data), others);
});


test('Square-1 disguise and final layer orientation are independent and record the generated conditions', async () => {
  const ui = controller({ scrambleStyle: 'provided', layerAlignment: 'reference' });
  const reference = ui.trainer.snapshot().current;
  assert.equal(reference.layerAlignment, 'reference');
  assert.equal(reference.initialTop, 0);
  assert.equal(reference.initialBottom, 0);
  assert.equal(reference.scramble, inverseSquare1(reference.algorithm.alg));
  await ui.change({ lteSetting: 'scrambleStyle' }, 'disguised');
  await ui.change({ lteSetting: 'layerAlignment' }, 'random');
  assert.equal(ui.trainer.snapshot().current, reference, 'changing settings applies to the next scramble');
  assert.match(ui.trainer.content('train'), /<span class="condition-tag">Inverse algorithm<\/span><span class="condition-tag">Reference orientation<\/span>/);
  ui.nodes.set('#lte-manual', { value: '6.3' });
  await ui.click('lte-manual');
  const first = ui.data.sq1.attempts[0];
  assert.equal(first.scrambleStyle, 'provided');
  assert.equal(first.layerAlignment, 'reference');
  assert.equal(first.initialTop, 0);
  assert.equal(first.initialBottom, 0);
  await ui.click('lte-next');
  const mixed = ui.trainer.snapshot().current;
  assert.equal(mixed.scrambleStyle, 'disguised');
  assert.equal(mixed.layerAlignment, 'random');
  assert.equal(parseSquare1Alg(mixed.scramble).at(-1).type, 'turn');
  assert.ok(isCubeShape(applySquare1Alg(mixed.state, mixed.solution)));
  await ui.change({ lteSetting: 'scrambleStyle' }, 'provided');
  await ui.change({ lteSetting: 'layerAlignment' }, 'reference');
  await ui.click('lte-manual');
  const second = ui.data.sq1.attempts[1];
  assert.equal(second.scrambleStyle, 'disguised');
  assert.equal(second.layerAlignment, 'random');
  assert.equal(second.initialTop, mixed.initialTop);
  assert.equal(second.initialBottom, mixed.initialBottom);
  assert.deepEqual(ui.trainer.scoped().map(a => a.id), [first.id]);
  await ui.change({ lteSetting: 'scrambleStyle' }, 'disguised');
  await ui.change({ lteSetting: 'layerAlignment' }, 'random');
  assert.deepEqual(ui.trainer.scoped().map(a => a.id), [second.id]);
  await ui.change({ lteSetting: 'layerAlignment' }, 'reference');
  await ui.click('lte-next');
  const disguisedReference = ui.trainer.snapshot().current;
  assert.equal(disguisedReference.scrambleStyle, 'disguised');
  assert.equal(disguisedReference.layerAlignment, 'reference');
  assert.equal(disguisedReference.initialTop, 0);
  assert.equal(disguisedReference.initialBottom, 0);
  assert.ok(isCubeShape(applySquare1Alg(disguisedReference.state, disguisedReference.solution)));
  await ui.change({ lteSetting: 'scrambleStyle' }, 'provided');
  await ui.change({ lteSetting: 'layerAlignment' }, 'random');
  await ui.click('lte-next');
  const inverseRandom = ui.trainer.snapshot().current;
  assert.equal(inverseRandom.scrambleStyle, 'provided');
  assert.equal(inverseRandom.layerAlignment, 'random');
  assert.equal(parseSquare1Alg(inverseRandom.scramble).at(-1).type, 'turn');
  assert.ok(isCubeShape(applySquare1Alg(inverseRandom.state, inverseRandom.solution)));
  assert.doesNotThrow(() => validateData(ui.saves.at(-1)));
});

test('Square-1 alignment filters, rankings and exports interpret old results without rewriting them', async () => {
  const item = CASES_SQ1[0], ui = controller({ scrambleStyle: 'provided', layerAlignment: 'reference' });
  ui.data.sq1.attempts = [
    attempt(item, { id: 'old-reference' }),
    attempt(item, { id: 'old-random', scrambleStyle: 'varied' }),
    attempt(item, { id: 'new-random', scrambleStyle: 'disguised', layerAlignment: 'random', initialTop: 2, initialBottom: -3 }),
    attempt(item, { id: 'new-reference', scrambleStyle: 'disguised', layerAlignment: 'reference', initialTop: 0, initialBottom: 0 }),
  ];
  const before = structuredClone(ui.data.sq1.attempts);
  assert.deepEqual(ui.trainer.scoped().map(a => a.id), ['old-reference']);
  await ui.change({ lteSetting: 'layerAlignment' }, 'random');
  assert.deepEqual(ui.trainer.scoped(), []);
  await ui.change({ lteSetting: 'scrambleStyle' }, 'varied');
  assert.deepEqual(ui.trainer.scoped().map(a => a.id), ['old-random']);
  await ui.change({ lteFilter: 'layerAlignment' }, 'reference');
  assert.deepEqual(ui.trainer.filtered().map(a => a.id), ['old-reference', 'new-reference']);
  await ui.change({ lteFilter: 'layerAlignment' }, 'random');
  assert.deepEqual(ui.trainer.filtered().map(a => a.id), ['old-random', 'new-random']);
  await ui.change({ lteFilter: 'scrambleStyle' }, 'disguised');
  assert.deepEqual(ui.trainer.filtered().map(a => a.id), ['new-random']);
  await ui.change({}, 'layerAlignment', { id: 'lte-insight-group' });
  assert.match(ui.trainer.content('insights'), /Random top &amp; bottom turns/);
  await ui.click('lte-attempt', { id: 'new-random' });
  assert.match(ui.dialogs.at(-1).body, /Top \/ bottom offset from reference<\/dt><dd>\(2,-3\)<\/dd>/);
  await ui.click('lte-csv');
  const csv = ui.downloads.at(-1)[1];
  assert.match(csv.split('\n')[0], /scrambleStyle,layerAlignment,initialTop,initialBottom/);
  assert.match(csv, /"disguised","random","2","-3"/);
  assert.doesNotMatch(csv, /old-reference|old-random|new-reference/);
  assert.deepEqual(ui.data.sq1.attempts, before);
  await ui.click('lte-confirm-reset');
  assert.deepEqual(ui.data.sq1.attempts.map(a => a.id), ['old-reference', 'old-random', 'new-reference']);
});
