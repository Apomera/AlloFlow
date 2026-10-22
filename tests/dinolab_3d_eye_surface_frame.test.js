import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

// The installed source is the default; preview runs can pin an exact candidate.
const source = readFileSync(process.env.DINO_EYE_FRAME_SOURCE || resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
const T = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
function sourceFunctionText(name) {
  const start = source.indexOf('  function ' + name + '(');
  if (start < 0) throw Error('Missing actual source helper: ' + name);
  const open = source.indexOf('{', start);
  let depth = 1, end = open + 1;
  while (depth && end < source.length) {
    if (source[end] === '{') depth++;
    if (source[end] === '}') depth--;
    end++;
  }
  if (depth) throw Error('Unclosed source helper: ' + name);
  return source.slice(start, end);
}
function sourceFunction(name) {
  return new Function(sourceFunctionText(name) + '; return ' + name + ';')();
}
const frameFor = sourceFunction('dinoEyeSurfaceFrame');
const eyeGeometry = sourceFunction('dinoEyeGeometry');
const { eyelidGeometry, updateEyelid } = new Function(
  sourceFunctionText('dinoEyelidGeometry') + '\n' + sourceFunctionText('dinoUpdateEyelid') +
  '\nreturn { eyelidGeometry: dinoEyelidGeometry, updateEyelid: dinoUpdateEyelid };'
)();
const radians = degrees => degrees * Math.PI / 180;
const axisFor = side => new T.Vector3(0, 0, side);
const closeVector = (a, b, tolerance = 1e-9) => expect(a.distanceTo(b)).toBeLessThan(tolerance);
const speciesCases = ['tyrannosaurus', 'triceratops', 'microraptor', 'brachiosaurus', 'stegosaurus'];

// Execute the actual six-mesh construction and in-place transform section. The
// surface hit is a controlled math fixture, with the production frame helper.
const eyeStart = source.indexOf('                var eyePos = head.clone().add(');
const eyeEnd = source.indexOf('                idleMotion.eyes.push(', eyeStart);
if (eyeStart < 0 || eyeEnd < 0) throw Error('Missing actual eye construction block.');
const eyeBlock = source.slice(eyeStart, eyeEnd);
function constructEyes(side, size, normal, species = 'tyrannosaurus', headShell = {}) {
  const material = new T.MeshBasicMaterial();
  const model = new T.Group();
  const facialStrips = [];
  let anchorCalls = 0;
  const context = {
    THREE: T, head: new T.Vector3(2, 3, 0).multiplyScalar(size),
    surfaceSnout: new T.Vector3(0, 3, 0).multiplyScalar(size),
    surfaceHeadLength: 2 * size, surfaceHeadHeight: .8 * size,
    surfaceHeadDepth: .6 * size, faceSide: side, eyeRadius: .1 * size,
    cranialSurface: { eyeForwardScale: 1, eyeHeightScale: 1, browScale: 1 },
    props: { species: { id: species } }, headShell, theropodCranium: null, sauropodCranium: null,
    vec: (x, y, z) => new T.Vector3(x, y, z),
    faceSurfacePoint: (p, s, inset) => headShell ? p.clone().add(new T.Vector3(0, 0, s * inset)) : p,
    dinoSurfaceAnchor: () => {
      if (!headShell) throw Error('A missing head surface must not be queried.');
      anchorCalls++;
      return normal ? { point: new T.Vector3(1.6, 3.24, side * .564).multiplyScalar(size), normal } : null;
    },
    dinoEyeSurfaceFrame: frameFor, dinoEyeGeometry: eyeGeometry, dinoEyelidGeometry: eyelidGeometry,
    // Surface seating has its own real-mesh tests; this fixture isolates rigid frames.
    dinoSeatEyelids: () => false,
    addFacialStrip: points => { facialStrips.push(points.map(point => point.clone())); return null; }, model,
    eyeMat: material, eyePupilMat: material, eyeGlintMat: material,
    corneaMat: material, headMat: material
  };
  const invoke = new Function(...Object.keys(context), eyeBlock + '\nreturn { eye, pupil, glint, cornea, upperLid, lowerLid, eyePos };');
  const result = invoke(...Object.values(context));
  const parts = ['eye', 'pupil', 'glint', 'cornea', 'upperLid', 'lowerLid'].map(key => result[key]);
  return { ...result, parts, model, facialStrips, anchorCalls,
    dispose: () => { parts.forEach(part => part.geometry.dispose()); material.dispose(); } };
}
const blinkStart = source.indexOf('                  idleMotion.eyes.forEach(function (eyeRig) {');
const blinkOpen = source.indexOf('{', blinkStart);
const blinkClose = source.indexOf('                  });', blinkOpen);
if (blinkStart < 0 || blinkClose < 0) throw Error('Missing actual local blink update.');
const applyBlink = new Function('dinoUpdateEyelid', 'eyeRig', 'blinkAmount', source.slice(blinkOpen + 1, blinkClose)).bind(null, updateEyelid);
function blinkRig(eyes) {
  return { ...eyes, eyeBaseY: eyes.eye.scale.y, pupilBaseY: eyes.pupil.scale.y,
    corneaBaseY: eyes.cornea.scale.y, lidBaseY: eyes.upperLid.scale.y };
}

describe('Dino Lab bounded eye surface frame', () => {
  for (const side of [-1, 1]) {
    for (const degrees of [0, 10, 35, 70, 85]) {
      it('caps a ' + degrees + '-degree normal on side ' + side + ' without flipping the eye', () => {
        const normal = new T.Vector3(-Math.sin(radians(degrees)), 0, side * Math.cos(radians(degrees)));
        const frame = frameFor(T, normal, side, radians(35));
        expect(frame).not.toBeNull();
        expect(frame.length()).toBeCloseTo(1, 12);
        const axis = axisFor(side).applyQuaternion(frame);
        expect(axis.angleTo(axisFor(side))).toBeCloseTo(radians(Math.min(35, degrees)), 10);
        expect(axis.z * side).toBeGreaterThan(0);
        expect(axis.x).toBeLessThanOrEqual(1e-12);
        expect(axis.angleTo(normal)).toBeLessThanOrEqual(Math.max(0, radians(degrees - 35)) + 1e-9);
      });
    }
    it('matches an unconstrained oblique surface normal exactly on side ' + side, () => {
      const normal = new T.Vector3(-.2, .08, side * .98).normalize();
      const frame = frameFor(T, normal, side, radians(35));
      closeVector(axisFor(side).applyQuaternion(frame), normal);
      const localUp = new T.Vector3(0, 1, 0).applyQuaternion(frame);
      expect(Math.abs(localUp.dot(normal))).toBeLessThan(1e-12);
    });
  }
  it('produces mirrored eye axes from mirrored smooth normals', () => {
    const axes = [-1, 1].map(side => axisFor(side).applyQuaternion(
      frameFor(T, new T.Vector3(-.45, .12, side * .89), side, radians(35))));
    expect(axes[0].x).toBeCloseTo(axes[1].x, 12);
    expect(axes[0].y).toBeCloseTo(axes[1].y, 12);
    expect(axes[0].z).toBeCloseTo(-axes[1].z, 12);
  });
  const invalid = [
    ['missing', null, 1, radians(35)],
    ['zero', new T.Vector3(), 1, radians(35)],
    ['NaN', new T.Vector3(NaN, 0, 1), 1, radians(35)],
    ['infinite', new T.Vector3(0, Infinity, 1), 1, radians(35)],
    ['wrong right side', new T.Vector3(-.2, 0, -.98), 1, radians(35)],
    ['wrong left side', new T.Vector3(-.2, 0, .98), -1, radians(35)],
    ['rear-facing', new T.Vector3(.3, 0, .95), 1, radians(35)],
    ['tangent to side', new T.Vector3(-1, 0, 0), 1, radians(35)],
    ['grazing right side', new T.Vector3(-Math.sin(radians(89)), 0, Math.cos(radians(89))), 1, radians(35)],
    ['grazing left side', new T.Vector3(-Math.sin(radians(89)), 0, -Math.cos(radians(89))), -1, radians(35)],
    ['zero cap', new T.Vector3(-.2, 0, .98), 1, 0],
    ['negative cap', new T.Vector3(-.2, 0, .98), 1, -.1],
    ['nonfinite cap', new T.Vector3(-.2, 0, .98), 1, Infinity]
  ];
  for (const [name, normal, side, cap] of invalid) {
    it('preserves caller fallback for ' + name, () => expect(frameFor(T, normal, side, cap)).toBeNull());
  }
});

describe('Dino Lab fixed eye stack and moving lids in a local surface frame', () => {
  for (const species of speciesCases) for (const size of [.003, 1, 24]) for (const side of [-1, 1]) {
    it('preserves ' + species + ' rigid six-part offsets and fixed globe transforms through each blink at size ' + size + ', side ' + side, () => {
      const original = constructEyes(side, size, null, species);
      const oriented = constructEyes(side, size, new T.Vector3(-.45, .12, side * .89), species);
      try {
        expect(original.model.children.length).toBe(6);
        expect(oriented.model.children.length).toBe(6);
        expect(oriented.anchorCalls).toBe(1);
        // Preserve the original surface-projected brow geometry while the eye
        // stack changes frame. A changed inset must not silently move the brow.
        expect(oriented.facialStrips.map(points => points.map(point => point.toArray())))
          .toEqual(original.facialStrips.map(points => points.map(point => point.toArray())));
        const frame = oriented.eye.quaternion.clone();
        expect(frame.length()).toBeCloseTo(1, 12);
        for (let i = 0; i < 6; i++) {
          const a = original.parts[i], b = oriented.parts[i];
          closeVector(b.position.clone().sub(oriented.eyePos).applyQuaternion(frame.clone().invert()),
            a.position.clone().sub(original.eyePos), size * 1e-9);
          expect(frame.clone().invert().multiply(b.quaternion).angleTo(a.quaternion)).toBeLessThan(1e-7);
          expect(b.scale.toArray()).toEqual(a.scale.toArray());
          expect(b.renderOrder).toBe(a.renderOrder);
          expect(b.geometry.type).toBe(a.geometry.type);
          expect(b.geometry.attributes.position.count).toBe(a.geometry.attributes.position.count);
          expect(b.userData.dinoSurfaceSeatedEye).toBe(true);
          expect(b.material).toBe(oriented.eye.material);
          expect([...b.position.toArray(), ...b.quaternion.toArray(), ...b.scale.toArray()].every(Number.isFinite)).toBe(true);
        }
        // Distances, rather than implementation-specific transform components,
        // establish that the parts remain one rigid, concentric stack.
        for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++)
          expect(oriented.parts[i].position.distanceTo(oriented.parts[j].position))
            .toBeCloseTo(original.parts[i].position.distanceTo(original.parts[j].position), 10);
        expect(oriented.upperLid.quaternion.toArray()).toEqual(oriented.lowerLid.quaternion.toArray());
        const originalRig = blinkRig(original), orientedRig = blinkRig(oriented);
        const originalTransforms = oriented.parts.map(p => ({position: p.position.clone(), quaternion: p.quaternion.clone(), scale: p.scale.clone()}));
        const openLid = Array.from(oriented.upperLid.geometry.attributes.position.array);
        for (const amount of [0, .5, 1, 0]) {
          applyBlink(originalRig, amount); applyBlink(orientedRig, amount);
          oriented.parts.forEach((part, index) => {
            expect(part.scale.toArray()).toEqual(original.parts[index].scale.toArray());
            expect(part.scale.toArray()).toEqual(originalTransforms[index].scale.toArray());
            closeVector(part.position, originalTransforms[index].position, size * 1e-10);
            expect(part.quaternion.angleTo(originalTransforms[index].quaternion)).toBeLessThan(1e-7);
          });
          expect(oriented.glint.visible).toBe(original.glint.visible);
          expect(oriented.glint.visible).toBe(amount < .48);
          for (const key of ['upperLid', 'lowerLid']) {
            expect(Array.from(oriented[key].geometry.attributes.position.array))
              .toEqual(Array.from(original[key].geometry.attributes.position.array));
            expect(oriented[key].geometry.userData.dinoEyelid.lastBlink).toBe(amount);
          }
          if (amount === 0) expect(Array.from(oriented.upperLid.geometry.attributes.position.array)).toEqual(openLid);
          else expect(Array.from(oriented.upperLid.geometry.attributes.position.array)).not.toEqual(openLid);
        }
        expect(oriented.eye.scale.y).toBe(.82);
      } finally { original.dispose(); oriented.dispose(); }
    });
  }
  for (const species of speciesCases) for (const side of [-1, 1]) {
    it('seats the actual ' + species + ' construction in its bounded frame on side ' + side, () => {
      // Deliberately exceed the display cap so routing cannot silently bypass
      // the bounded helper for a newly supported species.
      const normal = new T.Vector3(-Math.sin(radians(70)), .12, side * Math.cos(radians(70))).normalize();
      const expectedFrame = frameFor(T, normal, side, radians(35));
      const eyes = constructEyes(side, 1, normal, species);
      try {
        expect(eyes.anchorCalls).toBe(1);
        expect(eyes.model.children.length).toBe(6);
        expect(eyes.parts.every(part => part.userData.dinoSurfaceSeatedEye)).toBe(true);
        expect(eyes.parts.every(part => part.userData.dinoEyeSide === side)).toBe(true);
        for (const part of eyes.parts) {
          expect(part.quaternion.length()).toBeCloseTo(1, 12);
          expect(part.quaternion.angleTo(expectedFrame)).toBeLessThan(1e-7);
          expect(part.userData.dinoEyeFrame).toEqual(expectedFrame.toArray());
        }
        const eyeAxis = axisFor(side).applyQuaternion(eyes.eye.quaternion);
        closeVector(eyeAxis, axisFor(side).applyQuaternion(expectedFrame));
        expect(eyeAxis.angleTo(axisFor(side))).toBeCloseTo(radians(35), 10);
        expect(eyeAxis.z * side).toBeGreaterThan(0);
        // Seat along the rotated frame, not world Z. New supported species
        // tuck the stack into the skin; preserve Tyrannosaurus's established seat.
        const hitPoint = new T.Vector3(1.6, 3.24, side * .564);
        const inset = .1 * (species === 'tyrannosaurus' ? .14 : .28);
        const seatDelta = eyes.eyePos.clone().sub(hitPoint);
        expect(seatDelta.dot(eyeAxis)).toBeCloseTo(-inset, 12);
        closeVector(seatDelta.clone().addScaledVector(eyeAxis, inset), new T.Vector3());
        closeVector(eyes.eyePos, hitPoint.clone().addScaledVector(eyeAxis, -inset));
        expect(eyes.upperLid.quaternion.toArray()).toEqual(eyes.lowerLid.quaternion.toArray());
      } finally { eyes.dispose(); }
    });
    it('keeps the actual ' + species + ' stack lateral when the head surface is absent on side ' + side, () => {
      const eyes = constructEyes(side, 1, new T.Vector3(-.45, .12, side * .89), species, null);
      try {
        expect(eyes.anchorCalls).toBe(0);
        expect(eyes.model.children.length).toBe(6);
        closeVector(eyes.eyePos, new T.Vector3(1.6, 3.24, side * .564));
        for (const part of eyes.parts) {
          expect(part.userData.dinoSurfaceSeatedEye).toBeUndefined();
          expect(part.userData.dinoEyeFrame).toBeUndefined();
          expect(part.quaternion.angleTo(new T.Quaternion())).toBeLessThan(1e-7);
          expect([...part.position.toArray(), ...part.quaternion.toArray(), ...part.scale.toArray()].every(Number.isFinite)).toBe(true);
        }
        closeVector(axisFor(side).applyQuaternion(eyes.eye.quaternion), axisFor(side));
        expect(eyes.upperLid.quaternion.toArray()).toEqual(eyes.lowerLid.quaternion.toArray());
      } finally { eyes.dispose(); }
    });
    for (const fallback of ['unsupported hit', 'no hit']) {
      it('keeps the actual ' + species + ' stack on its original frame after ' + fallback + ' on side ' + side, () => {
        const normal = fallback === 'unsupported hit' ? new T.Vector3(.4, 0, side * .9) : null;
        const eyes = constructEyes(side, 1, normal, species);
        try {
          expect(eyes.anchorCalls).toBe(1);
          expect(eyes.model.children.length).toBe(6);
          closeVector(eyes.eyePos, new T.Vector3(1.6, 3.24, side * .55));
          for (const part of eyes.parts) {
            expect(part.userData.dinoSurfaceSeatedEye).toBeUndefined();
            expect(part.userData.dinoEyeFrame).toBeUndefined();
            expect(part.quaternion.angleTo(new T.Quaternion())).toBeLessThan(1e-7);
            expect([...part.position.toArray(), ...part.quaternion.toArray(), ...part.scale.toArray()].every(Number.isFinite)).toBe(true);
          }
          closeVector(axisFor(side).applyQuaternion(eyes.eye.quaternion), axisFor(side));
          expect(eyes.upperLid.quaternion.toArray()).toEqual(eyes.lowerLid.quaternion.toArray());
        } finally { eyes.dispose(); }
      });
    }
  }
});
