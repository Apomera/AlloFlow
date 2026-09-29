import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'));
vi.setConfig({ testTimeout: 30000, hookTimeout: 45000 });
const NOW = Date.UTC(2026, 8, 28, 19);
const URL = 'https://api.weather.gov/gridpoints/GYX/73,149';
const LAT = 45.58, LON = -69.72;
let sky;
const mounted = [];
const previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
function point(lat = LAT, lon = LON) {
  return { geometry: { type: 'Point', coordinates: [lon, lat] }, properties: { gridId: 'GYX', gridX: 73, gridY: 149, forecastGridData: URL } };
}
function grid() {
  return { id: URL, properties: { updateTime: '2026-09-28T18:44:57+00:00', validTimes: '2026-09-28T18:00:00+00:00/P1DT6H', skyCover: { uom: 'wmoUnit:percent', values: [
    { validTime: '2026-09-28T18:00:00+00:00/PT2H', value: 90 },
    { validTime: '2026-09-28T20:00:00+00:00/PT1H', value: null },
    { validTime: '2026-09-28T21:00:00+00:00/P1DT3H', value: 15 }
  ] } } };
}
function saved(overrides = {}) { return { ...sky.summarizeNwsClouds(grid(), LAT, LON, URL, NOW), ...overrides }; }
function response(json, status = 200) { return { ok: status === 200, status, json: async () => json }; }
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }
async function flush() { for (let i = 0; i < 15; i++) await Promise.resolve(); }
function mount(initial = {}, options = {}) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  let update, live = true;
  function App() {
    const [props, setProps] = React.useState({ lat: LAT, lon: LON, utcMs: NOW, timeZone: 'America/New_York', drift: 0, playing: false, ...initial });
    update = patch => setProps(prev => ({ ...prev, ...patch }));
    return React.createElement(sky.ObservatoryWeatherPanel, { React, resolved: props, t: (key, fallback) => fallback, ...options });
  }
  act(() => root.render(React.createElement(App)));
  const api = { host, patch(patch) { act(() => update(patch)); }, async check() { await act(async () => { host.querySelector('button').click(); await flush(); }); }, unmount() { if (live) { act(() => root.unmount()); host.remove(); live = false; } } };
  mounted.push(api); return api;
}
beforeAll(() => { resetStemLab(); loadTool('stem_lab/stem_tool_astronomy.js', 'astronomy'); sky = window.__alloAstroPure; });
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] }); vi.setSystemTime(NOW); globalThis.IS_REACT_ACT_ENVIRONMENT = true; });
afterEach(() => { mounted.splice(0).forEach(view => view.unmount()); vi.clearAllTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct; });

describe('NWS cloud forecast validation and sampling', () => {
  it('recognizes US regions while excluding the international preset sites', () => {
    for (const [lat, lon] of [[45.58, -69.72], [64.84, -147.72], [20, -157], [18.4, -66], [13.4, 144.8], [-14.3, -170.7]]) expect(sky.nwsCoverageCandidate(lat, lon)).toBe(true);
    for (const [lat, lon] of [[-23, -67.75], [69.65, 18.96], [-.18, -78.47], [-33.87, 151.21], [NaN, 0], [Infinity, 0]]) expect(sky.nwsCoverageCandidate(lat, lon)).toBe(false);
  });
  it('interprets merged NWS intervals and offsets without changing the instant', () => {
    expect(sky.nwsInterval('2026-09-28T14:00:00-04:00/P1DT6H')).toEqual({ start: NOW - 3600000, end: NOW + 29 * 3600000 });
    const data = saved();
    expect(sky.nwsCloudAt(data, NOW)).toBe(90);
    expect(sky.nwsCloudAt(data, NOW + 3600000)).toBeNull();
    expect(sky.nwsCloudAt(data, NOW + 2 * 3600000)).toBe(15);
    expect(sky.nwsCloudAt(data, Date.UTC(2026, 8, 30))).toBeNull();
  });
  it.each(['2026-02-30T12:00:00Z/PT1H', '2026-09-28T24:00:00Z/PT1H', '2026-09-28T12:00:00/PT1H', '2026-09-28T12:00:00Z/P', '2026-09-28T12:00:00Z/PT0H', '2026-09-28T12:00:00Z/P90D'])('rejects invalid interval %s', value => {
    expect(sky.nwsInterval(value)).toBeNull();
  });
  it('rejects forged coordinates or external grid endpoints before fetching them', () => {
    expect(sky.nwsGridUrl(point(), LAT, LON)).toBe(URL);
    expect(() => sky.nwsGridUrl(point(40, -70), LAT, LON)).toThrow(/different location/);
    for (const url of ['https://example.com/gridpoints/GYX/73,149', URL + '?redirect=1', URL + '/forecast', 'http://api.weather.gov/gridpoints/GYX/73,149']) {
      const payload = point(); payload.properties.forecastGridData = url;
      expect(() => sky.nwsGridUrl(payload, LAT, LON)).toThrow(/link/);
    }
  });
  it('rejects a different response grid and invalid metadata', () => {
    expect(() => sky.summarizeNwsClouds({ ...grid(), id: URL + '0' }, LAT, LON, URL, NOW)).toThrow(/match/);
    const payload = grid(); payload.properties.updateTime = '2026-02-30T12:00:00Z';
    expect(() => sky.summarizeNwsClouds(payload, LAT, LON, URL, NOW)).toThrow(/metadata/);
  });
  it.each([-1, 101, '35', Infinity, NaN, undefined])('rejects invalid cloud percentage %j', value => {
    const payload = grid(); payload.properties.skyCover.values[0].value = value;
    expect(() => sky.summarizeNwsClouds(payload, LAT, LON, URL, NOW)).toThrow(/invalid/);
  });
  it('preserves null gaps and refuses all-null, wrong units, overlapping or missing data', () => {
    for (const mutation of [p => { p.skyCover.values.forEach(v => { v.value = null; }); }, p => { p.skyCover.uom = 'wmoUnit:degC'; }, p => { p.skyCover.values.push(p.skyCover.values[0]); }, p => { p.skyCover.values = []; }]) {
      const payload = grid(); mutation(payload.properties);
      expect(() => sky.summarizeNwsClouds(payload, LAT, LON, URL, NOW)).toThrow();
    }
    expect(sky.nwsCloudAt(saved(), NOW + 3600000)).toBeNull();
  });
  it('ties freshness to site, selected UTC instant, provider age and retrieval age', () => {
    expect(sky.nwsCloudStatus(saved(), LAT, LON, NOW, NOW)).toBe('current');
    expect(sky.nwsCloudStatus(saved(), LAT + .00001, LON, NOW, NOW)).toBe('location');
    expect(sky.nwsCloudStatus(saved(), LAT, LON, NOW - 86400000, NOW)).toBe('time');
    expect(sky.nwsCloudStatus(saved(), LAT, LON, NOW + 3600000, NOW)).toBe('time');
    expect(sky.nwsCloudStatus(saved({ updatedAt: NOW - 13 * 3600000 }), LAT, LON, NOW, NOW)).toBe('stale');
    expect(sky.nwsCloudStatus(saved({ fetchedAt: NOW - 7 * 3600000 }), LAT, LON, NOW, NOW)).toBe('stale');
    expect(sky.nwsCloudStatus(saved({ updatedAt: NOW + 3600000 }), LAT, LON, NOW, NOW)).toBe('stale');
  });
});

describe('NWS request lifecycle', () => {
  it('fetches only the selected point and validated official raw grid', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response(point())).mockResolvedValueOnce(response(grid()));
    const result = await sky.requestNwsCloudForecast(LAT, LON, { fetch: fetcher });
    expect(fetcher.mock.calls.map(call => call[0])).toEqual(['https://api.weather.gov/points/45.5800,-69.7200', URL]);
    expect(fetcher.mock.calls[0][1]).toMatchObject({ credentials: 'omit', redirect: 'error' });
    expect(result.siteKey).toBe('45.58,-69.72');
    expect(sky.nwsCloudAt(result, NOW)).toBe(90);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('handles authoritative no-grid responses and makes no request outside broad coverage', async () => {
    const fetcher = vi.fn().mockResolvedValue(response({}, 404));
    await expect(sky.requestNwsCloudForecast(LAT, LON, { fetch: fetcher })).rejects.toMatchObject({ code: 'coverage' });
    await expect(sky.requestNwsCloudForecast(-33.87, 151.21, { fetch: fetcher })).rejects.toMatchObject({ code: 'coverage' });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('times out even when fetch ignores cancellation and AbortController is absent', async () => {
    vi.stubGlobal('AbortController', undefined);
    const result = sky.requestNwsCloudForecast(LAT, LON, { fetch: () => new Promise(() => {}) });
    const check = expect(result).rejects.toThrow(/timed out/);
    await vi.advanceTimersByTimeAsync(20001); await check;
    expect(vi.getTimerCount()).toBe(0);
  });
  it('bounds a stalled grid JSON response within the same deadline', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response(point())).mockResolvedValueOnce({ ok: true, json: () => new Promise(() => {}) });
    const result = sky.requestNwsCloudForecast(LAT, LON, { fetch: fetcher, timeoutMs: 100 });
    const check = expect(result).rejects.toThrow(/timed out/);
    await vi.advanceTimersByTimeAsync(101); await check;
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('aborts without leaving timers or issuing a second request', async () => {
    const waiting = deferred(), fetcher = vi.fn(() => waiting.promise), controller = new AbortController();
    const result = sky.requestNwsCloudForecast(LAT, LON, { fetch: fetcher, signal: controller.signal });
    const check = expect(result).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort(); await check;
    waiting.resolve(response(point())); await flush();
    expect(fetcher.mock.calls.length).toBeLessThanOrEqual(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('Optional observing conditions panel', () => {
  it('uses the host high-contrast surfaces and keeps the disclosure touch target accessible', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response(point())).mockResolvedValueOnce(response(grid())));
    const view = mount({}, { contrast: true, surface: { panel: '#000000', border: '#ffffff' } });
    expect(view.host.querySelector('details').style.background).toBe('rgb(0, 0, 0)');
    expect(view.host.querySelector('summary').style.minHeight).toBe('44px');
    await view.check();
    expect(view.host.querySelector('button').style.background).toBe('rgb(0, 0, 0)');
    expect(view.host.querySelector('[role=listitem]').style.borderColor).toBe('rgb(255, 255, 255)');
  });
  it('makes no request or timer until explicitly checked, including unsupported locations', () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    const view = mount();
    expect(view.host.querySelector('details').open).toBe(false);
    expect(fetcher).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
    view.patch({ lat: -33.87, lon: 151.21 });
    expect(view.host.textContent).toContain('outside that coverage');
    expect(view.host.querySelector('button')).toBeNull(); expect(fetcher).not.toHaveBeenCalled();
  });
  it('shows real values with provenance, respects gaps and historic time, and hides values during playback/deep time', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response(point())).mockResolvedValueOnce(response(grid())));
    const view = mount(); await view.check();
    expect(view.host.textContent).toContain('90%');
    expect(view.host.textContent).toContain('NWS updated');
    expect(view.host.querySelector('a').href).toBe(URL);
    expect(view.host.querySelectorAll('[role=listitem]')).toHaveLength(6);
    view.patch({ utcMs: NOW + 3600000 });
    expect(view.host.textContent).toContain('No cloud forecast is available');
    expect(view.host.textContent).not.toContain('90%');
    view.patch({ utcMs: NOW - 86400000 }); expect(view.host.textContent).toContain('No cloud forecast is available');
    view.patch({ utcMs: NOW, playing: true });
    expect(view.host.textContent).toContain('Pause time-lapse'); expect(view.host.textContent).not.toContain('90%');
    view.patch({ playing: false, drift: 2500 });
    expect(view.host.textContent).toContain('do not apply to deep-time'); expect(view.host.textContent).not.toContain('90%');
  });
  it('keeps a previous snapshot after refresh failure and labels it stale as time passes', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response(point())).mockResolvedValueOnce(response(grid())).mockRejectedValue(new Error('offline'));
    vi.stubGlobal('fetch', fetcher); const view = mount(); await view.check();
    await view.check();
    expect(view.host.textContent).toContain('could not be refreshed'); expect(view.host.textContent).toContain('90%');
    const view2 = mount(); fetcher.mockResolvedValueOnce(response(point())).mockResolvedValueOnce(response(grid())); await view2.check();
    await act(async () => { await vi.advanceTimersByTimeAsync(7 * 3600000); });
    expect(view2.host.textContent).toContain('Saved forecast is stale');
    expect(fetcher).toHaveBeenCalledTimes(5);
  });
  it('discards late results after site change and allows retry when revisiting a cancelled site', async () => {
    const waiting = deferred(); const fetcher = vi.fn().mockReturnValueOnce(waiting.promise).mockResolvedValueOnce(response(point())).mockResolvedValueOnce(response(grid()));
    vi.stubGlobal('fetch', fetcher); const view = mount(); await view.check();
    expect(view.host.querySelector('button').disabled).toBe(true);
    view.patch({ lat: -33.87, lon: 151.21 });
    await act(async () => { waiting.resolve(response(point())); await flush(); });
    expect(view.host.textContent).not.toContain('90%');
    view.patch({ lat: LAT, lon: LON });
    expect(view.host.querySelector('button').disabled).toBe(false);
    await view.check(); expect(view.host.textContent).toContain('90%');
  });
  it('reuses only the matching site snapshot and releases refresh timers on unmount', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response(point())).mockResolvedValueOnce(response(grid())); vi.stubGlobal('fetch', fetcher);
    const view = mount(); await view.check();
    view.patch({ lat: 43.66, lon: -70.26 });
    expect(view.host.textContent).not.toContain('90%'); expect(view.host.textContent).not.toContain('NWS updated');
    view.patch({ lat: LAT, lon: LON });
    expect(view.host.textContent).toContain('90%'); expect(fetcher).toHaveBeenCalledTimes(2);
    view.unmount(); expect(vi.getTimerCount()).toBe(0);
  });
  it('releases the pending deadline after unmount even without AbortController', async () => {
    vi.stubGlobal('AbortController', undefined);
    vi.stubGlobal('fetch', () => new Promise(() => {}));
    const view = mount(); await view.check();
    expect(vi.getTimerCount()).toBe(1);
    view.unmount(); await flush();
    expect(vi.getTimerCount()).toBe(0);
  });
});
