import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = process.env.MIGRATION_COMPONENT_RESTORE_CANDIDATE || 'stem_lab/stem_tool_migration.js';
const source = fs.readFileSync(path.join(process.cwd(), sourcePath), 'utf8').replace(/\r\n/g, '\n');
function section(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error('Missing marked comparison section: ' + start);
  return source.slice(first, last);
}
const num = new Function(section('  function migrNum(', '  // Sibling of migrNum') + '\nreturn migrNum;')();
const helpers = new Function('migrNum', section('      function migrationStudyCycleContext(', '      function renderFlight3D()') +
  '\nreturn { select: selectMigrationMarkedWingPose, matches: migrationStudyMarkedReturnMatches, target: migrationStudyMarkedReturnTarget, cycleMatches: migrationStudyCyclePositionMatches, selectCycle: selectMigrationStudyCyclePosition, frame: migrationStudyComparisonFrame, check: migrationCheckMarkedComparison, checkMatches: migrationStudyComparisonCheckMatches, viewMatches: migrationStudyComparisonViewsMatch, restoreTarget: migrationMarkedViewRestoreTarget, restoreMatches: migrationStudyMarkedViewRestoreMatches, componentTarget: migrationMarkedViewComponentRestoreTarget };')(num);
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
    component(key) { return ui.node(node => node.props?.['data-restore-view-component'] === key); },
    restoreComponent(key) { const button = host.querySelector('[data-restore-view-component="' + key + '"]'); act(() => { ui.component(key).props.onClick({ currentTarget: button }); }); },
    field() { return host.querySelector('#migration-study-observation-note'); },
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

function componentCompared(current = {}, captured = {}) {
  const f = pureFixture();
  Object.assign(f.marked.capturedView, captured);
  helpers.select(f.engine, f.live, f.marked); f.frame();
  Object.assign(f.live, { flightStudyYaw: 90, flightStudyPitch: 30, flightStudyZoom: 1.2 }, current);
  f.marked.comparisonCheck = helpers.check(f.engine, f.live, f.marked);
  f.live.flightMarkedPose = f.marked;
  return f;
}
function partialReady(seed = {}, options = {}, step = false) {
  const ui = fixture({ flightPaused: true, flightStudyYaw: 35, flightStudyPitch: 15, flightStudyZoom: 1, ...seed }, options);
  ui.mark();
  if (step) { ui.click(ui.button('Step wingbeat')); ui.frame(); }
  ui.set({ flightStudyYaw: 90, flightStudyPitch: 30, flightStudyZoom: 1.2 }); ui.check();
  return ui;
}
function freezeIntent(intent, overrides = {}) {
  const result = { ...intent, ...overrides };
  for (const key of ['view', 'checkedView', 'markedView', 'context']) {
    if (result[key] && typeof result[key] === 'object') result[key] = Object.freeze({ ...result[key] });
  }
  return Object.freeze(result);
}
function componentLabels(ui) {
  return [...ui.host.querySelectorAll('[data-restore-view-component]')].map(button => button.textContent);
}

describe('Restore one explicitly checked marked view component', () => {
  it.each([
    ['yaw', { yaw: 35, pitch: 30, zoom: 1.2 }],
    ['pitch', { yaw: 90, pitch: 15, zoom: 1.2 }],
    ['zoom', { yaw: 90, pitch: 30, zoom: 1 }]
  ])('plans an immutable %s tuple and preserves both other exact values', (key, expected) => {
    const f = componentCompared(), checked = f.marked.comparisonCheck;
    const before = { live: { ...f.live }, marked: { ...f.marked }, time: f.engine.time,
      serial: f.engine.wingStepSerial, phase: f.engine.wingStepPhase };
    const intent = helpers.componentTarget(f.engine, f.live, f.marked, checked, key);
    expect(intent).toMatchObject({ component: key, view: expected,
      checkedView: { yaw: 90, pitch: 30, zoom: 1.2 }, markedView: { yaw: 35, pitch: 15, zoom: 1 },
      sourceBirdUuid: 'return-bird-2', captureVersion: 3,
      context: { speciesId: 'canada_goose', individual: 2, formationMode: 'natural', season: 'fall' } });
    for (const value of [intent, intent.view, intent.checkedView, intent.markedView, intent.context]) expect(Object.isFrozen(value)).toBe(true);
    expect(intent.checkedView).not.toBe(checked.view); expect(intent.markedView).not.toBe(checked.markedView);
    expect(helpers.restoreMatches(intent, f.engine, f.live, f.marked)).toBe(true);
    expect(f.live).toEqual(before.live); expect(f.marked).toEqual(before.marked);
    expect({ time: f.engine.time, serial: f.engine.wingStepSerial, phase: f.engine.wingStepPhase })
      .toEqual({ time: before.time, serial: before.serial, phase: before.phase });
  });

  it.each(['phase', 'flightStudyYaw', '', null, undefined, '__proto__'])('rejects unsupported component %s', key => {
    const f = componentCompared();
    expect(helpers.componentTarget(f.engine, f.live, f.marked, f.marked.comparisonCheck, key)).toBeNull();
  });

  it('offers no plan for a matched or periodically equivalent component', () => {
    for (const [key, current, captured] of [
      ['yaw', { flightStudyYaw: 35 }, {}], ['pitch', { flightStudyPitch: 15 }, {}],
      ['zoom', { flightStudyZoom: 1 }, {}], ['yaw', { flightStudyYaw: -180 }, { yaw: 180 }],
      ['zoom', { flightStudyZoom: 1.0000005 }, {}]
    ]) {
      const f = componentCompared(current, captured);
      expect(helpers.componentTarget(f.engine, f.live, f.marked, f.marked.comparisonCheck, key)).toBeNull();
    }
  });

  it.each(['current-small', 'marked-small', 'current-periodic', 'marked-periodic'])
  ('fails closed on %s drift that ordinary comparison still tolerates', drift => {
    const f = componentCompared(drift === 'current-periodic' ? { flightStudyYaw: 180 } : {},
      drift === 'marked-periodic' ? { yaw: 180 } : {});
    const checked = f.marked.comparisonCheck;
    if (drift === 'current-small') f.live.flightStudyZoom += 0.0000005;
    if (drift === 'marked-small') checked.markedView.zoom += 0.0000005;
    if (drift === 'current-periodic') f.live.flightStudyYaw = -180;
    if (drift === 'marked-periodic') checked.markedView.yaw = -180;
    expect(helpers.checkMatches(checked, f.engine, f.live, f.marked)).toBe(true);
    expect(helpers.restoreTarget(f.engine, f.live, f.marked, checked)).not.toBeNull();
    expect(helpers.componentTarget(f.engine, f.live, f.marked, checked, 'pitch')).toBeNull();
  });

  it('rejects stale checks, source, capture, rendered frame, pause and study context', () => {
    for (const mutate of [f => { f.marked.comparisonCheck = { ...f.marked.comparisonCheck }; },
      f => { f.live.flightMarkedPose = { ...f.marked }; }, f => { f.engine.flyers[2].uuid = 'replacement'; },
      f => { f.engine.markedWingPose.userData.captureVersion++; }, f => { f.engine.wingStepPhase += .4; f.frame(); },
      f => { f.live.flightWingStep++; }, f => { f.live.flightPaused = false; }, f => { f.live.flightCamera = 'chase'; },
      f => { f.engine.host.setAttribute('data-flight-error', 'true'); },
      f => { f.engine.contextLost = true; f.engine.host.setAttribute('data-flight-ready', 'false'); }]) {
      const f = componentCompared(), checked = f.marked.comparisonCheck; mutate(f);
      expect(helpers.componentTarget(f.engine, f.live, f.marked, checked, 'pitch')).toBeNull();
    }
  });

  it('rejects malformed partial intents instead of falling back to full restoration', () => {
    const f = componentCompared(), intent = helpers.componentTarget(f.engine, f.live, f.marked, f.marked.comparisonCheck, 'pitch');
    for (const malformed of [null, {}, { ...intent }, freezeIntent(intent, { component: null }),
      freezeIntent(intent, { component: 'phase' }), freezeIntent(intent, { sourceBirdUuid: 'replacement' }),
      freezeIntent(intent, { captureVersion: 4 }), freezeIntent(intent, { context: { ...intent.context, season: 'spring' } }),
      freezeIntent(intent, { view: { ...intent.view, yaw: 35 } }), freezeIntent(intent, { view: { ...intent.view, pitch: 15.0000005 } }),
      freezeIntent(intent, { checkedView: { ...intent.checkedView, zoom: 1 } }),
      freezeIntent(intent, { markedView: { ...intent.markedView, pitch: 15.0000005 } }),
      freezeIntent(intent, { checkedView: { ...intent.checkedView, pitch: 15 } }),
      freezeIntent(intent, { view: { ...intent.view, zoom: NaN } }), freezeIntent(intent, { markedView: null })]) {
      expect(helpers.restoreMatches(malformed, f.engine, f.live, f.marked)).toBe(false);
    }
    expect(helpers.restoreMatches(intent, f.engine, f.live, f.marked)).toBe(true);
    f.engine.time += .5; f.live.flightWingStep++; f.frame();
    expect(helpers.restoreMatches(intent, f.engine, f.live, f.marked)).toBe(true);
    f.engine.markedWingPose.userData.captureVersion++;
    expect(helpers.restoreMatches(intent, f.engine, f.live, f.marked)).toBe(false);
  });

  it('retains legacy full restore ownership without requiring component snapshots', () => {
    const f = componentCompared(), intent = helpers.restoreTarget(f.engine, f.live, f.marked, f.marked.comparisonCheck);
    expect(intent).not.toHaveProperty('component'); expect(Object.isFrozen(intent)).toBe(false);
    expect(helpers.restoreMatches(intent, f.engine, f.live, f.marked)).toBe(true);
  });

  it('places contextual native actions after the two-row read-only DL and before unchanged restore-all', () => {
    const ui = fixture({ flightPaused: true });
    expect(ui.host.querySelector('[data-marked-component-restores]')).toBeNull();
    ui.mark(); ui.check(); expectKind(ui, 'same');
    expect(ui.host.querySelector('[data-marked-component-restores]')).toBeNull();
    ui.click(ui.button('Step wingbeat')); ui.frame(); ui.check(); expectKind(ui, 'wing-only');
    expect(ui.host.querySelector('[data-marked-component-restores]')).toBeNull();
    ui.set({ flightStudyYaw: 90, flightStudyPitch: 30, flightStudyZoom: 1.2 }); ui.check(); expectKind(ui, 'both');
    const dl = ui.host.querySelector('[data-marked-comparison-breakdown]');
    const group = ui.host.querySelector('[data-marked-component-restores]');
    expect(dl.tagName).toBe('DL'); expect(dl.querySelectorAll(':scope > div')).toHaveLength(2);
    expect(dl.querySelectorAll('button,input,textarea,select')).toHaveLength(0);
    expect(dl.nextElementSibling).toBe(group); expect(group.nextElementSibling).toBe(ui.host.querySelector('[data-marked-pose-action="restore-view"]'));
    expect(group.getAttribute('role')).toBe('group'); expect(group.getAttribute('aria-label')).toBe('Restore one marked view setting');
    expect(group.classList.contains('migration-study-scene-buttons')).toBe(true);
    expect(componentLabels(ui)).toEqual(['Restore marked study angle', 'Restore marked elevation', 'Restore marked zoom']);
    for (const button of group.querySelectorAll('button')) {
      expect(button.type).toBe('button'); expect(button.getAttribute('aria-controls')).toBe('migration-flight-stage');
      expect(button.getAttribute('aria-describedby')).toBe('migration-marked-pose-help migration-marked-pose-status');
    }
    expect(source).toMatch(/\.migration-study-scene-buttons button\{[^}]*min-height:44px/);
    expect(ui.action('restore-view').props.children).toBe('Restore marked view settings');
  });

  it.each([
    ['yaw', { flightStudyYaw: 35, flightStudyPitch: 30, flightStudyZoom: 1.2 }],
    ['pitch', { flightStudyYaw: 90, flightStudyPitch: 15, flightStudyZoom: 1.2 }],
    ['zoom', { flightStudyYaw: 90, flightStudyPitch: 30, flightStudyZoom: 1 }]
  ])('atomically restores %s while leaving other view settings and the rendered wing untouched', (key, expected) => {
    const ui = partialReady(), before = { phase: ui.engine.wingStepPhase, serial: ui.engine.wingStepSerial, time: ui.engine.time,
      rendered: ui.engine.flyers[0].userData.lastRenderedWingPhase, version: ui.engine.markedWingPose.userData.captureVersion };
    const count = ui.writes.length; ui.restoreComponent(key);
    expect(ui.writes.slice(count)).toEqual([expected]); expect(ui.state).toMatchObject(expected);
    expect({ phase: ui.engine.wingStepPhase, serial: ui.engine.wingStepSerial, time: ui.engine.time,
      rendered: ui.engine.flyers[0].userData.lastRenderedWingPhase, version: ui.engine.markedWingPose.userData.captureVersion }).toEqual(before);
    expect(ui.cue()).toBeNull(); expect(ui.component(key)).toBeNull();
    ui.check(); expectKind(ui, 'view-only'); expect(ui.component(key)).toBeNull();
  });

  it('offers actions only for changed components and completes a learner-controlled three-step comparison', () => {
    const ui = partialReady({}, {}, true); expectKind(ui, 'both');
    ui.restoreComponent('yaw'); expect(ui.cue()).toBeNull(); expect(componentLabels(ui)).toEqual([]);
    ui.check(); expectKind(ui, 'both'); expect(componentLabels(ui)).toEqual(['Restore marked elevation', 'Restore marked zoom']);
    expect(ui.host.querySelector('[data-marked-view-component="yaw"]')?.getAttribute('data-component-result')).toBe('matches');
    ui.restoreComponent('pitch'); ui.check(); expectKind(ui, 'both'); expect(componentLabels(ui)).toEqual(['Restore marked zoom']);
    ui.restoreComponent('zoom'); expect(ui.cue()).toBeNull(); ui.check(); expectKind(ui, 'wing-only');
    expect(ui.host.querySelector('[data-marked-component-restores]')).toBeNull();
    expect(ui.state).toMatchObject({ flightStudyYaw: 35, flightStudyPitch: 15, flightStudyZoom: 1 });
    ui.returnPose(); ui.frame(); ui.check(); expectKind(ui, 'same');
  });

  it('keeps explicit checking necessary when the restored component was the only view difference', () => {
    const ui = fixture({ flightPaused: true }); ui.mark(); ui.set({ flightStudyYaw: 90 }); ui.check();
    expect(componentLabels(ui)).toEqual(['Restore marked study angle']);
    ui.restoreComponent('yaw'); expect(ui.cue()).toBeNull(); ui.check(); expectKind(ui, 'same');
  });

  it('moves focus to persistent Check before its native action disappears', () => {
    const ui = partialReady(), button = ui.host.querySelector('[data-restore-view-component="pitch"]'); button.focus();
    ui.restoreComponent('pitch'); expect(button.isConnected).toBe(false);
    expect(document.activeElement).toBe(ui.host.querySelector('[data-marked-pose-action="check"]'));
  });

  it('preserves learner drafts, records, note caret, cycle owner and model settings during a partial restore', () => {
    const observations = { drafts: { 'canada_goose:inner-wing': 'My own observation and reasoning.' }, records: {
      'canada_goose:inner-wing': { speciesId: 'canada_goose', region: 'inner-wing', note: 'My previously recorded evidence.', bird: 0,
        yaw: 35, pitch: 15, zoom: 1, wingStep: 4, paused: true, motionReduced: true } } };
    const investigation = { prediction: 'My prediction.', evidence: 'My evidence.' }, inquiry = { hypothesis: 'My hypothesis.' };
    const ui = partialReady({ flightStudyObservationOpen: true, flightStudyRegion: 'inner-wing', flightShowAnatomy: true, flightShowWingtipPath: true,
      flightStudyObservations: observations, flightInvestigation: investigation, inquiry, flightWind: -4, aiExplorerText: 'My research.' });
    ui.choose(3); ui.frame(); ui.check();
    const field = ui.field(); field.focus(); field.setSelectionRange(3, 12, 'backward');
    const before = { field, text: field.value, phase: ui.engine.wingStepPhase, serial: ui.engine.wingStepSerial, time: ui.engine.time,
      birds: ui.engine.flyers.map(bird => ({ phase: bird.userData.lastRenderedWingPhase, calls: bird.userData.applyWingPhase.mock.calls.length,
        y: bird.position.y, z: bird.rotation.z })), cycle: ui.live.flightStudyCyclePosition };
    ui.restoreComponent('zoom');
    expect(ui.field()).toBe(field); expect(field.value).toBe(before.text); expect(document.activeElement).toBe(field);
    expect([field.selectionStart, field.selectionEnd, field.selectionDirection]).toEqual([3, 12, 'backward']);
    expect(ui.state.flightStudyObservations).toBe(observations); expect(ui.state.flightInvestigation).toBe(investigation); expect(ui.state.inquiry).toBe(inquiry);
    expect(ui.state).toMatchObject({ flightWind: -4, aiExplorerText: 'My research.', flightPaused: true });
    expect(ui.live.flightStudyCyclePosition).toBe(before.cycle);
    expect({ phase: ui.engine.wingStepPhase, serial: ui.engine.wingStepSerial, time: ui.engine.time })
      .toEqual({ phase: before.phase, serial: before.serial, time: before.time });
    expect(ui.engine.flyers.map(bird => ({ phase: bird.userData.lastRenderedWingPhase, calls: bird.userData.applyWingPhase.mock.calls.length,
      y: bird.position.y, z: bird.rotation.z }))).toEqual(before.birds);
    expect(ui.cue()).toBeNull();
  });

  it('waits for the full host-acknowledged tuple and requires a fresh explicit check afterward', () => {
    const ui = partialReady({}, { delayView: true }); ui.restoreComponent('pitch');
    expect(ui.queued).toEqual([{ flightStudyYaw: 90, flightStudyPitch: 15, flightStudyZoom: 1.2 }]);
    expect(ui.live).toMatchObject({ flightStudyYaw: 90, flightStudyPitch: 30, flightStudyZoom: 1.2, flightViewRestorePending: true });
    expect(ui.cue()).toBeNull(); ui.set({ flightWind: 3 });
    expect(ui.live.flightViewRestorePending).toBe(true); ui.check(); expectKind(ui, '', 'waiting');
    expect(ui.cue().textContent).toContain('marked view settings to finish updating'); expect(componentLabels(ui)).toEqual([]);
    ui.flushOne(); expect(ui.cue()).toBeNull(); expect(ui.live.flightViewRestorePending).toBe(false);
    expect(ui.live).toMatchObject({ flightStudyYaw: 90, flightStudyPitch: 15, flightStudyZoom: 1.2 });
    ui.check(); expectKind(ui, 'view-only'); expect(componentLabels(ui)).toEqual(['Restore marked study angle', 'Restore marked zoom']);
  });

  it('retains pending component ownership across Step and Return without changing its requested tuple', () => {
    const ui = partialReady({}, { delayView: true }); ui.restoreComponent('zoom'); const intent = ui.live.flightMarkedPose.viewRestoreIntent;
    ui.click(ui.button('Step wingbeat')); ui.frame(); expect(ui.live.flightMarkedPose.viewRestoreIntent).toBe(intent);
    ui.returnPose(); ui.frame(); const owner = ui.refs.find(ref => ref.current?.kind === 'marked-return').current;
    expect(ui.live.flightMarkedPose.viewRestoreIntent).toBe(intent); ui.check(); expectKind(ui, '', 'waiting');
    ui.flushOne(); expect(ui.returnStatus()).toBe('selected'); expect(ui.live.flightMarkedPose.returnIntent).toBe(owner);
    expect(ui.cue()).toBeNull(); ui.check(); expectKind(ui, 'view-only');
  });

  it('consumes each callback once and rejects a retained callback after a fresh check', () => {
    const ui = partialReady(), old = ui.component('yaw'); ui.check(); const count = ui.writes.length;
    ui.click(old); expect(ui.writes).toHaveLength(count);
    const current = ui.component('yaw'); ui.restoreComponent('yaw'); expect(ui.writes).toHaveLength(count + 1);
    ui.click(current); expect(ui.writes).toHaveLength(count + 1);
  });

  it('retained callbacks fail closed on tolerant or periodically equivalent view-snapshot drift', () => {
    for (const drift of ['current-small', 'marked-small', 'current-periodic', 'marked-periodic']) {
      const ui = partialReady();
      if (drift === 'current-periodic') { ui.set({ flightStudyYaw: 180 }); ui.check(); }
      if (drift === 'marked-periodic') { ui.live.flightMarkedPose.capturedView.yaw = 180; ui.check(); }
      const old = ui.component('pitch');
      if (drift === 'current-small') ui.live.flightStudyZoom += .0000005;
      if (drift === 'marked-small') ui.live.flightMarkedPose.comparisonCheck.markedView.zoom += .0000005;
      if (drift === 'current-periodic') ui.live.flightStudyYaw = -180;
      if (drift === 'marked-periodic') ui.live.flightMarkedPose.comparisonCheck.markedView.yaw = -180;
      const count = ui.writes.length; ui.click(old); expect(ui.writes).toHaveLength(count); ui.dispose();
    }
  });

  it('rejects retained callbacks after learner context or source changes', () => {
    for (const mutate of [ui => ui.mark(), ui => ui.click(ui.action('clear')), ui => { ui.engine.flyers[0].uuid = 'replacement'; },
      ui => { ui.engine.markedWingPose.userData.captureVersion++; }, ui => ui.set({ flightCamera: 'chase' }),
      ui => ui.set({ flightPaused: false }),
      ui => { ui.engine.contextLost = true; ui.stage.setAttribute('data-flight-ready', 'false'); }, ui => ui.set({ flightStudyYaw: -90 })]) {
      const ui = partialReady(), old = ui.component('pitch'); mutate(ui); const count = ui.writes.length;
      ui.click(old); expect(ui.writes).toHaveLength(count); ui.dispose();
    }
  });

  it('cancels an active native gesture and pending revisit before issuing the one-component tuple', () => {
    const ui = partialReady(), p = pointer(ui); let props = stageProps(ui);
    act(() => { props.onPointerDown(p.event()); }); expect(p.captured).toBe(7);
    const revisit = ui.refs[ui.refs.indexOf(ui.engineRef) + 3];
    revisit.current = { speciesId: 'canada_goose', bird: 0, wingStep: ui.live.flightWingStep, yaw: 90, pitch: 30, zoom: 1.2 };
    const count = ui.writes.length; ui.restoreComponent('pitch'); expect(p.captured).toBeNull(); expect(revisit.current).toBeNull();
    props = stageProps(ui); act(() => { props.onPointerUp(p.event({ clientX: 240, clientY: 160 })); });
    expect(ui.writes.slice(count)).toEqual([{ flightStudyYaw: 90, flightStudyPitch: 15, flightStudyZoom: 1.2 }]);
  });

  it('lets an explicit slider replace pending component restoration without optimistic camera movement', () => {
    const ui = partialReady({}, { delayView: true }); ui.restoreComponent('pitch');
    expect(ui.live).toMatchObject({ flightStudyPitch: 30, flightViewRestorePending: true });
    act(() => { ui.node(node => node.props?.['aria-label'] === 'Study angle in degrees').props.onChange({ target: { value: '120' } }); });
    expect(ui.live.flightMarkedPose.viewRestoreIntent).toBeNull(); expect(ui.live.flightViewRestorePending).toBe(false);
    expect(ui.live).toMatchObject({ flightStudyYaw: 120, flightStudyPitch: 30, flightStudyZoom: 1.2 }); expect(ui.cue()).toBeNull();
    ui.check(); expectKind(ui, 'view-only');
  });

  it('supports Monarch whole-wing observations with the same explicit view-only learning action', () => {
    const observations = { drafts: { 'monarch:whole-wing': 'My butterfly observations.' }, records: {} };
    const ui = partialReady({ flightSpecies: 'monarch', flightShowAnatomy: false, flightStudyObservationOpen: true,
      flightStudyRegion: 'whole-wing', flightStudyObservations: observations });
    expectKind(ui, 'view-only'); expect(ui.host.querySelector('[data-marked-comparison-breakdown]').textContent).not.toMatch(/feather|bird/);
    ui.restoreComponent('pitch'); expect(ui.state.flightStudyObservations).toBe(observations);
    expect(ui.field().value).toBe('My butterfly observations.'); expect(observations.records).toEqual({});
    expect(ui.cue()).toBeNull(); ui.check(); expectKind(ui, 'view-only');
  });
});
