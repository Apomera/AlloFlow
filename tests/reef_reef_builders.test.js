import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

// Fire coral, blue coral, organ pipe coral and birdsnest coral: one static,
// vertex-coloured colony mesh each, in the shared coral material family, on
// both tiers and in all three health states.
vi.setConfig({ testTimeout: 120000 });
const T = createRequire(import.meta.url)('../vendor/three-r128/three.min.js'), w = {};
new Function('window', readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8'))(w);
const S = w.Reef3DSpecies, IDS = ['fire_coral', 'blue_coral', 'pipe_organ_coral', 'birdsnest_coral'];
const BUDGET = { low: 4000, high: 12000 };
const make = (id, o) => S.create(T, id, Object.assign({ seed: 7, quality: 'low' }, o));
function meshes(h) { const out = []; h.root.traverse((m) => { if (m.isMesh) out.push(m); }); return out; }
const tris = (h) => meshes(h).reduce((n, m) => n + m.geometry.index.count / 3, 0);
const positions = (h) => meshes(h).map((m) => Array.from(m.geometry.attributes.position.array));
const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const sat = (c) => { const mx = Math.max(...c), mn = Math.min(...c); return mx > 0 ? (mx - mn) / mx : 0; };
function colours(h) { const c = meshes(h)[0].geometry.attributes.color, out = []; for (let i = 0; i < c.count; i++) out.push([c.getX(i), c.getY(i), c.getZ(i)]); return out; }
function mean(cs) { const m = [0, 0, 0]; for (const c of cs) for (let k = 0; k < 3; k++) m[k] += c[k] / cs.length; return m; }
function build(id, o, fn) { const h = make(id, o); try { return fn(h); } finally { h.dispose(); } }
const isRed = (c) => c[0] > 0.2 && c[0] > 3 * c[1] && c[0] > 3 * c[2];
const isGreen = (c) => c[1] > c[0] * 1.1 && c[1] > c[2] * 1.1;
const isBlue = (c) => c[2] > 0.25 && c[2] > 1.6 * c[0];

describe('reef builder registry', () => {
  it('registers four sessile colonies that bleach and die, with Guide portrait views', () => {
    const expected = { fire_coral: [0.75, [1, 10]], blue_coral: [0.6, [0, 3]], pipe_organ_coral: [0.42, [3, 15]], birdsnest_coral: [0.35, [1, 20]] };
    for (const id of IDS) {
      expect(S.ids.filter((x) => x === id)).toHaveLength(1);
      expect(S.info(id)).toMatchObject({ group: 'coral', habit: 'sessile', origin: 'base', lengthM: expected[id][0], depthM: expected[id][1], schoolSize: null, healthStates: ['healthy', 'bleached', 'dead'] });
      expect(S.info(id).portrait.dir.every(Number.isFinite), id).toBe(true);
      expect(() => S.createSchool(T, id, 4)).toThrow();
    }
    const at = S.ids.indexOf('acropora_millepora');
    expect(S.ids.slice(at + 1, at + 5)).toEqual(IDS);
  });
});

describe('reef builder models', () => {
  for (const quality of ['low', 'high']) for (const id of IDS) {
    it(id + ' builds one finite colony mesh within the ' + quality + ' colony budget in every health state', () => {
      for (const health of ['healthy', 'bleached', 'dead']) build(id, { quality, health }, (h) => {
        const ms = meshes(h), m = ms[0];
        expect(ms, id).toHaveLength(1);
        expect(m.name).toBe(id + '-colony');
        expect(h.root.userData).toEqual({ speciesId: id, group: 'coral' });
        expect(tris(h), id + ' ' + quality + ' ' + health).toBeLessThanOrEqual(BUDGET[quality]);
        for (const a of Object.values(m.geometry.attributes)) expect(Array.from(a.array).every(Number.isFinite), id + ' ' + health).toBe(true);
        const n = m.geometry.attributes.position.count;
        expect(Array.from(m.geometry.index.array).every((i) => i >= 0 && i < n)).toBe(true);
        expect(!!m.material.map && !!m.material.normalMap && m.material.vertexColors, 'coral material family').toBe(true);
        expect(m.material.transparent).toBe(false); expect(m.material.emissive.getHex()).toBe(0);
        expect(h.radius / S.info(id).lengthM).toBeGreaterThan(0.25); expect(h.radius / S.info(id).lengthM).toBeLessThan(1.6);
        const box = new T.Box3().setFromObject(h.root);
        expect(box.min.y, id + ' sits on the substrate').toBeGreaterThan(-0.01);
        expect(h.animated, id + ' static').toBe(false);
      });
    });
  }

  it('keeps the low tier light and the fine tier detailed', () => {
    for (const id of IDS) {
      const lo = build(id, { quality: 'low' }, tris), hi = build(id, { quality: 'high' }, tris);
      expect(hi / lo, id).toBeGreaterThan(2.4);
    }
  });

  it('builds the same colony from the same seed, varies with the seed, and grows on both tiers alike', () => {
    for (const id of IDS) {
      const a = build(id, {}, positions), b = build(id, {}, positions), c = build(id, { seed: 8 }, positions);
      expect(a).toEqual(b); expect(a).not.toEqual(c);
      const lo = build(id, { quality: 'low' }, (h) => new T.Box3().setFromObject(h.root)), hi = build(id, { quality: 'high' }, (h) => new T.Box3().setFromObject(h.root));
      for (const k of ['x', 'y', 'z']) expect(Math.abs((lo.max[k] - lo.min[k]) - (hi.max[k] - hi.min[k])), id + ' ' + k).toBeLessThan(0.1 * (hi.max[k] - hi.min[k]) + 0.01);
      const young = build(id, { growth: 0 }, (h) => h.radius), old = build(id, { growth: 1 }, (h) => h.radius);
      expect(old / young, id + ' grows').toBeGreaterThan(1.8);
    }
  });

  it('never moves and frees every resource exactly once', () => {
    for (const id of IDS) {
      const h = make(id, { quality: 'high' }), before = positions(h); h.root.position.set(3, -2, 1); h.root.updateMatrix(); const m0 = h.root.matrix.clone();
      for (const t of [0.5, 3, 900]) h.update(0.016, t, { current: { x: 1, z: 0.4, strength: 1 } });
      expect(positions(h)).toEqual(before); h.root.updateMatrix(); expect(h.root.matrix.equals(m0)).toBe(true);
      const ms = meshes(h); let geos = 0, mats = 0;
      ms[0].geometry.addEventListener('dispose', () => geos++); ms[0].material.addEventListener('dispose', () => mats++);
      h.dispose(); h.dispose(); expect([geos, mats]).toEqual([1, 1]); expect(() => h.update(0.1, 1)).not.toThrow();
    }
  });
});

describe('reef builder colours and health', () => {
  it('shows mustard plates with pale margins on fire coral and pink needle tips on birdsnest coral', () => {
    build('fire_coral', {}, (h) => {
      const cs = colours(h), m = mean(cs);
      expect(m[0] > m[1] && m[1] > m[2] * 1.4, 'warm mustard').toBe(true);
      expect(cs.filter((c) => lum(c) > 0.6 && sat(c) < 0.4).length / cs.length, 'pale growing margins').toBeGreaterThan(0.05);
    });
    build('birdsnest_coral', {}, (h) => { const m = mean(colours(h)); expect(m[0] > m[1] && m[0] > m[2], 'pink or cream').toBe(true); });
  });

  it('bleaches fire coral and birdsnest coral white and leaves dead skeletons dull', () => {
    for (const id of ['fire_coral', 'birdsnest_coral']) {
      const look = {};
      for (const health of ['healthy', 'bleached', 'dead']) look[health] = build(id, { health }, (h) => mean(colours(h)));
      expect(lum(look.bleached), id).toBeGreaterThan(lum(look.healthy) * 1.4);
      expect(sat(look.bleached), id).toBeLessThan(0.12);
      expect(lum(look.dead), id).toBeLessThan(lum(look.bleached));
      expect(sat(look.dead), id).toBeLessThan(sat(look.healthy) + 0.05);
    }
  });

  it('shows a blue skeleton on broken blue coral tops in every state, and bleaches it pale blue, not white', () => {
    const look = {};
    for (const health of ['healthy', 'bleached', 'dead']) build('blue_coral', { health }, (h) => {
      const cs = colours(h); look[health] = mean(cs);
      expect(cs.filter(isBlue).length, 'broken faces show skeleton: ' + health).toBeGreaterThan(20);
    });
    const healthyBlue = build('blue_coral', {}, (h) => colours(h).filter(isBlue).length / colours(h).length);
    expect(healthyBlue, 'blue is only where the surface is broken').toBeLessThan(0.15);
    expect(look.healthy[0], 'living surface is brown').toBeGreaterThan(look.healthy[2]);
    expect(lum(look.bleached)).toBeGreaterThan(lum(look.healthy) * 1.4);
    expect(look.bleached[2], 'bluish when bleached').toBeGreaterThan(look.bleached[0] * 1.15);
    expect(sat(look.bleached), 'pale blue rather than white').toBeGreaterThan(0.12);
    expect(lum(look.dead)).toBeLessThan(lum(look.bleached));
  });

  it('keeps organ pipe coral red while its polyps bleach, and removes the polyps when it dies', () => {
    const red = {}, green = {}, n = {};
    for (const health of ['healthy', 'bleached', 'dead']) build('pipe_organ_coral', { health, quality: 'high' }, (h) => {
      const cs = colours(h); red[health] = cs.filter(isRed).length / cs.length; green[health] = cs.filter(isGreen).length / cs.length; n[health] = tris(h);
    });
    expect(red.healthy, 'red pipes').toBeGreaterThan(0.25);
    expect(green.healthy, 'green polyps').toBeGreaterThan(0.1);
    expect(red.bleached, 'the skeleton keeps its red').toBeGreaterThan(red.healthy * 0.9);
    expect(green.bleached, 'polyps lose their algae').toBeLessThan(0.01);
    expect(n.bleached).toBe(n.healthy);
    expect(n.dead, 'no polyps on a dead colony').toBeLessThan(n.healthy * 0.8);
    expect(green.dead).toBe(0);
  });
});
