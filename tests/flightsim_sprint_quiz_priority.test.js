import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let tool, FS, host, root, latest, frameCallback, wallTime, canvasContext, errors;
const hooks = () => window.__testHooks.flightSim;
const sprint = () => hooks().getSprintRef().current;
const ordinaryQuizDrawn = () => canvasContext.fillText.mock.calls.some(([text]) => String(text).includes('GEOGRAPHY QUIZ'));

async function mount(kind = 'sprint', aircraft = 'cessna172') {
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', aircraft, railCollapsed: true,
      takeoffTutorialDismissed: true, landingTutorialDismissed: true, menuSections: { sprints: true } } });
    latest = data.flightSim;
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
  const route = FS.SPRINT_ROUTES[0];
  const launch = kind === 'sprint'
    ? [...host.querySelectorAll('#skyschool-sec-sprints button')].find(item => item.textContent.includes(route.name))
    : host.querySelector('button[aria-label="Free Flight from Portland, ME"]');
  expect(launch).toBeTruthy();
  await act(async () => launch.click());
  host.querySelector('canvas[role="application"]').focus();
  await frame();
}
async function frame(elapsed = 34) {
  wallTime += elapsed;
  canvasContext.fillText.mockClear();
  expect(frameCallback, 'The production simulation RAF must be scheduled').toBeTypeOf('function');
  await act(async () => frameCallback());
  expect(errors).not.toHaveBeenCalled();
}
function key(type, value) {
  const cockpit = host.querySelector('canvas[role="application"]');
  // Escape can finish the flight and unmount its cockpit before keyup.
  const target = cockpit || (type === 'keyup' ? window : null);
  expect(target).toBeTruthy();
  if (cockpit) cockpit.focus();
  const event = new KeyboardEvent(type, { key: value, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}
async function press(value) {
  key('keydown', value);
  await frame();
  key('keyup', value);
}
function question() {
  const sp = sprint(), target = sp.places[1];
  Object.assign(sp, { active: true, phase: 'question', placeIndex: 1, approaching: target,
    timer: 120, maxTime: 120, answered: false, correct: null, score: 0, streak: 0,
    options: ['Answer A', 'Answer B', 'Answer C', 'Answer D'], correctAnswer: 'Answer B', results: [] });
  // Keep the real updateSprint tick inside the 5–50 nm question window.
  Object.assign(hooks().flightRef.current, { lat: target.lat + 10 / 60, lon: target.lon,
    altitude: 35000, vsi: 0, onGround: false });
  hooks().pausedRef.current = false;
  return sp;
}
async function seedOrdinaryQuiz() {
  // Reproduce a pre-existing ordinary quiz using its public shortcut before
  // restoring the sprint mode. No extra production test hook is required.
  Object.assign(sprint(), { active: false, phase: 'flying' });
  hooks().pausedRef.current = false;
  await press('q');
  expect(ordinaryQuizDrawn()).toBe(true);
}

beforeEach(() => {
  vi.useFakeTimers(); resetStemLab(); window.__testHooks = {}; window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); FS = window.__RR_TEST_EXPORTS__.flightSim;
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  canvasContext = new Proxy({
    fillText: vi.fn(), measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
  }, { get: (target, property) => property in target ? target[property] : () => {},
    set: (target, property, value) => { target[property] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvasContext);
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

describe('SkySchool sprint owns quiz input and presentation', () => {
  it.each(['flying', 'question', 'result'])('does not open a second geography quiz during sprint %s', async phase => {
    await mount();
    if (phase === 'question') question();
    else Object.assign(sprint(), { active: phase !== 'result', phase });
    await press('q');
    expect(ordinaryQuizDrawn()).toBe(false);
    expect(latest.view).toBe('flying');
    // Reveal an accidentally created but hidden quiz after leaving sprint
    // mode. Both its creation and its painting must have been prevented.
    Object.assign(sprint(), { active: false, phase: 'flying' });
    hooks().pausedRef.current = false;
    await frame();
    expect(ordinaryQuizDrawn()).toBe(false);
  });

  it.each([1, 2, 3, 4])('routes answer %i to the sprint even with an unanswered ordinary quiz', async digit => {
    await mount(); await seedOrdinaryQuiz();
    const sp = question();
    await press(String(digit));
    expect(ordinaryQuizDrawn()).toBe(false);
    expect(sp.answered).toBe(true);
    expect(sp.correct).toBe(digit === 2);
    expect(sp.results).toEqual([{ place: sp.approaching.name, correct: digit === 2,
      answer: sp.options[digit - 1], expected: 'Answer B' }]);
    expect(sp.score).toBe(digit === 2 ? 1 : 0);
    await press(String(digit));
    expect(sp.results).toHaveLength(1);
  });

  it('saves and leaves the sprint result on the first Escape despite a stale ordinary quiz', async () => {
    await mount(); await seedOrdinaryQuiz();
    Object.assign(sprint(), { active: false, phase: 'result' });
    await frame();
    expect(hooks().pausedRef.current).toBe(true);
    expect(ordinaryQuizDrawn()).toBe(false);
    await press('Escape');
    expect(latest.view).toBe('menu');
    expect(latest.lastDebrief).toMatchObject({ activityId: 'geography_sprint', sprintRouteId: FS.SPRINT_ROUTES[0].id });
    expect(hooks().flyingRef.current).toBe(false);
  });

  it('ends an active sprint on Escape despite a stale ordinary quiz', async () => {
    await mount(); await seedOrdinaryQuiz(); question();
    await press('Escape');
    expect(latest.view).toBe('debrief');
    expect(latest.lastDebrief.activityId).toBe('geography_sprint');
    expect(hooks().flyingRef.current).toBe(false);
  });

  it('keeps the ordinary Q quiz and its Escape dismissal available in free flight', async () => {
    await mount('free'); await press('q');
    expect(ordinaryQuizDrawn()).toBe(true);
    await press('2');
    expect(ordinaryQuizDrawn()).toBe(true);
    expect(canvasContext.fillText.mock.calls.some(([text]) => String(text).includes('Press Q for next question'))).toBe(true);
    await press('Escape');
    expect(latest.view).toBe('flying');
    expect(hooks().flyingRef.current).toBe(true);
    expect(ordinaryQuizDrawn()).toBe(false);
    expect(latest.lastDebrief).toBeUndefined();
  });

  it.each(['rescue_heli', 'drone'])('keeps held Q as the %s yaw control without opening a quiz', async aircraft => {
    await mount('free', aircraft);
    Object.assign(hooks().flightRef.current, { speed: 0, rotorForwardFps: 0, altitude: 150,
      fieldElev: 0, vsi: 0, heading: 90, onGround: false });
    Object.assign(hooks().controlsRef.current, { throttle: 0.5, pitch: 0, bank: 0, yawRate: 0 });
    await press('q');
    expect(hooks().controlsRef.current.yawRate).toBeLessThan(0);
    expect(hooks().flightRef.current.heading).toBeLessThan(90);
    expect(ordinaryQuizDrawn()).toBe(false);
    expect(hooks().keysRef.current.q).toBe(false);
  });
});
