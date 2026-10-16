import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { convert, convertFlightCityData, parseMeters, buildingHeight, signedArea } = require('../dev-tools/build_skyschool_cities.cjs');
const geo = points => points.map(([lon, lat]) => ({ lon, lat }));
const square = (west = -70.270, south = 43.651, size = 0.001) => geo([
  [west, south], [west + size, south], [west + size, south + size], [west, south + size], [west, south],
]);
const way = (id, tags, geometry = square()) => ({ type: 'way', id, tags, geometry });
const convertElements = elements => convert({ elements, osm3s: { timestamp_osm_base: '2026-10-14T00:00:00Z' } }, 'fixture-sha', 'fixture.json');
const closed = ring => [...ring, ring[0]];

// Small invented fixtures are strictly inside the retained Portland bbox.
// They exercise conversion policy independently of the downloaded city IDs.
describe('SkySchool offline city converter', () => {
  it('converts metre and imperial height tags without treating units as metres', () => {
    for (const input of [12, '12', ' 12 m ', '12 metres', '12 meters', '12,5']) {
      expect(parseMeters(input)).toBeCloseTo(input === '12,5' ? 12.5 : 12, 8);
    }
    expect(parseMeters('40 ft')).toBeCloseTo(12.192, 8);
    expect(parseMeters('40 feet')).toBeCloseTo(12.192, 8);
    expect(parseMeters('40 foot')).toBeCloseTo(12.192, 8);
    expect(parseMeters("40' 6\"")).toBeCloseTo(12.3444, 8);
    expect(parseMeters("40' 6in")).toBeCloseTo(12.3444, 8);
    expect(buildingHeight({ building: 'yes', height: '40 ft', 'building:levels': '9' }))
      .toEqual({ heightM: 12.2, heightSource: 'height' });
  });

  it('rejects malformed measurements and uses valid levels before type estimates', () => {
    for (const input of [null, undefined, {}, [], NaN, Infinity, -4, '-4 m', 'about 8', '8;10', '8 yards', '1e2', '']) {
      expect(parseMeters(input)).toBeNull();
    }
    expect(buildingHeight({ building: 'office', height: 'unknown', 'building:levels': ' 4.5 ' }))
      .toEqual({ heightM: 13.5, heightSource: 'levels' });
    expect(buildingHeight({ building: 'yes', height: '0', 'building:levels': 2 }))
      .toEqual({ heightM: 6, heightSource: 'levels' });
    for (const levels of ['-1', '0', 'several', '2;3', '2 floors', Infinity, {}, null]) {
      expect(buildingHeight({ building: 'warehouse', 'building:levels': levels }))
        .toEqual({ heightM: 8, heightSource: 'estimated' });
    }
    expect(buildingHeight({ building: 'unrecognized' })).toEqual({ heightM: 9, heightSource: 'estimated' });
    expect(buildingHeight({ building: 'yes', height: '1000 m' })).toEqual({ heightM: 300, heightSource: 'height' });
    expect(buildingHeight({ building: 'yes', 'building:levels': 1000 })).toEqual({ heightM: 300, heightSource: 'levels' });
  });

  it('joins reversed relation members, preserves courtyard holes, and deduplicates member ways', () => {
    const outer = square(-70.272, 43.650, 0.004);
    const inner = square(-70.271, 43.651, 0.001);
    const first = way(11, { building: 'yes' }, outer.slice(0, 3));
    const second = way(12, { building: 'yes' }, [outer[0], outer[3], outer[2]]);
    const courtyard = way(13, { building: 'yes' }, inner);
    const relation = { type: 'relation', id: 100, tags: { type: 'multipolygon', building: 'school', height: '15 m' }, members: [
      { type: 'way', ref: 11, role: 'outer' }, { type: 'way', ref: 12, role: 'outer' }, { type: 'way', ref: 13, role: 'inner' },
    ] };
    const result = convertElements([second, courtyard, relation, first]);
    expect(result.buildings).toHaveLength(1);
    expect(result.buildings[0]).toMatchObject({ heightM: 15, heightSource: 'height' });
    expect(result.buildings[0].rings).toHaveLength(2);
    const [shell, hole] = result.buildings[0].rings;
    expect(shell).toHaveLength(4); expect(hole).toHaveLength(4);
    expect(shell[0]).not.toEqual(shell.at(-1)); expect(hole[0]).not.toEqual(hole.at(-1));
    expect(signedArea(closed(shell))).toBeGreaterThan(0);
    expect(signedArea(closed(hole))).toBeLessThan(0);
    expect(Math.abs(signedArea(closed(hole)))).toBeCloseTo(0.000001, 10);
    expect(result.metadata.omissions.relation_member_deduplicated.count).toBe(3);
    expect(result.metadata.sourceBuildingIds).toHaveLength(1);
    expect(result.metadata.counts.courtyardBuildings).toBe(1);
    expect(convertElements([first, relation, courtyard, second])).toEqual(result);
  });

  it('does not fill an unsupported relation courtyard with a standalone member outline', () => {
    const outer = way(21, { building: 'yes' }, square(-70.272, 43.650, 0.004));
    const touchingHole = way(22, { building: 'yes' }, square(-70.272, 43.651, 0.001));
    const relation = { type: 'relation', id: 101, tags: { type: 'multipolygon', building: 'yes' }, members: [
      { type: 'way', ref: 21, role: 'outer' }, { type: 'way', ref: 22, role: 'inner' },
    ] };
    const result = convertElements([outer, touchingHole, relation]);
    expect(result.buildings).toEqual([]);
    expect(result.metadata.omissions.invalid_courtyard_topology.count).toBe(1);
    expect(result.metadata.omissions.unrendered_relation_member.count).toBe(2);
  });

  it('rejects partial footprints and roads crossing the source bbox instead of clipping them inaccurately', () => {
    const outside = way(31, { building: 'yes' }, square(-70.286, 43.652, 0.002));
    const crossing = way(32, { highway: 'residential' }, geo([[-70.286, 43.653], [-70.270, 43.653]]));
    const valid = way(33, { building: 'house' });
    const result = convertElements([outside, crossing, valid]);
    expect(result.buildings).toHaveLength(1); expect(result.roads).toEqual([]);
    expect(result.metadata.omissions.outside_bbox.count).toBe(2);
    const [south, west, north, east] = result.bbox;
    for (const ring of result.buildings[0].rings) for (const [lon, lat] of ring) {
      expect(lon).toBeGreaterThanOrEqual(west); expect(lon).toBeLessThanOrEqual(east);
      expect(lat).toBeGreaterThanOrEqual(south); expect(lat).toBeLessThanOrEqual(north);
    }
  });

  it('omits bridges, tunnels, and elevated roads while accepting explicit negative flags at ground level', () => {
    const points = geo([[-70.275, 43.655], [-70.270, 43.655]]);
    const tags = [
      { bridge: 'yes' }, { bridge: 'viaduct' }, { tunnel: 'yes' }, { tunnel: 'building_passage' },
      { layer: '1' }, { layer: '-1' }, { bridge: 'no', tunnel: 'false', layer: '0' }, { bridge: '0', tunnel: 'no' },
    ];
    const result = convertElements(tags.map((extra, i) => way(40 + i, { highway: 'residential', ...extra }, points)));
    expect(result.roads).toHaveLength(2);
    expect(result.metadata.omissions.elevated_or_underground_road.count).toBe(6);
    for (const road of result.roads) { expect(road.widthM).toBe(7); expect(road.points).toHaveLength(2); }
  });

  it('rejects incomplete downloads and invalid rings without producing replacement rectangles', () => {
    expect(() => convert({ remark: 'runtime error: timeout', elements: [] }, 'sha', 'fixture')).toThrow(/remark/);
    expect(() => convert({ elements: null }, 'sha', 'fixture')).toThrow(/elements/);
    const open = way(51, { building: 'yes' }, square().slice(0, -1));
    const malformed = way(52, { building: 'yes' }, [{ lat: 43.652, lon: -70.272 }, { lat: NaN, lon: -70.271 }]);
    const result = convertElements([open, malformed]);
    expect(result.buildings).toEqual([]);
    expect(result.metadata.omissions.open_or_invalid_ring.count).toBe(2);
  });
});


const cityOptions = overrides => ({ id: 'city/sydney', name: 'Sydney, Australia', lat: -33.86, lon: 151.2,
  bbox: [-33.87, 151.19, -33.85, 151.21], ...overrides });
const convertCity = (elements, overrides) => convertFlightCityData({ elements }, cityOptions(overrides));

describe('SkySchool shared online city converter', () => {
  it('uses the selected center and bounds for another hemisphere without mutating input', () => {
    const elements = [way(301, { building: 'office', height: '60 ft' }, square(151.198, -33.862, 0.001)),
      way(302, { highway: 'secondary' }, geo([[151.197, -33.863], [151.202, -33.859]]))];
    const before = JSON.stringify(elements);
    const result = convertCity(elements, { source: 'fixture Sydney', sourceSha256: 'fixture-sha' });
    expect(result).toMatchObject({ id: 'city/sydney', name: 'Sydney, Australia', lat: -33.86, lon: 151.2,
      bbox: [-33.87, 151.19, -33.85, 151.21] });
    expect(result.buildings).toHaveLength(1);
    expect(result.buildings[0]).toMatchObject({ heightM: 18.3, heightSource: 'height' });
    expect(result.roads).toHaveLength(1);
    expect(result.metadata).toMatchObject({ source: 'fixture Sydney', sourceSha256: 'fixture-sha', license: 'ODbL-1.0' });
    expect(JSON.stringify(elements)).toBe(before);
  });

  it('keeps a dateline-crossing footprint and road local while returning canonical coordinates', () => {
    const options = { id: 'dateline', name: 'Dateline fixture', lat: -16.8, lon: -179.999,
      bbox: [-16.81, 179.99, -16.79, 180.01] };
    const result = convertFlightCityData({ elements: [
      way(310, { building: 'house' }, geo([[179.999, -16.801], [-179.998, -16.801],
        [-179.998, -16.799], [179.999, -16.799], [179.999, -16.801]])),
      way(311, { highway: 'residential' }, geo([[179.997, -16.802], [-179.997, -16.802]])),
    ] }, options);
    expect(result.buildings).toHaveLength(1); expect(result.roads).toHaveLength(1);
    expect(result.lon).toBe(-179.999); expect(result.bbox).toEqual(options.bbox);
    for (const [lon, lat] of result.buildings[0].rings[0]) {
      expect(lon).toBeGreaterThanOrEqual(-180); expect(lon).toBeLessThanOrEqual(180);
      expect(Math.abs(lat + 16.8)).toBeLessThan(0.002);
    }
    const local = result.buildings[0].rings[0].map(([lon, lat]) => [lon < 0 ? lon + 360 : lon, lat]);
    expect(signedArea(closed(local))).toBeCloseTo(0.000006, 10);
  });

  it('keeps stitched dateline relation rings valid on their second validation pass', () => {
    const geometry = geo([[179.999, -16.801], [-179.998, -16.801], [-179.998, -16.799],
      [179.999, -16.799], [179.999, -16.801]]);
    const result = convertFlightCityData({ elements: [{ type: 'relation', id: 312,
      tags: { building: 'yes', type: 'multipolygon' },
      members: [{ type: 'way', ref: 313, role: 'outer', geometry }] }] },
    { id: 'dateline-relation', name: 'Dateline relation', lat: -16.8, lon: -179.999,
      bbox: [-16.81, 179.99, -16.79, 180.01] });
    expect(result.buildings).toHaveLength(1);
    expect(result.buildings[0].rings[0]).toHaveLength(4);
  });

  it.each([
    null, [], {}, { id: '' }, { id: 'bad\nidentifier' }, { name: '' }, { name: 'a'.repeat(241) },
    { lat: NaN }, { lat: 91 }, { lon: Infinity }, { lon: 181 }, { bbox: null },
    { bbox: [-33.87, 151.19, -33.85] }, { bbox: [-33.85, 151.19, -33.87, 151.21] },
    { bbox: [-33.87, 151.21, -33.85, 151.19] }, { bbox: [-33.87, 150, -33.85, 155] },
    { bbox: [-91, 151.19, -33.85, 151.21] }, { bbox: [-33.87, 151.19, -33.85, NaN] },
    { bbox: [-33.84, 151.19, -33.82, 151.21] }, { source: {} }, { sourceSha256: {} },
  ])('rejects malformed city options before converting: %j', override => {
    const options = override === null || Array.isArray(override) || Object.keys(override).length === 0
      ? override : cityOptions(override);
    expect(() => convertFlightCityData({ elements: [] }, options)).toThrow();
  });

  it('rejects incomplete responses and all input work over the hard budgets', () => {
    for (const extra of [{ remark: 'timeout' }, { truncated: true }, { complete: false }, { error: 'failed' }, { errors: ['failed'] }]) {
      expect(() => convertFlightCityData({ elements: [], ...extra }, cityOptions())).toThrow(/remark|Incomplete/);
    }
    expect(() => convertCity(Array.from({ length: 12001 }, (_, id) => ({ type: 'node', id })))).toThrow(/element budget/);
    expect(() => convertCity([way(320, { building: 'yes' }, Array(200001).fill({ lon: 151.2, lat: -33.86 }))])).toThrow(/input coordinate budget/);
    expect(() => convertCity([{ type: 'relation', id: 321, tags: { building: 'yes' }, members: [
      { type: 'way', ref: 1, geometry: Array(200001).fill({ lon: 151.2, lat: -33.86 }) },
    ] }])).toThrow(/input coordinate budget/);
    expect(() => convertCity([{ type: 'relation', id: 322, members: [null] }])).toThrow(/relation member/);
  });

  it('bounds output by total coordinates even when feature counts are below their limits', () => {
    const points = geo(Array.from({ length: 26 }, (_, i) => [151.195 + i * 0.0002, -33.86]));
    const elements = Array.from({ length: 1200 }, (_, i) => way(400 + i, { highway: 'residential' }, points));
    const result = convertCity(elements);
    expect(result.roads).toHaveLength(Math.floor(30000 / 26));
    expect(result.metadata.counts.roadCoordinates).toBeLessThanOrEqual(30000);
    expect(result.metadata.omissions.total_coordinate_budget.count).toBe(1200 - result.roads.length);
    expect(convertCity([...elements].reverse())).toEqual(result);
  });

  it('rejects pathological topology before expensive cleanup and ignores inherited tag names', () => {
    const oversized = way(330, { building: 'house' }, Array(513).fill({ lon: 151.2, lat: -33.86 }));
    const invalidCoordinate = way(331, { building: 'house' }, geo([[540, -33.86], [151.201, -33.86],
      [151.201, -33.859], [540, -33.86]]));
    const inheritedRoad = way(332, { highway: 'constructor' }, geo([[151.199, -33.86], [151.201, -33.86]]));
    const building = way(333, { building: 'constructor' }, square(151.198, -33.862, 0.001));
    const result = convertCity([oversized, invalidCoordinate, inheritedRoad, building]);
    expect(result.buildings).toHaveLength(1);
    expect(result.buildings[0].heightM).toBe(9);
    expect(result.roads).toEqual([]);
    expect(result.metadata.omissions.ring_coordinate_budget.count).toBe(1);
    expect(result.metadata.omissions.open_or_invalid_ring.count).toBe(1);
    expect(result.metadata.omissions.excluded_road_class.count).toBe(1);
  });
});
