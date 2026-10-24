import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = process.env.MIGRATION_RETURN_CANDIDATE || 'stem_lab/stem_tool_migration.js';
const source = fs.readFileSync(path.join(process.cwd(), sourcePath), 'utf8').replace(/\r\n/g, '\n');
function section(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error('Missing marked Return section: ' + start);
  return source.slice(first, last);
}
const num = new Function(section('  function migrNum(', '  // Sibling of migrNum') + '\nreturn migrNum;')();
const helpers = new Function('migrNum', section('      function migrationStudyCycleContext(', '      function renderFlight3D()') +
  '\nreturn { select: selectMigrationMarkedWingPose, matches: migrationStudyMarkedReturnMatches, target: migrationStudyMarkedReturnTarget, cycleMatches: migrationStudyCyclePositionMatches };')(num);
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
    flightSpecies: 'canada_goose', flightFormation: 'natural', flightSeason: 'fall', flightStudyBird: 2, flightWingStep: 14, ...liveValues };
  const marked = { status: 'marked', speciesId: 'canada_goose', individual: 2, formationMode: 'natural', season: 'fall',
    capturedPhase: phase, captureVersion: 3, sourceBirdUuid: engine.flyers[2].uuid };
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
    returnPose() { ui.click(ui.action('return')); },
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

describe('Return to the actual temporary marked wing phase', () => {
  it.each([0, 0.37, Math.PI / 4, 6.1])('returns arbitrary phase %s through the actual wing RAF without resetting body time or serial', phase => {
    const f = pureFixture(phase), time = f.engine.time, serial = f.live.flightWingStep;
    const intent = helpers.select(f.engine, f.live, f.marked);
    expect(intent).toMatchObject({ kind: 'marked-return', phase, captureVersion: 3, manualStep: serial });
    f.frame(); const actual = f.engine.flyers[2].userData.applyWingPhase.mock.lastCall[0];
    expect(Math.cos(actual)).toBeCloseTo(Math.cos(phase), 10); expect(Math.sin(actual)).toBeCloseTo(Math.sin(phase), 10);
    expect(f.engine.flyers[2].userData.lastRenderedWingPhase).toBe(actual);
    expect(f.engine.time).toBe(time); expect(f.live.flightWingStep).toBe(serial); expect(f.live.flightPaused).toBe(true);
    expect(f.live.flightStudyCyclePosition).toBeUndefined(); expect(helpers.matches(intent, f.engine, f.live)).toBe(true);
    expect(helpers.cycleMatches(intent, f.engine, f.live)).toBe(false);
  });

  it('consumes previously requested steps and retains wrapped steps requested after Return', () => {
    const f = pureFixture(0.37, { flightWingStep: 1000000 }); f.engine.wingStepSerial = 19;
    const intent = helpers.select(f.engine, f.live, f.marked); expect(f.engine.wingStepSerial).toBe(1000000);
    f.live.flightWingStep = 1; f.frame();
    const actual = f.engine.flyers[2].userData.lastRenderedWingPhase;
    expect(Math.sin(actual)).toBeCloseTo(Math.sin(0.37 + Math.PI / 2), 10);
    expect(Math.cos(actual)).toBeCloseTo(Math.cos(0.37 + Math.PI / 2), 10);
    expect(helpers.matches(intent, f.engine, f.live)).toBe(false);
  });

  it('requires the exact captured source, phase, context and version without mutation on rejection', () => {
    const mutations = [f => { f.marked.captureVersion++; }, f => { f.engine.markedWingPose.userData.captureVersion++; },
      f => { f.marked.sourceBirdUuid = 'old'; }, f => { f.engine.flyers[2].uuid = 'new'; },
      f => { f.engine.markedWingPose.userData.captured = false; }, f => { f.marked.capturedPhase = null; },
      f => { f.engine.markedWingPose.userData.capturedPhase = NaN; }, f => { f.marked.season = 'spring'; },
      f => { f.live.flightCamera = 'chase'; }, f => { f.engine.host.removeAttribute('data-flight-ready'); }];
    for (const mutate of mutations) {
      const f = pureFixture(); mutate(f); const phase = f.engine.wingStepPhase;
      expect(helpers.select(f.engine, f.live, f.marked)).toBeNull();
      expect(f.engine.wingStepPhase).toBe(phase); expect(f.live.flightPaused).toBe(false);
    }
  });

  it('offers one native disabled Return before marking and remains usable with the path layer off', () => {
    const ui = fixture(); expect(ui.action('return').type).toBe('button'); expect(ui.action('return').props.type).toBe('button');
    expect(ui.action('return').props.children).toBe('Return wings to marked pose'); expect(ui.action('return').props.disabled).toBe(true);
    ui.mark(); expect(ui.action('return').props.disabled).toBe(false); expect(ui.state.flightShowWingtipPath).toBe(false);
    expect(ui.action('return').props['aria-controls']).toBe('migration-flight-stage');
    expect(ui.action('return').props['aria-describedby']).toBe('migration-marked-pose-help migration-marked-pose-status');
    ui.returnPose(); expect(ui.returnStatus()).toBe('selected'); expect(ui.live.flightStudyCyclePosition).toBeUndefined();
  });

  it('retains a marked outline without offering Return when the old capture has no rendered phase', () => {
    const ui = fixture(); delete ui.engine.flyers[0].userData.lastRenderedWingPhase; ui.mark();
    expect(ui.engine.markedWingPose.userData.captured).toBe(true); expect(ui.engine.markedWingPose.userData.capturedPhase).toBeNull();
    expect(ui.action('clear').props.disabled).toBe(false); expect(ui.action('return').props.disabled).toBe(true);
    const writes = ui.writes.length; ui.returnPose(); expect(ui.writes).toHaveLength(writes); expect(ui.returnStatus()).toBe('idle');
  });

  it('marks the last applied phase even when a newer checkpoint is queued before the next frame', () => {
    const ui = fixture({ flightShowWingtipPath: true }); const actualRendered = normalize(ui.engine.flyers[0].userData.lastRenderedWingPhase);
    ui.choose(3); ui.mark(); expect(ui.engine.markedWingPose.userData.capturedPhase).toBe(actualRendered);
    ui.frame(); expect(normalize(ui.engine.flyers[0].userData.lastRenderedWingPhase)).toBeCloseTo(3 * tau / 8, 10);
    ui.returnPose(); ui.frame(); expect(normalize(ui.engine.flyers[0].userData.lastRenderedWingPhase)).toBeCloseTo(actualRendered, 10);
  });

  it('the actual Return handler preserves camera, body time, serial, drafts, saved records and research', () => {
    const observations = { drafts: { 'canada_goose:primaries': 'My unfinished note.' }, records: { 'canada_goose:head': { note: 'Saved note.' } } };
    const investigation = { prediction: 'Keep prediction.', evidence: 'Keep evidence.' }, inquiry = { hypothesis: 'Keep inquiry.' }, challenges = { work: {} };
    const ui = fixture({ flightStudyObservations: observations, flightInvestigation: investigation, inquiry, flightChallenges: challenges,
      aiExplorerText: 'Keep research.', flightStudyYaw: 90, flightStudyPitch: 10, flightStudyZoom: 1.3, flightWind: -4 });
    ui.mark(); const pose = ui.engine.markedWingPose, version = pose.userData.captureVersion, time = ui.engine.time;
    ui.click(ui.button('Step wingbeat')); ui.frame(); const serial = ui.state.flightWingStep;
    const count = ui.writes.length; ui.returnPose(); ui.frame();
    expect(ui.writes.slice(count)).toEqual([{ flightPaused: true }]); expect(ui.returnStatus()).toBe('selected');
    expect(ui.engine.markedWingPose).toBe(pose); expect(pose.userData.captureVersion).toBe(version); expect(ui.engine.time).toBe(time);
    expect(ui.state).toMatchObject({ flightStudyYaw: 90, flightStudyPitch: 10, flightStudyZoom: 1.3, flightWind: -4, flightWingStep: serial, aiExplorerText: 'Keep research.' });
    expect(ui.state.flightStudyObservations).toBe(observations); expect(ui.state.flightInvestigation).toBe(investigation);
    expect(ui.state.inquiry).toBe(inquiry); expect(ui.state.flightChallenges).toBe(challenges);
  });

  it('keeps Return selected while the host pause commit is delayed and honors explicit Resume before its acknowledgement', () => {
    const ui = fixture({}, { delayPause: true }); ui.mark(); ui.returnPose(); ui.set({ flightWind: 4 });
    expect(ui.state.flightPaused).toBeUndefined(); expect(ui.live.flightPaused).toBe(true); expect(ui.returnStatus()).toBe('selected');
    ui.click(ui.button('Resume flight')); expect(ui.live.flightPaused).toBe(false); expect(ui.returnStatus()).toBe('idle');
    ui.flushOne(); ui.flushOne(); expect(ui.returnStatus()).toBe('idle'); expect(ui.live.flightStudyCyclePosition).toBeUndefined();
  });

  it('keeps the newest Return paused through an older Resume acknowledgement', () => {
    const ui = fixture({ flightPaused: true }, { delayPause: true }); ui.mark(); ui.flushOne();
    ui.click(ui.button('Resume flight')); ui.returnPose(); const target = ui.engine.markedWingPose.userData.capturedPhase;
    ui.flushOne(); expect(ui.state.flightPaused).toBe(false); expect(ui.live.flightPaused).toBe(true); expect(ui.returnStatus()).toBe('selected');
    ui.frame(); expect(normalize(ui.engine.flyers[0].userData.lastRenderedWingPhase)).toBeCloseTo(target, 10);
    ui.flushOne(); expect(ui.returnStatus()).toBe('selected');
  });

  it('retains Return through orbit, zoom and theme changes while keeping it independent from numbered checkpoints', () => {
    const ui = fixture({ flightShowWingtipPath: true }); ui.mark(); ui.returnPose();
    ui.set({ flightStudyYaw: 180, flightStudyPitch: 10, flightStudyZoom: 1.4, isDark: true });
    expect(ui.returnStatus()).toBe('selected'); expect(ui.live.flightStudyCyclePosition).toBeUndefined();
    ui.choose(5); expect(ui.returnStatus()).toBe('idle'); expect(ui.live.flightStudyCyclePosition).toBe(5);
    ui.returnPose(); expect(ui.returnStatus()).toBe('selected'); expect(ui.live.flightStudyCyclePosition).toBeUndefined();
    expect(walk(ui.node(node => node.props?.['data-study-cycle-controls']), node => node.props?.['aria-pressed'] === 'true')).toHaveLength(0);
  });

  it('ends Return on Step, Resume, clearing or replacing the reference', () => {
    const ui = fixture(); ui.mark(); ui.returnPose(); ui.click(ui.button('Step wingbeat')); expect(ui.returnStatus()).toBe('idle');
    ui.returnPose(); ui.click(ui.button('Resume flight')); expect(ui.returnStatus()).toBe('idle');
    ui.returnPose(); ui.mark(); expect(ui.returnStatus()).toBe('idle');
    ui.returnPose(); ui.click(ui.action('clear')); expect(ui.returnStatus()).toBeNull(); expect(ui.action('return').props.disabled).toBe(true);
  });

  it('invalidates old Return ownership for changed source UUID, capture version or body time', () => {
    for (const change of [ui => { ui.engine.flyers[0].uuid = 'replacement'; }, ui => { ui.engine.markedWingPose.userData.captureVersion++; }, ui => { ui.engine.time += 0.2; }]) {
      const ui = fixture(); ui.mark(); ui.returnPose(); change(ui); ui.set({}); expect(ui.returnStatus()).toBe('idle'); ui.dispose();
    }
  });

  it('ends Return when revisiting a saved observation whose settings otherwise match', () => {
    const record = { speciesId: 'canada_goose', region: 'primaries', note: 'Saved.', bird: 0, yaw: 35, pitch: 15, zoom: 1, wingStep: 14, paused: true, motionReduced: false };
    const ui = fixture({ flightStudyRegion: 'primaries', flightStudyObservationOpen: true,
      flightStudyObservations: { records: { 'canada_goose:primaries': record } } });
    ui.mark(); ui.returnPose(); ui.click(ui.node(node => node.props?.['data-study-revisit'] === 'observation'));
    expect(ui.returnStatus()).toBe('idle'); expect(ui.live.flightStudyCyclePosition).toBeUndefined();
  });

  it('ends Return directly through actual context loss and does not restore it after readiness returns', () => {
    const ui = fixture(); ui.mark(); ui.returnPose(); const canvas = document.createElement('canvas');
    const pauseRef = ui.refs.find(ref => ref.current?.kind === 'marked-return');
    const stepAckRef = { current: { pending: { manualStep: 20 } } };
    installLoss({ domElement: canvas }, vi.fn(), ui.engine, ui.stage, document.createElement('div'), (_, fallback) => fallback,
      [null, vi.fn()], ui.liveRef, pauseRef, [null, vi.fn()], stepAckRef);
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    expect(stepAckRef.current.pending).toBeNull();
    expect(pauseRef.current).toBeNull(); ui.set({}); expect(ui.action('return').props.disabled).toBe(true); expect(ui.returnStatus()).toBe('idle');
    ui.stage.removeAttribute('data-flight-error'); ui.stage.setAttribute('data-flight-ready', 'true'); ui.set({}); expect(ui.returnStatus()).toBe('idle');
  });
});
