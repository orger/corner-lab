// Uses a fresh browser context and synthetic solves. Never opens a personal profile.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const runtimeRequire = createRequire(`${process.env.CORNER_LAB_RUNTIME || process.env.HOME + '/.cache/codex-runtimes/codex-primary-runtime/dependencies/node'}/package.json`);
const { chromium } = runtimeRequire('playwright');
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const output = path.resolve(process.env.CORNER_LAB_TEST_OUTPUT || '.build/expanded-trainers-ui');
const base = process.env.CORNER_LAB_TEST_URL || 'http://127.0.0.1:8768/';
const trainers = [
  { id: 'square1-obl', branch: 'sq1obl', count: 185 },
  { id: 'square1-ep', branch: 'sq1ep', count: 99 },
  { id: 'skewb-ns2', branch: 'skewbns2', count: 131 },
];
const ready = () => page.waitForSelector('#trainer-select');
const stored = () => page.evaluate(async () => (await import('./storage.js')).loadData());
const navigate = name => page.locator(`.navigation [data-page="${name}"]`).click();
const fits = async label => assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${label} overflows the phone viewport`);
const capture = (name, fullPage = false) => page.screenshot({ path: path.join(output, name + '.png'), fullPage });

try {
  await mkdir(output, { recursive: true });
  await page.goto(base);
  await ready();
  assert.equal(await page.locator('#trainer-select option').count(), 7);
  for (const [index, trainer] of trainers.entries()) {
    await page.locator('#trainer-select').selectOption(trainer.id);
    assert(await page.locator('.lte-preview svg').count(), `${trainer.id}: missing preview`);
    assert.equal(await page.locator('[data-lte-setting="scrambleStyle"]').inputValue(), 'disguised');
    if (trainer.branch.startsWith('sq1')) assert.equal(await page.locator('[data-lte-setting="layerAlignment"]').inputValue(), 'random');
    else assert.equal(await page.locator('[data-lte-setting="layerAlignment"]').count(), 0);
    assert.equal((await stored())[trainer.branch].attempts.length, 0);

    // Select a real alternate algorithm and a two-case subset, then train a full Learning batch.
    const selected = await page.evaluate(async id => {
      const { ADDITIONAL_TRAINERS } = await import('./additional-trainers.js');
      const cases = ADDITIONAL_TRAINERS.find(item => item.id === id).cases;
      const first = cases.find(item => item.algorithms.length > 1);
      if (!first) throw new Error('No algorithm alternatives for ' + id);
      return [first.id, cases.find(item => item.id !== first.id).id];
    }, trainer.id);
    await navigate('library');
    assert.equal(await page.locator('.lte-case').count(), trainer.count);
    await page.locator('[data-action="lte-select"][data-value="none"]').click();
    for (const id of selected) await page.locator(`[data-lte-case="${id}"]`).check();
    await page.locator(`[data-action="lte-detail"][data-id="${selected[0]}"]`).click();
    assert(await page.locator('.modal svg').count());
    const alternate = page.locator('.modal [name="lte-algorithm"]:not(:checked)').first();
    const algorithmId = await alternate.inputValue();
    await page.locator(`.modal [name="lte-algorithm"][value="${algorithmId}"]`).check();
    await page.locator('.modal [data-action="close-modal"]').last().click();
    await page.locator('[data-action="lte-start"]').click();
    await page.locator('[data-lte-setting="strategy"]').selectOption('learning');
    await page.locator('.builder [data-action="lte-next"]').click();
    assert((await page.locator('.condition-strip').innerText()).includes('Learning batch'));
    await page.locator('#lte-manual').fill(String(5.25 + index));
    await page.locator('[data-action="lte-manual"]').click();
    assert(await page.locator('.scramble-completed').count());
    await page.waitForFunction(async branch => (await (await import('./storage.js')).loadData())[branch].attempts.length === 1, trainer.branch);
    await page.locator('#lte-timer-display').click();
    await page.locator('[data-action="lte-timing"][data-mode="inspection"]').click();
    await page.locator('#lte-timer-display').click();
    assert(await page.locator('.timer-zone.inspecting').count());
    assert(await page.locator('#trainer-select').isDisabled());
    await page.waitForTimeout(130);
    await page.locator('#lte-timer-display').click();
    assert(await page.locator('.timer-zone.running').count());
    await page.waitForTimeout(130);
    await page.locator('#lte-timer-display').click();
    await page.waitForFunction(async branch => (await (await import('./storage.js')).loadData())[branch].attempts.length === 2, trainer.branch);
    const data = (await stored())[trainer.branch];
    assert.equal(data.preferences[selected[0]], algorithmId);
    assert.deepEqual([...data.settings.selectedCases].sort(), [...selected].sort());
    assert.deepEqual(data.attempts.map(item => item.caseId).sort(), [...selected].sort(), 'Learning must include both selected cases once');
    assert(data.attempts[1].inspectionSeconds > 0);
    assert(data.attempts.every(item => item.scrambleStyle === 'disguised'));
    if (trainer.branch.startsWith('sq1')) for (const record of data.attempts) {
      assert(record.scramble.split('/').length - 1 >= 5, 'Square-1 disguise has at least five slices');
      assert.equal(record.layerAlignment, 'random');
      assert([-3, 0, 3, 6].includes(record.initialTop));
      assert([-3, 0, 3, 6].includes(record.initialBottom));
    }
    await navigate('insights');
    assert.equal(await page.locator('[data-progress="set"]').inputValue(), trainer.id);
    assert(await page.locator('.progress-plot svg').count());
    assert((await page.locator('.inspection-stats').innerText()).toLowerCase().includes('under 12 seconds'));
    assert((await page.locator('.progress-coverage-value').innerText()).includes(`2 / ${trainer.count}`));
    await page.locator('[data-progress="range-start"]').press('End');
    const dateBefore = await page.locator('[data-progress="range-start"]').getAttribute('aria-valuetext');
    await page.locator('[data-progress="clean"]').check();
    assert.equal(await page.locator('[data-progress="range-start"]').getAttribute('aria-valuetext'), dateBefore);
    await page.locator('[data-lte-filter="timingMode"]').selectOption('inspection');
    assert((await page.locator('.inspection-stats').innerText()).includes('1 measured inspections'));
    await page.locator('[data-action="lte-clear-filters"]').click();

    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      for (const tab of ['train', 'library', 'insights', 'settings']) {
        await navigate(tab);
        await fits(`${trainer.id} ${width}px ${tab}`);
        if (width === 390) await capture(`${trainer.id}-${width}-${tab}`, tab !== 'library');
      }
      await navigate('library');
      await page.locator(`[data-action="lte-detail"][data-id="${selected[0]}"]`).click();
      assert(await page.locator('.modal svg').count());
      await fits(`${trainer.id} ${width}px algorithm details`);
      if (width === 390) await capture(`${trainer.id}-${width}-algorithm`);
      await page.locator('.modal [data-action="close-modal"]').last().click();
    }
    console.log(`PASS: ${trainer.id}, ${trainer.count} cases, preferred algorithm, Learning batch, timers, statistics and phone layouts`);
  }

  const baseline = await stored();
  assert.equal(baseline.attempts.length + baseline.lte.attempts.length + baseline.ltc.attempts.length + baseline.sq1.attempts.length, 0);
  await navigate('settings');
  const pendingDownload = page.waitForEvent('download');
  await page.locator('[data-action="export"]').click();
  const backup = await pendingDownload;
  const backupPath = path.join(output, 'synthetic-backup.json');
  await backup.saveAs(backupPath);
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#lte-import').setInputFiles(backupPath);
  await page.waitForFunction(() => document.querySelector('#toast').textContent === 'Backup restored.');
  const restored = await stored();
  for (const trainer of trainers) assert.deepEqual(restored[trainer.branch], baseline[trainer.branch]);

  await page.waitForFunction(() => document.querySelector('#offline-status')?.textContent.includes('Ready offline'));
  await page.reload(); await ready();
  await context.setOffline(true);
  await page.reload(); await ready();
  for (const trainer of trainers) {
    await page.locator('#trainer-select').selectOption(trainer.id);
    assert(await page.locator('.lte-preview svg').count(), `${trainer.id}: offline preview missing`);
    await navigate('library');
    assert.equal(await page.locator('.lte-case').count(), trainer.count);
    await navigate('insights');
    assert(await page.locator('.progress-plot svg').count());
    assert.deepEqual((await stored())[trainer.branch].attempts, baseline[trainer.branch].attempts);
    await fits(`${trainer.id} offline`);
  }
  assert.deepEqual(errors, []);
  console.log(`PASS: Three independent histories, full backup restore and offline reload. Screenshots and synthetic backup: ${output}`);
} finally {
  await browser.close();
}
