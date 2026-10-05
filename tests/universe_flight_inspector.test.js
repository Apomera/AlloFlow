import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const window = {};
vm.runInNewContext(readFileSync('stem_lab/universe_flight_scene.js', 'utf8'), { window, Math });
const api = window.UniverseFlight;
const source = readFileSync('stem_lab/stem_tool_universe.js', 'utf8');
const start = source.indexOf('  function universeFlightNeighbors(');
const end = source.indexOf('  function UniverseFlightInspector(', start);
if (start < 0 || end < start) throw new Error('Landmark neighbors unavailable');
const neighbors = vm.runInNewContext(source.slice(start, end) + '\nuniverseFlightNeighbors;', { Math, Number });
const views = vm.runInNewContext(source.slice(start, end) + '\nuniverseFlightLandmarkViews;', { Math, Number });
const point = (id, position) => ({ id, position });

describe('Landmark inspector neighbors', () => {
  it('offers the three nearest other landmarks in a deterministic order', () => {
    const center = point('center', [10, 20, 30]);
    const catalog = [point('far', [10, 20, 100]), point('b', [10, 21, 30]), center, point('a', [11, 20, 30]), point('third', [10, 20, 32])];
    expect(neighbors(catalog, center).map(n => [n.target.id, n.distance])).toEqual([['a', 1], ['b', 1], ['third', 2]]);
  });
  it('keeps coincident other landmarks and excludes invalid distances', () => {
    const center = point('center', [0, 0, 0]);
    expect(neighbors([center, point('same', [0, 0, 0]), point('invalid', [Infinity, 0, 0])], center).map(n => n.target.id)).toEqual(['same']);
    expect(neighbors([], null)).toEqual([]);
    expect(neighbors([], point('invalid', [NaN, 0, 0]))).toEqual([]);
  });
  it('preserves every scene catalog and produces finite distances for all eighteen landmarks', () => {
    let count = 0;
    for (const region of ['neighborhood', 'galaxy', 'cosmic']) {
      const catalog = api.landmarks(region), before = JSON.stringify(catalog);
      for (const target of catalog) {
        const choices = neighbors(catalog, target);
        expect(choices).toHaveLength(3);
        expect(choices.every(c => c.target.id !== target.id && Number.isFinite(c.distance))).toBe(true);
        expect(choices[0].distance).toBeLessThanOrEqual(choices[1].distance);
        expect(choices[1].distance).toBeLessThanOrEqual(choices[2].distance);
        count++;
      }
      expect(JSON.stringify(catalog)).toBe(before);
    }
    expect(count).toBe(18);
  });
  it('connects all twelve authored scenic previews to their actual landmark and scene', () => {
    const manifest = JSON.parse(readFileSync('stem_lab/assets/universe-flight/highlights/manifest.json', 'utf8'));
    let count = 0;
    for (const region of ['neighborhood', 'galaxy', 'cosmic']) {
      for (const target of api.landmarks(region)) {
        for (const view of views(api.flybys(region), target.id)) {
          const image = manifest.views.find(v => v.routeId === view.routeId && v.highlightId === view.highlightId);
          expect(image.snapshot.targetId).toBe(target.id);
          expect(image.snapshot.settings.region).toBe(region);
          count++;
        }
      }
    }
    expect(count).toBe(12);
    expect(views(api.flybys(), 'not-a-landmark')).toEqual([]);
    expect(views(api.flybys('galaxy'), 'amber-star')).toEqual([]);
  });
});
