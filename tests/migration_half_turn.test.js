import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const mounts = [];
let tool;
const props = node => node[Object.keys(node).find(key => key.startsWith('__reactProps$'))];
async function fixture(seed = {}, options = {}) {
  let state = { tab: 'flight3d', flightCamera: 'study', flightPaused: true, flightSpecies: 'snow_goose',
    flightStudyYaw: 90, flightStudyPitch: 0, flightStudyZoom: 1.2, flightStudyBird: 0, flightWingStep: 19,
    flightShowAnatomy: false, flightShowWingtipPath: false, flightStudyRegion: 'head',
    flightStudyObservationOpen: false, ...seed }, refresh;
  const refs = [], writes = [], queued = [], announce = vi.fn();
  const tracedReact = { ...React, useRef(value) { const ref = React.useRef(value); if (!refs.includes(ref)) refs.push(ref); return ref; } };
  const write = patch => {
    writes.push(patch);
    if (options.delayYaw && 'flightStudyYaw' in patch) { queued.push(patch); return; }
    state = { ...state, ...patch }; refresh(n => n + 1);
  };
  const ctx = makeCtx({ React: tracedReact, announceToSR: announce,
    update: (_, key, value) => write({ [key]: value }), updateMulti: (_, patch) => write(patch) });
  const host = document.createElement('div'); document.body.append(host);
  const root = ReactDOMClient.createRoot(host); mounts.push(root);
  function Component() { refresh = React.useState(0)[1]; ctx.toolData = { migration: state }; return tool.render(ctx); }
  act(() => root.render(React.createElement(Component)));
  const stage = host.querySelector('#migration-flight-stage');
  const engineRef = refs[refs.findIndex(ref => ref.current === stage) + 1];
  const engine = { host: stage, speciesId: state.flightSpecies, formationMode: 'natural', season: 'fall',
    time: 1.3, wingStepSerial: state.flightWingStep, wingStepPhase: .7, contextLost: false,
    flyers: Array.from({ length: 11 }, (_, index) => ({ uuid: 'turn-bird-' + index, visible: true,
      position: { y: 0 }, rotation: { z: 0 }, userData: { phase: .2 + index * .1, flapRate: 4.2, baseY: 1, applyWingPhase: vi.fn() } })),
    markedWingPose: { userData: { captured: false, captureVersion: 0 }, clearPose: vi.fn() }, wingtipPath: { invalidate: vi.fn() } };
  const liveRef = refs.find(ref => ref.current && typeof ref.current === 'object' && 'flightSpeedValues' in ref.current);
  const ui = { host, stage, engine, engineRef, liveRef, writes, queued, announce,
    get state() { return state; }, get live() { return liveRef.current; },
    strip: () => host.querySelector('[data-scene-study-actions]'),
    turn: () => host.querySelector('[data-scene-study-action="half-turn"]'),
    note: () => host.querySelector('#migration-study-observation-note'),
    click() { act(() => { ui.turn().focus(); ui.turn().click(); }); },
    set(patch) { act(() => { state = { ...state, ...patch }; refresh(n => n + 1); }); },
    choose(index) { act(() => host.querySelector('[data-study-cycle-position="' + index + '"]').click()); },
    flushOne() { act(() => { state = { ...state, ...queued.shift() }; refresh(n => n + 1); }); },
    flush() { act(() => { for (const patch of queued.splice(0)) state = { ...state, ...patch }; refresh(n => n + 1); }); }
  };
  await act(async () => { engineRef.current = options.deferReady ? null : engine;
    stage.setAttribute('data-flight-ready', options.deferReady ? 'false' : 'true');
    state = { ...state }; refresh(n => n + 1); await Promise.resolve(); });
  return ui;
}
function authored() { return {
  flightStudyObservations: { drafts: { 'snow_goose:head': 'Keep my unfinished observation.' }, records: {}, comparison: { draft: 'Keep my comparison.' } },
  flightInvestigation: { prediction: 'Keep my prediction.', trials: [] }, inquiry: { hypothesis: 'Keep my hypothesis.' }
}; }
function pose(ui) { return { time: ui.engine.time, phase: ui.engine.wingStepPhase, serial: ui.engine.wingStepSerial,
  sources: ui.engine.flyers.map(bird => bird.uuid), bodies: ui.engine.flyers.map(bird => [bird.position.y, bird.rotation.z]),
  mark: JSON.stringify(ui.engine.markedWingPose.userData), cycle: ui.host.querySelector('[data-scene-study-cycle]')?.textContent };
}
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); resetStemLab(); tool = loadTool('stem_lab/stem_tool_migration.js', 'migration'); });
afterEach(() => { act(() => mounts.splice(0).forEach(root => root.unmount())); window.dispatchEvent(new Event('blur')); document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Turn the migration Study view without restarting an observation', () => {
  it('provides a named 44px native action and explanatory help beside the scene', async () => {
    const ui = await fixture(), button = ui.turn();
    expect(ui.strip().previousElementSibling).toBe(ui.stage); expect(button.tagName).toBe('BUTTON'); expect(button.type).toBe('button');
    expect(button.textContent).toBe('Turn view 180°'); expect(button.disabled).toBe(false); expect(getComputedStyle(button).minHeight).toBe('44px');
    expect(button.getAttribute('aria-controls')).toBe('migration-flight-stage'); expect(button.getAttribute('aria-describedby')).toBe('migration-study-turn-help');
    expect(ui.host.querySelector('#migration-study-turn-help').textContent).toContain('Pause and choose Profile'); expect(ui.writes).toEqual([]);
  });
  it.each([[90, -90], [-90, 90], [35, -145], [-145, 35], [0, -180], [180, 0], [-180, 0]])('turns %s to %s and returns to the equivalent orientation', async (start, target) => {
    const ui = await fixture({ flightStudyYaw: start, ...authored() }), before = JSON.parse(JSON.stringify(ui.state));
    ui.click(); expect(ui.state).toEqual({ ...before, flightStudyYaw: target }); expect(ui.live.flightStudyYaw).toBe(target);
    expect(ui.writes).toEqual([{ flightStudyYaw: target }]);
    expect(ui.engine.studyHalfTurnSource).toBe(ui.engine.flyers[0].uuid);
    expect(ui.host.querySelector('[data-scene-feedback]').textContent).toBe('View turned 180 degrees. Elevation and zoom are unchanged. Study angle: ' + target + '°.');
    ui.click(); expect(Math.abs(ui.state.flightStudyYaw - start) % 360).toBe(0);
    expect(ui.state).toEqual({ ...before, flightStudyYaw: ui.state.flightStudyYaw });
  });
  it.each([true, false])('preserves playback %s, pose, selected individual, and authored work', async paused => {
    const ui = await fixture({ flightPaused: paused, flightStudyBird: 3, flightStudyPitch: 45, ...authored() });
    const before = JSON.parse(JSON.stringify(ui.state)), frozen = pose(ui), button = ui.turn(); ui.click();
    expect(ui.state).toEqual({ ...before, flightStudyYaw: -90 }); expect(pose(ui)).toEqual(frozen);
    expect(ui.engine.studyHalfTurnSource).toBe(ui.engine.flyers[3].uuid);
    expect(ui.turn()).toBe(button); expect(document.activeElement).toBe(button);
    expect(ui.engine.markedWingPose.clearPose).not.toHaveBeenCalled(); expect(ui.engine.wingtipPath.invalidate).not.toHaveBeenCalled();
  });
  it('retains the selected cycle and actual draft textarea, value, and caret', async () => {
    const ui = await fixture({ flightShowWingtipPath: true, flightStudyObservationOpen: true, ...authored() }); ui.choose(2);
    const field = ui.note(), frozen = pose(ui), before = JSON.parse(JSON.stringify(ui.state));
    field.focus(); field.setSelectionRange(5, 12); ui.writes.length = 0; ui.click();
    expect(ui.state).toEqual({ ...before, flightStudyYaw: -90 }); expect(pose(ui)).toEqual(frozen);
    expect(ui.note()).toBe(field); expect(field.value).toBe('Keep my unfinished observation.'); expect([field.selectionStart, field.selectionEnd]).toEqual([5, 12]);
    expect(ui.writes).toEqual([{ flightStudyYaw: -90 }]);
  });
  it('counts two rapid turns from live yaw even when the host delays persistence', async () => {
    const ui = await fixture({}, { delayYaw: true }); ui.click();
    expect(ui.state.flightStudyYaw).toBe(90); expect(ui.live.flightStudyYaw).toBe(-90); ui.click();
    expect(ui.live.flightStudyYaw).toBe(90); expect(ui.writes).toEqual([{ flightStudyYaw: -90 }, { flightStudyYaw: 90 }]);
    ui.flush(); expect(ui.state.flightStudyYaw).toBe(90); expect(ui.queued).toEqual([]);
  });
  it('retains the pending angle across unrelated host rerenders before its acknowledgment', async () => {
    const ui = await fixture({ ...authored() }, { delayYaw: true }); ui.click();
    ui.set({ flightShowRoute: false });
    expect(ui.state.flightStudyYaw).toBe(90); expect(ui.live.flightStudyYaw).toBe(-90);
    expect(ui.host.querySelector('[aria-label="Study angle in degrees"]').value).toBe('-90');
    expect(ui.engine.studyHalfTurnIntent).toMatchObject({ sourceUuid: ui.engine.flyers[0].uuid, yaw: -90 });
    expect(ui.engine.studyHalfTurnSource).toBe(ui.engine.flyers[0].uuid);
    expect(ui.writes).toEqual([{ flightStudyYaw: -90 }]);
    ui.flushOne(); expect(ui.state.flightStudyYaw).toBe(-90); expect(ui.live.flightStudyYaw).toBe(-90);
    expect(ui.engine.studyHalfTurnIntent).toMatchObject({ yaw: -90 });
  });
  it('keeps the latest of two turns through unrelated rerenders and staggered acknowledgments', async () => {
    const ui = await fixture({ ...authored() }, { delayYaw: true }); ui.click(); ui.set({ flightShowRoute: false }); ui.click();
    ui.set({ flightShowRoute: true });
    expect(ui.state.flightStudyYaw).toBe(90); expect(ui.live.flightStudyYaw).toBe(90);
    expect(ui.engine.studyHalfTurnIntent).toMatchObject({ yaw: 90 });
    expect(ui.writes).toEqual([{ flightStudyYaw: -90 }, { flightStudyYaw: 90 }]);
    ui.flushOne(); expect(ui.state.flightStudyYaw).toBe(-90); expect(ui.live.flightStudyYaw).toBe(90);
    expect(ui.host.querySelector('[aria-label="Study angle in degrees"]').value).toBe('90');
    expect(ui.engine.studyHalfTurnIntent).toMatchObject({ yaw: 90 });
    ui.set({ flightShowRoute: false }); expect(ui.live.flightStudyYaw).toBe(90);
    ui.flushOne(); expect(ui.state.flightStudyYaw).toBe(90); expect(ui.live.flightStudyYaw).toBe(90);
    expect(ui.engine.studyHalfTurnIntent).toMatchObject({ yaw: 90 }); expect(ui.queued).toEqual([]);
    expect(ui.state.flightStudyObservations).toEqual(authored().flightStudyObservations);
  });
  it('keeps the third turn authoritative when repeated angle acknowledgments are ambiguous', async () => {
    const ui = await fixture({}, { delayYaw: true });
    ui.click(); ui.click(); ui.click(); ui.set({ flightShowRoute: false });
    expect(ui.writes).toEqual([{ flightStudyYaw: -90 }, { flightStudyYaw: 90 }, { flightStudyYaw: -90 }]);
    for (const acknowledgedYaw of [-90, 90, -90]) {
      ui.flushOne(); expect(ui.state.flightStudyYaw).toBe(acknowledgedYaw); expect(ui.live.flightStudyYaw).toBe(-90);
      expect(ui.host.querySelector('[aria-label="Study angle in degrees"]').value).toBe('-90');
      expect(ui.engine.studyHalfTurnIntent).toMatchObject({ yaw: -90 });
    }
    expect(ui.queued).toEqual([]);
  });
  it.each([
    ['Profile', ui => ui.host.querySelector('[data-study-viewpoint="profile"]').click(), 90, 10],
    ['angle slider', ui => props(ui.host.querySelector('[aria-label="Study angle in degrees"]')).onChange({ target: { value: '35' } }), 35, 0]
  ])('lets an explicit %s action supersede the optimistic angle and pending snap', async (_, action, yaw, pitch) => {
    const ui = await fixture({}, { delayYaw: true }); ui.click(); ui.set({ flightShowRoute: false });
    expect(ui.live.flightStudyYaw).toBe(-90); act(() => action(ui));
    expect(ui.engine.studyHalfTurnIntent).toBeNull(); expect(ui.engine.studyHalfTurnSource).toBeNull();
    ui.set({ flightShowRoute: true }); expect(ui.live.flightStudyYaw).toBe(90);
    // Once superseded, host ordering governs the queued writes, including the older turn.
    ui.flush(); expect(ui.state).toMatchObject({ flightStudyYaw: yaw, flightStudyPitch: pitch });
    expect(ui.live.flightStudyYaw).toBe(yaw); expect(ui.engine.studyHalfTurnIntent).toBeNull();
  });
  it.each([
    ['camera', ui => Array.from(ui.host.querySelectorAll('button')).find(button => button.textContent === 'Chase').click(), 'flightCamera', 'chase'],
    ['individual', ui => props(ui.host.querySelector('[aria-label="Study individual"]')).onChange({ target: { value: '1' } }), 'flightStudyBird', 1],
    ['species', ui => props(ui.host.querySelector('[aria-label="3D migration focus species"]')).onChange({ target: { value: 'canada_goose' } }), 'flightSpecies', 'canada_goose'],
    ['formation', ui => props(ui.host.querySelector('[aria-label="3D migration flight pattern"]')).onChange({ target: { value: 'solo' } }), 'flightFormation', 'solo'],
    ['season', ui => props(ui.host.querySelector('[aria-label="Migration season and direction"]')).onChange({ target: { value: 'spring' } }), 'flightSeason', 'spring']
  ])('drops a pending half-turn when the learner explicitly changes %s', async (_, action, key, value) => {
    const ui = await fixture({}, { delayYaw: true }); ui.click(); ui.set({ flightShowRoute: false });
    expect(ui.engine.studyHalfTurnIntent).not.toBeNull(); act(() => action(ui));
    expect(ui.state[key]).toBe(value); expect(ui.engine.studyHalfTurnIntent).toBeNull(); expect(ui.engine.studyHalfTurnSource).toBeNull();
    expect(ui.live.flightStudyYaw).toBe(90);
  });
  it('rejects an unrelated host angle rather than replaying the pending half-turn', async () => {
    const ui = await fixture({}, { delayYaw: true }); ui.click(); ui.set({ flightStudyYaw: 35 });
    expect(ui.live.flightStudyYaw).toBe(35); expect(ui.engine.studyHalfTurnIntent).toBeNull(); expect(ui.engine.studyHalfTurnSource).toBeNull();
  });
  it('does not transfer an optimistic turn to a replacement flyer with the same index', async () => {
    const ui = await fixture({}, { delayYaw: true }); ui.click(); ui.engine.flyers[0].uuid = 'replacement-flyer';
    ui.set({ flightShowRoute: false }); expect(ui.live.flightStudyYaw).toBe(90);
    expect(ui.engine.studyHalfTurnIntent).toBeNull(); expect(ui.engine.studyHalfTurnSource).toBeNull();
  });
  it('enables only while the Study scene is ready', async () => {
    const ui = await fixture({ ...authored() }, { deferReady: true }); expect(ui.turn().disabled).toBe(true);
    await act(async () => { ui.engineRef.current = ui.engine; ui.stage.setAttribute('data-flight-ready', 'true'); await Promise.resolve(); });
    expect(ui.turn().disabled).toBe(false);
    await act(async () => { ui.engine.contextLost = true; ui.stage.setAttribute('data-flight-error', 'true'); await Promise.resolve(); });
    expect(ui.turn().disabled).toBe(true); expect(ui.writes).toEqual([]);
  });
  it.each([
    ['disconnected strip', ui => ui.strip().remove()],
    ['changed live camera', ui => { ui.live.flightCamera = 'chase'; }],
    ['lost scene context', ui => { ui.engine.contextLost = true; }],
    ['replaced strip', ui => { const old = ui.strip(); old.replaceWith(old.cloneNode(true)); }],
    ['different live species', ui => { ui.live.flightSpecies = 'canada_goose'; }]
  ])('rejects a retained handler after %s', async (_, invalidate) => {
    const ui = await fixture(), button = ui.turn(), retained = props(button).onClick; invalidate(ui);
    const before = JSON.stringify(ui.state); act(() => retained({ currentTarget: button }));
    expect(JSON.stringify(ui.state)).toBe(before); expect(ui.writes).toEqual([]); expect(ui.live.flightStudyYaw).toBe(90); expect(ui.engine.studyHalfTurnSource).toBeUndefined();
  });
  it('cancels an unfinished orbit before turning and ignores the late pointer release', async () => {
    const ui = await fixture(), canvas = document.createElement('canvas'); ui.stage.append(canvas);
    let captured = null; const stageProps = props(ui.stage);
    ui.stage.setPointerCapture = id => { captured = id; }; ui.stage.hasPointerCapture = id => id === captured;
    ui.stage.releasePointerCapture = () => { captured = null; };
    const event = patch => ({ pointerId: 1, isPrimary: true, button: 0, clientX: 100, clientY: 100,
      target: canvas, currentTarget: ui.stage, preventDefault() {}, ...patch });
    act(() => { stageProps.onPointerDown(event()); stageProps.onPointerMove(event({ clientX: 180, clientY: 140 })); });
    expect(captured).toBe(1); expect(ui.live.flightStudyYaw).not.toBe(90); ui.click();
    act(() => stageProps.onPointerUp(event({ clientX: 180, clientY: 140 })));
    expect(captured).toBeNull(); expect(ui.stage.hasAttribute('data-study-dragging')).toBe(false);
    expect(ui.state).toMatchObject({ flightStudyYaw: -90, flightStudyPitch: 0, flightStudyZoom: 1.2 }); expect(ui.writes).toEqual([{ flightStudyYaw: -90 }]);
  });
  it('cancels pending marked-view restoration while retaining its captured pose', async () => {
    const ui = await fixture({}, { delayYaw: true }), intent = { view: { yaw: 90, pitch: 10, zoom: 1.4 } };
    ui.live.flightMarkedPose = { captured: true, phase: .72, capturedView: { yaw: 90, pitch: 10, zoom: 1.4 }, viewRestoreIntent: intent, comparisonCheck: { valid: true } };
    ui.live.flightViewRestorePending = true; ui.click();
    expect(ui.live.flightMarkedPose).toMatchObject({ captured: true, phase: .72, capturedView: { yaw: 90, pitch: 10, zoom: 1.4 }, viewRestoreIntent: null, comparisonCheck: null });
    expect(ui.live.flightViewRestorePending).toBe(false); expect(ui.engine.markedWingPose.clearPose).not.toHaveBeenCalled();
  });
  it('is absent outside Study and returns with the same view settings', async () => {
    const ui = await fixture(); ui.set({ flightCamera: 'chase' }); expect(ui.turn()).toBeNull();
    ui.set({ flightCamera: 'study' }); expect(ui.turn()).not.toBeNull(); expect(ui.state.flightStudyYaw).toBe(90);
  });
});
