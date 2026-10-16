import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const { ring, rayAngle, drag, drive } = new Function(
  source.slice(source.indexOf('  var ISS_GM ='), source.indexOf('  function issTransferPlan(')) +
  '\nreturn { ring: issMapJointRing, rayAngle: issMapJointRayAngle, drag: issMapJointDragStep, drive: issMapDriveStep };'
)();

const radians = Math.PI / 180;
const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
const add = (a, b) => a.map((value, i) => value + b[i]);
const scale = (a, factor) => a.map(value => value * factor);
const rotate = a => [a[2], a[0], a[1]]; // A rigid, right-handed 120-degree rotation.
const pointAt = (r, degrees) => add(scale(r.u, r.radius * Math.cos(degrees * radians)), scale(r.v, r.radius * Math.sin(degrees * radians)));

function expectVector(actual, expected, precision = 10) {
  expect(actual).toHaveLength(3);
  actual.forEach((value, i) => expect(value).toBeCloseTo(expected[i], precision));
}

describe('space station direct joint handle geometry', () => {
  it('uses the truss-axis right-hand rotation for the alpha ring', () => {
    const zero = ring('alpha', 0, 70);
    expect(zero).toMatchObject({ axis: 'alpha', angle: 0, radius: 1.55 });
    expectVector(zero.normal, [1, 0, 0]);
    expectVector(zero.u, [0, 0, 1]);
    expectVector(zero.v, [0, -1, 0]);
    expectVector(zero.point, [0, 0, 1.55]);
    expectVector(ring('alpha', 90, -70).point, [0, -1.55, 0]);
    expectVector(ring('alpha', -90, 10).point, [0, 1.55, 0]);
  });

  it('rotates the feather hinge plane with the alpha joint', () => {
    const flat = ring('feather', 0, 90);
    expect(flat).toMatchObject({ axis: 'feather', angle: 90, radius: 1.12 });
    expectVector(flat.normal, [0, 0, 1]);
    expectVector(flat.point, [0, 1.12, 0]);
    const tilted = ring('feather', 90, 90);
    expectVector(tilted.normal, [0, -1, 0]);
    expectVector(tilted.u, [1, 0, 0]);
    expectVector(tilted.v, [0, 0, 1]);
    expectVector(tilted.point, [0, 0, 1.12]);
    expectVector(ring('feather', 90, -90).point, [0, 0, -1.12]);
  });

  it.each(['alpha', 'feather'])('keeps the %s ring orthonormal and its handle on the hinge plane', axis => {
    for (const alpha of [-180, -81.25, 0, 37.125, 180]) {
      for (const feather of [-90, -12.75, 0, 63.125, 90]) {
        const result = ring(axis, alpha, feather);
        for (const vector of [result.normal, result.u, result.v]) expect(dot(vector, vector)).toBeCloseTo(1, 12);
        expect(dot(result.u, result.v)).toBeCloseTo(0, 12);
        expect(dot(result.normal, result.u)).toBeCloseTo(0, 12);
        expect(dot(result.normal, result.v)).toBeCloseTo(0, 12);
        expect(dot(result.point, result.normal)).toBeCloseTo(0, 12);
        expect(dot(result.point, result.point)).toBeCloseTo(result.radius ** 2, 12);
      }
    }
  });

  it('sanitizes joint ranges and defaults an unknown axis to alpha', () => {
    expect(ring('unknown', 540, 120)).toMatchObject({ axis: 'alpha', angle: 180 });
    expect(ring('alpha', -540, 0).angle).toBe(-180);
    expect(ring('alpha', 721, 0).angle).toBe(1);
    expect(ring('feather', 0, 120).angle).toBe(90);
    expect(ring('feather', 0, -120).angle).toBe(-90);
    for (const invalid of [NaN, Infinity, -Infinity, 'bad']) {
      expect(ring('alpha', invalid, invalid).angle).toBe(0);
      expect(ring('feather', invalid, invalid).angle).toBe(0);
    }
  });
});

describe('space station joint ray projection', () => {
  it.each(['alpha', 'feather'])('recovers signed %s angles from either side of the hinge plane', axis => {
    const result = ring(axis, 38.5, -15);
    const center = [12, -7, 3];
    for (const angle of [-179, -90, -12.125, 0, 61.25, 179]) {
      const target = add(center, pointAt(result, angle));
      for (const side of [-1, 1]) {
        const origin = add(target, scale(result.normal, side * 5));
        expect(rayAngle(origin, scale(result.normal, -side), center, result)).toBeCloseTo(angle, 9);
      }
    }
  });

  it('is independent of ray magnitude and distance from the pivot', () => {
    const result = ring('feather', -27, 11);
    const center = [-2, 4, 9];
    const radial = pointAt(result, -47.25);
    for (const distance of [.2, 1, 7]) {
      const target = add(center, scale(radial, distance));
      const origin = add(target, scale(result.normal, 10));
      for (const magnitude of [.001, 1, 1000]) {
        expect(rayAngle(origin, scale(result.normal, -magnitude), center, result)).toBeCloseTo(-47.25, 9);
      }
    }
  });

  it('uses the supplied world-space basis after station rotation and translation', () => {
    const local = ring('feather', 43, -20);
    const world = { ...local, normal: rotate(local.normal), u: rotate(local.u), v: rotate(local.v), point: rotate(local.point) };
    const center = [30, -4, 19];
    const target = add(center, rotate(pointAt(local, 72.875)));
    const origin = add(target, scale(world.normal, 8));
    expect(rayAngle(origin, scale(world.normal, -3), center, world)).toBeCloseTo(72.875, 9);
  });

  it('rejects nearly edge-on rays using a normalized direction threshold', () => {
    const result = ring('alpha', 0, 0);
    const center = [0, 0, 0];
    const target = pointAt(result, 42);
    for (const normalComponent of [.001, .079]) {
      const direction = add(scale(result.normal, -normalComponent), scale(result.u, Math.sqrt(1 - normalComponent ** 2)));
      const origin = add(target, scale(direction, -10));
      expect(rayAngle(origin, direction, center, result)).toBeNull();
      expect(rayAngle(origin, scale(direction, 1000), center, result)).toBeNull();
    }
    const normalComponent = .081;
    const direction = add(scale(result.normal, -normalComponent), scale(result.u, Math.sqrt(1 - normalComponent ** 2)));
    const origin = add(target, scale(direction, -10));
    expect(rayAngle(origin, direction, center, result)).toBeCloseTo(42, 9);
  });

  it('rejects parallel, zero-length, backwards and pivot-center intersections', () => {
    const result = ring('alpha', 0, 0);
    const center = [0, 0, 0];
    expect(rayAngle([5, 0, 1.55], [0, 0, 1], center, result)).toBeNull();
    expect(rayAngle([5, 0, 1.55], [0, 0, 0], center, result)).toBeNull();
    expect(rayAngle([5, 0, 1.55], [1, 0, 0], center, result)).toBeNull();
    expect(rayAngle([5, 0, 0], [-1, 0, 0], center, result)).toBeNull();
    expect(rayAngle([5, 0, 1e-7], [-1, 0, 0], center, result)).toBeNull();
    expect(rayAngle([5, 0, 1e-5], [-1, 0, 0], center, result)).toBeCloseTo(0, 10);
  });

  it('accepts a ray starting on the hinge plane away from its center', () => {
    const result = ring('alpha', 0, 0);
    expect(rayAngle([0, -1, 0], [1, 0, 0], [0, 0, 0], result)).toBeCloseTo(90, 10);
  });

  it('rejects malformed or nonfinite ray coordinates', () => {
    const result = ring('alpha', 0, 0);
    const valid = [[5, 0, 1], [-1, 0, 0], [0, 0, 0]];
    for (const invalid of [null, undefined, [], [1, 2], [1, 2, 3, 4], [NaN, 0, 0], [0, Infinity, 0], [0, 0, -Infinity], ['1', 0, 0]]) {
      for (let index = 0; index < valid.length; index++) {
        const argumentsList = valid.map(value => value.slice());
        argumentsList[index] = invalid;
        expect(rayAngle(...argumentsList, result)).toBeNull();
      }
    }
  });

  it('does not mutate the ring basis or input ray', () => {
    const result = ring('feather', 12, -34);
    Object.values(result).filter(Array.isArray).forEach(Object.freeze);
    Object.freeze(result);
    const center = Object.freeze([3, 7, -2]);
    const origin = Object.freeze(add(add(center, pointAt(result, 27)), scale(result.normal, 10)));
    const direction = Object.freeze(scale(result.normal, -2));
    expect(rayAngle(origin, direction, center, result)).toBeCloseTo(27, 9);
  });
});

describe('space station direct joint dragging', () => {
  it('preserves the grabbed offset instead of snapping the command to the pointer angle', () => {
    expect(drag('alpha', 80, 15, 20)).toBeCloseTo(85, 10);
    expect(drag('feather', -25, 60, 55)).toBeCloseTo(-30, 10);
  });

  it('crosses the pointer seam by the shortest signed displacement', () => {
    expect(drag('alpha', 40, 179, -179)).toBeCloseTo(42, 10);
    expect(drag('alpha', 40, -179, 179)).toBeCloseTo(38, 10);
    expect(drag('feather', 10, 179, -179)).toBeCloseTo(12, 10);
    expect(drag('feather', 10, -179, 179)).toBeCloseTo(8, 10);
  });

  it('wraps the alpha command while preserving a positive half-turn', () => {
    expect(drag('alpha', 179, 0, 2)).toBeCloseTo(-179, 10);
    expect(drag('alpha', -179, 0, -2)).toBeCloseTo(179, 10);
    expect(drag('alpha', 170, 0, 10)).toBeCloseTo(180, 10);
    expect(drag('alpha', -170, 0, -10)).toBeCloseTo(-180, 10);
  });

  it('clamps feather commands and responds immediately when the drag reverses at either stop', () => {
    const upper = drag('feather', 88, 20, 30);
    expect(upper).toBe(90);
    expect(drag('feather', upper, 30, 28)).toBe(88);
    const lower = drag('feather', -88, -20, -30);
    expect(lower).toBe(-90);
    expect(drag('feather', lower, -30, -28)).toBe(-88);
  });

  it('retains a sanitized command when either pointer angle is invalid', () => {
    for (const invalid of [NaN, Infinity, -Infinity, 'bad']) {
      expect(drag('alpha', 370, invalid, 45)).toBe(10);
      expect(drag('alpha', 370, 45, invalid)).toBe(10);
      expect(drag('feather', 110, invalid, 45)).toBe(90);
      expect(drag('feather', -110, 45, invalid)).toBe(-90);
      expect(drag('alpha', invalid, 45, 45)).toBe(0);
    }
  });
});

describe('space station joint commands preserve drive dynamics', () => {
  const moving = {
    phase: 35, beta: 20, tracking: false,
    motorEnabled: true, motorSmooth: true, motorRate: .1, motorAcceleration: .002,
    arrayAlpha: 70, arrayFeather: 20,
    actualAlpha: 20, actualFeather: -10, actualAlphaRate: .04, actualFeatherRate: -.025
  };

  it('changes the target without teleporting either joint or resetting velocity', () => {
    const retargeted = Object.freeze({ ...moving,
      arrayAlpha: drag('alpha', moving.arrayAlpha, 50, -60),
      arrayFeather: drag('feather', moving.arrayFeather, 0, -55)
    });
    const immediate = drive(retargeted, 0);
    expect(immediate.commandAlpha).toBe(-40);
    expect(immediate.commandFeather).toBe(-35);
    expect(immediate.alpha).toBe(moving.actualAlpha);
    expect(immediate.feather).toBe(moving.actualFeather);
    expect(immediate.alphaRate).toBe(moving.actualAlphaRate);
    expect(immediate.featherRate).toBe(moving.actualFeatherRate);
  });

  it('brakes a reversed alpha command within the acceleration bound while continuing its existing motion', () => {
    const dt = .5;
    const next = drive({ ...moving, arrayAlpha: drag('alpha', 70, 50, -60) }, dt);
    expect(next.alphaRate).toBeLessThan(moving.actualAlphaRate);
    expect(next.alphaRate).toBeGreaterThan(0);
    expect(Math.abs(next.alphaRate - moving.actualAlphaRate)).toBeLessThanOrEqual(moving.motorAcceleration * dt + 1e-12);
    expect(Math.abs(next.featherRate - moving.actualFeatherRate)).toBeLessThanOrEqual(moving.motorAcceleration * dt + 1e-12);
    expect(next.alpha).toBeGreaterThan(moving.actualAlpha);
    expect(next.alpha - moving.actualAlpha).toBeLessThanOrEqual(moving.actualAlphaRate * dt + 1e-12);
  });

  it('keeps a dragged speed-limited target bounded by elapsed motor travel', () => {
    const retargeted = { ...moving, motorSmooth: false,
      arrayAlpha: drag('alpha', 70, 50, -60),
      arrayFeather: drag('feather', 20, 0, -55)
    };
    const immediate = drive(retargeted, 0);
    expect(immediate.alpha).toBe(moving.actualAlpha);
    expect(immediate.feather).toBe(moving.actualFeather);
    const next = drive(retargeted, 2);
    expect(Math.abs(next.alpha - moving.actualAlpha)).toBeCloseTo(moving.motorRate * 2, 10);
    expect(Math.abs(next.feather - moving.actualFeather)).toBeCloseTo(moving.motorRate * 2, 10);
  });
});
