import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import { TextDecoder } from 'node:util';

const context = vm.createContext({ TextDecoder, Uint8Array });
for (const file of ['vendor/skyschool-vector/decoder.js', 'dev-tools/skyschool-city-converter.js', 'dev-tools/skyschool-city-vector.js']) {
  vm.runInContext(fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8'), context);
}
const convert = context.convertFlightCityVectorTiles;
const defaults = { id: 'test-city', name: 'Synthetic test district', lat: -0.01, lon: 0.01, bbox: [-0.03, -0.01, 0.01, 0.05] };
const tile = (data, x = 8192, y = 8192) => ({ data, z: 14, x, y });
const varint = number => {
  const output = [];
  while (number >= 128) { output.push(number % 128 | 128); number = Math.floor(number / 128); }
  output.push(number); return output;
};
const field = (tag, bytes) => [...varint(tag * 8 + 2), ...varint(bytes.length), ...bytes];
const integer = (tag, number) => [...varint(tag * 8), ...varint(number)];
const string = (tag, value) => field(tag, [...Buffer.from(value)]);
const value = item => {
  if (typeof item === 'string') return string(1, item);
  if (typeof item === 'boolean') return integer(7, Number(item));
  const bytes = new Uint8Array(8); new DataView(bytes.buffer).setFloat64(0, item, true);
  return [...varint(3 * 8 + 1), ...bytes];
};
const zigzag = number => number < 0 ? -number * 2 - 1 : number * 2;
function commands(lines, type = 3) {
  let x = 0, y = 0; const output = [];
  for (const line of lines) {
    for (let i = 0; i < line.length; i++) {
      if (!i) output.push(9);
      else if (i === 1) output.push((line.length - 1) * 8 + 2);
      output.push(...varint(zigzag(line[i][0] - x)), ...varint(zigzag(line[i][1] - y)));
      [x, y] = line[i];
    }
    if (type === 3) output.push(15);
  }
  return output;
}
const square = (x = 1000, y = 1000, size = 400) => [[x, y], [x + size, y], [x + size, y + size], [x, y + size]];
const building = (lines = [square()], properties = { render_height: 20 }) => ({ type: 3, lines, properties });
const road = (lines = [[[100, 2000], [3900, 2000]]], properties = { class: 'minor' }) => ({ type: 2, lines, properties });
function encode(layers) {
  const output = [];
  for (const [name, features] of Object.entries(layers)) {
    const keys = [], values = [], encoded = [];
    for (const item of features) {
      const tags = [];
      for (const [key, entry] of Object.entries(item.properties || {})) {
        if (!keys.includes(key)) keys.push(key);
        tags.push(keys.indexOf(key), values.length); values.push(entry);
      }
      encoded.push(field(2, [...field(2, tags.flatMap(varint)), ...integer(3, item.type), ...field(4, item.commands || commands(item.lines, item.type))]));
    }
    const layer = [...string(1, name), ...encoded.flat(), ...keys.flatMap(key => string(3, key)), ...values.flatMap(item => field(4, value(item))), ...integer(5, 4096), ...integer(15, 2)];
    for (const byte of field(3, layer)) output.push(byte);
  }
  return new Uint8Array(output);
}

describe('bounded local OpenMapTiles city converter', () => {
  it('decodes outlines, holes, merged multipolygons and roads with honest height provenance', () => {
    const hole = square(1100, 1100, 100).reverse();
    const data = encode({ building: [building([square(), hole, square(2200, 1000)])], transportation: [road()] });
    const result = convert([tile(data)], defaults);
    expect(result.buildings).toHaveLength(2);
    expect(result.roads).toHaveLength(1);
    expect(result.buildings.filter(item => item.rings.length === 2)).toHaveLength(1);
    expect(result.buildings.every(item => item.heightM === 20 && item.heightSource === 'estimated')).toBe(true);
    expect(result.metadata.counts.heightSources).toEqual({ height: 0, levels: 0, estimated: 2 });
    expect(result.buildings.every(item => item.id.startsWith('mvt/14/8192/8192/'))).toBe(true);
    expect(result.metadata.heightPolicy).toContain('approximation');
    expect(result.metadata.attribution).toContain('OpenMapTiles');
  });

  it('excludes elevated/hidden building groups and unsupported transport instead of flattening them', () => {
    const data = encode({ building: [building(), building([square(2000)], { hide_3d: true }), building([square(2500)], { render_min_height: 5 })],
      transportation: [road(), road(undefined, { class: 'primary', brunnel: 'bridge' }), road(undefined, { class: 'primary', brunnel: 'tunnel' }),
        road(undefined, { class: 'primary', brunnel: 'ford' }), road(undefined, { class: 'rail' }), road(undefined, { class: 'path' }), road(undefined, { class: 'minor', access: 'private' })] });
    const result = convert([tile(data)], defaults);
    expect(result.buildings).toHaveLength(1);
    expect(result.roads).toHaveLength(1);
    expect(result.metadata.vector.omissions.hidden_or_elevated_building_group).toBe(2);
    expect(result.metadata.vector.omissions.excluded_road).toBe(6);
  });

  it('splits roads at tile seams, omits cut buildings and deduplicates complete shells', () => {
    const left = encode({ building: [building([square(1000)]), building([square(1000)]), building([square(4050, 1000, 100)])], transportation: [road([[[3900, 2000], [4200, 2000]]])] });
    const right = encode({ building: [building([square(-46, 1000, 100)])], transportation: [road([[[-196, 2000], [104, 2000]]])] });
    const result = convert([tile(right, 8193), tile(left)], defaults);
    expect(result.buildings).toHaveLength(1);
    expect(result.roads).toHaveLength(2);
    expect(result.metadata.vector.omissions.building_crosses_tile_core).toBe(2);
    expect(result.metadata.vector.omissions.duplicate_building).toBe(1);
    const pieces = [...result.roads].sort((a, b) => a.points[0][0] - b.points[0][0]);
    expect(pieces[0].points.at(-1)).toEqual(pieces[1].points[0]);
    expect(result).toEqual(convert([tile(left), tile(right, 8193)], defaults));
  });

  it('handles both sides of the dateline on one continuous district branch', () => {
    const data = encode({ building: [building()] });
    const result = convert([tile(data, 16383), tile(data, 0)], { ...defaults, lon: 179.999, bbox: [-0.03, 179.97, 0.01, 180.03] });
    expect(result.buildings).toHaveLength(2);
    const longitudes = result.buildings.flatMap(item => item.rings.flatMap(ring => ring.map(point => point[0])));
    expect(longitudes.some(lon => lon > 179.9)).toBe(true);
    expect(longitudes.some(lon => lon < -179.9)).toBe(true);
    expect(longitudes.every(lon => Math.abs(lon) <= 180)).toBe(true);
  });

  it('drops out-of-district geometry before the accepted input feature budget', () => {
    const outside = Array.from({ length: 12001 }, (_, index) => square(3000 + index % 10, 3000, 2));
    const data = encode({ building: [building([square(1000, 1000, 10), ...outside])] });
    const result = convert([tile(data)], { ...defaults, lat: -0.0055, lon: 0.0055, bbox: [-0.007, 0.004, -0.004, 0.007] });
    expect(result.buildings).toHaveLength(1);
    expect(result.metadata.vector.omissions.building_outside_district).toBe(12001);
  });

  it('rejects malformed/truncated geometry and bounded input violations before vendor decoding', () => {
    const good = encode({ building: [building()] });
    expect(() => convert([tile(new Uint8Array([26, 255]))], defaults)).toThrow(/Truncated/);
    expect(() => convert([tile(encode({ building: [{ type: 3, commands: [9, 0, 0, 0] }] }))], defaults)).toThrow(/geometry/);
    expect(() => convert([tile(encode({ building: [{ type: 3, commands: [9, 0, 0, 15] }] }))], defaults)).toThrow(/closure/);
    expect(() => convert([tile(encode({ transportation: [road([[[100, 100], [2000000000, 2000000000]]])] }))], defaults)).toThrow(/tile buffer/);
    expect(() => convert([tile(new Uint8Array(4 * 1024 * 1024 + 1))], defaults)).toThrow(/byte budget/);
    expect(() => convert(Array(10).fill(tile(good)), defaults)).toThrow(/tile count/);
    expect(() => convert([tile(good), tile(good)], defaults)).toThrow(/Duplicate/);
    expect(() => convert([{ ...tile(good), z: 13 }], defaults)).toThrow(/Invalid city vector tile/);
    const unsafeProperties = Object.create(null); unsafeProperties.__proto__ = 'unsafe';
    expect(() => convert([tile(encode({ building: [building(undefined, unsafeProperties)] }))], defaults)).toThrow(/property key/);
  });

  it('does not decode irrelevant layer geometries or let properties spoof measured heights', () => {
    const data = encode({ building: [building(undefined, { render_height: 900, height: 5 })], poi: [{ type: 3, commands: [0] }] });
    const result = convert([tile(data)], defaults);
    expect(result.buildings[0]).toMatchObject({ heightM: 300, heightSource: 'estimated' });
    expect(result.metadata.vector.decodedCoordinates).toBe(4);
  });

  it.each([
    { name: 'Paris', file: 'skyschool_openfreemap_paris_14_8299_5636.pbf', lat: 48.8566, lon: 2.3522, x: 8299, y: 5636 },
    { name: 'Kyoto', file: 'skyschool_openfreemap_kyoto.pbf', lat: 35.0116, lon: 135.7681, x: 14370, y: 6489 }
  ])('converts the genuine $name OpenFreeMap fixture within rendering budgets', city => {
    const data = new Uint8Array(fs.readFileSync(new URL('./fixtures/' + city.file, import.meta.url)));
    const dLat = 0.0081, dLon = dLat / Math.cos(city.lat * Math.PI / 180);
    const result = convert([tile(data, city.x, city.y)], { id: city.name, name: city.name, lat: city.lat, lon: city.lon, bbox: [city.lat - dLat, city.lon - dLon, city.lat + dLat, city.lon + dLon] });
    expect(result.buildings.length).toBeGreaterThan(1000);
    expect(result.buildings.length).toBeLessThanOrEqual(2500);
    expect(result.roads.length).toBeGreaterThan(50);
    expect(result.roads.length).toBeLessThanOrEqual(1200);
    expect(result.metadata.counts.courtyardBuildings).toBeGreaterThan(0);
    expect(result.metadata.counts.buildingCoordinates + result.metadata.counts.roadCoordinates).toBeLessThanOrEqual(30000);
    expect(result.buildings.every(item => item.heightSource === 'estimated')).toBe(true);
    expect(result.metadata.vector.decodedCoordinates).toBeLessThanOrEqual(1000000);
  });

  it('keeps the nearest bounded detail when a genuine four-tile Kyoto district exceeds input feature capacity', () => {
    // The built-in Kyoto destination uses this center. Its real 900 m district
    // has over 20,000 eligible houses, unlike the smaller one-tile smoke fixture.
    const target = { id: 'kyoto-full', name: 'Kyoto', lat: 35.032, lon: 135.748,
      bbox: [35.023915199425076, 135.73812641810486, 35.04008480057492, 135.75787358189513] };
    const tiles = [[14369, 6487], [14370, 6487], [14369, 6488], [14370, 6488]].map(([x, y]) =>
      tile(new Uint8Array(fs.readFileSync(new URL('./fixtures/skyschool_openfreemap_kyoto_14_' + x + '_' + y + '.pbf', import.meta.url))), x, y));
    const result = convert(tiles, target);
    expect(result.buildings).toHaveLength(2500);
    expect(result.roads.length).toBeGreaterThan(100);
    expect(result.metadata.counts.courtyardBuildings).toBeGreaterThan(0);
    expect(result.metadata.vector.omissions.building_candidate_budget).toBeGreaterThan(10000);
    expect(result.metadata.vector.candidateElements).toBeLessThanOrEqual(9000);
    expect(result.metadata.vector.acceptedCoordinates).toBeLessThanOrEqual(200000);
    expect(result.metadata.counts.buildingCoordinates + result.metadata.counts.roadCoordinates).toBeLessThanOrEqual(30000);
    // Candidate eviction must favor the chosen city, rather than whichever tile
    // happens to arrive first. All output house centroids remain near the center.
    const radiusMetres = result.buildings.map(building => {
      const outer = building.rings[0], lon = outer.reduce((sum, point) => sum + point[0], 0) / outer.length;
      const lat = outer.reduce((sum, point) => sum + point[1], 0) / outer.length;
      return Math.hypot((lon - target.lon) * Math.cos(target.lat * Math.PI / 180), lat - target.lat) * 111320;
    });
    expect(Math.max(...radiusMetres)).toBeLessThan(700);
  }, 20000);
});
