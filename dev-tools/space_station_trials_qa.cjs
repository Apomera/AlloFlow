#!/usr/bin/env node
'use strict';

// Exercise the working-tree Operations notebook with native browser controls.
// node dev-tools/space_station_trials_qa.cjs --widths=1440,390
// Optional: --base=http://127.0.0.1:4179 --out=reports/space-station-trials
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const { createPreview } = require('./space_station_enhancement_qa.cjs');
const ROOT = path.resolve(__dirname, '..');
const arg = (name, fallback) => process.argv.slice(2).find(value => value.startsWith(name + '='))?.slice(name.length + 1) || fallback;
const output = path.resolve(ROOT, arg('--out', 'reports/space-station-trials'));
const widths = arg('--widths', '1440,390').split(',').map(Number);
assert(widths.length && widths.every(width => Number.isInteger(width) && width >= 320));

function csvRows(text) {
  const rows = [], row = [];
  let cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (c === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((c === '\r' || c === '\n') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row.splice(0)); cell = '';
    } else cell += c;
  }
  assert.equal(quoted, false, 'CSV closes quoted cells');
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

async function run(base, browser, width) {
  const page = await browser.newPage({ viewport: { width, height: 1000 }, isMobile: width < 500, hasTouch: width < 500, reducedMotion: 'reduce', acceptDownloads: true });
  page.setDefaultTimeout(30000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const state = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__toolData.spaceStation)));
  const patch = async change => {
    await page.evaluate(change => window.__setToolData(previous => ({ ...previous, spaceStation: { ...previous.spaceStation, ...change } })), change);
    await page.waitForFunction(change => Object.entries(change).every(([key, value]) => JSON.stringify(window.__toolData.spaceStation[key]) === JSON.stringify(value)), change);
  };
  const mode = async label => page.locator('.iss-ops-mode').filter({ hasText: new RegExp(label + '$') }).click();
  const trials = async () => (await state()).opsTrials || [];
  const selected = async () => {
    const current = await state();
    return current.opsTrials.find(trial => trial.id === current.opsTrialSelected);
  };
  const activate = async locator => { await locator.focus(); await page.keyboard.press('Enter'); };
  const record = () => page.locator('[data-ops-record-trial]');
  const notebook = () => page.locator('[data-ops-trial-notebook]');
  const prediction = '=SUM(1,2)\nPredict "less reserve" during a longer eclipse.';
  const reflection = 'Evidence: "battery reserve" changed.\nKeep crew, cooling, and recovery fixed.';
  const educationalPrediction = 'If I increase research load, I predict less battery reserve and a warmer cabin because the equipment uses more electrical power.';
  try {
    await page.goto(base + '/?tab=operations');
    await record().waitFor();
    await page.locator('[data-iss-scenario="nominal"]').click();
    await patch({ mapSunPhase: 123, interiorNotes: { harmony: 'Keep my crew notes' }, opsDebrisTime: 0.125 });
    const unrelatedBefore = await state();
    assert.equal(await page.locator('[data-ops-prediction]').getAttribute('maxlength'), '600');
    await page.locator('[data-ops-prediction]').fill(prediction);
    await activate(record());
    await page.waitForFunction(() => window.__toolData.spaceStation.opsTrials?.length === 1);
    const trialA = await selected();
    assert.equal(trialA.version, 1);
    assert.equal(trialA.prediction, prediction);
    assert.equal(trialA.setup.opsEclipse, 35);
    assert.equal(trialA.setup.opsResearch, 60);
    assert.equal((await state()).opsOrbitMinute, 92);
    assert.equal((await state()).opsBattery, trialA.setup.opsBattery, 'Recording does not advance initial conditions');
    assert.equal(await page.locator('[data-ops-trial-select]').inputValue(), String(trialA.id));
    const outcomeA = await page.locator('[data-ops-trial-outcome]').innerText();
    const replayA = await page.locator('[data-iss-replay-event]').evaluateAll(nodes => nodes.map(node => Number(node.dataset.issReplayEvent)));
    assert(replayA.includes(57), 'Saved nominal trial has eclipse entry at minute 57');
    await page.locator('[data-iss-replay-event="57"]').click();
    assert.equal((await state()).opsOrbitMinute, 57);
    await page.locator('#iss-ops-research').focus();
    await page.keyboard.press('End');
    assert.equal((await state()).opsResearch, 100);
    await mode('Power');
    await page.locator('#iss-power-eclipse').focus();
    await page.keyboard.press('End');
    assert.equal((await state()).opsEclipse, 45);
    await mode('Integrated');
    assert.deepEqual(await selected(), trialA, 'Saved trial remains immutable after setup edits');
    assert.equal(await page.locator('[data-ops-trial-outcome]').innerText(), outcomeA);
    assert.equal(await page.locator('[data-iss-replay-event]').count(), 0, 'Changed setup cannot impersonate a saved replay');
    assert(await page.locator('[data-ops-trial-comparison]').isVisible());
    await page.locator('[data-ops-prediction]').fill(educationalPrediction);
    await notebook().screenshot({ path: path.join(output, 'trial-comparison-' + width + '.png'), animations: 'disabled' });

    await activate(page.locator('[data-ops-trial-restore]'));
    const restored = await state();
    for (const [key, value] of Object.entries(trialA.setup)) assert.deepEqual(restored[key], value, 'Restore ' + key);
    for (const key of ['mapSunPhase', 'interiorNotes', 'opsDebrisTime']) assert.deepEqual(restored[key], unrelatedBefore[key], 'Restoring setup preserves unrelated ' + key);
    assert.deepEqual(await selected(), trialA);
    assert.deepEqual(await page.locator('[data-iss-replay-event]').evaluateAll(nodes => nodes.map(node => Number(node.dataset.issReplayEvent))), replayA);
    assert.equal(await page.locator('[data-ops-reflection]').getAttribute('maxlength'), '1200');
    await page.locator('[data-ops-reflection]').fill(reflection);
    assert.equal((await selected()).reflection, reflection);
    const noteTrial = await selected();
    assert.deepEqual(noteTrial.setup, trialA.setup);
    assert.deepEqual(noteTrial.results, trialA.results);

    const roundtrip = JSON.parse(JSON.stringify(await state()));
    await page.reload();
    await record().waitFor();
    await page.evaluate(saved => window.__setToolData({ spaceStation: saved }), roundtrip);
    await page.waitForFunction(id => window.__toolData.spaceStation.opsTrialSelected === id, trialA.id);
    assert.deepEqual(await selected(), noteTrial, 'Project JSON restores trial inputs, readings, and notes');
    assert.equal(await page.locator('[data-ops-reflection]').inputValue(), reflection);
    const downloadPromise = page.waitForEvent('download');
    await page.locator('[data-ops-trial-export]').click();
    const download = await downloadPromise;
    const csvFile = path.join(output, 'trial-export-' + width + '.csv');
    await download.saveAs(csvFile);
    const rows = csvRows((await fs.readFile(csvFile, 'utf8')).replace(/^\uFEFF/, ''));
    assert(rows.length >= 2, 'CSV includes headings and recorded evidence');
    assert(rows.every(row => row.length === rows[0].length), 'CSV has consistent columns');
    assert(rows.flat().includes(reflection), 'Quoted and multiline reflection roundtrips through CSV');
    assert(rows.flat().some(cell => cell === "'" + prediction || cell === '\t' + prediction), 'CSV neutralizes formula-prefixed student text');

    await page.locator('[data-ops-prediction]').fill(educationalPrediction);
    for (let index = 0; index < 6; index++) {
      const range = page.locator('#iss-ops-research');
      await range.focus(); await page.keyboard.press(index % 2 ? 'Home' : 'End');
      await record().click();
      await page.waitForFunction(expected => window.__toolData.spaceStation.opsTrials?.length === expected, Math.min(index + 2, 6));
    }
    const capped = await trials();
    assert.equal(capped.length, 6);
    assert.equal(new Set(capped.map(trial => trial.id)).size, 6, 'Trial identities remain unique');
    assert.deepEqual(capped.find(trial => trial.id === trialA.id), noteTrial, 'Notebook retains the selected baseline when pruning older comparisons');
    assert(!capped.some(trial => trial.id === 2), 'The oldest non-baseline trial is pruned');
    const older = capped.find(trial => trial.id !== trialA.id && trial.id !== capped[capped.length - 1].id);
    await page.locator('[data-ops-trial-select]').selectOption(String(older.id));
    assert.equal((await selected()).id, older.id);
    const compareTrial = capped.find(trial => trial.id !== older.id);
    const beforeComparison = await state();
    await page.locator('[data-ops-trial-compare]').selectOption(String(compareTrial.id));
    const afterComparison = await state();
    assert.deepEqual(afterComparison.opsTrials, beforeComparison.opsTrials, 'Comparing two saved trials preserves their evidence');
    for (const key of Object.keys(older.setup)) assert.deepEqual(afterComparison[key], beforeComparison[key], 'Comparison does not load ' + key);
    assert.match(await page.locator('[data-ops-trial-comparison] caption').innerText(), new RegExp('Trial ' + compareTrial.id));
    await activate(page.locator('[data-ops-trial-restore]'));
    assert.equal(await page.locator('[data-ops-trial-compare]').inputValue(), 'current');

    await page.addScriptTag({ path: path.join(ROOT, 'desktop/web-app/node_modules/axe-core/axe.min.js') });
    const accessibility = await page.evaluate(async () => {
      const result = await axe.run(document.querySelector('[data-ops-trial-notebook]'), { rules: { region: { enabled: false } } });
      return { passes: result.passes.length, violations: result.violations.map(violation => ({ id: violation.id, nodes: violation.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })) };
    });
    assert.deepEqual(accessibility.violations, [], 'Notebook accessibility, including contrast');
    const layout = await notebook().evaluate(panel => {
      const box = panel.getBoundingClientRect();
      return { left: box.left, right: box.right, viewport: innerWidth, documentOverflow: document.documentElement.scrollWidth > innerWidth + 1, overflow: panel.scrollWidth > panel.clientWidth + 1,
        controls: [...panel.querySelectorAll('button,input,textarea,select')].map(node => { const box = node.getBoundingClientRect(); return { tag: node.tagName, width: box.width, height: box.height }; }).filter(box => box.width && box.height) };
    });
    assert(!layout.documentOverflow && !layout.overflow, 'Notebook fits the viewport');
    assert(layout.left >= -1 && layout.right <= width + 1);
    assert(layout.controls.every(control => control.width >= 24 && control.height >= 24), 'Visible controls meet minimum target size');
    await page.locator('[data-ops-reflection]').fill('I will compare low and high research loads while keeping crew size, eclipse duration, and cooling fixed. I will use minimum battery and maximum cabin temperature as evidence.');
    await page.locator('[data-ops-prediction]').blur();
    await page.locator('[data-ops-reflection]').blur();
    await notebook().screenshot({ path: path.join(output, 'trial-notebook-' + width + '.png'), animations: 'disabled' });
    let forcedColors = null;
    if (width < 500) {
      const tableRegion = page.locator('.iss-trial-table-wrap');
      assert(await tableRegion.evaluate(element => element.scrollWidth > element.clientWidth), 'Phone comparison uses a contained scrolling table');
      await tableRegion.focus();
      await page.keyboard.press('ArrowRight');
      await page.waitForFunction(() => document.querySelector('.iss-trial-table-wrap').scrollLeft > 0);
      await tableRegion.evaluate(element => new Promise(resolve => {
        let previous = -1, stableFrames = 0;
        function settle() {
          const current = element.scrollLeft;
          stableFrames = current === previous ? stableFrames + 1 : 0;
          previous = current;
          if (stableFrames >= 3) { element.scrollTo({ left: 0, behavior: 'instant' }); element.blur(); resolve(); }
          else requestAnimationFrame(settle);
        }
        requestAnimationFrame(settle);
      }));
      await page.emulateMedia({ forcedColors: 'active' });
      forcedColors = await page.evaluate(async () => {
        const result = await axe.run(document.querySelector('[data-ops-trial-notebook]'), { rules: { region: { enabled: false } } });
        return { active: matchMedia('(forced-colors: active)').matches, passes: result.passes.length, violations: result.violations.map(violation => ({ id: violation.id, nodes: violation.nodes.map(node => ({ target: node.target, summary: node.failureSummary, checks: node.any.map(check => check.data) })) })) };
      });
      assert.equal(forcedColors.active, true);
      await notebook().screenshot({ path: path.join(output, 'trial-notebook-forced-colors-' + width + '.png'), animations: 'disabled' });
      await fs.writeFile(path.join(output, 'forced-colors-' + width + '.json'), JSON.stringify(forcedColors, null, 2));
      assert.deepEqual(forcedColors.violations, [], 'Notebook remains accessible with forced colors');
      await page.emulateMedia({ forcedColors: 'none' });
    }

    await page.locator('[data-iss-scenario="nominal"]').click();
    for (const change of [{ opsBattery: 20 }, { opsBattery: 76, opsRecovery: 89 }]) {
      await patch(change);
      assert.equal(await page.locator('[data-ops-summary]').getAttribute('data-state'), 'check', 'Individual rule failure controls the hero summary');
      assert.match(await page.locator('.iss-rule-status').innerText(), /TO CHECK/i);
      assert.doesNotMatch(await page.locator('.iss-ops-debrief').innerText(), /All modeled systems retain useful margin|All five.*green/i);
    }
    await page.locator('[data-iss-scenario="nominal"]').click();
    assert.equal(await page.locator('[data-ops-summary]').getAttribute('data-state'), 'go');
    const maximumTrial = { ...noteTrial, id: 1000000000 };
    await patch({ opsTrials: [noteTrial, maximumTrial], opsTrialSelected: maximumTrial.id, opsRuns: maximumTrial.id });
    await record().click();
    const wrappedTrials = await trials();
    assert.equal(wrappedTrials.length, 3, 'Recording after the largest ID preserves prior evidence');
    assert.deepEqual(wrappedTrials.find(trial => trial.id === maximumTrial.id), maximumTrial);
    assert.deepEqual(wrappedTrials.find(trial => trial.id === noteTrial.id), noteTrial);
    assert.equal((await selected()).id, maximumTrial.id, 'Recording preserves the selected baseline even at the ID limit');
    assert.equal(Number((await state()).opsTrialCompare), 2, 'ID wrap skips identifiers already in the notebook');
    assert.deepEqual(errors, [], 'No browser runtime errors');
    return { width, recorded: capped.length, savedTrial: trialA.id, immutableReplay: true, restored: true, jsonRoundtrip: true, idMaximumPreserved: true, csv: path.basename(csvFile), accessibility, forcedColors, layout, errors };
  } finally {
    await page.evaluate(() => window.__destroy?.()).catch(() => {});
    await page.close();
  }
}

async function main() {
  await fs.mkdir(output, { recursive: true });
  const suppliedBase = arg('--base', '');
  const preview = suppliedBase ? null : await createPreview();
  const base = (suppliedBase || preview.base).replace(/\/$/, '');
  let browser;
  try {
    const channel = arg('--channel', '');
    browser = await chromium.launch({ headless: true, downloadsPath: output, ...(channel ? { channel } : {}) });
    const results = [];
    for (const width of widths) {
      results.push(await run(base, browser, width));
      console.log('Operations trial notebook, immutable replay, CSV, keyboard, and accessibility passed at ' + width + 'px');
    }
    await fs.writeFile(path.join(output, 'results.json'), JSON.stringify({ ok: true, results }, null, 2));
    console.log(JSON.stringify({ ok: true, output, widths }));
  } finally {
    if (browser) await browser.close();
    if (preview) await new Promise(resolve => preview.server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
