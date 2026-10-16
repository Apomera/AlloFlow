import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const { compare } = new Function(
  source.slice(source.indexOf('  var ISS_GM ='), source.indexOf('  function issTransferPlan(')) +
  '\nreturn { compare: issMapArmComparison };'
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
// Independent planar forward geometry, rotating the two original +Y booms.
function rotate(point, degrees) {
  const c = Math.cos(degrees * radians), s = Math.sin(degrees * radians);
  return [point[0] * c - point[1] * s, point[0] * s + point[1] * c, point[2] || 0];
}
function forward(shoulder, elbow) {
  const joint = rotate([0, 1.4, 0], shoulder);
  const distal = rotate(rotate([0, 1.2, 0], elbow), shoulder);
  return { joint, tip: joint.map((value, index) => value + distal[index]) };
}
function transform(point, [rx, ry, rz], translation) {
  const c = [rx, ry, rz].map(angle => Math.cos(angle * radians));
  const s = [rx, ry, rz].map(angle => Math.sin(angle * radians));
  const x = [point[0], c[0] * point[1] - s[0] * point[2], s[0] * point[1] + c[0] * point[2]];
  const y = [c[1] * x[0] + s[1] * x[2], x[1], -s[1] * x[0] + c[1] * x[2]];
  return [c[2] * y[0] - s[2] * y[1], s[2] * y[0] + c[2] * y[1], y[2]].map((v, i) => v + translation[i]);
}

describe('saved arm reference comparison', () => {
  for (const [first, second] of [
    [[0, 0], [90, 0]], [[47, -113], [-27, 81]], [[179.9, -179.8], [-179.6, 179.7]]
  ]) {
    it(`compares independent forward geometry at ${first.join('/')} and ${second.join('/')}`, () => {
      const reference = { shoulder: first[0], elbow: first[1], seconds: 4.125 };
      const current = { shoulder: second[0], elbow: second[1], seconds: 9.75 };
      const result = compare(reference, current), before = forward(...first), after = forward(...second);
      vector(result.reference.tip, before.tip); vector(result.reference.joint, before.joint);
      vector(result.current.tip, after.tip); vector(result.current.joint, after.joint);
      const delta = after.tip.map((value, i) => value - before.tip[i]);
      vector(result.delta, delta); near(result.distance, Math.hypot(...delta));
      near(result.elapsedSeconds, 5.625, 0);
    });
  }

  it('reports hand displacement rather than the arc length traveled', () => {
    const result = compare({ shoulder: 0, elbow: 0 }, { shoulder: 90, elbow: 0 });
    vector(result.delta, [-2.6, -2.6, 0]);
    near(result.distance, 2.6 * Math.sqrt(2));
    expect(result.distance).toBeLessThan(2.6 * Math.PI / 2);
  });

  it('resolves an elbow-only difference without moving the saved elbow joint', () => {
    const result = compare({ shoulder: 0, elbow: 0 }, { shoulder: 0, elbow: 180 });
    vector(result.reference.joint, [0, 1.4, 0]); vector(result.current.joint, result.reference.joint, 0);
    vector(result.delta, [0, -2.4, 0]); near(result.distance, 2.4);
    expect(result.shoulderDelta).toBe(0); expect(result.elbowDelta).toBe(180);
  });

  it('returns exact zero displacement for the same normalized pose, irrespective of rates or elapsed time', () => {
    const result = compare(
      { shoulder: 29, elbow: -116, shoulderRate: 2, elbowRate: -1.2, seconds: 7 },
      { shoulder: 29 + 720, elbow: -116 - 1080, shoulderRate: -.5, elbowRate: .7, seconds: 20 }
    );
    vector(result.delta, [0, 0, 0], 0); near(result.distance, 0, 0);
    expect(result.shoulderDelta).toBe(0); expect(result.elbowDelta).toBe(0);
    near(result.elapsedSeconds, 13, 0);
  });

  it('preserves distance under a common 3D station rotation and translation', () => {
    const result = compare({ shoulder: -54, elbow: 125 }, { shoulder: 80, elbow: -71 });
    const rotation = [31, -73, 127], translation = [1.251, .315, -1.6];
    const reference = transform(result.reference.tip, rotation, translation);
    const current = transform(result.current.tip, rotation, translation);
    const delta = current.map((v, i) => v - reference[i]);
    vector(delta, transform(result.delta, rotation, [0, 0, 0]), 2e-15);
    near(Math.hypot(...delta), result.distance, 2e-15);
  });

  it('uses signed shortest orientation differences across the wrap boundary', () => {
    const forward = compare({ shoulder: 179, elbow: -179 }, { shoulder: -179, elbow: 179 });
    const reverse = compare({ shoulder: -179, elbow: 179 }, { shoulder: 179, elbow: -179 });
    expect(forward.shoulderDelta).toBe(2); expect(forward.elbowDelta).toBe(-2);
    expect(reverse.shoulderDelta).toBe(-2); expect(reverse.elbowDelta).toBe(2);
    vector(reverse.delta, forward.delta.map(v => -v), 0); near(reverse.distance, forward.distance, 0);
  });

  it('uses +180 for either half-turn tie and never reports accumulated turns', () => {
    for (const halfTurn of [-540, -180, 180, 540]) {
      const result = compare({ shoulder: 0, elbow: 0 }, { shoulder: halfTurn, elbow: halfTurn });
      expect(result.shoulderDelta).toBe(180); expect(result.elbowDelta).toBe(180);
    }
    const turns = compare({ shoulder: -73, elbow: 42 }, { shoulder: -73 + 3600, elbow: 42 - 7200 });
    expect(turns.shoulderDelta).toBe(0); expect(turns.elbowDelta).toBe(0);
  });

  it('derives geometry from joint angles rather than trusting stale supplied vectors', () => {
    const result = compare(
      { shoulder: 0, elbow: 0, tip: [100, 200, 300], joint: [30, 40, 50] },
      { shoulder: 90, elbow: 0, tip: [100, 200, 300], joint: [30, 40, 50] }
    );
    vector(result.reference.tip, [0, 2.6, 0]); vector(result.current.tip, [-2.6, 0, 0]);
    near(result.distance, 2.6 * Math.sqrt(2));
  });

  it('normalizes rates and includes independently correct snapshot hand velocities', () => {
    const result = compare(
      { shoulder: 0, elbow: 0, shoulderRate: '100', elbowRate: '-100' },
      { shoulder: 90, elbow: -90, shoulderRate: '-100', elbowRate: '100' }
    );
    expect(result.reference.shoulderRate).toBe(2); expect(result.reference.elbowRate).toBe(-2);
    expect(result.current.shoulderRate).toBe(-2); expect(result.current.elbowRate).toBe(2);
    vector(result.reference.velocity, [-2.8 * radians, 0, 0], 1e-15);
    vector(result.current.velocity, [0, 2.8 * radians, 0], 1e-15);
  });

  it('keeps fractional timestamps and clamps a comparison to an earlier time to zero elapsed seconds', () => {
    const result = compare({ seconds: '100.125' }, { seconds: '101.375' });
    near(result.reference.seconds, 100.125, 0); near(result.current.seconds, 101.375, 0);
    near(result.elapsedSeconds, 1.25, 0);
    near(compare({ seconds: 10 }, { seconds: 9 }).elapsedSeconds, 0, 0);
    near(compare({ seconds: 1e12 }, { seconds: 1e12 + .25 }).elapsedSeconds, .25, 0);
  });

  it('sanitizes malformed or negative times while retaining finite normalized geometry', () => {
    for (const invalid of [undefined, null, '', 'bad', NaN, Infinity, -Infinity, -4]) {
      const result = compare({ seconds: invalid }, { seconds: invalid });
      near(result.reference.seconds, 0, 0); near(result.current.seconds, 0, 0); near(result.elapsedSeconds, 0, 0);
      vector(result.delta, [0, 0, 0], 0); near(result.distance, 0, 0);
    }
    const result = compare({ shoulder: NaN, elbow: Infinity }, {});
    vector(result.delta, [0, 0, 0], 0);
    expect(result.reference.shoulderRate).toBe(0); expect(result.current.elbowRate).toBe(0);
    near(compare(null, undefined).distance, 0, 0);
  });

  it('preserves frozen inputs and does not alias vectors between snapshots or calls', () => {
    const input = Object.freeze({ shoulder: -57, elbow: 130, shoulderRate: .9, elbowRate: -1.1, seconds: 12.375 });
    const before = JSON.stringify(input), first = compare(input, input), second = compare(input, input);
    const independent = JSON.stringify(second), current = JSON.stringify(first.current), delta = [...first.delta];
    first.reference.tip[0] += 20; first.reference.joint[1] += 10; first.reference.velocity[0] -= 5;
    expect(JSON.stringify(input)).toBe(before); expect(JSON.stringify(second)).toBe(independent);
    expect(JSON.stringify(first.current)).toBe(current); vector(first.delta, delta, 0);
    expect(first.reference).not.toBe(first.current);
    expect(first.reference.tip).not.toBe(first.current.tip);
    expect(first.reference.tip).not.toBe(first.reference.joint);
    expect(first.delta).not.toBe(first.current.tip);
  });
});
