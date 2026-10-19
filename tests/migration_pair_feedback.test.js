import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
let tool;
const mounts = [];
function walk(node, predicate, matches = []) {
  if (!node || typeof node !== 'object') return matches;
  if (Array.isArray(node)) { node.forEach(child => walk(child, predicate, matches)); return matches; }
  if (predicate(node)) matches.push(node);
  if (node.props) walk(node.props.children, predicate, matches);
  return matches;
}
function snapshot(patch = {}) {
  return { speciesId: 'canada_goose', season: 'fall', wind: 0, formationMode: 'natural', ...patch };
}
function trial(patch = {}) {
  return { variable: 'wind', prediction: 'A following wind raises modeled ground speed.', baseline: snapshot(), snapshot: snapshot({ wind: 10 }), ...patch };
}
function notebook(trials = [trial()], patch = {}) {
  return { variable: 'wind', prediction: 'Keep the current prediction.', baseline: snapshot({ speciesId: 'monarch', wind: -15, season: 'spring', formationMode: 'swarm' }),
    trials, evidence: 'Keep the existing evidence.', explanation: 'Keep this ungraded explanation.', ...patch };
}

// Real React state and actual recorded-flight handlers produce the tray. The
// pending jsdom 3D loader is irrelevant to this read-only feedback component.
function fixture(seed = {}, ctxOverrides = {}) {
  let state = { tab: 'flight3d', flightCamera: 'study', flightInvestigation: notebook(), ...seed }, tree, refresh;
  const writes = [], awardXP = vi.fn(), announce = vi.fn();
  const ctx = makeCtx({ ...ctxOverrides, awardXP, announceToSR: announce,
    update: (_, key, value) => { writes.push({ [key]: value }); state = { ...state, [key]: value }; refresh(value => value + 1); },
    updateMulti: (_, patch) => { writes.push(patch); state = { ...state, ...patch }; refresh(value => value + 1); }
  });
  const host = document.createElement('div'); document.body.append(host);
  const root = ReactDOMClient.createRoot(host); mounts.push(root);
  function Component() { refresh = React.useState(0)[1]; ctx.toolData = { migration: state }; tree = tool.render(ctx); return tree; }
  act(() => { root.render(React.createElement(Component)); });
  const ui = {
    host, writes, awardXP, announce, get state() { return state; },
    node: predicate => walk(tree, predicate)[0] || null,
    revisit(index = 1) { return ui.node(node => node.props?.['data-experiment-revisit'] === index); },
    pair(name) { return ui.node(node => node.props?.['data-pair-review'] === name); },
    click(node) { act(() => { node.props.onClick(); }); },
    set(patch) { act(() => { state = { ...state, ...patch }; refresh(value => value + 1); }); },
    feedback() { return host.querySelector('[data-pair-review-comparison]'); }
  };
  return ui;
}
function expectFeedback(ui, status, variable, changed, speedDelta, draftingDelta) {
  const feedback = ui.feedback(); expect(feedback).not.toBeNull();
  expect(feedback.getAttribute('data-pair-review-comparison')).toBe(status);
  expect(feedback.getAttribute('data-pair-review-variable')).toBe(variable);
  expect(feedback.querySelector('[data-pair-changed-conditions]').getAttribute('data-pair-changed-conditions')).toBe(changed);
  expect(feedback.querySelector('[data-pair-speed-delta]').getAttribute('data-pair-speed-delta')).toBe(String(speedDelta));
  expect(feedback.querySelector('[data-pair-drafting-delta]').getAttribute('data-pair-drafting-delta')).toBe(String(draftingDelta));
  return feedback;
}
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; resetStemLab();
  tool = loadTool(process.env.MIGRATION_PAIR_FEEDBACK_CANDIDATE || 'stem_lab/stem_tool_migration.js', 'migration');
});
afterEach(() => {
  act(() => { mounts.splice(0).forEach(root => root.unmount()); });
  window.dispatchEvent(new Event('blur')); document.body.innerHTML = '';
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Migration historical pair comparison feedback', () => {
  it('uses the selected historical baseline and variable independently of current baseline, variable and prediction', () => {
    const work = notebook([trial()], { variable: 'formation', prediction: 'Newer prediction after recording.' });
    const ui = fixture({ flightInvestigation: work }); expect(ui.feedback()).toBeNull(); ui.click(ui.revisit());
    const feedback = expectFeedback(ui, 'controlled', 'wind', 'wind', 22, 0);
    expect(feedback.textContent).toContain('Variable tested: Wind'); expect(feedback.textContent).toContain('Controlled comparison');
    expect(feedback.textContent).toContain('Changed conditions: Wind'); expect(feedback.textContent).toContain('Ground speed change: +22 mph');
    expect(feedback.textContent).toContain('Drafting credit change: 0 percentage points');
    expect(feedback.textContent).toContain('Only the tested condition changed in this saved model pair.');
    expect(feedback.textContent).not.toContain('Newer prediction'); expect(ui.state.flightInvestigation).toBe(work);
  });

  it('shows a formation-only credit change without inventing an airspeed or ground-speed benefit', () => {
    const ui = fixture({ flightInvestigation: notebook([trial({ variable: 'formation', baseline: snapshot({ formationMode: 'solo' }), snapshot: snapshot({ formationMode: 'v' }) })]) });
    ui.click(ui.revisit()); const feedback = expectFeedback(ui, 'controlled', 'formation', 'formation', 0, 22);
    expect(feedback.textContent).toContain('Variable tested: Formation'); expect(feedback.textContent).toContain('Changed conditions: Pattern');
    expect(feedback.textContent).toContain('Ground speed change: 0 mph'); expect(feedback.textContent).toContain('Drafting credit change: +22 percentage points');
  });

  it('identifies wind and formation confounding and reports signed deltas from that saved pair', () => {
    const ui = fixture({ flightInvestigation: notebook([trial({ variable: 'formation',
      baseline: snapshot({ speciesId: 'snow_goose', season: 'spring', wind: 5, formationMode: 'solo' }),
      snapshot: snapshot({ speciesId: 'snow_goose', season: 'spring', wind: -10, formationMode: 'v' }) })]) });
    ui.click(ui.revisit()); const feedback = expectFeedback(ui, 'confounded', 'formation', 'wind,formation', -33, 22);
    expect(feedback.textContent).toContain('Other conditions changed'); expect(feedback.textContent).toContain('Changed conditions: Wind, Pattern');
    expect(feedback.textContent).toContain('Ground speed change: -33 mph'); expect(feedback.textContent).toContain('Drafting credit change: +22 percentage points');
    expect(feedback.textContent).toContain('This pair cannot isolate the tested condition.');
    expect(feedback.textContent).not.toContain('Only the tested condition changed');
  });

  it('lists all effective changes and handles zero clamped progress without non-finite outcomes', () => {
    const ui = fixture({ flightInvestigation: notebook([trial({ baseline: snapshot(),
      snapshot: snapshot({ speciesId: 'monarch', season: 'spring', wind: -15, formationMode: 'swarm' }) })]) });
    ui.click(ui.revisit()); const feedback = expectFeedback(ui, 'confounded', 'wind', 'speciesId,season,wind,formation', -40, -22);
    expect(feedback.textContent).toContain('Changed conditions: Species, Season, Wind, Pattern');
    expect(feedback.textContent).not.toMatch(/NaN|Infinity|undefined|\[object Object\]/);
  });

  it.each(['natural', 'v'])('recognizes Natural and explicit V as the same effective pattern: baseline %s', mode => {
    const ui = fixture({ flightInvestigation: notebook([trial({ variable: 'formation', baseline: snapshot({ formationMode: mode }), snapshot: snapshot({ formationMode: mode === 'natural' ? 'v' : 'natural' }) })]) });
    ui.click(ui.revisit()); const feedback = expectFeedback(ui, 'unchanged', 'formation', '', 0, 0);
    expect(feedback.textContent).toContain('Unchanged conditions'); expect(feedback.textContent).toContain('No effective condition changed');
    expect(feedback.textContent).not.toContain('Changed conditions: Pattern'); expect(feedback.textContent).not.toContain('Only the tested condition changed');
  });

  it('distinguishes unchanged controls from a controlled test even when a variable was selected', () => {
    const ui = fixture({ flightInvestigation: notebook([trial({ snapshot: snapshot() })]) }); ui.click(ui.revisit());
    const feedback = expectFeedback(ui, 'unchanged', 'wind', '', 0, 0); expect(feedback.textContent).toContain('Unchanged conditions');
  });

  it('recomputes readable legacy snapshots and excludes malformed rows without rewriting imported outcomes', () => {
    const work = notebook([null, trial({ baseline: null }), trial({ baseline: snapshot({ groundSpeed: Infinity, benefit: 999 }), snapshot: snapshot({ wind: '10', groundSpeed: -999, benefit: 999 }) })]);
    const ui = fixture({ flightInvestigation: work }); ui.click(ui.revisit());
    const feedback = expectFeedback(ui, 'controlled', 'wind', 'wind', 22, 0);
    expect(feedback.textContent).not.toMatch(/Infinity|999|NaN/); expect(ui.state.flightInvestigation).toBe(work);
  });

  it('keeps historical feedback stable when live controls, camera and current baseline change', () => {
    const ui = fixture(); ui.click(ui.revisit()); const text = ui.feedback().textContent;
    ui.set({ flightSpecies: 'peregrine', flightWind: -15, flightSeason: 'spring', flightFormation: 'solo', flightCamera: 'side',
      flightInvestigation: { ...ui.state.flightInvestigation, baseline: snapshot({ speciesId: 'snow_goose', wind: 25 }), variable: 'formation' } });
    expectFeedback(ui, 'controlled', 'wind', 'wind', 22, 0); expect(ui.feedback().textContent).toBe(text);
    expect(ui.host.querySelector('[data-experiment-pair-review]').getAttribute('data-review-active')).toBe('');
  });

  it('adds readable evidence interpretation without controls, grades, stored schema or learner-data writes', () => {
    const work = notebook(), observations = { drafts: { 'canada_goose:head': 'Keep a draft.' } }, challenges = { notes: 'Keep challenge work.' }, inquiry = { hypothesis: 'Keep the inquiry.' };
    const ui = fixture({ flightInvestigation: work, flightStudyObservations: observations, flightChallenges: challenges, inquiry });
    ui.click(ui.revisit()); const feedback = ui.feedback();
    expect(ui.writes).toHaveLength(1); expect(feedback.getAttribute('role')).toBe('note'); expect(feedback.getAttribute('aria-label')).toBe('Saved pair model comparison');
    expect(feedback.querySelectorAll('button,input,select,textarea')).toHaveLength(0); expect(feedback.textContent).not.toMatch(/score|grade|correct|incorrect/i);
    expect(ui.state.flightInvestigation).toBe(work); expect(ui.state.flightStudyObservations).toBe(observations); expect(ui.state.flightChallenges).toBe(challenges); expect(ui.state.inquiry).toBe(inquiry);
    expect(ui.awardXP).not.toHaveBeenCalled(); ui.writes.length = 0; ui.click(ui.pair('evidence')); expect(ui.writes).toEqual([]);
  });

  it.each(['snapshot', 'prediction', 'remove', 'reindex'])('does not keep stale historical feedback after source %s', change => {
    const first = trial(), second = trial({ snapshot: snapshot({ wind: 20 }) });
    const ui = fixture({ flightInvestigation: notebook([first, second]) }); ui.click(ui.revisit(2)); expect(ui.feedback()).not.toBeNull();
    const rows = change === 'snapshot' ? [first, { ...second, snapshot: snapshot({ wind: 21 }) }]
      : change === 'prediction' ? [first, { ...second, prediction: 'A changed recorded prediction.' }]
        : change === 'reindex' ? [second] : [first];
    ui.set({ flightInvestigation: notebook(rows) }); expect(ui.feedback()).toBeNull();
  });

  it('routes comparison labels and interpretation through translation fallbacks', () => {
    const dictionary = { 'stem.migration.pair_review_comparison': 'Comparaison du modèle enregistré', 'stem.migration.variable_tested': 'Variable testée',
      'stem.migration.experiment_formation': 'Formation locale', 'stem.migration.experiment_confounded_badge': 'Conditions modifiées',
      'stem.migration.experiment_changed_conditions': 'Conditions changées', 'stem.migration.experiment_condition_wind': 'Vent',
      'stem.migration.mission_review_pattern': 'Configuration', 'stem.migration.pair_review_confounded_scope': 'Cette paire ne permet pas d’isoler la condition testée.' };
    const ui = fixture({ flightInvestigation: notebook([trial({ variable: 'formation', baseline: snapshot({ formationMode: 'solo' }), snapshot: snapshot({ wind: 10, formationMode: 'v' }) })]) },
      { t: (key, fallback) => dictionary[key] || fallback });
    ui.click(ui.revisit()); const feedback = ui.feedback();
    expect(feedback.getAttribute('aria-label')).toBe(dictionary['stem.migration.pair_review_comparison']);
    expect(feedback.textContent).toContain('Variable testée: Formation locale'); expect(feedback.textContent).toContain('Conditions modifiées');
    expect(feedback.textContent).toContain('Conditions changées: Vent, Configuration'); expect(feedback.textContent).toContain(dictionary['stem.migration.pair_review_confounded_scope']);
  });
});
