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
    const mounted = render(enabled).find('battle3d-classic-light');
    expect(mounted).not.toBeNull();
    expect(typeof mounted.type).toBe('function');
    expect(mounted.props.battle.shields).toEqual([[true, true, true], [true, true, true]]);

    const disabled = click(enabled, 'toggle-3d');
    expect(disabled.battle3d).toBe(false);
    expect(render(disabled).find('battle3d')).toBeNull();
  });

  // The arena was hard-wired to the dark palette, exactly as the city view was: the
  // contrast theme got fog, bloom, glow halos and neon lane colours. It is keyed by
  // theme because materials and the bloom decision are made once, at build time.
  it('is told the theme and keyed by it, so a theme switch rebuilds the arena', () => {
    const withTheme = (theme, fn) => {
      const el = document.createElement('div');
      if (theme !== 'light') el.className = 'theme-' + theme;
      document.body.appendChild(el);
      try { return fn(); } finally { el.remove(); }
    };
    const state = { schemaVersion: 2, levelId: 'L1', byLevel: {}, tier: 'practice', badges: [], view: 'battle', battle: arc.createBattleState('cpu'), battle3d: true };
    for (const theme of ['light', 'dark', 'contrast']) {
      withTheme(theme, () => {
        const el = render(state).find('battle3d-classic-' + theme);
        expect(el, theme + ' must mount the arena under its own key').not.toBeNull();
        expect(el.props.theme).toBe(theme);
      });
    }
    withTheme('contrast', () => {
      expect(render(state).find('battle3d-classic-dark'), 'the dark arena must not be reused on contrast').toBeNull();
    });
  });
});
