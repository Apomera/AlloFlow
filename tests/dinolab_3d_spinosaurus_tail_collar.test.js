import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { THREE, vec, nativeTailHarness } from './helpers/dino_native_tail_harness.js';

const source = readFileSync(process.env.DINO_SPINOSAURUS_COLLAR_SOURCE || resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
const { art, build } = nativeTailHarness(source);
function snapshot(mesh) {
  const geometry = mesh.geometry;
  return { attributes: Object.fromEntries(Object.entries(geometry.attributes).map(([key, value]) => [key, Array.from(value.array)])),
    index: geometry.index ? Array.from(geometry.index.array) : null,
    box: geometry.boundingBox ? [geometry.boundingBox.min.toArray(), geometry.boundingBox.max.toArray()] : null,
    sphere: geometry.boundingSphere ? [geometry.boundingSphere.center.toArray(), geometry.boundingSphere.radius] : null,
    position: mesh.position.toArray(), scale: mesh.scale.toArray(), quaternion: mesh.quaternion.toArray(),
    matrixWorld: mesh.matrixWorld.toArray(), userData: JSON.parse(JSON.stringify(mesh.userData)) };
}
function shape(mesh) {
  const current = snapshot(mesh); delete current.attributes.normal; delete current.userData.dinoTailNormalBlend;
  return current;
}
function nearestSurfaceNormals(mesh, points, maxDistance) {
  const p = mesh.geometry.attributes.position, n = mesh.geometry.attributes.normal, ix = mesh.geometry.index;
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
  const worldPoints = Array.from({ length: p.count }, (_, index) => vec().fromBufferAttribute(p, index).applyMatrix4(mesh.matrixWorld));
  const worldNormals = Array.from({ length: n.count }, (_, index) => vec().fromBufferAttribute(n, index).applyMatrix3(normalMatrix).normalize());
  const triangles = [];
  for (let index = 0; index < ix.count; index += 3) {
    const ids = [ix.getX(index), ix.getX(index + 1), ix.getX(index + 2)];
    const triangle = new THREE.Triangle(...ids.map(id => worldPoints[id]));
    if (triangle.getArea() === 0) continue;
    triangles.push({ triangle, ids, bounds: new THREE.Box3().setFromPoints(ids.map(id => worldPoints[id])) });
  }
  const nearest = vec(), closest = vec(), barycentric = vec();
  return points.map(point => {
    let distance = maxDistance, face = null;
    for (const candidate of triangles) {
      if (candidate.bounds.distanceToPoint(point) >= distance) continue;
      candidate.triangle.closestPointToPoint(point, closest);
      const candidateDistance = point.distanceTo(closest);
      if (candidateDistance < distance) { face = candidate; distance = candidateDistance; nearest.copy(closest); }
    }
    if (!face) return null;
    face.triangle.getBarycoord(nearest, barycentric);
    return worldNormals[face.ids[0]].clone().multiplyScalar(barycentric.x)
      .addScaledVector(worldNormals[face.ids[1]], barycentric.y).addScaledVector(worldNormals[face.ids[2]], barycentric.z).normalize();
  });
}
function collarAngles(built, before) {
  const { skin, context } = built, n = skin.geometry.attributes.normal, p = skin.geometry.attributes.position;
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(skin.matrixWorld), changed = [];
  for (let index = 0; index < n.count; index++) {
    const prior = vec().fromArray(before, index * 3), current = vec().fromBufferAttribute(n, index);
    if (prior.distanceToSquared(current) > 1e-10) changed.push(index);
  }
  const points = changed.map(index => vec().fromBufferAttribute(p, index).applyMatrix4(skin.matrixWorld));
  const width = Math.min(context.tailBaseRadius, context.surfaceBodyHeight, context.surfaceBodyDepth) * .45;
  const targets = nearestSurfaceNormals(context.bodyShell, points, width * 1.01);
  let beforeAngle = 0, afterAngle = 0, count = 0;
  const angle = (a, b) => Math.acos(Math.max(-1, Math.min(1, a.dot(b))));
  for (let index = 0; index < changed.length; index++) {
    if (!targets[index]) continue;
    const prior = vec().fromArray(before, changed[index] * 3).applyMatrix3(normalMatrix).normalize();
    const current = vec().fromBufferAttribute(n, changed[index]).applyMatrix3(normalMatrix).normalize();
    beforeAngle += angle(prior, targets[index]); afterAngle += angle(current, targets[index]); count++;
  }
  return { count, before: beforeAngle / count, after: afterAngle / count };
}

describe('Spinosaurus pelvic-to-tail surface continuity', () => {
  for (const scale of [.05, 1, 8]) for (const transformed of [false, true]) {
    it('reduces collar shading discontinuity without changing anatomy at scale ' + scale + ', transformed ' + transformed, () => {
      const built = build(scale, 1, transformed);
      try {
        const before = snapshot(built.skin), preservedShape = shape(built.skin), torso = snapshot(built.context.bodyShell);
        const boneSnapshots = built.bones.map(snapshot), trunkVersion = built.context.bodyShell.geometry.attributes.normal.version;
        const meshCount = built.model.children.length;
        built.blend();
        const result = built.skin.userData.dinoTailNormalBlend, n = built.skin.geometry.attributes.normal, uv = built.skin.geometry.attributes.uv;
        expect(result.changed[0]).toBe(0); expect(result.changed[1]).toBeGreaterThan(8);
        expect(snapshot(built.context.bodyShell)).toEqual(torso);
        expect(built.context.bodyShell.geometry.attributes.normal.version).toBe(trunkVersion);
        expect(shape(built.skin)).toEqual(preservedShape);
        expect(built.bones.map(snapshot)).toEqual(boneSnapshots);
        expect(built.model.children.length).toBe(meshCount);
        expect(built.skin.position.toArray()).toEqual(built.context.hip.toArray());
        const angles = collarAngles(built, before.attributes.normal);
        expect(angles.count).toBeGreaterThan(8);
        expect(angles.before).toBeGreaterThan(.01);
        expect(angles.after / angles.before).toBeLessThan(.85);
        for (let index = 0; index < n.count; index++) {
          const normal = vec().fromBufferAttribute(n, index);
          expect(normal.toArray().every(Number.isFinite)).toBe(true); expect(normal.length()).toBeCloseTo(1, 6);
          if (uv.getX(index) >= .4) expect(normal.toArray()).toEqual(before.attributes.normal.slice(index * 3, index * 3 + 3));
        }
        for (let ring = 0; ring <= 48; ring++) expect(vec().fromBufferAttribute(n, ring * 25).distanceTo(vec().fromBufferAttribute(n, ring * 25 + 24))).toBeLessThan(2e-6);
        art.dinoSkinCoordinates(THREE, built.skin.geometry, built.skin.matrixWorld, true);
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(built.skin.matrixWorld), mapped = built.skin.geometry.attributes.dinoSkinNormal;
        for (let index = 0; index < n.count; index++) expect(vec().fromBufferAttribute(mapped, index).distanceTo(vec().fromBufferAttribute(n, index).applyMatrix3(normalMatrix).normalize())).toBeLessThan(2e-6);
      } finally { built.dispose(); }
    });
  }
  for (const id of ['baryonyx', 'suchomimus', 'tyrannosaurus']) it('leaves the existing off-species tail shading untouched for ' + id, () => {
    const built = build(1, 1, false, id);
    try { const before = snapshot(built.skin), torso = snapshot(built.context.bodyShell); built.blend(); expect(snapshot(built.skin)).toEqual(before); expect(snapshot(built.context.bodyShell)).toEqual(torso); }
    finally { built.dispose(); }
  });
  for (const missing of ['bodyShell', 'tailMeshes']) it('handles a missing ' + missing + ' without modifying the surviving surfaces', () => {
    const built = build();
    try {
      const before = snapshot(built.skin), torso = snapshot(built.context.bodyShell);
      built.context[missing] = missing === 'bodyShell' ? null : [];
      built.blend();
      expect(snapshot(built.skin)).toEqual(before);
      if (built.context.bodyShell) expect(snapshot(built.context.bodyShell)).toEqual(torso);
    } finally { built.dispose(); }
  });
});
