import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const api = {};
// Use the production distance calculation, including its date-line behavior.
runInNewContext(readFileSync('dev-tools/skyschool-city-online.js', 'utf8') + '\n' +
  readFileSync('dev-tools/skyschool-city-selection.js', 'utf8'), api);
const choose = api.chooseFlightCityDistrict;
const pack = (id, lat = 0, lon = 0) => ({ id, lat, lon, buildings: [{}], roads: [] });
const north = distance => ({ lat: distance / 3440.065 * 180 / Math.PI, lon: 0 });

describe('city district selection', () => {
  it('switches an overlapping retained district to the loaded destination', () => {
    const existing = pack('existing'), destination = pack('destination', 0.03);
    expect(choose([destination, existing], existing, existing, null)).toBe(existing);
    expect(choose([existing, destination], existing, existing, destination)).toBe(destination);
  });

  it('resolves a built-in loader copy to the exact available reference', () => {
    const builtin = pack('builtin'), other = pack('other', 0.01);
    expect(choose([other, builtin], builtin, builtin, { ...builtin })).toBe(builtin);
    expect(choose([other, builtin], null, builtin, { ...builtin })).toBe(builtin);
    // A reused ID at another coordinate is not the selected district.
    expect(choose([builtin, other], other, other, { ...builtin, lat: 0.5 })).toBe(other);
  });

  it('uses the nearest available district independently of provider ordering', () => {
    const far = pack('far', 0.1), near = pack('near', 0.02);
    expect(choose([far, near], null, { lat: 0, lon: 0 }, null)).toBe(near);
    expect(choose([near, far], null, { lat: 0, lon: 0 }, null)).toBe(near);
  });

  it('enters inside 14 nm and retains only the active district until 16 nm', () => {
    const city = pack('city');
    expect(choose([city], null, north(13.99), city)).toBe(city);
    expect(choose([city], null, north(14.01), city)).toBeNull();
    expect(choose([city], city, north(15.99), city)).toBe(city);
    expect(choose([city], city, north(16.01), city)).toBeNull();
    expect(choose([city], city, north(15), null)).toBe(city);
    expect(choose([city], null, north(15), null)).toBeNull();
  });

  it('does not let a preferred district outside the entry radius replace a retained district', () => {
    const current = pack('current'), preferred = pack('preferred', north(15).lat);
    expect(choose([preferred, current], current, current, preferred)).toBe(current);
  });

  it('releases removed current and preferred packs immediately', () => {
    const current = pack('current'), builtin = pack('builtin', 0.02);
    expect(choose([builtin], current, current, current)).toBe(builtin);
    expect(choose([], current, current, current)).toBeNull();
  });

  it('retains only the live district when a replacement selection explicitly permits continuity', () => {
    const current = pack('current'), builtin = pack('builtin', 0.02);
    expect(choose([builtin], current, current, null, true)).toBe(current);
    expect(choose([builtin], current, current, null, false)).toBe(builtin);
    expect(choose([], current, current, null, false)).toBeNull();
    expect(choose([], current, current, null, 'true')).toBeNull();
    expect(choose([], null, current, current, true)).toBeNull();
  });

  it('replaces a retained removed pack as soon as the preferred district enters range', () => {
    const current = pack('current'), preferred = pack('preferred', north(15).lat);
    expect(choose([preferred], current, current, preferred, true)).toBe(current);
    expect(choose([preferred], current, north(2), preferred, true)).toBe(preferred);
  });

  it('releases retained scenery beyond 16 nm and cannot resurrect it on re-entry', () => {
    const current = pack('current');
    expect(choose([], current, north(15.99), null, true)).toBe(current);
    const afterExit = choose([], current, north(16.01), null, true);
    expect(afterExit).toBeNull();
    expect(choose([], afterExit, current, null, true)).toBeNull();
  });

  it('never retains an invalid or empty live district', () => {
    const position = { lat: 0, lon: 0 };
    for (const current of [null, pack('invalid', NaN), { ...pack('empty'), buildings: [] }]) {
      expect(choose([], current, position, null, true)).toBeNull();
    }
  });

  it('ignores empty and invalid packs but accepts roads without buildings', () => {
    const empty = { ...pack('empty'), buildings: [] };
    const road = { ...pack('road', 0.01), buildings: [], roads: [{}] };
    const malformed = [null, {}, pack('nan', NaN), pack('polar', 91), pack('infinite', 0, Infinity), pack('outside', 0, 181)];
    expect(choose([...malformed, empty, road], empty, { lat: 0, lon: 0 }, empty)).toBe(road);
    expect(choose([empty], empty, { lat: 0, lon: 0 }, empty)).toBeNull();
  });

  it('selects and retains a district across the date line', () => {
    const city = pack('date-line', 0, 179.99), position = { lat: 0, lon: -179.99 };
    expect(choose([city], null, position, city)).toBe(city);
    expect(choose([city], city, position, null)).toBe(city);
    expect(choose([city], city, { ...position, lon: 180.01 }, null)).toBe(city);
  });

  it('keeps nearby supported scenery when the aircraft crosses the provider latitude limit', () => {
    const city = pack('polar-edge', 84.99);
    expect(choose([city], city, { lat: 85.01, lon: 0 }, city)).toBe(city);
    expect(choose([city], null, { lat: 85.01, lon: 0 }, city)).toBe(city);
    const northern = pack('high-latitude', 85.1);
    expect(choose([northern], null, northern, northern)).toBe(northern);
  });

  it('rejects invalid positions and collections without mutating inputs', () => {
    const city = Object.freeze(pack('city')), packs = Object.freeze([city]);
    for (const position of [null, {}, { lat: NaN, lon: 0 }, { lat: 0, lon: Infinity }, { lat: 90.1, lon: 0 }]) {
      expect(choose(packs, city, position, city)).toBeNull();
    }
    expect(choose(null, city, city, city)).toBeNull();
    expect(choose(packs, city, city, city)).toBe(city);
  });
});
