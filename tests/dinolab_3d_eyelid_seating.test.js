import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const source = readFileSync(process.env.DINO_LID_SOURCE || resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
const T = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
function helper(name) {
  const start = source.indexOf('  function ' + name + '(');
  if (start < 0) throw Error('Missing production helper: ' + name);
  const open = source.indexOf('{', start);
  let depth = 1, end = open + 1;
  while (depth && end < source.length) {
    if (source[end] === '{') depth++;
    if (source[end] === '}') depth--;
    end++;
  }
  if (depth) throw Error('Unclosed production helper: ' + name);
  return source.slice(start, end);
}
const { makeLid, update, seat } = new Function(
  ['dinoSurfaceAnchor', 'dinoEyelidGeometry', 'dinoUpdateEyelid', 'dinoSeatEyelids'].map(helper).join('\n') +
  '\nreturn { makeLid:dinoEyelidGeometry, update:dinoUpdateEyelid, seat:dinoSeatEyelids };'
)();
const pointAt = (attribute, i) => new T.Vector3().fromBufferAttribute(attribute, i);
function rig(radius = .1, side = 1, transformed = false) {
  const parent = new T.Group(), frame = new T.Group();
  parent.add(frame);
  if (transformed) {
    parent.position.set(2, -1, 3);
    parent.rotation.set(.2, -.35, .14);
    parent.scale.set(1.4, .7, 1.8);
    frame.rotation.set(-.12, .24, -.15);
    frame.position.set(.3, -.1, .2);
  }
  const material = new T.MeshBasicMaterial({ side: T.FrontSide });
  const meshes = [true, false].map(upper => new T.Mesh(makeLid(T, radius, side, upper), material));
  const surface = new T.Mesh(new T.SphereGeometry(4 * radius, 64, 48), material);
  surface.position.z = -side * 3.7 * radius;
  surface.scale.set(1.3, .9, 1);
  frame.add(surface, ...meshes);
  parent.updateMatrixWorld(true);
  return { radius, side, parent, frame, meshes, surface,
    blink: amount => meshes.forEach(mesh => update(mesh.geometry, amount)),
    dispose: () => { meshes.forEach(mesh => mesh.geometry.dispose()); surface.geometry.dispose(); material.dispose(); } };
}
function margin(geometry) {
  const { columns, rows } = geometry.userData.dinoEyelid;
  const offset = rows * (columns + 1) * 3;
  return { position: Array.from(geometry.attributes.position.array.slice(offset)),
    normal: Array.from(geometry.attributes.normal.array.slice(offset)) };
}
function snapshot(mesh) {
  const g = mesh.geometry;
  return { position: Array.from(g.attributes.position.array), normal: Array.from(g.attributes.normal.array),
    positionVersion: g.attributes.position.version, normalVersion: g.attributes.normal.version,
    metadata: { ...g.userData.dinoEyelid }, rim: g.dinoEyelidSamples.rim,
    box: g.boundingBox.clone(), sphere: g.boundingSphere.clone() };
}
function expectUnchanged(mesh, before) { expect(snapshot(mesh)).toEqual(before); }
function planeFixture(fixture, mode) {
  const surface = new T.Mesh(new T.PlaneGeometry(fixture.radius * 100, fixture.radius * 100), fixture.surface.material);
  if (fixture.side < 0) surface.rotation.y = Math.PI;
  if (mode === 'miss') surface.position.x = fixture.radius * 200;
  if (mode === 'distant') surface.position.z = -fixture.side * fixture.radius * 2;
  if (mode === 'excessive-inset') surface.position.z = -fixture.side * fixture.radius * .131;
  if (mode === 'steep') surface.rotation.y += Math.acos(.15);
  if (mode === 'upper-only') {
    surface.geometry.dispose();
    surface.geometry = new T.PlaneGeometry(fixture.radius * 4, fixture.radius * 1.6);
    surface.position.y = fixture.radius * .6;
  }
  fixture.frame.add(surface);
  fixture.parent.updateMatrixWorld(true);
  return surface;
}

describe('Dino Lab eyelid margins seated on a curved skull', () => {
  for (const radius of [.0003, .1, 2.4]) for (const side of [-1, 1]) for (const transformed of [false, true]) {
    it('keeps a fixed continuous surface margin at radius ' + radius + ', side ' + side + ', transformed=' + transformed, () => {
      const fixture = rig(radius, side, transformed);
      const unseated = [true, false].map(upper => makeLid(T, radius, side, upper));
      try {
        expect(seat(T, fixture.meshes, fixture.surface)).toBe(true);
        const boundaries = fixture.meshes.map(mesh => margin(mesh.geometry));
        for (const mesh of fixture.meshes) {
          const geometry = mesh.geometry, { columns, rows } = geometry.userData.dinoEyelid;
          expect(geometry.userData.dinoEyelid.surfaceSeated).toBe(true);
          expect(geometry.dinoEyelidSamples.rim).toHaveLength((columns + 1) * 4);
          const worldNormalMatrix = new T.Matrix3().getNormalMatrix(mesh.matrixWorld);
          const sphereNormalMatrix = new T.Matrix3().getNormalMatrix(fixture.surface.matrixWorld);
          const axis = new T.Vector3(0, 0, side).transformDirection(mesh.matrixWorld);
          for (let col = 0; col <= columns; col++) {
            const index = rows * (columns + 1) + col;
            const local = pointAt(geometry.attributes.position, index);
            const world = local.clone().applyMatrix4(mesh.matrixWorld);
            const hit = new T.Raycaster(world.clone().addScaledVector(axis, radius * 20), axis.clone().negate(), 0, radius * 40)
              .intersectObject(fixture.surface, false)[0];
            expect(hit).toBeDefined();
            const surfaceLocal = mesh.worldToLocal(hit.point.clone());
            expect(Math.abs(surfaceLocal.x - local.x)).toBeLessThan(radius * 3e-5);
            expect(Math.abs(surfaceLocal.y - local.y)).toBeLessThan(radius * 3e-5);
            expect((surfaceLocal.z - local.z) / radius).toBeCloseTo(side * .02, 5);
            // A smooth sphere's interpolated vertex normal is its radial direction.
            // Transform independently through the skull and eyelid normal matrices.
            const expectedNormal = fixture.surface.worldToLocal(hit.point.clone()).normalize().applyMatrix3(sphereNormalMatrix).normalize();
            const actualNormal = pointAt(geometry.attributes.normal, index).applyMatrix3(worldNormalMatrix).normalize();
            expect(actualNormal.dot(expectedNormal)).toBeGreaterThan(1 - 2e-6);
          }
        }
        for (const blink of [0, .2, .5, .8, .99, 1, .35, 0]) {
          fixture.blink(blink); unseated.forEach(g => update(g, blink));
          fixture.meshes.forEach((mesh, index) => {
            const g = mesh.geometry, { columns } = g.userData.dinoEyelid;
            expect(margin(g)).toEqual(boundaries[index]);
            // Rows through the centre of the sheet retain the original eye envelope.
            for (const attribute of ['position', 'normal']) expect(Array.from(g.attributes[attribute].array.slice(0, 3 * (columns + 1) * 3)))
              .toEqual(Array.from(unseated[index].attributes[attribute].array.slice(0, 3 * (columns + 1) * 3)));
            for (let i = 0; i < g.attributes.position.count; i++) {
              const point = pointAt(g.attributes.position, i), normal = pointAt(g.attributes.normal, i);
              expect(point.toArray().every(Number.isFinite)).toBe(true);
              expect(normal.toArray().every(Number.isFinite)).toBe(true);
              expect(normal.length()).toBeCloseTo(1, 5);
              expect(g.boundingBox.distanceToPoint(point)).toBeLessThan(radius * 1e-6);
              expect(point.distanceTo(g.boundingSphere.center)).toBeLessThanOrEqual(g.boundingSphere.radius * 1.000001);
            }
          });
          const upper = fixture.meshes[0].geometry, lower = fixture.meshes[1].geometry;
          const { columns, rows } = upper.userData.dinoEyelid;
          for (let row = 0; row <= rows; row++) for (const col of [0, columns]) {
            const i = row * (columns + 1) + col;
            expect(pointAt(upper.attributes.position, i).distanceTo(pointAt(lower.attributes.position, i))).toBe(0);
          }
          if (blink === 1) for (let col = 0; col <= columns; col++)
            expect(pointAt(upper.attributes.position, col).distanceTo(pointAt(lower.attributes.position, col))).toBe(0);
        }
      } finally { fixture.dispose(); unseated.forEach(g => g.dispose()); }
    });
  }
});

describe('Dino Lab eyelid seating fallback is atomic', () => {
  for (const side of [-1, 1]) for (const mode of ['miss', 'distant', 'steep', 'upper-only', 'excessive-inset']) {
    it('keeps both sheets untouched for ' + mode + ' on side ' + side, () => {
      const fixture = rig(.1, side);
      const plane = planeFixture(fixture, mode);
      try {
        fixture.blink(.45);
        const before = fixture.meshes.map(snapshot);
        expect(seat(T, fixture.meshes, plane)).toBe(false);
        fixture.meshes.forEach((mesh, i) => expectUnchanged(mesh, before[i]));
        if (mode === 'upper-only') {
          // Prove the first sheet was projectable, so this exercises rollback
          // after a later sheet fails rather than an immediate first-ray miss.
          const upperCopy = new T.Mesh(makeLid(T, .1, side, true), plane.material);
          fixture.frame.add(upperCopy);
          expect(seat(T, [fixture.meshes[0], upperCopy], plane)).toBe(true);
          upperCopy.geometry.dispose();
        }
      } finally { plane.geometry.dispose(); fixture.dispose(); }
    });
  }
  it('ignores absent surfaces, malformed pairs and unrelated geometry', () => {
    const fixture = rig();
    const unrelated = new T.Mesh(new T.BufferGeometry(), fixture.surface.material);
    try {
      const before = fixture.meshes.map(snapshot);
      for (const pair of [null, [], [fixture.meshes[0]], [fixture.meshes[0], null], [fixture.meshes[0], unrelated]])
        expect(seat(T, pair, fixture.surface)).toBe(false);
      expect(seat(T, fixture.meshes, null)).toBe(false);
      fixture.meshes.forEach((mesh, i) => expectUnchanged(mesh, before[i]));
    } finally { unrelated.geometry.dispose(); fixture.dispose(); }
  });
});

describe('Dino Lab seated lids cover the peripheral cornea when closed', () => {
  for (const side of [-1, 1]) for (const surfaceKind of ['curved', 'near-inset-limit']) {
    it('occludes the upper, lower and corner lens on side ' + side + ' with a ' + surfaceKind + ' margin', () => {
      const fixture = rig(.1, side, true), radius = fixture.radius;
      let plane;
      const surface = surfaceKind === 'curved' ? fixture.surface : (plane = planeFixture(fixture, 'flat'));
      if (plane) { plane.position.z = -side * .109 * radius; fixture.parent.updateMatrixWorld(true); }
      // Use the production corneal envelope and its actual tessellation. The
      // analytic lens alone would not detect a gap through an eyelid triangle.
      const cornea = new T.Mesh(new T.SphereGeometry(radius * 1.03, 20, 14), fixture.surface.material);
      cornea.scale.set(1, .84, .50); cornea.position.z = side * radius * .12;
      fixture.frame.add(cornea); fixture.parent.updateMatrixWorld(true);
      try {
        expect(seat(T, fixture.meshes, surface)).toBe(true);
        fixture.blink(1);
        const directions = [[0, .78], [0, -.78], [.35, .74], [-.35, -.74],
          [.99, 0], [-.99, 0], [.92, .25], [-.92, -.25], [.7, .55], [-.7, -.55]];
        const axis = new T.Vector3(0, 0, -side).transformDirection(fixture.meshes[0].matrixWorld);
        for (const [x, y] of directions) {
          const origin = new T.Vector3(x * radius, y * radius, side * radius * 3).applyMatrix4(fixture.meshes[0].matrixWorld);
          const ray = new T.Raycaster(origin, axis, 0, radius * 20);
          const lensHit = ray.intersectObject(cornea, false)[0];
          const lidHit = ray.intersectObjects(fixture.meshes, false)[0];
          expect(lensHit, 'ray must cross the lens at ' + [x, y]).toBeDefined();
          expect(lidHit, 'closed lid must cover lens at ' + [x, y]).toBeDefined();
          expect(lidHit.distance, 'lid must lie in front of the lens at ' + [x, y]).toBeLessThan(lensHit.distance);
        }
      } finally { cornea.geometry.dispose(); if (plane) plane.geometry.dispose(); fixture.dispose(); }
    });
  }
});

describe('Dino Lab seated lid update lifetime', () => {
  it('seats an already blinking pair without changing its aperture and does not seat it twice', () => {
    const fixture = rig();
    try {
      fixture.blink(.6);
      const firstEdges = fixture.meshes.map(mesh => Array.from(mesh.geometry.attributes.position.array.slice(0, 25 * 3)));
      expect(seat(T, fixture.meshes, fixture.surface)).toBe(true);
      const before = fixture.meshes.map(snapshot);
      fixture.meshes.forEach((mesh, i) => {
        expect(mesh.geometry.userData.dinoEyelid.lastBlink).toBe(.6);
        expect(Array.from(mesh.geometry.attributes.position.array.slice(0, 25 * 3))).toEqual(firstEdges[i]);
      });
      expect(seat(T, fixture.meshes, fixture.surface)).toBe(false);
      fixture.meshes.forEach((mesh, i) => expectUnchanged(mesh, before[i]));
    } finally { fixture.dispose(); }
  });
  it('reuses buffers, samples and bounds through animation and avoids duplicate uploads', () => {
    const fixture = rig();
    try {
      expect(seat(T, fixture.meshes, fixture.surface)).toBe(true);
      for (const mesh of fixture.meshes) {
        const g = mesh.geometry;
        const refs = { position:g.attributes.position, normal:g.attributes.normal, uv:g.attributes.uv,
          positionArray:g.attributes.position.array, normalArray:g.attributes.normal.array,
          index:g.index, samples:g.dinoEyelidSamples, rim:g.dinoEyelidSamples.rim, sphere:g.boundingSphere, box:g.boundingBox };
        const initial = Array.from(refs.positionArray);
        for (const blink of [.1, .45, .9, 1, .5, 0]) {
          const version = refs.position.version, normalVersion = refs.normal.version;
          expect(update(g, blink)).toBe(true);
          expect(refs.position.version).toBe(version + 1);
          expect(refs.normal.version).toBe(normalVersion + 1);
          expect(update(g, blink)).toBe(false);
          expect(refs.position.version).toBe(version + 1);
          expect(refs.normal.version).toBe(normalVersion + 1);
          expect(g.attributes.position).toBe(refs.position); expect(g.attributes.normal).toBe(refs.normal);
          expect(g.attributes.uv).toBe(refs.uv); expect(g.index).toBe(refs.index);
          expect(g.attributes.position.array).toBe(refs.positionArray); expect(g.attributes.normal.array).toBe(refs.normalArray);
          expect(g.dinoEyelidSamples).toBe(refs.samples); expect(g.dinoEyelidSamples.rim).toBe(refs.rim);
          expect(g.boundingSphere).toBe(refs.sphere); expect(g.boundingBox).toBe(refs.box);
        }
        expect(Array.from(g.attributes.position.array)).toEqual(initial);
      }
    } finally { fixture.dispose(); }
  });
});
