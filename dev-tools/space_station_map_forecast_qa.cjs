#!/usr/bin/env node
'use strict';

// Real-WebGL browser checks for the cached solar-array forecast and continuous time controls.
// Uses the existing preview; never starts a second server.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const argument = (name, fallback) => {
  const value = process.argv.slice(2).find(item => item.startsWith(name + '='));
  return value ? value.slice(name.length + 1) : fallback;
};
const base = argument('--base', 'http://127.0.0.1:4179').replace(/\/$/, '');
const output = path.resolve(ROOT, argument('--out', 'reports/space-station-enhancement-qa/map-forecast-browser'));
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
const poseCorner = (alpha, feather) => {
  const a = alpha * Math.PI / 180, f = feather * Math.PI / 180;
  const x = .45 * Math.cos(f) - .02 * Math.sin(f), y = .45 * Math.sin(f) + .02 * Math.cos(f);
  return [x, y * Math.cos(a) - 3.7 * Math.sin(a), y * Math.sin(a) + 3.7 * Math.cos(a)];
};
const cameraPose = camera => Object.fromEntries(['position', 'target', 'distance', 'focusId', 'view', 'stationQuaternion', 'guides'].map(key => [key, camera[key]]));
const numericKeys = ['phase', 'beta', 'rate', 'motorRate', 'motorAcceleration', 'arrayAlpha', 'arrayFeather',
  'actualAlphaRate', 'actualFeatherRate', 'commandAlpha', 'commandFeather', 'driveError', 'driveElapsed', 'incidence', 'generation'];
const booleanKeys = ['tracking', 'motorEnabled', 'motorSmooth', 'eclipse', 'commandVisible'];
function preservePhysical(before, after, includeCamera = true) {
  for (const key of numericKeys) near(after.state[key], before.state[key]);
  for (const key of booleanKeys) assert.equal(after.state[key], before.state[key], `Forecast preserves ${key}`);
  vectorNear(after.state.wingNormal, before.state.wingNormal); vectorNear(after.state.sun, before.state.sun);
  if (includeCamera) assert.deepEqual(cameraPose(after.camera), cameraPose(before.camera));
}

function observeRenderer() {
  const Original = window.THREE.WebGLRenderer;
  window.__issForecastQA = { contexts: [], draw: null, sequence: 0, events: [] };
  function ObservedRenderer(options) {
    const renderer = new Original(options), render = renderer.render;
    window.__issForecastQA.contexts.push(renderer.getContext());
    renderer.render = function (scene, camera) {
      const returned = render.apply(this, arguments), cv = renderer.domElement;
      if (scene.name === 'iss-station-inspection' && cv._issForecastState) {
        const get = name => scene.getObjectByName(name);
        const wing = get('iss-array-wing-0'), anchor = get('iss-array-wing-2'), future = get('iss-array-forecast');
        const line = get('iss-array-forecast-path'), tip = get('iss-array-forecast-tip'), command = get('iss-array-command');
        const quaternion = object => {
          const q = new window.THREE.Quaternion(); if (object) object.getWorldQuaternion(q); return q.toArray();
        };
        const position = object => {
          const p = new window.THREE.Vector3(); if (object) object.getWorldPosition(p); return p.toArray();
        };
        const attribute = line?.geometry?.getAttribute('position');
        window.__issForecastQA.draw = { sequence: ++window.__issForecastQA.sequence,
          state: cv._issLightingState(), forecast: cv._issForecastState(), camera: camera.position.toArray(),
          wing: { found: !!wing, quaternion: quaternion(wing) },
          command: { found: !!command, visible: !!command?.visible, quaternion: quaternion(command) },
          future: { found: !!future, visible: !!future?.visible, quaternion: quaternion(future), position: position(future), anchor: position(anchor) },
          path: { found: !!line, visible: !!line?.visible, parent: line?.parent?.name,
            vertices: attribute ? Array.from({ length: attribute.count }, (_, index) => [attribute.getX(index), attribute.getY(index), attribute.getZ(index)]) : [] },
          tip: { found: !!tip, visible: !!tip?.visible, parent: tip?.parent?.name, position: tip?.position.toArray() || null } };
      }
      return returned;
    };
    return renderer;
  }
  ObservedRenderer.prototype = Original.prototype; Object.setPrototypeOf(ObservedRenderer, Original);
  window.THREE.WebGLRenderer = ObservedRenderer;
}

function verifySample(sample, initial) {
  for (const key of ['seconds', 'phase', 'alpha', 'feather', 'alphaRate', 'featherRate', 'commandAlpha', 'commandFeather', 'jointError', 'incidence', 'generation']) {
      assert(Number.isFinite(sample[key]), `${key} is finite in a forecast sample`);
  }
  near(wrap(sample.phase - initial.phase), wrap(sample.seconds * 360 / initial.periodSeconds));
  const normal = poseNormal(sample.alpha, sample.feather), b = initial.beta * Math.PI / 180, p = sample.phase * Math.PI / 180;
  const sun = [Math.sin(b), Math.cos(b) * Math.cos(p), Math.cos(b) * Math.sin(p)];
  vectorNear(sample.normal, normal); vectorNear(sample.sun, sun); vectorNear(sample.corner, poseCorner(sample.alpha, sample.feather));
  const incidence = Math.max(0, Math.min(1, dot(normal, sun))), radiusRatio = 6371 / (6371 + 420);
  const eclipse = sun[1] < 0 && 1 - sun[1] * sun[1] < radiusRatio * radiusRatio;
  assert.equal(sample.eclipse, eclipse); near(sample.incidence, incidence); near(sample.generation, eclipse ? 0 : incidence);
  const error = Math.max(Math.abs(wrap(sample.commandAlpha - sample.alpha)), Math.abs(sample.commandFeather - sample.feather));
  near(sample.jointError, error);
  assert(sample.feather >= -90 && sample.feather <= 90);
  if (initial.tracking) { near(wrap(sample.commandAlpha - sample.phase), 0); near(sample.commandFeather, -initial.beta); }
  else { near(wrap(sample.commandAlpha - initial.commandAlpha), 0); near(sample.commandFeather, initial.commandFeather); }
}

function verify(snapshot, cached) {
  const s = snapshot.state, f = snapshot.forecast, d = snapshot.draw;
  assert(d?.wing.found && d.command.found && d.future.found && d.path.found && d.tip.found, 'All actual, commanded and forecast geometry exists');
  assert.equal(snapshot.glLost, false); assert.equal(s.playing, false);
  near(Math.abs(dot(d.wing.quaternion, poseQuaternion(s.arrayAlpha, s.arrayFeather))), 1);
  near(Math.abs(dot(d.command.quaternion, poseQuaternion(s.commandAlpha, s.commandFeather))), 1);
  for (const key of numericKeys) near(d.state[key], s[key]);
  vectorNear(d.camera, snapshot.camera.position);
  assert.equal(snapshot.toggle, String(f.active)); assert.equal(snapshot.contentVisible, f.active);
  assert.equal(d.forecast.active, f.active); assert.equal(d.path.visible, f.active); assert.equal(d.tip.visible, f.active);
  assert.equal(d.future.visible, f.active && f.seconds > 0);
  assert.equal(snapshot.closeVisible, f.active);
  if (!f.active) return snapshot;
  assert.equal(f.sampleCount, 41); near(f.horizonSeconds, 600); assert(f.index >= 0 && f.index <= 40);
  const selected = f.selected; near(selected.seconds, f.seconds); assert.equal(d.forecast.index, f.index); near(d.forecast.seconds, f.seconds);
  assert.equal(f.index, Math.min(40, Math.floor(f.seconds / 15))); verifySample(selected, s);
  assert.equal(snapshot.applyDisabled, f.seconds === 0); near(snapshot.slider.value, Math.round(f.seconds * 10) / 10);
  near(snapshot.slider.min, 0); near(snapshot.slider.max, 600); near(snapshot.slider.step, .1);
  near(snapshot.stageSlider.value, Math.round(f.seconds * 10) / 10); near(snapshot.stageSlider.min, 0); near(snapshot.stageSlider.max, 600); near(snapshot.stageSlider.step, .1);
  assert(snapshot.stageSlider.label && snapshot.stageSlider.valueText, 'The visible 3D scrubber has a name and selected-time description');
  assert.equal(snapshot.chart.role, 'slider'); assert.equal(snapshot.chart.tabindex, '0');
  assert(snapshot.chart.label && snapshot.chart.valueText, 'The forecast chart has an accessible name and selected-value description');
  near(Math.abs(dot(d.future.quaternion, poseQuaternion(selected.alpha, selected.feather))), 1);
  vectorNear(d.future.position, d.future.anchor);
  const selectedTip = poseCorner(selected.alpha, selected.feather).map((value, index) => value + d.future.anchor[index]);
  vectorNear(d.tip.position, selectedTip, 2e-5);
  assert.equal(d.path.parent, 'iss-inspected-station'); assert.equal(d.tip.parent, 'iss-inspected-station');
  const mappings = { time: 'seconds', alpha: 'alpha', feather: 'feather', error: 'jointError', input: 'generation', 'alpha-rate': 'alphaRate', 'feather-rate': 'featherRate' };
  for (const [reading, key] of Object.entries(mappings)) near(snapshot.readings[reading], selected[key] * (reading === 'input' ? 100 : 1));
  assert(snapshot.readings.state.trim());
  near(snapshot.dot[0], 40 + 540 * selected.seconds / 600, 1e-4);
  near(snapshot.dot[1], 154 - 130 * selected.jointError / 180, 1e-4); near(snapshot.cursor, snapshot.dot[0], 1e-4);
  assert.equal(snapshot.points.length, 41); assert.equal(d.path.vertices.length, 41);
  if (cached) {
    if (selected.seconds === cached[f.index].seconds) {
      assert.deepEqual(selected, cached[f.index], 'An exact knot retains the original cached state, including velocities');
    }
    for (let index = 0; index < cached.length; index++) {
      const sample = cached[index], corner = poseCorner(sample.alpha, sample.feather);
      vectorNear(d.path.vertices[index], corner.map((value, axis) => value + d.future.anchor[axis]), 2e-5);
      vectorNear(snapshot.points[index], [40 + 540 * sample.seconds / 600, 154 - 130 * sample.jointError / 180], 1e-4);
    }
  }
  return snapshot;
}

async function runWidth(browser, width) {
  const phone = width < 500, errors = [], result = { width, touch: phone, checks: {}, screenshots: [] };
  const page = await browser.newPage({ viewport: { width, height: phone ? 844 : 1080 }, deviceScaleFactor: 1,
    isMobile: phone, hasTouch: phone, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000); page.on('pageerror', error => errors.push(error.stack || error.message));
  const canvas = page.locator('.iss-station-stage canvas'), stage = page.locator('.iss-station-stage');
  const toggle = page.locator('[data-iss-forecast-toggle]'), content = page.locator('[data-iss-forecast-content]');
  const chart = page.locator('[data-iss-forecast-chart]'), slider = page.locator('[data-iss-forecast-slider]');
  const stageSlider = page.locator('[data-iss-forecast-stage-slider]');
  const apply = page.locator('[data-iss-forecast-apply]');
  const activate = async locator => { if (phone) await locator.tap(); else { await locator.focus(); await page.keyboard.press('Enter'); } };
  let cached = null;
  const read = () => canvas.evaluate(cv => {
    const query = selector => document.querySelector(selector), visible = node => !!node && !node.closest('[hidden]') &&
      getComputedStyle(node).display !== 'none' && getComputedStyle(node).visibility !== 'hidden' && node.getBoundingClientRect().width > 0;
    const chart = query('[data-iss-forecast-chart]'), slider = query('[data-iss-forecast-slider]'), stageSlider = query('[data-iss-forecast-stage-slider]'), line = query('[data-iss-forecast-error]');
    const numbers = (line?.getAttribute('points')?.match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi) || []).map(Number);
    const selected = query('[data-iss-forecast-dot]'), cursor = query('[data-iss-forecast-cursor]'), gl = cv.getContext('webgl2') || cv.getContext('webgl');
    return { state: cv._issLightingState(), camera: cv._issCameraState(), forecast: cv._issForecastState(), draw: window.__issForecastQA.draw,
      toggle: query('[data-iss-forecast-toggle]')?.getAttribute('aria-pressed'), contentVisible: visible(query('[data-iss-forecast-content]')),
      closeVisible: visible(query('[data-iss-forecast-close]')), applyDisabled: query('[data-iss-forecast-apply]')?.disabled,
      slider: { value: Number(slider?.value), min: Number(slider?.min), max: Number(slider?.max), step: Number(slider?.step) },
      stageSlider: { value: Number(stageSlider?.value), min: Number(stageSlider?.min), max: Number(stageSlider?.max), step: Number(stageSlider?.step),
        label: stageSlider?.getAttribute('aria-label'), valueText: stageSlider?.getAttribute('aria-valuetext') },
      chart: { role: chart?.getAttribute('role'), tabindex: chart?.getAttribute('tabindex'),
        label: chart?.getAttribute('aria-label') || chart?.getAttribute('aria-labelledby'), valueText: chart?.getAttribute('aria-valuetext') },
      readings: Object.fromEntries(['time', 'alpha', 'feather', 'error', 'input', 'alpha-rate', 'feather-rate', 'state'].map(key => {
        const node = query('[data-iss-forecast-reading="' + key + '"]');
        return [key, key === 'state' ? node?.textContent || '' : Number(node?.getAttribute('data-value'))];
      })), points: Array.from({ length: numbers.length / 2 }, (_, index) => numbers.slice(index * 2, index * 2 + 2)),
      dot: [Number(selected?.getAttribute('cx')), Number(selected?.getAttribute('cy'))], cursor: Number(cursor?.getAttribute('x1')),
      events: window.__issForecastQA.events.slice(-30), glLost: gl ? gl.isContextLost() : null };
  });
  const settled = async () => {
    await page.waitForFunction(() => {
      const cv = document.querySelector('.iss-station-stage canvas'), draw = window.__issForecastQA?.draw;
      if (!cv?._issForecastState || !draw) return false;
      const s = cv._issLightingState(), f = cv._issForecastState(), c = cv._issCameraState();
       return !s.playing && !f.playing && !c.tweening && draw.forecast.active === f.active && (!f.active || Math.abs(draw.forecast.seconds - f.seconds) < 1e-8) &&
        ['phase', 'beta', 'arrayAlpha', 'arrayFeather', 'commandAlpha', 'commandFeather', 'actualAlphaRate', 'actualFeatherRate', 'driveElapsed']
          .every(key => Math.abs(draw.state[key] - s[key]) < 1e-7) && draw.camera.every((value, index) => Math.abs(value - c.position[index]) < 1e-7);
    }, undefined, { polling: 100 });
    return verify(await read(), cached);
  };
  const mutate = async action => { const before = await read(); await action(); return { before, after: await settled() }; };
  const scrub = async (locator, key, expected) => {
    const change = await mutate(async () => { await locator.focus(); await page.keyboard.press(key); });
    preservePhysical(change.before, change.after); near(change.after.forecast.seconds, expected); return change.after;
  };
  const collect = async () => {
    const before = await read(); cached = await canvas.evaluate(cv => {
      const seconds = cv._issForecastState().seconds, samples = [];
      for (let i = 0; i <= 40; i++) { cv._issSeekForecast(i); samples.push(cv._issForecastState().selected); }
      cv._issSeekForecastTime(seconds); return samples;
    });
    const after = await settled(); preservePhysical(before, after);
    for (let index = 0; index <= 40; index++) { near(cached[index].seconds, index * 15); verifySample(cached[index], before.state); }
    near(cached[0].alpha, before.state.arrayAlpha); near(cached[0].feather, before.state.arrayFeather);
    near(cached[0].alphaRate, before.state.actualAlphaRate); near(cached[0].featherRate, before.state.actualFeatherRate);
    return after;
  };
  const open = async () => {
    cached = null; const change = await mutate(() => activate(toggle));
    assert.equal(change.after.forecast.active, true); assert.equal(change.after.forecast.index, 20); near(change.after.forecast.seconds, 300);
    preservePhysical(change.before, change.after); return collect();
  };
  const capture = async label => {
    const beforeCapture = await read();
    assert.equal(beforeCapture.state.playing, false, 'Live orbit must be paused before a screenshot');
    assert.equal(beforeCapture.forecast.playing, false, 'Preview playback must be paused before a screenshot');
    await page.evaluate(() => document.activeElement?.blur());
    for (const [locator, suffix] of [[stage, 'stage'], [content, 'controls']]) {
      const filename = `map-forecast-${label}-${suffix}-${width}.png`, bounds = [];
      try {
        // Verify stability explicitly before capturing the native compositor surface.
        await locator.evaluate(node => node.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'nearest' }));
        let consecutive = 0;
        for (let attempt = 0; attempt < 12; attempt++) {
          const sample = await locator.evaluate(node => {
            const box = node.getBoundingClientRect(), cv = document.querySelector('.iss-station-stage canvas');
            const live = cv._issLightingState(), preview = cv._issForecastState();
            return { x: box.x, y: box.y, width: box.width, height: box.height, scrollX, scrollY,
              livePlaying: live.playing, previewPlaying: preview.playing, seconds: preview.seconds,
              cameraTweening: cv._issCameraState().tweening, renderCount: live.renderCount };
          });
          bounds.push(sample);
          assert.equal(sample.livePlaying, false, 'The live orbit stays paused during screenshot stabilization');
          assert.equal(sample.previewPlaying, false, 'The preview stays paused during screenshot stabilization');
          near(sample.seconds, beforeCapture.forecast.seconds);
          assert(sample.width > 0 && sample.height > 0, 'Screenshot target has visible dimensions');
          const previous = bounds.at(-2);
          const stable = previous && ['x', 'y', 'width', 'height', 'scrollX', 'scrollY']
            .every(key => Math.abs(sample[key] - previous[key]) < .25);
          consecutive = stable && !sample.cameraTweening ? consecutive + 1 : 0;
          if (consecutive >= 2) break;
          await page.waitForTimeout(150);
        }
        assert(consecutive >= 2, 'Screenshot target did not stabilize within 12 bounded layout samples');
        const stable = bounds.at(-1), session = await page.context().newCDPSession(page);
        try {
          const shot = await session.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: true,
            clip: { x: stable.x + stable.scrollX, y: stable.y + stable.scrollY, width: stable.width, height: stable.height, scale: 1 } });
          await fs.writeFile(path.join(output, filename), Buffer.from(shot.data, 'base64'));
        } finally { await session.detach(); }
        result.screenshots.push(filename);
        (result.captureDiagnostics ||= []).push({ filename, method: 'Page.captureScreenshot', samples: bounds.length, stableBounds: bounds.at(-1) });
      } catch (error) {
        result.captureFailure = { filename, bounds };
        error.message += '\nScreenshot stabilization diagnostics: ' + JSON.stringify(result.captureFailure);
        throw error;
      }
    }
    const afterCapture = await read(); preservePhysical(beforeCapture, afterCapture);
    assert.deepEqual(afterCapture.forecast, beforeCapture.forecast, 'Capturing screenshots does not advance or change the forecast');
  };
  try {
    console.log(`Checking array motion forecast at ${width}px`);
    await page.addInitScript(() => { window.AlloPostFXEnabled = false; });
    await page.route('**/vendor/three-r128/three.min.js', async route => {
      const response = await route.fetch(); assert(response.ok());
      await route.fulfill({ response, body: (await response.text()) + '\n;(' + observeRenderer.toString() + ')();\n' });
    });
    await page.goto(`${base}/?tab=map`, { waitUntil: 'load' }); await toggle.waitFor();
    let after = await settled(); assert.equal(after.forecast.active, false);
    await page.evaluate(() => {
      for (const type of ['click', 'keydown', 'pointerdown', 'pointermove', 'pointerup', 'gotpointercapture', 'lostpointercapture']) {
        document.addEventListener(type, event => {
          const node = event.target.closest('[data-iss-forecast-chart],[data-iss-forecast-toggle],[data-iss-forecast-apply],[data-iss-forecast-slider]');
          const cv = document.querySelector('.iss-station-stage canvas'); if (!node || !cv) return;
          window.__issForecastQA.events.push({ type, key: event.key, pointerType: event.pointerType, trusted: event.isTrusted,
            target: node.hasAttribute('data-iss-forecast-chart') ? 'chart' : node.hasAttribute('data-iss-forecast-toggle') ? 'toggle' : 'control',
            state: cv._issLightingState(), camera: cv._issCameraState() });
        }, true);
      }
    });
    await canvas.evaluate(cv => {
      cv._issSetLighting({ motorEnabled: true, motorSmooth: true, motorRate: .08, motorAcceleration: .002, arrayAlpha: -145, arrayFeather: 20 });
      cv._issStepLighting(60);
    });
    after = await settled(); assert(Math.abs(after.state.actualAlphaRate) > .01); assert(Math.abs(after.state.actualFeatherRate) > .01);
    after = await open(); const frozen = after;
    assert(Math.abs(wrap(after.forecast.selected.alpha - after.state.arrayAlpha)) > 1, 'The future outline differs visibly from the actual moving array');
    result.checks.cachedSmoothForecast = { actual: after.state, selected: after.forecast.selected, sampleCount: cached.length };
    await capture('smooth-path');
    await scrub(chart, 'End', 600); await scrub(chart, 'Home', 0); assert.equal((await read()).applyDisabled, true);
    await scrub(chart, 'PageUp', 60); await scrub(chart, 'PageDown', 0); await scrub(chart, 'ArrowRight', 1); await scrub(chart, 'ArrowLeft', 0);
    await scrub(chart, 'Shift+ArrowRight', .1); await scrub(chart, 'Shift+ArrowLeft', 0);
    await scrub(slider, 'End', 600); await scrub(slider, 'Home', 0); await scrub(slider, 'ArrowRight', .1);
    result.checks.nativeKeyboard = { chart: 'Home / End / PageUp / PageDown / 1 s arrows / 0.1 s Shift+arrows', slider: 'Home / End / 0.1 s arrows' };

    await chart.scrollIntoViewIfNeeded();
    const coords = await chart.evaluate(svg => {
      const screen = (seconds, y = 90) => { const p = svg.createSVGPoint(); p.x = 40 + 540 * seconds / 600; p.y = y;
        const at = p.matrixTransform(svg.getScreenCTM()); return { x: at.x, y: at.y }; };
      return { start: screen(150), middle: screen(450), outside: screen(600, 230), end: screen(427.5) };
    });
    const pointerBefore = await read();
    if (phone) {
      const session = await page.context().newCDPSession(page);
      const touch = point => [{ x: point.x, y: point.y, id: 1, radiusX: 4, radiusY: 4 }];
      try {
        await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: touch(coords.start) });
        for (const point of [coords.middle, coords.outside, coords.end]) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: touch(point) });
        await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } finally { await session.detach(); }
    } else {
      await page.mouse.move(coords.start.x, coords.start.y); await page.mouse.down();
      for (const point of [coords.middle, coords.outside, coords.end]) await page.mouse.move(point.x, point.y, { steps: 2 });
      await page.mouse.up();
    }
    after = await settled(); preservePhysical(pointerBefore, after); assert.equal(after.forecast.index, 28);
    near(after.forecast.seconds, 427.5, phone ? 1.2 : .2);
    const pointerSeconds = after.forecast.seconds;
    assert(after.events.some(event => event.target === 'chart' && event.type === 'pointermove' && event.trusted && event.pointerType === (phone ? 'touch' : 'mouse')));
    assert(after.events.some(event => event.target === 'chart' && event.type === 'gotpointercapture' && event.trusted), 'The chart captures a real pointer drag');
    result.checks.pointerScrub = { pointerType: phone ? 'touch' : 'mouse', index: after.forecast.index, seconds: pointerSeconds, trustedCapture: true };
    preservePhysical(frozen, after);

    let change = await mutate(() => activate(page.locator('[data-iss-camera-view="truss"]')));
    preservePhysical(change.before, change.after, false); near(change.after.forecast.seconds, pointerSeconds);
    change = await mutate(() => activate(page.locator('[data-iss-focus-module]')));
    preservePhysical(change.before, change.after, false); near(change.after.forecast.seconds, pointerSeconds);
    change = await mutate(() => activate(page.locator('[data-iss-light-guides]')));
    preservePhysical(change.before, change.after, false); near(change.after.forecast.seconds, pointerSeconds);
    change = await mutate(() => activate(page.locator('[data-iss-camera-view="overview"]')));
    preservePhysical(change.before, change.after, false); near(change.after.forecast.seconds, pointerSeconds);
    await scrub(slider, 'ArrowRight', pointerSeconds + .1);
    change = await mutate(() => activate(page.locator('[data-iss-forecast-inspect]')));
    preservePhysical(change.before, change.after); assert.equal(await canvas.evaluate(cv => document.activeElement === cv), true);
    result.checks.cameraAndRerender = { forecast: change.after.forecast, camera: cameraPose(change.after.camera), inspectFocus: true };
    assert.equal(await stageSlider.isVisible(), true, 'The stage scrubber is available while inspecting the 3D preview');
    const stageSeconds = change.after.forecast.seconds;
    await scrub(stageSlider, 'ArrowRight', stageSeconds + .1);
    after = await scrub(stageSlider, 'ArrowLeft', stageSeconds);
    result.checks.stageScrubber = { index: after.forecast.index, seconds: after.forecast.seconds, keyboard: 'ArrowRight / ArrowLeft in 0.1 s', preservesPhysicalState: true, syncsForecastGeometry: true };
    await capture('scrubbed');

    const layout = await page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth,
      nodes: Array.from(document.querySelectorAll('[data-iss-forecast-content],[data-iss-forecast-content] button,[data-iss-forecast-content] input,[data-iss-forecast-chart],[data-iss-forecast-toggle],[data-iss-forecast-close],[data-iss-forecast-stage-slider]'), node => {
        const b = node.getBoundingClientRect(); return { label: node.getAttribute('aria-label') || node.textContent.trim().slice(0, 50), left: b.left, right: b.right,
          width: b.width, height: b.height, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth };
      }) }));
    assert(layout.width <= width + 1);
    for (const node of layout.nodes.filter(node => node.width && node.height)) {
      assert(node.left >= -1 && node.right <= width + 1, `Forecast control exceeds viewport: ${JSON.stringify(node)}`);
      if (node.clientWidth) assert(node.scrollWidth <= node.clientWidth + 1, `Forecast text overflows: ${JSON.stringify(node)}`);
    }
    await page.addScriptTag({ path: path.join(ROOT, 'desktop/web-app/node_modules/axe-core/axe.min.js') });
    const accessibility = await page.evaluate(async () => {
      const checked = await axe.run({ include: ['[data-iss-forecast-content]', '[data-iss-forecast-toggle]', '[data-iss-forecast-close]', '[data-iss-forecast-stage-slider]'] },
        { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
      return { passes: checked.passes.length, violations: checked.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) };
    });
    assert.deepEqual(accessibility.violations, []); result.checks.layout = layout; result.checks.accessibility = accessibility;

    const beforeApply = await read(), selected = beforeApply.forecast.selected; cached = null;
    change = await mutate(() => activate(apply)); after = change.after;
    assert.equal(after.forecast.active, false); assert.equal(after.state.playing, false);
    assert.equal(await toggle.evaluate(node => document.activeElement === node), true, 'Apply returns keyboard focus to the persistent forecast toggle');
    for (const [actual, expected] of [['phase', 'phase'], ['arrayAlpha', 'alpha'], ['arrayFeather', 'feather'], ['actualAlphaRate', 'alphaRate'], ['actualFeatherRate', 'featherRate'], ['commandAlpha', 'commandAlpha'], ['commandFeather', 'commandFeather']]) {
      near(after.state[actual], selected[expected], 1e-10);
    }
    near(after.state.driveElapsed, beforeApply.state.driveElapsed + selected.seconds, 1e-10);
    for (const key of ['beta', 'rate', 'motorRate', 'motorAcceleration']) near(after.state[key], beforeApply.state[key]);
    for (const key of ['tracking', 'motorEnabled', 'motorSmooth']) assert.equal(after.state[key], beforeApply.state[key]);
    assert.deepEqual(cameraPose(after.camera), cameraPose(beforeApply.camera));
    result.checks.fractionalApply = { before: beforeApply.state, selected, after: after.state };

    await open(); change = await mutate(() => activate(page.locator('[data-iss-forecast-close]')));
    preservePhysical(change.before, change.after); assert.equal(change.after.forecast.active, false);
    assert.equal(await toggle.evaluate(node => document.activeElement === node), true, 'The stage close control returns focus to the persistent forecast toggle');
    cached = null;
    await open(); cached = null;
    change = await mutate(async () => { await page.locator('[data-iss-beta]').focus(); await page.keyboard.press('ArrowRight'); });
    assert.equal(change.after.forecast.active, false); near(change.after.state.beta, change.before.state.beta + 1);
    assert.equal(await page.locator('[data-iss-beta]').evaluate(node => document.activeElement === node), true, 'Invalidation preserves focus on the physical control being edited');
    for (const key of ['arrayAlpha', 'arrayFeather', 'actualAlphaRate', 'actualFeatherRate', 'driveElapsed']) near(change.after.state[key], change.before.state[key]);
    await open(); cached = null;
    change = await mutate(() => activate(page.locator('[data-iss-drive-step]')));
    assert.equal(change.after.forecast.active, false); near(change.after.state.driveElapsed, change.before.state.driveElapsed + 60);
    await open(); cached = null;
    await activate(page.locator('[data-iss-drive-play]'));
    await page.waitForFunction(() => { const cv = document.querySelector('.iss-station-stage canvas'); return cv._issLightingState().playing && !cv._issForecastState().active; });
    await activate(toggle); after = await settled();
    const pauseEvent = after.events.filter(event => event.type === 'click' && event.target === 'toggle').at(-1);
    assert(pauseEvent?.trusted && pauseEvent.state.playing, 'Opening the forecast pauses a genuinely running orbit');
    preservePhysical({ state: pauseEvent.state, camera: pauseEvent.camera }, after);
    await collect(); result.checks.invalidatedAndPaused = { physicalEdit: true, step: true, play: true, pausesLiveOrbit: true,
      focus: { applyReturnsToToggle: true, stageCloseReturnsToToggle: true, physicalEditPreserved: true } };

    cached = null;
    await canvas.evaluate(cv => cv._issSetLighting({ motorEnabled: false, tracking: true }));
    after = await settled(); assert.equal(after.forecast.active, false);
    await open(); after = await scrub(slider, 'End', 600);
    const instantSelected = after.forecast.selected, instantBefore = after; cached = null;
    change = await mutate(() => activate(apply)); after = change.after;
    near(after.state.phase, instantSelected.phase, 1e-10); near(after.state.arrayAlpha, instantSelected.alpha, 1e-10);
    near(after.state.arrayFeather, instantSelected.feather, 1e-10); near(after.state.driveElapsed, instantBefore.state.driveElapsed, 1e-10);
    near(after.state.actualAlphaRate, 0); near(after.state.actualFeatherRate, 0); assert.equal(after.forecast.active, false);
    result.checks.instantApply = { selected: instantSelected, actual: after.state };
    result.errors = errors; result.hostErrors = await page.evaluate(() => window.__events?.errors || []);
    assert.deepEqual(errors, []); assert.deepEqual(result.hostErrors, []); result.passed = true;
    console.log(`Cached physics, 3D path, keyboard/${phone ? 'touch' : 'mouse'} scrubbing, apply and accessibility passed at ${width}px`);
    return result;
  } catch (error) {
    result.passed = false; result.failure = error.stack || error.message; result.errors = errors;
    result.lastSnapshot = await read().catch(() => null);
    await page.screenshot({ path: path.join(output, `map-forecast-failure-${width}.png`) }).catch(() => {});
    error.qaResult = result; throw error;
  } finally {
    try {
      result.checks.cleanup = await page.evaluate(() => {
        document.querySelector('.iss-station-stage canvas')?._issSetLighting?.({ playing: false }); window.__destroy?.();
        return { contexts: window.__issForecastQA?.contexts.length || 0, lost: (window.__issForecastQA?.contexts || []).map(gl => gl.isContextLost()),
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
  console.log(`Forecast browser checks passed: ${widths.join(', ')}px. Results: ${output}`);
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
