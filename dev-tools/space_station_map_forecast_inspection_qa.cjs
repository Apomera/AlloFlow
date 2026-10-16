#!/usr/bin/env node
'use strict';

// Actual-WebGL checks for forecast incidence guides and precise eclipse inspection.
// Uses the existing preview server. No server is launched or changed by this script.
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
const output = path.resolve(ROOT, argument('--out', 'reports/space-station-enhancement-qa/map-forecast-inspection-browser'));
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
const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);
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
  window.__issForecastInspectionQA = { draw: null, sequence: 0, contexts: [], resources: {}, events: [] };
  function ObservedRenderer(options) {
    const renderer = new Original(options), render = renderer.render;
    window.__issForecastInspectionQA.contexts.push(renderer.getContext());
    renderer.render = function (scene, camera) {
      const qa = window.__issForecastInspectionQA, cv = renderer.domElement;
      const group = scene.getObjectByName('iss-array-forecast-guides');
      group?.traverse(object => {
        if (!object.geometry || !object.material) return;
        if (!object.__inspectionQA) {
          object.__inspectionQA = { draws: 0 }; const original = object.onAfterRender;
          object.onAfterRender = function () { object.__inspectionQA.draws++; if (original) original.apply(this, arguments); };
        }
        for (const resource of [object.geometry, ...[].concat(object.material)]) {
          if (qa.resources[resource.uuid]) continue;
          qa.resources[resource.uuid] = { type: resource.type, disposals: 0 };
          resource.addEventListener('dispose', () => { qa.resources[resource.uuid].disposals++; });
        }
      });
      const returned = render.apply(this, arguments);
      if (scene.name === 'iss-station-inspection' && cv._issForecastState) {
        const arc = scene.getObjectByName('iss-forecast-incidence-arc'), ring = scene.getObjectByName('iss-forecast-guide-origin');
        const describeArrow = name => {
          const arrow = scene.getObjectByName(name); if (!arrow) return null;
          return { name: arrow.name, parent: arrow.parent?.name, position: arrow.position.toArray(),
            direction: new window.THREE.Vector3(0, 1, 0).applyQuaternion(arrow.quaternion).toArray(),
            length: arrow.cone.position.y, color: arrow.line.material.color.toArray(), shaftType: arrow.line.material.type,
            draws: arrow.line.__inspectionQA?.draws || 0 };
        };
        const materials = []; group?.traverse(object => {
          for (const material of object.material ? [].concat(object.material) : []) materials.push({ type: material.type,
            depthTest: material.depthTest, depthWrite: material.depthWrite, toneMapped: material.toneMapped });
        });
        let selectedModule = null;
        scene.traverse(object => { if (object._issId === cv._issWantSel) selectedModule = object; });
        const selectedProjection = selectedModule?.getWorldPosition(new window.THREE.Vector3()).project(camera);
        qa.draw = { sequence: ++qa.sequence, state: cv._issLightingState(), forecast: cv._issForecastState(),
          markerExpected: selectedProjection ? [(selectedProjection.x * .5 + .5) * cv.clientWidth, (-selectedProjection.y * .5 + .5) * cv.clientHeight] : null,
          group: group ? { visible: group.visible, position: group.position.toArray(), quaternion: group.quaternion.toArray(),
            parent: group.parent?.name } : null, pivot: scene.getObjectByName('iss-array-wing-2')?.position.toArray(),
          sun: describeArrow('iss-forecast-sun-direction'), normal: describeArrow('iss-forecast-panel-normal'), materials,
          ring: ring ? { parent: ring.parent?.name, position: ring.position.toArray(),
            normal: new window.THREE.Vector3(0, 0, 1).applyQuaternion(ring.quaternion).toArray() } : null,
          arc: arc ? { visible: arc.visible, parent: arc.parent?.name, position: arc.position.toArray(),
            points: Array.from(arc.geometry.attributes.position.array), count: arc.geometry.attributes.position.count,
            draws: arc.__inspectionQA?.draws || 0 } : null };
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
  assert(d?.group && d.sun && d.normal && d.arc, 'Incidence guides exist in the rendered station scene');
  assert.equal(snapshot.glLost, false); assert.equal(snapshot.state.playing, false);
  assert.equal(d.forecast.active, f.active); assert.equal(d.forecast.guides, f.guides);
  assert.equal(d.group.visible, f.active && f.seconds > 0 && f.guides);
  vectorNear(d.group.quaternion, [0, 0, 0, 1]);
  assert.equal(d.group.parent, 'iss-inspected-station');
  assert(d.markerExpected, 'The selected station module has a projected label anchor');
  vectorNear(snapshot.markerPosition, d.markerExpected, .02);
  if (!f.active) { assert.equal(f.guide, null); return snapshot; }
  near(d.forecast.seconds, f.seconds); assert.equal(snapshot.guidesPressed, String(f.guides));
  const guide = f.guide, sample = f.selected, alpha = sample.alpha * Math.PI / 180, feather = sample.feather * Math.PI / 180;
  assert(guide); vectorNear(guide.normal, sample.normal); vectorNear(guide.sun, sample.sun);
  const origin = [-.02 * Math.sin(feather), .02 * Math.cos(feather) * Math.cos(alpha) - 2 * Math.sin(alpha),
    .02 * Math.cos(feather) * Math.sin(alpha) + 2 * Math.cos(alpha)];
  vectorNear(guide.origin, origin); vectorNear(d.group.position, origin.map((value, index) => value + d.pivot[index]));
  const angle = Math.acos(Math.max(-1, Math.min(1, dot(sample.normal, sample.sun)))) * 180 / Math.PI;
  near(guide.angle, angle, 2e-5); near(snapshot.faceAngle, angle, 2e-5);
  vectorNear(d.normal.direction, sample.normal); vectorNear(d.sun.direction, sample.sun);
  near(d.normal.length, 1.8); near(d.sun.length, 2.4);
  assert.equal(d.normal.shaftType, 'LineDashedMaterial'); assert.equal(d.sun.shaftType, 'LineDashedMaterial');
  assert(d.sun.color[0] > d.sun.color[2], 'The Sun arrow is warm colored');
  assert(d.normal.color[2] > d.normal.color[0], 'The panel normal is cool colored');
  for (const object of [d.normal, d.sun, d.arc]) { assert.equal(object.parent, 'iss-array-forecast-guides'); vectorNear(object.position, [0, 0, 0]); }
  assert(d.ring); assert.equal(d.ring.parent, 'iss-array-forecast-guides'); vectorNear(d.ring.position, [0, 0, 0]); vectorNear(d.ring.normal, sample.normal);
  assert.equal(d.arc.count, 33); assert.equal(guide.arc.length, 33); assert.equal(d.arc.visible, angle > .001);
  for (let index = 0; index < 33; index++) {
    const local = guide.arc[index].map((value, axis) => value - guide.origin[axis]);
    vectorNear(d.arc.points.slice(index * 3, index * 3 + 3), local, 2e-6);
    near(Math.hypot(...local), .85, 1e-6);
  }
  vectorNear(guide.arc[0], sample.normal.map((value, index) => .85 * value + guide.origin[index]));
  vectorNear(guide.arc[32], sample.sun.map((value, index) => .85 * value + guide.origin[index]), 1e-6);
  assert(d.materials.length >= 5);
  for (const material of d.materials) {
    assert.equal(material.depthTest, false); assert.equal(material.depthWrite, false); assert.equal(material.toneMapped, false);
  }
  if (d.group.visible) assert(d.normal.draws > 0 && d.sun.draws > 0, 'Both arrows reach WebGL draw calls');
  if (d.group.visible && d.arc.visible) assert(d.arc.draws > 0, 'The incidence arc reaches WebGL draw calls');
  assert.equal(snapshot.cards.length, f.sunlight.events.length);
  snapshot.cards.forEach((card, index) => {
    const event = f.sunlight.events[index], previous = f.sunlight.events[index - 1]?.seconds || 0;
    const next = f.sunlight.events[index + 1]?.seconds ?? f.horizonSeconds;
    assert.equal(card.index, index); assert.equal(card.type, event.type); assert(new RegExp(event.type, 'i').test(card.text));
    assert.equal(card.buttons.length, 3);
    for (const [side, seconds] of [['before', event.seconds - Math.min(1, (event.seconds - previous) / 2)],
      ['at', event.seconds], ['after', event.seconds + Math.min(1, (next - event.seconds) / 2)]]) {
      const button = card.buttons.find(candidate => candidate.side === side); assert(button && button.label.trim());
      near(button.seconds, seconds, 1e-8); assert(button.seconds >= 0 && button.seconds <= f.horizonSeconds);
      assert.equal(button.pressed, String(f.seconds === button.seconds));
    }
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
  const guides = page.locator('[data-iss-forecast-guides]');
  const activate = async locator => phone ? locator.tap() : locator.click();
  const read = () => canvas.evaluate(cv => {
    const gl = cv.getContext('webgl2') || cv.getContext('webgl');
    return { state: cv._issLightingState(), forecast: cv._issForecastState(), camera: cv._issCameraState(),
      draw: window.__issForecastInspectionQA.draw, glLost: gl ? gl.isContextLost() : null,
      markerPosition: ['left', 'top'].map(key => parseFloat(cv.parentElement.querySelector('[data-iss-module-marker]').style[key])),
      guidesPressed: document.querySelector('[data-iss-forecast-guides]')?.getAttribute('aria-pressed'),
      faceAngle: Number(document.querySelector('[data-iss-forecast-reading="face-angle"]')?.getAttribute('data-value')),
      eventsText: document.querySelector('[data-iss-forecast-events]')?.textContent || '',
      cards: Array.from(document.querySelectorAll('[data-iss-forecast-event]'), node => ({ index: Number(node.getAttribute('data-iss-forecast-event')),
        type: node.getAttribute('data-event-type'), text: node.textContent,
        buttons: Array.from(node.querySelectorAll('[data-iss-forecast-event-side]'), button => ({ side: button.getAttribute('data-iss-forecast-event-side'),
          seconds: Number(button.getAttribute('data-seconds')), pressed: button.getAttribute('aria-pressed'),
          label: button.getAttribute('aria-label') || button.textContent })) })),
      events: window.__issForecastInspectionQA.events.slice(-40) };
  });
  const settled = async () => {
    await page.waitForFunction(() => {
      const cv = document.querySelector('.iss-station-stage canvas'), d = window.__issForecastInspectionQA?.draw;
      if (!cv?._issForecastState || !d) return false;
      const f = cv._issForecastState(), s = cv._issLightingState();
      return !s.playing && !f.playing && !cv._issCameraState().tweening && d.forecast.active === f.active && d.forecast.guides === f.guides &&
        (!f.active || Math.abs(d.forecast.seconds - f.seconds) < 1e-7) &&
        ['phase', 'beta', 'arrayAlpha', 'arrayFeather'].every(key => Math.abs(d.state[key] - s[key]) < 1e-7);
    }, undefined, { polling: 100 });
    return verify(await read());
  };
  const configure = async settings => {
    await canvas.evaluate((cv, patch) => cv._issSetLighting(patch), settings); await settled();
    const before = await read(); await activate(toggle); const after = await settled();
    frozen(before, after); assert(after.forecast.active); near(after.forecast.seconds, 300); return after;
  };
  const eventSeek = async (index, side, keyboard = false) => {
    const before = await read(), button = page.locator(`[data-iss-forecast-event="${index}"] [data-iss-forecast-event-side="${side}"]`);
    const seconds = Number(await button.getAttribute('data-seconds'));
    if (keyboard) { await button.focus(); await page.keyboard.press('Enter'); } else await activate(button);
    const after = await settled(); frozen(before, after); sameCamera(before, after);
    near(after.forecast.seconds, seconds, 1e-9); assert.equal(after.forecast.playing, false);
    assert(after.events.some(event => event.side === side && event.trusted && event.type === 'click'));
    return after;
  };
  const capture = async label => {
    const before = await settled(); await page.evaluate(() => document.activeElement?.blur());
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
      const bounds = samples.at(-1), filename = `map-forecast-inspection-${label}-${suffix}-${width}.png`;
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
    console.log(`Checking forecast inspection at ${width}px`);
    await page.addInitScript(() => { window.AlloPostFXEnabled = false; });
    await page.route('**/vendor/three-r128/three.min.js', async route => {
      const response = await route.fetch(); assert(response.ok());
      await route.fulfill({ response, body: (await response.text()) + '\n;(' + observeRenderer.toString() + ')();\n' });
    });
    await page.goto(`${base}/?tab=map`, { waitUntil: 'load' }); await toggle.waitFor(); await settled();
    await page.evaluate(() => {
      for (const type of ['pointerdown', 'click']) document.addEventListener(type, event => {
        const node = event.target.closest('[data-iss-forecast-event-side],[data-iss-forecast-guides]');
        if (node) window.__issForecastInspectionQA.events.push({ type, side: node.getAttribute('data-iss-forecast-event-side'),
          guides: node.hasAttribute('data-iss-forecast-guides'), trusted: event.isTrusted, pointerType: event.pointerType || null });
      }, true);
    });
    let after = await configure({ phase: 100, beta: 20, motorEnabled: false, tracking: true });
    assert.equal(after.forecast.guides, true); assert.equal(after.forecast.sunlight.events[0]?.type, 'sunset');
    after = await eventSeek(0, 'before'); assert.equal(after.forecast.selected.eclipse, false);
    await eventSeek(0, 'at', true);
    after = await eventSeek(0, 'after'); assert.equal(after.forecast.selected.eclipse, true);
    assert(after.events.some(event => event.type === 'pointerdown' && event.trusted && event.pointerType === (phone ? 'touch' : 'mouse')));
    result.checks.eventControls = { mouseOrTouch: phone ? 'touch' : 'mouse', keyboardEnter: true, exactBoundary: true, preservesLiveAndCamera: true };

    const beforeToggle = after; await activate(guides); after = await settled();
    assert.equal(after.forecast.guides, false); frozen(beforeToggle, after); sameCamera(beforeToggle, after);
    near(after.forecast.seconds, beforeToggle.forecast.seconds); assert.deepEqual(after.forecast.selected, beforeToggle.forecast.selected);
    await guides.focus(); await page.keyboard.press('Enter'); after = await settled(); assert.equal(after.forecast.guides, true);
    const toggleWhilePlaying = await canvas.evaluate(cv => {
      cv._issPlayForecast(true); const before = { f: cv._issForecastState(), s: cv._issLightingState(), c: cv._issCameraState() };
      cv._issSetForecastGuides(false); const after = { f: cv._issForecastState(), s: cv._issLightingState(), c: cv._issCameraState() };
      cv._issSetForecastGuides(true); cv._issPlayForecast(false); return { before, after };
    });
    assert(toggleWhilePlaying.before.f.playing && toggleWhilePlaying.after.f.playing);
    near(toggleWhilePlaying.before.f.seconds, toggleWhilePlaying.after.f.seconds);
    assert.deepEqual(toggleWhilePlaying.before.f.selected, toggleWhilePlaying.after.f.selected);
    frozen({ state: toggleWhilePlaying.before.s }, { state: toggleWhilePlaying.after.s });
    sameCamera({ camera: toggleWhilePlaying.before.c }, { camera: toggleWhilePlaying.after.c }); await settled();
    result.checks.guideToggle = { trustedPointerAndKeyboard: true, noTimeOrPhysicsMutation: true, preservesPlayback: true };

    const detached = await canvas.evaluate(cv => {
      const state = cv._issForecastState(), original = JSON.parse(JSON.stringify(state.guide));
      state.guide.origin[0] = 999; state.guide.normal[0] = 999; state.guide.sun[0] = 999; state.guide.arc[0][0] = 999;
      return { original, fresh: cv._issForecastState().guide };
    });
    assert.deepEqual(detached.fresh, detached.original); result.checks.detachedGuideState = true;

    after = await configure({ phase: 240, beta: 20, motorEnabled: false, tracking: true });
    assert.equal(after.forecast.sunlight.events[0]?.type, 'sunrise');
    after = await eventSeek(0, 'before'); assert.equal(after.forecast.selected.eclipse, true);
    after = await eventSeek(0, 'after'); assert.equal(after.forecast.selected.eclipse, false);
    result.checks.sunrise = true;

    const period = after.state.periodSeconds, half = .4 * 360 / period, limit = Math.sqrt(1 - (6371 / 6791) ** 2);
    const beta = Math.acos(limit / Math.cos(half * Math.PI / 180)) * 180 / Math.PI;
    after = await configure({ phase: 180 - half - 30 * 360 / period, beta, motorEnabled: false, tracking: true });
    assert.equal(after.cards.length, 2); near(after.forecast.sunlight.events[1].seconds - after.forecast.sunlight.events[0].seconds, .8, 1e-5);
    after = await eventSeek(0, 'before'); assert.equal(after.forecast.selected.eclipse, false);
    after = await eventSeek(0, 'after'); assert.equal(after.forecast.selected.eclipse, true);
    after = await eventSeek(1, 'before'); assert.equal(after.forecast.selected.eclipse, true);
    after = await eventSeek(1, 'after'); assert.equal(after.forecast.selected.eclipse, false);
    result.checks.grazing = { durationSeconds: after.forecast.sunlight.shadowSeconds, twoCards: true, guardedOffsetsStayOnCorrectSide: true };
    await capture('grazing');

    after = await configure({ phase: 180, beta: 80, motorEnabled: false, tracking: true });
    assert.equal(after.cards.length, 0); assert(after.eventsText.trim()); near(after.forecast.sunlight.shadowSeconds, 0);
    result.checks.highBetaNoEvents = true;
    after = await configure({ phase: 0, beta: 0, motorEnabled: false, tracking: false, arrayAlpha: 180, arrayFeather: 0 });
    await canvas.evaluate(cv => cv._issSeekForecastTime(.1)); after = await settled();
    assert(after.forecast.guide.angle > 179); near(after.forecast.selected.generation, 0); assert.equal(after.forecast.selected.eclipse, false);
    await canvas.evaluate(cv => cv._issSeekForecastTime(0)); after = await settled(); near(after.forecast.guide.angle, 180);
    assert.equal(after.draw.group.visible, false); result.checks.backFaceAndAntiparallel = true;

    after = await configure({ phase: 100, beta: 20, motorEnabled: true, motorSmooth: true, motorRate: .08, motorAcceleration: .002, tracking: false, arrayAlpha: -60, arrayFeather: 25 });
    await canvas.evaluate(cv => cv._issStepLighting(60)); await settled(); await activate(toggle); after = await settled();
    assert(after.forecast.guide.angle > 1); assert(after.forecast.guide.normal.some((value, index) => Math.abs(value - after.state.wingNormal[index]) > .01));
    const beforeCamera = after; await activate(page.locator('[data-iss-camera-view="truss"]')); after = await settled();
    frozen(beforeCamera, after); assert.deepEqual(after.forecast, beforeCamera.forecast);
    result.checks.futureVectorsIndependentOfLive = true;
    await capture('incidence');

    const stageLayout = await page.evaluate(() => {
      const canvas = document.querySelector('.iss-station-stage canvas').getBoundingClientRect();
      const controls = document.querySelector('[data-iss-forecast-stage]').getBoundingClientRect();
      const bounds = node => { const b = node.getBoundingClientRect(); return { top: b.top, bottom: b.bottom }; };
      return { canvas: { top: canvas.top, bottom: canvas.bottom }, controls: { top: controls.top, bottom: controls.bottom },
        anchored: ['.iss-orientation-widget', '.iss-stage-transport', '.iss-stage-help'].map(selector => bounds(document.querySelector(selector))) };
    });
    if (phone) {
      assert(stageLayout.controls.top >= stageLayout.canvas.bottom, 'Phone preview controls sit below the canvas, leaving the future panel visible');
      for (const overlay of stageLayout.anchored) assert(overlay.top >= stageLayout.canvas.top && overlay.bottom <= stageLayout.canvas.bottom + 1,
        'Camera guides and live transport remain anchored to the canvas');
    }
    result.checks.stageLayout = stageLayout;
    const layout = await page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth,
      nodes: Array.from(document.querySelectorAll('[data-iss-forecast-event],[data-iss-forecast-event-side],[data-iss-forecast-guides]'), node => {
        const b = node.getBoundingClientRect(); return { label: node.textContent.trim(), left: b.left, right: b.right, width: b.width,
          height: b.height, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth };
      }) }));
    assert(layout.width <= width + 1);
    for (const node of layout.nodes.filter(node => node.width && node.height)) {
      assert(node.left >= -1 && node.right <= width + 1, `Control exceeds viewport: ${JSON.stringify(node)}`);
      if (node.clientWidth) assert(node.scrollWidth <= node.clientWidth + 1, `Text exceeds control: ${JSON.stringify(node)}`);
    }
    await page.addScriptTag({ path: path.join(ROOT, 'desktop/web-app/node_modules/axe-core/axe.min.js') });
    const accessibility = await page.evaluate(async () => {
      const checked = await axe.run({ include: ['[data-iss-forecast-content]'] }, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
      return { passes: checked.passes.length, violations: checked.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })) };
    });
    assert.deepEqual(accessibility.violations, []); result.checks.layout = layout; result.checks.accessibility = accessibility;

    await canvas.evaluate(cv => cv._issPlayForecast(true));
    await eventSeek(0, 'at');
    await canvas.evaluate(cv => cv._issPlayForecast(true));
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      try { document.dispatchEvent(new Event('visibilitychange')); } finally { delete document.hidden; }
    });
    after = await settled(); assert(after.forecast.active && !after.forecast.playing); assert(after.draw.group.visible);
    await activate(page.locator('[data-iss-forecast-close]')); after = await settled(); assert(!after.forecast.active && !after.draw.group.visible);
    await activate(toggle); await settled(); await canvas.evaluate(cv => cv._issSetLighting({ beta: 21 }));
    after = await settled(); assert(!after.forecast.active && !after.draw.group.visible);
    result.checks.lifecycle = { eventSeekPausesPlayback: true, hiddenPausesAndRetainsPreview: true, closeAndPhysicalEditHideGuides: true };
    result.errors = errors; result.hostErrors = await page.evaluate(() => window.__events?.errors || []);
    assert.deepEqual(errors, []); assert.deepEqual(result.hostErrors, []); result.passed = true;
    console.log(`Forecast guides, eclipse cards, ${phone ? 'touch' : 'mouse'} controls and accessibility passed at ${width}px`);
    return result;
  } catch (error) {
    result.passed = false; result.failure = error.stack || error.message; result.errors = errors;
    result.lastSnapshot = await read().catch(() => null); error.qaResult = result; throw error;
  } finally {
    try {
      result.checks.cleanup = await page.evaluate(() => {
        document.querySelector('.iss-station-stage canvas')?._issSetLighting?.({ playing: false }); window.__destroy?.();
        return { contexts: window.__issForecastInspectionQA?.contexts.length || 0,
          lost: (window.__issForecastInspectionQA?.contexts || []).map(gl => gl.isContextLost()),
          resources: window.__issForecastInspectionQA?.resources || {}, canvases: document.querySelectorAll('.iss-station-stage canvas').length };
      });
      if (result.passed) {
        assert(result.checks.cleanup.contexts > 0); assert(result.checks.cleanup.lost.every(Boolean)); assert.equal(result.checks.cleanup.canvases, 0);
        assert(Object.keys(result.checks.cleanup.resources).length >= 6);
        for (const resource of Object.values(result.checks.cleanup.resources)) assert.equal(resource.disposals, 1, `Dispose guide resource once: ${resource.type}`);
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
  console.log(`Forecast inspection checks passed: ${widths.join(', ')}px. Results: ${output}`);
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
