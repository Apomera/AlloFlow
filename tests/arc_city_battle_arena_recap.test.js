import { describe, it, expect } from 'vitest';
import * as ArcMod from '../stem_lab/stem_tool_arccity.js';
import { render, click } from './helpers/arc_harness.js';

const arc = ArcMod.default || ArcMod;

const stateFor = (battle) => ({
  schemaVersion: arc.ARC_STATE_VERSION,
  levelId: 'L1',
  byLevel: {},
  tier: 'practice',
  badges: [],
  view: 'battle',
  battle
});

describe('Arc City — versioned Circuit Clash arenas', () => {
  it('ships two named three-lane arenas with certified solutions', () => {
    expect(Object.keys(arc.BATTLE_ARENAS)).toEqual(['classic', 'remix']);
    for (const arena of Object.values(arc.BATTLE_ARENAS)) {
      expect(arena.lanes).toHaveLength(3);
      arena.lanes.forEach((lane, index) => {
        const level = arc.battleLane(index, arena.id);
        expect(level.id).toBe(lane.levelId);
        expect(arc.classifyShot(level, lane.solution).result).toBe('hit');
      });
    }
  });

  it('creates Remix drafts and migrates legacy matches to Neon Basics', () => {
    const remix = arc.createBattleState('cpu', { arena: 'remix' });
    expect(remix.schemaVersion).toBe(arc.BATTLE_STATE_VERSION);
    expect(remix.arena).toBe('remix');
    expect(remix.drafts[0][0]).toMatchObject({ a: 0.5, h: 5, k: 3 });

    const legacy = arc.createBattleState('cpu');
    delete legacy.arena;
    legacy.schemaVersion = 2;
    const migrated = arc.normalizeBattleState(legacy);
    expect(migrated.schemaVersion).toBe(arc.BATTLE_STATE_VERSION);
    expect(migrated.arena).toBe('classic');
  });

  it('uses the selected arena for deterministic CPU solutions and wins', () => {
    let battle = arc.createBattleState('cpu', { arena: 'remix' });
    battle.turn = 1;
    const cpu = arc.battleCpuChoice(battle);
    expect(cpu.strategy).toBe('solution');
    expect(arc.classifyShot(arc.battleLane(cpu.lane, 'remix'), cpu.params).result).toBe('hit');

    battle = arc.createBattleState('hotseat', { arena: 'remix' });
    arc.BATTLE_ARENAS.remix.lanes.forEach((lane, index) => {
      battle.turn = 0;
      battle.handoff = false;
      battle = arc.battleFire(battle, lane.solution, index).battle;
    });
    expect(battle.status).toBe('won');
    expect(battle.shields[1]).toEqual([false, false, false]);
  });
});

describe('Arc City — post-match learning recap', () => {
  function completedRemixBattle() {
    let battle = arc.createBattleState('hotseat', { arena: 'remix', assist: 'challenge' });
    battle = arc.battleFire(battle, { a: 0.5, h: 5, k: 3 }, 0).battle;
    arc.BATTLE_ARENAS.remix.lanes.forEach((lane, index) => {
      battle.turn = 0;
      battle.handoff = false;
      battle = arc.battleFire(battle, lane.solution, index).battle;
    });
    return battle;
  }

  it('reclassifies recent equations and identifies the most difficult lane', () => {
    const recap = arc.battleRecap(completedRemixBattle());
    expect(recap.arenaTitle).toBe('Function Remix');
    expect(recap.winnerLabel).toBe('Player 1');
    expect(recap.hardestLaneTitle).toBe('Switchback Circuit');
    expect(recap.recommendation).toMatch(/Switchback Circuit caused the most misses/);
    expect(recap.recent.some(shot => shot.equation.includes('x³'))).toBe(true);
    expect(recap.recent.some(shot => shot.outcome === 'captured the relay')).toBe(true);
  });

  it('switches arenas with a fresh match and renders new lane families', () => {
    const classic = stateFor(arc.createBattleState('cpu'));
    const remix = click(classic, 'battle-arena-remix');
    expect(remix.battle.arena).toBe('remix');
    expect(remix.battle.shots).toBe(0);
    expect(remix.battle.shields).toEqual([[true, true, true], [true, true, true]]);

    const r = render(remix);
    expect(r.text).toContain('Function Remix');
    expect(r.text).toContain('V-shape relay');
    expect(r.text).toContain('Exponential relay');
    expect(r.text).toContain('Cubic relay');
  });

  it('renders an accessible recap with recent equations after victory', () => {
    const r = render(stateFor(completedRemixBattle()));
    expect(r.find('battle-recap')).not.toBeNull();
    expect(r.find('battle-recap-shots')).not.toBeNull();
    expect(r.text).toContain('Post-match analysis');
    expect(r.text).toContain('Most difficult circuit: Switchback Circuit.');
    expect(r.text).toContain('Next step: Switchback Circuit caused the most misses.');
  });
});
