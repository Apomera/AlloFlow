import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('stem_lab/stem_tool_scaleexplorer.js', 'utf8');
const sandbox = { window: { StemLab: { registerTool() {} } } };
vm.runInNewContext(source.replace("  window.StemLab.registerTool('scaleExplorer', {",
  "  window.nebulaChartChecks = { nebulaChartPoint, nebulaChartProject, nebulaChartCourse, nebulaPose, nebulaPassage, nebulaPassagePose };\n  window.StemLab.registerTool('scaleExplorer', {"), sandbox);
const { nebulaChartPoint: point, nebulaChartProject: project, nebulaChartCourse: course,
  nebulaPose: pose, nebulaPassage: passage, nebulaPassagePose: sample } = sandbox.window.nebulaChartChecks;
const initial = Object.freeze({ x: -2, y: .5, z: 9, heading: 350, pitch: -.2, travel: 18.25 });
const bound = 16.8;
const angleDelta = (from, to) => ((to - from + 540) % 360) - 180;

describe('Orion Nebula cloud chart routes', () => {
  it('accepts only finite numeric horizontal coordinates', () => {
    for (const invalid of [null, undefined, {}, [], { x: 2 }, { z: 2 }]) {
      expect(point(invalid)).toBeNull();
      expect(project(invalid)).toBeNull();
      expect(course(initial, invalid)).toBeNull();
    }
    for (const key of ['x', 'z']) {
      for (const invalid of [NaN, Infinity, -Infinity, '2', undefined, null, true, 2n]) {
        const candidate = { x: 2, z: -3, [key]: invalid };
        expect(point(candidate)).toBeNull();
        expect(project(candidate)).toBeNull();
        expect(course(initial, candidate)).toBeNull();
      }
    }
    expect(point({ x: 2, z: -3, y: Infinity })).toEqual({ x: 2, z: -3 });
  });

  it('bounds targets to the exploration map without mutating or retaining input objects', () => {
    const input = Object.freeze({ x: 99, z: -99, y: 5 });
    const first = point(input), second = point(input);
    expect(first).toEqual({ x: bound, z: -bound });
    expect(first).not.toBe(input);
    expect(first).not.toBe(second);
    first.x = 0;
    expect(second).toEqual({ x: bound, z: -bound });
    expect(input).toEqual({ x: 99, z: -99, y: 5 });
    expect(point({ x: -bound, z: bound })).toEqual({ x: -bound, z: bound });
    expect(course(initial, input).to).toMatchObject({ x: bound, y: initial.y, z: -bound });
  });

  it('projects positive x right and positive z down on the full exploration map', () => {
    expect(project({ x: 0, z: 0 })).toEqual({ x: 100, y: 100 });
    for (const [target, expected] of [
      [{ x: -bound, z: -bound }, { x: 0, y: 0 }],
      [{ x: bound, z: bound }, { x: 200, y: 200 }],
      [{ x: 99, z: -99 }, { x: 200, y: 0 }]
    ]) expect(project(target)).toEqual(expected);
    expect(project({ x: 4, z: 0 }).x).toBeGreaterThan(100);
    expect(project({ x: 0, z: 4 }).y).toBeGreaterThan(100);
    expect(project({ x: -12, z: 12 }).x).toBeCloseTo(200 * (1 - 24 / 33.6) / 2, 10);
    expect(project({ x: -12, z: 12 }).y).toBeCloseTo(200 * (1 + 24 / 33.6) / 2, 10);
  });

  it('preserves the eight-light-year ruler length and coordinate round trips', () => {
    const origin = project({ x: 0, z: 0 });
    for (const target of [{ x: 8, z: 0 }, { x: 0, z: 8 }]) {
      const image = project(target);
      expect(Math.hypot(image.x - origin.x, image.y - origin.y)).toBeCloseTo(8 / 33.6 * 200, 10);
    }
    for (const x of [-bound, -12, -7.125, 0, 4.75, 12, bound]) {
      for (const z of [-bound, -12, -3.375, 0, 9.5, 12, bound]) {
        const image = project({ x, z });
        expect((image.x - 100) / 200 * 33.6).toBeCloseTo(x, 10);
        expect((image.y - 100) / 200 * 33.6).toBeCloseTo(z, 10);
      }
    }
  });

  it('normalizes the start and captures its current height when creating a course', () => {
    for (const candidate of [null, {}, { ...initial, x: Infinity },
      { x: -99, y: 99, z: 99, heading: -370, pitch: 99, travel: 2e6 }]) {
      const normalized = pose(candidate), route = course(candidate, { x: 5, z: -4 });
      expect(route).toMatchObject({ id: 'chart', level: true, progress: 0 });
      expect(route.from).toEqual(normalized);
      expect(route.from).not.toBe(candidate);
      expect(route.to).toMatchObject({ x: 5, y: normalized.y, z: -4, travel: normalized.travel, pitch: 0 });
      expect(route.duration).toBeCloseTo(Math.min(12, Math.max(2, Math.hypot(5 - normalized.x, -4 - normalized.z) / .85)), 10);
    }
    expect(course(initial, { x: initial.x + .01, z: initial.z }).duration).toBe(2);
    expect(course({ ...initial, x: -bound, z: bound }, { x: bound, z: -bound }).duration).toBe(12);
  });

  it('keeps the selected horizontal layer fixed throughout travel, including height bounds', () => {
    for (const y of [-bound, -7.25, 0, .8, bound]) {
      const route = course({ ...initial, x: -bound, y, z: bound }, { x: bound, z: -bound });
      for (let index = 0; index <= 100; index++) {
        const current = sample(route, index / 100), projected = project(current);
        expect(current.y).toBe(y);
        expect(current.travel).toBe(initial.travel);
        expect(Math.abs(current.x)).toBeLessThanOrEqual(bound);
        expect(Math.abs(current.z)).toBeLessThanOrEqual(bound);
        expect(projected.x + projected.y).toBeCloseTo(200, 10);
      }
    }
  });

  it('returns exact endpoints and independent poses while preserving free travel and route inputs', () => {
    const target = Object.freeze({ x: 4.25, z: -6.5 });
    const mutable = course(initial, target);
    const route = Object.freeze({ ...mutable, from: Object.freeze(mutable.from), to: Object.freeze(mutable.to) });
    const before = JSON.stringify(route), first = sample(route, .25), saved = JSON.stringify(first);
    for (const progress of [0, -1, -100]) {
      expect(sample(route, progress)).toEqual(route.from);
      expect(sample(route, progress)).not.toBe(route.from);
    }
    for (const progress of [1, 2, 100]) {
      expect(sample(route, progress)).toEqual(route.to);
      expect(sample(route, progress)).not.toBe(route.to);
    }
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
    expect(initial).toEqual({ x: -2, y: .5, z: 9, heading: 350, pitch: -.2, travel: 18.25 });
    expect(target).toEqual({ x: 4.25, z: -6.5 });
    const second = course(initial, target);
    expect(second.from).not.toBe(route.from);
    expect(second.to).not.toBe(route.to);
  });

  it('faces the horizontal destination and takes the shortest turn across north', () => {
    for (const [fromHeading, toHeading, direction] of [[350, 10, 1], [10, 350, -1]]) {
      const radians = toHeading * Math.PI / 180;
      const route = course({ ...initial, heading: fromHeading },
        { x: initial.x + Math.sin(radians) * 8, z: initial.z - Math.cos(radians) * 8 });
      expect(route.to.heading).toBeCloseTo(toHeading, 10);
      expect(route.to.pitch).toBe(0);
      expect(Math.abs(angleDelta(0, sample(route, .5).heading))).toBeLessThan(1e-9);
      expect(sample(route, .5).pitch).toBeCloseTo(initial.pitch / 2, 10);
      let previous = fromHeading;
      for (const progress of [.1, .25, .5, .75, .9, 1]) {
        const heading = sample(route, progress).heading;
        expect(angleDelta(previous, heading) * direction).toBeGreaterThanOrEqual(-1e-9);
        expect(Math.abs(angleDelta(fromHeading, heading))).toBeLessThanOrEqual(20 + 1e-9);
        previous = heading;
      }
    }
    for (const [target, heading] of [[{ x: -2, z: 8 }, 0], [{ x: -1, z: 9 }, 90],
      [{ x: -2, z: 10 }, 180], [{ x: -3, z: 9 }, 270]]) {
      expect(course(initial, target).to.heading).toBeCloseTo(heading, 10);
    }
  });

  it('keeps orientation when the selected destination is already at the camera', () => {
    const route = course(initial, { x: initial.x, z: initial.z });
    expect(route.to).toEqual(initial);
    expect(route.duration).toBe(2);
    for (let index = 0; index <= 100; index++) expect(sample(route, index / 100)).toEqual(initial);
    const close = course(initial, { x: initial.x + 5e-10, z: initial.z });
    expect(close.to.heading).toBe(initial.heading);
    expect(close.to.pitch).toBe(initial.pitch);
  });

  it('retains the existing vertical arc for named viewpoint passages', () => {
    for (const id of ['overview', 'trapezium', 'cavity', 'front', 'dust']) {
      const route = passage(initial, id);
      const distance = Math.hypot(route.to.x - route.from.x, route.to.y - route.from.y, route.to.z - route.from.z);
      expect(route.level).not.toBe(true);
      expect(sample(route, .5).y).toBeCloseTo((route.from.y + route.to.y) / 2 + Math.min(.7, distance * .06), 10);
      expect(sample(route, 0)).toEqual(route.from);
      expect(sample(route, 1)).toEqual(route.to);
    }
  });
});
