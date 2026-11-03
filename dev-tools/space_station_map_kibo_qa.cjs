#!/usr/bin/env node
'use strict';
// Native Kibo Exposed Facility geometry, selection, environment study and resource checks.
// --selftest; --visual-only --widths=1440; --stop --out=<owned native directory>
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');
const { createPreview } = require('./space_station_enhancement_qa.cjs');
const ROOT = path.resolve(__dirname, '..');
const argument = (name, fallback) => process.argv.find(value => value.startsWith(name + '='))?.slice(name.length + 1) || fallback;
const output = path.resolve(ROOT, argument('--out', '.tmp/space-station-kibo-ef-01a185d3/native-01'));
const widths = argument('--widths', '1440,390').split(',').map(Number);
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const near = (a, b, tolerance = 1e-6) => assert(Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tolerance, `${a} != ${b}`);
const vectorNear = (a, b, tolerance) => { assert.equal(a.length, b.length); a.forEach((value, i) => near(value, b[i], tolerance)); };
const independent = data => Object.fromEntries(Object.entries(data).filter(([key]) => !['selModule', 'seenModules', 'mapCutaway'].includes(key)));
const stableCamera = value => Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'renderCount'));


function verifyFacility(v, fitted = false) {
  assert(v); assert.equal(v.name, 'iss-kibo-exposed-facility'); assert.equal(v.parent, 'kibo'); assert.equal(v.scienceId, 'kibo-ef'); assert.equal(v.moduleId, null);
  vectorNear(v.position, [-2.775, -.20, -3.4]); vectorNear(v.rotation.slice(0, 3), [0, 0, 0]);
  assert(v.finite && v.normalsUnit && v.triangles > 0); assert(v.vertexColors && v.colorCount >= 3); assert(!v.sharesMaterial && !v.sharesGeometry);
  assert.equal(v.material.type, 'MeshStandardMaterial'); assert.equal(v.material.map, null); assert.equal(v.material.emissive, 0); near(v.material.roughness, .5); near(v.material.metalness, .3);
  assert.equal(v.metadata.kind, 'kibo-ef'); assert.equal(v.metadata.illustrative, true); assert(v.metadata.components.length > 5);
  let cursor = 0; const names = new Set(); for (const c of v.metadata.components) { assert(c.name && !names.has(c.name)); names.add(c.name); assert.equal(c.start, cursor); assert(Number.isInteger(c.count) && c.count > 0 && c.count % 3 === 0); cursor += c.count; } assert.equal(cursor, v.triangles * 3);
  assert.deepEqual(v.metadata.interfaces.map(i => i.id).sort(), Array.from({ length: 6 }, (_, i) => 'interface-' + (i + 1)));
  assert(v.metadata.interfaces.every(i => i.position.length === 3 && i.position.every(Number.isFinite) && Math.abs(i.position[2]) <= .531));
  vectorNear(v.metadata.attachmentPoint, [.295, .20, 0]); vectorNear(v.attachmentPoint, [-2.48, 0, -3.4]);
  const lo = [-3.001, -.341, -3.951], hi = [-2.479, .161, -2.849]; v.modelBounds[0].forEach((x, i) => assert(x >= lo[i] && x < hi[i])); v.modelBounds[1].forEach((x, i) => assert(x <= hi[i] && x > lo[i]));
  assert(v.modelBounds[1][2] - v.modelBounds[0][2] > 1 && v.modelBounds[1][1] - v.modelBounds[0][1] > .35); vectorNear(v.normal, [-1, 0, 0]);
  if (fitted) {
    assert.equal(v.camera.fit, 'kibo-ef'); assert.equal(v.camera.focusId, 'kibo-ef'); assert(!v.camera.tweening); near(v.camera.minDistance, 1); near(v.camera.maxDistance, 3.6);
    assert(v.camera.distance >= 1 - 1e-6 && v.camera.distance <= 3.6 + 1e-6); assert(v.camera.position[1] >= -3.8 - 1e-6); vectorNear(v.camera.target, v.center); vectorNear(v.camera.fitCenter, v.center); near(v.camera.fitRadius, v.radius);
    assert(v.outwardDot >= .08 * v.camera.distance - 1e-6); assert(v.projected.every(p => p.every(Number.isFinite) && Math.abs(p[0]) < .99 && Math.abs(p[1]) < .99 && p[2] > -1 && p[2] < 1));
    assert(v.pixels.width > 65 && v.pixels.height > 65, 'Actual facility vertices occupy a readable viewport area');
  }
}
function verifyProtected(before, after) {
  assert.equal(after.meshCount, before.meshCount + 1); assert.equal(after.materialCount, before.materialCount + 1); assert.equal(after.geometryCount, before.geometryCount + 1); assert.equal(after.textureCount, before.textureCount);
  assert.deepEqual(after.protected, before.protected, 'Every existing mesh geometry, material, texture, pose and visibility remains exact');
  assert.deepEqual(after.physics, before.physics); assert.deepEqual(after.arm, before.arm); assert.deepEqual(after.data, before.data); assert.deepEqual(after.xp, before.xp);
}
function verifyManualFit(v) {
  assert.equal(v.camera.fit, null); assert.equal(v.camera.focusId, 'kibo-ef'); near(v.camera.minDistance, 1); near(v.camera.maxDistance, 3.6);
  assert(v.camera.distance >= 1 - 1e-6 && v.camera.distance <= 3.6 + 1e-6); assert(v.camera.position[1] >= -3.8 - 1e-6); assert(v.outwardDot >= .08 * v.camera.distance - 1e-6); vectorNear(v.camera.target, v.center);
}
function verifyStudy(v, selected) {
  assert.equal(v.selected, selected); assert.deepEqual(v.zones.map(z => z.id).sort(), ['airlock', 'inside', 'outside']); assert(v.zones.every(z => z.visible));
  assert.deepEqual(v.zones.filter(z => z.selected).map(z => z.id), [selected]); assert.deepEqual(v.pressed, ['inside', 'airlock', 'outside'].map(id => id === selected));
  const active = v.zones.find(z => z.selected), others = v.zones.filter(z => !z.selected); assert(active.fill && others.every(z => z.fill !== active.fill && z.stroke !== active.stroke));
  assert(v.description.trim().length > 35 && v.descriptionVisible && v.descriptionFont >= 12);
}
function verifyCleanup(mounts, candidate) {
  assert(mounts.length); for (const m of mounts) { assert(m.lost && m.frames > 0 && m.resources > 0); assert.deepEqual(m.bad, []); if (candidate) { assert.equal(m.kiboResources.length, 2); assert(m.kiboResources.every(r => r.owners.length === 1)); } }
  if (candidate) { const ids = mounts.flatMap(m => m.kiboResources.map(r => r.id)); assert.equal(new Set(ids).size, ids.length); }
  if (mounts.length > 1) { assert.deepEqual(mounts[1].reused.map(r => r.kind).sort(), ['BufferGeometry', 'CylinderGeometry']); assert(mounts[1].reused.every(r => r.ownerTypes.includes('ArrowHelper'))); }
}
function verifyPrivateRuns(results) {
  const mounts = results.filter(r => r.kind === 'candidate').flatMap(r => r.finalCleanup || r.cleanup), ids = mounts.flatMap(m => m.kiboResources.map(r => r.id));
  assert(mounts.length > 0 && ids.length === mounts.length * 2); assert.equal(new Set(ids).size, ids.length, 'Facility geometry/material are fresh across every viewport and remount'); return { mounts: mounts.length, resourceIds: ids };
}
function installObserver() {
  const Original = THREE.WebGLRenderer; window.__kiboQA = { mounts: [], draw: null };
  function ObservedRenderer(options) {
    const renderer = new Original(options), render = renderer.render;
    const mount = { gl: renderer.getContext(), resources: {}, frames: 0, scene: null, camera: null }; window.__kiboQA.mounts.push(mount);
    function track(resource, owner, ownerType) {
      if (!resource) return; const existing = mount.resources[resource.uuid];
      if (existing) { if (owner && !existing.owners.includes(owner)) existing.owners.push(owner); if (ownerType && !existing.ownerTypes.includes(ownerType)) existing.ownerTypes.push(ownerType); return; }
      const entry = mount.resources[resource.uuid] = { name: resource.name || '', kind: resource.type, owners: owner ? [owner] : [], ownerTypes: ownerType ? [ownerType] : [], disposals: 0 };
      resource.addEventListener('dispose', () => { if (!mount.closed) entry.disposals++; });
    }
    renderer.render = function (scene, camera) {
      const answer = render.apply(this, arguments);
      scene.traverse(object => { const owner = object.name || object.parent?.name || ''; track(object.geometry, owner, object.parent?.type);
        for (const mat of (Array.isArray(object.material) ? object.material : [object.material])) { if (!mat) continue; track(mat, owner, object.parent?.type); for (const value of Object.values(mat)) if (value?.isTexture) track(value, owner, object.parent?.type); }
      });
      if (scene.name === 'iss-station-inspection') { mount.scene = scene; mount.camera = camera; mount.frames++; window.__kiboQA.draw = mount; }
      return answer;
    }; return renderer;
  }
  ObservedRenderer.prototype = Original.prototype; Object.setPrototypeOf(ObservedRenderer, Original); THREE.WebGLRenderer = ObservedRenderer;
}


function readScene() {
  const draw = window.__kiboQA.draw, cv = document.querySelector('.iss-station-stage canvas'), scene = draw.scene, camera = draw.camera;
  const station = scene.getObjectByName('iss-inspected-station'), state = cv._issCameraState(), light = cv._issLightingState(), arm = cv._issArmState(), maps = new Map();
  station.updateWorldMatrix(true, true); camera.updateMatrixWorld(true);
  const fingerprint = array => { const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength); let value = 2166136261; for (const byte of bytes) value = Math.imul(value ^ byte, 16777619); return (value >>> 0).toString(16); };
  function texture(map) { if (!map) return null; if (maps.has(map.uuid)) return maps.get(map.uuid); const image = map.image, v = { name: map.name, size: [image?.width, image?.height], wrap: [map.wrapS, map.wrapT], repeat: map.repeat.toArray(), encoding: map.encoding, pixels: image instanceof HTMLCanvasElement ? fingerprint(image.getContext('2d').getImageData(0, 0, image.width, image.height).data) : null }; maps.set(map.uuid, v); return v; }
  const material = mat => ({ type: mat.type, color: mat.color?.getHex(), emissive: mat.emissive?.getHex(), roughness: mat.roughness, metalness: mat.metalness, opacity: mat.opacity, transparent: mat.transparent, depthWrite: mat.depthWrite, side: mat.side, map: texture(mat.map) });
  const records = [], materials = new Set(), geometries = new Set(), protectedMaterials = new Set(), protectedGeometries = new Set(); let meshCount = 0, facility;
  station.traverse(o => { if (!o.isMesh) return; meshCount++; const g = o.geometry, mats = Array.isArray(o.material) ? o.material : [o.material]; geometries.add(g.uuid); mats.forEach(m => { materials.add(m.uuid); material(m); });
    if (o.name === 'iss-kibo-exposed-facility') { facility = o; return; } mats.forEach(m => protectedMaterials.add(m.uuid)); protectedGeometries.add(g.uuid);
    records.push({ name: o.name, parent: o._issParentId || null, id: o._issId || null, visitor: o._issVisitorId || null, scienceId: o._issScienceId || null,
      geometry: { type: g.type, parameters: g.parameters || null, attributes: Object.fromEntries(Object.entries(g.attributes).map(([key, attr]) => [key, fingerprint(attr.array)])), index: g.index ? fingerprint(g.index.array) : null },
      position: o.position.toArray(), rotation: o.rotation.toArray(), scale: o.scale.toArray(), materials: mats.map(material), visible: o.visible });
  });
  const result = { meshCount, materialCount: materials.size, geometryCount: geometries.size, textureCount: maps.size, protected: records.map(r => JSON.stringify(r)).sort(),
    physics: { stationQuaternion: state.stationQuaternion, ...Object.fromEntries(['phase', 'beta', 'arrayAlpha', 'arrayFeather', 'actualAlphaRate', 'actualFeatherRate', 'driveElapsed', 'commandAlpha', 'commandFeather', 'motorRate', 'motorAcceleration', 'incidence', 'generation', 'rate', 'tracking', 'motorEnabled', 'motorSmooth', 'motorBraking', 'eclipse', 'playing', 'sun', 'wingNormal', 'sunIntensity'].map(k => [k, light[k]])) },
    arm: Object.fromEntries(['enabled', 'guides', 'actual', 'target', 'pose', 'base', 'elapsed', 'tipError'].map(k => [k, arm[k]])), data: structuredClone(window.__toolData.spaceStation), xp: window.__kiboXP.slice(), camera: state, facility: null };
  if (!facility) return result;
  const g = facility.geometry, pos = g.getAttribute('position'), colors = g.getAttribute('color'), normals = g.getAttribute('normal'), unique = new Set(), points = []; let normalsUnit = true;
  for (let i = 0; i < pos.count; i++) { points.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(facility.matrixWorld).project(camera).toArray()); if (colors) unique.add([colors.getX(i), colors.getY(i), colors.getZ(i)].join(',')); if (!normals || Math.abs(Math.hypot(normals.getX(i), normals.getY(i), normals.getZ(i)) - 1) > 1e-5) normalsUnit = false; }
  const bounds = new THREE.Box3().setFromObject(facility), center = bounds.getCenter(new THREE.Vector3()), normal = new THREE.Vector3(-1, 0, 0).applyQuaternion(facility.getWorldQuaternion(new THREE.Quaternion())); g.computeBoundingBox();
  result.facility = { name: facility.name, parent: facility._issParentId, scienceId: facility._issScienceId, moduleId: facility._issId || null, material: material(facility.material), materialId: facility.material.uuid, geometryId: g.uuid,
    sharesMaterial: protectedMaterials.has(facility.material.uuid), sharesGeometry: protectedGeometries.has(g.uuid), position: facility.position.toArray(), rotation: facility.rotation.toArray(), vertexColors: !!facility.material.vertexColors, colorCount: unique.size,
    finite: Array.from(pos.array).every(Number.isFinite), normalsUnit, triangles: (g.index?.count || pos.count) / 3, metadata: structuredClone(g.userData), modelBounds: [g.boundingBox.min.clone().add(facility.position).toArray(), g.boundingBox.max.clone().add(facility.position).toArray()],
    attachmentPoint: new THREE.Vector3().fromArray(g.userData.attachmentPoint || []).applyMatrix4(facility.matrixWorld).toArray(), normal: normal.toArray(), center: center.toArray(), radius: bounds.getBoundingSphere(new THREE.Sphere()).radius,
    outwardDot: camera.position.clone().sub(center).dot(normal), projected: [0, 1, 2].flatMap(axis => [points.reduce((best, p) => p[axis] < best[axis] ? p : best), points.reduce((best, p) => p[axis] > best[axis] ? p : best)]),
    pixels: { width: (Math.max(...points.map(p => p[0])) - Math.min(...points.map(p => p[0]))) * cv.clientWidth / 2, height: (Math.max(...points.map(p => p[1])) - Math.min(...points.map(p => p[1]))) * cv.clientHeight / 2 }, camera: state };
  return result;
}
function readStudy() {
  const root = document.querySelector('[data-iss-kibo-study]'), desc = root.querySelector('[data-iss-kibo-description]');
  const visible = n => !!n && getComputedStyle(n).display !== 'none' && getComputedStyle(n).visibility !== 'hidden' && n.getBoundingClientRect().width > 0;
  return { selected: root.getAttribute('data-iss-kibo-study'), zones: Array.from(root.querySelectorAll('[data-iss-kibo-zone]'), n => { const rect = n.querySelector('rect'); return { id: n.getAttribute('data-iss-kibo-zone'), selected: n.getAttribute('data-selected') === 'true', visible: visible(n), fill: getComputedStyle(rect).fill, stroke: getComputedStyle(rect).stroke }; }),
    routes: Array.from(root.querySelectorAll('svg path'), n => ({ d: n.getAttribute('d'), dashed: n.getAttribute('stroke-dasharray') })),
    pressed: ['inside', 'airlock', 'outside'].map(id => root.querySelector('[data-iss-kibo-environment="' + id + '"]').getAttribute('aria-pressed') === 'true'), description: desc.textContent, descriptionVisible: visible(desc), descriptionFont: parseFloat(getComputedStyle(desc).fontSize) };
}
function readCleanup() {
  window.__destroy(); window.__kiboQA.mounts.forEach(m => { m.closed = true; });
  return window.__kiboQA.mounts.map((m, i, all) => ({ frames: m.frames, lost: m.gl.isContextLost(), resources: Object.keys(m.resources).length,
    kiboResources: Object.entries(m.resources).filter(([, r]) => r.owners.includes('iss-kibo-exposed-facility')).map(([id, r]) => ({ id, ...r })),
    reused: Object.entries(m.resources).filter(([id]) => all.slice(0, i).some(previous => previous.resources[id])).map(([id, r]) => ({ id, ...r })), bad: Object.values(m.resources).filter(r => r.disposals !== 1) }));
}
function readPickPoint(science) {
  const draw = window.__kiboQA.draw, cv = document.querySelector('.iss-station-stage canvas'), mesh = science ? draw.scene.getObjectByName('iss-kibo-exposed-facility') : (() => { let found; draw.scene.traverse(o => { if (o.isMesh && o._issId === 'kibo') found = o; }); return found; })();
  if (!mesh) return null; const pickers = []; draw.scene.traverse(o => { if (o.isMesh && (o._issId || o._issParentId || o._issVisitorId || o._issScienceId)) { let a = o; while (a && a.visible) a = a.parent; if (!a) pickers.push(o); } });
  const bounds = new THREE.Box3().setFromObject(mesh), candidates = [bounds.getCenter(new THREE.Vector3())], pos = mesh.geometry.getAttribute('position'), idx = mesh.geometry.index, count = idx?.count || pos.count;
  for (let i = 0; i < count; i += 3 * Math.max(1, Math.floor(count / 240))) { const p = new THREE.Vector3(); for (let j = 0; j < 3; j++) p.add(new THREE.Vector3().fromBufferAttribute(pos, idx ? idx.getX(i + j) : i + j)); candidates.push(p.multiplyScalar(1 / 3).applyMatrix4(mesh.matrixWorld)); }
  const box = cv.getBoundingClientRect(), ray = new THREE.Raycaster();
  for (const v of candidates) { const p = v.project(draw.camera); if (Math.abs(p.x) > .9 || Math.abs(p.y) > .7 || p.z < -1 || p.z > 1) continue; ray.setFromCamera(new THREE.Vector2(p.x, p.y), draw.camera); const hit = ray.intersectObjects(pickers, false)[0]; if (hit?.object !== mesh) continue; return { x: box.left + (p.x + 1) * box.width / 2, y: box.top + (1 - p.y) * box.height / 2, hit: hit.object.name, id: hit.object._issId || null, scienceId: hit.object._issScienceId || null }; }
  return null;
}

async function runMount(browser, base, source, width, baseline = null) {
  const result = { width, kind: baseline ? 'candidate' : 'baseline', checks: {}, screenshots: [], errors: [] }, height = width < 500 ? 844 : 1080;
  const page = await browser.newPage({ viewport: { width, height }, isMobile: width < 500, hasTouch: width < 500, deviceScaleFactor: 1, reducedMotion: 'reduce' }); page.setDefaultTimeout(30000); page.on('pageerror', error => result.errors.push(error.stack || error.message));
  await page.addInitScript(() => { window.__kiboXP = []; });
  await page.route(base + '/?*', async route => { const response = await route.fetch(), html = await response.text(); assert.equal(html.split('awardXP: noop').length - 1, 1); await route.fulfill({ response, body: html.replace('awardXP: noop', 'awardXP: function(value) { window.__kiboXP.push(value); }') }); });
  await page.route('**/stem_lab/stem_tool_spacestation.js', route => route.fulfill({ body: source, contentType: 'text/javascript' }));
  await page.route('**/vendor/three-r128/three.min.js', async route => { const response = await route.fetch(); assert(response.ok()); await route.fulfill({ response, body: (await response.text()) + '\n;(' + installObserver.toString() + ')();' }); });
  const canvas = page.locator('.iss-station-stage canvas'), stage = page.locator('.iss-station-stage'), study = page.locator('[data-iss-kibo-study]'), fit = page.locator('[data-iss-camera-fit="kibo-ef"]'), caption = page.locator('[data-iss-kibo-caption]');
  const activate = locator => width < 500 ? locator.tap() : locator.click();
  const wait = async () => { await page.waitForFunction(() => window.__kiboQA?.draw?.frames > 1 && document.querySelector('.iss-station-stage canvas')?._issCameraState && !document.querySelector('.iss-station-stage canvas')._issCameraState().tweening); await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); };
  const read = () => page.evaluate(readScene), choose = () => page.locator('#iss-component-topic').selectOption('kibo'), state = s => ({ physics: s.physics, arm: s.arm, data: s.data, xp: s.xp });
  const select = async id => { await activate(page.locator('.iss-module-picker').getByRole('button', { name: new RegExp('^' + id + '$', 'i') })); await page.waitForFunction(id => window.__toolData.spaceStation.selModule === id, id); await wait(); };
  const capture = async (locator, label) => { await locator.scrollIntoViewIfNeeded(); await wait(); const name = 'kibo-' + label + '-' + width + '.png', clip = await locator.evaluate(n => { const r = n.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height }; }), session = await page.context().newCDPSession(page); try { const shot = await session.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: true, clip: { ...clip, scale: 1 } }); await fs.writeFile(path.join(output, name), Buffer.from(shot.data, 'base64')); result.screenshots.push(name); } finally { await session.detach(); } };
  try {
    await page.goto(base + '/?tab=map'); await wait();
    await page.evaluate(() => { document.querySelector('.iss-station-stage canvas')._issSetLighting({ playing: false }); window.__setToolData(p => ({ ...p, spaceStation: { ...p.spaceStation, opsOrbitMinute: 37.12345, opsWaterDay: 12.5, opsPressureMinute: 7.25, opsPrediction: 'Preserve prediction', opsLog: ['Preserve notebook note'], opsTrials: [{ id: 71, label: 'Saved trial', setup: { opsBattery: 65 }, results: { batteryMin: 42 }, prediction: 'Saved prediction', reflection: 'Saved explanation' }], cupolaTarget: 'aurora', cupolaCaptured: true, cupolaShutters: false, cupolaObservation: 'Preserve my observation', interiorNotes: { kibo: 'Preserve Kibo interior note' } } })); });
    await page.waitForFunction(() => window.__toolData.spaceStation.opsOrbitMinute === 37.12345); await choose(); await activate(page.locator('[data-iss-lighting-preset="noon"]')); await wait(); result.initial = await read();
    if (!baseline) { assert.equal(result.initial.facility, null); result.cleanup = await page.evaluate(readCleanup); verifyCleanup(result.cleanup, false); result.hostErrors = await page.evaluate(() => window.__events.errors); assert.deepEqual(result.errors, []); assert.deepEqual(result.hostErrors, []); result.passed = true; console.log('Kibo baseline ' + width + 'px captured'); return result; }
    verifyProtected(baseline.initial, result.initial); verifyFacility(result.initial.facility); result.checks.protected = { beforeMeshes: baseline.initial.meshCount, afterMeshes: result.initial.meshCount, geometryDelta: result.initial.geometryCount - baseline.initial.geometryCount, materialDelta: result.initial.materialCount - baseline.initial.materialCount, textureDelta: result.initial.textureCount - baseline.initial.textureCount, protectedCount: result.initial.protected.length, hash: hash(JSON.stringify(result.initial.protected)) };
    const beforeFit = state(result.initial); await fit.focus(); await page.keyboard.press('Enter'); await wait(); let scene = await read(); verifyFacility(scene.facility, true); assert.deepEqual(state(scene), beforeFit); assert(await caption.isVisible()); result.checks.fit = scene.facility;
    const targetStatus = page.locator('[data-iss-camera-target]'); assert.equal(await targetStatus.getAttribute('role'), 'status'); result.checks.targetName = await targetStatus.innerText(); assert(/Kibo Exposed Facility/i.test(result.checks.targetName));
    await capture(study, 'study'); await select('zarya'); await activate(fit); await wait(); verifyFacility((await read()).facility, true); await capture(stage, 'day'); await select('kibo'); await activate(fit); await wait(); console.log('Kibo ' + width + 'px first native close view ready');
    if (process.argv.includes('--visual-only')) { result.visualOnly = true; result.cleanup = await page.evaluate(readCleanup); verifyCleanup(result.cleanup, true); result.passed = true; return result; }
    const studyBefore = await read(); result.checks.environments = [];
    for (const environment of ['inside', 'airlock', 'outside']) { const button = study.locator('[data-iss-kibo-environment="' + environment + '"]'); await button.focus(); await page.keyboard.press(environment === 'airlock' ? 'Space' : 'Enter'); const v = await page.evaluate(readStudy); verifyStudy(v, environment); result.checks.environments.push(v); const after = await read(); assert.deepEqual(state(after), state(studyBefore)); assert.deepEqual(after.protected, studyBefore.protected); assert.deepEqual(stableCamera(after.camera), stableCamera(studyBefore.camera)); assert.equal(after.facility.geometryId, studyBefore.facility.geometryId); assert.deepEqual(after.facility.material, studyBefore.facility.material); }
    assert.equal(new Set(result.checks.environments.map(v => v.description)).size, 3);
    const routes = result.checks.environments[0].routes; assert(routes.length >= 3 && routes.some(p => p.dashed) && routes.some(p => !p.dashed)); result.checks.environments.forEach(v => assert.deepEqual(v.routes, routes, 'Only region highlights change; equipment and service routes remain schematic'));
    const text = await study.innerText(); assert(/2009/.test(text) && /airlock/i.test(text) && /power/i.test(text) && /data/i.test(text) && /cool/i.test(text));
    result.checks.links = await study.locator('a').evaluateAll(nodes => nodes.map(a => ({ href: a.href, target: a.target, rel: a.rel }))); assert(result.checks.links.length >= 2); result.checks.links.forEach(link => { const u = new URL(link.href); assert.equal(u.protocol, 'https:'); assert(/(^|\.)(nasa\.gov|jaxa\.jp)$/.test(u.hostname)); assert.equal(link.target, '_blank'); assert(link.rel.split(/\s+/).includes('noopener')); });
    await page.addScriptTag({ path: path.join(ROOT, 'desktop/web-app/node_modules/axe-core/axe.min.js') }); result.checks.axe = await page.evaluate(async () => { const r = await axe.run({ include: ['[data-iss-kibo-study]', '[data-iss-component-guide]', '[data-iss-kibo-caption]'] }, { rules: { region: { enabled: false } } }); return { passes: r.passes.length, violations: r.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) }; }); assert.deepEqual(result.checks.axe.violations, []);
    result.checks.layout = await study.evaluate(n => ({ document: document.documentElement.scrollWidth - innerWidth, panel: n.scrollWidth - n.clientWidth, overflow: Array.from(n.querySelectorAll('p,h3,h4,button')).filter(x => x.scrollWidth > x.clientWidth + 1).map(x => x.textContent), fonts: Array.from(n.querySelectorAll('p')).map(x => parseFloat(getComputedStyle(x).fontSize)) })); assert(result.checks.layout.document <= 1 && result.checks.layout.panel <= 1); assert.deepEqual(result.checks.layout.overflow, []); assert(result.checks.layout.fonts.every(n => n >= 12));
    await page.setViewportSize({ width: width < 500 ? 320 : 960, height }); await wait(); verifyFacility((await read()).facility, true); await page.setViewportSize({ width, height }); await wait(); result.checks.resize = true;
    await canvas.scrollIntoViewIfNeeded(); await canvas.focus();
    const beforeOrbit = state(await read()); for (let i = 0; i < 12; i++) await page.keyboard.press('-'); await wait(); near((await read()).camera.distance, 3.6);
    // Exact former-floor reproduction through the public action hook, separate from native keys below.
    await canvas.evaluate(cv => { const s = cv._issCameraState(), d = s.position.map((v, i) => v - s.target[i]), r = Math.hypot(...d); cv._issCameraOrbit(-Math.PI / 2 - Math.atan2(d[0], d[2]), Math.PI / 2 - Math.acos(d[1] / r)); cv._issCameraOrbit(Math.PI, Math.PI / 2); });
    await wait(); scene = await read(); verifyManualFit(scene.facility); assert.deepEqual(state(scene), beforeOrbit); result.checks.publicHookFloorReproduction = scene.camera;
    for (const [key, count] of [['ArrowUp', 30], ['ArrowDown', 30], ['ArrowRight', 26], ['ArrowDown', 18]]) { for (let i = 0; i < count; i++) await page.keyboard.press(key); await wait(); scene = await read(); verifyManualFit(scene.facility); assert.deepEqual(state(scene), beforeOrbit); }
    result.checks.outwardOrbitAtMaximum = (await read()).camera; await activate(fit); await wait(); await canvas.focus(); const beforeZoom = state(await read()); await page.keyboard.press('-'); await wait(); scene = await read(); verifyManualFit(scene.facility); assert(await caption.isVisible()); assert.deepEqual(state(scene), beforeZoom); result.checks.zoomTargetName = await targetStatus.innerText(); assert(/Kibo Exposed Facility/i.test(result.checks.zoomTargetName));
    const manual = scene.camera; await page.setViewportSize({ width: width < 500 ? 320 : 960, height }); await wait(); scene = await read(); verifyManualFit(scene.facility); vectorNear(scene.camera.position, manual.position); vectorNear(scene.camera.target, manual.target); await page.setViewportSize({ width, height }); await wait(); result.checks.manualZoomResize = true;
    result.checks.exits = []; for (const key of ['Shift+ArrowRight', 'Home', 'f']) { await activate(fit); await wait(); const before = state(await read()); await canvas.focus(); await page.keyboard.press(key); await wait(); scene = await read(); assert.notEqual(scene.camera.focusId, 'kibo-ef'); assert.equal(await caption.isVisible(), false); assert.deepEqual(state(scene), before); result.checks.exits.push(key); }
    await activate(fit); await wait(); const beforeGeneric = state(await read()); await activate(page.locator('[data-iss-focus-module="kibo"]')); await wait(); scene = await read(); assert.equal(scene.camera.focusId, 'kibo'); assert(scene.camera.minDistance >= 1.6); assert.equal(await caption.isVisible(), false); assert.deepEqual(state(scene), beforeGeneric); result.checks.genericKiboFocus = true;
    // A genuine hull hit still selects/discovers Kibo. Choose only a visibly exposed triangle.
    await select('destiny'); await page.evaluate(() => window.__setToolData(p => { const seen = { ...p.spaceStation.seenModules }; delete seen.kibo; return { ...p, spaceStation: { ...p.spaceStation, seenModules: seen } }; })); await page.waitForFunction(() => !window.__toolData.spaceStation.seenModules.kibo); await canvas.scrollIntoViewIfNeeded(); await canvas.focus();
    let hullPoint; for (let i = 0; i < 16; i++) { hullPoint = await page.evaluate(readPickPoint, false); if (hullPoint) break; await page.keyboard.press('ArrowRight'); await wait(); } assert(hullPoint, 'A visible original Kibo hull triangle is available'); const beforeHull = state(await read());
    if (width < 500) await page.touchscreen.tap(hullPoint.x, hullPoint.y); else await page.mouse.click(hullPoint.x, hullPoint.y); await page.waitForFunction(() => window.__toolData.spaceStation.selModule === 'kibo'); await wait(); scene = await read(); assert(scene.data.seenModules.kibo); assert.deepEqual(independent(scene.data), independent(beforeHull.data)); assert.deepEqual(scene.physics, beforeHull.physics); assert.deepEqual(scene.arm, beforeHull.arm); assert.deepEqual(scene.xp, beforeHull.xp.concat(1)); result.checks.nativeHullPick = hullPoint;
    // Science picking frames the facility without any discovery, selection or saved-state writes.
    await select('destiny'); await activate(fit); await wait(); await canvas.scrollIntoViewIfNeeded(); await canvas.focus(); await page.keyboard.press('Shift+ArrowRight'); await wait(); assert.equal(await caption.isVisible(), false); const beforePick = state(await read()), point = await page.evaluate(readPickPoint, true); assert(point && point.scienceId === 'kibo-ef');
    if (width >= 500) { await page.mouse.move(point.x, point.y); await page.waitForFunction(() => { const n = document.querySelector('[data-iss-hover-name]'); return document.querySelector('.iss-station-stage canvas')._issHoverId === 'kibo-ef' && /Kibo|Exposed Facility/i.test(n?.textContent || '') && Number(getComputedStyle(n).opacity) > .9; }); result.checks.hover = await page.locator('[data-iss-hover-name]').innerText(); }
    if (width < 500) await page.touchscreen.tap(point.x, point.y); else await page.mouse.click(point.x, point.y); await wait(); scene = await read(); verifyFacility(scene.facility, true); assert.deepEqual(state(scene), beforePick); assert.equal(scene.data.selModule, 'destiny'); result.checks.nativeSciencePick = point;
    if (width >= 500) assert.equal(await page.locator('[data-iss-hover-name]').evaluate(n => Number(getComputedStyle(n).opacity)), 0);
    await activate(page.locator('[data-iss-cutaway]')); await wait(); scene = await read(); near(scene.facility.material.opacity, 1); assert(scene.facility.material.depthWrite); assert.equal(scene.facility.material.emissive, 0); const beforeExit = state(scene);
    await canvas.focus(); await page.keyboard.press('Home'); await wait(); scene = await read(); near(scene.facility.material.opacity, .05); assert.equal(scene.facility.material.depthWrite, false); assert.deepEqual(state(scene), beforeExit); await select('kibo'); scene = await read(); near(scene.facility.material.opacity, 1); assert(scene.facility.material.depthWrite); result.checks.cutaway = true;
    await activate(page.locator('[data-iss-cutaway]')); await choose(); const beforeStudyFit = state(await read()); await activate(study.locator('[data-iss-kibo-inspect]')); await wait(); verifyFacility((await read()).facility, true); assert.deepEqual(state(await read()), beforeStudyFit); result.checks.studyInspect = true;
    await select('zarya'); await activate(fit); await activate(page.locator('[data-iss-lighting-preset="midnight"]')); await wait(); scene = await read(); verifyFacility(scene.facility, true); assert(scene.physics.eclipse); assert.equal(scene.facility.material.emissive, 0); await capture(stage, 'eclipse'); result.checks.eclipse = scene.facility;
    const seed = scene.data; result.cleanup = await page.evaluate(readCleanup); verifyCleanup(result.cleanup, true); await page.evaluate(seed => window.__mount(seed), seed); await wait(); await activate(fit); await wait(); verifyFacility((await read()).facility, true); result.finalCleanup = await page.evaluate(readCleanup); verifyCleanup(result.finalCleanup, true);
    result.hostErrors = await page.evaluate(() => window.__events.errors); assert.deepEqual(result.errors, []); assert.deepEqual(result.hostErrors, []); result.passed = true; console.log('Kibo ' + width + 'px native geometry, science picking, environment study, camera, axe and cleanup passed'); return result;
  } catch (error) { result.passed = false; result.failure = error.stack || error.message; result.lastScene = await read().catch(() => null); await capture(stage, 'failure').catch(() => {}); error.qaResult = result; throw error; }
  finally { await page.evaluate(() => window.__destroy?.()).catch(() => {}); await page.close().catch(() => {}); }
}
function ownedOutput(directory) { assert(path.resolve(directory).startsWith(path.join(ROOT, '.tmp/space-station-kibo-ef-01a185d3/native')), 'Only this QA owner’s native evidence directory is writable'); }
function verifyLaunch(record) {
  assert.equal(record.script, __filename); ownedOutput(record.output); assert(Number.isInteger(record.masterPid) && record.masterPid > 0);
  const base = new URL(record.base); assert.equal(base.protocol, 'http:'); assert.equal(base.hostname, '127.0.0.1'); assert(base.port);
  if (record.browserEndpoint) { const ws = new URL(record.browserEndpoint); assert.equal(ws.protocol, 'ws:'); assert(['127.0.0.1', 'localhost', '[::1]'].includes(ws.hostname)); assert(ws.port); }
}


function selftest() {
  const facility = { name: 'iss-kibo-exposed-facility', parent: 'kibo', scienceId: 'kibo-ef', moduleId: null, position: [-2.775, -.2, -3.4], rotation: [0, 0, 0, 'XYZ'], finite: true, normalsUnit: true, triangles: 12, vertexColors: true, colorCount: 4, sharesMaterial: false, sharesGeometry: false,
    material: { type: 'MeshStandardMaterial', map: null, emissive: 0, roughness: .5, metalness: .3 }, metadata: { kind: 'kibo-ef', illustrative: true, components: Array.from({ length: 6 }, (_, i) => ({ name: 'part-' + i, start: i * 6, count: 6 })), interfaces: Array.from({ length: 6 }, (_, i) => ({ id: 'interface-' + (i + 1), position: [0, 0, i % 2 ? .53 : -.53] })), attachmentPoint: [.295, .2, 0] }, attachmentPoint: [-2.48, 0, -3.4], modelBounds: [[-3, -.34, -3.95], [-2.48, .16, -2.85]], normal: [-1, 0, 0] };
  verifyFacility(facility); let count = 0; const reject = (sample, verify, mutations) => { for (const change of mutations) { const v = structuredClone(sample); change(v); assert.throws(() => verify(v)); count++; } };
  reject(facility, verifyFacility, [v => v.moduleId = 'kibo', v => v.scienceId = null, v => v.material.emissive = 1, v => v.material.map = 'texture', v => v.position[0] = 0, v => v.normalsUnit = false, v => v.metadata.illustrative = false, v => v.metadata.components[1].start++, v => v.metadata.interfaces.pop(), v => v.attachmentPoint[0] = -3, v => v.sharesMaterial = true, v => v.modelBounds[1][0] = -2]);
  const fitted = { ...structuredClone(facility), camera: { fit: 'kibo-ef', focusId: 'kibo-ef', tweening: false, minDistance: 1, maxDistance: 3.6, distance: 2, position: [-2, 0, 0], target: [0, 0, 0], fitCenter: [0, 0, 0], fitRadius: .5 }, center: [0, 0, 0], radius: .5, outwardDot: 1, projected: [[-.5, -.5, 0], [.5, .5, 0]], pixels: { width: 100, height: 100 } }; verifyFacility(fitted, true);
  reject(fitted, v => verifyFacility(v, true), [v => v.camera.target[0] = 1, v => v.outwardDot = -1, v => v.projected[0][0] = 2, v => v.camera.distance = 5]); const manual = structuredClone(fitted); manual.camera.fit = null; verifyManualFit(manual); reject(manual, verifyManualFit, [v => v.camera.focusId = 'kibo', v => v.outwardDot = -1, v => v.camera.position[1] = -4]);
  const before = { meshCount: 287, materialCount: 50, geometryCount: 100, textureCount: 20, protected: ['retained'], physics: { phase: 0 }, arm: { seconds: 0 }, data: { note: 'keep' }, xp: [] }, after = { ...structuredClone(before), meshCount: 288, materialCount: 51, geometryCount: 101 }; verifyProtected(before, after);
  reject(after, v => verifyProtected(before, v), [v => v.protected[0] = 'changed', v => v.data.note = '', v => v.xp.push(1), v => v.textureCount++, v => v.geometryCount++, v => v.physics.phase++, v => v.arm.seconds++]);
  const study = { selected: 'airlock', zones: ['inside', 'airlock', 'outside'].map(id => ({ id, selected: id === 'airlock', visible: true, fill: id === 'airlock' ? 'active' : 'idle', stroke: id === 'airlock' ? 'gold' : 'gray' })), pressed: [false, true, false], description: 'The airlock separates the pressurized cabin from the exposed environment.', descriptionVisible: true, descriptionFont: 12 }; verifyStudy(study, 'airlock'); reject(study, v => verifyStudy(v, 'airlock'), [v => v.zones.pop(), v => v.zones[1].selected = false, v => v.zones[0].visible = false, v => v.descriptionFont = 8, v => v.selected = 'inside', v => v.zones[1].fill = 'idle']);
  const clean = [{ lost: true, frames: 3, resources: 2, bad: [], kiboResources: [1, 2].map(id => ({ id, owners: ['own'] })) }]; verifyCleanup(clean, true); reject(clean, v => verifyCleanup(v, true), [v => v[0].bad.push({ disposals: 2 }), v => v[0].kiboResources[0].owners.push('other'), v => v[0].kiboResources[1].id = 1]);
  const across = [{ kind: 'candidate', cleanup: clean }, { kind: 'candidate', cleanup: [{ kiboResources: [{ id: 3 }, { id: 4 }] }] }]; verifyPrivateRuns(across); reject(across, verifyPrivateRuns, [v => v[1].cleanup[0].kiboResources[0].id = 1]);
  const launch = { script: __filename, output, masterPid: 1, base: 'http://127.0.0.1:1234', browserEndpoint: 'ws://localhost:2345/owned' }; for (const host of ['127.0.0.1', 'localhost', '[::1]']) verifyLaunch({ ...launch, browserEndpoint: 'ws://' + host + ':2345/owned' });
  reject(launch, verifyLaunch, [v => v.script = 'other', v => v.browserEndpoint = 'ws://example.com:2345/other', v => v.output = ROOT]); for (const host of ['[::2]', '192.168.1.1', '127.0.0.2', 'localhost.example.com']) { assert.throws(() => verifyLaunch({ ...launch, browserEndpoint: 'ws://' + host + ':2345/other' })); count++; }
  console.log('Kibo QA selftest: ' + count + ' geometry, framing, preservation, environment, cleanup and launch-ownership mutants rejected.');
}
async function workerMain() {
  ownedOutput(output); const base = argument('--base', ''); assert(base);
  const sourcePath = path.join(ROOT, 'stem_lab/stem_tool_spacestation.js'), source = await fs.readFile(sourcePath, 'utf8');
  assert(source.includes('function issKiboFacilityGeometry(') && source.includes('data-iss-kibo-study'), 'Wait for candidate readiness');
  const before = await fs.readFile(path.resolve(ROOT, argument('--baseline', '.tmp/space-station-kibo-ef-01a185d3/native-source-before.js')), 'utf8');
  assert.equal(hash(before), '06e60c641d98ab0b21698ec5a332d74978c5c90dcc4ed5015965c17c95717a85');
  const report = { sourceSha256: hash(source), baselineSha256: hash(before), driverSha256: hash(await fs.readFile(__filename)), workerPid: process.pid, started: new Date().toISOString(), results: [] };
  let browserServer, browser, cancelled = false, closing, finished = false;
  async function closeBrowser() {
    if (!browserServer) return;
    if (!closing) closing = (async () => { await browserServer.close(); const child = browserServer.process(); report.browserExit = { pid: child.pid, exitCode: child.exitCode, signalCode: child.signalCode, closed: child.exitCode !== null || child.signalCode !== null }; process.send?.({ type: 'browser-closed', ...report.browserExit }); })();
    await closing;
  }
  function stop() { if (cancelled || finished) return; cancelled = true; report.cancelled = true; closeBrowser().catch(error => { report.closeError = error.message; }); }
  process.on('message', message => { if (message?.type === 'stop') stop(); }); process.on('SIGINT', stop); process.on('SIGTERM', stop); process.on('disconnect', () => { if (!finished) stop(); });
  const timer = setInterval(() => fs.access(path.join(output, 'cancel-request.json')).then(stop, () => {}), 1000); timer.unref();
  const priorPath = argument('--reuse-report', ''), prior = priorPath ? JSON.parse(await fs.readFile(path.resolve(ROOT, priorPath), 'utf8')) : null; if (prior) assert.equal(prior.baselineSha256, report.baselineSha256);
  try {
    if (cancelled) throw new Error('Cancelled before browser launch');
    browserServer = await chromium.launchServer({ headless: true, handleSIGINT: false, handleSIGTERM: false, handleSIGHUP: false, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    const child = browserServer.process(); report.browserPid = child.pid; report.browserEndpoint = browserServer.wsEndpoint();
    const launch = { workerPid: process.pid, browserPid: child.pid, browserEndpoint: browserServer.wsEndpoint(), browserCommand: child.spawnargs, base, sourceSha256: report.sourceSha256, created: new Date().toISOString() };
    await fs.writeFile(path.join(output, 'worker-launch.json'), JSON.stringify(launch, null, 2)); console.log('Kibo browser launch ' + JSON.stringify(launch)); process.send?.({ type: 'browser-started', ...launch });
    if (cancelled) throw new Error('Cancelled during browser launch');
    browser = await chromium.connect(browserServer.wsEndpoint());
    for (const width of widths) {
      if (cancelled) throw new Error('Cancelled before next viewport');
      try {
        const reused = prior?.results.find(r => r.kind === 'baseline' && r.width === width && r.passed), baseline = reused || await runMount(browser, base, before, width);
        if (reused) report.reusedBaseline = path.resolve(ROOT, priorPath); else report.results.push(baseline);
        report.results.push(await runMount(browser, base, source, width, baseline));
      } catch (error) { report.results.push(error.qaResult || { width, passed: false, failure: error.stack || error.message }); throw error; }
      finally { await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(report, null, 2)); }
    }
    report.privateResources = verifyPrivateRuns(report.results);
  } catch (error) { report.failure = error.stack || error.message; process.exitCode = cancelled ? 130 : 1; console.error(report.failure); }
  finally {
    clearInterval(timer); if (browser) await browser.close().catch(() => {}); await closeBrowser().catch(error => { report.closeError = error.stack || error.message; process.exitCode = 1; });
    report.finished = new Date().toISOString(); report.cancelled = cancelled; report.sourceUnchanged = hash(await fs.readFile(sourcePath, 'utf8')) === report.sourceSha256;
    if (!report.sourceUnchanged) process.exitCode = 1;
    await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(report, null, 2));
    process.send?.({ type: 'worker-finished', cancelled, sourceUnchanged: report.sourceUnchanged, browserExit: report.browserExit });
    finished = true;
    if (process.connected) process.disconnect();
  }
}

async function supervise() {
  ownedOutput(output); assert(widths.length && widths.every(width => Number.isInteger(width) && width >= 320)); await fs.mkdir(output, { recursive: true });
  const launchPath = path.join(output, 'launch.json'); try { await fs.access(launchPath); throw new Error('Use a fresh native output directory; preserve earlier launch evidence'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const record = { script: __filename, output, masterPid: process.pid, started: new Date().toISOString(), phase: 'starting', childClosed: false, previewClosed: false };
  let preview, child, cancelled = false, saving = Promise.resolve(), timer;
  const save = () => { const text = JSON.stringify(record, null, 2); saving = saving.then(() => fs.writeFile(launchPath, text)); return saving; };
  const stop = () => { if (record.childClosed) return; if (!cancelled) { cancelled = true; record.cancelled = true; record.phase = 'stopping'; save(); } if (child?.connected) child.send({ type: 'stop' }); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop); await save(); console.log(`Kibo supervisor PID ${process.pid}`);
  try {
    preview = await createPreview(); record.base = preview.base; await save(); console.log(`Kibo owned preview ${preview.base}`);
    const args = process.argv.slice(2).filter(arg => arg !== '--worker' && !arg.startsWith('--base='));
    child = spawn(process.execPath, [__filename, '--worker', '--base=' + preview.base, ...args], { stdio: ['ignore', 'pipe', 'pipe', 'ipc'], windowsHide: true });
    record.childPid = child.pid; record.childCommand = child.spawnargs; record.phase = 'running'; await save(); console.log(`Kibo worker PID ${child.pid}`);
    const outputStream = require('node:fs').createWriteStream(path.join(output, 'stdout.txt')), errorStream = require('node:fs').createWriteStream(path.join(output, 'stderr.txt'));
    child.stdout.pipe(outputStream); child.stderr.pipe(errorStream); child.stdout.on('data', b => process.stdout.write(b)); child.stderr.on('data', b => process.stderr.write(b));
    child.on('message', message => {
      if (message.type === 'browser-started') { assert.equal(message.workerPid, child.pid); Object.assign(record, { browserPid: message.browserPid, browserEndpoint: message.browserEndpoint, sourceSha256: message.sourceSha256 }); }
      if (message.type === 'browser-closed') record.browserExit = message;
      if (message.type === 'worker-finished') record.workerFinished = message;
      save();
    });
    timer = setInterval(() => fs.access(path.join(output, 'cancel-request.json')).then(stop, () => {}), 1000); timer.unref(); if (cancelled) stop();
    const ended = await new Promise((resolve, reject) => { child.once('error', reject); child.once('close', (code, signal) => resolve({ code, signal })); });
    record.childExit = ended; record.childClosed = true; record.phase = cancelled ? 'cancelled' : ended.code === 0 ? 'complete' : 'failed';
    await Promise.all([new Promise(resolve => outputStream.end(resolve)), new Promise(resolve => errorStream.end(resolve))]); process.exitCode = ended.code === 0 && !cancelled ? 0 : ended.code || 1;
  } finally {
    if (timer) clearInterval(timer); if (preview) { await new Promise(resolve => preview.server.close(resolve)); record.previewClosed = true; }
    record.finished = new Date().toISOString(); await save(); await saving; console.log('Kibo final ownership receipt ' + JSON.stringify(record));
  }
}

async function requestStop() {
  ownedOutput(output); const launchPath = path.join(output, 'launch.json'), record = JSON.parse(await fs.readFile(launchPath, 'utf8')); verifyLaunch(record);
  if (record.childClosed && record.previewClosed) { console.log('Owned Kibo worker and preview were already closed.'); return; }
  await fs.writeFile(path.join(output, 'cancel-request.json'), JSON.stringify({ script: __filename, requested: new Date().toISOString(), masterPid: record.masterPid, childPid: record.childPid, browserPid: record.browserPid }, null, 2));
  console.log(`Requested graceful stop of recorded Kibo worker ${record.childPid}, browser ${record.browserPid}, preview ${record.base}`);
  for (let i = 0; i < 60; i++) {
    await new Promise(resolve => setTimeout(resolve, 500)); const latest = JSON.parse(await fs.readFile(launchPath, 'utf8'));
    if (latest.childClosed && latest.previewClosed) { console.log(JSON.stringify(latest)); return; }
  }
  throw new Error('Graceful stop requested but closure not yet confirmed; preserve receipt and do not infer cleanup');
}


if (require.main === module) {
  if (process.argv.includes('--selftest')) selftest();
  else (process.argv.includes('--stop') ? requestStop() : process.argv.includes('--worker') ? workerMain() : supervise()).catch(error => { console.error(error.stack || error); process.exitCode = 1; });
}
module.exports = { verifyFacility, verifyProtected, verifyManualFit, verifyStudy, verifyCleanup, verifyPrivateRuns, verifyLaunch, selftest };
