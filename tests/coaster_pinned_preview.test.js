import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const source = readFileSync('stem_lab/stem_tool_coasterlab.js', 'utf8');
const block = source.slice(source.indexOf('/* @clab-elements-start'), source.indexOf('/* @clab-elements-end */'));
const current = new Function(block + '; return elementPreviewIsCurrent;')();
const points = [{ x: 0, y: 8, z: 0, bank: 0 }, { x: 40, y: 8, z: 0, bank: 0 }];
const pending = { kind: 'hill', node: 0, signature: JSON.stringify(points) };
describe('Pinned coaster preview validity', () => {
  it('accepts an unchanged selected segment', () => { expect(current(pending, 0, points, false)).toBe(true); });
  it('rejects geometry changes even if the selected node and node count remain the same', () => {
    const changed = structuredClone(points); changed[1].y += 1;
    expect(current(pending, 0, changed, false)).toBe(false);
  });
  it.each([-1, 1, 2, NaN])('rejects a different or invalid selected node %j', index => {
    expect(current(pending, index, points, false)).toBe(false);
  });
  it('rejects a running ride or absent preview', () => {
    expect(current(pending, 0, points, true)).toBe(false);
    expect(current(null, 0, points, false)).toBe(false);
  });
  it('rejects removed points, missing points, and unknown pieces', () => {
    expect(current(pending, 0, points.slice(0, 1), false)).toBe(false);
    expect(current(pending, 0, null, false)).toBe(false);
    expect(current({ ...pending, kind: 'unknown' }, 0, points, false)).toBe(false);
  });
  it('rechecks the node budget before insertion', () => {
    const full = Array.from({ length: 80 }, () => ({ ...points[0] }));
    expect(current({ ...pending, signature: JSON.stringify(full) }, 0, full, false)).toBe(false);
  });
});
