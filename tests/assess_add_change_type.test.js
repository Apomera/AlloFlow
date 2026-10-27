// Assess authoring after generation: add an item (AI draft or blank) after any item,
// rewrite an item as another type, and keep the teacher's structural edits from being
// reported as "missing from the requested recipe".
//
// Mutation check: point the env vars at the pre-change modules and these tests fail.
//   ADDITEM_QUIZ_MODULE, ADDITEM_HOST_MODULE

import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;

const QUIZ_MODULE = process.env.ADDITEM_QUIZ_MODULE || 'view_quiz_module.js';
const HOST_MODULE = process.env.ADDITEM_HOST_MODULE || 'host_handlers_module.js';
const t = key => key;
let QuizView, internals, createHandlers;

beforeAll(() => {
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloLanguageContext = React.createContext({ t });
  window.__alloT = t;
  window.AlloIcons = {};
  window.AlloModules = window.AlloModules || {};
  const registration = '  window.AlloModules.QuizView = QuizView;';
  const quizSource = readFileSync(QUIZ_MODULE, 'utf8');
  if (!quizSource.includes(registration)) throw new Error('QuizView registration line not found');
  new Function('window', quizSource.replace(registration, registration + '\n window.AlloModules.__AddItem = { audit: _quizAuditAssessment, blank: typeof _quizBlankItem === "function" ? _quizBlankItem : null, types: typeof _QUIZ_AUTHOR_TYPES !== "undefined" ? _QUIZ_AUTHOR_TYPES : [] };'))(window);
  QuizView = window.AlloModules.QuizView;
  internals = window.AlloModules.__AddItem;
  new Function(readFileSync(HOST_MODULE, 'utf8'))();
  createHandlers = window.AlloModules.createHostHandlers;
});

let root, host;
async function render(element) {
  if (!root) { host = document.createElement('div'); document.body.append(host); root = createRoot(host); }
  await act(async () => root.render(element));
}
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = host = null;
  localStorage.clear(); vi.restoreAllMocks();
});
const buttons = text => [...host.querySelectorAll('button')].filter(el => el.textContent.trim() === text);
const setSelect = async (select, value) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
  await act(async () => { setter.call(select, value); select.dispatchEvent(new Event('change', { bubbles: true })); });
};
const click = async el => { await act(async () => { el.click(); }); };
const flush = async () => { await act(async () => { await new Promise(r => setTimeout(r, 0)); }); };

const mcq = (n, extra) => ({ type: 'mcq', question: 'Question ' + n + '?', options: ['A' + n, 'B' + n, 'C' + n, 'D' + n], correctAnswer: 'B' + n, conceptLabel: 'topic ' + n, ...extra });
const quizOf = (questions, extra) => ({ id: 'quiz-authoring', type: 'quiz', title: 'Rivers', data: { questions, requestedItemTypeMix: { mcq: questions.length }, ...extra } });
const quizBase = extra => ({
  t, isTeacherMode: true, isParentMode: false, isIndependentMode: false, studentProjectSettings: {}, activeSessionCode: null, sessionData: {},
  isPresentationMode: false, isReviewGame: false, isEditingQuiz: true, escapeRoomState: { isActive: false }, presentationState: {}, reviewGameState: {},
  isFactChecking: {}, showQuizAnswers: false, leveledTextLanguage: 'English', inputText: 'A lesson about how rivers carve valleys.', gradeLevel: '7th Grade',
  formatInlineText: v => v, renderFormattedText: v => v, getReviewCategories: () => [], getRows: () => 1, playSound: vi.fn(), addToast: vi.fn(),
  handleToggleIsPresentationMode: vi.fn(), handleToggleIsReviewGame: vi.fn(), handleToggleIsEditingQuiz: vi.fn(), handleToggleShowQuizAnswers: vi.fn(),
  handlePresentationOptionClick: vi.fn(), togglePresentationAnswer: vi.fn(), togglePresentationExplanation: vi.fn(), resetPresentation: vi.fn(),
  handleQuizChange: vi.fn(), handleFactCheck: vi.fn(), handleQuizQuestionAction: vi.fn(),
  ErrorBoundary: ({ children }) => children, TeacherLiveQuizControls: () => null, ConfettiExplosion: () => null, Stamp: ({ label }) => React.createElement('span', { 'data-stamp': label }),
  ...extra
});
function hostWith(quiz) {
  const state = { content: quiz, history: [quiz] };
  const deps = {
    generatedContent: quiz, isTeacherMode: true, history: state.history,
    setGeneratedContent: v => { state.content = typeof v === 'function' ? v(state.content) : v; },
    setHistory: v => { state.history = typeof v === 'function' ? v(state.history) : v; }
  };
  return { state, handlers: createHandlers(deps) };
}

describe('host: insert, and structural edits become the recipe', () => {
  it('inserts after the chosen item, or first with -1, and clears any old check', async () => {
    const quiz = quizOf([mcq(1), mcq(2)]);
    const h = hostWith(quiz);
    await h.handlers.handleQuizQuestionAction(0, 'insert', { question: { type: 'numeric-response', question: 'How deep?', correctValue: 3, tolerance: 0, factCheck: 'old' } });
    const qs = h.state.content.data.questions;
    expect(qs.map(q => q.question)).toEqual(['Question 1?', 'How deep?', 'Question 2?']);
    expect(qs[1].factCheck).toBeNull();
    expect(h.state.content.data.requestedItemTypeMix).toEqual({ mcq: 2, 'numeric-response': 1 });
    expect(h.state.content.data.itemCountMismatch).toBe(false);
    expect(h.state.history[0].data.questions).toHaveLength(3);
    const empty = hostWith(quizOf([]));
    await empty.handlers.handleQuizQuestionAction(-1, 'insert', { question: mcq(9) });
    expect(empty.state.content.data.questions.map(q => q.question)).toEqual(['Question 9?']);
  });

  it('refuses inserts it cannot place', async () => {
    const quiz = quizOf([mcq(1)]);
    const h = hostWith(quiz);
    for (const [index, payload] of [[1, { question: mcq(2) }], [-2, { question: mcq(2) }], [0, null], [0, { question: 'text' }], [0, { question: [] }]]) {
      await h.handlers.handleQuizQuestionAction(index, 'insert', payload);
    }
    expect(h.state.content).toBe(quiz);
  });

  it('a deliberate delete no longer reads as a missing item; the audit stays clean', async () => {
    const quiz = quizOf([mcq(1), mcq(2), mcq(3)]);
    const h = hostWith(quiz);
    await h.handlers.handleQuizQuestionAction(1, 'delete');
    const data = h.state.content.data;
    expect(data.questions).toHaveLength(2);
    expect(data.requestedItemTypeMix).toEqual({ mcq: 2 });
    const codes = internals.audit(data).issues.map(issue => issue.code);
    expect(codes).not.toContain('missing-type');
  });

  it('a type change marked retargetMix updates the recipe; a plain regenerate does not', async () => {
    const original = mcq(1);
    const quiz = quizOf([original, mcq(2)]);
    const guard = { resourceId: 'quiz-authoring', questionIndex: 0, question: original, questionSignature: JSON.stringify(original) };
    const plain = hostWith(quiz);
    await plain.handlers.handleQuizQuestionAction(0, 'replace', { type: 'short-answer', question: 'Why?', expectedAnswer: 'Erosion' }, guard);
    expect(plain.state.content.data.requestedItemTypeMix).toEqual({ mcq: 2 });
    const retyped = hostWith(quiz);
    await retyped.handlers.handleQuizQuestionAction(0, 'replace', { type: 'short-answer', question: 'Why?', expectedAnswer: 'Erosion' }, { ...guard, retargetMix: true });
    expect(retyped.state.content.data.requestedItemTypeMix).toEqual({ mcq: 1, 'short-answer': 1 });
    expect(retyped.state.content.data.itemCountMismatch).toBe(false);
  });
});

describe('blank items', () => {
  it('offers every type the editor supports, and each blank renders and is flagged, never "unsupported"', async () => {
    const types = internals.types.map(entry => entry[0]);
    expect(types).toEqual(['mcq', 'multi-select', 'fill-blank', 'short-answer', 'self-explanation', 'numeric-response', 'answer-evidence', 'sequence-sense', 'relation-mismatch']);
    const blanks = types.map(type => internals.blank(type));
    blanks.forEach((item, i) => expect(item).toMatchObject({ type: types[i], question: '' }));
    const audit = internals.audit({ questions: blanks });
    expect(audit.issues.some(issue => issue.code === 'unsupported-type')).toBe(false);
    types.forEach((_, i) => expect(audit.issues.some(issue => issue.questionIdx === i && issue.severity === 'error'), types[i]).toBe(true));
    await render(React.createElement(QuizView, quizBase({ generatedContent: quizOf(blanks) })));
    expect(host.querySelectorAll('[data-assess-add-toggle]')).toHaveLength(types.length);
    expect(host.querySelectorAll('[data-assess-change-type]')).toHaveLength(types.length);
  });
});

describe('edit bar: add item below', () => {
  it('Start blank inserts an empty item of the chosen type after that item', async () => {
    const props = quizBase({ generatedContent: quizOf([mcq(1), mcq(2)]) });
    await render(React.createElement(QuizView, props));
    await click(host.querySelectorAll('[data-assess-add-toggle]')[1]);
    const panel = host.querySelector('[data-assess-add-panel]');
    expect(panel.getAttribute('aria-label')).toBe('Add an item after question 2');
    await setSelect(panel.querySelector('[data-assess-add-type]'), 'answer-evidence');
    await click(panel.querySelector('[data-assess-add-blank]'));
    expect(props.handleQuizQuestionAction).toHaveBeenCalledWith(1, 'insert', { question: expect.objectContaining({ type: 'answer-evidence', question: '', answerOptions: ['', '', '', ''] }) });
    expect(props.addToast).toHaveBeenCalledWith(expect.stringContaining('question 3'), 'success');
    expect(host.querySelector('[data-assess-add-panel]')).toBeNull();
  });

  it('Write it for me drafts a new item of that type from the source and the other items', async () => {
    let resolve;
    const callGemini = vi.fn(() => new Promise(done => { resolve = done; }));
    const props = quizBase({ generatedContent: quizOf([mcq(1), mcq(2)]), callGemini });
    await render(React.createElement(QuizView, props));
    await click(host.querySelectorAll('[data-assess-add-toggle]')[0]);
    await setSelect(host.querySelector('[data-assess-add-type]'), 'fill-blank');
    await click(host.querySelector('[data-assess-add-ai]'));
    expect(callGemini).toHaveBeenCalledTimes(1);
    const prompt = callGemini.mock.calls[0][0];
    expect(prompt).toContain('Write ONE new assessment item');
    expect(prompt).toContain('{type:"fill-blank",question:"sentence with ___",expectedFill');
    expect(prompt).toContain('"Question 1?","Question 2?"');
    expect(prompt).toContain('rivers carve valleys');
    expect(prompt).toContain('7th Grade');
    expect(host.querySelector('[data-assess-add-ai]').textContent).toBe('Writing item…');
    await act(async () => { resolve(JSON.stringify({ type: 'mcq', question: 'Rivers carve ___.', expectedFill: 'valleys', acceptableAlternatives: [] })); });
    await flush();
    const insert = props.handleQuizQuestionAction.mock.calls.find(call => call[1] === 'insert');
    expect(insert[0]).toBe(0);
    expect(insert[2].question).toMatchObject({ type: 'fill-blank', question: 'Rivers carve ___.', expectedFill: 'valleys' });
    expect(insert[2].question.id).toMatch(/^assessment-item-/);
    expect(props.addToast).toHaveBeenCalledWith('Fill-in-the-Blank item added as question 2. Review it before sharing.', 'success');
  });

  it('drops an AI draft when the anchor item changed while it was written', async () => {
    let resolve;
    const callGemini = vi.fn(() => new Promise(done => { resolve = done; }));
    const quiz = quizOf([mcq(1), mcq(2)]);
    const props = quizBase({ generatedContent: quiz, callGemini });
    await render(React.createElement(QuizView, props));
    await click(host.querySelectorAll('[data-assess-add-toggle]')[0]);
    await click(host.querySelector('[data-assess-add-ai]'));
    const edited = quizOf([mcq(1, { question: 'Edited?' }), mcq(2)]);
    await render(React.createElement(QuizView, { ...props, generatedContent: edited }));
    await act(async () => { resolve(JSON.stringify(mcq(7))); });
    await flush();
    expect(props.handleQuizQuestionAction.mock.calls.some(call => call[1] === 'insert')).toBe(false);
    expect(props.addToast).toHaveBeenCalledWith(expect.stringContaining('was not added'), 'info');
  });

  it('an empty assessment offers its first item', async () => {
    const props = quizBase({ generatedContent: quizOf([]) });
    await render(React.createElement(QuizView, props));
    const panel = host.querySelector('[data-assess-empty-add]');
    expect(panel).toBeTruthy();
    await click([...panel.querySelectorAll('button')].find(b => b.textContent === 'Start blank'));
    expect(props.handleQuizQuestionAction).toHaveBeenCalledWith(-1, 'insert', { question: expect.objectContaining({ type: 'mcq' }) });
  });
});

describe('edit bar: change type', () => {
  it('asks first, then rewrites the item as the new type and keeps its picture', async () => {
    let resolve;
    const callGemini = vi.fn(() => new Promise(done => { resolve = done; }));
    const pictured = mcq(1, { imageUrl: 'data:image/png;base64,AAAA', imageAltText: 'A river valley' });
    const props = quizBase({ generatedContent: quizOf([pictured, mcq(2)]), callGemini });
    await render(React.createElement(QuizView, props));
    const select = host.querySelectorAll('[data-assess-change-type]')[0];
    const convert = () => host.querySelectorAll('[data-assess-convert]')[0];
    expect(convert().disabled).toBe(true);                    // same type: nothing to do
    await setSelect(select, 'answer-evidence');
    expect(convert().textContent).toBe('Rewrite as Answer + Evidence');
    await click(convert());
    expect(callGemini).not.toHaveBeenCalled();                // confirmation first
    const confirm = host.querySelector('[data-assess-convert-confirm]');
    expect(confirm.closest('[role="group"]').textContent).toContain('Replace question 1 with an AI rewrite as Answer + Evidence?');
    await click(confirm);
    expect(callGemini).toHaveBeenCalledTimes(1);
    const prompt = callGemini.mock.calls[0][0];
    expect(prompt).toContain('Rewrite one assessment item as a different item type');
    expect(prompt).toContain('The type must be "answer-evidence"');
    expect(prompt).toContain('Question 1?');
    await act(async () => { resolve(JSON.stringify({ type: 'mcq', question: 'Which claim fits?', answerOptions: ['W', 'X', 'Y', 'Z'], correctAnswer: 'X', evidencePrompt: 'Why?', evidenceOptions: ['P', 'Q', 'R', 'S'], correctEvidence: 'Q' })); });
    await flush();
    const replace = props.handleQuizQuestionAction.mock.calls.find(call => call[1] === 'replace');
    expect(replace[0]).toBe(0);
    expect(replace[2]).toMatchObject({ type: 'answer-evidence', question: 'Which claim fits?', imageUrl: 'data:image/png;base64,AAAA', imageAltText: 'A river valley' });
    expect(replace[3]).toMatchObject({ resourceId: 'quiz-authoring', questionIndex: 0, retargetMix: true });
  });

  it('Regenerate item still keeps the type and leaves the recipe alone', async () => {
    let resolve;
    const callGemini = vi.fn(() => new Promise(done => { resolve = done; }));
    const props = quizBase({ generatedContent: quizOf([mcq(1)]), callGemini });
    await render(React.createElement(QuizView, props));
    await click(buttons('Regenerate item')[0]);
    expect(callGemini.mock.calls[0][0]).toContain('The type must remain "mcq"');
    await act(async () => { resolve(JSON.stringify(mcq(5))); });
    await flush();
    const replace = props.handleQuizQuestionAction.mock.calls.find(call => call[1] === 'replace');
    expect(replace[3].retargetMix).toBe(false);
  });
});

describe('live quiz', () => {
  it('offers no structure changes while students are answering live, and offers them again after', async () => {
    const live = quizBase({ generatedContent: quizOf([mcq(1), mcq(2)]), activeSessionCode: 'ROOM1', sessionData: { quizState: { isActive: true } } });
    await render(React.createElement(QuizView, live));
    for (const control of ['[data-assess-add-toggle]', '[data-assess-change-type]', '[data-assess-empty-add]']) expect(host.querySelector(control), control).toBeNull();
    expect(buttons('Delete')).toHaveLength(0);
    const ended = quizBase({ generatedContent: quizOf([mcq(1), mcq(2)]), activeSessionCode: 'ROOM1', sessionData: { quizState: { isActive: false } } });
    await render(React.createElement(QuizView, ended));
    expect(host.querySelectorAll('[data-assess-add-toggle]')).toHaveLength(2);
    expect(host.querySelector('[data-assess-add-toggle]').disabled).toBe(false);
  });
});
