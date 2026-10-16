#!/usr/bin/env node
'use strict';

// Focused radiator rendering and native camera QA; uses an existing preview server.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const arg = (name, fallback) => process.argv.slice(2).find(value => value.startsWith(name + '='))?.slice(name.length + 1) || fallback;
const base = arg('--base', 'http://127.0.0.1:4179').replace(/\/$/, '');
const output = path.resolve(ROOT, arg('--out', 'reports/space-station-enhancement-qa/map-radiator-browser'));
const widths = arg('--widths', '1440,390').split(',').map(Number);
assert(widths.length && widths.every(width => Number.isInteger(width) && width >= 320));
const center = side => [side === 'a' ? -2.4 : 2.4, -.55, -1.6];
const near = (actual, expected, tolerance = 1e-7) => { assert(Number.isFinite(actual) && Number.isFinite(expected)); assert(Math.abs(actual - expected) <= tolerance, `${actual} should equal ${expected} within ${tolerance}`); };
const vectorNear = (actual, expected, tolerance = 1e-6) => { assert(Array.isArray(actual) && Array.isArray(expected) && actual.length === expected.length); actual.forEach((value, index) => near(value, expected[index], tolerance)); };
const direction = camera => { const delta = camera.position.map((value, index) => value - camera.target[index]), length = Math.hypot(...delta); return delta.map(value => value / length); };
function samePhysics(before, after) {
  for (const key of ['phase', 'beta', 'arrayAlpha', 'arrayFeather', 'actualAlphaRate', 'actualFeatherRate', 'driveElapsed', 'commandAlpha', 'commandFeather', 'motorRate', 'motorAcceleration', 'rate', 'incidence', 'generation']) near(after.light[key], before.light[key]);
  for (const key of ['tracking', 'motorEnabled', 'motorSmooth', 'motorBraking', 'playing', 'eclipse']) assert.equal(after.light[key], before.light[key]);
  vectorNear(after.camera.stationQuaternion, before.camera.stationQuaternion);
  for (const key of ['shoulder', 'elbow', 'shoulderRate', 'elbowRate']) near(after.arm.actual[key], before.arm.actual[key]);
  near(after.arm.elapsed, before.arm.elapsed); assert.equal(after.arm.actual.braking, before.arm.actual.braking); assert.deepEqual(after.arm.target, before.arm.target);
  assert.deepEqual(after.preview, before.preview); assert.deepEqual(after.forecast, before.forecast);
}
function observeRadiators() {
  const Original = THREE.WebGLRenderer, qa = window.__issRadiatorQA = { draw: null, sequence: 0, textures: {}, contexts: [], events: [], activations: {} };
  function textureInfo(texture) {
    if (!texture) return null;
    if (!qa.textures[texture.uuid]) { const record = qa.textures[texture.uuid] = { uuid: texture.uuid, disposed: false }; texture.addEventListener('dispose', () => { record.disposed = true; }); }
    return { uuid: texture.uuid, canvas: texture.image instanceof HTMLCanvasElement, isCanvasTexture: texture.isCanvasTexture === true, width: texture.image?.width, height: texture.image?.height, srgb: texture.encoding === THREE.sRGBEncoding };
  }
  function ObservedRenderer(options) {
    const renderer = new Original(options), original = renderer.render; qa.contexts.push(renderer.getContext());
    renderer.render = function (scene, camera) {
      const result = original.apply(this, arguments), cv = renderer.domElement;
      if (scene.name !== 'iss-station-inspection' || !cv._issCameraState) return result;
      const radiators = {};
      for (const side of ['a', 'b']) {
        const group = scene.getObjectByName('iss-radiator-' + side), body = scene.getObjectByName('iss-radiator-panel-' + side);
        if (!group || !body) continue;
        const parts = [], inverse = group.matrixWorld.clone().invert(); group.traverse(node => { if (node.isMesh) { const materials = Array.isArray(node.material) ? node.material : [node.material];
          if (!node.geometry.boundingBox) node.geometry.computeBoundingBox();
          const localBounds = node.geometry.boundingBox.clone().applyMatrix4(inverse.clone().multiply(node.matrixWorld));
          const parameters = node.geometry.parameters || {};
          parts.push({ name: node.name, parentId: node._issParentId, position: node.position.toArray(), rotation: [node.rotation.x, node.rotation.y, node.rotation.z],
          geometry: { type: node.geometry.type, parameters: Object.fromEntries(['width', 'height', 'depth', 'radiusTop', 'radiusBottom'].filter(key => Number.isFinite(parameters[key])).map(key => [key, parameters[key]])) },
          bounds: { min: localBounds.min.toArray(), max: localBounds.max.toArray() },
          castShadow: node.castShadow, receiveShadow: node.receiveShadow, materials: materials.map(material => ({ type: material.type, opacity: material.opacity, emissive: material.emissive?.toArray() || null, emissiveMap: !!material.emissiveMap })) }); } });
        const bounds = new THREE.Box3().setFromObject(group), projected = [];
        for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) projected.push(new THREE.Vector3(x, y, z).project(camera).toArray());
        radiators[side] = { position: group.position.toArray(), map: textureInfo(body.material.map), parts, projected, min: bounds.min.toArray(), max: bounds.max.toArray() };
      }
      const bracket = scene.getObjectByName('iss-radiator-focus');
      qa.draw = { sequence: ++qa.sequence, camera: cv._issCameraState(), radiators, bracket: bracket ? { visible: bracket.visible, position: bracket.position.toArray() } : null,
        width: cv.clientWidth, height: cv.clientHeight, cutaway: !!cv._issCutaway, selected: cv._issWantSel, eclipse: cv._issLightingState().eclipse,
        directSun: scene.getObjectByName('iss-direct-sun')?.intensity };
      return result;
    };
    return renderer;
  }
  ObservedRenderer.prototype = Original.prototype; Object.setPrototypeOf(ObservedRenderer, Original); THREE.WebGLRenderer = ObservedRenderer;
}
function verify(snapshot) {
  const { camera, draw, caption, light } = snapshot;
  assert(draw?.radiators.a && draw.radiators.b && draw.bracket, 'Both physical radiators and inspection brackets are rendered'); assert.equal(snapshot.glLost, false);
  for (const side of ['a', 'b']) {
    const radiator = draw.radiators[side]; vectorNear(radiator.position, center(side)); assert(radiator.min.every(Number.isFinite) && radiator.max.every(Number.isFinite));
    assert(radiator.map?.canvas && radiator.map.isCanvasTexture && radiator.map.srgb && radiator.map.width > 0 && radiator.map.height > 0);
    assert(radiator.parts.length > 1, 'A radiator contains actual surface and supporting hardware');
    for (const part of radiator.parts) {
      assert.equal(part.parentId, 'truss'); assert(part.castShadow && part.receiveShadow, `Physical hardware ${part.name} participates in lighting`);
      for (const material of part.materials) { assert.equal(material.type, 'MeshStandardMaterial'); assert.deepEqual(material.emissive, [0, 0, 0]); assert.equal(material.emissiveMap, false); }
      assert(part.bounds.min.every(Number.isFinite) && part.bounds.max.every(Number.isFinite));
    }
    const slab = radiator.parts.find(part => part.name === 'iss-radiator-panel-' + side); assert(slab);
    for (const sign of [-1, 1]) {
      const pipe = radiator.parts.find(part => part.name === 'iss-radiator-manifold-' + side + '-' + sign); assert(pipe, 'Both exposed edge manifolds exist');
      assert.equal(pipe.geometry.type, 'CylinderGeometry'); near(pipe.geometry.parameters.radiusTop, .025); near(pipe.geometry.parameters.radiusBottom, .025); near(pipe.geometry.parameters.height, 2.08);
      vectorNear(pipe.position, [side === 'a' ? -.05 : .05, sign * .69, 0]); near(pipe.rotation[0], Math.PI / 2);
      near(pipe.bounds.min[2], -1.04, 1e-6); near(pipe.bounds.max[2], 1.04, 1e-6);
      if (side === 'a') { assert(pipe.bounds.min[0] < slab.bounds.min[0] - .02, 'A manifold protrudes beyond the outward slab face'); assert(pipe.bounds.max[0] <= slab.bounds.min[0] + 1e-6); }
      else { assert(pipe.bounds.max[0] > slab.bounds.max[0] + .02, 'B manifold protrudes beyond the outward slab face'); assert(pipe.bounds.min[0] >= slab.bounds.max[0] - 1e-6); }
    }
    const support = radiator.parts.find(part => part.name === 'iss-radiator-support-' + side), mounts = radiator.parts.filter(part => part.name === 'iss-radiator-mount-' + side);
    assert(support && mounts.length === 2, 'One crossmember connects both top mounts'); assert.equal(support.geometry.type, 'BoxGeometry');
    near(support.geometry.parameters.width, .09); near(support.geometry.parameters.height, .065); near(support.geometry.parameters.depth, 1.54); vectorNear(support.position, [0, .9, 0]);
    assert(support.bounds.min[2] < -.72 && support.bounds.max[2] > .72 && support.bounds.min[2] < 0 && support.bounds.max[2] > 0, 'Support spans both mounts and the center');
    vectorNear(mounts.map(mount => mount.position[2]).sort((a, b) => a - b), [-.72, .72]);
    for (const mount of mounts) for (let axis = 0; axis < 3; axis++) assert(Math.min(support.bounds.max[axis], mount.bounds.max[axis]) > Math.max(support.bounds.min[axis], mount.bounds.min[axis]), 'The support physically overlaps each mount rather than floating above it');
  }
  assert.equal(draw.radiators.a.map.uuid, draw.radiators.b.map.uuid, 'Both radiator surfaces share one atlas');
  const side = camera.focusId === 'radiator-a' ? 'a' : camera.focusId === 'radiator-b' ? 'b' : null;
  assert.equal(caption.visible, !!side); assert.equal(draw.bracket.visible, !!side);
  if (side) {
    vectorNear(camera.target, center(side)); vectorNear(draw.bracket.position, center(side)); assert.match(caption.text, new RegExp('radiator\\s*' + side, 'i'));
    if (camera.fit === 'radiator-' + side) vectorNear(camera.fitCenter, center(side));
  }
  assert(!camera.tweening && camera.activePointers === 0); assert(camera.position.every(Number.isFinite));
  near(camera.projectedTarget[0], 0); near(camera.projectedTarget[1], 0); assert(camera.projectedTarget[2] > -1 && camera.projectedTarget[2] < 1);
  assert(camera.distance >= camera.minDistance - 1e-6 && camera.distance <= camera.maxDistance + 1e-6);
  near(draw.directSun, light.eclipse ? 0 : 1.35); assert.equal(light.playing, false);
  vectorNear(draw.camera.position, camera.position); return snapshot;
}
function verifyFit(snapshot, side) {
  assert.equal(snapshot.camera.fit, 'radiator-' + side); assert.equal(snapshot.camera.focusId, 'radiator-' + side);
  vectorNear(snapshot.camera.target, center(side)); const ray = direction(snapshot.camera);
  assert(side === 'a' ? ray[0] < -.5 : ray[0] > .5, 'Initial inspection views the outward broad face'); assert(ray[2] > 0);
  snapshot.draw.radiators[side].projected.forEach(point => { assert(point.every(Number.isFinite)); assert(Math.abs(point[0]) <= 1.01 && Math.abs(point[1]) <= 1.01 && point[2] > -1 && point[2] < 1, 'Framing contains the complete radiator'); });
}

async function runWidth(browser, width) {
  const phone = width < 500, height = phone ? 844 : 1080, errors = [], consoleErrors = [], result = { width, touch: phone, checks: {}, screenshots: [] };
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000); page.on('pageerror', error => errors.push(error.stack || error.message)); page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  const canvas = page.locator('.iss-station-stage canvas'), stage = page.locator('.iss-station-stage'), cameraTools = page.locator('[data-iss-camera-tools]');
  const fit = side => page.locator('[data-iss-camera-fit="radiator-' + side + '"]'); let activationSequence = 0;
  const activate = async locator => {
    const token = ++activationSequence;
    // A native touch sequence can finish before its compatibility click. Observe
    // that exact control's trusted click before accepting an unchanged RAF frame.
    await locator.evaluate((node, id) => node.addEventListener('click', event => {
      window.__issRadiatorQA.activations[id] = { trusted: event.isTrusted, label: node.textContent.trim(), at: performance.now() };
    }, { once: true, capture: true }), token);
    if (phone) await locator.tap(); else await locator.click();
    await page.waitForFunction(id => window.__issRadiatorQA?.activations[id]?.trusted === true, token, { polling: 50 });
  };
  const read = () => canvas.evaluate(cv => {
    const node = document.querySelector('[data-iss-radiator-caption]'), gl = cv.getContext('webgl2') || cv.getContext('webgl');
    return { camera: cv._issCameraState(), light: cv._issLightingState(), arm: cv._issArmState(), preview: cv._issArmPreviewState(), forecast: cv._issForecastState(), selected: cv._issWantSel,
      cutaway: !!cv._issCutaway, caption: { visible: !!node && !node.hidden && node.getClientRects().length > 0, text: node?.textContent.trim() || '' }, glLost: gl?.isContextLost(), draw: window.__issRadiatorQA.draw,
      viewport: { width: innerWidth, height: innerHeight, scrollX, scrollY }, events: window.__issRadiatorQA.events.slice(-30), activations: window.__issRadiatorQA.activations };
  });
  const ready = async () => {
    await page.waitForFunction(() => {
      const cv = document.querySelector('.iss-station-stage canvas'), draw = window.__issRadiatorQA?.draw; if (!cv?._issCameraState || !draw) return false;
      const state = cv._issCameraState(); return !state.tweening && !state.activePointers && state.focusId === draw.camera.focusId && state.fit === draw.camera.fit && cv._issWantSel === draw.selected && !!cv._issCutaway === draw.cutaway && cv._issLightingState().eclipse === draw.eclipse &&
        state.position.every((value, index) => Math.abs(value - draw.camera.position[index]) < 1e-8) && draw.width === cv.clientWidth && draw.height === cv.clientHeight;
    }, undefined, { polling: 100 }); return verify(await read());
  };
  const pure = async action => { const before = await ready(); await action(); const after = await ready(); samePhysics(before, after); return after; };
  const resize = async viewportWidth => {
    await page.setViewportSize({ width: viewportWidth, height });
    await page.waitForFunction(expected => innerWidth === expected, viewportWidth);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    return ready();
  };
  const capture = async label => { for (const [kind, locator] of [['stage', stage], ['controls', cameraTools]]) { await locator.scrollIntoViewIfNeeded(); await ready(); const file = `map-radiator-${label}-${kind}-${width}.png`; await locator.screenshot({ path: path.join(output, file), animations: 'disabled' }); result.screenshots.push(file); } };
  const gesture = async () => {
    await canvas.scrollIntoViewIfNeeded(); const box = await canvas.boundingBox(); assert(box && box.width > 200); const x = box.x + box.width * .5, y = box.y + box.height * .45;
    if (phone) { const session = await page.context().newCDPSession(page); try { await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x - 30, y: y + 12, id: 1 }] });
      for (const point of [{ x, y, id: 1 }, { x: x + 40, y: y - 12, id: 1 }]) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point] }); await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); } finally { await session.detach(); } }
    else { await page.mouse.move(x - 30, y + 12); await page.mouse.down(); await page.mouse.move(x + 40, y - 12, { steps: 6 }); await page.mouse.up(); }
  };
  try {
    console.log(`Checking radiator inspection at ${width}px`);
    await page.addInitScript(() => { let seed = 42; Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }; window.AlloPostFXEnabled = false; });
    await page.route('**/vendor/three-r128/three.min.js', async route => { const response = await route.fetch(); assert(response.ok()); await route.fulfill({ response, body: (await response.text()) + '\n;(' + observeRadiators.toString() + ')();\n' }); });
    await page.goto(`${base}/?tab=map`, { waitUntil: 'load' }); await fit('a').waitFor();
    await page.evaluate(() => ['click', 'keydown', 'pointerdown'].forEach(type => document.addEventListener(type, event => {
      const node = event.target.closest('[data-iss-camera-tools] button,.iss-station-stage canvas'); if (node) window.__issRadiatorQA.events.push({ type, key: event.key, trusted: event.isTrusted, pointerType: event.pointerType, fit: node.getAttribute('data-iss-camera-fit'), canvas: node.tagName === 'CANVAS' });
    }, true)));
    await canvas.evaluate(cv => { cv._issSetLighting({ beta: 20, phase: 0, playing: false, tracking: false, motorEnabled: true, motorSmooth: true, arrayAlpha: 35, arrayFeather: 12 }); cv._issSetArm({ x: -1.8, y: 1.2 }); cv._issStepLighting(3); cv._issSetLighting({ phase: 0 }); });
    let after = await ready(); assert(!after.light.eclipse); result.checks.physicalHardwareAndSharedAtlas = true;
    for (const side of ['a', 'b']) { after = await pure(() => activate(fit(side))); verifyFit(after, side); await capture(side + '-day'); }
    result.checks.nativeABFramingPreservesSimulation = true;

    const beforeDrag = after; after = await pure(gesture); assert.equal(after.camera.focusId, 'radiator-b'); vectorNear(after.camera.target, beforeDrag.camera.target); assert.notDeepEqual(after.camera.position, beforeDrag.camera.position); assert.equal(after.selected, beforeDrag.selected);
    assert.equal(after.camera.fit, 'radiator-b'); const beforeResize = after, originalDirection = direction(after.camera);
    after = await resize(width + (phone ? 40 : -180)); samePhysics(beforeResize, after); vectorNear(direction(after.camera), originalDirection, 1e-6); assert.equal(after.camera.fit, 'radiator-b');
    after = await resize(width); samePhysics(beforeResize, after); vectorNear(direction(after.camera), originalDirection, 1e-6);
    result.checks.nativeOrbitAndResizeRetainInspectionDirection = true;

    const beforeZoom = after; after = await pure(() => activate(page.locator('[data-iss-camera-zoom="in"]'))); assert(after.camera.distance < beforeZoom.camera.distance); assert.equal(after.camera.focusId, 'radiator-b'); assert.equal(after.camera.fit, null);
    after = await pure(async () => { await canvas.focus(); await page.keyboard.press('ArrowRight'); }); assert.equal(after.camera.focusId, 'radiator-b');
    const beforeKeyboardFit = after; await fit('a').focus(); await page.keyboard.press('Enter'); after = await ready(); samePhysics(beforeKeyboardFit, after); verifyFit(after, 'a');
    result.checks.zoomAndKeyboardPreserveFocus = true;

    await activate(page.locator('[data-iss-lighting-preset="midnight"]')); after = await ready(); assert(after.light.eclipse); assert.equal(after.camera.focusId, 'radiator-a'); near(after.draw.directSun, 0); await capture('a-eclipse');
    result.checks.eclipseMaterialsAndCaption = true;

    await activate(page.locator('.iss-module-picker').getByRole('button', { name: 'Zarya', exact: true })); after = await ready(); assert.equal(after.selected, 'zarya');
    if (!after.cutaway) after = await pure(() => activate(page.locator('[data-iss-cutaway]')));
    assert(after.cutaway && after.camera.focusId === 'radiator-a');
    for (const material of after.draw.radiators.a.parts.flatMap(part => part.materials)) near(material.opacity, 1);
    for (const material of after.draw.radiators.b.parts.flatMap(part => part.materials)) assert(material.opacity < 1, 'Uninspected radiator follows the cutaway dimming');
    after = await pure(() => activate(fit('b'))); verifyFit(after, 'b');
    for (const material of after.draw.radiators.b.parts.flatMap(part => part.materials)) near(material.opacity, 1);
    for (const material of after.draw.radiators.a.parts.flatMap(part => part.materials)) assert(material.opacity < 1);
    result.checks.cutawayKeepsInspectedHardwareOpaque = true;

    after = await pure(() => activate(page.locator('[data-iss-camera-fit="station"]'))); assert.equal(after.camera.focusId, null); assert(!after.caption.visible && !after.draw.bracket.visible);
    for (const side of ['a', 'b']) for (const material of after.draw.radiators[side].parts.flatMap(part => part.materials)) assert(material.opacity < 1);
    after = await pure(() => activate(page.locator('[data-iss-cutaway]'))); assert(!after.cutaway);
    for (const side of ['a', 'b']) for (const material of after.draw.radiators[side].parts.flatMap(part => part.materials)) near(material.opacity, 1);
    result.checks.exitInspectionRestoresCutawayBehavior = true;

    const layout = await page.evaluate(() => {
      const box = node => { const r = node.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
      return { viewport: innerWidth, width: document.documentElement.scrollWidth, tools: box(document.querySelector('[data-iss-camera-tools]')), controls: Array.from(document.querySelectorAll('[data-iss-camera-tools] button'), box) };
    });
    assert(layout.width <= width + 1); layout.controls.forEach((control, index) => {
      assert(control.width > 0 && control.left >= -1 && control.right <= width + 1);
      assert(control.left >= layout.tools.left - 1 && control.right <= layout.tools.right + 1 && control.top >= layout.tools.top - 1 && control.bottom <= layout.tools.bottom + 1);
      if (phone) assert(control.height >= 43.9, 'Phone inspection controls have 44px targets');
      layout.controls.slice(index + 1).forEach(other => assert(Math.min(control.right, other.right) - Math.max(control.left, other.left) < 1 || Math.min(control.bottom, other.bottom) - Math.max(control.top, other.top) < 1));
    });
    await page.addScriptTag({ path: path.join(ROOT, 'desktop/web-app/node_modules/axe-core/axe.min.js') });
    const accessibility = await page.evaluate(async () => { const checked = await axe.run({ include: ['[data-iss-camera-tools]'] }, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } }); return { passes: checked.passes.length, violations: checked.violations.map(item => ({ id: item.id, targets: item.nodes.map(node => node.target) })) }; });
    assert.deepEqual(accessibility.violations, []); result.checks.layoutAndAccessibility = { layout, accessibility };
    const events = await page.evaluate(() => window.__issRadiatorQA.events);
    for (const side of ['a', 'b']) assert(events.some(event => event.trusted && event.type === 'click' && event.fit === 'radiator-' + side));
    assert(events.some(event => event.trusted && event.type === 'keydown' && event.fit === 'radiator-a' && event.key === 'Enter'));
    assert(events.some(event => event.trusted && event.type === 'pointerdown' && event.canvas && event.pointerType === (phone ? 'touch' : 'mouse')));
    result.errors = errors; result.consoleErrors = consoleErrors; result.hostErrors = await page.evaluate(() => window.__events?.errors || []);
    assert.deepEqual(errors, []); assert.deepEqual(consoleErrors, []); assert.deepEqual(result.hostErrors, []);
    result.passed = true; console.log(`Radiator inspection, rendering, camera purity and accessibility passed at ${width}px`); return result;
  } catch (error) { result.passed = false; result.failure = error.stack || error.message; result.errors = errors; result.consoleErrors = consoleErrors; result.lastSnapshot = await read().catch(() => null); error.qaResult = result; throw error; }
  finally {
    try {
      result.checks.cleanup = await page.evaluate(() => { document.querySelector('.iss-station-stage canvas')?._issSetLighting?.({ playing: false }); window.__destroy?.(); const qa = window.__issRadiatorQA;
        return { contexts: qa?.contexts.length || 0, lost: (qa?.contexts || []).map(gl => gl.isContextLost()), textures: Object.values(qa?.textures || {}), canvases: document.querySelectorAll('.iss-station-stage canvas').length }; });
      if (result.passed) { assert(result.checks.cleanup.contexts > 0 && result.checks.cleanup.lost.every(Boolean)); assert.equal(result.checks.cleanup.canvases, 0); assert(result.checks.cleanup.textures.length > 0 && result.checks.cleanup.textures.every(texture => texture.disposed)); assert.deepEqual(errors, []); }
    } catch (error) { if (result.passed) { result.passed = false; result.failure = error.stack || error.message; error.qaResult = result; throw error; } result.cleanupFailure = error.stack || error.message; }
    finally { await page.close(); }
  }
}
async function main() {
  await fs.mkdir(output, { recursive: true }); const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const results = []; let failure;
  try { for (const width of widths) { try { results.push(await runWidth(browser, width)); } catch (error) { results.push(error.qaResult || { width, passed: false, failure: error.stack || error.message }); failure = error; break; }
    finally { const temp = path.join(output, 'results.json.tmp'); await fs.writeFile(temp, JSON.stringify({ base, results }, null, 2) + '\n'); await fs.rename(temp, path.join(output, 'results.json')); } } }
  finally { await browser.close(); }
  if (failure) throw failure; console.log(`Radiator checks passed: ${widths.join(', ')}px. Results: ${output}`);
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
