// BirdLab 3D dawn: a third woodland palette with a low sun opposite the
// golden-hour sun, denser haze and ground mist; daylight and golden hour keep
// their established values, and the woodland calls more often at dawn.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/birdlab_3d_engine.js', 'utf8');

function runtime() {
  const frames = new Map(), mist = []; let sequence = 0, scene, renderer;
  class Renderer {
    constructor() { this.shadowMap = {}; this.info = { render: { calls: 1, triangles: 1 } }; renderer = this; }
    setPixelRatio() {} setSize() {} dispose() {} forceContextLoss() {}
    render(value) { scene = value; }
  }
  const local = {
    THREE: { ...THREE, WebGLRenderer: Renderer }, innerWidth: 900, devicePixelRatio: 1,
    addEventListener() {}, removeEventListener() {},
    requestAnimationFrame(callback) { const id = ++sequence; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    AvianWoodlandBirds: { create() {}, supports: () => true },
    BirdLab3DBird: { create: () => ({ root: new THREE.Group(), update() {}, dispose() {} }) },
    BirdLab3DHabitat: { create: () => ({ root: new THREE.Group(), perch: new THREE.Vector3(0, 3.2, 0),
      groundHeight: () => 0, update() {}, dispose() {}, setMist: value => mist.push(value) }) },
    BirdLab3DWildlife: { create: () => ({ snapshot: () => [], update() {}, dispose() {} }) }
  };
  Function('window', source)(local);
  const canvas = document.createElement('canvas');
  canvas.getBoundingClientRect = () => ({ width: 800, height: 500 });
  document.body.appendChild(canvas);
  const controller = local.BirdLab3D.mount(canvas, { reducedMotion: true, quality: 'low' });
  const lights = () => {
    const hemi = scene.children.find(o => o.isHemisphereLight), sun = scene.getObjectByName('birdlab-key-sun');
    const rim = scene.children.find(o => o.isDirectionalLight && o !== sun);
    return { hemi: [hemi.color.getHexString(), hemi.groundColor.getHexString(), hemi.intensity], sun: [sun.color.getHexString(), sun.intensity, sun.position.toArray()],
      rim: [rim.color.getHexString(), rim.intensity], fog: [scene.fog.color.getHexString(), scene.fog.density], exposure: renderer.toneMappingExposure,
      sky: ['top', 'sunTint', 'cloudLight', 'cloudShade'].map(k => scene.getObjectByName('birdlab-sky').material.uniforms[k].value.getHexString()) };
  };
  return { controller, mist, lights, dispose() { controller.dispose(); canvas.remove(); } };
}
const elevation = p => Math.asin(p[1] / Math.hypot(...p)) * 180 / Math.PI;

describe('BirdLab 3D dawn lighting', () => {
  it('keeps the established daylight and golden-hour palettes exactly', () => {
    const test = runtime();
    try {
      test.controller.setLighting('golden');
      expect(test.lights()).toEqual({ hemi: ['c1d1e1', '6d5138', .64], sun: ['ffd19a', 2.3, [-30, 16, 25]], rim: ['d3dae7', .38],
        fog: ['d7cbb3', .022], exposure: 1.03, sky: ['7594ad', 'ffe0ad', 'f6dec1', 'aeb4bd'] });
      test.controller.setLighting('daylight');
      expect(test.lights()).toEqual({ hemi: ['d5e8f4', '4c5938', .6], sun: ['fff0d7', 2.05, [-18, 31, 14]], rim: ['c5ddec', .34],
        fog: ['bac9c6', .0165], exposure: 1, sky: ['749bb4', 'fff1d6', 'f5f5ec', 'b4c6d0'] });
    } finally { test.dispose(); }
  });

  it('rises low on the far side of the clearing in a pink, misty light', () => {
    const test = runtime();
    try {
      test.controller.setLighting('golden'); const golden = test.lights();
      expect(test.mist.at(-1)).toBe(false);
      test.controller.setLighting('dawn'); const dawn = test.lights();
      expect(test.controller.getState().lighting).toBe('dawn');
      expect(test.mist.at(-1)).toBe(true);
      expect(elevation(dawn.sun[2])).toBeLessThan(elevation(golden.sun[2]));
      expect(elevation(dawn.sun[2])).toBeGreaterThan(5);
      const [gx, , gz] = golden.sun[2], [dx, , dz] = dawn.sun[2];
      expect(gx * dx + gz * dz, 'opposite side of the clearing').toBeLessThan(0);
      expect(dawn.fog[1]).toBeGreaterThan(golden.fog[1]);
      const fog = new THREE.Color('#' + dawn.fog[0]);
      expect(fog.r).toBeGreaterThan(fog.g); // a rosy haze, not the green-gray day
      test.controller.setLighting('daylight');
      expect(test.mist.at(-1)).toBe(false);
      // Unknown names, including inherited object keys, change nothing.
      for (const name of ['toString', 'constructor', 'night', undefined]) test.controller.setLighting(name);
      expect(test.controller.getState().lighting).toBe('daylight');
      expect(test.mist.at(-1)).toBe(false);
    } finally { test.dispose(); }
  });
});

describe('BirdLab dawn chorus', () => {
  it('calls about twice as often at dawn, at the same relative rates', () => {
    resetStemLab(); loadTool('stem_lab/stem_tool_birdlab.js', 'birdLab');
    const p = window.__alloBirdLabPure;
    for (const id of Object.keys(p.WOODLAND_CALLS)) {
      const entry = p.WOODLAND_CALLS[id];
      expect(p.callInterval(entry, 'daylight')).toBe(entry.every);
      expect(p.callInterval(entry, 'golden')).toBe(entry.every);
      expect(p.callInterval(entry, 'dawn') / entry.every).toBeCloseTo(.45, 10);
    }
  });
});
