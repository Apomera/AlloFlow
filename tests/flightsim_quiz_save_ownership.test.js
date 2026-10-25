import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, root, host, latest, latestRoot, externalPatch, poke, pending, replayChecks, errors, xp, toasts;
const copy = value => JSON.parse(JSON.stringify(value));
const deck = () => api.getQuizDeck();
const key = index => api.flightQuizQuestionKey(deck()[index]);
const response = (index, correct = true, order = index) => ({
  choice: correct ? deck()[index].correct : deck()[index].options.find(option => option !== deck()[index].correct), correct, order,
});
const choices = () => [...host.querySelectorAll('button[aria-label^="Answer "]')];
const button = label => [...host.querySelectorAll('button')].find(node => node.textContent === label);
const correctChoice = (index = 0) => choices()[deck()[index].options.indexOf(deck()[index].correct)];
function handler(node) {
  expect(node).toBeTruthy();
  return node[Object.keys(node).find(name => name.startsWith('__reactProps$'))].onClick;
}
const capture = action => handler(action === 'answer' ? correctChoice() : button(action === 'next' ? 'Next ▶' : 'Start new attempt'));
async function click(node) { expect(node).toBeTruthy(); await act(async () => node.click()); }
async function patch(values) { await act(async () => externalPatch(values)); }
async function commit(count = 1) {
  expect(pending.length).toBeGreaterThanOrEqual(count);
  const batch = pending.splice(0, count);
  await act(async () => batch.forEach(apply => apply()));
}
async function flush() {
  for (let count = 0; pending.length; count++) { expect(count).toBeLessThan(30); await commit(); }
}
function archive(id = 'quiz-1792497600000-40', index = 3) {
  return api.flightQuizJournalRecord(api.flightQuizArchiveAttempt(deck(), { [key(index)]: response(index, false, 0) },
    '2026-10-20T12:00:00.000Z', id));
}
async function mount(seed = {}, options = {}) {
  if (root) await act(async () => root.unmount()); host?.remove();
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  pending = [];
  function App() {
    const [data, setData] = React.useState({ otherTool: { writing: 'Preserve unrelated work.' }, flightSim: {
      view: 'quiz', quizIdx: 0, quizAttemptSequence: 5, quizFirstAttempts: { [key(2)]: response(2, true, 0) },
      quizScore: 1, quizTotal: 1, quizStreak: 1, quizBest: 1, quizAttemptHistory: [], teacherMarker: 'original', ...seed,
    } });
    const [, renderLocal] = React.useState(0);
    latestRoot = data; latest = data.flightSim; poke = () => renderLocal(value => value + 1);
    externalPatch = values => setData(old => ({ ...old, flightSim: { ...old.flightSim, ...values } }));
    const submit = update => {
      const apply = () => setData(previous => {
        if (typeof update !== 'function') return update;
        const before = JSON.stringify(previous), first = update(previous), second = update(previous);
        replayChecks.push({ immutable: before === JSON.stringify(previous), stable: JSON.stringify(first) === JSON.stringify(second) });
        if (options.cloneAtCommit && second !== previous) return { ...second, flightSim: copy(second.flightSim) };
        return second;
      });
      if (options.delayed) pending.push(apply); else apply();
    };
    return tool.render(makeCtx({ toolData: data, setToolData: options.legacyHost ? undefined : submit, awardXP: xp, addToast: toasts,
      update: (id, name, value) => submit(old => ({ ...old, [id]: { ...old[id], [name]: value } })),
      updateMulti: (id, values) => submit(old => ({ ...old, [id]: { ...old[id], ...values } })),
    }));
  }
  await act(async () => root.render(options.strict ? React.createElement(React.StrictMode, null, React.createElement(App)) : React.createElement(App)));
}
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-23T12:00:00.000Z'));
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); api = window.__RR_TEST_EXPORTS__.flightSim;
  replayChecks = []; errors = vi.spyOn(console, 'error').mockImplementation(() => {}); xp = vi.fn(); toasts = vi.fn();
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  expect(errors).not.toHaveBeenCalled(); expect(xp).not.toHaveBeenCalled();
  expect(replayChecks.every(item => item.immutable && item.stable)).toBe(true);
  delete window.__RR_TEST_EXPORTS__; vi.restoreAllMocks(); vi.useRealTimers();
});

describe('Sky School quiz save ownership', () => {
  it.each(['answer', 'next', 'reset'].flatMap(action => ['committed', 'pending'].map(timing => [action, timing])))
    ('rejects a retained %s after a %s replacement with a new attempt sequence', async (action, timing) => {
      await mount(); const run = capture(action);
      const replacement = { quizAttemptSequence: 6, quizFirstAttempts: {}, quizScore: 0, quizTotal: 0,
        quizStreak: 0, quizBest: 0, teacherMarker: 'new attempt' };
      if (timing === 'committed') { await patch(replacement); await act(async () => run()); }
      else await act(async () => { externalPatch(replacement); run(); });
      expect(latest).toMatchObject(replacement); expect(latest.quizIdx).toBe(0); expect(latest.quizAttemptHistory).toEqual([]);
    });

  it.each(['answer', 'next', 'reset'].flatMap(action => ['committed', 'pending'].map(timing => [action, timing])))
    ('rejects a retained %s after a %s response replacement with the same attempt sequence', async (action, timing) => {
      await mount(); const run = capture(action);
      const replacement = { quizFirstAttempts: { [key(2)]: response(2, false, 0), [key(3)]: response(3, true, 1) },
        quizScore: 1, quizTotal: 2, quizStreak: 1, quizBest: 1, teacherMarker: 'corrected same-sequence evidence' };
      if (timing === 'committed') { await patch(replacement); await act(async () => run()); }
      else await act(async () => { externalPatch(replacement); run(); });
      expect(latest).toMatchObject(replacement); expect(latest.quizIdx).toBe(0); expect(latest.quizAttemptSequence).toBe(5);
      expect(latest.quizAttemptHistory).toEqual([]);
    });

  it.each(['answer', 'next', 'reset'].flatMap(action => ['responses', 'sequence', 'view', 'A to B to A'].map(change => [action, change])))
    ('rejects an accepted delayed %s after an authoritative %s change', async (action, change) => {
      await mount({}, { delayed: true, strict: true }); const original = copy(latest);
      await act(async () => capture(action)()); expect(pending).toHaveLength(1);
      if (change === 'responses') await patch({ quizFirstAttempts: { [key(3)]: response(3, false) } });
      else if (change === 'sequence') await patch({ quizAttemptSequence: 6, quizFirstAttempts: {} });
      else if (change === 'view') await patch({ view: 'menu' });
      else { await patch({ quizFirstAttempts: { [key(3)]: response(3, false) } }); await patch(original); }
      const before = copy(latest); await flush(); expect(latest).toEqual(before);
    });

  it.each(['answer', 'next', 'reset'])('retires the old %s callback across a committed quiz to Menu to quiz visit', async action => {
    await mount(); const old = capture(action);
    await patch({ view: 'menu' }); await patch({ view: 'quiz' });
    const before = copy(latest); await act(async () => old()); expect(latest).toEqual(before);
    await act(async () => capture(action)());
    if (action === 'answer') expect(latest.quizFirstAttempts[key(0)]).toEqual(response(0, true, 1));
    else if (action === 'next') expect(latest.quizIdx).toBe(1);
    else expect(latest.quizFirstAttempts).toEqual({});
  });

  it('keeps an accepted delayed answer through a local rerender and actual host metadata changes', async () => {
    await mount({}, { delayed: true, strict: true, cloneAtCommit: true });
    await click(correctChoice()); await act(async () => poke());
    await patch({ teacherMarker: 'updated metadata', quizFirstAttempts: copy(latest.quizFirstAttempts) });
    await flush();
    expect(latest.quizFirstAttempts).toEqual({ [key(0)]: response(0, true, 1), [key(2)]: response(2, true, 0) });
    expect([latest.quizScore, latest.quizTotal, latest.quizStreak, latest.quizBest]).toEqual([2, 2, 2, 2]);
    expect(latest.teacherMarker).toBe('updated metadata'); expect(latestRoot.otherTool).toEqual({ writing: 'Preserve unrelated work.' });
  });

  it.each([false, true])('preserves answer then Next through local renders and separately acknowledged prefixes; clone commits: %s', async cloneAtCommit => {
    await mount({}, { delayed: true, strict: true, cloneAtCommit });
    const answer = capture('answer'), next = capture('next');
    await act(async () => { answer(); next(); }); expect(pending).toHaveLength(2);
    await act(async () => poke()); await commit();
    expect(latest.quizFirstAttempts[key(0)]).toEqual(response(0, true, 1)); expect(latest.quizIdx).toBe(0);
    await act(async () => poke()); await flush();
    expect(latest.quizIdx).toBe(1); expect(latest.quizFirstAttempts[key(0)]).toEqual(response(0, true, 1));
    expect([latest.quizScore, latest.quizTotal]).toEqual([2, 2]);
  });

  it('preserves a pending answer when Next is requested after an unrelated local render', async () => {
    await mount({}, { delayed: true, strict: true }); await click(correctChoice());
    await act(async () => poke()); await click(button('Next ▶')); await flush();
    expect(latest.quizIdx).toBe(1); expect(latest.quizFirstAttempts[key(0)]).toEqual(response(0, true, 1));
    expect([latest.quizScore, latest.quizTotal]).toEqual([2, 2]);
  });

  it('archives a delayed answer before reset without duplicating the archive under updater replay', async () => {
    await mount({}, { delayed: true, strict: true, cloneAtCommit: true });
    const answer = capture('answer'), reset = capture('reset');
    await act(async () => { answer(); reset(); }); await act(async () => poke()); await commit();
    expect(latest.quizFirstAttempts[key(0)]).toEqual(response(0, true, 1));
    await act(async () => poke()); await flush();
    expect(latest.quizFirstAttempts).toEqual({}); expect([latest.quizScore, latest.quizTotal, latest.quizIdx]).toEqual([0, 0, 0]);
    const history = api.flightQuizJournalState(deck(), latest.quizAttemptHistory);
    expect(history).toHaveLength(1); expect(history[0].answered).toBe(2); expect(history[0].score).toBe(2);
    expect(latest.quizAttemptSequence).toBe(6);
  });

  it('preserves unrelated archive additions while an accepted answer is waiting for the host', async () => {
    await mount({}, { delayed: true }); await click(correctChoice()); const added = archive();
    await patch({ quizAttemptHistory: [added], teacherMarker: 'new journal entry' }); await flush();
    expect(latest.quizAttemptHistory).toEqual([added]); expect(latest.teacherMarker).toBe('new journal entry');
    expect(latest.quizFirstAttempts[key(0)]).toEqual(response(0, true, 1));
  });

  it('merges archive additions and recovers their newer sequence when an accepted reset reaches the host', async () => {
    await mount({}, { delayed: true, strict: true }); await click(button('Start new attempt'));
    const added = archive(); await patch({ quizAttemptHistory: [added], teacherMarker: 'new journal entry' });
    vi.setSystemTime(new Date('2026-10-23T12:10:00.000Z')); await flush();
    expect(latest.quizFirstAttempts).toEqual({}); expect(latest.quizAttemptHistory).toHaveLength(2);
    expect(latest.quizAttemptHistory[1]).toEqual(added); expect(latest.quizAttemptSequence).toBe(41);
    const history = api.flightQuizJournalState(deck(), latest.quizAttemptHistory);
    expect(history[0].answered).toBe(1); expect(history[0].id).toMatch(/-41$/);
    expect(history[0].savedAt).toBe('2026-10-23T12:00:00.000Z'); expect(latest.teacherMarker).toBe('new journal entry');
  });

  it('does not accept a retained practice choice after same-sequence first-response replacement', async () => {
    await mount({ quizFirstAttempts: { [key(0)]: response(0, false, 0) }, quizPracticeKey: key(0), quizPracticePicked: null });
    const old = handler(correctChoice()); const replacement = { [key(0)]: response(0, true, 0) };
    await patch({ quizFirstAttempts: replacement }); await act(async () => old());
    expect(latest.quizFirstAttempts).toEqual(replacement); expect(latest.quizPracticePicked).toBeNull();
    await click(correctChoice()); expect(latest.quizPracticePicked).toBe(deck()[0].options.indexOf(deck()[0].correct));
  });

  it('retains the timestamp of an archive added more than five minutes after a pending reset was requested', async () => {
    await mount({}, { delayed: true, strict: true }); await click(button('Start new attempt'));
    vi.setSystemTime(new Date('2026-10-23T12:10:00.000Z'));
    const added = api.flightQuizJournalRecord(api.flightQuizArchiveAttempt(deck(), { [key(3)]: response(3, false, 0) },
      '2026-10-23T12:10:00.000Z', 'quiz-' + Date.now() + '-40'));
    expect(added.savedAt).toBe('2026-10-23T12:10:00.000Z');
    await patch({ quizAttemptHistory: [added] }); await flush();
    expect(latest.quizAttemptHistory[1]).toEqual(added);
    expect(latest.quizAttemptHistory[0].savedAt).toBe('2026-10-23T12:00:00.000Z');
    expect(latest.quizAttemptSequence).toBe(41);
  });

  it('announces a correct answer once only after its delayed host receipt, even with replay and local renders', async () => {
    await mount({}, { delayed: true, strict: true }); await click(correctChoice());
    expect(toasts).not.toHaveBeenCalled(); await act(async () => poke());
    await act(async () => vi.runOnlyPendingTimers()); expect(toasts).not.toHaveBeenCalled();
    await flush(); expect(toasts).toHaveBeenCalledTimes(1); expect(toasts.mock.calls[0][0]).toBe('🎯 Correct!');
    await act(async () => poke()); await act(async () => vi.runOnlyPendingTimers());
    expect(toasts).toHaveBeenCalledTimes(1);
  });

  it.each(['replacement', 'A to B to A'])('does not announce a delayed answer rejected after %s', async change => {
    await mount({}, { delayed: true, strict: true }); const original = copy(latest);
    await click(correctChoice()); await patch({ quizAttemptSequence: 6, quizFirstAttempts: {} });
    if (change === 'A to B to A') await patch(original);
    await flush(); await act(async () => vi.runOnlyPendingTimers());
    expect(toasts).not.toHaveBeenCalled(); expect(latest.quizFirstAttempts[key(0)]).toBeUndefined();
  });

  it('waits for a no-op Random receipt before returning focus to the same question', async () => {
    await mount({}, { delayed: true, strict: true }); vi.spyOn(Math, 'random').mockReturnValue(0);
    const random = button('🎲 Random'); random.focus(); const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    await click(random); await act(async () => poke()); await act(async () => vi.runOnlyPendingTimers());
    expect(document.activeElement).toBe(random);
    expect(focus.mock.instances.filter(node => node.id === 'skyschool-quiz-question')).toHaveLength(0);
    await flush(); await act(async () => vi.runOnlyPendingTimers());
    expect(document.activeElement).toBe(host.querySelector('#skyschool-quiz-question'));
    expect(focus.mock.instances.filter(node => node.id === 'skyschool-quiz-question')).toHaveLength(1);
    expect(latest.quizFirstAttempts).toEqual({ [key(2)]: response(2, true, 0) });
  });

  it('drops same-question focus when a pending Random receipt is rejected by newer response evidence', async () => {
    await mount({}, { delayed: true, strict: true }); vi.spyOn(Math, 'random').mockReturnValue(0);
    const random = button('🎲 Random'); random.focus(); const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    await click(random); await patch({ quizFirstAttempts: { [key(3)]: response(3, false, 0) } });
    const current = correctChoice(); current.focus(); await flush(); await act(async () => vi.runOnlyPendingTimers());
    expect(document.activeElement).toBe(current);
    expect(focus.mock.instances.filter(node => node.id === 'skyschool-quiz-question')).toHaveLength(0);
  });

  it('keeps a deliberate focus change after practice receipt ahead of its queued focus repair', async () => {
    await mount({ quizFirstAttempts: { [key(0)]: response(0, false, 0) } }, { delayed: true, strict: true });
    const practice = button('Practice this question'); practice.focus(); await click(practice);
    await act(async () => vi.runOnlyPendingTimers()); expect(document.activeElement).toBe(practice);
    await flush(); const answer = correctChoice(); answer.focus();
    await act(async () => vi.runOnlyPendingTimers()); expect(document.activeElement).toBe(answer);
    expect(latest.quizPracticeKey).toBe(key(0)); expect(latest.quizPracticePicked).toBeNull();
  });

  it('preserves immediate answer then Next ordering in a legacy host without a functional setter', async () => {
    await mount({}, { legacyHost: true }); const answer = capture('answer'), next = capture('next');
    await act(async () => { answer(); next(); answer(); });
    expect(latest.quizIdx).toBe(1); expect(latest.quizFirstAttempts[key(0)]).toEqual(response(0, true, 1));
    expect([latest.quizScore, latest.quizTotal]).toEqual([2, 2]); expect(toasts).toHaveBeenCalledTimes(1);
    expect(latestRoot.otherTool).toEqual({ writing: 'Preserve unrelated work.' });
  });

  it('archives the accepted answer exactly once before reset in a legacy host', async () => {
    await mount({}, { legacyHost: true }); const answer = capture('answer'), reset = capture('reset');
    await act(async () => { answer(); reset(); reset(); });
    expect(latest.quizFirstAttempts).toEqual({}); expect([latest.quizScore, latest.quizTotal]).toEqual([0, 0]);
    const history = api.flightQuizJournalState(deck(), latest.quizAttemptHistory);
    expect(history).toHaveLength(1); expect(history[0].answered).toBe(2); expect(history[0].score).toBe(2);
    expect(latest.quizAttemptSequence).toBe(6);
  });
});
