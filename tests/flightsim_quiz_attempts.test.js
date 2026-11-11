import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host, root, tool, latest, updateSaved;
const answerButtons = () => [...host.querySelectorAll('button[aria-label^="Answer "]')];
// Option order is shuffled per attempt, so tests find the key by its text, never by position.
const deckQuestion = () => window.__RR_TEST_EXPORTS__.flightSim.getQuizDeck().find(q => q.question === host.querySelector('h3').textContent);
const rightIndex = () => deckQuestion().options.indexOf(deckQuestion().correct);
const wrongIndex = () => (rightIndex() + 1) % deckQuestion().options.length;
const right = () => answerButtons()[rightIndex()];
const wrong = () => answerButtons()[wrongIndex()];
const button = text => [...host.querySelectorAll(text === 'Next' ? '.skyschool-quiz-nav button' : 'button')].find(element => element.textContent.includes(text));
async function click(element) {
  expect(element).toBeTruthy();
  await act(async () => { element.click(); });
}
async function mount(seed = {}) {
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'quiz', ...seed } });
    latest = data.flightSim;
    updateSaved = patch => setData(prev => ({ ...prev, flightSim: { ...prev.flightSim, ...patch } }));
    return tool.render(makeCtx({
      toolData: data,
      setToolData: setData,
      update: (id, key, value) => setData(prev => ({ ...prev, [id]: { ...prev[id], [key]: value } })),
      updateMulti: (id, patch) => setData(prev => ({ ...prev, [id]: { ...prev[id], ...patch } })),
    }));
  }
  await act(async () => { root.render(React.createElement(App)); });
}
function counts() { return [latest.quizScore, latest.quizTotal, latest.quizStreak, latest.quizBest]; }

beforeEach(() => {
  vi.useFakeTimers();
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('SkySchool first-attempt quiz scoring', () => {
  it('restores the original answer and feedback after previous/next/random navigation', async () => {
    await mount();
    const firstQuestion = host.querySelector('h3').textContent;
    const firstWrong = wrongIndex();
    await click(wrong());
    expect(counts()).toEqual([0, 1, 0, 0]);
    const firstRecord = structuredClone(latest.quizFirstAttempts);
    await click(button('Next'));
    await click(right());
    expect(counts()).toEqual([1, 2, 1, 1]);
    await click(button('Previous'));
    expect(host.querySelector('h3').textContent).toBe(firstQuestion);
    expect(answerButtons()[firstWrong].getAttribute('aria-pressed')).toBe('true');
    expect(answerButtons().every(element => !element.disabled && element.getAttribute('aria-disabled') === 'true')).toBe(true);
    expect(host.textContent).toContain('Not quite. The answer was:');
    await click(right());
    expect(counts()).toEqual([1, 2, 1, 1]);
    vi.spyOn(Math, 'random').mockReturnValue(0);
    await click(button('Random'));
    expect(answerButtons()[firstWrong].getAttribute('aria-pressed')).toBe('true');
    expect(latest.quizFirstAttempts[Object.keys(firstRecord)[0]]).toEqual(Object.values(firstRecord)[0]);
    expect(counts()).toEqual([1, 2, 1, 1]);
  });

  it('allows explicit unscored practice while preserving first-response evidence', async () => {
    await mount();
    const wrongAnswer = wrong().getAttribute('aria-label').split(': ')[1], firstWrong = wrongIndex();
    await click(wrong());
    const firstRecord = structuredClone(latest.quizFirstAttempts);
    await click(button('Practice this question'));
    expect(answerButtons().every(element => !element.disabled)).toBe(true);
    expect(host.querySelector('[data-quiz-practice]').textContent).toContain('does not change');
    await click(right());
    expect(host.textContent).toContain('✓ Correct!');
    expect(host.querySelector('[data-quiz-first-response]').textContent).toContain(wrongAnswer);
    expect(counts()).toEqual([0, 1, 0, 0]);
    expect(latest.quizFirstAttempts).toEqual(firstRecord);
    await click(button('Practice this question'));
    await click(right());
    expect(counts()).toEqual([0, 1, 0, 0]);
    await click(button('Next'));
    await click(button('Previous'));
    expect(host.querySelector('[data-quiz-practice]')).toBeNull();
    expect(answerButtons()[firstWrong].getAttribute('aria-pressed')).toBe('true');
    expect(host.textContent).toContain('Not quite. The answer was:');
  });

  it('starts a new assessed attempt only through the explicit reset control', async () => {
    await mount();
    await click(right());
    expect(counts()).toEqual([1, 1, 1, 1]);
    await click(button('Practice this question'));
    await click(button('Start new attempt'));
    expect(counts()).toEqual([0, 0, 0, 0]);
    expect(latest.quizFirstAttempts).toEqual({});
    expect(latest.quizPracticeKey).toBeNull();
    expect(answerButtons().every(element => !element.disabled)).toBe(true);
    await click(right());
    expect(counts()).toEqual([1, 1, 1, 1]);
  });

  it('retains the first click when multiple answer events arrive before React renders', async () => {
    await mount();
    const correct = right(), incorrect = wrong(), keyIndex = rightIndex();
    await act(async () => { correct.click(); incorrect.click(); });
    expect(counts()).toEqual([1, 1, 1, 1]);
    expect(Object.values(latest.quizFirstAttempts)).toHaveLength(1);
    expect(Object.values(latest.quizFirstAttempts)[0].correct).toBe(true);
    expect(answerButtons()[keyIndex].getAttribute('aria-pressed')).toBe('true');
  });

  it('uses saved question records after remount and ignores stale aggregate counters', async () => {
    await mount();
    const keyIndex = rightIndex();
    await click(right());
    const saved = structuredClone(latest);
    act(() => root.unmount());
    root = ReactDOMClient.createRoot(host);
    await mount({ ...saved, quizPicked: null, quizScore: 99, quizTotal: 100 });
    expect(answerButtons()[keyIndex].getAttribute('aria-pressed')).toBe('true');
    expect(host.textContent).not.toContain('99 / 100');
    await click(button('Next'));
    expect(counts()).toEqual([1, 1, 1, 1]);
    await click(button('Previous'));
    expect(answerButtons().every(element => !element.disabled && element.getAttribute('aria-disabled') === 'true')).toBe(true);
    expect(Object.keys(latest.quizFirstAttempts)[0]).toContain(host.querySelector('h3').textContent);
  });

  it('migrates a recoverable legacy response and preserves aggregate history separately', async () => {
    await mount({ quizIdx: '0', quizPicked: '0', quizScore: '9', quizTotal: '12' });
    expect(right().getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('[data-quiz-legacy-summary]').textContent).toContain('9/12');
    await click(button('Next'));
    expect(counts()).toEqual([1, 1, 1, 1]);
    expect(latest.quizLegacySummary).toEqual({ score: 9, total: 12 });
    await click(button('Previous'));
    expect(right().disabled).toBe(false);
    expect(right().getAttribute('aria-disabled')).toBe('true');
    await click(button('Start new attempt'));
    expect(latest.quizLegacySummary).toBeNull();
    expect(host.querySelector('[data-quiz-legacy-summary]')).toBeNull();
  });

  it('handles legacy totals with no recoverable response and malformed saved selections', async () => {
    await mount({ quizIdx: 'invalid', quizPicked: 99, quizScore: 5, quizTotal: 7 });
    expect(answerButtons().every(element => !element.disabled)).toBe(true);
    await click(right());
    expect(counts()).toEqual([1, 1, 1, 1]);
    expect(latest.quizLegacySummary).toEqual({ score: 5, total: 7 });
    await act(async () => { updateSaved({ quizIdx: -1, quizPracticeKey: null }); });
    expect(answerButtons()).toHaveLength(4);
  });
});
