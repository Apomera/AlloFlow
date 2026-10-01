import fs from 'node:fs';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

// Actual shipped Three geometry; only drawing and text painting are stubbed.
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
async function mount(offset = 0) {
  canvas = document.createElement('canvas'); document.body.appendChild(canvas);
  Object.defineProperty(canvas, 'clientWidth', { value: 366 }); Object.defineProperty(canvas, 'clientHeight', { value: 400 });
  let model = { mode: 'transform', mountainHeight: 0, rift: 0, offset, quakes: [], rotX: -88, rotY: 0, scale: 1, cut: null, showScale: true, surfaceView: true, sig: String(++signature) };
  gl.submit(model); gl.mount(canvas); await Promise.resolve(); await Promise.resolve(); frame();
  return patch => { model = { ...model, ...patch, sig: String(++signature) }; gl.submit(model); frame(); };
}
function markers() { const result = []; scene.traverse(object => { if (object.userData.feature === 'matching-marker') result.push(object); }); return result; }

describe('Transform reference pairs remain identifiable after slip', () => {
  it.each([0, 96, 192, 280])('preserves marker identities, positions and solid/dashed geometry at %s km offset', async offset => {
    await mount(offset); const bands = markers(), off = Math.min(17.5, offset / 400 * 25);
    expect(bands).toHaveLength(4);
    for (const band of bands) {
      const { markerId, plateId, pattern } = band.userData, first = markerId === 'reference-1';
      expect(['reference-1', 'reference-2']).toContain(markerId); expect(['A', 'B']).toContain(plateId);
      expect(pattern).toBe(first ? 'solid' : 'dashed');
      expect(band.position.z).toBe(first ? -12 : 12);
      const world = band.getWorldPosition(new THREE.Vector3());
      expect(world.x).toBe(plateId === 'A' ? -38 : 38);
      expect(world.z).toBeCloseTo(band.position.z + (plateId === 'A' ? off : -off));
      const pieces = band.children.map(piece => ({ min: piece.position.x - piece.geometry.parameters.width / 2, max: piece.position.x + piece.geometry.parameters.width / 2, piece }));
      expect(pieces).toHaveLength(first ? 1 : 6);
      expect(pieces[0].min).toBe(-38); expect(pieces.at(-1).max).toBe(38);
      for (let i = 0; i < pieces.length; i++) {
        expect(pieces[i].piece.geometry.parameters.height).toBe(0.16);
        expect(pieces[i].piece.geometry.parameters.depth).toBe(1.5);
        expect(pieces[i].piece.material.clippingPlanes).toHaveLength(1);
        if (i) expect(pieces[i].min - pieces[i - 1].max).toBe(6);
      }
    }
    for (const id of ['reference-1', 'reference-2']) expect(bands.filter(band => band.userData.markerId === id)).toHaveLength(2);
  });
  it('distinguishes the unrelated pair that coincides at 192 km instead of suggesting restored alignment', async () => {
    await mount(192); const bands = markers(), coincident = bands.filter(band => Math.abs(band.getWorldPosition(new THREE.Vector3()).z) < 1e-8);
    expect(coincident).toHaveLength(2);
    expect(new Set(coincident.map(band => band.userData.markerId)).size).toBe(2);
    expect(new Set(coincident.map(band => band.userData.pattern))).toEqual(new Set(['solid', 'dashed']));
    for (const id of ['reference-1', 'reference-2']) {
      const pair = bands.filter(band => band.userData.markerId === id).map(band => band.getWorldPosition(new THREE.Vector3()).z);
      expect(Math.abs(pair[0] - pair[1])).toBe(24);
    }
  });
  it('keeps marker objects and clip semantics during camera/slice changes and remains idle afterward', async () => {
    const update = await mount(192), before = markers(), builds = gl.debug().geometryBuilds;
    update({ cut: 0, rotX: -22, rotY: -38, surfaceView: false });
    expect(markers()).toEqual(before); expect(gl.debug().geometryBuilds).toBe(builds);
    markers().forEach(band => band.children.forEach(piece => expect(piece.material.clippingPlanes[0].constant).toBe(0)));
    const count = renders; frame(20); expect(renders).toBe(count);
  });
  it('disposes all band segments and their materials when rebuilding the plates', async () => {
    const update = await mount(96), objects = markers(), resources = objects.flatMap(band => band.children.flatMap(piece => [piece.geometry, piece.material])), disposed = new Set();
    resources.forEach(resource => resource.addEventListener('dispose', () => disposed.add(resource)));
    update({ offset: 192 }); expect(disposed.size).toBe(resources.length);
    objects.forEach(object => expect(scene.getObjectById(object.id)).toBeUndefined());
  });
});
