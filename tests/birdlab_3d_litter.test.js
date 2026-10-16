import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/birdlab_3d_habitat.js', 'utf8');
const math = source.slice(source.indexOf('function smooth('), source.indexOf('function groundHeight('));
const leafBody = source.slice(source.indexOf('function smallLeafGeometry('), source.indexOf('function groundSurfaceAt('));
const leaf = (detailed, herb = false) => new Function('THREE', 'detailed', 'herb', `
  function geometry(value) { return value; }
  ${math}
  ${leafBody}
  return smallLeafGeometry(herb);`)(THREE, detailed, herb);

describe('BirdLab curled forest litter', () => {
  it('closes both pointed ends and shares each vertex of the curved dry surface', () => {
    const geometry = leaf(true);
    try {
      const position = geometry.attributes.position, uv = geometry.attributes.uv, coordinates = new Set();
      const roots = [], tips = [];
      for (let vertex = 0; vertex < position.count; vertex++) {
        const point = [position.getX(vertex), position.getY(vertex), position.getZ(vertex)];
        coordinates.add(point.join(','));
        expect(point.every(Number.isFinite)).toBe(true);
        expect(point[1]).toBeGreaterThan(0); // Keep the authored surface above its terrain attachment.
        if (uv.getY(vertex) === 0) roots.push(point);
        if (uv.getY(vertex) === 1) tips.push(point);
      }
      expect(coordinates.size).toBe(position.count);
      expect(roots).toHaveLength(1); expect(tips).toHaveLength(1);
      expect(roots[0][0]).toBe(0); expect(roots[0][1]).toBeCloseTo(.012, 7); expect(roots[0][2]).toBe(-.5);
      expect(tips[0][0]).toBe(0); expect(tips[0][1]).toBeCloseTo(.090, 7); expect(tips[0][2]).toBe(.5);
      // Shared curve stations improve the outline without more stored vertices
      // than the old four independently shaded strips (32 vertices).
      expect(position.count).toBeLessThan(32);
      expect(geometry.index.count / 3).toBeLessThanOrEqual(28);
    } finally { geometry.dispose(); }
  });

  it('keeps upward nondegenerate faces and continuous unit lighting normals', () => {
    const geometry = leaf(true);
    try {
      const position = geometry.attributes.position, normal = geometry.attributes.normal, index = geometry.index;
      const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), face = new THREE.Vector3();
      let maxNormalAngle = 0;
      for (let triangle = 0; triangle < index.count; triangle += 3) {
        const vertices = [index.getX(triangle), index.getX(triangle + 1), index.getX(triangle + 2)];
        a.fromBufferAttribute(position, vertices[0]); b.fromBufferAttribute(position, vertices[1]); c.fromBufferAttribute(position, vertices[2]);
        face.crossVectors(b.sub(a), c.sub(a));
        expect(face.lengthSq()).toBeGreaterThan(1e-12); expect(face.y).toBeGreaterThan(0);
        for (let edge = 0; edge < 3; edge++) {
          a.fromBufferAttribute(normal, vertices[edge]); b.fromBufferAttribute(normal, vertices[(edge + 1) % 3]);
          expect(a.length()).toBeCloseTo(1, 6); expect(a.y).toBeGreaterThan(.4);
          expect(a.dot(face)).toBeGreaterThan(0);
          maxNormalAngle = Math.max(maxNormalAngle, a.angleTo(b));
        }
      }
      expect(maxNormalAngle).toBeGreaterThan(.1); // A curved surface, rather than one plane.
      expect(maxNormalAngle).toBeLessThan(.8); // No abrupt flat-shaded seams.
    } finally { geometry.dispose(); }
  });

  it('leaves low-quality litter cost unchanged', () => {
    const low = leaf(false);
    try {
      expect(low.attributes.position.count).toBe(32); expect(low.index.count / 3).toBe(16);
    } finally { low.dispose(); }
  });
});
