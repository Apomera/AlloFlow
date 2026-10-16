import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const api = {};
runInNewContext(readFileSync('dev-tools/skyschool-city-roads.js', 'utf8'), api);
const point = (x, z) => ({ x, z });
function ribbon(points, width = 10, options = {}) {
  return api.buildFlightCityRoadRibbon(points, width, { surface: () => 50, isDry: () => true, ...options });
}
function allVertices(result) { return result.triangles.flat(); }
function cross(a, b, c) { return (b[0] - a[0]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[0] - a[0]); }
function covers(result, x, z) {
  const p = [x, 0, z];
  return result.triangles.some(([a, b, c]) => {
    const values = [cross(a, b, p), cross(b, c, p), cross(c, a, p)];
    return values.every(value => value >= -1e-7) || values.every(value => value <= 1e-7);
  });
}

describe('SkySchool continuous mapped roads', () => {
  it('preserves road width, adds three feet and emits only upward finite faces', () => {
    const result = ribbon([point(0, 0), point(600, 0)], 13);
    expect(result.segments).toBe(5); expect(result.triangleCount).toBe(10); expect(result.omitted).toBe(0);
    for (const triangle of result.triangles) {
      expect(cross(...triangle)).toBeLessThan(0);
      for (const vertex of triangle) { expect(vertex.every(Number.isFinite)).toBe(true); expect(vertex[1]).toBe(53); expect(Math.abs(vertex[2])).toBe(13); }
    }
    for (let x = 1; x < 600; x += 17) expect(covers(result, x, 0)).toBe(true);
  });
  it.each([1, -1])('closes the outside of a normal bend using shared bounded miters (%s)', side => {
    const result = ribbon([point(0, 0), point(200, 0), point(200, 200 * side)]);
    expect(result.joins).toBe(0); expect(result.omitted).toBe(0);
    expect(covers(result, 205, -5 * side)).toBe(true);
    expect(covers(result, 195, 5 * side)).toBe(true);
    const corner = allVertices(result).filter(v => v[0] === 210 && v[2] === -10 * side);
    expect(corner.length).toBeGreaterThanOrEqual(2);
    expect(allVertices(result).every(v => v[0] >= -0.001 && v[0] <= 210.001)).toBe(true);
  });
  it('uses a bounded bevel for a sharp bend without a projecting miter spike', () => {
    const result = ribbon([point(0, 0), point(200, 0), point(200 - 200 * Math.cos(Math.PI / 6), 100)]);
    expect(result.joins).toBe(1); expect(result.omitted).toBe(0);
    expect(covers(result, 202, -0.5)).toBe(true);
    expect(Math.max(...allVertices(result).map(v => v[0]))).toBeLessThanOrEqual(205.000001);
    for (const triangle of result.triangles) expect(cross(...triangle)).toBeLessThan(0);
  });
  it('does not extend miters past short adjacent road segments', () => {
    const result = ribbon([point(0, 0), point(5, 0), point(5, 5)], 10);
    expect(result.joins).toBe(1);
    expect(allVertices(result).every(v => v[0] >= -5.00001 && v[0] <= 15.00001 && v[2] >= -10.00001 && v[2] <= 10.00001)).toBe(true);
  });
  it.each([0, 0.01])('handles an exact or near U-turn without a long wedge (%s)', offset => {
    const result = ribbon([point(0, 0), point(200, 0), point(0, offset)]);
    expect(result.joins).toBe(0); expect(result.triangleCount).toBeGreaterThan(0);
    expect(allVertices(result).every(v => v.every(Number.isFinite) && v[0] >= -0.01 && v[0] <= 200.01 && Math.abs(v[2]) <= 10.02)).toBe(true);
  });
  it('collapses repeated points and keeps separate roads across unsupported long gaps', () => {
    const result = ribbon([point(0, 0), point(0, 0), point(120, 0), point(20000, 0), point(20120, 0)]);
    expect(result.segments).toBe(2); expect(result.joins).toBe(0); expect(result.omitted).toBe(1);
    expect(covers(result, 10000, 0)).toBe(false);
  });
  it.each([0, 0.01])('closes the last-to-first corner of roundabout polylines (%s endpoint offset)', offset => {
    const result = ribbon([point(0, 0), point(200, 0), point(200, 200), point(0, 200), point(offset, 0)]);
    expect(result.omitted).toBe(0); expect(covers(result, -5, -5)).toBe(true);
    expect(allVertices(result).filter(v => v[0] === -10 && v[2] === -10).length).toBeGreaterThanOrEqual(2);
    for (const triangle of result.triangles) expect(cross(...triangle)).toBeLessThan(0);
  });
});

describe('SkySchool road terrain and water checks', () => {
  it('drapes each vertex on a supported linear terrain slope', () => {
    const result = ribbon([point(0, 0), point(600, 0)], 10, { surface: p => 50 + p.x * 0.05 + p.z * 0.02 });
    expect(result.segments).toBe(5);
    for (const [x, y, z] of allVertices(result)) expect(y).toBeCloseTo(53 + x * 0.05 + z * 0.02, 8);
  });
  it('samples the interior, both road edges and each endpoint at intervals below 120 feet', () => {
    const samples = [], result = ribbon([point(0, 0), point(600, 0)], 10, { surface: p => { samples.push({ ...p }); return 50; } });
    expect(result.samples).toBe(samples.length);
    for (const z of [-10, 0, 10]) {
      const xs = samples.filter(p => p.z === z).map(p => p.x).sort((a, b) => a - b);
      expect(xs[0]).toBe(0); expect(xs.at(-1)).toBe(600);
      for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeLessThanOrEqual(120);
    }
    expect(samples).toContainEqual(point(60, 0));
  });
  it.each([point(60, 0), point(60, 10)])('rejects a wet interior or edge midpoint even when all four corners are dry: %j', wet => {
    const result = ribbon([point(0, 0), point(120, 0)], 10, { isDry: p => Math.hypot(p.x - wet.x, p.z - wet.z) > 0.1 });
    expect(result.triangleCount).toBe(0); expect(result.omitted).toBe(1);
  });
  it.each([null, NaN, Infinity, undefined])('rejects unavailable interior surface heights: %s', invalid => {
    const result = ribbon([point(0, 0), point(120, 0)], 10, { surface: p => p.x === 60 && p.z === 0 ? invalid : 50 });
    expect(result.triangleCount).toBe(0);
  });
  it('leaves a clean break over a river while keeping safe pieces on either bank', () => {
    const result = ribbon([point(0, 0), point(480, 0)], 10, { isDry: p => p.x < 150 || p.x > 210 });
    expect(result.segments).toBe(3); expect(result.omitted).toBe(1);
    expect(covers(result, 60, 0)).toBe(true); expect(covers(result, 180, 0)).toBe(false); expect(covers(result, 300, 0)).toBe(true);
  });
  it.each([{ surface: p => p.x * 0.4 }, { surface: p => p.z * 0.3 }])('rejects excessive longitudinal grade or cross slope', options => {
    const result = ribbon([point(0, 0), point(240, 0)], 10, options);
    expect(result.triangleCount).toBe(0); expect(result.omitted).toBe(2);
  });
  it('does not draw a ramp across an abrupt cliff', () => {
    const result = ribbon([point(0, 0), point(360, 0)], 10, { surface: p => p.x < 180 ? 50 : 110 });
    expect(result.segments).toBe(2); expect(result.omitted).toBe(1); expect(covers(result, 180, 0)).toBe(false);
  });
  it.each([-5, 5])('rejects an interior hollow or ridge that cannot fit the rendered plane (%s feet)', deviation => {
    const result = ribbon([point(0, 0), point(120, 0)], 50, { surface: p => 50 + (p.x === 60 && p.z === 0 ? deviation : 0) });
    expect(result.triangleCount).toBe(0); expect(result.omitted).toBe(1);
  });
  it('checks an additional bevel face before filling a sharp outer corner', () => {
    const result = ribbon([point(0, 0), point(200, 0), point(200 - 200 * Math.cos(Math.PI / 6), 100)], 10, {
      isDry: p => Math.hypot(p.x - (200 + 5 / 3), p.z - (-10 + 10 * Math.cos(Math.PI / 6)) / 3) > 0.01,
    });
    expect(result.segments).toBeGreaterThan(0); expect(result.joins).toBe(0); expect(result.omitted).toBe(1);
  });
});

describe('SkySchool road geometry budgets', () => {
  it('appends into the existing mesh without retaining a duplicate triangle array', () => {
    const appendTriangle = vi.fn(), result = ribbon([point(0, 0), point(240, 0)], 10, { appendTriangle });
    expect(result.triangleCount).toBe(4); expect(appendTriangle).toHaveBeenCalledTimes(4); expect(result.triangles).toHaveLength(0);
    for (const triangle of appendTriangle.mock.calls) expect(cross(...triangle)).toBeLessThan(0);
  });
  it.each([0, 1, 2, 3, 4])('respects a caller-supplied remaining triangle budget of %s', maxTriangles => {
    const result = ribbon([point(0, 0), point(600, 0)], 10, { maxTriangles });
    expect(result.triangleCount).toBeLessThanOrEqual(maxTriangles); expect(result.triangleCount % 2).toBe(0); expect(result.truncated).toBe(true);
  });
  it('counts and bounds terrain queries even when no triangles can be accepted', () => {
    const surface = vi.fn(() => 50), isDry = vi.fn(() => true), result = ribbon([point(0, 0), point(600, 0)], 10, { surface, isDry, maxSamples: 10 });
    expect(result.samples).toBe(10); expect(surface).toHaveBeenCalledTimes(10); expect(isDry).toHaveBeenCalledTimes(10); expect(result.truncated).toBe(true);
    expect(result.triangleCount).toBe(2);
  });
  it('never queries more than the hard sample cap and never exceeds the hard triangle cap', () => {
    const points = Array.from({ length: 256 }, (_, i) => point(i % 2 ? 14900 : 0, i * 100));
    const result = ribbon(points, 10, { maxSamples: 100000000, maxTriangles: 100000000 });
    expect(result.samples).toBeLessThanOrEqual(24000); expect(result.triangleCount).toBeLessThanOrEqual(8192); expect(result.truncated).toBe(true);
  });
  it('truncates excessive input coordinates without touching the caller array', () => {
    const points = Array.from({ length: 300 }, (_, i) => point(i * 10, 0));
    const result = ribbon(points); expect(result.truncated).toBe(true); expect(points).toHaveLength(300);
    expect(Math.max(...allVertices(result).map(v => v[0]))).toBeLessThanOrEqual(2550);
  });
  it.each([NaN, 0, -1, 51])('rejects invalid road widths without terrain work: %s', width => {
    const surface = vi.fn(), result = ribbon([point(0, 0), point(120, 0)], width, { surface });
    expect(result.triangleCount).toBe(0); expect(surface).not.toHaveBeenCalled();
  });
  it('rejects nonfinite coordinates without bridging across them', () => {
    const result = ribbon([point(0, 0), point(NaN, 0), point(240, 0)]);
    expect(result.triangleCount).toBe(0); expect(result.samples).toBe(0);
  });
});
