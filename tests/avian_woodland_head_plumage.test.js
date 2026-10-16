import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const local = {};
Function('window', readFileSync('stem_lab/avian_woodland_birds.js', 'utf8'))(local);
const cases = [['mourningDove', 'high'], ['mourningDove', 'low'], ['grouse', 'high'], ['grouse', 'low']];

function feathers(geometry) {
  const { position, uv, featherInfo } = geometry.attributes, groups = new Map();
  for (let vertex = 0; vertex < position.count; vertex++) {
    const seed = featherInfo.getY(vertex);
    if (featherInfo.getX(vertex) !== 2) continue;
    if (!groups.has(seed)) groups.set(seed, []);
    groups.get(seed).push({ index: vertex, point: new THREE.Vector3().fromBufferAttribute(position, vertex), u: uv.getX(vertex), v: uv.getY(vertex) });
  }
  return groups;
}

describe('shared woodland head feather tracts', () => {
  it.each(cases)('keeps %s (%s) head feathers finite, static and close to the skull', (id, quality) => {
    const bird = local.AvianWoodlandBirds.create(THREE, id, { quality });
    try {
      const head = bird.root.getObjectByName('woodland-head-plumage'), geometry = head.geometry;
      const { position, normal } = geometry.attributes, groups = feathers(geometry);
      const radius = id === 'grouse' ? [.030, .037, .038] : [.021, .025, .027];
      const contour = [...groups].filter(([seed]) => seed > -1000);
      expect(contour.length).toBe(quality === 'high' ? 240 : 84);
      for (const [, vertices] of contour) for (const { point, index } of vertices) {
        expect(Number.isFinite(point.x + point.y + point.z)).toBe(true);
        // Feather lift stays below a millimeter, including the tapered nape.
        expect(Math.abs(point.x)).toBeLessThan(radius[0] + .0004);
        expect(Math.abs(point.y)).toBeLessThan(radius[1] + .0004);
        expect(Math.abs(point.z)).toBeLessThan(radius[2] * 1.11);
        expect(Math.abs(Math.hypot(normal.getX(index), normal.getY(index), normal.getZ(index)) - 1)).toBeLessThan(2e-5);
      }
      const initial = position.array.slice(), retained = Object.values(geometry.attributes).map(attribute => [attribute, attribute.array]);
      for (const pose of [{ peck: 1 }, { lookYaw: .5, lookPitch: -.2 }, { flight: .45, landing: 1 }, { flight: 1, phase: 2.4, effort: .9 }]) bird.update(pose);
      expect(position.array).toEqual(initial);
      for (const [attribute, array] of retained) expect(attribute.array).toBe(array);
      let meshCount = 0; const materials = new Set();
      bird.root.traverse(object => { if (object.isMesh) { meshCount++; materials.add(object.material); } });
      expect(meshCount).toBe(9); expect(materials.size).toBe(3);
    } finally { bird.dispose(); }
  });

  it.each(['high', 'low'])('seats curved grouse tufts behind the eyes and retains nondegenerate rounded tips (%s)', quality => {
    const bird = local.AvianWoodlandBirds.create(THREE, 'grouse', { quality });
    try {
      const geometry = bird.root.getObjectByName('woodland-head-plumage').geometry;
      const { position, normal, featherInfo } = geometry.attributes;
      const groups = feathers(geometry), tufts = [...groups].filter(([seed]) => seed <= -1000);
      expect(tufts.length).toBe(quality === 'high' ? 32 : 22);
      for (const [seed, vertices] of tufts) {
        const roots = vertices.filter(vertex => vertex.v === 0), tips = vertices.filter(vertex => vertex.v === 1);
        const center = selected => selected.reduce((sum, vertex) => sum.add(vertex.point), new THREE.Vector3()).divideScalar(selected.length);
        const root = center(roots), tip = center(tips), shaft = tip.clone().sub(root).normalize();
        // All bases are buried in the head, so neither neck nor crown can
        // acquire a detached floating feather when the head turns or pecks.
        expect((root.x / .030) ** 2 + (root.y / .037) ** 2 + (root.z / .038) ** 2).toBeLessThan(.95);
        let maximumCamber = 0, maximumWidth = 0;
        for (const vertex of vertices) {
          const fromRoot = vertex.point.clone().sub(root);
          const distance = fromRoot.clone().addScaledVector(shaft, -fromRoot.dot(shaft)).length();
          maximumWidth = Math.max(maximumWidth, distance);
          if (vertex.u === .5) maximumCamber = Math.max(maximumCamber, distance);
          expect(vertex.point.z).toBeLessThan(-.002);
          expect(vertex.point.y).toBeLessThan(.046);
          expect(Math.abs(vertex.point.x)).toBeLessThan(.039);
          expect(Math.abs(Math.hypot(normal.getX(vertex.index), normal.getY(vertex.index), normal.getZ(vertex.index)) - 1)).toBeLessThan(2e-5);
        }
        expect(maximumCamber).toBeGreaterThan(.0007);
        expect(maximumWidth).toBeGreaterThan(.0028);
        expect(tips[0].point.distanceTo(tips[tips.length - 1].point)).toBeGreaterThan(.0023);
        if (seed <= -1100) {
          // Resting neck fans are broad in side view, not horizontal wires.
          const sideHeight = Math.max(...vertices.map(vertex => vertex.point.y)) - Math.min(...vertices.map(vertex => vertex.point.y));
          expect(sideHeight).toBeGreaterThan(.012);
        }
      }
      const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
      const index = geometry.index;
      let minimumArea = Infinity;
      for (let triangle = 0; triangle < index.count; triangle += 3) {
        if (featherInfo.getY(index.getX(triangle)) > -1000) continue;
        a.fromBufferAttribute(position, index.getX(triangle));
        b.fromBufferAttribute(position, index.getX(triangle + 1));
        c.fromBufferAttribute(position, index.getX(triangle + 2));
        minimumArea = Math.min(minimumArea, b.sub(a).cross(c.sub(a)).length() * .5);
      }
      expect(minimumArea).toBeGreaterThan(5e-8);
    } finally { bird.dispose(); }
  });
});
