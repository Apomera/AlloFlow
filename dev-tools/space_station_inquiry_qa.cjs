#!/usr/bin/env node
'use strict';

// Working-tree browser coverage for the station investigation workflow.
// node dev-tools/space_station_inquiry_qa.cjs --widths=1440,390
// Optional: --base=http://127.0.0.1:4179 --out=reports/space-station-inquiry
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const { createPreview } = require('./space_station_enhancement_qa.cjs');
const ROOT = path.resolve(__dirname, '..');
const arg = (name, fallback) => process.argv.slice(2).find(value => value.startsWith(name + '='))?.slice(name.length + 1) || fallback;
const output = path.resolve(ROOT, arg('--out', 'reports/space-station-inquiry'));
const widths = arg('--widths', '1440,390').split(',').map(Number);
assert(widths.length && widths.every(width => Number.isInteger(width) && width >= 320));

async function run(base, browser, width) {
  const page = await browser.newPage({ viewport: { width, height: 1000 }, isMobile: width < 500, hasTouch: width < 500, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000);
  const errors = [], checks = [], audits = [];
  page.on('pageerror', error => errors.push(error.message));
  const state = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__toolData.spaceStation)));
  const activate = async locator => { await locator.focus(); await page.keyboard.press('Enter'); };
  const toolbar = () => page.locator('[data-ops-lab-notebook]');
  const records = async () => (await state()).opsTrials || [];
  const selectedRecord = async () => {
    const current = await state();
    return current.opsTrials.find(trial => trial.id === Number(current.opsTrialSelected));
  };
  const latestRecord = async () => (await records()).at(-1);
  const mode = async id => {
    const labels = { power: 'Power', thermal: 'Thermal', attitude: 'Attitude', air: 'Air + water', human: 'Human' };
    await page.locator('.iss-ops-mode').filter({ hasText: labels[id] }).click();
    if (id === 'air') await page.locator('[data-eclss-lab="air"]').click();
  };
  const auditToolbar = async label => {
    const audit = await page.evaluate(async () => {
      const result = await axe.run(document.querySelector('[data-ops-lab-notebook]'), { rules: { region: { enabled: false } } });
      return { passes: result.passes.length, violations: result.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })) };
    });
    assert.deepEqual(audit.violations, [], label + ' toolbar accessibility, including contrast');
    audits.push({ label, ...audit });
  };
  const fitToolbar = async () => {
    const fit = await toolbar().evaluate(element => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, viewport: innerWidth, overflow: element.scrollWidth > element.clientWidth + 1,
        pageOverflow: document.documentElement.scrollWidth > innerWidth + 1,
        targets: [...element.querySelectorAll('button')].map(node => { const box = node.getBoundingClientRect(); return { width: box.width, height: box.height }; }) };
    });
    assert(fit.left >= -1 && fit.right <= width + 1 && !fit.overflow && !fit.pageOverflow);
    assert(fit.targets.every(target => target.width >= 24 && target.height >= 24));
    return fit;
  };
  try {
    await page.goto(base + '/?tab=map');
    const launch = page.locator('[data-iss-launch-route="operations"]');
    await launch.waitFor();
    await launch.screenshot({ path: path.join(output, 'operations-launch-' + width + '.png'), animations: 'disabled' });
    await activate(launch);
    await page.waitForFunction(() => window.__toolData.spaceStation.tab === 'operations');
    assert.equal(await page.locator('#iss-tab-operations').getAttribute('aria-selected'), 'true');
    await page.locator('[data-iss-scenario="nominal"]').click();
    await page.locator('[data-ops-prediction]').fill('If research uses more power, I predict less battery reserve and a warmer cabin while other controls stay fixed.');
    await activate(page.locator('[data-ops-record-trial]'));
    const baseline = await selectedRecord();
    assert.equal((await records()).length, 1);
    assert.equal((await state()).opsTrialCompare, 'current');
    assert.equal((await state()).opsOrbitMinute, 92);
    assert.equal((await state()).opsBattery, baseline.setup.opsBattery);

    await mode('power');
    await page.locator('#iss-power-load').focus();
    await page.keyboard.press('End');
    assert.equal((await state()).opsResearch, 100);
    await page.addScriptTag({ path: path.join(ROOT, 'desktop/web-app/node_modules/axe-core/axe.min.js') });
    await auditToolbar('power');
    const fit = await fitToolbar();
    const powerBefore = await state();
    await activate(page.locator('[data-iss-playback-toggle="power"]'));
    await page.waitForFunction(() => window.__toolData.spaceStation.opsOrbitMinute > 0);
    await activate(page.locator('[data-ops-lab-record]'));
    await page.waitForFunction(() => document.querySelector('[data-iss-playback-toggle="power"]').getAttribute('aria-pressed') === 'false');
    const second = await latestRecord(), afterSecond = await state();
    assert.equal(afterSecond.opsMode, 'power');
    assert.equal(afterSecond.opsOrbitMinute, 92);
    assert.notEqual(afterSecond.opsPowerSeekToken, powerBefore.opsPowerSeekToken, 'Lab recording pauses the local clock');
    for (const key of Object.keys(baseline.setup)) assert.deepEqual(afterSecond[key], powerBefore[key], 'Recording preserves ' + key);
    assert.deepEqual(await selectedRecord(), baseline, 'A remains the baseline after recording revised B');
    assert.equal(Number(afterSecond.opsTrialCompare), second.id);
    assert(second.results.batteryMin < baseline.results.batteryMin);
    assert(second.results.cabinMax > baseline.results.cabinMax);
    assert.match(await toolbar().innerText(), new RegExp('trial\\s+' + second.id, 'i'));
    assert.match(await toolbar().innerText(), new RegExp('(?:trial|baseline)\\s+' + baseline.id, 'i'));
    await toolbar().screenshot({ path: path.join(output, 'power-recorded-' + width + '.png'), animations: 'disabled' });
    await activate(page.locator('[data-ops-open-notebook]'));
    await page.waitForFunction(() => document.activeElement?.id === 'iss-trials-title');
    assert.equal((await state()).opsMode, 'integrated');
    assert.equal((await state()).opsOrbitMinute, 92, 'Opening the notebook preserves the inspected time');
    assert.equal(Number(await page.locator('[data-ops-trial-select]').inputValue()), baseline.id);
    assert.equal(Number(await page.locator('[data-ops-trial-compare]').inputValue()), second.id);
    assert.match(await page.locator('[data-ops-trial-comparison] caption').innerText(), new RegExp('Trial ' + baseline.id + '.*Trial ' + second.id));
    assert.match(await page.locator('[data-ops-trial-metric="batteryMin"] td').last().innerText(), /[−-]/);
    await page.locator('[data-ops-trial-notebook]').screenshot({ path: path.join(output, 'saved-comparison-' + width + '.png'), animations: 'disabled' });
    await page.locator('#iss-ops-research').focus();
    await page.keyboard.press('Home');
    await activate(page.locator('[data-ops-record-trial]'));
    const third = await latestRecord();
    assert.deepEqual(await selectedRecord(), baseline, 'A remains baseline for a third recorded comparison');
    assert.equal(Number((await state()).opsTrialCompare), third.id);

    for (const id of ['thermal', 'attitude', 'air', 'power', 'thermal']) {
      await mode(id);
      await toolbar().waitFor();
      const token = { power: 'opsPowerSeekToken', thermal: 'opsThermalSeekToken', attitude: 'opsAttitudeSeekToken', air: 'opsAirSeekToken' }[id];
      await page.locator('[data-' + id + '-event="start"]').click();
      const before = await state();
      await activate(page.locator('[data-iss-playback-toggle="' + id + '"]'));
      await page.waitForFunction(() => window.__toolData.spaceStation.opsOrbitMinute > 0);
      await activate(page.locator('[data-ops-lab-record]'));
      await page.waitForFunction(id => document.querySelector('[data-iss-playback-toggle="' + id + '"]').getAttribute('aria-pressed') === 'false', id);
      const after = await state(), latest = await latestRecord();
      assert.equal(after.opsMode, id === 'air' ? 'eclss' : id);
      assert.equal(after.opsOrbitMinute, 92);
      assert.notEqual(after[token], before[token]);
      for (const key of Object.keys(baseline.setup)) assert.deepEqual(after[key], before[key], 'Lab recording preserves ' + key);
      assert.deepEqual(await selectedRecord(), baseline, 'Selected baseline survives all recordings');
      assert.equal(Number(after.opsTrialCompare), latest.id);
      assert((await records()).length <= 6);
      if (!audits.some(audit => audit.label === id)) await auditToolbar(id);
      await fitToolbar();
      checks.push({ mode: id, recorded: latest.id, keptBaseline: after.opsTrialSelected, paused: true });
    }
    const retained = await records();
    assert.equal(retained.length, 6);
    assert.deepEqual(retained.find(trial => trial.id === baseline.id), baseline);
    assert(!retained.some(trial => trial.id === second.id || trial.id === third.id), 'The oldest comparison trials are pruned, while baseline A is retained');
    assert.equal(new Set(retained.map(trial => trial.id)).size, 6);
    if (width < 500) {
      await page.emulateMedia({ forcedColors: 'active' });
      await auditToolbar('forced colors');
      await toolbar().screenshot({ path: path.join(output, 'toolbar-forced-colors-' + width + '.png'), animations: 'disabled' });
      await page.emulateMedia({ forcedColors: 'none' });
    }
    await mode('air');
    assert.equal(await toolbar().count(), 1);
    for (const lab of ['water', 'pressure']) {
      await page.locator('[data-eclss-lab="' + lab + '"]').click();
      assert.equal(await toolbar().count(), 0, 'The 92-minute notebook is not offered for the separate ' + lab + ' model');
      assert.equal(await page.locator('[data-ops-lab-record]').count(), 0);
    }
    await page.locator('[data-eclss-lab="air"]').click();
    assert.equal(await toolbar().count(), 1);
    await mode('human');
    assert.equal(await toolbar().count(), 0);

    // A learner can start in a specific experiment without visiting Integrated.
    await page.goto(base + '/?tab=operations&mode=thermal');
    await activate(page.locator('[data-ops-lab-record]'));
    const firstInLab = await state();
    assert.equal(firstInLab.opsTrials.length, 1);
    assert.equal(firstInLab.opsTrialSelected, firstInLab.opsTrials[0].id);
    assert.equal(firstInLab.opsTrialCompare, 'current');
    assert.equal(firstInLab.opsMode, 'thermal');
    await activate(page.locator('[data-ops-open-notebook]'));
    await page.waitForFunction(() => document.activeElement?.id === 'iss-trials-title');
    assert.deepEqual(errors, [], 'No browser runtime errors');
    return { width, mapEntry: true, baselinePreserved: true, retainedTrials: retained.map(trial => trial.id), headingFocus: true, firstRecordInLab: true, checks, audits, fit, errors };
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
      await fs.writeFile(path.join(output, 'results.json'), JSON.stringify({ ok: results.length === widths.length, results }, null, 2));
      console.log('Operations entry, baseline-preserving inquiry, lab recording/playback, navigation, and accessibility passed at ' + width + 'px');
    }
    console.log(JSON.stringify({ ok: true, output, widths }));
  } finally {
    if (browser) await browser.close();
    if (preview) await new Promise(resolve => preview.server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
