import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const pose = new Function(source.slice(source.indexOf('  var ISS_GM ='), source.indexOf('  function issTransferPlan(')) + '\nreturn issMapCameraPose;')();
const defaultPosition = [8.2, 4.8, 10.4], defaultTarget = [0, 0, 1];

function offset(position, target) { return position.map((value, axis) => value - target[axis]); }
function expectVectorClose(actual, expected, digits = 11) { actual.forEach((value, axis) => expect(value).toBeCloseTo(expected[axis], digits)); }
function expectConsistent(state) {
  const relative = offset(state.position, state.target);
  expect(Math.hypot(...relative)).toBeCloseTo(state.distance, 10);
  expectVectorClose(relative, [state.distance * Math.sin(state.polar) * Math.sin(state.azimuth), state.distance * Math.cos(state.polar), state.distance * Math.sin(state.polar) * Math.cos(state.azimuth)], 10);
  expect(state.position.every(Number.isFinite)).toBe(true);
  expect(state.target.every(Number.isFinite)).toBe(true);
  expect(Number.isFinite(state.azimuth)).toBe(true);
  expect(Number.isFinite(state.polar)).toBe(true);
}

describe('space station target-centered camera model', () => {
  it('rotates around an off-origin target without changing range or mutating its inputs', () => {
    const position = Object.freeze([7.4, 3.5, 14.2]), target = Object.freeze([1.4, -.5, 2.2]), options = Object.freeze({ yaw: Math.PI / 2 });
    const state = pose(position, target, options), relative = offset(position, target);
    expectVectorClose(state.position, [target[0] + relative[2], position[1], target[2] - relative[0]]);
    expect(state.distance).toBeCloseTo(Math.hypot(...relative), 12);
    expect(state.target).toEqual(target);
    expect(state.target).not.toBe(target);
    expect(state.position).not.toBe(position);
    expect(position).toEqual([7.4, 3.5, 14.2]); expect(target).toEqual([1.4, -.5, 2.2]); expect(options).toEqual({ yaw: Math.PI / 2 });
    expectConsistent(state);
    state.position[0] = 999; state.target[1] = 999;
    expect(pose(position, target, options).target).toEqual(target);
    expectVectorClose(pose(position, target, options).position, [target[0] + relative[2], position[1], target[2] - relative[0]]);
  });

  it('zooms relative to the selected target and reverses yaw and zoom away from constraints', () => {
    const position = [7.2, 3.3, 11.1], target = [1.2, -.7, 3.1], relative = offset(position, target);
    for (const zoom of [.5, 1.5, 2]) {
      const state = pose(position, target, { zoom });
      expectVectorClose(offset(state.position, target), relative.map(value => value * zoom));
      expect(state.distance).toBeCloseTo(Math.hypot(...relative) * zoom, 11);
      expect(state.target).toEqual(target); expectConsistent(state);
    }
    const moved = pose(position, target, { yaw: .73, zoom: 1.4 });
    const restored = pose(moved.position, moved.target, { yaw: -.73, zoom: 1 / 1.4 });
    expectVectorClose(restored.position, position);
    expect(restored.distance).toBeCloseTo(Math.hypot(...relative), 11);
    expectVectorClose(pose(position, target, { yaw: .73 + 8 * Math.PI }).position, pose(position, target, { yaw: .73 }).position);
  });

  it('moves downward with positive pitch while keeping distance and azimuth unchanged', () => {
    const position = [6, 5, 10], target = [1, .2, 2], initial = pose(position, target);
    const down = pose(position, target, { pitch: .2 }), up = pose(position, target, { pitch: -.2 });
    expect(down.polar).toBeCloseTo(initial.polar + .2, 12); expect(up.polar).toBeCloseTo(initial.polar - .2, 12);
    expect(down.position[1]).toBeLessThan(initial.position[1]); expect(up.position[1]).toBeGreaterThan(initial.position[1]);
    for (const state of [down, up]) {
      expect(state.distance).toBeCloseTo(initial.distance, 12);
      expect(Math.sin(state.azimuth)).toBeCloseTo(Math.sin(initial.azimuth), 12);
      expect(Math.cos(state.azimuth)).toBeCloseTo(Math.cos(initial.azimuth), 12);
      expectConsistent(state);
    }
    expectVectorClose(pose(down.position, target, { pitch: -.2 }).position, position);
  });

  it('clamps target distance and configured bounds without overshooting the selected target', () => {
    const position = [0, 0, 11], target = [0, 0, 1];
    for (const [options, distance] of [
      [{ zoom: .001 }, 3.2], [{ zoom: 1e6 }, 30], [{ zoom: .7 }, 7],
      [{ minDistance: -5, maxDistance: .5 }, 1],
      [{ minDistance: 100, maxDistance: 100 }, 15],
      [{ minDistance: 100, maxDistance: 100, zoom: 10 }, 40],
      [{ minDistance: 5, maxDistance: 2 }, 5],
      [{ minDistance: 5, maxDistance: 12, zoom: .01 }, 5],
      [{ minDistance: 5, maxDistance: 12, zoom: 100 }, 12],
    ]) {
      const state = pose(position, target, options);
      expect(state.distance).toBeCloseTo(distance, 12);
      expectVectorClose(state.position, [0, 0, target[2] + distance]);
      expect(state.position[2]).toBeGreaterThan(target[2]);
      expectConsistent(state);
    }
  });

  it('keeps both pole angles and the station floor safe through repeated large camera moves', () => {
    const target = [.8, -.9, 2], low = pose([3.8, .3, 8], target, { pitch: 1e6 });
    expect(low.position[1]).toBeCloseTo(-3.8, 11);
    expect(low.polar).toBeCloseTo(Math.acos((-3.8 - target[1]) / low.distance), 12);
    const high = pose([3.8, .3, 8], target, { pitch: -1e6 });
    expect(high.polar).toBe(.06);
    let state = high;
    for (let i = 0; i < 48; i++) {
      state = pose(state.position, target, { yaw: 37 * Math.PI + .3, pitch: i % 2 ? 20 : -20, zoom: [.01, 100, 1][i % 3] });
      expect(state.distance).toBeGreaterThanOrEqual(3.2 - 1e-12); expect(state.distance).toBeLessThanOrEqual(30 + 1e-12);
      expect(state.polar).toBeGreaterThanOrEqual(.06); expect(state.polar).toBeLessThanOrEqual(Math.PI - .06);
      expect(state.position[1]).toBeGreaterThanOrEqual(-3.8 - 1e-11);
      expect(state.target).toEqual(target); expectConsistent(state);
    }
    for (const sign of [-1, 1]) {
      const pole = pose([target[0], target[1] + sign * 10, target[2]], target);
      expect(pole.polar).toBeGreaterThanOrEqual(.06); expect(pole.polar).toBeLessThanOrEqual(Math.PI - .06);
      expect(pole.position[1]).toBeGreaterThanOrEqual(-3.8 - 1e-11); expectConsistent(pole);
    }
  });

  it('uses finite defaults for invalid vectors and ignores invalid motion options', () => {
    const defaults = pose(defaultPosition, defaultTarget);
    expect(pose()).toEqual(defaults); expect(pose(undefined, undefined, null)).toEqual(defaults);
    for (const vector of [null, [], [1, 2], [0, NaN, 1], [Infinity, 0, 1], ['bad', 0, 1], {}]) {
      expect(pose(vector, defaultTarget)).toEqual(defaults);
      expect(pose(defaultPosition, vector)).toEqual(defaults);
    }
    for (const invalid of [NaN, Infinity, -Infinity, 'bad']) {
      expect(pose(defaultPosition, defaultTarget, { yaw: invalid, pitch: invalid, minDistance: invalid, maxDistance: invalid })).toEqual(defaults);
    }
    for (const zoom of [0, -1, -Infinity, Infinity, NaN, 'bad', null]) expect(pose(defaultPosition, defaultTarget, { zoom })).toEqual(defaults);
    expectVectorClose(defaults.position, defaultPosition); expectConsistent(defaults);
  });

  it('chooses a finite outward direction when camera and target coincide', () => {
    const target = [1.5, -.9, 3], state = pose(target, target), length = Math.hypot(.4, 1);
    expect(state.target).toEqual(target); expect(state.distance).toBeCloseTo(10, 12);
    expectVectorClose(offset(state.position, target), [0, 4 / length, 10 / length]);
    expectConsistent(state);
    const limited = pose(target, target, { minDistance: 12, maxDistance: 15 });
    expect(limited.distance).toBe(12); expect(limited.position[1]).toBeGreaterThan(target[1]); expectConsistent(limited);
  });
});
