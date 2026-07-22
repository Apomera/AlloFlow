import { describe, it, expect } from 'vitest';
import * as ArcMod from '../stem_lab/stem_tool_arccity.js';
import { render, click } from './helpers/arc_harness.js';

const arc = ArcMod.default || ArcMod;

describe('Arc City render — optional Circuit Clash 3D projection', () => {
  it('mounts the 3D component only when explicitly enabled', () => {
    const state = { schemaVersion: 2, levelId: 'L1', byLevel: {}, tier: 'practice', badges: [], view: 'battle', battle: arc.createBattleState('cpu') };
    expect(render(state).find('battle3d')).toBeNull();

    const enabled = click(state, 'toggle-3d');
    expect(enabled.battle3d).toBe(true);
    const mounted = render(enabled).find('battle3d-classic');
    expect(mounted).not.toBeNull();
    expect(typeof mounted.type).toBe('function');
    expect(mounted.props.battle.shields).toEqual([[true, true, true], [true, true, true]]);

    const disabled = click(enabled, 'toggle-3d');
    expect(disabled.battle3d).toBe(false);
    expect(render(disabled).find('battle3d')).toBeNull();
  });
});
