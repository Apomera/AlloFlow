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

function collisionBattle() {
  let battle = arc.createBattleState('hotseat', { trailRule: 'walls' });
  battle = arc.battleFire(battle, { m: 0.1, b: 0 }, 0).battle;
  battle = arc.battleBeginTurn(battle).battle;
  return battle;
}

describe('Arc City — optional Trail Walls battle rules', () => {
  it('versions the rule while keeping existing and CPU matches non-colliding by default', () => {
    expect(arc.createBattleState('hotseat').trailRule).toBe('visual');
    expect(arc.createBattleState('hotseat', { trailRule: 'walls' }).trailRule).toBe('walls');
    expect(arc.createBattleState('cpu', { trailRule: 'walls' }).trailRule).toBe('visual');

    const legacy = arc.createBattleState('hotseat');
    legacy.schemaVersion = 4;
    delete legacy.trailRule;
    expect(arc.normalizeBattleState(legacy).trailRule).toBe('visual');
    legacy.trailRule = 'walls';
    expect(arc.normalizeBattleState(legacy).trailRule).toBe('walls');
    legacy.mode = 'cpu';
    expect(arc.normalizeBattleState(legacy).trailRule).toBe('visual');
  });

  it('lets an opposing failed trail stop an otherwise successful mirrored shot', () => {
    const battle = collisionBattle();
    expect(arc.classifyShot(arc.battleLane(0), arc.BATTLE_LANE_META[0].solution).result).toBe('hit');

    const shot = arc.battleFire(battle, arc.BATTLE_LANE_META[0].solution, 0);
    expect(shot.result.result).toBe('trail');
    expect(shot.result.baseResult).toBe('hit');
    expect(shot.result.globalX).toBeGreaterThan(5);
    expect(shot.captured).toBe(false);
    expect(shot.trail.trailSeat).toBe(0);
    expect(shot.battle.shields[0][0]).toBe(true);
    expect(shot.message).toMatch(/collided with Player 1's failed trail/i);
    expect(arc.describeResult(arc.battleLane(0), shot.result, 1)).toMatch(/Change at least one parameter/);
  });

  it('does not collide in Visual Only rules or beyond a failed trail visible endpoint', () => {
    let visual = arc.createBattleState('hotseat');
    visual = arc.battleFire(visual, { m: 0.1, b: 0 }, 0).battle;
    visual = arc.battleBeginTurn(visual).battle;
    const visualShot = arc.battleFire(visual, arc.BATTLE_LANE_META[0].solution, 0);
    expect(visualShot.result.result).toBe('hit');
    expect(visualShot.captured).toBe(true);

    const bounded = collisionBattle();
    bounded.trails[0].killedAt = { x: 0.5, y: 0.05 };
    const boundedShot = arc.battleFire(bounded, arc.BATTLE_LANE_META[0].solution, 0);
    expect(boundedShot.result.result).toBe('hit');
    expect(boundedShot.captured).toBe(true);
  });

  it('treats successful trails as dissipated rather than permanent blockers', () => {
    let battle = arc.createBattleState('hotseat', { trailRule: 'walls' });
    battle = arc.battleFire(battle, arc.BATTLE_LANE_META[0].solution, 0).battle;
    battle = arc.battleBeginTurn(battle).battle;
    const reply = arc.battleFire(battle, arc.BATTLE_LANE_META[0].solution, 0);
    expect(reply.result.result).toBe('hit');
    expect(reply.captured).toBe(true);
  });

  it('records collision-aware recap language', () => {
    const shot = arc.battleFire(collisionBattle(), arc.BATTLE_LANE_META[0].solution, 0);
    const recap = arc.battleRecap(shot.battle);
    expect(recap.recent[0].outcome).toMatch(/collided with Player 1's failed trail/);
    expect(recap.recommendation).toMatch(/separates from the opposing trail/);
  });
});

describe('Arc City render — Trail Walls controls and feedback', () => {
  it('offers the ruleset only for hot-seat play and starts a fresh match when selected', () => {
    const hotseat = stateFor(arc.createBattleState('hotseat'));
    const rendered = render(hotseat);
    expect(rendered.find('battle-trail-rule')).not.toBeNull();
    expect(rendered.find('battle-trails-visual').props['aria-pressed']).toBe(true);

    const walls = click(hotseat, 'battle-trails-walls');
    expect(walls.battle.trailRule).toBe('walls');
    expect(walls.battle.shots).toBe(0);
    expect(render(walls).find('battle-trails-walls').props['aria-pressed']).toBe(true);

    const cpu = render(stateFor(arc.createBattleState('cpu')));
    expect(cpu.find('battle-trail-rule')).toBeNull();
  });

  it('predicts and marks a collision using the same core result as Fire', () => {
    const battle = collisionBattle();
    battle.drafts[1][0] = { ...arc.BATTLE_LANE_META[0].solution };
    const preview = render(stateFor(battle));
    expect(preview.text).toContain('Prediction: Trail collision');
    expect(preview.find('battle-svg').props['aria-label']).toContain('active light walls');

    const fired = arc.battleFire(battle, arc.BATTLE_LANE_META[0].solution, 0).battle;
    const aftermath = render(stateFor(fired));
    expect(aftermath.findAll(node => String(node.props && node.props.key || '').startsWith('bt-hit-')).length).toBeGreaterThan(0);
  });

  it('documents Trail Walls in the native How to Play disclosure', () => {
    const rendered = render(stateFor(arc.createBattleState('hotseat')));
    expect(rendered.text).toContain('Optional Trail Walls');
    expect(rendered.text).toContain('Change the curve to route around them.');
  });
});
