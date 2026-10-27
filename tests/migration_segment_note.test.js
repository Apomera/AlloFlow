import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const mounts = [];
let tool;

function walk(node, predicate, matches = []) {
  if (!node || typeof node !== 'object') return matches;
  if (Array.isArray(node)) { node.forEach(child => walk(child, predicate, matches)); return matches; }
  if (predicate(node)) matches.push(node);
  walk(node.props?.children, predicate, matches);
  return matches;
}

// Mount the real tool and its DOM effects. The Three.js loader remains pending;
// a minimal ready engine supplies provenance for the real follow handlers.
function fixture(seed = {}, options = {}) {
  let state = { tab: 'flight3d', flightCamera: 'study', flightShowWingtipPath: true,
    flightShowAnatomy: true, flightStudyRegion: 'inner-wing', flightWingStep: 7, ...seed }, tree, refresh;
  const writes = [], queued = [], refs = [], announce = vi.fn(), awardXP = vi.fn();
  const tracedReact = { ...React, useRef(value) {
    const ref = React.useRef(value); if (!refs.includes(ref)) refs.push(ref); return ref;
  } };
  const ctx = makeCtx({ React: tracedReact, announceToSR: announce, awardXP,
    update: (_, key, value) => { writes.push({ [key]: value }); state = { ...state, [key]: value }; refresh(value => value + 1); },
    updateMulti: (_, patch) => {
      writes.push(patch);
      if (options.delayMulti) { queued.push(patch); return; }
      state = { ...state, ...patch }; refresh(value => value + 1);
    }
  });
  const host = document.createElement('div'); document.body.append(host);
  const root = ReactDOMClient.createRoot(host); mounts.push(root);
  function Component() {
    refresh = React.useState(0)[1]; ctx.toolData = { migration: state };
    tree = tool.render(ctx); return tree;
  }
  act(() => { root.render(React.createElement(Component)); });
  const stage = host.querySelector("[data-migration-id=\"migration-flight-stage\"]");
  stage.setAttribute('data-flight-ready', 'true');
  const engineRef = refs[refs.findIndex(ref => ref.current === stage) + 1];
  const engine = {
    host: stage, speciesId: state.flightSpecies || 'canada_goose', formationMode: state.flightFormation || 'natural', season: state.flightSeason || 'fall',
    time: 1.3, wingStepSerial: state.flightWingStep, wingStepPhase: 0.7,
    flyers: Array.from({ length: 11 }, (_, index) => ({ uuid: 'segment-bird-' + index, visible: true,
      position: { y: 0 }, rotation: { z: 0 }, userData: { phase: 0.2 + index * 0.1, flapRate: 4.2, baseY: 1, applyWingPhase: vi.fn() } })),
    markedWingPose: { userData: { captured: false }, clearPose: vi.fn() }, wingtipPath: { invalidate: vi.fn() }
  };
  engineRef.current = engine;
  const liveRef = refs.find(ref => ref.current && typeof ref.current === 'object' && 'flightSpeedValues' in ref.current);
  const ui = {
    host, stage, engine, engineRef, liveRef, writes, queued, announce, awardXP,
    get state() { return state; }, get live() { return liveRef.current; },
    node(predicate) { return walk(tree, predicate)[0] || null; },
    action() { return ui.node(node => node.props?.['data-study-action'] === 'describe-wing-segment'); },
    legacy() { return ui.node(node => node.props?.['data-study-action'] === 'describe-wing-motion'); },
    field() { return host.querySelector("[data-migration-id=\"migration-study-observation-note\"]"); },
    click(node = ui.action()) { act(() => { node.props.onClick(); }); },
    follow(side = 0) { ui.click(ui.node(node => node.props?.['data-wingtip-follow-side'] === side)); },
    set(patch) { act(() => { state = { ...state, ...patch }; refresh(value => value + 1); }); },
    flush() { act(() => { for (const patch of queued.splice(0)) state = { ...state, ...patch }; refresh(value => value + 1); }); }
  };
  ui.set({});
  return ui;
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab();
  tool = loadTool(process.env.MIGRATION_SEGMENT_NOTE_CANDIDATE || 'stem_lab/stem_tool_migration.js', 'migration');
});

afterEach(() => {
  act(() => { mounts.splice(0).forEach(root => root.unmount()); });
  window.dispatchEvent(new Event('blur')); document.body.innerHTML = '';
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Migration followed-wing segment notes', () => {
  it('offers a native described action only for a selected wing region with valid followed anatomy', () => {
    const ui = fixture(); expect(ui.action()).toBeNull();
    ui.follow();
    expect(ui.action()).toMatchObject({ type: 'button', props: { type: 'button', children: 'Describe this wing segment',
      className: 'migration-wingtip-follow-button', 'aria-controls': ui.field().id,
      'aria-describedby': ['migration-segment-note-help', 'migration-followed-anatomy-help'].map(key => ui.host.querySelector('[data-migration-id="' + key + '"]').id).join(' ') } });
    expect(ui.host.querySelector("[data-migration-id=\"migration-segment-note-help\"]").textContent).toContain('selected wing segment’s existing note');
    expect(ui.host.querySelector("[data-migration-id=\"migration-segment-note-help\"]").textContent).toContain('does not record an observation or change playback');
    ui.set({ flightStudyRegion: 'head' }); expect(ui.action()).toBeNull();
    ui.set({ flightStudyRegion: 'tail' }); expect(ui.action()).toBeNull();
    ui.set({ flightStudyRegion: 'primaries' }); expect(ui.action()).not.toBeNull();
    ui.set({ flightShowAnatomy: false }); expect(ui.action()).toBeNull();
    ui.set({ flightShowAnatomy: true, flightShowWingtipPath: false }); expect(ui.action()).toBeNull();
  });

  it.each([[0, 'inner-wing'], [1, 'inner-wing'], [0, 'primaries'], [1, 'primaries']])('opens the existing %s-side %s draft without changing the region or experiment', (side, region) => {
    const observations = { drafts: { 'canada_goose:inner-wing': 'My inner-wing evidence.', 'canada_goose:primaries': 'My primary-feather evidence.' }, records: {} };
    const investigation = { prediction: 'Keep my prediction.' }, challenges = { work: { wind: { notes: 'Keep challenge evidence.' } } };
    const ui = fixture({ flightStudyRegion: region, flightStudyObservations: observations, flightInvestigation: investigation,
      flightChallenges: challenges, flightStudyBird: 2, flightPaused: false, flightStudyYaw: 90, flightStudyPitch: 10, flightStudyZoom: 1.25 });
    ui.follow(side);
    const field = ui.field(), originalFocus = field.focus.bind(field), focusedKeys = [];
    vi.spyOn(field, 'focus').mockImplementation(options => { focusedKeys.push(field.getAttribute('data-study-observation-key')); originalFocus(options); });
    field.scrollIntoView = vi.fn();
    const before = { state: { ...ui.state }, side: ui.live.flightWingtipFollowSide, source: ui.live.flightWingtipFollowSourceUuid,
      time: ui.engine.time, phase: ui.engine.wingStepPhase, serial: ui.engine.wingStepSerial };
    ui.writes.length = 0; ui.click();
    expect(ui.writes).toEqual([{ flightStudyObservationOpen: true }]);
    expect(ui.state).toEqual({ ...before.state, flightStudyObservationOpen: true });
    expect(ui.state.flightStudyRegion).toBe(region); expect(ui.state.flightStudyObservations).toBe(observations);
    expect(ui.state.flightInvestigation).toBe(investigation); expect(ui.state.flightChallenges).toBe(challenges);
    expect(focusedKeys).toEqual(['canada_goose:' + region]); expect(document.activeElement).toBe(field);
    expect(field.value).toBe(observations.drafts['canada_goose:' + region]);
    expect(field.scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'auto' });
    expect({ side: ui.live.flightWingtipFollowSide, source: ui.live.flightWingtipFollowSourceUuid,
      time: ui.engine.time, phase: ui.engine.wingStepPhase, serial: ui.engine.wingStepSerial }).toEqual({ side: before.side, source: before.source,
      time: before.time, phase: before.phase, serial: before.serial });
    expect(ui.awardXP).not.toHaveBeenCalled(); expect(observations.records).toEqual({});
  });

  it('uses a saved segment note without creating a draft or changing evidence counts', () => {
    const observations = { drafts: { 'canada_goose:primaries': 'Keep outer draft.' }, records: {
      'canada_goose:inner-wing': { speciesId: 'canada_goose', region: 'inner-wing', note: 'Saved inner-wing note.' }
    } };
    const ui = fixture({ flightStudyObservations: observations }); ui.follow(); ui.click();
    expect(ui.field().value).toBe('Saved inner-wing note.'); expect(ui.state.flightStudyObservations).toBe(observations);
    expect(Object.keys(observations.drafts)).toEqual(['canada_goose:primaries']);
    expect(ui.host.querySelector('[data-study-evidence-count]').getAttribute('data-study-evidence-count')).toBe('1');
  });

  it('waits for the note disclosure commit, then focuses the selected segment once', () => {
    const ui = fixture({}, { delayMulti: true }); ui.follow();
    const field = ui.field(), focus = vi.spyOn(field, 'focus'); ui.click();
    expect(focus).not.toHaveBeenCalled(); expect(ui.state.flightStudyObservationOpen).toBeUndefined();
    ui.flush(); expect(focus).toHaveBeenCalledTimes(1); expect(document.activeElement).toBe(field);
    expect(field.getAttribute('data-study-observation-key')).toBe('canada_goose:inner-wing');
    const other = document.createElement('button'); document.body.append(other); other.focus();
    ui.set({ flightWind: 12 }); expect(focus).toHaveBeenCalledTimes(1); expect(document.activeElement).toBe(other);
  });

  it('refocuses an already open segment note without replacing its mounted field', () => {
    const ui = fixture({ flightStudyObservationOpen: true }); ui.follow();
    const field = ui.field(), focus = vi.spyOn(field, 'focus'); ui.click();
    expect(ui.field()).toBe(field); expect(document.activeElement).toBe(field); expect(focus).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['side', ui => { ui.live.flightWingtipFollowSide = 1; }],
    ['provenance', ui => { ui.live.flightWingtipFollowSourceUuid = 'old-source'; }],
    ['source', ui => { ui.engine.flyers[0].uuid = 'replacement'; }],
    ['individual', ui => { ui.live.flightStudyBird = 1; }],
    ['region', ui => { ui.live.flightStudyRegion = 'primaries'; }],
    ['anatomy hidden', ui => { ui.live.flightShowAnatomy = false; }],
    ['path hidden', ui => { ui.live.flightShowWingtipPath = false; }],
    ['camera', ui => { ui.live.flightCamera = 'chase'; }],
    ['tab', ui => { ui.live.tab = 'inquiry'; }],
    ['species', ui => { ui.live.flightSpecies = 'monarch'; }],
    ['formation', ui => { ui.live.flightFormation = 'solo'; }],
    ['season', ui => { ui.live.flightSeason = 'spring'; }],
    ['context loss', ui => { ui.engine.contextLost = true; }],
    ['disposed engine', ui => { ui.engine.disposed = true; }],
    ['not ready', ui => { ui.stage.setAttribute('data-flight-ready', 'false'); }]
  ])('rejects a retained native callback after %s changes without writing or moving focus', (_, change) => {
    const ui = fixture(); ui.follow(); const retained = ui.action(), field = ui.field(), focus = vi.spyOn(field, 'focus');
    const origin = ui.host.querySelector('[data-study-action="describe-wing-segment"]'); origin.focus();
    change(ui); ui.writes.length = 0; ui.announce.mockClear(); ui.click(retained);
    expect(ui.writes).toEqual([]); expect(focus).not.toHaveBeenCalled(); expect(document.activeElement).toBe(origin);
    expect(ui.announce).toHaveBeenCalledWith(expect.stringContaining('Select Inner wing or Primary feathers'));
  });

  it.each([
    ['side', ui => ui.follow(1)],
    ['anatomy', ui => ui.set({ flightShowAnatomy: false })],
    ['region', ui => ui.set({ flightStudyRegion: 'primaries' })],
    ['individual', ui => ui.set({ flightStudyBird: 1 })],
    ['source', ui => { ui.engine.flyers[0].uuid = 'new-source'; ui.set({}); }],
    ['context loss', ui => { ui.engine.contextLost = true; ui.set({}); }]
  ])('cancels delayed segment focus after the %s changes', (_, change) => {
    const ui = fixture({}, { delayMulti: true }); ui.follow();
    const field = ui.field(), focus = vi.spyOn(field, 'focus'); ui.click(); change(ui); ui.flush();
    expect(focus).not.toHaveBeenCalled(); expect(document.activeElement).not.toBe(field);
  });

  it('does not steal focus if the learner moves to another control before the disclosure commits', () => {
    const ui = fixture({}, { delayMulti: true }); ui.follow();
    const field = ui.field(), focus = vi.spyOn(field, 'focus');
    ui.host.querySelector('[data-study-action="describe-wing-segment"]').focus(); ui.click();
    const other = ui.host.querySelector('select'); other.focus(); ui.flush();
    expect(document.activeElement).toBe(other); expect(focus).not.toHaveBeenCalled();
  });

  it('retains the existing Describe wing motion action and its Primary feathers destination', () => {
    const ui = fixture(); ui.follow(); expect(ui.action()).not.toBeNull();
    expect(ui.legacy().props.children).toBe('Describe wing motion'); ui.writes.length = 0; ui.click(ui.legacy());
    expect(ui.writes).toEqual([{ flightStudyObservationOpen: true, flightStudyRegion: 'primaries' }]);
    expect(ui.field().getAttribute('data-study-observation-key')).toBe('canada_goose:primaries');
  });

  it('excludes segment notes from Monarch while keeping its whole-wing notes', () => {
    const monarch = fixture({ flightSpecies: 'monarch' }); monarch.follow(); expect(monarch.action()).toBeNull();
    expect(monarch.legacy()).not.toBeNull(); expect(monarch.field().getAttribute('data-study-observation-key')).toBe('monarch:whole-wing');
  });

  it('excludes segment notes from non-Study views', () => {
    const bird = fixture(); bird.follow(); bird.set({ flightCamera: 'chase' }); expect(bird.action()).toBeNull();
  });
});
