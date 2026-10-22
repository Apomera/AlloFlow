import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const w = {};
new Function('window', readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8'))(w);

describe('cleaner shrimp antenna filaments', () => {
  for (const quality of ['high', 'low']) {
    it(`renders fine tapered shafts with a small unindexed placement envelope at ${quality}`, () => {
      const h = w.Reef3DSpecies.create(THREE, 'cleaner_shrimp', { quality, seed: 7 });
      try {
        const g = h.root.getObjectByName('cleaner_shrimp-legs').geometry, part = g.userData.batch.find(p => p.part === 'antennae');
        const referenced = new Set(g.index.array.slice(part.start, part.start + part.length)), p = g.attributes.reefPart;
        expect(part.count - referenced.size).toBeGreaterThan(0);
        expect(part.count - referenced.size).toBeLessThanOrEqual(10);
        const steps = quality === 'high' ? 10 : 5, shaftVertices = (steps + 1) * 3 + 1;
        for (let shaft = 0; shaft < 6; shaft++) {
          const radii = [];
          for (const station of [0, steps]) {
            const points = [0, 1, 2].map(side => new THREE.Vector3().fromBufferAttribute(p, part.first + shaft * shaftVertices + station * 3 + side));
            const center = points.reduce((v, point) => v.add(point), new THREE.Vector3()).multiplyScalar(1 / 3);
            radii.push(points.reduce((n, point) => n + point.distanceTo(center), 0) / 3);
          }
          expect(radii[0]).toBeGreaterThan(.00025); expect(radii[0]).toBeLessThan(.0004);
          expect(radii[1] / radii[0]).toBeCloseTo(.2, 4);
        }
        for (const i of referenced) {
          const n = g.attributes.normal;
          expect(Math.hypot(n.getX(i), n.getY(i), n.getZ(i))).toBeCloseTo(1, 5);
          expect(g.boundingBox.containsPoint(new THREE.Vector3().fromBufferAttribute(g.attributes.position, i))).toBe(true);
        }
      } finally { h.dispose(); }
    });

    it(`keeps the visible and picking rest positions aligned with the antenna pivot at ${quality}`, () => {
      const h = w.Reef3DSpecies.create(THREE, 'cleaner_shrimp', { quality, seed: 7 });
      try {
        const g = h.root.getObjectByName('cleaner_shrimp-legs').geometry, part = g.userData.batch.find(p => p.part === 'antennae');
        const pivot = h.root.getObjectByName('cleaner_shrimp-antennae-pivot'), v = new THREE.Vector3();
        pivot.updateMatrix();
        for (let i = part.first; i < part.first + part.count; i++) {
          v.fromBufferAttribute(g.attributes.reefPart, i).applyMatrix4(pivot.matrix);
          expect(g.attributes.position.getX(i)).toBe(Math.fround(v.x));
          expect(g.attributes.position.getY(i)).toBe(Math.fround(v.y));
          expect(g.attributes.position.getZ(i)).toBe(Math.fround(v.z));
        }
      } finally { h.dispose(); }
    });
  }
});
