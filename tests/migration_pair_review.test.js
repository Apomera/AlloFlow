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
function snapshot(values = {}) {
  return { speciesId: 'canada_goose', season: 'fall', formationMode: 'natural', wind: -4, ...values };
}
function trial(values = {}) {
  return { variable: 'wind', prediction: 'The wind will change modeled ground speed.', baseline: snapshot(), snapshot: snapshot({ wind: 10 }), ...values };
}
function notebook(trials = [trial()], values = {}) {
  return { variable: 'wind', prediction: 'My current prediction.', baseline: snapshot({ wind: 0 }), trials, evidence: 'Recorded evidence.', explanation: 'My explanation.', ...values };
}

// Mount the real tool so local viewing status and refs persist across renders.
// The real 3D loader remains pending in this jsdom harness; browser tests cover
// rendering. Every action below is the actual handler supplied by the tool.
function fixture(seed = {}, options = {}) {
  let state = { tab: 'flight3d', flightCamera: 'study', flightInvestigation: notebook(), ...seed }, tree, refresh;
  const writes = [], announce = vi.fn(), awardXP = vi.fn(), refs = [];
  // Delegate every hook to React and observe the real RAF values ref. This
  // measures handler behavior before the asynchronous host store can commit.
  const tracedReact = { ...React, useRef(value) {
    const ref = React.useRef(value); if (!refs.includes(ref)) refs.push(ref); return ref;
  } };
  const ctx = makeCtx({ React: tracedReact, announceToSR: announce, awardXP,
    update: (_, key, value) => { writes.push({ [key]: value }); state = { ...state, [key]: value }; refresh(value => value + 1); },
    updateMulti: (_, patch) => {
      writes.push(patch);
      if (options.inspectMulti) options.inspectMulti(patch);
      if (options.delayMulti) return;
      state = { ...state, ...patch }; refresh(value => value + 1);
    }
  });
  const host = document.createElement('div'); document.body.append(host);
  const root = ReactDOMClient.createRoot(host); mounts.push(root);
  function Component() {
    refresh = React.useState(0)[1];
    ctx.toolData = { migration: state };
    tree = tool.render(ctx); return tree;
  }
  act(() => { root.render(React.createElement(Component)); });
  const ui = {
    get state() { return state; }, writes, announce, awardXP, host,
    liveValues() { return refs.find(ref => ref.current && typeof ref.current === 'object' && 'flightSpecies' in ref.current && 'flightSpeedValues' in ref.current)?.current; },
    node: predicate => walk(tree, predicate)[0] || null,
    all: predicate => walk(tree, predicate),
    revisit(index = 1, baseline = false) { return ui.node(node => node.props?.[baseline ? 'data-experiment-revisit-baseline' : 'data-experiment-revisit'] === index); },
    action(name) { return ui.node(node => node.props?.['data-experiment-action'] === name); },
    pair(name) { return ui.node(node => node.props?.['data-pair-review'] === name); },
    review() { return ui.node(node => node.props?.['data-experiment-pair-review'] != null); },
    click(node) { act(() => { node.props.onClick(); }); },
    status() { return ui.node(node => node.props?.['data-experiment-revisit-status'] != null)?.props.children || ''; },
    set(patch) { act(() => { state = { ...state, ...patch }; refresh(value => value + 1); }); }
  };
  return ui;
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab();
  tool = loadTool(process.env.MIGRATION_PAIR_REVIEW_CANDIDATE || 'stem_lab/stem_tool_migration.js', 'migration');
});
afterEach(() => {
  act(() => { mounts.splice(0).forEach(root => root.unmount()); });
  window.dispatchEvent(new Event('blur')); document.body.innerHTML = '';
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
  delete document.fullscreenElement; delete document.exitFullscreen;
});


describe('Migration scene-adjacent saved flight pair review', () => {
  it('opens only through an explicit recorded-flight action and places native review controls below the scene', () => {
    const ui = fixture(); expect(ui.review()).toBeNull();
    expect(ui.node(node => node.props?.id === 'migration-flight-deck').props['data-pair-review-open']).toBe('false');
    ui.click(ui.revisit());
    expect(ui.review().props['aria-label']).toBe('Saved trial review');
    expect(ui.review().props['data-review-trial']).toBe(1);
    expect(ui.review().props['data-review-active']).toBe('trial');
    expect(ui.node(node => node.props?.id === 'migration-flight-deck').props['data-pair-review-open']).toBe('true');
    const stage = ui.host.querySelector('#migration-flight-stage'), panel = ui.host.querySelector('[data-experiment-pair-review]');
    expect(stage.parentElement).toBe(panel.parentElement);
    expect(stage.contains(panel)).toBe(false); expect(stage.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    for (const name of ['baseline', 'trial', 'evidence']) { expect(ui.pair(name).type).toBe('button'); expect(ui.pair(name).props.type).toBe('button'); }
    expect(ui.pair('baseline').props.children).toBe('Saved baseline'); expect(ui.pair('trial').props.children).toBe('Saved trial');
    expect(ui.pair('trial').props['aria-pressed']).toBe('true'); expect(ui.pair('baseline').props['aria-pressed']).toBe('false');
  });

  it('closes only the transient review and returns scene focus while retaining controls and saved work', () => {
    const work = notebook(); const ui = fixture({ flightInvestigation: work }); ui.click(ui.revisit()); ui.writes.length = 0;
    const state = ui.state;
    expect(ui.pair('close').props.children).toBe('Close saved trial review');
    expect(ui.pair('close').props.type).toBe('button');
    ui.click(ui.pair('close'));
    expect(ui.review()).toBeNull(); expect(ui.writes).toEqual([]); expect(ui.state).toBe(state);
    expect(ui.state.flightInvestigation).toBe(work); expect(document.activeElement?.id).toBe('migration-flight-stage');
    expect(ui.node(node => node.props?.id === 'migration-flight-deck').props['data-pair-review-open']).toBe('false');
  });

  it('shows the selected historical pair and original prediction even after the current baseline and prediction change', () => {
    const work = notebook([trial({ prediction: 'My original recorded prediction.', baseline: snapshot({ wind: -4 }), snapshot: snapshot({ wind: 10 }) })], { prediction: 'My newer current prediction.', baseline: snapshot({ speciesId: 'peregrine', wind: 25 }) });
    const ui = fixture({ flightInvestigation: work }); ui.click(ui.revisit());
    const panel = ui.host.querySelector('[data-experiment-pair-review]');
    expect(panel.textContent).toContain('My original recorded prediction.'); expect(panel.textContent).not.toContain('My newer current prediction.');
    expect(panel.querySelector('details > summary').textContent).toBe('Prediction when recorded');
    expect(panel.textContent).toContain('-4 m/s wind'); expect(panel.textContent).toContain('+10 m/s wind');
    expect(panel.textContent).toContain('31 mph'); expect(panel.textContent).toContain('62 mph');
    expect(panel.textContent).toContain('Natural'); expect(panel.textContent).toContain('22%');
    expect(ui.state.flightInvestigation).toBe(work); expect(work.baseline.speciesId).toBe('peregrine');
  });

  it('switches both saved flights through the existing restore boundary while preserving all learning work by reference', () => {
    const work = notebook([trial({ baseline: snapshot({ speciesId: 'monarch', wind: -15, formationMode: 'solo', season: 'spring' }), snapshot: snapshot({ speciesId: 'monarch', wind: 8, formationMode: 'solo', season: 'spring' }) })]);
    const observations = { drafts: { 'canada_goose:head': 'Unfinished note.' }, records: {}, comparison: { draft: 'Unfinished claim.' } }, challenges = { work: { wind: { notes: 'Keep explanation.' } } };
    const ui = fixture({ flightInvestigation: work, flightStudyObservations: observations, flightChallenges: challenges, selectedSpecies: 'snow_goose', aiExplorerText: 'Keep these route facts.' });
    ui.click(ui.revisit()); ui.writes.length = 0;
    ui.click(ui.pair('baseline'));
    expect(ui.writes).toEqual([{ flightSpecies: 'monarch', flightSeason: 'spring', flightFormation: 'solo', flightWind: -15, flightCamera: 'chase', flightPaused: true, flightShowSpeedVectors: true }]);
    expect(ui.review().props['data-review-active']).toBe('baseline'); expect(ui.pair('baseline').props['aria-pressed']).toBe('true');
    ui.click(ui.pair('trial'));
    expect(ui.writes).toHaveLength(2); expect(ui.state.flightWind).toBe(8); expect(ui.review().props['data-review-active']).toBe('trial');
    expect(document.activeElement?.id).toBe('migration-flight-stage');
    expect(ui.state.flightInvestigation).toBe(work); expect(ui.state.flightStudyObservations).toBe(observations); expect(ui.state.flightChallenges).toBe(challenges);
    expect(ui.state.selectedSpecies).toBe('snow_goose'); expect(ui.state.aiExplorerText).toBe('Keep these route facts.'); expect(ui.awardXP).not.toHaveBeenCalled();
  });

  it('focuses existing evidence without inserting prose or writing any stored work', () => {
    const work = notebook(); const ui = fixture({ flightInvestigation: work }); ui.click(ui.revisit()); ui.writes.length = 0;
    ui.click(ui.pair('evidence'));
    expect(document.activeElement?.id).toBe('migration-experiment-evidence'); expect(ui.writes).toEqual([]);
    expect(ui.state.flightInvestigation).toBe(work); expect(work.evidence).toBe('Recorded evidence.'); expect(work.explanation).toBe('My explanation.');
  });

  it('clears both active choices and identifies manually changed conditions while leaving paired controls usable', () => {
    const ui = fixture(); ui.click(ui.revisit()); ui.set({ flightWind: 25 });
    expect(ui.review().props['data-review-active']).toBe('');
    expect(ui.pair('baseline').props['aria-pressed']).toBe('false'); expect(ui.pair('trial').props['aria-pressed']).toBe('false');
    expect(ui.host.querySelector('[data-pair-review-state]').textContent).toBe('Current conditions differ from this saved pair.');
    ui.click(ui.pair('baseline')); expect(ui.state.flightWind).toBe(-4); expect(ui.review().props['data-review-active']).toBe('baseline');
  });

  it('identifies conditions matching the other saved flight and allows inspecting them with another camera', () => {
    const ui = fixture(); ui.click(ui.revisit()); ui.set({ flightWind: -4, flightCamera: 'side', flightPaused: false });
    expect(ui.review().props['data-review-active']).toBe('baseline');
    expect(ui.pair('baseline').props['aria-pressed']).toBe('true');
    expect(ui.host.querySelector('[data-pair-review-state]').textContent).toBe('Showing saved baseline conditions.');
    expect(ui.state.flightCamera).toBe('side'); expect(ui.state.flightPaused).toBe(false);
  });

  it('compares full saved formation controls even if Natural and V resolve to the same modeled pattern', () => {
    const ui = fixture(); ui.click(ui.revisit()); ui.set({ flightFormation: 'v' });
    expect(ui.review().props['data-review-active']).toBe('');
    expect(ui.pair('trial').props['aria-pressed']).toBe('false');
    ui.click(ui.pair('trial')); expect(ui.state.flightFormation).toBe('natural'); expect(ui.review().props['data-review-active']).toBe('trial');
  });

  it('uses the most recent explicit choice when a saved pair has identical conditions', () => {
    const ui = fixture({ flightInvestigation: notebook([trial({ baseline: snapshot({ wind: 10 }) })]) });
    ui.click(ui.revisit()); expect(ui.review().props['data-review-active']).toBe('trial');
    ui.click(ui.pair('baseline')); expect(ui.review().props['data-review-active']).toBe('baseline');
    expect(ui.pair('trial').props['aria-pressed']).toBe('false');
  });

  it('retains its source while current notes and prediction are revised without rewriting the captured prediction', () => {
    const ui = fixture(); ui.click(ui.revisit());
    act(() => { ui.node(node => node.props?.['aria-label'] === 'Flight investigation evidence notes').props.onChange({ target: { value: 'My new evidence.' } }); });
    act(() => { ui.node(node => node.props?.['aria-label'] === 'Flight investigation prediction').props.onChange({ target: { value: 'My revised current prediction.' } }); });
    expect(ui.review()).not.toBeNull(); expect(ui.state.flightInvestigation.evidence).toBe('My new evidence.');
    expect(ui.host.querySelector('[data-experiment-pair-review]').textContent).toContain('The wind will change modeled ground speed.');
    expect(ui.host.querySelector('[data-experiment-pair-review]').textContent).not.toContain('My revised current prediction.');
  });

  it.each(['prediction', 'snapshot', 'remove', 'reindex'])('hides stale review when its saved source changes: %s', change => {
    const rows = [trial(), trial({ snapshot: snapshot({ wind: 20 }) })];
    const ui = fixture({ flightInvestigation: notebook(rows) }); ui.click(ui.revisit(2));
    let nextRows = rows;
    if (change === 'prediction') nextRows = [rows[0], { ...rows[1], prediction: 'A changed source prediction.' }];
    if (change === 'snapshot') nextRows = [rows[0], { ...rows[1], snapshot: snapshot({ wind: 21 }) }];
    if (change === 'remove') nextRows = [rows[0]];
    if (change === 'reindex') nextRows = [rows[1]];
    ui.set({ flightInvestigation: notebook(nextRows) });
    expect(ui.review()).toBeNull(); expect(ui.node(node => node.props?.id === 'migration-flight-deck').props['data-pair-review-open']).toBe('false');
  });

  it('normalizes readable imported snapshots, rejects malformed sources and never substitutes the current prediction', () => {
    const work = notebook([null, trial({ snapshot: snapshot({ speciesId: 'constructor' }) }), trial({ prediction: '', snapshot: snapshot({ wind: '8', groundSpeed: Infinity, benefit: 900 }) })]);
    const ui = fixture({ flightInvestigation: work }); ui.click(ui.revisit());
    const panel = ui.host.querySelector('[data-experiment-pair-review]');
    expect(panel.textContent).toContain('58 mph'); expect(panel.textContent).not.toMatch(/Infinity|900|\[object Object\]/);
    expect(panel.textContent).toContain('No prediction was recorded with this trial.'); expect(panel.textContent).not.toContain('My current prediction.');
    expect(ui.state.flightInvestigation).toBe(work);
    const invalid = fixture({ flightInvestigation: notebook([trial({ baseline: null })]) }); expect(invalid.revisit()).toBeNull(); expect(invalid.review()).toBeNull();
  });

  it('moves focus to the enabled prediction after removing the last imported trial without a current baseline', () => {
    vi.useFakeTimers();
    const ui = fixture({ flightInvestigation: notebook([trial()], { baseline: null, prediction: '' }) });
    const remove = ui.host.querySelector('[aria-label="Remove trial 1"]'); remove.focus();
    ui.click(ui.node(node => node.props?.['aria-label'] === 'Remove trial 1'));
    act(() => { vi.runOnlyPendingTimers(); });
    expect(ui.action('record').props.disabled).toBe(true);
    expect(document.activeElement?.id).toBe('migration-experiment-prediction');
    expect(document.activeElement.disabled).toBe(false); expect(ui.state.flightInvestigation.trials).toHaveLength(0);
  });

  it('keeps removal focus on the remaining Remove action rather than a new pair-review switch', () => {
    vi.useFakeTimers(); const ui = fixture({ flightInvestigation: notebook([trial(), trial({ snapshot: snapshot({ wind: 20 }) })]) });
    ui.click(ui.revisit(2)); ui.click(ui.node(node => node.props?.['aria-label'] === 'Remove trial 1'));
    act(() => { vi.runOnlyPendingTimers(); });
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Remove trial 1'); expect(ui.review()).toBeNull();
  });

  it('exits native fullscreen before focusing evidence outside the deck', async () => {
    const ui = fixture(); ui.click(ui.revisit()); ui.writes.length = 0;
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: ui.host.querySelector('#migration-flight-deck') });
    document.exitFullscreen = vi.fn(() => { delete document.fullscreenElement; return Promise.resolve(); });
    await act(async () => { ui.pair('evidence').props.onClick(); await Promise.resolve(); });
    expect(document.exitFullscreen).toHaveBeenCalledOnce(); expect(document.activeElement?.id).toBe('migration-experiment-evidence'); expect(ui.writes).toEqual([]);
  });

  it('leaves custom deck fullscreen before focusing evidence and keeps device Reduce motion enabled', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    const ui = fixture({ deviceReduceMotion: true }); ui.click(ui.revisit()); ui.writes.length = 0;
    const deck = ui.host.querySelector('#migration-flight-deck'); deck.setAttribute('data-allo-fullscreen-active', 'true');
    vi.stubGlobal('__alloStemFS', vi.fn(node => node.removeAttribute('data-allo-fullscreen-active')));
    ui.click(ui.pair('evidence'));
    expect(window.__alloStemFS).toHaveBeenCalledWith(deck); expect(document.activeElement?.id).toBe('migration-experiment-evidence');
    expect(ui.writes).toEqual([]); expect(ui.state.deviceReduceMotion).toBe(true); expect(ui.state.flightPaused).toBe(true);
  });
});
