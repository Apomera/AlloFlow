import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const { rayPoint, probe } = new Function(source.slice(source.indexOf('  var ISS_GM ='), source.indexOf('  function issTransferPlan(')) + '\nreturn { rayPoint: issMapMotionRayPoint, probe: issMapMotionProbe };')();
const radians = Math.PI / 180;
const dot = (a, b) => a.reduce((sum, value, axis) => sum + value * b[axis], 0);
const add = (a, b) => a.map((value, axis) => value + b[axis]);
const subtract = (a, b) => a.map((value, axis) => value - b[axis]);
const scale = (a, value) => a.map(component => component * value);
const length = a => Math.hypot(...a);
function vectorClose(actual, expected, digits = 10) {
  expect(actual).toHaveLength(3);
  actual.forEach((value, axis) => expect(value).toBeCloseTo(expected[axis], digits));
}

// Build station-frame rays with an independent forward matrix transform;
// production code has to recover the local coordinates with the inverse.
function rotate(point, alpha = 0, feather = 0) {
  const a = alpha * radians, f = feather * radians;
  const rx = [[1, 0, 0], [0, Math.cos(a), -Math.sin(a)], [0, Math.sin(a), Math.cos(a)]];
  const rz = [[Math.cos(f), -Math.sin(f), 0], [Math.sin(f), Math.cos(f), 0], [0, 0, 1]];
  const first = rz.map(row => dot(row, point));
  return rx.map(row => dot(row, first));
}
function rayTo(localPoint, pose, localOffset = [.8, 4, -.6]) {
  return {
    origin: rotate(add(localPoint, localOffset), pose.alpha, pose.feather),
    direction: rotate(scale(localOffset, -1), pose.alpha, pose.feather),
    distance: length(localOffset),
  };
}
function pointAt(span, chord, side) { return [-.45 + .9 * chord, .02, side * (.3 + 3.4 * span)]; }
function expectFiniteHit(hit) {
  expect(hit).not.toBeNull();
  expect(hit.localPoint.every(Number.isFinite)).toBe(true);
  expect(Number.isFinite(hit.distance)).toBe(true); expect(hit.distance).toBeGreaterThanOrEqual(0);
  expect(hit.span).toBeGreaterThanOrEqual(0); expect(hit.span).toBeLessThanOrEqual(1);
  expect(hit.chord).toBeGreaterThanOrEqual(0); expect(hit.chord).toBeLessThanOrEqual(1);
  expect([-1, 1]).toContain(hit.side); expect(typeof hit.clamped).toBe('boolean');
  vectorClose(hit.localPoint, pointAt(hit.span, hit.chord, hit.side));
}

const poses = [
  { alpha: 0, feather: 0 },
  { alpha: 61, feather: -37 },
  { alpha: -122, feather: 54 },
  { alpha: 179.9999, feather: -89 },
  { alpha: -180, feather: 90 },
];

describe('space station material-point surface ray', () => {
  it.each(poses)('recovers material coordinates through actual alpha=$alpha and feather=$feather rotations', pose => {
    for (const side of [-1, 1]) for (const [span, chord] of [[.1, .2], [.5, .5], [.9, .8]]) {
      const local = pointAt(span, chord, side), ray = rayTo(local, pose);
      const hit = rayPoint(ray.origin, ray.direction, pose, side);
      expectFiniteHit(hit); expect(hit.clamped).toBe(false);
      expect(hit.side).toBe(side); expect(hit.span).toBeCloseTo(span, 11); expect(hit.chord).toBeCloseTo(chord, 11);
      expect(hit.distance).toBeCloseTo(ray.distance, 11); vectorClose(hit.localPoint, local);
      vectorClose(rotate(hit.localPoint, pose.alpha, pose.feather), add(ray.origin, scale(ray.direction, hit.distance / length(ray.direction))));
    }
  });

  it('accepts forward intersections from either face of the same panel', () => {
    const pose = { alpha: -73, feather: 42 }, local = pointAt(.35, .7, -1);
    for (const height of [-5, 5]) {
      const ray = rayTo(local, pose, [.7, height, .4]);
      const hit = rayPoint(ray.origin, ray.direction, pose, -1);
      expectFiniteHit(hit); vectorClose(hit.localPoint, local);
      expect(hit.distance).toBeCloseTo(ray.distance, 11);
    }
  });

  it('keeps the hit and physical ray distance invariant under positive direction scaling', () => {
    const pose = { alpha: 116, feather: -63 }, ray = rayTo(pointAt(.7, .4, 1), pose);
    const expected = rayPoint(ray.origin, ray.direction, pose, 1);
    for (const factor of [1e-6, .2, 3, 1e6]) {
      const hit = rayPoint(ray.origin, scale(ray.direction, factor), pose, 1);
      expectFiniteHit(hit); vectorClose(hit.localPoint, expected.localPoint);
      expect(hit.span).toBeCloseTo(expected.span, 11); expect(hit.chord).toBeCloseTo(expected.chord, 11);
      expect(hit.distance).toBeCloseTo(expected.distance, 11); expect(hit.clamped).toBe(expected.clamped);
    }
  });

  it('rejects parallel and near-edge-on rays using their normalized local direction', () => {
    const local = pointAt(.5, .5, 1);
    for (const pose of poses) for (const sign of [-1, 1]) for (const normalAmount of [0, .079, .081]) {
      const direction = [Math.sqrt(1 - normalAmount * normalAmount), sign * normalAmount, 0];
      const origin = subtract(local, scale(direction, 5));
      for (const factor of [.001, 1000]) {
        const hit = rayPoint(rotate(origin, pose.alpha, pose.feather), scale(rotate(direction, pose.alpha, pose.feather), factor), pose, 1);
        if (normalAmount < .08) expect(hit).toBeNull();
        else { expectFiniteHit(hit); vectorClose(hit.localPoint, local, 9); expect(hit.distance).toBeCloseTo(5, 9); }
      }
    }
  });

  it('rejects intersections behind the ray origin', () => {
    for (const pose of poses) for (const side of [-1, 1]) {
      const ray = rayTo(pointAt(.5, .5, side), pose);
      expect(rayPoint(ray.origin, scale(ray.direction, -1), pose, side)).toBeNull();
    }
  });

  it('handles a ray beginning on the panel plane without a division or distance singularity', () => {
    const hit = rayPoint([0, .02, 2], [0, -1, 0], { alpha: 0, feather: 0 }, 1);
    expectFiniteHit(hit); expect(hit.distance).toBeCloseTo(0, 12); expect(hit.clamped).toBe(false);
    expect(hit.span).toBeCloseTo(.5, 12); expect(hit.chord).toBe(.5);
  });

  it('clamps chord and span to the locked panel, including drags through the central gap', () => {
    for (const [x, z, side, span, chord] of [
      [-9, 2, 1, .5, 0], [9, 2, 1, .5, 1],
      [.1, -5, 1, 0, (.1 + .45) / .9], [.1, 10, 1, 1, (.1 + .45) / .9],
      [.1, 4, -1, 0, (.1 + .45) / .9], [.1, -10, -1, 1, (.1 + .45) / .9],
      [9, -99, -1, 1, 1], [0, 0, 1, 0, .5], [0, 0, -1, 0, .5],
    ]) {
      const hit = rayPoint([x, 4, z], [0, -3, 0], {}, side);
      expectFiniteHit(hit); expect(hit.clamped).toBe(true); expect(hit.side).toBe(side);
      expect(hit.span).toBeCloseTo(span, 12); expect(hit.chord).toBeCloseTo(chord, 12);
      vectorClose(hit.localPoint, pointAt(span, chord, side));
      // This is the distance to the original ray/plane crossing, not a longer
      // distance to the material point after its coordinates have been clamped.
      expect(hit.distance).toBeCloseTo(3.98, 12);
    }
  });

  it('includes all exact panel corners and leaves a clamped edge immediately on reversal', () => {
    for (const side of [-1, 1]) for (const span of [0, 1]) for (const chord of [0, 1]) {
      const local = pointAt(span, chord, side), ray = rayTo(local, {}, [0, 3, 0]);
      const hit = rayPoint(ray.origin, ray.direction, {}, side);
      expectFiniteHit(hit); vectorClose(hit.localPoint, local); expect(hit.clamped).toBe(false);
    }
    const outside = rayPoint([1, 3, 2], [0, -1, 0], {}, 1);
    const inside = rayPoint([.44, 3, 2], [0, -1, 0], {}, 1);
    expect(outside.chord).toBe(1); expect(outside.clamped).toBe(true);
    expect(inside.chord).toBeCloseTo((.44 + .45) / .9, 12); expect(inside.clamped).toBe(false);
    expect(inside.chord).toBeLessThan(outside.chord);
  });

  it('rejects invalid vectors and zero directions instead of substituting a material point', () => {
    for (const invalid of [undefined, null, [], [1, 2], [1, 2, 3, 4], [0, NaN, 0], [0, Infinity, 0], [-Infinity, 0, 0], ['0', 1, 0], {}, true]) {
      expect(rayPoint(invalid, [0, -1, 0], {}, 1)).toBeNull();
      expect(rayPoint([0, 3, 2], invalid, {}, 1)).toBeNull();
    }
    expect(rayPoint([0, 3, 2], [0, 0, 0], {}, 1)).toBeNull();
  });

  it('normalizes pose angles and defaults invalid pose fields and panel sides', () => {
    const point = pointAt(.4, .6, -1), pose = { alpha: 90, feather: 90 }, ray = rayTo(point, pose);
    const expected = rayPoint(ray.origin, ray.direction, pose, -1);
    const wrapped = rayPoint(ray.origin, ray.direction, { alpha: 450, feather: 130 }, '-1');
    vectorClose(wrapped.localPoint, expected.localPoint); expect(wrapped.distance).toBeCloseTo(expected.distance, 12);
    const flat = rayPoint([0, 3, 2], [0, -1, 0], {}, 1);
    for (const invalid of [undefined, null, '', NaN, Infinity, -Infinity, 'bad']) {
      expect(rayPoint([0, 3, 2], [0, -1, 0], { alpha: invalid, feather: invalid }, invalid)).toEqual(flat);
    }
    expect(rayPoint([0, 3, 2], [0, -1, 0])).toEqual(flat);
    expect(rayPoint([0, 3, 2], [0, -1, 0], null)).toEqual(flat);
  });

  it('does not mutate ray inputs or share returned local-point arrays', () => {
    const pose = Object.freeze({ alpha: 43, feather: -27 }), ray = rayTo(pointAt(.2, .7, -1), pose);
    const origin = Object.freeze(ray.origin.slice()), direction = Object.freeze(ray.direction.slice());
    const expected = rayPoint(origin, direction, pose, -1), changed = rayPoint(origin, direction, pose, -1);
    expect(changed.localPoint).not.toBe(expected.localPoint); changed.localPoint[0] = 999; changed.span = 999;
    expect(rayPoint(origin, direction, pose, -1)).toEqual(expected);
    expect(origin).toEqual(ray.origin); expect(direction).toEqual(ray.direction);
    expect(pose).toEqual({ alpha: 43, feather: -27 });
  });
});

describe('space station motion probe across the full panel chord', () => {
  it('preserves the original outer-edge default and clamps chord coordinates', () => {
    expect(probe()).toEqual(probe({ chord: 1 }));
    for (const [chord, expected] of [[0, -.45], [.5, 0], [1, .45], [-2, -.45], [4, .45]]) {
      const state = probe({ chord });
      expect(state.localPoint[0]).toBeCloseTo(expected, 12);
      expect(state.chord).toBe(Math.max(0, Math.min(1, chord)));
    }
    for (const invalid of [undefined, null, '', NaN, Infinity, -Infinity, 'bad']) expect(probe({ chord: invalid })).toEqual(probe());
    expect(probe({ chord: '.25' })).toEqual(probe({ chord: .25 }));
  });

  it('matches independent velocity derivatives throughout the two-dimensional material surface', () => {
    const alpha = 53, feather = -41, alphaRate = -.4, featherRate = .2, h = .001;
    for (const side of [-1, 1]) for (const span of [.25, .9]) for (const chord of [0, .2, .5, .8, 1]) {
      const local = pointAt(span, chord, side), state = probe({ alpha, feather, alphaRate, featherRate, side, span, chord });
      const next = rotate(local, alpha + h * alphaRate, feather + h * featherRate);
      const previous = rotate(local, alpha - h * alphaRate, feather - h * featherRate);
      vectorClose(state.position, rotate(local, alpha, feather));
      vectorClose(state.velocity, scale(subtract(next, previous), 1 / (2 * h)), 8);
      expect(state.radius).toBeCloseTo(length(local), 12);
      expect(dot(state.position, state.velocity)).toBeCloseTo(0, 12);
    }
  });

  it('round-trips a ray-selected material point into the same actual rotated probe location', () => {
    for (const pose of poses) for (const side of [-1, 1]) {
      const target = pointAt(.61, .32, side), ray = rayTo(target, pose), hit = rayPoint(ray.origin, ray.direction, pose, side);
      const state = probe({ ...pose, span: hit.span, chord: hit.chord, side: hit.side, alphaRate: .13, featherRate: -.09 });
      vectorClose(state.localPoint, hit.localPoint);
      vectorClose(state.position, add(ray.origin, scale(ray.direction, hit.distance / length(ray.direction))));
      expect(state.chord).toBeCloseTo(.32, 11); expect(state.span).toBeCloseTo(.61, 11);
    }
  });

  it('varies feather speed across chord while preserving its independence from span', () => {
    const featherRate = .35;
    for (const chord of [0, .2, .5, .8, 1]) {
      const expected = Math.hypot(-.45 + .9 * chord, .02) * featherRate * radians;
      for (const side of [-1, 1]) for (const span of [0, .5, 1]) {
        const state = probe({ alpha: 48, feather: -31, featherRate, chord, span, side });
        expect(state.featherSpeed).toBeCloseTo(expected, 12);
      }
    }
    const center = probe({ chord: .5, featherRate }), left = probe({ chord: 0, featherRate }), right = probe({ chord: 1, featherRate });
    expect(center.featherSpeed).toBeGreaterThan(0); // The surface is offset .02 from the feather axis.
    expect(center.featherSpeed).toBeLessThan(left.featherSpeed); expect(left.featherSpeed).toBeCloseTo(right.featherSpeed, 12);
    expect(left.featherVelocity[1]).toBeLessThan(0); expect(right.featherVelocity[1]).toBeGreaterThan(0);
  });

  it('supports exact opposing joint contributions at the center chord', () => {
    const state = probe({ chord: .5, span: 0, side: 1, alpha: 63, feather: -90, alphaRate: .01, featherRate: .15, scale: 600 });
    expect(state.rotationSpeed).toBeGreaterThan(0); expect(state.featherSpeed).toBeGreaterThan(0);
    vectorClose(state.rotationVelocity, scale(state.featherVelocity, -1), 12);
    expect(state.speed).toBeLessThan(1e-14); vectorClose(state.velocityEnd, state.position);
  });

  it('keeps full-surface arrows tangent and inside the existing fixed motion envelope', () => {
    for (const side of [-1, 1]) for (const chord of [0, .5, 1]) for (const pose of poses) {
      const state = probe({ ...pose, side, chord, span: 1, alphaRate: 1, featherRate: -1, scale: 600 });
      for (const [endKey, velocityKey] of [['rotationEnd', 'rotationVelocity'], ['featherEnd', 'featherVelocity'], ['velocityEnd', 'velocity']]) {
        const displacement = subtract(state[endKey], state.position);
        expect(length(displacement)).toBeLessThanOrEqual(2.4 + 1e-12);
        expect(dot(state.position, displacement)).toBeCloseTo(0, 10);
        vectorClose(displacement, scale(state[velocityKey], state.displayScale));
        expect(length(state[endKey])).toBeLessThan(4.8);
      }
      vectorClose(subtract(state.velocityEnd, state.position), add(subtract(state.rotationEnd, state.position), subtract(state.featherEnd, state.position)));
    }
  });
});
