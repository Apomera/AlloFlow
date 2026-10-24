import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, host, root, latest, setSaved;
const deck = () => api.getQuizDeck();
const weatherIndex = () => deck().findIndex(question => question.topic === 'Weather');
const key = index => api.flightQuizQuestionKey(deck()[index]);
const response = (index, correct) => ({ choice: correct ? deck()[index].correct : deck()[index].options.find(option => option !== deck()[index].correct), correct, order: 0 });
const study = () => host.querySelector('[data-quiz-study-link]');
const back = () => host.querySelector('[data-quiz-study-return]');
const question = () => host.querySelector('section[aria-labelledby="skyschool-quiz-question"]');
const choices = () => [...host.querySelectorAll('button[aria-label^="Answer "]')];
const copy = value => JSON.parse(JSON.stringify(value));
function button(label) {
  const result = [...host.querySelectorAll('button')].find(node => node.textContent === label);
  expect(result, `Button: ${label}`).toBeTruthy(); return result;
}
function handler(node) {
  return node[Object.keys(node).find(name => name.startsWith('__reactProps$'))].onClick;
}
async function click(node) { expect(node).toBeTruthy(); await act(async () => { node.focus(); node.click(); }); }
async function answer(correct) {
  const current = deck()[latest.quizIdx || 0];
  const index = correct ? current.options.indexOf(current.correct) : current.options.findIndex(option => option !== current.correct);
  await click(choices()[index]);
}
function quizEvidence() {
  return copy({ quizIdx: latest.quizIdx, quizFirstAttempts: latest.quizFirstAttempts, quizScore: latest.quizScore,
    quizTotal: latest.quizTotal, quizStreak: latest.quizStreak, quizBest: latest.quizBest,
    quizPracticeKey: latest.quizPracticeKey, quizPracticePicked: latest.quizPracticePicked,
    quizAttemptHistory: latest.quizAttemptHistory, quizAttemptSequence: latest.quizAttemptSequence,
    quizLegacySummary: latest.quizLegacySummary });
}
function history() {
  return [api.flightQuizJournalRecord(api.flightQuizArchiveAttempt(deck(), { [key(2)]: response(2, false) },
    '2026-10-20T12:00:00.000Z', 'quiz-1792497600000-1'))];
}
async function mount(seed = {}, t) {
  if (root) await act(async () => root.unmount()); host?.remove();
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'quiz', quizIdx: weatherIndex(), ...seed } });
    latest = data.flightSim;
    setSaved = patch => setData(previous => ({ ...previous, flightSim: { ...previous.flightSim, ...patch } }));
    return tool.render(makeCtx({ toolData: data, setToolData: setData, ...(t ? { t } : {}),
      update: (id, name, value) => setData(previous => ({ ...previous, [id]: { ...previous[id], [name]: value } })),
      updateMulti: (id, patch) => setData(previous => ({ ...previous, [id]: { ...previous[id], ...patch } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}
beforeEach(() => {
  vi.useFakeTimers(); resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); api = window.__RR_TEST_EXPORTS__.flightSim;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({});
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {});
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  delete window.__RR_TEST_EXPORTS__; vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('Sky School quiz supporting study loop', () => {
  it('maps authored topics to explicit Learn destinations and refuses unknown or inherited names', () => {
    for (const topic of new Set(deck().map(item => item.topic))) {
      const target = api.flightQuizStudyTopic(topic);
      expect(target).toMatchObject({ id: expect.any(String), labelKey: expect.stringMatching(/^stem\.flightsim\./), label: expect.any(String) });
    }
    expect(api.flightQuizStudyTopic('Weather').id).toBe('weather');
    expect(api.flightQuizStudyTopic('Instruments').id).toBe('cockpit');
    for (const topic of ['Unknown authored topic', '__proto__', 'constructor', '', null, {}, ['Weather']]) expect(api.flightQuizStudyTopic(topic)).toBeNull();
    const target = api.flightQuizStudyTopic('Weather'); target.id = 'invented';
    expect(api.flightQuizStudyTopic('Weather').id).toBe('weather');
  });

  it.each([true, false])('opens supporting cards after a correct first response: %s and returns without changing quiz evidence', async correct => {
    await mount({ learnTopic: 'forces', learnQuery: 'no-matching-old-search-987', quizAttemptHistory: history(), quizAttemptSequence: 3 });
    expect(study()).toBeNull();
    await answer(correct); const before = quizEvidence();
    expect(study().textContent).toBe('Study · Weather & Flight');
    await click(study());
    expect(latest).toMatchObject({ view: 'learn', learnTopic: 'weather', learnQuery: '' });
    expect(host.querySelector('[data-learn-topic]').getAttribute('data-learn-topic')).toBe('weather');
    expect(host.querySelectorAll('.skyschool-learn-card').length).toBeGreaterThan(0);
    expect(document.activeElement).toBe(host.querySelector('#skyschool-learn-topic-title'));
    expect(quizEvidence()).toEqual(before);
    await click(back());
    expect(latest.view).toBe('quiz'); expect(latest.quizStudyReturn).toBeNull();
    expect(quizEvidence()).toEqual(before);
    expect(question().textContent).toContain(deck()[weatherIndex()].explanation);
    expect(document.activeElement).toBe(host.querySelector('#skyschool-quiz-question'));
  });

  it.each([true, false])('keeps an answered practice response and original first-attempt score through study for correct practice: %s', async correct => {
    const index = weatherIndex(), first = { [key(index)]: response(index, !correct) };
    await mount({ quizFirstAttempts: first, quizAttemptHistory: history() });
    await click(button('Practice this question'));
    expect(study()).toBeNull(); expect(question().querySelector('[data-quiz-first-response]')).toBeNull();
    await answer(correct); const before = quizEvidence();
    await click(study()); await click(back());
    expect(quizEvidence()).toEqual(before); expect(latest.quizFirstAttempts).toEqual(first);
    expect([latest.quizScore, latest.quizTotal]).toEqual([correct ? 0 : 1, 1]);
    expect(question().querySelector('[data-quiz-practice]')).toBeTruthy();
    expect(question().textContent).toContain(correct ? '✓ Correct!' : '✗ Not quite.');
    expect(choices().every(choice => choice.disabled)).toBe(true);
  });

  it('restores a study visit after remount and returns to the same answered practice with question focus', async () => {
    const index = weatherIndex();
    await mount({ quizFirstAttempts: { [key(index)]: response(index, false) }, quizAttemptHistory: history(), quizAttemptSequence: 8 });
    await click(button('Practice this question')); await answer(true); const before = quizEvidence();
    await click(study()); const saved = copy(latest);
    await mount(saved);
    expect(back()).toBeTruthy(); expect(latest.quizStudyReturn).toEqual(saved.quizStudyReturn);
    await click(back());
    expect(latest.view).toBe('quiz'); expect(quizEvidence()).toEqual(before);
    expect(question().querySelector('[data-quiz-practice]')).toBeTruthy();
    expect(question().textContent).toContain('✓ Correct!');
    expect(document.activeElement).toBe(host.querySelector('#skyschool-quiz-question'));
  });

  it('keeps the return action while browsing other supporting cards and searching within Learn', async () => {
    await mount(); await answer(false); const before = quizEvidence(); await click(study());
    const topic = host.querySelector('nav[aria-label="Learn topics"] button'); await click(topic);
    const search = host.querySelector('input[type="search"]');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(search, 'lift');
      search.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(back()).toBeTruthy(); await click(back()); expect(quizEvidence()).toEqual(before);
  });

  it('retires study context on Menu exit and rejects a queued return without changing the quiz', async () => {
    await mount(); await answer(true); const before = quizEvidence(); await click(study());
    const queuedReturn = handler(back());
    await act(async () => { host.querySelector('button[aria-label="Back to menu"]').click(); queuedReturn(); });
    expect(latest.view).toBe('menu'); expect(latest.quizStudyReturn).toBeNull(); expect(quizEvidence()).toEqual(before);
    await act(async () => setSaved({ view: 'learn' })); expect(back()).toBeNull();
  });

  it('does not show a quiz return during unrelated generic Learn entry, even with a leftover saved context', async () => {
    await mount(); await answer(true); await click(study()); const saved = copy(latest), before = quizEvidence();
    await mount({ ...saved, view: 'menu' });
    expect(latest.quizStudyReturn).toBeNull();
    await act(async () => setSaved({ view: 'learn', learnTopic: 'forces' }));
    expect(back()).toBeNull(); expect(quizEvidence()).toEqual(before);
  });

  it('retires a return context after the current question or attempt changes without restoring old responses', async () => {
    await mount({ quizAttemptSequence: 5 }); await answer(false); await click(study());
    const before = copy(latest.quizFirstAttempts);
    await act(async () => setSaved({ quizIdx: weatherIndex() + 1, quizAttemptSequence: 6 }));
    expect(back()).toBeNull(); expect(latest.quizStudyReturn).toBeNull();
    expect(latest.view).toBe('learn'); expect(latest.quizFirstAttempts).toEqual(before);
    expect(latest.quizAttemptSequence).toBe(6);
  });

  it('validates bounded context against the actual first and practice responses rather than restoring its contents', async () => {
    await mount({ quizAttemptSequence: 5 }); await answer(true); await click(study());
    const saved = copy(latest.quizStudyReturn), live = copy(latest);
    expect(api.flightQuizStudyContext(saved, live)).toEqual(saved);
    for (const invalid of [null, [], Object.create(saved), { ...saved, version: 2 },
      { ...saved, questionKey: 'x'.repeat(4097) }, { ...saved, questionKey: key(0) },
      { ...saved, topicId: 'invented' }, { ...saved, firstChoice: 'Invented first response' },
      { ...saved, practiceChoice: deck()[weatherIndex()].correct }, { ...saved, attemptSequence: 6 },
      { ...saved, attemptSequence: Infinity }]) expect(api.flightQuizStudyContext(invalid, live)).toBeNull();
    expect(api.flightQuizStudyContext(saved, { ...live, quizFirstAttempts: {} })).toBeNull();
    expect(api.flightQuizStudyContext(saved, { ...live, quizPracticeKey: key(weatherIndex()), quizPracticePicked: null })).toBeNull();
    expect(latest.quizFirstAttempts).toEqual(live.quizFirstAttempts);
  });

  it('keeps ordinary answer feedback without an invented destination for an unknown authored topic', async () => {
    const index = weatherIndex(), current = deck()[index];
    current.topic = 'Unknown authored topic';
    await mount({ quizIdx: index }); await answer(true);
    expect(study()).toBeNull(); expect(question().textContent).toContain('✓ Correct!');
    expect(question().textContent).toContain(current.explanation);
  });

  it('uses existing localized action and destination labels while retaining stable stored identities', async () => {
    const labels = { 'stem.flightsim.nav_study': 'Étudier', 'stem.flightsim.weather_flight': 'Météo et vol', 'common.back': 'Retour', 'stem.flightsim.quiz': 'Questionnaire' };
    await mount({}, (name, fallback) => labels[name] || fallback); await answer(false);
    expect(study().textContent).toBe('Étudier · Météo et vol'); await click(study());
    expect(back().textContent).toBe('Retour · Questionnaire'); expect(latest.learnTopic).toBe('weather');
    await click(back()); expect(latest.quizIdx).toBe(weatherIndex()); expect(latest.quizTotal).toBe(1);
  });
});
