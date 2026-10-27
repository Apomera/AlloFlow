import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let tool, api, host, root, latest, refreshSaved, frameCallback, wallTime, errors;
const hooks = () => window.__testHooks.flightSim;
const quizChoices = () => [...host.querySelectorAll('section[aria-labelledby="skyschool-quiz-question"] button[aria-label^="Answer "]')];
const feedback = kind => host.querySelector(kind === 'quiz' ? '[data-quiz-feedback]' : kind === 'geography' ? '[data-geoq-feedback]' : '[data-sprint-feedback]');
const questionState = kind => kind === 'geography' ? hooks().getGeoQuizRef().current : hooks().getSprintRef().current;
const questionHeading = kind => host.querySelector(kind === 'geography' ? '#skyschool-geoq-question' : '#skyschool-sprint-question');
function button(text) {
  const found = [...host.querySelectorAll('button')].find(node => node.textContent === text);
  expect(found, 'Button: ' + text).toBeTruthy();
  return found;
}
async function click(node) {
  expect(node).toBeTruthy();
  await act(async () => { node.focus(); node.click(); });
}
function expectStatus(node) {
  expect(node).toBeTruthy();
  expect(node.getAttribute('role')).toBe('status');
  expect(node.getAttribute('aria-live')).toBe('polite');
  expect(node.getAttribute('aria-atomic')).toBe('true');
  expect(node.closest('[hidden],[aria-hidden="true"]')).toBeNull();
  expect(node.querySelector('button,a[href],input,select,textarea,[tabindex]')).toBeNull();
}
async function frame() {
  wallTime += 34;
  expect(frameCallback).toBeTypeOf('function');
  await act(async () => frameCallback());
  expect(errors).not.toHaveBeenCalled();
}
async function mount(view = 'quiz') {
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view, aircraft: 'cessna172', railCollapsed: false,
      takeoffTutorialDismissed: true, landingTutorialDismissed: true, menuSections: { sprints: true } } });
    latest = data.flightSim;
    refreshSaved = () => setData(old => ({ ...old, flightSim: { ...old.flightSim } }));
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}
async function sprintQuestion(index = 1) {
  const sp = questionState('sprint'), target = sp.places[index];
  Object.assign(sp, { active: true, phase: 'question', placeIndex: index, approaching: target,
    timer: 120, maxTime: 120, answered: false, correct: null,
    question: 'Which city is ahead?', options: ['Wrong A', target.name, 'Wrong C', 'Wrong D'], correctAnswer: target.name });
  Object.assign(hooks().flightRef.current, { lat: target.lat + 10 / 60, lon: target.lon, altitude: 35000, vsi: 0, onGround: false });
  await act(async () => refreshSaved());
  await frame();
}
async function mountQuestion(kind) {
  await mount('menu');
  const launch = kind === 'geography' ? host.querySelector('button[aria-label="Free Flight from Portland, ME"]')
    : [...host.querySelectorAll('#skyschool-sec-sprints button')].find(node => node.textContent.includes(api.SPRINT_ROUTES[0].name));
  await click(launch); await frame();
  if (kind === 'geography') await click(host.querySelector('[data-flight-open-quiz]'));
  else await sprintQuestion();
  expect(document.activeElement).toBe(questionHeading(kind));
}

beforeEach(() => {
  vi.useFakeTimers(); resetStemLab(); window.__testHooks = {}; window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool(process.env.SKYSCHOOL_FEEDBACK_SOURCE || 'stem_lab/stem_tool_flightsim.js', 'flightSim');
  api = window.__RR_TEST_EXPORTS__.flightSim;
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

describe('SkySchool persistent answer feedback announcements', () => {
  it.each([true, false])('updates the existing quiz status with a correct answer: %s, without announcing the Study control', async correct => {
    await mount();
    const region = feedback('quiz'), question = api.getQuizDeck()[0];
    expectStatus(region); expect(region.textContent).toBe('');
    const index = question.options.findIndex(option => (option === question.correct) === correct);
    const choice = quizChoices()[index];
    await click(choice);
    expect(feedback('quiz')).toBe(region); expectStatus(region);
    expect(region.textContent).toContain(correct ? 'Correct!' : 'Not quite.');
    if (!correct) expect(region.textContent).toContain(question.correct);
    expect(region.textContent).toContain(question.explanation);
    // Answer feedback leaves the learner on the same focusable control.
    expect(document.activeElement).toBe(choice);
    expect(host.querySelector('[data-quiz-study-link]')).toBeTruthy();
    expect(region.contains(host.querySelector('[data-quiz-study-link]'))).toBe(false);
    expect([latest.quizScore, latest.quizTotal]).toEqual([correct ? 1 : 0, 1]);
  });

  it('clears the same quiz status for a practice retry and the next question without leaking the saved answer', async () => {
    await mount();
    const region = feedback('quiz'), question = api.getQuizDeck()[0];
    expectStatus(region);
    await click(quizChoices()[question.options.indexOf(question.correct)]);
    const firstResponses = JSON.parse(JSON.stringify(latest.quizFirstAttempts));
    await click(button('Practice this question'));
    expect(feedback('quiz')).toBe(region); expect(region.textContent).toBe('');
    expect(host.querySelector('[data-quiz-study-link]')).toBeNull();
    // The disappearing retry control schedules its focus repair after the
    // saved response commits, using a zero-delay timer.
    await act(async () => vi.advanceTimersByTime(0));
    expect(document.activeElement.id).toBe('skyschool-quiz-question');
    const wrong = quizChoices()[question.options.findIndex(option => option !== question.correct)];
    await click(wrong);
    expect(feedback('quiz')).toBe(region); expect(region.textContent).toContain('Not quite.');
    expect(latest.quizFirstAttempts).toEqual(firstResponses);
    expect([latest.quizScore, latest.quizTotal]).toEqual([1, 1]);
    await click(button('Next ▶'));
    expect(feedback('quiz')).toBe(region); expect(region.textContent).toBe('');
    expect(document.activeElement.id).toBe('skyschool-quiz-question');
    expect(quizChoices().every(node => !node.disabled)).toBe(true);
  });

  it.each(['geography', 'sprint'])('updates the mounted %s status for a correct keyboard answer and clears it at the next question', async kind => {
    await mountQuestion(kind);
    const region = feedback(kind), state = questionState(kind), heading = questionHeading(kind);
    const correct = kind === 'geography' ? state.correct : state.correctAnswer;
    expectStatus(region); expect(region.textContent).toBe('');
    const key = String(state.options.indexOf(correct) + 1);
    await act(async () => heading.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })));
    expect(feedback(kind)).toBe(region); expectStatus(region);
    expect(region.textContent).toBe('Your answer: ' + correct + '. Correct answer: ' + correct + '.');
    expect(document.activeElement).toBe(heading); expect(state.score).toBe(1);
    if (kind === 'geography') await click(host.querySelector('[data-geoq-next]'));
    else await sprintQuestion(2);
    expect(feedback(kind)).toBe(region); expect(region.textContent).toBe('');
    expect(document.activeElement).toBe(questionHeading(kind));
  });

  it.each(['geography', 'sprint'])('includes the chosen and correct answers in the existing %s status after an incorrect choice', async kind => {
    await mountQuestion(kind);
    const region = feedback(kind), state = questionState(kind);
    const correct = kind === 'geography' ? state.correct : state.correctAnswer;
    const wrongIndex = state.options.findIndex(option => option !== correct), wrong = state.options[wrongIndex];
    expectStatus(region); expect(region.textContent).toBe('');
    const choice = host.querySelector((kind === 'geography' ? '[data-geoq-answer="' : '[data-sprint-answer="') + wrongIndex + '"]');
    await click(choice);
    expect(feedback(kind)).toBe(region); expectStatus(region);
    expect(region.textContent).toBe('Your answer: ' + wrong + '. Correct answer: ' + correct + '.');
    expect(document.activeElement).toBe(choice); expect(state.score).toBe(0);
  });

  it('announces checklist completion in the existing status and clears it when a new review begins', async () => {
    await mount('preflight');
    const region = host.querySelector('[data-preflight-completion]');
    expectStatus(region); expect(region.textContent).toBe('');
    const progress = host.querySelector('progress[aria-label="Review progress"]');
    const total = progress.max;
    expect(total).toBeGreaterThan(0);
    for (let index = 0; index < total; index++) {
      await click(host.querySelector('input[type="checkbox"]:not(:checked)'));
      expect(host.querySelector('[data-preflight-completion]')).toBe(region);
      if (index < total - 1) expect(region.textContent).toBe('');
    }
    expect(progress.value).toBe(total);
    expect(region.textContent).toBe('Checklist review complete');
    expectStatus(region);
    expect(document.activeElement.id).toBe('skyschool-pf-toggle-' + (api.PREFLIGHT_CHECKLIST.length - 1));
    const reset = button('Start a new checklist review');
    await click(reset);
    expect(host.querySelector('[data-preflight-completion]')).toBe(region);
    expect(region.textContent).toBe(''); expect(progress.value).toBe(0);
    expect(document.activeElement).toBe(reset);
  });
});
