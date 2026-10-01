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

describe('Arc City responsive Circuit Clash HUD', () => {
  it('keeps quick play visible while moving advanced setup into native details', () => {
    const r = render(stateFor(arc.createBattleState('cpu')));
    const options = r.find('battle-options');
    const summary = r.find('battle-options-summary');

    expect(options).not.toBeNull();
    expect(options.type).toBe('details');
    expect(options.props.open).toBeUndefined();
    expect(summary.type).toBe('summary');
    expect(summary.props['aria-label']).toContain('Current setup: Solo vs CPU');
    expect(summary.props['aria-label']).toContain('Neon Basics');
    expect(r.find('score')).not.toBeNull();
    expect(r.find('battle-svg')).not.toBeNull();
    expect(r.find('battle-fire')).not.toBeNull();
  });

  it('updates the collapsed setup summary when match rules change', () => {
    const start = stateFor(arc.createBattleState('cpu'));
    const hotseat = click(start, 'hotseat');
    const walls = click(hotseat, 'battle-trails-walls');
    const challenge = click(walls, 'battle-assist-challenge');
    const label = render(challenge).find('battle-options-summary').props['aria-label'];

    expect(label).toContain('Two-player hot-seat');
    expect(label).toContain('Predict then fire');
    expect(label).toContain('Trail walls');
  });

  it('attaches responsive layout hooks to primary battle regions', () => {
    const r = render(stateFor(arc.createBattleState('cpu')));
    const root = r.findAll((node) => node.props && node.props.id === 'allo-arccity-root')[0];

    expect(root.props.className).toContain('arc-city-root');
    expect(r.find('battle-panel').props.className).toContain('arc-battle-panel');
    expect(r.find('battle-options').props.className).toContain('arc-battle-options');
    expect(r.find('score').props.className).toContain('arc-battle-score');
    expect(r.find('lane-group').props.className).toContain('arc-battle-lanes');
    expect(r.find('battle-actions').props.className).toContain('arc-battle-actions');
    expect(r.find('battle-svg').props.className).toContain('arc-battle-board');
  });

  it('uses shrink-safe parameter grids, including the sine period selector', () => {
    const line = render(stateFor(arc.createBattleState('cpu')));
    expect(line.find('bp-m').props.className).toContain('arc-battle-param');
    expect(line.find('inputs').props.style.gridTemplateColumns).toBe('minmax(0,1fr) 86px');

    const sineBattle = arc.createBattleState('cpu');
    sineBattle.selectedLane[0] = 2;
    const sine = render(stateFor(sineBattle));
    expect(sine.find('bp-b').props.className).toContain('arc-battle-param-snap');
    expect(sine.find('bp-b').props.style.gridTemplateColumns).toBe('minmax(0,1fr) minmax(110px,180px)');
  });

  it('injects 320px-equivalent reflow, touch-target, and sticky-action contracts', () => {
    render(stateFor(arc.createBattleState('cpu')));
    const css = document.getElementById('allo-arccity-css').textContent;

    expect(css).toContain('@media (max-width:520px)');
    expect(css).toContain('@media (max-width:360px)');
    expect(css).toContain('.arc-battle-param-snap{grid-template-columns:minmax(0,1fr)!important;}');
    expect(css).toContain('.arc-battle-actions{position:sticky;bottom:0;');
    expect(css).toContain('.arc-battle-actions button{min-height:44px;}');
    expect(css).toContain('.arc-battle-score>*{min-width:0!important;flex:1 1 100%!important;}');
    expect(css).toContain('overflow-x:hidden;');
  });
});
