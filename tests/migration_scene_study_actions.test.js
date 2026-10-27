import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const mounts = [];
let tool;
function walk(node, predicate, found = []) {
  if (!node || typeof node !== 'object') return found;
  if (Array.isArray(node)) { node.forEach(child => walk(child, predicate, found)); return found; }
  if (predicate(node)) found.push(node);
  walk(node.props?.children, predicate, found); return found;
}
async function fixture(seed = {}, options = {}) {
  let state = { tab: 'flight3d', flightCamera: 'study', flightPaused: true, flightShowWingtipPath: true,
    flightShowAnatomy: true, flightStudyRegion: 'inner-wing', flightWingStep: 19,
    flightStudyObservationOpen: false, ...seed }, tree, refresh, renderCount = 0;
  const refs = [], writes = [], queued = [], announce = vi.fn();
  const tracedReact = { ...React, useRef(value) {
    const ref = React.useRef(value); if (!refs.includes(ref)) refs.push(ref); return ref;
  } };
  const ctx = makeCtx({ React: tracedReact, announceToSR: announce,
    update: (_, key, value) => {
      writes.push({ [key]: value });
      if (options.delayPause && key === 'flightPaused') { queued.push({ [key]: value }); return; }
      state = { ...state, [key]: value }; refresh(value => value + 1);
    },
    updateMulti: (_, patch) => { writes.push(patch); state = { ...state, ...patch }; refresh(value => value + 1); }
  });
  const host = document.createElement('div'); document.body.append(host);
  const root = ReactDOMClient.createRoot(host); mounts.push(root);
  function Component() { renderCount++; refresh = React.useState(0)[1]; ctx.toolData = { migration: state }; tree = tool.render(ctx); return tree; }
  act(() => { root.render(React.createElement(Component)); });
  const stage = host.querySelector("[data-migration-id=\"migration-flight-stage\"]");
  if (!stage) throw new Error('Expected the native migration stage');
  const engineRef = refs[refs.findIndex(ref => ref.current === stage) + 1];
  const pose = { userData: { captured: false, captureVersion: 0 }, clearPose: vi.fn() };
  const engine = { host: stage, speciesId: state.flightSpecies || 'canada_goose',
    formationMode: state.flightFormation || 'natural', season: state.flightSeason || 'fall',
    time: 1.3, wingStepSerial: state.flightWingStep, wingStepPhase: 0.7, contextLost: false,
    flyers: Array.from({ length: 11 }, (_, index) => ({ uuid: 'scene-study-bird-' + index, visible: true,
      position: { y: 0 }, rotation: { z: 0 }, userData: { phase: .2 + index * .1, flapRate: 4.2, baseY: 1, applyWingPhase: vi.fn() } })),
    markedWingPose: pose, wingtipPath: { invalidate: vi.fn() } };
  const liveRef = refs.find(ref => ref.current && typeof ref.current === 'object' && 'flightSpeedValues' in ref.current);
  const ui = { host, stage, engine, engineRef, liveRef, writes, queued, announce,
    get state() { return state; }, get live() { return liveRef.current; }, get renderCount() { return renderCount; },
    node(predicate) { return walk(tree, predicate)[0] || null; },
    strip() { return host.querySelector('[data-scene-study-actions="true"]'); },
    context() { return host.querySelector('[data-scene-study-context]'); },
    region() { return host.querySelector('[data-scene-study-region]'); },
    cycle() { return host.querySelector('[data-scene-study-cycle]'); },
    side() { return host.querySelector('[data-scene-study-side]'); },
    opposite() { return host.querySelector('[data-scene-study-action="opposite"]'); },
    oldOpposite() { return host.querySelector('[data-study-cycle-action="opposite"]'); },
    field() { return host.querySelector("[data-migration-id=\"migration-study-observation-note\"]"); },
    click(element) { act(() => { element.click(); }); },
    choose(index) { ui.click(host.querySelector('[data-study-cycle-position="' + index + '"]')); },
    follow(side) { ui.click(host.querySelector('[data-wingtip-follow-side="' + side + '"]')); },
    set(patch) { act(() => { state = { ...state, ...patch }; refresh(value => value + 1); }); },
    flushOne() { act(() => { state = { ...state, ...queued.shift() }; refresh(value => value + 1); }); },
    retainedOpposite() {
      for (const readout of walk(tree, node => typeof node.props?.readContext === 'function' && typeof node.props?.renderContext === 'function')) {
        const rendered = readout.props.renderContext(readout.props.readContext());
        const action = walk(rendered, node => node.props?.['data-scene-study-action'] === 'opposite')[0];
        if (action) return action.props.onClick;
      }
      throw new Error('Missing native scene opposite handler');
    }
  };
  await act(async () => {
    engineRef.current = options.deferReady ? null : engine;
    stage.setAttribute('data-flight-ready', options.deferReady ? 'false' : 'true');
    state = { ...state }; refresh(value => value + 1); await Promise.resolve();
  });
  return ui;
}
function authoredWork() {
  return { flightStudyObservations: { drafts: { 'canada_goose:inner-wing': 'My own prediction and evidence.' }, records: {}, comparison: { draft: 'My own comparison.' } },
    flightInvestigation: { prediction: 'Keep my wind prediction.', trials: [], evidence: 'Keep my wind evidence.' },
    flightChallenges: { selectedId: 'wind', work: { wind: { prediction: 'Keep my prediction.', notes: 'Keep my reasoning.', attempts: [] } } },
    inquiry: { hypothesis: 'Keep my migration hypothesis.', explanation: 'Keep my explanation.', trials: [] },
    aiExplorerText: 'Keep my research.' };
}
function fixedExperiment(ui) {
  return { time: ui.engine.time, serial: ui.engine.wingStepSerial, sources: ui.engine.flyers.map(flyer => flyer.uuid),
    bodies: ui.engine.flyers.map(flyer => [flyer.position.y, flyer.rotation.z]), mark: JSON.stringify(ui.engine.markedWingPose.userData),
    view: [ui.live.flightStudyYaw, ui.live.flightStudyPitch, ui.live.flightStudyZoom],
    side: [ui.live.flightWingtipFollowSide, ui.live.flightWingtipFollowSourceUuid],
    region: ui.live.flightStudyRegion, manualStep: ui.live.flightWingStep };
}
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; resetStemLab();
  tool = loadTool(process.env.MIGRATION_SCENE_STUDY_ACTIONS_CANDIDATE || 'stem_lab/stem_tool_migration.js', 'migration');
});
afterEach(() => {
  act(() => { mounts.splice(0).forEach(root => root.unmount()); });
  window.dispatchEvent(new Event('blur')); document.body.innerHTML = '';
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Scene-adjacent migration comparison actions', () => {
  it('places a native 44px comparison action immediately below the canvas with a distinct accessible name', async () => {
    const ui = await fixture();
    expect(ui.strip().previousElementSibling).toBe(ui.stage);
    expect(ui.strip().parentElement).toBe(ui.stage.parentElement);
    expect(ui.strip().getAttribute('role')).toBe('group');
    expect(ui.strip().getAttribute('aria-label')).toBe('Scene study actions');
    expect(ui.stage.closest('[data-migration-3d-flight]').getAttribute('data-study-strip')).toBe('true');
    expect(ui.opposite().tagName).toBe('BUTTON'); expect(ui.opposite().type).toBe('button');
    expect(ui.opposite().textContent).toBe('Compare opposite wings');
    expect(ui.oldOpposite().textContent).toBe('Compare opposite position');
    expect(ui.opposite().getAttribute('aria-controls')).toBe(ui.host.querySelector('[data-migration-id="migration-flight-stage"]').id);
    expect(getComputedStyle(ui.opposite()).minHeight).toBe('44px');
    expect(ui.opposite().disabled).toBe(true); expect(ui.cycle().getAttribute('data-scene-study-cycle')).toBe('none');
    expect(ui.cycle().textContent).toBe('No numbered cycle position selected.');
    expect(ui.region().textContent).toBe('2 · Inner wing');
  });

  it.each([0, 1, 2, 3, 4, 5, 6, 7])('compares explicit position %s and back beside the scene using the same shared intent as the original action', async index => {
    const ui = await fixture({ ...authoredWork(), flightStudyYaw: 90, flightStudyPitch: 10, flightStudyZoom: 1.25 });
    ui.follow(0); ui.choose(index); ui.writes.length = 0; ui.announce.mockClear();
    const before = JSON.stringify(ui.state), fixed = fixedExperiment(ui), button = ui.opposite(); button.focus();
    expect(button.disabled).toBe(false); expect(ui.cycle().getAttribute('data-scene-study-cycle')).toBe(String(index));
    ui.click(button);
    const target = (index + 4) % 8;
    expect(ui.cycle().textContent).toBe('Cycle ' + (target + 1) + '/8 selected');
    expect(ui.host.querySelector('[data-study-cycle-position="' + target + '"]').getAttribute('aria-pressed')).toBe('true');
    expect(ui.host.querySelector('[data-study-stage-cycle-position]').getAttribute('data-study-stage-cycle-position')).toBe(String(target));
    expect(document.activeElement).toBe(button); expect(JSON.stringify(ui.state)).toBe(before); expect(fixedExperiment(ui)).toEqual(fixed);
    expect(ui.writes).toEqual([{ flightPaused: true }]);
    expect(ui.host.querySelector('[data-scene-feedback]').textContent).toBe('Selected opposite cycle position ' + (target + 1) + '. Flight paused. Keep the view fixed and describe what you see.');
    ui.click(ui.oldOpposite());
    expect(ui.cycle().getAttribute('data-scene-study-cycle')).toBe(String(index));
    expect(JSON.stringify(ui.state)).toBe(before); expect(fixedExperiment(ui)).toEqual(fixed);
    expect(ui.engine.markedWingPose.clearPose).not.toHaveBeenCalled(); expect(ui.engine.wingtipPath.invalidate).not.toHaveBeenCalled();
  });

  it('uses the latest explicit pause-ref selection through retained clicks and delayed host acknowledgements', async () => {
    const ui = await fixture({ flightPaused: false, ...authoredWork() }, { delayPause: true });
    ui.choose(2); const retained = ui.retainedOpposite(), fixed = fixedExperiment(ui);
    act(() => { retained(); retained(); });
    expect(ui.cycle().getAttribute('data-scene-study-cycle')).toBe('2');
    expect(ui.state.flightPaused).toBe(false); expect(ui.live.flightPaused).toBe(true); expect(ui.queued).toHaveLength(3);
    expect(fixedExperiment(ui)).toEqual(fixed);
    ui.flushOne(); expect(ui.cycle().getAttribute('data-scene-study-cycle')).toBe('2');
    expect(ui.state.flightPaused).toBe(true); expect(ui.opposite().disabled).toBe(false);
  });

  it('labels the selected region and followed anatomical side without changing those viewing choices', async () => {
    const ui = await fixture({ flightStudyObservationOpen: true, ...authoredWork() });
    ui.follow(1); ui.choose(6); const field = ui.field(); field.focus(); const before = JSON.stringify(ui.state), renders = ui.renderCount;
    expect(ui.region().textContent).toBe('2 · Inner wing');
    expect(ui.side().textContent).toBe('Followed wingtip: individual’s right.');
    expect(ui.side().getAttribute('data-scene-study-side')).toBe('right');
    expect(ui.cycle().textContent).toBe('Cycle 7/8 selected');
    expect(document.activeElement).toBe(field); expect(ui.field().value).toBe('My own prediction and evidence.');
    expect(JSON.stringify(ui.state)).toBe(before); expect(ui.renderCount).toBe(renders);
    ui.set({ flightStudyRegion: 'primaries' }); expect(ui.region().textContent).toBe('3 · Primary feathers');
    ui.set({ flightShowAnatomy: false }); expect(ui.region().textContent).toBe('Region: Primary feathers');
    ui.set({ flightShowAnatomy: true }); expect(ui.region().textContent).toBe('3 · Primary feathers');
  });

  it('uses whole-insect context for Monarch rather than displaying bird anatomy marker numbers', async () => {
    const ui = await fixture({ flightSpecies: 'monarch' }); ui.follow(0); ui.choose(2);
    expect(ui.region().getAttribute('data-scene-study-region')).toBe('whole-wing');
    expect(ui.region().textContent).toBe('Whole-insect wing motion');
    expect(ui.region().textContent).not.toMatch(/^[1-4]/); expect(ui.opposite().disabled).toBe(false);
    ui.click(ui.opposite()); expect(ui.cycle().getAttribute('data-scene-study-cycle')).toBe('6');
  });

  it('keeps the Study identity strip when paths and notes are off while limiting actions to their available contexts', async () => {
    const ui = await fixture();
    ui.set({ flightShowWingtipPath: false, flightStudyObservationOpen: false }); expect(ui.strip()).not.toBeNull();
    expect(ui.stage.closest('[data-migration-3d-flight]').getAttribute('data-study-strip')).toBe('true');
    expect(ui.strip().querySelector('[data-scene-study-species]').textContent).toContain('Canada Goose');
    expect([...ui.strip().querySelectorAll('.migration-study-scene-buttons button')].map(button => button.textContent)).toEqual(['Fit whole model', 'Turn view 180°']);
    ui.set({ flightStudyObservationOpen: true }); expect(ui.strip()).not.toBeNull(); expect(ui.opposite()).toBeNull();
    expect(ui.strip().querySelector('[data-study-scene-action="continue-note"]')).not.toBeNull();
    ui.set({ flightCamera: 'chase' }); expect(ui.strip()).toBeNull();
    ui.set({ flightCamera: 'study', flightStudyObservationOpen: false, flightShowWingtipPath: true }); expect(ui.strip()).not.toBeNull();
    expect(ui.opposite().disabled).toBe(true);
  });

  it('refreshes a late-ready scene and context loss without a parent render, draft mutation, or focus movement', async () => {
    const ui = await fixture({ flightStudyObservationOpen: true, ...authoredWork() }, { deferReady: true });
    expect(ui.context().getAttribute('data-scene-study-context')).toBe('unavailable'); expect(ui.opposite().disabled).toBe(true);
    ui.field().focus(); const field = ui.field(), renders = ui.renderCount; ui.writes.length = 0;
    await act(async () => { ui.engineRef.current = ui.engine; ui.stage.setAttribute('data-flight-ready', 'true'); await Promise.resolve(); });
    expect(ui.context().getAttribute('data-scene-study-context')).toBe('ready'); expect(ui.opposite().disabled).toBe(true);
    expect(ui.renderCount).toBe(renders); expect(ui.writes).toEqual([]); expect(document.activeElement).toBe(field);
    ui.choose(2); const afterChoice = ui.renderCount; ui.writes.length = 0; field.focus();
    await act(async () => { ui.engine.contextLost = true; ui.stage.setAttribute('data-flight-error', 'true'); await Promise.resolve(); });
    expect(ui.context().getAttribute('data-scene-study-context')).toBe('unavailable'); expect(ui.opposite().disabled).toBe(true);
    expect(ui.region()).toBeNull(); expect(ui.cycle()).toBeNull(); expect(ui.side()).toBeNull();
    expect(ui.renderCount).toBe(afterChoice); expect(ui.writes).toEqual([]); expect(document.activeElement).toBe(field);
    expect(ui.field()).toBe(field); expect(field.value).toBe('My own prediction and evidence.');
  });

  it.each([
    ['context loss', ui => { ui.engine.contextLost = true; }],
    ['source replacement', ui => { ui.engine.flyers[0].uuid = 'replaced-bird'; }],
    ['changed body clock', ui => { ui.engine.time += .1; }],
    ['manual Step changed externally', ui => { ui.live.flightWingStep++; }],
    ['invalid region', ui => { ui.live.flightStudyRegion = 'whole-wing'; }],
    ['path hidden', ui => { ui.live.flightShowWingtipPath = false; }],
    ['other current camera', ui => { ui.live.flightCamera = 'chase'; }]
  ])('rechecks a retained scene action after %s without applying a stale comparison', async (_, change) => {
    const ui = await fixture({ ...authoredWork() }); ui.choose(2); const retained = ui.retainedOpposite();
    ui.writes.length = 0; ui.announce.mockClear(); change(ui);
    const before = JSON.stringify({ state: ui.state, live: ui.live, time: ui.engine.time, phase: ui.engine.wingStepPhase });
    act(() => { retained(); });
    expect(JSON.stringify({ state: ui.state, live: ui.live, time: ui.engine.time, phase: ui.engine.wingStepPhase })).toBe(before);
    expect(ui.writes).toEqual([]); expect(ui.host.querySelector('[data-scene-feedback]').textContent).toBe('Choose a numbered cycle position in a ready Study view first.'); expect(ui.announce).not.toHaveBeenCalled();
  });
});
