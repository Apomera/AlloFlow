import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('stem_lab/stem_tool_scaleexplorer.js', 'utf8');
const sandbox = { window: { StemLab: { registerTool() {} } } };
vm.runInNewContext(source.replace("  window.StemLab.registerTool('scaleExplorer', {",
  "  window.nebulaBearingChecks = { nebulaPose, nebulaBeacon, nebulaBearing };\n  window.StemLab.registerTool('scaleExplorer', {"), sandbox);
const { nebulaPose: pose, nebulaBeacon: beacon, nebulaBearing: bearing } = sandbox.window.nebulaBearingChecks;
const origin = Object.freeze({ x: 0, y: 0, z: 0, heading: 0, pitch: 0, travel: 7 });
const cluster = Object.freeze([-.144, .336, 3.24]);

function expectFinite(result) {
  for (const key of ['distance', 'heading', 'pitch', 'turn', 'tilt']) expect(Number.isFinite(result[key])).toBe(true);
  expect(result.distance).toBeGreaterThanOrEqual(0);
  expect(result.heading).toBeGreaterThanOrEqual(0);
  expect(result.heading).toBeLessThan(360);
  expect(Math.abs(result.pitch)).toBeLessThanOrEqual(Math.PI / 2);
  expect(Math.abs(result.turn)).toBeLessThanOrEqual(180);
  expect(typeof result.aligned).toBe('boolean');
}

describe('Orion central-star bearing', () => {
  it('reports cardinal bearings and distance in the same light-year coordinate system as navigation', () => {
    for (const [target, heading, turn] of [
      [[0, 0, -10], 0, 0], [[10, 0, 0], 90, 90], [[0, 0, 10], 180, 180], [[-10, 0, 0], 270, -90]
    ]) {
      const result = bearing(origin, target);
      expectFinite(result);
      expect(result.distance).toBeCloseTo(10, 10);
      expect(result.heading).toBeCloseTo(heading, 10);
      expect(result.pitch).toBe(0);
      expect(result.tilt).toBe(0);
      if (turn === 180) expect(Math.abs(result.turn)).toBe(180);
      else expect(result.turn).toBeCloseTo(turn, 10);
      expect(result.aligned).toBe(heading === 0);
    }
  });

  it('points at an oblique target in three dimensions rather than using a flat map distance', () => {
    const result = bearing(origin, [3, 4, -4]), length = Math.sqrt(41);
    expectFinite(result);
    expect(result.distance).toBeCloseTo(length, 10);
    expect(result.heading).toBeCloseTo(Math.atan2(3, 4) * 180 / Math.PI, 10);
    expect(result.pitch).toBeCloseTo(Math.atan2(4, 5), 10);
    const heading = result.heading * Math.PI / 180;
    const direction = [Math.sin(heading) * Math.cos(result.pitch), Math.sin(result.pitch), -Math.cos(heading) * Math.cos(result.pitch)];
    direction.forEach((value, index) => expect(value).toBeCloseTo([3, 4, -4][index] / length, 10));
    expect(result.turn).toBeCloseTo(result.heading, 10);
    expect(result.tilt).toBeCloseTo(result.pitch, 10);
    expect(result.aligned).toBe(false);
  });

  it('handles vertical targets and retains the camera direction at an exactly coincident target', () => {
    for (const direction of [-1, 1]) {
      const result = bearing({ ...origin, heading: 123, pitch: .25 }, [0, direction * 4, 0]);
      expectFinite(result);
      expect(result.distance).toBe(4);
      expect(result.pitch).toBeCloseTo(direction * Math.PI / 2, 10);
      expect(result.tilt).toBeCloseTo(direction * Math.PI / 2 - .25, 10);
      expect(result.aligned).toBe(false);
    }
    const current = Object.freeze({ x: 1, y: -2, z: 3, heading: 333, pitch: -.72, travel: 9 });
    expect(bearing(current, [1, -2, 3])).toEqual({ distance: 0, heading: 333, pitch: -.72, turn: 0, tilt: 0, aligned: true });
    const normalized = { ...current, heading: -33, pitch: -99 };
    expect(bearing(normalized, [1, -2, 3])).toMatchObject({ distance: 0, heading: pose(normalized).heading, pitch: -1.2, turn: 0, tilt: 0, aligned: true });
  });

  it('returns the shortest signed turn through north and treats opposite headings consistently', () => {
    for (const [cameraHeading, targetHeading, expected] of [[350, 10, 20], [10, 350, -20], [90, 0, -90], [270, 0, 90]]) {
      const radians = targetHeading * Math.PI / 180;
      const result = bearing({ ...origin, heading: cameraHeading }, [Math.sin(radians) * 8, 0, -Math.cos(radians) * 8]);
      expect(result.turn).toBeCloseTo(expected, 10);
      expect(result.heading).toBeCloseTo(targetHeading, 10);
    }
    for (const heading of [180, -180, 540]) {
      const result = bearing({ ...origin, heading }, [0, 0, -8]);
      expectFinite(result);
      expect(Math.abs(result.turn)).toBe(180);
    }
  });

  it('requires both horizontal and vertical alignment unless the target is within one hundredth of a light-year', () => {
    const target = [0, 0, -5];
    expect(bearing({ ...origin, heading: 355.01, pitch: -.089 }, target).aligned).toBe(true);
    expect(bearing({ ...origin, heading: 354.99, pitch: -.089 }, target).aligned).toBe(false);
    expect(bearing({ ...origin, heading: 355.01, pitch: -.091 }, target).aligned).toBe(false);
    expect(bearing({ ...origin, heading: 355, pitch: 0 }, target).aligned).toBe(false);
    expect(bearing({ ...origin, heading: 0, pitch: -.09 }, target).aligned).toBe(false);
    expect(bearing({ ...origin, heading: 180, pitch: 1.2 }, [0, 0, -.005]).aligned).toBe(true);
    expect(bearing({ ...origin, heading: 180, pitch: 1.2 }, [0, 0, -.01]).aligned).toBe(false);
  });

  it('sanitizes invalid saved poses and bounds valid coordinates before computing the bearing', () => {
    const expected = bearing(beacon('overview'));
    for (const value of [null, undefined, {}, [], { ...origin, x: NaN }, { ...origin, heading: Infinity }, { ...origin, pitch: '0' }]) {
      const result = bearing(value);
      expectFinite(result);
      expect(result).toEqual(expected);
    }
    for (const value of [
      { ...origin, x: 999, y: -999, z: 999, heading: -370, pitch: 99 },
      { ...origin, x: -999, y: 999, z: -999, heading: 721, pitch: -99, travel: Infinity }
    ]) {
      const result = bearing(value);
      expectFinite(result);
      expect(result).toEqual(bearing(pose(value)));
    }
  });

  it('defaults invalid targets to the central stars and keeps extreme finite inputs safe', () => {
    const expected = bearing(origin, cluster);
    expect(bearing(origin)).toEqual(expected);
    for (const target of [null, {}, '0,0,1', [], [0, 0], [0, 0, 1, 2], [0, NaN, 1], [0, Infinity, 1], [0, '0', 1], [0, null, 1], new Float32Array([0, 0, 1]), [0, , 1]]) {
      const result = bearing(origin, target);
      expectFinite(result);
      expect(result).toEqual(expected);
    }
    for (const target of [[Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE], [-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE]]) {
      expectFinite(bearing(origin, target));
    }
  });

  it('keeps world distance and target direction independent of camera heading, pitch and free travel', () => {
    const current = { x: -2.5, y: .75, z: 5.2, heading: 0, pitch: 0, travel: 0 };
    const expected = bearing(current), expectedDistance = Math.hypot(cluster[0] - current.x, cluster[1] - current.y, cluster[2] - current.z);
    expect(expected.distance).toBeCloseTo(expectedDistance, 10);
    for (const [heading, pitch, travel] of [[90, .5, 100], [180, -.7, 1e6], [359, 1.2, 37]]) {
      const result = bearing({ ...current, heading, pitch, travel });
      expect(result.distance).toBe(expected.distance);
      expect(result.heading).toBe(expected.heading);
      expect(result.pitch).toBe(expected.pitch);
      expect(result.tilt).toBeCloseTo(expected.pitch - pitch, 10);
    }
  });

  it('leaves saved poses and targets untouched and returns independent result objects', () => {
    const current = Object.freeze({ x: -2.5, y: .75, z: 5.2, heading: 321, pitch: -.3, travel: 15.25 });
    const target = Object.freeze([1, -.5, 2]), before = JSON.stringify([current, target]);
    const first = bearing(current, target), second = bearing(current, target);
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    first.heading = 17;
    first.distance = 0;
    expect(bearing(current, target)).toEqual(second);
    expect(JSON.stringify([current, target])).toBe(before);
  });
});
