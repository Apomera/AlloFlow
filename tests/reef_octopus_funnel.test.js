import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
const T = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const w = {};
new Function('window', readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8'))(w);
const create = options => w.Reef3DSpecies.create(T, 'day_octopus', { seed: 7, ...options });

function funnel(h, quality) {
  const mesh = h.root.getObjectByName('day_octopus-body'), g = mesh.geometry, part = g.userData.batch[0], sides = quality === 'high' ? 10 : 6;
  const first = part.count - (5 * sides + 1), point = i => new T.Vector3().fromBufferAttribute(g.attributes.position, i);
  const center = ring => { const v = new T.Vector3(); for (let i = 0; i < sides; i++) v.add(point(first + ring * sides + i)); return v.divideScalar(sides); };
  return { mesh, g, sides, first, point, center, start: part.start + part.length - sides * 27 };
}

describe('octopus muscular funnel', () => {
  for (const quality of ['high', 'low']) {
    it(`has an open rolled lip and correctly wound recessed lumen at ${quality}`, () => {
      const h = create({ quality });
      try {
        const f = funnel(h, quality), { g, sides, first, point, center, start } = f;
        const mouth = center(2), inner = center(3), axis = mouth.clone().sub(center(0)).normalize(), end = point(first + 5 * sides);
        const outerRadius = point(first + 2 * sides).distanceTo(mouth), innerRadius = point(first + 3 * sides).distanceTo(inner);
        expect(inner.distanceTo(mouth)).toBeLessThan(1e-8);
        expect(innerRadius).toBeGreaterThan(outerRadius * .5); expect(innerRadius).toBeLessThan(outerRadius);
        expect(mouth.clone().sub(end).dot(axis)).toBeGreaterThan(innerRadius);
        for (let face = 0; face < sides * 9; face++) {
          const tri = [0, 1, 2].map(j => point(g.index.array[start + face * 3 + j]));
          const normal = tri[1].clone().sub(tri[0]).cross(tri[2].clone().sub(tri[0])).normalize();
          const middle = tri[0].clone().add(tri[1]).add(tri[2]).divideScalar(3), strip = Math.floor(face / (2 * sides));
          if (strip === 2) expect(normal.dot(axis)).toBeGreaterThan(.95);
          // The deepest closure is intentionally cupped rather than planar.
          else if (strip === 4) expect(normal.dot(axis)).toBeGreaterThan(.8);
          else {
            const radial = middle.sub(strip < 2 ? center(strip) : mouth); radial.addScaledVector(axis, -radial.dot(axis)).normalize();
            expect(normal.dot(radial) * (strip === 3 ? -1 : 1)).toBeGreaterThan(.7);
          }
        }
        for (const attr of Object.values(g.attributes)) expect(Array.from(attr.array).every(Number.isFinite)).toBe(true);
        for (let i = first; i < first + 5 * sides + 1; i++) expect(new T.Vector3().fromBufferAttribute(g.attributes.normal, i).length()).toBeCloseTo(1, 5);
        let draws = 0, triangles = 0;
        h.root.traverse(m => { if (m.isMesh) { draws++; triangles += m.geometry.index.count / 3; } });
        expect(draws).toBe(2); expect(triangles).toBeLessThanOrEqual(quality === 'high' ? 6000 : 1500);
      } finally { h.dispose(); }
    });

    it(`keeps its tissue fixed and its lumen shaded through colour display at ${quality}`, () => {
      const h = create({ quality }), f = funnel(h, quality), { g, first, sides } = f;
      try {
        const rest = g.attributes.position.array.slice(first * 3, (first + sides * 5 + 1) * 3);
        for (const t of [.5, Math.PI / 2 / .22, 21, 3600]) {
          h.update(.016, t);
          expect(g.attributes.position.array.slice(first * 3, (first + sides * 5 + 1) * 3)).toEqual(rest);
          const c = g.attributes.color, light = i => c.getX(i) + c.getY(i) + c.getZ(i);
          let lip = 0; for (let i = 0; i < sides; i++) lip += light(first + 2 * sides + i) / sides;
          expect(light(first + sides * 5)).toBeLessThan(lip * .3);
        }
        let geometries = 0, materials = 0;
        g.addEventListener('dispose', () => geometries++); f.mesh.material.addEventListener('dispose', () => materials++);
        h.dispose(); h.dispose(); expect(geometries).toBe(1); expect(materials).toBe(1);
      } finally { h.dispose(); }
    });
  }
});
