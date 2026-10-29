#!/usr/bin/env node
'use strict';

// Native rule/event inspection against the working-tree Space Station host.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const { createPreview } = require('./space_station_enhancement_qa.cjs');
const ROOT = path.resolve(__dirname, '..');
const arg = (name, fallback) => process.argv.slice(2).find(value => value.startsWith(name + '='))?.slice(name.length + 1) || fallback;
const output = path.resolve(ROOT, arg('--out', 'reports/space-station-events'));
const widths = arg('--widths', '1440,390').split(',').map(Number);
assert(widths.length && widths.every(width => Number.isInteger(width) && width >= 320));
const near = (actual, expected, tolerance = 1e-7) => {
  assert(Number.isFinite(actual) && Number.isFinite(expected));
  assert(Math.abs(actual - expected) <= tolerance, `${actual} should equal ${expected} within ${tolerance}`);
};

async function run(base, browser, width) {
  const page = await browser.newPage({ viewport: { width, height: 1000 }, isMobile: width < 500, hasTouch: width < 500, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000);
  const errors = [], audits = [], checks = [];
  page.on('pageerror', error => errors.push(error.message));
  const state = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__toolData.spaceStation)));
  const patch = async values => {
    await page.evaluate(values => window.__setToolData(previous => ({ ...previous, spaceStation: { ...previous.spaceStation, ...values } })), values);
    await page.waitForFunction(values => Object.entries(values).every(([key, value]) => JSON.stringify(window.__toolData.spaceStation[key]) === JSON.stringify(value)), values);
  };
  const activate = async locator => { await locator.focus(); await page.keyboard.press('Enter'); };
  const holdFrames = () => page.evaluate(() => {
    const gate = window.__eventsFrameGate = { request: window.requestAnimationFrame, cancel: window.cancelAnimationFrame, next: -1, callbacks: new Map() };
    window.requestAnimationFrame = callback => { const id = gate.next--; gate.callbacks.set(id, callback); return id; };
    window.cancelAnimationFrame = id => { if (!gate.callbacks.delete(id)) gate.cancel.call(window, id); };
  });
  const releaseFrames = () => page.evaluate(() => {
    const gate = window.__eventsFrameGate;
    window.requestAnimationFrame = gate.request; window.cancelAnimationFrame = gate.cancel;
    // Clock cleanup cancels its queued tick; focus callbacks still get their turn.
    gate.callbacks.forEach(callback => gate.request.call(window, callback));
    delete window.__eventsFrameGate;
  });
  const banner = () => page.locator('[data-ops-inspection]');
  const schedule = () => page.locator('[data-ops-events]');
  const event = id => page.locator('[data-ops-event="' + id + '"]');
  const eventTime = async id => Number(await event(id).getAttribute('data-event-minute'));
  const back = async () => {
    await page.waitForFunction(() => document.activeElement?.id === 'iss-ops-inspection-title');
    await activate(page.locator('[data-ops-back-events]'));
    await page.waitForFunction(() => document.activeElement?.id === 'iss-ops-events-title');
    assert.equal((await state()).opsMode, 'integrated');
  };
  const audit = async (selector, label) => {
    const result = await page.evaluate(async selector => {
      const scan = await axe.run(document.querySelector(selector), { rules: { region: { enabled: false } } });
      return { passes: scan.passes.length, violations: scan.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })) };
    }, selector);
    assert.deepEqual(result.violations, [], label + ' accessibility, including contrast');
    audits.push({ label, ...result });
  };
  let baselineSetup;
  const protectedKeys = ['opsTrials', 'opsTrialSelected', 'opsTrialCompare', 'opsPrediction', 'opsWaterDay', 'opsPressureMinute', 'mapSunPhase', 'interiorNotes'];
  const protectedState = async () => {
    const current = await state(), snapshot = {};
    for (const key of protectedKeys.concat(Object.keys(baselineSetup))) snapshot[key] = current[key];
    return snapshot;
  };
  const inspect = async (key, expectedMode, expectedMinute) => {
    const before = await protectedState();
    await activate(page.locator('[data-ops-rule="' + key + '"]'));
    await page.waitForFunction(() => document.activeElement?.id === 'iss-ops-inspection-title');
    assert.equal((await state()).opsMode, expectedMode);
    if (expectedMinute !== null) near((await state()).opsOrbitMinute, expectedMinute);
    assert.deepEqual(await protectedState(), before, 'Inspection preserves saved evidence, controls, and unrelated clocks');
    assert(await banner().isVisible());
    if (expectedMinute !== null) assert((await banner().innerText()).includes(expectedMinute.toFixed(2)), 'Inspection exposes its precise displayed time');
  };
  const fixture = async values => {
    await patch({ ...baselineSetup, opsMode: 'integrated', opsEclssLab: 'air', opsScenario: 'custom', opsOrbitMinute: 92, ...values });
    await schedule().waitFor();
  };
  try {
    await page.goto(base + '/?tab=operations');
    await page.locator('[data-iss-scenario="nominal"]').click();
    await page.locator('[data-ops-prediction]').fill('A late airflow repair may improve the final reading without erasing an earlier peak.');
    await page.locator('[data-ops-record-trial]').click();
    baselineSetup = (await state()).opsTrials[0].setup;
    await page.locator('[data-ops-reflection]').fill('Keep the baseline while inspecting the time and cause of each rule check.');
    await patch({ opsWaterDay: 12.3, opsPressureMinute: 7.5, mapSunPhase: 123, interiorNotes: { harmony: 'Crew observation retained' } });
    await page.addScriptTag({ path: path.join(ROOT, 'desktop/web-app/node_modules/axe-core/axe.min.js') });

    // The final CO2 value recovers, but the rule card must show the earlier peak.
    await fixture({ opsAirFlow: 3, opsAirRestore: true, opsAirRestoreMinute: 70 });
    assert.equal(await schedule().evaluate(element => element.tagName), 'DETAILS');
    assert.equal(await schedule().evaluate(element => element.open), true);
    const airLimit = await eventTime('air-limit');
    near(await eventTime('air-restore'), 70);
    assert(airLimit > 0 && airLimit < 70);
    const events = await schedule().locator('[data-ops-event]').evaluateAll(nodes => nodes.map(node => ({ id: node.dataset.opsEvent, minute: Number(node.dataset.eventMinute) })));
    assert(events.every(item => Number.isFinite(item.minute) && item.minute >= 0 && item.minute <= 92));
    assert(events.every((item, index) => !index || item.minute >= events[index - 1].minute));
    await audit('[data-ops-events]', 'event schedule');
    await schedule().screenshot({ path: path.join(output, 'current-events-' + width + '.png'), animations: 'disabled' });
    await inspect('air', 'eclss', 70);
    assert.equal((await state()).opsEclssLab, 'air');
    assert(parseFloat(await page.locator('[data-air-reading="local"] strong').innerText()) > 4500);
    await audit('[data-ops-inspection]', 'air peak inspection');
    await banner().screenshot({ path: path.join(output, 'transient-air-peak-' + width + '.png'), animations: 'disabled' });

    // Hold animation scheduling so this is truly a same-time reinspection;
    // the native playback button still commits its ordinary playing state.
    const sameTime = (await state()).opsOrbitMinute, seekBefore = (await state()).opsAirSeekToken;
    await holdFrames();
    try {
      await activate(page.locator('[data-iss-playback-toggle="air"]'));
      await page.waitForFunction(() => document.querySelector('[data-iss-playback-toggle="air"]').getAttribute('aria-pressed') === 'true');
      near((await state()).opsOrbitMinute, sameTime);
      await activate(page.locator('[data-ops-rule="air"]'));
      await page.waitForFunction(() => document.querySelector('[data-iss-playback-toggle="air"]').getAttribute('aria-pressed') === 'false');
      near((await state()).opsOrbitMinute, sameTime);
      assert.notEqual((await state()).opsAirSeekToken, seekBefore);
    } finally {
      await releaseFrames();
    }
    await page.waitForFunction(() => document.activeElement?.id === 'iss-ops-inspection-title');
    await page.locator('#iss-air-time').focus();
    await page.keyboard.press('End');
    assert.equal(await banner().count(), 0, 'Changing the cursor invalidates the inspection context');
    assert(parseFloat(await page.locator('[data-air-reading="local"] strong').innerText()) < 3000);
    await inspect('air', 'eclss', 70);
    await page.locator('#iss-air-flow').focus();
    await page.keyboard.press('End');
    assert.equal(await banner().count(), 0, 'Changing the setup invalidates the inspection context');
    await fixture({ opsAirFlow: 3, opsAirRestore: true, opsAirRestoreMinute: 70 });
    await inspect('air', 'eclss', 70);
    await back();
    const protectedBeforeEvent = await protectedState();
    await activate(event('air-limit'));
    await page.waitForFunction(() => document.activeElement?.id === 'iss-ops-inspection-title');
    near((await state()).opsOrbitMinute, airLimit);
    assert.equal((await state()).opsEclssLab, 'air');
    assert.deepEqual(await protectedState(), protectedBeforeEvent);
    near(parseFloat(await page.locator('[data-air-reading="local"] strong').innerText()), 4000, 1);
    await back();
    checks.push({ kind: 'air', boundary: airLimit, peak: 70, sameTimePlaybackStopped: true, recoveredEndBelow3000: true });

    await fixture({ opsCmg: 78, opsAttitudeTorque: 2.4, opsAttitudeDump: true, opsAttitudeBurnMinute: 50 });
    const capacityTime = await eventTime('attitude-capacity');
    near(capacityTime, (19000 * .22 / 2.4) / 60);
    near(await eventTime('burn-start'), 50);
    await inspect('attitude', 'attitude', capacityTime);
    await banner().screenshot({ path: path.join(output, 'transient-attitude-peak-' + width + '.png'), animations: 'disabled' });
    await back();
    await activate(event('attitude-caution'));
    near((await state()).opsOrbitMinute, (19000 * .02 / 2.4) / 60);
    checks.push({ kind: 'attitude', peak: capacityTime, caution: (19000 * .02 / 2.4) / 60 });

    await fixture({ opsArrayAngle: 0, opsBattery: 20 });
    const emptyTime = await eventTime('battery-empty');
    assert(emptyTime > 0 && emptyTime < 92);
    await inspect('power', 'power', emptyTime);
    await back();
    const primaryBefore = await protectedState();
    await activate(page.locator('[data-ops-primary-inspect]'));
    await page.waitForFunction(() => document.activeElement?.id === 'iss-ops-inspection-title');
    assert.equal((await state()).opsMode, 'power');
    near((await state()).opsOrbitMinute, emptyTime);
    assert.deepEqual(await protectedState(), primaryBefore);
    checks.push({ kind: 'power', minimum: emptyTime, primaryInspect: true });

    await fixture({ opsCabinStart: 16 });
    near(await eventTime('thermal-limit'), 0);
    await inspect('thermal', 'thermal', 0);
    near(parseFloat(await page.locator('[data-thermal-reading="cabin"] strong').innerText()), 16, .01);
    checks.push({ kind: 'thermal', minimum: 0 });

    // Recovery efficiency is a static setup rule, not a 92-minute event.
    await fixture({ opsRecovery: 89, opsOrbitMinute: 32.123 });
    const clocks = await state();
    await inspect('water', 'eclss', null);
    const water = await state();
    assert.equal(water.opsEclssLab, 'water');
    for (const key of ['opsOrbitMinute', 'opsWaterDay', 'opsPressureMinute']) assert.equal(water[key], clocks[key]);
    assert.doesNotMatch(await banner().innerText(), /T\+\s*\d|\b\d+\.\d+\s*min(?:ute)?s?\b/);
    await holdFrames();
    try {
      await activate(page.locator('[data-iss-playback-toggle="water"]'));
      await page.waitForFunction(() => document.querySelector('[data-iss-playback-toggle="water"]').getAttribute('aria-pressed') === 'true');
      await activate(page.locator('[data-ops-rule="water"]'));
      await page.waitForFunction(() => document.querySelector('[data-iss-playback-toggle="water"]').getAttribute('aria-pressed') === 'false');
      const reinspected = await state();
      for (const key of ['opsOrbitMinute', 'opsWaterDay', 'opsPressureMinute']) assert.equal(reinspected[key], clocks[key]);
      assert.notEqual(reinspected.opsWaterSeekToken, water.opsWaterSeekToken);
    } finally {
      await releaseFrames();
    }
    await banner().screenshot({ path: path.join(output, 'water-setup-check-' + width + '.png'), animations: 'disabled' });
    await back();
    checks.push({ kind: 'water', orbitalTimeUnchanged: true, sameTimePlaybackStopped: true, waterDay: water.opsWaterDay, pressureMinute: water.opsPressureMinute });

    // Two different events in the same rounded minute must stay distinct.
    await fixture({ opsAirFlow: 3, opsAirRestore: true, opsAirRestoreMinute: 57.1, opsOrbitMinute: 57 });
    near(await eventTime('eclipse'), 57);
    near(await eventTime('air-restore'), 57.1);
    assert.equal(await event('eclipse').getAttribute('aria-pressed'), 'true');
    assert.equal(await event('air-restore').getAttribute('aria-pressed'), 'false');
    await activate(event('air-restore'));
    near((await state()).opsOrbitMinute, 57.1);
    await back();
    assert.equal(await event('eclipse').getAttribute('aria-pressed'), 'false');
    assert.equal(await event('air-restore').getAttribute('aria-pressed'), 'true');
    const cursor = page.locator('#iss-orbit-cursor');
    assert.equal(await cursor.getAttribute('step'), 'any');
    assert((await cursor.getAttribute('aria-valuetext')).includes('57.10'));
    await cursor.focus(); await page.keyboard.press('ArrowRight'); near((await state()).opsOrbitMinute, 58.1);
    await page.keyboard.press('PageDown'); near((await state()).opsOrbitMinute, 48.1);
    await page.keyboard.press('Home'); near((await state()).opsOrbitMinute, 0);
    await page.keyboard.press('End'); near((await state()).opsOrbitMinute, 92);
    checks.push({ kind: 'fractional-events', eclipse: 57, restoration: 57.1, keyboardStep: 1, keyboardPage: 10 });

    const fit = await schedule().evaluate(element => {
      const box = element.getBoundingClientRect();
      return { left: box.left, right: box.right, viewport: innerWidth, overflow: element.scrollWidth > element.clientWidth + 1,
        pageOverflow: document.documentElement.scrollWidth > innerWidth + 1,
        buttons: [...element.querySelectorAll('button')].map(node => { const rect = node.getBoundingClientRect(); return { width: rect.width, height: rect.height }; }) };
    });
    assert(fit.left >= -1 && fit.right <= width + 1 && !fit.overflow && !fit.pageOverflow);
    assert(fit.buttons.every(button => button.width >= 24 && button.height >= 24));
    if (width < 500) {
      await page.emulateMedia({ forcedColors: 'active' });
      await audit('[data-ops-events]', 'event schedule forced colors');
      await schedule().screenshot({ path: path.join(output, 'events-forced-colors-' + width + '.png'), animations: 'disabled' });
      await activate(event('air-restore'));
      await page.waitForFunction(() => document.activeElement?.id === 'iss-ops-inspection-title');
      await audit('[data-ops-inspection]', 'inspection forced colors');
      await banner().screenshot({ path: path.join(output, 'inspection-forced-colors-' + width + '.png'), animations: 'disabled' });
      await page.emulateMedia({ forcedColors: 'none' });
    }
    assert.deepEqual(errors, []);
    return { width, checks, audits, fit, errors };
  } finally {
    await page.evaluate(() => { const gate = window.__eventsFrameGate; if (gate) { window.requestAnimationFrame = gate.request; window.cancelAnimationFrame = gate.cancel; } window.__destroy?.(); }).catch(() => {});
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
    browser = await chromium.launch({ headless: true, ...(channel ? { channel } : {}) });
    const results = [];
    for (const width of widths) {
      results.push(await run(base, browser, width));
      await fs.writeFile(path.join(output, 'results.json'), JSON.stringify({ ok: results.length === widths.length, results }, null, 2));
      console.log('Critical-rule inspection, event chronology, clock/state preservation, keyboard focus, and accessibility passed at ' + width + 'px');
    }
    console.log(JSON.stringify({ ok: true, output, widths }));
  } finally {
    if (browser) await browser.close();
    if (preview) await new Promise(resolve => preview.server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
