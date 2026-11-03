#!/usr/bin/env node
'use strict';
// Native Cupola geometry, selection, protection study and resource checks.
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
const output = path.resolve(ROOT, argument('--out', '.tmp/space-station-cupola-detail-01a185d3/native-01'));
const widths = argument('--widths', '1440,390').split(',').map(Number);
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const near = (a, b, tolerance = 1e-6) => assert(Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tolerance, `${a} != ${b}`);
const vectorNear = (a, b, tolerance) => { assert.equal(a.length, b.length); a.forEach((value, i) => near(value, b[i], tolerance)); };
const independent = data => Object.fromEntries(Object.entries(data).filter(([key]) => !['selModule', 'seenModules', 'mapCutaway'].includes(key)));
const stableCamera = value => Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'renderCount'));
const paneIds = ['side-1', 'side-2', 'side-3', 'side-4', 'side-5', 'side-6', 'nadir'];

function verifyCupola(value, fitted = false) {
  assert(value && value.frame && value.glazing);
  assert.equal(value.frame.name, 'iss-cupola-frame'); assert.equal(value.frame.id, 'cupola');
  assert.equal(value.glazing.name, 'iss-cupola-glazing'); assert.equal(value.glazing.parent, 'cupola');
  for (const part of [value.frame, value.glazing]) {
    vectorNear(part.position, [-1.2, -.75, .2]); vectorNear(part.rotation.slice(0, 3), [Math.PI, 0, 0]);
    assert(part.finite && part.triangles > 0 && part.maxRadius <= .420001); assert.equal(part.material.type, 'MeshStandardMaterial'); assert.equal(part.material.map, null);
    assert.equal(part.metadata.windowCount, 7); assert.equal(part.metadata.sideWindowCount, 6); assert(!part.sharesProtectedMaterial);
  }
  assert.equal(value.glazing.material.emissive, 0); assert.equal(value.glazing.material.side, 2); assert.equal(value.glazing.material.opacity, 1);
  assert.notEqual(value.frame.materialId, value.glazing.materialId); assert(value.frame.metadata.components.length > 0);
  assert.deepEqual(value.panes.map(p => p.id).sort(), paneIds.slice().sort());
  assert.equal(value.panes.filter(p => p.kind === 'trapezoid').length, 6); assert.equal(value.panes.filter(p => p.kind === 'circle').length, 1);
  value.panes.forEach(pane => { assert.equal(pane.firstHit, 'iss-cupola-glazing', `${pane.id} has a real open frame with glass behind it`); assert(pane.hitOwnRange); });
  vectorNear(value.normal, [0, -1, 0]); assert(value.coreVisibility.length > 0 && value.coreVisibility.every(v => !v), 'Normal view hides the existing interior core');
  if (fitted) {
    assert.equal(value.camera.fit, 'cupola'); assert.equal(value.camera.focusId, 'cupola'); assert(!value.camera.tweening);
    near(value.camera.minDistance, .72); near(value.camera.maxDistance, 2.6); assert(value.camera.distance >= .72 - 1e-6 && value.camera.distance <= 2.6 + 1e-6);
    vectorNear(value.camera.target, value.center); vectorNear(value.camera.fitCenter, value.center); near(value.camera.fitRadius, value.radius);
    assert(value.outwardDot >= .08 * value.camera.distance - 1e-6);
    assert(value.projected.every(point => point.every(Number.isFinite) && Math.abs(point[0]) < .99 && Math.abs(point[1]) < .99 && point[2] > -1 && point[2] < 1));
    assert(value.pixels.width > 70 && value.pixels.height > 70, 'Physical Cupola remains readable on a phone');
  }
}

function verifyProtected(before, after) {
  assert.equal(after.meshCount, before.meshCount + 1); assert.equal(after.materialCount, before.materialCount + 1); assert.equal(after.textureCount, before.textureCount - 1);
  assert.deepEqual(after.protected, before.protected, 'Every other station geometry/material/transform remains exact');
  assert.deepEqual(after.physics, before.physics); assert.deepEqual(after.data, before.data); assert.deepEqual(after.xp, before.xp);
}

function verifyCutaway(value, selected, macro = false) {
  const opacity = macro ? 1 : selected ? .26 : .1;
  for (const part of [value.frame, value.glazing]) { near(part.material.opacity, opacity); assert.equal(part.material.depthWrite, macro); }
  if (macro) { assert.equal(value.frame.material.emissive, 0); assert.equal(value.glazing.material.emissive, 0); }
  assert(value.coreVisibility.length > 0); assert(value.coreVisibility.every(visible => visible === (selected && !macro)));
}

function verifyManualMacro(value) {
  assert.equal(value.camera.fit, null); assert.equal(value.camera.focusId, 'cupola'); near(value.camera.minDistance, .72); near(value.camera.maxDistance, 2.6);
  assert(value.camera.distance >= .72 - 1e-6 && value.camera.distance <= 2.6 + 1e-6);
  assert(value.outwardDot >= .08 * value.camera.distance - 1e-6); vectorNear(value.camera.target, value.center);
}

function verifyStudy(value, layer) {
  assert.deepEqual(value.panes.map(p => p.id).sort(), ['scratch', 'pressure-inner', 'pressure-outer', 'debris'].sort());
  assert(value.panes.every(p => p.visible)); assert(value.shutter.visible);
  assert.deepEqual(value.pressed, ['scratch', 'pressure', 'debris', 'shutter'].map(id => id === layer));
  const expected = layer === 'pressure' ? ['pressure-inner', 'pressure-outer'] : layer === 'shutter' ? [] : [layer];
  assert.deepEqual(value.panes.filter(p => p.selected).map(p => p.id).sort(), expected.sort()); assert.equal(value.shutter.selected, layer === 'shutter');
  assert(value.description.trim().length > 35); assert(value.descriptionVisible && value.descriptionFont >= 12);
}

function verifyCleanup(mounts, candidate) {
  assert(mounts.length); mounts.forEach(mount => { assert(mount.lost && mount.frames > 0 && mount.resources > 0); assert.deepEqual(mount.bad, []); if (candidate) { assert.equal(mount.cupolaResources.length, 4); assert(mount.cupolaResources.every(r => r.owners.length === 1)); } });
  if (candidate) { const ids = mounts.flatMap(m => m.cupolaResources.map(r => r.id)); assert.equal(new Set(ids).size, ids.length, 'Cupola resources are private per mount'); }
  if (mounts.length > 1) { assert.deepEqual(mounts[1].reused.map(r => r.kind).sort(), ['BufferGeometry', 'CylinderGeometry']); assert(mounts[1].reused.every(r => r.ownerTypes.includes('ArrowHelper'))); }
}

function installObserver() {
  const Original = THREE.WebGLRenderer; window.__cupolaQA = { mounts: [], draw: null };
  function ObservedRenderer(options) {
    const renderer = new Original(options), render = renderer.render;
    const mount = { gl: renderer.getContext(), resources: {}, frames: 0, scene: null, camera: null }; window.__cupolaQA.mounts.push(mount);
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
      if (scene.name === 'iss-station-inspection') { mount.scene = scene; mount.camera = camera; mount.frames++; window.__cupolaQA.draw = mount; }
      return answer;
    }; return renderer;
  }
  ObservedRenderer.prototype = Original.prototype; Object.setPrototypeOf(ObservedRenderer, Original); THREE.WebGLRenderer = ObservedRenderer;
}

function readScene() {
  const draw = window.__cupolaQA.draw, cv = document.querySelector('.iss-station-stage canvas'), scene = draw.scene, camera = draw.camera;
  const station = scene.getObjectByName('iss-inspected-station'), state = cv._issCameraState(), light = cv._issLightingState(), maps = new Map();
  station.updateWorldMatrix(true, true); camera.updateMatrixWorld(true);
  const fingerprint = array => { const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength); let value = 2166136261; for (const byte of bytes) value = Math.imul(value ^ byte, 16777619); return (value >>> 0).toString(16); };
  function texture(map) {
    if (!map) return null; if (maps.has(map.uuid)) return maps.get(map.uuid);
    const image = map.image, value = { name: map.name, size: [image?.width, image?.height], wrap: [map.wrapS, map.wrapT], repeat: map.repeat.toArray(), encoding: map.encoding,
      pixels: image instanceof HTMLCanvasElement ? fingerprint(image.getContext('2d').getImageData(0, 0, image.width, image.height).data) : null }; maps.set(map.uuid, value); return value;
  }
  const material = mat => ({ type: mat.type, color: mat.color?.getHex(), emissive: mat.emissive?.getHex(), roughness: mat.roughness, metalness: mat.metalness,
    opacity: mat.opacity, transparent: mat.transparent, depthWrite: mat.depthWrite, side: mat.side, map: texture(mat.map) });
  const records = [], materials = new Set(), protectedMaterials = new Set(), cores = []; let meshCount = 0, frame, glazing;
  station.traverse(object => {
    if (!object.isMesh) return; meshCount++; const g = object.geometry, mats = Array.isArray(object.material) ? object.material : [object.material]; mats.forEach(m => { materials.add(m.uuid); material(m); });
    if (object._issId === 'cupola') { frame = object; return; }
    if (object.name === 'iss-cupola-glazing') { glazing = object; return; }
    if (object._issParentId === 'cupola' && object.geometry.type === 'SphereGeometry') cores.push(object);
    mats.forEach(m => protectedMaterials.add(m.uuid));
    records.push({ name: object.name, parent: object._issParentId || null, id: object._issId || null, visitor: object._issVisitorId || null,
      geometry: { type: g.type, parameters: g.parameters || null, attributes: Object.fromEntries(Object.entries(g.attributes).map(([key, attr]) => [key, fingerprint(attr.array)])), index: g.index ? fingerprint(g.index.array) : null },
      position: object.position.toArray(), rotation: object.rotation.toArray(), scale: object.scale.toArray(), materials: mats.map(material), visible: object.visible });
  });
  const result = { meshCount, materialCount: materials.size, textureCount: maps.size, protected: records.map(record => JSON.stringify(record)).sort(),
    physics: { stationQuaternion: state.stationQuaternion, ...Object.fromEntries(['phase', 'beta', 'arrayAlpha', 'arrayFeather', 'actualAlphaRate', 'actualFeatherRate', 'driveElapsed', 'commandAlpha', 'commandFeather', 'motorRate', 'motorAcceleration', 'incidence', 'generation', 'rate', 'tracking', 'motorEnabled', 'motorSmooth', 'motorBraking', 'eclipse', 'playing', 'sun', 'wingNormal', 'sunIntensity'].map(key => [key, light[key]])) },
    data: structuredClone(window.__toolData.spaceStation), xp: window.__cupolaXP.slice(), camera: state, cupola: null };
  if (!glazing) return result;
  const parts = [frame, glazing], bounds = new THREE.Box3(), points = [];
  function part(object) {
    bounds.expandByObject(object); const g = object.geometry, position = g.getAttribute('position'); let maxRadius = 0;
    for (let i = 0; i < position.count; i++) { const p = new THREE.Vector3().fromBufferAttribute(position, i); maxRadius = Math.max(maxRadius, p.length()); points.push(p.applyMatrix4(object.matrixWorld).project(camera).toArray()); }
    return { name: object.name, id: object._issId || null, parent: object._issParentId || null, material: material(object.material), materialId: object.material.uuid, geometryId: g.uuid,
      position: object.position.toArray(), rotation: object.rotation.toArray(), maxRadius, finite: Array.from(position.array).every(Number.isFinite), triangles: (g.index?.count || position.count) / 3,
      metadata: structuredClone(g.userData), sharesProtectedMaterial: protectedMaterials.has(object.material.uuid) };
  }
  const frameValue = part(frame), glassValue = part(glazing), center = bounds.getCenter(new THREE.Vector3()), normal = new THREE.Vector3(0, 1, 0).applyQuaternion(frame.getWorldQuaternion(new THREE.Quaternion()));
  const panes = (glazing.geometry.userData.panes || []).map(pane => {
    const center = new THREE.Vector3().fromArray(pane.center).applyMatrix4(glazing.matrixWorld), normal = new THREE.Vector3().fromArray(pane.normal).transformDirection(glazing.matrixWorld), ray = new THREE.Raycaster(center.clone().addScaledVector(normal, .5), normal.clone().negate());
    const hit = ray.intersectObjects(parts, false)[0];
    return { id: pane.id, kind: pane.kind, firstHit: hit?.object.name, hitOwnRange: !!hit && hit.faceIndex * 3 >= pane.start && hit.faceIndex * 3 < pane.start + pane.count, center: center.toArray(), normal: normal.toArray() };
  });
  result.cupola = { frame: frameValue, glazing: glassValue, panes, normal: normal.toArray(), center: center.toArray(), radius: bounds.getBoundingSphere(new THREE.Sphere()).radius,
    outwardDot: camera.position.clone().sub(center).dot(normal), projected: [0, 1, 2].flatMap(axis => [points.reduce((best, p) => p[axis] < best[axis] ? p : best), points.reduce((best, p) => p[axis] > best[axis] ? p : best)]),
    pixels: { width: (Math.max(...points.map(p => p[0])) - Math.min(...points.map(p => p[0]))) * cv.clientWidth / 2, height: (Math.max(...points.map(p => p[1])) - Math.min(...points.map(p => p[1]))) * cv.clientHeight / 2 },
    coreVisibility: cores.map(core => core.visible), camera: state };
  return result;
}

function readStudy() {
  const root = document.querySelector('[data-iss-cupola-study]'), desc = root.querySelector('[data-iss-cupola-description]');
  const visible = node => !!node && getComputedStyle(node).display !== 'none' && getComputedStyle(node).visibility !== 'hidden' && node.getBoundingClientRect().width > 0;
  const pane = (node, id) => ({ id, visible: visible(node), selected: node.getAttribute('data-selected') === 'true', opacity: node.getAttribute('opacity'), fill: node.getAttribute('fill') });
  return { panes: Array.from(root.querySelectorAll('[data-iss-cupola-pane]'), node => pane(node, node.getAttribute('data-iss-cupola-pane'))), shutter: pane(root.querySelector('[data-iss-cupola-shutter]'), 'shutter'),
    pressed: ['scratch', 'pressure', 'debris', 'shutter'].map(id => root.querySelector('[data-iss-cupola-layer="' + id + '"]').getAttribute('aria-pressed') === 'true'),
    description: desc.textContent, descriptionVisible: visible(desc), descriptionFont: parseFloat(getComputedStyle(desc).fontSize) };
}

function readCleanup() {
  window.__destroy(); window.__cupolaQA.mounts.forEach(mount => { mount.closed = true; });
  return window.__cupolaQA.mounts.map((mount, index, mounts) => ({ frames: mount.frames, lost: mount.gl.isContextLost(), resources: Object.keys(mount.resources).length,
    cupolaResources: Object.entries(mount.resources).filter(([, r]) => r.owners.includes('iss-cupola-frame') || r.owners.includes('iss-cupola-glazing')).map(([id, r]) => ({ id, ...r })),
    reused: Object.entries(mount.resources).filter(([id]) => mounts.slice(0, index).some(previous => previous.resources[id])).map(([id, r]) => ({ id, ...r })), bad: Object.values(mount.resources).filter(r => r.disposals !== 1) }));
}

async function runMount(browser, base, source, width, baseline = null) {
  const result = { width, kind: baseline ? 'candidate' : 'baseline', checks: {}, screenshots: [], errors: [] }, height = width < 500 ? 844 : 1080;
  const page = await browser.newPage({ viewport: { width, height }, isMobile: width < 500, hasTouch: width < 500, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000); page.on('pageerror', error => result.errors.push(error.stack || error.message));
  await page.addInitScript(() => { window.__cupolaXP = []; });
  await page.route(base + '/?*', async route => { const response = await route.fetch(), html = await response.text(); assert.equal(html.split('awardXP: noop').length - 1, 1); await route.fulfill({ response, body: html.replace('awardXP: noop', 'awardXP: function(value) { window.__cupolaXP.push(value); }') }); });
  await page.route('**/stem_lab/stem_tool_spacestation.js', route => route.fulfill({ body: source, contentType: 'text/javascript' }));
  await page.route('**/vendor/three-r128/three.min.js', async route => { const response = await route.fetch(); assert(response.ok()); await route.fulfill({ response, body: (await response.text()) + '\n;(' + installObserver.toString() + ')();' }); });
  const canvas = page.locator('.iss-station-stage canvas'), stage = page.locator('.iss-station-stage'), study = page.locator('[data-iss-cupola-study]'), fit = page.locator('[data-iss-camera-fit="cupola"]');
  const activate = locator => width < 500 ? locator.tap() : locator.click();
  const wait = async () => { await page.waitForFunction(() => window.__cupolaQA?.draw?.frames > 1 && document.querySelector('.iss-station-stage canvas')?._issCameraState && !document.querySelector('.iss-station-stage canvas')._issCameraState().tweening); await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); };
  const read = () => page.evaluate(readScene), choose = () => page.locator('#iss-component-topic').selectOption('cupola');
  const state = scene => ({ physics: scene.physics, data: scene.data, xp: scene.xp });
  const capture = async (locator, label) => {
    await locator.scrollIntoViewIfNeeded(); await wait(); const filename = `cupola-${label}-${width}.png`;
    const clip = await locator.evaluate(node => { const r = node.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height }; });
    const session = await page.context().newCDPSession(page);
    try { const shot = await session.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: true, clip: { ...clip, scale: 1 } }); await fs.writeFile(path.join(output, filename), Buffer.from(shot.data, 'base64')); result.screenshots.push(filename); }
    finally { await session.detach(); }
  };
  const select = async id => { await activate(page.locator('.iss-module-picker').getByRole('button', { name: new RegExp('^' + id + '$', 'i') })); await page.waitForFunction(id => window.__toolData.spaceStation.selModule === id, id); await wait(); };
  try {
    await page.goto(base + '/?tab=map'); await wait();
    await page.evaluate(() => { document.querySelector('.iss-station-stage canvas')._issSetLighting({ playing: false }); window.__setToolData(previous => ({ ...previous, spaceStation: { ...previous.spaceStation,
      opsOrbitMinute: 37.12345, opsWaterDay: 12.5, opsPressureMinute: 7.25, opsPrediction: 'Preserve prediction', opsLog: ['Preserve notebook note'],
      opsTrials: [{ id: 71, label: 'Saved trial', setup: { opsBattery: 65 }, results: { batteryMin: 42 }, prediction: 'Saved prediction', reflection: 'Saved explanation' }],
      cupolaTarget: 'aurora', cupolaCaptured: true, cupolaShutters: false, cupolaObservation: 'Preserve my observation', interiorNotes: { cupola: 'Preserve interior note' } } })); });
    await page.waitForFunction(() => window.__toolData.spaceStation.opsOrbitMinute === 37.12345); await choose(); await activate(page.locator('[data-iss-lighting-preset="noon"]')); await wait(); result.initial = await read();
    if (!baseline) { assert.equal(result.initial.cupola, null); result.cleanup = await page.evaluate(readCleanup); verifyCleanup(result.cleanup, false); result.hostErrors = await page.evaluate(() => window.__events.errors); assert.deepEqual(result.errors, []); assert.deepEqual(result.hostErrors, []); result.passed = true; console.log(`Cupola baseline ${width}px captured`); return result; }
    verifyProtected(baseline.initial, result.initial); verifyCupola(result.initial.cupola);
    result.checks.protected = { beforeMeshes: baseline.initial.meshCount, afterMeshes: result.initial.meshCount, materialDelta: result.initial.materialCount - baseline.initial.materialCount, textureDelta: result.initial.textureCount - baseline.initial.textureCount, protectedCount: result.initial.protected.length, hash: hash(JSON.stringify(result.initial.protected)) };
    const beforeFit = state(result.initial); await fit.focus(); await page.keyboard.press('Enter'); await wait(); let scene = await read(); verifyCupola(scene.cupola, true); assert.deepEqual(state(scene), beforeFit);
    assert(await page.locator('[data-iss-cupola-caption]').isVisible()); result.checks.fit = scene.cupola;
    await capture(study, 'study');
    await select('zarya'); await activate(fit); await wait(); verifyCupola((await read()).cupola, true); await capture(stage, 'day');
    await select('cupola'); await activate(fit); await wait(); console.log(`Cupola ${width}px first native close view ready`);
    if (process.argv.includes('--visual-only')) { result.visualOnly = true; result.cleanup = await page.evaluate(readCleanup); verifyCleanup(result.cleanup, true); result.passed = true; return result; }

    const studyBefore = await read(); result.checks.layers = [];
    for (const layer of ['scratch', 'pressure', 'debris', 'shutter']) {
      const button = study.locator(`[data-iss-cupola-layer="${layer}"]`); await button.focus(); await page.keyboard.press(layer === 'pressure' ? 'Space' : 'Enter');
      const value = await page.evaluate(readStudy); verifyStudy(value, layer); result.checks.layers.push(value);
      const after = await read(); assert.deepEqual(state(after), state(studyBefore)); assert.deepEqual(after.protected, studyBefore.protected); assert.deepEqual(stableCamera(after.camera), stableCamera(studyBefore.camera));
      assert.equal(after.cupola.glazing.geometryId, studyBefore.cupola.glazing.geometryId); assert.deepEqual(after.cupola.glazing.material, studyBefore.cupola.glazing.material);
    }
    const text = await study.innerText(); assert(/2010/.test(text) && /pressure/i.test(text) && /shutter/i.test(text));
    result.checks.links = await study.locator('a').evaluateAll(nodes => nodes.map(a => ({ href: a.href, target: a.target, rel: a.rel })));
    assert(result.checks.links.length >= 2); result.checks.links.forEach(link => { const url = new URL(link.href); assert.equal(url.protocol, 'https:'); assert(/(^|\.)(nasa\.gov|esa\.int)$/.test(url.hostname)); assert.equal(link.target, '_blank'); assert(link.rel.split(/\s+/).includes('noopener')); });
    await page.addScriptTag({ path: path.join(ROOT, 'desktop/web-app/node_modules/axe-core/axe.min.js') });
    result.checks.axe = await page.evaluate(async () => { const checked = await axe.run({ include: ['[data-iss-cupola-study]', '[data-iss-component-guide]', '[data-iss-cupola-caption]'] }, { rules: { region: { enabled: false } } }); return { passes: checked.passes.length, violations: checked.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) }; });
    assert.deepEqual(result.checks.axe.violations, []);
    result.checks.layout = await study.evaluate(node => ({ document: document.documentElement.scrollWidth - innerWidth, panel: node.scrollWidth - node.clientWidth, overflow: Array.from(node.querySelectorAll('p,h3,h4,button')).filter(n => n.scrollWidth > n.clientWidth + 1).map(n => n.textContent), fonts: Array.from(node.querySelectorAll('p')).map(n => parseFloat(getComputedStyle(n).fontSize)) }));
    assert(result.checks.layout.document <= 1 && result.checks.layout.panel <= 1); assert.deepEqual(result.checks.layout.overflow, []); assert(result.checks.layout.fonts.every(size => size >= 12));
    await page.setViewportSize({ width: width < 500 ? 320 : 960, height }); await wait(); verifyCupola((await read()).cupola, true); await page.setViewportSize({ width, height }); await wait(); result.checks.resize = true;
    // Reach an exact same-distance macro/generic-focus transition through the real wheel handler.
    await canvas.scrollIntoViewIfNeeded(); await canvas.focus(); await canvas.hover();
    const beforeZoom = state(await read());
    for (let i = 0; i < 8; i++) {
      const distance = (await read()).camera.distance; if (Math.abs(distance - 2.4) < 1e-7) break;
      await page.mouse.wheel(0, Math.max(-300, Math.min(300, Math.log(2.4 / distance) / .0015)));
      await page.waitForFunction(previous => Math.abs(document.querySelector('.iss-station-stage canvas')._issCameraState().distance - previous) > 1e-9, distance); await wait();
    }
    const manuallyZoomed = await read(); verifyManualMacro(manuallyZoomed.cupola); near(manuallyZoomed.camera.distance, 2.4); assert(await page.locator('[data-iss-cupola-caption]').isVisible()); assert.deepEqual(state(manuallyZoomed), beforeZoom);
    await page.setViewportSize({ width: width < 500 ? 320 : 960, height }); await wait(); scene = await read(); verifyManualMacro(scene.cupola); near(scene.camera.distance, 2.4); vectorNear(scene.camera.position, manuallyZoomed.camera.position); vectorNear(scene.camera.target, manuallyZoomed.camera.target);
    await page.setViewportSize({ width, height }); await wait();
    await activate(page.locator('[data-iss-focus-module="cupola"]')); await wait(); scene = await read(); near(scene.camera.distance, 2.4); assert(scene.camera.minDistance >= 1.6); assert.equal(scene.camera.fit, null); assert.equal(await page.locator('[data-iss-cupola-caption]').isVisible(), false); assert.deepEqual(state(scene), beforeZoom);
    result.checks.sameDistanceZoomGenericExit = { before: manuallyZoomed.camera, after: scene.camera };
    await activate(fit); await wait();
    await canvas.scrollIntoViewIfNeeded(); await canvas.focus();
    for (const key of ['ArrowUp', 'ArrowDown']) { for (let i = 0; i < 30; i++) await page.keyboard.press(key); await wait(); verifyCupola((await read()).cupola, true); }
    result.checks.outwardOrbit = true;
    result.checks.exits = [];
    for (const key of ['Shift+ArrowRight', 'Home', 'f']) { await activate(fit); await wait(); const before = state(await read()); await canvas.focus(); await page.keyboard.press(key); await wait(); const after = await read(); assert.notEqual(after.camera.fit, 'cupola'); assert.equal(await page.locator('[data-iss-cupola-caption]').isVisible(), false); assert.deepEqual(state(after), before); result.checks.exits.push(key); }
    // Glazing is an ordinary Cupola hit, not a science/macro shortcut.
    await select('destiny');
    await page.evaluate(() => window.__setToolData(previous => { const seen = { ...previous.spaceStation.seenModules }; delete seen.cupola; return { ...previous, spaceStation: { ...previous.spaceStation, seenModules: seen } }; }));
    await page.waitForFunction(() => !window.__toolData.spaceStation.seenModules.cupola); const beforeOtherFit = state(await read());
    await activate(fit); await wait(); const beforePick = await read(); assert.deepEqual(state(beforePick), beforeOtherFit); assert.equal(beforePick.data.selModule, 'destiny'); assert(!beforePick.data.seenModules.cupola); await canvas.scrollIntoViewIfNeeded();
    const point = await page.evaluate(() => { const draw = window.__cupolaQA.draw, mesh = draw.scene.getObjectByName('iss-cupola-glazing'), pane = mesh.geometry.userData.panes.find(p => p.id === 'nadir'), cv = document.querySelector('.iss-station-stage canvas');
      const p = mesh.localToWorld(new THREE.Vector3().fromArray(pane.center)).project(draw.camera), b = cv.getBoundingClientRect(), ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2(p.x, p.y), draw.camera);
      const meshes = []; draw.scene.traverse(o => { if (o.isMesh && (o._issId || o._issParentId || o._issVisitorId || o._issScienceId)) { let a = o; while (a && a.visible) a = a.parent; if (!a) meshes.push(o); } });
      return { x: b.left + (p.x + 1) * b.width / 2, y: b.top + (1 - p.y) * b.height / 2, firstHit: ray.intersectObjects(meshes, false)[0]?.object.name }; });
    assert.equal(point.firstHit, 'iss-cupola-glazing');
    if (width < 500) await page.touchscreen.tap(point.x, point.y); else await page.mouse.click(point.x, point.y); await page.waitForFunction(() => window.__toolData.spaceStation.selModule === 'cupola'); await wait(); scene = await read();
    assert(scene.data.seenModules.cupola); assert.deepEqual(independent(scene.data), independent(beforePick.data)); assert.deepEqual(scene.physics, beforePick.physics); assert.deepEqual(scene.xp, beforePick.xp.concat(1)); result.checks.nativeGlassPick = point;
    const beforeGuideFit = state(await read()); await activate(study.locator('[data-iss-cupola-inspect]')); await wait(); verifyCupola((await read()).cupola, true); assert.deepEqual(state(await read()), beforeGuideFit);
    const beforeGeneric = state(await read()); await activate(page.locator('[data-iss-focus-module="cupola"]')); await wait(); scene = await read(); assert.notEqual(scene.camera.fit, 'cupola'); assert.equal(await page.locator('[data-iss-cupola-caption]').isVisible(), false); assert.deepEqual(state(scene), beforeGeneric); result.checks.sameModuleGenericExit = true;
    await activate(page.locator('[data-iss-cutaway]')); await wait(); scene = await read(); verifyCutaway(scene.cupola, true);
    result.checks.selectedCutaway = { frame: scene.cupola.frame.material.opacity, glass: scene.cupola.glazing.material.opacity, cores: scene.cupola.coreVisibility };
    const selectedCutawayState = state(scene); await activate(fit); await wait(); scene = await read(); verifyCupola(scene.cupola, true); verifyCutaway(scene.cupola, true, true); assert.deepEqual(state(scene), selectedCutawayState);
    await activate(page.locator('[data-iss-focus-module="cupola"]')); await wait(); verifyCutaway((await read()).cupola, true);
    await select('destiny'); scene = await read(); verifyCutaway(scene.cupola, false);
    result.checks.unselectedCutaway = { frame: scene.cupola.frame.material.opacity, glass: scene.cupola.glazing.material.opacity };
    const otherCutawayState = state(scene); await activate(fit); await wait(); scene = await read(); verifyCupola(scene.cupola, true); verifyCutaway(scene.cupola, false, true); assert.deepEqual(state(scene), otherCutawayState);
    await canvas.focus(); await page.keyboard.press('Home'); await wait(); scene = await read(); verifyCutaway(scene.cupola, false); assert.deepEqual(state(scene), otherCutawayState); result.checks.macroCutawayIsolation = true;
    await activate(page.locator('[data-iss-cutaway]')); await choose(); await activate(fit); await wait();
    await activate(page.locator('[data-iss-lighting-preset="midnight"]')); await wait(); scene = await read(); verifyCupola(scene.cupola, true); assert(scene.physics.eclipse); assert.equal(scene.cupola.glazing.material.emissive, 0); await capture(stage, 'eclipse'); result.checks.eclipse = scene.cupola;
    const seed = scene.data; result.cleanup = await page.evaluate(readCleanup); verifyCleanup(result.cleanup, true);
    await page.evaluate(seed => window.__mount(seed), seed); await wait(); await choose(); await activate(fit); await wait(); verifyCupola((await read()).cupola, true); result.finalCleanup = await page.evaluate(readCleanup); verifyCleanup(result.finalCleanup, true);
    result.hostErrors = await page.evaluate(() => window.__events.errors); assert.deepEqual(result.errors, []); assert.deepEqual(result.hostErrors, []); result.passed = true;
    console.log(`Cupola ${width}px native selection, protection study, camera, axe and cleanup passed`); return result;
  } catch (error) { result.passed = false; result.failure = error.stack || error.message; result.lastScene = await read().catch(() => null); await capture(stage, 'failure').catch(() => {}); error.qaResult = result; throw error; }
  finally { await page.evaluate(() => window.__destroy?.()).catch(() => {}); await page.close().catch(() => {}); }
}

function ownedOutput(directory) { assert(path.resolve(directory).startsWith(path.join(ROOT, '.tmp/space-station-cupola-detail-01a185d3/native')), 'Only this QA owner’s native evidence directory is writable'); }
function verifyLaunch(record) {
  assert.equal(record.script, __filename); ownedOutput(record.output); assert(Number.isInteger(record.masterPid) && record.masterPid > 0);
  const base = new URL(record.base); assert.equal(base.protocol, 'http:'); assert.equal(base.hostname, '127.0.0.1'); assert(base.port);
  if (record.browserEndpoint) { const ws = new URL(record.browserEndpoint); assert.equal(ws.protocol, 'ws:'); assert(['127.0.0.1', 'localhost', '[::1]'].includes(ws.hostname)); assert(ws.port); }
}

function selftest() {
  const material = { type: 'MeshStandardMaterial', map: null, emissive: 0, side: 2, opacity: 1 };
  const part = { position: [-1.2, -.75, .2], rotation: [Math.PI, 0, 0, 'XYZ'], maxRadius: .42, triangles: 300, finite: true, material, metadata: { windowCount: 7, sideWindowCount: 6, components: [{}] }, sharesProtectedMaterial: false };
  const cupola = { frame: { ...structuredClone(part), name: 'iss-cupola-frame', id: 'cupola', materialId: 'frame' }, glazing: { ...structuredClone(part), name: 'iss-cupola-glazing', parent: 'cupola', materialId: 'glass' },
    panes: paneIds.map(id => ({ id, kind: id === 'nadir' ? 'circle' : 'trapezoid', firstHit: 'iss-cupola-glazing', hitOwnRange: true })), normal: [0, -1, 0], coreVisibility: [false] };
  verifyCupola(cupola); let count = 0;
  for (const change of [v => { v.glazing.material.emissive = 1; }, v => { v.frame.material.map = 'painted'; }, v => { v.glazing.maxRadius = .5; }, v => { v.panes.pop(); }, v => { v.panes[0].firstHit = 'iss-cupola-frame'; }, v => { v.panes[1].hitOwnRange = false; }, v => { v.frame.position[1] = .75; }, v => { v.coreVisibility = [true]; }, v => { v.normal = [0, 1, 0]; }, v => { v.glazing.sharesProtectedMaterial = true; }]) { const v = structuredClone(cupola); change(v); assert.throws(() => verifyCupola(v)); count++; }
  const camera = { fit: 'cupola', focusId: 'cupola', tweening: false, minDistance: .72, maxDistance: 2.6, distance: 1, target: [0, 0, 0], fitCenter: [0, 0, 0], fitRadius: .4 };
  const fitted = { ...structuredClone(cupola), camera, center: [0, 0, 0], radius: .4, outwardDot: 1, projected: [[-.5, -.5, 0], [.5, .5, 0]], pixels: { width: 100, height: 100 } }; verifyCupola(fitted, true);
  for (const change of [v => { v.camera.target[0] = 1; }, v => { v.outwardDot = -1; }, v => { v.projected[0][0] = 2; }, v => { v.camera.distance = 3; }]) { const v = structuredClone(fitted); change(v); assert.throws(() => verifyCupola(v, true)); count++; }
  const manual = structuredClone(fitted); manual.camera.fit = null; verifyManualMacro(manual);
  for (const change of [v => { v.camera.minDistance = 1.6; }, v => { v.outwardDot = -1; }, v => { v.camera.focusId = null; }]) { const v = structuredClone(manual); change(v); assert.throws(() => verifyManualMacro(v)); count++; }
  const cutaway = structuredClone(cupola); cutaway.coreVisibility = [true]; for (const p of [cutaway.frame, cutaway.glazing]) { p.material.opacity = .26; p.material.depthWrite = false; } verifyCutaway(cutaway, true);
  for (const change of [v => { v.glazing.material.opacity = 1; }, v => { v.glazing.material.depthWrite = true; }, v => { v.coreVisibility = [false]; }]) { const v = structuredClone(cutaway); change(v); assert.throws(() => verifyCutaway(v, true)); count++; }
  const before = { meshCount: 286, materialCount: 50, textureCount: 21, protected: ['retained'], physics: { phase: 0 }, data: { note: 'keep' }, xp: [] }, after = { ...structuredClone(before), meshCount: 287, materialCount: 51, textureCount: 20 }; verifyProtected(before, after);
  for (const change of [v => { v.protected[0] = 'changed'; }, v => { v.data.note = ''; }, v => { v.xp = [1]; }, v => { v.textureCount++; }, v => { v.meshCount++; }]) { const v = structuredClone(after); change(v); assert.throws(() => verifyProtected(before, v)); count++; }
  const study = { panes: ['scratch', 'pressure-inner', 'pressure-outer', 'debris'].map(id => ({ id, visible: true, selected: id.startsWith('pressure') })), shutter: { visible: true, selected: false }, pressed: [false, true, false, false], description: 'Two structural pressure panes maintain the pressure boundary.', descriptionVisible: true, descriptionFont: 12 }; verifyStudy(study, 'pressure');
  for (const change of [v => { v.panes.pop(); }, v => { v.panes[1].selected = false; }, v => { v.panes[0].visible = false; }, v => { v.descriptionFont = 8; }, v => { v.shutter.selected = true; }]) { const v = structuredClone(study); change(v); assert.throws(() => verifyStudy(v, 'pressure')); count++; }
  const clean = [{ lost: true, frames: 3, resources: 4, bad: [], cupolaResources: [1, 2, 3, 4].map(id => ({ id, owners: ['own'] })) }]; verifyCleanup(clean, true);
  for (const change of [v => { v[0].bad.push({ disposals: 2 }); }, v => { v[0].cupolaResources[0].owners.push('other'); }, v => { v[0].cupolaResources[1].id = 1; }]) { const v = structuredClone(clean); change(v); assert.throws(() => verifyCleanup(v, true)); count++; }
  const launch = { script: __filename, output, masterPid: 1, base: 'http://127.0.0.1:1234', browserEndpoint: 'ws://localhost:2345/owned' }; verifyLaunch(launch);
  for (const host of ['127.0.0.1', 'localhost', '[::1]']) verifyLaunch({ ...launch, browserEndpoint: 'ws://' + host + ':2345/owned' });
  for (const change of [v => { v.script = 'other'; }, v => { v.browserEndpoint = 'ws://example.com:2345/other'; }, v => { v.output = ROOT; }]) { const v = structuredClone(launch); change(v); assert.throws(() => verifyLaunch(v)); count++; }
  for (const host of ['[::2]', '192.168.1.1', '127.0.0.2', 'localhost.example.com']) { assert.throws(() => verifyLaunch({ ...launch, browserEndpoint: 'ws://' + host + ':2345/other' })); count++; }
  console.log(`Cupola QA selftest: ${count} geometry, framing, state, layer, cleanup and launch-ownership mutants rejected.`);
}

async function workerMain() {
  ownedOutput(output); const base = argument('--base', ''); assert(base);
  const sourcePath = path.join(ROOT, 'stem_lab/stem_tool_spacestation.js'), source = await fs.readFile(sourcePath, 'utf8');
  assert(source.includes('function issCupolaGeometry(') && source.includes('data-iss-cupola-study'), 'Wait for candidate readiness');
  const before = await fs.readFile(path.resolve(ROOT, argument('--baseline', '.tmp/space-station-cupola-detail-01a185d3/native-source-before.js')), 'utf8');
  assert.equal(hash(before), 'f20265c4de2f0244215dd7e1e62e01540a10815cca0329c45d1b091e67966bfb');
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
    await fs.writeFile(path.join(output, 'worker-launch.json'), JSON.stringify(launch, null, 2)); console.log('Cupola browser launch ' + JSON.stringify(launch)); process.send?.({ type: 'browser-started', ...launch });
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
  process.on('SIGINT', stop); process.on('SIGTERM', stop); await save(); console.log(`Cupola supervisor PID ${process.pid}`);
  try {
    preview = await createPreview(); record.base = preview.base; await save(); console.log(`Cupola owned preview ${preview.base}`);
    const args = process.argv.slice(2).filter(arg => arg !== '--worker' && !arg.startsWith('--base='));
    child = spawn(process.execPath, [__filename, '--worker', '--base=' + preview.base, ...args], { stdio: ['ignore', 'pipe', 'pipe', 'ipc'], windowsHide: true });
    record.childPid = child.pid; record.childCommand = child.spawnargs; record.phase = 'running'; await save(); console.log(`Cupola worker PID ${child.pid}`);
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
    record.finished = new Date().toISOString(); await save(); await saving; console.log('Cupola final ownership receipt ' + JSON.stringify(record));
  }
}

async function requestStop() {
  ownedOutput(output); const launchPath = path.join(output, 'launch.json'), record = JSON.parse(await fs.readFile(launchPath, 'utf8')); verifyLaunch(record);
  if (record.childClosed && record.previewClosed) { console.log('Owned Cupola worker and preview were already closed.'); return; }
  await fs.writeFile(path.join(output, 'cancel-request.json'), JSON.stringify({ script: __filename, requested: new Date().toISOString(), masterPid: record.masterPid, childPid: record.childPid, browserPid: record.browserPid }, null, 2));
  console.log(`Requested graceful stop of recorded Cupola worker ${record.childPid}, browser ${record.browserPid}, preview ${record.base}`);
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
module.exports = { verifyCupola, verifyProtected, verifyCutaway, verifyManualMacro, verifyStudy, verifyCleanup, verifyLaunch, selftest };
