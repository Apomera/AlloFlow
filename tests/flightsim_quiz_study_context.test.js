import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, host, root, latest, setSaved, errors, awardXP, celebrate;
const deck = () => api.getQuizDeck();
const weatherIndex = () => deck().findIndex(question => question.topic === 'Weather');
const key = index => api.flightQuizQuestionKey(deck()[index]);
const response = (index, correct) => ({ choice: correct ? deck()[index].correct : deck()[index].options.find(option => option !== deck()[index].correct), correct, order: 0 });
const panel = () => host.querySelector('[data-quiz-study-context]');
const prompt = () => panel()?.querySelector('[data-quiz-study-context-question]');
const details = () => panel()?.querySelector('[data-quiz-study-context-details]');
const visitResponse = () => panel()?.querySelector('[data-quiz-study-context-response]');
const explanation = () => panel()?.querySelector('[data-quiz-study-context-explanation]');
const study = () => host.querySelector('[data-quiz-study-link]');
const back = () => host.querySelector('[data-quiz-study-return]');
const choices = () => [...host.querySelectorAll('button[aria-label^="Answer "]')];
const copy = value => JSON.parse(JSON.stringify(value));
function button(text) {
  const node = [...host.querySelectorAll('button')].find(item => item.textContent === text);
  expect(node, 'Button: ' + text).toBeTruthy(); return node;
}
async function click(node) { expect(node).toBeTruthy(); await act(async () => { node.focus(); node.click(); }); }
async function answer(correct) {
  const question = deck()[latest.quizIdx || 0];
  await click(choices()[correct ? question.options.indexOf(question.correct) : question.options.findIndex(option => option !== question.correct)]);
}
function quizEvidence() {
  return copy({ quizIdx: latest.quizIdx, quizFirstAttempts: latest.quizFirstAttempts, quizScore: latest.quizScore,
    quizTotal: latest.quizTotal, quizStreak: latest.quizStreak, quizBest: latest.quizBest,
    quizPracticeKey: latest.quizPracticeKey, quizPracticePicked: latest.quizPracticePicked,
    quizAttemptHistory: latest.quizAttemptHistory, quizAttemptSequence: latest.quizAttemptSequence, quizLegacySummary: latest.quizLegacySummary });
}
async function search(value) {
  const input = host.querySelector('input[type="search"]');
  await act(async () => {
    input.focus(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  return input;
}
async function mount(seed = {}, t) {
  if (root) await act(async () => root.unmount()); host?.remove();
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'quiz', quizIdx: weatherIndex(), ...seed } });
    latest = data.flightSim;
    setSaved = patch => setData(old => ({ ...old, flightSim: { ...old.flightSim, ...patch } }));
    return tool.render(makeCtx({ toolData: data, setToolData: setData, ...(t ? { t } : {}), awardXP, celebrate,
      update: (id, name, value) => setData(old => ({ ...old, [id]: { ...old[id], [name]: value } })),
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}
beforeEach(() => {
  vi.useFakeTimers(); resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); api = window.__RR_TEST_EXPORTS__.flightSim;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({});
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {});
  awardXP = vi.fn(); celebrate = vi.fn(); errors = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  expect(errors).not.toHaveBeenCalled(); delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('Sky School question context during supporting study', () => {
  it.each([true, false])('keeps the authored question visible and first-response feedback optional after a correct response: %s', async correct => {
    await mount(); const index = weatherIndex(), question = deck()[index];
    await answer(correct); const evidence = quizEvidence(), choice = latest.quizFirstAttempts[key(index)].choice;
    await click(study());
    expect(panel().getAttribute('data-quiz-study-context')).toBe('first');
    expect(prompt().textContent).toBe(question.question); expect(prompt().closest('details')).toBeNull();
    expect(panel().getAttribute('aria-labelledby')).toBe(prompt().id);
    expect(details().open).toBe(false); expect(details().querySelector('summary').textContent).toBe('Explanation');
    expect(visitResponse().textContent).toBe('First response: ' + choice);
    expect(panel().querySelector('[data-quiz-study-context-correct]').textContent).toBe('Correct answer: ' + question.correct);
    expect(explanation().textContent).toBe(question.explanation);
    expect(document.activeElement).toBe(host.querySelector('#skyschool-learn-topic-title'));
    const summary = details().querySelector('summary'); await click(summary);
    expect(details().open).toBe(true); expect(document.activeElement).toBe(summary); expect(quizEvidence()).toEqual(evidence);
    await click(back());
    expect(panel()).toBeNull(); expect(latest.view).toBe('quiz'); expect(quizEvidence()).toEqual(evidence);
    expect(document.activeElement).toBe(host.querySelector('#skyschool-quiz-question'));
    expect(awardXP).not.toHaveBeenCalled(); expect(celebrate).not.toHaveBeenCalled();
  });

  it.each([true, false])('identifies this visit’s answered practice response without relabeling it as the original first response: %s', async correct => {
    const index = weatherIndex(), first = { [key(index)]: response(index, !correct) }, question = deck()[index];
    await mount({ quizFirstAttempts: first, quizAttemptSequence: 4 });
    await click(button('Practice this question')); await answer(correct);
    const choice = question.options[latest.quizPracticePicked], evidence = quizEvidence(); await click(study());
    expect(panel().getAttribute('data-quiz-study-context')).toBe('practice'); expect(prompt().textContent).toBe(question.question);
    expect(panel().querySelector('[data-quiz-study-context-practice]').textContent).toContain('Practice mode');
    expect(visitResponse().textContent).toBe('Your answer: ' + choice + '. Correct answer: ' + question.correct + '.');
    expect(visitResponse().textContent).not.toContain('First response:');
    expect(panel().querySelector('[data-quiz-study-context-correct]')).toBeNull();
    expect(explanation().textContent).toBe(question.explanation); expect(latest.quizFirstAttempts).toEqual(first);
    expect(quizEvidence()).toEqual(evidence); await click(back()); expect(quizEvidence()).toEqual(evidence);
  });

  it('keeps question and open explanation available while browsing topics, including searches with no cards', async () => {
    await mount(); await answer(false); const question = deck()[weatherIndex()], evidence = quizEvidence(); await click(study());
    await click(details().querySelector('summary'));
    await click(host.querySelector('nav[aria-label="Learn topics"] button'));
    expect(prompt().textContent).toBe(question.question); expect(details().open).toBe(true);
    expect(explanation().textContent).toBe(question.explanation);
    const searchInput = await search('no-learning-cards-match-this-987654');
    expect(document.activeElement).toBe(searchInput); expect(host.querySelectorAll('.skyschool-learn-card')).toHaveLength(0);
    expect(prompt().textContent).toBe(question.question); expect(details().open).toBe(true); expect(back()).toBeTruthy();
    await search('lift'); expect(prompt().textContent).toBe(question.question); expect(host.querySelectorAll('.skyschool-learn-card').length).toBeGreaterThan(0);
    expect(quizEvidence()).toEqual(evidence);
  });

  it('places expanded feedback in the existing article scroll flow before cards without moving the return control into it', async () => {
    await mount(); await answer(false); await click(study()); await click(details().querySelector('summary'));
    const article = host.querySelector('#skyschool-learn-content'), card = article.querySelector('.skyschool-learn-card');
    expect(article.contains(panel())).toBe(true); expect(article.style.overflowY).toBe('auto'); expect(article.contains(back())).toBe(false);
    expect(panel().compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(Number.parseFloat(panel().style.minWidth)).toBe(0); expect(panel().style.maxWidth).toBe('100%'); expect(panel().style.overflowWrap).toBe('anywhere');
    expect(panel().querySelector('[role="status"],[aria-live]')).toBeNull();
    expect(details().querySelector('summary').style.minHeight).toBe('44px');
  });

  it.each([false, true])('re-derives truthful context after a serialized reload for practice visit: %s', async practice => {
    const index = weatherIndex(); await mount({ quizFirstAttempts: { [key(index)]: response(index, false) }, quizAttemptSequence: 9,
      quizScore: 0, quizTotal: 1, quizStreak: 0, quizBest: 0, quizLegacySummary: null });
    if (practice) { await click(button('Practice this question')); await answer(true); }
    const evidence = quizEvidence(); await click(study()); const saved = copy(latest);
    await mount(saved);
    expect(panel().getAttribute('data-quiz-study-context')).toBe(practice ? 'practice' : 'first');
    expect(prompt().textContent).toBe(deck()[index].question); expect(explanation().textContent).toBe(deck()[index].explanation);
    expect(latest.quizStudyReturn).toEqual(saved.quizStudyReturn); expect(quizEvidence()).toEqual(evidence);
    expect(Object.keys(latest.quizStudyReturn).sort()).toEqual(['attemptSequence', 'firstChoice', 'practiceChoice', 'questionKey', 'topicId', 'version']);
    await click(back()); expect(quizEvidence()).toEqual(evidence);
  });

  it('ignores untrusted saved question and explanation snapshots in an otherwise valid return context', async () => {
    await mount(); await answer(false); await click(study()); const saved = copy(latest), evidence = quizEvidence();
    await mount({ ...saved, quizStudyReturn: { ...saved.quizStudyReturn, question: 'Forged question text', explanation: 'Forged explanation text', correct: 'Forged answer' } });
    expect(prompt().textContent).toBe(deck()[weatherIndex()].question); expect(explanation().textContent).toBe(deck()[weatherIndex()].explanation);
    expect(panel().textContent).not.toContain('Forged'); expect(quizEvidence()).toEqual(evidence);
  });

  it('does not expose the original response or explanation when an unfinished practice makes saved context invalid', async () => {
    const index = weatherIndex(); await mount(); await answer(true); await click(study()); const saved = copy(latest);
    await mount({ ...saved, quizPracticeKey: key(index), quizPracticePicked: null });
    expect(panel()).toBeNull(); expect(back()).toBeNull(); expect(latest.quizStudyReturn).toBeNull();
    await act(async () => setSaved({ view: 'quiz' }));
    expect(host.querySelector('[data-quiz-practice]')).toBeTruthy(); expect(host.querySelector('[data-quiz-first-response]')).toBeNull();
    expect(host.querySelector('section[aria-labelledby="skyschool-quiz-question"]').textContent).not.toContain(deck()[index].explanation);
  });

  it.each(['question', 'first response', 'practice response', 'attempt', 'topic'])('retires context and renders no study panel after the %s identity changes', async change => {
    await mount(); await answer(false); await click(study()); const saved = copy(latest), index = weatherIndex();
    const mutations = {
      question: { quizIdx: (index + 1) % deck().length },
      'first response': { quizFirstAttempts: { [key(index)]: response(index, true) } },
      'practice response': { quizPracticeKey: key(index), quizPracticePicked: deck()[index].options.indexOf(deck()[index].correct) },
      attempt: { quizAttemptSequence: 123 },
      topic: { quizStudyReturn: { ...saved.quizStudyReturn, topicId: 'invented-topic' } },
    };
    await mount({ ...saved, ...mutations[change] });
    expect(panel()).toBeNull(); expect(back()).toBeNull(); expect(latest.quizStudyReturn).toBeNull();
  });

  it('does not show quiz context in generic Learn entry or revive it after returning through Menu', async () => {
    await mount({ view: 'learn', learnTopic: 'weather' }); expect(panel()).toBeNull(); expect(back()).toBeNull();
    await mount(); await answer(false); await click(study()); const evidence = quizEvidence();
    await click(host.querySelector('button[aria-label="Back to menu"]'));
    expect(latest.quizStudyReturn).toBeNull(); await act(async () => setSaved({ view: 'learn', learnTopic: 'weather' }));
    expect(panel()).toBeNull(); expect(back()).toBeNull(); expect(quizEvidence()).toEqual(evidence);
  });

  it('reuses localized context labels while preserving the authored question and stored response', async () => {
    const labels = { 'stem.flightsim.quiz': 'Quiz local', 'stem.flightsim.question': 'Question locale',
      'stem.flightsim.guided_phase_explanation': 'Explication', 'stem.flightsim.quiz_first_response': 'Première réponse : {answer}',
      'stem.flightsim.quiz_history_correct_answer': 'Réponse correcte : {answer}' };
    const t = (name, fallback) => labels[name] || fallback;
    await mount({}, t); await answer(false); const first = latest.quizFirstAttempts[key(weatherIndex())].choice; await click(study());
    expect(panel().querySelector('p').textContent).toBe('Quiz local · Question locale');
    expect(details().querySelector('summary').textContent).toBe('Explication');
    expect(visitResponse().textContent).toBe('Première réponse : ' + first);
    expect(panel().querySelector('[data-quiz-study-context-correct]').textContent).toBe('Réponse correcte : ' + deck()[weatherIndex()].correct);
    expect(prompt().textContent).toBe(deck()[weatherIndex()].question); expect(latest.quizFirstAttempts[key(weatherIndex())].choice).toBe(first);
  });
});
