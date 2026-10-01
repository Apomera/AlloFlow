// 2026-09-28 Decision 1: an optional "Graded" quiz (default off).
//  - Off: student copies keep their keys so self-check works (unchanged).
//  - On: no answer key, per-option correctness, explanation, answer guide,
//    fact check or rubric reaches ANY student route (pack/QR/mailbox file,
//    live session doc, both SessionTransport lanes, student HTML export).
//  - Live teacher-run quizzes still grade on the teacher's copy.
//  - The student view shows no self-check or answer guide, says the teacher
//    will check, and still records responses for Submit Work.
//  - The Submission Inbox scores recorded responses against the teacher's copy.
// Mutation check: point these at pre-fix copies and the matching tests fail.
//   FIX0928_FS_SRC, FIX0928_AAC_SRC, FIX0928_ST_SRC, FIX0928_QUIZ_MODULE,
//   FIX0928_DOC_MOD, FIX0928_INBOX_MOD, FIX0928_ANTI
import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const { buildLiveAacModule } = require('../_build_live_aac_module.js');
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;
const read = (env, file) => fs.readFileSync(process.env[env] || file, 'utf8');

const KEY_FIELDS = ['correctAnswer', 'correctAnswers', 'correctEvidence', 'correctValue', 'tolerance', 'acceptableUnits', 'expectedAnswer',
  'expectedFill', 'acceptableAlternatives', 'rubric', 'explanation', 'factCheck', 'keyCheck', 'intentionallyWrongIndex', 'orderingPrinciple',
  'wrongPairIndex', 'correctPartnerForWrong', 'isCorrect', 'distractorReview', 'distractorQuality'];
const SECRET_TEXT = ['MODEL_ANSWER_TEXT', 'RUBRIC_TEXT', 'EXPLAIN_MCQ', 'Verified Correct Answer', 'OPTION_FEEDBACK'];

const questions = () => [
  { type: 'mcq', question: 'Closest planet to the Sun?', options: ['Venus', 'Mercury', 'Mars'], correctAnswer: 'Mercury', conceptLabel: 'planets',
    explanation: 'EXPLAIN_MCQ', factCheck: '[[KEY:CONFIRMED]]\n**Verified Correct Answer:** Mercury', keyCheck: { status: 'confirmed', checkedKey: 'Mercury' },
    distractorQuality: [{ distractor: 'Venus', encodesMisconception: true, reason: 'x' }] },
  { type: 'multi-select', question: 'Which are gas giants?', options: ['Jupiter', 'Mars', 'Saturn'], correctAnswers: ['Jupiter', 'Saturn'] },
  { type: 'fill-blank', question: 'The ___ is our star.', expectedFill: 'Sun', acceptableAlternatives: ['the sun'] },
  { type: 'numeric-response', question: 'How many planets orbit the Sun?', correctValue: 8, tolerance: 0, unit: '', acceptableUnits: [] },
  { type: 'short-answer', question: 'Why is Mercury hot?', expectedAnswer: 'MODEL_ANSWER_TEXT' },
  { type: 'self-explanation', question: 'Explain an orbit.', rubric: 'RUBRIC_TEXT' },
  { type: 'answer-evidence', question: 'Which planet is bigger?', answerOptions: ['Earth', 'Jupiter'], correctAnswer: 'Jupiter', evidencePrompt: 'Why?',
    evidenceOptions: ['It is a gas giant', 'It is rocky'], correctEvidence: 'It is a gas giant' },
  { type: 'sequence-sense', question: 'Order by distance.', items: ['Mercury', 'Venus', 'Earth'], presentedOrder: [1, 0, 2], intentionallyWrongIndex: 0,
    orderingPrinciple: 'size', principleOptions: ['size', 'process'] },
  { type: 'relation-mismatch', question: 'Find the wrong pair.', pairs: [{ left: 'Mars', right: 'Red' }, { left: 'Earth', right: 'Ringed' }],
    wrongPairIndex: 1, correctPartnerForWrong: 'Blue', candidatePartners: ['Blue', 'Green'] }
];
const quiz = (timing, extra = {}) => ({ id: 'quiz-g', type: 'quiz', title: 'Planets check', data: {
  title: 'Planets check', deliverySettings: { profile: 'flexible', feedbackTiming: timing }, scoringPolicy: { partialCredit: true },
  distractorReview: { weakItems: [0] }, questions: questions(), reflections: ['What surprised you?'], ...extra } });

function keysFound(value, found = new Set()) {
  if (!value || typeof value !== 'object') return found;
  if (Array.isArray(value)) { value.forEach(v => keysFound(v, found)); return found; }
  Object.keys(value).forEach(key => { if (KEY_FIELDS.includes(key)) found.add(key); keysFound(value[key], found); });
  return found;
}
function expectNoKey(out) {
  expect([...keysFound(out)]).toEqual([]);
  const text = JSON.stringify(out);
  SECRET_TEXT.forEach(secret => expect(text).not.toContain(secret));
}

// Isolated window per load: SessionTransport + FirestoreSync + LiveAac.
function loadLanes() {
  const win = { React: {}, AlloModules: {} };
  new Function('window', read('FIX0928_ST_SRC', 'session_transport_module.js'))(win);
  new Function('window', read('FIX0928_FS_SRC', 'firestore_sync_module.js'))(win);
  new Function('window', buildLiveAacModule(read('FIX0928_AAC_SRC', 'live_aac_source.jsx')))(win);
  const deps = channel => ({ sanitizeHistoryForCloud: win.sanitizeHistoryForCloud, stripUndefined: win.stripUndefined, audioChannel: channel });
  const pack = (item, channel = 'student-pack') => win.AlloModules.LiveAac.serializeResourceForStudentPack(item, deps(channel));
  const live = item => win.prepareSessionResourcesForWrite([item]).resources[0];
  return { win, pack, live, ST: win.AlloModules.SessionTransport };
}

describe('graded off (default): keys stay so self-check keeps working', () => {
  it('pack, QR and live session copies keep the answer keys', () => {
    const { pack, live } = loadLanes();
    for (const out of [pack(quiz('immediate')), pack(quiz('after-submit'), 'qr'), live(quiz('immediate')), pack(quiz(undefined))]) {
      const [mcq, multi, fill, numeric, written] = out.data.questions;
      expect(mcq.correctAnswer).toBe('Mercury');
      expect(multi.correctAnswers).toEqual(['Jupiter', 'Saturn']);
      expect(fill.expectedFill).toBe('Sun');
      expect(numeric.correctValue).toBe(8);
      expect(written.expectedAnswer).toBe('MODEL_ANSWER_TEXT');
      expect(out.data.answerKeysWithheld).toBeUndefined();
    }
  });
});

describe('graded on: no key reaches any student route', () => {
  it.each([['student pack file', 'pack', 'student-pack'], ['homework QR', 'pack', 'qr'], ['mailbox live pack', 'pack', 'live'], ['live session document', 'live']])(
    '%s', (_, lane, channel) => {
      const api = loadLanes();
      const teacher = quiz('teacher-graded', { answerKey: ['Mercury'] });
      teacher.data.questions.push({ type: 'mcq', question: 'Object options?', options: [{ text: 'Yes', isCorrect: true, feedback: 'OPTION_FEEDBACK' }, { text: 'No' }], correctAnswer: 'Yes' });
      const before = JSON.stringify(teacher);
      const out = lane === 'live' ? api.live(teacher) : api.pack(teacher, channel);
      expectNoKey(out);
      expect(out.data).not.toHaveProperty('answerKey');
      expect(out.data.answerKeysWithheld).toBe(true);
      expect(out.data.deliverySettings.feedbackTiming).toBe('teacher-graded');
      // Everything a learner needs to answer is still there.
      const [mcq, multi, , , , , evidence, sequence, relation, objectOptions] = out.data.questions;
      expect(mcq.options).toEqual(['Venus', 'Mercury', 'Mars']);
      expect(multi.options).toEqual(['Jupiter', 'Mars', 'Saturn']);
      expect(evidence.evidenceOptions).toHaveLength(2);
      expect(sequence.principleOptions).toEqual(['size', 'process']);
      expect(relation.candidatePartners).toEqual(['Blue', 'Green']);
      expect(objectOptions.options).toEqual([{ text: 'Yes' }, { text: 'No' }]);
      expect(out.data.reflections).toEqual(['What surprised you?']);
      // The teacher's own copy is untouched.
      expect(JSON.stringify(teacher)).toBe(before);
    });

  it('both SessionTransport lanes publish the stripped copy', async () => {
    const { win, pack, ST } = loadLanes();
    const writes = [];
    const firebase = ST.createFirebaseTransport({ teacherOnlyTypes: ['lesson-plan'], uploadAssets: items => items,
      prepareResources: items => win.prepareSessionResourcesForWrite(items), write: payload => { writes.push(payload); } });
    await firebase.publishResources([quiz('teacher-graded')]);
    expect(writes).toHaveLength(1);
    expectNoKey(writes[0].resources);
    const pushed = [];
    const mailbox = ST.createMailboxTransport({ teacherOnlyTypes: ['lesson-plan'], seen: {}, fingerprint: item => JSON.stringify(pack(item, 'live')),
      pushItem: item => { pushed.push(pack(item, 'live')); } });
    await mailbox.publishResources([quiz('teacher-graded')]);
    expect(pushed).toHaveLength(1);
    expectNoKey(pushed);
  });

  it('a live teacher-run quiz still grades on the teacher copy', () => {
    const { live } = loadLanes();
    loadAlloModule('quiz_live_aggregators.js');
    const QLA = window.AlloModules.QuizLiveAggregators;
    const teacher = quiz('teacher-graded');
    const student = live(teacher);
    const pick = student.data.questions[0].options.indexOf('Mercury');
    const response = { answer: { optionIdx: pick }, itemType: 'mcq' };
    expect(QLA.gradeResponseForItem(response, teacher.data.questions[0]).status).toBe('correct');
    expect(QLA.gradeResponseForItem({ answer: { optionIdx: 0 }, itemType: 'mcq' }, teacher.data.questions[0]).status).toBe('incorrect');
    // The student copy alone cannot grade itself.
    expect(QLA.gradeResponseForItem(response, student.data.questions[0]).status).not.toBe('correct');
    const multi = { answer: { selectedIndices: [0, 2] }, itemType: 'multi-select' };
    expect(QLA.gradeResponseForItem(multi, teacher.data.questions[1]).status).toBe('correct');
  });
});

describe('graded on: student HTML export', () => {
  let pipeline;
  beforeAll(() => {
    window.React = window.React || React;
    loadAlloModule('export_handlers_module.js');
    new Function(read('FIX0928_DOC_MOD', 'doc_pipeline_module.js'))();
    pipeline = window.AlloModules.createDocPipeline({
      callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
      addToast: () => {}, t: key => key, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Quiz',
      state: { currentUiLanguage: 'English', isParentMode: false, isIndependentMode: false }
    });
  });
  const split = item => window.AlloModules.ExportHandlers.separateStudentTeacherHtml(
    pipeline.generateFullPackHTML([item], 'Planets', false, {}, { includeTeacherKey: true, includeQuiz: true }));
  it('the student file has no MCQ key and no self-check; the teacher copy keeps the key', () => {
    const { studentHtml, teacherHtml } = split(quiz('teacher-graded'));
    const doc = new DOMParser().parseFromString(studentHtml, 'text/html');
    const mcqs = [...doc.querySelectorAll('.question[data-item-type="mcq"]')];
    expect(mcqs.length).toBeGreaterThan(0);
    mcqs.forEach(node => expect(node.getAttribute('data-correct')).toBe(''));
    expect(doc.querySelector('.quiz-check-btn')).toBeNull();
    expect(doc.body.textContent).toContain('Your teacher will check your answers.');
    expect(studentHtml).not.toContain('MODEL_ANSWER_TEXT');
    expect(teacherHtml).toContain('MODEL_ANSWER_TEXT');
  });
  it('an ungraded quiz keeps its self-check', () => {
    const { studentHtml } = split(quiz('immediate'));
    const doc = new DOMParser().parseFromString(studentHtml, 'text/html');
    expect(doc.querySelector('.question[data-item-type="mcq"]').getAttribute('data-correct')).toBe('1');
    expect(doc.querySelector('.quiz-check-btn')).not.toBeNull();
  });
});

describe('graded on: student quiz view', () => {
  const t = key => key;
  let root, host;
  beforeAll(() => {
    global.React = window.React = React;
    global.IS_REACT_ACT_ENVIRONMENT = true;
    window.AlloLanguageContext = React.createContext({ t });
    window.__alloT = t;
    window.AlloIcons = {};
    delete window.AlloModules.QuizView;
    new Function('window', read('FIX0928_QUIZ_MODULE', 'view_quiz_module.js'))(window);
  });
  afterEach(async () => {
    if (root) await act(async () => root.unmount());
    host?.remove(); root = host = null; localStorage.clear(); vi.restoreAllMocks();
  });
  const props = extra => ({ t, isTeacherMode: false, isParentMode: false, isIndependentMode: false, studentProjectSettings: {}, activeSessionCode: null, sessionData: {},
    isPresentationMode: false, isReviewGame: false, isEditingQuiz: false, escapeRoomState: { isActive: false }, presentationState: {}, reviewGameState: {},
    isFactChecking: {}, showQuizAnswers: false, leveledTextLanguage: 'English', formatInlineText: v => v, renderFormattedText: v => v, getReviewCategories: () => [],
    getRows: () => 1, playSound: vi.fn(), addToast: vi.fn(), onResourceComplete: vi.fn(), handleQuizQuestionAction: vi.fn(), handleToggleIsPresentationMode: vi.fn(),
    ErrorBoundary: ({ children }) => children, TeacherLiveQuizControls: () => null, ConfettiExplosion: () => null, Stamp: () => null, ...extra });
  async function render(p) {
    if (!root) { host = document.createElement('div'); document.body.append(host); root = createRoot(host); }
    await act(async () => root.render(React.createElement(window.AlloModules.QuizView, p)));
  }
  const button = text => [...host.querySelectorAll('button')].find(el => el.textContent.trim() === text);
  const click = async el => { expect(el).toBeTruthy(); await act(async () => el.click()); };

  it('shows the graded message, no self-check or answer guide, and records responses for Submit Work', async () => {
    const recorded = {};
    const onRecordQuizResponses = vi.fn((id, key, value) => { recorded[id] = { ...(recorded[id] || {}), [key]: value }; });
    const student = loadLanes().live(quiz('teacher-graded'));
    await render(props({ generatedContent: student, onRecordQuizResponses, callGemini: vi.fn() }));
    expect(host.querySelector('[data-assessment-graded-banner]')).not.toBeNull();
    expect(host.textContent).toContain('Your teacher will check');
    expect(host.querySelectorAll('[data-assessment-deferred-item]').length).toBeGreaterThan(0);
    const option = [...host.querySelectorAll('[role="button"]')].find(el => el.textContent.includes('Mars'));
    await click(option);
    await click(button('Review & submit'));
    await click(button('Submit assessment'));
    if (button('Submit with unanswered items')) await click(button('Submit with unanswered items'));
    expect(host.querySelector('[data-assessment-graded-waiting]')).not.toBeNull();
    expect(host.querySelector('[data-assessment-attempt-feedback]')).toBeNull();
    expect(host.querySelector('[data-assessment-answer-guide]')).toBeNull();
    expect(host.textContent).not.toContain('Answer guide');
    const submitted = recorded['quiz-g'] && recorded['quiz-g'].assessmentSubmitted;
    expect(submitted).toMatchObject({ kind: 'alloflow-assessment-responses', status: 'submitted' });
    expect(submitted.items[0]).toMatchObject({ answered: true, response: 'Mars', answer: { optionText: 'Mars' } });
  });

  it('an ungraded delayed quiz still shows its answer guides after submission', async () => {
    await render(props({ generatedContent: quiz('after-submit') }));
    expect(host.querySelector('[data-assessment-graded-banner]')).toBeNull();
    await click(button('Review & submit'));
    await click(button('Submit assessment'));
    if (button('Submit with unanswered items')) await click(button('Submit with unanswered items'));
    expect(host.querySelector('[data-assessment-attempt-feedback]')).not.toBeNull();
  });

  it('the teacher turns graded on from the assessment settings', async () => {
    const p = props({ isTeacherMode: true, generatedContent: quiz('immediate') });
    await render(p);
    const select = host.querySelector('[data-assessment-feedback-timing]');
    expect([...select.options].map(o => o.value)).toContain('teacher-graded');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(select, 'teacher-graded');
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(p.handleQuizQuestionAction).toHaveBeenCalledWith(0, 'patch-assessment', expect.objectContaining({ deliverySettings: expect.objectContaining({ feedbackTiming: 'teacher-graded' }) }));
    await render({ ...p, generatedContent: quiz('teacher-graded') });
    expect(host.querySelector('[data-assessment-graded-note]')).not.toBeNull();
  });
});

describe('Submission Inbox scores quiz responses against the teacher copy', () => {
  let inbox;
  beforeAll(() => {
    window.React = window.React || React;
    loadAlloModule('quiz_live_aggregators.js');
    delete window.AlloModules.SubmissionInbox;
    new Function(read('FIX0928_INBOX_MOD', 'view_submission_inbox_module.js'))();
    inbox = window.AlloModules.SubmissionInbox;
  });
  const row = (number, type, question, response, answer) => ({ number, type, question, answered: response != null, response: response || '', answer: answer || null });
  const snapshot = () => ({ kind: 'alloflow-assessment-responses', version: 1, status: 'submitted', answered: 6, total: 9, items: [
    row(1, 'mcq', 'Closest planet to the Sun?', 'Mercury', { optionIdx: 1, optionText: 'Mercury' }),
    row(2, 'multi-select', 'Which are gas giants?', 'Jupiter', { selectedIndices: [0], selectedOptions: ['Jupiter'] }),
    row(3, 'fill-blank', 'The ___ is our star.', 'Moon', { text: 'Moon', status: 'submitted' }),
    row(4, 'numeric-response', 'How many planets orbit the Sun?', '8', { text: '8', numericValue: 8, unit: '' }),
    row(5, 'short-answer', 'Why is Mercury hot?', 'It is close to the Sun', { text: 'It is close to the Sun' }),
    row(6, 'self-explanation', 'Explain an orbit.', null),
    row(7, 'answer-evidence', 'Which planet is bigger?', 'Answer: Jupiter. Evidence: It is rocky', { answerIdx: 1, evidenceIdx: 1, answerText: 'Jupiter', evidenceText: 'It is rocky' }),
    row(8, 'sequence-sense', 'Order by distance.', null),
    row(9, 'relation-mismatch', 'Find the wrong pair.', null)
  ], reflections: [{ prompt: 'What surprised you?', response: 'Jupiter is huge' }] });

  it('scores each response and totals the auto-checked ones', () => {
    expect(inbox._meta.assessmentReport).toBeTypeOf('function');
    const report = inbox._meta.assessmentReport({ assessmentSubmitted: snapshot(), assessmentDraft: null }, 'quiz-g', [quiz('teacher-graded')], []);
    expect(report.copyStatus).toBe('found');
    expect(report.items.map(item => item.verdict)).toEqual(['correct', 'partial', 'incorrect', 'correct', 'review', 'unanswered', 'partial', 'unanswered', 'unanswered']);
    expect(report.items[4].reference).toBe('MODEL_ANSWER_TEXT');
    // mcq 1 + multi 0.5 + fill 0 + numeric 1 + evidence 0.5 + unanswered sequence/relation 0, over 7 auto-checked.
    expect(report.possible).toBe(7);
    expect(report.points).toBe(3);
    expect(report.percent).toBe(43);
    expect(report.needsReview).toBe(1);
    expect(report.reflections).toEqual([{ prompt: 'What surprised you?', response: 'Jupiter is huge' }]);
  });

  it('says so when the teacher copy is not in this project', () => {
    const report = inbox._meta.assessmentReport({ assessmentSubmitted: snapshot() }, 'quiz-g', [], [{ id: 'quiz-g', type: 'quiz', title: 'Student copy title' }]);
    expect(report.copyStatus).toBe('missing');
    expect(report.possible).toBe(0);
    expect(report.title).toBe('Student copy title');
    expect(report.items[0]).toMatchObject({ response: 'Mercury', verdict: 'review' });
    const studentCopyOnly = inbox._meta.assessmentReport({ assessmentSubmitted: snapshot() }, 'quiz-g', [loadLanes().live(quiz('teacher-graded'))], []);
    expect(studentCopyOnly.copyStatus).toBe('no-key');
  });

  it('renders a readable report instead of raw JSON, and the host passes its history', async () => {
    const report = inbox._meta.assessmentReport({ assessmentSubmitted: snapshot() }, 'quiz-g', [quiz('teacher-graded')], []);
    const host = document.createElement('div'); document.body.append(host);
    const root = createRoot(host);
    await act(async () => root.render(React.createElement(inbox._meta.AssessmentReport, { report })));
    expect(host.querySelector('[data-assessment-score]').textContent).toBe('Score: 3 of 7 automatically checked (43%)');
    expect(host.querySelectorAll('[data-assessment-item="correct"]')).toHaveLength(2);
    expect(host.textContent).not.toContain('alloflow-assessment-responses');
    await act(async () => root.unmount()); host.remove();
    const anti = read('FIX0928_ANTI', 'AlloFlowANTI.txt');
    const mount = anti.slice(anti.indexOf('isOpen={isSubmissionInboxOpen}'), anti.indexOf('onOpenInStudio=', anti.indexOf('isOpen={isSubmissionInboxOpen}')));
    expect(mount).toContain('history={history}');
  });
});
