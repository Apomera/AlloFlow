import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const engine = require('../concept_quest_engine.js');
const read = relativePath => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('Concept Quest engine', () => {
  const questions = [
    { question: 'Which claim best describes energy transfer?', options: ['Energy disappears', 'Energy moves and changes form', 'Energy is matter'], correctIndex: 1, concept: 'Energy transfer' },
    { question: 'Which evidence supports the claim?', options: ['Measured temperature rose', 'The color is blue'], correctIndex: 0, concept: 'Using evidence' },
  ];

  it('creates a deterministic eight-room cooperative map from lesson concepts', () => {
    const first = engine.createSession({ title: 'Energy', questions });
    const second = engine.createSession({ title: 'Energy', questions });
    expect(first.rooms).toHaveLength(8);
    expect(first.rooms.map(room => ({ id: room.id, concept: room.concept, neighbors: room.neighbors })))
      .toEqual(second.rooms.map(room => ({ id: room.id, concept: room.concept, neighbors: room.neighbors })));
    expect(first.rooms.some(room => room.kind === 'boss')).toBe(true);
    expect(first.abilities.map(ability => ability.id)).toEqual(['analyze', 'explain', 'connect', 'question']);
    expect(first.roles.map(role => role.id)).toEqual(['analyst', 'explainer', 'connector', 'investigator']);
    expect(first.supports.map(support => support.id)).toEqual(['clarify', 'guard', 'encourage']);
    expect(first.version).toBe(2);
    expect(first.rooms[1].challenges).toHaveLength(2);
  });

  it('uses deterministic vote ties and teacher-authoritative travel', () => {
    const quest = engine.createSession({ questions });
    const result = engine.resolveTravel(quest, { z: 'room-2', a: 'room-2' });
    expect(result.error).toBeUndefined();
    expect(result.quest.currentRoomId).toBe('room-2');
    expect(result.quest.phase).toBe('battle');
    expect(result.quest.visited).toContain('room-2');
  });

  it('resolves concept answers into bounded cooperative ability effects', () => {
    const start = engine.createSession({ questions });
    const battle = engine.resolveTravel(start, {}, 'room-2').quest;
    const result = engine.resolveBattle(battle, {
      studentA: { abilityId: 'explain', answerIndex: 0 },
      studentB: { abilityId: 'connect', answerIndex: 0 },
      studentC: { abilityId: 'question', answerIndex: 1 },
    });
    expect(result.error).toBeUndefined();
    expect(result.summary.total).toBe(3);
    expect(result.summary.correct).toBe(2);
    expect(result.summary.damage).toBeGreaterThan(0);
    expect(result.quest.party.hp).toBeLessThanOrEqual(result.quest.party.maxHp);
    expect(result.quest.party.shield).toBeLessThanOrEqual(8);
    expect(result.quest.lastRound).toMatchObject({ correct: 2, total: 3 });
    expect(engine.getRoom(result.quest, 'room-2').challengeIndex).toBe(1);
  });

  it('rewards diverse correct abilities and matching party roles with a combo', () => {
    const battle = engine.resolveTravel(engine.createSession({ questions }), {}, 'room-2').quest;
    const result = engine.resolveBattle(battle, {
      a: { abilityId: 'analyze', answerIndex: 0 },
      b: { abilityId: 'explain', answerIndex: 0 },
      c: { abilityId: 'connect', answerIndex: 0 },
    }, { a: 'analyst', b: 'explainer', c: 'connector' });
    expect(result.summary).toMatchObject({ combo: true, synergyCount: 3 });
    expect(result.summary.damage).toBeGreaterThanOrEqual(12);
  });

  it('lets correct students directly assist classmates during a cooperative turn', () => {
    const battle = engine.resolveTravel(engine.createSession({ questions }), {}, 'room-2').quest;
    const result = engine.resolveBattle(battle, {
      helper: { abilityId: 'analyze', answerIndex: 0, supportId: 'clarify', supportTargetUid: 'classmate' },
      classmate: { abilityId: 'explain', answerIndex: 1 },
    });
    expect(result.summary.assistedCount).toBe(1);
    expect(result.quest.lastRound.assistedCount).toBe(1);
    expect(engine.createDebrief(result.quest).peerAssists).toBe(1);
  });

  it('gives puzzle rooms a two-thirds consensus reasoning lock', () => {
    const quest = engine.createSession({ questions });
    quest.currentRoomId = 'room-3';
    quest.phase = 'battle';
    const failed = engine.resolveBattle(quest, {
      a: { abilityId: 'analyze', answerIndex: 1 },
      b: { abilityId: 'explain', answerIndex: 0 },
      c: { abilityId: 'connect', answerIndex: 0 },
    });
    expect(failed.summary.damage).toBeLessThanOrEqual(2);
    expect(failed.summary.encounterRule).toContain('two-thirds consensus');

    const opened = engine.resolveBattle(quest, {
      a: { abilityId: 'analyze', answerIndex: 1 },
      b: { abilityId: 'explain', answerIndex: 1 },
      c: { abilityId: 'connect', answerIndex: 0 },
    });
    expect(opened.summary.damage).toBeGreaterThan(4);
    expect(opened.summary.encounterRule).toContain('reasoning lock');
  });

  it('normalizes AI drafts and caps generated item/enemy power', () => {
    const item = engine.normalizeGmDraft({ type: 'item', title: '<b>Lens</b>', item: { effect: { type: 'heal', amount: 999 } } });
    const enemy = engine.normalizeGmDraft({ type: 'enemy', enemy: { hp: 999, attack: 99 }, options: ['A', 'B'], correctIndex: 0 });
    expect(item.title).toBe('bLens/b');
    expect(item.item.effect.amount).toBe(3);
    expect(enemy.enemy.hp).toBe(16);
    expect(enemy.enemy.attack).toBe(3);
  });

  it('turns a teacher-published challenge into a playable encounter', () => {
    const quest = engine.createSession({ questions });
    const next = engine.publishGmDraft(quest, {
      type: 'challenge', title: 'Evidence Gate', description: 'Defend the claim.',
      challenge: { prompt: 'Which is evidence?', options: ['A measurement', 'A guess'], correctIndex: 0 },
    });
    expect(next.phase).toBe('battle');
    expect(engine.getRoom(next, next.currentRoomId).enemy.name).toBe('Challenge Gate');
  });

  it('lets the teacher use and consume bounded shared items', () => {
    const quest = engine.createSession({ questions });
    quest.party.hp = 10;
    quest.inventory = [{ id: 'heal', name: 'Recall Tonic', description: 'Restore focus.', effect: { type: 'heal', amount: 3 } }];
    const result = engine.useItem(quest, 0);
    expect(result.error).toBeUndefined();
    expect(result.quest.party.hp).toBe(13);
    expect(result.quest.inventory).toHaveLength(0);
    expect(result.quest.activeEvent.title).toContain('Recall Tonic');
  });

  it('gates the boss until the class earns enough concept sigils', () => {
    const quest = engine.createSession({ questions });
    quest.currentRoomId = 'room-7';
    quest.phase = 'explore';
    expect(engine.resolveTravel(quest, {}, 'room-8').error).toContain('more concept sigil');
    quest.sigils = ['Energy transfer', 'Using evidence', 'Systems'];
    expect(engine.resolveTravel(quest, {}, 'room-8').quest.currentRoomId).toBe('room-8');
  });

  it('records campaign evidence and creates a cooperative debrief', () => {
    const battle = engine.resolveTravel(engine.createSession({ questions }), {}, 'room-2').quest;
    const resolved = engine.resolveBattle(battle, {
      a: { abilityId: 'analyze', answerIndex: 0 },
      b: { abilityId: 'explain', answerIndex: 0 },
      c: { abilityId: 'connect', answerIndex: 0 },
    }, { a: 'analyst', b: 'explainer', c: 'connector' }).quest;
    const debrief = engine.createDebrief(resolved);
    expect(resolved.sigils).toContain('Using evidence');
    expect(debrief).toMatchObject({ rounds: 1, accuracy: 100, combos: 1, roleSynergies: 3 });
    expect(debrief.conceptBreakdown[0]).toMatchObject({ concept: 'Using evidence', accuracy: 100 });
    expect(debrief.strongestConcept.concept).toBe('Using evidence');
  });

  it('lets the teacher undo the last published GM change', () => {
    const quest = engine.createSession({ questions });
    const changed = engine.publishGmDraft(quest, { type: 'enemy', title: 'Surprise', description: 'A new misconception arrives.' });
    expect(changed.phase).toBe('battle');
    const undone = engine.undoLastGmChange(changed);
    expect(undone.error).toBeUndefined();
    expect(undone.quest.phase).toBe('explore');
    expect(undone.quest.activeEvent).toBeNull();
    expect(undone.quest.gmUndo).toBeNull();
  });

  it('keeps up to five reversible teacher pacing changes', () => {
    const quest = engine.createSession({ questions });
    quest.party.hp = 10;
    const healed = engine.adjustEncounter(quest, 'heal', 3).quest;
    const shielded = engine.adjustEncounter(healed, 'shield', 2).quest;
    expect(shielded.gmHistory).toHaveLength(2);
    const firstUndo = engine.undoLastGmChange(shielded).quest;
    expect(firstUndo.party).toMatchObject({ hp: 13, shield: 0 });
    const secondUndo = engine.undoLastGmChange(firstUndo).quest;
    expect(secondUndo.party).toMatchObject({ hp: 10, shield: 0 });
    expect(secondUndo.gmUndo).toBeNull();
  });

  it('keeps runtime mirrors and transport-neutral integration in sync', () => {
    expect(read('desktop/web-app/public/concept_quest_engine.js')).toBe(read('concept_quest_engine.js'));
    expect(read('desktop/web-app/public/concept_quest_teacher_module.js')).toBe(read('concept_quest_teacher_module.js'));
    expect(read('desktop/web-app/public/view_quiz_module.js')).toBe(read('view_quiz_module.js'));
    expect(read('AlloFlowANTI.txt')).toContain("const launchConceptQuest = _erCall('launchConceptQuest')");
    expect(read('escape_room_module.js')).toContain("mode: 'concept-quest'");
    expect(read('teacher_source.jsx')).toContain('escapeRoomState.teamProgress.All.${field}.${user.uid}');
  });
});
