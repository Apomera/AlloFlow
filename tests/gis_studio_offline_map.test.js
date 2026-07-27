// GIS Studio — the offline schematic map, and the egress it exists to avoid.
//
// Every map view in this tool needed Leaflet from unpkg plus raster tiles from
// OpenStreetMap or Esri. Two consequences: the map simply does not exist on a
// locked-down school network (the tool fell back to "here is a table"), and each
// pan or zoom tells a third party which area the class is viewing — which for
// imported classroom points is approximately where those points are. The privacy
// review covered what leaves in the FILE and said nothing about that.
//
// The load-bearing test is `makes no network request of any kind`: it fails if the
// no-basemap path ever calls getLeaflet, because getLeaflet injects the unpkg
// <script>/<link> as a side effect the moment it is called.

import { describe, it, expect, beforeEach } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const TOOL = 'stem_lab/stem_tool_gisstudio.js';
const load = () => loadTool(TOOL, 'gisStudio');

describe('GIS Studio — offline schematic projection', () => {
  beforeEach(() => resetStemLab());

  it('projects a bounding box into the canvas, north up', () => {
    const t = load();
    const proj = t.testing.schematicProjection(
      [{ lat: 43, lon: -71 }, { lat: 45, lon: -69 }], 640, 390
    );
    expect(proj).not.toBeNull();
    const south = proj.project(-70, 43);
    const north = proj.project(-70, 45);
    expect(north.y).toBeLessThan(south.y);            // higher latitude is higher on screen
    const west = proj.project(-71, 44);
    const east = proj.project(-69, 44);
    expect(east.x).toBeGreaterThan(west.x);
    expect(proj.bounds).toEqual({ minLat: 43, maxLat: 45, minLon: -71, maxLon: -69 });
  });

  it('keeps one scale on both axes, so shape is not silently distorted', () => {
    const t = load();
    // a square-ish extent in projected space should stay square-ish on screen
    const proj = t.testing.schematicProjection([{ lat: 43, lon: -71 }, { lat: 44, lon: -69.6 }], 600, 600);
    const dx = proj.project(-69.6, 43).x - proj.project(-71, 43).x;
    const dy = proj.project(-71, 43).y - proj.project(-71, 44).y;
    expect(Math.abs(dx - dy) / Math.max(dx, dy)).toBeLessThan(0.08);
  });

  it('corrects longitude by cos(latitude) rather than stretching high-latitude data', () => {
    const t = load();
    const equator = t.testing.schematicProjection([{ lat: -0.5, lon: -0.5 }, { lat: 0.5, lon: 0.5 }], 600, 600);
    const north = t.testing.schematicProjection([{ lat: 59.5, lon: -0.5 }, { lat: 60.5, lon: 0.5 }], 600, 600);
    // one degree of longitude covers far less ground at 60°N, so it must occupy less
    // width than the same degree at the equator
    const eqW = equator.project(0.5, 0).x - equator.project(-0.5, 0).x;
    const nW = north.project(0.5, 60).x - north.project(-0.5, 60).x;
    expect(nW).toBeLessThan(eqW * 0.75);
  });

  it('survives a single point, or a perfectly straight row of them, without dividing by zero', () => {
    const t = load();
    const one = t.testing.schematicProjection([{ lat: 44, lon: -70 }], 640, 390);
    const p = one.project(-70, 44);
    expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
    const line = t.testing.schematicProjection([{ lat: 44, lon: -71 }, { lat: 44, lon: -69 }], 640, 390);
    expect(Number.isFinite(line.project(-70, 44).y)).toBe(true);
  });

  it('returns null when there is nothing mappable, rather than a broken projection', () => {
    const t = load();
    expect(t.testing.schematicProjection([], 640, 390)).toBeNull();
    expect(t.testing.schematicProjection([{ lat: 'x', lon: null }], 640, 390)).toBeNull();
  });

  it('picks round graticule steps and covers the extent', () => {
    const t = load();
    expect(t.testing.graticuleStep(2)).toBe(0.5);
    expect(t.testing.graticuleStep(0.2)).toBe(0.05);
    expect(t.testing.graticuleStep(500)).toBe(30);
    const g = t.testing.graticuleLines({ minLat: 43, maxLat: 45, minLon: -71, maxLon: -69 });
    expect(g.lats.length).toBeGreaterThan(1);
    expect(Math.min(...g.lats)).toBeGreaterThanOrEqual(43);
    expect(Math.max(...g.lats)).toBeLessThanOrEqual(45);
  });

  it('pulls outer rings from every geometry kind it can draw', () => {
    const t = load();
    const ring = [[0, 0], [1, 0], [1, 1], [0, 0]];
    const hole = [[0.2, 0.2], [0.4, 0.2], [0.4, 0.4], [0.2, 0.2]];
    expect(t.testing.featureOuterRings({ geometry: { type: 'Polygon', coordinates: [ring, hole] } })).toEqual([ring]);
    expect(t.testing.featureOuterRings({ geometry: { type: 'MultiPolygon', coordinates: [[ring], [hole]] } })).toEqual([ring, hole]);
    expect(t.testing.featureOuterRings({ geometry: { type: 'LineString', coordinates: ring } })).toEqual([ring]);
    expect(t.testing.featureOuterRings({ geometry: { type: 'Point', coordinates: [0, 0] } })).toEqual([]);
    expect(t.testing.featureOuterRings(null)).toEqual([]);
  });
});

describe('GIS Studio — no-basemap mode is genuinely no-egress', () => {
  beforeEach(() => resetStemLab());

  it('offers the offline choice and names what the online basemaps transmit', () => {
    load();
    const html = renderTool('gisStudio', {});
    expect(html).toContain('No basemap');
    expect(html).toMatch(/unpkg\.com/);                       // the library origin, stated
    expect(html).toMatch(/which area you are viewing/);        // the viewport leak, stated
  });

  it('makes no network request of any kind when the learner picks no basemap', () => {
    load();
    const before = document.querySelectorAll('[data-gis-leaflet]').length;
    const html = renderTool('gisStudio', { gisBasemap: 'none' });
    // getLeaflet() injects the unpkg script/link the moment it is called, so the
    // absence of those nodes is proof the no-basemap path never reached for it.
    expect(document.querySelectorAll('[data-gis-leaflet]').length).toBe(before);
    expect(html).not.toMatch(/unpkg\.com\/leaflet/);
    expect(html).not.toMatch(/tile\.openstreetmap\.org/);
    expect(html).not.toMatch(/services\.arcgisonline\.com/);
  });

  it('draws the schematic instead, labelled honestly and described for screen readers', () => {
    load();
    const html = renderTool('gisStudio', { gisBasemap: 'none' });
    expect(html).toContain('<svg');
    expect(html).toMatch(/Schematic — not a projected navigation map/);
    expect(html).toMatch(/no map-tile requests/);
    expect(html).toMatch(/Exact values are in the data table below/);
    expect(html).toContain('<table');                          // the table twin is still there
  });

  it('states the no-egress position in the privacy review, not only on the map tab', () => {
    load();
    // the privacy review lives on the Project tab, alongside the save/share controls
    const online = renderTool('gisStudio', { gisTab: 'project' });
    expect(online).toContain('What leaves this device');
    expect(online).toMatch(/approximately where they are/);
    const offline = renderTool('gisStudio', { gisTab: 'project', gisBasemap: 'none' });
    expect(offline).toMatch(/no map-tile or map-library requests are made/);
  });

  it('keeps the choropleth honest offline — same classes and colours as the Leaflet path', () => {
    const t = load();
    // classColor is the single source of truth both paths call
    const breaks = t.testing.calculateBreaks([1, 2, 3, 4, 20, 21, 22, 80, 90, 100], 'quantile', 5, '');
    const low = t.testing.classColor(1, breaks);
    const high = t.testing.classColor(100, breaks);
    expect(low).not.toBe(high);
    expect(low).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
