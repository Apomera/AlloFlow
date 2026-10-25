import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, host, root, latest, savedRoot, externalPatch, poke, pending, replayChecks, xp, errors, accepted;
const copy = value => JSON.parse(JSON.stringify(value));
const ids = ['first_climb', 'first_flight', 'cross_country', 'mountain_flying', 'energy_management', 'world_tour'];
const surfaces = ['menu', 'onboarding', 'lesson', 'retry', 'recommended', 'tour'];
const hooks = () => window.__testHooks.flightSim;
const plan = () => hooks().getFlightPlanRef().current;
const active = () => hooks().getFlightChallengeRef().current;
const button = text => [...host.querySelectorAll('button')].find(node => node.textContent.trim() === text);
const sourceId = kind => kind === 'tour' ? 'world_tour' : kind === 'onboarding' || kind === 'lesson' ? 'first_climb' : 'first_flight';
const tourRecord = (patch = {}) => api.normalizeFlightChallenge({ version: 1, id: 'world_tour',
  arrivals: ['kpwm', 'kjfk'], elapsedSeconds: 11, airborneSeconds: 10, tourElapsedSeconds: 22,
  tourTimingValid: true, wasAirborne: true, peakAGL: 300, legArrivalId: 'kjfk', ...patch });
const review = (id = 'first_flight', patch = {}) => ({ attemptId: 'challenge-review', aircraftId: 'cessna172', activityId: id,
  investigation: false, startedAirborne: ['cross_country', 'energy_management', 'world_tour'].includes(id),
  approachAirportId: id === 'world_tour' ? 'kjfk' : null, endedAt: '2026-10-23T15:00:00.000Z',
  sessionTime: 35, flightTime: 30, airborneSeconds: 30, maxAlt: 3000, maxSpeed: 110,
  landings: 0, bestStableSeconds: 15, reflection: 'Keep my challenge explanation.', samples: [],
  challenge: id === 'world_tour' ? tourRecord() : api.createFlightChallenge(id), ...patch });
function launchButton(kind, id = sourceId(kind)) {
  if (kind === 'menu') return host.querySelector('[data-flight-challenge-id="' + id + '"]');
  if (kind === 'onboarding') return host.querySelector('[data-flight-start-step="first_climb"] button');
  if (kind === 'lesson') {
    const name = api.CHALLENGES.find(item => item.id === id).name;
    return [...host.querySelectorAll('[data-flight-lesson-practice] button')].find(node => node.textContent.includes(name));
  }
  if (kind === 'tour') return button('Continue airport tour') || button('Start a new airport tour');
  return button(kind === 'retry' ? '🔁 Try the challenge again' : 'Start recommended practice');
}
function handler(node, name = 'onClick') {
  expect(node).toBeTruthy(); return node[Object.keys(node).find(key => key.startsWith('__reactProps$'))][name];
}
const chooseAirport = value => { const change = handler(host.querySelector('#challenge-next-airport'), 'onChange'); return () => change({ target: { value } }); };
async function run(callback) { await act(async () => callback()); }
async function click(node) { expect(node).toBeTruthy(); await act(async () => { node.focus(); node.click(); }); }
async function patch(values) { await act(async () => externalPatch(values)); }
async function commit() { expect(pending.length).toBeGreaterThan(0); const apply = pending.shift(); await run(apply); }
async function flush() { for (let count = 0; pending.length; count++) { expect(count).toBeLessThan(30); await commit(); } }
function runtime() {
  return copy({ flying: hooks().flyingRef.current, flight: hooks().flightRef.current, controls: hooks().controlsRef.current,
    time: hooks().timeRef.current, plan: plan(), challenge: active(), weather: hooks().getWeatherRef().current,
    sprint: hooks().getSprintRef().current, log: hooks().getLogRef().current });
}
function evidence() {
  return copy({ lastDebrief: latest.lastDebrief, flightPracticeHistory: latest.flightPracticeHistory,
    challengeResults: latest.challengeResults, challengeCompleted: latest.challengeCompleted,
    challengeReflections: latest.challengeReflections, completedLessons: latest.completedLessons,
    personalBests: latest.personalBests, totalFlightTime: latest.totalFlightTime, quizScore: latest.quizScore });
}
function replacement(kind) {
  return kind === 'lesson' ? { selectedLesson: 'weather' }
    : ['retry', 'recommended', 'tour'].includes(kind) ? { lastDebrief: { ...copy(latest.lastDebrief), maxAlt: 6000 } }
      : { aircraft: 'boeing737' };
}
function assertFreshChallenge(id) {
  expect(latest.view).toBe('flying'); expect(hooks().flyingRef.current).toBe(true);
  expect(latest.aircraft).toBe('cessna172'); expect(latest.selectedChallenge).toBe(id);
  expect(latest.flightPractice).toMatchObject({ version: 1, record: { aircraftId: 'cessna172', activityId: id,
    investigation: false, sessionTime: 0, flightTime: 0, airborneSeconds: 0, samples: [] } });
  expect(api.normalizeFlightPracticeCheckpoint(latest.flightPractice)).not.toBeNull();
  expect(latest.flightPractice.attemptId).toMatch(/^flight_/);
  expect(latest.flightPractice.record.attemptId).toBe(latest.flightPractice.attemptId);
  expect(latest.flightPractice.record.challenge).toEqual(api.normalizeFlightChallenge(latest.flightChallenge));
  expect(active()).toEqual(api.normalizeFlightChallenge(latest.flightChallenge));
  expect(active()).toMatchObject({ id, status: 'active', elapsedSeconds: 0, airborneSeconds: 0 });
  expect(latest.flightPractice.record.startedAirborne).toBe(hooks().flightRef.current.onGround === false);
  expect(latest.flightPractice.record.maxAlt).toBeCloseTo(hooks().flightRef.current.altitude, 5);
  expect(latest.flightPractice.record.maxSpeed).toBeCloseTo(hooks().flightRef.current.speed * .5924838, 5);
  expect(latest.flightPractice.record.approachAirportId).toBe(id === 'world_tour' ? latest.challengeApproachAirport : null);
  for (const key of ['flightMission', 'flightSprint', 'rescue', 'survey']) expect(latest[key]).toBeNull();
  expect(latest.autopilot).toEqual({ hdg: false, alt: false, spd: false }); expect(latest.weather).toBe('clear');
  expect(hooks().getWeatherRef().current).toMatchObject({ type: 'clear', wind: 0, turbulence: 0, visibility: 1 });
  expect(plan()).toMatchObject({ departure: null, destination: null, route: [] });
}
async function mount(kind = 'menu', seed = {}, options = {}) {
  if (root) await act(async () => root.unmount()); host?.remove();
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  pending = []; accepted = [];
  const isReview = ['retry', 'recommended', 'tour'].includes(kind), id = sourceId(kind);
  function App() {
    const [data, setData] = React.useState({ otherTool: { writing: 'Keep unrelated writing.' }, flightSim: {
      view: isReview ? 'debrief' : kind === 'lesson' ? 'lesson' : 'menu', aircraft: 'sr71',
      selectedLesson: api.CHALLENGES.find(item => item.id === 'first_climb').lesson,
      planDep: 'kden', planDest: 'ksfo', cityOnline: false, weather: 'windy', railCollapsed: true,
      menuSections: { challenges: true, aircraft: true, plan: true }, totalFlightTime: 900, quizScore: 3,
      teacherMarker: 'original', completedLessons: { lift: true }, challengeCompleted: {},
      lastDebrief: review(id), flightPracticeHistory: [review('first_flight', { attemptId: 'earlier-attempt', reflection: 'Earlier explanation.' })],
      challengeResults: { energy_management: api.createFlightChallenge('energy_management'), ...(kind === 'tour' ? { world_tour: tourRecord() } : {}) },
      challengeReflections: { first_flight: 'Keep my first-flight draft.' }, personalBests: { maxAlt: 12000 },
      takeoffTutorialDismissed: true, landingTutorialDismissed: true, ...seed,
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
        if (previous.flightSim.view !== 'flying' && second.flightSim.view === 'flying') {
          accepted.push(copy(second.flightSim));
          if (options.replaceAcceptedLaunch) next = { ...second, flightSim: options.replaceAcceptedLaunch(second.flightSim) };
        }
        return options.cloneAtCommit && next !== previous ? { ...next, flightSim: copy(next.flightSim) } : next;
      });
      if (options.delayed) pending.push(apply); else apply();
    };
    return tool.render(makeCtx({ toolData: data, setToolData: options.legacyHost ? undefined : submit,
      update: (toolId, key, value) => submit(old => ({ ...old, [toolId]: { ...old[toolId], [key]: value } })),
      updateMulti: (toolId, values) => submit(old => ({ ...old, [toolId]: { ...old[toolId], ...values } })), awardXP: xp,
    }));
  }
  const app = React.createElement(App);
  await act(async () => root.render(options.strict ? React.createElement(React.StrictMode, null, app) : app));
}
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-23T16:30:00.000Z'));
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {}; window.SkySchoolCityServices = { enabled: false };
  tool = loadTool(process.env.SKYSCHOOL_CHALLENGE_DEPARTURE_SOURCE || 'stem_lab/stem_tool_flightsim.js', 'flightSim'); api = window.__RR_TEST_EXPORTS__.flightSim;
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

describe('Sky School challenge departures own the activity they leave', () => {
  it.each(surfaces.flatMap(kind => ['committed', 'pending'].map(timing => [kind, timing])))
    ('rejects retained %s after a %s subject replacement without touching runtime', async (kind, timing) => {
      await mount(kind); const launch = handler(launchButton(kind)), before = copy(latest), beforeRuntime = runtime(), newer = replacement(kind);
      if (timing === 'committed') { await patch(newer); await run(launch); }
      else await act(async () => { externalPatch(newer); launch(); });
      expect(latest).toEqual({ ...before, ...newer }); expect(runtime()).toEqual(beforeRuntime);
      expect(requestAnimationFrame).not.toHaveBeenCalled(); expect(latest.flightPractice).toBeUndefined();
    });

  it.each(surfaces)('rejects fully delayed %s after incoming navigation without resetting route or checkpoints', async kind => {
    await mount(kind, {}, { delayed: true });
    hooks().getFlightPlanRef().current = { departure: { id: 'old-origin' }, destination: { id: 'old-destination' }, route: [] };
    const before = copy(latest), beforeRuntime = runtime(); await click(launchButton(kind));
    expect(pending).toHaveLength(1); expect(latest).toEqual(before); expect(runtime()).toEqual(beforeRuntime);
    await patch({ view: 'preflight', teacherMarker: 'incoming review' }); const newer = copy(latest); await flush();
    expect(latest).toEqual(newer); expect(runtime()).toEqual(beforeRuntime); expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it.each(['menu', 'lesson', 'retry', 'tour'])('retires retained %s through a rendered A-to-B-to-A visit', async kind => {
    await mount(kind); const launch = handler(launchButton(kind)), before = copy(latest), beforeRuntime = runtime();
    await patch(replacement(kind)); await patch(before); await run(launch);
    expect(latest).toEqual(before); expect(runtime()).toEqual(beforeRuntime); expect(requestAnimationFrame).not.toHaveBeenCalled();
    await click(launchButton(kind)); assertFreshChallenge(sourceId(kind));
  });

  it.each(surfaces)('starts %s exactly once after one atomic checkpoint and cloned StrictMode receipt', async kind => {
    await mount(kind, {}, { delayed: true, strict: true, cloneAtCommit: true });
    hooks().getFlightPlanRef().current = { departure: { id: 'old-origin' }, destination: { id: 'old-destination' }, route: [] };
    const launch = handler(launchButton(kind)), before = copy(latest), beforeRuntime = runtime(), saved = evidence();
    await act(async () => { launch(); launch(); }); await run(poke);
    expect(pending).toHaveLength(1); expect(latest).toEqual(before); expect(runtime()).toEqual(beforeRuntime);
    expect(requestAnimationFrame).not.toHaveBeenCalled();
    await patch({ teacherMarker: 'new metadata', lastDebrief: copy(latest.lastDebrief), challengeResults: copy(latest.challengeResults) });
    await flush(); assertFreshChallenge(sourceId(kind)); expect(evidence()).toEqual(saved);
    expect(latest.teacherMarker).toBe('new metadata'); expect(savedRoot.otherTool).toEqual({ writing: 'Keep unrelated writing.' });
    expect(new Set(accepted.map(item => item.flightPractice?.attemptId)).size).toBe(1);
    expect(accepted.every(item => api.normalizeFlightPracticeCheckpoint(item.flightPractice))).toBe(true);
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1); expect(pending).toHaveLength(0);
    await run(poke); expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
  });

  it.each(['challenge first', 'free first'])('allows only the first accepted same-batch %s launch', async order => {
    await mount('menu', {}, { delayed: true }); const challenge = handler(launchButton('menu'));
    const free = handler(host.querySelector('[aria-label="Free Flight from Portland, ME"]'));
    await act(async () => { if (order === 'challenge first') { challenge(); free(); } else { free(); challenge(); } });
    expect(pending).toHaveLength(1); await flush(); expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
    if (order === 'challenge first') assertFreshChallenge('first_flight');
    else { expect(latest.flightPractice.record.activityId).toBe('free_flight'); expect(active()).toBeNull(); }
  });

  it.each(['lesson Next', 'lesson Menu', 'debrief Menu'])('keeps legacy same-batch %s ahead of a retained challenge launch', async action => {
    const kind = action === 'debrief Menu' ? 'retry' : 'lesson'; await mount(kind, {}, { delayed: true, legacyHost: true });
    const launch = handler(launchButton(kind)), beforeRuntime = runtime();
    const navigate = handler(action === 'lesson Next'
      ? [...host.querySelectorAll('[data-flight-lesson-navigation] button')].find(node => node.title === api.LESSONS.drag.title)
      : kind === 'lesson' ? host.querySelector('[data-flight-lesson-menu]') : button('🏠 Back to Menu'));
    await act(async () => { navigate(); launch(); }); expect(pending).toHaveLength(1); await flush();
    expect(latest.view).toBe(action === 'lesson Next' ? 'lesson' : 'menu'); expect(runtime()).toEqual(beforeRuntime);
    expect(requestAnimationFrame).not.toHaveBeenCalled(); expect(latest.flightPractice).toBeUndefined();
  });

  it('preserves a reflection draft and incoming journal/results metadata when retrying the same review', async () => {
    await mount('retry', {}, { delayed: true }); const launch = handler(launchButton('retry'));
    const edit = handler(host.querySelector('#challenge-reflection'), 'onChange');
    await act(async () => { edit({ target: { value: 'A better explanation before retry.' } }); launch(); });
    expect(pending).toHaveLength(2); await commit(); expect(hooks().flyingRef.current).toBe(false);
    const history = [...copy(latest.flightPracticeHistory), review('first_flight', { attemptId: 'other-host-review' })];
    const results = { ...copy(latest.challengeResults), cross_country: api.createFlightChallenge('cross_country') };
    await patch({ flightPracticeHistory: history, challengeResults: results, totalFlightTime: 950 }); await flush();
    assertFreshChallenge('first_flight'); expect(latest.lastDebrief.reflection).toBe('A better explanation before retry.');
    expect(latest.challengeReflections.first_flight).toBe('A better explanation before retry.');
    expect(latest.flightPracticeHistory).toEqual(history); expect(latest.challengeResults).toEqual(results); expect(latest.totalFlightTime).toBe(950);
  });

  it.each(['menu', 'retry'])('waits for an accepted %s challenge in a legacy updateMulti host', async kind => {
    await mount(kind, {}, { delayed: true, legacyHost: true }); const before = copy(latest), beforeRuntime = runtime();
    await click(launchButton(kind)); expect(pending).toHaveLength(1); expect(latest).toEqual(before); expect(runtime()).toEqual(beforeRuntime);
    await flush(); assertFreshChallenge(sourceId(kind)); expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
  });

  it('keeps the current test hook usable after lesson navigation and refuses another launch while flying', async () => {
    await mount('menu', {}, { delayed: true });
    await patch({ view: 'lesson', selectedLesson: api.CHALLENGES.find(item => item.id === 'first_climb').lesson });
    await run(() => hooks().startFlightChallenge('first_climb')); expect(pending).toHaveLength(1);
    await flush(); assertFreshChallenge('first_climb'); const before = copy(latest), beforeRuntime = runtime();
    await run(() => hooks().startFlightChallenge('energy_management')); expect(pending).toHaveLength(0);
    expect(latest).toEqual(before); expect(runtime()).toEqual(beforeRuntime); expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
  });

  it.each(['lesson Menu', 'supporting lesson', 'reflection'])('keeps a pending legacy challenge ahead of fresh %s controls after a local rerender', async action => {
    const kind = action === 'lesson Menu' ? 'lesson' : 'retry';
    await mount(kind, {}, { delayed: true, legacyHost: true }); const saved = evidence();
    await click(launchButton(kind)); expect(pending).toHaveLength(1); await run(poke);
    const staleAction = action === 'lesson Menu' ? handler(host.querySelector('[data-flight-lesson-menu]'))
      : action === 'supporting lesson' ? handler(host.querySelector('[data-flight-debrief-study="supporting"]'))
        : () => handler(host.querySelector('#challenge-reflection'), 'onChange')({ target: { value: 'Late draft after accepted departure.' } });
    await run(staleAction); expect(pending).toHaveLength(1); expect(hooks().flyingRef.current).toBe(false);
    await flush(); assertFreshChallenge(sourceId(kind)); expect(evidence()).toEqual(saved);
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1); expect(pending).toHaveLength(0);
  });
});

describe('Sky School initial challenge geometry and checkpoint agreement', () => {
  it.each(ids)('preserves the actual %s launch pose and zero-observation checkpoint', async id => {
    await mount('menu', {}, { delayed: true }); await click(launchButton('menu', id)); await flush(); assertFreshChallenge(id);
    const flight = hooks().flightRef.current, controls = hooks().controlsRef.current;
    const airport = api.WAYPOINTS.find(item => item.id === (id === 'mountain_flying' ? 'kden' : id === 'cross_country' ? 'kjfk' : 'kpwm'));
    const airborne = ['cross_country', 'energy_management', 'world_tour'].includes(id);
    expect(flight.onGround).toBe(!airborne); expect(flight.fieldElev).toBe(airport.alt);
    expect(flight.speed * .5924838).toBeCloseTo(airborne ? 110 : 0, 6); expect(controls.throttle).toBe(airborne ? .6 : 0);
    expect(active().wasAirborne).toBe(airborne); expect(active().peakAGL).toBe(airborne ? flight.altitude - airport.alt : 0);
    expect(latest.flightPractice.record.peakAGL).toBe(0); expect(Object.values(active().objectives).every(value => value === false)).toBe(true);
    if (id === 'cross_country') {
      expect(flight.altitude).toBe(airport.alt + 2987); expect(flight.lat).toBe(airport.lat);
      expect(flight.lon).toBeCloseTo(airport.lon + 10 / (60 * Math.cos(airport.lat * Math.PI / 180)), 8);
      expect(flight.heading).toBeCloseTo((api.bearing(flight.lat, flight.lon, airport.lat, airport.lon) + 25) % 360, 6);
    } else if (id === 'energy_management') {
      expect(flight).toMatchObject({ lat: airport.lat, lon: airport.lon, altitude: 5000, heading: 90 });
    } else {
      const runway = api.getFlightRunway(airport), end = runway.ends[0];
      const position = api.getFlightRunwayPosition(runway, 0, id === 'world_tour'
        ? end.thresholdAlongFt - end.sign * 8 * 6076.12 : end.thresholdAlongFt + end.sign * 150, id === 'world_tour' ? 1800 : 0);
      expect(flight.altitude).toBe(position.altitude); expect(flight.heading).toBe(end.headingDeg);
      expect(flight.lat).toBeCloseTo(position.lat, 8); expect(flight.lon).toBeCloseTo(position.lon, 8);
    }
  });

  it('recovers a superseding same-attempt checkpoint instead of resetting accepted challenge runtime', async () => {
    await mount('menu', {}, { delayed: true, replaceAcceptedLaunch: state => ({ ...state,
      flightPractice: { ...state.flightPractice, record: { ...state.flightPractice.record, sessionTime: 9, airborneSeconds: 3, flightTime: 3, maxAlt: 6000 } } }) });
    const beforeRuntime = runtime(); await click(launchButton('menu')); await flush();
    expect(hooks().flyingRef.current).toBe(false); expect(requestAnimationFrame).not.toHaveBeenCalled();
    expect(hooks().flightRef.current).toEqual(beforeRuntime.flight); expect(plan()).toEqual(beforeRuntime.plan);
    expect(latest.lastDebrief).toMatchObject({ attemptId: accepted[0].flightPractice.attemptId, activityId: 'first_flight',
      sessionTime: 9, airborneSeconds: 3, maxAlt: 6000, interrupted: true });
  });

  it('does not start a tour against a different accepted approach airport', async () => {
    await mount('tour', {}, { delayed: true, replaceAcceptedLaunch: state => ({ ...state, challengeApproachAirport: 'rjtt' }) });
    const beforeRuntime = runtime(); await click(launchButton('tour')); await flush();
    expect(hooks().flyingRef.current).toBe(false); expect(requestAnimationFrame).not.toHaveBeenCalled();
    expect(hooks().flightRef.current).toEqual(beforeRuntime.flight); expect(plan()).toEqual(beforeRuntime.plan);
  });
});

describe('Sky School world-tour choices belong to the current saved tour', () => {
  it.each(['same batch', 'local render', 'prefix receipt'])('uses the latest chosen airport through a delayed %s Continue chain', async timing => {
    await mount('tour', {}, { delayed: true, cloneAtCommit: true }); const choose = chooseAirport('egll'), launch = handler(launchButton('tour'));
    if (timing === 'same batch') await act(async () => { choose(); launch(); });
    else { await run(choose); if (timing === 'prefix receipt') await commit(); else await run(poke); await click(launchButton('tour')); }
    expect(pending).toHaveLength(timing === 'prefix receipt' ? 1 : 2); expect(hooks().flyingRef.current).toBe(false);
    if (timing !== 'prefix receipt') { await commit(); expect(latest.challengeNextAirport).toBe('egll'); expect(hooks().flyingRef.current).toBe(false); }
    await flush(); assertFreshChallenge('world_tour'); expect(latest.challengeApproachAirport).toBe('egll');
    expect(latest.challengeNextAirport).toBeNull(); expect(latest.challengeNextAirportAttempt).toBeNull();
    expect(active()).toMatchObject({ arrivals: ['kpwm', 'kjfk'], tourElapsedSeconds: 22, tourTimingValid: true, elapsedSeconds: 0, legArrivalId: null });
  });

  it.each(['choice', 'Continue'].flatMap(action => ['committed', 'pending', 'delayed'].map(timing => [action, timing])))
    ('rejects stale tour %s after a %s replacement of its review', async (action, timing) => {
      await mount('tour', {}, { delayed: timing === 'delayed' });
      const event = action === 'choice' ? chooseAirport('egll') : handler(launchButton('tour')), beforeRuntime = runtime();
      const newer = { lastDebrief: review('world_tour', { attemptId: 'new-tour-review' }), teacherMarker: 'new review' };
      if (timing === 'delayed') { await run(event); await patch(newer); await flush(); }
      else if (timing === 'committed') { await patch(newer); await run(event); }
      else await act(async () => { externalPatch(newer); event(); });
      expect(latest).toMatchObject(newer); expect(latest.challengeNextAirport).toBeUndefined(); expect(latest.flightPractice).toBeUndefined();
      expect(runtime()).toEqual(beforeRuntime); expect(requestAnimationFrame).not.toHaveBeenCalled();
    });

  it.each(['choice', 'Continue'].flatMap(action => ['pending', 'delayed'].map(timing => [action, timing])))
    ('rejects stale tour %s after a %s replacement of aggregate tour evidence', async (action, timing) => {
      await mount('tour', {}, { delayed: timing === 'delayed' }); const event = action === 'choice' ? chooseAirport('egll') : handler(launchButton('tour'));
      const beforeRuntime = runtime(), result = tourRecord({ arrivals: ['kpwm', 'kjfk', 'egll'], tourElapsedSeconds: 40 });
      const newer = { challengeResults: { ...copy(latest.challengeResults), world_tour: result } };
      if (timing === 'delayed') { await run(event); await patch(newer); await flush(); }
      else await act(async () => { externalPatch(newer); event(); });
      expect(latest).toMatchObject(newer); expect(latest.challengeNextAirport).toBeUndefined(); expect(latest.flightPractice).toBeUndefined();
      expect(runtime()).toEqual(beforeRuntime); expect(requestAnimationFrame).not.toHaveBeenCalled();
    });

  it('retires a chooser callback across a rendered airport A-to-B-to-A while the fresh chooser works', async () => {
    await mount('tour', { challengeNextAirport: 'egll', challengeNextAirportAttempt: 'challenge-review' });
    const choose = chooseAirport('rjtt'); await patch({ challengeNextAirport: 'kden' }); await patch({ challengeNextAirport: 'egll' });
    await run(choose); expect(latest.challengeNextAirport).toBe('egll');
    await run(chooseAirport('rjtt')); expect(latest.challengeNextAirport).toBe('rjtt');
  });

  it('keeps a serialized deliberate repeat airport and tour clock when starting another leg', async () => {
    await mount('tour'); await run(chooseAirport('kjfk')); const saved = copy(latest); await mount('tour', saved, { delayed: true });
    expect(host.querySelector('#challenge-next-airport').value).toBe('kjfk'); await click(launchButton('tour')); await flush();
    assertFreshChallenge('world_tour'); expect(latest.challengeApproachAirport).toBe('kjfk');
    expect(active()).toMatchObject({ arrivals: ['kpwm', 'kjfk'], tourElapsedSeconds: 22, elapsedSeconds: 0 });
  });

  it('starts a completed tour over without erasing its recorded completion or personal best', async () => {
    const completed = tourRecord({ arrivals: api.WAYPOINTS.slice(0, 5).map(item => item.id), tourElapsedSeconds: 90,
      completedAt: '2026-10-23T15:00:00.000Z' });
    expect(completed.status).toBe('complete');
    await mount('tour', { lastDebrief: review('world_tour', { challenge: completed }),
      challengeResults: { world_tour: completed }, challengeCompleted: { world_tour: completed.completedAt },
      personalBests: { challenges: { world_tour: 90 }, challengeTimings: { world_tour: 'tour-total-v1' } } }, { delayed: true });
    const before = evidence(); await run(chooseAirport('kden')); await flush(); await click(launchButton('tour')); await flush();
    assertFreshChallenge('world_tour'); expect(active()).toMatchObject({ arrivals: [], tourElapsedSeconds: 0, tourTimingValid: true });
    expect(latest.challengeApproachAirport).toBe('kden'); expect(evidence()).toEqual(before);
  });

  it.each(['missing', 'malformed'])('uses the retained review when the durable tour result is %s', async kind => {
    const results = { energy_management: api.createFlightChallenge('energy_management') };
    if (kind === 'malformed') results.world_tour = { version: 99, id: 'world_tour', arrivals: ['rjtt'] };
    await mount('tour', { challengeResults: results }, { delayed: true });
    const expected = api.WAYPOINTS.find(item => !['kpwm', 'kjfk'].includes(item.id)).id;
    expect(host.querySelector('#challenge-next-airport').value).toBe(expected);
    await click(launchButton('tour')); await flush(); assertFreshChallenge('world_tour');
    expect(latest.challengeApproachAirport).toBe(expected);
    expect(active()).toMatchObject({ arrivals: ['kpwm', 'kjfk'], tourElapsedSeconds: 22, tourTimingValid: true });
    expect(latest.challengeResults).toEqual(results);
  });

  it('uses newer durable tour evidence for both the visible default and the next accepted leg', async () => {
    const durable = tourRecord({ arrivals: ['kpwm', 'kjfk', 'egll'], tourElapsedSeconds: 45 });
    await mount('tour', { challengeResults: { world_tour: durable }, challengeNextAirport: 'egll' }, { delayed: true });
    const expected = api.WAYPOINTS.find(item => !durable.arrivals.includes(item.id)).id;
    expect(host.querySelector('#challenge-next-airport').value).toBe(expected);
    const retainedReview = copy(latest.lastDebrief); await click(launchButton('tour')); await flush(); assertFreshChallenge('world_tour');
    expect(latest.challengeApproachAirport).toBe(expected); expect(active()).toMatchObject({ arrivals: durable.arrivals, tourElapsedSeconds: 45 });
    expect(latest.lastDebrief).toEqual(retainedReview); expect(latest.challengeResults.world_tour).toEqual(durable);
  });

  it('keeps an older deliberate repeat with a valid attempt ID and no stored review proof compatible', async () => {
    await mount('tour', { challengeNextAirport: 'kjfk', challengeNextAirportAttempt: 'challenge-review' }, { delayed: true });
    expect(latest.challengeNextAirportReview).toBeUndefined(); expect(host.querySelector('#challenge-next-airport').value).toBe('kjfk');
    await click(launchButton('tour')); await flush(); assertFreshChallenge('world_tour');
    expect(latest.challengeApproachAirport).toBe('kjfk'); expect(latest.challengeNextAirportReview).toBeNull();
  });

  it('requires current review proof for a legacy no-ID repeat and retains a new choice through JSON reload', async () => {
    await mount('tour', { lastDebrief: review('world_tour', { attemptId: undefined }),
      challengeNextAirport: 'kjfk', challengeNextAirportAttempt: 'legacy-latest' });
    expect(['kpwm', 'kjfk']).not.toContain(host.querySelector('#challenge-next-airport').value);
    await run(chooseAirport('kjfk'));
    expect(latest.challengeNextAirportAttempt).toBe('legacy-latest');
    expect(latest.challengeNextAirportReview).toBe(api.flightReflectionReviewKey(latest.lastDebrief));
    const saved = copy(latest); await mount('tour', saved, { delayed: true });
    expect(host.querySelector('#challenge-next-airport').value).toBe('kjfk');
    await click(launchButton('tour')); await flush(); assertFreshChallenge('world_tour'); expect(latest.challengeApproachAirport).toBe('kjfk');
  });

  it.each(['reflection only', 'corrected evidence'])('binds a newly chosen repeat to review evidence while allowing %s changes', async change => {
    await mount('tour'); await run(chooseAirport('kjfk'));
    const proof = latest.challengeNextAirportReview;
    await patch({ lastDebrief: { ...copy(latest.lastDebrief), ...(change === 'reflection only'
      ? { reflection: 'A new draft for the same observations.' } : { maxAlt: 6000 }) } });
    expect(latest.challengeNextAirportReview).toBe(proof);
    const expected = change === 'reflection only' ? 'kjfk' : api.WAYPOINTS.find(item => !['kpwm', 'kjfk'].includes(item.id)).id;
    expect(host.querySelector('#challenge-next-airport').value).toBe(expected);
    await click(launchButton('tour')); assertFreshChallenge('world_tour'); expect(latest.challengeApproachAirport).toBe(expected);
  });

  it.each(['missing-airport', false, 0])('rejects an explicitly provided invalid airport %j without consuming the saved tour choice', async airportId => {
    await mount('tour', { challengeNextAirport: 'kjfk', challengeNextAirportAttempt: 'challenge-review' }, { delayed: true });
    const before = copy(latest), beforeRuntime = runtime(); await run(() => hooks().startFlightChallenge('world_tour', airportId));
    expect(pending).toHaveLength(0); expect(latest).toEqual(before); expect(runtime()).toEqual(beforeRuntime);
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it.each(['missing-airport', false, 0])('uses the same unvisited fallback for displayed and accepted invalid saved choice %j', async airportId => {
    await mount('tour', { challengeNextAirport: airportId, challengeNextAirportAttempt: 'challenge-review' }, { delayed: true });
    const expected = api.WAYPOINTS.find(item => !['kpwm', 'kjfk'].includes(item.id)).id;
    expect(host.querySelector('#challenge-next-airport').value).toBe(expected);
    await click(launchButton('tour')); await flush(); assertFreshChallenge('world_tour'); expect(latest.challengeApproachAirport).toBe(expected);
  });

  it('keeps repeated delayed chooser edits ordered through prefix receipts before Continue', async () => {
    await mount('tour', {}, { delayed: true, strict: true, cloneAtCommit: true });
    const first = chooseAirport('egll'), second = chooseAirport('rjtt');
    await act(async () => { first(); second(); first(); }); await run(poke); await click(launchButton('tour'));
    expect(pending).toHaveLength(4); await commit(); expect(latest.challengeNextAirport).toBe('egll');
    await commit(); expect(latest.challengeNextAirport).toBe('rjtt'); expect(hooks().flyingRef.current).toBe(false);
    await flush(); assertFreshChallenge('world_tour'); expect(latest.challengeApproachAirport).toBe('egll');
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
  });

  it('does not let an old chooser recreate its selection after Continue has been accepted optimistically', async () => {
    await mount('tour', {}, { delayed: true }); const choose = chooseAirport('egll'), launch = handler(launchButton('tour'));
    const expected = host.querySelector('#challenge-next-airport').value;
    await act(async () => { launch(); choose(); }); expect(pending).toHaveLength(1);
    await flush(); assertFreshChallenge('world_tour'); expect(latest.challengeApproachAirport).toBe(expected);
    expect(latest.challengeNextAirport).toBeNull(); expect(latest.challengeNextAirportAttempt).toBeNull(); expect(latest.challengeNextAirportReview).toBeNull();
  });

  it('allows fresh Back to Menu after a delayed chooser rerender and rejects its retained Continue', async () => {
    await mount('tour', {}, { delayed: true, cloneAtCommit: true }); await run(chooseAirport('egll')); await run(poke);
    const leave = handler(button('🏠 Back to Menu')), launch = handler(launchButton('tour')), beforeRuntime = runtime();
    await act(async () => { leave(); launch(); }); expect(pending).toHaveLength(2);
    await commit(); expect(latest.challengeNextAirport).toBe('egll'); expect(latest.view).toBe('debrief');
    await flush(); expect(latest.view).toBe('menu'); expect(latest.challengeNextAirport).toBe('egll');
    expect(runtime()).toEqual(beforeRuntime); expect(requestAnimationFrame).not.toHaveBeenCalled(); expect(latest.flightPractice).toBeUndefined();
  });

  it('allows fresh ordinary Fly Again after a delayed chooser rerender', async () => {
    await mount('tour', {}, { delayed: true, cloneAtCommit: true }); const saved = evidence();
    await run(chooseAirport('egll')); await run(poke); await click(button('🛫 Fly Again'));
    expect(pending).toHaveLength(2); expect(hooks().flyingRef.current).toBe(false); await commit();
    expect(latest.challengeNextAirport).toBe('egll'); expect(hooks().flyingRef.current).toBe(false); await flush();
    expect(latest.view).toBe('flying'); expect(latest.flightPractice.record.activityId).toBe('free_flight');
    expect(latest.selectedChallenge).toBeNull(); expect(active()).toBeNull(); expect(evidence()).toEqual(saved);
    expect(plan()).toMatchObject({ departure: null, destination: null, route: [] }); expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
  });

  it.each([true, false])('uses canonical tour status for its action label and launch when durable completion is %s', async durableComplete => {
    const completed = tourRecord({ arrivals: api.WAYPOINTS.slice(0, 5).map(item => item.id), tourElapsedSeconds: 90,
      completedAt: '2026-10-23T15:00:00.000Z' }), partial = tourRecord();
    const durable = durableComplete ? completed : partial, reviewed = durableComplete ? partial : completed;
    await mount('tour', { lastDebrief: review('world_tour', { challenge: reviewed }), challengeResults: { world_tour: durable } }, { delayed: true });
    const expectedLabel = durableComplete ? 'Start a new airport tour' : 'Continue airport tour';
    expect(button(expectedLabel)).toBeTruthy(); expect(button(durableComplete ? 'Continue airport tour' : 'Start a new airport tour')).toBeUndefined();
    await click(button(expectedLabel)); await flush(); assertFreshChallenge('world_tour');
    expect(active().arrivals).toEqual(durableComplete ? [] : durable.arrivals);
    expect(active().tourElapsedSeconds).toBe(durableComplete ? 0 : durable.tourElapsedSeconds);
    expect(latest.challengeResults.world_tour).toEqual(durable); expect(latest.lastDebrief.challenge).toEqual(reviewed);
  });
});
