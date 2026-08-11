import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

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
    expect(parsed.data.features[1].geometry.coordinates).toEqual([[-70.24, 43.67, 8], [-70.23, 43.68, 9]]);
    expect(parseGPX(gpx).numericKeys).toContain('value');
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
});

