import { afterEach, describe, expect, it } from 'vitest';
import { THREE, SOURCE, runtime, cleanup } from './helpers/reef_dive_harness.js';

afterEach(() => cleanup());
const scope = {};
new Function('window', SOURCE.replace('global.Reef3DExplore = { version:',
  'global.spongeGeometry = buildSponge; global.Reef3DExplore = { version:'))(scope);
const make = (sides) => scope.spongeGeometry(THREE, .18, .42, 4, sides);

describe('porous tube sponge finish', () => {
  it('retains the same three tubes and shared rim samples as the view changes detail', () => {
    const near = make(10), far = make(5), a = new THREE.Vector3(), b = new THREE.Vector3();
    // Shared angular samples include the outer wall, rolled rim and inner wall.
    for (let tube = 0; tube < 3; tube++) for (let ring = 0; ring < 12; ring++) for (let j = 0; j < 5; j++) {
      a.fromBufferAttribute(near.attributes.position, tube * 121 + ring * 10 + j * 2);
      b.fromBufferAttribute(far.attributes.position, tube * 61 + ring * 5 + j);
      expect(a.distanceTo(b)).toBeLessThan(1e-7);
    }
    near.dispose(); far.dispose();
  });

  it('has open rims, recessed closed cavity floors and finite outward normals at every tier', () => {
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), normal = new THREE.Vector3();
    for (const sides of [10, 6, 5]) {
      const g = make(sides), p = g.attributes.position, n = g.attributes.normal, stride = 12 * sides + 1;
      expect(p.count).toBe(stride * 3);
      expect(g.index.count / 3).toBeLessThanOrEqual(690);
      for (const attr of ['position', 'normal', 'color']) expect(Array.from(g.attributes[attr].array).every(Number.isFinite)).toBe(true);
      for (let i = 0; i < p.count; i++) {
        a.fromBufferAttribute(p, i); normal.fromBufferAttribute(n, i);
        expect(normal.length()).toBeCloseTo(1, 4);
        expect(g.boundingSphere.distanceToPoint(a)).toBeLessThan(1e-6);
      }
      const edges = new Map();
      for (let i = 0; i < g.index.count; i += 3) {
        const triangle = Array.from(g.index.array.slice(i, i + 3));
        a.fromBufferAttribute(p, triangle[0]); b.fromBufferAttribute(p, triangle[1]); c.fromBufferAttribute(p, triangle[2]);
        expect(b.sub(a).cross(c.sub(a)).length()).toBeGreaterThan(1e-10);
        triangle.forEach((v, j) => { const w = triangle[(j + 1) % 3], key = [Math.min(v, w), Math.max(v, w)].join(':'); edges.set(key, (edges.get(key) || 0) + 1); });
      }
      // Only the terrain-facing tube bases remain unsealed; no rim or cavity gaps.
      const boundary = [...edges].filter(([, count]) => count === 1);
      expect(boundary).toHaveLength(3 * sides);
      for (const [edge] of boundary) for (const vertex of edge.split(':').map(Number)) expect(vertex % stride).toBeLessThan(sides);
      for (let tube = 0; tube < 3; tube++) {
        const start = tube * stride, floor = start + stride - 1;
        expect(p.getY(floor)).toBeLessThan(p.getY(start + 6 * sides) - .08);
        expect(n.getY(floor)).toBeGreaterThan(.95);
        expect(g.attributes.color.getX(floor)).toBeLessThan(g.attributes.color.getX(start + 6 * sides) * .3);
        for (const [ring, outward] of [[1, 1], [9, -1]]) {
          const centre = new THREE.Vector3();
          for (let j = 0; j < sides; j++) centre.add(a.fromBufferAttribute(p, start + ring * sides + j));
          centre.divideScalar(sides);
          for (let j = 0; j < sides; j++) {
            const at = start + ring * sides + j;
            a.fromBufferAttribute(p, at).sub(centre).setY(0).normalize(); normal.fromBufferAttribute(n, at);
            expect(a.dot(normal) * outward).toBeGreaterThan(.2);
          }
        }
      }
      g.dispose();
    }
  });

  it('keeps two instance batches and the existing shared shader, with nonfluorescent sponge pores', () => {
    for (const quality of ['low', 'high']) {
      const t = runtime({ quality }), sponges = [];
      let coral;
      t.scene.traverse((o) => {
        if (!o.userData.decorative) return;
        if (o.userData.kind === 'sponge') sponges.push(o);
        if (o.userData.kind === 'finger' && o.userData.lod === 'near') coral = o;
      });
      expect(sponges).toHaveLength(2);
      const near = sponges.find((o) => o.userData.lod === 'near'), far = sponges.find((o) => o.userData.lod === 'far');
      expect(near.geometry.index.count / 3).toBe(quality === 'high' ? 690 : 414);
      expect(far.geometry.index.count / 3).toBe(345);
      expect(near.material).toBe(far.material);
      expect(near.material.map).toBeNull();
      expect(near.material.customProgramCacheKey()).toBe(coral.material.customProgramCacheKey());
      const standard = THREE.ShaderLib.standard;
      const shader = { uniforms: THREE.UniformsUtils.clone(standard.uniforms), vertexShader: standard.vertexShader, fragmentShader: standard.fragmentShader };
      near.material.onBeforeCompile(shader, t.renderer);
      expect(shader.uniforms.reefCoralB.value.z).toBeLessThan(-.5);
      expect(shader.uniforms.reefCoralA.value.w).toBeGreaterThan(100);
      expect(shader.uniforms.reefFluorescent.value).toBe(0);
      for (const mesh of sponges) expect(mesh.isInstancedMesh).toBe(true);
      expect(t.errors).toEqual([]);
    }
  });
});
