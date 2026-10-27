import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const mounts = [];
let tool;

function fixture(seed = {}) {
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
  // Keep this lookup scoped even in the intentionally duplicated-ID fixture.
  const stage = host.querySelector("[data-migration-id=\"migration-flight-stage\"]");
  const hostIndex = refs.findIndex(ref => ref.current === stage);
  const hostRef = refs[hostIndex], engineRef = refs[hostIndex + 1];
  const pose = { userData: { captured: false, captureVersion: 3 }, clearPose: vi.fn() };
  const engine = { host: stage, speciesId: state.flightSpecies || 'canada_goose',
    formationMode: state.flightFormation || 'natural', season: state.flightSeason || 'fall',
    time: 1.3, wingStepSerial: state.flightWingStep, wingStepPhase: 0.7, contextLost: false,
    flyers: Array.from({ length: 11 }, (_, index) => ({ uuid: 'note-return-bird-' + index, visible: true,
      position: { y: 0 }, rotation: { z: 0 }, userData: { phase: .2 + index * .1, flapRate: 4.2, baseY: 1, applyWingPhase: vi.fn() } })),
    markedWingPose: pose, wingtipPath: { invalidate: vi.fn() } };
  engineRef.current = engine; stage.setAttribute('data-flight-ready', 'true');
  const liveRef = refs.find(ref => ref.current && typeof ref.current === 'object' && 'flightSpeedValues' in ref.current);
  const ui = { host, stage, hostRef, engine, engineRef, liveRef, writes, announce, awardXP,
    get state() { return state; }, get live() { return liveRef.current; }, get renderCount() { return renderCount; },
    action() { return host.querySelector('[data-study-scene-action="continue-note"]'); },
    inspect() { return host.querySelector('[data-study-action="inspect-current-view"]'); },
    field() { return host.querySelector("[data-migration-id=\"migration-study-observation-note\"]"); },
    panel() { return host.querySelector('[data-study-observation]'); },
    click(element = ui.action()) { act(() => { element.click(); }); },
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
  tool = loadTool(process.env.MIGRATION_SCENE_NOTE_RETURN_CANDIDATE || 'stem_lab/stem_tool_migration.js', 'migration');
});
afterEach(async () => {
  await act(async () => { await Promise.resolve(); mounts.splice(0).forEach(root => root.unmount()); });
  window.dispatchEvent(new Event('blur')); document.body.innerHTML = '';
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Continue the current observation note from the migration Study scene', () => {
  it('offers a native described 44px action outside the canvas when current notes are open', () => {
    const ui = fixture(), button = ui.action();
    expect(button.tagName).toBe('BUTTON'); expect(button.type).toBe('button'); expect(button.disabled).toBe(false);
    expect(button.textContent).toBe('Continue observation note');
    expect(button.getAttribute('aria-controls')).toBe(ui.host.querySelector('[data-migration-id="migration-study-observation-note"]').id);
    expect(button.getAttribute('aria-describedby')).toBe(ui.host.querySelector('[data-migration-id="migration-study-observation-part"]').id);
    expect(button.getAttribute('data-study-note-key')).toBe('canada_goose:inner-wing');
    expect(ui.stage.contains(button)).toBe(false); expect(getComputedStyle(button).minHeight).toBe('44px');
    expect(ui.host.querySelector("[data-migration-id=\"migration-study-observation-part\"]").textContent).toBe('Inner wing');
  });

  it('completes note → inspect → continue with the same draft, caret, selection and experiment', () => {
    const observations = { drafts: { 'canada_goose:inner-wing': 'My prediction and the evidence I observed.' },
      records: { 'canada_goose:tail': { note: 'Keep my tail evidence.', speciesId: 'canada_goose', region: 'tail' } } };
    const ui = fixture({ flightStudyObservations: observations, flightStudyYaw: 90, flightStudyPitch: 10, flightStudyZoom: 1.25,
      flightInvestigation: { prediction: 'Keep my prediction.' }, flightChallenges: { work: { wind: { notes: 'Keep my reasoning.' } } } });
    const field = ui.field(); field.focus(); field.setSelectionRange(3, 20, 'backward'); field.scrollTop = 12;
    ui.stage.scrollIntoView = vi.fn(); ui.click(ui.inspect()); expect(document.activeElement).toBe(ui.stage);
    const focus = vi.spyOn(field, 'focus'), scroll = field.scrollIntoView = vi.fn();
    const before = snapshot(ui), renderCount = ui.renderCount; ui.writes.length = 0; ui.click();
    expect(document.activeElement).toBe(field); expect(ui.field()).toBe(field);
    expect(focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
    expect(scroll).toHaveBeenCalledExactlyOnceWith({ block: 'center', inline: 'nearest', behavior: 'auto' });
    expect([field.selectionStart, field.selectionEnd, field.selectionDirection, field.scrollTop]).toEqual([3, 20, 'backward', 12]);
    expect(field.value).toBe(observations.drafts['canada_goose:inner-wing']);
    expect(ui.state.flightStudyObservations).toBe(observations); expect(ui.renderCount).toBe(renderCount);
    expect(ui.announce).not.toHaveBeenCalled(); expectPreserved(ui, before);
  });

  it.each(['head', 'inner-wing', 'primaries', 'tail'])('continues the existing %s draft and does not switch the learner’s region', region => {
    const drafts = Object.fromEntries(['head', 'inner-wing', 'primaries', 'tail'].map(id => ['canada_goose:' + id, 'My ' + id + ' draft.']));
    const ui = fixture({ flightStudyRegion: region, flightStudyObservations: { drafts, records: {} } });
    ui.field().scrollIntoView = vi.fn(); const before = snapshot(ui); ui.writes.length = 0; ui.click();
    expect(document.activeElement).toBe(ui.field()); expect(ui.field().value).toBe(drafts['canada_goose:' + region]);
    expect(ui.state.flightStudyRegion).toBe(region); expectPreserved(ui, before);
  });

  it('follows an explicit region change instead of replaying the earlier inspected note', () => {
    const observations = { drafts: { 'canada_goose:inner-wing': 'My inner-wing draft.', 'canada_goose:tail': 'My current tail draft.' }, records: {} };
    const ui = fixture({ flightStudyObservations: observations }); ui.stage.scrollIntoView = vi.fn();
    ui.click(ui.inspect()); ui.set({ flightStudyRegion: 'tail' });
    const before = snapshot(ui); ui.writes.length = 0; ui.field().scrollIntoView = vi.fn(); ui.click();
    expect(document.activeElement).toBe(ui.field()); expect(ui.field().value).toBe('My current tail draft.');
    expect(ui.action().getAttribute('data-study-note-key')).toBe('canada_goose:tail'); expectPreserved(ui, before);
  });

  it('supports Monarch whole-wing notes with path guides hidden and playback running', () => {
    const observations = { drafts: { 'monarch:whole-wing': 'My butterfly wing evidence.' }, records: {} };
    const ui = fixture({ flightSpecies: 'monarch', flightShowWingtipPath: false, flightShowAnatomy: false,
      flightPaused: false, flightStudyObservations: observations });
    ui.field().scrollIntoView = vi.fn(); const before = snapshot(ui); ui.writes.length = 0; ui.click();
    expect(document.activeElement).toBe(ui.field()); expect(ui.field().value).toBe('My butterfly wing evidence.');
    expect(ui.action().getAttribute('data-study-note-key')).toBe('monarch:whole-wing'); expect(ui.live.flightPaused).toBe(false);
    expectPreserved(ui, before);
  });

  it('returns to this deck’s field when another migration instance is mounted', () => {
    const first = fixture(), second = fixture();
    expect(first.field().id).not.toBe(second.field().id);
    expect(document.getElementById(first.field().id)).toBe(first.field());
    expect(document.getElementById(second.field().id)).toBe(second.field());
    first.field().scrollIntoView = vi.fn(); second.field().scrollIntoView = vi.fn(); second.click();
    expect(document.activeElement).toBe(second.field()); expect(first.field().scrollIntoView).not.toHaveBeenCalled();
    expect(second.field().scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('can focus the note where scrollIntoView is unavailable', () => {
    const ui = fixture(); ui.field().scrollIntoView = undefined;
    const before = snapshot(ui); ui.writes.length = 0; expect(() => ui.click()).not.toThrow();
    expect(document.activeElement).toBe(ui.field()); expectPreserved(ui, before);
  });

  it('does not offer the action for closed notes or outside Study', () => {
    const ui = fixture({ flightStudyObservationOpen: false }); expect(ui.action()).toBeNull();
    ui.set({ flightStudyObservationOpen: true, flightCamera: 'chase' }); expect(ui.action()).toBeNull();
  });

  it.each([
    ['lost context', ui => { ui.engine.contextLost = true; }],
    ['different engine host', ui => { ui.engine.host = document.createElement('div'); }],
    ['missing current engine', ui => { ui.engineRef.current = null; }],
    ['unready scene', ui => { ui.stage.setAttribute('data-flight-ready', 'false'); }],
    ['closed note', ui => { Object.defineProperty(ui.panel(), 'open', { configurable: true, value: false }); }],
    ['different displayed note key', ui => { ui.field().setAttribute('data-study-observation-key', 'canada_goose:tail'); }],
    ['missing field', ui => { ui.field().remove(); }]
  ])('rechecks %s before a retained action can focus or scroll a note', async (_, change) => {
    const ui = fixture();
    // Initial details.open schedules a native toggle task. Settle it before
    // changing the guarded state so bootstrap work cannot enter this action’s
    // strict no-write boundary. Readiness mutations below remain synchronous.
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
    const button = ui.action(), field = ui.field(); ui.stage.focus();
    const focus = vi.spyOn(field, 'focus'), scroll = field.scrollIntoView = vi.fn(); ui.writes.length = 0;
    // Readiness can change before the isolated strip has received an observer
    // notification. The native activation must validate the current context.
    await act(async () => { change(ui); button.click(); await Promise.resolve(); });
    expect(focus).not.toHaveBeenCalled(); expect(scroll).not.toHaveBeenCalled(); expect(document.activeElement).toBe(ui.stage);
    expect(ui.writes).toEqual([]); expect(ui.awardXP).not.toHaveBeenCalled();
    expect(ui.announce).toHaveBeenCalledExactlyOnceWith('Open the current Study observation note, then try again when the scene is ready.');
  });
});
