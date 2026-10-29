// Regression coverage for actual keyboard failures found in the browser:
// bubbled Enter advanced the quiz, Next skipped the next question, and the
// mineral test buttons disappeared (or became disabled) while holding focus.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const act = React.act;
const mounts = [];
let oldScroll;

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_rocks.js', 'rocks');
  vi.useFakeTimers();
  global.IS_REACT_ACT_ENVIRONMENT = true;
  oldScroll = window.HTMLElement.prototype.scrollIntoView;
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  mounts.splice(0).forEach(({ root, host }) => {
    act(() => root.unmount());
    host.remove();
  });
  window.HTMLElement.prototype.scrollIntoView = oldScroll;
  vi.clearAllTimers();
  vi.useRealTimers();
  global.IS_REACT_ACT_ENVIRONMENT = false;
  vi.restoreAllMocks();
});

function mount(rocks, overrides = {}) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const store = { rocks: { ...rocks }, rockCycle: {} };
  const awardXP = vi.fn();
  let redraw;
  const setToolData = (update) => {
    Object.assign(store, typeof update === 'function' ? update(store) : update);
    redraw();
  };
  function Harness() {
    const [, setTick] = React.useState(0);
    redraw = () => setTick((tick) => tick + 1);
    return window.StemLab._registry.rocks.render(makeCtx({ ...overrides, toolData: store, setToolData, awardXP }));
  }
  act(() => root.render(React.createElement(Harness)));
  const mounted = { host, root, store, awardXP };
  mounts.push(mounted);
  return mounted;
}

function click(node) {
  expect(node, 'expected control to exist').toBeTruthy();
  act(() => node.click());
}

function key(node, value, modifiers = {}) {
  expect(node, 'expected keyboard target to exist').toBeTruthy();
  const event = new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true, ...modifiers });
  act(() => node.dispatchEvent(event));
  return event;
}

function answer(host, number = 1) {
  return [...host.querySelectorAll('button')].find((button) =>
    (button.getAttribute('aria-label') || '').startsWith('Answer ' + number + ':'));
}

function quizRegion(host) {
  return host.querySelector('[role="region"][tabindex="0"]');
}

function next(host) {
  return [...host.querySelectorAll('button')].find((button) =>
    /Next question|See your results/i.test(button.getAttribute('aria-label') || button.textContent));
}

describe('quiz keyboard and feedback', () => {
  it('lets Enter reach an ordinary child button instead of advancing the round', () => {
    const { host, store } = mount({ mode: 'quiz' });
    click(answer(host));
    const study = host.querySelector('[data-rk-quiz-study]');
    expect(study).toBeTruthy();
    study.focus();
    const before = store.rocks.quizIdx || 0;
    const event = key(study, 'Enter');
    expect(event.defaultPrevented).toBe(false);
    expect(store.rocks.quizIdx || 0).toBe(before);
    // jsdom does not synthesize the native button click from Enter.
    click(study);
    expect(store.rocks.vocabLookedUp).toHaveLength(1);
  });

  it.each(['altKey', 'ctrlKey', 'metaKey', 'shiftKey', 'isComposing'])('does not consume %s-modified shortcuts', (modifier) => {
    const { host, store } = mount({ mode: 'quiz' });
    const event = key(quizRegion(host), '1', { [modifier]: true });
    expect(event.defaultPrevented).toBe(false);
    expect(store.rocks.quizFeedback).toBeFalsy();
    expect(store.rocks.quizLog).toBeFalsy();
  });

  it('keeps unmodified answer shortcuts available on the quiz region itself', () => {
    const { host, store } = mount({ mode: 'quiz' });
    const event = key(quizRegion(host), '1');
    expect(event.defaultPrevented).toBe(true);
    expect(store.rocks.quizFeedback.chosenIdx).toBe(0);
    expect(Object.keys(store.rocks.quizLog)).toEqual(['0']);
  });

  it('updates a persistent live feedback region and marks locked answer controls', () => {
    const { host, store } = mount({ mode: 'quiz' });
    const feedback = host.querySelector('[data-rk-quiz-feedback]');
    expect(feedback).toBeTruthy();
    expect(feedback.getAttribute('role')).toBe('status');
    expect(feedback.getAttribute('aria-live')).toBe('polite');
    expect(feedback.getAttribute('aria-atomic')).toBe('true');
    click(answer(host));
    expect(host.querySelector('[data-rk-quiz-feedback]')).toBe(feedback);
    expect(feedback.textContent).toContain(store.rocks.quizFeedback.explanation);
    expect(host.textContent).toContain('Your answer');
    expect(host.textContent).toContain('Correct answer');
    const recorded = JSON.stringify(store.rocks.quizFeedback);
    for (let i = 1; i <= 4; i++) expect(answer(host, i).getAttribute('aria-disabled')).toBe('true');
    click(answer(host, 2));
    expect(JSON.stringify(store.rocks.quizFeedback)).toBe(recorded);
  });

  it('moves focus to the next question after its trigger disappears', () => {
    const { host, store } = mount({ mode: 'quiz' });
    click(answer(host));
    const trigger = next(host);
    trigger.focus();
    click(trigger);
    act(() => vi.advanceTimersByTime(160));
    expect(store.rocks.quizIdx).toBe(1);
    expect(document.activeElement).toBe(host.querySelector('#rk-quiz-question'));
    expect(document.activeElement.textContent.trim()).not.toBe('');
  });

  it('focuses the completed-round heading after the final question', () => {
    const first = mount({ mode: 'quiz' });
    const total = Number(first.host.textContent.match(/Question\s+1\/(\d+)/)?.[1]);
    expect(total).toBeGreaterThan(1);
    act(() => first.root.unmount());
    first.host.remove();
    mounts.splice(mounts.indexOf(first), 1);
    const { host, store } = mount({ mode: 'quiz', quizIdx: total - 1 });
    click(answer(host));
    click(next(host));
    act(() => vi.advanceTimersByTime(160));
    expect(store.rocks.quizDone).toBe(true);
    expect(document.activeElement).toBe(host.querySelector('#rk-quiz-results-title'));
  });

  it('keeps Study Term mounted and prevents duplicate credit', () => {
    const { host, store, awardXP } = mount({ mode: 'quiz' });
    click(answer(host));
    const study = host.querySelector('[data-rk-quiz-study]');
    study.focus();
    click(study);
    expect(host.querySelector('[data-rk-quiz-study]')).toBe(study);
    expect(document.activeElement).toBe(study);
    expect(study.disabled).toBe(false);
    expect(study.getAttribute('aria-disabled')).toBe('true');
    click(study);
    expect(store.rocks.vocabLookedUp).toHaveLength(1);
    expect(awardXP.mock.calls.filter(([amount]) => amount === 5)).toHaveLength(1);
  });

  it('preserves the current round when leaving and returning through navigation', () => {
    const { host, store } = mount({ mode: 'quiz', quizIdx: 2, quizScore: 1, quizLog: { 0: 1, 1: 0 } });
    click(answer(host));
    const round = structuredClone(store.rocks);
    click(host.querySelector('[data-rocks-mode="compare"]'));
    click(host.querySelector('[data-rocks-mode="quiz"]'));
    for (const key of ['quizIdx', 'quizScore', 'quizLog', 'quizFeedback']) expect(store.rocks[key]).toEqual(round[key]);
  });
});

describe('mineral test controls remain operable during asynchronous results', () => {
  it.each([
    ['scratch', 'scratchAnimProgress', 'scratchResult'],
    ['streak', 'streakAnimActive', 'streakResult'],
    ['acid', 'fizzAnimActive', 'fizzResult'],
  ])('%s preserves focus, blocks duplicate starts, and publishes its final result', (kind, busyKey, resultKey) => {
    const { host, store } = mount({ mode: 'minerals', selectedMineral: 'calcite', scratchTool: 'fingernail' });
    const selector = '[data-rk-mineral-test="' + kind + '"]';
    const button = host.querySelector(selector);
    const result = host.querySelector('[data-rk-mineral-result="' + kind + '"]');
    expect(result).toBeTruthy();
    expect(result.getAttribute('role')).toBe('status');
    expect(result.getAttribute('aria-live')).toBe('polite');
    expect(result.getAttribute('aria-atomic')).toBe('true');
    button.focus();
    click(button);
    expect(store.rocks[busyKey]).toBeTruthy();
    expect(host.querySelector(selector)).toBe(button);
    expect(button.disabled).toBe(false);
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(document.activeElement).toBe(button);
    const timers = vi.getTimerCount();
    const busyState = JSON.stringify(store.rocks);
    click(button);
    expect(vi.getTimerCount()).toBe(timers);
    expect(JSON.stringify(store.rocks)).toBe(busyState);
    act(() => vi.advanceTimersByTime(2000));
    expect(host.querySelector(selector)).toBe(button);
    expect(document.activeElement).toBe(button);
    expect(button.getAttribute('aria-disabled')).not.toBe('true');
    expect(store.rocks[resultKey]).toBeTruthy();
    expect(host.querySelector('[data-rk-mineral-result="' + kind + '"]')).toBe(result);
    expect(result.textContent).toContain(store.rocks[resultKey]);
  });
});

describe('Mystery Rock focus and error recovery', () => {
  const mystery = () => ({ rockId: 'granite', clues: ['First observation.', 'Second observation.', 'Third observation.'], cluesShown: 1, offline: true });
  const start = (host) => [...host.querySelectorAll('[data-rk-mystery-panel] button')].find((button) => /Start Challenge/.test(button.textContent));
  const tick = () => act(() => vi.advanceTimersByTime(10));

  it('focuses the first clue when Start Challenge removes its own button', () => {
    const { host, store } = mount({ mode: 'mystery' });
    const trigger = start(host);
    trigger.focus();
    click(trigger);
    tick();
    expect(store.rocks.mystery.offline).toBe(true);
    expect(document.activeElement).toBe(host.querySelector('[data-rk-mystery-clue="0"]'));
  });

  it('focuses the newly revealed clue after a wrong guess disables its tile', () => {
    const { host, store } = mount({ mode: 'mystery', mystery: mystery() });
    const trigger = host.querySelector('[data-rk-mystery-tile="basalt"]');
    trigger.focus();
    click(trigger);
    tick();
    expect(store.rocks.mystery.wrong).toContain('basalt');
    expect(document.activeElement).toBe(host.querySelector('[data-rk-mystery-clue="1"]'));
    expect(document.activeElement.textContent).toContain('Second observation.');
  });

  it('focuses the last clue when the reveal button is removed', () => {
    const { host } = mount({ mode: 'mystery', mystery: { ...mystery(), cluesShown: 2 } });
    const trigger = host.querySelector('[aria-label="Reveal next clue"]');
    trigger.focus();
    click(trigger);
    tick();
    expect(document.activeElement).toBe(host.querySelector('[data-rk-mystery-clue="2"]'));
    expect(host.querySelector('[aria-label="Reveal next clue"]')).toBeNull();
  });

  it.each(['correct', 'reveal'])('focuses the result heading after %s', (action) => {
    const { host, store } = mount({ mode: 'mystery', mystery: mystery() });
    const trigger = action === 'correct'
      ? host.querySelector('[data-rk-mystery-tile="granite"]')
      : [...host.querySelectorAll('button')].find((button) => /Give up/.test(button.textContent));
    trigger.focus();
    click(trigger);
    tick();
    expect(store.rocks.mystery[action === 'correct' ? 'solved' : 'revealed']).toBe(true);
    expect(document.activeElement).toBe(host.querySelector('[data-rk-mystery-result-title]'));
    expect(document.activeElement.textContent).toMatch(/granite/i);
  });

  it('keeps focus in the destination activity when an old AI request completes', async () => {
    let finish;
    const callGemini = vi.fn(() => new Promise((resolve) => { finish = resolve; }));
    const { host, store } = mount({ mode: 'mystery' }, { callGemini });
    click(start(host));
    tick();
    expect(document.activeElement).toBe(host.querySelector('[data-rk-mystery-loading]'));
    const destination = host.querySelector('[data-rocks-mode="compare"]');
    destination.focus();
    click(destination);
    await act(async () => { finish('First remote clue.|||Second remote clue.'); await Promise.resolve(); });
    tick();
    expect(store.rocks.mode).toBe('compare');
    expect(document.activeElement).toBe(destination);
  });

  it('shows a failed AI request and offers both retry and local field-note recovery', async () => {
    let fail;
    const callGemini = vi.fn(() => new Promise((resolve, reject) => { fail = reject; }));
    const { host, store } = mount({ mode: 'mystery' }, { callGemini });
    click(start(host));
    tick();
    await act(async () => { fail(new Error('offline')); await Promise.resolve(); });
    tick();
    const error = host.querySelector('[data-rk-mystery-error]');
    expect(error).toBeTruthy();
    expect(error.getAttribute('role')).toBe('alert');
    expect(error.textContent).toContain('Could not reach AI tutor');
    expect(document.activeElement).toBe(error);
    expect(start(host)).toBeTruthy();
    click(host.querySelector('[data-rk-mystery-local]'));
    tick();
    expect(callGemini).toHaveBeenCalledTimes(1);
    expect(store.rocks.mystery.offline).toBe(true);
    expect(store.rocks.mystery.error).toBeNull();
    expect(host.querySelector('[data-rk-mystery-error]')).toBeNull();
    expect(document.activeElement).toBe(host.querySelector('[data-rk-mystery-clue="0"]'));
  });
});
