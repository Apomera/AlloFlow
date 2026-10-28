// BirdLab 3D light rain: weather greys whichever light is chosen, builds the
// habitat's rain only on request, restores the exact palette when it clears,
// keeps a custom light direction, and slows the woodland's calling.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/birdlab_3d_engine.js', 'utf8');

function runtime() {
  const frames = new Map(), mist = [], rain = []; let sequence = 0, scene, renderer;
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
      groundHeight: () => 0, update() {}, dispose() {}, setMist: value => mist.push(value), setRain: value => rain.push(value) }) },
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
  return { controller, mist, rain, lights, dispose() { controller.dispose(); canvas.remove(); } };
}
const DAYLIGHT = { hemi: ['d5e8f4', '4c5938', .6], sun: ['fff0d7', 2.05, [-18, 31, 14]], rim: ['c5ddec', .34],
  fog: ['bac9c6', .0165], exposure: 1, sky: ['749bb4', 'fff1d6', 'f5f5ec', 'b4c6d0'] };
const grey = hex => { const c = new THREE.Color('#' + hex); return Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b); };

describe('BirdLab 3D light rain', () => {
  it('overcasts the chosen light and clears back to the exact palette', () => {
    const test = runtime();
    try {
      expect(test.controller.getState().weather).toBe('clear');
      expect(test.rain).toEqual([false]);
      test.controller.setWeather('rain');
      const wet = test.lights();
      expect(test.controller.getState().weather).toBe('rain');
      expect(test.rain.at(-1)).toBe(true);
      expect(wet.sun[1]).toBeCloseTo(2.05 * .32, 10);
      expect(wet.fog[1]).toBeCloseTo(.0165 * 1.45, 10);
      expect(grey(wet.fog[0])).toBeLessThan(grey('bac9c6'));
      expect(wet.exposure).toBeCloseTo(.96, 10);
      // Changing the light while it rains keeps the shower.
      test.controller.setLighting('golden');
      expect(test.lights().sun[1]).toBeCloseTo(2.3 * .32, 10);
      expect(test.rain.at(-1)).toBe(true);
      test.controller.setLighting('daylight');
      test.controller.setWeather('clear');
      expect(test.lights()).toEqual(DAYLIGHT);
      expect(test.rain.at(-1)).toBe(false);
      for (const bad of ['snow', 'toString', undefined]) test.controller.setWeather(bad);
      expect(test.controller.getState().weather).toBe('clear');
    } finally { test.dispose(); }
  });

  it('keeps a custom light direction through a change of weather', () => {
    const test = runtime();
    try {
      test.controller.setLightStudy(true);
      test.controller.setLightDirection({ azimuth: 40, elevation: 25 });
      const before = test.lights().sun[2];
      test.controller.setWeather('rain');
      expect(test.lights().sun[2]).toEqual(before);
      expect(test.controller.getState().lightingDirectionCustom).toBe(true);
      test.controller.setWeather('clear');
      expect(test.lights().sun[2]).toEqual(before);
    } finally { test.dispose(); }
  });
});

describe('BirdLab calls in the rain', () => {
  it('calls less often in rain, at the same relative rates, and the dawn chorus still lifts it', () => {
    resetStemLab(); loadTool('stem_lab/stem_tool_birdlab.js', 'birdLab');
    const p = window.__alloBirdLabPure;
    for (const entry of Object.values(p.WOODLAND_CALLS)) {
      expect(p.callInterval(entry, 'daylight', 'clear')).toBe(entry.every);
      expect(p.callInterval(entry, 'daylight', 'rain') / entry.every).toBeCloseTo(1.8, 10);
      expect(p.callInterval(entry, 'dawn', 'rain') / entry.every).toBeCloseTo(.45 * 1.8, 10);
    }
  });
});
