import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { TextEncoder, TextDecoder } from 'node:util';

const source = readFileSync('dev-tools/skyschool-city-online.js', 'utf8') + '\n' + readFileSync('dev-tools/skyschool-city-provider.js', 'utf8');
let api;
beforeEach(() => {
  api = { Map, Set, URL, AbortController, TextEncoder, TextDecoder, Date, setTimeout, clearTimeout, Uint8Array, ArrayBuffer };
  runInNewContext(source, api);
});
afterEach(() => vi.useRealTimers());
const city = { id: 'paris', name: 'Paris', lat: 48.8566, lon: 2.3522 };
function pack(identity) {
  const { lat, lon } = identity;
  return { ...identity, buildings: [{ id: 'tile/building/1', heightM: 12, heightSource: 'estimated', style: 0,
    rings: [[[lon - .0001, lat - .0001], [lon + .0001, lat - .0001], [lon, lat + .0001]]] }], roads: [],
    metadata: { source: identity.source } };
}
function bytesResponse(bytes = new Uint8Array([1, 2, 3]), options = {}) {
  let sent = false;
  return { ok: true, headers: { get: () => null }, body: { getReader: () => ({
    read: async () => sent ? { done: true } : (sent = true, { done: false, value: bytes }),
    cancel: vi.fn(async () => {}), releaseLock() {},
  }) }, ...options };
}
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
async function flush() { for (let i = 0; i < 100; i++) await Promise.resolve(); }
function setup(options = {}) {
  const fetch = vi.fn(async () => bytesResponse()), convertVector = vi.fn((tiles, identity) => pack(identity));
  const cache = { get: vi.fn(async () => null), put: vi.fn(async () => true) };
  const config = { fetch, convertVector, cache, ...options };
  return { ...config, loader: api.createFlightCityLoader(config) };
}

describe('SkySchool map provider selection', () => {
  it('enables OpenFreeMap without a key or host configuration', () => {
    expect(api.getFlightCityProvider()).toMatchObject({ kind: 'vector', name: 'OpenFreeMap',
      template: 'https://tiles.openfreemap.org/planet/latest/{z}/{x}/{y}.pbf' });
  });
  it('preserves explicit HTTPS Overpass providers and offers an explicit opt-out', () => {
    expect(api.getFlightCityProvider({ overpassUrl: 'https://maps.example.test/interpreter' })).toMatchObject({ kind: 'overpass', url: 'https://maps.example.test/interpreter' });
    expect(api.getFlightCityProvider({ provider: 'none', overpassUrl: 'https://maps.example.test/interpreter' }).kind).toBe('none');
  });
  it.each([{ provider: 'unknown' }, { provider: 'overpass' }, { overpassUrl: 'http://maps.example.test/' }, { overpassUrl: '' }])('fails closed for invalid explicit configuration %j', services => {
    expect(api.getFlightCityProvider(services)).toMatchObject({ kind: 'none', reason: 'invalid' });
  });
});

describe('SkySchool bounded city vector coverage', () => {
  it.each([city, { ...city, lat: 0, lon: 0 }, { ...city, lat: 85, lon: 30 }, { ...city, lat: -85, lon: -30 },
    { ...city, lat: 0, lon: 179.999 }, { ...city, lat: 83, lon: -179.999 }])('keeps z14 and a unique nine-tile maximum at $lat,$lon', target => {
    const plan = api.getFlightCityTilePlan(target);
    expect(plan.z).toBe(14); expect(plan.tiles.length).toBeGreaterThan(0); expect(plan.tiles.length).toBeLessThanOrEqual(9);
    expect(new Set(plan.tiles.map(tile => tile.x + '/' + tile.y)).size).toBe(plan.tiles.length);
    expect(plan.tiles.every(tile => tile.z === 14 && Number.isInteger(tile.x) && Number.isInteger(tile.y) && tile.x >= 0 && tile.x < 16384 && tile.y >= 0 && tile.y < 16384)).toBe(true);
    expect(plan.bbox[0]).toBeLessThan(target.lat); expect(plan.bbox[2]).toBeGreaterThan(target.lat);
    expect(plan.bbox[1]).toBeLessThan(target.lon); expect(plan.bbox[3]).toBeGreaterThan(target.lon);
  });
  it('requests the full 900 m radius at ordinary latitudes and shrinks coverage near the poles', () => {
    const paris = api.getFlightCityTilePlan(city), polar = api.getFlightCityTilePlan({ ...city, lat: 85 });
    expect(paris.bbox[2] - paris.bbox[0]).toBeCloseTo(1800 / 111320, 8);
    expect(polar.bbox[2] - polar.bbox[0]).toBeLessThan(paris.bbox[2] - paris.bbox[0]);
    expect(polar.tiles).toHaveLength(9);
  });
  it('wraps tile columns at the dateline while leaving the district bbox continuous', () => {
    const plan = api.getFlightCityTilePlan({ ...city, lat: 0, lon: 179.999 });
    expect(plan.tiles.some(tile => tile.x === 0)).toBe(true); expect(plan.tiles.some(tile => tile.x === 16383)).toBe(true);
    expect(plan.bbox[3]).toBeGreaterThan(180); expect(plan.bbox[3] - plan.bbox[1]).toBeLessThan(.02);
  });
  it.each([{ ...city, lat: 86 }, { ...city, lon: 181 }, { ...city, lat: NaN }])('rejects unsupported coordinates %j', target => {
    expect(() => api.getFlightCityTilePlan(target)).toThrow();
  });
});

describe('SkySchool automatic mapped-city loading', () => {
  it('makes no request until approach, then loads one bounded district and never touches persistent storage', async () => {
    const { loader, fetch, convertVector, cache } = setup();
    loader.select(city); loader.approach(0, 0); await flush();
    expect(fetch).not.toHaveBeenCalled(); expect(cache.get).not.toHaveBeenCalled();
    for (let i = 0; i < 100; i++) loader.approach(city.lat, city.lon);
    await flush();
    expect(loader.getState()).toMatchObject({ phase: 'ready', source: 'network' });
    const tiles = api.getFlightCityTilePlan(city).tiles;
    expect(fetch).toHaveBeenCalledTimes(tiles.length); expect(convertVector).toHaveBeenCalledTimes(1);
    expect(convertVector.mock.calls[0][0]).toHaveLength(tiles.length);
    expect(loader.getPack().metadata.attribution).toContain('OpenFreeMap');
    expect(cache.get).not.toHaveBeenCalled(); expect(cache.put).not.toHaveBeenCalled();
    for (const [url, init] of fetch.mock.calls) {
      expect(url).toMatch(/^https:\/\/tiles\.openfreemap\.org\/planet\/latest\/14\/\d+\/\d+\.pbf$/);
      expect(init).toMatchObject({ credentials: 'omit', referrerPolicy: 'no-referrer' });
    }
    for (let i = 0; i < 100; i++) loader.approach(city.lat, city.lon);
    expect(fetch).toHaveBeenCalledTimes(tiles.length); loader.dispose();
  });
  it('reuses completed packs in this session but not in a new loader', async () => {
    const { loader, fetch, convertVector, cache } = setup();
    loader.select(city); loader.approach(city.lat, city.lon); await flush(); const count = fetch.mock.calls.length;
    loader.select(null); loader.select(city); await flush();
    expect(loader.getState()).toMatchObject({ phase: 'ready', source: 'cache' }); expect(fetch).toHaveBeenCalledTimes(count);
    loader.dispose();
    const next = api.createFlightCityLoader({ fetch, convertVector, cache }); next.select(city); await flush();
    expect(next.getState().phase).toBe('waiting'); expect(next.getPack()).toBeNull(); expect(cache.get).not.toHaveBeenCalled(); next.dispose();
  });
  it.each([{ provider: 'none' }, { enabled: false }, { provider: 'misspelled' }, { overpassUrl: 'http://invalid.test' }])('sends no requests for disabled or invalid settings %j', endpoints => {
    const { loader, fetch } = setup({ endpoints }); loader.select(city); loader.approach(city.lat, city.lon); loader.retry();
    expect(fetch).not.toHaveBeenCalled(); loader.dispose();
  });
  it('keeps only three city packs in session memory', async () => {
    const { loader, fetch } = setup();
    const targets = Array.from({ length: 4 }, (_, i) => ({ ...city, id: 'city-' + i, lon: city.lon + i }));
    for (const target of targets) { loader.select(target); loader.approach(target.lat, target.lon); await flush(); expect(loader.getState().phase).toBe('ready'); }
    const count = fetch.mock.calls.length;
    loader.select(targets[3]); await flush(); expect(fetch).toHaveBeenCalledTimes(count);
    loader.select(targets[0]); await flush(); expect(loader.getState().phase).toBe('waiting'); loader.dispose();
  });
});

describe('SkySchool vector network guardrails', () => {
  it('awaits asynchronous conversion and passes its cancellation signal', async () => {
    const wait = deferred(), convert = vi.fn((tiles, identity, options) => wait.promise.then(() => pack(identity)));
    const task = api.fetchFlightCityVectorPack(city, { fetch: async () => bytesResponse(), convert }); await flush();
    expect(convert).toHaveBeenCalledTimes(1); expect(convert.mock.calls[0][2].signal.aborted).toBe(false);
    wait.resolve(); await expect(task).resolves.toMatchObject({ name: 'Paris' });
    expect(convert.mock.calls[0][2].signal.aborted).toBe(true);
  });
  it('cancels asynchronous preparation and ignores a late converted district', async () => {
    const wait = deferred(), controller = new AbortController(), convert = vi.fn((tiles, identity) => wait.promise.then(() => pack(identity)));
    const task = api.fetchFlightCityVectorPack(city, { fetch: async () => bytesResponse(), signal: controller.signal, convert }); await flush();
    controller.abort(); await expect(task).rejects.toMatchObject({ name: 'AbortError' });
    expect(convert.mock.calls[0][2].signal.aborted).toBe(true); wait.resolve(); await flush();
  });
  it('prefers the async worker helper by default while preserving explicit converters', async () => {
    api.convertFlightCityVectorTilesAsync = vi.fn(async (tiles, identity) => pack(identity)); api.convertFlightCityVectorTiles = vi.fn();
    await api.fetchFlightCityVectorPack(city, { fetch: async () => bytesResponse() });
    expect(api.convertFlightCityVectorTilesAsync).toHaveBeenCalledTimes(1); expect(api.convertFlightCityVectorTiles).not.toHaveBeenCalled();
  });
  it('uses the async worker helper through the default approaching-city loader', async () => {
    api.convertFlightCityVectorTilesAsync = vi.fn(async (tiles, identity) => pack(identity)); api.convertFlightCityVectorTiles = vi.fn();
    const loader = api.createFlightCityLoader({ fetch: async () => bytesResponse() });
    loader.select(city); loader.approach(city.lat, city.lon); await flush();
    expect(loader.getState().phase).toBe('ready'); expect(api.convertFlightCityVectorTilesAsync).toHaveBeenCalledTimes(1);
    expect(api.convertFlightCityVectorTilesAsync.mock.calls[0][2].signal).toBeInstanceOf(AbortSignal); expect(api.convertFlightCityVectorTiles).not.toHaveBeenCalled(); loader.dispose();
  });
  it('runs at most two requests simultaneously and converts only after all tiles complete', async () => {
    const pending = [], fetch = vi.fn(() => { const item = deferred(); pending.push(item); return item.promise; });
    const convert = vi.fn((tiles, identity) => pack(identity));
    const task = api.fetchFlightCityVectorPack(city, { fetch, convert }); await flush();
    expect(fetch).toHaveBeenCalledTimes(2); expect(convert).not.toHaveBeenCalled();
    const total = api.getFlightCityTilePlan(city).tiles.length;
    for (let index = 0; index < total; index++) { expect(fetch.mock.calls.length - index).toBeLessThanOrEqual(2); pending[index].resolve(bytesResponse()); await flush(); }
    expect(await task).toMatchObject({ name: 'Paris' }); expect(convert).toHaveBeenCalledTimes(1);
  });
  it('aborts the other request after one tile fails and does not render a partial district', async () => {
    const wait = deferred(), fetch = vi.fn().mockResolvedValueOnce(bytesResponse(undefined, { ok: false })).mockImplementation(() => wait.promise);
    const convert = vi.fn(), task = api.fetchFlightCityVectorPack(city, { fetch, convert });
    await expect(task).rejects.toThrow('unavailable'); expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls.every(call => call[1].signal.aborted)).toBe(true); expect(convert).not.toHaveBeenCalled(); wait.resolve(bytesResponse());
  });
  it('ignores late tiles after changing the selected city', async () => {
    const wait = deferred(), { loader, fetch, convertVector } = setup({ fetch: vi.fn(() => wait.promise) });
    loader.select(city); loader.approach(city.lat, city.lon); await flush();
    loader.select({ ...city, id: 'next', lon: -73 }); await flush();
    expect(fetch.mock.calls.every(call => call[1].signal.aborted)).toBe(true);
    wait.resolve(bytesResponse()); await flush(); expect(convertVector).not.toHaveBeenCalled();
    expect(loader.getState()).toMatchObject({ phase: 'waiting', target: { id: 'next' } }); loader.dispose();
  });
  it('enforces the 45-second whole-district deadline even when fetch ignores abort', async () => {
    vi.useFakeTimers(); api.setTimeout = setTimeout; api.clearTimeout = clearTimeout;
    const fetch = vi.fn(() => new Promise(() => {}));
    const task = api.fetchFlightCityVectorPack(city, { fetch, convert: vi.fn() }); const caught = task.catch(error => error.message);
    await vi.advanceTimersByTimeAsync(45000); expect(await caught).toContain('timed out');
    expect(fetch.mock.calls.every(call => call[1].signal.aborted)).toBe(true); expect(vi.getTimerCount()).toBe(0);
  });
  it('rejects oversized declared tiles before reading the body', async () => {
    const getReader = vi.fn(), fetch = vi.fn(async () => bytesResponse(undefined, { headers: { get: () => '4194305' }, body: { getReader } }));
    await expect(api.fetchFlightCityVectorPack(city, { fetch, convert: vi.fn() })).rejects.toThrow('download limit');
    expect(getReader).not.toHaveBeenCalled();
  });
  it('enforces decoded per-tile size when content-length is missing', async () => {
    const cancel = vi.fn(), fetch = vi.fn(async () => bytesResponse(undefined, { body: { getReader: () => ({
      read: async () => ({ done: false, value: new Uint8Array(1024 * 1024) }), cancel, releaseLock() {},
    }) } }));
    await expect(api.fetchFlightCityVectorPack(city, { fetch, convert: vi.fn() })).rejects.toThrow('download limit'); expect(cancel).toHaveBeenCalled();
  });
  it('enforces the shared 12 MiB decoded limit across otherwise valid tiles', async () => {
    const convert = vi.fn(), fetch = vi.fn(async () => bytesResponse(new Uint8Array(4 * 1024 * 1024)));
    await expect(api.fetchFlightCityVectorPack({ ...city, lat: 85 }, { fetch, convert })).rejects.toThrow('download limit');
    expect(convert).not.toHaveBeenCalled(); expect(fetch.mock.calls.length).toBeLessThan(9);
  });
  it('declines unbounded reads and clears cancellation timers', async () => {
    const arrayBuffer = vi.fn(), fetch = vi.fn(async () => bytesResponse(undefined, { body: null, arrayBuffer }));
    await expect(api.fetchFlightCityVectorPack(city, { fetch, convert: vi.fn() })).rejects.toThrow('safely stream'); expect(arrayBuffer).not.toHaveBeenCalled();
  });
  it('requires manual retry after a failed batch and enforces cooldown', async () => {
    let clock = 1000; const { loader, fetch } = setup({ now: () => clock, fetch: vi.fn(async () => bytesResponse(undefined, { ok: false })) });
    loader.select(city); loader.approach(city.lat, city.lon); await flush();
    expect(loader.getState()).toMatchObject({ phase: 'error', retryAt: 61000 }); const count = fetch.mock.calls.length;
    clock = 61000; loader.approach(city.lat, city.lon); await flush(); expect(fetch).toHaveBeenCalledTimes(count);
    loader.retry(); await flush(); expect(fetch.mock.calls.length).toBeGreaterThan(count); loader.dispose();
  });
  it('rejects invalid converted geometry and distinguishes an empty mapped district', async () => {
    const fetch = async () => bytesResponse();
    await expect(api.fetchFlightCityVectorPack(city, { fetch, convert: (tiles, identity) => pack({ ...identity, lat: NaN }) })).rejects.toThrow('validation');
    const { loader } = setup({ convertVector: (tiles, identity) => ({ ...identity, buildings: [], roads: [] }) });
    loader.select(city); loader.approach(city.lat, city.lon); await flush(); expect(loader.getState().phase).toBe('empty'); loader.dispose();
  });
});
