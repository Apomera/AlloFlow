import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = process.env.MIGRATION_MARKED_VIEW_RESTORE_CANDIDATE || 'stem_lab/stem_tool_migration.js';
const source = fs.readFileSync(path.join(process.cwd(), sourcePath), 'utf8').replace(/\r\n/g, '\n');
function section(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error('Missing marked comparison section: ' + start);
  return source.slice(first, last);
}
const num = new Function(section('  function migrNum(', '  // Sibling of migrNum') + '\nreturn migrNum;')();
const helpers = new Function('migrNum', section('      function migrationStudyCycleContext(', '      function renderFlight3D()') +
  '\nreturn { select: selectMigrationMarkedWingPose, matches: migrationStudyMarkedReturnMatches, target: migrationStudyMarkedReturnTarget, cycleMatches: migrationStudyCyclePositionMatches, selectCycle: selectMigrationStudyCyclePosition, frame: migrationStudyComparisonFrame, check: migrationCheckMarkedComparison, checkMatches: migrationStudyComparisonCheckMatches, viewMatches: migrationStudyComparisonViewsMatch, restoreTarget: migrationMarkedViewRestoreTarget, restoreMatches: migrationStudyMarkedViewRestoreMatches };')(num);
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
  const ui = { host, stage, engine, engineRef, liveRef, refs, writes, queued, announce,
    get state() { return state; }, get live() { return liveRef.current; },
    node(predicate) { return walk(tree, predicate)[0] || null; },
    action(name) { return ui.node(node => node.props?.['data-marked-pose-action'] === name); },
    button(text) { return ui.node(node => node.type === 'button' && node.props.children === text); },
    click(node) { act(() => { node.props.onClick(); }); }, mark() { ui.click(ui.action('mark')); },
    returnPose() { ui.click(ui.action('return')); }, check() { ui.click(ui.action('check')); },
    restore() { const button = host.querySelector('[data-marked-pose-action="restore-view"]'); act(() => { ui.action('restore-view').props.onClick({ currentTarget: button }); }); },
    viewpoint(id) { ui.click(ui.node(node => node.props?.['data-study-viewpoint'] === id)); },
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



function comparedFixture() {
  const f = pureFixture(); helpers.select(f.engine, f.live, f.marked); f.frame();
  f.live.flightStudyYaw = 90; f.marked.comparisonCheck = helpers.check(f.engine, f.live, f.marked);
  f.live.flightMarkedPose = f.marked; return f;
}
function readyRestore(seed = {}, options = {}, step = true) {
  const ui = fixture({ flightStudyYaw: 75, flightStudyPitch: 30, flightStudyZoom: 1.2, ...seed }, options);
  ui.mark(); if (step) { ui.click(ui.button('Step wingbeat')); ui.frame(); }
  ui.set({ flightStudyYaw: 180, flightStudyPitch: 10, flightStudyZoom: 1.4 }); ui.check(); return ui;
}
function expectKind(ui, kind, status = 'checked') {
  expect(ui.cue()).not.toBeNull(); expect(ui.cue().getAttribute('data-marked-comparison-status')).toBe(status);
  expect(ui.cue().getAttribute('data-marked-comparison-kind')).toBe(kind);
}
function stageProps(ui) { return ui.node(node => node.props?.id === 'migration-flight-stage').props; }
function pointer(ui) {
  const canvas = document.createElement('canvas'); ui.stage.append(canvas); let captured = null;
  ui.stage.setPointerCapture = id => { captured = id; }; ui.stage.hasPointerCapture = id => captured === id;
  ui.stage.releasePointerCapture = id => { if (captured === id) captured = null; };
  return { get captured() { return captured; }, event(values = {}) { return { pointerId: 7, isPrimary: true, button: 0,
    clientX: 100, clientY: 100, target: canvas, currentTarget: ui.stage, preventDefault() {}, ...values }; } };
}

describe('Contextual restoration of marked selected view settings', () => {
  it('plans a read-only atomic view restore only for the exact current checked snapshot', () => {
    const f = comparedFixture(), checked = f.marked.comparisonCheck;
    const before = { live: { ...f.live }, marked: { ...f.marked }, phase: f.engine.wingStepPhase, time: f.engine.time, serial: f.engine.wingStepSerial };
    const intent = helpers.restoreTarget(f.engine, f.live, f.marked, checked);
    expect(intent).toEqual({ view: { yaw: 35, pitch: 15, zoom: 1 }, sourceBirdUuid: 'return-bird-2', captureVersion: 3,
      context: { speciesId: 'canada_goose', individual: 2, formationMode: 'natural', season: 'fall' } });
    expect(intent.view).not.toBe(f.marked.capturedView); expect(f.live).toEqual(before.live); expect(f.marked).toEqual(before.marked);
    expect({ phase: f.engine.wingStepPhase, time: f.engine.time, serial: f.engine.wingStepSerial }).toEqual({ phase: before.phase, time: before.time, serial: before.serial });
    f.marked.comparisonCheck = { ...checked }; expect(helpers.restoreTarget(f.engine, f.live, f.marked, checked)).toBeNull();
  });

  it('rejects stale phase, serial, mark identity, source, capture version and unavailable context before planning', () => {
    for (const mutate of [f => { f.engine.wingStepPhase += 0.4; f.frame(); }, f => { f.live.flightWingStep++; },
      f => { f.live.flightMarkedPose = { ...f.marked }; }, f => { f.engine.flyers[2].uuid = 'replacement'; },
      f => { f.engine.markedWingPose.userData.captureVersion++; }, f => { f.live.flightCamera = 'chase'; },
      f => { f.engine.host.setAttribute('data-flight-error', 'true'); }, f => { f.live.flightPaused = false; }]) {
      const f = comparedFixture(), checked = f.marked.comparisonCheck; mutate(f);
      expect(helpers.restoreTarget(f.engine, f.live, f.marked, checked)).toBeNull();
    }
  });

  it('binds delayed view ownership to its marked source and context while retaining it across wing actions and body time', () => {
    const f = comparedFixture(), intent = helpers.restoreTarget(f.engine, f.live, f.marked, f.marked.comparisonCheck);
    f.engine.time += 0.5; f.live.flightWingStep++; f.frame();
    expect(helpers.restoreMatches(intent, f.engine, f.live, f.marked)).toBe(true);
    helpers.select(f.engine, f.live, f.marked); f.frame(); expect(helpers.restoreMatches(intent, f.engine, f.live, f.marked)).toBe(true);
    f.engine.markedWingPose.userData.captureVersion++; expect(helpers.restoreMatches(intent, f.engine, f.live, f.marked)).toBe(false);
  });

  it('shows the native action only inside a fresh checked view-only or both cue and completes the controlled comparison', () => {
    const ui = fixture({ flightStudyYaw: 75, flightStudyPitch: 30, flightStudyZoom: 1.2 });
    expect(ui.action('restore-view')).toBeNull(); ui.mark(); ui.check(); expectKind(ui, 'same'); expect(ui.action('restore-view')).toBeNull();
    ui.click(ui.button('Step wingbeat')); ui.frame(); ui.check(); expectKind(ui, 'wing-only'); expect(ui.action('restore-view')).toBeNull();
    ui.set({ flightStudyYaw: 180, flightStudyPitch: 10, flightStudyZoom: 1.4 }); expect(ui.action('restore-view')).toBeNull();
    ui.check(); expectKind(ui, 'both'); expect(ui.action('restore-view')).toMatchObject({ type: 'button', props: {
      type: 'button', className: 'migration-study-focus', children: 'Restore marked view settings', 'aria-controls': 'migration-flight-stage' } });
    ui.restore(); expect(ui.cue()).toBeNull(); expect(ui.action('restore-view')).toBeNull(); ui.check(); expectKind(ui, 'wing-only');
    ui.returnPose(); ui.frame(); ui.check(); expectKind(ui, 'same');
    ui.set({ flightStudyYaw: 90 }); ui.check(); expectKind(ui, 'view-only'); expect(ui.action('restore-view')).not.toBeNull();
    ui.restore(); ui.check(); expectKind(ui, 'same');
  });

  it('writes exactly the three marked settings while preserving returned phase, playback ownership and all learner work', () => {
    const observations = { drafts: { 'canada_goose:primaries': 'My draft.' }, records: { 'canada_goose:head': { note: 'Saved.' } } };
    const investigation = { prediction: 'Keep.', evidence: 'Keep.' }, inquiry = { hypothesis: 'Keep.' }, challenges = { work: {} };
    const ui = fixture({ flightStudyYaw: 75, flightStudyPitch: 30, flightStudyZoom: 1.2, flightStudyObservations: observations,
      flightInvestigation: investigation, inquiry, flightChallenges: challenges, aiExplorerText: 'Keep research.', flightWind: -4 });
    ui.mark(); ui.returnPose(); ui.frame(); ui.set({ flightStudyYaw: 180, flightStudyPitch: 10, flightStudyZoom: 1.4 }); ui.check();
    const pauseRef = ui.refs.find(ref => ref.current?.kind === 'marked-return'), owner = pauseRef.current;
    const before = { phase: ui.engine.flyers[0].userData.lastRenderedWingPhase, offset: ui.engine.wingStepPhase,
      serial: ui.engine.wingStepSerial, time: ui.engine.time, version: ui.engine.markedWingPose.userData.captureVersion };
    const count = ui.writes.length; ui.restore();
    expect(ui.writes.slice(count)).toEqual([{ flightStudyYaw: 75, flightStudyPitch: 30, flightStudyZoom: 1.2 }]);
    expect(ui.returnStatus()).toBe('selected'); expect(pauseRef.current).toBe(owner); expect(ui.live.flightMarkedPose.returnIntent).toBe(owner);
    expect({ phase: ui.engine.flyers[0].userData.lastRenderedWingPhase, offset: ui.engine.wingStepPhase,
      serial: ui.engine.wingStepSerial, time: ui.engine.time, version: ui.engine.markedWingPose.userData.captureVersion }).toEqual(before);
    expect(ui.state).toMatchObject({ flightPaused: true, flightWind: -4, aiExplorerText: 'Keep research.' });
    expect(ui.state.flightStudyObservations).toBe(observations); expect(ui.state.flightInvestigation).toBe(investigation);
    expect(ui.state.inquiry).toBe(inquiry); expect(ui.state.flightChallenges).toBe(challenges); expect(ui.cue()).toBeNull();
  });

  it('consumes a valid action once and rejects an old action even after a fresh check of the same settings', () => {
    const ui = readyRestore(), old = ui.action('restore-view'); ui.check();
    const count = ui.writes.length; ui.click(old); expect(ui.writes).toHaveLength(count); expect(ui.action('restore-view')).not.toBeNull();
    const current = ui.action('restore-view'); ui.restore(); expect(ui.writes).toHaveLength(count + 1);
    ui.click(current); expect(ui.writes).toHaveLength(count + 1); expect(ui.cue()).toBeNull();
  });

  it('rejects retained native callbacks after re-mark, clear, source replacement or capture version changes', () => {
    for (const change of [ui => ui.mark(), ui => ui.click(ui.action('clear')),
      ui => { ui.engine.flyers[0].uuid = 'replacement'; }, ui => { ui.engine.markedWingPose.userData.captureVersion++; }]) {
      const ui = readyRestore(), old = ui.action('restore-view'); change(ui); const count = ui.writes.length;
      ui.click(old); expect(ui.writes).toHaveLength(count); ui.dispose();
    }
  });

  it('cancels an active captured gesture and pending revisit before restoring, with no later pointer-up write', () => {
    const ui = readyRestore({}, {}, false), p = pointer(ui); let props = stageProps(ui);
    act(() => { props.onPointerDown(p.event()); }); expect(p.captured).toBe(7);
    const revisitRef = ui.refs[ui.refs.indexOf(ui.engineRef) + 3];
    revisitRef.current = { speciesId: 'canada_goose', bird: 0, wingStep: ui.live.flightWingStep, yaw: 180, pitch: 10, zoom: 1.4 };
    const count = ui.writes.length; ui.restore(); expect(p.captured).toBeNull(); expect(revisitRef.current).toBeNull();
    props = stageProps(ui); act(() => { props.onPointerUp(p.event({ clientX: 240, clientY: 160 })); });
    expect(ui.writes.slice(count)).toEqual([{ flightStudyYaw: 75, flightStudyPitch: 30, flightStudyZoom: 1.2 }]);
    expect(ui.stage.hasAttribute('data-study-dragging')).toBe(false); expect(ui.live).toMatchObject({ flightStudyYaw: 75, flightStudyPitch: 30, flightStudyZoom: 1.2 });
  });

  it('keeps keyboard focus on the persistent Check button when its Restore action disappears', () => {
    const ui = readyRestore(), button = ui.host.querySelector('[data-marked-pose-action="restore-view"]'); button.focus();
    ui.restore(); expect(button.isConnected).toBe(false);
    expect(document.activeElement).toBe(ui.host.querySelector('[data-marked-pose-action="check"]'));
  });

  it('does not steal focus from another control during a scripted Restore action', () => {
    const ui = readyRestore(), field = document.createElement('input'); document.body.append(field); field.focus();
    ui.restore(); expect(document.activeElement).toBe(field); expect(ui.cue()).toBeNull();
  });

  it('keeps the acknowledged view stable through stale host renders and waits before rechecking', () => {
    const ui = readyRestore({}, { delayView: true }); ui.restore();
    expect(ui.state).toMatchObject({ flightStudyYaw: 180, flightStudyPitch: 10, flightStudyZoom: 1.4 }); expect(ui.cue()).toBeNull();
    ui.set({ flightWind: 3 }); expect(ui.live).toMatchObject({ flightStudyYaw: 180, flightStudyPitch: 10, flightStudyZoom: 1.4, flightViewRestorePending: true });
    expect(ui.node(node => node.props?.['aria-label'] === 'Study angle in degrees').props.value).toBe(180);
    expect(ui.action('check').props.disabled).toBe(false); ui.check(); expectKind(ui, '', 'waiting');
    expect(ui.cue().textContent).toContain('marked view settings to finish updating'); expect(ui.action('restore-view')).toBeNull();
    ui.flushOne(); expect(ui.cue()).toBeNull(); expect(ui.live.flightViewRestorePending).toBe(false); ui.check(); expectKind(ui, 'wing-only');
  });

  it('keeps a pending view restore across Step and applies its settings only after acknowledgement', () => {
    const ui = readyRestore({}, { delayView: true }, false); ui.restore(); const intent = ui.live.flightMarkedPose.viewRestoreIntent;
    ui.click(ui.button('Step wingbeat')); ui.frame();
    expect(ui.live.flightMarkedPose.viewRestoreIntent).toBe(intent); expect(ui.live).toMatchObject({ flightStudyYaw: 180, flightStudyPitch: 10, flightStudyZoom: 1.4 });
    ui.check(); expectKind(ui, '', 'waiting'); ui.flushOne(); expect(ui.cue()).toBeNull(); ui.check(); expectKind(ui, 'wing-only');
  });

  it('keeps a pending view restore and the newest Return pause owner through acknowledgement', () => {
    const ui = readyRestore({}, { delayView: true }); ui.restore(); const intent = ui.live.flightMarkedPose.viewRestoreIntent;
    ui.returnPose(); ui.frame(); const pauseRef = ui.refs.find(ref => ref.current?.kind === 'marked-return'), owner = pauseRef.current;
    expect(ui.live.flightMarkedPose.viewRestoreIntent).toBe(intent); expect(ui.returnStatus()).toBe('selected');
    ui.check(); expectKind(ui, '', 'waiting'); ui.flushOne(); expect(pauseRef.current).toBe(owner); expect(ui.returnStatus()).toBe('selected');
    expect(ui.cue()).toBeNull(); ui.check(); expectKind(ui, 'same');
  });

  it('an explicit preset equal to the old host view cancels pending restoration immediately', () => {
    const ui = readyRestore({}, { delayView: true }); ui.restore(); expect(ui.live.flightViewRestorePending).toBe(true);
    ui.viewpoint('front'); expect(ui.live.flightMarkedPose.viewRestoreIntent).toBeNull(); expect(ui.live.flightViewRestorePending).toBe(false);
    expect(ui.live).toMatchObject({ flightStudyYaw: 180, flightStudyPitch: 10 }); expect(ui.cue()).toBeNull();
    ui.check(); expectKind(ui, 'both');
  });

  it.each(['slider', 'reset', 'keyboard', 'drag'])('an explicit %s replaces pending restoration with a correctly based view action', action => {
    const ui = readyRestore({}, { delayView: true }); ui.restore();
    if (action === 'slider') act(() => { ui.node(node => node.props?.['aria-label'] === 'Study angle in degrees').props.onChange({ target: { value: '180' } }); });
    if (action === 'reset') ui.click(ui.button('Reset study view'));
    if (action === 'keyboard') act(() => { stageProps(ui).onKeyDown({ key: 'ArrowRight', target: ui.stage, currentTarget: ui.stage, preventDefault() {} }); });
    if (action === 'drag') { const p = pointer(ui); act(() => { stageProps(ui).onPointerDown(p.event()); stageProps(ui).onPointerMove(p.event({ clientX: 125 })); stageProps(ui).onPointerUp(p.event({ clientX: 125 })); }); }
    expect(ui.live.flightMarkedPose.viewRestoreIntent).toBeNull(); expect(ui.live.flightViewRestorePending).toBe(false); expect(ui.cue()).toBeNull();
    if (action === 'keyboard') expect(ui.writes.at(-1)).toEqual({ flightStudyYaw: -170 });
    if (action === 'drag') expect(ui.writes.at(-1)).toEqual({ flightStudyYaw: 170, flightStudyPitch: 10 });
    if (action === 'reset') expect(ui.writes.at(-1)).toEqual({ flightStudyYaw: 35, flightStudyPitch: 15, flightStudyZoom: 1 });
    if (action === 'slider') expect(ui.writes.at(-1)).toEqual({ flightStudyYaw: 180 });
  });
});
