import { beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const base = require('../concept_quest_engine.js');
const solo = require('../concept_quest_solo_engine.js');
const question = { type: 'mcq', question: 'Which material conducts?', options: ['Copper', 'Wood'], correctAnswer: 'Copper', conceptLabel: 'Conductors' };
const disputed = { ...question, keyCheck: { status: 'disputed', checkedKey: 'Copper' }, factCheck: '[[KEY:DISPUTED]] The supplied key needs review.' };
const corrected = { ...disputed, correctAnswer: 'Wood' };
let live;
beforeAll(() => { loadAlloModule('quiz_live_aggregators.js'); live = window.AlloModules.QuizLiveAggregators; });

describe('Disputed assessment keys', () => {
  it('keeps submitted live answers and IDK ungraded and suppresses correct-option claims', () => {
    for (const answer of [{ selectedOption: 0 }, { selectedOption: 1 }, { idk: true }]) {
      const response = { answer, status: 'correct', confidence: 'high' };
      expect(live.gradePresentationResponse(response, disputed)).toMatchObject({ status: 'submitted', evaluable: false, isCorrect: null, keyUnderReview: true });
      expect(live.gradeResponseForItem(response, disputed)).toMatchObject({ status: 'submitted', evaluable: false });
      expect(live.presentationAccuracyWeight(response, disputed)).toBeNull();
    }
    expect(live.presentationQuestionIsGameScorable(disputed)).toBe(false);
    expect(live.describePresentationCorrectAnswer(disputed)).toBe('');
    const distribution = live.aggregatePresentationResponses(disputed, { a: { answer: 0 }, b: { answer: 1 } });
    expect(distribution.rows.every(row => !row.isCorrect)).toBe(true);
    expect(distribution.note).toContain('Answer key under review');
    expect(live.aggregateSuccessCriteria({ allResponses: { a: { 0: { answer: 0 } } } }, { data: { questions: [disputed] } }, { a: {} }).byConcept).toEqual({});
    const gradebook = live.aggregateGradebook({ allResponses: { a: { 0: { answer: 0 } } } }, { data: { questions: [disputed] } }, { a: { name: 'Learner' } }, { 'a:0': { status: 'correct' } });
    expect(gradebook.studentRows[0]).toMatchObject({ totalEvaluated: 0, totalCorrect: 0, totalPossible: 0, scorePercent: null });
  });

  it('recognizes current structured and legacy disputes without blocking a changed or confirmed key', () => {
    const checks = [live.isAnswerKeyDisputed, base.isAnswerKeyDisputed, solo.isAnswerKeyDisputed];
    for (const check of checks) {
      expect(check(disputed)).toBe(true);
      expect(check({ ...question, keyCheck: { status: 'disputed', checkedKey: 'Copper' } })).toBe(true);
      expect(check({ ...question, factCheck: '**Correction / Warning:** Review the key.' })).toBe(true);
      expect(check(corrected)).toBe(false);
      expect(check({ ...disputed, keyCheck: { status: 'confirmed', checkedKey: 'Copper' } })).toBe(false);
      expect(check({ ...disputed, type: 'opinion-mcq' })).toBe(false);
    }
    expect(live.gradePresentationResponse({ answer: 1 }, corrected)).toMatchObject({ status: 'correct', evaluable: true });
    expect(live.presentationQuestionIsGameScorable(corrected)).toBe(true);
  });

  it('excludes disputed class checks while retaining corrected keys and accurate source coverage', () => {
    const quest = base.createSession({ questions: [disputed, corrected, question] });
    expect(quest.excludedQuestions).toBe(1);
    expect(quest.assessmentBank.items.map(item => item.sourceIndex)).toEqual([1, 2]);
    expect(base.coverage(quest)).toMatchObject({ total: 2, excluded: 1 });
    expect(quest.assessmentBank.items[0].correctIndex).toBe(1);
    expect(() => base.createSession({ questions: [disputed] })).toThrow(/valid answer key/);
  });

  it('retains disputed solo items as explicit self-review without revealing a key or awarding correctness XP', () => {
    let quest = solo.createSession(base, { data: { questions: [disputed, corrected] } });
    quest = solo.travel(base, quest, 'room-2').quest;
    const item = solo.currentItem(quest);
    expect(item.selfReviewRequired).toBe(true);
    expect(item.explanation).toBe('');
    expect(solo.answerGuide(item)).toContain('Answer key under review');
    expect(solo.answerGuide(item)).not.toContain('Copper');
    expect(solo.grade(item, { answerIndex: 0 }).complete).toBe(false);
    // Also protect older normalized solo saves that did not set this flag.
    expect(solo.grade({ ...item, selfReviewRequired: false }, { answerIndex: 0 }).complete).toBe(false);
    const result = solo.resolveTurn(base, quest, { roleId: 'analyst', abilityId: 'analyze', response: { text: 'I would test the material.', guideRevealed: true, selfReview: 'needs-practice' } });
    expect(result.error).toBeUndefined();
    expect(result.grade).toMatchObject({ status: 'self-reviewed', correct: null, gradable: false });
    expect(result.quest.party.xp).toBe(quest.party.xp);
    expect(solo.coverage(result.quest)).toMatchObject({ attempted: 1, graded: 0, selfReviewed: 1, firstAttemptAccuracy: null });
    expect(solo.grade(result.quest.solo.bank[1], { answerIndex: 1 })).toMatchObject({ correct: true, gradable: true });
  });
});
