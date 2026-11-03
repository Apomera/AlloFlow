#!/usr/bin/env node
'use strict';

// Native moving-hand inspection, conceptual snares, protected scene and cleanup.
// --selftest; --visual-only --widths=1440; --reuse-report=<prior results.json>
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const { createPreview } = require('./space_station_enhancement_qa.cjs');
const ROOT = path.resolve(__dirname, '..');
const argument = (name, fallback) => process.argv.find(value => value.startsWith(name + '='))?.slice(name.length + 1) || fallback;
const output = path.resolve(ROOT, argument('--out', '.tmp/space-station-arm-grapple-01a185d3/browser'));
const widths = argument('--widths', '1440,390').split(',').map(Number);
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const near = (a, b, tolerance = 1e-6) => assert(Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tolerance, `${a} != ${b}`);
const vectorNear = (a, b, tolerance) => { assert.equal(a.length, b.length); a.forEach((value, i) => near(value, b[i], tolerance)); };
const independent = data => Object.fromEntries(Object.entries(data).filter(([key]) => !['selModule', 'seenModules', 'mapCutaway'].includes(key)));
const stableCamera = value => Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'renderCount'));

function verifyHand(value, fitted = false) {
  assert(value && value.name === 'iss-arm-hand'); assert.equal(value.scienceId, 'grapple');
  assert.equal(value.material.type, 'MeshStandardMaterial'); assert.equal(value.material.emissive, 0); assert.equal(value.material.map, null);
  assert(value.vertexColors && value.colorCount >= 3 && value.finite); assert(value.triangles > 100 && value.triangles < 6000);
  assert.equal(value.sharesMaterial, false); assert(value.maxRadius <= .075001); near(value.localBounds[0][1], -.08, 1e-6); near(value.localBounds[1][1], .08, 1e-6);
  vectorNear(value.position, value.expectedTip); vectorNear(value.direction, value.expectedDirection);
  if (fitted) {
    assert.equal(value.camera.focusId, 'grapple'); assert.equal(value.camera.fit, 'grapple'); assert(!value.camera.tweening);
    near(value.camera.minDistance, .5); assert(value.camera.distance >= .5 - 1e-7 && value.camera.distance <= 1.8 + 1e-7);
    vectorNear(value.camera.target, value.center); vectorNear(value.camera.fitCenter, value.center);
    near(value.camera.fitRadius, value.radius);
    near(Math.hypot(...value.localCameraOffset), value.camera.distance);
    assert(value.localCameraOffset[1] >= .08 * value.camera.distance - 1e-6, 'Close camera remains in front of the aperture');
    assert(value.projected.every(p => p.every(Number.isFinite) && Math.abs(p[0]) < .98 && Math.abs(p[1]) < .98 && p[2] > -1 && p[2] < 1));
    assert(value.pixels.width > 40 && value.pixels.height > 40, 'Phone inspection exposes actual housing detail');
  }
}

function verifyProtected(before, after) {
  assert.equal(after.meshCount, before.meshCount); assert.equal(after.materialCount, before.materialCount + 1); assert.equal(after.textureCount, before.textureCount);
  assert.deepEqual(after.protected, before.protected, 'Only three arm geometries and the two specified arm finishes may change');
  assert.deepEqual(after.physics, before.physics); assert.deepEqual(after.data, before.data); assert.deepEqual(after.arm, before.arm);
  assert.equal(after.booms.length, 2); after.booms.forEach((boom, i) => {
    const old = before.booms[i]; assert.equal(boom.parameters.radialSegments, 24);
    const parameters = value => Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'radialSegments'));
    const finish = value => Object.fromEntries(Object.entries(value).filter(([key]) => !['color', 'roughness'].includes(key)));
    assert.deepEqual(parameters(boom.parameters), parameters(old.parameters), 'Boom length, radii, caps and angular extent are unchanged');
    assert.equal(boom.material.color, 0xe2e5e3); near(boom.material.roughness, .6);
    assert.deepEqual(finish(boom.material), finish(old.material), 'Only the specified boom color and roughness change');
  });
}

function verifyFollow(before, after) {
  verifyHand(after.hand, true); vectorNear(after.hand.localCameraOffset, before.hand.localCameraOffset, 2e-5);
  near(after.camera.distance, before.camera.distance, 2e-5);
  assert(Math.hypot(...after.hand.center.map((v, i) => v - before.hand.center[i])) > 1e-5, 'Follow check actually moved the hand');
}

function verifyStudy(value, stage, initial = null) {
  assert.equal(value.stage, stage); assert.equal(value.wires.length, 3); assert(value.wires.every(w => w.points.length >= 3 && w.points.flat().every(Number.isFinite)));
  const distances = value.wires.map(w => Math.min(...w.points.map(p => Math.hypot(p[0] - value.center[0], p[1] - value.center[1]))));
  distances.forEach(distance => near(distance, stage === 0 ? 44 : 12, .15));
  assert(value.pinRadius === 9); assert(distances.every((distance, i) => distance - value.wires[i].strokeWidth / 2 >= value.pinRadius + value.pinStroke / 2 - .15), 'Visible cable strokes do not cut through the shaft');
  assert.deepEqual(value.pressed, [0, 1, 2].map(i => i === stage));
  if (initial) value.wires.forEach((wire, i) => { vectorNear(wire.points[0], initial.wires[i].points[0], .001); vectorNear(wire.points.at(-1), initial.wires[i].points.at(-1), .001); });
}

function verifyCleanup(mounts, candidate) {
  assert(mounts.length); mounts.forEach(mount => {
    assert(mount.lost && mount.frames > 0 && mount.resources > 0); assert.deepEqual(mount.bad, []);
    assert.equal(mount.handResources.length, 2);
    if (candidate) assert(mount.handResources.every(resource => resource.owners.length === 1), 'Private hand resources are not shared with other joints');
  });
  if (candidate) { const ids = mounts.flatMap(m => m.handResources.map(r => r.id)); assert.equal(new Set(ids).size, ids.length); }
  if (mounts.length > 1) { assert.deepEqual(mounts[1].reused.map(r => r.kind).sort(), ['BufferGeometry', 'CylinderGeometry']); assert(mounts[1].reused.every(r => r.ownerTypes.includes('ArrowHelper'))); }
}

function installObserver() {
  const Original = THREE.WebGLRenderer; window.__grappleQA = { mounts: [], draw: null };
  function ObservedRenderer(options) {
    const renderer = new Original(options), render = renderer.render;
    const mount = { gl: renderer.getContext(), resources: {}, frames: 0, scene: null, camera: null }; window.__grappleQA.mounts.push(mount);
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
      if (scene.name === 'iss-station-inspection') { mount.scene = scene; mount.camera = camera; mount.frames++; window.__grappleQA.draw = mount; }
      return answer;
    }; return renderer;
  }
  ObservedRenderer.prototype = Original.prototype; Object.setPrototypeOf(ObservedRenderer, Original); THREE.WebGLRenderer = ObservedRenderer;
}

function readScene() {
  const draw = window.__grappleQA.draw, cv = document.querySelector('.iss-station-stage canvas'), scene = draw.scene, camera = draw.camera;
  const station = scene.getObjectByName('iss-inspected-station'), state = cv._issCameraState(), light = cv._issLightingState(), arm = cv._issArmState(), maps = new Map();
  station.updateWorldMatrix(true, true); camera.updateMatrixWorld(true);
  const fingerprint = array => { const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength); let value = 2166136261; for (const byte of bytes) value = Math.imul(value ^ byte, 16777619); return (value >>> 0).toString(16); };
  function texture(map) {
    if (!map) return null; if (maps.has(map.uuid)) return maps.get(map.uuid);
    const image = map.image, value = { name: map.name, size: [image?.width, image?.height], wrap: [map.wrapS, map.wrapT], repeat: map.repeat.toArray(), encoding: map.encoding,
      pixels: image instanceof HTMLCanvasElement ? fingerprint(image.getContext('2d').getImageData(0, 0, image.width, image.height).data) : null }; maps.set(map.uuid, value); return value;
  }
  const material = mat => ({ type: mat.type, color: mat.color?.getHex(), emissive: mat.emissive?.getHex(), roughness: mat.roughness, metalness: mat.metalness,
    opacity: mat.opacity, transparent: mat.transparent, depthWrite: mat.depthWrite, side: mat.side, map: texture(mat.map) });
  const records = [], materials = new Set(), otherMaterials = new Set(), booms = []; let meshCount = 0, hand;
  station.traverse(object => {
    if (!object.isMesh) return; meshCount++; const g = object.geometry, mats = Array.isArray(object.material) ? object.material : [object.material]; mats.forEach(m => materials.add(m.uuid));
    const isHand = object.name === 'iss-arm-hand', isBoom = ['iss-arm-upper', 'iss-arm-fore'].includes(object.name);
    if (isHand) hand = object; else mats.forEach(m => otherMaterials.add(m.uuid));
    if (isBoom) booms.push({ name: object.name, parameters: g.parameters, material: material(object.material) });
    records.push({ name: object.name, parent: object._issParentId || null, id: object._issId || null, visitor: object._issVisitorId || null,
      geometry: isHand || isBoom ? 'specified arm geometry' : { type: g.type, parameters: g.parameters || null, attributes: Object.fromEntries(Object.entries(g.attributes).map(([key, attr]) => [key, fingerprint(attr.array)])), index: g.index ? fingerprint(g.index.array) : null },
      position: object.position.toArray(), rotation: object.rotation.toArray(), scale: object.scale.toArray(), materials: isHand || isBoom ? 'specified arm finish' : mats.map(material), visible: object.visible });
  });
  hand.geometry.computeBoundingSphere();
  const sphere = hand.geometry.boundingSphere.clone().applyMatrix4(hand.matrixWorld), center = sphere.center, points = [], position = hand.geometry.getAttribute('position');
  for (let i = 0; i < position.count; i++) points.push(new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(hand.matrixWorld).project(camera).toArray());
  hand.geometry.computeBoundingBox(); const colors = hand.geometry.getAttribute('color'), unique = new Set(); let maxRadius = 0;
  for (let i = 0; i < position.count; i++) { maxRadius = Math.max(maxRadius, Math.hypot(position.getX(i), position.getZ(i))); if (colors) unique.add([colors.getX(i), colors.getY(i), colors.getZ(i)].join(',')); }
  const quaternion = hand.getWorldQuaternion(new THREE.Quaternion()), offset = camera.position.clone().sub(center).applyQuaternion(quaternion.clone().invert());
  const actualAngle = (arm.actual.shoulder + arm.actual.elbow) * Math.PI / 180;
  return { meshCount, materialCount: materials.size, textureCount: maps.size, protected: records.map(record => JSON.stringify(record)).sort(), booms,
    physics: { stationQuaternion: state.stationQuaternion, ...Object.fromEntries(['phase', 'beta', 'arrayAlpha', 'arrayFeather', 'actualAlphaRate', 'actualFeatherRate', 'driveElapsed', 'commandAlpha', 'commandFeather', 'motorRate', 'motorAcceleration', 'incidence', 'generation', 'rate', 'tracking', 'motorEnabled', 'motorSmooth', 'motorBraking', 'eclipse', 'playing', 'sun', 'wingNormal'].map(key => [key, light[key]])) },
    arm: Object.fromEntries(['enabled', 'guides', 'actual', 'target', 'pose', 'base', 'elapsed', 'tipError'].map(key => [key, arm[key]])), data: structuredClone(window.__toolData.spaceStation), camera: state,
    hand: { name: hand.name, scienceId: hand._issScienceId || null, material: material(hand.material), materialId: hand.material.uuid, geometryId: hand.geometry.uuid,
      vertexColors: !!hand.material.vertexColors, colorCount: unique.size, finite: Array.from(position.array).every(Number.isFinite), triangles: (hand.geometry.index?.count || position.count) / 3,
      maxRadius, localBounds: [hand.geometry.boundingBox.min.toArray(), hand.geometry.boundingBox.max.toArray()], sharesMaterial: otherMaterials.has(hand.material.uuid), position: hand.position.toArray(),
      expectedTip: arm.base.map((v, i) => v + arm.pose.tip[i]), direction: new THREE.Vector3(0, 1, 0).applyQuaternion(hand.quaternion).toArray(), expectedDirection: [-Math.sin(actualAngle), Math.cos(actualAngle), 0],
      center: center.toArray(), radius: sphere.radius, quaternion: quaternion.toArray(), localCameraOffset: offset.toArray(), projected: [0, 1, 2].flatMap(axis => [points.reduce((best, point) => point[axis] < best[axis] ? point : best), points.reduce((best, point) => point[axis] > best[axis] ? point : best)]), camera: state,
      pixels: { width: (Math.max(...points.map(p => p[0])) - Math.min(...points.map(p => p[0]))) * cv.clientWidth / 2, height: (Math.max(...points.map(p => p[1])) - Math.min(...points.map(p => p[1]))) * cv.clientHeight / 2 } } };
}

function readStudy() {
  const panel = document.querySelector('[data-iss-grapple-study]'), svg = panel.querySelector('svg'), wires = Array.from(panel.querySelectorAll('[data-iss-capture-wire]'));
  const pin = Array.from(svg.querySelectorAll('circle')).find(circle => Number(circle.getAttribute('r')) === 9);
  if (!pin) throw new Error('Actual SVG grapple shaft circle is absent');
  const center = [Number(pin.getAttribute('cx')), Number(pin.getAttribute('cy'))];
  return { stage: [0, 1, 2].find(i => panel.querySelector('[data-iss-capture-stage="' + i + '"]').getAttribute('aria-pressed') === 'true'), center, pinRadius: Number(pin.getAttribute('r')), pinStroke: Number(pin.getAttribute('stroke-width')),
    pressed: [0, 1, 2].map(i => panel.querySelector('[data-iss-capture-stage="' + i + '"]').getAttribute('aria-pressed') === 'true'),
    wires: wires.map(wire => { const length = wire.getTotalLength(); return { d: wire.getAttribute('d'), strokeWidth: Number(wire.getAttribute('stroke-width')), points: Array.from({ length: 401 }, (_, i) => { const p = wire.getPointAtLength(length * i / 400); return [p.x, p.y]; }) }; }) };
}

function readCleanup() {
  window.__destroy(); window.__grappleQA.mounts.forEach(mount => { mount.closed = true; });
  return window.__grappleQA.mounts.map((mount, index, mounts) => ({ frames: mount.frames, lost: mount.gl.isContextLost(), resources: Object.keys(mount.resources).length,
    handResources: Object.entries(mount.resources).filter(([, resource]) => resource.owners.includes('iss-arm-hand')).map(([id, resource]) => ({ id, ...resource })),
    reused: Object.entries(mount.resources).filter(([id]) => mounts.slice(0, index).some(previous => previous.resources[id])).map(([id, resource]) => ({ id, ...resource })), bad: Object.values(mount.resources).filter(resource => resource.disposals !== 1) }));
}

async function runMount(browser, base, source, width, baseline = null) {
  const result = { width, kind: baseline ? 'candidate' : 'baseline', checks: {}, screenshots: [], errors: [] };
  const height = width < 500 ? 844 : 1080, page = await browser.newPage({ viewport: { width, height }, isMobile: width < 500, hasTouch: width < 500, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000); page.on('pageerror', error => result.errors.push(error.stack || error.message));
  await page.addInitScript(() => { window.AlloPostFXEnabled = false; window.__grappleClock = 0; window.__grappleNativeRAF = requestAnimationFrame.bind(window); window.requestAnimationFrame = callback => window.__grappleNativeRAF(() => callback(window.__grappleClock)); });
  await page.route('**/stem_lab/stem_tool_spacestation.js', route => route.fulfill({ body: source, contentType: 'text/javascript' }));
  await page.route('**/vendor/three-r128/three.min.js', async route => { const response = await route.fetch(); assert(response.ok()); await route.fulfill({ response, body: (await response.text()) + '\n;(' + installObserver.toString() + ')();' }); });
  const canvas = page.locator('.iss-station-stage canvas'), study = page.locator('[data-iss-grapple-study]'), frame = page.locator('[data-iss-camera-fit="grapple"]');
  const activate = locator => width < 500 ? locator.tap() : locator.click();
  const wait = async () => { await page.waitForFunction(() => window.__grappleQA?.draw?.frames > 1 && document.querySelector('.iss-station-stage canvas')?._issArmState && !document.querySelector('.iss-station-stage canvas')._issCameraState().tweening); await page.evaluate(() => new Promise(resolve => window.__grappleNativeRAF(() => window.__grappleNativeRAF(resolve)))); };
  const read = () => page.evaluate(readScene), saved = () => page.evaluate(() => structuredClone(window.__toolData.spaceStation));
  const choose = () => page.locator('#iss-component-topic').selectOption('canadarm2');
  const capture = async (locator, label) => { await locator.scrollIntoViewIfNeeded(); await wait(); const filename = `grapple-${label}-${width}.png`; const clip = await locator.evaluate(node => { const b = node.getBoundingClientRect(); return { x: b.x + scrollX, y: b.y + scrollY, width: b.width, height: b.height }; });
    // CDP captures the compositor directly. Playwright's screenshot animation
    // stabilization waits on the deliberately held simulation RAF timestamp.
    const session = await page.context().newCDPSession(page);
    try { const shot = await session.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: true, clip: { ...clip, scale: 1 } }); await fs.writeFile(path.join(output, filename), Buffer.from(shot.data, 'base64')); result.screenshots.push(filename); }
    finally { await session.detach(); }
  };
  const motion = scene => ({ arm: scene.arm, physics: scene.physics, data: scene.data });
  async function motionSequence() {
    await activate(page.locator('[data-iss-arm-toggle]')); await activate(page.locator('[data-iss-arm-preset="high"]')); await wait();
    if (baseline) { await activate(frame); await wait(); }
    let before = await read(); await activate(page.locator('[data-iss-step-second]')); await wait(); let after = await read();
    if (baseline) verifyFollow(before, after); const sequence = [motion(after)];
    before = after; await canvas.evaluate(cv => cv._issStepLighting(20)); await wait(); after = await read();
    if (baseline) {
      verifyFollow(before, after); const rotationDelta = 1 - Math.abs(after.hand.quaternion.reduce((sum, v, i) => sum + v * before.hand.quaternion[i], 0));
      assert(rotationDelta > 1e-7, 'Explicit step exercises rotational as well as translational follow');
      result.checks.followEvidence = { before: { center: before.hand.center, quaternion: before.hand.quaternion, offset: before.hand.localCameraOffset }, after: { center: after.hand.center, quaternion: after.hand.quaternion, offset: after.hand.localCameraOffset }, rotationDelta };
    }
    sequence.push(motion(after));
    await activate(page.locator('[data-iss-arm-preset="wide"]')); await wait(); before = await read();
    await activate(page.locator('[data-iss-lighting-play]'));
    for (let i = 0; i < 10; i++) await page.evaluate(() => new Promise(resolve => { window.__grappleClock += 100; window.__grappleNativeRAF(() => window.__grappleNativeRAF(resolve)); }));
    await wait(); after = await read(); assert(after.physics.playing); assert(after.arm.elapsed > before.arm.elapsed); if (baseline) verifyFollow(before, after); sequence.push(motion(after));
    if (baseline) { const playing = motion(after); await activate(frame); await wait(); assert.deepEqual(motion(await read()), playing, 'Native inspection preserves active playback'); await activate(study.locator('[data-iss-capture-stage="1"]')); assert.deepEqual(motion(await read()), playing, 'Conceptual capture preserves active playback'); await activate(study.locator('[data-iss-capture-stage="0"]')); }
    await activate(page.locator('[data-iss-lighting-play]')); await wait(); assert.equal((await read()).physics.playing, false); return sequence;
  }
  try {
    await page.goto(base + '/?tab=map'); await wait();
    await page.evaluate(() => { document.querySelector('.iss-station-stage canvas')._issSetLighting({ playing: false }); window.__setToolData(previous => ({ ...previous, spaceStation: { ...previous.spaceStation,
      opsOrbitMinute: 37.12345, opsWaterDay: 12.5, opsPressureMinute: 7.25, opsPrediction: 'Keep draft prediction', opsLog: ['Keep notebook note'],
      opsTrials: [{ id: 71, label: 'Saved trial', setup: { opsBattery: 65 }, results: { batteryMin: 42 }, prediction: 'Saved prediction', reflection: 'Saved explanation' }], opsTrialSelected: 71, opsTrialCompare: 'current', opsTrajectoryOpen: true, opsTrajectoryMetric: 'cmg', opsTrajectoryMinute: 40 } })); });
    await page.waitForFunction(() => window.__toolData.spaceStation.opsOrbitMinute === 37.12345);
    await choose(); await activate(page.locator('[data-iss-lighting-preset="noon"]')); await wait(); result.initial = await read();
    if (!baseline) { result.motionSequence = await motionSequence(); result.cleanup = await page.evaluate(readCleanup); verifyCleanup(result.cleanup, false); result.hostErrors = await page.evaluate(() => window.__events.errors); assert.deepEqual(result.errors, []); assert.deepEqual(result.hostErrors, []); result.passed = true; console.log(`Grapple baseline ${width}px: protected scene and deterministic native motion captured`); return result; }
    verifyProtected(baseline.initial, result.initial); verifyHand(result.initial.hand);
    result.checks.protected = { meshes: result.initial.meshCount, materialDelta: result.initial.materialCount - baseline.initial.materialCount, textures: result.initial.textureCount, protectedCount: result.initial.protected.length, hash: hash(JSON.stringify(result.initial.protected)) };
    const beforeFit = await read(); await frame.focus(); await page.keyboard.press('Enter'); await wait(); let scene = await read(); verifyHand(scene.hand, true);
    assert.deepEqual(motion(scene), motion(beforeFit)); assert(await page.locator('[data-iss-grapple-caption]').isVisible()); result.checks.fit = scene.hand;
    await capture(page.locator('.iss-station-stage'), 'day'); await capture(study, 'study'); console.log(`Grapple ${width}px: first close daylight view ready`);
    if (process.argv.includes('--visual-only')) { result.visualOnly = true; result.cleanup = await page.evaluate(readCleanup); verifyCleanup(result.cleanup, true); result.passed = true; return result; }
    const studyBefore = await read(); const initialStudy = await page.evaluate(readStudy); verifyStudy(initialStudy, 0); result.checks.study = [initialStudy];
    for (const stage of [1, 2, 0]) { const button = study.locator(`[data-iss-capture-stage="${stage}"]`); await button.focus(); await page.keyboard.press(stage === 1 ? 'Space' : 'Enter'); const value = await page.evaluate(readStudy); verifyStudy(value, stage, initialStudy); result.checks.study.push(value); }
    assert.deepEqual(motion(await read()), motion(studyBefore)); assert.deepEqual(stableCamera((await read()).camera), stableCamera(studyBefore.camera));
    const text = await study.innerText(); assert(/snare/i.test(text) && /rigid|seat|latch/i.test(text) && /2001|2017|2018/.test(text));
    result.checks.links = await study.locator('a').evaluateAll(nodes => nodes.map(a => ({ url: a.href, target: a.target, rel: a.rel })));
    assert(result.checks.links.length); result.checks.links.forEach(link => { const url = new URL(link.url); assert.equal(url.protocol, 'https:'); assert(/(^|\.)(nasa\.gov|asc-csa\.gc\.ca|canada\.ca)$/.test(url.hostname)); assert.equal(link.target, '_blank'); assert(link.rel.split(/\s+/).includes('noopener')); });
    await page.addScriptTag({ path: path.join(ROOT, 'desktop/web-app/node_modules/axe-core/axe.min.js') });
    result.checks.axe = await page.evaluate(async () => { const checked = await axe.run({ include: ['[data-iss-grapple-study]', '[data-iss-component-guide]', '[data-iss-grapple-caption]'] }, { rules: { region: { enabled: false } } }); return { passes: checked.passes.length, violations: checked.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) }; });
    assert.deepEqual(result.checks.axe.violations, []);
    result.checks.layout = await study.evaluate(node => ({ document: document.documentElement.scrollWidth - innerWidth, panel: node.scrollWidth - node.clientWidth, overflow: Array.from(node.querySelectorAll('p,h3,h4,button')).filter(n => n.scrollWidth > n.clientWidth + 1).map(n => n.textContent), proseFonts: Array.from(node.querySelectorAll('p')).map(n => parseFloat(getComputedStyle(n).fontSize)) }));
    assert(result.checks.layout.document <= 1 && result.checks.layout.panel <= 1); assert.deepEqual(result.checks.layout.overflow, []); assert(result.checks.layout.proseFonts.every(size => size >= 12));
    await page.setViewportSize({ width: width < 500 ? 320 : 960, height }); await wait(); verifyHand((await read()).hand, true); await page.setViewportSize({ width, height }); await wait(); result.checks.resize = true;
    result.motionSequence = await motionSequence(); assert.deepEqual(result.motionSequence, baseline.motionSequence, 'Native step, explicit step and live RAF produce byte-equivalent baseline arm and physics outputs');
    result.checks.liveAndExplicitFollow = true; console.log(`Grapple ${width}px: baseline motion, moving follow, diagram and axe passed`);

    // An outward camera constraint must apply throughout close native orbit.
    await canvas.scrollIntoViewIfNeeded(); await canvas.focus();
    for (const key of ['ArrowUp', 'ArrowDown']) { for (let i = 0; i < 30; i++) await page.keyboard.press(key); await wait(); verifyHand((await read()).hand, true); }
    result.checks.outwardOrbit = true;
    const stops = [];
    for (const key of ['Shift+ArrowRight', 'Home', 'f']) {
      await activate(frame); await wait(); await canvas.focus(); await page.keyboard.press(key); await wait(); const before = await read();
      assert.notEqual(before.camera.focusId, 'grapple'); assert.equal(await page.locator('[data-iss-grapple-caption]').isVisible(), false);
      await canvas.evaluate(cv => cv._issStepLighting(.25)); await wait(); const after = await read(); vectorNear(after.camera.position, before.camera.position); vectorNear(after.camera.target, before.camera.target); stops.push({ key, camera: after.camera });
    }
    result.checks.stopFollow = stops;

    // Pick the physical hand while another module is selected. No XP or module
    // discovery may result from a science inspection.
    await activate(page.locator('.iss-module-picker').getByRole('button', { name: /^Destiny$/i })); await choose(); await activate(frame); await wait();
    const beforePick = await saved(); await canvas.scrollIntoViewIfNeeded(); await canvas.focus(); await page.keyboard.press('Shift+ArrowRight'); await wait();
    assert.notEqual((await read()).camera.focusId, 'grapple');
    const point = await page.evaluate(() => { const draw = window.__grappleQA.draw, mesh = draw.scene.getObjectByName('iss-arm-hand'), cv = document.querySelector('.iss-station-stage canvas'), box = cv.getBoundingClientRect();
      const p = mesh.localToWorld(new THREE.Vector3(.053, .07, 0)).project(draw.camera), ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2(p.x, p.y), draw.camera);
      const meshes = []; draw.scene.traverse(object => { if (object.isMesh && (object._issId || object._issParentId || object._issVisitorId || object._issScienceId)) { let a = object; while (a && a.visible) a = a.parent; if (!a) meshes.push(object); } });
      return { x: box.left + (p.x + 1) * box.width / 2, y: box.top + (1 - p.y) * box.height / 2, hit: ray.intersectObjects(meshes, false)[0]?.object.name }; });
    assert.equal(point.hit, 'iss-arm-hand');
    if (width >= 500) { await page.mouse.move(point.x, point.y); await page.waitForFunction(() => { const label = document.querySelector('[data-iss-hover-name]'); return document.querySelector('.iss-station-stage canvas')._issHoverId === 'grapple' && /grapple|end effector/i.test(label?.textContent || '') && Number(getComputedStyle(label).opacity) > .9; }); result.checks.hover = await page.locator('[data-iss-hover-name]').innerText(); }
    if (width < 500) await page.touchscreen.tap(point.x, point.y); else await page.mouse.click(point.x, point.y); await wait(); verifyHand((await read()).hand, true); assert.deepEqual(await saved(), beforePick); assert.equal(await canvas.evaluate(cv => cv._issHoverId), null); result.checks.nativePick = point;
    await activate(page.locator('[data-iss-cutaway]')); await wait(); near((await read()).hand.material.opacity, 1); await canvas.focus(); await page.keyboard.press('Home'); await wait(); near((await read()).hand.material.opacity, 1);
    await activate(page.locator('[data-iss-cutaway]')); await activate(frame); await wait(); result.checks.cutaway = true;
    assert.deepEqual(independent(await saved()), independent(studyBefore.data));
    await activate(page.locator('[data-iss-lighting-preset="midnight"]')); await wait(); scene = await read(); verifyHand(scene.hand, true); assert(scene.physics.eclipse); assert.equal(scene.hand.material.emissive, 0); await capture(page.locator('.iss-station-stage'), 'eclipse'); result.checks.eclipse = { physics: scene.physics, hand: scene.hand };
    const seed = await saved(); result.cleanup = await page.evaluate(readCleanup); verifyCleanup(result.cleanup, true);
    await page.evaluate(seed => window.__mount(seed), seed); await wait(); await choose(); await activate(frame); await wait(); verifyHand((await read()).hand, true); result.finalCleanup = await page.evaluate(readCleanup); verifyCleanup(result.finalCleanup, true); result.checks.remount = true;
    result.hostErrors = await page.evaluate(() => window.__events.errors); assert.deepEqual(result.errors, []); assert.deepEqual(result.hostErrors, []); result.passed = true;
    console.log(`Grapple ${width}px: native pick, orbit, stop-follow, day/eclipse and two clean mounts passed`); return result;
  } catch (error) { result.passed = false; result.failure = error.stack || error.message; result.lastScene = await read().catch(() => null); await capture(page.locator('.iss-station-stage'), 'failure').catch(() => {}); error.qaResult = result; throw error; }
  finally { await page.evaluate(() => window.__destroy?.()).catch(() => {}); await page.close(); }
}

function selftest() {
  const hand = { name: 'iss-arm-hand', scienceId: 'grapple', material: { type: 'MeshStandardMaterial', emissive: 0, map: null }, vertexColors: true, colorCount: 4, finite: true, triangles: 500, maxRadius: .075, localBounds: [[-.075, -.08, -.075], [.075, .08, .075]], sharesMaterial: false, position: [1, 2, 3], expectedTip: [1, 2, 3], direction: [0, 1, 0], expectedDirection: [0, 1, 0] }; verifyHand(hand);
  let mutants = 0;
  for (const change of [v => { v.material.emissive = 1; }, v => { v.sharesMaterial = true; }, v => { v.position[1] = 0; }, v => { v.colorCount = 1; }, v => { v.scienceId = 'truss'; }, v => { v.maxRadius = .09; }, v => { v.direction[1] = -1; }]) { const v = structuredClone(hand); change(v); assert.throws(() => verifyHand(v)); mutants++; }
  const camera = { focusId: 'grapple', fit: 'grapple', tweening: false, minDistance: .5, distance: .5, target: [1, 2, 3], fitCenter: [1, 2, 3], fitRadius: .1 };
  const followed = { camera, hand: { ...structuredClone(hand), camera, center: [1, 2, 3], radius: .1, localCameraOffset: [0, .5, 0], projected: [[0, 0, 0], [.2, .2, .2]], pixels: { width: 60, height: 60 } } };
  const previous = structuredClone(followed); previous.hand.center = [0, 2, 3]; verifyFollow(previous, followed);
  for (const change of [v => { v.hand.localCameraOffset = [.1, Math.sqrt(.24), 0]; }, v => { v.hand.camera.target[0] = 0; }, v => { v.hand.localCameraOffset[1] = -.5; }, v => { v.hand.projected[0][0] = 2; }, v => { v.hand.center = previous.hand.center; v.hand.camera.target = previous.hand.center; v.hand.camera.fitCenter = previous.hand.center; }]) { const v = structuredClone(followed); change(v); assert.throws(() => verifyFollow(previous, v)); mutants++; }
  const before = { meshCount: 286, materialCount: 50, textureCount: 10, protected: ['kept'], physics: { phase: 0 }, data: { note: 'keep' }, arm: { actual: [1, 2] }, booms: [1.4, 1.2].map(height => ({ parameters: { radialSegments: 8, height, radiusTop: .05, radiusBottom: .05 }, material: { color: 0xd9d2c0, emissive: 0, roughness: .5 } })) }, after = { ...structuredClone(before), materialCount: 51 };
  after.booms.forEach(boom => { boom.parameters.radialSegments = 24; boom.material.color = 0xe2e5e3; boom.material.roughness = .6; }); verifyProtected(before, after);
  for (const change of [v => { v.protected[0] = 'changed'; }, v => { v.meshCount++; }, v => { v.data.note = ''; }, v => { v.arm.actual[0]++; }, v => { v.textureCount++; }, v => { v.materialCount++; }, v => { v.booms[0].parameters.height++; }, v => { v.booms[1].material.emissive = 1; }]) { const v = structuredClone(after); change(v); assert.throws(() => verifyProtected(before, v)); mutants++; }
  const fixture = stage => ({ stage, center: [0, 0], pinRadius: 9, pinStroke: 2, pressed: [0, 1, 2].map(i => i === stage), wires: [0, 1, 2].map(i => { const angle = i * Math.PI * 2 / 3, rotate = ([x, y]) => [x * Math.cos(angle) - y * Math.sin(angle), x * Math.sin(angle) + y * Math.cos(angle)]; return { strokeWidth: 4, points: [[-60, 60], [0, stage === 0 ? 44 : 12], [60, 60]].map(rotate) }; }) }); verifyStudy(fixture(1), 1, fixture(0));
  for (const change of [v => { v.wires.pop(); }, v => { v.wires[0].points[1] = [0, 3]; }, v => { v.wires[1].points[0][0]++; }, v => { v.pressed[1] = false; }, v => { v.wires[0].strokeWidth = 8; }]) { const v = fixture(1); change(v); assert.throws(() => verifyStudy(v, 1, fixture(0))); mutants++; }
  const clean = [{ lost: true, frames: 3, resources: 2, handResources: [{ id: 'geometry', owners: ['iss-arm-hand'] }, { id: 'material', owners: ['iss-arm-hand'] }], bad: [] }]; verifyCleanup(clean, true);
  for (const change of [v => { v[0].bad = [{ disposals: 0 }]; }, v => { v[0].handResources[1].owners.push('joint'); }]) { const v = structuredClone(clean); change(v); assert.throws(() => verifyCleanup(v, true)); mutants++; }
  console.log(`Grapple QA selftest: ${mutants} geometry, preservation, snare and disposal mutants rejected.`);
}

async function main() {
  assert(output.startsWith(ROOT + path.sep)); assert(widths.length && widths.every(width => Number.isInteger(width) && width >= 320));
  const sourcePath = path.join(ROOT, 'stem_lab/stem_tool_spacestation.js'), source = await fs.readFile(sourcePath, 'utf8'); assert(source.includes('data-iss-grapple-study') && source.includes("_issScienceId = 'grapple'"), 'Wait for grapple source readiness');
  const baselinePath = path.resolve(ROOT, argument('--baseline', '.tmp/space-station-arm-grapple-01a185d3/source-before.js')), before = await fs.readFile(baselinePath, 'utf8'); assert(!before.includes('data-iss-grapple-study'));
  await fs.mkdir(output, { recursive: true }); const report = { sourceSha256: hash(source), baselineSha256: hash(before), driverSha256: hash(await fs.readFile(__filename)), started: new Date().toISOString(), visualOnly: process.argv.includes('--visual-only'), results: [] };
  const priorPath = argument('--reuse-report', ''), prior = priorPath ? JSON.parse(await fs.readFile(path.resolve(ROOT, priorPath), 'utf8')) : null; if (prior) assert.equal(prior.baselineSha256, report.baselineSha256);
  const preview = await createPreview(); let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    for (const width of widths) {
      try { const reused = prior?.results.find(result => result.kind === 'baseline' && result.width === width && result.passed); const baseline = reused || await runMount(browser, preview.base, before, width); if (reused) report.reusedBaseline = path.resolve(ROOT, priorPath); else report.results.push(baseline); report.results.push(await runMount(browser, preview.base, source, width, baseline)); }
      catch (error) { report.results.push(error.qaResult || { width, passed: false, failure: error.stack }); throw error; }
      finally { await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(report, null, 2)); }
    }
  } finally { report.finished = new Date().toISOString(); report.sourceUnchanged = hash(await fs.readFile(sourcePath, 'utf8')) === report.sourceSha256; await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(report, null, 2)); if (browser) await browser.close(); await new Promise(resolve => preview.server.close(resolve)); }
  assert(report.sourceUnchanged, 'Source remained fixed during native verification');
}
if (require.main === module) { if (process.argv.includes('--selftest')) selftest(); else main().catch(error => { console.error(error.stack || error); process.exitCode = 1; }); }
module.exports = { verifyHand, verifyProtected, verifyFollow, verifyStudy, verifyCleanup, selftest };
