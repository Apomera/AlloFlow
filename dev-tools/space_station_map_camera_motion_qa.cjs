#!/usr/bin/env node
'use strict';

// Separate normal-motion smoke; uses an already running working-tree preview.
//   node dev-tools/space_station_map_camera_motion_qa.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const argument = (name, fallback) => {
  const value = process.argv.slice(2).find(arg => arg.startsWith(name + '='));
  return value ? value.slice(name.length + 1) : fallback;
};
const base = argument('--base', 'http://127.0.0.1:4179').replace(/\/$/, '');
const output = path.resolve(ROOT, argument('--out', 'reports/space-station-enhancement-qa/map-camera-motion-browser'));
const near = (actual, expected, tolerance = 1e-6) => {
  assert(Number.isFinite(actual) && Number.isFinite(expected));
  assert(Math.abs(actual - expected) <= tolerance, `${actual} should equal ${expected} within ${tolerance}`);
};
const vectorNear = (actual, expected) => {
  assert(Array.isArray(actual) && actual.length === expected.length);
  actual.forEach((value, index) => near(value, expected[index]));
};
const distance = (a, b) => Math.hypot(...a.map((value, index) => value - b[index]));

function observeMotionRenderer() {
  const Original = window.THREE.WebGLRenderer;
  window.__issMotionQA = { contexts: [], actions: [], interrupts: [], frames: [], active: 0, sequence: 0, lastNativeKey: null };
  function ObservedRenderer(options) {
    const renderer = new Original(options), render = renderer.render;
    window.__issMotionQA.contexts.push(renderer.getContext());
    renderer.render = function (scene, camera) {
      const result = render.apply(this, arguments);
      if (scene.name === 'iss-station-inspection' && renderer.domElement._issCameraState) {
        const qa = window.__issMotionQA, state = renderer.domElement._issCameraState();
        const station = scene.getObjectByName('iss-inspected-station');
        const rotation = new window.THREE.Quaternion(); station.getWorldQuaternion(rotation);
        let modulePosition = null;
        station.traverse(object => {
          if (!modulePosition && state.focusId && object._issId === state.focusId) {
            const point = new window.THREE.Vector3(); object.getWorldPosition(point); modulePosition = point.toArray();
          }
        });
        qa.frames.push({ sequence: ++qa.sequence, action: qa.active, at: performance.now(), camera: state,
          light: renderer.domElement._issLightingState(), position: camera.position.toArray(),
          projectedTarget: new window.THREE.Vector3(...state.target).project(camera).toArray(),
          stationQuaternion: rotation.toArray(), modulePosition });
        if (qa.frames.length > 240) qa.frames.shift();
      }
      return result;
    };
    return renderer;
  }
  ObservedRenderer.prototype = Original.prototype; Object.setPrototypeOf(ObservedRenderer, Original);
  window.THREE.WebGLRenderer = ObservedRenderer;
}

function verifyFrame(frame, baseline) {
  const c = frame.camera, light = frame.light;
  vectorNear(frame.position, c.position);
  vectorNear(frame.projectedTarget, c.projectedTarget);
  near(frame.projectedTarget[0], 0); near(frame.projectedTarget[1], 0);
  assert(frame.projectedTarget[2] > -1 && frame.projectedTarget[2] < 1);
  vectorNear(frame.stationQuaternion, baseline.stationQuaternion);
  vectorNear(c.stationQuaternion, baseline.stationQuaternion);
  near(c.distance, distance(c.position, c.target));
  assert(c.position[1] >= -3.8 - 1e-6);
  assert(c.distance >= c.minDistance - 1e-6 && c.distance <= c.maxDistance + 1e-6);
  for (const key of ['phase', 'beta', 'incidence', 'generation', 'sunIntensity', 'earthSunIntensity']) near(light[key], baseline.light[key]);
  for (const key of ['tracking', 'eclipse', 'playing']) assert.equal(light[key], baseline.light[key]);
  vectorNear(light.sun, baseline.light.sun); vectorNear(light.wingNormal, baseline.light.wingNormal);
}

function verifyTween(action, frames, baseline) {
  assert.equal(action.after.tweening, true, 'The native action starts a normal-motion tween synchronously');
  const relevant = frames.filter(frame => frame.action === action.id);
  assert(relevant.length >= 2, 'Observe intermediate and final real draws');
  const final = relevant[relevant.length - 1];
  assert.equal(final.camera.tweening, false);
  const intermediate = relevant.filter(frame => frame.camera.tweening && distance(frame.position, action.before.position) > 1e-5 && distance(frame.position, final.position) > 1e-5);
  assert(intermediate.length > 0, 'The camera traverses an actual intermediate position');
  let remaining = Infinity, previousTime = action.at;
  for (const frame of relevant) {
    verifyFrame(frame, baseline);
    assert(frame.at >= previousTime); previousTime = frame.at;
    const nextRemaining = distance(frame.position, final.position);
    assert(nextRemaining <= remaining + 1e-6, 'The transition progresses toward its final position');
    remaining = nextRemaining;
  }
  assert(final.at > intermediate[0].at, 'The transition spans separate rendered moments');
  return { method: action.method, argument: action.argument, startedTweening: true,
    renderedFrames: relevant.length, intermediateFrames: intermediate.length, elapsedMs: final.at - action.at,
    samples: [relevant[0], intermediate[Math.floor(intermediate.length / 2)], final].map(frame => ({
      elapsedMs: frame.at - action.at, position: frame.position, target: frame.camera.target, tweening: frame.camera.tweening
    })), final: final.camera };
}

async function main() {
  await fs.mkdir(output, { recursive: true });
  const result = { base, viewport: { width: 1440, height: 1080 }, reducedMotion: false, checks: {} }, errors = [];
  const browser = await chromium.launch({ headless: true,
    args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: result.viewport, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  page.setDefaultTimeout(30000);
  page.on('pageerror', error => errors.push(error.stack || error.message));
  let failure;
  try {
    await page.addInitScript(() => {
      let seed = 42;
      Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
      window.AlloPostFXEnabled = false;
    });
    await page.route('**/vendor/three-r128/three.min.js', async route => {
      const response = await route.fetch(); assert(response.ok());
      await route.fulfill({ response, body: (await response.text()) + '\n;(' + observeMotionRenderer.toString() + ')();\n' });
    });
    await page.goto(`${base}/?tab=map`, { waitUntil: 'load' });
    const canvas = page.locator('.iss-station-stage canvas');
    await page.waitForFunction(() => window.__issMotionQA?.frames.length > 0, null, { timeout: 30000 });
    assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), false);
    await page.locator('[data-iss-array-tracking]').click();
    await page.waitForFunction(() => {
      const frame = window.__issMotionQA.frames.at(-1);
      return frame && frame.light.tracking === false && frame.light.playing === false;
    });
    const baseline = await page.evaluate(() => window.__issMotionQA.frames.at(-1));
    verifyFrame(baseline, baseline);
    result.checks.baseline = { light: baseline.light, stationQuaternion: baseline.stationQuaternion };
    // Capture transient starts synchronously inside the action, independent of
    // protocol latency. These wrappers do not change any input or return value.
    await canvas.evaluate(cv => {
      const qa = window.__issMotionQA;
      for (const method of ['_issSetView', '_issFocusModule']) {
        const original = cv[method];
        cv[method] = function (...args) {
          const action = { id: qa.actions.length + 1, method, argument: args[0], at: performance.now(), before: cv._issCameraState() };
          qa.active = action.id;
          const returned = original.apply(this, args);
          action.after = cv._issCameraState(); qa.actions.push(action);
          return returned;
        };
      }
      cv.addEventListener('keydown', event => {
        qa.lastNativeKey = { key: event.key, trusted: event.isTrusted, at: performance.now() };
      }, true);
      const orbit = cv._issCameraOrbit;
      cv._issCameraOrbit = function (...args) {
        const event = qa.lastNativeKey;
        const interruption = { at: performance.now(), event, before: cv._issCameraState(), sequence: qa.sequence };
        const returned = orbit.apply(this, args);
        interruption.after = cv._issCameraState(); qa.interrupts.push(interruption);
        return returned;
      };
    });
    const readAction = () => page.evaluate(() => ({ action: window.__issMotionQA.actions.at(-1), frames: window.__issMotionQA.frames }));
    const waitSettled = () => page.waitForFunction(() => {
      const qa = window.__issMotionQA, action = qa.actions.at(-1), frame = qa.frames.at(-1);
      return action && frame && frame.action === action.id && !frame.camera.tweening &&
        !document.querySelector('.iss-station-stage canvas')._issCameraState().tweening;
    }, null, { timeout: 30000, polling: 'raf' });

    await page.locator('[data-iss-camera-view="labs"]').click();
    await waitSettled();
    let observed = await readAction();
    result.checks.labs = verifyTween(observed.action, observed.frames, baseline);
    vectorNear(result.checks.labs.final.position, [6.8, 2.4, -7.8]);
    vectorNear(result.checks.labs.final.target, [0, 0, -2.8]);
    assert.equal(result.checks.labs.final.view, 'labs');
    assert.equal(result.checks.labs.final.focusId, null);

    await page.locator('.iss-module-picker').getByRole('button', { name: 'Harmony', exact: true }).click();
    await page.locator('[data-iss-focus-module="harmony"]').click();
    await waitSettled(); observed = await readAction();
    result.checks.focus = verifyTween(observed.action, observed.frames, baseline);
    const focusedFrame = observed.frames.at(-1);
    assert.equal(focusedFrame.camera.focusId, 'harmony');
    assert.equal(focusedFrame.camera.view, 'custom');
    assert(focusedFrame.modulePosition, 'Observe the focused module in the actual station scene');
    vectorNear(focusedFrame.camera.target, focusedFrame.modulePosition);
    console.log('Normal-motion preset and module-focus transitions passed');

    await page.locator('[data-iss-camera-view="russian"]').click();
    await canvas.focus();
    await page.waitForFunction(() => {
      const qa = window.__issMotionQA, action = qa.actions.at(-1), frame = qa.frames.at(-1);
      return frame && frame.action === action.id && frame.camera.tweening &&
        Math.hypot(...frame.position.map((value, index) => value - action.before.position[index])) > 1e-5;
    }, null, { timeout: 30000, polling: 'raf' });
    await page.keyboard.press('ArrowLeft');
    const interrupted = await page.evaluate(() => window.__issMotionQA.interrupts.at(-1));
    assert(interrupted && interrupted.event.trusted && interrupted.event.key === 'ArrowLeft', 'Observe a native keyboard interruption');
    assert.equal(interrupted.before.tweening, true, 'The native key reaches a transition in progress');
    assert.equal(interrupted.after.tweening, false);
    assert.equal(interrupted.after.view, 'custom');
    vectorNear(interrupted.after.target, interrupted.before.target);
    assert(distance(interrupted.before.position, interrupted.after.position) > 1e-5);
    await page.waitForFunction(interrupted => {
      const frame = window.__issMotionQA.frames.at(-1);
      return frame && frame.sequence > interrupted.sequence && !frame.camera.tweening &&
        frame.position.every((value, index) => Math.abs(value - interrupted.after.position[index]) < 1e-6);
    }, interrupted, { timeout: 30000, polling: 'raf' });
    // Actively inspect every animation callback beyond the original transition's
    // nominal lifetime, so an old tween cannot silently resume after the key.
    const settled = await page.evaluate(expected => new Promise((resolve, reject) => {
      const started = performance.now(); let samples = 0;
      function inspect(now) {
        const camera = document.querySelector('.iss-station-stage canvas')._issCameraState();
        samples++;
        if (camera.tweening || camera.position.some((value, index) => Math.abs(value - expected.position[index]) > 1e-6) ||
          camera.target.some((value, index) => Math.abs(value - expected.target[index]) > 1e-6)) {
          reject(new Error('The canceled camera transition resumed')); return;
        }
        if (now - started >= 800) resolve({ samples, elapsedMs: now - started });
        else requestAnimationFrame(inspect);
      }
      requestAnimationFrame(inspect);
    }), interrupted.after);
    observed = await readAction();
    for (const frame of observed.frames.filter(frame => frame.action === observed.action.id)) verifyFrame(frame, baseline);
    result.checks.interruption = { nativeKey: interrupted.event.key, trusted: interrupted.event.trusted,
      before: interrupted.before, after: interrupted.after, settled };
    result.errors = errors; result.hostErrors = await page.evaluate(() => window.__events?.errors || []);
    assert.deepEqual(errors, []); assert.deepEqual(result.hostErrors, []);
    result.passed = true;
    console.log('Native mid-transition interruption and stable physics passed');
  } catch (error) {
    failure = error; result.passed = false; result.failure = error.stack || error.message; result.errors = errors;
    result.lastFrame = await page.evaluate(() => window.__issMotionQA?.frames.at(-1)).catch(() => null);
    await page.screenshot({ path: path.join(output, 'map-camera-motion-failure.png'), fullPage: true }).catch(() => {});
  } finally {
    try {
      result.checks.cleanup = await page.evaluate(() => {
        window.__destroy?.();
        return { contexts: window.__issMotionQA?.contexts.length || 0,
          lost: (window.__issMotionQA?.contexts || []).map(gl => gl.isContextLost()),
          canvases: document.querySelectorAll('.iss-station-stage canvas').length };
      });
      if (result.passed) {
        assert(result.checks.cleanup.contexts > 0); assert(result.checks.cleanup.lost.every(Boolean));
        assert.equal(result.checks.cleanup.canvases, 0); assert.deepEqual(errors, []);
      }
    } catch (error) {
      if (!failure) { failure = error; result.passed = false; result.failure = error.stack || error.message; }
      else result.cleanupFailure = error.stack || error.message;
    }
    await page.close(); await browser.close();
    const temporary = path.join(output, 'results.json.tmp'), destination = path.join(output, 'results.json');
    await fs.writeFile(temporary, JSON.stringify(result, null, 2) + '\n');
    await fs.rename(temporary, destination);
  }
  if (failure) throw failure;
  console.log(`Normal-motion camera smoke passed. Results: ${output}`);
}

main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
