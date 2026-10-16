import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { TextEncoder, TextDecoder } from 'node:util';

const source = readFileSync('dev-tools/skyschool-city-online.js', 'utf8') + '\n' + readFileSync('dev-tools/skyschool-city-provider.js', 'utf8');
let api;
beforeEach(() => {
  api = { Map, Set, URL, AbortController, TextEncoder, TextDecoder, Date, setTimeout, clearTimeout };
  runInNewContext(source, api);
});
afterEach(() => vi.useRealTimers());
const city = { id: 'osm-R-1', name: 'Example city', lat: 43.65, lon: -70.26 };
function pack(overrides = {}) {
  return { ...city, bbox: [43.64, -70.27, 43.66, -70.25],
    buildings: [{ id: 'way/1', heightM: 12, style: 1, heightSource: 'levels',
      rings: [[[-70.261, 43.65], [-70.259, 43.65], [-70.26, 43.651]]] }],
    roads: [{ id: 'way/2', widthM: 7, points: [[-70.262, 43.648], [-70.262, 43.652]] }],
    metadata: { source: 'OpenStreetMap fixture', osmBaseTimestamp: '2026-10-15T00:00:00Z' }, ...overrides };
}
function response(raw, options = {}) {
  const bytes = new TextEncoder().encode(JSON.stringify(raw));
  let sent = false;
  return { ok: true, headers: { get: () => null }, body: { getReader: () => ({
    read: async () => sent ? { done: true } : (sent = true, { done: false, value: bytes }),
    cancel: vi.fn(async () => {}), releaseLock() {},
  }) }, ...options };
}
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
async function flush() { for (let i = 0; i < 20; i++) await Promise.resolve(); }
function setup(options = {}) {
  const fetch = vi.fn(async () => response({ elements: [] }));
  const cache = { get: vi.fn(async () => null), put: vi.fn(async () => true) };
  const convert = vi.fn((raw, identity) => pack({ ...identity }));
  const onChange = vi.fn();
  const config = { fetch, cache, convert, onChange, endpoints: { overpassUrl: 'https://city-data.example.test/api/interpreter' }, ...options };
  const loader = api.createFlightCityLoader(config);
  return { ...config, loader };
}
function photon(name, lon, lat, properties = {}) {
  return { type: 'Feature', properties: { name, osm_key: 'place', osm_value: 'city', osm_type: 'R', osm_id: name, country: 'United States', state: 'Maine', ...properties },
    geometry: { type: 'Point', coordinates: [lon, lat] } };
}

describe('SkySchool explicit city discovery', () => {
  it('accepts coordinate input without a network request and rejects out-of-range values', async () => {
    const fetch = vi.fn(), onResults = vi.fn();
    const results = await api.searchFlightCities('43.65, -70.26', { fetch, onResults });
    expect(results[0]).toMatchObject({ name: 'Custom location', lat: 43.65, lon: -70.26, isCity: true, code: 'CITY' });
    expect(await api.searchFlightCities('91, 20', { fetch })).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
    expect(onResults).not.toHaveBeenCalled();
  });
  it('uses city/locality layers, contextual labels, deduplication and excludes POIs', async () => {
    const fetch = vi.fn(async () => response({ features: [photon('Portland', -70.26, 43.65), photon('Portland', -70.26, 43.65),
      photon('Cafe', -70.25, 43.64, { osm_key: 'amenity', osm_value: 'cafe' }), photon('Bad', NaN, 43)] }));
    const results = await api.searchFlightCities('Portland', { fetch });
    expect(results).toHaveLength(1);
    expect(results[0].label).toBe('Portland, Maine, United States');
    const url = new URL(fetch.mock.calls[0][0]);
    expect(url.searchParams.getAll('layer')).toEqual(['city', 'locality']);
    expect(url.searchParams.get('q')).toBe('Portland');
    expect(url.searchParams.get('limit')).toBe('5');
    expect(fetch.mock.calls[0][1]).toMatchObject({ method: 'GET', credentials: 'omit', referrerPolicy: 'no-referrer' });
    results[0].name = 'Modified';
    results[0].label = 'Modified label';
    const onResults = vi.fn();
    const cached = (await api.searchFlightCities('portland', { fetch, onResults }))[0];
    expect(cached.name).toBe('Portland'); expect(cached.label).toBe('Portland, Maine, United States');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(onResults).not.toHaveBeenCalled();
  });
  it('falls back to local city names when disabled or the service fails', async () => {
    const cities = [['Portland', 43.65, -70.26, 66], ['Portland', 45.52, -122.68, 600]];
    const fetch = vi.fn(async () => { throw new Error('offline'); });
    expect((await api.searchFlightCities('port', { fetch, cities, enabled: false }))).toHaveLength(2);
    expect(fetch).not.toHaveBeenCalled();
    expect((await api.searchFlightCities('Portland', { fetch, cities }))[0].lat).toBe(45.52);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('distinguishes same-name bundled cities with coordinates while keeping unique names compact', async () => {
    const cities = [['London', 42.97, -81.25, 347], ['Londonderry', 54.997, -7.309, 100], ['London', 51.502, -.119, 8567]];
    const results = await api.searchFlightCities('Lon', { enabled: false, cities });
    expect(results.map(item => item.label)).toEqual(['London · 51.50° N, 0.12° W', 'London · 42.97° N, 81.25° W', 'Londonderry']);
    expect(results[0].id).not.toBe(results[1].id);
    expect(results[0].name).toBe('London'); expect(results[1].name).toBe('London');
  });
  it('increases coordinate precision only when nearby same-name places would otherwise look identical', async () => {
    const cities = [['Twin', -12.000011, 73.100011, 100], ['Twin', -12.000022, 73.100022, 50]];
    const results = await api.searchFlightCities('Twin', { enabled: false, cities });
    expect(results.map(item => item.label)).toEqual(['Twin · 12.00001° S, 73.10001° E', 'Twin · 12.00002° S, 73.10002° E']);
    expect(new Set(results.map(item => item.id)).size).toBe(2);
  });
  it('deduplicates repeated destination identities before the five-result limit', async () => {
    const cities = [...Array.from({ length: 7 }, (_, i) => ['Portland', 45.522 + i / 1e8, -122.682, 2000 - i]),
      ['Portland', 43.672, -70.246, 136], ['Port Allen', 30.45, -91.21, 100], ['Port Augusta', -32.49, 137.76, 90], ['Port Louis', -20.16, 57.5, 80]];
    const results = await api.searchFlightCities('Port', { enabled: false, cities });
    expect(results).toHaveLength(5);
    expect(results.slice(0, 2).map(item => item.label)).toEqual(['Portland · 45.52° N, 122.68° W', 'Portland · 43.67° N, 70.25° W']);
    expect(results.slice(2).every(item => item.label === item.name)).toBe(true);
    expect(new Set(results.map(item => item.id)).size).toBe(5);
  });
  it('does not create false ambiguity for duplicate rows at the same place, including the dateline', async () => {
    const cities = [['Dateline', -10, 180, 50], ['Dateline', -10, -180, 50]];
    const results = await api.searchFlightCities('Dateline', { enabled: false, cities });
    expect(results).toHaveLength(1); expect(results[0].label).toBe('Dateline');
  });
  it('keeps disambiguating labels in both the immediate callback and the offline fallback', async () => {
    const cities = [['London', 51.502, -.119, 8567], ['London', 42.97, -81.25, 347]];
    const onResults = vi.fn(), fetch = vi.fn(async () => { throw new Error('offline'); });
    const result = await api.searchFlightCities('London', { cities, onResults, fetch });
    expect(onResults.mock.calls[0][0].map(item => item.label)).toEqual(result.map(item => item.label));
    expect(result.map(item => item.label)).toEqual(['London · 51.50° N, 0.12° W', 'London · 42.97° N, 81.25° W']);
  });
  it('publishes usable bundled results immediately while the live search is pending', async () => {
    const pending = deferred(), fetch = vi.fn(() => pending.promise), onResults = vi.fn();
    const cities = [['Kyoto suburbs', 35.02, 135.75, 3000], ['Kyoto', 35.01, 135.77, 1500]];
    let finished = false;
    const search = api.searchFlightCities('Kyoto', { fetch, cities, onResults }).then(value => { finished = true; return value; });
    expect(onResults).toHaveBeenCalledTimes(1);
    expect(onResults.mock.calls[0][1]).toEqual({ source: 'offline', pending: true });
    expect(onResults.mock.calls[0][0].map(value => value.name)).toEqual(['Kyoto', 'Kyoto suburbs']);
    expect(finished).toBe(false);
    await flush(); expect(fetch).toHaveBeenCalledTimes(1); expect(finished).toBe(false);
    pending.resolve(response({ features: [photon('Kyoto', 135.768, 35.011, { state: 'Kyoto Prefecture', country: 'Japan' })] }));
    expect((await search)[0].label).toBe('Kyoto, Kyoto Prefecture, Japan');
    expect(onResults).toHaveBeenCalledTimes(1);
  });
  it('bounds immediate results and isolates their objects from the fallback result', async () => {
    const cities = Array.from({ length: 7 }, (_, i) => ['Port ' + i, 30 + i, -70, i]);
    const onResults = vi.fn(results => { results[0].name = 'Changed'; results.pop(); });
    const fetch = vi.fn(async () => { throw new Error('offline'); });
    const results = await api.searchFlightCities('Port', { fetch, cities, onResults });
    expect(results).toHaveLength(5);
    expect(results[0].name).toBe('Port 6');
    expect(cities[6][0]).toBe('Port 6');
  });
  it('publishes an empty local list for a new unmatched query without guessing a country', async () => {
    const onResults = vi.fn(), fetch = vi.fn(async () => { throw new Error('offline'); });
    const result = await api.searchFlightCities('Paris, Japan', { fetch, onResults, cities: [['Paris', 48.8566, 2.3522, 2000]] });
    expect(onResults).toHaveBeenCalledWith([], { source: 'offline', pending: true });
    expect(result).toEqual([]);
  });
  it.each([{ enabled: false }, { endpoints: { enabled: false } }, { endpoints: { searchUrl: 'http://example.com' } }])('does no progressive or network work when online search is unavailable: %j', async config => {
    const fetch = vi.fn(), onResults = vi.fn();
    const result = await api.searchFlightCities('Kyoto', { fetch, onResults, cities: [['Kyoto', 35.01, 135.77, 1500]], ...config });
    expect(result).toHaveLength(1); expect(result[0].name).toBe('Kyoto');
    expect(fetch).not.toHaveBeenCalled(); expect(onResults).not.toHaveBeenCalled();
  });
  it('ignores observer failures without disrupting the live search', async () => {
    const onResults = vi.fn(() => { throw new Error('UI observer failed'); });
    const fetch = vi.fn(async () => response({ features: [photon('Kyoto', 135.77, 35.01)] }));
    expect((await api.searchFlightCities('Kyoto', { fetch, onResults }))[0].name).toBe('Kyoto');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('does not publish or fetch an already-cancelled search', async () => {
    const controller = new AbortController(), onResults = vi.fn(), fetch = vi.fn();
    controller.abort();
    await expect(api.searchFlightCities('Kyoto', { fetch, onResults, signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(onResults).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
  });
  it('honors cancellation from the immediate callback before starting a request', async () => {
    const controller = new AbortController(), fetch = vi.fn();
    const onResults = vi.fn(() => controller.abort());
    await expect(api.searchFlightCities('Kyoto', { fetch, onResults, signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(onResults).toHaveBeenCalledTimes(1); expect(fetch).not.toHaveBeenCalled();
  });
  it('aborts a pending live search and never publishes its late results', async () => {
    const pending = deferred(), controller = new AbortController(), onResults = vi.fn();
    const fetch = vi.fn(() => pending.promise);
    const search = api.searchFlightCities('Kyoto', { fetch, onResults, signal: controller.signal, cities: [['Kyoto', 35.01, 135.77, 1500]] });
    const rejected = search.catch(error => error.name);
    await flush(); controller.abort();
    expect(await rejected).toBe('AbortError');
    pending.resolve(response({ features: [photon('Stale result', 135.7, 35)] })); await flush();
    expect(onResults).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
    expect(api.flightCitySearchMemo.size).toBe(0);
  });
  it('ends a stalled name search after eight seconds with its local matches', async () => {
    vi.useFakeTimers(); api.setTimeout = setTimeout; api.clearTimeout = clearTimeout;
    const fetch = vi.fn(() => new Promise(() => {})), onResults = vi.fn();
    let finished = false;
    const search = api.searchFlightCities('Kyoto', { fetch, onResults, cities: [['Kyoto', 35.01, 135.77, 1500]] }).then(result => { finished = true; return result; });
    await flush(); await vi.advanceTimersByTimeAsync(7999);
    expect(finished).toBe(false); expect(fetch.mock.calls[0][1].signal.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect((await search)[0].name).toBe('Kyoto');
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
    expect(onResults).toHaveBeenCalledTimes(1); expect(vi.getTimerCount()).toBe(0);
  });
  it('preserves the twenty-five-second deadline for requests without a search override', async () => {
    vi.useFakeTimers(); api.setTimeout = setTimeout; api.clearTimeout = clearTimeout;
    const fetch = vi.fn(() => new Promise(() => {}));
    let finished = false;
    const result = api.flightCityRequest(fetch, 'https://city-data.example.test/api/interpreter', null, 4 * 1024 * 1024).catch(error => { finished = true; return error.message; });
    await flush(); await vi.advanceTimersByTimeAsync(8000);
    expect(finished).toBe(false); expect(fetch.mock.calls[0][1].signal.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(17000);
    expect(await result).toBe('City service timed out.');
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true); expect(vi.getTimerCount()).toBe(0);
  });
  it('gives separate coordinate-derived identities to results without usable provider ids', async () => {
    const fetch = vi.fn(async () => response({ features: [photon('Portland', -70.26, 43.65, { osm_id: null }),
      photon('Portland', -122.68, 45.52, { osm_id: { unexpected: true } })] }));
    const result = await api.searchFlightCities('Portland', { fetch });
    expect(result).toHaveLength(2); expect(result[0].id).not.toBe(result[1].id);
    expect(result.every(item => item.id.startsWith('city-'))).toBe(true);
  });
  it('rejects insecure endpoint configuration without sending a request', async () => {
    const fetch = vi.fn();
    expect(await api.searchFlightCities('x', { fetch, endpoints: { searchUrl: 'http://example.com' } })).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('paces explicit searches and aborts a waiting search without occupying future slots', async () => {
    vi.useFakeTimers(); api.setTimeout = setTimeout; api.clearTimeout = clearTimeout; api.Date = Date;
    const fetch = vi.fn(async () => response({ features: [] }));
    await api.searchFlightCities('a', { fetch });
    const controller = new AbortController();
    const onResults = vi.fn();
    const waiting = api.searchFlightCities('b', { fetch, onResults, signal: controller.signal, cities: [['Berlin', 52.52, 13.4, 3600]] });
    expect(onResults.mock.calls[0][0][0].name).toBe('Berlin');
    expect(fetch).toHaveBeenCalledTimes(1);
    const caught = waiting.catch(error => error.name); controller.abort();
    expect(await caught).toBe('AbortError');
    const next = api.searchFlightCities('c', { fetch });
    await vi.advanceTimersByTimeAsync(999); expect(fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1); await next; expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe('SkySchool bounded city pack validation', () => {
  it('normalizes metadata without trusting unbounded source metadata', () => {
    const input = pack(); input.metadata.extra = 'untrusted';
    const result = api.validateFlightCityPack(input);
    expect(result.metadata.osmBaseTimestamp).toBe('2026-10-15T00:00:00Z');
    expect(result.metadata.extra).toBeUndefined();
    expect(result.metadata.counts.coordinates).toBe(5);
    result.buildings[0].rings[0][0][0] = 0;
    expect(input.buildings[0].rings[0][0][0]).toBe(-70.261);
  });
  it.each([
    ['outside the bbox', p => p.buildings[0].rings[0][0][0] = 10],
    ['nonfinite height', p => p.buildings[0].heightM = Infinity],
    ['excess height', p => p.buildings[0].heightM = 301],
    ['invalid style', p => p.buildings[0].style = 4],
    ['invalid road width', p => p.roads[0].widthM = -1],
    ['excessive ring', p => p.buildings[0].rings[0] = Array.from({ length: 97 }, () => [-70.26, 43.65])],
    ['excessive building count', p => p.buildings = Array(2501).fill(p.buildings[0])],
    ['excessive road count', p => p.roads = Array(1201).fill(p.roads[0])],
    ['excessive coordinate total', p => p.buildings = Array(2500).fill({ ...p.buildings[0], rings: [Array(13).fill([-70.26, 43.65])] })],
    ['world spanning bbox', p => p.bbox = [-90, -180, 90, 180]],
  ])('rejects cached data with %s', (_, change) => {
    const value = pack(); change(value); expect(api.validateFlightCityPack(value)).toBeNull();
  });
  it('validates wrapped points against a continuous dateline bbox', () => {
    const value = pack({ lat: 0, lon: 179.999, bbox: [-.01, 179.99, .01, 180.01],
      buildings: [{ id: 'way/1', heightM: 7, style: 0, rings: [[[179.999, 0], [-179.999, 0], [179.999, .001]]] }], roads: [] });
    expect(api.validateFlightCityPack(value)).not.toBeNull();
  });
});

describe('SkySchool selected-city loading', () => {
  it('waits for approach, issues one request, and ignores repeated animation frames', async () => {
    const { loader, fetch, convert, cache } = setup();
    loader.select(city, true); loader.approach(0, 0); await flush();
    expect(loader.getState().phase).toBe('waiting'); expect(fetch).not.toHaveBeenCalled();
    for (let i = 0; i < 100; i++) loader.approach(city.lat, city.lon);
    await flush(); expect(fetch).toHaveBeenCalledTimes(1);
    expect(loader.getState()).toMatchObject({ phase: 'ready', source: 'network' });
    expect(convert).toHaveBeenCalledTimes(1); expect(cache.put).toHaveBeenCalledTimes(1);
    const url = new URL(fetch.mock.calls[0][0]);
    expect(url.searchParams.get('data')).toContain('[timeout:20][maxsize:33554432]');
    expect(convert.mock.calls[0][1].bbox[2] - convert.mock.calls[0][1].bbox[0]).toBeCloseTo(1800 / 111320);
    for (let i = 0; i < 100; i++) loader.approach(city.lat, city.lon);
    expect(fetch).toHaveBeenCalledTimes(1); loader.dispose();
  });
  it('uses a nearby built-in district regardless of provider id and makes no request', async () => {
    const { loader, fetch, cache } = setup({ builtinPacks: [pack({ id: 'portland-me' })] });
    loader.select(city, true); loader.approach(city.lat, city.lon); await flush();
    expect(loader.getState()).toMatchObject({ phase: 'ready', source: 'builtin' });
    expect(fetch).not.toHaveBeenCalled(); expect(cache.get).not.toHaveBeenCalled();
  });
  it('loads validated cached geometry when online services are disabled', async () => {
    const { loader, fetch } = setup({ cache: { get: async () => pack(), put: vi.fn() }, endpoints: { overpassUrl: 'https://city-data.example.test/api/interpreter', enabled: false } });
    loader.select(city, true); loader.approach(city.lat, city.lon); await flush();
    expect(loader.getState()).toMatchObject({ phase: 'ready', source: 'cache' }); expect(fetch).not.toHaveBeenCalled();
  });
  it('rejects a cache pack for another location and tolerates unavailable cache storage', async () => {
    const cache = { get: async () => pack({ lat: 0 }), put: async () => { throw new Error('quota'); } };
    const { loader, fetch } = setup({ cache });
    loader.select(city); loader.approach(city.lat, city.lon); await flush();
    await vi.waitFor(() => expect(loader.getState().phase).toBe('ready'));
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('does not request details when disabled and no cached district exists', async () => {
    const { loader, fetch } = setup();
    loader.select(city, false); loader.approach(city.lat, city.lon); await flush(); loader.retry();
    expect(loader.getState().phase).toBe('offline'); expect(fetch).not.toHaveBeenCalled();
  });
  it('respects a host that explicitly disables the default provider', async () => {
    const { loader, fetch } = setup({ endpoints: { provider: 'none' } });
    loader.select(city, true); loader.approach(city.lat, city.lon); await flush(); loader.retry();
    expect(loader.getState().phase).toBe('offline');
    expect(loader.getState().message).toContain('Online city details are off');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('aborts the previous selection and ignores a fetch implementation that resolves after cancellation', async () => {
    const pending = deferred(), fetch = vi.fn(() => pending.promise), { loader, convert } = setup({ fetch });
    loader.select(city); loader.approach(city.lat, city.lon); await flush();
    const signal = fetch.mock.calls[0][1].signal;
    loader.select({ ...city, id: 'next', name: 'Next', lat: 42, lon: -71 }); await flush();
    expect(signal.aborted).toBe(true); pending.resolve(response({ elements: [] })); await flush();
    expect(loader.getState().target.name).toBe('Next'); expect(loader.getState().phase).toBe('waiting');
    expect(convert).not.toHaveBeenCalled(); loader.dispose();
  });
  it('ignores delayed cache results for a different selection', async () => {
    const pending = deferred(), cache = { get: vi.fn(() => pending.promise), put: vi.fn() };
    const { loader } = setup({ cache }); loader.select(city); await flush(); loader.select(null);
    pending.resolve(pack()); await flush(); expect(loader.getState().phase).toBe('idle'); expect(loader.getPack()).toBeNull();
  });
  it('requires manual retry after a service error and enforces a sixty-second cooldown', async () => {
    let clock = 1000; const fetch = vi.fn(async () => response({}, { ok: false }));
    const { loader } = setup({ fetch, now: () => clock });
    loader.select(city); loader.approach(city.lat, city.lon); await flush();
    expect(loader.getState()).toMatchObject({ phase: 'error', retryAt: 61000 });
    clock = 60999; loader.retry(); for (let i = 0; i < 100; i++) loader.approach(city.lat, city.lon);
    await flush(); expect(fetch).toHaveBeenCalledTimes(1);
    clock = 61000; loader.approach(city.lat, city.lon); await flush(); expect(fetch).toHaveBeenCalledTimes(1);
    loader.retry(); await flush(); expect(fetch).toHaveBeenCalledTimes(2); loader.dispose();
  });
  it('cannot bypass a failed request by selecting the same city again or toggling online detail', async () => {
    let clock = 1000; const { loader, fetch } = setup({ fetch: vi.fn(async () => response({}, { ok: false })), now: () => clock });
    loader.select(city); loader.approach(city.lat, city.lon); await flush();
    loader.select(city); loader.approach(city.lat, city.lon); await flush();
    expect(fetch).toHaveBeenCalledTimes(1);
    loader.select(city, false); await flush(); loader.select(city, true); loader.approach(city.lat, city.lon); await flush();
    expect(loader.getState()).toMatchObject({ phase: 'error', retryAt: 61000 }); expect(fetch).toHaveBeenCalledTimes(1);
    clock = 61000; loader.retry(); await flush(); expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('rejects an Overpass remark even when partial elements arrive with HTTP 200', async () => {
    const { loader, convert } = setup({ fetch: async () => response({ elements: [], remark: 'runtime error: Query timed out' }) });
    loader.select(city); loader.approach(city.lat, city.lon); await flush();
    await vi.waitFor(() => expect(loader.getState().phase).toBe('error'));
    expect(convert).not.toHaveBeenCalled();
  });
  it('distinguishes an empty district from a failed request', async () => {
    const { loader } = setup({ convert: (raw, identity) => pack({ ...identity, buildings: [], roads: [] }) });
    loader.select(city); loader.approach(city.lat, city.lon); await flush();
    await vi.waitFor(() => expect(loader.getState()).toMatchObject({ phase: 'empty', source: 'network', pack: null }));
  });
  it('handles converter complexity failures without breaking flight', async () => {
    const { loader } = setup({ convert: () => { throw new Error('City topology work budget exceeded'); } });
    loader.select(city); loader.approach(city.lat, city.lon); await flush();
    await vi.waitFor(() => expect(loader.getState().phase).toBe('error'));
    expect(loader.getPack()).toBeNull();
  });
  it('times out a stalled fetch and cleans up its request', async () => {
    vi.useFakeTimers(); api.setTimeout = setTimeout; api.clearTimeout = clearTimeout;
    const fetch = vi.fn(() => new Promise(() => {})); const { loader } = setup({ fetch });
    loader.select(city); loader.approach(city.lat, city.lon); await flush();
    await vi.advanceTimersByTimeAsync(25000);
    expect(loader.getState().phase).toBe('error'); expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0); loader.dispose();
  });
  it('stops reading after four megabytes even without a content-length header', async () => {
    let reads = 0; const cancel = vi.fn(async () => {});
    const fetch = async () => response({}, { body: { getReader: () => ({ read: async () => { reads++; return { value: new Uint8Array(1024 * 1024), done: false }; }, cancel, releaseLock() {} }) } });
    const { loader, convert } = setup({ fetch }); loader.select(city); loader.approach(city.lat, city.lon); await flush();
    await vi.waitFor(() => expect(loader.getState().phase).toBe('error'));
    expect(reads).toBe(5); expect(cancel).toHaveBeenCalled(); expect(convert).not.toHaveBeenCalled();
  });
  it('rejects oversized declared responses before opening their body', async () => {
    const getReader = vi.fn(); const { loader, fetch } = setup({ fetch: vi.fn(async () => response({}, { headers: { get: () => '99999999' }, body: { getReader } })) });
    loader.select(city); loader.approach(city.lat, city.lon); await flush();
    expect(loader.getState().phase).toBe('error'); expect(getReader).not.toHaveBeenCalled();
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
  });
  it('declines unbounded body reads if a fetch implementation has no stream reader', async () => {
    const text = vi.fn(async () => '{}'), { loader } = setup({ fetch: async () => response({}, { body: null, text }) });
    loader.select(city); loader.approach(city.lat, city.lon); await flush();
    expect(loader.getState().phase).toBe('error'); expect(text).not.toHaveBeenCalled();
  });
  it.each([179.999, -179.999])('splits a dateline query at %s into valid boxes in one request', async lon => {
    const fetch = vi.fn(async () => response({ elements: [] }));
    const convert = vi.fn((raw, identity) => pack({ ...identity, buildings: [], roads: [] }));
    const { loader } = setup({ fetch, convert }); loader.select({ ...city, lat: 0, lon }); loader.approach(0, lon); await flush();
    expect(fetch).toHaveBeenCalledTimes(1);
    const query = new URL(fetch.mock.calls[0][0]).searchParams.get('data');
    const boxes = [...query.matchAll(/\((-?[\d.]+),(-?[\d.]+),(-?[\d.]+),(-?[\d.]+)\)/g)].map(x => x.slice(1).map(Number));
    expect(boxes).toHaveLength(6);
    expect(boxes.every(b => b[1] >= -180 && b[3] <= 180 && b[3] > b[1])).toBe(true);
    expect(convert.mock.calls[0][1].bbox[3] - convert.mock.calls[0][1].bbox[1]).toBeLessThan(.02);
  });
  it('bounds polar longitude coverage instead of issuing a global query', async () => {
    const { loader, convert } = setup({ convert: vi.fn((raw, identity) => pack({ ...identity, buildings: [], roads: [] })) });
    loader.select({ ...city, lat: 90, lon: 0 }); loader.approach(90, 0); await flush();
    const bbox = convert.mock.calls[0][1].bbox;
    expect(bbox[3] - bbox[1]).toBeLessThanOrEqual(3.8); expect(bbox[2]).toBe(90);
  });
  it('disposes in-flight work without late callbacks or new requests', async () => {
    const pending = deferred(), { loader, fetch, onChange } = setup({ fetch: vi.fn(() => pending.promise) });
    loader.select(city); loader.approach(city.lat, city.lon); await flush();
    loader.dispose(); const count = onChange.mock.calls.length;
    pending.resolve(response({ elements: [] })); loader.approach(city.lat, city.lon); loader.retry(); loader.select(city); await flush();
    expect(onChange).toHaveBeenCalledTimes(count); expect(fetch).toHaveBeenCalledTimes(1); expect(loader.getPack()).toBeNull();
  });
});

describe('SkySchool small persistent city cache fallback', () => {
  it('keeps at most three valid packs and expires seven-day-old entries', async () => {
    let clock = 1000; const cache = api.createFlightCityCache(null, { now: () => clock });
    for (let i = 0; i < 4; i++) await cache.put('city' + i, pack());
    expect(await cache.get('city0')).toBeNull(); expect(await cache.get('city1')).not.toBeNull();
    clock += 7 * 86400000;
    expect(await cache.get('city1')).toBeNull(); expect(await cache.get('city3')).toBeNull();
  });
  it('retains its memory cache when indexedDB is unavailable or denied', async () => {
    const indexedDB = { open: vi.fn(() => { throw new Error('SecurityError'); }) };
    const cache = api.createFlightCityCache(indexedDB);
    expect(await cache.put('one', pack())).toBe(true); expect(await cache.get('one')).not.toBeNull();
    expect(await cache.put('two', pack())).toBe(true); expect(indexedDB.open).toHaveBeenCalledTimes(1);
  });
  it('rejects invalid cache writes and does not expose stored objects for mutation', async () => {
    const cache = api.createFlightCityCache(null);
    expect(await cache.put('bad', pack({ lat: NaN }))).toBe(false);
    await cache.put('good', pack()); const first = await cache.get('good'); first.roads[0].points[0][0] = 0;
    expect((await cache.get('good')).roads[0].points[0][0]).toBe(-70.262);
  });
});
