import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('stem_lab/stem_tool_scaleexplorer.js', 'utf8');
const sandbox = { window: { StemLab: { registerTool() {} } } };
vm.runInNewContext(source.replace("  window.StemLab.registerTool('scaleExplorer', {",
  "  window.nebulaPassageChecks = { nebulaPose, nebulaBeacon, nebulaPassage, nebulaPassagePose };\n  window.StemLab.registerTool('scaleExplorer', {"), sandbox);
const { nebulaPose: pose, nebulaBeacon: beacon, nebulaPassage: passage,
  nebulaPassagePose: sample } = sandbox.window.nebulaPassageChecks;
const initial = Object.freeze({ x: -2, y: .5, z: 9, heading: 350, pitch: -.2, travel: 18.25 });
const bound = 16.8;
const angleDelta = (from, to) => ((to - from + 540) % 360) - 180;

function expectBounded(value) {
  for (const key of ['x', 'y', 'z', 'heading', 'pitch', 'travel']) expect(Number.isFinite(value[key])).toBe(true);
  for (const key of ['x', 'y', 'z']) expect(Math.abs(value[key])).toBeLessThanOrEqual(bound);
  expect(value.heading).toBeGreaterThanOrEqual(0);
  expect(value.heading).toBeLessThan(360);
  expect(Math.abs(value.pitch)).toBeLessThanOrEqual(1.2);
  expect(value.travel).toBeGreaterThanOrEqual(0);
  expect(value.travel).toBeLessThanOrEqual(1e6);
}

function frozenRoute(from, to) {
  return Object.freeze({ id: 'front', from: Object.freeze(from), to: Object.freeze(to), progress: 0, duration: 6 });
}

describe('Orion Nebula beacon passages', () => {
  it('creates independent routes with exact named destinations and a bounded duration', () => {
    for (const id of ['overview', 'trapezium', 'cavity', 'front', 'dust']) {
      const route = passage(initial, id);
      expect(route).toMatchObject({ id, progress: 0 });
      expect(route.from).toEqual(pose(initial));
      expect(route.to).toEqual(beacon(id, initial));
      expect(route.from).not.toBe(initial);
      expect(route.to).not.toBe(route.from);
      expect(Number.isFinite(route.duration)).toBe(true);
      expect(route.duration).toBeGreaterThanOrEqual(2);
      expect(route.duration).toBeLessThanOrEqual(12);
    }
    const first = passage(initial, 'front'), second = passage(initial, 'front');
    first.from.x = 12;
    first.to.y = 8;
    expect(second.from).toEqual(pose(initial));
    expect(second.to).toEqual(beacon('front', initial));
    expect(initial).toEqual({ x: -2, y: .5, z: 9, heading: 350, pitch: -.2, travel: 18.25 });
  });

  it('falls back safely for unknown and inherited beacon names', () => {
    const expected = passage(initial, 'overview');
    for (const id of ['unknown', 'constructor', 'toString', '__proto__', 'hasOwnProperty', null, undefined]) {
      const route = passage(initial, id);
      expect(route.id).toBe('overview');
      expect(route.from).toEqual(expected.from);
      expect(route.to).toEqual(expected.to);
      expect(route.duration).toBe(expected.duration);
      expect(beacon(id, initial)).toEqual(beacon('overview', initial));
    }
  });

  it('sanitizes saved starting poses and keeps every interpolated pose within the volume', () => {
    const candidates = [null, {}, { ...initial, x: NaN }, { ...initial, z: Infinity },
      { ...initial, heading: '350' }, { x: 99, y: 99, z: -99, heading: -370, pitch: 99, travel: 2e6 },
      { x: -99, y: -99, z: 99, heading: 721, pitch: -99, travel: -8 }];
    for (const candidate of candidates) {
      for (const id of ['overview', 'front', 'dust']) {
        const route = passage(candidate, id);
        expect(route.from).toEqual(pose(candidate));
        for (const progress of [0, .001, .05, .25, .5, .75, .95, .999, 1]) expectBounded(sample(route, progress));
      }
    }
    const route = frozenRoute({ ...initial, x: -bound, y: bound, z: bound },
      { ...initial, x: bound, y: bound, z: -bound });
    for (const progress of [.1, .25, .5, .75, .9]) expectBounded(sample(route, progress));
  });

  it('returns exact endpoints as separate values and clamps out-of-range progress', () => {
    const route = passage(initial, 'dust');
    for (const progress of [0, -1, -100]) {
      expect(sample(route, progress)).toEqual(route.from);
      expect(sample(route, progress)).not.toBe(route.from);
    }
    for (const progress of [1, 2, 100]) {
      expect(sample(route, progress)).toEqual(route.to);
      expect(sample(route, progress)).not.toBe(route.to);
    }
    for (const progress of [NaN, Infinity, -Infinity, '0.5', null, undefined]) {
      expect(sample(route, progress)).toEqual(route.from);
    }
  });

  it('takes the short turn across north in both directions', () => {
    for (const [fromHeading, toHeading, direction] of [[350, 10, 1], [10, 350, -1]]) {
      const route = frozenRoute({ ...initial, heading: fromHeading },
        { ...initial, x: 4, z: 2, heading: toHeading, pitch: .4 });
      const middle = sample(route, .5);
      expect(Math.abs(angleDelta(0, middle.heading))).toBeLessThan(1e-9);
      expect(middle.pitch).toBeCloseTo(.1, 10);
      let previous = fromHeading;
      for (const progress of [.1, .25, .5, .75, .9, 1]) {
        const current = sample(route, progress).heading;
        expect(angleDelta(previous, current) * direction).toBeGreaterThanOrEqual(-1e-9);
        expect(Math.abs(angleDelta(fromHeading, current))).toBeLessThanOrEqual(20 + 1e-9);
        previous = current;
      }
    }
  });

  it('moves continuously toward the destination and eases away from both endpoints', () => {
    const route = frozenRoute({ ...initial, x: -4, z: 8, y: .5 },
      { ...initial, x: 4, z: -2, y: .5, heading: 20 });
    let previous = route.from;
    for (let index = 1; index <= 100; index++) {
      const current = sample(route, index / 100);
      expect(current.x).toBeGreaterThanOrEqual(previous.x);
      expect(current.z).toBeLessThanOrEqual(previous.z);
      expect(Math.hypot(current.x - previous.x, current.z - previous.z)).toBeLessThan(.3);
      previous = current;
    }
    const initialStep = sample(route, .01).x - route.from.x;
    const finalStep = route.to.x - sample(route, .99).x;
    const middleStep = sample(route, .51).x - sample(route, .5).x;
    expect(initialStep).toBeGreaterThan(0);
    expect(finalStep).toBeGreaterThan(0);
    expect(initialStep).toBeLessThan(middleStep / 10);
    expect(finalStep).toBeLessThan(middleStep / 10);
    expect(sample(route, .5).x).toBeCloseTo(0, 10);
    expect(sample(route, .5).z).toBeCloseTo(3, 10);
  });

  it('preserves the free travel count without mutating the route or previously sampled poses', () => {
    const mutable = passage(initial, 'trapezium');
    const route = Object.freeze({ ...mutable, from: Object.freeze(mutable.from), to: Object.freeze(mutable.to) });
    const before = JSON.stringify(route), first = sample(route, .25), saved = JSON.stringify(first);
    for (const progress of [0, .1, .25, .5, .75, .9, 1]) {
      const current = sample(route, progress);
      expect(current.travel).toBe(initial.travel);
      expect(current).not.toBe(first);
    }
    expect(JSON.stringify(route)).toBe(before);
    expect(JSON.stringify(first)).toBe(saved);
    first.x = 16;
    expect(sample(route, .25).x).not.toBe(16);
    expect(JSON.stringify(route)).toBe(before);
  });

  it('keeps short trips responsive and limits long trips to twelve seconds', () => {
    for (const id of ['overview', 'trapezium', 'cavity', 'front', 'dust']) {
      expect(passage(beacon(id), id).duration).toBe(2);
      const nearby = { ...beacon(id), x: beacon(id).x + .01 };
      expect(passage(nearby, id).duration).toBe(2);
      const distant = { ...initial, x: -bound, y: bound, z: bound };
      expect(passage(distant, id).duration).toBe(12);
    }
  });
});
