import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let tool, FS, host, root, latest, refreshSaved, frameCallback, wallTime, canvasContext, errors;
const hooks = () => window.__testHooks.flightSim;
const sprint = () => hooks().getSprintRef().current;
const ordinaryQuizDrawn = () => !!host.querySelector('[data-flight-geography-quiz]');

async function mount(kind = 'sprint', aircraft = 'cessna172') {
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', aircraft, railCollapsed: true,
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
  await act(async () => { refreshSaved(); });
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
    expect(host.querySelector('[data-geoq-next]')).toBeTruthy();
    expect(host.querySelector('[data-geoq-feedback]').textContent).toContain('Correct answer:');
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

  it('retains a quick Q tap, focuses the readable question and pauses before physics advances', async () => {
    await mount('free');
    const before = hooks().timeRef.current;
    key('keydown', 'q'); key('keyup', 'q');
    await frame();
    expect(ordinaryQuizDrawn()).toBe(true);
    expect(hooks().pausedRef.current).toBe(true);
    expect(hooks().timeRef.current).toBe(before);
    expect(document.activeElement.id).toBe('skyschool-geoq-question');
    expect([...host.querySelectorAll('[data-geoq-answer]')]).toHaveLength(4);
    expect(host.querySelector('[data-flight-geography-quiz]').textContent).toContain('Close the quiz, then choose Resume');
  });

  it('uses one canonical country for Hawaii and removes regional variants from country answers', async () => {
    await mount('free');
    const hawaii = FS.GEO_PLACES.find(place => place.country === 'United States (Hawaii)');
    expect(hawaii).toBeTruthy();
    Object.assign(hooks().flightRef.current, { lat: hawaii.lat, lon: hawaii.lon });
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // Choose the country question.
    await press('q');
    const quiz = hooks().getGeoQuizRef().current;
    expect(quiz.correct).toBe('United States');
    expect(quiz.options.filter(option => option === 'United States')).toHaveLength(1);
    const excluded = ['United States (Hawaii)', 'United States (Alaska)', 'Africa', 'Arctic', 'International', 'Atlantic Ocean', 'Pacific Ocean'];
    expect(quiz.options.some(option => excluded.includes(option) || option.includes('/'))).toBe(false);
    expect(new Set(quiz.options).size).toBe(quiz.options.length);
  });

  it('supports touch-style answer buttons, guards rapid double answers and offers a real next question', async () => {
    await mount('free');
    await act(async () => host.querySelector('button[aria-label="Expand the flight deck controls"]').click());
    await act(async () => host.querySelector('[data-flight-open-quiz]').click());
    const options = [...host.querySelectorAll('[data-geoq-answer]')];
    const feedback = host.querySelector('[data-geoq-feedback]');
    const first = options[0].textContent.replace(/^1\. /, '');
    await act(async () => { options[0].click(); options[1].click(); });
    expect(options[0].getAttribute('aria-pressed')).toBe('true');
    expect(options.every(item => !item.disabled && item.getAttribute('aria-disabled') === 'true')).toBe(true);
    expect(host.querySelector('[data-geoq-feedback]').textContent).toContain('Your answer: ' + first);
    expect(host.querySelector('#skyschool-geoq-title').textContent).toMatch(/Score: [01]\/1/);
    await act(async () => host.querySelector('[data-geoq-next]').click());
    expect(host.querySelector('#skyschool-geoq-title').textContent).toMatch(/Score: [01]\/2/);
    expect(host.querySelector('[data-geoq-feedback]')).toBe(feedback);
    expect(feedback.textContent).toBe('');
    expect(host.querySelector('[data-geoq-feedback]').textContent).toBe('');
    expect(host.querySelector('[data-geoq-feedback]').getAttribute('role')).toBe('status');
    expect(document.activeElement.id).toBe('skyschool-geoq-question');
  });

  it('answers with digits while paused, keeps Space from resuming behind the quiz, and requires explicit resume after close', async () => {
    await mount('free'); await press('q');
    const feedback = host.querySelector('[data-geoq-feedback]');
    const heldTime = hooks().timeRef.current;
    await press(' ');
    expect(hooks().pausedRef.current).toBe(true);
    await press('1');
    expect(host.querySelector('[data-geoq-feedback]')).toBeTruthy();
    await frame(500);
    expect(hooks().timeRef.current).toBe(heldTime);
    await press('q');
    expect(host.querySelector('[data-geoq-feedback]')).toBe(feedback);
    expect(feedback.textContent).toBe('');
    expect(host.querySelector('[data-geoq-feedback]').textContent).toBe('');
    expect(host.querySelector('[data-geoq-feedback]').getAttribute('role')).toBe('status');
    expect(host.querySelector('#skyschool-geoq-title').textContent).toMatch(/\/2/);
    const close = [...host.querySelectorAll('[data-flight-geography-quiz] button')].find(button => button.textContent === 'Close quiz');
    await act(async () => close.click());
    expect(ordinaryQuizDrawn()).toBe(false);
    expect(document.activeElement).toBe(host.querySelector('canvas[role="application"]'));
    expect(latest.view).toBe('flying');
    expect(hooks().pausedRef.current).toBe(true);
    await press(' ');
    expect(hooks().pausedRef.current).toBe(false);
    expect(hooks().timeRef.current).toBeGreaterThan(heldTime);
  });

  it('closes through Escape from an answer widget without ending the flight', async () => {
    await mount('free'); await press('q');
    const answer = host.querySelector('[data-geoq-answer]');
    await act(async () => {
      answer.focus();
      answer.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(ordinaryQuizDrawn()).toBe(false);
    expect(latest.view).toBe('flying');
    expect(latest.lastDebrief).toBeUndefined();
    expect(hooks().pausedRef.current).toBe(true);
    await frame();
    expect(latest.view).toBe('flying');
  });

  it('does not pause or open an empty card when no question is nearby', async () => {
    await mount('free');
    Object.assign(hooks().flightRef.current, { lat: 0, lon: -140, altitude: 10000,
      fieldElev: 0, speed: 180, vsi: 0, onGround: false, stalling: false, lowAirspeed: false });
    Object.assign(hooks().controlsRef.current, { throttle: 0.6, pitch: 0, bank: 0 });
    await press('q');
    await act(async () => vi.advanceTimersByTime(100));
    expect(ordinaryQuizDrawn()).toBe(false);
    expect(hooks().pausedRef.current).toBe(false);
    expect(document.getElementById('skyschool-a11y-live').textContent).toContain('No geography question is available nearby');
  });

  it('retains the tenth correct-answer badge when ending without resume, without inventing ocean travel during quiz checks', async () => {
    await mount('free'); await press('q');
    const state = hooks().flightRef.current;
    const pose = { lat: state.lat, lon: state.lon, speed: state.speed, onGround: state.onGround };
    const beforeTime = hooks().timeRef.current;
    const beforeOcean = hooks().getOceanDistance();
    for (let index = 0; index < 10; index++) {
      const quiz = hooks().getGeoQuizRef().current;
      const correct = quiz.options.indexOf(quiz.correct);
      // A zero-time observation must not fabricate movement, even at high speed.
      Object.assign(state, { lat: 0, lon: -140, speed: 1e9, onGround: false });
      await act(async () => host.querySelector(`[data-geoq-answer="${correct}"]`).click());
      expect(hooks().getOceanDistance()).toBe(beforeOcean);
      Object.assign(state, pose);
      if (index < 9) await act(async () => host.querySelector('[data-geoq-next]').click());
    }
    expect(latest.earnedBadges.quiz_10).toBe(true);
    expect(hooks().timeRef.current).toBe(beforeTime);
    expect(hooks().pausedRef.current).toBe(true);
    const close = [...host.querySelectorAll('[data-flight-geography-quiz] button')].find(button => button.textContent === 'Close quiz');
    await act(async () => close.click());
    await act(async () => host.querySelector('button[aria-label="Expand the flight deck controls"]').click());
    await act(async () => [...host.querySelectorAll('button')].find(button => button.textContent === '✕ Exit').click());
    expect(latest.view).toBe('debrief');
    expect(latest.earnedBadges.quiz_10).toBe(true);
    expect(latest.lastDebrief.sessionTime).toBe(Math.round(beforeTime));
  });
});
