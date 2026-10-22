import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
const T = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const w = {};
new Function('window', readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8'))(w);
const create = options => w.Reef3DSpecies.create(T, 'giant_moray', { seed: 7, ...options });
function centers(mesh) {
  const uv = mesh.geometry.attributes.uv, result = [];
  for (let i = 0; i < uv.count; i++) if (Math.abs(uv.getX(i) - 2.5) < 1e-7 && Math.abs(uv.getY(i) - .5) < 1e-7) result.push(i);
  return result;
}

describe('giant moray eye seating', () => {
  for (const quality of ['high', 'low']) {
    it(`exposes both corneal centers above the curved head at ${quality}`, () => {
      const h = create({ quality, reducedMotion: true });
      try {
        h.root.updateMatrixWorld(true);
        const body = h.root.getObjectByName('giant_moray-body'), fins = h.root.getObjectByName('giant_moray-fins'), eyes = centers(fins);
        expect(eyes.length).toBe(2);
        for (const i of eyes) {
          const local = new T.Vector3().fromBufferAttribute(fins.geometry.attributes.position, i), side = Math.sign(local.z);
          const center = local.clone().applyMatrix4(fins.matrixWorld), outward = new T.Vector3(0, 0, side).transformDirection(fins.matrixWorld);
          const distance = h.radius * 2, ray = new T.Raycaster(center.clone().addScaledVector(outward, distance), outward.clone().negate());
          const hits = ray.intersectObject(body, false);
          expect(hits.length).toBeGreaterThan(0);
          // A visible cornea must precede the skin along the viewing ray.
          const clearance = hits[0].distance - distance;
          expect(clearance).toBeGreaterThan(1e-5);
          expect(clearance).toBeLessThan(h.radius * .05);
        }
      } finally { h.dispose(); }
    });

    it(`keeps eye buffers still and finite through jaw motion at ${quality}`, () => {
      const h = create({ quality }), fins = h.root.getObjectByName('giant_moray-fins'), g = fins.geometry;
      try {
        const rest = g.attributes.position.array.slice(), jaw = h.root.getObjectByName('giant_moray-jaw-pivot'), restAngle = jaw.rotation.z;
        for (const t of [0, 2, 8, 123, 3600]) {
          h.update(.016, t);
          expect(g.attributes.position.array).toEqual(rest);
          for (const i of centers(fins)) expect(new T.Vector3().fromBufferAttribute(g.attributes.normal, i).length()).toBeCloseTo(1, 5);
        }
        expect(jaw.rotation.z).not.toBe(restAngle);
        for (const attr of Object.values(g.attributes)) expect(Array.from(attr.array).every(Number.isFinite)).toBe(true);
        let geometries = 0, materials = 0;
        g.addEventListener('dispose', () => geometries++); fins.material.addEventListener('dispose', () => materials++);
        h.dispose(); h.dispose(); expect(geometries).toBe(1); expect(materials).toBe(1);
      } finally { h.dispose(); }
    });
  }
});
