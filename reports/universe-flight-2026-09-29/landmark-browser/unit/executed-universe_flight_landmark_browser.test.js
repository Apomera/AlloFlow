import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync('stem_lab/stem_tool_universe.js', 'utf8');
const start = source.indexOf('  function universeFlightLandmarkMarkers(');
const end = source.indexOf('  function UniverseFlightLandmarkBrowser(', start);
if (start < 0 || end < start) throw new Error('Landmark browser marker placement unavailable');
const markers = vm.runInNewContext(source.slice(start, end) + '\nuniverseFlightLandmarkMarkers;', { Math, Number, Array });

const item = (id, x, y, width = 400, height = 300) => ({ id, screen: [x / width, y / height], inView: true });
const ids = result => result.map(entry => entry.id);

describe('Landmark browser marker placement', () => {
  it('keeps projected centers fixed, preserves references and admits only the first four clear candidates', () => {
    const candidates = [80, 180, 280, 380, 480].map((x, index) => item(String(index), x, 150, 600, 300));
    const result = markers(candidates, 600, 300, []);
    expect(ids(result)).toEqual(['0', '1', '2', '3']);
    result.forEach((entry, index) => expect(entry).toBe(candidates[index]));
    expect(candidates.map(entry => entry.screen)).toEqual([[80 / 600, .5], [.3, .5], [280 / 600, .5], [380 / 600, .5], [.8, .5]]);
  });

  it('reserves exactly 28 pixels at all stage edges and rejects centers just outside that margin', () => {
    const cases = [
      [28, 150, true], [372, 150, true], [200, 28, true], [200, 272, true],
      [27.999, 150, false], [372.001, 150, false], [200, 27.999, false], [200, 272.001, false],
    ];
    for (const [x, y, admitted] of cases) {
      const candidate = item('edge', x, y);
      expect(markers([candidate], 400, 300, []).length).toBe(admitted ? 1 : 0);
    }
    expect(markers([item('corner', 28, 28)], 400, 300, [])).toHaveLength(1);
    expect(markers([{ id: 'tiny', screen: [.5, .5], inView: true }], 55, 55, [])).toEqual([]);
    expect(markers([{ id: 'minimum', screen: [.5, .5], inView: true }], 56, 56, [])).toHaveLength(1);
  });

  it('rejects overlapping 52 pixel marker squares while allowing edge contact and later clear centers', () => {
    const candidates = [
      item('first', 100, 100),
      item('horizontal-overlap', 151.999, 100),
      item('diagonal-overlap', 151.999, 151.999),
      item('horizontal-contact', 152, 100),
      item('vertical-contact', 100, 152),
      item('clear-last', 250, 230),
    ];
    expect(ids(markers(candidates, 400, 300, []))).toEqual(['first', 'horizontal-contact', 'vertical-contact', 'clear-last']);
    expect(ids(markers(candidates.slice().reverse(), 400, 300, []))).toEqual(['clear-last', 'vertical-contact', 'horizontal-contact', 'first']);
  });

  it('uses projected centers rather than sorting by id or moving a crowded target to a spare position', () => {
    const candidates = [item('z-first', 100, 100), item('a-second', 110, 110), item('b-third', 250, 100)];
    expect(ids(markers(candidates, 400, 300, []))).toEqual(['z-first', 'b-third']);
    expect(ids(markers([candidates[1], candidates[0], candidates[2]], 400, 300, []))).toEqual(['a-second', 'b-third']);
  });

  it('avoids finite overlay rectangles using the entire marker square, including tiny intersections', () => {
    const candidate = item('target', 100, 100);
    expect(markers([candidate], 400, 300, [{ left: 125.999, top: 90, right: 180, bottom: 110 }])).toEqual([]);
    expect(markers([candidate], 400, 300, [{ left: 126, top: 90, right: 180, bottom: 110 }])).toEqual([candidate]);
    expect(markers([candidate], 400, 300, [{ left: 70, top: 125.999, right: 130, bottom: 160 }])).toEqual([]);
    expect(markers([candidate], 400, 300, [{ left: 70, top: 126, right: 130, bottom: 160 }])).toEqual([candidate]);
    expect(markers([candidate], 400, 300, [{ left: -100, top: -100, right: 80, bottom: 80 }])).toEqual([]);
    expect(markers([candidate], 400, 300, [{ left: -100, top: -100, right: -10, bottom: -10 }])).toEqual([candidate]);
  });

  it('does not let blocked candidates occupy slots or obstruct subsequent clear candidates', () => {
    const candidates = [item('blocked', 100, 100), item('near-blocked', 120, 120), item('clear', 250, 200)];
    const obstacles = [{ left: 74, top: 74, right: 80, bottom: 80 }];
    expect(ids(markers(candidates, 400, 300, obstacles))).toEqual(['near-blocked', 'clear']);
  });

  it('keeps every admitted marker inside its stage and clear of overlays across viewport sizes', () => {
    for (const [width, height] of [[56, 56], [320, 568], [568, 320], [940, 680], [2560, 1440]]) {
      const obstacle = { left: width * .42, top: height * .42, right: width * .58, bottom: height * .58 };
      const candidates = [];
      for (const x of [.05, .2, .35, .5, .65, .8, .95]) {
        for (const y of [.05, .2, .5, .8, .95]) candidates.push({ id: `${x}:${y}`, screen: [x, y], inView: true });
      }
      const result = markers(candidates, width, height, [obstacle]);
      expect(result.length).toBeLessThanOrEqual(4);
      const rectangles = result.map(entry => {
        const x = entry.screen[0] * width, y = entry.screen[1] * height;
        expect(x).toBeGreaterThanOrEqual(28);
        expect(x).toBeLessThanOrEqual(width - 28);
        expect(y).toBeGreaterThanOrEqual(28);
        expect(y).toBeLessThanOrEqual(height - 28);
        return { left: x - 26, top: y - 26, right: x + 26, bottom: y + 26 };
      });
      const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      rectangles.forEach((rect, index) => {
        expect(overlaps(rect, obstacle)).toBe(false);
        rectangles.slice(0, index).forEach(previous => expect(overlaps(rect, previous)).toBe(false));
      });
      const inputIndices = result.map(entry => candidates.indexOf(entry));
      expect(inputIndices).toEqual(inputIndices.slice().sort((a, b) => a - b));
    }
  });

  it('rejects invalid dimensions, projected coordinates and visibility values without mutating inputs', () => {
    const valid = item('valid', 100, 100);
    for (const value of [undefined, null, '', '400', NaN, Infinity, -Infinity, 0, -1]) {
      expect(markers([valid], value, 300, [])).toEqual([]);
      expect(markers([valid], 400, value, [])).toEqual([]);
    }
    for (const invalid of [undefined, null, {}, 'items']) expect(markers(invalid, 400, 300, [])).toEqual([]);
    const invalidCandidates = [null, {}, { screen: [.5, .5] }, { screen: [.5, .5], inView: false },
      ...[0, 1, 'true'].map(inView => ({ screen: [.5, .5], inView })),
      ...[null, {}, [], [.5], [NaN, .5], [.5, Infinity], ['.5', .5], [-.01, .5], [1.01, .5], [.5, -.01], [.5, 1.01]]
        .map(screen => ({ screen, inView: true }))];
    const frozenValid = Object.freeze({ ...valid, screen: Object.freeze(valid.screen.slice()) });
    const inputs = Object.freeze([...invalidCandidates, frozenValid]);
    const before = JSON.stringify(inputs);
    const result = markers(inputs, 400, 300, []);
    expect(result).toEqual([frozenValid]);
    expect(result[0]).toBe(frozenValid);
    expect(JSON.stringify(inputs)).toBe(before);
  });

  it('ignores malformed obstacle rectangles and accepts omitted obstacles without mutating valid ones', () => {
    const candidate = item('target', 100, 100);
    const malformed = [null, {}, { left: 75, top: 75, right: 125 },
      { left: 125, top: 75, right: 75, bottom: 125 },
      { left: 75, top: 125, right: 125, bottom: 75 },
      { left: 75, top: 75, right: 75, bottom: 125 },
      { left: 75, top: 75, right: 125, bottom: 75 },
      { left: '75', top: 75, right: 125, bottom: 125 },
      { left: 75, top: NaN, right: 125, bottom: 125 },
      { left: 75, top: 75, right: Infinity, bottom: 125 }];
    expect(markers([candidate], 400, 300, malformed)).toEqual([candidate]);
    for (const obstacles of [undefined, null, {}, 'obstacles']) expect(markers([candidate], 400, 300, obstacles)).toEqual([candidate]);
    const obstacle = Object.freeze({ left: 75, top: 75, right: 125, bottom: 125 });
    const obstacles = Object.freeze([obstacle]);
    expect(markers([candidate], 400, 300, obstacles)).toEqual([]);
    expect(obstacles[0]).toBe(obstacle);
    expect(obstacle).toEqual({ left: 75, top: 75, right: 125, bottom: 125 });
  });
});
