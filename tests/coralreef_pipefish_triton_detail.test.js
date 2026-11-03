import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const T = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const local = {};
new Function('window', readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8'))(local);
const S = local.Reef3DSpecies;
function meshes(h) { const result = []; h.root.traverse(n => { if (n.isMesh) result.push(n); }); return result; }
function point(attribute, index) { return new T.Vector3().fromBufferAttribute(attribute, index); }
function centroid(attribute, first, count) {
  const result = new T.Vector3();
  for (let i = first; i < first + count; i++) result.add(point(attribute, i));
  return result.divideScalar(count);
}

describe('pipefish eye contact and triton terminal mouth', () => {
  for (const quality of ['low', 'high']) {
    it('seats both pipefish corneal rims on the rendered head triangles at ' + quality, () => {
      const h = S.create(T, 'banded_pipefish', { seed: 7, quality, reducedMotion: true });
      try {
        h.root.updateMatrixWorld(true);
        const [body, details] = meshes(h), p = details.geometry.attributes.position, uv = details.geometry.attributes.uv;
        const eyePart = details.geometry.userData.batch.find(part => part.part === 'eyes-mouth');
        const counts = { '-1': 0, '1': 0 }, pupils = [];
        for (let i = eyePart.first; i < eyePart.first + eyePart.count; i++) {
          if (uv.getX(i) < 1.8) continue;
          const radial = Math.hypot(uv.getX(i) - 2.5, uv.getY(i) - .5) * 2;
          if (radial < 1.04 && radial > .00001) continue;
          const eye = point(p, i), side = Math.sign(eye.z);
          const ray = new T.Raycaster(new T.Vector3(eye.x, eye.y, side * .02), new T.Vector3(0, 0, -side));
          const surface = ray.intersectObject(body)[0];
          expect(surface, 'eye has actual head geometry beneath it').toBeDefined();
          const clearance = side * (eye.z - surface.point.z);
          if (radial > 1.04) {
            expect(clearance, 'limbus does not intersect the head').toBeGreaterThanOrEqual(-.000001);
            expect(clearance, 'limbus does not float above the head').toBeLessThan(.00004);
            counts[side]++;
          } else pupils.push(clearance);
        }
        expect(counts[-1]).toBeGreaterThanOrEqual(12);
        expect(counts[1]).toBe(counts[-1]);
        expect(pupils).toHaveLength(2);
        for (const clearance of pupils) { expect(clearance).toBeGreaterThan(.0002); expect(clearance).toBeLessThan(.0005); }
      } finally { h.dispose(); }
    });

    it('has a visible shaded triton mouth recessed behind its terminal ring at ' + quality, () => {
      const h = S.create(T, 'giant_triton', { seed: 7, quality, reducedMotion: true });
      try {
        h.root.updateMatrixWorld(true);
        const parts = meshes(h), animal = parts.find(m => m.name === 'giant_triton-animal');
        expect(parts).toHaveLength(2);
        const g = animal.geometry, p = g.attributes.position, color = g.attributes.color, mouth = g.userData.tritonMouth;
        expect(mouth).toBeDefined();
        const rim = centroid(p, mouth.first, mouth.count), behind = centroid(p, mouth.first - mouth.count, mouth.count);
        const axis = rim.clone().sub(behind).normalize(), center = point(p, mouth.center);
        const depth = rim.clone().sub(center).dot(axis);
        expect(depth).toBeGreaterThan(.0008);
        expect(depth).toBeLessThan(.0035);
        let rimBrightness = 0;
        for (let i = mouth.first; i < mouth.first + mouth.count; i++) {
          expect(point(p, i).distanceTo(rim)).toBeGreaterThan(.004);
          expect(point(p, i).distanceTo(rim)).toBeLessThan(.008);
          rimBrightness += color.getX(i) + color.getY(i) + color.getZ(i);
        }
        const centerBrightness = color.getX(mouth.center) + color.getY(mouth.center) + color.getZ(mouth.center);
        expect(centerBrightness).toBeLessThan(rimBrightness / mouth.count * .4);
        // A real viewing ray must enter the recess before meeting its surface.
        const hit = new T.Raycaster(rim.clone().addScaledVector(axis, .02), axis.clone().negate()).intersectObject(animal)[0];
        expect(hit).toBeDefined();
        expect(rim.clone().sub(hit.point).dot(axis)).toBeGreaterThan(.0006);
        const fan = [];
        for (let i = 0; i < g.index.count; i += 3) {
          const face = [g.index.getX(i), g.index.getX(i + 1), g.index.getX(i + 2)];
          if (face.includes(mouth.center)) fan.push(face);
        }
        expect(fan).toHaveLength(mouth.count);
        expect(fan.flat().every(i => i === mouth.center || i >= mouth.first && i < mouth.first + mouth.count)).toBe(true);
      } finally { h.dispose(); }
    });
  }
});
