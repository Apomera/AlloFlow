#!/usr/bin/env node
'use strict';

// Trusted desktop/touch controls against the real WebGL scene; never starts a server.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const argument = (name, fallback) => process.argv.slice(2).find(value => value.startsWith(name + '='))?.slice(name.length + 1) || fallback;
const base = argument('--base', 'http://127.0.0.1:4179').replace(/\/$/, '');
const output = path.resolve(ROOT, argument('--out', 'reports/space-station-enhancement-qa/map-arm-stage-browser'));
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
const kinematicKeys = ['shoulder', 'elbow', 'shoulderRate', 'elbowRate'];
const wrap = angle => ((angle + 180) % 360 + 360) % 360 - 180;
function stopAt(initial, seconds) {
  const result = {};
  for (const axis of ['shoulder', 'elbow']) {
    const rate = initial[axis + 'Rate'], duration = Math.min(Math.max(0, seconds), Math.abs(rate) / .5);
    result[axis] = wrap(initial[axis] + rate * duration - Math.sign(rate) * .25 * duration * duration);
    result[axis + 'Rate'] = Math.sign(rate) * Math.max(0, Math.abs(rate) - .5 * duration);
  }
  const a = result.shoulder * Math.PI / 180, b = (result.shoulder + result.elbow) * Math.PI / 180;
  result.joint = [-1.4 * Math.sin(a), 1.4 * Math.cos(a), 0];
  result.tip = [result.joint[0] - 1.2 * Math.sin(b), result.joint[1] + 1.2 * Math.cos(b), 0];
  return result;
}
function sameCamera(before, after) {
  for (const key of ['position', 'target', 'stationQuaternion']) vectorNear(after.camera[key], before.camera[key]);
  for (const key of ['fit', 'focusId', 'view', 'guides', 'tweening']) assert.equal(after.camera[key], before.camera[key]);
  near(after.camera.distance, before.camera.distance);
}
function sameArm(before, after, target = true) {
  for (const key of kinematicKeys) near(after.arm.actual[key], before.arm.actual[key], 1e-10);
  near(after.arm.elapsed, before.arm.elapsed); assert.deepEqual(after.arm.pose, before.arm.pose);
  if (target) assert.deepEqual(after.arm.target, before.arm.target);
}
function samePhysical(before, after, { camera = true, playing = true, rate = true, target = true } = {}) {
  for (const key of ['phase', 'beta', 'arrayAlpha', 'arrayFeather', 'actualAlphaRate', 'actualFeatherRate', 'driveElapsed', 'commandAlpha', 'commandFeather', 'motorRate', 'motorAcceleration']) near(after.state[key], before.state[key]);
  for (const key of ['tracking', 'motorEnabled', 'motorSmooth', 'motorBraking']) assert.equal(after.state[key], before.state[key]);
  if (rate) near(after.state.rate, before.state.rate);
  if (playing) assert.equal(after.state.playing, before.state.playing);
  sameArm(before, after, target); if (camera) sameCamera(before, after);
}
function observeRenderer() {
  const Original = THREE.WebGLRenderer;
  window.__issArmStageQA = { draw: null, sequence: 0, contexts: [], events: [] };
  function ObservedRenderer(options) {
    const renderer = new Original(options), render = renderer.render;
    window.__issArmStageQA.contexts.push(renderer.getContext());
    renderer.render = function (scene, camera) {
      const returned = render.apply(this, arguments), cv = renderer.domElement;
      if (scene.name !== 'iss-station-inspection' || !cv._issArmBrakeState) return returned;
      const object = name => {
        const node = scene.getObjectByName(name); if (!node) return null;
        let visible = true; for (let ancestor = node; ancestor; ancestor = ancestor.parent) visible = visible && ancestor.visible;
        return { visible, position: node.position.toArray(), positions: node.geometry?.attributes.position ? Array.from(node.geometry.attributes.position.array) : null };
      };
      window.__issArmStageQA.draw = { sequence: ++window.__issArmStageQA.sequence, brake: cv._issArmBrakeState(), arm: cv._issArmState(),
        preview: cv._issArmPreviewState(), state: cv._issLightingState(), camera: cv._issCameraState(), width: cv.clientWidth, height: cv.clientHeight,
        group: object('iss-arm-brake-path-group'), path: object('iss-arm-brake-path'), stop: object('iss-arm-brake-stop'), ghost: object('iss-arm-brake-ghost') };
      return returned;
    };
    return renderer;
  }
  ObservedRenderer.prototype = Original.prototype; Object.setPrototypeOf(ObservedRenderer, Original); THREE.WebGLRenderer = ObservedRenderer;
}
function verify(snapshot) {
  const { arm, brake, preview, draw, stage } = snapshot, plan = brake.plan;
  assert.equal(snapshot.glLost, false); assert(draw?.path && draw.stop && draw.ghost);
  assert.equal(stage.visible, arm.enabled && !preview.active);
  assert.equal(snapshot.previewStageVisible, arm.enabled && preview.active);
  assert.equal(brake.braking, arm.actual.braking);
  assert.equal(brake.visible, brake.showPath && arm.enabled && !preview.active);
  assert.equal(draw.group.visible, brake.visible); vectorNear(draw.group.position, arm.base);
  near(plan.stopSeconds, Math.max(Math.abs(arm.actual.shoulderRate), Math.abs(arm.actual.elbowRate)) / .5);
  const terminal = stopAt(arm.actual, plan.stopSeconds);
  vectorNear(draw.stop.position, terminal.tip); vectorNear(draw.ghost.positions, [0, 0, 0, ...terminal.joint, ...terminal.tip], 3e-6);
  assert.equal(plan.samples.length, 33); assert.equal(draw.path.positions.length, 99);
  plan.samples.forEach((sample, index) => {
    const expected = stopAt(arm.actual, plan.stopSeconds * index / 32);
    for (const key of kinematicKeys) near(sample[key], expected[key], 1e-10);
    vectorNear(draw.path.positions.slice(index * 3, index * 3 + 3), expected.tip, 3e-6);
  });
  if (stage.visible) {
    assert.equal(stage.pressed.play, String(snapshot.state.playing)); assert.equal(stage.pressed.brake, String(brake.braking));
    assert.equal(stage.disabled.rest, !(brake.braking && plan.stopSeconds > 0));
    assert.equal(stage.disabled.preview, brake.braking && plan.stopSeconds <= 0);
    near(stage.rate, snapshot.state.rate);
    near(stage.readings.speed, helpers.motion(arm.actual).speed); near(stage.readings.time, plan.stopSeconds);
    const attainable = arm.target.attainable || arm.target.tip;
    assert(Array.isArray(attainable), 'Arm target exposes its attainable endpoint');
    near(stage.readings.gap, Math.hypot(...arm.pose.tip.map((value, index) => value - attainable[index])));
    for (const axis of ['shoulder', 'elbow']) {
      near(stage.readings[axis + '-stop'], plan[axis + 'StopSeconds']);
      near(stage.bars[axis].value, plan[axis + 'StopSeconds']); near(stage.bars[axis].percent, plan[axis + 'StopSeconds'] / 4 * 100, 1e-5);
    }
    assert(stage.status.length, 'Visible console has a meaningful status');
  }
  return snapshot;
}
function verifyAdvance(before, after, seconds) {
  const expected = helpers.armStep({ ...before.arm.actual, targetShoulder: before.arm.target.shoulder, targetElbow: before.arm.target.elbow }, seconds);
  const drive = helpers.driveStep({ ...before.state, arrayAlpha: before.state.commandAlpha, arrayFeather: before.state.commandFeather,
    actualAlpha: before.state.arrayAlpha, actualFeather: before.state.arrayFeather,
    actualAlphaRate: before.state.actualAlphaRate, actualFeatherRate: before.state.actualFeatherRate }, seconds);
  for (const key of kinematicKeys) near(after.arm.actual[key], expected[key], 1e-10);
  near(after.arm.elapsed, before.arm.elapsed + seconds); near(after.state.driveElapsed, before.state.driveElapsed + seconds);
  near(after.state.phase, drive.phase); near(after.state.arrayAlpha, drive.alpha); near(after.state.arrayFeather, drive.feather);
  near(after.state.actualAlphaRate, drive.alphaRate); near(after.state.actualFeatherRate, drive.featherRate);
  assert.deepEqual(after.arm.target, before.arm.target); assert.equal(after.brake.braking, before.brake.braking); sameCamera(before, after);
  assert(!after.preview.active && !after.forecast.active && !after.state.playing);
}

async function runWidth(browser, width) {
  const phone = width < 500, height = phone ? 844 : 1080, errors = [], result = { width, touch: phone, checks: {}, screenshots: [] };
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000); page.on('pageerror', error => errors.push(error.stack || error.message));
  const canvas = page.locator('.iss-station-stage canvas'), consolePanel = page.locator('[data-iss-arm-stage]');
  const stageButton = action => page.locator('[data-iss-arm-stage-' + action + ']');
  const activate = locator => phone ? locator.tap() : locator.click();
  const read = () => canvas.evaluate(cv => {
    const q = selector => document.querySelector(selector), shown = node => !!node && !node.hidden && node.getClientRects().length > 0;
    const gl = cv.getContext('webgl2') || cv.getContext('webgl'), stage = q('[data-iss-arm-stage]');
    return { arm: cv._issArmState(), brake: cv._issArmBrakeState(), preview: cv._issArmPreviewState(), forecast: cv._issForecastState(),
      state: cv._issLightingState(), camera: cv._issCameraState(), draw: window.__issArmStageQA.draw, glLost: gl?.isContextLost(),
      previewStageVisible: shown(q('[data-iss-arm-preview-stage]')),
      stage: { visible: shown(stage), status: q('[data-iss-arm-stage-status]').textContent.trim(), rate: Number(q('[data-iss-arm-stage-rate]').value),
        pressed: Object.fromEntries(['play', 'brake'].map(key => [key, q('[data-iss-arm-stage-' + key + ']').getAttribute('aria-pressed')])),
        disabled: Object.fromEntries(['rest', 'preview'].map(key => [key, q('[data-iss-arm-stage-' + key + ']').disabled])),
        readings: Object.fromEntries(['speed', 'time', 'gap', 'shoulder-stop', 'elbow-stop'].map(key => [key, Number(q('[data-iss-arm-stage-reading="' + key + '"]').getAttribute('data-value'))])),
        bars: Object.fromEntries(['shoulder', 'elbow'].map(key => { const node = q('[data-iss-arm-stage-bar="' + key + '"]'); return [key, { value: Number(node.getAttribute('data-value')), percent: parseFloat(node.style.width) }]; })) },
      focused: Array.from(document.activeElement?.attributes || []).map(attribute => attribute.name), events: window.__issArmStageQA.events.slice(-200) };
  });
  const ready = async () => {
    await page.evaluate(() => new Promise(resolve => window.__issArmStageNativeRAF(() => window.__issArmStageNativeRAF(resolve))));
    await page.waitForFunction(() => {
      const cv = document.querySelector('.iss-station-stage canvas'), draw = window.__issArmStageQA?.draw;
      if (!cv?._issArmBrakeState || !draw) return false;
      const camera = cv._issCameraState();
      return !camera.tweening && JSON.stringify(cv._issArmBrakeState()) === JSON.stringify(draw.brake) &&
        JSON.stringify(cv._issArmState().actual) === JSON.stringify(draw.arm.actual) &&
        camera.position.every((value, index) => Math.abs(value - draw.camera.position[index]) < 1e-8) && draw.width === cv.clientWidth && draw.height === cv.clientHeight;
    }, undefined, { polling: 100 });
    return verify(await read());
  };
  const isolated = async (action, options) => { const before = await ready(); await action(); const after = await ready(); samePhysical(before, after, options); return after; };
  const capture = async label => {
    const filename = `map-arm-stage-${label}-${width}.png`;
    await page.locator('.iss-station-stage').scrollIntoViewIfNeeded(); await ready();
    const clip = await page.evaluate(() => {
      const nodes = [document.querySelector('.iss-station-stage'), document.querySelector('[data-iss-arm-stage]')].filter(node => node.getClientRects().length && !node.hidden);
      const bounds = nodes.map(node => node.getBoundingClientRect()), left = Math.min(...bounds.map(box => box.left)), top = Math.min(...bounds.map(box => box.top));
      return { x: left + scrollX, y: top + scrollY, width: Math.max(...bounds.map(box => box.right)) - left, height: Math.max(...bounds.map(box => box.bottom)) - top };
    });
    await page.screenshot({ path: path.join(output, filename), clip, animations: 'disabled' }); result.screenshots.push(filename);
  };
  try {
    console.log(`Checking arm stage controls at ${width}px`);
    await page.addInitScript(() => {
      window.AlloPostFXEnabled = false; window.__issArmStageClock = 0; window.__issArmStageNativeRAF = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = callback => window.__issArmStageNativeRAF(() => callback(window.__issArmStageClock));
    });
    await page.route('**/vendor/three-r128/three.min.js', async route => {
      const response = await route.fetch(); assert(response.ok()); await route.fulfill({ response, body: (await response.text()) + '\n;(' + observeRenderer.toString() + ')();\n' });
    });
    await page.goto(`${base}/?tab=map`, { waitUntil: 'load' }); await consolePanel.waitFor({ state: 'attached' });
    await page.evaluate(() => ['click', 'keydown', 'pointerdown', 'change'].forEach(type => document.addEventListener(type, event => {
      const node = event.target.closest('[data-iss-arm-stage] button,[data-iss-arm-stage-rate],[data-iss-arm-preview-stage-apply],[data-iss-arm-preview-stage-close],[data-iss-arm-preview-stage-time]');
      if (node) window.__issArmStageQA.events.push({ type, key: event.key, pointerType: event.pointerType, trusted: event.isTrusted,
        action: Array.from(node.attributes).find(attribute => /^data-iss-arm-(stage-|preview-stage-)/.test(attribute.name))?.name });
    }, true)));
    let after = await ready(); assert(!after.arm.enabled && !after.stage.visible);
    await activate(page.locator('[data-iss-arm-toggle]')); await activate(page.locator('[data-iss-arm-preset="high"]'));
    await canvas.evaluate(cv => { cv._issSetLighting({ motorEnabled: true, motorSmooth: true, tracking: false, arrayAlpha: 75, arrayFeather: 20 }); cv._issStepLighting(3); cv._issSetArmBrake({ showPath: true }); });
    after = await ready(); assert(after.stage.visible && after.brake.plan.stopSeconds > 0);
    after = await isolated(() => activate(stageButton('frame')), { camera: false }); assert.equal(after.camera.focusId, 'arm');
    const beforeRate = after;
    await stageButton('rate').focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Tab');
    after = await ready(); samePhysical(beforeRate, after, { rate: false }); near(after.state.rate, 1);
    assert(after.events.some(event => event.action === 'data-iss-arm-stage-rate' && event.type === 'change' && event.trusted));
    const beforeQuarter = after; await activate(stageButton('step')); after = await ready(); verifyAdvance(beforeQuarter, after, .25);
    result.checks.sharedQuarterStepRateAndCamera = true;

    const beforePlay = after; after = await isolated(() => activate(stageButton('play')), { playing: false }); assert(after.state.playing);
    await page.evaluate(() => { window.__issArmStageClock += 1000; }); await ready();
    await activate(stageButton('play')); after = await ready(); verifyAdvance(beforePlay, after, .25);
    result.checks.sharedPlayPauseWithControlledFrame = true;

    await activate(page.locator('[data-iss-forecast-toggle]')); after = await ready(); assert(after.forecast.active);
    after = await isolated(() => activate(stageButton('brake')), { playing: false });
    assert(after.brake.braking && !after.forecast.active && !after.preview.active && !after.state.playing);
    after = await isolated(() => activate(page.locator('[data-iss-arm-preset="wide"]')), { target: false }); assert(after.brake.braking);
    const beforeBrakedQuarter = after; await activate(stageButton('step')); after = await ready(); verifyAdvance(beforeBrakedQuarter, after, .25);
    assert(after.brake.plan.stopSeconds < beforeBrakedQuarter.brake.plan.stopSeconds);
    for (const axis of ['shoulder', 'elbow']) assert(after.stage.bars[axis].value <= beforeBrakedQuarter.stage.bars[axis].value);
    await capture('braking');
    after = await isolated(() => activate(stageButton('preview')), { playing: false });
    assert(after.preview.active && !after.stage.visible && after.previewStageVisible); near(after.preview.seconds, after.brake.plan.stopSeconds);
    assert(after.focused.includes('data-iss-arm-preview-stage-time'));
    const stopped = stopAt(after.arm.actual, after.preview.seconds);
    for (const key of kinematicKeys) near(after.preview.selected[key], stopped[key], 1e-10);
    after = await isolated(async () => { await page.locator('[data-iss-arm-preview-stage-time]').focus(); await page.keyboard.press('Home'); });
    near(after.preview.seconds, 0); assert(await page.locator('[data-iss-arm-preview-stage-apply]').isDisabled());
    for (const key of kinematicKeys) near(after.preview.selected[key], after.arm.actual[key], 1e-10);
    after = await isolated(() => activate(page.locator('[data-iss-arm-preview-stage-close]')));
    assert(after.stage.visible && !after.preview.active && after.focused.includes('data-iss-arm-stage-brake'));
    result.checks.brakeLatchRetargetAndPureStopPreviewFocus = true;

    const beforeRest = after; await activate(stageButton('rest')); after = await ready(); verifyAdvance(beforeRest, after, beforeRest.brake.plan.stopSeconds);
    near(after.brake.plan.stopSeconds, 0); assert(after.stage.disabled.rest && after.stage.disabled.preview);
    const beforeHeldStep = after; await activate(stageButton('step')); after = await ready(); verifyAdvance(beforeHeldStep, after, .25); sameArm(beforeHeldStep, { ...after, arm: { ...after.arm, elapsed: beforeHeldStep.arm.elapsed } });
    after = await isolated(async () => { await stageButton('brake').focus(); await page.keyboard.press('Space'); }, { playing: false });
    assert(!after.brake.braking && !after.stage.disabled.preview && after.stage.disabled.rest);
    after = await isolated(() => activate(stageButton('preview')), { playing: false });
    assert(after.preview.active && !after.stage.visible); near(after.preview.horizonSeconds, 120); assert(!after.preview.initial.braking);
    assert(after.focused.includes('data-iss-arm-preview-stage-time'));
    after = await isolated(() => activate(page.locator('[data-iss-arm-preview-stage-close]')));
    assert(after.focused.includes('data-iss-arm-stage-brake'));
    result.checks.advanceToRestLatchedHoldAndReleasePreview = true;

    await activate(stageButton('step')); after = await ready(); assert(after.brake.plan.stopSeconds > 0);
    after = await isolated(() => activate(stageButton('brake')), { playing: false });
    after = await isolated(() => activate(stageButton('preview')), { playing: false });
    const beforeApply = after; await activate(page.locator('[data-iss-arm-preview-stage-apply]')); after = await ready();
    verifyAdvance(beforeApply, after, beforeApply.preview.seconds); near(after.brake.plan.stopSeconds, 0);
    assert(after.stage.visible && !after.previewStageVisible && after.focused.includes('data-iss-arm-stage-brake'));
    after = await isolated(() => activate(page.locator('[data-iss-arm-toggle]'))); assert(!after.stage.visible);
    after = await isolated(() => activate(page.locator('[data-iss-arm-toggle]'))); assert(after.stage.visible && after.brake.braking);
    await capture('rest');
    result.checks.previewStageApplyAndVisibilityPersistence = true;

    const layout = await page.evaluate(() => {
      const box = node => { const rect = node.getBoundingClientRect(); return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height }; };
      return { viewport: innerWidth, width: document.documentElement.scrollWidth, stage: box(document.querySelector('.iss-station-stage')),
        console: box(document.querySelector('[data-iss-arm-stage]')), controls: Array.from(document.querySelectorAll('[data-iss-arm-stage] button,[data-iss-arm-stage] select'), box) };
    });
    assert(layout.width <= width + 1); assert(layout.console.top >= layout.stage.bottom - 1, 'Console must not occlude the 3D viewport');
    layout.controls.forEach((control, index) => {
      assert(control.width > 0 && control.left >= -1 && control.right <= width + 1);
      assert(control.left >= layout.console.left - 1 && control.right <= layout.console.right + 1 && control.top >= layout.console.top - 1 && control.bottom <= layout.console.bottom + 1);
      if (phone) assert(control.height >= 43.9, 'Phone controls provide at least 44px targets');
      layout.controls.slice(index + 1).forEach(other => assert(Math.min(control.right, other.right) - Math.max(control.left, other.left) < 1 || Math.min(control.bottom, other.bottom) - Math.max(control.top, other.top) < 1, 'Console controls must not overlap'));
    });
    await page.addScriptTag({ path: path.join(ROOT, 'desktop/web-app/node_modules/axe-core/axe.min.js') });
    const accessibility = await page.evaluate(async () => {
      const checked = await axe.run({ include: ['[data-iss-arm-stage]', '[data-iss-arm-preview-stage]'] }, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
      return { passes: checked.passes.length, violations: checked.violations.map(item => ({ id: item.id, targets: item.nodes.map(node => node.target) })) };
    });
    assert.deepEqual(accessibility.violations, []); result.checks.layout = layout; result.checks.accessibility = accessibility;
    after = await ready();
    for (const action of ['play', 'step', 'brake', 'preview', 'rest', 'frame']) assert(after.events.some(event => event.action === 'data-iss-arm-stage-' + action && event.type === 'click' && event.trusted), `Trusted ${action} interaction exercised`);
    assert(after.events.some(event => event.action === 'data-iss-arm-stage-brake' && event.type === 'keydown' && event.key === ' ' && event.trusted));
    assert(after.events.some(event => event.action === 'data-iss-arm-preview-stage-time' && event.type === 'keydown' && event.key === 'Home' && event.trusted));
    assert(after.events.some(event => event.type === 'pointerdown' && event.trusted && event.pointerType === (phone ? 'touch' : 'mouse')));
    result.errors = errors; result.hostErrors = await page.evaluate(() => window.__events?.errors || []); assert.deepEqual(errors, []); assert.deepEqual(result.hostErrors, []);
    result.passed = true; console.log(`Arm stage controls, physics, geometry, focus and accessibility passed at ${width}px`); return result;
  } catch (error) {
    result.passed = false; result.failure = error.stack || error.message; result.errors = errors;
    result.lastSnapshot = await read().catch(() => null); error.qaResult = result; throw error;
  } finally {
    try {
      result.checks.cleanup = await page.evaluate(() => {
        document.querySelector('.iss-station-stage canvas')?._issSetLighting?.({ playing: false }); window.__destroy?.();
        return { contexts: window.__issArmStageQA?.contexts.length || 0, lost: (window.__issArmStageQA?.contexts || []).map(gl => gl.isContextLost()), canvases: document.querySelectorAll('.iss-station-stage canvas').length };
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
  helpers = new Function(source.slice(source.indexOf('  var ISS_GM ='), source.indexOf('  function issTransferPlan(')) + '\nreturn { driveStep: issMapDriveStep, armStep: issMapArmStep, motion: issMapArmMotion };')();
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
  console.log(`3D arm stage checks passed: ${widths.join(', ')}px. Results: ${output}`);
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
