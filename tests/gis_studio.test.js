import { describe, it, expect, beforeEach } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

describe('GIS Studio', () => {
  beforeEach(() => resetStemLab());

  it('registers with a distinct GIS identity', () => {
    const tool = loadTool('stem_lab/stem_tool_gisstudio.js', 'gisStudio');
    expect(tool.label).toBe('GIS Studio');
    expect(tool.category).toBe('geo');
    expect(tool.aliases).toContain('GIS');
  });

  it('validates GeoJSON and prioritizes meaningful numeric attributes', () => {
    const tool = loadTool('stem_lab/stem_tool_gisstudio.js', 'gisStudio');
    const parsed = tool.testing.parseGeoJSON(JSON.stringify({
      type: 'FeatureCollection',
      features: [{ type: 'Feature', properties: { OBJECTID: 1, score: 72 }, geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] } }]
    }));
    expect(parsed.numericKeys[0]).toBe('score');
    expect(() => tool.testing.parseGeoJSON('{"type":"FeatureCollection","features":[]}')).toThrow();
  });

  it('joins CSV attributes to GeoJSON with mismatch diagnostics', () => {
    const tool = loadTool('stem_lab/stem_tool_gisstudio.js', 'gisStudio');
    const geo = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', properties: { county: 'York County' }, geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] } },
        { type: 'Feature', properties: { county: 'Knox' }, geometry: { type: 'Polygon', coordinates: [[[1, 0], [2, 0], [2, 1], [1, 0]]] } }
      ]
    };
    const table = tool.testing.parseTableCSV('name,value\nyork county,12\nCumberland,25');
    const joined = tool.testing.joinTableToGeoJSON(geo, table.rows, 'county', 'name', 'value');
    expect(joined.matched).toBe(1);
    expect(joined.unmatchedCSV).toEqual(['Cumberland']);
    expect(joined.unmatchedGeo).toEqual(['Knox']);
    expect(joined.data.features[0].properties[joined.metric]).toBe(12);
  });

  it('calculates quantile, equal-interval, Jenks, and custom breaks', () => {
    const tool = loadTool('stem_lab/stem_tool_gisstudio.js', 'gisStudio');
    const values = [1, 2, 3, 4, 20, 21, 22, 80, 90, 100];
    expect(tool.testing.calculateBreaks(values, 'quantile', 5, '')).toHaveLength(4);
    expect(tool.testing.calculateBreaks(values, 'equal', 5, '')).toHaveLength(4);
    expect(tool.testing.calculateBreaks(values, 'jenks', 4, '').length).toBeGreaterThan(0);
    expect(tool.testing.calculateBreaks(values, 'custom', 5, '10, 30, 70')).toEqual([10, 30, 70]);
  });

  it('renders layers, spatial reasoning, sonification, and a table twin', () => {
    loadTool('stem_lab/stem_tool_gisstudio.js', 'gisStudio');
    const html = renderTool('gisStudio', {});
    for (const text of ['Layer workspace', 'Visible layers', 'Spatial pattern coach', 'Spatial analysis workbench', 'Spatial analysis results', 'Accessible data-table twin', 'Sonify values', 'Maine missions', 'Change over time', 'Compare + export', 'Import data', 'Projection lab', 'Satellite imagery']) {
      expect(html).toContain(text);
    }
    expect(html).toContain('<table');
  });

  it('renders CSV, GeoJSON, and official-layer import choices', () => {
    loadTool('stem_lab/stem_tool_gisstudio.js', 'gisStudio');
    const html = renderTool('gisStudio', { gisTab: 'import' });
    expect(html).toContain('Map a coordinate CSV');
    expect(html).toContain('Import a GeoJSON choropleth');
    expect(html).toContain('Load official Maine ecoregions');
    expect(html).toContain('Build choropleth');
    expect(html).toContain('Join a CSV to map boundaries');
    expect(html).toContain('Read CSV columns');
    expect(html).toContain('Data ethics');
  });

  it('restores satellite mode with an imagery interpretation routine', () => {
    loadTool('stem_lab/stem_tool_gisstudio.js', 'gisStudio');
    const html = renderTool('gisStudio', { gisBasemap: 'satellite' });
    expect(html).toContain('Satellite imagery reading routine');
    expect(html).toContain('Evidence-based observation');
  });


  it('calculates geodesic paths and polygon measurements', () => {
    const tool = loadTool('stem_lab/stem_tool_gisstudio.js', 'gisStudio');
    const oneDegree = tool.testing.haversineKm({ lat: 0, lon: 0 }, { lat: 0, lon: 1 });
    expect(oneDegree).toBeGreaterThan(111);
    expect(oneDegree).toBeLessThan(112);
    expect(tool.testing.pathLengthKm([[0, 0], [1, 0], [1, 1]])).toBeGreaterThan(220);
    const measured = tool.testing.featureMeasurements({
      type: 'Feature',
      properties: {},
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] }
    });
    expect(measured.areaSquareKm).toBeGreaterThan(12000);
    expect(measured.perimeterKm).toBeGreaterThan(440);
  });

  it('selects points by radius and polygon while respecting holes', () => {
    const tool = loadTool('stem_lab/stem_tool_gisstudio.js', 'gisStudio');
    const records = [
      { name: 'inside', lat: 0.2, lon: 0.2 },
      { name: 'hole', lat: 0.5, lon: 0.5 },
      { name: 'outside', lat: 2, lon: 2 }
    ];
    const feature = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [
          [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]],
          [[0.4, 0.4], [0.6, 0.4], [0.6, 0.6], [0.4, 0.6], [0.4, 0.4]]
        ]
      }
    };
    expect(tool.testing.selectPointsInFeature(records, feature)).toEqual([0]);
    expect(tool.testing.selectWithinRadius(records, { lat: 0, lon: 0 }, 40)).toEqual([0]);
  });

  it('finds the nearest mapped record', () => {
    const tool = loadTool('stem_lab/stem_tool_gisstudio.js', 'gisStudio');
    const nearest = tool.testing.nearestRecord([
      { name: 'far', lat: 45, lon: -70 },
      { name: 'near', lat: 44, lon: -69 }
    ], { lat: 44.01, lon: -69.01 });
    expect(nearest.record.name).toBe('near');
    expect(nearest.index).toBe(1);
  });

  it('builds a print-ready, escaped, accessible evidence report', () => {
    const tool = loadTool('stem_lab/stem_tool_gisstudio.js', 'gisStudio');
    const report = tool.testing.buildEvidenceReport({
      title: 'Watershed evidence',
      generated: '2026-07-25',
      observation: '<script>alert("no")</script>',
      analysis: 'Pattern does not prove cause.',
      left: { label: 'Population', basemap: 'Street', rows: [{ name: 'A', geometry: 'Point', lat: 44, lon: -69, value: 12 }] },
      right: { label: 'Access', basemap: 'Imagery', rows: [{ name: 'A', geometry: 'Point', lat: 44, lon: -69, value: 88 }] },
      selected: [{ name: 'A', lat: 44, lon: -69, value: 12 }]
    });
    expect(report).toContain('<html lang="en">');
    expect(report).toContain('Coordinate plot');
    expect(report).toContain('Print or save as PDF');
    expect(report).toContain('<caption>Left comparison data</caption>');
    expect(report).toContain('&lt;script&gt;');
    expect(report).not.toContain('<script>alert');
  });

  it('renders synchronized comparison controls, table twins, and evidence export', () => {
    loadTool('stem_lab/stem_tool_gisstudio.js', 'gisStudio');
    const html = renderTool('gisStudio', { gisTab: 'compare' });
    for (const text of ['Synchronized map comparison', 'Left map', 'Right map', 'Evidence builder', 'Download accessible report', 'Print or save as PDF', 'Left-map table twin', 'Right-map table twin']) {
      expect(html).toContain(text);
    }
    expect((html.match(/<table/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  it('defines three distinct Maine missions and calculates checklist completion', () => {
    const tool = loadTool('stem_lab/stem_tool_gisstudio.js', 'gisStudio');
    expect(tool.testing.missions).toHaveLength(3);
    expect(new Set(tool.testing.missions.map((mission) => mission.id)).size).toBe(3);
    const mission = tool.testing.missions[0];
    expect(tool.testing.missionCompletion(mission, {})).toEqual({ complete: 0, total: 4, percent: 0 });
    expect(tool.testing.missionCompletion(mission, { setup: true, pattern: true })).toEqual({ complete: 2, total: 4, percent: 50 });
  });

  it('renders the guided Maine mission workspace with progress and teacher supports', () => {
    loadTool('stem_lab/stem_tool_gisstudio.js', 'gisStudio');
    const html = renderTool('gisStudio', { gisTab: 'missions' });
    for (const text of ['Guided GIS missions', 'Coast and Connectivity', 'Community Service Area', 'Ecological Region Boundaries', 'Investigation checklist', 'Evidence response', 'Teacher lens', 'Quick evidence rubric', 'Download mission evidence report']) {
      expect(html).toContain(text);
    }
    expect(html).toContain('<progress');
    expect(html).toContain('type="checkbox"');
  });

  it('parses time-series CSV metadata and rejects a single-year dataset', () => {
    const tool = loadTool('stem_lab/stem_tool_gisstudio.js', 'gisStudio');
    const parsed = tool.testing.parseTimeCSV('name,lat,lon,year,value,unit,source\nA,44,-69,2020,10,percent,Survey\nA,44,-69,2025,15,percent,Survey');
    expect(parsed.years).toEqual([2020, 2025]);
    expect(parsed.units).toEqual(['percent']);
    expect(parsed.sources).toEqual(['Survey']);
    expect(() => tool.testing.parseTimeCSV('name,lat,lon,year,value\nA,44,-69,2020,10')).toThrow(/two distinct years/);
  });

  it('calculates temporal change, percent change, missing pairs, and unit warnings', () => {
    const tool = loadTool('stem_lab/stem_tool_gisstudio.js', 'gisStudio');
    const result = tool.testing.calculateTemporalChange([
      { name: 'A', lat: 44, lon: -69, year: 2020, value: 10, unit: 'count' },
      { name: 'A', lat: 44, lon: -69, year: 2025, value: 15, unit: 'percent' },
      { name: 'B', lat: 45, lon: -68, year: 2020, value: 20, unit: 'count' }
    ], 2020, 2025);
    expect(result.rows[0].change).toBe(5);
    expect(result.rows[0].percent).toBe(50);
    expect(result.rows[1].trend).toBe('Missing comparison');
    expect(result.warnings.join(' ')).toContain('missing');
    expect(result.warnings.join(' ')).toContain('different units');
  });

  it('renders the animated, accessible time-series workspace', () => {
    loadTool('stem_lab/stem_tool_gisstudio.js', 'gisStudio');
    const html = renderTool('gisStudio', { gisTab: 'timeline' });
    for (const text of ['Time-Series Change Lab', 'Import a time-series CSV', 'Baseline year', 'Focus year', 'Play timeline', 'Sonify changes', 'Accessible change summary', 'Absolute change', 'Percent change', 'Download change evidence report', 'Compatibility check']) {
      expect(html).toContain(text);
    }
    expect(html).toContain('type="range"');
    expect(html).toContain('<table');
  });
  it('renders the projection lab from restored state', () => {
    loadTool('stem_lab/stem_tool_gisstudio.js', 'gisStudio');
    const html = renderTool('gisStudio', { gisTab: 'projection' });
    expect(html).toContain('Tissot indicatrix');
    expect(html).toContain('Mercator');
    expect(html).toContain('Equal-area');
    expect(html).toContain('visual area');
  });
});
