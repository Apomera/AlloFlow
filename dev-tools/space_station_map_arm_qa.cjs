#!/usr/bin/env node
'use strict';

// Real WebGL geometry and trusted controls, with a held animation clock so
// explicit simulation steps are deterministic. Uses the existing preview.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const argument = (name, fallback) => {
  const item = process.argv.slice(2).find(value => value.startsWith(name + '='));
  return item ? item.slice(name.length + 1) : fallback;
};
const base = argument('--base', 'http://127.0.0.1:4179').replace(/\/$/, '');
const output = path.resolve(ROOT, argument('--out', 'reports/space-station-enhancement-qa/map-arm-browser'));
const widths = argument('--widths', '1440,390').split(',').map(Number);
assert(widths.length && widths.every(width => Number.isInteger(width) && width >= 320));
const RAD = Math.PI / 180;
const near = (a, b, tolerance = 1e-7) => {
  assert(Number.isFinite(a) && Number.isFinite(b), `Finite values required: ${a}, ${b}`);
  assert(Math.abs(a - b) <= tolerance, `${a} should equal ${b} within ${tolerance}`);
};
const vectorNear = (a, b, tolerance = 1e-6) => {
  assert(Array.isArray(a) && Array.isArray(b) && a.length === b.length);
  a.forEach((value, i) => near(value, b[i], tolerance));
};
const norm = vector => Math.hypot(...vector);
const add = (a, b) => a.map((value, i) => value + b[i]);
const subtract = (a, b) => a.map((value, i) => value - b[i]);
const scale = (vector, factor) => vector.map(value => value * factor);
function fk(shoulder, elbow, lengths) {
  shoulder *= RAD; elbow *= RAD;
  const first = [-Math.sin(shoulder), Math.cos(shoulder), 0];
  const second = [-Math.sin(shoulder + elbow), Math.cos(shoulder + elbow), 0];
  const joint = scale(first, lengths[0]);
  return { joint, tip: add(joint, scale(second, lengths[1])), first, second };
}
function sameArrays(before, after, { clock = true } = {}) {
  for (const key of ['phase', 'beta', 'arrayAlpha', 'arrayFeather', 'actualAlphaRate', 'actualFeatherRate', 'driveElapsed', 'commandAlpha', 'commandFeather', 'motorRate', 'motorAcceleration', 'incidence', 'generation', 'rate']) near(after.state[key], before.state[key]);
  for (const key of ['tracking', 'motorEnabled', 'motorSmooth', 'motorBraking', 'eclipse']) assert.equal(after.state[key], before.state[key]);
  if (clock) assert.equal(after.state.playing, before.state.playing);
  vectorNear(after.state.sun, before.state.sun); vectorNear(after.state.wingNormal, before.state.wingNormal);
}
function sameCamera(before, after) {
  for (const key of ['position', 'target', 'stationQuaternion']) vectorNear(after.camera[key], before.camera[key]);
  for (const key of ['fit', 'focusId', 'view', 'guides', 'tweening']) assert.equal(after.camera[key], before.camera[key]);
  near(after.camera.distance, before.camera.distance);
}
function sameArmMotion(before, after) {
  for (const key of ['shoulder', 'elbow', 'shoulderRate', 'elbowRate']) near(after.arm.actual[key], before.arm.actual[key]);
  near(after.arm.elapsed, before.arm.elapsed); assert.deepEqual(after.arm.pose, before.arm.pose);
}
function isolated(before, after) {
  sameArrays(before, after); sameCamera(before, after); sameArmMotion(before, after);
  assert.deepEqual(after.forecast, before.forecast); assert.deepEqual(after.arm.target, before.arm.target);
}
function targetOnly(before, after) {
  sameArrays(before, after, { clock: false }); sameCamera(before, after); sameArmMotion(before, after);
  assert(!after.state.playing && !after.forecast.active);
}
function observeRenderer() {
  const Original = THREE.WebGLRenderer;
  window.__issArmQA = { draw: null, sequence: 0, contexts: [], events: [] };
  function ObservedRenderer(options) {
    const renderer = new Original(options), render = renderer.render;
    window.__issArmQA.contexts.push(renderer.getContext());
    renderer.render = function (scene, camera) {
      const returned = render.apply(this, arguments), cv = renderer.domElement;
      if (scene.name !== 'iss-station-inspection' || !cv._issArmState) return returned;
      const qa = window.__issArmQA, group = scene.getObjectByName('iss-arm-inspection'), upper = scene.getObjectByName('iss-arm-upper');
      if (!group || !upper) return returned;
      const effectiveVisible = object => { if (!object) return false; for (let node = object; node; node = node.parent) if (!node.visible) return false; return true; };
      const mesh = name => {
        const object = scene.getObjectByName(name); if (!object) return null;
        return { type: object.type, visible: effectiveVisible(object), position: object.position.toArray(), quaternion: object.quaternion.toArray(), scale: object.scale.toArray(),
          direction: new THREE.Vector3(0, 1, 0).applyQuaternion(object.quaternion).toArray(),
          positions: object.geometry?.attributes.position ? Array.from(object.geometry.attributes.position.array) : null,
          material: object.material && { transparent: object.material.transparent, opacity: object.material.opacity, depthTest: object.material.depthTest, depthWrite: object.material.depthWrite, renderOrder: object.renderOrder } };
      };
      const arm = cv._issArmState(), station = upper.parent;
      const projected = station.localToWorld(new THREE.Vector3().fromArray(arm.base).add(new THREE.Vector3().fromArray(arm.target.requested))).project(camera);
      qa.draw = { sequence: ++qa.sequence, arm, state: cv._issLightingState(), camera: cv._issCameraState(), canvas: { width: cv.clientWidth, height: cv.clientHeight },
        group: { visible: effectiveVisible(group), position: group.position.toArray(), quaternion: group.quaternion.toArray() },
        upper: mesh('iss-arm-upper'), fore: mesh('iss-arm-fore'), elbow: mesh('iss-arm-elbow'), hand: mesh('iss-arm-hand'),
        ghost: mesh('iss-arm-target-ghost'), outer: mesh('iss-arm-reach-outer'), inner: mesh('iss-arm-reach-inner'), attainable: mesh('iss-arm-reachable'),
        targetScreen: { x: (projected.x * .5 + .5) * cv.clientWidth, y: (-projected.y * .5 + .5) * cv.clientHeight } };
      return returned;
    };
    return renderer;
  }
  ObservedRenderer.prototype = Original.prototype; Object.setPrototypeOf(ObservedRenderer, Original); THREE.WebGLRenderer = ObservedRenderer;
}

function verify(snapshot) {
  const { arm, draw } = snapshot;
  assert(draw?.upper && draw.fore && draw.elbow && draw.hand && draw.ghost && draw.outer && draw.inner && draw.attainable, 'Actual WebGL arm and inspection geometry are present');
  assert.equal(snapshot.glLost, false); assert.equal(snapshot.togglePressed, String(arm.enabled));
  assert.equal(snapshot.guidesPressed, String(arm.guides)); assert.equal(snapshot.contentHidden, !arm.enabled);
  const lengths = arm.pose.lengths, actual = fk(arm.actual.shoulder, arm.actual.elbow, lengths), target = fk(arm.target.shoulder, arm.target.elbow, lengths);
  vectorNear(lengths, [1.4, 1.2]); vectorNear(arm.base, [1.251, .315, -1.6]);
  vectorNear(arm.pose.base, [0, 0, 0]); vectorNear(arm.pose.joint, actual.joint); vectorNear(arm.pose.tip, actual.tip);
  near(norm(actual.joint), lengths[0]); near(norm(subtract(actual.tip, actual.joint)), lengths[1]);
  vectorNear(target.tip, arm.target.attainable); near(arm.target.minReach, Math.abs(lengths[0] - lengths[1])); near(arm.target.maxReach, lengths[0] + lengths[1]);
  const requestedRadius = norm(arm.target.requested), attainedRadius = norm(arm.target.attainable);
  near(attainedRadius, Math.max(arm.target.minReach, Math.min(arm.target.maxReach, requestedRadius)));
  if (requestedRadius > 1e-9) vectorNear(scale(arm.target.attainable, 1 / attainedRadius), scale(arm.target.requested, 1 / requestedRadius));
  near(arm.target.error, norm(subtract(arm.target.requested, arm.target.attainable))); near(arm.tipError, norm(subtract(actual.tip, target.tip)));
  assert.equal(arm.target.reachable, requestedRadius >= arm.target.minReach - 1e-8 && requestedRadius <= arm.target.maxReach + 1e-8);
  assert(Math.abs(arm.actual.shoulderRate) <= 2 + 1e-10 && Math.abs(arm.actual.elbowRate) <= 2 + 1e-10);
  vectorNear(draw.upper.position, add(arm.base, scale(actual.joint, .5)));
  vectorNear(draw.fore.position, add(arm.base, scale(add(actual.joint, actual.tip), .5)));
  vectorNear(draw.elbow.position, add(arm.base, actual.joint)); vectorNear(draw.hand.position, add(arm.base, actual.tip));
  vectorNear(draw.upper.direction, actual.first); vectorNear(draw.fore.direction, actual.second); vectorNear(draw.hand.direction, actual.second);
  for (const mesh of [draw.upper, draw.fore, draw.elbow, draw.hand]) assert(mesh.visible, 'Physical arm remains visible when inspection guides are hidden');
  vectorNear(draw.group.position, arm.base); vectorNear(draw.group.quaternion, [0, 0, 0, 1]); assert.equal(draw.group.visible, arm.enabled);
  if (arm.enabled) {
    vectorNear(draw.ghost.positions.slice(0, 3), [0, 0, 0]); vectorNear(draw.ghost.positions.slice(3, 6), target.joint); vectorNear(draw.ghost.positions.slice(6, 9), target.tip);
    vectorNear(draw.attainable.position, target.tip);
    for (const [mesh, radius] of [[draw.outer, arm.target.maxReach], [draw.inner, arm.target.minReach]]) {
      assert.equal(mesh.visible, arm.guides);
      for (let i = 0; i < mesh.positions.length; i += 3) { near(Math.hypot(mesh.positions[i], mesh.positions[i + 1]), radius, 2e-6); near(mesh.positions[i + 2], 0, 1e-6); }
    }
  }
  if (arm.handle.visible) {
    near(arm.handle.x, draw.targetScreen.x, .02); near(arm.handle.y, draw.targetScreen.y, .02);
    assert(!snapshot.handle.hidden); near(snapshot.handle.center[0], arm.handle.x, .1); near(snapshot.handle.center[1], arm.handle.y, .1);
  } else assert(snapshot.handle.hidden);
  assert(snapshot.status.length > 0); return snapshot;
}

async function runWidth(browser, width) {
  const phone = width < 500, height = phone ? 844 : 1080, errors = [], result = { width, touch: phone, checks: {}, screenshots: [] };
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000); page.on('pageerror', error => errors.push(error.stack || error.message));
  const canvas = page.locator('.iss-station-stage canvas'), stage = page.locator('.iss-station-stage'), panel = page.locator('[data-iss-arm-panel]');
  const toggle = page.locator('[data-iss-arm-toggle]'), guides = page.locator('[data-iss-arm-guides]'), handle = page.locator('[data-iss-arm-handle]');
  const activate = locator => phone ? locator.tap() : locator.click();
  const read = () => canvas.evaluate(cv => {
    const gl = cv.getContext('webgl2') || cv.getContext('webgl'), handle = document.querySelector('[data-iss-arm-handle]'), box = handle.getBoundingClientRect(), cb = cv.getBoundingClientRect();
    return { state: cv._issLightingState(), arm: cv._issArmState(), forecast: cv._issForecastState(), camera: cv._issCameraState(), draw: window.__issArmQA.draw,
      glLost: gl ? gl.isContextLost() : null, togglePressed: document.querySelector('[data-iss-arm-toggle]').getAttribute('aria-pressed'),
      guidesPressed: document.querySelector('[data-iss-arm-guides]').getAttribute('aria-pressed'), contentHidden: document.querySelector('[data-iss-arm-content]').hidden,
      status: document.querySelector('[data-iss-arm-status]').textContent.trim(), handle: { hidden: handle.hidden, center: [box.left + box.width / 2 - cb.left, box.top + box.height / 2 - cb.top] }, events: window.__issArmQA.events.slice(-200) };
  });
  const ready = async () => {
    await page.evaluate(() => new Promise(resolve => window.__issArmNativeRAF(() => window.__issArmNativeRAF(resolve))));
    await page.waitForFunction(() => {
      const cv = document.querySelector('.iss-station-stage canvas'), draw = window.__issArmQA?.draw;
      if (!cv?._issArmState || !draw) return false;
      const arm = cv._issArmState(), state = cv._issLightingState(), camera = cv._issCameraState();
      return !camera.tweening && JSON.stringify(draw.arm) === JSON.stringify(arm) &&
        ['phase', 'arrayAlpha', 'arrayFeather', 'actualAlphaRate', 'actualFeatherRate'].every(k => Math.abs(draw.state[k] - state[k]) < 1e-8) &&
        camera.position.every((value, i) => Math.abs(value - draw.camera.position[i]) < 1e-8) && draw.canvas.width === cv.clientWidth && draw.canvas.height === cv.clientHeight;
    }, undefined, { polling: 100 });
    return verify(await read());
  };
  const inspect = async action => { const before = await ready(); await action(); const after = await ready(); isolated(before, after); return after; };
  const retarget = async action => { const before = await ready(); await action(); const after = await ready(); targetOnly(before, after); return after; };
  const capture = async label => {
    await page.evaluate(() => document.activeElement?.blur()); const before = await ready(); assert(!before.state.playing && !before.forecast.playing);
    for (const [locator, suffix] of [[stage, 'stage'], [panel, 'panel']]) {
      await locator.evaluate(node => node.scrollIntoView({ block: 'center', behavior: 'instant' }));
      let last = null, stable = 0;
      for (let i = 0; i < 12; i++) {
        const box = await locator.evaluate(node => { const b = node.getBoundingClientRect(); return { x: b.x + scrollX, y: b.y + scrollY, width: b.width, height: b.height }; });
        stable = last && Object.keys(box).every(key => Math.abs(box[key] - last[key]) < .25) ? stable + 1 : 0; last = box;
        if (stable >= 2) break; await page.waitForTimeout(150);
      }
      assert(stable >= 2 && last.width > 0 && last.height > 0);
      const sequence = await canvas.evaluate(cv => { const old = window.__issArmQA.draw.sequence; cv._issSetArm({}); return old; });
      await page.waitForFunction(old => window.__issArmQA.draw.sequence > old, sequence, { polling: 100 }); isolated(before, await ready());
      const filename = `map-arm-${label}-${suffix}-${width}.png`, session = await page.context().newCDPSession(page);
      try {
        const shot = await session.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: true, clip: { ...last, scale: 1 } });
        await fs.writeFile(path.join(output, filename), Buffer.from(shot.data, 'base64')); result.screenshots.push(filename);
      } finally { await session.detach(); }
    }
    isolated(before, await ready());
  };
  let touchSession;
  const startDrag = async () => {
    await handle.scrollIntoViewIfNeeded(); const before = await ready(); assert(before.arm.handle.interactive);
    const box = await handle.boundingBox(); assert(box);
    // Grab away from the center: down must retain the requested endpoint rather
    // than snapping the target under the finger.
    const point = { x: box.x + box.width / 2 + 7, y: box.y + box.height / 2 - 5 };
    if (phone) { touchSession ||= await page.context().newCDPSession(page); await touchSession.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...point, id: 1 }] }); }
    else { await page.mouse.move(point.x, point.y); await page.mouse.down(); }
    const after = await ready(); assert(after.arm.dragging); sameArmMotion(before, after); sameCamera(before, after);
    vectorNear(after.arm.target.requested, before.arm.target.requested); return { before, point };
  };
  const endDrag = async () => {
    if (phone) await touchSession.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); else await page.mouse.up();
    const after = await ready(); assert(!after.arm.dragging); return after;
  };
  try {
    console.log(`Checking interactive arm and actual WebGL geometry at ${width}px`);
    await page.addInitScript(() => {
      window.AlloPostFXEnabled = false; window.__issArmClock = 0; window.__issArmNativeRAF = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = callback => window.__issArmNativeRAF(() => callback(window.__issArmClock));
    });
    await page.route('**/vendor/three-r128/three.min.js', async route => {
      const response = await route.fetch(); assert(response.ok());
      await route.fulfill({ response, body: (await response.text()) + '\n;(' + observeRenderer.toString() + ')();\n' });
    });
    await page.goto(`${base}/?tab=map`, { waitUntil: 'load' }); await toggle.waitFor({ state: 'attached' }); let after = await ready();
    assert(!after.arm.enabled); near(after.arm.actual.shoulder, .7 / RAD); near(after.arm.actual.elbow, -1.9 / RAD); result.checks.initialPhysicalPose = true;
    await page.evaluate(() => ['click', 'input', 'change', 'keydown', 'pointerdown', 'pointermove'].forEach(type => document.addEventListener(type, event => {
      const node = event.target.closest('[data-iss-arm-toggle],[data-iss-arm-guides],[data-iss-arm-branch],[data-iss-arm-x],[data-iss-arm-y],[data-iss-arm-preset],[data-iss-arm-hold],[data-iss-arm-handle]');
      if (node) window.__issArmQA.events.push({ type, key: event.key, trusted: event.isTrusted, action: Array.from(node.attributes).find(attribute => attribute.name.startsWith('data-iss-arm-'))?.name });
    }, true)));
    after = await inspect(() => activate(toggle)); assert(after.arm.enabled);
    after = await inspect(() => activate(guides)); assert(!after.arm.guides);
    after = await inspect(() => activate(guides)); assert(after.arm.guides);
    await activate(page.locator('[data-iss-camera-fit="arm"]')); after = await ready(); assert.equal(after.camera.fit, 'arm');
    after = await retarget(() => activate(page.locator('[data-iss-arm-preset="high"]'))); assert(after.arm.target.reachable);
    await capture('target');
    const beforeStep = after; await activate(page.locator('[data-iss-step-second]')); after = await ready(); near(after.arm.elapsed, beforeStep.arm.elapsed + 1);
    for (const joint of ['shoulder', 'elbow']) {
      assert(Math.abs(after.arm.actual[joint + 'Rate'] - beforeStep.arm.actual[joint + 'Rate']) <= .5 + 1e-9);
      assert(Math.abs(after.arm.actual[joint] - beforeStep.arm.actual[joint]) <= 2 + 1e-9);
    }
    assert.notDeepEqual(after.arm.pose.tip, beforeStep.arm.pose.tip);
    const beforeRange = after;
    after = await retarget(async () => { await page.locator('[data-iss-arm-x]').focus(); await page.keyboard.press('End'); });
    near(after.arm.target.requested[0], 3.5); assert(!after.arm.target.reachable); assert(after.arm.target.error > 0);
    assert(/reach|outside|limit|clamp/i.test(after.status)); sameArmMotion(beforeRange, after);
    after = await retarget(() => activate(page.locator('[data-iss-arm-preset="wide"]'))); const firstBranch = after;
    after = await retarget(() => activate(page.locator('[data-iss-arm-branch]'))); vectorNear(after.arm.target.attainable, firstBranch.arm.target.attainable);
    assert.notEqual(Math.sign(after.arm.target.elbow), Math.sign(firstBranch.arm.target.elbow));
    after = await retarget(() => activate(page.locator('[data-iss-arm-preset="near"]'))); assert(after.arm.target.requested.every(Number.isFinite));
    after = await retarget(() => canvas.evaluate(cv => cv._issSetArm({ x: 0, y: 0 }))); assert(!after.arm.target.reachable); near(norm(after.arm.target.attainable), .2); assert(after.arm.target.attainable.every(Number.isFinite));
    result.checks.boundedServoRetargetBranchesAndReachability = true;
    after = await retarget(() => activate(page.locator('[data-iss-arm-preset="high"]')));
    await handle.focus(); after = await retarget(() => page.keyboard.press('Home')); vectorNear(after.arm.target.requested, [0, 2, 0]);
    after = await retarget(() => page.keyboard.press('ArrowRight')); near(after.arm.target.requested[0], .05);
    after = await retarget(() => page.keyboard.press('Shift+ArrowUp')); near(after.arm.target.requested[1], 2.25);
    const drag = await startDrag();
    if (phone) await touchSession.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: drag.point.x + 28, y: drag.point.y + 24, id: 1 }] });
    else await page.mouse.move(drag.point.x + 28, drag.point.y + 24, { steps: 3 });
    after = await ready(); assert.notDeepEqual(after.arm.target.requested, drag.before.arm.target.requested); sameArmMotion(drag.before, after); sameCamera(drag.before, after); sameArrays(drag.before, after, { clock: false });
    await endDrag();
    await startDrag(); await page.evaluate(() => scrollBy(0, 25)); after = await ready(); assert(!after.arm.dragging); await endDrag();
    await startDrag(); await page.keyboard.press('Tab'); after = await ready(); assert(!after.arm.dragging); await endDrag();
    if (phone) {
      const multi = await startDrag();
      await touchSession.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...multi.point, id: 1 }, { x: multi.point.x + 30, y: multi.point.y + 40, id: 2 }] });
      after = await ready(); assert(!after.arm.dragging); await endDrag();
    }
    await startDrag(); await page.setViewportSize({ width: width + 10, height }); after = await ready(); assert(!after.arm.dragging); await endDrag();
    await page.setViewportSize({ width, height }); await ready();
    await startDrag(); await canvas.evaluate(cv => cv._issFitCamera('station', true)); after = await ready(); assert(!after.arm.dragging); await endDrag();
    await activate(page.locator('[data-iss-camera-fit="arm"]')); await ready();
    result.checks.keyboardPointerNoSnapAndDragCancellation = true;
    await activate(page.locator('[data-iss-live-play]')); after = await ready(); assert(after.state.playing);
    after = await inspect(() => activate(toggle)); assert(!after.arm.enabled && after.state.playing);
    const beforeHiddenStep = after; await canvas.evaluate(cv => cv._issStepLighting(1)); after = await ready(); near(after.arm.elapsed, beforeHiddenStep.arm.elapsed + 1); assert.notDeepEqual(after.arm.pose.tip, beforeHiddenStep.arm.pose.tip);
    after = await inspect(() => activate(toggle)); assert(after.arm.enabled);
    await activate(page.locator('[data-iss-forecast-toggle]')); await canvas.evaluate(cv => { cv._issSeekForecastTime(17.25); cv._issPlayForecast(true); }); after = await ready();
    assert(after.forecast.active && after.forecast.playing); after = await inspect(() => activate(guides)); after = await inspect(() => activate(guides));
    const previewBeforeTarget = after; after = await retarget(() => activate(page.locator('[data-iss-arm-preset="high"]'))); assert(!after.forecast.active); sameArmMotion(previewBeforeTarget, after);
    await activate(page.locator('[data-iss-forecast-toggle]')); await canvas.evaluate(cv => cv._issSeekForecastTime(17.25)); const beforeApply = await ready();
    await activate(page.locator('[data-iss-forecast-apply]')); after = await ready(); assert(!after.forecast.active);
    near(after.arm.elapsed, beforeApply.arm.elapsed + 17.25);
    near(after.state.phase, beforeApply.forecast.selected.phase); near(after.state.arrayAlpha, beforeApply.forecast.selected.alpha); near(after.state.arrayFeather, beforeApply.forecast.selected.feather);
    assert.notDeepEqual(after.arm.pose.tip, beforeApply.arm.pose.tip); vectorNear(after.arm.target.requested, beforeApply.arm.target.requested);
    result.checks.overlayClockAndForecastIsolation = true;
    const beforeHold = after; after = await retarget(() => activate(page.locator('[data-iss-arm-hold]'))); vectorNear(after.arm.target.attainable, beforeHold.arm.pose.tip);
    sameArmMotion(beforeHold, after); await canvas.evaluate(cv => cv._issStepLighting(1)); after = await ready();
    for (const joint of ['shoulder', 'elbow']) assert(Math.abs(after.arm.actual[joint + 'Rate'] - beforeHold.arm.actual[joint + 'Rate']) <= .5 + 1e-9);
    after = await retarget(() => activate(page.locator('[data-iss-arm-preset="high"]'))); await canvas.evaluate(cv => cv._issStepLighting(20)); after = await ready(); await capture('moving');
    result.checks.holdPreservesMomentumAndSteps = true;
    const beforeResize = after; await page.setViewportSize({ width: phone ? 430 : 900, height }); after = await ready(); sameArrays(beforeResize, after); sameArmMotion(beforeResize, after); assert.deepEqual(after.forecast, beforeResize.forecast);
    await page.setViewportSize({ width, height }); await ready();
    const layout = await page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth,
      controls: Array.from(document.querySelectorAll('[data-iss-arm-panel],[data-iss-arm-panel] button,[data-iss-arm-panel] input'), node => {
        const box = node.getBoundingClientRect(); return { left: box.left, right: box.right, width: box.width, height: box.height, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth };
      }) }));
    assert(layout.width <= width + 1);
    for (const item of layout.controls.filter(item => item.width > 0)) { assert(item.left >= -1 && item.right <= width + 1); assert(item.scrollWidth <= item.clientWidth + 1); }
    await page.addScriptTag({ path: path.join(ROOT, 'desktop/web-app/node_modules/axe-core/axe.min.js') });
    const accessibility = await page.evaluate(async () => {
      const checked = await axe.run({ include: ['[data-iss-arm-panel]'] }, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
      return { passes: checked.passes.length, violations: checked.violations.map(v => ({ id: v.id, targets: v.nodes.map(node => node.target) })) };
    });
    assert.deepEqual(accessibility.violations, []); result.checks.layout = layout; result.checks.accessibility = accessibility;
    after = await ready();
    for (const action of ['toggle', 'guides', 'branch', 'x', 'preset', 'hold', 'handle']) assert(after.events.some(event => event.action === 'data-iss-arm-' + action && event.trusted), `Trusted ${action} interaction was exercised`);
    result.errors = errors; result.hostErrors = await page.evaluate(() => window.__events?.errors || []);
    assert.deepEqual(errors, []); assert.deepEqual(result.hostErrors, []); result.passed = true;
    console.log(`Arm geometry, bounded motion, controls, clock isolation and accessibility passed at ${width}px`); return result;
  } catch (error) {
    result.passed = false; result.failure = error.stack || error.message; result.errors = errors;
    result.lastSnapshot = await read().catch(() => null); error.qaResult = result; throw error;
  } finally {
    if (touchSession) await touchSession.detach().catch(() => {});
    try {
      result.checks.cleanup = await page.evaluate(() => {
        document.querySelector('.iss-station-stage canvas')?._issSetLighting?.({ playing: false }); window.__destroy?.();
        return { contexts: window.__issArmQA?.contexts.length || 0, lost: (window.__issArmQA?.contexts || []).map(gl => gl.isContextLost()), canvases: document.querySelectorAll('.iss-station-stage canvas').length };
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
  console.log(`3D robotic arm checks passed: ${widths.join(', ')}px. Results: ${output}`);
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
