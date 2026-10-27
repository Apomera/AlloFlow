import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let tool, FS, host, root, latest, refreshSaved, frameCallback, wallTime, errors;
const hooks = () => window.__testHooks.flightSim;
const sprint = () => hooks().getSprintRef().current;
async function mount(aircraft = 'cessna172', kind = 'sprint') {
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', aircraft, weather: 'storm', railCollapsed: true,
      takeoffTutorialDismissed: true, landingTutorialDismissed: true, menuSections: { sprints: true } } });
    latest = data.flightSim;
    refreshSaved = () => setData(old => ({ ...old, flightSim: { ...old.flightSim } }));
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
  const route = FS.SPRINT_ROUTES[0];
  const launch = kind === 'sprint' ? [...host.querySelectorAll('#skyschool-sec-sprints button')].find(item => item.textContent.includes(route.name))
    : host.querySelector('button[aria-label="Free Flight from Portland, ME"]');
  expect(launch).toBeTruthy(); await act(async () => launch.click());
  await frame();
}
async function frame(elapsed = 100) {
  wallTime += elapsed;
  expect(frameCallback).toBeTypeOf('function');
  await act(async () => frameCallback());
  expect(errors).not.toHaveBeenCalled();
}
async function rerender() { await act(async () => refreshSaved()); }
function key(type, value, target = host.querySelector('canvas[role="application"]')) {
  target.focus();
  target.dispatchEvent(new KeyboardEvent(type, { key: value, bubbles: true, cancelable: true }));
}
async function question(index = 1) {
  const sp = sprint(), target = sp.places[index];
  Object.assign(sp, { active: true, phase: 'question', placeIndex: index, approaching: target,
    timer: 120, maxTime: 120, answered: false, correct: null, score: 0, streak: 0,
    question: 'Which city is ahead?', options: ['Wrong A', target.name, 'Wrong C', 'Wrong D'], correctAnswer: target.name, results: [] });
  Object.assign(hooks().flightRef.current, { lat: target.lat + 10 / 60, lon: target.lon,
    altitude: 35000, vsi: 0, onGround: false });
  await rerender();
  return sp;
}
beforeEach(() => {
  vi.useFakeTimers(); resetStemLab(); window.__testHooks = {}; window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool(process.env.SKYSCHOOL_MISSION_PROGRESS_SOURCE || 'stem_lab/stem_tool_flightsim.js', 'flightSim'); FS = window.__RR_TEST_EXPORTS__.flightSim;
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  const context = new Proxy({ measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
  }, { get: (target, property) => property in target ? target[property] : () => {},
    set: (target, property, value) => { target[property] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  wallTime = 1000; vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  frameCallback = null;
  vi.stubGlobal('requestAnimationFrame', vi.fn(callback => { if (callback.name === 'loop') frameCallback = callback; return 1; }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  delete window.__testHooks; delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('SkySchool native sprint and honest travel evidence', () => {
  it.each(['cessna172', 'rescue_heli', 'drone', 'glider'])('starts a fresh fast fixed-wing activity after selecting %s', async aircraft => {
    await mount(aircraft);
    expect(latest.aircraft).toBe('sr71'); expect(latest.weather).toBe('clear');
    expect(hooks().controlsRef.current).toMatchObject({ throttle: 0.95, pitch: 0, flaps: 0, brake: 0, yawRate: 0 });
    expect(hooks().getFlightPlanRef().current.destination).toBeNull();
    expect(hooks().flightRef.current.forces).toEqual({});
    expect(host.querySelector('[data-flight-sprint]')).toBeTruthy();
    expect(host.querySelector('[data-sprint-timer]').textContent).toContain('Time remaining:');
  });
  it('accepts a touch/native answer once and exposes readable feedback', async () => {
    await mount(); const sp = await question();
    const answer = host.querySelector('[data-sprint-answer="1"]');
    expect(answer.style.minHeight).toBe('44px');
    await act(async () => answer.click());
    expect(sp.score).toBe(1); expect(sp.results).toHaveLength(1);
    expect(host.querySelector('[data-sprint-feedback]').textContent).toContain(sp.correctAnswer);
    expect([...host.querySelectorAll('[data-sprint-answer]')].every(item => !item.disabled && item.getAttribute('aria-disabled') === 'true')).toBe(true);
    await act(async () => answer.click()); expect(sp.results).toHaveLength(1);
  });
  // WCAG 2.2.1: answering no longer requires resuming the clock.
  it('accepts an answer while paused without moving the clock, then resumes through the native action', async () => {
    await mount(); const sp = await question();
    await act(async () => host.querySelector('[data-sprint-pause]').click());
    expect(hooks().pausedRef.current).toBe(true);
    const timer = sp.timer;
    await act(async () => host.querySelector('[data-sprint-answer="1"]').click());
    key('keydown', '3', host.querySelector('[data-sprint-pause]')); await frame();
    expect(sp.answered).toBe(true); expect(sp.score).toBe(1); expect(sp.results).toHaveLength(1);
    expect(sp.timer).toBe(timer); expect(hooks().pausedRef.current).toBe(true);
    await act(async () => host.querySelector('[data-sprint-pause]').click());
    expect(hooks().pausedRef.current).toBe(false);
  });
  it('rejects stale native choices after the question advances before repaint', async () => {
    await mount(); const sp = await question();
    const oldChoice = host.querySelector('[data-sprint-answer="1"]');
    sp.options = ['Next A', 'Next B', 'Next C', 'Next D']; sp.correctAnswer = 'Next B';
    await act(async () => oldChoice.click());
    expect(sp.answered).toBe(false); expect(sp.results).toHaveLength(0);
  });
  it('rejects a digit captured for the previous question and pre-question key taps', async () => {
    await mount(); const sp = await question();
    key('keydown', '2'); key('keyup', '2');
    sp.options = ['Next A', 'Next B', 'Next C', 'Next D']; sp.correctAnswer = 'Next B';
    await frame(); expect(sp.answered).toBe(false);
    sp.phase = 'flying'; key('keydown', '2'); key('keyup', '2');
    await frame(); expect(sp.phase).toBe('question'); expect(sp.answered).toBe(false);
  });
  it('supports digit answers from native controls and rejects an invalid stale option index', async () => {
    await mount(); const sp = await question();
    const staleFourth = host.querySelector('[data-sprint-answer="3"]'); sp.options.pop();
    await act(async () => staleFourth.click()); expect(sp.answered).toBe(false);
    key('keydown', '2', host.querySelector('[data-sprint-pause]'));
    expect(sp.score).toBe(1); expect(sp.results).toHaveLength(1);
  });
  it('separates accelerated position travel from physical speed, forces, and badges', async () => {
    await mount(); const sp = sprint(), before = { ...hooks().flightRef.current };
    for (let index = 0; index < 120; index++) await frame();
    expect(hooks().flightRef.current.speed).toBe(sp.speed);
    expect(hooks().flightRef.current.forces).toEqual({});
    expect(hooks().getLogRef().current.maxSpeed).toBeCloseTo(sp.speed * 0.5924838, 6);
    expect(hooks().getLogRef().current.bestStableSeconds).toBe(0);
    expect(hooks().flightRef.current.lat).not.toBe(before.lat);
    expect(hooks().getOceanDistance()).toBe(0);
    for (const badge of ['first_takeoff', 'speed100', 'speed_sound', 'cross_ocean', 'butter_landing']) expect(latest.earnedBadges?.[badge]).toBeUndefined();
    key('keydown', 'Escape'); await frame();
    expect(latest.lastDebrief.aircraftId).toBe('sr71');
    expect(latest.lastDebrief.samples.length).toBeGreaterThan(2);
    expect(latest.lastDebrief.samples.every(sample => sample.spd === Math.round(sp.speed * 0.5924838) && sample.aoa === null && sample.fpm === null)).toBe(true);
    expect(host.textContent).not.toContain('practice milestones observed');
    expect(host.querySelector('[data-flight-sprint-summary="latest"]')).toBeTruthy();
  });
  it('keeps Help above the sprint and restores its paused state and question focus', async () => {
    await mount(); await question();
    await act(async () => host.querySelector('[data-sprint-pause]').click());
    await act(async () => host.querySelector('[data-sprint-help]').click());
    expect(host.querySelector('[data-flightsim-help]')).toBeTruthy();
    expect(host.querySelector('[data-flight-sprint]')).toBeNull();
    await act(async () => host.querySelector('#skyschool-close-help').click());
    expect(hooks().pausedRef.current).toBe(true);
    expect(document.activeElement.id).toBe('skyschool-sprint-question');
  });
  it('starts each ordinary flight with an empty ocean-distance observation', async () => {
    await mount('sr71', 'free');
    Object.assign(hooks().flightRef.current, { lat: 0, lon: -140, altitude: 30000, speed: 1200, vsi: 0, onGround: false });
    hooks().controlsRef.current.throttle = 0.9;
    await frame(); expect(hooks().getOceanDistance()).toBeGreaterThan(0);
    key('keydown', 'Escape'); await frame();
    await act(async () => [...host.querySelectorAll('button')].find(button => button.textContent.includes('Back to Menu')).click());
    await act(async () => host.querySelector('button[aria-label="Free Flight from Portland, ME"]').click());
    expect(hooks().getOceanDistance()).toBe(0);
  });
  it('advances the new sprint after native replay and saves that attempt with Escape', async () => {
    await mount(); const completed = await question();
    await act(async () => host.querySelector('[data-sprint-answer="1"]').click());
    Object.assign(completed, { active: false, phase: 'result' }); await frame();
    await act(async () => host.querySelector('[data-sprint-replay]').click());
    const priorAttempt = latest.lastDebrief.attemptId, replayed = sprint();
    const initialTime = hooks().timeRef.current, initialTimer = replayed.timer;
    expect(latest.view).toBe('flying'); expect(replayed).not.toBe(completed);
    expect(hooks().flyingRef.current).toBe(true); expect(hooks().pausedRef.current).toBe(false);
    await frame();
    expect(hooks().timeRef.current).toBeGreaterThan(initialTime);
    expect(replayed.timer).toBeLessThan(initialTimer);
    const replayAttempt = latest.flightSprint.attemptId;
    expect(replayAttempt).not.toBe(priorAttempt); expect(replayAttempt).toMatch(/^sprint_/);
    key('keydown', 'Escape'); key('keyup', 'Escape'); await frame();
    expect(latest.view).toBe('debrief'); expect(hooks().flyingRef.current).toBe(false);
    expect(latest.lastDebrief).toMatchObject({ attemptId: replayAttempt, activityId: 'geography_sprint',
      sprint: { status: 'ended', score: 0 } });
    expect(latest.flightSprint).toBeNull();
    expect(latest.flightPracticeHistory.some(record => record.attemptId === priorAttempt && record.sprint.score === 1)).toBe(true);
  });
  it('saves readable results, preserves them through replay, and leaves fresh controls', async () => {
    await mount(); const sp = await question();
    await act(async () => host.querySelector('[data-sprint-answer="1"]').click());
    Object.assign(sp, { active: false, phase: 'result' }); await frame();
    expect(host.querySelector('[data-sprint-results]').textContent).toContain(sp.approaching.name);
    expect(document.activeElement.id).toBe('skyschool-sprint-question');
    await act(async () => host.querySelector('[data-sprint-replay]').click());
    expect(latest.lastDebrief.sprint.score).toBe(1);
    expect(sprint().results).toHaveLength(0); expect(hooks().pausedRef.current).toBe(false);
    Object.assign(sprint(), { active: false, phase: 'result' }); await frame();
    await act(async () => host.querySelector('[data-sprint-save-menu]').click());
    expect(latest.view).toBe('menu'); expect(latest.flightPracticeHistory.at(-1).sprint.score).toBe(1);
    await act(async () => [...host.querySelectorAll('button')].find(button => button.textContent === 'Review flight journal').click());
    expect(host.querySelector('[data-flight-sprint-summary="earlier"]').textContent).toContain('Washington D.C.');
    expect(host.querySelector('[data-flight-sprint-summary="earlier"]').textContent).toContain('Score: 1/7');
    expect(host.querySelector('[data-flight-sprint-summary="latest"]').textContent).toContain('Score: 0/7');
  });
});

describe('SkySchool bounded saved sprint outcomes', () => {
  it('keeps current and best streaks distinct without treating unreached stops as wrong answers', () => {
    const result = FS.normalizeFlightSprintRecord({ routeId: 'americas', status: 'ended', elapsedSeconds: 35,
      results: [{ place: 'Washington D.C.', answer: 'Washington D.C.', expected: 'Washington D.C.' },
        { place: 'Havana', answer: 'Wrong', expected: 'Havana' }] });
    expect(result).toMatchObject({ score: 1, streak: 0, bestStreak: 1 });
    const partial = FS.normalizeFlightSprintRecord({ routeId: 'americas', status: 'ended', elapsedSeconds: 10,
      results: [{ place: 'Washington D.C.', answer: 'Washington D.C.', expected: 'Washington D.C.' }] });
    expect(partial).toMatchObject({ score: 1, streak: 1, bestStreak: 1 });
    const gap = FS.normalizeFlightSprintRecord({ routeId: 'americas', status: 'ended', elapsedSeconds: 35,
      results: [{ place: 'Washington D.C.', answer: 'Washington D.C.', expected: 'Washington D.C.' },
        { place: 'Mexico City', answer: 'Mexico City', expected: 'Mexico City' }] });
    expect(gap).toMatchObject({ score: 2, streak: 1, bestStreak: 1 });
  });

  const saved = extra => ({ routeId: 'americas', status: 'finished', elapsedSeconds: 35,
    results: [{ place: 'Washington D.C.', answer: 'Washington D.C.', expected: 'Washington D.C.', correct: false }], ...extra });
  it('recomputes score and streak from known route responses and ignores claimed totals', () => {
    const result = FS.normalizeFlightSprintRecord(saved({ score: 90, total: 0, bestStreak: 80 }));
    expect(result).toMatchObject({ routeId: 'americas', score: 1, total: 7, bestStreak: 1 });
    expect(result.results[0].correct).toBe(true);
    expect(result.results).toHaveLength(1);
  });
  it.each([null, {}, { routeId: 'unknown' }, { routeId: 'americas', elapsedSeconds: Infinity }])('rejects incomplete or invalid outcomes %j', value => {
    expect(FS.normalizeFlightSprintRecord(value)).toBeNull();
  });
  it('drops foreign stops, duplicates, invalid expected answers, and excess data without inventing responses', () => {
    const result = FS.normalizeFlightSprintRecord(saved({ results: [
      { place: 'Washington D.C.', answer: 'United States', expected: 'United States' },
      { place: 'Washington D.C.', answer: 'Washington D.C.', expected: 'Washington D.C.' },
      { place: 'London', answer: 'London', expected: 'London' },
      { place: 'Havana', answer: 'made up', expected: 'made up' },
    ] }));
    expect(result.results).toHaveLength(1); expect(result.score).toBe(1); expect(result.total).toBe(7);
  });
  it('archives normalized outcomes only for the matching sprint activity and route', () => {
    const record = { activityId: 'geography_sprint', sprintRouteId: 'americas', aircraftId: 'sr71', sprint: saved() };
    expect(FS.normalizeFlightPracticeRecord(record).sprint.score).toBe(1);
    expect(FS.normalizeFlightPracticeRecord({ ...record, sprintRouteId: 'europe' }).sprint).toBeNull();
    expect(FS.normalizeFlightPracticeRecord({ ...record, activityId: 'free_flight' }).sprint).toBeNull();
    expect(FS.archiveFlightPractice([], record).at(-1).sprint.score).toBe(1);
  });
});
