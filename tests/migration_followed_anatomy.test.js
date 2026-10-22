import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = process.env.MIGRATION_FOLLOWED_ANATOMY_CANDIDATE || 'stem_lab/stem_tool_migration.js';
const source = fs.readFileSync(path.join(process.cwd(), sourcePath), 'utf8').replace(/\r\n/g, '\n');
function section(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error('Missing marked comparison section: ' + start);
  return source.slice(first, last);
}
const num = new Function(section('  function migrNum(', '  // Sibling of migrNum') + '\nreturn migrNum;')();
const helpers = new Function('migrNum', section('      function migrationStudyCycleContext(', '      function renderFlight3D()') +
  '\nreturn { select: selectMigrationMarkedWingPose, matches: migrationStudyMarkedReturnMatches, target: migrationStudyMarkedReturnTarget, cycleMatches: migrationStudyCyclePositionMatches, selectCycle: selectMigrationStudyCyclePosition, frame: migrationStudyComparisonFrame, check: migrationCheckMarkedComparison, checkMatches: migrationStudyComparisonCheckMatches, viewMatches: migrationStudyComparisonViewsMatch, restoreTarget: migrationMarkedViewRestoreTarget, restoreMatches: migrationStudyMarkedViewRestoreMatches, followContext: migrationStudyWingtipFollowContext, followMatches: migrationStudyWingtipFollowMatches, followTarget: migrationStudyWingtipFollowTarget, anatomySide: migrationStudyFollowedAnatomySide };')(num);
const advance = new Function('engineNow', 'live', 'migrNum', section('          var studyBirdIndex =', '          engineNow.flockRoot.position.x'));
const tau = Math.PI * 2;
const normalize = value => ((value % tau) + tau) % tau;
const { act } = React;
const mounts = [];
let tool;

function walk(node, predicate, result = []) {
  if (!node || typeof node !== 'object') return result;
  if (Array.isArray(node)) { node.forEach(child => walk(child, predicate, result)); return result; }
  if (predicate(node)) result.push(node);
  walk(node.props?.children, predicate, result); return result;
}
function fakeEngine(host, values = {}) {
  host.setAttribute('data-flight-ready', 'true');
  const pose = { userData: { captured: false, capturedPhase: null, captureVersion: 0, sourceBirdUuid: '' } };
  pose.capturePose = vi.fn((flyer, speciesId, individual) => {
    pose.userData = { captured: true, capturedPhase: Number.isFinite(flyer.userData.lastRenderedWingPhase) ? normalize(flyer.userData.lastRenderedWingPhase) : null,
      captureVersion: pose.userData.captureVersion + 1, sourceBirdUuid: flyer.uuid, speciesId, individual };
    return true;
  });
  pose.clearPose = vi.fn(() => { pose.userData.captured = false; pose.userData.capturedPhase = null; });
  return { host, flyers: Array.from({ length: 9 }, (_, i) => ({ uuid: 'return-bird-' + i, visible: true,
    position: { y: 0 }, rotation: { z: 0 }, userData: { phase: 1.19 + i * 0.29, flapRate: 5.3 + i * 0.11, baseY: 1, applyWingPhase: vi.fn() } })),
    time: 2.37, wingStepSerial: 14, wingStepPhase: 1.1,
    speciesId: 'canada_goose', formationMode: 'natural', season: 'fall',
    markedWingPose: pose, wingtipPath: { invalidate: vi.fn() }, ...values };
}
function pureFixture(phase = 0.37, liveValues = {}) {
  const host = document.createElement('div'); document.body.append(host);
  const engine = fakeEngine(host);
  const live = { tab: 'flight3d', flightCamera: 'study', flightShowWingtipPath: true, flightPaused: false,
    flightSpecies: 'canada_goose', flightFormation: 'natural', flightSeason: 'fall', flightStudyBird: 2, flightWingStep: 14, flightStudyYaw: 35, flightStudyPitch: 15, flightStudyZoom: 1, ...liveValues };
  const marked = { status: 'marked', speciesId: 'canada_goose', individual: 2, formationMode: 'natural', season: 'fall',
    capturedPhase: phase, captureVersion: 3, sourceBirdUuid: engine.flyers[2].uuid, capturedView: { yaw: 35, pitch: 15, zoom: 1 } };
  engine.markedWingPose.userData = { captured: true, speciesId: marked.speciesId, individual: 2,
    capturedPhase: phase, captureVersion: 3, sourceBirdUuid: marked.sourceBirdUuid };
  return { engine, live, marked, frame() { advance(engine, live, num); } };
}
function fixture(seed = {}, options = {}) {
  let state = { tab: 'flight3d', flightCamera: 'study', flightShowWingtipPath: true, flightWingStep: 14, ...seed }, tree, refresh;
  const refs = [], states = [], writes = [], queued = [], announce = vi.fn();
  const tracedReact = { ...React, useRef(value) {
    const ref = React.useRef(value); if (!refs.includes(ref)) refs.push(ref); return ref;
  }, useState(value) {
    const result = React.useState(value), index = states.findIndex(item => item[1] === result[1]);
    if (index < 0) states.push(result); else states[index] = result; return result;
  } };
  const ctx = makeCtx({ React: tracedReact, announceToSR: announce,
    update: (_, key, value) => { writes.push({ [key]: value });
      if (options.delayPause && key === 'flightPaused') { queued.push({ [key]: value }); return; }
      state = { ...state, [key]: value }; refresh(value => value + 1);
    }, updateMulti: (_, values) => { writes.push(values);
      if (options.delayView && Object.keys(values).length && Object.keys(values).every(key => ['flightStudyYaw', 'flightStudyPitch', 'flightStudyZoom'].includes(key))) { queued.push(values); return; }
      state = { ...state, ...values }; refresh(value => value + 1); }
  });
  const host = document.createElement('div'); document.body.append(host);
  const root = ReactDOMClient.createRoot(host); mounts.push(root);
  function Component() { refresh = React.useState(0)[1]; ctx.toolData = { migration: state }; tree = tool.render(ctx); return tree; }
  act(() => { root.render(React.createElement(Component)); });
  const stage = host.querySelector('#migration-flight-stage');
  const engineRef = refs[refs.findIndex(ref => ref.current === stage) + 1];
  const engine = fakeEngine(stage, { speciesId: state.flightSpecies || 'canada_goose', formationMode: state.flightFormation || 'natural',
    season: state.flightSeason || 'fall', wingStepSerial: state.flightWingStep });
  engineRef.current = engine;
  const liveRef = refs.find(ref => ref.current && typeof ref.current === 'object' && 'flightSpeedValues' in ref.current);
  const ui = { host, stage, engine, engineRef, liveRef, refs, states, writes, queued, announce,
    get state() { return state; }, get live() { return liveRef.current; },
    node(predicate) { return walk(tree, predicate)[0] || null; },
    action(name) { return ui.node(node => node.props?.['data-marked-pose-action'] === name); },
    button(text) { return ui.node(node => node.type === 'button' && node.props.children === text); },
    click(node) { act(() => { node.props.onClick(); }); }, mark() { ui.click(ui.action('mark')); },
    returnPose() { ui.click(ui.action('return')); }, check() { ui.click(ui.action('check')); },
    restore() { const button = host.querySelector('[data-marked-pose-action="restore-view"]'); act(() => { ui.action('restore-view').props.onClick({ currentTarget: button }); }); },
    viewpoint(id) { ui.click(ui.node(node => node.props?.['data-study-viewpoint'] === id)); },
    cue() { return host.querySelector('[data-marked-comparison-check]'); },
    followButton(side) { return ui.node(node => node.props?.['data-wingtip-follow-side'] === side); },
    follow(side) { ui.click(ui.followButton(side)); },
    anatomyToggle() { return ui.node(node => node.props?.['data-followed-anatomy-toggle'] === 'true'); },
    toggleAnatomy() { ui.click(ui.anatomyToggle()); },
    anatomySide() { return host.querySelector('[data-study-anatomy-side]')?.getAttribute('data-study-anatomy-side') || null; },
    region(id) { ui.click(ui.node(node => node.props?.['data-study-region'] === id)); },
    followStatus() { return host.querySelector('[data-wingtip-follow-status]')?.getAttribute('data-wingtip-follow-status') || null; },
    path(checked) { act(() => { ui.node(node => node.type === 'input' && node.props['aria-describedby'] === 'migration-wingtip-path-help').props.onChange({ target: { checked } }); }); },
    choose(index) { ui.click(ui.node(node => node.props?.['data-study-cycle-position'] === index)); },
    set(values) { act(() => { state = { ...state, ...values }; refresh(value => value + 1); }); },
    flushOne() { act(() => { state = { ...state, ...queued.shift() }; refresh(value => value + 1); }); },
    frame() { advance(engine, liveRef.current, num); },
    returnStatus() { return host.querySelector('[data-marked-pose-return-status]')?.getAttribute('data-marked-pose-return-status') || null; },
    dispose() { act(() => { root.unmount(); }); mounts.splice(mounts.indexOf(root), 1); host.remove(); }
  };
  if (!options.beforeReadyRender) { ui.set({}); ui.frame(); } return ui;
}

beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; resetStemLab(); tool = loadTool(sourcePath, 'migration'); });
afterEach(() => { act(() => { mounts.splice(0).forEach(root => root.unmount()); }); document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function anatomyFixture(side = 0) {
  const f = pureFixture(), context = helpers.followContext(f.engine, f.live);
  const selection = helpers.followTarget(f.engine, f.live, side, context);
  f.live.flightWingtipFollowSide = side; f.live.flightWingtipFollowSourceUuid = selection.context.sourceBirdUuid;
  return { ...f, selection };
}
function notePrompt(ui) { return ui.host.querySelector('#migration-study-motion-evidence-prompt')?.textContent || ''; }

describe('Trace anatomy on a validated followed bird wing', () => {
  it.each([0, 1])('resolves exact followed side %s without changing the engine or live values', side => {
    const f = anatomyFixture(side), before = JSON.stringify({ live: f.live, selection: f.selection,
      time: f.engine.time, phase: f.engine.wingStepPhase, serial: f.engine.wingStepSerial });
    expect(helpers.anatomySide(f.engine, f.live, f.selection)).toBe(side);
    expect(JSON.stringify({ live: f.live, selection: f.selection, time: f.engine.time,
      phase: f.engine.wingStepPhase, serial: f.engine.wingStepSerial })).toBe(before);
    f.engine.time += 0.2; f.live.flightWingStep++; f.frame(); f.live.flightPaused = true;
    expect(helpers.anatomySide(f.engine, f.live, f.selection)).toBe(side);
  });

  it('rejects missing follow provenance, mismatched side, changed source and unavailable contexts', () => {
    for (const change of [f => { f.live.flightWingtipFollowSide = '0'; }, f => { f.live.flightWingtipFollowSide = 1; },
      f => { delete f.live.flightWingtipFollowSourceUuid; }, f => { f.live.flightWingtipFollowSourceUuid = 'old'; },
      f => { f.engine.flyers[2].uuid = 'replacement'; }, f => { f.live.flightStudyBird = 1; },
      f => { f.live.flightShowWingtipPath = false; }, f => { f.live.flightCamera = 'chase'; },
      f => { f.engine.host.setAttribute('data-flight-error', 'true'); }, f => { f.live.flightSpecies = 'monarch'; }]) {
      const f = anatomyFixture(); change(f); expect(helpers.anatomySide(f.engine, f.live, f.selection)).toBeUndefined();
    }
    const f = anatomyFixture(); expect(helpers.anatomySide(f.engine, f.live, null)).toBeUndefined();
  });

  it('offers a persistent native toggle only after a valid bird side is followed', () => {
    const ui = fixture({ flightShowAnatomy: false });
    expect(ui.anatomyToggle()).toBeNull(); expect(ui.host.querySelector('[data-followed-anatomy-activity]')).toBeNull();
    ui.follow(0); expect(ui.anatomyToggle()).toMatchObject({ type: 'button', props: { type: 'button',
      className: 'migration-wingtip-follow-button', children: 'Show anatomy on followed wing', 'aria-pressed': 'false',
      'aria-controls': 'migration-flight-stage', 'aria-describedby': 'migration-followed-anatomy-help' } });
    const button = ui.host.querySelector('[data-followed-anatomy-toggle]'); button.focus();
    ui.toggleAnatomy(); expect(ui.anatomyToggle().props['aria-pressed']).toBe('true'); expect(ui.anatomySide()).toBe('left');
    expect(ui.host.querySelector('[data-followed-anatomy-toggle]')).toBe(button); expect(document.activeElement).toBe(button);
    ui.toggleAnatomy(); expect(ui.anatomyToggle().props['aria-pressed']).toBe('false'); expect(ui.anatomySide()).toBeNull();
    expect(ui.host.querySelector('[data-followed-anatomy-toggle]')).toBe(button); expect(document.activeElement).toBe(button);
    expect(ui.live.flightPaused).toBe(false);
  });

  it('retains same-batch toggles by reading and updating the current live anatomy preference', () => {
    const ui = fixture({ flightShowAnatomy: false }); ui.follow(1); const toggle = ui.anatomyToggle(), count = ui.writes.length;
    act(() => { toggle.props.onClick(); toggle.props.onClick(); });
    expect(ui.writes.slice(count)).toEqual([{ flightShowAnatomy: true }, { flightShowAnatomy: false }]);
    expect(ui.live.flightShowAnatomy).toBe(false); expect(ui.anatomyToggle().props['aria-pressed']).toBe('false');
    expect(ui.live.flightWingtipFollowSide).toBe(1);
  });

  it('writes only the anatomy preference and preserves notes, records, region, view, phase and Return ownership', () => {
    const record = { speciesId: 'canada_goose', region: 'primaries', note: 'Saved evidence.', bird: 0,
      yaw: 75, pitch: 30, zoom: 1.2, wingStep: 14, paused: true, motionReduced: false };
    const observations = { drafts: { 'canada_goose:inner-wing': 'Unfinished inner-wing note.' }, records: { 'canada_goose:primaries': record } };
    const investigation = { prediction: 'Keep prediction.' }, inquiry = { hypothesis: 'Keep inquiry.' }, challenges = { work: {} };
    const ui = fixture({ flightShowAnatomy: false, flightStudyRegion: 'inner-wing', flightStudyObservationOpen: false,
      flightStudyYaw: 75, flightStudyPitch: 30, flightStudyZoom: 1.2, flightWind: -4, flightStudyObservations: observations,
      flightInvestigation: investigation, inquiry, flightChallenges: challenges, aiExplorerText: 'Keep research.' });
    ui.follow(0); ui.mark(); ui.returnPose(); ui.frame();
    const ownerRef = ui.refs.find(ref => ref.current?.kind === 'marked-return'), owner = ownerRef.current, count = ui.writes.length;
    const before = { time: ui.engine.time, offset: ui.engine.wingStepPhase, serial: ui.engine.wingStepSerial,
      phase: ui.engine.flyers[0].userData.lastRenderedWingPhase, version: ui.engine.markedWingPose.userData.captureVersion };
    ui.toggleAnatomy(); expect(ui.writes.slice(count)).toEqual([{ flightShowAnatomy: true }]);
    expect({ time: ui.engine.time, offset: ui.engine.wingStepPhase, serial: ui.engine.wingStepSerial,
      phase: ui.engine.flyers[0].userData.lastRenderedWingPhase, version: ui.engine.markedWingPose.userData.captureVersion }).toEqual(before);
    expect(ownerRef.current).toBe(owner); expect(ui.returnStatus()).toBe('selected');
    expect(ui.state).toMatchObject({ flightStudyRegion: 'inner-wing', flightStudyObservationOpen: false, flightPaused: true,
      flightStudyYaw: 75, flightStudyPitch: 30, flightStudyZoom: 1.2, flightWind: -4, aiExplorerText: 'Keep research.' });
    expect(ui.state.flightStudyObservations).toBe(observations); expect(ui.state.flightStudyObservations.records['canada_goose:primaries']).toBe(record);
    expect(ui.state.flightInvestigation).toBe(investigation); expect(ui.state.inquiry).toBe(inquiry); expect(ui.state.flightChallenges).toBe(challenges);
    expect(ui.live.flightWingtipFollowSide).toBe(0);
  });

  it('keeps a numbered checkpoint pause owner and the selected cycle position', () => {
    const ui = fixture(); ui.choose(2); ui.frame(); ui.follow(1);
    const pauseRef = ui.refs.find(ref => ref.current?.index === 2), owner = pauseRef.current, count = ui.writes.length;
    ui.toggleAnatomy(); expect(ui.writes.slice(count)).toEqual([{ flightShowAnatomy: true }]);
    expect(pauseRef.current).toBe(owner); expect(ui.live.flightStudyCyclePosition).toBe(2); expect(ui.live.flightPaused).toBe(true);
  });

  it('rejects an old toggle when the followed side changes before the next render', () => {
    const ui = fixture({ flightShowAnatomy: false }); ui.follow(0); const old = ui.anatomyToggle(), right = ui.followButton(1), count = ui.writes.length;
    act(() => { right.props.onClick(); old.props.onClick(); });
    expect(ui.writes).toHaveLength(count); expect(ui.live.flightShowAnatomy).toBe(false); expect(ui.live.flightWingtipFollowSide).toBe(1);
    expect(ui.announce.mock.lastCall[0]).toContain('Follow a wingtip in a ready bird Study view');
  });

  it('rejects retained native callbacks for changed source, side provenance, context or readiness', () => {
    for (const change of [ui => { ui.engine.flyers[0].uuid = 'replacement'; }, ui => { ui.live.flightWingtipFollowSourceUuid = 'old'; },
      ui => { ui.live.flightStudyBird = 1; }, ui => { ui.live.flightFormation = 'solo'; ui.engine.formationMode = 'solo'; },
      ui => { ui.live.flightSeason = 'spring'; ui.engine.season = 'spring'; }, ui => { ui.live.flightCamera = 'chase'; },
      ui => { ui.live.flightShowWingtipPath = false; }, ui => { ui.stage.removeAttribute('data-flight-ready'); },
      ui => { ui.engine.disposed = true; }]) {
      const ui = fixture({ flightShowAnatomy: false }); ui.follow(0); const old = ui.anatomyToggle(), count = ui.writes.length;
      change(ui); ui.click(old); expect(ui.writes).toHaveLength(count); expect(ui.live.flightShowAnatomy).toBe(false);
      expect(ui.announce.mock.lastCall[0]).toContain('Follow a wingtip in a ready bird Study view'); ui.dispose();
    }
  });

  it('reflects anatomy preference changes without replacing the mounted control or moving note focus', () => {
    const observations = { drafts: { 'canada_goose:inner-wing': 'Keep my draft.' }, records: {} };
    const ui = fixture({ flightShowAnatomy: false, flightStudyRegion: 'inner-wing', flightStudyObservationOpen: true, flightStudyObservations: observations });
    ui.follow(1); const toggle = ui.host.querySelector('[data-followed-anatomy-toggle]'), note = ui.host.querySelector('#migration-study-observation-note'); note.focus();
    ui.toggleAnatomy(); expect(document.activeElement).toBe(note); expect(note.value).toBe('Keep my draft.');
    expect(ui.host.querySelector('[data-followed-anatomy-toggle]')).toBe(toggle); expect(ui.anatomyToggle().props['aria-pressed']).toBe('true');
    ui.set({ flightShowAnatomy: false }); expect(ui.anatomyToggle().props['aria-pressed']).toBe('false');
    expect(document.activeElement).toBe(note); expect(ui.state.flightStudyObservations).toBe(observations);
  });

  it('reports only wing markers 2 and 3 as left or right and defaults to right when both guides are shown', () => {
    const ui = fixture({ flightShowAnatomy: true }); expect(ui.anatomyToggle()).toBeNull(); expect(ui.anatomySide()).toBe('right');
    const sideStatus = ui.host.querySelector('[data-study-anatomy-side]');
    expect(sideStatus.textContent).toContain('Wing markers 2 and 3: individual’s right wing.');
    expect(sideStatus.getAttribute('data-study-anatomy-focus')).toBe('head');
    expect(sideStatus.textContent).toContain('Highlighted outline:');
    expect(sideStatus.textContent).toContain('All four numbered markers remain available.');
    ui.follow(0); expect(ui.anatomySide()).toBe('left'); ui.follow(0); expect(ui.anatomySide()).toBe('right');
    ui.follow(1); expect(ui.anatomySide()).toBe('right'); ui.path(false); expect(ui.anatomySide()).toBe('right'); expect(ui.anatomyToggle()).toBeNull();
  });

  it('uses the existing region buttons and notes for a camera-fixed comparison without recording or changing the draft', () => {
    const observations = { drafts: { 'canada_goose:inner-wing': 'Inner-wing draft.', 'canada_goose:primaries': 'Primary-feather draft.' }, records: {} };
    const ui = fixture({ flightShowAnatomy: false, flightStudyRegion: 'inner-wing', flightStudyObservationOpen: true, flightStudyObservations: observations });
    ui.follow(0); expect(notePrompt(ui)).toContain('Distinguish anatomical side from screen side');
    ui.toggleAnatomy(); const activity = ui.host.querySelector('[data-followed-anatomy-activity]').textContent;
    expect(activity).toContain('Predict which wing segment'); expect(activity).toContain('Hold the camera fixed');
    expect(activity).toContain('cycle positions 3 and 7'); expect(activity).toContain('Inner wing (2) and Primary feathers (3)');
    expect(notePrompt(ui)).toContain('Name the followed left or right side and the cycle positions in your note');
    expect(ui.host.querySelector('#migration-study-observation-note').value).toBe('Inner-wing draft.');
    expect(ui.node(node => node.props?.['data-study-region'] === 'inner-wing').props['aria-label']).toBe('Observe Inner wing');
    expect(ui.node(node => node.props?.['data-study-region'] === 'primaries').props['aria-label']).toBe('Observe Primary feathers');
    ui.region('primaries'); expect(ui.host.querySelector('#migration-study-observation-note').value).toBe('Primary-feather draft.');
    expect(notePrompt(ui)).toContain('Name the followed left or right side'); expect(ui.state.flightStudyObservations).toBe(observations);
    expect(ui.state.flightStudyObservations.records).toEqual({});
  });

  it('keeps old evidence prompts when anatomy is off, no side is followed, or a non-wing region is selected', () => {
    const ui = fixture({ flightShowAnatomy: false, flightStudyRegion: 'inner-wing', flightStudyObservationOpen: true }); ui.follow(0);
    expect(notePrompt(ui)).toContain('Distinguish anatomical side from screen side'); expect(notePrompt(ui)).not.toContain('Name the followed');
    ui.toggleAnatomy(); expect(notePrompt(ui)).toContain('Name the followed'); ui.follow(0);
    expect(notePrompt(ui)).toContain('Predict how the outer tips move relative to the body'); expect(notePrompt(ui)).not.toContain('Name the followed');
    ui.follow(1); ui.region('head'); expect(ui.host.querySelector('#migration-study-motion-evidence-prompt')).toBeNull();
    expect(ui.host.querySelector('#migration-study-observation-prompt').textContent).toContain('Describe the bill shape');
    ui.region('tail'); expect(ui.host.querySelector('#migration-study-motion-evidence-prompt')).toBeNull();
  });

  it('hides contextual anatomy tracing after source or camera context loss and keeps the established right-side fallback', () => {
    const ui = fixture({ flightShowAnatomy: true }); ui.follow(0); const old = ui.anatomyToggle();
    ui.engine.flyers[0].uuid = 'replacement'; ui.set({}); expect(ui.anatomyToggle()).toBeNull(); expect(ui.anatomySide()).toBe('right');
    const count = ui.writes.length; ui.click(old); expect(ui.writes).toHaveLength(count);
    ui.follow(1); ui.click(ui.button('Chase')); expect(ui.anatomyToggle()).toBeNull(); expect(ui.anatomySide()).toBeNull();
    ui.click(ui.button('Study')); expect(ui.anatomyToggle()).toBeNull(); expect(ui.anatomySide()).toBe('right');
  });

  it('excludes the new anatomy activity and trace note from Monarch while retaining its whole-wing observation', () => {
    const ui = fixture({ flightSpecies: 'monarch', flightShowAnatomy: true, flightStudyObservationOpen: true }); ui.follow(0);
    expect(ui.live.flightWingtipFollowSide).toBe(0); expect(ui.anatomyToggle()).toBeNull();
    expect(ui.host.querySelector('[data-followed-anatomy-activity]')).toBeNull(); expect(ui.anatomySide()).toBeNull();
    expect(notePrompt(ui)).not.toContain('Name the followed left or right side and the cycle positions');
    expect(ui.host.querySelector('#migration-study-observation-prompt').textContent).toContain('These are butterfly wings');
  });
});
