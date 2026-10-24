import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
const T = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const w = {};
new Function('window', readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8'))(w);
const create = options => w.Reef3DSpecies.create(T, 'christmas_tree_worm', { seed: 7, ...options });

describe('Christmas tree worm fine radiolar crowns', () => {
  for (const quality of ['high', 'low']) {
    it(`retains paired crowns and a finite open fringe inside its stable culling envelope at ${quality}`, () => {
      const h = create({ quality }), mesh = h.root.getObjectByName('christmas_tree_worm-worms'), g = mesh.geometry;
      try {
        const pos = g.attributes.position, normal = g.attributes.normal, index = g.index, a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3();
        expect(mesh.count).toBe(quality === 'high' ? 28 : 16);
        expect(index.count / 3).toBe(quality === 'high' ? 160 : 80);
        expect(pos.count).toBeGreaterThan(index.count / 3 + 2);
        const used = new Set(index.array);
        expect(used.size).toBe(pos.count);
        for (const key of Object.keys(g.attributes)) {
          expect(g.attributes[key].count).toBe(pos.count);
          expect(Array.from(g.attributes[key].array).every(Number.isFinite)).toBe(true);
        }
        for (let i = 0; i < pos.count; i++) {
          a.fromBufferAttribute(pos, i); b.fromBufferAttribute(normal, i);
          expect(g.boundingBox.containsPoint(a)).toBe(true);
          expect(g.boundingSphere.containsPoint(a)).toBe(true);
          expect(b.length()).toBeCloseTo(1, 5);
        }
        for (let i = 0; i < index.count; i += 3) {
          a.fromBufferAttribute(pos, index.getX(i)); b.fromBufferAttribute(pos, index.getX(i + 1)); c.fromBufferAttribute(pos, index.getX(i + 2));
          expect(b.sub(a).cross(c.sub(a)).length()).toBeGreaterThan(1e-10);
        }
        // The radioles use real geometry gaps, retaining the existing opaque material.
        expect(mesh.material.transparent).toBe(false); expect(mesh.material.alphaMap).toBeNull();
        expect(mesh.material.map).toBeNull(); expect(mesh.material.side).toBe(T.DoubleSide);
      } finally { h.dispose(); }
    });

    it(`releases both meshes and their materials exactly once at ${quality}`, () => {
      const h = create({ quality }), geometries = new Set(), materials = new Set();
      h.root.traverse(mesh => { if (mesh.geometry) geometries.add(mesh.geometry); if (mesh.material) materials.add(mesh.material); });
      let geometryDisposals = 0, materialDisposals = 0;
      for (const g of geometries) g.addEventListener('dispose', () => geometryDisposals++);
      for (const m of materials) m.addEventListener('dispose', () => materialDisposals++);
      expect(geometries.size).toBe(2); expect(materials.size).toBe(2);
      h.dispose(); h.dispose();
      expect(geometryDisposals).toBe(2); expect(materialDisposals).toBe(2);
    });
  }
});
