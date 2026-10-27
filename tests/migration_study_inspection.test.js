import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const mounts = [];
let tool;

// Mount the actual readout and action: focus, keyboard entry, native disabled
// behavior and readiness refresh must work without a settings-store write.
function fixture(seed = {}, options = {}) {
  let state = { tab: 'flight3d', flightCamera: 'study', flightPaused: true,
    flightShowWingtipPath: true, flightShowAnatomy: true, flightStudyRegion: 'inner-wing',
    flightStudyObservationOpen: true, flightWingStep: 19, ...seed }, refresh, renderCount = 0;
  const writes = [], refs = [], announce = vi.fn(), awardXP = vi.fn();
  const tracedReact = { ...React, useRef(value) {
    const ref = React.useRef(value); if (!refs.includes(ref)) refs.push(ref); return ref;
  } };
  const ctx = makeCtx({ React: tracedReact, announceToSR: announce, awardXP,
    update: (_, key, value) => { writes.push({ [key]: value }); state = { ...state, [key]: value }; refresh(value => value + 1); },
    updateMulti: (_, patch) => { writes.push(patch); state = { ...state, ...patch }; refresh(value => value + 1); }
  });
  const host = document.createElement('div'); document.body.append(host);
  const root = ReactDOMClient.createRoot(host); mounts.push(root);
  function Component() {
    renderCount++; refresh = React.useState(0)[1]; ctx.toolData = { migration: state };
    return tool.render(ctx);
  }
  act(() => { root.render(React.createElement(Component)); });
  // Attribute lookup stays local when this test intentionally mounts two
  // equal IDs; jsdom's ID fast path consults the first document-wide match.
  const stage = host.querySelector("[data-migration-id=\"migration-flight-stage\"]");
  const hostIndex = refs.findIndex(ref => ref.current === stage);
  const hostRef = refs[hostIndex], engineRef = refs[hostIndex + 1];
  const pose = { userData: { captured: false, captureVersion: 3 }, clearPose: vi.fn() };
  const engine = { host: stage, speciesId: state.flightSpecies || 'canada_goose',
    formationMode: state.flightFormation || 'natural', season: state.flightSeason || 'fall',
    time: 1.3, wingStepSerial: state.flightWingStep, wingStepPhase: 0.7, contextLost: false,
    flyers: Array.from({ length: 11 }, (_, index) => ({ uuid: 'inspection-bird-' + index, visible: true,
      position: { y: 0 }, rotation: { z: 0 }, userData: { phase: .2 + index * .1, flapRate: 4.2, baseY: 1, applyWingPhase: vi.fn() } })),
    markedWingPose: pose, wingtipPath: { invalidate: vi.fn() } };
  engineRef.current = options.deferReady ? null : engine;
  stage.setAttribute('data-flight-ready', options.deferReady ? 'false' : 'true');
  const liveRef = refs.find(ref => ref.current && typeof ref.current === 'object' && 'flightSpeedValues' in ref.current);
  const ui = { host, stage, hostRef, engine, engineRef, liveRef, writes, announce, awardXP,
    get state() { return state; }, get live() { return liveRef.current; }, get renderCount() { return renderCount; },
    action() { return host.querySelector('[data-study-action="inspect-current-view"]'); },
    field() { return host.querySelector("[data-migration-id=\"migration-study-observation-note\"]"); },
    context() { return host.querySelector("[data-migration-id=\"migration-study-current-context\"]"); },
    click(element = ui.action()) { act(() => { element.click(); }); },
    choose(index) { ui.click(host.querySelector('[data-study-cycle-position="' + index + '"]')); },
    follow(side = 0) { ui.click(host.querySelector('[data-wingtip-follow-side="' + side + '"]')); },
    set(patch) { act(() => { state = { ...state, ...patch }; refresh(value => value + 1); }); }
  };
  ui.set({}); return ui;
}

function snapshot(ui) {
  return { state: ui.state, stateText: JSON.stringify(ui.state), liveText: JSON.stringify(ui.live),
    clock: ui.engine.time, serial: ui.engine.wingStepSerial, phase: ui.engine.wingStepPhase,
    marked: JSON.stringify(ui.engine.markedWingPose.userData),
    flyers: ui.engine.flyers.map(flyer => ({ uuid: flyer.uuid, y: flyer.position.y, z: flyer.rotation.z })) };
}

function expectPreserved(ui, before) {
  expect(ui.state).toBe(before.state); expect(JSON.stringify(ui.state)).toBe(before.stateText);
  expect(JSON.stringify(ui.live)).toBe(before.liveText);
  expect([ui.engine.time, ui.engine.wingStepSerial, ui.engine.wingStepPhase]).toEqual([before.clock, before.serial, before.phase]);
  expect(JSON.stringify(ui.engine.markedWingPose.userData)).toBe(before.marked);
  expect(ui.engine.flyers.map(flyer => ({ uuid: flyer.uuid, y: flyer.position.y, z: flyer.rotation.z }))).toEqual(before.flyers);
  expect(ui.engine.markedWingPose.clearPose).not.toHaveBeenCalled(); expect(ui.engine.wingtipPath.invalidate).not.toHaveBeenCalled();
  expect(ui.writes).toEqual([]); expect(ui.awardXP).not.toHaveBeenCalled();
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; resetStemLab();
  tool = loadTool(process.env.MIGRATION_STUDY_INSPECTION_CANDIDATE || 'stem_lab/stem_tool_migration.js', 'migration');
});
afterEach(() => {
  act(() => { mounts.splice(0).forEach(root => root.unmount()); });
  window.dispatchEvent(new Event('blur')); document.body.innerHTML = '';
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Inspect the current migration Study scene from a learner note', () => {
  it('offers a native, described 44px action beside the current viewing context', () => {
    const ui = fixture(), button = ui.action();
    expect(button.tagName).toBe('BUTTON'); expect(button.type).toBe('button'); expect(button.disabled).toBe(false);
    expect(button.textContent).toBe('Inspect current 3D view');
    expect(button.getAttribute('aria-controls')).toBe(ui.host.querySelector('[data-migration-id="migration-flight-stage"]').id);
    expect(button.getAttribute('aria-describedby')).toBe(ui.host.querySelector('[data-migration-id="migration-study-inspect-help"]').id);
    expect(ui.context().contains(button)).toBe(true);
    expect(ui.host.querySelectorAll("[data-migration-id=\"migration-study-inspect-help\"]")).toHaveLength(1);
    expect(ui.host.querySelector("[data-migration-id=\"migration-study-inspect-help\"]").textContent).toContain('Your view, playback and draft stay as they are.');
    expect(getComputedStyle(button).minHeight).toBe('44px');
  });

  it('returns from a selected-segment draft to the exact live scene without changing the experiment or authoring evidence', () => {
    const observations = { drafts: { 'canada_goose:inner-wing': 'My predicted tip position and my evidence.' },
      records: { 'canada_goose:tail': { note: 'My earlier tail observation.', speciesId: 'canada_goose', region: 'tail' } } };
    const ui = fixture({ flightStudyObservations: observations, flightStudyYaw: 90, flightStudyPitch: 10, flightStudyZoom: 1.25,
      flightInvestigation: { prediction: 'I predict a different screen position.' },
      flightChallenges: { work: { wind: { notes: 'My earlier evidence.' } } } });
    ui.follow(1); ui.choose(2);
    ui.engine.markedWingPose.userData = { captured: true, captureVersion: 3, sourceBirdUuid: ui.engine.flyers[0].uuid };
    const field = ui.field(); field.focus(); ui.action().focus();
    const focus = vi.spyOn(ui.stage, 'focus'), scroll = ui.stage.scrollIntoView = vi.fn();
    ui.writes.length = 0; ui.announce.mockClear(); const before = snapshot(ui), contextText = ui.context().textContent, renderCount = ui.renderCount;
    ui.click();
    expect(document.activeElement).toBe(ui.stage); expect(focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
    expect(scroll).toHaveBeenCalledExactlyOnceWith({ block: 'center', inline: 'nearest', behavior: 'auto' });
    expect(ui.field()).toBe(field); expect(field.value).toBe(observations.drafts['canada_goose:inner-wing']);
    expect(ui.context().textContent).toBe(contextText); expect(ui.renderCount).toBe(renderCount);
    expect(ui.state.flightStudyObservations).toBe(observations); expect(ui.announce).not.toHaveBeenCalled();
    expectPreserved(ui, before);
  });

  it('preserves running playback while returning focus to the current scene', () => {
    const ui = fixture({ flightPaused: false }); ui.stage.scrollIntoView = vi.fn();
    ui.writes.length = 0; const before = snapshot(ui); ui.click();
    expect(document.activeElement).toBe(ui.stage); expect(ui.live.flightPaused).toBe(false); expectPreserved(ui, before);
  });

  it('supports a ready scene with both anatomy and wingtip paths hidden', () => {
    const ui = fixture({ flightShowAnatomy: false, flightShowWingtipPath: false });
    ui.stage.scrollIntoView = vi.fn(); ui.writes.length = 0; const before = snapshot(ui); ui.click();
    expect(ui.action().disabled).toBe(false); expect(document.activeElement).toBe(ui.stage); expectPreserved(ui, before);
  });

  it('supports Monarch whole-wing notes without introducing bird anatomy choices', () => {
    const observations = { drafts: { 'monarch:whole-wing': 'My butterfly wing observation.' }, records: {} };
    const ui = fixture({ flightSpecies: 'monarch', flightStudyObservations: observations }); ui.follow(1); ui.choose(6);
    const beforeText = ui.context().textContent; ui.stage.scrollIntoView = vi.fn(); ui.writes.length = 0; const before = snapshot(ui); ui.click();
    expect(document.activeElement).toBe(ui.stage); expect(ui.field().value).toBe('My butterfly wing observation.');
    expect(ui.context().textContent).toBe(beforeText); expect(beforeText).toContain('Whole-insect wing motion');
    expect(beforeText).not.toContain('Primary feathers'); expectPreserved(ui, before);
  });

  it('focuses this tool instance when an earlier migration instance is mounted', () => {
    const first = fixture(), second = fixture();
    expect(first.stage.id).not.toBe(second.stage.id);
    expect(document.getElementById(first.stage.id)).toBe(first.stage);
    expect(document.getElementById(second.stage.id)).toBe(second.stage);
    first.stage.scrollIntoView = vi.fn(); second.stage.scrollIntoView = vi.fn();
    second.click(); expect(document.activeElement).toBe(second.stage);
    expect(first.stage.scrollIntoView).not.toHaveBeenCalled(); expect(second.stage.scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('can still focus the live scene where scrollIntoView is unavailable', () => {
    const ui = fixture(); ui.stage.scrollIntoView = undefined; ui.writes.length = 0; const before = snapshot(ui);
    expect(() => ui.click()).not.toThrow(); expect(document.activeElement).toBe(ui.stage); expectPreserved(ui, before);
  });

  it('is disabled during late scene bootstrap, then enables on readiness without a settings or parent render', async () => {
    const ui = fixture({}, { deferReady: true }); await act(async () => { await Promise.resolve(); });
    expect(ui.action().disabled).toBe(true); const focus = vi.spyOn(ui.stage, 'focus'); ui.click(); expect(focus).not.toHaveBeenCalled();
    const before = ui.renderCount; ui.writes.length = 0;
    await act(async () => { ui.engineRef.current = ui.engine; ui.stage.setAttribute('data-flight-ready', 'true'); await Promise.resolve(); });
    expect(ui.action().disabled).toBe(false); expect(ui.renderCount).toBe(before); expect(ui.writes).toEqual([]);
    ui.stage.scrollIntoView = vi.fn(); ui.click(); expect(document.activeElement).toBe(ui.stage);
  });

  it('disables after context loss while preserving the current learner note', async () => {
    const ui = fixture({ flightStudyObservations: { drafts: { 'canada_goose:inner-wing': 'Keep my draft.' }, records: {} } });
    await act(async () => { await Promise.resolve(); }); ui.field().focus(); const field = ui.field(), before = ui.renderCount;
    ui.writes.length = 0;
    await act(async () => { ui.engine.contextLost = true; ui.stage.setAttribute('data-flight-error', 'true'); await Promise.resolve(); });
    expect(ui.action().disabled).toBe(true); expect(ui.field()).toBe(field); expect(field.value).toBe('Keep my draft.');
    expect(document.activeElement).toBe(field); expect(ui.renderCount).toBe(before); expect(ui.writes).toEqual([]);
  });

  it.each([
    ['context loss', ui => { ui.engine.contextLost = true; }],
    ['disposed engine', ui => { ui.engine.disposed = true; }],
    ['missing current engine', ui => { ui.engineRef.current = null; }],
    ['missing current host', ui => { ui.hostRef.current = null; }],
    ['different engine host', ui => { ui.engine.host = document.createElement('div'); }],
    ['unready scene', ui => { ui.stage.setAttribute('data-flight-ready', 'false'); }],
    ['scene error', ui => { ui.stage.setAttribute('data-flight-error', 'true'); }],
    ['other current camera', ui => { ui.live.flightCamera = 'chase'; }],
    ['other current tab', ui => { ui.live.tab = 'formation'; }],
    ['different species', ui => { ui.engine.speciesId = 'arctic_tern'; }],
    ['different individual source', ui => { ui.live.flightStudyBird = 99; }],
    ['hidden current individual', ui => { ui.engine.flyers[0].visible = false; }],
    ['invalid current region', ui => { ui.live.flightStudyRegion = 'whole-wing'; }],
    ['nonfinite current time', ui => { ui.engine.time = NaN; }]
  ])('rechecks a retained enabled button after %s without focusing or scrolling stale content', async (_, change) => {
    const ui = fixture(), button = ui.action(), field = ui.field(); field.focus();
    const focus = vi.spyOn(ui.stage, 'focus'), scroll = ui.stage.scrollIntoView = vi.fn();
    expect(button.disabled).toBe(false); ui.writes.length = 0;
    await act(async () => { change(ui); button.click(); await Promise.resolve(); });
    expect(focus).not.toHaveBeenCalled(); expect(scroll).not.toHaveBeenCalled(); expect(document.activeElement).toBe(field);
    expect(ui.writes).toEqual([]); expect(ui.awardXP).not.toHaveBeenCalled();
    expect(ui.announce).toHaveBeenCalledExactlyOnceWith('The current Study scene is not ready. Try again when the 3D view is available.');
  });

  it('allows native scene keyboard controls after navigation, and keeps the authored note intact', () => {
    const observations = { drafts: { 'canada_goose:inner-wing': 'My note before looking again.' }, records: {} };
    const ui = fixture({ flightStudyObservations: observations, flightStudyYaw: 35 }); ui.stage.scrollIntoView = vi.fn();
    ui.click(); expect(document.activeElement).toBe(ui.stage); ui.writes.length = 0;
    act(() => { document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })); });
    expect(ui.writes).toHaveLength(1); expect(ui.writes[0]).toMatchObject({ flightStudyYaw: 45 });
    expect(ui.state.flightStudyObservations).toBe(observations); expect(ui.field().value).toBe('My note before looking again.');
  });
});
