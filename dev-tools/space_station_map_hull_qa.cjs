#!/usr/bin/env node
'use strict';

// Inspect the real renderer, hardware geometry, and native inspection controls.
// Uses the existing preview server; browser runs are coordinated by the caller.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const arg = (name, fallback) => process.argv.slice(2).find(value => value.startsWith(name + '='))?.slice(name.length + 1) || fallback;
const base = arg('--base', 'http://127.0.0.1:4179').replace(/\/$/, '');
const output = path.resolve(ROOT, arg('--out', 'reports/space-station-enhancement-qa/map-hull-browser'));
const widths = arg('--widths', '1440,390').split(',').map(Number);
assert(widths.length && widths.every(width => Number.isInteger(width) && width >= 320));
const modules = [
  { id: 'zarya', label: 'Zarya', radius: .55, length: 3.4, position: [0, 0, 2.2], axis: 'z' },
  { id: 'unity', label: 'Unity', radius: .6, length: 1.4, position: [0, 0, .2], axis: 'z' },
  { id: 'zvezda', label: 'Zvezda', radius: .55, length: 3.2, position: [0, 0, 4.6], axis: 'z' },
  { id: 'destiny', label: 'Destiny', radius: .58, length: 2.6, position: [0, 0, -1.6], axis: 'z' },
  { id: 'quest', label: 'Quest', radius: .45, length: 1.2, position: [1.1, 0, .2], axis: 'x' },
  { id: 'harmony', label: 'Harmony', radius: .6, length: 1.6, position: [0, 0, -3.4], axis: 'z' },
  { id: 'columbus', label: 'Columbus', radius: .55, length: 1.6, position: [-1.4, 0, -3.4], axis: 'x' },
  { id: 'kibo', label: 'Kibo', radius: .6, length: 2, position: [1.5, 0, -3.4], axis: 'x' },
  { id: 'tranquility', label: 'Tranquility', radius: .6, length: 1.5, position: [-1.2, 0, .2], axis: 'x' },
  { id: 'leonardo', label: 'Leonardo', radius: .5, length: 1.3, position: [0, -.85, .2], axis: 'y' },
  { id: 'nauka', label: 'Nauka', radius: .55, length: 1.9, position: [0, .85, 4.6], axis: 'y' }
];
const near = (actual, expected, tolerance = 1e-6) => { assert(Number.isFinite(actual) && Number.isFinite(expected)); assert(Math.abs(actual - expected) <= tolerance, `${actual} should equal ${expected} within ${tolerance}`); };
const vectorNear = (actual, expected, tolerance = 1e-6) => { assert(Array.isArray(actual) && Array.isArray(expected) && actual.length === expected.length); actual.forEach((value, index) => near(value, expected[index], tolerance)); };
function samePhysics(before, after) {
  for (const key of ['phase', 'beta', 'arrayAlpha', 'arrayFeather', 'actualAlphaRate', 'actualFeatherRate', 'driveElapsed', 'commandAlpha', 'commandFeather', 'motorRate', 'motorAcceleration', 'rate', 'incidence', 'generation']) near(after.light[key], before.light[key]);
  for (const key of ['tracking', 'motorEnabled', 'motorSmooth', 'motorBraking', 'playing', 'eclipse']) assert.equal(after.light[key], before.light[key]);
  vectorNear(after.camera.stationQuaternion, before.camera.stationQuaternion);
  for (const key of ['actual', 'target', 'pose', 'base', 'elapsed', 'enabled', 'branch', 'guides']) assert.deepEqual(after.arm[key], before.arm[key]);
  assert.deepEqual(after.thermal, before.thermal); assert.deepEqual(after.preview, before.preview); assert.deepEqual(after.forecast, before.forecast);
}
function observeHulls() {
  const Original = THREE.WebGLRenderer, qa = window.__issHullQA = { draw: null, sequence: 0, contexts: [], resources: {}, geometries: {}, activations: {}, scene: null, camera: null, tracePick: false, lastPick: null };
  const intersectObjects = THREE.Raycaster.prototype.intersectObjects;
  THREE.Raycaster.prototype.intersectObjects = function (objects, recursive) {
    const hits = intersectObjects.apply(this, arguments);
    if (qa.tracePick) qa.lastPick = { includesEndcaps: objects.some(object => object._issHullCap), first: hits[0] ? { name: hits[0].object.name, id: hits[0].object._issId || hits[0].object._issParentId, cap: !!hits[0].object._issHullCap } : null };
    return hits;
  };
  function record(resource, kind) {
    if (!resource || qa.resources[resource.uuid]) return;
    const entry = qa.resources[resource.uuid] = { uuid: resource.uuid, kind, disposed: false };
    resource.addEventListener('dispose', () => { entry.disposed = true; });
  }
  function textureInfo(texture) {
    if (!texture) return null; record(texture, 'texture');
    return { uuid: texture.uuid, name: texture.name, canvas: texture.image instanceof HTMLCanvasElement, isCanvasTexture: texture.isCanvasTexture === true,
      width: texture.image?.width, height: texture.image?.height, srgb: texture.encoding === THREE.sRGBEncoding, repeat: texture.repeat.toArray(), clamp: texture.wrapS === THREE.ClampToEdgeWrapping && texture.wrapT === THREE.ClampToEdgeWrapping };
  }
  function geometryInfo(geometry, role, definition) {
    if (qa.geometries[geometry.uuid]) return qa.geometries[geometry.uuid]; record(geometry, 'geometry');
    if (!geometry.boundingBox) geometry.computeBoundingBox(); if (!geometry.boundingSphere) geometry.computeBoundingSphere();
    const position = geometry.attributes.position, normal = geometry.attributes.normal, uv = geometry.attributes.uv, vertices = Array.from(position.array);
    const data = { type: geometry.type, parameters: geometry.parameters || null, vertices: position.count, finite: vertices.every(Number.isFinite), normalsFinite: !!normal && Array.from(normal.array).every(Number.isFinite),
      min: geometry.boundingBox.min.toArray(), max: geometry.boundingBox.max.toArray(), radius: geometry.boundingSphere.radius, uvFinite: !!uv && Array.from(uv.array).every(Number.isFinite) };
    if (role === 'caps') {
      data.faces = [-1, 1].map(sign => { let count = 0, maxPlaneError = 0, maxNormalError = 0, radialMax = 0, uvMin = Infinity, uvMax = -Infinity;
        for (let index = 0; index < position.count; index++) { const x = position.getX(index), y = position.getY(index), z = position.getZ(index); if (Math.sign(y) !== sign) continue;
          count++; maxPlaneError = Math.max(maxPlaneError, Math.abs(y - sign * definition.length / 2)); radialMax = Math.max(radialMax, Math.hypot(x, z));
          maxNormalError = Math.max(maxNormalError, Math.abs(normal.getX(index)), Math.abs(normal.getY(index) - sign), Math.abs(normal.getZ(index)));
          uvMin = Math.min(uvMin, uv.getX(index), uv.getY(index)); uvMax = Math.max(uvMax, uv.getX(index), uv.getY(index)); }
        return { sign, count, maxPlaneError, maxNormalError, radialMax, uvMin, uvMax }; });
    }
    if (role === 'rails') {
      data.radialMin = Infinity; data.radialMax = 0;
      for (let i = 0; i < position.count; i++) { const radius = Math.hypot(position.getX(i), position.getZ(i)); data.radialMin = Math.min(data.radialMin, radius); data.radialMax = Math.max(data.radialMax, radius); }
      const rows = Math.max(2, Math.ceil(definition.length / .85)), span = Math.min(.38, definition.length * .46 / rows); data.rows = rows; data.supports = [];
      for (let lane = 0; lane < 4; lane++) for (let row = 0; row < rows; row++) for (const end of [-1, 1]) {
        const angle = Math.PI / 4 + lane * Math.PI / 2, y = (row - (rows - 1) / 2) * definition.length * .72 / rows + end * span / 2;
        function nearest(radial) { const x = Math.sin(angle) * radial, z = Math.cos(angle) * radial; let distance = Infinity;
          for (let vertex = 0; vertex < position.count; vertex++) distance = Math.min(distance, Math.hypot(position.getX(vertex) - x, position.getY(vertex) - y, position.getZ(vertex) - z)); return distance; }
        data.supports.push({ lane, row, end, surfaceDistance: nearest(definition.radius - .003), gripDistance: nearest(definition.radius + .07) });
      }
    }
    return qa.geometries[geometry.uuid] = data;
  }
  function meshInfo(mesh, role, definition, camera) {
    if (!mesh) return null; const material = mesh.material; record(material, 'material');
    const bounds = new THREE.Box3().setFromObject(mesh), projected = [];
    for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) projected.push(new THREE.Vector3(x, y, z).project(camera).toArray());
    return { name: mesh.name, id: mesh._issId, parentId: mesh._issParentId, hullCap: !!mesh._issHullCap, position: mesh.position.toArray(), quaternion: mesh.quaternion.toArray(), castShadow: mesh.castShadow, receiveShadow: mesh.receiveShadow,
      geometry: geometryInfo(mesh.geometry, role, definition), projected, material: { uuid: material.uuid, array: Array.isArray(material), type: material.type, color: material.color?.toArray(), emissive: material.emissive?.toArray(), emissiveMap: !!material.emissiveMap,
        map: textureInfo(material.map), opacity: material.opacity, transparent: material.transparent, depthWrite: material.depthWrite, roughness: material.roughness, metalness: material.metalness } };
  }
  function ObservedRenderer(options) {
    const renderer = new Original(options), original = renderer.render; qa.contexts.push(renderer.getContext());
    renderer.render = function (scene, camera) {
      const result = original.apply(this, arguments), cv = renderer.domElement;
      if (scene.name !== 'iss-station-inspection' || !cv._issCameraState) return result; qa.scene = scene; qa.camera = camera;
      const hardware = {};
      for (const definition of window.__issHullDefinitions) {
        hardware[definition.id] = {};
        for (const [role, prefix] of [['hull', 'iss-module-hull-'], ['caps', 'iss-module-endcaps-'], ['rails', 'iss-module-handrails-']]) hardware[definition.id][role] = meshInfo(scene.getObjectByName(prefix + definition.id), role, definition, camera);
      }
      const cores = []; scene.traverse(node => { if (node.isMesh && node._issParentId && node.material?.side === THREE.BackSide && node.material?.emissiveMap) cores.push({ id: node._issParentId, visible: node.visible }); });
      qa.draw = { sequence: ++qa.sequence, hardware, cores, camera: cv._issCameraState(), light: cv._issLightingState(), thermal: cv._issThermalState(), selected: cv._issWantSel, cutaway: !!cv._issCutaway,
        directSun: scene.getObjectByName('iss-direct-sun')?.intensity, width: cv.clientWidth, height: cv.clientHeight };
      return result;
    }; return renderer;
  }
  ObservedRenderer.prototype = Original.prototype; Object.setPrototypeOf(ObservedRenderer, Original); THREE.WebGLRenderer = ObservedRenderer;
}

function verify(snapshot) {
  const { draw, selected, cutaway } = snapshot; assert(draw && Object.keys(draw.hardware).length === modules.length); assert.equal(snapshot.glLost, false); assert(!snapshot.light.playing && !snapshot.forecast.playing && !snapshot.camera.tweening && !snapshot.camera.activePointers);
  const atlas = [];
  for (const definition of modules) {
    const { hull, caps, rails } = draw.hardware[definition.id]; assert(hull && caps && rails, `Complete hull hardware for ${definition.id}`);
    assert.equal(hull.id, definition.id); assert.equal(hull.geometry.type, 'CylinderGeometry'); assert.equal(hull.geometry.parameters.radialSegments, 32); assert.equal(hull.geometry.parameters.openEnded, true); near(hull.geometry.parameters.radiusTop, definition.radius); near(hull.geometry.parameters.height, definition.length); assert.equal(hull.material.array, false);
    for (const part of [hull, caps, rails]) { vectorNear(part.position, definition.position); vectorNear(part.quaternion, hull.quaternion); assert(part.geometry.finite && part.geometry.normalsFinite && part.geometry.uvFinite && part.geometry.vertices > 0); assert(part.geometry.radius > 0); assert(part.geometry.min.every(Number.isFinite) && part.geometry.max.every(Number.isFinite)); }
    for (const part of [caps, rails]) { assert.equal(part.parentId, definition.id); assert.equal(part.material.type, 'MeshStandardMaterial'); assert.equal(part.material.emissiveMap, false); assert(part.castShadow && part.receiveShadow); }
    vectorNear(rails.material.emissive, [0, 0, 0]); vectorNear(caps.material.emissive, hull.material.emissive);
    assert(caps.hullCap); assert(caps.material.transparent); assert(caps.material.map?.canvas && caps.material.map.isCanvasTexture && caps.material.map.srgb && caps.material.map.clamp); assert.equal(caps.material.map.name, 'iss-module-endcap-atlas'); near(caps.material.map.width, 512); near(caps.material.map.height, 512); vectorNear(caps.material.map.repeat, [1, 1]); atlas.push(caps.material.map.uuid);
    for (const face of caps.geometry.faces) { assert(face.count >= 3); near(face.maxPlaneError, 0); near(face.maxNormalError, 0); near(face.radialMax, definition.radius); assert(face.uvMin >= -1e-7 && face.uvMax <= 1 + 1e-7); }
    assert(rails.geometry.radialMin <= definition.radius - .002, 'Rail feet penetrate the hull surface slightly'); assert(rails.geometry.radialMax >= definition.radius + .08 && rails.geometry.radialMax <= definition.radius + .09, 'Grips stand proud of the hull without an excessive envelope');
    rails.geometry.supports.forEach(support => { assert(support.surfaceDistance <= .013, 'Each rail end has a foot at the hull'); assert(support.gripDistance <= .019, 'Each foot meets its raised grip'); });
    const active = selected === definition.id; near(hull.material.opacity, cutaway ? active ? .26 : .1 : 1); near(caps.material.opacity, hull.material.opacity); near(rails.material.opacity, cutaway && !active ? .05 : 1);
    assert.equal(hull.material.depthWrite, !cutaway); assert.equal(caps.material.depthWrite, !cutaway); assert.equal(rails.material.depthWrite, !cutaway || active);
  }
  assert.equal(new Set(atlas).size, 1, 'All eleven endcap pairs reuse one atlas');
  for (const core of draw.cores) assert.equal(core.visible, cutaway && core.id === selected);
  near(draw.directSun, snapshot.light.eclipse ? 0 : 1.35); vectorNear(draw.camera.position, snapshot.camera.position); return snapshot;
}
function verifyFocus(snapshot, definition) {
  assert.equal(snapshot.selected, definition.id); assert.equal(snapshot.camera.focusId, definition.id); vectorNear(snapshot.camera.target, definition.position);
  for (const part of Object.values(snapshot.draw.hardware[definition.id])) for (const point of part.projected) { assert(point.every(Number.isFinite)); assert(Math.abs(point[0]) <= 1.015 && Math.abs(point[1]) <= 1.015 && point[2] > -1 && point[2] < 1, 'Module framing contains hull, endcaps and raised rails'); }
}

async function runWidth(browser, width) {
  const phone = width < 500, height = phone ? 844 : 1080, errors = [], consoleErrors = [], result = { width, touch: phone, checks: {}, screenshots: [] };
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000); page.on('pageerror', error => errors.push(error.stack || error.message)); page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  const canvas = page.locator('.iss-station-stage canvas'), stage = page.locator('.iss-station-stage'), picker = page.locator('.iss-module-picker'); let activationSequence = 0;
  const activate = async (locator, keyboard = false, position) => { const token = ++activationSequence;
    await locator.evaluate((node, id) => node.addEventListener('click', event => { window.__issHullQA.activations[id] = { trusted: event.isTrusted, label: node.textContent.trim() }; }, { once: true, capture: true }), token);
    if (keyboard) { await locator.focus(); await page.keyboard.press('Enter'); } else if (phone) await locator.tap(position ? { position } : {}); else await locator.click(position ? { position } : {});
    await page.waitForFunction(id => window.__issHullQA?.activations[id]?.trusted === true, token, { polling: 50 });
  };
  const read = () => canvas.evaluate(cv => { const gl = cv.getContext('webgl2') || cv.getContext('webgl'); return { light: cv._issLightingState(), arm: cv._issArmState(), thermal: cv._issThermalState(), camera: cv._issCameraState(), forecast: cv._issForecastState(), preview: cv._issArmPreviewState(), selected: cv._issWantSel, cutaway: !!cv._issCutaway, glLost: gl?.isContextLost(), draw: window.__issHullQA.draw }; });
  const ready = async () => { await page.waitForFunction(() => { const cv = document.querySelector('.iss-station-stage canvas'), draw = window.__issHullQA?.draw; if (!cv?._issCameraState || !draw) return false; const camera = cv._issCameraState(), light = cv._issLightingState();
    return !camera.tweening && !camera.activePointers && !light.playing && cv._issWantSel === draw.selected && !!cv._issCutaway === draw.cutaway && light.phase === draw.light.phase && light.eclipse === draw.light.eclipse && JSON.stringify(cv._issThermalState()) === JSON.stringify(draw.thermal) &&
      camera.focusId === draw.camera.focusId && camera.position.every((value, index) => Math.abs(value - draw.camera.position[index]) < 1e-8) && draw.width === cv.clientWidth && draw.height === cv.clientHeight;
  }, undefined, { polling: 100 }); return verify(await read()); };
  const pure = async action => { const before = await ready(); await action(); const after = await ready(); samePhysics(before, after); return after; };
  const focus = async id => { const definition = modules.find(module => module.id === id); let after = await pure(() => activate(picker.getByRole('button', { name: definition.label, exact: true }))); assert.equal(after.selected, id);
    after = await pure(() => activate(page.locator('[data-iss-focus-module="' + id + '"]'), id === 'leonardo')); verifyFocus(after, definition); return after; };
  const outward = async (direction, maximumDistance) => pure(() => canvas.evaluate((cv, options) => {
    if (options.maximumDistance) cv._issCameraZoom(Math.min(1, options.maximumDistance / cv._issCameraState().distance));
    const state = cv._issCameraState(), delta = state.position.map((value, index) => value - state.target[index]), length = Math.hypot(...delta), wanted = options.direction, wantedLength = Math.hypot(...wanted);
    cv._issCameraOrbit(Math.atan2(wanted[0], wanted[2]) - Math.atan2(delta[0], delta[2]), Math.acos(wanted[1] / wantedLength) - Math.acos(delta[1] / length));
  }, { direction, maximumDistance }));
  const pickEndcap = async id => {
    await pure(() => activate(picker.getByRole('button', { name: 'Unity', exact: true })));
    await canvas.scrollIntoViewIfNeeded(); const before = await ready();
    const position = await canvas.evaluate((cv, id) => {
      const qa = window.__issHullQA, mesh = qa.scene.getObjectByName('iss-module-endcaps-' + id), definition = window.__issHullDefinitions.find(module => module.id === id), candidates = [];
      qa.scene.traverse(node => { if (node.isMesh && (node._issId || node._issHullCap)) candidates.push(node); });
      const rect = cv.getBoundingClientRect();
      for (const sign of [-1, 1]) for (const radius of [0, .2, .4]) for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
        const point = new THREE.Vector3(definition.radius * radius * Math.sin(angle), sign * definition.length / 2, definition.radius * radius * Math.cos(angle)).applyMatrix4(mesh.matrixWorld).project(qa.camera);
        if (Math.abs(point.x) > .9 || Math.abs(point.y) > .9 || point.z <= -1 || point.z >= 1) continue;
        const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2(point.x, point.y), qa.camera); const hits = ray.intersectObjects(candidates, false);
        const x = (point.x * .5 + .5) * rect.width, y = (-point.y * .5 + .5) * rect.height;
        if (hits[0]?.object === mesh && document.elementFromPoint(rect.left + x, rect.top + y) === cv) return { x, y };
      }
      return null;
    }, id);
    assert(position, 'An exposed endcap offers an unobstructed native pointer target');
    await canvas.evaluate(node => node.addEventListener('click', event => { window.__issHullQA.tracePick = event.isTrusted; }, { once: true, capture: true }));
    await activate(canvas, false, position); const after = await ready(); samePhysics(before, after); assert.equal(after.selected, id);
    const picking = await page.evaluate(() => { const qa = window.__issHullQA; qa.tracePick = false; return qa.lastPick; }); assert(picking?.includesEndcaps && picking.first?.cap && picking.first.id === id, 'The actual native pick handler resolves the separate cap to its module');
    return picking;
  };
  const capture = async label => { await stage.scrollIntoViewIfNeeded(); await ready(); const file = `map-hull-${label}-${width}.png`; await stage.screenshot({ path: path.join(output, file), animations: 'disabled' }); result.screenshots.push(file); };
  try {
    console.log(`Checking station hull hardware at ${width}px`);
    await page.addInitScript(definitions => { window.__issHullDefinitions = definitions; let seed = 42; Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }; window.AlloPostFXEnabled = false; }, modules);
    await page.route('**/vendor/three-r128/three.min.js', async route => { const response = await route.fetch(); assert(response.ok()); await route.fulfill({ response, body: (await response.text()) + '\n;(' + observeHulls.toString() + ')();\n' }); });
    await page.goto(`${base}/?tab=map`, { waitUntil: 'load' }); await picker.waitFor();
    await canvas.evaluate(cv => { cv._issSetLighting({ beta: 20, phase: 0, playing: false, motorEnabled: true, motorSmooth: true }); cv._issSetThermal({ heatKW: 70, cooling: 85, pump: true }); cv._issSetArm({ x: -1.8, y: 1.2 }); cv._issStepLighting(3); cv._issSetLighting({ phase: 0 }); });
    let after = await ready(); assert(after.thermal.physical.elapsed > 0); result.checks.elevenFiniteOpenHullsAndSeparateHardware = true;
    result.checks.outwardEndcapsAndSharedAtlas = true; result.checks.raisedRailsHaveAttachedFeet = true;
    for (const id of ['zarya', 'destiny', 'kibo', 'leonardo']) {
      after = await focus(id);
      if (id === 'kibo') { after = await outward([1, .16, -.25]); assert((after.camera.position[0] - after.camera.target[0]) / after.camera.distance > .9); }
      if (id === 'leonardo') { after = await outward([.2, -1, .35], 2.7); assert((after.camera.position[1] - after.camera.target[1]) / after.camera.distance < -.85); }
      await capture(id + '-day');
      if (id === 'kibo') result.checks.nativeEndcapPicking = await pickEndcap(id);
    }
    const atlasData = await page.evaluate(() => window.__issHullQA.scene.getObjectByName('iss-module-endcaps-kibo').material.map.image.toDataURL('image/png').split(',')[1]);
    const atlasFile = `map-hull-endcap-atlas-${width}.png`; await fs.writeFile(path.join(output, atlasFile), Buffer.from(atlasData, 'base64')); result.screenshots.push(atlasFile);
    result.checks.nativeThreeAxisFocusPreservesPhysics = true;

    after = await pure(() => activate(page.locator('[data-iss-cutaway]'))); assert(after.cutaway); await capture('leonardo-cutaway');
    after = await focus('destiny'); assert(after.cutaway); await capture('destiny-cutaway');
    assert(after.draw.cores.some(core => core.id === 'destiny' && core.visible)); after = await pure(() => activate(page.locator('[data-iss-cutaway]'))); assert(!after.cutaway);
    result.checks.cutawayCapsFollowHullAndRailsFollowSelection = true;

    const beforeNight = after; await activate(page.locator('[data-iss-lighting-preset="midnight"]')); after = await ready(); assert(after.light.eclipse); assert.deepEqual(after.thermal.physical, beforeNight.thermal.physical); assert.deepEqual(after.arm, beforeNight.arm); await capture('destiny-eclipse');
    after = await focus('nauka'); await capture('nauka-eclipse'); result.checks.eclipseHardwareRemainsNonEmissive = true;

    await canvas.evaluate(cv => cv._issToggleForecast(true)); after = await ready(); assert(after.forecast.active);
    after = await focus('kibo'); assert(after.forecast.active); after = await pure(() => activate(page.locator('[data-iss-camera-zoom="in"]'))); assert(after.forecast.active && after.camera.focusId === 'kibo');
    after = await pure(async () => { await canvas.focus(); await page.keyboard.press('ArrowRight'); }); assert(after.forecast.active && after.camera.focusId === 'kibo');
    result.checks.cameraInspectionRetainsThermalAndFutureState = true;

    const layout = await page.evaluate(() => { const box = node => { const r = node.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
      return { viewport: innerWidth, width: document.documentElement.scrollWidth, stage: box(document.querySelector('.iss-station-stage')), buttons: Array.from(document.querySelectorAll('.iss-module-picker button,[data-iss-focus-module],[data-iss-cutaway]'), box) }; });
    assert(layout.width <= width + 1); assert(layout.stage.left >= -1 && layout.stage.right <= width + 1 && layout.stage.width > 200);
    for (const button of layout.buttons) assert(button.width > 0 && button.height >= 24 && button.left >= -1 && button.right <= width + 1);
    await page.addScriptTag({ path: path.join(ROOT, 'desktop/web-app/node_modules/axe-core/axe.min.js') });
    const accessibility = await page.evaluate(async () => { const checked = await axe.run({ include: ['.iss-module-picker', '[data-iss-focus-module]', '[data-iss-cutaway]'] }, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } }); return { passes: checked.passes.length, violations: checked.violations.map(item => ({ id: item.id, targets: item.nodes.map(node => node.target) })) }; });
    assert.deepEqual(accessibility.violations, []); result.checks.layoutAndAccessibility = { layout, accessibility };
    result.errors = errors; result.consoleErrors = consoleErrors; result.hostErrors = await page.evaluate(() => window.__events?.errors || []); assert.deepEqual(errors, []); assert.deepEqual(consoleErrors, []); assert.deepEqual(result.hostErrors, []);
    result.passed = true; console.log(`Hull hardware, native inspection, thermal purity and cleanup passed at ${width}px`); return result;
  } catch (error) { result.passed = false; result.failure = error.stack || error.message; result.errors = errors; result.consoleErrors = consoleErrors; result.lastSnapshot = await read().catch(() => null); error.qaResult = result; throw error; }
  finally {
    try { result.checks.cleanup = await page.evaluate(() => { document.querySelector('.iss-station-stage canvas')?._issSetLighting?.({ playing: false }); window.__destroy?.(); const qa = window.__issHullQA;
      return { contexts: qa?.contexts.length || 0, lost: (qa?.contexts || []).map(gl => gl.isContextLost()), resources: Object.values(qa?.resources || {}), canvases: document.querySelectorAll('.iss-station-stage canvas').length }; });
      if (result.passed) { assert(result.checks.cleanup.contexts > 0 && result.checks.cleanup.lost.every(Boolean)); assert.equal(result.checks.cleanup.canvases, 0); assert(result.checks.cleanup.resources.length > 0 && result.checks.cleanup.resources.every(resource => resource.disposed)); assert.deepEqual(errors, []); }
    } catch (error) { if (result.passed) { result.passed = false; result.failure = error.stack || error.message; error.qaResult = result; throw error; } result.cleanupFailure = error.stack || error.message; }
    finally { await page.close(); }
  }
}
async function main() {
  await fs.mkdir(output, { recursive: true }); const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const report = { base, generatedAt: new Date().toISOString(), widths, results: [] };
  try { for (const width of widths) { try { report.results.push(await runWidth(browser, width)); } catch (error) { report.results.push(error.qaResult || { width, passed: false, failure: error.stack || error.message }); throw error; } } }
  finally { await browser.close(); await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(report, null, 2) + '\n'); }
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
