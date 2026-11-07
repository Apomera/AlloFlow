import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { runtime, census } from './helpers/reef_life_harness.js';

// Lofted models of three reef predators, the barracuda school and their dive behaviour.
const T = createRequire(import.meta.url)('../vendor/three-r128/three.min.js'), w = {};
new Function('window', readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8'))(w);
const S = w.Reef3DSpecies, IDS = ['blackfin_barracuda', 'titan_triggerfish', 'bluefin_trevally'];
const make = (id, quality = 'high', o = {}) => S.create(T, id, { seed: 7, quality, ...o });
function meshes(root) { const a = []; root.traverse(m => { if (m.isMesh) a.push(m); }); return a; }
function tris(root) { return meshes(root).reduce((n, m) => n + m.geometry.index.count / 3 * (m.isInstancedMesh ? m.count : 1), 0); }
function snap(root) { root.updateMatrixWorld(true); const a = []; root.traverse(o => { a.push(...o.matrixWorld.elements); if (o.isInstancedMesh) a.push(...o.instanceMatrix.array); if (o.isMesh) a.push(...o.geometry.attributes.position.array); }); return a; }
function part(h, name) { for (const m of meshes(h.root)) { const e = m.geometry.userData.batch && m.geometry.userData.batch.find(r => r.part === name); if (e) return { m, e }; } return null; }
function colours(h, name) { const p = part(h, name), c = p.m.geometry.attributes.color, uv = p.m.geometry.attributes.uv, out = []; for (let i = p.e.first; i < p.e.first + p.e.count; i++) out.push({ r: c.getX(i), g: c.getY(i), b: c.getZ(i), v: uv.getY(i) }); return out; }
function texel(h, u, v) { const im = part(h, 'fins') ? meshes(h.root).find(m => m.material.map).material.map.image : null, at = (Math.floor(v * im.height) * im.width + Math.floor(u * im.width)) * 4; return [...im.data.slice(at, at + 3)]; }

describe('reef predator specimens', () => {
  it('registers three lofted fish after the bannerfish with sourced sizes, depths and portrait views', () => {
    const at = S.ids.indexOf('longfin_bannerfish');
    expect(S.ids.slice(at + 1, at + 4)).toEqual(IDS);
    expect(S.info('blackfin_barracuda')).toMatchObject({ group: 'fish', habit: 'school', lengthM: 0.8, depthM: [1, 100], schoolSize: [8, 24], origin: 'centre', healthStates: ['healthy'] });
    expect(S.info('titan_triggerfish')).toMatchObject({ group: 'fish', habit: 'solitary', lengthM: 0.6, depthM: [1, 50], schoolSize: null });
    expect(S.info('bluefin_trevally')).toMatchObject({ group: 'fish', habit: 'solitary', lengthM: 0.6, depthM: [1, 190], schoolSize: null });
    for (const id of IDS) expect(S.info(id).portrait.dir).toHaveLength(3);
    expect(() => S.createSchool(T, 'blackfin_barracuda', 10)).not.toThrow();
  });
  for (const quality of ['low', 'high']) {
    it('keeps each predator to two finite draws within the ' + quality + ' animal budget', () => {
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
    it('keeps the body outlines that tell them apart at ' + quality, () => {
      const box = id => { const h = make(id, quality); try { return new T.Box3().setFromObject(h.root.getObjectByName(id + '-body')).getSize(new T.Vector3()); } finally { h.dispose(); } };
      const barracuda = box('blackfin_barracuda'), trigger = box('titan_triggerfish'), trevally = box('bluefin_trevally');
      expect(barracuda.x / barracuda.y).toBeGreaterThan(5.5);
      expect(trevally.x / trevally.y).toBeLessThan(3); expect(trevally.x / trevally.y).toBeGreaterThan(1.8);
      expect(trigger.x / trigger.y).toBeLessThan(2);
    });
  }
  it('paints chevron bars, a dark tail, blue trevally fins and black-edged triggerfish fins', () => {
    const b = make('blackfin_barracuda'), g = make('titan_triggerfish'), t = make('bluefin_trevally');
    try {
      // Along one row above the lateral line the barracuda flank alternates dark and pale many times.
      let flips = 0, last;
      for (let i = 0; i < 400; i++) { const c = texel(b, 0.25 + 0.5 * i / 399, 0.33), dark = c[0] + c[1] + c[2] < 330; if (last !== undefined && dark !== last) flips++; last = dark; }
      expect(flips).toBeGreaterThanOrEqual(24);
      const tail = colours(b, 'tail'); expect(tail.filter(c => c.v > 0.5).every(c => c.r + c.g + c.b < 0.1)).toBe(true);
      for (const name of ['tail', 'fins']) { const blue = colours(t, name).filter(c => c.b > 0.3 && c.b > c.r * 3); expect(blue.length, name).toBeGreaterThan(20); }
      const fins = colours(g, 'fins'), edge = fins.filter(c => c.v === 1);
      expect(edge.filter(c => c.r + c.g + c.b < 0.05).length).toBeGreaterThan(edge.length * 0.6);
      const roots = fins.filter(c => c.v === 0); expect(roots.filter(c => c.r > 0.25).length).toBeGreaterThan(roots.length * 0.6);
    } finally { b.dispose(); g.dispose(); t.dispose(); }
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
  it('schools barracuda as five instanced draws inside the member budget, frozen under reduced motion', () => {
    for (const quality of ['low', 'high']) {
      const s = S.createSchool(T, 'blackfin_barracuda', 24, { seed: 4, quality });
      try {
        const ms = meshes(s.root); expect(ms).toHaveLength(5); expect(ms.every(m => m.isInstancedMesh && m.count === 24)).toBe(true);
        expect(tris(s.root) / 24).toBeLessThanOrEqual(quality === 'high' ? 1500 : 400);
        const before = snap(s.root); s.update(0.016, 3.1); expect(snap(s.root)).not.toEqual(before);
      } finally { s.dispose(); }
    }
    const still = S.createSchool(T, 'blackfin_barracuda', 16, { seed: 4, reducedMotion: true }), a = snap(still.root);
    try { still.update(0.016, 4); still.update(0.016, 40); expect(snap(still.root)).toEqual(a); } finally { still.dispose(); }
  });
});

describe('reef predators on the dive', () => {
  const population = [{ id: 'blackfin_barracuda', count: 1 }, { id: 'titan_triggerfish', count: 1 }, { id: 'bluefin_trevally', count: 1 }, { id: 'brain_coral', count: 3 }];
  const site = { seed: 5101, depthM: 9, health: { coralCover: 0.55, bleaching: 0, algae: 0.05 }, population, restoration: null };
  it('places one slowly circling barracuda school in open water above the other predators', () => {
    const errors = [], session = runtime({ site, onError: e => errors.push(String(e)) }, { species: 'real' });
    try {
      session.run(0.5);
      const find = id => census(session).find(o => o.speciesId === id);
      for (const id of IDS) { expect(find(id), id).toBeTruthy(); expect(session.controller.findSpecies(id)?.uid).toBe(find(id).uid); }
      const school = find('blackfin_barracuda').object; let n = 0; school.traverse(o => { if (o.isInstancedMesh && o.userData.part === 'body') n = o.count; });
      expect(n).toBeGreaterThanOrEqual(8); expect(n).toBeLessThanOrEqual(24);
      const track = [];
      for (let k = 0; k < 40; k++) { session.run(1); track.push(school.position.clone()); }
      const centre = track.reduce((c, p) => c.add(p), new T.Vector3()).multiplyScalar(1 / track.length);
      const radii = track.map(p => Math.hypot(p.x - centre.x, p.z - centre.z)), speeds = track.slice(1).map((p, i) => p.distanceTo(track[i]));
      // An easy cruise (0.22 to 0.3 m/s by design); the school only speeds up briefly when it
      // steers clear of something, as real schools do.
      expect(speeds.slice().sort((p, q) => p - q)[Math.floor(speeds.length / 2)]).toBeLessThan(0.4);
      expect(Math.max(...speeds)).toBeLessThan(1);
      expect(Math.min(...radii)).toBeGreaterThan(1.2); expect(Math.max(...radii)).toBeLessThan(8);
      // Mid-water: well above the sea floor under the school (it is placed 2.4 to 3.6 m up).
      // The floor is the dive's own height field, rebuilt from the same seed and depth.
      const scope = {};
      new Function('window', readFileSync(process.env.REEF3D_EXPLORE_SOURCE || 'stem_lab/reef_3d_explore.js', 'utf8')
        .replace('global.Reef3DExplore = { version:', 'global.terrainTest = { createTerrain }; global.Reef3DExplore = { version:'))(scope);
      const terrain = scope.terrainTest.createTerrain(site.seed, site.depthM, 4.5);
      const lowest = Math.min(...track.map(p => p.y - terrain.floorY(p.x, p.z)));
      expect(lowest).toBeGreaterThan(1.8);
      expect(centre.y - terrain.floorY(centre.x, centre.z)).toBeGreaterThan(find('titan_triggerfish').pos.y - terrain.floorY(find('titan_triggerfish').pos.x, find('titan_triggerfish').pos.z) + 1);
      expect(errors).toEqual([]);
    } finally { session.dispose(); }
  });
});
