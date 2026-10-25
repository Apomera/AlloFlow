import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, host, root, latest, savedRoot, externalPatch, poke, pending, replayChecks, accepted, xp, toasts, errors, listeners;
const ids = ['coastal_rescue', 'drone_survey', 'drone_powerline'];
const drones = ids.slice(1);
const copy = value => JSON.parse(JSON.stringify(value));
const hooks = () => window.__testHooks.flightSim;
const button = text => [...host.querySelectorAll('button')].find(node => node.textContent.trim() === text);
const mode = id => id === 'coastal_rescue' ? 'rescue' : id === 'drone_powerline' ? 'powerline' : 'aerial';
const mission = (id = 'drone_survey', patch = {}) => api.normalizeFlightMissionRecord({ missionId: id, mode: mode(id),
  launchLat: 43.646, launchLon: -70.309, elapsedSeconds: 24, completed: false, returned: false,
  battery: 82, batteryExhausted: false, recovered: id === 'coastal_rescue', recoveredAtSeconds: 12,
  targets: [{ name: 'Earlier observed site', lat: 43.65, lon: -70.30, captured: true },
    ...(id === 'coastal_rescue' ? [] : [{ name: 'Remaining site', lat: 43.64, lon: -70.31, captured: false }])], ...patch });
const checkpoint = (id = 'drone_survey', patch = {}) => ({ version: 1, attemptId: 'incoming-mission',
  recordedAt: '2026-10-23T12:00:00.000Z', mission: mission(id), ...patch });
const review = (id = 'coastal_rescue', patch = {}) => ({ attemptId: 'mission-review', aircraftId: id === 'coastal_rescue' ? 'rescue_heli' : 'drone',
  activityId: id, investigation: false, startedAirborne: false, endedAt: '2026-10-23T15:00:00.000Z', sessionTime: 24,
  flightTime: 20, airborneSeconds: 20, maxAlt: 110, maxSpeed: 5, landings: 0, reflection: 'Keep my mission explanation.',
  samples: [], mission: mission(id), ...patch });
function handler(node, name = 'onClick') {
  expect(node).toBeTruthy(); return node[Object.keys(node).find(key => key.startsWith('__reactProps$'))][name];
}
const menuButton = id => host.querySelector('[data-flight-challenge-id="' + id + '"]');
const launchButton = (surface, id = 'coastal_rescue') => surface === 'recommended' ? button('Start recommended practice') : menuButton(id);
const beginButton = () => button('✓ I Understand — Begin Flight');
const modalKeyHandler = () => {
  const entry = listeners.mock.calls.filter(([name, , options]) => name === 'keydown' && options === true).at(-1);
  expect(entry).toBeTruthy(); return entry[1];
};
const escapeHandler = () => { const event = modalKeyHandler(); return () => event({ key: 'Escape', keyCode: 27, stopPropagation: vi.fn(), preventDefault: vi.fn() }); };
const modalAction = action => action === 'begin' ? handler(beginButton()) : action === 'cancel' ? handler(button('Cancel')) : escapeHandler();
async function run(callback) { await act(async () => callback()); }
async function click(node) { expect(node).toBeTruthy(); await run(() => { node.focus(); node.click(); }); }
async function patch(values) { await run(() => externalPatch(values)); }
async function commit() { expect(pending.length).toBeGreaterThan(0); const apply = pending.shift(); await run(apply); }
async function flush() { for (let count = 0; pending.length; count++) { expect(count).toBeLessThan(30); await commit(); } }
function runtime() {
  return copy({ flying: hooks().flyingRef.current, flight: hooks().flightRef.current, controls: hooks().controlsRef.current,
    time: hooks().timeRef.current, plan: hooks().getFlightPlanRef().current, challenge: hooks().getFlightChallengeRef().current,
    weather: hooks().getWeatherRef().current, sprint: hooks().getSprintRef().current, log: hooks().getLogRef().current });
}
function evidence() {
  return copy({ lastDebrief: latest.lastDebrief, flightPracticeHistory: latest.flightPracticeHistory,
    challengeResults: latest.challengeResults, challengeCompleted: latest.challengeCompleted,
    challengeReflections: latest.challengeReflections, completedLessons: latest.completedLessons,
    personalBests: latest.personalBests, totalFlightTime: latest.totalFlightTime, quizScore: latest.quizScore });
}
function sourceReplacement(surface) {
  return surface === 'recommended' ? { lastDebrief: { ...copy(latest.lastDebrief), maxAlt: 130 } } : { aircraft: 'boeing737' };
}
function assertFreshMission(id) {
  const rotor = id === 'coastal_rescue', expectedMode = mode(id), saved = latest.flightMission;
  expect(latest.view).toBe('flying'); expect(hooks().flyingRef.current).toBe(true);
  expect(latest.aircraft).toBe(rotor ? 'rescue_heli' : 'drone'); expect(latest.selectedChallenge).toBe(id);
  expect(latest.weather).toBe('windy');
  expect(latest.droneBriefing).toBeFalsy(); expect(api.normalizeFlightMissionCheckpoint(saved)).toEqual(saved);
  expect(saved.attemptId).toMatch(/^flight_/); expect(saved.recordedAt).toBe('2026-10-23T16:30:00.000Z');
  expect(saved.mission).toMatchObject({ missionId: id, mode: expectedMode, contextKnown: true,
    elapsedSeconds: 0, completed: false, outcome: 'ended', targetsComplete: true });
  expect(saved.mission.targets).toHaveLength(rotor ? 1 : id === 'drone_survey' ? 4 : 6);
  expect(saved.mission.targets.every(target => target.captured === false)).toBe(true);
  expect(saved.mission.capturedCount).toBe(rotor ? null : 0); expect(saved.mission.battery).toBe(rotor ? null : 100);
  expect(saved.mission.completedAtSeconds).toBeNull(); expect(saved.mission.recoveredAtSeconds).toBeNull();
  for (const key of ['pose', 'controls', 'flightTime', 'maxAlt', 'maxSpeed', 'distance']) expect(saved).not.toHaveProperty(key);
  for (const key of ['flightPractice', 'flightSprint', 'flightChallenge']) expect(latest[key]).toBeNull();
  expect(hooks().getFlightChallengeRef().current).toBeNull(); expect(latest.autopilot).toEqual({ hdg: false, alt: false, spd: false });
  expect(hooks().getFlightPlanRef().current).toMatchObject({ departure: null, destination: null, route: [] });
  expect(latest[rotor ? 'survey' : 'rescue']).toBeNull();
  expect(latest[rotor ? 'rescue' : 'survey']).toMatchObject({ active: true, completed: false });
  if (!rotor) expect(latest.survey).toMatchObject({ mode: expectedMode, battery: 100, capturedCount: 0, captureProgress: 0 });
}
async function mount(surface = 'menu', id = 'coastal_rescue', seed = {}, options = {}) {
  if (root) await act(async () => root.unmount()); host?.remove();
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  pending = []; accepted = [];
  function App() {
    const [data, setData] = React.useState({ otherTool: { writing: 'Keep unrelated writing.' }, flightSim: {
      view: surface === 'recommended' ? 'debrief' : 'menu', aircraft: 'sr71',
      selectedChallenge: surface === 'briefing' ? id : null, droneBriefing: surface === 'briefing',
      planDep: 'kden', planDest: 'ksfo', cityOnline: false, weather: 'windy', railCollapsed: true,
      menuSections: { challenges: true, aircraft: true, plan: true }, totalFlightTime: 900, quizScore: 3,
      teacherMarker: 'original', completedLessons: { lift: true }, challengeCompleted: {},
      lastDebrief: review(id), flightPracticeHistory: [review('drone_survey', { attemptId: 'earlier-attempt', reflection: 'Earlier explanation.' })],
      challengeResults: { energy_management: api.createFlightChallenge('energy_management') },
      challengeReflections: { first_flight: 'Keep my challenge draft.' }, personalBests: { maxAlt: 12000 },
      earnedBadges: Object.fromEntries(api.ACHIEVEMENTS.map(item => [item.id, true])),
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
      updateMulti: (toolId, values) => submit(old => ({ ...old, [toolId]: { ...old[toolId], ...values } })), awardXP: xp, addToast: toasts,
    }));
  }
  const app = React.createElement(App);
  await act(async () => root.render(options.strict ? React.createElement(React.StrictMode, null, app) : app));
}
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-23T16:30:00.000Z'));
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {}; window.SkySchoolCityServices = { enabled: false };
  tool = loadTool(process.env.SKYSCHOOL_MISSION_DEPARTURE_SOURCE || 'stem_lab/stem_tool_flightsim.js', 'flightSim'); api = window.__RR_TEST_EXPORTS__.flightSim;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function() {
    return new Proxy({ canvas: this, measureText: text => ({ width: String(text).length * 6 }),
      createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }) },
    { get: (target, key) => key in target ? target[key] : () => {}, set: (target, key, value) => { target[key] = value; return true; } });
  });
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.stubGlobal('cancelAnimationFrame', vi.fn());
  replayChecks = []; xp = vi.fn(); toasts = vi.fn(); errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  listeners = vi.spyOn(document, 'addEventListener');
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  expect(errors).not.toHaveBeenCalled(); expect(xp).not.toHaveBeenCalled();
  expect(replayChecks.every(check => check.pure && check.stable)).toBe(true);
  delete window.__RR_TEST_EXPORTS__; delete window.__testHooks; delete window.SkySchoolCityServices;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('Sky School rescue starts and drone briefings own their source', () => {
  it.each(ids.flatMap(id => ['menu', 'recommended'].flatMap(surface => ['committed', 'pending', 'delayed'].map(timing => [id, surface, timing]))))
    ('rejects stale %s from %s after a %s source replacement', async (id, surface, timing) => {
      await mount(surface, id, {}, { delayed: timing === 'delayed' });
      const launch = handler(launchButton(surface, id)), before = copy(latest), beforeRuntime = runtime(), newer = sourceReplacement(surface);
      if (timing === 'committed') { await patch(newer); await run(launch); }
      else if (timing === 'pending') await run(() => { externalPatch(newer); launch(); });
      else { await run(launch); expect(runtime()).toEqual(beforeRuntime); expect(toasts).not.toHaveBeenCalled(); await patch(newer); await flush(); }
      expect(latest).toEqual({ ...before, ...newer }); expect(runtime()).toEqual(beforeRuntime);
      expect(requestAnimationFrame).not.toHaveBeenCalled(); expect(toasts).not.toHaveBeenCalled();
    });

  it.each(ids)('retires a retained %s opener through a rendered A-to-B-to-A visit', async id => {
    await mount('recommended', id); const launch = handler(launchButton('recommended', id)), before = copy(latest), beforeRuntime = runtime();
    await patch({ lastDebrief: review(id, { attemptId: 'replacement-review' }) }); await patch(before); await run(launch);
    expect(latest).toEqual(before); expect(runtime()).toEqual(beforeRuntime); expect(toasts).not.toHaveBeenCalled();
    await click(launchButton('recommended', id));
    if (id === 'coastal_rescue') assertFreshMission(id);
    else { expect(latest.view).toBe('menu'); expect(latest.droneBriefing).toBe(true); expect(latest.selectedChallenge).toBe(id); }
  });

  it.each(drones.flatMap(id => ['menu', 'recommended'].map(surface => [id, surface])))
    ('opens %s from %s exactly once with a delayed cloned receipt and no aircraft reset', async (id, surface) => {
      await mount(surface, id, {}, { delayed: true, strict: true, cloneAtCommit: true });
      const open = handler(launchButton(surface, id)), before = copy(latest), beforeRuntime = runtime(), saved = evidence();
      await run(() => { open(); open(); }); await run(poke);
      expect(pending).toHaveLength(1); expect(latest).toEqual(before); expect(runtime()).toEqual(beforeRuntime);
      await patch({ teacherMarker: 'new metadata' }); await flush();
      expect(latest).toMatchObject({ view: 'menu', droneBriefing: true, selectedChallenge: id, teacherMarker: 'new metadata' });
      expect(runtime()).toEqual(beforeRuntime); expect(evidence()).toEqual(saved); expect(accepted).toHaveLength(0);
      expect(requestAnimationFrame).not.toHaveBeenCalled(); expect(toasts).not.toHaveBeenCalled();
      expect(document.activeElement.id).toBe('drone-briefing-title');
      await click(beginButton()); expect(pending).toHaveLength(1); expect(hooks().flyingRef.current).toBe(false);
      await flush(); assertFreshMission(id); expect(toasts).toHaveBeenCalledTimes(1);
    });

  it.each(['rescue first', 'free first', 'drone first'])('accepts only the first same-batch departure when %s', async order => {
    await mount('menu', 'coastal_rescue', {}, { delayed: true });
    const rescue = handler(menuButton('coastal_rescue')), drone = handler(menuButton('drone_survey')),
      free = handler(host.querySelector('[aria-label="Free Flight from Portland, ME"]'));
    await run(() => { if (order === 'rescue first') { rescue(); free(); drone(); }
      else if (order === 'free first') { free(); rescue(); drone(); } else { drone(); rescue(); free(); } });
    expect(pending).toHaveLength(1); expect(toasts).not.toHaveBeenCalled(); await flush();
    if (order === 'rescue first') { assertFreshMission('coastal_rescue'); expect(toasts).toHaveBeenCalledTimes(1); }
    else if (order === 'free first') { expect(latest.flightPractice.record.activityId).toBe('free_flight'); expect(latest.flightMission).toBeNull(); }
    else { expect(latest).toMatchObject({ view: 'menu', droneBriefing: true, selectedChallenge: 'drone_survey' }); expect(hooks().flyingRef.current).toBe(false); }
    expect(new Set(accepted.map(item => (item.flightMission || item.flightPractice).attemptId)).size).toBe(order === 'drone first' ? 0 : 1);
  });

  it.each(['supporting lesson', 'reflection', 'journal selection'].flatMap(action => [false, true].map(legacyHost => [action, legacyHost])))
    ('keeps a pending briefing ahead of fresh debrief %s after local rerender (legacy host: %s)', async (action, legacyHost) => {
      await mount('recommended', 'drone_survey', { flightPracticeHistory: [review('coastal_rescue', { attemptId: 'earlier-rescue' }),
        review('drone_powerline', { attemptId: 'earlier-inspection' })] }, { delayed: true, legacyHost });
      const saved = evidence(), beforeRuntime = runtime(); await click(launchButton('recommended', 'drone_survey')); await run(poke);
      const event = action === 'supporting lesson' ? handler(host.querySelector('[data-flight-debrief-study="supporting"]'))
        : action === 'reflection' ? () => handler(host.querySelector('#debrief-evidence-explanation'), 'onChange')({ target: { value: 'Late explanation after leaving review.' } })
          : () => handler(host.querySelector('#debrief-earlier-flight'), 'onChange')({ target: { value: '1' } });
      await run(event); expect(pending).toHaveLength(1); expect(latest.view).toBe('debrief'); expect(evidence()).toEqual(saved);
      await flush(); expect(latest).toMatchObject({ view: 'menu', droneBriefing: true, selectedChallenge: 'drone_survey' });
      expect(evidence()).toEqual(saved); expect(latest.debriefHistoryIndex).toBeUndefined(); expect(latest.debriefLessonReturn).toBeUndefined();
      expect(runtime()).toEqual(beforeRuntime); expect(requestAnimationFrame).not.toHaveBeenCalled(); expect(toasts).not.toHaveBeenCalled();
    });

  it.each(['pending with local rerender', 'rendered'].flatMap(timing => [false, true].map(legacyHost => [timing, legacyHost])))
    ('blocks Journal behind a %s drone briefing (legacy host: %s)', async (timing, legacyHost) => {
      const delayed = timing === 'pending with local rerender'; await mount('menu', 'drone_powerline', {}, { delayed, legacyHost });
      const beforeRuntime = runtime(), saved = evidence(); await click(menuButton('drone_powerline')); await run(poke);
      await click(button('Review flight journal'));
      if (delayed) { expect(pending).toHaveLength(1); await flush(); }
      expect(latest).toMatchObject({ view: 'menu', droneBriefing: true, selectedChallenge: 'drone_powerline' });
      expect(evidence()).toEqual(saved); expect(runtime()).toEqual(beforeRuntime); expect(requestAnimationFrame).not.toHaveBeenCalled(); expect(toasts).not.toHaveBeenCalled();
    });
});

describe('Sky School drone modal actions belong to their current briefing', () => {
  const replacements = { mode: () => ({ selectedChallenge: 'drone_powerline' }),
    source: () => ({ view: 'lesson', selectedLesson: 'navigation' }),
    checkpoint: () => ({ flightMission: checkpoint() }) };
  it.each(['begin', 'cancel', 'Escape'].flatMap(action => Object.keys(replacements).flatMap(subject => ['pending', 'delayed'].map(timing => [action, subject, timing]))))
    ('rejects stale %s after a %s replacement with %s saving', async (action, subject, timing) => {
      await mount('briefing', 'drone_survey', {}, { delayed: timing === 'delayed' });
      const event = modalAction(action), before = copy(latest), beforeRuntime = runtime(), newer = replacements[subject]();
      if (timing === 'pending') await run(() => { externalPatch(newer); event(); });
      else { await run(event); expect(runtime()).toEqual(beforeRuntime); expect(toasts).not.toHaveBeenCalled(); await patch(newer); await flush(); }
      if (subject === 'checkpoint') {
        expect(latest).toMatchObject({ view: 'debrief', droneBriefing: false, selectedChallenge: null, flightMission: null });
        expect(latest.lastDebrief).toEqual(api.recoverFlightMissionCheckpoint(newer.flightMission));
        expect(latest.lastDebrief.mission).toMatchObject({ interrupted: true, elapsedSeconds: 24, capturedCount: 1, battery: 82 });
        expect(latest.flightPracticeHistory).toEqual(expect.arrayContaining([api.normalizeFlightPracticeRecord(before.lastDebrief),
          ...before.flightPracticeHistory.map(record => api.normalizeFlightPracticeRecord(record))]));
        for (const key of ['challengeResults', 'challengeCompleted', 'challengeReflections', 'completedLessons', 'personalBests', 'totalFlightTime', 'quizScore']) expect(latest[key]).toEqual(before[key]);
      } else expect(latest).toEqual({ ...before, ...newer });
      expect(runtime()).toEqual(beforeRuntime);
      expect(toasts).not.toHaveBeenCalled(); expect(requestAnimationFrame).not.toHaveBeenCalled();
    });

  it.each(['begin', 'cancel', 'Escape'])('retires retained %s after briefing mode A-to-B-to-A while the fresh action works', async action => {
    await mount('briefing', 'drone_survey'); const event = modalAction(action), before = copy(latest), beforeRuntime = runtime();
    await patch({ selectedChallenge: 'drone_powerline' }); await patch({ selectedChallenge: 'drone_survey' }); await run(event);
    expect(latest).toEqual(before); expect(runtime()).toEqual(beforeRuntime); expect(toasts).not.toHaveBeenCalled();
    await run(modalAction(action));
    if (action === 'begin') assertFreshMission('drone_survey');
    else { expect(latest.droneBriefing).toBe(false); expect(latest.selectedChallenge).toBeNull(); expect(runtime()).toEqual(beforeRuntime); }
  });

  it.each(['cancel', 'Escape'])('keeps an accepted pending begin ahead of a fresh %s after local rerender', async action => {
    await mount('briefing', 'drone_powerline', {}, { delayed: true, legacyHost: true });
    await click(beginButton()); expect(pending).toHaveLength(1); await run(poke); await run(modalAction(action));
    expect(pending).toHaveLength(1); expect(toasts).not.toHaveBeenCalled(); await flush();
    assertFreshMission('drone_powerline'); expect(toasts).toHaveBeenCalledTimes(1); expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
  });

  it.each(['cancel', 'Escape'])('keeps %s ahead of a retained same-batch Begin Flight action', async action => {
    await mount('briefing', 'drone_survey', {}, { delayed: true }); const begin = modalAction('begin'), dismiss = modalAction(action), beforeRuntime = runtime();
    await run(() => { dismiss(); begin(); }); expect(pending).toHaveLength(1); await flush();
    expect(latest.droneBriefing).toBe(false); expect(latest.selectedChallenge).toBeNull();
    expect(runtime()).toEqual(beforeRuntime); expect(toasts).not.toHaveBeenCalled(); expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it.each(['navigation', 'mode', 'mode A-to-B-to-A'])('does not let a retained Tab listener trap focus after %s', async subject => {
    await mount('briefing', 'drone_survey'); const onKey = modalKeyHandler();
    if (subject === 'navigation') await patch({ view: 'lesson', selectedLesson: 'navigation' });
    else { await patch({ selectedChallenge: 'drone_powerline' }); if (subject === 'mode A-to-B-to-A') await patch({ selectedChallenge: 'drone_survey' }); }
    const outside = document.createElement('button'); outside.textContent = 'Current workspace control'; document.body.appendChild(outside);
    try {
      await run(() => outside.focus());
      if (subject === 'navigation') expect(document.activeElement === outside).toBe(true);
      else expect(host.querySelector('#skyschool-drone-briefing').contains(document.activeElement)).toBe(true);
      // The current modal may redirect external focus. The retained listener
      // must neither prevent Tab nor disturb that current focus owner.
      const currentFocus = document.activeElement;
      const event = { key: 'Tab', keyCode: 9, shiftKey: false, stopPropagation: vi.fn(), preventDefault: vi.fn() };
      await run(() => onKey(event));
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(document.activeElement === currentFocus).toBe(true);
    } finally { outside.remove(); }
  });

  it.each(['cancel', 'Escape'])('returns focus to the original launcher after accepted %s of a replaced mode', async action => {
    await mount('menu', 'drone_survey'); const opener = menuButton('drone_survey'); await click(opener);
    expect(document.activeElement.id).toBe('drone-briefing-title'); await patch({ selectedChallenge: 'drone_powerline' });
    await run(modalAction(action)); expect(latest.droneBriefing).toBe(false);
    const focused = document.activeElement;
    const focusSummary = focused ? JSON.stringify({ tag: focused.tagName, id: focused.id, text: (focused.textContent || '').replace(/\s+/g, ' ').slice(0, 120) }) : 'null';
    expect(focused === opener, 'Active focus after dismissal: ' + focusSummary).toBe(true);
  });

  it.each(['cancel', 'Escape'])('does not restore old launcher focus after a delayed %s is rejected', async action => {
    await mount('menu', 'drone_survey', {}, { delayed: true }); await click(menuButton('drone_survey')); await flush();
    await run(modalAction(action)); expect(pending).toHaveLength(1);
    await patch({ view: 'lesson', selectedLesson: 'navigation' });
    expect(document.activeElement).toBe(host.querySelector('#skyschool-lesson-title'));
    const outside = document.createElement('button'); outside.textContent = 'New workspace control'; document.body.appendChild(outside); outside.focus();
    await flush();
    expect(latest.view).toBe('lesson'); expect(document.activeElement).toBe(outside); outside.remove();
    expect(toasts).not.toHaveBeenCalled(); expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('does not restore the old launcher when incoming navigation closes the modal', async () => {
    await mount('menu', 'drone_survey'); await click(menuButton('drone_survey'));
    await patch({ view: 'preflight' }); expect(document.activeElement).toBe(host.querySelector('#skyschool-preflight-title'));
    expect(host.querySelector('#skyschool-drone-briefing')).toBeNull(); expect(toasts).not.toHaveBeenCalled();
  });

  it.each(['pending open', 'committed open', 'fresh modal'])('rejects free, challenge and planned departure controls behind a %s', async timing => {
    await mount('menu', 'drone_survey', {}, { delayed: timing === 'pending open' });
    const getActions = () => [host.querySelector('[aria-label="Free Flight from Portland, ME"]'), menuButton('first_climb'),
      host.querySelector('[aria-label="File Route: file the flight plan and depart"]')].map(node => handler(node));
    const retained = getActions(), beforeRuntime = runtime(); await click(menuButton('drone_survey'));
    if (timing === 'pending open') await run(poke);
    const actions = timing === 'fresh modal' ? getActions() : retained;
    await run(() => actions.forEach(action => action()));
    if (timing === 'pending open') { expect(pending).toHaveLength(1); await flush(); }
    expect(latest).toMatchObject({ view: 'menu', droneBriefing: true, selectedChallenge: 'drone_survey' });
    expect(runtime()).toEqual(beforeRuntime); expect(toasts).not.toHaveBeenCalled(); expect(requestAnimationFrame).not.toHaveBeenCalled();
    expect(latest.flightMission).toBeUndefined(); expect(latest.flightPractice).toBeUndefined();
  });
});

describe('Sky School accepted mission departures preserve observations and start fresh', () => {
  it.each(['rescue', 'survey'].flatMap(subject => ['committed', 'pending'].map(timing => [subject, timing])))
    ('keeps retained controls valid through %s metadata and key-order changes in a %s save', async (subject, timing) => {
      const active = subject === 'rescue'
        ? { active: true, survivorLat: 43.606, survivorLon: -70.239, recovered: false, completed: false, startedAt: 0, hoistTime: 0 }
        : { active: true, mode: 'aerial', launchLat: 43.646, launchLon: -70.309, battery: 82, completed: false,
          photos: [{ name: 'Existing site', lat: 43.654, lon: -70.301, captured: false }], capturedCount: 0, captureProgress: 0 };
      const id = subject === 'rescue' ? 'coastal_rescue' : 'drone_powerline';
      await mount(subject === 'rescue' ? 'menu' : 'briefing', id, { [subject]: active });
      const launch = handler(subject === 'rescue' ? menuButton(id) : beginButton()), saved = evidence();
      const changed = Object.fromEntries(Object.entries(copy(active)).reverse()); changed.hostDecoration = { selected: true };
      if (subject === 'survey') changed.photos = changed.photos.map(target => ({ ...Object.fromEntries(Object.entries(target).reverse()), hostDecoration: 'ignored' }));
      if (timing === 'committed') { await patch({ [subject]: changed }); await run(launch); }
      else await run(() => { externalPatch({ [subject]: changed }); launch(); });
      assertFreshMission(id); expect(evidence()).toEqual(saved); expect(toasts).toHaveBeenCalledTimes(1); expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
    });

  it.each(ids)('starts %s once after one atomic checkpoint, duplicated clicks and StrictMode replay', async id => {
    await mount(id === 'coastal_rescue' ? 'menu' : 'briefing', id, {}, { delayed: true, strict: true, cloneAtCommit: true });
    hooks().getFlightPlanRef().current = { departure: { id: 'old-origin' }, destination: { id: 'old-destination' }, route: [] };
    const launch = handler(id === 'coastal_rescue' ? menuButton(id) : beginButton()), before = copy(latest), beforeRuntime = runtime(), saved = evidence();
    await run(() => { launch(); launch(); }); await run(poke);
    expect(pending).toHaveLength(1); expect(latest).toEqual(before); expect(runtime()).toEqual(beforeRuntime);
    expect(toasts).not.toHaveBeenCalled(); expect(requestAnimationFrame).not.toHaveBeenCalled();
    await patch({ teacherMarker: 'new metadata', lastDebrief: copy(latest.lastDebrief) }); await flush();
    assertFreshMission(id); expect(evidence()).toEqual(saved); expect(latest.teacherMarker).toBe('new metadata');
    expect(hooks().getWeatherRef().current).toEqual(beforeRuntime.weather);
    expect(savedRoot.otherTool).toEqual({ writing: 'Keep unrelated writing.' });
    expect(new Set(accepted.map(item => item.flightMission?.attemptId)).size).toBe(1);
    expect(accepted.every(item => api.normalizeFlightMissionCheckpoint(item.flightMission))).toBe(true);
    expect(toasts).toHaveBeenCalledTimes(1); expect(requestAnimationFrame).toHaveBeenCalledTimes(1); expect(pending).toHaveLength(0);
    await run(poke); expect(toasts).toHaveBeenCalledTimes(1); expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
  });

  it.each(ids)('keeps the %s rotor launch geometry, target locations and unobserved mission clocks', async id => {
    await mount(id === 'coastal_rescue' ? 'menu' : 'briefing', id);
    const weather = { type: 'windy', wind: 15, windDir: 220, turbulence: .3, visibility: .85 };
    hooks().getWeatherRef().current = copy(weather);
    await click(id === 'coastal_rescue' ? menuButton(id) : beginButton()); assertFreshMission(id);
    expect(hooks().getWeatherRef().current).toEqual(weather);
    const portland = api.WAYPOINTS.find(item => item.id === 'kpwm'), flight = hooks().flightRef.current, saved = latest.flightMission.mission;
    expect(flight).toMatchObject({ lat: portland.lat, lon: portland.lon, altitude: portland.alt, fieldElev: portland.alt,
      heading: 0, speed: 0, onGround: true });
    expect(hooks().controlsRef.current).toMatchObject({ throttle: 0, pitch: 0, bank: 0 });
    expect(saved).toMatchObject({ launchLat: portland.lat, launchLon: portland.lon, elapsedSeconds: 0 });
    const offsets = id === 'coastal_rescue' ? [[-.04, .07]] : id === 'drone_survey'
      ? [[.008, .008], [.008, -.008], [-.008, -.008], [-.008, .008]]
      : [-.006, -.004, -.002, 0, .002, .004].map(lon => [.012, lon]);
    saved.targets.forEach((target, index) => {
      expect(target.lat).toBeCloseTo(portland.lat + offsets[index][0], 8);
      expect(target.lon).toBeCloseTo(portland.lon + offsets[index][1], 8);
    });
  });

  it.each(ids)('waits for an accepted %s checkpoint in a legacy updateMulti host', async id => {
    await mount(id === 'coastal_rescue' ? 'menu' : 'briefing', id, {}, { delayed: true, legacyHost: true });
    const before = copy(latest), beforeRuntime = runtime(); await click(id === 'coastal_rescue' ? menuButton(id) : beginButton());
    expect(pending).toHaveLength(1); expect(latest).toEqual(before); expect(runtime()).toEqual(beforeRuntime); expect(toasts).not.toHaveBeenCalled();
    await flush(); assertFreshMission(id); expect(toasts).toHaveBeenCalledTimes(1); expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
  });

  it.each(ids)('recovers superseding %s mission observations instead of resetting accepted runtime', async id => {
    await mount(id === 'coastal_rescue' ? 'menu' : 'briefing', id, {}, { delayed: true, replaceAcceptedLaunch: state => ({ ...state,
      flightMission: { ...state.flightMission, mission: { ...state.flightMission.mission, elapsedSeconds: 9,
        battery: id === 'coastal_rescue' ? null : 92, targets: state.flightMission.mission.targets.map((target, index) => ({ ...target, captured: index === 0 })) } } }) });
    const beforeRuntime = runtime(); await click(id === 'coastal_rescue' ? menuButton(id) : beginButton()); await flush();
    expect(hooks().flyingRef.current).toBe(false); expect(requestAnimationFrame).not.toHaveBeenCalled(); expect(toasts).not.toHaveBeenCalled();
    expect(hooks().flightRef.current).toEqual(beforeRuntime.flight); expect(hooks().getFlightPlanRef().current).toEqual(beforeRuntime.plan);
    expect(latest.lastDebrief).toMatchObject({ attemptId: accepted[0].flightMission.attemptId, activityId: id,
      sessionTime: 9, mission: { interrupted: true, elapsedSeconds: 9 } });
    expect(latest.lastDebrief.mission.targets[0].captured).toBe(true);
    expect(latest.flightMission).toBeNull(); expect(latest.lastDebrief).not.toHaveProperty('maxAlt');
  });

  it('preserves an edited mission reflection and incoming journal metadata before recommended rescue', async () => {
    await mount('recommended', 'coastal_rescue', {}, { delayed: true }); const launch = handler(launchButton('recommended'));
    const input = host.querySelector('textarea'); expect(input).toBeTruthy(); const edit = handler(input, 'onChange');
    await run(() => { edit({ target: { value: 'Keep this revised rescue explanation.' } }); launch(); });
    expect(pending).toHaveLength(2); await commit(); expect(hooks().flyingRef.current).toBe(false);
    const history = [...copy(latest.flightPracticeHistory), review('drone_powerline', { attemptId: 'other-host-review' })];
    await patch({ flightPracticeHistory: history, totalFlightTime: 950 }); await flush(); assertFreshMission('coastal_rescue');
    expect(latest.lastDebrief.reflection).toBe('Keep this revised rescue explanation.');
    expect(latest.flightPracticeHistory).toEqual(history); expect(latest.totalFlightTime).toBe(950);
  });
});
