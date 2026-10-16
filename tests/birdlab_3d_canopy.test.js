import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/birdlab_3d_habitat.js', 'utf8');
const cardBody = source.slice(source.indexOf('function cardGeometry('), source.indexOf('function applyWind('));
function cards(detailed, broadleaf) {
  return new Function('THREE', 'detailed', 'geometry', `
    function random() { throw new Error('Canopy shaping must not alter seeded woodland placement'); }
    ${cardBody}
    return cardGeometry;
  `)(THREE, detailed, value => value)(broadleaf);
}
const point = (attribute, index) => new THREE.Vector3().fromBufferAttribute(attribute, index);

describe('BirdLab curved canopy sprays', () => {
  it('gives each high-quality spray four shallow curved surfaces within a fixed 16-triangle budget', () => {
    const geometry = cards(true, true);
    try {
      const positions = geometry.attributes.position, uv = geometry.attributes.uv;
      expect(positions.count).toBe(20);
      expect(geometry.index.count / 3).toBe(16);
      for (let panel = 0; panel < 4; panel++) {
        const start = panel * 5;
        const perimeterCenter = [0, 1, 2, 3].reduce((sum, offset) => sum.add(point(positions, start + offset)), new THREE.Vector3()).multiplyScalar(.25);
        const depth = point(positions, start + 4).distanceTo(perimeterCenter);
        expect(depth).toBeGreaterThan(.20); expect(depth).toBeLessThan(.22);
        for (let vertex = start; vertex < start + 5; vertex++) {
          const p = point(positions, vertex);
          expect([p.x, p.y, p.z].every(Number.isFinite)).toBe(true);
          expect(Math.max(Math.abs(p.x), Math.abs(p.y), Math.abs(p.z))).toBeLessThan(1.1);
          expect(uv.getX(vertex)).toBeGreaterThanOrEqual(0); expect(uv.getX(vertex)).toBeLessThanOrEqual(1);
          expect(uv.getY(vertex)).toBeGreaterThanOrEqual(0); expect(uv.getY(vertex)).toBeLessThanOrEqual(1);
        }
      }
    } finally { geometry.dispose(); }
  });

  it('keeps every curved triangle nondegenerate and its smooth normals facing the lit surface', () => {
    const geometry = cards(true, true);
    try {
      const positions = geometry.attributes.position, normals = geometry.attributes.normal, index = geometry.index;
      for (let triangle = 0; triangle < index.count; triangle += 3) {
        const vertices = [index.getX(triangle), index.getX(triangle + 1), index.getX(triangle + 2)];
        const a = point(positions, vertices[0]), b = point(positions, vertices[1]), c = point(positions, vertices[2]);
        const normal = b.sub(a).cross(c.sub(a));
        expect(normal.length()).toBeGreaterThan(.25);
        normal.normalize();
        for (const vertex of vertices) {
          const shading = point(normals, vertex);
          expect(shading.length()).toBeCloseTo(1, 6);
          expect(shading.dot(normal)).toBeGreaterThan(.8);
        }
      }
    } finally { geometry.dispose(); }
  });

  it.each([[false, true], [true, false], [false, false]])('retains the inexpensive leaf/pine silhouette (high=%s broadleaf=%s)', (detailed, broadleaf) => {
    const geometry = cards(detailed, broadleaf);
    try {
      expect(geometry.attributes.position.count).toBe(16);
      expect(geometry.index.count / 3).toBe(8);
      expect(Object.keys(geometry.attributes).sort()).toEqual(['normal', 'position', 'uv']);
    } finally { geometry.dispose(); }
  });

  it('preserves the original spray corners and full atlas UV range', () => {
    const curved = cards(true, true), original = cards(false, true), again = cards(true, true);
    try {
      for (let panel = 0; panel < 4; panel++) for (let corner = 0; corner < 4; corner++) {
        expect(point(curved.attributes.position, panel * 5 + corner).distanceTo(point(original.attributes.position, panel * 4 + corner))).toBeLessThan(1e-7);
        expect(curved.attributes.uv.getX(panel * 5 + corner)).toBe(original.attributes.uv.getX(panel * 4 + corner));
        expect(curved.attributes.uv.getY(panel * 5 + corner)).toBe(original.attributes.uv.getY(panel * 4 + corner));
      }
      expect(again.attributes.position.array).toEqual(curved.attributes.position.array);
      expect(again.attributes.normal.array).toEqual(curved.attributes.normal.array);
    } finally { curved.dispose(); original.dispose(); again.dispose(); }
  });
});
