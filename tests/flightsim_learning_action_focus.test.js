import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let tool, api, host, root, latest, latestRoot, patchSaved, pending, delayed, frameCallback, wallTime, errors, toasts, replayChecks;
const copy = value => JSON.parse(JSON.stringify(value));
const hooks = () => window.__testHooks.flightSim;
const choices = kind => [...host.querySelectorAll(kind === 'geography' ? '[data-geoq-answer]' : kind === 'sprint' ? '[data-sprint-answer]' : 'button[aria-label^="Answer "]')];
const feedback = kind => host.querySelector(kind === 'geography' ? '[data-geoq-feedback]' : kind === 'sprint' ? '[data-sprint-feedback]' : '[data-quiz-feedback]');
const questionState = kind => kind === 'geography' ? hooks().getGeoQuizRef().current : hooks().getSprintRef().current;
const button = text => [...host.querySelectorAll('button')].find(node => node.textContent.trim() === text);
function handler(node, event = 'onClick') {
  expect(node).toBeTruthy();
  return node[Object.keys(node).find(key => key.startsWith('__reactProps$'))][event];
}
async function click(node) { expect(node).toBeTruthy(); await act(async () => { node.focus(); node.click(); }); }
async function patch(values) { await act(async () => patchSaved(values)); }
async function flush() {
  for (let count = 0; pending.length; count++) {
    expect(count).toBeLessThan(20);
    const apply = pending.shift(); await act(async () => apply());
  }
}
function expectAvailable(node, value) {
  expect(node.disabled).toBe(false);
  expect(node.getAttribute('aria-disabled')).toBe(String(!value));
  expect(node.tabIndex).toBe(0);
}
async function mount(seed = {}, options = {}) {
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  pending = []; delayed = !!options.delayed;
  function App() {
    const [data, setData] = React.useState({ otherTool: { note: 'Keep my work' }, flightSim: {
      view: 'quiz', aircraft: 'cessna172', railCollapsed: false, quizIdx: 0, quizFirstAttempts: {},
      quizAttemptSequence: 5, takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      menuSections: { sprints: true }, ...seed,
    } });
    latestRoot = data; latest = data.flightSim;
    patchSaved = values => setData(old => ({ ...old, flightSim: { ...old.flightSim, ...values } }));
    const submit = update => {
      const apply = () => setData(previous => {
        if (typeof update !== 'function') return update;
        const before = JSON.stringify(previous), first = update(previous), second = update(previous);
        replayChecks.push({ immutable: before === JSON.stringify(previous), stable: JSON.stringify(first) === JSON.stringify(second) });
        return second;
      });
      if (delayed) pending.push(apply); else apply();
    };
    return tool.render(makeCtx({ toolData: data, setToolData: submit, addToast: toasts,
      update: (id, key, value) => submit(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, values) => submit(old => ({ ...old, [id]: { ...old[id], ...values } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}
async function frame() {
  wallTime += 34; expect(frameCallback).toBeTypeOf('function');
  await act(async () => frameCallback());
}
async function sprintQuestion(index = 1) {
  const sp = questionState('sprint'), target = sp.places[index];
  Object.assign(sp, { active: true, phase: 'question', placeIndex: index, approaching: target,
    timer: 120, maxTime: 120, answered: false, correct: null,
    question: 'Which city is ahead?', options: ['Wrong A', target.name, 'Wrong C', 'Wrong D'], correctAnswer: target.name });
  Object.assign(hooks().flightRef.current, { lat: target.lat + 10 / 60, lon: target.lon, altitude: 35000, vsi: 0, onGround: false });
  await patch({}); await frame();
}
async function mountQuestion(kind) {
  await mount({ view: 'menu' });
  const launch = kind === 'geography' ? host.querySelector('button[aria-label="Free Flight from Portland, ME"]')
    : [...host.querySelectorAll('#skyschool-sec-sprints button')].find(node => node.textContent.includes(api.SPRINT_ROUTES[0].name));
  await click(launch); await frame();
  if (kind === 'geography') await click(host.querySelector('[data-flight-open-quiz]'));
  else await sprintQuestion();
}

beforeEach(() => {
  vi.useFakeTimers(); resetStemLab(); window.__testHooks = {}; window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool(process.env.SKYSCHOOL_LEARNING_ACTION_FOCUS_SOURCE || 'stem_lab/stem_tool_flightsim.js', 'flightSim');
  api = window.__RR_TEST_EXPORTS__.flightSim;
  errors = vi.spyOn(console, 'error').mockImplementation(() => {}); toasts = vi.fn(); replayChecks = [];
  const context = new Proxy({ measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
  }, { get: (target, property) => property in target ? target[property] : () => {},
    set: (target, property, value) => { target[property] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  wallTime = 1000; vi.spyOn(performance, 'now').mockImplementation(() => wallTime); frameCallback = null;
  vi.stubGlobal('requestAnimationFrame', vi.fn(callback => { if (callback.name === 'loop') frameCallback = callback; return 1; }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  expect(errors).not.toHaveBeenCalled();
  expect(replayChecks.every(check => check.immutable && check.stable)).toBe(true);
  delete window.__testHooks; delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('Sky School completed learning actions retain focus and reject repeat submissions', () => {
  it('keeps lesson completion focusable and refuses native and retained repeated actions', async () => {
    await mount({ view: 'lesson', selectedLesson: 'lift', completedLessons: { weather: true }, lessonsCompleted: 1 });
    const complete = button('📚 Mark lesson complete'), retained = handler(complete);
    expectAvailable(complete, true); await click(complete);
    expect(button('✓ Lesson completed')).toBe(complete); expectAvailable(complete, false);
    expect(document.activeElement).toBe(complete); expect(complete.getAttribute('aria-pressed')).toBe('true');
    const saved = copy(latestRoot);
    await act(async () => { complete.click(); complete.click(); retained(); });
    expect(copy(latestRoot)).toEqual(saved); expect(latest.lessonsCompleted).toBe(2);
    expect(latest.completedLessons).toEqual({ lift: true, weather: true });
  });

  it('shows accepted lesson completion only after a delayed save and keeps the same focused node', async () => {
    await mount({ view: 'lesson', selectedLesson: 'lift', completedLessons: {} }, { delayed: true });
    const complete = button('📚 Mark lesson complete'); await click(complete);
    expectAvailable(complete, true); expect(button('✓ Lesson completed')).toBeUndefined();
    expect(latest.completedLessons).toEqual({}); expect(document.activeElement).toBe(complete);
    await flush(); expectAvailable(complete, false); expect(document.activeElement).toBe(complete);
    expect(latest.completedLessons).toEqual({ lift: true });
    expect(latestRoot.otherTool).toEqual({ note: 'Keep my work' });
  });

  it('does not reactivate a visibly completed lesson during a same-turn host progress replacement', async () => {
    await mount({ view: 'lesson', selectedLesson: 'lift', completedLessons: { lift: true } });
    const complete = button('✓ Lesson completed'); expectAvailable(complete, false);
    await act(async () => { patchSaved({ completedLessons: {}, lessonsCompleted: 0 }); complete.click(); });
    expect(latest.completedLessons).toEqual({}); expect(latest.lessonsCompleted).toBe(0);
  });

  it.each([true, false])('retains knowledge answer focus and records its first response once; correct=%s', async correct => {
    await mount(); const q = api.getQuizDeck()[0], index = q.options.findIndex(option => (option === q.correct) === correct);
    const choice = choices()[index], original = choices().map(node => handler(node)), region = feedback();
    expectAvailable(choice, true); await click(choice);
    expect(document.activeElement).toBe(choice); choices().forEach(node => expectAvailable(node, false));
    expect(choice.getAttribute('aria-pressed')).toBe('true'); expect(feedback()).toBe(region);
    expect(region.textContent).toContain(correct ? 'Correct!' : 'Not quite.');
    const saved = copy(latestRoot), notices = toasts.mock.calls.length;
    await act(async () => { choices().forEach(node => node.click()); original.forEach(run => run()); });
    expect(copy(latestRoot)).toEqual(saved); expect(toasts).toHaveBeenCalledTimes(notices);
    expect([latest.quizScore, latest.quizTotal]).toEqual([correct ? 1 : 0, 1]);
  });

  it.each([true, false])('retains practice answer focus without changing first-attempt evidence; correct=%s', async correct => {
    await mount(); const q = api.getQuizDeck()[0]; await click(choices()[q.options.indexOf(q.correct)]);
    const evidence = copy(latest.quizFirstAttempts); await click(button('Practice this question'));
    await act(async () => vi.advanceTimersByTime(0));
    const index = q.options.findIndex(option => (option === q.correct) === correct), choice = choices()[index];
    await click(choice); expect(document.activeElement).toBe(choice); choices().forEach(node => expectAvailable(node, false));
    expect(latest.quizFirstAttempts).toEqual(evidence); expect([latest.quizScore, latest.quizTotal]).toEqual([1, 1]);
    const saved = copy(latestRoot); await act(async () => choices().forEach(node => node.click()));
    expect(copy(latestRoot)).toEqual(saved); expect(latest.quizPracticePicked).toBe(index);
  });

  it('keeps delayed knowledge answers visually unsubmitted until receipt and ignores repeated queued choices', async () => {
    await mount({}, { delayed: true }); const q = api.getQuizDeck()[0], index = q.options.indexOf(q.correct);
    const choice = choices()[index], other = choices()[(index + 1) % q.options.length];
    await click(choice); await act(async () => { choice.click(); other.click(); });
    expect(latest.quizFirstAttempts).toEqual({}); expect(feedback().textContent).toBe('');
    choices().forEach(node => expectAvailable(node, true)); expect(document.activeElement).toBe(choice);
    await flush(); expectAvailable(choice, false); expect(document.activeElement).toBe(choice);
    expect([latest.quizScore, latest.quizTotal]).toEqual([1, 1]);
    expect(Object.values(latest.quizFirstAttempts)).toHaveLength(1);
    expect(latestRoot.otherTool).toEqual({ note: 'Keep my work' });
  });

  it('keeps both first-response and practice controls inert for repeated activations in one turn', async () => {
    await mount(); const q = api.getQuizDeck()[0], correct = q.options.indexOf(q.correct), wrong = (correct + 1) % q.options.length;
    await act(async () => { choices()[wrong].click(); choices()[correct].click(); });
    expect([latest.quizScore, latest.quizTotal]).toEqual([0, 1]);
    const first = copy(latest.quizFirstAttempts); await click(button('Practice this question'));
    await act(async () => { choices()[correct].click(); choices()[wrong].click(); });
    expect(latest.quizPracticePicked).toBe(correct); expect(latest.quizFirstAttempts).toEqual(first);
  });

  it('retires a retained knowledge answer after next-question navigation and a return', async () => {
    await mount(); const old = handler(choices()[0]);
    await click(button('Next ▶')); const next = copy(latestRoot); await act(async () => old());
    expect(copy(latestRoot)).toEqual(next); await click(button('◀ Previous'));
    const back = copy(latestRoot); await act(async () => old()); expect(copy(latestRoot)).toEqual(back);
    choices().forEach(node => expectAvailable(node, true));
  });

  it.each(['geography', 'sprint'].flatMap(kind => [true, false].map(correct => [kind, correct])))
    ('keeps %s answers focusable and rejects repeat scoring; correct=%s', async (kind, correct) => {
      await mountQuestion(kind); const state = questionState(kind), expected = kind === 'geography' ? state.correct : state.correctAnswer;
      const index = state.options.findIndex(option => (option === expected) === correct), choice = choices(kind)[index];
      const old = choices(kind).map(node => handler(node)), region = feedback(kind);
      await click(choice); expect(document.activeElement).toBe(choice); choices(kind).forEach(node => expectAvailable(node, false));
      expect(choice.getAttribute('aria-pressed')).toBe('true'); expect(feedback(kind)).toBe(region);
      expect(region.textContent).toBe('Your answer: ' + state.options[index] + '. Correct answer: ' + expected + '.');
      const saved = copy(state); await act(async () => { choices(kind).forEach(node => node.click()); old.forEach(run => run()); });
      expect(state).toEqual(saved); expect(state.score).toBe(correct ? 1 : 0);
    });

  it.each(['geography', 'sprint'])('does not apply a retained %s answer to a later question', async kind => {
    await mountQuestion(kind); const old = handler(choices(kind)[0]);
    if (kind === 'geography') { await click(choices(kind)[1]); await click(host.querySelector('[data-geoq-next]')); }
    else await sprintQuestion(2);
    const state = questionState(kind), saved = copy(state); await act(async () => old());
    expect(state).toEqual(saved); expect(feedback(kind).textContent).toBe('');
    choices(kind).forEach(node => expectAvailable(node, true));
  });

  it('retires geography answer and digit handlers when the quiz is closed and reopened', async () => {
    await mountQuestion('geography'); const answer = handler(choices('geography')[0]);
    const oldPanel = host.querySelector('[data-flight-geography-quiz]'), digit = handler(oldPanel, 'onKeyDown');
    await click(button('Close quiz')); await click(host.querySelector('[data-flight-open-quiz]'));
    const state = questionState('geography'), saved = copy(state);
    await act(async () => {
      answer(); digit({ key: '1', target: host.querySelector('#skyschool-geoq-question'), preventDefault() {}, stopPropagation() {} });
    });
    expect(state).toEqual(saved); expect(feedback('geography').textContent).toBe('');
  });

  it.each(['geography', 'sprint'])('does not answer %s through a retained button while Help is open', async kind => {
    await mountQuestion(kind); const old = handler(choices(kind)[0]);
    await click(host.querySelector(kind === 'geography' ? '[data-geoq-help]' : '[data-sprint-help]'));
    const state = questionState(kind), saved = copy(state); await act(async () => old());
    expect(state).toEqual(saved); expect(latest.showHelp).toBe(true);
  });
});
