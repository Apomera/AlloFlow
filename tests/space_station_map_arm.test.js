import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const { pose, target, step } = new Function(
  source.slice(source.indexOf('  var ISS_GM ='), source.indexOf('  function issTransferPlan(')) +
  '\nreturn { pose: issMapArmPose, target: issMapArmTarget, step: issMapArmStep };'
)();
const degrees = 180 / Math.PI;
const wrap = value => ((value + 180) % 360 + 360) % 360 - 180;
function near(actual, expected, tolerance = 1e-10) {
  expect(Number.isFinite(actual)).toBe(true);
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}
function vector(actual, expected, tolerance = 1e-10) {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((value, i) => near(value, expected[i], tolerance));
}
// Independent standard 2-D rotation matrices, with the original vector on +Y.
function rotate(vector, angle) {
  const c = Math.cos(angle / degrees), s = Math.sin(angle / degrees);
  return [c * vector[0] - s * vector[1], s * vector[0] + c * vector[1]];
}
function forward(shoulder, elbow) {
  const first = rotate([0, 1.4], shoulder);
  const second = rotate(rotate([0, 1.2], elbow), shoulder);
  return [first[0] + second[0], first[1] + second[1], 0];
}

describe('schematic arm geometry', () => {
  it('preserves the existing connected arm pose and both boom lengths', () => {
    const state = pose();
    vector(state.base, [0, 0, 0]);
    vector(state.lengths, [1.4, 1.2]);
    near(state.shoulder, .7 * degrees);
    near(state.elbow, -1.9 * degrees);
    vector(state.tip, forward(.7 * degrees, -1.9 * degrees));
    near(Math.hypot(...state.joint), 1.4);
    near(Math.hypot(...state.tip.map((value, i) => value - state.joint[i])), 1.2);
  });

  it('uses a relative elbow angle and wraps joint representations', () => {
    vector(pose({ shoulder: 90, elbow: -90 }).tip, [-1.4, 1.2, 0]);
    vector(pose({ shoulder: 450, elbow: 270 }).tip, [-1.4, 1.2, 0]);
    expect(pose({ shoulder: 450, elbow: 270 })).toMatchObject({ shoulder: 90, elbow: -90 });
  });

  for (const branch of [-1, 1]) {
    it(`solves independent forward positions throughout the workspace on branch ${branch}`, () => {
      for (const radius of [.2, .21, .6, 1.7, 2.59, 2.6]) {
        for (const angle of [-179, -120, -30, 0, 85, 179]) {
          const [x, y] = rotate([0, radius], angle);
          const solution = target({ x, y, branch });
          vector(forward(solution.shoulder, solution.elbow), solution.attainable);
          vector(solution.attainable, [x, y, 0]);
          near(solution.radius, radius);
          expect(solution.branch).toBe(branch);
          expect(Math.sign(solution.elbow) || branch).toBe(branch);
          near(solution.error, 0, 1e-14);
        }
      }
    });
  }

  it('returns distinct elbow configurations for the same reachable target', () => {
    const first = target({ x: .7, y: 1.4, branch: 1 });
    const second = target({ x: .7, y: 1.4, branch: -1 });
    vector(forward(first.shoulder, first.elbow), [.7, 1.4, 0]);
    vector(forward(second.shoulder, second.elbow), [.7, 1.4, 0]);
    expect(Math.abs(first.shoulder - second.shoulder)).toBeGreaterThan(30);
    near(first.elbow, -second.elbow);
  });

  for (const [radius, elbowMagnitude, outsideRadius, outsideStatus] of [[.2, 180, .2 - 1e-9, 'inner'], [2.6, 0, 2.6 + 1e-9, 'outer']]) {
    it(`recognizes rotated exact FK poses on the ${radius}-unit reach boundary despite roundoff`, () => {
      for (const shoulder of [-179, -137, -91, -30, -.01, 0, 17, 61, 123, 179]) {
        for (const branch of [-1, 1]) {
          const point = forward(shoulder, branch * elbowMagnitude);
          const solution = target({ x: point[0], y: point[1], branch });
          expect(solution).toMatchObject({ reachable: true, status: 'reachable' });
          vector(solution.requested, point);
          near(solution.radius, radius, 1e-12);
          expect(solution.error).toBeLessThanOrEqual(1e-12);
          vector(forward(solution.shoulder, solution.elbow), solution.attainable);
        }
        // The tolerance handles arithmetic noise; it does not enlarge the
        // reachable workspace by a geometrically meaningful distance.
        const [outsideX, outsideY] = rotate([0, outsideRadius], shoulder);
        expect(target({ x: outsideX, y: outsideY })).toMatchObject({ reachable: false, status: outsideStatus });
      }
    });
  }

  it('makes inner and outer unreachable requests explicit and projects radially', () => {
    const outer = target({ x: 3, y: 3 });
    expect(outer).toMatchObject({ reachable: false, status: 'outer', branch: -1, minReach: .2, maxReach: 2.6 });
    vector(outer.requested, [3, 3, 0]);
    vector(outer.attainable, [2.6 / Math.sqrt(2), 2.6 / Math.sqrt(2), 0]);
    near(outer.error, Math.sqrt(18) - 2.6);
    const inner = target({ x: -.03, y: -.04 });
    expect(inner).toMatchObject({ reachable: false, status: 'inner' });
    vector(inner.attainable, [-.12, -.16, 0]);
    near(inner.error, .15);
    vector(forward(inner.shoulder, inner.elbow), inner.attainable);
    for (const branch of [-1, 1]) {
      const origin = target({ x: 0, y: 0, branch });
      expect(origin.status).toBe('inner');
      vector(origin.attainable, [0, .2, 0]);
      vector(forward(origin.shoulder, origin.elbow), [0, .2, 0]);
    }
  });

  it('guards non-finite values and bounds coordinate inputs without mutating requests', () => {
    const input = Object.freeze({ x: 20, y: -20, branch: '1' });
    const result = target(input);
    vector(result.requested, [3.5, -3.5, 0]);
    expect(result.branch).toBe(1);
    vector(target({ x: NaN, y: Infinity, branch: NaN }).requested, [0, 2.6, 0]);
    expect(pose({ shoulder: Infinity, elbow: NaN })).toEqual(pose());
  });
});

describe('bounded arm motion', () => {
  const initial = { shoulder: 10, elbow: -80, shoulderRate: 0, elbowRate: 0, targetShoulder: 70, targetElbow: -20 };

  it('preserves pose and stored velocity during a zero-time retarget', () => {
    const input = Object.freeze({ ...initial, shoulderRate: 1.4, elbowRate: -.8, targetShoulder: -90, targetElbow: 100 });
    const result = step(input, 0);
    expect(result).toMatchObject({ shoulder: 10, elbow: -80, shoulderRate: 1.4, elbowRate: -.8, elapsedSeconds: 0 });
    expect(input.shoulderRate).toBe(1.4);
    expect(input.targetShoulder).toBe(-90);
  });

  it('enforces signed speed and acceleration limits during acceleration, braking, and reversal', () => {
    let state = { ...initial };
    let sawPositive = false, sawNegative = false;
    for (let i = 0; i < 1800; i++) {
      if (i === 300) state = { ...state, targetShoulder: -70, targetElbow: -160 };
      const previous = state;
      state = step(previous, .05);
      for (const [position, rate] of [['shoulder', 'shoulderRate'], ['elbow', 'elbowRate']]) {
        expect(Math.abs(state[rate])).toBeLessThanOrEqual(2 + 1e-12);
        expect(Math.abs(state[rate] - previous[rate])).toBeLessThanOrEqual(.5 * .05 + 1e-12);
        near(wrap(state[position] - previous[position]), .5 * (state[rate] + previous[rate]) * .05, 1.1e-7);
      }
      sawPositive ||= state.shoulderRate > 1.5;
      sawNegative ||= state.shoulderRate < -1.5;
    }
    expect(sawPositive).toBe(true);
    expect(sawNegative).toBe(true);
  });

  it('takes the short route through both angular representation seams', () => {
    const state = step({ shoulder: 179, elbow: -179, targetShoulder: -179, targetElbow: 179 }, 1);
    expect(state.shoulderRate).toBeGreaterThan(0);
    expect(state.elbowRate).toBeLessThan(0);
    expect(Math.abs(wrap(-179 - state.shoulder))).toBeLessThan(2);
    expect(Math.abs(wrap(179 - state.elbow))).toBeLessThan(2);
  });

  it('agrees when the same substep timeline is partitioned into separate calls', () => {
    const once = step(initial, 10);
    let partitioned = { ...initial };
    for (let i = 0; i < 200; i++) partitioned = step(partitioned, .05);
    for (const key of ['shoulder', 'elbow', 'shoulderRate', 'elbowRate']) near(partitioned[key], once[key], 1e-10);
    near(once.elapsedSeconds, 10);
  });

  it('stays close under finer non-aligned time subdivisions', () => {
    const once = step(initial, 5.1);
    let fine = { ...initial };
    for (let i = 0; i < 300; i++) fine = step(fine, .017);
    for (const key of ['shoulder', 'elbow']) near(fine[key], once[key], .004);
    for (const key of ['shoulderRate', 'elbowRate']) near(fine[key], once[key], .002);
  });

  it('settles on a fixed command and remains at rest', () => {
    const settled = step(initial, 180);
    expect(settled.slewing).toBe(false);
    near(settled.shoulder, 70, 1e-7);
    near(settled.elbow, -20, 1e-7);
    near(settled.shoulderRate, 0, 1e-8);
    near(settled.elbowRate, 0, 1e-8);
    expect(step(settled, 1)).toMatchObject({ shoulder: settled.shoulder, elbow: settled.elbow, shoulderRate: 0, elbowRate: 0, slewing: false });
  });

  it('treats disabled as an explicit hold rather than advancing the arm', () => {
    const held = step({ ...initial, shoulderRate: 1, elbowRate: -1, enabled: false }, 25);
    expect(held).toMatchObject({ shoulder: 10, elbow: -80, shoulderRate: 0, elbowRate: 0, elapsedSeconds: 25, slewing: false });
  });

  it('guards malformed times and state without returning non-finite values', () => {
    const result = step({ shoulder: NaN, elbow: Infinity, shoulderRate: 999, elbowRate: -999,
      targetShoulder: NaN, targetElbow: Infinity }, NaN);
    expect(result).toMatchObject({ elapsedSeconds: 0, shoulderRate: 2, elbowRate: -2, speedLimit: 2, accelerationLimit: .5 });
    for (const value of Object.values(result)) if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
    expect(step(initial, -100)).toEqual(step(initial, 0));
    expect(step(initial, Infinity)).toEqual(step(initial, 0));
  });
});
