import fs from 'node:fs';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

// Shipped Three scene and geometry; only GPU drawing and text painting stubbed.
let THREE, gl, rendered, frameId = 0, modelId = 0, renderCount = 0;
const frames = new Map(), canvases = [];
const depthNames = ['surface', '70 km', '300 km', '700 km'];
const points = [
  { x: -120.125, z: 45.375 }, { x: -120.125, z: 110.625 },
  { x: 245.375, z: 185.625 }, { x: 200.625, z: 350.875 }, { x: 200.625, z: 350.875 }
];

beforeAll(() => {
  window.HTMLCanvasElement.prototype.getContext = () => new Proxy({
    measureText: text => ({ width: String(text).length * 23 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} })
  }, { get: (target, key) => key in target ? target[key] : () => {}, set: (target, key, value) => { target[key] = value; return true; } });
  window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  globalThis.requestAnimationFrame = window.requestAnimationFrame = callback => { frames.set(++frameId, callback); return frameId; };
  globalThis.cancelAnimationFrame = window.cancelAnimationFrame = id => frames.delete(id);
  for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'vendor/three-r128/three.min.js']) (0, eval)(fs.readFileSync(file, 'utf8'));
  THREE = window.THREE;
  THREE.WebGLRenderer = class {
    constructor(options) { this.domElement = options.canvas; }
    setClearColor() {} setPixelRatio() {} setSize() {} dispose() {}
    getContext() { return { isContextLost: () => false }; }
    render(scene, camera) { renderCount++; scene.updateMatrixWorld(true); camera.updateMatrixWorld(true); rendered = { scene, camera }; }
  };
  (0, eval)(fs.readFileSync('stem_lab/stem_lab_module.js', 'utf8'));
  window.StemLab.ensureThree = () => Promise.resolve(THREE);
  (0, eval)(fs.readFileSync(process.env.PT_TEST_SOURCE || 'stem_lab/stem_tool_platetectonics.js', 'utf8'));
  gl = window.__alloTectGL; expect(gl).toBeTruthy();
});
afterEach(() => {
  gl?.unmount(); frames.clear(); rendered = null; renderCount = 0;
  while (canvases.length) canvases.pop().remove();
  vi.restoreAllMocks();
});
function frame(count = 1) {
  for (let i = 0; i < count; i++) {
    const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(performance.now()));
  }
}
async function mountModel(extra = {}, initialWidth = 141, initialHeight = 300) {
  let width = initialWidth, height = initialHeight, onResize;
  globalThis.ResizeObserver = window.ResizeObserver = class { constructor(callback) { onResize = callback; } observe() {} disconnect() {} };
  const canvas = document.createElement('canvas'); canvases.push(canvas); document.body.appendChild(canvas);
  Object.defineProperty(canvas, 'clientWidth', { get: () => width }); Object.defineProperty(canvas, 'clientHeight', { get: () => height });
  let model = {
    mode: 'convergent', mountainHeight: 3000, rift: 60, offset: 100, quakes: [],
    rotX: 0, rotY: 0, scale: 1, cut: 0, showScale: true, surfaceView: false,
    observationProjection: null, observationSample: null, ...extra, sig: String(++modelId)
  };
  gl.submit(model); gl.mount(canvas); await Promise.resolve(); await Promise.resolve(); frame();
  expect(gl.debug().state).toBe('ready'); expect(rendered).toBeTruthy();
  return {
    get model() { return model; }, get scene() { return rendered.scene; }, get camera() { return rendered.camera; },
    get width() { return width; }, get height() { return height; },
    update(patch, cameraOnly = false) { model = { ...model, ...patch, sig: cameraOnly ? model.sig : String(++modelId) }; gl.submit(model); frame(); },
    resize(nextWidth, nextHeight) { width = nextWidth; height = nextHeight; onResize(); frame(); }
  };
}
function objects(model, predicate) { const all = []; model.scene.traverse(object => { if (predicate(object)) all.push(object); }); return all; }
function feature(model, name) { return objects(model, object => object.userData.feature === name); }
function pixels(model, point) { const p = point.clone().project(model.camera); return { x: (p.x + 1) * model.width / 2, y: (1 - p.y) * model.height / 2 }; }
function spriteRect(model, sprite) {
  const world = sprite.getWorldPosition(new THREE.Vector3()), p = pixels(model, world), scale = sprite.getWorldScale(new THREE.Vector3());
  const depth = -world.applyMatrix4(model.camera.matrixWorldInverse).z;
  const factor = model.height / (2 * depth * Math.tan(model.camera.fov * Math.PI / 360));
  return { text: sprite.userData.label, x: p.x - scale.x * factor / 2, y: p.y - scale.y * factor / 2, width: scale.x * factor, height: scale.y * factor };
}
function geometryRect(model, mesh, instanceIndex) {
  const transform = mesh.matrixWorld.clone();
  if (instanceIndex !== undefined) { const instance = new THREE.Matrix4(); mesh.getMatrixAt(instanceIndex, instance); transform.multiply(instance); }
  const positions = mesh.geometry.attributes.position; let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
  for (let i = 0; i < positions.count; i++) {
    const p = pixels(model, new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(transform));
    left = Math.min(left, p.x); right = Math.max(right, p.x); top = Math.min(top, p.y); bottom = Math.max(bottom, p.y);
  }
  return { x: left, y: top, width: right - left, height: bottom - top };
}
function depthSprites(model) {
  const all = objects(model, object => object.isSprite && depthNames.includes(object.userData.label));
  expect(all).toHaveLength(4); return depthNames.map(name => all.find(object => object.userData.label === name));
}
function depthRects(model) { return depthSprites(model).map(sprite => spriteRect(model, sprite)); }
function originalStack(model) {
  // The fallback preserves the former ruler, whose label bases sit 12 units
  // to the right and 4 units in front of their true depth targets.
  const rects = depthRects(model); let previous = -Infinity;
  const result = rects.map((rect, i) => {
    const km = [0, 70, 300, 700][i], cut = model.model.cut == null ? 25 : model.model.cut;
    const base = pixels(model, new THREE.Vector3(-68, -km * .1, cut + 4));
    let centre = Math.max(rect.height / 2 + 8, Math.min(model.height - rect.height / 2 - 8, base.y));
    centre = Math.max(centre, previous + rect.height + 4); previous = centre;
    return { ...rect, x: 10, y: centre - rect.height / 2 };
  });
  const overflow = Math.max(0, previous - (model.height - rects[0].height / 2 - 8));
  result.forEach(rect => { rect.y -= overflow; }); return result;
}
function separated(a, b, gap = 0) {
  return a.x + a.width + gap <= b.x + .01 || b.x + b.width + gap <= a.x + .01 ||
    a.y + a.height + gap <= b.y + .01 || b.y + b.height + gap <= a.y + .01;
}
function expectStack(model) {
  const rects = depthRects(model); expect(rects.map(rect => rect.text)).toEqual(depthNames);
  rects.forEach((rect, i) => {
    expect(rect.height).toBeGreaterThanOrEqual(19.99);
    expect(rect.x).toBeGreaterThanOrEqual(-.01); expect(rect.y).toBeGreaterThanOrEqual(-.01);
    expect(rect.x + rect.width).toBeLessThanOrEqual(model.width + .01); expect(rect.y + rect.height).toBeLessThanOrEqual(model.height + .01);
    if (i) expect(rect.y).toBeGreaterThanOrEqual(rects[i - 1].y + rects[i - 1].height + 3.99);
  });
  return rects;
}
function expectTrueTargets(model) {
  const cut = model.model.cut == null ? 25 : model.model.cut;
  const leaders = feature(model, 'reading-label-leader');
  for (const [i, km] of [0, 70, 300, 700].entries()) {
    const leader = leaders.find(line => {
      const p = line.geometry.attributes.position; return p.getX(0) === -80 && p.getY(0) === -km * .1 && p.getZ(0) === cut;
    });
    expect(leader, 'the ' + km + ' km label has its true ruler target').toBeTruthy();
    const p = leader.geometry.attributes.position, sprite = depthSprites(model)[i];
    expect(p.getX(1)).toBeCloseTo(sprite.position.x, 4); expect(p.getY(1)).toBeCloseTo(sprite.position.y, 4); expect(p.getZ(1)).toBeCloseTo(sprite.position.z, 4);
  }
  const ticks = objects(model, object => object.userData.depthGuide === 'tick'); expect(ticks).toHaveLength(4);
  ticks.forEach(tick => { const p = tick.geometry.attributes.position; expect(p.getY(0)).toBe(-tick.userData.depthKm * .1); expect(p.getY(1)).toBe(-tick.userData.depthKm * .1); expect(p.getZ(0)).toBe(cut); expect(p.getZ(1)).toBe(cut); });
}
function expectIdentitiesClear(model) {
  const identities = feature(model, 'plate-identity'); expect(identities).toHaveLength(2);
  for (const depth of depthRects(model)) for (const identity of identities) expect(separated(depth, spriteRect(model, identity), 3.99), depth.text + ' covers plate ' + identity.userData.label).toBe(true);
}
function sampleBatch(model) { return model.scene.getObjectByName('observation-sample-marker-batch'); }
function sampleEvidence(model, records = points) {
  const core = sampleBatch(model); expect(core.count).toBe(records.length);
  expect(gl.debug().observationSample.points.map(point => [point.index, point.x, point.z])).toEqual(records.map((point, index) => [index, point.x, point.z]));
  records.forEach((point, i) => {
    const matrix = new THREE.Matrix4(); core.getMatrixAt(i, matrix); const p = new THREE.Vector3().setFromMatrixPosition(matrix);
    expect(p.x).toBeCloseTo(point.x * .1, 5); expect(p.y).toBeCloseTo(-point.z * .1, 5); expect(p.z).toBeCloseTo(-.04, 5);
  });
}
function expectSampleClear(model) {
  const halo = model.scene.getObjectByName('observation-sample-halo-batch');
  for (let i = 0; i < halo.count; i++) for (const depth of depthRects(model)) expect(separated(depth, geometryRect(model, halo, i), 3.99), depth.text + ' covers sample ' + i).toBe(true);
  for (const marker of feature(model, 'observation-marker-halo')) for (const depth of depthRects(model)) expect(separated(depth, geometryRect(model, marker), 3.99), depth.text + ' covers the selected event').toBe(true);
}
function retained(model) {
  const slab = model.scene.children.find(object => object.isMesh && object.rotation.z < -.1);
  const mantle = feature(model, 'solid-mantle-envelope')[0], core = sampleBatch(model), halo = model.scene.getObjectByName('observation-sample-halo-batch');
  expect(slab).toBeTruthy(); expect(mantle).toBeTruthy();
  const saved = [slab, mantle, core, halo].filter(Boolean).map(object => ({ object, geometry: object.geometry }));
  const builds = gl.debug().geometryBuilds;
  return () => { for (const entry of saved) { expect(objects(model, object => object === entry.object)).toHaveLength(1); expect(entry.object.geometry).toBe(entry.geometry); } expect(gl.debug().geometryBuilds).toBe(builds); };
}

describe('Ordered depth captions clear fixed scene evidence on a narrow cut face', () => {
  it('keeps the 141px ruler clear of plate identities and the real internal focus and surface marker', async () => {
    const quake = { depthKm: 110.625, distKm: -120.125, strikeKm: 0, m: 4 };
    const model = await mountModel({ quakes: [quake] }); expectStack(model); expectTrueTargets(model); expectIdentitiesClear(model);
    const surface = feature(model, 'focus-surface-projection'); expect(surface).toHaveLength(1);
    for (const depth of depthRects(model)) expect(separated(depth, geometryRect(model, surface[0]), 3.99), depth.text + ' covers the surface marker').toBe(true);
    const live = objects(model, object => object.isInstancedMesh && object.count === 1);
    expect(live).toHaveLength(1);
    for (const depth of depthRects(model)) expect(separated(depth, geometryRect(model, live[0], 0), 3.99), depth.text + ' covers the internal focus').toBe(true);
    expect(gl.debug().focusAnnotation).toEqual({ depthKm: quake.depthKm, point: { x: quake.distKm * .1, y: -quake.depthKm * .1, z: 0 }, surface: { x: quake.distKm * .1, y: 0, z: 0 } });
  });

  it('moves depth captions around signed and coincident checked records while preserving the selected raw event', async () => {
    const original = structuredClone(points), selected = { ...points[1], index: 1, captured: true };
    const model = await mountModel({ observationSample: { points, captured: true }, observationProjection: selected });
    expectStack(model); expectTrueTargets(model); expectIdentitiesClear(model); expectSampleClear(model); sampleEvidence(model);
    expect(gl.debug().observationProjection).toMatchObject({ visible: true, index: 1, distanceKm: points[1].x, depthKm: points[1].z, captured: true });
    expect(gl.debug().observationProjection.point).toEqual([points[1].x * .1, -points[1].z * .1, -.02]);
    const a = new THREE.Matrix4(), b = new THREE.Matrix4(); sampleBatch(model).getMatrixAt(3, a); sampleBatch(model).getMatrixAt(4, b); expect(a.elements).toEqual(b.elements);
    expect(points).toEqual(original); expect(selected).toEqual({ ...points[1], index: 1, captured: true });
  });

  it('repeats the narrow layout after resize and a rear-view round trip without replacing rock or pooled records', async () => {
    const model = await mountModel({ observationSample: { points, captured: true }, observationProjection: { ...points[1], index: 1, captured: true } });
    const keep = retained(model), narrow = depthRects(model); expectStack(model); expectSampleClear(model);
    for (const [width, height] of [[334,300],[900,500],[141,300]]) {
      model.resize(width, height); expectTrueTargets(model); expectIdentitiesClear(model); expectSampleClear(model); sampleEvidence(model); keep();
      if (width < 420) expectStack(model);
    }
    expect(depthRects(model)).toEqual(narrow);
    model.update({ rotY: 180 }, true); expect(gl.debug().observationSample.visible).toBe(false); expect(sampleBatch(model).count).toBe(0); keep();
    model.update({ rotY: 0 }, true); expectStack(model); expectSampleClear(model); sampleEvidence(model); keep(); expect(depthRects(model)).toEqual(narrow);
  });

  it('retains depth sprite textures, leader targets, layout, camera and event values through both themes', async () => {
    const model = await mountModel({ observationSample: { points, captured: true }, observationProjection: { ...points[1], index: 1, captured: true } });
    const sprites = depthSprites(model), leaders = feature(model, 'reading-label-leader').filter(line => line.geometry.attributes.position.getX(0) === -80);
    const saved = [...sprites, ...leaders].map(object => ({ object, geometry: object.geometry, material: object.material, map: object.material.map }));
    const resources = new Set(saved.flatMap(entry => [entry.material, entry.map, entry.object.isSprite ? null : entry.geometry]).filter(Boolean));
    const disposals = [...resources].map(resource => vi.spyOn(resource, 'dispose'));
    const rects = depthRects(model), camera = model.camera.matrixWorld.elements.slice(), projection = model.camera.projectionMatrix.elements.slice(), keep = retained(model);
    for (const darkMode of [true, false]) {
      model.update({ darkMode }); expectStack(model); expectTrueTargets(model); expectIdentitiesClear(model); expectSampleClear(model); sampleEvidence(model); keep();
      expect(depthRects(model)).toEqual(rects); expect(model.camera.matrixWorld.elements).toEqual(camera); expect(model.camera.projectionMatrix.elements).toEqual(projection);
      saved.forEach(entry => { expect(objects(model, object => object === entry.object)).toHaveLength(1); expect(entry.object.geometry).toBe(entry.geometry); expect(entry.object.material).toBe(entry.material); expect(entry.object.material.map).toBe(entry.map); });
      disposals.forEach(dispose => expect(dispose).not.toHaveBeenCalled());
    }
  });

  it('settles the crowded ruler without repeated layouts, draw calls, matrix writes or callbacks for 1200 frames', async () => {
    const callbacks = Object.fromEntries(['onReady', 'onFail', 'onInspection'].map(key => [key, vi.fn()]));
    const model = await mountModel({ ...callbacks, observationSample: { points, captured: true }, observationProjection: { ...points[1], index: 1, captured: true } });
    expectStack(model); expectSampleClear(model); Object.values(callbacks).forEach(callback => callback.mockClear());
    const core = sampleBatch(model), version = core.instanceMatrix.version, draws = renderCount, rects = depthRects(model), keep = retained(model);
    const leaders = feature(model, 'reading-label-leader'), leaderVersions = leaders.map(line => line.geometry.attributes.position.version);
    frame(1200);
    expect(renderCount).toBe(draws); expect(core.instanceMatrix.version).toBe(version); expect(depthRects(model)).toEqual(rects); keep();
    expect(leaders.map(line => line.geometry.attributes.position.version)).toEqual(leaderVersions); sampleEvidence(model);
    Object.values(callbacks).forEach(callback => expect(callback).not.toHaveBeenCalled());
  });

  it('preserves the entire original stack when a real halo makes its fixed column infeasible', async () => {
    const model = await mountModel({}, 141, 112), original = originalStack(model);
    // Establish the specimen's usable original ruler before adding the halo.
    original.forEach((rect, i) => {
      expect(rect.y).toBeGreaterThanOrEqual(0); expect(rect.y + rect.height).toBeLessThanOrEqual(model.height);
      if (i) expect(rect.y).toBeGreaterThanOrEqual(original[i - 1].y + original[i - 1].height + 3.99);
    });
    // Place the actual record at the middle of the common label column using
    // the camera ray, rather than assuming a world point lands there.
    const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2(40 / model.width * 2 - 1, 0), model.camera);
    const world = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), .04), new THREE.Vector3());
    expect(world).not.toBeNull(); const record = { x: world.x / .1, z: -world.y / .1 };
    expect(Math.abs(record.x)).toBeLessThan(760); expect(record.z).toBeGreaterThanOrEqual(0); expect(record.z).toBeLessThan(800);
    const keep = retained(model); model.update({ observationSample: { points: [record], captured: true } }); keep();
    const halo = model.scene.getObjectByName('observation-sample-halo-batch'); expect(halo.count).toBe(1);
    const obstacle = geometryRect(model, halo, 0);
    expect(obstacle.x + obstacle.width / 2).toBeCloseTo(40, 4); expect(obstacle.y + obstacle.height / 2).toBeCloseTo(model.height / 2, 4);
    original.forEach(rect => { expect(obstacle.x).toBeGreaterThan(rect.x); expect(obstacle.x + obstacle.width).toBeLessThan(rect.x + rect.width); });
    // Every fixed-column caption must lie wholly above or below this halo.
    // Independent packing capacity proves fewer than four rows can fit.
    const height = original[0].height, gap = 4;
    const capacity = length => Math.max(0, Math.floor((length + gap + .001) / (height + gap)));
    const above = obstacle.y - gap - 8, below = model.height - 8 - (obstacle.y + obstacle.height + gap);
    expect(capacity(above) + capacity(below), 'the halo leaves no feasible full four-row stack').toBeLessThan(4);
    const actual = depthRects(model); expect(actual.map(rect => rect.text)).toEqual(depthNames);
    actual.forEach((rect, i) => { expect(rect.x).toBeCloseTo(original[i].x, 5); expect(rect.y).toBeCloseTo(original[i].y, 5); expect(rect.width).toBeCloseTo(original[i].width, 5); expect(rect.height).toBeCloseTo(original[i].height, 5); });
    expectTrueTargets(model); sampleEvidence(model, [record]);
    model.update({ observationSample: null }); expect(sampleBatch(model).count).toBe(0); expectTrueTargets(model); keep();
  });
});
