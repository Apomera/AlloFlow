import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it } from 'vitest';
import { runtime, census } from './helpers/reef_life_harness.js';

// Reef shapers: Drupella snails on a scarred coral tip, a pincushion sea star,
// a Spanish dancer and a banded coral shrimp. Pins only these four models and
// their own dive behaviour, so other lanes can add species alongside them.
const T = createRequire(import.meta.url)('../vendor/three-r128/three.min.js'), w = {};
new Function('window', readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8'))(w);
const S = w.Reef3DSpecies;
const IDS = ['drupella_snail', 'pincushion_sea_star', 'spanish_dancer', 'banded_coral_shrimp'];
const INFO = { drupella_snail: ['bottom', 0.035, [0, 30]], pincushion_sea_star: ['bottom', 0.25, [0, 30]], spanish_dancer: ['bottom', 0.30, [1, 50]], banded_coral_shrimp: ['crevice', 0.06, [1, 60]] };
const PARTS = { drupella_snail: ['coral-tip-and-shells', 'siphons-tentacles'], pincushion_sea_star: ['inflated-cushion-body', 'oral-tube-feet'], spanish_dancer: ['body-rhinophores-gills', 'undulating-mantle-skirt'], banded_coral_shrimp: ['banded-body-legs-tail', 'banded-claws-white-antennae'] };
const KEY = { drupella_snail: 'drupellaCluster', pincushion_sea_star: 'pincushionStar', spanish_dancer: 'spanishDancer', banded_coral_shrimp: 'bandedCoralShrimp' };
const make = (id, quality = 'high', options = {}) => S.create(T, id, { quality, seed: 7, ...options });
function meshes(h) { const a = []; h.root.traverse(m => { if (m.isMesh) a.push(m); }); return a; }
function buffers(h) { return meshes(h).map(m => [...m.geometry.attributes.position.array]); }
function pose(h) { const a = []; h.root.traverse(n => a.push([...n.position.toArray(), ...n.quaternion.toArray(), ...n.scale.toArray()])); return a; }
function bounds(h) { h.root.updateMatrixWorld(true); const b = new T.Box3(), p = new T.Vector3(); for (const m of meshes(h)) for (let i = 0; i < m.geometry.attributes.position.count; i++) b.expandByPoint(p.fromBufferAttribute(m.geometry.attributes.position, i).applyMatrix4(m.matrixWorld)); return b; }
const tris = h => meshes(h).reduce((n, m) => n + m.geometry.index.count / 3, 0);
const lum = c => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const sat = c => { const mx = Math.max(...c), mn = Math.min(...c); return mx > 0 ? (mx - mn) / mx : 0; };
function colours(g, range) { const c = g.attributes.color, out = []; for (let i = range.first; i < range.first + range.count; i++) out.push([c.getX(i), c.getY(i), c.getZ(i)]); return out; }

describe('reef shaper specimens: registry', () => {
  it('registers four base-origin invertebrates with sourced sizes and depths and guide portrait cameras', () => {
    for (const id of IDS) {
      expect(S.ids, id).toContain(id);
      expect(S.info(id), id).toMatchObject({ group: 'invertebrate', habit: INFO[id][0], lengthM: INFO[id][1], depthM: INFO[id][2], origin: 'base', schoolSize: null, healthStates: ['healthy'] });
      const p = S.info(id).portrait, len = Math.hypot(...p.dir);
      expect(len, id).toBeGreaterThan(1.3); expect(len, id).toBeLessThan(4.5); expect(p.lookY).toBeGreaterThanOrEqual(0); expect(p.lookY).toBeLessThanOrEqual(1);
      expect(() => S.createSchool(T, id, 3)).toThrow();
    }
  });
});

describe('reef shaper specimens: geometry', () => {
  for (const quality of ['low', 'high']) {
    it('builds finite, grounded, two-draw models within the animal budget at ' + quality, () => {
      for (const id of IDS) for (const seed of [7, 23]) {
        const h = make(id, quality, { seed });
        try {
          const ms = meshes(h), b = bounds(h);
          expect(ms.map(m => m.userData.part), id).toEqual(PARTS[id]);
          expect(tris(h), id).toBeLessThanOrEqual(quality === 'high' ? 6000 : 1500);
          expect(b.min.y, id).toBeGreaterThanOrEqual(-1e-6); expect(b.min.y, id).toBeLessThan(0.002);
          expect(h.radius / S.info(id).lengthM, id).toBeLessThan(1.6);
          for (const m of ms) {
            for (const a of Object.values(m.geometry.attributes)) expect([...a.array].every(Number.isFinite), id).toBe(true);
            expect([...m.geometry.index.array].every(i => i >= 0 && i < m.geometry.attributes.position.count), id).toBe(true);
            expect(m.material.transparent, id).toBe(false); expect(m.material.emissive.getHex(), id).toBe(0);
            expect(!!m.material.map && !!m.material.vertexColors && m.material.side === T.DoubleSide, id + ' shared family').toBe(true);
          }
          expect(ms[0].material, id + ' one material for both parts').toBe(ms[1].material);
        } finally { h.dispose(); }
      }
    });
  }

  it('shows Drupella snails clustered at the edge of living tissue on a white feeding scar', () => {
    for (const quality of ['low', 'high']) {
      const h = make('drupella_snail', quality);
      try {
        const g = meshes(h)[0].geometry, d = g.userData.drupellaCluster, branch = d.ranges['branch-tip-live-tissue-and-scar'], p = g.attributes.position;
        expect(d.snailCount).toBe(4); expect(d.snails).toHaveLength(4); expect(d.feedingScar).toBe(true);
        for (const s of d.snails) { expect(s.nodeRows).toBe(4); expect(s.nodules).toBeGreaterThanOrEqual(12); }
        const cols = colours(g, branch), ys = []; for (let i = branch.first; i < branch.first + branch.count; i++) ys.push(p.getY(i));
        const scar = cols.filter((c, i) => lum(c) > 0.75 && sat(c) < 0.1), live = cols.filter((c, i) => c[0] > c[2] * 1.6 && lum(c) < 0.5 && ys[i] > 0.03);
        expect(scar.length / cols.length, quality + ' bare white scar').toBeGreaterThan(0.2);
        expect(live.length / cols.length, quality + ' brown living tips').toBeGreaterThan(0.1);
        // The snails sit within the scar band, below the living tips.
        const soft = meshes(h)[1].geometry.userData.drupellaCluster.snails, topLive = Math.max(...ys);
        for (const s of soft) expect(s.origin[1] * d.scaleM, 'snail below the living tips').toBeLessThan(topLive * 0.85);
      } finally { h.dispose(); }
    }
    const a = make('drupella_snail', 'low'), b = make('drupella_snail', 'high');
    try { expect(meshes(a)[1].geometry.userData.drupellaCluster.snails.map(s => s.origin)).toEqual(meshes(b)[1].geometry.userData.drupellaCluster.snails.map(s => s.origin)); } finally { a.dispose(); b.dispose(); }
  });

  it('gives the pincushion a puffy, almost pentagonal body with five grooves of tube feet', () => {
    const h = make('pincushion_sea_star');
    try {
      const body = meshes(h)[0].geometry, feet = meshes(h)[1].geometry.userData.pincushionStar, d = body.userData.pincushionStar, b = new T.Box3().setFromBufferAttribute(body.attributes.position);
      const width = Math.max(b.max.x - b.min.x, b.max.z - b.min.z), height = b.max.y - b.min.y;
      expect(width).toBeGreaterThan(0.22); expect(width).toBeLessThan(0.28);
      expect(height / width, 'inflated, not flat').toBeGreaterThan(0.25); expect(height / width).toBeLessThan(0.45);
      expect(d.oralGrooves).toBe(5); expect(d.outline).toBe('rounded-pentagon');
      // Five shallow corners: the outline radius peaks five times around.
      const p = body.attributes.position, top = d.ranges['inflated-aboral-cushion'], bins = new Array(40).fill(0);
      for (let i = top.first; i < top.first + top.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)), k = Math.floor(((a + Math.PI) / (2 * Math.PI)) * 40) % 40; bins[k] = Math.max(bins[k], Math.hypot(p.getX(i), p.getZ(i))); }
      let peaks = 0; for (let k = 0; k < 40; k++) if (bins[k] > bins[(k + 39) % 40] && bins[k] >= bins[(k + 1) % 40]) peaks++;
      expect(peaks).toBe(5);
      expect(Math.max(...bins) / Math.min(...bins), 'corners are gentle').toBeLessThan(1.25);
      expect(new Set(feet.feet.map(f => f.arm)).size).toBe(5);
      expect(feet.feet.every(f => f.contact[1] === 0 && f.root[1] > 0)).toBe(true);
    } finally { h.dispose(); }
  });

  it('gives the Spanish dancer six separate gills, a wide mantle and a white rim', () => {
    for (const quality of ['low', 'high']) {
      const h = make('spanish_dancer', quality);
      try {
        const [body, skirt] = meshes(h).map(m => m.geometry), d = body.userData.spanishDancer, s = skirt.userData.spanishDancer;
        expect(d.gillCount).toBe(6); expect(d.gills).toHaveLength(6); expect(d.gillsRetract).toBe(false);
        expect(d.gills.every(g => g.separate && g.branched && g.count > 10)).toBe(true);
        expect(d.rhinophores).toHaveLength(2);
        const rows = d.gills.map(g => g.root[0]); expect(Math.max(...rows), 'gills on the rear of the back').toBeLessThan(-0.15);
        expect(s.spreadWidthM / (2 * 0.57 * d.scaleM), 'mantle spread is wide').toBeGreaterThan(0.6);
        const rim = colours(skirt, d.ranges['white-mantle-rim']).filter(c => lum(c) > 0.7 && sat(c) < 0.15);
        expect(rim.length / d.ranges['white-mantle-rim'].count, quality + ' white rim').toBeGreaterThan(0.45);
        // The mottled red sits in the map, sampled only by the inner mantle and back.
        const map = meshes(h)[0].material.map.image.data; let red = 0, n = 0;
        for (let i = 0; i < map.length; i += 4) { const u = (i / 4) % meshes(h)[0].material.map.image.width / meshes(h)[0].material.map.image.width, v = Math.floor(i / 4 / meshes(h)[0].material.map.image.width) / meshes(h)[0].material.map.image.height; if (u > 0.05 && u < 0.45 && v > 0.05 && v < 0.45) { n++; if (map[i] > map[i + 1] * 1.8 && map[i] > 120) red++; } }
        expect(red / n, 'mostly crimson mottling').toBeGreaterThan(0.6);
      } finally { h.dispose(); }
    }
  });

  it('gives the banded coral shrimp red bands, long banded claws and antennae longer than its body', () => {
    const h = make('banded_coral_shrimp');
    try {
      const [body, reach] = meshes(h).map(m => m.geometry), d = body.userData.bandedCoralShrimp, r = reach.userData.bandedCoralShrimp, L = d.scaleM;
      expect(d.redBands).toBe(3); expect(d.spines).toBeGreaterThan(10); expect(d.walkingPairs).toBe(2);
      const cols = colours(body, d.ranges['banded-abdomen']), red = cols.filter(c => c[0] > 0.3 && c[0] > c[1] * 4), white = cols.filter(c => lum(c) > 0.8);
      expect(red.length / cols.length).toBeGreaterThan(0.2); expect(white.length / cols.length).toBeGreaterThan(0.2);
      const p = reach.attributes.position, tipOf = part => { const k = part.first + part.count - 1; return Math.hypot(p.getX(k) - part.root[0] * L, p.getY(k) - part.root[1] * L, p.getZ(k) - part.root[2] * L); };
      // Length along the curve: ring centres, then the tip.
      const along = part => { const rings = (part.count - 1) / part.sides, pts = []; for (let r = 0; r < rings; r++) { let x = 0, y = 0, z = 0; for (let k = 0; k < part.sides; k++) { const i = part.first + r * part.sides + k; x += p.getX(i); y += p.getY(i); z += p.getZ(i); } pts.push([x / part.sides, y / part.sides, z / part.sides]); } let n = 0; for (let r = 1; r < pts.length; r++) n += Math.hypot(pts[r][0] - pts[r - 1][0], pts[r][1] - pts[r - 1][1], pts[r][2] - pts[r - 1][2]); return n; };
      const antennae = r.parts.filter(q => q.kind === 'antenna'), claws = r.parts.filter(q => q.kind === 'claw');
      expect(antennae).toHaveLength(2); expect(claws.length).toBeGreaterThanOrEqual(2);
      for (const a of antennae) expect(along(a), 'antenna longer than the body').toBeGreaterThan(1.0 * L);
      expect(Math.max(...claws.map(tipOf)), 'claws reach well forward').toBeGreaterThan(0.6 * L);
    } finally { h.dispose(); }
  });
});

describe('reef shaper specimens: motion', () => {
  it('moves only the soft parts, deterministically in absolute time, and freezes for reduced motion', () => {
    for (const id of IDS) {
      const a = make(id), b = make(id), still = make(id, 'high', { reducedMotion: true });
      try {
        a.root.position.set(3, -2, 5); a.root.rotation.y = 0.6;
        const fixed = [...meshes(a)[0].geometry.attributes.position.array], soft = [...meshes(a)[1].geometry.attributes.position.array], p0 = pose(a);
        a.update(0.016, 2.5); a.update(0.016, 4);
        expect([...meshes(a)[0].geometry.attributes.position.array], id + ' fixed part').toEqual(fixed);
        expect(pose(a), id + ' placement').toEqual(p0);
        const moved = meshes(a)[1].geometry.attributes.position.array.reduce((m, v, i) => Math.max(m, Math.abs(v - soft[i])), 0);
        expect(moved, id + ' soft part moves').toBeGreaterThan(1e-5);
        b.root.position.set(3, -2, 5); b.root.rotation.y = 0.6; b.update(4, 4);
        expect(buffers(a), id + ' absolute time').toEqual(buffers(b));
        const frozen = buffers(still); for (const t of [1, 10, 100]) still.update(0.016, t);
        expect(buffers(still), id + ' reduced motion').toEqual(frozen);
      } finally { a.dispose(); b.dispose(); still.dispose(); }
    }
  });

  it('ripples the dancer mantle harder when it swims fast', () => {
    const slow = make('spanish_dancer'), fast = make('spanish_dancer');
    try {
      const rest = [...meshes(slow)[1].geometry.attributes.position.array];
      const spread = h => { const a = meshes(h)[1].geometry.attributes.position.array; let lo = Infinity, hi = -Infinity; for (let i = 1; i < a.length; i += 3) { lo = Math.min(lo, a[i]); hi = Math.max(hi, a[i]); } return hi - lo; };
      slow.update(0.016, 3, { speed: 0.005 }); fast.update(0.016, 3, { speed: 0.4 });
      expect(spread(fast)).toBeGreaterThan(spread(slow) * 1.25);
      expect(Math.min(...[...meshes(fast)[1].geometry.attributes.position.array].filter((v, i) => i % 3 === 1)), 'rim stays above the floor').toBeGreaterThan(0);
      expect(rest.length).toBe(meshes(fast)[1].geometry.attributes.position.array.length);
    } finally { slow.dispose(); fast.dispose(); }
  });

  it('releases every owned resource exactly once', () => {
    for (const id of IDS) {
      const a = make(id), b = make(id), ms = meshes(a); let geometries = 0, materials = 0;
      for (const m of ms) m.geometry.addEventListener('dispose', () => geometries++);
      const mats = new Set(ms.map(m => m.material)); for (const m of mats) m.addEventListener('dispose', () => materials++);
      expect(ms[0].material.map, id + ' shared texture').toBe(meshes(b)[0].material.map);
      a.dispose(); a.dispose(); expect([geometries, materials], id).toEqual([2, 1]);
      b.dispose(); expect(() => a.update(0.1, 2)).not.toThrow();
    }
  });
});

describe('reef shapers in the dive', () => {
  const dives = [];
  afterEach(() => { while (dives.length) dives.pop().dispose(); });
  function rockBelow(t, x, z) {
    const ray = new T.Raycaster(new T.Vector3(x, 5, z), new T.Vector3(0, -1, 0)), targets = [];
    t.scene.traverse(o => { if (o.isMesh && /^reef-explore-(floor|bommies)/.test(o.name)) targets.push(o); });
    const hit = ray.intersectObjects(targets, false)[0];
    return hit ? hit.point.y : null;
  }
  const site = (population, extra = {}) => ({ seed: 29, depthM: 9, health: { coralCover: 0.5, bleaching: 0, algae: 0.05 }, population, restoration: null, ...extra });

  it.each(['real', null])('places all four, findable and finite, with species catalog %s', species => {
    const errors = [], t = runtime({ onError: e => errors.push(String(e)), site: site([...IDS.map(id => ({ id, count: id === 'banded_coral_shrimp' ? 2 : 1 })), { id: 'table_coral', count: 2 }, { id: 'cauliflower_coral', count: 2 }]) }, { species });
    dives.push(t);
    expect(t.controller.getState().ready).toBe(true);
    const all = census(t);
    for (const id of IDS) {
      expect(all.filter(o => o.speciesId === id).length, id).toBe(id === 'banded_coral_shrimp' ? 2 : 1);
      const found = t.controller.findSpecies(id); expect(found).toMatchObject({ speciesId: id }); expect(Number.isFinite(found.distanceM)).toBe(true);
    }
    t.run(4);
    for (const o of census(t)) expect(o.pos.toArray().every(Number.isFinite), o.speciesId).toBe(true);
    expect(errors).toEqual([]);
  }, 60000);

  it('keeps the banded coral shrimp pair together at one cleaning station', () => {
    const t = runtime({ site: site([{ id: 'banded_coral_shrimp', count: 2 }, { id: 'cleaner_shrimp', count: 2 }]) }, { species: 'real' });
    dives.push(t);
    const pair = census(t).filter(o => o.speciesId === 'banded_coral_shrimp').map(o => o.pos.clone());
    expect(pair).toHaveLength(2);
    expect(pair[0].distanceTo(pair[1]), 'side by side').toBeLessThan(0.4);
    let stations = []; t.scene.traverse(o => { if (o.userData && o.userData.cleaningStations) stations = o.userData.cleaningStations; });
    expect(stations.length).toBeGreaterThan(0);
    const near = Math.min(...stations.map(s => Math.hypot(s.spot[0] - pair[0].x, s.spot[2] - pair[0].z)));
    expect(near, 'at a station').toBeLessThan(0.5);
  }, 60000);

  it('puts the pincushion sea star on a coral colony beside a white feeding scar', () => {
    const t = runtime({ site: site([{ id: 'pincushion_sea_star', count: 1 }, { id: 'table_coral', count: 3 }, { id: 'foliose_coral', count: 2 }]) }, { species: 'real' });
    dives.push(t);
    const all = census(t), star = all.find(o => o.speciesId === 'pincushion_sea_star'), scars = [];
    t.scene.traverse(o => { if (o.name === 'reef-explore-feeding-scar') scars.push(o); });
    expect(scars).toHaveLength(1);
    const host = all.find(o => o.uid === scars[0].userData.hostUid);
    expect(host && /table_coral|foliose_coral/.test(host.speciesId)).toBe(true);
    const gap = Math.hypot(star.pos.x - scars[0].userData.centre[0], star.pos.z - scars[0].userData.centre[2]);
    expect(gap).toBeGreaterThan(0.1); expect(gap).toBeLessThan(0.6);
    expect(star.pos.y, 'on the colony, not the floor').toBeGreaterThan(host.pos.y + 0.05);
  }, 60000);

  it('lets the Spanish dancer crawl on the reef and only sometimes swim, and never swim under reduced motion', () => {
    function heights(reducedMotion) {
      const t = runtime({ reducedMotion, site: site([{ id: 'spanish_dancer', count: 1 }]) }, { species: 'real' });
      dives.push(t);
      const out = [];
      for (let k = 0; k < 120; k++) {
        t.run(2, 100);
        const o = census(t).find(q => q.speciesId === 'spanish_dancer'), rock = rockBelow(t, o.pos.x, o.pos.z);
        if (rock !== null) out.push(o.pos.y - rock);
      }
      return out.sort((a, b) => a - b);
    }
    const free = heights(false), calm = heights(true);
    expect(free.length).toBeGreaterThan(100); expect(calm.length).toBeGreaterThan(100);
    const median = a => a[Math.floor(a.length / 2)];
    expect(Math.abs(median(free)), 'usually crawling on the rock').toBeLessThan(0.08);
    expect(free[free.length - 1], 'at least one swim over four minutes').toBeGreaterThan(0.25);
    expect(free.filter(h => h > 0.15).length / free.length, 'swims are short').toBeLessThan(0.35);
    expect(calm[calm.length - 1], 'reduced motion keeps it crawling').toBeLessThan(0.1);
  }, 120000);
});
