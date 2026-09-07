// GIS Studio custom region packs: any geography can be loaded as a pack (JSON
// or CSV), used exactly like the built-in samples, saved in the project file,
// and restored. These tests pin the pack contract and the UI that exposes it.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const TOOL = 'stem_lab/stem_tool_gisstudio.js';

function samplePack(overrides) {
  return Object.assign({
    label: 'Otago towns',
    scope: 'Otago region, New Zealand',
    metrics: [{ id: 'population', label: 'Population', unit: 'people' }, { label: 'Elevation (m)' }],
    records: [
      { name: 'Dunedin', latitude: -45.87, longitude: 170.50, population: 130000, 'Elevation (m)': 5 },
      { name: 'Queenstown', lat: -45.03, lng: 168.66, population: 16000, 'Elevation (m)': 310 },
      { name: 'Oamaru', lat: -45.10, lon: 170.97, population: 14000, 'Elevation (m)': 20 }
    ]
  }, overrides || {});
}

describe('GIS Studio - custom region packs', () => {
  beforeEach(() => resetStemLab());

  it('normalizes a JSON pack into the same contract the built-in packs use', () => {
    const tool = loadTool(TOOL, 'gisStudio');
    const pack = tool.testing.normalizeGISRegionPack(samplePack());
    expect(pack.id).toBe('custom-otago-towns');
    expect(pack.custom).toBe(true);
    expect(pack.metrics.map((metric) => metric.id)).toEqual(['population', 'elevation']);
    expect(pack.metrics[1].label).toBe('Elevation');
    expect(pack.metrics[1].unit).toBe('m');
    expect(pack.records).toHaveLength(3);
    expect(pack.records[0]).toMatchObject({ name: 'Dunedin', lat: -45.87, lon: 170.5, population: 130000, elevation: 5 });
    expect(pack.records[1]).toMatchObject({ name: 'Queenstown', lon: 168.66 });
    expect(pack.defaultMetric).toBe('population');
    expect(pack.view.center[0]).toBeCloseTo(-45.45, 1);
    expect(pack.view.zoom).toBeGreaterThan(1);
    expect(pack.modules).toEqual({ missions: [], officialLayers: [], remoteScene: null });
    expect(pack.coverage.level).toBeTruthy();
    expect(pack.coverage.note).toBeTruthy();
    expect(tool.testing.regionMetric(pack, 'elevation').unit).toBe('m');
    expect(tool.testing.regionMetrics(pack)).toHaveLength(2);
  });

  it('refuses packs that would break the map rather than mapping garbage', () => {
    const tool = loadTool(TOOL, 'gisStudio');
    const normalize = tool.testing.normalizeGISRegionPack;
    expect(() => normalize(samplePack({ metrics: [] }))).toThrow(/at least one numeric attribute/);
    expect(() => normalize(samplePack({ records: [{ name: 'Nowhere', lat: 95, lon: 0, population: 1, 'Elevation (m)': 1 }] }))).toThrow(/latitude between -90 and 90/);
    expect(() => normalize(samplePack({ records: [{ name: 'Blank', lat: 1, lon: 1, population: 'lots', 'Elevation (m)': 1 }] }))).toThrow(/numeric value for Population/);
    expect(() => normalize(samplePack({ label: '' }))).toThrow(/needs a label/);
    expect(() => normalize(samplePack({ format: 'something-else' }))).toThrow(/not a GIS Studio region pack/);
    expect(() => normalize(samplePack({ format: tool.testing.regionPackFormat, version: 99 }))).toThrow(/newer/);
    const tooMany = Array.from({ length: 251 }, (_, index) => ({ name: 'P' + index, lat: 0, lon: index / 10, population: 1, 'Elevation (m)': 1 }));
    expect(() => normalize(samplePack({ records: tooMany }))).toThrow(/at most 250 records/);
    expect(() => normalize([])).toThrow(/JSON object/);
  });

  it('never lets a custom pack shadow a built-in pack or another custom pack', () => {
    const tool = loadTool(TOOL, 'gisStudio');
    const shadow = tool.testing.normalizeGISRegionPack(samplePack({ label: 'Maine' }));
    expect(shadow.id).toBe('custom-maine');
    const second = tool.testing.normalizeGISRegionPack(samplePack(), { existingIds: ['custom-otago-towns'] });
    expect(second.id).toBe('custom-otago-towns-2');
    const replaced = tool.testing.normalizeGISRegionPack(samplePack(), { existingIds: ['custom-otago-towns'], allowExistingId: true });
    expect(replaced.id).toBe('custom-otago-towns');
    expect(tool.testing.resolveRegionPack('custom-otago-towns', [replaced])).toBe(replaced);
    expect(tool.testing.resolveRegionPack('custom-otago-towns', []).id).toBe('maine');
    expect(tool.testing.resolveRegionPack('global', [replaced]).id).toBe('global');
  });

  it('turns a localized CSV with several attribute columns into a multi-metric pack', () => {
    const tool = loadTool(TOOL, 'gisStudio');
    const csv = [
      'Ort;Breitengrad;Längengrad;Einwohner;Höhe (m)',
      'Freiburg;47,99;7,85;230000;278',
      'Konstanz;47,66;9,17;85000;405',
      'Titisee;47°54\'N;8°09\'E;2000;858',
      'Kaputt;;9,00;10;1'
    ].join('\n');
    const result = tool.testing.regionPackFromCSV(csv, { fileName: 'Baden.csv' });
    expect(result.pack.label).toBe('Baden');
    expect(result.pack.metrics.map((metric) => [metric.id, metric.label, metric.unit])).toEqual([
      ['einwohner', 'Einwohner', ''],
      ['hohe', 'Höhe', 'm']
    ]);
    expect(result.pack.records).toHaveLength(3);
    expect(result.pack.records[0]).toMatchObject({ name: 'Freiburg', lat: 47.99, lon: 7.85, einwohner: 230000, hohe: 278 });
    expect(result.pack.records[2].lat).toBeCloseTo(47.9, 3);
    expect(result.rejectedRows).toBe(1);
    expect(result.rejected[0]).toMatchObject({ row: 5, name: 'Kaputt' });
    expect(result.pack.sourceNote).toContain('Baden.csv');
    expect(() => tool.testing.regionPackFromCSV('name,lat,lon\nA,1,2\n')).toThrow(/at least one numeric attribute column/);
    expect(() => tool.testing.regionPackFromCSV('name,value\nA,1\n')).toThrow(/latitude and longitude/);
  });

  it('keeps an already-mapped CSV as a reusable single-metric pack', () => {
    const tool = loadTool(TOOL, 'gisStudio');
    const rows = tool.testing.parseCSV('name,latitude,longitude,value\nA,10,20,5\nB,11,21,7\n');
    const pack = tool.testing.regionPackFromImportedRows(rows, { label: 'Field survey', metricLabel: 'Soil moisture', metricUnit: '%' });
    expect(pack.id).toBe('custom-field-survey');
    expect(pack.metrics).toHaveLength(1);
    expect(pack.metrics[0]).toMatchObject({ id: 'soil-moisture', label: 'Soil moisture', unit: '%' });
    expect(pack.records[1]).toMatchObject({ name: 'B', lat: 11, lon: 21, 'soil-moisture': 7 });
  });

  it('round-trips packs through the portable file format and validates the starter template', () => {
    const tool = loadTool(TOOL, 'gisStudio');
    const pack = tool.testing.normalizeGISRegionPack(samplePack());
    const file = tool.testing.serializeGISRegionPack(pack);
    expect(file.format).toBe('alloflow-gis-region-pack');
    expect(file.version).toBe(1);
    expect(file.records).toEqual(pack.records);
    const reloaded = tool.testing.normalizeGISRegionPack(JSON.parse(JSON.stringify(file)), { allowExistingId: true });
    expect(reloaded).toEqual(pack);
    const template = tool.testing.regionPackTemplate();
    expect(template.format).toBe('alloflow-gis-region-pack');
    expect(template.metrics.length).toBeGreaterThan(0);
    expect(tool.testing.normalizeGISRegionPack(template).records.length).toBe(3);
  });

  it('carries custom packs inside the project file and drops packs that no longer validate', () => {
    const tool = loadTool(TOOL, 'gisStudio');
    const pack = tool.testing.serializeGISRegionPack(samplePack());
    const project = tool.testing.createGISProject({
      settings: { regionPack: pack.id },
      data: { importedRows: [], customRegionPacks: [pack] }
    }, '2026-09-07T00:00:00.000Z');
    expect(tool.testing.validateGISProject(project)).toBe(project);
    const broken = tool.testing.createGISProject({ data: { customRegionPacks: [{ label: 'No records', metrics: [{ label: 'x' }], records: [] }] } });
    expect(() => tool.testing.validateGISProject(broken)).toThrow(/coordinate record/);
    const tooMany = tool.testing.createGISProject({ data: { customRegionPacks: Array.from({ length: 13 }, () => pack) } });
    expect(() => tool.testing.validateGISProject(tooMany)).toThrow(/more than 12/);
    const list = tool.testing.normalizeGISRegionPackList([pack, { label: 'bad' }, pack]);
    expect(list.map((item) => item.id)).toEqual([pack.id]);
  });

  it('offers loaded packs beside the built-in samples with their own attributes and coverage lens', () => {
    const tool = loadTool(TOOL, 'gisStudio');
    const pack = tool.testing.serializeGISRegionPack(samplePack({
      coverage: { level: 'Three Otago towns', represented: ['Dunedin', 'Queenstown', 'Oamaru'], gaps: ['Rural Otago'], note: 'Three towns are not a region.' }
    }));
    const html = renderTool('gisStudio', { gisCustomRegionPacks: [pack], gisRegionPack: pack.id });
    expect(html).toContain('Your region packs');
    expect(html).toContain('Built-in sample packs');
    expect(html).toContain('Otago towns');
    expect(html).toContain('<option value="population">Population</option>');
    expect(html).toContain('<option value="elevation">Elevation</option>');
    expect(html).toContain('Three Otago towns');
    expect(html).toContain('Rural Otago');
    expect(html).toContain('Dunedin');
    expect(html).not.toContain('Coastal guide');
    const plain = renderTool('gisStudio', {});
    expect(plain).not.toContain('Your region packs');
    expect(plain).toContain('Coastal guide');
  });

  it('renders the region pack loader on the Import tab and lists loaded packs with actions', () => {
    const tool = loadTool(TOOL, 'gisStudio');
    const pack = tool.testing.serializeGISRegionPack(samplePack());
    const html = renderTool('gisStudio', { gisTab: 'import', gisCustomRegionPacks: [pack], gisRegionPack: pack.id });
    expect(html).toContain('Load a different region');
    expect(html).toContain('Region pack file (.json or .csv)');
    expect(html).toContain('Save mapped CSV as a region pack');
    expect(html).toContain('Download a starter pack (JSON)');
    expect(html).toContain('Loaded region packs');
    expect(html).toContain('aria-label="Use: Otago towns"');
    expect(html).toContain('aria-label="Download: Otago towns"');
    expect(html).toContain('aria-label="Remove: Otago towns"');
    expect(html).toContain('3 places');
    expect(html).toContain('Population (people), Elevation (m)');
    expect(html).toContain('Active');
    const empty = renderTool('gisStudio', { gisTab: 'import' });
    expect(empty).toContain('No custom packs yet.');
  });

  it('shows the official Maine layer only for packs that declare it', () => {
    const tool = loadTool(TOOL, 'gisStudio');
    const pack = tool.testing.serializeGISRegionPack(samplePack());
    expect(renderTool('gisStudio', { gisTab: 'import' })).toContain('Load official Maine ecoregions');
    expect(renderTool('gisStudio', { gisTab: 'import', gisRegionPack: 'global' })).not.toContain('Load official Maine ecoregions');
    expect(renderTool('gisStudio', { gisTab: 'import', gisCustomRegionPacks: [pack], gisRegionPack: pack.id })).not.toContain('Load official Maine ecoregions');
  });

  it('generates pack-scoped inquiry missions from a custom pack instead of showing Maine prompts', () => {
    const tool = loadTool(TOOL, 'gisStudio');
    const pack = tool.testing.serializeGISRegionPack(samplePack());
    const html = renderTool('gisStudio', { gisTab: 'missions', gisCustomRegionPacks: [pack], gisRegionPack: pack.id });
    expect(html).toContain('OTAGO REGION, NEW ZEALAND INQUIRY SERIES');
    expect(html).toContain('Population and Elevation');
    expect(html).toContain('km service radius');
    expect(html).toContain('Highest and lowest Population');
    expect(html).not.toContain('This region pack does not include guided missions.');
    expect(html).not.toContain('MAINE INQUIRY SERIES');
    expect(html).toContain('Switch to the Maine sample missions');
  });

  it('builds generated missions from the metrics and extent of any pack', () => {
    const tool = loadTool(TOOL, 'gisStudio');
    const two = tool.testing.generateRegionMissions(tool.testing.normalizeGISRegionPack(samplePack()));
    expect(two.map((mission) => mission.id)).toEqual(['custom-otago-towns:compare', 'custom-otago-towns:buffer', 'custom-otago-towns:extremes']);
    expect(two[0]).toMatchObject({ kind: 'compare', workspace: 'compare', compareLeft: 'point:population', compareRight: 'point:elevation' });
    expect(two[1]).toMatchObject({ kind: 'buffer', workspace: 'map', metric: 'population', radiusKm: 50 });
    expect(two[2].evidencePrompt).toContain('(people)');
    expect(two.every((mission) => mission.steps.length === 4 && mission.practices.length && mission.teacherNote && mission.duration)).toBe(true);
    const one = tool.testing.generateRegionMissions(tool.testing.normalizeGISRegionPack(samplePack({ metrics: [{ id: 'population', label: 'Population' }] })));
    expect(one.map((mission) => mission.kind)).toEqual(['buffer', 'extremes']);
    const maine = tool.testing.regionPacks.find((item) => item.id === 'maine');
    expect(tool.testing.generateRegionMissions(maine)[1].radiusKm).toBe(100);
    expect(tool.testing.generateRegionMissions(null)).toEqual([]);
  });

  it('carries optional GeoJSON boundaries and generates a boundary mission from them', () => {
    const tool = loadTool(TOOL, 'gisStudio');
    const pack = tool.testing.normalizeGISRegionPack(samplePack({ boundaries: { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { name: 'Coastal Otago', index: 3 }, geometry: { type: 'Polygon', coordinates: [[[170.2, -46.2], [171.2, -46.2], [171.2, -45.0], [170.2, -45.0], [170.2, -46.2]]] } }] } }));
    expect(pack.boundaries.features).toHaveLength(1);
    expect(pack.boundaries.features[0].properties.name).toBe('Coastal Otago');
    const file = tool.testing.serializeGISRegionPack(pack);
    expect(file.boundaries.features).toHaveLength(1);
    expect(tool.testing.normalizeGISRegionPack(JSON.parse(JSON.stringify(file)), { allowExistingId: true })).toEqual(pack);
    const missions = tool.testing.generateRegionMissions(pack);
    expect(missions.map((mission) => mission.kind)).toEqual(['compare', 'buffer', 'extremes', 'boundaries']);
    expect(missions[3].question).toContain('1 boundary features in Otago region, New Zealand');
    expect(tool.testing.generateRegionMissions(tool.testing.normalizeGISRegionPack(samplePack())).map((mission) => mission.kind)).not.toContain('boundaries');
    expect(tool.testing.normalizeGISRegionPack(samplePack()).boundaries).toBeNull();
    expect(tool.testing.serializeGISRegionPack(samplePack())).not.toHaveProperty('boundaries');
    expect(() => tool.testing.normalizeGISRegionPack(samplePack({ boundaries: { type: 'FeatureCollection', features: [] } }))).toThrow(/at least one feature|No supported GeoJSON features/);
    expect(() => tool.testing.normalizeGISRegionPack(samplePack({ boundaries: { type: 'Nope' } }))).toThrow();
    const many = { type: 'FeatureCollection', features: Array.from({ length: 501 }, (_, i) => ({ type: 'Feature', properties: { index: i }, geometry: { type: 'Point', coordinates: [i / 10, 0] } })) };
    expect(() => tool.testing.normalizeGISRegionPack(samplePack({ boundaries: many }))).toThrow(/at most 500 features/);
    expect(tool.testing.regionPackTemplate().boundaries.features).toHaveLength(1);
    const rows = tool.testing.parseCSV('name,latitude,longitude,value\nA,-45.5,170.5,5\n');
    const withBounds = tool.testing.regionPackFromImportedRows(rows, { label: 'Survey', boundaries: { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { name: 'Coastal Otago', index: 3 }, geometry: { type: 'Polygon', coordinates: [[[170.2, -46.2], [171.2, -46.2], [171.2, -45.0], [170.2, -45.0], [170.2, -46.2]]] } }] } });
    expect(withBounds.boundaries.features).toHaveLength(1);
  });

  it('fills mission templates from pack variables and leaves unknown placeholders alone', () => {
    const tool = loadTool(TOOL, 'gisStudio');
    expect(tool.testing.gisFillTemplate('{a} and {b} in {scope}', { a: 'X', b: 'Y', scope: 'Z' })).toBe('X and Y in Z');
    expect(tool.testing.gisFillTemplate('{a} {missing}', { a: 1 })).toBe('1 {missing}');
    const html = renderTool('gisStudio', { gisTab: 'missions', gisRegionPack: 'global' }, {
      t: function (key, fallback) { return key === 'stem.gisstudio.gen.compare_title' ? '{b} contra {a}' : fallback; }
    });
    expect(html).toContain('Broadband access index contra Population density');
  });

  it('places a representative point inside each feature, including across the antimeridian', () => {
    const tool = loadTool(TOOL, 'gisStudio');
    const point = tool.testing.featureRepresentativePoint({ geometry: { type: 'Point', coordinates: [12, 34] } });
    expect(point).toMatchObject({ lat: 34, lon: 12 });

    const square = tool.testing.featureRepresentativePoint({
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] }
    });
    expect(square.lat).toBeCloseTo(5, 6);
    expect(square.lon).toBeCloseTo(5, 6);

    // An L-shaped polygon: its area centroid (2.2, 2.2) lies outside the shape,
    // so the representative point must fall back to a point on the surface.
    const shape = { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[0, 0], [6, 0], [6, 2], [2, 2], [2, 6], [0, 6], [0, 0]]] } };
    expect(tool.testing.pointInFeature({ lat: 2.2, lon: 2.2 }, shape)).toBe(false);
    const inside = tool.testing.featureRepresentativePoint(shape);
    expect(tool.testing.pointInFeature(inside, shape)).toBe(true);
    expect(tool.testing.interiorPointOnScanLine(shape, 1)).toMatchObject({ lat: 1, lon: 3 });
    expect(tool.testing.interiorPointOnScanLine(shape, 99)).toBeNull();

    // Straddling 180 degrees: the point belongs near the dateline, not near 0.
    const dateline = tool.testing.featureRepresentativePoint({
      geometry: { type: 'Polygon', coordinates: [[[179, -1], [-179, -1], [-179, 1], [179, 1], [179, -1]]] }
    });
    expect(Math.abs(dateline.lon)).toBeGreaterThan(179);
    expect(dateline.lat).toBeCloseTo(0, 6);

    // The larger part of a multipolygon wins.
    const multi = tool.testing.featureRepresentativePoint({
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
          [[[40, 40], [50, 40], [50, 50], [40, 50], [40, 40]]]
        ]
      }
    });
    expect(multi.lat).toBeCloseTo(45, 6);
    expect(multi.lon).toBeCloseTo(45, 6);

    const line = tool.testing.featureRepresentativePoint({ geometry: { type: 'LineString', coordinates: [[0, 0], [4, 8]] } });
    expect(line).toMatchObject({ lat: 4, lon: 2 });
    expect(tool.testing.featureRepresentativePoint({ geometry: { type: 'Polygon', coordinates: [] } })).toBeNull();
    expect(tool.testing.featureRepresentativePoint(null)).toBeNull();
  });

  it('derives a pack from a boundary layer and keeps the boundaries as the polygon layer', () => {
    const tool = loadTool(TOOL, 'gisStudio');
    const layer = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', properties: { NAME: 'North ward', residents: 4200, parks: 3 }, geometry: { type: 'Polygon', coordinates: [[[0, 10], [10, 10], [10, 20], [0, 20], [0, 10]]] } },
        { type: 'Feature', properties: { NAME: 'South ward', residents: 1800, parks: 7 }, geometry: { type: 'Polygon', coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] } }
      ]
    };
    const result = tool.testing.regionPackFromGeoJSON(layer, { fileName: 'Wards.geojson' });
    expect(result.derivedFrom).toBe('boundaries');
    expect(result.pack.label).toBe('Wards');
    expect(result.pack.records.map((record) => record.name)).toEqual(['North ward', 'South ward']);
    expect(result.pack.records[0]).toMatchObject({ lat: 15, lon: 5, residents: 4200, parks: 3 });
    expect(result.pack.metrics.map((metric) => metric.id)).toEqual(['residents', 'parks']);
    expect(result.pack.boundaries.features).toHaveLength(2);
    expect(result.pack.sourceNote).toContain('Wards.geojson');
    // Boundaries in the pack mean the generated missions include the boundary investigation.
    expect(tool.testing.generateRegionMissions(result.pack).map((mission) => mission.kind)).toContain('boundaries');
  });

  it('names, de-duplicates, and rejects features honestly when deriving a pack', () => {
    const tool = loadTool(TOOL, 'gisStudio');
    const layer = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', properties: { admin: 'Ward', population: 10 }, geometry: { type: 'Point', coordinates: [1, 1] } },
        { type: 'Feature', properties: { admin: 'Ward', population: 20 }, geometry: { type: 'Point', coordinates: [2, 2] } },
        { type: 'Feature', properties: { population: 30 }, geometry: { type: 'Point', coordinates: [3, 3] } },
        { type: 'Feature', properties: { admin: 'No value', population: '' }, geometry: { type: 'Point', coordinates: [4, 4] } }
      ]
    };
    const result = tool.testing.regionPackFromGeoJSON(layer, { label: 'Wards' });
    expect(result.derivedFrom).toBe('points');
    expect(result.pack.boundaries).toBeNull();
    expect(result.pack.records.map((record) => record.name)).toEqual(['Ward', 'Ward (2)', 'Feature 3']);
    expect(result.rejectedRows).toBe(1);
    expect(result.rejected[0]).toMatchObject({ row: 4, name: 'No value' });
    expect(() => tool.testing.regionPackFromGeoJSON({
      type: 'FeatureCollection',
      features: [{ type: 'Feature', properties: { name: 'Only text' }, geometry: { type: 'Point', coordinates: [0, 0] } }]
    })).toThrow(/at least one numeric property/);
  });

  it('flags the built-in time series as a different region without discarding it', () => {
    const tool = loadTool(TOOL, 'gisStudio');
    const pack = tool.testing.serializeGISRegionPack(samplePack());
    const maine = renderTool('gisStudio', { gisTab: 'timeline' });
    expect(maine).not.toContain('Different region:');

    const custom = renderTool('gisStudio', { gisTab: 'timeline', gisCustomRegionPacks: [pack], gisRegionPack: pack.id });
    expect(custom).toContain('Different region:');
    expect(custom).toContain('It does not describe Otago towns.');
    // The Maine series still runs; it is labelled, not hidden.
    expect(custom).toContain('Time-Series Change Lab');
    expect(custom).toContain('Cumberland');

    const global = renderTool('gisStudio', { gisTab: 'timeline', gisRegionPack: 'global' });
    expect(global).toContain('It does not describe Global regions (classroom sample).');
  });

  it('screens a custom pack for precise coordinates and identifier-like names', () => {
    const tool = loadTool(TOOL, 'gisStudio');
    const risky = tool.testing.serializeGISRegionPack({
      label: 'Class survey',
      metrics: [{ id: 'reading', label: 'Reading' }],
      records: [
        { name: "Student A home", lat: 43.658291, lon: -70.256114, reading: 12 },
        { name: 'Park', lat: 43.66, lon: -70.26, reading: 8 }
      ]
    });
    const report = tool.testing.assessRegionPackPrivacy(risky);
    expect(report.highPrecision).toBe(1);
    expect(report.identifierWarnings).toBe(1);
    expect(report.highPrecisionNames).toContain('Student A home');

    const safe = tool.testing.assessRegionPackPrivacy(tool.testing.serializeGISRegionPack(samplePack()));
    expect(safe.highPrecision).toBe(0);
    expect(safe.identifierWarnings).toBe(0);
    expect(tool.testing.assessRegionPackPrivacy(null).total).toBe(0);
  });

  it('warns about a risky pack in the preview, before anything is mapped', () => {
    const tool = loadTool(TOOL, 'gisStudio');
    const rounded = tool.testing.roundRegionPackCoordinates(tool.testing.serializeGISRegionPack({
      label: 'Class survey',
      metrics: [{ id: 'reading', label: 'Reading' }],
      records: [{ name: 'Student A home', lat: 43.658291, lon: -70.256114, reading: 12 }]
    }), 2);
    expect(rounded.records[0].lat).toBe(43.66);
    expect(rounded.records[0].lon).toBe(-70.26);
    expect(rounded.records[0].name).toBe('Student A home');
    expect(tool.testing.assessRegionPackPrivacy(rounded).highPrecision).toBe(0);
  });

  it('counts a mapped custom pack in the privacy check and the quality review', () => {
    const tool = loadTool(TOOL, 'gisStudio');
    const risky = tool.testing.serializeGISRegionPack({
      label: 'Class survey',
      metrics: [{ id: 'reading', label: 'Reading' }],
      records: [
        { name: 'Student A home', lat: 43.658291, lon: -70.256114, reading: 12 },
        { name: 'Student B home', lat: 43.712345, lon: -70.301234, reading: 9 }
      ]
    });
    const html = renderTool('gisStudio', { gisCustomRegionPacks: [risky], gisRegionPack: risky.id });
    expect(html).toContain('Privacy check before sharing.');
    expect(html).toContain('Student A home');

    const review = renderTool('gisStudio', { gisTab: 'quality', gisCustomRegionPacks: [risky], gisRegionPack: risky.id });
    expect(review).toContain('2 high-precision rows and 2 identifier-like labels need review.');
    expect(review).toContain('Round or aggregate sensitive locations');

    // A built-in sample pack must not raise a false alarm.
    const clean = renderTool('gisStudio', {});
    expect(clean).not.toContain('Privacy check before sharing.');
  });

  it('shares one boundary budget across the whole pack library', () => {
    const tool = loadTool(TOOL, 'gisStudio');
    function packWithBoundary(name, ringCount) {
      const features = Array.from({ length: ringCount }, (_, i) => ({
        type: 'Feature',
        properties: { name: name + ' ' + i, index: i },
        geometry: { type: 'Polygon', coordinates: [[[i / 100, 0], [i / 100 + 0.01, 0], [i / 100 + 0.01, 0.01], [i / 100, 0.01], [i / 100, 0]]] }
      }));
      return tool.testing.normalizeGISRegionPack(samplePack({
        label: name,
        boundaries: { type: 'FeatureCollection', features }
      }), { allowExistingId: true });
    }
    const small = packWithBoundary('Small', 1);
    const large = packWithBoundary('Large', 400);
    expect(tool.testing.regionPackBoundaryBytes(small)).toBeGreaterThan(0);
    expect(tool.testing.regionPackBoundaryBytes(tool.testing.normalizeGISRegionPack(samplePack()))).toBe(0);
    expect(tool.testing.totalRegionPackBoundaryBytes([small, large]))
      .toBe(tool.testing.regionPackBoundaryBytes(small) + tool.testing.regionPackBoundaryBytes(large));

    const fits = tool.testing.regionPackBoundaryBudget([small], large);
    expect(fits.withinBudget).toBe(true);
    expect(fits.total).toBe(fits.used + fits.incoming);

    // Re-loading the same pack replaces it rather than double-counting.
    const replacing = tool.testing.regionPackBoundaryBudget([large], large);
    expect(replacing.used).toBe(0);
    expect(replacing.incoming).toBe(tool.testing.regionPackBoundaryBytes(large));

    // A library already at the budget refuses more boundaries.
    const huge = { id: 'custom-huge', boundaries: { filler: 'x'.repeat(3999000) } };
    const overBudget = tool.testing.regionPackBoundaryBudget([huge], large);
    expect(overBudget.withinBudget).toBe(false);
    expect(overBudget.budget).toBe(4000000);
  });

  it('degrades the recovery draft in steps instead of losing it', () => {
    const tool = loadTool(TOOL, 'gisStudio');
    const pack = tool.testing.serializeGISRegionPack(samplePack({
      boundaries: { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { name: 'Ward', index: 1 }, geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] } }] }
    }));
    const project = tool.testing.createGISProject({
      title: 'Otago study',
      data: { importedRows: [], customRegionPacks: [pack], geoData: null }
    }, '2026-09-07T00:00:00.000Z');

    function storageThatAccepts(limit) {
      return {
        written: null,
        setItem: function (key, value) {
          if (value.length > limit) { const error = new Error('QuotaExceededError'); error.name = 'QuotaExceededError'; throw error; }
          this.written = value;
        },
        removeItem: function () { this.written = null; }
      };
    }

    const roomy = storageThatAccepts(Infinity);
    expect(tool.testing.writeGISDraft(roomy, 'k', project)).toEqual({ level: 'full', saved: true });
    expect(JSON.parse(roomy.written).data.customRegionPacks[0].boundaries.features).toHaveLength(1);

    const full = JSON.stringify(project).length;
    const withoutBoundaries = JSON.stringify(tool.testing.gisDraftWithoutPackBoundaries(project)).length;
    const withoutPacks = JSON.stringify(tool.testing.gisDraftWithoutPacks(project)).length;
    expect(withoutBoundaries).toBeLessThan(full);
    expect(withoutPacks).toBeLessThan(withoutBoundaries);

    const tight = storageThatAccepts(full - 1);
    expect(tight.written).toBeNull();
    expect(tool.testing.writeGISDraft(tight, 'k', project)).toEqual({ level: 'no-pack-boundaries', saved: true });
    const trimmed = JSON.parse(tight.written);
    expect(trimmed.data.customRegionPacks[0]).not.toHaveProperty('boundaries');
    expect(trimmed.data.customRegionPacks[0].records).toHaveLength(3);
    expect(trimmed.data.packBoundariesOmitted).toBe(true);
    // A trimmed draft must still restore.
    expect(tool.testing.validateGISProject(trimmed)).toBe(trimmed);

    const tighter = storageThatAccepts(withoutBoundaries - 1);
    expect(tool.testing.writeGISDraft(tighter, 'k', project)).toEqual({ level: 'no-packs', saved: true });
    expect(JSON.parse(tighter.written).data.packsOmitted).toBe(true);
    expect(JSON.parse(tighter.written).data).not.toHaveProperty('customRegionPacks');

    const hopeless = storageThatAccepts(10);
    hopeless.written = 'stale draft';
    expect(tool.testing.writeGISDraft(hopeless, 'k', project)).toEqual({ level: 'none', saved: false });
    expect(hopeless.written).toBeNull();

    // Without packs there is nothing to trim, so a failure stays a failure.
    const plain = tool.testing.createGISProject({ data: { importedRows: [] } });
    expect(tool.testing.writeGISDraft(storageThatAccepts(5), 'k', plain)).toEqual({ level: 'none', saved: false });
  });

  it('keeps interactive controls out of the labels that name other controls', () => {
    loadTool(TOOL, 'gisStudio');
    const tabs = ['map', 'import', 'compare', 'missions', 'timeline', 'project', 'composer', 'remote', 'story', 'quality', 'planner', 'review', 'packet', 'projection'];
    const offenders = [];
    for (const tab of tabs) {
      const host = document.createElement('div');
      host.innerHTML = renderTool('gisStudio', { gisTab: tab, gisBasemap: 'none' });
      host.querySelectorAll('label').forEach((label) => {
        // A button or a second control inside a label lands in the accessible
        // name of the control the label names, and clicking it activates that
        // control too.
        if (label.querySelector('button')) offenders.push(tab + ': button inside "' + label.textContent.trim().slice(0, 60) + '"');
        if (label.querySelectorAll('input, select, textarea').length > 1) {
          offenders.push(tab + ': several controls inside "' + label.textContent.trim().slice(0, 60) + '"');
        }
      });
    }
    expect(offenders).toEqual([]);
  });

  it('names the region selector with its own label, not with the notes beside it', () => {
    const tool = loadTool(TOOL, 'gisStudio');
    const pack = tool.testing.serializeGISRegionPack(samplePack());
    const host = document.createElement('div');
    host.innerHTML = renderTool('gisStudio', { gisBasemap: 'none', gisCustomRegionPacks: [pack], gisRegionPack: pack.id });

    const select = host.querySelector('select[aria-describedby="gis-region-pack-note"]');
    expect(select).toBeTruthy();
    const label = select.closest('label');
    expect(label).toBeTruthy();
    expect(label.textContent).toContain('Sample region pack');
    expect(label.textContent).not.toContain('Load a different region');
    expect(label.querySelector('#gis-region-pack-note')).toBeNull();

    // The description is still reachable as a description, and the quick link
    // is still on the page, just no longer inside the label.
    const note = host.querySelector('#gis-region-pack-note');
    expect(note).toBeTruthy();
    expect(note.textContent).toContain(samplePack().scope);
    expect(Array.from(host.querySelectorAll('button')).some((button) => button.textContent.includes('Load a different region'))).toBe(true);
  });

  it('scales the map graticule to the region instead of a fixed 2-degree grid', () => {
    const tool = loadTool(TOOL, 'gisStudio');
    function viewportFor(points) {
      return tool.testing.dataViewport(points.map(([lat, lon]) => ({ lat, lon })), { center: [0, 0], zoom: 2 });
    }

    // A city-sized region: a 2-degree grid would draw nothing usable here.
    const city = tool.testing.graticuleForViewport(viewportFor([[43.65, -70.27], [43.68, -70.24], [43.66, -70.30]]));
    expect(city.latStep).toBeLessThanOrEqual(0.1);
    expect(city.lats.length).toBeGreaterThanOrEqual(2);
    expect(city.lons.length).toBeGreaterThanOrEqual(2);
    expect(Math.min(...city.lats)).toBeGreaterThan(43.5);
    expect(Math.max(...city.lats)).toBeLessThan(43.8);

    // A whole-country region gets a coarse grid, not hundreds of lines.
    const country = tool.testing.graticuleForViewport(viewportFor([[25, -125], [49, -67]]));
    expect(country.latStep).toBeGreaterThanOrEqual(5);
    expect(country.lats.length).toBeLessThanOrEqual(8);
    expect(country.lons.length).toBeLessThanOrEqual(8);

    // Both grids are one derivation, so the live map and the offline schematic agree.
    const bounds = { minLat: country.south, maxLat: country.north, minLon: country.west, maxLon: country.east };
    expect(tool.testing.graticuleLines(bounds).lats).toEqual(country.lats);
    expect(tool.testing.graticuleLines(bounds).lons).toEqual(country.lons);

    // The grid covers the data rather than a fixed patch around the centre.
    expect(country.south).toBeLessThanOrEqual(25);
    expect(country.north).toBeGreaterThanOrEqual(49);
    expect(country.west).toBeLessThanOrEqual(-125);
    expect(country.east).toBeGreaterThanOrEqual(-67);

    // A single place still gets a readable grid instead of an empty one.
    const single = tool.testing.graticuleForViewport(viewportFor([[-45.87, 170.5]]));
    expect(single.lats.length).toBeGreaterThan(0);
    expect(single.lons.length).toBeGreaterThan(0);

    // Latitudes stay inside what a web map can draw.
    const polar = tool.testing.graticuleForViewport(viewportFor([[-89, 0], [89, 10]]));
    expect(polar.south).toBeGreaterThanOrEqual(-85);
    expect(polar.north).toBeLessThanOrEqual(85);

    expect(tool.testing.graticuleForViewport(null)).toMatchObject({ lats: [], lons: [] });
  });

  it('follows the data across the antimeridian and labels lines by hemisphere', () => {
    const tool = loadTool(TOOL, 'gisStudio');
    const points = [{ lat: -16, lon: 179.2 }, { lat: -18, lon: -179.5 }];
    const viewport = tool.testing.dataViewport(points, { center: [0, 0], zoom: 2 });
    const arc = tool.testing.minimalLongitudeArc(points.map((point) => point.lon));
    const graticule = tool.testing.graticuleForViewport(viewport, arc);
    // The span is about 1.3 degrees across the dateline, not the 359 you get by
    // reading the raw minimum and maximum longitude.
    expect(graticule.east - graticule.west).toBeLessThan(3);
    expect(graticule.lons.length).toBeGreaterThan(0);

    expect(tool.testing.graticuleLabel(43.66, 'N', 'S')).toBe('43.66° N');
    expect(tool.testing.graticuleLabel(-70.2, 'E', 'W')).toBe('70.2° W');
    expect(tool.testing.graticuleLabel(0, 'N', 'S')).toBe('0°');
    expect(tool.testing.graticuleLabel(NaN, 'N', 'S')).toBe('');
    // At a fine step the label keeps enough decimals to tell two lines apart.
    expect(tool.testing.graticuleLabel(43.65, 'N', 'S', 0.05)).toBe('43.65° N');
    expect(tool.testing.graticuleLabel(43.7, 'N', 'S', 0.05)).toBe('43.7° N');
    expect(tool.testing.graticuleLabel(45, 'N', 'S', 5)).toBe('45° N');
    expect(tool.testing.graticuleDecimals(0.05)).toBe(2);
    expect(tool.testing.graticuleDecimals(0.25)).toBe(2);
    expect(tool.testing.graticuleDecimals(1)).toBe(0);
    expect(tool.testing.graticuleDecimals(30)).toBe(0);
    expect(tool.testing.graticuleDecimals(0)).toBe(2);
  });

  it('falls back to the Maine sample when a saved pack id no longer exists', () => {
    loadTool(TOOL, 'gisStudio');
    const html = renderTool('gisStudio', { gisRegionPack: 'custom-vanished' });
    expect(html).toContain('Maine counties (16)');
    expect(html).toContain('Coastal guide');
  });
});
