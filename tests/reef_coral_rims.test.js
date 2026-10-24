import { afterEach, describe, expect, it } from 'vitest';
import { THREE, runtime, cleanup, SOURCE } from './helpers/reef_dive_harness.js';

afterEach(() => cleanup());

// Shell topology is a property of the exact builder, independent of the full
// ecosystem. Keep scene/batch integration coverage in the second test below.
const geometryScope = {};
new Function('window', SOURCE.replace('global.Reef3DExplore = { version:',
  'global.coralRimGeometry = { buildPlate, buildTable }; global.Reef3DExplore = { version:'))(geometryScope);

function components(geometry) {
  const index = geometry.index.array, count = geometry.attributes.position.count;
  const parent = Int32Array.from({ length: count }, (_, i) => i);
  const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  for (let i = 0; i < index.length; i += 3) {
    parent[find(index[i + 1])] = find(index[i]);
    parent[find(index[i + 2])] = find(index[i]);
  }
  const pieces = new Map();
  for (let i = 0; i < index.length; i += 3) {
    const key = find(index[i]);
    if (!pieces.has(key)) pieces.set(key, []);
    pieces.get(key).push(index[i], index[i + 1], index[i + 2]);
  }
  return [...pieces.values()];
}

describe('plate and table coral rims', () => {
  it('joins the upper and lower colony faces into closed, outward-facing shells at every detail tier', () => {
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), cross = new THREE.Vector3();
    for (const detail of [true, false, 'far']) for (const kind of ['plate', 'table']) {
      const g = kind === 'plate' ? geometryScope.coralRimGeometry.buildPlate(THREE, .45, .4, 5, detail)
        : geometryScope.coralRimGeometry.buildTable(THREE, .5, .5, 3, detail);
      const pos = g.attributes.position;
      const shells = components(g).filter((indices) => {
        const edges = new Map();
        for (let i = 0; i < indices.length; i += 3) for (let j = 0; j < 3; j++) {
          const u = indices[i + j], v = indices[i + (j + 1) % 3], key = Math.min(u, v) + ':' + Math.max(u, v);
          edges.set(key, (edges.get(key) || 0) + 1);
        }
        return [...edges.values()].every((n) => n === 2);
      });
      expect(shells.length, detail + ' ' + kind + ' closed shells').toBe(kind === 'table' ? 1 : 3);
      for (const indices of shells) {
        let volume = 0, minimumArea = Infinity;
        for (let i = 0; i < indices.length; i += 3) {
          a.fromBufferAttribute(pos, indices[i]); b.fromBufferAttribute(pos, indices[i + 1]); c.fromBufferAttribute(pos, indices[i + 2]);
          volume += a.dot(cross.crossVectors(b, c)) / 6;
          minimumArea = Math.min(minimumArea, cross.crossVectors(b.sub(a), c.sub(a)).length() * 0.5);
        }
        expect(volume, 'outward winding encloses positive volume').toBeGreaterThan(0.0001);
        expect(minimumArea, 'no collapsed rim triangles').toBeGreaterThan(1e-8);
      }
      g.dispose();
    }
  });

  it('keeps finite unit normals and every vertex inside its bounds without adding colony draw batches', () => {
    const p = new THREE.Vector3();
    for (const quality of ['high', 'low']) {
      const t = runtime({ quality });
      for (const kind of ['plate', 'table']) {
        const meshes = [];
        t.scene.traverse((o) => { if (o.userData.decorative && o.userData.kind === kind) meshes.push(o); });
        expect(meshes).toHaveLength(quality === 'high' ? 3 : 2);
        for (const mesh of meshes) {
          const g = mesh.geometry, drawn = new Set(g.index.array);
          expect(mesh.isInstancedMesh).toBe(true);
          expect(g.attributes.position.count).toBeLessThan(1800);
          for (const attribute of ['position', 'normal', 'color']) expect(Array.from(g.attributes[attribute].array).every(Number.isFinite)).toBe(true);
          for (let i = 0; i < g.attributes.position.count; i++) {
            p.fromBufferAttribute(g.attributes.position, i);
            expect(g.boundingSphere.distanceToPoint(p)).toBeLessThan(1e-6);
            p.fromBufferAttribute(g.attributes.normal, i);
            // Tube caps retain an unused seam vertex; only indexed vertices
            // participate in lighting and require a normalized normal.
            if (drawn.has(i)) expect(p.length(), quality + ' ' + kind + ' ' + mesh.userData.lod + ' vertex ' + i).toBeCloseTo(1, 4);
          }
        }
      }
    }
  });
});
