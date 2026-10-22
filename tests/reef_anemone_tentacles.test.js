import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const local = {};
new Function('window', readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8'))(local);
const create = options => local.Reef3DSpecies.create(THREE, 'magnificent_anemone', { seed: 7, ...options });
const tentacles = h => h.root.getObjectByName('magnificent_anemone-tentacles');

describe('magnificent anemone rounded tentacles', () => {
  for (const quality of ['low', 'high']) {
    it(`keeps health geometry identical and preserves contrasting tissue at ${quality}`, () => {
      const healthy = create({ quality }), bleached = create({ quality, health: 'bleached' });
      try {
        const a = tentacles(healthy), b = tentacles(bleached);
        for (const key of ['position', 'normal', 'uv']) expect(a.geometry.attributes[key].array).toEqual(b.geometry.attributes[key].array);
        expect(a.geometry.index.array).toEqual(b.geometry.index.array);
        expect(a.instanceMatrix.array).toEqual(b.instanceMatrix.array);
        expect(healthy.hostSlots).toEqual(bleached.hostSlots);
        expect(healthy.radius).toBe(bleached.radius);
        expect(a.geometry.attributes.color.array).not.toEqual(b.geometry.attributes.color.array);
        const column = h => h.root.getObjectByName('magnificent_anemone-column');
        expect(column(healthy).geometry.attributes.position.array).toEqual(column(bleached).geometry.attributes.position.array);
      } finally { healthy.dispose(); bleached.dispose(); }
    });

    it(`has finite unit normals, outward cap faces and a bounded two-draw mesh at ${quality}`, () => {
      const h = create({ quality });
      try {
        const g = tentacles(h).geometry, p = g.attributes.position, n = g.attributes.normal;
        for (let i = 0; i < n.count; i++) expect(Math.hypot(n.getX(i), n.getY(i), n.getZ(i))).toBeCloseTo(1, 6);
        const tip = p.count - 1, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), cross = new THREE.Vector3();
        let capFaces = 0;
        for (let i = 0; i < g.index.count; i += 3) {
          const ids = [g.index.getX(i), g.index.getX(i + 1), g.index.getX(i + 2)];
          if (!ids.includes(tip)) continue;
          a.fromBufferAttribute(p, ids[0]); b.fromBufferAttribute(p, ids[1]); c.fromBufferAttribute(p, ids[2]);
          cross.crossVectors(b.sub(a), c.sub(a));
          expect(cross.lengthSq()).toBeGreaterThan(1e-12);
          expect(cross.y).toBeGreaterThan(0);
          capFaces++;
        }
        expect(capFaces).toBe(quality === 'high' ? 6 : 5);
        expect(p.getY(tip)).toBeCloseTo(1.045, 6);
        let draws = 0, triangles = 0;
        h.root.traverse(m => { if (m.isMesh) { draws++; triangles += m.geometry.index.count / 3 * (m.isInstancedMesh ? m.count : 1); } });
        expect(draws).toBe(2);
        expect(triangles).toBeLessThanOrEqual(quality === 'high' ? 8300 : 2500);
      } finally { h.dispose(); }
    });

    it(`keeps roots attached, deterministic current poses and reduced-motion stillness at ${quality}`, () => {
      const a = create({ quality }), b = create({ quality }), still = create({ quality, reducedMotion: true });
      try {
        const roots = Array.from(tentacles(a).instanceMatrix.array).filter((_, i) => i % 16 >= 12 && i % 16 <= 14);
        const frozen = Array.from(tentacles(still).instanceMatrix.array);
        for (const time of [2, 5, 12]) {
          const flow = { current: { x: .8, z: .35, strength: .6 } };
          a.update(.016, time, flow); b.update(.016, time, flow); still.update(.016, time, flow);
          expect(tentacles(a).instanceMatrix.array).toEqual(tentacles(b).instanceMatrix.array);
          expect(Array.from(tentacles(a).instanceMatrix.array).filter((_, i) => i % 16 >= 12 && i % 16 <= 14)).toEqual(roots);
          expect(Array.from(tentacles(still).instanceMatrix.array)).toEqual(frozen);
        }
      } finally { a.dispose(); b.dispose(); still.dispose(); }
    });

    it(`disposes geometry and materials exactly once at ${quality}`, () => {
      const h = create({ quality }), resources = new Set(), counts = new Map();
      h.root.traverse(m => { if (m.isMesh) { resources.add(m.geometry); const materials = Array.isArray(m.material) ? m.material : [m.material]; for (const material of materials) { resources.add(material); for (const value of Object.values(material)) if (value && value.isTexture) resources.add(value); } } });
      for (const resource of resources) resource.addEventListener('dispose', () => counts.set(resource, (counts.get(resource) || 0) + 1));
      h.dispose(); h.dispose();
      expect(resources.size).toBeGreaterThanOrEqual(4);
      for (const resource of resources) expect(counts.get(resource)).toBe(1);
    });
  }
});
