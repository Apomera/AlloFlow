#!/usr/bin/env node
'use strict';

// Real-WebGL array pointing checks against an already running local preview.
//   node dev-tools/space_station_map_arrays_qa.cjs --widths=1440,390
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
const output = path.resolve(ROOT, argument('--out', 'reports/space-station-enhancement-qa/map-arrays-browser'));
const widths = argument('--widths', '1440,390').split(',').map(Number);
assert(widths.length && widths.every(width => Number.isInteger(width) && width >= 320));
const near = (actual, expected, tolerance = 1e-6) => {
  assert(Number.isFinite(actual) && Number.isFinite(expected), `Expected finite values: ${actual}, ${expected}`);
  assert(Math.abs(actual - expected) <= tolerance, `${actual} should equal ${expected} within ${tolerance}`);
};
const vectorNear = (actual, expected, tolerance = 1e-6) => {
  assert(Array.isArray(actual) && actual.length === expected.length);
  actual.forEach((value, index) => near(value, expected[index], tolerance));
};
const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);
const cameraPose = camera => Object.fromEntries(['position', 'target', 'distance', 'focusId', 'view', 'stationQuaternion', 'guides', 'activePointers', 'tweening'].map(key => [key, camera[key]]));

function observeArrayRenderer() {
  const Original = window.THREE.WebGLRenderer;
  window.__issArrayQA = { contexts: [], draw: null, events: [], sequence: 0 };
  function ObservedRenderer(options) {
    const renderer = new Original(options), render = renderer.render;
    window.__issArrayQA.contexts.push(renderer.getContext());
    renderer.render = function (scene, camera) {
      const returned = render.apply(this, arguments);
      if (scene.name === 'iss-station-inspection' && renderer.domElement._issLightingState) {
        const wing = scene.getObjectByName('iss-array-wing-0'), station = scene.getObjectByName('iss-inspected-station');
        const rotation = new window.THREE.Quaternion(), stationRotation = new window.THREE.Quaternion();
        if (wing) wing.getWorldQuaternion(rotation);
        if (station) station.getWorldQuaternion(stationRotation);
        window.__issArrayQA.draw = { sequence: ++window.__issArrayQA.sequence, wingFound: !!wing,
          normal: new window.THREE.Vector3(0, 1, 0).applyQuaternion(rotation).toArray(),
          axisX: new window.THREE.Vector3(1, 0, 0).applyQuaternion(rotation).toArray(),
          axisZ: new window.THREE.Vector3(0, 0, 1).applyQuaternion(rotation).toArray(),
          stationQuaternion: stationRotation.toArray(), cameraPosition: camera.position.toArray(),
          state: renderer.domElement._issLightingState() };
      }
      return returned;
    };
    return renderer;
  }
  ObservedRenderer.prototype = Original.prototype; Object.setPrototypeOf(ObservedRenderer, Original);
  window.THREE.WebGLRenderer = ObservedRenderer;
}

function verifySnapshot(snapshot, fixedCamera) {
  const state = snapshot.state, draw = snapshot.draw;
  assert(draw && draw.wingFound, 'Observe the named array wing in the actual rendered scene');
  assert.equal(state.playing, false);
  assert(state.arrayAlpha >= -180 && state.arrayAlpha <= 180);
  assert(state.arrayFeather >= -90 && state.arrayFeather <= 90);
  const a = state.arrayAlpha * Math.PI / 180, f = state.arrayFeather * Math.PI / 180;
  const expectedNormal = [-Math.sin(f), Math.cos(a) * Math.cos(f), Math.sin(a) * Math.cos(f)];
  vectorNear(draw.normal, expectedNormal); vectorNear(state.wingNormal, expectedNormal);
  near(Math.hypot(...draw.normal), 1); near(Math.hypot(...state.sun), 1);
  const cosine = Math.max(-1, Math.min(1, dot(draw.normal, state.sun)));
  near(state.incidence, Math.max(0, cosine)); near(state.silhouette, Math.abs(cosine));
  near(state.generation, state.eclipse ? 0 : Math.max(0, cosine));
  if (state.tracking) vectorNear(draw.normal, state.sun);
  vectorNear(draw.normal, draw.state.wingNormal);
  for (const key of ['phase', 'beta', 'arrayAlpha', 'arrayFeather', 'incidence', 'generation', 'silhouette']) near(draw.state[key], state[key]);
  assert.equal(draw.state.tracking, state.tracking);
  vectorNear(draw.cameraPosition, snapshot.camera.position);
  vectorNear(draw.stationQuaternion, snapshot.camera.stationQuaternion);
  if (fixedCamera) assert.deepEqual(cameraPose(snapshot.camera), fixedCamera, 'Array commands preserve camera and station attitude');
  near(snapshot.alpha, state.arrayAlpha, .500001); near(snapshot.feather, state.arrayFeather, .500001);
  for (const [name, expected] of [['alpha', state.arrayAlpha], ['feather', state.arrayFeather],
    ['input', state.generation * 100], ['area', state.silhouette * 100], ['angle', Math.acos(cosine) * 180 / Math.PI]]) {
    assert.notEqual(snapshot.readings[name].value, null, `Reading ${name} exposes its numeric value`);
    near(Number(snapshot.readings[name].value), expected, name === 'angle' ? 1e-5 : 1e-6);
    assert(snapshot.readings[name].text.trim());
  }
  assert(snapshot.readings.state.text.trim());
  assert.equal(snapshot.projection.tag, 'polygon');
  assert.equal(snapshot.projection.side, Math.acos(cosine) * 180 / Math.PI > 90 + 1e-7 ? 'back' : 'front');
  const points = snapshot.projection.points;
  assert.equal(points.length, 4, 'Project the four corners of a unit square');
  const centered = points.map(point => [(point[0] - 120) / 90, (90 - point[1]) / 90]);
  near(centered.reduce((sum, point) => sum + point[0], 0) / 4, 0, 1e-5);
  near(centered.reduce((sum, point) => sum + point[1], 0) / 4, 0, 1e-5);
  const area = Math.abs(centered.reduce((sum, point, index) => {
    const next = centered[(index + 1) % centered.length]; return sum + point[0] * next[1] - next[0] * point[1];
  }, 0)) / 2;
  near(area, state.silhouette, 1e-5);
  // Projection lengths follow the actual rendered panel axes; no dependency on
  // which horizontal/vertical basis the diagram chooses within the Sun plane.
  const edges = centered.map((point, index) => {
    const next = centered[(index + 1) % 4]; return [next[0] - point[0], next[1] - point[1]];
  });
  const expectedLengths = [draw.axisX, draw.axisZ].map(axis => Math.sqrt(Math.max(0, 1 - dot(axis, state.sun) ** 2))).sort((x, y) => x - y);
  const actualLengths = edges.slice(0, 2).map(edge => Math.hypot(...edge)).sort((x, y) => x - y);
  vectorNear(actualLengths, expectedLengths, 2e-5);
  vectorNear(edges[0], edges[2].map(value => -value), 2e-5);
  vectorNear(edges[1], edges[3].map(value => -value), 2e-5);
  assert.equal(snapshot.glLost, false);
  return snapshot;
}

async function runWidth(browser, width) {
  const phone = width < 500, errors = [], result = { width, touch: phone, checks: {}, screenshots: [] };
  const page = await browser.newPage({ viewport: { width, height: phone ? 844 : 1080 }, deviceScaleFactor: 1,
    isMobile: phone, hasTouch: phone, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000); page.on('pageerror', error => errors.push(error.stack || error.message));
  const canvas = page.locator('.iss-station-stage canvas'), stage = page.locator('.iss-station-stage');
  const panel = page.locator('[data-iss-array-panel]');
  const alpha = page.locator('[data-iss-array-alpha]'), feather = page.locator('[data-iss-array-feather]');
  const activate = async locator => { if (phone) await locator.tap(); else { await locator.focus(); await page.keyboard.press('Enter'); } };
  let fixedCamera;
  const read = () => canvas.evaluate(cv => {
    const polygon = document.querySelector('[data-iss-array-projection]');
    const coordinates = (polygon.getAttribute('points').match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi) || []).map(Number);
    const gl = cv.getContext('webgl2') || cv.getContext('webgl');
    return { state: cv._issLightingState(), camera: cv._issCameraState(), draw: window.__issArrayQA.draw,
      alpha: Number(document.querySelector('[data-iss-array-alpha]').value), feather: Number(document.querySelector('[data-iss-array-feather]').value),
      readings: Object.fromEntries(['alpha', 'feather', 'input', 'angle', 'area', 'state'].map(key => {
        const node = document.querySelector('[data-iss-array-reading="' + key + '"]');
        return [key, { value: node.getAttribute('data-value'), text: node.textContent }];
      })), projection: { tag: polygon.tagName.toLowerCase(), side: polygon.getAttribute('data-side'), points: Array.from({ length: coordinates.length / 2 }, (_, index) => coordinates.slice(index * 2, index * 2 + 2)) },
      lastEvent: window.__issArrayQA.events.at(-1), glLost: gl ? gl.isContextLost() : null };
  });
  const waitSettled = async sequence => {
    await page.waitForFunction(sequence => {
      const cv = document.querySelector('.iss-station-stage canvas'), draw = window.__issArrayQA?.draw;
      if (!cv?._issLightingState || !draw || draw.sequence <= sequence) return false;
      const state = cv._issLightingState();
      return !state.playing && draw.state.tracking === state.tracking &&
        ['phase', 'beta', 'arrayAlpha', 'arrayFeather'].every(key => Math.abs(draw.state[key] - state[key]) < 1e-7);
    }, sequence, { timeout: 30000, polling: 100 });
    return verifySnapshot(await read(), fixedCamera);
  };
  const verifyJointEvent = snapshot => {
    const event = snapshot.lastEvent;
    assert(event && event.trusted, 'Observe a native array control event');
    for (const key of ['phase', 'beta', 'rate']) near(snapshot.state[key], event.state[key]);
    assert.deepEqual(cameraPose(snapshot.camera), cameraPose(event.camera));
    assert.equal(snapshot.state.playing, false);
  };
  const setPreset = async name => {
    const before = await read(); await activate(page.locator(`[data-iss-array-preset="${name}"]`));
    const after = await waitSettled(before.draw.sequence); verifyJointEvent(after);
    assert.equal(after.lastEvent.preset, name);
    assert.equal(after.state.tracking, name === 'track');
    result.checks[name] = after.state;
    return after;
  };
  const capture = async label => {
    await page.evaluate(() => document.activeElement?.blur());
    for (const [locator, suffix] of [[stage, 'stage'], [panel, 'controls']]) {
      const name = `map-arrays-${label}-${suffix}-${width}.png`;
      await locator.screenshot({ path: path.join(output, name), animations: 'disabled' }); result.screenshots.push(name);
    }
  };
  try {
    console.log(`Checking solar-array pointing at ${width}px`);
    await page.addInitScript(() => {
      let seed = 42; Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
      window.AlloPostFXEnabled = false;
    });
    await page.route('**/vendor/three-r128/three.min.js', async route => {
      const response = await route.fetch(); assert(response.ok());
      await route.fulfill({ response, body: (await response.text()) + '\n;(' + observeArrayRenderer.toString() + ')();\n' });
    });
    await page.goto(`${base}/?tab=map`, { waitUntil: 'load' }); await panel.waitFor();
    const initial = await waitSettled(0); fixedCamera = cameraPose(initial.camera);
    near(initial.state.phase, 35); near(initial.state.beta, 20); assert.equal(initial.state.tracking, true);
    near(initial.state.arrayAlpha, 35); near(initial.state.arrayFeather, -20);
    for (const [control, min, max] of [[alpha, '-180', '180'], [feather, '-90', '90']]) {
      assert.equal(await control.getAttribute('type'), 'range'); assert.equal(await control.getAttribute('min'), min);
      assert.equal(await control.getAttribute('max'), max); assert.equal(await control.getAttribute('step'), '1');
    }
    await panel.evaluate(node => {
      const cv = document.querySelector('.iss-station-stage canvas');
      for (const input of node.querySelectorAll('[data-iss-array-alpha],[data-iss-array-feather]')) {
        input.addEventListener('input', event => window.__issArrayQA.events.push({ type: 'input', trusted: event.isTrusted,
          joint: input.hasAttribute('data-iss-array-alpha') ? 'alpha' : 'feather', value: Number(input.value),
          state: cv._issLightingState(), camera: cv._issCameraState() }), true);
      }
      for (const button of node.querySelectorAll('[data-iss-array-preset]')) {
        button.addEventListener('click', event => window.__issArrayQA.events.push({ type: 'click', trusted: event.isTrusted,
          preset: button.dataset.issArrayPreset, state: cv._issLightingState(), camera: cv._issCameraState() }), true);
      }
    });
    result.checks.initial = initial.state;
    const held = await setPreset('hold'); vectorNear(held.draw.normal, initial.draw.normal);
    near(held.state.arrayAlpha, initial.state.arrayAlpha); near(held.state.arrayFeather, initial.state.arrayFeather);
    await setPreset('track');
    let before = await read(); await feather.focus(); await page.keyboard.press('ArrowRight');
    let after = await waitSettled(before.draw.sequence); verifyJointEvent(after);
    assert.equal(after.lastEvent.state.tracking, true); assert.equal(after.state.tracking, false);
    near(after.state.arrayAlpha, after.lastEvent.state.arrayAlpha); near(after.state.arrayFeather, -19);
    result.checks.featherCapturesTrackedAlpha = after.state;
    await setPreset('sun');
    before = await read(); await alpha.focus(); await page.keyboard.press('ArrowRight');
    after = await waitSettled(before.draw.sequence); verifyJointEvent(after);
    near(after.state.arrayAlpha, 36); near(after.state.arrayFeather, -20); assert.equal(after.state.tracking, false);
    before = after; await feather.focus(); await page.keyboard.press('ArrowRight');
    after = await waitSettled(before.draw.sequence); verifyJointEvent(after);
    near(after.state.arrayAlpha, 36); near(after.state.arrayFeather, -19);
    result.checks.keyboard = after.state;
    before = after; await alpha.focus(); await page.keyboard.press('End');
    after = await waitSettled(before.draw.sequence); verifyJointEvent(after);
    near(after.state.arrayAlpha, 180); near(after.alpha, 180);
    assert.equal(await alpha.inputValue(), '180', 'The positive endpoint does not jump to the negative thumb endpoint');
    result.checks.positiveEndpoint = after.state;
    if (phone) {
      for (const [control, joint, fraction] of [[alpha, 'alpha', .7], [feather, 'feather', .25]]) {
        await control.hover(); const box = await control.boundingBox(); assert(box && box.width > 100);
        before = await read();
        await page.touchscreen.tap(box.x + box.width * fraction, box.y + box.height / 2);
        after = await waitSettled(before.draw.sequence); verifyJointEvent(after);
        assert.equal(after.lastEvent.joint, joint);
        near(after.state[joint === 'alpha' ? 'arrayAlpha' : 'arrayFeather'], after.lastEvent.value);
        assert.notEqual(after.state[joint === 'alpha' ? 'arrayAlpha' : 'arrayFeather'], before.state[joint === 'alpha' ? 'arrayAlpha' : 'arrayFeather']);
      }
      result.checks.touch = after.state;
    }
    const sun = await setPreset('sun'); near(sun.state.incidence, 1); near(sun.state.generation, 1); near(sun.state.silhouette, 1);
    await capture('sun-facing');
    const edge = await setPreset('edge'); near(edge.state.incidence, 0); near(edge.state.silhouette, 0);
    near(Number(edge.readings.angle.value), 90);
    const away = await setPreset('away'); near(away.state.incidence, 0); near(away.state.generation, 0); near(away.state.silhouette, 1);
    near(Number(away.readings.angle.value), 180, 1e-5); near(Number(away.readings.area.value), 100);
    await capture('back-facing');
    const parked = await setPreset('park'); vectorNear(parked.draw.normal, [0, 1, 0]);
    near(parked.state.arrayAlpha, 0); near(parked.state.arrayFeather, 0);
    before = parked; await page.locator('[data-iss-orbit-phase]').focus(); await page.keyboard.press('Home');
    after = await waitSettled(before.draw.sequence);
    near(after.state.phase, 0); assert.equal(after.state.tracking, false);
    near(after.state.arrayAlpha, before.state.arrayAlpha); near(after.state.arrayFeather, before.state.arrayFeather);
    vectorNear(after.draw.normal, before.draw.normal);
    assert(Math.abs(after.state.incidence - before.state.incidence) > .01, 'A fixed manual pose responds to a changing Sun direction');
    result.checks.fixedManualThroughPhase = after.state;
    console.log(`Joint controls, presets and physical projected silhouette passed at ${width}px`);

    before = after; await activate(page.locator('[data-iss-lighting-preset="midnight"]'));
    after = await waitSettled(before.draw.sequence); assert.equal(after.state.eclipse, true);
    const eclipse = await setPreset('sun');
    near(eclipse.state.incidence, 1); near(eclipse.state.silhouette, 1); near(eclipse.state.generation, 0);
    near(Number(eclipse.readings.area.value), 100); near(Number(eclipse.readings.input.value), 0);
    result.checks.eclipse = eclipse.state; await capture('eclipse');
    const tracking = await setPreset('track'); vectorNear(tracking.draw.normal, tracking.state.sun);
    before = tracking; await activate(page.locator('[data-iss-lighting-preset="noon"]'));
    after = await waitSettled(before.draw.sequence); assert.equal(after.state.tracking, true);
    vectorNear(after.draw.normal, after.state.sun); near(after.state.generation, 1);
    result.checks.trackingFollowsPhase = after.state;

    await page.locator('[data-iss-lighting-rate]').selectOption('180');
    await activate(page.locator('[data-iss-lighting-play]'));
    await page.waitForFunction(() => {
      const state = document.querySelector('.iss-station-stage canvas')._issLightingState();
      return state.playing && state.phase > .01;
    }, null, { timeout: 30000 });
    before = await read(); await alpha.focus(); await page.keyboard.press('ArrowRight');
    after = await waitSettled(before.draw.sequence); verifyJointEvent(after);
    assert.equal(after.lastEvent.state.playing, true, 'The joint command arrives during explicit playback');
    assert.equal(after.state.playing, false); assert.equal(after.state.tracking, false); near(after.state.rate, 180);
    near(after.state.arrayFeather, after.lastEvent.state.arrayFeather, 1e-6);
    result.checks.jointPausesPlayback = { beforeEvent: after.lastEvent.state, after: after.state };
    await setPreset('track'); await activate(page.locator('[data-iss-lighting-play]'));
    await page.waitForFunction(() => document.querySelector('.iss-station-stage canvas')._issLightingState().playing);
    const samePointing = await setPreset('hold');
    assert.equal(samePointing.lastEvent.state.playing, true);
    near(samePointing.state.arrayAlpha, samePointing.lastEvent.state.arrayAlpha);
    near(samePointing.state.arrayFeather, samePointing.lastEvent.state.arrayFeather);
    vectorNear(samePointing.draw.normal, samePointing.lastEvent.state.wingNormal);
    result.checks.samePointingPausesPlayback = samePointing.state;

    const layout = await panel.evaluate(node => ({ viewport: innerWidth, pageWidth: document.documentElement.scrollWidth,
      nodes: [node, ...node.querySelectorAll('button,input,svg')].map(element => {
        const b = element.getBoundingClientRect(); return { tag: element.tagName, left: b.left, right: b.right, width: b.width, height: b.height,
          clientWidth: element.clientWidth, scrollWidth: element.scrollWidth };
      }) }));
    assert(layout.pageWidth <= width + 1);
    for (const node of layout.nodes) {
      assert(node.left >= -1 && node.right <= layout.viewport + 1, `Array control leaves the viewport: ${JSON.stringify(node)}`);
      assert(node.width > 0 && node.height > 0); assert(node.scrollWidth <= node.clientWidth + 1);
    }
    await page.addScriptTag({ path: path.join(ROOT, 'desktop/web-app/node_modules/axe-core/axe.min.js') });
    const accessibility = await page.evaluate(async () => {
      const checked = await axe.run(document.querySelector('[data-iss-array-panel]'), { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
      return { passes: checked.passes.length, violations: checked.violations.map(v => ({ id: v.id,
        nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) };
    });
    assert.deepEqual(accessibility.violations, []);
    result.checks.layout = layout; result.checks.accessibility = accessibility;
    result.errors = errors; result.hostErrors = await page.evaluate(() => window.__events?.errors || []);
    assert.deepEqual(errors, []); assert.deepEqual(result.hostErrors, []); result.passed = true;
    console.log(`Array eclipse/tracking/playback, layout and accessibility passed at ${width}px`);
    return result;
  } catch (error) {
    result.passed = false; result.failure = error.stack || error.message; result.errors = errors;
    result.lastSnapshot = await read().catch(() => null);
    await page.screenshot({ path: path.join(output, `map-arrays-failure-${width}.png`), fullPage: true }).catch(() => {});
    error.qaResult = result; throw error;
  } finally {
    try {
      result.checks.cleanup = await page.evaluate(() => {
        document.querySelector('.iss-station-stage canvas')?._issSetLighting?.({ playing: false }); window.__destroy?.();
        return { contexts: window.__issArrayQA?.contexts.length || 0,
          lost: (window.__issArrayQA?.contexts || []).map(gl => gl.isContextLost()), canvases: document.querySelectorAll('.iss-station-stage canvas').length };
      });
      if (result.passed) {
        assert(result.checks.cleanup.contexts > 0); assert(result.checks.cleanup.lost.every(Boolean));
        assert.equal(result.checks.cleanup.canvases, 0); assert.deepEqual(errors, []);
      }
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
  console.log(`Array-pointing browser checks passed: ${widths.join(', ')}px. Results: ${output}`);
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
