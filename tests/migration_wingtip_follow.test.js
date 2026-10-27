import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = process.env.MIGRATION_WINGTIP_FOLLOW_CANDIDATE || 'stem_lab/stem_tool_migration.js';
const source = fs.readFileSync(path.join(process.cwd(), sourcePath), 'utf8').replace(/\r\n/g, '\n');
function section(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error('Missing marked comparison section: ' + start);
  return source.slice(first, last);
}
const num = new Function(section('  function migrNum(', '  // Sibling of migrNum') + '\nreturn migrNum;')();
const helpers = new Function('migrNum', section('      function migrationStudyCycleContext(', '      function renderFlight3D()') +
  '\nreturn { select: selectMigrationMarkedWingPose, matches: migrationStudyMarkedReturnMatches, target: migrationStudyMarkedReturnTarget, cycleMatches: migrationStudyCyclePositionMatches, selectCycle: selectMigrationStudyCyclePosition, frame: migrationStudyComparisonFrame, check: migrationCheckMarkedComparison, checkMatches: migrationStudyComparisonCheckMatches, viewMatches: migrationStudyComparisonViewsMatch, restoreTarget: migrationMarkedViewRestoreTarget, restoreMatches: migrationStudyMarkedViewRestoreMatches, followContext: migrationStudyWingtipFollowContext, followMatches: migrationStudyWingtipFollowMatches, followTarget: migrationStudyWingtipFollowTarget };')(num);
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
  const stage = host.querySelector("[data-migration-id=\"migration-flight-stage\"]");
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
    followStatus() { return host.querySelector('[data-wingtip-follow-status]')?.getAttribute('data-wingtip-follow-status') || null; },
    path(checked) { act(() => { ui.node(node => node.type === 'input' && node.props['aria-describedby'] === ui.host.querySelector('[data-migration-id="migration-wingtip-path-help"]').id).props.onChange({ target: { checked } }); }); },
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




function followedFixture(side = 0) {
  const f = pureFixture(); const context = helpers.followContext(f.engine, f.live);
  return { ...f, selection: helpers.followTarget(f.engine, f.live, side, context) };
}
function expectFollow(ui, side) {
  expect(ui.live.flightWingtipFollowSide).toBe(side);
  expect(ui.live.flightWingtipFollowSourceUuid).toBe(side === undefined ? undefined : ui.engine.flyers[ui.live.flightStudyBird].uuid);
  expect(ui.followStatus()).toBe(side === 0 ? 'left' : side === 1 ? 'right' : 'both');
  for (const candidate of [0, 1]) expect(ui.followButton(candidate).props['aria-pressed']).toBe(candidate === side ? 'true' : 'false');
}

describe('Follow one anatomical wingtip without recording a learner response', () => {
  it.each([0, 1])('accepts only exact numeric side %s in its ready Study source context', side => {
    const f = followedFixture(side); expect(f.selection).toMatchObject({ side, context: { sourceBirdUuid: 'return-bird-2', individual: 2 } });
    expect(helpers.followMatches(f.selection, f.engine, f.live)).toBe(true);
    for (const invalid of [-1, 2, '0', '1', false, null, undefined, NaN]) {
      expect(helpers.followTarget(f.engine, f.live, invalid, f.selection.context)).toBeNull();
      expect(helpers.followMatches({ ...f.selection, side: invalid }, f.engine, f.live)).toBe(false);
    }
  });

  it('retains anatomical side through view, phase, manual counter, body time and playback changes', () => {
    const f = followedFixture(); const phase = f.engine.wingStepPhase;
    Object.assign(f.live, { flightStudyYaw: 180, flightStudyPitch: 60, flightStudyZoom: 1.5, flightWingStep: 21, flightPaused: true });
    f.engine.time += 0.5; f.engine.wingStepPhase += 0.3; f.frame();
    expect(helpers.followMatches(f.selection, f.engine, f.live)).toBe(true);
    f.live.flightPaused = false; expect(helpers.followMatches(f.selection, f.engine, f.live)).toBe(true);
    expect(f.engine.wingStepPhase).not.toBe(phase);
  });

  it('rejects stale source, individual, species, formation, season and unavailable scene context', () => {
    for (const change of [f => { f.engine.flyers[2].uuid = 'replacement'; }, f => { f.live.flightStudyBird = 3; },
      f => { f.live.flightSpecies = 'monarch'; }, f => { f.live.flightFormation = 'solo'; }, f => { f.live.flightSeason = 'spring'; },
      f => { f.live.flightShowWingtipPath = false; }, f => { f.live.flightCamera = 'chase'; },
      f => { f.engine.host.removeAttribute('data-flight-ready'); }, f => { f.engine.host.setAttribute('data-flight-error', 'true'); },
      f => { f.engine.disposed = true; }, f => { f.engine.flyers[2].visible = false; }]) {
      const f = followedFixture(); change(f);
      expect(helpers.followMatches(f.selection, f.engine, f.live)).toBe(false);
      expect(helpers.followTarget(f.engine, f.live, 1, f.selection.context)).toBeNull();
    }
  });

  it('provides two native pressed-state legend controls with the original solid and dashed keys', () => {
    const ui = fixture(); expectFollow(ui, undefined);
    for (const side of [0, 1]) {
      expect(ui.followButton(side)).toMatchObject({ type: 'button', props: { type: 'button', disabled: false,
        className: 'migration-wingtip-follow-button', 'aria-controls': ui.stage.id, 'aria-describedby': ui.host.querySelector('[data-migration-id="migration-wingtip-follow-help"]').id } });
      expect(ui.followButton(side).props['aria-label']).toBeUndefined();
      expect(ui.host.querySelector('[data-wingtip-follow-side="' + side + '"]').textContent)
        .toBe(side === 0 ? 'Individual’s left: solid path' : 'Individual’s right: dashed path');
    }
    expect(ui.host.querySelector('[data-wingtip-follow-controls]').textContent).toContain('Individual’s left: solid path');
    expect(ui.host.querySelector('[data-wingtip-follow-controls]').textContent).toContain('Individual’s right: dashed path');
    ui.follow(0); expectFollow(ui, 0); ui.follow(1); expectFollow(ui, 1); ui.follow(1); expectFollow(ui, undefined);
  });

  it('can bind a ready source from the initial native handler without a readiness rerender', () => {
    const ui = fixture({}, { beforeReadyRender: true }), initial = ui.followButton(0);
    expect(initial.props.disabled).toBe(false); ui.stage.removeAttribute('data-flight-ready');
    const count = ui.writes.length; ui.click(initial); expect(ui.live.flightWingtipFollowSide).toBeUndefined(); expect(ui.writes).toHaveLength(count);
    expect(ui.host.querySelector('[data-scene-feedback]').textContent).toContain('Wait for a ready Study view');
    ui.stage.setAttribute('data-flight-ready', 'true'); ui.click(initial); expectFollow(ui, 0);
    ui.engine.flyers[0].uuid = 'replacement'; ui.click(initial); expect(ui.live.flightWingtipFollowSide).toBe(0);
    expect(ui.live.flightWingtipFollowSourceUuid).not.toBe('replacement'); ui.dispose();
    const changed = fixture({}, { beforeReadyRender: true }), old = changed.followButton(1);
    changed.live.flightSeason = 'spring'; changed.engine.season = 'spring'; changed.click(old);
    expect(changed.live.flightWingtipFollowSide).toBeUndefined(); expect(changed.writes).toHaveLength(0);
  });

  it('retains every same-batch toggle and keeps the focused native button mounted', () => {
    const ui = fixture(), left = ui.followButton(0), leftNode = ui.host.querySelector('[data-wingtip-follow-side="0"]'); leftNode.focus();
    act(() => { left.props.onClick(); left.props.onClick(); }); expectFollow(ui, undefined);
    act(() => { left.props.onClick(); ui.followButton(1).props.onClick(); }); expectFollow(ui, 1);
    expect(leftNode.isConnected).toBe(true); expect(document.activeElement).toBe(leftNode);
  });

  it('changes no persistent data, camera, wing phase, playback, body time, marked source or saved work', () => {
    const observations = { drafts: { 'canada_goose:primaries': 'Keep my note.' }, records: {} }, investigation = { prediction: 'Keep.' };
    const inquiry = { hypothesis: 'Keep.' }, challenges = { work: {} };
    const ui = fixture({ flightStudyObservations: observations, flightInvestigation: investigation, inquiry, flightChallenges: challenges,
      aiExplorerText: 'Keep research.', flightStudyYaw: 75, flightStudyPitch: 30, flightStudyZoom: 1.2 });
    ui.mark(); ui.returnPose(); ui.frame(); const state = ui.state, writes = ui.writes.length;
    const ownerRef = ui.refs.find(ref => ref.current?.kind === 'marked-return'), owner = ownerRef.current;
    const before = { phase: ui.engine.flyers[0].userData.lastRenderedWingPhase, offset: ui.engine.wingStepPhase,
      time: ui.engine.time, serial: ui.engine.wingStepSerial, version: ui.engine.markedWingPose.userData.captureVersion };
    ui.follow(0); ui.follow(1); ui.follow(1);
    expect(ui.writes).toHaveLength(writes); expect(ui.state).toBe(state); expect(ownerRef.current).toBe(owner); expect(ui.returnStatus()).toBe('selected');
    expect({ phase: ui.engine.flyers[0].userData.lastRenderedWingPhase, offset: ui.engine.wingStepPhase,
      time: ui.engine.time, serial: ui.engine.wingStepSerial, version: ui.engine.markedWingPose.userData.captureVersion }).toEqual(before);
    expect(ui.state).toMatchObject({ flightStudyYaw: 75, flightStudyPitch: 30, flightStudyZoom: 1.2, aiExplorerText: 'Keep research.' });
    expect(ui.state.flightStudyObservations).toBe(observations); expect(ui.state.flightInvestigation).toBe(investigation);
    expect(ui.state.inquiry).toBe(inquiry); expect(ui.state.flightChallenges).toBe(challenges);
    expect(ui.state.flightWingtipFollowSide).toBeUndefined(); expect(ui.state.flightWingtipFollowSourceUuid).toBeUndefined();
  });

  it('retains selection across checkpoints, Mark, Step, orbit, zoom, Check, Restore, Return and Resume', () => {
    const ui = fixture(); ui.follow(0); ui.choose(3); ui.frame(); ui.mark(); expectFollow(ui, 0);
    ui.click(ui.button('Step wingbeat')); ui.frame(); ui.viewpoint('front'); ui.set({ flightStudyZoom: 1.3 }); ui.check(); expectFollow(ui, 0);
    ui.restore(); ui.check(); expectFollow(ui, 0); ui.returnPose(); ui.frame(); ui.check(); expectFollow(ui, 0);
    ui.click(ui.button('Resume flight')); expectFollow(ui, 0);
    ui.set({ flightStudyYaw: 0, flightStudyPitch: 60, isDark: true }); expectFollow(ui, 0);
  });

  it('retains a numbered checkpoint pause owner when changing the followed side', () => {
    const ui = fixture(); ui.choose(5); ui.frame();
    const ownerRef = ui.refs.find(ref => ref.current?.index === 5), owner = ownerRef.current, count = ui.writes.length;
    ui.follow(1); expectFollow(ui, 1); expect(ownerRef.current).toBe(owner); expect(ui.live.flightStudyCyclePosition).toBe(5);
    expect(ui.writes).toHaveLength(count);
  });

  it('clears on path off and does not revive after path on, including a same-batch off/on pair', () => {
    const ui = fixture(); ui.follow(0); ui.path(false);
    expect(ui.followButton(0)).toBeNull(); expect(ui.live.flightWingtipFollowSide).toBeUndefined(); expect(ui.live.flightWingtipFollowSourceUuid).toBeUndefined();
    ui.path(true); expectFollow(ui, undefined); ui.follow(1);
    const toggle = ui.node(node => node.type === 'input' && node.props['aria-describedby'] === ui.host.querySelector('[data-migration-id="migration-wingtip-path-help"]').id);
    act(() => { toggle.props.onChange({ target: { checked: false } }); toggle.props.onChange({ target: { checked: true } }); });
    expectFollow(ui, undefined);
  });

  it('clears when leaving Study and does not revive when returning', () => {
    const ui = fixture(); ui.follow(1); ui.click(ui.button('Chase'));
    expect(ui.followButton(1)).toBeNull(); expect(ui.live.flightWingtipFollowSide).toBeUndefined();
    ui.click(ui.button('Study')); expectFollow(ui, undefined);
  });

  it('clears for changed learner context or rebuilt source and does not revive when values return', () => {
    for (const [changed, restored] of [[{ flightSpecies: 'monarch' }, { flightSpecies: 'canada_goose' }],
      [{ flightStudyBird: 1 }, { flightStudyBird: 0 }], [{ flightFormation: 'solo' }, { flightFormation: 'natural' }],
      [{ flightSeason: 'spring' }, { flightSeason: 'fall' }]]) {
      const ui = fixture(); ui.follow(0); ui.set(changed); expect(ui.live.flightWingtipFollowSide).toBeUndefined();
      ui.set(restored); expectFollow(ui, undefined); ui.dispose();
    }
    const ui = fixture(); ui.follow(1); const uuid = ui.engine.flyers[0].uuid; ui.engine.flyers[0].uuid = 'replacement'; ui.set({});
    expectFollow(ui, undefined); ui.engine.flyers[0].uuid = uuid; ui.set({}); expectFollow(ui, undefined);
  });

  it('rejects a stale legend callback before React has rendered a source change', () => {
    const ui = fixture(); ui.follow(1); const oldLeft = ui.followButton(0), writes = ui.writes.length;
    const recordedSource = ui.live.flightWingtipFollowSourceUuid; ui.engine.flyers[0].uuid = 'replacement'; ui.click(oldLeft);
    expect(ui.writes).toHaveLength(writes); expect(ui.live.flightWingtipFollowSide).toBe(1);
    expect(ui.live.flightWingtipFollowSourceUuid).toBe(recordedSource); expect(recordedSource).not.toBe(ui.engine.flyers[0].uuid);
    ui.set({}); expectFollow(ui, undefined);
  });

  it('clears directly through the real context-loss listener and stays cleared after readiness returns', () => {
    const ui = fixture(); ui.follow(0); const selectionState = ui.states.find(pair => pair[0]?.side === 0 && pair[0]?.context?.sourceBirdUuid);
    expect(selectionState).toBeTruthy(); const canvas = document.createElement('canvas');
    const stepAckRef = { current: { pending: { manualStep: 20 } } };
    installLoss({ domElement: canvas }, vi.fn(), ui.engine, ui.stage, document.createElement('div'), (_, fallback) => fallback,
      [null, vi.fn()], ui.liveRef, { current: null }, selectionState, stepAckRef);
    const loss = new Event('webglcontextlost', { cancelable: true }); act(() => { canvas.dispatchEvent(loss); });
    expect(stepAckRef.current.pending).toBeNull();
    expect(loss.defaultPrevented).toBe(true); expectFollow(ui, undefined); expect(ui.followButton(0).props.disabled).toBe(true);
    ui.stage.removeAttribute('data-flight-error'); ui.stage.setAttribute('data-flight-ready', 'true'); ui.set({});
    expectFollow(ui, undefined); expect(ui.followButton(0).props.disabled).toBe(false);
  });

  it('starts with both guides after remount and ignores serialized fields with the same names', () => {
    const ui = fixture(); ui.follow(1); const state = ui.state; ui.dispose();
    const remounted = fixture({ ...state, flightWingtipFollowSide: 0, flightWingtipFollowSourceUuid: 'return-bird-0' });
    expectFollow(remounted, undefined);
  });

  it('connects predict-hold-view-explain guidance to existing notes without changing or recording their draft', () => {
    const observations = { drafts: { 'canada_goose:primaries': 'My evidence stays.' }, records: {} };
    const ui = fixture({ flightStudyObservations: observations }); ui.follow(0);
    const activity = ui.host.querySelector('[data-wingtip-follow-activity]');
    expect(activity.textContent).toContain('Predict where one tip'); expect(activity.textContent).toContain('Hold the pose');
    expect(activity.textContent).toContain('Front with From above'); expect(activity.textContent).toContain('Both wings and the marked outline stay visible');
    ui.click(ui.node(node => node.props?.['data-study-action'] === 'describe-wing-motion'));
    const note = ui.host.querySelector("[data-migration-id=\"migration-study-observation-note\"]"); expect(note.value).toBe('My evidence stays.');
    expect(ui.host.querySelector("[data-migration-id=\"migration-study-motion-evidence-prompt\"]").textContent).toContain('Distinguish anatomical side from screen side');
    expect(ui.state.flightStudyObservations).toBe(observations); expect(ui.state.flightStudyObservations.records).toEqual({}); expectFollow(ui, 0);
  });
});
