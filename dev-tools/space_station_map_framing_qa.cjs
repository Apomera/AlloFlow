#!/usr/bin/env node
'use strict';

// Real WebGL and trusted controls against the existing preview. Normal-motion
// camera tweens and live playback use native RAF with a deliberately held clock.
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
const output = path.resolve(ROOT, argument('--out', 'reports/space-station-enhancement-qa/map-framing-browser'));
const widths = argument('--widths', '1440,390').split(',').map(Number);
assert(widths.length && widths.every(width => Number.isInteger(width) && width >= 320));
const rates = [.1, 1, 10, 60, 180];
const near = (actual, expected, tolerance = 1e-7) => {
  assert(Number.isFinite(actual) && Number.isFinite(expected), `Finite values required: ${actual}, ${expected}`);
  assert(Math.abs(actual - expected) <= tolerance, `${actual} should equal ${expected} within ${tolerance}`);
};
const vectorNear = (actual, expected, tolerance = 1e-6) => {
  assert(Array.isArray(actual) && Array.isArray(expected) && actual.length === expected.length);
  actual.forEach((value, index) => near(value, expected[index], tolerance));
};
const displacement = (a, b) => Math.hypot(...a.map((value, index) => value - b[index]));
const quaternion = (alpha, feather) => {
  const a = alpha * Math.PI / 360, f = feather * Math.PI / 360;
  return [Math.sin(a) * Math.cos(f), -Math.sin(a) * Math.sin(f), Math.cos(a) * Math.sin(f), Math.cos(a) * Math.cos(f)];
};
function samePhysics(before, after) {
  for (const key of ['phase', 'beta', 'arrayAlpha', 'arrayFeather', 'actualAlphaRate', 'actualFeatherRate', 'driveElapsed', 'commandAlpha', 'commandFeather', 'motorRate', 'motorAcceleration', 'incidence', 'generation']) near(after.state[key], before.state[key]);
  for (const key of ['tracking', 'playing', 'motorEnabled', 'motorSmooth', 'motorBraking', 'eclipse']) assert.equal(after.state[key], before.state[key]);
  vectorNear(after.state.sun, before.state.sun); vectorNear(after.state.wingNormal, before.state.wingNormal);
  vectorNear(after.camera.stationQuaternion, before.camera.stationQuaternion);
}
function sameCamera(before, after) {
  for (const key of ['position', 'target', 'stationQuaternion']) vectorNear(after.camera[key], before.camera[key]);
  for (const key of ['fit', 'focusId', 'view', 'guides', 'tweening']) assert.equal(after.camera[key], before.camera[key]);
  near(after.camera.distance, before.camera.distance);
}
function samePreview(before, after) { assert.deepEqual(after.forecast, before.forecast); }
function contained(bounds, label) {
  assert(bounds?.count > 0, `${label} has rendered geometry`);
  for (const axis of ['x', 'y', 'z']) {
    assert(bounds.min[axis] >= -1 - 1e-6 && bounds.max[axis] <= 1 + 1e-6,
      `${label} ${axis} projection is inside the frustum: ${bounds.min[axis]} to ${bounds.max[axis]}`);
  }
}

function observeRenderer() {
  const Original = THREE.WebGLRenderer;
  window.__issFramingQA = { draw: null, sequence: 0, contexts: [], events: [] };
  function ObservedRenderer(options) {
    const renderer = new Original(options), render = renderer.render;
    window.__issFramingQA.contexts.push(renderer.getContext());
    renderer.render = function (scene, camera) {
      const returned = render.apply(this, arguments), cv = renderer.domElement;
      if (scene.name !== 'iss-station-inspection' || !cv._issCameraState || !cv._issLightingState) return returned;
      const station = scene.getObjectByName('iss-inspected-station'), wing = scene.getObjectByName('iss-array-wing-2');
      const marker = scene.getObjectByName('iss-array-focus');
      if (!station || !wing || !marker) return returned;
      function projectedGeometry(roots, verticesOnly = false) {
        const bounds = { count: 0, min: { x: Infinity, y: Infinity, z: Infinity }, max: { x: -Infinity, y: -Infinity, z: -Infinity } };
        function add(vector, object) {
          vector.applyMatrix4(object.matrixWorld).project(camera); bounds.count++;
          for (const axis of ['x', 'y', 'z']) { bounds.min[axis] = Math.min(bounds.min[axis], vector[axis]); bounds.max[axis] = Math.max(bounds.max[axis], vector[axis]); }
        }
        roots.forEach(root => root.traverse(object => {
          if (!object.geometry?.attributes?.position) return;
          if (verticesOnly) {
            const attribute = object.geometry.attributes.position;
            for (let index = 0; index < attribute.count; index++) add(new THREE.Vector3().fromBufferAttribute(attribute, index), object);
          } else {
            if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
            const box = object.geometry.boundingBox;
            for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) add(new THREE.Vector3(x, y, z), object);
          }
        }));
        return bounds;
      }
      // The actual hardware precedes the first inspection overlay in the scene.
      // Project its mesh bounds, excluding future paths and annotation geometry.
      const hardware = station.children.slice(0, station.children.indexOf(marker));
      const corners = [];
      for (const x of [-.45, .45]) for (const y of [-.013, .013]) for (const z of [-3.7, -.3, .3, 3.7]) {
        const world = wing.localToWorld(new THREE.Vector3(x, y, z));
        corners.push({ world: world.toArray(), ndc: world.clone().project(camera).toArray() });
      }
      window.__issFramingQA.draw = {
        sequence: ++window.__issFramingQA.sequence, state: cv._issLightingState(), camera: cv._issCameraState(),
        position: camera.position.toArray(), aspect: camera.aspect, fov: camera.fov,
        canvas: { width: cv.clientWidth, height: cv.clientHeight }, hardware: projectedGeometry(hardware),
        array: projectedGeometry([wing]), corners,
        wing: { position: wing.position.toArray(), quaternion: wing.quaternion.toArray() },
        marker: { visible: marker.visible, position: marker.position.toArray(), quaternion: marker.quaternion.toArray(), bounds: projectedGeometry([marker], true) },
      };
      return returned;
    };
    return renderer;
  }
  ObservedRenderer.prototype = Original.prototype; Object.setPrototypeOf(ObservedRenderer, Original);
  THREE.WebGLRenderer = ObservedRenderer;
}

function verify(snapshot, allowTween = false) {
  const c = snapshot.camera, d = snapshot.draw, s = snapshot.state;
  assert(d?.marker && d?.wing, 'An actual station draw contains the inspected array and its actual-pose marker');
  assert.equal(snapshot.glLost, false); assert(c.renderCount > 0);
  assert(c.position.every(Number.isFinite) && c.target.every(Number.isFinite));
  assert.equal(c.activePointers, 0); assert(c.position[1] >= -3.8 - 1e-6);
  near(c.distance, Math.hypot(...c.position.map((value, index) => value - c.target[index])));
  vectorNear(d.position, c.position); vectorNear(c.stationQuaternion, [0, 0, 0, 1]);
  near(c.projectedTarget[0], 0); near(c.projectedTarget[1], 0);
  if (!allowTween) assert.equal(c.tweening, false);
  for (const button of snapshot.fitButtons) assert.equal(button.pressed, String(button.kind === c.fit));
  assert.equal(snapshot.fitNote.hidden, !c.fit);
  if (c.fit) assert(snapshot.fitNote.text.trim());
  for (const control of snapshot.rateControls) {
    assert.equal(control.value, String(s.rate)); assert.deepEqual(control.options, rates.map(String));
  }
  assert.equal(snapshot.rateControls.length, 2);
  assert.equal(snapshot.playControls.length, 4);
  snapshot.playControls.forEach(button => { assert.equal(button.pressed, String(s.playing)); assert(button.label.trim()); });
  vectorNear(d.wing.quaternion, quaternion(s.arrayAlpha, s.arrayFeather));
  vectorNear(d.marker.quaternion, d.wing.quaternion); vectorNear(d.marker.position, d.wing.position);
  assert.equal(d.marker.visible, c.focusId === 'arrays');
  if (!c.tweening && c.fit) {
    vectorNear(c.target, c.fitCenter); near(c.distance, c.fitDistance, 1e-6);
    const half = Math.min(d.fov * Math.PI / 360, Math.atan(Math.tan(d.fov * Math.PI / 360) * Math.max(.4, Math.min(4, d.aspect))));
    near(c.distance, Math.max(c.minDistance, Math.min(c.maxDistance, c.fitRadius * 1.16 / Math.sin(half))), 1e-6);
    if (c.fit === 'station') contained(d.hardware, 'Complete station hardware');
    else {
      contained(d.array, 'Actual inspected array'); contained(d.marker.bounds, 'Actual array brackets');
      d.corners.forEach(corner => corner.ndc.forEach(value => assert(value >= -1 - 1e-6 && value <= 1 + 1e-6, 'Actual array corners stay in the frame')));
    }
  }
  return snapshot;
}

async function runWidth(browser, width) {
  const phone = width < 500, errors = [], height = phone ? 844 : 1080;
  const result = { width, touch: phone, reducedMotion: false, checks: {}, screenshots: [] };
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone, reducedMotion: 'no-preference' });
  page.setDefaultTimeout(30000); page.on('pageerror', error => errors.push(error.stack || error.message));
  const canvas = page.locator('.iss-station-stage canvas'), stage = page.locator('.iss-station-stage');
  const clock = page.locator('[data-iss-motion-clock]');
  const activate = locator => phone ? locator.tap() : locator.click();
  const read = () => canvas.evaluate(cv => {
    const gl = cv.getContext('webgl2') || cv.getContext('webgl');
    const note = document.querySelector('[data-iss-camera-fit-note]');
    return { state: cv._issLightingState(), brake: cv._issBrakingState(), forecast: cv._issForecastState(), camera: cv._issCameraState(), draw: window.__issFramingQA.draw,
      glLost: gl ? gl.isContextLost() : null, fitNote: { hidden: note.hidden, text: note.textContent },
      fitButtons: Array.from(document.querySelectorAll('[data-iss-camera-fit]'), node => ({ kind: node.dataset.issCameraFit, pressed: node.getAttribute('aria-pressed') })),
      rateControls: Array.from(document.querySelectorAll('[data-iss-live-rate],[data-iss-lighting-rate]'), node => ({ value: node.value, options: Array.from(node.options, option => option.value) })),
      playControls: Array.from(document.querySelectorAll('[data-iss-live-play],[data-iss-lighting-play],[data-iss-drive-play],[data-iss-stage-play]'), node => ({ pressed: node.getAttribute('aria-pressed'), label: node.textContent })),
      events: window.__issFramingQA.events.slice(-200) };
  });
  const ready = async (allowTween = false) => {
    // Both frames receive the same controlled timestamp. Waiting for paint is
    // never permission to advance either physical or camera simulation time.
    await page.evaluate(() => new Promise(resolve => window.__issFramingNativeRAF(() => window.__issFramingNativeRAF(resolve))));
    await page.waitForFunction(() => {
      const cv = document.querySelector('.iss-station-stage canvas'), d = window.__issFramingQA?.draw;
      if (!cv?._issCameraState || !cv?._issLightingState || !d) return false;
      const c = cv._issCameraState(), s = cv._issLightingState();
      return c.position.every((value, index) => Math.abs(value - d.position[index]) < 1e-8) &&
        c.target.every((value, index) => Math.abs(value - d.camera.target[index]) < 1e-8) &&
        d.canvas.width === cv.clientWidth && d.canvas.height === cv.clientHeight &&
        ['phase', 'arrayAlpha', 'arrayFeather', 'actualAlphaRate', 'actualFeatherRate'].every(key => Math.abs(d.state[key] - s[key]) < 1e-8);
    }, undefined, { polling: 100 });
    return verify(await read(), allowTween);
  };
  const advance = async milliseconds => {
    assert(milliseconds > 0 && milliseconds <= 250, 'Advance below the live RAF stall clamp');
    await page.evaluate(value => { window.__issFramingClock += value; }, milliseconds); return ready(true);
  };
  const settle = async () => {
    let current = await ready(true);
    for (let index = 0; current.camera.tweening && index < 5; index++) current = await advance(200);
    return verify(current);
  };
  const selectRate = async (rate, selector = '[data-iss-live-rate]') => {
    const index = rates.indexOf(rate); assert(index >= 0);
    await page.locator(selector).focus(); await page.keyboard.press('Home');
    for (let step = 0; step < index; step++) await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter'); const current = await ready(); near(current.state.rate, rate); return current;
  };
  const capture = async label => {
    await page.evaluate(() => document.activeElement?.blur()); const before = await ready();
    assert(!before.state.playing && !before.forecast.playing);
    for (const [locator, suffix] of [[stage, 'stage'], [clock, 'clock']]) {
      await locator.evaluate(node => node.scrollIntoView({ block: 'center', behavior: 'instant' }));
      let last = null, stable = 0;
      for (let index = 0; index < 12; index++) {
        const box = await locator.evaluate(node => { const b = node.getBoundingClientRect(); return { x: b.x + scrollX, y: b.y + scrollY, width: b.width, height: b.height }; });
        stable = last && Object.keys(box).every(key => Math.abs(box[key] - last[key]) < .25) ? stable + 1 : 0; last = box;
        if (stable >= 2) break; await page.waitForTimeout(150);
      }
      assert(stable >= 2 && last.width > 0 && last.height > 0);
      const filename = `map-framing-${label}-${suffix}-${width}.png`, session = await page.context().newCDPSession(page);
      try {
        const shot = await session.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: true, clip: { ...last, scale: 1 } });
        await fs.writeFile(path.join(output, filename), Buffer.from(shot.data, 'base64')); result.screenshots.push(filename);
      } finally { await session.detach(); }
    }
    const after = await ready(); samePhysics(before, after); sameCamera(before, after); samePreview(before, after);
  };
  try {
    console.log(`Checking station framing and shared clock at ${width}px`);
    await page.addInitScript(() => {
      window.AlloPostFXEnabled = false; window.__issFramingClock = 0;
      window.__issFramingNativeRAF = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = callback => window.__issFramingNativeRAF(() => callback(window.__issFramingClock));
    });
    await page.route('**/vendor/three-r128/three.min.js', async route => {
      const response = await route.fetch(); assert(response.ok());
      await route.fulfill({ response, body: (await response.text()) + '\n;(' + observeRenderer.toString() + ')();\n' });
    });
    await page.goto(`${base}/?tab=map`, { waitUntil: 'load' }); await clock.waitFor({ state: 'attached' });
    let after = await ready(); assert(!after.state.playing && !after.camera.fit);
    await page.evaluate(() => ['click', 'change', 'keydown'].forEach(type => document.addEventListener(type, event => {
      const node = event.target.closest?.('[data-iss-camera-fit],[data-iss-camera-zoom],[data-iss-live-play],[data-iss-live-rate],[data-iss-lighting-rate],[data-iss-step-second],.iss-station-stage canvas');
      if (node) window.__issFramingQA.events.push({ type, key: event.key, trusted: event.isTrusted,
        action: node.hasAttribute('data-iss-camera-fit') ? 'fit-' + node.dataset.issCameraFit : node.hasAttribute('data-iss-camera-zoom') ? 'zoom' :
          node.hasAttribute('data-iss-live-play') ? 'play' : node.hasAttribute('data-iss-step-second') ? 'step' : node.tagName === 'CANVAS' ? 'orbit' : 'rate' });
    }, true)));

    // Establish nonzero velocity and a distinct actual/command pose so that
    // camera actions cannot accidentally reset a meaningful physical state.
    await canvas.evaluate(cv => {
      cv._issSetLighting({ motorEnabled: true, motorSmooth: true, motorRate: .2, motorAcceleration: .002, phase: 35, tracking: false, arrayAlpha: 135, arrayFeather: 60 });
      cv._issStepLighting(12);
      cv._issSetLighting({ motorBraking: true });
    });
    after = await ready(); assert(Math.abs(after.state.actualAlphaRate) > 0 && after.state.motorBraking);
    assert(displacement(quaternion(after.state.arrayAlpha, after.state.arrayFeather), quaternion(after.state.commandAlpha, after.state.commandFeather)) > .01);
    await activate(page.locator('[data-iss-forecast-toggle]')); await ready();
    await canvas.evaluate(cv => cv._issSeekForecastTime(73.25)); const forecastOrigin = await ready(); assert(forecastOrigin.forecast.active);

    await activate(page.locator('[data-iss-camera-fit="station"]')); after = await ready(true); assert(after.camera.tweening);
    after = await settle(); assert.equal(after.camera.fit, 'station'); samePhysics(forecastOrigin, after); samePreview(forecastOrigin, after);
    result.checks.stationFit = { distance: after.camera.distance, radius: after.camera.fitRadius, projectedHardware: after.draw.hardware };
    await capture('station');
    await activate(page.locator('[data-iss-camera-fit="array"]')); after = await settle();
    assert.equal(after.camera.fit, 'array'); assert.equal(after.camera.focusId, 'arrays');
    samePhysics(forecastOrigin, after); samePreview(forecastOrigin, after);
    assert(displacement(after.draw.marker.quaternion, quaternion(after.state.commandAlpha, after.state.commandFeather)) > .01, 'White brackets identify actual joints, not the requested target');
    assert(displacement(after.draw.marker.quaternion, quaternion(after.forecast.selected.alpha, after.forecast.selected.feather)) > 1e-4, 'White brackets remain on the live pose while future geometry is visible');
    result.checks.arrayMarker = { quaternion: after.draw.marker.quaternion, corners: after.draw.corners, projected: after.draw.array };
    await capture('array-preview');

    const beforeOrbit = after; await canvas.focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowDown'); after = await ready();
    assert.equal(after.camera.fit, 'array'); assert(displacement(after.camera.position, beforeOrbit.camera.position) > .1);
    vectorNear(after.camera.target, beforeOrbit.camera.target); near(after.camera.distance, beforeOrbit.camera.distance);
    samePhysics(beforeOrbit, after); samePreview(beforeOrbit, after); result.checks.orbitRetainsFit = true;

    const beforeResize = after, resizedWidth = phone ? 700 : 390;
    await page.setViewportSize({ width: resizedWidth, height }); after = await settle();
    assert.equal(after.camera.fit, 'array'); assert(Math.abs(after.draw.aspect - beforeResize.draw.aspect) > .01);
    samePhysics(beforeResize, after); samePreview(beforeResize, after);
    result.checks.activeResize = { beforeAspect: beforeResize.draw.aspect, afterAspect: after.draw.aspect, beforeDistance: beforeResize.camera.distance, afterDistance: after.camera.distance };
    await activate(page.locator('[data-iss-camera-zoom="in"]')); after = await ready(); assert.equal(after.camera.fit, null);
    const manuallyZoomed = after; await page.setViewportSize({ width, height }); after = await ready();
    sameCamera(manuallyZoomed, after); samePhysics(manuallyZoomed, after); samePreview(manuallyZoomed, after);
    result.checks.manualZoomOptsOutAndSurvivesResize = true;

    // Interrupt a genuinely intermediate normal-motion fit. Orbit must finish
    // the requested framing before rotating, and the discarded tween must not return.
    await activate(page.locator('[data-iss-camera-fit="station"]')); const tweenStart = await ready(true); assert(tweenStart.camera.tweening);
    const tweenMiddle = await advance(100); assert(tweenMiddle.camera.tweening);
    assert(displacement(tweenMiddle.camera.position, tweenStart.camera.position) > .01);
    await canvas.focus(); await page.keyboard.press('ArrowLeft'); const interruptedOrbit = await ready();
    assert.equal(interruptedOrbit.camera.fit, 'station'); samePhysics(forecastOrigin, interruptedOrbit); samePreview(forecastOrigin, interruptedOrbit);
    for (let index = 0; index < 4; index++) after = await advance(200);
    sameCamera(interruptedOrbit, after);
    await activate(page.locator('[data-iss-camera-fit="array"]')); await ready(true); const beforeZoomInterrupt = await advance(100);
    assert(beforeZoomInterrupt.camera.tweening); const intendedFitDistance = beforeZoomInterrupt.camera.fitDistance;
    await activate(page.locator('[data-iss-camera-zoom="in"]')); const interruptedZoom = await ready();
    assert.equal(interruptedZoom.camera.fit, null); near(interruptedZoom.camera.distance, Math.max(interruptedZoom.camera.minDistance, intendedFitDistance * .88), 1e-6);
    for (let index = 0; index < 4; index++) after = await advance(200);
    sameCamera(interruptedZoom, after); samePhysics(forecastOrigin, after); samePreview(forecastOrigin, after);
    result.checks.normalMotionInterruptions = { intermediateFitMoved: true, orbitCompletesFit: true, zoomUsesCompletedFitDistance: true, noTweenResurrection: true };
    await activate(page.locator('[data-iss-camera-fit="array"]')); after = await settle();

    const beforeRates = after;
    for (const rate of rates) {
      after = await selectRate(rate); samePhysics(beforeRates, after); sameCamera(beforeRates, after); samePreview(beforeRates, after);
    }
    after = await selectRate(1, '[data-iss-lighting-rate]'); samePhysics(beforeRates, after); samePreview(beforeRates, after);
    result.checks.rateOnlyPreservesForecastAndSynchronizesBothSelectors = true;
    await activate(page.locator('[data-iss-forecast-close]')); after = await ready(); assert(!after.forecast.active); samePhysics(beforeRates, after);

    result.checks.nativeRafPlayback = [];
    for (const rate of rates) {
      await selectRate(rate); await activate(page.locator('[data-iss-live-play]')); const before = await ready(); assert(before.state.playing);
      for (let index = 0; index < 4; index++) after = await advance(100);
      const seconds = rate * .4;
      near(after.state.driveElapsed - before.state.driveElapsed, seconds, 1e-6);
      near(after.state.phase, (before.state.phase + seconds * 360 / before.state.periodSeconds) % 360, 1e-7);
      sameCamera(before, after); assert.equal(after.camera.fit, 'array');
      result.checks.nativeRafPlayback.push({ rate, realSeconds: .4, simulatedSeconds: after.state.driveElapsed - before.state.driveElapsed });
      await activate(page.locator(rate === 1 ? '[data-iss-lighting-play]' : rate === 10 ? '[data-iss-stage-play]' : rate === 60 ? '[data-iss-drive-play]' : '[data-iss-live-play]'));
      after = await ready(); assert(!after.state.playing);
    }
    await activate(page.locator('[data-iss-live-play]')); const beforeStep = await ready(); assert(beforeStep.state.playing && beforeStep.state.rate === 180);
    await activate(page.locator('[data-iss-step-second]')); after = await ready(); assert(!after.state.playing);
    near(after.state.driveElapsed - beforeStep.state.driveElapsed, 1, 1e-8);
    near(after.state.phase, (beforeStep.state.phase + 360 / beforeStep.state.periodSeconds) % 360, 1e-8);
    const paused = after; await advance(200); after = await advance(200); samePhysics(paused, after); sameCamera(paused, after);
    result.checks.exactOneSecondPausesAllPlayControls = true;
    // Finish with the actual array, a deliberately distant saved command, and
    // a visible stopping path so the screenshots explain the controls together.
    await canvas.evaluate(cv => {
      cv._issSetLighting({ phase: 35, arrayAlpha: -120, arrayFeather: -65, motorRate: .2, motorAcceleration: .002 });
      cv._issStepLighting(60);
    });
    await ready(); await activate(page.locator('[data-iss-stage-brake]')); after = await ready();
    assert(after.state.motorBraking && after.brake.visible && !after.state.playing && after.camera.fit === 'array');
    assert(displacement(after.draw.marker.quaternion, quaternion(after.state.commandAlpha, after.state.commandFeather)) > .01);
    result.checks.finalMovingBrake = { rate: after.state.actualAlphaRate, stoppingSeconds: after.brake.seconds, savedCommand: [after.state.commandAlpha, after.state.commandFeather], actual: [after.state.arrayAlpha, after.state.arrayFeather] };
    await capture('array-braking');

    const layout = await page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth,
      canvasBottom: document.querySelector('.iss-station-stage canvas').getBoundingClientRect().bottom,
      stageHelp: (() => { const b = document.querySelector('.iss-stage-help').getBoundingClientRect(); return { top: b.top, bottom: b.bottom }; })(),
      stageTransport: (() => { const b = document.querySelector('[data-iss-stage-transport]').getBoundingClientRect(); return { top: b.top, bottom: b.bottom }; })(),
      controls: Array.from(document.querySelectorAll('[data-iss-motion-clock],[data-iss-motion-clock] button,[data-iss-motion-clock] select,[data-iss-camera-fit],[data-iss-camera-fit-note]'), node => {
        const b = node.getBoundingClientRect(); return { left: b.left, right: b.right, width: b.width, height: b.height, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth };
      }) }));
    assert(layout.width <= width + 1); assert(layout.stageHelp.bottom <= layout.stageTransport.top);
    if (phone) {
      assert(layout.stageHelp.top >= layout.canvasBottom, 'Phone help is below the rendered hardware');
      assert(layout.stageTransport.top >= layout.canvasBottom, 'Phone playback controls do not cover the arrays');
    }
    for (const item of layout.controls.filter(item => item.width > 0)) {
      assert(item.left >= -1 && item.right <= width + 1); assert(item.scrollWidth <= item.clientWidth + 1);
    }
    await page.addScriptTag({ path: path.join(ROOT, 'desktop/web-app/node_modules/axe-core/axe.min.js') });
    const accessibility = await page.evaluate(async () => {
      const checked = await axe.run({ include: ['[data-iss-camera-tools]', '[data-iss-motion-clock]'] }, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
      return { passes: checked.passes.length, violations: checked.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })) };
    });
    assert.deepEqual(accessibility.violations, []); result.checks.layout = layout; result.checks.accessibility = accessibility;
    after = await ready();
    for (const action of ['fit-station', 'fit-array', 'zoom', 'play', 'rate', 'step', 'orbit']) assert(after.events.some(event => event.action === action && event.trusted), `Trusted ${action} control was exercised`);
    assert(after.events.some(event => event.action === 'orbit' && event.type === 'keydown' && event.trusted));
    result.errors = errors; result.hostErrors = await page.evaluate(() => window.__events?.errors || []);
    assert.deepEqual(errors, []); assert.deepEqual(result.hostErrors, []); result.passed = true;
    console.log(`Framing, actual array marker, resize, tween interruptions, clock and accessibility passed at ${width}px`);
    return result;
  } catch (error) {
    result.passed = false; result.failure = error.stack || error.message; result.errors = errors;
    result.lastSnapshot = await read().catch(() => null); error.qaResult = result; throw error;
  } finally {
    try {
      result.checks.cleanup = await page.evaluate(() => {
        document.querySelector('.iss-station-stage canvas')?._issSetLighting?.({ playing: false }); window.__destroy?.();
        return { contexts: window.__issFramingQA?.contexts.length || 0, lost: (window.__issFramingQA?.contexts || []).map(gl => gl.isContextLost()), canvases: document.querySelectorAll('.iss-station-stage canvas').length };
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
  const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
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
  console.log(`3D framing and clock checks passed: ${widths.join(', ')}px. Results: ${output}`);
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
