import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { beforeAll, describe, expect, it, vi } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
let shadeRock, deformRock;

beforeAll(() => {
  const source = readFileSync('stem_lab/stem_tool_solarsystem.js', 'utf8');
  const helpers = ['__alloSmoothRockNormals', '__alloRockDeform', 'solarShadeDroneRock'].map(name => {
    const start = source.indexOf('function ' + name + '('), end = source.indexOf('\n}', start);
    if (start < 0 || end < start) throw new Error('Missing complete helper: ' + name);
    return source.slice(start, end + 2);
  });
  ({ shadeRock, deformRock } = new Function(helpers.join('\n') +
    '\nreturn {shadeRock:solarShadeDroneRock,deformRock:__alloRockDeform};')());
});

function rock(radius = 2, detail = 1, seed = 17) {
  const geometry = deformRock(new THREE.DodecahedronGeometry(radius, detail), seed, 0.7);
  return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true }));
}
function release(mesh) { mesh.geometry.dispose(); mesh.material.dispose(); }
const at = (attribute, index) => new THREE.Vector3().fromBufferAttribute(attribute, index);
const shades = mesh => Array.from(mesh.geometry.attributes.color.array).filter((value, index) => index % 3 === 0);
const pointKey = vector => vector.toArray().map(value => Math.round(value * 100000)).join(',');

describe('drone rock shading adds material depth without changing the physical surface', () => {
  it('samples the rotated, translated footprint and darkens contact vertices on a slope', () => {
    const mesh = rock(3, 2, 42);
    const slope = (x, z) => 2 + x * 0.35 - z * 0.2;
    mesh.position.set(12, slope(12, -7) + 0.3, -7);
    mesh.rotation.set(0.65, 1.2, -0.2);
    const transform = new THREE.Matrix4().compose(mesh.position, mesh.quaternion, mesh.scale);
    const position = mesh.geometry.attributes.position, radius = mesh.geometry.boundingSphere.radius;
    const samples = [], expectedWorld = [];
    for (let index = 0; index < position.count; index++) expectedWorld.push(at(position, index).applyMatrix4(transform));
    try {
      expect(shadeRock(THREE, mesh, (x, z) => { samples.push([x, z]); return slope(x, z); })).toBe(mesh);
      const contactColors = shades(mesh);
      expect(samples).toHaveLength(position.count);
      samples.forEach(([x, z], index) => {
        expect(x).toBeCloseTo(expectedWorld[index].x, 11);
        expect(z).toBeCloseTo(expectedWorld[index].z, 11);
      });
      // A distant surface removes contact darkening while retaining the actual
      // helper's mottling, so the comparison does not reimplement its formula.
      shadeRock(THREE, mesh, (x, z) => slope(x, z) - 100);
      const exposedColors = shades(mesh), categories = { buried: 0, transition: 0, clear: 0 };
      expectedWorld.forEach((point, index) => {
        const clearance = point.y - slope(point.x, point.z), ratio = contactColors[index] / exposedColors[index];
        if (clearance <= 0) { categories.buried++; expect(ratio).toBeCloseTo(0.72, 6); }
        else if (clearance >= radius * 0.32) { categories.clear++; expect(ratio).toBeCloseTo(1, 6); }
        else { categories.transition++; expect(ratio).toBeGreaterThan(0.72 - 1e-6); expect(ratio).toBeLessThan(1 + 1e-6); }
      });
      expect(categories.buried).toBeGreaterThan(0); expect(categories.transition).toBeGreaterThan(0); expect(categories.clear).toBeGreaterThan(0);
      expect(Math.max(...exposedColors) - Math.min(...exposedColors), 'exposed faces retain nonuniform reflectance').toBeGreaterThan(0.02);
    } finally { release(mesh); }
  });

  it('preserves attributes, bounds, transforms and material resources while adding only colors', () => {
    const mesh = rock(1.7, 1, 8), geometry = mesh.geometry;
    const map = new THREE.Texture(); mesh.material.map = map;
    mesh.position.set(-4, 2.5, 9); mesh.rotation.set(0.4, -1.1, 0.2); mesh.updateMatrix();
    geometry.computeBoundingBox();
    const attributes = Object.fromEntries(Object.entries(geometry.attributes).map(([name, attribute]) =>
      [name, { attribute, values: Array.from(attribute.array), version: attribute.version }]));
    const before = {
      index: geometry.index, box: geometry.boundingBox, sphere: geometry.boundingSphere,
      min: geometry.boundingBox.min.toArray(), max: geometry.boundingBox.max.toArray(),
      center: geometry.boundingSphere.center.toArray(), radius: geometry.boundingSphere.radius,
      position: mesh.position.toArray(), quaternion: mesh.quaternion.toArray(), scale: mesh.scale.toArray(),
      matrix: mesh.matrix.toArray(), material: mesh.material, color: mesh.material.color.toArray(),
      roughness: mesh.material.roughness, metalness: mesh.material.metalness,
      materialVersion: mesh.material.version, mapVersion: map.version
    };
    const disposed = [];
    for (const resource of [geometry, mesh.material, map]) resource.addEventListener('dispose', () => disposed.push(resource));
    try {
      shadeRock(THREE, mesh, (x, z) => 0.1 * x - 0.2 * z);
      expect(Object.keys(geometry.attributes).sort()).toEqual([...Object.keys(attributes), 'color'].sort());
      for (const [name, saved] of Object.entries(attributes)) {
        expect(geometry.attributes[name]).toBe(saved.attribute);
        expect(Array.from(geometry.attributes[name].array)).toEqual(saved.values);
        expect(geometry.attributes[name].version).toBe(saved.version);
      }
      expect(geometry.index).toBe(before.index); expect(geometry.boundingBox).toBe(before.box); expect(geometry.boundingSphere).toBe(before.sphere);
      expect(geometry.boundingBox.min.toArray()).toEqual(before.min); expect(geometry.boundingBox.max.toArray()).toEqual(before.max);
      expect(geometry.boundingSphere.center.toArray()).toEqual(before.center); expect(geometry.boundingSphere.radius).toBe(before.radius);
      expect(mesh.position.toArray()).toEqual(before.position); expect(mesh.quaternion.toArray()).toEqual(before.quaternion);
      expect(mesh.scale.toArray()).toEqual(before.scale); expect(mesh.matrix.toArray()).toEqual(before.matrix);
      expect(mesh.material).toBe(before.material); expect(mesh.material.color.toArray()).toEqual(before.color);
      expect(mesh.material.roughness).toBe(before.roughness); expect(mesh.material.metalness).toBe(before.metalness);
      expect(mesh.material.map).toBe(map); expect(mesh.material.version).toBe(before.materialVersion); expect(map.version).toBe(before.mapVersion);
      expect(disposed).toEqual([]);
    } finally { release(mesh); map.dispose(); }
  });

  it('is deterministic and consumes no random values, including through THREE allocations', () => {
    // Fixtures are allocated before the guard: THREE object UUIDs legitimately
    // consume randomness, but the shading pass must not shift later scenery.
    const mesh = rock(2.3, 2, 57);
    mesh.position.set(5, 0.3, -9); mesh.rotation.set(0.6, 1.7, 0.1);
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Rock shading consumed scenery randomness'); });
    try {
      shadeRock(THREE, mesh, (x, z) => 0.12 * x + 0.08 * z);
      const first = Array.from(mesh.geometry.attributes.color.array);
      shadeRock(THREE, mesh, (x, z) => 0.12 * x + 0.08 * z);
      expect(Array.from(mesh.geometry.attributes.color.array)).toEqual(first);
      expect(random).not.toHaveBeenCalled();
    } finally { random.mockRestore(); release(mesh); }
  });

  it('keeps contact falloff and mottling consistent across geometric rock sizes', () => {
    const meshes = [0.25, 1, 4.5].map(size => {
      const mesh = rock(size, 2, 21);
      mesh.position.set(size * 3, size * 0.6, -size * 2);
      mesh.rotation.set(0.4, -0.8, 0.15);
      shadeRock(THREE, mesh, (x, z) => 0.15 * x - 0.1 * z - size * 0.2);
      return mesh;
    });
    try {
      const reference = shades(meshes[1]);
      for (const mesh of [meshes[0], meshes[2]]) {
        const colors = shades(mesh);
        expect(colors).toHaveLength(reference.length);
        let largestError = 0;
        colors.forEach((color, index) => { largestError = Math.max(largestError, Math.abs(color - reference[index])); });
        expect(largestError).toBeLessThan(2e-6);
      }
    } finally { meshes.forEach(release); }
  });

  it('fades monotonically from embedded to exposed without changing the rock position', () => {
    const mesh = rock(2, 1, 11);
    mesh.position.set(0, 0.2, 0); mesh.rotation.set(0.3, 0.7, 0);
    const radius = mesh.geometry.boundingSphere.radius, originalPosition = mesh.position.toArray();
    try {
      const sweeps = [-2, -0.5, 0, 0.5, 2].map(offset => {
        shadeRock(THREE, mesh, () => offset * radius);
        return shades(mesh);
      });
      for (let index = 0; index < sweeps[0].length; index++) {
        for (let step = 1; step < sweeps.length; step++) expect(sweeps[step][index]).toBeLessThanOrEqual(sweeps[step - 1][index] + 1e-7);
        expect(sweeps.at(-1)[index] / sweeps[0][index]).toBeCloseTo(0.72, 6);
      }
      expect(mesh.position.toArray()).toEqual(originalPosition);
    } finally { release(mesh); }
  });

  it.each([[0.3, 1, 7.25], [1.7, 1, 42], [1.5, 2, 11], [4.5, 2, 93]])(
    'keeps the actual radius %s detail %s seed %s hull closed, bounded and seam-free', (radius, detail, seed) => {
      const mesh = rock(radius, detail, seed), geometry = mesh.geometry;
      mesh.position.set(2, radius * 0.25, -3); mesh.rotation.set(0.3, 1.1, 0);
      try {
        shadeRock(THREE, mesh, (x, z) => (x - 2) * 0.2 + (z + 3) * 0.1);
        const { position, normal, uv, color } = geometry.attributes;
        expect(position.count / 3).toBe(detail === 1 ? 144 : 324);
        expect(geometry.index).toBeNull(); expect(color.itemSize).toBe(3); expect(color.count).toBe(position.count);
        expect(geometry.userData.rockSmoothNormals).toBe(true);
        const groups = new Map(), edges = new Map();
        let minimumArea = Infinity;
        for (let index = 0; index < position.count; index++) {
          const point = at(position, index), n = at(normal, index), c = at(color, index);
          expect([...point.toArray(), ...n.toArray(), ...c.toArray()].every(Number.isFinite)).toBe(true);
          expect(point.length()).toBeGreaterThan(radius * 0.4); expect(point.length()).toBeLessThan(radius * 1.38);
          expect(n.length()).toBeCloseTo(1, 5); expect(n.dot(point)).toBeGreaterThan(0);
          expect(c.x).toBeGreaterThanOrEqual(0.6336 - 1e-6); expect(c.x).toBeLessThanOrEqual(1);
          expect(c.y).toBe(c.x); expect(c.z).toBe(c.x);
          const key = pointKey(point);
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(index);
        }
        for (let index = 0; index < position.count; index += 3) {
          const vertices = [0, 1, 2].map(offset => at(position, index + offset));
          minimumArea = Math.min(minimumArea, vertices[1].clone().sub(vertices[0]).cross(vertices[2].clone().sub(vertices[0])).lengthSq());
          for (let edge = 0; edge < 3; edge++) {
            const key = [pointKey(vertices[edge]), pointKey(vertices[(edge + 1) % 3])].sort().join('|');
            edges.set(key, (edges.get(key) || 0) + 1);
          }
        }
        expect(minimumArea).toBeGreaterThan(1e-14);
        expect([...edges.values()].every(count => count === 2), 'every welded hull edge belongs to exactly two faces').toBe(true);
        const seams = [...groups.values()].filter(group => group.length > 1);
        expect(seams.length).toBeGreaterThan(10);
        expect(seams.some(group => new Set(group.map(index => uv.getX(index) + ',' + uv.getY(index))).size > 1)).toBe(true);
        for (const group of seams) for (const index of group.slice(1)) {
          expect(at(color, index).distanceTo(at(color, group[0]))).toBeLessThan(2e-6);
          expect(at(normal, index).distanceTo(at(normal, group[0]))).toBeLessThan(1e-6);
        }
        expect(Number.isFinite(geometry.boundingSphere.radius)).toBe(true);
        expect(geometry.boundingSphere.radius).toBeLessThan(radius * 1.7);
      } finally { release(mesh); }
    });
});
