import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host, root, tool, api, latest, patch;
const choices = () => [...host.querySelectorAll('button[aria-label^="Answer "]')];
const button = label => [...host.querySelectorAll('button')].find(node => node.textContent === label);
const action = name => host.querySelector(`[data-quiz-review-action="${name}"]`);
const key = index => api.flightQuizQuestionKey(api.getQuizDeck()[index]);
const response = (index, correct = true, order = index) => {
  const question = api.getQuizDeck()[index];
  return { choice: correct ? question.correct : question.options.find(choice => choice !== question.correct), correct, order };
};
const correctChoice = index => choices()[api.getQuizDeck()[index].options.indexOf(api.getQuizDeck()[index].correct)];
async function mount(seed = {}) {
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'quiz', ...seed } });
    latest = data.flightSim;
    patch = values => setData(old => ({ ...old, flightSim: { ...old.flightSim, ...values } }));
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, name, value) => setData(old => ({ ...old, [id]: { ...old[id], [name]: value } })),
      updateMulti: (id, values) => setData(old => ({ ...old, [id]: { ...old[id], ...values } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}
async function click(node) { expect(node).toBeTruthy(); await act(async () => node.click()); }
beforeEach(() => {
  vi.useFakeTimers();
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  api = window.__RR_TEST_EXPORTS__.flightSim;
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null; host?.remove();
  delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks(); vi.useRealTimers();
});

describe('Sky School live quiz transitions', () => {
  it('keeps an answer when Next arrives before React renders', async () => {
    await mount();
    await act(async () => { correctChoice(0).click(); button('Next ▶').click(); });
    expect(latest.quizFirstAttempts).toEqual({ [key(0)]: response(0, true, 0) });
    expect([latest.quizScore, latest.quizTotal, latest.quizIdx]).toEqual([1, 1, 1]);
  });

  it('keeps an answer when Previous arrives before React renders', async () => {
    await mount({ quizIdx: 1 });
    await act(async () => { correctChoice(1).click(); button('◀ Previous').click(); });
    expect(latest.quizFirstAttempts).toEqual({ [key(1)]: response(1, true, 0) });
    expect([latest.quizScore, latest.quizTotal, latest.quizIdx]).toEqual([1, 1, 0]);
  });

  it('keeps an answer when Random arrives before React renders', async () => {
    await mount(); vi.spyOn(Math, 'random').mockReturnValue(.5);
    await act(async () => { correctChoice(0).click(); button('🎲 Random').click(); });
    expect(latest.quizFirstAttempts).toEqual({ [key(0)]: response(0, true, 0) });
    expect([latest.quizScore, latest.quizTotal, latest.quizIdx]).toEqual([1, 1, 25]);
  });

  it('builds the unanswered queue from the answer recorded in the same tick', async () => {
    const deck = api.getQuizDeck();
    const saved = Object.fromEntries(deck.map((question, index) => [key(index), response(index)]));
    delete saved[key(0)]; delete saved[key(1)];
    await mount({ quizIdx: 1, quizFirstAttempts: saved });
    await act(async () => { correctChoice(1).click(); action('unanswered').click(); });
    expect(latest.quizIdx).toBe(0);
    expect(latest.quizFirstAttempts[key(1)]).toEqual(response(1, true, 50));
    expect(latest.quizTotal).toBe(49);
  });

  it('keeps a new wrong answer when entering missed-question practice in the same tick', async () => {
    await mount({ quizIdx: 1, quizFirstAttempts: { [key(0)]: response(0, false, 0) } });
    const wrong = choices().find(choice => !choice.textContent.includes(api.getQuizDeck()[1].correct));
    await act(async () => { wrong.click(); action('missed').click(); });
    expect(latest.quizFirstAttempts[key(1)].correct).toBe(false);
    expect([latest.quizScore, latest.quizTotal]).toEqual([0, 2]);
    expect(latest.quizPracticeKey).toBe(key(0));
  });

  it('does not grade an old answer event after navigating to another question', async () => {
    await mount(); const answer = correctChoice(0);
    await act(async () => { button('Next ▶').click(); answer.click(); });
    expect(latest.quizIdx).toBe(1);
    expect(latest.quizFirstAttempts).toEqual({});
    expect([latest.quizScore, latest.quizTotal]).toEqual([0, 0]);
  });

  it('does not resurrect the old attempt from a stale answer after reset', async () => {
    await mount({ quizFirstAttempts: { [key(1)]: response(1) } });
    const answer = correctChoice(0);
    await act(async () => { button('Start new attempt').click(); answer.click(); });
    expect(latest.quizFirstAttempts).toEqual({});
    expect([latest.quizScore, latest.quizTotal]).toEqual([0, 0]);
    expect(latest.quizAttemptHistory).toHaveLength(1);
    expect(api.flightQuizJournalState(api.getQuizDeck(), latest.quizAttemptHistory)[0].answered).toBe(1);
  });

  it('treats a live empty response map after reset as authoritative for stale navigation', async () => {
    await mount({ quizIdx: 1, quizFirstAttempts: { [key(0)]: response(0) } });
    const next = button('Next ▶');
    await act(async () => { button('Start new attempt').click(); next.click(); });
    expect(latest.quizFirstAttempts).toEqual({});
    expect([latest.quizScore, latest.quizTotal, latest.quizIdx]).toEqual([0, 0, 0]);
  });

  it('preserves original first responses when a practice answer and navigation arrive together', async () => {
    const saved = { [key(0)]: response(0, false) };
    await mount({ quizFirstAttempts: saved, quizPracticeKey: key(0), quizPracticePicked: null });
    await act(async () => { correctChoice(0).click(); button('Next ▶').click(); });
    expect(latest.quizFirstAttempts).toEqual(saved);
    expect([latest.quizScore, latest.quizTotal, latest.quizIdx]).toEqual([0, 1, 1]);
    expect(latest.quizPracticeKey).toBeNull();
  });

  it('rejects a stale practice answer after reset rather than applying it to the new attempt', async () => {
    await mount({ quizFirstAttempts: { [key(0)]: response(0, false) }, quizPracticeKey: key(0), quizPracticePicked: null });
    const answer = correctChoice(0);
    await act(async () => { button('Start new attempt').click(); answer.click(); });
    expect(latest.quizFirstAttempts).toEqual({});
    expect(latest.quizPracticePicked).toBeNull();
    expect([latest.quizScore, latest.quizTotal]).toEqual([0, 0]);
  });

  it.each([-1, 99, 'not-an-option'])('recovers an invalid saved practice selection %s without changing the first response', async quizPracticePicked => {
    const saved = { [key(0)]: response(0, false) };
    await mount({ quizFirstAttempts: saved, quizPracticeKey: key(0), quizPracticePicked, quizScore: 0, quizTotal: 1 });
    expect(choices().every(choice => !choice.disabled)).toBe(true);
    await click(correctChoice(0));
    expect(latest.quizPracticePicked).toBe(0);
    expect(latest.quizFirstAttempts).toEqual(saved);
    expect([latest.quizScore, latest.quizTotal]).toEqual([0, 1]);
    expect(host.textContent).toContain('✓ Correct!');
  });

  it('rejects stale practice actions after reset instead of restoring the archived response', async () => {
    await mount({ quizFirstAttempts: { [key(0)]: response(0, false) } });
    const practice = button('Practice this question');
    await act(async () => { button('Start new attempt').click(); practice.click(); });
    expect(latest.quizFirstAttempts).toEqual({});
    expect(latest.quizPracticeKey).toBeNull();
    expect([latest.quizScore, latest.quizTotal]).toEqual([0, 0]);
  });

  it('does not record an old answer after leaving the quiz in the same tick', async () => {
    await mount(); const answer = correctChoice(0);
    await act(async () => { button('← Menu').click(); answer.click(); });
    expect(latest.view).toBe('menu');
    expect(latest.quizFirstAttempts).toBeUndefined();
    expect(latest.quizTotal).toBeUndefined();
  });

  it('does not let queued practice focus override a control outside the quiz', async () => {
    await mount({ quizFirstAttempts: { [key(0)]: response(0, false) } });
    const outside = document.createElement('button'); document.body.appendChild(outside);
    try {
      await click(button('Practice this question'));
      await act(async () => { patch({ view: 'menu' }); });
      outside.focus();
      await act(async () => vi.runOnlyPendingTimers());
      expect(document.activeElement).toBe(outside);
    } finally { outside.remove(); }
  });

  it('keeps a deliberate later focus change even while the quiz view stays open', async () => {
    await mount({ quizFirstAttempts: { [key(0)]: response(0, false) } });
    const outside = document.createElement('button'); document.body.appendChild(outside);
    try {
      await click(button('Practice this question'));
      outside.focus();
      await act(async () => vi.runOnlyPendingTimers());
      expect(latest.view).toBe('quiz');
      expect(document.activeElement).toBe(outside);
    } finally { outside.remove(); }
  });

  it('returns focus to the question when Random selects the same question', async () => {
    await mount(); vi.spyOn(Math, 'random').mockReturnValue(0);
    const random = button('🎲 Random'); random.focus();
    await click(random);
    await act(async () => vi.runOnlyPendingTimers());
    expect(latest.quizIdx).toBe(0);
    expect(document.activeElement).toBe(host.querySelector('#skyschool-quiz-question'));
  });

  it('does not restore queued focus after leaving and returning to another quiz question', async () => {
    await mount({ quizFirstAttempts: { [key(0)]: response(0, false) } });
    await click(button('Practice this question'));
    await click(button('← Menu'));
    await act(async () => patch({ view: 'quiz', quizIdx: 1 }));
    const answer = choices()[0]; answer.focus();
    await act(async () => vi.runOnlyPendingTimers());
    expect(document.activeElement).toBe(answer);
  });
});
