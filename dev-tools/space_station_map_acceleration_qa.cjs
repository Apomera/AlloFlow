#!/usr/bin/env node
'use strict';

// Independent second derivatives, actual WebGL vectors and trusted controls.
// Uses the existing preview and holds RAF time while inspection controls run.
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
const output = path.resolve(ROOT, argument('--out', 'reports/space-station-enhancement-qa/map-acceleration-browser'));
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
const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
const scale = (v, n) => v.map(value => value * n);
const add = (a, b) => a.map((value, i) => value + b[i]);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const posed = (point, alpha, feather) => {
  const a = alpha * Math.PI / 180, f = feather * Math.PI / 180;
  const x = point[0] * Math.cos(f) - point[1] * Math.sin(f), y = point[0] * Math.sin(f) + point[1] * Math.cos(f);
  return [x, y * Math.cos(a) - point[2] * Math.sin(a), y * Math.sin(a) + point[2] * Math.cos(a)];
};
function differentiated(point, s, model) {
  const dt = .03, at = t => posed(point,
    s.arrayAlpha + s.actualAlphaRate * t + .5 * model.jointAlphaAcceleration * t * t,
    s.arrayFeather + s.actualFeatherRate * t + .5 * model.jointFeatherAcceleration * t * t);
  const before = at(-dt), current = at(0), after = at(dt);
  return {
    velocity: after.map((value, i) => (value - before[i]) / (2 * dt)),
    acceleration: after.map((value, i) => (value - 2 * current[i] + before[i]) / (dt * dt))
  };
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
  for (const key of ['enabled', 'components', 'handles', 'span', 'chord', 'side', 'requestedScale']) assert.equal(after.probe[key], before.probe[key]);
  assert.deepEqual(after.field, before.field);
}
function observeRenderer() {
  const Original = THREE.WebGLRenderer;
  window.__issAccelerationQA = { draw: null, sequence: 0, contexts: [], events: [] };
  function ObservedRenderer(options) {
    const renderer = new Original(options), render = renderer.render;
    window.__issAccelerationQA.contexts.push(renderer.getContext());
    renderer.render = function (scene, camera) {
      const returned = render.apply(this, arguments), cv = renderer.domElement;
      if (scene.name !== 'iss-station-inspection' || !cv._issMotionAccelerationState) return returned;
      const qa = window.__issAccelerationQA, group = scene.getObjectByName('iss-motion-acceleration');
      const wing = scene.getObjectByName('iss-array-wing-2'), marker = scene.getObjectByName('iss-motion-point');
      if (!group || !wing || !marker) return returned;
      const effectiveVisible = object => { for (let node = object; node; node = node.parent) if (!node.visible) return false; return !!object; };
      const localWorld = (point, object) => group.worldToLocal(object.localToWorld(point)).toArray();
      const material = object => object?.material && ({ transparent: object.material.transparent, opacity: object.material.opacity,
        depthTest: object.material.depthTest, depthWrite: object.material.depthWrite, toneMapped: object.material.toneMapped, renderOrder: object.renderOrder });
      const probe = cv._issMotionProbeState(), acceleration = cv._issMotionAccelerationState();
      const materialPoint = wing.localToWorld(new THREE.Vector3().fromArray(probe.localPoint));
      qa.draw = { sequence: ++qa.sequence, state: cv._issLightingState(), acceleration: cv._issMotionAccelerationState(), probe: cv._issMotionProbeState(), camera: cv._issCameraState(),
        canvas: { width: cv.clientWidth, height: cv.clientHeight },
        group: { visible: group.visible, effectiveVisible: effectiveVisible(group), position: group.position.toArray(), quaternion: group.quaternion.toArray(), pointWorld: group.localToWorld(new THREE.Vector3().fromArray(acceleration.position)).toArray() },
        wing: { position: wing.position.toArray(), quaternion: wing.quaternion.toArray(), pointWorld: materialPoint.toArray(), pointNDC: materialPoint.clone().project(camera).toArray() },
        marker: { visible: effectiveVisible(marker), position: marker.position.toArray(), world: marker.getWorldPosition(new THREE.Vector3()).toArray(), material: material(marker),
          backMaterial: material(marker.parent.children.find(object => object.isMesh && object.renderOrder === 32)) },
        fieldMaterial: material(scene.getObjectByName('iss-motion-field-panel-1')),
        surfaceVisible: effectiveVisible(scene.getObjectByName('iss-motion-surface-guide')),
        velocityArrows: ['total', 'rotation', 'feather'].map(name => ({ name, visible: effectiveVisible(scene.getObjectByName('iss-motion-' + name)) })),
        arrows: ['total', 'turning', 'changing'].map(name => {
          const arrow = scene.getObjectByName('iss-acceleration-' + name), shaft = scene.getObjectByName('iss-acceleration-' + name + '-shaft');
          return arrow && shaft && { name, visible: arrow.visible, effectiveVisible: effectiveVisible(arrow), position: arrow.position.toArray(),
            direction: new THREE.Vector3(0, 1, 0).applyQuaternion(arrow.quaternion).toArray(),
            tip: group.worldToLocal(arrow.cone.getWorldPosition(new THREE.Vector3())).toArray(),
            coneMaterial: material(arrow.cone), outlineShaftMaterial: material(scene.getObjectByName('iss-acceleration-' + name + '-outline-shaft')),
            outlineHeadMaterial: material(scene.getObjectByName('iss-acceleration-' + name + '-outline-head')),
            shaft: { type: shaft.type, visible: shaft.visible, scale: shaft.scale.toArray(),
              bottom: localWorld(new THREE.Vector3(0, -.5, 0), shaft), top: localWorld(new THREE.Vector3(0, .5, 0), shaft),
              material: material(shaft), depthTest: shaft.material.depthTest, depthWrite: shaft.material.depthWrite, toneMapped: shaft.material.toneMapped } };
        }) };
      return returned;
    };
    return renderer;
  }
  ObservedRenderer.prototype = Original.prototype; Object.setPrototypeOf(ObservedRenderer, Original); THREE.WebGLRenderer = ObservedRenderer;
}

function verify(snapshot) {
  const s = snapshot.state, a = snapshot.acceleration, p = snapshot.probe, d = snapshot.draw;
  assert(d?.group && d.marker && d.arrows.every(Boolean), 'Actual WebGL contains the acceleration group and all three mesh arrows');
  const solidOverlay = (material, renderOrder) => {
    assert(material, 'Solid overlay material exists'); assert(material.transparent, 'Solid overlay must render after the translucent speed field');
    near(material.opacity, 1); assert(!material.depthTest && !material.depthWrite && !material.toneMapped); assert.equal(material.renderOrder, renderOrder);
    assert(material.renderOrder > d.fieldMaterial.renderOrder);
  };
  assert(d.fieldMaterial?.transparent); assert.equal(d.fieldMaterial.renderOrder, 27);
  solidOverlay(d.marker.material, 33); solidOverlay(d.marker.backMaterial, 32);
  for (const arrow of d.arrows) {
    solidOverlay(arrow.shaft.material, 31); solidOverlay(arrow.coneMaterial, 31);
    solidOverlay(arrow.outlineShaftMaterial, 30); solidOverlay(arrow.outlineHeadMaterial, 30);
  }
  assert.equal(snapshot.glLost, false);
  assert.equal(a.available, s.motorEnabled && s.motorSmooth && !a.contact);
  assert.equal(a.visible, p.enabled && a.enabled && a.available); assert.equal(d.group.visible, a.visible);
  assert.equal(snapshot.togglePressed, String(a.enabled)); assert.equal(snapshot.componentsPressed, String(a.components));
  assert.equal(snapshot.velocityPressed, String(a.showVelocity)); assert.equal(snapshot.contentHidden, !a.enabled);
  near(snapshot.scaleValue, a.requestedScale);
  vectorNear(d.group.position, d.wing.position); vectorNear(d.group.quaternion, [0, 0, 0, 1]);
  vectorNear(d.marker.world, d.wing.pointWorld); vectorNear(d.group.pointWorld, d.wing.pointWorld);
  assert.equal(snapshot.handle.visible, p.handle.visible);
  if (p.handle.visible) {
    const x = (d.wing.pointNDC[0] + 1) * d.canvas.width / 2, y = (1 - d.wing.pointNDC[1]) * d.canvas.height / 2;
    near(p.handle.x, x, 1e-6); near(p.handle.y, y, 1e-6);
    near(snapshot.handle.x, x, .75); near(snapshot.handle.y, y, .75);
  }
  if (!a.available) {
    assert(!a.visible);
    for (const key of ['magnitude', 'turning', 'changing', 'speed-change', 'scale']) {
      assert.equal(snapshot.readings[key].value, null, `${key}: unavailable motion has no numeric reading`);
      assert(/—|–/.test(snapshot.readings[key].text), 'Unavailable acceleration is not displayed as zero');
    }
    return snapshot;
  }
  const position = posed(p.localPoint, s.arrayAlpha, s.arrayFeather), derivatives = differentiated(p.localPoint, s, a);
  const rad = Math.PI / 180, alpha = s.arrayAlpha * rad, ar = s.actualAlphaRate * rad, fr = s.actualFeatherRate * rad;
  const aa = a.jointAlphaAcceleration * rad, fa = a.jointFeatherAcceleration * rad;
  const omega = [ar, -fr * Math.sin(alpha), fr * Math.cos(alpha)];
  const angularAcceleration = [aa, -fa * Math.sin(alpha) - fr * ar * Math.cos(alpha), fa * Math.cos(alpha) - fr * ar * Math.sin(alpha)];
  const turning = cross(omega, cross(omega, position)), changing = cross(angularAcceleration, position);
  vectorNear(a.position, position); vectorNear(a.velocity, derivatives.velocity, 2e-8);
  vectorNear(a.acceleration, derivatives.acceleration, 3e-8);
  vectorNear(a.omega, omega, 1e-10); vectorNear(a.angularAcceleration, angularAcceleration, 1e-10);
  vectorNear(a.turning, turning, 1e-10); vectorNear(a.changing, changing, 1e-10);
  vectorNear(a.acceleration, add(turning, changing), 1e-10);
  near(a.magnitude, norm(a.acceleration), 1e-10); near(a.turningMagnitude, norm(turning), 1e-10); near(a.changingMagnitude, norm(changing), 1e-10);
  const largest = Math.max(a.magnitude, a.turningMagnitude, a.changingMagnitude);
  near(a.displayScale, largest > 0 ? Math.min(a.requestedScale, 2.4 / largest) : a.requestedScale);
  for (const [key, value] of [['magnitude', a.magnitude], ['turning', a.turningMagnitude], ['changing', a.changingMagnitude], ['scale', a.displayScale]]) near(Number(snapshot.readings[key].value), value);
  if (norm(a.velocity) > 1e-12) {
    const speedChange = dot(a.velocity, a.acceleration) / norm(a.velocity);
    near(a.speedChange, speedChange, 1e-9); near(Number(snapshot.readings['speed-change'].value), speedChange, 1e-9);
  } else {
    assert.equal(a.speedChange, null); assert.equal(snapshot.readings['speed-change'].value, null);
    assert(/—|–/.test(snapshot.readings['speed-change'].text));
  }
  if (a.visible) {
    assert(d.marker.visible && d.surfaceVisible, 'Acceleration inspection retains the draggable point and surface guide');
    vectorNear(d.marker.position, position);
    for (const arrow of d.arrows) {
      const value = arrow.name === 'total' ? a.acceleration : a[arrow.name], magnitude = norm(value), length = magnitude * a.displayScale;
      const endpoint = add(position, scale(value, a.displayScale)), shown = length > 1e-7 && (arrow.name === 'total' || a.components);
      vectorNear(a[arrow.name === 'total' ? 'accelerationEnd' : arrow.name + 'End'], endpoint);
      assert.equal(arrow.visible, shown, `${arrow.name} visibility follows actual acceleration`);
      if (shown) {
        vectorNear(arrow.position, position); vectorNear(arrow.direction, scale(value, 1 / magnitude)); vectorNear(arrow.tip, endpoint);
        assert(length <= 2.4 + 1e-7); assert.equal(arrow.shaft.type, 'Mesh'); assert(arrow.shaft.visible);
        assert(!arrow.shaft.depthTest && !arrow.shaft.depthWrite && !arrow.shaft.toneMapped);
        assert(arrow.shaft.scale[0] > 0 && arrow.shaft.scale[1] > 0 && arrow.shaft.scale[2] > 0);
        const shaftVector = arrow.shaft.top.map((v, i) => v - arrow.shaft.bottom[i]);
        vectorNear(scale(shaftVector, 1 / norm(shaftVector)), scale(value, 1 / magnitude));
        assert(norm(shaftVector) <= length + 1e-7);
      }
    }
    if (!a.showVelocity) assert(d.velocityArrows.every(arrow => !arrow.visible), 'Velocity arrows are suppressed to keep the acceleration view readable');
    else if (p.speed * p.displayScale > 1e-7) assert(d.velocityArrows.find(arrow => arrow.name === 'total').visible);
  }
  return snapshot;
}

async function runWidth(browser, width) {
  const phone = width < 500, height = phone ? 844 : 1080, errors = [], result = { width, touch: phone, checks: {}, screenshots: [] };
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000); page.on('pageerror', error => errors.push(error.stack || error.message));
  const canvas = page.locator('.iss-station-stage canvas'), stage = page.locator('.iss-station-stage'), panel = page.locator('[data-iss-acceleration-panel]');
  const toggle = page.locator('[data-iss-acceleration-toggle]'), components = page.locator('[data-iss-acceleration-components]'), velocity = page.locator('[data-iss-acceleration-velocity]');
  const activate = locator => phone ? locator.tap() : locator.click();
  const read = () => canvas.evaluate(cv => {
    const gl = cv.getContext('webgl2') || cv.getContext('webgl'), rect = cv.getBoundingClientRect();
    const handle = document.querySelector('[data-iss-motion-handle]'), b = handle.getBoundingClientRect();
    return { state: cv._issLightingState(), acceleration: cv._issMotionAccelerationState(), probe: cv._issMotionProbeState(), field: cv._issMotionFieldState(), forecast: cv._issForecastState(), camera: cv._issCameraState(), draw: window.__issAccelerationQA.draw,
      handle: { visible: !!b.width && !!b.height && getComputedStyle(handle).visibility !== 'hidden', x: (b.left + b.right) / 2 - rect.left, y: (b.top + b.bottom) / 2 - rect.top },
      glLost: gl ? gl.isContextLost() : null, togglePressed: document.querySelector('[data-iss-acceleration-toggle]').getAttribute('aria-pressed'),
      componentsPressed: document.querySelector('[data-iss-acceleration-components]').getAttribute('aria-pressed'), velocityPressed: document.querySelector('[data-iss-acceleration-velocity]').getAttribute('aria-pressed'),
      scaleValue: Number(document.querySelector('[data-iss-acceleration-scale]').value), contentHidden: document.querySelector('[data-iss-acceleration-content]').hidden,
      readings: Object.fromEntries(Array.from(document.querySelectorAll('[data-iss-acceleration-reading]'), node => [node.dataset.issAccelerationReading, { value: node.getAttribute('data-value'), text: node.textContent.trim() }])),
      events: window.__issAccelerationQA.events.slice(-200) };
  });
  const ready = async () => {
    await page.evaluate(() => new Promise(resolve => window.__issAccelerationNativeRAF(() => window.__issAccelerationNativeRAF(resolve))));
    await page.waitForFunction(() => {
      const cv = document.querySelector('.iss-station-stage canvas'), d = window.__issAccelerationQA?.draw;
      if (!cv?._issMotionAccelerationState || !d) return false;
      const a = cv._issMotionAccelerationState(), p = cv._issMotionProbeState(), s = cv._issLightingState(), c = cv._issCameraState();
      return !c.tweening && ['enabled', 'components', 'showVelocity', 'requestedScale', 'displayScale', 'visible', 'available', 'contact', 'magnitude'].every(k => d.acceleration[k] === a[k]) &&
        ['chord', 'span', 'side', 'requestedScale'].every(k => d.probe[k] === p[k]) &&
        ['phase', 'arrayAlpha', 'arrayFeather', 'actualAlphaRate', 'actualFeatherRate'].every(k => Math.abs(d.state[k] - s[k]) < 1e-8) &&
        c.position.every((v, i) => Math.abs(v - d.camera.position[i]) < 1e-8) && d.canvas.width === cv.clientWidth && d.canvas.height === cv.clientHeight;
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
        stable = last && Object.keys(box).every(k => Math.abs(box[k] - last[k]) < .25) ? stable + 1 : 0; last = box;
        if (stable >= 2) break; await page.waitForTimeout(150);
      }
      assert(stable >= 2 && last.width > 0 && last.height > 0);
      // A paused offscreen canvas can retain an earlier raster after scrolling.
      // Request an inspection-only repaint and wait for the observed real draw.
      const sequence = await canvas.evaluate(cv => { const old = window.__issAccelerationQA.draw.sequence; cv._issSetMotionAcceleration({}); return old; });
      await page.waitForFunction(old => window.__issAccelerationQA.draw.sequence > old, sequence, { polling: 100 });
      isolated(before, await ready());
      const filename = `map-acceleration-${label}-${suffix}-${width}.png`, session = await page.context().newCDPSession(page);
      try {
        const shot = await session.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: true, clip: { ...last, scale: 1 } });
        await fs.writeFile(path.join(output, filename), Buffer.from(shot.data, 'base64')); result.screenshots.push(filename);
      } finally { await session.detach(); }
    }
    isolated(before, await ready());
  };
  try {
    console.log(`Checking actual panel acceleration at ${width}px`);
    await page.addInitScript(() => {
      window.AlloPostFXEnabled = false; window.__issAccelerationClock = 0;
      window.__issAccelerationNativeRAF = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = callback => window.__issAccelerationNativeRAF(() => callback(window.__issAccelerationClock));
    });
    await page.route('**/vendor/three-r128/three.min.js', async route => {
      const response = await route.fetch(); assert(response.ok());
      await route.fulfill({ response, body: (await response.text()) + '\n;(' + observeRenderer.toString() + ')();\n' });
    });
    await page.goto(`${base}/?tab=map`, { waitUntil: 'load' }); await toggle.waitFor({ state: 'attached' }); let after = await ready();
    assert(!after.acceleration.enabled && !after.acceleration.available && !after.acceleration.visible);
    await page.evaluate(() => ['click', 'change', 'keydown'].forEach(type => document.addEventListener(type, event => {
      const node = event.target.closest('[data-iss-acceleration-toggle],[data-iss-acceleration-components],[data-iss-acceleration-velocity],[data-iss-acceleration-scale]');
      if (node) window.__issAccelerationQA.events.push({ type, key: event.key, trusted: event.isTrusted,
        action: node.hasAttribute('data-iss-acceleration-components') ? 'components' : node.hasAttribute('data-iss-acceleration-velocity') ? 'velocity' : node.hasAttribute('data-iss-acceleration-scale') ? 'scale' : 'toggle' });
    }, true)));
    await activate(page.locator('[data-iss-motion-toggle]')); await ready();
    after = await inspection(() => activate(toggle)); assert(after.acceleration.enabled && !after.acceleration.available);
    await activate(page.locator('[data-iss-motion-enable]')); after = await ready(); assert(after.acceleration.available && after.acceleration.visible);
    near(after.probe.speed, 0); assert.equal(after.acceleration.speedChange, null);
    await canvas.evaluate(cv => { const s = cv._issLightingState(); cv._issSetLighting({ arrayAlpha: s.arrayAlpha, arrayFeather: s.arrayFeather }); }); after = await ready();
    near(after.acceleration.magnitude, 0); assert(after.draw.arrows.every(arrow => !arrow.visible));
    result.checks.unavailableAndRest = true;
    await canvas.evaluate(cv => {
      cv._issSetLighting({ arrayAlpha: -120, arrayFeather: 45, motorRate: .2, motorAcceleration: .002 }); cv._issStepLighting(30);
      cv._issSetMotionProbe({ chord: .8, span: .6, side: 1 });
    }); after = await ready(); assert(after.acceleration.magnitude > 0 && after.acceleration.changingMagnitude > 0);
    assert(Math.abs(after.acceleration.jointAlphaAcceleration) > 0 || Math.abs(after.acceleration.jointFeatherAcceleration) > 0);
    after = await inspection(() => activate(components)); assert(!after.acceleration.components);
    after = await inspection(() => activate(components)); assert(after.acceleration.components);
    after = await inspection(() => activate(velocity)); assert(after.acceleration.showVelocity);
    after = await inspection(() => activate(velocity)); assert(!after.acceleration.showVelocity);
    const actualAcceleration = after.acceleration.acceleration.slice();
    for (const value of [1000, 50000, 10000]) {
      after = await inspection(() => select('[data-iss-acceleration-scale]', value)); near(after.acceleration.requestedScale, value); vectorNear(after.acceleration.acceleration, actualAcceleration);
    }
    result.checks.secondPositionDerivativesAndNativeControls = true;
    const beforeProbe = after;
    await select('[data-iss-motion-side]', -1); await page.locator('[data-iss-motion-chord]').focus(); await page.keyboard.press('Home');
    await activate(page.locator('[data-iss-motion-preset="tip"]')); after = await ready();
    samePhysics(beforeProbe, after); sameCamera(beforeProbe, after); assert.deepEqual(after.forecast, beforeProbe.forecast);
    assert.notDeepEqual(after.acceleration.position, beforeProbe.acceleration.position); assert.notDeepEqual(after.acceleration.acceleration, beforeProbe.acceleration.acceleration);
    result.checks.probeRecomputesActualAcceleration = true;
    await activate(page.locator('[data-iss-motion-field]')); after = await ready(); assert(after.field.visible && after.acceleration.visible);
    after = await inspection(() => select('[data-iss-acceleration-scale]', 50000)); assert(after.acceleration.displayScale <= after.acceleration.requestedScale);
    await activate(page.locator('[data-iss-camera-fit="motion"]')); await ready(); await capture('accelerating');

    await activate(page.locator('[data-iss-live-play]')); after = await ready(); assert(after.state.playing);
    after = await inspection(() => activate(toggle)); assert(!after.acceleration.visible && after.state.playing);
    after = await inspection(() => activate(toggle)); assert(after.acceleration.visible && after.state.playing);
    await activate(page.locator('[data-iss-live-play]')); await ready();
    await activate(page.locator('[data-iss-forecast-toggle]')); await ready();
    await canvas.evaluate(cv => { cv._issSeekForecastTime(173.2); cv._issPlayForecast(true); }); after = await ready(); assert(after.forecast.active && after.forecast.playing);
    after = await inspection(() => activate(components)); after = await inspection(() => activate(components));
    after = await inspection(() => activate(velocity)); after = await inspection(() => activate(velocity));
    await canvas.evaluate(cv => cv._issPlayForecast(false)); await ready(); await activate(page.locator('[data-iss-forecast-close]')); await ready();
    result.checks.liveForecastAndFieldIsolation = true;

    await activate(page.locator('[data-iss-drive-brake]')); const beforeBrake = await ready();
    assert(dot(beforeBrake.acceleration.velocity, beforeBrake.acceleration.acceleration) < 0, 'Braking acceleration reduces actual speed');
    await activate(page.locator('[data-iss-step-second]')); after = await ready(); assert(after.state.motorBraking);
    assert(after.probe.speed < beforeBrake.probe.speed); assert(dot(after.acceleration.velocity, after.acceleration.acceleration) < 0);
    await capture('braking');
    await canvas.evaluate(cv => cv._issStepLighting(cv._issBrakingState().seconds)); after = await ready();
    near(after.acceleration.magnitude, 0); assert(after.acceleration.visible && after.draw.arrows.every(arrow => !arrow.visible));
    result.checks.brakingAndRest = true;

    const config = after.acceleration; await activate(page.locator('[data-iss-drive-smooth]')); after = await ready(); assert(!after.acceleration.available);
    for (const key of ['enabled', 'components', 'showVelocity', 'requestedScale']) assert.equal(after.acceleration[key], config[key]);
    await activate(page.locator('[data-iss-motion-enable]')); after = await ready(); assert(after.acceleration.available && after.acceleration.enabled);
    await canvas.evaluate(cv => { cv._issSetLighting({ arrayAlpha: -140, arrayFeather: 60, motorRate: .2, motorAcceleration: .002 }); cv._issStepLighting(30); });
    after = await ready(); assert(after.acceleration.magnitude > 0); result.checks.modeLifecycle = true;

    const beforeResize = after; await page.setViewportSize({ width: phone ? 430 : 900, height }); after = await ready();
    samePhysics(beforeResize, after); assert.deepEqual(after.forecast, beforeResize.forecast); assert.deepEqual(after.acceleration, beforeResize.acceleration);
    await page.setViewportSize({ width, height }); await ready();
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
    after = await ready(); for (const action of ['toggle', 'components', 'velocity', 'scale']) assert(after.events.some(event => event.action === action && event.trusted), `Trusted ${action} control was exercised`);
    result.errors = errors; result.hostErrors = await page.evaluate(() => window.__events?.errors || []);
    assert.deepEqual(errors, []); assert.deepEqual(result.hostErrors, []); result.passed = true;
    console.log(`Acceleration geometry, kinematics, controls, braking and accessibility passed at ${width}px`); return result;
  } catch (error) {
    result.passed = false; result.failure = error.stack || error.message; result.errors = errors;
    result.lastSnapshot = await read().catch(() => null); error.qaResult = result; throw error;
  } finally {
    try {
      result.checks.cleanup = await page.evaluate(() => {
        document.querySelector('.iss-station-stage canvas')?._issSetLighting?.({ playing: false }); window.__destroy?.();
        return { contexts: window.__issAccelerationQA?.contexts.length || 0, lost: (window.__issAccelerationQA?.contexts || []).map(gl => gl.isContextLost()), canvases: document.querySelectorAll('.iss-station-stage canvas').length };
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
  console.log(`3D acceleration checks passed: ${widths.join(', ')}px. Results: ${output}`);
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
