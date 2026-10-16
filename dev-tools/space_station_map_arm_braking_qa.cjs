#!/usr/bin/env node
'use strict';

// Real WebGL geometry and trusted controls. The live RAF clock is held; no server is started here.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const argument = (name, fallback) => process.argv.slice(2).find(value => value.startsWith(name + '='))?.slice(name.length + 1) || fallback;
const base = argument('--base', 'http://127.0.0.1:4179').replace(/\/$/, '');
const output = path.resolve(ROOT, argument('--out', 'reports/space-station-enhancement-qa/map-arm-braking-browser'));
const widths = argument('--widths', '1440,390').split(',').map(Number);
assert(widths.length && widths.every(width => Number.isInteger(width) && width >= 320));
let helpers;
const near = (actual, expected, tolerance = 1e-7) => {
  assert(Number.isFinite(actual) && Number.isFinite(expected), `Finite values required: ${actual}, ${expected}`);
  assert(Math.abs(actual - expected) <= tolerance, `${actual} should equal ${expected} within ${tolerance}`);
};
const vectorNear = (actual, expected, tolerance = 1e-6) => {
  assert(Array.isArray(actual) && Array.isArray(expected) && actual.length === expected.length);
  actual.forEach((value, index) => near(value, expected[index], tolerance));
};
const wrap = angle => ((angle + 180) % 360 + 360) % 360 - 180;
const kinematicKeys = ['shoulder', 'elbow', 'shoulderRate', 'elbowRate'];
function fk(shoulder, elbow) {
  const a = shoulder * Math.PI / 180, b = (shoulder + elbow) * Math.PI / 180;
  const joint = [-1.4 * Math.sin(a), 1.4 * Math.cos(a), 0];
  return { joint, tip: [joint[0] - 1.2 * Math.sin(b), joint[1] + 1.2 * Math.cos(b), 0] };
}
// Independent analytic stop: each axis decelerates at 0.5 degrees/s² until its own zero crossing.
function stoppedAt(initial, seconds) {
  const answer = {};
  for (const axis of ['shoulder', 'elbow']) {
    const rate = initial[axis + 'Rate'], duration = Math.min(Math.max(0, seconds), Math.abs(rate) / .5);
    answer[axis] = wrap(initial[axis] + rate * duration - Math.sign(rate) * .25 * duration * duration);
    answer[axis + 'Rate'] = Math.sign(rate) * Math.max(0, Math.abs(rate) - .5 * duration);
  }
  return { ...answer, ...fk(answer.shoulder, answer.elbow) };
}
function sameCamera(before, after) {
  for (const key of ['position', 'target', 'stationQuaternion']) vectorNear(after.camera[key], before.camera[key]);
  for (const key of ['fit', 'focusId', 'view', 'guides', 'tweening']) assert.equal(after.camera[key], before.camera[key]);
  near(after.camera.distance, before.camera.distance);
}
function sameArmKinematics(before, after, { target = true } = {}) {
  for (const key of kinematicKeys) near(after.arm.actual[key], before.arm.actual[key], 1e-10);
  near(after.arm.elapsed, before.arm.elapsed); assert.deepEqual(after.arm.pose, before.arm.pose);
  if (target) assert.deepEqual(after.arm.target, before.arm.target);
}
function samePhysical(before, after, { camera = true, playing = true, target = true } = {}) {
  for (const key of ['phase', 'beta', 'arrayAlpha', 'arrayFeather', 'actualAlphaRate', 'actualFeatherRate', 'driveElapsed', 'commandAlpha', 'commandFeather', 'motorRate', 'motorAcceleration', 'rate']) near(after.state[key], before.state[key]);
  for (const key of ['tracking', 'motorEnabled', 'motorSmooth', 'motorBraking']) assert.equal(after.state[key], before.state[key]);
  if (playing) assert.equal(after.state.playing, before.state.playing);
  sameArmKinematics(before, after, { target }); if (camera) sameCamera(before, after);
}

function observeRenderer() {
  const Original = THREE.WebGLRenderer;
  window.__issArmBrakeQA = { draw: null, sequence: 0, contexts: [], events: [] };
  function ObservedRenderer(options) {
    const renderer = new Original(options), render = renderer.render;
    window.__issArmBrakeQA.contexts.push(renderer.getContext());
    renderer.render = function (scene, camera) {
      const returned = render.apply(this, arguments), cv = renderer.domElement;
      if (scene.name !== 'iss-station-inspection' || !cv._issArmBrakeState) return returned;
      const group = scene.getObjectByName('iss-arm-brake-path-group'); if (!group) return returned;
      const visible = object => { if (!object) return false; for (let node = object; node; node = node.parent) if (!node.visible) return false; return true; };
      const object = name => {
        const node = scene.getObjectByName(name); if (!node) return null;
        return { visible: visible(node), position: node.position.toArray(), quaternion: node.quaternion.toArray(),
          positions: node.geometry?.attributes.position ? Array.from(node.geometry.attributes.position.array) : null };
      };
      window.__issArmBrakeQA.draw = { sequence: ++window.__issArmBrakeQA.sequence, brake: cv._issArmBrakeState(), arm: cv._issArmState(),
        preview: cv._issArmPreviewState(), state: cv._issLightingState(), camera: cv._issCameraState(), width: cv.clientWidth, height: cv.clientHeight,
        group: object('iss-arm-brake-path-group'), path: object('iss-arm-brake-path'), stop: object('iss-arm-brake-stop'), ghost: object('iss-arm-brake-ghost') };
      return returned;
    };
    return renderer;
  }
  ObservedRenderer.prototype = Original.prototype; Object.setPrototypeOf(ObservedRenderer, Original); THREE.WebGLRenderer = ObservedRenderer;
}

function verify(snapshot) {
  const { brake, arm, preview, draw } = snapshot, plan = brake.plan;
  assert(draw?.path && draw.stop && draw.ghost, 'Stopping path, terminal hand marker and stopped arm are real scene objects');
  assert.equal(snapshot.glLost, false); assert.equal(brake.braking, arm.actual.braking);
  assert.equal(brake.visible, brake.showPath && arm.enabled && !preview.active);
  assert.equal(draw.group.visible, brake.visible); vectorNear(draw.group.position, arm.base); vectorNear(draw.group.quaternion, [0, 0, 0, 1]);
  assert.equal(plan.initial.braking, true);
  for (const key of kinematicKeys) near(plan.initial[key], arm.actual[key], 1e-10);
  near(plan.shoulderStopSeconds, Math.abs(arm.actual.shoulderRate) / .5);
  near(plan.elbowStopSeconds, Math.abs(arm.actual.elbowRate) / .5);
  near(plan.stopSeconds, Math.max(plan.shoulderStopSeconds, plan.elbowStopSeconds));
  for (const axis of ['shoulder', 'elbow']) near(plan[axis + 'Drift'], Math.sign(arm.actual[axis + 'Rate']) * arm.actual[axis + 'Rate'] ** 2);
  const terminal = stoppedAt(arm.actual, plan.stopSeconds);
  for (const key of kinematicKeys) near(plan.stopped[key], terminal[key], 1e-10);
  vectorNear(plan.tip, terminal.tip); vectorNear(plan.joint, terminal.joint); vectorNear(draw.stop.position, terminal.tip);
  assert.equal(plan.samples.length, 33); assert.equal(draw.path.positions.length, 99);
  plan.samples.forEach((sample, index) => {
    near(sample.seconds, plan.stopSeconds * index / 32, 1e-12);
    const expected = stoppedAt(arm.actual, sample.seconds);
    for (const key of kinematicKeys) near(sample[key], expected[key], 1e-10);
    vectorNear(sample.tip, expected.tip); vectorNear(sample.joint, expected.joint);
    vectorNear(draw.path.positions.slice(index * 3, index * 3 + 3), expected.tip, 3e-6);
  });
  vectorNear(draw.ghost.positions, [0, 0, 0, ...terminal.joint, ...terminal.tip], 3e-6);
  assert.equal(snapshot.togglePressed, String(brake.braking)); assert.equal(snapshot.pathPressed, String(brake.showPath));
  assert.equal(snapshot.advanceDisabled, !(brake.braking && plan.stopSeconds > 0));
  assert.equal(snapshot.previewDisabled, !(brake.braking && plan.stopSeconds > 0));
  near(snapshot.readings.time, plan.stopSeconds); near(snapshot.readings.shoulder, plan.shoulderDrift); near(snapshot.readings.elbow, plan.elbowDrift);
  assert(snapshot.status.length); return snapshot;
}

function verifyAdvance(before, after, seconds) {
  const expected = stoppedAt(before.arm.actual, seconds);
  const drive = helpers.driveStep({ ...before.state, arrayAlpha: before.state.commandAlpha, arrayFeather: before.state.commandFeather,
    actualAlpha: before.state.arrayAlpha, actualFeather: before.state.arrayFeather,
    actualAlphaRate: before.state.actualAlphaRate, actualFeatherRate: before.state.actualFeatherRate }, seconds);
  for (const key of kinematicKeys) near(after.arm.actual[key], expected[key], 1e-10);
  vectorNear(after.arm.pose.tip, expected.tip); near(after.arm.elapsed, before.arm.elapsed + seconds);
  near(after.state.driveElapsed, before.state.driveElapsed + seconds); near(after.state.phase, drive.phase);
  near(after.state.arrayAlpha, drive.alpha); near(after.state.arrayFeather, drive.feather);
  near(after.state.actualAlphaRate, drive.alphaRate); near(after.state.actualFeatherRate, drive.featherRate);
  assert.deepEqual(after.arm.target, before.arm.target); sameCamera(before, after);
  assert(after.brake.braking); assert(!after.preview.active && !after.forecast.active && !after.state.playing);
}

async function runWidth(browser, width) {
  const phone = width < 500, height = phone ? 844 : 1080, errors = [], result = { width, touch: phone, checks: {}, screenshots: [] };
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000); page.on('pageerror', error => errors.push(error.stack || error.message));
  const canvas = page.locator('.iss-station-stage canvas'), panel = page.locator('[data-iss-arm-brake-panel]');
  const activate = locator => phone ? locator.tap() : locator.click();
  const read = () => canvas.evaluate(cv => {
    const q = selector => document.querySelector(selector), gl = cv.getContext('webgl2') || cv.getContext('webgl');
    return { arm: cv._issArmState(), brake: cv._issArmBrakeState(), preview: cv._issArmPreviewState(), forecast: cv._issForecastState(),
      state: cv._issLightingState(), camera: cv._issCameraState(), draw: window.__issArmBrakeQA.draw, glLost: gl?.isContextLost(),
      togglePressed: q('[data-iss-arm-brake-toggle]').getAttribute('aria-pressed'), pathPressed: q('[data-iss-arm-brake-path]').getAttribute('aria-pressed'),
      advanceDisabled: q('[data-iss-arm-brake-advance]').disabled, previewDisabled: q('[data-iss-arm-brake-preview]').disabled,
      readings: Object.fromEntries(['time', 'shoulder', 'elbow'].map(key => [key, Number(q('[data-iss-arm-brake-reading="' + key + '"]').getAttribute('data-value'))])),
      status: q('[data-iss-arm-brake-status]').textContent.trim(), events: window.__issArmBrakeQA.events.slice(-150) };
  });
  const ready = async () => {
    await page.evaluate(() => new Promise(resolve => window.__issArmBrakeNativeRAF(() => window.__issArmBrakeNativeRAF(resolve))));
    await page.waitForFunction(() => {
      const cv = document.querySelector('.iss-station-stage canvas'), draw = window.__issArmBrakeQA?.draw;
      if (!cv?._issArmBrakeState || !draw) return false;
      const camera = cv._issCameraState();
      return !camera.tweening && JSON.stringify(cv._issArmBrakeState()) === JSON.stringify(draw.brake) &&
        JSON.stringify(cv._issArmState().actual) === JSON.stringify(draw.arm.actual) &&
        camera.position.every((value, index) => Math.abs(value - draw.camera.position[index]) < 1e-8) && draw.width === cv.clientWidth && draw.height === cv.clientHeight;
    }, undefined, { polling: 100 });
    return verify(await read());
  };
  const isolated = async (action, options) => { const before = await ready(); await action(); const after = await ready(); samePhysical(before, after, options); return after; };
  const screenshot = async (locator, label) => {
    await locator.scrollIntoViewIfNeeded(); await ready(); const filename = `map-arm-braking-${label}-${width}.png`;
    await locator.screenshot({ path: path.join(output, filename), animations: 'disabled' }); result.screenshots.push(filename);
  };
  try {
    console.log(`Checking arm braking and stopping geometry at ${width}px`);
    await page.addInitScript(() => {
      window.AlloPostFXEnabled = false; window.__issArmBrakeClock = 0; window.__issArmBrakeNativeRAF = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = callback => window.__issArmBrakeNativeRAF(() => callback(window.__issArmBrakeClock));
    });
    await page.route('**/vendor/three-r128/three.min.js', async route => {
      const response = await route.fetch(); assert(response.ok()); await route.fulfill({ response, body: (await response.text()) + '\n;(' + observeRenderer.toString() + ')();\n' });
    });
    await page.goto(`${base}/?tab=map`, { waitUntil: 'load' }); await panel.waitFor({ state: 'attached' });
    await page.evaluate(() => ['click', 'keydown', 'pointerdown'].forEach(type => document.addEventListener(type, event => {
      const node = event.target.closest('[data-iss-arm-brake-toggle],[data-iss-arm-brake-path],[data-iss-arm-brake-advance],[data-iss-arm-brake-preview]');
      if (node) window.__issArmBrakeQA.events.push({ type, key: event.key, pointerType: event.pointerType, trusted: event.isTrusted,
        action: Array.from(node.attributes).find(attribute => /^data-iss-arm-brake-/.test(attribute.name))?.name });
    }, true)));
    let after = await ready(); assert(!after.brake.braking); near(after.brake.plan.stopSeconds, 0);
    await activate(page.locator('[data-iss-arm-toggle]')); await activate(page.locator('[data-iss-arm-preset="high"]'));
    await canvas.evaluate(cv => { cv._issSetLighting({ motorEnabled: true, motorSmooth: true, tracking: false, arrayAlpha: 75, arrayFeather: 20 }); cv._issStepLighting(3); });
    after = await ready(); assert(after.brake.plan.stopSeconds > 0);
    if (!after.brake.showPath) after = await isolated(() => activate(page.locator('[data-iss-arm-brake-path]')));
    assert(after.brake.visible); assert(!after.brake.braking);
    const unlatched = after; after = await isolated(() => canvas.evaluate(cv => cv._issAdvanceArmBrake())); assert.deepEqual(after.brake, unlatched.brake);
    after = await isolated(() => canvas.evaluate(cv => cv._issPreviewArmBrake())); assert(!after.preview.active);
    await activate(page.locator('[data-iss-forecast-toggle]')); after = await ready(); assert(after.forecast.active);
    after = await isolated(() => activate(page.locator('[data-iss-arm-brake-toggle]')), { playing: false });
    assert(after.brake.braking && !after.forecast.active && !after.preview.active && !after.state.playing);
    result.checks.closedFormPlanGeometryAndLatchIsolation = true;

    after = await isolated(() => activate(page.locator('[data-iss-arm-preset="wide"]')), { target: false }); assert(after.brake.braking);
    after = await isolated(() => activate(page.locator('[data-iss-arm-hold]')), { target: false }); assert(after.brake.braking);
    after = await isolated(() => activate(page.locator('[data-iss-arm-preset="high"]')), { target: false }); assert(after.brake.braking);
    after = await isolated(() => activate(page.locator('[data-iss-camera-fit="arm"]')), { camera: false }); assert(after.brake.braking); assert.equal(after.camera.focusId, 'arm');
    const beforeArrayControls = after;
    await canvas.evaluate(cv => cv._issSetLighting({ arrayAlpha: -65, arrayFeather: -20 })); after = await ready();
    sameArmKinematics(beforeArrayControls, after); sameCamera(beforeArrayControls, after); assert(after.brake.braking);
    result.checks.latchSurvivesTargetHoldCameraAndArrayCommands = true;

    after = await isolated(() => activate(page.locator('[data-iss-arm-brake-preview]')), { playing: false });
    assert(after.preview.active && !after.preview.playing && !after.brake.visible); near(after.preview.seconds, after.brake.plan.stopSeconds);
    const predicted = stoppedAt(after.arm.actual, after.preview.seconds);
    for (const key of kinematicKeys) near(after.preview.selected[key], predicted[key], 1e-10);
    vectorNear(after.preview.selected.tip, predicted.tip);
    const previewBeforePath = after.preview;
    after = await isolated(async () => { await page.locator('[data-iss-arm-brake-path]').focus(); await page.keyboard.press('Space'); });
    assert.deepEqual(after.preview, previewBeforePath); assert(!after.brake.showPath && !after.brake.visible);
    after = await isolated(() => activate(page.locator('[data-iss-arm-brake-path]'))); assert.deepEqual(after.preview, previewBeforePath); assert(after.brake.showPath && !after.brake.visible);
    after = await isolated(() => activate(page.locator('[data-iss-arm-toggle]'))); assert(!after.arm.enabled && after.preview.active && !after.brake.visible);
    after = await isolated(() => activate(page.locator('[data-iss-arm-toggle]'))); assert(after.arm.enabled && after.preview.active && !after.brake.visible);
    const beforeApply = after;
    await activate(page.locator('[data-iss-arm-preview-apply]')); after = await ready(); verifyAdvance(beforeApply, after, beforeApply.preview.seconds);
    near(after.brake.plan.stopSeconds, 0); assert(after.advanceDisabled && after.previewDisabled && after.brake.visible);
    after = await isolated(() => canvas.evaluate(cv => { cv._issAdvanceArmBrake(); cv._issPreviewArmBrake(); })); assert(!after.preview.active);
    result.checks.exactBrakingPreviewAndApplyWithPurePathSettings = true;

    after = await isolated(() => activate(page.locator('[data-iss-arm-brake-toggle]')), { playing: false }); assert(!after.brake.braking);
    const targetBeforeMotion = after.arm.target;
    await canvas.evaluate(cv => cv._issStepLighting(3)); after = await ready(); assert(after.brake.plan.stopSeconds > 0); assert.deepEqual(after.arm.target, targetBeforeMotion);
    after = await isolated(() => activate(page.locator('[data-iss-arm-brake-toggle]')), { playing: false }); assert(after.brake.braking);
    await canvas.evaluate(cv => cv._issSetLighting({ rate: 1 })); after = await ready(); assert(after.brake.braking);
    await activate(page.locator('[data-iss-live-play]')); const beforeLiveBrake = await ready(); assert(beforeLiveBrake.state.playing);
    await page.evaluate(() => { window.__issArmBrakeClock += 1000; }); await ready();
    await canvas.evaluate(cv => cv._issSetLighting({ playing: false })); after = await ready(); verifyAdvance(beforeLiveBrake, after, .25);
    const beforePartial = after;
    await canvas.evaluate(cv => cv._issStepLighting(.375)); after = await ready(); verifyAdvance(beforePartial, after, .375);
    assert(after.brake.plan.stopSeconds > 0); assert(after.brake.plan.stopSeconds < beforePartial.brake.plan.stopSeconds);
    after = await isolated(() => activate(page.locator('[data-iss-arm-preview-toggle]')), { playing: false }); assert(after.preview.active);
    after = await isolated(() => activate(page.locator('[data-iss-arm-brake-toggle]')), { playing: false }); assert(!after.brake.braking && !after.preview.active);
    const beforeReleasedStep = after, brakeOnly = stoppedAt(after.arm.actual, .5);
    await canvas.evaluate(cv => cv._issStepLighting(.5)); after = await ready(); assert(!after.brake.braking); assert.deepEqual(after.arm.target, beforeReleasedStep.arm.target);
    assert(kinematicKeys.some(key => Math.abs(after.arm.actual[key] - brakeOnly[key]) > 1e-6), 'Released servo follows its retained target rather than continuing brake-only motion');
    after = await isolated(() => activate(page.locator('[data-iss-arm-brake-toggle]')), { playing: false }); assert(after.brake.braking && after.brake.plan.stopSeconds > 0);
    await screenshot(page.locator('.iss-station-stage'), 'stopping-path'); await screenshot(panel, 'controls');
    const beforeAdvance = await ready();
    await activate(page.locator('[data-iss-arm-brake-advance]')); after = await ready(); verifyAdvance(beforeAdvance, after, beforeAdvance.brake.plan.stopSeconds); near(after.brake.plan.stopSeconds, 0);
    await canvas.evaluate(cv => cv._issStepLighting(7.25)); const rested = await ready();
    for (const key of kinematicKeys) near(rested.arm.actual[key], after.arm.actual[key], 1e-10);
    near(rested.arm.elapsed, after.arm.elapsed + 7.25); assert(rested.brake.braking);
    result.checks.partialBrakingReleaseResumeExactAdvanceAndLatchedRest = true;

    const beforeHide = await ready(); after = await isolated(() => activate(page.locator('[data-iss-arm-toggle]'))); assert(!after.brake.visible && after.brake.showPath);
    after = await isolated(() => activate(page.locator('[data-iss-arm-toggle]'))); assert(after.brake.visible); assert.deepEqual(after.brake.plan, beforeHide.brake.plan);
    const layout = await page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth,
      controls: Array.from(document.querySelectorAll('[data-iss-arm-brake-panel] button'), node => {
        const box = node.getBoundingClientRect(); return { left: box.left, right: box.right, width: box.width, height: box.height };
      }) }));
    assert(layout.width <= width + 1); for (const control of layout.controls) { assert(control.width > 0 && control.left >= -1 && control.right <= width + 1); if (phone) assert(control.height >= 44 - .1); }
    await page.addScriptTag({ path: path.join(ROOT, 'desktop/web-app/node_modules/axe-core/axe.min.js') });
    const accessibility = await page.evaluate(async () => {
      const checked = await axe.run({ include: ['[data-iss-arm-panel]'] }, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
      return { passes: checked.passes.length, violations: checked.violations.map(item => ({ id: item.id, targets: item.nodes.map(node => node.target) })) };
    });
    assert.deepEqual(accessibility.violations, []); result.checks.layout = layout; result.checks.accessibility = accessibility;
    after = await ready();
    for (const action of ['toggle', 'path', 'advance', 'preview']) assert(after.events.some(event => event.action === 'data-iss-arm-brake-' + action && event.type === 'click' && event.trusted), `Trusted ${action} interaction exercised`);
    assert(after.events.some(event => event.action === 'data-iss-arm-brake-path' && event.type === 'keydown' && event.key === ' ' && event.trusted));
    assert(after.events.some(event => event.type === 'pointerdown' && event.trusted && event.pointerType === (phone ? 'touch' : 'mouse')));
    result.errors = errors; result.hostErrors = await page.evaluate(() => window.__events?.errors || []); assert.deepEqual(errors, []); assert.deepEqual(result.hostErrors, []);
    result.passed = true; console.log(`Arm braking geometry, controls, shared clock, isolation and accessibility passed at ${width}px`); return result;
  } catch (error) {
    result.passed = false; result.failure = error.stack || error.message; result.errors = errors;
    result.lastSnapshot = await read().catch(() => null); error.qaResult = result; throw error;
  } finally {
    try {
      result.checks.cleanup = await page.evaluate(() => {
        document.querySelector('.iss-station-stage canvas')?._issSetLighting?.({ playing: false }); window.__destroy?.();
        return { contexts: window.__issArmBrakeQA?.contexts.length || 0, lost: (window.__issArmBrakeQA?.contexts || []).map(gl => gl.isContextLost()), canvases: document.querySelectorAll('.iss-station-stage canvas').length };
      });
      if (result.passed) { assert(result.checks.cleanup.contexts > 0); assert(result.checks.cleanup.lost.every(Boolean)); assert.equal(result.checks.cleanup.canvases, 0); assert.deepEqual(errors, []); }
    } catch (error) {
      if (result.passed) { result.passed = false; result.failure = error.stack || error.message; error.qaResult = result; throw error; }
      result.cleanupFailure = error.stack || error.message;
    } finally { await page.close(); }
  }
}

async function main() {
  const source = await fs.readFile(path.join(ROOT, 'stem_lab/stem_tool_spacestation.js'), 'utf8');
  helpers = new Function(source.slice(source.indexOf('  var ISS_GM ='), source.indexOf('  function issTransferPlan(')) + '\nreturn { driveStep: issMapDriveStep };')();
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const results = []; let failure;
  try {
    for (const width of widths) {
      try { results.push(await runWidth(browser, width)); }
      catch (error) { results.push(error.qaResult || { width, passed: false, failure: error.stack || error.message }); failure = error; break; }
      finally { const temporary = path.join(output, 'results.json.tmp'); await fs.writeFile(temporary, JSON.stringify({ base, results }, null, 2) + '\n'); await fs.rename(temporary, path.join(output, 'results.json')); }
    }
  } finally { await browser.close(); }
  if (failure) throw failure;
  console.log(`3D arm braking checks passed: ${widths.join(', ')}px. Results: ${output}`);
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
