import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const { pose, step, motion, forecast, at } = new Function(
  source.slice(source.indexOf('  var ISS_GM ='), source.indexOf('  function issTransferPlan(')) +
  '\nreturn { pose: issMapArmPose, step: issMapArmStep, motion: issMapArmMotion, forecast: issMapArmForecast, at: issMapArmForecastAt };'
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
// Independent forward geometry built by rotating original +Y link vectors.
function rotate(point, angle) {
  const c = Math.cos(angle * radians), s = Math.sin(angle * radians);
  return [c * point[0] - s * point[1], s * point[0] + c * point[1]];
}
function forward(shoulder, elbow) {
  const first = rotate([0, 1.4], shoulder), second = rotate(rotate([0, 1.2], elbow), shoulder);
  return [first[0] + second[0], first[1] + second[1], 0];
}
function assertSample(sample, expected, tolerance = 1e-10) {
  ['shoulder', 'elbow', 'shoulderRate', 'elbowRate'].forEach(key => near(sample[key], expected[key], tolerance));
  vector(sample.tip, forward(expected.shoulder, expected.elbow), tolerance);
  vector(sample.joint, [...rotate([0, 1.4], expected.shoulder), 0], tolerance);
  near(sample.speed, Math.hypot(...sample.velocity), tolerance);
  expect(sample.slewing).toBe(expected.slewing);
}
function deepFreeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(deepFreeze); Object.freeze(value); }
  return value;
}

describe('arm hand velocity', () => {
  for (const [shoulder, elbow, shoulderRate, elbowRate] of [[0, 0, 1, 0], [47, -112, -1.7, .6], [179.999, -179.999, 2, -2], [-91, 64, .04, 1.9]]) {
    it(`matches an independent five-point position derivative at ${shoulder}/${elbow}`, () => {
      const h = .001;
      const positions = [-2, -1, 1, 2].map(offset => forward(shoulder + offset * h * shoulderRate, elbow + offset * h * elbowRate));
      const derivative = [0, 1, 2].map(i => (positions[0][i] - 8 * positions[1][i] + 8 * positions[2][i] - positions[3][i]) / (12 * h));
      const state = motion({ shoulder, elbow, shoulderRate, elbowRate });
      vector(state.velocity, derivative, 2e-10);
      vector(state.tip, forward(shoulder, elbow));
      near(state.speed, Math.hypot(...derivative), 2e-10);
    });
  }
  it('reports zero speed at rest and permits instantaneous cancellation of moving joints', () => {
    vector(motion({ shoulder: 33, elbow: -78 }).velocity, [0, 0, 0]);
    near(motion({ shoulder: 0, elbow: 0, shoulderRate: .8, elbowRate: -.8 * 2.6 / 1.2 }).speed, 0, 1e-15);
    near(motion({ shoulder: 0, elbow: 180, shoulderRate: 1, elbowRate: 1 / 6 }).speed, 0, 1e-15);
  });
  it('recovers known full-extension and isolated-elbow speed limits', () => {
    const fastest = motion({ shoulder: 0, elbow: 0, shoulderRate: 2, elbowRate: 2 });
    vector(fastest.velocity, [-7.6 * radians, 0, 0]);
    near(fastest.speed, 7.6 * radians);
    near(motion({ shoulder: 71, elbow: -123, shoulderRate: 0, elbowRate: -2 }).speed, 2.4 * radians);
  });
  it('clamps supplied rates and remains finite for malformed inputs', () => {
    const bounded = motion({ shoulder: 450, elbow: -450, shoulderRate: 100, elbowRate: -100 });
    expect(bounded).toMatchObject({ shoulder: 90, elbow: -90, shoulderRate: 2, elbowRate: -2 });
    for (const value of [NaN, Infinity, -Infinity, null, undefined, '', 'bad']) {
      const state = motion({ shoulder: value, elbow: value, shoulderRate: value, elbowRate: value });
      vector(state.tip, pose().tip);
      vector(state.velocity, [0, 0, 0]);
      near(state.speed, 0);
    }
  });
  it('reverses velocity without changing geometry or speed when joint rates reverse', () => {
    const first = motion({ shoulder: 71, elbow: -37, shoulderRate: 1.3, elbowRate: -.5 });
    const second = motion({ shoulder: 71, elbow: -37, shoulderRate: -1.3, elbowRate: .5 });
    vector(first.tip, second.tip); vector(first.velocity, second.velocity.map(value => -value)); near(first.speed, second.speed);
  });
});

describe('arm servo forecast', () => {
  const starts = [
    { shoulder: 25, elbow: -100, shoulderRate: 1.3, elbowRate: -.4, targetShoulder: -80, targetElbow: 120 },
    { shoulder: 179.5, elbow: -179.7, shoulderRate: -1, elbowRate: 1, targetShoulder: -179, targetElbow: 179 },
    { shoulder: 0, elbow: 0, shoulderRate: 2, elbowRate: -2, targetShoulder: 0, targetElbow: 0 }
  ];
  for (const [index, start] of starts.entries()) {
    it(`matches direct servo advancement at integer knots for trajectory ${index + 1}`, () => {
      const plan = forecast(start);
      expect(plan).toMatchObject({ horizonSeconds: 120, sampleSeconds: 1 });
      expect(plan.samples).toHaveLength(121);
      for (const seconds of [0, 1, 4, 17, 60, 119, 120]) {
        expect(plan.samples[seconds].seconds).toBe(seconds);
        assertSample(plan.samples[seconds], step(plan.initial, seconds));
      }
      for (const sample of plan.samples) {
        expect(Math.abs(sample.shoulderRate)).toBeLessThanOrEqual(2);
        expect(Math.abs(sample.elbowRate)).toBeLessThanOrEqual(2);
        expect(sample.speed).toBeLessThanOrEqual(7.6 * radians + 1e-12);
        const radius = Math.hypot(...sample.tip);
        expect(radius).toBeGreaterThanOrEqual(.2 - 1e-12);
        expect(radius).toBeLessThanOrEqual(2.6 + 1e-12);
      }
    });
  }
  for (const seconds of [.001, 2.37, 37.123, 119.999]) {
    it(`solves ${seconds} s from the initial snapshot exactly as one live Advance call`, () => {
      const plan = forecast(starts[0]), selected = at(plan, seconds), expected = step(plan.initial, seconds);
      expect(selected.seconds).toBe(seconds);
      ['shoulder', 'elbow', 'shoulderRate', 'elbowRate'].forEach(key => expect(selected[key]).toBe(expected[key]));
      assertSample(selected, expected);
      vector(selected.velocity, motion(expected).velocity, 0);
    });
  }
  it('keeps nonzero initial velocity and brakes smoothly when asked to hold the current pose', () => {
    const plan = forecast(starts[2]), initial = plan.samples[0], early = at(plan, .1);
    expect(initial).toMatchObject({ shoulderRate: 2, elbowRate: -2, slewing: true });
    expect(early.shoulder).toBeGreaterThan(0); expect(early.elbow).toBeLessThan(0);
    expect(early.shoulderRate).toBeGreaterThanOrEqual(1.95 - 1e-12);
    expect(early.elbowRate).toBeLessThanOrEqual(-1.95 + 1e-12);
    const last = plan.samples[120];
    near(last.shoulder, 0, 1e-6); near(last.elbow, 0, 1e-6);
    near(last.shoulderRate, 0, 1e-7); near(last.elbowRate, 0, 1e-7);
  });
  it('keeps a settled target and a disabled servo stationary for the whole horizon', () => {
    for (const start of [{ shoulder: 47, elbow: -83 }, { ...starts[0], enabled: false }]) {
      const plan = forecast(start);
      for (const sample of plan.samples) {
        near(sample.shoulder, plan.initial.shoulder); near(sample.elbow, plan.initial.elbow);
        vector(sample.velocity, [0, 0, 0]); near(sample.speed, 0); expect(sample.slewing).toBe(false);
      }
    }
  });
  it('returns a continuous physical pose across wrapped angle representations', () => {
    const plan = forecast({ shoulder: 179.99, elbow: -179.99, shoulderRate: 1, elbowRate: -1, targetShoulder: -170, targetElbow: 170 });
    const before = at(plan, .009), after = at(plan, .011);
    expect(before.shoulder).toBeGreaterThan(179); expect(after.shoulder).toBeLessThan(-179);
    expect(Math.hypot(...after.tip.map((value, index) => value - before.tip[index]))).toBeLessThan(7.6 * radians * .002 + 1e-8);
  });
  it('normalizes input, bounds seek time, and returns null for missing plan data', () => {
    const plan = forecast({ shoulder: Infinity, elbow: NaN, shoulderRate: Infinity, elbowRate: 'bad', targetShoulder: '', targetElbow: null });
    vector(plan.samples[0].tip, pose().tip);
    expect(plan.samples.every(sample => Number.isFinite(sample.speed))).toBe(true);
    for (const value of [NaN, Infinity, -Infinity, null, undefined, '', 'bad', -1]) expect(at(plan, value).seconds).toBe(0);
    expect(at(plan, 121).seconds).toBe(120); expect(at(plan, '2.37').seconds).toBe(2.37);
    for (const value of [null, undefined, {}, { initial: {}, samples: [] }, { initial: [], samples: [{}] }, { initial: 'bad', samples: [{}] }, { samples: [{}] }]) expect(at(value, 2)).toBeNull();
  });
  it('does not mutate inputs, stored samples, or previously returned selections', () => {
    const start = deepFreeze({ ...starts[0] }), before = JSON.stringify(start), plan = forecast(start);
    expect(JSON.stringify(start)).toBe(before);
    const stored = JSON.stringify(plan); deepFreeze(plan);
    const first = at(plan, 2.37), previous = JSON.stringify(first);
    const second = at(plan, 2.37); second.tip[0] += 99; second.velocity[0] += 99;
    expect(JSON.stringify(first)).toBe(previous); expect(JSON.stringify(plan)).toBe(stored);
    expect(plan.samples[0].tip).not.toBe(plan.samples[1].tip);
    const normalized = motion(start); normalized.tip[0] += 99;
    expect(JSON.stringify(start)).toBe(before);
  });
});
