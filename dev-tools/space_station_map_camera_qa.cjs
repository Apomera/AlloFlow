#!/usr/bin/env node
'use strict';

// Native camera and lighting-guide QA against an already running local preview.
//   node dev-tools/space_station_map_camera_qa.cjs
//   node dev-tools/space_station_map_camera_qa.cjs --widths=1440,390 --base=http://127.0.0.1:4179
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const argument = (name, fallback) => {
  const match = process.argv.slice(2).find(value => value.startsWith(name + '='));
  return match ? match.slice(name.length + 1) : fallback;
};
const base = argument('--base', 'http://127.0.0.1:4179').replace(/\/$/, '');
const output = path.resolve(ROOT, argument('--out', 'reports/space-station-enhancement-qa/map-camera-browser'));
const widths = argument('--widths', '1440,390').split(',').map(Number);
assert(widths.length && widths.every(width => Number.isInteger(width) && width >= 320));
const near = (actual, expected, tolerance = 1e-6) => {
  assert(Number.isFinite(actual) && Number.isFinite(expected), `Expected finite values: ${actual}, ${expected}`);
  assert(Math.abs(actual - expected) <= tolerance, `${actual} should equal ${expected} within ${tolerance}`);
};
const vectorNear = (actual, expected, tolerance = 1e-6) => {
  assert(Array.isArray(actual) && Array.isArray(expected) && actual.length === expected.length);
  actual.forEach((value, index) => near(value, expected[index], tolerance));
};
const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);
const moved = (a, b) => Math.hypot(...a.map((value, index) => value - b[index])) > 1e-5;

// Observe the real camera after render, independently of the public snapshot.
function instrumentCameraRender() {
  const Original = window.THREE.WebGLRenderer;
  window.__issCameraQAContexts = [];
  window.__issCameraQADraw = null;
  let sequence = 0;
  function ObservedRenderer(options) {
    const renderer = new Original(options), render = renderer.render;
    window.__issCameraQAContexts.push(renderer.getContext());
    renderer.render = function (scene, camera) {
      const result = render.apply(this, arguments);
      if (scene.name === 'iss-station-inspection') {
        const state = renderer.domElement._issCameraState?.();
        const station = scene.getObjectByName('iss-inspected-station');
        if (state && station) {
          const projected = new window.THREE.Vector3(...state.target).project(camera);
          const rotation = new window.THREE.Quaternion(); station.getWorldQuaternion(rotation);
          window.__issCameraQADraw = { sequence: ++sequence, position: camera.position.toArray(),
            projectedTarget: projected.toArray(), stationQuaternion: rotation.toArray(),
            guides: scene.children.filter(object => object instanceof window.THREE.ArrowHelper).map(arrow => {
              const orientation = new window.THREE.Quaternion(); arrow.getWorldQuaternion(orientation);
              return { color: arrow.line.material.color.getHex(), visible: arrow.visible,
                direction: new window.THREE.Vector3(0, 1, 0).applyQuaternion(orientation).toArray() };
            }) };
        }
      }
      return result;
    };
    return renderer;
  }
  ObservedRenderer.prototype = Original.prototype;
  Object.setPrototypeOf(ObservedRenderer, Original);
  window.THREE.WebGLRenderer = ObservedRenderer;
}

function verifySnapshot(snapshot) {
  const c = snapshot.camera, light = snapshot.light;
  for (const key of ['position', 'target', 'projectedTarget', 'guideSun', 'guideNormal']) {
    assert(Array.isArray(c[key]) && c[key].length === 3 && c[key].every(Number.isFinite), `${key} is a finite vector`);
  }
  assert(Array.isArray(c.stationQuaternion) && c.stationQuaternion.length === 4);
  near(Math.hypot(...c.stationQuaternion), 1);
  vectorNear(c.stationQuaternion, [0, 0, 0, 1]);
  near(c.distance, Math.hypot(...c.position.map((value, index) => value - c.target[index])));
  assert(c.minDistance > 0 && c.maxDistance >= c.minDistance);
  assert(c.distance >= c.minDistance - 1e-6 && c.distance <= c.maxDistance + 1e-6);
  assert(c.position[1] >= -3.8 - 1e-6, 'Camera remains above the Earth inspection floor');
  near(c.projectedTarget[0], 0); near(c.projectedTarget[1], 0);
  assert(c.projectedTarget[2] > -1 && c.projectedTarget[2] < 1, 'The focus target remains inside the camera clipping range');
  assert.equal(c.tweening, false, 'Reduced-motion camera changes settle immediately');
  assert.equal(c.activePointers, 0, 'Completed gestures release their active pointers');
  assert.equal(typeof c.guides, 'boolean');
  assert(['overview', 'truss', 'labs', 'russian', 'nadir', 'custom'].includes(c.view));
  assert(c.renderCount > 0);
  assert.equal(light.playing, false);
  vectorNear(c.guideSun, light.sun); vectorNear(c.guideNormal, light.wingNormal);
  near(Math.hypot(...c.guideSun), 1); near(Math.hypot(...c.guideNormal), 1);
  const cosine = Math.max(-1, Math.min(1, dot(light.sun, light.wingNormal)));
  near(light.incidence, Math.max(0, cosine));
  near(light.generation, light.eclipse ? 0 : Math.max(0, cosine));
  assert.match(snapshot.angleText, /°|deg/i);
  near(snapshot.angle, Math.acos(cosine) * 180 / Math.PI, .100001);
  assert.equal(snapshot.guidePressed, String(c.guides));
  const activeViews = snapshot.viewButtons.filter(button => button.pressed === 'true');
  assert.equal(activeViews.length, c.view === 'custom' ? 0 : 1);
  if (c.view !== 'custom') assert.equal(activeViews[0].view, c.view);
  assert(snapshot.draw, 'The renderer proxy must observe an actual station draw');
  vectorNear(snapshot.draw.position, c.position);
  vectorNear(snapshot.draw.projectedTarget, c.projectedTarget);
  vectorNear(snapshot.draw.stationQuaternion, c.stationQuaternion);
  for (const [color, direction] of [[0xfbbf24, light.sun], [0x67e8f9, light.wingNormal]]) {
    const arrow = snapshot.draw.guides.find(guide => guide.color === color);
    assert(arrow, 'The station scene contains both physical direction guides');
    assert.equal(arrow.visible, c.guides);
    if (c.guides) vectorNear(arrow.direction, direction);
  }
  assert.equal(snapshot.glLost, false);
  return snapshot;
}

function unchangedPhysics(before, after) {
  vectorNear(after.camera.stationQuaternion, before.camera.stationQuaternion);
  for (const key of ['phase', 'beta', 'incidence', 'generation', 'sunIntensity', 'earthSunIntensity']) near(after.light[key], before.light[key]);
  for (const key of ['tracking', 'eclipse', 'playing']) assert.equal(after.light[key], before.light[key]);
  vectorNear(after.light.sun, before.light.sun); vectorNear(after.light.wingNormal, before.light.wingNormal);
}

function preservedFocus(before, after) {
  unchangedPhysics(before, after);
  vectorNear(after.camera.target, before.camera.target);
  assert.equal(after.camera.focusId, before.camera.focusId);
  assert.equal(after.selected, before.selected, 'Camera gestures must not select another module');
  assert.equal(after.camera.view, 'custom');
}

async function runWidth(browser, width) {
  const phone = width < 500, errors = [];
  const result = { width, touch: phone, checks: {}, screenshots: [] };
  const page = await browser.newPage({ viewport: { width, height: phone ? 844 : 1080 }, deviceScaleFactor: 1,
    isMobile: phone, hasTouch: phone, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000);
  page.on('pageerror', error => errors.push(error.stack || error.message));
  await page.addInitScript(() => {
    let seed = 42;
    Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    window.AlloPostFXEnabled = false;
  });
  await page.route('**/vendor/three-r128/three.min.js', async route => {
    const response = await route.fetch(); assert(response.ok());
    await route.fulfill({ response, body: (await response.text()) + '\n;(' + instrumentCameraRender.toString() + ')();\n' });
  });
  const canvas = page.locator('.iss-station-stage canvas'), stage = page.locator('.iss-station-stage');
  const controls = page.locator('.iss-map-controls'), cameraTools = page.locator('[data-iss-camera-tools]');
  const lighting = page.locator('[data-iss-lighting-panel]');
  const guides = page.locator('[data-iss-light-guides]');
  const zoom = direction => page.locator(`[data-iss-camera-zoom="${direction}"]`);
  const reset = page.locator('[data-iss-camera-reset]');
  const activate = async locator => {
    if (phone) await locator.tap(); else { await locator.focus(); await page.keyboard.press('Enter'); }
  };
  const read = () => canvas.evaluate(cv => {
    const angleText = document.querySelector('[data-iss-lighting-reading="angle"]').textContent;
    const gl = cv.getContext('webgl2') || cv.getContext('webgl');
    return { camera: cv._issCameraState(), light: cv._issLightingState(), selected: cv._issWantSel,
      angleText, angle: Number.parseFloat(angleText), guidePressed: document.querySelector('[data-iss-light-guides]').getAttribute('aria-pressed'),
      viewButtons: Array.from(document.querySelectorAll('[data-iss-camera-view]'), button => ({ view: button.dataset.issCameraView, pressed: button.getAttribute('aria-pressed') })),
      draw: window.__issCameraQADraw, scrollY, glLost: gl ? gl.isContextLost() : null };
  });
  const waitCamera = (predicate, arg) => page.waitForFunction(({ source, arg }) => {
    const cv = document.querySelector('.iss-station-stage canvas');
    return cv?._issCameraState && Function('c', 'arg', 'return (' + source + ')(c, arg)')(cv._issCameraState(), arg);
  }, { source: predicate.toString(), arg }, { timeout: 30000, polling: 100 });
  const afterAction = async (before, predicate = c => !c.tweening && c.activePointers === 0) => {
    await waitCamera(predicate);
    await waitCamera((c, count) => {
      const draw = window.__issCameraQADraw;
      return c.renderCount > count && draw && draw.position.every((value, index) => Math.abs(value - c.position[index]) < 1e-6) &&
        draw.projectedTarget.every((value, index) => Math.abs(value - c.projectedTarget[index]) < 1e-6) &&
        draw.guides.every(guide => guide.visible === c.guides);
    }, before.camera.renderCount);
    return verifySnapshot(await read());
  };
  const capture = async label => {
    await page.evaluate(() => document.activeElement?.blur());
    const name = `map-camera-${label}-${width}.png`;
    const image = await stage.screenshot({ path: path.join(output, name), animations: 'disabled' });
    result.screenshots.push(name);
    return image;
  };
  const surface = async () => {
    await canvas.hover();
    const box = await canvas.boundingBox(); assert(box && box.width > 200 && box.height >= 300);
    return { box, x: box.x + box.width / 2, y: box.y + box.height * .5 };
  };
  const touchGesture = async (points, moves, cancel = false) => {
    const session = await page.context().newCDPSession(page);
    try {
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points });
      for (const touchPoints of moves) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints });
      await session.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] });
    } finally { await session.detach(); }
  };
  try {
    console.log(`Checking camera and light guides at ${width}px`);
    await page.goto(`${base}/?tab=map`, { waitUntil: 'load' });
    await guides.waitFor();
    await waitCamera(c => c.renderCount > 0);
    const initial = verifySnapshot(await read());
    assert.equal(initial.camera.view, 'overview'); assert.equal(initial.camera.focusId, null);
    assert.equal(initial.camera.guides, false);
    await page.waitForTimeout(300);
    const idle = verifySnapshot(await read());
    vectorNear(idle.camera.position, initial.camera.position); unchangedPhysics(initial, idle);
    result.checks.initial = initial;
    // Parked panels expose accidental station rotation that ideal tracking could conceal.
    await activate(page.locator('[data-iss-array-tracking]'));
    const parked = await afterAction(idle);
    assert.equal(parked.light.tracking, false);

    const presets = [];
    for (const view of ['truss', 'labs', 'russian', 'nadir', 'overview']) {
      const before = await read();
      await activate(page.locator(`[data-iss-camera-view="${view}"]`));
      const after = await afterAction(before);
      assert.equal(after.camera.view, view); assert.equal(after.camera.focusId, null);
      unchangedPhysics(parked, after); assert(moved(before.camera.position, after.camera.position));
      presets.push(after.camera);
    }
    result.checks.presets = presets;
    await activate(page.locator('.iss-module-picker').getByRole('button', { name: 'Harmony', exact: true }));
    const beforeFocus = await read();
    await activate(page.locator('[data-iss-focus-module="harmony"]'));
    await waitCamera(c => c.focusId === 'harmony');
    const focused = await afterAction(beforeFocus);
    assert.equal(focused.selected, 'harmony'); unchangedPhysics(parked, focused);
    assert(moved(focused.camera.target, initial.camera.target));
    const closeupBefore = await capture('closeup-before');

    let before = await read();
    await canvas.focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowUp');
    let after = await afterAction(before);
    preservedFocus(before, after); assert(moved(before.camera.position, after.camera.position));
    near(before.camera.distance, after.camera.distance);
    result.checks.keyboardOrbit = after.camera;

    const drag = await surface(); before = await read();
    if (phone) {
      await touchGesture([{ x: drag.x - 35, y: drag.y + 18, id: 1 }], [
        [{ x: drag.x - 10, y: drag.y + 8, id: 1 }], [{ x: drag.x + 42, y: drag.y - 12, id: 1 }]
      ]);
    } else {
      await page.mouse.move(drag.x - 35, drag.y + 18); await page.mouse.down();
      await page.mouse.move(drag.x + 42, drag.y - 12, { steps: 6 }); await page.mouse.up();
    }
    after = await afterAction(before);
    preservedFocus(before, after); assert(moved(before.camera.position, after.camera.position));
    near(before.camera.distance, after.camera.distance); near(after.scrollY, before.scrollY, 1);
    const closeupAfter = await capture('closeup-orbit');
    assert.notEqual(Buffer.compare(closeupBefore, closeupAfter), 0, 'Native camera movement changes the rendered closeup');
    result.checks.nativeOrbit = after.camera;

    before = await read(); await activate(zoom('in')); after = await afterAction(before);
    preservedFocus(before, after); assert(after.camera.distance < before.camera.distance);
    before = after; await activate(zoom('out')); after = await afterAction(before);
    preservedFocus(before, after); assert(after.camera.distance > before.camera.distance);
    await canvas.focus(); before = after; await page.keyboard.press('='); after = await afterAction(before);
    preservedFocus(before, after); assert(after.camera.distance < before.camera.distance);
    before = after; await page.keyboard.press('-'); after = await afterAction(before);
    preservedFocus(before, after); assert(after.camera.distance > before.camera.distance);

    before = after;
    for (let i = 0; i < 40; i++) await page.keyboard.press('=');
    const minimum = await afterAction(before);
    preservedFocus(before, minimum); near(minimum.camera.distance, minimum.camera.minDistance);
    before = minimum;
    for (let i = 0; i < 40; i++) await page.keyboard.press('-');
    const maximum = await afterAction(before);
    preservedFocus(before, maximum); near(maximum.camera.distance, maximum.camera.maxDistance);
    result.checks.zoomBounds = { minimum: minimum.camera, maximum: maximum.camera };
    await activate(page.locator('[data-iss-focus-module="harmony"]'));
    const refocused = await afterAction(maximum); assert.equal(refocused.camera.focusId, 'harmony');

    if (phone) {
      const pinch = await surface(), span = pinch.box.width * .12;
      before = await read();
      await touchGesture([{ x: pinch.x - span, y: pinch.y, id: 1 }, { x: pinch.x + span, y: pinch.y, id: 2 }], [
        [{ x: pinch.x - span * 1.3, y: pinch.y, id: 1 }, { x: pinch.x + span * 1.3, y: pinch.y, id: 2 }],
        [{ x: pinch.x - span * 1.7, y: pinch.y, id: 1 }, { x: pinch.x + span * 1.7, y: pinch.y, id: 2 }]
      ]);
      after = await afterAction(before);
      preservedFocus(before, after); assert(after.camera.distance < before.camera.distance * .95, 'Spreading two fingers zooms in');
      near(after.scrollY, before.scrollY, 1);
      result.checks.pinch = { before: before.camera, after: after.camera };
      for (const count of [1, 2]) {
        const cancelSurface = await surface(); before = await read();
        const points = count === 1 ? [{ x: cancelSurface.x - 20, y: cancelSurface.y, id: 1 }] :
          [{ x: cancelSurface.x - span, y: cancelSurface.y, id: 1 }, { x: cancelSurface.x + span, y: cancelSurface.y, id: 2 }];
        const motion = points.map((point, index) => ({ ...point, x: point.x + (count === 1 ? 35 : index === 0 ? 10 : -10), y: point.y - 10 }));
        await touchGesture(points, [motion], true);
        after = await afterAction(before); preservedFocus(before, after);
        assert.equal(after.camera.activePointers, 0);
        const canceled = after;
        await page.mouse.move(cancelSurface.x + 60, cancelSurface.y + 15);
        await page.waitForTimeout(150);
        after = verifySnapshot(await read());
        vectorNear(after.camera.position, canceled.camera.position); assert.equal(after.selected, canceled.selected);
        result.checks['cancel' + count] = after.camera;
      }
    } else {
      // Hovering alone leaves wheel input available for ordinary page scrolling.
      await controls.locator('button').first().focus(); await surface();
      before = await read();
      assert.equal(await canvas.evaluate(cv => document.activeElement === cv), false);
      await page.mouse.wheel(0, 180);
      await page.waitForFunction(y => Math.abs(scrollY - y) > 1, before.scrollY, { timeout: 5000 });
      after = verifySnapshot(await read());
      vectorNear(after.camera.position, before.camera.position); preservedFocus(before, after);
      result.checks.hoverWheel = { beforeScroll: before.scrollY, afterScroll: after.scrollY };
      await surface(); await canvas.focus(); before = await read();
      await page.mouse.wheel(0, -180);
      await waitCamera((c, distance) => c.distance < distance, before.camera.distance);
      after = await afterAction(before); preservedFocus(before, after);
      near(after.scrollY, before.scrollY, 1);
      result.checks.focusedWheel = { before: before.camera, after: after.camera };
    }
    console.log(`Camera orbit, focused target, zoom and pointer cleanup passed at ${width}px`);

    // The guide origin is on a real array wing; overview keeps it on screen.
    before = await read(); await activate(reset); after = await afterAction(before);
    unchangedPhysics(before, after); assert.equal(after.camera.view, 'overview');
    before = after; const withoutGuides = await capture('guides-off');
    await activate(guides); after = await afterAction(before);
    assert.equal(after.camera.guides, true); unchangedPhysics(before, after);
    vectorNear(after.camera.position, before.camera.position); vectorNear(after.camera.target, before.camera.target);
    near(after.camera.distance, before.camera.distance); assert.equal(after.camera.focusId, before.camera.focusId);
    const withGuides = await capture('guides-on');
    assert.notEqual(Buffer.compare(withoutGuides, withGuides), 0, 'Guide toggle changes the actual station visualization');
    result.checks.guidesParked = after;
    const controlsName = `map-camera-controls-${width}.png`, toolsName = `map-camera-tools-${width}.png`;
    const lightingName = `map-camera-guide-controls-${width}.png`;
    await controls.screenshot({ path: path.join(output, controlsName), animations: 'disabled' });
    await cameraTools.screenshot({ path: path.join(output, toolsName), animations: 'disabled' });
    await lighting.screenshot({ path: path.join(output, lightingName), animations: 'disabled' });
    result.screenshots.push(controlsName, toolsName, lightingName);
    before = after;
    await activate(page.locator('[data-iss-array-tracking]')); after = await afterAction(before);
    assert.equal(after.light.tracking, true); near(dot(after.camera.guideSun, after.camera.guideNormal), 1);
    near(after.angle, 0, .100001); vectorNear(after.camera.position, before.camera.position);
    vectorNear(after.camera.target, before.camera.target);
    result.checks.guidesTracking = after;
    await capture('guides-tracking');
    before = after; await activate(guides); after = await afterAction(before);
    assert.equal(after.camera.guides, false); unchangedPhysics(before, after);
    vectorNear(after.camera.position, before.camera.position); vectorNear(after.camera.target, before.camera.target);

    before = after; await activate(reset); after = await afterAction(before);
    assert.equal(after.camera.view, 'overview'); assert.equal(after.camera.focusId, null);
    vectorNear(after.camera.position, initial.camera.position); vectorNear(after.camera.target, initial.camera.target);
    unchangedPhysics(before, after);
    await canvas.focus(); before = after; await page.keyboard.press('f');
    await waitCamera(c => c.focusId === 'harmony'); after = await afterAction(before);
    assert.equal(after.camera.focusId, 'harmony'); vectorNear(after.camera.target, focused.camera.target);
    before = after; await page.keyboard.press('Home'); after = await afterAction(before);
    assert.equal(after.camera.view, 'overview'); assert.equal(after.camera.focusId, null);
    vectorNear(after.camera.position, initial.camera.position); vectorNear(after.camera.target, initial.camera.target);
    result.checks.resetAndKeyboardFocus = after;

    const layout = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
      nodes: Array.from(document.querySelectorAll('.iss-map-controls,.iss-map-controls button,[data-iss-camera-tools],[data-iss-camera-tools] button,[data-iss-lighting-panel]'), node => {
        const box = node.getBoundingClientRect(); return { label: (node.getAttribute('aria-label') || node.textContent || '').trim().slice(0, 100),
          left: box.left, right: box.right, width: box.width, height: box.height, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth };
      }) }));
    assert(layout.scrollWidth <= width + 1);
    for (const node of layout.nodes) {
      assert(node.left >= -1 && node.right <= width + 1, `Control leaves the viewport: ${JSON.stringify(node)}`);
      assert(node.width > 0 && node.height > 0);
      assert(node.scrollWidth <= node.clientWidth + 1, `Control contents overflow: ${JSON.stringify(node)}`);
    }
    await page.addScriptTag({ path: path.join(ROOT, 'desktop/web-app/node_modules/axe-core/axe.min.js') });
    const accessibility = await page.evaluate(async () => {
      const checks = await axe.run({ include: ['.iss-map-controls', '[data-iss-camera-tools]', '[data-iss-lighting-panel]'] }, {
        rules: { 'color-contrast': { enabled: false }, region: { enabled: false } }
      });
      return { passes: checks.passes.length, violations: checks.violations.map(v => ({ id: v.id,
        nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) };
    });
    assert.deepEqual(accessibility.violations, []);
    result.checks.layout = layout; result.checks.accessibility = accessibility;
    result.errors = errors; result.hostErrors = await page.evaluate(() => window.__events?.errors || []);
    assert.deepEqual(errors, []); assert.deepEqual(result.hostErrors, []);
    result.passed = true;
    console.log(`Camera guides, reset, responsive controls and accessibility passed at ${width}px`);
    return result;
  } catch (error) {
    result.passed = false; result.failure = error.stack || error.message; result.errors = errors;
    result.lastSnapshot = await read().catch(() => null);
    await page.screenshot({ path: path.join(output, `map-camera-failure-${width}.png`), fullPage: true }).catch(() => {});
    error.qaResult = result; throw error;
  } finally {
    try {
      result.checks.cleanup = await page.evaluate(() => {
        document.querySelector('.iss-station-stage canvas')?._issSetLighting?.({ playing: false });
        window.__destroy?.();
        return { contexts: window.__issCameraQAContexts?.length || 0,
          lost: (window.__issCameraQAContexts || []).map(gl => gl.isContextLost()),
          canvases: document.querySelectorAll('.iss-station-stage canvas').length };
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
      finally { await fs.writeFile(path.join(output, 'results.json'), JSON.stringify({ base, results }, null, 2) + '\n'); }
    }
  } finally { await browser.close(); }
  if (failure) throw failure;
  console.log(`Map-camera browser checks passed: ${widths.join(', ')}px. Results: ${output}`);
}

main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
