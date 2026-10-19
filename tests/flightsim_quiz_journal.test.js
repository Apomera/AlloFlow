import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host, root, tool, FS, latest;
const choices = () => [...host.querySelectorAll('button[aria-label^="Answer "]')];
const button = text => [...host.querySelectorAll('button')].find(element => element.textContent === text);
const history = () => [...host.querySelectorAll('[data-quiz-history-entry]')];
const first = (index, correct = true, order = index) => {
  const question = FS.getQuizDeck()[index];
  return { [FS.flightQuizQuestionKey(question)]: { choice: correct ? question.correct : question.options.find(choice => choice !== question.correct), order } };
};
const archive = (attempts = first(0), sequence = 1, deck = FS.getQuizDeck()) => FS.flightQuizArchiveAttempt(deck, attempts, new Date().toISOString(), `quiz-${Date.now()}-${sequence}`);
async function click(element) {
  expect(element).toBeTruthy();
  await act(async () => { element.click(); });
}
async function mount(seed = {}) {
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'quiz', ...seed } });
    latest = data.flightSim;
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, key, value) => setData(previous => ({ ...previous, [id]: { ...previous[id], [key]: value } })),
      updateMulti: (id, patch) => setData(previous => ({ ...previous, [id]: { ...previous[id], ...patch } })),
    }));
  }
  await act(async () => { root.render(React.createElement(App)); });
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-18T20:00:00.000Z'));
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

describe('Sky School earlier quiz attempt journal', () => {
  it('explains empty history without creating an empty archive on reset', async () => {
    await mount();
    expect(host.querySelector('[data-quiz-history]').textContent).toContain('No earlier quiz attempts');
    await click(button('Start new attempt'));
    expect(latest.quizAttemptHistory).toEqual([]);
    expect(history()).toHaveLength(0);
  });

  it('archives original first responses and partial counts instead of later practice success', async () => {
    await mount();
    await click(choices()[1]); // First question's correct choice is A.
    const wrong = FS.getQuizDeck()[0].options[1];
    await click(button('Practice this question'));
    await click(choices()[0]);
    await click(button('Next ▶'));
    await click(choices()[1]); // Second question's correct choice is B.
    await click(button('Start new attempt'));
    expect([latest.quizScore, latest.quizTotal]).toEqual([0, 0]);
    expect(latest.quizFirstAttempts).toEqual({});
    expect(history()).toHaveLength(1);
    expect(history()[0].querySelector('summary').textContent).toContain('1/2 first responses correct');
    expect(history()[0].querySelector('[data-quiz-history-progress]').textContent).toBe('2 of 50 questions recorded · 48 unanswered');
    const records = history()[0].querySelectorAll('[data-quiz-history-response]');
    expect(records).toHaveLength(2);
    expect(records[0].textContent).toContain(`First response: ${wrong}`);
    expect(records[0].textContent).toContain(`Correct answer: ${FS.getQuizDeck()[0].correct}`);
    expect(records[0].textContent).toContain(FS.getQuizDeck()[0].explanation);
    expect(history()[0].querySelector('time').dateTime).toBe('2026-10-18T20:00:00.000Z');
    expect(choices().every(choice => !choice.disabled)).toBe(true);
    await act(async () => { vi.runOnlyPendingTimers(); });
    expect(document.activeElement).toBe(host.querySelector('#skyschool-quiz-question'));
  });

  it('keeps the active question, score, and unfinished practice unchanged when earlier attempts are opened', async () => {
    const previous = FS.flightQuizJournalRecord(archive(first(0, false)));
    const current = first(2, false);
    const key = FS.flightQuizQuestionKey(FS.getQuizDeck()[2]);
    await mount({ quizIdx: 2, quizFirstAttempts: current, quizPracticeKey: key, quizPracticePicked: null, quizAttemptHistory: [previous] });
    const before = structuredClone(latest);
    await click(history()[0].querySelector('summary'));
    expect(history()[0].open).toBe(true);
    expect(latest).toEqual(before);
    expect(host.querySelector('#skyschool-quiz-question').textContent).toBe(FS.getQuizDeck()[2].question);
    expect(choices().every(choice => !choice.disabled)).toBe(true);
    expect(host.querySelector('[data-quiz-practice]')).toBeTruthy();
    expect(history()[0].querySelectorAll('button,input,textarea,select')).toHaveLength(0);
  });

  it('restores saved history after remount while continuing the current attempt', async () => {
    await mount({ quizFirstAttempts: first(0, false) });
    await click(button('Start new attempt'));
    await click(choices()[0]);
    await click(button('Next ▶'));
    const saved = structuredClone(latest);
    await act(async () => { root.unmount(); });
    root = ReactDOMClient.createRoot(host);
    await mount(saved);
    expect(history()).toHaveLength(1);
    expect(history()[0].querySelector('summary').textContent).toContain('0/1 first responses correct');
    expect([latest.quizScore, latest.quizTotal, latest.quizIdx]).toEqual([1, 1, 1]);
    expect(choices().every(choice => !choice.disabled)).toBe(true);
  });

  it('keeps only the four newest nonempty attempts even at the same timestamp', async () => {
    await mount();
    for (let attempt = 0; attempt < 6; attempt++) {
      await click(choices()[attempt % 2]);
      await click(button('Start new attempt'));
    }
    expect(latest.quizAttemptHistory).toHaveLength(4);
    expect(latest.quizAttemptHistory.map(item => item.id)).toEqual([6, 5, 4, 3].map(sequence => `quiz-${Date.now()}-${sequence}`));
    expect(new Set(latest.quizAttemptHistory.map(item => item.id)).size).toBe(4);
    expect(history()).toHaveLength(4);
  });

  it('does not duplicate or replace the archive when reset fires twice before React renders', async () => {
    await mount({ quizFirstAttempts: first(0, false) });
    const reset = button('Start new attempt');
    await act(async () => { reset.click(); reset.click(); });
    expect(latest.quizAttemptHistory).toHaveLength(1);
    expect(latest.quizAttemptSequence).toBe(1);
    expect(latest.quizFirstAttempts).toEqual({});
    await click(button('Start new attempt'));
    expect(latest.quizAttemptHistory).toHaveLength(1);
    expect(latest.quizAttemptSequence).toBe(1);
  });

  it('recovers archive sequence from saved history when the active counter is missing', async () => {
    const previous = FS.flightQuizJournalRecord(archive(first(0, false), 5));
    await mount({ quizAttemptHistory: [previous], quizFirstAttempts: first(0, true) });
    await click(button('Start new attempt'));
    expect(latest.quizAttemptHistory).toHaveLength(2);
    expect(latest.quizAttemptSequence).toBe(6);
    expect(history()).toHaveLength(2);
    expect(history()[0].querySelector('summary').textContent).toContain('1/1');
    expect(history()[1].querySelector('summary').textContent).toContain('0/1');
  });

  it('archives a response that arrived in the same tick as reset', async () => {
    await mount();
    const reset = button('Start new attempt'), answer = choices()[0];
    await act(async () => { answer.click(); reset.click(); });
    const saved = FS.flightQuizJournalState(FS.getQuizDeck(), latest.quizAttemptHistory);
    expect(saved).toHaveLength(1);
    expect([saved[0].score, saved[0].answered]).toEqual([1, 1]);
    expect([latest.quizScore, latest.quizTotal]).toEqual([0, 0]);
  });

  it('archives only a recoverable legacy response without presenting old aggregate totals as evidence', async () => {
    await mount({ quizPicked: 0, quizScore: 99, quizTotal: 100 });
    await click(button('Start new attempt'));
    expect(history()[0].querySelector('summary').textContent).toContain('1/1 first responses correct');
    expect(history()[0].querySelector('[data-quiz-history-progress]').textContent).toContain('1 of 50');
    expect(latest.quizLegacySummary).toBeNull();
  });

  it('does not archive aggregate-only legacy history or invalid saved current responses', async () => {
    await mount({ quizPicked: 99, quizScore: 99, quizTotal: 100, quizFirstAttempts: { removed: { choice: 'old', correct: true } } });
    await click(button('Start new attempt'));
    expect(latest.quizAttemptHistory).toEqual([]);
  });

  it('discloses removed content and unknown dates without showing untrusted saved question or explanation text', async () => {
    const valid = FS.flightQuizJournalRecord(archive(first(0)));
    const removedKey = '["removed content"]';
    valid.questionKeys.push(removedKey);
    valid.responses[removedKey] = { choice: '<script>untrusted</script>', correct: true, order: 1 };
    valid.savedAt = 'untrusted date';
    valid.score = 999;
    valid.explanation = 'A forged explanation';
    await mount({ quizAttemptHistory: [valid] });
    expect(history()[0].querySelector('summary').textContent).toContain('Saved Not recorded · 1/1');
    expect(history()[0].querySelector('[data-quiz-history-progress]').textContent).toBe('1 of 51 questions recorded · 49 unanswered');
    expect(history()[0].querySelector('[data-quiz-history-changed]').textContent).toContain('1 saved questions no longer match');
    expect(history()[0].textContent).not.toContain('untrusted');
    expect(history()[0].textContent).not.toContain('forged explanation');
    expect(history()[0].querySelector('time')).toBeNull();
  });
});

describe('Sky School bounded quiz journal evidence', () => {
  it('ignores saved scores and correctness flags and rebuilds feedback from current matching content', () => {
    const saved = FS.flightQuizJournalRecord(archive({ ...first(0, false), ...first(1, true) }));
    Object.values(saved.responses).forEach(response => { response.correct = !response.correct; });
    const result = FS.flightQuizJournalState(FS.getQuizDeck(), [{ ...saved, score: 999, answered: 999, total: 999, entries: [{ question: 'forged' }] }])[0];
    expect([result.score, result.answered, result.total, result.unanswered]).toEqual([1, 2, 50, 48]);
    expect(result.entries.map(entry => entry.correct)).toEqual([false, true]);
    expect(result.entries[0].question.question).toBe(FS.getQuizDeck()[0].question);
  });

  it('keeps content identity across option and deck reordering without relying on saved indices', () => {
    const deck = FS.getQuizDeck();
    const saved = FS.flightQuizJournalRecord(archive({ ...first(0), ...first(1, false) }));
    const reordered = deck.slice().reverse().map(question => ({ ...question, options: question.options.slice().reverse() }));
    const result = FS.flightQuizJournalState(reordered, [saved])[0];
    expect([result.score, result.answered, result.unavailable]).toEqual([1, 2, 0]);
    expect(result.entries.map(entry => entry.number)).toEqual([1, 2]);
    expect(result.entries[0].question.question).toBe(deck[0].question);
  });

  it('drops changed wording and answers even if a question keeps the same stable ID', () => {
    const deck = [
      { id: 'one', question: 'Original?', correct: 'A', options: ['A', 'B'], explanation: 'Original explanation' },
      { id: 'two', question: 'Unchanged?', correct: 'B', options: ['A', 'B'], explanation: 'Still valid' },
    ];
    const attempts = Object.fromEntries(deck.map((question, order) => [FS.flightQuizQuestionKey(question), { choice: question.correct, order }]));
    const saved = FS.flightQuizJournalRecord(archive(attempts, 1, deck));
    const changed = [{ ...deck[0], question: 'Revised?' }, deck[1]];
    const result = FS.flightQuizJournalState(changed, [saved])[0];
    expect([result.score, result.answered, result.total, result.unanswered, result.unavailable]).toEqual([1, 1, 2, 0, 1]);
    expect(result.entries[0].question.id).toBe('two');
    const allChanged = FS.flightQuizJournalState([{ ...deck[0], correct: 'B' }], [saved])[0];
    expect([allChanged.score, allChanged.answered, allChanged.total, allChanged.unanswered, allChanged.unavailable]).toEqual([0, 0, 2, 0, 2]);
    const restored = FS.flightQuizJournalState([{ ...deck[0], correct: 'B' }], [FS.flightQuizJournalRecord(allChanged)])[0];
    expect(restored.responses).toEqual(allChanged.responses);
    expect(restored.entries).toEqual([]);
  });

  it('bounds archive count, source scanning, question keys and duplicate identities', () => {
    const saved = FS.flightQuizJournalRecord(archive());
    const records = Array.from({ length: 30 }, (_, index) => ({ ...saved, id: `quiz-${Date.now()}-${index + 1}` }));
    expect(FS.flightQuizJournalState(FS.getQuizDeck(), records)).toHaveLength(4);
    expect(FS.flightQuizJournalState(FS.getQuizDeck(), [saved, saved])).toHaveLength(1);
    expect(FS.flightQuizJournalState(FS.getQuizDeck(), [...Array(16).fill(null), saved])).toEqual([]);
    saved.questionKeys = [...saved.questionKeys, saved.questionKeys[0], '[oversized' + 'x'.repeat(5000), ...Array.from({ length: 200 }, (_, index) => `["unknown-${index}"]`)];
    const result = FS.flightQuizJournalState(FS.getQuizDeck(), [saved])[0];
    expect(result.total).toBeLessThanOrEqual(100);
    expect(new Set(result.questionKeys).size).toBe(result.total);
    expect(result.questionKeys.every(key => key.length <= 4096)).toBe(true);
  });

  it('rejects malformed records and invalid response choices without mutating source data', () => {
    const saved = FS.flightQuizJournalRecord(archive({ ...first(0), ...first(1) }));
    saved.responses[FS.flightQuizContentKey(FS.getQuizDeck()[1])] = { choice: 'Removed option', correct: true };
    const before = structuredClone(saved);
    const result = FS.flightQuizJournalState(FS.getQuizDeck(), [null, false, 'bad', [], { ...saved, id: 'bad' }, { ...saved, version: 99 }, saved]);
    expect(result).toHaveLength(1);
    expect(result[0].answered).toBe(1);
    expect(result[0].unanswered).toBe(49);
    expect(saved).toEqual(before);
    expect(FS.flightQuizJournalState(FS.getQuizDeck(), { 0: saved })).toEqual([]);
    expect(FS.flightQuizArchiveAttempt(FS.getQuizDeck(), {}, new Date().toISOString(), `quiz-${Date.now()}-1`)).toBeNull();
  });

  it('uses unknown dates for forged, invalid and future timestamps while retaining valid responses', () => {
    const saved = FS.flightQuizJournalRecord(archive());
    const unknown = ['2026-10-18T99:00:00.000Z', '2026-10-19T20:00:00.000Z', '1999-10-18T20:00:00.000Z', Date.now(), null];
    unknown.forEach(savedAt => {
      const result = FS.flightQuizJournalState(FS.getQuizDeck(), [{ ...saved, savedAt }])[0];
      expect(result.savedAt).toBeNull();
      expect(result.answered).toBe(1);
    });
    expect(FS.flightQuizJournalState(FS.getQuizDeck(), [saved])[0].savedAt).toBe('2026-10-18T20:00:00.000Z');
  });
});
