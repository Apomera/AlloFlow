import { describe, it, expect } from 'vitest';
import * as ArcMod from '../stem_lab/stem_tool_arccity.js';
import { render, click } from './helpers/arc_harness.js';

const arc = ArcMod.default || ArcMod;

describe('Arc City — Circuit Clash refinement core', () => {
  it('creates a versioned guided match with standard CPU rules and empty statistics', () => {
    const battle = arc.createBattleState('cpu');
    expect(battle.schemaVersion).toBe(arc.BATTLE_STATE_VERSION);
    expect(battle.assist).toBe('guided');
    expect(battle.cpuLevel).toBe('standard');
    expect(battle.stats).toEqual([{ shots: 0, captures: 0 }, { shots: 0, captures: 0 }]);
  });

  it('uses one deterministic practice probe before solving the same relay', () => {
    const start = arc.createBattleState('cpu', { cpuLevel: 'practice' });
    start.turn = 1;
    const probe = arc.battleCpuChoice(start);
    expect(probe.strategy).toBe('probe');
    expect(arc.classifyShot(arc.battleLane(probe.lane), probe.params).result).not.toBe('hit');

    const afterProbe = arc.battleFire(start, probe.params, probe.lane).battle;
    afterProbe.turn = 1;
    const solve = arc.battleCpuChoice(afterProbe);
    expect(solve.strategy).toBe('solution');
    expect(arc.classifyShot(arc.battleLane(solve.lane), solve.params).result).toBe('hit');
  });

  it('tracks shots and captures without mutating the prior match', () => {
    const start = arc.createBattleState('hotseat');
    const miss = arc.battleFire(start, { m: 0.1, b: 0 }, 0).battle;
    expect(miss.stats[0]).toEqual({ shots: 1, captures: 0 });
    expect(start.stats[0]).toEqual({ shots: 0, captures: 0 });

    miss.turn = 0;
    miss.handoff = false;
    const hit = arc.battleFire(miss, arc.BATTLE_LANE_META[0].solution, 0).battle;
    expect(hit.stats[0]).toEqual({ shots: 2, captures: 1 });
  });

  it('migrates a legacy battle and derives conservative statistics', () => {
    const legacy = arc.createBattleState('cpu');
    delete legacy.assist;
    delete legacy.cpuLevel;
    delete legacy.stats;
    legacy.schemaVersion = 1;
    legacy.trails = [{ id: 'legacy-shot', seat: 0, lane: 0 }];
    legacy.shields[1][0] = false;
    const migrated = arc.normalizeBattleState(legacy);
    expect(migrated.schemaVersion).toBe(arc.BATTLE_STATE_VERSION);
    expect(migrated.assist).toBe('guided');
    expect(migrated.cpuLevel).toBe('standard');
    expect(migrated.stats[0]).toEqual({ shots: 1, captures: 1 });
  });
});

describe('Arc City render — Circuit Clash refinement controls', () => {
  const baseState = (battle) => ({
    schemaVersion: 2,
    levelId: 'L1',
    byLevel: {},
    tier: 'practice',
    badges: [],
    view: 'battle',
    battle
  });

  it('hides trajectory and result feedback when challenge aim is selected', () => {
    const guided = baseState(arc.createBattleState('cpu'));
    const challenge = click(guided, 'battle-assist-challenge');
    expect(challenge.battle.assist).toBe('challenge');
    const r = render(challenge);
    expect(r.find('battle-preview')).toBeNull();
    expect(r.find('battle-preview-hidden')).not.toBeNull();
    expect(r.text).toContain('Challenge aim: trajectory and result stay hidden until Fire.');
  });
  it('hides the CPU trajectory even when guided preview is active', () => {
    const battle = arc.createBattleState('cpu');
    battle.turn = 1;
    const r = render(baseState(battle));
    expect(r.find('battle-preview')).toBeNull();
    expect(r.find('battle-preview-hidden')).not.toBeNull();
    expect(r.text).toContain('CPU controls and trajectory are hidden.');
  });


  it('offers a transparent practice CPU strategy', () => {
    const state = baseState(arc.createBattleState('cpu'));
    const next = click(state, 'cpu-level-practice');
    expect(next.battle.cpuLevel).toBe('practice');
    expect(next.battle.log[0]).toMatch(/Practice CPU enabled/);
  });

  it('shows live match statistics and preserves selected rules on rematch', () => {
    const battle = arc.createBattleState('cpu', { assist: 'challenge', cpuLevel: 'practice' });
    battle.stats[0] = { shots: 4, captures: 3 };
    battle.status = 'won';
    battle.winner = 0;
    battle.shields[1] = [false, false, false];
    const state = baseState(battle);
    const r = render(state);
    expect(r.text).toContain('Player 1: 3 captures / 4 shots (75%)');
    expect(r.text).toContain('Rematch');

    const next = click(state, 'battle-reset');
    expect(next.battle.assist).toBe('challenge');
    expect(next.battle.cpuLevel).toBe('practice');
    expect(next.battle.status).toBe('playing');
    expect(next.battle.stats[0]).toEqual({ shots: 0, captures: 0 });
  });
});
