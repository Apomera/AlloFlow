#!/usr/bin/env node
'use strict';

// Native cursor-time telemetry, inspection, and integrated playback coverage.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const { createPreview } = require('./space_station_enhancement_qa.cjs');
const ROOT = path.resolve(__dirname, '..');
const arg = (name, fallback) => process.argv.slice(2).find(value => value.startsWith(name + '='))?.slice(name.length + 1) || fallback;
const output = path.resolve(ROOT, arg('--out', 'reports/space-station-telemetry'));
const widths = arg('--widths', '1440,390').split(',').map(Number);
assert(widths.length && widths.every(width => Number.isInteger(width) && width >= 320));
const near = (actual, expected, label, tolerance = 1e-7) => assert(Number.isFinite(actual) && Number.isFinite(expected) && Math.abs(actual - expected) <= tolerance, `${label}: ${actual} should equal ${expected}`);
let models;
function expectedReadings(setup, minute) {
  const power = { generation: 160 * Math.sin(setup.opsArrayAngle * Math.PI / 180), load: 68 + setup.opsCrew * 1.6 + setup.opsResearch * .22, eclipse: setup.opsEclipse, battery: setup.opsBattery, capacity: 210 };
  const air = models.air({ power, crew: setup.opsCrew, scrub: setup.opsScrub, flow: setup.opsAirFlow, activity: setup.opsAirActivity, startPpm: setup.opsAirStart, restore: setup.opsAirRestore, restoreMinute: setup.opsAirRestoreMinute });
  const thermal = models.thermal({ power, radiator: setup.opsRadiator, cooling: setup.opsCooling, cabinStart: setup.opsCabinStart, crew: setup.opsCrew });
  const attitude = models.attitude({ cmg: setup.opsCmg, torque: setup.opsAttitudeTorque, inertia: setup.opsAttitudeInertia, dump: setup.opsAttitudeDump, burnMinute: setup.opsAttitudeBurnMinute, thrust: setup.opsAttitudeThrust, fuel: setup.opsAttitudeFuel });
  const currentAir = models.airInspect(air, minute);
  return { power: models.power(power, minute).percent, air: Math.max(currentAir.localPpm, currentAir.cabinPpm), thermal: models.thermalInspect(thermal, minute).cabin, attitude: models.attitudeInspect(attitude, minute).percent };
}

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
  const telemetry = () => page.locator('[data-ops-telemetry]');
  const reading = id => page.locator('[data-ops-telemetry-reading="' + id + '"]');
  const clock = () => page.locator('[data-iss-playback-toggle="integrated"]');
  const cursor = () => page.locator('#iss-orbit-cursor');
  const pause = async () => { if (await clock().getAttribute('aria-pressed') === 'true') await activate(clock()); };
  const holdFrames = () => page.evaluate(() => {
    const gate = window.__telemetryFrameGate = { request: window.requestAnimationFrame, cancel: window.cancelAnimationFrame, next: -1, callbacks: new Map() };
    window.requestAnimationFrame = callback => { const id = gate.next--; gate.callbacks.set(id, callback); return id; };
    window.cancelAnimationFrame = id => { if (!gate.callbacks.delete(id)) gate.cancel.call(window, id); };
  });
  const releaseFrames = () => page.evaluate(() => {
    const gate = window.__telemetryFrameGate;
    window.requestAnimationFrame = gate.request; window.cancelAnimationFrame = gate.cancel;
    gate.callbacks.forEach(callback => gate.request.call(window, callback));
    delete window.__telemetryFrameGate;
  });
  const heldPlaybackAction = async (label, action, expectedTime) => {
    await holdFrames();
    try {
      await activate(clock());
      assert.equal(await clock().getAttribute('aria-pressed'), 'true', label + ' starts native playback');
      await action();
      await page.waitForFunction(() => document.querySelector('[data-iss-playback-toggle="integrated"]')?.getAttribute('aria-pressed') === 'false');
      near((await state()).opsOrbitMinute, expectedTime, label + ' clock');
    } finally { await releaseFrames(); }
    checks.push({ pauseAction: label, minute: expectedTime });
  };
  const parity = async (minute, saved) => {
    const current = await state(), expected = expectedReadings(current, minute), actual = {};
    for (const id of Object.keys(expected)) {
      actual[id] = Number(await reading(id).getAttribute('data-reading-value'));
      near(actual[id], expected[id], id + ' model parity at ' + minute);
      near(Number(await reading(id).getAttribute('data-reading-minute')), minute, id + ' timestamp');
    }
    near(Number(await page.locator('[data-iss-network-focus]').getAttribute('data-ops-network-minute')), minute, 'Network timestamp');
    const network = await page.locator('[data-iss-network-focus] svg').evaluate(svg => Object.fromEntries(['POWER', 'AIR', 'THERMAL', 'ATTITUDE', 'WATER'].map(label => {
      const node = [...svg.querySelectorAll('text')].find(node => node.textContent === label);
      return [label.toLowerCase(), node.nextElementSibling.textContent];
    })));
    for (const id of Object.keys(expected)) near(parseFloat(network[id].replace(/[<>]/g, '')), expected[id], id + ' diagram value', id === 'thermal' ? .0051 : id === 'air' ? .501 : .051);
    near(parseFloat(network.water.replace(/[<>]/g, '')), current.opsRecovery, 'Fixed recovery in the diagram', .501);
    assert((await page.locator('[data-ops-telemetry-time]').innerText()).includes(minute.toFixed(2)));
    assert.deepEqual(current.opsTrials, saved, 'Changing cursor preserves saved evidence');
    return { minute, actual, network };
  };
  const audit = async (selector, label) => {
    const result = await page.evaluate(async selector => {
      const scan = await axe.run(document.querySelector(selector), { rules: { region: { enabled: false } } });
      return { passes: scan.passes.length, violations: scan.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })) };
    }, selector);
    assert.deepEqual(result.violations, [], label + ' accessibility, including contrast');
    audits.push({ label, ...result });
  };
  const back = async () => {
    await page.waitForFunction(() => document.activeElement?.id === 'iss-ops-inspection-title');
    await activate(page.locator('[data-ops-back-events]'));
    await page.waitForFunction(() => document.activeElement?.id === 'iss-ops-events-title');
    assert.equal((await state()).opsMode, 'integrated');
    assert.equal(await clock().getAttribute('aria-pressed'), 'false');
  };
  try {
    await page.goto(base + '/?tab=operations');
    await telemetry().waitFor();
    assert.equal(await clock().getAttribute('aria-pressed'), 'false', 'Reduced-motion entry does not autoplay');
    await page.locator('[data-iss-scenario="nominal"]').click();
    await page.locator('[data-ops-prediction]').fill('A repair may improve the readings now, while the complete orbit still contains an earlier rule check.');
    await activate(page.locator('[data-ops-record-trial]'));
    const baseline = (await state()).opsTrials[0], saved = (await state()).opsTrials;
    const transient = { ...baseline.setup, opsAirFlow: 3, opsAirRestore: true, opsAirRestoreMinute: 70, opsCmg: 78, opsAttitudeTorque: 2.4, opsAttitudeDump: true, opsAttitudeBurnMinute: 50 };
    await patch({ ...transient, opsScenario: 'custom', opsOrbitMinute: 0, opsWaterDay: 12.3, opsPressureMinute: 7.5 });
    const ruleText = await page.locator('[data-ops-rule]').allTextContents();
    const timeline = [];
    for (const minute of [0, 70, 92, 57.12345]) {
      await patch({ opsOrbitMinute: minute });
      timeline.push(await parity(minute, saved));
      assert.deepEqual(await page.locator('[data-ops-rule]').allTextContents(), ruleText, 'Flight rules continue to describe the complete orbit');
    }
    assert(timeline[1].actual.air > 4500 && timeline[2].actual.air < 3000, 'Late airflow recovery changes current readings');
    assert(timeline[0].actual.attitude === 78 && timeline[2].actual.attitude < 100, 'Unloading changes current CMG load');
    assert.match(await page.locator('[data-ops-rule="air"]').innerText(), /CHECK/);
    assert.match(await page.locator('[data-ops-rule="attitude"]').innerText(), /CHECK/);
    assert.match(await page.locator('[data-ops-telemetry-water]').innerText(), /98/);
    assert.match(await page.locator('[data-ops-telemetry-water]').innerText(), /setup|fixed/i);
    assert.match(await telemetry().innerText(), /current|selected|now/i);
    checks.push({ exactModelParity: timeline, wholeOrbitRulesUnchanged: true, fixedWater: true });
    await page.addScriptTag({ path: path.join(ROOT, 'desktop/web-app/node_modules/axe-core/axe.min.js') });
    await audit('[data-ops-telemetry]', 'current telemetry');
    await audit('[data-iss-playback="integrated"]', 'integrated playback');
    await telemetry().screenshot({ path: path.join(output, 'selected-time-' + width + '.png'), animations: 'disabled' });
    await page.locator('[data-iss-network-focus]').screenshot({ path: path.join(output, 'network-selected-time-' + width + '.png'), animations: 'disabled' });

    // Reading buttons inspect this instant, not a different limiting extreme.
    const inspection = [], protectedBefore = await state();
    for (const [id, mode] of [['power', 'power'], ['air', 'eclss'], ['thermal', 'thermal'], ['attitude', 'attitude']]) {
      await activate(reading(id));
      await page.waitForFunction(() => document.activeElement?.id === 'iss-ops-inspection-title');
      const current = await state();
      assert.equal(current.opsMode, mode);
      near(current.opsOrbitMinute, 57.12345, id + ' inspection keeps selected time');
      assert.match(await page.locator('[data-ops-inspection]').innerText(), /57\.12/);
      for (const key of ['opsTrials', 'opsTrialSelected', 'opsTrialCompare', 'opsPrediction', 'opsWaterDay', 'opsPressureMinute']) assert.deepEqual(current[key], protectedBefore[key]);
      for (const key of Object.keys(baseline.setup)) assert.deepEqual(current[key], protectedBefore[key]);
      inspection.push({ id, mode, minute: current.opsOrbitMinute });
      if (id === 'air') await page.locator('[data-ops-inspection]').screenshot({ path: path.join(output, 'inspect-current-air-' + width + '.png'), animations: 'disabled' });
      await back();
      near((await state()).opsOrbitMinute, 57.12345, 'Back preserves cursor');
    }
    await activate(reading('air'));
    await page.waitForFunction(() => document.activeElement?.id === 'iss-ops-inspection-title');
    await patch({ opsOrbitMinute: 58 });
    assert.equal(await page.locator('[data-ops-inspection]').count(), 0, 'Moving the cursor invalidates inspection context');
    await patch({ opsMode: 'integrated', opsOrbitMinute: 57.12345 });
    await activate(reading('thermal'));
    await page.waitForFunction(() => document.activeElement?.id === 'iss-ops-inspection-title');
    await patch({ opsResearch: 65 });
    assert.equal(await page.locator('[data-ops-inspection]').count(), 0, 'Changing setup invalidates inspection context');
    await patch({ ...transient, opsMode: 'integrated', opsOrbitMinute: 5 });
    checks.push({ selectedTimeInspections: inspection, contextInvalidation: true });

    // A running native clock advances the same exact telemetry source.
    const speed = page.locator('[data-iss-playback-speed="integrated"]');
    await speed.focus(); await page.keyboard.press('End');
    await activate(clock());
    await page.waitForFunction(() => window.__toolData.spaceStation.opsOrbitMinute > 5);
    await pause();
    const progressed = (await state()).opsOrbitMinute;
    await parity(progressed, saved);
    checks.push({ nativePlaybackAdvanced: progressed, speed: await speed.inputValue() });
    await patch({ opsOrbitMinute: 57.12345 });
    await heldPlaybackAction('keyboard seek', async () => { await cursor().focus(); await page.keyboard.press('ArrowRight'); }, 58.12345);
    await heldPlaybackAction('setup edit', () => patch({ opsResearch: 65 }), 58.12345);

    await patch({ ...baseline.setup, opsOrbitMinute: 0 });
    await heldPlaybackAction('same-time replay', () => activate(page.locator('[data-iss-replay-event="0"]')), 0);
    await heldPlaybackAction('same-time orbit start event', () => activate(page.locator('[data-ops-event="start"]')), 0);
    await page.waitForFunction(() => document.activeElement?.id === 'iss-ops-inspection-title');
    await back();
    await heldPlaybackAction('same-time baseline load', () => activate(page.locator('[data-ops-trial-restore]')), 0);
    await page.waitForFunction(() => document.activeElement?.id === 'iss-trial-load-notice');
    assert.deepEqual((await state()).opsTrials, saved);
    await patch({ opsScenario: 'nominal' });
    await heldPlaybackAction('same-time unchanged nominal preset', () => activate(page.locator('[data-iss-scenario="nominal"]')), 0);
    assert.deepEqual((await state()).opsTrials, saved);
    await patch({ opsOrbitMinute: 5 });
    await heldPlaybackAction('orbit end event', () => activate(page.locator('[data-ops-event="end"]')), 92);
    await page.waitForFunction(() => document.activeElement?.id === 'iss-ops-inspection-title');
    await back();
    await patch({ opsOrbitMinute: 12 });
    await heldPlaybackAction('record trial', () => activate(page.locator('[data-ops-record-trial]')), 92);
    assert.deepEqual((await state()).opsTrials.find(item => item.id === baseline.id), baseline, 'Recording preserves the original baseline');
    const recorded = (await state()).opsTrials;
    await patch({ opsOrbitMinute: 0 });
    const beforeInspectionToken = (await state()).opsIntegratedSeekToken;
    await holdFrames();
    try {
      await activate(clock());
      await activate(reading('air'));
    } finally { await releaseFrames(); }
    await page.waitForFunction(() => document.activeElement?.id === 'iss-ops-inspection-title');
    near((await state()).opsOrbitMinute, 0, 'Same-time telemetry inspection');
    assert.notEqual((await state()).opsIntegratedSeekToken, beforeInspectionToken, 'Same-time inspection explicitly pauses integrated playback');
    assert.equal(await page.locator('[data-iss-playback-toggle="air"]').getAttribute('aria-pressed'), 'false');
    await back();
    assert.deepEqual((await state()).opsTrials, recorded);
    checks.push({ sameTimeReadingPauses: true, reducedMotionNoAutoplay: true });

    await patch({ ...transient, opsOrbitMinute: 92 });
    await parity(92, recorded);
    const fit = await telemetry().evaluate(element => {
      const box = element.getBoundingClientRect();
      const network = element.querySelector('[data-iss-network-focus]'), diagram = network.querySelector('svg'), visible = network.getBoundingClientRect(), diagramBox = diagram.getBoundingClientRect();
      return { left: box.left, right: box.right, overflow: element.scrollWidth > element.clientWidth + 1, pageOverflow: document.documentElement.scrollWidth > innerWidth + 1,
        diagramFits: diagramBox.left >= visible.left - 1 && diagramBox.right <= visible.right + 1,
        nodesVisible: ['POWER', 'AIR', 'WATER', 'THERMAL', 'ATTITUDE'].every(label => {
          const node = [...diagram.querySelectorAll('text')].find(item => item.textContent === label).parentElement.getBoundingClientRect();
          return node.left >= visible.left - 1 && node.right <= visible.right + 1;
        }),
        buttons: [...element.querySelectorAll('button')].map(node => { const rect = node.getBoundingClientRect(); return { width: rect.width, height: rect.height }; }) };
    });
    assert(fit.left >= -1 && fit.right <= width + 1 && !fit.overflow && !fit.pageOverflow);
    assert(fit.diagramFits && fit.nodesVisible, 'All five network nodes fit inside the visible diagram; overflow:hidden cannot conceal clipping');
    assert(fit.buttons.every(button => button.width >= 24 && button.height >= 24));
    await telemetry().screenshot({ path: path.join(output, 'recovered-at-orbit-end-' + width + '.png'), animations: 'disabled' });
    if (width < 500) {
      await page.emulateMedia({ forcedColors: 'active' });
      await telemetry().screenshot({ path: path.join(output, 'telemetry-forced-colors-' + width + '.png'), animations: 'disabled' });
      await audit('[data-ops-telemetry]', 'phone telemetry forced colors');
      await audit('[data-iss-playback="integrated"]', 'phone playback forced colors');
      await page.emulateMedia({ forcedColors: 'none' });
    }
    assert.deepEqual(errors, []);
    return { width, checks, audits, fit, errors };
  } finally {
    await page.evaluate(() => { const gate = window.__telemetryFrameGate; if (gate) { window.requestAnimationFrame = gate.request; window.cancelAnimationFrame = gate.cancel; } window.__destroy?.(); }).catch(() => {});
    await page.close();
  }
}

async function main() {
  await fs.mkdir(output, { recursive: true });
  const source = await fs.readFile(path.join(ROOT, 'stem_lab/stem_tool_spacestation.js'), 'utf8');
  const numberFunctions = source.slice(source.indexOf('  function issFlightNumber('), source.indexOf('  function issTransferPlan('));
  const modelFunctions = source.slice(source.indexOf('  function issPowerState('), source.indexOf('  var _issRefOrbit'));
  models = new Function(numberFunctions + modelFunctions + ';return { power:issPowerState, air:issAirRun, airInspect:issAirInspect, thermal:issThermalRun, thermalInspect:issThermalInspect, attitude:issAttitudeRun, attitudeInspect:issAttitudeInspect };')();
  const suppliedBase = arg('--base', ''), preview = suppliedBase ? null : await createPreview();
  const base = (suppliedBase || preview.base).replace(/\/$/, '');
  let browser;
  try {
    const channel = arg('--channel', '');
    browser = await chromium.launch({ headless: true, ...(channel ? { channel } : {}) });
    const results = [];
    for (const width of widths) {
      results.push(await run(base, browser, width));
      await fs.writeFile(path.join(output, 'results.json'), JSON.stringify({ ok: results.length === widths.length, results }, null, 2));
      console.log('Cursor telemetry, native playback, exact-time inspection, saved evidence, keyboard, and accessibility passed at ' + width + 'px');
    }
    console.log(JSON.stringify({ ok: true, output, widths }));
  } finally {
    if (browser) await browser.close();
    if (preview) await new Promise(resolve => preview.server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
