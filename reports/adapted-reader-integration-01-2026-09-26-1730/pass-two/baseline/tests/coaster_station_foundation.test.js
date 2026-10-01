import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const source = readFileSync('stem_lab/stem_tool_coasterlab.js', 'utf8');
const block = source.slice(source.indexOf('/* @clab-station-foundation-start */'), source.indexOf('/* @clab-station-foundation-end */'));
const dimensions = new Function(block + '; return stationFoundationDimensions;')();
describe('Station foundation placement', () => {
  it.each([1, 2, 8, 30, 44])('connects the platform at world height %j to the pad', worldY => {
    const frame = dimensions(worldY);
    expect(worldY + frame.padY - 0.12).toBeCloseTo(0);
    expect(worldY + frame.columnY - frame.height / 2).toBeCloseTo(0.24);
    expect(worldY + frame.columnY + frame.height / 2).toBeCloseTo(worldY - 0.55);
  });
  it.each([NaN, Infinity, null, 0, 0.55, 0.8])('omits an invalid or unnecessary foundation at %j', worldY => { expect(dimensions(worldY)).toBeNull(); });
});
