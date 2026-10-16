#!/usr/bin/env node
'use strict';

// Trusted controls and actual WebGL geometry, with the live RAF clock held.
// Uses the existing preview server; this script never starts a second server.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const argument = (name, fallback) => process.argv.slice(2).find(value => value.startsWith(name + '='))?.slice(name.length + 1) || fallback;
const base = argument('--base', 'http://127.0.0.1:4179').replace(/\/$/, '');
const output = path.resolve(ROOT, argument('--out', 'reports/space-station-enhancement-qa/map-arm-preview-browser'));
const widths = argument('--widths', '1440,390').split(',').map(Number);
assert(widths.length && widths.every(width => Number.isInteger(width) && width >= 320));
const RAD = Math.PI / 180;
const near = (actual, expected, tolerance = 1e-7) => {
  assert(Number.isFinite(actual) && Number.isFinite(expected), `Finite values required: ${actual}, ${expected}`);
  assert(Math.abs(actual - expected) <= tolerance, `${actual} should equal ${expected} within ${tolerance}`);
};
const vectorNear = (actual, expected, tolerance = 1e-6) => {
  assert(Array.isArray(actual) && Array.isArray(expected) && actual.length === expected.length);
  actual.forEach((value, index) => near(value, expected[index], tolerance));
};
const add = (a, b) => a.map((value, index) => value + b[index]);
const subtract = (a, b) => a.map((value, index) => value - b[index]);
const scale = (vector, factor) => vector.map(value => value * factor);
const norm = vector => Math.hypot(...vector);
// Independent two-link forward geometry and centered position differences.
function fk(shoulder, elbow) {
  const a = shoulder * RAD, b = (shoulder + elbow) * RAD;
  const first = [-Math.sin(a), Math.cos(a), 0], second = [-Math.sin(b), Math.cos(b), 0];
  const joint = scale(first, 1.4);
  return { joint, tip: add(joint, scale(second, 1.2)), first, second };
}
function velocity(sample) {
  const h = 1e-3;
  return scale(subtract(fk(sample.shoulder + h * sample.shoulderRate, sample.elbow + h * sample.elbowRate).tip,
    fk(sample.shoulder - h * sample.shoulderRate, sample.elbow - h * sample.elbowRate).tip), 1 / (2 * h));
}
function sameCamera(before, after) {
  for (const key of ['position', 'target', 'stationQuaternion']) vectorNear(after.camera[key], before.camera[key]);
  for (const key of ['fit', 'focusId', 'view', 'guides', 'tweening']) assert.equal(after.camera[key], before.camera[key]);
  near(after.camera.distance, before.camera.distance);
}
function sameActual(before, after, { playing = true, rate = true, camera = true } = {}) {
  for (const key of ['phase', 'beta', 'arrayAlpha', 'arrayFeather', 'actualAlphaRate', 'actualFeatherRate', 'driveElapsed', 'commandAlpha', 'commandFeather', 'motorRate', 'motorAcceleration', 'incidence', 'generation']) near(after.state[key], before.state[key]);
  for (const key of ['tracking', 'motorEnabled', 'motorSmooth', 'motorBraking', 'eclipse']) assert.equal(after.state[key], before.state[key]);
  if (playing) assert.equal(after.state.playing, before.state.playing);
  if (rate) near(after.state.rate, before.state.rate);
  vectorNear(after.state.sun, before.state.sun); vectorNear(after.state.wingNormal, before.state.wingNormal);
  for (const key of ['shoulder', 'elbow', 'shoulderRate', 'elbowRate']) near(after.arm.actual[key], before.arm.actual[key]);
  near(after.arm.elapsed, before.arm.elapsed); assert.deepEqual(after.arm.pose, before.arm.pose); assert.deepEqual(after.arm.target, before.arm.target);
  if (camera) sameCamera(before, after);
}

function observeRenderer() {
  const Original = THREE.WebGLRenderer;
  window.__issArmPreviewQA = { draw: null, sequence: 0, contexts: [], events: [] };
  function ObservedRenderer(options) {
    const renderer = new Original(options), render = renderer.render;
    window.__issArmPreviewQA.contexts.push(renderer.getContext());
    renderer.render = function (scene, camera) {
      const returned = render.apply(this, arguments), cv = renderer.domElement;
      if (scene.name !== 'iss-station-inspection' || !cv._issArmPreviewState) return returned;
      const group = scene.getObjectByName('iss-arm-preview'); if (!group) return returned;
      const effectiveVisible = object => { if (!object) return false; for (let node = object; node; node = node.parent) if (!node.visible) return false; return true; };
      const mesh = name => {
        const object = scene.getObjectByName(name); if (!object) return null;
        return { type: object.type, visible: effectiveVisible(object), position: object.position.toArray(), quaternion: object.quaternion.toArray(), scale: object.scale.toArray(),
          direction: new THREE.Vector3(0, 1, 0).applyQuaternion(object.quaternion).toArray(),
          positions: object.geometry?.attributes.position ? Array.from(object.geometry.attributes.position.array) : null,
          drawRange: object.geometry?.drawRange, material: object.material && { transparent: object.material.transparent, opacity: object.material.opacity,
            depthTest: object.material.depthTest, depthWrite: object.material.depthWrite, renderOrder: object.renderOrder } };
      };
      const qa = window.__issArmPreviewQA;
      qa.draw = { sequence: ++qa.sequence, arm: cv._issArmState(), preview: cv._issArmPreviewState(), state: cv._issLightingState(), camera: cv._issCameraState(),
        canvas: { width: cv.clientWidth, height: cv.clientHeight }, group: { visible: effectiveVisible(group), position: group.position.toArray(), quaternion: group.quaternion.toArray() },
        path: mesh('iss-arm-preview-path'), ticks: mesh('iss-arm-preview-ticks'), upper: mesh('iss-arm-preview-upper'), fore: mesh('iss-arm-preview-fore'),
        joint: mesh('iss-arm-preview-joint'), hand: mesh('iss-arm-preview-hand'), ghost: mesh('iss-arm-target-ghost'),
        actualUpper: mesh('iss-arm-upper'), actualFore: mesh('iss-arm-fore'), actualHand: mesh('iss-arm-hand'),
        outer: mesh('iss-arm-reach-outer'), inner: mesh('iss-arm-reach-inner') };
      return returned;
    };
    return renderer;
  }
  ObservedRenderer.prototype = Original.prototype; Object.setPrototypeOf(ObservedRenderer, Original); THREE.WebGLRenderer = ObservedRenderer;
}

let helpers;
function verify(snapshot) {
  const { arm, preview, draw } = snapshot;
  assert(draw?.path && draw.ticks && draw.upper && draw.fore && draw.joint && draw.hand, 'Rendered preview geometry exists');
  assert.equal(snapshot.glLost, false); assert.equal(snapshot.togglePressed, String(preview.active));
  assert.equal(snapshot.contentHidden, !preview.active); assert.equal(preview.visible, preview.active && arm.enabled);
  assert.equal(snapshot.stageHidden, !preview.visible);
  assert.equal(draw.group.visible, preview.visible); vectorNear(draw.group.position, arm.base); vectorNear(draw.group.quaternion, [0, 0, 0, 1]);
  assert.equal(draw.ghost.visible, arm.enabled && !preview.active);
  const actual = fk(arm.actual.shoulder, arm.actual.elbow);
  vectorNear(draw.actualUpper.position, add(arm.base, scale(actual.joint, .5)));
  vectorNear(draw.actualFore.position, add(arm.base, scale(add(actual.joint, actual.tip), .5)));
  vectorNear(draw.actualHand.position, add(arm.base, actual.tip));
  for (const mesh of [draw.actualUpper, draw.actualFore, draw.actualHand]) assert(mesh.visible, 'The physical arm remains visible');
  for (const ring of [draw.outer, draw.inner]) assert.equal(ring.visible, arm.enabled && arm.guides);
  near(preview.rate, 10); near(preview.horizonSeconds, 120);
  if (!preview.active) { assert(!preview.playing); assert.equal(preview.selected, null); assert.equal(preview.initial, null); assert.deepEqual(preview.samples, []); return snapshot; }
  assert(!snapshot.state.playing && !snapshot.forecast.active); assert(preview.initial && preview.selected); assert.equal(preview.samples.length, 121);
  // Native range controls snap to their quarter-second grid; API/telemetry and
  // the actual prediction retain the requested off-grid time exactly.
  near(Number(snapshot.time), preview.seconds, .12500001); near(preview.selected.seconds, preview.seconds);
  assert.equal(snapshot.playPressed, String(preview.playing));
  const selected = preview.selected, expected = helpers.step(preview.initial, preview.seconds), pose = fk(selected.shoulder, selected.elbow);
  for (const key of ['shoulder', 'elbow', 'shoulderRate', 'elbowRate']) near(selected[key], expected[key], 1e-10);
  assert.equal(selected.slewing, expected.slewing); vectorNear(selected.joint, pose.joint); vectorNear(selected.tip, pose.tip);
  vectorNear(selected.velocity, velocity(selected), 2e-10); near(selected.speed, norm(selected.velocity), 1e-12);
  vectorNear(draw.upper.position, scale(pose.joint, .5)); vectorNear(draw.fore.position, scale(add(pose.joint, pose.tip), .5));
  vectorNear(draw.joint.position, pose.joint); vectorNear(draw.hand.position, pose.tip);
  vectorNear(draw.upper.direction, pose.first); vectorNear(draw.fore.direction, pose.second);
  near(draw.upper.scale[1], 1.4); near(draw.fore.scale[1], 1.2);
  for (const mesh of [draw.upper, draw.fore]) {
    const ys = mesh.positions.filter((value, index) => index % 3 === 1); near(Math.max(...ys) - Math.min(...ys), 1);
    assert(mesh.material.transparent && !mesh.material.depthTest && !mesh.material.depthWrite);
  }
  vectorNear(subtract(draw.upper.position, scale(draw.upper.direction, .5 * draw.upper.scale[1])), [0, 0, 0]);
  vectorNear(add(draw.upper.position, scale(draw.upper.direction, .5 * draw.upper.scale[1])), pose.joint);
  vectorNear(subtract(draw.fore.position, scale(draw.fore.direction, .5 * draw.fore.scale[1])), pose.joint);
  vectorNear(add(draw.fore.position, scale(draw.fore.direction, .5 * draw.fore.scale[1])), pose.tip);
  assert.equal(draw.path.positions.length, 121 * 3); assert.equal(draw.ticks.positions.length, 13 * 3);
  preview.samples.forEach((sample, index) => {
    near(sample.seconds, index); const independent = fk(sample.shoulder, sample.elbow);
    vectorNear(sample.tip, independent.tip); vectorNear(sample.joint, independent.joint);
    vectorNear(sample.velocity, velocity(sample), 2e-10); near(sample.speed, norm(sample.velocity), 1e-12);
    vectorNear(draw.path.positions.slice(index * 3, index * 3 + 3), independent.tip, 2e-6);
    if (index % 10 === 0) vectorNear(draw.ticks.positions.slice(index / 10 * 3, index / 10 * 3 + 3), independent.tip, 2e-6);
  });
  for (const index of [0, 30, 120]) {
    const direct = helpers.step(preview.initial, index);
    for (const key of ['shoulder', 'elbow', 'shoulderRate', 'elbowRate']) near(preview.samples[index][key], direct[key], 1e-10);
  }
  for (const mesh of [draw.path, draw.ticks, draw.upper, draw.fore, draw.joint, draw.hand]) assert.equal(mesh.visible, preview.visible);
  assert(snapshot.readings.time.length && snapshot.readings.speed.length && snapshot.readings.distance.length);
  near(snapshot.readingValues.time, preview.seconds); near(snapshot.readingValues.speed, selected.speed);
  near(snapshot.readingValues.distance, norm(subtract(pose.tip, fk(preview.initial.targetShoulder, preview.initial.targetElbow).tip)));
  assert.equal(snapshot.applyDisabled, preview.seconds <= 0); assert(/prediction|preview complete/i.test(snapshot.status));
  return snapshot;
}

async function runWidth(browser, width) {
  const phone = width < 500, height = phone ? 844 : 1080, errors = [], result = { width, touch: phone, checks: {}, screenshots: [] };
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000); page.on('pageerror', error => errors.push(error.stack || error.message));
  const canvas = page.locator('.iss-station-stage canvas'), stage = page.locator('.iss-station-stage'), panel = page.locator('[data-iss-arm-panel]');
  const toggle = page.locator('[data-iss-arm-preview-toggle]'), seek = page.locator('[data-iss-arm-preview-time]'), play = page.locator('[data-iss-arm-preview-play]');
  const activate = locator => phone ? locator.tap() : locator.click();
  const read = () => canvas.evaluate(cv => {
    const gl = cv.getContext('webgl2') || cv.getContext('webgl');
    return { state: cv._issLightingState(), arm: cv._issArmState(), preview: cv._issArmPreviewState(), forecast: cv._issForecastState(), camera: cv._issCameraState(), draw: window.__issArmPreviewQA.draw,
      glLost: gl ? gl.isContextLost() : null, togglePressed: document.querySelector('[data-iss-arm-preview-toggle]').getAttribute('aria-pressed'),
      contentHidden: document.querySelector('[data-iss-arm-preview-content]').hidden, playPressed: document.querySelector('[data-iss-arm-preview-play]').getAttribute('aria-pressed'),
      stageHidden: document.querySelector('[data-iss-arm-preview-stage]').hidden, applyDisabled: document.querySelector('[data-iss-arm-preview-apply]').disabled,
      status: document.querySelector('[data-iss-arm-preview-status]').textContent.trim(),
      time: document.querySelector('[data-iss-arm-preview-time]').value,
      readings: Object.fromEntries(['time', 'speed', 'distance'].map(key => [key, document.querySelector('[data-iss-arm-preview-reading="' + key + '"]').textContent.trim()])),
      readingValues: Object.fromEntries(['time', 'speed', 'distance'].map(key => [key, Number(document.querySelector('[data-iss-arm-preview-reading="' + key + '"]').getAttribute('data-value'))])),
      events: window.__issArmPreviewQA.events.slice(-300) };
  });
  const ready = async () => {
    await page.evaluate(() => new Promise(resolve => window.__issArmPreviewNativeRAF(() => window.__issArmPreviewNativeRAF(resolve))));
    await page.waitForFunction(() => {
      const cv = document.querySelector('.iss-station-stage canvas'), draw = window.__issArmPreviewQA?.draw;
      if (!cv?._issArmPreviewState || !draw) return false;
      const arm = cv._issArmState(), preview = cv._issArmPreviewState(), state = cv._issLightingState(), camera = cv._issCameraState();
      return !camera.tweening && JSON.stringify(draw.arm) === JSON.stringify(arm) && JSON.stringify(draw.preview) === JSON.stringify(preview) &&
        ['phase', 'arrayAlpha', 'arrayFeather', 'actualAlphaRate', 'actualFeatherRate'].every(key => Math.abs(draw.state[key] - state[key]) < 1e-8) &&
        camera.position.every((value, index) => Math.abs(value - draw.camera.position[index]) < 1e-8) && draw.canvas.width === cv.clientWidth && draw.canvas.height === cv.clientHeight;
    }, undefined, { polling: 100 });
    return verify(await read());
  };
  const isolated = async action => { const before = await ready(); await action(); const after = await ready(); sameActual(before, after); return after; };
  const open = async () => {
    const before = await ready(); await activate(toggle); const after = await ready(); sameActual(before, after, { playing: false });
    assert(after.preview.active && !after.preview.playing); near(after.preview.seconds, 30); return after;
  };
  const capture = async label => {
    await page.evaluate(() => document.activeElement?.blur()); const before = await ready(); assert(!before.state.playing && !before.preview.playing);
    for (const [locator, suffix] of [[stage, 'stage'], [panel, 'panel']]) {
      await locator.evaluate(node => node.scrollIntoView({ block: 'center', behavior: 'instant' }));
      let last = null, stable = 0;
      for (let i = 0; i < 12; i++) {
        const box = await locator.evaluate(node => { const b = node.getBoundingClientRect(); return { x: b.x + scrollX, y: b.y + scrollY, width: b.width, height: b.height }; });
        stable = last && Object.keys(box).every(key => Math.abs(box[key] - last[key]) < .25) ? stable + 1 : 0; last = box;
        if (stable >= 2) break; await page.waitForTimeout(150);
      }
      assert(stable >= 2 && last.width > 0 && last.height > 0);
      const sequence = await canvas.evaluate(cv => { const old = window.__issArmPreviewQA.draw.sequence; cv._issSeekArmPreview(cv._issArmPreviewState().seconds); return old; });
      await page.waitForFunction(old => window.__issArmPreviewQA.draw.sequence > old, sequence, { polling: 100 }); sameActual(before, await ready());
      const filename = `map-arm-preview-${label}-${suffix}-${width}.png`, session = await page.context().newCDPSession(page);
      try {
        const shot = await session.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: true, clip: { ...last, scale: 1 } });
        await fs.writeFile(path.join(output, filename), Buffer.from(shot.data, 'base64')); result.screenshots.push(filename);
      } finally { await session.detach(); }
    }
    sameActual(before, await ready());
  };
  try {
    console.log(`Checking arm motion preview and actual WebGL geometry at ${width}px`);
    await page.addInitScript(() => {
      window.AlloPostFXEnabled = false; window.__issArmPreviewClock = 0; window.__issArmPreviewNativeRAF = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = callback => window.__issArmPreviewNativeRAF(() => callback(window.__issArmPreviewClock));
    });
    await page.route('**/vendor/three-r128/three.min.js', async route => {
      const response = await route.fetch(); assert(response.ok());
      await route.fulfill({ response, body: (await response.text()) + '\n;(' + observeRenderer.toString() + ')();\n' });
    });
    await page.goto(`${base}/?tab=map`, { waitUntil: 'load' }); await toggle.waitFor({ state: 'attached' }); let after = await ready(); assert(!after.preview.active);
    await page.evaluate(() => ['click', 'input', 'change', 'keydown'].forEach(type => document.addEventListener(type, event => {
      const node = event.target.closest('[data-iss-arm-preview-toggle],[data-iss-arm-preview-time],[data-iss-arm-preview-play],[data-iss-arm-preview-apply],[data-iss-arm-preview-close],[data-iss-arm-preview-stage-time],[data-iss-arm-preview-stage-play],[data-iss-arm-preview-stage-close]');
      if (node) window.__issArmPreviewQA.events.push({ type, key: event.key, trusted: event.isTrusted, action: Array.from(node.attributes).find(attribute => attribute.name.startsWith('data-iss-arm-preview-'))?.name });
    }, true)));
    await activate(page.locator('[data-iss-arm-toggle]')); await activate(page.locator('[data-iss-camera-fit="arm"]')); await ready();
    await activate(page.locator('[data-iss-arm-preset="high"]')); await canvas.evaluate(cv => cv._issStepLighting(3)); await ready();
    await activate(page.locator('[data-iss-live-play]')); const live = await ready(); assert(live.state.playing);
    after = await open(); sameActual(live, after, { playing: false }); assert(!after.state.playing);
    result.checks.openHoldsLivePoseAndCamera = true;
    const beforeSeek = after;
    after = await isolated(async () => { await seek.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); }); near(after.preview.seconds, .25);
    after = await isolated(() => canvas.evaluate(cv => cv._issSeekArmPreview(17.375))); near(after.preview.seconds, 17.375);
    assert.notDeepEqual(after.preview.selected.tip, beforeSeek.preview.selected.tip);
    const beforeMicroseek = after;
    after = await isolated(() => canvas.evaluate(cv => cv._issSeekArmPreview(17.3751)));
    near(after.preview.seconds, 17.3751, 1e-12); near(after.preview.selected.seconds, 17.3751, 1e-12); near(after.readingValues.time, 17.3751, 1e-12);
    const firstMicroseek = after;
    after = await isolated(() => canvas.evaluate(cv => cv._issSeekArmPreview(17.3752)));
    near(after.preview.seconds, 17.3752, 1e-12); near(after.preview.selected.seconds, 17.3752, 1e-12); near(after.readingValues.time, 17.3752, 1e-12);
    assert.notDeepEqual(after.preview.selected.tip, firstMicroseek.preview.selected.tip);
    assert.deepEqual(after.preview.initial, beforeMicroseek.preview.initial); assert.deepEqual(after.preview.samples, beforeMicroseek.preview.samples);
    after = await isolated(() => canvas.evaluate(cv => cv._issSeekArmPreview(17.375))); await capture('trajectory');
    result.checks.microfractionTelemetryAndStateIsolation = true;
    result.checks.independentGeometryVelocityAndFractionalSeek = true;
    after = await isolated(() => activate(play)); assert(after.preview.playing); const playing = after;
    await page.evaluate(() => { window.__issArmPreviewClock += 1000; }); after = await ready(); sameActual(playing, after); near(after.preview.seconds, 19.875);
    after = await isolated(() => activate(play)); assert(!after.preview.playing);
    after = await isolated(() => canvas.evaluate(cv => cv._issSeekArmPreview(120))); near(after.preview.seconds, 120);
    after = await isolated(() => activate(play)); assert(after.preview.playing); near(after.preview.seconds, 0);
    after = await isolated(() => canvas.evaluate(cv => cv._issSeekArmPreview(119.75))); assert(!after.preview.playing);
    after = await isolated(() => activate(play)); const ending = after;
    await page.evaluate(() => { window.__issArmPreviewClock += 1000; }); after = await ready(); sameActual(ending, after); near(after.preview.seconds, 120); assert(!after.preview.playing);
    result.checks.independentPreviewPlaybackAndEnd = true;
    after = await isolated(() => canvas.evaluate(cv => cv._issSeekArmPreview(17.375)));
    const beforeGuides = after; after = await isolated(() => activate(page.locator('[data-iss-arm-guides]'))); assert(!after.arm.guides); assert.deepEqual(after.preview, beforeGuides.preview);
    after = await isolated(() => activate(page.locator('[data-iss-arm-guides]'))); assert(after.arm.guides);
    after = await isolated(() => activate(play)); assert(after.preview.playing); const visible = after;
    after = await isolated(() => activate(page.locator('[data-iss-arm-toggle]'))); assert(after.preview.active && !after.preview.visible && !after.preview.playing); near(after.preview.seconds, visible.preview.seconds);
    after = await isolated(() => activate(page.locator('[data-iss-arm-toggle]'))); assert(after.preview.active && after.preview.visible && !after.preview.playing);
    const beforeRate = after; await page.locator('[data-iss-live-rate]').selectOption('10'); after = await ready(); sameActual(beforeRate, after, { rate: false }); assert.deepEqual(after.preview, beforeRate.preview);
    const beforeClose = after; after = await isolated(() => activate(page.locator('[data-iss-arm-preview-close]'))); assert(!after.preview.active); sameActual(beforeClose, after);
    result.checks.guidesVisibilityRateAndCloseIsolation = true;
    await open(); after = await isolated(async () => { await page.locator('[data-iss-arm-preview-stage-time]').focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); }); near(after.preview.seconds, .25);
    after = await isolated(() => activate(page.locator('[data-iss-arm-preview-stage-play]'))); assert(after.preview.playing);
    after = await isolated(() => activate(page.locator('[data-iss-arm-preview-stage-play]'))); assert(!after.preview.playing);
    after = await isolated(() => activate(page.locator('[data-iss-arm-preview-stage-close]'))); assert(!after.preview.active);
    result.checks.nativeStageTransport = true;
    await activate(page.locator('[data-iss-forecast-toggle]')); await canvas.evaluate(cv => { cv._issSeekForecastTime(17.25); cv._issPlayForecast(true); }); after = await ready(); assert(after.forecast.active && after.forecast.playing);
    after = await open(); assert(!after.forecast.active);
    const beforeArray = after; await activate(page.locator('[data-iss-forecast-toggle]')); after = await ready(); sameActual(beforeArray, after); assert(after.forecast.active && !after.preview.active);
    after = await open(); assert(!after.forecast.active);
    const beforeTarget = after; await activate(page.locator('[data-iss-arm-preset="wide"]')); after = await ready(); assert(!after.preview.active); near(after.arm.elapsed, beforeTarget.arm.elapsed); assert.deepEqual(after.arm.pose, beforeTarget.arm.pose);
    for (const key of ['shoulder', 'elbow', 'shoulderRate', 'elbowRate']) near(after.arm.actual[key], beforeTarget.arm.actual[key]);
    await open(); const beforeHold = await ready(); await activate(page.locator('[data-iss-arm-hold]')); after = await ready(); assert(!after.preview.active); near(after.arm.elapsed, beforeHold.arm.elapsed); assert.deepEqual(after.arm.pose, beforeHold.arm.pose);
    for (const key of ['shoulder', 'elbow', 'shoulderRate', 'elbowRate']) near(after.arm.actual[key], beforeHold.arm.actual[key]);
    await open(); const beforeStep = await ready(); await activate(page.locator('[data-iss-step-second]')); after = await ready(); assert(!after.preview.active); near(after.arm.elapsed, beforeStep.arm.elapsed + 1);
    await open(); const beforeLive = await ready(); await activate(page.locator('[data-iss-live-play]')); after = await ready(); assert(!after.preview.active && after.state.playing); sameActual(beforeLive, after, { playing: false });
    await canvas.evaluate(cv => cv._issSetLighting({ playing: false })); await ready();
    result.checks.mutualExclusionAndStateInvalidation = true;
    await activate(page.locator('[data-iss-arm-preset="high"]'));
    await canvas.evaluate(cv => cv._issSetLighting({ motorEnabled: true, motorSmooth: true, tracking: false, arrayAlpha: 75, arrayFeather: 20 }));
    await open(); after = await isolated(() => canvas.evaluate(cv => cv._issSeekArmPreview(17.375))); const beforeApply = after;
    const expectedDrive = helpers.driveStep({ ...beforeApply.state, arrayAlpha: beforeApply.state.commandAlpha, arrayFeather: beforeApply.state.commandFeather,
      actualAlpha: beforeApply.state.arrayAlpha, actualFeather: beforeApply.state.arrayFeather,
      actualAlphaRate: beforeApply.state.actualAlphaRate, actualFeatherRate: beforeApply.state.actualFeatherRate }, beforeApply.preview.seconds);
    await activate(page.locator('[data-iss-arm-preview-apply]')); after = await ready(); assert(!after.preview.active && !after.state.playing);
    near(after.arm.elapsed, beforeApply.arm.elapsed + 17.375); sameCamera(beforeApply, after); assert.deepEqual(after.arm.target, beforeApply.arm.target);
    for (const key of ['shoulder', 'elbow', 'shoulderRate', 'elbowRate']) near(after.arm.actual[key], beforeApply.preview.selected[key], 1e-10);
    vectorNear(after.arm.pose.tip, beforeApply.preview.selected.tip);
    near(after.state.phase, expectedDrive.phase); near(after.state.arrayAlpha, expectedDrive.alpha); near(after.state.arrayFeather, expectedDrive.feather);
    near(after.state.actualAlphaRate, expectedDrive.alphaRate); near(after.state.actualFeatherRate, expectedDrive.featherRate); near(after.state.driveElapsed, beforeApply.state.driveElapsed + 17.375);
    result.checks.exactFractionalApplyAdvancesSharedClock = true;
    after = await open(); after = await isolated(() => canvas.evaluate(cv => cv._issSeekArmPreview(8.25))); await capture('after-advance');
    const beforeResize = after; await page.setViewportSize({ width: phone ? 430 : 900, height }); after = await ready();
    sameActual(beforeResize, after, { camera: false }); assert.deepEqual(after.preview, beforeResize.preview); await page.setViewportSize({ width, height }); await ready();
    const layout = await page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth,
      canvasBottom: document.querySelector('.iss-station-stage canvas').getBoundingClientRect().bottom,
      stageTransportTop: document.querySelector('[data-iss-arm-preview-stage]').getBoundingClientRect().top,
      stageTransportControls: Array.from(document.querySelectorAll('[data-iss-arm-preview-stage] button,[data-iss-arm-preview-stage] input'), node => {
        const box = node.getBoundingClientRect(); return { width: box.width, height: box.height };
      }),
      controls: Array.from(document.querySelectorAll('[data-iss-arm-panel],[data-iss-arm-panel] button,[data-iss-arm-panel] input,[data-iss-arm-preview-stage],[data-iss-arm-preview-stage] button,[data-iss-arm-preview-stage] input'), node => {
        const box = node.getBoundingClientRect(); return { left: box.left, right: box.right, width: box.width, height: box.height, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth };
      }) }));
    assert(layout.width <= width + 1);
    for (const item of layout.controls.filter(item => item.width > 0)) { assert(item.left >= -1 && item.right <= width + 1); assert(item.scrollWidth <= item.clientWidth + 1); }
    if (phone) {
      assert(layout.stageTransportTop >= layout.canvasBottom - 1, 'Phone preview transport sits below the canvas without covering the arm');
      assert.equal(layout.stageTransportControls.length, 3);
      for (const control of layout.stageTransportControls) assert(control.width > 0 && control.height >= 44 - .1, 'Phone preview transport controls have 44px touch height');
    }
    await page.addScriptTag({ path: path.join(ROOT, 'desktop/web-app/node_modules/axe-core/axe.min.js') });
    const accessibility = await page.evaluate(async () => {
      const checked = await axe.run({ include: ['[data-iss-arm-panel]'] }, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
      return { passes: checked.passes.length, violations: checked.violations.map(item => ({ id: item.id, targets: item.nodes.map(node => node.target) })) };
    });
    assert.deepEqual(accessibility.violations, []); result.checks.layout = layout; result.checks.accessibility = accessibility;
    after = await ready();
    for (const action of ['toggle', 'time', 'play', 'apply', 'close', 'stage-time', 'stage-play', 'stage-close']) assert(after.events.some(event => event.action === 'data-iss-arm-preview-' + action && event.trusted), `Trusted ${action} interaction was exercised`);
    result.errors = errors; result.hostErrors = await page.evaluate(() => window.__events?.errors || []);
    assert.deepEqual(errors, []); assert.deepEqual(result.hostErrors, []); result.passed = true;
    console.log(`Arm preview geometry, transport, isolation, shared clock and accessibility passed at ${width}px`); return result;
  } catch (error) {
    result.passed = false; result.failure = error.stack || error.message; result.errors = errors;
    result.lastSnapshot = await read().catch(() => null); error.qaResult = result; throw error;
  } finally {
    try {
      result.checks.cleanup = await page.evaluate(() => {
        document.querySelector('.iss-station-stage canvas')?._issSetLighting?.({ playing: false }); window.__destroy?.();
        return { contexts: window.__issArmPreviewQA?.contexts.length || 0, lost: (window.__issArmPreviewQA?.contexts || []).map(gl => gl.isContextLost()), canvases: document.querySelectorAll('.iss-station-stage canvas').length };
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
  helpers = new Function(source.slice(source.indexOf('  var ISS_GM ='), source.indexOf('  function issTransferPlan(')) +
    '\nreturn { step: issMapArmStep, driveStep: issMapDriveStep };')();
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
  console.log(`3D arm motion preview checks passed: ${widths.join(', ')}px. Results: ${output}`);
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
