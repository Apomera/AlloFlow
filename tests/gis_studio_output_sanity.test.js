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

  it('does not hand a spreadsheet a formula it never wrote', () => {
    // Place names now arrive in files the studio did not author. Excel, Numbers
    // and Sheets treat a leading =, +, - or @ as a formula, so an exported CSV
    // can execute when a colleague opens it.
    const csv = tool.testing.rowsToCSV([
      ['name', 'value'],
      ['=HYPERLINK("http://example.invalid","click")', 1],
      ['+1+1', 2],
      ['@SUM(A1)', 3],
      ['-notanumber', 4],
      ['normal place', 5]
    ]);
    const lines = csv.trim().split('\r\n');
    expect(lines[1]).toContain("'=HYPERLINK");
    expect(lines[2]).toBe("'+1+1,2");
    expect(lines[3]).toBe("'@SUM(A1),3");
    expect(lines[4]).toBe("'-notanumber,4");
    expect(lines[5]).toBe('normal place,5');

    // Every guarded cell is inert: no exported field begins with a trigger.
    for (const line of lines.slice(1)) {
      for (const cell of line.split(',')) {
        expect(/^"?[=+@]/.test(cell), 'a cell still starts with a formula trigger: ' + cell).toBe(false);
      }
    }
  });

  it('leaves real numbers alone, including negative ones', () => {
    const csv = tool.testing.rowsToCSV([['name', 'elevation'], ['Below sea level', -5], ['Deep', '-12.5'], ['Zero', 0]]);
    const lines = csv.trim().split('\r\n');
    expect(lines[1]).toBe('Below sea level,-5');
    expect(lines[2]).toBe('Deep,-12.5');
    expect(lines[3]).toBe('Zero,0');
    expect(tool.testing.csvCell(-5)).toBe('-5');
    expect(tool.testing.csvCell('-5e3')).toBe('-5e3');
    expect(tool.testing.csvCell('')).toBe('');
    expect(tool.testing.csvCell(null)).toBe('');
  });

  it('round-trips its own export, guard and all', () => {
    const name = '=Cape Town';
    const csv = tool.testing.rowsToCSV([['name', 'latitude', 'longitude', 'value'], [name, -33.92, 18.42, 42]]);
    expect(csv).toContain("'=Cape Town");
    const parsed = tool.testing.parseCSV(csv);
    expect(parsed[0].name).toBe(name);
    expect(parsed[0]).toMatchObject({ lat: -33.92, lon: 18.42, value: 42 });

    // Only the guard is removed, never an apostrophe that belongs to the text.
    expect(tool.testing.unguardGISCSVCell("'=x")).toBe('=x');
    expect(tool.testing.unguardGISCSVCell("'Ndjamena")).toBe("'Ndjamena");
    expect(tool.testing.unguardGISCSVCell("O'Brien Point")).toBe("O'Brien Point");
    expect(tool.testing.unguardGISCSVCell('')).toBe('');
  });

  it('escapes hostile text in every exported report', () => {
    const payload = '<img src=x onerror=alert(1)>';
    const rows = [{ name: payload, lat: 1, lon: 2, value: 3, geometry: 'Point' }];
    const reports = {
      evidence: tool.testing.buildEvidenceReport({ left: { label: payload, rows }, right: { label: payload, rows } }),
      composer: tool.testing.buildMapComposerReport({ rows, title: payload, altText: payload, annotations: [{ label: payload, lat: 1, lon: 2 }], provenance: { source: payload } }),
      story: tool.testing.buildStoryMapReport({ rows, story: { title: payload, subtitle: payload, slides: [{ title: payload, narrative: payload }] } }),
      quality: tool.testing.buildDataQualityReport({ importedRows: rows, provenance: { source: payload } }),
      packet: tool.testing.buildInvestigationPacketReport({ rows, storyMap: { title: payload, slides: [{ title: payload, narrative: payload }] }, provenance: { source: payload } })
    };
    for (const [name, html] of Object.entries(reports)) {
      expect(html, name + ' report contains an unescaped tag from user text').not.toContain('<img src=x');
    }
    // The reports that echo names and titles must still show the text, escaped,
    // rather than dropping it. The quality review only summarises, so it is not
    // expected to carry the string at all.
    for (const name of ['evidence', 'composer', 'story', 'packet']) {
      expect(reports[name], name + ' report should still show the text, escaped').toContain('&lt;img src=x');
    }
  });

  it('stamps every exported document with when it was generated', () => {
    // Two builders defaulted the timestamp and two did not, so a map package or
    // evidence report exported without a locale headed itself "Generated ."
    const rows = [{ name: 'West End', lat: 43.65, lon: -70.27, value: 2400, geometry: 'Point' }];
    const reports = {
      evidence: tool.testing.buildEvidenceReport({ left: { label: 'Households', rows }, right: { label: 'Trees', rows } }),
      composer: tool.testing.buildMapComposerReport({ rows, title: 'Portland households', altText: 'x'.repeat(50) }),
      story: tool.testing.buildStoryMapReport({ rows, story: { title: 'A study', slides: [] } }),
      packet: tool.testing.buildInvestigationPacketReport({ rows, storyMap: { title: 'A study', slides: [] } })
    };
    for (const [name, html] of Object.entries(reports)) {
      expect(html, name + ' has an empty generated stamp').not.toMatch(/Generated\s*[.<]/);
      expect(html, name + ' should name a year').toMatch(/Generated[^<]*20\d\d/);
    }

    // A caller-supplied stamp still wins, and a locale still formats it.
    const fixed = tool.testing.buildEvidenceReport({ left: { label: 'L', rows }, right: { label: 'R', rows }, generated: 'Fixed stamp' });
    expect(fixed).toContain('Generated Fixed stamp');
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
