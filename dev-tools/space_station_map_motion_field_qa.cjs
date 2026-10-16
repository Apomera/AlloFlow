#!/usr/bin/env node
'use strict';

// Independent kinematics, actual WebGL buffers and trusted controls.
// Uses the existing preview; never launches a server or advances a real-time clock.
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
const output = path.resolve(ROOT, argument('--out', 'reports/space-station-enhancement-qa/map-motion-field-browser'));
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
const posed = (point, alpha, feather) => {
  const a = alpha * Math.PI / 180, f = feather * Math.PI / 180;
  const x = point[0] * Math.cos(f) - point[1] * Math.sin(f), y = point[0] * Math.sin(f) + point[1] * Math.cos(f);
  return [x, y * Math.cos(a) - point[2] * Math.sin(a), y * Math.sin(a) + point[2] * Math.cos(a)];
};
function differentiated(point, s, component) {
  const dt = .001, av = component === 'feather' ? 0 : s.actualAlphaRate, fv = component === 'rotation' ? 0 : s.actualFeatherRate;
  const before = posed(point, s.arrayAlpha - av * dt, s.arrayFeather - fv * dt);
  const after = posed(point, s.arrayAlpha + av * dt, s.arrayFeather + fv * dt);
  return after.map((value, i) => (value - before[i]) / (2 * dt));
}
function palette(ratio) {
  const stops = [[30, 41, 100], [40, 170, 172], [255, 224, 120]], value = Math.max(0, Math.min(1, ratio));
  const index = value <= .5 ? 0 : 1, fraction = value * 2 - index;
  return stops[index].map((start, axis) => (start + (stops[index + 1][axis] - start) * fraction) / 255);
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
}
function observeRenderer() {
  const Original = THREE.WebGLRenderer;
  window.__issFieldQA = { draw: null, sequence: 0, contexts: [], events: [] };
  function ObservedRenderer(options) {
    const renderer = new Original(options), render = renderer.render;
    window.__issFieldQA.contexts.push(renderer.getContext());
    renderer.render = function (scene, camera) {
      const returned = render.apply(this, arguments), cv = renderer.domElement;
      if (scene.name !== 'iss-station-inspection' || !cv._issMotionFieldState) return returned;
      const qa = window.__issFieldQA, field = scene.getObjectByName('iss-motion-field'), axis = scene.getObjectByName('iss-motion-field-axis');
      const wing = scene.getObjectByName('iss-array-wing-2');
      if (!field || !axis || !wing) return returned;
      const buffer = attribute => attribute ? Array.from({ length: attribute.count }, (_, i) => Array.from(attribute.array.slice(i * attribute.itemSize, (i + 1) * attribute.itemSize))) : [];
      const line = name => {
        const object = scene.getObjectByName(name);
        return object && { visible: object.visible, points: buffer(object.geometry?.attributes?.position),
          position: object.position.toArray(), quaternion: object.quaternion.toArray() };
      };
      qa.draw = { sequence: ++qa.sequence, state: cv._issLightingState(), field: cv._issMotionFieldState(), probe: cv._issMotionProbeState(), camera: cv._issCameraState(),
        canvas: { width: cv.clientWidth, height: cv.clientHeight },
        group: { visible: field.visible, position: field.position.toArray(), quaternion: field.quaternion.toArray() },
        axis: { visible: axis.visible, position: axis.position.toArray(), quaternion: axis.quaternion.toArray() },
        wing: { position: wing.position.toArray(), quaternion: wing.quaternion.toArray() },
        panels: [1, -1].map(side => {
          const object = scene.getObjectByName('iss-motion-field-panel-' + side), m = object?.material;
          return object && { side, visible: object.visible, points: buffer(object.geometry.attributes.position), colors: buffer(object.geometry.attributes.color),
            indices: Array.from(object.geometry.index?.array || []), position: object.position.toArray(), quaternion: object.quaternion.toArray(),
            material: { vertexColors: m.vertexColors, side: m.side, opacity: m.opacity, depthTest: m.depthTest, depthWrite: m.depthWrite, polygonOffset: m.polygonOffset, polygonOffsetFactor: m.polygonOffsetFactor, polygonOffsetUnits: m.polygonOffsetUnits, type: m.type }, renderOrder: object.renderOrder };
        }), line: line('iss-motion-field-axis-line'), radius: line('iss-motion-field-radius') };
      return returned;
    };
    return renderer;
  }
  ObservedRenderer.prototype = Original.prototype; Object.setPrototypeOf(ObservedRenderer, Original); THREE.WebGLRenderer = ObservedRenderer;
}

function verify(snapshot) {
  const s = snapshot.state, f = snapshot.field, p = snapshot.probe, d = snapshot.draw;
  assert(d?.group && d.axis && d.panels.every(Boolean), 'Actual WebGL contains both field meshes and axis');
  assert.equal(snapshot.glLost, false); assert.equal(f.available, s.motorEnabled && s.motorSmooth);
  assert.equal(f.visible, p.enabled && f.enabled && f.available); assert.equal(d.group.visible, f.visible);
  assert.equal(snapshot.togglePressed, String(f.enabled)); assert.equal(snapshot.axisPressed, String(f.showAxis));
  assert.equal(snapshot.lockPressed, String(f.locked)); assert.equal(snapshot.component, f.component);
  assert.equal(snapshot.contentHidden, !f.enabled);
  vectorNear(d.group.position, d.wing.position); vectorNear(d.group.quaternion, d.wing.quaternion);
  vectorNear(d.axis.position, d.wing.position); vectorNear(d.axis.quaternion, [0, 0, 0, 1]);
  assert.equal(d.axis.visible, f.axisVisible);
  if (!f.available) {
    assert(!f.visible && !f.axisVisible);
    for (const key of ['peak', 'ceiling', 'probe', 'omega', 'distance']) {
      assert.equal(snapshot.readings[key].value, null, `${key}: unavailable motion has no numeric reading`);
      assert(/—|–/.test(snapshot.readings[key].text), 'Unavailable motion is not displayed as zero');
    }
    assert(/smooth/i.test(snapshot.readings.status.text)); return snapshot;
  }
  near(f.alpha, s.arrayAlpha); near(f.feather, s.arrayFeather);
  near(f.alphaRate, s.actualAlphaRate); near(f.featherRate, s.actualFeatherRate);
  const a = s.arrayAlpha * Math.PI / 180, ar = s.actualAlphaRate * Math.PI / 180, fr = s.actualFeatherRate * Math.PI / 180;
  const omega = [f.component === 'feather' ? 0 : ar, f.component === 'rotation' ? 0 : -fr * Math.sin(a), f.component === 'rotation' ? 0 : fr * Math.cos(a)];
  vectorNear(f.omega, omega); near(f.angularSpeed, norm(omega));
  let maxAll = 0, peak = 0;
  for (const side of [1, -1]) for (const x of [-.45, .45]) for (const z of [.3, 3.7]) for (const component of ['total', 'rotation', 'feather']) {
    const speed = norm(differentiated([x, .02, side * z], s, component)); maxAll = Math.max(maxAll, speed);
    if (component === f.component) peak = Math.max(peak, speed);
  }
  near(f.maxAll, maxAll, 2e-8); near(f.peak, peak, 2e-8);
  if (f.locked) near(f.ceiling, f.lockedCeiling); else if (maxAll > 1e-10) near(f.ceiling, maxAll, 2e-8);
  assert(Number.isFinite(f.ceiling) && f.ceiling >= 0);
  assert.equal(f.saturated, f.peak > f.ceiling + 1e-10);
  for (const panel of f.panels) {
    const mesh = d.panels.find(value => value.side === panel.side); assert(mesh);
    assert.equal(panel.samples.length, 275); assert.equal(mesh.points.length, 275); assert.equal(mesh.colors.length, 275);
    assert.equal(mesh.indices.length, 10 * 24 * 6); assert(mesh.indices.every(index => index >= 0 && index < 275));
    vectorNear(mesh.position, [0, 0, 0]); vectorNear(mesh.quaternion, [0, 0, 0, 1]);
    assert.equal(mesh.material.type, 'MeshBasicMaterial'); assert(mesh.material.vertexColors && mesh.material.depthTest && !mesh.material.depthWrite);
    assert.equal(mesh.material.side, 2); assert(mesh.material.polygonOffset); near(mesh.material.polygonOffsetFactor, -2); near(mesh.material.polygonOffsetUnits, -2);
    near(mesh.material.opacity, .94); assert.equal(mesh.renderOrder, 27);
    panel.samples.forEach((sample, index) => {
      const chord = (index % 11) / 10, span = Math.floor(index / 11) / 24, local = [-.45 + .9 * chord, .02, panel.side * (.3 + 3.4 * span)];
      near(sample.chord, chord); near(sample.span, span); vectorNear(sample.localPoint, local); vectorNear(mesh.points[index], local, 2e-7);
      const speed = norm(differentiated(local, s, f.component)), ratio = f.ceiling > 0 ? Math.min(1, speed / f.ceiling) : 0;
      near(sample.speed, speed, 2e-8); near(sample.ratio, ratio, 2e-7);
      const srgb = palette(ratio), linear = srgb.map(value => value <= .04045 ? value / 12.92 : Math.pow((value + .055) / 1.055, 2.4));
      vectorNear(sample.color, srgb, 2e-6); vectorNear(mesh.colors[index], linear, 2e-6);
    });
  }
  near(f.probeSpeed, norm(differentiated(p.localPoint, s, f.component)), 2e-8);
  for (const [key, value] of [['peak', f.peak], ['ceiling', f.ceiling], ['probe', f.probeSpeed], ['omega', f.angularSpeed * 180 / Math.PI]]) near(Number(snapshot.readings[key].value), value);
  if (f.angularSpeed > 1e-10) {
    const axis = scale(omega, 1 / norm(omega)), position = posed(p.localPoint, s.arrayAlpha, s.arrayFeather), foot = scale(axis, dot(position, axis));
    const radius = position.map((value, i) => value - foot[i]);
    vectorNear(f.axis, axis); vectorNear(f.axisFoot, foot); near(f.axisDistance, norm(radius)); near(dot(radius, axis), 0);
    near(f.probeSpeed, f.angularSpeed * f.axisDistance); near(Number(snapshot.readings.distance.value), f.axisDistance);
    assert.equal(f.axisVisible, f.visible && f.showAxis);
    if (f.axisVisible) {
      assert(d.line?.visible && d.radius?.visible); assert.equal(d.line.points.length, 2); assert.equal(d.radius.points.length, 2);
      vectorNear(d.line.points[0], scale(axis, -4.2)); vectorNear(d.line.points[1], scale(axis, 4.2));
      vectorNear(d.radius.points[0], position); vectorNear(d.radius.points[1], foot);
    }
  } else {
    assert.equal(f.axis, null); assert(!f.axisVisible); near(f.probeSpeed, 0);
  }
  return snapshot;
}

async function runWidth(browser, width) {
  const phone = width < 500, height = phone ? 844 : 1080, errors = [], result = { width, touch: phone, checks: {}, screenshots: [] };
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000); page.on('pageerror', error => errors.push(error.stack || error.message));
  const canvas = page.locator('.iss-station-stage canvas'), stage = page.locator('.iss-station-stage'), panel = page.locator('[data-iss-motion-panel]');
  const toggle = page.locator('[data-iss-motion-field]'), lock = page.locator('[data-iss-motion-field-lock]'), axis = page.locator('[data-iss-motion-field-axis]');
  const activate = locator => phone ? locator.tap() : locator.click();
  const read = () => canvas.evaluate(cv => {
    const gl = cv.getContext('webgl2') || cv.getContext('webgl');
    return { state: cv._issLightingState(), field: cv._issMotionFieldState(), probe: cv._issMotionProbeState(), forecast: cv._issForecastState(), camera: cv._issCameraState(), draw: window.__issFieldQA.draw,
      glLost: gl ? gl.isContextLost() : null, togglePressed: document.querySelector('[data-iss-motion-field]').getAttribute('aria-pressed'),
      lockPressed: document.querySelector('[data-iss-motion-field-lock]').getAttribute('aria-pressed'), axisPressed: document.querySelector('[data-iss-motion-field-axis]').getAttribute('aria-pressed'),
      component: document.querySelector('[data-iss-motion-field-component]').value, contentHidden: document.querySelector('[data-iss-motion-field-content]').hidden,
      readings: Object.fromEntries(Array.from(document.querySelectorAll('[data-iss-field-reading]'), node => [node.dataset.issFieldReading, { value: node.getAttribute('data-value'), text: node.textContent.trim() }])),
      events: window.__issFieldQA.events.slice(-200) };
  });
  const ready = async () => {
    await page.evaluate(() => new Promise(resolve => window.__issFieldNativeRAF(() => window.__issFieldNativeRAF(resolve))));
    await page.waitForFunction(() => {
      const cv = document.querySelector('.iss-station-stage canvas'), d = window.__issFieldQA?.draw;
      if (!cv?._issMotionFieldState || !d) return false;
      const f = cv._issMotionFieldState(), p = cv._issMotionProbeState(), s = cv._issLightingState(), c = cv._issCameraState();
      return !c.tweening && ['enabled', 'component', 'locked', 'ceiling', 'showAxis', 'visible', 'axisVisible', 'probeSpeed'].every(k => d.field[k] === f[k]) &&
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
      const filename = `map-motion-field-${label}-${suffix}-${width}.png`, session = await page.context().newCDPSession(page);
      try {
        const shot = await session.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: true, clip: { ...last, scale: 1 } });
        await fs.writeFile(path.join(output, filename), Buffer.from(shot.data, 'base64')); result.screenshots.push(filename);
      } finally { await session.detach(); }
    }
    isolated(before, await ready());
  };
  try {
    console.log(`Checking actual array speed field at ${width}px`);
    await page.addInitScript(() => {
      window.AlloPostFXEnabled = false; window.__issFieldClock = 0;
      window.__issFieldNativeRAF = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = callback => window.__issFieldNativeRAF(() => callback(window.__issFieldClock));
    });
    await page.route('**/vendor/three-r128/three.min.js', async route => {
      const response = await route.fetch(); assert(response.ok());
      await route.fulfill({ response, body: (await response.text()) + '\n;(' + observeRenderer.toString() + ')();\n' });
    });
    await page.goto(`${base}/?tab=map`, { waitUntil: 'load' }); await panel.waitFor(); let after = await ready();
    assert(!after.field.enabled && !after.field.available && !after.field.visible);
    await page.evaluate(() => ['click', 'change', 'keydown'].forEach(type => document.addEventListener(type, event => {
      const node = event.target.closest('[data-iss-motion-field],[data-iss-motion-field-component],[data-iss-motion-field-lock],[data-iss-motion-field-axis]');
      if (node) window.__issFieldQA.events.push({ type, key: event.key, trusted: event.isTrusted,
        action: node.hasAttribute('data-iss-motion-field-component') ? 'component' : node.hasAttribute('data-iss-motion-field-lock') ? 'lock' : node.hasAttribute('data-iss-motion-field-axis') ? 'axis' : 'toggle' });
    }, true)));
    await activate(page.locator('[data-iss-motion-toggle]')); await ready();
    after = await inspection(() => activate(toggle)); assert(after.field.enabled && !after.field.available);
    await activate(page.locator('[data-iss-motion-enable]')); after = await ready(); assert(after.field.available && after.field.visible);
    near(after.field.peak, 0); assert(!after.field.axisVisible);
    result.checks.unavailableAndRest = true;
    await canvas.evaluate(cv => {
      cv._issSetLighting({ arrayAlpha: -120, arrayFeather: 45, motorRate: .2, motorAcceleration: .002 }); cv._issStepLighting(60);
      cv._issSetMotionProbe({ chord: .8, span: .6, side: 1 });
    }); after = await ready(); assert(after.field.peak > 0);
    const commonCeiling = after.field.ceiling;
    for (const component of ['rotation', 'feather', 'total']) {
      after = await inspection(() => select('[data-iss-motion-field-component]', component)); assert.equal(after.field.component, component); near(after.field.ceiling, commonCeiling);
    }
    after = await inspection(() => activate(axis)); assert(!after.field.axisVisible);
    after = await inspection(() => activate(axis)); assert(after.field.axisVisible);
    result.checks.independentFiniteDifferenceAndNativeControls = { samplesPerPanel: 275, halves: 2, components: 3, commonCeiling };
    const beforeProbe = after;
    await select('[data-iss-motion-scale]', 600); await select('[data-iss-motion-side]', -1);
    await page.locator('[data-iss-motion-chord]').focus(); await page.keyboard.press('Home');
    await activate(page.locator('[data-iss-motion-preset="tip"]')); after = await ready();
    samePhysics(beforeProbe, after); sameCamera(beforeProbe, after); assert.deepEqual(after.forecast, beforeProbe.forecast);
    near(after.field.ceiling, beforeProbe.field.ceiling); assert.deepEqual(after.field.panels, beforeProbe.field.panels);
    result.checks.probeAndArrowScaleDoNotChangeColorDomain = true;
    await activate(page.locator('[data-iss-camera-fit="motion"]')); await ready(); await capture('combined');

    await activate(page.locator('[data-iss-live-play]')); after = await ready(); assert(after.state.playing);
    after = await inspection(() => activate(toggle)); assert(!after.field.visible && after.state.playing);
    after = await inspection(() => activate(toggle)); assert(after.field.visible && after.state.playing);
    after = await inspection(() => select('[data-iss-motion-field-component]', 'rotation')); assert(after.state.playing);
    await activate(page.locator('[data-iss-live-play]')); await ready();
    await activate(page.locator('[data-iss-forecast-toggle]')); await ready();
    await canvas.evaluate(cv => { cv._issSeekForecastTime(173.2); cv._issPlayForecast(true); }); after = await ready(); assert(after.forecast.active && after.forecast.playing);
    after = await inspection(() => select('[data-iss-motion-field-component]', 'feather'));
    after = await inspection(() => activate(axis)); after = await inspection(() => activate(axis));
    after = await inspection(() => activate(lock)); assert(after.field.locked && after.forecast.playing);
    await canvas.evaluate(cv => cv._issPlayForecast(false)); await ready(); await activate(page.locator('[data-iss-forecast-close]')); await ready();
    result.checks.liveAndForecastInspectionIsolation = true;

    after = await inspection(() => select('[data-iss-motion-field-component]', 'total')); const locked = after.field.ceiling;
    await activate(page.locator('[data-iss-drive-brake]')); const beforeBrake = await ready();
    await activate(page.locator('[data-iss-step-second]')); after = await ready(); assert(after.state.motorBraking);
    near(after.field.ceiling, locked); assert(after.field.peak < beforeBrake.field.peak); assert(after.field.locked);
    await capture('locked-braking');
    await canvas.evaluate(cv => cv._issStepLighting(cv._issBrakingState().seconds)); after = await ready();
    near(after.field.peak, 0); near(after.field.ceiling, locked); assert(after.field.visible && !after.field.axisVisible);
    assert(after.field.panels.every(panel => panel.samples.every(sample => sample.ratio === 0)));
    result.checks.lockedDomainThroughBrakingAndRest = { ceiling: locked };
    await canvas.evaluate(cv => {
      const s = cv._issLightingState();
      cv._issSetLighting({ arrayAlpha: s.arrayAlpha + 110, arrayFeather: -60, motorRate: .8, motorAcceleration: .05 }); cv._issStepLighting(12);
    }); after = await ready(); near(after.field.ceiling, locked); assert(after.field.saturated);
    assert(after.field.panels.some(panel => panel.samples.some(sample => sample.ratio === 1)));
    result.checks.overrangeUsesClampedColors = true;
    after = await inspection(() => activate(lock)); assert(!after.field.locked && !after.field.saturated); near(after.field.ceiling, after.field.maxAll);

    const config = after.field; await activate(page.locator('[data-iss-drive-smooth]')); after = await ready(); assert(!after.field.available);
    for (const key of ['enabled', 'component', 'showAxis']) assert.equal(after.field[key], config[key]);
    await activate(page.locator('[data-iss-motion-enable]')); after = await ready(); assert(after.field.available && after.field.enabled);
    await canvas.evaluate(cv => { cv._issSetLighting({ arrayAlpha: -140, arrayFeather: 60, motorRate: .2, motorAcceleration: .002 }); cv._issStepLighting(60); });
    after = await ready(); assert(after.field.peak > 0); result.checks.modeLifecycle = true;

    const beforeResize = after; await page.setViewportSize({ width: phone ? 430 : 900, height }); after = await ready();
    samePhysics(beforeResize, after); assert.deepEqual(after.forecast, beforeResize.forecast); assert.deepEqual(after.field, beforeResize.field);
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
    after = await ready(); for (const action of ['toggle', 'component', 'lock', 'axis']) assert(after.events.some(event => event.action === action && event.trusted), `Trusted ${action} control was exercised`);
    result.errors = errors; result.hostErrors = await page.evaluate(() => window.__events?.errors || []);
    assert.deepEqual(errors, []); assert.deepEqual(result.hostErrors, []); result.passed = true;
    console.log(`Motion field geometry, kinematics, controls, locked scale and accessibility passed at ${width}px`); return result;
  } catch (error) {
    result.passed = false; result.failure = error.stack || error.message; result.errors = errors;
    result.lastSnapshot = await read().catch(() => null); error.qaResult = result; throw error;
  } finally {
    try {
      result.checks.cleanup = await page.evaluate(() => {
        document.querySelector('.iss-station-stage canvas')?._issSetLighting?.({ playing: false }); window.__destroy?.();
        return { contexts: window.__issFieldQA?.contexts.length || 0, lost: (window.__issFieldQA?.contexts || []).map(gl => gl.isContextLost()), canvases: document.querySelectorAll('.iss-station-stage canvas').length };
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
  console.log(`3D motion field checks passed: ${widths.join(', ')}px. Results: ${output}`);
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
