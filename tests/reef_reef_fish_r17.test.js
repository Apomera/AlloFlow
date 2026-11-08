import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Four reef fish (round 17, lane fish): foxface rabbitfish, leopard coral grouper,
// dash-and-dot goatfish and sixbar wrasse. The models must show the field marks the guide
// teaches, and the dive must place each where it lives. Facts and sources:
// lane_fish/NOTES.md (Fishes of Australia, FishBase, Australian Museum, Brandl and
// Bellwood 2015, Fulton et al. 2005 and 2017).
vi.setConfig({ testTimeout: 120000 });
const T = createRequire(import.meta.url)('../vendor/three-r128/three.min.js'), w = {};
const SPECIES = readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8');
const EXPLORE = readFileSync(process.env.REEF3D_EXPLORE_SOURCE || 'stem_lab/reef_3d_explore.js', 'utf8');
new Function('window', SPECIES)(w);
const S = w.Reef3DSpecies, IDS = ['foxface_rabbitfish', 'leopard_coral_grouper', 'dash_and_dot_goatfish', 'sixbar_wrasse'];
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
// The body texture as 0..1 sRGB; u runs snout to peduncle, v from the belly (0) round to the back (0.5).
function rgb(h, u, v) {
  const im = meshes(h.root).find(m => m.material.map).material.map.image, at = (Math.floor(v * im.height) * im.width + Math.floor(u * im.width)) * 4;
  return [im.data[at] / 255, im.data[at + 1] / 255, im.data[at + 2] / 255];
}
const U = x => (0.5 - x) / 0.79; // every new body runs from x = 0.5 to about -0.29
const sum = c => c[0] + c[1] + c[2];
function box(h, name) {
  const mesh = h.root.getObjectByName(h.root.userData.speciesId + '-' + name);
  if (mesh) return new T.Box3().setFromObject(mesh);
  const p = part(h, name), pos = p.m.geometry.attributes.position, b = new T.Box3(), v = new T.Vector3();
  p.m.updateWorldMatrix(true, false);
  for (let i = p.e.first; i < p.e.first + p.e.count; i++) b.expandByPoint(v.fromBufferAttribute(pos, i).applyMatrix4(p.m.matrixWorld));
  return b;
}
const median = a => a.slice().sort((p, q) => p - q)[Math.floor(a.length / 2)];

describe('round 17 reef fish specimens', () => {
  it('registers four lofted fish together after the dusky farmerfish, with sourced sizes and depths', () => {
    for (const id of IDS) expect(S.ids.filter(x => x === id), id).toHaveLength(1);
    const at = S.ids.indexOf(IDS[0]);
    expect(S.ids.slice(at, at + 4)).toEqual(IDS);
    expect(at).toBe(S.ids.indexOf('dusky_farmerfish') + 1);
    expect(S.info('foxface_rabbitfish')).toMatchObject({ group: 'fish', habit: 'pair', lengthM: 0.2, depthM: [1, 30], schoolSize: null, origin: 'centre', healthStates: ['healthy'] });
    expect(S.info('leopard_coral_grouper')).toMatchObject({ group: 'fish', habit: 'solitary', lengthM: 0.45, depthM: [3, 100], schoolSize: null });
    expect(S.info('dash_and_dot_goatfish')).toMatchObject({ group: 'fish', habit: 'solitary', lengthM: 0.3, depthM: [1, 100], schoolSize: null });
    expect(S.info('sixbar_wrasse')).toMatchObject({ group: 'fish', habit: 'solitary', lengthM: 0.15, depthM: [0, 15], schoolSize: null });
    for (const id of IDS) expect(S.info(id).portrait.dir, id).toHaveLength(3);
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
  }

  it('gives each the body outline its sources describe', () => {
    const ratio = id => { const h = make(id); try { const b = box(h, 'body').getSize(new T.Vector3()); return b.x / b.y; } finally { h.dispose(); } };
    // Body depth in standard length: foxface 1.9 to 2.4, coral trout 2.9 to 3.6 (the
    // lofted body includes the snout tip and peduncle, so the ratios run a little high).
    expect(ratio('foxface_rabbitfish')).toBeGreaterThan(1.8); expect(ratio('foxface_rabbitfish')).toBeLessThan(2.4);
    expect(ratio('leopard_coral_grouper')).toBeGreaterThan(2.8); expect(ratio('leopard_coral_grouper')).toBeLessThan(3.6);
    expect(ratio('sixbar_wrasse')).toBeGreaterThan(3); expect(ratio('dash_and_dot_goatfish')).toBeGreaterThan(3);
  });

  it('paints the foxface yellow behind a white head, with the black eye band and chest patch, and stands spines on its back', () => {
    for (const quality of ['low', 'high']) {
      const h = make('foxface_rabbitfish', quality);
      try {
        const body = rgb(h, U(0.05), 0.25), head = rgb(h, U(0.235), 0.25);
        expect(body[0] > 0.8 && body[1] > 0.6 && body[2] < 0.35, quality + ' yellow body ' + body).toBe(true);
        expect(Math.min(...head), quality + ' white head ' + head).toBeGreaterThan(0.8);
        expect(sum(rgb(h, U(0.44), 0.354)), quality + ' band between mouth and eye').toBeLessThan(0.6);
        expect(sum(rgb(h, U(0.3), 0.04)), quality + ' chest patch').toBeLessThan(0.6);
        // Spines stand above the body and below it, out of the dorsal and anal webs.
        const b = box(h, 'body'), d = box(h, 'detail'), L = b.max.x - b.min.x;
        expect(d.max.y - b.max.y, quality + ' dorsal spines').toBeGreaterThan(0.05 * L);
        expect(b.min.y - d.min.y, quality + ' anal spines').toBeGreaterThan(0.04 * L);
      } finally { h.dispose(); }
    }
  });

  it('dots the coral trout with blue above but not on the belly, rings the eye and edges the tail in white', () => {
    const h = make('leopard_coral_grouper');
    try {
      const share = (v0, v1) => { let n = 0, k = 0; for (let u = 0.1; u < 0.85; u += 0.004) for (let v = v0; v < v1; v += 0.004) { const c = rgb(h, u, v); n++; if (c[2] > c[0] + 0.1) k++; } return k / n; };
      expect(share(0.3, 0.46), 'blue spots on the flank and back').toBeGreaterThan(0.04);
      expect(share(0.0, 0.035), 'no spots on the underside').toBeLessThan(0.005);
      // The eye ring (radius 0.027 round the eye at x 0.39) crosses the column in front of
      // the eye and the one behind it, on the upper half of the head.
      for (const x of [0.39 + 0.027, 0.39 - 0.027]) {
        let blue = 0; for (let v = 0.3; v < 0.48; v += 0.002) { const c = rgb(h, U(x), v); blue = Math.max(blue, c[2] - c[0]); }
        expect(blue, 'blue eye ring at x ' + x).toBeGreaterThan(0.3);
      }
      const tail = vertices(h, 'tail'), edge = tail.filter(c => c.v > 0.99);
      expect(edge.filter(c => c.u > 0.3 && c.u < 0.7).every(c => c.sum > 2.2), 'white rear margin').toBe(true);
      expect(edge.filter(c => c.u < 0.02 || c.u > 0.98).every(c => c.sum < 1.2), 'margin stops short of the corners').toBe(true);
    } finally { h.dispose(); }
  });

  it('draws the goatfish dash through the eye, a separate dot at the tail and two chin barbels', () => {
    for (const quality of ['low', 'high']) {
      const h = make('dash_and_dot_goatfish', quality);
      try {
        let darkest = 9, at = 0;
        for (let v = 0.2; v <= 0.5; v += 0.005) { const s = sum(rgb(h, U(0.2), v)); if (s < darkest) { darkest = s; at = v; } }
        expect(darkest, quality + ' stripe').toBeLessThan(0.8); expect(at, quality + ' stripe on the upper side').toBeGreaterThan(0.3);
        const above = rgb(h, U(0.2), 0.47);
        expect(above[0] > above[2] + 0.15, quality + ' yellowish above the stripe ' + above).toBe(true);
        expect(sum(rgb(h, U(-0.26), 0.25)), quality + ' tail spot').toBeLessThan(0.5);
        expect(sum(rgb(h, U(-0.2), 0.25)), quality + ' pale between dash and dot').toBeGreaterThan(2.4);
        const b = box(h, 'body'), d = box(h, 'detail'), L = b.max.x - b.min.x;
        expect(b.min.y - d.min.y, quality + ' barbels reach below the chin').toBeGreaterThan(0.05 * L);
        expect(d.max.x - b.max.x, quality + ' barbels stay at the head').toBeLessThan(0.02 * L);
      } finally { h.dispose(); }
    }
  });

  it('bars the wrasse six times along the back, shorter toward the tail, with pink bands at the eye and long pectoral fins', () => {
    const h = make('sixbar_wrasse');
    try {
      const runs = v => { let n = 0, inBar = false; for (let u = 0.05; u < 0.99; u += 0.002) { const dark = sum(rgb(h, u, v)) < 0.6; if (dark && !inBar) n++; inBar = dark; } return n; };
      expect(runs(0.47), 'six bars high on the side').toBe(6);
      expect(runs(0.3), 'only the long front bars reach the middle').toBeLessThan(4);
      expect(runs(0.3)).toBeGreaterThan(0);
      let pink = 0;
      for (let u = 0.08; u < 0.3; u += 0.004) for (let v = 0.15; v < 0.45; v += 0.004) { const c = rgb(h, u, v); if (c[0] > c[1] + 0.25 && c[2] > c[1]) pink++; }
      expect(pink, 'pink bands on the head').toBeGreaterThan(20);
      const pec = box(h, 'pectoral').getSize(new T.Vector3()), L = box(h, 'body').getSize(new T.Vector3()).x;
      expect(Math.max(pec.x, pec.y, pec.z) / L, 'long side fins').toBeGreaterThan(0.12);
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
const instrumented = EXPLORE.replace('canvas._reef3dExplore = controller;',
  'global.reefTest = { organisms: organisms, diver: diverPos, ground: groundTop, floor: terrain.floorY, sand: terrain.sandMask, bommies: bommies }; canvas._reef3dExplore = controller;');
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
  const step = (ms = 50) => { clock += ms; const todo = [...frames.values()]; frames.clear(); todo.forEach(fn => fn(clock)); };
  step();
  return { controller, kit, find, step, errors };
}

describe.each([5101, 5102])('round 17 reef fish on the dive (seed %i)', (SEED) => {
  const population = [{ id: 'foxface_rabbitfish', count: 2 }, { id: 'leopard_coral_grouper', count: 1 }, { id: 'dash_and_dot_goatfish', count: 1 }, { id: 'sixbar_wrasse', count: 1 }, { id: 'parrotfish', count: 1 }, { id: 'brain_coral', count: 3 }];

  it('keeps the foxface pair together, the coral trout by a coral head, the goatfish low over sand and the wrasse ranging along the crest', () => {
    const t = dive(population, { seed: SEED });
    const fox = t.find('foxface_rabbitfish'), trout = t.find('leopard_coral_grouper')[0], goat = t.find('dash_and_dot_goatfish')[0], six = t.find('sixbar_wrasse')[0];
    expect(fox).toHaveLength(2);
    expect(fox.map(o => o.behavior)).toEqual(['pair', 'pair']);
    expect(fox.some(o => o.leader && fox.includes(o.leader)), 'one swims with the other').toBe(true);
    expect([trout.behavior, goat.behavior, six.behavior]).toEqual(['hover', 'cuttle', 'roam']);
    // The coral trout's home is set beside a coral head; the goatfish's on sand; the wrasse's on the crest.
    expect(trout.bommie, 'coral trout placed beside a coral head').toBeTruthy();
    expect(t.kit.sand(goat.home.x, goat.home.z), 'goatfish home on sand').toBeGreaterThan(0.5);
    expect(six.home.z, 'wrasse home on the reef crest').toBeLessThan(-13);
    const gap = [], troutAway = [], goatUp = [], sixTrack = [];
    for (let k = 0; k < 120; k++) {
      for (let i = 0; i < 10; i++) t.step(50);
      gap.push(fox[0].root.position.distanceTo(fox[1].root.position));
      troutAway.push(Math.hypot(trout.root.position.x - trout.home.x, trout.root.position.z - trout.home.z));
      const g = goat.root.position; goatUp.push(g.y - t.kit.floor(g.x, g.z));
      sixTrack.push(six.root.position.clone());
    }
    expect(median(gap), 'pair stays close').toBeLessThan(1.5);
    expect(median(troutAway), 'coral trout stays by its coral head').toBeLessThan(1.2);
    expect(median(goatUp), 'goatfish close over the bottom').toBeLessThan(0.95);
    expect(t.kit.sand(goat.root.position.x, goat.root.position.z), 'still over sand').toBeGreaterThan(0.3);
    expect(Math.min(...goatUp), 'never in the sand').toBeGreaterThan(0.1);
    const xs = sixTrack.map(p => p.x), zs = sixTrack.map(p => p.z);
    expect(Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)), 'wrasse ranges widely').toBeGreaterThan(4);
    expect(t.errors).toEqual([]);
  });
});
