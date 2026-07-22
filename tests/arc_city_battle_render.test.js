import { describe, it, expect } from 'vitest';
import * as ArcMod from '../stem_lab/stem_tool_arccity.js';
import { render, click } from './helpers/arc_harness.js';

const arc = ArcMod.default || ArcMod;

describe('Arc City render — Circuit Clash tactical mode', () => {
  it('opens from the main view selector with a versioned default match', () => {
    const next = click({ levelId: 'L1', byLevel: {}, tier: 'practice', badges: [] }, 'view-battle');
    expect(next.view).toBe('battle');
    expect(next.battle.mode).toBe('cpu');
    expect(next.battle.shields).toEqual([[true, true, true], [true, true, true]]);
  });

  it('renders a complete SVG tactical board and native parameter inputs', () => {
    const state = { schemaVersion: 2, levelId: 'L1', byLevel: {}, tier: 'practice', badges: [], view: 'battle', battle: arc.createBattleState('cpu') };
    const r = render(state);
    expect(r.find('battle-panel')).not.toBeNull();
    expect(r.find('battle-svg').props.role).toBe('img');
    expect(r.find('battle-preview')).not.toBeNull();
    expect(r.find('battle-fire')).not.toBeNull();
    expect(r.find('battle-log')).not.toBeNull();
    expect(r.findAll(n => n.type === 'input' && n.props.type === 'range').length).toBeGreaterThan(0);
    expect(r.findAll(n => n.type === 'input' && n.props.type === 'number').length).toBeGreaterThan(0);
  });

  it('player fire advances to an explicit CPU turn, then CPU captures a relay', () => {
    const state = { schemaVersion: 2, levelId: 'L1', byLevel: {}, tier: 'practice', badges: [], view: 'battle', battle: arc.createBattleState('cpu') };
    const afterPlayer = click(state, 'battle-fire');
    expect(afterPlayer.battle.turn).toBe(1);
    expect(afterPlayer.battle.trails).toHaveLength(1);

    const cpuRender = render(afterPlayer);
    expect(cpuRender.find('cpu-turn')).not.toBeNull();
    const afterCpu = click(afterPlayer, 'cpu-turn');
    expect(afterCpu.battle.turn).toBe(0);
    expect(afterCpu.battle.shields[0][0]).toBe(false);
    expect(afterCpu.battle.trails).toHaveLength(2);
  });

  it('switching battle modes starts a fresh hot-seat match', () => {
    const battle = arc.createBattleState('cpu');
    battle.shields[1][0] = false;
    const state = { schemaVersion: 2, levelId: 'L1', byLevel: {}, tier: 'practice', badges: [], view: 'battle', battle };
    const next = click(state, 'hotseat');
    expect(next.battle.mode).toBe('hotseat');
    expect(next.battle.shields[1]).toEqual([true, true, true]);
  });
});
