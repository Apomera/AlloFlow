// Assess (quiz) fixes from the 2026-09-27 core-resource review.
//
//  1. Non-live answers reach the teacher: QuizView mirrors the learner's answers
//     into the host's studentResponses (onRecordQuizResponses), so Submit Work
//     (handleSubmitAssignment) carries them. Before, they lived only in the
//     view's localStorage draft and the submission had no quiz responses.
//  2. Fact-check verdicts are parsed: a disputed key blocks "ready", the
//     teacher gets "Key disputed" + "Use suggested key", and students never see
//     a disputed check or raw markdown.
//  3. Answer-cue guards: a deterministic balance of key positions at
//     generation, and audit warnings for length rank, position, all/none of
//     the above, and absolute words only in distractors.
//  4. The manual fact check commits only to the quiz and question it checked.
//  5. "Start another attempt" asks inline before clearing saved responses.
//
// Mutation check: point the env vars at modules built from the pre-fix
// sources and every test here fails.
//   FIX0927_QUIZ_MODULE, FIX0927_HOST_MODULE, FIX0927_DISPATCHER_MODULE, FIX0927_ANTI

import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;

const QUIZ_MODULE = process.env.FIX0927_QUIZ_MODULE || 'view_quiz_module.js';
const HOST_MODULE = process.env.FIX0927_HOST_MODULE || 'host_handlers_module.js';
const DISPATCHER_MODULE = process.env.FIX0927_DISPATCHER_MODULE || 'generate_dispatcher_module.js';
const ANTI = process.env.FIX0927_ANTI || 'AlloFlowANTI.txt';

const t = key => key;
let QuizView, keyQuality, internals, createHandlers, dispatcher;

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
  new Function('window', quizSource.replace(registration, registration + '\n window.AlloModules.__Fix0927 = { feedback: AssessmentAttemptFeedback, submitted: AssessmentSubmittedPanel };'))(window);
  QuizView = window.AlloModules.QuizView;
  keyQuality = QuizView.keyQuality || {};
  internals = window.AlloModules.__Fix0927;
  new Function(readFileSync(HOST_MODULE, 'utf8'))();
  createHandlers = window.AlloModules.createHostHandlers;
  loadAlloModule('text_pipeline_helpers_module.js');
  loadAlloModule('generation_helpers_module.js');
  new Function(readFileSync(DISPATCHER_MODULE, 'utf8'))();
  dispatcher = window.AlloModules.GenDispatcher;
});

let root, host;
async function render(element) {
  if (!root) { host = document.createElement('div'); document.body.append(host); root = createRoot(host); }
  await act(async () => root.render(element));
}
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = host = null;
  localStorage.clear(); vi.restoreAllMocks(); vi.useRealTimers();
});
const buttonNamed = text => [...host.querySelectorAll('button')].find(el => el.textContent.trim() === text);

const DISPUTED = '**CORRECTION / WARNING:** The indicated answer is wrong.\n**Actual Correct Answer:** Mercury\nDISPUTED_EXPLANATION_TEXT';
const CONFIRMED = '[[KEY:CONFIRMED]]\n**Verified Correct Answer:** Venus\nCONFIRMED_EXPLANATION_TEXT\n**Why other options are incorrect:**\n* Mars is farther out.';
const planetQuestion = extra => ({ type: 'mcq', question: 'Which planet is closest to the Sun?', options: ['Mercury', 'Venus', 'Earth', 'Mars'], correctAnswer: 'Venus', conceptLabel: 'planets', ...extra });

const quizBase = extra => ({
  t, isTeacherMode: false, isParentMode: false, isIndependentMode: false, studentProjectSettings: {}, activeSessionCode: null, sessionData: {},
  isPresentationMode: false, isReviewGame: false, isEditingQuiz: false, escapeRoomState: { isActive: false }, presentationState: {}, reviewGameState: {},
  isFactChecking: {}, showQuizAnswers: false, leveledTextLanguage: 'English',
  formatInlineText: v => v, renderFormattedText: v => v, getReviewCategories: () => [], getRows: () => 1, playSound: vi.fn(), addToast: vi.fn(),
  handleToggleIsPresentationMode: vi.fn(), handleToggleIsReviewGame: vi.fn(), handleToggleIsEditingQuiz: vi.fn(), handleToggleShowQuizAnswers: vi.fn(),
  handlePresentationOptionClick: vi.fn(), togglePresentationAnswer: vi.fn(), togglePresentationExplanation: vi.fn(), resetPresentation: vi.fn(),
  handleQuizChange: vi.fn(), handleFactCheck: vi.fn(),
  ErrorBoundary: ({ children }) => children, TeacherLiveQuizControls: () => null, ConfettiExplosion: () => null, Stamp: ({ label }) => React.createElement('span', { 'data-stamp': label }),
  ...extra
});

describe('1. non-live quiz answers ride Submit Work', () => {
  it('records a chosen MCQ answer into the host channel and the submission payload carries it', async () => {
    const recorded = {};
    const onRecordQuizResponses = vi.fn((id, key, value) => { recorded[id] = { ...(recorded[id] || {}), [key]: value }; });
    const quiz = { id: 'quiz-round-trip', type: 'quiz', title: 'Planets', data: { questions: [planetQuestion(), { type: 'short-answer', question: 'Why?', expectedAnswer: 'PRIVATE_KEY_TEXT' }] } };
    await render(React.createElement(QuizView, quizBase({ generatedContent: quiz, onRecordQuizResponses })));
    const option = [...host.querySelectorAll('[role="button"]')].find(el => el.textContent.includes('Earth'));
    expect(option).toBeTruthy();
    await act(async () => { option.click(); });
    await act(async () => { await new Promise(r => setTimeout(r, 1200)); });
    expect(onRecordQuizResponses).toHaveBeenCalled();
    const draft = recorded['quiz-round-trip'] && recorded['quiz-round-trip'].assessmentDraft;
    expect(draft).toMatchObject({ kind: 'alloflow-assessment-responses', status: 'in-progress', answered: 1, total: 2 });
    expect(draft.items[0]).toMatchObject({ number: 1, answered: true, response: 'Earth' });
    expect(JSON.stringify(draft)).not.toContain('PRIVATE_KEY_TEXT');
    expect(JSON.stringify(draft)).not.toContain('"Venus"');

    const downloadSubmissionBackup = vi.fn();
    const deps = {
      history: [quiz], studentResponses: recorded, sanitizeSubmissionData: items => items, studentNickname: 'Blue Fox', studentProjectSettings: {},
      sourceTopic: 'Planets', generatedContent: quiz, alloStableAssignmentId: () => 'assignment-1', t: key => key, pasteEvents: [], adventureState: { level: 1 },
      globalPoints: 0, gameCompletions: {}, _alloCheckpointRecordsRef: { current: [] }, _alloLedgerRef: { current: null },
      downloadSubmissionBackup, addToast: vi.fn(), setIsSaveActionPulsing: vi.fn(), activeSessionCode: null
    };
    const result = await createHandlers(deps).handleSubmitAssignment('Blue Fox', {});
    expect(result).toMatchObject({ ok: true });
    const payload = downloadSubmissionBackup.mock.calls[0][0];
    expect(payload.answers['quiz-round-trip'].assessmentDraft.items[0].response).toBe('Earth');
    expect(payload.responses['quiz-round-trip'].assessmentDraft.answered).toBe(1);
  });

  it('the host mount wires onRecordQuizResponses into studentResponses', () => {
    const anti = readFileSync(ANTI, 'utf8');
    const mount = anti.indexOf('React.createElement(window.AlloModules.QuizView, {');
    expect(mount).toBeGreaterThan(0);
    const block = anti.slice(mount, anti.indexOf('})}', mount));
    const match = block.match(/onRecordQuizResponses: (\([^)]*\) => setStudentResponses\([^\n]*\)),\n/);
    expect(match).toBeTruthy();
    let state = { other: { keep: 1 }, 'quiz-1': { earlier: true } };
    const setStudentResponses = updater => { state = updater(state); };
    new Function('setStudentResponses', 'return ' + match[1])(setStudentResponses)('quiz-1', 'assessmentDraft', { answered: 2 });
    expect(state).toEqual({ other: { keep: 1 }, 'quiz-1': { earlier: true, assessmentDraft: { answered: 2 } } });
  });

  it('keeps the submitted attempt and tells a local learner Submit Work will include it', async () => {
    const receipt = { version: 1, attemptId: 'a1', submittedAt: 1, sessionCode: '', summary: { answered: 1, total: 1 }, delivery: { status: 'local' }, responses: {} };
    await render(React.createElement(internals.submitted, { receipt, includedInSubmitWork: true, onStartAnother: vi.fn(), onDownload: vi.fn(), onRetry: vi.fn() }));
    expect(host.textContent).toContain('will be included when you use Submit Work');
    expect(host.textContent).not.toContain('No teacher delivery was requested');
  });
});

describe('2. fact-check verdicts', () => {
  it('parses legacy and tokenised verdicts', () => {
    expect(keyQuality.readFactCheck).toBeTypeOf('function');
    expect(keyQuality.readFactCheck(DISPUTED, planetQuestion())).toMatchObject({ status: 'disputed', suggestedAnswer: 'Mercury', checkedKey: 'Venus' });
    expect(keyQuality.readFactCheck('[[KEY:DISPUTED:4]]\nAnything', planetQuestion())).toMatchObject({ status: 'disputed', suggestedAnswer: 'Mars' });
    expect(keyQuality.readFactCheck('[[KEY:DISPUTED:0]]\nTwo options are correct.', planetQuestion())).toMatchObject({ status: 'disputed', suggestedAnswer: '' });
    expect(keyQuality.readFactCheck(CONFIRMED, planetQuestion())).toMatchObject({ status: 'confirmed' });
    expect(keyQuality.readFactCheck('Some prose without a verdict.', planetQuestion())).toMatchObject({ status: 'unclear' });
  });

  it('a disputed key is an audit error, so the assessment is not ready', () => {
    const audit = keyQuality.auditAssessment({ questions: [planetQuestion({ factCheck: DISPUTED })] });
    expect(audit.ready).toBe(false);
    expect(audit.issues.map(issue => issue.code)).toContain('key-disputed');
    expect(keyQuality.auditAssessment({ questions: [planetQuestion({ factCheck: CONFIRMED })] }).ready).toBe(true);
  });

  it('teacher sees Key disputed and a Use suggested key action, not a VERIFIED stamp', async () => {
    const handleQuizChange = vi.fn();
    const quiz = { id: 'quiz-teacher', type: 'quiz', data: { questions: [planetQuestion({ factCheck: DISPUTED })] } };
    await render(React.createElement(QuizView, quizBase({ isTeacherMode: true, generatedContent: quiz, handleQuizChange })));
    expect(host.textContent).toContain('Key disputed');
    expect(host.querySelector('[data-stamp="quiz.verified_stamp"]')).toBeNull();
    const use = buttonNamed('Use suggested key');
    expect(use).toBeTruthy();
    await act(async () => use.click());
    expect(handleQuizChange).toHaveBeenCalledWith(0, 'correctAnswer', 'Mercury');
  });

  it('a facilitator cannot project a disputed check (a confirmed one stays revealable)', async () => {
    const presenter = q => quizBase({ isTeacherMode: true, isPresentationMode: true, generatedContent: { id: 'present-1', type: 'quiz', data: { questions: [q] } } });
    const explanationButton = () => [...host.querySelectorAll('button')].find(el => /^(show explanation|quiz\.show_explanation)$/i.test(el.textContent.trim()) || /^(show explanation|quiz\.show_explanation)$/i.test(el.getAttribute('aria-label') || ''));
    await render(React.createElement(QuizView, presenter(planetQuestion({ factCheck: CONFIRMED }))));
    expect(explanationButton()).toBeTruthy();
    await render(React.createElement(QuizView, presenter(planetQuestion({ factCheck: DISPUTED }))));
    expect(explanationButton()).toBeFalsy();
  });

  it('students never see a disputed check, and a confirmed one has no raw markdown', async () => {
    const data = { questions: [planetQuestion({ factCheck: DISPUTED }), planetQuestion({ question: 'Second?', factCheck: CONFIRMED })] };
    const receipt = { responses: { root: { mcqAnswers: { 0: 2, 1: 1 } } } };
    await render(React.createElement(internals.feedback, { data, receipt, formatInlineText: v => v }));
    expect(host.textContent).not.toContain('DISPUTED_EXPLANATION_TEXT');
    expect(host.textContent).not.toContain('CORRECTION');
    expect(host.textContent).toContain('CONFIRMED_EXPLANATION_TEXT');
    expect(host.textContent).not.toContain('**');
    expect(host.textContent).not.toContain('[[KEY');
    expect(host.textContent).toContain('Your teacher is reviewing this answer.');
  });
});

describe('3. answer-cue guards', () => {
  const biased = Array.from({ length: 12 }, (_, i) => ({
    type: 'mcq', question: 'Question ' + i, options: ['The fully detailed correct answer ' + i, 'Wrong b' + i, 'Wrong c' + i, 'Wrong d' + i],
    correctAnswer: 'The fully detailed correct answer ' + i, options_en: ['KEY_EN', 'b', 'c', 'd'],
    optionImageUrls: ['key.png', 'b.png', 'c.png', 'd.png'], optionImageAltTexts: ['KEY_ALT', 'b alt', 'c alt', 'd alt']
  }));

  it('balances key positions and moves translations, images, and alt text with their option', () => {
    expect(keyQuality.balanceChoiceKeys).toBeTypeOf('function');
    const out = keyQuality.balanceChoiceKeys(biased);
    const counts = [0, 0, 0, 0];
    out.forEach((q, idx) => {
      const at = q.options.indexOf(q.correctAnswer);
      counts[at]++;
      expect([q.options_en[at], q.optionImageUrls[at], q.optionImageAltTexts[at]]).toEqual(['KEY_EN', 'key.png', 'KEY_ALT']);
      expect(q.options.slice().sort()).toEqual(biased[idx].options.slice().sort());
    });
    counts.forEach(count => { expect(count / out.length).toBeGreaterThanOrEqual(0.1); expect(count / out.length).toBeLessThanOrEqual(0.4); });
    expect(biased[0].options[0]).toContain('correct');
    expect(JSON.stringify(keyQuality.balanceChoiceKeys(biased))).toBe(JSON.stringify(out));
  });

  it('leaves order-dependent items alone and keeps multi-select keys valid', () => {
    const fixed = [
      { type: 'mcq', question: 'T/F', options: ['True', 'False'], correctAnswer: 'False' },
      { type: 'mcq', question: 'Which?', options: ['Red', 'Blue', 'Green', 'All of the above'], correctAnswer: 'All of the above' },
      { type: 'mcq', question: 'How many?', options: ['2', '4', '6', '8'], correctAnswer: '6' },
      { type: 'multi-select', question: 'Pick', options: ['A1', 'B1', 'C1', 'D1'], correctAnswers: ['A1', 'C1'], options_en: ['a', 'b', 'c', 'd'] }
    ];
    const out = keyQuality.balanceChoiceKeys(fixed);
    expect(out[0].options).toEqual(['True', 'False']);
    expect(out[1].options).toEqual(fixed[1].options);
    expect(out[2].options).toEqual(fixed[2].options);
    expect(out[3].correctAnswers.every(answer => out[3].options.includes(answer))).toBe(true);
    expect(out[3].options.map(option => out[3].options_en[out[3].options.indexOf(option)])).toEqual(out[3].options.map(option => ({ A1: 'a', B1: 'b', C1: 'c', D1: 'd' })[option]));
  });

  it('warns on length-rank and position skew, all/none of the above, and absolute words only in distractors', () => {
    const codes = keyQuality.answerCueIssues(biased).map(issue => issue.code);
    expect(codes).toContain('key-length-rank');
    expect(codes).toContain('key-position');
    const balanced = keyQuality.answerCueIssues(keyQuality.balanceChoiceKeys(biased)).map(issue => issue.code);
    expect(balanced).not.toContain('key-position');
    expect(balanced).toContain('key-length-rank');
    const items = keyQuality.answerCueIssues([
      { type: 'mcq', question: 'x', options: ['Red', 'Blue', 'None of the above', 'Green'], correctAnswer: 'Red' },
      { type: 'mcq', question: 'y', options: ['Plants make food', 'Plants always sleep', 'Plants never grow', 'Plants eat rocks'], correctAnswer: 'Plants make food' }
    ]).map(issue => issue.code + ':' + issue.questionIdx);
    expect(items).toContain('order-reference-option:0');
    expect(items).toContain('absolute-distractor:1');
    const audit = keyQuality.auditAssessment({ questions: biased });
    expect(audit.ready).toBe(true);
    expect(audit.issues.some(issue => issue.code === 'key-length-rank' && issue.severity === 'warning')).toBe(true);
  });

  it('generation adds cue rules, balances keys, and stamps the parsed verdict', async () => {
    expect(dispatcher && typeof dispatcher.handleGenerate).toBe('function');
    const prompts = [];
    const generated = Array.from({ length: 8 }, (_, i) => ({ type: 'mcq', question: 'Generated ' + i, options: ['Alpha answer ' + i, 'Beta ' + i, 'Gamma ' + i, 'Delta ' + i], correctAnswer: 'Alpha answer ' + i, conceptLabel: 'c' }));
    const captured = [];
    const explicit = {
      history: [], inputText: 'Planets orbit the Sun.', gradeLevel: '5th Grade', leveledTextLanguage: 'English', selectedLanguages: [], differentiationRange: 'None',
      quizMcqCount: 8, quizReflectionCount: 0, dokLevel: '', targetStandards: [], standardsInput: '', isTeacherMode: true, isParentMode: false, isIndependentMode: false,
      GUIDED_STEPS: [], LENGTH_THRESHOLDS: { short: 200, medium: 500, long: 900 }, TIMELINE_MODE_DEFINITIONS: {},
      cleanJson: s => String(s).replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, ''),
      callGemini: vi.fn(async prompt => {
        const text = String(prompt);
        prompts.push(text);
        if (text.includes('Verify the factual accuracy')) return text.includes('Generated 3') ? '[[KEY:DISPUTED:2]]\n**CORRECTION / WARNING:** wrong' : '[[KEY:CONFIRMED]]\n**Verified Correct Answer:** ok';
        if (text.includes('Return ONLY valid JSON')) return JSON.stringify({ questions: generated, reflections: [] });
        return '{}';
      }),
      setGeneratedContent: value => { if (value && typeof value === 'object' && value.type === 'quiz') captured.push(value); },
      setHistory: () => {}, t: key => key, warnLog: () => {}, debugLog: () => {}, addToast: () => {}
    };
    const CALLABLE = /^(set|handle|get|call|build|format|parse|validate|compute|generate|execute|apply|fetch|is|has|can|should|split|chunk|count|filter|detect|repair|reset|reverify|perform|normalize|sanitize|fix|extract|process|reg|flyTo|fisher)/;
    const deps = new Proxy(explicit, {
      get(target, prop) {
        if (prop in target) return target[prop];
        if (typeof prop !== 'string') return undefined;
        if (CALLABLE.test(prop)) return () => '';
        if (/s$/.test(prop) && /^(selected|target|suggested)/.test(prop)) return [];
        return '';
      },
      has: () => true
    });
    try { await dispatcher.handleGenerate('quiz', null, false, null, { quizMcqCount: 8 }, true, deps); } catch (e) { /* later pipeline steps may need more deps */ }
    const main = prompts.find(p => p.includes('Return ONLY valid JSON'));
    expect(main).toBeTruthy();
    expect(main).toContain('ANSWER-CUE RULES');
    expect(prompts.find(p => p.includes('Verify the factual accuracy'))).toContain('[[KEY:CONFIRMED]]');
    expect(captured.length).toBeGreaterThan(0);
    const questions = captured[captured.length - 1].data.questions;
    expect(questions).toHaveLength(8);
    const counts = [0, 0, 0, 0];
    questions.forEach(q => counts[q.options.indexOf(q.correctAnswer)]++);
    expect(Math.max(...counts)).toBeLessThanOrEqual(3);
    const disputed = questions.find(q => q.question === 'Generated 3');
    expect(disputed.keyCheck).toMatchObject({ status: 'disputed', suggestedAnswer: 'Beta 3', checkedKey: 'Alpha answer 3' });
    expect(questions.find(q => q.question === 'Generated 0').keyCheck).toMatchObject({ status: 'confirmed' });
  });
});

describe('4. manual fact check ownership', () => {
  function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }
  it('commits only to the quiz and unchanged question it checked', async () => {
    const request = deferred();
    const first = { id: 'quiz-a', type: 'quiz', data: { questions: [planetQuestion()] } };
    const second = { id: 'quiz-b', type: 'quiz', data: { questions: [planetQuestion({ question: 'Other quiz question?' })] } };
    const deps = { generatedContent: first, gradeLevel: '5th', t: key => key, leveledTextLanguage: 'English', resolveTranslationPolicy: () => ({ enabled: false }), translationTargetChoices: () => [],
      callGemini: vi.fn(() => request.promise), setIsFactChecking: vi.fn(), setGeneratedContent: vi.fn(), setHistory: vi.fn(), warnLog: vi.fn() };
    const running = createHandlers(deps).handleFactCheck(0);
    deps.generatedContent = second;
    request.resolve('[[KEY:DISPUTED:1]]\n**CORRECTION / WARNING:** wrong');
    await running;
    expect(second.data.questions[0].factCheck).toBeUndefined();
    expect(deps.setGeneratedContent).toHaveBeenCalledTimes(1);
    const updateLive = deps.setGeneratedContent.mock.calls[0][0];
    expect(typeof updateLive).toBe('function');
    expect(updateLive(second)).toBe(second);
    const history = deps.setHistory.mock.calls[0][0]([first, second]);
    expect(history[1]).toBe(second);
    expect(history[0].data.questions[0]).toMatchObject({ factCheck: expect.stringContaining('CORRECTION'), keyCheck: { status: 'disputed', suggestedAnswer: 'Mercury' } });
    const edited = { ...first, data: { questions: [planetQuestion({ correctAnswer: 'Mercury' })] } };
    expect(deps.setHistory.mock.calls[0][0]([edited])[0]).toBe(edited);
  });
});

describe('5. start another attempt asks first', () => {
  it('shows an inline confirmation before clearing saved responses', async () => {
    const onStartAnother = vi.fn();
    const receipt = { version: 1, attemptId: 'a1', submittedAt: 1, sessionCode: '', summary: { answered: 1, total: 2 }, delivery: { status: 'local' }, responses: {} };
    await render(React.createElement(internals.submitted, { receipt, onStartAnother, onDownload: vi.fn(), onRetry: vi.fn(), copy: (key, fallback) => fallback }));
    await act(async () => buttonNamed('Start another attempt').click());
    expect(onStartAnother).not.toHaveBeenCalled();
    expect(host.querySelector('[data-assessment-restart-confirm]')).toBeTruthy();
    expect(document.activeElement && document.activeElement.textContent).toBe('Clear and start again');
    await act(async () => buttonNamed('Keep this attempt').click());
    expect(onStartAnother).not.toHaveBeenCalled();
    expect(document.activeElement && document.activeElement.textContent).toBe('Start another attempt');
    await act(async () => buttonNamed('Start another attempt').click());
    await act(async () => buttonNamed('Clear and start again').click());
    expect(onStartAnother).toHaveBeenCalledTimes(1);
  });
});
