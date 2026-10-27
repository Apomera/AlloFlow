import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

let A, H;
beforeAll(() => {
  const host = { AlloModules: {} };
  for (const file of ['quiz_live_aggregators.js', 'quiz_ai_helpers.js']) new Function('window', readFileSync(file, 'utf8'))(host);
  A = host.AlloModules.QuizLiveAggregators;
  H = host.AlloModules.QuizAIHelpers;
});

describe('teacher-selected fill-blank policies', () => {
  it('uses normalized accepted answers without AI and shares the teacher verdict', async () => {
    const q = { expectedFill: 'Photosynthesis', acceptableAlternatives: ['making food'], fillBlankPolicy: 'normalized' };
    for (const text of ['“PHOTOSYNTHESIS.”', ' making   food ']) {
      expect(A.gradeFillBlankAnswer(text, q)).toMatchObject({ status: 'correct', evaluable: true });
      expect(await H.gradeFillBlank({ ...q, studentFill: text })).toMatchObject({ status: 'correct' });
    }
  });
  it('does not let fuzzy AI override exact spelling or capitalization', async () => {
    const q = { expectedFill: 'Paris', fillBlankPolicy: 'exact' }, callGemini = vi.fn();
    expect(A.gradeFillBlankAnswer('paris', q, 'correct')).toMatchObject({ status: 'incorrect', evaluable: true });
    expect(await H.gradeFillBlank({ ...q, studentFill: 'paris', callGemini })).toMatchObject({ status: 'incorrect' });
    expect(callGemini).not.toHaveBeenCalled();
  });
  it('routes variants to review while still recognizing explicitly accepted alternatives', async () => {
    const q = { expectedFill: 'water', acceptableAlternatives: ['H2O'], fillBlankPolicy: 'review-variants' };
    expect(A.gradeFillBlankAnswer('aqua', q)).toMatchObject({ status: 'submitted', evaluable: false, needsReview: true });
    expect(await H.gradeFillBlank({ ...q, studentFill: 'aqua' })).toMatchObject({ status: 'submitted', needsReview: true });
    expect(A.gradeFillBlankAnswer('H2O', q).status).toBe('correct');
  });
});

describe('numeric equivalence and weighting', () => {
  const base = { type: 'numeric-response', correctValue: 100, unit: 'cm', tolerance: 0 };
  it('preserves legacy scoring unless equivalent units are explicitly enabled', () => {
    expect(A.gradeNumericAnswer({ value: 1, unit: 'm' }, base, {}).score).toBe(0);
    const q = { ...base, numericSettings: { allowEquivalentUnits: true, valueWeight: 0.8 } };
    expect(A.gradeNumericAnswer({ value: 1, unit: 'm' }, q, {})).toMatchObject({ status: 'correct', score: 100, convertedValue: 100 });
    expect(A.gradeResponseForItem({ answer: { numericValue: 1, unit: 'm' } }, q).scoreFraction).toBe(1);
  });
  it.each([
    [1, 'kg', 1000, 'g'], [90, 'min', 1.5, 'h'], [250, 'ml', 0.25, 'l'], [12, 'in', 1, 'ft'],
  ])('converts %s %s to %s %s within an explicit dimension', (value, unit, correctValue, expectedUnit) => {
    expect(A.gradeNumericAnswer({ value, unit }, { correctValue, unit: expectedUnit, numericSettings: { allowEquivalentUnits: true } }, {})).toMatchObject({ status: 'correct', score: 100 });
  });
  it('does not invent conversions across dimensions or for unknown units', () => {
    const q = { ...base, numericSettings: { allowEquivalentUnits: true } };
    expect(A.gradeNumericAnswer({ value: 1, unit: 'kg' }, q).score).toBe(0);
    expect(A.gradeNumericAnswer({ value: 1, unit: 'widgets' }, q).score).toBe(0);
  });
  it('uses configurable component credit in both student and teacher grading', () => {
    const q = { ...base, numericSettings: { valueWeight: 0.8 } };
    for (const [value, unit, score] of [[100, 'm', 80], [2, 'cm', 20]]) {
      expect(A.gradeNumericAnswer({ value, unit }, q).score).toBe(score);
      expect(A.gradeResponseForItem({ answer: { numericValue: value, unit } }, q).score).toBe(score);
      expect(A.gradeNumericAnswer({ value, unit }, q, { partialCredit: false }).score).toBe(0);
    }
    expect(A.gradeNumericAnswer({ value: 2, unit: '' }, { correctValue: 1, numericSettings: { valueWeight: 0 } }).score).toBe(0);
  });
  it('invalidates saved grading when scoring conditions change while preserving unmodified legacy signatures', () => {
    expect(A.assessmentItemSignature(base)).toBe(A.legacyAssessmentItemSignature(base));
    expect(A.assessmentItemSignature(base)).not.toBe(A.assessmentItemSignature({ ...base, numericSettings: { valueWeight: 0.8 } }));
  });
});

describe('reasoning and shorter sequencing preserve assessment evidence', () => {
  it('scores compact sequencing out of two while retaining old three/four-part scoring', () => {
    const q = { type: 'sequence-sense', items: ['Seed', 'Shoot', 'Plant'], presentedOrder: [1, 0, 2], orderingPrinciple: 'time' };
    const compact = { ...q, sequenceMode: 'arrange-explain' };
    const answer = { orderAnswer: [0, 1, 2], principleAnswer: 'size' };
    expect(A.gradeResponseForItem({ answer }, compact)).toMatchObject({ status: 'partially-correct', score: 1, scoreFraction: 0.5 });
    expect(A.assessmentResponseState({ answer }, compact).answered).toBe(true);
    expect(A.gradeResponseForItem({ answer: { ...answer, verifyAnswer: 'no', clickedIdx: 0 } }, q)).toMatchObject({ score: 3, scoreFraction: 0.75 });
    expect(A.gradeResponseForItem({ answer: { verifyAnswer: 'no', clickedIdx: 0, principleAnswer: 'size' } }, q).scoreFraction).toBeCloseTo(2 / 3);
    expect(A.gradeResponseForItem({ answer: { orderAnswer: [0, 0, 2], principleAnswer: 'time' } }, compact).status).toBe('submitted');
  });
  it.each([
    [{ type: 'relation-mismatch', pairs: [{ left: 'Root', right: 'Sun' }, { left: 'Leaf', right: 'Light' }], wrongPairIndex: 0, correctPartnerForWrong: 'Water' }, { clickedPairIdx: 0, partnerAnswer: 'Water' }],
    [{ type: 'answer-evidence', answerOptions: ['A', 'B'], correctAnswer: 'A', evidenceOptions: ['E', 'F'], correctEvidence: 'E' }, { answerIdx: 0, evidenceIdx: 0 }],
  ])('retains required reasoning without adding points for prose', (q, answer) => {
    expect(A.gradeResponseForItem({ answer }, q).status).toBe('correct');
    const required = { ...q, requireReasoning: true, explanationPrompt: 'Why does this fit?' };
    expect(A.gradeResponseForItem({ answer }, required)).toMatchObject({ status: 'submitted', needsReasoning: true });
    expect(A.assessmentResponseState({ answer }, required).answered).toBe(false);
    expect(A.assessmentResponseState({ answer, answered: true }, required).answered).toBe(false);
    const complete = { ...answer, explanation: 'The evidence connects the cause to the result.' };
    expect(A.gradeResponseForItem({ answer: complete }, required).scoreFraction).toBe(1);
    expect(A.assessmentAnswerSummary(required, { answer: complete })).toContain(complete.explanation);
    expect(A.assessmentResponseFingerprint(required, { answer: complete })).not.toBe(A.assessmentResponseFingerprint(required, { answer: { ...complete, explanation: 'A different reason.' } }));
  });
});

describe('readiness distinguishes achievement from participation', () => {
  it('does not imply full class readiness from one correct response', () => {
    const q = { type: 'mcq', options: ['A', 'B'], correctAnswer: 'A' };
    const roster = { a: {}, b: {}, c: {}, d: {} };
    const state = { allResponses: { a: { 0: { answer: { optionIdx: 0 } } }, b: { 0: { answer: { idk: true } } } } };
    const report = A.aggregatePreLessonGap(state, { data: { questions: [q] } }, roster);
    expect(report).toMatchObject({ totalStudents: 4, participatingStudents: 2 });
    expect(report.conceptCards[0]).toMatchObject({ scorePercent: 100, expectedCount: 4, totalAnswered: 2, evaluatedCount: 1, idkCount: 1, omittedCount: 2, participationPercent: 50, evaluatedPercent: 25, coverageStatus: 'partial-coverage' });
  });
  it('keeps pending review distinct from missing responses and zero achievement', () => {
    const state = { allResponses: { a: { 0: { answer: { text: 'An explanation.' } } } } };
    const report = A.aggregatePreLessonGap(state, { data: { questions: [{ type: 'short-answer' }] } }, { a: {}, b: {} });
    expect(report.conceptCards[0]).toMatchObject({ scorePercent: null, awaitingReviewCount: 1, omittedCount: 1, evaluatedCount: 0, coverageStatus: 'awaiting-review' });
  });
});

describe('AI feedback preserves the complete criteria and response', () => {
  it('sends full long input and validates criterion feedback against supplied indices', async () => {
    const expectedAnswer = 'criteria '.repeat(150) + 'FINAL RUBRIC REQUIREMENT';
    const studentResponse = 'reasoning '.repeat(250) + 'FINAL RESPONSE EVIDENCE';
    let prompt;
    const result = await H.gradeFreeformAnswer({ question: 'Explain.', expectedAnswer, studentResponse, studentCriteria: ['State a claim.', 'Connect evidence.'], callGemini: async value => {
      prompt = value;
      return JSON.stringify({ status: 'partially-correct', feedback: 'Connect the evidence.', criteriaFeedback: [{ index: 0, status: 'met', feedback: 'Claim is clear.' }, { index: 1, status: 'bad-status', feedback: 'Add a connection.' }, { index: 9, status: 'met', feedback: 'Invented criterion.' }] });
    } });
    expect(prompt).toContain(expectedAnswer);
    expect(prompt).toContain(studentResponse);
    expect(result.criteriaFeedback).toEqual([{ index: 0, status: 'met', feedback: 'Claim is clear.' }, { index: 1, status: 'unclear', feedback: 'Add a connection.' }]);
  });
  it('preserves complete calibration anchors and declines oversized inputs explicitly', async () => {
    const rubric = 'rubric '.repeat(180), studentResponse = 'response '.repeat(230), anchor = 'anchor '.repeat(100);
    let prompt;
    await H.gradeFreeformAnswerWithCalibration({ rubric, studentResponse, calibrationSamples: [{ studentResponse: anchor, teacherScore: 70 }], callGemini: async value => { prompt = value; return '{"status":"correct","score":100,"feedback":"Clear."}'; } });
    expect(prompt).toContain(rubric); expect(prompt).toContain(studentResponse); expect(prompt).toContain(anchor);
    const callGemini = vi.fn();
    expect(await H.gradeFreeformAnswer({ question: 'Q', expectedAnswer: 'A', studentResponse: 'x'.repeat(100001), callGemini })).toMatchObject({ status: 'submitted', needsReview: true, code: 'input-too-long' });
    expect(callGemini).not.toHaveBeenCalled();
  });
});
