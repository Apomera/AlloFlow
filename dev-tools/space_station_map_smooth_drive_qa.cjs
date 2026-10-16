#!/usr/bin/env node
'use strict';

// Focused native-control and real-WebGL checks for accelerated array joints.
// Use the existing preview; this script never starts or replaces its server.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const argument = (name, fallback) => {
  const value = process.argv.slice(2).find(value => value.startsWith(name + '='));
  return value ? value.slice(name.length + 1) : fallback;
};
const base = argument('--base', 'http://127.0.0.1:4179').replace(/\/$/, '');
const output = path.resolve(ROOT, argument('--out', 'reports/space-station-enhancement-qa/map-smooth-drive-browser'));
const widths = argument('--widths', '1440,390').split(',').map(Number);
assert(widths.length && widths.every(width => Number.isInteger(width) && width >= 320));
const near = (actual, expected, tolerance = 1e-6) => {
  assert(Number.isFinite(actual) && Number.isFinite(expected), `Non-finite comparison: ${actual}, ${expected}`);
  assert(Math.abs(actual - expected) <= tolerance, `${actual} should equal ${expected} within ${tolerance}`);
};
const vectorNear = (actual, expected) => {
  assert(Array.isArray(actual) && actual.length === expected.length);
  actual.forEach((value, index) => near(value, expected[index]));
};
const wrap = angle => ((angle + 180) % 360 + 360) % 360 - 180;
const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);
const poseNormal = (alpha, feather) => {
  const a = alpha * Math.PI / 180, f = feather * Math.PI / 180;
  return [-Math.sin(f), Math.cos(a) * Math.cos(f), Math.sin(a) * Math.cos(f)];
};
const jointKeys = ['arrayAlpha', 'arrayFeather', 'actualAlphaRate', 'actualFeatherRate'];

function observeRenderer() {
  const Original = window.THREE.WebGLRenderer;
  window.__issSmoothQA = { contexts: [], sequence: 0, draw: null };
  function ObservedRenderer(options) {
    const renderer = new Original(options), render = renderer.render;
    window.__issSmoothQA.contexts.push(renderer.getContext());
    renderer.render = function (scene, camera) {
      const returned = render.apply(this, arguments);
      if (scene.name === 'iss-station-inspection' && renderer.domElement._issLightingState) {
        const wing = scene.getObjectByName('iss-array-wing-0'), ghost = scene.getObjectByName('iss-array-command');
        const quaternion = new window.THREE.Quaternion();
        wing?.getWorldQuaternion(quaternion);
        window.__issSmoothQA.draw = { sequence: ++window.__issSmoothQA.sequence, wingFound: !!wing,
          normal: new window.THREE.Vector3(0, 1, 0).applyQuaternion(quaternion).toArray(),
          ghostFound: !!ghost, ghostVisible: !!ghost?.visible, camera: camera.position.toArray(),
          state: renderer.domElement._issLightingState() };
      }
      return returned;
    };
    return renderer;
  }
  ObservedRenderer.prototype = Original.prototype; Object.setPrototypeOf(ObservedRenderer, Original);
  window.THREE.WebGLRenderer = ObservedRenderer;
}

function verify(snapshot, fixedCamera) {
  const s = snapshot.state, d = snapshot.draw;
  assert(d?.wingFound && d.ghostFound, 'Physical array and command outline exist in the rendered scene');
  assert.equal(s.playing, false); assert.equal(typeof s.motorSmooth, 'boolean');
  for (const key of [...jointKeys, 'motorAcceleration', 'motorRate', 'driveElapsed']) assert(Number.isFinite(s[key]), `${key} is finite`);
  assert(s.motorAcceleration > 0); assert(s.motorRate > 0); assert.equal(snapshot.glLost, false);
  const normal = poseNormal(s.arrayAlpha, s.arrayFeather), cosine = Math.max(-1, Math.min(1, dot(normal, s.sun)));
  vectorNear(d.normal, normal); vectorNear(s.wingNormal, normal);
  near(s.incidence, Math.max(0, cosine)); near(s.generation, s.eclipse ? 0 : Math.max(0, cosine));
  near(s.silhouette, Math.abs(cosine)); assert.equal(d.ghostVisible, s.commandVisible);
  for (const key of [...jointKeys, 'phase', 'beta', 'motorAcceleration', 'motorRate', 'driveElapsed']) near(d.state[key], s[key]);
  assert.equal(d.state.motorSmooth, s.motorSmooth); assert.equal(d.state.motorEnabled, s.motorEnabled);
  assert.equal(snapshot.smoothPressed, String(s.motorSmooth)); assert.equal(snapshot.smoothDisabled, !s.motorEnabled);
  assert.equal(snapshot.accelerationDisabled, !(s.motorEnabled && s.motorSmooth));
  assert.equal(snapshot.smoothVisible, s.motorEnabled && s.motorSmooth);
  near(snapshot.acceleration, s.motorAcceleration);
  if (s.motorEnabled && s.motorSmooth) {
    const scale = Math.max(s.motorRate, Math.abs(s.actualAlphaRate), Math.abs(s.actualFeatherRate), .001);
    for (const [joint, velocity] of [['alpha', s.actualAlphaRate], ['feather', s.actualFeatherRate]]) {
      near(snapshot.readings[joint + '-rate'], velocity);
      near(snapshot.readings[joint + '-stop'], velocity * velocity / (2 * s.motorAcceleration));
      const gauge = snapshot.gauges[joint], x = 120 + 104 * velocity / scale;
      assert(gauge, 'Each moving joint has a signed rate gauge');
      near(gauge.scale, scale); near(gauge.dot, x, 1e-4);
      near(gauge.x, Math.min(120, x), 1e-4); near(gauge.width, Math.abs(x - 120), 1e-4);
      assert(gauge.dot >= 16 - 1e-6 && gauge.dot <= 224 + 1e-6);
    }
  }
  if (fixedCamera) {
    for (const key of ['position', 'target', 'stationQuaternion']) vectorNear(snapshot.camera[key], fixedCamera[key]);
    near(snapshot.camera.distance, fixedCamera.distance);
    for (const key of ['focusId', 'view', 'guides']) assert.deepEqual(snapshot.camera[key], fixedCamera[key]);
  }
  vectorNear(d.camera, snapshot.camera.position);
  return snapshot;
}

async function runWidth(browser, width) {
  const phone = width < 500, errors = [], result = { width, touch: phone, checks: {}, screenshots: [] };
  const page = await browser.newPage({ viewport: { width, height: phone ? 844 : 1080 }, deviceScaleFactor: 1,
    isMobile: phone, hasTouch: phone, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000); page.on('pageerror', error => errors.push(error.stack || error.message));
  const canvas = page.locator('.iss-station-stage canvas'), stage = page.locator('.iss-station-stage');
  const panel = page.locator('[data-iss-drive-panel]'), motor = page.locator('[data-iss-drive-toggle]');
  const smooth = page.locator('[data-iss-drive-smooth]'), acceleration = page.locator('[data-iss-drive-acceleration]');
  const rate = page.locator('[data-iss-drive-rate]');
  const activate = async locator => { if (phone) await locator.tap(); else { await locator.focus(); await page.keyboard.press('Enter'); } };
  let fixedCamera;
  const read = () => canvas.evaluate(cv => {
    const smooth = document.querySelector('[data-iss-drive-smooth]'), acceleration = document.querySelector('[data-iss-drive-acceleration]');
    const panel = document.querySelector('[data-iss-drive-smooth-panel]'), gl = cv.getContext('webgl2') || cv.getContext('webgl');
    return { state: cv._issLightingState(), camera: cv._issCameraState(), draw: window.__issSmoothQA.draw,
      smoothPressed: smooth?.getAttribute('aria-pressed'), smoothDisabled: smooth?.disabled,
      acceleration: Number(acceleration?.value), accelerationDisabled: acceleration?.disabled,
      smoothVisible: !!panel && !panel.closest('[hidden]') && getComputedStyle(panel).display !== 'none' && panel.getBoundingClientRect().width > 0,
      readings: Object.fromEntries(['alpha-rate', 'feather-rate', 'alpha-stop', 'feather-stop'].map(key =>
        [key, Number(document.querySelector('[data-iss-drive-reading="' + key + '"]')?.getAttribute('data-value'))])),
      gauges: Object.fromEntries(['alpha', 'feather'].map(joint => {
        const svg = document.querySelector('[data-iss-drive-rate-gauge="' + joint + '"]');
        const bar = svg?.querySelector('[data-iss-drive-rate-bar]'), circle = svg?.querySelector('[data-iss-drive-rate-dot]');
        return [joint, svg && { scale: Number(svg.getAttribute('data-iss-drive-rate-scale')), x: Number(bar?.getAttribute('x')),
          width: Number(bar?.getAttribute('width')), dot: Number(circle?.getAttribute('cx')) }];
      })), glLost: gl ? gl.isContextLost() : null };
  });
  const settled = async sequence => {
    await page.waitForFunction(sequence => {
      const cv = document.querySelector('.iss-station-stage canvas'), d = window.__issSmoothQA?.draw;
      if (!cv?._issLightingState || !d || d.sequence <= sequence) return false;
      const s = cv._issLightingState();
      return !s.playing && ['motorEnabled', 'motorSmooth', 'tracking'].every(key => d.state[key] === s[key]) &&
        ['phase', 'beta', 'motorRate', 'motorAcceleration', 'arrayAlpha', 'arrayFeather', 'actualAlphaRate', 'actualFeatherRate',
          'commandAlpha', 'commandFeather', 'driveElapsed'].every(key => Math.abs(d.state[key] - s[key]) < 1e-7);
    }, sequence, { polling: 100 });
    return verify(await read(), fixedCamera);
  };
  const mutate = async action => {
    const before = await read(); await action(); const after = await settled(before.draw.sequence); return { before, after };
  };
  const preserved = ({ before, after }) => {
    for (const key of [...jointKeys, 'driveElapsed']) near(after.state[key], before.state[key]);
    return after;
  };
  const select = async (locator, value) => {
    const choice = await locator.locator('option').evaluateAll((nodes, value) => nodes.find(node => Number(node.value) === value)?.value, value);
    assert(choice != null, `Native control offers ${value}`);
    return preserved(await mutate(() => locator.selectOption(choice)));
  };
  const step = async (seconds, native = false) => {
    const change = await mutate(() => native ? activate(page.locator('[data-iss-drive-step]')) : canvas.evaluate((cv, seconds) => cv._issStepLighting(seconds), seconds));
    const a = change.before.state, b = change.after.state;
    near(b.driveElapsed - a.driveElapsed, seconds); near(wrap(b.phase - a.phase), seconds * 360 / a.periodSeconds);
    for (const key of ['actualAlphaRate', 'actualFeatherRate']) {
      assert(Math.abs(b[key] - a[key]) <= a.motorAcceleration * seconds + 1e-6, `${key} respects acceleration across the step`);
    }
    return change;
  };
  const capture = async label => {
    await page.evaluate(() => document.activeElement?.blur());
    for (const [locator, suffix] of [[stage, 'stage'], [panel, 'controls']]) {
      const filename = `map-smooth-drive-${label}-${suffix}-${width}.png`;
      await locator.screenshot({ path: path.join(output, filename), animations: 'disabled' }); result.screenshots.push(filename);
    }
  };
  try {
    console.log(`Checking accelerated array joints at ${width}px`);
    await page.addInitScript(() => { window.AlloPostFXEnabled = false; });
    await page.route('**/vendor/three-r128/three.min.js', async route => {
      const response = await route.fetch(); assert(response.ok());
      await route.fulfill({ response, body: (await response.text()) + '\n;(' + observeRenderer.toString() + ')();\n' });
    });
    await page.goto(`${base}/?tab=map`, { waitUntil: 'load' }); await panel.waitFor();
    const initial = await settled(0); fixedCamera = initial.camera;
    assert.equal(initial.state.motorEnabled, false); assert.equal(initial.state.motorSmooth, false);
    near(initial.state.motorAcceleration, .002); near(initial.state.actualAlphaRate, 0); near(initial.state.actualFeatherRate, 0);
    preserved(await mutate(() => activate(motor)));
    let change = await mutate(() => activate(smooth)), after = preserved(change);
    assert.equal(after.state.motorSmooth, true); assert.equal(after.smoothVisible, true);
    after = preserved(await mutate(() => activate(page.locator('[data-iss-array-preset="away"]'))));
    assert(after.state.driveError > 100); assert.equal(after.draw.ghostVisible, true);
    change = await step(60, true); after = change.after;
    for (const key of ['actualAlphaRate', 'actualFeatherRate']) assert(Math.abs(after.state[key]) > .01 && Math.abs(after.state[key]) <= .08 + 1e-6);
    const travel = Math.abs(wrap(after.state.arrayAlpha - change.before.state.arrayAlpha));
    assert(travel > .01 && travel < .08 * 60 - .01, 'Starting from rest produces less motion than an immediate full-speed drive');
    result.checks.nativeStartup = { before: change.before.state, after: after.state };
    await capture('moving');

    change = await mutate(() => activate(page.locator('[data-iss-array-preset="hold"]'))); after = preserved(change);
    near(after.state.commandAlpha, change.before.state.arrayAlpha); near(after.state.commandFeather, change.before.state.arrayFeather);
    change = await step(2); after = change.after;
    for (const key of ['actualAlphaRate', 'actualFeatherRate']) {
      assert(Math.sign(after.state[key]) === Math.sign(change.before.state[key]), 'Hold starts braking without reversing velocity instantly');
      assert(Math.abs(after.state[key]) < Math.abs(change.before.state[key]));
    }
    assert(after.state.driveError > .001, 'A joint moving when Hold is pressed needs stopping distance');
    result.checks.holdBrakes = { before: change.before.state, after: after.state };
    change = await mutate(async () => { await page.locator('[data-iss-orbit-phase]').focus(); await page.keyboard.press('End'); });
    after = preserved(change); assert(Math.abs(wrap(after.state.phase - change.before.state.phase)) > 1);
    change = await mutate(async () => { await page.locator('[data-iss-beta]').focus(); await page.keyboard.press('ArrowRight'); });
    after = preserved(change); near(after.state.beta, change.before.state.beta + 1);
    result.checks.seekPreservesMotion = after.state;

    await select(acceleration, .0005); after = await select(rate, .02);
    assert(Math.abs(after.state.actualAlphaRate) > after.state.motorRate, 'Lowering the speed cap preserves current velocity');
    change = await step(2); after = change.after;
    for (const key of ['actualAlphaRate', 'actualFeatherRate']) {
      assert(Math.abs(after.state[key]) < Math.abs(change.before.state[key]));
      assert(Math.abs(after.state[key]) > after.state.motorRate, 'A slower speed command is reached through braking');
    }
    result.checks.reducedCapBrakes = { before: change.before.state, after: after.state };
    await capture('braking');
    await select(acceleration, .008); after = await select(rate, .2);
    const reverse = { arrayAlpha: wrap(after.state.arrayAlpha - Math.sign(after.state.actualAlphaRate) * 45),
      arrayFeather: Math.max(-89, Math.min(89, after.state.arrayFeather - Math.sign(after.state.actualFeatherRate) * 30)) };
    change = await mutate(() => canvas.evaluate((cv, patch) => cv._issSetLighting(patch), reverse)); preserved(change);
    change = await step(2); after = change.after;
    for (const key of ['actualAlphaRate', 'actualFeatherRate']) assert.equal(Math.sign(after.state[key]), Math.sign(change.before.state[key]), 'Retargeting cannot instantaneously reverse a joint');
    result.checks.finiteReversal = { before: change.before.state, after: after.state };
    change = await step(60, true); after = change.after;
    for (const key of ['actualAlphaRate', 'actualFeatherRate']) {
      assert.equal(Math.sign(after.state[key]), -Math.sign(change.before.state[key]));
      assert(Math.abs(after.state[key]) <= .2 + 1e-6);
    }
    result.checks.completedReversal = { before: change.before.state, after: after.state };
    const paused = after.state; await page.waitForTimeout(200); after = verify(await read(), fixedCamera);
    for (const key of [...jointKeys, 'phase', 'driveElapsed']) near(after.state[key], paused[key]);

    await activate(page.locator('[data-iss-camera-view="overview"]'));
    after = verify(await read(), fixedCamera);
    const controls = await page.locator('[data-iss-drive-smooth],[data-iss-drive-acceleration]').evaluateAll(nodes => nodes.map(node => ({ tag: node.tagName, disabled: node.disabled })));
    assert.equal(controls.length, 2); assert(controls.every(control => !control.disabled), 'React rerenders preserve live native controls');
    change = await step(60, true); result.checks.rerender = { controls, state: change.after.state };
    const layout = await page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth,
      nodes: Array.from(document.querySelectorAll('[data-iss-drive-panel],[data-iss-drive-panel] button,[data-iss-drive-panel] select,[data-iss-drive-rate-gauge]'), node => {
        const b = node.getBoundingClientRect(); return { label: node.getAttribute('aria-label') || node.textContent.trim().slice(0, 50), left: b.left, right: b.right,
          width: b.width, height: b.height, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth };
      }) }));
    assert(layout.width <= width + 1);
    for (const node of layout.nodes.filter(node => node.width && node.height)) {
      assert(node.left >= -1 && node.right <= width + 1, `Control exceeds viewport: ${JSON.stringify(node)}`);
      assert(node.scrollWidth <= node.clientWidth + 1, `Control text overflows: ${JSON.stringify(node)}`);
    }
    await page.addScriptTag({ path: path.join(ROOT, 'desktop/web-app/node_modules/axe-core/axe.min.js') });
    const accessibility = await page.evaluate(async () => {
      const checked = await axe.run({ include: ['[data-iss-drive-panel]'] }, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
      return { passes: checked.passes.length, violations: checked.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) };
    });
    assert.deepEqual(accessibility.violations, []); result.checks.layout = layout; result.checks.accessibility = accessibility;
    change = await mutate(() => activate(smooth)); after = change.after;
    assert.equal(after.state.motorSmooth, false); near(after.state.actualAlphaRate, 0); near(after.state.actualFeatherRate, 0);
    near(after.state.arrayAlpha, change.before.state.arrayAlpha); near(after.state.arrayFeather, change.before.state.arrayFeather);
    result.checks.speedOnlyRestored = after.state;
    change = await mutate(() => activate(motor)); after = change.after;
    assert.equal(after.state.motorEnabled, false); near(after.state.arrayAlpha, after.state.commandAlpha); near(after.state.arrayFeather, after.state.commandFeather);
    near(after.state.actualAlphaRate, 0); near(after.state.actualFeatherRate, 0); near(after.state.driveError, 0);
    result.checks.instantRestored = after.state;
    result.errors = errors; result.hostErrors = await page.evaluate(() => window.__events?.errors || []);
    assert.deepEqual(errors, []); assert.deepEqual(result.hostErrors, []); result.passed = true;
    console.log(`Acceleration, braking, gauges, actual geometry and native controls passed at ${width}px`);
    return result;
  } catch (error) {
    result.passed = false; result.failure = error.stack || error.message; result.errors = errors;
    result.lastSnapshot = await read().catch(() => null);
    await panel.screenshot({ path: path.join(output, `map-smooth-drive-failure-${width}.png`) }).catch(() => {});
    error.qaResult = result; throw error;
  } finally {
    try {
      result.checks.cleanup = await page.evaluate(() => {
        document.querySelector('.iss-station-stage canvas')?._issSetLighting?.({ playing: false }); window.__destroy?.();
        return { contexts: window.__issSmoothQA?.contexts.length || 0, lost: (window.__issSmoothQA?.contexts || []).map(gl => gl.isContextLost()),
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
  console.log(`Smooth-drive browser checks passed: ${widths.join(', ')}px. Results: ${output}`);
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
