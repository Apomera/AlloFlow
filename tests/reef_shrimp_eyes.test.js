import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const w = {};
new Function('window', readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8'))(w);
const create = options => w.Reef3DSpecies.create(THREE, 'cleaner_shrimp', { seed: 7, ...options });
const limbs = h => h.root.getObjectByName('cleaner_shrimp-legs');

describe('cleaner shrimp stalked eyes', () => {
  for (const quality of ['low', 'high']) {
    it(`has a seated pair of dark rounded eyes inside the body and antenna envelope at ${quality}`, () => {
      const h = create({ quality });
      try {
        const g = limbs(h).geometry, p = g.attributes.position, c = g.attributes.color, n = g.attributes.normal;
        const part = g.userData.batch.find(p => p.part === 'legs');
        const rendered = new Set(g.index.array);
        const left = new THREE.Box3(), right = new THREE.Box3(), v = new THREE.Vector3();
        let eyeVertices = 0;
        for (let i = part.first; i < part.first + part.count; i++) {
          if (Math.max(c.getX(i), c.getY(i), c.getZ(i)) > .02) continue;
          v.fromBufferAttribute(p, i); (v.z < 0 ? left : right).expandByPoint(v); eyeVertices++;
          expect(g.boundingBox.containsPoint(v)).toBe(true);
          expect(v.length()).toBeLessThan(h.radius);
          // Three's sphere poles contain duplicate unreferenced vertices.
          if (rendered.has(i)) expect(Math.hypot(n.getX(i), n.getY(i), n.getZ(i))).toBeCloseTo(1, 5);
        }
        expect(eyeVertices).toBeGreaterThan(60);
        expect(left.isEmpty()).toBe(false); expect(right.isEmpty()).toBe(false);
        expect(left.min.x).toBeGreaterThan(.015);
        expect(left.max.x).toBeCloseTo(right.max.x, 8);
        expect(left.min.y).toBeCloseTo(right.min.y, 8);
        expect(left.min.z).toBeCloseTo(-right.max.z, 8);
        const size = left.getSize(new THREE.Vector3());
        expect(Math.min(size.x, size.y, size.z)).toBeGreaterThan(.0015);
        expect(Math.max(size.x, size.y, size.z)).toBeLessThan(.003);
        let draws = 0, triangles = 0;
        h.root.traverse(m => { if (m.isMesh) { draws++; triangles += m.geometry.index.count / 3; } });
        expect(draws).toBe(2);
        expect(triangles).toBeLessThanOrEqual(quality === 'high' ? 6000 : 1500);
      } finally { h.dispose(); }
    });

    it(`keeps eye geometry fixed while antenna motion is deterministic at ${quality}`, () => {
      const a = create({ quality }), b = create({ quality }), still = create({ quality, reducedMotion: true });
      try {
        const geometry = Array.from(limbs(a).geometry.attributes.position.array);
        const pivot = h => h.root.getObjectByName('cleaner_shrimp-antennae-pivot');
        const stationary = pivot(still).quaternion.toArray();
        let moved = false;
        for (const t of [2, 5, 12]) {
          a.update(.016, t); b.update(.016, t); still.update(.016, t);
          expect(pivot(a).quaternion.toArray()).toEqual(pivot(b).quaternion.toArray());
          expect(pivot(still).quaternion.toArray()).toEqual(stationary);
          expect(Array.from(limbs(a).geometry.attributes.position.array)).toEqual(geometry);
          moved ||= Math.abs(pivot(a).quaternion.x) > .001;
        }
        expect(moved).toBe(true);
      } finally { a.dispose(); b.dispose(); still.dispose(); }
    });

    it(`disposes the existing materials, textures and geometry once at ${quality}`, () => {
      const h = create({ quality }), resources = new Set(), counts = new Map();
      h.root.traverse(m => { if (m.isMesh) { resources.add(m.geometry); for (const material of Array.isArray(m.material) ? m.material : [m.material]) { resources.add(material); for (const value of Object.values(material)) if (value && value.isTexture) resources.add(value); } } });
      for (const resource of resources) resource.addEventListener('dispose', () => counts.set(resource, (counts.get(resource) || 0) + 1));
      h.dispose(); h.dispose();
      expect(resources.size).toBeGreaterThanOrEqual(4);
      for (const resource of resources) expect(counts.get(resource)).toBe(1);
    });
  }
});
