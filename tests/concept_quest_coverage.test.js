import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const engine = require('../concept_quest_engine.js');
const questions = count => Array.from({ length: count }, (_, index) => ({
  type: 'mcq', question: 'Assessment item ' + (index + 1),
  concept: 'Concept ' + (index % 3), options: ['Correct', 'Other'], correctIndex: 0,
}));
const resolve = (quest, count = 8) => engine.resolveBattle(quest, Object.fromEntries(
  Array.from({ length: count }, (_, index) => ['student-' + index, {
    abilityId: 'analyze', roleId: 'analyst', answerIndex: engine.getRoom(quest, quest.currentRoomId).challenge.correctIndex,
    turnKey: engine.getTurnKey(quest),
  }]),
));

describe('Class Concept Quest assessment coverage', () => {
  it.each([20, 35])('covers all %i supported source items before victory despite maximum class damage', count => {
    let quest = engine.createSession({ questions: questions(count) });
    const seen = [];
    expect(engine.coverage(quest)).toEqual({ total: count, attempted: 0, remaining: count, complete: false, excluded: 0 });
    for (let room = 2; room <= 8; room++) {
      const travel = engine.resolveTravel(quest, {}, 'room-' + room);
      expect(travel.error).toBeUndefined();
      quest = travel.quest;
      let turns = 0;
      while (quest.phase === 'battle' && turns++ < count + 5) {
        seen.push(engine.getRoom(quest, quest.currentRoomId).challenge.sourceIndex);
        const result = resolve(quest);
        expect(result.error).toBeUndefined();
        quest = JSON.parse(JSON.stringify(result.quest));
        if (engine.coverage(quest).remaining > 0 && room === 8) {
          expect(quest.phase).toBe('battle');
          expect(engine.getRoom(quest, quest.currentRoomId).enemy.hp).toBeGreaterThan(0);
          expect(quest.lastRound.encounterRule).toContain('supported assessment item(s) remain');
          expect(quest.lastRound.incoming).toBe(0);
        }
      }
      expect(quest.phase).not.toBe('battle');
    }
    expect(quest.phase).toBe('complete');
    expect(new Set(seen)).toEqual(new Set(Array.from({ length: count }, (_, index) => index)));
    expect(seen).toHaveLength(count);
    expect(engine.createDebrief(quest).coverage).toEqual({ total: count, attempted: count, remaining: 0, complete: true, excluded: 0 });
    expect(quest.roundHistory.length).toBeLessThanOrEqual(24);
  });

  it('counts only supported sources and preserves their original indices', () => {
    const sources = [questions(1)[0], { type: 'short-answer', question: 'Explain it' }, null, { ...questions(1)[0], correctIndex: undefined }, questions(1)[0]];
    const quest = engine.createSession({ questions: sources });
    expect(quest.excludedQuestions).toBe(3);
    expect(quest.assessmentBank.items.map(item => item.sourceIndex)).toEqual([0, 4]);
    expect(engine.coverage(quest)).toMatchObject({ total: 2, attempted: 0, excluded: 3 });
  });

  it('does not credit invalid or stale actions, or count repeated items twice', () => {
    let quest = engine.resolveTravel(engine.createSession({ questions: questions(1) }), {}, 'room-2').quest;
    const rejected = engine.resolveBattle(quest, { student: { abilityId: 'analyze', answerIndex: 0, turnKey: 'old' } });
    expect(rejected.error).toBeTruthy();
    expect(engine.coverage(rejected.quest).attempted).toBe(0);
    quest = resolve(quest, 1).quest;
    quest = resolve(quest, 1).quest;
    expect(engine.coverage(quest)).toMatchObject({ attempted: 1, complete: true });
    expect(quest.assessmentBank.attempts[0].rounds).toBe(2);
  });

  it('keeps teacher-authored encounters separate and returns to source questions at the final barrier', () => {
    let quest = engine.createSession({ questions: questions(4) });
    quest.currentRoomId = 'room-8';
    quest.phase = 'battle';
    quest = engine.publishGmDraft(quest, { type: 'challenge', challenge: { prompt: 'Teacher check', options: ['Yes', 'No'], correctIndex: 0 } });
    const first = resolve(quest);
    expect(first.quest.lastRound.prompt).toBe('Teacher check');
    expect(engine.coverage(first.quest).attempted).toBe(0);
    expect(first.quest.phase).toBe('battle');
    expect(engine.getRoom(first.quest, 'room-8').challenge.sourceIndex).toBe(1);
    quest = first.quest;
    for (let index = 0; index < 4; index++) quest = resolve(quest).quest;
    expect(quest.phase).toBe('complete');
    expect(engine.coverage(quest).complete).toBe(true);
  });

  it('preserves legacy rotation for sessions without a bank and leaves solo scheduling to its own engine', () => {
    const original = engine.createSession({ questions: questions(4) });
    delete original.assessmentBank;
    let legacy = engine.resolveTravel(original, {}, 'room-2').quest;
    const expected = engine.getRoom(legacy, 'room-2').challenges[1].prompt;
    legacy = resolve(legacy, 1).quest;
    expect(engine.getRoom(legacy, 'room-2').challenge.prompt).toBe(expected);
    expect(engine.coverage(legacy)).toBeNull();
    const solo = engine.createSession({ questions: questions(4) });
    solo.solo = { bank: [] };
    expect(engine.coverage(solo)).toBeNull();
  });
});
