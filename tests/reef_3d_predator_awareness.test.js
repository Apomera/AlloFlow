import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 45000 });
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync(process.env.REEF3D_EXPLORE_SOURCE || 'stem_lab/reef_3d_explore.js', 'utf8');
// Test-only access to the real simulation, with real geometry and a manual clock.
// No debug controls are added to the published controller.
const instrumented = source.replace('canvas._reef3dExplore = controller;',
  'global.encounters = { organisms: organisms, cue: encounterCue, ground: groundTop, observe: function (p) { diverPos.set(p.x + 7, p.y, p.z); }, clear: function () { encounterKit = null; } }; canvas._reef3dExplore = controller;');
const open = [];
afterEach(() => { while (open.length) open.pop()(); });

function dive(reducedMotion = false) {
  let clock = 1000, serial = 0;
  const frames = new Map();
  class Renderer {
    constructor() { this.shadowMap = {}; this.info = { render: { calls: 1, triangles: 1 } }; this.capabilities = { isWebGL2: true }; this.extensions = { has: () => true }; }
    setPixelRatio() {} setSize() {} render() {} dispose() {} forceContextLoss() {}
  }
  const local = {
    innerWidth: 1200, console: { warn() {}, error() {} }, performance: { now: () => clock },
    requestAnimationFrame(fn) { frames.set(++serial, fn); return serial; }, cancelAnimationFrame(id) { frames.delete(id); },
    addEventListener() {}, removeEventListener() {}, setTimeout() { return 0; }, clearTimeout() {}
  };
  new Function('window', instrumented)(local);
  const canvas = document.createElement('canvas');
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 500 });
  document.body.appendChild(canvas);
  const controller = local.Reef3DExplore.mount(canvas, {
    THREE: { ...THREE, WebGLRenderer: Renderer }, quality: 'low', reducedMotion,
    site: { seed: 6, depthM: 9, health: { coralCover: 0.6, bleaching: 0, algae: 0.05 },
      population: [{ id: 'anthias', count: 1 }, { id: 'blue_tang', count: 1 }, { id: 'whitetip_reef_shark', count: 1 }], restoration: null }
  });
  open.push(() => { controller.dispose(); canvas.remove(); });
  const kit = local.encounters, fish = kit.organisms.find(o => o.speciesId === 'blue_tang');
  const school = kit.organisms.find(o => o.speciesId === 'anthias'), predator = kit.organisms.find(o => o.speciesId === 'whitetip_reef_shark');
  const point = { x: 16, y: kit.ground(16, 20) + 3, z: 20 };
  let predatorDistance = 0.9;
  [fish, school].forEach(o => { o.path = (t, p) => Object.assign(p, point); });
  predator.path = (t, p) => Object.assign(p, { x: point.x - predatorDistance, y: point.y, z: point.z });
  kit.clear();
  const step = (ms = 50) => { clock += ms; const todo = [...frames.values()]; frames.clear(); todo.forEach(fn => fn(clock)); };
  const run = (seconds, ms = 50) => { for (let i = 0; i < Math.round(seconds * 1000 / ms); i++) step(ms); };
  step();
  return { controller, fish, school, predator, point, kit, step, run, away() { predatorDistance = 20; kit.clear(); } };
}

describe('local predator encounters in the 3D reef', () => {
  it('moves swimming fish away and lets coral schools shelter, then recover without relocating their routes', () => {
    const t = dive();
    t.run(4);
    expect(t.fish.encounter.x, 'retreat away from the predator').toBeGreaterThan(0.7);
    expect(t.school.encounter.s, 'shelter response').toBeGreaterThan(0.7);
    expect(t.school.root.position.y, 'the drawn school dips toward its coral').toBeLessThan(t.point.y - 0.8);
    expect(Math.hypot(t.fish.encounter.x, t.fish.encounter.z), 'bounded retreat').toBeLessThan(1.7);
    t.kit.observe(t.point); t.step();
    expect(t.school.flight.s, 'the observer is too far away to cause the sheltering').toBeLessThan(0.01);
    expect(t.controller.getState().moments.some(m => m.kind === 'cloud_shelter' && m.uids.includes(t.school.uid)), 'predator shelter is available as a reef moment').toBe(true);
    t.away(); t.run(20);
    expect(Math.hypot(t.fish.encounter.x, t.fish.encounter.z), 'returns to its own route').toBeLessThan(0.01);
    expect(t.school.encounter.s).toBeLessThan(0.01);
    expect(t.school.root.position.y).toBeGreaterThan(t.point.y - 0.1);
    expect(t.controller.getState().moments.some(m => m.kind === 'cloud_shelter' && m.uids.includes(t.school.uid))).toBe(false);
  });

  it('uses three-dimensional distance and terrain occlusion instead of reacting through rock', () => {
    const t = dive(), p = t.point;
    expect(t.kit.cue(0.1, p.x, p.y, p.z, 1, t.school.uid)).not.toBeNull();
    expect(t.kit.cue(0.1, p.x, p.y + 8, p.z, 1, t.school.uid)).toBeNull();
    expect(t.kit.cue(2, p.x, p.y, p.z, 1, t.school.uid), 'larger fish are not treated as small prey').toBeNull();
    // Both endpoints under the same rock surface: the line between them is occluded.
    t.predator.path = (time, out) => Object.assign(out, { x: p.x - 1, y: t.kit.ground(p.x - 1, p.z) - 2, z: p.z });
    t.predator.ceiling = -100; t.kit.clear();
    expect(t.kit.cue(0.1, p.x, -100, p.z, 2, t.school.uid)).toBeNull();
  });

  it('stays independent of identification focus, pauses completely, and softens reduced motion', () => {
    const normal = dive(), calm = dive(true);
    normal.controller.focus(normal.fish.uid);
    normal.run(4); calm.run(4 / 0.45);
    expect(normal.fish.encounter.x, 'identifying the fish does not disable its ecology').toBeGreaterThan(0.7);
    expect(calm.fish.encounter.x).toBeGreaterThan(0.1);
    expect(calm.fish.encounter.x).toBeLessThan(normal.fish.encounter.x * 0.45);
    const pos = normal.fish.root.position.clone(), state = { ...normal.fish.encounter };
    normal.controller.setPaused(true); normal.run(3);
    expect(normal.fish.root.position.distanceTo(pos)).toBe(0);
    expect(normal.fish.encounter).toEqual(state);
  });

  it('produces the same encounter state for different frame partitions', () => {
    const a = dive(), b = dive();
    [a, b].forEach(t => {
      t.predator.path = (time, p) => Object.assign(p, { x: t.point.x + 4 * Math.sin(time * 0.6), y: t.point.y, z: t.point.z - 0.5 });
      t.kit.clear();
    });
    a.run(5, 50); b.run(5, 1000 / 60);
    for (const kind of ['fish', 'school']) for (const key of ['x', 'z', 's']) {
      expect(a[kind].encounter[key], kind + ' ' + key).toBeCloseTo(b[kind].encounter[key], 8);
    }
  });
});
