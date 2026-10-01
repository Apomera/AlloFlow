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

describe('Arc City — protected hot-seat turn transitions', () => {
  it('starts unlocked and creates a handoff after every non-winning hot-seat shot', () => {
    const start = arc.createBattleState('hotseat');
    expect(start.schemaVersion).toBe(arc.BATTLE_STATE_VERSION);
    expect(start.handoff).toBe(false);

    const fired = arc.battleFire(start, arc.BATTLE_LANE_META[0].solution, 0);
    expect(fired.battle.turn).toBe(1);
    expect(fired.battle.handoff).toBe(true);
    expect(fired.battle.shots).toBe(1);
  });

  it('blocks a second shot until the next player confirms', () => {
    const first = arc.battleFire(arc.createBattleState('hotseat'), arc.BATTLE_LANE_META[0].solution, 0).battle;
    const blocked = arc.battleFire(first, arc.BATTLE_LANE_META[1].solution, 1);
    expect(blocked.result).toBeNull();
    expect(blocked.message).toMatch(/handoff pending/i);
    expect(blocked.battle.shots).toBe(1);

    const confirmed = arc.battleBeginTurn(first);
    expect(confirmed.battle.handoff).toBe(false);
    expect(confirmed.message).toMatch(/Player 2 turn confirmed/);
    const second = arc.battleFire(confirmed.battle, arc.BATTLE_LANE_META[1].solution, 1);
    expect(second.result).not.toBeNull();
    expect(second.battle.shots).toBe(2);
    expect(second.battle.handoff).toBe(true);
  });

  it('never creates handoff state for CPU matches or completed matches', () => {
    const cpuShot = arc.battleFire(arc.createBattleState('cpu'), arc.BATTLE_LANE_META[0].solution, 0).battle;
    expect(cpuShot.handoff).toBe(false);

    const won = arc.createBattleState('hotseat');
    won.status = 'won';
    won.winner = 0;
    won.handoff = true;
    expect(arc.normalizeBattleState(won).handoff).toBe(false);
  });

  it('migrates handoff only for an active hot-seat match', () => {
    const legacy = arc.createBattleState('hotseat');
    legacy.schemaVersion = 3;
    legacy.handoff = true;
    expect(arc.normalizeBattleState(legacy).handoff).toBe(true);

    legacy.mode = 'cpu';
    expect(arc.normalizeBattleState(legacy).handoff).toBe(false);
  });
});

describe('Arc City render — protected handoff and onboarding', () => {
  it('hides equation controls and trajectory until the next player confirms', () => {
    const start = stateFor(arc.createBattleState('hotseat'));
    const waiting = click(start, 'battle-fire');
    expect(waiting.battle.handoff).toBe(true);
    expect(waiting.battle.turn).toBe(1);

    const waitingRender = render(waiting);
    expect(waitingRender.find('battle-handoff-card')).not.toBeNull();
    expect(waitingRender.find('battle-begin-turn').props.autoFocus).toBe(true);
    expect(waitingRender.find('battle-equation')).toBeNull();
    expect(waitingRender.find('battle-params')).toBeNull();
    expect(waitingRender.find('battle-fire')).toBeNull();
    expect(waitingRender.find('battle-preview')).toBeNull();
    expect(waitingRender.text).toContain('Pass the device to Player 2.');

    const confirmed = click(waiting, 'battle-begin-turn');
    expect(confirmed.battle.handoff).toBe(false);
    expect(confirmed.battle.log[0]).toMatch(/Player 2 turn confirmed/);
    const activeRender = render(confirmed);
    expect(activeRender.find('battle-handoff-card')).toBeNull();
    expect(activeRender.find('battle-equation')).not.toBeNull();
    expect(activeRender.find('battle-params')).not.toBeNull();
    expect(activeRender.find('battle-fire')).not.toBeNull();
  });

  it('provides native, keyboard-operable How to Play guidance', () => {
    const r = render(stateFor(arc.createBattleState('cpu')));
    const help = r.find('battle-help');
    expect(help).not.toBeNull();
    expect(help.type).toBe('details');
    expect(r.text).toContain('How to play Circuit Clash');
    expect(r.text).toContain('Every valid shot ends the turn.');
    expect(r.text).toContain('The next player confirms before controls reappear.');
  });
});
