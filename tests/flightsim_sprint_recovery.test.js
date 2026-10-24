import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, host, root, latest, updateSaved, frameCallback, wallTime, writes, xp;
const hooks = () => window.__testHooks.flightSim;
const checkpoint = (patch = {}) => ({ version: 1, attemptId: 'sprint-interrupted', recordedAt: '2026-10-20T12:00:00.000Z',
  sprint: { routeId: 'americas', status: 'ended', elapsedSeconds: 14, results: [
    { place: 'Washington D.C.', answer: 'Washington D.C.', expected: 'Washington D.C.' },
  ] }, ...patch });
const prior = (id = 'prior-flight') => ({ attemptId: id, aircraftId: 'cessna172', activityId: 'free_flight',
  flightTime: 20, startedAirborne: false, investigation: false, reflection: 'Keep my earlier explanation.', samples: [] });
async function mount(seed = {}) {
  if (root) await act(async () => root.unmount());
  host?.remove(); host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host); frameCallback = null;
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', aircraft: 'cessna172', railCollapsed: true,
      menuSections: { sprints: true }, takeoffTutorialDismissed: true, landingTutorialDismissed: true, ...seed } });
    latest = data.flightSim;
    updateSaved = patch => setData(old => ({ ...old, flightSim: { ...old.flightSim, ...patch } }));
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      awardXP: (...args) => xp.push(args),
      update: (id, key, value) => { writes.push({ [key]: value }); setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })); },
      updateMulti: (id, patch) => { writes.push(patch); setData(old => ({ ...old, [id]: { ...old[id], ...patch } })); },
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}
async function launch() {
  const route = api.SPRINT_ROUTES.find(item => item.id === 'americas');
  const button = [...host.querySelectorAll('#skyschool-sec-sprints button')].find(node => node.textContent.includes(route.name));
  expect(button).toBeTruthy(); await act(async () => button.click());
}
async function frame() {
  wallTime += 100; expect(frameCallback).toBeTypeOf('function');
  await act(async () => frameCallback());
}
async function question(distanceNm = 10) {
  const sp = hooks().getSprintRef().current, target = sp.places[1];
  Object.assign(sp, { active: true, phase: 'question', placeIndex: 1, approaching: target,
    answered: false, correct: null, score: 0, streak: 0, results: [], question: 'Which city is ahead?',
    options: ['Wrong A', target.name, 'Wrong C', 'Wrong D'], correctAnswer: target.name });
  Object.assign(hooks().flightRef.current, { lat: target.lat + distanceNm / 60, lon: target.lon, altitude: 35000, vsi: 0, onGround: false });
  await act(async () => updateSaved({})); return sp;
}
const savedWrites = () => writes.filter(patch => patch.flightSprint != null);
beforeEach(() => {
  vi.useFakeTimers(); resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); api = window.__RR_TEST_EXPORTS__.flightSim;
  const context = new Proxy({ measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }) },
    { get: (target, key) => key in target ? target[key] : () => {}, set: (target, key, value) => { target[key] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  wallTime = 1000; vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  vi.stubGlobal('requestAnimationFrame', callback => { if (callback.name === 'loop') frameCallback = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => {}); writes = []; xp = [];
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  delete window.__RR_TEST_EXPORTS__; delete window.__testHooks;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('Sky School interrupted geography sprint evidence', () => {
  it('keeps bounded canonical responses and identity without retaining poses or trusting saved scores', () => {
    const saved = checkpoint(); saved.pose = { lat: 99 }; saved.sprint.score = 999;
    saved.sprint.results.push({ place: 'Washington D.C.', answer: 'Wrong', expected: 'Washington D.C.' },
      { place: 'Unknown city', answer: 'Unknown city', expected: 'Unknown city' });
    const normalized = api.normalizeFlightSprintCheckpoint(saved);
    expect(normalized.sprint).toMatchObject({ score: 1, total: 7, streak: 1 });
    expect(normalized.sprint.results).toHaveLength(1); expect(normalized).not.toHaveProperty('pose');
    expect(saved.sprint.results).toHaveLength(3); expect(saved.sprint.score).toBe(999);
  });
  it('rejects invalid checkpoint identity, routes, clocks, and containers', () => {
    for (const saved of [null, [], 'bad', checkpoint({ version: 2 }), checkpoint({ attemptId: '' }),
      checkpoint({ attemptId: '../bad' }), checkpoint({ attemptId: 'x'.repeat(81) }),
      checkpoint({ sprint: { routeId: 'retired', status: 'ended', elapsedSeconds: 1, results: [] } }),
      checkpoint({ sprint: { routeId: 'americas', status: 'ended', elapsedSeconds: Infinity, results: [] } }),
      Object.create(checkpoint())]) expect(api.normalizeFlightSprintCheckpoint(saved)).toBeNull();
  });
  it('keeps geography elapsed time and responses while leaving aircraft performance unrecorded', () => {
    const recovered = api.recoverFlightSprintCheckpoint(checkpoint());
    expect(recovered).toMatchObject({ attemptId: 'sprint-interrupted', activityId: 'geography_sprint',
      aircraftId: 'sr71', sprintRouteId: 'americas', flightTime: 14, samples: [], sprint: { interrupted: true, status: 'ended', score: 1 } });
    for (const name of ['maxAlt', 'maxSpeed', 'distance', 'bestLanding', 'airborneSeconds', 'badges']) expect(recovered).not.toHaveProperty(name);
  });
  it('checkpoints launch and a native answer immediately without requiring End flight', async () => {
    await mount(); await launch();
    const attempt = latest.flightSprint.attemptId;
    expect(latest.flightSprint.sprint.results).toEqual([]);
    await question(); await act(async () => host.querySelector('[data-sprint-answer="1"]').click());
    expect(latest.flightSprint.attemptId).toBe(attempt);
    expect(latest.flightSprint.sprint).toMatchObject({ score: 1, results: [{ place: 'Washington D.C.', answer: 'Washington D.C.' }] });
  });
  it('preserves the answered stop after a serialized remount without starting physics or awarding credit', async () => {
    await mount({ totalFlightTime: 900 }); await launch(); await question();
    await act(async () => host.querySelector('[data-sprint-answer="1"]').click());
    const saved = JSON.parse(JSON.stringify(latest)), attempt = saved.flightSprint.attemptId;
    const step = vi.spyOn(api.Physics, 'step'); const xpBefore = xp.length;
    await mount(saved);
    expect(latest.view).toBe('debrief'); expect(latest.flightSprint).toBeNull();
    expect(latest.lastDebrief.attemptId).toBe(attempt); expect(latest.lastDebrief.sprint.score).toBe(1);
    expect(host.querySelector('[data-sprint-interrupted]')).toBeTruthy();
    expect(hooks().flyingRef.current).toBe(false); expect(api.Physics.SPRINT_MODE).toBe(false);
    expect(step).not.toHaveBeenCalled(); expect(xp).toHaveLength(xpBefore); expect(latest.totalFlightTime).toBe(900);
  });
  it('records a passed unanswered stop as skipped before any reload', async () => {
    await mount(); await launch(); await question(1); await frame();
    expect(latest.flightSprint.sprint.results).toMatchObject([{ place: 'Washington D.C.', answer: 'SKIPPED', correct: false }]);
  });
  it('limits routine snapshots to once per simulated second and keeps pause still', async () => {
    await mount(); await launch(); const initial = savedWrites().length;
    for (let i = 0; i < 15; i++) await frame();
    expect(savedWrites().length - initial).toBeGreaterThanOrEqual(1);
    expect(savedWrites().length - initial).toBeLessThanOrEqual(2);
    expect(latest.flightSprint.sprint.elapsedSeconds).toBeGreaterThanOrEqual(1);
    await act(async () => host.querySelector('[data-sprint-pause]').click());
    const saved = JSON.stringify(latest.flightSprint), count = savedWrites().length;
    for (let i = 0; i < 5; i++) await frame();
    expect(JSON.stringify(latest.flightSprint)).toBe(saved); expect(savedWrites()).toHaveLength(count);
  });
  it('recovers late storage hydration and archives the prior latest exactly once', async () => {
    await mount({ lastDebrief: prior(), flightPracticeHistory: [prior('older-flight')], totalFlightTime: 600 });
    await act(async () => updateSaved({ flightSprint: checkpoint() }));
    expect(latest.view).toBe('debrief'); expect(latest.flightSprint).toBeNull();
    expect(latest.flightPracticeHistory.map(record => record.attemptId)).toEqual(['older-flight', 'prior-flight']);
    expect(latest.flightPracticeHistory.at(-1).reflection).toBe('Keep my earlier explanation.');
    const recovered = JSON.parse(JSON.stringify(latest)); await mount(recovered);
    expect(latest.flightPracticeHistory).toHaveLength(2); expect(latest.lastDebrief.sprint.score).toBe(1);
    expect(latest.totalFlightTime).toBe(600); expect(xp).toHaveLength(0);
  });
  it('shows gaps and missing tail stops honestly in the recovered review', async () => {
    const saved = checkpoint(), laterPlace = api.SPRINT_ROUTES.find(item => item.id === 'americas').places[3];
    saved.sprint.results.push({ place: laterPlace, answer: 'Wrong city', expected: laterPlace });
    await mount({ view: 'flying', flightSprint: saved });
    const stops = [...host.querySelectorAll('[data-flight-sprint-summary="latest"] [data-sprint-journal-stop]')];
    expect(stops).toHaveLength(7); expect(stops[0].dataset.sprintJournalState).toBe('correct');
    expect(stops[1].dataset.sprintJournalState).toBe('unrecorded');
    expect(stops[2].dataset.sprintJournalState).toBe('incorrect');
    expect(stops.at(-1).dataset.sprintJournalState).toBe('unrecorded');
    expect(host.querySelector('[data-flight-stat="Max Altitude"]').textContent).toContain('Not recorded');
    expect(host.textContent).not.toContain('practice milestones observed');
  });
  it('clears a duplicate checkpoint already saved as the latest without changing history', async () => {
    const recovered = api.recoverFlightSprintCheckpoint(checkpoint());
    await mount({ view: 'flying', flightSprint: checkpoint(), lastDebrief: recovered, flightPracticeHistory: [prior()] });
    expect(latest.view).toBe('debrief'); expect(latest.flightSprint).toBeNull();
    expect(latest.lastDebrief).toEqual(recovered); expect(latest.flightPracticeHistory).toHaveLength(1);
  });
  it('does not resurrect a stale checkpoint that is already in the earlier journal', async () => {
    const recovered = api.recoverFlightSprintCheckpoint(checkpoint());
    await mount({ view: 'flying', flightSprint: checkpoint(), lastDebrief: prior(), flightPracticeHistory: [recovered] });
    expect(latest.view).toBe('menu'); expect(latest.flightSprint).toBeNull();
    expect(latest.lastDebrief.attemptId).toBe('prior-flight'); expect(latest.flightPracticeHistory).toHaveLength(1);
  });
  it('does not replace an existing review with malformed saved sprint evidence', async () => {
    await mount({ view: 'flying', flightSprint: checkpoint({ sprint: {} }), lastDebrief: prior() });
    expect(latest.view).toBe('menu'); expect(latest.flightSprint).toBeNull();
    expect(latest.lastDebrief.attemptId).toBe('prior-flight'); expect(latest.flightPracticeHistory).toBeUndefined();
    expect(xp).toHaveLength(0);
  });
  it('does not replay a perfect-sprint badge or XP when a completed checkpoint reopens', async () => {
    const route = api.SPRINT_ROUTES.find(item => item.id === 'americas');
    const saved = checkpoint({ sprint: { routeId: 'americas', status: 'finished', elapsedSeconds: 100,
      results: route.places.slice(1).map(place => ({ place, answer: place, expected: place })) } });
    await mount({ view: 'flying', flightSprint: saved, totalFlightTime: 0 });
    expect(latest.lastDebrief.sprint).toMatchObject({ score: 7, interrupted: true, status: 'ended' });
    expect(latest.earnedBadges).toBeUndefined(); expect(latest.totalFlightTime).toBe(0); expect(xp).toHaveLength(0);
  });
  it('uses the checkpoint identity at normal finish and clears it before another departure', async () => {
    await mount(); await launch(); await question();
    await act(async () => host.querySelector('[data-sprint-answer="1"]').click());
    const attempt = latest.flightSprint.attemptId;
    hooks().keysRef.current.escape = true; await frame();
    expect(latest.flightSprint).toBeNull(); expect(latest.lastDebrief.attemptId).toBe(attempt);
    expect(latest.lastDebrief.sprint.interrupted).not.toBe(true);
    await act(async () => hooks().startFlightChallenge('first_climb'));
    expect(latest.flightSprint).toBeNull(); expect(latest.view).toBe('flying');
  });
});
