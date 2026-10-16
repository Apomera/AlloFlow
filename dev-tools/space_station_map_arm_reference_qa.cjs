#!/usr/bin/env node
'use strict';

// Exercise real desktop/touch controls and rendered geometry without starting a server.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const arg = (name, fallback) => process.argv.slice(2).find(value => value.startsWith(name + '='))?.slice(name.length + 1) || fallback;
const base = arg('--base', 'http://127.0.0.1:4179').replace(/\/$/, '');
const output = path.resolve(ROOT, arg('--out', 'reports/space-station-enhancement-qa/map-arm-reference-browser'));
const widths = arg('--widths', '1440,390').split(',').map(Number);
assert(widths.length && widths.every(width => Number.isInteger(width) && width >= 320));
let helpers;
const near = (actual, expected, tolerance = 1e-8) => {
  assert(Number.isFinite(actual) && Number.isFinite(expected), `Finite values required: ${actual}, ${expected}`);
  assert(Math.abs(actual - expected) <= tolerance, `${actual} should equal ${expected} within ${tolerance}`);
};
const vectorNear = (actual, expected, tolerance = 3e-6) => {
  assert(Array.isArray(actual) && Array.isArray(expected) && actual.length === expected.length);
  actual.forEach((value, index) => near(value, expected[index], tolerance));
};
const wrap = angle => ((angle + 180) % 360 + 360) % 360 - 180;
const keys = ['shoulder', 'elbow', 'shoulderRate', 'elbowRate'];
function pose(state) {
  const shoulder = state.shoulder * Math.PI / 180, hand = (state.shoulder + state.elbow) * Math.PI / 180;
  const joint = [-1.4 * Math.sin(shoulder), 1.4 * Math.cos(shoulder), 0];
  return { joint, tip: [joint[0] - 1.2 * Math.sin(hand), joint[1] + 1.2 * Math.cos(hand), 0] };
}
function sameCamera(before, after) {
  for (const key of ['position', 'target', 'stationQuaternion']) vectorNear(after.camera[key], before.camera[key]);
  for (const key of ['fit', 'focusId', 'view', 'guides', 'tweening']) assert.equal(after.camera[key], before.camera[key]);
  near(after.camera.distance, before.camera.distance);
}
function samePhysical(before, after, { target = true, playing = true, camera = true } = {}) {
  for (const key of ['phase', 'beta', 'arrayAlpha', 'arrayFeather', 'actualAlphaRate', 'actualFeatherRate', 'driveElapsed', 'commandAlpha', 'commandFeather', 'motorRate', 'motorAcceleration', 'rate']) near(after.state[key], before.state[key]);
  for (const key of ['tracking', 'motorEnabled', 'motorSmooth', 'motorBraking']) assert.equal(after.state[key], before.state[key]);
  if (playing) assert.equal(after.state.playing, before.state.playing);
  keys.forEach(key => near(after.arm.actual[key], before.arm.actual[key], 1e-10));
  assert.equal(after.arm.actual.braking, before.arm.actual.braking); near(after.arm.elapsed, before.arm.elapsed);
  if (target) assert.deepEqual(after.arm.target, before.arm.target);
  if (camera) sameCamera(before, after);
}
function samePredictions(before, after) {
  assert.deepEqual(after.preview, before.preview);
  assert.deepEqual(after.forecast, before.forecast);
}
function observeRenderer() {
  const Original = THREE.WebGLRenderer;
  window.__issArmReferenceQA = { draw: null, sequence: 0, contexts: [], events: [] };
  function ObservedRenderer(options) {
    const renderer = new Original(options), render = renderer.render;
    window.__issArmReferenceQA.contexts.push(renderer.getContext());
    renderer.render = function (scene, camera) {
      const result = render.apply(this, arguments), cv = renderer.domElement;
      if (scene.name !== 'iss-station-inspection' || !cv._issArmReferenceState) return result;
      const object = name => {
        const node = scene.getObjectByName(name); if (!node) return null;
        let visible = true; for (let ancestor = node; ancestor; ancestor = ancestor.parent) visible = visible && ancestor.visible;
        return { visible, position: node.position.toArray(), positions: node.geometry?.attributes.position ? Array.from(node.geometry.attributes.position.array) : null };
      };
      window.__issArmReferenceQA.draw = { sequence: ++window.__issArmReferenceQA.sequence, reference: cv._issArmReferenceState(), arm: cv._issArmState(), preview: cv._issArmPreviewState(),
        camera: cv._issCameraState(), width: cv.clientWidth, height: cv.clientHeight, group: object('iss-arm-reference'), ghost: object('iss-arm-reference-ghost'),
        saved: object('iss-arm-reference-tip'), line: object('iss-arm-reference-displacement'), current: object('iss-arm-reference-current') };
      return result;
    };
    return renderer;
  }
  ObservedRenderer.prototype = Original.prototype; Object.setPrototypeOf(ObservedRenderer, Original); THREE.WebGLRenderer = ObservedRenderer;
}
function verify(snapshot) {
  const { arm, reference: ref, preview, panel, draw } = snapshot;
  assert.equal(snapshot.glLost, false); assert(draw?.group && draw.ghost && draw.saved && draw.line && draw.current);
  assert.equal(panel.visible, arm.enabled); assert.equal(ref.visible, !!ref.saved && ref.show && arm.enabled);
  assert.equal(draw.group.visible, ref.visible); vectorNear(draw.group.position, arm.base);
  assert.equal(ref.source, preview.active ? 'preview' : 'live');
  near(ref.seconds, arm.elapsed + (preview.active ? preview.seconds : 0));
  if (!ref.saved) {
    assert(panel.disabled.target && panel.disabled.clear, 'No saved pose means target and clear are unavailable');
    return snapshot;
  }
  const saved = pose(ref.saved.state), selected = preview.active ? preview.selected : arm.actual, current = pose(selected);
  vectorNear(ref.saved.pose.tip, saved.tip); vectorNear(ref.saved.pose.joint, saved.joint);
  vectorNear(draw.ghost.positions, [0, 0, 0, ...saved.joint, ...saved.tip]); vectorNear(draw.saved.position, saved.tip);
  vectorNear(draw.line.positions, [...saved.tip, ...current.tip]); vectorNear(draw.current.position, current.tip);
  const delta = current.tip.map((value, index) => value - saved.tip[index]), distance = Math.hypot(...delta), elapsed = ref.seconds - ref.saved.seconds;
  vectorNear(ref.comparison.delta, delta); near(ref.comparison.distance, distance); near(ref.comparison.elapsedSeconds, elapsed);
  near(ref.comparison.shoulderDelta, wrap(selected.shoulder - ref.saved.state.shoulder)); near(ref.comparison.elbowDelta, wrap(selected.elbow - ref.saved.state.elbow));
  if (panel.visible) {
    near(panel.readings.x, delta[0]); near(panel.readings.y, delta[1]); near(panel.readings.distance, distance); near(panel.readings.time, elapsed);
    near(panel.readings.shoulder, wrap(selected.shoulder - ref.saved.state.shoulder)); near(panel.readings.elbow, wrap(selected.elbow - ref.saved.state.elbow));
    assert.equal(panel.pressed, String(ref.show)); assert(!panel.disabled.target && !panel.disabled.clear);
    assert(panel.source.length, 'Comparison source must be explicit');
    assert(preview.active ? /preview|future/i.test(panel.source) : /live|current/i.test(panel.source), `Source caption: ${panel.source}`);
  }
  return snapshot;
}
function verifyAdvance(before, after, seconds) {
  const expected = helpers.step({ ...before.arm.actual, targetShoulder: before.arm.target.shoulder, targetElbow: before.arm.target.elbow }, seconds);
  keys.forEach(key => near(after.arm.actual[key], expected[key], 1e-10));
  near(after.arm.elapsed, before.arm.elapsed + seconds); near(after.state.driveElapsed, before.state.driveElapsed + seconds);
  assert.deepEqual(after.reference.saved, before.reference.saved); sameCamera(before, after);
}

async function runWidth(browser, width) {
  const phone = width < 500, errors = [], result = { width, touch: phone, checks: {}, screenshots: [] };
  const page = await browser.newPage({ viewport: { width, height: phone ? 844 : 1080 }, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000); page.on('pageerror', error => errors.push(error.stack || error.message));
  const canvas = page.locator('.iss-station-stage canvas'), panel = page.locator('[data-iss-arm-reference-panel]');
  const button = action => page.locator('[data-iss-arm-reference-' + action + ']');
  const activate = locator => phone ? locator.tap() : locator.click();
  const read = () => canvas.evaluate(cv => {
    const q = selector => document.querySelector(selector), shown = node => !!node && !node.hidden && node.getClientRects().length > 0;
    const gl = cv.getContext('webgl2') || cv.getContext('webgl');
    return { arm: cv._issArmState(), reference: cv._issArmReferenceState(), preview: cv._issArmPreviewState(), forecast: cv._issForecastState(), state: cv._issLightingState(), camera: cv._issCameraState(),
      draw: window.__issArmReferenceQA.draw, glLost: gl?.isContextLost(), panel: { visible: shown(q('[data-iss-arm-reference-panel]')), source: q('[data-iss-arm-reference-source]').textContent.trim(),
        pressed: q('[data-iss-arm-reference-show]').getAttribute('aria-pressed'), disabled: Object.fromEntries(['target', 'clear', 'show'].map(key => [key, q('[data-iss-arm-reference-' + key + ']').disabled])),
        readings: Object.fromEntries(['x', 'y', 'distance', 'time', 'shoulder', 'elbow'].map(key => [key, Number(q('[data-iss-arm-reference-reading="' + key + '"]').getAttribute('data-value'))])) },
      focused: Array.from(document.activeElement?.attributes || []).map(attribute => attribute.name), events: window.__issArmReferenceQA.events.slice(-200) };
  });
  const ready = async () => {
    await page.evaluate(() => new Promise(resolve => window.__issArmReferenceNativeRAF(() => window.__issArmReferenceNativeRAF(resolve))));
    await page.waitForFunction(() => {
      const cv = document.querySelector('.iss-station-stage canvas'), draw = window.__issArmReferenceQA?.draw;
      if (!cv?._issArmReferenceState || !draw) return false;
      const camera = cv._issCameraState();
      return !camera.tweening && JSON.stringify(cv._issArmReferenceState()) === JSON.stringify(draw.reference) && JSON.stringify(cv._issArmState().actual) === JSON.stringify(draw.arm.actual) &&
        camera.position.every((value, index) => Math.abs(value - draw.camera.position[index]) < 1e-8) && draw.width === cv.clientWidth && draw.height === cv.clientHeight;
    }, undefined, { polling: 100 });
    return verify(await read());
  };
  const pure = async action => { const before = await ready(); await action(); const after = await ready(); samePhysical(before, after); samePredictions(before, after); return after; };
  const capture = async label => {
    for (const [kind, locator] of [['stage', page.locator('.iss-station-stage')], ['panel', panel]]) {
      const file = `map-arm-reference-${label}-${kind}-${width}.png`; await locator.scrollIntoViewIfNeeded(); await ready();
      await locator.screenshot({ path: path.join(output, file), animations: 'disabled' }); result.screenshots.push(file);
    }
  };
  try {
    console.log(`Checking saved arm references at ${width}px`);
    await page.addInitScript(() => {
      window.AlloPostFXEnabled = false; window.__issArmReferenceClock = 0; window.__issArmReferenceNativeRAF = requestAnimationFrame.bind(window);
      window.requestAnimationFrame = callback => window.__issArmReferenceNativeRAF(() => callback(window.__issArmReferenceClock));
    });
    await page.route('**/vendor/three-r128/three.min.js', async route => {
      const response = await route.fetch(); assert(response.ok()); await route.fulfill({ response, body: (await response.text()) + '\n;(' + observeRenderer.toString() + ')();\n' });
    });
    await page.goto(`${base}/?tab=map`, { waitUntil: 'load' }); await panel.waitFor({ state: 'attached' });
    await page.evaluate(() => ['click', 'keydown', 'pointerdown'].forEach(type => document.addEventListener(type, event => {
      const node = event.target.closest('[data-iss-arm-reference-panel] button'); if (!node) return;
      window.__issArmReferenceQA.events.push({ type, key: event.key, pointerType: event.pointerType, trusted: event.isTrusted,
        action: Array.from(node.attributes).find(attribute => /^data-iss-arm-reference-(save|show|target|clear)$/.test(attribute.name))?.name });
    }, true)));
    let after = await ready(); assert(!after.arm.enabled && !after.panel.visible && !after.reference.saved);
    await activate(page.locator('[data-iss-arm-toggle]')); await activate(page.locator('[data-iss-arm-preset="high"]'));
    await canvas.evaluate(cv => { cv._issSetLighting({ motorEnabled: true, motorSmooth: true, tracking: false, arrayAlpha: 75, arrayFeather: 20 }); cv._issStepLighting(3); });
    await activate(page.locator('[data-iss-arm-stage-frame]')); after = await ready(); assert.equal(after.camera.focusId, 'arm');
    const beforeSave = after; after = await pure(() => activate(button('save')));
    keys.forEach(key => near(after.reference.saved.state[key], beforeSave.arm.actual[key])); near(after.reference.saved.seconds, beforeSave.arm.elapsed);
    if (!after.reference.show) after = await pure(() => activate(button('show')));
    near(after.reference.comparison.distance, 0); near(after.reference.comparison.elapsedSeconds, 0);
    const beforeQuarter = after; await activate(page.locator('[data-iss-arm-stage-step]')); after = await ready(); verifyAdvance(beforeQuarter, after, .25);
    assert(after.reference.comparison.distance > 0); near(after.reference.comparison.elapsedSeconds, .25);
    const beforeThree = after; await canvas.evaluate(cv => cv._issStepLighting(3)); after = await ready(); verifyAdvance(beforeThree, after, 3);
    near(after.reference.comparison.elapsedSeconds, 3.25); await capture('live'); result.checks.savedLivePoseAndIndependentGeometry = true;

    const beforePreview = after; await activate(page.locator('[data-iss-arm-stage-preview]')); after = await ready(); samePhysical(beforePreview, after);
    assert(after.preview.active && after.panel.visible);
    await canvas.evaluate(cv => cv._issSeekArmPreview(2.375)); after = await ready(); samePhysical(beforePreview, after);
    near(after.reference.comparison.elapsedSeconds, 5.625); assert.equal(after.reference.source, 'preview');
    const beforeReplace = after; after = await pure(() => activate(button('save')));
    keys.forEach(key => near(after.reference.saved.state[key], beforeReplace.arm.actual[key])); near(after.reference.saved.seconds, beforeReplace.arm.elapsed);
    assert(after.reference.comparison.distance > 0, 'Save during preview records the live pose, not the future pose'); near(after.reference.comparison.elapsedSeconds, 2.375);
    await capture('future'); result.checks.previewComparisonAndSaveLivePurity = true;

    after = await pure(async () => { await button('show').focus(); await page.keyboard.press('Space'); }); assert(!after.reference.show && !after.reference.visible);
    after = await pure(() => activate(button('show'))); assert(after.reference.visible);
    const retained = after.reference.saved;
    await button('show').focus(); const beforeDisable = after; await canvas.evaluate(cv => cv._issSetArm({ enabled: false })); after = await ready();
    samePhysical(beforeDisable, after); assert(!after.panel.visible && !after.reference.visible && after.preview.active);
    assert(after.focused.includes('data-iss-arm-toggle'), 'Disabling the inspector returns focus from its hidden panel');
    await activate(page.locator('[data-iss-arm-toggle]')); after = await ready(); assert(after.panel.visible && after.reference.visible && after.preview.active); assert.deepEqual(after.reference.saved, retained);
    result.checks.previewVisibilityKeyboardAndFocusPersistence = true;

    await activate(page.locator('[data-iss-arm-preview-stage-close]')); await activate(page.locator('[data-iss-arm-stage-brake]')); after = await ready(); assert(after.arm.actual.braking);
    await activate(page.locator('[data-iss-arm-stage-preview]')); after = await ready(); assert(after.preview.active);
    const beforeTarget = after; await activate(button('target')); after = await ready(); samePhysical(beforeTarget, after, { target: false, playing: false });
    assert(!after.preview.active && !after.forecast.active && !after.state.playing && after.arm.actual.braking);
    vectorNear(after.arm.target.attainable, pose(retained.state).tip); assert.equal(after.arm.target.branch, retained.state.elbow >= 0 ? 1 : -1);
    assert.deepEqual(after.reference.saved, retained);
    await activate(page.locator('[data-iss-forecast-toggle]')); after = await ready(); assert(after.forecast.active);
    const beforeArrayTarget = after; await activate(button('target')); after = await ready(); samePhysical(beforeArrayTarget, after, { target: false, playing: false }); assert(!after.forecast.active);
    result.checks.targetSavedEndpointPreservesMotionAndBrakeLatch = true;

    await activate(page.locator('[data-iss-arm-stage-rest]')); after = await ready();
    const beforeRestStep = after; await activate(page.locator('[data-iss-arm-stage-step]')); after = await ready(); verifyAdvance(beforeRestStep, after, .25);
    near(after.reference.comparison.distance, beforeRestStep.reference.comparison.distance); near(after.reference.comparison.elapsedSeconds, beforeRestStep.reference.comparison.elapsedSeconds + .25);
    await activate(page.locator('[data-iss-arm-stage-brake]')); await activate(page.locator('[data-iss-arm-stage-preview]')); after = await ready(); assert(after.preview.active);
    after = await pure(() => activate(button('clear'))); assert(!after.reference.saved && !after.reference.visible && after.preview.active);
    assert(after.focused.includes('data-iss-arm-reference-save'), 'Clearing returns focus to the available Save action');
    after = await pure(async () => { await button('save').focus(); await page.keyboard.press('Enter'); }); assert(after.reference.saved && after.preview.active);
    result.checks.restingClockUpdatesAndPureClearKeyboardSave = true;

    const layout = await page.evaluate(() => {
      const box = node => { const rect = node.getBoundingClientRect(); return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height }; };
      return { viewport: innerWidth, width: document.documentElement.scrollWidth, stage: box(document.querySelector('.iss-station-stage')), panel: box(document.querySelector('[data-iss-arm-reference-panel]')),
        controls: Array.from(document.querySelectorAll('[data-iss-arm-reference-panel] button'), box) };
    });
    assert(layout.width <= width + 1); assert(layout.panel.top >= layout.stage.bottom - 1, 'Saved comparison must not occlude the 3D viewport');
    layout.controls.forEach((control, index) => {
      assert(control.width > 0 && control.left >= -1 && control.right <= width + 1);
      assert(control.left >= layout.panel.left - 1 && control.right <= layout.panel.right + 1 && control.top >= layout.panel.top - 1 && control.bottom <= layout.panel.bottom + 1);
      if (phone) assert(control.height >= 43.9, 'Phone controls provide at least 44px targets');
      layout.controls.slice(index + 1).forEach(other => assert(Math.min(control.right, other.right) - Math.max(control.left, other.left) < 1 || Math.min(control.bottom, other.bottom) - Math.max(control.top, other.top) < 1, 'Reference controls must not overlap'));
    });
    await page.addScriptTag({ path: path.join(ROOT, 'desktop/web-app/node_modules/axe-core/axe.min.js') });
    const accessibility = await page.evaluate(async () => {
      const checked = await axe.run({ include: ['[data-iss-arm-reference-panel]'] }, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
      return { passes: checked.passes.length, violations: checked.violations.map(item => ({ id: item.id, targets: item.nodes.map(node => node.target) })) };
    });
    assert.deepEqual(accessibility.violations, []); result.checks.layout = layout; result.checks.accessibility = accessibility;
    after = await ready();
    for (const action of ['save', 'show', 'target', 'clear']) assert(after.events.some(event => event.action === 'data-iss-arm-reference-' + action && event.type === 'click' && event.trusted), `Trusted ${action} interaction exercised`);
    assert(after.events.some(event => event.action === 'data-iss-arm-reference-show' && event.type === 'keydown' && event.key === ' ' && event.trusted));
    assert(after.events.some(event => event.action === 'data-iss-arm-reference-save' && event.type === 'keydown' && event.key === 'Enter' && event.trusted));
    assert(after.events.some(event => event.type === 'pointerdown' && event.trusted && event.pointerType === (phone ? 'touch' : 'mouse')));
    result.errors = errors; result.hostErrors = await page.evaluate(() => window.__events?.errors || []); assert.deepEqual(errors, []); assert.deepEqual(result.hostErrors, []);
    result.passed = true; console.log(`Saved arm reference geometry, interactions, purity and accessibility passed at ${width}px`); return result;
  } catch (error) {
    result.passed = false; result.failure = error.stack || error.message; result.errors = errors; result.lastSnapshot = await read().catch(() => null); error.qaResult = result; throw error;
  } finally {
    try {
      result.checks.cleanup = await page.evaluate(() => {
        document.querySelector('.iss-station-stage canvas')?._issSetLighting?.({ playing: false }); window.__destroy?.();
        return { contexts: window.__issArmReferenceQA?.contexts.length || 0, lost: (window.__issArmReferenceQA?.contexts || []).map(gl => gl.isContextLost()), canvases: document.querySelectorAll('.iss-station-stage canvas').length };
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
  helpers = new Function(source.slice(source.indexOf('  var ISS_GM ='), source.indexOf('  function issTransferPlan(')) + '\nreturn { step: issMapArmStep };')();
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const results = []; let failure;
  try {
    for (const width of widths) {
      try { results.push(await runWidth(browser, width)); }
      catch (error) { results.push(error.qaResult || { width, passed: false, failure: error.stack || error.message }); failure = error; break; }
      finally { const temporary = path.join(output, 'results.json.tmp'); await fs.writeFile(temporary, JSON.stringify({ base, results }, null, 2) + '\n'); await fs.rename(temporary, path.join(output, 'results.json')); }
    }
  } finally { await browser.close(); }
  if (failure) throw failure;
  console.log(`Saved arm reference checks passed: ${widths.join(', ')}px. Results: ${output}`);
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
