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

function completedMatch() {
  let battle = arc.createBattleState('hotseat');
  const fire = (params, lane) => {
    battle = arc.battleFire(battle, params, lane).battle;
    if (battle.status !== 'won') battle = arc.battleBeginTurn(battle).battle;
  };
  fire(arc.BATTLE_LANE_META[0].solution, 0);
  fire({ m: 0.1, b: 0 }, 0);
  fire(arc.BATTLE_LANE_META[1].solution, 1);
  fire({ m: 0.1, b: 0 }, 0);
  fire(arc.BATTLE_LANE_META[2].solution, 2);
  return battle;
}

describe('Arc City post-match replay core', () => {
  it('versions and clamps the persisted replay selection during migration', () => {
    const fresh = arc.createBattleState('cpu');
    expect(fresh.schemaVersion).toBe(arc.BATTLE_STATE_VERSION);
    expect(fresh.replayIndex).toBe(0);

    const won = completedMatch();
    const legacy = { ...won, schemaVersion: 6 };
    delete legacy.replayIndex;
    expect(arc.normalizeBattleState(legacy).replayIndex).toBe(won.trails.length - 1);
    expect(arc.normalizeBattleState({ ...legacy, replayIndex: -20 }).replayIndex).toBe(0);
    expect(arc.normalizeBattleState({ ...legacy, replayIndex: 200 }).replayIndex).toBe(won.trails.length - 1);
  });

  it('selects the winning shot by default and exposes a deterministic text frame', () => {
    const battle = completedMatch();
    expect(battle.status).toBe('won');
    expect(battle.replayIndex).toBe(battle.trails.length - 1);

    const frame = arc.battleReplayFrame(battle);
    expect(frame.number).toBe(frame.total);
    expect(frame.player).toBe('Player 1');
    expect(frame.laneTitle).toBe('Wave Circuit');
    expect(frame.equation).toContain('sin');
    expect(frame.outcome).toBe('captured the relay');
    expect(frame.announcement).toContain(`Replay shot ${frame.total} of ${frame.total}.`);
  });

  it('returns null for empty history and clamps direct frame requests', () => {
    const empty = arc.createBattleState('cpu');
    expect(arc.battleReplayFrame(empty)).toBeNull();

    const battle = completedMatch();
    expect(arc.battleReplayFrame(battle, -9).index).toBe(0);
    expect(arc.battleReplayFrame(battle, 999).index).toBe(battle.trails.length - 1);
  });
});

describe('Arc City post-match replay render flow', () => {
  it('appears only after victory with an accessible live frame and native boundaries', () => {
    expect(render(stateFor(arc.createBattleState('hotseat'))).find('battle-replay')).toBeNull();

    const battle = completedMatch();
    const r = render(stateFor(battle));
    expect(r.find('battle-replay')).not.toBeNull();
    expect(r.find('battle-replay-frame').props.role).toBe('status');
    expect(r.find('battle-replay-frame').props['aria-live']).toBe('polite');
    expect(r.text).toContain(`Shot ${battle.trails.length} of ${battle.trails.length}`);
    expect(r.find('battle-replay-prev').props.disabled).toBe(false);
    expect(r.find('battle-replay-next').props.disabled).toBe(true);
  });

  it('steps backward and forward while updating the selected stored shot', () => {
    const battle = completedMatch();
    const state = stateFor(battle);
    const previous = click(state, 'battle-replay-prev');
    expect(previous.battle.replayIndex).toBe(battle.trails.length - 2);

    const previousRender = render(previous);
    expect(previousRender.text).toContain(`Shot ${battle.trails.length - 1} of ${battle.trails.length}`);
    expect(previousRender.find('battle-replay-next').props.disabled).toBe(false);

    const restored = click(previous, 'battle-replay-next');
    expect(restored.battle.replayIndex).toBe(battle.trails.length - 1);
  });

  it('highlights the exact bounded replay trail and propagates selection to 3D', () => {
    const battle = completedMatch();
    battle.replayIndex = 1;
    const r = render(stateFor(battle, { battle3d: true }));
    const selected = r.find('battle-replay-trail');
    const endpoint = r.find('battle-replay-end');
    expect(selected).not.toBeNull();
    expect(endpoint).not.toBeNull();
    expect(selected.props.stroke).toBe('#ffffff');
    const lastPoint = selected.props.points.trim().split(/\s+/).at(-1).split(',').map(Number);
    expect(Math.abs(lastPoint[0] - Number(endpoint.props.cx))).toBeLessThan(1);
    expect(Math.abs(lastPoint[1] - Number(endpoint.props.cy))).toBeLessThan(1);
    expect(r.find('battle-svg').props['aria-label']).toContain('Replay shot 2 of 5.');
    expect(r.find('battle3d-classic').props.battle.replayIndex).toBe(1);
  });
});
