#!/usr/bin/env node
'use strict';

// Independent position derivatives and inspection of the rendered curvature tube.
// Uses the existing local preview; never starts or changes the preview server.
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
const output = path.resolve(ROOT, argument('--out', 'reports/space-station-enhancement-qa/map-curvature-browser'));
const widths = argument('--widths', '1440,390').split(',').map(Number);
assert(widths.length && widths.every(width => Number.isInteger(width) && width >= 320));
const near = (a, b, tolerance = 1e-7) => {
  assert(Number.isFinite(a) && Number.isFinite(b), `Finite values required: ${a}, ${b}`);
  assert(Math.abs(a - b) <= tolerance, `${a} should equal ${b} within ${tolerance}`);
};
const vectorNear = (a, b, tolerance = 1e-6) => {
  assert(Array.isArray(a) && Array.isArray(b) && a.length === b.length);
  a.forEach((value, i) => near(value, b[i], tolerance));
};
const norm = vector => Math.hypot(...vector);
const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
const scale = (vector, factor) => vector.map(value => value * factor);
const add = (a, b) => a.map((value, i) => value + b[i]);
const subtract = (a, b) => a.map((value, i) => value - b[i]);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
function posed(point, alpha, feather) {
  const a = alpha * Math.PI / 180, f = feather * Math.PI / 180;
  const x = point[0] * Math.cos(f) - point[1] * Math.sin(f), y = point[0] * Math.sin(f) + point[1] * Math.cos(f);
  return [x, y * Math.cos(a) - point[2] * Math.sin(a), y * Math.sin(a) + point[2] * Math.cos(a)];
}
function differentiated(point, state, acceleration) {
  const dt = .03, at = t => posed(point,
    state.arrayAlpha + state.actualAlphaRate * t + .5 * acceleration.jointAlphaAcceleration * t * t,
    state.arrayFeather + state.actualFeatherRate * t + .5 * acceleration.jointFeatherAcceleration * t * t);
  const before = at(-dt), current = at(0), after = at(dt);
  return { position: current, velocity: after.map((value, i) => (value - before[i]) / (2 * dt)),
    acceleration: after.map((value, i) => (value - 2 * current[i] + before[i]) / (dt * dt)) };
}
function samePhysics(before, after) {
  for (const key of ['phase', 'beta', 'arrayAlpha', 'arrayFeather', 'actualAlphaRate', 'actualFeatherRate', 'driveElapsed', 'commandAlpha', 'commandFeather', 'motorRate', 'motorAcceleration', 'incidence', 'generation', 'rate']) near(after.state[key], before.state[key]);
  for (const key of ['tracking', 'playing', 'motorEnabled', 'motorSmooth', 'motorBraking', 'eclipse']) assert.equal(after.state[key], before.state[key]);
  vectorNear(after.state.sun, before.state.sun); vectorNear(after.state.wingNormal, before.state.wingNormal);
}
function sameCamera(before, after) {
  for (const key of ['position', 'target', 'stationQuaternion']) vectorNear(after.camera[key], before.camera[key]);
  for (const key of ['fit', 'focusId', 'view', 'guides', 'tweening']) assert.equal(after.camera[key], before.camera[key]);
  near(after.camera.distance, before.camera.distance);
}
function isolated(before, after) {
  samePhysics(before, after); sameCamera(before, after); assert.deepEqual(after.forecast, before.forecast);
  assert.deepEqual(after.acceleration, before.acceleration); assert.deepEqual(after.field, before.field);
  for (const key of ['enabled', 'components', 'handles', 'span', 'chord', 'side', 'requestedScale']) assert.equal(after.probe[key], before.probe[key]);
}
function observeRenderer() {
  const Original = THREE.WebGLRenderer;
  window.__issCurvatureQA = { draw: null, sequence: 0, contexts: [], events: [] };
  function ObservedRenderer(options) {
    const renderer = new Original(options), render = renderer.render;
    window.__issCurvatureQA.contexts.push(renderer.getContext());
    renderer.render = function (scene, camera) {
      const returned = render.apply(this, arguments), cv = renderer.domElement;
      if (scene.name !== 'iss-station-inspection' || !cv._issMotionCurvatureState) return returned;
      const qa = window.__issCurvatureQA, group = scene.getObjectByName('iss-motion-curvature'), wing = scene.getObjectByName('iss-array-wing-2');
      if (!group || !wing) return returned;
      const effectiveVisible = object => { if (!object) return false; for (let node = object; node; node = node.parent) if (!node.visible) return false; return true; };
      const material = object => object?.material && ({ transparent: object.material.transparent, opacity: object.material.opacity,
        depthTest: object.material.depthTest, depthWrite: object.material.depthWrite, toneMapped: object.material.toneMapped, renderOrder: object.renderOrder });
      const mesh = name => {
        const object = scene.getObjectByName(name); if (!object) return null;
        const geometry = object.geometry; return { type: object.type, visible: effectiveVisible(object), position: object.position.toArray(), quaternion: object.quaternion.toArray(), scale: object.scale.toArray(),
          positions: geometry?.attributes.position ? Array.from(geometry.attributes.position.array) : null, indices: geometry?.index ? Array.from(geometry.index.array) : null,
          sphere: geometry?.boundingSphere ? { center: geometry.boundingSphere.center.toArray(), radius: geometry.boundingSphere.radius } : null, material: material(object) };
      };
      const tangent = scene.getObjectByName('iss-curvature-tangent'), model = cv._issMotionCurvatureState(), probe = cv._issMotionProbeState();
      qa.draw = { sequence: ++qa.sequence, state: cv._issLightingState(), curvature: model, probe, camera: cv._issCameraState(), canvas: { width: cv.clientWidth, height: cv.clientHeight },
        group: { visible: group.visible, effectiveVisible: effectiveVisible(group), position: group.position.toArray(), quaternion: group.quaternion.toArray(),
          pointWorld: group.localToWorld(new THREE.Vector3().fromArray(model.position)).toArray() },
        wing: { position: wing.position.toArray(), pointWorld: wing.localToWorld(new THREE.Vector3().fromArray(probe.localPoint)).toArray() },
        arc: mesh('iss-curvature-arc'), outline: mesh('iss-curvature-outline'), radius: mesh('iss-curvature-radius'), center: mesh('iss-curvature-center'),
        tangent: tangent && { visible: effectiveVisible(tangent), position: tangent.position.toArray(), direction: new THREE.Vector3(0, 1, 0).applyQuaternion(tangent.quaternion).toArray(),
          tip: group.worldToLocal(tangent.cone.getWorldPosition(new THREE.Vector3())).toArray(), material: material(tangent.cone) }, fieldMaterial: material(scene.getObjectByName('iss-motion-field-panel-1')) };
      return returned;
    };
    return renderer;
  }
  ObservedRenderer.prototype = Original.prototype; Object.setPrototypeOf(ObservedRenderer, Original); THREE.WebGLRenderer = ObservedRenderer;
}

function verify(snapshot) {
  const state = snapshot.state, model = snapshot.curvature, acceleration = snapshot.acceleration, probe = snapshot.probe, draw = snapshot.draw;
  assert(draw?.group && draw.arc && draw.outline && draw.radius && draw.center && draw.tangent, 'Real WebGL has the curvature arc and guides');
  assert.equal(snapshot.glLost, false);
  assert.equal(model.available, state.motorEnabled && state.motorSmooth && !acceleration.contact);
  assert.equal(model.visible, probe.enabled && acceleration.enabled && model.enabled && model.available && model.drawable);
  assert.equal(draw.group.visible, model.visible); assert.equal(draw.group.effectiveVisible, model.visible);
  assert.equal(snapshot.togglePressed, String(model.enabled)); assert.equal(snapshot.guidesPressed, String(model.guides));
  assert.equal(snapshot.contentHidden, !model.enabled); near(snapshot.arcValue, model.arcDegrees);
  vectorNear(draw.group.position, draw.wing.position); vectorNear(draw.group.quaternion, [0, 0, 0, 1]);
  vectorNear(draw.group.pointWorld, draw.wing.pointWorld);
  for (const mesh of [draw.arc, draw.outline]) {
    assert.equal(mesh.type, 'Mesh'); vectorNear(mesh.position, [0, 0, 0]); vectorNear(mesh.quaternion, [0, 0, 0, 1]); vectorNear(mesh.scale, [1, 1, 1]);
    assert(mesh.material.transparent); near(mesh.material.opacity, 1);
    assert(!mesh.material.depthTest && !mesh.material.depthWrite && !mesh.material.toneMapped);
    assert(mesh.material.renderOrder > draw.fieldMaterial.renderOrder);
  }
  assert.equal(draw.outline.material.renderOrder, 29); assert.equal(draw.arc.material.renderOrder, 30);
  assert.equal(draw.radius.material.renderOrder, 28); assert.equal(draw.tangent.material.renderOrder, 31); assert.equal(draw.center.material.renderOrder, 32);
  assert.equal(model.guidesVisible, model.visible && model.guides);
  if (!model.available) {
    for (const key of ['radius', 'direction-rate', 'along', 'normal']) {
      assert.equal(snapshot.readings[key].value, null); assert(/—|–/.test(snapshot.readings[key].text));
    }
    return snapshot;
  }
  const finite = differentiated(probe.localPoint, state, acceleration);
  vectorNear(model.position, finite.position); vectorNear(model.velocity, finite.velocity, 2e-8); vectorNear(model.acceleration, finite.acceleration, 3e-8);
  near(model.speed, norm(model.velocity), 1e-12);
  if (!model.resolved) {
    assert(!model.drawable && !model.visible); assert.equal(snapshot.readings.radius.value, null);
    assert(/—|–/.test(snapshot.readings.radius.text)); return snapshot;
  }
  const speed = norm(finite.velocity), tangent = scale(finite.velocity, 1 / speed), along = dot(finite.acceleration, tangent);
  const normal = subtract(finite.acceleration, scale(tangent, along)), normalMagnitude = norm(normal), radius = speed * speed / normalMagnitude;
  vectorNear(model.tangent, tangent, 2e-6); near(model.speedChange, along, 3e-8);
  vectorNear(model.tangential, scale(tangent, along), 3e-8); vectorNear(model.normal, normal, 3e-8);
  near(model.normalMagnitude, normalMagnitude, 3e-8);
  vectorNear(model.normalDirection, scale(model.normal, 1 / model.normalMagnitude), 1e-8);
  vectorNear(model.binormal, cross(model.tangent, model.normalDirection), 1e-8);
  near(dot(model.tangent, model.normalDirection), 0, 1e-8); near(norm(model.binormal), 1, 1e-8);
  near(model.radius, radius, Math.max(3e-5, radius * .005));
  near(model.curvature * model.radius, 1, 1e-9);
  near(model.directionRate, model.normalMagnitude / model.speed, 1e-10);
  vectorNear(model.center, add(model.position, scale(model.normalDirection, model.radius)), 1e-9);
  near(Number(snapshot.readings.radius.value), model.radius); near(Number(snapshot.readings.along.value), model.speedChange);
  near(Number(snapshot.readings.normal.value), model.normalMagnitude);
  near(Number(snapshot.readings['direction-rate'].value), model.directionRate * 180 / Math.PI);
  if (!model.drawable) { assert(!model.visible); return snapshot; }
  assert.equal(model.points.length, 97);
  vectorNear(model.points[48], model.position, 1e-8);
  for (const point of model.points) {
    near(norm(subtract(point, model.center)), model.radius, 1e-7);
    near(dot(subtract(point, model.center), model.binormal), 0, 1e-7);
  }
  const expectedChord = 2 * model.radius * Math.sin(model.arcDegrees * Math.PI / 180 / 96 / 2);
  for (let i = 1; i < model.points.length; i++) near(norm(subtract(model.points[i], model.points[i - 1])), expectedChord, 1e-7);
  assert.equal(draw.arc.visible, model.visible); assert.equal(draw.outline.visible, model.visible);
  for (const object of [draw.radius, draw.center, draw.tangent]) assert.equal(object.visible, model.visible && model.guides);
  // Hidden overlays may retain their last rendered buffers; enabling the overlay
  // must refresh them before the next visible draw. The pure model stays current.
  if (!model.visible) return snapshot;
  for (const [mesh, factor] of [[draw.arc, 1], [draw.outline, 1.7]]) {
    assert.equal(mesh.positions.length, 97 * 7 * 3); assert.equal(mesh.indices.length, 96 * 6 * 6);
    assert(mesh.indices.every(index => Number.isInteger(index) && index >= 0 && index < 97 * 7));
    for (let row = 0; row < 97; row++) {
      let centroid = [0, 0, 0];
      for (let col = 0; col < 7; col++) {
        const vertex = mesh.positions.slice((row * 7 + col) * 3, (row * 7 + col) * 3 + 3);
        near(norm(subtract(vertex, model.points[row])), Math.min(.018, model.radius * .04) * factor, 4e-6);
        assert(norm(subtract(vertex, model.center)) <= model.radius + Math.min(.018, model.radius * .04) * factor + 1e-5, 'Every tube vertex stays inside its true-size analytic sphere');
        if (col < 6) centroid = add(centroid, scale(vertex, 1 / 6));
      }
      vectorNear(centroid, model.points[row], 4e-6);
      vectorNear(mesh.positions.slice(row * 21, row * 21 + 3), mesh.positions.slice(row * 21 + 18, row * 21 + 21), 1e-6);
    }
  }
  if (model.visible && model.guides) {
    vectorNear(draw.radius.positions.slice(0, 3), model.position, 1e-6); vectorNear(draw.radius.positions.slice(3, 6), model.center, 1e-6);
    vectorNear(draw.center.position, model.center); vectorNear(draw.tangent.position, model.position); vectorNear(draw.tangent.direction, model.tangent);
    vectorNear(draw.tangent.tip, add(model.position, model.tangent));
  }
  return snapshot;
}

async function runWidth(browser, width) {
  const phone = width < 500, height = phone ? 844 : 1080, errors = [], result = { width, touch: phone, checks: {}, screenshots: [] };
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000); page.on('pageerror', error => errors.push(error.stack || error.message));
  const canvas = page.locator('.iss-station-stage canvas'), stage = page.locator('.iss-station-stage'), panel = page.locator('[data-iss-curvature-panel]');
  const toggle = page.locator('[data-iss-curvature-toggle]'), guides = page.locator('[data-iss-curvature-guides]');
  const activate = locator => phone ? locator.tap() : locator.click();
  const read = () => canvas.evaluate(cv => {
    const gl = cv.getContext('webgl2') || cv.getContext('webgl');
    return { state: cv._issLightingState(), curvature: cv._issMotionCurvatureState(), acceleration: cv._issMotionAccelerationState(), probe: cv._issMotionProbeState(), field: cv._issMotionFieldState(), forecast: cv._issForecastState(), camera: cv._issCameraState(), draw: window.__issCurvatureQA.draw,
      glLost: gl ? gl.isContextLost() : null, togglePressed: document.querySelector('[data-iss-curvature-toggle]').getAttribute('aria-pressed'),
      guidesPressed: document.querySelector('[data-iss-curvature-guides]').getAttribute('aria-pressed'), arcValue: Number(document.querySelector('[data-iss-curvature-arc]').value), contentHidden: document.querySelector('[data-iss-curvature-content]').hidden,
      readings: Object.fromEntries(Array.from(document.querySelectorAll('[data-iss-curvature-reading]'), node => [node.dataset.issCurvatureReading, { value: node.getAttribute('data-value'), text: node.textContent.trim() }])), events: window.__issCurvatureQA.events.slice(-200) };
  });
  const ready = async () => {
    await page.evaluate(() => new Promise(resolve => window.__issCurvatureNativeRAF(() => window.__issCurvatureNativeRAF(resolve))));
    await page.waitForFunction(() => {
      const cv = document.querySelector('.iss-station-stage canvas'), draw = window.__issCurvatureQA?.draw;
      if (!cv?._issMotionCurvatureState || !draw) return false;
      const model = cv._issMotionCurvatureState(), probe = cv._issMotionProbeState(), state = cv._issLightingState(), camera = cv._issCameraState();
      return !camera.tweening && JSON.stringify(draw.curvature) === JSON.stringify(model) &&
        ['chord', 'span', 'side'].every(k => draw.probe[k] === probe[k]) &&
        ['phase', 'arrayAlpha', 'arrayFeather', 'actualAlphaRate', 'actualFeatherRate'].every(k => Math.abs(draw.state[k] - state[k]) < 1e-8) &&
        camera.position.every((value, i) => Math.abs(value - draw.camera.position[i]) < 1e-8) && draw.canvas.width === cv.clientWidth && draw.canvas.height === cv.clientHeight;
    }, undefined, { polling: 100 });
    return verify(await read());
  };
  const select = async (selector, value) => {
    const control = page.locator(selector), index = await control.locator('option').evaluateAll((nodes, value) => nodes.findIndex(node => node.value === value), String(value));
    assert(index >= 0); await control.focus(); await page.keyboard.press('Home');
    for (let i = 0; i < index; i++) await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
  };
  const inspection = async action => { const before = await ready(); await action(); const after = await ready(); isolated(before, after); return after; };
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
      const sequence = await canvas.evaluate(cv => { const old = window.__issCurvatureQA.draw.sequence; cv._issSetMotionCurvature({}); return old; });
      await page.waitForFunction(old => window.__issCurvatureQA.draw.sequence > old, sequence, { polling: 100 }); isolated(before, await ready());
      const filename = `map-curvature-${label}-${suffix}-${width}.png`, session = await page.context().newCDPSession(page);
      try {
        const shot = await session.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: true, clip: { ...last, scale: 1 } });
        await fs.writeFile(path.join(output, filename), Buffer.from(shot.data, 'base64')); result.screenshots.push(filename);
      } finally { await session.detach(); }
    }
    isolated(before, await ready());
  };
  try {
    console.log(`Checking actual panel path curvature at ${width}px`);
    await page.addInitScript(() => {
      window.AlloPostFXEnabled = false; window.__issCurvatureClock = 0; window.__issCurvatureNativeRAF = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = callback => window.__issCurvatureNativeRAF(() => callback(window.__issCurvatureClock));
    });
    await page.route('**/vendor/three-r128/three.min.js', async route => {
      const response = await route.fetch(); assert(response.ok());
      await route.fulfill({ response, body: (await response.text()) + '\n;(' + observeRenderer.toString() + ')();\n' });
    });
    await page.goto(`${base}/?tab=map`, { waitUntil: 'load' }); await toggle.waitFor({ state: 'attached' }); let after = await ready();
    assert(!after.curvature.enabled && !after.curvature.available && !after.curvature.visible);
    await page.evaluate(() => ['click', 'change', 'keydown'].forEach(type => document.addEventListener(type, event => {
      const node = event.target.closest('[data-iss-curvature-toggle],[data-iss-curvature-guides],[data-iss-curvature-arc]');
      if (node) window.__issCurvatureQA.events.push({ type, key: event.key, trusted: event.isTrusted,
        action: node.hasAttribute('data-iss-curvature-guides') ? 'guides' : node.hasAttribute('data-iss-curvature-arc') ? 'arc' : 'toggle' });
    }, true)));
    await activate(page.locator('[data-iss-motion-toggle]')); await ready();
    await activate(page.locator('[data-iss-acceleration-toggle]')); await ready();
    after = await inspection(() => activate(toggle)); assert(after.curvature.enabled && !after.curvature.available);
    await activate(page.locator('[data-iss-motion-enable]')); after = await ready(); assert(after.curvature.available && !after.curvature.visible);
    await canvas.evaluate(cv => { const state = cv._issLightingState(); cv._issSetLighting({ arrayAlpha: state.arrayAlpha, arrayFeather: state.arrayFeather }); });
    after = await ready(); assert(!after.curvature.resolved); near(after.curvature.speed, 0); result.checks.unavailableAndRest = true;
    await canvas.evaluate(cv => {
      cv._issSetLighting({ arrayAlpha: -120, arrayFeather: 45, motorRate: .2, motorAcceleration: .002 }); cv._issStepLighting(30);
      cv._issSetMotionProbe({ chord: .8, span: .6, side: 1 });
    }); after = await ready(); assert(after.curvature.visible && after.curvature.radius > .005);
    after = await inspection(() => activate(guides)); assert(!after.curvature.guides);
    after = await inspection(() => activate(guides)); assert(after.curvature.guides);
    const shape = { radius: after.curvature.radius, center: after.curvature.center };
    for (const arc of [30, 90, 180, 360, 90]) {
      after = await inspection(() => select('[data-iss-curvature-arc]', arc)); near(after.curvature.arcDegrees, arc);
      near(after.curvature.radius, shape.radius); vectorNear(after.curvature.center, shape.center);
    }
    result.checks.positionDerivativesCircleTubeAndNativeControls = true;
    const beforeProbe = after;
    await select('[data-iss-motion-side]', -1); await page.locator('[data-iss-motion-chord]').focus(); await page.keyboard.press('Home');
    await activate(page.locator('[data-iss-motion-preset="tip"]')); after = await ready();
    samePhysics(beforeProbe, after); sameCamera(beforeProbe, after); assert.deepEqual(after.forecast, beforeProbe.forecast);
    assert.notDeepEqual(after.curvature.position, beforeProbe.curvature.position);
    await activate(page.locator('[data-iss-camera-fit="motion"]')); after = await ready();
    await page.locator('[data-iss-motion-handle]').focus(); await page.keyboard.press('Home'); after = await ready(); near(after.probe.chord, .5); near(after.probe.span, .5);
    const beforeKey = after; await page.keyboard.press('ArrowRight'); after = await ready(); near(after.probe.chord, .51);
    samePhysics(beforeKey, after); sameCamera(beforeKey, after); assert.deepEqual(after.forecast, beforeKey.forecast);
    assert.notDeepEqual(after.curvature.position, beforeKey.curvature.position); result.checks.probeKeyboardRecomputesCurvature = true;
    const beforeTarget = after;
    await canvas.evaluate(cv => { const state = cv._issLightingState(); cv._issSetLighting({ arrayAlpha: state.arrayAlpha + 60 }); }); after = await ready();
    assert(!after.state.playing); vectorNear(after.curvature.position, beforeTarget.curvature.position); vectorNear(after.curvature.velocity, beforeTarget.curvature.velocity);
    assert.notDeepEqual(after.curvature.acceleration, beforeTarget.curvature.acceleration); assert.notDeepEqual(after.curvature.center, beforeTarget.curvature.center);
    result.checks.pausedTargetRecomputesCurve = true;
    await activate(page.locator('[data-iss-motion-field]')); after = await ready(); assert(after.field.visible && after.curvature.visible);
    await capture('changing');
    const stored = after.curvature;
    await activate(page.locator('[data-iss-acceleration-toggle]')); after = await ready(); assert(!after.curvature.visible && after.curvature.enabled);
    const hiddenBefore = after;
    await canvas.evaluate(cv => cv._issSetMotionProbe({ span: .73, chord: .23 })); after = await ready();
    assert(!after.curvature.visible && after.curvature.enabled); assert.notDeepEqual(after.curvature.position, hiddenBefore.curvature.position);
    samePhysics(hiddenBefore, after); sameCamera(hiddenBefore, after); assert.deepEqual(after.forecast, hiddenBefore.forecast);
    const hiddenEdited = after;
    await activate(page.locator('[data-iss-acceleration-toggle]')); after = await ready(); assert(after.curvature.visible);
    vectorNear(after.curvature.position, hiddenEdited.curvature.position); vectorNear(after.curvature.center, hiddenEdited.curvature.center);
    samePhysics(hiddenEdited, after); sameCamera(hiddenEdited, after); assert.deepEqual(after.forecast, hiddenEdited.forecast);
    // ready() checks the visible tube against the edited model, proving the stale
    // hidden mesh was refreshed when its parent inspection mode became visible.
    await canvas.evaluate((cv, probe) => cv._issSetMotionProbe({ span: probe.span, chord: probe.chord, side: probe.side }), hiddenBefore.probe);
    after = await ready(); vectorNear(after.curvature.position, hiddenBefore.curvature.position);
    result.checks.hiddenProbeEditRefreshesOnReenable = true;
    await activate(page.locator('[data-iss-motion-toggle]')); after = await ready(); assert(!after.curvature.visible && after.curvature.enabled);
    await activate(page.locator('[data-iss-motion-toggle]')); after = await ready(); assert(after.curvature.visible); near(after.curvature.arcDegrees, stored.arcDegrees);
    result.checks.parentVisibility = true;
    await activate(page.locator('[data-iss-live-play]')); after = await ready(); assert(after.state.playing);
    after = await inspection(() => activate(toggle)); assert(!after.curvature.visible && after.state.playing);
    after = await inspection(() => activate(toggle)); assert(after.curvature.visible && after.state.playing);
    await activate(page.locator('[data-iss-live-play]')); await ready();
    await activate(page.locator('[data-iss-forecast-toggle]')); await canvas.evaluate(cv => { cv._issSeekForecastTime(173.2); cv._issPlayForecast(true); }); after = await ready(); assert(after.forecast.active && after.forecast.playing);
    after = await inspection(() => activate(guides)); after = await inspection(() => activate(guides));
    after = await inspection(() => select('[data-iss-curvature-arc]', 180));
    await canvas.evaluate(cv => cv._issPlayForecast(false)); await ready(); await activate(page.locator('[data-iss-forecast-close]')); await ready();
    result.checks.liveForecastAndFieldIsolation = true;
    await activate(page.locator('[data-iss-drive-brake]')); const beforeBrake = await ready(); assert(beforeBrake.curvature.speedChange < 0);
    await activate(page.locator('[data-iss-step-second]')); after = await ready(); assert(after.curvature.speed < beforeBrake.curvature.speed && after.curvature.speedChange < 0);
    await capture('braking');
    await canvas.evaluate(cv => cv._issStepLighting(cv._issBrakingState().seconds)); after = await ready(); assert(!after.curvature.resolved && !after.curvature.visible);
    near(after.curvature.speed, 0); result.checks.brakingAndRest = true;
    await activate(page.locator('[data-iss-drive-smooth]')); after = await ready(); assert(!after.curvature.available && after.curvature.enabled);
    await activate(page.locator('[data-iss-motion-enable]')); after = await ready(); assert(after.curvature.available && after.curvature.enabled);
    await canvas.evaluate(cv => { cv._issSetLighting({ arrayAlpha: -140, arrayFeather: 60, motorRate: .2, motorAcceleration: .002 }); cv._issStepLighting(30); });
    after = await ready(); assert(after.curvature.visible); result.checks.modeLifecycle = true;
    const beforeResize = after; await page.setViewportSize({ width: phone ? 430 : 900, height }); after = await ready();
    samePhysics(beforeResize, after); assert.deepEqual(after.forecast, beforeResize.forecast); assert.deepEqual(after.curvature, beforeResize.curvature);
    await page.setViewportSize({ width, height }); await ready();
    const layout = await page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth,
      controls: Array.from(document.querySelectorAll('[data-iss-curvature-panel],[data-iss-curvature-panel] button,[data-iss-curvature-panel] select'), node => {
        const box = node.getBoundingClientRect(); return { left: box.left, right: box.right, width: box.width, height: box.height, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth };
      }) }));
    assert(layout.width <= width + 1);
    for (const item of layout.controls.filter(item => item.width > 0)) { assert(item.left >= -1 && item.right <= width + 1); assert(item.scrollWidth <= item.clientWidth + 1); }
    await page.addScriptTag({ path: path.join(ROOT, 'desktop/web-app/node_modules/axe-core/axe.min.js') });
    const accessibility = await page.evaluate(async () => {
      const checked = await axe.run({ include: ['[data-iss-curvature-panel]'] }, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
      return { passes: checked.passes.length, violations: checked.violations.map(v => ({ id: v.id, targets: v.nodes.map(node => node.target) })) };
    });
    assert.deepEqual(accessibility.violations, []); result.checks.layout = layout; result.checks.accessibility = accessibility;
    after = await ready(); for (const action of ['toggle', 'guides', 'arc']) assert(after.events.some(event => event.action === action && event.trusted), `Trusted ${action} interaction was exercised`);
    result.errors = errors; result.hostErrors = await page.evaluate(() => window.__events?.errors || []);
    assert.deepEqual(errors, []); assert.deepEqual(result.hostErrors, []); result.passed = true;
    console.log(`Curvature derivatives, actual tube, controls, braking and accessibility passed at ${width}px`); return result;
  } catch (error) {
    result.passed = false; result.failure = error.stack || error.message; result.errors = errors;
    result.lastSnapshot = await read().catch(() => null); error.qaResult = result; throw error;
  } finally {
    try {
      result.checks.cleanup = await page.evaluate(() => {
        document.querySelector('.iss-station-stage canvas')?._issSetLighting?.({ playing: false }); window.__destroy?.();
        return { contexts: window.__issCurvatureQA?.contexts.length || 0, lost: (window.__issCurvatureQA?.contexts || []).map(gl => gl.isContextLost()), canvases: document.querySelectorAll('.iss-station-stage canvas').length };
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
  console.log(`3D curvature checks passed: ${widths.join(', ')}px. Results: ${output}`);
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
