import fs from 'node:fs';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

// Actual shipped Three meshes/materials/raycaster. Only GPU drawing is stubbed.
let THREE, gl, scene, canvas, signature = 0, frameId = 0, renders = 0;
const frames = new Map();
beforeAll(() => {
  window.HTMLCanvasElement.prototype.getContext = () => new Proxy({ measureText: text => ({ width: String(text).length * 23 }) }, {
    get: (target, key) => key in target ? target[key] : () => ({ addColorStop() {} }),
    set: (target, key, value) => { target[key] = value; return true; }
  });
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  globalThis.ResizeObserver = window.ResizeObserver = class { observe() {} disconnect() {} };
  globalThis.requestAnimationFrame = window.requestAnimationFrame = callback => { frames.set(++frameId, callback); return frameId; };
  globalThis.cancelAnimationFrame = window.cancelAnimationFrame = id => frames.delete(id);
  for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'vendor/three-r128/three.min.js']) (0, eval)(fs.readFileSync(file, 'utf8'));
  THREE = window.THREE;
  THREE.WebGLRenderer = class {
    constructor(options) { this.domElement = options.canvas; }
    setClearColor() {} setPixelRatio() {} setSize() {} dispose() {}
    getContext() { return { isContextLost: () => false }; }
    render(nextScene, camera) { renders++; scene = nextScene; scene.updateMatrixWorld(true); camera.updateMatrixWorld(true); }
  };
  (0, eval)(fs.readFileSync('stem_lab/stem_lab_module.js', 'utf8'));
  window.StemLab.ensureThree = () => Promise.resolve(THREE);
  (0, eval)(fs.readFileSync(process.env.PT_TEST_SOURCE || 'stem_lab/stem_tool_platetectonics.js', 'utf8'));
  gl = window.__alloTectGL;
});
afterEach(() => { gl?.unmount(); canvas?.remove(); frames.clear(); canvas = scene = null; });
function frame(count = 1) {
  for (let i = 0; i < count; i++) { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(performance.now())); }
  expect(gl.debug().state).toBe('ready');
}
async function mount(patch = {}) {
  canvas = document.createElement('canvas'); document.body.appendChild(canvas);
  Object.defineProperty(canvas, 'clientWidth', { value: 366 }); Object.defineProperty(canvas, 'clientHeight', { value: 400 });
  let model = { mode: 'convergent', mountainHeight: 0, rift: 0, offset: 0, quakes: [], rotX: -88, rotY: 0, scale: 1, cut: null, showScale: true, surfaceView: true, ...patch, sig: String(++signature) };
  gl.submit(model); gl.mount(canvas); await Promise.resolve(); await Promise.resolve(); frame();
  return next => { model = { ...model, ...next, sig: String(++signature) }; gl.submit(model); frame(); };
}
function features(name) { const result = []; scene.traverse(object => { if (object.userData.feature === name) result.push(object); }); return result; }
function visibleSolidMeshes() {
  const meshes = [];
  scene.traverse(object => { if (object.isMesh && !object.isSprite && object.visible &&
    (Array.isArray(object.material) ? object.material.every(material => !material.transparent) : !object.material.transparent)) meshes.push(object); });
  return meshes;
}

describe('Boundary surface features stay distinguishable', () => {
  it.each([0, 3500, 7000])('keeps all true arc craters exposed as mountains reach %s metres', async mountainHeight => {
    await mount({ mountainHeight });
    const volcanoes = features('volcanic-arc-edifice'), craters = features('volcanic-arc-crater');
    expect(volcanoes).toHaveLength(3); expect(craters).toHaveLength(3);
    const peaks = features('uplift-mountain'); expect(peaks).toHaveLength(5);
    const arcMaxX = Math.max(...volcanoes.map(volcano => new THREE.Box3().setFromObject(volcano).max.x));
    for (const peak of peaks) expect(new THREE.Box3().setFromObject(peak).min.x).toBeGreaterThan(arcMaxX);
    for (const crater of craters) {
      const point = crater.getWorldPosition(new THREE.Vector3());
      expect(point.x, 'arc remains above the 100 km slab-depth location').toBeCloseTo(10);
      expect(point.y).toBeCloseTo(4.4 * 0.86);
      const ray = new THREE.Raycaster(new THREE.Vector3(point.x, 100, point.z), new THREE.Vector3(0, -1, 0));
      const hits = ray.intersectObjects(visibleSolidMeshes(), false);
      expect(hits[0].object, 'a solid mountain or snow cap cannot hide the crater').toBe(crater);
    }
    const expectedHeight = Math.max(0.4, mountainHeight / 8000 * 7);
    expect(Math.max(...peaks.map(peak => peak.geometry.parameters.height))).toBeCloseTo(expectedHeight);
  });
  it.each([0, 60, 180])('distinguishes cooled crust from old seafloor without widening molten rock at rift %s', async rift => {
    await mount({ mode: 'divergent', rift });
    const ridge = features('new-solid-crust')[0], fissure = features('ridge-fissure')[0], edges = features('new-solid-crust-edge');
    const gap = Math.max(1.5, rift / 180 * 16);
    expect(ridge.geometry.parameters.width).toBeCloseTo(gap); expect(ridge.position.y).toBe(-3.3);
    const top = ridge.material[2], oldTops = [];
    scene.traverse(object => { if (object.isMesh && Array.isArray(object.material) && object !== ridge) oldTops.push(object.material[2].map); });
    expect(oldTops).toHaveLength(2); oldTops.forEach(texture => expect(texture).not.toBe(top.map));
    expect(top.transparent).toBe(false); expect(top.emissive.getHex()).toBe(0);
    expect(fissure.geometry.parameters.width).toBeCloseTo(Math.min(1.1, gap * 0.4));
    expect(fissure.geometry.parameters.width).toBeLessThan(gap);
    expect(edges).toHaveLength(2);
    for (const edge of edges) {
      const points = edge.geometry.attributes.position;
      expect(Math.abs(points.getX(0))).toBeCloseTo(gap / 2); expect(points.getX(1)).toBe(points.getX(0));
      expect(points.getZ(0)).toBe(-25); expect(points.getZ(1)).toBe(25);
      expect(points.getY(0)).toBeCloseTo(0.72);
      expect(edge.material.clippingPlanes[0]).toBe(top.clippingPlanes[0]);
    }
  });
  it('reuses surface resources for camera/cut changes and stays idle, then releases them on teardown', async () => {
    const update = await mount({ mode: 'divergent', rift: 180 }), ridge = features('new-solid-crust')[0], edges = features('new-solid-crust-edge');
    const builds = gl.debug().geometryBuilds;
    update({ cut: 0, rotX: -22, rotY: -38, surfaceView: false });
    expect(features('new-solid-crust')[0]).toBe(ridge); expect(features('new-solid-crust-edge')).toEqual(edges);
    expect(gl.debug().geometryBuilds).toBe(builds);
    for (const edge of edges) expect(edge.material.clippingPlanes[0].constant).toBe(0);
    const rendered = renders; frame(20); expect(renders).toBe(rendered);
    const resources = [ridge.material[2].map, ...edges.flatMap(edge => [edge.geometry, edge.material])], disposed = new Set();
    resources.forEach(resource => resource.addEventListener('dispose', () => disposed.add(resource)));
    gl.unmount(); expect(disposed.size).toBe(resources.length);
  });
});
