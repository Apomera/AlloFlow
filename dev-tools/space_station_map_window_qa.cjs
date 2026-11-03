#!/usr/bin/env node
'use strict';

// Local, native WebGL checks for the Destiny science-window change.
// node dev-tools/space_station_map_window_qa.cjs --selftest
// node dev-tools/space_station_map_window_qa.cjs --out=.tmp/space-station-destiny-window-01a185d3/browser
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const { createPreview } = require('./space_station_enhancement_qa.cjs');
const ROOT = path.resolve(__dirname, '..');
const argument = (name, fallback) => process.argv.find(value => value.startsWith(name + '='))?.slice(name.length + 1) || fallback;
const output = path.resolve(ROOT, argument('--out', '.tmp/space-station-destiny-window-01a185d3/browser'));
const widths = argument('--widths', '1440,390').split(',').map(Number);
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const near = (a, b, tolerance = 1e-7) => assert(Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tolerance, `${a} != ${b}`);
const vectorNear = (a, b, tolerance) => { assert.equal(a.length, b.length); a.forEach((v, i) => near(v, b[i], tolerance)); };
const independent = data => Object.fromEntries(Object.entries(data).filter(([key]) => !['selModule', 'seenModules', 'mapCutaway'].includes(key)));

function verifyWindow(value, fitted = false) {
  assert.deepEqual(value.parts.map(part => part.name).sort(), ['iss-destiny-window-gasket', 'iss-destiny-window-pane', 'iss-destiny-window-rim']);
  for (const part of value.parts) {
    assert.equal(part.parent, 'destiny'); assert.equal(part.type, 'MeshStandardMaterial');
    assert.equal(part.emissive, 0, 'Window does not emit its own light'); assert.equal(part.map, false, 'Window adds no texture');
    assert(part.finite && part.triangles > 0); assert(part.center[1] < -.58, 'Window is outside the nadir hull surface');
  }
  assert.equal(new Set(value.parts.map(part => part.materialId)).size, 3, 'Glass, gasket and rim own independent materials');
  assert.equal(value.sharesProtectedMaterial, false, 'Cutaway changes cannot recolor another component');
  assert.equal(value.oldBeads, 0); vectorNear(value.normal, [0, -1, 0], 1e-6);
  if (fitted) {
    assert.equal(value.camera.focusId, 'window'); assert.equal(value.camera.fit, 'window'); assert(!value.camera.tweening);
    near(value.camera.minDistance, .55); assert(value.camera.distance >= .55 - 1e-7);
    near(value.camera.fitRadius, value.radius, 1e-6);
    const half = value.fov * Math.PI / 360, horizontal = Math.atan(Math.tan(half) * value.aspect);
    near(value.camera.distance, Math.max(.55, value.radius * 1.16 / Math.sin(Math.min(half, horizontal))), 1e-6);
    vectorNear(value.camera.target, value.center, 1e-6); vectorNear(value.camera.fitCenter, value.center, 1e-6);
    assert(value.projected.every(point => point.every(Number.isFinite) && Math.abs(point[0]) < .95 && Math.abs(point[1]) < .95 && point[2] > -1 && point[2] < 1), 'Actual window bounds fit inside the canvas');
    assert(value.panePixels.width >= 12 && value.panePixels.height >= 12, 'Window remains recognizable in the phone inspection');
    assert(value.frontDot > .5, 'Camera sees the exterior face');
  }
}

function verifyProtected(before, after) {
  assert.equal(before.oldBeads, 11); assert.equal(after.oldBeads, 0);
  assert.equal(after.meshCount, before.meshCount - 8, 'Eleven old beads become exactly three window parts');
  assert.deepEqual(after.protected, before.protected, 'Protected hulls, Cupola, arrays, radiators and visiting craft stay exact');
  assert.deepEqual(after.physics, before.physics, 'Window change preserves orbital physics');
  assert.deepEqual(after.data, before.data, 'Equivalent native actions preserve every saved field');
}

function verifyCleanup(mounts) {
  assert(mounts.length > 0);
  for (const mount of mounts) {
    assert(mount.lost && mount.frames > 0, 'Mounted WebGL context closes');
    assert(mount.resources > 0); assert.deepEqual(mount.bad, [], 'Every observed geometry, material and texture disposes exactly once');
  }
}

function verifyExteriorEye(value) {
  assert.equal(value.focusId, 'window');
  assert(value.signedDistance > 1e-6, 'Camera remains outside the actual glass plane');
  assert(value.position.every(Number.isFinite));
}

// Read the renderer's real scene; product code and helpers are not replaced.
function installObserver() {
  const Original = THREE.WebGLRenderer;
  window.__windowQA = { mounts: [], draw: null };
  function ObservedRenderer(options) {
    const renderer = new Original(options), render = renderer.render;
    const mount = { gl: renderer.getContext(), resources: {}, frames: 0, scene: null, camera: null };
    window.__windowQA.mounts.push(mount);
    function track(resource, owner, ownerType) {
      if (!resource) return;
      const existing = mount.resources[resource.uuid];
      if (existing) { if (owner && !existing.owners.includes(owner)) existing.owners.push(owner); if (ownerType && !existing.ownerTypes.includes(ownerType)) existing.ownerTypes.push(ownerType); return; }
      const entry = mount.resources[resource.uuid] = { name: resource.name || '', kind: resource.type, owners: owner ? [owner] : [], ownerTypes: ownerType ? [ownerType] : [], disposals: 0 };
      // Three's ArrowHelper shares cached line/cone geometry across mounts.
      // Count a resource's disposal during this renderer's lifetime only.
      resource.addEventListener('dispose', () => { if (!mount.closed) entry.disposals++; });
    }
    renderer.render = function (scene, camera) {
      const answer = render.apply(this, arguments);
      scene.traverse(object => {
        const owner = object.name || object.parent?.name || '';
        track(object.geometry, owner, object.parent?.type);
        for (const material of (Array.isArray(object.material) ? object.material : [object.material])) {
          if (!material) continue; track(material, owner, object.parent?.type);
          for (const value of Object.values(material)) if (value?.isTexture) track(value, owner, object.parent?.type);
        }
      });
      if (scene.name === 'iss-station-inspection') {
        mount.scene = scene; mount.camera = camera; mount.frames++;
        window.__windowQA.draw = mount;
      }
      return answer;
    };
    return renderer;
  }
  ObservedRenderer.prototype = Original.prototype; Object.setPrototypeOf(ObservedRenderer, Original);
  THREE.WebGLRenderer = ObservedRenderer;
}

function readScene() {
  const observed = window.__windowQA.draw, cv = document.querySelector('.iss-station-stage canvas');
  const scene = observed.scene, camera = observed.camera, station = scene.getObjectByName('iss-inspected-station');
  const state = cv._issCameraState(), light = cv._issLightingState(), maps = new Map();
  const oldBead = object => object._issParentId && object.geometry?.type === 'SphereGeometry' && object.geometry.parameters.radius === .075 && object.material?.type === 'MeshBasicMaterial';
  const newPart = object => object.name.startsWith('iss-destiny-window-');
  function fingerprint(array) {
    const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength); let value = 2166136261;
    for (const byte of bytes) value = Math.imul(value ^ byte, 16777619);
    return (value >>> 0).toString(16);
  }
  function texture(map) {
    if (!map) return null;
    if (maps.has(map.uuid)) return maps.get(map.uuid);
    const image = map.image, result = { name: map.name, size: [image?.width, image?.height], wrap: [map.wrapS, map.wrapT], repeat: map.repeat.toArray(), encoding: map.encoding,
      pixels: image instanceof HTMLCanvasElement ? fingerprint(image.getContext('2d').getImageData(0, 0, image.width, image.height).data) : null };
    maps.set(map.uuid, result); return result;
  }
  function material(mat) {
    return { type: mat.type, color: mat.color?.getHex(), emissive: mat.emissive?.getHex(), roughness: mat.roughness, metalness: mat.metalness,
      opacity: mat.opacity, transparent: mat.transparent, depthWrite: mat.depthWrite, side: mat.side, map: texture(mat.map) };
  }
  const records = [], parts = [], protectedMaterials = new Set(); let meshCount = 0, oldBeads = 0;
  station.traverse(object => {
    if (!object.isMesh) return; meshCount++;
    if (oldBead(object)) { oldBeads++; return; }
    const geometry = object.geometry;
    if (newPart(object)) { parts.push(object); return; }
    // All station meshes, including unnamed hull collars, stay covered. Hidden
    // instructional overlays are included; no camera-facing sky sprites are.
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach(mat => protectedMaterials.add(mat.uuid));
    records.push({ name: object.name, parent: object._issParentId || null, id: object._issId || null, visitor: object._issVisitorId || null,
      geometry: { type: geometry.type, parameters: geometry.parameters || null, attributes: Object.fromEntries(Object.entries(geometry.attributes).map(([key, attr]) => [key, fingerprint(attr.array)])), index: geometry.index ? fingerprint(geometry.index.array) : null },
      position: object.position.toArray(), rotation: object.rotation.toArray(), scale: object.scale.toArray(), materials: materials.map(material), visible: object.visible });
  });
  const result = { meshCount, oldBeads, protected: records.map(value => JSON.stringify(value)).sort(),
    physics: { quaternion: state.stationQuaternion, ...Object.fromEntries(['phase', 'beta', 'incidence', 'generation', 'sunIntensity', 'earthSunIntensity', 'tracking', 'eclipse', 'playing', 'sun', 'wingNormal'].map(key => [key, light[key]])) },
    data: structuredClone(window.__toolData.spaceStation), camera: state, frames: observed.frames };
  if (!parts.length) return result;
  const bounds = new THREE.Box3(); parts.forEach(part => bounds.expandByObject(part));
  const center = bounds.getCenter(new THREE.Vector3()), points = [];
  for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) points.push(new THREE.Vector3(x, y, z).project(camera).toArray());
  const pane = parts.find(part => part.name === 'iss-destiny-window-pane'), paneBox = new THREE.Box3().setFromObject(pane), panePoints = [];
  for (const x of [paneBox.min.x, paneBox.max.x]) for (const y of [paneBox.min.y, paneBox.max.y]) for (const z of [paneBox.min.z, paneBox.max.z]) panePoints.push(new THREE.Vector3(x, y, z).project(camera));
  const normal = new THREE.Vector3(0, 0, 1).transformDirection(pane.matrixWorld), toward = camera.position.clone().sub(center).normalize();
  result.window = { parts: parts.map(part => ({ name: part.name, parent: part._issParentId, type: part.material.type, materialId: part.material.uuid,
    color: part.material.color.getHex(), emissive: part.material.emissive.getHex(), map: !!part.material.map, opacity: part.material.opacity, depthWrite: part.material.depthWrite,
    center: new THREE.Box3().setFromObject(part).getCenter(new THREE.Vector3()).toArray(), finite: Array.from(part.geometry.getAttribute('position').array).every(Number.isFinite), triangles: (part.geometry.index?.count || part.geometry.getAttribute('position').count) / 3 })),
    normal: normal.toArray(), center: center.toArray(), radius: bounds.getBoundingSphere(new THREE.Sphere()).radius, fov: camera.fov, aspect: camera.aspect,
    projected: points, camera: state, oldBeads, sharesProtectedMaterial: parts.some(part => protectedMaterials.has(part.material.uuid)), frontDot: normal.dot(toward),
    panePixels: { width: (Math.max(...panePoints.map(p => p.x)) - Math.min(...panePoints.map(p => p.x))) * cv.clientWidth / 2,
      height: (Math.max(...panePoints.map(p => p.y)) - Math.min(...panePoints.map(p => p.y))) * cv.clientHeight / 2 } };
  return result;
}

function readCleanup() {
  window.__destroy();
  window.__windowQA.mounts.forEach(mount => { mount.closed = true; });
  return window.__windowQA.mounts.map((mount, index, mounts) => ({ frames: mount.frames, lost: mount.gl.isContextLost(), resources: Object.keys(mount.resources).length,
    windowResources: Object.values(mount.resources).filter(resource => resource.owners.some(name => name.startsWith('iss-destiny-window-'))).length,
    windowResourceIds: Object.entries(mount.resources).filter(([, resource]) => resource.owners.some(name => name.startsWith('iss-destiny-window-'))).map(([id, resource]) => ({ id, ...resource })),
    reusedResources: Object.entries(mount.resources).filter(([id]) => mounts.slice(0, index).some(previous => previous.resources[id])).map(([id, resource]) => ({ id, ...resource })),
    bad: Object.values(mount.resources).filter(resource => resource.disposals !== 1) }));
}

async function runMount(browser, base, source, width, baseline = null) {
  const result = { width, kind: baseline ? 'candidate' : 'baseline', checks: {}, screenshots: [], errors: [] };
  const page = await browser.newPage({ viewport: { width, height: width < 500 ? 844 : 1080 }, isMobile: width < 500, hasTouch: width < 500, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000); page.on('pageerror', error => result.errors.push(error.stack || error.message));
  await page.route('**/stem_lab/stem_tool_spacestation.js', route => route.fulfill({ body: source, contentType: 'text/javascript' }));
  await page.route('**/vendor/three-r128/three.min.js', async route => {
    const response = await route.fetch(); assert(response.ok());
    await route.fulfill({ response, body: (await response.text()) + '\n;(' + installObserver.toString() + ')();' });
  });
  const canvas = page.locator('.iss-station-stage canvas'), study = page.locator('[data-iss-window-study]'), inspect = page.locator('[data-iss-window-inspect]');
  const activate = locator => width < 500 ? locator.tap() : locator.click();
  const wait = async () => {
    await page.waitForFunction(() => window.__windowQA?.draw?.frames > 1 && document.querySelector('.iss-station-stage canvas')?._issCameraState && !document.querySelector('.iss-station-stage canvas')._issCameraState().tweening);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  };
  const saved = () => page.evaluate(() => structuredClone(window.__toolData.spaceStation));
  const read = () => page.evaluate(readScene);
  const select = async id => { await activate(page.locator('.iss-module-picker').getByRole('button', { name: new RegExp('^' + id + '$', 'i') })); await page.waitForFunction(id => window.__toolData.spaceStation.selModule === id, id); await wait(); };
  const capture = async (locator, name) => {
    const filename = `window-${name}-${width}.png`;
    const clip = await locator.evaluate(node => { const b = node.getBoundingClientRect(); return { x: b.x + scrollX, y: b.y + scrollY, width: b.width, height: b.height }; });
    await page.screenshot({ path: path.join(output, filename), clip, fullPage: true, animations: 'disabled' }); result.screenshots.push(filename);
  };
  const verifyRemount = async () => {
    const remountSeed = await saved(); remountSeed.mapCutaway = false;
    result.cleanup = await page.evaluate(readCleanup); verifyCleanup(result.cleanup);
    assert.equal(result.cleanup[0].windowResources, 6, 'Three new geometries and three private materials dispose');
    await page.evaluate(seed => window.__mount(seed), remountSeed); await wait(); await study.waitFor(); await activate(inspect); await wait();
    verifyWindow((await read()).window, true); result.checks.remount = true;
    result.finalCleanup = await page.evaluate(readCleanup); verifyCleanup(result.finalCleanup);
    result.finalCleanup.forEach(mount => assert.equal(mount.windowResources, 6));
    const ids = result.finalCleanup.flatMap(mount => mount.windowResourceIds.map(resource => resource.id));
    assert.equal(ids.length, 12); assert.equal(new Set(ids).size, 12, 'Every window geometry and material is unique to its mount');
    // Library ArrowHelper caches one line geometry and one cone geometry. All
    // source-owned window resources remain private and are never in this list.
    const reused = result.finalCleanup[1].reusedResources;
    assert.deepEqual(reused.map(resource => resource.kind).sort(), ['BufferGeometry', 'CylinderGeometry']);
    assert(reused.every(resource => resource.owners.length && resource.owners.every(name => !name.startsWith('iss-destiny-window-'))));
    assert(reused.every(resource => resource.ownerTypes.includes('ArrowHelper')), 'Repeated IDs are the library ArrowHelper line/cone geometries');
    result.checks.sharedArrowGeometry = reused;
    result.hostErrors = await page.evaluate(() => window.__events.errors); assert.deepEqual(result.errors, []); assert.deepEqual(result.hostErrors, []);
  };
  try {
    await page.goto(base + '/?tab=map'); await wait();
    await page.evaluate(() => {
      document.querySelector('.iss-station-stage canvas')._issSetLighting({ playing: false });
      window.__setToolData(previous => ({ ...previous, spaceStation: { ...previous.spaceStation, opsOrbitMinute: 37.12345, opsWaterDay: 12.5, opsPressureMinute: 7.25,
        opsPrediction: 'Keep the working prediction', opsLog: ['Keep the notebook note'], opsTrials: [{ id: 71, label: 'Preserved trial', setup: { opsBattery: 65 }, results: { batteryMin: 42 }, prediction: 'Stored prediction', reflection: 'Stored reflection' }],
        opsTrialSelected: 71, opsTrialCompare: 'current', opsTrajectoryOpen: true, opsTrajectoryMetric: 'cmg', opsTrajectoryMinute: 40 } }));
    });
    await page.waitForFunction(() => window.__toolData.spaceStation.opsOrbitMinute === 37.12345);
    await select('destiny'); await activate(page.locator('[data-iss-lighting-preset="noon"]')); await wait();
    const initial = await read(); result.initial = initial;
    if (!baseline) {
      assert.equal(initial.oldBeads, 11); result.cleanup = await page.evaluate(readCleanup); verifyCleanup(result.cleanup);
      result.hostErrors = await page.evaluate(() => window.__events.errors); assert.deepEqual(result.errors, []); assert.deepEqual(result.hostErrors, []);
      result.passed = true; console.log(`Window baseline ${width}px: ${initial.meshCount} station meshes, protected scene recorded`); return result;
    }
    verifyProtected(baseline.initial, initial); verifyWindow(initial.window);
    result.checks.protectedBaseline = { meshesBefore: baseline.initial.meshCount, meshesAfter: initial.meshCount, protectedCount: initial.protected.length, hash: hash(JSON.stringify(initial.protected)) };
    await study.waitFor(); assert.match(await study.innerText(), /WORF|Window Observational Research Facility/);
    const links = await study.locator('a').evaluateAll(nodes => nodes.map(a => ({ url: a.href, target: a.target, rel: a.rel })));
    assert(links.length > 0); for (const link of links) { const url = new URL(link.url); assert.equal(url.protocol, 'https:'); assert(/(^|\.)nasa\.gov$/.test(url.hostname)); assert.equal(link.target, '_blank'); assert(link.rel.split(/\s+/).includes('noopener')); }
    const beforeFit = await saved(); await inspect.focus(); await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('.iss-station-stage canvas')._issCameraState().focusId === 'window'); await wait();
    let scene = await read(); verifyWindow(scene.window, true); assert.deepEqual(await saved(), beforeFit); assert.deepEqual(scene.physics, initial.physics);
    assert(await canvas.evaluate(node => document.activeElement === node), 'Native inspection moves keyboard focus to the canvas');
    assert(await page.locator('[data-iss-window-caption]').isVisible()); result.checks.fit = scene.window;
    await capture(study, 'science'); await capture(page.locator('.iss-station-stage'), 'day');
    console.log(`Window ${width}px: protected scene, actual close fit and daylight capture passed`);
    if (process.argv.includes('--cleanup-only')) {
      await verifyRemount(); result.passed = true;
      console.log(`Window ${width}px: twelve unique window resources and shared ArrowHelper identities verified across two clean mounts`); return result;
    }

    // Native resize retains the actual tiny target, rather than fitting a hull.
    const resizedWidth = width < 500 ? 320 : 960;
    await page.setViewportSize({ width: resizedWidth, height: width < 500 ? 844 : 1080 }); await wait();
    await page.waitForFunction(w => document.documentElement.clientWidth === w, resizedWidth);
    scene = await read(); verifyWindow(scene.window, true); result.checks.resize = scene.window;
    await page.setViewportSize({ width, height: width < 500 ? 844 : 1080 }); await wait();
    await page.addScriptTag({ path: path.join(ROOT, 'desktop/web-app/node_modules/axe-core/axe.min.js') });
    result.checks.axe = await page.evaluate(async () => {
      const checked = await axe.run({ include: ['[data-iss-window-study]', '[data-iss-component-guide]', '[data-iss-window-caption]'] }, { rules: { region: { enabled: false } } });
      return { passes: checked.passes.length, violations: checked.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) };
    }); assert.deepEqual(result.checks.axe.violations, []);
    result.checks.layout = await study.evaluate(node => ({ document: document.documentElement.scrollWidth - innerWidth, panel: node.scrollWidth - node.clientWidth,
      overflow: Array.from(node.querySelectorAll('p,h3,h4,a,button')).filter(n => n.scrollWidth > n.clientWidth + 1).map(n => n.textContent) }));
    assert(result.checks.layout.document <= 1 && result.checks.layout.panel <= 1); assert.deepEqual(result.checks.layout.overflow, []);

    // A native pane click must select Destiny even after another module is selected.
    await select('columbus'); assert.equal(await study.count(), 0);
    await canvas.scrollIntoViewIfNeeded();
    const point = await page.evaluate(() => {
      const draw = window.__windowQA.draw, pane = draw.scene.getObjectByName('iss-destiny-window-pane'), cv = document.querySelector('.iss-station-stage canvas');
      const projected = new THREE.Box3().setFromObject(pane).getCenter(new THREE.Vector3()).project(draw.camera), b = cv.getBoundingClientRect();
      const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2(projected.x, projected.y), draw.camera);
      const meshes = []; draw.scene.traverse(object => { if (object.isMesh && (object._issId || object._issParentId || object._issVisitorId)) { let p = object; while (p && p.visible) p = p.parent; if (!p) meshes.push(object); } });
      const hit = ray.intersectObjects(meshes, false)[0];
      return { x: b.left + (projected.x + 1) * b.width / 2, y: b.top + (1 - projected.y) * b.height / 2, hit: hit?.object.name, parent: hit?.object._issParentId };
    });
    assert.equal(point.hit, 'iss-destiny-window-pane'); assert.equal(point.parent, 'destiny');
    if (width < 500) await page.touchscreen.tap(point.x, point.y); else await page.mouse.click(point.x, point.y);
    await page.waitForFunction(() => window.__toolData.spaceStation.selModule === 'destiny'); await wait(); result.checks.nativePanePick = point;
    assert.deepEqual(independent(await saved()), independent(beforeFit));

    // Cutaway alters only the owning module's details; restoring removes ghosts.
    await activate(page.locator('[data-iss-cutaway]')); await wait();
    scene = await read(); scene.window.parts.forEach(part => { near(part.opacity, 1); assert(part.depthWrite); });
    result.checks.cutawaySelected = scene.window.parts;
    await select('columbus'); scene = await read(); scene.window.parts.forEach(part => { near(part.opacity, 1); assert(part.depthWrite); });
    result.checks.cutawayFocusedWindow = scene.window.parts;
    await canvas.scrollIntoViewIfNeeded(); await canvas.focus(); await page.keyboard.press('Home'); await wait();
    scene = await read(); scene.window.parts.forEach(part => { near(part.opacity, .05); assert.equal(part.depthWrite, false); });
    result.checks.cutawayOther = scene.window.parts;
    await activate(page.locator('[data-iss-cutaway]')); await select('destiny'); scene = await read(); scene.window.parts.forEach(part => near(part.opacity, 1));
    await activate(inspect); await wait();
    const beforePan = await saved(), physics = (await read()).physics;
    await canvas.scrollIntoViewIfNeeded(); await canvas.focus(); await page.keyboard.press('Shift+ArrowRight'); await wait();
    scene = await read(); assert(scene.camera.panned); assert.equal(scene.camera.focusId, null); assert.equal(scene.camera.fit, null);
    assert.equal(await page.locator('[data-iss-window-caption]').isVisible(), false); assert.deepEqual(await saved(), beforePan); assert.deepEqual(scene.physics, physics);
    await page.keyboard.press('Home'); await wait(); scene = await read(); assert(!scene.camera.panned); assert.equal(scene.camera.focusId, null);
    await activate(inspect); await wait(); verifyWindow((await read()).window, true);
    await canvas.focus(); await page.keyboard.press('ArrowLeft'); await wait(); assert.deepEqual(await saved(), beforePan); assert.deepEqual((await read()).physics, physics);
    await activate(inspect); await wait(); await canvas.focus();
    const orbitEye = [];
    for (const key of ['ArrowUp', 'ArrowDown']) for (let step = 1; step <= 30; step++) {
      await page.keyboard.press(key);
      const eye = await page.evaluate(() => {
        const draw = window.__windowQA.draw, pane = draw.scene.getObjectByName('iss-destiny-window-pane');
        const center = new THREE.Box3().setFromObject(pane).getCenter(new THREE.Vector3()), normal = new THREE.Vector3(0, 0, 1).transformDirection(pane.matrixWorld);
        const camera = document.querySelector('.iss-station-stage canvas')._issCameraState();
        return { focusId: camera.focusId, position: camera.position, signedDistance: new THREE.Vector3(...camera.position).sub(center).dot(normal) };
      });
      verifyExteriorEye(eye); orbitEye.push({ key, step, ...eye });
    }
    result.checks.exteriorOrbit = orbitEye;
    assert.deepEqual(await saved(), beforePan); assert.deepEqual((await read()).physics, physics);
    await activate(inspect); await wait(); result.checks.keyboardPanReset = true;

    await activate(page.locator('[data-iss-lighting-preset="midnight"]')); await wait();
    scene = await read(); assert(scene.physics.eclipse); verifyWindow(scene.window, true);
    assert(scene.physics.sunIntensity < initial.physics.sunIntensity); scene.window.parts.forEach(part => assert.equal(part.emissive, 0));
    await capture(page.locator('.iss-station-stage'), 'eclipse'); result.checks.eclipse = { window: scene.window, physics: scene.physics };
    console.log(`Window ${width}px: resize, native pick, cutaway, keyboard, axe and eclipse passed`);
    assert.deepEqual(independent(await saved()), independent(beforeFit));
    await verifyRemount();
    result.passed = true; console.log(`Destiny window ${width}px: native fit/pick, resize, cutaway, keyboard, axe, daylight/eclipse and disposal passed`); return result;
  } catch (error) {
    result.failure = error.stack || error.message; result.passed = false;
    result.lastScene = await read().catch(() => null);
    await page.screenshot({ path: path.join(output, `window-failure-${width}.png`), fullPage: true }).catch(() => {});
    error.qaResult = result; throw error;
  } finally {
    await page.evaluate(() => window.__destroy?.()).catch(() => {}); await page.close();
  }
}

function selftest() {
  const value = { parts: ['rim', 'gasket', 'pane'].map(name => ({ name: 'iss-destiny-window-' + name, parent: 'destiny', type: 'MeshStandardMaterial', emissive: 0, map: false, finite: true, triangles: 32, center: [0, -.6, -1.2], materialId: name })),
    sharesProtectedMaterial: false, oldBeads: 0, normal: [0, -1, 0], center: [0, -.6, -1.2], radius: .167, fov: 46, aspect: 2, projected: [[-.2, -.2, .1], [.2, .2, .1]], panePixels: { width: 40, height: 40 }, frontDot: 1,
    camera: { focusId: 'window', fit: 'window', tweening: false, minDistance: .55, distance: .55, fitRadius: .167, target: [0, -.6, -1.2], fitCenter: [0, -.6, -1.2] } };
  verifyWindow(value, true);
  const mutants = [v => { v.parts.pop(); }, v => { v.parts[0].emissive = 1; }, v => { v.parts[0].center[1] = -.5; }, v => { v.normal = [0, 1, 0]; }, v => { v.sharesProtectedMaterial = true; }, v => { v.projected[0][0] = 1.2; }, v => { v.panePixels.width = 2; }, v => { v.camera.target[0] = 3; }, v => { v.oldBeads = 1; }];
  for (const change of mutants) { const mutant = structuredClone(value); change(mutant); assert.throws(() => verifyWindow(mutant, true)); }
  const before = { oldBeads: 11, meshCount: 100, protected: ['hull'], physics: { phase: 0 }, data: { note: 'keep' } }, after = { ...structuredClone(before), oldBeads: 0, meshCount: 92 };
  verifyProtected(before, after);
  for (const change of [v => { v.meshCount = 93; }, v => { v.protected[0] = 'changed hull'; }, v => { v.physics.phase = 1; }, v => { v.data.note = ''; }]) { const mutant = structuredClone(after); change(mutant); assert.throws(() => verifyProtected(before, mutant)); }
  verifyCleanup([{ lost: true, frames: 3, resources: 6, bad: [] }]); assert.throws(() => verifyCleanup([{ lost: true, frames: 3, resources: 6, bad: [{ disposals: 0 }] }]));
  verifyExteriorEye({ focusId: 'window', signedDistance: .08, position: [0, -1, 0] });
  for (const signedDistance of [0, -.2]) assert.throws(() => verifyExteriorEye({ focusId: 'window', signedDistance, position: [0, 0, 0] }));
  console.log(`Window QA selftest: ${mutants.length + 7} mutants rejected (geometry, light, fit, protected scene, saved state, exterior camera and disposal).`);
}

async function main() {
  assert(output.startsWith(ROOT + path.sep)); assert(widths.length && widths.every(width => Number.isInteger(width) && width >= 320));
  const sourcePath = path.join(ROOT, 'stem_lab/stem_tool_spacestation.js'), source = await fs.readFile(sourcePath, 'utf8');
  assert(source.includes('data-iss-window-inspect'), 'Wait for the window implementation before running');
  const baselinePath = path.resolve(ROOT, argument('--baseline', '.tmp/space-station-destiny-window-01a185d3/source-before.js'));
  const before = await fs.readFile(baselinePath, 'utf8'); assert(!before.includes('data-iss-window-inspect'));
  await fs.mkdir(output, { recursive: true });
  const report = { sourceSha256: hash(source), baselineSha256: hash(before), driverSha256: hash(await fs.readFile(__filename)), started: new Date().toISOString(), results: [] };
  const reuseReport = argument('--reuse-report', '');
  const prior = reuseReport ? JSON.parse(await fs.readFile(path.resolve(ROOT, reuseReport), 'utf8')) : null;
  // Only the original baseline is reused, never a previous candidate result.
  // Its served bytes are pinned independently from any later product revision.
  if (prior) assert.equal(prior.baselineSha256, report.baselineSha256);
  const preview = await createPreview(); let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    for (const width of widths) {
      try {
        const baseline = prior ? prior.results.find(result => result.kind === 'baseline' && result.width === width && result.passed) : await runMount(browser, preview.base, before, width);
        assert(baseline, 'This exact source has a passing baseline for the requested width');
        if (prior) report.reusedBaseline = path.resolve(ROOT, reuseReport); else report.results.push(baseline);
        report.results.push(await runMount(browser, preview.base, source, width, baseline));
      } catch (error) { report.results.push(error.qaResult || { width, passed: false, failure: error.stack }); throw error; }
      finally { await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(report, null, 2)); }
    }
  } finally {
    report.finished = new Date().toISOString(); report.sourceUnchanged = hash(await fs.readFile(sourcePath, 'utf8')) === report.sourceSha256;
    await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(report, null, 2));
    if (browser) await browser.close(); await new Promise(resolve => preview.server.close(resolve));
  }
  assert(report.sourceUnchanged, 'Source stayed fixed during this native run');
}

if (require.main === module) {
  if (process.argv.includes('--selftest')) selftest();
  else main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
}
module.exports = { verifyWindow, verifyProtected, verifyCleanup, verifyExteriorEye, selftest };
