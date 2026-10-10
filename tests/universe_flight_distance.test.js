import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const window = {};
vm.runInNewContext(readFileSync('stem_lab/universe_flight_scene.js', 'utf8'), { window, Math });
const move = (...args) => window.UniverseFlight.math.rangeView(...args);
const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));

describe('Landmark camera distance geometry', () => {
  it('moves along the existing sightline with exact path length and independent results', () => {
    const center = [2, 3, 4], start = [8, 5, -4], originals = JSON.stringify([start, center]);
    const range = distance(start, center), closer = move(start, center, .8, .1, 100);
    expect(closer.rangeLy).toBeCloseTo(range * .8, 12);
    expect(closer.distanceLy).toBeCloseTo(range * .2, 12);
    expect(closer.minimumLy).toBe(.1); expect(closer.limited).toBe(false);
    closer.position.forEach((v, i) => expect(v).toBeCloseTo(center[i] + (start[i] - center[i]) * .8, 12));
    const farther = move(closer.position, center, 1.25, .1, 100);
    farther.position.forEach((v, i) => expect(v).toBeCloseTo(start[i], 12));
    expect(farther.distanceLy).toBeCloseTo(closer.distanceLy, 12);
    expect(farther.rangeLy).toBeCloseTo(range, 12);
    closer.position[0] = 1000;
    expect(JSON.stringify([start, center])).toBe(originals);
    expect(move(start, center, .8, .1, 100).position[0]).toBeCloseTo(6.8, 12);
  });

  it('stops at the minimum viewing range without crossing the target or adding excess distance', () => {
    const center = [1, 2, 3], start = [1, 2, -8], view = move(start, center, .5, 10, 100);
    expect(view.position).toEqual([1, 2, -7]); expect(view.rangeLy).toBe(10);
    expect(view.distanceLy).toBe(1); expect(view.minimumLy).toBe(10); expect(view.limited).toBe(true);
    expect(move(view.position, center, .8, 10, 100)).toBeNull();
    expect(move([1, 2, -6], center, .8, 10, 100)).toBeNull();
    expect(move([1, 2, -6], center, 1.25, 10, 100).rangeLy).toBeCloseTo(11.25, 12);
  });

  it('clips the outward ray at the world sphere even when the landmark is off center', () => {
    const center = [6, 0, 0], start = [6, 0, 7], view = move(start, center, 2, .1, 10);
    view.position.forEach((v, i) => expect(v).toBeCloseTo([6, 0, 8][i], 12)); expect(view.rangeLy).toBeCloseTo(8, 12);
    expect(view.maximumLy).toBeCloseTo(8, 12); expect(view.distanceLy).toBeCloseTo(1, 12); expect(view.limited).toBe(true);
    expect(distance(view.position, [0, 0, 0])).toBeCloseTo(10, 12);
    expect(move(view.position, center, 1.25, .1, 10)).toBeNull();
    expect(move(view.position, center, .8, .1, 10).rangeLy).toBeCloseTo(6.4, 12);
    for (let n = 0; n <= 20; n++) {
      const p = start.map((v, i) => v + (view.position[i] - v) * n / 20);
      expect(distance(p, [0, 0, 0])).toBeLessThanOrEqual(10);
      expect(distance(p, center)).toBeGreaterThanOrEqual(7);
    }
    const diagonal = move([2, 0, 4], [2, 0, 0], 2, .1, 10);
    expect(diagonal.maximumLy).toBeCloseTo(Math.sqrt(96), 12);
    expect(diagonal.limited).toBe(false);
  });

  it('rejects vertical sightlines while preserving accepted near-polar bearings', () => {
    for (const sign of [-1, 1]) {
      expect(move([0, sign * 10, 0], [0, 0, 0], .8, .1, 100)).toBeNull();
      expect(move([.05, sign * 10, 0], [0, 0, 0], 1.25, .1, 100)).toBeNull();
      const start = [.2, sign * 10, -.3], view = move(start, [0, 0, 0], .8, .1, 100);
      expect(view).not.toBeNull();
      view.position.forEach((v, i) => expect(v).toBeCloseTo(start[i] * .8, 12));
      expect(Math.abs(Math.atan2(view.position[1], Math.hypot(view.position[0], view.position[2])))).toBeLessThan(Math.PI / 2 - .01);
    }
  });

  it('rejects malformed inputs, unsupported factors and views outside the world', () => {
    for (const factor of [0, .49, 1, 2.01, NaN, Infinity, '0.8']) expect(move([0, 0, -10], [0, 0, 0], factor, .1, 100)).toBeNull();
    for (const value of [0, -1, NaN, Infinity, '1']) {
      expect(move([0, 0, -10], [0, 0, 0], .8, value, 100)).toBeNull();
      expect(move([0, 0, -10], [0, 0, 0], .8, .1, value)).toBeNull();
    }
    for (const point of [null, [], [0, 0], [0, 0, 0, 1], [NaN, 0, 0], [Infinity, 0, 0], ['0', 0, 0]]) {
      expect(move(point, [0, 0, 0], .8, .1, 100)).toBeNull();
      expect(move([0, 0, -10], point, .8, .1, 100)).toBeNull();
    }
    expect(move([0, 0, 0], [0, 0, 0], .8, .1, 100)).toBeNull();
    expect(move([0, 0, -101], [0, 0, 0], .8, .1, 100)).toBeNull();
    expect(move([0, 0, -10], [101, 0, 0], .8, .1, 100)).toBeNull();
    expect(move([Number.MAX_VALUE, 0, 0], [-Number.MAX_VALUE, 0, 0], .8, .1, Number.MAX_VALUE)).toBeNull();
  });
});
