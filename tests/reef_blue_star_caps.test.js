import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
const T = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const w = {};
new Function('window', readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8'))(w);
const create = options => w.Reef3DSpecies.create(T, 'blue_sea_star', { seed: 7, ...options });

describe('blue sea star blunt arm tips', () => {
  for (const quality of ['high', 'low']) {
    it(`rounds each terminal profile without a wider bulb or an open cap at ${quality}`, () => {
      const h = create({ quality }), g = h.root.getObjectByName('blue_sea_star-body').geometry;
      try {
        const high = quality === 'high', sides = high ? 8 : 5, segments = high ? 10 : 4;
        const discVertices = high ? 385 : 81, armVertices = (segments + 1) * sides + 1, originalCount = discVertices + 5 * armVertices;
        const pos = g.attributes.position, point = i => new T.Vector3().fromBufferAttribute(pos, i);
        const meanRing = first => { const c = new T.Vector3(); for (let j = 0; j < sides; j++) c.add(point(first + j)); return c.divideScalar(sides); };
        expect(pos.count).toBe(originalCount + 5 * sides);
        expect(g.index.count / 3).toBeLessThan(high ? 6000 : 1500);
        expect(new Set(g.index.array).size).toBe(pos.count);
        for (let arm = 0; arm < 5; arm++) {
          const last = discVertices + arm * armVertices + segments * sides, tip = last + sides, ring = originalCount + arm * sides;
          const end = meanRing(last), rounded = meanRing(ring), axis = point(tip).sub(end), reach = axis.length(); axis.normalize();
          const advance = rounded.clone().sub(end).dot(axis) / reach, oldRadius = point(last).distanceTo(end), newRadius = point(ring).distanceTo(rounded);
          expect(advance).toBeGreaterThan(0); expect(advance).toBeLessThan(1);
          expect(newRadius).toBeLessThan(oldRadius);
          expect(newRadius).toBeGreaterThan(oldRadius * (1 - advance));
          let tipFaces = 0;
          for (let i = 0; i < g.index.count; i += 3) {
            const ids = [g.index.getX(i), g.index.getX(i + 1), g.index.getX(i + 2)];
            if (!ids.includes(tip)) continue;
            const a = point(ids[0]), b = point(ids[1]), c = point(ids[2]);
            expect(b.sub(a).cross(c.sub(a)).normalize().dot(axis)).toBeGreaterThan(.1); tipFaces++;
          }
          expect(tipFaces).toBe(sides);
        }
        for (const attr of Object.values(g.attributes)) expect(Array.from(attr.array).every(Number.isFinite)).toBe(true);
        for (let i = 0; i < pos.count; i++) expect(new T.Vector3().fromBufferAttribute(g.attributes.normal, i).length()).toBeCloseTo(1, 5);
      } finally { h.dispose(); }
    });

    it(`keeps reduced-motion geometry still and disposes its single body once at ${quality}`, () => {
      const h = create({ quality, reducedMotion: true }), mesh = h.root.getObjectByName('blue_sea_star-body'), rest = new Float32Array(mesh.geometry.attributes.position.array);
      let geometries = 0, materials = 0;
      mesh.geometry.addEventListener('dispose', () => geometries++); mesh.material.addEventListener('dispose', () => materials++);
      h.update(.016, 2); h.update(.016, 3600); expect(mesh.geometry.attributes.position.array).toEqual(rest);
      h.dispose(); h.dispose(); expect(geometries).toBe(1); expect(materials).toBe(1);
    });
  }
});
