import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, host, root, latest, savedRoot, externalPatch, poke, pending, replayChecks, xp, errors, accepted;
const copy = value => JSON.parse(JSON.stringify(value));
const kinds = ['briefing', 'planner', 'city-near', 'city-ground'];
const london = { name: 'London', lat: 51.5, lon: -.12 };
const kyoto = { name: 'Kyoto', lat: 35.01, lon: 135.77 };
const hooks = () => window.__testHooks.flightSim;
const plan = () => hooks().getFlightPlanRef().current;
const button = text => [...host.querySelectorAll('button')].find(node => node.textContent.trim() === text);
function launchButton(kind) {
  return kind === 'briefing' ? host.querySelector('[aria-label="File Route: file the flight plan and depart"]')
    : button(kind === 'planner' ? '🗺️ File Flight Plan & Depart' : kind === 'city-near' ? 'Fly near city' : 'Depart toward city');
}
function handler(node, name = 'onClick') {
  expect(node).toBeTruthy(); return node[Object.keys(node).find(key => key.startsWith('__reactProps$'))][name];
}
async function run(callback) { await act(async () => callback()); }
async function click(node) { expect(node).toBeTruthy(); await act(async () => { node.focus(); node.click(); }); }
async function patch(values) { await act(async () => externalPatch(values)); }
async function commit() { expect(pending.length).toBeGreaterThan(0); const apply = pending.shift(); await run(apply); }
async function flush() { for (let count = 0; pending.length; count++) { expect(count).toBeLessThan(30); await commit(); } }
function runtime() {
  return copy({ flying: hooks().flyingRef.current, flight: hooks().flightRef.current,
    controls: hooks().controlsRef.current, time: hooks().timeRef.current, plan: plan(),
    challenge: hooks().getFlightChallengeRef().current, weather: hooks().getWeatherRef().current,
    sprint: hooks().getSprintRef().current, log: hooks().getLogRef().current });
}
function replacement(kind, change) {
  if (change === 'aircraft') return { aircraft: 'boeing737', teacherMarker: 'new aircraft' };
  if (change === 'view') return { view: 'preflight', teacherMarker: 'new activity' };
  return kind.startsWith('city') ? { cityDestination: kyoto, teacherMarker: 'new city' }
    : { planDep: 'egll', planDest: 'rjtt', teacherMarker: 'new airports' };
}
function assertFreshDeparture(aircraft = 'cessna172') {
  expect(latest.view).toBe('flying'); expect(hooks().flyingRef.current).toBe(true);
  expect(latest.flightPractice).toMatchObject({ version: 1, record: { aircraftId: aircraft, activityId: 'free_flight',
    investigation: false, sessionTime: 0, flightTime: 0, airborneSeconds: 0, samples: [] } });
  expect(latest.flightPractice.attemptId).toMatch(/^flight_/);
  expect(latest.flightPractice.record.attemptId).toBe(latest.flightPractice.attemptId);
  expect(latest.flightPractice.record.startedAirborne).toBe(hooks().flightRef.current.onGround === false);
  expect(latest.flightPractice.record.maxAlt).toBeCloseTo(hooks().flightRef.current.altitude, 5);
  expect(latest.flightPractice.record.maxSpeed).toBeCloseTo(hooks().flightRef.current.speed * .5924838, 5);
  expect(latest.flightChallenge).toBeNull(); expect(latest.selectedChallenge).toBeNull();
  expect(latest.flightMission).toBeNull(); expect(latest.flightSprint).toBeNull();
  expect(latest.rescue).toBeNull(); expect(latest.survey).toBeNull();
  expect(latest.lastDebrief).toBeUndefined(); expect(latest.challengeResults).toBeUndefined();
}
async function mount(seed = {}, options = {}) {
  if (root) await act(async () => root.unmount()); host?.remove();
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  pending = []; accepted = [];
  function App() {
    const [data, setData] = React.useState({ otherTool: { writing: 'Keep unrelated writing.' }, flightSim: {
      view: 'menu', aircraft: 'cessna172', planDep: 'kden', planDest: 'ksfo', cityDestination: copy(london), cityOnline: false,
      railCollapsed: true, menuSections: { plan: true, aircraft: true, airports: true }, weather: 'clear',
      totalFlightTime: 900, teacherMarker: 'original', takeoffTutorialDismissed: true, landingTutorialDismissed: true, ...seed,
    } });
    const [, renderLocal] = React.useState(0);
    latest = data.flightSim; savedRoot = data; poke = () => renderLocal(value => value + 1);
    externalPatch = values => setData(old => ({ ...old, flightSim: { ...old.flightSim, ...values } }));
    const submit = change => {
      const apply = () => setData(previous => {
        const before = JSON.stringify(previous), first = typeof change === 'function' ? change(previous) : change;
        const second = typeof change === 'function' ? change(previous) : change;
        replayChecks.push({ pure: before === JSON.stringify(previous), stable: JSON.stringify(first) === JSON.stringify(second) });
        let next = second;
        if (previous.flightSim.view === 'menu' && second.flightSim.view === 'flying') {
          accepted.push(copy(second.flightSim));
          if (options.replaceAcceptedLaunch) next = { ...second, flightSim: options.replaceAcceptedLaunch(second.flightSim) };
        }
        return options.cloneAtCommit && next !== previous ? { ...next, flightSim: copy(next.flightSim) } : next;
      });
      if (options.delayed) pending.push(apply); else apply();
    };
    return tool.render(makeCtx({ toolData: data, setToolData: options.legacyHost ? undefined : submit,
      update: (id, key, value) => submit(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, values) => submit(old => ({ ...old, [id]: { ...old[id], ...values } })), awardXP: xp,
    }));
  }
  const app = React.createElement(App);
  await act(async () => root.render(options.strict ? React.createElement(React.StrictMode, null, app) : app));
  const details = host.querySelector('[data-flightsim-city-planner]'); if (details) details.open = true;
}
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-23T16:30:00.000Z'));
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {}; window.SkySchoolCityServices = { enabled: false };
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); api = window.__RR_TEST_EXPORTS__.flightSim;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function() {
    return new Proxy({ canvas: this, measureText: text => ({ width: String(text).length * 6 }),
      createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }) },
    { get: (target, key) => key in target ? target[key] : () => {}, set: (target, key, value) => { target[key] = value; return true; } });
  });
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.stubGlobal('cancelAnimationFrame', vi.fn());
  replayChecks = []; xp = vi.fn(); errors = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  expect(errors).not.toHaveBeenCalled(); expect(xp).not.toHaveBeenCalled();
  expect(replayChecks.every(check => check.pure && check.stable)).toBe(true);
  delete window.__RR_TEST_EXPORTS__; delete window.__testHooks; delete window.SkySchoolCityServices;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('Sky School route departures belong to accepted planner selections', () => {
  it.each(kinds.flatMap(kind => ['committed', 'pending'].flatMap(timing => ['selection', 'aircraft', 'view'].map(change => [kind, timing, change]))))
    ('rejects retained %s after a %s %s replacement without initializing runtime', async (kind, timing, change) => {
      await mount(); const launch = handler(launchButton(kind)), before = copy(latest), beforeRuntime = runtime();
      const newer = replacement(kind, change);
      if (timing === 'committed') { await patch(newer); await run(launch); }
      else await act(async () => { externalPatch(newer); launch(); });
      expect(latest).toEqual({ ...before, ...newer }); expect(runtime()).toEqual(beforeRuntime);
      expect(requestAnimationFrame).not.toHaveBeenCalled(); expect(latest.flightPractice).toBeUndefined();
      expect(savedRoot.otherTool).toEqual({ writing: 'Keep unrelated writing.' });
    });

  it.each(kinds.flatMap(kind => ['selection', 'aircraft', 'view'].map(change => [kind, change])))
    ('rejects fully delayed %s after a newer %s arrives without replacing route or checkpoint', async (kind, change) => {
      await mount({}, { delayed: true });
      hooks().getFlightPlanRef().current = { departure: { id: 'prior-origin' }, destination: { id: 'prior-destination' }, route: [] };
      const before = copy(latest), beforeRuntime = runtime(); await click(launchButton(kind));
      expect(pending).toHaveLength(1); expect(latest).toEqual(before); expect(runtime()).toEqual(beforeRuntime);
      expect(requestAnimationFrame).not.toHaveBeenCalled();
      await patch(replacement(kind, change)); const newer = copy(latest);
      await flush(); expect(latest).toEqual(newer); expect(runtime()).toEqual(beforeRuntime);
      expect(requestAnimationFrame).not.toHaveBeenCalled(); expect(latest.flightPractice).toBeUndefined();
    });

  it.each(kinds)('retires a retained %s after a rendered selection A-to-B-to-A and accepts a fresh control', async kind => {
    await mount(); const launch = handler(launchButton(kind)), before = copy(latest), beforeRuntime = runtime();
    await patch(replacement(kind, 'selection')); await patch(before); await run(launch);
    expect(latest).toEqual(before); expect(runtime()).toEqual(beforeRuntime); expect(requestAnimationFrame).not.toHaveBeenCalled();
    await click(launchButton(kind)); assertFreshDeparture(); expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
  });

  it.each(kinds.flatMap(kind => [false, true].map(cloneAtCommit => [kind, cloneAtCommit])))
    ('initializes %s once after its atomic accepted checkpoint; cloned receipt: %s', async (kind, cloneAtCommit) => {
      await mount({}, { delayed: true, strict: true, cloneAtCommit });
      const launch = handler(launchButton(kind)), otherLaunch = handler(launchButton(kind === 'briefing' ? 'planner' : 'briefing'));
      const before = copy(latest), beforeRuntime = runtime();
      await act(async () => { launch(); launch(); otherLaunch(); }); await run(poke);
      expect(pending).toHaveLength(1); expect(latest).toEqual(before); expect(runtime()).toEqual(beforeRuntime);
      expect(requestAnimationFrame).not.toHaveBeenCalled();
      await patch({ teacherMarker: 'metadata while departure pending', totalFlightTime: 950, cityDestination: copy(london) });
      await flush(); assertFreshDeparture(); expect(pending).toHaveLength(0); expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
      expect(latest.teacherMarker).toBe('metadata while departure pending'); expect(latest.totalFlightTime).toBe(950);
      expect(savedRoot.otherTool).toEqual({ writing: 'Keep unrelated writing.' });
      expect(new Set(accepted.map(state => state.flightPractice?.attemptId)).size).toBe(1);
      expect(accepted.every(state => api.normalizeFlightPracticeCheckpoint(state.flightPractice))).toBe(true);
      if (kind.startsWith('city')) expect(plan().destination).toMatchObject({ name: 'London', code: 'CITY', isCity: true });
      else expect(plan().route.map(point => point.id)).toEqual(['kden', 'ksfo']);
      const attempt = latest.flightPractice.attemptId; await run(poke);
      expect(latest.flightPractice.attemptId).toBe(attempt); expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
    });

  it.each(['briefing', 'planner'])('files current optimistic From and To edits through delayed %s departure', async kind => {
    await mount({}, { delayed: true, cloneAtCommit: true });
    const from = handler(host.querySelector('#skyschool-route-from'), 'onChange');
    const to = handler(host.querySelector('#skyschool-route-to'), 'onChange');
    await act(async () => { from({ target: { value: 'egll' } }); to({ target: { value: 'rjtt' } }); });
    await run(poke); await run(handler(launchButton(kind))); expect(pending).toHaveLength(3);
    await commit(); expect(hooks().flyingRef.current).toBe(false); await commit(); expect(hooks().flyingRef.current).toBe(false);
    await flush(); assertFreshDeparture(); expect(plan().route.map(point => point.id)).toEqual(['egll', 'rjtt']);
    expect(latest.planDep).toBe('egll'); expect(latest.planDest).toBe('rjtt');
  });
});

describe('Sky School accepted route launch geometry and evidence', () => {
  it.each(['cessna172', 'drone', 'glider'].flatMap(aircraft => ['briefing', 'city-ground'].map(kind => [aircraft, kind])))
    ('keeps the %s start and altitude datum for accepted %s filing', async (aircraft, kind) => {
      await mount({ aircraft }, { delayed: true }); await click(launchButton(kind)); await flush(); assertFreshDeparture(aircraft);
      const flight = hooks().flightRef.current, denver = api.WAYPOINTS.find(airport => airport.id === 'kden');
      expect(api.haversineNm(flight.lat, flight.lon, denver.lat, denver.lon)).toBeLessThan(1);
      expect(plan().departure.id).toBe('kden'); expect(plan().cruiseAltitudeDatum).toBe(aircraft === 'drone' ? 'agl' : 'msl');
      expect(hooks().controlsRef.current.throttle).toBe(0);
      if (aircraft === 'glider') {
        expect(flight.onGround).toBe(false); expect(flight.altitude).toBe(denver.alt + 3000);
        expect(flight.speed * .5924838).toBeCloseTo(55, 6);
      } else {
        expect(flight.onGround).toBe(true); expect(flight.altitude).toBe(denver.alt); expect(flight.speed).toBe(0);
      }
      if (aircraft === 'drone') expect(plan().cruiseAlt).toBe(400);
    });

  it.each([['boeing737', 2, 2000], ['drone', .15, 150], ['glider', 2, 3000]])
    ('keeps the %s near-city distance, terrain clearance and trimmed controls after acceptance', async (aircraft, distance, clearance) => {
      await mount({ aircraft }, { delayed: true, cloneAtCommit: true }); await click(launchButton('city-near')); await flush(); assertFreshDeparture(aircraft);
      const flight = hooks().flightRef.current, controls = hooks().controlsRef.current, ground = api.getFlightGroundElevation(flight.lat, flight.lon);
      expect(api.haversineNm(flight.lat, flight.lon, london.lat, london.lon)).toBeCloseTo(distance, 5);
      expect(flight.altitude - ground).toBeGreaterThanOrEqual(clearance - .01); expect(flight.fieldElev).toBeCloseTo(ground, 4);
      expect(flight.onGround).toBe(false); expect(plan().departure.code).toBe('START'); expect(plan().cruiseAltitudeDatum).toBe('msl');
      expect(plan().cruiseAlt).toBe(flight.altitude); expect(hooks().getCitySolarFrame().solarHour).toBeCloseTo(12, 5);
      expect(Number.isFinite(controls.pitch)).toBe(true);
      if (aircraft === 'glider') expect(controls.throttle).toBe(0);
      else expect(controls.throttle).toBeGreaterThan(0);
      if (aircraft === 'boeing737') expect(flight.speed * .5924838).toBeGreaterThan(130);
      if (aircraft === 'drone') expect(flight.speed).toBe(0);
    });

  it.each(['missing-airport', 42])('blocks ground city filing for invalid explicit departure %j', async planDep => {
    await mount({ planDep }, { delayed: true }); const before = copy(latest), beforeRuntime = runtime();
    await run(handler(launchButton('city-ground'))); await flush();
    expect(latest).toEqual(before); expect(runtime()).toEqual(beforeRuntime); expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it.each(['briefing', 'planner', 'city-ground'].flatMap(kind => [false, 0].map(planDep => [kind, planDep])))
    ('rejects old %s when a pending explicit From value %j replaces the default airport', async (kind, planDep) => {
      await mount({ planDep: undefined, planDest: 'kjfk' });
      const launch = handler(launchButton(kind)), before = copy(latest), beforeRuntime = runtime();
      await act(async () => { externalPatch({ planDep }); launch(); });
      expect(latest).toEqual({ ...before, planDep }); expect(runtime()).toEqual(beforeRuntime);
      expect(requestAnimationFrame).not.toHaveBeenCalled(); expect(latest.flightPractice).toBeUndefined();
    });

  it.each(['missing-airport', false, 0])('keeps near-city sightseeing usable with an unused invalid From value %j', async planDep => {
    await mount({ planDep }, { delayed: true }); await click(launchButton('city-near')); await flush(); assertFreshDeparture();
    expect(latest.planDep).toBe(planDep); expect(plan().departure.code).toBe('START');
    expect(plan().destination).toMatchObject({ name: 'London', code: 'CITY' });
    const flight = hooks().flightRef.current;
    expect(api.haversineNm(flight.lat, flight.lon, london.lat, london.lon)).toBeCloseTo(2, 5);
    expect(flight.onGround).toBe(false);
  });

  it('keeps the documented Portland default for ground city filing when From is absent', async () => {
    await mount({ planDep: undefined }, { delayed: true }); await click(launchButton('city-ground')); await flush(); assertFreshDeparture();
    expect(plan().departure.id).toBe('kpwm'); expect(hooks().flightRef.current.altitude).toBe(76);
  });

  it('recovers newer same-ID checkpoint evidence instead of resetting it with fresh route runtime', async () => {
    await mount({}, { delayed: true, replaceAcceptedLaunch: state => ({ ...state,
      flightPractice: { ...state.flightPractice, record: { ...state.flightPractice.record, sessionTime: 9, airborneSeconds: 3, flightTime: 3, maxAlt: 6000 } } }) });
    const beforeRuntime = runtime(); await click(launchButton('briefing')); await flush();
    expect(hooks().flyingRef.current).toBe(false); expect(requestAnimationFrame).not.toHaveBeenCalled();
    expect(hooks().flightRef.current).toEqual(beforeRuntime.flight); expect(plan()).toEqual(beforeRuntime.plan);
    expect(latest.view).toBe('debrief'); expect(latest.lastDebrief).toMatchObject({ attemptId: accepted[0].flightPractice.attemptId,
      sessionTime: 9, airborneSeconds: 3, maxAlt: 6000, interrupted: true });
  });

  it('recovers a newer valid survey checkpoint instead of starting the accepted city route over it', async () => {
    const mission = { version: 1, attemptId: 'newer-route-survey', recordedAt: '2026-10-23T16:29:00.000Z',
      mission: { missionId: 'drone_survey', mode: 'aerial', launchLat: 43.646, launchLon: -70.309,
        elapsedSeconds: 24, completed: false, returned: false, battery: 82, batteryExhausted: false,
        targets: [{ name: 'First site', lat: 43.65, lon: -70.30, captured: true },
          { name: 'Second site', lat: 43.64, lon: -70.31, captured: false }] } };
    expect(api.normalizeFlightMissionCheckpoint(mission)).not.toBeNull();
    await mount({}, { delayed: true, replaceAcceptedLaunch: state => ({ ...state, flightMission: copy(mission), survey: { active: true } }) });
    const beforeRuntime = runtime(); await click(launchButton('city-near')); await flush();
    expect(hooks().flyingRef.current).toBe(false); expect(requestAnimationFrame).not.toHaveBeenCalled(); expect(plan()).toEqual(beforeRuntime.plan);
    expect(latest.view).toBe('debrief'); expect(latest.lastDebrief).toMatchObject({ attemptId: mission.attemptId,
      activityId: 'drone_survey', sessionTime: 24, samples: [], mission: { capturedCount: 1, interrupted: true } });
    for (const key of ['flightTime', 'airborneSeconds', 'maxAlt', 'maxSpeed', 'distance', 'bestLanding']) expect(latest.lastDebrief).not.toHaveProperty(key);
  });

  it.each(['briefing', 'city-near'])('waits for accepted %s departure in a legacy updateMulti host', async kind => {
    await mount({}, { delayed: true, legacyHost: true }); const before = copy(latest), beforeRuntime = runtime();
    await click(launchButton(kind)); expect(pending).toHaveLength(1); expect(latest).toEqual(before); expect(runtime()).toEqual(beforeRuntime);
    await flush(); assertFreshDeparture(); expect(requestAnimationFrame).toHaveBeenCalledTimes(1); expect(pending).toHaveLength(0);
  });
});
