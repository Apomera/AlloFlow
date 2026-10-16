import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const api = {};
runInNewContext(readFileSync('dev-tools/skyschool-city-coverage.js', 'utf8'), api);
const create = api.createFlightCityCoverage;
const add = api.addFlightCityCoverage;
const overlaps = api.flightCityCoverageOverlaps;

describe('rendered city coverage', () => {
  it('preserves unmapped gaps, including gaps inside the same coarse cell', () => {
    const coverage = create();
    expect(overlaps(coverage, -1000, -1000, 1000, 1000)).toBe(false);
    add(coverage, 10, 10, 50, 50);
    add(coverage, 400, 400, 450, 450);
    expect(overlaps(coverage, 20, 20, 30, 30)).toBe(true);
    expect(overlaps(coverage, 200, 200, 250, 250)).toBe(false);
    expect(overlaps(coverage, 600, 600, 700, 700)).toBe(false);
  });

  it('detects footprint edges crossing a building even when its center is outside', () => {
    const coverage = create();
    add(coverage, 0, 0, 100, 100);
    expect(overlaps(coverage, 99, 25, 201, 75)).toBe(true);
    expect(overlaps(coverage, 100, 25, 200, 75)).toBe(true);
    expect(overlaps(coverage, 101, 25, 201, 75)).toBe(false);
  });

  it('only replaces a rendered road corridor when no buildings were emitted', () => {
    const coverage = create();
    for (let x = -600; x < 600; x += 120) add(coverage, x, -12, x + 120, 12);
    expect(overlaps(coverage, -50, -50, 50, 50)).toBe(true);
    expect(overlaps(coverage, -50, 40, 50, 140)).toBe(false);
    expect(overlaps(coverage, -50, -140, 50, -40)).toBe(false);
  });

  it('crosses zero and negative cell boundaries without losing intersections', () => {
    const coverage = create();
    add(coverage, -520, -520, -500, -500);
    add(coverage, -5, -5, 5, 5);
    expect(overlaps(coverage, -515, -515, -510, -510)).toBe(true);
    expect(overlaps(coverage, -500, -500, -490, -490)).toBe(true);
    expect(overlaps(coverage, -1, -1, 1, 1)).toBe(true);
    expect(overlaps(coverage, -499, -499, -490, -490)).toBe(false);
    expect(overlaps(coverage, -400, -400, -300, -300)).toBe(false);
  });

  it('uses the same local geometry independently of longitude wrapping or world origin', () => {
    const coverage = create();
    add(coverage, -200, -100, -120, -20);
    for (const origin of [{ x: 0, z: 0 }, { x: 1000000, z: -700000 }, { x: -1000000, z: 700000 }]) {
      const world = { x: origin.x - 180, z: origin.z - 60 };
      const x = world.x - origin.x, z = world.z - origin.z;
      expect(overlaps(coverage, x - 15, z - 15, x + 15, z + 15)).toBe(true);
    }
  });

  it('rejects invalid bounds without changing valid coverage', () => {
    const coverage = create();
    add(coverage, 0, 0, 10, 10);
    for (const bounds of [[NaN,0,1,1], [0,0,Infinity,1], [0,-Infinity,1,1],
      [2,0,1,1], [0,2,1,1], [0,0,10000001,1], [0,0,'5',1]]) {
      expect(add(coverage, ...bounds)).toBe(false);
      expect(overlaps(coverage, ...bounds)).toBe(false);
    }
    expect(coverage.rectangles).toHaveLength(1);
    expect(coverage.truncated).toBe(false);
    expect(overlaps(coverage, 1, 1, 2, 2)).toBe(true);
    expect(overlaps(null, 0, 0, 1, 1)).toBe(false);
    expect(add({}, 0, 0, 1, 1)).toBe(false);
  });

  it('handles an enormous accepted rectangle without allocating its millions of cells', () => {
    const coverage = create();
    expect(add(coverage, -9000000, -9000000, 9000000, 9000000)).toBe(true);
    expect(coverage.cellCount).toBe(0);
    expect(coverage.references).toBe(0);
    expect(coverage.large).toHaveLength(1);
    expect(overlaps(coverage, 8000000, 8000000, 8000001, 8000001)).toBe(true);
    expect(overlaps(coverage, 9000001, 9000001, 9000002, 9000002)).toBe(false);
  });

  it('bounds broad empty queries and still finds small shapes far from the origin', () => {
    const coverage = create();
    add(coverage, 8000000, 8000000, 8000010, 8000010);
    expect(overlaps(coverage, -9000000, -9000000, 9000000, 9000000)).toBe(true);
    expect(overlaps(coverage, -9000000, -9000000, 7000000, 7000000)).toBe(false);
  });

  it('caps individual shapes and preserves accepted coverage at the limit', () => {
    const coverage = create();
    for (let i = 0; i < 32768; i++) expect(add(coverage, 10, 10, 20, 20)).toBe(true);
    expect(add(coverage, 100, 100, 200, 200)).toBe(false);
    expect(coverage.rectangles).toHaveLength(32768);
    expect(coverage.references).toBe(32768);
    expect(coverage.truncated).toBe(true);
    expect(overlaps(coverage, 12, 12, 15, 15)).toBe(true);
    expect(overlaps(coverage, 120, 120, 150, 150)).toBe(false);
  });

  it('caps references atomically without partially registering a rejected footprint', () => {
    const coverage = create();
    for (let i = 0; i < 2048; i++) expect(add(coverage, 0, 0, 4095, 4095)).toBe(true);
    expect(coverage.references).toBe(131072);
    expect(add(coverage, 5000, 5000, 5010, 5010)).toBe(false);
    expect(coverage.rectangles).toHaveLength(2048);
    expect(coverage.cellCount).toBe(64);
    expect(coverage.truncated).toBe(true);
    expect(overlaps(coverage, 5001, 5001, 5009, 5009)).toBe(false);
  });

  it('caps cell and oversized-shape budgets without changing earlier matches', () => {
    const coverage = create();
    for (let i = 0; i < 8192; i++) add(coverage, i * 512, 0, i * 512 + 1, 1);
    expect(coverage.cellCount).toBe(8192);
    expect(add(coverage, 9000000, 0, 9000001, 1)).toBe(false);
    expect(coverage.rectangles).toHaveLength(8192);
    expect(overlaps(coverage, 0, 0, 1, 1)).toBe(true);
    expect(overlaps(coverage, 9000000, 0, 9000001, 1)).toBe(false);

    const large = create();
    for (let i = 0; i < 128; i++) add(large, 0, 0, 10000, 10000);
    expect(add(large, 20000, 20000, 30000, 30000)).toBe(false);
    expect(large.large).toHaveLength(128);
    expect(large.rectangles).toHaveLength(128);
    expect(large.truncated).toBe(true);
    expect(overlaps(large, 22000, 22000, 23000, 23000)).toBe(false);
  });

  it('starts a terrain revision with empty coverage, so omitted geometry does not persist', () => {
    let coverage = create();
    add(coverage, -50, -50, 50, 50);
    expect(overlaps(coverage, -10, -10, 10, 10)).toBe(true);
    coverage = create();
    expect(overlaps(coverage, -10, -10, 10, 10)).toBe(false);
    expect(coverage.rectangles).toHaveLength(0);
    expect(coverage.references).toBe(0);
  });
});
