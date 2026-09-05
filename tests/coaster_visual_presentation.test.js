import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const source = readFileSync('stem_lab/stem_tool_coasterlab.js', 'utf8');
const block = source.slice(source.indexOf('function buildRidgeData('), source.indexOf('/* @clab-ridge-end */'));
const buildRidgeData = new Function(block + '; return buildRidgeData;')();
describe('Coaster panoramic terrain geometry', () => {
  it.each([0, 1, 2])('closes layer %i with finite, valid triangles beyond the editable area', layer => {
    const radius = 460 + layer * 150;
    const height = 88 + layer * 24;
    const data = buildRidgeData(radius, height, layer * 1.7);
    expect(data.positions).toHaveLength(97 * 9);
    expect(data.indices).toHaveLength(96 * 12);
    expect(data.positions.slice(0, 9)).toEqual(data.positions.slice(-9));
    expect(data.positions.every(Number.isFinite)).toBe(true);
    for(let i = 0; i < data.positions.length; i += 3){
      const [x, y, z] = data.positions.slice(i, i + 3);
      expect(Math.hypot(x, z)).toBeGreaterThan(Math.hypot(260, 260));
      expect(y).toBeGreaterThanOrEqual(-3);
      expect(y).toBeLessThanOrEqual(height + 1e-6);
    }
    for(const index of data.indices){
      expect(Number.isInteger(index)).toBe(true);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(data.positions.length / 3);
    }
    for(let i = 0; i < data.indices.length; i += 3){
      const points = data.indices.slice(i, i + 3).map(index => data.positions.slice(index * 3, index * 3 + 3));
      const u = points[1].map((v, j) => v - points[0][j]), v = points[2].map((n, j) => n - points[0][j]);
      expect(Math.hypot(u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0])).toBeGreaterThan(0);
    }
    expect(buildRidgeData(radius, height, layer * 1.7)).toEqual(data);
  });
  it('ships the same visual implementation in the desktop build', () => {
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_coasterlab.js', 'utf8')).toBe(source);
  });
});
