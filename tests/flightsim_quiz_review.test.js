import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host, root, tool, FS, latest;
const choices = () => [...host.querySelectorAll('button[aria-label^="Answer "]')];
const action = name => host.querySelector('[data-quiz-review-action="' + name + '"]');
const progress = () => host.querySelector('[data-quiz-review] [role="status"]').textContent;
const key = index => FS.flightQuizQuestionKey(FS.getQuizDeck()[index]);
function response(index, correct, order = index) {
  const question = FS.getQuizDeck()[index];
  return { choice: correct ? question.correct : question.options.find(option => option !== question.correct), correct, order };
}
async function click(element) {
  expect(element).toBeTruthy();
  await act(async () => { element.focus(); element.click(); });
}
async function mount(seed = {}) {
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'quiz', ...seed } });
    latest = data.flightSim;
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, name, value) => setData(previous => ({ ...previous, [id]: { ...previous[id], [name]: value } })),
      updateMulti: (id, patch) => setData(previous => ({ ...previous, [id]: { ...previous[id], ...patch } })),
    }));
  }
  await act(async () => { root.render(React.createElement(App)); });
}

beforeEach(() => {
  vi.useFakeTimers();
  host = null;
  root = null;
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  FS = window.__RR_TEST_EXPORTS__.flightSim;
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
});
afterEach(async () => {
  if (root) await act(async () => { root.unmount(); });
  host?.remove();
  delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('SkySchool quiz review continuity', () => {
  it('offers unanswered navigation without creating a first response', async () => {
    await mount();
    expect(progress()).toBe(`0 of ${FS.getQuizDeck().length} questions answered · 0 missed`);
    expect(action('missed').disabled).toBe(true);
    expect(action('unanswered').disabled).toBe(false);
    await click(action('unanswered'));
    expect(latest.quizIdx).toBe(1);
    expect(latest.quizFirstAttempts).toEqual({});
    expect(latest.quizTotal).toBe(0);
    expect(choices().every(choice => !choice.disabled)).toBe(true);
    expect(document.activeElement).toBe(host.querySelector('#skyschool-quiz-question'));
  });

  it('cycles through missed first responses as unscored practice and retains the original mistakes', async () => {
    const saved = { [key(0)]: response(0, false), [key(1)]: response(1, true), [key(2)]: response(2, false) };
    await mount({ quizIdx: 3, quizFirstAttempts: saved });
    await click(action('missed'));
    expect(latest.quizIdx).toBe(0);
    expect(latest.quizPracticeKey).toBe(key(0));
    expect(choices().every(choice => !choice.disabled)).toBe(true);
    await click(choices()[FS.getQuizDeck()[0].options.indexOf(FS.getQuizDeck()[0].correct)]);
    expect(latest.quizFirstAttempts).toEqual(saved);
    expect([latest.quizScore, latest.quizTotal]).toEqual([1, 3]);
    expect(progress()).toContain('2 missed');
    await click(action('missed'));
    expect(latest.quizIdx).toBe(2);
    expect(latest.quizPracticeKey).toBe(key(2));
    await click(action('missed'));
    expect(latest.quizIdx).toBe(0);
    expect(latest.quizPracticePicked).toBeNull();
    expect(latest.quizFirstAttempts).toEqual(saved);
  });

  it('focuses the question when a review has only the current missed question', async () => {
    await mount({ quizFirstAttempts: { [key(0)]: response(0, false) } });
    await click(action('missed'));
    await act(async () => { vi.runOnlyPendingTimers(); });
    expect(latest.quizIdx).toBe(0);
    expect(document.activeElement).toBe(host.querySelector('#skyschool-quiz-question'));
    expect(host.querySelector('[data-quiz-practice]')).toBeTruthy();
  });

  it('skips answered questions, wraps to the remaining one, and marks deck completion honestly', async () => {
    const deck = FS.getQuizDeck();
    const saved = Object.fromEntries(deck.map((question, index) => [key(index), response(index, true)]));
    delete saved[key(2)];
    await mount({ quizIdx: deck.length - 1, quizFirstAttempts: saved });
    await click(action('unanswered'));
    expect(latest.quizIdx).toBe(2);
    expect(latest.quizPracticeKey).toBeNull();
    await click(choices()[deck[2].options.indexOf(deck[2].correct)]);
    expect(progress()).toBe(`${deck.length} of ${deck.length} questions answered · 0 missed`);
    expect(action('unanswered').disabled).toBe(true);
    expect(action('missed').disabled).toBe(true);
    expect(host.textContent).toContain('Every question has a first response.');
    expect([latest.quizScore, latest.quizTotal]).toEqual([deck.length, deck.length]);
  });

  it('uses actual current-deck choices rather than stale keys, removed choices, or saved correctness flags', async () => {
    const saved = {
      [key(0)]: { ...response(0, false), correct: true },
      [key(1)]: { ...response(1, true), correct: false },
      [key(2)]: { choice: 'An answer removed from the question', correct: true, order: 2 },
      'id:removed-question': { choice: 'A', correct: true, order: 3 },
    };
    await mount({ quizIdx: 2, quizFirstAttempts: saved, quizTotal: 999, quizScore: 999 });
    expect(progress()).toBe(`2 of ${FS.getQuizDeck().length} questions answered · 1 missed`);
    expect(choices().every(choice => !choice.disabled)).toBe(true);
    await click(action('missed'));
    expect(latest.quizIdx).toBe(0);
    expect([latest.quizScore, latest.quizTotal]).toEqual([1, 2]);
    expect(Object.keys(latest.quizFirstAttempts)).toEqual([key(0), key(1)]);
    expect(latest.quizFirstAttempts[key(0)].correct).toBe(false);
    expect(latest.quizFirstAttempts[key(1)].correct).toBe(true);
    await click(action('unanswered'));
    expect(latest.quizIdx).toBe(2);
    expect(latest.quizPracticeKey).toBeNull();
  });

  it('recovers a malformed current response when the learner answers again', async () => {
    await mount({ quizFirstAttempts: { [key(0)]: { choice: 'removed', correct: true }, stale: { choice: 'old', correct: true } } });
    const question = FS.getQuizDeck()[0];
    await click(choices()[question.options.indexOf(question.correct)]);
    expect([latest.quizScore, latest.quizTotal]).toEqual([1, 1]);
    expect(latest.quizFirstAttempts[key(0)].choice).toBe(question.correct);
    expect(Object.keys(latest.quizFirstAttempts)).toHaveLength(1);
  });

  it('appends new responses after surviving response order when earlier questions have been removed', async () => {
    await mount({ quizIdx: 2, quizFirstAttempts: {
      [key(0)]: response(0, true, 10), [key(1)]: response(1, true, 12),
      stale: { choice: 'old answer', correct: false, order: 11 },
    } });
    const question = FS.getQuizDeck()[2];
    await click(choices()[question.options.findIndex(option => option !== question.correct)]);
    expect(latest.quizFirstAttempts[key(2)].order).toBe(13);
    expect([latest.quizScore, latest.quizTotal, latest.quizStreak, latest.quizBest]).toEqual([2, 3, 0, 2]);
  });

  it('restores review state after remount and keeps legacy aggregates out of review counts', async () => {
    await mount({ quizIdx: 0, quizPicked: 1, quizScore: 20, quizTotal: 30 });
    expect(progress()).toBe(`1 of ${FS.getQuizDeck().length} questions answered · 1 missed`);
    await click(action('missed'));
    const saved = structuredClone(latest);
    await act(async () => { root.unmount(); });
    root = ReactDOMClient.createRoot(host);
    await mount(saved);
    expect(latest.quizPracticeKey).toBe(key(0));
    expect(choices().every(choice => !choice.disabled)).toBe(true);
    expect(host.querySelector('[data-quiz-legacy-summary]').textContent).toContain('20/30');
    expect(progress()).toContain('1 missed');
    expect([latest.quizScore, latest.quizTotal]).toEqual([0, 1]);
  });

  it('disables missed review when every valid first response is correct', async () => {
    await mount({ quizFirstAttempts: { [key(0)]: response(0, true) } });
    expect(action('missed').disabled).toBe(true);
    await click(action('missed'));
    expect(latest.quizIdx).toBeUndefined();
    expect(latest.quizPracticeKey).toBeUndefined();
  });
});

describe('SkySchool quiz response identity', () => {
  it('keeps a response across option order changes while evaluating its answer content', () => {
    const question = { question: 'Which one?', correct: 'A', options: ['A', 'B', 'C'] };
    const reordered = { ...question, options: ['C', 'B', 'A'] };
    const identity = FS.flightQuizQuestionKey(question);
    const result = FS.flightQuizReviewState([reordered], { [identity]: { choice: 'B', correct: true, order: 1 } });
    expect(result.missed).toEqual([0]);
    expect(result.unanswered).toEqual([]);
    expect(result.attempts[identity].correct).toBe(false);
  });

  it('does not recover a response for changed question content without a stable identity', () => {
    const question = { question: 'Old wording', correct: 'A', options: ['A', 'B'] };
    const saved = { [FS.flightQuizQuestionKey(question)]: { choice: 'A', correct: true, order: 0 } };
    const result = FS.flightQuizReviewState([{ ...question, question: 'Different question' }], saved);
    expect(result.attempts).toEqual({});
    expect(result.unanswered).toEqual([0]);
    expect(result.missed).toEqual([]);
  });

  it('rejects primitive and array records while recovering valid choices with missing correctness flags', () => {
    const deck = [0, 1, 2, 3].map(id => ({ id, question: String(id), correct: 'A', options: ['A', 'B'] }));
    const saved = Object.fromEntries(deck.map(question => [FS.flightQuizQuestionKey(question), null]));
    saved[FS.flightQuizQuestionKey(deck[0])] = 'A';
    saved[FS.flightQuizQuestionKey(deck[1])] = ['A'];
    saved[FS.flightQuizQuestionKey(deck[2])] = { choice: 'A', order: Infinity };
    saved[FS.flightQuizQuestionKey(deck[3])] = { choice: 'B' };
    const result = FS.flightQuizReviewState(deck, saved);
    expect(result.unanswered).toEqual([0, 1]);
    expect(result.missed).toEqual([3]);
    expect(result.attempts[FS.flightQuizQuestionKey(deck[2])]).toEqual({ choice: 'A', correct: true, order: 2 });
  });
});
