import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

// 3D models of the bubble, hammer and flowerpot corals: fleshy polyps on a
// stony base. REEF3D_SPECIES_SOURCE points the suite at a lane copy.
vi.setConfig({ testTimeout: 120000 });
const T = createRequire(import.meta.url)('../vendor/three-r128/three.min.js'), local = {};
new Function('window', readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8'))(local);
const S = local.Reef3DSpecies, IDS = ['bubble_coral', 'hammer_coral', 'flowerpot_coral'];
const PARTS = { bubble_coral: ['colony-base', 'vesicles'], hammer_coral: ['colony-base', 'tentacles'], flowerpot_coral: ['columns', 'polyps'] };
const BUDGET = { low: 4000, high: 12000 };
const make = (id, quality = 'high', extra = {}) => S.create(T, id, { quality, seed: 7, ...extra });
function meshes(h) { const out = []; h.root.traverse((m) => { if (m.isMesh) out.push(m); }); return out; }
function positions(h) { return meshes(h).map((m) => Array.from(m.geometry.attributes.position.array)); }
function world(h) { h.root.updateMatrixWorld(true); const out = []; h.root.traverse((n) => out.push([...n.matrixWorld.elements])); return out; }
const tris = (h) => meshes(h).reduce((n, m) => n + m.geometry.index.count / 3, 0);
const lin = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
// Mean vertex colour (linear), weighted by vertex count, as tests/reef_3d_species.test.js measures it.
function look(h) {
  let r = 0, g = 0, b = 0, w = 0;
  for (const m of meshes(h)) {
    const c = m.geometry.attributes.color, n = c.count; let vr = 0, vg = 0, vb = 0;
    for (let i = 0; i < n; i++) { vr += c.getX(i); vg += c.getY(i); vb += c.getZ(i); }
    r += vr; g += vg; b += vb; w += n;
  }
  r /= w; g /= w; b /= w; const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  return { r, g, b, lum: 0.2126 * r + 0.7152 * g + 0.0722 * b, sat: mx > 0 ? (mx - mn) / mx : 0 };
}
function maxDelta(a, b) { let d = 0; for (let m = 0; m < a.length; m++) for (let i = 0; i < a[m].length; i++) d = Math.max(d, Math.abs(a[m][i] - b[m][i])); return d; }

describe('fleshy-polyp corals: registry', () => {
  it('registers three sessile corals with all coral health states and portrait hints', () => {
    expect(S.info('bubble_coral')).toMatchObject({ group: 'coral', habit: 'sessile', origin: 'base', lengthM: 0.25, depthM: [0, 40], schoolSize: null, healthStates: ['healthy', 'bleached', 'dead'] });
    expect(S.info('hammer_coral')).toMatchObject({ group: 'coral', habit: 'sessile', origin: 'base', lengthM: 0.3, depthM: [0, 40], healthStates: ['healthy', 'bleached', 'dead'] });
    expect(S.info('flowerpot_coral')).toMatchObject({ group: 'coral', habit: 'sessile', origin: 'base', lengthM: 0.22, depthM: [2, 18], healthStates: ['healthy', 'bleached', 'dead'] });
    const at = S.ids.indexOf('orange_cup_coral');
    expect(S.ids.slice(at + 1, at + 4)).toEqual(IDS);
    for (const id of IDS) {
      expect(S.ids.filter((x) => x === id)).toHaveLength(1);
      expect(() => S.createSchool(T, id, 4)).toThrow(RangeError);
      const p = S.info(id).portrait; expect(p.dir.every(Number.isFinite)).toBe(true);
      expect(Math.hypot(...p.dir)).toBeGreaterThan(1.3); expect(Math.hypot(...p.dir)).toBeLessThan(4.5);
    }
  });
});

for (const id of IDS) describe(id + ' model', () => {
  for (const quality of ['low', 'high']) {
    it('builds finite, named parts within the colony budget and two draws at ' + quality, () => {
      for (const health of ['healthy', 'bleached', 'dead']) {
        const h = make(id, quality, { health });
        try {
          const ms = meshes(h);
          expect(ms.map((m) => m.name), health).toEqual(health === 'dead' ? [id + '-skeleton'] : PARTS[id].map((p) => id + '-' + p));
          expect(tris(h), id + ' ' + quality + ' ' + health).toBeLessThanOrEqual(BUDGET[quality]);
          expect(h.root.userData).toEqual({ speciesId: id, group: 'coral' });
          expect(h.radius / S.info(id).lengthM).toBeGreaterThan(0.25); expect(h.radius / S.info(id).lengthM).toBeLessThan(1.6);
          for (const m of ms) {
            for (const a of Object.values(m.geometry.attributes)) expect([...a.array].every(Number.isFinite), m.name).toBe(true);
            expect([...m.geometry.index.array].every((i) => i >= 0 && i < m.geometry.attributes.position.count)).toBe(true);
            expect(m.material.transparent).toBe(false); expect(m.material.emissive.getHex()).toBe(0); expect(m.material.vertexColors).toBe(true);
            expect(m.material.map).toBeNull();
          }
          expect(h.animated, health).toBe(health !== 'dead');
        } finally { h.dispose(); }
      }
      // Seeds and growth keep the budget too.
      for (const seed of [1, 2, 3, 11, 29]) { const h = S.create(T, id, { quality, seed }); try { expect(tris(h), id + ' seed ' + seed).toBeLessThanOrEqual(BUDGET[quality]); } finally { h.dispose(); } }
    });

    it('holds the stony base and placement fixed while soft tissue sways in bounds at ' + quality, () => {
      const h = make(id, quality);
      try {
        h.root.position.set(4, -2, 9); h.root.rotation.set(0, 0.7, 0);
        const before = positions(h), placement = world(h), soft = meshes(h)[1]; let moved = 0;
        for (const t of [0.4, 2.2, 9, 600]) {
          h.update(0.016, t, { current: { x: 1, z: -0.3, strength: 1 } });
          expect(world(h)).toEqual(placement);
          const now = positions(h); expect(now[0]).toEqual(before[0]);
          moved = Math.max(moved, maxDelta([now[1]], [before[1]]));
          const p = soft.geometry.attributes.position, v = new T.Vector3();
          for (let j = 0; j < p.count; j++) { v.fromBufferAttribute(p, j); expect(soft.geometry.boundingBox.containsPoint(v)).toBe(true); expect(v.distanceTo(soft.geometry.boundingSphere.center)).toBeLessThanOrEqual(soft.geometry.boundingSphere.radius * (1 + 1e-6)); }
        }
        expect(moved).toBeGreaterThan(0.0002); expect(moved).toBeLessThan(0.015);
      } finally { h.dispose(); }
    });
  }

  it('builds the same colony from the same seed and a different one from another seed', () => {
    const a = make(id, 'low'), b = make(id, 'low'), c = make(id, 'low', { seed: 8 });
    try { expect(positions(a)).toEqual(positions(b)); expect(positions(a)).not.toEqual(positions(c)); expect(a.radius).toBe(b.radius); }
    finally { a.dispose(); b.dispose(); c.dispose(); }
  });

  it('moves smoothly as a function of time alone', () => {
    const a = make(id), b = make(id);
    try {
      a.update(0.016, 3); const p0 = positions(a); a.update(0.001, 3.001); expect(maxDelta(p0, positions(a))).toBeLessThan(0.00002);
      a.update(0.01, 12); b.update(12, 12); expect(positions(a)).toEqual(positions(b));
    } finally { a.dispose(); b.dispose(); }
  });

  it('freezes under reduced motion and keeps colours without screen derivatives', () => {
    const h = make(id, 'low', { reducedMotion: true, derivatives: false });
    try {
      const before = positions(h); for (const t of [1, 40, 9000]) h.update(0.016, t); expect(positions(h)).toEqual(before);
      for (const m of meshes(h)) { expect(m.material.bumpMap).toBeNull(); expect(m.geometry.attributes.color).toBeTruthy(); }
    } finally { h.dispose(); }
  });

  it('grows from a small recruit and keeps its shape between tiers', () => {
    const young = make(id, 'low', { growth: 0 }), adult = make(id, 'low'), high = make(id, 'high');
    try {
      expect(adult.radius / young.radius).toBeGreaterThan(1.8);
      const a = new T.Box3().setFromObject(adult.root), b = new T.Box3().setFromObject(high.root);
      for (const k of ['x', 'y', 'z']) expect(Math.abs((a.max[k] - a.min[k]) - (b.max[k] - b.min[k])), k).toBeLessThan(0.12 * (b.max[k] - b.min[k]) + 0.006);
    } finally { young.dispose(); adult.dispose(); high.dispose(); }
  });

  it('bleaches white, and dies to a dull, still skeleton with turf', () => {
    const L = {};
    for (const health of ['healthy', 'bleached', 'dead']) { const h = make(id, 'low', { seed: 9, health }); L[health] = look(h); h.dispose(); }
    const dist = (p, q) => Math.hypot(p.r - q.r, p.g - q.g, p.b - q.b);
    expect(L.bleached.lum).toBeGreaterThan(L.healthy.lum * 1.4);
    expect(L.bleached.sat).toBeLessThan(0.12);
    expect(L.dead.sat).toBeLessThan(L.healthy.sat + 0.05);
    expect(dist(L.dead, L.healthy)).toBeGreaterThan(0.03);
    expect(dist(L.dead, L.bleached)).toBeGreaterThan(0.1);
    expect(L.dead.lum).toBeLessThan(L.bleached.lum);
    const dead = make(id, 'low', { health: 'dead' });
    try { const before = positions(dead); dead.update(0.1, 50); expect(positions(dead)).toEqual(before); expect(dead.root.getObjectByName(id + '-' + PARTS[id][1])).toBeUndefined(); } finally { dead.dispose(); }
  });

  it('disposes every owned resource once and shares baked relief between colonies', () => {
    const a = make(id), b = make(id), ms = meshes(a), geos = new Set(ms.map((m) => m.geometry)), mats = new Set(ms.map((m) => m.material)), maps = new Set(ms.map((m) => m.material.bumpMap).filter(Boolean));
    let ng = 0, nm = 0, nt = 0;
    geos.forEach((g) => g.addEventListener('dispose', () => ng++)); mats.forEach((m) => m.addEventListener('dispose', () => nm++)); maps.forEach((t) => t.addEventListener('dispose', () => nt++));
    expect(meshes(a)[0].material.bumpMap).toBe(meshes(b)[0].material.bumpMap);
    a.dispose(); a.dispose(); expect([ng, nm, nt]).toEqual([2, 2, 0]);
    b.dispose(); expect(nt).toBe(maps.size);
    expect(() => a.update(0.1, 2)).not.toThrow();
  });
});

describe('fleshy-polyp corals: the field marks the models show', () => {
  it('packs grape-sized vesicles over the bubble coral, larger on the shaded flanks, at the same stations on both tiers', () => {
    const lo = make('bubble_coral', 'low'), hi = make('bubble_coral', 'high');
    try {
      const a = meshes(lo)[0].geometry.userData.bubbleCoral, b = meshes(hi)[0].geometry.userData.bubbleCoral;
      expect(a.vesicles).toEqual(b.vesicles); expect(a.photosynthetic).toBe(true);
      expect(a.vesicles.length).toBeGreaterThan(120);
      for (const v of a.vesicles) { expect(v.radius * 2).toBeGreaterThan(0.012); expect(v.radius * 2).toBeLessThan(0.03); }
      const r = (v) => Math.hypot(v.x, v.z), sorted = a.vesicles.slice().sort((p, q) => r(p) - r(q)), n = Math.floor(sorted.length / 3), mean = (list) => list.reduce((s, v) => s + v.radius, 0) / list.length;
      expect(mean(sorted.slice(-n))).toBeGreaterThan(mean(sorted.slice(0, n)));
      expect(meshes(hi)[1].geometry.userData.bubbleCoral.inflated).toBe(true);
      const dead = make('bubble_coral', 'low', { health: 'dead' }); try { expect(meshes(dead)[0].geometry.userData.bubbleCoral.exposedSepta).toBeGreaterThan(40); } finally { dead.dispose(); }
    } finally { lo.dispose(); hi.dispose(); }
  });

  it('ends every hammer coral tentacle in a wide T tip', () => {
    const h = make('hammer_coral');
    try {
      const g = meshes(h)[1].geometry, strands = g.userData.hammerCoral.strands, p = g.attributes.position;
      expect(g.userData.hammerCoral.tTips).toBe(true); expect(strands.length).toBeGreaterThan(90);
      for (const s of strands) {
        // The tip is wider across than the tentacle is thick: a T, not a plain tube.
        let top = -Infinity; for (let i = s.first; i < s.first + s.count; i++) top = Math.max(top, p.getY(i));
        const tipPts = []; for (let i = s.first; i < s.first + s.count; i++) if (p.getY(i) > top - 0.012) tipPts.push(new T.Vector3().fromBufferAttribute(p, i));
        let span = 0; for (const q of tipPts) for (const r of tipPts) span = Math.max(span, Math.hypot(q.x - r.x, q.z - r.z));
        expect(span).toBeGreaterThan(0.018);
      }
    } finally { h.dispose(); }
  });

  it('gives every flowerpot polyp a crown of 24 tentacles on both tiers', () => {
    for (const quality of ['low', 'high']) {
      const h = make('flowerpot_coral', quality);
      try {
        const cg = meshes(h)[0].geometry.userData.flowerpotCoral, pg = meshes(h)[1].geometry.userData.flowerpotCoral;
        expect(cg.tentaclesPerPolyp).toBe(24); expect(pg.tentaclesPerPolyp).toBe(24); expect(pg.extendedByDay).toBe(true);
        expect(pg.crowns.length).toBe(cg.polyps); expect(cg.polyps).toBeGreaterThan(80);
        expect(cg.columns).toBeGreaterThanOrEqual(4);
        for (let i = 0; i < pg.crowns.length; i++) {
          const next = i + 1 < pg.crowns.length ? pg.crowns[i + 1].stalkFirst : meshes(h)[1].geometry.attributes.position.count;
          expect((next - pg.crowns[i].first) / pg.crowns[i].tentacles, quality + ' vertices per tentacle').toBe(quality === 'high' ? 6 : 3);
        }
      } finally { h.dispose(); }
    }
  });
});
