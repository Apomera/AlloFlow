import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/avian_woodland_birds.js', 'utf8');
function create(id, quality) {
  const window = {};
  new Function('window', source)(window);
  return window.AvianWoodlandBirds.create(THREE, id, { quality });
}
function parts(geometry) {
  const parent = Array.from({ length: geometry.attributes.position.count }, (_, i) => i);
  const find = i => parent[i] === i ? i : (parent[i] = find(parent[i]));
  const indices = geometry.index.array;
  for (let i = 0; i < indices.length; i += 3) {
    parent[find(indices[i + 1])] = find(indices[i]); parent[find(indices[i + 2])] = find(indices[i]);
  }
  const groups = new Map();
  parent.forEach((_, i) => { const key = find(i); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(i); });
  return [...groups.values()].sort((a, b) => a[0] - b[0]);
}

describe('woodland foot surface detail', () => {
  it.each(['high', 'low'])('separates scuted skin, soft pads and graded horn without splitting the foot mesh (%s)', quality => {
    for (const id of ['mourningDove', 'grouse']) {
      const bird = create(id, quality);
      try {
        for (const foot of bird.feet) {
          expect(foot.children).toHaveLength(1);
          const geometry = foot.children[0].geometry, { featherInfo, color, uv } = geometry.attributes;
          const surfaces = parts(geometry);
          expect(surfaces).toHaveLength(10);
          expect(surfaces.map(vertices => new Set(vertices.map(i => featherInfo.getX(i))))).toEqual(
            [1, 3, 2, 4, 2, 4, 2, 4, 2, 4].map(kind => new Set([kind]))
          );
          for (let vertex = 0; vertex < color.count; vertex++) {
            expect(Number.isFinite(featherInfo.getY(vertex))).toBe(true);
            expect(Math.abs(featherInfo.getY(vertex))).toBeLessThanOrEqual(1);
            for (const channel of [color.getX(vertex), color.getY(vertex), color.getZ(vertex)]) {
              expect(Number.isFinite(channel)).toBe(true); expect(channel).toBeGreaterThan(0); expect(channel).toBeLessThan(1);
            }
          }
          // Claws have a warm horn base and a dark distal tip, rather than a
          // single black painted piece or another glossy skin material.
          for (const claw of [surfaces[3], surfaces[5], surfaces[7], surfaces[9]]) {
            const base = claw.find(vertex => uv.getY(vertex) === 0), tip = claw.find(vertex => uv.getY(vertex) === 1);
            for (const get of ['getX', 'getY', 'getZ']) expect(color[get](base)).toBeGreaterThan(color[get](tip) * 2);
            expect(color.getX(base)).toBeGreaterThan(color.getZ(base));
          }
          expect(surfaces[1].every(vertex => featherInfo.getY(vertex) === 0)).toBe(true);
          for (const skin of [surfaces[0], surfaces[2]]) {
            const facing = skin.map(vertex => featherInfo.getY(vertex));
            expect(Math.max(...facing)).toBeGreaterThan(.8); expect(Math.min(...facing)).toBeLessThan(-.8);
          }
        }
      } finally { bird.dispose(); }
    }
  });

  it.each(['high', 'low'])('flattens the soft pad while enclosing open toe roots and keeping the exact sole plane (%s)', quality => {
    for (const id of ['mourningDove', 'grouse']) {
      const bird = create(id, quality), leg = id === 'grouse' ? .056 : .034, padHeight = id === 'grouse' ? .0026 : .0023;
      try {
        for (const foot of bird.feet) {
          const geometry = foot.children[0].geometry, { position, featherInfo, uv } = geometry.attributes;
          const padVertices = [], roots = [], faces = [];
          for (let vertex = 0; vertex < position.count; vertex++) {
            if (featherInfo.getX(vertex) === 3) padVertices.push(vertex);
            if (featherInfo.getX(vertex) === 2 && uv.getY(vertex) === 0) roots.push(vertex);
          }
          const minY = Math.min(...padVertices.map(vertex => position.getY(vertex)));
          const maxY = Math.max(...padVertices.map(vertex => position.getY(vertex)));
          expect(minY).toBeCloseTo(-leg, 8); expect(maxY).toBeCloseTo(-leg + 2 * padHeight, 8);
          const center = new THREE.Vector3(0, -leg + padHeight, .002), delta = new THREE.Vector3();
          for (let triangle = 0; triangle < geometry.index.count; triangle += 3) {
            const ia = geometry.index.getX(triangle);
            if (featherInfo.getX(ia) !== 3) continue;
            const a = new THREE.Vector3().fromBufferAttribute(position, ia);
            const b = new THREE.Vector3().fromBufferAttribute(position, geometry.index.getX(triangle + 1));
            const c = new THREE.Vector3().fromBufferAttribute(position, geometry.index.getX(triangle + 2));
            const normal = b.sub(a).cross(c.sub(a)).normalize();
            if (normal.dot(delta.subVectors(center, a)) > 0) normal.negate();
            faces.push({ a, normal });
          }
          const point = new THREE.Vector3();
          for (const vertex of roots) {
            point.fromBufferAttribute(position, vertex);
            // Test against the actual triangulated pad, not just an ideal
            // ellipsoid: no uncapped upper toe ring may protrude through it.
            for (const face of faces) expect(face.normal.dot(delta.subVectors(point, face.a))).toBeLessThan(-.00004);
          }
        }
      } finally { bird.dispose(); }
    }
  });

  it.each(['high', 'low'])('keeps foot material isolated and surface buffers stable through articulation (%s)', quality => {
    for (const id of ['mourningDove', 'grouse']) {
      const bird = create(id, quality), meshes = [], resources = new Map();
      bird.root.traverse(object => { if (object.isMesh) meshes.push(object); });
      const footMeshes = bird.feet.map(foot => foot.children[0]), material = footMeshes[0].material;
      for (const mesh of meshes) for (const resource of [mesh.geometry, mesh.material]) {
        if (resources.has(resource)) continue;
        resources.set(resource, 0); resource.addEventListener('dispose', () => resources.set(resource, resources.get(resource) + 1));
      }
      try {
        expect(meshes).toHaveLength(9); expect(new Set(meshes.map(mesh => mesh.material)).size).toBe(3);
        expect(meshes.filter(mesh => mesh.material === material)).toEqual(footMeshes);
        expect(material.roughness).toBeGreaterThan(.7);
        expect(Object.values(material).some(value => value?.isTexture)).toBe(false);
        expect(material.customProgramCacheKey()).not.toBe(bird.body.children[0].material.customProgramCacheKey());
        const retained = footMeshes.map(mesh => ({ color: mesh.geometry.attributes.color.array, surface: mesh.geometry.attributes.featherInfo.array,
          colors: mesh.geometry.attributes.color.array.slice(), surfaces: mesh.geometry.attributes.featherInfo.array.slice() }));
        for (const pose of [{ walking: 1, stride: 1.2 }, { flight: .4, phase: 2.3 }, { flight: 1, phase: 5.1 }, { flight: .4, landing: 1 }, {}]) {
          bird.update(pose);
          footMeshes.forEach((mesh, index) => {
            expect(mesh.geometry.attributes.color.array).toBe(retained[index].color);
            expect(mesh.geometry.attributes.featherInfo.array).toBe(retained[index].surface);
            expect(mesh.geometry.attributes.color.array).toEqual(retained[index].colors);
            expect(mesh.geometry.attributes.featherInfo.array).toEqual(retained[index].surfaces);
          });
        }
        // Exercise the real Three standard-material hook; the browser check
        // separately compiles these sources and assesses the visible contrast.
        const shader = { vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader, uniforms: {} };
        material.onBeforeCompile(shader);
        expect(shader.vertexShader).toContain('awFootSurface = featherInfo');
        expect(shader.fragmentShader).toContain('fwidth(');
        expect(shader.fragmentShader).toContain('awFootRelief');
        expect(shader.fragmentShader).toContain('roughnessFactor = mix(');
      } finally { bird.dispose(); bird.dispose(); }
      expect([...resources.values()].every(count => count === 1)).toBe(true);
    }
  });
});
