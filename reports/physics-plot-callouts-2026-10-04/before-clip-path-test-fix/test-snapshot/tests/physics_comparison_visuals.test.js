import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

let P;
beforeAll(() => {
  new Function(readFileSync('stem_lab/stem_tool_physics.js', 'utf8'))();
  P = window.StemLab._physics;
  window.StemLab._registry.physics.render({
    React: { createElement: (type, props, ...children) => ({ type, props, children }) },
    icons: {}, toolData: { physics: {} }, setToolData() {}, gradeLevel: '5th Grade',
    t: (_key, fallback) => fallback, props: {}, toolSnapshots: [],
  });
});
const pair = () => ({ parameters: { angle: 35, velocity: 25, gravity: 9.8, mass: 2, launchHeight: 10 },
  vacuum: { range: 70, maxH: 20, time: 3 }, drag: { range: 60, maxH: 18, time: 2.9 } });

describe('measured comparison scales and changes', () => {
  it('shows a reduction against the captured no-drag baseline', () => {
    const m = P.compareMeasurements(100, 75);
    expect(m).toEqual({ vacuum: 100, drag: 75, delta: -25, percent: -25, scaleMax: 100, vacuumWidth: 100, dragWidth: 75 });
    expect(Object.isFrozen(m)).toBe(true);
  });
  it('shows increases without assuming every drag measurement decreases', () => {
    expect(P.compareMeasurements(4, 5)).toEqual({ vacuum: 4, drag: 5, delta: 1, percent: 25, scaleMax: 5, vacuumWidth: 80, dragWidth: 100 });
  });
  it('preserves equality and small measured changes without rounding the evidence', () => {
    expect(P.compareMeasurements(10, 10)).toMatchObject({ delta: 0, percent: 0, vacuumWidth: 100, dragWidth: 100 });
    const m = P.compareMeasurements(1, .999999);
    expect(m.delta).toBeCloseTo(-.000001, 14);
    expect(m.percent).toBeCloseTo(-.0001, 12);
    expect(m.dragWidth).toBeCloseTo(99.9999, 10);
  });
  it('keeps zero bars at zero and omits an undefined percentage', () => {
    expect(P.compareMeasurements(0, 0)).toEqual({ vacuum: 0, drag: 0, delta: 0, percent: null, scaleMax: 0, vacuumWidth: 0, dragWidth: 0 });
    expect(P.compareMeasurements(0, 2)).toMatchObject({ delta: 2, percent: null, vacuumWidth: 0, dragWidth: 100 });
  });
  it('keeps restored extreme values finite and scales bars without overflowing', () => {
    expect(P.compareMeasurements(1e308, 5e307)).toMatchObject({ delta: -5e307, percent: -50, vacuumWidth: 100, dragWidth: 50 });
    const increased = P.compareMeasurements(Number.MIN_VALUE, 1e308);
    expect(increased.percent).toBeNull();
    expect(increased.dragWidth).toBe(100);
    expect(Number.isFinite(increased.vacuumWidth)).toBe(true);
  });
  it.each([-1, NaN, Infinity, -Infinity, null, undefined, '10', {}])('rejects an invalid measurement %s', value => {
    expect(P.compareMeasurements(value, 10)).toBeNull();
    expect(P.compareMeasurements(10, value)).toBeNull();
  });
});

describe('comparison sample provenance', () => {
  it('preserves optional run IDs and numerical model metadata through serialization', () => {
    const input = pair();
    input.vacuum = { ...input.vacuum, run: 21, modelVersion: 'projectile-v3' };
    input.drag = { ...input.drag, run: 22, modelVersion: 'projectile-v3' };
    expect(P.normalizeState({ modelComparison: JSON.parse(JSON.stringify(input)), angle: 80, launchHeight: 0 }).modelComparison).toEqual(input);
  });
  it('keeps legacy summary values without inventing sample IDs or model provenance', () => {
    const input = pair();
    expect(P.normalizeState({ modelComparison: input }).modelComparison).toEqual(input);
    expect(P.normalizeState({ modelComparison: input }).modelComparison.vacuum).not.toHaveProperty('run');
    expect(P.normalizeState({ modelComparison: input }).modelComparison.drag).not.toHaveProperty('modelVersion');
  });
  it.each([-1, 0, 1.5, '21', Number.MAX_SAFE_INTEGER])('drops an invalid sample reference %s while keeping the summary', run => {
    const input = pair(); input.vacuum.run = run; input.vacuum.modelVersion = {};
    expect(P.normalizeState({ modelComparison: input }).modelComparison.vacuum).toEqual({ range: 70, maxH: 20, time: 3 });
  });
});
