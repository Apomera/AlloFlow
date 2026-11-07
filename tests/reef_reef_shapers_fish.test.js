import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Two reef shapers: a blacktip reef shark patrolling the shallow reef flat and a dusky
// farmerfish defending its turf farm. Facts and sources: lane_fish2/NOTES.md (Fishes of
// Australia, FishBase, Sharks of the World, Florida Museum, George et al. 2019, Hata and
// Kato 2002, 2003, 2006, Hata et al. 2010, Gochfeld 2010).
vi.setConfig({ testTimeout: 120000 });
const T = createRequire(import.meta.url)('../vendor/three-r128/three.min.js'), w = {};
const SPECIES = readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8');
const EXPLORE = readFileSync(process.env.REEF3D_EXPLORE_SOURCE || 'stem_lab/reef_3d_explore.js', 'utf8');
new Function('window', SPECIES)(w);
const S = w.Reef3DSpecies, IDS = ['blacktip_reef_shark', 'dusky_farmerfish'];
const make = (id, quality = 'high', o = {}) => S.create(T, id, { seed: 7, quality, ...o });
function meshes(root) { const a = []; root.traverse(m => { if (m.isMesh) a.push(m); }); return a; }
function tris(root) { return meshes(root).reduce((n, m) => n + m.geometry.index.count / 3 * (m.isInstancedMesh ? m.count : 1), 0); }
function snap(root) { root.updateMatrixWorld(true); const a = []; root.traverse(o => { a.push(...o.matrixWorld.elements); if (o.isMesh) a.push(...o.geometry.attributes.position.array); }); return a; }
function part(h, name) { for (const m of meshes(h.root)) { const e = m.geometry.userData.batch && m.geometry.userData.batch.find(r => r.part === name); if (e) return { m, e }; } return null; }
function vertices(h, name) {
  const p = part(h, name), c = p.m.geometry.attributes.color, pos = p.m.geometry.attributes.position, uv = p.m.geometry.attributes.uv, out = [];
  for (let i = p.e.first; i < p.e.first + p.e.count; i++) out.push({ x: pos.getX(i), y: pos.getY(i), sum: c.getX(i) + c.getY(i) + c.getZ(i), u: uv.getX(i), v: uv.getY(i) });
  return out;
}
function texel(h, u, v) {
  const im = meshes(h.root).find(m => m.material.map).material.map.image, at = (Math.floor(v * im.height) * im.width + Math.floor(u * im.width)) * 4;
  return im.data[at] + im.data[at + 1] + im.data[at + 2];
}
const median = a => a.slice().sort((p, q) => p - q)[Math.floor(a.length / 2)];

describe('reef shaper specimens', () => {
  it('registers a lofted shark and damselfish after the bluefin trevally with sourced sizes and depths', () => {
    for (const id of IDS) expect(S.ids.filter(x => x === id), id).toHaveLength(1);
    expect(S.ids.indexOf('blacktip_reef_shark')).toBeGreaterThan(S.ids.indexOf('bluefin_trevally'));
    expect(S.ids.indexOf('dusky_farmerfish')).toBe(S.ids.indexOf('blacktip_reef_shark') + 1);
    expect(S.info('blacktip_reef_shark')).toMatchObject({ group: 'fish', habit: 'solitary', lengthM: 1.3, depthM: [0, 75], schoolSize: null, origin: 'centre', healthStates: ['healthy'] });
    expect(S.info('dusky_farmerfish')).toMatchObject({ group: 'fish', habit: 'hover', lengthM: 0.12, depthM: [1, 12], schoolSize: null, origin: 'centre' });
    for (const id of IDS) expect(S.info(id).portrait.dir).toHaveLength(3);
  });
  for (const quality of ['low', 'high']) {
    it('keeps each to two finite draws within the ' + quality + ' animal budget', () => {
      for (const id of IDS) for (const seed of [3, 7]) {
        const h = make(id, quality, { seed });
        try {
          const ms = meshes(h.root), size = new T.Box3().setFromObject(h.root).getSize(new T.Vector3()), L = S.info(id).lengthM;
          expect(ms.map(m => m.name).sort(), id).toEqual([id + '-body', id + '-fins']);
          expect(tris(h.root), id).toBeLessThanOrEqual(quality === 'high' ? 6000 : 1500);
          expect(size.x / L, id).toBeGreaterThan(0.85); expect(size.x / L, id).toBeLessThan(1.25);
          for (const m of ms) { expect(m.userData.speciesId).toBe(id); for (const a of Object.values(m.geometry.attributes)) expect([...a.array].every(Number.isFinite), id).toBe(true); }
          for (const name of ['tail', 'pectoral', 'detail']) expect(part(h, name), id + ' ' + name).toBeTruthy();
        } finally { h.dispose(); }
      }
    });
    it('keeps the outlines that tell them from their lookalikes at ' + quality, () => {
      const box = id => { const h = make(id, quality); try { return new T.Box3().setFromObject(h.root.getObjectByName(id + '-body')).getSize(new T.Vector3()); } finally { h.dispose(); } };
      const black = box('blacktip_reef_shark'), white = box('whitetip_reef_shark'), farmer = box('dusky_farmerfish');
      // A long shark, but stockier than the slender whitetip.
      expect(black.x / black.y).toBeGreaterThan(4.5);
      expect(black.y / black.x).toBeGreaterThan(white.y / white.x * 1.1);
      // A deep, oval damselfish body.
      expect(farmer.x / farmer.y).toBeLessThan(2.4); expect(farmer.x / farmer.y).toBeGreaterThan(1.6);
    });
  }
  it('paints black fin tips on the blacktip where the whitetip has white ones', () => {
    for (const quality of ['low', 'high']) {
      const b = make('blacktip_reef_shark', quality), wt = make('whitetip_reef_shark', quality);
      try {
        // The highest fin vertices are the apex of the first dorsal fin.
        const top = h => { const f = vertices(h, 'fins'), ymax = Math.max(...f.map(c => c.y)); return f.filter(c => c.y > ymax - 0.004); };
        expect(top(b).every(c => c.sum < 0.05), quality).toBe(true);
        expect(top(wt).every(c => c.sum > 1.5), quality).toBe(true);
        // A pale band sits below the black apex of the first dorsal fin (high tier only resolves it).
        if (quality === 'high') { const f = vertices(b, 'fins'), ymax = Math.max(...f.map(c => c.y)); expect(f.some(c => c.y < ymax - 0.06 && c.y > ymax - 0.12 && c.sum > 1.4)).toBe(true); }
        // The lower lobe of the tail ends in black.
        const tail = vertices(b, 'tail'), ymin = Math.min(...tail.map(c => c.y));
        expect(tail.filter(c => c.y < ymin + 0.01).every(c => c.sum < 0.12), quality).toBe(true);
      } finally { b.dispose(); wt.dispose(); }
    }
  });
  it('paints the farmerfish dark on the crown and under the rear of the back fin', () => {
    const h = make('dusky_farmerfish');
    try {
      // u runs snout to tail; v from the belly (0) round to the back (0.5).
      const flank = texel(h, 0.55, 0.3);
      expect(texel(h, 0.12, 0.46)).toBeLessThan(flank * 0.75);
      expect(texel(h, 0.86, 0.42)).toBeLessThan(texel(h, 0.6, 0.42) * 0.8);
      // Tan lower head and chest.
      expect(texel(h, 0.12, 0.06)).toBeGreaterThan(flank);
    } finally { h.dispose(); }
  });
  it('freezes every inspection specimen under reduced motion and swims otherwise', () => {
    for (const id of IDS) {
      const still = make(id, 'low', { reducedMotion: true }), live = make(id, 'low');
      try {
        const a = snap(still.root); for (const t of [1, 5, 50]) still.update(0.016, t, { speed: 0.4, turn: 0.3 }); expect(snap(still.root)).toEqual(a);
        const c = snap(live.root); live.update(0.016, 2.3, { speed: 0.4 }); expect(snap(live.root)).not.toEqual(c);
      } finally { still.dispose(); live.dispose(); }
    }
  });
});

// ---- The dive: a manual clock and a stubbed renderer over the real simulation --------
// Test-only access to the organisms, the diver and the height field; the published
// controller is unchanged.
const instrumented = EXPLORE.replace('canvas._reef3dExplore = controller;',
  'global.reefTest = { organisms: organisms, diver: diverPos, ground: groundTop, rock: rockSurfaceAt, floor: terrain.floorY }; canvas._reef3dExplore = controller;');
const open = [];
afterEach(() => { while (open.length) open.pop()(); });
function dive(population, { reducedMotion = false, seed = 5101 } = {}) {
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
  new Function('window', SPECIES)(local);
  const canvas = document.createElement('canvas');
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 500 });
  document.body.appendChild(canvas);
  const errors = [];
  const controller = local.Reef3DExplore.mount(canvas, {
    THREE: { ...T, WebGLRenderer: Renderer }, quality: 'low', reducedMotion, onError: e => errors.push(String(e)),
    site: { seed, depthM: 9, health: { coralCover: 0.55, bleaching: 0, algae: 0.05 }, population, restoration: null }
  });
  open.push(() => { controller.dispose(); canvas.remove(); });
  const kit = local.reefTest, find = id => kit.organisms.filter(o => o.speciesId === id);
  let hold = null;
  const step = (ms = 50) => { if (hold) kit.diver.set(hold.x, hold.y, hold.z); clock += ms; const todo = [...frames.values()]; frames.clear(); todo.forEach(fn => fn(clock)); if (hold) kit.diver.set(hold.x, hold.y, hold.z); };
  step();
  return { controller, kit, find, step, errors, hold(p) { hold = p ? { x: p.x, y: p.y, z: p.z } : null; } };
}

// Two dive seeds, so no single lucky layout carries the behaviour.
describe.each([5101, 5102])('reef shapers on the dive (seed %i)', (SEED) => {
  const population = [{ id: 'parrotfish', count: 2 }, { id: 'whitetip_reef_shark', count: 1 }, { id: 'blacktip_reef_shark', count: 1 }, { id: 'dusky_farmerfish', count: 2 }, { id: 'brain_coral', count: 3 }];

  it('patrols the shallow reef flat at a steady cruise and never stops swimming', () => {
    const t = dive(population, { seed: SEED }), shark = t.find('blacktip_reef_shark')[0], whitetip = t.find('whitetip_reef_shark')[0];
    expect(shark && shark.path, 'a moving blacktip').toBeTruthy();
    const track = [], heights = [], deep = [];
    for (let k = 0; k < 160; k++) {
      for (let i = 0; i < 10; i++) t.step(50);
      const p = shark.root.position.clone(); track.push(p); heights.push(p.y - t.kit.floor(p.x, p.z));
      deep.push(whitetip.root.position.y);
    }
    const speeds = track.slice(1).map((p, i) => Math.hypot(p.x - track[i].x, p.z - track[i].z) / 0.5);
    // A reef shark's easy cruise, well over half a metre per second, without stopping.
    expect(median(speeds)).toBeGreaterThan(0.45); expect(median(speeds)).toBeLessThan(0.95);
    expect(Math.min(...speeds)).toBeGreaterThan(0.25);
    // Over the shallow flat, clear of the floor, and shallower than the whitetip's sand cruise.
    expect(Math.min(...heights)).toBeGreaterThan(0.6);
    expect(Math.max(...track.map(p => p.z))).toBeLessThan(-12);
    expect(median(track.map(p => p.y))).toBeGreaterThan(median(deep) + 4);
    // A loop that covers ground along the flat.
    expect(Math.max(...track.map(p => p.x)) - Math.min(...track.map(p => p.x))).toBeGreaterThan(10);
    expect(t.errors).toEqual([]);
  });

  for (const reducedMotion of [false, true]) {
    it('keeps well clear of a diver waiting on its route' + (reducedMotion ? ' under reduced motion' : ''), () => {
      const t = dive(population, { reducedMotion, seed: SEED }), shark = t.find('blacktip_reef_shark')[0];
      t.step();
      // Find the route time of the drawn position, then wait on a point it reaches 15 s later.
      const probe = { x: 0, y: 0, z: 0 };
      let best = Infinity, tNow = 0;
      for (let s = 0; s < 400; s += 0.05) { shark.path(s, probe); const d = Math.hypot(probe.x - shark.root.position.x, probe.z - shark.root.position.z); if (d < best) { best = d; tNow = s; } }
      expect(best).toBeLessThan(0.5);
      const start = shark.path(tNow + 15, { x: 0, y: 0, z: 0 }), spot = { x: start.x, y: start.y, z: start.z };
      t.hold(spot);
      let closest = Infinity, rawClosest = Infinity;
      for (let k = 0; k < 1800; k++) {
        t.step(50);
        const p = shark.root.position;
        closest = Math.min(closest, Math.hypot(p.x - spot.x, p.y - spot.y, p.z - spot.z));
        shark.path(tNow + 0.05 * (k + 1), probe); rawClosest = Math.min(rawClosest, Math.hypot(probe.x - spot.x, probe.z - spot.z));
      }
      // Its route runs straight through the diver, but it swings wide every time,
      // even after the diver has hung still for a minute and a half.
      expect(rawClosest).toBeLessThan(0.6);
      expect(closest).toBeGreaterThan(reducedMotion ? 1.5 : 2.5);
      expect(t.errors).toEqual([]);
    });
  }

  for (const reducedMotion of [false, true]) {
    it('holds a small farm beside a grazing patch and darts at grazers that come near' + (reducedMotion ? ' under reduced motion' : ''), () => {
      const t = dive(population, { reducedMotion, seed: SEED }), farmers = t.find('dusky_farmerfish'), grazers = t.find('parrotfish');
      expect(farmers).toHaveLength(2);
      for (const f of farmers) expect(f.farm, 'farm state').toBeTruthy();
      // Neighbouring farms do not share one spot.
      expect(Math.hypot(farmers[0].farm.x - farmers[1].farm.x, farmers[0].farm.z - farmers[1].farm.z)).toBeGreaterThan(1);
      const away = [], toward = [], heights = [], outNear = [], outFar = [];
      // Each parrotfish works its round of grazing patches (and visits a cleaning station);
      // watch about two rounds, read from its schedule rather than pinned.
      const seconds = Math.min(420, 2.2 * Math.max(...grazers.map(g => g.eco.period)) + 10);
      for (let k = 0; k < seconds * 20; k++) {
        t.step(50);
        for (const f of farmers) {
          const p = f.root.position, c = f.farm, dx = p.x - c.x, dz = p.z - c.z, up = p.y - t.kit.rock(p.x, p.z);
          away.push(Math.hypot(dx, dz)); heights.push(up);
          // Never inside the rock; it rises only to clear coral on its way to a grazer.
          expect(up, 'above the rock at step ' + k).toBeGreaterThan(0.05);
          expect(up, 'height over the rock at step ' + k).toBeLessThan(1.5);
          let nearest = Infinity;
          for (const g of grazers) {
            const gp = g.root.position, gx = gp.x - c.x, gz = gp.z - c.z, gd = Math.hypot(gx, gz);
            nearest = Math.min(nearest, gd);
            if (gd < 1.4) toward.push((dx * gx + dz * gz) / gd);
          }
          (nearest < 1.4 ? outNear : nearest > 3 ? outFar : []).push(Math.hypot(dx, dz));
        }
      }
      const reach = reducedMotion ? 0.65 : 1.3;
      // Most of the time it hangs over its patch; it never strays beyond its territory.
      expect(median(away)).toBeLessThan(0.4);
      expect(Math.max(...away)).toBeLessThan(reach + 0.45);
      // Low over its own turf.
      expect(median(heights)).toBeLessThan(0.45);
      // Grazers do come to the patch next door, and the farmer goes out to meet them.
      expect(toward.length, 'grazer visits').toBeGreaterThan(10);
      expect(median(toward)).toBeGreaterThan(reducedMotion ? 0.2 : 0.35);
      expect(median(outNear), 'out from the centre while a grazer is near').toBeGreaterThan(median(outFar) + (reducedMotion ? 0.1 : 0.2));
      expect(t.errors).toEqual([]);
    });
  }
});
