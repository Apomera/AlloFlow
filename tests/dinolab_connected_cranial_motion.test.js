// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Run from the Dino Lab repository, like its other geometry tests. The source
// capture exposes production helpers without adding a test API to the tool.
const T = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source = readFileSync(resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
const marker = "window.StemLab.registerTool('dinoLab'";
if (!source.includes(marker)) throw new Error('Dino Lab registration marker missing');
const captured = source.replace(marker,
  "globalThis.__connectedCranialArt = { dinoConnectedCranialPose, dinoCervicalEnvelope, dinoNeckJunction, dinoCranialGeometry }; " + marker);
window.StemLab = { registerTool() {} };
new Function(captured)();
const art = globalThis.__connectedCranialArt;
delete globalThis.__connectedCranialArt;
const registrationStart = source.indexOf('function registerCranialMotion(part) {');
const registrationEnd = source.indexOf('scene.add(model);', registrationStart);
if (registrationStart < 0 || registrationEnd < registrationStart) throw new Error('Cranial registration helpers missing');
const registrationFor = new Function('model', 'cranialMotionParts',
  source.slice(registrationStart, registrationEnd) + 'return { registerCranialMotion, captureCranialMotion };');

function expectVector(actual, expected, tolerance = 1e-10) {
  expect(actual.distanceTo(expected)).toBeLessThan(tolerance);
}

function expectedPoint(point, pivot, current, rest) {
  // Independently apply the two rotations to catch multiplication-order errors.
  return point.clone().sub(pivot).applyQuaternion(rest.clone().invert())
    .applyQuaternion(current).add(pivot);
}

function fixture() {
  const pivot = new T.Vector3(2.7, 1.4, -.3);
  const head = new T.Vector3(-1.4, 3.6, -.3);
  const model = new T.Group(), rig = new T.Group(), neck = new T.Group();
  model.add(rig, neck);
  neck.position.copy(pivot);
  return { pivot, head, model, rig, neck, rest: neck.quaternion.clone() };
}

function geometrySnapshot(geometry) {
  return {
    attributes: Object.fromEntries(Object.entries(geometry.attributes).map(([key, attr]) =>
      [key, { attribute: attr, array: attr.array, values: Array.from(attr.array), version: attr.version }])),
    index: geometry.index && { attribute: geometry.index, array: geometry.index.array,
      values: Array.from(geometry.index.array), version: geometry.index.version },
  };
}

function expectGeometryUnchanged(geometry, before) {
  for (const [key, saved] of Object.entries(before.attributes)) {
    expect(geometry.attributes[key]).toBe(saved.attribute);
    expect(geometry.attributes[key].array).toBe(saved.array);
    expect(Array.from(geometry.attributes[key].array)).toEqual(saved.values);
    expect(geometry.attributes[key].version).toBe(saved.version);
  }
  if (before.index) {
    expect(geometry.index).toBe(before.index.attribute);
    expect(geometry.index.array).toBe(before.index.array);
    expect(Array.from(geometry.index.array)).toEqual(before.index.values);
    expect(geometry.index.version).toBe(before.index.version);
  }
}

describe('Dino Lab connected cranial motion', () => {
  it('captures new cranial roots once while preserving the independently animated neck root', () => {
    const model = new T.Group(), neck = new T.Object3D(), neckContour = new T.Object3D();
    model.add(neck, neckContour);
    const parts = [], registration = registrationFor(model, parts), before = model.children.slice();
    const skull = new T.Group(), feather = new T.Object3D(), eye = new T.Object3D();
    skull.add(feather); model.add(skull, eye);
    registration.registerCranialMotion(skull);
    registration.captureCranialMotion(before);
    registration.captureCranialMotion(before);
    registration.registerCranialMotion(feather);
    expect(parts).toEqual([skull, eye]);
    expect(parts).not.toContain(neck);
    expect(parts).not.toContain(neckContour);
    const rig = new T.Group(); parts.forEach(part => rig.add(part)); model.add(rig);
    expect(neck.parent).toBe(model);
    expect(neckContour.parent).toBe(model);
    expect(feather.parent).toBe(skull);
    expect(rig.children).toEqual([skull, eye]);
  });

  it('preserves specimen-space children at rest and restores identity after a look', () => {
    const { pivot, head, model, rig, neck, rest } = fixture();
    const eye = new T.Object3D(); eye.position.copy(head).add(new T.Vector3(-.3, .1, .2));
    rig.add(eye);
    neck.rotation.set(.17, -.23, .09);
    art.dinoConnectedCranialPose(T, rig, pivot, neck, rest);
    expect(rig.position.length()).toBeGreaterThan(.01);
    neck.quaternion.copy(rest);
    art.dinoConnectedCranialPose(T, rig, pivot, neck, rest);
    expectVector(rig.position, new T.Vector3());
    expect(rig.quaternion.angleTo(new T.Quaternion())).toBeLessThan(1e-10);
    expect(rig.matrix.elements).toEqual(new T.Matrix4().elements);
    model.updateMatrixWorld(true);
    expectVector(eye.getWorldPosition(new T.Vector3()), eye.position);
  });

  it('cancels a nonzero rest orientation without mutating the supplied rest quaternion', () => {
    const { pivot, rig, neck } = fixture();
    neck.rotation.set(.34, -.19, .11);
    const rest = neck.quaternion.clone(), savedRest = rest.toArray();
    art.dinoConnectedCranialPose(T, rig, pivot, neck, rest);
    expectVector(rig.position, new T.Vector3());
    expect(rig.quaternion.angleTo(new T.Quaternion())).toBeLessThan(1e-7);
    expect(rest.toArray()).toEqual(savedRest);
    // The current and rest orientations use different axes and do not commute.
    neck.rotation.set(-.21, .27, -.16);
    art.dinoConnectedCranialPose(T, rig, pivot, neck, rest);
    for (const point of [pivot, new T.Vector3(-2.2, 3.1, .7), new T.Vector3(.4, -.8, -.6)]) {
      expectVector(point.clone().applyMatrix4(rig.matrix), expectedPoint(point, pivot, neck.quaternion, rest));
    }
    expect(rest.toArray()).toEqual(savedRest);
  });

  it.each([
    { name: 'theropod', sauropod: false, clade: 'Dromaeosauridae' },
    { name: 'sauropod', sauropod: true, clade: 'Diplodocidae' },
  ])('keeps the $name neck junction and shoulder attached through a compound look', ({ sauropod, clade }) => {
    const { pivot, head, model, rig, neck, rest } = fixture();
    // The renderer bakes the neck stations in model space, then translates its
    // vertices to make the shoulder the mesh's local origin.
    const envelope = art.dinoCervicalEnvelope(T, pivot, head, .85, .26, .08,
      { neckBaseCurve: -.1, neckMidCurve: .11 }, sauropod, clade);
    const junction = art.dinoNeckJunction(T, envelope.points, envelope.radii, .72);
    const skullJunction = new T.Object3D(); skullJunction.position.copy(junction.point); rig.add(skullJunction);
    const shoulderMarker = new T.Object3D(); shoulderMarker.position.copy(pivot); rig.add(shoulderMarker);
    const localNeckJunction = junction.point.clone().sub(pivot);
    for (const angles of [[.04, .08, 0], [-.07, -.085, .02], [0, 0, 0]]) {
      neck.rotation.set(...angles);
      // Breathing scales only the depth: the sagittal centerline stays attached.
      neck.scale.z = 1.014;
      art.dinoConnectedCranialPose(T, rig, pivot, neck, rest);
      model.updateMatrixWorld(true);
      expectVector(skullJunction.getWorldPosition(new T.Vector3()), neck.localToWorld(localNeckJunction.clone()));
      expectVector(skullJunction.getWorldPosition(new T.Vector3()), expectedPoint(junction.point, pivot, neck.quaternion, rest));
      expectVector(shoulderMarker.getWorldPosition(new T.Vector3()), pivot);
    }
  });

  it('moves a baked cranial surface and facial attachments rigidly without touching geometry data', () => {
    const { pivot, head, model, rig, neck, rest } = fixture();
    const snout = head.clone().add(new T.Vector3(-.95, -.08, 0));
    const skullRoot = head.clone().add(new T.Vector3(.4, 0, 0));
    const skull = new T.Mesh(art.dinoCranialGeometry(T,
      [skullRoot, head, snout],
      [[.07, .06], [.22, .16], [.05, .04]],
      { center: head.clone().lerp(snout, .28), length: 1, height: .22, depth: .16, cheek: 1.1 }));
    skull.geometry.translate(-skullRoot.x, -skullRoot.y, -skullRoot.z);
    skull.position.copy(skullRoot);
    skull.name = 'continuous-cranial-surface';
    const eye = new T.Mesh(new T.SphereGeometry(.04, 8, 6));
    eye.name = 'eye'; eye.position.copy(head).add(new T.Vector3(-.2, .07, .15)); eye.scale.set(1, .82, .46);
    const nostril = new T.Mesh(new T.SphereGeometry(.015, 8, 6));
    nostril.name = 'nostril'; nostril.position.copy(snout).add(new T.Vector3(.1, .025, .04)); nostril.scale.set(1.25, .55, .42);
    const horn = new T.Mesh(new T.ConeGeometry(.03, .3, 8));
    horn.name = 'horn'; horn.position.copy(head).add(new T.Vector3(-.1, .25, -.06)); horn.rotation.z = -.3;
    const roots = [skull, eye, nostril, horn];
    roots.forEach(part => model.add(part));
    model.updateMatrixWorld(true);
    const before = roots.map(part => ({ position: part.position.toArray(), quaternion: part.quaternion.toArray(),
      scale: part.scale.toArray(), geometry: geometrySnapshot(part.geometry),
      sample: new T.Vector3().fromBufferAttribute(part.geometry.attributes.position, 3).applyMatrix4(part.matrixWorld) }));
    roots.forEach(part => rig.add(part));
    for (const angles of [[.04, .08, .02], [-.1, -.2, .04], [.04, .08, .02]]) {
      neck.rotation.set(...angles);
      art.dinoConnectedCranialPose(T, rig, pivot, neck, rest);
      model.updateMatrixWorld(true);
      roots.forEach((part, index) => {
        expect(part.position.toArray()).toEqual(before[index].position);
        expect(part.quaternion.toArray()).toEqual(before[index].quaternion);
        expect(part.scale.toArray()).toEqual(before[index].scale);
        expectGeometryUnchanged(part.geometry, before[index].geometry);
        const sample = new T.Vector3().fromBufferAttribute(part.geometry.attributes.position, 3).applyMatrix4(part.matrixWorld);
        expectVector(sample, expectedPoint(before[index].sample, pivot, neck.quaternion, rest));
      });
      const movedEye = eye.getWorldPosition(new T.Vector3()), movedNostril = nostril.getWorldPosition(new T.Vector3());
      expect(movedEye.distanceTo(movedNostril)).toBeCloseTo(
        new T.Vector3(...before[1].position).distanceTo(new T.Vector3(...before[2].position)), 11);
    }
    roots.forEach(part => part.geometry.dispose());
  });

  it('excludes cervical breathing scale and translation from the skull transform', () => {
    const { pivot, rig, neck, rest } = fixture();
    neck.rotation.set(.045, .085, 0);
    art.dinoConnectedCranialPose(T, rig, pivot, neck, rest);
    const expectedMatrix = rig.matrix.elements.slice();
    for (const breath of [0, .5, 1, 0]) {
      neck.scale.set(1, 1, 1 + breath * .014);
      neck.position.copy(pivot).add(new T.Vector3(.03 * breath, 0, 0));
      art.dinoConnectedCranialPose(T, rig, pivot, neck, rest);
      expect(rig.scale.toArray()).toEqual([1, 1, 1]);
      expect(rig.matrix.elements).toEqual(expectedMatrix);
      expect(rig.matrix.determinant()).toBeCloseTo(1, 12);
    }
  });
});
