import { describe, it, expect } from 'vitest';
import * as ArcMod from '../stem_lab/stem_tool_arccity.js';
import { render, click } from './helpers/arc_harness.js';

const arc = ArcMod.default || ArcMod;

const stateFor = (battle, extra = {}) => ({
  schemaVersion: arc.ARC_STATE_VERSION,
  levelId: 'L1',
  byLevel: {},
  tier: 'practice',
  badges: [],
  view: 'battle',
  battle,
  ...extra
});

function fireAndBegin(battle, params, lane) {
  const fired = arc.battleFire(battle, params, lane).battle;
  return fired.status === 'won' ? fired : arc.battleBeginTurn(fired).battle;
}

function revisionMatch(lane, firstParams, revisedParams) {
  let battle = arc.createBattleState('hotseat');
  battle = fireAndBegin(battle, firstParams, lane);
  battle = fireAndBegin(battle, { m: 0.1, b: 0 }, 0);
  battle = fireAndBegin(battle, revisedParams, lane);
  return battle;
}

function completedRevisionMatch() {
  let battle = revisionMatch(0, { m: 0.1, b: 0 }, arc.BATTLE_LANE_META[0].solution);
  battle = fireAndBegin(battle, { a: -0.2, h: 5, k: 2 }, 1);
  battle = fireAndBegin(battle, arc.BATTLE_LANE_META[1].solution, 1);
  battle = fireAndBegin(battle, { a: 1, b: 1.5708, c: 0, k: 4 }, 2);
  battle = arc.battleFire(battle, arc.BATTLE_LANE_META[2].solution, 2).battle;
  battle.replayIndex = 2;
  return battle;
}

describe('Arc City replay revision comparison core', () => {
  it('finds the same player and circuit while ignoring an intervening opponent shot', () => {
    const battle = revisionMatch(0, { m: 0.1, b: 0 }, arc.BATTLE_LANE_META[0].solution);
    const comparison = arc.battleReplayComparison(battle, 2);

    expect(comparison.comparable).toBe(true);
    expect(comparison.previousIndex).toBe(0);
    expect(comparison.previousNumber).toBe(1);
    expect(comparison.improved).toBe(true);
    expect(comparison.changes).toEqual([
      expect.objectContaining({
        name: 'm',
        direction: 'increased',
        from: '0.10',
        to: '0.50'
      })
    ]);
    expect(comparison.outcomeText).toBe('The revision captured the relay.');
  });

  it('reports wave frequency changes as learner-facing period changes', () => {
    const battle = revisionMatch(
      2,
      { a: 1, b: 1.5708, c: 0, k: 4 },
      arc.BATTLE_LANE_META[2].solution
    );
    const periodChange = arc.battleReplayComparison(battle, 2).changes.find((change) => change.name === 'b');

    expect(periodChange.label).toBe('period');
    expect(periodChange.direction).toBe('increased');
    expect(periodChange.from).toBe('4 units per wave');
    expect(periodChange.to).toBe('6 units per wave');
  });

  it('labels a first circuit attempt without inventing a comparison', () => {
    const battle = revisionMatch(0, { m: 0.1, b: 0 }, arc.BATTLE_LANE_META[0].solution);
    const comparison = arc.battleReplayComparison(battle, 0);

    expect(comparison.comparable).toBe(false);
    expect(comparison.previousIndex).toBeNull();
    expect(comparison.changes).toEqual([]);
    expect(comparison.summary).toContain('First recorded attempt by Player 1');
  });
});

describe('Arc City replay revision comparison render flow', () => {
  it('pairs structured parameter text with the exact prior bounded trail', () => {
    const battle = completedRevisionMatch();
    expect(battle.status).toBe('won');

    const r = render(stateFor(battle, { battle3d: true }));
    expect(r.find('battle-replay-comparison').props.role).toBe('note');
    expect(r.text).toContain('Compared with shot 1');
    expect(r.text).toContain('m increased from 0.10 to 0.50');
    expect(r.text).toContain('The revision captured the relay.');
    expect(r.find('battle-replay-compare-trail').props.stroke).toBe('#94a3b8');
    expect(r.find('battle-replay-compare-trail').props.strokeDasharray).toBe('4 4');
    expect(r.find('battle-replay-trail').props.stroke).toBe('#ffffff');
    expect(r.find('battle-svg').props['aria-label']).toContain('Compared with shot 1');
    expect(r.find('battle3d-classic').props.battle.replayIndex).toBe(2);
  });

  it('removes the ghost comparison when navigation reaches a first attempt', () => {
    const battle = completedRevisionMatch();
    battle.replayIndex = 1;
    const state = stateFor(battle);
    const r = render(state);

    expect(r.text).toContain('First recorded attempt by Player 2');
    expect(r.find('battle-replay-compare-trail')).toBeNull();

    const next = click(state, 'battle-replay-next');
    expect(next.battle.replayIndex).toBe(2);
    expect(render(next).find('battle-replay-compare-trail')).not.toBeNull();
  });
});
