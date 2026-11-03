#!/usr/bin/env node
'use strict';

// Browser coverage for the Power lab reserve planner. Run with optional --widths=1440,390 and --out=reports/space-station-reserve-plan.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const { createPreview } = require('./space_station_enhancement_qa.cjs');
const root = path.resolve(__dirname, '..');
const option = (key, fallback) => process.argv.slice(2).find(arg => arg.startsWith(key + '='))?.slice(key.length + 1) || fallback;
const out = path.resolve(root, option('--out', 'reports/space-station-reserve-plan'));
const widths = option('--widths', '1440,390').split(',').map(Number);
assert(widths.length && widths.every(width => Number.isInteger(width) && width >= 320));

async function run(browser, base, width) {
  const page = await browser.newPage({ viewport: { width, height: 1000 }, isMobile: width < 500, hasTouch: width < 500, reducedMotion: 'reduce' });
  const errors = [], checks = [], audits = [];
  page.on('pageerror', error => errors.push(error.message));
  const find = selector => page.locator(selector);
  const plan = find('details[data-power-reserve-plan]');
  const summary = plan.locator('summary');
  const apply = plan.locator('[data-reserve-apply]');
  const clock = find('[data-iss-playback-toggle="power"]');
  const state = () => page.evaluate(() => structuredClone(window.__toolData.spaceStation));
  const patch = async values => {
    await page.evaluate(values => window.__setToolData(last => ({ ...last, spaceStation: { ...last.spaceStation, ...values } })), values);
    await page.waitForFunction(values => Object.entries(values).every(([key, value]) =>
      JSON.stringify(window.__toolData.spaceStation[key]) === JSON.stringify(value)), values);
  };
  const press = async control => { await control.focus(); await page.keyboard.press('Enter'); };
  const enterPower = () => page.locator('.iss-ops-mode').filter({ hasText: 'Power' }).click();
  const ensureOpen = async () => { if (!await plan.evaluate(element => element.open)) await press(summary); };
  const screenshot = name => plan.screenshot({ path: path.join(out, name + '-' + width + '.png'), animations: 'disabled' });
  const forecast = async (name, start, minimum) => {
    const card = plan.locator('[data-reserve-' + name + ']');
    assert.equal(await card.getAttribute('data-start-percent'), String(start));
    const value = await card.getAttribute('data-min-percent');
    assert(value !== null && Math.abs(Number(value) - minimum) < 1e-7, name + ' predicted minimum ' + value + ' vs ' + minimum);
    return Number(value);
  };
  const audit = async (label, panel = plan) => {
    const result = await panel.evaluate(async element => {
      const report = await axe.run(element, { rules: { region: { enabled: false } } });
      return { passes: report.passes.length, violations: report.violations.map(rule => ({ id: rule.id, targets: rule.nodes.map(node => node.target) })),
        fits: element.scrollWidth <= element.clientWidth + 1 && document.documentElement.scrollWidth <= innerWidth + 1,
        targets: Array.from(element.querySelectorAll('summary,button')).every(control => {
          const rect = control.getBoundingClientRect(); return !rect.width || rect.width >= 24 && rect.height >= 24;
        }) };
    });
    assert.deepEqual(result.violations, [], label); assert(result.fits && result.targets, label + ' layout and target size');
    audits.push({ label, ...result });
  };
  // Hold the native playback callback while opening the disclosure or applying a forecast at a known instant.
  const holdFrames = () => page.evaluate(() => {
    const gate = window.__reserveFrames = { request: requestAnimationFrame, cancel: cancelAnimationFrame, id: -1, callbacks: new Map() };
    window.requestAnimationFrame = fn => { const id = gate.id--; gate.callbacks.set(id, fn); return id; };
    window.cancelAnimationFrame = id => { if (!gate.callbacks.delete(id)) gate.cancel.call(window, id); };
  });
  const releaseFrames = () => page.evaluate(() => {
    const gate = window.__reserveFrames;
    window.requestAnimationFrame = gate.request; window.cancelAnimationFrame = gate.cancel;
    gate.callbacks.forEach(fn => gate.request.call(window, fn)); delete window.__reserveFrames;
  });
  try {
    await page.goto(base + '/?tab=operations');
    await find('[data-iss-scenario="nominal"]').click();
    await find('[data-ops-prediction]').fill('I predict a long eclipse will require a larger starting reserve.');
    await press(find('[data-ops-record-trial]'));
    const saved = (await state()).opsTrials;
    await find('[data-ops-prediction]').fill('Next I will compare the nearest failing setting and the smallest passing setting.');
    await enterPower();
    await plan.waitFor();
    assert.equal(await summary.getAttribute('id'), 'iss-reserve-plan-title');
    assert.equal(await plan.evaluate(element => element.open), false);
    await patch({ opsOrbitMinute: 16.125, opsWaterDay: 7.5, opsPressureMinute: 3.2 });
    await page.addScriptTag({ path: path.join(root, 'desktop/web-app/node_modules/axe-core/axe.min.js') });
    await holdFrames();
    try {
      await press(clock);
      const playing = await state();
      await press(summary);
      await press(summary);
      await press(summary);
      assert.equal(await clock.getAttribute('aria-pressed'), 'true');
      assert.deepEqual(await state(), playing, 'Opening or closing a preview does not pause playback or modify project state');
      await press(clock);
    } finally { await releaseFrames(); }
    await forecast('current', 76, 72.98245614035088);
    await forecast('recommended', 25, 25);
    await forecast('lower', 24, 24);
    assert(await apply.isEnabled(), 'A passing setup may explicitly try the smaller setting');
    checks.push({ playbackPreserved: true, firstPassing: 25, equalityPasses: true });

    await find('#iss-power-eclipse').press('End');
    await forecast('recommended', 36, 25.080122776135124);
    await forecast('lower', 35, 24.080122776135124);
    await patch({ opsBattery: 35.999 });
    await forecast('current', 35.999, 25.079122776135124);
    assert.match(await plan.locator('[data-reserve-current]').innerText(), /<\s*36\.00\s*%/);
    assert.match(await plan.locator('#iss-reserve-result-title').innerText(), /whole.percent/i);
    assert(await apply.isEnabled(), 'A fractional GO setup may explicitly try a different whole-percent setting');
    assert.equal((await state()).opsBattery, 35.999, 'Preview preserves a saved fractional starting charge');
    checks.push({ fractionalPassingSetup: 35.999, lowestWholeSetting: 36 });
    await patch({ opsBattery: 35 });
    await press(find('[data-ops-open-notebook]'));
    await press(find('[data-ops-rule="power"]'));
    await page.waitForFunction(() => document.activeElement?.id === 'iss-ops-inspection-title');
    assert((await state()).opsInspection, 'The failing reserve has an active inspection');
    await ensureOpen();
    await patch({ opsOrbitMinute: 22.75, opsLoadedTrial: saved[0].id });
    await forecast('current', 35, 24.080122776135124);
    await screenshot('feasible');
    await audit('Feasible reserve plan');
    if (width < 500) {
      await page.emulateMedia({ forcedColors: 'active' });
      await audit('Reserve plan in forced colors');
      await screenshot('feasible-forced-colors');
      await page.emulateMedia({ forcedColors: 'none' });
    }
    await holdFrames();
    let before;
    try {
      await press(clock);
      before = await state();
      assert.equal(await clock.getAttribute('aria-pressed'), 'true');
      await press(apply);
    } finally { await releaseFrames(); }
    await page.waitForFunction(() => document.activeElement?.id === 'iss-reserve-result-title');
    assert.equal(await clock.getAttribute('aria-pressed'), 'false');
    const after = await state();
    assert.equal(after.opsBattery, 36);
    assert.equal(after.opsOrbitMinute, 0);
    assert.equal(after.opsScenario, 'custom');
    assert.equal(after.opsInspection, null); assert.equal(after.opsLoadedTrial, null);
    const allowed = new Set(['opsBattery', 'opsOrbitMinute', 'opsScenario', 'opsInspection', 'opsLoadedTrial']);
    for (const token of ['opsPowerSeekToken', 'opsIntegratedSeekToken', 'opsAirSeekToken', 'opsThermalSeekToken', 'opsAttitudeSeekToken']) {
      assert.notEqual(after[token], before[token], token + ' pauses'); allowed.add(token);
    }
    for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
      if (!allowed.has(key)) assert.deepEqual(after[key], before[key], 'Apply preserves ' + key);
    }
    assert.deepEqual(after.opsTrials, saved);
    assert.equal(await find('#iss-power-battery').inputValue(), '36');
    assert.match(await plan.locator('[data-reserve-apply-status]').innerText(), /36/);
    assert(await apply.isDisabled(), 'Already selected recommendation need not be applied again');
    await press(find('[data-ops-open-notebook]'));
    const rule = find('[data-ops-rule="power"]');
    assert.match(await rule.innerText(), /GO/i);
    assert.match(await rule.innerText(), />\s*25\s*%/);
    checks.push({ longEclipseFirstPassing: 36, previousFails: 35, nativeRule: await rule.innerText(), appliedFromPlayback: true });

    await enterPower();
    await ensureOpen();
    await find('#iss-power-angle').press('Home');
    await patch({ opsBattery: 96 });
    await forecast('recommended', 97, 25.98245614035087);
    await forecast('current', 96, 24.98245614035087);
    assert.match(await plan.locator('[data-reserve-current]').innerText(), /<\s*25\.0|below 25/i, 'A near-threshold failure stays visibly below 25');
    await find('#iss-power-load').press('End');
    const full = await plan.locator('[data-reserve-full]').getAttribute('data-min-percent');
    assert(full !== null && Number(full) < 25);
    assert.equal(await plan.locator('[data-reserve-full]').getAttribute('data-start-percent'), '100');
    assert.equal(await apply.count(), 0);
    assert.equal(await page.locator('[data-reserve-state="unreachable"]').count(), 1);
    await screenshot('unreachable');
    await audit('Unreachable reserve plan');
    checks.push({ marginalSetting: 96, thresholdSetting: 97, fullBatteryStillFails: Number(full) });

    const alignment = find('details[data-power-alignment-plan]');
    const tryAngle = alignment.locator('[data-alignment-apply]');
    await patch({ opsCrew: 11, opsResearch: 100, opsEclipse: 45, opsBattery: 100, opsArrayAngle: 7.999, opsOrbitMinute: 42.25 });
    const previewStart = await state();
    await press(alignment.locator('summary'));
    await tryAngle.waitFor();
    assert.deepEqual(await state(), previewStart);
    assert(await plan.evaluate(element => element.open), 'Opening the angle preview keeps the battery preview open');
    assert.match(await alignment.locator('[data-alignment-current]').innerText(), /<\s*8\.00°/);
    assert.match(await alignment.locator('[data-alignment-lower]').innerText(), /7°[\s\S]*<\s*25\.0%/);
    assert.equal(await alignment.locator('[data-alignment-recommended]').getAttribute('data-angle'), '8');
    await audit('Array angle preview', alignment);
    await alignment.screenshot({ path: path.join(out, 'alignment-' + width + '.png') });
    if (width < 500) {
      await page.emulateMedia({ forcedColors: 'active' });
      await audit('Array angle preview in forced colors', alignment);
      await page.emulateMedia({ forcedColors: 'none' });
    }
    await holdFrames();
    try {
      await press(clock);
      assert.equal(await clock.getAttribute('aria-pressed'), 'true');
      await press(tryAngle);
    } finally { await releaseFrames(); }
    await page.waitForFunction(() => document.activeElement?.id === 'iss-alignment-result-title');
    const aligned = await state();
    assert.equal(await clock.getAttribute('aria-pressed'), 'false');
    assert.equal(await find('#iss-power-angle').inputValue(), '8');
    assert.equal(aligned.opsOrbitMinute, 0);
    assert.equal(aligned.opsArrayAngle, 8);
    assert(await tryAngle.isDisabled());
    assert.match(await alignment.locator('[role="status"]').innerText(), /8°/);
    for (const key of ['opsBattery', 'opsCrew', 'opsResearch', 'opsEclipse', 'opsTrials', 'opsPrediction', 'opsWaterDay', 'opsPressureMinute']) {
      assert.deepEqual(aligned[key], previewStart[key], 'Trying an angle preserves ' + key);
    }
    await find('#iss-power-battery').press('Home');
    assert.match(await alignment.innerText(), /below 25% at minute zero/);
    assert.equal(await alignment.locator('[data-alignment-maximum]').getAttribute('data-angle'), '90');
    assert.equal(await tryAngle.count(), 0);
    checks.push({ firstPassingAngle: 8, previousAngleFails: 7, startingChargeRetained: aligned.opsBattery, lowStartUnreachable: true });

    await patch({ opsCrew: 7, opsBattery: 35, opsArrayAngle: 90, opsResearch: 100, opsEclipse: 45, opsOrbitMinute: 38 });
    const research = find('details[data-power-research-plan]');
    const tryResearch = research.locator('[data-research-apply]');
    const budgetStart = await state();
    await press(alignment.getByRole('button', { name: 'Check research at the current array angle' }));
    await tryResearch.waitFor();
    assert.equal(await research.evaluate(element => element.open && element.querySelector('summary') === document.activeElement), true);
    assert.deepEqual(await state(), budgetStart);
    assert.equal(await research.locator('[data-research-recommended]').getAttribute('data-research'), '55');
    assert.equal(await research.locator('[data-research-higher]').getAttribute('data-research'), '60');
    assert.match(await research.locator('[data-research-recommended]').innerText(), />\s*25\.0%/);
    await audit('Research budget preview', research);
    await research.screenshot({ path: path.join(out, 'research-budget-' + width + '.png') });
    if (width < 500) {
      await page.emulateMedia({ forcedColors: 'active' });
      await audit('Research budget in forced colors', research);
      await page.emulateMedia({ forcedColors: 'none' });
    }
    await holdFrames();
    try {
      await press(clock);
      assert.equal(await clock.getAttribute('aria-pressed'), 'true');
      await press(tryResearch);
    } finally { await releaseFrames(); }
    await page.waitForFunction(() => document.activeElement?.id === 'iss-research-result-title');
    const budgetApplied = await state();
    assert.equal(await clock.getAttribute('aria-pressed'), 'false');
    assert.equal(await find('#iss-power-load').inputValue(), '55');
    assert.equal(budgetApplied.opsOrbitMinute, 0);
    assert.match(await research.locator('[role="status"]').innerText(), /55%/);
    assert(await tryResearch.isDisabled());
    assert.equal(await alignment.locator('[data-alignment-recommended]').count(), 1);
    for (const key of ['opsBattery', 'opsCrew', 'opsArrayAngle', 'opsEclipse', 'opsTrials', 'opsPrediction', 'opsWaterDay', 'opsPressureMinute']) {
      assert.deepEqual(budgetApplied[key], budgetStart[key], 'Trying the budget preserves ' + key);
    }
    checks.push({ highestResearch: 55, nextHigherFails: 60, startingChargeRetained: budgetApplied.opsBattery, arrayAngleRetained: budgetApplied.opsArrayAngle });

    await patch({ opsBattery: 76, opsArrayAngle: 86, opsResearch: 60 });
    await press(find('[data-eclipse-guide-start]'));
    await ensureOpen();
    for (const phase of ['baseline', 'change', 'comparison']) {
      assert.equal(await find('[data-eclipse-guide]').getAttribute('data-step'), phase);
      assert(await apply.isDisabled(), 'Protect the guided setup during ' + phase);
      if (!await alignment.evaluate(element => element.open)) await press(alignment.locator('summary'));
      assert(await tryAngle.isDisabled(), 'Protect guided array alignment during ' + phase);
      if (!await research.evaluate(element => element.open)) await press(research.locator('summary'));
      assert(await tryResearch.isDisabled(), 'Protect guided research utilization during ' + phase);
      if (phase === 'baseline') {
        await find('[data-eclipse-guide-prediction]').fill('Ten extra minutes in shadow should draw down the reserve.');
        await press(find('[data-eclipse-guide-record-a]'));
      } else if (phase === 'change') await press(find('[data-eclipse-guide-change]'));
    }
    checks.push({ guideProtected: ['baseline', 'change', 'comparison'] });
    assert.deepEqual(errors, []);
    return { width, checks, audits, errors };
  } finally {
    await page.evaluate(() => window.__destroy?.()).catch(() => {});
    await page.close();
  }
}

async function main() {
  await fs.mkdir(out, { recursive: true });
  const preview = await createPreview();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const results = [];
    for (const width of widths) {
      results.push(await run(browser, preview.base, width));
      await fs.writeFile(path.join(out, 'results.json'), JSON.stringify({ ok: results.length === widths.length, results }, null, 2));
      console.log('Reserve planning, application, full-orbit rule, and accessibility passed at ' + width + 'px');
    }
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => preview.server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
