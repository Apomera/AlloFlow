// GATE: no workspace may render a computed value that is not a value.
//
// For ten rounds every test passed while the main map summary said
// "Coastal average: NaN" for every custom region pack. The averages were taken
// over records carrying a `coastal` flag, which only the built-in samples have,
// so the group was empty and 0/0 reached the screen. No assertion looked for
// nonsense, only for expected text.
//
// This sweeps every workspace across the shapes a region pack can take and
// fails on the tokens that mean a computation escaped without a value.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

vi.setConfig({ testTimeout: 30000 });

const TOOL = 'stem_lab/stem_tool_gisstudio.js';
const WORKSPACES = [
  'map', 'import', 'compare', 'missions', 'timeline', 'project', 'composer',
  'remote', 'story', 'quality', 'planner', 'review', 'packet', 'projection'
];
const NONSENSE = [/\bNaN\b/, /\bundefined\b/, /\bInfinity\b/, /\[object Object\]/, /\bnull\b/];

function visibleText(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<textarea[\s\S]*?<\/textarea>/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ');
}

describe('GIS Studio output sanity', () => {
  let tool;
  beforeEach(() => {
    resetStemLab();
    tool = loadTool(TOOL, 'gisStudio');
  });

  function packState(pack) {
    const serialized = tool.testing.serializeGISRegionPack(pack);
    return { gisCustomRegionPacks: [serialized], gisRegionPack: serialized.id };
  }

  function sweep(label, extra) {
    const problems = [];
    for (const workspace of WORKSPACES) {
      const html = renderTool('gisStudio', Object.assign({ gisTab: workspace, gisBasemap: 'none' }, extra));
      const text = visibleText(html);
      for (const pattern of NONSENSE) {
        const index = text.search(pattern);
        if (index >= 0) {
          problems.push(`${label}/${workspace}: ${text.match(pattern)[0]} in "${text.slice(Math.max(0, index - 70), index + 40).trim()}"`);
        }
      }
    }
    return problems;
  }

  it('renders the built-in packs without a stray computation', () => {
    expect(sweep('maine', {})).toEqual([]);
    expect(sweep('new-england', { gisRegionPack: 'new-england' })).toEqual([]);
    expect(sweep('united-states', { gisRegionPack: 'united-states' })).toEqual([]);
    expect(sweep('global', { gisRegionPack: 'global' })).toEqual([]);
  });

  it('renders every shape a custom pack can take without a stray computation', () => {
    const plain = packState({
      label: 'Otago towns',
      metrics: [{ id: 'population', label: 'Population' }, { id: 'elevation', label: 'Elevation', unit: 'm' }],
      records: [
        { name: 'Dunedin', lat: -45.87, lon: 170.5, population: 130000, elevation: 5 },
        { name: 'Queenstown', lat: -45.03, lon: 168.66, population: 16000, elevation: 310 }
      ]
    });
    expect(sweep('two-attributes', plain)).toEqual([]);

    // One place: every spread, range and average is degenerate.
    const single = packState({
      label: 'Single place',
      metrics: [{ id: 'value', label: 'Value' }],
      records: [{ name: 'Solo', lat: 10, lon: 10, value: 5 }]
    });
    expect(sweep('one-place', single)).toEqual([]);

    // Identical values: the colour ramp and the spread both divide by zero.
    const flat = packState({
      label: 'Flat values',
      metrics: [{ id: 'value', label: 'Value' }],
      records: [{ name: 'A', lat: 1, lon: 1, value: 7 }, { name: 'B', lat: 2, lon: 2, value: 7 }]
    });
    expect(sweep('identical-values', flat)).toEqual([]);

    // Zero values, which break naive percentage-change arithmetic.
    const zeros = packState({
      label: 'Zero values',
      metrics: [{ id: 'value', label: 'Value' }],
      records: [{ name: 'A', lat: 1, lon: 1, value: 0 }, { name: 'B', lat: 2, lon: 2, value: 0 }]
    });
    expect(sweep('zero-values', zeros)).toEqual([]);

    const bounded = packState({
      label: 'With boundaries',
      metrics: [{ id: 'value', label: 'Value' }],
      records: [{ name: 'A', lat: 1, lon: 1, value: 1 }, { name: 'B', lat: 2, lon: 2, value: 2 }],
      boundaries: {
        type: 'FeatureCollection',
        features: [{ type: 'Feature', properties: { name: 'Ward', index: 1 }, geometry: { type: 'Polygon', coordinates: [[[0, 0], [3, 0], [3, 3], [0, 3], [0, 0]]] } }]
      }
    });
    expect(sweep('with-boundaries', bounded)).toEqual([]);
  });

  it('says so when a pack has only one attribute to compare', () => {
    const single = packState({
      label: 'Otago towns',
      metrics: [{ id: 'population', label: 'Population' }],
      records: [{ name: 'Dunedin', lat: -45.87, lon: 170.5, population: 130000 }, { name: 'Oamaru', lat: -45.1, lon: 170.97, population: 14000 }]
    });
    const html = renderTool('gisStudio', Object.assign({ gisTab: 'compare', gisBasemap: 'none' }, single));
    expect(html).toContain('One attribute only:');
    expect(html).toContain('Otago towns carries only Population');
    // The comparison still works; it is labelled, not disabled.
    expect(html).toContain('Synchronized map comparison');

    const two = packState({
      label: 'Otago towns',
      metrics: [{ id: 'population', label: 'Population' }, { id: 'elevation', label: 'Elevation' }],
      records: [{ name: 'Dunedin', lat: -45.87, lon: 170.5, population: 130000, elevation: 5 }, { name: 'Oamaru', lat: -45.1, lon: 170.97, population: 14000, elevation: 20 }]
    });
    expect(renderTool('gisStudio', Object.assign({ gisTab: 'compare', gisBasemap: 'none' }, two))).not.toContain('One attribute only:');
    expect(renderTool('gisStudio', { gisTab: 'compare', gisBasemap: 'none' })).not.toContain('One attribute only:');
  });
});
