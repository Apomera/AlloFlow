#!/usr/bin/env node
'use strict';

// Actual-WebGL transport checks against the existing preview server. Native
// animation frames still render; controlled timestamps make timing deterministic.
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
const output = path.resolve(ROOT, argument('--out', 'reports/space-station-enhancement-qa/map-forecast-playback-browser'));
const widths = argument('--widths', '1440,390').split(',').map(Number);
assert(widths.length && widths.every(width => Number.isInteger(width) && width >= 320));
const near = (actual, expected, tolerance = 1e-7) => {
  assert(Number.isFinite(actual) && Number.isFinite(expected), `Finite values required: ${actual}, ${expected}`);
  assert(Math.abs(actual - expected) <= tolerance, `${actual} should equal ${expected} within ${tolerance}`);
};
const vectorNear = (actual, expected, tolerance = 1e-6) => {
  assert(Array.isArray(actual) && actual.length === expected.length);
  actual.forEach((value, index) => near(value, expected[index], tolerance));
};
const physicalKeys = ['phase', 'beta', 'rate', 'motorRate', 'motorAcceleration', 'arrayAlpha', 'arrayFeather',
  'actualAlphaRate', 'actualFeatherRate', 'commandAlpha', 'commandFeather', 'driveError', 'driveElapsed', 'incidence', 'generation'];
const physicalFlags = ['playing', 'tracking', 'motorEnabled', 'motorSmooth', 'eclipse', 'commandVisible'];
function frozen(before, after) {
  for (const key of physicalKeys) near(after.state[key], before.state[key]);
  for (const key of physicalFlags) assert.equal(after.state[key], before.state[key], `Preview preserves live ${key}`);
  vectorNear(after.state.wingNormal, before.state.wingNormal); vectorNear(after.state.sun, before.state.sun);
}
function sameCamera(before, after) {
  for (const key of ['position', 'target', 'stationQuaternion']) vectorNear(after.camera[key], before.camera[key]);
  for (const key of ['focusId', 'view', 'guides', 'tweening']) assert.equal(after.camera[key], before.camera[key]);
  near(after.camera.distance, before.camera.distance);
}

function observeRenderer() {
  const Original = window.THREE.WebGLRenderer;
  window.__issForecastPlaybackQA = { draw: null, sequence: 0, contexts: [], events: [] };
  function ObservedRenderer(options) {
    const renderer = new Original(options), render = renderer.render;
    window.__issForecastPlaybackQA.contexts.push(renderer.getContext());
    renderer.render = function (scene, camera) {
      const returned = render.apply(this, arguments), cv = renderer.domElement;
      if (scene.name === 'iss-station-inspection' && cv._issForecastState) {
        const qa = window.__issForecastPlaybackQA, ghost = scene.getObjectByName('iss-array-forecast');
        const tip = scene.getObjectByName('iss-array-forecast-tip');
        qa.draw = { sequence: ++qa.sequence, state: cv._issLightingState(), forecast: cv._issForecastState(),
          ghost: ghost ? { visible: ghost.visible, quaternion: ghost.quaternion.toArray() } : null,
          tip: tip ? { visible: tip.visible, position: tip.position.toArray() } : null,
          pivot: scene.getObjectByName('iss-array-wing-2')?.position.toArray() };
      }
      return returned;
    };
    return renderer;
  }
  ObservedRenderer.prototype = Original.prototype; Object.setPrototypeOf(ObservedRenderer, Original);
  window.THREE.WebGLRenderer = ObservedRenderer;
}

function verify(snapshot) {
  const f = snapshot.forecast, d = snapshot.draw;
  assert(d?.ghost && d.tip, 'Forecast objects exist in the rendered WebGL station scene');
  assert.equal(snapshot.glLost, false); assert.equal(snapshot.state.playing, false);
  assert.equal(d.forecast.active, f.active);
  assert([.1, 1, 10, 60].includes(f.rate)); assert.equal(typeof f.stopAtCrossings, 'boolean');
  for (const select of snapshot.rates) {
    assert.equal(select.value, f.rate); assert.deepEqual(select.options.map(option => option.value), [.1, 1, 10, 60]);
    assert(select.label.trim(), 'Playback rate select has an accessible name');
    assert(select.options.every(option => option.text.trim()));
  }
  assert.equal(snapshot.rates.length, 2); assert.equal(snapshot.stopPressed, String(f.stopAtCrossings));
  for (const play of snapshot.playButtons) {
    assert.equal(play.pressed, String(f.playing));
    if (f.playing) assert(/pause/i.test(play.label), 'Playing transport exposes its pause action');
    else assert(play.label.includes(String(f.rate)), 'Play control names the selected rate');
  }
  assert.equal(snapshot.playButtons.length, 2);
  if (!f.active) { assert.equal(d.ghost.visible, false); assert.equal(f.stopReason, null); return snapshot; }
  near(d.forecast.seconds, f.seconds); near(f.selected.seconds, f.seconds);
  assert.equal(d.ghost.visible, f.seconds > 0); assert.equal(d.tip.visible, true);
  vectorNear(d.tip.position, f.selected.corner.map((value, index) => value + d.pivot[index]));
  const a = f.selected.alpha * Math.PI / 360, z = f.selected.feather * Math.PI / 360;
  vectorNear(d.ghost.quaternion, [Math.sin(a) * Math.cos(z), -Math.sin(a) * Math.sin(z), Math.cos(a) * Math.sin(z), Math.cos(a) * Math.cos(z)]);
  return snapshot;
}

async function runWidth(browser, width) {
  const phone = width < 500, errors = [], result = { width, touch: phone, checks: {}, screenshots: [] };
  const page = await browser.newPage({ viewport: { width, height: phone ? 844 : 1080 }, deviceScaleFactor: 1,
    isMobile: phone, hasTouch: phone, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000); page.on('pageerror', error => errors.push(error.stack || error.message));
  const canvas = page.locator('.iss-station-stage canvas'), stage = page.locator('.iss-station-stage');
  const content = page.locator('[data-iss-forecast-content]'), toggle = page.locator('[data-iss-forecast-toggle]');
  const stagePlay = page.locator('[data-iss-forecast-stage-play]');
  const stop = page.locator('[data-iss-forecast-event-stop]');
  const activate = async locator => phone ? locator.tap() : locator.click();
  const read = () => canvas.evaluate(cv => {
    const gl = cv.getContext('webgl2') || cv.getContext('webgl');
    return { state: cv._issLightingState(), forecast: cv._issForecastState(), camera: cv._issCameraState(),
      draw: window.__issForecastPlaybackQA.draw, glLost: gl ? gl.isContextLost() : null,
      status: document.querySelector('[data-iss-forecast-status]')?.textContent || '',
      stopPressed: document.querySelector('[data-iss-forecast-event-stop]')?.getAttribute('aria-pressed'),
      rates: Array.from(document.querySelectorAll('[data-iss-forecast-rate]'), node => ({
        location: node.getAttribute('data-iss-forecast-rate'), value: Number(node.value),
        label: node.getAttribute('aria-label') || Array.from(node.labels || [], label => label.textContent).join(' '),
        options: Array.from(node.options, option => ({ value: Number(option.value), text: option.textContent })) })),
      playButtons: Array.from(document.querySelectorAll('[data-iss-forecast-play]'), node => ({
        pressed: node.getAttribute('aria-pressed'), label: node.getAttribute('aria-label') || node.textContent, text: node.textContent })),
      events: window.__issForecastPlaybackQA.events.slice(-40) };
  });
  const ready = async () => {
    await page.waitForFunction(() => {
      const cv = document.querySelector('.iss-station-stage canvas'), d = window.__issForecastPlaybackQA?.draw;
      if (!cv?._issForecastState || !d) return false;
      const f = cv._issForecastState(), s = cv._issLightingState();
      return !s.playing && !cv._issCameraState().tweening && d.forecast.active === f.active &&
        (!f.active || Math.abs(d.forecast.seconds - f.seconds) < 1e-8) &&
        ['phase', 'beta', 'arrayAlpha', 'arrayFeather'].every(key => Math.abs(d.state[key] - s[key]) < 1e-8);
    }, undefined, { polling: 100 });
    return verify(await read());
  };
  // Each call permits two real browser frames with the same timestamp. The first
  // advances physics once and the second confirms no additional elapsed time.
  const frame = async (milliseconds = 0) => {
    await page.evaluate(ms => new Promise(resolve => {
      window.__issPlaybackClock += ms;
      window.__issPlaybackNativeRAF(() => window.__issPlaybackNativeRAF(() => resolve()));
    }), milliseconds);
    return ready();
  };
  const selectRate = async (location, rate) => {
    const selector = page.locator(`[data-iss-forecast-rate="${location}"]`), index = [.1, 1, 10, 60].indexOf(rate);
    assert(index >= 0); await selector.focus(); await page.keyboard.press('Home');
    for (let cursor = 0; cursor < index; cursor++) await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    const after = await ready(); assert.equal(after.forecast.rate, rate);
    assert(after.events.some(event => event.type === 'change' && event.location === location && event.trusted), 'Native select change is trusted');
    return after;
  };
  const configure = async (settings, warmup = 0) => {
    await canvas.evaluate((cv, input) => {
      cv._issSetLighting(input.settings); if (input.warmup) cv._issStepLighting(input.warmup);
      cv._issToggleForecast(true);
    }, { settings, warmup });
    const after = await ready(); assert(after.forecast.active); near(after.forecast.seconds, 300); return after;
  };
  const capture = async label => {
    const before = await ready(); assert(!before.forecast.playing); await page.evaluate(() => document.activeElement?.blur());
    for (const [locator, suffix] of [[stage, 'stage'], [content, 'controls']]) {
      await locator.evaluate(node => node.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'nearest' }));
      const samples = []; let consecutive = 0;
      for (let attempt = 0; attempt < 12; attempt++) {
        const sample = await locator.evaluate(node => {
          const box = node.getBoundingClientRect(), cv = document.querySelector('.iss-station-stage canvas');
          return { x: box.x, y: box.y, width: box.width, height: box.height, scrollX, scrollY,
            livePlaying: cv._issLightingState().playing, previewPlaying: cv._issForecastState().playing,
            seconds: cv._issForecastState().seconds, tweening: cv._issCameraState().tweening };
        });
        samples.push(sample); assert(!sample.livePlaying && !sample.previewPlaying); near(sample.seconds, before.forecast.seconds);
        assert(sample.width > 0 && sample.height > 0);
        const previous = samples.at(-2), stable = previous && ['x', 'y', 'width', 'height', 'scrollX', 'scrollY'].every(key => Math.abs(sample[key] - previous[key]) < .25);
        consecutive = stable && !sample.tweening ? consecutive + 1 : 0;
        if (consecutive >= 2) break; await page.waitForTimeout(150);
      }
      assert(consecutive >= 2, 'Screenshot layout stabilizes within the bounded check');
      const bounds = samples.at(-1), filename = `map-forecast-playback-${label}-${suffix}-${width}.png`;
      const session = await page.context().newCDPSession(page);
      try {
        const shot = await session.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: true,
          clip: { x: bounds.x + bounds.scrollX, y: bounds.y + bounds.scrollY, width: bounds.width, height: bounds.height, scale: 1 } });
        await fs.writeFile(path.join(output, filename), Buffer.from(shot.data, 'base64'));
      } finally { await session.detach(); }
      result.screenshots.push(filename);
    }
    const after = await read(); frozen(before, after); assert.deepEqual(after.forecast, before.forecast);
  };
  try {
    console.log(`Checking forecast playback at ${width}px`);
    await page.addInitScript(() => {
      window.AlloPostFXEnabled = false; window.__issPlaybackClock = 0;
      window.__issPlaybackNativeRAF = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = callback => window.__issPlaybackNativeRAF(() => callback(window.__issPlaybackClock));
    });
    await page.route('**/vendor/three-r128/three.min.js', async route => {
      const response = await route.fetch(); assert(response.ok());
      await route.fulfill({ response, body: (await response.text()) + '\n;(' + observeRenderer.toString() + ')();\n' });
    });
    await page.goto(`${base}/?tab=map`, { waitUntil: 'load' }); await toggle.waitFor(); await ready();
    await page.evaluate(() => {
      for (const type of ['change', 'click']) document.addEventListener(type, event => {
        const node = event.target.closest('[data-iss-forecast-rate],[data-iss-forecast-event-stop],[data-iss-forecast-play]');
        if (node) window.__issForecastPlaybackQA.events.push({ type, location: node.getAttribute('data-iss-forecast-rate'),
          stop: node.hasAttribute('data-iss-forecast-event-stop'), play: node.hasAttribute('data-iss-forecast-play'), trusted: event.isTrusted });
      }, true);
    });
    let after = await configure({ phase: 35, beta: 80, motorEnabled: true, motorSmooth: true, motorRate: .08,
      motorAcceleration: .002, tracking: false, arrayAlpha: -60, arrayFeather: 25 }, 40);
    assert.equal(after.forecast.rate, 60); assert.equal(after.forecast.stopAtCrossings, false); assert.equal(after.forecast.stopReason, null);
    const start = after;
    after = await selectRate('panel', .1); frozen(start, after); sameCamera(start, after);
    assert.deepEqual(after.forecast.selected, start.forecast.selected);
    await activate(stagePlay); await frame(); after = await frame(200);
    near(after.forecast.seconds, 300.02, 1e-8); assert(after.forecast.playing); frozen(start, after);
    const beforeFast = after; after = await selectRate('stage', 60);
    assert(after.forecast.playing); near(after.forecast.seconds, beforeFast.forecast.seconds); frozen(beforeFast, after); sameCamera(beforeFast, after);
    await frame(); after = await frame(200); near(after.forecast.seconds, 312.02, 1e-8); frozen(start, after);
    const atomic = await canvas.evaluate(cv => {
      const before = { forecast: cv._issForecastState(), state: cv._issLightingState(), camera: cv._issCameraState() };
      // The setting changes between frames after elapsed wall time. Resetting
      // its clock prevents charging this old interval at the newly chosen rate.
      window.__issPlaybackClock += 200;
      cv._issSetForecastTransport({ rate: '10', stopAtCrossings: true });
      const after = { forecast: cv._issForecastState(), state: cv._issLightingState(), camera: cv._issCameraState() };
      cv._issSetForecastTransport({ rate: 999, stopAtCrossings: 'false' });
      return { before, after, invalid: cv._issForecastState() };
    });
    assert(atomic.before.forecast.playing && atomic.after.forecast.playing); near(atomic.before.forecast.seconds, atomic.after.forecast.seconds);
    assert.deepEqual(atomic.before.forecast.selected, atomic.after.forecast.selected); frozen(atomic.before, atomic.after); sameCamera(atomic.before, atomic.after);
    assert.equal(atomic.after.forecast.rate, 10); assert.equal(atomic.after.forecast.stopAtCrossings, true);
    assert.deepEqual(atomic.invalid, atomic.after.forecast);
    after = await frame(); near(after.forecast.seconds, atomic.after.forecast.seconds);
    after = await frame(100); near(after.forecast.seconds, atomic.after.forecast.seconds + 1);
    await activate(stagePlay); after = await ready(); assert(!after.forecast.playing);
    result.checks.rates = { slowAdvance: .02, fastAdvance: 12, stringRate: true, invalidIgnored: true,
      bothTrustedSelectsSynchronized: true, settingsPreservePlaybackCursorPhysicsAndCamera: true, liveFrozen: true };

    const period = after.state.periodSeconds, half = .4 * 360 / period, limit = Math.sqrt(1 - (6371 / 6791) ** 2);
    const beta = Math.acos(limit / Math.cos(half * Math.PI / 180)) * 180 / Math.PI;
    after = await configure({ phase: 180 - half - 70 * 360 / period, beta, motorEnabled: true, motorSmooth: true,
      motorRate: .08, motorAcceleration: .002, tracking: false, arrayAlpha: 100, arrayFeather: -35 }, 40);
    const events = after.forecast.sunlight.events; assert.equal(events.length, 2);
    assert.equal(events[0].type, 'sunset'); assert.equal(events[1].type, 'sunrise'); near(events[1].seconds - events[0].seconds, .8, 1e-5);
    await canvas.evaluate((cv, seconds) => { cv._issSetForecastTransport({ rate: 60, stopAtCrossings: false }); cv._issSeekForecastTime(seconds - .2); }, events[0].seconds);
    await activate(stop); after = await ready(); assert(after.forecast.stopAtCrossings);
    assert(after.events.some(event => event.stop && event.trusted && event.type === 'click'));
    const beforeCrossing = after; await activate(stagePlay); await frame(); after = await frame(250);
    near(after.forecast.seconds, events[0].seconds, 1e-10); assert(!after.forecast.playing);
    assert.deepEqual(after.forecast.stopReason, { type: 'sunset', seconds: events[0].seconds, index: 0 });
    assert(/paused at sunset/i.test(after.status) && /play/i.test(after.status)); frozen(beforeCrossing, after); sameCamera(beforeCrossing, after);
    const detached = await canvas.evaluate(cv => {
      const original = cv._issForecastState().stopReason, changed = cv._issForecastState();
      changed.stopReason.seconds = 999; return { original, fresh: cv._issForecastState().stopReason };
    });
    assert.deepEqual(detached.original, detached.fresh);
    await capture('sunset-stop');
    await activate(stagePlay); after = await frame(); assert(after.forecast.playing); assert.equal(after.forecast.stopReason, null);
    after = await frame(250); near(after.forecast.seconds, events[1].seconds, 1e-10); assert(!after.forecast.playing);
    assert.deepEqual(after.forecast.stopReason, { type: 'sunrise', seconds: events[1].seconds, index: 1 });
    assert(/paused at sunrise/i.test(after.status) && /play/i.test(after.status)); frozen(beforeCrossing, after);
    result.checks.grazing = { durationSeconds: events[1].seconds - events[0].seconds, frameTravelWithoutStopSeconds: 15,
      firstCrossingExact: true, resumeSkipsCurrentCrossing: true, secondCrossingExact: true, detachedReason: true };

    const beforeApply = after, selected = after.forecast.selected;
    await activate(page.locator('[data-iss-forecast-apply]')); after = await ready(); assert(!after.forecast.active);
    for (const [actual, expected] of [['phase', 'phase'], ['arrayAlpha', 'alpha'], ['arrayFeather', 'feather'],
      ['actualAlphaRate', 'alphaRate'], ['actualFeatherRate', 'featherRate']]) near(after.state[actual], selected[expected], 1e-10);
    near(after.state.driveElapsed, beforeApply.state.driveElapsed + selected.seconds, 1e-10); sameCamera(beforeApply, after);
    result.checks.exactBoundaryApply = { seconds: selected.seconds, phaseAndMotorPositionAndVelocityPreserved: true };

    after = await configure({ phase: 180 - half - 30 * 360 / period, beta });
    assert(after.forecast.stopAtCrossings); await activate(stop); after = await ready(); assert(!after.forecast.stopAtCrossings);
    const bypassEvents = after.forecast.sunlight.events; assert.equal(bypassEvents.length, 2);
    await canvas.evaluate((cv, seconds) => cv._issSeekForecastTime(seconds - .2), bypassEvents[0].seconds);
    await activate(stagePlay); await frame(); after = await frame(250);
    near(after.forecast.seconds, bypassEvents[0].seconds + 14.8, 1e-8); assert(after.forecast.playing); assert.equal(after.forecast.stopReason, null);
    await activate(stagePlay); await ready(); result.checks.crossingsDisabledContinue = true;

    await canvas.evaluate(cv => { cv._issSeekForecastTime(599.9); cv._issPlayForecast(true); });
    await frame(); after = await frame(100); near(after.forecast.seconds, 600); assert(!after.forecast.playing);
    assert.equal(after.forecast.stopReason?.type, 'end'); near(after.forecast.stopReason.seconds, 600);
    await activate(stagePlay); after = await frame(); near(after.forecast.seconds, 0); assert(after.forecast.playing); assert.equal(after.forecast.stopReason, null);
    after = await frame(100); near(after.forecast.seconds, 6); await activate(stagePlay); await ready();
    result.checks.horizonAndRestart = true;

    await selectRate('panel', 1); await activate(stop); after = await ready(); assert(after.forecast.stopAtCrossings);
    await activate(page.locator('[data-iss-forecast-close]')); after = await ready(); assert(!after.forecast.active);
    assert.equal(after.forecast.rate, 1); assert(after.forecast.stopAtCrossings);
    await activate(toggle); after = await ready(); assert.equal(after.forecast.rate, 1); assert(after.forecast.stopAtCrossings); assert.equal(after.forecast.stopReason, null);
    await activate(stagePlay); await frame(); after = await frame(100); const beforeHidden = after;
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      try { document.dispatchEvent(new Event('visibilitychange')); } finally { delete document.hidden; }
    });
    after = await frame(250); assert(after.forecast.active && !after.forecast.playing); near(after.forecast.seconds, beforeHidden.forecast.seconds);
    frozen(beforeHidden, after); assert.equal(after.forecast.rate, 1); assert(after.forecast.stopAtCrossings);
    await canvas.evaluate(cv => cv._issSeekForecastTime(100.1)); after = await ready(); assert.equal(after.forecast.stopReason, null);
    result.checks.lifecycle = { preferencesSurviveCloseAndRegenerate: true, hiddenPausesWithoutAdvance: true, seekClearsStopReason: true };
    await capture('transport');

    const layout = await page.evaluate(() => {
      const bounds = node => { const b = node.getBoundingClientRect(); return { left: b.left, right: b.right, top: b.top, bottom: b.bottom,
        width: b.width, height: b.height, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth }; };
      return { viewport: innerWidth, width: document.documentElement.scrollWidth,
        canvas: bounds(document.querySelector('.iss-station-stage canvas')), stage: bounds(document.querySelector('[data-iss-forecast-stage]')),
        controls: Array.from(document.querySelectorAll('[data-iss-forecast-rate],[data-iss-forecast-event-stop],[data-iss-forecast-play]'), node => ({
          ...bounds(node), type: node.tagName, label: node.getAttribute('aria-label') || node.textContent.trim() })) };
    });
    assert(layout.width <= width + 1);
    if (phone) assert(layout.stage.top >= layout.canvas.bottom, 'Phone preview transport stays below the canvas');
    for (const node of layout.controls.filter(node => node.width && node.height)) {
      assert(node.left >= -1 && node.right <= width + 1, `Control exceeds viewport: ${JSON.stringify(node)}`);
      if (node.clientWidth) assert(node.scrollWidth <= node.clientWidth + 1, `Control content overflows: ${JSON.stringify(node)}`);
    }
    await page.addScriptTag({ path: path.join(ROOT, 'desktop/web-app/node_modules/axe-core/axe.min.js') });
    const accessibility = await page.evaluate(async () => {
      const checked = await axe.run({ include: ['[data-iss-forecast-content]', '[data-iss-forecast-stage]'] }, {
        rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
      return { passes: checked.passes.length, violations: checked.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })) };
    });
    assert.deepEqual(accessibility.violations, []); result.checks.layout = layout; result.checks.accessibility = accessibility;
    result.errors = errors; result.hostErrors = await page.evaluate(() => window.__events?.errors || []);
    assert.deepEqual(errors, []); assert.deepEqual(result.hostErrors, []); result.passed = true;
    console.log(`Forecast rates, exact crossing stops, lifecycle, rendering and accessibility passed at ${width}px`);
    return result;
  } catch (error) {
    result.passed = false; result.failure = error.stack || error.message; result.errors = errors;
    result.lastSnapshot = await read().catch(() => null); error.qaResult = result; throw error;
  } finally {
    try {
      result.checks.cleanup = await page.evaluate(() => {
        document.querySelector('.iss-station-stage canvas')?._issSetLighting?.({ playing: false }); window.__destroy?.();
        return { contexts: window.__issForecastPlaybackQA?.contexts.length || 0,
          lost: (window.__issForecastPlaybackQA?.contexts || []).map(gl => gl.isContextLost()), canvases: document.querySelectorAll('.iss-station-stage canvas').length };
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
  console.log(`Forecast playback checks passed: ${widths.join(', ')}px. Results: ${output}`);
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
