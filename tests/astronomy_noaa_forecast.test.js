import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, newStore, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

vi.setConfig({ testTimeout: 30000, hookTimeout: 45000 });
const NOW = Date.UTC(2026, 8, 27, 16, 0);
let sky, tool;
function grid(probability = 30) {
  return {
    'Observation Time': '2026-09-27T15:30:00Z',
    'Forecast Time': '2026-09-27T16:20:00Z',
    coordinates: Array.from({ length: 181 }, (_, i) => [290, i - 90, i - 90 === 62 ? probability : 0])
  };
}
function saved(overrides = {}) {
  return { ...sky.summarizeOvation(grid(), 45.58, -69.72), fetchedAt: NOW, ...overrides };
}
function render(state = {}) {
  return renderTool('astronomy', { astronomy: { tab: 'observatory', observingList: [], obsSettingsOpen: true, ...state } });
}
function button(node, label) {
  if (!node || typeof node !== 'object') return null;
  if (node.type === 'button' && JSON.stringify(node.props.children).includes(label)) return node;
  for (const child of [node.props?.children].flat(Infinity)) {
    const result = button(child, label);
    if (result) return result;
  }
  return null;
}
function interactive() {
  const store = newStore();
  store.toolData = { astronomy: { tab: 'observatory', observingList: [], obsSettingsOpen: true } };
  return {
    store,
    check: () => button(tool.render(makeCtx({}, store)), 'Check NOAA aurora forecast').props.onClick()
  };
}
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}
async function flush() { for (let i = 0; i < 12; i++) await Promise.resolve(); }

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  vi.setSystemTime(NOW);
  resetStemLab();
  tool = loadTool('stem_lab/stem_tool_astronomy.js', 'astronomy');
  sky = window.__alloAstroPure;
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('NOAA model data validation and scope', () => {
  it('samples the correct wrapped longitude and interprets unzoned NOAA times as UTC', () => {
    const payload = grid();
    payload['Observation Time'] = '2026-09-27 15:30:00';
    const summary = sky.summarizeOvation(payload, 45.58, -69.72);
    expect(summary).toMatchObject({ gridLon: 290, gridLat: 46, ovalLat: 62, ovalProb: 30, siteProb: 0, observationTime: '2026-09-27T15:30:00Z' });
    expect(sky.ovationStatus({ ...summary, fetchedAt: NOW }, 45.58, -69.72, NOW)).toBe('current');
  });

  it('rejects missing, truncated, duplicate and nonnumeric cells instead of reporting 0%', () => {
    expect(() => sky.summarizeOvation({}, 45.58, -69.72)).toThrow();
    expect(() => sky.summarizeOvation({ ...grid(), coordinates: [] }, 45.58, -69.72)).toThrow();
    expect(() => sky.summarizeOvation({ ...grid(), coordinates: grid().coordinates.slice(0, 90) }, 45.58, -69.72)).toThrow(/incomplete/);
    const duplicate = grid(); duplicate.coordinates.push([290, 46, 5]);
    expect(() => sky.summarizeOvation(duplicate, 45.58, -69.72)).toThrow(/duplicate/);
    for (const invalid of [null, '40', -1, 101, Infinity, NaN]) {
      const payload = grid(); payload.coordinates[100][2] = invalid;
      expect(() => sky.summarizeOvation(payload, 45.58, -69.72)).toThrow(/invalid/);
    }
  });

  it('rejects malformed, impossible and reversed provider timestamps', () => {
    for (const invalid of ['', null, '2026-02-30T15:30:00Z', 'invalid']) {
      expect(() => sky.summarizeOvation({ ...grid(), 'Observation Time': invalid }, 45.58, -69.72)).toThrow(/timestamps/);
    }
    expect(() => sky.summarizeOvation({ ...grid(), 'Forecast Time': '2026-09-27T15:00:00Z' }, 45.58, -69.72)).toThrow(/timestamps/);
  });

  it('uses provider freshness and refuses forecasts sampled for another site', () => {
    expect(sky.ovationStatus(saved(), 45.58, -69.72, NOW)).toBe('current');
    expect(sky.ovationStatus(saved(), -33.87, 151.21, NOW)).toBe('location');
    expect(sky.ovationStatus(saved({ observationTime: '2026-09-27T12:30:00Z', forecastTime: '2026-09-27T13:20:00Z' }), 45.58, -69.72, NOW)).toBe('stale');
    expect(sky.ovationStatus(saved({ observationTime: '2026-09-27T17:30:00Z', forecastTime: '2026-09-27T18:20:00Z' }), 45.58, -69.72, NOW)).toBe('stale');
    expect(sky.ovationStatus(saved({ forecastTime: '2026-09-27T15:29:00Z' }), 45.58, -69.72, NOW)).toBe('unavailable');
    expect(sky.ovationStatus({ loading: true }, 45.58, -69.72, NOW)).toBe('unavailable');
    expect(sky.ovationStatus({ loading: true, requestStartedAt: NOW - 30000 }, 45.58, -69.72, NOW)).toBe('unavailable');
  });

  it('disables forecast application until valid data is available and explains provenance', () => {
    const doc = new DOMParser().parseFromString(render({ obsNoaa: { siteProb: 'bad', fetchedAt: NOW } }), 'text/html');
    const apply = [...doc.querySelectorAll('button')].find(el => el.textContent.includes('Drive the aurora layer'));
    expect(apply.disabled).toBe(true);
    expect(doc.body.textContent).toContain('NOAA forecast unavailable');
    expect(doc.body.textContent).not.toContain('NaN');
    expect(doc.querySelector('a[href="https://www.swpc.noaa.gov/products/aurora-30-minute-forecast"]')).toBeTruthy();
    expect(doc.body.textContent).toContain('Values sample a 1° grid');
  });

  it('uses the forecast for the current live sky and removes it during time-lapse', () => {
    const state = { obsLive: true, obsNoaa: saved(), obsNoaaApply: true };
    const live = new DOMParser().parseFromString(render(state), 'text/html');
    const liveApply = [...live.querySelectorAll('button')].find(el => el.textContent.includes('Drive the aurora layer'));
    expect(liveApply.disabled).toBe(false);
    expect(liveApply.getAttribute('aria-pressed')).toBe('true');
    const accelerated = new DOMParser().parseFromString(render({ ...state, obsPlaying: true }), 'text/html');
    const apply = [...accelerated.querySelectorAll('button')].find(el => el.textContent.includes('Drive the aurora layer'));
    expect(apply.disabled).toBe(true);
    expect(apply.getAttribute('aria-pressed')).toBe('false');
    expect(accelerated.body.textContent).toContain('pause time-lapse');
    expect(accelerated.querySelector('input[aria-label="Simulated aurora activity (0 off to 9 extreme)"]').disabled).toBe(false);
  });
});

describe('NOAA request lifecycle', () => {
  it('keeps the latest request when an older response arrives last', async () => {
    const first = deferred(), second = deferred();
    vi.stubGlobal('fetch', vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise));
    const { store, check } = interactive();
    check(); check();
    await flush();
    second.resolve({ ok: true, json: async () => grid(70) });
    await flush();
    expect(store.toolData.astronomy.obsNoaa.ovalProb).toBe(70);
    first.resolve({ ok: true, json: async () => grid(10) });
    await flush();
    expect(store.toolData.astronomy.obsNoaa.ovalProb).toBe(70);
  });

  it('does not restore old results after tool state is reset', async () => {
    const pending = deferred();
    vi.stubGlobal('fetch', () => pending.promise);
    const { store, check } = interactive();
    check(); await flush();
    store.toolData = {};
    pending.resolve({ ok: true, json: async () => grid() });
    await flush();
    expect(store.toolData).toEqual({});
  });

  it('times out even without AbortController and permits retry', async () => {
    vi.stubGlobal('AbortController', undefined);
    vi.stubGlobal('fetch', () => new Promise(() => {}));
    const { store, check } = interactive();
    check(); await flush();
    await vi.advanceTimersByTimeAsync(20001);
    expect(store.toolData.astronomy.obsNoaa.error).toContain('timed out');
    expect(store.toolData.astronomy.obsNoaa.loading).toBeUndefined();
    const retry = button(tool.render(makeCtx({}, store)), 'Check NOAA aurora forecast');
    expect(retry.props.disabled).toBe(false);
  });

  it('surfaces invalid fetched data as unavailable instead of a successful zero forecast', async () => {
    vi.stubGlobal('fetch', async () => ({ ok: true, json: async () => ({}) }));
    const { store, check } = interactive();
    check(); await flush();
    expect(store.toolData.astronomy.obsNoaa.error).toContain('timestamps');
    expect(store.toolData.astronomy.obsNoaa.siteProb).toBeUndefined();
  });
});
