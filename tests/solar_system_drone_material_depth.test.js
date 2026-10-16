import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { beforeAll, describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
let smooth, deform, deformWithoutSmoothing;

beforeAll(() => {
  const source = readFileSync('stem_lab/stem_tool_solarsystem.js', 'utf8');
  // Both helpers are standalone top-level functions. Execute their real source
  // without loading the full React tool or creating a renderer/WebGL context.
  function helper(name) {
    const start = source.indexOf('function ' + name + '(');
    if (start < 0) throw new Error('Missing rock helper: ' + name);
    const end = source.indexOf('\n}', start);
    if (end < start) throw new Error('Missing top-level close: ' + name);
    return source.slice(start, end + 2);
  }
  const smoothing = helper('__alloSmoothRockNormals'), deformation = helper('__alloRockDeform');
  ({ smooth, deform } = new Function('THREE', smoothing + '\n' + deformation +
    '\nreturn {smooth:__alloSmoothRockNormals,deform:__alloRockDeform};')(THREE));
  // Keep the shipped deformation unchanged; replace only its shading dependency
  // to obtain the pre-smoothing geometry and collision reference.
  deformWithoutSmoothing = new Function('THREE', '__alloSmoothRockNormals', deformation + '\nreturn __alloRockDeform;')(THREE, geometry => geometry);
});

const vectorAt = (attribute, index) => new THREE.Vector3().fromBufferAttribute(attribute, index);
function coincidentGroups(geometry) {
  const groups = new Map(), positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    // Exact duplicate coordinates must share shading even when their UVs differ.
    const key = [positions.getX(i), positions.getY(i), positions.getZ(i)].join(',');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(i);
  }
  return [...groups.values()];
}
function expectCoincidentNormals(geometry) {
  const shared = coincidentGroups(geometry).filter(group => group.length > 1);
  expect(shared.length, 'the fixture must contain duplicated triangle corners').toBeGreaterThan(10);
  for (const group of shared) {
    const reference = vectorAt(geometry.attributes.normal, group[0]);
    for (const index of group.slice(1)) expect(vectorAt(geometry.attributes.normal, index).distanceTo(reference)).toBeLessThan(1e-6);
  }
}
function bounds(geometry) {
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return { min: geometry.boundingBox.min.toArray(), max: geometry.boundingBox.max.toArray(),
    center: geometry.boundingSphere.center.toArray(), radius: geometry.boundingSphere.radius };
}

describe('rock material depth smooths light without changing the physical surface', () => {
  it.each([
    [0.15, 1, 0.72, 1],
    [1, 7.25, 0.55, 1],
    [3.6, 42.5, 1, 1],
    [0.9, 55, 0.82, 2],
  ])('keeps coherent normals at radius %s, seed %s, squash %s, detail %s', (radius, seed, squash, detail) => {
    const geometry = new THREE.DodecahedronGeometry(radius, detail);
    deform(geometry, seed, squash);
    expect(geometry.userData.rockSmoothNormals).toBe(true);
    expectCoincidentNormals(geometry);
    const normals = geometry.attributes.normal, positions = geometry.attributes.position;
    for (let i = 0; i < normals.count; i++) {
      const normal = vectorAt(normals, i), position = vectorAt(positions, i);
      expect(normal.toArray().every(Number.isFinite)).toBe(true);
      expect(normal.length()).toBeCloseTo(1, 5);
      expect(normal.dot(position), 'normals must face out of the closed rock').toBeGreaterThan(0);
    }
    geometry.dispose();
  });

  it('preserves every position/UV value, non-indexed topology and collision bounds', () => {
    const geometry = new THREE.DodecahedronGeometry(1.8, 1);
    deformWithoutSmoothing(geometry, 13.4, 0.61);
    const positions = geometry.attributes.position, uvs = geometry.attributes.uv, index = geometry.index;
    const savedPositions = Array.from(positions.array), savedUVs = Array.from(uvs.array), originalBounds = bounds(geometry);
    const groupCounts = coincidentGroups(geometry).map(group => group.length);
    smooth(geometry);
    expect(geometry.attributes.position).toBe(positions); expect(geometry.attributes.uv).toBe(uvs);
    expect(geometry.index).toBe(index); expect(index).toBeNull();
    expect(Array.from(positions.array)).toEqual(savedPositions); expect(Array.from(uvs.array)).toEqual(savedUVs);
    expect(coincidentGroups(geometry).map(group => group.length)).toEqual(groupCounts);
    expect(bounds(geometry)).toEqual(originalBounds);
    geometry.dispose();
  });

  it('retains duplicated UV-seam vertices while giving each seam one continuous normal', () => {
    const geometry = new THREE.DodecahedronGeometry(2, 1);
    deformWithoutSmoothing(geometry, 8, 0.72);
    const uvs = geometry.attributes.uv;
    const seamGroups = coincidentGroups(geometry).filter(group =>
      new Set(group.map(i => uvs.getX(i) + ',' + uvs.getY(i))).size > 1);
    expect(seamGroups.length, 'pinned polyhedron geometry must expose real UV seams').toBeGreaterThan(0);
    const before = seamGroups.map(group => group.map(i => [i, uvs.getX(i), uvs.getY(i)]));
    const count = geometry.attributes.position.count;
    smooth(geometry);
    expect(geometry.attributes.position.count).toBe(count);
    expect(seamGroups.map(group => group.map(i => [i, uvs.getX(i), uvs.getY(i)]))).toEqual(before);
    for (const group of seamGroups) {
      const first = vectorAt(geometry.attributes.normal, group[0]);
      for (const i of group.slice(1)) expect(vectorAt(geometry.attributes.normal, i).distanceTo(first)).toBeLessThan(1e-6);
    }
    geometry.dispose();
  });

  it('does not reinterpret indexed geometry as consecutive triangle corners', () => {
    const geometry = new THREE.BoxGeometry(2, 3, 4);
    const index = geometry.index, savedIndices = Array.from(index.array);
    const positions = Array.from(geometry.attributes.position.array), normals = Array.from(geometry.attributes.normal.array);
    const uvs = Array.from(geometry.attributes.uv.array);
    smooth(geometry);
    expect(geometry.index).toBe(index); expect(Array.from(index.array)).toEqual(savedIndices);
    expect(Array.from(geometry.attributes.position.array)).toEqual(positions);
    expect(Array.from(geometry.attributes.normal.array)).toEqual(normals);
    expect(Array.from(geometry.attributes.uv.array)).toEqual(uvs);
    expect(geometry.userData.rockSmoothNormals).not.toBe(true);
    geometry.dispose();
  });

  it('weights shared face contributions by triangle area instead of averaging unit normals', () => {
    const geometry = new THREE.BufferGeometry();
    // Shared origin: first face has twice-area 4 along +Z, second 1 along +X.
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([
      0, 0, 0, 4, 0, 0, 0, 1, 0,
      0, 0, 0, 0, 1, 0, 0, 0, 1,
    ], 3));
    geometry.computeVertexNormals();
    smooth(geometry);
    const expected = new THREE.Vector3(1, 0, 4).normalize();
    for (const i of [0, 3]) expect(vectorAt(geometry.attributes.normal, i).distanceTo(expected)).toBeLessThan(1e-6);
    // The unshared corners keep their own face directions.
    expect(vectorAt(geometry.attributes.normal, 1).distanceTo(new THREE.Vector3(0, 0, 1))).toBeLessThan(1e-6);
    expect(vectorAt(geometry.attributes.normal, 5).distanceTo(new THREE.Vector3(1, 0, 0))).toBeLessThan(1e-6);
    geometry.dispose();
  });

  it('keeps zero-area triangles finite without corrupting neighboring valid normals', () => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([
      0, 0, 0, 1, 0, 0, 0, 1, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0,
      5, 5, 5, 5, 5, 5, 5, 5, 5,
    ], 3));
    geometry.computeVertexNormals();
    const before = Array.from(geometry.attributes.position.array);
    smooth(geometry);
    expect(Array.from(geometry.attributes.normal.array).every(Number.isFinite)).toBe(true);
    expect(Array.from(geometry.attributes.position.array)).toEqual(before);
    for (const i of [0, 1, 2, 3, 4, 5]) expect(vectorAt(geometry.attributes.normal, i).distanceTo(new THREE.Vector3(0, 0, 1))).toBeLessThan(1e-6);
    geometry.dispose();
  });

  it('leaves detail-zero rocks faceted and unmarked', () => {
    const geometry = new THREE.DodecahedronGeometry(1, 0);
    deform(geometry, 7.25, 0.72);
    expect(geometry.userData.rockSmoothNormals).not.toBe(true);
    const normals = geometry.attributes.normal;
    for (let i = 0; i < normals.count; i += 3) {
      expect(vectorAt(normals, i).distanceTo(vectorAt(normals, i + 1))).toBeLessThan(1e-6);
      expect(vectorAt(normals, i).distanceTo(vectorAt(normals, i + 2))).toBeLessThan(1e-6);
    }
    const seamsWithDifferentNormals = coincidentGroups(geometry).filter(group =>
      group.some(i => vectorAt(normals, i).distanceTo(vectorAt(normals, group[0])) > 0.1));
    expect(seamsWithDifferentNormals.length, 'coarse rocks must retain distinct face lighting').toBeGreaterThan(0);
    geometry.dispose();
  });

  it('keeps raycast collision points identical to the unchanged deformed triangles', () => {
    const original = new THREE.DodecahedronGeometry(1.7, 1), shaded = new THREE.DodecahedronGeometry(1.7, 1);
    deformWithoutSmoothing(original, 16.8, 0.64); deform(shaded, 16.8, 0.64);
    const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    const before = new THREE.Mesh(original, material), after = new THREE.Mesh(shaded, material);
    before.updateMatrixWorld(true); after.updateMatrixWorld(true);
    for (const v of [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 2, -3]]) {
      const direction = new THREE.Vector3(...v).normalize();
      const ray = new THREE.Raycaster(direction.clone().multiplyScalar(10), direction.clone().negate());
      const first = ray.intersectObject(before), second = ray.intersectObject(after);
      expect(first.length, 'collision fixture must hit the rock').toBeGreaterThan(0);
      expect(second.length).toBe(first.length);
      first.forEach((hit, i) => {
        expect(second[i].distance).toBe(hit.distance);
        expect(second[i].point.toArray()).toEqual(hit.point.toArray());
        expect(second[i].faceIndex).toBe(hit.faceIndex);
      });
    }
    expect(bounds(shaded)).toEqual(bounds(original));
    original.dispose(); shaded.dispose(); material.dispose();
  });
});
