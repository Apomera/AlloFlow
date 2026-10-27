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

// Exercise the handlers supplied to the real React tree, with a persistent
// store between renders. No invented reducer mirrors the implementation.
function investigation(seed = {}, overrides = {}) {
  let state = { tab: 'flight3d', ...seed };
  let tree;
  const announce = vi.fn();
  const awardXP = vi.fn();
  const ctx = makeCtx({
    announceToSR: announce, awardXP,
    update: (toolId, key, value) => { expect(toolId).toBe('migration'); state = { ...state, [key]: value }; },
    updateMulti: (toolId, values) => { expect(toolId).toBe('migration'); state = { ...state, ...values }; },
    ...overrides
  });
  function draw() {
    ctx.toolData = { migration: state };
    function View() { tree = tool.render(ctx); return tree; }
    return ReactDOMServer.renderToStaticMarkup(React.createElement(View));
  }
  function find(predicate) { return walk(tree, predicate)[0]; }
  function action(name) { return find(node => node.props?.['data-experiment-action'] === name); }
  function edit(label, value) {
    find(node => node.type === 'textarea' && (node.props['data-migration-id'] === label || node.props['aria-label'] === label)).props.onChange({ target: { value } });
    draw();
  }
  function control(label, value) {
    find(node => (node.props?.['data-migration-id'] === label || node.props?.['aria-label'] === label)).props.onChange({ target: { value } });
    draw();
  }
  return {
    draw, find, action, edit, control, announce, awardXP,
    all: predicate => walk(tree, predicate),
    get state() { return state; },
    set: patch => { state = { ...state, ...patch }; },
    comparison: () => find(node => node.props?.['data-experiment-comparison']).props['data-comparison']
  };
}

function predictAndCapture(ui, text = 'A tailwind will increase ground speed because it carries the bird along.') {
  ui.edit('migration-experiment-prediction', text);
  ui.action('baseline').props.onClick();
  ui.draw();
}

beforeEach(() => {
  resetStemLab();
  // The optional path is only for isolated pre-integration development; the
  // default always verifies the canonical shipped tool.
  tool = loadTool(process.env.MIGRATION_LEARNING_CANDIDATE || 'stem_lab/stem_tool_migration.js', 'migration');
});

describe('Migration 3D flight investigation', () => {
  it('requires a prediction and choosing a variable leaves all flight settings and other work intact', () => {
    const seed = { flightSpecies: 'monarch', flightWind: -4, flightFormation: 'swarm', flightSeason: 'spring', inquiry: { hypothesis: 'Keep this' } };
    const ui = investigation(seed);
    ui.draw();
    expect(ui.action('baseline').props.disabled).toBe(true);
    expect(ui.action('record').props.disabled).toBe(true);
    ui.find(node => node.props?.['data-experiment-variable'] === 'formation').props.onClick();
    ui.draw();
    expect(ui.state).toMatchObject(seed);
    expect(ui.state.flightInvestigation.variable).toBe('formation');
    expect(ui.state.flightInvestigation.baseline).toBeNull();
    expect(ui.comparison()).toBe('pending');
    expect(ui.awardXP).not.toHaveBeenCalled();
  });

  it('captures exact wind conditions and records a controlled trial with actual ground-speed deltas', () => {
    const ui = investigation({ flightSpecies: 'canada_goose', flightWind: -4, flightFormation: 'natural', flightSeason: 'fall' });
    ui.draw();
    predictAndCapture(ui);
    expect(ui.state.flightInvestigation.baseline).toEqual({ speciesId: 'canada_goose', season: 'fall', wind: -4, formationMode: 'natural', formation: 'v', groundSpeed: 31, benefit: 22 });
    ui.control('Along-route wind in meters per second. Negative is headwind and positive is tailwind.', '8');
    expect(ui.comparison()).toBe('controlled');
    expect(ui.draw()).toContain('+27 mph');
    ui.action('record').props.onClick();
    ui.draw();
    expect(ui.state.flightInvestigation.trials).toHaveLength(1);
    expect(ui.state.flightInvestigation.trials[0]).toMatchObject({ variable: 'wind', baseline: { wind: -4, groundSpeed: 31 }, snapshot: { wind: 8, groundSpeed: 58, benefit: 22 } });
    expect(ui.draw()).toContain('data-learning-feedback="investigation"');
    expect(ui.announce).not.toHaveBeenCalled();
    expect(ui.awardXP).not.toHaveBeenCalled();
  });

  it('compares effective formation and keeps camera and motion changes outside the experiment', () => {
    const ui = investigation({ flightSpecies: 'canada_goose', flightWind: 0, flightFormation: 'natural' });
    ui.draw();
    ui.find(node => node.props?.['data-experiment-variable'] === 'formation').props.onClick();
    ui.draw();
    predictAndCapture(ui, 'Flying solo will remove modeled drafting credit.');
    ui.set({ flightCamera: 'aerial', flightPaused: true, flightFormation: 'v' });
    ui.draw();
    expect(ui.comparison()).toBe('unchanged');
    ui.control('3D migration flight pattern', 'solo');
    expect(ui.comparison()).toBe('controlled');
    const html = ui.draw();
    expect(html).toContain('-22 percentage points');
    expect(html).toContain('Ground speed change');
    ui.action('record').props.onClick();
    expect(ui.state.flightInvestigation.trials[0].snapshot).toMatchObject({ formation: 'solo', groundSpeed: 40, benefit: 0 });
  });

  it('detects species and season confounds and retains observations that do not support a controlled test', () => {
    const ui = investigation({ flightSpecies: 'canada_goose', flightWind: 0 });
    ui.draw();
    predictAndCapture(ui);
    ui.control('3D migration focus species', 'snow_goose');
    ui.control('Along-route wind in meters per second. Negative is headwind and positive is tailwind.', '10');
    ui.control('Migration season and direction', 'spring');
    expect(ui.comparison()).toBe('confounded');
    expect(ui.draw()).toContain('Changed conditions: species, season, wind');
    ui.action('record').props.onClick();
    expect(ui.state.flightInvestigation.trials[0].snapshot).toMatchObject({ speciesId: 'snow_goose', season: 'spring', groundSpeed: 72 });
    expect(ui.awardXP).not.toHaveBeenCalled();
  });

  it('uses no Monarch drafting credit and clamps wind-limited ground speed at zero', () => {
    const ui = investigation({ flightSpecies: 'monarch', flightWind: -15, flightFormation: 'v' });
    ui.draw();
    predictAndCapture(ui);
    expect(ui.state.flightInvestigation.baseline).toMatchObject({ formation: 'v', groundSpeed: 0, benefit: 0 });
    ui.control('Along-route wind in meters per second. Negative is headwind and positive is tailwind.', '0');
    ui.action('record').props.onClick();
    expect(ui.state.flightInvestigation.trials[0].snapshot).toMatchObject({ groundSpeed: 12, benefit: 0 });
  });

  it('restores only four flight conditions and preserves route AI facts, camera, notes, and prior trials', () => {
    const ui = investigation({ flightSpecies: 'canada_goose', selectedSpecies: 'monarch', flightWind: -4, flightFormation: 'solo', flightSeason: 'spring', flightCamera: 'side', aiExplorerText: 'Monarch route facts', aiExplorerReqId: 17, inquiry: { explanation: 'My energy notes' } });
    ui.draw();
    predictAndCapture(ui);
    ui.edit('migration-experiment-evidence', 'The land passed faster with a tailwind.');
    ui.edit('migration-experiment-explanation', 'The airspeed stayed fixed; the wind changed ground speed.');
    ui.set({ flightSpecies: 'peregrine', flightWind: 25, flightFormation: 'v', flightSeason: 'fall' });
    ui.draw();
    ui.action('record').props.onClick();
    ui.draw();
    const saved = ui.state.flightInvestigation;
    ui.action('restore').props.onClick();
    ui.draw();
    expect(ui.state).toMatchObject({ flightSpecies: 'canada_goose', flightWind: -4, flightFormation: 'solo', flightSeason: 'spring', selectedSpecies: 'monarch', flightCamera: 'side', aiExplorerText: 'Monarch route facts', aiExplorerReqId: 17, inquiry: { explanation: 'My energy notes' } });
    expect(ui.state.flightInvestigation).toEqual(saved);
    expect(ui.comparison()).toBe('unchanged');
  });

  it('freezes each trial baseline and prediction when a later baseline or prediction is replaced', () => {
    const ui = investigation({ flightWind: 0 });
    ui.draw();
    predictAndCapture(ui, 'My first prediction');
    ui.set({ flightWind: 5 });
    ui.draw();
    ui.action('record').props.onClick();
    ui.draw();
    ui.edit('migration-experiment-prediction', 'My second prediction');
    ui.action('baseline').props.onClick();
    ui.draw();
    expect(ui.state.flightInvestigation.baseline.wind).toBe(5);
    expect(ui.state.flightInvestigation.trials[0]).toMatchObject({ prediction: 'My first prediction', baseline: { wind: 0 }, snapshot: { wind: 5 } });
    expect(ui.draw()).toContain('Prediction when recorded: My first prediction');
    ui.set({ tab: 'routes' });
    ui.draw();
    ui.set({ tab: 'flight3d' });
    expect(ui.draw()).toContain('My second prediction');
    expect(ui.state.flightInvestigation.trials).toHaveLength(1);
  });

  it('caps the log without evicting evidence and only removes or resets work through explicit handlers', () => {
    const ui = investigation({ flightWind: 0, inquiry: { hypothesis: 'Stay saved' } });
    ui.draw();
    predictAndCapture(ui);
    for (let wind = 1; wind <= 6; wind++) {
      ui.set({ flightWind: wind }); ui.draw(); ui.action('record').props.onClick(); ui.draw();
    }
    const saved = ui.state.flightInvestigation.trials;
    expect(saved).toHaveLength(6);
    expect(ui.action('record').props.disabled).toBe(true);
    ui.action('record').props.onClick();
    expect(ui.state.flightInvestigation.trials).toBe(saved);
    ui.find(node => node.props?.['aria-label'] === 'Remove trial 2').props.onClick();
    ui.draw();
    expect(ui.state.flightInvestigation.trials.map(row => row.snapshot.wind)).toEqual([1, 3, 4, 5, 6]);
    expect(ui.action('record').props.disabled).toBe(false);
    ui.edit('migration-experiment-evidence', 'Keep this until I reset.');
    const beforeReset = JSON.parse(JSON.stringify(ui.state.flightInvestigation));
    // An uncommitted SSR handler cannot bypass the native confirmation flow.
    ui.action('reset').props.onClick();
    ui.draw();
    expect(ui.state.flightInvestigation).toEqual(beforeReset);
    expect(ui.state.inquiry).toEqual({ hypothesis: 'Stay saved' });
    expect(ui.state.flightWind).toBe(6);
    expect(ui.awardXP).not.toHaveBeenCalled();
  });

  it('recovers malformed saved state and recomputes derived values while preserving readable rows and notes', () => {
    const snapshot = { speciesId: 'canada_goose', season: 'fall', wind: '0', formationMode: 'natural', formation: {}, groundSpeed: Infinity, benefit: NaN };
    const ui = investigation({ flightInvestigation: { variable: {}, prediction: {}, baseline: { speciesId: 'obsolete' }, evidence: 'A readable evidence note', explanation: 'A readable explanation', trials: [null, {}, { variable: 'wind', prediction: 'A valid saved prediction', baseline: snapshot, snapshot: { ...snapshot, wind: 5 } }] } });
    const html = ui.draw();
    expect(html).toContain('Some saved observations could not be read');
    expect(html).not.toMatch(/NaN|Infinity|\[object Object\]/);
    expect(ui.all(node => node.props?.['data-experiment-trial'])).toHaveLength(1);
    expect(ui.action('record').props.disabled).toBe(true);
    ui.edit('migration-experiment-prediction', 'Recovered prediction');
    expect(ui.state.flightInvestigation).toMatchObject({ baseline: null, evidence: 'A readable evidence note', explanation: 'A readable explanation', trials: [{ baseline: { groundSpeed: 40, benefit: 22 }, snapshot: { groundSpeed: 51, benefit: 22 } }] });
  });

  it.each([null, 'obsolete schema', [], { trials: 'not a list', evidence: {}, explanation: [] }])('renders malformed investigation state safely: %j', flightInvestigation => {
    const ui = investigation({ flightInvestigation });
    expect(() => ui.draw()).not.toThrow();
    expect(ui.action('baseline').props.disabled).toBe(true);
    expect(ui.all(node => node.type === 'textarea' && ['migration-experiment-prediction', 'migration-experiment-evidence', 'migration-experiment-explanation'].includes(node.props['data-migration-id']))).toHaveLength(3);
  });

  it('resolves natural formation from canonical IDs even when all formation prose is translated', () => {
    const ui = investigation({ flightSpecies: 'canada_goose', flightFormation: 'natural' }, { t: (key, fallback) => /formation/i.test(key) ? 'Translated pattern prose' : fallback || key });
    ui.draw();
    predictAndCapture(ui);
    expect(ui.state.flightInvestigation.baseline).toMatchObject({ formation: 'v', benefit: 22 });
  });
});
