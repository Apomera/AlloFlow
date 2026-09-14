import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const base = require('../concept_quest_engine.js');
const solo = require('../concept_quest_solo_engine.js');
const tr = (_key, fallback) => fallback;
const q = (index = 0) => ({ type: 'mcq', question: 'Question ' + index, options: ['A', 'B'], correctAnswer: 'A', conceptLabel: 'Concept ' + index });
const content = questions => ({ id: 'source', data: { questions } });
const normalize = item => solo.normalizeItems(content([item]))[0];
const fixtures = [
  [q(), { answerIndex: 0 }, { answerIndex: 1 }],
  [{ type: 'multi-select', question: 'Pick two', options: ['A', 'B', 'C'], correctAnswers: ['A', 'C'] }, { selectedIndices: [0, 2] }, { selectedIndices: [1] }],
  [{ type: 'fill-blank', question: 'Water becomes ___', expectedFill: 'ice', acceptableAlternatives: ['solid water'] }, { text: '  SOLID water ' }, { text: 'steam' }],
  [{ type: 'numeric-response', question: 'Measure', correctValue: 0.5, tolerance: 0.01, unit: 'm', acceptableUnits: ['metres'] }, { text: '1/2 metres' }, { text: '40 kg' }],
  [{ type: 'sequence-sense', question: 'Check the order', items: ['First', 'Second', 'Third'], presentedOrder: [1, 0, 2], intentionallyWrongIndex: 0, orderingPrinciple: 'Time', principleOptions: ['Time', 'Size'] }, { verifyAnswer: 'no', wrongIndex: 0, order: [0, 1, 2], principleAnswer: 'Time' }, { verifyAnswer: 'yes', principleAnswer: 'Size' }],
  [{ type: 'relation-mismatch', question: 'Fix a pair', pairs: [{ left: 'Cat', right: 'Plant' }, { left: 'Rose', right: 'Plant' }], wrongPairIndex: 0, correctPartnerForWrong: 'Animal', candidatePartners: ['Animal', 'Plant'] }, { pairIndex: 0, partnerAnswer: 'Animal' }, { pairIndex: 1, partnerAnswer: 'Plant' }],
  [{ type: 'answer-evidence', question: 'Choose with evidence', answerOptions: ['Warm', 'Cold'], correctAnswer: 'Cold', evidencePrompt: 'Why?', evidenceOptions: ['Ice formed', 'Steam formed'], correctEvidence: 'Ice formed' }, { answerIndex: 1, evidenceIndex: 0 }, { answerIndex: 0, evidenceIndex: 1 }],
];
function turn(quest, response, roleId = 'analyst', abilityId = 'analyze') {
  const result = solo.resolveTurn(base, quest, { roleId, abilityId, response });
  expect(result.error).toBeUndefined();
  return result.quest;
}
function walkToEnd(quest, responseFor, maximum = 3000, roleId = 'analyst', abilityId = 'analyze') {
  let iterations = 0;
  while (!['complete', 'defeat'].includes(quest.phase) && iterations++ < maximum) {
    if (quest.phase === 'battle') quest = turn(quest, responseFor(solo.currentItem(quest), quest), roleId, abilityId);
    else {
      const number = Number(quest.currentRoomId.replace('room-', ''));
      const result = solo.travel(base, quest, 'room-' + (number + 1));
      expect(result.error).toBeUndefined(); quest = result.quest;
    }
  }
  expect(iterations).toBeLessThan(maximum);
  return quest;
}

describe('Concept Quest solo canonical grading', () => {
  it.each(fixtures)('grades $0.type correct and incorrect responses', (authored, right, wrong) => {
    const item = normalize(authored);
    expect(solo.grade(item, right)).toMatchObject({ complete: true, correct: true, gradable: true, status: 'correct' });
    expect(solo.grade(item, wrong)).toMatchObject({ complete: true, correct: false, gradable: true, status: 'incorrect' });
    expect(solo.grade(item, solo.initialResponse(item)).complete).toBe(false);
  });
  it('retains malformed keys for explicit self-review instead of inventing valid answers', () => {
    const malformed = [
      { type: 'mcq', options: ['A', 'B'], correctAnswer: 'missing' },
      { type: 'multi-select', options: ['A', 'B'], correctAnswers: { answer: 'A' } },
      { type: 'multi-select', options: ['A', 'B'], correctAnswers: ['A', 'missing'] },
      { type: 'sequence-sense', items: ['A', 'B'], presentedOrder: [0, 0], intentionallyWrongIndex: 1, orderingPrinciple: 'Time' },
      { type: 'answer-evidence', answerOptions: ['A', 'B'], correctAnswer: 'A', evidenceOptions: ['X', 'Y'], correctEvidence: 'missing' },
      { type: 'numeric-response', correctValue: null },
      { type: 'numeric-response', correctValue: true },
      { type: 'relation-mismatch', pairs: [null], wrongPairIndex: 0, correctPartnerForWrong: 'A' },
    ];
    const bank = solo.normalizeItems(content(malformed));
    expect(bank).toHaveLength(malformed.length);
    expect(bank.every(item => item.selfReviewRequired)).toBe(true);
    bank.forEach(item => expect(solo.grade(item, { text: 'My reasoning', guideRevealed: true, selfReview: 'needs-practice' })).toMatchObject({ correct: null, gradable: false, status: 'self-reviewed' }));
  });
  it('uses canonical partial-credit calculations without counting partial responses as correct', () => {
    expect(solo.grade(normalize(fixtures[1][0]), { selectedIndices: [0] })).toMatchObject({ score: 50, maxScore: 100, correct: false, status: 'partially-correct' });
    expect(solo.grade(normalize(fixtures[1][0]), { selectedIndices: [0, 0, 0, 1] })).toMatchObject({ score: 0, correct: false });
    expect(solo.grade(normalize(fixtures[3][0]), { text: '0.5 kg' })).toMatchObject({ score: 50, valueCorrect: true, unitCorrect: false });
    // verify + diagnose right; order left as displayed (wrong) and principle wrong
    expect(solo.grade(normalize(fixtures[4][0]), { verifyAnswer: 'no', wrongIndex: 0, principleAnswer: 'Size' })).toMatchObject({ score: 2, maxScore: 4 });
    expect(solo.grade(normalize(fixtures[5][0]), { pairIndex: 0, partnerAnswer: 'Plant' })).toMatchObject({ score: 1, maxScore: 2 });
    expect(solo.grade(normalize(fixtures[6][0]), { answerIndex: 1, evidenceIndex: 1 })).toMatchObject({ score: 1, maxScore: 2 });
    const noPartial = solo.normalizeItems({ data: { questions: [fixtures[1][0]], scoringPolicy: { partialCredit: false } } })[0];
    expect(solo.grade(noPartial, { selectedIndices: [0] }).score).toBe(0);
  });
  it('handles numeric zero, tolerance, fractions, exponents and explicit units without accepting invalid input', () => {
    const zero = normalize({ type: 'numeric-response', question: 'Zero', correctValue: 0, tolerance: 0, unit: '°C' });
    expect(solo.grade(zero, { text: '0', unit: '°C' }).correct).toBe(true);
    expect(solo.answerGuide(zero)).toBe('0 °C');
    expect(solo.grade(normalize(fixtures[3][0]), { text: '5e-1', unit: 'm' }).correct).toBe(true);
    expect(solo.grade(normalize(fixtures[3][0]), { text: '0.51 m' }).correct).toBe(true);
    expect(solo.grade(zero, { text: '0 m', unit: '°C' }).complete).toBe(false);
    expect(solo.grade(zero, { text: '1/0' }).complete).toBe(false);
    expect(solo.grade(zero, { text: 'Infinity' }).complete).toBe(false);
  });
  it('checks all four sequence steps, including an already-correct order left as displayed', () => {
    const item = normalize({ ...fixtures[4][0], presentedOrder: [0, 1, 2], intentionallyWrongIndex: null });
    expect(solo.grade(item, { verifyAnswer: 'yes', principleAnswer: 'Time' })).toMatchObject({ score: 4, maxScore: 4, correct: true });
    // Wrong verdict and wrong diagnosis; the untouched order and the principle still earn their points.
    expect(solo.grade(item, { verifyAnswer: 'no', wrongIndex: 0, principleAnswer: 'Time' })).toMatchObject({ score: 2, correct: false });
    expect(solo.grade(item, { verifyAnswer: 'yes', order: [1, 0, 2], principleAnswer: 'Time' })).toMatchObject({ score: 3, correct: false, arrangeCorrect: false });
  });
  it.each(['short-answer', 'self-explanation'])('requires an explicit guide comparison for %s and never invents correctness', type => {
    const item = normalize({ type, question: 'Explain', expectedAnswer: 'A reason', rubric: 'Use evidence' });
    expect(item.selfReviewRequired).toBe(true);
    expect(solo.grade(item, { text: 'A reason' })).toMatchObject({ complete: false, correct: null });
    expect(solo.grade(item, { text: '', guideRevealed: true, selfReview: 'understood' }).complete).toBe(false);
    expect(solo.grade(item, { text: 'A reason', guideRevealed: true, selfReview: 'understood' })).toMatchObject({ complete: true, correct: null, gradable: false, score: null, status: 'self-reviewed' });
  });
});

describe('Concept Quest solo complete source coverage', () => {
  it('preserves source identity, long wording, visual assets and unsupported items for explicit review', () => {
    const authored = { ...q(), question: 'Long question '.repeat(100), imageUrl: 'data:image/png;base64,AA==', imageAltText: 'Diagram', optionImageUrls: ['a', 'b'], optionImageAltTexts: ['First', 'Second'] };
    const source = content([null, authored, { type: 'new-type', question: 'Explain', expectedAnswer: 'A guide' }]);
    const before = structuredClone(source);
    const quest = solo.createSession(base, source, tr);
    expect(quest.solo.bank.map(item => item.sourceIndex)).toEqual([1, 2]);
    expect(quest.solo.bank[0]).toMatchObject({ prompt: authored.question, imageUrl: authored.imageUrl, imageAltText: 'Diagram', optionImageUrls: ['a', 'b'], sourceIndex: 1 });
    expect(quest.solo.bank[1].selfReviewRequired).toBe(true);
    expect(solo.currentItem(quest).sourceIndex).toBe(1);
    expect(source).toEqual(before);
  });
  it.each([1, 11, 503])('covers all %s questions before victory and retains the full debrief', count => {
    let quest = solo.createSession(base, content(Array.from({ length: count }, (_, index) => q(index))), tr);
    const seen = [];
    quest = walkToEnd(quest, item => { seen.push(item.sourceIndex); return { answerIndex: 0 }; });
    expect(quest.phase).toBe('complete');
    const report = solo.createDebrief(quest);
    expect(seen[0]).toBe(0);
    expect(seen.slice(0, count)).toEqual(Array.from({ length: count }, (_, index) => index));
    expect(new Set(report.history.map(entry => entry.sourceIndex)).size).toBe(count);
    expect(report).toMatchObject({ total: count, attempted: count, remaining: 0, complete: true, firstAttemptAccuracy: 100 });
    expect(report.rounds).toBe(seen.length);
    expect(quest.roundHistory).toHaveLength(seen.length);
    if (count === 503) expect(report.history[0].prompt).toBe('Question 0');
  });
  it('keeps unseen questions even when a path skips rooms and the boss takes lethal damage early', () => {
    let quest = solo.createSession(base, content(Array.from({ length: 40 }, (_, index) => q(index))), tr);
    for (const roomId of ['room-2', 'room-5', 'room-6', 'room-7', 'room-8']) {
      const traveled = solo.travel(base, quest, roomId); expect(traveled.error).toBeUndefined(); quest = traveled.quest;
      while (quest.phase === 'battle') {
        const before = solo.coverage(quest);
        quest = turn(quest, { answerIndex: 0 });
        if (roomId === 'room-8' && before.remaining > 1) {
          expect(quest.phase).toBe('battle');
          expect(base.getRoom(quest, roomId).enemy.hp).toBeGreaterThan(0);
        }
      }
    }
    expect(quest.phase).toBe('complete');
    expect(solo.coverage(quest)).toMatchObject({ attempted: 40, remaining: 0 });
  });
  it('recovers from early health loss to permit all first attempts and keeps the original misses', () => {
    let quest = solo.createSession(base, content(Array.from({ length: 31 }, (_, index) => q(index))), tr);
    quest = solo.travel(base, quest, 'room-2').quest;
    for (let index = 0; index < 31; index++) {
      expect(solo.currentItem(quest).sourceIndex).toBe(index);
      quest = turn(quest, { answerIndex: 1 });
      if (index < 30) expect(quest.phase).toBe('battle');
    }
    expect(quest.solo.history.some(round => round.regrouped)).toBe(true);
    const oldSourceIndex = solo.currentItem(quest).sourceIndex;
    quest = turn(quest, { answerIndex: 0 });
    const report = solo.createDebrief(quest);
    expect(report).toMatchObject({ attempted: 31, remaining: 0, firstAttemptAccuracy: 0, correct: 1 });
    expect(report.items.find(item => item.sourceIndex === oldSourceIndex)).toMatchObject({ firstCorrect: false, lastCorrect: true, attempts: 2 });
    expect(report.missedItems).toHaveLength(31);
  });
  it('runs written-only banks with explicit self-review and zero fabricated XP or accuracy', () => {
    let quest = solo.createSession(base, content(Array.from({ length: 15 }, (_, index) => ({ type: index % 2 ? 'self-explanation' : 'short-answer', question: 'Explain ' + index, expectedAnswer: 'Use evidence ' + index }))), tr);
    quest = walkToEnd(quest, () => ({ text: 'My reasoning', guideRevealed: true, selfReview: 'needs-practice' }));
    expect(quest.phase).toBe('complete');
    expect(quest.party.xp).toBe(0);
    const report = solo.createDebrief(quest);
    expect(report).toMatchObject({ total: 15, attempted: 15, graded: 0, selfReviewed: 15, accuracy: null, firstAttemptAccuracy: null, needsPractice: 15 });
    expect(report.history.every(round => round.correct === null && round.xp === 0 && round.damage === 0)).toBe(true);
  });
  it('leaves the quest untouched when a response is incomplete', () => {
    let quest = solo.createSession(base, content([q()]), tr);
    quest = solo.travel(base, quest, 'room-2').quest;
    const before = structuredClone(quest);
    const result = solo.resolveTurn(base, quest, { roleId: 'analyst', abilityId: 'analyze', response: {} });
    expect(result.error).toBeTruthy(); expect(result.quest).toBe(quest); expect(quest).toEqual(before);
  });
  it('does not change live engine history caps, source filtering, or default health', () => {
    const live = base.createSession({ questions: [q(), { type: 'short-answer', question: 'Explain', expectedAnswer: 'Because' }] });
    expect(live.solo).toBeUndefined(); expect(live.party.maxHp).toBe(14); expect(live.excludedQuestions).toBe(1);
  });
});
