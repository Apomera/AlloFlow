#!/usr/bin/env node
'use strict';

// Live Map thermal integration, visible heat flow, and native controls.
// Uses an existing preview server; never starts a second server or browser job.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const arg = (name, fallback) => process.argv.slice(2).find(value => value.startsWith(name + '='))?.slice(name.length + 1) || fallback;
const base = arg('--base', 'http://127.0.0.1:4179').replace(/\/$/, '');
const output = path.resolve(ROOT, arg('--out', 'reports/space-station-enhancement-qa/map-thermal-browser'));
const widths = arg('--widths', '1440,390').split(',').map(Number);
assert(widths.length && widths.every(width => Number.isInteger(width) && width >= 320));
const physicalKeys = ['elapsed', 'cabin', 'radiator', 'generated', 'absorbed', 'radiated', 'transferred'];
const near = (actual, expected, tolerance = 1e-7) => { assert(Number.isFinite(actual) && Number.isFinite(expected), `Finite values required: ${actual}, ${expected}`); assert(Math.abs(actual - expected) <= tolerance, `${actual} should equal ${expected} within ${tolerance}`); };
const vectorNear = (actual, expected, tolerance = 1e-7) => { assert(Array.isArray(actual) && Array.isArray(expected) && actual.length === expected.length); actual.forEach((value, index) => near(value, expected[index], tolerance)); };
const sameThermal = (before, after) => physicalKeys.forEach(key => near(after.thermal.physical[key], before.thermal.physical[key]));
function sameMechanics(before, after, options = {}) {
  for (const key of ['phase', 'beta', 'arrayAlpha', 'arrayFeather', 'actualAlphaRate', 'actualFeatherRate', 'driveElapsed', 'commandAlpha', 'commandFeather', 'motorRate', 'motorAcceleration', 'rate', 'incidence', 'generation']) near(after.light[key], before.light[key]);
  for (const key of ['tracking', 'motorEnabled', 'motorSmooth', 'motorBraking', 'eclipse']) assert.equal(after.light[key], before.light[key]);
  if (!options.allowPause) assert.equal(after.light.playing, before.light.playing);
  vectorNear(after.camera.stationQuaternion, before.camera.stationQuaternion);
  for (const key of ['shoulder', 'elbow', 'shoulderRate', 'elbowRate']) near(after.arm.actual[key], before.arm.actual[key]);
  near(after.arm.elapsed, before.arm.elapsed); assert.equal(after.arm.actual.braking, before.arm.actual.braking); assert.deepEqual(after.arm.target, before.arm.target);
  if (!options.allowPreview) { assert.deepEqual(after.preview, before.preview); assert.deepEqual(after.forecast, before.forecast); }
}
function sameSimulation(before, after, options) { sameMechanics(before, after, options); sameThermal(before, after); }

function observeThermal() {
  const Original = THREE.WebGLRenderer, qa = window.__issThermalQA = { draw: null, sequence: 0, contexts: [], resources: {}, activations: {}, inputs: [] };
  function record(resource, kind) {
    if (!resource || qa.resources[resource.uuid]) return;
    const entry = qa.resources[resource.uuid] = { uuid: resource.uuid, kind, disposed: false };
    resource.addEventListener('dispose', () => { entry.disposed = true; });
  }
  function ObservedRenderer(options) {
    const renderer = new Original(options), original = renderer.render; qa.contexts.push(renderer.getContext());
    renderer.render = function (scene, camera) {
      const result = original.apply(this, arguments), cv = renderer.domElement;
      if (scene.name !== 'iss-station-inspection' || !cv._issThermalState) return result;
      const group = scene.getObjectByName('iss-map-heat-flow'), arrows = {}, bodies = {}, solar = [];
      if (group) group.traverse(node => { record(node.geometry, 'geometry'); (Array.isArray(node.material) ? node.material : [node.material]).filter(Boolean).forEach(material => record(material, 'material')); });
      for (const side of ['a', 'b']) {
        const body = scene.getObjectByName('iss-radiator-panel-' + side), material = body?.material;
        if (material) bodies[side] = { color: material.color.toArray(), emissive: material.emissive?.toArray(), emissiveMap: !!material.emissiveMap, map: material.map?.uuid, type: material.type };
        for (const kind of ['transfer', 'emission']) {
          const name = 'iss-map-heat-' + kind + '-' + side, node = scene.getObjectByName(name);
          if (node) arrows[kind + '-' + side] = { visible: node.visible, position: node.position.toArray(), direction: new THREE.Vector3(0, 1, 0).applyQuaternion(node.quaternion).toArray(), length: node.cone?.position.y, lineScale: node.line?.scale.toArray(), overlays: [node.line, node.cone].map(part => ({ transparent: part.material.transparent, depthTest: part.material.depthTest, depthWrite: part.material.depthWrite, order: part.renderOrder })) };
        }
      }
      scene.traverse(node => { if (/^iss-solar-blanket-/.test(node.name) && node.isMesh) solar.push({ name: node.name, materials: (Array.isArray(node.material) ? node.material : [node.material]).map(material => ({ color: material.color.toArray(), emissive: material.emissive?.toArray(), intensity: material.emissiveIntensity, map: material.map?.uuid || null })) }); });
      qa.draw = { sequence: ++qa.sequence, thermal: cv._issThermalState(), light: cv._issLightingState(), camera: cv._issCameraState(), forecast: cv._issForecastState(), group: group ? { visible: group.visible } : null,
        arrows, bodies, solar, width: cv.clientWidth, height: cv.clientHeight, directSun: scene.getObjectByName('iss-direct-sun')?.intensity };
      return result;
    };
    return renderer;
  }
  ObservedRenderer.prototype = Original.prototype; Object.setPrototypeOf(ObservedRenderer, Original); THREE.WebGLRenderer = ObservedRenderer;
}

function energyBalance(thermal) {
  const state = thermal.physical, readings = thermal.readings;
  // Independent conservation check in kJ, using the model's documented reservoirs.
  near(24000 * (state.cabin - 22), state.generated - state.transferred, 1e-5);
  near(6000 * (state.radiator - 4), state.transferred + state.absorbed - state.radiated, 1e-5);
  for (const key of ['balanceKWh', 'cabinBalanceKWh', 'radiatorBalanceKWh']) near(readings[key], 0, 1e-7);
  near(readings.cabinStorageKW, readings.heatKW - readings.transferKW);
  near(readings.radiatorStorageKW, readings.transferKW + readings.absorbedKW - readings.emittedKW);
  near(readings.cabinRate, readings.cabinStorageKW / 24000 * 60);
  near(readings.radiatorRate, readings.radiatorStorageKW / 6000 * 60);
}
function verify(snapshot) {
  const { thermal, draw } = snapshot;
  assert(draw?.group && draw.bodies.a && draw.bodies.b, 'Heat-flow group and both radiator surfaces exist');
  assert.equal(snapshot.glLost, false); assert.equal(snapshot.light.playing, false); assert.equal(snapshot.forecast.playing, false);
  assert.equal(snapshot.panel.visible, thermal.enabled); assert.equal(snapshot.toggle, String(thermal.enabled)); assert.equal(draw.group.visible, thermal.enabled);
  assert(!snapshot.camera.tweening && !snapshot.camera.activePointers);
  physicalKeys.forEach(key => { assert(Number.isFinite(thermal.physical[key])); near(draw.thermal.physical[key], thermal.physical[key]); });
  energyBalance(thermal);
  for (const side of ['a', 'b']) {
    const body = draw.bodies[side], emission = draw.arrows['emission-' + side], transfer = draw.arrows['transfer-' + side];
    assert.equal(body.type, 'MeshStandardMaterial'); vectorNear(body.emissive, [0, 0, 0]); assert.equal(body.emissiveMap, false); assert(body.map);
    if (!thermal.enabled) vectorNear(body.color, [1, 1, 1]);
    for (const arrow of [emission, transfer]) { assert(arrow); assert(arrow.position.every(Number.isFinite)); near(Math.hypot(...arrow.direction), 1); assert(arrow.lineScale.every(Number.isFinite)); assert(Number.isFinite(arrow.length)); arrow.overlays.forEach(part => { assert(part.transparent && !part.depthTest && !part.depthWrite && part.order === 31, 'Heat arrows render after transparent station hardware'); }); }
    assert(emission.visible && emission.length > 0, 'Infrared emission exists independently of sunlight and pump power');
    assert(side === 'a' ? emission.direction[0] < -.99 : emission.direction[0] > .99, 'Infrared arrows point away from the station');
    assert.equal(transfer.visible, Math.abs(thermal.readings.transferKW) > 1e-6);
    if (transfer.visible) { assert(transfer.length > 0); assert((side === 'a' ? -1 : 1) * Math.sign(thermal.readings.transferKW) * transfer.direction[0] > .99, 'Transfer arrow follows the signed heat flow'); }
  }
  assert.equal(draw.bodies.a.map, draw.bodies.b.map); assert.equal(draw.solar.length, 8);
  assert(snapshot.panel.readings.length >= 4, 'Compact inspector exposes thermal readings');
  if (thermal.enabled) {
    const r = thermal.readings, expected = { cabin: r.cabin.toFixed(2) + ' °C', radiator: r.radiator.toFixed(2) + ' °C', transferKW: r.transferKW.toFixed(1) + ' kW', emittedKW: r.emittedKW.toFixed(1) + ' kW',
      heatKW: r.heatKW.toFixed(1) + ' kW', absorbedKW: r.absorbedKW.toFixed(1) + ' kW', radiatorStorageKW: (r.radiatorStorageKW >= 0 ? '+' : '') + r.radiatorStorageKW.toFixed(1) + ' kW',
      elapsed: Math.floor(r.elapsed / 60) + ':' + String(Math.floor(r.elapsed % 60)).padStart(2, '0'), load: thermal.config.heatKW + ' kW', coupling: thermal.config.cooling + '%' };
    snapshot.panel.readings.forEach(reading => { assert(Object.hasOwn(expected, reading.key), `Known displayed reading ${reading.key}`); assert.equal(reading.text, expected[reading.key], `${reading.key} displays the current physical value`); });
  }
  near(draw.directSun, snapshot.light.eclipse ? 0 : 1.35); return snapshot;
}
function verifyStep(model, before, after, seconds) {
  const expected = model.step(before.thermal.config, before.thermal.physical, before.light, seconds);
  physicalKeys.forEach(key => near(after.thermal.physical[key], expected[key], 1e-6));
  near(after.thermal.physical.elapsed - before.thermal.physical.elapsed, seconds);
  near(after.arm.elapsed - before.arm.elapsed, seconds);
  if (before.light.motorEnabled) near(after.light.driveElapsed - before.light.driveElapsed, seconds);
  near(after.light.phase, (before.light.phase + seconds * 360 / before.light.periodSeconds) % 360, 1e-6);
  energyBalance(after.thermal);
}

async function runWidth(browser, width, model) {
  const phone = width < 500, height = phone ? 844 : 1080, errors = [], consoleErrors = [], result = { width, touch: phone, checks: {}, screenshots: [] };
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000); page.on('pageerror', error => errors.push(error.stack || error.message)); page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  const canvas = page.locator('.iss-station-stage canvas'), stage = page.locator('.iss-station-stage'), panel = page.locator('[data-iss-map-thermal-panel]');
  const control = name => page.locator('[data-iss-map-thermal-' + name + ']'); let activationSequence = 0;
  const activate = async (locator, keyboard = false) => {
    const token = ++activationSequence;
    await locator.evaluate((node, id) => node.addEventListener('click', event => {
      const cv = document.querySelector('.iss-station-stage canvas');
      window.__issThermalQA.activations[id] = { trusted: event.isTrusted, label: node.textContent.trim(), thermal: cv._issThermalState(), light: cv._issLightingState(), arm: cv._issArmState(), camera: cv._issCameraState(), forecast: cv._issForecastState(), preview: cv._issArmPreviewState() };
    }, { once: true, capture: true }), token);
    if (keyboard) { await locator.focus(); await page.keyboard.press('Enter'); } else if (phone) await locator.tap(); else await locator.click();
    // Native touch completion can precede its compatibility click.
    await page.waitForFunction(id => window.__issThermalQA?.activations[id]?.trusted === true, token, { polling: 50 });
    return token;
  };
  const keyRange = async (locator, key) => { await locator.focus(); await page.keyboard.press(key); };
  const read = () => canvas.evaluate(cv => {
    const node = document.querySelector('[data-iss-map-thermal-panel]'), caption = document.querySelector('[data-iss-map-thermal-caption]'), visible = node => !!node && !node.closest('[hidden]') && node.getClientRects().length > 0;
    const gl = cv.getContext('webgl2') || cv.getContext('webgl');
    return { thermal: cv._issThermalState(), light: cv._issLightingState(), arm: cv._issArmState(), camera: cv._issCameraState(), forecast: cv._issForecastState(), preview: cv._issArmPreviewState(), draw: window.__issThermalQA.draw,
      panel: { visible: visible(node), readings: Array.from(document.querySelectorAll('[data-iss-map-thermal-reading]'), item => ({ key: item.getAttribute('data-iss-map-thermal-reading'), text: item.textContent.trim() })) },
      caption: { visible: visible(caption), text: caption?.textContent.trim() || '' }, toggle: document.querySelector('[data-iss-map-thermal-toggle]')?.getAttribute('aria-pressed'), glLost: gl?.isContextLost(), activations: window.__issThermalQA.activations };
  });
  const ready = async () => {
    await page.waitForFunction(() => {
      const cv = document.querySelector('.iss-station-stage canvas'), draw = window.__issThermalQA?.draw; if (!cv?._issThermalState || !draw) return false;
      const thermal = cv._issThermalState(), light = cv._issLightingState(), camera = cv._issCameraState(), forecast = cv._issForecastState();
      return !light.playing && !forecast.playing && !camera.tweening && !camera.activePointers && JSON.stringify(thermal) === JSON.stringify(draw.thermal) &&
        light.phase === draw.light.phase && light.eclipse === draw.light.eclipse && forecast.active === draw.forecast.active && forecast.seconds === draw.forecast.seconds &&
        camera.focusId === draw.camera.focusId && camera.position.every((value, index) => Math.abs(value - draw.camera.position[index]) < 1e-8) && draw.width === cv.clientWidth && draw.height === cv.clientHeight;
    }, undefined, { polling: 100 }); return verify(await read());
  };
  const pure = async action => { const before = await ready(); await action(); const after = await ready(); sameSimulation(before, after); return after; };
  const capture = async label => { for (const [kind, locator] of [['stage', stage], ['panel', panel]]) { await locator.scrollIntoViewIfNeeded(); await ready(); const file = `map-thermal-${label}-${kind}-${width}.png`; await locator.screenshot({ path: path.join(output, file), animations: 'disabled' }); result.screenshots.push(file); } };
  try {
    console.log(`Checking live Map thermal model at ${width}px`);
    await page.addInitScript(() => { let seed = 42; Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }; window.AlloPostFXEnabled = false; });
    await page.route('**/vendor/three-r128/three.min.js', async route => { const response = await route.fetch(); assert(response.ok()); await route.fulfill({ response, body: (await response.text()) + '\n;(' + observeThermal.toString() + ')();\n' }); });
    await page.goto(`${base}/?tab=map`, { waitUntil: 'load' }); await control('toggle').waitFor();
    await canvas.evaluate(cv => { cv._issSetLighting({ beta: 20, phase: 0, playing: false, motorEnabled: true, motorSmooth: true }); cv._issResetThermal(); });
    let after = await ready(); assert.equal(after.thermal.enabled, false); assert.equal(after.thermal.config.heatKW, 60); assert.equal(after.thermal.config.cooling, 86); assert.equal(after.thermal.config.pump, true);
    physicalKeys.forEach(key => near(after.thermal.physical[key], model.initial()[key])); const solar = after.draw.solar;
    after = await pure(() => activate(control('toggle'))); assert(after.thermal.enabled); assert(after.draw.bodies.a.color.some(value => Math.abs(value - 1) > .01)); assert.deepEqual(after.draw.solar, solar);
    result.checks.defaultModelAndPureOverlay = true;

    let before = after; await keyRange(control('load'), 'ArrowRight'); after = await ready(); sameSimulation(before, after); near(after.thermal.config.heatKW, 65); near(after.thermal.readings.heatKW - before.thermal.readings.heatKW, 5); assert(after.thermal.readings.cabinRate > before.thermal.readings.cabinRate);
    before = after; await keyRange(control('coupling'), 'ArrowLeft'); after = await ready(); sameSimulation(before, after); near(after.thermal.config.cooling, 85); assert(after.thermal.readings.transferKW < before.thermal.readings.transferKW);
    before = after; await activate(control('pump')); after = await ready(); sameSimulation(before, after); assert.equal(after.thermal.config.pump, false); near(after.thermal.readings.transferKW, 0); assert(after.thermal.readings.emittedKW > 0);
    before = after; await activate(control('pump'), true); after = await ready(); sameSimulation(before, after); assert(after.thermal.config.pump); assert(after.thermal.readings.transferKW > 0);
    result.checks.nativeLoadCouplingPumpPreserveThermalHistory = true;

    before = after; await activate(control('step')); after = await ready(); verifyStep(model, before, after, 60); assert(after.thermal.physical.elapsed > 0); assert.notEqual(after.thermal.physical.radiator, before.thermal.physical.radiator);
    after = await pure(() => activate(control('toggle'))); assert(!after.thermal.enabled);
    for (const seconds of [.25, 3]) { before = after; await canvas.evaluate((cv, duration) => cv._issStepLighting(duration), seconds); after = await ready(); verifyStep(model, before, after, seconds); assert(!after.thermal.enabled); }
    after = await pure(() => activate(control('toggle'))); assert.deepEqual(after.draw.solar, solar);
    result.checks.sharedClockAndHiddenFractionalAdvance = true;

    before = after; await activate(page.locator('[data-iss-lighting-preset="midnight"]')); after = await ready(); sameThermal(before, after); assert(after.light.eclipse); assert.equal(after.thermal.readings.lit, false); assert(after.thermal.readings.absorbedKW < before.thermal.readings.absorbedKW);
    before = after; await activate(control('pump')); after = await ready(); sameSimulation(before, after); near(after.thermal.readings.transferKW, 0); assert(after.thermal.readings.emittedKW > 0);
    before = after; await activate(control('step')); after = await ready(); verifyStep(model, before, after, 60); assert(after.thermal.physical.cabin > before.thermal.physical.cabin); assert(after.thermal.physical.radiator < before.thermal.physical.radiator);
    after = await pure(() => activate(page.locator('[data-iss-camera-fit="radiator-a"]'))); assert.equal(after.camera.focusId, 'radiator-a'); assert(after.caption.visible && after.caption.text.length > 0); await capture('eclipse-pump-off');
    before = after; await activate(page.locator('[data-iss-lighting-preset="noon"]')); after = await ready(); sameThermal(before, after); assert(!after.light.eclipse); assert.equal(after.thermal.readings.lit, true);
    await activate(control('pump')); after = await ready(); await capture('day');
    result.checks.continuousTemperaturesAndNightRadiation = true;

    await canvas.evaluate(cv => cv._issSetLighting({ phase: 100, beta: 20, playing: false })); before = await ready();
    await activate(page.locator('[data-iss-forecast-toggle]')); after = await ready(); sameSimulation(before, after, { allowPreview: true }); assert(after.forecast.active);
    for (const [key, seconds] of [['Home', 0], ['ArrowRight', .1], ['End', 600]]) { before = after; await keyRange(page.locator('[data-iss-forecast-slider]'), key); after = await ready(); sameSimulation(before, after, { allowPreview: true }); near(after.forecast.seconds, seconds); }
    before = after; await keyRange(control('load'), 'ArrowRight'); after = await ready(); sameSimulation(before, after); near(after.thermal.config.heatKW, 70); assert(after.forecast.active);
    after = await pure(() => activate(control('toggle'))); after = await pure(() => activate(control('toggle')));
    after = await pure(() => activate(page.locator('[data-iss-camera-fit="radiator-b"]'))); assert.equal(after.camera.focusId, 'radiator-b');
    before = after; assert(before.forecast.selected.eclipse, 'The selected future crosses into Earth shadow from a sunlit start'); assert(!before.light.eclipse);
    await activate(page.locator('[data-iss-forecast-apply]')); after = await ready(); verifyStep(model, before, after, 600); assert(!after.forecast.active && after.light.eclipse); assert.deepEqual(after.draw.solar, solar);
    result.checks.previewPurityAndCrossingAwareCommit = true;

    // The click capture records the exact live physical state immediately before
    // React handles the pump edit, avoiding a timing-dependent pre-click snapshot.
    before = after; await activate(control('play')); await page.waitForFunction(elapsed => document.querySelector('.iss-station-stage canvas')._issThermalState().physical.elapsed > elapsed, before.thermal.physical.elapsed);
    const stopToken = await activate(control('pump')); after = await ready(); const atEdit = after.activations[stopToken]; assert(atEdit.light.playing); sameSimulation(atEdit, after, { allowPause: true }); assert(!after.light.playing); assert(after.thermal.physical.elapsed > before.thermal.physical.elapsed);
    result.checks.sharedPlaybackAndConfigPauseAreContinuous = true;

    before = after; await activate(control('reset'), true); after = await ready(); sameMechanics(before, after); assert.deepEqual(after.thermal.config, before.thermal.config); assert.equal(after.thermal.enabled, before.thermal.enabled); physicalKeys.forEach(key => near(after.thermal.physical[key], model.initial()[key]));
    result.checks.resetOnlyResetsThermalReservoirs = true;

    const layout = await page.evaluate(() => {
      const box = node => { const r = node.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
      const panel = document.querySelector('[data-iss-map-thermal-panel]');
      return { viewport: innerWidth, width: document.documentElement.scrollWidth, panel: box(panel), controls: Array.from(panel.querySelectorAll('button,input'), node => ({ ...box(node), tag: node.tagName, type: node.type, min: node.min, max: node.max, step: node.step, name: node.getAttribute('aria-label') || node.labels?.[0]?.textContent.trim() || node.textContent.trim() })) };
    });
    assert(layout.width <= width + 1); layout.controls.forEach((control, index) => { assert(control.name.length); assert(control.width > 0 && control.left >= -1 && control.right <= width + 1); assert(control.left >= layout.panel.left - 1 && control.right <= layout.panel.right + 1); if (phone) assert(control.height >= 43.9, 'Phone thermal controls have 44px targets'); layout.controls.slice(index + 1).forEach(other => assert(Math.min(control.right, other.right) - Math.max(control.left, other.left) < 1 || Math.min(control.bottom, other.bottom) - Math.max(control.top, other.top) < 1)); });
    const ranges = layout.controls.filter(control => control.type === 'range'); assert(ranges.some(control => control.min === '0' && control.max === '120' && control.step === '5')); assert(ranges.some(control => control.min === '0' && control.max === '100' && control.step === '1'));
    await page.addScriptTag({ path: path.join(ROOT, 'desktop/web-app/node_modules/axe-core/axe.min.js') });
    const accessibility = await page.evaluate(async () => { const checked = await axe.run({ include: ['[data-iss-map-thermal-panel]', '[data-iss-camera-tools]'] }, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } }); return { passes: checked.passes.length, violations: checked.violations.map(item => ({ id: item.id, targets: item.nodes.map(node => node.target) })) }; });
    assert.deepEqual(accessibility.violations, []); result.checks.layoutAndAccessibility = { layout, accessibility };
    result.errors = errors; result.consoleErrors = consoleErrors; result.hostErrors = await page.evaluate(() => window.__events?.errors || []); assert.deepEqual(errors, []); assert.deepEqual(consoleErrors, []); assert.deepEqual(result.hostErrors, []);
    result.passed = true; console.log(`Map thermal integration, rendering, controls and accessibility passed at ${width}px`); return result;
  } catch (error) { result.passed = false; result.failure = error.stack || error.message; result.errors = errors; result.consoleErrors = consoleErrors; result.lastSnapshot = await read().catch(() => null); error.qaResult = result; throw error; }
  finally {
    try {
      result.checks.cleanup = await page.evaluate(() => { document.querySelector('.iss-station-stage canvas')?._issSetLighting?.({ playing: false }); window.__destroy?.(); const qa = window.__issThermalQA;
        return { contexts: qa?.contexts.length || 0, lost: (qa?.contexts || []).map(gl => gl.isContextLost()), resources: Object.values(qa?.resources || {}), canvases: document.querySelectorAll('.iss-station-stage canvas').length }; });
      if (result.passed) { assert(result.checks.cleanup.contexts > 0 && result.checks.cleanup.lost.every(Boolean)); assert.equal(result.checks.cleanup.canvases, 0); assert(result.checks.cleanup.resources.length > 0 && result.checks.cleanup.resources.every(resource => resource.disposed)); assert.deepEqual(errors, []); }
    } catch (error) { if (result.passed) { result.passed = false; result.failure = error.stack || error.message; error.qaResult = result; throw error; } result.cleanupFailure = error.stack || error.message; }
    finally { await page.close(); }
  }
}
async function main() {
  const source = await fs.readFile(path.join(ROOT, 'stem_lab/stem_tool_spacestation.js'), 'utf8'), begin = source.indexOf('var ISS_GM'), end = source.indexOf('function issThermalMargin');
  assert(begin >= 0 && end > begin && source.slice(begin, end).includes('function issMapThermalStep'));
  const model = new Function(source.slice(begin, end) + ';return {initial:issMapThermalInitial,step:issMapThermalStep,inspect:issMapThermalInspect};')();
  await fs.mkdir(output, { recursive: true }); const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const report = { base, generatedAt: new Date().toISOString(), widths, results: [] };
  try { for (const width of widths) { try { report.results.push(await runWidth(browser, width, model)); } catch (error) { report.results.push(error.qaResult || { width, passed: false, failure: error.stack || error.message }); throw error; } } }
  finally { await browser.close(); await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(report, null, 2) + '\n'); }
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
