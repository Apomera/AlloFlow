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

function threatenedTurn() {
  let battle = arc.createBattleState('hotseat', { trailRule: 'walls' });
  battle = arc.battleFire(battle, { m: 0.1, b: 0 }, 0).battle;
  return arc.battleBeginTurn(battle).battle;
}

describe('Arc City Phase Pulse core rules', () => {
  it('versions one charge per player only for Trail Walls matches', () => {
    const walls = arc.createBattleState('hotseat', { trailRule: 'walls' });
    expect(walls.schemaVersion).toBe(arc.BATTLE_STATE_VERSION);
    expect(walls.phaseCharges).toEqual([1, 1]);
    expect(walls.weapon).toEqual(['standard', 'standard']);
    expect(arc.createBattleState('hotseat').phaseCharges).toEqual([0, 0]);
    expect(arc.createBattleState('cpu', { trailRule: 'walls' }).phaseCharges).toEqual([0, 0]);

    const legacy = arc.createBattleState('hotseat', { trailRule: 'walls' });
    legacy.schemaVersion = 5;
    delete legacy.phaseCharges;
    delete legacy.weapon;
    const migrated = arc.normalizeBattleState(legacy);
    expect(migrated.phaseCharges).toEqual([1, 1]);
    expect(migrated.weapon).toEqual(['standard', 'standard']);
  });

  it('bypasses only an opposing light trail and consumes the firing player charge', () => {
    const standard = arc.battleFire(threatenedTurn(), arc.BATTLE_LANE_META[0].solution, 0);
    expect(standard.result.result).toBe('trail');

    const battle = threatenedTurn();
    battle.weapon[1] = 'phase';
    const phase = arc.battleFire(battle, arc.BATTLE_LANE_META[0].solution, 0);
    expect(phase.weapon).toBe('phase');
    expect(phase.result.result).toBe('hit');
    expect(phase.captured).toBe(true);
    expect(phase.trail.weapon).toBe('phase');
    expect(phase.battle.phaseCharges).toEqual([1, 0]);
    expect(phase.battle.weapon).toEqual(['standard', 'standard']);
    expect(phase.message).toMatch(/^Phase Pulse:/);
  });

  it('cannot reuse a spent charge even if persisted selection requests phase', () => {
    const battle = threatenedTurn();
    battle.weapon[1] = 'phase';
    const spent = arc.battleFire(battle, arc.BATTLE_LANE_META[0].solution, 0).battle;
    spent.status = 'playing';
    spent.winner = null;
    spent.turn = 1;
    spent.handoff = false;
    spent.weapon[1] = 'phase';
    const normalized = arc.normalizeBattleState(spent);
    expect(normalized.weapon[1]).toBe('standard');
    const retry = arc.battleFire(normalized, arc.BATTLE_LANE_META[0].solution, 0);
    expect(retry.weapon).toBe('standard');
    expect(retry.result.result).toBe('trail');
  });

  it('still obeys ordinary circuit geometry and spends the charge on a miss', () => {
    const battle = arc.createBattleState('hotseat', { trailRule: 'walls' });
    battle.weapon[0] = 'phase';
    const shot = arc.battleFire(battle, { m: 0.1, b: 0 }, 0);
    expect(shot.result.result).toBe(arc.classifyShot(arc.battleLane(0), { m: 0.1, b: 0 }).result);
    expect(shot.result.result).not.toBe('hit');
    expect(shot.captured).toBe(false);
    expect(shot.battle.phaseCharges[0]).toBe(0);
  });
});

describe('Arc City Phase Pulse render flow', () => {
  it('keeps loadout selection private during handoff and absent outside Trail Walls', () => {
    const walls = render(stateFor(arc.createBattleState('hotseat', { trailRule: 'walls' })));
    expect(walls.find('battle-weapon')).not.toBeNull();
    expect(walls.find('battle-weapon-phase').props.disabled).toBe(false);

    const waitingState = click(stateFor(arc.createBattleState('hotseat', { trailRule: 'walls' })), 'battle-fire');
    expect(render(waitingState).find('battle-weapon')).toBeNull();
    expect(render(stateFor(arc.createBattleState('hotseat'))).find('battle-weapon')).toBeNull();
    expect(render(stateFor(arc.createBattleState('cpu'))).find('battle-weapon')).toBeNull();
  });

  it('arms Phase Pulse, changes preview parity, fires, and disables the spent charge', () => {
    const state = stateFor(threatenedTurn());
    const standard = render(state);
    expect(standard.text).toContain('Prediction: Trail collision');
    expect(standard.find('battle-preview-collision')).not.toBeNull();
    const boundedPoint = standard.find('battle-preview').props.points.trim().split(/\s+/).at(-1).split(',').map(Number);
    expect(Math.abs(boundedPoint[0] - Number(standard.find('battle-preview-collision').props.cx))).toBeLessThan(1);

    const armed = click(state, 'battle-weapon-phase');
    expect(armed.battle.weapon[1]).toBe('phase');
    const armedRender = render(armed);
    expect(armedRender.find('battle-weapon-phase').props['aria-pressed']).toBe(true);
    expect(armedRender.text).toContain('Fire phase pulse');
    expect(armedRender.find('battle-preview').props.stroke).toBe('#ffffff');
    expect(armedRender.find('battle-preview').props.strokeDasharray).toBeNull();
    expect(armedRender.find('battle-preview-collision')).toBeNull();
    const phasePoint = armedRender.find('battle-preview').props.points.trim().split(/\s+/).at(-1).split(',').map(Number);
    expect(phasePoint[0]).toBeLessThan(5);

    const fired = click(armed, 'battle-fire');
    expect(fired.battle.phaseCharges[1]).toBe(0);
    expect(fired.battle.trails.at(-1).weapon).toBe('phase');
    const confirmed = click(fired, 'battle-begin-turn');
    confirmed.battle.turn = 1;
    const spentRender = render(confirmed);
    expect(spentRender.find('battle-weapon-phase').props.disabled).toBe(true);
  });

  it('documents the one-use math-preserving loadout', () => {
    const rendered = render(stateFor(arc.createBattleState('hotseat', { trailRule: 'walls' })));
    expect(rendered.text).toContain('Each Trail Walls player gets one Phase Pulse.');
    expect(rendered.text).toContain('walls, gates, and the target still use the authored function.');
  });
});
