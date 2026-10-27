import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = process.env.MIGRATION_COMPARISON_BREAKDOWN_CANDIDATE || 'stem_lab/stem_tool_migration.js';
const source = fs.readFileSync(path.join(process.cwd(), sourcePath), 'utf8').replace(/\r\n/g, '\n');
function section(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error('Missing comparison-breakdown source: ' + start);
  return source.slice(first, last);
}
const num = new Function(section('  function migrNum(', '  // Sibling of migrNum') + '\nreturn migrNum;')();
const helpers = new Function('migrNum', section('      function migrationStudyCycleContext(', '      function renderFlight3D()') +
  '\nreturn { current: migrationStudyCurrentContext };')(num);
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
  return { host, flyers: Array.from({ length: 9 }, (_, index) => ({ uuid: 'comparison-breakdown-bird-' + index, visible: true,
    position: { y: 0 }, rotation: { z: 0 }, userData: { phase: 1.19 + index * .29, flapRate: 5.3 + index * .11, baseY: 1, applyWingPhase: vi.fn() } })),
    time: 2.37, wingStepSerial: 14, wingStepPhase: 1.1, contextLost: false,
    speciesId: 'canada_goose', formationMode: 'natural', season: 'fall',
    markedWingPose: pose, wingtipPath: { invalidate: vi.fn() }, ...values };
}
function fixture(seed = {}) {
  let state = { tab: 'flight3d', flightCamera: 'study', flightPaused: true, flightStudyObservationOpen: true,
    flightStudyRegion: 'inner-wing', flightShowAnatomy: true, flightShowWingtipPath: true, flightWingStep: 14,
    flightStudyYaw: 35, flightStudyPitch: 15, flightStudyZoom: 1, ...seed }, tree, refresh, renders = 0;
  const refs = [], writes = [], announce = vi.fn(), awardXP = vi.fn();
  const tracedReact = { ...React, useRef(value) {
    const ref = React.useRef(value); if (!refs.includes(ref)) refs.push(ref); return ref;
  } };
  const ctx = makeCtx({ React: tracedReact, announceToSR: announce, awardXP,
    update: (_, key, value) => { writes.push({ [key]: value }); state = { ...state, [key]: value }; refresh(value => value + 1); },
    updateMulti: (_, values) => { writes.push(values); state = { ...state, ...values }; refresh(value => value + 1); }
  });
  const host = document.createElement('div'); document.body.append(host);
  const root = ReactDOMClient.createRoot(host); mounts.push(root);
  function Component() { renders++; refresh = React.useState(0)[1]; ctx.toolData = { migration: state }; tree = tool.render(ctx); return tree; }
  act(() => { root.render(React.createElement(Component)); });
  const stage = host.querySelector("[data-migration-id=\"migration-flight-stage\"]");
  const engineRef = refs[refs.findIndex(ref => ref.current === stage) + 1];
  const engine = fakeEngine(stage, { speciesId: state.flightSpecies || 'canada_goose', formationMode: state.flightFormation || 'natural',
    season: state.flightSeason || 'fall', wingStepSerial: state.flightWingStep });
  engineRef.current = engine;
  const liveRef = refs.find(ref => ref.current && typeof ref.current === 'object' && 'flightSpeedValues' in ref.current);
  const ui = { host, stage, engine, engineRef, liveRef, writes, announce, awardXP,
    get state() { return state; }, get live() { return liveRef.current; }, get renderCount() { return renders; },
    node(predicate) { return walk(tree, predicate)[0] || null; },
    action(name) { return ui.node(node => node.props?.['data-marked-pose-action'] === name); },
    button(text) { return ui.node(node => node.type === 'button' && node.props.children === text); },
    click(node) { act(() => { node.props.onClick(); }); }, mark() { ui.click(ui.action('mark')); }, check() { ui.click(ui.action('check')); },
    set(values) { act(() => { state = { ...state, ...values }; refresh(value => value + 1); }); },
    frame() { advance(engine, liveRef.current, num); },
    context() { return host.querySelector("[data-migration-id=\"migration-study-current-context\"]"); },
    field() { return host.querySelector("[data-migration-id=\"migration-study-observation-note\"]"); },
    breakdown() { return host.querySelector('[data-marked-comparison-breakdown]'); },
    cue() { return host.querySelector('[data-study-checked-comparison]'); },
    prompt() { return host.querySelector('[data-study-checked-prompt]'); }
  };
  ui.set({}); ui.frame(); return ui;
}
function work() {
  return { flightStudyObservations: { drafts: { 'canada_goose:inner-wing': 'My own prediction and observed evidence.',
    'canada_goose:head': 'My head draft.' }, records: {} },
    flightInvestigation: { prediction: 'Keep my wind prediction.', evidence: 'Keep my evidence.' },
    flightChallenges: { work: { wind: { notes: 'Keep my reasoning.' } } },
    inquiry: { hypothesis: 'Keep my hypothesis.' }, aiExplorerText: 'Keep my research.' };
}
function experiment(ui) {
  return { time: ui.engine.time, serial: ui.engine.wingStepSerial, offset: ui.engine.wingStepPhase,
    pose: JSON.stringify(ui.engine.markedWingPose.userData),
    birds: ui.engine.flyers.map(flyer => ({ uuid: flyer.uuid, y: flyer.position.y, z: flyer.rotation.z,
      phase: flyer.userData.lastRenderedWingPhase, calls: flyer.userData.applyWingPhase.mock.calls.length })) };
}

function recordedWork() {
  const seed = work();
  seed.flightStudyObservations.records['canada_goose:inner-wing'] = { speciesId: 'canada_goose', region: 'inner-wing',
    note: 'Keep my earlier recorded wing evidence.', bird: 0, yaw: 35, pitch: 15, zoom: 1, wingStep: 4, paused: true, motionReduced: true };
  return seed;
}
function snapshot(ui) {
  return { state: ui.state, text: JSON.stringify(ui.state), model: experiment(ui),
    field: ui.field(), value: ui.field().value,
    selection: [ui.field().selectionStart, ui.field().selectionEnd, ui.field().selectionDirection] };
}
function expectPreserved(ui, before) {
  expect(ui.state).toBe(before.state); expect(JSON.stringify(ui.state)).toBe(before.text);
  expect(experiment(ui)).toEqual(before.model); expect(ui.field()).toBe(before.field); expect(ui.field().value).toBe(before.value);
  expect([ui.field().selectionStart, ui.field().selectionEnd, ui.field().selectionDirection]).toEqual(before.selection);
  expect(ui.writes).toEqual([]); expect(ui.awardXP).not.toHaveBeenCalled();
}
function checkBreakdown(ui, kind, view, wing, currentView = 'Current: 35° / 15° · 100%', markedView = 'Marked: 35° / 15° · 100%') {
  const dl = ui.breakdown();
  expect(dl?.tagName).toBe('DL');
  expect(dl.getAttribute('aria-label')).toBe('Checked comparison variables');
  expect(dl.getAttribute('data-marked-comparison-breakdown')).toBe(kind);
  const rows = dl.querySelectorAll(':scope > div');
  expect(rows).toHaveLength(2);
  expect([...dl.querySelectorAll('dt')].map(item => item.textContent)).toEqual(['Selected view settings', 'Wing-cycle position']);
  expect(dl.querySelectorAll('dd')).toHaveLength(2);
  expect(dl.querySelectorAll('[data-marked-comparison-order]')).toHaveLength(1);
  expect(dl.querySelector('[data-marked-comparison-order]').textContent).toBe('Study angle / elevation · zoom');
  expect(dl.querySelector('[data-marked-comparison-variable="view"]').getAttribute('data-comparison-result')).toBe(view);
  expect(dl.querySelector('[data-marked-comparison-variable="wing"]').getAttribute('data-comparison-result')).toBe(wing);
  expect(dl.querySelector('[data-marked-comparison-result="view"]').textContent).toBe(view === 'matches' ? 'Matches' : 'Changed');
  expect(dl.querySelector('[data-marked-comparison-result="wing"]').textContent).toBe(wing === 'matches' ? 'Matches' : 'Changed');
  expect(dl.querySelector('[data-marked-comparison-value="marked-view"]').textContent).toBe(markedView);
  expect(dl.querySelector('[data-marked-comparison-value="current-view"]').textContent).toBe(currentView);
  expect(dl.querySelectorAll('button,input,textarea,select,[contenteditable]')).toHaveLength(0);
  expect(dl.querySelector('[role="status"],[aria-live]')).toBeNull();
  expect(dl.textContent).not.toMatch(/controlled variable|milliseconds|seconds|degrees of wing|grade|score/i);
  return dl;
}

beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; resetStemLab(); tool = loadTool(sourcePath, 'migration'); });
afterEach(async () => {
  await act(async () => { await Promise.resolve(); mounts.splice(0).forEach(root => root.unmount()); });
  document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Read-only breakdown of an explicitly checked migration comparison', () => {
  it('does not infer a breakdown from a ready scene, a marked pose or a selected cycle alone', () => {
    const ui = fixture(work());
    expect(ui.breakdown()).toBeNull(); ui.mark(); expect(ui.breakdown()).toBeNull();
    ui.click(ui.node(node => node.props?.['data-study-cycle-position'] === 2)); ui.frame(); ui.set({});
    expect(ui.breakdown()).toBeNull(); expect(ui.state.flightStudyObservations.records).toEqual({});
    expect(ui.awardXP).not.toHaveBeenCalled();
  });

  it.each([
    { kind: 'same', changeView: false, changeWings: false, view: 'matches', wing: 'matches' },
    { kind: 'wing-only', changeView: false, changeWings: true, view: 'matches', wing: 'changed' },
    { kind: 'view-only', changeView: true, changeWings: false, view: 'changed', wing: 'matches' },
    { kind: 'both', changeView: true, changeWings: true, view: 'changed', wing: 'changed' }
  ])('separates the checked $kind outcomes and preserves authored work, model, view and focus', ({ kind, changeView, changeWings, view, wing }) => {
    const ui = fixture(recordedWork()); ui.mark();
    if (changeView) ui.set({ flightStudyYaw: 90, flightStudyPitch: 30, flightStudyZoom: 1.2 });
    if (changeWings) { ui.click(ui.button('Step wingbeat')); ui.frame(); }
    const field = ui.field(); field.focus(); field.setSelectionRange(3, 21, 'backward');
    const before = snapshot(ui); ui.writes.length = 0; ui.announce.mockClear();
    ui.check();
    checkBreakdown(ui, kind, view, wing, changeView ? 'Current: 90° / 30° · 120%' : undefined);
    expect(document.activeElement).toBe(field); expectPreserved(ui, before);
    expect(ui.state.flightStudyObservations.records['canada_goose:inner-wing'].note).toBe('Keep my earlier recorded wing evidence.');
    expect(ui.live.flightMarkedPose.comparisonCheck.kind).toBe(kind);
    expect(ui.announce).toHaveBeenCalledTimes(1);
    expect(Object.keys(helpers.current(ui.engine, ui.live, null, null)).sort()).toEqual(['cyclePosition', 'followedSide', 'individual', 'region', 'speciesId']);
  });

  it('shows marked and current selected values from the validated check snapshot without inventing a numbered phase', () => {
    const ui = fixture({ ...work(), flightStudyYaw: -125, flightStudyPitch: -10, flightStudyZoom: .65 }); ui.mark();
    ui.set({ flightStudyYaw: 180, flightStudyPitch: 60, flightStudyZoom: 1.6 }); ui.check();
    const dl = checkBreakdown(ui, 'view-only', 'changed', 'matches', 'Current: 180° / 60° · 160%', 'Marked: -125° / -10° · 65%');
    expect(dl.querySelectorAll('[data-study-context-cycle],[data-study-stage-cycle-position],[data-study-cycle-position]')).toHaveLength(0);
    expect(dl.textContent).not.toMatch(/position \d|of 8|radian|phase/i);
  });


  it('uses periodic view equivalence while showing the exact marked and current yaw representations', () => {
    const ui = fixture({ ...work(), flightStudyYaw: 180 }); ui.mark();
    ui.set({ flightStudyYaw: -180 }); ui.check();
    checkBreakdown(ui, 'same', 'matches', 'matches', 'Current: -180° / 15° · 100%', 'Marked: 180° / 15° · 100%');
    expect(ui.live.flightMarkedPose.comparisonCheck.kind).toBe('same');
  });

  it('omits a waiting wing update and requires another explicit Check after the frame is ready', () => {
    const ui = fixture(work()); ui.mark(); ui.click(ui.button('Step wingbeat')); ui.check();
    expect(ui.host.querySelector('[data-marked-comparison-status]').getAttribute('data-marked-comparison-status')).toBe('waiting');
    expect(ui.breakdown()).toBeNull();
    ui.frame(); ui.set({}); expect(ui.breakdown()).toBeNull();
    ui.check(); checkBreakdown(ui, 'wing-only', 'matches', 'changed');
  });

  it.each([
    ['yaw', ui => ui.set({ flightStudyYaw: 90 })],
    ['pitch', ui => ui.set({ flightStudyPitch: 30 })],
    ['zoom', ui => ui.set({ flightStudyZoom: 1.2 })],
    ['manual wing step', ui => ui.click(ui.button('Step wingbeat'))],
    ['Resume', ui => ui.click(ui.button('Resume flight'))],
    ['clear mark', ui => ui.click(ui.action('clear'))]
  ])('omits stale checked rows after %s without writing a learner response', (_, change) => {
    const ui = fixture(work()); ui.mark(); ui.check(); expect(ui.breakdown()).not.toBeNull();
    change(ui); expect(ui.breakdown()).toBeNull();
    expect(ui.field().value).toBe('My own prediction and observed evidence.');
    expect(ui.state.flightStudyObservations.records).toEqual({}); expect(ui.awardXP).not.toHaveBeenCalled();
  });

  it.each([
    ['source replacement', ui => { ui.engine.flyers[0].uuid = 'replacement-breakdown-source'; }],
    ['replaced capture version', ui => { ui.engine.markedWingPose.userData.captureVersion++; }],
    ['tampered outcome', ui => { ui.live.flightMarkedPose.comparisonCheck.kind = 'both'; }],
    ['unready host', ui => { ui.stage.setAttribute('data-flight-ready', 'false'); }],
    ['lost context', ui => { ui.engine.contextLost = true; ui.stage.setAttribute('data-flight-error', 'true'); }]
  ])('revalidates %s during rendering and omits the old readout', (_, change) => {
    const ui = fixture(work()); ui.mark(); ui.check(); expect(ui.breakdown()).not.toBeNull();
    const field = ui.field(); field.focus(); field.setSelectionRange(4, 17, 'forward');
    const state = ui.state, text = JSON.stringify(state); ui.writes.length = 0;
    change(ui); const model = experiment(ui); ui.set({});
    expect(ui.breakdown()).toBeNull(); expect(ui.field()).toBe(field); expect(document.activeElement).toBe(field);
    expect([field.selectionStart, field.selectionEnd, field.selectionDirection]).toEqual([4, 17, 'forward']);
    expect(JSON.stringify(ui.state)).toBe(text); expect(experiment(ui)).toEqual(model); expect(ui.writes).toEqual([]);
    expect(ui.state.flightStudyObservations).toBe(state.flightStudyObservations);
  });

  it('does not revive a checked breakdown just because selected settings return to previous values', () => {
    const ui = fixture(work()); ui.mark(); ui.check(); expect(ui.breakdown()).not.toBeNull();
    ui.set({ flightStudyYaw: 90 }); ui.set({ flightStudyYaw: 35 }); expect(ui.breakdown()).toBeNull();
    ui.check(); checkBreakdown(ui, 'same', 'matches', 'matches');
  });

  it('uses whole-insect comparison language for Monarch without bird anatomy or automatic recording', () => {
    const ui = fixture({ flightSpecies: 'monarch', flightShowWingtipPath: false, flightShowAnatomy: false,
      flightStudyObservations: { drafts: { 'monarch:whole-wing': 'My butterfly wing evidence.' }, records: {} } });
    ui.mark(); ui.set({ flightStudyPitch: 30 }); ui.check();
    const dl = checkBreakdown(ui, 'view-only', 'changed', 'matches', 'Current: 35° / 30° · 100%');
    expect(dl.textContent).not.toMatch(/bird|feather|primary|wingbeat rate/i);
    expect(ui.field().value).toBe('My butterfly wing evidence.'); expect(ui.state.flightStudyObservations.records).toEqual({});
    expect(ui.host.querySelector('[data-study-anatomy-focus]')).toBeNull(); expect(ui.awardXP).not.toHaveBeenCalled();
  });

  it('renders wrapping semantic rows with text outcomes rather than a color-only cue', () => {
    const ui = fixture(work()); ui.mark(); ui.check();
    const dl = checkBreakdown(ui, 'same', 'matches', 'matches');
    const rows = [...dl.children], values = [...dl.querySelectorAll('dd > span')];
    expect(getComputedStyle(dl).display).toBe('flex'); expect(getComputedStyle(dl).flexDirection).toBe('column');
    expect(rows.every(row => parseFloat(getComputedStyle(row).minWidth) === 0)).toBe(true);
    expect(values.every(value => getComputedStyle(value).display === 'block')).toBe(true);
    expect([...dl.querySelectorAll('dd')].every(value => getComputedStyle(value).overflowWrap === 'anywhere')).toBe(true);
    expect(dl.textContent).toContain('Matches'); expect(dl.querySelectorAll('[role="img"],canvas,svg')).toHaveLength(0);
  });
});
