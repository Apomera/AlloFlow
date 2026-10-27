// Lane A (grading) fixes from the 2026-10-25 main-24 review.
//
//  1. Fill-in-the-blank has one verdict. The deterministic key grader tolerates
//     case, whitespace, and surrounding punctuation; the learner card asks it
//     first; the AI verdict the learner saw is recorded with the answer, and a
//     key miss the AI called correct goes to teacher review, never "incorrect".
//  2. Edits clear keyCheck with factCheck, and a stored check is fingerprinted
//     to the stem + option set, so a reworded item cannot keep a stale verdict.
//  3. Regenerate and Repair carry the answer-cue rules and re-balance key
//     positions; neither sends the old key check to the AI.
//  4. Student-facing quiz labels go through the translator.
//  5. The lesson-plan extension guide is written in the plan's language.
//  6. The cue audit also counts answer-evidence keys.
//
// Mutation check: point FIX1025A_QUIZ_MODULE / FIX1025A_HOST_MODULE /
// FIX1025A_AGGREGATORS at the pre-fix copies and every test here fails.

import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;

const QUIZ_MODULE = process.env.FIX1025A_QUIZ_MODULE || 'view_quiz_module.js';
const HOST_MODULE = process.env.FIX1025A_HOST_MODULE || 'host_handlers_module.js';
const AGGREGATORS = process.env.FIX1025A_AGGREGATORS || 'quiz_live_aggregators.js';

const identity = key => key;
let QuizView, keyQuality, agg, createHandlers;

beforeAll(() => {
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloLanguageContext = React.createContext({ t: identity });
  window.__alloT = identity;
  window.AlloIcons = {};
  window.AlloModules = window.AlloModules || {};
  new Function('window', readFileSync(AGGREGATORS, 'utf8'))(window);
  agg = window.AlloModules.QuizLiveAggregators;
  new Function('window', readFileSync(QUIZ_MODULE, 'utf8'))(window);
  QuizView = window.AlloModules.QuizView;
  keyQuality = QuizView.keyQuality || {};
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
  window.__alloT = identity;
  delete window.AlloModules.QuizAIHelpers;
});
const buttonNamed = text => [...host.querySelectorAll('button')].find(el => el.textContent.trim() === text);
const flush = ms => act(async () => { await new Promise(r => setTimeout(r, ms)); });
function typeInto(el, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

const quizBase = extra => ({
  t: identity, isTeacherMode: false, isParentMode: false, isIndependentMode: false, studentProjectSettings: {}, activeSessionCode: null, sessionData: {},
  isPresentationMode: false, isReviewGame: false, isEditingQuiz: false, escapeRoomState: { isActive: false }, presentationState: {}, reviewGameState: {},
  isFactChecking: {}, showQuizAnswers: false, leveledTextLanguage: 'English',
  formatInlineText: v => v, renderFormattedText: v => v, getReviewCategories: () => [], getRows: () => 1, playSound: vi.fn(), addToast: vi.fn(),
  handleToggleIsPresentationMode: vi.fn(), handleToggleIsReviewGame: vi.fn(), handleToggleIsEditingQuiz: vi.fn(), handleToggleShowQuizAnswers: vi.fn(),
  handlePresentationOptionClick: vi.fn(), togglePresentationAnswer: vi.fn(), togglePresentationExplanation: vi.fn(), resetPresentation: vi.fn(),
  handleQuizChange: vi.fn(), handleFactCheck: vi.fn(),
  ErrorBoundary: ({ children }) => children, TeacherLiveQuizControls: () => null, ConfettiExplosion: () => null, Stamp: ({ label }) => React.createElement('span', { 'data-stamp': label }),
  ...extra
});

const blank = extra => ({ type: 'fill-blank', question: 'Plants make food by ___.', expectedFill: 'photosynthesis', acceptableAlternatives: [], conceptLabel: 'plants', ...extra });
const fillResponse = (text, aiVerdict) => ({ itemType: 'fill-blank', answer: aiVerdict ? { text, aiVerdict } : { text } });

describe('1a. fill-blank key grader (pure)', () => {
  it('tolerates case, whitespace, wrapping quotes and sentence punctuation, but not signs', () => {
    expect(typeof agg.normalizeFillBlankComparable).toBe('function');
    expect(agg.normalizeFillBlankComparable('  Photosynthesis. ')).toBe('photosynthesis');
    expect(agg.normalizeFillBlankComparable('"Cell   wall!"')).toBe('cell wall');
    expect(agg.normalizeFillBlankComparable('-5')).toBe('-5');
    const grade = text => agg.gradePresentationResponse(fillResponse(text), blank());
    expect(grade('Photosynthesis.')).toMatchObject({ status: 'correct', evaluable: true });
    expect(grade(' “PHOTOSYNTHESIS” ')).toMatchObject({ status: 'correct', evaluable: true });
    expect(agg.gradePresentationResponse(fillResponse('5'), blank({ expectedFill: '-5' }))).toMatchObject({ status: 'incorrect' });
  });

  it('routes a key miss the learner was told is correct to review, never incorrect', () => {
    const typo = agg.gradePresentationResponse(fillResponse('photosynthesys', 'correct'), blank());
    expect(typo).toMatchObject({ status: 'submitted', evaluable: false, needsReview: true, studentAiVerdict: 'correct' });
    // A different real word is the reason this is review, not auto-accept.
    const otherWord = agg.gradePresentationResponse(fillResponse('affect', 'correct'), blank({ question: 'The ___ of rain on soil.', expectedFill: 'effect' }));
    expect(otherWord.status).toBe('submitted');
    expect(otherWord.isCorrect).toBe(null);
    expect(agg.gradePresentationResponse(fillResponse('photosynthesys', 'incorrect'), blank()).status).toBe('incorrect');
    expect(agg.gradePresentationResponse(fillResponse('photosynthesys'), blank()).status).toBe('incorrect');
    // The gradebook path (gradeResponseForItem) agrees, and the review flag does
    // not change the response fingerprint teacher overrides are bound to.
    expect(agg.gradeResponseForItem(fillResponse('photosynthesys', 'correct'), blank()).status).toBe('submitted');
    expect(agg.assessmentResponseFingerprint(blank(), fillResponse('photosynthesys', 'correct')))
      .toBe(agg.assessmentResponseFingerprint(blank(), fillResponse('photosynthesys')));
  });
});

describe('1b. learner fill-blank card', () => {
  async function mountBlank(gradeFillBlank, extra) {
    window.AlloModules.QuizAIHelpers = { gradeFillBlank, gradeFreeformAnswer: vi.fn() };
    const packets = [];
    const recorded = {};
    const quiz = { id: 'quiz-blank', type: 'quiz', title: 'Plants', data: { questions: [blank()] } };
    await render(React.createElement(QuizView, quizBase({
      generatedContent: quiz, activeSessionCode: 'S1', sessionData: { quizState: { activityId: 'act-1' } }, user: { uid: 'u1' },
      onSubmitLiveAnswer: vi.fn(packet => { packets.push(packet); return Promise.resolve({ status: 'received' }); }),
      onRecordQuizResponses: vi.fn((id, key, value) => { recorded[key] = value; }),
      callGemini: vi.fn(), gradeLevel: '5th', ...extra
    })));
    // The label now names its question: "Fill in the blank — Question 1: …".
    const input = host.querySelector('input[aria-label^="Fill in the blank — Question 1"]');
    expect(input).toBeTruthy();
    return { packets, recorded, input };
  }

  it('an exact (normalized) key match is correct without asking the AI', async () => {
    const gradeFillBlank = vi.fn(async () => ({ status: 'incorrect', feedback: 'AI disagrees' }));
    const { packets, input } = await mountBlank(gradeFillBlank);
    await act(async () => typeInto(input, 'Photosynthesis.'));
    await act(async () => buttonNamed('Grade my answer').click());
    await flush(20);
    expect(gradeFillBlank).not.toHaveBeenCalled();
    expect(host.textContent).toContain('Correct');
    expect(host.textContent).not.toContain('AI disagrees');
    expect(agg.gradePresentationResponse(packets[packets.length - 1], blank()).status).toBe('correct');
  });

  it('records the AI verdict with the answer, so the teacher sees review instead of incorrect', async () => {
    const gradeFillBlank = vi.fn(async () => ({ status: 'correct', feedback: 'Close enough.' }));
    const { packets, recorded, input } = await mountBlank(gradeFillBlank);
    await act(async () => typeInto(input, 'photosynthesys'));
    await act(async () => buttonNamed('Grade my answer').click());
    await flush(30);
    expect(gradeFillBlank).toHaveBeenCalledTimes(1);
    expect(host.textContent).toContain('Your teacher will confirm this answer');
    const last = packets[packets.length - 1];
    expect(last.answer).toMatchObject({ text: 'photosynthesys', aiVerdict: 'correct' });
    expect(agg.gradeResponseForItem(last, blank())).toMatchObject({ status: 'submitted', needsReview: true });
    await flush(1200);
    const item = recorded.assessmentDraft && recorded.assessmentDraft.items[0];
    expect(item && item.answer).toMatchObject({ text: 'photosynthesys', aiVerdict: 'correct' });
  });
});

describe('2. key checks follow the item they judged', () => {
  const mcq = extra => ({ type: 'mcq', question: 'Which planet is closest to the Sun?', options: ['Mercury', 'Venus', 'Earth', 'Mars'], correctAnswer: 'Venus', ...extra });
  const DISPUTED = '[[KEY:DISPUTED:1]]\n**CORRECTION / WARNING:** wrong';

  it('a reworded stem makes a stored verdict stale; reordering options does not', () => {
    const q = mcq();
    const check = keyQuality.readFactCheck(DISPUTED, q);
    expect(check.status).toBe('disputed');
    const stored = mcq({ factCheck: DISPUTED, keyCheck: check });
    expect(agg.isAnswerKeyDisputed(stored)).toBe(true);
    const reordered = { ...stored, options: ['Mars', 'Earth', 'Venus', 'Mercury'] };
    expect(keyQuality.keyCheck(reordered).status).toBe('disputed');
    const reworded = { ...stored, question: 'Which planet is farthest from the Sun?', factCheck: null };
    expect(keyQuality.keyCheck(reworded).status).toBe('stale');
    expect(agg.isAnswerKeyDisputed(reworded)).toBe(false);
    const newOption = { ...stored, options: ['Mercury', 'Venus', 'Earth', 'Jupiter'] };
    expect(agg.isAnswerKeyDisputed(newOption)).toBe(false);
    // Checks stored before the fingerprint keep the key-only rule.
    const legacy = mcq({ question: 'Reworded?', keyCheck: { status: 'disputed', suggestedAnswer: '', checkedKey: 'Venus' } });
    expect(agg.isAnswerKeyDisputed(legacy)).toBe(true);
  });

  it('every quiz edit handler clears keyCheck together with factCheck', async () => {
    const stale = { factCheck: DISPUTED, keyCheck: { status: 'disputed', suggestedAnswer: 'Mercury', checkedKey: 'Venus' } };
    const quiz = () => ({ id: 'q1', type: 'quiz', data: { questions: [mcq(stale), mcq(stale)] } });
    function run(call) {
      const deps = { generatedContent: quiz(), setGeneratedContent: vi.fn(), setHistory: vi.fn(), t: identity, isTeacherMode: true };
      const result = call(createHandlers(deps), deps);
      const arg = deps.setGeneratedContent.mock.calls[0] && deps.setGeneratedContent.mock.calls[0][0];
      return { result, content: typeof arg === 'function' ? arg(deps.generatedContent) : arg };
    }
    const patched = run(h => h.handleQuizQuestionAction(0, 'patch', { question: 'Edited stem?' })).content;
    expect(patched.data.questions[0].keyCheck).toBe(null);
    const replaced = run(h => h.handleQuizQuestionAction(0, 'replace', mcq({ question: 'New?', keyCheck: stale.keyCheck }))).content;
    expect(replaced.data.questions[0].keyCheck).toBe(null);
    const duplicated = run(h => h.handleQuizQuestionAction(0, 'duplicate')).content;
    expect(duplicated.data.questions[1].keyCheck).toBe(null);
    const changed = run(h => h.handleQuizChange(0, 'question', 'Edited inline?')).content;
    expect(changed.data.questions[0].keyCheck).toBe(null);
    // Guarded replace (Regenerate) as well.
    const deps = { generatedContent: quiz(), setGeneratedContent: vi.fn(), setHistory: vi.fn(), t: identity };
    const original = deps.generatedContent.data.questions[1];
    await createHandlers(deps).handleQuizQuestionAction(1, 'replace', mcq({ question: 'Regenerated?', keyCheck: stale.keyCheck }), {
      resourceId: 'q1', questionIndex: 1, question: original, questionSignature: JSON.stringify(original)
    });
    const guarded = deps.setGeneratedContent.mock.calls[0][0](deps.generatedContent);
    expect(guarded.data.questions[1].keyCheck).toBe(null);
  });
});

describe('3. regenerate and repair keep the answer-cue safeguards', () => {
  const ae = (i, extra) => ({
    type: 'answer-evidence', question: 'Claim ' + i + '?', answerOptions: ['Right ' + i, 'Wrong a' + i, 'Wrong b' + i, 'Wrong c' + i], correctAnswer: 'Right ' + i,
    evidencePrompt: 'Why?', evidenceOptions: ['Proof ' + i, 'Noise a' + i, 'Noise b' + i, 'Noise c' + i], correctEvidence: 'Proof ' + i, conceptLabel: 'c', ...extra
  });

  it('a regenerated item gets the cue rules, no old key check, and a key off the over-used position', async () => {
    const prompts = [];
    const questions = [ae(0), ae(1), ae(2, { factCheck: 'SECRET_FACTCHECK_TEXT', keyCheck: { status: 'confirmed', checkedKey: 'x' } })];
    const callGemini = vi.fn(async prompt => { prompts.push(String(prompt)); return JSON.stringify(ae(9)); });
    const handleQuizQuestionAction = vi.fn(async () => ({ status: 'queued' }));
    await render(React.createElement(QuizView, quizBase({
      isTeacherMode: true, isEditingQuiz: true, callGemini, handleQuizQuestionAction, inputText: 'Source.',
      generatedContent: { id: 'quiz-regen', type: 'quiz', title: 'T', data: { questions } }
    })));
    const regen = [...host.querySelectorAll('button')].filter(el => el.textContent.trim() === 'Regenerate item');
    expect(regen.length).toBe(3);
    await act(async () => regen[2].click());
    await flush(20);
    expect(prompts).toHaveLength(1);
    expect(prompts[0].includes('ANSWER-CUE RULES'), 'cue rules in the regenerate prompt').toBe(true);
    expect(prompts[0].includes('SECRET_FACTCHECK_TEXT'), 'old fact check sent to the AI').toBe(false);
    expect(prompts[0].includes('keyCheck'), 'old key check sent to the AI').toBe(false);
    const call = handleQuizQuestionAction.mock.calls.find(c => c[1] === 'replace');
    expect(call).toBeTruthy();
    const replacement = call[2];
    // Items 0 and 1 key position A for both parts; the replacement must not.
    expect(replacement.answerOptions.indexOf('Right 9')).toBeGreaterThan(0);
    expect(replacement.evidenceOptions.indexOf('Proof 9')).toBeGreaterThan(0);
    expect(replacement.correctAnswer).toBe('Right 9');
  });

  it('a repair gets the cue rules, a balanced key distribution, and keeps checks of unchanged items', async () => {
    const prompts = [];
    const CONFIRMED = '[[KEY:CONFIRMED]]\n**Verified Correct Answer:** Alpha answer 0';
    const mcqs = Array.from({ length: 8 }, (_, i) => ({ type: 'mcq', question: 'Generated ' + i, options: ['Alpha answer ' + i, 'Beta ' + i, 'Gamma ' + i, 'Delta ' + i], correctAnswer: 'Alpha answer ' + i, conceptLabel: 'c' }));
    const checked = { ...mcqs[0], factCheck: CONFIRMED };
    checked.keyCheck = keyQuality.readFactCheck(CONFIRMED, checked);
    const broken = { type: 'mcq', question: 'Broken?', options: ['A1', 'B1', 'C1', 'D1'], correctAnswer: 'Not an option', conceptLabel: 'c' };
    const callGemini = vi.fn(async prompt => { prompts.push(String(prompt)); return JSON.stringify({ questions: mcqs }); });
    const handleQuizQuestionAction = vi.fn();
    await render(React.createElement(QuizView, quizBase({
      isTeacherMode: true, callGemini, handleQuizQuestionAction, inputText: 'Source.',
      generatedContent: { id: 'quiz-repair', type: 'quiz', title: 'T', data: { questions: [checked, broken] } }
    })));
    const fix = buttonNamed('Fix flagged and missing items');
    expect(fix).toBeTruthy();
    await act(async () => fix.click());
    await flush(20);
    expect(prompts[0].includes('ANSWER-CUE RULES'), 'cue rules in the repair prompt').toBe(true);
    expect(prompts[0].includes('Verified Correct Answer'), 'old fact check sent to the AI').toBe(false);
    const call = handleQuizQuestionAction.mock.calls.find(c => c[1] === 'replace-all');
    expect(call).toBeTruthy();
    const repaired = call[2].questions;
    const counts = [0, 0, 0, 0];
    repaired.forEach(q => counts[q.options.indexOf(q.correctAnswer)]++);
    expect(Math.max(...counts)).toBeLessThanOrEqual(3);
    const kept = repaired.find(q => q.question === 'Generated 0');
    expect(kept.keyCheck && kept.keyCheck.status).toBe('confirmed');
    expect(keyQuality.keyCheck(kept).status).toBe('confirmed');
    expect(repaired.find(q => q.question === 'Generated 1').keyCheck).toBeUndefined();
  });
});

describe('4. student-facing labels are translated', () => {
  it('check buttons, the idk button, and Review & submit use the translator', async () => {
    window.__alloT = key => (/^quiz\.student\./.test(key) || key === 'ui_common.i_dont_know' ? '⟦' + key + '⟧' : key);
    const questions = [
      { type: 'multi-select', question: 'Pick two', options: ['a', 'b', 'c', 'd'], correctAnswers: ['a', 'b'], conceptLabel: 'c' },
      { type: 'answer-evidence', question: 'Claim?', answerOptions: ['r', 'w1', 'w2', 'w3'], correctAnswer: 'r', evidencePrompt: 'Why?', evidenceOptions: ['p', 'n1', 'n2', 'n3'], correctEvidence: 'p', conceptLabel: 'c' },
      { type: 'numeric-response', question: 'How many?', correctValue: 4, tolerance: 0, unit: '', conceptLabel: 'c' },
      blank()
    ];
    await render(React.createElement(QuizView, quizBase({
      generatedContent: { id: 'quiz-i18n', type: 'quiz', title: 'T', data: { questions } },
      modeStrategy: { render: { allowIDontKnow: true, allowConfidenceRating: true } }
    })));
    const text = host.textContent;
    for (const key of ['quiz.student.check_selections', 'quiz.student.check_both_parts', 'quiz.student.check_value', 'quiz.student.grade_my_answer', 'quiz.student.review_submit', 'quiz.student.type_fill_blank']) {
      expect(text.includes('⟦' + key + '⟧'), key).toBe(true);
    }
    expect(text.includes('Check selections')).toBe(false);
    expect(text.includes('Review & submit')).toBe(false);
  });
});

describe('5. extension guide follows the lesson plan language', () => {
  it('asks for the guide in the plan language with the plan focus and grade', async () => {
    const plan = {
      id: 'lp1', type: 'lesson-plan', title: 'La fotosíntesis', config: { language: 'Spanish', grade: '5th Grade' },
      data: { essentialQuestion: '¿Cómo hacen alimento las plantas?', objectives: ['Explicar la fotosíntesis'], extensions: [{ title: 'Experimento de hojas', description: 'Observar hojas' }] }
    };
    const prompts = [];
    const deps = new Proxy({
      generatedContent: plan, _extensionGuideRequests: { current: new Map() }, _resourceMutationStateRef: { current: { history: [plan], generatedContent: plan } },
      onUpdateResource: vi.fn(() => true), setIsGeneratingExtensionGuide: vi.fn(), addToast: vi.fn(), warnLog: vi.fn(), t: identity, leveledTextLanguage: 'English',
      callGemini: vi.fn(async prompt => { prompts.push(String(prompt)); return '# Guía'; })
    }, { get: (target, prop) => (prop in target ? target[prop] : undefined) });
    await createHandlers(deps).handleGenerateExtensionGuide(0);
    expect(prompts).toHaveLength(1);
    expect(prompts[0]).toContain('Write the entire guide in Spanish');
    expect(prompts[0]).toContain('¿Cómo hacen alimento las plantas?');
    expect(prompts[0]).toContain('5th Grade');
  });
});

describe('6. cue audit counts answer-evidence keys', () => {
  it('flags evidence keys that always sit in the same position', () => {
    const items = Array.from({ length: 6 }, (_, i) => {
      const answers = ['w1 ' + i, 'w2 ' + i, 'w3 ' + i];
      answers.splice(i % 4, 0, 'right ' + i);
      return { type: 'answer-evidence', question: 'Q' + i, answerOptions: answers, correctAnswer: 'right ' + i, evidencePrompt: 'Why?', evidenceOptions: ['proof ' + i, 'n1 ' + i, 'n2 ' + i, 'n3 ' + i], correctEvidence: 'proof ' + i };
    });
    const codes = keyQuality.answerCueIssues(items).map(issue => issue.code);
    expect(codes).toContain('key-position');
  });
});
