import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const { step, brakePlan, forecast, at } = new Function(
  source.slice(source.indexOf('  var ISS_GM ='), source.indexOf('  function issTransferPlan(')) +
  '\nreturn { step: issMapArmStep, brakePlan: issMapArmBrakePlan, forecast: issMapArmForecast, at: issMapArmForecastAt };'
)();
const wrap = value => ((value + 180) % 360 + 360) % 360 - 180;
function near(actual, expected, tolerance = 1e-10) {
  expect(Number.isFinite(actual)).toBe(true);
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}
function vector(actual, expected, tolerance = 1e-10) {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((value, index) => near(value, expected[index], tolerance));
}
function forward(shoulder, elbow) {
  const rotate = (point, degrees) => {
    const angle = degrees * Math.PI / 180, c = Math.cos(angle), s = Math.sin(angle);
    return [c * point[0] - s * point[1], s * point[0] + c * point[1]];
  };
  const first = rotate([0, 1.4], shoulder), second = rotate(rotate([0, 1.2], elbow), shoulder);
  return [first[0] + second[0], first[1] + second[1], 0];
}
function assertPhysical(actual, expected) {
  for (const key of ['shoulder', 'elbow']) near(wrap(actual[key] - expected[key]), 0);
  for (const key of ['shoulderRate', 'elbowRate']) near(actual[key], expected[key]);
}
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
const initial = { shoulder: 31, elbow: -112, shoulderRate: 1.7, elbowRate: -.6, targetShoulder: -80, targetElbow: 90 };

describe('bounded robotic arm brake', () => {
  for (const [shoulderRate, elbowRate] of [[2, -2], [-1.7, .65], [.000000001, -.000000003]]) {
    it(`integrates the signed deceleration area without reversing at rates ${shoulderRate}/${elbowRate}`, () => {
      const start = { ...initial, shoulderRate, elbowRate, braking: true };
      for (const time of [0, 1e-10, .017, .3, 1.27, 4, 25]) {
        const actual = step(start, time);
        for (const [angle, rate] of [['shoulder', 'shoulderRate'], ['elbow', 'elbowRate']]) {
          const v0 = start[rate], sign = Math.sign(v0), stop = Math.abs(v0) / .5, t = Math.min(time, stop);
          // Independent integral of qdot(t) = v0 - sign(v0) * a * t,
          // stopped at the first zero; no negative velocity triangle remains.
          const displacement = v0 * t - sign * .5 * .5 * t * t;
          near(wrap(actual[angle] - start[angle]), displacement);
          near(actual[rate], time >= stop ? 0 : v0 - sign * .5 * time);
          expect(actual[rate] * v0).toBeGreaterThanOrEqual(0);
          expect(Math.abs(actual[rate] - v0)).toBeLessThanOrEqual(.5 * time + 1e-15);
        }
        expect(actual.slewing).toBe(time < Math.max(Math.abs(shoulderRate), Math.abs(elbowRate)) / .5);
      }
    });
  }

  it('preserves pose, rates, and saved targets when engaging or releasing at zero elapsed time', () => {
    const engaged = step({ ...initial, braking: true }, 0), released = step({ ...engaged, braking: false }, 0);
    for (const state of [engaged, released]) expect(state).toMatchObject({ ...initial, elapsedSeconds: 0 });
    expect(engaged.braking).toBe(true); expect(released.braking).toBe(false);
  });

  it('stops independently at each joint and then stays stopped despite distant saved commands', () => {
    const first = step({ ...initial, braking: true }, 1.2);
    near(first.shoulderRate, 1.1); near(first.elbowRate, 0); near(first.elbow, -112.36);
    const stopped = step(first, 5), later = step(stopped, 3600);
    expect(stopped).toMatchObject({ targetShoulder: -80, targetElbow: 90, braking: true, shoulderRate: 0, elbowRate: 0, slewing: false });
    assertPhysical(later, stopped);
    expect(later.slewing).toBe(false);
    expect(step({ ...stopped, braking: false }, .2).shoulderRate).toBeLessThan(0);
  });

  it('remains invariant under arbitrary time partitions, including calls that cross either stop time', () => {
    for (const times of [[.013, .117, .333, .999, 2.111, .777], [.001, 4.5], [1.2, 2.2, 1], [.25, .002, .0007]]) {
      const start = { ...initial, shoulder: 179.9, elbow: -179.9, braking: true };
      let partitioned = start;
      for (const time of times) partitioned = step(partitioned, time);
      assertPhysical(partitioned, step(start, times.reduce((sum, value) => sum + value, 0)));
    }
  });

  it('ignores target direction during braking while retaining normalized saved commands', () => {
    const first = step({ ...initial, braking: true, targetShoulder: 350, targetElbow: -490 }, 2.37);
    const other = step({ ...initial, braking: true, targetShoulder: 80, targetElbow: 100 }, 2.37);
    assertPhysical(first, other);
    expect(first).toMatchObject({ targetShoulder: -10, targetElbow: -130 });
    expect(other).toMatchObject({ targetShoulder: 80, targetElbow: 100 });
  });

  it('keeps a brake engaged at rest even when the commanded pose is elsewhere', () => {
    const start = { ...initial, shoulderRate: 0, elbowRate: 0, braking: true };
    for (const time of [0, .01, 4, 3600]) {
      const state = step(start, time);
      assertPhysical(state, start); expect(state.slewing).toBe(false); expect(state.braking).toBe(true);
    }
  });

  it('preserves the default servo response when the brake is absent or explicitly released', () => {
    for (const time of [0, .017, 2.37, 120]) expect(step(initial, time)).toEqual(step({ ...initial, braking: false }, time));
    // This long elbow maneuver still has a small nonzero rate at 120 s;
    // allow the unchanged critically damped servo to meet both tolerances.
    const settled = step({ ...initial, braking: false }, 180);
    near(settled.shoulder, initial.targetShoulder, 1e-7); near(settled.elbow, initial.targetElbow, 1e-7);
    expect(settled.slewing).toBe(false); expect(settled.braking).toBe(false);
  });

  it('preserves disabled hold semantics and normalizes malformed times, rates, and flags', () => {
    const held = step({ ...initial, enabled: false, braking: true }, 3);
    expect(held).toMatchObject({ shoulder: initial.shoulder, elbow: initial.elbow, shoulderRate: 0, elbowRate: 0, braking: true, enabled: false, slewing: false });
    for (const value of [NaN, Infinity, -Infinity, null, undefined, '', 'bad', -1]) {
      const state = step({ ...initial, braking: true }, value);
      assertPhysical(state, initial); expect(state.elapsedSeconds).toBe(0);
    }
    const bounded = step({ shoulder: NaN, elbow: Infinity, shoulderRate: 500, elbowRate: -500, braking: true }, 10);
    expect(bounded).toMatchObject({ shoulderRate: 0, elbowRate: 0, braking: true, slewing: false });
    for (const value of Object.values(bounded)) if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
    for (const braking of ['true', 1, null, undefined]) expect(step({ ...initial, braking }, 0).braking).toBe(false);
  });
});

describe('arm stopping path', () => {
  it('reports stop times, signed joint drift, and a curved hand path from independent geometry', () => {
    const plan = brakePlan(initial);
    expect(plan.initial).toMatchObject({ ...initial, braking: true });
    near(plan.stopSeconds, 3.4); near(plan.shoulderStopSeconds, 3.4); near(plan.elbowStopSeconds, 1.2);
    near(plan.shoulderDrift, 2.89); near(plan.elbowDrift, -.36);
    near(plan.stopped.shoulder, 33.89); near(plan.stopped.elbow, -112.36);
    expect(plan.stopped).toMatchObject({ shoulderRate: 0, elbowRate: 0, slewing: false, braking: true });
    vector(plan.tip, forward(33.89, -112.36));
    expect(plan.samples).toHaveLength(33);
    for (const sample of plan.samples) {
      const firstT = Math.min(sample.seconds, 3.4), secondT = Math.min(sample.seconds, 1.2);
      const shoulder = 31 + 1.7 * firstT - .25 * firstT * firstT, elbow = -112 - .6 * secondT + .25 * secondT * secondT;
      vector(sample.tip, forward(shoulder, elbow)); near(sample.shoulder, shoulder); near(sample.elbow, elbow);
    }
    vector(plan.samples[0].tip, forward(initial.shoulder, initial.elbow));
    vector(plan.samples[32].tip, plan.tip); expect(plan.samples[32].seconds).toBe(plan.stopSeconds);
  });

  it('bounds stopping time and angle drift under every supported signed rate', () => {
    for (const shoulderRate of [-100, -2, -1, 0, .001, 1.9, 100]) {
      for (const elbowRate of [-100, -.3, 0, .3, 100]) {
        const plan = brakePlan({ ...initial, shoulderRate, elbowRate });
        expect(plan.stopSeconds).toBeGreaterThanOrEqual(0); expect(plan.stopSeconds).toBeLessThanOrEqual(4);
        expect(Math.abs(plan.shoulderDrift)).toBeLessThanOrEqual(4); expect(Math.abs(plan.elbowDrift)).toBeLessThanOrEqual(4);
        expect(plan.stopped).toMatchObject({ shoulderRate: 0, elbowRate: 0, slewing: false });
        near(Math.abs(plan.shoulderDrift), plan.initial.shoulderRate ** 2); near(Math.abs(plan.elbowDrift), plan.initial.elbowRate ** 2);
      }
    }
  });

  it('keeps physical geometry continuous across angle wraps while reporting signed unwrapped drift', () => {
    const plan = brakePlan({ ...initial, shoulder: 179, elbow: -179, shoulderRate: 2, elbowRate: -2 });
    expect(plan.stopped).toMatchObject({ shoulder: -177, elbow: 177 });
    near(plan.shoulderDrift, 4); near(plan.elbowDrift, -4);
    vector(plan.tip, forward(183, -183));
    for (let i = 1; i < plan.samples.length; i++) {
      const prev = plan.samples[i - 1], next = plan.samples[i];
      expect(Math.hypot(...next.tip.map((value, k) => value - prev.tip[k]))).toBeLessThanOrEqual(7.6 * Math.PI / 180 * (next.seconds - prev.seconds) + 1e-10);
    }
  });

  it('produces finite duplicated points for rest, disabled, or invalid-rate inputs', () => {
    for (const start of [{ shoulder: 14, elbow: -71 }, { ...initial, enabled: false }, { shoulderRate: NaN, elbowRate: Infinity }]) {
      const plan = brakePlan(start);
      expect(plan.stopSeconds).toBe(0); expect(plan.samples).toHaveLength(33);
      for (const sample of plan.samples) {
        expect(sample).toMatchObject({ seconds: 0, shoulderRate: 0, elbowRate: 0, speed: 0, slewing: false });
        vector(sample.tip, plan.tip); vector(sample.velocity, [0, 0, 0]);
      }
    }
  });

  it('agrees with long-horizon forecast knots and arbitrary fractional inspection while braking', () => {
    const plan = brakePlan(initial), preview = forecast(plan.initial);
    expect(preview.initial.braking).toBe(true);
    for (const time of [0, .001, .55, 1.2, 2.37, 3.4, 7.5, 120]) {
      const expected = step(plan.initial, time), selected = at(preview, time);
      assertPhysical(selected, expected); vector(selected.tip, forward(expected.shoulder, expected.elbow));
      if (time >= plan.stopSeconds) vector(selected.tip, plan.tip);
    }
    for (let i = 0; i <= 120; i++) assertPhysical(preview.samples[i], step(plan.initial, i));
  });

  it('does not mutate inputs or share nested geometry across independently returned samples and plans', () => {
    const start = freeze({ ...initial }), before = JSON.stringify(start), first = brakePlan(start), second = brakePlan(start);
    expect(JSON.stringify(start)).toBe(before);
    expect(first.initial).not.toBe(start);
    const previous = JSON.stringify(first); freeze(first);
    second.samples[0].tip[0] += 99; second.tip[1] += 99; second.initial.targetShoulder = 0;
    expect(JSON.stringify(first)).toBe(previous); expect(JSON.stringify(start)).toBe(before);
    expect(first.tip).not.toBe(first.samples[32].tip); expect(first.samples[0].tip).not.toBe(first.samples[1].tip);
  });
});
