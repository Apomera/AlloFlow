import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { TextEncoder, TextDecoder } from 'node:util';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, host, root, latest, fetchSpy;
const hooks = () => window.__testHooks.flightSim;
const planner = () => host.querySelector('[data-flightsim-city-planner]');
const queryInput = () => host.querySelector('#skyschool-city-query');
const button = text => [...host.querySelectorAll('button')].find(item => item.textContent.trim() === text);
const distanceNm = (a, b) => {
  const rad = Math.PI / 180;
  const h = Math.sin((b.lat - a.lat) * rad / 2) ** 2
    + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lon - a.lon) * rad / 2) ** 2;
  return 3440.065 * 2 * Math.asin(Math.sqrt(h));
};

beforeAll(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  api = window.__RR_TEST_EXPORTS__.flightSim;
});
beforeEach(() => {
  vi.useFakeTimers();
  window.__testHooks = {};
  window.SkySchoolCityServices = { enabled: false };
  fetchSpy = vi.fn(async () => { throw new Error('This integration test must remain offline.'); });
  vi.stubGlobal('fetch', fetchSpy);
  vi.stubGlobal('TextEncoder', TextEncoder); vi.stubGlobal('TextDecoder', TextDecoder);
  // These checks exercise real form events and flight initialization, not RAF
  // scenery. Rendering stays parked so physics cannot move the asserted start.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({});
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null; host?.remove(); host = null;
  delete window.__testHooks; delete window.SkySchoolCityServices;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

async function mount(seed = {}) {
  function App() {
    const [data, setData] = React.useState({ flightSim: {
      view: 'menu', aircraft: 'cessna172', railCollapsed: true,
      takeoffTutorialDismissed: true, landingTutorialDismissed: true, ...seed,
    } });
    latest = data.flightSim;
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
  expect(planner()).toBeTruthy();
  await act(async () => planner().querySelector('summary').click());
}
async function click(element) {
  expect(element).toBeTruthy();
  await act(async () => { element.focus(); element.click(); });
}
async function input(value) {
  const element = queryInput(); expect(element).toBeTruthy();
  await act(async () => {
    element.focus();
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}
function cityResponse(name, lon, lat, country) {
  return cityResponses([{ name, lon, lat, country }]);
}
function cityResponses(cities) {
  const bytes = new TextEncoder().encode(JSON.stringify({ features: cities.map((city, i) => ({
    type: 'Feature', properties: { name: city.name, country: city.country, osm_key: 'place', osm_value: 'city', osm_type: 'R', osm_id: 123 + i },
    geometry: { type: 'Point', coordinates: [city.lon, city.lat] },
  })) }));
  let sent = false;
  return { ok: true, headers: { get: () => null }, body: { getReader: () => ({
    read: async () => sent ? { done: true } : (sent = true, { done: false, value: bytes }),
    cancel: async () => {}, releaseLock() {},
  }) } };
}
const resultButtons = () => [...planner().querySelectorAll('ul[aria-label="City results"] button')];
const resultNamed = (item, name) => item.textContent.trim() === name || item.textContent.startsWith(name + ' · ');
async function selectCity(name) {
  await input(name);
  await click(planner().querySelector('button[type="submit"]'));
  const list = planner().querySelector('ul[aria-label="City results"]');
  expect(list).toBeTruthy();
  const result = [...list.querySelectorAll('button')].find(item => resultNamed(item, name));
  await click(result);
  expect(result.getAttribute('aria-pressed')).toBe('true');
  return latest.cityDestination;
}

describe('SkySchool city planning integration', () => {
  it('enables the default provider without downloading scenery in the planner', async () => {
    delete window.SkySchoolCityServices;
    const row = api.REAL_CITIES.find(item => item[0] === 'London');
    await mount({ cityDestination: { name: 'London', lat: row[1], lon: row[2] } });
    expect(hooks().getCityLoader().getState()).toMatchObject({ phase: 'waiting', target: { name: 'London' } });
    expect(planner().textContent).toContain('Real streets and buildings load near your chosen city.');
    expect(planner().querySelector('input[type="checkbox"]').checked).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('shows a host-disabled online service as unchecked and unavailable to toggle', async () => {
    await mount();
    const checkbox = planner().querySelector('input[type="checkbox"]');
    expect(checkbox.checked).toBe(false);
    expect(checkbox.disabled).toBe(true);
    expect(planner().textContent).not.toContain('Real streets and buildings load near your chosen city.');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('lets the pilot choose an immediate Kyoto match and ignores a late live response', async () => {
    delete window.SkySchoolCityServices;
    vi.setSystemTime(new Date('2099-01-01T00:00:00Z'));
    const pending = deferred(); fetchSpy.mockImplementation(() => pending.promise);
    await mount(); await input('Kyoto');
    await click(planner().querySelector('button[type="submit"]'));
    const submit = planner().querySelector('button[type="submit"]');
    expect(submit.textContent).toBe('Searching…'); expect(submit.disabled).toBe(true);
    const match = resultButtons().find(item => item.textContent === 'Kyoto');
    expect(match).toBeTruthy(); expect(fetchSpy).toHaveBeenCalledTimes(1);
    const signal = fetchSpy.mock.calls[0][1].signal;
    expect(signal.aborted).toBe(false);
    await click(match);
    expect(signal.aborted).toBe(true);
    expect(latest.cityDestination.name).toBe('Kyoto'); expect(latest.view).toBe('menu');
    expect(submit.textContent).toBe('Search'); expect(submit.disabled).toBe(false);
    const chosenId = latest.cityDestination.id;
    await act(async () => pending.resolve(cityResponse('Late Kyoto response', 135.7681, 35.0116, 'Japan')));
    expect(latest.cityDestination.id).toBe(chosenId);
    expect(resultButtons().some(item => item.textContent === 'Kyoto' && item.getAttribute('aria-pressed') === 'true')).toBe(true);
    expect(planner().textContent).not.toContain('Late Kyoto response');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('clears old matches and cancels a slow search when the query changes, then completes the new search', async () => {
    delete window.SkySchoolCityServices;
    vi.setSystemTime(new Date('2099-01-02T00:00:00Z'));
    const first = deferred(), second = deferred();
    fetchSpy.mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise);
    await mount(); await input('London');
    await click(planner().querySelector('button[type="submit"]'));
    expect(resultButtons().some(item => resultNamed(item, 'London'))).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const firstSignal = fetchSpy.mock.calls[0][1].signal;
    await input('Kyoto');
    expect(firstSignal.aborted).toBe(true); expect(resultButtons()).toHaveLength(0);
    const submit = planner().querySelector('button[type="submit"]');
    expect(submit.textContent).toBe('Search'); expect(submit.disabled).toBe(false);
    expect(fetchSpy).toHaveBeenCalledTimes(1); // Editing never launches autocomplete requests.
    await click(submit);
    expect(resultButtons().some(item => item.textContent === 'Kyoto')).toBe(true);
    await act(async () => vi.advanceTimersByTimeAsync(1000));
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    await act(async () => second.resolve(cityResponse('Kyoto', 135.7681, 35.0116, 'Japan')));
    expect(resultButtons().map(item => item.textContent)).toEqual(['Kyoto, Japan']);
    expect(submit.textContent).toBe('Search'); expect(submit.disabled).toBe(false);
    await act(async () => first.resolve(cityResponse('Stale London response', -.1276, 51.5072, 'United Kingdom')));
    expect(queryInput().value).toBe('Kyoto');
    expect(resultButtons().map(item => item.textContent)).toEqual(['Kyoto, Japan']);
    expect(latest.cityDestination).toBeFalsy(); expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('aborts pending city discovery and disposes the loader when the planner unmounts', async () => {
    delete window.SkySchoolCityServices;
    vi.setSystemTime(new Date('2099-01-03T00:00:00Z'));
    const pending = deferred(); fetchSpy.mockImplementation(() => pending.promise);
    await mount(); await input('London');
    await click(planner().querySelector('button[type="submit"]'));
    expect(resultButtons().some(item => resultNamed(item, 'London'))).toBe(true);
    const signal = fetchSpy.mock.calls[0][1].signal, testHooks = hooks(), loader = testHooks.getCityLoader();
    expect(signal.aborted).toBe(false);
    await act(async () => root.unmount()); root = null;
    expect(signal.aborted).toBe(true); expect(hooks()).toBeUndefined(); expect(testHooks.getCityLoader()).toBeNull();
    expect(loader.getState().phase).toBe('idle'); expect(host.childElementCount).toBe(0);
    await act(async () => {
      pending.resolve(cityResponse('Late London response', -.1276, 51.5072, 'United Kingdom'));
      await vi.advanceTimersByTimeAsync(10000);
    });
    expect(host.childElementCount).toBe(0); expect(loader.getState().phase).toBe('idle');
    expect(fetchSpy).toHaveBeenCalledTimes(1); expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps a keyboard-focused local city in place when live results finish', async () => {
    window.SkySchoolCityServices = { searchUrl: 'https://city-search.example.test/focus' };
    vi.setSystemTime(new Date('2099-01-04T00:00:00Z'));
    const pending = deferred(); fetchSpy.mockImplementation(() => pending.promise);
    await mount(); await input('London');
    await click(planner().querySelector('button[type="submit"]'));
    expect(resultButtons().filter(item => resultNamed(item, 'London')).map(item => item.textContent)).toEqual(['London · 51.50° N, 0.12° W', 'London · 42.97° N, 81.25° W']);
    const focused = resultButtons()[1];
    await act(async () => focused.focus());
    expect(document.activeElement).toBe(focused);
    expect(fetchSpy.mock.calls[0][1].signal.aborted).toBe(false);
    await act(async () => pending.resolve(cityResponses([
      { name: 'London', lon: -.1276, lat: 51.5072, country: 'United Kingdom' },
      { name: 'London', lon: -81.249, lat: 42.9849, country: 'Canada' },
      { name: 'London', lon: -84.0833, lat: 37.1283, country: 'United States' },
      { name: 'London', lon: -93.2279, lat: 35.3284, country: 'United States' },
      { name: 'London', lon: -83.4483, lat: 39.8864, country: 'United States' },
    ])));
    expect(document.activeElement).toBe(focused); expect(focused.isConnected).toBe(true);
    expect(resultButtons()[1]).toBe(focused); expect(resultButtons()).toHaveLength(5);
    expect(resultButtons().some(item => item.textContent === 'London, United Kingdom')).toBe(true);
    expect(planner().querySelector('button[type="submit"]').disabled).toBe(false);
    await click(focused);
    expect(latest.cityDestination).toMatchObject({ name: 'London', lat: 42.97, lon: -81.25, label: 'London · 42.97° N, 81.25° W' });
    expect(focused.getAttribute('aria-pressed')).toBe('true');
  });

  it('cancels another pending search when starting a flight to the selected city', async () => {
    window.SkySchoolCityServices = { searchUrl: 'https://city-search.example.test/start-flight' };
    vi.setSystemTime(new Date('2099-01-05T00:00:00Z'));
    const first = deferred(), second = deferred();
    fetchSpy.mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise);
    await mount(); const selected = await selectCity('Kyoto');
    expect(fetchSpy.mock.calls[0][1].signal.aborted).toBe(true);
    await input('London'); await click(planner().querySelector('button[type="submit"]'));
    await act(async () => vi.advanceTimersByTimeAsync(1000));
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const pendingSignal = fetchSpy.mock.calls[1][1].signal;
    expect(pendingSignal.aborted).toBe(false);
    await click(button('Fly near city'));
    expect(pendingSignal.aborted).toBe(true); expect(latest.view).toBe('flying');
    expect(hooks().getFlightPlanRef().current.destination.id).toBe(selected.id);
    expect(distanceNm(hooks().flightRef.current, selected)).toBeCloseTo(2, 5);
    await act(async () => second.resolve(cityResponse('Late London response', -.1276, 51.5072, 'United Kingdom')));
    expect(latest.cityDestination.id).toBe(selected.id);
    expect(hooks().getFlightPlanRef().current.destination.id).toBe(selected.id);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('lets the pilot distinguish and select the second offline London by its visible label', async () => {
    await mount(); await input('London');
    await click(planner().querySelector('button[type="submit"]'));
    expect(resultButtons().filter(item => resultNamed(item, 'London')).map(item => item.textContent)).toEqual(['London · 51.50° N, 0.12° W', 'London · 42.97° N, 81.25° W']);
    const canada = resultButtons()[1]; await click(canada);
    expect(latest.cityDestination).toMatchObject({ name: 'London', lat: 42.97, lon: -81.25, label: canada.textContent });
    expect(canada.getAttribute('aria-pressed')).toBe('true'); expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('finds and selects an offline geographic city without downloading scenery or starting flight', async () => {
    await mount();
    const selected = await selectCity('London');
    const row = api.REAL_CITIES.find(item => item[0] === 'London');
    expect(row).toBeTruthy();
    expect(selected).toMatchObject({ name: 'London', code: 'CITY', isCity: true });
    expect(selected.lat).toBeCloseTo(row[1], 7); expect(selected.lon).toBeCloseTo(row[2], 7);
    expect(latest.view).toBe('menu'); expect(hooks().flyingRef.current).toBe(false);
    expect(hooks().getCityLoader().getState()).toMatchObject({ phase: 'offline', target: { name: 'London' } });
    expect(hooks().getCityPacks().map(pack => pack.id)).toEqual(api.FLIGHT_CITY_DISTRICTS.map(pack => pack.id));
    expect(fetchSpy).not.toHaveBeenCalled();
    await click(button('Clear city'));
    expect(latest.cityDestination).toBeNull();
    expect(hooks().getCityLoader().getState().phase).toBe('idle');
  });

  it('starts the selected airliner near the city with terrain clearance, flying speed, trim and a CITY route', async () => {
    await mount({ aircraft: 'boeing737' });
    const selected = await selectCity('Denver');
    await click(button('Fly near city'));
    const flight = hooks().flightRef.current, controls = hooks().controlsRef.current;
    const aircraft = api.AIRCRAFT.find(item => item.id === 'boeing737');
    const ground = api.getFlightGroundElevation(flight.lat, flight.lon);
    expect(latest.view).toBe('flying'); expect(hooks().flyingRef.current).toBe(true);
    expect(flight.onGround).toBe(false);
    expect(hooks().getCitySolarFrame().solarHour).toBeCloseTo(12, 5);
    expect(hooks().timeRef.current).toBe(0);
    expect(distanceNm(flight, selected)).toBeCloseTo(2, 5);
    expect(flight.altitude - ground).toBeGreaterThanOrEqual(1999);
    expect(flight.altitude).toBeLessThan(aircraft.ceiling);
    expect(flight.fieldElev).toBeCloseTo(ground, 4);
    expect(flight.speed * 0.5924838).toBeGreaterThan(130); // Not the old universal 110-knot exercise start.
    expect(flight.speed * 0.5924838).toBeLessThan(aircraft.maxSpeed);
    expect(controls.throttle).toBeGreaterThan(0); expect(controls.throttle).toBeLessThanOrEqual(0.95);
    expect(Number.isFinite(controls.pitch)).toBe(true); expect(Math.abs(controls.pitch)).toBeLessThan(10);
    expect(hooks().getFlightPlanRef().current.destination).toMatchObject({ ...selected, code: 'CITY' });
    expect(hooks().getFlightPlanRef().current.route).toHaveLength(2);
    expect(hooks().getFlightPlanRef().current.departure.code).toBe('START');
    expect(document.activeElement).toBe(host.querySelector('canvas[role="application"]'));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('departs from the chosen From airport on the runway while keeping the city as the destination', async () => {
    await mount();
    const selected = await selectCity('London');
    const departure = host.querySelector('select[aria-label="Departure airport"]');
    expect(departure).toBeTruthy();
    await act(async () => {
      departure.value = 'kden';
      departure.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(latest.planDep).toBe('kden');
    await click(button('Depart toward city'));
    const airport = api.WAYPOINTS.find(item => item.id === 'kden');
    const flight = hooks().flightRef.current, plan = hooks().getFlightPlanRef().current;
    expect(latest.view).toBe('flying'); expect(flight.onGround).toBe(true);
    expect(distanceNm(flight, airport)).toBeLessThan(1);
    expect(distanceNm(flight, selected)).toBeGreaterThan(1000);
    expect(flight.altitude).toBe(airport.alt); expect(flight.fieldElev).toBe(airport.alt);
    expect(flight.speed).toBe(0); expect(hooks().controlsRef.current.throttle).toBe(0);
    expect(plan.departure.id).toBe('kden'); expect(plan.destination).toMatchObject(selected);
    expect(plan.route.map(point => point.code)).toEqual([airport.code, 'CITY']);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('keeps city entry accessible, keyboard-owned by the form, and able to wrap on narrow screens', async () => {
    await mount();
    const details = planner(), field = queryInput(), submit = details.querySelector('button[type="submit"]');
    expect(details.tagName).toBe('DETAILS'); expect(details.open).toBe(true);
    expect(field.labels).toHaveLength(1);
    expect(field.labels[0].textContent).toContain('City name');
    expect(field.maxLength).toBe(120); expect(field.parentElement.style.flexWrap).toBe('wrap');
    expect(parseFloat(field.style.minWidth)).toBe(0); expect(submit.disabled).toBe(true);
    const controlsBefore = { ...hooks().controlsRef.current };
    await input('L'); expect(submit.disabled).toBe(true);
    await input('London'); expect(submit.disabled).toBe(false);
    expect(document.activeElement).toBe(field);
    for (const key of ['w', 'ArrowUp', ' ', 'Enter']) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      field.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
    }
    expect(hooks().keysRef.current).toEqual({}); expect(hooks().controlsRef.current).toEqual(controlsBefore);
    // jsdom does not perform a browser's implicit Enter submission. Dispatch
    // the form submit event to exercise the same production handler.
    await act(async () => field.form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(details.querySelector('ul[aria-label="City results"] li button')).toBeTruthy();
    expect(latest.view).toBe('menu'); expect(fetchSpy).not.toHaveBeenCalled();
  });
});
