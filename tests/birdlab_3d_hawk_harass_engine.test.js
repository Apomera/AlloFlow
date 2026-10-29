// BirdLab engine: small birds mobbing the hawk's lookout drive it off early.
// With two or more mobbers it leaves within a few seconds of landing and says
// so; without them it keeps its usual, longer stay.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/birdlab_3d_engine.js', 'utf8');
function runtime(isBlocked = () => false, focus = new THREE.Vector3(1,.2,0), withMammals = false, mobbed = { count: 0 }) {
  const frames = new Map(), calls = [], modes = [], listeners = []; let serial = 0, stamp = 0, disposed = 0;
  class Renderer {
    constructor() { this.shadowMap = {}; this.info = { render: { calls: 1, triangles: 1 } }; }
    setPixelRatio() {} setSize() {} render() {} dispose() { disposed++; } forceContextLoss() {}
  }
  const terrain = (x, z) => x * .02 + z * .01;
  const local = {
    THREE: { ...THREE, WebGLRenderer: Renderer }, innerWidth: 900, devicePixelRatio: 1,
    requestAnimationFrame(callback) { const id = ++serial; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    addEventListener(...args) { listeners.push(args); window.addEventListener(...args); },
    removeEventListener(...args) { window.removeEventListener(...args); },
    AvianWoodlandBirds: { create() {}, supports: () => true },
    BirdLab3DBird: { create() { return { root: new THREE.Group(), footOffsetY: -.18, update() {}, dispose() {} }; } },
    BirdLab3DHabitat: { create() { return { root: new THREE.Group(), perch: new THREE.Vector3(0, 3.2, 0),
      perches: [new THREE.Vector3(0, 3.2, 0), new THREE.Vector3(-5.7, 2.8, -4.4), new THREE.Vector3(6.3, 3.1, -5.8)],
      groundHeight: terrain, groundSurfaceHeight: terrain, isBlocked, update() {}, dispose() {} }; } },
    BirdLab3DWildlife: { create(T, scene, options) { return {
      root: new THREE.Group(),
      setPredator() {}, mobbers() { return mobbed.count; }, setMode(mode) { modes.push(mode); }, update(time, dt, observer) { calls.push({ time, dt, observer, position: observer?.position.toArray(), collider: options.isBlocked }); },
      snapshot() { return [{ id: 'blueJay', heading: .2, name: 'Blue jay', behavior: 'Scanning' }]; },
      getFocus(id, out) { return out.copy(focus); }, dispose() {}
    }; } }
  };
  let mammals;
  if (withMammals) {
    Function('window', readFileSync('stem_lab/birdlab_3d_mammals.js','utf8'))(local);
    const create=local.BirdLab3DMammals.create;
    local.BirdLab3DMammals.create=(...args)=>(mammals=create(...args));
  }
  Function('window', source)(local);
  const canvas = document.createElement('canvas'); canvas.tabIndex = 0;
  canvas.getBoundingClientRect = () => ({ width: 800, height: 500 }); canvas.requestPointerLock = vi.fn();
  document.body.appendChild(canvas);
  const controller = local.BirdLab3D.mount(canvas, { quality: 'low', reducedMotion: true });
  return { controller, canvas, frames, calls, modes, terrain, mammals,
    step(seconds = .05) { stamp += seconds * 1000; const queued = [...frames.values()]; frames.clear(); queued.forEach(callback => callback(stamp)); },
    run(seconds) { for (let i = 0; i < seconds * 20; i++) this.step(); },
    dispose() { controller.dispose(); canvas.remove(); listeners.forEach(args => window.removeEventListener(...args)); }, get disposed() { return disposed; }
  };
}

// Seconds from the end of the first landing until the hawk prepares to leave.
function dwell(count) {
  const mobbed = { count: 0 }, test = runtime(undefined, undefined, false, mobbed), c = test.controller, labels = new Set();
  try {
    c.setMode('free'); c.setPaused(false);
    let landed = -1, left = -1, previous = '';
    for (let i = 0; i < 90 * 20 && left < 0; i++) {
      test.step();
      const state = c.getState(), t = i * .05;
      if (previous === 'landing' && state.phase !== 'landing') { landed = t; mobbed.count = count; }
      if (landed >= 0) labels.add(state.label);
      if (landed >= 0 && state.phase === 'preparing') left = t;
      previous = state.phase;
    }
    return { stay: left - landed, labels };
  } finally { test.dispose(); }
}

describe('BirdLab hawk and its mobbers', () => {
  it('leaves its lookout early when mobbed, and says so', () => {
    const calm = dwell(0), mobbed = dwell(2);
    expect(calm.stay).toBeGreaterThan(6);
    expect(mobbed.stay).toBeGreaterThan(0);
    expect(mobbed.stay).toBeLessThan(4.2);
    expect([...mobbed.labels]).toContain('Perched · mobbed by small birds');
    expect([...calm.labels]).not.toContain('Perched · mobbed by small birds');
    // One mobber alone does not drive it off.
    expect(dwell(1).stay).toBe(calm.stay);
  });
});
