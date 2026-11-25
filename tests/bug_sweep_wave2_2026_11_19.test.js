import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf8');

const teacherSrc = read('teacher_source.jsx');
const inboxSrc = read('view_submission_inbox_source.jsx');
const mathSrc = read('view_math_source.jsx');
const visualPanelSrc = read('visual_panel_source.jsx');
const gamesSrc = read('games_source.jsx');
const adventureSrc = read('view_adventure_source.jsx');
const personaSrc = read('view_persona_chat_source.jsx');

describe('Bug sweep wave 2 (Wave A): Teacher Dashboard analytics, surveys, and filters', () => {
  const start = teacherSrc.indexOf('const _tdNormalizeSurveyList =');
  const end = teacherSrc.indexOf('\n};', teacherSrc.indexOf('avgAdventureLevel: Number')) + 3;
  const teacherHelpers = new Function(
    teacherSrc.slice(start, end) + '\nreturn { _tdNormalizeSurveyList, _tdSurveyConstructScore, _tdEvaluateQuizForStudent, calculateAnalyticsMetrics };'
  )();

  it('scores modern assessmentSubmitted quiz snapshots and numeric MCQ options accurately', () => {
    const quiz = {
      id: 'q-1',
      type: 'quiz',
      title: 'Fractions Quiz',
      data: {
        questions: [
          { type: 'mcq', question: 'What is 1 + 1?', options: ['1', '2', '3', '4'], correctIndex: 1, correctAnswer: '2' },
          { type: 'multi-select', question: 'Even numbers?', options: ['1', '2', '3', '4'], correctIndices: [1, 3] },
          { type: 'fill-blank', question: 'Water boils at ___ C.', expectedFill: '100' },
        ],
      },
    };
    const modernResponses = {
      'q-1': {
        assessmentSubmitted: {
          kind: 'alloflow-assessment-responses',
          items: [
            { questionIndex: 0, answered: true, answer: { optionIndex: 1, optionText: '2' } },
            { questionIndex: 1, answered: true, answer: { selectedIndices: [1, 3] } },
            { questionIndex: 2, answered: true, answer: { text: '100' } },
          ],
        },
      },
    };
    const modernEval = teacherHelpers._tdEvaluateQuizForStudent(quiz, modernResponses);
    expect(modernEval.total).toBe(3);
    expect(modernEval.correct).toBe(3);
    expect(modernEval.scorePct).toBe(100);

    // Legacy save with numeric option text "2" must match option text "2" (index 1), not index 2 ("3")
    const legacyResponses = { 'q-1': { 0: '2' } };
    const legacyEval = teacherHelpers._tdEvaluateQuizForStudent(
      { id: 'q-1', type: 'quiz', data: { questions: [quiz.data.questions[0]] } },
      legacyResponses
    );
    expect(legacyEval.correct).toBe(1);
    expect(legacyEval.scorePct).toBe(100);

    const metrics = teacherHelpers.calculateAnalyticsMetrics([{ history: [quiz], responses: modernResponses }]);
    expect(metrics.averageScore).toBe(100);
    expect(metrics.misconceptions).toHaveLength(0);
  });

  it('normalizes object-map and array surveyResponses without NaN or undefined', () => {
    const objectMap = {
      tam_student: [
        { perceived_usefulness: 5, ease_of_use: 4, intention: 5 },
        { perceived_usefulness: 3, ease_of_use: 4, intention: 4 },
      ],
    };
    const rows = teacherHelpers._tdNormalizeSurveyList(objectMap);
    expect(rows).toHaveLength(2);
    expect(teacherHelpers._tdSurveyConstructScore(rows[0], 'perceived_usefulness')).toBe(5);
    expect(teacherHelpers._tdSurveyConstructScore(rows[0], 'ease_of_use')).toBe(4);
    expect(teacherHelpers._tdSurveyConstructScore(rows[0], 'intention')).toBe(5);
    expect(teacherHelpers._tdSurveyConstructScore({ construct: 'usefulness', score: 4 }, 'perceived_usefulness')).toBe(4);
  });

  it('filters the student table via getCurrentFilteredStudents and guards jsPDF/question derefs', () => {
    expect(teacherSrc).toContain('{getCurrentFilteredStudents().map((student, idx) => {');
    expect(teacherSrc).toContain("filteredStudents.filter(s => (s.history || []).some(h => h && (h.type === 'note-taking' || h.type === 'anchor-chart'))).length");
    expect(teacherSrc).toContain('{question?.imageUrl && (');
    expect(teacherSrc).toContain('{Array.isArray(question?.optionImageUrls) && question.optionImageUrls.some(Boolean) && (');
    expect(teacherSrc).toContain('if (!window.jspdf || !window.jspdf.jsPDF)');
  });
});

describe('Bug sweep wave 2 (Wave A): Submission Inbox grading, fallback, and CSV/diff hygiene', () => {
  const start = inboxSrc.indexOf('var SI_RESPONSE_MANIFEST_SCHEMA_VERSION = 1;');
  const end = inboxSrc.indexOf('function siAutoGradesFromKeys(');
  const helperEnd = end > start ? end : inboxSrc.indexOf('function siSubmissionTitle(');
  // Extract core pure helpers via the compiled module on a minimal window stub
  const loadInboxHelpers = () => {
    const helperStart = inboxSrc.indexOf('var SI_RESPONSE_MANIFEST_SCHEMA_VERSION = 1;');
    const helperStop = inboxSrc.indexOf('function siFormatAssessmentSnapshotText(');
    const reportStart = inboxSrc.indexOf('function siAssessmentReport(');
    const reportStop = inboxSrc.indexOf('function siAssessmentAutoSummary(');
    const pureStart = inboxSrc.indexOf('function siNormQuizType(');
    const pureStop = inboxSrc.indexOf('function siAssessmentGrade(');
    const extraStubs = `
      var SI_ASSESSMENT_REVIEW_TYPES = ['short-answer', 'self-explanation', 'reasoning', 'reflection'];
      function siIsTfType(v) { return /^(?:true-?false|tf)$/i.test(String(v || '')); }
      function siAssessmentComparable(v) { return String(v == null ? '' : v).trim().toLowerCase().replace(/\\s+/g, ' '); }
      function siAssessmentSnapshot(v) {
        if (!v || typeof v !== 'object') return null;
        if (v.kind === 'alloflow-assessment-responses') return v;
        if (v.assessmentSubmitted && v.assessmentSubmitted.kind === 'alloflow-assessment-responses') return v.assessmentSubmitted;
        return null;
      }
      function siFormatAssessmentSnapshotText() { return 'Formatted snapshot'; }
      function siAssessmentGrade(q, row, policy, submitted) { return siPureObjectiveAssessmentGrade(q, row, policy, submitted); }
    `;
    const code = [
      extraStubs,
      inboxSrc.slice(helperStart, helperStop),
      inboxSrc.slice(pureStart, pureStop),
      inboxSrc.slice(reportStart, reportStop),
      'return { siResponseRequiresManualReview, siResponseEntryModels, siPureObjectiveAssessmentGrade, siAssessmentReport };',
    ].join('\n');
    return new Function(code)();
  };

  it('allows AI grading on quiz reflections, note-taking, KWL, math work, memory-aid drafts, and applied-challenge fields', () => {
    const h = loadInboxHelpers();
    const freeformKeys = [
      'q1:reflection:0',
      'nt1:note:summary',
      'nt1:note:hypothesis',
      'nt1:note:notes:0',
      'kwl1:kwl:2',
      'm1:math:0:work',
      'ma1:card0:draft',
      'ac1:applied:evidence',
      'ac1:applied:response',
    ];
    freeformKeys.forEach((key) => {
      expect(
        h.siResponseRequiresManualReview({ key, responseType: 'free-response', hasManifest: true, manifestSupported: true, manualReview: false }),
        `Expected ${key} to be AI-gradable`
      ).toBe(false);
    });
    // Still fail-closed on structured quiz evidence / mcq keys even with a spoofed free-response type
    expect(h.siResponseRequiresManualReview({ key: 'q1:0:mcq', responseType: 'free-response', hasManifest: true, manifestSupported: true, manualReview: false })).toBe(true);
    expect(h.siResponseRequiresManualReview({ key: 'q1:0:evidence', responseType: 'free-response', hasManifest: true, manifestSupported: true, manualReview: false })).toBe(true);
  });

  it('skips empty studio container objects ({}) and grades signed snapshots when QuizLiveAggregators is not yet loaded', () => {
    const h = loadInboxHelpers();
    const models = h.siResponseEntryModels({
      responses: { 'studio-empty': {}, 'q1:reflection:0': 'Cells divide via mitosis.' },
      responseManifest: {
        schemaVersion: 1,
        entries: [{ key: 'q1:reflection:0', question: 'Explain mitosis.', responseType: 'free-response', manualReview: false }],
      },
    });
    expect(models.map((m) => m.key)).toEqual(['q1:reflection:0']);

    const quiz = {
      id: 'q-1',
      type: 'quiz',
      title: 'Number Quiz',
      data: {
        questions: [{ type: 'mcq', question: 'What is 1 + 1?', options: ['1', '2', '3', '4'], correctIndex: 1 }],
      },
    };
    const report = h.siAssessmentReport(
      {
        assessmentSubmitted: {
          kind: 'alloflow-assessment-responses',
          status: 'submitted',
          items: [{ number: 1, question: 'What is 1 + 1?', questionSignature: 'sig-123', answered: true, answer: { optionText: '2' }, response: '2' }],
        },
      },
      'q-1',
      [quiz],
      []
    );
    expect(report.items[0].changed).toBe(false);
    expect(report.items[0].scorable).toBe(true);
    expect(report.items[0].verdict).toBe('correct');
  });

  it('guards literal ${...} template strings in view_math_source and visual_panel_source', () => {
    expect(mathSrc).toContain("const _lbl = t('math.edit_answer'); return (_lbl && !/\\$\\{/.test(_lbl))");
    expect(visualPanelSrc).toContain("const _v = t('common.frame_delete_aria'); return (_v && !/\\$\\{/.test(_v))");
    expect(visualPanelSrc).toContain("const _v = t('common.regen_frame_placeholder'); return (_v && !/\\$\\{/.test(_v))");
  });
});

describe('Bug sweep wave 2 (Wave B): Games, Adventure, and Persona Chat fixes', () => {
  it('fixes XP scoring, lockedIds reset, empty timeline check, crossword initial cell, and drag cleanup in games_source', () => {
    expect(gamesSrc).toContain('if (onScoreUpdate) onScoreUpdate(nextScore, "Syntax Scramble");');
    expect(gamesSrc).toContain('if (onScoreUpdate) onScoreUpdate(newScore, "Pipeline Builder");');
    expect(gamesSrc).toContain('setLockedIds(new Set());');
    expect(gamesSrc).toContain('{allowAddItems && !studentAiOff && onGenerateItem && !isChecked && (');
    expect(gamesSrc).toContain('const checkOrder = () => {\n    if (!items.length) return;');
    expect(gamesSrc).toContain('const firstClue = newClues.across[0] || newClues.down[0] || null;');
    expect(gamesSrc).toContain("window.addEventListener('touchcancel', handleUp);");
    expect(gamesSrc).toContain('onClick={(e) => e.stopPropagation()}');
  });

  it('fixes Adventure fluency stop glyph, option object rendering, and Standard mode hint placement', () => {
    expect(adventureSrc).toContain("<span aria-hidden=\"true\">{'\\u25A0'}</span>");
    expect(adventureSrc).not.toContain('<span aria-hidden="true">\\u25A0</span>');
    expect(adventureSrc).not.toContain("{typeof opt === 'object' && opt?.action ? opt.action : opt}");
    expect(adventureSrc).not.toContain('{handleAdventureHint && adventureFreeResponseEnabled && adventureState.currentScene && !adventureState.isGameOver && (');
  });

  it('keeps PersonaChat panel composer in a stable slot and strips **bold** before *italic*', () => {
    expect(personaSrc).toContain('{!showRoleSwap && isPersonaFreeResponse && renderPersonaComposer(true)}');
    expect(personaSrc).not.toContain(".replace(/\\*([^*]+)\\*/g, '$1').replace(/\\*\\*([^*]+)\\*\\*/g, '$1')");
  });
});
