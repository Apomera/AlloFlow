import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const quizSource = readFileSync('view_quiz_source.jsx', 'utf8');
const aggregatorSource = readFileSync('quiz_live_aggregators.js', 'utf8');

function extractAssessHelpers() {
  const start = quizSource.indexOf("var _QUIZ_DRAFT_STORAGE_PREFIX");
  const end = quizSource.indexOf('function _quizUseDraftField', start);
  if (start < 0 || end <= start) throw new Error('Could not extract Assess lifecycle helpers');
  return new Function(quizSource.slice(start, end) + `
    return {
      _quizDraftNamespace,
      _quizWriteDraftField,
      _quizReadDraft,
      _quizReadWorkingDraft,
      _quizBuildAttemptProgress,
      _quizFinalizeAttempt,
      _quizReadAttemptReceipt,
      _quizClearAttemptReceipt,
      _quizNormalizeDeliverySettings
    };
  `)();
}

function loadAggregators() {
  const fakeWindow = { AlloModules: {} };
  new Function('window', aggregatorSource)(fakeWindow);
  return fakeWindow.AlloModules.QuizLiveAggregators;
}

const helpers = extractAssessHelpers();
const aggregators = loadAggregators();

function assessment() {
  return {
    title: 'Mixed check',
    questions: [
      { type: 'mcq', question: 'Pick A', options: ['A', 'B', 'C'], correctAnswer: 'A' },
      { type: 'multi-select', question: 'Pick two', options: ['A', 'B', 'C'], correctAnswers: ['A', 'B'] },
      { type: 'answer-evidence', question: 'Answer and support', answerOptions: ['A', 'B'], evidenceOptions: ['E1', 'E2'] },
      { type: 'numeric-response', question: 'How many?', correctValue: 4 },
      { type: 'short-answer', question: 'Explain why' },
    ],
    reflections: ['What helped?'],
  };
}

describe('Assess completion lifecycle and privacy-safe delivery settings', () => {
  beforeEach(() => window.localStorage.clear());

  it('counts completion consistently across mixed formats and reflections', () => {
    const data = assessment();
    const key = helpers._quizDraftNamespace(data, 'ROOM');
    helpers._quizWriteDraftField(key, 'root', 'mcqAnswers', { 0: 0 });
    helpers._quizWriteDraftField(key, 'root', 'flaggedQuestions', { 1: true });
    helpers._quizWriteDraftField(key, 'root', 'reflectionAnswers', { 0: { draft: 'I reread.', submitted: true } });
    helpers._quizWriteDraftField(key, 'q-1', 'selected', [0, 1]);
    helpers._quizWriteDraftField(key, 'q-2', 'answerIdx', 0);
    helpers._quizWriteDraftField(key, 'q-2', 'evidenceIdx', 1);
    helpers._quizWriteDraftField(key, 'q-3', 'response', 'four');
    const progress = helpers._quizBuildAttemptProgress(data, helpers._quizReadWorkingDraft(key));
    expect(progress).toMatchObject({ total: 5, answered: 4, unanswered: 1, flagged: 1, reflectionTotal: 1, reflectionAnswered: 1 });
    expect(progress.items.map(item => item.answered)).toEqual([true, true, true, true, false]);
  });

  it('writes a durable receipt before clearing the resumable draft', () => {
    const data = assessment();
    const key = helpers._quizDraftNamespace(data, '');
    helpers._quizWriteDraftField(key, 'root', 'mcqAnswers', { 0: 0 });
    const receipt = helpers._quizFinalizeAttempt(key, {
      attemptId: 'attempt-1',
      submittedAt: 123456,
      summary: { total: 5, answered: 1, unanswered: 4 },
    });
    expect(receipt.attemptId).toBe('attempt-1');
    expect(helpers._quizReadDraft(key)).toBeNull();
    expect(helpers._quizWriteDraftField(key, 'root', 'lateAutosave', true)).toBe(false);
    expect(helpers._quizReadDraft(key)).toBeNull();
    expect(helpers._quizReadAttemptReceipt(key)).toMatchObject({ attemptId: 'attempt-1', submittedAt: 123456 });
    expect(helpers._quizClearAttemptReceipt(key)).toBe(true);
    expect(helpers._quizReadAttemptReceipt(key)).toBeNull();
  });

  it('defaults to untimed flexible access and clamps custom timing safely', () => {
    expect(helpers._quizNormalizeDeliverySettings()).toMatchObject({
      profile: 'flexible', pacing: 'all-at-once', timeLimitMinutes: 0,
      extensionMinutes: 5, warningMinutes: 2, allowFlagging: true, showProgress: true,
    });
    expect(helpers._quizNormalizeDeliverySettings({
      profile: 'custom', pacing: 'one-at-a-time', timeLimitMinutes: 999,
      extensionMinutes: 0, warningMinutes: 99, allowFlagging: false,
    })).toMatchObject({
      profile: 'custom', pacing: 'one-at-a-time', timeLimitMinutes: 240,
      extensionMinutes: 5, warningMinutes: 15, allowFlagging: false,
    });
  });
});

describe('teacher item analysis and attempt status', () => {
  function liveFixture(studentCount) {
    const questions = [{ type: 'mcq', question: 'Capital?', options: ['Albany', 'New York City', 'Buffalo'], correctAnswer: 'Albany' }];
    const roster = {};
    const allResponses = {};
    for (let i = 0; i < studentCount; i++) {
      const uid = 's' + i;
      roster[uid] = { displayName: 'Student ' + i };
      allResponses[uid] = {
        0: {
          itemType: 'mcq',
          answer: { optionIdx: i === 0 ? 0 : 1 },
          confidence: i > 0 ? 'knew' : 'guessed',
          timestamp: 1000 + i,
        },
      };
    }
    if (studentCount > 0) {
      allResponses.s0[1] = {
        itemType: 'assessment-complete',
        answer: { answered: 1, total: 1, submittedAt: 5000 },
        timestamp: 5000,
      };
    }
    return {
      generatedContent: { data: { questions } },
      quizState: { allResponses },
      roster,
    };
  }

  it('suppresses interpretive flags below five responses', () => {
    const f = liveFixture(4);
    const result = aggregators.aggregateItemAnalysis(f.quizState, f.generatedContent, f.roster);
    expect(result.items[0]).toMatchObject({ respondents: 4, smallSample: true, signalLabel: 'Early signal (4/5)' });
    expect(result.items[0].flags).toEqual([]);
  });

  it('reports difficulty, distractor choice distribution, and confidence mismatch at the minimum sample', () => {
    const f = liveFixture(5);
    const item = aggregators.aggregateItemAnalysis(f.quizState, f.generatedContent, f.roster).items[0];
    expect(item).toMatchObject({ respondents: 5, gradableCount: 5, correctRate: 20, smallSample: false, highConfidenceIncorrect: 4 });
    expect(item.options.map(option => option.count)).toEqual([1, 4, 0]);
    expect(item.flags.join(' ')).toContain('challenging');
    expect(item.flags.join(' ')).toContain('confident');
  });

  it('marks final submission separately from in-progress answers in the gradebook', () => {
    const f = liveFixture(2);
    const book = aggregators.aggregateGradebook(f.quizState, f.generatedContent, f.roster);
    expect(book.studentRows.find(row => row.uid === 's0').attemptStatus).toBe('submitted');
    expect(book.studentRows.find(row => row.uid === 's1').attemptStatus).toBe('in-progress');
  });
});