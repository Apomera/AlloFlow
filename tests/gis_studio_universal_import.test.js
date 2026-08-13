import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  renderTool,
  resetStemLab
} from './helpers/stem_widgets_smoke_harness.js';

const TOOL = 'stem_lab/stem_tool_gisstudio.js';
const load = () => loadTool(TOOL, 'gisStudio');

describe('GIS Studio - universal vector import foundations', () => {
  beforeEach(() => resetStemLab());

  it('detects and parses namespaced KML points, lines, and numeric ExtendedData', () => {
    const { detectGISVectorFormat, parseGISVectorText } = load().testing;
    const kml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<kml xmlns="http://www.opengis.net/kml/2.2"><Document>',
      '<Placemark><name>Harbor</name><ExtendedData><Data name="score"><value>7.5</value></Data></ExtendedData>',
      '<Point><coordinates>-70.25,43.66,4</coordinates></Point></Placemark>',
      '<Placemark><name>Trail</name><LineString><coordinates>-70.3,43.6 -70.2,43.7</coordinates></LineString></Placemark>',
      '</Document></kml>'
    ].join('');
    expect(detectGISVectorFormat('sample.kml', kml)).toBe('kml');
    const parsed = parseGISVectorText(kml, 'auto', 'sample.kml');
    expect(parsed.sourceFormat).toBe('kml');
    expect(parsed.data.features).toHaveLength(2);
    expect(parsed.data.features[0]).toMatchObject({
      properties: { name: 'Harbor', score: '7.5', value: 7.5 },
      geometry: { type: 'Point', coordinates: [-70.25, 43.66, 4] }
    });
    expect(parsed.data.features[1].geometry).toEqual({
      type: 'LineString',
      coordinates: [[-70.3, 43.6], [-70.2, 43.7]]
    });
  });

  it('closes KML polygon rings and preserves inner holes', () => {
    const { parseKML } = load().testing;
    const kml = '<kml xmlns="http://www.opengis.net/kml/2.2"><Placemark><name>Park</name><Polygon>' +
      '<outerBoundaryIs><LinearRing><coordinates>-71,43 -70,43 -70,44 -71,44</coordinates></LinearRing></outerBoundaryIs>' +
      '<innerBoundaryIs><LinearRing><coordinates>-70.8,43.2 -70.4,43.2 -70.4,43.6 -70.8,43.6</coordinates></LinearRing></innerBoundaryIs>' +
      '</Polygon></Placemark></kml>';
    const parsed = parseKML(kml);
    expect(parsed.data.features[0].geometry.type).toBe('Polygon');
    expect(parsed.data.features[0].geometry.coordinates).toHaveLength(2);
    expect(parsed.data.features[0].geometry.coordinates[0][0]).toEqual(parsed.data.features[0].geometry.coordinates[0].at(-1));
    expect(parsed.data.features[0].geometry.coordinates[1][0]).toEqual(parsed.data.features[0].geometry.coordinates[1].at(-1));
  });

  it('converts GPX waypoints and tracks into validated WGS84 GeoJSON', () => {
    const { detectGISVectorFormat, parseGPX, parseGISVectorText } = load().testing;
    const gpx = '<gpx version="1.1" creator="test" xmlns="http://www.topografix.com/GPX/1/1">' +
      '<wpt lat="43.66" lon="-70.25"><name>Harbor</name><ele>12</ele></wpt>' +
      '<trk><name>Walk</name><trkseg>' +
      '<trkpt lat="43.67" lon="-70.24"><ele>8</ele></trkpt>' +
      '<trkpt lat="43.68" lon="-70.23"><ele>9</ele></trkpt>' +
      '</trkseg></trk></gpx>';
    expect(detectGISVectorFormat('walk.gpx', gpx)).toBe('gpx');
    const parsed = parseGISVectorText(gpx, 'auto', 'walk.gpx');
    expect(parsed.sourceFormat).toBe('gpx');
    expect(parsed.data.features).toHaveLength(2);
    expect(parsed.data.features[0]).toMatchObject({
      properties: { name: 'Harbor', elevation: 12, value: 12 },
      geometry: { type: 'Point', coordinates: [-70.25, 43.66, 12] }
    });
    expect(parsed.data.features[1]).toMatchObject({
      properties: { name: 'Walk' },
      geometry: { type: 'LineString' }
    });
    expect(parsed.data.features[1].geometry.coordinates).toEqual([[-70.24, 43.67, 8], [-70.23, 43.68, 9]]);
    expect(parseGPX(gpx).numericKeys).toContain('value');
  });


  it('does not treat booleans or whitespace-only strings as numeric fields', () => {
    const { inspectGISVectorLayer, parseGeoJSON } = load().testing;
    const parsed = parseGeoJSON(JSON.stringify({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: 'Harbor', score: 7, public: false, note: '   ' },
          geometry: { type: 'Point', coordinates: [-70.25, 43.66] }
        },
        {
          type: 'Feature',
          properties: { name: 'Trail', score: 9, public: false, note: '\t' },
          geometry: { type: 'Point', coordinates: [-70.2, 43.7] }
        }
      ]
    }));

    expect(parsed.numericKeys).toEqual(['score']);
    expect(inspectGISVectorLayer(parsed).numericKeys).toEqual(['score']);
  });
  it('detects unsupported binary formats and fails closed with an actionable export path', () => {
    const { detectGISVectorFormat, parseGISVectorText } = load().testing;
    expect(detectGISVectorFormat('roads.zip', '')).toBe('shapefile');
    expect(detectGISVectorFormat('places.gpkg', '')).toBe('geopackage');
    expect(() => parseGISVectorText('', 'shapefile', 'roads.zip')).toThrow(/bundled binary parser/i);
    expect(() => parseGISVectorText('', 'geopackage', 'places.gpkg')).toThrow(/SQLite parser/i);
  });

  it('advertises KML and GPX in the reviewed import surface', () => {
    load();
    const html = renderTool('gisStudio', { gisTab: 'import' });
    expect(html).toContain('Choose GeoJSON, KML, or GPX');
    expect(html).toContain('.geojson,.json,.kml,.gpx');
    expect(html).toContain('Or paste GeoJSON, KML, or GPX');
  });

  it('rejects malformed XML and out-of-range coordinates', () => {
    const { parseKML, parseGPX } = load().testing;
    expect(() => parseKML('<kml><Placemark>')).toThrow(/valid XML/i);
    expect(() => parseGPX('<gpx xmlns="http://www.topografix.com/GPX/1/1"><wpt lat="95" lon="0"/></gpx>')).toThrow(/invalid WGS84/i);
  });

  it('summarizes geometry, selectable fields, completeness, and privacy signals before mapping', () => {
    const { inspectGISVectorLayer, parseGISVectorText } = load().testing;
    const source = JSON.stringify({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { site: 'Harbor', population: 10, score: 7, student_email: 'learner@example.test' },
          geometry: { type: 'Point', coordinates: [-70.12345, 43.67891] }
        },
        {
          type: 'Feature',
          properties: { site: 'Trail', population: 20 },
          geometry: { type: 'LineString', coordinates: [[-70.2, 43.6], [-70.1, 43.7]] }
        },
        {
          type: 'Feature',
          properties: { site: 'Park', population: 30, score: 9 },
          geometry: {
            type: 'Polygon',
            coordinates: [[[-70.5, 43.5], [-70.4, 43.5], [-70.4, 43.6], [-70.5, 43.5]]]
          }
        }
      ]
    });
    const parsed = parseGISVectorText(source, 'auto', 'mixed.geojson');
    const review = inspectGISVectorLayer(parsed, { metric: 'score' });

    expect(review).toMatchObject({
      sourceFormat: 'geojson',
      featureCount: 3,
      geometryCounts: { Point: 1, LineString: 1, Polygon: 1 },
      geometryTypes: ['LineString', 'Point', 'Polygon'],
      mixedGeometry: true,
      propertyKeys: ['population', 'score', 'site', 'student_email'],
      numericKeys: ['population', 'score'],
      nameCandidates: ['site', 'student_email'],
      suggestedNameKey: 'site',
      suggestedMetric: 'population',
      selectedMetric: 'score',
      missingMetricValues: 1,
      coordinateCount: 7,
      highPrecisionCoordinates: 1,
      identifierWarnings: 1
    });
  });

  it('preserves KML and GPX source identity and converted attributes through review', () => {
    const { inspectGISVectorLayer, parseGISVectorText } = load().testing;
    const kmlText = '<kml xmlns="http://www.opengis.net/kml/2.2"><Placemark><name>KML Harbor</name>' +
      '<ExtendedData><Data name="visits"><value>12</value></Data></ExtendedData>' +
      '<Point><coordinates>-70.25,43.66,4</coordinates></Point></Placemark></kml>';
    const gpxText = '<gpx version="1.1" creator="test" xmlns="http://www.topografix.com/GPX/1/1">' +
      '<wpt lat="43.67" lon="-70.24"><name>GPX Harbor</name><ele>14</ele></wpt></gpx>';
    const kml = parseGISVectorText(kmlText, 'auto', 'harbor.kml');
    const gpx = parseGISVectorText(gpxText, 'auto', 'harbor.gpx');
    const kmlSnapshot = JSON.stringify(kml.data);
    const gpxSnapshot = JSON.stringify(gpx.data);

    expect(inspectGISVectorLayer(kml)).toMatchObject({
      sourceFormat: 'kml',
      featureCount: 1,
      geometryCounts: { Point: 1 },
      suggestedNameKey: 'name',
      suggestedMetric: 'visits'
    });
    expect(inspectGISVectorLayer(gpx)).toMatchObject({
      sourceFormat: 'gpx',
      featureCount: 1,
      geometryCounts: { Point: 1 },
      suggestedNameKey: 'name',
      suggestedMetric: 'elevation'
    });
    expect(kml.data.features[0]).toMatchObject({
      properties: { name: 'KML Harbor', visits: '12', value: 12 },
      geometry: { type: 'Point', coordinates: [-70.25, 43.66, 4] }
    });
    expect(gpx.data.features[0]).toMatchObject({
      properties: { name: 'GPX Harbor', elevation: 14, value: 14 },
      geometry: { type: 'Point', coordinates: [-70.24, 43.67, 14] }
    });
    expect(JSON.stringify(kml.data)).toBe(kmlSnapshot);
    expect(JSON.stringify(gpx.data)).toBe(gpxSnapshot);
  });
});


describe('GIS Studio - reviewed vector import interactions', () => {
  let host;
  let root;
  let tool;

  const reviewedLayer = JSON.stringify({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { site: 'Harbor', district: 'Coast', population: 10, score: 7 },
        geometry: { type: 'Point', coordinates: [-70.25, 43.66] }
      },
      {
        type: 'Feature',
        properties: { site: 'Trail', district: 'Inland', population: 20, score: 9 },
        geometry: { type: 'LineString', coordinates: [[-70.3, 43.6], [-70.2, 43.7]] }
      }
    ]
  });

  function findButton(label) {
    return Array.from(host.querySelectorAll('button')).find((button) => button.textContent.trim() === label);
  }

  function findNavButton(label) {
    const nav = host.querySelector('nav');
    return nav && Array.from(nav.querySelectorAll('button')).find((button) => button.textContent.trim() === label);
  }

  function activeTab() {
    const active = host.querySelector('nav button[aria-current="page"]');
    return active && active.textContent.trim();
  }

  function findLabeledControl(label, selector) {
    const wrapper = Array.from(host.querySelectorAll('label')).find((node) => node.textContent.includes(label));
    return wrapper && wrapper.querySelector(selector);
  }

  function mountGIS(extraCtx) {
    function Harness() {
      const [sharedData, setSharedData] = React.useState({ gisTab: 'import', gisBasemap: 'none' });
      const ctx = makeCtx(Object.assign({
        toolData: sharedData,
        setToolData: setSharedData
      }, extraCtx || {}));
      return tool.render(ctx);
    }
    root = ReactDOMClient.createRoot(host);
    React.act(() => root.render(React.createElement(Harness)));
  }

  async function setSpatialText(text) {
    const textarea = findLabeledControl('Or paste GeoJSON, KML, or GPX', 'textarea');
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    await React.act(async () => {
      setter.call(textarea, text);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });
  }

  async function click(label) {
    const button = findButton(label);
    expect(button, 'Expected button: ' + label).toBeTruthy();
    await React.act(async () => {
      button.click();
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  function featureTableRows() {
    const section = host.querySelector('section[aria-labelledby="gis-geo-table-heading"]');
    expect(section).toBeTruthy();
    return Array.from(section.querySelectorAll('tbody tr')).map((row) =>
      Array.from(row.querySelectorAll('th,td')).map((cell) => cell.textContent.trim())
    );
  }

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    window.localStorage.clear();
    delete window.L;
    delete window.__alloGISLeaflet;
    delete window._geoLibsLoaded;
    resetStemLab();
    tool = loadTool(TOOL, 'gisStudio');
    host = document.createElement('div');
    document.body.appendChild(host);
    root = null;
  });

  afterEach(() => {
    if (root) React.act(() => root.unmount());
    host.remove();
    window.localStorage.clear();
    document.querySelectorAll('[data-gis-leaflet]').forEach((node) => node.remove());
    delete window.L;
    delete window.__alloGISLeaflet;
    delete window._geoLibsLoaded;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    vi.restoreAllMocks();
  });

  it('reviews geometry and accessible field choices before mapping the selected fields', async () => {
    const announce = vi.fn();
    mountGIS({ announceToSR: announce });
    await setSpatialText(reviewedLayer);

    const reviewButton = findButton('Review layer');
    expect(reviewButton).toBeTruthy();
    expect(reviewButton.type).toBe('button');
    await click('Review layer');

    expect(activeTab()).toBe('Import data');
    expect(host.querySelector('#gis-geo-table-heading')).toBeNull();
    expect(findButton('Map reviewed layer')).toBeTruthy();
    expect(host.textContent).toMatch(/2 features/i);
    expect(host.textContent).toMatch(/(?:Point\s*:?\s*1|1\s+Point)/i);
    expect(host.textContent).toMatch(/(?:LineString\s*:?\s*1|1\s+LineString)/i);

    const metric = findLabeledControl('Thematic numeric field', 'select');
    const label = findLabeledControl('Feature label field', 'select');
    expect(metric).toBeTruthy();
    expect(label).toBeTruthy();
    expect(Array.from(metric.labels || []).some((node) => node.textContent.includes('Thematic numeric field'))).toBe(true);
    expect(Array.from(label.labels || []).some((node) => node.textContent.includes('Feature label field'))).toBe(true);
    expect(metric.value).toBe('population');
    expect(label.value).toBe('site');
    const reviewStatus = Array.from(host.querySelectorAll('[role="status"]'))
      .find((node) => /2 features/i.test(node.textContent));
    expect(reviewStatus).toBeTruthy();
    expect(announce.mock.calls.flat().join(' ')).toMatch(/2.*features.*review/i);

    await React.act(async () => {
      metric.value = 'score';
      metric.dispatchEvent(new Event('change', { bubbles: true }));
      label.value = 'district';
      label.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });
    await click('Map reviewed layer');

    expect(activeTab()).toBe('Map + layers');
    const section = host.querySelector('section[aria-labelledby="gis-geo-table-heading"]');
    expect(Array.from(section.querySelectorAll('thead th')).map((cell) => cell.textContent.trim()))
      .toEqual(['Feature', 'Geometry', 'score']);
    expect(featureTableRows()).toEqual([
      ['Coast', 'Point', '7'],
      ['Inland', 'LineString', '9']
    ]);
    expect(findLabeledControl('Choropleth attribute', 'select').value).toBe('score');
    expect(announce.mock.calls.flat().join(' ')).toMatch(/2.*GeoJSON features mapped/i);
  });

  it('fails closed on mixed valid and invalid geometry without replacing the current map', async () => {
    const announce = vi.fn();
    mountGIS({ announceToSR: announce });
    await setSpatialText(reviewedLayer);
    await click('Review layer');
    await click('Map reviewed layer');
    const originalRows = featureTableRows();

    await React.act(async () => {
      findNavButton('Import data').click();
      await Promise.resolve();
    });
    const mixedInvalid = JSON.stringify({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: 'Valid newcomer', score: 99 },
          geometry: { type: 'Point', coordinates: [-70, 43] }
        },
        {
          type: 'Feature',
          properties: { name: 'Invalid newcomer', score: 100 },
          geometry: { type: 'Point', coordinates: [181, 43] }
        }
      ]
    });
    await setSpatialText(mixedInvalid);
    const staleApply = findButton('Map reviewed layer');
    expect(!staleApply || staleApply.disabled).toBe(true);
    await click('Review layer');

    expect(activeTab()).toBe('Import data');
    const alert = Array.from(host.querySelectorAll('[role="alert"]'))
      .find((node) => /Point coordinates/i.test(node.textContent));
    expect(alert).toBeTruthy();
    expect(alert.textContent).toMatch(/WGS84.*range/i);
    const invalidApply = findButton('Map reviewed layer');
    expect(!invalidApply || invalidApply.disabled).toBe(true);
    expect(announce.mock.calls.flat().join(' ')).toMatch(/Spatial layer error.*WGS84/i);

    await React.act(async () => {
      findNavButton('Map + layers').click();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(featureTableRows()).toEqual(originalRows);
    expect(host.textContent).not.toContain('Valid newcomer');
    expect(host.textContent).not.toContain('Invalid newcomer');
  });


  it('keeps automatic feature numbers after mapping instead of restoring source names', async () => {
    mountGIS();
    await setSpatialText(reviewedLayer);
    await click('Review layer');

    const label = findLabeledControl('Feature label field', 'select');
    await React.act(async () => {
      label.value = '';
      label.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });
    expect(label.selectedOptions[0].textContent.trim()).toBe('Automatic feature numbers');

    const preview = Array.from(host.querySelectorAll('table')).find((table) =>
      table.querySelector('caption')?.textContent.includes('Spatial feature preview')
    );
    expect(preview).toBeTruthy();
    expect(preview.textContent).toContain('Feature 1');
    expect(preview.textContent).toContain('Feature 2');
    expect(preview.textContent).not.toMatch(/Harbor|Trail/);

    await click('Map reviewed layer');

    expect(activeTab()).toBe('Map + layers');
    expect(featureTableRows()).toEqual([
      ['Feature 1', 'Point', '10'],
      ['Feature 2', 'LineString', '20']
    ]);
    const mappedTable = host.querySelector('section[aria-labelledby="gis-geo-table-heading"]');
    expect(mappedTable.textContent).not.toMatch(/Harbor|Trail/);
  });
  it('renders mixed vector geometry honestly in the no-basemap SVG', async () => {
    const mixedLayer = JSON.stringify({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: 'Single point', score: 1 },
          geometry: { type: 'Point', coordinates: [-70.7, 43.2] }
        },
        {
          type: 'Feature',
          properties: { name: 'Multiple points', score: 2 },
          geometry: { type: 'MultiPoint', coordinates: [[-70.65, 43.25], [-70.6, 43.3]] }
        },
        {
          type: 'Feature',
          properties: { name: 'Open trail', score: 3 },
          geometry: { type: 'LineString', coordinates: [[-70.8, 43.35], [-70.7, 43.4], [-70.6, 43.45]] }
        },
        {
          type: 'Feature',
          properties: { name: 'Split trail', score: 4 },
          geometry: {
            type: 'MultiLineString',
            coordinates: [
              [[-70.55, 43.2], [-70.45, 43.3]],
              [[-70.4, 43.25], [-70.3, 43.35]]
            ]
          }
        },
        {
          type: 'Feature',
          properties: { name: 'Park with pond', score: 5 },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [[-70.9, 43.5], [-70.6, 43.5], [-70.6, 43.75], [-70.9, 43.5]],
              [[-70.8, 43.56], [-70.72, 43.56], [-70.72, 43.63], [-70.8, 43.56]]
            ]
          }
        },
        {
          type: 'Feature',
          properties: { name: 'Two preserves', score: 6 },
          geometry: {
            type: 'MultiPolygon',
            coordinates: [
              [
                [[-70.5, 43.5], [-70.3, 43.5], [-70.3, 43.7], [-70.5, 43.5]],
                [[-70.45, 43.55], [-70.4, 43.55], [-70.4, 43.6], [-70.45, 43.55]]
              ],
              [
                [[-70.25, 43.45], [-70.05, 43.45], [-70.05, 43.65], [-70.25, 43.45]]
              ]
            ]
          }
        }
      ]
    });

    mountGIS();
    await setSpatialText(mixedLayer);
    await click('Review layer');
    await click('Map reviewed layer');

    const svg = host.querySelector('svg[role="img"]');
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('aria-label')).toMatch(/3 lines, and 3 polygons/i);

    const vectorPoints = Array.from(svg.querySelectorAll('circle[r="6"]'));
    expect(vectorPoints).toHaveLength(3);

    const linePaths = Array.from(svg.querySelectorAll('path[fill="none"]'));
    expect(linePaths).toHaveLength(3);
    linePaths.forEach((path) => {
      expect(path.getAttribute('d')).not.toMatch(/\bZ\b/i);
      expect(path.getAttribute('fill')).toBe('none');
    });

    const polygonPaths = Array.from(svg.querySelectorAll('path[fill-rule="evenodd"]'));
    expect(polygonPaths).toHaveLength(3);
    polygonPaths.forEach((path) => {
      expect(path.getAttribute('fill')).not.toBe('none');
      expect(path.getAttribute('d')).toMatch(/\bZ\b/);
    });
    const polygonsWithHoles = polygonPaths.filter((path) =>
      (path.getAttribute('d').match(/\bM/g) || []).length === 2
    );
    expect(polygonsWithHoles).toHaveLength(2);
    polygonsWithHoles.forEach((path) => {
      expect((path.getAttribute('d').match(/\bZ\b/g) || [])).toHaveLength(2);
    });
  });
});

describe('GIS Studio - vector import limits', () => {
  beforeEach(() => resetStemLab());

  it('reports the original and omitted counts when a layer exceeds 500 features', () => {
    const { inspectGISVectorLayer, parseGISVectorText } = load().testing;
    const source = {
      type: 'FeatureCollection',
      features: Array.from({ length: 501 }, (_, index) => ({
        type: 'Feature',
        properties: { name: 'Feature ' + index, score: index },
        geometry: { type: 'Point', coordinates: [-70, 43] }
      }))
    };

    const parsed = parseGISVectorText(JSON.stringify(source), 'auto', '501-points.geojson');
    const inspection = inspectGISVectorLayer(parsed);

    expect(parsed.data.features).toHaveLength(500);
    expect(parsed.originalFeatureCount).toBe(501);
    expect(parsed.truncatedFeatures).toBe(1);
    expect(parsed.data.features.at(-1).properties.name).toBe('Feature 499');
    expect(inspection).toMatchObject({
      originalFeatureCount: 501,
      featureCount: 500,
      truncatedFeatures: 1,
      geometryCounts: { Point: 500 },
      coordinateCount: 500
    });
  });
});
