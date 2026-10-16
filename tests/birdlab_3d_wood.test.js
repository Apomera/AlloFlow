import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/birdlab_3d_habitat.js', 'utf8');
const woodBody = source.slice(source.indexOf('var woodSides ='), source.indexOf('var branches ='));
const endBody = source.slice(source.indexOf('var endSegments ='), source.indexOf('var endGrain ='));
const math = source.slice(source.indexOf('function smooth('), source.indexOf('function groundHeight('));
function wood(detailed) {
  return new Function('THREE', 'detailed', `
    function geometry(value) { return value; }
    function random() { throw new Error('Wood refinement must not move seeded woodland'); }
    ${math}
    ${woodBody}
    ${endBody}
    return { branchGeo, endGeo, sides: woodSides, spans: woodSpans };
  `)(THREE, detailed);
}

describe('BirdLab rounded woodland wood', () => {
  it('softens the high-quality wood with one restrained swell and no extra instances or textures', () => {
    const { branchGeo, endGeo, sides, spans } = wood(true);
    try {
      const positions = branchGeo.attributes.position, normals = branchGeo.attributes.normal;
      expect(sides).toBe(12); expect(spans).toBe(2);
      expect(branchGeo.index.count / 3).toBeLessThanOrEqual(72);
      expect(positions.count).toBeLessThan(100);
      const center = new THREE.Vector3();
      for (let vertex = sides + 1; vertex < (sides + 1) * 2 - 1; vertex++) center.add(new THREE.Vector3().fromBufferAttribute(positions, vertex));
      center.divideScalar(sides);
      expect(center.x).toBeCloseTo(.045, 5); expect(center.z).toBeCloseTo(-.028, 5);
      for (let vertex = 0; vertex < positions.count; vertex++) {
        const point = new THREE.Vector3().fromBufferAttribute(positions, vertex);
        const normal = new THREE.Vector3().fromBufferAttribute(normals, vertex);
        expect([point.x, point.y, point.z].every(Number.isFinite)).toBe(true);
        expect(normal.length()).toBeCloseTo(1, 5);
        expect(point.y).toBeGreaterThanOrEqual(-.5); expect(point.y).toBeLessThanOrEqual(.5);
      }
    } finally { branchGeo.dispose(); endGeo.dispose(); }
  });

  it('joins side lighting at the UV seam while retaining flat cap normals', () => {
    const { branchGeo, endGeo, sides, spans } = wood(true);
    try {
      const normal = branchGeo.attributes.normal, uv = branchGeo.attributes.uv;
      for (let ring = 0; ring <= spans; ring++) {
        const start = ring * (sides + 1), end = start + sides;
        expect(uv.getX(start)).toBe(0); expect(uv.getX(end)).toBe(1);
        expect(new THREE.Vector3().fromBufferAttribute(normal, start).distanceTo(new THREE.Vector3().fromBufferAttribute(normal, end))).toBeLessThan(1e-7);
      }
      for (let vertex = (sides + 1) * (spans + 1); vertex < normal.count; vertex++) {
        expect(normal.getX(vertex)).toBeCloseTo(0, 7); expect(normal.getZ(vertex)).toBeCloseTo(0, 7);
        expect(Math.abs(normal.getY(vertex))).toBeCloseTo(1, 7);
      }
    } finally { branchGeo.dispose(); endGeo.dispose(); }
  });

  it.each([true, false])('preserves the end rings and matches every exposed end-grain rim (high=%s)', detailed => {
    const { branchGeo, endGeo, sides, spans } = wood(detailed);
    const reference = new THREE.CylinderGeometry(.66, 1, 1, sides, spans);
    try {
      const p = branchGeo.attributes.position, r = reference.attributes.position, cap = endGeo.attributes.position;
      for (const ring of [0, spans]) for (let point = 0; point <= sides; point++) {
        const vertex = ring * (sides + 1) + point;
        const x = r.getX(vertex), y = r.getY(vertex), z = r.getZ(vertex);
        const flute = 1 + Math.sin(Math.atan2(z, x) * 5 + y * 2) * .045;
        expect(p.getX(vertex)).toBeCloseTo(x * flute, 6); expect(p.getZ(vertex)).toBeCloseTo(z * flute, 6);
        expect(p.getY(vertex)).toBe(y);
      }
      expect(cap.count).toBe(sides + 2);
      for (let point = 0; point <= sides; point++) {
        expect(cap.getX(point + 1) * .66).toBeCloseTo(p.getX(point), 6);
        expect(-cap.getY(point + 1) * .66).toBeCloseTo(p.getZ(point), 6);
      }
    } finally { branchGeo.dispose(); endGeo.dispose(); reference.dispose(); }
  });

  it('leaves low-quality wood geometry and vertex cost unchanged', () => {
    const { branchGeo, endGeo } = wood(false);
    const original = new THREE.CylinderGeometry(.66, 1, 1, 6, 1), p = original.attributes.position;
    for (let vertex = 0; vertex < p.count; vertex++) {
      const x = p.getX(vertex), y = p.getY(vertex), z = p.getZ(vertex);
      const flute = 1 + Math.sin(Math.atan2(z, x) * 5 + y * 2) * .045;
      p.setXYZ(vertex, x * flute, y, z * flute);
    }
    original.computeVertexNormals();
    try {
      expect(branchGeo.index.array).toEqual(original.index.array);
      for (const [name, attribute] of Object.entries(original.attributes)) expect(branchGeo.attributes[name].array).toEqual(attribute.array);
    } finally { branchGeo.dispose(); endGeo.dispose(); original.dispose(); }
  });
});
