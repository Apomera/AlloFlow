import { loadAvianFeatherArt } from './helpers/avian_feather_art_fixture.js';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/birdlab_3d_bird.js', 'utf8');
function fixture() {
  const context = {};
  for (const method of ['save', 'restore', 'translate', 'rotate', 'beginPath', 'closePath', 'clip',
    'fillRect', 'moveTo', 'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'stroke', 'fill']) context[method] = () => {};
  context.createLinearGradient = () => ({ addColorStop() {} });
  const canvas = () => ({ width: 16, height: 16, getContext: () => context });
  const local = { AvianFeatherArt: { ...loadAvianFeatherArt(),
    createFlightFeatherCanvas: canvas,
    createVaneDetailCanvases: () => ({ normal: canvas(), roughness: canvas() }),
  } };
  new Function('window', 'document', source)(local, { createElement: canvas });
  return local.BirdLab3DBird.create(THREE);
}

describe('BirdLab continuous keratin hook', () => {
  it('preserves the facial attachment and keeps the curved hook inside its existing silhouette', () => {
    const bird = fixture();
    try {
      const mesh = bird.root.getObjectByName('curved-keratin-hook'), g = mesh.geometry, p = g.attributes.position;
      expect(p.getX(6)).toBeCloseTo(.024, 8);
      expect(p.getY(0)).toBeCloseTo(-.022, 8);
      expect(p.getY(12)).toBeCloseTo(.010, 8);
      expect(p.getZ(0)).toBeCloseTo(-.057, 8);
      const tipRow = 24 * 25;
      expect((p.getY(tipRow) + p.getY(tipRow + 12)) / 2).toBeCloseTo(-.039, 8);
      expect((p.getZ(tipRow) + p.getZ(tipRow + 12)) / 2).toBeCloseTo(-.106, 8);
      g.computeBoundingBox();
      expect(g.boundingBox.min.x).toBeCloseTo(-.024, 8); expect(g.boundingBox.max.x).toBeCloseTo(.024, 8);
      expect(g.boundingBox.min.y).toBeGreaterThanOrEqual(-.04050001); expect(g.boundingBox.max.y).toBeLessThanOrEqual(.01000001);
      expect(g.boundingBox.min.z).toBeGreaterThanOrEqual(-.10900001); expect(g.boundingBox.max.z).toBeLessThanOrEqual(-.05699999);
      expect(bird.root.getObjectByName('subdued-yellow-cere').position.toArray()).toEqual([0,-.008,-.062]);
      for (const side of [-1,1]) {
        expect(bird.root.getObjectByName(`nostril-${side}`).position.toArray()).toEqual([side * .0203,-.005,-.068]);
        expect(bird.root.getObjectByName(`hawk-eye-${side}`).position.toArray()).toEqual([side * .052,.015,-.039]);
      }
      expect(mesh.material.map.name).toBe('hawk-fine-keratin-growth');
    } finally { bird.dispose(); }
  });

  it('wraps texture coordinates without a shading seam or degenerate faces', () => {
    const bird = fixture();
    try {
      const g = bird.root.getObjectByName('curved-keratin-hook').geometry;
      const { position: p, normal: n, uv } = g.attributes;
      const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), radial = new THREE.Vector3();
      const centers = Array.from({length:25}, (_,row) => new THREE.Vector3().fromBufferAttribute(p,row * 25)
        .add(new THREE.Vector3().fromBufferAttribute(p,row * 25 + 12)).multiplyScalar(.5));
      for (let row = 0; row <= 24; row++) {
        const first = row * 25, last = first + 24;
        expect(a.fromBufferAttribute(p,first).toArray()).toEqual(b.fromBufferAttribute(p,last).toArray());
        expect(a.fromBufferAttribute(n,first).toArray()).toEqual(b.fromBufferAttribute(n,last).toArray());
        expect(uv.getX(first)).toBe(0); expect(uv.getX(last)).toBe(1);
        if (row) expect(uv.getY(first)).toBeGreaterThan(uv.getY(first - 25));
      }
      for (let vertex = 0; vertex < p.count; vertex++) {
        expect(a.fromBufferAttribute(p,vertex).toArray().every(Number.isFinite)).toBe(true);
        expect(a.fromBufferAttribute(n,vertex).length()).toBeCloseTo(1,5);
      }
      for (let index = 0; index < g.index.count; index += 3) {
        a.fromBufferAttribute(p,g.index.getX(index)); b.fromBufferAttribute(p,g.index.getX(index + 1));
        c.fromBufferAttribute(p,g.index.getX(index + 2));
        const normal = b.clone().sub(a).cross(c.clone().sub(a));
        if (normal.lengthSq() < 1e-22) throw new Error('Collapsed keratin surface');
        if (index < 24 * 24 * 6) {
          radial.set(0,0,0);
          for (let corner = 0; corner < 3; corner++) {
            const vertex = g.index.getX(index + corner);
            radial.add(new THREE.Vector3().fromBufferAttribute(p,vertex).sub(centers[Math.floor(vertex / 25)]));
          }
          if (normal.dot(radial) <= 0) throw new Error(`Inverted hook surface at triangle ${index / 3}`);
        } else {
          radial.fromBufferAttribute(p,p.count - 1).sub(centers[24]);
          if (normal.dot(radial) <= 0) throw new Error('Inverted keratin tip');
        }
      }
    } finally { bird.dispose(); }
  });

  it('closes the tip, leaving only the concealed root open, and retains its mesh through movement', () => {
    const bird = fixture();
    try {
      const mesh = bird.root.getObjectByName('curved-keratin-hook'), g = mesh.geometry, p = g.attributes.position;
      const key = vertex => [p.getX(vertex),p.getY(vertex),p.getZ(vertex)].map(v => v.toFixed(9)).join(',');
      const edges = new Map();
      for (let index = 0; index < g.index.count; index += 3) {
        const triangle = [0,1,2].map(offset => g.index.getX(index + offset));
        triangle.forEach((vertex, offset) => {
          const next = triangle[(offset + 1) % 3], edge = [key(vertex),key(next)].sort().join('|');
          const entry = edges.get(edge) || { count:0, vertex, next }; entry.count++; edges.set(edge,entry);
        });
      }
      let rootEdges = 0;
      for (const edge of edges.values()) {
        expect(edge.count).toBeLessThanOrEqual(2);
        if (edge.count === 1) {
          rootEdges++;
          expect(p.getZ(edge.vertex)).toBeCloseTo(-.057,8); expect(p.getZ(edge.next)).toBeCloseTo(-.057,8);
        }
      }
      expect(rootEdges).toBe(24);
      const retained = p.array, values = Array.from(retained);
      for (const pose of [{fold:1,headYaw:.7},{fold:0,headYaw:-.6,bank:.5},{fold:1,headYaw:0}]) bird.update(pose,1/60);
      expect(mesh.geometry).toBe(g); expect(p.array).toBe(retained); expect(Array.from(p.array)).toEqual(values);
    } finally { bird.dispose(); }
  });
});
