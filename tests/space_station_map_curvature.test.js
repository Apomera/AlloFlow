import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const curvature = new Function(
  source.slice(source.indexOf('  var ISS_GM ='), source.indexOf('  function issTransferPlan(')) +
  '\nreturn issMapMotionCurvature;'
)();
const rad = Math.PI / 180;
const norm = vector => Math.hypot(...vector);
const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);
const scale = (vector, factor) => vector.map(value => value * factor);
const add = (a, b) => a.map((value, index) => value + b[index]);
const subtract = (a, b) => a.map((value, index) => value - b[index]);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
function near(actual, expected, relative = 1e-10, absolute = 1e-12) {
  expect(Number.isFinite(actual)).toBe(true);
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(absolute + relative * Math.abs(expected));
}
function nearVector(actual, expected, relative = 1e-10, absolute = 1e-12) {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((value, index) => near(value, expected[index], relative, absolute));
}

// Independent forward rotation matrices and polynomial angle histories. No
// production velocity, angular-acceleration, or curvature helper is the oracle.
function rotate(point, alpha, feather) {
  const a = alpha * rad, f = feather * rad;
  const rz = [[Math.cos(f), -Math.sin(f), 0], [Math.sin(f), Math.cos(f), 0], [0, 0, 1]];
  const rx = [[1, 0, 0], [0, Math.cos(a), -Math.sin(a)], [0, Math.sin(a), Math.cos(a)]];
  const intermediate = rz.map(row => dot(row, point));
  return rx.map(row => dot(row, intermediate));
}
function localPoint(options) {
  return [-.45 + .9 * options.chord, .02, options.side * (.3 + 3.4 * options.span)];
}
function trajectory(options, time) {
  return rotate(localPoint(options), options.alpha + options.alphaRate * time + .5 * options.alphaAcceleration * time * time,
    options.feather + options.featherRate * time + .5 * options.featherAcceleration * time * time);
}
function numericalGeometry(options) {
  const h = .05, positions = [-2, -1, 0, 1, 2].map(k => trajectory(options, k * h));
  const velocity = [0, 1, 2].map(i => (positions[0][i] - 8 * positions[1][i] + 8 * positions[3][i] - positions[4][i]) / (12 * h));
  const acceleration = [0, 1, 2].map(i => (-positions[4][i] + 16 * positions[3][i] - 30 * positions[2][i] + 16 * positions[1][i] - positions[0][i]) / (12 * h * h));
  const speed = norm(velocity), tangent = scale(velocity, 1 / speed), speedChange = dot(tangent, acceleration);
  const normal = subtract(acceleration, scale(tangent, speedChange)), normalMagnitude = norm(normal);
  return { velocity, acceleration, speed, tangent, speedChange, normalMagnitude, normalDirection: scale(normal, 1 / normalMagnitude),
    curvature: normalMagnitude / (speed * speed), radius: speed * speed / normalMagnitude };
}
const scenarios = [
  { alpha: 0, feather: 0, alphaRate: .08, featherRate: -.03, alphaAcceleration: .002, featherAcceleration: -.001, span: 1, chord: 1, side: 1 },
  { alpha: 72, feather: -36, alphaRate: -.2, featherRate: .1, alphaAcceleration: -.01, featherAcceleration: .005, span: .4, chord: .12, side: -1 },
  { alpha: -139, feather: 53, alphaRate: .7, featherRate: -.8, alphaAcceleration: .05, featherAcceleration: -.05, span: 0, chord: .5, side: 1 },
  { alpha: 179.9998, feather: 21, alphaRate: .9, featherRate: .4, alphaAcceleration: -.02, featherAcceleration: .01, span: .75, chord: .8, side: -1 },
  { alpha: -179.9998, feather: -67, alphaRate: -.9, featherRate: -.6, alphaAcceleration: .003, featherAcceleration: -.004, span: 1, chord: 0, side: 1 },
  { alpha: 90, feather: 89.5, alphaRate: -1, featherRate: -.2, alphaAcceleration: 0, featherAcceleration: 0, span: .2, chord: .61, side: -1 },
];
function invariantGeometry(state) {
  expect(state.resolved).toBe(true);
  expect(state.reason).toBe('curved');
  for (const vector of [state.tangent, state.normalDirection, state.binormal]) near(norm(vector), 1);
  near(dot(state.tangent, state.normalDirection), 0);
  near(dot(state.tangent, state.binormal), 0);
  near(dot(state.normalDirection, state.binormal), 0);
  nearVector(cross(state.tangent, state.normalDirection), state.binormal);
  nearVector(add(state.tangential, state.normal), state.acceleration);
  nearVector(state.tangential, scale(state.tangent, state.speedChange));
  nearVector(state.normal, scale(state.normalDirection, state.normalMagnitude));
  near(state.speed, norm(state.velocity));
  near(state.directionRate, state.normalMagnitude / state.speed);
  near(state.curvature * state.radius, 1);
  near(state.curvature, state.directionRate / state.speed);
  nearVector(state.center, add(state.position, scale(state.normalDirection, state.radius)));

  // A fixed material radius gives r·v=0 and r·a=−|v|². Consequently the
  // entire osculating circle, not just the probe, lies on the same sphere.
  near(dot(state.position, state.velocity), 0);
  near(dot(state.position, state.acceleration), -(state.speed ** 2));
  near(dot(state.position, state.normalDirection), -state.radius);
  near(dot(state.center, state.tangent), 0);
  near(dot(state.center, state.normalDirection), 0);
  const pivotRadius = norm(state.position);
  near(dot(state.center, state.center) + state.radius ** 2, pivotRadius ** 2);
  expect(state.radius).toBeLessThanOrEqual(pivotRadius + 1e-10);
  expect(state.points).toHaveLength(97);
  nearVector(state.points[48], state.position);
  for (const point of state.points) {
    near(norm(point), pivotRadius);
    near(norm(subtract(point, state.center)), state.radius);
    near(dot(subtract(point, state.center), state.binormal), 0);
  }
  near(state.thresholds.speed, 1e-10, 0, 0);
  near(state.thresholds.normal, Math.max(1e-14, norm(state.acceleration) * 1e-10), 1e-12, 0);
  near(state.thresholds.radius, .005, 0, 0);
}

describe('space station instantaneous path curvature', () => {
  it('has no invented direction or circle at rest', () => {
    const state = curvature();
    expect(curvature(null)).toEqual(state);
    nearVector(state.position, [.45, .02, 3.7]);
    nearVector(state.velocity, [0, 0, 0]);
    nearVector(state.acceleration, [0, 0, 0]);
    expect(state.speed).toBe(0);
    expect(state.arcDegrees).toBe(90);
    expect(state.resolved).toBe(false);
    expect(state.drawable).toBe(false);
    expect(state.reason).toBe('stationary');
    for (const key of ['tangent', 'normalDirection', 'binormal', 'tangential', 'normal', 'speedChange', 'curvature', 'radius', 'center', 'directionRate']) expect(state[key]).toBeNull();
    expect(state.points).toEqual([]);
  });

  it('retains nonzero launch acceleration while direction is undefined at zero velocity', () => {
    const state = curvature({ alpha: 43, feather: -29, alphaAcceleration: .02, featherAcceleration: -.01 });
    expect(norm(state.acceleration)).toBeGreaterThan(0);
    expect(state.speed).toBe(0);
    expect(state.tangent).toBeNull();
    expect(state.speedChange).toBeNull();
    expect(state.radius).toBeNull();
    expect(state.points).toEqual([]);
    expect(state.reason).toBe('stationary');
  });

  it.each(scenarios)('matches independently differentiated trajectories at alpha=$alpha, feather=$feather, side=$side', options => {
    const state = curvature(options), expected = numericalGeometry(options);
    nearVector(state.position, trajectory(options, 0));
    nearVector(state.velocity, expected.velocity, 1e-7, 1e-10);
    nearVector(state.acceleration, expected.acceleration, 1e-6, 1e-10);
    nearVector(state.tangent, expected.tangent, 1e-6, 1e-7);
    nearVector(state.normalDirection, expected.normalDirection, 1e-5, 1e-6);
    near(state.speedChange, expected.speedChange, 1e-6, 1e-10);
    near(state.radius, expected.radius, 1e-5, 1e-7);
    near(state.curvature, expected.curvature, 1e-5, 1e-7);
    invariantGeometry(state);
  });

  it.each([
    { axis: 'rotation', rate: .4, acceleration: 0 },
    { axis: 'rotation', rate: -.4, acceleration: .025 },
    { axis: 'rotation', rate: .4, acceleration: -.025 },
    { axis: 'feather', rate: .4, acceleration: 0 },
    { axis: 'feather', rate: -.4, acceleration: .025 },
    { axis: 'feather', rate: .4, acceleration: -.025 },
  ])('reconstructs the exact $axis circle at rate=$rate and acceleration=$acceleration', ({ axis, rate, acceleration }) => {
    const options = { alpha: 37, feather: -24, alphaRate: axis === 'rotation' ? rate : 0, featherRate: axis === 'feather' ? rate : 0,
      alphaAcceleration: axis === 'rotation' ? acceleration : 0, featherAcceleration: axis === 'feather' ? acceleration : 0,
      span: .63, chord: .21, side: -1, arcDegrees: 360 };
    const state = curvature(options), point = localPoint(options), rotated = rotate(point, options.alpha, options.feather);
    const expectedRadius = axis === 'rotation' ? Math.hypot(rotated[1], rotated[2]) : Math.hypot(point[0], point[1]);
    const expectedCenter = axis === 'rotation' ? [rotated[0], 0, 0] : rotate([0, 0, point[2]], options.alpha, 0);
    near(state.radius, expectedRadius);
    nearVector(state.center, expectedCenter);
    near(state.speedChange, Math.sign(rate) * acceleration * rad * expectedRadius);
    state.points.forEach((sample, index) => {
      const angle = Math.sign(rate) * (-180 + index * 360 / 96);
      const expected = rotate(point, options.alpha + (axis === 'rotation' ? angle : 0), options.feather + (axis === 'feather' ? angle : 0));
      nearVector(sample, expected);
    });
    invariantGeometry(state);
  });

  it('decomposes acceleration into speeding and bending independently of the drive-axis contributions', () => {
    const options = scenarios[1], state = curvature(options);
    const omega = [options.alphaRate * rad, -options.featherRate * rad * Math.sin(options.alpha * rad), options.featherRate * rad * Math.cos(options.alpha * rad)];
    const turning = cross(omega, state.velocity);
    expect(norm(subtract(state.normal, turning))).toBeGreaterThan(1e-6);
    expect(Math.abs(state.speedChange)).toBeGreaterThan(1e-6);
    near(dot(state.normal, state.velocity), 0);
    nearVector(add(state.tangential, state.normal), state.acceleration);
    invariantGeometry(state);
  });

  it('reverses the tangent and arc traversal under physical time reversal', () => {
    const options = scenarios[2], forward = curvature({ ...options, arcDegrees: 180 });
    const reverse = curvature({ ...options, alphaRate: -options.alphaRate, featherRate: -options.featherRate, arcDegrees: 180 });
    nearVector(reverse.velocity, scale(forward.velocity, -1));
    nearVector(reverse.acceleration, forward.acceleration);
    nearVector(reverse.tangent, scale(forward.tangent, -1));
    nearVector(reverse.binormal, scale(forward.binormal, -1));
    nearVector(reverse.normalDirection, forward.normalDirection);
    nearVector(reverse.tangential, forward.tangential);
    nearVector(reverse.normal, forward.normal);
    near(reverse.speedChange, -forward.speedChange);
    near(reverse.radius, forward.radius);
    nearVector(reverse.center, forward.center);
    reverse.points.forEach((point, index) => nearVector(point, forward.points[96 - index]));
  });

  it('keeps the geometric circle unchanged under a uniform rescaling of physical time', () => {
    const options = scenarios[1], factor = .3, original = curvature(options);
    const slower = curvature({ ...options, alphaRate: factor * options.alphaRate, featherRate: factor * options.featherRate,
      alphaAcceleration: factor ** 2 * options.alphaAcceleration, featherAcceleration: factor ** 2 * options.featherAcceleration });
    nearVector(slower.velocity, scale(original.velocity, factor));
    nearVector(slower.acceleration, scale(original.acceleration, factor ** 2));
    nearVector(slower.tangent, original.tangent);
    nearVector(slower.normalDirection, original.normalDirection);
    near(slower.speedChange, factor ** 2 * original.speedChange);
    near(slower.directionRate, factor * original.directionRate);
    near(slower.radius, original.radius);
    near(slower.curvature, original.curvature);
    nearVector(slower.center, original.center);
    slower.points.forEach((point, index) => nearVector(point, original.points[index]));
  });

  it.each([30, 90, 180, 360])('uses the requested %s-degree geometric arc without changing the instantaneous state', arcDegrees => {
    const options = scenarios[0], state = curvature({ ...options, arcDegrees }), baseline = curvature(options);
    expect(state.arcDegrees).toBe(arcDegrees);
    for (const key of ['position', 'velocity', 'acceleration', 'tangent', 'normalDirection', 'center']) nearVector(state[key], baseline[key]);
    near(state.radius, baseline.radius);
    const startRadius = subtract(state.points[0], state.center), middleRadius = subtract(state.position, state.center);
    near(dot(startRadius, middleRadius) / state.radius ** 2, Math.cos(.5 * arcDegrees * rad));
    // A symmetric chord through the exact midpoint must point along +velocity.
    const middleChord = subtract(state.points[49], state.points[47]);
    nearVector(scale(middleChord, 1 / norm(middleChord)), state.tangent);
    invariantGeometry(state);
    if (arcDegrees === 360) nearVector(state.points[0], state.points[96]);
  });

  it('falls back to the 90-degree arc for unsupported or nonfinite spans', () => {
    for (const arcDegrees of [undefined, null, '', 0, -30, 15, 60, 120, 720, Infinity, NaN, 'wrong']) {
      expect(curvature({ ...scenarios[0], arcDegrees }).arcDegrees).toBe(90);
    }
  });

  it('preserves the true nonzero speed below the usable direction threshold', () => {
    const state = curvature({ alphaRate: 1e-10, alphaAcceleration: .05 });
    expect(state.speed).toBeGreaterThan(0);
    expect(state.speed).toBeLessThan(state.thresholds.speed);
    expect(norm(state.acceleration)).toBeGreaterThan(0);
    expect(state.tangent).toBeNull();
    expect(state.tangential).toBeNull();
    expect(state.reason).toBe('stationary');
    expect(state.points).toEqual([]);
  });

  it('retains the tangent but withholds an unstable circle below the absolute normal-acceleration threshold', () => {
    const state = curvature({ alphaRate: 1e-6 });
    expect(state.speed).toBeGreaterThan(state.thresholds.speed);
    expect(state.normalMagnitude).toBeGreaterThan(0);
    expect(state.normalMagnitude).toBeLessThan(state.thresholds.normal);
    expect(state.resolved).toBe(false);
    expect(state.drawable).toBe(false);
    expect(state.reason).toBe('unresolved');
    near(norm(state.tangent), 1);
    expect(state.tangential.every(Number.isFinite)).toBe(true);
    expect(Number.isFinite(state.speedChange)).toBe(true);
    for (const key of ['normalDirection', 'binormal', 'normal', 'curvature', 'radius', 'center', 'directionRate']) expect(state[key]).toBeNull();
    expect(state.points).toEqual([]);
  });

  it('also guards normal acceleration that is negligible relative to a large tangential acceleration', () => {
    const state = curvature({ alphaRate: 1e-5, alphaAcceleration: .05 });
    expect(state.speed).toBeGreaterThan(state.thresholds.speed);
    expect(state.normalMagnitude).toBeGreaterThan(1e-14);
    expect(state.thresholds.normal).toBeGreaterThan(1e-14);
    expect(state.normalMagnitude).toBeLessThan(state.thresholds.normal);
    near(state.thresholds.normal, norm(state.acceleration) * 1e-10, 1e-12, 0);
    expect(state.reason).toBe('unresolved');
    expect(state.tangent).not.toBeNull();
    expect(state.radius).toBeNull();
  });

  it('retains a valid tiny circle numerically while marking it too small to render', () => {
    const state = curvature({ alphaRate: 1e-5, featherAcceleration: .05 });
    expect(state.resolved).toBe(true);
    expect(state.reason).toBe('curved');
    expect(state.radius).toBeGreaterThan(0);
    expect(state.radius).toBeLessThan(.005);
    expect(state.drawable).toBe(false);
    expect(state.points).toHaveLength(97);
    nearVector(state.points[48], state.position);
    near(state.radius, state.speed ** 2 / state.normalMagnitude, 1e-12, 0);
    near(state.curvature * state.radius, 1);
    for (const point of state.points) expect(point.every(Number.isFinite)).toBe(true);
  });

  it('marks an ordinary resolvable circle drawable without enlarging its radius', () => {
    const state = curvature({ alphaRate: .1 });
    expect(state.drawable).toBe(true);
    expect(state.radius).toBeGreaterThan(state.thresholds.radius);
    near(state.radius, Math.hypot(.02, 3.7));
    invariantGeometry(state);
  });

  it('normalizes invalid inputs and respects the existing physical input limits', () => {
    expect(curvature({ alpha: NaN, feather: Infinity, alphaRate: 'bad', featherRate: NaN, alphaAcceleration: Infinity, featherAcceleration: 'bad' })).toEqual(curvature());
    const extreme = curvature({ alpha: 720 + 30, feather: 200, alphaRate: 20, featherRate: -50, alphaAcceleration: 10, featherAcceleration: -20, span: 2, chord: -2, side: -1 });
    const bounded = curvature({ alpha: 30, feather: 90, alphaRate: 1, featherRate: -1, alphaAcceleration: .05, featherAcceleration: -.05, span: 1, chord: 0, side: -1 });
    expect(extreme).toEqual(bounded);
    invariantGeometry(extreme);
  });

  it('does not mutate its input or alias geometry arrays between calls', () => {
    const options = Object.freeze({ ...scenarios[1], arcDegrees: 180 }), snapshot = JSON.stringify(options);
    const first = curvature(options), second = curvature(options);
    expect(JSON.stringify(options)).toBe(snapshot);
    expect(first).toEqual(second);
    first.position[0] += 100;
    first.points[48][1] += 100;
    first.center[2] += 100;
    expect(curvature(options)).toEqual(second);
  });
});
