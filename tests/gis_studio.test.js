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
    for (const text of ['Layer workspace', 'Visible layers', 'Spatial pattern coach', 'Spatial analysis workbench', 'Spatial analysis results', 'Accessible data-table twin', 'Sonify values', 'Import data', 'Projection lab', 'Satellite imagery']) {
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
  it('renders the projection lab from restored state', () => {
    loadTool('stem_lab/stem_tool_gisstudio.js', 'gisStudio');
    const html = renderTool('gisStudio', { gisTab: 'projection' });
    expect(html).toContain('Tissot indicatrix');
    expect(html).toContain('Mercator');
    expect(html).toContain('Equal-area');
    expect(html).toContain('visual area');
  });
});
