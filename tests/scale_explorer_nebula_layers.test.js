import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(process.env.SCALE_LAYERS_SOURCE || 'stem_lab/stem_tool_scaleexplorer.js', 'utf8');
const sandbox = { window: { StemLab: { registerTool() {} } } };
vm.runInNewContext(source.replace("  window.StemLab.registerTool('scaleExplorer', {",
  "  window.nebulaLayerChecks = { nebulaLayerHeight, nebulaLayerCourse, nebulaPose, nebulaPassagePose };\n  window.StemLab.registerTool('scaleExplorer', {"), sandbox);
const { nebulaLayerHeight: height, nebulaLayerCourse: course, nebulaPose: pose,
  nebulaPassagePose: sample } = sandbox.window.nebulaLayerChecks;
const initial = Object.freeze({ x: -2.75, y: .5, z: 9.25, heading: 350, pitch: -.35, travel: 18.25 });
const stationaryFields = ['x', 'z', 'heading', 'pitch', 'travel'];

describe('Orion Nebula layer survey navigation', () => {
  it('rejects invalid heights without coercing values or throwing', () => {
    for (const invalid of [null, undefined, NaN, Infinity, -Infinity, '', '0', '12', false, true,
      [], [2], {}, new Number(2), 2n, Symbol('height')]) {
      expect(height(invalid)).toBeNull();
      expect(course(initial, invalid)).toBeNull();
    }
  });

  it('preserves finite layer heights and clamps to the actual cloud faces', () => {
    for (const value of [-12, -11.75, -.05, 0, .05, 11.75, 12]) expect(height(value)).toBe(value);
    for (const value of [-Number.MAX_VALUE, -16.8, -12.001]) expect(height(value)).toBe(-12);
    for (const value of [12.001, 16.8, Number.MAX_VALUE]) expect(height(value)).toBe(12);
  });

  it('changes only the selected vertical coordinate of a new course', () => {
    const route = course(initial, -3.75);
    expect(route).toMatchObject({ id: 'layer', level: true, progress: 0 });
    expect(route.from).toEqual(initial);
    expect(route.to).toEqual({ ...initial, y: -3.75 });
    for (const key of stationaryFields) expect(route.to[key]).toBe(route.from[key]);
    expect(route.from).not.toBe(initial);
    expect(route.from).not.toBe(route.to);
  });

  it('normalizes the starting pose while keeping cloud targets separate from exploration bounds', () => {
    const raw = Object.freeze({ x: 80, y: -90, z: -80, heading: -370, pitch: 3, travel: 2e6 });
    const route = course(raw, 30);
    expect(route.from).toEqual({ x: 16.8, y: -16.8, z: -16.8, heading: 350, pitch: 1.2, travel: 1e6 });
    expect(route.to).toEqual({ x: 16.8, y: 12, z: -16.8, heading: 350, pitch: 1.2, travel: 1e6 });
    for (const invalid of [null, {}, { ...initial, x: Infinity }, { ...initial, pitch: '0' }]) {
      const fallback = course(invalid, -6);
      expect(fallback.from).toEqual(pose(invalid));
      expect(fallback.to).toEqual({ ...pose(invalid), y: -6 });
    }
    expect(raw.y).toBe(-90);
  });

  it('scales journey time with vertical distance while bounding long and tiny trips', () => {
    const from = { ...initial, y: 0 };
    expect(course(from, 0).duration).toBe(2);
    expect(course(from, .001).duration).toBe(2);
    expect(course(from, 1.7).duration).toBe(2);
    expect(course(from, 4.25).duration).toBeCloseTo(5, 12);
    expect(course(from, -4.25).duration).toBeCloseTo(5, 12);
    expect(course({ ...from, y: -16.8 }, 12).duration).toBe(12);
  });

  it('ascends and descends monotonically without a horizontal arc or angle change', () => {
    for (const [fromY, targetY] of [[-8.25, 7.5], [8.25, -7.5], [-12, 12], [12, -12]]) {
      const route = course({ ...initial, y: fromY }, targetY), direction = Math.sign(targetY - fromY);
      let previous = fromY;
      for (let index = 0; index <= 200; index++) {
        const current = sample(route, index / 200);
        expect(direction * (current.y - previous)).toBeGreaterThanOrEqual(-1e-10);
        expect(current.y).toBeGreaterThanOrEqual(Math.min(fromY, targetY) - 1e-10);
        expect(current.y).toBeLessThanOrEqual(Math.max(fromY, targetY) + 1e-10);
        for (const key of stationaryFields) expect(current[key]).toBe(initial[key]);
        previous = current.y;
      }
      expect(sample(route, .5).y).toBeCloseTo((fromY + targetY) / 2, 12);
      expect(sample(route, 0)).toEqual(route.from);
      expect(sample(route, 1)).toEqual(route.to);
    }
  });

  it('enters the cloud from either outer exploration boundary without snapping the launch pose', () => {
    for (const boundary of [-16.8, 16.8]) {
      const targetY = boundary < 0 ? -12 : 12, route = course({ ...initial, y: boundary }, targetY);
      expect(sample(route, 0).y).toBe(boundary);
      const first = sample(route, .001);
      expect(Math.abs(first.y - boundary)).toBeLessThan(.000001);
      expect(Math.abs(first.y)).toBeGreaterThan(12);
      expect(sample(route, 1).y).toBe(targetY);
      for (const key of stationaryFields) expect(first[key]).toBe(initial[key]);
    }
  });

  it('keeps an already selected layer still throughout the course', () => {
    const route = course(initial, initial.y);
    for (const progress of [0, .001, .1, .5, .9, .999, 1]) expect(sample(route, progress)).toEqual(initial);
    expect(route.duration).toBe(2);
  });

  it('bounds sample progress and ignores chart-only resume angles for layer travel', () => {
    const route = course(initial, -8), decorated = { ...route, orientation: { heading: 45, pitch: 1, progress: .2 } };
    for (const invalid of [undefined, null, NaN, Infinity, -Infinity, '0.5', false, true]) {
      expect(sample(decorated, invalid)).toEqual(route.from);
    }
    expect(sample(decorated, -1)).toEqual(route.from);
    expect(sample(decorated, 2)).toEqual(route.to);
    for (const progress of [.1, .2, .5, .9]) {
      expect(sample(decorated, progress)).toEqual(sample(route, progress));
      for (const key of stationaryFields) expect(sample(decorated, progress)[key]).toBe(initial[key]);
    }
  });

  it('returns independent courses and samples without modifying launch data or earlier results', () => {
    const first = course(initial, 6), second = course(initial, 6);
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first.from).not.toBe(second.from);
    expect(first.to).not.toBe(second.to);
    const frozen = Object.freeze({ ...first, from: Object.freeze(first.from), to: Object.freeze(first.to) });
    const before = JSON.stringify(frozen), middle = sample(frozen, .5), another = sample(frozen, .5);
    expect(middle).toEqual(another);
    expect(middle).not.toBe(another);
    middle.y = 999;
    middle.travel = 999;
    expect(sample(frozen, .5)).toEqual(another);
    expect(JSON.stringify(frozen)).toBe(before);
    second.to.y = -12;
    expect(frozen.to.y).toBe(6);
    expect(initial).toEqual({ x: -2.75, y: .5, z: 9.25, heading: 350, pitch: -.35, travel: 18.25 });
  });
});
