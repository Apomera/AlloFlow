import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const source = fs.readFileSync('stem_lab/stem_tool_microbiology.js', 'utf8');
const bankStart = source.indexOf('var QUIZ_QUESTIONS = [');
const bank = new Function(source.slice(bankStart, source.indexOf('// INTERACTIVE WIDGETS', bankStart)) + '\nreturn QUIZ_QUESTIONS;')();
const correct = () => bank.map(q => q.answer);
const wrongAt = (...indices) => bank.map((q, i) => indices.includes(i) ? (q.answer + 1) % 4 : q.answer);
const act = React.act;
const priorAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
let tool, mounted;
beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; resetStemLab(); tool = loadTool('stem_lab/stem_tool_microbiology.js', 'microbiology'); });
afterEach(() => {
  if (mounted) { act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; }
  globalThis.IS_REACT_ACT_ENVIRONMENT = priorAct; vi.restoreAllMocks();
});
function mount(seed = {}) {
  const container = document.createElement('div'); document.body.appendChild(container);
  const view = { container, root: ReactDOMClient.createRoot(container), state: null, awardXP: vi.fn() };
  function Host() {
    const [data, setData] = React.useState({ microbiology: { tab: 'quiz', ...seed } }); view.state = data.microbiology;
    return tool.render(makeCtx({ toolData: data, setToolData: setData, awardXP: view.awardXP }));
  }
  mounted = view; act(() => view.root.render(React.createElement(Host))); return view;
}
function button(name) {
  const node = [...mounted.container.querySelectorAll('button')].find(el => el.textContent.trim() === name);
  expect(node, name).toBeTruthy(); return node;
}
function click(node) { act(() => (typeof node === 'string' ? button(node) : node).click()); }
function choose(index, value, practice = false) {
  click(mounted.container.querySelector(`input[name="micro-quiz-${practice ? 'practice' : 'answer'}-${index}"][value="${value}"]`));
}
function core() { return window.__MicrobiologyCore.quiz; }
function roundTrip() {
  const saved = JSON.parse(JSON.stringify(mounted.state));
  act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; return mount(saved);
}

describe('Microbiology quiz and targeted review', { timeout: 20000 }, () => {
  it('normalizes only valid answer indices and derives score from actual answers', () => {
    const invalid = [undefined, null, '1', true, -1, 4, 1.2, NaN, {}, [], Infinity];
    for (const value of invalid) expect(core().answers(Array(30).fill(value))).toEqual(Array(15).fill(null));
    expect(core().summarize(correct())).toMatchObject({ correct: 15, answered: 15, missed: [], missing: [] });
    expect(core().summarize(wrongAt(0, 7))).toMatchObject({ correct: 13, answered: 15, missed: [0, 7], missing: [] });
    const result = core().summarize([bank[0].answer]);
    expect(result.correct).toBe(1); expect(result.missing).toHaveLength(14);
  });

  it('uses native named radio groups, announces progress, and focuses the first missing question', () => {
    mount();
    expect(mounted.container.querySelectorAll('fieldset')).toHaveLength(15);
    expect(mounted.container.querySelectorAll('input[type="radio"]')).toHaveLength(60);
    expect(button('Submit quiz').disabled).toBe(true);
    choose(0, bank[0].answer);
    expect(mounted.container.textContent).toContain('1/15 questions answered');
    click('Go to next unanswered question');
    expect(document.activeElement.id).toBe('micro-quiz-question-1');
    for (let i = 1; i < 15; i++) choose(i, bank[i].answer);
    expect(button('Submit quiz').disabled).toBe(false);
    click('Submit quiz');
    expect(mounted.state.quizAnswers).toEqual(correct());
    expect(mounted.container.querySelector('[data-quiz-original-score]').textContent).toBe('Original score: 15/15');
    expect(mounted.awardXP).toHaveBeenCalledWith(75);
  });

  it('does not let malformed restored answers satisfy submission or a forged score', () => {
    mount({ quizAnswers: Array(15).fill('1'), quizCorrect: 500 });
    expect(button('Submit quiz').disabled).toBe(true);
    expect(mounted.container.textContent).toContain('0/15 questions answered');
    const view = roundTrip(); expect(view.state.quizSubmitted).not.toBe(true);
    act(() => view.root.unmount()); view.container.remove(); mounted = null;
    mount({ quizSubmitted: true, quizAnswers: [bank[0].answer], quizCorrect: 500 });
    expect(mounted.container.querySelector('[data-quiz-original-score]').textContent).toBe('Original score: 1/15');
    expect(mounted.container.querySelectorAll('article')).toHaveLength(14);
    expect(mounted.container.querySelector('article').textContent).toContain('Original answer: No answer recorded');
    expect(mounted.container.textContent).not.toContain('mastered microbiology');
  });

  it('uses the same valid-answer count and strict submission flag on Home', () => {
    mount({ tab: 'home', quizAnswers: Array(15).fill('1'), quizSubmitted: 'false' });
    expect(mounted.container.textContent).toContain('0/15');
    expect(mounted.container.textContent).toContain('In progress');
    expect(mounted.container.textContent).not.toContain('Submitted');
    const quiz = [...mounted.container.querySelectorAll('[role="tab"]')].find(n => n.textContent.includes('Quiz')); click(quiz);
    expect(mounted.container.textContent).toContain('0/15 questions answered');
    expect(button('Submit quiz').disabled).toBe(true);
  });

  it('filters review without changing answers and keeps original evidence through practice', () => {
    const answers = wrongAt(0, 1); mount({ quizSubmitted: true, quizAnswers: answers, quizCorrect: 13 });
    expect(mounted.container.querySelectorAll('article')).toHaveLength(2);
    click('All questions (15)'); expect(mounted.container.querySelectorAll('article')).toHaveLength(15);
    click('Needs review (2)'); click('Practice missed questions');
    expect(mounted.container.querySelectorAll('fieldset')).toHaveLength(2);
    expect(button('Check practice answer').disabled).toBe(true);
    choose(0, bank[0].answer, true); click('Check practice answer');
    expect(mounted.container.textContent).toContain('Correct after checking in practice: 1/2');
    expect(mounted.container.textContent).toContain('Correct in practice');
    expect(mounted.state.quizAnswers).toEqual(answers);
    expect(mounted.state.quizCorrect).toBe(13);
    expect(mounted.awardXP).not.toHaveBeenCalled();
    click('Return to quiz results');
    expect(mounted.container.querySelectorAll('article')).toHaveLength(2);
    expect(mounted.container.querySelector('article').textContent).toContain(bank[0].choices[answers[0]]);
  });

  it('clears checked feedback when a practice answer changes and preserves focus', () => {
    mount({ quizSubmitted: true, quizAnswers: wrongAt(0) }); click('Practice missed questions');
    choose(0, (bank[0].answer + 1) % 4, true); click('Check practice answer');
    expect(mounted.container.textContent).toContain('Revisit the explanation, then try again');
    const input = mounted.container.querySelector(`input[value="${bank[0].answer}"]`);
    input.focus(); choose(0, bank[0].answer, true);
    expect(document.activeElement).toBe(input);
    expect(mounted.container.querySelector('.micro-quiz-feedback')).toBeNull();
    expect(mounted.state.quizPractice.checked[0]).toBe(false);
    click('Check practice answer');
    expect(mounted.container.textContent).toContain('Correct after checking in practice: 1/1');
  });

  it('retains practice drafts and checked outcomes through navigation and JSON restoration', () => {
    mount({ quizSubmitted: true, quizAnswers: wrongAt(0, 1), quizMode: 'practice' });
    choose(0, bank[0].answer, true); click('Check practice answer'); choose(1, bank[1].answer, true);
    const saved = JSON.parse(JSON.stringify(mounted.state.quizPractice));
    const home = [...mounted.container.querySelectorAll('[role="tab"]')].find(n => n.textContent.includes('Home')); click(home);
    const quiz = [...mounted.container.querySelectorAll('[role="tab"]')].find(n => n.textContent.includes('Quiz')); click(quiz);
    expect(mounted.state.quizPractice).toEqual(saved);
    roundTrip();
    expect(mounted.container.textContent).toContain('Correct after checking in practice: 1/2');
    expect(mounted.container.querySelector(`input[name="micro-quiz-practice-1"][value="${bank[1].answer}"]`).checked).toBe(true);
    expect(mounted.state.quizPractice.checked[1]).toBe(false);
  });

  it('awards only improved quiz scores and resets practice explicitly for a new attempt', () => {
    mount({ quizAnswers: wrongAt(0), quizBestCorrect: 13 }); click('Submit quiz');
    expect(mounted.awardXP).toHaveBeenCalledWith(5);
    click('Practice missed questions'); choose(0, bank[0].answer, true); click('Check practice answer');
    click('Start a new quiz');
    expect(mounted.state.quizSubmitted).toBe(false); expect(mounted.state.quizAnswers).toEqual([]);
    expect(mounted.state.quizPractice).toEqual({}); expect(mounted.state.quizBestCorrect).toBe(14);
    for (let i = 0; i < 15; i++) choose(i, i === 0 ? (bank[i].answer + 1) % 4 : bank[i].answer);
    click('Submit quiz'); expect(mounted.awardXP).toHaveBeenCalledTimes(1);
  });

  it('ignores damaged practice flags and never fabricates missed questions for a perfect quiz', () => {
    const repaired = core().practice({ answers: correct(), checked: Array(15).fill('true') }, [0]);
    expect(repaired.answers.slice(1)).toEqual(Array(14).fill(null));
    expect(repaired.checked.some(Boolean)).toBe(false);
    mount({ quizSubmitted: true, quizAnswers: correct(), quizMode: 'practice', quizPractice: { answers: correct(), checked: Array(15).fill(true) } });
    expect(mounted.container.querySelectorAll('article')).toHaveLength(15);
    expect(mounted.container.querySelectorAll('fieldset')).toHaveLength(0);
    expect(mounted.container.textContent).not.toContain('Practice missed questions');
    expect(mounted.awardXP).not.toHaveBeenCalled();
  });
});
