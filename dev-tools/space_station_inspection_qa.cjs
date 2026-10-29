#!/usr/bin/env node
'use strict';

// Follow notebook evidence into its precise model instant, then return without
// changing the investigation or confusing saved measurements with a preview.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const { createPreview } = require('./space_station_enhancement_qa.cjs');
const ROOT = path.resolve(__dirname, '..');
const arg = (name, fallback) => process.argv.slice(2).find(value => value.startsWith(name + '='))?.slice(name.length + 1) || fallback;
const output = path.resolve(ROOT, arg('--out', 'reports/space-station-inspection'));
const widths = arg('--widths', '1440,390').split(',').map(Number);
assert(widths.length && widths.every(width => Number.isInteger(width) && width >= 320));
const near = (actual, expected, label, tolerance = 1e-7) => assert(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance, `${label}: ${actual} should equal ${expected}`);
const metricKeys = ['batteryMin','batteryEnd','co2Peak','recovery','waterResupply','cabinMin','cabinMax','cmgPeak','pointingEnd','propellantUsed'];
const tokens = ['opsIntegratedSeekToken','opsPowerSeekToken','opsAirSeekToken','opsThermalSeekToken','opsAttitudeSeekToken'];

async function run(base, browser, width) {
  const page = await browser.newPage({ viewport: { width, height: 1000 }, isMobile: width < 500, hasTouch: width < 500, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000);
  const errors = [], checks = [], audits = [];
  page.on('pageerror', error => errors.push(error.message));
  const state = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__toolData.spaceStation)));
  const patch = async values => {
    await page.evaluate(values => window.__setToolData(previous => ({ ...previous, spaceStation: { ...previous.spaceStation, ...values } })), values);
    await page.waitForFunction(values => Object.entries(values).every(([key, value]) => JSON.stringify(window.__toolData.spaceStation[key]) === JSON.stringify(value)), values);
  };
  const activate = async locator => { await locator.focus(); await page.keyboard.press('Enter'); };
  const inspector = () => page.locator('[data-ops-measurement-inspector]');
  const select = () => page.locator('[data-ops-measurement-select]');
  const button = side => page.locator('[data-ops-inspect-' + side + ']');
  const banner = () => page.locator('[data-ops-inspection]');
  const record = () => activate(page.locator('[data-ops-record-trial]'));
  const trial = async id => (await state()).opsTrials.find(item => item.id === id);
  const audit = async (selector, label) => {
    const result = await page.evaluate(async selector => {
      const scan = await axe.run(document.querySelector(selector), { rules: { region: { enabled: false } } });
      return { passes: scan.passes.length, violations: scan.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })) };
    }, selector);
    assert.deepEqual(result.violations, [], label + ' accessibility, including contrast');
    audits.push({ label, ...result });
  };
  const returnToComparison = async () => {
    await page.waitForFunction(() => document.activeElement?.id === 'iss-ops-inspection-title');
    await activate(page.locator('[data-ops-return-comparison]'));
    await page.waitForFunction(() => document.activeElement?.id === 'iss-trial-inspection-title');
    assert.equal((await state()).opsMode, 'integrated');
    assert.equal(await page.locator('[data-iss-playback-toggle="integrated"]').getAttribute('aria-pressed'), 'false');
  };
  const inspect = async (side, metric, savedTrial, mode, minute, modelValue) => {
    await select().selectOption(metric);
    const before = await state();
    await activate(button(side));
    await page.waitForFunction(() => document.activeElement?.id === 'iss-ops-inspection-title');
    const after = await state();
    assert.equal(after.opsMode, mode);
    near(after.opsOrbitMinute, minute === null ? before.opsOrbitMinute : minute, metric + ' clock');
    for (const key of ['opsTrials','opsTrialSelected','opsTrialCompare','opsPrediction','opsWaterDay','opsPressureMinute','opsTrialMeasurement']) assert.deepEqual(after[key], before[key], metric + ' preserves ' + key);
    for (const key of tokens) assert.notEqual(after[key], before[key], metric + ' pauses ' + key);
    for (const [key, value] of Object.entries(savedTrial ? savedTrial.setup : before.opsTrials[0].setup)) {
      assert.equal(after[key], savedTrial ? value : before[key], metric + ' uses the intended setup for ' + key);
    }
    if (savedTrial) {
      assert.match(await page.locator('#iss-ops-inspection-title').innerText(), new RegExp('trial\\s+' + savedTrial.id, 'i'));
      near(Number(await page.locator('[data-ops-inspection-recorded]').getAttribute('data-value')), savedTrial.results[metric], metric + ' stored value');
      assert.match(await banner().innerText(), /recorded|saved/i);
    } else {
      assert.equal(await page.locator('[data-ops-inspection-recorded]').count(), 0);
      assert.match(await page.locator('#iss-ops-inspection-title').innerText(), /current/i);
    }
    near(Number(await page.locator('[data-ops-inspection-modeled]').getAttribute('data-value')), modelValue, metric + ' recomputed value');
    if (minute !== null) assert((await banner().innerText()).includes(minute.toFixed(2)));
    return { side, metric, trial: savedTrial?.id || 'current', minute, recorded: savedTrial?.results[metric], modeled: modelValue };
  };
  const holdFrames = () => page.evaluate(() => {
    const gate = window.__inspectionFrameGate = { request: window.requestAnimationFrame, cancel: window.cancelAnimationFrame, next: -1, callbacks: new Map() };
    window.requestAnimationFrame = callback => { const id = gate.next--; gate.callbacks.set(id, callback); return id; };
    window.cancelAnimationFrame = id => { if (!gate.callbacks.delete(id)) gate.cancel.call(window, id); };
  });
  const releaseFrames = () => page.evaluate(() => {
    const gate = window.__inspectionFrameGate;
    window.requestAnimationFrame = gate.request; window.cancelAnimationFrame = gate.cancel;
    gate.callbacks.forEach(callback => gate.request.call(window, callback)); delete window.__inspectionFrameGate;
  });
  const checkLabRange = async (id, minute) => {
    const range = page.locator('#iss-' + id + '-time');
    assert.equal(await range.getAttribute('step'), 'any', id + ' accepts exact event times');
    near(Number(await range.inputValue()), minute, id + ' native range preserves the model instant');
    assert((await range.getAttribute('aria-valuetext')).includes(minute.toFixed(2)), id + ' accessible time has two decimals');
    assert((await range.evaluate(element => element.parentElement.textContent)).includes(minute.toFixed(2)), id + ' visible time has two decimals');
    const keys = [];
    let current = minute;
    for (const [key, expected] of [
      ['ArrowRight', current + .1], ['ArrowLeft', current], ['PageUp', current + 1], ['PageDown', current],
      ['Home', 0], ['ArrowLeft', 0], ['PageDown', 0], ['End', 92], ['ArrowRight', 92], ['PageUp', 92]
    ]) {
      await range.focus(); await page.keyboard.press(key);
      near((await state()).opsOrbitMinute, expected, id + ' ' + key);
      near(Number(await range.inputValue()), expected, id + ' DOM after ' + key);
      keys.push({ key, minute: expected });
    }
    checks.push({ exactLabSlider: id, initial: minute, nativeStep: 'any', keys });
  };
  try {
    await page.goto(base + '/?tab=operations');
    await page.locator('[data-iss-scenario="nominal"]').click();
    await patch({ opsBattery: 20, opsCmg: 85, opsAttitudeTorque: 2.4, opsAttitudeDump: false, opsAttitudeInertia: 40 });
    await page.locator('[data-ops-prediction]').fill('I will inspect the final pointing change after comparing two inertia settings.');
    await record();
    const aId = (await state()).opsTrialSelected;
    await page.locator('[data-ops-reflection]').fill('Keep this baseline while inspecting the comparison measurement.');
    await patch({ opsBattery: 76, opsAttitudeInertia: 160 });
    await record();
    const bId = Number((await state()).opsTrialCompare), a = await trial(aId), b = await trial(bId);
    assert.deepEqual((await select().locator('option').evaluateAll(nodes => nodes.map(node => node.value))).sort(), metricKeys.slice().sort());
    assert.equal(await select().inputValue(), 'batteryMin');
    assert.match(await button('baseline').innerText(), /load.*inspect/i);
    assert.match(await button('comparison').innerText(), /load.*inspect/i);
    await patch({ opsResearch: 30, opsPrediction: 'Draft for the next experiment stays here.', opsOrbitMinute: 37.25, opsWaterDay: 12.3, opsPressureMinute: 7.5 });
    checks.push(await inspect('comparison', 'pointingEnd', b, 'attitude', 92, 8.06605239185886));
    near(parseFloat(await page.locator('[data-attitude-reading="angle"] strong').innerText()), 8.07, 'Visible final pointing', .005);
    await page.addScriptTag({ path: path.join(ROOT, 'desktop/web-app/node_modules/axe-core/axe.min.js') });
    await audit('[data-ops-inspection]', 'saved pointing preview');
    await banner().screenshot({ path: path.join(output, 'saved-pointing-preview-' + width + '.png'), animations: 'disabled' });
    await returnToComparison();
    assert.equal(await select().inputValue(), 'pointingEnd');

    // A third native record supplies fractional and distinct extrema without
    // replacing the original baseline or its notes.
    await patch({ ...b.setup, opsAttitudeInertia: 80, opsCmg: 78, opsAttitudeDump: true, opsAttitudeBurnMinute: 50.12345, opsAirFlow: 3, opsAirRestore: true, opsAirRestoreMinute: 57.12345 });
    await record();
    const cId = Number((await state()).opsTrialCompare), c = await trial(cId);
    const cases = [
      ['co2Peak','eclss',57.12345,4226.805383484121],
      ['cmgPeak','attitude',29.02777777777778,100],
      ['cabinMin','thermal',0,22],
      ['cabinMax','thermal',64.83333333333299,22.386818856706665],
      ['batteryEnd','power',92,c.results.batteryEnd],
      ['propellantUsed','attitude',92,c.results.propellantUsed]
    ];
    for (const [metric, mode, minute, value] of cases) {
      checks.push(await inspect('comparison', metric, c, mode, minute, value));
      await returnToComparison();
    }
    await patch({ opsOrbitMinute: 37.25 });
    for (const metric of ['recovery','waterResupply']) {
      checks.push(await inspect('comparison', metric, c, 'eclss', null, c.results[metric]));
      assert.equal((await state()).opsEclssLab, 'water');
      assert.match(await banner().innerText(), /setup|fixed/i);
      await returnToComparison();
    }

    // Range inputs must not round precise inspections to their old .1-minute
    // grid. Explicit keyboard increments retain useful fine and coarse steps.
    await page.locator('[data-ops-trial-compare]').selectOption('current');
    await patch({ ...c.setup, opsArrayAngle: 0, opsBattery: 20 });
    await inspect('comparison','batteryMin',null,'power',25.909090909090907,0);
    await checkLabRange('power',25.909090909090907);
    await patch({ ...c.setup, opsMode: 'integrated', opsInspection: null, opsTrialCompare: cId });
    for (const [metric, mode, minute, value, id] of [
      ['co2Peak','eclss',57.12345,4226.805383484121,'air'],
      ['cabinMax','thermal',64.83333333333299,22.386818856706665,'thermal'],
      ['cmgPeak','attitude',29.02777777777778,100,'attitude']
    ]) {
      await inspect('comparison',metric,c,mode,minute,value);
      await checkLabRange(id,minute);
      await patch({ opsMode: 'integrated', opsInspection: null });
    }
    await page.locator('[data-ops-trial-compare]').selectOption('current');
    await patch({ ...c.setup, opsCmg: 79.999999995, opsAttitudeTorque: 2e-10, opsAttitudeDump: false });
    checks.push(await inspect('comparison','cmgPeak',null,'attitude',92,80.00000000081053));
    assert(Number(await page.locator('[data-ops-inspection-modeled]').getAttribute('data-value')) >= 80, 'A tiny real CMG rise across80 remains a CHECK at its actual peak');
    assert.match(await page.locator('[data-ops-rule="attitude"]').innerText(), /CHECK/);
    await returnToComparison();

    // Same-time inspection needs an explicit pause signal, not a changed value.
    await patch({ ...a.setup, opsOrbitMinute: 0 });
    await select().selectOption('batteryMin');
    const beforeSame = await state();
    await holdFrames();
    try {
      await activate(page.locator('[data-iss-playback-toggle="integrated"]'));
      assert.equal(await page.locator('[data-iss-playback-toggle="integrated"]').getAttribute('aria-pressed'), 'true');
      await activate(button('baseline'));
    } finally { await releaseFrames(); }
    await page.waitForFunction(() => document.activeElement?.id === 'iss-ops-inspection-title');
    near((await state()).opsOrbitMinute, 0, 'Same-time baseline minimum');
    for (const key of tokens) assert.notEqual((await state())[key], beforeSame[key]);
    assert.equal(await page.locator('[data-iss-playback-toggle="power"]').getAttribute('aria-pressed'), 'false');
    assert.deepEqual((await state()).opsTrials, beforeSame.opsTrials);
    await returnToComparison();
    checks.push({ sameTimePauses: true, returnFocus: true });

    await page.locator('[data-ops-trial-compare]').selectOption('current');
    assert.match(await button('comparison').innerText(), /inspect current setup/i);
    await patch({ ...c.setup, opsAirRestoreMinute: 70.12345, opsOrbitMinute: 7.25 });
    checks.push(await inspect('comparison', 'co2Peak', null, 'eclss', 70.12345,4544.792812790988));
    await patch({ opsOrbitMinute: 71 });
    assert.equal(await banner().count(), 0, 'Moving away invalidates measurement context');
    await patch({ opsMode: 'integrated' });
    await page.locator('[data-ops-trial-compare]').selectOption(String(bId));
    await select().selectOption('pointingEnd');
    const roundtrip = JSON.parse(JSON.stringify(await state()));
    await page.reload(); await page.locator('[data-ops-trial-notebook]').waitFor();
    await page.evaluate(saved => window.__setToolData({ spaceStation: saved }), roundtrip);
    await page.waitForFunction(() => window.__toolData.spaceStation.opsTrialMeasurement === 'pointingEnd');
    assert.equal(await select().inputValue(), 'pointingEnd');
    assert.deepEqual((await state()).opsTrials, roundtrip.opsTrials);
    await page.locator('[data-ops-trial-compare]').selectOption(String(aId));
    assert.equal(await button('comparison').count(), 0, 'Self-comparison does not duplicate inspection actions');
    checks.push({ currentSetupInspection: true, contextInvalidation: true, persistedMeasurement: true, selfComparison: true });

    const legacy = { ...a, id: 99, results: { ...a.results } };
    delete legacy.results.pointingEnd; delete legacy.results.propellantUsed;
    const stored = (await state()).opsTrials;
    await patch({ opsTrials: stored.concat([legacy]), opsTrialSelected: 99, opsTrialCompare: bId });
    assert(await button('baseline').isDisabled());
    assert(await button('comparison').isEnabled());
    assert.match(await page.locator('[data-ops-inspection-unavailable="baseline"]').innerText(), /not recorded/i);
    await patch({ opsTrialSelected: aId, opsTrialCompare: 99 });
    assert(await button('baseline').isEnabled()); assert(await button('comparison').isDisabled());
    assert.match(await page.locator('[data-ops-inspection-unavailable="comparison"]').innerText(), /not recorded/i);
    await select().selectOption('batteryMin');
    assert(await button('comparison').isEnabled(), 'Legacy required measurements remain inspectable');
    checks.push({ legacyMissingDisabled: true, legacyRequiredAvailable: true });

    // A legacy model or imported snapshot can differ from today's preview.
    const mismatched = { ...c, id: 77, results: { ...c.results, co2Peak: c.results.co2Peak + 100 } };
    await patch({ opsTrials: stored.concat([legacy, mismatched]), opsTrialSelected: aId, opsTrialCompare: 77 });
    checks.push(await inspect('comparison','co2Peak',mismatched,'eclss',57.12345,4226.805383484121));
    assert.notEqual(await page.locator('[data-ops-inspection-recorded]').getAttribute('data-value'), await page.locator('[data-ops-inspection-modeled]').getAttribute('data-value'));
    assert.match(await banner().innerText(), /recomput|current.*model|preview/i);
    await page.addScriptTag({ path: path.join(ROOT, 'desktop/web-app/node_modules/axe-core/axe.min.js') });
    await audit('[data-ops-inspection]', 'stored versus recomputed preview');
    await banner().screenshot({ path: path.join(output, 'recorded-versus-preview-' + width + '.png'), animations: 'disabled' });
    await patch({ opsResearch: 65 });
    assert.equal(await banner().count(), 0, 'Editing setup invalidates saved-result context');
    await patch({ ...b.setup, opsMode: 'integrated', opsTrials: stored, opsTrialSelected: aId, opsTrialCompare: bId, opsRuns: cId, opsTrialMeasurement: 'pointingEnd' });
    await audit('[data-ops-measurement-inspector]', 'measurement inspector');
    const fit = await inspector().evaluate(element => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, overflow: element.scrollWidth > element.clientWidth + 1, pageOverflow: document.documentElement.scrollWidth > innerWidth + 1,
        targets: [...element.querySelectorAll('button,select')].map(node => { const box = node.getBoundingClientRect(); return { width: box.width, height: box.height }; }) };
    });
    assert(fit.left >= -1 && fit.right <= width + 1 && !fit.overflow && !fit.pageOverflow);
    assert(fit.targets.every(box => box.width >= 24 && box.height >= 24));
    await inspector().screenshot({ path: path.join(output, 'measurement-inspector-' + width + '.png'), animations: 'disabled' });
    if (width < 500) {
      await page.emulateMedia({ forcedColors: 'active' });
      await inspector().screenshot({ path: path.join(output, 'inspector-forced-colors-' + width + '.png'), animations: 'disabled' });
      await audit('[data-ops-measurement-inspector]', 'phone inspector forced colors');
      await inspect('comparison', 'pointingEnd', b, 'attitude', 92,8.06605239185886);
      await banner().screenshot({ path: path.join(output, 'inspection-forced-colors-' + width + '.png'), animations: 'disabled' });
      await audit('[data-ops-inspection]', 'phone measurement preview forced colors');
      await page.emulateMedia({ forcedColors: 'none' });
    }
    assert.deepEqual(errors, []);
    return { width, checks, audits, fit, errors };
  } finally {
    await page.evaluate(() => { const gate = window.__inspectionFrameGate; if (gate) { window.requestAnimationFrame = gate.request; window.cancelAnimationFrame = gate.cancel; } window.__destroy?.(); }).catch(() => {});
    await page.close();
  }
}

async function main() {
  await fs.mkdir(output, { recursive: true });
  const suppliedBase = arg('--base', ''), preview = suppliedBase ? null : await createPreview();
  const base = (suppliedBase || preview.base).replace(/\/$/, ''); let browser;
  try {
    const channel = arg('--channel', '');
    browser = await chromium.launch({ headless: true, ...(channel ? { channel } : {}) });
    const results = [];
    for (const width of widths) {
      results.push(await run(base, browser, width));
      await fs.writeFile(path.join(output, 'results.json'), JSON.stringify({ ok: results.length === widths.length, results }, null, 2));
      console.log('Saved/current measurement inspection, precise extrema, return focus, legacy evidence, playback, and accessibility passed at ' + width + 'px');
    }
    console.log(JSON.stringify({ ok: true, output, widths }));
  } finally { if (browser) await browser.close(); if (preview) await new Promise(resolve => preview.server.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
