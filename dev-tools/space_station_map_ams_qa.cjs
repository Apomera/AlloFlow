#!/usr/bin/env node
'use strict';

// Native AMS inspection, rendered detector-track and resource-lifetime checks.
// --selftest; --visual-only --widths=1440; --reuse-report=<prior results.json>
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const { createPreview } = require('./space_station_enhancement_qa.cjs');
const ROOT = path.resolve(__dirname, '..');
const argument = (name, fallback) => process.argv.find(value => value.startsWith(name + '='))?.slice(name.length + 1) || fallback;
const output = path.resolve(ROOT, argument('--out', '.tmp/space-station-ams-detail-01a185d3/browser'));
const widths = argument('--widths', '1440,390').split(',').map(Number);
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const near = (a, b, tolerance = 1e-6) => assert(Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tolerance, `${a} != ${b}`);
const vectorNear = (a, b, tolerance) => { assert.equal(a.length, b.length); a.forEach((v, i) => near(v, b[i], tolerance)); };
const independent = data => Object.fromEntries(Object.entries(data).filter(([key]) => !['selModule', 'seenModules', 'mapCutaway'].includes(key)));

function verifyInstrument(value, fitted = false) {
  assert(value, 'Separate AMS mesh exists');
  assert.equal(value.name, 'iss-ams02-instrument'); assert.equal(value.parent, 'truss'); assert.equal(value.scienceId, 'ams02');
  assert.equal(value.material.type, 'MeshStandardMaterial'); assert.equal(value.material.emissive, 0); assert.equal(value.material.map, null);
  assert(value.vertexColors && value.colorCount >= 3 && value.finite); assert(value.triangles > 0 && value.triangles < 3000);
  assert.equal(value.sharesMaterial, false); vectorNear(value.position, [2.24, 1.1, -1.6]);
  if (fitted) {
    assert.equal(value.camera.focusId, 'ams02'); assert.equal(value.camera.fit, 'ams02'); assert(!value.camera.tweening);
    near(value.camera.minDistance, 1); vectorNear(value.camera.target, value.center); vectorNear(value.camera.fitCenter, value.center);
    near(value.camera.fitRadius, value.radius);
    const half = value.fov * Math.PI / 360, horizontal = Math.atan(Math.tan(half) * value.aspect);
    near(value.camera.distance, Math.max(1, value.radius * 1.16 / Math.sin(Math.min(half, horizontal))));
    assert(value.projected.every(p => p.every(Number.isFinite) && Math.abs(p[0]) < .95 && Math.abs(p[1]) < .95 && p[2] > -1 && p[2] < 1));
    assert(value.pixels.width >= 30 && value.pixels.height >= 30, 'Phone fit reveals the instrument silhouette');
  }
}

function verifyProtected(before, after) {
  assert.equal(before.instrument, null); assert(after.instrument);
  assert.equal(after.meshCount, before.meshCount + 1);
  assert.deepEqual(after.protected, before.protected, 'All other meshes, materials, textures and transforms remain exact');
  assert.equal(before.trussTriangles - after.trussTriangles, 104, 'Only the old 20-sided cylinder and two box primitives leave the truss batch');
  assert.deepEqual(after.physics, before.physics); assert.deepEqual(after.data, before.data);
}

function verifyTrack(value, charge, momentum) {
  assert.equal(value.charge, charge); near(value.momentum, momentum);
  assert.equal(value.points.length, 49); assert.equal(value.opposite.length, 49);
  const start = value.points[0], end = value.points.at(-1), radius = 190 * momentum;
  near(end[1] - start[1], 160, .002);
  const centerX = start[0] - charge * radius;
  value.points.forEach((point, index) => {
    near(Math.hypot(point[0] - centerX, point[1] - start[1]), radius, .0015);
    near(point[0] + value.opposite[index][0], start[0] * 2, .002);
    near(point[1], value.opposite[index][1], .002);
  });
  near(end[0], start[0] - charge * 160 ** 2 / (radius + Math.sqrt(radius ** 2 - 160 ** 2)), .001);
  assert((end[0] - start[0]) * charge < 0, 'Positive charge bends left for downward velocity and field out of the page');
}

function verifyCleanup(mounts, instrument = true) {
  assert(mounts.length);
  for (const mount of mounts) {
    assert(mount.lost && mount.frames > 0 && mount.resources > 0); assert.deepEqual(mount.bad, []);
    assert.equal(mount.instrumentResources.length, instrument ? 2 : 0);
  }
  const ids = mounts.flatMap(mount => mount.instrumentResources.map(resource => resource.id));
  assert.equal(new Set(ids).size, ids.length, 'AMS geometry and material belong to individual mounts');
  if (mounts.length > 1) {
    assert.deepEqual(mounts[1].reused.map(resource => resource.kind).sort(), ['BufferGeometry', 'CylinderGeometry']);
    assert(mounts[1].reused.every(resource => resource.ownerTypes.includes('ArrowHelper')));
  }
}

function installObserver() {
  const Original = THREE.WebGLRenderer;
  window.__amsQA = { mounts: [], draw: null };
  function ObservedRenderer(options) {
    const renderer = new Original(options), render = renderer.render;
    const mount = { gl: renderer.getContext(), resources: {}, frames: 0, scene: null, camera: null };
    window.__amsQA.mounts.push(mount);
    function track(resource, owner, ownerType) {
      if (!resource) return;
      const existing = mount.resources[resource.uuid];
      if (existing) { if (owner && !existing.owners.includes(owner)) existing.owners.push(owner); if (ownerType && !existing.ownerTypes.includes(ownerType)) existing.ownerTypes.push(ownerType); return; }
      const entry = mount.resources[resource.uuid] = { name: resource.name || '', kind: resource.type, owners: owner ? [owner] : [], ownerTypes: ownerType ? [ownerType] : [], disposals: 0 };
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
      if (scene.name === 'iss-station-inspection') { mount.scene = scene; mount.camera = camera; mount.frames++; window.__amsQA.draw = mount; }
      return answer;
    };
    return renderer;
  }
  ObservedRenderer.prototype = Original.prototype; Object.setPrototypeOf(ObservedRenderer, Original); THREE.WebGLRenderer = ObservedRenderer;
}

function readScene() {
  const draw = window.__amsQA.draw, cv = document.querySelector('.iss-station-stage canvas'), scene = draw.scene, camera = draw.camera;
  const station = scene.getObjectByName('iss-inspected-station'), state = cv._issCameraState(), light = cv._issLightingState(), maps = new Map();
  function fingerprint(array) {
    const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength); let value = 2166136261;
    for (const byte of bytes) value = Math.imul(value ^ byte, 16777619); return (value >>> 0).toString(16);
  }
  function texture(map) {
    if (!map) return null; if (maps.has(map.uuid)) return maps.get(map.uuid);
    const image = map.image, value = { name: map.name, size: [image?.width, image?.height], wrap: [map.wrapS, map.wrapT], repeat: map.repeat.toArray(), encoding: map.encoding,
      pixels: image instanceof HTMLCanvasElement ? fingerprint(image.getContext('2d').getImageData(0, 0, image.width, image.height).data) : null };
    maps.set(map.uuid, value); return value;
  }
  function material(mat) { return { type: mat.type, color: mat.color?.getHex(), emissive: mat.emissive?.getHex(), roughness: mat.roughness, metalness: mat.metalness,
    opacity: mat.opacity, transparent: mat.transparent, depthWrite: mat.depthWrite, side: mat.side, map: texture(mat.map) }; }
  const records = [], otherMaterials = new Set(); let meshCount = 0, instrument = null, trussTriangles = 0;
  station.traverse(object => {
    if (!object.isMesh) return; meshCount++;
    if (object.name === 'iss-ams02-instrument') { instrument = object; return; }
    const g = object.geometry, materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach(mat => otherMaterials.add(mat.uuid));
    if (object.name === 'iss-truss-hardware') trussTriangles = (g.index?.count || g.getAttribute('position').count) / 3;
    records.push({ name: object.name, parent: object._issParentId || null, id: object._issId || null, visitor: object._issVisitorId || null,
      geometry: object.name === 'iss-truss-hardware' ? 'only AMS stub removal; separately checked' : { type: g.type, parameters: g.parameters || null,
        attributes: Object.fromEntries(Object.entries(g.attributes).map(([key, attr]) => [key, fingerprint(attr.array)])), index: g.index ? fingerprint(g.index.array) : null },
      position: object.position.toArray(), rotation: object.rotation.toArray(), scale: object.scale.toArray(), materials: materials.map(material), visible: object.visible });
  });
  const result = { meshCount, trussTriangles, protected: records.map(value => JSON.stringify(value)).sort(), instrument: null,
    physics: { quaternion: state.stationQuaternion, ...Object.fromEntries(['phase', 'beta', 'incidence', 'generation', 'sunIntensity', 'earthSunIntensity', 'tracking', 'eclipse', 'playing', 'sun', 'wingNormal'].map(key => [key, light[key]])) },
    data: structuredClone(window.__toolData.spaceStation), camera: state };
  if (!instrument) return result;
  const bounds = new THREE.Box3().setFromObject(instrument), center = bounds.getCenter(new THREE.Vector3()), points = [];
  for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) points.push(new THREE.Vector3(x, y, z).project(camera).toArray());
  const colors = instrument.geometry.getAttribute('color'), unique = new Set();
  for (let i = 0; colors && i < colors.count; i++) unique.add([colors.getX(i), colors.getY(i), colors.getZ(i)].join(','));
  result.instrument = { name: instrument.name, parent: instrument._issParentId, scienceId: instrument._issScienceId, material: material(instrument.material),
    materialId: instrument.material.uuid, geometryId: instrument.geometry.uuid, vertexColors: !!instrument.material.vertexColors, colorCount: unique.size,
    finite: Array.from(instrument.geometry.getAttribute('position').array).every(Number.isFinite), triangles: (instrument.geometry.index?.count || instrument.geometry.getAttribute('position').count) / 3,
    sharesMaterial: otherMaterials.has(instrument.material.uuid), position: instrument.position.toArray(), center: center.toArray(), radius: bounds.getBoundingSphere(new THREE.Sphere()).radius,
    projected: points, camera: state, fov: camera.fov, aspect: camera.aspect,
    pixels: { width: (Math.max(...points.map(p => p[0])) - Math.min(...points.map(p => p[0]))) * cv.clientWidth / 2,
      height: (Math.max(...points.map(p => p[1])) - Math.min(...points.map(p => p[1]))) * cv.clientHeight / 2 } };
  return result;
}

function readTrack() {
  const panel = document.querySelector('[data-iss-ams-study]');
  const points = kind => { const d = panel.querySelector('[data-iss-ams-track="' + kind + '"]').getAttribute('d'); const values = d.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi).map(Number); return Array.from({ length: values.length / 2 }, (_, i) => values.slice(i * 2, i * 2 + 2)); };
  return { charge: Number(panel.dataset.charge), momentum: Number(panel.dataset.momentum), points: points('current'), opposite: points('opposite') };
}

function readCleanup() {
  window.__destroy(); window.__amsQA.mounts.forEach(mount => { mount.closed = true; });
  return window.__amsQA.mounts.map((mount, index, mounts) => ({ frames: mount.frames, lost: mount.gl.isContextLost(), resources: Object.keys(mount.resources).length,
    instrumentResources: Object.entries(mount.resources).filter(([, resource]) => resource.owners.includes('iss-ams02-instrument')).map(([id, resource]) => ({ id, ...resource })),
    reused: Object.entries(mount.resources).filter(([id]) => mounts.slice(0, index).some(previous => previous.resources[id])).map(([id, resource]) => ({ id, ...resource })),
    bad: Object.values(mount.resources).filter(resource => resource.disposals !== 1) }));
}

async function runMount(browser, base, source, width, baseline = null) {
  const result = { width, kind: baseline ? 'candidate' : 'baseline', checks: {}, screenshots: [], errors: [] };
  const page = await browser.newPage({ viewport: { width, height: width < 500 ? 844 : 1080 }, isMobile: width < 500, hasTouch: width < 500, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000); page.on('pageerror', error => result.errors.push(error.stack || error.message));
  await page.route('**/stem_lab/stem_tool_spacestation.js', route => route.fulfill({ body: source, contentType: 'text/javascript' }));
  await page.route('**/vendor/three-r128/three.min.js', async route => { const response = await route.fetch(); assert(response.ok()); await route.fulfill({ response, body: (await response.text()) + '\n;(' + installObserver.toString() + ')();' }); });
  const canvas = page.locator('.iss-station-stage canvas'), study = page.locator('[data-iss-ams-study]'), frame = page.locator('[data-iss-camera-fit="ams02"]');
  const activate = locator => width < 500 ? locator.tap() : locator.click();
  const wait = async () => { await page.waitForFunction(() => window.__amsQA?.draw?.frames > 1 && document.querySelector('.iss-station-stage canvas')?._issCameraState && !document.querySelector('.iss-station-stage canvas')._issCameraState().tweening); await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); };
  const read = () => page.evaluate(readScene), saved = () => page.evaluate(() => structuredClone(window.__toolData.spaceStation));
  const choose = id => page.locator('#iss-component-topic').selectOption(id);
  const select = async id => { await activate(page.locator('.iss-module-picker').getByRole('button', { name: id === 'truss' ? /^Integrated Truss/ : new RegExp('^' + id + '$', 'i') })); await page.waitForFunction(id => window.__toolData.spaceStation.selModule === id, id); await wait(); };
  const capture = async (locator, name) => { const filename = `ams-${name}-${width}.png`; const clip = await locator.evaluate(node => { const b = node.getBoundingClientRect(); return { x: b.x + scrollX, y: b.y + scrollY, width: b.width, height: b.height }; }); await page.screenshot({ path: path.join(output, filename), clip, fullPage: true, animations: 'disabled' }); result.screenshots.push(filename); };
  try {
    await page.goto(base + '/?tab=map'); await wait();
    await page.evaluate(() => { document.querySelector('.iss-station-stage canvas')._issSetLighting({ playing: false }); window.__setToolData(previous => ({ ...previous, spaceStation: { ...previous.spaceStation,
      opsOrbitMinute: 37.12345, opsWaterDay: 12.5, opsPressureMinute: 7.25, opsPrediction: 'Preserve working prediction', opsLog: ['Keep this note'],
      opsTrials: [{ id: 71, label: 'Saved trial', setup: { opsBattery: 65 }, results: { batteryMin: 42 }, prediction: 'Stored prediction', reflection: 'Stored explanation' }], opsTrialSelected: 71, opsTrialCompare: 'current', opsTrajectoryOpen: true, opsTrajectoryMetric: 'cmg', opsTrajectoryMinute: 40 } })); });
    await page.waitForFunction(() => window.__toolData.spaceStation.opsOrbitMinute === 37.12345);
    await select('truss'); await choose('ams02'); await activate(page.locator('[data-iss-lighting-preset="noon"]')); await wait();
    const initial = await read(); result.initial = initial;
    if (!baseline) { assert.equal(initial.instrument, null); result.cleanup = await page.evaluate(readCleanup); verifyCleanup(result.cleanup, false); result.hostErrors = await page.evaluate(() => window.__events.errors); assert.deepEqual(result.errors, []); assert.deepEqual(result.hostErrors, []); result.passed = true; console.log(`AMS baseline ${width}px: ${initial.meshCount} meshes recorded`); return result; }
    verifyProtected(baseline.initial, initial); verifyInstrument(initial.instrument);
    result.checks.protected = { before: baseline.initial.meshCount, after: initial.meshCount, count: initial.protected.length, hash: hash(JSON.stringify(initial.protected)), removedTrussTriangles: baseline.initial.trussTriangles - initial.trussTriangles };
    const before = await saved(); await frame.focus(); await page.keyboard.press('Enter'); await wait();
    let scene = await read(); verifyInstrument(scene.instrument, true); assert.deepEqual(await saved(), before); assert.deepEqual(scene.physics, initial.physics);
    assert(await page.locator('[data-iss-science-caption]').isVisible()); result.checks.fit = scene.instrument;
    await capture(page.locator('.iss-station-stage'), 'day'); await capture(study, 'study'); console.log(`AMS ${width}px: protected scene and native close daylight view ready`);
    if (process.argv.includes('--visual-only')) { result.visualOnly = true; result.cleanup = await page.evaluate(readCleanup); verifyCleanup(result.cleanup); result.passed = true; return result; }

    const original = await saved(), originalPhysics = scene.physics;
    const momentum = study.locator('[data-iss-ams-momentum]'), positive = study.locator('[data-iss-ams-charge="1"]'), negative = study.locator('[data-iss-ams-charge="-1"]');
    assert.equal(await momentum.getAttribute('min'), '1'); assert.equal(await momentum.getAttribute('max'), '5'); assert.equal(await momentum.getAttribute('step'), '0.5');
    await positive.focus(); await page.keyboard.press('Enter'); await momentum.focus(); await page.keyboard.press('Home');
    let track = await page.evaluate(readTrack); verifyTrack(track, 1, 1); result.checks.positiveLow = track;
    await negative.focus(); await page.keyboard.press('Space'); track = await page.evaluate(readTrack); verifyTrack(track, -1, 1); result.checks.negativeLow = track;
    await momentum.focus(); await page.keyboard.press('ArrowRight'); verifyTrack(await page.evaluate(readTrack), -1, 1.5);
    await page.keyboard.press('End'); track = await page.evaluate(readTrack); verifyTrack(track, -1, 5); result.checks.negativeHigh = track;
    await activate(positive); track = await page.evaluate(readTrack); verifyTrack(track, 1, 5); result.checks.positiveHigh = track;
    assert(Math.abs(track.points.at(-1)[0] - track.points[0][0]) < Math.abs(result.checks.positiveLow.points.at(-1)[0] - result.checks.positiveLow.points[0][0]));
    assert.deepEqual(await saved(), original); assert.deepEqual((await read()).physics, originalPhysics);
    result.checks.links = await study.locator('a').evaluateAll(nodes => nodes.map(a => ({ url: a.href, target: a.target, rel: a.rel })));
    assert(result.checks.links.length > 0); for (const link of result.checks.links) { const url = new URL(link.url); assert.equal(url.protocol, 'https:'); assert(/(^|\.)(nasa\.gov|ams02\.space|cern\.ch|home\.cern)$/.test(url.hostname)); assert.equal(link.target, '_blank'); assert(link.rel.split(/\s+/).includes('noopener')); }
    await page.addScriptTag({ path: path.join(ROOT, 'desktop/web-app/node_modules/axe-core/axe.min.js') });
    result.checks.axe = await page.evaluate(async () => { const checked = await axe.run({ include: ['[data-iss-ams-study]', '[data-iss-component-guide]', '[data-iss-science-caption]'] }, { rules: { region: { enabled: false } } }); return { passes: checked.passes.length, violations: checked.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) }; });
    assert.deepEqual(result.checks.axe.violations, []);
    result.checks.layout = await study.evaluate(node => ({ document: document.documentElement.scrollWidth - innerWidth, panel: node.scrollWidth - node.clientWidth, overflow: Array.from(node.querySelectorAll('p,h3,h4,button,input')).filter(n => n.scrollWidth > n.clientWidth + 1).map(n => n.textContent) }));
    assert(result.checks.layout.document <= 1 && result.checks.layout.panel <= 1); assert.deepEqual(result.checks.layout.overflow, []);
    await page.setViewportSize({ width: width < 500 ? 320 : 960, height: width < 500 ? 844 : 1080 }); await wait(); verifyInstrument((await read()).instrument, true);
    await page.setViewportSize({ width, height: width < 500 ? 844 : 1080 }); await wait(); result.checks.resize = true;

    // Keep a different module selected, pan off the fit, then inspect by a real
    // instrument hit. This catches accidental module IDs or discovery writes.
    await select('destiny'); await choose('ams02'); await activate(frame); await wait();
    const beforePick = await saved(); await canvas.scrollIntoViewIfNeeded(); await canvas.focus(); await page.keyboard.press('Shift+ArrowRight'); await wait();
    assert((await read()).camera.panned); assert.equal(await page.locator('[data-iss-science-caption]').isVisible(), false);
    const point = await page.evaluate(() => { const draw = window.__amsQA.draw, mesh = draw.scene.getObjectByName('iss-ams02-instrument'), cv = document.querySelector('.iss-station-stage canvas');
      const p = new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3()).project(draw.camera), b = cv.getBoundingClientRect(), ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2(p.x, p.y), draw.camera);
      const meshes = []; draw.scene.traverse(object => { if (object.isMesh && (object._issId || object._issParentId || object._issVisitorId)) { let a = object; while (a && a.visible) a = a.parent; if (!a) meshes.push(object); } });
      return { x: b.left + (p.x + 1) * b.width / 2, y: b.top + (1 - p.y) * b.height / 2, hit: ray.intersectObjects(meshes, false)[0]?.object.name }; });
    assert.equal(point.hit, 'iss-ams02-instrument');
    if (width >= 500) { await page.mouse.move(point.x, point.y); await page.waitForFunction(() => {
      const label = document.querySelector('[data-iss-hover-name]');
      return document.querySelector('.iss-station-stage canvas')._issHoverId === 'ams02' && /AMS|Alpha Magnetic/i.test(label?.textContent || '') && Number(getComputedStyle(label).opacity) > .9;
    }); result.checks.hover = await page.locator('[data-iss-hover-name]').innerText(); }
    if (width < 500) await page.touchscreen.tap(point.x, point.y); else await page.mouse.click(point.x, point.y);
    await wait(); verifyInstrument((await read()).instrument, true); assert.deepEqual(await saved(), beforePick); result.checks.nativePick = point;

    await activate(page.locator('[data-iss-cutaway]')); await wait(); scene = await read(); near(scene.instrument.material.opacity, 1); assert(scene.instrument.material.depthWrite);
    await canvas.scrollIntoViewIfNeeded(); await canvas.focus(); await page.keyboard.press('Home'); await wait(); scene = await read(); near(scene.instrument.material.opacity, .05); assert.equal(scene.instrument.material.depthWrite, false);
    await select('truss'); scene = await read(); near(scene.instrument.material.opacity, 1);
    await activate(page.locator('[data-iss-cutaway]')); await choose('ams02'); await activate(frame); await wait();
    assert.deepEqual(independent(await saved()), independent(original)); assert.deepEqual((await read()).physics, originalPhysics); result.checks.cutawayPanReset = true;
    await activate(page.locator('[data-iss-lighting-preset="midnight"]')); await wait(); scene = await read(); verifyInstrument(scene.instrument, true);
    assert(scene.physics.eclipse && scene.physics.sunIntensity < initial.physics.sunIntensity); assert.equal(scene.instrument.material.emissive, 0);
    await capture(page.locator('.iss-station-stage'), 'eclipse'); result.checks.eclipse = { physics: scene.physics, instrument: scene.instrument };
    console.log(`AMS ${width}px: charge/rigidity, native pick, resize, cutaway, keyboard and axe passed`);
    const seed = await saved(); result.cleanup = await page.evaluate(readCleanup); verifyCleanup(result.cleanup);
    await page.evaluate(seed => window.__mount(seed), seed); await wait(); await choose('ams02'); await activate(frame); await wait(); verifyInstrument((await read()).instrument, true);
    result.finalCleanup = await page.evaluate(readCleanup); verifyCleanup(result.finalCleanup); result.checks.remount = true;
    result.hostErrors = await page.evaluate(() => window.__events.errors); assert.deepEqual(result.errors, []); assert.deepEqual(result.hostErrors, []);
    result.passed = true; console.log(`AMS ${width}px: two clean mounts, private resources and day/eclipse views passed`); return result;
  } catch (error) { result.passed = false; result.failure = error.stack || error.message; result.lastScene = await read().catch(() => null); await page.screenshot({ path: path.join(output, `ams-failure-${width}.png`), fullPage: true }).catch(() => {}); error.qaResult = result; throw error; }
  finally { await page.evaluate(() => window.__destroy?.()).catch(() => {}); await page.close(); }
}

function selftest() {
  const instrument = { name: 'iss-ams02-instrument', parent: 'truss', scienceId: 'ams02', material: { type: 'MeshStandardMaterial', emissive: 0, map: null }, vertexColors: true, colorCount: 4, finite: true, triangles: 500, sharesMaterial: false, position: [2.24, 1.1, -1.6] };
  verifyInstrument(instrument);
  for (const change of [v => { v.material.emissive = 1; }, v => { v.sharesMaterial = true; }, v => { v.position[1] = 0; }, v => { v.colorCount = 1; }, v => { v.scienceId = 'truss'; }]) { const v = structuredClone(instrument); change(v); assert.throws(() => verifyInstrument(v)); }
  const track = (charge, momentum) => { const radius = 190 * momentum, points = Array.from({ length: 49 }, (_, i) => { const y = i * 160 / 48; return [300 - charge * y * y / (radius + Math.sqrt(radius * radius - y * y)), 30 + y]; }); return { charge, momentum, points, opposite: points.map(p => [600 - p[0], p[1]]) }; };
  for (const charge of [-1, 1]) for (const p of [1, 5]) verifyTrack(track(charge, p), charge, p);
  for (const change of [v => { v.points.at(-1)[0] += 5; }, v => { v.opposite[10][1] += 1; }, v => { v.points = v.opposite; }, v => { v.momentum = 5; }, v => { v.points.pop(); }]) { const v = track(1, 1); change(v); assert.throws(() => verifyTrack(v, 1, 1)); }
  const before = { instrument: null, meshCount: 285, protected: ['kept'], trussTriangles: 500, physics: { phase: 0 }, data: { note: 'keep' } }, after = { ...structuredClone(before), instrument, meshCount: 286, trussTriangles: 396 };
  verifyProtected(before, after);
  for (const change of [v => { v.protected[0] = 'changed'; }, v => { v.trussTriangles--; }, v => { v.data.note = ''; }]) { const v = structuredClone(after); change(v); assert.throws(() => verifyProtected(before, v)); }
  const clean = [{ lost: true, frames: 3, resources: 2, instrumentResources: [{ id: 'geometry' }, { id: 'material' }], bad: [] }]; verifyCleanup(clean);
  const leaked = structuredClone(clean); leaked[0].bad = [{ disposals: 0 }]; assert.throws(() => verifyCleanup(leaked));
  console.log('AMS QA selftest: 14 geometry, protected-state, charge/curvature and disposal mutants rejected.');
}

async function main() {
  assert(output.startsWith(ROOT + path.sep)); assert(widths.length && widths.every(width => Number.isInteger(width) && width >= 320));
  const sourcePath = path.join(ROOT, 'stem_lab/stem_tool_spacestation.js'), source = await fs.readFile(sourcePath, 'utf8'); assert(source.includes('iss-ams02-instrument') && source.includes('data-iss-ams-study'), 'Wait for AMS source readiness');
  const baselinePath = path.resolve(ROOT, argument('--baseline', '.tmp/space-station-ams-detail-01a185d3/source-before.js')), before = await fs.readFile(baselinePath, 'utf8'); assert(!before.includes('iss-ams02-instrument'));
  await fs.mkdir(output, { recursive: true }); const report = { sourceSha256: hash(source), baselineSha256: hash(before), driverSha256: hash(await fs.readFile(__filename)), started: new Date().toISOString(), visualOnly: process.argv.includes('--visual-only'), results: [] };
  const priorPath = argument('--reuse-report', ''), prior = priorPath ? JSON.parse(await fs.readFile(path.resolve(ROOT, priorPath), 'utf8')) : null;
  if (prior) assert.equal(prior.baselineSha256, report.baselineSha256);
  const preview = await createPreview(); let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    for (const width of widths) {
      try {
        const reused = prior?.results.find(result => result.kind === 'baseline' && result.width === width && result.passed);
        const baseline = reused || await runMount(browser, preview.base, before, width); if (reused) report.reusedBaseline = path.resolve(ROOT, priorPath); else report.results.push(baseline);
        report.results.push(await runMount(browser, preview.base, source, width, baseline));
      } catch (error) { report.results.push(error.qaResult || { width, passed: false, failure: error.stack }); throw error; }
      finally { await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(report, null, 2)); }
    }
  } finally { report.finished = new Date().toISOString(); report.sourceUnchanged = hash(await fs.readFile(sourcePath, 'utf8')) === report.sourceSha256; await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(report, null, 2)); if (browser) await browser.close(); await new Promise(resolve => preview.server.close(resolve)); }
  assert(report.sourceUnchanged, 'Source remained fixed during the native run');
}

if (require.main === module) { if (process.argv.includes('--selftest')) selftest(); else main().catch(error => { console.error(error.stack || error); process.exitCode = 1; }); }
module.exports = { verifyInstrument, verifyProtected, verifyTrack, verifyCleanup, selftest };
