import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

// Round 17 models: the greater blue-ringed octopus (about 60 dark-edged blue
// rings that flash), Bedford's flatworm (thin, striped, ruffled, two folded
// pseudotentacles, no gills), the galaxy coral (raised cups with exsert septa)
// and the finger coral (smooth, round, blunt fingers). Pins only these four.
const T = createRequire(import.meta.url)(path.resolve(process.cwd(), 'vendor/three-r128/three.min.js')), w = {};
new Function('window', readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8'))(w);
const S = w.Reef3DSpecies;
const INVERTS = ['blue_ringed_octopus', 'bedfords_flatworm'], CORALS = ['galaxy_coral', 'finger_coral'], IDS = INVERTS.concat(CORALS);
const INFO = { blue_ringed_octopus: ['invertebrate', 'bottom', 0.12, [0, 20]], bedfords_flatworm: ['invertebrate', 'bottom', 0.085, [1, 20]], galaxy_coral: ['coral', 'sessile', 0.3, [3, 25]], finger_coral: ['coral', 'sessile', 0.4, [0, 48]] };
const PARTS = { blue_ringed_octopus: ['body-eyes-rings', 'ringed-arms'], bedfords_flatworm: ['flat-body-pseudotentacles', 'ruffled-margin'], galaxy_coral: ['colony'], finger_coral: ['colony'] };
const make = (id, quality = 'high', options = {}) => S.create(T, id, { quality, seed: 7, ...options });
function meshes(h) { const a = []; h.root.traverse((m) => { if (m.isMesh) a.push(m); }); return a; }
const buffers = (h) => meshes(h).map((m) => [...m.geometry.attributes.position.array]);
const colours = (h) => meshes(h).map((m) => [...m.geometry.attributes.color.array]);
function bounds(h) { h.root.updateMatrixWorld(true); const b = new T.Box3(), p = new T.Vector3(); for (const m of meshes(h)) for (let i = 0; i < m.geometry.attributes.position.count; i++) b.expandByPoint(p.fromBufferAttribute(m.geometry.attributes.position, i).applyMatrix4(m.matrixWorld)); return b; }
const tris = (h) => meshes(h).reduce((n, m) => n + m.geometry.index.count / 3, 0);
const maxDiff = (a, b) => { let d = 0; for (let i = 0; i < a.length; i++) for (let j = 0; j < a[i].length; j++) d = Math.max(d, Math.abs(a[i][j] - b[i][j])); return d; };
function build(id, quality, options, fn) { const h = make(id, quality, options); try { return fn(h); } finally { h.dispose(); } }

describe('sp17i registry', () => {
  it('registers the four after birdsnest coral with sourced sizes, depths, health states and portrait cameras', () => {
    const at = S.ids.indexOf('birdsnest_coral');
    expect(S.ids.slice(at + 1, at + 5)).toEqual(IDS);
    for (const id of IDS) {
      const [group, habit, lengthM, depthM] = INFO[id];
      expect(S.info(id), id).toMatchObject({ group, habit, lengthM, depthM, origin: 'base', schoolSize: null, healthStates: group === 'coral' ? ['healthy', 'bleached', 'dead'] : ['healthy'] });
      const p = S.info(id).portrait, len = Math.hypot(...p.dir);
      expect(len, id).toBeGreaterThan(1.3); expect(len, id).toBeLessThan(4.5);
      expect(() => S.createSchool(T, id, 3)).toThrow();
    }
  });
});

describe('sp17i geometry', () => {
  for (const quality of ['low', 'high']) {
    it('builds finite, grounded models within budget at ' + quality, () => {
      for (const id of IDS) for (const seed of [7, 23]) for (const health of S.info(id).healthStates) build(id, quality, { seed, health }, (h) => {
        const ms = meshes(h), b = bounds(h), coral = CORALS.includes(id);
        expect(ms.map((m) => m.userData.part), id).toEqual(PARTS[id]);
        expect(tris(h), id + ' ' + quality).toBeLessThanOrEqual(coral ? (quality === 'high' ? 12000 : 4000) : (quality === 'high' ? 6000 : 1500));
        expect(b.min.y, id).toBeGreaterThan(-0.01);
        if (!coral) expect(b.min.y, id).toBeGreaterThanOrEqual(-1e-6);
        expect(h.radius / S.info(id).lengthM, id).toBeGreaterThan(0.25); expect(h.radius / S.info(id).lengthM, id).toBeLessThan(1.6);
        for (const m of ms) {
          for (const a of Object.values(m.geometry.attributes)) expect([...a.array].every(Number.isFinite), id).toBe(true);
          expect([...m.geometry.index.array].every((i) => i >= 0 && i < m.geometry.attributes.position.count), id).toBe(true);
          expect(m.material.transparent, id).toBe(false); expect(m.material.emissive.getHex(), id).toBe(0);
          // The finger coral uses the plain coral family (as birdsnest coral does); the others are double sided.
          expect(!!m.material.map && !!m.material.vertexColors && (m.material.side === T.DoubleSide) === (id !== 'finger_coral'), id + ' existing material family').toBe(true);
        }
        if (coral) { expect(!!ms[0].material.normalMap, id + ' coral maps').toBe(true); expect(h.animated, id + ' static').toBe(false); }
        else { expect(ms[0].material, id + ' one material for both parts').toBe(ms[1].material); expect(h.animated, id).toBe(true); }
      });
    });
  }

  it('builds the same model from one seed, varies with the seed, and keeps the tiers the same size', () => {
    for (const id of IDS) {
      expect(build(id, 'low', {}, buffers)).toEqual(build(id, 'low', {}, buffers));
      expect(build(id, 'low', {}, buffers)).not.toEqual(build(id, 'low', { seed: 8 }, buffers));
      const lo = build(id, 'low', {}, bounds), hi = build(id, 'high', {}, bounds);
      for (const k of ['x', 'y', 'z']) expect(Math.abs((lo.max[k] - lo.min[k]) - (hi.max[k] - hi.min[k])), id + ' ' + k).toBeLessThan(0.12 * (hi.max[k] - hi.min[k]) + 0.005);
    }
    for (const id of CORALS) expect(build(id, 'low', { growth: 1 }, (h) => h.radius) / build(id, 'low', { growth: 0 }, (h) => h.radius), id + ' grows').toBeGreaterThan(1.8);
  });
});

describe('sp17i field marks in the models', () => {
  it('gives the octopus 60 rings, 4 on each arm, blue inside a dark border', () => {
    for (const quality of ['low', 'high']) for (const seed of [3, 7, 23]) build('blue_ringed_octopus', quality, { seed }, (h) => {
      const [body, arms] = meshes(h), info = body.geometry.userData.blueRingedOctopus;
      expect(info.ringCount, quality + ' ' + seed).toBe(60);
      expect(info.armRings).toBe(32);
      expect(info.mantleRings + info.headRings).toBe(28);
      // Blue ring vertices and dark border vertices, counted from the colours.
      let blue = 0, dark = 0;
      for (const m of [body, arms]) { const c = m.geometry.attributes.color; for (let i = 0; i < c.count; i++) { const r = c.getX(i), g = c.getY(i), b = c.getZ(i); if (b > 0.25 && b > 2.5 * r) blue++; if (r + g + b < 0.04) dark++; } }
      expect(blue, 'blue rows').toBeGreaterThanOrEqual(60 * info.ringSegments * (info.ringRows - 1));
      expect(dark, 'dark borders').toBeGreaterThanOrEqual(60 * info.ringSegments);
    });
  });

  it('flashes the rings brighter now and then, moves its arms, and holds still under reduced motion', () => {
    const h = make('blue_ringed_octopus', 'low');
    try {
      const flash = h.flash, ts = Array.from({ length: 400 }, (_, i) => i * 0.05), peak = ts.reduce((a, t) => (flash(t) > flash(a) ? t : a), 0), rest = ts.find((t) => flash(t) === 0);
      expect(flash(peak)).toBeGreaterThan(0.8);
      expect(ts.filter((t) => flash(t) > 0).length / ts.length, 'flashes are brief').toBeLessThan(0.25);
      const blueMean = () => { let s = 0; for (const m of meshes(h)) { const c = m.geometry.attributes.color; for (let i = 0; i < c.count; i++) if (c.getZ(i) > 2.5 * c.getX(i) && c.getZ(i) > 0.25) s += c.getZ(i) + c.getY(i); } return s; };
      h.update(0.016, rest); const dim = blueMean(), a = buffers(h);
      h.update(0.016, peak); const bright = blueMean();
      expect(bright).toBeGreaterThan(dim * 1.2);
      expect(maxDiff(a, buffers(h)), 'arms move').toBeGreaterThan(1e-4);
      const root = h.root.matrix.clone(); h.root.updateMatrix(); expect(h.root.matrix.equals(root)).toBe(true);
    } finally { h.dispose(); }
    const r = make('blue_ringed_octopus', 'low', { reducedMotion: true }), p0 = buffers(r), c0 = colours(r);
    try { r.update(0.016, 1.3); r.update(0.016, 7.9); expect(maxDiff(p0, buffers(r))).toBe(0); expect(maxDiff(c0, colours(r))).toBe(0); } finally { r.dispose(); }
  });

  it('keeps the flatworm thin and flat, with two folded pseudotentacles at the front and no gills', () => {
    for (const quality of ['low', 'high']) build('bedfords_flatworm', quality, {}, (h) => {
      const [body] = meshes(h), info = body.geometry.userData.bedfordsFlatworm, b = bounds(h), L = info.scaleM;
      expect(info.gills).toBe(0);
      expect(info.pseudotentacles.map((p) => p.side)).toEqual([-1, 1]);
      const pos = body.geometry.attributes.position;
      for (const p of info.pseudotentacles) {
        let minX = Infinity, maxY = 0;
        for (let i = p.first; i < p.first + p.count; i++) { minX = Math.min(minX, pos.getX(i)); maxY = Math.max(maxY, pos.getY(i)); }
        expect(minX / L, 'at the front edge').toBeGreaterThan(0.4);
        expect(maxY / L, 'standing up').toBeGreaterThan(0.06);
      }
      // Flat: the body (not the pseudotentacles) is far lower than it is long or wide.
      let top = 0; for (let i = 0; i < info.pseudotentacles[0].first; i++) top = Math.max(top, pos.getY(i));
      expect(top / L).toBeLessThan(0.03);
      expect((b.max.z - b.min.z) / (b.max.x - b.min.x)).toBeGreaterThan(0.45);
    });
  });

  it('ripples the flatworm margin, deeper when it swims', () => {
    const h = make('bedfords_flatworm', 'low');
    try {
      const rim = meshes(h)[1], spread = () => { const p = rim.geometry.attributes.position; let lo = Infinity, hi = -Infinity; for (let i = 0; i < p.count; i++) { lo = Math.min(lo, p.getY(i)); hi = Math.max(hi, p.getY(i)); } return hi - lo; };
      const a = buffers(h); h.update(0.016, 2.2, { speed: 0.005 }); const crawl = spread();
      expect(maxDiff(a, buffers(h))).toBeGreaterThan(1e-5);
      h.update(0.016, 2.2, { speed: 0.2 }); expect(spread()).toBeGreaterThan(crawl * 1.15);
    } finally { h.dispose(); }
  });

  it('gives the galaxy coral raised cups whose pale septa rise above the rim', () => {
    for (const quality of ['low', 'high']) build('galaxy_coral', quality, {}, (h) => {
      const m = meshes(h)[0], info = m.geometry.userData.galaxyCoral;
      expect(info.cups).toBeGreaterThanOrEqual(55);
      expect(info.septaPerCup).toBe(quality === 'high' ? 16 : 6);
      expect(info.drawnScale).toBe(2);
      if (quality === 'high') expect(info.cupsWithPolyps).toBeGreaterThan(10);
    });
    // Bleached colonies lose the colour; dead colonies lose the polyps.
    expect(build('galaxy_coral', 'high', { health: 'dead' }, (h) => meshes(h)[0].geometry.userData.galaxyCoral.cupsWithPolyps)).toBe(0);
    expect(build('galaxy_coral', 'high', { health: 'dead' }, (h) => tris(h))).toBeLessThan(build('galaxy_coral', 'high', {}, (h) => tris(h)));
  });

  it('gives the finger coral many round fingers with blunt tips, wider than tall', () => {
    for (const quality of ['low', 'high']) build('finger_coral', quality, {}, (h) => {
      const m = meshes(h)[0], info = m.geometry.userData.fingerCoral, b = bounds(h);
      expect(info.fingers).toBeGreaterThanOrEqual(40);
      expect(info.roundTips).toBe(info.fingers);
      expect(b.max.x - b.min.x).toBeGreaterThan(b.max.y - b.min.y);
    });
    // The low and high tiers share one layout: the same number of fingers.
    expect(build('finger_coral', 'low', {}, (h) => meshes(h)[0].geometry.userData.fingerCoral.fingers)).toBe(build('finger_coral', 'high', {}, (h) => meshes(h)[0].geometry.userData.fingerCoral.fingers));
  });

  it('frees every resource once', () => {
    for (const id of IDS) { const h = make(id, 'low'); h.dispose(); expect(() => h.dispose()).not.toThrow(); }
  });
});

describe('sp17i in the dive', () => {
  let runtime, census;
  beforeAll(async () => {
    ({ runtime, census } = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/reef_life_harness.js').replace(/\\/g, '/')));
  });
  const dives = [];
  afterEach(() => { while (dives.length) dives.pop().dispose(); });
  const site = (population) => ({ seed: 29, depthM: 9, health: { coralCover: 0.5, bleaching: 0, algae: 0.05 }, population, restoration: null });
  it.each(['real', null])('places all four, findable and finite, with species catalog %s', (species) => {
    const errors = [], t = runtime({ onError: (e) => errors.push(String(e)), site: site([...IDS.map((id) => ({ id, count: id === 'finger_coral' ? 2 : 1 })), { id: 'table_coral', count: 2 }]) }, { species });
    dives.push(t);
    expect(t.controller.getState().ready).toBe(true);
    const all = census(t);
    for (const id of IDS) {
      expect(all.filter((o) => o.speciesId === id).length, id).toBe(id === 'finger_coral' ? 2 : 1);
      const found = t.controller.findSpecies(id); expect(found).toMatchObject({ speciesId: id }); expect(Number.isFinite(found.distanceM)).toBe(true);
    }
    t.run(4);
    for (const o of census(t)) expect(o.pos.toArray().every(Number.isFinite), o.speciesId).toBe(true);
    expect(errors).toEqual([]);
  }, 60000);
});
