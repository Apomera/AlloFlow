import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');
const match = source.match(/^([ \t]*)function prioritizeDissectionCalloutColumn\(/m);
if (!match) throw Error('Missing production priority helper');
const start = match.index + match[1].length, ending = '\n' + match[1] + '}';
const end = source.indexOf(ending, start);
const prioritize = new Function('return (' + source.slice(start, end + ending.length) + ');')();
const clampMatch = source.match(/^([ \t]*)function clampDissectionCalloutCard\(/m);
const clampStart = clampMatch.index + clampMatch[1].length, clampEnding = '\n' + clampMatch[1] + '}';
const clamp = new Function('return (' + source.slice(clampStart, source.indexOf(clampEnding, clampStart) + clampEnding.length) + ');')();
const make = (id, extra = {}) => ({ id, index: Number(id), height: 30, preferredY: Number(id) * 40, showCallout: true, ...extra });

describe('crowded dissection callout columns', () => {
  it('keeps every card and its original order when the available column fits', () => {
    const items = [make('1'), make('2', { selected: true }), make('3')];
    const before = structuredClone(items);
    expect(prioritize(items, 90)).toEqual(items);
    expect(items).toEqual(before);
  });
  it('retains the selected name and nearby context before distant passive cards', () => {
    const items = [make('0'), make('1'), make('2', { selected: true, height: 60 }), make('3'), make('4')];
    const kept = prioritize(items, 90);
    expect(kept.map(item => item.id)).toEqual(['1', '2']);
    expect(items.filter(item => !item.showCallout).map(item => item.id)).toEqual(['0', '3', '4']);
    expect(kept.reduce((sum, item) => sum + item.height, 0)).toBeLessThanOrEqual(90);
    // Clearing passive card space must not remove, move or resize its anatomy.
    expect(items.map(item => [item.id, item.preferredY, item.height])).toEqual([
      ['0', 0, 30], ['1', 40, 30], ['2', 80, 60], ['3', 120, 30], ['4', 160, 30],
    ]);
  });
  it('retains hover and guided instructions before related or passive cards', () => {
    const items = [make('0', { related: true }), make('1', { hovered: true }), make('2', { guidedCallout: true }), make('3')];
    expect(prioritize(items, 60).map(item => item.id)).toEqual(['1', '2']);
  });
  it('keeps the selected name when the column can fit only one active card', () => {
    const items = [make('0', { guidedCallout: true }), make('1', { selected: true }), make('2', { hovered: true })];
    expect(prioritize(items, 30).map(item => item.id)).toEqual(['1']);
    expect(items).toHaveLength(3);
  });
  it('never discards the selected name even when its own card exceeds capacity', () => {
    const items = [make('0'), make('1', { selected: true, height: 60 })];
    expect(prioritize(items, 10).map(item => item.id)).toEqual(['1']);
  });
  it('does not revive hidden cards or alter items for invalid capacity', () => {
    const items = [make('0', { showCallout: false }), make('1')], before = structuredClone(items);
    expect(prioritize(items, 30).map(item => item.id)).toEqual(['1']);
    for (const capacity of [-1, NaN, Infinity]) expect(prioritize(items, capacity)).toBe(items);
    expect(items).toEqual(before);
  });
  it.each([[-100, -100], [1000, -100], [-100, 1000], [1000, 1000]])('keeps the full active card inside the field for an out-of-bounds layout at%s,%s', (x, y) => {
    const item = { x, y, width: 120, height: 90, selected: true };
    expect(clamp(item, 16, 82, 484, 586)).toBe(true);
    expect(item.x).toBeGreaterThanOrEqual(16); expect(item.y).toBeGreaterThanOrEqual(82);
    expect(item.x + item.width).toBeLessThanOrEqual(484); expect(item.y + item.height).toBeLessThanOrEqual(586);
    expect(item.width).toBe(120); expect(item.height).toBe(90);
  });
  it('recovers an active card that exceeds the HUD-reserved column without shrinking it', () => {
    const item = { x: 30, y: 590, width: 150, height: 120, selected: true };
    expect(prioritize([item], 60)).toEqual([item]);
    expect(clamp(item, 16, 82, 484, 586)).toBe(true);
    expect(item).toEqual({ x: 30, y: 466, width: 150, height: 120, selected: true });
  });
});
