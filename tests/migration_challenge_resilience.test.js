import { beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let tool;

function walk(node, predicate, matches = []) {
  if (!node || typeof node !== 'object') return matches;
  if (Array.isArray(node)) { node.forEach(child => walk(child, predicate, matches)); return matches; }
  if (predicate(node)) matches.push(node);
  if (node.props) walk(node.props.children, predicate, matches);
  return matches;
}

function challenge(seed, choice) {
  let state = {
    tab: 'navigate', challengeActive: true, challengeEnergy: 50,
    challengeDistRemaining: 1000, challengeFlockSize: 50,
    challengeChoices: { scenario: 'A migration decision.', choices: [choice] }, ...seed
  };
  let tree;
  const award = vi.fn();
  const ctx = makeCtx({
    awardXP: award, callGemini: null,
    update: (_, key, value) => { state = { ...state, [key]: value }; },
    updateMulti: (_, patch) => { state = { ...state, ...patch }; }
  });
  function draw() {
    ctx.toolData = { migration: state };
    function View() { tree = tool.render(ctx); return tree; }
    return ReactDOMServer.renderToStaticMarkup(React.createElement(View));
  }
  return {
    draw, award, get state() { return state; },
    choose() {
      draw();
      const button = walk(tree, node => node.type === 'button' && node.props['aria-label']?.startsWith('Choice 1:'))[0];
      expect(button).toBeTruthy();
      button.props.onClick();
    }
  };
}

beforeEach(() => {
  resetStemLab();
  tool = loadTool('stem_lab/stem_tool_migration.js', 'migration');
});

describe('Migration challenge modeled outcomes', () => {
  const choice = { label: 'Continue the flight', energy_cost: -20, distance_gain: 300, flock_change: -3, result: 'A difficult leg.' };

  it('ends the journey when the final birds are lost and preserves zero on redraw', () => {
    const ui = challenge({ challengeFlockSize: 2 }, choice);
    ui.choose();
    expect(ui.state.challengeFlockSize).toBe(0);
    expect(ui.state.challengeComplete).toBe(true);
    expect(ui.state.challengeLog[0].flock).toBe(0);
    expect(ui.draw()).toContain('Too many birds were lost.');
    expect(ui.award).not.toHaveBeenCalled();
  });

  it('does not award an arrival when all birds are lost on the destination leg', () => {
    const ui = challenge({ challengeFlockSize: 2, challengeDistRemaining: 300 }, choice);
    ui.choose();
    expect(ui.state.challengeDistRemaining).toBe(0);
    expect(ui.state.challengeFlockSize).toBe(0);
    expect(ui.draw()).toContain('Migration Failed');
    expect(ui.draw()).not.toContain('Migration Complete!');
    expect(ui.award).not.toHaveBeenCalled();
  });

  it('interprets numeric strings from a model response as numeric effects', () => {
    const ui = challenge({}, { ...choice, energy_cost: '-20', distance_gain: '300', flock_change: '-3' });
    ui.choose();
    expect(ui.state).toMatchObject({ challengeEnergy: 30, challengeDistRemaining: 700, challengeFlockSize: 47, challengeScore: 77 });
    expect(ui.state.challengeLog[0]).toMatchObject({ energy: 30, remaining: 700, flock: 47 });
  });

  it('keeps malformed non-finite effects from corrupting the run', () => {
    const ui = challenge({}, { ...choice, energy_cost: 'not a number', distance_gain: Infinity, flock_change: '-Infinity' });
    ui.choose();
    expect(ui.state).toMatchObject({ challengeEnergy: 50, challengeDistRemaining: 1000, challengeFlockSize: 50 });
    expect(ui.state.challengeLog[0]).toMatchObject({ energy: 50, remaining: 1000, flock: 50 });
    expect(Number.isFinite(ui.state.challengeScore)).toBe(true);
  });

  it('still allows a surviving flock to finish using its exact energy budget', () => {
    const ui = challenge({ challengeEnergy: 20, challengeDistRemaining: 300 }, choice);
    ui.choose();
    expect(ui.state).toMatchObject({ challengeEnergy: 0, challengeDistRemaining: 0, challengeFlockSize: 47, challengeComplete: true });
    expect(ui.draw()).toContain('Migration Complete!');
    expect(ui.award).toHaveBeenCalledWith('migration', 25, 'Migration complete');
  });
});
