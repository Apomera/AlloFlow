import { describe, it, expect } from 'vitest';
import * as ArcMod from '../stem_lab/stem_tool_arccity.js';

const arc = ArcMod.default || ArcMod;

describe('Arc City — versioned state migration', () => {
  it('adds a schema version without losing existing campaign progress', () => {
    const old = { levelId: 'L5', tier: 'independent', byLevel: { L1: { solved: true } }, badges: ['first-light'] };
    const migrated = arc.migrateArcState(old);
    expect(migrated.schemaVersion).toBe(arc.ARC_STATE_VERSION);
    expect(migrated.levelId).toBe('L5');
    expect(migrated.byLevel.L1.solved).toBe(true);
    expect(migrated.badges).toEqual(['first-light']);
  });
});

describe('Arc City — Circuit Clash deterministic battle core', () => {
  it('starts a CPU match with three active relays per side', () => {
    const battle = arc.createBattleState('cpu');
    expect(battle.mode).toBe('cpu');
    expect(battle.turn).toBe(0);
    expect(battle.shields).toEqual([[true, true, true], [true, true, true]]);
  });

  it('advances the turn on a miss and records one bounded light trail', () => {
    const start = arc.createBattleState('hotseat');
    const shot = arc.battleFire(start, { m: 0.1, b: 0 }, 0);
    expect(shot.result.result).not.toBe('hit');
    expect(shot.battle.turn).toBe(1);
    expect(shot.battle.shields[1]).toEqual([true, true, true]);
    expect(shot.battle.trails).toHaveLength(1);
    expect(shot.battle.log[0]).toMatch(/Player 1 missed/);
    expect(start.trails).toHaveLength(0);
  });

  it.each([
    [0, { m: 0.5, b: 0 }],
    [1, { a: -0.5, h: 5, k: 5 }],
    [2, { a: 2.5, b: 1.0472, c: 1, k: 4 }]
  ])('captures lane %i only when its function reaches the relay', (lane, params) => {
    const shot = arc.battleFire(arc.createBattleState('hotseat'), params, lane);
    expect(shot.result.result).toBe('hit');
    expect(shot.captured).toBe(true);
    expect(shot.battle.shields[1][lane]).toBe(false);
    expect(shot.battle.trails[0].lane).toBe(lane);
  });

  it('wins after one player captures all three opposing relays', () => {
    let battle = arc.createBattleState('hotseat');
    for (let lane = 0; lane < 3; lane++) {
      battle.turn = 0;
      battle.handoff = false;
      battle = arc.battleFire(battle, arc.BATTLE_LANE_META[lane].solution, lane).battle;
    }
    expect(battle.status).toBe('won');
    expect(battle.winner).toBe(0);
    expect(battle.shields[1]).toEqual([false, false, false]);
    expect(battle.log[0]).toMatch(/wins Circuit Clash/);
  });

  it('CPU targeting deterministically chooses the first remaining player relay', () => {
    const battle = arc.createBattleState('cpu');
    battle.turn = 1;
    battle.shields[0] = [false, true, true];
    const choice = arc.battleCpuChoice(battle);
    expect(choice.lane).toBe(1);
    expect(arc.classifyShot(arc.battleLane(1), choice.params).result).toBe('hit');
  });

  it('normalization caps persisted trails and log entries', () => {
    const raw = arc.createBattleState('cpu');
    raw.trails = Array.from({ length: 20 }, (_, i) => ({ id: `t${i}` }));
    raw.log = Array.from({ length: 20 }, (_, i) => `event ${i}`);
    const normalized = arc.normalizeBattleState(raw);
    expect(normalized.trails).toHaveLength(12);
    expect(normalized.log).toHaveLength(12);
  });
});
