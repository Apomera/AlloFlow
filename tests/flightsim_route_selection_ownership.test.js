import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TextEncoder, TextDecoder } from 'node:util';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, root, host, latest, savedRoot, externalPatch, poke, pending, replayChecks, errors, xp, fetchSpy, expectedFetchCalls;
const copy = value => JSON.parse(JSON.stringify(value));
const hooks = () => window.__testHooks.flightSim;
const planner = () => host.querySelector('[data-flightsim-city-planner]');
const query = () => host.querySelector('#skyschool-city-query');
const button = (text, within = host) => [...within.querySelectorAll('button')].find(node => node.textContent.trim() === text);
const departure = () => host.querySelector('#skyschool-route-from');
const destination = () => host.querySelector('#skyschool-route-to');
const london = () => api.getFlightCityTarget({ name: 'London', lat: 51.5, lon: -.12 });
const paris = () => api.getFlightCityTarget({ name: 'Paris', lat: 48.86, lon: 2.35 });
function handler(node, name = 'onClick') {
  expect(node).toBeTruthy();
  return node[Object.keys(node).find(key => key.startsWith('__reactProps$'))][name];
}
const change = (node, value) => {
  const run = handler(node, 'onChange'); return () => run({ target: { value } });
};
async function run(action) { await act(async () => action()); }
async function patch(values) { await act(async () => externalPatch(values)); }
async function commit(count = 1) {
  expect(pending.length).toBeGreaterThanOrEqual(count);
  const batch = pending.splice(0, count); await act(async () => batch.forEach(apply => apply()));
}
async function flush() {
  for (let count = 0; pending.length; count++) { expect(count).toBeLessThan(40); await commit(); }
}
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}
function lateCityResponse() {
  const bytes = new TextEncoder().encode(JSON.stringify({ features: [{ type: 'Feature',
    properties: { name: 'Late Kyoto response', country: 'Japan', osm_key: 'place', osm_value: 'city', osm_type: 'R', osm_id: 123 },
    geometry: { type: 'Point', coordinates: [135.7681, 35.0116] },
  }] }));
  let sent = false;
  return { ok: true, headers: { get: () => null }, body: { getReader: () => ({
    read: async () => sent ? { done: true } : (sent = true, { done: false, value: bytes }),
    cancel: async () => {}, releaseLock() {},
  }) } };
}
async function search(name) {
  await run(change(query(), name));
  await act(async () => { handler(planner().querySelector('form'), 'onSubmit')({ preventDefault() {} }); });
  const result = [...planner().querySelectorAll('[data-city-result]')]
    .find(node => node.textContent === name || node.textContent.startsWith(name + ' · ') || node.textContent.startsWith(name + ', '));
  expect(result, 'Offline city result: ' + name).toBeTruthy(); return result;
}
async function capture(action) {
  if (action === 'departure') return change(departure(), 'kden');
  if (action === 'destination') return change(destination(), 'ksfo');
  if (action === 'city') return handler(await search('Kyoto'));
  return handler(button('Clear city', planner()));
}
function foreign(change) {
  if (change === 'plan') return { planDep: 'kjfk', planDest: 'kden', teacherMarker: 'new airport plan' };
  if (change === 'city') return { cityDestination: paris(), teacherMarker: 'new city' };
  return { view: 'calculator', teacherMarker: 'new view' };
}
async function mount(seed = {}, options = {}) {
  if (root) await act(async () => root.unmount()); host?.remove();
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host); pending = [];
  function App() {
    const [data, setData] = React.useState({ otherTool: { writing: 'Preserve unrelated work.' }, flightSim: {
      view: 'menu', aircraft: 'cessna172', planDep: 'kpwm', planDest: 'kjfk', cityDestination: london(), cityOnline: false,
      menuSections: { plan: true }, railCollapsed: true, takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      teacherMarker: 'original', quizScore: 3, quizTotal: 7, ...seed,
    } });
    const [, renderLocal] = React.useState(0);
    latest = data.flightSim; savedRoot = data; poke = () => renderLocal(value => value + 1);
    externalPatch = values => setData(old => ({ ...old, flightSim: { ...old.flightSim, ...values } }));
    const submit = update => {
      const apply = () => setData(previous => {
        if (typeof update !== 'function') return update;
        const before = JSON.stringify(previous), first = update(previous), second = update(previous);
        replayChecks.push({ immutable: JSON.stringify(previous) === before, stable: JSON.stringify(first) === JSON.stringify(second) });
        if (options.cloneAtCommit && second !== previous) return { ...second, flightSim: copy(second.flightSim) };
        return second;
      });
      if (options.delayed) pending.push(apply); else apply();
    };
    return tool.render(makeCtx({ toolData: data, setToolData: options.legacyHost ? undefined : submit, awardXP: xp,
      update: (id, name, value) => submit(old => ({ ...old, [id]: { ...old[id], [name]: value } })),
      updateMulti: (id, values) => submit(old => ({ ...old, [id]: { ...old[id], ...values } })),
    }));
  }
  await act(async () => root.render(options.strict ? React.createElement(React.StrictMode, null, React.createElement(App)) : React.createElement(App)));
  expect(planner()).toBeTruthy();
}
beforeEach(() => {
  vi.useFakeTimers(); resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {};
  window.SkySchoolCityServices = { enabled: false };
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); api = window.__RR_TEST_EXPORTS__.flightSim;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({});
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.stubGlobal('TextEncoder', TextEncoder); vi.stubGlobal('TextDecoder', TextDecoder);
  fetchSpy = vi.fn(async () => { throw new Error('Route ownership checks must stay offline.'); }); vi.stubGlobal('fetch', fetchSpy);
  expectedFetchCalls = 0; replayChecks = []; errors = vi.spyOn(console, 'error').mockImplementation(() => {}); xp = vi.fn();
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  expect(errors).not.toHaveBeenCalled(); expect(xp).not.toHaveBeenCalled(); expect(fetchSpy).toHaveBeenCalledTimes(expectedFetchCalls);
  expect(replayChecks.every(item => item.immutable && item.stable)).toBe(true);
  delete window.__RR_TEST_EXPORTS__; delete window.__testHooks; delete window.SkySchoolCityServices;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('Sky School route selection ownership', () => {
  it.each(['departure', 'destination', 'city', 'clear'].flatMap(action => ['committed', 'pending'].flatMap(timing =>
    ['plan', 'city', 'view'].map(change => [action, timing, change]))))
    ('rejects an old %s after a %s host replacement of %s', async (action, timing, change) => {
      await mount(); const old = await capture(action), original = copy(latest), replacement = foreign(change);
      if (timing === 'committed') { await patch(replacement); await run(old); }
      else await act(async () => { externalPatch(replacement); old(); });
      expect(latest).toEqual({ ...original, ...replacement });
      expect(savedRoot.otherTool).toEqual({ writing: 'Preserve unrelated work.' });
    });

  it.each(['departure', 'destination', 'city', 'clear'].flatMap(action => ['plan', 'city', 'view', 'A to B to A'].map(change => [action, change])))
    ('rejects an accepted delayed %s after a host %s replacement', async (action, change) => {
      await mount({}, { delayed: true, strict: true }); const original = copy(latest), actionFn = await capture(action);
      await run(actionFn); expect(pending).toHaveLength(1);
      if (change === 'A to B to A') { await patch(foreign('plan')); await patch(original); }
      else await patch(foreign(change));
      const before = copy(latest); await flush(); expect(latest).toEqual(before);
    });

  it.each(['departure', 'destination', 'city', 'clear'])('retires retained %s callbacks after a committed menu to calculator to menu visit', async action => {
    await mount(); const old = await capture(action), original = copy(latest);
    await patch({ view: 'calculator' }); await patch({ view: 'menu' }); await run(old); expect(latest).toEqual(original);
    await run(await capture(action));
    if (action === 'departure') expect(latest.planDep).toBe('kden');
    else if (action === 'destination') expect(latest.planDest).toBe('ksfo');
    else if (action === 'city') expect(latest.cityDestination.name).toBe('Kyoto');
    else expect(latest.cityDestination).toBeNull();
  });

  it.each(['departure', 'city', 'clear'])('keeps a delayed %s compatible with canonical city clones and unrelated metadata', async action => {
    await mount({}, { delayed: true, strict: true, cloneAtCommit: true }); await run(await capture(action));
    await act(async () => poke()); await patch({ cityDestination: { ...copy(latest.cityDestination), teacherExtra: 'not city identity' },
      teacherMarker: 'updated host metadata', teacherNotes: { kept: true } });
    await flush();
    if (action === 'departure') expect(latest.planDep).toBe('kden');
    else if (action === 'city') expect(latest.cityDestination.name).toBe('Kyoto');
    else expect(latest.cityDestination).toBeNull();
    expect(latest.teacherMarker).toBe('updated host metadata'); expect(latest.teacherNotes).toEqual({ kept: true });
    expect([latest.quizScore, latest.quizTotal]).toEqual([3, 7]);
  });

  it.each(['committed', 'same batch', 'A to B to A'])('rejects a retained city result after a %s query change', async timing => {
    await mount(); const old = handler(await search('Kyoto')), original = copy(latest);
    if (timing === 'same batch') {
      const edit = change(query(), 'Paris'); await act(async () => { edit(); old(); });
    } else { await run(change(query(), 'Paris')); if (timing === 'A to B to A') await search('Kyoto'); await run(old); }
    expect(latest).toEqual(original);
    await run(handler(await search('Paris'))); expect(latest.cityDestination.name).toBe('Paris');
  });

  it('does not let a retained query callback change a later menu visit', async () => {
    await mount(); await search('Kyoto'); const old = change(query(), 'Paris');
    await patch({ view: 'calculator' }); await patch({ view: 'menu' }); const text = query().value;
    await run(old); expect(query().value).toBe(text); expect(latest.cityDestination).toEqual(london());
  });

  it.each([false, true])('keeps ordered departure and destination selections through rerenders and prefix receipts; clones: %s', async cloneAtCommit => {
    await mount({}, { delayed: true, strict: true, cloneAtCommit });
    await run(change(departure(), 'kden')); await act(async () => poke()); await run(change(destination(), 'ksfo'));
    expect(pending).toHaveLength(2); await commit(); expect(latest.planDep).toBe('kden'); expect(latest.planDest).toBe('kjfk');
    await act(async () => poke()); await run(change(departure(), 'kjfk')); await flush();
    expect([latest.planDep, latest.planDest]).toEqual(['kjfk', 'ksfo']); expect(latest.cityDestination).toEqual(london());
  });

  it('keeps two deliberate city selections ordered across new searches and partial receipts', async () => {
    await mount({}, { delayed: true, strict: true, cloneAtCommit: true });
    await run(handler(await search('Kyoto'))); await act(async () => poke());
    await run(handler(await search('Paris'))); expect(pending).toHaveLength(2);
    await commit(); expect(latest.cityDestination.name).toBe('Kyoto'); await act(async () => poke()); await flush();
    expect(latest.cityDestination.name).toBe('Paris'); expect([latest.planDep, latest.planDest]).toEqual(['kpwm', 'kjfk']);
  });

  it('preserves a deliberate Clear followed by a new city selection in one delayed chain', async () => {
    await mount({}, { delayed: true, strict: true }); const result = handler(await search('Kyoto')), clear = await capture('clear');
    await act(async () => { clear(); result(); }); expect(pending).toHaveLength(2);
    await act(async () => poke()); await commit(); expect(latest.cityDestination).toBeNull(); await flush();
    expect(latest.cityDestination.name).toBe('Kyoto');
  });

  it('files current airport selections when selection and departure are accepted before React commits', async () => {
    await mount(); const dep = change(departure(), 'kden'), dest = change(destination(), 'ksfo');
    const depart = handler(host.querySelector('button[aria-label="File Route: file the flight plan and depart"]'));
    await act(async () => { dep(); dest(); depart(); });
    expect(latest.view).toBe('flying'); expect([latest.planDep, latest.planDest]).toEqual(['kden', 'ksfo']);
    expect(hooks().getFlightPlanRef().current).toMatchObject({ departure: { id: 'kden' }, destination: { id: 'ksfo' } });
  });

  it('uses the latest accepted city for a same-batch city selection and ground departure', async () => {
    await mount(); const result = handler(await search('Kyoto')), depart = handler(button('Depart toward city', planner()));
    await act(async () => { result(); depart(); });
    expect(latest.view).toBe('flying'); expect(latest.cityDestination.name).toBe('Kyoto');
    expect(hooks().getFlightPlanRef().current).toMatchObject({ departure: { id: 'kpwm' }, destination: { name: 'Kyoto', isCity: true } });
  });

  it('uses the newly selected aircraft when its card and File Route are accepted in one batch', async () => {
    await mount({ menuSections: { plan: true, aircraft: true } }, { strict: true });
    const selectAircraft = handler(host.querySelector('#skyschool-secbody-aircraft button[aria-label^="Boeing 737"]'));
    const depart = handler(host.querySelector('button[aria-label="File Route: file the flight plan and depart"]'));
    await act(async () => { selectAircraft(); depart(); });
    expect(latest.view).toBe('flying'); expect(latest.aircraft).toBe('boeing737');
    expect(latest.flightPractice.record).toMatchObject({ aircraftId: 'boeing737', activityId: 'free_flight' });
    expect(hooks().flyingRef.current).toBe(true);
    expect(hooks().getFlightPlanRef().current).toMatchObject({ departure: { id: 'kpwm' }, destination: { id: 'kjfk' } });
  });

  it('keeps displayed city result buttons usable after each accepted selection cancels its search generation', async () => {
    await mount(); await run(change(query(), 'San'));
    await run(() => handler(planner().querySelector('form'), 'onSubmit')({ preventDefault() {} }));
    const results = [...planner().querySelectorAll('[data-city-result]')]; expect(results.length).toBeGreaterThan(1);
    const [firstId, secondId] = results.slice(0, 2).map(result => result.getAttribute('data-city-result'));
    const currentResult = id => [...planner().querySelectorAll('[data-city-result]')].find(result => result.getAttribute('data-city-result') === id);
    await run(handler(currentResult(firstId))); expect(latest.cityDestination.id).toBe(firstId);
    await run(handler(currentResult(secondId))); expect(latest.cityDestination.id).toBe(secondId);
    expect(currentResult(secondId).getAttribute('aria-pressed')).toBe('true');
    await run(await capture('clear')); expect(latest.cityDestination).toBeNull();
    await run(handler(currentResult(firstId))); expect(latest.cityDestination.id).toBe(firstId);
    expect(query().value).toBe('San'); expect(currentResult(firstId).getAttribute('aria-pressed')).toBe('true');
  });

  it.each(['plan', 'aircraft', 'city'])('cancels a slow search and restores idle controls after a foreign same-menu %s replacement', async changed => {
    delete window.SkySchoolCityServices; vi.setSystemTime(new Date('2099-01-03T00:00:00Z'));
    const request = deferred(); expectedFetchCalls = 1; fetchSpy.mockImplementation(() => request.promise);
    await mount({ cityOnline: true }); const oldResult = handler(await search('Kyoto'));
    const signal = fetchSpy.mock.calls[0][1].signal;
    expect(signal.aborted).toBe(false); expect(planner().querySelector('button[type="submit"]').textContent).toBe('Searching…');
    const replacement = changed === 'aircraft' ? { aircraft: 'boeing737', teacherMarker: 'new aircraft' } : foreign(changed);
    await patch(replacement); const expected = copy(latest);
    expect(latest.view).toBe('menu'); expect(signal.aborted).toBe(true);
    expect(planner().querySelector('button[type="submit"]').textContent).toBe('Search');
    expect(planner().querySelector('button[type="submit"]').disabled).toBe(false);
    expect(planner().querySelectorAll('[data-city-result]')).toHaveLength(0);
    await run(oldResult); expect(latest).toEqual(expected);
    await act(async () => request.resolve(lateCityResponse()));
    expect(latest).toEqual(expected); expect(query().value).toBe('Kyoto');
    expect(planner().querySelectorAll('[data-city-result]')).toHaveLength(0);
    expect(planner().textContent).not.toContain('Late Kyoto response');
    expect(planner().querySelector('button[type="submit"]').disabled).toBe(false);
  });

  it('preserves airport selection order and a separate city in a legacy host', async () => {
    await mount({}, { legacyHost: true }); const dep = change(departure(), 'kden'), dest = change(destination(), 'ksfo');
    await act(async () => { dep(); dest(); }); expect([latest.planDep, latest.planDest]).toEqual(['kden', 'ksfo']);
    await run(handler(await search('Kyoto'))); expect(latest.cityDestination.name).toBe('Kyoto');
    await run(await capture('clear')); expect(latest.cityDestination).toBeNull();
    expect([latest.planDep, latest.planDest]).toEqual(['kden', 'ksfo']);
  });
});
