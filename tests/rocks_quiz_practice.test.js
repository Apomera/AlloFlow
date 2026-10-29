// Exercise the learner's review loop with real React state: practice must not
// rewrite first-try evidence, award points, or lose progress on a reference visit.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const act = React.act;
const strings = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
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
  mounts.splice(0).forEach(({ root, host }) => { act(() => root.unmount()); host.remove(); });
  window.HTMLElement.prototype.scrollIntoView = oldScroll;
  vi.clearAllTimers();
  vi.useRealTimers();
  global.IS_REACT_ACT_ENVIRONMENT = false;
  vi.restoreAllMocks();
});

function mount(rocks = {}) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const store = { rocks: { mode: 'quiz', quizDone: true, quizIdx: 35, quizScore: 4, quizLog: { 0: 0, 1: 0, 2: 0, 3: 1 }, vocabLookedUp: ['Streak'], compare: { notes: { pair: 'Keep this observation.' } }, ...rocks }, rockCycle: { keep: true } };
  const awardXP = vi.fn();
  let redraw;
  function Harness() {
    const [, setTick] = React.useState(0);
    redraw = () => setTick((tick) => tick + 1);
    return window.StemLab._registry.rocks.render(makeCtx({ toolData: store, awardXP,
      t: (key, fallback) => key.split('.').reduce((value, part) => value && value[part], strings) || fallback || key,
      setToolData(update) {
      Object.assign(store, typeof update === 'function' ? update(store) : update);
      redraw();
    } }));
  }
  act(() => root.render(React.createElement(Harness)));
  const instance = { host, root, store, awardXP };
  mounts.push(instance);
  return instance;
}

function click(node) {
  expect(node, 'expected control to exist').toBeTruthy();
  act(() => node.click());
}
function flushFocus() { act(() => vi.advanceTimersByTime(160)); }
function press(node, key, modifiers = {}) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...modifiers });
  act(() => node.dispatchEvent(event));
  return event;
}
function select(host, selector) { return host.querySelector(selector); }
function answer(host, label) {
  return [...host.querySelectorAll('[data-rk-practice-answer]')].find((button) => button.textContent.includes(label));
}
function original(store) {
  const { quizPractice, ...rest } = store.rocks;
  return JSON.parse(JSON.stringify({ ...store, rocks: rest }));
}
function start(t, kind = 'all') { click(select(t.host, '[data-rk-practice-start="' + kind + '"]')); }
function next(t) { click(select(t.host, '[data-rk-practice-next]')); }

describe('targeted quiz practice', () => {
  it('starts only missed questions, focuses the question, and keeps the original round intact', () => {
    const t = mount({ quizLog: { 0: 0, 1: 1, 2: 0, 99: 0, bad: 0, 3: '0' } });
    const before = original(t.store);
    start(t);
    flushFocus();
    expect(t.store.rocks.quizPractice).toMatchObject({ queue: [0, 2], index: 0, answers: {}, active: true, done: false });
    expect(select(t.host, '[data-rk-quiz-done]')).toBeNull();
    expect(document.activeElement).toBe(select(t.host, '#rk-quiz-practice-question'));
    expect(original(t.store)).toEqual(before);
    expect(t.awardXP).not.toHaveBeenCalled();
  });

  it('offers the missed questions from the weakest topic, not its correct answers or other topics', () => {
    const t = mount({ quizLog: { 0: 0, 1: 0, 2: 0, 3: 1 } });
    expect(select(t.host, '[data-rk-quiz-topic]').getAttribute('data-rk-quiz-topic')).toBe('Sedimentary');
    start(t, 'topic');
    expect(t.store.rocks.quizPractice.queue).toEqual([0, 1]);
  });

  it('does not offer empty practice when no questions were missed', () => {
    const t = mount({ quizLog: { 0: 1, 1: 1 } });
    expect(select(t.host, '[data-rk-practice-start]')).toBeNull();
    expect(select(t.host, '[data-rk-practice-resume]')).toBeNull();
  });

  it('records the actual option once, with stable live feedback and no XP or vocabulary credit', () => {
    const t = mount({ quizLog: { 2: 0 } });
    const before = original(t.store);
    start(t);
    const region = select(t.host, '[data-rk-practice-feedback]');
    expect(region.getAttribute('role')).toBe('status');
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.getAttribute('aria-atomic')).toBe('true');
    const correct = answer(t.host, 'Apatite'), incorrect = answer(t.host, 'Quartz');
    correct.focus();
    // Both clicks occur before React commits another render. The functional
    // state update must protect the first answer even from this stale handler.
    act(() => { correct.click(); incorrect.click(); });
    expect(t.store.rocks.quizPractice.feedback.correct).toBe(true);
    expect(t.store.rocks.quizPractice.answers[2]).toBe(Number(correct.dataset.rkPracticeAnswer));
    expect(select(t.host, '[data-rk-practice-feedback]')).toBe(region);
    expect(region.textContent).toContain('Correct!');
    expect(document.activeElement).toBe(correct);
    expect(correct.textContent).toContain('Your answer');
    expect(correct.textContent).toContain('Correct answer');
    t.host.querySelectorAll('[data-rk-practice-answer]').forEach((button) => expect(button.getAttribute('aria-disabled')).toBe('true'));
    expect(select(t.host, '[data-rk-quiz-study]')).toBeNull();
    expect(original(t.store)).toEqual(before);
    expect(t.awardXP).not.toHaveBeenCalled();
  });

  it('retains feedback and progress while returning to the original results and resuming', () => {
    const t = mount();
    start(t);
    click(answer(t.host, 'sharp corners'));
    next(t);
    click(answer(t.host, 'Shale'));
    const saved = JSON.parse(JSON.stringify(t.store.rocks.quizPractice));
    click(select(t.host, '[data-rk-practice-return]'));
    flushFocus();
    expect(t.store.rocks.quizPractice).toEqual({ ...saved, active: false });
    expect(document.activeElement).toBe(select(t.host, '#rk-quiz-results-title'));
    click(select(t.host, '[data-rk-practice-resume]'));
    flushFocus();
    expect(t.store.rocks.quizPractice).toEqual(saved);
    expect(select(t.host, '[data-rk-practice]').getAttribute('data-rk-practice')).toBe('1');
    expect(select(t.host, '[data-rk-practice-feedback]').textContent).toContain('Incorrect.');
    expect(document.activeElement).toBe(select(t.host, '#rk-quiz-practice-question'));
  });

  it('resumes the same practice when returning from another activity', () => {
    const t = mount();
    start(t);
    click(answer(t.host, 'sharp corners'));
    const saved = JSON.parse(JSON.stringify(t.store.rocks.quizPractice));
    const navigation = (name) => [...t.host.querySelectorAll('button')].find((button) => button.getAttribute('aria-label') === 'Switch to ' + name + ' mode');
    click(navigation('Rocks'));
    expect(select(t.host, '[data-rk-practice]')).toBeNull();
    click(navigation('Quiz'));
    expect(t.store.rocks.quizPractice).toEqual(saved);
    expect(select(t.host, '[data-rk-practice-feedback]').textContent).toContain('Correct!');
  });

  it('finishes with a separate score and retries only questions still missed', () => {
    const t = mount();
    const before = original(t.store);
    start(t);
    click(answer(t.host, 'sharp corners'));
    const advance = select(t.host, '[data-rk-practice-next]');
    act(() => { advance.click(); advance.click(); });
    flushFocus();
    expect(t.store.rocks.quizPractice.index).toBe(1);
    expect(document.activeElement).toBe(select(t.host, '#rk-quiz-practice-question'));
    click(answer(t.host, 'Shale'));
    next(t);
    click(answer(t.host, 'Apatite'));
    next(t);
    flushFocus();
    expect(select(t.host, '[data-rk-practice-done]').getAttribute('data-rk-practice-done')).toBe('2/3');
    expect(document.activeElement).toBe(select(t.host, '#rk-quiz-practice-results-title'));
    expect(original(t.store)).toEqual(before);
    click(select(t.host, '[data-rk-practice-retry]'));
    flushFocus();
    expect(t.store.rocks.quizPractice).toMatchObject({ queue: [1], answers: {}, index: 0, done: false });
    click(answer(t.host, 'Siltstone'));
    next(t);
    expect(select(t.host, '[data-rk-practice-done]').getAttribute('data-rk-practice-done')).toBe('1/1');
    expect(select(t.host, '[data-rk-practice-retry]')).toBeNull();
    expect(t.host.textContent).toContain('every question in this practice correctly');
    expect(original(t.store)).toEqual(before);
    expect(t.awardXP).not.toHaveBeenCalled();
  });

  it('keeps a completed practice available for review and clears it only with an explicit new round', () => {
    const t = mount({ quizLog: { 2: 0 } });
    start(t);
    click(answer(t.host, 'Apatite'));
    next(t);
    click(select(t.host, '[data-rk-practice-return]'));
    expect(select(t.host, '[data-rk-practice-resume]').textContent).toBe('Review practice results');
    click(select(t.host, '[data-rk-practice-resume]'));
    flushFocus();
    expect(document.activeElement).toBe(select(t.host, '#rk-quiz-practice-results-title'));
    click(select(t.host, '[data-rk-practice-return]'));
    click(select(t.host, '[data-rk-quiz-again]'));
    flushFocus();
    expect(t.store.rocks).toMatchObject({ quizPractice: null, quizIdx: 0, quizLog: null, quizScore: 0, quizDone: null });
    expect(document.activeElement).toBe(select(t.host, '#rk-quiz-question'));
  });
});

describe('practice keyboard behavior and damaged saved state', () => {
  it('keeps shortcuts on the focused region and does not consume ordinary control Enter', () => {
    const t = mount({ quizLog: { 2: 0 } });
    start(t);
    const correct = answer(t.host, 'Apatite');
    expect(press(correct, '1').defaultPrevented).toBe(false);
    expect(t.store.rocks.quizPractice.feedback).toBeNull();
    const region = select(t.host, '[data-rk-practice]');
    expect(press(region, String(Number(correct.dataset.rkPracticeAnswer) + 1)).defaultPrevented).toBe(true);
    const back = select(t.host, '[data-rk-practice-return]');
    expect(press(back, 'Enter').defaultPrevented).toBe(false);
    expect(t.store.rocks.quizPractice.done).toBe(false);
    expect(press(region, 'n').defaultPrevented).toBe(true);
    expect(t.store.rocks.quizPractice.done).toBe(true);
  });

  it.each(['altKey', 'ctrlKey', 'metaKey', 'shiftKey', 'isComposing'])('ignores %s-modified shortcuts', (modifier) => {
    const t = mount();
    start(t);
    expect(press(select(t.host, '[data-rk-practice]'), '1', { [modifier]: true }).defaultPrevented).toBe(false);
    expect(t.store.rocks.quizPractice.answers).toEqual({});
  });

  it.each([null, 7, 'invalid', [], {}, { queue: [-1, 99, '2'] }, { queue: [3], active: true }])('ignores unusable saved practice %j', (quizPractice) => {
    const t = mount({ quizPractice });
    expect(select(t.host, '[data-rk-practice]')).toBeNull();
    expect(select(t.host, '[data-rk-practice-resume]')).toBeNull();
    expect(select(t.host, '[data-rk-quiz-done]')).toBeTruthy();
  });

  it('recovers unique in-range missed indices and rejects forged feedback, completion, and future answers', () => {
    const t = mount({ quizPractice: { queue: [2, 2, -1, 36, '1', 3, 1], index: 900, active: true, done: true, answers: { 2: 'yes', 1: 0 }, feedback: { correct: true, msg: 'FORGED SCORE', explanation: 'FORGED FEEDBACK' } } });
    expect(select(t.host, '[data-rk-practice]').getAttribute('data-rk-practice')).toBe('2');
    expect(select(t.host, '[data-rk-practice-progress]').textContent).toContain('1 / 2');
    expect(select(t.host, '[data-rk-practice-feedback]').textContent).toBe('');
    expect(t.host.textContent).not.toContain('FORGED');
    expect(select(t.host, '[data-rk-practice-done]')).toBeNull();
    click(answer(t.host, 'Apatite'));
    expect(t.store.rocks.quizPractice.queue).toEqual([2, 1]);
    expect(Object.keys(t.store.rocks.quizPractice.answers)).toEqual(['2']);
    next(t);
    expect(select(t.host, '[data-rk-practice-feedback]').textContent).toBe('');
  });

  it('does not let saved practice hide an unfinished original round', () => {
    const t = mount({ quizDone: false, quizIdx: 1, quizPractice: { queue: [0], index: 0, answers: {}, active: true } });
    expect(select(t.host, '[data-rk-practice]')).toBeNull();
    expect(select(t.host, '#rk-quiz-question')).toBeTruthy();
  });

  it('rebuilds saved feedback and completed scores from the chosen bank option', () => {
    const t = mount({ quizLog: { 2: 0 }, quizPractice: { queue: [2], index: 0, answers: { 2: 0 }, active: true, feedback: { correct: true, msg: 'FORGED CORRECT' } } });
    expect(select(t.host, '[data-rk-practice-feedback]').textContent).toContain('Incorrect.');
    expect(answer(t.host, 'Apatite').textContent).toContain('Correct answer');
    expect(t.host.textContent).not.toContain('FORGED CORRECT');
    next(t);
    expect(select(t.host, '[data-rk-practice-done]').getAttribute('data-rk-practice-done')).toBe('0/1');
    expect(t.awardXP).not.toHaveBeenCalled();
  });
});
