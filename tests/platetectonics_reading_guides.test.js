import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

// Reuse the existing 3D clarity fixture's real Three.js scene setup. Only
// canvas painting and WebGL drawing are stubbed; material and geometry
// assertions inspect the objects actually passed to the renderer.
const read = file => fs.readFileSync(path.resolve(file), 'utf8');
let THREE, gl, rendered, modelId = 0, frameId = 0, renderCalls = 0;
const frames = new Map(), canvases = [];

beforeAll(() => {
  const context = canvas => new Proxy({
    fillRect(x, y, width, height) {
      (canvas.__rects || (canvas.__rects = [])).push({ x, y, width, height, color: this.fillStyle });
    },
    measureText: text => ({ width: String(text).length * 23 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} })
  }, {
    get: (target, key) => key in target ? target[key] : () => {},
    set: (target, key, value) => { target[key] = value; return true; }
  });
  window.HTMLCanvasElement.prototype.getContext = function () { return context(this); };
  window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  globalThis.ResizeObserver = window.ResizeObserver = class { observe() {} disconnect() {} };
  globalThis.requestAnimationFrame = window.requestAnimationFrame = callback => {
    const id = ++frameId; frames.set(id, callback); return id;
  };
  globalThis.cancelAnimationFrame = window.cancelAnimationFrame = id => frames.delete(id);

  (0, eval)(read('desktop/web-app/node_modules/react/umd/react.production.min.js'));
  (0, eval)(read('vendor/three-r128/three.min.js'));
  THREE = window.THREE;
  expect(THREE).toBeTruthy();
  THREE.WebGLRenderer = class {
    constructor(options) { this.domElement = options.canvas; }
    setClearColor() {} setPixelRatio() {} setSize() {} dispose() {}
    getContext() { return { isContextLost: () => false }; }
    render(scene, camera) {
      scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
      rendered = { scene, camera }; renderCalls++;
    }
  };
  (0, eval)(read('stem_lab/stem_lab_module.js'));
  window.StemLab.ensureThree = () => Promise.resolve(THREE);
  (0, eval)(read('stem_lab/stem_tool_platetectonics.js'));
  gl = window.__alloTectGL;
  expect(gl).toBeTruthy();
});

afterEach(() => {
  gl?.unmount(); vi.restoreAllMocks(); frames.clear(); rendered = null; renderCalls = 0;
  while (canvases.length) canvases.pop().remove();
});

function frame(count = 1) {
  for (let i = 0; i < count; i++) {
    const pending = frames.entries().next().value;
    expect(pending, 'the engine keeps its existing frame scheduler').toBeTruthy();
    frames.delete(pending[0]); pending[1](performance.now());
  }
}

async function mountModel(patch = {}) {
  const canvas = document.createElement('canvas');
  Object.defineProperty(canvas, 'clientWidth', { value: 900 });
  Object.defineProperty(canvas, 'clientHeight', { value: 620 });
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, right: 900, bottom: 620, width: 900, height: 620 });
  document.body.appendChild(canvas); canvases.push(canvas);
  let model = {
    mode: 'convergent', mountainHeight: 3000, rift: 60, offset: 100,
    quakes: [], rotX: 0, rotY: 0, scale: 1, cut: 0,
    showScale: true, surfaceView: false, darkMode: false,
    observationProjection: null, observationSample: null,
    ...patch, sig: String(++modelId)
  };
  gl.submit(model); gl.mount(canvas);
  await Promise.resolve(); await Promise.resolve(); frame();
  expect(gl.debug().state).toBe('ready'); expect(rendered).toBeTruthy();
  return {
    get model() { return model; }, get scene() { return rendered.scene; }, get camera() { return rendered.camera; },
    update(next) { model = { ...model, ...next, sig: String(++modelId) }; gl.submit(model); frame(); }
  };
}

function descendants(scene, predicate) {
  const result = []; scene.traverse(child => { if (predicate(child)) result.push(child); }); return result;
}
const feature = (model, name) => descendants(model.scene, child => child.userData.feature === name);
const depthParts = (model, type) => descendants(model.scene, child => child.userData.depthGuide === type);
const labels = model => descendants(model.scene, child => child.isSprite && typeof child.userData.label === 'string');
const leaders = model => feature(model, 'reading-label-leader');
const positions = object => object.geometry?.attributes.position ? Array.from(object.geometry.attributes.position.array) : null;
const cameraState = model => ({
  world: Array.from(model.camera.matrixWorld.elements), projection: Array.from(model.camera.projectionMatrix.elements)
});

// Expected palettes are tied to the visible depth boundaries, not to the
// source helper implementation. A mislabeled or incompletely updated tick
// must fail even if the implementation chooses the correct colors elsewhere.
const depthColors = {
  light: new Map([[0, 0x475569], [70, 0xc2410c], [300, 0x6d28d9], [700, 0x64748b]]),
  dark: new Map([[0, 0xe2e8f0], [70, 0xfdba74], [300, 0xc4b5fd], [700, 0x94a3b8]])
};
function expectPalette(model, dark) {
  const ticks = depthParts(model, 'tick'), planes = depthParts(model, 'plane');
  expect(ticks.map(part => part.userData.depthKm).sort((a, b) => a - b)).toEqual([0, 70, 300, 700]);
  expect(planes.map(part => part.userData.depthKm).sort((a, b) => a - b)).toEqual([70, 300]);
  for (const part of [...ticks, ...planes]) {
    expect(part.material.color.getHex(), `${part.userData.depthGuide} at ${part.userData.depthKm} km`).toBe(depthColors[dark ? 'dark' : 'light'].get(part.userData.depthKm));
    expect(part.material.opacity).toBeCloseTo(part.userData.depthGuide === 'tick' ? .75 : .07);
  }
  expect(leaders(model).length).toBeGreaterThan(0);
  for (const leader of leaders(model)) {
    expect(leader.material.color.getHex()).toBe(dark ? 0xcbd5e1 : 0x475569);
    expect(leader.material.opacity).toBeCloseTo(.85);
    expect(leader.material.depthTest).toBe(false); expect(leader.material.depthWrite).toBe(false);
  }
}

function retainedResources(model, objects) {
  const resources = new Set();
  const entries = objects.map(object => {
    if (object.geometry && !object.isSprite) resources.add(object.geometry);
    const materials = object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : [];
    materials.forEach(material => { resources.add(material); if (material.map) resources.add(material.map); });
    return { object, geometry: object.geometry, material: object.material, map: object.material?.map,
      materials: materials.map(material => ({ material, map: material.map })),
      positions: positions(object), position: object.position.toArray() };
  });
  const disposals = [...resources].map(resource => vi.spyOn(resource, 'dispose'));
  const camera = cameraState(model), rects = structuredClone(gl.debug().labelRects), builds = gl.debug().geometryBuilds;
  return () => {
    const current = new Set(descendants(model.scene, () => true));
    for (const entry of entries) {
      expect(current.has(entry.object)).toBe(true);
      expect(entry.object.geometry).toBe(entry.geometry); expect(entry.object.material).toBe(entry.material);
      expect(entry.object.material?.map).toBe(entry.map);
      const materials = entry.object.material ? (Array.isArray(entry.object.material) ? entry.object.material : [entry.object.material]) : [];
      entry.materials.forEach((saved, index) => { expect(materials[index]).toBe(saved.material); expect(materials[index].map).toBe(saved.map); });
      expect(positions(entry.object)).toEqual(entry.positions); expect(entry.object.position.toArray()).toEqual(entry.position);
    }
    disposals.forEach(dispose => expect(dispose).not.toHaveBeenCalled());
    expect(cameraState(model)).toEqual(camera); expect(gl.debug().labelRects).toEqual(rects);
    expect(gl.debug().geometryBuilds).toBe(builds);
  };
}

describe('Theme-aware 3D reading guides', () => {
  it.each(['convergent', 'divergent', 'transform'])('updates retained %s depth guides without replacing caption textures or rock', async mode => {
    const model = await mountModel({ mode });
    expectPalette(model, false);
    const rock = descendants(model.scene, child => child.isMesh && child.material && !child.userData.depthGuide && !child.isInstancedMesh);
    const assertRetained = retainedResources(model, [...depthParts(model, 'tick'), ...depthParts(model, 'plane'), ...leaders(model), ...labels(model), ...rock]);
    for (const darkMode of [true, false]) {
      model.update({ darkMode }); expectPalette(model, darkMode); assertRetained();
    }
  });

  it('updates the retained internal focus guide and surface ring while keeping its exact endpoints', async () => {
    const model = await mountModel({ quakes: [{ depthKm: 520, distKm: 505, strikeKm: -120, m: 5 }] });
    const vertical = feature(model, 'focus-depth-guide')[0], ring = feature(model, 'focus-surface-projection')[0];
    expect(vertical).toBeTruthy(); expect(ring).toBeTruthy();
    const assertRetained = retainedResources(model, [vertical, ring, ...leaders(model), ...labels(model)]);
    const annotation = structuredClone(gl.debug().focusAnnotation);
    expect(positions(vertical)).toEqual([50.5, 0, -12, 50.5, -52, -12]);
    for (const darkMode of [true, false]) {
      model.update({ darkMode }); assertRetained();
      expect(vertical.material.color.getHex()).toBe(darkMode ? 0xe2e8f0 : 0x475569);
      expect(ring.material.color.getHex()).toBe(darkMode ? 0xe2e8f0 : 0x475569);
      expect(vertical.material.isLineDashedMaterial).toBe(true);
      expect(vertical.material.dashSize).toBe(1.3); expect(vertical.material.gapSize).toBe(1);
      expect(vertical.material.depthTest).toBe(false); expect(ring.material.depthTest).toBe(false);
      expect(gl.debug().focusAnnotation).toEqual(annotation);
    }
  });

  it('applies the current palette to rebuilt cut faces and restored depth rulers', async () => {
    const model = await mountModel({ darkMode: true });
    for (const cut of [-10, 10]) {
      model.update({ cut }); expectPalette(model, true);
      for (const tick of depthParts(model, 'tick')) {
        const attribute = tick.geometry.attributes.position;
        expect(attribute.getY(0)).toBeCloseTo(-tick.userData.depthKm * .1);
        expect(attribute.getY(1)).toBeCloseTo(-tick.userData.depthKm * .1);
        expect(attribute.getZ(0)).toBeCloseTo(cut); expect(attribute.getZ(1)).toBeCloseTo(cut);
      }
    }
    model.update({ showScale: false });
    expect(depthParts(model, 'tick')).toHaveLength(0); expect(depthParts(model, 'plane')).toHaveLength(0);
    const featureCaptions = labels(model).map(label => label.userData.label).filter(text => text !== 'A' && text !== 'B');
    expect(featureCaptions).toEqual(['trench', 'volcanic arc']);
    model.update({ darkMode: false, showScale: true }); expectPalette(model, false);
  });

  it('updates rebuilt observation leaders without changing records, projected coordinates or picking', async () => {
    const points = [{ x: -120.125, z: 45.375 }, { x: 200.625, z: 350.875 }], original = structuredClone(points);
    const observed = { ...points[1], index: 1, captured: true };
    const model = await mountModel({ observationSample: { points, captured: true }, observationProjection: observed });
    const camera = cameraState(model), builds = gl.debug().geometryBuilds;
    const core = model.scene.getObjectByName('observation-sample-marker-batch'), geometry = core.geometry;
    const scaleTicks = depthParts(model, 'tick');
    const expectedPositions = points.map(point => [point.x * .1, -point.z * .1, -.04]);
    for (const darkMode of [true, false]) {
      model.update({ darkMode }); expectPalette(model, darkMode);
      expect(depthParts(model, 'tick')).toEqual(scaleTicks);
      expect(model.scene.getObjectByName('observation-sample-marker-batch')).toBe(core); expect(core.geometry).toBe(geometry);
      expect(gl.debug().observationProjection).toMatchObject({ visible: true, index: 1, captured: true, distanceKm: observed.x, depthKm: observed.z });
      expect(gl.debug().observationProjection.point).toEqual([observed.x * .1, -observed.z * .1, -.02]);
      expect(gl.debug().observationSample.points.map(point => [point.index, point.x, point.z])).toEqual([[0, points[0].x, points[0].z], [1, points[1].x, points[1].z]]);
      points.forEach((point, index) => {
        const matrix = new THREE.Matrix4(); core.getMatrixAt(index, matrix);
        const actual = new THREE.Vector3().setFromMatrixPosition(matrix).toArray();
        actual.forEach((coordinate, axis) => expect(coordinate).toBeCloseTo(expectedPositions[index][axis], 5));
        const screen = new THREE.Vector3(...expectedPositions[index]).project(model.camera);
        expect(gl.pickObservationSample((screen.x + 1) * 450, (1 - screen.y) * 310)).toEqual({ index, x: point.x, z: point.z, captured: true });
      });
      expect(points).toEqual(original); expect(cameraState(model)).toEqual(camera); expect(gl.debug().geometryBuilds).toBe(builds);
    }
  });

  it('settles after a theme flip without repeated draws, callbacks or sample matrix writes', async () => {
    const callbacks = Object.fromEntries(['onReady', 'onFail', 'onInspection'].map(name => [name, vi.fn()]));
    const points = [{ x: 200.625, z: 350.875 }, { x: 245.375, z: 185.625 }];
    const model = await mountModel({ ...callbacks, observationSample: { points, captured: true }, observationProjection: { ...points[1], index: 1, captured: true }, inspectionId: 'slab', arcProcessStep: 'all' });
    model.update({ darkMode: true }); expectPalette(model, true);
    Object.values(callbacks).forEach(callback => callback.mockClear());
    const core = model.scene.getObjectByName('observation-sample-marker-batch');
    const draws = renderCalls, version = core.instanceMatrix.version, debug = structuredClone(gl.debug());
    frame(1200);
    expect(renderCalls).toBe(draws); expect(core.instanceMatrix.version).toBe(version);
    expect(gl.debug()).toEqual(debug); Object.values(callbacks).forEach(callback => expect(callback).not.toHaveBeenCalled());
  });
});
