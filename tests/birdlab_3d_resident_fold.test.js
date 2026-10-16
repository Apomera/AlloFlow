import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/birdlab_3d_wildlife.js', 'utf8');
const tracts = ['layered-secondaries', 'layered-primaries'];
function fixture(quality) {
  const window = {}, scene = new THREE.Scene();
  new Function('window', source)(window);
  return { scene, wildlife: window.BirdLab3DWildlife.create(THREE, scene, { quality }) };
}
function distance(array, a, b) {
  return Math.hypot(array[a * 3] - array[b * 3], array[a * 3 + 1] - array[b * 3 + 1], array[a * 3 + 2] - array[b * 3 + 2]);
}

describe('BirdLab resident wing nesting', () => {
  it.each(['high', 'low'])('folds whole feathers rigidly inside retained bounds without allocating replacement buffers (%s)', quality => {
    const { scene, wildlife } = fixture(quality);
    const verticesPerFeather = (quality === 'high' ? 8 : 5) * 5;
    const meshes = [];
    try {
      for (const [id, phase] of [['robin', 0], ['chickadee', 7.3]]) {
        wildlife.update(14.3 - phase);
        for (const side of [-1, 1]) for (const tract of tracts) {
          const mesh = scene.getObjectByName(id + '-wing-' + side).getObjectByName(tract);
          meshes.push({ id, phase, mesh, position: mesh.geometry.attributes.position,
            normal: mesh.geometry.attributes.normal, open: mesh.geometry.attributes.position.array.slice(),
            openNormals: mesh.geometry.attributes.normal.array.slice() });
        }
      }
      let largestDistanceError = 0, largestNormalError = 0, largestNormalAlignmentError = 0, largestBoundExcess = -Infinity;
      for (const { phase, mesh, position, normal, open, openNormals } of meshes) {
        for (const time of [0, 13.58, 13.65, 13.72, 13.81, 14.3, 14.77, 14.86, 14.98, 15.08, 15.2]) {
          wildlife.update(time - phase);
          expect(mesh.geometry.attributes.position).toBe(position);
          expect(mesh.geometry.attributes.normal).toBe(normal);
          const current = position.array, sphere = mesh.geometry.boundingSphere;
          for (let first = 0; first < position.count; first += verticesPerFeather) {
            // Three non-collinear anchors detect both longitudinal stretching
            // and vane distortion, including intermediate deployment poses.
            for (const anchor of [first, first + 4, first + verticesPerFeather - 3]) {
              for (let vertex = first; vertex < first + verticesPerFeather; vertex++) {
                largestDistanceError = Math.max(largestDistanceError, Math.abs(distance(current, vertex, anchor) - distance(open, vertex, anchor)));
              }
            }
          }
          for (let vertex = 0; vertex < position.count; vertex++) {
            largestNormalError = Math.max(largestNormalError, Math.abs(Math.hypot(normal.getX(vertex), normal.getY(vertex), normal.getZ(vertex)) - 1));
            const first = Math.floor(vertex / verticesPerFeather) * verticesPerFeather, offset = vertex * 3, anchor = first * 3;
            const currentDot = normal.getX(vertex) * (current[offset] - current[anchor]) +
              normal.getY(vertex) * (current[offset + 1] - current[anchor + 1]) + normal.getZ(vertex) * (current[offset + 2] - current[anchor + 2]);
            const openDot = openNormals[offset] * (open[offset] - open[anchor]) +
              openNormals[offset + 1] * (open[offset + 1] - open[anchor + 1]) + openNormals[offset + 2] * (open[offset + 2] - open[anchor + 2]);
            largestNormalAlignmentError = Math.max(largestNormalAlignmentError, Math.abs(currentDot - openDot));
            largestBoundExcess = Math.max(largestBoundExcess,
              Math.hypot(position.getX(vertex) - sphere.center.x, position.getY(vertex) - sphere.center.y, position.getZ(vertex) - sphere.center.z) - sphere.radius);
          }
        }
      }
      expect(largestDistanceError).toBeLessThan(2e-8);
      expect(largestNormalError).toBeLessThan(2e-7);
      expect(largestNormalAlignmentError).toBeLessThan(2e-8);
      expect(largestBoundExcess).toBeLessThan(0);
    } finally { wildlife.dispose(); }
  });

  it.each(['high', 'low'])('restores full extension exactly and repeats a partial fold after arbitrary seeks (%s)', quality => {
    const { scene, wildlife } = fixture(quality);
    try {
      for (const [id, phase] of [['robin', 0], ['chickadee', 7.3]]) for (const side of [-1, 1]) for (const tract of tracts) {
        const geometry = scene.getObjectByName(id + '-wing-' + side).getObjectByName(tract).geometry;
        wildlife.update(14.3 - phase);
        const open = geometry.attributes.position.array.slice(), openNormals = geometry.attributes.normal.array.slice();
        wildlife.update(13.72 - phase);
        const partiallyFolded = geometry.attributes.position.array.slice();
        expect(partiallyFolded).not.toEqual(open);
        wildlife.update(35 - phase); wildlife.update(13.72 - phase);
        expect(geometry.attributes.position.array).toEqual(partiallyFolded);
        wildlife.update(15.2 - phase); wildlife.update(14.3 - phase);
        expect(geometry.attributes.position.array).toEqual(open);
        expect(geometry.attributes.normal.array).toEqual(openNormals);
      }
    } finally { wildlife.dispose(); }
  });

  it.each(['high', 'low'])('keeps the two wings mirrored and nests the upper covert surface outward at rest (%s)', quality => {
    const { scene, wildlife } = fixture(quality), inverse = new THREE.Matrix4();
    const leftMatrix = new THREE.Matrix4(), rightMatrix = new THREE.Matrix4();
    const left = new THREE.Vector3(), right = new THREE.Vector3(), upper = new THREE.Vector3();
    try {
      let mirrorError = 0;
      for (const [id, phase] of [['robin', 0], ['chickadee', 7.3]]) for (const time of [0, 13.64, 13.75, 14.3, 14.93, 15.2]) {
        wildlife.update(time - phase); scene.updateMatrixWorld(true);
        inverse.copy(scene.getObjectByName(id + '-body').matrixWorld).invert();
        for (const tract of tracts) {
          const a = scene.getObjectByName(id + '-wing--1').getObjectByName(tract);
          const b = scene.getObjectByName(id + '-wing-1').getObjectByName(tract);
          leftMatrix.copy(inverse).multiply(a.matrixWorld); rightMatrix.copy(inverse).multiply(b.matrixWorld);
          const bounds = new THREE.Box3();
          for (let vertex = 0; vertex < a.geometry.attributes.position.count; vertex++) {
            left.fromBufferAttribute(a.geometry.attributes.position, vertex).applyMatrix4(leftMatrix);
            right.fromBufferAttribute(b.geometry.attributes.position, vertex).applyMatrix4(rightMatrix);
            mirrorError = Math.max(mirrorError, Math.abs(left.x + right.x), Math.abs(left.y - right.y), Math.abs(left.z - right.z));
            bounds.expandByPoint(right);
          }
          if (time === 0 || time === 15.2) {
            // +Y is the physical upper surface carrying the coverts; winding
            // normals can point the other way on this double-sided material.
            upper.set(0, 1, 0).transformDirection(rightMatrix);
            expect(upper.x).toBeGreaterThan(.97);
            expect(bounds.max.y - bounds.min.y).toBeLessThan(tract === 'layered-secondaries' ? .043 : .026);
            // The hand tapers inward over the narrowing rump; the forewing
            // remains beside the fuller torso. Neither crosses the centerline.
            expect(bounds.min.x).toBeGreaterThan(tract === 'layered-secondaries' ? .022 : .013);
            expect(bounds.max.x).toBeLessThan(.040);
            expect(bounds.max.z).toBeLessThan(.106);
          }
        }
      }
      expect(mirrorError).toBeLessThan(1e-12);
    } finally { wildlife.dispose(); }
  });
});
