import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const probe = new Function(source.slice(source.indexOf('  var ISS_GM ='), source.indexOf('  function issTransferPlan(')) + '\nreturn issMapMotionProbe;')();
const radians = Math.PI / 180;
const add = (a, b) => a.map((value, axis) => value + b[axis]);
const subtract = (a, b) => a.map((value, axis) => value - b[axis]);
const multiply = (a, scale) => a.map(value => value * scale);
const dot = (a, b) => a.reduce((sum, value, axis) => sum + value * b[axis], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const length = vector => Math.hypot(...vector);
const arrayKeys = ['localPoint', 'position', 'rotationVelocity', 'featherVelocity', 'velocity', 'rotationEnd', 'featherEnd', 'velocityEnd'];
function vectorClose(actual, expected, digits = 11) {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((value, axis) => expect(value).toBeCloseTo(expected[axis], digits));
}

// Independent matrix construction: feather the local point, then rotate it
// about the station X axis. No production pose or velocity helpers are used.
function rotatePoint(point, alpha, feather) {
  const a = alpha * radians, f = feather * radians;
  const rx = [[1, 0, 0], [0, Math.cos(a), -Math.sin(a)], [0, Math.sin(a), Math.cos(a)]];
  const rz = [[Math.cos(f), -Math.sin(f), 0], [Math.sin(f), Math.cos(f), 0], [0, 0, 1]];
  const feathered = rz.map(row => dot(row, point));
  return rx.map(row => dot(row, feathered));
}
function finiteDifference(point, alpha, feather, alphaRate, featherRate) {
  const h = .001;
  const next = rotatePoint(point, alpha + h * alphaRate, feather + h * featherRate);
  const prior = rotatePoint(point, alpha - h * alphaRate, feather - h * featherRate);
  return multiply(subtract(next, prior), 1 / (2 * h));
}
function expectConsistent(state) {
  arrayKeys.forEach(key => {
    expect(state[key]).toHaveLength(3);
    expect(state[key].every(Number.isFinite)).toBe(true);
  });
  expect(state.radius).toBeCloseTo(length(state.localPoint), 12);
  expect(length(state.position)).toBeCloseTo(state.radius, 12);
  vectorClose(state.velocity, add(state.rotationVelocity, state.featherVelocity));
  for (const [velocity, speed, endpoint] of [
    ['rotationVelocity', 'rotationSpeed', 'rotationEnd'],
    ['featherVelocity', 'featherSpeed', 'featherEnd'],
    ['velocity', 'speed', 'velocityEnd'],
  ]) {
    expect(state[speed]).toBeCloseTo(length(state[velocity]), 12);
    expect(dot(state.position, state[velocity])).toBeCloseTo(0, 12);
    vectorClose(state[endpoint], add(state.position, multiply(state[velocity], state.displayScale)));
    const arrow = subtract(state[endpoint], state.position);
    expect(length(arrow)).toBeLessThanOrEqual(2.4 + 1e-12);
    expect(dot(state.position, arrow)).toBeCloseTo(0, 10);
  }
}

const derivativeCases = [
  { alpha: 0, feather: 0, alphaRate: .08, featherRate: -.03, span: 1, side: 1 },
  { alpha: 72, feather: -36, alphaRate: -.2, featherRate: .1, span: .4, side: -1 },
  { alpha: -139, feather: 53, alphaRate: .7, featherRate: -.8, span: 0, side: 1 },
  { alpha: 179.9998, feather: 21, alphaRate: .9, featherRate: .4, span: .75, side: -1 },
  { alpha: -179.9998, feather: -67, alphaRate: -.9, featherRate: -.6, span: 1, side: 1 },
  { alpha: 90, feather: 89.9, alphaRate: -1, featherRate: -.2, span: .2, side: -1 },
];

describe('space station actual-array motion probe', () => {
  it('defaults to a stationary outer-panel point with finite unscaled velocities', () => {
    const state = probe();
    expect(probe(null)).toEqual(state); expect(probe({})).toEqual(state);
    expect(state).toMatchObject({ alpha: 0, feather: 0, alphaRate: 0, featherRate: 0, span: 1, side: 1, requestedScale: 300, displayScale: 300, limited: false, speed: 0, rotationSpeed: 0, featherSpeed: 0 });
    vectorClose(state.localPoint, [.45, .02, 3.7]); vectorClose(state.position, state.localPoint);
    for (const key of ['rotationVelocity', 'featherVelocity', 'velocity']) vectorClose(state[key], [0, 0, 0]);
    for (const key of ['rotationEnd', 'featherEnd', 'velocityEnd']) vectorClose(state[key], state.position);
    expectConsistent(state);
  });

  it.each(derivativeCases)('matches independent position derivatives at alpha=$alpha, feather=$feather, side=$side', options => {
    const state = probe(options), point = [.45, .02, options.side * (.3 + 3.4 * options.span)];
    vectorClose(state.position, rotatePoint(point, options.alpha, options.feather));
    vectorClose(state.rotationVelocity, finiteDifference(point, options.alpha, options.feather, options.alphaRate, 0), 8);
    vectorClose(state.featherVelocity, finiteDifference(point, options.alpha, options.feather, 0, options.featherRate), 8);
    vectorClose(state.velocity, finiteDifference(point, options.alpha, options.feather, options.alphaRate, options.featherRate), 8);
    expectConsistent(state);
  });

  it('equals the combined angular-velocity cross product in the station frame', () => {
    for (const options of derivativeCases) {
      const state = probe(options);
      const rotationOmega = [options.alphaRate * radians, 0, 0];
      const featherAxis = rotatePoint([0, 0, 1], options.alpha, 0);
      const featherOmega = multiply(featherAxis, options.featherRate * radians);
      vectorClose(state.rotationVelocity, cross(rotationOmega, state.position));
      vectorClose(state.featherVelocity, cross(featherOmega, state.position));
      vectorClose(state.velocity, cross(add(rotationOmega, featherOmega), state.position));
      expect(dot(state.position, state.velocity)).toBeCloseTo(0, 12);
    }
  });

  it('converts degrees per second to radians before calculating point speeds', () => {
    const rotation = probe({ alphaRate: 1 }), feather = probe({ featherRate: 1 });
    const oneDegree = 2 * Math.PI / 360;
    vectorClose(rotation.rotationVelocity, [0, -3.7 * oneDegree, .02 * oneDegree]);
    vectorClose(feather.featherVelocity, [-.02 * oneDegree, .45 * oneDegree, 0]);
    expect(rotation.speed).toBeCloseTo(Math.hypot(3.7, .02) * oneDegree, 12);
    expect(feather.speed).toBeCloseTo(Math.hypot(.45, .02) * oneDegree, 12);
    expect(rotation.speed).toBeLessThan(.1); expect(feather.speed).toBeLessThan(.01);
  });

  it('maps the selected span to the inner edge, midpoint, and outer edge of either panel', () => {
    for (const side of [-1, 1]) for (const [span, z] of [[0, .3], [.5, 2], [1, 3.7]]) {
      const state = probe({ span, side, alpha: 47, feather: -28, alphaRate: .1, featherRate: .2 });
      vectorClose(state.localPoint, [.45, .02, side * z]);
      expect(state.radius).toBeCloseTo(Math.hypot(.45, .02, z), 12);
      vectorClose(state.position, rotatePoint([.45, .02, side * z], 47, -28));
      expectConsistent(state);
    }
  });

  it('reverses the span-dependent rotation contribution on the opposite panel', () => {
    const options = { alpha: 37, feather: -24, alphaRate: .3, featherRate: -.2, span: .6 };
    const positive = probe({ ...options, side: 1 }), negative = probe({ ...options, side: -1 });
    const delta = rotatePoint([0, 0, 2 * (.3 + 3.4 * options.span)], options.alpha, 0);
    vectorClose(subtract(positive.position, negative.position), delta);
    vectorClose(subtract(positive.rotationVelocity, negative.rotationVelocity), cross([options.alphaRate * radians, 0, 0], delta));
    vectorClose(positive.featherVelocity, negative.featherVelocity);
    expect(positive.featherSpeed).toBeCloseTo(negative.featherSpeed, 12);
    const flatPositive = probe({ alphaRate: .1, side: 1 }), flatNegative = probe({ alphaRate: .1, side: -1 });
    expect(flatPositive.rotationVelocity[1]).toBeLessThan(0); expect(flatNegative.rotationVelocity[1]).toBeGreaterThan(0);
    expect(flatPositive.rotationVelocity[2]).toBeCloseTo(flatNegative.rotationVelocity[2], 12);
  });

  it('keeps feather speed independent of span while rotation speed grows toward the tip', () => {
    const expectedFeatherSpeed = .35 * radians * Math.hypot(.45, .02);
    for (const alpha of [-170, 0, 84]) for (const feather of [-75, -5, 40]) for (const side of [-1, 1]) {
      const states = [0, .5, 1].map(span => probe({ alpha, feather, side, span, alphaRate: -.2, featherRate: .35 }));
      states.forEach(state => expect(state.featherSpeed).toBeCloseTo(expectedFeatherSpeed, 12));
      vectorClose(states[0].featherVelocity, states[2].featherVelocity);
      expect(states[0].rotationSpeed).toBeLessThan(states[1].rotationSpeed);
      expect(states[1].rotationSpeed).toBeLessThan(states[2].rotationSpeed);
    }
  });

  it.each([-1, 1])('allows exact velocity cancellation on panel side %s without hiding nonzero joint contributions', side => {
    const feather = -Math.atan2(.02, .45) / radians, x = Math.hypot(.45, .02);
    for (const span of [0, .7, 1]) {
      const z = side * (.3 + 3.4 * span), alphaRate = .1;
      const state = probe({ alpha: 73, feather, side, span, alphaRate, featherRate: alphaRate * z / x, scale: 600 });
      expect(state.rotationSpeed).toBeGreaterThan(0); expect(state.featherSpeed).toBeGreaterThan(0);
      expect(state.rotationSpeed).toBeCloseTo(state.featherSpeed, 12);
      vectorClose(state.rotationVelocity, multiply(state.featherVelocity, -1));
      expect(state.speed).toBeLessThan(1e-14); vectorClose(state.velocityEnd, state.position);
      // The probe lies on the combined instantaneous rotation axis. Neither
      // individual joint axis contains this actual off-axis panel point.
      const omega = add([alphaRate * radians, 0, 0], multiply(rotatePoint([0, 0, 1], 73, 0), state.featherRate * radians));
      expect(length(cross(omega, state.position))).toBeLessThan(1e-14);
      if (span === 1) {
        expect(state.limited).toBe(true);
        expect(state.displayScale).toBeCloseTo(2.4 / state.rotationSpeed, 9);
        expect(length(subtract(state.rotationEnd, state.position))).toBeCloseTo(2.4, 12);
      }
      expectConsistent(state);
    }
  });

  it('handles either stopped joint and reverses signed velocities without changing their speeds', () => {
    for (const rates of [{ alphaRate: .2, featherRate: 0 }, { alphaRate: 0, featherRate: -.4 }]) {
      const state = probe({ alpha: -56, feather: 32, ...rates });
      const reversed = probe({ alpha: -56, feather: 32, alphaRate: -rates.alphaRate, featherRate: -rates.featherRate });
      const stopped = rates.alphaRate === 0 ? 'rotationVelocity' : 'featherVelocity';
      vectorClose(state[stopped], [0, 0, 0]); vectorClose(reversed.velocity, multiply(state.velocity, -1));
      expect(reversed.speed).toBeCloseTo(state.speed, 12); vectorClose(reversed.position, state.position);
      expectConsistent(state); expectConsistent(reversed);
    }
  });

  it('normalizes pose angles and clamps the span and signed angular rates', () => {
    expect(probe({ alpha: 540, feather: 130, alphaRate: 8, featherRate: -3, span: 5 })).toEqual(probe({ alpha: 180, feather: 90, alphaRate: 1, featherRate: -1, span: 1 }));
    expect(probe({ alpha: -540, feather: -130, alphaRate: -8, featherRate: 3, span: -.5 })).toEqual(probe({ alpha: -180, feather: -90, alphaRate: -1, featherRate: 1, span: 0 }));
    for (const side of [undefined, null, 0, 2, -2, 'bad', false]) expect(probe({ side }).side).toBe(1);
    expect(probe({ side: '-1' }).side).toBe(-1);
  });

  it('uses finite defaults for invalid numeric inputs and unsupported display scales', () => {
    const defaults = probe();
    for (const invalid of [undefined, null, '', NaN, Infinity, -Infinity, 'bad']) {
      const state = probe({ alpha: invalid, feather: invalid, alphaRate: invalid, featherRate: invalid, span: invalid, side: invalid, scale: invalid });
      expect(state).toEqual(defaults); expectConsistent(state);
    }
    for (const scale of [0, -100, 1, 99, 200, 301, 1000, true, false, ' ']) {
      expect(probe({ scale }).requestedScale).toBe(300);
      expect(probe({ scale }).displayScale).toBe(300);
    }
  });

  it('accepts numeric strings and the three specified magnification choices', () => {
    expect(probe({ alpha: '45', feather: '-30', alphaRate: '.2', featherRate: '-.4', span: '.5', side: '-1', scale: '100' })).toEqual(probe({ alpha: 45, feather: -30, alphaRate: .2, featherRate: -.4, span: .5, side: -1, scale: 100 }));
    for (const scale of [100, 300, 600]) {
      expect(probe({ scale }).requestedScale).toBe(scale);
      expect(probe({ scale: String(scale) })).toEqual(probe({ scale }));
    }
  });

  it('uses the requested seconds of magnification unchanged for slow motion', () => {
    const options = { alpha: 51, feather: -18, alphaRate: .0001, featherRate: -.0002, span: .7 };
    const states = [100, 300, 600].map(scale => probe({ ...options, scale }));
    for (const state of states) {
      expect(state.limited).toBe(false); expect(state.displayScale).toBe(state.requestedScale);
      vectorClose(state.velocity, states[0].velocity); expect(state.speed).toBe(states[0].speed);
      expectConsistent(state);
    }
    vectorClose(subtract(states[2].velocityEnd, states[2].position), multiply(subtract(states[0].velocityEnd, states[0].position), 6));
  });

  it('caps all three arrows with one common scale while preserving vector addition and direction', () => {
    const options = { alpha: 50, feather: 37, alphaRate: 1, featherRate: -1, span: 1 };
    const states = [100, 300, 600].map(scale => probe({ ...options, scale }));
    for (const state of states) {
      const maximumSpeed = Math.max(state.speed, state.rotationSpeed, state.featherSpeed);
      expect(state.limited).toBe(true); expect(state.displayScale).toBeCloseTo(2.4 / maximumSpeed, 12);
      expect(state.displayScale).toBeLessThan(state.requestedScale);
      const rotationArrow = subtract(state.rotationEnd, state.position), featherArrow = subtract(state.featherEnd, state.position);
      const totalArrow = subtract(state.velocityEnd, state.position);
      vectorClose(totalArrow, add(rotationArrow, featherArrow));
      expect(Math.max(length(rotationArrow), length(featherArrow), length(totalArrow))).toBeCloseTo(2.4, 12);
      vectorClose(cross(rotationArrow, state.rotationVelocity), [0, 0, 0]);
      vectorClose(cross(featherArrow, state.featherVelocity), [0, 0, 0]);
      vectorClose(cross(totalArrow, state.velocity), [0, 0, 0]);
      expectConsistent(state);
    }
    vectorClose(states[0].velocityEnd, states[2].velocityEnd);
    expect(states[0].displayScale).toBe(states[2].displayScale);
  });

  it('does not mutate its input or share result vectors between calls', () => {
    const options = Object.freeze({ alpha: 61, feather: -23, alphaRate: .18, featherRate: -.07, span: .45, side: -1, scale: 100 });
    const expected = probe(options), changed = probe(options);
    arrayKeys.forEach(key => { expect(changed[key]).not.toBe(expected[key]); changed[key][0] = 999; });
    changed.displayScale = 999; changed.speed = 999;
    expect(probe(options)).toEqual(expected);
    expect(options).toEqual({ alpha: 61, feather: -23, alphaRate: .18, featherRate: -.07, span: .45, side: -1, scale: 100 });
  });
});
