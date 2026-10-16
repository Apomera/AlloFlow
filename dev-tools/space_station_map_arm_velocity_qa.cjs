#!/usr/bin/env node
'use strict';

// Focused real-WebGL checks. Uses the existing server and a held RAF clock.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const argument = (name, fallback) => process.argv.slice(2).find(value => value.startsWith(name + '='))?.slice(name.length + 1) || fallback;
const base = argument('--base', 'http://127.0.0.1:4179').replace(/\/$/, '');
const output = path.resolve(ROOT, argument('--out', 'reports/space-station-enhancement-qa/map-arm-velocity-browser'));
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
const add = (a, b) => a.map((value, index) => value + b[index]);
const subtract = (a, b) => a.map((value, index) => value - b[index]);
const scaled = (vector, factor) => vector.map(value => value * factor);
const norm = vector => Math.hypot(...vector);
function tip(shoulder, elbow) {
  const a = shoulder * Math.PI / 180, b = (shoulder + elbow) * Math.PI / 180;
  return [-1.4 * Math.sin(a) - 1.2 * Math.sin(b), 1.4 * Math.cos(a) + 1.2 * Math.cos(b), 0];
}
// Isolate each joint with independent centered position differences.
function difference(model, shoulderRate, elbowRate) {
  const h = .001;
  return scaled(subtract(tip(model.shoulder + shoulderRate * h, model.elbow + elbowRate * h),
    tip(model.shoulder - shoulderRate * h, model.elbow - elbowRate * h)), 1 / (2 * h));
}
function samePhysical(before, after, { camera = true, playing = true } = {}) {
  for (const key of ['phase', 'beta', 'arrayAlpha', 'arrayFeather', 'actualAlphaRate', 'actualFeatherRate', 'driveElapsed', 'commandAlpha', 'commandFeather', 'motorRate', 'motorAcceleration', 'rate']) near(after.state[key], before.state[key]);
  for (const key of ['tracking', 'motorEnabled', 'motorSmooth', 'motorBraking']) assert.equal(after.state[key], before.state[key]);
  if (playing) assert.equal(after.state.playing, before.state.playing);
  assert.deepEqual(after.arm.actual, before.arm.actual); assert.deepEqual(after.arm.pose, before.arm.pose);
  assert.deepEqual(after.arm.target, before.arm.target); near(after.arm.elapsed, before.arm.elapsed);
  if (camera) {
    for (const key of ['position', 'target', 'stationQuaternion']) vectorNear(after.camera[key], before.camera[key]);
    for (const key of ['fit', 'focusId', 'view', 'guides', 'tweening']) assert.equal(after.camera[key], before.camera[key]);
    near(after.camera.distance, before.camera.distance);
  }
}

function observeRenderer() {
  const Original = THREE.WebGLRenderer;
  window.__issArmVelocityQA = { draw: null, sequence: 0, contexts: [], events: [] };
  function ObservedRenderer(options) {
    const renderer = new Original(options), render = renderer.render;
    window.__issArmVelocityQA.contexts.push(renderer.getContext());
    renderer.render = function (scene, camera) {
      const returned = render.apply(this, arguments), cv = renderer.domElement;
      if (scene.name !== 'iss-station-inspection' || !cv._issArmVelocityState) return returned;
      const group = scene.getObjectByName('iss-arm-velocity'); if (!group) return returned;
      const visible = object => { if (!object) return false; for (let node = object; node; node = node.parent) if (!node.visible) return false; return true; };
      const arrow = name => {
        const object = scene.getObjectByName(name); if (!object) return null;
        return { type: object.type, visible: visible(object), position: object.position.toArray(),
          direction: new THREE.Vector3(0, 1, 0).applyQuaternion(object.quaternion).toArray(), length: object.cone?.position.y,
          coneVisible: visible(object.cone) };
      };
      const addition = scene.getObjectByName('iss-arm-velocity-addition');
      window.__issArmVelocityQA.draw = { sequence: ++window.__issArmVelocityQA.sequence, velocity: cv._issArmVelocityState(),
        arm: cv._issArmState(), preview: cv._issArmPreviewState(), state: cv._issLightingState(), camera: cv._issCameraState(),
        width: cv.clientWidth, height: cv.clientHeight,
        group: { visible: visible(group), position: group.position.toArray(), quaternion: group.quaternion.toArray() },
        total: arrow('iss-arm-velocity-total'), shoulder: arrow('iss-arm-velocity-shoulder'), elbow: arrow('iss-arm-velocity-elbow'),
        addition: addition ? { visible: visible(addition), positions: Array.from(addition.geometry.attributes.position.array) } : null };
      return returned;
    };
    return renderer;
  }
  ObservedRenderer.prototype = Original.prototype; Object.setPrototypeOf(ObservedRenderer, Original); THREE.WebGLRenderer = ObservedRenderer;
}

function verify(snapshot) {
  const { velocity, arm, preview, draw } = snapshot, model = velocity.model;
  assert(draw?.total && draw.shoulder && draw.elbow && draw.addition, 'Rendered velocity arrows and addition guide exist');
  assert.equal(snapshot.glLost, false); assert.equal(velocity.visible, velocity.enabled && arm.enabled);
  assert.equal(draw.group.visible, velocity.visible); vectorNear(draw.group.position, arm.base); vectorNear(draw.group.quaternion, [0, 0, 0, 1]);
  assert.equal(velocity.source, preview.active ? 'preview' : 'live');
  const reference = preview.active ? preview.selected : arm.actual;
  for (const key of ['shoulder', 'elbow', 'shoulderRate', 'elbowRate']) near(model[key], reference[key], 1e-10);
  vectorNear(model.tip, tip(model.shoulder, model.elbow));
  const shoulder = difference(model, model.shoulderRate, 0), elbow = difference(model, 0, model.elbowRate);
  vectorNear(model.shoulderVelocity, shoulder, 2e-10); vectorNear(model.elbowVelocity, elbow, 2e-10);
  vectorNear(model.velocity, add(shoulder, elbow), 3e-10); near(model.speed, norm(model.velocity), 1e-12);
  for (const [name, vector] of [['total', model.velocity], ['shoulder', model.shoulderVelocity], ['elbow', model.elbowVelocity]]) {
    const arrow = draw[name], length = norm(vector) * velocity.scale;
    const expectedVisible = velocity.visible && (name === 'total' || velocity.components) && length > 1e-8;
    assert.equal(arrow.visible, expectedVisible, `${name} visibility follows physical speed and inspector settings`);
    if (length > 1e-8) {
      vectorNear(arrow.position, model.tip); near(arrow.length, length, 1e-7); vectorNear(arrow.direction, scaled(vector, 1 / norm(vector)));
      assert.equal(arrow.coneVisible, expectedVisible);
    }
  }
  assert.equal(draw.addition.visible, velocity.visible && velocity.components && norm(model.shoulderVelocity) * velocity.scale > 1e-8 && norm(model.elbowVelocity) * velocity.scale > 1e-8);
  assert.equal(draw.addition.positions.length, 12);
  [model.shoulderVelocity, model.velocity, model.elbowVelocity, model.velocity].forEach((vector, index) => {
    vectorNear(draw.addition.positions.slice(index * 3, index * 3 + 3), add(model.tip, scaled(vector, velocity.scale)), 2e-6);
  });
  assert.equal(snapshot.togglePressed, String(velocity.enabled)); assert.equal(snapshot.velocityHidden, !velocity.enabled);
  if (velocity.enabled) {
    near(snapshot.readings.total, model.speed); near(snapshot.readings.shoulder, norm(model.shoulderVelocity)); near(snapshot.readings.elbow, norm(model.elbowVelocity));
    assert(snapshot.source.length); assert(/future|preview/i.test(snapshot.source) === preview.active);
    assert.equal(Number(snapshot.scale), velocity.scale);
  }
  if (preview.active) {
    assert.equal(snapshot.chart.role, 'slider'); near(snapshot.chart.min, 0); near(snapshot.chart.max, 120); near(snapshot.chart.now, preview.seconds);
    assert.equal(snapshot.chart.points.length, 121);
    snapshot.chart.points.forEach(([x, y], index) => { near(x, 44 + index / 120 * 536, .002); near(y, 112 - preview.samples[index].speed / .14 * 92, .002); });
    near(snapshot.chart.cursor, 44 + preview.seconds / 120 * 536, .002);
    vectorNear(snapshot.chart.dot, [44 + preview.seconds / 120 * 536, 112 - preview.selected.speed / .14 * 92], .002);
    if (preview.visible) assert(!snapshot.chart.hidden);
  }
  return snapshot;
}

async function runWidth(browser, width) {
  const phone = width < 500, height = phone ? 844 : 1080, errors = [], result = { width, touch: phone, checks: {}, screenshots: [] };
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000); page.on('pageerror', error => errors.push(error.stack || error.message));
  const canvas = page.locator('.iss-station-stage canvas'), panel = page.locator('[data-iss-arm-velocity-panel]'), chart = page.locator('[data-iss-arm-speed-chart]');
  const activate = locator => phone ? locator.tap() : locator.click();
  const nativeScale = async value => {
    const index = [2, 5, 10].indexOf(Number(value)); assert(index >= 0);
    await page.locator('[data-iss-arm-velocity-scale]').focus();
    await page.keyboard.press('Home');
    for (let i = 0; i < index; i++) await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Tab');
  };
  const read = () => canvas.evaluate(cv => {
    const q = selector => document.querySelector(selector), gl = cv.getContext('webgl2') || cv.getContext('webgl'), svg = q('[data-iss-arm-speed-chart]');
    const points = (q('[data-iss-arm-speed-path]').getAttribute('points') || '').trim().split(/\s+/).filter(Boolean).map(pair => pair.split(',').map(Number));
    return { arm: cv._issArmState(), preview: cv._issArmPreviewState(), velocity: cv._issArmVelocityState(), state: cv._issLightingState(), camera: cv._issCameraState(),
      draw: window.__issArmVelocityQA.draw, glLost: gl?.isContextLost(), togglePressed: q('[data-iss-arm-velocity-toggle]').getAttribute('aria-pressed'),
      velocityHidden: q('[data-iss-arm-velocity-content]').hidden, scale: q('[data-iss-arm-velocity-scale]').value,
      readings: Object.fromEntries(['total', 'shoulder', 'elbow'].map(key => [key, Number(q('[data-iss-arm-velocity-reading="' + key + '"]').getAttribute('data-value'))])),
      source: q('[data-iss-arm-velocity-reading="source"]').textContent.trim(),
      chart: { hidden: !svg.getClientRects().length, role: svg.getAttribute('role'), min: Number(svg.getAttribute('aria-valuemin')), max: Number(svg.getAttribute('aria-valuemax')),
        now: Number(svg.getAttribute('aria-valuenow')), points, cursor: Number(q('[data-iss-arm-speed-cursor]').getAttribute('x1')),
        dot: ['cx', 'cy'].map(name => Number(q('[data-iss-arm-speed-dot]').getAttribute(name))) }, events: window.__issArmVelocityQA.events.slice(-150) };
  });
  const ready = async () => {
    await page.evaluate(() => new Promise(resolve => window.__issArmVelocityNativeRAF(() => window.__issArmVelocityNativeRAF(resolve))));
    await page.waitForFunction(() => {
      const cv = document.querySelector('.iss-station-stage canvas'), draw = window.__issArmVelocityQA?.draw;
      if (!cv?._issArmVelocityState || !draw) return false;
      const state = cv._issArmVelocityState(), camera = cv._issCameraState();
      return !camera.tweening && ['enabled', 'components', 'scale', 'visible', 'source', 'seconds'].every(key => state[key] === draw.velocity[key]) &&
        JSON.stringify(state.model) === JSON.stringify(draw.velocity.model) && JSON.stringify(cv._issArmState().actual) === JSON.stringify(draw.arm.actual) &&
        camera.position.every((value, index) => Math.abs(value - draw.camera.position[index]) < 1e-8) && draw.width === cv.clientWidth && draw.height === cv.clientHeight;
    }, undefined, { polling: 100 });
    return verify(await read());
  };
  const isolated = async (action, options) => { const before = await ready(); await action(); const after = await ready(); samePhysical(before, after, options); return after; };
  const chartCoordinates = async seconds => {
    await chart.scrollIntoViewIfNeeded();
    return chart.evaluate((svg, time) => { const p = svg.createSVGPoint(); p.x = 44 + time / 120 * 536; p.y = 66; const screen = p.matrixTransform(svg.getScreenCTM()); return { x: screen.x, y: screen.y }; }, seconds);
  };
  const screenshot = async (locator, label) => {
    await locator.scrollIntoViewIfNeeded(); await ready(); const filename = `map-arm-velocity-${label}-${width}.png`;
    await locator.screenshot({ path: path.join(output, filename), animations: 'disabled' }); result.screenshots.push(filename);
  };
  try {
    console.log(`Checking velocity vectors and interactive speed chart at ${width}px`);
    await page.addInitScript(() => {
      window.AlloPostFXEnabled = false; window.__issArmVelocityClock = 0; window.__issArmVelocityNativeRAF = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = callback => window.__issArmVelocityNativeRAF(() => callback(window.__issArmVelocityClock));
    });
    await page.route('**/vendor/three-r128/three.min.js', async route => {
      const response = await route.fetch(); assert(response.ok()); await route.fulfill({ response, body: (await response.text()) + '\n;(' + observeRenderer.toString() + ')();\n' });
    });
    await page.goto(`${base}/?tab=map`, { waitUntil: 'load' }); await panel.waitFor({ state: 'attached' });
    await page.evaluate(() => ['click', 'change', 'keydown', 'pointerdown', 'pointermove', 'pointerup'].forEach(type => document.addEventListener(type, event => {
      const node = event.target.closest('[data-iss-arm-velocity-toggle],[data-iss-arm-velocity-components],[data-iss-arm-velocity-scale],[data-iss-arm-velocity-frame],[data-iss-arm-speed-chart]');
      if (node) window.__issArmVelocityQA.events.push({ type, key: event.key, pointerType: event.pointerType, trusted: event.isTrusted,
        action: Array.from(node.attributes).find(attribute => /^data-iss-arm-(velocity|speed)/.test(attribute.name))?.name });
    }, true)));
    await ready(); await activate(page.locator('[data-iss-arm-toggle]')); await activate(page.locator('[data-iss-arm-preset="high"]'));
    await canvas.evaluate(cv => cv._issStepLighting(3)); let after = await ready(); assert(after.velocity.model.speed > 0);
    after = await isolated(() => activate(page.locator('[data-iss-arm-velocity-toggle]'))); assert(after.velocity.enabled); near(after.velocity.scale, 5);
    const originalPreview = after.preview;
    for (const value of ['10', '2', '5']) { after = await isolated(() => nativeScale(value)); near(after.velocity.scale, Number(value)); assert.deepEqual(after.preview, originalPreview); }
    const originalComponents = after.velocity.components;
    after = await isolated(() => activate(page.locator('[data-iss-arm-velocity-components]'))); assert.equal(after.velocity.components, !originalComponents);
    after = await isolated(() => activate(page.locator('[data-iss-arm-velocity-components]'))); assert.equal(after.velocity.components, originalComponents);
    after = await isolated(() => activate(page.locator('[data-iss-arm-velocity-frame]')), { camera: false }); assert.equal(after.camera.focusId, 'arm');
    result.checks.liveIndependentVelocityAndPureSettings = true;

    after = await isolated(() => activate(page.locator('[data-iss-arm-preview-toggle]')), { playing: false }); assert(after.preview.active); assert.equal(after.velocity.source, 'preview');
    after = await isolated(() => canvas.evaluate(cv => cv._issSeekArmPreview(17.375))); near(after.velocity.seconds, 17.375);
    assert.notDeepEqual(after.velocity.model.tip, after.arm.pose.tip);
    const originalFuture = after.preview;
    after = await isolated(() => nativeScale('10')); assert.deepEqual(after.preview, originalFuture);
    after = await isolated(() => nativeScale('5')); assert.deepEqual(after.preview, originalFuture);
    for (const [key, time] of [['Home', 0], ['ArrowRight', 1], ['Shift+ArrowRight', 1.25], ['PageUp', 11.25], ['PageDown', 1.25], ['End', 120]]) {
      after = await isolated(async () => { await chart.focus(); await page.keyboard.press(key); }); near(after.preview.seconds, time);
    }
    const pointerBefore = await ready();
    const from = await chartCoordinates(21.25), to = await chartCoordinates(39.5);
    if (phone) {
      const session = await page.context().newCDPSession(page);
      try {
        await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...from, id: 1 }] });
        after = await ready(); assert(after.velocity.chartDragging); near(after.preview.seconds, 21.25, .25);
        await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...to, id: 1 }] });
        after = await ready(); near(after.preview.seconds, 39.5, .25);
        await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } finally { await session.detach(); }
    } else {
      await page.mouse.move(from.x, from.y); await page.mouse.down(); after = await ready(); assert(after.velocity.chartDragging); near(after.preview.seconds, 21.25, .25);
      await page.mouse.move(to.x, to.y, { steps: 3 }); after = await ready(); near(after.preview.seconds, 39.5, .25); await page.mouse.up();
    }
    after = await ready(); assert(!after.velocity.chartDragging); assert(!after.preview.playing); samePhysical(pointerBefore, after);
    result.checks.futureOriginExactChartAndNativeInputs = true;

    after = await isolated(() => activate(page.locator('[data-iss-arm-preview-play]'))); assert(after.preview.playing);
    const playing = after; await page.evaluate(() => { window.__issArmVelocityClock += 1000; }); after = await ready(); samePhysical(playing, after); near(after.preview.seconds, playing.preview.seconds + 2.5);
    const pauseAt = await chartCoordinates(26.75); await page.mouse.move(pauseAt.x, pauseAt.y); await page.mouse.down(); after = await ready(); assert(!after.preview.playing && after.velocity.chartDragging);
    const dragTime = after.preview.seconds;
    await page.setViewportSize({ width: phone ? 430 : 900, height }); after = await ready(); assert(!after.velocity.chartDragging);
    await page.mouse.move(pauseAt.x + 30, pauseAt.y); await page.mouse.up(); after = await ready(); near(after.preview.seconds, dragTime);
    await page.setViewportSize({ width, height }); await ready();
    const beforeHide = await ready();
    after = await isolated(() => activate(page.locator('[data-iss-arm-toggle]'))); assert(!after.velocity.visible && after.preview.active); assert.equal(after.velocity.source, 'preview'); near(after.preview.seconds, beforeHide.preview.seconds);
    after = await isolated(() => activate(page.locator('[data-iss-arm-toggle]'))); assert(after.velocity.visible && after.preview.active);
    result.checks.previewPlaybackCaptureCancellationAndParentVisibility = true;

    await isolated(() => nativeScale('10'));
    await isolated(() => canvas.evaluate(cv => cv._issSeekArmPreview(2.375)));
    await screenshot(page.locator('.iss-station-stage'), 'future-stage'); await screenshot(panel, 'readings');
    await screenshot(page.locator('[data-iss-arm-preview-panel]'), 'speed-chart');
    after = await isolated(() => activate(page.locator('[data-iss-arm-preview-close]'))); assert.equal(after.velocity.source, 'live'); assert(!after.preview.active);
    const oldLive = after;
    await activate(page.locator('[data-iss-live-play]')); after = await ready(); assert(after.state.playing);
    await page.evaluate(() => { window.__issArmVelocityClock += 1000; }); after = await ready(); assert(after.arm.elapsed > oldLive.arm.elapsed); assert.notDeepEqual(after.velocity.model.tip, oldLive.velocity.model.tip);
    await canvas.evaluate(cv => cv._issSetLighting({ playing: false })); after = await ready();
    result.checks.closeRestoresLiveArrowsAndLiveClockUpdates = true;

    await activate(page.locator('[data-iss-arm-preview-toggle]')); await ready();
    const layout = await page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth,
      controls: Array.from(document.querySelectorAll('[data-iss-arm-velocity-panel] button,[data-iss-arm-velocity-panel] select,[data-iss-arm-speed-chart]'), node => {
        const box = node.getBoundingClientRect(); return { tag: node.tagName, left: box.left, right: box.right, width: box.width, height: box.height };
      }) }));
    assert(layout.width <= width + 1); for (const control of layout.controls) { assert(control.width > 0 && control.left >= -1 && control.right <= width + 1); if (phone) assert(control.height >= 44 - .1); }
    await page.addScriptTag({ path: path.join(ROOT, 'desktop/web-app/node_modules/axe-core/axe.min.js') });
    const accessibility = await page.evaluate(async () => {
      const checked = await axe.run({ include: ['[data-iss-arm-panel]'] }, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
      return { passes: checked.passes.length, violations: checked.violations.map(item => ({ id: item.id, targets: item.nodes.map(node => node.target) })) };
    });
    assert.deepEqual(accessibility.violations, []); result.checks.layout = layout; result.checks.accessibility = accessibility;
    after = await ready();
    for (const action of ['velocity-toggle', 'velocity-components', 'velocity-scale', 'velocity-frame', 'speed-chart']) assert(after.events.some(event => event.action === 'data-iss-arm-' + action && event.trusted), `Trusted ${action} interaction exercised`);
    assert(after.events.some(event => event.action === 'data-iss-arm-velocity-scale' && event.type === 'change' && event.trusted), 'Native keyboard scale change was trusted');
    assert(after.events.some(event => event.action === 'data-iss-arm-speed-chart' && event.type === 'pointerdown' && event.trusted && event.pointerType === (phone ? 'touch' : 'mouse')));
    result.errors = errors; result.hostErrors = await page.evaluate(() => window.__events?.errors || []); assert.deepEqual(errors, []); assert.deepEqual(result.hostErrors, []);
    result.passed = true; console.log(`Arm velocity vectors, speed chart, input, isolation and accessibility passed at ${width}px`); return result;
  } catch (error) {
    result.passed = false; result.failure = error.stack || error.message; result.errors = errors;
    result.lastSnapshot = await read().catch(() => null); error.qaResult = result; throw error;
  } finally {
    try {
      result.checks.cleanup = await page.evaluate(() => {
        document.querySelector('.iss-station-stage canvas')?._issSetLighting?.({ playing: false }); window.__destroy?.();
        return { contexts: window.__issArmVelocityQA?.contexts.length || 0, lost: (window.__issArmVelocityQA?.contexts || []).map(gl => gl.isContextLost()), canvases: document.querySelectorAll('.iss-station-stage canvas').length };
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
        const temporary = path.join(output, 'results.json.tmp'); await fs.writeFile(temporary, JSON.stringify({ base, results }, null, 2) + '\n'); await fs.rename(temporary, path.join(output, 'results.json'));
      }
    }
  } finally { await browser.close(); }
  if (failure) throw failure;
  console.log(`3D arm velocity checks passed: ${widths.join(', ')}px. Results: ${output}`);
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
