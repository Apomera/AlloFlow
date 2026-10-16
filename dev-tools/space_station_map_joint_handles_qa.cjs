#!/usr/bin/env node
'use strict';

// Trusted mouse/touch/keyboard input against the real WebGL scene. Run against
// the existing preview server; this script never starts or replaces a server.
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
const output = path.resolve(ROOT, argument('--out', 'reports/space-station-enhancement-qa/map-joint-handles-browser'));
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
const signed = angle => ((angle + 180) % 360 + 360) % 360 - 180;
const mechanicalKeys = ['phase', 'beta', 'arrayAlpha', 'arrayFeather', 'actualAlphaRate', 'actualFeatherRate', 'driveElapsed'];
function sameMechanical(before, after) {
  mechanicalKeys.forEach(key => near(after.state[key], before.state[key]));
  vectorNear(after.state.wingNormal, before.state.wingNormal);
}
function sameCamera(before, after) {
  ['position', 'target', 'stationQuaternion'].forEach(key => vectorNear(after.camera[key], before.camera[key]));
  ['focusId', 'view', 'guides', 'tweening'].forEach(key => assert.equal(after.camera[key], before.camera[key]));
  near(after.camera.distance, before.camera.distance);
}

function observeRenderer() {
  const Original = THREE.WebGLRenderer;
  window.__issJointQA = { draw: null, sequence: 0, contexts: [], events: [], refs: null };
  function ObservedRenderer(options) {
    const renderer = new Original(options), render = renderer.render;
    window.__issJointQA.contexts.push(renderer.getContext());
    renderer.render = function (scene, camera) {
      const returned = render.apply(this, arguments), cv = renderer.domElement;
      if (scene.name === 'iss-station-inspection' && cv._issJointHandlesState) {
        const qa = window.__issJointQA, wing = scene.getObjectByName('iss-array-wing-2');
        qa.refs = { scene, camera, station: wing.parent, pivot: wing.position.clone(), cv };
        qa.draw = { sequence: ++qa.sequence, state: cv._issLightingState(), handles: cv._issJointHandlesState(),
          pivot: wing.position.toArray(), rings: ['alpha', 'feather'].map(axis => {
            const ring = scene.getObjectByName('iss-joint-ring-' + axis), arc = scene.getObjectByName('iss-joint-arc-' + axis);
            const buffer = arc?.geometry?.attributes?.position;
            return { axis, visible: ring?.visible, position: ring?.position.toArray(), quaternion: ring?.quaternion.toArray(),
              points: buffer ? Array.from({ length: buffer.count }, (_, i) => [buffer.getX(i), buffer.getY(i), buffer.getZ(i)]) : null };
          }) };
      }
      return returned;
    };
    return renderer;
  }
  ObservedRenderer.prototype = Original.prototype; Object.setPrototypeOf(ObservedRenderer, Original);
  THREE.WebGLRenderer = ObservedRenderer;
}

function verify(snapshot) {
  const h = snapshot.handles, d = snapshot.draw;
  assert(d?.rings?.length === 2, 'Both joint rings exist in the actual rendered scene');
  assert.equal(snapshot.glLost, false); assert.equal(snapshot.togglePressed, String(h.enabled));
  assert.equal(snapshot.camera.activePointers, 0, 'Joint input does not create camera pointers');
  near(h.commands.alpha, snapshot.state.commandAlpha); near(h.commands.feather, snapshot.state.commandFeather);
  assert.equal(h.handles.length, 2);
  const a = h.commands.alpha * Math.PI / 180;
  for (const ring of d.rings) {
    assert.equal(ring.visible, h.enabled); vectorNear(ring.position, d.pivot);
    vectorNear(ring.quaternion, [0, 0, 0, 1]);
    if (!h.enabled) continue;
    assert(ring.points?.length >= 17, 'The 3D ring is a continuous arc');
    const radius = ring.axis === 'alpha' ? 1.55 : 1.12;
    for (const p of ring.points) {
      near(Math.hypot(...p), radius, 1e-5);
      if (ring.axis === 'alpha') near(p[0], 0, 1e-5);
      else { near(-Math.sin(a) * p[1] + Math.cos(a) * p[2], 0, 1e-5); assert(p[0] >= -1e-5, 'Feather arc respects the +/-90 degree hard stops'); }
    }
  }
  for (const handle of h.handles) {
    const node = snapshot.buttons.find(button => button.axis === handle.axis);
    assert(node, 'Every rendered joint has a native button'); assert.equal(node.tag, 'BUTTON');
    assert(node.label.trim(), 'The native button has an accessible name');
    if (h.enabled) assert(/degree|°/i.test(node.label), 'Accessible name includes the commanded angle');
    assert.equal(node.visible, handle.visible);
    if (handle.visible) {
      near(node.x, handle.x, 1); near(node.y, handle.y, 1);
      assert(node.width >= 28 && node.height >= 28, 'Joint targets remain usable on the canvas');
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
  const toggle = page.locator('[data-iss-joint-handles-toggle]');
  const handle = axis => page.locator(`[data-iss-joint-handle="${axis}"]`);
  const activate = locator => phone ? locator.tap() : locator.click();
  const read = () => canvas.evaluate(cv => {
    const gl = cv.getContext('webgl2') || cv.getContext('webgl'), rect = cv.getBoundingClientRect();
    return { state: cv._issLightingState(), forecast: cv._issForecastState(), camera: cv._issCameraState(),
      handles: cv._issJointHandlesState(), draw: window.__issJointQA.draw, glLost: gl ? gl.isContextLost() : null,
      togglePressed: document.querySelector('[data-iss-joint-handles-toggle]')?.getAttribute('aria-pressed'),
      status: document.querySelector('[data-iss-joint-handles-status]')?.textContent || '',
      buttons: Array.from(document.querySelectorAll('[data-iss-joint-handle]'), node => {
        const b = node.getBoundingClientRect();
        return { axis: node.dataset.issJointHandle, tag: node.tagName, label: node.getAttribute('aria-label') || node.textContent,
          visible: !!b.width && !!b.height && getComputedStyle(node).visibility !== 'hidden', disabled: node.disabled,
          x: (b.left + b.right) / 2 - rect.left, y: (b.top + b.bottom) / 2 - rect.top,
          left: b.left, right: b.right, width: b.width, height: b.height };
      }), events: window.__issJointQA.events.slice(-100) };
  });
  const ready = async () => {
    // Camera setters update the camera immediately, while handle projection is
    // refreshed by the scene's RAF. Flush two real frames at the unchanged
    // controlled timestamp so camera-only actions cannot return a stale HUD.
    await page.evaluate(() => new Promise(resolve => {
      window.__issJointNativeRAF(() => window.__issJointNativeRAF(resolve));
    }));
    await page.waitForFunction(() => {
      const cv = document.querySelector('.iss-station-stage canvas'), d = window.__issJointQA?.draw;
      if (!cv?._issJointHandlesState || !d || cv._issCameraState().tweening) return false;
      const h = cv._issJointHandlesState(), s = cv._issLightingState();
      return d.handles.enabled === h.enabled &&
        ['alpha', 'feather'].every(key => Math.abs(d.handles.commands[key] - h.commands[key]) < 1e-8) &&
        ['phase', 'arrayAlpha', 'arrayFeather'].every(key => Math.abs(d.state[key] - s[key]) < 1e-8);
    }, undefined, { polling: 100 });
    return verify(await read());
  };
  const frame = async (ms = 0) => {
    await page.evaluate(milliseconds => new Promise(resolve => {
      window.__issJointClock += milliseconds;
      window.__issJointNativeRAF(() => window.__issJointNativeRAF(resolve));
    }), ms);
    return ready();
  };
  const touch = await page.context().newCDPSession(page);
  let held = false;
  const pointer = async (type, point) => {
    // A native touchCancel already ends the contact; CDP rejects a second end.
    if (phone && type === 'up' && !held) return;
    if (phone) await touch.send('Input.dispatchTouchEvent', { type: type === 'down' ? 'touchStart' : type === 'move' ? 'touchMove' : type === 'cancel' ? 'touchCancel' : 'touchEnd',
      touchPoints: type === 'up' || type === 'cancel' ? [] : [{ x: point.x, y: point.y, id: 1, radiusX: 2, radiusY: 2, force: 1 }] });
    else if (type === 'down') { await page.mouse.move(point.x, point.y); await page.mouse.down(); }
    else if (type === 'move') await page.mouse.move(point.x, point.y, { steps: 1 });
    else await page.mouse.up();
    held = type === 'down' || type === 'move';
  };
  const point = async axis => {
    await stage.evaluate(node => node.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await frame(); // Flush the scroll event before acquiring pointer capture.
    await handle(axis).waitFor({ state: 'visible' });
    const b = await handle(axis).boundingBox(); assert(b);
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  };
  const project = (axis, angle) => page.evaluate(({ axis, angle }) => {
    const q = window.__issJointQA.refs, rect = q.cv.getBoundingClientRect(), a = q.cv._issJointHandlesState().commands.alpha * Math.PI / 180;
    const t = angle * Math.PI / 180, r = axis === 'alpha' ? 1.55 : 1.12;
    const p = axis === 'alpha' ? new THREE.Vector3(0, -r * Math.sin(t), r * Math.cos(t)) :
      new THREE.Vector3(r * Math.cos(t), r * Math.sin(t) * Math.cos(a), r * Math.sin(t) * Math.sin(a));
    q.station.updateMatrixWorld(true); q.camera.updateMatrixWorld(true);
    q.station.localToWorld(p.add(q.pivot)).project(q.camera);
    return { x: rect.left + (p.x + 1) * rect.width / 2, y: rect.top + (1 - p.y) * rect.height / 2, z: p.z };
  }, { axis, angle });
  const rayAngle = (axis, screen) => page.evaluate(({ axis, screen }) => {
    const q = window.__issJointQA.refs, rect = q.cv.getBoundingClientRect(), a = q.cv._issJointHandlesState().commands.alpha * Math.PI / 180;
    const normal = axis === 'alpha' ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, -Math.sin(a), Math.cos(a));
    const u = axis === 'alpha' ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
    const v = axis === 'alpha' ? new THREE.Vector3(0, -1, 0) : new THREE.Vector3(0, Math.cos(a), Math.sin(a));
    const worldPivot = q.station.localToWorld(q.pivot.clone()); normal.transformDirection(q.station.matrixWorld);
    const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2((screen.x - rect.left) * 2 / rect.width - 1, 1 - (screen.y - rect.top) * 2 / rect.height), q.camera);
    const intersection = ray.ray.intersectPlane(new THREE.Plane().setFromNormalAndCoplanarPoint(normal, worldPivot), new THREE.Vector3());
    if (!intersection) return null;
    q.station.worldToLocal(intersection).sub(q.pivot);
    return Math.atan2(intersection.dot(v), intersection.dot(u)) * 180 / Math.PI;
  }, { axis, screen });
  const drag = async (axis, delta) => {
    const from = await point(axis), before = await ready(), command = before.handles.commands[axis];
    assert(before.handles.handles.find(h => h.axis === axis).interactive, `${axis} handle is draggable from this camera`);
    const initial = await rayAngle(axis, from); assert(Number.isFinite(initial));
    await pointer('down', from); let after = await ready();
    assert.equal(after.handles.dragging, axis); assert(!after.state.playing && !after.forecast.playing);
    sameMechanical(before, after); sameCamera(before, after);
    for (let i = 1; i <= 6; i++) {
      const to = await project(axis, command + delta * i / 6);
      await pointer('move', to);
    }
    const to = await project(axis, command + delta), finalAngle = await rayAngle(axis, to);
    await pointer('up', to); after = await ready();
    const expected = axis === 'alpha' ? signed(command + signed(finalAngle - initial)) : Math.max(-90, Math.min(90, command + signed(finalAngle - initial)));
    near(after.handles.commands[axis], expected, .15); assert.equal(after.handles.dragging, null);
    near(after.handles.commands[axis === 'alpha' ? 'feather' : 'alpha'], before.handles.commands[axis === 'alpha' ? 'feather' : 'alpha']);
    sameMechanical(before, after); sameCamera(before, after); assert(!after.state.tracking);
    assert(after.events.some(event => event.type === 'pointerdown' && event.axis === axis && event.trusted && event.pointerType === (phone ? 'touch' : 'mouse')));
    return { before, after, expected };
  };
  const key = async (axis, name) => { await handle(axis).focus(); await page.keyboard.press(name); return ready(); };
  const capture = async label => {
    await page.evaluate(() => document.activeElement?.blur()); await ready();
    await stage.evaluate(node => node.scrollIntoView({ block: 'center', behavior: 'instant' }));
    let last = null, stable = 0;
    for (let i = 0; i < 12; i++) {
      const box = await stage.evaluate(node => { const b = node.getBoundingClientRect(); return { x: b.x + scrollX, y: b.y + scrollY, width: b.width, height: b.height }; });
      stable = last && Object.keys(box).every(k => Math.abs(box[k] - last[k]) < .25) ? stable + 1 : 0; last = box;
      if (stable >= 2) break; await page.waitForTimeout(150);
    }
    assert(stable >= 2); const current = await ready(); assert(!current.state.playing && !current.forecast.playing);
    const filename = `map-joint-handles-${label}-${width}.png`;
    const shot = await touch.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: true, clip: { ...last, scale: 1 } });
    await fs.writeFile(path.join(output, filename), Buffer.from(shot.data, 'base64')); result.screenshots.push(filename);
  };
  try {
    console.log(`Checking 3D joint handles at ${width}px`);
    await page.addInitScript(() => {
      window.AlloPostFXEnabled = false; window.__issJointClock = 0;
      window.__issJointNativeRAF = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = callback => window.__issJointNativeRAF(() => callback(window.__issJointClock));
    });
    await page.route('**/vendor/three-r128/three.min.js', async route => {
      const response = await route.fetch(); assert(response.ok());
      await route.fulfill({ response, body: (await response.text()) + '\n;(' + observeRenderer.toString() + ')();\n' });
    });
    await page.goto(`${base}/?tab=map`, { waitUntil: 'load' }); await toggle.waitFor(); let after = await ready();
    assert(!after.handles.enabled);
    await page.evaluate(() => ['pointerdown', 'pointerup', 'pointercancel', 'keydown', 'click'].forEach(type => document.addEventListener(type, event => {
      const node = event.target.closest('[data-iss-joint-handle],[data-iss-joint-handles-toggle]');
      if (node) window.__issJointQA.events.push({ type, axis: node.dataset.issJointHandle || null, key: event.key,
        pointerType: event.pointerType, trusted: event.isTrusted });
    }, true)));
    await canvas.evaluate(cv => {
      cv._issSetLighting({ phase: 35, beta: 25, motorEnabled: true, motorSmooth: true, motorRate: .08,
        motorAcceleration: .002, tracking: false, arrayAlpha: 55, arrayFeather: -45 });
      cv._issStepLighting(40); cv._issToggleForecast(true);
    });
    const beforeToggle = await ready(); assert(Math.abs(beforeToggle.state.actualAlphaRate) > 0);
    await activate(toggle); after = await ready(); assert(after.handles.enabled);
    sameMechanical(beforeToggle, after); sameCamera(beforeToggle, after); assert.deepEqual(after.forecast, beforeToggle.forecast);
    assert(after.status.trim()); result.checks.togglePreservesPhysicsAndForecast = true;
    const initialCanvas = await canvas.boundingBox();
    for (const axis of ['alpha', 'feather']) {
      const projected = await project(axis, after.handles.commands[axis]), reported = after.handles.handles.find(h => h.axis === axis);
      near(reported.x, projected.x - initialCanvas.x, .05); near(reported.y, projected.y - initialCanvas.y, .05);
    }
    result.checks.independentRingProjection = true;
    await capture('enabled');

    const rotation = await drag('alpha', 18); assert(!rotation.after.forecast.active, 'First command edit invalidates the cached forecast');
    // The new rotation can make the feather plane edge-on from overview.
    // Lower the camera before testing its well-conditioned drag; the dedicated
    // edge-on case below still verifies that unstable intersections are refused.
    await canvas.evaluate(cv => cv._issCameraOrbit(0, .4));
    const featherView = await ready(); sameMechanical(rotation.after, featherView);
    assert.deepEqual(featherView.handles.commands, rotation.after.handles.commands);
    const feather = await drag('feather', 16);
    result.checks.trustedDrag = { pointerType: phone ? 'touch' : 'mouse', alpha: rotation.after.handles.commands.alpha,
      feather: feather.after.handles.commands.feather, preservedRatesAndOtherJointAndCamera: true };
    await canvas.evaluate(cv => cv._issSetView('overview', true)); await ready();

    const beforeKeys = await ready(); after = await key('alpha', 'Home'); near(after.handles.commands.alpha, 0);
    after = await key('alpha', 'ArrowRight'); near(after.handles.commands.alpha, 1);
    after = await key('alpha', 'ArrowUp'); near(after.handles.commands.alpha, 2);
    after = await key('alpha', 'ArrowLeft'); near(after.handles.commands.alpha, 1);
    after = await key('alpha', 'ArrowDown'); near(after.handles.commands.alpha, 0);
    after = await key('alpha', 'Shift+ArrowRight'); near(after.handles.commands.alpha, .1);
    sameMechanical(beforeKeys, after); sameCamera(beforeKeys, after);
    await canvas.evaluate(cv => cv._issSetLighting({ arrayAlpha: 55, arrayFeather: 89.9 })); await ready();
    after = await key('feather', 'ArrowUp'); near(after.handles.commands.feather, 90);
    after = await key('feather', 'Shift+ArrowUp'); near(after.handles.commands.feather, 90);
    after = await key('feather', 'Home'); near(after.handles.commands.feather, 0);
    after = await key('feather', 'Shift+ArrowLeft'); near(after.handles.commands.feather, -.1);
    await canvas.evaluate(cv => cv._issSetLighting({ phase: 57, beta: 32, tracking: true }));
    const tracked = await ready(); assert(tracked.state.tracking);
    after = await key('alpha', 'ArrowRight'); near(after.handles.commands.alpha, tracked.handles.commands.alpha + 1);
    near(after.handles.commands.feather, tracked.handles.commands.feather); sameMechanical(tracked, after); assert(!after.state.tracking);
    assert(after.events.some(event => event.type === 'keydown' && event.trusted));
    result.checks.keyboard = { oneDegreeSteps: true, tenthDegreeShift: true, home: true, featherStops: true, trackingOtherCommandPreserved: true };

    const beforeAdvance = after; await canvas.evaluate(cv => cv._issStepLighting(5)); after = await ready();
    assert(Math.abs(signed(after.state.arrayAlpha - beforeAdvance.state.arrayAlpha)) <= .08 * 5 + 1e-6);
    assert(Math.abs(after.state.arrayFeather - beforeAdvance.state.arrayFeather) <= .08 * 5 + 1e-6);
    assert(Math.abs(after.state.actualAlphaRate) <= .08 + 1e-8 && Math.abs(after.state.actualFeatherRate) <= .08 + 1e-8);
    assert(Math.abs(after.state.actualAlphaRate - beforeAdvance.state.actualAlphaRate) <= .002 * 5 + 1e-8);
    assert(Math.abs(after.state.actualFeatherRate - beforeAdvance.state.actualFeatherRate) <= .002 * 5 + 1e-8);
    near(after.state.driveElapsed, beforeAdvance.state.driveElapsed + 5); assert(after.state.phase > beforeAdvance.state.phase);
    sameCamera(beforeAdvance, after); result.checks.motorAdvance = { boundedSpeed: true, boundedAcceleration: true, elapsedSeconds: 5 };

    await canvas.evaluate(cv => { cv._issSetLighting({ arrayAlpha: 55, arrayFeather: -45 }); cv._issToggleForecast(true); cv._issPlayForecast(true); });
    const beforeGrab = await ready(), start = await point('alpha'); await pointer('down', start); after = await ready();
    assert.equal(after.handles.dragging, 'alpha'); assert(after.forecast.active && !after.forecast.playing); sameMechanical(beforeGrab, after);
    near(after.forecast.seconds, beforeGrab.forecast.seconds); await page.keyboard.press('Escape'); after = await ready(); assert.equal(after.handles.dragging, null);
    await pointer('up', start); await ready();
    await canvas.evaluate(cv => { cv._issToggleForecast(false); cv._issSetLighting({ playing: true }); });
    const liveBeforeGrab = await ready(), liveStart = await point('alpha'); await pointer('down', liveStart); after = await ready();
    assert(!after.state.playing); sameMechanical(liveBeforeGrab, after); await pointer('up', liveStart); await ready();
    result.checks.grabPausesClocksWithoutTeleporting = true;

    for (const reason of ['blur', 'hidden', 'camera', 'resize', 'scroll', 'cancel', 'disable']) {
      const from = await point('alpha'); await pointer('down', from); after = await ready(); assert.equal(after.handles.dragging, 'alpha');
      const before = after;
      if (reason === 'blur') await page.evaluate(() => dispatchEvent(new Event('blur')));
      else if (reason === 'hidden') await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
        try { document.dispatchEvent(new Event('visibilitychange')); } finally { delete document.hidden; }
      });
      else if (reason === 'camera') await canvas.evaluate(cv => cv._issCameraOrbit(.025, 0));
      else if (reason === 'resize') await page.setViewportSize({ width: width - 1, height: phone ? 844 : 1080 });
      else if (reason === 'scroll') await page.evaluate(() => scrollBy({ top: 12, behavior: 'instant' }));
      else if (reason === 'cancel') {
        if (phone) await pointer('cancel', from);
        else await page.evaluate(() => {
          const node = document.querySelector('[data-iss-joint-handle="alpha"]');
          // Desktop pointer cancellation has no CDP native cancellation method.
          node.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: 1, pointerType: 'mouse' }));
        });
      } else await canvas.evaluate(cv => cv._issSetJointHandles(false));
      await page.waitForFunction(() => document.querySelector('.iss-station-stage canvas')._issJointHandlesState().dragging === null);
      after = await ready(); assert.equal(after.handles.dragging, null, `${reason} cancels joint dragging`); sameMechanical(before, after);
      await pointer('up', from); after = await ready();
      if (reason === 'resize') { await page.setViewportSize({ width, height: phone ? 844 : 1080 }); await ready(); }
      if (reason === 'disable') { assert(!after.handles.enabled); await canvas.evaluate(cv => cv._issSetJointHandles(true)); await ready(); }
    }
    result.checks.cancellation = ['escape', 'blur', 'hidden', 'camera', 'resize', 'scroll', phone ? 'trusted touch cancellation' : 'pointercancel event', 'disable'];
    // Ordinary empty-space camera gestures still work while joint handles exist.
    await stage.evaluate(node => node.scrollIntoView({ block: 'center', behavior: 'instant' }));
    const cb = await canvas.boundingBox(), cameraBefore = await ready();
    const empty = { x: cb.x + cb.width * .18, y: cb.y + cb.height * .48 };
    await pointer('down', empty); await pointer('move', { x: empty.x + 34, y: empty.y + 12 }); await pointer('up', empty);
    after = await ready(); assert.notDeepEqual(after.camera.position, cameraBefore.camera.position);
    sameMechanical(cameraBefore, after); assert.deepEqual(after.handles.commands, cameraBefore.handles.commands);
    result.checks.ordinaryCameraDrag = true;
    await canvas.evaluate(cv => { cv._issSetView('overview', true); cv._issSetLighting({ arrayAlpha: 55, arrayFeather: -45 }); }); await ready();
    await canvas.evaluate(cv => {
      const q = window.__issJointQA.refs, s = cv._issCameraState(), p = s.position, t = s.target;
      const worldPivot = q.station.localToWorld(q.pivot.clone()), horizontal = Math.hypot(p[0] - t[0], p[2] - t[2]);
      // Put the camera inside the rotation ring's plane: an exactly parallel
      // viewing ray has no stable intersection and must not create a drag.
      const yaw = Math.asin((worldPivot.x - t[0]) / horizontal) - Math.atan2(p[0] - t[0], p[2] - t[2]);
      cv._issCameraOrbit(yaw, 0);
    });
    after = await ready(); assert(!after.handles.handles.find(h => h.axis === 'alpha').interactive);
    const edgeBefore = after, edgePoint = await point('alpha'); await pointer('down', edgePoint); after = await ready();
    assert.equal(after.handles.dragging, null); sameMechanical(edgeBefore, after);
    assert(/edge-on/i.test(after.status)); await pointer('up', edgePoint);
    after = await key('alpha', 'ArrowRight'); near(after.handles.commands.alpha, edgeBefore.handles.commands.alpha + 1);
    result.checks.edgeOn = { pointerDeclinesUnstableRay: true, keyboardRemainsUsable: true };
    await canvas.evaluate(cv => { cv._issSetView('overview', true); cv._issSetLighting({ arrayAlpha: 55, arrayFeather: -45 }); }); await ready();
    await capture('retargeted');

    const layout = await page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth,
      labels: Array.from(document.querySelectorAll('[data-iss-joint-handle],[data-iss-joint-handles-toggle]'), node => {
        const b = node.getBoundingClientRect(); return { left: b.left, right: b.right, width: b.width, height: b.height,
          label: node.getAttribute('aria-label') || node.textContent };
      }) }));
    assert(layout.width <= width + 1);
    for (const item of layout.labels.filter(item => item.width > 0)) { assert(item.left >= -1 && item.right <= width + 1); assert(item.label.trim()); }
    await page.addScriptTag({ path: path.join(ROOT, 'desktop/web-app/node_modules/axe-core/axe.min.js') });
    const accessibility = await page.evaluate(async () => {
      const checked = await axe.run({ include: ['[data-iss-joint-handles-toggle]', '[data-iss-joint-handle]', '[data-iss-joint-handles-status]'] }, {
        rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
      return { passes: checked.passes.length, violations: checked.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })) };
    });
    assert.deepEqual(accessibility.violations, []); result.checks.layout = layout; result.checks.accessibility = accessibility;
    const beforeDisable = await ready(); await activate(toggle); after = await ready(); assert(!after.handles.enabled);
    sameMechanical(beforeDisable, after); sameCamera(beforeDisable, after);
    result.errors = errors; result.hostErrors = await page.evaluate(() => window.__events?.errors || []);
    assert.deepEqual(errors, []); assert.deepEqual(result.hostErrors, []); result.passed = true;
    console.log(`Joint rings, trusted input, motor continuity, cancellation and accessibility passed at ${width}px`);
    return result;
  } catch (error) {
    result.passed = false; result.failure = error.stack || error.message; result.errors = errors;
    result.lastSnapshot = await read().catch(() => null); error.qaResult = result; throw error;
  } finally {
    if (held) await pointer('up', { x: 1, y: 1 }).catch(() => {});
    try {
      result.checks.cleanup = await page.evaluate(() => {
        document.querySelector('.iss-station-stage canvas')?._issSetLighting?.({ playing: false }); window.__destroy?.();
        return { contexts: window.__issJointQA?.contexts.length || 0, lost: (window.__issJointQA?.contexts || []).map(gl => gl.isContextLost()),
          canvases: document.querySelectorAll('.iss-station-stage canvas').length, handles: document.querySelectorAll('[data-iss-joint-handle]').length };
      });
      if (result.passed) {
        assert(result.checks.cleanup.contexts > 0); assert(result.checks.cleanup.lost.every(Boolean));
        assert.equal(result.checks.cleanup.canvases, 0); assert.equal(result.checks.cleanup.handles, 0); assert.deepEqual(errors, []);
      }
    } catch (error) {
      if (result.passed) { result.passed = false; result.failure = error.stack || error.message; error.qaResult = result; throw error; }
      result.cleanupFailure = error.stack || error.message;
    } finally { await touch.detach(); await page.close(); }
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
  console.log(`3D joint handle checks passed: ${widths.join(', ')}px. Results: ${output}`);
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
