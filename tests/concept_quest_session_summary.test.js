import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const engine = require('../concept_quest_engine.js');
const questions = count => Array.from({ length: count }, (_, i) => ({ type: 'mcq', question: 'Question ' + i, concept: 'Concept ' + i, options: ['Correct', 'Other'], correctIndex: 0 }));
const answer = (quest, correct = true, count = 20) => Object.fromEntries(Array.from({ length: count }, (_, i) => ['learner-' + i, {
  abilityId: 'question', roleId: 'investigator', answerIndex: correct ? 0 : 1, turnKey: engine.getTurnKey(quest),
}]));

describe('Concept Quest whole-session evidence', () => {
  it('retains early errors and concept evidence through a full 35-item campaign and JSON save/resume', () => {
    let quest = engine.createSession({ questions: questions(35) });
    quest.party.hp = quest.party.maxHp = 1000;
    const played = [];
    for (let room = 2; room <= 8; room++) {
      const travel = engine.resolveTravel(quest, {}, 'room-' + room);
      expect(travel.error).toBeUndefined(); quest = travel.quest;
      for (let turns = 0; quest.phase === 'battle' && turns < 100; turns++) {
        const result = engine.resolveBattle(quest, answer(quest, played.length >= 11));
        expect(result.error).toBeUndefined();
        played.push(result.quest.roundHistory.at(-1));
        quest = JSON.parse(JSON.stringify(result.quest));
      }
    }
    expect(quest.phase).toBe('complete');
    expect(played).toHaveLength(35);
    expect(quest.roundHistory).toHaveLength(24);
    expect(quest.roundHistory.every(round => round.correct === round.total)).toBe(true);
    const debrief = engine.createDebrief(quest);
    expect(debrief).toMatchObject({ rounds: 35, recentRoundCount: 24, totalAnswers: 700, correctAnswers: 480, accuracy: 69, completeHistory: true, summaryScope: 'whole-session' });
    expect(debrief.conceptBreakdown).toHaveLength(35);
    expect(debrief.needsReview.accuracy).toBe(0);
    expect(debrief.roleSynergies).toBe(played.reduce((sum, round) => sum + round.synergyCount, 0));
    expect(debrief.combos).toBe(played.filter(round => round.combo).length);
    expect(debrief.peerAssists).toBe(played.reduce((sum, round) => sum + round.assistedCount, 0));
    expect(debrief.puzzlesSolved).toBe(played.filter(round => round.roomKind === 'puzzle' && round.enemyDefeated).length);
    expect(debrief.conceptsCleared).toEqual([...new Set(played.filter(round => round.enemyDefeated).map(round => round.concept))]);
  });

  it('migrates retained legacy evidence honestly and continues accumulating beyond the history cap', () => {
    let quest = engine.resolveTravel(engine.createSession({ questions: questions(2) }), {}, 'room-2').quest;
    delete quest.learningTotals;
    quest.roundHistory = Array.from({ length: 24 }, (_, i) => ({ concept: 'Legacy concept', correct: i < 12 ? 1 : 0, total: 1, combo: i === 0, synergyCount: 1, assistedCount: 1, roomKind: 'puzzle', enemyDefeated: i === 0 }));
    expect(engine.createDebrief(quest)).toMatchObject({ rounds: 24, accuracy: 50, completeHistory: false, summaryScope: 'available-history', combos: 1, puzzlesSolved: 1 });
    quest = engine.resolveBattle(quest, answer(quest, true, 1)).quest;
    expect(quest.roundHistory).toHaveLength(24);
    expect(engine.createDebrief(quest)).toMatchObject({ rounds: 25, correctAnswers: 13, totalAnswers: 25, accuracy: 52, completeHistory: false, combos: 1, puzzlesSolved: 1, peerAssists: 24 });
    const shorter = { ...quest, learningTotals: undefined, roundHistory: quest.roundHistory.slice(0, 3) };
    expect(engine.createDebrief(shorter).completeHistory).toBe(true);
  });

  it('preserves accumulated learning across GM undo and rejects undo from before new learning', () => {
    let quest = engine.resolveTravel(engine.createSession({ questions: questions(30) }), {}, 'room-2').quest;
    quest.party.hp = quest.party.maxHp = 1000;
    engine.getRoom(quest, quest.currentRoomId).enemy.hp = 1000;
    engine.getRoom(quest, quest.currentRoomId).enemy.maxHp = 1000;
    for (let i = 0; i < 26; i++) quest = engine.resolveBattle(quest, answer(quest, true, 1)).quest;
    const summary = engine.createDebrief(quest);
    const adjusted = engine.adjustEncounter(quest, 'shield', 2).quest;
    const undone = engine.undoLastGmChange(adjusted);
    expect(undone.error).toBeUndefined();
    expect(engine.createDebrief(undone.quest)).toEqual(summary);
    const next = engine.resolveBattle(adjusted, answer(adjusted, true, 1)).quest;
    expect(engine.createDebrief(next).rounds).toBe(27);
    // Even a retained stale snapshot cannot pass by matching a capped length of 24.
    const stale = { ...next, gmHistory: adjusted.gmHistory, gmUndo: adjusted.gmUndo };
    expect(engine.undoLastGmChange(stale).error).toBeTruthy();
    expect(engine.createDebrief(stale).rounds).toBe(27);
  });
});
