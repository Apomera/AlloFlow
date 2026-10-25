// Lane A follow-up (A2), 2026-10-25.
//
//  1. Submit Work inbox: the fill-blank AI verdict reaches the grader, so an
//     AI-accepted near-miss is "review", not "incorrect".
//  2. teacher-release quizzes travel without their key (live session and
//     packs). Drafts and releases use a key-independent identity; the release
//     carries a per-question key (session doc and a re-shared released copy);
//     the learner sees AssessmentAttemptFeedback with the released key.
//  3. Sequence Sense withheld copies ship items in displayed order (no order
//     leak); grading maps displayed positions back through the teacher copy.
//  4. The bulk distractor edit clears keyCheck.
//
// Mutation check: FIX1025A2_QUIZ_MODULE / _HOST_MODULE / _AGGREGATORS /
// _FIRESTORE / _LIVE_AAC / _INBOX at pre-fix copies turn these red.

import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;
const { buildLiveAacModule } = require('../_build_live_aac_module.js');

const env = (name, fallback) => process.env[name] || fallback;
const QUIZ = env('FIX1025A2_QUIZ_MODULE', 'view_quiz_module.js');
const HOST = env('FIX1025A2_HOST_MODULE', 'host_handlers_module.js');
const AGG = env('FIX1025A2_AGGREGATORS', 'quiz_live_aggregators.js');
const FS = env('FIX1025A2_FIRESTORE', 'firestore_sync_module.js');
const AAC = env('FIX1025A2_LIVE_AAC', 'live_aac_source.jsx');
const INBOX = env('FIX1025A2_INBOX', 'view_submission_inbox_module.js');

const t = (key, options) => options?.defaultValue || key;
let QLA, keyQuality, createHandlers, inbox;

beforeAll(() => {
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloLanguageContext = React.createContext({ t });
  window.__alloT = t;
  window.AlloIcons = {};
  window.AlloModules = window.AlloModules || {};
  new Function('window', readFileSync(AGG, 'utf8'))(window);
  QLA = window.AlloModules.QuizLiveAggregators;
  new Function('window', readFileSync(QUIZ, 'utf8'))(window);
  keyQuality = window.AlloModules.QuizView.keyQuality;
  new Function(readFileSync(HOST, 'utf8'))();
  createHandlers = window.AlloModules.createHostHandlers;
  new Function('window', readFileSync(FS, 'utf8'))(window);
  new Function('window', buildLiveAacModule(readFileSync(AAC, 'utf8')))(window);
  new Function(readFileSync(INBOX, 'utf8'))();
  inbox = window.AlloModules.SubmissionInbox._meta;
});

let root, host;
async function render(props) {
  if (!root) { host = document.createElement('div'); document.body.append(host); root = createRoot(host); }
  await act(async () => root.render(React.createElement(window.AlloModules.QuizView, props)));
}
async function unmount() { if (root) await act(async () => root.unmount()); host?.remove(); root = host = null; }
afterEach(async () => { await unmount(); localStorage.clear(); vi.restoreAllMocks(); });
const button = text => [...host.querySelectorAll('button')].find(el => el.textContent.trim() === text);
async function click(el) { expect(el).toBeTruthy(); await act(async () => el.click()); }

const KEY_FIELDS = ['correctAnswer', 'correctAnswers', 'correctEvidence', 'correctValue', 'expectedAnswer', 'expectedFill', 'acceptableAlternatives', 'rubric',
  'factCheck', 'keyCheck', 'intentionallyWrongIndex', 'orderingPrinciple', 'wrongPairIndex', 'correctPartnerForWrong', 'correctOrder'];
const CONFIRMED = '[[KEY:CONFIRMED]]\n**Verified Correct Answer:** Mercury\nMERCURY_EXPLANATION_TEXT';
function teacherQuiz(timing = 'teacher-release') {
  const mcq = { type: 'mcq', question: 'Closest planet to the Sun?', options: ['Venus', 'Mercury', 'Mars'], correctAnswer: 'Mercury', factCheck: CONFIRMED };
  mcq.keyCheck = keyQuality.readFactCheck(CONFIRMED, mcq);
  return { id: 'quiz-release', type: 'quiz', title: 'Planets', data: { title: 'Planets', deliverySettings: { feedbackTiming: timing }, questions: [
    mcq,
    { type: 'sequence-sense', question: 'Order by distance from the Sun.', items: ['Mercury', 'Venus', 'Earth', 'Mars'], items_en: ['M1', 'V2', 'E3', 'M4'],
      presentedOrder: [2, 0, 3, 1], intentionallyWrongIndex: 0, orderingPrinciple: 'size', principleOptions: ['size', 'process'] },
    { type: 'short-answer', question: 'Why is Mercury hot?', expectedAnswer: 'MODEL_ANSWER_TEXT' }
  ] } };
}
const live = item => window.prepareSessionResourcesForWrite([item]).resources[0];
const pack = item => window.AlloModules.LiveAac.serializeResourceForStudentPack(item, { sanitizeHistoryForCloud: window.sanitizeHistoryForCloud, stripUndefined: window.stripUndefined, audioChannel: 'student-pack' });
function keysIn(value, found = new Set()) {
  if (!value || typeof value !== 'object') return found;
  if (Array.isArray(value)) { value.forEach(v => keysIn(v, found)); return found; }
  Object.keys(value).forEach(key => { if (KEY_FIELDS.includes(key)) found.add(key); keysIn(value[key], found); });
  return found;
}

describe('1. Submit Work inbox passes the fill-blank AI verdict', () => {
  const quiz = { id: 'qf', type: 'quiz', data: { questions: [{ type: 'fill-blank', question: 'Plants make food by ___.', expectedFill: 'photosynthesis' }] } };
  const snapshot = answer => ({ kind: 'alloflow-assessment-responses', version: 1, status: 'submitted', answered: 1, total: 1,
    items: [{ number: 1, type: 'fill-blank', question: 'Plants make food by ___.', answered: true, hasResponse: true, response: answer.text, answer }] });
  it('an AI-accepted near-miss is review; without the verdict it is incorrect', () => {
    expect(inbox.assessmentReport(snapshot({ text: 'photosynthesys', aiVerdict: 'correct' }), 'qf', [quiz], []).items[0].verdict).toBe('review');
    expect(inbox.assessmentReport(snapshot({ text: 'photosynthesys' }), 'qf', [quiz], []).items[0].verdict).toBe('incorrect');
    expect(inbox.assessmentReport(snapshot({ text: 'Photosynthesis.' }), 'qf', [quiz], []).items[0].verdict).toBe('correct');
  });
});

describe('2. teacher-release copies are withheld until release', () => {
  it('both lanes strip the key and ship Sequence Sense in displayed order', () => {
    for (const lane of [live, pack]) {
      const out = lane(teacherQuiz());
      expect([...keysIn(out)]).toEqual([]);
      expect(JSON.stringify(out)).not.toContain('MODEL_ANSWER_TEXT');
      expect(out.data.answerKeysWithheld).toBe(true);
      expect(out.data.feedbackReleaseKeys).toBeUndefined();
      const sequence = out.data.questions[1];
      expect(sequence.items).toEqual(['Earth', 'Mercury', 'Mars', 'Venus']);
      expect(sequence.items_en).toEqual(['E3', 'M1', 'M4', 'V2']);
      expect(sequence.presentedOrder).toEqual([0, 1, 2, 3]);
    }
  });

  it('teacher and withheld copies share one response identity; immediate quizzes keep theirs', () => {
    const teacher = teacherQuiz();
    expect(keyQuality.feedbackSignature(live(teacher).data)).toBe(keyQuality.feedbackSignature(teacher.data));
    expect(keyQuality.feedbackSignature(pack(teacher).data)).toBe(keyQuality.feedbackSignature(teacher.data));
    const immediate = teacherQuiz('immediate').data;
    const edited = { ...immediate, questions: [{ ...immediate.questions[0], correctAnswer: 'Venus' }, ...immediate.questions.slice(1)] };
    expect(keyQuality.feedbackSignature(edited)).not.toBe(keyQuality.feedbackSignature(immediate));
  });

  it('a release reaches the learner through the session and through a re-shared copy, and the learner sees feedback', async () => {
    const teacher = teacherQuiz();
    const student = live(teacher);
    const base = { t, isTeacherMode: false, isParentMode: false, isIndependentMode: false, studentProjectSettings: {}, activeSessionCode: null,
      isPresentationMode: false, isReviewGame: false, isEditingQuiz: false, escapeRoomState: { isActive: false }, presentationState: {}, reviewGameState: {},
      isFactChecking: {}, showQuizAnswers: false, leveledTextLanguage: 'English', formatInlineText: v => v, renderFormattedText: v => v,
      getReviewCategories: () => [], getRows: () => 1, playSound: vi.fn(), addToast: vi.fn(), onResourceComplete: vi.fn(), handleQuizQuestionAction: vi.fn(),
      ErrorBoundary: ({ children }) => children, TeacherLiveQuizControls: () => null, ConfettiExplosion: () => null, Stamp: () => null };
    await render({ ...base, sessionData: {}, generatedContent: student });
    expect(host.textContent).not.toContain('Your teacher will check your answers');
    await click(button('Review & submit')); await click(button('Submit assessment'));
    if (button('Submit with unanswered items')) await click(button('Submit with unanswered items'));
    expect(host.querySelector('[data-assessment-feedback-waiting]')).toBeTruthy();

    // Teacher releases through the host handler.
    const signature = keyQuality.feedbackSignature(teacher.data);
    const keys = keyQuality.releaseKeyPayload(teacher.data, signature);
    const updateDoc = vi.fn(async () => {});
    const deps = { isTeacherMode: true, generatedContent: teacher, activeSessionCode: 'S1', doc: () => 'ref', db: {}, appId: 'app', updateDoc, setGeneratedContent: vi.fn(), setHistory: vi.fn(), t };
    expect(await createHandlers(deps).handleQuizQuestionAction(0, 'release-feedback', { signature, keys })).toBe(true);
    const release = updateDoc.mock.calls[0][1]['quizState.assessmentFeedbackRelease'];
    expect(release.keys && release.keys.questions).toHaveLength(3);
    const releasedTeacher = deps.setGeneratedContent.mock.calls[0][0](teacher);

    // Session path.
    await render({ ...base, sessionData: { quizState: { assessmentFeedbackRelease: release } }, generatedContent: student });
    let feedback = host.querySelector('[data-assessment-attempt-feedback]');
    expect(feedback).toBeTruthy();
    expect(feedback.textContent).toContain('Mercury');
    expect(feedback.textContent).toContain('MERCURY_EXPLANATION_TEXT');
    expect(feedback.textContent).toContain('Mercury → Venus → Earth → Mars');
    expect(feedback.textContent).toContain('MODEL_ANSWER_TEXT');

    // Re-share path: a released copy carries the release, never a bare key.
    const reshared = live(releasedTeacher);
    expect(reshared.data.answerKeysWithheld).toBe(true);
    expect(reshared.data.questions[0].correctAnswer).toBeUndefined();
    expect(reshared.data.feedbackReleaseKeys && reshared.data.feedbackReleaseKeys.signature).toBe(signature);
    await unmount();
    await render({ ...base, sessionData: {}, generatedContent: reshared });
    feedback = host.querySelector('[data-assessment-attempt-feedback]');
    expect(feedback && feedback.textContent).toContain('Mercury → Venus → Earth → Mars');

    // An edit after release must not ship the old release to new learners.
    const edited = { ...releasedTeacher, data: { ...releasedTeacher.data, questions: [{ ...releasedTeacher.data.questions[0], question: 'Edited stem?' }, ...releasedTeacher.data.questions.slice(1)] } };
    expect(live(edited).data.feedbackReleaseKeys).toBeUndefined();
    expect(pack(edited).data.feedbackReleaseKeys).toBeUndefined();
    // A key fix after release keeps learners' work but needs a new release.
    const rekeyed = { ...releasedTeacher, data: { ...releasedTeacher.data, questions: [{ ...releasedTeacher.data.questions[0], correctAnswer: 'Venus' }, ...releasedTeacher.data.questions.slice(1)] } };
    expect(keyQuality.feedbackSignature(rekeyed.data)).toBe(signature);
    expect(live(rekeyed).data.feedbackReleaseKeys).toBeUndefined();
    expect(pack(rekeyed).data.feedbackReleaseKeys).toBeUndefined();
    // The teacher sees the fixed key as unreleased, so they can release again.
    await unmount();
    await render({ ...base, isTeacherMode: true, sessionData: {}, generatedContent: releasedTeacher });
    expect(host.querySelector('[data-assessment-release-feedback]').disabled).toBe(true);
    await render({ ...base, isTeacherMode: true, sessionData: {}, generatedContent: rekeyed });
    expect(host.querySelector('[data-assessment-release-feedback]').disabled).toBe(false);
  });

  it('a draft saved under the keyed identity is migrated, not orphaned', async () => {
    const teacher = teacherQuiz();
    const keyedOld = teacher.data;
    // Recreate the pre-change namespace: identity over the keyed copy.
    const legacySignature = keyQuality.feedbackSignature({ ...keyedOld, deliverySettings: { feedbackTiming: 'immediate' } });
    expect(legacySignature).not.toBe(keyQuality.feedbackSignature(keyedOld));
    const base = { t, isTeacherMode: false, isParentMode: false, isIndependentMode: false, studentProjectSettings: {}, activeSessionCode: null, sessionData: {},
      isPresentationMode: false, isReviewGame: false, isEditingQuiz: false, escapeRoomState: { isActive: false }, presentationState: {}, reviewGameState: {},
      isFactChecking: {}, showQuizAnswers: false, leveledTextLanguage: 'English', formatInlineText: v => v, renderFormattedText: v => v,
      getReviewCategories: () => [], getRows: () => 1, playSound: vi.fn(), addToast: vi.fn(), handleQuizQuestionAction: vi.fn(),
      ErrorBoundary: ({ children }) => children, TeacherLiveQuizControls: () => null, ConfettiExplosion: () => null, Stamp: () => null };
    // An old (keyed) immediate render writes a draft under the keyed namespace.
    await render({ ...base, generatedContent: { ...teacher, data: { ...keyedOld, deliverySettings: { feedbackTiming: 'immediate' } } } });
    const textarea = host.querySelector('textarea');
    expect(textarea).toBeTruthy();
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(textarea, 'MY_SAVED_DRAFT');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => { await new Promise(r => setTimeout(r, 900)); });
    await unmount();
    // Same keyed copy, now teacher-release: the identity changes and must migrate.
    await render({ ...base, generatedContent: teacher });
    expect([...host.querySelectorAll('textarea')].some(el => el.value === 'MY_SAVED_DRAFT')).toBe(true);
  });
});

describe('3. Sequence Sense round trip through a shuffled withheld copy', () => {
  it('grades a displayed-order answer against the teacher copy', () => {
    const teacherQ = teacherQuiz('teacher-graded').data.questions[1];
    const studentQ = live(teacherQuiz('teacher-graded')).data.questions[1];
    expect(studentQ.items).not.toEqual(teacherQ.items);
    expect(QLA.assessmentItemSignature(studentQ)).toBe(QLA.assessmentItemSignature(teacherQ));
    const correctOrder = teacherQ.items.map(item => studentQ.items.indexOf(item));
    const response = order => ({ itemType: 'sequence-sense', questionSignature: QLA.assessmentItemSignature(studentQ),
      answer: { verifyAnswer: 'no', clickedIdx: 0, orderAnswer: order, principleAnswer: 'size', orderBasis: 'displayed' } });
    const right = QLA.gradeResponseForItem(response(correctOrder), teacherQ);
    expect(right).toMatchObject({ status: 'correct', arrangeCorrect: true });
    const wrong = QLA.gradeResponseForItem(response([0, 1, 2, 3]), teacherQ);
    expect(wrong.arrangeCorrect).toBe(false);
    // Saved rows from before display-order signatures still match.
    expect(QLA.assessmentResponseFingerprint(teacherQ, response(correctOrder))).toBeTruthy();
    const legacyRow = { itemType: 'sequence-sense', questionSignature: QLA.legacyAssessmentItemSignature(teacherQ), answer: { verifyAnswer: 'no', clickedIdx: 0, orderAnswer: [0, 1, 2, 3], principleAnswer: 'size' } };
    expect(QLA.gradeResponseForItem(legacyRow, teacherQ)).toMatchObject({ status: 'correct' });
  });
});

describe('4. bulk distractor edits clear keyCheck', () => {
  it('handleQuizBulkOptionChange drops the stale check', () => {
    const quiz = teacherQuiz('immediate');
    const deps = { generatedContent: quiz, setGeneratedContent: vi.fn(), setHistory: vi.fn(), t };
    createHandlers(deps).handleQuizBulkOptionChange([{ qIdx: 0, optIdx: 0, newText: 'Jupiter' }]);
    const updated = deps.setGeneratedContent.mock.calls[0][0];
    expect(updated.data.questions[0].factCheck).toBe(null);
    expect(updated.data.questions[0].keyCheck).toBe(null);
  });
});
