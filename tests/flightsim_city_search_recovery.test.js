import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { TextEncoder, TextDecoder } from 'node:util';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const helperFile = process.env.SKYSCHOOL_CITY_RECOVERY_HELPER || 'dev-tools/skyschool-city-online.js';
const sourceFile = process.env.SKYSCHOOL_CITY_RECOVERY_SOURCE || 'stem_lab/stem_tool_flightsim.js';
const localCities = [['Kyoto', 35.01, 135.77, 1500]];
const copy = value => JSON.parse(JSON.stringify(value));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function response(raw, options = {}) {
  const bytes = new TextEncoder().encode(JSON.stringify(raw)); let sent = false;
  return { ok: true, headers: { get: () => null }, body: { getReader: () => ({
    read: async () => sent ? { done: true } : (sent = true, { done: false, value: bytes }),
    cancel: async () => {}, releaseLock() {},
  }) }, ...options };
}
const remote = (name = 'Kyoto remote') => response({ features: [{
  type: 'Feature', properties: { name, country: 'Japan', osm_key: 'place', osm_value: 'city', osm_type: 'R', osm_id: 234 },
  geometry: { type: 'Point', coordinates: [135.77, 35.01] },
}] });
async function flushPromises() { for (let index = 0; index < 24; index++) await Promise.resolve(); }

describe('city search failure reporting preserves bundled fallback', () => {
  let api;
  beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2099-04-03T00:00:00Z'));
    api = { Map, Set, URL, AbortController, TextEncoder, TextDecoder, Date, setTimeout, clearTimeout };
    runInNewContext(readFileSync(helperFile, 'utf8'), api);
  });
  afterEach(() => vi.useRealTimers());

  it.each(['network', 'http', 'malformed'])('reports %s failure once without dropping or modifying local matches', async kind => {
    const onUnavailable = vi.fn(), onResults = vi.fn(), cities = copy(localCities);
    const fetch = vi.fn(async () => {
      if (kind === 'network') throw new Error('Private provider diagnostic');
      return kind === 'http' ? response({}, { ok: false, status: 503 }) : response({ wrong: 'shape' });
    });
    const results = await api.searchFlightCities('Kyoto', { fetch, cities, onResults, onUnavailable });
    expect(results).toHaveLength(1); expect(results[0].name).toBe('Kyoto');
    expect(cities).toEqual(localCities); expect(onUnavailable).toHaveBeenCalledTimes(1);
    expect(onResults).toHaveBeenCalledTimes(1); expect(onResults.mock.calls[0][1]).toEqual({ source: 'offline', pending: true });
    expect(api.flightCitySearchMemo.size).toBe(0);
  });

  it('reports the bounded timeout as unavailability and releases its request resources', async () => {
    const fetch = vi.fn(() => new Promise(() => {})), onUnavailable = vi.fn();
    const pending = api.searchFlightCities('Kyoto', { fetch, cities: localCities, onUnavailable });
    await flushPromises(); await vi.advanceTimersByTimeAsync(7999);
    expect(onUnavailable).not.toHaveBeenCalled(); expect(fetch.mock.calls[0][1].signal.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect((await pending)[0].name).toBe('Kyoto'); expect(onUnavailable).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true); expect(vi.getTimerCount()).toBe(0);
  });

  it('isolates a failing unavailability observer and still returns its offline result', async () => {
    const onUnavailable = vi.fn(() => { throw new Error('Observer failure'); });
    const results = await api.searchFlightCities('Kyoto', { cities: localCities, fetch: async () => { throw new Error('Offline'); }, onUnavailable });
    expect(results[0].name).toBe('Kyoto'); expect(onUnavailable).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])('does not announce cancellation as service failure; already-aborted=%s', async immediate => {
    const request = deferred(), controller = new AbortController(), onUnavailable = vi.fn(), fetch = vi.fn(() => request.promise);
    if (immediate) controller.abort();
    const search = api.searchFlightCities('Kyoto', { fetch, cities: localCities, signal: controller.signal, onUnavailable });
    const rejection = search.catch(error => error.name);
    await flushPromises(); if (!immediate) controller.abort();
    expect(await rejection).toBe('AbortError'); if (!immediate) request.reject(new Error('Late network failure')); await flushPromises();
    expect(onUnavailable).not.toHaveBeenCalled(); expect(api.flightCitySearchMemo.size).toBe(0);
  });

  it.each([{ enabled: false }, { endpoints: { enabled: false } }, { endpoints: { searchUrl: 'http://insecure.example.test' } }])
    ('does not report intentional offline mode as a failure: %j', async config => {
      const onUnavailable = vi.fn(), fetch = vi.fn();
      const results = await api.searchFlightCities('Kyoto', { fetch, cities: localCities, onUnavailable, ...config });
      expect(results[0].name).toBe('Kyoto'); expect(fetch).not.toHaveBeenCalled(); expect(onUnavailable).not.toHaveBeenCalled();
    });

  it('keeps successful empty results, cached results and manual coordinates distinct from failure', async () => {
    const onUnavailable = vi.fn(), fetch = vi.fn(async () => response({ features: [] }));
    expect(await api.searchFlightCities('Kyoto', { fetch, cities: localCities, onUnavailable })).toEqual([]);
    expect(await api.searchFlightCities('kyoto', { fetch, cities: localCities, onUnavailable })).toEqual([]);
    expect((await api.searchFlightCities('35.01, 135.77', { fetch, onUnavailable }))[0].name).toBe('Custom location');
    expect(fetch).toHaveBeenCalledTimes(1); expect(onUnavailable).not.toHaveBeenCalled();
  });
});

describe('city planner accessible search recovery', () => {
  let tool, host, root, latest, savedRoot, externalPatch, fetchSpy, errors;
  const planner = () => host.querySelector('[data-flightsim-city-planner]');
  const query = () => host.querySelector('#skyschool-city-query');
  const submit = () => planner().querySelector('button[type="submit"]');
  const status = () => planner().querySelector('[data-flight-city-search-status]');
  const results = () => [...planner().querySelectorAll('[data-city-result]')];
  function handler(node, event = 'onClick') { return node[Object.keys(node).find(key => key.startsWith('__reactProps$'))][event]; }
  async function input(value) {
    await act(async () => {
      query().focus(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(query(), value);
      query().dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
  async function click(node) { await act(async () => { node.focus(); node.click(); }); }
  async function patch(value) { await act(async () => externalPatch(value)); }
  async function start(value = 'Kyoto') { await input(value); await click(submit()); }
  async function mount(seed = {}) {
    function App() {
      const [data, setData] = React.useState({ otherTool: { writing: 'Preserve this' }, flightSim: {
        view: 'menu', aircraft: 'cessna172', planDep: 'kpwm', planDest: 'kjfk', cityOnline: true,
        menuSections: { plan: true }, takeoffTutorialDismissed: true, landingTutorialDismissed: true,
        quizScore: 3, quizTotal: 7, ...seed,
      } });
      latest = data.flightSim; savedRoot = data;
      externalPatch = values => setData(old => ({ ...old, flightSim: { ...old.flightSim, ...values } }));
      return tool.render(makeCtx({ toolData: data, setToolData: setData,
        update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
        updateMulti: (id, values) => setData(old => ({ ...old, [id]: { ...old[id], ...values } })),
      }));
    }
    await act(async () => root.render(React.createElement(App)));
    await act(async () => planner().querySelector('summary').click());
  }
  beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2099-04-03T00:00:00Z'));
    resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
    window.SkySchoolCityServices = { searchUrl: 'https://city-search.example.test/api' };
    vi.stubGlobal('TextEncoder', TextEncoder); vi.stubGlobal('TextDecoder', TextDecoder);
    fetchSpy = vi.fn(async () => response({ features: [] })); vi.stubGlobal('fetch', fetchSpy);
    tool = loadTool(sourceFile, 'flightSim');
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({});
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.stubGlobal('cancelAnimationFrame', vi.fn());
    errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  });
  afterEach(async () => {
    if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
    expect(errors).not.toHaveBeenCalled();
    delete window.__RR_TEST_EXPORTS__; delete window.SkySchoolCityServices;
    vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
  });

  it('keeps submit focus while busy and ignores both repeated clicks and implicit form submissions', async () => {
    const request = deferred(); fetchSpy.mockImplementation(() => request.promise); await mount();
    const region = status(); await start(); const action = submit(), signal = fetchSpy.mock.calls[0][1].signal;
    expect(document.activeElement).toBe(action); expect(action.disabled).toBe(false); expect(action.getAttribute('aria-disabled')).toBe('true');
    expect(status()).toBe(region); expect(region.textContent).toBe('Searching…');
    await act(async () => { action.click(); handler(planner().querySelector('form'), 'onSubmit')({ preventDefault() {} }); });
    expect(signal.aborted).toBe(false); expect(fetchSpy).toHaveBeenCalledTimes(1);
    await act(async () => request.resolve(remote()));
    expect(document.activeElement).toBe(action); expect(action.getAttribute('aria-disabled')).toBe('false');
    expect(status()).toBe(region); expect(region.textContent).toBe('City results: 1');
  });

  it('leaves too-short queries focusable but inert for button and form activation', async () => {
    await mount(); await input('K'); const action = submit(); await click(action);
    await act(async () => handler(planner().querySelector('form'), 'onSubmit')({ preventDefault() {} }));
    expect(action.disabled).toBe(false); expect(action.getAttribute('aria-disabled')).toBe('true'); expect(document.activeElement).toBe(action);
    expect(fetchSpy).not.toHaveBeenCalled(); expect(status().textContent).toBe('');
  });

  it.each(['Kyoto', 'zzzyyy-no-such-city'])('reports unavailable search honestly with fallback count for %s, then retries successfully', async name => {
    const first = deferred(); fetchSpy.mockImplementationOnce(() => first.promise).mockImplementationOnce(async () => remote());
    await mount(); const before = copy(savedRoot), region = status(); await start(name); const action = submit();
    await act(async () => first.reject(new Error('Private diagnostic must not reach the learner')));
    expect(status()).toBe(region); expect(region.textContent).toBe('Online city search is unavailable. Offline matches: ' + results().length + '. Try searching again, or enter latitude, longitude.');
    expect(region.textContent).not.toContain('No city found.'); expect(region.textContent).not.toContain('Private diagnostic');
    expect(copy(savedRoot)).toEqual(before); expect(document.activeElement).toBe(action); expect(action.getAttribute('aria-disabled')).toBe('false');
    await act(async () => vi.advanceTimersByTimeAsync(1000)); await click(action);
    expect(status().textContent).toBe('City results: 1'); expect(results()[0].textContent).toContain('Kyoto remote');
    expect(fetchSpy).toHaveBeenCalledTimes(2); expect(copy(savedRoot)).toEqual(before); expect(document.activeElement).toBe(action);
  });

  it('reports a successful empty online response as no matches rather than service failure', async () => {
    await mount(); await start('zzzyyy-no-such-city');
    expect(status().textContent).toContain('No city found.'); expect(status().textContent).not.toContain('unavailable');
    expect(results()).toHaveLength(0); expect(submit().getAttribute('aria-disabled')).toBe('false');
  });

  it('keeps a bundled result selectable after an online failure without changing unrelated progress', async () => {
    fetchSpy.mockRejectedValue(new Error('Offline')); await mount(); await start();
    expect(status().textContent).toContain('Online city search is unavailable.');
    const local = results().find(node => node.textContent === 'Kyoto'); expect(local).toBeTruthy(); await click(local);
    expect(latest.cityDestination.name).toBe('Kyoto'); expect(local.getAttribute('aria-pressed')).toBe('true');
    expect(document.activeElement).toBe(local); expect(savedRoot.otherTool).toEqual({ writing: 'Preserve this' });
    expect([latest.quizScore, latest.quizTotal, latest.planDep, latest.planDest]).toEqual([3, 7, 'kpwm', 'kjfk']);
  });

  it.each(['query', 'online', 'route', 'view'])('retires pending failure feedback after a %s change', async change => {
    const request = deferred(); fetchSpy.mockImplementation(() => request.promise); await mount(); await start();
    const signal = fetchSpy.mock.calls[0][1].signal;
    if (change === 'query') await input('Portland');
    else if (change === 'online') await patch({ cityOnline: false });
    else if (change === 'route') await patch({ planDest: 'kden' });
    else await patch({ view: 'calculator' });
    expect(signal.aborted).toBe(true); const before = copy(savedRoot);
    await act(async () => request.reject(new Error('Late failure')));
    expect(copy(savedRoot)).toEqual(before);
    if (change === 'view') { await patch({ view: 'menu' }); }
    expect(status().textContent).toBe(''); expect(results()).toHaveLength(0);
  });

  it('clears accepted failure feedback when editing the query or turning online search off', async () => {
    fetchSpy.mockRejectedValue(new Error('Offline')); await mount(); await start();
    expect(status().textContent).toContain('unavailable'); await input('Portland'); expect(status().textContent).toBe('');
    await act(async () => vi.advanceTimersByTimeAsync(1000)); await click(submit()); expect(status().textContent).toContain('unavailable');
    await patch({ cityOnline: false }); expect(status().textContent).toBe('');
    await click(submit()); expect(status().textContent).toMatch(/^City results: /); expect(status().textContent).not.toContain('unavailable');
  });
});
