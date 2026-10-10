import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const window = {};
vm.runInNewContext(readFileSync('stem_lab/universe_flight_scene.js', 'utf8'), { window, Math });
const source = readFileSync('stem_lab/stem_tool_universe.js', 'utf8');
const start = source.indexOf('  function universeFlightPairFrame(');
const end = source.indexOf('  function universeFlightNeighbors(', start);
if (start < 0 || end < start) throw new Error('Landmark pair framing unavailable');
const pairFrame = vm.runInNewContext(source.slice(start, end) + '\nuniverseFlightPairFrame;', { Math, Number, Array });
const project = window.UniverseFlight.math.targetView;
const normalized = ray => {
  const length = Math.hypot(...ray);
  return ray.map(value => value / length);
};
const rotate = (ray, yaw, pitch) => {
  const [x, y, z] = ray, sy = Math.sin(yaw), cy = Math.cos(yaw), sp = Math.sin(pitch), cp = Math.cos(pitch);
  return [x * cy - y * sy * sp + z * sy * cp, y * cp + z * sp, -x * sy - y * cy * sp + z * cy * cp];
};
function assertProjection(plan, position, first, second, aspect) {
  expect(plan).not.toBeNull();
  expect(Number.isInteger(plan.fov)).toBe(true);
  expect(plan.fov).toBeGreaterThanOrEqual(10);
  expect(plan.fov).toBeLessThanOrEqual(100);
  expect(plan.yaw).toBeGreaterThanOrEqual(0);
  expect(plan.yaw).toBeLessThan(Math.PI * 2);
  expect(Math.abs(plan.pitch)).toBeLessThanOrEqual(Math.PI / 2 - .01);
  for (const [index, center] of [first, second].entries()) {
    const view = project(normalized(center.map((value, axis) => value - position[axis])), plan.yaw, plan.pitch, 0, plan.fov, aspect);
    expect(view.inView).toBe(true);
    for (const axis of [0, 1]) {
      expect(plan.screens[index][axis]).toBeCloseTo(view.screen[axis], 12);
      expect(view.screen[axis]).toBeGreaterThanOrEqual(.16 - 1e-10);
      expect(view.screen[axis]).toBeLessThanOrEqual(.84 + 1e-10);
    }
  }
}

describe('Landmark pair framing', () => {
  it('fits both centers using the real renderer projection across world scales, headings and viewports', () => {
    let count = 0;
    for (const scale of [1e-6, 1, 1e6, 1e12]) {
      for (const yaw of [0, .8, 3.4, 6.1]) {
        for (const pitch of [-.7, 0, .7]) {
          for (const aspect of [.35, .6, 1, 16 / 9, 4]) {
            const position = [scale * 4, -scale * 3, scale * 7];
            const centers = [[-.13, .045, 1], [.18, -.035, 1.2]].map(ray => rotate(ray, yaw, pitch).map((value, index) => position[index] + value * scale));
            const before = JSON.stringify([position, ...centers]);
            const plan = pairFrame(position, ...centers, 10, aspect);
            assertProjection(plan, position, ...centers, aspect);
            expect(JSON.stringify([position, ...centers])).toBe(before);
            count++;
          }
        }
      }
    }
    expect(count).toBe(240);
  });

  it('has a symmetric fit, reports angular separation, and preserves a wider existing lens', () => {
    const position = [2, -4, 10], first = [-2, -3, 24], second = [6, -5, 24];
    const initial = pairFrame(position, first, second, 10, 1.5);
    const swapped = pairFrame(position, second, first, 10, 1.5);
    expect(swapped.yaw).toBe(initial.yaw);
    expect(swapped.pitch).toBe(initial.pitch);
    expect(swapped.fov).toBe(initial.fov);
    expect(swapped.angleDeg).toBeCloseTo(initial.angleDeg, 12);
    expect(swapped.screens).toEqual([initial.screens[1], initial.screens[0]]);
    expect(initial.angleDeg).toBeCloseTo(2 * Math.atan(Math.sqrt(17) / 14) * 180 / Math.PI, 12);
    const wide = pairFrame(position, first, second, 89.2, 1.5);
    expect(wide.fov).toBe(90);
    assertProjection(wide, position, first, second, 1.5);
  });

  it('uses viewport shape when fitting and rejects a pair that cannot fit a narrow viewport', () => {
    const position = [0, 0, 0], first = [-.7, 0, 1], second = [.7, 0, 1];
    const square = pairFrame(position, first, second, 10, 1);
    const wide = pairFrame(position, first, second, 10, 2);
    assertProjection(square, position, first, second, 1);
    assertProjection(wide, position, first, second, 2);
    expect(square.fov).toBeGreaterThan(wide.fov);
    expect(pairFrame(position, first, second, 10, .5)).toBeNull();
    expect(pairFrame(position, [-2, 0, 1], [2, 0, 1], 10, 1)).toBeNull();
  });

  it('handles shared sightlines and enforces the camera pitch limit near both poles', () => {
    const position = [0, 0, 0], first = [0, 0, 2], second = [0, 0, 5];
    const aligned = pairFrame(position, first, second, 65, 1);
    expect(aligned.angleDeg).toBe(0);
    expect(aligned.screens).toEqual([[.5, .5], [.5, .5]]);
    for (const sign of [-1, 1]) {
      const outside = [0, sign * Math.cos(.02), Math.sin(.02)];
      const inside = [0, sign * Math.cos(.005), Math.sin(.005)];
      const near = pairFrame(position, outside, outside.map(value => value * 2), 65, .5);
      assertProjection(near, position, outside, outside.map(value => value * 2), .5);
      expect(pairFrame(position, inside, inside.map(value => value * 2), 65, .5)).toBeNull();
      expect(pairFrame(position, [0, sign, 0], [0, sign * 2, 0], 65, 1)).toBeNull();
    }
  });

  it('rejects invalid, opposite or camera-coincident inputs without modifying arguments', () => {
    const normal = [[0, 0, 0], [-.1, 0, 1], [.1, 0, 1], 65, 1];
    for (const bad of [null, [], [1, 2], [1, 2, 3, 4], [NaN, 0, 1], [0, Infinity, 1], ['0', 0, 1]]) {
      for (const index of [0, 1, 2]) {
        const args = normal.slice(); args[index] = bad;
        expect(pairFrame(...args)).toBeNull();
      }
    }
    for (const fov of [null, '65', NaN, Infinity, 9, 101]) expect(pairFrame(...normal.slice(0, 3), fov, 1)).toBeNull();
    for (const aspect of [null, '1', NaN, Infinity, 0, -1]) expect(pairFrame(...normal.slice(0, 4), aspect)).toBeNull();
    expect(pairFrame([0, 0, 0], [0, 0, 0], [0, 0, 1], 65, 1)).toBeNull();
    expect(pairFrame([0, 0, 0], [0, 0, 1], [0, 0, 0], 65, 1)).toBeNull();
    expect(pairFrame([0, 0, 0], [0, 0, 1], [0, 0, -1], 65, 1)).toBeNull();
    expect(pairFrame([0, 0, 0], [0, 0, 1], [1e-12, 0, -1], 65, 1)).toBeNull();
    expect(pairFrame([-1e308, 0, 0], [1e308, 0, 1], [0, 0, 2], 65, 1)).toBeNull();
    const frozen = normal.map(value => Array.isArray(value) ? Object.freeze(value.slice()) : value);
    expect(() => pairFrame(...frozen)).not.toThrow();
    expect(frozen).toEqual(normal);
  });
});
