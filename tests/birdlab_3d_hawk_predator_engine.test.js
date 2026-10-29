// BirdLab engine: in free roam the hawk is reported to the woodland at its
// actual position every frame, flagged as flying while it takes off, glides
// or lands and as perched otherwise; guided study reports no predator. The
// woodland's mobbing count is passed back to the hawk.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/birdlab_3d_engine.js', 'utf8');
function runtime(isBlocked = () => false, focus = new THREE.Vector3(1,.2,0), withMammals = false) {
  const frames = new Map(), calls = [], modes = [], listeners = [], predators = []; let serial = 0, stamp = 0, disposed = 0;
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
      setPredator(value) { predators.push(value); }, setMode(mode) { modes.push(mode); }, update(time, dt, observer) { calls.push({ time, dt, observer, position: observer?.position.toArray(), collider: options.isBlocked }); },
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
  return { controller, canvas, frames, calls, modes, terrain, mammals, predators,
    step(seconds = .05) { stamp += seconds * 1000; const queued = [...frames.values()]; frames.clear(); queued.forEach(callback => callback(stamp)); },
    run(seconds) { for (let i = 0; i < seconds * 20; i++) this.step(); },
    dispose() { controller.dispose(); canvas.remove(); listeners.forEach(args => window.removeEventListener(...args)); }, get disposed() { return disposed; }
  };
}

describe('BirdLab hawk as predator', () => {
  it('reports the hawk in free roam, flagged flying or perched', () => {
    const test = runtime(), c = test.controller;
    try {
      c.setPaused(false); test.run(2);
      expect(test.predators.length).toBeGreaterThan(0);
      expect(test.predators.every(v => v === null), 'guided study reports no predator').toBe(true);
      c.setMode('free'); c.setPaused(false);
      const flying = [], perched = [];
      for (let i = 0; i < 40 * 20; i++) {
        test.step();
        const state = c.getState(), last = test.predators.at(-1);
        (['takeoff', 'gliding', 'landing'].includes(state.phase) ? flying : perched).push({ last, position: state.position });
      }
      expect(flying.length, 'the hawk flew during the visit').toBeGreaterThan(10);
      expect(perched.length).toBeGreaterThan(10);
      for (const [list, flag] of [[flying, true], [perched, false]]) for (const s of list) {
        expect(s.last).not.toBeNull();
        expect(s.last.flying).toBe(flag);
        expect(Math.hypot(s.last.x - s.position[0], s.last.y - s.position[1], s.last.z - s.position[2])).toBeLessThan(1e-9);
      }
    } finally { test.dispose(); }
  });
});
