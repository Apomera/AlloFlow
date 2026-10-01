import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

// Writing Scaffolds review fixes (2026-09-27). Each env var swaps in a scratch
// copy of one file so the suite can be mutation-checked against pre-fix code.
const read = (envName, file) => fs.readFileSync(path.resolve(process.cwd(), process.env[envName] || file), 'utf8');
const SF_MODULE = read('FIX0927_SCAF_SF_MODULE', 'view_sentence_frames_module.js');
const SI_MODULE = read('FIX0927_SCAF_SI_MODULE', 'student_interaction_module.js');
const HOST_SOURCE = read('FIX0927_SCAF_HOST', 'host_handlers_source.jsx');
const DISPATCH_SOURCE = read('FIX0927_SCAF_DISPATCH', 'generate_dispatcher_source.jsx');

const require = createRequire(import.meta.url);
const modulesDir = path.resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, createRoot, act, SentenceFramesView, DraftFeedbackInterface, Dispatcher;
const createHostHandlers = new Function(HOST_SOURCE + '\nreturn createHostHandlers;')();

beforeAll(() => {
  React = require(path.resolve(modulesDir, 'react'));
  ({ createRoot } = require(path.resolve(modulesDir, 'react-dom/client')));
  ({ act } = require(path.resolve(modulesDir, 'react-dom/test-utils')));
  global.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.React = React;
  const Stub = () => null;
  window.AlloIcons = new Proxy({}, { get: () => Stub, has: () => true });
  window.AlloLanguageContext = React.createContext({ t: key => key });
  window.AlloModules = {};
  delete window.__studentInteractionModuleLoaded;
  (0, eval)(SF_MODULE);
  (0, eval)(SI_MODULE);
  (0, eval)('(function(){\n' + DISPATCH_SOURCE + '\n})()');
  SentenceFramesView = window.AlloModules.SentenceFramesView;
  DraftFeedbackInterface = window.AlloModules.DraftFeedbackInterface;
  Dispatcher = window.AlloModules.GenDispatcher;
});

let container, root;
function render(Component, props) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => { root.render(React.createElement(Component, props)); });
  return container;
}
afterEach(() => {
  if (root) act(() => root.unmount());
  if (container && container.parentNode) container.parentNode.removeChild(container);
  root = null; container = null;
});

const paragraph = (id, extra = {}) => ({ id, type: 'sentence-frames', data: { mode: 'paragraph', text: 'Plants need [a gas] to grow.', ...extra } });
function viewProps(overrides = {}) {
  return {
    t: key => key,
    generatedContent: paragraph('A'),
    isTeacherMode: false,
    gradingSession: { isOpen: false },
    studentResponses: {},
    setGradingSession: vi.fn(), setStudentWorkInput: vi.fn(),
    handleResetScaffolds: vi.fn(), launchGradingSession: vi.fn(), handleToggleIsEditingScaffolds: vi.fn(),
    submitGradingSession: vi.fn(), handleScaffoldChange: vi.fn(), handleStudentInput: vi.fn(),
    handleScaffoldTextChange: vi.fn(), handleGenerateRubric: vi.fn(), handleToggleRubricZoom: vi.fn(),
    handleAutoGrade: vi.fn(), handleSetGradingResultToNull: vi.fn(),
    getRows: () => 3, renderFormattedText: text => text, copyToClipboard: vi.fn(),
    DraftFeedbackInterface: props => React.createElement('div', { 'data-draft': props.draftText }),
    ErrorBoundary: props => props.children,
    ...overrides
  };
}
const buttonTexts = el => [...el.querySelectorAll('button')].map(button => button.textContent.trim());

describe('Mastery Check draft stays with its own scaffold', () => {
  it('hides a draft started on scaffold A while scaffold B is shown', () => {
    const session = { isOpen: true, status: 'writing', draftText: 'Draft for A', resourceId: 'A', sessionId: 's1' };
    const onB = render(SentenceFramesView, viewProps({ generatedContent: paragraph('B'), gradingSession: session }));
    expect(onB.querySelector('[data-draft]')).toBeNull();
    expect(onB.querySelector('input')).not.toBeNull();
    act(() => root.render(React.createElement(SentenceFramesView, viewProps({ generatedContent: paragraph('A'), gradingSession: session }))));
    expect(container.querySelector('[data-draft]').getAttribute('data-draft')).toBe('Draft for A');
  });

  it('launch records the scaffold id and a relaunch does not wipe an open draft', () => {
    const setGradingSession = vi.fn();
    const scope = { generatedContent: paragraph('A'), studentResponses: {}, gradingSession: { isOpen: false }, setGradingSession };
    createHostHandlers(scope).launchGradingSession();
    expect(setGradingSession).toHaveBeenCalledWith(expect.objectContaining({ isOpen: true, resourceId: 'A', draftCount: 1 }));
    setGradingSession.mockClear();
    createHostHandlers({ ...scope, gradingSession: { isOpen: true, status: 'revision', resourceId: 'A', draftText: 'half done' } }).launchGradingSession();
    expect(setGradingSession).not.toHaveBeenCalled();
  });
});

function gradingHost({ session, active, history, result, awarded }) {
  const state = { session };
  const scope = {
    gradingSession: session, generatedContent: active, sourceTopic: 'Plants',
    _resourceMutationStateRef: { current: { history, generatedContent: active } },
    setGradingSession: value => { state.session = typeof value === 'function' ? value(state.session) : value; },
    handleMasteryGrading: vi.fn(async (text, rubric, topic, draftCount) => ({ ...result, draftCount })),
    handleScoreUpdate: vi.fn(() => awarded),
    playSound: vi.fn(), addToast: vi.fn(), warnLog: vi.fn(), t: key => key
  };
  return { state, scope, submit: createHostHandlers(scope).submitGradingSession };
}

describe('Mastery Check grading uses the session scaffold, counts drafts and reports the real award', () => {
  const A = paragraph('A', { rubric: 'RUBRIC-A' });
  const B = paragraph('B', { rubric: 'RUBRIC-B' });

  it('grades a revision against its own rubric, as attempt 2, and awards XP to that scaffold', async () => {
    const session = { isOpen: true, status: 'revision', draftText: 'Plants need carbon dioxide.', draftCount: 1, resourceId: 'A', sessionId: 's1' };
    const h = gradingHost({ session, active: B, history: [A, B], result: { status: 'mastery', rawScore: 91, gradingDetails: { rawScore: 91 } }, awarded: 0 });
    await h.submit();
    expect(h.scope.handleMasteryGrading).toHaveBeenCalledWith('Plants need carbon dioxide.', 'RUBRIC-A', 'Plants', 2);
    expect(h.scope.handleScoreUpdate).toHaveBeenCalledWith(100, 'Mastery Writing', 'A');
    expect(h.state.session).toMatchObject({ status: 'mastery', draftCount: 2, finalScore: 91, xpAwarded: 0 });
    expect(h.scope.addToast.mock.calls.map(call => call[0]).join(' ')).not.toContain('+100 XP');
  });

  it('keeps the submitted draft in the revision box and advances the draft number', async () => {
    const session = { isOpen: true, status: 'writing', draftText: 'First try.', draftCount: 1, resourceId: 'A', sessionId: 's1' };
    const h = gradingHost({ session, active: A, history: [A], result: { status: 'revision', rawScore: 60, gradingDetails: { rawScore: 60 } } });
    await h.submit();
    expect(h.state.session).toMatchObject({ status: 'revision', draftCount: 1, previousDraft: 'First try.', draftText: 'First try.' });
    const second = gradingHost({ session: { ...h.state.session, draftText: 'Second try.' }, active: A, history: [A], result: { status: 'revision', rawScore: 70, gradingDetails: { rawScore: 70 } } });
    await second.submit();
    expect(second.scope.handleMasteryGrading.mock.calls[0][3]).toBe(2);
    expect(second.state.session).toMatchObject({ draftCount: 2, previousDraft: 'Second try.' });
  });

  it('drops a late grade for a session that was replaced meanwhile', async () => {
    const session = { isOpen: true, status: 'writing', draftText: 'Old draft.', draftCount: 1, resourceId: 'A', sessionId: 's1' };
    const h = gradingHost({ session, active: A, history: [A], result: { status: 'revision', rawScore: 50, gradingDetails: { rawScore: 50 } } });
    const pending = h.submit();
    const replacement = { isOpen: true, status: 'writing', draftText: 'New scaffold draft', draftCount: 1, resourceId: 'B', sessionId: 's2' };
    h.state.session = replacement;
    await pending;
    expect(h.state.session).toBe(replacement);
  });
});

describe('mastery screen shows the actual score and award', () => {
  it('shows the graded score and +0 XP on a repeat mastery, not 100 and +200', () => {
    const el = render(DraftFeedbackInterface, { status: 'mastery', gradingDetails: { rawScore: 88, feedback: {} }, draftCount: 2, finalScore: 88, xpEarned: 0, onCancel: vi.fn(), setDraftText: vi.fn(), draftText: '' });
    const text = el.textContent;
    expect(text).toContain('88');
    expect(text).toContain('+0');
    expect(text).not.toContain('+200');
    expect(text).not.toMatch(/mastery\.final_score100/);
  });
});

describe('rubric generation is teacher-only and bound to its scaffold', () => {
  it('students and parents get no Generate or Regenerate Rubric button; teachers do', () => {
    const withRubric = paragraph('A', { rubric: '| a | b |' });
    const student = render(SentenceFramesView, viewProps({ generatedContent: withRubric, isTeacherMode: false }));
    expect(buttonTexts(student).some(text => /Rubric|Checklist/.test(text))).toBe(false);
    act(() => root.render(React.createElement(SentenceFramesView, viewProps({ generatedContent: withRubric, isTeacherMode: true, isParentMode: true }))));
    expect(buttonTexts(container).some(text => /Regenerate/.test(text))).toBe(false);
    act(() => root.render(React.createElement(SentenceFramesView, viewProps({ generatedContent: withRubric, isTeacherMode: true, t: key => key === 'scaffolds.regenerate_rubric' ? 'REGEN-X' : key }))));
    expect(buttonTexts(container)).toContain('REGEN-X');
  });

  it('the handler refuses to run for a student', async () => {
    const callGemini = vi.fn();
    await createHostHandlers({ generatedContent: paragraph('A'), isTeacherMode: false, callGemini, setIsGeneratingRubric: vi.fn(), addToast: vi.fn(), t: k => k, warnLog: vi.fn(), setError: vi.fn() }).handleGenerateRubric();
    expect(callGemini).not.toHaveBeenCalled();
  });

  function rubricHost(A, B) {
    const state = { history: [A, B], generatedContent: A };
    const ref = { current: state };
    let release;
    const scope = {
      _resourceMutationStateRef: ref, isTeacherMode: true, generatedContent: A, gradeLevel: '5th Grade',
      setHistory: fn => { state.history = fn(state.history); },
      setGeneratedContent: value => { state.generatedContent = typeof value === 'function' ? value(state.generatedContent) : value; },
      setIsGeneratingRubric: vi.fn(), addToast: vi.fn(), t: k => k, warnLog: vi.fn(), setError: vi.fn(),
      callGemini: vi.fn(() => new Promise(resolve => { release = resolve; }))
    };
    scope.onUpdateResource = createHostHandlers(scope).onUpdateResource;
    return { state, scope, run: () => createHostHandlers(scope).handleGenerateRubric(), release: value => release(value) };
  }

  it('a late rubric lands on its own scaffold without pulling the view back', async () => {
    const A = paragraph('A'), B = paragraph('B');
    const h = rubricHost(A, B);
    const pending = h.run();
    h.state.generatedContent = B;
    h.release('| Criteria | 1 |');
    await pending;
    expect(h.state.generatedContent.id).toBe('B');
    expect(h.state.history[0].data.rubric).toBe('| Criteria | 1 |');
    expect(h.state.history[1].data.rubric).toBeUndefined();
  });

  it('a late rubric is discarded when the teacher edited that scaffold meanwhile', async () => {
    const A = paragraph('A'), B = paragraph('B');
    const h = rubricHost(A, B);
    const pending = h.run();
    h.state.generatedContent = B;
    h.state.history = [{ ...A, data: { ...A.data, text: 'Plants need [a gas] and [water].' } }, B];
    h.release('| Criteria | 1 |');
    await pending;
    expect(h.state.history[0].data.text).toBe('Plants need [a gas] and [water].');
    expect(h.state.history[0].data.rubric).toBeUndefined();
    expect(h.state.generatedContent.id).toBe('B');
    expect(h.scope.addToast).toHaveBeenCalledWith(expect.any(String), 'warning');
  });
});

describe('scaffold content and presentation', () => {
  it('citations and Markdown links are not blanks', () => {
    const parts = SentenceFramesView.paragraphParts('Water [boils] at 100 C [1] and [see this](https://example.org) [2, 3].');
    expect(parts.filter(part => part.responseKey).map(part => part.text)).toEqual(['[boils]']);
    expect(SentenceFramesView.paragraphParts('The [first] and [second] ideas.').filter(part => part.responseKey).map(part => part.responseKey)).toEqual(['paragraph-1', 'paragraph-3']);
  });

  it('discussion prompts get a response placeholder, not "complete the sentence"', () => {
    const content = { id: 'D', type: 'sentence-frames', meta: 'Discussion Prompts - English', data: { mode: 'list', items: [{ text: 'Why do leaves change color?' }] } };
    const el = render(SentenceFramesView, viewProps({ generatedContent: content }));
    expect(el.querySelector('textarea').getAttribute('placeholder')).toBe('Write your response to the question...');
  });

  it('students do not see the teacher UDL banner', () => {
    const el = render(SentenceFramesView, viewProps({ isTeacherMode: false }));
    expect(el.textContent).not.toContain('about.action_title');
    act(() => root.render(React.createElement(SentenceFramesView, viewProps({ isTeacherMode: true }))));
    expect(container.textContent).toContain('about.action_title');
  });

  it('cloud scaffold output is normalized and an empty list is an error', () => {
    const normalize = Dispatcher && Dispatcher.normalizeScaffoldContent;
    expect(typeof normalize).toBe('function');
    expect(normalize({ mode: 'list', items: ['Why?', { prompt: 'How?' }, { text: 'What?', text_en: 'What?' }] }, 'Discussion Prompts'))
      .toEqual({ mode: 'list', items: [{ text: 'Why?' }, { prompt: 'How?', text: 'How?' }, { text: 'What?', text_en: 'What?' }], frameType: 'Discussion Prompts' });
    expect(() => normalize({ mode: 'list', items: [null, {}] }, 'Sentence Starters')).toThrow(/Scaffolds JSON/);
    expect(() => normalize({ mode: 'paragraph', text: '  ' }, 'Paragraph Frame')).toThrow(/Scaffolds JSON/);
    expect(DISPATCH_SOURCE).toMatch(/content = normalizeScaffoldContent\(JSON\.parse\(cleanJson\(result\)\), frameType\);/);
  });
});
