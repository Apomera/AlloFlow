#!/usr/bin/env node
'use strict';

// Narrow native-control smoke for docking contact timing and fuel depletion.
// Fixture setup uses the existing canvas diagnostics; pulses, coasts, and resets
// use the visible controls. No synthetic physics ticks are issued by this script.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const { createPreview } = require('./space_station_enhancement_qa.cjs');
const ROOT = path.resolve(__dirname, '..');
const arg = (name, fallback) => process.argv.slice(2).find(value => value.startsWith(name + '='))?.slice(name.length + 1) || fallback;
const output = path.resolve(ROOT, arg('--out', 'reports/space-station-docking-events'));
const widths = arg('--widths', '1440,390').split(',').map(Number);
assert(widths.length && widths.every(width => Number.isInteger(width) && width >= 320));
const near = (actual, expected, tolerance = 1e-7) => {
  assert(Number.isFinite(actual) && Number.isFinite(expected));
  assert(Math.abs(actual - expected) <= tolerance, `${actual} should equal ${expected} within ${tolerance}`);
};

async function run(base, browser, width) {
  const page = await browser.newPage({ viewport: { width, height: 1000 }, isMobile: width < 500, hasTouch: width < 500, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const canvas = () => page.locator('[data-dock-canvas]');
  const hud = () => page.locator('[data-dock-hud]');
  const activate = async locator => { await locator.focus(); await page.keyboard.press('Enter'); };
  const state = () => canvas().evaluate(element => {
    const current = element._dockState, result = {};
    for (const key of ['x', 'y', 'vx', 'vy', 't', 'propellant', 'fuel', 'deltaV', 'over', 'overResult', 'paused', 'msg', 'lastManeuver']) result[key] = current[key];
    return JSON.parse(JSON.stringify(result));
  });
  const toolState = () => page.evaluate(() => {
    const current = window.__toolData.spaceStation;
    return { result: current.dockResult || null, debrief: current.dockDebrief || null, runs: current.dockRuns || 0 };
  });
  const seed = async values => {
    await canvas().evaluate((element, values) => {
      element._dockSetScenario('rendezvous');
      Object.assign(element._dockState, values, { paused: true, over: false, overResult: null, msg: '', lastManeuver: null });
      element._dockResetMilestones();
      element._dockSetTimeScale(1);
    }, values);
  };
  const restart = async () => {
    await activate(page.getByRole('button', { name: /New approach/ }));
    await page.waitForFunction(() => !window.__toolData.spaceStation.dockDebrief && !window.__toolData.spaceStation.dockResult);
    if (!(await state()).paused) await activate(page.locator('[data-dock-pause]'));
    const reset = await state();
    assert.equal(reset.over, false);
    assert.equal(reset.overResult, null);
    assert.equal(reset.propellant, 80);
    assert.equal(reset.fuel, 100);
    assert.equal(reset.msg, '');
    assert.equal(reset.lastManeuver, null);
    assert.doesNotMatch(await hud().innerText(), /Propellant depleted|run over/);
    assert.equal(await page.locator('[data-iss-dock-debrief]').count(), 0);
    return reset;
  };
  try {
    await page.goto(base + '/?tab=missions');
    await page.waitForFunction(() => document.querySelector('[data-dock-canvas]')?._dockState);
    assert.equal(await canvas().evaluate(element => element._dockRealMode), true);

    // Spend the last fuel during a native pulse, then keep coasting.
    await seed({ x: 0, y: -190, vx: 0, vy: 0, propellant: .001, fuel: .001 / 80 * 100, t: 0 });
    await page.locator('[data-dock-pulse-seconds]').selectOption('0.25');
    await activate(page.locator('[data-dock-maneuver="fwd"]'));
    const depleted = await state();
    near(depleted.t, .25, 1e-10);
    assert.equal(depleted.propellant, 0);
    assert.equal(depleted.over, false);
    near(depleted.lastManeuver.usedFuel, .001, 1e-12);
    assert.match(await hud().innerText(), /Propellant depleted: unpowered flight continues/);
    assert(await page.locator('[data-dock-maneuver="fwd"]').isDisabled());
    assert(await page.locator('[data-dock-maneuver="coast"]').isEnabled());
    await activate(page.locator('[data-dock-maneuver="coast"]'));
    const depletedCoast = await state();
    near(depletedCoast.t, 5.25);
    assert.equal(depletedCoast.over, false);
    assert(depletedCoast.y !== depleted.y || depletedCoast.x !== depleted.x);
    assert.equal((await toolState()).result, null);
    await hud().screenshot({ path: path.join(output, 'fuel-depletion-hud-' + width + '.png'), animations: 'disabled' });
    await canvas().screenshot({ path: path.join(output, 'fuel-depletion-canvas-' + width + '.png'), animations: 'disabled' });
    await restart();

    // Slow, fuel-free orbital motion remains an active approach inside the zone.
    await seed({ x: 26, y: -190, vx: 0, vy: .01, propellant: 0, fuel: 0, t: 0 });
    const forecast = await canvas().evaluate(element => element._dockForecastSample(10));
    const runsBeforeSlowCoast = (await toolState()).runs;
    await activate(page.locator('[data-dock-maneuver="coast"]'));
    await activate(page.locator('[data-dock-maneuver="coast"]'));
    const slowCoast = await state();
    near(slowCoast.t, 10);
    for (const key of ['x', 'y', 'vx', 'vy']) near(slowCoast[key], forecast[key], 1e-6);
    assert.equal(slowCoast.over, false);
    assert.equal(slowCoast.propellant, 0);
    assert.equal((await toolState()).runs, runsBeforeSlowCoast);
    assert.equal((await toolState()).debrief, null);
    assert.match(await hud().innerText(), /MET 10\.0 s/);
    assert.match(await hud().innerText(), /Propellant depleted: unpowered flight continues/);
    await hud().screenshot({ path: path.join(output, 'empty-tank-coast-' + width + '.png'), animations: 'disabled' });
    await restart();

    // The next contact occurs about 10 ms into a requested 5-second coast.
    await seed({ x: .6, y: -5.003, vx: -.015, vy: .3, propellant: 80, fuel: 100, t: 12.3 });
    const contactForecast = await canvas().evaluate(element => element._dockForecast());
    assert.equal(contactForecast.terminal, 'contact');
    assert(contactForecast.endpoint.time > 0 && contactForecast.endpoint.time < 1 / 60);
    const contactStart = await state();
    const priorRuns = (await toolState()).runs;
    await activate(page.locator('[data-dock-maneuver="coast"]'));
    await page.waitForFunction(() => !!window.__toolData.spaceStation.dockDebrief);
    const contact = await state(), report = await toolState();
    assert.equal(contact.over, true);
    assert.equal(contact.overResult, 'docked');
    assert.equal(report.result, 'docked');
    assert.equal(report.runs, priorRuns + 1);
    const eventDuration = contact.t - contactStart.t;
    assert(eventDuration > 0 && eventDuration < 1 / 60, 'Native coast ends before the rest of its first physics tick');
    near(eventDuration, contactForecast.endpoint.time, 1e-6);
    near(contact.lastManeuver.seconds, eventDuration, 1e-12);
    assert.equal(report.debrief.elapsed, contact.t, 'Persisted debrief uses the terminal mission time');
    near(report.debrief.range, Math.hypot(contact.x, contact.y), 1e-10);
    near(report.debrief.speed, Math.hypot(contact.vx, contact.vy), 1e-10);
    assert.match(await hud().innerText(), new RegExp('MET ' + contact.t.toFixed(1).replace('.', '\\.') + ' s'));
    assert.match(await hud().innerText(), /run over/);
    assert.equal(await page.locator('[data-dock-maneuver-reading="elapsed"]').innerText(), eventDuration.toFixed(2) + ' s');
    const debrief = page.locator('[data-iss-dock-debrief="docked"]');
    assert.match(await debrief.locator('svg').getAttribute('aria-label'), new RegExp('Elapsed time ' + contact.t.toFixed(0) + ' seconds'));
    assert(await page.locator('[data-dock-maneuver="coast"]').isDisabled());
    assert(await page.locator('[data-dock-maneuver="fwd"]').isDisabled());
    await hud().screenshot({ path: path.join(output, 'contact-hud-' + width + '.png'), animations: 'disabled' });
    await page.locator('[data-dock-maneuver-panel]').screenshot({ path: path.join(output, 'contact-step-' + width + '.png'), animations: 'disabled' });
    await debrief.screenshot({ path: path.join(output, 'contact-debrief-' + width + '.png'), animations: 'disabled' });
    near((await state()).t, contact.t, 1e-12);
    const restarted = await restart();
    await hud().screenshot({ path: path.join(output, 'restarted-hud-' + width + '.png'), animations: 'disabled' });
    assert.deepEqual(errors, []);
    return { width, depleted, depletedCoast, slowCoast, eventDuration, contact, debrief: report.debrief, restarted, errors };
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
    browser = await chromium.launch({ headless: true, ...(channel ? { channel } : {}) });
    const results = [];
    for (const width of widths) {
      results.push(await run(base, browser, width));
      await fs.writeFile(path.join(output, 'results.json'), JSON.stringify({ ok: results.length === widths.length, results }, null, 2));
      console.log('Native docking fuel depletion, continued empty-tank coast, sub-tick contact, debrief, and restart passed at ' + width + 'px');
    }
    console.log(JSON.stringify({ ok: true, output, widths }));
  } finally {
    if (browser) await browser.close();
    if (preview) await new Promise(resolve => preview.server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
