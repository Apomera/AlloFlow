import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = process.env.MIGRATION_CHECKED_CONTEXT_CANDIDATE || 'stem_lab/stem_tool_migration.js';
const source = fs.readFileSync(path.join(process.cwd(), sourcePath), 'utf8').replace(/\r\n/g, '\n');
function section(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error('Missing checked-context source: ' + start);
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
  return { host, flyers: Array.from({ length: 9 }, (_, index) => ({ uuid: 'checked-context-bird-' + index, visible: true,
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
  const stage = host.querySelector('[id="migration-flight-stage"]');
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
    context() { return host.querySelector('[id="migration-study-current-context"]'); },
    field() { return host.querySelector('[id="migration-study-observation-note"]'); },
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
function expectChecked(ui, kind, summary, prompt) {
  expect(ui.cue()).not.toBeNull(); expect(ui.cue().getAttribute('data-study-checked-comparison')).toBe(kind);
  expect(ui.context().contains(ui.cue())).toBe(true); expect(ui.cue().textContent).toBe('Checked comparison: ' + summary);
  expect(ui.prompt().getAttribute('data-study-checked-prompt')).toBe(kind); expect(ui.prompt().textContent).toBe(prompt);
  expect(ui.cue().querySelectorAll('input,button,textarea,select')).toHaveLength(0);
}

beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; resetStemLab(); tool = loadTool(sourcePath, 'migration'); });
afterEach(async () => {
  await act(async () => { await Promise.resolve(); mounts.splice(0).forEach(root => root.unmount()); });
  document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Validated checked-variable reminder beside the current observation', () => {
  it('never infers or publishes a checked cue just from a ready scene or an explicitly marked pose', () => {
    const ui = fixture(work()); expect(ui.cue()).toBeNull(); expect(ui.prompt()).toBeNull();
    ui.mark(); expect(ui.cue()).toBeNull(); expect(ui.prompt()).toBeNull();
    expect(ui.state.flightStudyObservations.records).toEqual({}); expect(ui.awardXP).not.toHaveBeenCalled();
  });

  it.each([
    { kind: 'same', view: false, step: false,
      summary: 'Selected view settings and wing-cycle position match the mark.',
      prompt: 'Predict one change to make next, then describe what you notice.' },
    { kind: 'wing-only', view: false, step: true,
      summary: 'Selected view settings match the mark; wing-cycle position differs.',
      prompt: 'What visible detail supports your comparison while the selected view settings stayed the same?' },
    { kind: 'view-only', view: true, step: false,
      summary: 'Wing-cycle position matches the mark; selected view settings differ.',
      prompt: 'What visible detail shows how this pose appears with the changed view settings?' },
    { kind: 'both', view: true, step: true,
      summary: 'Selected view settings and wing-cycle position both differ from the mark.',
      prompt: 'Restore either the wings or the marked view settings, check again, then explain your evidence.' }
  ])('shows the explicit $kind check with a question while preserving authored work, settings, pose and focus', ({ kind, view, step, summary, prompt }) => {
    const ui = fixture(work()); ui.mark();
    if (view) ui.set({ flightStudyYaw: 90 });
    if (step) { ui.click(ui.button('Step wingbeat')); ui.frame(); }
    const field = ui.field(); field.focus(); field.setSelectionRange(3, 21, 'backward');
    const state = ui.state, stateText = JSON.stringify(state), before = experiment(ui); ui.writes.length = 0;
    ui.check(); expectChecked(ui, kind, summary, prompt);
    expect(ui.state).toBe(state); expect(JSON.stringify(ui.state)).toBe(stateText); expect(ui.writes).toEqual([]);
    expect(experiment(ui)).toEqual(before); expect(ui.field()).toBe(field); expect(document.activeElement).toBe(field);
    expect([field.selectionStart, field.selectionEnd, field.selectionDirection]).toEqual([3, 21, 'backward']);
    expect(field.value).toBe('My own prediction and observed evidence.'); expect(ui.awardXP).not.toHaveBeenCalled();
    expect(Object.keys(helpers.current(ui.engine, ui.live, null, null)).sort()).toEqual(['cyclePosition', 'followedSide', 'individual', 'region', 'speciesId']);
  });

  it('omits a waiting check and does not promote it when a frame completes without another explicit Check', () => {
    const ui = fixture(work()); ui.mark(); ui.click(ui.button('Step wingbeat')); ui.check();
    expect(ui.host.querySelector('[data-marked-comparison-status]').getAttribute('data-marked-comparison-status')).toBe('waiting');
    expect(ui.cue()).toBeNull(); expect(ui.prompt()).toBeNull();
    ui.frame(); ui.set({}); expect(ui.cue()).toBeNull();
    ui.check(); expect(ui.cue().getAttribute('data-study-checked-comparison')).toBe('wing-only');
  });

  it.each([
    ['orbit', ui => ui.set({ flightStudyYaw: 90 })],
    ['elevation', ui => ui.set({ flightStudyPitch: 30 })],
    ['zoom', ui => ui.set({ flightStudyZoom: 1.2 })],
    ['manual Step', ui => ui.click(ui.button('Step wingbeat'))],
    ['Resume', ui => ui.click(ui.button('Resume flight'))],
    ['clear mark', ui => ui.click(ui.action('clear'))]
  ])('removes the checked note cue after %s instead of presenting the old comparison as current', (_, change) => {
    const ui = fixture(work()); ui.mark(); ui.check(); expect(ui.cue()).not.toBeNull();
    change(ui); expect(ui.cue()).toBeNull(); expect(ui.prompt()).toBeNull();
    expect(ui.field().value).toBe('My own prediction and observed evidence.'); expect(ui.state.flightStudyObservations.records).toEqual({});
  });

  it('requires an explicit recheck even after the learner restores the previous selected settings', () => {
    const ui = fixture(work()); ui.mark(); ui.check();
    ui.set({ flightStudyYaw: 90 }); expect(ui.cue()).toBeNull();
    ui.set({ flightStudyYaw: 35 }); expect(ui.cue()).toBeNull();
    ui.check(); expect(ui.cue().getAttribute('data-study-checked-comparison')).toBe('same');
  });

  it.each([
    ['source replacement', ui => { ui.engine.flyers[0].uuid = 'replacement-source'; }],
    ['capture replaced', ui => { ui.engine.markedWingPose.userData.captureVersion++; }],
    ['tampered checked kind', ui => { ui.live.flightMarkedPose.comparisonCheck.kind = 'both'; }]
  ])('revalidates %s on the existing readiness observer without changing note selection or rendering the tool parent', async (_, change) => {
    const ui = fixture(work()); ui.mark(); ui.check();
    const field = ui.field(); field.focus(); field.setSelectionRange(4, 16, 'forward');
    const state = ui.state, text = JSON.stringify(state), renders = ui.renderCount; ui.writes.length = 0;
    await act(async () => { change(ui); ui.stage.setAttribute('data-flight-source-uuid', 'refresh-checked-context'); await Promise.resolve(); });
    expect(ui.cue()).toBeNull(); expect(ui.prompt()).toBeNull(); expect(ui.context().getAttribute('data-study-current-context')).toBe('ready');
    expect(ui.field()).toBe(field); expect(document.activeElement).toBe(field);
    expect([field.selectionStart, field.selectionEnd, field.selectionDirection]).toEqual([4, 16, 'forward']);
    expect(ui.state).toBe(state); expect(JSON.stringify(ui.state)).toBe(text); expect(ui.writes).toEqual([]); expect(ui.renderCount).toBe(renders);
  });

  it('drops the checked cue on context loss without touching the authored draft or current focus', async () => {
    const ui = fixture(work()); ui.mark(); ui.check(); const field = ui.field(); field.focus(); field.setSelectionRange(2, 11);
    const state = ui.state, renders = ui.renderCount; ui.writes.length = 0;
    await act(async () => { ui.engine.contextLost = true; ui.stage.setAttribute('data-flight-error', 'true'); await Promise.resolve(); });
    expect(ui.cue()).toBeNull(); expect(ui.context().getAttribute('data-study-current-context')).toBe('unavailable');
    expect(ui.field()).toBe(field); expect(field.value).toBe('My own prediction and observed evidence.');
    expect(document.activeElement).toBe(field); expect([field.selectionStart, field.selectionEnd]).toEqual([2, 11]);
    expect(ui.state).toBe(state); expect(ui.writes).toEqual([]); expect(ui.renderCount).toBe(renders);
  });

  it('keeps a valid body-and-view check with the current explicitly selected region without replaying its note', () => {
    const ui = fixture(work()); ui.mark(); ui.check(); ui.set({ flightStudyRegion: 'head' });
    expect(ui.cue().getAttribute('data-study-checked-comparison')).toBe('same'); expect(ui.field().value).toBe('My head draft.');
    expect(ui.context().querySelector('[data-study-context-region]').textContent).toBe('Region: Head & bill');
    expect(ui.state.flightStudyObservations.drafts['canada_goose:inner-wing']).toBe('My own prediction and observed evidence.');
  });

  it('uses the same illustrative comparison wording for Monarch whole-wing notes without bird-feather claims', () => {
    const ui = fixture({ flightSpecies: 'monarch', flightShowWingtipPath: false, flightShowAnatomy: false,
      flightStudyObservations: { drafts: { 'monarch:whole-wing': 'My butterfly wing evidence.' }, records: {} } });
    ui.mark(); ui.check(); expect(ui.cue().getAttribute('data-study-checked-comparison')).toBe('same');
    expect(ui.context().textContent).toContain('Whole-insect wing motion'); expect(ui.cue().textContent).not.toMatch(/feather|bird/);
    expect(ui.field().value).toBe('My butterfly wing evidence.'); expect(ui.state.flightStudyObservations.records).toEqual({});
  });

  it('records only the learner’s existing observation fields and leaves the checked cue transient', () => {
    const ui = fixture(work()); ui.mark(); ui.check();
    expect(ui.state.flightStudyObservations.records).toEqual({});
    ui.click(ui.button('Record observation'));
    const record = ui.state.flightStudyObservations.records['canada_goose:inner-wing'];
    expect(record.note).toBe('My own prediction and observed evidence.');
    for (const key of ['checkedComparisonKind', 'comparisonKind', 'comparisonCheck', 'checkedPrompt', 'controlledVariables']) expect(record).not.toHaveProperty(key);
    expect(record).toMatchObject({ speciesId: 'canada_goose', region: 'inner-wing', wingStep: 14, paused: true });
    expect(ui.cue().getAttribute('data-study-checked-comparison')).toBe('same');
  });
});
