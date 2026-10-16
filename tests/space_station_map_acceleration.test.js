import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const { acceleration, driveAcceleration, drive } = new Function(
  source.slice(source.indexOf('  var ISS_GM ='), source.indexOf('  function issTransferPlan(')) +
  '\nreturn { acceleration: issMapMotionAcceleration, driveAcceleration: issMapDriveAcceleration, drive: issMapDriveStep };'
)();
const rad = Math.PI / 180;
const norm = v => Math.hypot(...v);
const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);
const add = (a, b) => a.map((v, i) => v + b[i]);
const scale = (v, factor) => v.map(x => x * factor);
const subtract = (a, b) => a.map((v, i) => v - b[i]);
function nearVector(actual, expected, digits = 11) {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((v, i) => expect(v).toBeCloseTo(expected[i], digits));
}

// Independent forward rotation matrices and polynomial joint histories. This
// differentiates material positions, not the production angular-velocity law.
function pointAt(point, alpha, feather) {
  const a = alpha * rad, f = feather * rad;
  const rz = [[Math.cos(f), -Math.sin(f), 0], [Math.sin(f), Math.cos(f), 0], [0, 0, 1]];
  const rx = [[1, 0, 0], [0, Math.cos(a), -Math.sin(a)], [0, Math.sin(a), Math.cos(a)]];
  const intermediate = rz.map(row => dot(row, point));
  return rx.map(row => dot(row, intermediate));
}
function trajectory(options, t) {
  const point = [-.45 + .9 * options.chord, .02, options.side * (.3 + 3.4 * options.span)];
  return pointAt(point, options.alpha + options.alphaRate * t + .5 * options.alphaAcceleration * t * t,
    options.feather + options.featherRate * t + .5 * options.featherAcceleration * t * t);
}
function numericalAcceleration(options) {
  // Five-point second derivative reduces truncation error at the largest
  // supported rates without cancellation from a microscopic time interval.
  const h = .05, points = [-2, -1, 0, 1, 2].map(k => trajectory(options, k * h));
  return [0, 1, 2].map(i => (-points[4][i] + 16 * points[3][i] - 30 * points[2][i] + 16 * points[1][i] - points[0][i]) / (12 * h * h));
}
const cases = [
  { alpha: 0, feather: 0, alphaRate: .08, featherRate: -.03, alphaAcceleration: .002, featherAcceleration: -.001, span: 1, chord: 1, side: 1 },
  { alpha: 72, feather: -36, alphaRate: -.2, featherRate: .1, alphaAcceleration: -.01, featherAcceleration: .005, span: .4, chord: .12, side: -1 },
  { alpha: -139, feather: 53, alphaRate: .7, featherRate: -.8, alphaAcceleration: .05, featherAcceleration: -.05, span: 0, chord: .5, side: 1 },
  { alpha: 179.9998, feather: 21, alphaRate: .9, featherRate: .4, alphaAcceleration: -.02, featherAcceleration: .01, span: .75, chord: .8, side: -1 },
  { alpha: -179.9998, feather: -67, alphaRate: -.9, featherRate: -.6, alphaAcceleration: .003, featherAcceleration: -.004, span: 1, chord: 0, side: 1 },
  { alpha: 90, feather: 89.5, alphaRate: -1, featherRate: -.2, alphaAcceleration: 0, featherAcceleration: 0, span: .2, chord: .61, side: -1 },
];
function consistent(state) {
  for (const key of ['position', 'velocity', 'omega', 'angularAcceleration', 'turning', 'changing', 'acceleration', 'turningEnd', 'changingEnd', 'accelerationEnd']) {
    expect(state[key]).toHaveLength(3);
    expect(state[key].every(Number.isFinite)).toBe(true);
  }
  nearVector(state.acceleration, add(state.turning, state.changing));
  for (const [vector, magnitude, end] of [
    ['turning', 'turningMagnitude', 'turningEnd'],
    ['changing', 'changingMagnitude', 'changingEnd'],
    ['acceleration', 'magnitude', 'accelerationEnd'],
  ]) {
    expect(state[magnitude]).toBeCloseTo(norm(state[vector]), 13);
    nearVector(state[end], add(state.position, scale(state[vector], state.displayScale)));
    expect(norm(subtract(state[end], state.position))).toBeLessThanOrEqual(2.4 + 1e-12);
  }
  // For a fixed material radius, r·a = −v·v, regardless of the drive law.
  expect(dot(state.position, state.acceleration)).toBeCloseTo(-dot(state.velocity, state.velocity), 11);
  expect(dot(state.turning, state.velocity)).toBeCloseTo(0, 13);
  expect(dot(state.changing, state.position)).toBeCloseTo(0, 13);
}

describe('space station material-point acceleration', () => {
  it('starts with finite zero vectors at rest and leaves the probe on the outer panel', () => {
    const state = acceleration();
    expect(acceleration(null)).toEqual(state);
    nearVector(state.position, [.45, .02, 3.7]);
    for (const key of ['velocity', 'omega', 'angularAcceleration', 'turning', 'changing', 'acceleration']) nearVector(state[key], [0, 0, 0]);
    expect(state.magnitude).toBe(0); expect(state.requestedScale).toBe(10000); expect(state.displayScale).toBe(10000);
    consistent(state);
  });

  it.each(cases)('matches independent second position derivatives at alpha=$alpha, feather=$feather, side=$side', options => {
    const state = acceleration(options);
    nearVector(state.position, trajectory(options, 0));
    nearVector(state.acceleration, numericalAcceleration(options), 9);
    consistent(state);
  });

  it.each(['rotation', 'feather'])('produces centripetal acceleration at constant %s speed', axis => {
    const rate = .7, state = acceleration({ alpha: 0, feather: 0, alphaRate: axis === 'rotation' ? rate : 0, featherRate: axis === 'feather' ? rate : 0 });
    const squared = (rate * rad) ** 2;
    const expected = axis === 'rotation' ? [0, -.02 * squared, -3.7 * squared] : [-.45 * squared, -.02 * squared, 0];
    nearVector(state.acceleration, expected, 13); nearVector(state.changing, [0, 0, 0]);
    expect(state.turningMagnitude).toBeGreaterThan(0);
    consistent(state);
  });

  it('includes the moving-axis transport term even when both joint rates are constant', () => {
    const u = .8 * rad, v = -.6 * rad, state = acceleration({ alphaRate: .8, featherRate: -.6 });
    const [x, y, z] = state.position;
    nearVector(state.angularAcceleration, [0, -u * v, 0], 14);
    // Expanded second derivative at the identity rotation: the two z coupling
    // contributions add, while the two x coupling contributions cancel.
    nearVector(state.acceleration, [-v * v * x, -(u * u + v * v) * y, 2 * u * v * x - u * u * z], 13);
    expect(state.changingMagnitude).toBeGreaterThan(0);
    consistent(state);
  });

  it('converts joint acceleration from degrees per second squared to radians', () => {
    const state = acceleration({ alphaAcceleration: .05, featherAcceleration: -.02 });
    nearVector(state.angularAcceleration, [.05 * rad, 0, -.02 * rad], 14);
    nearVector(state.turning, [0, 0, 0]);
    nearVector(state.acceleration, [.02 * rad * .02, -.02 * rad * .45 - .05 * rad * 3.7, .05 * rad * .02], 13);
    consistent(state);
  });

  it('can accelerate a point whose instantaneous velocity is zero on the changing rotation axis', () => {
    const feather = -Math.atan2(.02, .45) / rad, radius = Math.hypot(.45, .02);
    const state = acceleration({ alpha: 73, feather, alphaRate: .1, featherRate: .1 * 3.7 / radius });
    expect(norm(state.velocity)).toBeLessThan(1e-14);
    expect(state.turningMagnitude).toBeLessThan(1e-15);
    expect(state.changingMagnitude).toBeGreaterThan(1e-7);
    nearVector(state.acceleration, state.changing, 13);
    consistent(state);
  });

  it('preserves acceleration under time reversal while reversing velocity', () => {
    const options = cases[1], forward = acceleration(options);
    const reverse = acceleration({ ...options, alphaRate: -options.alphaRate, featherRate: -options.featherRate });
    nearVector(reverse.velocity, scale(forward.velocity, -1));
    nearVector(reverse.acceleration, forward.acceleration);
    nearVector(reverse.angularAcceleration, forward.angularAcceleration);
    consistent(reverse);
  });

  it('reports signed speed change from the independent material trajectory and leaves it undefined at rest', () => {
    for (const options of cases) {
      function speedAt(t) {
        const h = .001;
        return norm(scale(subtract(trajectory(options, t + h), trajectory(options, t - h)), 1 / (2 * h)));
      }
      const derivative = (speedAt(.02) - speedAt(-.02)) / .04;
      expect(acceleration(options).speedChange).toBeCloseTo(derivative, 8);
    }
    expect(acceleration().speedChange).toBeNull();
    const starting = acceleration({ alphaAcceleration: .002 });
    expect(starting.magnitude).toBeGreaterThan(0); expect(starting.speedChange).toBeNull();
  });

  it('uses one capped scale for all acceleration arrows and leaves physical values unchanged', () => {
    const options = { ...cases[2], span: 1 }, states = [1000, 10000, 50000].map(value => acceleration({ ...options, scale: value }));
    for (const state of states) {
      const maximum = Math.max(state.magnitude, state.turningMagnitude, state.changingMagnitude);
      expect(state.displayScale).toBeCloseTo(Math.min(state.requestedScale, 2.4 / maximum), 10);
      nearVector(state.acceleration, states[0].acceleration);
      nearVector(subtract(state.accelerationEnd, state.position), add(subtract(state.turningEnd, state.position), subtract(state.changingEnd, state.position)));
      consistent(state);
    }
    expect(states[2].displayScale).toBeLessThan(50000);
  });

  it('accepts the supported scales and finite numeric strings while bounding inputs', () => {
    for (const value of [1000, 10000, 50000]) expect(acceleration({ scale: String(value) }).requestedScale).toBe(value);
    for (const value of [0, -1, 100, 999, 10001, Infinity, 'bad']) expect(acceleration({ scale: value }).requestedScale).toBe(10000);
    expect(acceleration({ alpha: '45', feather: '-30', alphaRate: '.2', featherRate: '-.4', alphaAcceleration: '.002', featherAcceleration: '-.001', span: '.5', chord: '.2', side: '-1', scale: '1000' })).toEqual(
      acceleration({ alpha: 45, feather: -30, alphaRate: .2, featherRate: -.4, alphaAcceleration: .002, featherAcceleration: -.001, span: .5, chord: .2, side: -1, scale: 1000 }));
    expect(acceleration({ alphaRate: 9, featherRate: -9, alphaAcceleration: 1, featherAcceleration: -1 })).toEqual(acceleration({ alphaRate: 1, featherRate: -1, alphaAcceleration: .05, featherAcceleration: -.05 }));
  });

  it('uses finite defaults for non-finite rates and joint accelerations', () => {
    for (const invalid of [undefined, null, '', NaN, Infinity, -Infinity, 'bad']) {
      const state = acceleration({ alphaRate: invalid, featherRate: invalid, alphaAcceleration: invalid, featherAcceleration: invalid });
      expect(state).toEqual(acceleration()); consistent(state);
    }
  });

  it('does not mutate frozen inputs or share result vectors between calls', () => {
    const options = Object.freeze({ ...cases[0] }), expected = acceleration(options), altered = acceleration(options);
    for (const key of ['position', 'velocity', 'omega', 'angularAcceleration', 'turning', 'changing', 'acceleration', 'turningEnd', 'changingEnd', 'accelerationEnd']) {
      expect(altered[key]).not.toBe(expected[key]); altered[key][0] = 999;
    }
    expect(acceleration(options)).toEqual(expected);
  });
});

const base = {
  phase: 35, beta: 20, tracking: false, motorEnabled: true, motorSmooth: true, motorBraking: false,
  motorRate: .1, motorAcceleration: .002, arrayAlpha: 20, arrayFeather: -10,
  actualAlpha: 20, actualFeather: -10, actualAlphaRate: 0, actualFeatherRate: 0,
};

describe('space station instantaneous drive acceleration', () => {
  it('reports a smooth-drive state without advancing its pose, rates, or time', () => {
    const options = Object.freeze({ ...base, arrayAlpha: 70, arrayFeather: 25, actualAlphaRate: .03, actualFeatherRate: -.02 });
    const result = driveAcceleration(options);
    expect(result.enabled).toBe(true); expect(result.contact).toBe(false);
    expect(result.state).toEqual(drive(options, 0));
    expect(result.alphaAcceleration).toBe(.002); expect(result.featherAcceleration).toBe(.002);
    expect(result.state.elapsedSeconds).toBe(0);
  });

  it('uses the unsaturated position-and-speed servo response', () => {
    const result = driveAcceleration({ ...base, arrayAlpha: 20.2, arrayFeather: -10.1, actualAlphaRate: .003, actualFeatherRate: -.001 });
    expect(result.alphaAcceleration).toBeCloseTo(.00008, 13);
    expect(result.featherAcceleration).toBeCloseTo(-.00008, 13);
  });

  it('agrees with the right derivative of the actual integrator away from contact', () => {
    const scenarios = [
      { ...base, arrayAlpha: 60, arrayFeather: -45, actualAlphaRate: .02, actualFeatherRate: .01 },
      { ...base, arrayAlpha: 20.2, arrayFeather: -10.1, actualAlphaRate: .003, actualFeatherRate: -.001 },
      { ...base, actualAlphaRate: .2, actualFeatherRate: -.2, motorRate: .01 },
      { ...base, motorBraking: true, actualAlphaRate: .04, actualFeatherRate: -.03 },
      { ...base, actualAlpha: 179.99, arrayAlpha: -179.8, actualFeather: 89.9, arrayFeather: 89.8, actualAlphaRate: -.003 },
    ];
    const h = 1e-5;
    for (const options of scenarios) {
      const result = driveAcceleration(options), future = drive(options, h);
      expect(result.alphaAcceleration).toBeCloseTo((future.alphaRate - result.state.alphaRate) / h, 9);
      expect(result.featherAcceleration).toBeCloseTo((future.featherRate - result.state.featherRate) / h, 9);
    }
  });

  it('brakes a velocity above a lowered speed limit without resetting it', () => {
    const result = driveAcceleration({ ...base, motorRate: .01, actualAlphaRate: .2, actualFeatherRate: -.2, arrayAlpha: 100, arrayFeather: -80 });
    expect(result.alphaAcceleration).toBe(-.002); expect(result.featherAcceleration).toBe(.002);
    expect(result.state.alphaRate).toBe(.2); expect(result.state.featherRate).toBe(-.2);
  });

  it('suppresses outward acceleration at either speed ceiling and at a zero ceiling', () => {
    const capped = driveAcceleration({ ...base, actualAlphaRate: .1, actualFeatherRate: -.1, arrayAlpha: 100, arrayFeather: -80 });
    expect(capped.alphaAcceleration).toBe(0); expect(capped.featherAcceleration).toBe(0);
    const stationary = driveAcceleration({ ...base, motorRate: 0, arrayAlpha: 100, arrayFeather: -80 });
    expect(stationary.alphaAcceleration).toBe(0); expect(stationary.featherAcceleration).toBe(0);
    const braking = driveAcceleration({ ...base, motorRate: 0, actualAlphaRate: .1, actualFeatherRate: -.1 });
    expect(braking.alphaAcceleration).toBe(-.002); expect(braking.featherAcceleration).toBe(.002);
  });

  it('brakes either direction at the exact limit and returns zero acceleration after rest', () => {
    const options = { ...base, motorBraking: true, actualAlphaRate: .001, actualFeatherRate: -.002, motorAcceleration: .05 };
    const initial = driveAcceleration(options);
    expect(initial.alphaAcceleration).toBe(-.05); expect(initial.featherAcceleration).toBe(.05);
    const stopped = drive(options, 1);
    const after = driveAcceleration({ ...options, actualAlpha: stopped.alpha, actualFeather: stopped.feather, actualAlphaRate: stopped.alphaRate, actualFeatherRate: stopped.featherRate });
    expect(after.alphaAcceleration).toBe(0); expect(after.featherAcceleration).toBe(0);
  });

  it.each([-1, 1])('identifies outward velocity at the %s feather travel stop as an undefined contact impulse', sign => {
    const result = driveAcceleration({ ...base, actualFeather: sign * 90, actualFeatherRate: sign * .02, arrayFeather: 0 });
    expect(result.contact).toBe(true); expect(result.featherAcceleration).toBeNull();
    expect(result.state.featherRate).toBe(sign * .02);
  });

  it.each([-1, 1])('allows inward departure and finite braking at the %s feather stop', sign => {
    const inward = driveAcceleration({ ...base, actualFeather: sign * 90, actualFeatherRate: 0, arrayFeather: 0 });
    expect(inward.contact).toBe(false); expect(inward.featherAcceleration).toBe(-sign * .002);
    const slowing = driveAcceleration({ ...base, actualFeather: sign * 90, actualFeatherRate: -sign * .03, arrayFeather: sign * 90 });
    expect(slowing.contact).toBe(false); expect(slowing.featherAcceleration).toBe(sign * .002);
    const settled = driveAcceleration({ ...base, actualFeather: sign * 90, actualFeatherRate: 0, arrayFeather: sign * 90 });
    expect(settled.contact).toBe(false); expect(settled.featherAcceleration).toBe(0);
  });

  it('uses orbital tracking feedforward without treating orbital playback speed as joint acceleration', () => {
    const orbitalRate = 360 / (2 * Math.PI * Math.sqrt((6371 + 420) ** 3 / 398600.4418));
    const options = { ...base, tracking: true, actualAlpha: 35, actualFeather: -20, actualAlphaRate: orbitalRate };
    const result = driveAcceleration(options);
    expect(result.alphaAcceleration).toBeCloseTo(0, 13); expect(result.featherAcceleration).toBe(0);
    for (const rate of [.1, 1, 60, 180]) {
      const acceleratedClock = driveAcceleration({ ...options, rate });
      expect(acceleratedClock.alphaAcceleration).toBe(result.alphaAcceleration);
      expect(acceleratedClock.featherAcceleration).toBe(result.featherAcceleration);
    }
  });

  it('changes acceleration immediately on a paused target edit while preserving stored velocity', () => {
    const options = { ...base, actualAlphaRate: .03, playing: false };
    const forward = driveAcceleration({ ...options, arrayAlpha: 100 }), reverse = driveAcceleration({ ...options, arrayAlpha: -100 });
    expect(forward.alphaAcceleration).toBe(.002); expect(reverse.alphaAcceleration).toBe(-.002);
    expect(forward.state.alphaRate).toBe(.03); expect(reverse.state.alphaRate).toBe(.03);
    expect(forward.state.alpha).toBe(reverse.state.alpha);
  });

  it('marks acceleration unavailable outside smooth motor mode', () => {
    for (const options of [{ ...base, motorEnabled: false }, { ...base, motorSmooth: false }, undefined]) {
      expect(driveAcceleration(options)).toMatchObject({ enabled: false, contact: false, alphaAcceleration: null, featherAcceleration: null });
    }
  });
});
