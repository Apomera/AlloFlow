import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

// Model QA round 4: field marks added to four Guide models. Pins only these
// models' own marks, so other lanes can change or add species alongside them.
const T = createRequire(import.meta.url)('../vendor/three-r128/three.min.js'), w = {};
new Function('window', readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8'))(w);
const S = w.Reef3DSpecies;
const make = (id, quality = 'high', o = {}) => S.create(T, id, Object.assign({ seed: 7, quality }, o));
function meshes(h) { const a = []; h.root.traverse((m) => { if (m.isMesh) a.push(m); }); return a; }
const tris = (h) => meshes(h).reduce((n, m) => n + m.geometry.index.count / 3, 0);
function colours(g, first, count) { const c = g.attributes.color, out = []; for (let i = first; i < first + count; i++) out.push([c.getX(i), c.getY(i), c.getZ(i)]); return out; }

describe('model QA field marks', () => {
  it('crusts part of each Drupella shell with pink coralline algae on both tiers', () => {
    for (const quality of ['low', 'high']) {
      const h = make('drupella_snail', quality);
      try {
        const g = meshes(h)[0].geometry, r = g.userData.drupellaCluster.ranges['four-knobbly-shells'];
        const cs = colours(g, r.first, r.count), pink = cs.filter((c) => c[2] > c[1] && c[0] > c[1] * 1.15);
        expect(pink.length / cs.length, quality + ' pink crust').toBeGreaterThan(0.05);
        expect(pink.length / cs.length, quality + ' the knobs still show').toBeLessThan(0.6);
      } finally { h.dispose(); }
    }
  });

  it('packs bubble coral vesicles so they cover the colony with room to overlap', () => {
    for (const seed of [7, 23]) {
      const h = make('bubble_coral', 'low', { seed });
      try {
        const v = meshes(h)[0].geometry.userData.bubbleCoral.vesicles, cover = v.reduce((s, o) => s + Math.PI * o.radius * o.radius, 0);
        // The mound is about 0.21 m across: its surface is under 0.05 square metres.
        expect(cover, 'vesicle discs cover more than the mound surface').toBeGreaterThan(0.05);
      } finally { h.dispose(); }
    }
  });

  it('shows tiny pale blue coral polyps on the fine tier only, and none on a dead colony', () => {
    const n = {};
    for (const [k, q, health] of [['hi', 'high', 'healthy'], ['hiBleached', 'high', 'bleached'], ['hiDead', 'high', 'dead'], ['lo', 'low', 'healthy'], ['loDead', 'low', 'dead']]) {
      const h = make('blue_coral', q, { health }); try { n[k] = tris(h); } finally { h.dispose(); }
    }
    expect(n.hi - n.hiDead, 'polyp tufts on the living fine-tier colony').toBeGreaterThan(300);
    expect(n.hiBleached, 'bleached polyps keep their shape').toBe(n.hi);
    expect(n.lo, 'the low tier carries no polyp tufts').toBe(n.loDead);
  });
});
