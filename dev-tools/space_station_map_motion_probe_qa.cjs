#!/usr/bin/env node
'use strict';

// Actual WebGL geometry and trusted controls against the existing preview.
// A held RAF timestamp prevents UI waits from changing the physical experiment.
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
const output = path.resolve(ROOT, argument('--out', 'reports/space-station-enhancement-qa/map-motion-probe-browser'));
const widths = argument('--widths', '1440,390').split(',').map(Number);
assert(widths.length && widths.every(width => Number.isInteger(width) && width >= 320));
const near = (actual, expected, tolerance = 1e-7) => {
  assert(Number.isFinite(actual) && Number.isFinite(expected), `Finite values required: ${actual}, ${expected}`);
  assert(Math.abs(actual - expected) <= tolerance, `${actual} should equal ${expected} within ${tolerance}`);
};
const vectorNear = (actual, expected, tolerance = 1e-6) => {
  assert(Array.isArray(actual) && Array.isArray(expected) && actual.length === expected.length);
  actual.forEach((value, index) => near(value, expected[index], tolerance));
};
const norm = v => Math.hypot(...v);
const add = (a, b) => a.map((v, i) => v + b[i]);
const scale = (a, n) => a.map(v => v * n);
const posed = (point, alpha, feather) => {
  const a = alpha * Math.PI / 180, f = feather * Math.PI / 180;
  const x = point[0] * Math.cos(f) - point[1] * Math.sin(f), y = point[0] * Math.sin(f) + point[1] * Math.cos(f);
  return [x, y * Math.cos(a) - point[2] * Math.sin(a), y * Math.sin(a) + point[2] * Math.cos(a)];
};
function differentiated(point, s, rotation = true, feather = true) {
  const dt = .001, av = rotation ? s.actualAlphaRate : 0, fv = feather ? s.actualFeatherRate : 0;
  const before = posed(point, s.arrayAlpha - av * dt, s.arrayFeather - fv * dt);
  const after = posed(point, s.arrayAlpha + av * dt, s.arrayFeather + fv * dt);
  return after.map((value, i) => (value - before[i]) / (2 * dt));
}
function samePhysics(before, after) {
  for (const key of ['phase', 'beta', 'arrayAlpha', 'arrayFeather', 'actualAlphaRate', 'actualFeatherRate', 'driveElapsed', 'commandAlpha', 'commandFeather', 'motorRate', 'motorAcceleration', 'incidence', 'generation']) near(after.state[key], before.state[key]);
  for (const key of ['tracking', 'playing', 'motorEnabled', 'motorSmooth', 'motorBraking', 'eclipse']) assert.equal(after.state[key], before.state[key]);
  vectorNear(after.state.sun, before.state.sun); vectorNear(after.state.wingNormal, before.state.wingNormal);
}
function sameCamera(before, after) {
  for (const key of ['position', 'target', 'stationQuaternion']) vectorNear(after.camera[key], before.camera[key]);
  for (const key of ['fit', 'focusId', 'view', 'guides', 'tweening']) assert.equal(after.camera[key], before.camera[key]);
  near(after.camera.distance, before.camera.distance);
}
function sameInspection(before, after) {
  for (const key of ['enabled', 'components', 'span', 'side', 'requestedScale']) assert.equal(after.probe[key], before.probe[key]);
}

function observeRenderer() {
  const Original = THREE.WebGLRenderer;
  window.__issMotionQA = { draw: null, sequence: 0, contexts: [], events: [] };
  function ObservedRenderer(options) {
    const renderer = new Original(options), render = renderer.render;
    window.__issMotionQA.contexts.push(renderer.getContext());
    renderer.render = function (scene, camera) {
      const returned = render.apply(this, arguments), cv = renderer.domElement;
      if (scene.name !== 'iss-station-inspection' || !cv._issMotionProbeState) return returned;
      const qa = window.__issMotionQA, group = scene.getObjectByName('iss-array-motion-probe');
      const wing = scene.getObjectByName('iss-array-wing-2'), marker = scene.getObjectByName('iss-motion-point');
      if (!group || !marker || !wing) return returned;
      function localWorld(point, object) { return group.worldToLocal(object.localToWorld(point)).toArray(); }
      function line(name) {
        const object = scene.getObjectByName(name), buffer = object?.geometry?.attributes?.position;
        return object && { visible: object.visible, points: buffer ? Array.from({ length: buffer.count }, (_, i) => localWorld(new THREE.Vector3().fromBufferAttribute(buffer, i), object)) : [] };
      }
      const bounds = { count: 0, min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
      group.traverse(object => {
        if (!object.geometry?.attributes?.position) return;
        let shown = true;
        for (let node = object; node && node !== group; node = node.parent) shown = shown && node.visible;
        if (!shown) return;
        const buffer = object.geometry.attributes.position;
        for (let i = 0; i < buffer.count; i++) {
          const p = new THREE.Vector3().fromBufferAttribute(buffer, i).applyMatrix4(object.matrixWorld).project(camera).toArray(); bounds.count++;
          for (let axis = 0; axis < 3; axis++) { bounds.min[axis] = Math.min(bounds.min[axis], p[axis]); bounds.max[axis] = Math.max(bounds.max[axis], p[axis]); }
        }
      });
      const probe = cv._issMotionProbeState();
      qa.draw = { sequence: ++qa.sequence, state: cv._issLightingState(), probe, camera: cv._issCameraState(),
        canvas: { width: cv.clientWidth, height: cv.clientHeight }, group: { visible: group.visible, position: group.position.toArray(), quaternion: group.quaternion.toArray(), bounds },
        wing: { position: wing.position.toArray(), quaternion: wing.quaternion.toArray(), surface: wing.localToWorld(new THREE.Vector3().fromArray(probe.localPoint)).toArray() },
        marker: { visible: marker.visible, position: marker.position.toArray(), world: marker.getWorldPosition(new THREE.Vector3()).toArray() },
        radius: line('iss-motion-radius'), addition: line('iss-motion-addition'),
        arrows: ['rotation', 'feather', 'total'].map(name => {
          const arrow = scene.getObjectByName('iss-motion-' + name);
          return arrow && { name, visible: arrow.visible, position: arrow.position.toArray(), quaternion: arrow.quaternion.toArray(),
            direction: new THREE.Vector3(0, 1, 0).applyQuaternion(arrow.quaternion).toArray(),
            tip: group.worldToLocal(arrow.cone.getWorldPosition(new THREE.Vector3())).toArray(),
            stemEnd: localWorld(new THREE.Vector3(0, 1, 0), arrow.line) };
        }) };
      return returned;
    };
    return renderer;
  }
  ObservedRenderer.prototype = Original.prototype; Object.setPrototypeOf(ObservedRenderer, Original);
  THREE.WebGLRenderer = ObservedRenderer;
}

function verify(snapshot) {
  const s = snapshot.state, p = snapshot.probe, d = snapshot.draw;
  assert(d?.group && d.marker && d.arrows.every(Boolean), 'Actual WebGL contains the motion probe and all three vectors');
  assert.equal(snapshot.glLost, false); assert.equal(p.available, s.motorEnabled && s.motorSmooth);
  assert.equal(p.visible, p.enabled && p.available); assert.equal(d.group.visible, p.visible);
  assert.equal(p.playing, s.playing); assert.equal(p.braking, s.motorBraking);
  assert.equal(snapshot.togglePressed, String(p.enabled)); assert.equal(snapshot.componentsPressed, String(p.components));
  assert.equal(snapshot.contentHidden, !p.enabled); near(snapshot.spanValue, p.span * 100); near(snapshot.sideValue, p.side); near(snapshot.scaleValue, p.requestedScale);
  const local = [.45, .02, p.side * (.3 + 3.4 * p.span)]; vectorNear(p.localPoint, local);
  const position = posed(local, s.arrayAlpha, s.arrayFeather); vectorNear(p.position, position);
  vectorNear(d.group.position, d.wing.position); vectorNear(d.group.quaternion, [0, 0, 0, 1]);
  if (!p.available) {
    for (const key of ['speed', 'rotation', 'feather', 'radius', 'scale']) {
      assert.equal(snapshot.readings[key].value, null, 'Unavailable motion has no numeric reading');
      assert(/—|–/.test(snapshot.readings[key].text), 'Unavailable motion is not displayed as zero');
    }
    assert(/smooth/i.test(snapshot.readings.status.text)); return snapshot;
  }
  const rotation = differentiated(local, s, true, false), feather = differentiated(local, s, false, true), velocity = differentiated(local, s);
  vectorNear(p.rotationVelocity, rotation, 2e-8); vectorNear(p.featherVelocity, feather, 2e-8); vectorNear(p.velocity, velocity, 2e-8);
  vectorNear(p.velocity, add(p.rotationVelocity, p.featherVelocity), 1e-10);
  near(p.speed, norm(p.velocity)); near(p.rotationSpeed, norm(p.rotationVelocity)); near(p.featherSpeed, norm(p.featherVelocity));
  near(p.radius, norm(local));
  const largest = Math.max(p.speed, p.rotationSpeed, p.featherSpeed), magnification = largest > 0 ? Math.min(p.requestedScale, 2.4 / largest) : p.requestedScale;
  near(p.displayScale, magnification); assert.equal(p.limited, p.displayScale < p.requestedScale);
  for (const [key, value] of [['speed', p.speed], ['rotation', p.rotationSpeed], ['feather', p.featherSpeed], ['radius', p.radius], ['scale', p.displayScale]]) near(Number(snapshot.readings[key].value), value);
  if (p.visible) {
    assert(d.marker.visible); vectorNear(d.marker.position, p.position); vectorNear(d.marker.world, d.wing.surface);
    for (const arrow of d.arrows) {
      const value = arrow.name === 'total' ? p.velocity : p[arrow.name + 'Velocity'];
      const endpoint = arrow.name === 'total' ? p.velocityEnd : p[arrow.name + 'End'];
      vectorNear(endpoint, add(p.position, scale(value, p.displayScale)));
      const shown = norm(value) * p.displayScale > 1e-7 && (arrow.name === 'total' || p.components);
      assert.equal(arrow.visible, shown, `${arrow.name} vector visibility matches the measured velocity`);
      if (shown) {
        vectorNear(arrow.position, p.position); vectorNear(arrow.direction, scale(value, 1 / norm(value)));
        vectorNear(arrow.tip, endpoint, 1e-6); assert(norm(endpoint.map((v, i) => v - p.position[i])) <= 2.4 + 1e-7);
      }
    }
    assert(d.radius?.visible && d.radius.points.length === 2);
    vectorNear(d.radius.points[0], [0, 0, 0]); vectorNear(d.radius.points[1], p.position);
    if (d.addition.visible) {
      assert(p.components); assert.equal(d.addition.points.length, 4);
      [p.rotationEnd, p.velocityEnd, p.featherEnd, p.velocityEnd].forEach((point, i) => vectorNear(d.addition.points[i], point));
    }
    if (!p.components) assert(!d.addition.visible);
    if (snapshot.camera.fit === 'motion') {
      assert(d.group.bounds.count > 0);
      for (let axis = 0; axis < 3; axis++) assert(d.group.bounds.min[axis] >= -1 - 1e-6 && d.group.bounds.max[axis] <= 1 + 1e-6, 'Framed probe geometry stays inside the frustum');
    }
  }
  return snapshot;
}

async function runWidth(browser, width) {
  const phone = width < 500, height = phone ? 844 : 1080, errors = [], result = { width, touch: phone, checks: {}, screenshots: [] };
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000); page.on('pageerror', error => errors.push(error.stack || error.message));
  const canvas = page.locator('.iss-station-stage canvas'), stage = page.locator('.iss-station-stage'), panel = page.locator('[data-iss-motion-panel]');
  const toggle = page.locator('[data-iss-motion-toggle]'), components = page.locator('[data-iss-motion-components]');
  const activate = locator => phone ? locator.tap() : locator.click();
  const read = () => canvas.evaluate(cv => {
    const gl = cv.getContext('webgl2') || cv.getContext('webgl');
    return { state: cv._issLightingState(), probe: cv._issMotionProbeState(), forecast: cv._issForecastState(), camera: cv._issCameraState(), draw: window.__issMotionQA.draw,
      glLost: gl ? gl.isContextLost() : null, togglePressed: document.querySelector('[data-iss-motion-toggle]')?.getAttribute('aria-pressed'),
      componentsPressed: document.querySelector('[data-iss-motion-components]')?.getAttribute('aria-pressed'), contentHidden: document.querySelector('[data-iss-motion-content]').hidden,
      spanValue: Number(document.querySelector('[data-iss-motion-span]').value), sideValue: Number(document.querySelector('[data-iss-motion-side]').value), scaleValue: Number(document.querySelector('[data-iss-motion-scale]').value),
      readings: Object.fromEntries(Array.from(document.querySelectorAll('[data-iss-motion-reading]'), node => [node.dataset.issMotionReading, { value: node.getAttribute('data-value'), text: node.textContent.trim() }])),
      events: window.__issMotionQA.events.slice(-200) };
  });
  const ready = async () => {
    await page.evaluate(() => new Promise(resolve => window.__issMotionNativeRAF(() => window.__issMotionNativeRAF(resolve))));
    await page.waitForFunction(() => {
      const cv = document.querySelector('.iss-station-stage canvas'), d = window.__issMotionQA?.draw;
      if (!cv?._issMotionProbeState || !d) return false;
      const p = cv._issMotionProbeState(), s = cv._issLightingState(), c = cv._issCameraState();
      return !c.tweening && ['enabled', 'components', 'span', 'side', 'requestedScale', 'visible'].every(k => d.probe[k] === p[k]) &&
        ['phase', 'arrayAlpha', 'arrayFeather', 'actualAlphaRate', 'actualFeatherRate'].every(k => Math.abs(d.state[k] - s[k]) < 1e-8) &&
        c.position.every((v, i) => Math.abs(v - d.camera.position[i]) < 1e-8) && d.canvas.width === cv.clientWidth && d.canvas.height === cv.clientHeight;
    }, undefined, { polling: 100 });
    return verify(await read());
  };
  const select = async (selector, value) => {
    const control = page.locator(selector), index = await control.locator('option').evaluateAll((nodes, number) => nodes.findIndex(node => Number(node.value) === number), value);
    assert(index >= 0); await control.focus(); await page.keyboard.press('Home');
    for (let i = 0; i < index; i++) await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter'); return ready();
  };
  const inspectionChange = async action => {
    const before = await ready(); await action(); const after = await ready();
    samePhysics(before, after); sameCamera(before, after); assert.deepEqual(after.forecast, before.forecast); return after;
  };
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
      const filename = `map-motion-probe-${label}-${suffix}-${width}.png`, session = await page.context().newCDPSession(page);
      try {
        const shot = await session.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: true, clip: { ...last, scale: 1 } });
        await fs.writeFile(path.join(output, filename), Buffer.from(shot.data, 'base64')); result.screenshots.push(filename);
      } finally { await session.detach(); }
    }
    const after = await ready(); samePhysics(before, after); sameCamera(before, after); assert.deepEqual(after.forecast, before.forecast);
  };
  try {
    console.log(`Checking actual array motion probe at ${width}px`);
    await page.addInitScript(() => {
      window.AlloPostFXEnabled = false; window.__issMotionClock = 0;
      window.__issMotionNativeRAF = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = callback => window.__issMotionNativeRAF(() => callback(window.__issMotionClock));
    });
    await page.route('**/vendor/three-r128/three.min.js', async route => {
      const response = await route.fetch(); assert(response.ok());
      await route.fulfill({ response, body: (await response.text()) + '\n;(' + observeRenderer.toString() + ')();\n' });
    });
    await page.goto(`${base}/?tab=map`, { waitUntil: 'load' }); await panel.waitFor(); let after = await ready();
    assert(!after.probe.enabled && !after.probe.available && !after.probe.visible && after.probe.components);
    await page.evaluate(() => ['click', 'change', 'keydown'].forEach(type => document.addEventListener(type, event => {
      const node = event.target.closest('[data-iss-motion-toggle],[data-iss-motion-enable],[data-iss-motion-span],[data-iss-motion-side],[data-iss-motion-scale],[data-iss-motion-components],[data-iss-motion-preset],[data-iss-camera-fit="motion"]');
      if (node) window.__issMotionQA.events.push({ type, key: event.key, trusted: event.isTrusted,
        action: node.hasAttribute('data-iss-motion-toggle') ? 'toggle' : node.hasAttribute('data-iss-motion-enable') ? 'enable' : node.hasAttribute('data-iss-motion-span') ? 'span' :
          node.hasAttribute('data-iss-motion-side') ? 'side' : node.hasAttribute('data-iss-motion-scale') ? 'scale' : node.hasAttribute('data-iss-motion-components') ? 'components' : node.hasAttribute('data-iss-motion-preset') ? 'preset' : 'fit' });
    }, true)));
    await inspectionChange(() => activate(toggle)); after = await ready(); assert(after.probe.enabled && !after.probe.available);
    await activate(page.locator('[data-iss-motion-enable]')); after = await ready(); assert(after.probe.available && after.probe.visible);
    near(after.probe.speed, 0); assert(/rest/i.test(after.readings.status.text));
    result.checks.explicitEnableAndUnavailableReadings = true;
    await canvas.evaluate(cv => {
      cv._issSetLighting({ arrayAlpha: -120, arrayFeather: 45, motorRate: .2, motorAcceleration: .002 }); cv._issStepLighting(60);
    }); after = await ready(); assert(after.probe.speed > 0);

    for (const [preset, span] of [['root', 0], ['middle', .5], ['tip', 1]]) {
      after = await inspectionChange(() => activate(page.locator(`[data-iss-motion-preset="${preset}"]`))); near(after.probe.span, span);
    }
    await inspectionChange(async () => { await page.locator('[data-iss-motion-span]').focus(); await page.keyboard.press('ArrowLeft'); });
    after = await ready(); near(after.probe.span, .99);
    for (const side of [-1, 1]) after = await inspectionChange(() => select('[data-iss-motion-side]', side));
    for (const value of [100, 300, 600]) after = await inspectionChange(() => select('[data-iss-motion-scale]', value));
    assert(after.probe.limited); assert(after.probe.displayScale < 600);
    await inspectionChange(() => activate(components)); after = await ready(); assert(!after.probe.components);
    await inspectionChange(() => activate(components)); after = await ready(); assert(after.probe.components);
    result.checks.nativeProbeControls = { presets: true, spanKeyboard: true, bothSides: true, scales: [100, 300, 600], commonCap: after.probe.displayScale };

    const beforeFrame = after; await activate(page.locator('[data-iss-camera-fit="motion"]')); after = await ready();
    assert.equal(after.camera.fit, 'motion'); near(after.camera.fitRadius, 4.8); vectorNear(after.camera.target, after.draw.wing.position);
    samePhysics(beforeFrame, after); assert.deepEqual(after.forecast, beforeFrame.forecast);
    await capture('components');
    const beforeResize = after; await page.setViewportSize({ width: phone ? 430 : 900, height }); after = await ready();
    assert.equal(after.camera.fit, 'motion'); samePhysics(beforeResize, after); sameInspection(beforeResize, after); assert.deepEqual(after.forecast, beforeResize.forecast);
    await page.setViewportSize({ width, height }); after = await ready(); assert.equal(after.camera.fit, 'motion');
    result.checks.frameAndResponsiveFit = true;

    const beforeRate = after;
    for (const rate of [.1, 180]) {
      await select('[data-iss-live-rate]', rate); after = await ready(); near(after.probe.speed, beforeRate.probe.speed); samePhysics(beforeRate, after);
    }
    assert(/paused/i.test(after.readings.status.text));
    const beforeLive = after; await activate(page.locator('[data-iss-live-play]')); after = await ready(); assert(after.probe.playing);
    near(after.probe.speed, beforeLive.probe.speed); near(after.state.driveElapsed, beforeLive.state.driveElapsed);
    await inspectionChange(() => activate(toggle)); after = await ready(); assert(!after.probe.visible && after.state.playing);
    await inspectionChange(() => activate(toggle)); after = await ready(); assert(after.probe.visible && after.state.playing);
    await activate(page.locator('[data-iss-live-play]')); after = await ready(); assert(!after.probe.playing);
    result.checks.storedVelocityIndependentOfClockRate = true;

    const beforePreview = after; await activate(page.locator('[data-iss-forecast-toggle]')); after = await ready(); assert(after.forecast.active && after.probe.visible);
    await canvas.evaluate(cv => { cv._issSeekForecastTime(173.2); cv._issPlayForecast(true); }); after = await ready();
    const actualDuringPreview = after;
    after = await inspectionChange(() => activate(page.locator('[data-iss-motion-preset="middle"]')));
    after = await inspectionChange(() => select('[data-iss-motion-side]', -1));
    after = await inspectionChange(() => select('[data-iss-motion-scale]', 300));
    after = await inspectionChange(() => activate(components));
    assert(after.forecast.playing && after.probe.visible); samePhysics(actualDuringPreview, after);
    vectorNear(after.draw.marker.world, after.draw.wing.surface);
    await canvas.evaluate(cv => cv._issPlayForecast(false)); after = await ready();
    const previewBeforeFit = after; await activate(page.locator('[data-iss-camera-fit="motion"]')); after = await ready();
    assert.deepEqual(after.forecast, previewBeforeFit.forecast); samePhysics(previewBeforeFit, after);
    await activate(page.locator('[data-iss-forecast-close]')); after = await ready(); samePhysics(beforePreview, after);
    result.checks.forecastLeavesProbeOnActualArray = true;

    await activate(components); await activate(page.locator('[data-iss-motion-preset="tip"]')); await select('[data-iss-motion-scale]', 600); after = await ready();
    await activate(page.locator('[data-iss-drive-brake]')); const beforeBrakeStep = await ready(); assert(beforeBrakeStep.probe.braking);
    await activate(page.locator('[data-iss-step-second]')); after = await ready(); assert(after.probe.braking);
    for (const key of ['actualAlphaRate', 'actualFeatherRate']) near(Math.abs(after.state[key]), Math.max(0, Math.abs(beforeBrakeStep.state[key]) - beforeBrakeStep.state.motorAcceleration), 1e-8);
    assert(after.probe.speed < beforeBrakeStep.probe.speed); near(after.state.driveElapsed, beforeBrakeStep.state.driveElapsed + 1);
    result.checks.oneSecondBrakingChangesVectors = true;
    await capture('braking');
    await canvas.evaluate(cv => cv._issStepLighting(cv._issBrakingState().seconds)); after = await ready();
    near(after.probe.speed, 0, 1e-10); assert(after.probe.visible && after.draw.marker.visible && after.draw.arrows.every(arrow => !arrow.visible));
    assert(/rest|held|braked/i.test(after.readings.status.text)); result.checks.markerPersistsAtRest = true;

    const beforeUnavailable = after; await activate(page.locator('[data-iss-drive-smooth]')); after = await ready();
    assert(!after.probe.available && !after.probe.visible); sameInspection(beforeUnavailable, after);
    await activate(page.locator('[data-iss-motion-enable]')); after = await ready(); assert(after.probe.available); sameInspection(beforeUnavailable, after);
    await canvas.evaluate(cv => cv._issSetLighting({ arrayAlpha: -140, arrayFeather: 60 }));
    await canvas.evaluate(cv => cv._issStepLighting(60)); after = await ready(); assert(after.probe.speed > 0 && after.probe.visible);
    result.checks.configurationSurvivesMotionModeChanges = true;

    const layout = await page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth,
      controls: Array.from(document.querySelectorAll('[data-iss-motion-panel],[data-iss-motion-panel] button,[data-iss-motion-panel] select,[data-iss-motion-panel] input'), node => {
        const b = node.getBoundingClientRect(); return { left: b.left, right: b.right, width: b.width, height: b.height, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth };
      }) }));
    assert(layout.width <= width + 1);
    for (const item of layout.controls.filter(item => item.width > 0)) { assert(item.left >= -1 && item.right <= width + 1); assert(item.scrollWidth <= item.clientWidth + 1); }
    await page.addScriptTag({ path: path.join(ROOT, 'desktop/web-app/node_modules/axe-core/axe.min.js') });
    const accessibility = await page.evaluate(async () => {
      const checked = await axe.run({ include: ['[data-iss-motion-panel]'] }, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
      return { passes: checked.passes.length, violations: checked.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })) };
    });
    assert.deepEqual(accessibility.violations, []); result.checks.layout = layout; result.checks.accessibility = accessibility;
    after = await ready();
    for (const action of ['toggle', 'enable', 'span', 'side', 'scale', 'components', 'preset', 'fit']) assert(after.events.some(event => event.action === action && event.trusted), `Trusted ${action} control was exercised`);
    assert(after.events.some(event => event.action === 'span' && event.type === 'keydown' && event.trusted));
    result.errors = errors; result.hostErrors = await page.evaluate(() => window.__events?.errors || []);
    assert.deepEqual(errors, []); assert.deepEqual(result.hostErrors, []); result.passed = true;
    console.log(`Motion probe vectors, actual surface, native controls, braking and accessibility passed at ${width}px`);
    return result;
  } catch (error) {
    result.passed = false; result.failure = error.stack || error.message; result.errors = errors;
    result.lastSnapshot = await read().catch(() => null); error.qaResult = result; throw error;
  } finally {
    try {
      result.checks.cleanup = await page.evaluate(() => {
        document.querySelector('.iss-station-stage canvas')?._issSetLighting?.({ playing: false }); window.__destroy?.();
        return { contexts: window.__issMotionQA?.contexts.length || 0, lost: (window.__issMotionQA?.contexts || []).map(gl => gl.isContextLost()), canvases: document.querySelectorAll('.iss-station-stage canvas').length };
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
  console.log(`3D motion probe checks passed: ${widths.join(', ')}px. Results: ${output}`);
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
