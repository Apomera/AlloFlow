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
  vi.unstubAllGlobals(); vi.useRealTimers();
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
function captureQuizDownload() {
  const contents = [], links = [];
  const NativeBlob = globalThis.Blob, NativeURL = globalThis.URL;
  class CapturedBlob extends NativeBlob { constructor(parts, options) { super(parts, options); contents.push(parts.join('')); } }
  class CapturedURL extends NativeURL {}
  Object.defineProperties(CapturedURL, {
    createObjectURL: { configurable: true, writable: true, value: vi.fn(() => 'blob:micro-quiz-evidence') },
    revokeObjectURL: { configurable: true, writable: true, value: vi.fn() }
  });
  vi.stubGlobal('Blob', CapturedBlob); vi.stubGlobal('URL', CapturedURL); vi.useFakeTimers();
  const linkClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function() { links.push({ name: this.download, href: this.href }); });
  return { contents, links, linkClick, revokeUrl: CapturedURL.revokeObjectURL };
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
    expect(mounted.container.querySelector('[data-quiz-original-score]')).toBeNull();
    expect(mounted.container.querySelectorAll('fieldset')).toHaveLength(15);
    expect(mounted.container.textContent).toContain('Some saved answers are missing or invalid.');
    expect(mounted.container.textContent).toContain('1/15 questions answered');
    expect(button('Submit quiz').disabled).toBe(true);
    expect(mounted.container.querySelector(`input[name="micro-quiz-answer-0"][value="${bank[0].answer}"]`).checked).toBe(true);
    expect(mounted.container.textContent).not.toContain('mastered microbiology');
    for (let i = 1; i < 15; i++) choose(i, bank[i].answer);
    expect(mounted.state.quizSubmitted).toBe(false);
    expect(mounted.container.querySelector('[data-quiz-original-score]')).toBeNull();
    expect(button('Submit quiz').disabled).toBe(false);
    expect(mounted.awardXP).not.toHaveBeenCalled();
    click('Submit quiz');
    expect(mounted.state.quizSubmitted).toBe(true);
    expect(mounted.container.querySelector('[data-quiz-original-score]').textContent).toBe('Original score: 15/15');
    expect(mounted.awardXP).toHaveBeenCalledWith(75);
  });

  it('uses the same valid-answer count and strict submission flag on Home', () => {
    mount({ tab: 'home', quizAnswers: Array(15).fill('1'), quizSubmitted: 'false' });
    expect(mounted.container.textContent).toContain('0/15');
    expect(mounted.container.querySelector('[data-work-card="quiz"]').textContent).toContain('Ready to begin');
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

describe('Quiz evidence reports', { timeout: 20000 }, () => {
  it('exports incomplete and unsubmitted answers without scores, solutions, explanations or practice evidence', () => {
    for (const seed of [
      { quizAnswers: [bank[0].answer] },
      { quizAnswers: correct(), quizSubmitted: false },
      { quizAnswers: correct(), quizSubmitted: 'true' },
      { quizAnswers: [bank[0].answer, '1', true, 7], quizSubmitted: true }
    ]) {
      const raw = { ...seed, quizCorrect: 500, quizPractice: { answers: correct(), checked: Array(15).fill(true) } };
      const before = JSON.stringify(raw), report = core().report(raw), exported = core().exportText(raw);
      expect(report.submitted).toBe(false); expect(report.originalScore).toBeNull();
      expect(report.canDownload).toBe(true); expect(report.questions).toHaveLength(15);
      expect(report.questions[0]).toMatchObject({ originalAnswer: bank[0].choices[bank[0].answer], originalStatus: 'draft' });
      for (const question of report.questions) {
        expect(question.correctAnswer).toBeNull(); expect(question.explanation).toBeNull(); expect(question.practice).toBeNull();
      }
      expect(exported).toContain('Attempt status: Unsubmitted or incomplete attempt');
      expect(exported).not.toContain('Original score:'); expect(exported).not.toContain('Correct answer:'); expect(exported).not.toContain('Practice answer:');
      for (const question of bank) expect(exported).not.toContain(question.explain);
      expect(JSON.stringify(raw)).toBe(before);
    }
    const missing = core().report({ quizAnswers: [bank[0].answer, '1'] });
    expect(missing.questions[1]).toMatchObject({ originalAnswer: null, originalChoice: null, originalStatus: 'unanswered' });
    expect(core().exportText({ quizAnswers: [bank[0].answer] }).match(/Original answer: No answer recorded/g)).toHaveLength(14);
  });

  it('requires a strict recorded answer to enable export and rejects malformed root data', () => {
    for (const raw of [null, [], 'bad', 4, {}, { quizAnswers: Array(15).fill('1'), quizSubmitted: true, quizCorrect: 15 }]) {
      expect(core().report(raw)).toMatchObject({ canDownload: false, submitted: false, answered: 0, originalScore: null });
    }
    expect(core().report({ quizAnswers: [0] }).canDownload).toBe(true);
  });

  it('preserves every original answer and keeps checked, incorrect, unchecked and unanswered practice distinct', () => {
    const original = wrongAt(0, 1, 2, 3);
    const practiceAnswers = [bank[0].answer, (bank[1].answer + 1) % 4, bank[2].answer, null, (bank[4].answer + 1) % 4];
    const raw = { quizSubmitted: true, quizCorrect: 999, quizAnswers: original, quizPractice: { answers: practiceAnswers, checked: [true, true, false, true, true] } };
    const before = JSON.stringify(raw), report = core().report(raw), exported = core().exportText(raw);
    expect(report).toMatchObject({ submitted: true, originalScore: 11, practiceCorrect: 1, practiceTotal: 4 });
    expect(report.questions.slice(0, 4).map(question => question.practice.status)).toEqual(['checked-correct', 'checked-incorrect', 'unchecked', 'unanswered']);
    expect(report.questions[4].practice).toBeNull();
    for (let i = 0; i < bank.length; i++) {
      expect(report.questions[i]).toMatchObject({ index: i, question: bank[i].q, originalChoice: original[i], originalAnswer: bank[i].choices[original[i]], correctAnswer: bank[i].choices[bank[i].answer], explanation: bank[i].explain });
      expect(exported).toContain('Q' + (i + 1) + '. ' + bank[i].q + '\nOriginal answer: ' + bank[i].choices[original[i]]);
    }
    expect(exported).toContain('Original score: 11/15');
    expect(exported).toContain('Correct after checking in practice: 1/4');
    for (const status of ['Checked correct', 'Checked incorrect', 'Unchecked practice answer', 'Unanswered in practice']) expect(exported).toContain('Practice status: ' + status);
    expect(exported).not.toContain('999'); expect(JSON.stringify(raw)).toBe(before);
    expect(core().report(JSON.parse(before))).toEqual(report);
  });

  it('does not turn malformed practice flags or changed unchecked choices into checked success', () => {
    const raw = { quizSubmitted: true, quizAnswers: wrongAt(0, 1), quizPractice: { answers: [bank[0].answer, '1'], checked: ['true', true] } };
    const report = core().report(raw);
    expect(report.practiceCorrect).toBe(0);
    expect(report.questions[0].practice.status).toBe('unchecked');
    expect(report.questions[1].practice.status).toBe('unanswered');
    const perfect = core().report({ quizSubmitted: true, quizAnswers: correct(), quizPractice: raw.quizPractice });
    expect(perfect.originalScore).toBe(15); expect(perfect.practiceTotal).toBe(0);
    expect(perfect.questions.every(question => question.practice === null)).toBe(true);
  });

  it('downloads a working attempt without submission, grading, XP or focus changes', () => {
    mount({ quizAnswers: Array(15).fill('1'), quizCorrect: 500 });
    expect(button('Download quiz evidence').disabled).toBe(true);
    choose(0, bank[0].answer);
    const before = JSON.parse(JSON.stringify(mounted.state)), download = captureQuizDownload();
    const trigger = button('Download quiz evidence'); trigger.focus(); click(trigger);
    expect(download.links).toEqual([{ name: 'micro-lab-quiz-evidence.txt', href: 'blob:micro-quiz-evidence' }]);
    expect(download.contents[0]).toContain('Recorded answers: 1/15');
    expect(download.contents[0]).not.toContain('Original score:');
    expect(mounted.state).toEqual(before); expect(mounted.awardXP).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(trigger);
    expect(mounted.container.querySelector('#micro-quiz-download-status').textContent).toContain('Your answers and practice were kept');
    expect(document.querySelector('a[download="micro-lab-quiz-evidence.txt"]')).toBeNull();
    act(() => vi.advanceTimersByTime(1000));
    expect(download.revokeUrl).toHaveBeenCalledWith('blob:micro-quiz-evidence');
  });

  it('supports repeated report downloads without changing original evidence or unchecked practice', () => {
    mount({ quizSubmitted: true, quizAnswers: wrongAt(0, 1), quizMode: 'practice', quizPractice: { answers: [bank[0].answer, bank[1].answer], checked: [true, false] } });
    const before = JSON.parse(JSON.stringify(mounted.state)), download = captureQuizDownload();
    const trigger = button('Download quiz evidence'); trigger.focus(); click(trigger);
    const status = mounted.container.querySelector('#micro-quiz-download-status'), firstNotice = status.firstChild;
    expect(status.getAttribute('role')).toBe('status'); expect(status.getAttribute('aria-live')).toBe('polite');
    click(trigger);
    expect(status.firstChild).not.toBe(firstNotice);
    expect(download.contents).toHaveLength(2); expect(download.contents[1]).toBe(download.contents[0]);
    expect(download.contents[0]).toContain('Original score: 13/15');
    expect(download.contents[0]).toContain('Practice status: Unchecked practice answer');
    expect(mounted.state).toEqual(before); expect(mounted.awardXP).not.toHaveBeenCalled(); expect(document.activeElement).toBe(trigger);
    click('Start a new quiz');
    expect(button('Download quiz evidence').disabled).toBe(true);
    expect(status.textContent).toBe('');
    expect(download.contents).toHaveLength(2);
    act(() => vi.advanceTimersByTime(1000)); expect(download.revokeUrl).toHaveBeenCalledTimes(2);
  });

  it('cleans up failed downloads, permits retry, and clears stale feedback when practice changes', () => {
    mount({ quizSubmitted: true, quizAnswers: wrongAt(0), quizMode: 'practice' });
    const before = JSON.parse(JSON.stringify(mounted.state)), download = captureQuizDownload();
    download.linkClick.mockImplementationOnce(() => { throw new Error('download blocked'); });
    const trigger = button('Download quiz evidence'); trigger.focus(); click(trigger);
    expect(mounted.container.querySelector('#micro-quiz-download-status').textContent).toContain('could not start');
    expect(document.querySelector('a[download="micro-lab-quiz-evidence.txt"]')).toBeNull();
    expect(mounted.state).toEqual(before); expect(document.activeElement).toBe(trigger);
    click(trigger);
    expect(mounted.container.querySelector('#micro-quiz-download-status').textContent).toContain('download has started');
    choose(0, bank[0].answer, true);
    expect(mounted.container.querySelector('#micro-quiz-download-status').textContent).toBe('');
    expect(mounted.state.quizPractice.checked[0]).toBe(false);
    expect(mounted.state.quizAnswers).toEqual(before.quizAnswers); expect(mounted.awardXP).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1000)); expect(download.revokeUrl).toHaveBeenCalledTimes(2);
  });

  it('retains export evidence through section changes and JSON reload while download notices stay local', () => {
    mount({ quizSubmitted: true, quizAnswers: wrongAt(0, 1), quizMode: 'practice', quizPractice: { answers: [bank[0].answer, bank[1].answer], checked: [true, false] } });
    const download = captureQuizDownload(); click('Download quiz evidence');
    const report = download.contents[0];
    click(mounted.container.querySelector('#micro-tab-home')); click(mounted.container.querySelector('#micro-tab-quiz'));
    expect(mounted.container.querySelector('#micro-quiz-download-status').textContent).toBe('');
    click('Download quiz evidence'); expect(download.contents[1]).toBe(report);
    roundTrip();
    expect(mounted.container.querySelector('#micro-quiz-download-status').textContent).toBe('');
    click('Download quiz evidence'); expect(download.contents[2]).toBe(report);
    expect(mounted.awardXP).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1000)); expect(download.revokeUrl).toHaveBeenCalledTimes(3);
  });
});

describe('Quiz transition focus guards', { timeout: 20000 }, () => {
  it('focuses the current heading after submission and mode changes when no later action supersedes them', () => {
    vi.useFakeTimers(); mount({ quizAnswers: wrongAt(0) });
    click('Submit quiz'); act(() => vi.runOnlyPendingTimers());
    expect(document.activeElement.id).toBe('micro-quiz-heading'); expect(document.activeElement.dataset.phase).toBe('review');
    click('Practice missed questions'); act(() => vi.runOnlyPendingTimers());
    expect(document.activeElement.dataset.phase).toBe('practice');
    click('Return to quiz results'); act(() => vi.runOnlyPendingTimers());
    expect(document.activeElement.dataset.phase).toBe('review');
  });

  it('does not apply a stale mode transition to a newly reopened quiz panel', () => {
    vi.useFakeTimers(); mount({ quizSubmitted: true, quizAnswers: wrongAt(0) });
    click('Practice missed questions');
    click(mounted.container.querySelector('#micro-tab-home')); click(mounted.container.querySelector('#micro-tab-quiz'));
    const tab = mounted.container.querySelector('#micro-tab-quiz'); tab.focus();
    act(() => vi.runOnlyPendingTimers());
    expect(document.activeElement).toBe(tab);
    expect(mounted.container.querySelector('#micro-quiz-heading').dataset.phase).toBe('practice');
  });

  it('keeps focus on the active Quiz tab when it is clicked after a pending mode transition', () => {
    vi.useFakeTimers(); mount({ quizSubmitted: true, quizAnswers: wrongAt(0) });
    click('Practice missed questions');
    const owner = mounted.container.querySelector('[data-micro-quiz]');
    const heading = mounted.container.querySelector('#micro-quiz-heading');
    const tab = mounted.container.querySelector('#micro-tab-quiz'); tab.focus(); click(tab);
    expect(mounted.container.querySelector('[data-micro-quiz]')).toBe(owner);
    expect(mounted.container.querySelector('#micro-quiz-heading')).toBe(heading);
    expect(heading.dataset.phase).toBe('practice');
    act(() => vi.runOnlyPendingTimers());
    expect(document.activeElement).toBe(tab);
    expect(mounted.state.quizMode).toBe('practice');
  });

  it('keeps focus on topic-library controls after pending quiz transitions in either direction', () => {
    vi.useFakeTimers(); mount({ quizSubmitted: true, quizAnswers: wrongAt(0), showMicroLibrary: false });
    for (const [transition, libraryAction, phase] of [
      ['Practice missed questions', 'Show topic library', 'practice'],
      ['Return to quiz results', 'Hide topic library', 'review']
    ]) {
      click(transition);
      const owner = mounted.container.querySelector('[data-micro-quiz]');
      const heading = mounted.container.querySelector('#micro-quiz-heading');
      const toggle = button(libraryAction); toggle.focus(); click(toggle);
      expect(mounted.container.querySelector('[data-micro-quiz]')).toBe(owner);
      expect(mounted.container.querySelector('#micro-quiz-heading')).toBe(heading);
      expect(heading.dataset.phase).toBe(phase);
      act(() => vi.runOnlyPendingTimers());
      expect(document.activeElement).toBe(toggle);
      expect(mounted.state.tab).toBe('quiz');
      expect(mounted.state.quizMode).toBe(phase);
      expect(mounted.state.quizAnswers).toEqual(wrongAt(0));
    }
  });

  it('cancels delayed focus after later choices, review filters and download actions', () => {
    vi.useFakeTimers(); mount({ quizSubmitted: true, quizAnswers: wrongAt(0) });
    click('Practice missed questions');
    const choiceInput = mounted.container.querySelector(`input[name="micro-quiz-practice-0"][value="${bank[0].answer}"]`);
    choiceInput.focus(); choose(0, bank[0].answer, true);
    act(() => vi.runOnlyPendingTimers()); expect(document.activeElement).toBe(choiceInput);
    click('Return to quiz results');
    const all = button('All questions (15)'); all.focus(); click(all);
    act(() => vi.runOnlyPendingTimers()); expect(document.activeElement).toBe(all);
    click('Practice missed questions');
    const download = captureQuizDownload(), trigger = button('Download quiz evidence'); trigger.focus(); click(trigger);
    act(() => vi.runOnlyPendingTimers()); expect(document.activeElement).toBe(trigger);
    expect(download.revokeUrl).toHaveBeenCalledOnce();
  });
});
