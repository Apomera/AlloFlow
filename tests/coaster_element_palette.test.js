import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const source = readFileSync('stem_lab/stem_tool_coasterlab.js', 'utf8');
const block = source.slice(source.indexOf('/* @clab-elements-start'), source.indexOf('/* @clab-elements-end */'));
const { buildElementPoints, elementNodeCapacity } = new Function(block + '; return { buildElementPoints, elementNodeCapacity };')();
describe('Coaster illustrated piece capacity', () => {
  it.each(['hill', 'drop', 'turn-left', 'turn-right', 'loop'])('uses actual generated node counts and permits the exact limit for %s', kind => {
    const points = buildElementPoints(kind, { x: 0, y: 8, z: 0, bank: 0 }, { x: 40, y: 8, z: 0, bank: 0 });
    expect(elementNodeCapacity(kind, 80 - points.length)).toEqual({ added: points.length, remaining: points.length, fits: true });
    expect(elementNodeCapacity(kind, 81 - points.length)).toEqual({ added: points.length, remaining: points.length - 1, fits: false });
  });
  it('keeps smaller pieces available when a loop no longer fits', () => {
    expect(elementNodeCapacity('hill', 76)).toEqual({ added: 3, remaining: 4, fits: true });
    expect(elementNodeCapacity('drop', 76)).toEqual({ added: 4, remaining: 4, fits: true });
    expect(elementNodeCapacity('loop', 76)).toEqual({ added: 10, remaining: 4, fits: false });
  });
  it.each([80, 81, -1, NaN, Infinity, 2.5])('does not offer a piece for unavailable or invalid capacity %j', count => {
    expect(elementNodeCapacity('hill', count)).toMatchObject({ remaining: 0, fits: false });
  });
  it('does not offer unknown element kinds', () => {
    expect(elementNodeCapacity('unknown', 20)).toEqual({ added: 0, remaining: 60, fits: false });
  });
});
