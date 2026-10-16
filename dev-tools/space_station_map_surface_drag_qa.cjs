#!/usr/bin/env node
'use strict';

// Trusted pointer/keyboard interaction with the actual projected surface probe.
// This harness uses the existing preview server and never starts a server.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const argument = (name, fallback) => {
  const entry = process.argv.slice(2).find(value => value.startsWith(name + '='));
  return entry ? entry.slice(name.length + 1) : fallback;
};
const base = argument('--base', 'http://127.0.0.1:4179').replace(/\/$/, '');
const output = path.resolve(ROOT, argument('--out', 'reports/space-station-enhancement-qa/map-surface-drag-browser'));
const widths = argument('--widths', '1440,390').split(',').map(Number);
assert(widths.length && widths.every(width => Number.isInteger(width) && width >= 320));
const near = (actual, expected, tolerance = 1e-7) => {
  assert(Number.isFinite(actual) && Number.isFinite(expected), `Finite values required: ${actual}, ${expected}`);
  assert(Math.abs(actual - expected) <= tolerance, `${actual} should equal ${expected} within ${tolerance}`);
};
const vectorNear = (actual, expected, tolerance = 1e-6) => {
  assert(Array.isArray(actual) && Array.isArray(expected) && actual.length === expected.length);
  actual.forEach((value, index) => near(value, expected[index], tolerance));
};
const posed = (point, alpha, feather) => {
  const a = alpha * Math.PI / 180, f = feather * Math.PI / 180;
  const x = point[0] * Math.cos(f) - point[1] * Math.sin(f), y = point[0] * Math.sin(f) + point[1] * Math.cos(f);
  return [x, y * Math.cos(a) - point[2] * Math.sin(a), y * Math.sin(a) + point[2] * Math.cos(a)];
};
function samePhysics(before, after) {
  for (const key of ['phase', 'beta', 'arrayAlpha', 'arrayFeather', 'actualAlphaRate', 'actualFeatherRate', 'driveElapsed', 'commandAlpha', 'commandFeather', 'motorRate', 'motorAcceleration', 'incidence', 'generation']) near(after.state[key], before.state[key]);
  for (const key of ['tracking', 'playing', 'motorEnabled', 'motorSmooth', 'motorBraking', 'eclipse']) assert.equal(after.state[key], before.state[key]);
  vectorNear(after.state.sun, before.state.sun); vectorNear(after.state.wingNormal, before.state.wingNormal);
}
function sameCamera(before, after) {
  for (const key of ['position', 'target', 'stationQuaternion']) vectorNear(after.camera[key], before.camera[key]);
  for (const key of ['fit', 'focusId', 'view', 'guides', 'tweening']) assert.equal(after.camera[key], before.camera[key]);
  near(after.camera.distance, before.camera.distance);
}
function isolated(before, after) { samePhysics(before, after); sameCamera(before, after); assert.deepEqual(after.forecast, before.forecast); }

function observeRenderer() {
  const Original = THREE.WebGLRenderer;
  window.__issSurfaceQA = { draw: null, sequence: 0, contexts: [], events: [], refs: null };
  function ObservedRenderer(options) {
    const renderer = new Original(options), render = renderer.render;
    window.__issSurfaceQA.contexts.push(renderer.getContext());
    renderer.render = function (scene, camera) {
      const returned = render.apply(this, arguments), cv = renderer.domElement;
      if (scene.name !== 'iss-station-inspection' || !cv._issMotionProbeState) return returned;
      const qa = window.__issSurfaceQA, wing = scene.getObjectByName('iss-array-wing-2');
      const marker = scene.getObjectByName('iss-motion-point'), group = scene.getObjectByName('iss-array-motion-probe');
      if (!wing || !marker || !group) return returned;
      const probe = cv._issMotionProbeState(), point = new THREE.Vector3().fromArray(probe.localPoint);
      const world = wing.localToWorld(point), projected = world.clone().project(camera);
      qa.refs = { scene, camera, cv, wing, group };
      qa.draw = { sequence: ++qa.sequence, state: cv._issLightingState(), probe, camera: cv._issCameraState(),
        canvas: { width: cv.clientWidth, height: cv.clientHeight },
        group: { visible: group.visible, position: group.position.toArray() },
        wing: { position: wing.position.toArray(), quaternion: wing.quaternion.toArray(), point: world.toArray(), ndc: projected.toArray() },
        marker: { visible: marker.visible, world: marker.getWorldPosition(new THREE.Vector3()).toArray(), position: marker.position.toArray() } };
      return returned;
    };
    return renderer;
  }
  ObservedRenderer.prototype = Original.prototype; Object.setPrototypeOf(ObservedRenderer, Original);
  THREE.WebGLRenderer = ObservedRenderer;
}

function verify(snapshot) {
  const s = snapshot.state, p = snapshot.probe, d = snapshot.draw;
  assert(d?.marker && d.wing && p.handle, 'Actual WebGL exposes the surface point and projected handle');
  assert.equal(snapshot.glLost, false); assert.equal(snapshot.camera.activePointers, 0, 'Probe input does not create a camera gesture');
  assert.equal(snapshot.handlesPressed, String(p.handles)); assert.equal(snapshot.button.visible, p.handle.visible);
  assert.equal(snapshot.button.tag, 'BUTTON'); assert(snapshot.button.label.trim());
  // Pointer intersections retain full precision; native 1%-step ranges expose
  // the nearest selectable integer without quantizing the physical probe.
  near(snapshot.chord, p.chord * 100, .51); near(snapshot.span, p.span * 100, .51);
  const local = [-.45 + .9 * p.chord, .02, p.side * (.3 + 3.4 * p.span)];
  vectorNear(p.localPoint, local); vectorNear(p.position, posed(local, s.arrayAlpha, s.arrayFeather));
  vectorNear(d.marker.world, d.wing.point); vectorNear(d.marker.position, p.position);
  if (p.available) {
    const dt = .001, before = posed(local, s.arrayAlpha - s.actualAlphaRate * dt, s.arrayFeather - s.actualFeatherRate * dt);
    const after = posed(local, s.arrayAlpha + s.actualAlphaRate * dt, s.arrayFeather + s.actualFeatherRate * dt);
    vectorNear(p.velocity, after.map((value, i) => (value - before[i]) / (2 * dt)), 2e-8);
  }
  if (p.handle.visible) {
    assert(p.enabled && p.available && p.handles);
    assert(snapshot.button.width >= 30 && snapshot.button.height >= 30);
    near(p.handle.x, (d.wing.ndc[0] + 1) * d.canvas.width / 2, 1e-6);
    near(p.handle.y, (1 - d.wing.ndc[1]) * d.canvas.height / 2, 1e-6);
    near(snapshot.button.x, p.handle.x, .75); near(snapshot.button.y, p.handle.y, .75);
  }
  return snapshot;
}

async function runWidth(browser, width) {
  const phone = width < 500, height = phone ? 844 : 1080, errors = [], result = { width, touch: phone, checks: {}, screenshots: [] };
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000); page.on('pageerror', error => errors.push(error.stack || error.message));
  const canvas = page.locator('.iss-station-stage canvas'), stage = page.locator('.iss-station-stage'), panel = page.locator('[data-iss-motion-panel]');
  const handle = page.locator('[data-iss-motion-handle]'), handles = page.locator('[data-iss-motion-handles]');
  const activate = locator => phone ? locator.tap() : locator.click();
  const read = () => canvas.evaluate(cv => {
    const gl = cv.getContext('webgl2') || cv.getContext('webgl'), rect = cv.getBoundingClientRect();
    const node = document.querySelector('[data-iss-motion-handle]'), b = node.getBoundingClientRect();
    return { state: cv._issLightingState(), probe: cv._issMotionProbeState(), forecast: cv._issForecastState(), camera: cv._issCameraState(), draw: window.__issSurfaceQA.draw,
      glLost: gl ? gl.isContextLost() : null, handlesPressed: document.querySelector('[data-iss-motion-handles]').getAttribute('aria-pressed'),
      chord: Number(document.querySelector('[data-iss-motion-chord]').value), span: Number(document.querySelector('[data-iss-motion-span]').value),
      status: document.querySelector('[data-iss-motion-drag-status]')?.textContent || '', canvasRect: { left: rect.left, top: rect.top },
      button: { tag: node.tagName, label: node.getAttribute('aria-label') || node.textContent, visible: !!b.width && !!b.height && getComputedStyle(node).visibility !== 'hidden',
        width: b.width, height: b.height, x: (b.left + b.right) / 2 - rect.left, y: (b.top + b.bottom) / 2 - rect.top },
      events: window.__issSurfaceQA.events.slice(-200) };
  });
  const ready = async () => {
    await page.evaluate(() => new Promise(resolve => window.__issSurfaceNativeRAF(() => window.__issSurfaceNativeRAF(resolve))));
    await page.waitForFunction(() => {
      const cv = document.querySelector('.iss-station-stage canvas'), d = window.__issSurfaceQA?.draw;
      if (!cv?._issMotionProbeState || !d) return false;
      const p = cv._issMotionProbeState(), s = cv._issLightingState(), c = cv._issCameraState();
      return !c.tweening && ['enabled', 'handles', 'span', 'chord', 'side', 'visible'].every(k => d.probe[k] === p[k]) &&
        ['phase', 'arrayAlpha', 'arrayFeather', 'actualAlphaRate', 'actualFeatherRate'].every(k => Math.abs(d.state[k] - s[k]) < 1e-8) &&
        c.position.every((v, i) => Math.abs(v - d.camera.position[i]) < 1e-8) && d.canvas.width === cv.clientWidth && d.canvas.height === cv.clientHeight;
    }, undefined, { polling: 100 });
    return verify(await read());
  };
  const touch = await page.context().newCDPSession(page); let held = false;
  const pointer = async (type, point) => {
    if (phone && type === 'up' && !held) return;
    if (phone) await touch.send('Input.dispatchTouchEvent', { type: type === 'down' ? 'touchStart' : type === 'move' ? 'touchMove' : type === 'cancel' ? 'touchCancel' : 'touchEnd',
      touchPoints: type === 'up' || type === 'cancel' ? [] : [{ x: point.x, y: point.y, id: 1, radiusX: 2, radiusY: 2, force: 1 }] });
    else if (type === 'down') { await page.mouse.move(point.x, point.y); await page.mouse.down(); }
    else if (type === 'move') await page.mouse.move(point.x, point.y, { steps: 1 });
    else await page.mouse.up();
    held = type === 'down' || type === 'move';
  };
  const startPoint = async () => {
    await stage.evaluate(node => node.scrollIntoView({ block: 'center', behavior: 'instant' })); await ready();
    await handle.waitFor({ state: 'visible' }); const b = await handle.boundingBox(); assert(b);
    return { x: b.x + b.width / 2 + 5, y: b.y + b.height / 2 - 3 };
  };
  const project = point => page.evaluate(point => {
    const q = window.__issSurfaceQA.refs, rect = q.cv.getBoundingClientRect();
    q.wing.updateWorldMatrix(true, false); q.camera.updateMatrixWorld(true);
    const p = q.wing.localToWorld(new THREE.Vector3().fromArray(point)).project(q.camera);
    return { x: rect.left + (p.x + 1) * rect.width / 2, y: rect.top + (1 - p.y) * rect.height / 2 };
  }, point);
  const rayPoint = (screen, side) => page.evaluate(({ screen, side }) => {
    const q = window.__issSurfaceQA.refs, rect = q.cv.getBoundingClientRect(), ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((screen.x - rect.left) * 2 / rect.width - 1, 1 - (screen.y - rect.top) * 2 / rect.height), q.camera);
    const inverse = new THREE.Matrix4().copy(q.wing.matrixWorld).invert(), origin = ray.ray.origin.clone().applyMatrix4(inverse);
    const direction = ray.ray.direction.clone().transformDirection(inverse);
    if (Math.abs(direction.y) < .08) return null;
    const t = (.02 - origin.y) / direction.y; if (t < 0) return null;
    const p = origin.addScaledVector(direction, t);
    return { chord: Math.max(0, Math.min(1, (p.x + .45) / .9)), span: Math.max(0, Math.min(1, (side * p.z - .3) / 3.4)), point: p.toArray() };
  }, { screen, side });
  const begin = async () => {
    const point = await startPoint(), before = await ready(); assert(before.probe.handle.interactive);
    await pointer('down', point); const after = await ready(); assert(after.probe.dragging);
    isolated(before, after); near(after.probe.span, before.probe.span); near(after.probe.chord, before.probe.chord);
    const event = after.events.filter(e => e.type === 'pointerdown' && e.action === 'handle').at(-1);
    assert(event?.trusted); assert.equal(event.pointerType, phone ? 'touch' : 'mouse');
    return { before, point, offset: { x: event.x - before.canvasRect.left - before.probe.handle.x, y: event.y - before.canvasRect.top - before.probe.handle.y } };
  };
  const drag = async (localTargets, expected = {}) => {
    const session = await begin(); let cursor = session.point;
    for (const target of localTargets) {
      const p = await project(target); cursor = { x: p.x + session.offset.x, y: p.y + session.offset.y }; await pointer('move', cursor);
    }
    let after = await ready(); const moved = after.events.filter(e => e.type === 'pointermove' && e.action === 'handle').at(-1);
    assert(moved?.trusted); const ray = await rayPoint({ x: moved.x - session.offset.x, y: moved.y - session.offset.y }, session.before.probe.side); assert(ray);
    near(after.probe.chord, ray.chord, 1e-6); near(after.probe.span, ray.span, 1e-6);
    for (const key of Object.keys(expected)) near(after.probe[key], expected[key], 1e-6);
    assert.equal(after.probe.side, session.before.probe.side); isolated(session.before, after);
    await pointer('up', cursor); after = await ready(); assert(!after.probe.dragging); isolated(session.before, after); return after;
  };
  const key = async name => { const before = await ready(); await handle.focus(); await page.keyboard.press(name); const after = await ready(); isolated(before, after); return after; };
  const capture = async label => {
    await page.evaluate(() => document.activeElement?.blur()); const before = await ready(); assert(!before.state.playing && !before.forecast.playing);
    for (const [locator, suffix] of [[stage, 'stage'], [panel, 'panel']]) {
      await locator.evaluate(node => node.scrollIntoView({ block: 'center', behavior: 'instant' }));
      let last = null, stable = 0;
      for (let i = 0; i < 12; i++) {
        const box = await locator.evaluate(node => { const b = node.getBoundingClientRect(); return { x: b.x + scrollX, y: b.y + scrollY, width: b.width, height: b.height }; });
        stable = last && Object.keys(box).every(k => Math.abs(box[k] - last[k]) < .25) ? stable + 1 : 0; last = box;
        if (stable >= 2) break; await page.waitForTimeout(150);
      }
      assert(stable >= 2); const filename = `map-surface-drag-${label}-${suffix}-${width}.png`;
      const shot = await touch.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: true, clip: { ...last, scale: 1 } });
      await fs.writeFile(path.join(output, filename), Buffer.from(shot.data, 'base64')); result.screenshots.push(filename);
    }
    isolated(before, await ready());
  };
  try {
    console.log(`Checking projected surface dragging at ${width}px`);
    await page.addInitScript(() => {
      window.AlloPostFXEnabled = false; window.__issSurfaceClock = 0;
      window.__issSurfaceNativeRAF = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = callback => window.__issSurfaceNativeRAF(() => callback(window.__issSurfaceClock));
    });
    await page.route('**/vendor/three-r128/three.min.js', async route => {
      const response = await route.fetch(); assert(response.ok());
      await route.fulfill({ response, body: (await response.text()) + '\n;(' + observeRenderer.toString() + ')();\n' });
    });
    await page.goto(`${base}/?tab=map`, { waitUntil: 'load' }); await panel.waitFor(); let after = await ready();
    assert(after.probe.handles && !after.probe.dragging && !after.probe.handle.visible); near(after.probe.chord, 1);
    await page.evaluate(() => ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'keydown', 'change', 'click'].forEach(type => document.addEventListener(type, event => {
      const node = event.target.closest('[data-iss-motion-handle],[data-iss-motion-handles],[data-iss-motion-chord]');
      if (node) window.__issSurfaceQA.events.push({ type, trusted: event.isTrusted, key: event.key, pointerType: event.pointerType,
        pointerId: event.pointerId, x: event.clientX, y: event.clientY,
        action: node.hasAttribute('data-iss-motion-handle') ? 'handle' : node.hasAttribute('data-iss-motion-handles') ? 'toggle' : 'chord' });
    }, true)));
    await activate(page.locator('[data-iss-motion-toggle]')); await activate(page.locator('[data-iss-motion-enable]'));
    await canvas.evaluate(cv => {
      cv._issSetLighting({ arrayAlpha: -120, arrayFeather: 45, motorRate: .2, motorAcceleration: .002 }); cv._issStepLighting(60);
      cv._issSetMotionProbe({ span: .6, chord: .5, side: 1 });
    }); await ready(); await activate(page.locator('[data-iss-camera-fit="motion"]')); after = await ready(); assert(after.probe.handle.interactive);
    after = await drag([[.1, .02, 1.8], [-.18, .02, 2.68]]);
    result.checks.trustedDragAndOffsetGrab = { pointerType: phone ? 'touch' : 'mouse', noInitialJump: true, independentRay: true };
    await drag([[.8, .02, 2]], { chord: 1 });
    await drag([[-.8, .02, 4.3]], { chord: 0, span: 1 });
    await drag([[0, .02, -2]], { span: 0 });
    assert.equal((await read()).probe.side, 1);
    await canvas.evaluate(cv => cv._issSetMotionProbe({ side: -1, span: .5, chord: .5 })); await ready();
    await drag([[.2, .02, -2.5]]);
    await drag([[0, .02, 2]], { span: 0 }); assert.equal((await read()).probe.side, -1);
    result.checks.clampedCoordinatesAndLockedPanelHalf = true;

    after = await key('Home'); near(after.probe.chord, .5); near(after.probe.span, .5);
    after = await key('ArrowRight'); near(after.probe.chord, .51); after = await key('ArrowLeft'); near(after.probe.chord, .5);
    after = await key('ArrowUp'); near(after.probe.span, .51); after = await key('ArrowDown'); near(after.probe.span, .5);
    after = await key('Shift+ArrowRight'); near(after.probe.chord, .6); after = await key('Shift+ArrowUp'); near(after.probe.span, .6);
    const beforeRange = after; await page.locator('[data-iss-motion-chord]').focus(); await page.keyboard.press('End'); after = await ready(); near(after.probe.chord, 1); isolated(beforeRange, after);
    result.checks.nativeKeyboardAndChordRange = true;

    await activate(page.locator('[data-iss-live-play]')); after = await ready(); assert(after.state.playing);
    after = await drag([[.05, .02, -2]]); assert(after.state.playing);
    await activate(page.locator('[data-iss-live-play]')); await ready();
    await activate(page.locator('[data-iss-forecast-toggle]')); await canvas.evaluate(cv => { cv._issSeekForecastTime(123.4); cv._issPlayForecast(true); });
    after = await ready(); assert(after.forecast.playing); after = await drag([[-.1, .02, -2.8]]); assert(after.forecast.playing);
    await canvas.evaluate(cv => cv._issPlayForecast(false)); await ready(); await activate(page.locator('[data-iss-forecast-close]')); await ready();
    result.checks.liveAndForecastPlaybackUnaffected = true;
    await capture('selected');

    for (const reason of ['escape', 'scroll', 'blur', 'lostcapture', 'resize', 'camera', 'handles', 'mode', 'cancel']) {
      console.log(`Checking ${reason} cancellation at ${width}px`);
      const session = await begin(); let expectedProbe = session.before.probe;
      if (reason === 'escape') await page.keyboard.press('Escape');
      else if (reason === 'scroll') await page.evaluate(() => scrollBy({ top: 12, behavior: 'instant' }));
      else if (reason === 'blur') await page.evaluate(() => dispatchEvent(new Event('blur')));
      else if (reason === 'lostcapture') {
        // Chromium suppresses zero-distance touch moves. A small actual move
        // establishes capture, and its resulting point is the cancellation baseline.
        await pointer('move', { x: session.point.x + 2, y: session.point.y });
        const captured = await ready(); expectedProbe = captured.probe;
        assert(captured.probe.dragging); isolated(session.before, captured);
        const down = captured.events.filter(e => e.type === 'pointerdown' && e.action === 'handle').at(-1);
        assert(captured.events.some(e => e.type === 'pointermove' && e.pointerId === down.pointerId && e.trusted), 'Capture setup delivered a native pointer move');
        await page.evaluate(() => {
          const event = window.__issSurfaceQA.events.filter(e => e.type === 'pointerdown' && e.action === 'handle').at(-1);
          document.querySelector('[data-iss-motion-handle]').releasePointerCapture(event.pointerId);
        });
        await pointer('move', { x: session.point.x + 4, y: session.point.y });
      }
      else if (reason === 'resize') await page.setViewportSize({ width: width - 1, height });
      else if (reason === 'camera') await canvas.evaluate(cv => cv._issCameraOrbit(.025, 0));
      else if (reason === 'handles') await canvas.evaluate(cv => cv._issSetMotionProbe({ handles: false }));
      else if (reason === 'mode') await canvas.evaluate(cv => cv._issSetLighting({ motorSmooth: false }));
      else if (phone) await pointer('cancel', session.point);
      else await page.evaluate(() => {
        const event = window.__issSurfaceQA.events.filter(e => e.type === 'pointerdown' && e.action === 'handle').at(-1);
        document.querySelector('[data-iss-motion-handle]').dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: event.pointerId, pointerType: 'mouse' }));
      });
      await page.waitForFunction(() => !document.querySelector('.iss-station-stage canvas')._issMotionProbeState().dragging);
      after = await ready(); assert(!after.probe.dragging); near(after.probe.chord, expectedProbe.chord); near(after.probe.span, expectedProbe.span);
      if (reason !== 'mode') samePhysics(session.before, after);
      await pointer('up', session.point); await ready();
      if (reason === 'resize') { await page.setViewportSize({ width, height }); await ready(); }
      if (reason === 'handles') { assert(!after.probe.handle.visible); await activate(handles); await ready(); }
      if (reason === 'mode') { assert(!after.probe.available); await activate(page.locator('[data-iss-motion-enable]')); await ready(); }
      console.log(`Passed ${reason} cancellation at ${width}px`);
    }
    result.checks.cancellation = ['escape', 'scroll', 'blur', 'lostcapture', 'resize', 'camera', 'handles', 'mode', 'pointercancel'];

    await canvas.evaluate(cv => {
      cv._issSetLighting({ motorEnabled: false, arrayAlpha: 0, arrayFeather: 0 });
      cv._issSetLighting({ motorEnabled: true, motorSmooth: true }); cv._issSetMotionProbe({ side: 1, span: .5, chord: .5 }); cv._issFitCamera('motion', true);
    }); await ready();
    await canvas.evaluate(cv => {
      const s = cv._issCameraState(), r = s.distance, oldPolar = Math.acos((s.position[1] - s.target[1]) / r);
      const newPolar = Math.acos(.02 / r); cv._issCameraOrbit(0, newPolar - oldPolar);
    }); after = await ready(); assert(!after.probe.handle.interactive);
    const edgeBefore = after, edgePoint = await startPoint(); await pointer('down', edgePoint); after = await ready();
    assert(!after.probe.dragging); near(after.probe.chord, edgeBefore.probe.chord); near(after.probe.span, edgeBefore.probe.span); isolated(edgeBefore, after);
    assert(/edge|rotate|view/i.test(after.status)); await pointer('up', edgePoint); after = await key('ArrowRight'); near(after.probe.chord, .51);
    result.checks.edgeOnRejectsPointerButKeepsKeyboard = true;
    await canvas.evaluate(cv => {
      cv._issSetView('overview', true); cv._issFitCamera('motion', true);
      cv._issSetLighting({ arrayAlpha: -120, arrayFeather: 45 }); cv._issStepLighting(60);
      cv._issSetMotionProbe({ span: .65, chord: .3, side: 1 });
    }); await ready(); await capture('surface');

    const beforeToggle = await ready(); await activate(handles); after = await ready(); assert(!after.probe.handles && !after.probe.handle.visible); isolated(beforeToggle, after);
    await activate(handles); after = await ready(); assert(after.probe.handles && after.probe.handle.visible); isolated(beforeToggle, after);
    const layout = await page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth,
      controls: Array.from(document.querySelectorAll('[data-iss-motion-handle],[data-iss-motion-handles],[data-iss-motion-chord],[data-iss-motion-panel]'), node => {
        const b = node.getBoundingClientRect(); return { left: b.left, right: b.right, width: b.width, height: b.height, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth };
      }) }));
    assert(layout.width <= width + 1);
    for (const item of layout.controls.filter(item => item.width > 0)) { assert(item.left >= -1 && item.right <= width + 1); assert(item.scrollWidth <= item.clientWidth + 1); }
    await page.addScriptTag({ path: path.join(ROOT, 'desktop/web-app/node_modules/axe-core/axe.min.js') });
    const accessibility = await page.evaluate(async () => {
      const checked = await axe.run({ include: ['[data-iss-motion-panel]', '[data-iss-motion-handle]'] }, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
      return { passes: checked.passes.length, violations: checked.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })) };
    });
    assert.deepEqual(accessibility.violations, []); result.checks.layout = layout; result.checks.accessibility = accessibility;
    after = await ready();
    for (const action of ['handle', 'toggle', 'chord']) assert(after.events.some(event => event.action === action && event.trusted), `Trusted ${action} input was exercised`);
    assert(after.events.some(event => event.action === 'handle' && event.type === 'keydown' && event.trusted));
    result.errors = errors; result.hostErrors = await page.evaluate(() => window.__events?.errors || []);
    assert.deepEqual(errors, []); assert.deepEqual(result.hostErrors, []); result.passed = true;
    console.log(`Surface dragging, coordinate clamps, playback isolation and lifecycle passed at ${width}px`);
    return result;
  } catch (error) {
    result.passed = false; result.failure = error.stack || error.message; result.errors = errors;
    result.lastSnapshot = await read().catch(() => null); error.qaResult = result; throw error;
  } finally {
    if (held) await pointer('up', { x: 1, y: 1 }).catch(() => {});
    try {
      result.checks.cleanup = await page.evaluate(() => {
        document.querySelector('.iss-station-stage canvas')?._issSetLighting?.({ playing: false }); window.__destroy?.();
        return { contexts: window.__issSurfaceQA?.contexts.length || 0, lost: (window.__issSurfaceQA?.contexts || []).map(gl => gl.isContextLost()),
          canvases: document.querySelectorAll('.iss-station-stage canvas').length, handles: document.querySelectorAll('[data-iss-motion-handle]').length };
      });
      if (result.passed) { assert(result.checks.cleanup.contexts > 0); assert(result.checks.cleanup.lost.every(Boolean)); assert.equal(result.checks.cleanup.canvases, 0); assert.equal(result.checks.cleanup.handles, 0); assert.deepEqual(errors, []); }
    } catch (error) {
      if (result.passed) { result.passed = false; result.failure = error.stack || error.message; error.qaResult = result; throw error; }
      result.cleanupFailure = error.stack || error.message;
    } finally { await touch.detach(); await page.close(); }
  }
}

async function main() {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
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
  console.log(`3D surface drag checks passed: ${widths.join(', ')}px. Results: ${output}`);
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
