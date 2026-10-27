import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const mounts = [];
let tool;
const props = node => node[Object.keys(node).find(key => key.startsWith('__reactProps$'))];
const message = 'Whole model fitted. Study angle and wing pose are unchanged.';
async function fixture(seed = {}, options = {}) {
  let state = { tab: 'flight3d', flightCamera: 'study', flightPaused: true, flightSpecies: 'canada_goose',
    flightStudyYaw: 115, flightStudyPitch: 0, flightStudyZoom: 1.6, flightStudyBird: 0, flightWingStep: 19,
    flightShowAnatomy: false, flightShowWingtipPath: false, flightStudyRegion: 'inner-wing',
    flightStudyObservationOpen: false, ...seed }, refresh;
  const refs = [], writes = [], queued = [], announce = vi.fn();
  const tracedReact = { ...React, useRef(value) { const ref = React.useRef(value); if (!refs.includes(ref)) refs.push(ref); return ref; } };
  const write = patch => {
    writes.push(patch);
    if (options.delayZoom && 'flightStudyZoom' in patch) { queued.push(patch); return; }
    state = { ...state, ...patch }; refresh(n => n + 1);
  };
  const ctx = makeCtx({ React: tracedReact, announceToSR: announce,
    update: (_, key, value) => write({ [key]: value }), updateMulti: (_, patch) => write(patch) });
  const host = document.createElement('div'); document.body.append(host);
  const root = ReactDOMClient.createRoot(host); mounts.push(root);
  function Component() { refresh = React.useState(0)[1]; ctx.toolData = { migration: state }; return tool.render(ctx); }
  act(() => root.render(React.createElement(Component)));
  const stage = host.querySelector("[data-migration-id=\"migration-flight-stage\"]");
  const engineRef = refs[refs.findIndex(ref => ref.current === stage) + 1];
  const engine = { host: stage, speciesId: state.flightSpecies, formationMode: 'natural', season: 'fall',
    time: 1.3, wingStepSerial: state.flightWingStep, wingStepPhase: .7, contextLost: false,
    flyers: Array.from({ length: 11 }, (_, index) => ({ uuid: 'fit-bird-' + index, visible: true,
      position: { y: 0 }, rotation: { z: 0 }, userData: { phase: .2 + index * .1, flapRate: 4.2, baseY: 1, applyWingPhase: vi.fn() } })),
    markedWingPose: { userData: { captured: false, captureVersion: 0 }, clearPose: vi.fn() }, wingtipPath: { invalidate: vi.fn() } };
  const liveRef = refs.find(ref => ref.current && typeof ref.current === 'object' && 'flightSpeedValues' in ref.current);
  const ui = { host, stage, engine, engineRef, liveRef, writes, queued, announce,
    get state() { return state; }, get live() { return liveRef.current; },
    strip: () => host.querySelector('[data-scene-study-actions]'),
    fit: () => host.querySelector('[data-scene-study-action="fit"]'),
    zoom: () => host.querySelector('[data-scene-study-zoom]'),
    note: () => host.querySelector("[data-migration-id=\"migration-study-observation-note\"]"),
    click() { act(() => { ui.fit().focus(); ui.fit().click(); }); },
    set(patch) { act(() => { state = { ...state, ...patch }; refresh(n => n + 1); }); },
    choose(index) { act(() => host.querySelector('[data-study-cycle-position="' + index + '"]').click()); },
    flush() { act(() => { state = { ...state, ...queued.shift() }; refresh(n => n + 1); }); }
  };
  await act(async () => { engineRef.current = options.deferReady ? null : engine;
    stage.setAttribute('data-flight-ready', options.deferReady ? 'false' : 'true');
    state = { ...state }; refresh(n => n + 1); await Promise.resolve(); });
  return ui;
}
function authored() { return {
  flightStudyObservations: { drafts: { 'canada_goose:inner-wing': 'Keep my unfinished observation.' }, records: {}, comparison: { draft: 'Keep my comparison.' } },
  flightInvestigation: { prediction: 'Keep my prediction.', trials: [] }, inquiry: { hypothesis: 'Keep my hypothesis.' }
}; }
function pose(ui) { return { time: ui.engine.time, phase: ui.engine.wingStepPhase, serial: ui.engine.wingStepSerial,
  sources: ui.engine.flyers.map(bird => bird.uuid), bodies: ui.engine.flyers.map(bird => [bird.position.y, bird.rotation.z]),
  mark: JSON.stringify(ui.engine.markedWingPose.userData), cycle: ui.host.querySelector('[data-scene-study-cycle]')?.textContent };
}
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); resetStemLab(); tool = loadTool('stem_lab/stem_tool_migration.js', 'migration'); });
afterEach(() => { act(() => mounts.splice(0).forEach(root => root.unmount())); window.dispatchEvent(new Event('blur')); document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Fit the migration Study model without restarting the observation', () => {
  it('places a named 44px native fit control directly beside the scene even when notes and paths are off', async () => {
    const ui = await fixture(), button = ui.fit();
    expect(ui.strip().previousElementSibling).toBe(ui.stage); expect(button.tagName).toBe('BUTTON'); expect(button.type).toBe('button');
    expect(button.textContent).toBe('Fit whole model'); expect(button.disabled).toBe(false); expect(getComputedStyle(button).minHeight).toBe('44px');
    expect(button.getAttribute('aria-controls')).toBe(ui.host.querySelector('[data-migration-id="migration-flight-stage"]').id); expect(button.getAttribute('aria-describedby')).toBe(ui.host.querySelector('[data-migration-id="migration-study-fit-help"]').id);
    expect(ui.host.querySelector("[data-migration-id=\"migration-study-fit-help\"]").textContent).toBe('100% fits the whole model at this angle. Fitted models do not share a physical size scale.');
    expect(ui.zoom().textContent).toBe('Zoom: 160% of fitted view'); expect(ui.writes).toEqual([]);
  });
  it.each([.65, 1.15, 1.6])('fits from zoom %s by changing only zoom while retaining cycle, geometry and work', async zoom => {
    const ui = await fixture({ flightStudyZoom: zoom, flightShowWingtipPath: true, ...authored() }); ui.choose(2);
    const before = JSON.parse(JSON.stringify(ui.state)), frozen = pose(ui), button = ui.fit(); ui.writes.length = 0; ui.announce.mockClear();
    ui.click(); expect(ui.state).toEqual({ ...before, flightStudyZoom: 1 }); expect(ui.live.flightStudyZoom).toBe(1);
    expect(ui.writes).toEqual([{ flightStudyZoom: 1 }]); expect(pose(ui)).toEqual(frozen); expect(ui.fit()).toBe(button); expect(document.activeElement).toBe(button);
    expect(ui.zoom().textContent).toBe('Zoom: 100% of fitted view'); expect(ui.host.querySelector('[data-scene-feedback]').textContent).toBe(message);
    expect(ui.engine.markedWingPose.clearPose).not.toHaveBeenCalled(); expect(ui.engine.wingtipPath.invalidate).not.toHaveBeenCalled();
  });
  it('preserves the actual draft textarea, value and selection when fitting', async () => {
    const ui = await fixture({ flightStudyObservationOpen: true, ...authored() }), field = ui.note();
    field.focus(); field.setSelectionRange(5, 12); const notebook = JSON.stringify(ui.state.flightStudyObservations); ui.click();
    expect(ui.note()).toBe(field); expect(field.value).toBe('Keep my unfinished observation.'); expect([field.selectionStart, field.selectionEnd]).toEqual([5, 12]);
    expect(JSON.stringify(ui.state.flightStudyObservations)).toBe(notebook); expect(document.activeElement).toBe(ui.fit());
  });
  it('announces an already fitted view without writing a redundant update', async () => {
    const ui = await fixture({ flightStudyZoom: 1 }), before = ui.state; ui.click(); ui.click();
    expect(ui.state).toBe(before); expect(ui.writes).toEqual([]); expect(ui.host.querySelector('[data-scene-feedback]').textContent).toBe(message);
  });
  it('updates live zoom immediately and does not duplicate a delayed host write', async () => {
    const ui = await fixture({}, { delayZoom: true }); ui.click();
    expect(ui.state.flightStudyZoom).toBe(1.6); expect(ui.live.flightStudyZoom).toBe(1); ui.click();
    expect(ui.writes).toEqual([{ flightStudyZoom: 1 }]); expect(ui.queued).toHaveLength(1); ui.flush();
    expect(ui.zoom().textContent).toBe('Zoom: 100% of fitted view');
  });
  it('enables on scene readiness and disables on context loss without changing learner work', async () => {
    const ui = await fixture({ ...authored() }, { deferReady: true }); expect(ui.fit().disabled).toBe(true);
    await act(async () => { ui.engineRef.current = ui.engine; ui.stage.setAttribute('data-flight-ready', 'true'); await Promise.resolve(); });
    expect(ui.fit().disabled).toBe(false);
    await act(async () => { ui.engine.contextLost = true; ui.stage.setAttribute('data-flight-error', 'true'); await Promise.resolve(); });
    expect(ui.fit().disabled).toBe(true); expect(ui.writes).toEqual([]);
  });
  it.each([
    ['disconnected strip', ui => ui.strip().remove()],
    ['changed live camera', ui => { ui.live.flightCamera = 'chase'; }],
    ['lost scene context', ui => { ui.engine.contextLost = true; }],
    ['replaced strip', ui => { const old = ui.strip(); old.replaceWith(old.cloneNode(true)); }]
  ])('rejects a retained handler after %s', async (_, invalidate) => {
    const ui = await fixture(), button = ui.fit(), retained = props(button).onClick; invalidate(ui);
    const before = JSON.stringify(ui.state); act(() => retained({ currentTarget: button }));
    expect(JSON.stringify(ui.state)).toBe(before); expect(ui.writes).toEqual([]); expect(ui.live.flightStudyZoom).toBe(1.6);
  });
  it('cancels an unfinished orbit preview so pointer release cannot overwrite the preserved angle', async () => {
    const ui = await fixture(), canvas = document.createElement('canvas'); ui.stage.append(canvas);
    let captured = null; const stageProps = props(ui.stage);
    ui.stage.setPointerCapture = id => { captured = id; }; ui.stage.hasPointerCapture = id => id === captured;
    ui.stage.releasePointerCapture = () => { captured = null; };
    const event = patch => ({ pointerId: 1, isPrimary: true, button: 0, clientX: 100, clientY: 100,
      target: canvas, currentTarget: ui.stage, preventDefault() {}, ...patch });
    act(() => { stageProps.onPointerDown(event()); stageProps.onPointerMove(event({ clientX: 180, clientY: 140 })); });
    expect(captured).toBe(1); expect(ui.stage.getAttribute('data-study-dragging')).toBe('true'); ui.click();
    act(() => stageProps.onPointerUp(event({ clientX: 180, clientY: 140 })));
    expect(captured).toBeNull(); expect(ui.stage.hasAttribute('data-study-dragging')).toBe(false);
    expect(ui.state).toMatchObject({ flightStudyYaw: 115, flightStudyPitch: 0, flightStudyZoom: 1 }); expect(ui.writes).toEqual([{ flightStudyZoom: 1 }]);
  });
  it('cancels a pending marked-view restoration while leaving its captured pose intact', async () => {
    const ui = await fixture({}, { delayZoom: true }), intent = { view: { yaw: 90, pitch: 10, zoom: 1.4 } };
    ui.live.flightMarkedPose = { captured: true, phase: .72, capturedView: { yaw: 90, pitch: 10, zoom: 1.4 }, viewRestoreIntent: intent, comparisonCheck: { valid: true } };
    ui.live.flightViewRestorePending = true; ui.click();
    expect(ui.live.flightMarkedPose).toMatchObject({ captured: true, phase: .72, capturedView: { yaw: 90, pitch: 10, zoom: 1.4 }, viewRestoreIntent: null, comparisonCheck: null });
    expect(ui.live.flightViewRestorePending).toBe(false); expect(ui.engine.markedWingPose.clearPose).not.toHaveBeenCalled();
  });
  it('keeps the fit control absent outside Study and restores it on return', async () => {
    const ui = await fixture(); ui.set({ flightCamera: 'chase' }); expect(ui.fit()).toBeNull();
    ui.set({ flightCamera: 'study' }); expect(ui.fit()).not.toBeNull(); expect(ui.zoom().textContent).toBe('Zoom: 160% of fitted view');
  });
});
