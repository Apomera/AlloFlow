import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const { motion } = new Function(
  source.slice(source.indexOf('  var ISS_GM ='), source.indexOf('  function issTransferPlan(')) +
  '\nreturn { motion: issMapArmMotion };'
)();
const radians = Math.PI / 180;

function near(actual, expected, tolerance = 1e-10) {
  expect(Number.isFinite(actual)).toBe(true);
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}
function vector(actual, expected, tolerance = 1e-10) {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((value, index) => near(value, expected[index], tolerance));
}
// Independent forward geometry: rotate each original +Y boom in sequence.
function rotate(point, degrees) {
  const c = Math.cos(degrees * radians), s = Math.sin(degrees * radians);
  return [point[0] * c - point[1] * s, point[0] * s + point[1] * c];
}
function forward(shoulder, elbow) {
  const upper = rotate([0, 1.4], shoulder);
  const distal = rotate(rotate([0, 1.2], elbow), shoulder);
  return [upper[0] + distal[0], upper[1] + distal[1], 0];
}
function derivative(state, axis) {
  const h = .001;
  const positions = [-2, -1, 1, 2].map(offset => forward(
    state.shoulder + (axis === 'shoulder' ? offset * h * state.shoulderRate : 0),
    state.elbow + (axis === 'elbow' ? offset * h * state.elbowRate : 0)
  ));
  return [0, 1, 2].map(i => (positions[0][i] - 8 * positions[1][i] + 8 * positions[2][i] - positions[3][i]) / (12 * h));
}
function dot(a, b) { return a.reduce((total, value, i) => total + value * b[i], 0); }

describe('arm hand velocity contributions', () => {
  for (const [shoulder, elbow, shoulderRate, elbowRate] of [
    [0, 0, 1, -1], [47, -112, -1.7, .6], [179.999, -179.999, 2, -2], [-91, 64, .04, 1.9]
  ]) {
    it(`matches independent isolated-joint derivatives at ${shoulder}/${elbow}`, () => {
      const state = { shoulder, elbow, shoulderRate, elbowRate }, result = motion(state);
      const shoulderDerivative = derivative(state, 'shoulder'), elbowDerivative = derivative(state, 'elbow');
      vector(result.shoulderVelocity, shoulderDerivative, 3e-10);
      vector(result.elbowVelocity, elbowDerivative, 3e-10);
      vector(result.velocity, shoulderDerivative.map((value, i) => value + elbowDerivative[i]), 5e-10);
      result.velocity.forEach((value, i) => expect(value).toBe(result.shoulderVelocity[i] + result.elbowVelocity[i]));
      near(result.speed, Math.hypot(...result.velocity));
    });
  }

  it('measures both contributions at the hand, including shoulder rotation of both booms', () => {
    const result = motion({ shoulder: 0, elbow: 0, shoulderRate: 1, elbowRate: 1 });
    vector(result.shoulderVelocity, [-2.6 * radians, 0, 0]);
    vector(result.elbowVelocity, [-1.2 * radians, 0, 0]);
    vector(result.velocity, [-3.8 * radians, 0, 0]);
    // The shoulder contribution is not merely the elbow-joint velocity.
    expect(Math.hypot(...result.shoulderVelocity)).toBeGreaterThan(1.4 * radians);
  });

  it('keeps contributions perpendicular to their own lever arms', () => {
    for (const [shoulder, elbow] of [[22, -153], [-123, 67], [179, -179]]) {
      const result = motion({ shoulder, elbow, shoulderRate: 1.7, elbowRate: -.3 });
      const distal = result.tip.map((value, i) => value - result.joint[i]);
      near(dot(result.shoulderVelocity, result.tip), 0, 1e-15);
      near(dot(result.elbowVelocity, distal), 0, 1e-15);
      near(Math.hypot(...result.shoulderVelocity), Math.hypot(...result.tip) * 1.7 * radians, 1e-15);
      near(Math.hypot(...result.elbowVelocity), 1.2 * .3 * radians, 1e-15);
    }
  });

  it('reveals nonzero opposing contributions when the hand is instantaneously stationary', () => {
    const result = motion({ shoulder: 0, elbow: 0, shoulderRate: .8, elbowRate: -.8 * 2.6 / 1.2 });
    expect(Math.hypot(...result.shoulderVelocity)).toBeGreaterThan(.03);
    expect(Math.hypot(...result.elbowVelocity)).toBeGreaterThan(.03);
    vector(result.shoulderVelocity, result.elbowVelocity.map(value => -value), 1e-15);
    vector(result.velocity, [0, 0, 0], 1e-15);
    near(result.speed, 0, 1e-15);
  });

  it('permits cancellation with same-sign joint rates when folded', () => {
    const result = motion({ shoulder: 0, elbow: 180, shoulderRate: 1, elbowRate: 1 / 6 });
    expect(result.shoulderVelocity[0]).toBeLessThan(0);
    expect(result.elbowVelocity[0]).toBeGreaterThan(0);
    near(result.speed, 0, 1e-15);
  });

  it('keeps the other contribution unchanged when one joint rate reverses', () => {
    const start = { shoulder: 71, elbow: -37, shoulderRate: 1.3, elbowRate: -.5 }, result = motion(start);
    const shoulder = motion({ ...start, shoulderRate: -start.shoulderRate });
    const elbow = motion({ ...start, elbowRate: -start.elbowRate });
    vector(shoulder.tip, result.tip, 0); vector(elbow.tip, result.tip, 0);
    vector(shoulder.shoulderVelocity, result.shoulderVelocity.map(value => -value), 0);
    vector(shoulder.elbowVelocity, result.elbowVelocity, 0);
    vector(elbow.shoulderVelocity, result.shoulderVelocity, 0);
    vector(elbow.elbowVelocity, result.elbowVelocity.map(value => -value), 0);
  });

  it('rotates the full velocity decomposition with the shoulder reference orientation', () => {
    const start = { shoulder: -43, elbow: 81, shoulderRate: -1.1, elbowRate: .7 };
    const result = motion(start), rotated = motion({ ...start, shoulder: start.shoulder + 63 });
    for (const key of ['shoulderVelocity', 'elbowVelocity', 'velocity']) {
      vector(rotated[key], [...rotate(result[key], 63), 0], 1e-15);
    }
    near(rotated.speed, result.speed, 1e-15);
  });

  it('preserves the decomposition across complete-turn angle wrapping', () => {
    const base = motion({ shoulder: 91, elbow: -172, shoulderRate: .6, elbowRate: -1.2 });
    const wrapped = motion({ shoulder: 91 + 720, elbow: -172 - 1080, shoulderRate: .6, elbowRate: -1.2 });
    for (const key of ['tip', 'joint', 'shoulderVelocity', 'elbowVelocity', 'velocity']) vector(wrapped[key], base[key], 1e-15);
    near(wrapped.speed, base.speed, 1e-15);
  });

  it('normalizes and clamps degree rates before computing either contribution', () => {
    const result = motion({ shoulder: 90, elbow: -90, shoulderRate: '100', elbowRate: '-100' });
    expect(result.shoulderRate).toBe(2); expect(result.elbowRate).toBe(-2);
    vector(result.shoulderVelocity, [-2.4 * radians, -2.8 * radians, 0], 1e-15);
    vector(result.elbowVelocity, [2.4 * radians, 0, 0], 1e-15);
    vector(result.velocity, [0, -2.8 * radians, 0], 1e-15);
  });

  it('uses zero for malformed rates and returns finite zero vectors at rest', () => {
    for (const invalid of [undefined, null, '', 'bad', NaN, Infinity, -Infinity]) {
      const result = motion({ shoulder: 37, elbow: -54, shoulderRate: invalid, elbowRate: invalid });
      for (const key of ['shoulderVelocity', 'elbowVelocity', 'velocity']) vector(result[key], [0, 0, 0], 0);
      near(result.speed, 0, 0);
    }
  });

  it('isolates a stationary joint without removing the other contribution', () => {
    for (const moving of ['shoulder', 'elbow']) {
      const still = moving === 'shoulder' ? 'elbow' : 'shoulder';
      const result = motion({ shoulder: 35, elbow: -76, [moving + 'Rate']: 1.2, [still + 'Rate']: 0 });
      vector(result[still + 'Velocity'], [0, 0, 0], 0);
      vector(result.velocity, result[moving + 'Velocity'], 0);
      expect(result.speed).toBeGreaterThan(0);
    }
  });

  it('does not mutate input or alias output vectors across calls or fields', () => {
    const options = Object.freeze({ shoulder: -57, elbow: 130, shoulderRate: .9, elbowRate: -1.1, unrelated: 'preserved' });
    const before = JSON.stringify(options), first = motion(options), second = motion(options);
    const snapshot = JSON.stringify(second), initialVelocity = [...first.velocity], initialTip = [...first.tip];
    first.shoulderVelocity[0] += 10; first.elbowVelocity[1] += 20;
    vector(first.velocity, initialVelocity, 0); vector(first.tip, initialTip, 0);
    expect(JSON.stringify(second)).toBe(snapshot); expect(JSON.stringify(options)).toBe(before);
    expect(first.shoulderVelocity).not.toBe(first.elbowVelocity);
    expect(first.velocity).not.toBe(first.tip);
  });
});
