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
    click(node) { act(() => { node.props.onClick(); }); },
    status() { return ui.node(node => node.props?.['data-experiment-revisit-status'] != null)?.props.children || ''; },
    set(patch) { act(() => { state = { ...state, ...patch }; refresh(value => value + 1); }); }
  };
  return ui;
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab();
  tool = loadTool(process.env.MIGRATION_TRIAL_REVISIT_CANDIDATE || 'stem_lab/stem_tool_migration.js', 'migration');
});
afterEach(() => {
  act(() => { mounts.splice(0).forEach(root => root.unmount()); });
  window.dispatchEvent(new Event('blur')); document.body.innerHTML = '';
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Migration recorded trial and paired baseline revisits', () => {
  it('provides labeled native actions only for readable recorded pairs and describes the illustrative view', () => {
    const empty = fixture({ flightInvestigation: notebook([]) });
    expect(empty.revisit()).toBeNull(); expect(empty.revisit(1, true)).toBeNull();
    const ui = fixture();
    for (const baseline of [false, true]) {
      const action = ui.revisit(1, baseline);
      expect(action.type).toBe('button'); expect(action.props.type).toBe('button');
      expect(action.props['aria-label']).toBe(baseline ? 'Revisit baseline for trial 1' : 'Revisit trial 1');
      expect(action.props['aria-describedby']).toBe('migration-experiment-revisit-help');
    }
    expect(ui.host.textContent).toContain('Revisit a trial and its paired baseline');
    expect(ui.host.textContent).toContain('does not replay the original animation frame');
    expect(ui.node(node => node.props?.['data-experiment-revisit-status'] != null).props.role).toBe('status');
    expect(ui.status()).toBe('');
  });

  it('restores one validated snapshot, pauses Chase with speed vectors, and preserves all learner work by reference', () => {
    const work = notebook([trial({ snapshot: snapshot({ speciesId: 'sandhill_crane', season: 'spring', formationMode: 'loose', wind: 25 }) })]);
    const observations = { drafts: { 'canada_goose:head': 'Unfinished shape note.' }, records: {}, comparison: { draft: 'Unfinished comparison.' } };
    const challenges = { attempts: [{ notes: 'Existing challenge explanation.' }] }, inquiry = { explanation: 'Existing inquiry.' };
    const ui = fixture({ flightInvestigation: work, flightStudyObservations: observations, flightChallenges: challenges, inquiry,
      selectedSpecies: 'monarch', aiExplorerText: 'Keep route facts', aiExplorerReqId: 19,
      flightWind: -15, flightSeason: 'fall', flightFormation: 'solo', flightWingStep: 13, flightStudyYaw: -80, flightStudyPitch: 50 });
    ui.click(ui.revisit());
    expect(ui.writes).toEqual([{ flightSpecies: 'sandhill_crane', flightSeason: 'spring', flightFormation: 'loose', flightWind: 25, flightCamera: 'chase', flightPaused: true, flightShowSpeedVectors: true }]);
    expect(ui.state.flightInvestigation).toBe(work); expect(ui.state.flightStudyObservations).toBe(observations);
    expect(ui.state.flightChallenges).toBe(challenges); expect(ui.state.inquiry).toBe(inquiry);
    expect(ui.state).toMatchObject({ selectedSpecies: 'monarch', aiExplorerText: 'Keep route facts', aiExplorerReqId: 19, flightWingStep: 13, flightStudyYaw: -80, flightStudyPitch: 50 });
    expect(document.activeElement?.id).toBe('migration-flight-stage');
    expect(ui.status()).toContain('Revisited trial 1. Paused flight view with speed vectors.');
    expect(ui.announce).toHaveBeenLastCalledWith(ui.status());
    expect(ui.awardXP).not.toHaveBeenCalled();
  });

  it.each([
    { baseline: false, speciesId: 'monarch', wind: -15, speeds: { airSpeed: 12, windMph: -33.555, groundSpeed: 0, rawGroundSpeed: 0, headwindStops: true } },
    { baseline: true, speciesId: 'canada_goose', wind: 0, speeds: { airSpeed: 40, windMph: 0, groundSpeed: 40, rawGroundSpeed: 40, headwindStops: false } }
  ])('refreshes rendered speed-vector values synchronously before a delayed host commit: baseline=$baseline', ({ baseline, speciesId, wind, speeds }) => {
    const work = notebook([trial({ baseline: snapshot({ wind: 0 }), snapshot: snapshot({ speciesId: 'monarch', wind: -15, formationMode: 'solo' }) })]);
    let atHostWrite;
    const ui = fixture({ flightSpecies: 'canada_goose', flightWind: 25, flightInvestigation: work }, {
      delayMulti: true,
      inspectMulti() {
        const live = ui.liveValues();
        atHostWrite = { speciesId: live.flightSpecies, wind: live.flightWind, speeds: { ...live.flightSpeedValues } };
      }
    });
    expect(ui.liveValues().flightSpeedValues.groundSpeed).toBe(96);
    ui.click(ui.revisit(1, baseline));
    // The host store deliberately still contains the previous conditions.
    expect(ui.state.flightWind).toBe(25); expect(ui.state.flightInvestigation).toBe(work);
    // These are the actual values the existing RAF reads before that commit.
    expect(atHostWrite).toMatchObject({ speciesId, wind });
    expect(atHostWrite.speeds).toMatchObject({ airSpeed: speeds.airSpeed, groundSpeed: speeds.groundSpeed, rawGroundSpeed: speeds.rawGroundSpeed, headwindStops: speeds.headwindStops });
    expect(atHostWrite.speeds.windMph).toBeCloseTo(speeds.windMph, 8);
    expect(ui.writes).toHaveLength(1);
  });

  it('uses each historical row’s own baseline after the current baseline and prediction were replaced', () => {
    const recorded = trial({ baseline: snapshot({ speciesId: 'monarch', wind: -15, formationMode: 'solo', season: 'spring' }), snapshot: snapshot({ speciesId: 'monarch', wind: 10, formationMode: 'solo', season: 'spring' }) });
    const work = notebook([recorded], { baseline: snapshot({ speciesId: 'peregrine', wind: 25, formationMode: 'swarm' }), prediction: 'A newer prediction.' });
    const ui = fixture({ flightInvestigation: work });
    ui.click(ui.revisit(1, true));
    expect(ui.state).toMatchObject({ flightSpecies: 'monarch', flightWind: -15, flightSeason: 'spring', flightFormation: 'solo', flightCamera: 'chase', flightPaused: true, flightShowSpeedVectors: true });
    expect(ui.status()).toContain('Revisited baseline for trial 1.');
    ui.click(ui.revisit());
    expect(ui.state.flightWind).toBe(10); expect(ui.status()).toContain('Revisited trial 1.');
    expect(ui.state.flightInvestigation).toBe(work); expect(work.baseline.speciesId).toBe('peregrine');
    expect(work.trials[0].prediction).toBe('The wind will change modeled ground speed.');
  });

  it('retains the existing current-baseline four-control restore behavior', () => {
    const work = notebook(); const ui = fixture({ flightInvestigation: work });
    ui.click(ui.revisit()); ui.writes.length = 0;
    ui.click(ui.action('restore'));
    expect(ui.writes).toEqual([{ flightSpecies: 'canada_goose', flightFormation: 'natural', flightWind: 0, flightSeason: 'fall' }]);
    expect(ui.state.flightInvestigation).toBe(work); expect(ui.state.flightPaused).toBe(true);
    expect(ui.state.flightCamera).toBe('chase'); expect(ui.state.flightShowSpeedVectors).toBe(true); expect(ui.status()).toBe('');
  });

  it('normalizes readable legacy numbers and ignores untrusted derived outcomes without rewriting imported work', () => {
    const work = notebook([null, trial({ snapshot: snapshot({ speciesId: 'constructor' }) }), trial({ snapshot: snapshot({ wind: '8', formation: {}, groundSpeed: Infinity, benefit: -500 }) })]);
    const ui = fixture({ flightInvestigation: work });
    expect(ui.all(node => node.props?.['data-experiment-revisit'] != null)).toHaveLength(1);
    ui.click(ui.revisit());
    expect(ui.state.flightWind).toBe(8); expect(ui.state.flightInvestigation).toBe(work);
    expect(ui.writes[0]).not.toHaveProperty('groundSpeed'); expect(ui.writes[0]).not.toHaveProperty('benefit');
    expect(ui.status()).toContain('Revisited trial 1.');
    expect(ui.host.textContent).not.toMatch(/NaN|Infinity|\[object Object\]/);
  });

  it.each([
    { snapshot: snapshot({ wind: 26 }) }, { snapshot: snapshot({ wind: -16 }) },
    { snapshot: snapshot({ wind: Infinity }) }, { snapshot: snapshot({ season: 'winter' }) },
    { snapshot: snapshot({ formationMode: 'toString' }) }, { baseline: null }
  ])('does not offer either restore action for a malformed recorded pair: %j', patch => {
    const ui = fixture({ flightInvestigation: notebook([trial(patch)]) });
    expect(ui.revisit()).toBeNull(); expect(ui.revisit(1, true)).toBeNull(); expect(ui.writes).toEqual([]);
  });

  it.each([
    { flightWind: 9 }, { flightSpecies: 'snow_goose' }, { flightSeason: 'spring' },
    { flightFormation: 'v' }, { flightCamera: 'aerial' }, { flightPaused: false }, { flightShowSpeedVectors: false }
  ])('hides the revisit status when the displayed conditions change: %j', patch => {
    const ui = fixture(); ui.click(ui.revisit()); expect(ui.status()).toContain('Revisited trial 1.');
    ui.set(patch); expect(ui.status()).toBe('');
    expect(ui.state.flightInvestigation.trials).toHaveLength(1);
  });

  it('keeps status while evidence is edited and hides it when the source trial content changes', () => {
    const ui = fixture(); ui.click(ui.revisit());
    const textarea = ui.node(node => node.props?.id === 'migration-experiment-evidence');
    act(() => { textarea.props.onChange({ target: { value: 'I noticed a different vector length.' } }); });
    expect(ui.status()).toContain('Revisited trial 1.');
    const work = ui.state.flightInvestigation;
    ui.set({ flightInvestigation: { ...work, trials: [{ ...work.trials[0], prediction: 'A revised source prediction.' }] } });
    expect(ui.status()).toBe('');
  });

  it('hides status on row removal or reindexing and never records an additional trial', () => {
    const ui = fixture({ flightInvestigation: notebook([trial(), trial({ snapshot: snapshot({ wind: 20 }) })]) });
    ui.click(ui.revisit(2, true)); expect(ui.status()).toContain('Revisited baseline for trial 2.');
    ui.click(ui.node(node => node.props?.['aria-label'] === 'Remove trial 1'));
    expect(ui.status()).toBe(''); expect(ui.state.flightInvestigation.trials).toHaveLength(1);
    ui.click(ui.revisit()); expect(ui.status()).toContain('Revisited trial 1.');
    ui.click(ui.node(node => node.props?.['aria-label'] === 'Remove trial 1'));
    expect(ui.status()).toBe(''); expect(ui.revisit()).toBeNull();
  });

  it('cancels active Study pointer capture before restoring a pair, so a late pointerup cannot overwrite the view', () => {
    const ui = fixture({ flightStudyYaw: 35, flightStudyPitch: 15 });
    const props = ui.node(node => node.props?.id === 'migration-flight-stage').props;
    const host = ui.host.querySelector('#migration-flight-stage'); host.setAttribute('data-flight-ready', 'true');
    const canvas = document.createElement('canvas'); host.append(canvas); let captured = null;
    host.setPointerCapture = id => { captured = id; }; host.hasPointerCapture = id => captured === id;
    host.releasePointerCapture = () => { captured = null; };
    const event = values => ({ pointerId: 1, isPrimary: true, button: 0, clientX: 100, clientY: 100, target: canvas, currentTarget: host, preventDefault() {}, ...values });
    props.onPointerDown(event()); props.onPointerMove(event({ clientX: 200 }));
    expect(captured).toBe(1);
    ui.click(ui.revisit(1, true)); props.onPointerUp(event({ clientX: 200 }));
    expect(captured).toBeNull(); expect(host.hasAttribute('data-study-dragging')).toBe(false);
    expect(ui.writes).toHaveLength(1); expect(ui.state.flightCamera).toBe('chase');
    expect(ui.state.flightStudyYaw).toBe(35); expect(ui.state.flightStudyPitch).toBe(15);
  });

  it('keeps device Reduce motion and preserves notes when revisiting and switching tabs', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    const work = notebook(); const ui = fixture({ flightInvestigation: work, deviceReduceMotion: true });
    ui.click(ui.revisit());
    expect(ui.writes[0]).not.toHaveProperty('deviceReduceMotion'); expect(ui.writes[0]).not.toHaveProperty('motionReduced');
    expect(ui.state.deviceReduceMotion).toBe(true); expect(ui.host.textContent).toContain('Reduce motion');
    ui.set({ tab: 'world' }); ui.set({ tab: 'flight3d' });
    expect(ui.state.flightInvestigation).toBe(work); expect(ui.state.flightPaused).toBe(true);
    expect(ui.awardXP).not.toHaveBeenCalled();
  });
});
