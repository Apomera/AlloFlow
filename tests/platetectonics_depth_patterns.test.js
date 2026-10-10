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
  (0, eval)(read(process.env.PT_TEST_SOURCE || 'stem_lab/stem_tool_platetectonics.js'));
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

describe('Depth-band guide patterns', () => {
  it.each(['convergent', 'divergent', 'transform'])('keeps exact %s depths while distinguishing classification guides from surface and endpoint lines', async mode => {
    const model = await mountModel({ mode });
    const ticks = depthParts(model, 'tick');
    expect(ticks).toHaveLength(4);
    for (const tick of ticks) {
      const km = tick.userData.depthKm;
      expect(positions(tick)).toEqual([-80, -km * .1, 0, 76, -km * .1, 0]);
      if (km === 70 || km === 300) {
        expect(tick.material.isLineDashedMaterial).toBe(true);
        expect(tick.material.dashSize).toBeGreaterThan(0);
        expect(tick.material.gapSize).toBeGreaterThan(0);
        expect(Array.from(tick.geometry.attributes.lineDistance.array)).toEqual([0, 156]);
      } else {
        expect(tick.material.isLineDashedMaterial).not.toBe(true);
        expect(tick.geometry.attributes.lineDistance).toBeUndefined();
      }
    }
    expectPalette(model, false);
  });

  it('retains dash geometry, distances and camera through theme changes and 1200 idle frames', async () => {
    const report = vi.fn();
    const model = await mountModel({ onInspection: report });
    expect(report.mock.calls.length).toBeGreaterThan(0);
    const ticks = depthParts(model, 'tick'), planes = depthParts(model, 'plane');
    const retained = retainedResources(model, [...ticks, ...planes]);
    const distances = ticks.filter(tick => tick.material.isLineDashedMaterial).map(tick => ({ tick, attribute: tick.geometry.attributes.lineDistance, values: Array.from(tick.geometry.attributes.lineDistance.array) }));
    for (const darkMode of [true, false]) { model.update({ darkMode }); retained(); expectPalette(model, darkMode); }
    for (const saved of distances) {
      expect(saved.tick.geometry.attributes.lineDistance).toBe(saved.attribute);
      expect(Array.from(saved.attribute.array)).toEqual(saved.values);
    }
    const draws = renderCalls, callbacks = report.mock.calls.length;
    frame(1200);
    expect(renderCalls).toBe(draws); expect(report).toHaveBeenCalledTimes(callbacks); retained();
  });

  it('rebuilds only the slice guides at their exact cut position and removes them when hidden or overhead', async () => {
    const model = await mountModel();
    model.update({ cut: 12.5 });
    for (const tick of depthParts(model, 'tick')) {
      expect(positions(tick)).toEqual([-80, -tick.userData.depthKm * .1, 12.5, 76, -tick.userData.depthKm * .1, 12.5]);
      expect(!!tick.material.isLineDashedMaterial).toBe([70, 300].includes(tick.userData.depthKm));
    }
    for (const plane of depthParts(model, 'plane')) {
      expect(plane.position.toArray()).toEqual([0, -plane.userData.depthKm * .1, 0]);
      expect(plane.material.clippingPlanes[0].constant).toBe(12.5);
    }
    model.update({ showScale: false });
    expect(depthParts(model, 'tick')).toHaveLength(0); expect(depthParts(model, 'plane')).toHaveLength(0);
    model.update({ showScale: true, surfaceView: true, cut: null, rotX: -88 });
    expect(depthParts(model, 'tick')).toHaveLength(0); expect(depthParts(model, 'plane')).toHaveLength(0);
    model.update({ surfaceView: false, rotX: 0, cut: 0 });
    expectPalette(model, false);
    expect(depthParts(model, 'tick').filter(tick => tick.material.isLineDashedMaterial)).toHaveLength(2);
  });
});
