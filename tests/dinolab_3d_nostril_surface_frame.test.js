import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

// Installed source is the default; staged runs can pin the reviewed candidate.
const source = readFileSync(process.env.DINO_NOSTRIL_SOURCE || resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
const T = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
function sourceFunctionText(name) {
  const start = source.indexOf('function ' + name + '(');
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
function sourceFunction(name) {
  return new Function(sourceFunctionText(name) + '; return ' + name + ';')();
}
const frameFor = sourceFunction('dinoEyeSurfaceFrame');
const poseCranium = sourceFunction('dinoConnectedCranialPose');
const registrationFor = new Function('model', 'cranialMotionParts',
  sourceFunctionText('registerCranialMotion') + '\n' + sourceFunctionText('captureCranialMotion') +
  '\nreturn { registerCranialMotion, captureCranialMotion };');
const radians = degrees => degrees * Math.PI / 180;
const axisFor = side => new T.Vector3(0, 0, side);
const closeVector = (actual, expected, tolerance = 1e-9) => expect(actual.distanceTo(expected)).toBeLessThan(tolerance);
const start = source.indexOf('                var nostrilPos = head.clone().lerp(');
const end = source.indexOf('                var mouthStart = ', start);
if (start < 0 || end < 0) throw Error('Missing actual nostril construction block.');
const nostrilBlock = source.slice(start, end);
// These new children must be captured by the real renderer after facial construction.
const captureCall = source.indexOf('captureCranialMotion(cranialFaceBefore);', end);
if (captureCall < end || captureCall - end > 1600) throw Error('Nostril meshes are outside facial motion capture.');

function constructNostrils(side, size, normal, isTheropod = true, materialKind = 'MeshBasicMaterial') {
  const mouthMat = new T[materialKind]({ color: 0x241a17 }), headMat = new T.MeshBasicMaterial();
  const model = new T.Group(), neck = new T.Object3D();
  model.add(neck);
  const before = model.children.slice(), motionParts = [];
  const head = new T.Vector3(2, 3, 0).multiplyScalar(size);
  const surfaceSnout = new T.Vector3(0, 2.9, 0).multiplyScalar(size);
  const surfaceHeadHeight = .8 * size, surfaceHeadDepth = .6 * size;
  const cranialSurface = { nostrilPosition: .72, nostrilHeightScale: 1.1, muzzleTipScale: .9, nostrilScale: .85 };
  const radius = Math.min(surfaceHeadHeight, surfaceHeadDepth) * .065 * cranialSurface.nostrilScale;
  const hitPoint = new T.Vector3(.56, 3.16, side * .42).multiplyScalar(size);
  const anchorRequests = [];
  const faceSurfacePoint = (point, faceSide, inset) => {
    const projected = point.clone();
    projected.z = faceSide * .42 * size + faceSide * inset;
    return projected;
  };
  const context = {
    THREE: T, model, head, surfaceSnout, surfaceHeadHeight, surfaceHeadDepth,
    faceSide: side, cranialSurface, isTheropod, mouthMat, nostrilMat: null, headMat, headShell: {},
    vec: (x, y, z) => new T.Vector3(x, y, z), faceSurfacePoint,
    dinoEyeSurfaceFrame: frameFor,
    dinoSurfaceAnchor: (...args) => {
      anchorRequests.push(args);
      const requestedSide = -args[3].z;
      if (!normal) return null;
      const point = hitPoint.clone(), mirroredNormal = normal.clone();
      point.z *= requestedSide / side; mirroredNormal.z *= requestedSide / side;
      return { point, normal: mirroredNormal };
    },
  };
  const invoke = new Function(...Object.keys(context), nostrilBlock + '\nreturn { nostril, nostrilRim, nostrilPos, nostrilMat };');
  const result = invoke(...Object.values(context));
  const registration = registrationFor(model, motionParts);
  registration.captureCranialMotion(before);
  registration.captureCranialMotion(before);
  return { ...result, parts: [result.nostril, result.nostrilRim], model, neck, motionParts,
    head, surfaceSnout, surfaceHeadHeight, surfaceHeadDepth, cranialSurface, radius, hitPoint,
    anchorRequests, faceSurfacePoint, mouthMat, headMat,
    constructMirror: () => invoke(...Object.values({ ...context, faceSide: -side, nostrilMat: result.nostrilMat })),
    dispose: () => {
      result.nostril.geometry.dispose(); result.nostrilRim.geometry.dispose();
      if (result.nostrilMat) result.nostrilMat.dispose(); mouthMat.dispose(); headMat.dispose();
    },
  };
}

// Independent legacy reference: original lateral projection and offsets, without
// calling the new frame transform or deriving expected values from its output.
function expectLegacy(nostrils, side, size) {
  const c = nostrils.cranialSurface;
  const nominal = nostrils.head.clone().lerp(nostrils.surfaceSnout, c.nostrilPosition)
    .add(new T.Vector3(0, nostrils.surfaceHeadHeight * .12 * c.nostrilHeightScale,
      side * nostrils.surfaceHeadDepth * .65));
  const expected = nostrils.faceSurfacePoint(nominal, side, nostrils.radius * .08);
  closeVector(nostrils.nostril.position, expected, size * 1e-10);
  closeVector(nostrils.nostrilRim.position,
    expected.clone().add(new T.Vector3(0, 0, side * nostrils.radius * .40)), size * 1e-10);
  expect(nostrils.nostril.quaternion.toArray()).toEqual([0, 0, 0, 1]);
  expect(nostrils.nostrilRim.quaternion.toArray()).toEqual([0, 0, 0, 1]);
  expect(nostrils.nostril.scale.toArray()).toEqual([1.25, .55, .42]);
  expect(nostrils.nostrilRim.scale.toArray()).toEqual([1.25, .56, 1]);
  expect(nostrils.nostril.material).toBe(nostrils.mouthMat);
  expect(nostrils.nostrilMat).toBeNull();
  expect(nostrils.parts.every(part => !part.userData.dinoSurfaceSeatedNostril)).toBe(true);
}
function outwardPeak(part, center, outward) {
  part.updateMatrixWorld(true);
  const positions = part.geometry.attributes.position;
  let peak = -Infinity;
  for (let i = 0; i < positions.count; i++) {
    const point = new T.Vector3().fromBufferAttribute(positions, i).applyMatrix4(part.matrixWorld);
    peak = Math.max(peak, point.sub(center).dot(outward));
  }
  return peak;
}
function geometrySnapshot(geometry) {
  return {
    attributes: Object.fromEntries(Object.entries(geometry.attributes).map(([key, attr]) =>
      [key, { attr, array: attr.array, values: Array.from(attr.array), version: attr.version }])),
    index: geometry.index && { attr: geometry.index, array: geometry.index.array,
      values: Array.from(geometry.index.array), version: geometry.index.version },
  };
}
function expectGeometryUnchanged(geometry, saved) {
  for (const [key, before] of Object.entries(saved.attributes)) {
    expect(geometry.attributes[key]).toBe(before.attr);
    expect(geometry.attributes[key].array).toBe(before.array);
    expect(Array.from(geometry.attributes[key].array)).toEqual(before.values);
    expect(geometry.attributes[key].version).toBe(before.version);
  }
  expect(geometry.index).toBe(saved.index.attr);
  expect(geometry.index.array).toBe(saved.index.array);
  expect(Array.from(geometry.index.array)).toEqual(saved.index.values);
  expect(geometry.index.version).toBe(saved.index.version);
}

describe('Dino Lab bounded nostril surface frame', () => {
  for (const side of [-1, 1]) for (const degrees of [0, 10, 35, 60, 75, 85]) {
    it('seats or caps a ' + degrees + '-degree normal at 60 degrees on side ' + side, () => {
      const normal = new T.Vector3(-Math.sin(radians(degrees)), 0, side * Math.cos(radians(degrees)));
      const saved = normal.toArray();
      const frame = frameFor(T, normal, side, Math.PI / 3);
      expect(frame).not.toBeNull();
      expect(frame.length()).toBeCloseTo(1, 12);
      const outward = axisFor(side).applyQuaternion(frame);
      expect(outward.angleTo(axisFor(side))).toBeCloseTo(radians(Math.min(60, degrees)), 10);
      expect(outward.z * side).toBeGreaterThan(0);
      expect(outward.x).toBeLessThanOrEqual(1e-12);
      expect(outward.angleTo(normal)).toBeLessThanOrEqual(radians(Math.max(0, degrees - 60)) + 1e-9);
      expect(normal.toArray()).toEqual(saved);
    });
  }
  it('produces mirrored axes and tangent up vectors from oblique snout normals', () => {
    const axes = [-1, 1].map(side => {
      const normal = new T.Vector3(-.7, .12, side * .7).normalize();
      const frame = frameFor(T, normal, side, Math.PI / 3);
      const outward = axisFor(side).applyQuaternion(frame);
      closeVector(outward, normal);
      expect(Math.abs(new T.Vector3(0, 1, 0).applyQuaternion(frame).dot(outward))).toBeLessThan(1e-12);
      return outward;
    });
    expect(axes[0].x).toBeCloseTo(axes[1].x, 12);
    expect(axes[0].y).toBeCloseTo(axes[1].y, 12);
    expect(axes[0].z).toBeCloseTo(-axes[1].z, 12);
  });
  for (const [label, cap] of [['zero', 0], ['negative', -.1], ['infinite', Infinity], ['NaN', NaN]]) {
    it('rejects a ' + label + ' display cap', () => {
      expect(frameFor(T, new T.Vector3(-.2, 0, .98), 1, cap)).toBeNull();
    });
  }
});

describe('Dino Lab concentric nostril opening and rim', () => {
  for (const size of [.003, 1, 24]) for (const side of [-1, 1]) {
    it('preserves the rigid pair, shape and materials at scale ' + size + ', side ' + side, () => {
      const legacy = constructNostrils(side, size, null);
      const seated = constructNostrils(side, size, new T.Vector3(-.7, .12, side * .7));
      try {
        expectLegacy(legacy, side, size);
        const frame = seated.nostril.quaternion.clone();
        const outward = axisFor(side).applyQuaternion(frame);
        closeVector(seated.nostril.position, seated.hitPoint.clone().addScaledVector(outward, seated.radius * .08), size * 1e-10);
        // The rim remains on the opening axis with a shallow outward offset.
        const rimOffset = seated.nostrilRim.position.clone().sub(seated.nostril.position);
        closeVector(rimOffset, outward.clone().multiplyScalar(seated.radius * .12), size * 1e-10);
        expect(rimOffset.length()).toBeCloseTo(seated.radius * .12, 10);
        expect(seated.nostrilRim.quaternion.toArray()).toEqual(seated.nostril.quaternion.toArray());
        // Measure the actual transformed surfaces: the opening must sit behind
        // the rim's outward peak rather than protruding as a rounded button.
        const openingPeak = outwardPeak(seated.nostril, seated.nostrilPos, outward);
        const rimPeak = outwardPeak(seated.nostrilRim, seated.nostrilPos, outward);
        expect(rimPeak - openingPeak).toBeGreaterThan(seated.radius * .1);
        expect(openingPeak).toBeCloseTo(seated.radius * .16, 8);
        for (let i = 0; i < 2; i++) {
          const actual = seated.parts[i], original = legacy.parts[i];
          closeVector(actual.position.clone().sub(seated.nostrilPos).applyQuaternion(frame.clone().invert()),
            new T.Vector3(0, 0, i === 0 ? 0 : side * seated.radius * .12), size * 1e-9);
          expect(actual.scale.x).toBe(original.scale.x);
          expect(actual.scale.y).toBe(original.scale.y);
          expect(actual.scale.z).toBe(i === 0 ? .16 : original.scale.z);
          expect(actual.geometry.type).toBe(original.geometry.type);
          expect(actual.geometry.parameters).toEqual(original.geometry.parameters);
          expect(Array.from(actual.geometry.attributes.position.array)).toEqual(Array.from(original.geometry.attributes.position.array));
          expect(Array.from(actual.geometry.attributes.normal.array)).toEqual(Array.from(original.geometry.attributes.normal.array));
          expect(Array.from(actual.geometry.attributes.uv.array)).toEqual(Array.from(original.geometry.attributes.uv.array));
          expect(Array.from(actual.geometry.index.array)).toEqual(Array.from(original.geometry.index.array));
          expect(actual.renderOrder).toBe(original.renderOrder);
          expect(actual.castShadow).toBe(original.castShadow);
          expect(actual.receiveShadow).toBe(original.receiveShadow);
          expect(actual.material).toBe(i === 0 ? seated.nostrilMat : seated.headMat);
          expect(actual.userData.dinoSurfaceSeatedNostril).toBe(true);
          expect(actual.userData.dinoRegion).toBe('head');
          expect(actual.userData.dinoNostrilRole).toBe(i === 0 ? 'opening' : 'rim');
          expect(actual.userData.dinoNostrilSide).toBe(side);
          expect(actual.userData.dinoNostrilFrame).toEqual(frame.toArray());
          expect([...actual.position.toArray(), ...actual.quaternion.toArray(), ...actual.scale.toArray()].every(Number.isFinite)).toBe(true);
        }
        expect(seated.anchorRequests).toHaveLength(1);
        closeVector(seated.anchorRequests[0][2], new T.Vector3(legacy.nostrilPos.x, legacy.nostrilPos.y, side * seated.surfaceHeadDepth * 3), size * 1e-10);
        expect(seated.anchorRequests[0][3].toArray()).toEqual([0, 0, -side]);
        expect(seated.anchorRequests[0][4]).toBe(seated.surfaceHeadDepth * 6);
        expect(seated.motionParts).toEqual(seated.parts);
        expect(seated.motionParts).not.toContain(seated.neck);
      } finally { legacy.dispose(); seated.dispose(); }
    });
  }
  for (const kind of ['MeshBasicMaterial', 'MeshPhongMaterial', 'MeshStandardMaterial']) {
    it('uses a dark linear-color clone without altering the shared mouth material for ' + kind, () => {
      const pair = constructNostrils(1, 1, new T.Vector3(-.7, .12, .7), true, kind);
      try {
        expect(pair.nostrilMat).not.toBe(pair.mouthMat);
        expect(pair.nostrilMat.type).toBe(pair.mouthMat.type);
        expect(pair.nostrilMat.color).not.toBe(pair.mouthMat.color);
        const original = new T.Color(0x241a17);
        expect(pair.mouthMat.color.toArray()).toEqual(original.toArray());
        const toLinear = channel => channel <= .04045 ? channel / 12.92 : Math.pow((channel + .055) / 1.055, 2.4);
        for (const key of ['r', 'g', 'b']) {
          expect(pair.nostrilMat.color[key]).toBeCloseTo(toLinear(original[key]), 10);
          expect(pair.nostrilMat.color[key]).toBeLessThan(pair.mouthMat.color[key]);
        }
        for (const key of ['transparent', 'opacity', 'depthWrite', 'depthTest', 'side', 'roughness', 'metalness', 'shininess'])
          expect(pair.nostrilMat[key]).toEqual(pair.mouthMat[key]);
      } finally { pair.dispose(); }
    });
  }
  it('reuses the single cloned opening material for the second supported side', () => {
    const pair = constructNostrils(1, 1, new T.Vector3(-.7, .12, .7));
    let mirror;
    try {
      pair.mouthMat.clone = () => { throw Error('A supported second nostril should reuse the existing material.'); };
      mirror = pair.constructMirror();
      expect(mirror.nostril.userData.dinoSurfaceSeatedNostril).toBe(true);
      expect(mirror.nostril.userData.dinoNostrilSide).toBe(-1);
      expect(mirror.nostrilMat).toBe(pair.nostrilMat);
      expect(mirror.nostril.material).toBe(pair.nostril.material);
      expect(pair.mouthMat.color.toArray()).toEqual(new T.Color(0x241a17).toArray());
    } finally {
      if (mirror) { mirror.nostril.geometry.dispose(); mirror.nostrilRim.geometry.dispose(); }
      pair.dispose();
    }
  });
  for (const side of [-1, 1]) for (const [label, makeNormal] of [
    ['missing hit', () => null],
    ['zero normal', () => new T.Vector3()],
    ['NaN normal', () => new T.Vector3(NaN, 0, side)],
    ['infinite normal', () => new T.Vector3(0, Infinity, side)],
    ['opposite side', () => new T.Vector3(-.2, 0, -side * .98)],
    ['rear facing', () => new T.Vector3(.3, 0, side * .95)],
    ['tangent', () => new T.Vector3(-1, 0, 0)],
    ['grazing', () => new T.Vector3(-Math.sin(radians(89)), 0, side * Math.cos(radians(89)))],
  ]) {
    it('retains exact lateral fallback for ' + label + ' on side ' + side, () => {
      const pair = constructNostrils(side, 1, makeNormal());
      try { expectLegacy(pair, side, 1); }
      finally { pair.dispose(); }
    });
  }
  it('keeps both seated attachments in the production cranial rig through compound looks', () => {
    const pair = constructNostrils(-1, 1, new T.Vector3(-.7, .12, -.7));
    try {
      const { model, neck } = pair, rig = new T.Group();
      const pivot = new T.Vector3(2.7, 1.4, -.3);
      neck.position.copy(pivot);
      neck.rotation.set(.2, -.1, .04);
      const rest = neck.quaternion.clone(), savedRest = rest.toArray();
      const saved = pair.parts.map(part => ({ position: part.position.clone(), quaternion: part.quaternion.clone(),
        scale: part.scale.clone(), geometry: geometrySnapshot(part.geometry) }));
      pair.motionParts.forEach(part => rig.add(part)); model.add(rig);
      for (const angles of [[.04, .08, .02], [-.1, -.2, .04], [.2, -.1, .04]]) {
        neck.rotation.set(...angles); neck.scale.z = 1.014;
        poseCranium(T, rig, pivot, neck, rest); model.updateMatrixWorld(true);
        pair.parts.forEach((part, i) => {
          expect(part.parent).toBe(rig);
          expect(part.userData.dinoMotionParent).toBe('cranial');
          expect(part.position.toArray()).toEqual(saved[i].position.toArray());
          expect(part.quaternion.toArray()).toEqual(saved[i].quaternion.toArray());
          expect(part.scale.toArray()).toEqual(saved[i].scale.toArray());
          expectGeometryUnchanged(part.geometry, saved[i].geometry);
          const expected = saved[i].position.clone().sub(pivot).applyQuaternion(rest.clone().invert())
            .applyQuaternion(neck.quaternion).add(pivot);
          closeVector(part.getWorldPosition(new T.Vector3()), expected);
        });
        const distance = pair.nostril.getWorldPosition(new T.Vector3()).distanceTo(pair.nostrilRim.getWorldPosition(new T.Vector3()));
        expect(distance).toBeCloseTo(pair.radius * .12, 11);
        expect(neck.parent).toBe(model);
        expect(rest.toArray()).toEqual(savedRest);
      }
    } finally { pair.dispose(); }
  });
});
