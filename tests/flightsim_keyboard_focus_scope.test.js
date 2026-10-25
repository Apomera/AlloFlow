import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let tool, FS, host, root, latest, refreshSaved, frameCallback, wallTime, errors;
const hooks = () => window.__testHooks.flightSim;
const cockpit = () => host.querySelector('canvas[role="application"]');
const questionHeading = kind => host.querySelector(kind === 'geography' ? '#skyschool-geoq-question' : '#skyschool-sprint-question');
const questionState = kind => kind === 'geography' ? hooks().getGeoQuizRef().current : hooks().getSprintRef().current;
const answered = kind => kind === 'geography' ? questionState(kind).showResult : questionState(kind).answered;

function tap(target, key, options = {}) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options });
  target.dispatchEvent(event);
  target.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true, ...options }));
  return event;
}
async function frame() {
  wallTime += 34;
  expect(frameCallback).toBeTypeOf('function');
  await act(async () => frameCallback());
  expect(errors).not.toHaveBeenCalled();
}
async function mountQuestion(kind) {
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', aircraft: 'cessna172', railCollapsed: false,
      takeoffTutorialDismissed: true, landingTutorialDismissed: true, menuSections: { sprints: true } } });
    latest = data.flightSim;
    refreshSaved = () => setData(old => ({ ...old, flightSim: { ...old.flightSim } }));
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
  const launch = kind === 'sprint'
    ? [...host.querySelectorAll('#skyschool-sec-sprints button')].find(button => button.textContent.includes(FS.SPRINT_ROUTES[0].name))
    : host.querySelector('button[aria-label="Free Flight from Portland, ME"]');
  await act(async () => launch.click());
  await frame();
  if (kind === 'geography') {
    await act(async () => host.querySelector('[data-flight-open-quiz]').click());
  } else {
    const sp = questionState(kind), target = sp.places[1];
    Object.assign(sp, { active: true, phase: 'question', placeIndex: 1, approaching: target,
      timer: 120, maxTime: 120, answered: false, correct: null, score: 0, streak: 0,
      question: 'Which city is ahead?', options: ['Wrong A', target.name, 'Wrong C', 'Wrong D'], correctAnswer: target.name, results: [] });
    Object.assign(hooks().flightRef.current, { lat: target.lat + 10 / 60, lon: target.lon, altitude: 35000, vsi: 0, onGround: false });
    await act(async () => refreshSaved());
    await frame();
  }
  expect(document.activeElement).toBe(questionHeading(kind));
}

beforeEach(() => {
  vi.useFakeTimers(); resetStemLab(); window.__testHooks = {}; window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool(process.env.SKYSCHOOL_KEYBOARD_SCOPE_SOURCE || 'stem_lab/stem_tool_flightsim.js', 'flightSim');
  FS = window.__RR_TEST_EXPORTS__.flightSim;
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

describe('SkySchool focused cockpit and question keyboard ownership', () => {
  it.each(['geography', 'sprint'])('does not change cockpit forces, camera, or flaps from the focused %s question', async kind => {
    await mountQuestion(kind);
    const before = { forces: latest.showForces, camera: latest.thirdPerson, flaps: hooks().controlsRef.current.flaps };
    for (const key of ['f', 'v', ']']) await act(async () => tap(questionHeading(kind), key));
    await frame();
    expect({ forces: latest.showForces, camera: latest.thirdPerson, flaps: hooks().controlsRef.current.flaps }).toEqual(before);
    expect(answered(kind)).toBeFalsy();
    expect(document.activeElement).toBe(questionHeading(kind));
  });

  it.each(['geography', 'sprint'])('answers the focused %s question with its digit and handles Escape locally', async kind => {
    await mountQuestion(kind);
    const state = questionState(kind);
    const correct = kind === 'geography' ? state.correct : state.correctAnswer;
    const digit = String(state.options.indexOf(correct) + 1);
    let event;
    await act(async () => { event = tap(questionHeading(kind), digit); });
    expect(event.defaultPrevented).toBe(true);
    expect(answered(kind)).toBe(true);
    expect(state.score).toBe(1);
    await act(async () => tap(questionHeading(kind), 'Escape'));
    if (kind === 'geography') {
      expect(host.querySelector('[data-flight-geography-quiz]')).toBeNull();
      expect(latest.view).toBe('flying');
      expect(hooks().pausedRef.current).toBe(true);
      expect(document.activeElement).toBe(cockpit());
    } else {
      expect(latest.view).toBe('debrief');
      expect(latest.lastDebrief.sprint.results).toHaveLength(1);
    }
  });

  it.each(['geography', 'sprint'])('ignores modified, composing, and repeated answer keys on the %s question', async kind => {
    await mountQuestion(kind);
    const heading = questionHeading(kind);
    for (const options of [{ ctrlKey: true }, { altKey: true }, { metaKey: true }, { isComposing: true }, { repeat: true }]) {
      await act(async () => tap(heading, '1', options));
      expect(answered(kind)).toBeFalsy();
    }
    expect(hooks().keysRef.current['1']).not.toBe(true);
    await act(async () => tap(heading, '1'));
    expect(answered(kind)).toBe(true);
  });

  it('does not answer geography questions from focused native controls or inputs', async () => {
    await mountQuestion('geography');
    const panel = host.querySelector('[data-flight-geography-quiz]');
    const field = document.createElement('input'); field.setAttribute('aria-label', 'Fixture note'); panel.appendChild(field);
    for (const target of [panel.querySelector('[data-geoq-answer]'), panel.querySelector('[data-geoq-help]'), field]) {
      target.focus();
      let event;
      await act(async () => { event = tap(target, '1'); });
      await frame();
      expect(event.defaultPrevented).toBe(false);
      expect(answered('geography')).toBeFalsy();
    }
    field.remove();
    const answer = panel.querySelector('[data-geoq-answer]'); answer.focus();
    await act(async () => tap(answer, 'Escape'));
    expect(host.querySelector('[data-flight-geography-quiz]')).toBeNull();
    expect(latest.view).toBe('flying');
  });

  it('does not dismiss geography questions on modified, composing, or repeated Escape', async () => {
    await mountQuestion('geography');
    for (const options of [{ ctrlKey: true }, { altKey: true }, { metaKey: true }, { isComposing: true }, { repeat: true }]) {
      await act(async () => tap(questionHeading('geography'), 'Escape', options));
      expect(host.querySelector('[data-flight-geography-quiz]')).toBeTruthy();
    }
  });

  it.each(['geography', 'sprint'])('does not queue question or cockpit actions behind Help during %s', async kind => {
    await mountQuestion(kind);
    const heading = questionHeading(kind);
    await act(async () => host.querySelector(kind === 'geography' ? '[data-geoq-help]' : '[data-sprint-help]').click());
    expect(host.querySelector('[data-flightsim-help]')).toBeTruthy();
    const before = { forces: latest.showForces, camera: latest.thirdPerson, flaps: hooks().controlsRef.current.flaps };
    for (const key of ['1', 'f', 'v', ']']) await act(async () => tap(heading, key));
    await frame();
    expect(answered(kind)).toBeFalsy();
    expect({ forces: latest.showForces, camera: latest.thirdPerson, flaps: hooks().controlsRef.current.flaps }).toEqual(before);
    expect(document.activeElement.id).toBe('skyschool-close-help');
    await act(async () => host.querySelector('#skyschool-close-help').click());
    expect(document.activeElement).toBe(questionHeading(kind));
    expect(answered(kind)).toBeFalsy();
  });

  it('requires actual canvas focus and clears held flight keys when focus moves to a reading region', async () => {
    await mountQuestion('geography');
    await act(async () => tap(questionHeading('geography'), 'Escape'));
    const canvas = cockpit();
    const down = new KeyboardEvent('keydown', { key: 'w', bubbles: true, cancelable: true });
    canvas.dispatchEvent(down);
    expect(hooks().keysRef.current.w).toBe(true);
    const region = document.createElement('div'); region.tabIndex = 0; region.setAttribute('role', 'region');
    region.setAttribute('aria-label', 'Fixture reading region'); canvas.parentElement.appendChild(region); region.focus();
    expect(hooks().keysRef.current).toEqual({});
    for (const target of [region, canvas]) {
      expect(tap(target, 'f').defaultPrevented).toBe(false);
      expect(hooks().keysRef.current.f).not.toBe(true);
    }
    region.remove(); canvas.focus();
    await act(async () => tap(canvas, 'f'));
    await frame();
    expect(latest.showForces).toBe(true);
  });
});
