import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'));
vi.setConfig({ testTimeout: 30000, hookTimeout: 45000 });
let source, asset, api, host, root;
const priorActFlag = globalThis.IS_REACT_ACT_ENVIRONMENT;

beforeAll(() => {
  asset = JSON.parse(readFileSync('stem_lab/assets/astronomy/hyg-v41-naked-eye.json', 'utf8'));
  source = readFileSync('stem_lab/stem_tool_astronomy.js', 'utf8').replace(
    '  // Linear space motion in the equatorial J2000 frame.',
    '  window.__catalogForTest = { load: loadObservatoryCatalog, useCatalog: useObservatoryCatalog };\n  // Linear space motion in the equatorial J2000 frame.'
  );
});
beforeEach(() => {
  vi.useFakeTimers();
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab();
  new Function(source)();
  api = window.__catalogForTest;
  host = null; root = null;
});
afterEach(() => {
  if (root) act(() => root.unmount());
  if (host) host.remove();
  vi.clearAllTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
  globalThis.IS_REACT_ACT_ENVIRONMENT = priorActFlag;
  delete window.__catalogForTest;
});

function response(json = asset) { return { ok: true, json: async () => json }; }
function mountCatalog() {
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  let value;
  function Probe() {
    value = api.useCatalog(React);
    return React.createElement('button', { disabled: value.loading, onClick: value.retry }, value.loading ? 'loading' : value.catalog.fallback ? 'fallback' : 'full');
  }
  act(() => root.render(React.createElement(Probe)));
  return { get current() { return value; } };
}

describe('Star catalog validation and bounded loading', () => {
  it('loads the complete bundled scientific catalog and shares concurrent requests', async () => {
    const fetch = vi.fn().mockResolvedValue(response()); vi.stubGlobal('fetch', fetch);
    const first = api.load(), second = api.load();
    expect(first).toBe(second);
    const cat = await first;
    expect(cat.count).toBe(8920);
    expect(cat.fallback).toBeUndefined();
    expect(cat.names[32349]).toBe('Sirius');
    expect(await api.load()).toBe(cat);
    expect(fetch).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    ['nonnumeric right ascension', row => { row[1] = 'bad'; }],
    ['missing right ascension', row => { row[1] = null; }],
    ['out-of-range declination', row => { row[2] = 95; }],
    ['nonfinite magnitude', row => { row[3] = Infinity; }],
    ['overflowing magnitude', row => { row[3] = 1e100; }],
    ['negative distance', row => { row[6] = -1; }],
    ['invalid motion', row => { row[8] = NaN; }]
  ])('uses the finite bright-star fallback for %s', async (_name, change) => {
    const corrupted = JSON.parse(JSON.stringify(asset)); change(corrupted.stars[0]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(corrupted)));
    const cat = await api.load();
    expect(cat.fallback).toBe(true);
    const horizon = window.__alloAstroPure.catalogHorizon(cat, 3, 45, 10000, 600);
    expect(Array.from(horizon.positions).every(Number.isFinite)).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('rejects invalid velocity scales and ignores malformed name metadata', () => {
    const pure = window.__alloAstroPure;
    expect(() => pure.normalizeCatalog({ ...asset, velocityScale: -1 })).toThrow('velocity scale');
    expect(() => pure.normalizeCatalog({ ...asset, velocityScale: Infinity })).toThrow('velocity scale');
    const cat = pure.normalizeCatalog({ ...asset, names: { 32349: { invalid: true }, 30438: 'Canopus' } });
    expect(cat.names[32349]).toBeUndefined();
    expect(cat.names[30438]).toBe('Canopus');
  });

  it.each([true, false])('times out a stalled request and permits retry (AbortController: %s)', async withAbort => {
    if (!withAbort) vi.stubGlobal('AbortController', undefined);
    let finishOld;
    const fetch = vi.fn().mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; })).mockResolvedValue(response());
    vi.stubGlobal('fetch', fetch);
    const pending = api.load();
    await vi.advanceTimersByTimeAsync(12000);
    expect((await pending).fallback).toBe(true);
    if (withAbort) expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
    const recovered = await api.load();
    expect(recovered.count).toBe(8920);
    finishOld(response({ ...asset, source: 'Late stale response' }));
    await Promise.resolve(); await Promise.resolve();
    expect(await api.load()).toBe(recovered);
    expect(recovered.source).not.toBe('Late stale response');
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('also bounds a response whose JSON body never finishes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => new Promise(() => {}) }));
    const pending = api.load();
    await vi.advanceTimersByTimeAsync(12000);
    expect((await pending).fallback).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('Mounted star catalog recovery', () => {
  it('retries in place without remounting when the user requests the full catalog', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(response());
    vi.stubGlobal('fetch', fetch);
    const view = mountCatalog();
    await act(async () => { await Promise.resolve(); });
    expect(view.current.catalog.fallback).toBe(true);
    expect(view.current.loading).toBe(false);
    act(() => host.querySelector('button').click());
    expect(view.current.loading).toBe(true);
    await act(async () => { await Promise.resolve(); });
    expect(view.current.catalog.count).toBe(8920);
    expect(view.current.loading).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1][1].cache).toBe('reload');
  });

  it('recovers on reconnect and stops observing network changes after unmount', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(response());
    vi.stubGlobal('fetch', fetch);
    const remove = vi.spyOn(window, 'removeEventListener');
    const view = mountCatalog();
    await act(async () => { await Promise.resolve(); });
    expect(view.current.catalog.fallback).toBe(true);
    await act(async () => { window.dispatchEvent(new Event('online')); });
    expect(view.current.catalog.count).toBe(8920);
    act(() => root.unmount()); root = null;
    expect(remove.mock.calls.some(([event]) => event === 'online')).toBe(true);
    window.dispatchEvent(new Event('online'));
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });
});
