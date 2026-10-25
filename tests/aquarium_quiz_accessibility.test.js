import { afterEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounts = [];
const marineQuestion = () => ({ version: 2, question: 'Which animal has broad, wing-like fins?', answer: 'Manta Ray', options: ['Manta Ray', 'Clownfish'], explanation: 'A manta ray uses broad pectoral fins to swim.' });

afterEach(() => {
  mounts.splice(0).forEach(({ root, host }) => { act(() => root.unmount()); host.remove(); });
  vi.restoreAllMocks();
});

async function mount(patch = {}) {
  resetStemLab();
  const tool = loadTool(process.env.AQUARIUM_SOURCE || 'stem_lab/stem_tool_aquarium.js', 'aquarium');
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), store = newStore(), awardXP = vi.fn();
  mounts.push({ root, host }); let latest, update;
  function Harness() {
    const [data, setData] = React.useState({ _aquarium: {
      mode: 'quiz', selectedTank: 'freshwater', soundEnabled: false, simRunning: false,
      tutorialDismissed: true, fishIdentityVersion: 3, tankFish: [], fishInstanceIds: [],
      nextFishInstanceId: 1, tankPlants: [], equipment: {}, habitatLayout: [],
      waterChem: { temp: 76, pH: 7, ammonia: 0, nitrite: 0, nitrate: 10, salinity: 0, dissolvedO2: 7, co2: 3 },
      observationNotes: 'Keep my observation.', coins: 42, ...patch
    } });
    latest = data._aquarium;
    update = values => setData(old => ({ ...old, _aquarium: { ...old._aquarium, ...values } }));
    return React.createElement('div', null, tool.render(makeCtx({ toolData: data, setToolData: setData, awardXP }, store)), React.createElement('button', { 'data-other-control': 'true' }, 'Another control'));
  }
  await act(async () => root.render(React.createElement(Harness)));
  return { host, awardXP, state: () => latest,
    update: values => act(async () => update(values)),
    question: () => host.querySelector('[data-aquarium-quiz-question]'),
    heading: () => host.querySelector('[data-aquarium-quiz-question-heading]'),
    answers: () => [...host.querySelectorAll('[data-aquarium-quiz-answer]')],
    result: () => host.querySelector('[data-aquarium-quiz-result]'),
    map: () => [...host.querySelectorAll('[data-aquarium-quiz-map-question]')],
    action: name => host.querySelector('[data-aquarium-quiz-action="' + name + '"]') };
}
async function click(control) { await act(async () => { control.focus(); control.click(); }); }

describe('Aquarium Marine Science quiz accessibility', () => {
  it('focuses the newly requested question and groups its answer controls by that question', async () => {
    const t = await mount({ mode: 'marine' }), start = t.host.querySelector('[data-aquarium-marine-quiz-action="start"]');
    await click(start);
    const heading = t.host.querySelector('[data-aquarium-marine-question-heading]'), group = t.host.querySelector('[data-aquarium-marine-question] [role="group"]');
    expect(document.activeElement).toBe(heading); expect(heading.textContent).toContain(t.state().quizQ.question);
    expect(group.getAttribute('aria-labelledby')).toBe(heading.id);
    expect(t.host.querySelector('[data-aquarium-marine-result]').textContent).toBe('');
  });

  it.each([true, false])('retains answer focus, announces evidence, and blocks rescoring (correct=%s)', async correct => {
    const t = await mount({ mode: 'marine', quizQ: marineQuestion() });
    const answers = [...t.host.querySelectorAll('[data-aquarium-marine-answer]')], chosen = answers[correct ? 0 : 1];
    const result = t.host.querySelector('[data-aquarium-marine-result]'); expect(result.getAttribute('role')).toBe('status');
    await click(chosen);
    expect(document.activeElement).toBe(chosen); expect(chosen.disabled).toBe(false);
    answers.forEach(answer => expect(answer.getAttribute('aria-disabled')).toBe('true'));
    expect(t.host.querySelector('[data-aquarium-marine-result]')).toBe(result);
    expect(result.getAttribute('aria-atomic')).toBe('true'); expect(result.textContent).toContain(marineQuestion().explanation);
    expect(result.textContent).toContain(correct ? 'Correct!' : 'The answer is: Manta Ray');
    expect(result.querySelector('button')).toBeNull();
    expect(t.state().quizScore).toEqual({ correct: correct ? 1 : 0, total: 1 });
    await click(answers[correct ? 1 : 0]);
    expect(t.state().quizScore).toEqual({ correct: correct ? 1 : 0, total: 1 });
    expect(t.awardXP).toHaveBeenCalledTimes(correct ? 1 : 0);
    expect(t.state().coins).toBe(42); expect(t.state().observationNotes).toBe('Keep my observation.');
  });

  it('hands focus from Next Question to the new heading while retaining the status node', async () => {
    const t = await mount({ mode: 'marine', quizQ: marineQuestion() });
    await click(t.host.querySelector('[data-aquarium-marine-answer]'));
    const result = t.host.querySelector('[data-aquarium-marine-result]');
    await click(t.host.querySelector('[data-aquarium-marine-quiz-action="next"]'));
    expect(document.activeElement).toBe(t.host.querySelector('[data-aquarium-marine-question-heading]'));
    expect(t.host.querySelector('[data-aquarium-marine-result]')).toBe(result); expect(result.textContent).toBe('');
    expect(t.state().quizScore.total).toBe(1);
  });

  it('keeps changing progress readable without a second live announcement for the same answer', async () => {
    const t = await mount({ mode: 'marine', quizQ: marineQuestion() });
    const progress = t.host.querySelector('[data-aquarium-marine-progress]'), result = t.host.querySelector('[data-aquarium-marine-result]');
    expect(progress).toBeTruthy(); expect(progress.hasAttribute('role')).toBe(false); expect(progress.hasAttribute('aria-live')).toBe(false);
    await click(t.host.querySelector('[data-aquarium-marine-answer]'));
    expect(progress.textContent).toContain('Quiz: 1/1');
    expect(result.getAttribute('role')).toBe('status'); expect(result.textContent).toContain('Correct!');
  });

  it('does not steal focus after starting a question if the user has moved to another control', async () => {
    const t = await mount({ mode: 'marine' }), start = t.host.querySelector('[data-aquarium-marine-quiz-action="start"]'), other = t.host.querySelector('[data-other-control]');
    await act(async () => { start.focus(); start.click(); other.focus(); });
    expect(t.state().quizQ).toBeTruthy(); expect(document.activeElement).toBe(other);
  });
});

describe('Aquarium Quiz Lab accessibility', () => {
  it.each([true, false])('keeps focus and exposes stable result feedback without repeat answers (correct=%s)', async correct => {
    const t = await mount(), result = t.result();
    expect(result.getAttribute('role')).toBe('status'); expect(result.textContent).toBe('');
    const chosen = t.answers().find(button => button.textContent.includes(correct ? 'Ammonia' : 'Nitrate'));
    const picked = Number(chosen.dataset.aquariumQuizAnswer);
    await click(chosen);
    expect(document.activeElement).toBe(chosen); expect(chosen.disabled).toBe(false);
    expect(t.state().quizAnswers['q-1']).toBe(picked);
    t.answers().forEach(button => expect(button.getAttribute('aria-disabled')).toBe('true'));
    expect(t.result()).toBe(result); expect(result.getAttribute('aria-atomic')).toBe('true');
    expect(result.textContent).toContain(correct ? 'Correct' : 'Incorrect. Correct answer: Ammonia');
    expect(result.textContent).toContain('primary fish waste'); expect(result.querySelector('button')).toBeNull();
    const answerState = { ...t.state().quizAnswers }, streak = t.state().quizStreak;
    await click(t.answers().find(button => button !== chosen));
    expect(t.state().quizAnswers).toEqual(answerState); expect(t.state().quizStreak).toBe(streak);
    expect(t.state().observationNotes).toBe('Keep my observation.'); expect(t.state().coins).toBe(42);
  });

  it('describes every map status in words, marks the current step, and provides visible non-color cues', async () => {
    const t = await mount(); let map = t.map();
    expect(map.length).toBeGreaterThan(50);
    expect(map[0].getAttribute('aria-label')).toMatch(/^Question 1\. Chemistry\. Not answered$/);
    expect(map[0].getAttribute('aria-current')).toBe('step'); expect(map[0].textContent).toContain('○');
    await click(t.answers().find(button => button.textContent.includes('Ammonia')));
    expect(t.map()[0].getAttribute('aria-label')).toMatch(/Correct$/); expect(t.map()[0].textContent).toContain('✓');
    await click(t.action('next')); await click(t.answers().find(button => button.textContent.includes('Sulfate')));
    map = t.map(); expect(map[1].getAttribute('aria-label')).toMatch(/Incorrect$/); expect(map[1].textContent).toContain('✕');
    expect(map.filter(button => button.hasAttribute('aria-current'))).toHaveLength(1);
    expect(map[1].style.textDecoration).toBe('underline');
  });

  it('focuses and identifies questions after next, previous, map, unanswered, and reset navigation', async () => {
    const t = await mount();
    await click(t.answers().find(button => button.textContent.includes('Ammonia')));
    for (const [control, expected] of [[t.action('next'), 'q-2'], [t.action('previous'), 'q-1'], [t.map()[4], 'q-5'], [t.action('unanswered'), 'q-2'], [t.action('reset'), 'q-1']]) {
      await click(control); expect(document.activeElement).toBe(t.heading());
      expect(t.question().dataset.aquariumQuizQuestion).toBe(expected);
      expect(t.question().getAttribute('aria-labelledby')).toBe(t.heading().id);
      expect(document.getElementById(t.heading().getAttribute('aria-describedby')).textContent).toMatch(/^Question \d+ of /);
    }
    expect(t.state().quizAnswers).toEqual({}); expect(t.state().quizStreak).toBe(0);
  });

  it('names filter groups and moves to the filtered question without erasing recorded answers', async () => {
    const t = await mount();
    await click(t.answers().find(button => button.textContent.includes('Ammonia')));
    const groups = [...t.host.querySelectorAll('[data-aquarium-quiz-lab] [role="group"]')];
    const category = groups.find(group => document.getElementById(group.getAttribute('aria-labelledby'))?.textContent === 'Category');
    const difficulty = groups.find(group => document.getElementById(group.getAttribute('aria-labelledby'))?.textContent === 'Difficulty');
    expect(category).toBeTruthy(); expect(difficulty).toBeTruthy();
    await click([...category.querySelectorAll('button')].find(button => button.textContent === 'Chemistry'));
    expect(document.activeElement).toBe(t.heading());
    await click([...difficulty.querySelectorAll('button')].find(button => button.textContent === 'Hard'));
    expect(document.activeElement).toBe(t.heading()); expect(t.question().textContent).toContain('hard');
    expect(t.state().quizAnswers['q-1']).toBeDefined();
  });

  it('returns to the question when the current map entry is chosen again', async () => {
    const t = await mount();
    await click(t.answers().find(button => button.textContent.includes('Ammonia')));
    const answers = { ...t.state().quizAnswers }, questionId = t.question().dataset.aquariumQuizQuestion;
    await click(t.map()[0]);
    expect(document.activeElement).toBe(t.heading()); expect(t.question().dataset.aquariumQuizQuestion).toBe(questionId);
    expect(t.state().quizAnswers).toEqual(answers); expect(t.result().textContent).toContain('Correct');
  });

  it('updates the existing live result on submission and mounts a fresh result when navigating between questions', async () => {
    const t = await mount(), firstResult = t.result();
    await click(t.answers().find(button => button.textContent.includes('Ammonia')));
    expect(t.result()).toBe(firstResult); expect(firstResult.textContent).toContain('Correct');
    await click(t.action('next'));
    const secondResult = t.result(); expect(secondResult).not.toBe(firstResult); expect(firstResult.isConnected).toBe(false);
    expect(secondResult.textContent).toBe(''); expect(document.activeElement).toBe(t.heading());
    await click(t.answers().find(button => button.textContent.includes('Nitrite')));
    expect(t.result()).toBe(secondResult); expect(secondResult.textContent).toContain('Correct');
    await click(t.action('previous'));
    expect(t.result()).not.toBe(secondResult); expect(t.result()).not.toBe(firstResult);
    expect(t.result().textContent).toContain('primary fish waste'); expect(document.activeElement).toBe(t.heading());
    expect(Object.keys(t.state().quizAnswers)).toHaveLength(2);
  });

  it('keeps an unavailable unanswered action guarded and communicates empty filter results', async () => {
    const t = await mount(); const answers = Object.fromEntries(t.map().map(button => [button.dataset.aquariumQuizMapQuestion, 0]));
    await t.update({ quizAnswers: answers });
    expect(t.action('unanswered').getAttribute('aria-disabled')).toBe('true');
    const before = t.state().quizCurrent; await click(t.action('unanswered')); expect(t.state().quizCurrent).toBe(before);
    await t.update({ quizCategory: 'No matching category' });
    expect(t.question()).toBeNull(); const empty = t.host.querySelector('[data-aquarium-quiz-empty]');
    expect(empty.getAttribute('role')).toBe('status'); expect(empty.textContent).toContain('No questions match');
  });

  it('does not steal focus from another control or after a mode switch', async () => {
    const t = await mount(), other = t.host.querySelector('[data-other-control]');
    await act(async () => { t.action('next').focus(); t.action('next').click(); other.focus(); });
    expect(document.activeElement).toBe(other); expect(t.question().dataset.aquariumQuizQuestion).toBe('q-2');
    await act(async () => { t.action('next').focus(); t.action('next').click(); await t.update({ mode: 'marine' }); });
    expect(t.heading()).toBeNull(); expect(t.host.querySelector('[data-aquarium-marine-question-heading]')).toBeNull();
  });

  it('uses stable, unique question IDs across instances and avoids autofocus on saved questions', async () => {
    const original = document.activeElement, a = await mount(), b = await mount({ mode: 'marine', quizQ: marineQuestion() });
    expect(document.activeElement).toBe(original); const id = a.heading().id;
    expect(b.host.querySelector('[data-aquarium-marine-question-heading]').id).not.toBe(id);
    await a.update({ mode: 'marine', quizQ: marineQuestion() }); await a.update({ mode: 'quiz' });
    expect(a.heading().id).toBe(id); expect(document.activeElement).toBe(original);
  });
});
