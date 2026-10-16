#!/usr/bin/env node
'use strict';

// Real-WebGL checks for the solar forecast, fractional scrubbing and continuous playback.
// Uses the running preview; does not launch or modify a server.
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
const output = path.resolve(ROOT, argument('--out', 'reports/space-station-enhancement-qa/map-sun-preview-browser'));
const widths = argument('--widths', '1440,390').split(',').map(Number);
assert(widths.length && widths.every(width => Number.isInteger(width) && width >= 320));
const near = (actual, expected, tolerance = 1e-6) => {
  assert(Number.isFinite(actual) && Number.isFinite(expected), `Finite values required: ${actual}, ${expected}`);
  assert(Math.abs(actual - expected) <= tolerance, `${actual} should equal ${expected} within ${tolerance}`);
};
const vectorNear = (actual, expected, tolerance = 1e-6) => {
  assert(Array.isArray(actual) && actual.length === expected.length);
  actual.forEach((value, index) => near(value, expected[index], tolerance));
};
const wrap = angle => ((angle % 360) + 360) % 360;
const physicalKeys = ['phase', 'beta', 'rate', 'motorRate', 'motorAcceleration', 'arrayAlpha', 'arrayFeather',
  'actualAlphaRate', 'actualFeatherRate', 'commandAlpha', 'commandFeather', 'driveError', 'driveElapsed', 'incidence', 'generation'];
const physicalFlags = ['playing', 'tracking', 'motorEnabled', 'motorSmooth', 'eclipse', 'commandVisible'];
function frozen(before, after) {
  for (const key of physicalKeys) near(after.state[key], before.state[key]);
  for (const key of physicalFlags) assert.equal(after.state[key], before.state[key], `Preview preserves live ${key}`);
  vectorNear(after.state.wingNormal, before.state.wingNormal); vectorNear(after.state.sun, before.state.sun);
}
function expectedEvents(state, horizon = 600) {
  const ratio = 6371 / (6371 + 420), limit = Math.sqrt(1 - ratio * ratio);
  const cosine = Math.cos(state.beta * Math.PI / 180);
  if (cosine <= limit) return [];
  const half = Math.acos(limit / cosine) * 180 / Math.PI;
  return [{ phase: 180 - half, type: 'sunset' }, { phase: 180 + half, type: 'sunrise' }]
    .map(event => ({ seconds: wrap(event.phase - state.phase) / 360 * state.periodSeconds, type: event.type }))
    .filter(event => event.seconds > 1e-7 && event.seconds < horizon - 1e-7).sort((a, b) => a.seconds - b.seconds);
}
function verifyCachedPhysics(sample, initial) {
  near(wrap(sample.phase), wrap(initial.phase + sample.seconds * 360 / initial.periodSeconds), 1e-6);
  const alpha = sample.alpha * Math.PI / 180, feather = sample.feather * Math.PI / 180;
  const normal = [-Math.sin(feather), Math.cos(alpha) * Math.cos(feather), Math.sin(alpha) * Math.cos(feather)];
  const beta = initial.beta * Math.PI / 180, phase = sample.phase * Math.PI / 180;
  const sun = [Math.sin(beta), Math.cos(beta) * Math.cos(phase), Math.cos(beta) * Math.sin(phase)];
  vectorNear(sample.normal, normal); vectorNear(sample.sun, sun);
  const incidence = Math.max(0, Math.min(1, normal.reduce((sum, value, index) => sum + value * sun[index], 0)));
  const eclipse = sun[1] < 0 && 1 - sun[1] * sun[1] < (6371 / 6791) ** 2;
  assert.equal(sample.eclipse, eclipse); near(sample.incidence, incidence); near(sample.generation, eclipse ? 0 : incidence);
}
function verifyFuturePose(draw, sample) {
  const alpha = sample.alpha * Math.PI / 360, feather = sample.feather * Math.PI / 360;
  vectorNear(draw.futureQuaternion, [Math.sin(alpha) * Math.cos(feather), -Math.sin(alpha) * Math.sin(feather),
    Math.cos(alpha) * Math.sin(feather), Math.cos(alpha) * Math.cos(feather)]);
  vectorNear(draw.tip, sample.corner.map((value, index) => value + draw.futurePosition[index]));
}

function observeRenderer() {
  const Original = window.THREE.WebGLRenderer;
  window.__issSunPreviewQA = { draw: null, sequence: 0, contexts: [], resources: {}, events: [], motion: null };
  function ObservedRenderer(options) {
    const renderer = new Original(options), render = renderer.render;
    window.__issSunPreviewQA.contexts.push(renderer.getContext());
    renderer.render = function (scene, camera) {
      const qa = window.__issSunPreviewQA, cv = renderer.domElement;
      const fills = [0, 1].map(index => scene.getObjectByName('iss-array-forecast-fill-' + index));
      for (const fill of fills.filter(Boolean)) {
        if (!fill.__sunQA) {
          fill.__sunQA = { draws: 0 }; const original = fill.onAfterRender;
          fill.onAfterRender = function () { fill.__sunQA.draws++; if (original) original.apply(this, arguments); };
        }
        for (const resource of [fill.geometry, fill.material]) {
          if (!qa.resources[resource.uuid]) {
            qa.resources[resource.uuid] = { type: resource.type, disposals: 0 };
            resource.addEventListener('dispose', () => { qa.resources[resource.uuid].disposals++; });
          }
        }
      }
      const returned = render.apply(this, arguments);
      if (scene.name === 'iss-station-inspection' && cv._issForecastState) {
        const future = scene.getObjectByName('iss-array-forecast'), wing = scene.getObjectByName('iss-array-wing-0');
        const tip = scene.getObjectByName('iss-array-forecast-tip');
        const q = new window.THREE.Quaternion(); wing?.getWorldQuaternion(q);
        qa.draw = { sequence: ++qa.sequence, state: cv._issLightingState(), forecast: cv._issForecastState(),
          futureVisible: !!future?.visible, futureQuaternion: future?.quaternion.toArray(), futurePosition: future?.position.toArray(),
          tip: tip?.position.toArray(), wingQuaternion: q.toArray(), fills: fills.map(fill => fill ? {
            name: fill.name, parent: fill.parent?.name, position: fill.position.toArray(), rotation: fill.rotation.toArray().slice(0, 3),
            geometry: { id: fill.geometry.uuid, type: fill.geometry.type, width: fill.geometry.parameters.width, height: fill.geometry.parameters.height },
            material: { type: fill.material.type, color: fill.material.color.getHex(), opacity: fill.material.opacity, transparent: fill.material.transparent,
              side: fill.material.side, depthTest: fill.material.depthTest, depthWrite: fill.material.depthWrite, toneMapped: fill.material.toneMapped },
            draws: fill.__sunQA.draws } : null) };
        if (qa.motion && qa.draw.forecast.playing && qa.motion.length < 120) qa.motion.push({ sequence: qa.draw.sequence,
          state: qa.draw.state, selected: qa.draw.forecast.selected, futureQuaternion: qa.draw.futureQuaternion,
          futurePosition: qa.draw.futurePosition, tip: qa.draw.tip });
      }
      return returned;
    };
    return renderer;
  }
  ObservedRenderer.prototype = Original.prototype; Object.setPrototypeOf(ObservedRenderer, Original);
  window.THREE.WebGLRenderer = ObservedRenderer;
}

function verify(snapshot, cached) {
  const f = snapshot.forecast, d = snapshot.draw;
  assert(d && d.fills.every(Boolean), 'Both future panel faces exist in the actual WebGL scene');
  assert.equal(snapshot.glLost, false); assert.equal(snapshot.state.playing, false);
  assert.equal(d.forecast.active, f.active); assert.equal(d.forecast.playing, f.playing);
  assert.equal(d.futureVisible, f.active && f.seconds > 0);
  if (!f.active) { assert.equal(f.playing, false); assert.equal(f.sunlight, null); return snapshot; }
  assert.equal(f.sampleCount, 41); near(f.horizonSeconds, 600);
  assert.equal(d.forecast.index, f.index); near(d.forecast.seconds, f.seconds); assert.equal(snapshot.buttons.length, 2);
  for (const button of snapshot.buttons) {
    assert.equal(button.pressed, String(f.playing));
    assert(f.playing ? /pause/i.test(button.text) : /play/i.test(button.text), `Playback button describes its action: ${button.text}`);
  }
  assert.equal(snapshot.chart.role, 'slider'); assert.equal(snapshot.chart.tabindex, '0');
  assert(snapshot.chart.label && snapshot.chart.valueText); near(snapshot.chart.min, 0); near(snapshot.chart.max, 600);
  const sample = f.selected, sun = f.sunlight; near(sample.seconds, f.seconds); near(snapshot.chart.now, sample.seconds);
  assert.equal(f.index, Math.min(40, Math.floor(f.seconds / 15)));
  assert.equal(snapshot.ranges.length, 2);
  snapshot.ranges.forEach(range => { near(range.min, 0); near(range.max, 600); near(range.step, .1); near(range.value, f.seconds, .051); });
  verifyCachedPhysics(sample, snapshot.state); verifyFuturePose(d, sample);
  near(snapshot.cursor, 40 + .9 * sample.seconds, 1e-4);
  vectorNear(snapshot.dot, [40 + .9 * sample.seconds, 86 - 66 * sample.generation], 1e-4);
  assert(snapshot.stageInput.includes(sample.eclipse ? 'Earth shadow' : 'Sunlight'));
  assert(snapshot.stageInput.includes(String(Math.round(sample.generation * 100))), 'The stage identifies predicted solar input');
  if (cached && Math.abs(f.seconds - f.index * 15) < 1e-7) assert.deepEqual(sample, cached[f.index]);
  near(sun.horizonSeconds, 600);
  const expected = expectedEvents(snapshot.state); assert.equal(sun.events.length, expected.length);
  for (let index = 0; index < expected.length; index++) {
    near(sun.events[index].seconds, expected[index].seconds, 1e-5); assert.equal(sun.events[index].type, expected[index].type);
    assert(new RegExp(expected[index].type, 'i').test(snapshot.eventsText));
  }
  assert.equal(sun.intervals.length, expected.length + 1);
  assert.equal(snapshot.segments.length, sun.intervals.length, 'Every sunlight interval is a disconnected polyline');
  let shadow = 0, end = 0;
  const shadowIntervals = [];
  sun.intervals.forEach((interval, index) => {
    near(interval.startSeconds, end, 1e-5); assert(interval.endSeconds > interval.startSeconds);
    end = interval.endSeconds;
    const middle = snapshot.state.phase + (interval.startSeconds + interval.endSeconds) / 2 * 360 / snapshot.state.periodSeconds;
    const cosine = Math.cos(snapshot.state.beta * Math.PI / 180) * Math.cos(middle * Math.PI / 180);
    const eclipse = cosine < 0 && 1 - cosine * cosine < (6371 / 6791) ** 2;
    assert.equal(interval.eclipse, eclipse);
    if (eclipse) { shadow += interval.endSeconds - interval.startSeconds; shadowIntervals.push(interval); }
    assert(interval.points.length >= 2); near(interval.points[0].seconds, interval.startSeconds, 1e-5);
    near(interval.points.at(-1).seconds, interval.endSeconds, 1e-5);
    const rendered = snapshot.segments[index]; assert.equal(rendered.points.length, interval.points.length);
    interval.points.forEach((point, pointIndex) => {
      assert(point.generation >= 0 && point.generation <= 1); if (eclipse) near(point.generation, 0);
      if (pointIndex) assert(point.seconds >= interval.points[pointIndex - 1].seconds);
      vectorNear(rendered.points[pointIndex], [40 + .9 * point.seconds, 86 - 66 * point.generation], 2e-4);
      const exact = cached?.find(candidate => Math.abs(candidate.seconds - point.seconds) < 1e-7);
      if (exact && pointIndex > 0 && pointIndex < interval.points.length - 1) near(point.generation, exact.generation, 1e-7);
    });
    if (index && sun.intervals[index - 1].eclipse !== eclipse) {
      near(sun.intervals[index - 1].points.at(-1).seconds, interval.points[0].seconds, 1e-5);
      assert.notEqual(snapshot.segments[index - 1].stroke, rendered.stroke, 'Sunlight and shadow have distinct traces');
    }
  });
  near(end, 600); near(sun.shadowSeconds, shadow, 1e-5);
  assert(snapshot.shadowText.trim()); assert.equal(snapshot.bands.length, shadowIntervals.length);
  shadowIntervals.forEach((interval, index) => {
    vectorNear(snapshot.bands[index], [40 + .9 * interval.startSeconds, .9 * (interval.endSeconds - interval.startSeconds), 18, 70], 2e-4);
  });
  assert.equal(d.fills[0].geometry.id, d.fills[1].geometry.id, 'The pair shares its panel geometry');
  d.fills.forEach(fill => {
    assert.equal(fill.parent, 'iss-array-forecast'); near(fill.geometry.width, .9); near(fill.geometry.height, 3.4);
    near(fill.position[0], 0); near(fill.position[1], .016); near(Math.abs(fill.position[2]), 2);
    vectorNear(fill.rotation, [-Math.PI / 2, 0, 0]); assert.equal(fill.material.type, 'MeshBasicMaterial');
    assert.equal(fill.material.color, sample.eclipse ? 0x6474c4 : 0xffd374);
    near(fill.material.opacity, sample.eclipse ? .16 : .06 + .18 * sample.generation);
    assert.equal(fill.material.transparent, true); assert.equal(fill.material.side, 2);
    assert.equal(fill.material.depthTest, false); assert.equal(fill.material.depthWrite, false); assert.equal(fill.material.toneMapped, false);
    if (f.seconds > 0) assert(fill.draws > 0, 'The future panel face has reached WebGL rendering');
  });
  return snapshot;
}

async function runWidth(browser, width) {
  const phone = width < 500, errors = [], result = { width, touch: phone, checks: {}, screenshots: [] };
  const page = await browser.newPage({ viewport: { width, height: phone ? 844 : 1080 }, deviceScaleFactor: 1,
    isMobile: phone, hasTouch: phone, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000); page.on('pageerror', error => errors.push(error.stack || error.message));
  const canvas = page.locator('.iss-station-stage canvas'), stage = page.locator('.iss-station-stage');
  const content = page.locator('[data-iss-forecast-content]'), toggle = page.locator('[data-iss-forecast-toggle]');
  const chart = page.locator('[data-iss-forecast-solar-chart]'), slider = page.locator('[data-iss-forecast-slider]');
  const panelPlay = content.locator('[data-iss-forecast-play]'), stagePlay = stage.locator('[data-iss-forecast-play]');
  const activate = async locator => { if (phone) await locator.tap(); else { await locator.focus(); await page.keyboard.press('Enter'); } };
  let cached = null;
  const read = () => canvas.evaluate(cv => {
    const one = selector => document.querySelector(selector), many = selector => Array.from(document.querySelectorAll(selector));
    const chart = one('[data-iss-forecast-solar-chart]'), point = one('[data-iss-forecast-solar-dot]');
    const gl = cv.getContext('webgl2') || cv.getContext('webgl');
    const points = node => (node.getAttribute('points') || '').trim().split(/\s+/).filter(Boolean).map(pair => pair.split(',').map(Number));
    return { state: cv._issLightingState(), forecast: cv._issForecastState(), draw: window.__issSunPreviewQA.draw,
      glLost: gl ? gl.isContextLost() : null, buttons: many('[data-iss-forecast-play]').map(node => ({ text: node.textContent, pressed: node.getAttribute('aria-pressed') })),
      chart: { role: chart?.getAttribute('role'), tabindex: chart?.getAttribute('tabindex'), label: chart?.getAttribute('aria-label') || chart?.getAttribute('aria-labelledby'),
        valueText: chart?.getAttribute('aria-valuetext'), min: Number(chart?.getAttribute('aria-valuemin')), max: Number(chart?.getAttribute('aria-valuemax')), now: Number(chart?.getAttribute('aria-valuenow')),
        left: chart?.getBoundingClientRect().left, width: chart?.getBoundingClientRect().width },
      ranges: many('[data-iss-forecast-slider],[data-iss-forecast-stage-slider]').map(node => ({ min: Number(node.min), max: Number(node.max), step: Number(node.step), value: Number(node.value) })),
      cursor: Number(one('[data-iss-forecast-solar-cursor]')?.getAttribute('x1')), dot: [Number(point?.getAttribute('cx')), Number(point?.getAttribute('cy'))],
      segments: many('[data-iss-forecast-solar-segments] polyline').map(node => ({ points: points(node), stroke: node.getAttribute('stroke') || getComputedStyle(node).stroke })),
      bands: many('[data-iss-forecast-eclipse-bands] rect').map(node => ['x', 'width', 'y', 'height'].map(key => Number(node.getAttribute(key)))),
      eventsText: one('[data-iss-forecast-events]')?.textContent || '', shadowText: one('[data-iss-forecast-shadow]')?.textContent || '',
      stageInput: one('[data-iss-forecast-stage-input]')?.textContent || '', pointerEvents: window.__issSunPreviewQA.events.slice(-30) };
  });
  const settled = async () => {
    await page.waitForFunction(() => {
      const cv = document.querySelector('.iss-station-stage canvas'), draw = window.__issSunPreviewQA?.draw;
      if (!cv?._issForecastState || !draw) return false;
      const s = cv._issLightingState(), f = cv._issForecastState();
      return !s.playing && !f.playing && !cv._issCameraState().tweening && draw.forecast.active === f.active && draw.forecast.playing === f.playing &&
        (!f.active || Math.abs(draw.forecast.seconds - f.seconds) < 1e-7) && ['phase', 'beta', 'arrayAlpha', 'arrayFeather', 'actualAlphaRate', 'actualFeatherRate', 'driveElapsed']
          .every(key => Math.abs(draw.state[key] - s[key]) < 1e-7);
    }, undefined, { polling: 100 });
    return verify(await read(), cached);
  };
  const collect = async () => {
    const before = await read(); cached = await canvas.evaluate(cv => {
      const seconds = cv._issForecastState().seconds, samples = [];
      for (let i = 0; i <= 40; i++) { cv._issSeekForecast(i); samples.push(cv._issForecastState().selected); }
      cv._issSeekForecastTime(seconds); return samples;
    });
    const after = await settled(); frozen(before, after);
    cached.forEach(sample => verifyCachedPhysics(sample, before.state)); return after;
  };
  const open = async () => {
    cached = null; const before = await read(); await activate(toggle); let after = await settled();
    assert.equal(after.forecast.active, true); assert.equal(after.forecast.playing, false); near(after.forecast.seconds, 300); frozen(before, after);
    return collect();
  };
  const configure = async settings => {
    cached = null; await canvas.evaluate((cv, patch) => cv._issSetLighting(patch), settings); await settled(); return open();
  };
  const key = async (locator, name, expected) => {
    const before = await read(); await locator.focus(); await page.keyboard.press(name); const after = await settled();
    frozen(before, after); near(after.forecast.seconds, expected); return after;
  };
  const capture = async label => {
    const beforeCapture = await read();
    assert.equal(beforeCapture.state.playing, false, 'Live orbit must be paused before a screenshot');
    assert.equal(beforeCapture.forecast.playing, false, 'Preview playback must be paused before a screenshot');
    await page.evaluate(() => document.activeElement?.blur());
    for (const [locator, suffix] of [[stage, 'stage'], [content, 'controls']]) {
      const filename = `map-sun-preview-${label}-${suffix}-${width}.png`, bounds = [];
      try {
        // Check layout and simulation stability explicitly, then capture the native
        // compositor surface. This avoids a redundant RAF poll in element screenshots.
        await locator.evaluate(node => node.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'nearest' }));
        let consecutive = 0;
        for (let attempt = 0; attempt < 12; attempt++) {
          const sample = await locator.evaluate(node => {
            const box = node.getBoundingClientRect(), cv = document.querySelector('.iss-station-stage canvas');
            const live = cv._issLightingState(), preview = cv._issForecastState();
            return { x: box.x, y: box.y, width: box.width, height: box.height, scrollX, scrollY,
              livePlaying: live.playing, previewPlaying: preview.playing, index: preview.index, seconds: preview.seconds,
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
        const current = await read().catch(() => null);
        result.captureFailure = { filename, bounds, livePlaying: current?.state.playing, previewPlaying: current?.forecast.playing,
          index: current?.forecast.index, seconds: current?.forecast.seconds, renderCount: current?.state.renderCount,
          page: await page.evaluate(() => ({ scrollX, scrollY, width: innerWidth, height: innerHeight,
            documentHeight: document.documentElement.scrollHeight, fonts: document.fonts?.status, visibility: document.visibilityState })).catch(() => null) };
        error.message += '\nScreenshot stabilization diagnostics: ' + JSON.stringify(result.captureFailure);
        throw error;
      }
    }
    const afterCapture = await read(); frozen(beforeCapture, afterCapture);
    assert.deepEqual(afterCapture.forecast, beforeCapture.forecast, 'Capturing screenshots does not advance or change the forecast');
  };
  try {
    console.log(`Checking solar preview and playback at ${width}px`);
    await page.addInitScript(() => { window.AlloPostFXEnabled = false; });
    await page.route('**/vendor/three-r128/three.min.js', async route => {
      const response = await route.fetch(); assert(response.ok());
      await route.fulfill({ response, body: (await response.text()) + '\n;(' + observeRenderer.toString() + ')();\n' });
    });
    await page.goto(`${base}/?tab=map`, { waitUntil: 'load' }); await toggle.waitFor(); await settled();
    await page.evaluate(() => {
      for (const type of ['pointerdown', 'pointermove', 'pointerup', 'gotpointercapture']) {
        document.addEventListener(type, event => {
          if (event.target.closest('[data-iss-forecast-solar-chart]')) window.__issSunPreviewQA.events.push({ type, trusted: event.isTrusted, pointerType: event.pointerType, clientX: event.clientX });
        }, true);
      }
    });
    let after = await configure({ phase: 100, beta: 20, motorEnabled: false, tracking: true });
    assert.equal(after.forecast.sunlight.events[0]?.type, 'sunset');
    const sunset = after.forecast.sunlight.events[0].seconds;
    assert(Math.abs(sunset / 15 - Math.round(sunset / 15)) > .01, 'The tested eclipse boundary is genuinely between cached samples');
    assert(after.forecast.sunlight.intervals[0].points.at(-1).generation > .99);
    near(after.forecast.sunlight.intervals[1].points[0].generation, 0);
    result.checks.exactSunset = { event: after.forecast.sunlight.events[0], shadowSeconds: after.forecast.sunlight.shadowSeconds, disconnectedBoundary: true };
    await canvas.evaluate((cv, seconds) => cv._issSeekForecastTime(seconds), sunset - .01); after = await settled();
    assert.equal(after.forecast.selected.eclipse, false); assert(after.forecast.selected.generation > .99);
    await canvas.evaluate((cv, seconds) => cv._issSeekForecastTime(seconds), sunset + .01); after = await settled();
    assert.equal(after.forecast.selected.eclipse, true); near(after.forecast.selected.generation, 0);
    result.checks.exactSunset.fractionalPoseCrossesExactBoundary = true;
    await canvas.evaluate(cv => cv._issSeekForecastTime(300)); await settled();
    await capture('sunset');
    await key(chart, 'Home', 0); await key(chart, 'End', 600); await key(chart, 'PageDown', 540); await key(chart, 'PageUp', 600);
    await key(chart, 'ArrowLeft', 599); await key(chart, 'ArrowRight', 600);
    await key(chart, 'Shift+ArrowLeft', 599.9); await key(chart, 'Shift+ArrowLeft', 599.8);
    await key(slider, 'Home', 0); after = await key(slider, 'ArrowRight', .1);
    assert.equal(after.forecast.index, 0); assert.equal(after.draw.futureVisible, true, 'A fractional preview before the first knot remains visible');
    await key(stage.locator('[data-iss-forecast-stage-slider]'), 'ArrowRight', .2);
    result.checks.keyboard = { solarChart: 'Home / End / 60 s pages / 1 s arrows / 0.1 s Shift+arrows', nativeSliders: '0.1 s steps', fractionalGhostVisible: true };

    await chart.scrollIntoViewIfNeeded();
    const coords = await chart.evaluate(svg => {
      const screen = (seconds, y) => { const p = svg.createSVGPoint(); p.x = 40 + .9 * seconds; p.y = y;
        const result = p.matrixTransform(svg.getScreenCTM()); return { x: result.x, y: result.y }; };
      return { start: screen(150, 50), middle: screen(450, 50), outside: screen(600, 145), end: screen(421.7, 50) };
    });
    const pointerBefore = await read();
    if (phone) {
      const session = await page.context().newCDPSession(page), touch = point => [{ x: point.x, y: point.y, id: 1, radiusX: 4, radiusY: 4 }];
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
    after = await settled(); frozen(pointerBefore, after);
    const lastPointer = after.pointerEvents.filter(event => event.type === 'pointermove').at(-1);
    const pointerSeconds = Math.round(Math.max(0, Math.min(600, (600 * (lastPointer.clientX - after.chart.left) / after.chart.width - 40) / .9)) * 10) / 10;
    near(after.forecast.seconds, pointerSeconds); near(after.forecast.seconds, 421.7, phone ? 2 : .2);
    assert(Math.abs(after.forecast.seconds / 15 - Math.round(after.forecast.seconds / 15)) > .01, 'Pointer scrubbing selects a time between cached knots');
    assert(after.pointerEvents.some(event => event.type === 'gotpointercapture' && event.trusted));
    assert(after.pointerEvents.some(event => event.type === 'pointermove' && event.trusted && event.pointerType === (phone ? 'touch' : 'mouse')));
    result.checks.pointer = { seconds: after.forecast.seconds, type: phone ? 'touch' : 'mouse', captured: true, tenthSecondPrecision: true };

    await canvas.evaluate(cv => cv._issSeekForecast(3)); await settled();
    const beforePlay = await read(); await activate(panelPlay);
    await page.waitForFunction(seconds => { const f = document.querySelector('.iss-station-stage canvas')._issForecastState(); return f.playing && f.seconds > seconds; }, beforePlay.forecast.seconds);
    const playing = await read(); frozen(beforePlay, playing);
    assert(playing.buttons.every(button => button.pressed === 'true' && /pause/i.test(button.text)), 'Both buttons show the running preview state');
    await activate(stagePlay); after = await settled(); frozen(beforePlay, after);
    assert(after.forecast.seconds > beforePlay.forecast.seconds); assert.equal(after.forecast.playing, false);
    const pausedSeconds = after.forecast.seconds; await page.waitForTimeout(400); near((await read()).forecast.seconds, pausedSeconds);
    await canvas.evaluate(cv => cv._issSeekForecast(38)); await settled(); await activate(stagePlay);
    await page.waitForFunction(() => { const f = document.querySelector('.iss-station-stage canvas')._issForecastState(); return f.seconds === 600 && !f.playing; });
    after = await settled(); frozen(beforePlay, after);
    await activate(panelPlay);
    await page.waitForFunction(() => { const f = document.querySelector('.iss-station-stage canvas')._issForecastState(); return f.playing && f.seconds > 0 && f.seconds < 150; });
    after = await key(chart, 'Home', 0); frozen(beforePlay, after); assert.equal(after.forecast.playing, false);
    after = await key(chart, 'PageUp', 60);
    await activate(panelPlay); await canvas.evaluate(cv => cv._issPlayForecast(false)); after = await settled(); frozen(beforePlay, after);
    result.checks.playback = { bothButtons: true, preservesLiveState: true, explicitStart: true, stopsAtEnd: true, restartsFromEnd: true, seekPauses: true };

    await activate(panelPlay);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      try { document.dispatchEvent(new Event('visibilitychange')); } finally { delete document.hidden; }
    });
    after = await settled(); frozen(beforePlay, after); assert.equal(after.forecast.playing, false);
    result.checks.visibilityHandler = { syntheticHiddenNotification: true, paused: true };
    const detached = await canvas.evaluate(cv => {
      const state = cv._issForecastState(), first = state.sunlight.intervals[0].points[0].generation;
      const selected = JSON.parse(JSON.stringify(state.selected));
      state.sunlight.intervals[0].points[0].generation = -8; state.sunlight.events.length = 0;
      state.selected.seconds = -99; state.selected.normal[0] = -99;
      return { first, selected, fresh: cv._issForecastState() };
    });
    near(detached.fresh.sunlight.intervals[0].points[0].generation, detached.first); assert(detached.fresh.sunlight.events.length > 0);
    assert.deepEqual(detached.fresh.selected, detached.selected, 'The returned fractional pose is detached from internal simulation state');
    result.checks.copiedState = true;

    after = await configure({ phase: 240, beta: 20, motorEnabled: false, tracking: true });
    assert.equal(after.forecast.sunlight.events[0]?.type, 'sunrise');
    assert.equal(after.forecast.sunlight.intervals[0].eclipse, true); assert.equal(after.forecast.sunlight.intervals[1].eclipse, false);
    near(after.forecast.sunlight.intervals[0].points.at(-1).generation, 0); assert(after.forecast.sunlight.intervals[1].points[0].generation > .99);
    result.checks.exactSunrise = after.forecast.sunlight;
    after = await configure({ phase: 0, beta: 20, motorEnabled: false, tracking: false, arrayAlpha: 180, arrayFeather: 0 });
    assert.equal(after.forecast.selected.eclipse, false); near(after.forecast.selected.generation, 0);
    assert.equal(after.bands.length, 0); assert.equal(after.draw.fills[0].material.color, 0xffd374); near(after.draw.fills[0].material.opacity, .06);
    assert(after.stageInput.includes('Sunlight')); result.checks.backFaceZero = { sunlight: true, generation: 0, shadowSeconds: after.forecast.sunlight.shadowSeconds };
    after = await configure({ phase: 180, beta: 80, motorEnabled: false, tracking: true });
    assert.equal(after.forecast.sunlight.events.length, 0); assert.equal(after.bands.length, 0); near(after.forecast.sunlight.shadowSeconds, 0);
    assert(after.forecast.sunlight.intervals.every(interval => !interval.eclipse && interval.points.every(point => Math.abs(point.generation - 1) < 1e-6)));
    result.checks.highBetaContinuousSun = true;

    after = await configure({ phase: 100, beta: 20, motorEnabled: true, motorSmooth: true, motorRate: .08, motorAcceleration: .002, arrayAlpha: -145, arrayFeather: 20 });
    cached = null; await canvas.evaluate(cv => cv._issStepLighting(60)); await settled(); after = await open();
    const beforeCamera = after; await activate(page.locator('[data-iss-camera-view="truss"]')); after = await settled(); frozen(beforeCamera, after);
    assert.deepEqual(after.forecast, beforeCamera.forecast); result.checks.rerender = { retainsSolarPlotAndState: true };
    await canvas.evaluate(cv => cv._issSeekForecastTime(22.3)); after = await settled();
    const beforeMotion = after;
    await canvas.evaluate(cv => { window.__issSunPreviewQA.motion = []; cv._issPlayForecast(true); });
    await page.waitForFunction(() => window.__issSunPreviewQA.motion?.length >= 6);
    const motion = await canvas.evaluate(cv => { cv._issPlayForecast(false); const frames = window.__issSunPreviewQA.motion; window.__issSunPreviewQA.motion = null; return frames; });
    after = await settled(); frozen(beforeMotion, after);
    const distinct = motion.filter((frame, index) => !index || frame.selected.seconds > motion[index - 1].selected.seconds + 1e-8);
    assert(distinct.length >= 4, 'Playback renders several increasing forecast times');
    assert(distinct.some(frame => Math.abs(frame.selected.seconds / 15 - Math.round(frame.selected.seconds / 15)) > .001), 'Playback renders between cached knots');
    distinct.forEach((frame, index) => {
      frozen(beforeMotion, frame); verifyCachedPhysics(frame.selected, beforeMotion.state); verifyFuturePose(frame, frame.selected);
      if (!index) return;
      const previous = distinct[index - 1].selected, sample = frame.selected, dt = sample.seconds - previous.seconds;
      assert(dt > 0 && dt <= 15 + 1e-6, 'Each rendered step respects the wall-time cap at 60x playback');
      for (const [angle, rate] of [['alpha', 'alphaRate'], ['feather', 'featherRate']]) {
        assert(Math.abs(sample[rate]) <= beforeMotion.state.motorRate + 1e-6, 'Preview angular speed stays within the configured limit');
        assert(Math.abs(sample[rate] - previous[rate]) <= beforeMotion.state.motorAcceleration * dt + 1e-5, 'Preview velocity changes respect motor acceleration');
        const displacement = angle === 'alpha' ? Math.abs(wrap(sample[angle] - previous[angle] + 180) - 180) : Math.abs(sample[angle] - previous[angle]);
        assert(displacement <= beforeMotion.state.motorRate * dt + 1e-5, 'Panel displacement agrees with bounded angular speed');
      }
    });
    const pausedMotion = after.forecast;
    await canvas.evaluate((cv, seconds) => { cv._issSeekForecastTime(0); cv._issSeekForecastTime(seconds); }, pausedMotion.seconds);
    after = await settled(); assert.deepEqual(after.forecast.selected, pausedMotion.selected, 'Seeking back to a playback timestamp reconstructs the identical physical pose and velocity');
    await page.waitForTimeout(250); assert.deepEqual((await read()).forecast.selected, pausedMotion.selected, 'Paused fractional playback does not drift');
    result.checks.continuousPhysics = { frames: distinct.length, times: distinct.map(frame => frame.selected.seconds),
      constrainedVelocityAndAcceleration: true, ghostMatchesPhysicalPose: true, deterministicReplay: true, pausedFractionRetained: true };
    await canvas.evaluate(cv => cv._issSeekForecastTime(300)); await settled();
    await capture('smooth');

    const layout = await page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth,
      nodes: Array.from(document.querySelectorAll('[data-iss-forecast-content],[data-iss-forecast-content] button,[data-iss-forecast-content] input,[data-iss-forecast-solar-chart],[data-iss-forecast-stage]'), node => {
        const b = node.getBoundingClientRect(); return { label: node.getAttribute('aria-label') || node.textContent.trim().slice(0, 50), left: b.left, right: b.right,
          width: b.width, height: b.height, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth };
      }) }));
    assert(layout.width <= width + 1);
    for (const node of layout.nodes.filter(node => node.width && node.height)) {
      assert(node.left >= -1 && node.right <= width + 1, `Control exceeds viewport: ${JSON.stringify(node)}`);
      if (node.clientWidth) assert(node.scrollWidth <= node.clientWidth + 1, `Text exceeds control: ${JSON.stringify(node)}`);
    }
    await page.addScriptTag({ path: path.join(ROOT, 'desktop/web-app/node_modules/axe-core/axe.min.js') });
    const accessibility = await page.evaluate(async () => {
      const checked = await axe.run({ include: ['[data-iss-forecast-content]', '[data-iss-forecast-stage]', '[data-iss-forecast-toggle]'] },
        { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
      return { passes: checked.passes.length, violations: checked.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) };
    });
    assert.deepEqual(accessibility.violations, []); result.checks.layout = layout; result.checks.accessibility = accessibility;

    await canvas.evaluate(cv => cv._issSeekForecastTime(22.3)); after = await settled();
    const fractionalApply = { before: after.state, selected: after.forecast.selected };
    assert(Math.abs(fractionalApply.selected.alphaRate) + Math.abs(fractionalApply.selected.featherRate) > 1e-4, 'The fractional commit includes moving motor velocities');
    cached = null; await activate(page.locator('[data-iss-forecast-apply]')); after = await settled();
    assert.equal(after.forecast.active, false); assert.equal(after.forecast.playing, false);
    for (const [actual, selected] of [['phase', 'phase'], ['arrayAlpha', 'alpha'], ['arrayFeather', 'feather'], ['actualAlphaRate', 'alphaRate'], ['actualFeatherRate', 'featherRate']]) near(after.state[actual], fractionalApply.selected[selected], 1e-10);
    near(after.state.driveElapsed, fractionalApply.before.driveElapsed + 22.3, 1e-10);
    result.checks.fractionalApply = { seconds: 22.3, exactPoseAndVelocityCommit: true, stopsPreview: true };

    await open(); await activate(panelPlay); cached = null;
    const applied = await canvas.evaluate(cv => { const before = cv._issLightingState(), selected = cv._issForecastState().selected; cv._issApplyForecast(); return { before, selected }; });
    after = await settled(); assert.equal(after.forecast.active, false); assert.equal(after.forecast.playing, false);
    for (const [actual, selected] of [['phase', 'phase'], ['arrayAlpha', 'alpha'], ['arrayFeather', 'feather'], ['actualAlphaRate', 'alphaRate'], ['actualFeatherRate', 'featherRate']]) near(after.state[actual], applied.selected[selected], 1e-10);
    near(after.state.driveElapsed, applied.before.driveElapsed + applied.selected.seconds, 1e-10);
    result.checks.applyWhilePlaying = { seconds: applied.selected.seconds, exactPhysicalCommit: true, stopped: true };
    await open(); await activate(stagePlay); const beforeClose = await read(); cached = null;
    await activate(page.locator('[data-iss-forecast-close]')); after = await settled(); frozen(beforeClose, after); assert.equal(after.forecast.active, false);
    await open(); await activate(panelPlay); cached = null;
    await canvas.evaluate(cv => cv._issSetLighting({ beta: 21 })); after = await settled(); assert.equal(after.forecast.active, false); assert.equal(after.forecast.playing, false);
    result.checks.closeAndPhysicalEdit = { stopPlayback: true };
    result.errors = errors; result.hostErrors = await page.evaluate(() => window.__events?.errors || []);
    assert.deepEqual(errors, []); assert.deepEqual(result.hostErrors, []); result.passed = true;
    console.log(`Solar boundaries, 3D shading, playback, ${phone ? 'touch' : 'mouse'} scrubbing and accessibility passed at ${width}px`);
    return result;
  } catch (error) {
    result.passed = false; result.failure = error.stack || error.message; result.errors = errors;
    result.lastSnapshot = await read().catch(() => null);
    await page.screenshot({ path: path.join(output, `map-sun-preview-failure-${width}.png`) }).catch(() => {});
    error.qaResult = result; throw error;
  } finally {
    try {
      result.checks.cleanup = await page.evaluate(() => {
        document.querySelector('.iss-station-stage canvas')?._issSetLighting?.({ playing: false }); window.__destroy?.();
        return { contexts: window.__issSunPreviewQA?.contexts.length || 0, lost: (window.__issSunPreviewQA?.contexts || []).map(gl => gl.isContextLost()),
          resources: window.__issSunPreviewQA?.resources || {}, canvases: document.querySelectorAll('.iss-station-stage canvas').length };
      });
      if (result.passed) {
        assert(result.checks.cleanup.contexts > 0); assert(result.checks.cleanup.lost.every(Boolean)); assert.equal(result.checks.cleanup.canvases, 0);
        assert(Object.keys(result.checks.cleanup.resources).length >= 2);
        for (const resource of Object.values(result.checks.cleanup.resources)) assert.equal(resource.disposals, 1, `Dispose shared preview resource once: ${resource.type}`);
        assert.deepEqual(errors, []);
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
  console.log(`Sun preview browser checks passed: ${widths.join(', ')}px. Results: ${output}`);
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
