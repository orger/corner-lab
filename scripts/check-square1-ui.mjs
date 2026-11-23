// End-to-end checks use an isolated browser profile and synthetic solves.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const runtimeRequire = createRequire(`${process.env.CORNER_LAB_RUNTIME || process.env.HOME + '/.cache/codex-runtimes/codex-primary-runtime/dependencies/node'}/package.json`);
const { chromium } = runtimeRequire('playwright');
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const base = process.env.CORNER_LAB_TEST_URL || 'http://127.0.0.1:8768/';
const ready = () => page.waitForSelector('#trainer-select');
const stored = () => page.evaluate(async () => (await import('./storage.js')).loadData());
const navigate = name => page.locator(`.navigation [data-page="${name}"]`).click();
const fits = async label => assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${label} overflows the phone viewport`);
try {
  await page.goto(base);
  await ready();
  await page.locator('#trainer-select').selectOption('square1');
  assert(await page.locator('.sq1-preview svg').count());
  await page.locator('.sq1-reference summary').click();
  assert(await page.locator('.sq1-reference svg').isVisible());
  await page.locator('.sq1-reference summary').click();
  assert.equal((await stored()).sq1.attempts.length, 0);
  await page.locator('[data-lte-setting="scrambleStyle"]').selectOption('disguised');
  await page.locator('[data-lte-setting="layerAlignment"]').selectOption('random');
  await page.locator('[data-lte-setting="strategy"]').selectOption('learning');
  await page.locator('.builder [data-action="lte-next"]').click();
  assert((await page.locator('.condition-strip').innerText()).includes('Learning batch'));
  assert.equal(await page.locator('.sq1-case-notes').count(), 0, 'personal notes are hidden before reveal');
  const scrambleText = await page.locator('.scramble.lte-scramble').innerText();
  assert.match(scrambleText, /\/\s*\(-?\d+,-?\d+\)$/);
  assert(scrambleText.split('/').length - 1 >= 5, 'disguised setup has at least five slices');
  await page.locator('#lte-manual').fill('4.25');
  await page.locator('[data-action="lte-manual"]').click();
  assert(await page.locator('.scramble-completed').count());
  await page.waitForFunction(async () => (await (await import('./storage.js')).loadData()).sq1.attempts.length === 1);
  const completed = (await stored()).sq1.attempts[0];
  const completedNotes = await page.evaluate(async caseId => (await import('./square1-case-notes.js')).getSquare1CaseNotes(caseId), completed.caseId);
  assert(completedNotes, 'the completed case maps to the supplied notes table');
  assert.equal(await page.locator('.sq1-case-notes').getAttribute('data-sq1-notes-case'), completed.caseId);
  assert((await page.locator('.sq1-case-notes').innerText()).includes(completedNotes.route));
  if (completedNotes.tip) assert((await page.locator('.sq1-case-notes').innerText()).includes(completedNotes.tip));
  await page.locator('#lte-timer-display').click();
  assert.equal(await page.locator('.sq1-case-notes').count(), 0, 'next case hides previous notes');
  await page.locator('[data-action="lte-timing"][data-mode="inspection"]').click();
  await page.locator('#lte-timer-display').click();
  assert(await page.locator('.timer-zone.inspecting').count());
  assert(await page.locator('#trainer-select').isDisabled());
  await page.waitForTimeout(130);
  await page.locator('#lte-timer-display').click();
  assert(await page.locator('.timer-zone.running').count());
  assert.equal(await page.locator('.sq1-preview').count(), 0);
  assert.equal(await page.locator('.sq1-case-notes').count(), 0);
  await page.waitForTimeout(130);
  await page.locator('#lte-timer-display').click();
  await page.waitForFunction(async () => (await (await import('./storage.js')).loadData()).sq1.attempts.length === 2);
  const data = await stored();
  assert(data.sq1.attempts[1].inspectionSeconds > 0);
  assert.equal(data.sq1.attempts[0].scrambleStyle, 'disguised');
  assert.equal(data.sq1.attempts[0].layerAlignment, 'random');
  assert(Number.isInteger(data.sq1.attempts[0].initialTop));
  assert(Number.isInteger(data.sq1.attempts[0].initialBottom));
  assert.equal(data.attempts.length + data.lte.attempts.length + data.ltc.attempts.length, 0);
  await page.screenshot({ path: '.build/square1-desktop.png', fullPage: true });
  await navigate('insights');
  assert.equal(await page.locator('[data-progress="set"]').inputValue(), 'square1');
  assert(await page.locator('.progress-plot svg').count());
  assert((await page.locator('.inspection-stats').innerText()).toLowerCase().includes('under 12'));
  await page.locator('[data-progress="range-start"]').press('End');
  const dateBefore = await page.locator('[data-progress="range-start"]').getAttribute('aria-valuetext');
  await page.locator('[data-progress="clean"]').check();
  assert.equal(await page.locator('[data-progress="range-start"]').getAttribute('aria-valuetext'), dateBefore);
  await navigate('library');
  assert.equal(await page.locator('.lte-case').count(), 169);
  await page.locator('[data-action="lte-select"][data-value="none"]').click();
  await page.locator('[data-lte-case]').first().check();
  await page.locator('[data-lte-case]').nth(1).check();
  await page.locator('[data-action="lte-start"]').click();
  assert.equal((await stored()).sq1.settings.selectedCases.length, 2);
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    for (const tab of ['train', 'library', 'insights', 'settings']) {
      await navigate(tab);
      await fits(`${width}px ${tab}`);
      if (width === 390) await page.screenshot({ path: `.build/square1-phone-${tab}.png`, fullPage: tab !== 'library' });
    }
    await navigate('library');
    await page.locator('[data-action="lte-detail"]').first().click();
    assert(await page.locator('.modal svg').count());
    await fits(`${width}px case details`);
    if (width === 390) await page.screenshot({ path: '.build/square1-phone-case.png', fullPage: false });
    await page.locator('.modal [data-action="close-modal"]').last().click();
  }
  // Inspect the longest supplied route/tip on both phone widths, independently
  // of the random cases above. Revealing it must not add a recorded solve.
  const longestNotesCase = await page.evaluate(async () => {
    const { CASES_SQ1 } = await import('./catalog-square1.js');
    const { getSquare1CaseNotes } = await import('./square1-case-notes.js');
    return CASES_SQ1.map(item => ({ id: item.id, notes: getSquare1CaseNotes(item.id) }))
      .filter(item => item.notes).sort((a, b) => (b.notes.route.length + b.notes.tip.length) - (a.notes.route.length + a.notes.tip.length))[0];
  });
  await navigate('library');
  await page.locator(`[data-action="lte-detail"][data-id="${longestNotesCase.id}"]`).click();
  await page.locator('.modal [data-action="lte-only-case"]').click();
  await page.locator('[data-action="lte-reveal"]').click();
  assert.equal(await page.locator('.sq1-case-notes').getAttribute('data-sq1-notes-case'), longestNotesCase.id);
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await fits(`${width}px personal cube-shape notes`);
    assert((await page.locator('.sq1-case-notes').innerText()).includes(longestNotesCase.notes.tip));
    await page.locator('.solution').screenshot({ path: `.build/square1-notes-${width}.png` });
  }
  assert.equal((await stored()).sq1.attempts.length, 2);
  await navigate('settings');
  const pendingDownload = page.waitForEvent('download');
  await page.locator('[data-action="export"]').click();
  const backup = await pendingDownload;
  await backup.saveAs('.build/square1-browser-backup.json');
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#lte-import').setInputFiles('.build/square1-browser-backup.json');
  await page.waitForFunction(() => document.querySelector('#toast').textContent === 'Backup restored.');
  assert.equal((await stored()).sq1.attempts.length, 2);
  for (const trainer of ['2x2', '5x5', '5x5-centres', 'square1']) {
    await page.locator('#trainer-select').selectOption(trainer);
    await fits(`320px ${trainer}`);
  }
  await page.waitForFunction(() => document.querySelector('#offline-status')?.textContent.includes('Ready offline'));
  await page.reload(); await ready();
  await context.setOffline(true);
  await page.reload(); await ready();
  assert.equal(await page.locator('#trainer-select').inputValue(), 'square1');
  assert.equal((await stored()).sq1.attempts.length, 2);
  await navigate('library');
  assert.equal(await page.locator('.lte-case').count(), 169);
  await navigate('train');
  await page.locator('[data-action="lte-reveal"]').click();
  assert((await page.locator('.sq1-case-notes').innerText()).includes(longestNotesCase.notes.route), 'personal notes remain available offline');
  assert.deepEqual(errors, []);
  console.log('PASS: Square-1 disguised setups, final layer turns, personal reveal notes, desktop, 390px and 320px phone layouts, both timers, diagrams, case selection, Learning, progress zoom, backup restore and offline restart.');
} finally {
  await browser.close();
}
