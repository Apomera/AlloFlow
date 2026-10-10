import {describe, it, expect} from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(process.env.SCALE_COMPARISON_CONTEXT_SOURCE || 'stem_lab/stem_tool_scaleexplorer.js', 'utf8');
const marker = "  window.StemLab.registerTool('scaleExplorer', {";
const sandbox = {window: {StemLab: {registerTool() {}}}, console: {log() {}}};
if (!source.includes(marker)) throw new Error('Scale Explorer registration marker was not found');
vm.runInNewContext(source.replace(marker, '  window.comparisonContextChecks={references:largerReferences,choices:comparisonReferenceChoices,layout:comparisonBadgeLayout,pair:compareMeasurements,items:ITEMS};\n' + marker), sandbox);
const api = sandbox.window.comparisonContextChecks;
const ids = items => Array.from(items, item => item.id);
const view = {width: 900, height: 700, top: 132, bottom: 64};
const box = {width: 148, height: 40};

function expectValidBadge(result, anchor, viewport = view, label = box, occupied = []) {
  expect(result).not.toBeNull();
  for (const key of ['x', 'y', 'width', 'height', 'anchorX', 'anchorY', 'lineX', 'lineY']) {
    expect(Number.isFinite(result[key]), key).toBe(true);
  }
  expect(result.width).toBe(label.width);
  expect(result.height).toBe(label.height);
  expect(result.x).toBeGreaterThanOrEqual(12);
  expect(result.x + result.width).toBeLessThanOrEqual(viewport.width - 12);
  expect(result.y).toBeGreaterThanOrEqual(viewport.top ?? 132);
  expect(result.y + result.height).toBeLessThanOrEqual(viewport.height - (viewport.bottom ?? 64));
  expect(result.anchorX).toBe(anchor.x);
  expect(result.anchorY).toBe(anchor.y);
  const nearestX = Math.max(result.x, Math.min(anchor.x, result.x + result.width));
  const nearestY = Math.max(result.y, Math.min(anchor.y, result.y + result.height));
  expect(result.lineX).toBeCloseTo(nearestX, 8);
  expect(result.lineY).toBeCloseTo(nearestY, 8);
  expect(Math.hypot(nearestX - anchor.x, nearestY - anchor.y)).toBeGreaterThanOrEqual(8);
  for (const other of occupied) {
    const separated = result.x + result.width + 8 <= other.x ||
      other.x + other.width + 8 <= result.x ||
      result.y + result.height + 8 <= other.y ||
      other.y + other.height + 8 <= result.y;
    expect(separated, 'badge must leave eight pixels around occupied rectangles').toBe(true);
  }
}

describe('Scale Explorer comparison references', () => {
  it('sorts only valid, strictly larger objects and excludes wavelengths and distance measurements', () => {
    const current = {id: 'current', size: 2};
    const catalog = [
      {id: 'zebra', size: 4}, {id: 'alpha', size: 4}, {id: 'nearest', size: 3},
      {id: 'current', size: 100}, {id: 'equal', size: 2}, {id: 'smaller', size: 1},
      {id: 'light', size: 10}, {id: 'xray', size: 11}, {id: 'gamma', size: 12},
      {id: 'distance', dim: 'distance', size: 20},
      {id: 'zero', size: 0}, {id: 'negative', size: -3}, {id: 'infinite', size: Infinity},
      {id: 'nan', size: NaN}, {id: 'numeric-string', size: '30'}, {id: 'missing'}, null
    ];
    const before = catalog.slice();
    const result = api.references(current, catalog);
    expect(ids(result)).toEqual(['nearest', 'alpha', 'zebra']);
    expect(result).not.toBe(catalog);
    expect(catalog).toEqual(before);
  });

  it('deduplicates reference IDs and leaves the input catalog and objects unchanged', () => {
    const catalog = [{id: 'b', size: 4}, {id: 'a', size: 3}, {id: 'a', size: 3}];
    const before = JSON.stringify(catalog);
    expect(ids(api.references({id: 'small', size: 1}, catalog))).toEqual(['a', 'b']);
    expect(JSON.stringify(catalog)).toBe(before);
  });

  it('uses personalized height when choosing larger references', () => {
    const items = api.items.map(item => ({...item}));
    const person = items.find(item => item.id === 'human');
    person.size = 2.2;
    const before = JSON.stringify(items);
    const candidates = api.references(person, items);
    expect(candidates[0].id).toBe('elephant');
    expect(candidates.every(item => item.size > 2.2 && item.id !== 'human')).toBe(true);
    const pair = api.pair(person, candidates[0]);
    expect(pair.ratio).toBeCloseTo(3.2 / 2.2, 12);
    expect(JSON.stringify(items)).toBe(before);
  });

  it('returns an empty fresh list when no larger reference exists or input is invalid', () => {
    for (const value of [null, undefined, {id: 'bad', size: 0}, {id: 'bad', size: NaN}, {id: 'bad', size: Infinity}, {id: 'bad', size: '1'}]) {
      expect(ids(api.references(value, [{id: 'large', size: 8}]))).toEqual([]);
    }
    const largest = api.items.find(item => item.id === 'universe');
    expect(ids(api.references(largest, api.items))).toEqual([]);
    expect(ids(api.references({id: 'small', size: 1}, null))).toEqual([]);
  });

  it('keeps a manually selected distance reference in sorted choices without duplicating it', () => {
    const small = {id: 'small', size: 1};
    const big = {id: 'selected-distance', dim: 'distance', size: 5};
    const items = [small, {id: 'closer', size: 3}, {id: 'further', size: 8}, {id: 'other-distance', dim: 'distance', size: 4}];
    const pair = api.pair(small, big);
    const before = JSON.stringify({pair, items});
    expect(ids(api.choices(pair, items))).toEqual(['closer', 'selected-distance', 'further']);
    expect(ids(api.choices(pair, [...items, big, big]))).toEqual(['closer', 'selected-distance', 'further']);
    expect(JSON.stringify({pair, items})).toBe(before);
  });

  it('excludes equal-sized and current objects from the reference choices', () => {
    const small = {id: 'small', size: 2};
    const equal = {id: 'equal', size: 2};
    const items = [small, equal, {id: 'large', size: 3}];
    expect(ids(api.choices(api.pair(small, equal), items))).toEqual(['large']);
    expect(ids(api.choices(api.pair(small, small), items))).toEqual(['large']);
    expect(ids(api.choices(null, items))).toEqual([]);
    expect(ids(api.choices({}, items))).toEqual([]);
  });
});

describe('Scale Explorer comparison measurement badges', () => {
  it('places horizontal measurement labels above or below the anchor with a boundary leader', () => {
    const anchor = {x: 450, y: 350, axis: 'x'};
    const badge = api.layout(anchor, box, view, []);
    expectValidBadge(badge, anchor);
    expect(badge.y >= anchor.y + 8 || badge.y + badge.height <= anchor.y - 8).toBe(true);
  });

  it('places vertical measurement labels beside the anchor with a boundary leader', () => {
    const anchor = {x: 450, y: 350, axis: 'y'};
    const badge = api.layout(anchor, box, view, []);
    expectValidBadge(badge, anchor);
    expect(badge.x >= anchor.x + 8 || badge.x + badge.width <= anchor.x - 8).toBe(true);
  });

  it('keeps edge labels within the viewport and reserved control space', () => {
    const anchors = [
      {x: 12, y: 300, axis: 'x'}, {x: 888, y: 300, axis: 'x'},
      {x: 450, y: 132, axis: 'y'}, {x: 450, y: 636, axis: 'y'}
    ];
    for (const anchor of anchors) expectValidBadge(api.layout(anchor, box, view, []), anchor);
    const customView = {width: 360, height: 740, top: 100, bottom: 90};
    const anchor = {x: 180, y: 360, axis: 'x'};
    expectValidBadge(api.layout(anchor, box, customView, []), anchor, customView);
  });

  it('uses default top and bottom reserves and never mutates layout inputs', () => {
    const viewport = {width: 600, height: 700};
    const anchor = {x: 300, y: 300, axis: 'x'};
    const occupied = [{x: 12, y: 132, width: 40, height: 40}];
    const before = JSON.stringify({anchor, box, viewport, occupied});
    expectValidBadge(api.layout(anchor, box, viewport, occupied), anchor, viewport, box, occupied);
    expect(JSON.stringify({anchor, box, viewport, occupied})).toBe(before);
  });

  it('moves a label when its first location is occupied and keeps an eight-pixel gap', () => {
    const anchor = {x: 450, y: 350, axis: 'x'};
    const first = api.layout(anchor, box, view, []);
    const occupied = [{x: first.x, y: first.y, width: first.width, height: first.height}];
    expectValidBadge(api.layout(anchor, box, view, occupied), anchor, view, box, occupied);
  });

  it('moves a phone label outside the foreground model when nearby placements are blocked', () => {
    const viewport = {width: 332, height: 530, top: 132, bottom: 64};
    const label = {width: 136, height: 58};
    const anchor = {x: 286, y: 325, axis: 'y'};
    const foreground = [{x: 150, y: 280, width: 50, height: 100}];
    const result = api.layout(anchor, label, viewport, foreground);
    expectValidBadge(result, anchor, viewport, label, foreground);
    expect(result.y).toBeGreaterThanOrEqual(388);
  });

  it('returns null when all available space is occupied or too cramped', () => {
    const anchor = {x: 450, y: 350, axis: 'x'};
    expect(api.layout(anchor, box, view, [{x: 0, y: 0, width: 900, height: 700}])).toBeNull();
    expect(api.layout({x: 60, y: 150, axis: 'x'}, box, {width: 120, height: 240}, [])).toBeNull();
    expect(api.layout(anchor, {width: 1000, height: 50}, view, [])).toBeNull();
  });

  it('rejects invalid geometry and offscreen anchors rather than emitting nonfinite positions', () => {
    const anchor = {x: 450, y: 350, axis: 'x'};
    for (const bad of [null, {...anchor, x: NaN}, {...anchor, y: Infinity}, {...anchor, x: -1}, {...anchor, y: 701}, {...anchor, x: 901}]) {
      expect(api.layout(bad, box, view, [])).toBeNull();
    }
    for (const bad of [null, {width: 0, height: 40}, {width: 148, height: -1}, {width: Infinity, height: 40}]) {
      expect(api.layout(anchor, bad, view, [])).toBeNull();
    }
    for (const bad of [null, {width: 0, height: 700}, {width: 900, height: NaN}]) {
      expect(api.layout(anchor, box, bad, [])).toBeNull();
    }
  });
});
