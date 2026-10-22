import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = process.env.MIGRATION_COMPARISON_NAVIGATION_CANDIDATE || 'stem_lab/stem_tool_migration.js';
const source = fs.readFileSync(path.join(process.cwd(), sourcePath), 'utf8').replace(/\r\n/g, '\n');
function section(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error('Missing comparison navigation source: ' + start);
  return source.slice(first, last);
}
const num = new Function(section('  function migrNum(', '  // Sibling of migrNum') + '\nreturn migrNum;')();
const advance = new Function('engineNow', 'live', 'migrNum', section('          var studyBirdIndex =', '          engineNow.flockRoot.position.x'));
const { act } = React;
const mounts = [];
const tau = Math.PI * 2;
const normalize = value => ((value % tau) + tau) % tau;
let tool;

function walk(node, predicate, result = []) {
  if (!node || typeof node !== 'object') return result;
  if (Array.isArray(node)) { node.forEach(child => walk(child, predicate, result)); return result; }
  if (predicate(node)) result.push(node);
  walk(node.props?.children, predicate, result); return result;
}
function fixture(seed = {}) {
  let state = { tab: 'flight3d', flightCamera: 'study', flightPaused: true,
    flightShowWingtipPath: true, flightShowAnatomy: true, flightStudyRegion: 'inner-wing',
    flightStudyObservationOpen: true, flightStudyYaw: 35, flightStudyPitch: 15, flightStudyZoom: 1,
    flightWingStep: 19, ...seed }, refresh, tree, renders = 0;
  const refs = [], writes = [], announce = vi.fn(), awardXP = vi.fn();
  const tracedReact = { ...React, useRef(value) {
    const ref = React.useRef(value); if (!refs.includes(ref)) refs.push(ref); return ref;
  } };
  const ctx = makeCtx({ React: tracedReact, announceToSR: announce, awardXP,
    update: (_, key, value) => { writes.push({ [key]: value }); state = { ...state, [key]: value }; refresh(value => value + 1); },
    updateMulti: (_, patch) => { writes.push(patch); state = { ...state, ...patch }; refresh(value => value + 1); }
  });
  const host = document.createElement('div'); document.body.append(host);
  const root = ReactDOMClient.createRoot(host); mounts.push(root);
  function Component() { renders++; refresh = React.useState(0)[1]; ctx.toolData = { migration: state }; tree = tool.render(ctx); return tree; }
  act(() => { root.render(React.createElement(Component)); });
  const stage = host.querySelector('[id="migration-flight-stage"]');
  const hostIndex = refs.findIndex(ref => ref.current === stage), hostRef = refs[hostIndex], engineRef = refs[hostIndex + 1];
  const pose = { userData: { captured: false, capturedPhase: null, captureVersion: 0, sourceBirdUuid: '' } };
  pose.capturePose = vi.fn((flyer, speciesId, individual) => {
    pose.userData = { captured: true, capturedPhase: Number.isFinite(flyer.userData.lastRenderedWingPhase) ? normalize(flyer.userData.lastRenderedWingPhase) : null,
      captureVersion: pose.userData.captureVersion + 1, sourceBirdUuid: flyer.uuid, speciesId, individual };
    return true;
  });
  pose.clearPose = vi.fn(() => { pose.userData.captured = false; pose.userData.capturedPhase = null; });
  const engine = { host: stage, speciesId: state.flightSpecies || 'canada_goose',
    formationMode: state.flightFormation || 'natural', season: state.flightSeason || 'fall',
    time: 2.37, wingStepSerial: state.flightWingStep, wingStepPhase: 1.1, contextLost: false,
    flyers: Array.from({ length: 11 }, (_, index) => ({ uuid: 'comparison-navigation-bird-' + index, visible: true,
      position: { y: 0 }, rotation: { z: 0 }, userData: { phase: 1.19 + index * .29, flapRate: 5.3 + index * .11, baseY: 1, applyWingPhase: vi.fn() } })),
    markedWingPose: pose, wingtipPath: { invalidate: vi.fn() } };
  engineRef.current = engine; stage.setAttribute('data-flight-ready', 'true');
  const liveRef = refs.find(ref => ref.current && typeof ref.current === 'object' && 'flightSpeedValues' in ref.current);
  const ui = { host, stage, hostRef, engine, engineRef, liveRef, writes, announce, awardXP,
    get state() { return state; }, get live() { return liveRef.current; }, get renderCount() { return renders; },
    node(predicate) { return walk(tree, predicate)[0] || null; },
    action(name) { return ui.node(node => node.props?.['data-marked-pose-action'] === name); },
    clickNode(node) { act(() => { node.props.onClick(); }); },
    mark() { ui.clickNode(ui.action('mark')); }, check() { ui.clickNode(ui.action('check')); },
    set(patch) { act(() => { state = { ...state, ...patch }; refresh(value => value + 1); }); },
    click(element) { act(() => { element.click(); }); }, frame() { advance(engine, liveRef.current, num); },
    context() { return host.querySelector('[id="migration-study-current-context"]'); },
    deck() { return stage.closest('.migration-flight-deck'); },
    card() { return host.querySelector('[id="migration-marked-comparison-controls"]'); },
    checkButton() { return ui.card()?.querySelector('[data-marked-pose-action="check"]'); },
    review() { return host.querySelector('[data-study-action="review-marked-comparison"]'); },
    returnNote() { return ui.card()?.querySelector('[data-study-scene-action="continue-comparison-note"]'); },
    field() { return host.querySelector('[id="migration-study-observation-note"]'); },
    panel() { return host.querySelector('[data-study-observation]'); }
  };
  ui.set({}); ui.frame(); return ui;
}
function work() {
  return { flightStudyObservations: { drafts: { 'canada_goose:inner-wing': 'My prediction and observed evidence.',
    'canada_goose:head': 'My head draft.' }, records: { 'canada_goose:tail': { note: 'Keep my tail evidence.', speciesId: 'canada_goose', region: 'tail' } } },
    flightInvestigation: { prediction: 'Keep my wind prediction.', evidence: 'Keep my flight evidence.' },
    flightChallenges: { work: { wind: { notes: 'Keep my reasoning.' } } },
    inquiry: { hypothesis: 'Keep my hypothesis.' }, aiExplorerText: 'Keep my research.' };
}
function snapshot(ui) {
  return { state: ui.state, stateText: JSON.stringify(ui.state), liveText: JSON.stringify(ui.live),
    clock: ui.engine.time, serial: ui.engine.wingStepSerial, offset: ui.engine.wingStepPhase,
    marked: JSON.stringify(ui.engine.markedWingPose.userData),
    flyers: ui.engine.flyers.map(flyer => ({ uuid: flyer.uuid, y: flyer.position.y, z: flyer.rotation.z,
      phase: flyer.userData.lastRenderedWingPhase, calls: flyer.userData.applyWingPhase.mock.calls.length })) };
}
function expectPreserved(ui, before) {
  expect(ui.state).toBe(before.state); expect(JSON.stringify(ui.state)).toBe(before.stateText);
  expect(JSON.stringify(ui.live)).toBe(before.liveText);
  expect([ui.engine.time, ui.engine.wingStepSerial, ui.engine.wingStepPhase]).toEqual([before.clock, before.serial, before.offset]);
  expect(JSON.stringify(ui.engine.markedWingPose.userData)).toBe(before.marked);
  expect(ui.engine.flyers.map(flyer => ({ uuid: flyer.uuid, y: flyer.position.y, z: flyer.rotation.z,
    phase: flyer.userData.lastRenderedWingPhase, calls: flyer.userData.applyWingPhase.mock.calls.length }))).toEqual(before.flyers);
  expect(ui.engine.markedWingPose.clearPose).not.toHaveBeenCalled(); expect(ui.engine.wingtipPath.invalidate).not.toHaveBeenCalled();
  expect(ui.writes).toEqual([]); expect(ui.awardXP).not.toHaveBeenCalled();
}

beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; resetStemLab(); tool = loadTool(sourcePath, 'migration'); });
afterEach(async () => {
  await act(async () => { await Promise.resolve(); mounts.splice(0).forEach(root => root.unmount()); });
  window.dispatchEvent(new Event('blur')); document.body.innerHTML = '';
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Navigate between the current migration note and explicit marked comparison controls', () => {
  it('offers a native described 44px route only after a valid paused mark exists and keeps the stage return identifier unique', () => {
    const ui = fixture(work()); expect(ui.review()).toBeNull(); ui.mark();
    const button = ui.review();
    expect(button.tagName).toBe('BUTTON'); expect(button.type).toBe('button'); expect(button.disabled).toBe(false);
    expect(button.textContent).toBe('Review marked comparison');
    expect(button.getAttribute('aria-controls')).toBe('migration-marked-comparison-controls');
    expect(button.getAttribute('aria-describedby')).toBe('migration-marked-pose-help');
    expect(getComputedStyle(button).minHeight).toBe('44px'); expect(ui.context().contains(button)).toBe(true);
    expect(ui.card().getAttribute('data-study-marked-pose')).toBe('true');
    expect(ui.host.querySelectorAll('[data-study-scene-action="continue-note"]')).toHaveLength(1);
    expect(ui.card().querySelectorAll('[data-study-scene-action="continue-comparison-note"]')).toHaveLength(1);
    expect(getComputedStyle(ui.returnNote()).minHeight).toBe('44px');
  });

  it('navigates to the existing Check without running it or changing draft, rendered pose, playback, view or work', () => {
    const ui = fixture(work()); ui.mark(); const field = ui.field(), check = ui.checkButton();
    field.focus(); field.setSelectionRange(3, 20, 'backward');
    const focus = vi.spyOn(check, 'focus'), scroll = check.scrollIntoView = vi.fn();
    const before = snapshot(ui), renderCount = ui.renderCount; ui.writes.length = 0; ui.announce.mockClear();
    ui.click(ui.review());
    expect(document.activeElement).toBe(check); expect(ui.checkButton()).toBe(check); expect(ui.field()).toBe(field);
    expect(focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
    expect(scroll).toHaveBeenCalledExactlyOnceWith({ block: 'center', inline: 'nearest', behavior: 'auto' });
    expect(ui.live.flightMarkedPose.comparisonCheck).toBeUndefined();
    expect([field.selectionStart, field.selectionEnd, field.selectionDirection]).toEqual([3, 20, 'backward']);
    expect(ui.renderCount).toBe(renderCount); expect(ui.announce).not.toHaveBeenCalled(); expectPreserved(ui, before);
  });

  it.each([
    { kind: 'same', view: false, step: false },
    { kind: 'wing-only', view: false, step: true },
    { kind: 'view-only', view: true, step: false },
    { kind: 'both', view: true, step: true }
  ])('can review an explicit $kind check without checking again or rewriting learner work', ({ kind, view, step }) => {
    const ui = fixture(work()); ui.mark();
    if (view) ui.set({ flightStudyYaw: 90 });
    if (step) { ui.set({ flightWingStep: 20 }); ui.frame(); }
    ui.check(); expect(ui.live.flightMarkedPose.comparisonCheck.kind).toBe(kind);
    ui.checkButton().scrollIntoView = vi.fn(); const before = snapshot(ui), checked = ui.live.flightMarkedPose.comparisonCheck;
    ui.writes.length = 0; ui.click(ui.review());
    expect(document.activeElement).toBe(ui.checkButton()); expect(ui.live.flightMarkedPose.comparisonCheck).toBe(checked);
    expectPreserved(ui, before);
  });

  it('keeps the route available after a selected view change invalidates the old cue, then requires an explicit recheck', () => {
    const ui = fixture(work()); ui.mark(); ui.check(); ui.set({ flightStudyYaw: 90 });
    expect(ui.host.querySelector('[data-study-checked-comparison]')).toBeNull(); expect(ui.review()).not.toBeNull();
    ui.checkButton().scrollIntoView = vi.fn(); const before = snapshot(ui); ui.writes.length = 0; ui.click(ui.review());
    expect(ui.host.querySelector('[data-study-checked-comparison]')).toBeNull(); expectPreserved(ui, before);
    ui.check(); expect(ui.host.querySelector('[data-study-checked-comparison]').getAttribute('data-study-checked-comparison')).toBe('view-only');
  });

  it('completes note → comparison → explicit Check → continue with the same textarea, caret, draft and recorded evidence', () => {
    const authored = work(), ui = fixture(authored); ui.mark(); ui.set({ flightStudyYaw: 90 });
    const field = ui.field(); field.focus(); field.setSelectionRange(4, 22, 'backward'); field.scrollTop = 12;
    ui.checkButton().scrollIntoView = vi.fn(); ui.click(ui.review()); expect(document.activeElement).toBe(ui.checkButton());
    ui.click(ui.checkButton()); expect(ui.live.flightMarkedPose.comparisonCheck.kind).toBe('view-only');
    const before = snapshot(ui), focus = vi.spyOn(field, 'focus'), scroll = field.scrollIntoView = vi.fn();
    const renders = ui.renderCount; ui.writes.length = 0; ui.announce.mockClear(); ui.click(ui.returnNote());
    expect(document.activeElement).toBe(field); expect(ui.field()).toBe(field); expect(field.value).toBe(authored.flightStudyObservations.drafts['canada_goose:inner-wing']);
    expect(focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
    expect(scroll).toHaveBeenCalledExactlyOnceWith({ block: 'center', inline: 'nearest', behavior: 'auto' });
    expect([field.selectionStart, field.selectionEnd, field.selectionDirection, field.scrollTop]).toEqual([4, 22, 'backward', 12]);
    expect(ui.state.flightStudyObservations).toBe(authored.flightStudyObservations);
    expect(ui.renderCount).toBe(renders); expect(ui.announce).not.toHaveBeenCalled(); expectPreserved(ui, before);
  });

  it('supports Monarch whole-wing notes with bird anatomy and tip paths hidden', () => {
    const observations = { drafts: { 'monarch:whole-wing': 'My butterfly wing evidence.' }, records: {} };
    const ui = fixture({ flightSpecies: 'monarch', flightShowAnatomy: false, flightShowWingtipPath: false, flightStudyObservations: observations });
    ui.mark(); const field = ui.field(); field.focus(); field.setSelectionRange(2, 14);
    const before = snapshot(ui); ui.writes.length = 0; ui.checkButton().scrollIntoView = vi.fn(); field.scrollIntoView = vi.fn();
    ui.click(ui.review()); expect(document.activeElement).toBe(ui.checkButton()); ui.click(ui.returnNote());
    expect(document.activeElement).toBe(field); expect(field.value).toBe('My butterfly wing evidence.');
    expect(ui.returnNote().getAttribute('data-study-note-key')).toBe('monarch:whole-wing');
    expect([field.selectionStart, field.selectionEnd]).toEqual([2, 14]); expectPreserved(ui, before);
  });

  it('scopes both directions to the selected deck when another tool has the same control and field IDs', () => {
    const first = fixture(work()), second = fixture(work()); first.mark(); second.mark();
    first.checkButton().scrollIntoView = vi.fn(); second.checkButton().scrollIntoView = vi.fn();
    first.field().scrollIntoView = vi.fn(); second.field().scrollIntoView = vi.fn();
    second.click(second.review()); expect(document.activeElement).toBe(second.checkButton());
    expect(first.checkButton().scrollIntoView).not.toHaveBeenCalled();
    second.click(second.returnNote()); expect(document.activeElement).toBe(second.field());
    expect(first.field().scrollIntoView).not.toHaveBeenCalled();
  });

  it('focuses the existing Check even where scrollIntoView is unavailable', () => {
    const ui = fixture(work()); ui.mark(); ui.checkButton().scrollIntoView = undefined;
    const before = snapshot(ui); ui.writes.length = 0; expect(() => ui.click(ui.review())).not.toThrow();
    expect(document.activeElement).toBe(ui.checkButton()); expectPreserved(ui, before);
  });

  it.each([
    ['Resume playback', ui => ui.set({ flightPaused: false })],
    ['clear mark', ui => ui.clickNode(ui.action('clear'))],
    ['leave Study', ui => ui.set({ flightCamera: 'chase' })]
  ])('removes the Review route after %s', (_, change) => {
    const ui = fixture(work()); ui.mark(); expect(ui.review()).not.toBeNull(); change(ui); expect(ui.review()).toBeNull();
    expect(ui.field()?.value || ui.state.flightStudyObservations.drafts['canada_goose:inner-wing']).toBe('My prediction and observed evidence.');
  });

  it.each([
    ['source replacement', ui => { ui.engine.flyers[0].uuid = 'replaced-comparison-source'; }, true],
    ['capture replacement', ui => { ui.engine.markedWingPose.userData.captureVersion++; }, true],
    ['context loss', ui => { ui.engine.contextLost = true; }, false],
    ['invalid marked view', ui => { ui.live.flightMarkedPose.capturedView.zoom = NaN; }, true]
  ])('updates eligibility for %s through the existing readiness observer while preserving focus, note and parent', async (_, change, contextReady) => {
    const ui = fixture(work()); ui.mark();
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
    const field = ui.field(); field.focus(); field.setSelectionRange(3, 18, 'backward');
    const state = ui.state, stateText = JSON.stringify(state), renders = ui.renderCount; ui.writes.length = 0;
    await act(async () => { change(ui); ui.stage.setAttribute('data-flight-source-uuid', 'refresh-comparison-navigation'); await Promise.resolve(); });
    expect(ui.review()).toBeNull(); expect(ui.context().getAttribute('data-study-current-context')).toBe(contextReady ? 'ready' : 'unavailable');
    expect(document.activeElement).toBe(field); expect(ui.field()).toBe(field); expect([field.selectionStart, field.selectionEnd, field.selectionDirection]).toEqual([3, 18, 'backward']);
    expect(ui.state).toBe(state); expect(JSON.stringify(ui.state)).toBe(stateText); expect(ui.renderCount).toBe(renders); expect(ui.writes).toEqual([]);
    if (!contextReady) expect(ui.returnNote()).toBeNull();
  });

  it.each([
    ['source replacement', ui => { ui.engine.flyers[0].uuid = 'replacement-before-observer'; }],
    ['capture replaced', ui => { ui.engine.markedWingPose.userData.captureVersion++; }],
    ['lost context', ui => { ui.engine.contextLost = true; }],
    ['unready scene', ui => { ui.stage.setAttribute('data-flight-ready', 'false'); }],
    ['changed engine host', ui => { ui.engine.host = document.createElement('div'); }],
    ['missing engine', ui => { ui.engineRef.current = null; }],
    ['resumed live playback', ui => { ui.live.flightPaused = false; }],
    ['invalid selected view', ui => { ui.live.flightStudyZoom = NaN; }]
  ])('revalidates %s before a retained Review button can focus a stale comparison', async (_, change) => {
    const ui = fixture(work()); ui.mark();
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
    const button = ui.review(), check = ui.checkButton(), field = ui.field(); field.focus();
    const focus = vi.spyOn(check, 'focus'), scroll = check.scrollIntoView = vi.fn(); ui.writes.length = 0; ui.announce.mockClear();
    await act(async () => { change(ui); button.click(); await Promise.resolve(); });
    expect(focus).not.toHaveBeenCalled(); expect(scroll).not.toHaveBeenCalled(); expect(document.activeElement).toBe(field);
    expect(ui.writes).toEqual([]); expect(ui.awardXP).not.toHaveBeenCalled();
    expect(ui.announce).toHaveBeenCalledExactlyOnceWith('Pause a ready Study view with a marked pose, then review the comparison controls.');
  });

  it.each([
    ['disabled Check', (ui, check) => { check.disabled = true; }],
    ['disabled ancestor fieldset', (ui, check) => { const fieldset = document.createElement('fieldset'); fieldset.disabled = true; check.parentNode.append(fieldset); fieldset.append(check); }],
    ['missing Check', (ui, check) => { check.remove(); }],
    ['Check in a nested foreign deck', (ui, check) => { const foreign = document.createElement('div'); foreign.className = 'migration-flight-deck'; ui.card().append(foreign); foreign.append(check); }],
    ['Check in a nested foreign comparison card', (ui, check) => { const foreign = document.createElement('div'); foreign.setAttribute('data-study-marked-pose', 'true'); ui.card().append(foreign); foreign.append(check); }]
  ])('rejects %s rather than focusing or invoking a different comparison action', (_, change) => {
    const ui = fixture(work()); ui.mark(); const button = ui.review(), check = ui.checkButton(), field = ui.field(); field.focus();
    const focus = vi.spyOn(check, 'focus'), scroll = check.scrollIntoView = vi.fn(); const before = snapshot(ui);
    ui.writes.length = 0; ui.announce.mockClear(); change(ui, check); ui.click(button);
    expect(focus).not.toHaveBeenCalled(); expect(scroll).not.toHaveBeenCalled(); expect(document.activeElement).toBe(field);
    expectPreserved(ui, before); expect(ui.announce).toHaveBeenCalledTimes(1);
  });

  it('omits the comparison note-return copy when the note is closed and restores it for the current region when opened', () => {
    const ui = fixture({ ...work(), flightStudyObservationOpen: false }); expect(ui.returnNote()).toBeNull();
    ui.set({ flightStudyObservationOpen: true, flightStudyRegion: 'head' });
    expect(ui.returnNote().getAttribute('data-study-note-key')).toBe('canada_goose:head');
    ui.field().scrollIntoView = vi.fn(); ui.click(ui.returnNote()); expect(document.activeElement).toBe(ui.field());
    expect(ui.field().value).toBe('My head draft.');
  });

  it.each([
    ['closed note', ui => { Object.defineProperty(ui.panel(), 'open', { configurable: true, value: false }); }],
    ['mismatched current note key', ui => { ui.field().setAttribute('data-study-observation-key', 'canada_goose:tail'); }],
    ['missing current note', ui => { ui.field().remove(); }]
  ])('reuses note-return protection for a retained comparison action with %s', async (_, change) => {
    const ui = fixture(work()); ui.mark();
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
    const button = ui.returnNote(), field = ui.field(); ui.checkButton().focus();
    const focus = vi.spyOn(field, 'focus'), scroll = field.scrollIntoView = vi.fn(); ui.writes.length = 0; ui.announce.mockClear();
    change(ui); ui.click(button);
    expect(focus).not.toHaveBeenCalled(); expect(scroll).not.toHaveBeenCalled(); expect(document.activeElement).toBe(ui.checkButton());
    expect(ui.writes).toEqual([]); expect(ui.awardXP).not.toHaveBeenCalled();
    expect(ui.announce).toHaveBeenCalledExactlyOnceWith('Open the current Study observation note, then try again when the scene is ready.');
  });
});
