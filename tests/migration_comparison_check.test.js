import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = process.env.MIGRATION_COMPARISON_CANDIDATE || 'stem_lab/stem_tool_migration.js';
const source = fs.readFileSync(path.join(process.cwd(), sourcePath), 'utf8').replace(/\r\n/g, '\n');
function section(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error('Missing marked comparison section: ' + start);
  return source.slice(first, last);
}
const num = new Function(section('  function migrNum(', '  // Sibling of migrNum') + '\nreturn migrNum;')();
const helpers = new Function('migrNum', section('      function migrationStudyCycleContext(', '      function renderFlight3D()') +
  '\nreturn { select: selectMigrationMarkedWingPose, matches: migrationStudyMarkedReturnMatches, target: migrationStudyMarkedReturnTarget, cycleMatches: migrationStudyCyclePositionMatches, selectCycle: selectMigrationStudyCyclePosition, frame: migrationStudyComparisonFrame, check: migrationCheckMarkedComparison, checkMatches: migrationStudyComparisonCheckMatches, viewMatches: migrationStudyComparisonViewsMatch };')(num);
const clearIntent = new Function('_f3dStudyCyclePauseRef', 'studyMarkedPoseState',
  section('      function clearMigrationMarkedReturnIntent(', '      function renderFlight3D()') + '\nreturn clearMigrationMarkedReturnIntent;');
const advance = new Function('engineNow', 'live', 'migrNum', section('          var studyBirdIndex =', '          engineNow.flockRoot.position.x'));
const installLoss = new Function('renderer', 'cancelMigrationStudyPreview', 'engine', 'host', 'statusNode', 't',
  'studyCyclePositionState', '_liveVals', '_f3dStudyCyclePauseRef', 'studyWingtipFollowState', '_f3dStudyStepAckRef',
  section("          renderer.domElement.addEventListener('webglcontextlost'", "          host.setAttribute('data-flight-ready', 'true');"));
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
  const live = { tab: 'flight3d', flightCamera: 'study', flightShowWingtipPath: false, flightPaused: false,
    flightSpecies: 'canada_goose', flightFormation: 'natural', flightSeason: 'fall', flightStudyBird: 2, flightWingStep: 14, flightStudyYaw: 35, flightStudyPitch: 15, flightStudyZoom: 1, ...liveValues };
  const marked = { status: 'marked', speciesId: 'canada_goose', individual: 2, formationMode: 'natural', season: 'fall',
    capturedPhase: phase, captureVersion: 3, sourceBirdUuid: engine.flyers[2].uuid, capturedView: { yaw: 35, pitch: 15, zoom: 1 } };
  engine.markedWingPose.userData = { captured: true, speciesId: marked.speciesId, individual: 2,
    capturedPhase: phase, captureVersion: 3, sourceBirdUuid: marked.sourceBirdUuid };
  return { engine, live, marked, frame() { advance(engine, live, num); } };
}
function fixture(seed = {}, options = {}) {
  let state = { tab: 'flight3d', flightCamera: 'study', flightShowWingtipPath: false, flightWingStep: 14, ...seed }, tree, refresh;
  const refs = [], writes = [], queued = [], announce = vi.fn();
  const tracedReact = { ...React, useRef(value) {
    const ref = React.useRef(value); if (!refs.includes(ref)) refs.push(ref); return ref;
  } };
  const ctx = makeCtx({ React: tracedReact, announceToSR: announce,
    update: (_, key, value) => { writes.push({ [key]: value });
      if (options.delayPause && key === 'flightPaused') { queued.push({ [key]: value }); return; }
      state = { ...state, [key]: value }; refresh(value => value + 1);
    }, updateMulti: (_, values) => { writes.push(values); state = { ...state, ...values }; refresh(value => value + 1); }
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
  const ui = { host, stage, engine, engineRef, liveRef, refs, writes, queued, announce,
    get state() { return state; }, get live() { return liveRef.current; },
    node(predicate) { return walk(tree, predicate)[0] || null; },
    action(name) { return ui.node(node => node.props?.['data-marked-pose-action'] === name); },
    button(text) { return ui.node(node => node.type === 'button' && node.props.children === text); },
    click(node) { act(() => { node.props.onClick(); }); }, mark() { ui.click(ui.action('mark')); },
    returnPose() { ui.click(ui.action('return')); }, check() { ui.click(ui.action('check')); },
    cue() { return host.querySelector('[data-marked-comparison-check]'); },
    choose(index) { ui.click(ui.node(node => node.props?.['data-study-cycle-position'] === index)); },
    set(values) { act(() => { state = { ...state, ...values }; refresh(value => value + 1); }); },
    flushOne() { act(() => { state = { ...state, ...queued.shift() }; refresh(value => value + 1); }); },
    frame() { advance(engine, liveRef.current, num); },
    returnStatus() { return host.querySelector('[data-marked-pose-return-status]')?.getAttribute('data-marked-pose-return-status') || null; },
    dispose() { act(() => { root.unmount(); }); mounts.splice(mounts.indexOf(root), 1); host.remove(); }
  };
  ui.set({}); ui.frame(); return ui;
}

beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; resetStemLab(); tool = loadTool(sourcePath, 'migration'); });
afterEach(() => { act(() => { mounts.splice(0).forEach(root => root.unmount()); }); document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); });


function alignedFixture(phase = 0.37, values = {}) {
  const f = pureFixture(phase, values); helpers.select(f.engine, f.live, f.marked); f.frame(); return f;
}
function modelSnapshot(f) {
  return JSON.stringify({ live: f.live, marked: f.marked, time: f.engine.time, serial: f.engine.wingStepSerial,
    offset: f.engine.wingStepPhase, flyers: f.engine.flyers.map(flyer => ({ uuid: flyer.uuid, visible: flyer.visible,
      rendered: flyer.userData.lastRenderedWingPhase, phase: flyer.userData.phase, rate: flyer.userData.flapRate })),
    pose: f.engine.markedWingPose.userData });
}
function expectCue(ui, kind, status = 'checked') {
  expect(ui.cue()).not.toBeNull();
  expect(ui.cue().getAttribute('data-marked-comparison-status')).toBe(status);
  expect(ui.cue().getAttribute('data-marked-comparison-kind')).toBe(kind);
}

describe('On-demand controlled comparison of marked wings and selected view settings', () => {
  it.each([
    { kind: 'same', view: false, phase: false }, { kind: 'view-only', view: true, phase: false },
    { kind: 'wing-only', view: false, phase: true }, { kind: 'both', view: true, phase: true }
  ])('evaluates $kind from the actual wing RAF and stays read-only', ({ kind, view, phase }) => {
    const f = alignedFixture();
    if (view) f.live.flightStudyYaw = 90;
    if (phase) { f.engine.wingStepPhase += Math.PI / 4; f.frame(); }
    const before = modelSnapshot(f), calls = f.engine.flyers[2].userData.applyWingPhase.mock.calls.length;
    const checked = helpers.check(f.engine, f.live, f.marked);
    expect(checked).toMatchObject({ status: 'checked', kind, manualStep: 14, engineTime: 2.37, sourceBirdUuid: 'return-bird-2', captureVersion: 3 });
    expect(helpers.checkMatches(checked, f.engine, f.live, f.marked)).toBe(true);
    expect(modelSnapshot(f)).toBe(before); expect(f.engine.flyers[2].userData.applyWingPhase).toHaveBeenCalledTimes(calls);
  });

  it('recognizes periodic phase and yaw equivalence while retaining the selected numbers', () => {
    const f = alignedFixture(tau + 0.37); f.marked.capturedView.yaw = 180; f.live.flightStudyYaw = -180;
    const checked = helpers.check(f.engine, f.live, f.marked);
    expect(checked).toMatchObject({ status: 'checked', kind: 'same', view: { yaw: -180 }, markedView: { yaw: 180 } });
    expect(helpers.checkMatches(checked, f.engine, f.live, f.marked)).toBe(true);
    f.engine.flyers[2].userData.lastRenderedWingPhase += tau;
    expect(helpers.checkMatches(checked, f.engine, f.live, f.marked)).toBe(true);
  });

  it('reports waiting for a queued manual step and checks again only after the actual RAF consumes it', () => {
    const f = alignedFixture(); f.live.flightWingStep++;
    const pending = helpers.check(f.engine, f.live, f.marked);
    expect(pending).toMatchObject({ status: 'waiting', kind: '', manualStep: 15 });
    expect(helpers.checkMatches(pending, f.engine, f.live, f.marked)).toBe(true);
    f.frame(); expect(helpers.checkMatches(pending, f.engine, f.live, f.marked)).toBe(false);
    expect(helpers.check(f.engine, f.live, f.marked)).toMatchObject({ status: 'checked', kind: 'wing-only' });
  });

  it('waits for Return or a checkpoint even when their eager offset already matches the manual serial', () => {
    for (const action of ['return', 'checkpoint']) {
      const f = alignedFixture(0.37, { flightShowWingtipPath: true });
      f.engine.wingStepPhase += Math.PI / 4; f.frame();
      if (action === 'return') helpers.select(f.engine, f.live, f.marked);
      else helpers.selectCycle(f.engine, f.live, 3);
      expect(f.engine.wingStepSerial).toBe(f.live.flightWingStep);
      const pending = helpers.check(f.engine, f.live, f.marked);
      expect(pending).toMatchObject({ status: 'waiting', kind: '' });
      f.frame(); expect(helpers.checkMatches(pending, f.engine, f.live, f.marked)).toBe(false);
      expect(helpers.check(f.engine, f.live, f.marked)).toMatchObject({ status: 'checked', kind: action === 'return' ? 'same' : 'wing-only' });
    }
  });

  it('rejects missing provenance, invalid views and unavailable context, and waits for unknown rendered phase', () => {
    const mutations = [f => { f.live.flightPaused = false; }, f => { f.marked.capturedPhase = null; },
      f => { f.marked.capturedView = null; }, f => { f.live.flightStudyZoom = Infinity; },
      f => { f.engine.flyers[2].uuid = 'replacement'; }, f => { f.engine.markedWingPose.userData.captureVersion++; },
      f => { f.live.flightSeason = 'spring'; }, f => { f.live.flightCamera = 'chase'; },
      f => { f.engine.host.setAttribute('data-flight-error', 'true'); }, f => { f.engine.disposed = true; }];
    for (const mutate of mutations) {
      const f = alignedFixture(); mutate(f); const before = modelSnapshot(f);
      expect(helpers.check(f.engine, f.live, f.marked)).toBeNull(); expect(modelSnapshot(f)).toBe(before);
    }
    const f = alignedFixture(); delete f.engine.flyers[2].userData.lastRenderedWingPhase;
    expect(helpers.check(f.engine, f.live, f.marked)).toMatchObject({ status: 'waiting', kind: '', phase: null });
  });

  it('expires a checked snapshot on every compared value or source change', () => {
    const mutations = [f => { f.live.flightStudyYaw += 5; }, f => { f.live.flightStudyPitch += 5; },
      f => { f.live.flightStudyZoom += 0.05; }, f => { f.live.flightWingStep++; },
      f => { f.engine.time += 0.01; }, f => { f.engine.wingStepPhase += 0.1; f.frame(); },
      f => { f.engine.flyers[2].uuid = 'replacement'; }, f => { f.engine.markedWingPose.userData.captureVersion++; },
      f => { f.marked.capturedView.yaw += 5; }, f => { f.live.flightPaused = false; },
      f => { f.engine.host.removeAttribute('data-flight-ready'); }, f => { f.live.flightStudyBird = 3; }];
    for (const mutate of mutations) {
      const f = alignedFixture(), checked = helpers.check(f.engine, f.live, f.marked);
      mutate(f); expect(helpers.checkMatches(checked, f.engine, f.live, f.marked)).toBe(false);
    }
  });

  it('offers a native Check button after marking with the path off and records the selected view settings', () => {
    const ui = fixture({ flightStudyYaw: 90, flightStudyPitch: 10, flightStudyZoom: 1.3 });
    expect(ui.action('check').type).toBe('button'); expect(ui.action('check').props.type).toBe('button');
    expect(ui.action('check').props.children).toBe('Check what changed'); expect(ui.action('check').props.disabled).toBe(true);
    ui.mark(); expect(ui.action('check').props.disabled).toBe(false); expect(ui.state.flightShowWingtipPath).toBe(false);
    expect(ui.host.querySelector('[data-marked-view-settings]').textContent).toBe('Marked view settings: 90° / 10° · 130%');
    expect(ui.cue()).toBeNull(); const count = ui.writes.length; ui.check(); expectCue(ui, 'same');
    expect(ui.writes).toHaveLength(count); expect(ui.announce.mock.lastCall[0]).toContain('match the mark');
    ui.click(ui.button('Resume flight')); expect(ui.action('check').props.disabled).toBe(true); expect(ui.cue()).toBeNull();
  });

  it('evaluates all four native cases without claiming to measure the eased rendered camera', () => {
    const ui = fixture(); ui.mark(); ui.check(); expectCue(ui, 'same');
    ui.set({ flightStudyYaw: 90 }); ui.check(); expectCue(ui, 'view-only');
    expect(ui.cue().textContent).toContain('Selected view settings changed');
    ui.click(ui.button('Step wingbeat')); ui.frame(); ui.check(); expectCue(ui, 'both');
    ui.set({ flightStudyYaw: 35 }); ui.check(); expectCue(ui, 'wing-only');
    expect(ui.cue().textContent).toContain('illustrative wing-cycle position changed');
    ui.returnPose(); ui.frame(); ui.check(); expectCue(ui, 'same');
  });

  it('a native Check immediately after Step publishes waiting, then checks the committed frame on demand', () => {
    const ui = fixture(); ui.mark(); ui.check();
    const phase = ui.engine.flyers[0].userData.lastRenderedWingPhase;
    ui.click(ui.button('Step wingbeat')); expect(ui.cue()).toBeNull();
    const count = ui.writes.length, time = ui.engine.time, offset = ui.engine.wingStepPhase;
    ui.check(); expectCue(ui, '', 'waiting');
    expect(ui.cue().textContent).toContain('Wait for the wings'); expect(ui.writes).toHaveLength(count);
    expect(ui.engine.time).toBe(time); expect(ui.engine.wingStepPhase).toBe(offset);
    expect(ui.engine.flyers[0].userData.lastRenderedWingPhase).toBe(phase);
    ui.frame(); ui.check(); expectCue(ui, 'wing-only'); expect(ui.writes).toHaveLength(count);
  });

  it('hides and clears an old cue after orbit or zoom, so restoring settings requires an explicit recheck', () => {
    const ui = fixture(); ui.mark(); ui.check(); expectCue(ui, 'same');
    ui.set({ flightStudyYaw: 90 }); expect(ui.cue()).toBeNull();
    ui.set({ flightStudyYaw: 35 }); expect(ui.cue()).toBeNull(); ui.check(); expectCue(ui, 'same');
    ui.set({ flightStudyZoom: 1.2 }); expect(ui.cue()).toBeNull();
    ui.set({ flightStudyZoom: 1 }); expect(ui.cue()).toBeNull(); ui.check(); expectCue(ui, 'same');
  });

  it('preserves returned-pose pause ownership, camera, body time, manual serial and all learner work', () => {
    const observations = { drafts: { 'canada_goose:primaries': 'My unfinished note.' }, records: { 'canada_goose:head': { note: 'Saved note.' } } };
    const investigation = { prediction: 'Keep prediction.', evidence: 'Keep evidence.' }, inquiry = { hypothesis: 'Keep inquiry.' }, challenges = { work: {} };
    const ui = fixture({ flightStudyObservations: observations, flightInvestigation: investigation, inquiry, flightChallenges: challenges,
      aiExplorerText: 'Keep research.', flightStudyYaw: 90, flightStudyPitch: 10, flightStudyZoom: 1.3, flightWind: -4 });
    ui.mark(); ui.click(ui.button('Step wingbeat')); ui.frame(); ui.returnPose(); ui.frame();
    const pauseRef = ui.refs.find(ref => ref.current?.kind === 'marked-return'), owner = pauseRef.current;
    const before = { time: ui.engine.time, serial: ui.engine.wingStepSerial, offset: ui.engine.wingStepPhase,
      phase: ui.engine.flyers[0].userData.lastRenderedWingPhase, version: ui.engine.markedWingPose.userData.captureVersion };
    const count = ui.writes.length; ui.check(); expectCue(ui, 'same');
    expect(ui.returnStatus()).toBe('selected'); expect(pauseRef.current).toBe(owner); expect(ui.writes).toHaveLength(count);
    expect({ time: ui.engine.time, serial: ui.engine.wingStepSerial, offset: ui.engine.wingStepPhase,
      phase: ui.engine.flyers[0].userData.lastRenderedWingPhase, version: ui.engine.markedWingPose.userData.captureVersion }).toEqual(before);
    expect(ui.state).toMatchObject({ flightStudyYaw: 90, flightStudyPitch: 10, flightStudyZoom: 1.3, flightWind: -4, aiExplorerText: 'Keep research.' });
    expect(ui.state.flightStudyObservations).toBe(observations); expect(ui.state.flightInvestigation).toBe(investigation);
    expect(ui.state.inquiry).toBe(inquiry); expect(ui.state.flightChallenges).toBe(challenges);
  });

  it('keeps Check independent of delayed host pause writes and invalidates on an explicit Resume', () => {
    const ui = fixture({ flightPaused: true }, { delayPause: true }); ui.mark(); ui.flushOne(); ui.check(); expectCue(ui, 'same');
    const count = ui.writes.length;
    ui.click(ui.button('Resume flight')); expect(ui.writes.slice(count)).toEqual([{ flightPaused: false }]);
    expect(ui.state.flightPaused).toBe(true); expect(ui.cue()).toBeNull();
    ui.returnPose(); ui.frame(); ui.check(); expectCue(ui, 'same');
    ui.flushOne(); expect(ui.state.flightPaused).toBe(false); expect(ui.live.flightPaused).toBe(true); expectCue(ui, 'same');
    ui.flushOne(); expectCue(ui, 'same');
  });

  it('requires an explicit recheck when Return is requested at the same marked phase', () => {
    const ui = fixture(); ui.mark(); ui.check(); expectCue(ui, 'same');
    const phase = ui.engine.flyers[0].userData.lastRenderedWingPhase, time = ui.engine.time, serial = ui.engine.wingStepSerial;
    ui.returnPose(); expect(ui.cue()).toBeNull(); ui.frame(); expect(ui.cue()).toBeNull();
    expect(ui.engine.flyers[0].userData.lastRenderedWingPhase).toBeCloseTo(phase, 10);
    expect(ui.engine.time).toBe(time); expect(ui.engine.wingStepSerial).toBe(serial);
    const count = ui.writes.length; ui.check(); expectCue(ui, 'same'); expect(ui.writes).toHaveLength(count);
  });

  it('does not let an old expected-owner cleanup clear a newer Return or comparison check', () => {
    const older = { kind: 'marked-return', captureVersion: 1 }, newer = { kind: 'marked-return', captureVersion: 2 };
    const checked = { status: 'checked', kind: 'same' }, capturedView = { yaw: 35, pitch: 15, zoom: 1 };
    const current = { status: 'marked', returnIntent: newer, comparisonCheck: checked, capturedView };
    const pauseRef = { current: newer }, state = [current, value => { state[0] = typeof value === 'function' ? value(state[0]) : value; }];
    const clear = clearIntent(pauseRef, state); clear(older);
    expect(pauseRef.current).toBe(newer); expect(state[0]).toBe(current); expect(state[0].comparisonCheck).toBe(checked);
    clear(newer); expect(pauseRef.current).toBeNull();
    expect(state[0]).toMatchObject({ returnIntent: null, comparisonCheck: null }); expect(state[0].capturedView).toBe(capturedView);
    state[0] = { ...current, returnIntent: null }; clear();
    expect(state[0]).toMatchObject({ returnIntent: null, comparisonCheck: null }); expect(state[0].capturedView).toBe(capturedView);
  });

  it('clears checked feedback for a replacement mark, cleared reference, source change and context loss', () => {
    const ui = fixture(); ui.mark(); ui.check(); expectCue(ui, 'same');
    ui.mark(); expect(ui.cue()).toBeNull(); ui.check(); expectCue(ui, 'same');
    ui.click(ui.action('clear')); expect(ui.cue()).toBeNull(); expect(ui.action('check').props.disabled).toBe(true);
    ui.mark(); ui.check(); ui.engine.flyers[0].uuid = 'replacement'; ui.set({}); expect(ui.cue()).toBeNull();
    ui.mark(); ui.check(); expectCue(ui, 'same');
    const canvas = document.createElement('canvas');
    const stepAckRef = { current: { pending: { manualStep: 20 } } };
    installLoss({ domElement: canvas }, vi.fn(), ui.engine, ui.stage, document.createElement('div'), (_, fallback) => fallback,
      [null, vi.fn()], ui.liveRef, { current: null }, [null, vi.fn()], stepAckRef);
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })); ui.set({});
    expect(stepAckRef.current.pending).toBeNull();
    expect(ui.cue()).toBeNull(); expect(ui.action('check').props.disabled).toBe(true);
    ui.stage.removeAttribute('data-flight-error'); ui.stage.setAttribute('data-flight-ready', 'true'); ui.set({}); expect(ui.cue()).toBeNull();
  });
});
