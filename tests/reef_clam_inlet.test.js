import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const scope = {};
new Function('window', readFileSync('stem_lab/reef_3d_species.js', 'utf8'))(scope);
const Species = scope.Reef3DSpecies;
const mantle = (h) => h.root.getObjectByName('giant_clam-mantle');
function atUV(g, u, v) {
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) if (Math.abs(uv.getX(i) - u) < 1e-6 && Math.abs(uv.getY(i) - v) < 1e-6) return i;
  throw new Error('Missing mantle sample ' + u + ',' + v);
}

describe('giant clam inhalant recess', () => {
  it('forms a tapered, lit tissue rim above a recessed inlet on both quality tiers', () => {
    for (const quality of ['low', 'high']) for (const health of ['healthy', 'bleached']) {
      const h = Species.create(THREE, 'giant_clam', { quality, health, seed: 7 });
      try {
        const g = mantle(h).geometry, p = g.attributes.position, color = g.attributes.color;
        const center = atUV(g, .5, .5), left = atUV(g, .5, quality === 'high' ? .435 : .4), right = atUV(g, .5, quality === 'high' ? .565 : .6);
        expect(p.getY(left) - p.getY(center)).toBeGreaterThan(.01);
        expect(p.getY(right) - p.getY(center)).toBeGreaterThan(.01);
        expect(color.getX(center)).toBeGreaterThan(.25);
        expect(color.getX(center)).toBeLessThan(.45);
        expect(color.getX(left)).toBe(1);
        expect(color.getX(atUV(g, 0, .5))).toBe(1);
        expect(color.getX(atUV(g, 1, .5))).toBe(1);
        const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
        for (let i = 0; i < g.index.count; i += 3) {
          const ia = g.index.getX(i), ib = g.index.getX(i + 1), ic = g.index.getX(i + 2);
          // The pre-existing shell endpoint samples collapse at u=0/1.
          if ([ia, ib, ic].some(j => g.attributes.uv.getX(j) === 0 || g.attributes.uv.getX(j) === 1)) continue;
          a.fromBufferAttribute(p, ia); b.fromBufferAttribute(p, ib); c.fromBufferAttribute(p, ic);
          const cross = b.sub(a).cross(c.sub(a));
          expect(cross.length()).toBeGreaterThan(1e-10);
          expect(cross.y).toBeGreaterThan(0);
        }
      } finally { h.dispose(); }
    }
  });

  it('keeps the opening finite and bounded during its existing soft-tissue animation', () => {
    for (const quality of ['low', 'high']) {
      const h = Species.create(THREE, 'giant_clam', { quality, seed: 7 });
      try {
        const g = mantle(h).geometry, p = new THREE.Vector3(), n = new THREE.Vector3();
        for (const time of [0, .7, 8.2, 31]) {
          h.update(1 / 60, time);
          for (const name of ['position', 'normal', 'color', 'uv']) expect(Array.from(g.attributes[name].array).every(Number.isFinite)).toBe(true);
          for (let i = 0; i < g.attributes.position.count; i++) {
            p.fromBufferAttribute(g.attributes.position, i);
            expect(p.distanceTo(g.boundingSphere.center)).toBeLessThanOrEqual(g.boundingSphere.radius + 1e-6);
            const u = g.attributes.uv.getX(i);
            if (u > .1 && u < .9) {
              n.fromBufferAttribute(g.attributes.normal, i);
              expect(n.length()).toBeCloseTo(1, 5);
            }
          }
        }
      } finally { h.dispose(); }
    }
  });

  it('keeps three draws and deterministic motion while reduced motion holds the inlet still', () => {
    for (const quality of ['low', 'high']) {
      const a = Species.create(THREE, 'giant_clam', { quality, seed: 3 }), b = Species.create(THREE, 'giant_clam', { quality, seed: 3 }), still = Species.create(THREE, 'giant_clam', { quality, seed: 3, reducedMotion: true });
      try {
        let meshes = 0, triangles = 0;
        a.root.traverse(o => { if (o.isMesh) { meshes++; triangles += o.geometry.index.count / 3; } });
        expect(meshes).toBe(3);
        expect(triangles).toBe(quality === 'high' ? 4836 : 870);
        const initial = mantle(still).geometry.attributes.position.array.slice();
        for (let time = 0; time < 3; time += .1) a.update(.1, time);
        a.update(.01, 3); b.update(3, 3); still.update(3, 3);
        expect(mantle(a).geometry.attributes.position.array).toEqual(mantle(b).geometry.attributes.position.array);
        expect(mantle(a).geometry.attributes.normal.array).toEqual(mantle(b).geometry.attributes.normal.array);
        expect(mantle(still).geometry.attributes.position.array).toEqual(initial);
      } finally { a.dispose(); b.dispose(); still.dispose(); }
    }
  });
});
