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

  it('falls back to the Maine sample when a saved pack id no longer exists', () => {
    loadTool(TOOL, 'gisStudio');
    const html = renderTool('gisStudio', { gisRegionPack: 'custom-vanished' });
    expect(html).toContain('Maine counties (16)');
    expect(html).toContain('Coastal guide');
  });
});
