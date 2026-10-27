import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host, root, tool, api, latest;
const deck = () => api.getQuizDeck();
const key = index => api.flightQuizQuestionKey(deck()[index]);
const questionCard = () => host.querySelector('section[aria-labelledby="skyschool-quiz-question"]');
const firstResponse = () => questionCard().querySelector('[data-quiz-first-response]');
const choices = () => [...questionCard().querySelectorAll('button[aria-label^="Answer "]')];
const response = (index, correct) => ({ choice: correct ? deck()[index].correct : deck()[index].options.find(option => option !== deck()[index].correct), correct, order: index });
function button(label) {
  const result = [...host.querySelectorAll('button')].find(node => node.textContent === label);
  expect(result, `Button: ${label}`).toBeTruthy();
  return result;
}
async function click(node) {
  expect(node).toBeTruthy();
  await act(async () => { node.focus(); node.click(); });
}
async function answer(correct) {
  const question = deck()[latest.quizIdx || 0];
  const index = correct ? question.options.indexOf(question.correct) : question.options.findIndex(option => option !== question.correct);
  await click(choices()[index]);
}
async function mount(seed = {}) {
  if (root) await act(async () => root.unmount());
  host?.remove();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'quiz', ...seed } });
    latest = data.flightSim;
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, name, value) => setData(previous => ({ ...previous, [id]: { ...previous[id], [name]: value } })),
      updateMulti: (id, patch) => setData(previous => ({ ...previous, [id]: { ...previous[id], ...patch } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}
function history() {
  const archived = api.flightQuizArchiveAttempt(deck(), { [key(1)]: response(1, false) }, '2026-10-20T12:00:00.000Z', 'quiz-1792497600000-1');
  return [api.flightQuizJournalRecord(archived)];
}
function expectConcealed() {
  expect(questionCard().querySelector('[data-quiz-practice]')).toBeTruthy();
  expect(firstResponse()).toBeNull();
  expect(questionCard().textContent).not.toContain(deck()[0].explanation);
  expect(questionCard().textContent).not.toContain('✓ Correct!');
  expect(questionCard().textContent).not.toContain('✗ Not quite.');
  expect(choices().every(node => !node.disabled && node.getAttribute('aria-pressed') === 'false')).toBe(true);
}

beforeEach(() => {
  vi.useFakeTimers();
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  api = window.__RR_TEST_EXPORTS__.flightSim;
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null;
  host?.remove(); host = null;
  delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('Sky School quiz retrieval practice', () => {
  it('conceals a correct saved response until a new practice answer, preserving its original score and history', async () => {
    const first = { [key(0)]: response(0, true) }, earlier = history();
    await mount({ quizFirstAttempts: first, quizAttemptHistory: earlier });
    expect(firstResponse().textContent).toContain(deck()[0].correct);
    expect(questionCard().textContent).toContain(deck()[0].explanation);
    await click(button('Practice this question'));
    expectConcealed();
    await answer(false);
    expect(firstResponse().textContent).toContain(first[key(0)].choice);
    expect(questionCard().textContent).toContain('✗ Not quite.');
    expect(questionCard().textContent).toContain(deck()[0].explanation);
    expect(latest.quizFirstAttempts).toEqual(first);
    expect([latest.quizScore, latest.quizTotal]).toEqual([1, 1]);
    expect(latest.quizAttemptHistory).toEqual(earlier);
  });

  it('conceals a missed first response during review and reveals both saved response and feedback after practice', async () => {
    const first = { [key(0)]: response(0, false) }, earlier = history();
    await mount({ quizFirstAttempts: first, quizAttemptHistory: earlier });
    await click(host.querySelector('[data-quiz-review-action="missed"]'));
    expectConcealed();
    await answer(true);
    expect(firstResponse().textContent).toContain(first[key(0)].choice);
    expect(questionCard().textContent).toContain('✓ Correct!');
    expect(questionCard().textContent).toContain(deck()[0].explanation);
    expect(latest.quizFirstAttempts).toEqual(first);
    expect([latest.quizScore, latest.quizTotal]).toEqual([0, 1]);
    expect(host.querySelector('[data-quiz-review] [role="status"]').textContent).toContain('1 missed');
    expect(latest.quizAttemptHistory).toEqual(earlier);
  });

  it.each([true, false])('keeps an unanswered practice concealed after remount when the first response was correct: %s', async correct => {
    const first = { [key(0)]: response(0, correct) };
    await mount({ quizFirstAttempts: first });
    await click(button('Practice this question'));
    await mount(JSON.parse(JSON.stringify(latest)));
    expectConcealed();
    expect(latest.quizFirstAttempts).toEqual(first);
    expect([latest.quizScore, latest.quizTotal]).toEqual([correct ? 1 : 0, 1]);
  });

  it.each([true, false])('restores the saved response and answered practice feedback after remount for a correct practice answer: %s', async practiceCorrect => {
    const first = { [key(0)]: response(0, !practiceCorrect) };
    await mount({ quizFirstAttempts: first });
    await click(button('Practice this question'));
    await answer(practiceCorrect);
    const saved = JSON.parse(JSON.stringify(latest));
    await mount(saved);
    expect(firstResponse().textContent).toContain(first[key(0)].choice);
    expect(questionCard().textContent).toContain(practiceCorrect ? '✓ Correct!' : '✗ Not quite.');
    expect(questionCard().textContent).toContain(deck()[0].explanation);
    expect(choices().every(node => !node.disabled && node.getAttribute('aria-disabled') === 'true')).toBe(true);
    expect(latest.quizFirstAttempts).toEqual(first);
    expect([latest.quizScore, latest.quizTotal]).toEqual([practiceCorrect ? 0 : 1, 1]);
  });
});
