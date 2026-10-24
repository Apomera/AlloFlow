import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
const T = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const w = {};
new Function('window', readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8'))(w);
const create = options => w.Reef3DSpecies.create(T, 'barrel_sponge', { seed: 7, ...options });

describe('barrel sponge cavity', () => {
  for (const quality of ['high', 'low']) {
    it(`samples the deep inner wall continuously without opening the seam at ${quality}`, () => {
      const h = create({ quality });
      try {
        const g = h.root.getObjectByName('barrel_sponge-sponge').geometry, p = g.attributes.position, n = g.attributes.normal;
        const sides = quality === 'high' ? 96 : 40, stride = sides + 1, rings = (p.count - 2) / stride;
        const ringHeight = [];
        for (let row = 0; row < rings; row++) {
          let height = 0; for (let i = 0; i < sides; i++) height += p.getY(row * stride + i) / sides;
          ringHeight.push(height);
          expect(new T.Vector3().fromBufferAttribute(p, row * stride).distanceTo(new T.Vector3().fromBufferAttribute(p, row * stride + sides))).toBeLessThan(1e-7);
          expect(new T.Vector3().fromBufferAttribute(n, row * stride).distanceTo(new T.Vector3().fromBufferAttribute(n, row * stride + sides))).toBeLessThan(1e-7);
        }
        const lip = ringHeight.indexOf(Math.max(...ringHeight)), height = p.getY(p.count - 2) / .23;
        for (let row = lip + 2; row < rings; row++) {
          const step = ringHeight[row - 1] - ringHeight[row];
          expect(step).toBeGreaterThan(0);
          expect(step).toBeLessThan(height * (quality === 'high' ? .085 : .14));
        }
        expect(ringHeight.at(-1)).toBeCloseTo(height * .23, 2);
        for (const attr of Object.values(g.attributes)) expect(Array.from(attr.array).every(Number.isFinite)).toBe(true);
        for (let i = 0; i < n.count; i++) expect(new T.Vector3().fromBufferAttribute(n, i).length()).toBeCloseTo(1, 5);
        expect(g.index.count / 3).toBeLessThanOrEqual(quality === 'high' ? 6000 : 1500);
      } finally { h.dispose(); }
    });

    it(`remains fixed in its single draw and disposes cleanly at ${quality}`, () => {
      const h = create({ quality }), mesh = h.root.getObjectByName('barrel_sponge-sponge'), g = mesh.geometry;
      try {
        const rest = g.attributes.position.array.slice(), box = g.boundingBox.clone(), sphere = g.boundingSphere.clone();
        let draws = 0; h.root.traverse(m => { if (m.isMesh) draws++; }); expect(draws).toBe(1);
        for (const t of [0, 2, 8, 3600]) { h.update(.016, t); expect(g.attributes.position.array).toEqual(rest); expect(g.boundingBox).toEqual(box); expect(g.boundingSphere).toEqual(sphere); }
        let geometries = 0, materials = 0;
        g.addEventListener('dispose', () => geometries++); mesh.material.addEventListener('dispose', () => materials++);
        h.dispose(); h.dispose(); expect(geometries).toBe(1); expect(materials).toBe(1);
      } finally { h.dispose(); }
    });
  }
});
