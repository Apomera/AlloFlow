import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, host, root, latest, savedRoot, externalPatch, poke, pending, replayChecks, xp, errors, accepted, toasts;
const copy = value => JSON.parse(JSON.stringify(value));
const kinds = ['menu', 'airport', 'onboarding', 'lesson', 'debrief'];
const hooks = () => window.__testHooks.flightSim;
const plan = () => hooks().getFlightPlanRef().current;
const button = text => [...host.querySelectorAll('button')].find(node => node.textContent.trim() === text);
const review = (patch = {}) => ({ attemptId: 'prior-free-flight', aircraftId: 'cessna172', activityId: 'free_flight',
  investigation: false, startedAirborne: false, endedAt: '2026-10-23T15:00:00.000Z', sessionTime: 35,
  flightTime: 30, airborneSeconds: 30, maxAlt: 3000, maxSpeed: 100, landings: 0, bestStableSeconds: 15,
  reflection: 'My explanation stays with this flight.', samples: [], ...patch });
function launchButton(kind) {
  if (kind === 'menu') return host.querySelector('[aria-label="Free Flight from Portland, ME"]');
  if (kind === 'airport') return host.querySelector('#skyschool-secbody-airports button[aria-label^="DEN,"]');
  if (kind === 'onboarding') return host.querySelector('[data-flight-start-step="landing"] button');
  return button(kind === 'lesson' ? '✈️ Try It — Free Flight' : '🛫 Fly Again');
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
  return copy({ flying: hooks().flyingRef.current, flight: hooks().flightRef.current, controls: hooks().controlsRef.current,
    time: hooks().timeRef.current, plan: plan(), challenge: hooks().getFlightChallengeRef().current,
    weather: hooks().getWeatherRef().current, sprint: hooks().getSprintRef().current, log: hooks().getLogRef().current });
}
function retainedEvidence() {
  return copy({ lastDebrief: latest.lastDebrief, flightPracticeHistory: latest.flightPracticeHistory,
    challengeReflections: latest.challengeReflections, completedLessons: latest.completedLessons,
    challengeCompleted: latest.challengeCompleted, totalFlightTime: latest.totalFlightTime, quizScore: latest.quizScore });
}
function subjectReplacement(kind) {
  return kind === 'lesson' ? { selectedLesson: 'drag' }
    : kind === 'debrief' ? { lastDebrief: review({ maxAlt: 6000 }) } : { aircraft: 'boeing737' };
}
function assertFreshDeparture(aircraft = 'cessna172') {
  expect(latest.view).toBe('flying'); expect(hooks().flyingRef.current).toBe(true);
  expect(latest.aircraft).toBe(aircraft);
  expect(latest.flightPractice).toMatchObject({ version: 1, record: { aircraftId: aircraft, activityId: 'free_flight',
    investigation: false, sessionTime: 0, flightTime: 0, airborneSeconds: 0, samples: [] } });
  expect(latest.flightPractice.attemptId).toMatch(/^flight_/);
  expect(latest.flightPractice.record.attemptId).toBe(latest.flightPractice.attemptId);
  expect(latest.flightPractice.record.startedAirborne).toBe(hooks().flightRef.current.onGround === false);
  expect(latest.flightPractice.record.maxAlt).toBeCloseTo(hooks().flightRef.current.altitude, 5);
  expect(latest.flightPractice.record.maxSpeed).toBeCloseTo(hooks().flightRef.current.speed * .5924838, 5);
  for (const key of ['flightChallenge', 'selectedChallenge', 'flightMission', 'flightSprint', 'rescue', 'survey']) expect(latest[key]).toBeNull();
  expect(latest.autopilot).toEqual({ hdg: false, alt: false, spd: false });
  expect(plan()).toMatchObject({ departure: null, destination: null, route: [] });
}
async function mount(kind = 'menu', seed = {}, options = {}) {
  if (root) await act(async () => root.unmount()); host?.remove();
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  pending = []; accepted = [];
  function App() {
    const [data, setData] = React.useState({ otherTool: { writing: 'Keep unrelated writing.' }, flightSim: {
      view: kind === 'lesson' || kind === 'debrief' ? kind : 'menu', selectedLesson: 'lift', aircraft: 'cessna172',
      planDep: 'kden', planDest: 'ksfo', cityDestination: { name: 'London', lat: 51.5, lon: -.12 }, cityOnline: false,
      railCollapsed: true, menuSections: { plan: true, aircraft: true, airports: true }, weather: 'clear',
      totalFlightTime: 900, quizScore: 3, teacherMarker: 'original',
      completedLessons: { lift: true }, challengeCompleted: { first_flight: true },
      lastDebrief: review(), flightPracticeHistory: [review({ attemptId: 'earlier-flight', reflection: 'An earlier explanation.' })],
      challengeReflections: { first_flight: 'My challenge explanation.' },
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
      update: (id, key, value) => submit(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, values) => submit(old => ({ ...old, [id]: { ...old[id], ...values } })), awardXP: xp, addToast: toasts,
    }));
  }
  const app = React.createElement(App);
  await act(async () => root.render(options.strict ? React.createElement(React.StrictMode, null, app) : app));
}
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-23T16:30:00.000Z'));
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {}; window.SkySchoolCityServices = { enabled: false };
  tool = loadTool(process.env.SKYSCHOOL_FREE_DEPARTURE_SOURCE || 'stem_lab/stem_tool_flightsim.js', 'flightSim'); api = window.__RR_TEST_EXPORTS__.flightSim;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function() {
    return new Proxy({ canvas: this, measureText: text => ({ width: String(text).length * 6 }),
      createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }) },
    { get: (target, key) => key in target ? target[key] : () => {}, set: (target, key, value) => { target[key] = value; return true; } });
  });
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.stubGlobal('cancelAnimationFrame', vi.fn());
  replayChecks = []; xp = vi.fn(); toasts = vi.fn(); errors = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  expect(errors).not.toHaveBeenCalled(); expect(xp).not.toHaveBeenCalled();
  expect(replayChecks.every(check => check.pure && check.stable)).toBe(true);
  delete window.__RR_TEST_EXPORTS__; delete window.__testHooks; delete window.SkySchoolCityServices;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('Sky School ordinary departures belong to their current activity', () => {
  it.each(kinds.flatMap(kind => ['committed', 'pending'].flatMap(timing => ['aircraft', 'view'].map(change => [kind, timing, change]))))
    ('rejects retained %s after a %s %s replacement without initializing runtime', async (kind, timing, change) => {
      await mount(kind); const launch = handler(launchButton(kind)), before = copy(latest), beforeRuntime = runtime();
      const newer = { ...(change === 'aircraft' ? { aircraft: 'boeing737' } : { view: 'preflight' }), teacherMarker: 'incoming work' };
      if (timing === 'committed') { await patch(newer); await run(launch); }
      else await act(async () => { externalPatch(newer); launch(); });
      expect(latest).toEqual({ ...before, ...newer }); expect(runtime()).toEqual(beforeRuntime);
      expect(requestAnimationFrame).not.toHaveBeenCalled(); expect(latest.flightPractice).toBeUndefined();
      expect(savedRoot.otherTool).toEqual({ writing: 'Keep unrelated writing.' });
    });

  it.each(['lesson', 'debrief'].flatMap(kind => ['committed', 'pending', 'delayed'].map(timing => [kind, timing])))
    ('rejects a %s launch after %s replacement of its lesson or same-ID review evidence', async (kind, timing) => {
      await mount(kind, {}, { delayed: timing === 'delayed' }); const launch = handler(launchButton(kind)), beforeRuntime = runtime();
      const newer = subjectReplacement(kind);
      if (timing === 'delayed') { await run(launch); expect(pending).toHaveLength(1); await patch(newer); await flush(); }
      else if (timing === 'committed') { await patch(newer); await run(launch); }
      else await act(async () => { externalPatch(newer); launch(); });
      expect(latest).toMatchObject(newer); expect(runtime()).toEqual(beforeRuntime);
      expect(latest.flightPractice).toBeUndefined(); expect(requestAnimationFrame).not.toHaveBeenCalled();
    });

  it.each(kinds)('rejects fully delayed %s after foreign navigation without clearing an existing route', async kind => {
    await mount(kind, {}, { delayed: true });
    hooks().getFlightPlanRef().current = { departure: { id: 'prior-origin' }, destination: { id: 'prior-destination' }, route: [] };
    const before = copy(latest), beforeRuntime = runtime(); await click(launchButton(kind));
    expect(pending).toHaveLength(1); expect(latest).toEqual(before); expect(runtime()).toEqual(beforeRuntime);
    await patch({ view: 'preflight', teacherMarker: 'incoming activity' }); const newer = copy(latest);
    await flush(); expect(latest).toEqual(newer); expect(runtime()).toEqual(beforeRuntime);
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it.each(kinds)('retires old %s controls across a rendered subject A-to-B-to-A and accepts a fresh one', async kind => {
    await mount(kind); const launch = handler(launchButton(kind)), original = copy(latest), beforeRuntime = runtime();
    await patch(subjectReplacement(kind)); await patch(original); await run(launch);
    expect(latest).toEqual(original); expect(runtime()).toEqual(beforeRuntime); expect(requestAnimationFrame).not.toHaveBeenCalled();
    await click(launchButton(kind)); assertFreshDeparture(); expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
  });

  it.each(['menu', 'lesson', 'debrief'])('rejects a queued %s departure after leaving and revisiting the same activity', async kind => {
    await mount(kind, {}, { delayed: true }); const before = copy(latest), beforeRuntime = runtime();
    await click(launchButton(kind)); await patch({ view: 'preflight' }); await patch(before); await flush();
    expect(latest).toEqual(before); expect(runtime()).toEqual(beforeRuntime); expect(requestAnimationFrame).not.toHaveBeenCalled();
    await click(launchButton(kind)); await flush(); assertFreshDeparture();
  });

  it.each(kinds.flatMap(kind => [false, true].map(cloneAtCommit => [kind, cloneAtCommit])))
    ('starts %s once only after an atomic save, preserving evidence; cloned receipt: %s', async (kind, cloneAtCommit) => {
      await mount(kind, {}, { delayed: true, strict: true, cloneAtCommit });
      hooks().getFlightPlanRef().current = { departure: { id: 'prior-origin' }, destination: { id: 'prior-destination' }, route: [] };
      const launch = handler(launchButton(kind)), before = copy(latest), beforeRuntime = runtime(), evidence = retainedEvidence();
      await act(async () => { launch(); launch(); }); await run(poke);
      expect(pending).toHaveLength(1); expect(latest).toEqual(before); expect(runtime()).toEqual(beforeRuntime);
      expect(requestAnimationFrame).not.toHaveBeenCalled();
      await patch({ teacherMarker: 'updated while departure pending', lastDebrief: copy(latest.lastDebrief),
        flightPracticeHistory: copy(latest.flightPracticeHistory) });
      await flush(); assertFreshDeparture(); expect(retainedEvidence()).toEqual(evidence);
      expect(latest.teacherMarker).toBe('updated while departure pending');
      expect(savedRoot.otherTool).toEqual({ writing: 'Keep unrelated writing.' });
      expect(pending).toHaveLength(0); expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
      expect(new Set(accepted.map(state => state.flightPractice?.attemptId)).size).toBe(1);
      expect(accepted.every(state => api.normalizeFlightPracticeCheckpoint(state.flightPractice))).toBe(true);
      const attempt = latest.flightPractice.attemptId; await run(poke);
      expect(latest.flightPractice.attemptId).toBe(attempt); expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
    });

  it.each(['menu', 'airport', 'onboarding'].flatMap(kind => ['same batch', 'receipt prefix'].map(timing => [kind, timing])))
    ('uses the current optimistic aircraft for %s after a %s aircraft choice', async (kind, timing) => {
      await mount(kind, {}, { delayed: true, cloneAtCommit: true });
      const ac = api.AIRCRAFT.find(item => item.id === 'glider');
      const choose = handler([...host.querySelectorAll('#skyschool-secbody-aircraft button')].find(node => node.getAttribute('aria-label').startsWith(ac.name + ' (')));
      const launch = handler(launchButton(kind));
      if (timing === 'same batch') await act(async () => { choose(); launch(); });
      else { await run(choose); await run(poke); await click(launchButton(kind)); }
      expect(pending).toHaveLength(2); expect(hooks().flyingRef.current).toBe(false);
      await commit(); expect(latest.aircraft).toBe('glider'); expect(hooks().flyingRef.current).toBe(false);
      await run(poke); await flush(); assertFreshDeparture('glider'); expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
    });

  it.each(['free first', 'route first'])('lets only the first accepted menu departure own a same-batch %s pair', async order => {
    await mount('menu', {}, { delayed: true }); const free = handler(launchButton('menu'));
    const filed = handler(host.querySelector('[aria-label="File Route: file the flight plan and depart"]'));
    await act(async () => { if (order === 'free first') { free(); filed(); } else { filed(); free(); } });
    expect(pending).toHaveLength(1); expect(hooks().flyingRef.current).toBe(false); await flush();
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
    if (order === 'free first') assertFreshDeparture();
    else expect(plan().route.map(point => point.id)).toEqual(['kden', 'ksfo']);
  });

  it.each(['lesson switch', 'lesson Menu', 'debrief Menu'])('keeps legacy same-batch %s ahead of its retained free-flight button', async action => {
    const kind = action === 'debrief Menu' ? 'debrief' : 'lesson';
    await mount(kind, {}, { delayed: true, legacyHost: true }); const launch = handler(launchButton(kind)), beforeRuntime = runtime();
    const navigate = handler(action === 'lesson switch'
      ? [...host.querySelectorAll('[data-flight-lesson-navigation] button')].find(node => node.title === api.LESSONS.drag.title)
      : kind === 'lesson' ? host.querySelector('[data-flight-lesson-menu]') : button('🏠 Back to Menu'));
    await act(async () => { navigate(); launch(); }); expect(pending).toHaveLength(1); await flush();
    expect(latest.view).toBe(action === 'lesson switch' ? 'lesson' : 'menu');
    if (action === 'lesson switch') expect(latest.selectedLesson).toBe('drag');
    expect(runtime()).toEqual(beforeRuntime); expect(latest.flightPractice).toBeUndefined();
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('keeps Fly Again ahead of retained same-batch debrief Menu, study and reflection actions', async () => {
    await mount('debrief', { lastDebrief: review({ stallSeconds: 4 }) }, { delayed: true });
    const launch = handler(launchButton('debrief')), leave = handler(button('🏠 Back to Menu'));
    const study = handler(host.querySelector('[data-flight-debrief-study="supporting"]'));
    const edit = handler(host.querySelector('#debrief-evidence-explanation'), 'onChange'), evidence = retainedEvidence();
    await act(async () => { launch(); leave(); study(); edit({ target: { value: 'Late retired draft.' } }); });
    expect(pending).toHaveLength(1); await flush(); assertFreshDeparture(); expect(retainedEvidence()).toEqual(evidence);
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])('keeps a supporting-lesson visit ahead of old Fly Again; legacy host: %s', async legacyHost => {
    await mount('debrief', { lastDebrief: review({ stallSeconds: 4 }) }, { delayed: true, legacyHost });
    const launch = handler(launchButton('debrief')), study = handler(host.querySelector('[data-flight-debrief-study="supporting"]'));
    const beforeRuntime = runtime(); await act(async () => { study(); launch(); }); expect(pending).toHaveLength(1);
    await flush(); expect(latest.view).toBe('lesson'); expect(latest.flightPractice).toBeUndefined();
    expect(runtime()).toEqual(beforeRuntime); expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('preserves a queued Mark Complete before Try It without inventing other progress', async () => {
    await mount('lesson', { completedLessons: { drag: true }, lessonsCompleted: 1 }, { delayed: true });
    const complete = handler(button('📚 Mark lesson complete')), launch = handler(launchButton('lesson'));
    await act(async () => { complete(); launch(); }); expect(pending).toHaveLength(2);
    await commit(); expect(latest.completedLessons).toEqual({ drag: true, lift: true }); expect(hooks().flyingRef.current).toBe(false);
    await flush(); assertFreshDeparture(); expect(latest.completedLessons).toEqual({ drag: true, lift: true });
    expect(latest.lessonsCompleted).toBe(2); expect(latest.quizScore).toBe(3); expect(latest.totalFlightTime).toBe(900);
  });

  it('preserves a queued reflection draft before Fly Again', async () => {
    await mount('debrief', {}, { delayed: true }); const launch = handler(launchButton('debrief'));
    const edit = handler(host.querySelector('#debrief-evidence-explanation'), 'onChange');
    await act(async () => { edit({ target: { value: 'Saved before the next attempt.' } }); launch(); });
    expect(pending).toHaveLength(2); await commit(); expect(hooks().flyingRef.current).toBe(false);
    await flush(); assertFreshDeparture(); expect(latest.lastDebrief.reflection).toBe('Saved before the next attempt.');
    expect(latest.flightPracticeHistory[0].reflection).toBe('An earlier explanation.');
  });

  it.each(['weather', 'checkpoint'])('rejects a pending lesson departure after incoming %s replacement before acceptance', async change => {
    await mount('lesson', {}, { delayed: true }); const beforeRuntime = runtime();
    const checkpoint = api.normalizeFlightPracticeCheckpoint({ version: 1, attemptId: 'incoming-flight',
      recordedAt: '2026-10-23T16:29:00.000Z', record: review({ attemptId: 'incoming-flight' }) });
    expect(checkpoint).not.toBeNull();
    await click(launchButton('lesson')); expect(pending).toHaveLength(1);
    const replacement = change === 'weather' ? { weather: 'windy' } : { flightPractice: checkpoint };
    await patch(replacement); const newer = copy(latest); await flush();
    expect(latest).toEqual(newer); expect(runtime()).toEqual(beforeRuntime); expect(requestAnimationFrame).not.toHaveBeenCalled();
  });
});

describe('Sky School ordinary departure geometry and preserved reviews', () => {
  it.each(['cessna172', 'glider', 'rescue_heli', 'drone'].flatMap(aircraft => ['menu', 'airport'].map(kind => [aircraft, kind])))
    ('preserves the %s start geometry for an accepted %s departure', async (aircraft, kind) => {
      await mount(kind, { aircraft }, { delayed: true }); await click(launchButton(kind)); await flush(); assertFreshDeparture(aircraft);
      const flight = hooks().flightRef.current, airport = api.WAYPOINTS.find(item => item.id === (kind === 'airport' ? 'kden' : 'kpwm'));
      expect(api.haversineNm(flight.lat, flight.lon, airport.lat, airport.lon)).toBeLessThan(1);
      expect(hooks().controlsRef.current).toMatchObject({ throttle: 0, pitch: 0, bank: 0, flaps: 0, brake: 0 });
      if (aircraft === 'glider') {
        expect(flight.onGround).toBe(false); expect(flight.altitude).toBe(airport.alt + 3000);
        expect(flight.speed * .5924838).toBeCloseTo(55, 6);
      } else {
        expect(flight.onGround).toBe(true); expect(flight.altitude).toBe(airport.alt); expect(flight.speed).toBe(0);
      }
      if (aircraft === 'rescue_heli' || aircraft === 'drone') {
        expect(flight.lat).toBe(airport.lat); expect(flight.lon).toBe(airport.lon);
      }
    });

  it('keeps the ordinary wind-dependent runway end when the departure uses a receipt', async () => {
    await mount('airport', {}, { delayed: true });
    const airport = api.WAYPOINTS.find(item => item.id === 'kden'), runway = api.getFlightRunway(airport);
    const calm = api.selectFlightRunwayEnd(runway, { wind: 0 });
    const alternate = runway.ends.find(end => end.headingDeg !== calm.headingDeg);
    const weather = { type: 'windy', wind: 20, windDir: alternate.headingDeg, turbulence: 0, visibility: 1 };
    hooks().getWeatherRef().current = weather;
    const expected = api.selectFlightRunwayEnd(runway, weather); expect(expected.headingDeg).not.toBe(calm.headingDeg);
    await click(launchButton('airport')); await flush(); assertFreshDeparture();
    expect(hooks().flightRef.current.heading).toBe(expected.headingDeg);
    const position = api.getFlightRunwayPosition(runway, 0, expected.thresholdAlongFt + expected.sign * 150);
    expect(hooks().flightRef.current.lat).toBeCloseTo(position.lat, 8); expect(hooks().flightRef.current.lon).toBeCloseTo(position.lon, 8);
  });

  it.each(['accepted', 'rejected'])('emits aerotow guidance only after an accepted glider start, outcome: %s', async outcome => {
    await mount('menu', { aircraft: 'glider' }, { delayed: true, strict: true, cloneAtCommit: true });
    await click(launchButton('menu')); expect(toasts).not.toHaveBeenCalled(); expect(hooks().flyingRef.current).toBe(false);
    if (outcome === 'rejected') await patch({ view: 'preflight' });
    await flush();
    if (outcome === 'accepted') {
      assertFreshDeparture('glider'); expect(toasts).toHaveBeenCalledTimes(1); expect(toasts.mock.calls[0][0]).toContain('Aerotow release');
      await run(poke); expect(toasts).toHaveBeenCalledTimes(1);
    } else { expect(toasts).not.toHaveBeenCalled(); expect(hooks().flyingRef.current).toBe(false); }
  });

  it.each(['committed', 'pending', 'delayed'])('preserves a compatible %s reflection and journal update during Fly Again', async timing => {
    await mount('debrief', {}, { delayed: timing === 'delayed' }); const launch = handler(launchButton('debrief'));
    const newer = { lastDebrief: { ...copy(latest.lastDebrief), reflection: 'A revised explanation before departure.' },
      flightPracticeHistory: [...copy(latest.flightPracticeHistory), review({ attemptId: 'other-saved-flight' })],
      totalFlightTime: 950, teacherMarker: 'host metadata retained', debriefHistoryIndex: 1 };
    if (timing === 'delayed') { await run(launch); await patch(newer); await flush(); }
    else if (timing === 'committed') { await patch(newer); await run(launch); }
    else await act(async () => { externalPatch(newer); launch(); });
    assertFreshDeparture(); expect(latest).toMatchObject(newer);
    const serialized = copy(latest); expect(serialized.lastDebrief).toEqual(newer.lastDebrief);
    expect(serialized.flightPracticeHistory).toEqual(newer.flightPracticeHistory); expect(serialized.quizScore).toBe(3);
  });

  it.each(['menu', 'debrief'])('recovers newer same-attempt evidence instead of starting accepted %s runtime over it', async kind => {
    await mount(kind, {}, { delayed: true, replaceAcceptedLaunch: state => ({ ...state,
      flightPractice: { ...state.flightPractice, record: { ...state.flightPractice.record, sessionTime: 9, airborneSeconds: 3, flightTime: 3, maxAlt: 6000 } } }) });
    const beforeRuntime = runtime(); await click(launchButton(kind)); await flush();
    expect(hooks().flyingRef.current).toBe(false); expect(requestAnimationFrame).not.toHaveBeenCalled();
    expect(hooks().flightRef.current).toEqual(beforeRuntime.flight); expect(plan()).toEqual(beforeRuntime.plan);
    expect(latest.view).toBe('debrief'); expect(latest.lastDebrief).toMatchObject({ attemptId: accepted[0].flightPractice.attemptId,
      sessionTime: 9, airborneSeconds: 3, maxAlt: 6000, interrupted: true });
    expect(latest.flightPracticeHistory.some(item => item.attemptId === 'prior-free-flight')).toBe(true);
  });

  it.each(['menu', 'lesson', 'debrief'])('waits for an accepted %s departure in a legacy updateMulti host', async kind => {
    await mount(kind, {}, { delayed: true, legacyHost: true }); const before = copy(latest), beforeRuntime = runtime();
    await click(launchButton(kind)); expect(pending).toHaveLength(1); expect(latest).toEqual(before); expect(runtime()).toEqual(beforeRuntime);
    await flush(); assertFreshDeparture(); expect(requestAnimationFrame).toHaveBeenCalledTimes(1); expect(pending).toHaveLength(0);
  });
});
