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

  it('reports invalid and capped coordinate CSV rows without changing the row contract', () => {
    const tool = loadTool('stem_lab/stem_tool_gisstudio.js', 'gisStudio');
    const csv = [
      'name,latitude,longitude,value',
      'Good,44,-69,10',
      'Bad,200,-69,11',
      ...Array.from({ length: 251 }, (_, index) => 'Valid ' + index + ',44,-69,' + index)
    ].join('\n');
    const parsed = tool.testing.parseCSV(csv);
    expect(parsed).toHaveLength(250);
    expect(parsed.invalidRows).toBe(1);
    expect(parsed.truncatedRows).toBe(2);
    expect(parsed.invalidSamples[0]).toMatchObject({ row: 3, name: 'Bad', latitude: '200', longitude: '-69', value: '11' });
  });

  it('quotes portable CSV exports without changing values', () => {
    const tool = loadTool('stem_lab/stem_tool_gisstudio.js', 'gisStudio');
    expect(tool.testing.rowsToCSV([['Name', 'Value'], ['A, "quoted"', 1]])).toBe('Name,Value\r\n"A, ""quoted""",1\r\n');
    expect(tool.testing.safeFileStem('Maine / Access Study!', 'gis')).toBe('maine-access-study');
  });
  it('keeps live map surfaces responsive and covered while they initialize', () => {
    loadTool('stem_lab/stem_tool_gisstudio.js', 'gisStudio');
    const mapHtml = renderTool('gisStudio', {});
    const compareHtml = renderTool('gisStudio', { gisTab: 'compare' });
    expect(mapHtml).toContain('Preparing interactive map');
    expect(mapHtml).toContain('aria-busy="true"');
    expect(compareHtml).toContain('Synchronized comparison maps');
    expect(compareHtml).toContain('min(330px,100%)');
    expect(compareHtml).toContain('Retry loading');
    const timelineHtml = renderTool('gisStudio', { gisTab: 'timeline' });
    expect(timelineHtml).toContain('Retry loading');
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
    for (const text of ['Start a first investigation', 'Build evidence packet', 'Layer workspace', 'Visible layers', 'Spatial pattern coach', 'Spatial analysis workbench', 'Spatial analysis results', 'Accessible data-table twin', 'Sonify values', 'Project', 'Maine missions', 'Change over time', 'Compare + export', 'Import data', 'Projection lab', 'Satellite imagery']) {
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
    expect(html).toContain('Download import review');
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

  it('creates and validates versioned GIS project documents', () => {
    const tool = loadTool('stem_lab/stem_tool_gisstudio.js', 'gisStudio');
    const project = tool.testing.createGISProject({
      title: 'Watershed study',
      provenance: { source: 'Maine agency', units: 'percent' },
      data: { importedRows: [{ name: 'A', lat: 44, lon: -69, value: 12 }], geoData: null, timeDataset: { rows: [] } }
    }, '2026-07-25T00:00:00.000Z');
    expect(tool.testing.validateGISProject(project)).toBe(project);
    expect(project.format).toBe('alloflow-gis-studio-project');
    expect(project.version).toBe(1);
    expect(project.provenance.source).toBe('Maine agency');
    expect(() => tool.testing.validateGISProject({ format: 'wrong', version: 1 })).toThrow(/not a GIS Studio/);
    expect(() => tool.testing.validateGISProject({ ...project, version: 2 })).toThrow(/newer/);
  });

  it('flags precise or identifier-like coordinates and rounds immutably', () => {
    const tool = loadTool('stem_lab/stem_tool_gisstudio.js', 'gisStudio');
    const rows = [{ name: 'Student home', lat: 44.12345, lon: -69.98765, value: 1 }];
    const assessment = tool.testing.assessCoordinatePrivacy(rows, []);
    expect(assessment.highPrecision).toBe(1);
    expect(assessment.identifierWarnings).toBe(1);
    const rounded = tool.testing.roundPointCoordinates(rows, 3);
    expect(rounded[0].lat).toBe(44.123);
    expect(rounded[0].lon).toBe(-69.988);
    expect(rows[0].lat).toBe(44.12345);
  });

  it('renders project save, recovery, provenance, and privacy controls', () => {
    loadTool('stem_lab/stem_tool_gisstudio.js', 'gisStudio');
    const html = renderTool('gisStudio', { gisTab: 'project' });
    for (const text of ['Save, reopen, and recover projects', 'Download project file', 'Download mapped CSV', 'Download GeoJSON layer', 'Open GIS Studio project', 'Data provenance manifest', 'Project inventory', 'Recorded transformations', 'Coordinate privacy review', 'Round imported + timeline points', 'Before sharing']) {
      expect(html).toContain(text);
    }
    expect(html).toContain('type="file"');
  });

  it('audits map composition and generates a data-aware description', () => {
    const tool = loadTool('stem_lab/stem_tool_gisstudio.js', 'gisStudio');
    const incomplete = tool.testing.auditMapComposition({ title: '', rows: [] });
    expect(incomplete.errors).toBeGreaterThan(0);
    expect(incomplete.warnings).toBeGreaterThan(0);
    const model = {
      title: 'Maine access',
      claim: 'Access is highest near the mapped service centers.',
      altText: 'A detailed description of the mapped access pattern across three Maine locations.',
      unit: 'index',
      source: 'Classroom dataset',
      showLegend: true,
      rows: [
        { name: 'Augusta', lat: 44.31, lon: -69.78, value: 82 },
        { name: 'Rangeley', lat: 44.97, lon: -70.64, value: 41 }
      ]
    };
    const ready = tool.testing.auditMapComposition(model);
    expect(ready.errors).toBe(0);
    expect(tool.testing.suggestMapAltText(model)).toContain('Augusta');
    expect(tool.testing.suggestMapAltText(model)).toContain('Rangeley');
  });

  it('builds an escaped accessible map package with annotations and provenance', () => {
    const tool = loadTool('stem_lab/stem_tool_gisstudio.js', 'gisStudio');
    const report = tool.testing.buildMapComposerReport({
      title: 'Watershed <script>alert(1)</script>',
      subtitle: 'Evidence map',
      claim: 'Values cluster near the coast.',
      altText: 'A schematic coordinate map showing two watershed monitoring locations and their measured values.',
      unit: 'percent',
      legendTitle: 'Water quality',
      showLegend: true,
      source: 'Maine agency',
      provenance: { source: 'Maine agency', method: 'Annual monitoring', limitations: 'Learning sample' },
      classification: 'quantile',
      generated: '2026-07-28',
      annotations: [{ id: 'a1', label: 'Coastal cluster', lat: 44.1, lon: -69.1 }],
      rows: [
        { name: 'Site A', lat: 44, lon: -69, value: 12 },
        { name: 'Site B', lat: 45, lon: -70, value: 22 }
      ]
    });
    expect(report).toContain('GIS STUDIO ACCESSIBLE MAP PACKAGE');
    expect(report).toContain('<caption>Mapped data table</caption>');
    expect(report).toContain('Annotation key');
    expect(report).toContain('Sources, method, and limitations');
    expect(report).toContain('role="img"');
    expect(report).toContain('&lt;script&gt;');
    expect(report).not.toContain('<script>alert');
  });

  it('renders the map composer, annotation tools, coach, and accessible export', () => {
    loadTool('stem_lab/stem_tool_gisstudio.js', 'gisStudio');
    const html = renderTool('gisStudio', { gisTab: 'composer' });
    for (const text of ['Accessible Map Composer', 'Map text and legend', 'LIVE ACCESSIBLE PREVIEW', 'Evidence annotations', 'Add callout', 'CARTOGRAPHY COACH', 'Share-readiness review', 'Download accessible map package', 'Review project provenance']) {
      expect(html).toContain(text);
    }
    expect(html).toContain('type="checkbox"');
  });


  it('calculates spectral indices and classifies representative pixels', () => {
    const tool = loadTool('stem_lab/stem_tool_gisstudio.js', 'gisStudio');
    const vegetation = { green: 0.12, red: 0.08, nir: 0.62, swir: 0.20 };
    expect(tool.testing.calculateSpectralIndex(vegetation, 'ndvi')).toBeCloseTo(0.7714, 3);
    expect(tool.testing.calculateSpectralIndex({ green: 0.1, nir: 0.02 }, 'ndwi')).toBeGreaterThan(0.6);
    expect(tool.testing.classifySpectralPixel(vegetation).label).toBe('Dense vegetation');
    expect(tool.testing.normalizeRemoteSensingState({ swipe: 0 }).swipe).toBe(0);
  });

  it('summarizes masked land-cover and index change in the Maine learning scene', () => {
    const tool = loadTool('stem_lab/stem_tool_gisstudio.js', 'gisStudio');
    const scene = tool.testing.remoteScene;
    const summary = tool.testing.summarizeRemoteChange(scene, 'ndvi', 30);
    expect(scene.cells).toHaveLength(36);
    expect(summary.changed).toBeGreaterThan(0);
    expect(summary.masked).toBe(1);
    expect(summary.changedAreaHa).toBeCloseTo(summary.changed * 0.09, 6);
    expect(summary.forestLoss).toBeGreaterThan(0);
    expect(summary.developedGain).toBeGreaterThan(0);
  });

  it('builds an escaped accessible remote-sensing evidence report', () => {
    const tool = loadTool('stem_lab/stem_tool_gisstudio.js', 'gisStudio');
    const report = tool.testing.buildRemoteSensingReport({
      scene: tool.testing.remoteScene,
      state: {
        viewMode: 'ndvi',
        analysisIndex: 'ndvi',
        cloudMask: true,
        evidence: '<script>alert("no")</script> Values declined in changed forest pixels.'
      }
    });
    expect(report).toContain('GIS STUDIO REMOTE SENSING LAB');
    expect(report).toContain('Matched-scene comparison');
    expect(report).toContain('Accessible pixel table');
    expect(report).toContain('Before-and-after land cover and NDVI values');
    expect(report).toContain('Cloud masked');
    expect(report).toContain('&lt;script&gt;');
    expect(report).not.toContain('<script>alert');
  });

  it('renders the swipe lab, spectral inspector, quality checks, and table twin', () => {
    loadTool('stem_lab/stem_tool_gisstudio.js', 'gisStudio');
    const html = renderTool('gisStudio', { gisTab: 'remote' });
    for (const text of ['Remote Sensing Lab', 'Imagery and index controls', 'Before-and-after swipe comparison', 'Color infrared', 'NDVI vegetation index', 'Pixel spectral inspector', 'Change measurement', 'Interpretation quality check', 'Accessible raster-table twin', 'Maine change investigation', 'Download remote-sensing evidence report']) {
      expect(html).toContain(text);
    }
    expect((html.match(/data-remote-pixel=/g) || []).length).toBe(36);
    expect(html).toContain('type="range"');
    expect(html).toContain('<table');
  });

  it('normalizes story-map frames and tracks reflection progress', () => {
    const tool = loadTool('stem_lab/stem_tool_gisstudio.js', 'gisStudio');
    const story = tool.testing.normalizeStoryMap({
      title: '<script>story</script>',
      slides: Array.from({ length: 14 }, (_, index) => ({ title: 'Frame ' + index, narrative: 'Observation ' + index })),
      checks: { claim: true, evidence: true }
    });
    expect(story.slides).toHaveLength(12);
    expect(story.subtitle).toContain('Claim → evidence → limitation');
    expect(tool.testing.storyMapProgress(story)).toEqual({ complete: 2, total: 3, percent: 67, frames: 12 });
  });

  it('builds an escaped, ordered, accessible story-map report', () => {
    const tool = loadTool('stem_lab/stem_tool_gisstudio.js', 'gisStudio');
    const report = tool.testing.buildStoryMapReport({
      title: 'Watershed <script>alert(1)</script>',
      subtitle: 'Claim → evidence → limitation',
      checks: { claim: true, evidence: true, limitation: false },
      slides: [{ title: 'Pattern <b>', view: 'Map', narrative: '<script>bad</script>', evidence: 'Two mapped records', limitation: 'Small sample' }],
      rows: [{ name: 'Site A', geometry: 'Point', value: 12 }]
    });
    expect(report).toContain('<html lang="en">');
    expect(report).toContain('Accessible evidence trail');
    expect(report).toContain('Claim → evidence → limitation');
    expect(report).toContain('<ol class="trail">');
    expect(report).toContain('<caption>Sample records referenced by the story map</caption>');
    expect(report).toContain('&lt;script&gt;');
    expect(report).not.toContain('<script>alert');
  });

  it('renders the Story Map workspace and capture/export controls', () => {
    loadTool('stem_lab/stem_tool_gisstudio.js', 'gisStudio');
    const html = renderTool('gisStudio', { gisTab: 'story' });
    for (const text of ['Story Map Studio', 'Claim → evidence → limitation', 'Add current view to story', 'Add custom evidence frame', 'Accessible evidence trail', 'Download story map report', 'Print or save as PDF']) {
      expect(html).toContain(text);
    }
    expect(html).toContain('Story Map');
    expect(html).toContain('<progress');
  });

  it('scores data quality safeguards and normalizes review acknowledgements', () => {
    const tool = loadTool('stem_lab/stem_tool_gisstudio.js', 'gisStudio');
    expect(tool.testing.normalizeQualityReviewState({ privacy: true, provenance: 1 })).toEqual({ privacy: true, missingness: false, provenance: true, interpretation: false });
    const review = tool.testing.buildDataQualityReview({
      importedRows: [{ name: 'Site A', lat: 44, lon: -69, value: 12 }],
      timeRows: [{ name: 'Site A', year: 2020, value: 12, unit: 'percent' }],
      provenance: { datasetTitle: 'Maine access', source: 'Classroom survey', method: 'Annual sample', limitations: 'Learning data' },
      privacyAssessment: { highPrecision: 0, identifierWarnings: 0 },
      composerAudit: { errors: 0, warnings: 0 },
      remoteSummary: { masked: 0, total: 36 },
      storyProgress: { frames: 2, complete: 3, total: 3, percent: 100 }
    });
    expect(review.score).toBe(100);
    expect(review.ready).toBe(true);
    expect(review.checks.map((item) => item.status)).toEqual(['pass', 'pass', 'pass', 'pass', 'pass', 'pass', 'pass']);
    const incomplete = tool.testing.buildDataQualityReview({ provenance: {}, importedRows: [{ name: 'Student home', lat: 44.12345, lon: -69.98765, value: null }] });
    expect(incomplete.errors).toBeGreaterThan(0);
    expect(incomplete.warnings).toBeGreaterThan(0);
  });

  it('builds an accessible quality review report with a checklist and table', () => {
    const tool = loadTool('stem_lab/stem_tool_gisstudio.js', 'gisStudio');
    const review = tool.testing.buildDataQualityReview({ provenance: { source: 'Maine agency' }, remoteSummary: { masked: 1, total: 36 } });
    const report = tool.testing.buildDataQualityReport({ review, reviewState: { privacy: true } });
    expect(report).toContain('<html lang="en">');
    expect(report).toContain('Data Quality and Uncertainty Review');
    expect(report).toContain('Evidence readiness');
    expect(report).toContain('Quality checks, messages, and next actions');
    expect(report).toContain('Coordinate privacy reviewed');
    expect(report).toContain('<caption>Quality checks, messages, and next actions</caption>');
  });

  it('renders the Quality Review workspace and export controls', () => {
    loadTool('stem_lab/stem_tool_gisstudio.js', 'gisStudio');
    const html = renderTool('gisStudio', { gisTab: 'quality' });
    for (const text of ['Data Quality and Uncertainty Review', 'Learner review checklist', 'Coordinate privacy reviewed', 'Missing values reviewed', 'Accessible quality table', 'Download quality review', 'Print or save as PDF']) {
      expect(html).toContain(text);
    }
    expect(html).toContain('Evidence readiness');
    expect(html).toContain('<table');
  });

  it('builds a teacher-ready investigation packet from story and quality data', () => {
    const tool = loadTool('stem_lab/stem_tool_gisstudio.js', 'gisStudio');
    expect(tool.questHooks.some((hook) => hook.id === 'investigation_packet')).toBe(true);
    const report = tool.testing.buildInvestigationPacketReport({
      title: 'Maine watershed <script>alert(1)</script>',
      storyMap: { subtitle: 'Does access follow the coast?', checks: { claim: true, evidence: true, limitation: true }, slides: [{ title: 'Map pattern', view: 'Map', metric: 'Access', narrative: 'Values cluster near the coast.', evidence: 'Three mapped records', limitation: 'Small sample.' }] },
      qualityReview: { score: 86, errors: 0, warnings: 1, summary: 'Ready for a careful review.', checks: [{ id: 'source', label: 'Provenance', status: 'warning', message: 'Source is brief.', recommendation: 'Add a URL.' }] },
      provenance: { datasetTitle: 'Watershed study', source: 'Maine agency', method: 'Annual survey', limitations: 'Learning sample' },
      rows: [{ name: 'Site A', geometry: 'Point', value: 12 }]
    });
    expect(report).toContain('<html lang="en">');
    expect(report).toContain('GIS STUDIO INVESTIGATION PACKET');
    expect(report).toContain('Accessible evidence sequence');
    expect(report).toContain('Quality and uncertainty review');
    expect(report).toContain('Data-table twin');
    expect(report).toContain('Maine agency');
    expect(report).toContain('&lt;script&gt;');
    expect(report).not.toContain('<script>alert');
  });

  it('renders the Investigation Packet workspace and handoff controls', () => {
    loadTool('stem_lab/stem_tool_gisstudio.js', 'gisStudio');
    const html = renderTool('gisStudio', { gisTab: 'packet' });
    for (const text of ['Investigation Packet', 'Packet contents', 'Evidence readiness', 'Story frames', 'Quality and uncertainty', 'Download Investigation Packet', 'Print or save as PDF']) {
      expect(html).toContain(text);
    }
    expect(html).toContain('teacher handoff');
  });

  it('normalizes inquiry templates and tracks planning progress', () => {
    const tool = loadTool('stem_lab/stem_tool_gisstudio.js', 'gisStudio');
    expect(Object.keys(tool.testing.inquiryTemplates)).toEqual(['distribution', 'comparison', 'change', 'impact', 'remote']);
    const plan = tool.testing.normalizeInquiryPlan({ template: 'remote', checklist: { question: true, evidence: true } });
    expect(plan.question).toContain('land-cover');
    expect(tool.testing.inquiryPlanProgress(plan)).toEqual({ complete: 2, total: 4, percent: 50, ready: false });
    expect(tool.testing.inquiryPlanProgress({ checklist: { question: true, evidence: true, alternative: true, nextStep: true } }).ready).toBe(true);
  });

  it('includes the investigation plan in the packet report', () => {
    const tool = loadTool('stem_lab/stem_tool_gisstudio.js', 'gisStudio');
    const report = tool.testing.buildInvestigationPacketReport({
      inquiryPlan: { template: 'comparison', question: 'Do measures differ?', claim: 'Access is higher near services.', evidencePlan: 'Compare synchronized maps.', alternative: 'Definitions differ.', nextStep: 'Align units.', checklist: { question: true, evidence: true, alternative: true, nextStep: true } },
      qualityReview: { score: 90, errors: 0, warnings: 0, summary: 'Ready.', checks: [] },
      storyMap: { slides: [] }, provenance: { source: 'Classroom data' }
    });
    expect(report).toContain('Investigation plan');
    expect(report).toContain('Do measures differ?');
    expect(report).toContain('Align units.');
    expect(report).toContain('4 of 4 planning checks complete');
  });

  it('renders the Investigation Planner workspace', () => {
    loadTool('stem_lab/stem_tool_gisstudio.js', 'gisStudio');
    const html = renderTool('gisStudio', { gisTab: 'planner' });
    for (const text of ['Investigation Planner', 'Question type', 'Testable spatial question', 'Working claim', 'Alternative explanation or confounder', 'Investigation planning progress', 'Open Map Workspace', 'Build Story Map', 'Review Investigation Packet']) {
      expect(html).toContain(text);
    }
    expect(html).toContain('type="checkbox"');
  });

  it('normalizes teacher review ratings and tracks rubric progress', () => {
    const tool = loadTool('stem_lab/stem_tool_gisstudio.js', 'gisStudio');
    const review = tool.testing.normalizeTeacherReview({ status: 'ready', reviewer: 'Dr. M', overall: 'Strong evidence.', ratings: { question: 3, evidence: 2, quality: 1, limitations: 3 } });
    expect(review.ratings).toEqual({ question: 3, evidence: 2, quality: 1, limitations: 3 });
    expect(tool.testing.teacherReviewProgress(review)).toEqual({ rated: 4, total: 4, points: 9, max: 12, percent: 75, ready: true });
  });

  it('builds an accessible teacher review report', () => {
    const tool = loadTool('stem_lab/stem_tool_gisstudio.js', 'gisStudio');
    const report = tool.testing.buildTeacherReviewReport({ review: { reviewer: 'Dr. M', status: 'revise', overall: '<script>bad</script>', nextRevision: 'Add a comparison.', ratings: { question: 2, evidence: 1, quality: 2, limitations: 1 } } });
    expect(report).toContain('<html lang="en">');
    expect(report).toContain('Teacher Review');
    expect(report).toContain('Accessible rubric table');
    expect(report).toContain('Add a comparison.');
    expect(report).toContain('&lt;script&gt;');
    expect(report).not.toContain('<script>bad');
  });

  it('renders Teacher Review workspace and controls', () => {
    loadTool('stem_lab/stem_tool_gisstudio.js', 'gisStudio');
    const html = renderTool('gisStudio', { gisTab: 'review' });
    for (const text of ['Teacher Review', 'Reviewer', 'Review status', 'Accessible review rubric', 'Overall feedback', 'Next revision', 'Download teacher review', 'Open Investigation Packet']) expect(html).toContain(text);
    expect(html).toContain('Rating (0-3)');
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
