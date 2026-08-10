import { beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const TOOL = 'stem_lab/stem_tool_gisstudio.js';
const load = () => loadTool(TOOL, 'gisStudio');

function makeBasemapLifecycleStub() {
  const layers = [];
  function addableLayer() {
    return {
      on: function () { return this; },
      bindTooltip: function () { return this; },
      addTo: function (map) { map._layers.push(this); return this; }
    };
  }
  const api = {
    map: function (node) {
      return {
        _container: node, _layers: [], _events: {},
        setView: function (center, zoom) { this._center = Array.isArray(center) ? { lat: center[0], lng: center[1] } : center; this._zoom = zoom; return this; },
        getContainer: function () { return this._container; },
        getCenter: function () { return this._center || { lat: 45.15, lng: -69.05 }; },
        getZoom: function () { return this._zoom || 6; },
        on: function (name, callback) { if (!this._events[name]) this._events[name] = []; this._events[name].push(callback); return this; },
        off: function (name, callback) { if (!name) this._events = {}; else if (!callback) delete this._events[name]; else if (this._events[name]) this._events[name] = this._events[name].filter(function (item) { return item !== callback; }); return this; },
        eachLayer: function (callback) { this._layers.slice().forEach(callback); },
        removeLayer: function (layer) { this._layers = this._layers.filter(function (item) { return item !== layer; }); return this; },
        hasLayer: function (layer) { return this._layers.includes(layer); },
        invalidateSize: function () { return this; },
        remove: function () { this._layers = []; this._events = {}; return this; }
      };
    },
    tileLayer: function (url, options) {
      const callbacks = {};
      const layer = {
        url, options, onCalls: [], offCalls: [],
        on: function (name, callback) { this.onCalls.push({ name, callback }); if (!callbacks[name]) callbacks[name] = []; callbacks[name].push(callback); return this; },
        off: function (name, callback) { this.offCalls.push({ name, callback }); if (callbacks[name]) callbacks[name] = callbacks[name].filter(function (item) { return item !== callback; }); return this; },
        emit: function (name, event) { (callbacks[name] || []).slice().forEach(function (callback) { callback(event); }); },
        addTo: function (map) { map._layers.push(this); return this; }
      };
      layers.push(layer);
      return layer;
    },
    polyline: addableLayer,
    circleMarker: addableLayer,
    circle: addableLayer
  };
  return { api, layers };
}

describe('GIS Studio - global longitude and viewport foundations', () => {
  beforeEach(() => resetStemLab());

  it('returns the ordinary minimal arc for data that do not cross the antimeridian', () => {
    const { minimalLongitudeArc } = load().testing;
    const arc = minimalLongitudeArc([-73, -70, -68.5]);

    expect(arc).toMatchObject({
      west: -73,
      east: -68.5,
      crossesAntimeridian: false,
    });
    expect(arc.center).toBeCloseTo(-70.75, 8);
    expect(arc.span).toBeCloseTo(4.5, 8);
  });

  it('uses the short longitude arc and an RFC 7946-style crossing bound at the antimeridian', () => {
    const { minimalLongitudeArc } = load().testing;
    const arc = minimalLongitudeArc([179.4, -179.6, 178.8]);

    expect(arc.crossesAntimeridian).toBe(true);
    expect(arc.west).toBeCloseTo(178.8, 8);
    expect(arc.east).toBeCloseTo(-179.6, 8);
    expect(arc.west).toBeGreaterThan(arc.east);
    expect(arc.center).toBeCloseTo(179.6, 8);
    expect(arc.span).toBeCloseTo(1.6, 8);
  });

  it('centers a southern-hemisphere dateline dataset on its data rather than Greenwich', () => {
    const { dataViewport } = load().testing;
    const viewport = dataViewport([
      { name: 'Suva', lat: -18.1416, lon: 178.4419 },
      { name: 'Taveuni', lat: -16.8414, lon: -179.9813 },
      { name: 'Apia', lat: -13.8507, lon: -171.7514 },
    ]);

    expect(viewport.crossesAntimeridian).toBe(true);
    expect(viewport.center[0]).toBeGreaterThan(-19);
    expect(viewport.center[0]).toBeLessThan(-13);
    expect(Math.abs(viewport.center[1])).toBeGreaterThan(170);
    expect(viewport.bounds.west).toBeGreaterThan(viewport.bounds.east);
    expect(viewport.longitudeSpan).toBeGreaterThan(0);
    expect(viewport.longitudeSpan).toBeLessThan(11);
    expect(viewport.latitudeSpan).toBeGreaterThan(4);
    expect(viewport.latitudeSpan).toBeLessThan(5);
    expect(Number.isFinite(viewport.zoom)).toBe(true);
  });


  it('unwraps a crossing GeoJSON copy around the same Leaflet world as its center without mutating source data', () => {
    const { minimalLongitudeArc, dataViewport, leafletCenterForViewport, collectGISGeoJSONPoints, unwrapGISGeoJSONForArc } = load().testing;
    const source = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: { name: 'Dateline route' },
        geometry: { type: 'LineString', coordinates: [[179, -18], [-179, -17]] },
      }],
    };
    const points = collectGISGeoJSONPoints(source);
    const arc = minimalLongitudeArc(points.map((point) => point.lon));
    const center = leafletCenterForViewport(dataViewport(points), arc);
    const rendered = unwrapGISGeoJSONForArc(source, arc);

    expect(center[1]).toBeCloseTo(180, 8);
    expect(rendered.features[0].geometry.coordinates[0][0]).toBeCloseTo(179, 8);
    expect(rendered.features[0].geometry.coordinates[1][0]).toBeCloseTo(181, 8);
    expect(source.features[0].geometry.coordinates[1][0]).toBe(-179);
  });

  it('selects points inside a narrow antimeridian polygon instead of its planar complement', () => {
    const { selectPointsInFeature } = load().testing;
    const feature = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [[[170, -10], [-170, -10], [-170, 10], [170, 10], [170, -10]]],
      },
    };
    const records = [
      { name: 'East dateline', lat: 0, lon: 179 },
      { name: 'West dateline', lat: 0, lon: -179 },
      { name: 'Greenwich', lat: 0, lon: 0 },
    ];

    expect(selectPointsInFeature(records, feature)).toEqual([0, 1]);
  });
  it('keeps nearby dateline points close relative to a north-south span in the schematic', () => {
    const { schematicProjection } = load().testing;
    const projection = schematicProjection([
      { lat: -60, lon: 179 },
      { lat: -60, lon: -179 },
      { lat: -10, lon: 180 },
    ], 700, 700, 50);

    const southwest = projection.project(179, -60);
    const southeast = projection.project(-179, -60);
    const north = projection.project(180, -10);
    const datelineWidth = Math.abs(southeast.x - southwest.x);
    const latitudeHeight = Math.abs(north.y - southwest.y);

    expect(north.y).toBeLessThan(southwest.y);
    expect(datelineWidth).toBeLessThan(latitudeHeight * 0.1);
  });
});

describe('GIS Studio - international CSV and join foundations', () => {
  beforeEach(() => resetStemLab());

  it.each([
    ['auto', {}],
    ['comma-dot', { delimiter: ',', decimalSeparator: '.' }],
    ['semicolon-comma', { delimiter: ';', decimalSeparator: ',' }],
    ['tab-dot', { delimiter: '\t', decimalSeparator: '.' }],
    ['tab-comma', { delimiter: '\t', decimalSeparator: ',' }],
    ['comma-comma', { delimiter: ',', decimalSeparator: ',' }],
    ['pipe-dot', { delimiter: '|', decimalSeparator: '.' }],
    ['pipe-comma', { delimiter: '|', decimalSeparator: ',' }],
  ])('maps the %s import convention to parser options', (convention, expected) => {
    const { gisImportParseOptions } = load().testing;
    expect(gisImportParseOptions(convention)).toEqual(expected);
  });

  it('uses tab plus decimal-comma options without re-detecting either convention', () => {
    const { gisImportParseOptions, parseCSV } = load().testing;
    const rows = parseCSV([
      'Ort\tBreitengrad\tL\u00e4ngengrad\tWert',
      'K\u00f6ln\t50,9375\t6,9603\t42,5',
    ].join('\n'), gisImportParseOptions('tab-comma'));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: 'K\u00f6ln' });
    expect(rows[0].lat).toBeCloseTo(50.9375, 8);
    expect(rows[0].lon).toBeCloseTo(6.9603, 8);
    expect(rows[0].value).toBeCloseTo(42.5, 8);
  });

  it('recognizes localized coordinate headers, including a German umlaut and Chinese aliases', () => {
    const { parseCSV } = load().testing;
    const german = parseCSV('Ort;Breitengrad;L\u00e4ngengrad;Wert\nM\u00fcnchen;48,1372;11,5756;91,5', { delimiter: ';', decimalSeparator: ',' });
    const chinese = parseCSV('name,\u7eac\u5ea6,\u7ecf\u5ea6,value\n\u4e0a\u6d77,31.2304,121.4737,88.5');
    expect(german[0]).toMatchObject({ name: 'M\u00fcnchen' });
    expect(german[0].lat).toBeCloseTo(48.1372, 8);
    expect(german[0].lon).toBeCloseTo(11.5756, 8);
    expect(chinese[0]).toMatchObject({ name: '\u4e0a\u6d77', lat: 31.2304, lon: 121.4737, value: 88.5 });
  });

  it('auto-detects semicolon CSV and decimal-comma coordinates and values', () => {
    const { parseCSV } = load().testing;
    const rows = parseCSV([
      'name;latitude;longitude;value',
      'Buenos Aires;-34,6037;-58,3816;12,5',
      'Dakar, Senegal;14,7167;-17,4677;7,25',
    ].join('\n'));

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ name: 'Buenos Aires' });
    expect(rows[0].lat).toBeCloseTo(-34.6037, 8);
    expect(rows[0].lon).toBeCloseTo(-58.3816, 8);
    expect(rows[0].value).toBeCloseTo(12.5, 8);
    expect(rows[1].name).toBe('Dakar, Senegal');
    expect(rows[1].lat).toBeCloseTo(14.7167, 8);
  });

  it('auto-detects tab-delimited coordinate data', () => {
    const { parseCSV } = load().testing;
    const rows = parseCSV([
      'name\tlatitude\tlongitude\tvalue',
      'Cape Town\t-33.9249\t18.4241\t9.75',
    ].join('\n'));

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: 'Cape Town', lat: -33.9249, lon: 18.4241, value: 9.75 });
  });

  it('honors explicit delimiter and decimal-separator options instead of silently re-detecting', () => {
    const { parseCSV, gisImportParseOptions } = load().testing;
    const commaDelimited = [
      'name,latitude,longitude,value',
      '"Buenos Aires","-34,6037","-58,3816","12,5"',
    ].join('\n');
    const parsed = parseCSV(commaDelimited, gisImportParseOptions('comma-comma'));

    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({ name: 'Buenos Aires' });
    expect(parsed[0].lat).toBeCloseTo(-34.6037, 8);
    expect(parsed[0].lon).toBeCloseTo(-58.3816, 8);
    expect(parsed[0].value).toBeCloseTo(12.5, 8);

    const semicolonDelimited = 'name;latitude;longitude;value\nSuva;-18,1416;178,4419;4,5';
    expect(() => parseCSV(semicolonDelimited, { delimiter: ',', decimalSeparator: ',' }))
      .toThrow(/column|delimiter|header|required/i);
  });

  it('normalizes equivalent Unicode join keys without discarding non-ASCII letters or numbers', () => {
    const { normalizeJoinKey } = load().testing;
    const composed = normalizeJoinKey('  Qu\u00e9bec\u2014R\u00e9gion  ');
    const decomposed = normalizeJoinKey('Que\u0301bec - Re\u0301gion');

    expect(composed).toBe('qu\u00e9bec r\u00e9gion');
    expect(decomposed).toBe(composed);
    expect(normalizeJoinKey('S\u00e3o Tom\u00e9 & Pr\u00edncipe')).toBe('s\u00e3o tom\u00e9 and pr\u00edncipe');
    expect(normalizeJoinKey('\u6771\u4eac \u0662 / \u0645\u0646\u0637\u0642\u0629 \u0663')).toBe('\u6771\u4eac \u0662 \u0645\u0646\u0637\u0642\u0629 \u0663');
  });
});


describe('GIS Studio - guided column mapping and CRS reprojection', () => {
  beforeEach(() => resetStemLab());

  it('parses DMS coordinates with hemisphere markers and either axis order', () => {
    const { transformGISCoordinatePair } = load().testing;
    const latitudeFirst = transformGISCoordinatePair('43\u00B039\'36"N', '70\u00B015\'36"W', {
      crs: 'EPSG:4326',
      axisOrder: 'lat-lon',
    });
    const longitudeFirst = transformGISCoordinatePair('70\u00B015\'36"W', '43\u00B039\'36"N', {
      crs: 'WGS84',
      axisOrder: 'lon-lat',
    });

    expect(latitudeFirst.lat).toBeCloseTo(43.66, 6);
    expect(latitudeFirst.lon).toBeCloseTo(-70.26, 6);
    expect(longitudeFirst).toEqual(latitudeFirst);
  });

  it('reprojects EPSG:3857 coordinates into WGS84', () => {
    const { transformGISCoordinatePair } = load().testing;
    const coordinate = transformGISCoordinatePair(1113194.9079327357, 1118889.9748579594, {
      crs: 'EPSG:3857',
      axisOrder: 'x-y',
    });

    expect(coordinate.lat).toBeCloseTo(10, 6);
    expect(coordinate.lon).toBeCloseTo(10, 6);
  });

  it('reprojects northern and southern WGS84 UTM coordinates', () => {
    const { transformGISCoordinatePair, normalizeGISCRS } = load().testing;
    const eiffel = transformGISCoordinatePair(448251, 5411932, {
      crs: 'UTM',
      utmZone: 31,
      utmHemisphere: 'N',
    });
    const southernEquator = transformGISCoordinatePair(500000, 10000000, {
      crs: 'EPSG:32731',
    });

    expect(normalizeGISCRS('UTM', { utmZone: 31, utmHemisphere: 'N' })).toMatchObject({
      id: 'EPSG:32631',
      zone: 31,
      hemisphere: 'N',
    });
    expect(eiffel.lat).toBeCloseTo(48.8582, 3);
    expect(eiffel.lon).toBeCloseTo(2.2945, 3);
    expect(southernEquator.lat).toBeCloseTo(0, 6);
    expect(southernEquator.lon).toBeCloseTo(3, 6);
  });

  it('previews arbitrary headers and returns a reviewable fallback mapping', () => {
    const { inspectGISCSV } = load().testing;
    const preview = inspectGISCSV([
      'Site;First coordinate;Second coordinate;Reading',
      'Tower;448251;5411932;7,5',
      'Museum;452000;5410000;8,25',
    ].join('\n'), {
      delimiter: ';',
      decimalSeparator: ',',
      crs: 'UTM',
      utmZone: 31,
      utmHemisphere: 'N',
    });

    expect(preview.headers).toEqual(['Site', 'First coordinate', 'Second coordinate', 'Reading']);
    expect(preview.totalRows).toBe(2);
    expect(preview.sampleRows).toHaveLength(2);
    expect(preview.suggestedColumns).toMatchObject({
      name: 0,
      coordinate1: 1,
      coordinate2: 2,
      value: 3,
      usedFallback: true,
    });
    expect(preview.crs).toBe('EPSG:32631');
  });

  it('maps explicitly selected UTM columns while keeping output rows WGS84', () => {
    const { parseCSV } = load().testing;
    const rows = parseCSV('Site,Easting,Northing,Reading\nEiffel Tower,448251,5411932,7.5', {
      crs: 'UTM',
      utmZone: 31,
      utmHemisphere: 'N',
      columns: { name: 0, coordinate1: 1, coordinate2: 2, value: 3 },
      axisOrder: 'x-y',
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Eiffel Tower');
    expect(rows[0].lat).toBeCloseTo(48.8582, 3);
    expect(rows[0].lon).toBeCloseTo(2.2945, 3);
    expect(rows[0].value).toBe(7.5);
    expect(rows.crs).toBe('EPSG:32631');
    expect(rows.columnMap).toMatchObject({ name: 0, coordinate1: 1, coordinate2: 2, value: 3 });
  });

  it('rejects unsupported CRS identifiers and out-of-range projected coordinates', () => {
    const { normalizeGISCRS, transformGISCoordinatePair } = load().testing;
    expect(() => normalizeGISCRS('EPSG:26919')).toThrow(/unsupported coordinate reference/i);
    expect(() => transformGISCoordinatePair(99999999, 0, { crs: 'EPSG:3857' })).toThrow(/world extent/i);
    expect(() => transformGISCoordinatePair(500000, 5000000, { crs: 'UTM', utmZone: 0 })).toThrow(/zone/i);
  });
});
describe('GIS Studio - declarative basemap provider lifecycle', () => {
  beforeEach(() => resetStemLab());

  it('uses the exact non-subdomain OpenStreetMap endpoint and fails closed for unknown providers', () => {
    const { basemapProviders, getGISBasemapProvider, createGISBasemapLayer } = load().testing;
    expect(basemapProviders.street.url).toBe('https://tile.openstreetmap.org/{z}/{x}/{y}.png');
    expect(basemapProviders.street.url).not.toContain('{s}');
    expect(basemapProviders.street.domains).toEqual(['tile.openstreetmap.org']);
    const tileLayer = vi.fn(function () { return { on: function () { return this; } }; });
    const leaflet = { tileLayer };
    expect(createGISBasemapLayer(leaflet, 'street')).toBeTruthy();
    expect(tileLayer).toHaveBeenCalledWith('https://tile.openstreetmap.org/{z}/{x}/{y}.png', expect.objectContaining({ maxZoom: 19, attribution: basemapProviders.street.attribution }));
    tileLayer.mockClear();
    expect(getGISBasemapProvider('learner-supplied-provider')).toBeNull();
    expect(getGISBasemapProvider('toString')).toBeNull();
    expect(createGISBasemapLayer(leaflet, 'learner-supplied-provider')).toBeNull();
    expect(tileLayer).not.toHaveBeenCalled();
  });

  it('reports only the first tileerror from a layer', () => {
    const { createGISBasemapLayer } = load().testing;
    const stub = makeBasemapLifecycleStub();
    const onTileError = vi.fn();
    const layer = createGISBasemapLayer(stub.api, 'street', onTileError);
    const attached = layer.onCalls.filter(function (call) { return call.name === 'tileerror'; });
    expect(attached).toHaveLength(1);
    layer.emit('tileerror', { tile: 1 });
    layer.emit('tileerror', { tile: 2 });
    expect(onTileError).toHaveBeenCalledTimes(1);
    expect(layer._gisHadTileError).toBe(true);
    expect(onTileError.mock.calls[0][1]).toBe(layer);
  });


  it('keeps a tile-error warning visible when a routine overlay refresh reuses the basemap', async () => {
    const stub = makeBasemapLifecycleStub();
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    const previousLeaflet = window.L;
    const previousActFlag = globalThis.IS_REACT_ACT_ENVIRONMENT;
    window.L = stub.api;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    try {
      const tool = load();
      function Harness() { return tool.render(makeCtx({ toolData: { gisBasemap: 'street' } })); }
      await React.act(async function () {
        root.render(React.createElement(Harness));
        await Promise.resolve();
        await Promise.resolve();
      });
      const layer = stub.layers[0];
      expect(layer).toBeTruthy();

      await React.act(async function () {
        layer.emit('tileerror', { tile: 1 });
        await Promise.resolve();
      });
      expect(host.textContent).toContain('Some online basemap tiles could not load.');

      const gridLabel = Array.from(host.querySelectorAll('label')).find(function (label) {
        return label.textContent.includes('Coordinate grid');
      });
      expect(gridLabel).toBeTruthy();
      await React.act(async function () {
        gridLabel.querySelector('input').click();
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(stub.layers).toHaveLength(1);
      expect(host.textContent).toContain('Some online basemap tiles could not load.');
      expect(host.textContent).not.toContain('Interactive base map ready.');
    } finally {
      if (host.isConnected) {
        try { await React.act(async function () { root.unmount(); }); } catch (ignoreUnmount) {}
        host.remove();
      }
      if (previousLeaflet === undefined) delete window.L; else window.L = previousLeaflet;
      if (previousActFlag === undefined) delete globalThis.IS_REACT_ACT_ENVIRONMENT; else globalThis.IS_REACT_ACT_ENVIRONMENT = previousActFlag;
    }
  });
  it('detaches tileerror with the exact callback registered for the rendered layer', async () => {
    const stub = makeBasemapLifecycleStub();
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    const previousLeaflet = window.L;
    const previousActFlag = globalThis.IS_REACT_ACT_ENVIRONMENT;
    window.L = stub.api;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    try {
      const tool = load();
      function Harness() { return tool.render(makeCtx({ toolData: { gisBasemap: 'street' } })); }
      await React.act(async function () { root.render(React.createElement(Harness)); await Promise.resolve(); await Promise.resolve(); });
      expect(stub.layers.length).toBeGreaterThan(0);
      const layer = stub.layers[0];
      const attached = layer.onCalls.find(function (call) { return call.name === 'tileerror'; });
      expect(attached).toBeTruthy();
      await React.act(async function () { root.unmount(); });
      const detached = layer.offCalls.find(function (call) { return call.name === 'tileerror'; });
      expect(detached).toBeTruthy();
      expect(detached.callback).toBe(attached.callback);
    } finally {
      if (host.isConnected) { try { await React.act(async function () { root.unmount(); }); } catch (ignoreUnmount) {} host.remove(); }
      if (previousLeaflet === undefined) delete window.L; else window.L = previousLeaflet;
      if (previousActFlag === undefined) delete globalThis.IS_REACT_ACT_ENVIRONMENT; else globalThis.IS_REACT_ACT_ENVIRONMENT = previousActFlag;
    }
  });
});
describe('GIS Studio - WGS84 coordinate validation', () => {
  beforeEach(() => resetStemLab());

  const pointCollection = (coordinates, extra = {}) => ({
    type: 'FeatureCollection',
    ...extra,
    features: [{
      type: 'Feature',
      properties: { score: 1 },
      geometry: { type: 'Point', coordinates },
    }],
  });

  it('accepts valid longitude-latitude coordinates in the southern hemisphere', () => {
    const { parseGeoJSON } = load().testing;
    const parsed = parseGeoJSON(JSON.stringify(pointCollection([178.4419, -18.1416])));

    expect(parsed.data.features[0].geometry.coordinates).toEqual([178.4419, -18.1416]);
  });

  it.each([
    [[181, -18], 'longitude outside the WGS84 range'],
    [[178, -91], 'latitude outside the WGS84 range'],
    [['178', -18], 'a non-numeric coordinate'],
    [[6490000, -4110000], 'projected coordinates passed as longitude-latitude'],
  ])('rejects %s (%s)', (coordinates) => {
    const { parseGeoJSON } = load().testing;

    expect(() => parseGeoJSON(JSON.stringify(pointCollection(coordinates))))
      .toThrow(/coordinate|longitude|latitude|number|range|WGS\s?84/i);
  });

  it('rejects a legacy projected CRS instead of plotting its coordinates as WGS84 degrees', () => {
    const { parseGeoJSON } = load().testing;
    const projected = pointCollection([100, 40], {
      crs: { type: 'name', properties: { name: 'EPSG:3857' } },
    });

    expect(() => parseGeoJSON(JSON.stringify(projected)))
      .toThrow(/CRS|coordinate reference|EPSG|projected|WGS\s?84/i);
  });
});
