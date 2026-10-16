#!/usr/bin/env node
'use strict';

// Native controls and real-render QA for the optional motor-limited array drive.
// Requires the existing preview: node dev-tools/space_station_map_drive_qa.cjs
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
const output = path.resolve(ROOT, argument('--out', 'reports/space-station-enhancement-qa/map-drive-browser'));
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
const wrap = angle => ((angle + 180) % 360 + 360) % 360 - 180;
const poseNormal = (alpha, feather) => {
  const a = alpha * Math.PI / 180, f = feather * Math.PI / 180;
  return [-Math.sin(f), Math.cos(a) * Math.cos(f), Math.sin(a) * Math.cos(f)];
};
const poseQuaternion = (alpha, feather) => {
  const a = alpha * Math.PI / 360, f = feather * Math.PI / 360;
  return [Math.sin(a) * Math.cos(f), -Math.sin(a) * Math.sin(f), Math.cos(a) * Math.sin(f), Math.cos(a) * Math.cos(f)];
};
const cameraPose = camera => Object.fromEntries(['position', 'target', 'distance', 'focusId', 'view', 'stationQuaternion', 'guides'].map(key => [key, camera[key]]));

function observeDriveRenderer() {
  const Original = window.THREE.WebGLRenderer;
  window.__issDriveQA = { contexts: [], draw: null, events: [], sequence: 0 };
  function ObservedRenderer(options) {
    const renderer = new Original(options), render = renderer.render;
    window.__issDriveQA.contexts.push(renderer.getContext());
    renderer.render = function (scene, camera) {
      const returned = render.apply(this, arguments);
      if (scene.name === 'iss-station-inspection' && renderer.domElement._issLightingState) {
        const wing = scene.getObjectByName('iss-array-wing-0'), anchor = scene.getObjectByName('iss-array-wing-2');
        const station = scene.getObjectByName('iss-inspected-station'), ghost = scene.getObjectByName('iss-array-command');
        function orientation(object) { const q = new window.THREE.Quaternion(); if (object) object.getWorldQuaternion(q); return q; }
        function position(object) { const p = new window.THREE.Vector3(); if (object) object.getWorldPosition(p); return p.toArray(); }
        const wingQ = orientation(wing), ghostQ = orientation(ghost), lines = [];
        ghost?.traverse(object => { if (object.isLineSegments) lines.push({ vertices: object.geometry.getAttribute('position').count,
          color: object.material.color.getHex(), visible: object.visible }); });
        window.__issDriveQA.draw = { sequence: ++window.__issDriveQA.sequence, wingFound: !!wing,
          normal: new window.THREE.Vector3(0, 1, 0).applyQuaternion(wingQ).toArray(),
          wingQuaternion: wingQ.toArray(), stationQuaternion: orientation(station).toArray(), cameraPosition: camera.position.toArray(),
          ghost: { found: !!ghost, visible: !!ghost?.visible, quaternion: ghostQ.toArray(),
            normal: new window.THREE.Vector3(0, 1, 0).applyQuaternion(ghostQ).toArray(), position: position(ghost), anchor: position(anchor), lines },
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
  const s = snapshot.state, d = snapshot.draw;
  assert(d?.wingFound && d.ghost.found, 'Both the physical wing and requested-pose group exist in the rendered scene');
  assert.equal(s.playing, false);
  for (const key of ['arrayAlpha', 'arrayFeather', 'commandAlpha', 'commandFeather', 'motorRate', 'driveError', 'driveElapsed']) assert(Number.isFinite(s[key]), `${key} is finite`);
  assert.equal(typeof s.motorEnabled, 'boolean'); assert.equal(typeof s.slewing, 'boolean');
  assert(s.driveElapsed >= 0 && s.motorRate > 0);
  const actualNormal = poseNormal(s.arrayAlpha, s.arrayFeather), commandNormal = poseNormal(s.commandAlpha, s.commandFeather);
  vectorNear(d.normal, actualNormal); vectorNear(s.wingNormal, actualNormal);
  near(Math.abs(dot(d.wingQuaternion, poseQuaternion(s.arrayAlpha, s.arrayFeather))), 1);
  const cosine = Math.max(-1, Math.min(1, dot(actualNormal, s.sun)));
  near(s.incidence, Math.max(0, cosine)); near(s.generation, s.eclipse ? 0 : Math.max(0, cosine));
  near(s.silhouette, Math.abs(cosine));
  const error = Math.max(Math.abs(wrap(s.commandAlpha - s.arrayAlpha)), Math.abs(s.commandFeather - s.arrayFeather));
  near(s.driveError, error);
  if (s.drivePointingError != null) near(s.drivePointingError, Math.acos(Math.max(-1, Math.min(1, dot(actualNormal, commandNormal)))) * 180 / Math.PI, 1e-5);
  const ghostVisible = s.motorEnabled && error > .01;
  assert.equal(s.commandVisible, ghostVisible); assert.equal(d.ghost.visible, ghostVisible);
  vectorNear(d.ghost.position, d.ghost.anchor);
  assert(d.ghost.lines.length && d.ghost.lines.reduce((sum, line) => sum + line.vertices, 0) >= 16,
    'The command group contains outlines for both panels');
  if (ghostVisible) {
    near(Math.abs(dot(d.ghost.quaternion, poseQuaternion(s.commandAlpha, s.commandFeather))), 1);
    vectorNear(d.ghost.normal, commandNormal);
  }
  if (!s.motorEnabled) { near(s.arrayAlpha, s.commandAlpha); near(s.arrayFeather, s.commandFeather); near(s.driveError, 0); }
  assert.equal(snapshot.enabled, String(s.motorEnabled)); near(snapshot.rate, s.motorRate);
  assert.equal(snapshot.stagePlayVisible, s.motorEnabled);
  near(snapshot.alphaInput, s.commandAlpha, .500001); near(snapshot.featherInput, s.commandFeather, .500001);
  for (const [key, expected] of [['alpha', s.commandAlpha], ['feather', s.commandFeather], ['input', s.generation * 100],
    ['area', s.silhouette * 100], ['angle', Math.acos(cosine) * 180 / Math.PI]]) {
    near(snapshot.arrayReadings[key], expected, key === 'angle' ? 1e-5 : 1e-6);
  }
  if (s.motorEnabled) {
    for (const [key, expected] of [['actual-alpha', s.arrayAlpha], ['actual-feather', s.arrayFeather], ['error', s.driveError], ['elapsed', s.driveElapsed]]) {
      assert.notEqual(snapshot.driveReadings[key].value, null); near(Number(snapshot.driveReadings[key].value), expected);
    }
    assert(snapshot.driveReadings.status.text.trim());
  }
  const points = snapshot.projection, area = Math.abs(points.reduce((sum, p, i) => {
    const next = points[(i + 1) % points.length]; return sum + p[0] * next[1] - next[0] * p[1];
  }, 0)) / 2 / 8100;
  near(area, s.silhouette, 1e-5);
  for (const key of ['phase', 'beta', 'arrayAlpha', 'arrayFeather', 'commandAlpha', 'commandFeather', 'driveElapsed']) near(d.state[key], s[key]);
  assert.equal(d.state.motorEnabled, s.motorEnabled);
  vectorNear(d.cameraPosition, snapshot.camera.position); vectorNear(d.stationQuaternion, snapshot.camera.stationQuaternion);
  if (fixedCamera) {
    for (const key of ['position', 'target', 'stationQuaternion']) vectorNear(snapshot.camera[key], fixedCamera[key]);
    near(snapshot.camera.distance, fixedCamera.distance);
    for (const key of ['focusId', 'view', 'guides']) assert.deepEqual(snapshot.camera[key], fixedCamera[key], 'Drive changes preserve camera and station attitude');
  }
  assert.equal(snapshot.glLost, false);
  return snapshot;
}

async function runWidth(browser, width) {
  const phone = width < 500, errors = [], result = { width, touch: phone, checks: {}, screenshots: [] };
  const page = await browser.newPage({ viewport: { width, height: phone ? 844 : 1080 }, deviceScaleFactor: 1,
    isMobile: phone, hasTouch: phone, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000); page.on('pageerror', error => errors.push(error.stack || error.message));
  const canvas = page.locator('.iss-station-stage canvas'), stage = page.locator('.iss-station-stage');
  const panel = page.locator('[data-iss-drive-panel]'), arrayPanel = page.locator('[data-iss-array-panel]');
  const toggle = page.locator('[data-iss-drive-toggle]'), rate = page.locator('[data-iss-drive-rate]');
  const play = page.locator('[data-iss-drive-play]'), stagePlay = page.locator('[data-iss-stage-play]');
  const alpha = page.locator('[data-iss-array-alpha]'), feather = page.locator('[data-iss-array-feather]');
  const preset = name => page.locator(`[data-iss-array-preset="${name}"]`);
  const activate = async locator => { if (phone) await locator.tap(); else { await locator.focus(); await page.keyboard.press('Enter'); } };
  let fixedCamera;
  const read = () => canvas.evaluate(cv => {
    function reading(selector) { const n = document.querySelector(selector); return { value: n?.getAttribute('data-value') ?? null, text: n?.textContent || '' }; }
    const polygon = document.querySelector('[data-iss-array-projection]'), values = (polygon.getAttribute('points').match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi) || []).map(Number);
    const stagePlay = document.querySelector('[data-iss-stage-play]'), gl = cv.getContext('webgl2') || cv.getContext('webgl');
    return { state: cv._issLightingState(), camera: cv._issCameraState(), draw: window.__issDriveQA.draw,
      enabled: document.querySelector('[data-iss-drive-toggle]').getAttribute('aria-pressed'), rate: Number(document.querySelector('[data-iss-drive-rate]').value),
      alphaInput: Number(document.querySelector('[data-iss-array-alpha]').value), featherInput: Number(document.querySelector('[data-iss-array-feather]').value),
      stagePlayVisible: !!stagePlay && !stagePlay.closest('[hidden]') && getComputedStyle(stagePlay).display !== 'none' && getComputedStyle(stagePlay).visibility !== 'hidden' && stagePlay.getBoundingClientRect().width > 0,
      arrayReadings: Object.fromEntries(['alpha', 'feather', 'input', 'area', 'angle'].map(key => [key, Number(reading('[data-iss-array-reading="' + key + '"]').value)])),
      driveReadings: Object.fromEntries(['actual-alpha', 'actual-feather', 'error', 'elapsed', 'status'].map(key => [key, reading('[data-iss-drive-reading="' + key + '"]')])),
      projection: Array.from({ length: values.length / 2 }, (_, i) => values.slice(i * 2, i * 2 + 2)),
      event: window.__issDriveQA.events.at(-1), glLost: gl ? gl.isContextLost() : null };
  });
  const settled = async sequence => {
    await page.waitForFunction(sequence => {
      const cv = document.querySelector('.iss-station-stage canvas'), d = window.__issDriveQA?.draw;
      if (!cv?._issLightingState || !d || d.sequence <= sequence) return false;
      const s = cv._issLightingState();
      return !s.playing && d.state.motorEnabled === s.motorEnabled && d.state.motorRate === s.motorRate &&
        ['phase', 'arrayAlpha', 'arrayFeather', 'commandAlpha', 'commandFeather', 'driveElapsed'].every(key => Math.abs(d.state[key] - s[key]) < 1e-7);
    }, sequence, { timeout: 30000, polling: 100 });
    return verifySnapshot(await read(), fixedCamera);
  };
  const preserveActual = snapshot => {
    const event = snapshot.event; assert(event, 'Observe the control event before its command applies');
    for (const key of ['phase', 'beta', 'rate', 'arrayAlpha', 'arrayFeather', 'driveElapsed']) near(snapshot.state[key], event.state[key]);
    assert.deepEqual(cameraPose(snapshot.camera), cameraPose(event.camera));
  };
  const command = async name => {
    const before = await read(); await activate(preset(name)); const after = await settled(before.draw.sequence);
    assert.equal(after.event.action, 'preset:' + name); assert.equal(after.event.trusted, true);
    if (after.state.motorEnabled) preserveActual(after);
    return after;
  };
  const selectRate = async value => {
    const choice = await rate.locator('option').evaluateAll((options, value) => options.find(option => Number(option.value) === value)?.value, value);
    assert(choice != null, 'The requested physical motor rate is available');
    const before = await read(); await rate.selectOption(choice); const after = await settled(before.draw.sequence);
    near(after.state.motorRate, value); preserveActual(after); return after;
  };
  const step = async () => {
    const before = await read(); await activate(page.locator('[data-iss-drive-step]')); const after = await settled(before.draw.sequence);
    assert.equal(after.event.trusted, true);
    const start = after.event.state;
    near(after.state.driveElapsed - start.driveElapsed, 60);
    near(wrap(after.state.phase - start.phase), 60 * 360 / start.periodSeconds);
    assert(Math.abs(wrap(after.state.arrayAlpha - start.arrayAlpha)) <= start.motorRate * 60 + 1e-6);
    assert(Math.abs(after.state.arrayFeather - start.arrayFeather) <= start.motorRate * 60 + 1e-6);
    return { before: start, after };
  };
  const capture = async label => {
    await page.evaluate(() => document.activeElement?.blur());
    for (const [locator, suffix] of [[stage, 'stage'], [arrayPanel, 'controls']]) {
      const filename = `map-drive-${label}-${suffix}-${width}.png`;
      await locator.screenshot({ path: path.join(output, filename), animations: 'disabled' }); result.screenshots.push(filename);
    }
  };
  try {
    console.log(`Checking array motor drive at ${width}px`);
    await page.addInitScript(() => {
      let seed = 42; Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
      window.AlloPostFXEnabled = false;
    });
    await page.route('**/vendor/three-r128/three.min.js', async route => {
      const response = await route.fetch(); assert(response.ok());
      await route.fulfill({ response, body: (await response.text()) + '\n;(' + observeDriveRenderer.toString() + ')();\n' });
    });
    await page.goto(`${base}/?tab=map`, { waitUntil: 'load' }); await panel.waitFor();
    const initial = await settled(0); fixedCamera = cameraPose(initial.camera);
    assert.equal(initial.state.motorEnabled, false); near(initial.state.motorRate, .08); near(initial.state.driveElapsed, 0);
    near(initial.state.phase, 35); near(initial.state.beta, 20);
    await page.evaluate(() => {
      const cv = document.querySelector('.iss-station-stage canvas');
      function capture(event) {
        const n = event.target.closest('[data-iss-drive-toggle],[data-iss-drive-rate],[data-iss-drive-step],[data-iss-drive-play],[data-iss-stage-play],[data-iss-array-preset],[data-iss-array-alpha],[data-iss-array-feather],[data-iss-orbit-phase]');
        if (!n) return;
        if (n.tagName === 'INPUT' ? event.type !== 'input' : n.tagName === 'SELECT' ? event.type !== 'change' : event.type !== 'click') return;
        const action = n.hasAttribute('data-iss-array-preset') ? 'preset:' + n.dataset.issArrayPreset :
          n.hasAttribute('data-iss-array-alpha') ? 'alpha' : n.hasAttribute('data-iss-array-feather') ? 'feather' :
          n.hasAttribute('data-iss-drive-rate') ? 'rate' : n.hasAttribute('data-iss-drive-step') ? 'step' :
          n.hasAttribute('data-iss-drive-toggle') ? 'toggle' : n.hasAttribute('data-iss-orbit-phase') ? 'phase' : 'play';
        window.__issDriveQA.events.push({ action, trusted: event.isTrusted, value: n.value, state: cv._issLightingState(), camera: cv._issCameraState() });
      }
      for (const name of ['click', 'input', 'change']) document.addEventListener(name, capture, true);
    });
    result.checks.initial = initial.state;
    const instantAway = await command('away'); near(instantAway.state.generation, 0); near(instantAway.state.driveError, 0);
    await command('track');
    let before = await read(); await activate(toggle); let after = await settled(before.draw.sequence);
    assert.equal(after.state.motorEnabled, true); vectorNear(after.draw.normal, before.draw.normal); near(after.state.driveElapsed, 0);
    near(after.state.driveError, 0); assert.equal(after.draw.ghost.visible, false);
    const queued = await command('away'); near(queued.state.generation, 1); assert(queued.state.driveError > 100);
    assert.equal(queued.draw.ghost.visible, true); vectorNear(queued.draw.normal, before.draw.normal);
    before = queued; await alpha.focus(); await page.keyboard.press('ArrowRight'); after = await settled(before.draw.sequence);
    preserveActual(after); assert.equal(after.event.action, 'alpha'); assert.equal(after.event.trusted, true);
    near(after.state.commandAlpha, Number(after.event.value)); near(after.state.commandFeather, queued.state.commandFeather);
    assert(Math.abs(after.state.commandFeather - after.state.arrayFeather) > 1, 'Preserve the other queued command, not the actual feather');
    result.checks.queuedManualEdit = after.state;
    const firstStep = await step(); assert(firstStep.after.state.driveError < firstStep.before.driveError);
    assert(Math.abs(wrap(firstStep.after.state.arrayAlpha - firstStep.before.arrayAlpha)) > .01);
    result.checks.manualStep = { before: firstStep.before, after: firstStep.after.state };
    await capture('requested-versus-actual');

    before = await read(); await activate(play);
    await page.waitForFunction(elapsed => {
      const s = document.querySelector('.iss-station-stage canvas')._issLightingState(); return s.playing && s.driveElapsed > elapsed + .02;
    }, before.state.driveElapsed, { timeout: 30000 });
    const changedRate = await selectRate(.2); assert.equal(changedRate.event.state.playing, true);
    result.checks.ratePausesWithoutJump = { beforeEvent: changedRate.event.state, after: changedRate.state };
    before = changedRate; await activate(stagePlay);
    await page.waitForFunction(elapsed => {
      const s = document.querySelector('.iss-station-stage canvas')._issLightingState(); return s.playing && s.driveElapsed > elapsed + .02;
    }, before.state.driveElapsed, { timeout: 30000 });
    const playing = await read(); await activate(stagePlay); after = await settled(playing.draw.sequence);
    assert(after.state.driveElapsed > before.state.driveElapsed);
    const paused = after;
    await page.waitForTimeout(300); after = verifySnapshot(await read(), fixedCamera);
    for (const key of ['phase', 'driveElapsed', 'arrayAlpha', 'arrayFeather']) near(after.state[key], paused.state[key]);
    result.checks.explicitReducedMotionPlayback = { before: before.state, after: after.state };
    let pending = await command('sun');
    if (pending.state.driveError <= .01) pending = await command('away');
    assert(pending.state.driveError > .01);
    const held = await command('hold'); near(held.state.commandAlpha, held.event.state.arrayAlpha); near(held.state.commandFeather, held.event.state.arrayFeather);
    near(held.state.driveError, 0); assert.equal(held.state.slewing, false); assert.equal(held.draw.ghost.visible, false);
    result.checks.holdCancelsQueue = held.state;
    before = held; await page.locator('[data-iss-orbit-phase]').focus(); await page.keyboard.press('End');
    after = await settled(before.draw.sequence);
    near(after.state.arrayAlpha, before.state.arrayAlpha); near(after.state.arrayFeather, before.state.arrayFeather);
    near(after.state.driveElapsed, before.state.driveElapsed); assert.equal(after.state.playing, false);
    assert(Math.abs(wrap(after.state.phase - before.state.phase)) > .01);
    result.checks.seekHoldsActualPose = after.state;
    console.log(`Native motor commands, rate limits, transport and hold passed at ${width}px`);

    // One setup reset isolates lag behind the moving Sun. The drive actions in
    // both scenarios are exercised through native controls.
    before = await read();
    await canvas.evaluate(cv => cv._issSetLighting({ motorEnabled: false, tracking: true, phase: 35, beta: 20, playing: false }));
    after = await settled(before.draw.sequence); near(after.state.arrayAlpha, 35); near(after.state.arrayFeather, -20);
    before = after; await activate(toggle); after = await settled(before.draw.sequence);
    await selectRate(.02);
    const lag = await step(); assert.equal(lag.after.state.tracking, true); assert(lag.after.state.driveError > 1);
    near(wrap(lag.after.state.commandAlpha - lag.after.state.phase), 0); near(lag.after.state.commandFeather, -lag.after.state.beta);
    assert(Math.abs(wrap(lag.after.state.commandAlpha - lag.after.state.arrayAlpha)) > 1);
    result.checks.trackingLag = { before: lag.before, after: lag.after.state };
    await capture('tracking-lag');
    before = lag.after; await feather.focus(); await page.keyboard.press('ArrowRight'); after = await settled(before.draw.sequence);
    preserveActual(after); assert.equal(after.event.state.tracking, true); assert.equal(after.state.tracking, false);
    near(after.state.commandAlpha, after.event.state.arrayAlpha); near(after.state.commandFeather, Number(after.event.value));
    assert(Math.abs(wrap(after.state.commandAlpha - after.event.state.commandAlpha)) > 1, 'Leaving tracking captures the other actual joint');
    result.checks.trackingToManual = after.state;
    before = after; await alpha.focus(); await page.keyboard.press('ArrowRight'); after = await settled(before.draw.sequence);
    preserveActual(after); near(after.state.commandFeather, before.state.commandFeather);
    near(after.state.commandAlpha, Number(after.event.value)); assert(after.state.driveError > .01);
    result.checks.manualRetainsQueuedOtherJoint = after.state;
    if (phone) {
      before = after;
      await alpha.scrollIntoViewIfNeeded();
      const bounds = await alpha.boundingBox(); assert(bounds && bounds.width > 0);
      await alpha.tap({ position: { x: bounds.width * .73, y: bounds.height / 2 } });
      after = await settled(before.draw.sequence); preserveActual(after);
      assert.equal(after.event.action, 'alpha'); assert.equal(after.event.trusted, true);
      near(after.state.commandAlpha, Number(after.event.value)); near(after.state.commandFeather, before.state.commandFeather);
      assert(Math.abs(wrap(after.state.commandAlpha - before.state.commandAlpha)) > 1, 'A native phone touch edits the queued joint');
      result.checks.touchCommand = after.state;
    }

    const layout = await page.evaluate(() => ({ viewport: innerWidth, pageWidth: document.documentElement.scrollWidth,
      nodes: Array.from(document.querySelectorAll('[data-iss-drive-panel],[data-iss-drive-panel] button,[data-iss-drive-panel] select,[data-iss-stage-play]'), node => {
        const b = node.getBoundingClientRect(); return { label: (node.textContent || '').trim().slice(0, 80), left: b.left, right: b.right,
          width: b.width, height: b.height, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth };
      }) }));
    assert(layout.pageWidth <= width + 1);
    for (const n of layout.nodes.filter(n => n.width > 0 && n.height > 0)) {
      assert(n.left >= -1 && n.right <= width + 1, `Drive control leaves the viewport: ${JSON.stringify(n)}`);
      assert(n.scrollWidth <= n.clientWidth + 1);
    }
    await page.addScriptTag({ path: path.join(ROOT, 'desktop/web-app/node_modules/axe-core/axe.min.js') });
    const accessibility = await page.evaluate(async () => {
      const checked = await axe.run({ include: ['[data-iss-array-panel]', '[data-iss-stage-play]'] }, {
        rules: { 'color-contrast': { enabled: false }, region: { enabled: false } }
      });
      return { passes: checked.passes.length, violations: checked.violations.map(v => ({ id: v.id,
        nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) };
    });
    assert.deepEqual(accessibility.violations, []); result.checks.layout = layout; result.checks.accessibility = accessibility;

    // The current preset still calls upd with a new state object, exercising
    // React's ref reassignment without changing the inspection camera.
    before = await read(); assert.equal(before.state.motorEnabled, true); assert.equal(before.camera.view, 'overview');
    await activate(page.locator('[data-iss-camera-view="overview"]'));
    after = verifySnapshot(await read(), fixedCamera);
    for (const key of ['phase', 'beta', 'rate', 'motorRate', 'arrayAlpha', 'arrayFeather', 'commandAlpha', 'commandFeather', 'driveElapsed']) near(after.state[key], before.state[key]);
    for (const key of ['motorEnabled', 'tracking', 'playing']) assert.equal(after.state[key], before.state[key]);
    const controlsAfterRerender = await page.locator('[data-iss-drive-rate],[data-iss-drive-play],[data-iss-drive-step]').evaluateAll(nodes =>
      nodes.map(node => ({ tag: node.tagName, disabled: node.disabled })));
    assert.equal(controlsAfterRerender.length, 3);
    assert(controlsAfterRerender.every(control => !control.disabled), 'Motor controls stay enabled after the React rerender');
    const rerenderStep = await step(); after = rerenderStep.after;
    assert.equal(after.state.motorEnabled, true);
    near(after.state.commandAlpha, rerenderStep.before.commandAlpha); near(after.state.commandFeather, rerenderStep.before.commandFeather);
    result.checks.rerenderKeepsNativeStepWorking = { controls: controlsAfterRerender, before: rerenderStep.before, after: after.state };
    console.log(`Native motor step after the React rerender passed at ${width}px`);

    before = after; await activate(toggle); after = await settled(before.draw.sequence);
    assert.equal(after.state.motorEnabled, false); near(after.state.arrayAlpha, before.state.commandAlpha); near(after.state.arrayFeather, before.state.commandFeather);
    near(after.state.driveError, 0); assert.equal(after.stagePlayVisible, false); assert.equal(after.draw.ghost.visible, false);
    result.checks.disableSnapsToCommand = after.state;
    const restoredInstant = await command('sun'); near(restoredInstant.state.incidence, 1); near(restoredInstant.state.driveError, 0);
    result.errors = errors; result.hostErrors = await page.evaluate(() => window.__events?.errors || []);
    assert.deepEqual(errors, []); assert.deepEqual(result.hostErrors, []); result.passed = true;
    console.log(`Moving-target lag, command capture, disable and accessibility passed at ${width}px`);
    return result;
  } catch (error) {
    result.passed = false; result.failure = error.stack || error.message; result.errors = errors;
    result.lastSnapshot = await read().catch(() => null);
    await page.screenshot({ path: path.join(output, `map-drive-failure-${width}.png`), fullPage: true }).catch(() => {});
    error.qaResult = result; throw error;
  } finally {
    try {
      result.checks.cleanup = await page.evaluate(() => {
        document.querySelector('.iss-station-stage canvas')?._issSetLighting?.({ playing: false }); window.__destroy?.();
        return { contexts: window.__issDriveQA?.contexts.length || 0, lost: (window.__issDriveQA?.contexts || []).map(gl => gl.isContextLost()),
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
  console.log(`Array-drive browser checks passed: ${widths.join(', ')}px. Results: ${output}`);
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
