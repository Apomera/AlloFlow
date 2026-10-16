#!/usr/bin/env node
'use strict';

// Actual WebGL, trusted native controls, and an independent constant-deceleration
// calculation. The existing preview server is used without starting a new one.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const argument = (name, fallback) => {
  const entry = process.argv.slice(2).find(value => value.startsWith(name + '='));
  return entry ? entry.slice(name.length + 1) : fallback;
};
const base = argument('--base', 'http://127.0.0.1:4179').replace(/\/$/, '');
const output = path.resolve(ROOT, argument('--out', 'reports/space-station-enhancement-qa/map-braking-browser'));
const widths = argument('--widths', '1440,390').split(',').map(Number);
assert(widths.length && widths.every(width => Number.isInteger(width) && width >= 320));
const near = (actual, expected, tolerance = 1e-7) => {
  assert(Number.isFinite(actual) && Number.isFinite(expected), `Finite values required: ${actual}, ${expected}`);
  assert(Math.abs(actual - expected) <= tolerance, `${actual} should equal ${expected} within ${tolerance}`);
};
const vectorNear = (actual, expected, tolerance = 1e-6) => {
  assert(Array.isArray(actual) && actual.length === expected.length);
  actual.forEach((value, index) => near(value, expected[index], tolerance));
};
const signed = angle => ((angle + 180) % 360 + 360) % 360 - 180;
const mechanicalKeys = ['phase', 'beta', 'arrayAlpha', 'arrayFeather', 'actualAlphaRate', 'actualFeatherRate', 'driveElapsed'];
function sameMechanical(before, after) {
  mechanicalKeys.forEach(key => near(after.state[key], before.state[key]));
  vectorNear(after.state.wingNormal, before.state.wingNormal);
}
function sameCommands(before, after) {
  near(after.state.commandAlpha, before.state.commandAlpha); near(after.state.commandFeather, before.state.commandFeather);
  assert.equal(after.state.tracking, before.state.tracking);
}
function sameCamera(before, after) {
  ['position', 'target', 'stationQuaternion'].forEach(key => vectorNear(after.camera[key], before.camera[key]));
  ['focusId', 'view', 'guides', 'tweening'].forEach(key => assert.equal(after.camera[key], before.camera[key]));
  near(after.camera.distance, before.camera.distance);
}
function stopAxis(position, velocity, acceleration, seconds = Infinity, feather = false) {
  const time = Math.min(seconds, Math.abs(velocity) / acceleration), direction = Math.sign(velocity);
  const raw = position + velocity * time - direction * acceleration * time * time / 2;
  const contact = feather && (raw > 90 || raw < -90);
  return { angle: feather ? Math.max(-90, Math.min(90, raw)) : signed(raw),
    rate: contact ? 0 : direction * Math.max(0, Math.abs(velocity) - acceleration * time), travel: raw - position };
}
function corner(alpha, feather) {
  const a = alpha * Math.PI / 180, f = feather * Math.PI / 180;
  const x = .45 * Math.cos(f) - .02 * Math.sin(f), y = .45 * Math.sin(f) + .02 * Math.cos(f);
  return [x, y * Math.cos(a) - 3.7 * Math.sin(a), y * Math.sin(a) + 3.7 * Math.cos(a)];
}

function observeRenderer() {
  const Original = THREE.WebGLRenderer;
  window.__issBrakeQA = { draw: null, sequence: 0, contexts: [], events: [] };
  function ObservedRenderer(options) {
    const renderer = new Original(options), render = renderer.render;
    window.__issBrakeQA.contexts.push(renderer.getContext());
    renderer.render = function (scene, camera) {
      const returned = render.apply(this, arguments), cv = renderer.domElement;
      if (scene.name === 'iss-station-inspection' && cv._issBrakingState) {
        const qa = window.__issBrakeQA, ghost = scene.getObjectByName('iss-array-brake');
        const line = scene.getObjectByName('iss-array-brake-path'), tip = scene.getObjectByName('iss-array-brake-tip');
        const buffer = line?.geometry?.attributes?.position;
        const count = buffer ? Math.min(buffer.count, line.geometry.drawRange.count) : 0;
        qa.draw = { sequence: ++qa.sequence, state: cv._issLightingState(), brake: cv._issBrakingState(),
          pivot: scene.getObjectByName('iss-array-wing-2')?.position.toArray(),
          ghost: ghost ? { visible: ghost.visible, position: ghost.position.toArray(), quaternion: ghost.quaternion.toArray() } : null,
          path: line ? { visible: line.visible, points: buffer ? Array.from({ length: count }, (_, i) => [buffer.getX(i), buffer.getY(i), buffer.getZ(i)]) : null } : null,
          tip: tip ? { visible: tip.visible, position: tip.position.toArray() } : null };
      }
      return returned;
    };
    return renderer;
  }
  ObservedRenderer.prototype = Original.prototype; Object.setPrototypeOf(ObservedRenderer, Original);
  THREE.WebGLRenderer = ObservedRenderer;
}

function verify(snapshot) {
  const s = snapshot.state, p = snapshot.brake, d = snapshot.draw;
  assert(d?.ghost && d.path && d.tip, 'The rendered scene contains braking geometry');
  assert.equal(snapshot.glLost, false); assert.equal(p.braking, s.motorBraking);
  assert.equal(p.enabled, s.motorEnabled && s.motorSmooth);
  assert.equal(p.visible, p.enabled && p.moving && p.overlay && !snapshot.forecast.active);
  assert.equal(d.ghost.visible, p.visible); assert.equal(d.path.visible, p.visible); assert.equal(d.tip.visible, p.visible);
  assert.equal(snapshot.overlayPressed, String(p.overlay));
  for (const button of snapshot.buttons) {
    assert.equal(button.pressed, String(p.braking));
    assert(button.label.trim()); assert.equal(button.disabled, !p.enabled);
    if (p.enabled) assert(p.braking ? /resume/i.test(button.label) : /brake/i.test(button.label));
  }
  assert.equal(snapshot.buttons.length, 2);
  if (!p.enabled) return snapshot;
  const alpha = stopAxis(s.arrayAlpha, s.actualAlphaRate, s.motorAcceleration);
  const feather = stopAxis(s.arrayFeather, s.actualFeatherRate, s.motorAcceleration, Infinity, true);
  near(signed(p.alpha - alpha.angle), 0, 1e-7); near(p.feather, feather.angle, 1e-7);
  near(p.alphaTravel, alpha.travel); near(p.featherTravel, p.feather - s.arrayFeather);
  near(p.alphaStopSeconds, Math.abs(s.actualAlphaRate) / s.motorAcceleration);
  if (!p.featherContact) near(p.featherStopSeconds, Math.abs(s.actualFeatherRate) / s.motorAcceleration);
  near(p.seconds, Math.max(p.alphaStopSeconds, p.featherStopSeconds));
  for (const key of ['seconds', 'alpha', 'feather']) near(Number(snapshot.readings[key]?.value), p[key]);
  assert(snapshot.readings.status?.text.trim()); assert(snapshot.stageTime.trim());
  assert(p.points.length >= 3);
  p.points.forEach((point, index) => {
    const time = p.seconds * index / (p.points.length - 1);
    const rotation = stopAxis(s.arrayAlpha, s.actualAlphaRate, s.motorAcceleration, time);
    const featherAt = stopAxis(s.arrayFeather, s.actualFeatherRate, s.motorAcceleration, time, true);
    vectorNear(point, corner(rotation.angle, featherAt.angle), 1e-7);
  });
  if (p.visible) {
    vectorNear(d.ghost.position, d.pivot);
    const a = p.alpha * Math.PI / 360, f = p.feather * Math.PI / 360;
    vectorNear(d.ghost.quaternion, [Math.sin(a) * Math.cos(f), -Math.sin(a) * Math.sin(f), Math.cos(a) * Math.sin(f), Math.cos(a) * Math.cos(f)]);
    vectorNear(d.tip.position, corner(p.alpha, p.feather).map((value, i) => value + d.pivot[i]));
    assert(d.path.points.length >= 2); vectorNear(d.path.points[0], corner(s.arrayAlpha, s.arrayFeather).map((v, i) => v + d.pivot[i]), 2e-5);
    vectorNear(d.path.points.at(-1), d.tip.position, 2e-5);
    assert.equal(d.path.points.length, p.points.length);
    d.path.points.forEach((point, index) => vectorNear(point, p.points[index].map((value, i) => value + d.pivot[i]), 2e-5));
  }
  return snapshot;
}

async function runWidth(browser, width) {
  const phone = width < 500, errors = [], result = { width, touch: phone, checks: {}, screenshots: [] };
  const page = await browser.newPage({ viewport: { width, height: phone ? 844 : 1080 }, deviceScaleFactor: 1,
    isMobile: phone, hasTouch: phone, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000); page.on('pageerror', error => errors.push(error.stack || error.message));
  const canvas = page.locator('.iss-station-stage canvas'), stage = page.locator('.iss-station-stage');
  const panel = page.locator('[data-iss-brake-panel]'), brake = page.locator('[data-iss-drive-brake]');
  const stageBrake = page.locator('[data-iss-stage-brake]'), overlay = page.locator('[data-iss-brake-overlay]');
  const activate = locator => phone ? locator.tap() : locator.click();
  const read = () => canvas.evaluate(cv => {
    const gl = cv.getContext('webgl2') || cv.getContext('webgl');
    return { state: cv._issLightingState(), brake: cv._issBrakingState(), forecast: cv._issForecastState(), camera: cv._issCameraState(),
      draw: window.__issBrakeQA.draw, glLost: gl ? gl.isContextLost() : null,
      overlayPressed: document.querySelector('[data-iss-brake-overlay]')?.getAttribute('aria-pressed'),
      readings: Object.fromEntries(Array.from(document.querySelectorAll('[data-iss-brake-reading]'), node => [node.dataset.issBrakeReading, {
        value: node.getAttribute('data-value'), text: node.textContent.trim() }])),
      stageTime: document.querySelector('[data-iss-stage-brake-time]')?.textContent || '',
      buttons: Array.from(document.querySelectorAll('[data-iss-drive-brake],[data-iss-stage-brake]'), node => ({
        pressed: node.getAttribute('aria-pressed'), disabled: node.disabled, label: node.getAttribute('aria-label') || node.textContent })),
      events: window.__issBrakeQA.events.slice(-100) };
  });
  const ready = async () => {
    await page.evaluate(() => new Promise(resolve => window.__issBrakeNativeRAF(() => window.__issBrakeNativeRAF(resolve))));
    await page.waitForFunction(() => {
      const cv = document.querySelector('.iss-station-stage canvas'), d = window.__issBrakeQA?.draw;
      if (!cv?._issBrakingState || !d || cv._issCameraState().tweening) return false;
      const p = cv._issBrakingState(), s = cv._issLightingState();
      return ['enabled', 'visible', 'braking', 'overlay'].every(key => d.brake[key] === p[key]) &&
        ['phase', 'arrayAlpha', 'arrayFeather', 'actualAlphaRate', 'actualFeatherRate'].every(key => Math.abs(d.state[key] - s[key]) < 1e-8);
    }, undefined, { polling: 100 });
    return verify(await read());
  };
  const select = async (selector, index) => {
    const node = page.locator(selector); await node.focus(); await page.keyboard.press('Home');
    for (let i = 0; i < index; i++) await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter'); return ready();
  };
  const step = async seconds => { await canvas.evaluate((cv, value) => cv._issStepLighting(value), seconds); return ready(); };
  const capture = async label => {
    await page.evaluate(() => document.activeElement?.blur()); const before = await ready(); assert(!before.state.playing && !before.forecast.playing);
    for (const [locator, suffix] of [[stage, 'stage'], [panel, 'panel']]) {
      await locator.evaluate(node => node.scrollIntoView({ block: 'center', behavior: 'instant' }));
      let last = null, stable = 0;
      for (let i = 0; i < 12; i++) {
        const box = await locator.evaluate(node => { const b = node.getBoundingClientRect(); return { x: b.x + scrollX, y: b.y + scrollY, width: b.width, height: b.height }; });
        stable = last && Object.keys(box).every(k => Math.abs(box[k] - last[k]) < .25) ? stable + 1 : 0; last = box;
        if (stable >= 2) break; await page.waitForTimeout(150);
      }
      assert(stable >= 2 && last.width > 0 && last.height > 0);
      const filename = `map-braking-${label}-${suffix}-${width}.png`, session = await page.context().newCDPSession(page);
      try {
        const shot = await session.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: true, clip: { ...last, scale: 1 } });
        await fs.writeFile(path.join(output, filename), Buffer.from(shot.data, 'base64')); result.screenshots.push(filename);
      } finally { await session.detach(); }
    }
    const after = await ready(); sameMechanical(before, after); sameCamera(before, after); sameCommands(before, after);
  };
  try {
    console.log(`Checking braking prediction and controls at ${width}px`);
    await page.addInitScript(() => {
      window.AlloPostFXEnabled = false; window.__issBrakeClock = 0;
      window.__issBrakeNativeRAF = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = callback => window.__issBrakeNativeRAF(() => callback(window.__issBrakeClock));
    });
    await page.route('**/vendor/three-r128/three.min.js', async route => {
      const response = await route.fetch(); assert(response.ok());
      await route.fulfill({ response, body: (await response.text()) + '\n;(' + observeRenderer.toString() + ')();\n' });
    });
    await page.goto(`${base}/?tab=map`, { waitUntil: 'load' }); await panel.waitFor({ state: 'attached' });
    let after = await ready(); assert(!after.brake.enabled && !after.brake.braking && after.brake.overlay);
    await page.evaluate(() => ['click', 'change', 'keydown'].forEach(type => document.addEventListener(type, event => {
      const node = event.target.closest('[data-iss-drive-brake],[data-iss-stage-brake],[data-iss-brake-overlay],[data-iss-drive-step],[data-iss-drive-rate],[data-iss-drive-acceleration]');
      if (node) window.__issBrakeQA.events.push({ type, key: event.key, trusted: event.isTrusted,
        action: node.hasAttribute('data-iss-stage-brake') ? 'stage-brake' : node.hasAttribute('data-iss-drive-brake') ? 'panel-brake' :
          node.hasAttribute('data-iss-brake-overlay') ? 'overlay' : node.hasAttribute('data-iss-drive-step') ? 'step' : 'select' });
    }, true)));
    await activate(page.locator('[data-iss-drive-toggle]')); await ready();
    await activate(page.locator('[data-iss-drive-smooth]')); await ready();
    await select('[data-iss-drive-acceleration]', 0); await select('[data-iss-drive-rate]', 2);
    await page.locator('[data-iss-array-alpha]').focus(); await page.keyboard.press('End');
    for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowLeft');
    await page.locator('[data-iss-array-feather]').focus(); await page.keyboard.press('End');
    after = await ready(); near(after.state.commandAlpha, 170); near(after.state.commandFeather, 90);
    for (let i = 0; i < 4; i++) { await activate(page.locator('[data-iss-drive-step]')); after = await ready(); }
    near(after.state.actualAlphaRate, .12, 1e-7); near(after.state.actualFeatherRate, .12, 1e-7);
    near(after.brake.seconds, 240, 1e-5); near(after.brake.alphaTravel, 14.4, 1e-6); assert(after.brake.visible);
    result.checks.nativeMovingSetup = { rate: after.state.actualAlphaRate, stoppingSeconds: after.brake.seconds, stoppingDegrees: after.brake.alphaTravel };
    await capture('moving');

    const beforeOverlay = after; await activate(overlay); after = await ready(); assert(!after.brake.visible && !after.brake.overlay);
    sameMechanical(beforeOverlay, after); sameCamera(beforeOverlay, after); sameCommands(beforeOverlay, after);
    await activate(overlay); after = await ready(); assert(after.brake.visible); sameMechanical(beforeOverlay, after);
    result.checks.overlayIsVisualOnly = true;
    const beforeLowering = after; after = await select('[data-iss-drive-rate]', 0);
    sameMechanical(beforeLowering, after); sameCommands(beforeLowering, after); near(after.state.motorRate, .02);
    assert(after.state.actualAlphaRate > after.state.motorRate); near(after.brake.alphaTravel, beforeLowering.brake.alphaTravel);
    result.checks.loweredLimitKeepsStoredVelocity = true;

    await activate(page.locator('[data-iss-stage-play]')); const beforeBrake = await ready(); assert(beforeBrake.state.playing);
    await activate(stageBrake); after = await ready(); assert(after.state.playing && after.brake.braking);
    sameMechanical(beforeBrake, after); sameCommands(beforeBrake, after); sameCamera(beforeBrake, after);
    await activate(page.locator('[data-iss-stage-play]')); after = await ready(); assert(!after.state.playing && after.brake.braking);
    const stopPrediction = after.brake, brakingOrigin = after;
    after = await step(12.3);
    for (const axis of ['Alpha', 'Feather']) {
      const expected = stopAxis(brakingOrigin.state['array' + axis], brakingOrigin.state['actual' + axis + 'Rate'], brakingOrigin.state.motorAcceleration, 12.3, axis === 'Feather');
      near(after.state['array' + axis], expected.angle, 1e-7); near(after.state['actual' + axis + 'Rate'], expected.rate, 1e-8);
    }
    assert(after.brake.braking); result.checks.brakeContinuityAndAnalyticStep = true;
    await capture('braking');

    const beforePreview = after; await activate(page.locator('[data-iss-forecast-toggle]')); after = await ready();
    assert(after.forecast.active && !after.brake.visible); sameMechanical(beforePreview, after);
    await activate(page.locator('[data-iss-forecast-close]')); after = await ready(); assert(!after.forecast.active && after.brake.visible);
    sameMechanical(beforePreview, after);
    await activate(page.locator('[data-iss-forecast-toggle]')); await ready();
    await canvas.evaluate(cv => cv._issSeekForecastTime(73.25)); after = await ready();
    const selected = after.forecast.selected;
    for (const [axis, name] of [['Alpha', 'alpha'], ['Feather', 'feather']]) {
      const expected = stopAxis(beforePreview.state['array' + axis], beforePreview.state['actual' + axis + 'Rate'], beforePreview.state.motorAcceleration, 73.25, axis === 'Feather');
      near(selected[name], expected.angle, 1e-7); near(selected[name + 'Rate'], expected.rate, 1e-8);
    }
    const overlayBeforePreview = after; await activate(overlay); after = await ready();
    assert.deepEqual(after.forecast, overlayBeforePreview.forecast); sameMechanical(overlayBeforePreview, after);
    await activate(overlay); await ready();
    await activate(page.locator('[data-iss-forecast-apply]')); after = await ready();
    assert(!after.forecast.active && after.brake.braking && after.brake.visible);
    for (const [live, future] of [['arrayAlpha', 'alpha'], ['arrayFeather', 'feather'], ['actualAlphaRate', 'alphaRate'], ['actualFeatherRate', 'featherRate'], ['phase', 'phase']]) near(after.state[live], selected[future], 1e-8);
    near(after.state.driveElapsed, beforePreview.state.driveElapsed + 73.25); sameCommands(beforePreview, after);
    result.checks.forecast = { hidesAndRestoresAmber: true, carriesBraking: true, exactApplySeconds: 73.25, overlayPreservesPreview: true };

    after = await step(after.brake.seconds);
    near(signed(after.state.arrayAlpha - stopPrediction.alpha), 0, 1e-7); near(after.state.arrayFeather, stopPrediction.feather, 1e-7);
    near(after.state.actualAlphaRate, 0, 1e-10); near(after.state.actualFeatherRate, 0, 1e-10);
    assert(after.brake.braking && !after.brake.moving && !after.brake.visible);
    const atRest = after; after = await step(20);
    near(after.state.arrayAlpha, atRest.state.arrayAlpha); near(after.state.arrayFeather, atRest.state.arrayFeather);
    assert(after.state.phase > atRest.state.phase && after.brake.braking); sameCommands(atRest, after);
    near(after.state.actualAlphaRate, 0); near(after.state.actualFeatherRate, 0);
    result.checks.exactStopAndLatchedOrbit = true;

    const beforeResume = after; await brake.focus(); await page.keyboard.press('Enter'); after = await ready();
    assert(!after.brake.braking); sameMechanical(beforeResume, after); sameCommands(beforeResume, after); sameCamera(beforeResume, after);
    after = await step(10); assert(after.state.actualAlphaRate > 0 && after.state.actualFeatherRate > 0 && after.brake.visible);
    near(after.state.actualAlphaRate, .005, 1e-8); near(after.state.actualFeatherRate, .005, 1e-8);
    const beforeMovingResume = after; await activate(brake); after = await ready(); assert(after.brake.braking); sameMechanical(beforeMovingResume, after);
    await activate(brake); after = await ready(); assert(!after.brake.braking); sameMechanical(beforeMovingResume, after);
    result.checks.resumePreservesVelocityAndTargets = true;

    await activate(brake); after = await ready(); assert(after.brake.braking);
    for (const patch of [{ phase: 95 }, { beta: 30 }, { motorRate: .08 }, { motorAcceleration: .002 }]) {
      const before = after; await canvas.evaluate((cv, input) => cv._issSetLighting(input), patch); after = await ready();
      assert(after.brake.braking); near(after.state.actualAlphaRate, before.state.actualAlphaRate); near(after.state.actualFeatherRate, before.state.actualFeatherRate); sameCommands(before, after);
    }
    const beforeTarget = after; await page.locator('[data-iss-array-alpha]').focus(); await page.keyboard.press('ArrowLeft'); after = await ready();
    assert(!after.brake.braking); sameMechanical(beforeTarget, after);
    await activate(brake); await ready(); await activate(page.locator('[data-iss-array-tracking]')); after = await ready(); assert(!after.brake.braking);
    await activate(brake); await ready(); await activate(page.locator('[data-iss-drive-smooth]')); after = await ready(); assert(!after.brake.braking && !after.brake.enabled);
    await activate(page.locator('[data-iss-drive-smooth]')); await ready(); await activate(brake); await ready();
    await activate(page.locator('[data-iss-drive-toggle]')); after = await ready(); assert(!after.brake.braking && !after.brake.enabled);
    result.checks.latchLifecycle = { retainedByEnvironmentAndLimits: true, clearedByTargetTrackingAndMode: true };

    // Restore a legible moving preview for the final layout and accessibility checks.
    await activate(page.locator('[data-iss-drive-toggle]')); await ready();
    if (!(await read()).state.motorSmooth) { await activate(page.locator('[data-iss-drive-smooth]')); await ready(); }
    await canvas.evaluate(cv => cv._issSetLighting({ motorRate: .2, motorAcceleration: .0005, arrayAlpha: -100, arrayFeather: -80 }));
    after = await step(120); assert(after.brake.visible); await capture('resumed');
    const layout = await page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth,
      stageHelp: (() => { const b = document.querySelector('.iss-stage-help').getBoundingClientRect(); return { top: b.top, bottom: b.bottom }; })(),
      stageTransport: (() => { const b = document.querySelector('[data-iss-stage-transport]').getBoundingClientRect(); return { top: b.top, bottom: b.bottom }; })(),
      controls: Array.from(document.querySelectorAll('[data-iss-drive-brake],[data-iss-stage-brake],[data-iss-brake-overlay],[data-iss-brake-panel]'), node => {
        const b = node.getBoundingClientRect(); return { left: b.left, right: b.right, width: b.width, height: b.height, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth };
      }) }));
    assert(layout.width <= width + 1);
    assert(layout.stageHelp.bottom <= layout.stageTransport.top, 'Camera hint stays above the braking controls');
    for (const item of layout.controls.filter(item => item.width > 0)) {
      assert(item.left >= -1 && item.right <= width + 1); assert(item.scrollWidth <= item.clientWidth + 1);
    }
    await page.addScriptTag({ path: path.join(ROOT, 'desktop/web-app/node_modules/axe-core/axe.min.js') });
    const accessibility = await page.evaluate(async () => {
      const checked = await axe.run({ include: ['[data-iss-brake-panel]', '[data-iss-stage-brake]'] }, {
        rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
      return { passes: checked.passes.length, violations: checked.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })) };
    });
    assert.deepEqual(accessibility.violations, []); result.checks.layout = layout; result.checks.accessibility = accessibility;
    after = await ready();
    for (const action of ['stage-brake', 'panel-brake', 'overlay', 'step', 'select']) assert(after.events.some(e => e.action === action && e.trusted), `Trusted ${action} control was exercised`);
    assert(after.events.some(e => e.action === 'panel-brake' && e.type === 'keydown' && e.key === 'Enter' && e.trusted));
    result.errors = errors; result.hostErrors = await page.evaluate(() => window.__events?.errors || []);
    assert.deepEqual(errors, []); assert.deepEqual(result.hostErrors, []); result.passed = true;
    console.log(`Braking geometry, analytic motion, latch, native controls and forecast passed at ${width}px`);
    return result;
  } catch (error) {
    result.passed = false; result.failure = error.stack || error.message; result.errors = errors;
    result.lastSnapshot = await read().catch(() => null); error.qaResult = result; throw error;
  } finally {
    try {
      result.checks.cleanup = await page.evaluate(() => {
        document.querySelector('.iss-station-stage canvas')?._issSetLighting?.({ playing: false }); window.__destroy?.();
        return { contexts: window.__issBrakeQA?.contexts.length || 0, lost: (window.__issBrakeQA?.contexts || []).map(gl => gl.isContextLost()),
          canvases: document.querySelectorAll('.iss-station-stage canvas').length };
      });
      if (result.passed) { assert(result.checks.cleanup.contexts > 0); assert(result.checks.cleanup.lost.every(Boolean)); assert.equal(result.checks.cleanup.canvases, 0); assert.deepEqual(errors, []); }
    } catch (error) {
      if (result.passed) { result.passed = false; result.failure = error.stack || error.message; error.qaResult = result; throw error; }
      result.cleanupFailure = error.stack || error.message;
    } finally { await page.close(); }
  }
}

async function main() {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true,
    args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const results = []; let failure;
  try {
    for (const width of widths) {
      try { results.push(await runWidth(browser, width)); }
      catch (error) { results.push(error.qaResult || { width, passed: false, failure: error.stack || error.message }); failure = error; break; }
      finally {
        const temporary = path.join(output, 'results.json.tmp');
        await fs.writeFile(temporary, JSON.stringify({ base, results }, null, 2) + '\n'); await fs.rename(temporary, path.join(output, 'results.json'));
      }
    }
  } finally { await browser.close(); }
  if (failure) throw failure;
  console.log(`3D braking checks passed: ${widths.join(', ')}px. Results: ${output}`);
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
