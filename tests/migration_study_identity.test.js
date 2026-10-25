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
  const stage = host.querySelector('[id="migration-flight-stage"]');
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
    species() { return host.querySelector('[data-scene-study-species]'); },
    individual() { return host.querySelector('[data-scene-study-individual]'); },
    badge() { return stage.querySelector('.migration-flight-badge'); },
    overlay() { return stage.querySelector('.migration-flight-overlay'); },
    buttons() { return ui.strip()?.querySelector('.migration-study-scene-buttons') || null; },
    region() { return host.querySelector('[data-scene-study-region]'); },
    cycle() { return host.querySelector('[data-scene-study-cycle]'); },
    side() { return host.querySelector('[data-scene-study-side]'); },
    opposite() { return host.querySelector('[data-scene-study-action="opposite"]'); },
    oldOpposite() { return host.querySelector('[data-study-cycle-action="opposite"]'); },
    field() { return host.querySelector('[id="migration-study-observation-note"]'); },
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
  tool = loadTool(process.env.MIGRATION_STUDY_IDENTITY_CANDIDATE || 'stem_lab/stem_tool_migration.js', 'migration');
});
afterEach(() => {
  act(() => { mounts.splice(0).forEach(root => root.unmount()); });
  window.dispatchEvent(new Event('blur')); document.body.innerHTML = '';
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});


describe('Study identity beside the canvas preserves the unobstructed model view', () => {
  it('moves species and individual context into the existing strip without covering the model or moving the route card', async () => {
    const ui = await fixture();
    expect(ui.badge()).toBeNull();
    expect(ui.species().textContent).toBe('🪿 Canada Goose');
    expect(ui.species().getAttribute('data-scene-study-species')).toBe('canada_goose');
    expect(ui.individual().getAttribute('data-scene-study-individual')).toBe('0');
    expect(ui.individual().textContent).toBe('Lead bird isolated for study');
    expect(ui.strip().previousElementSibling).toBe(ui.stage);
    expect(ui.strip().contains(ui.species())).toBe(true);
    expect(ui.stage.contains(ui.species())).toBe(false);
    expect(ui.overlay().children).toHaveLength(1);
    expect(ui.overlay().firstElementChild.classList.contains('migration-flight-route')).toBe(true);
    expect(getComputedStyle(ui.overlay()).justifyContent).toBe('flex-end');
    expect(ui.stage.querySelectorAll('.migration-scene-tools button')).toHaveLength(2);
    expect(ui.host.querySelectorAll('[id="migration-flight-stage"]')).toHaveLength(1);
  });

  it.each([
    ['monarch', 'Monarch Butterfly'],
    ['peregrine', 'Peregrine Falcon'],
    ['snow_goose', 'Snow Goose']
  ])('labels the selected %s outside the canvas even with guides and notes off', async (id, name) => {
    const ui = await fixture({ flightSpecies: id, flightShowWingtipPath: false, flightStudyObservationOpen: false });
    expect(ui.species().getAttribute('data-scene-study-species')).toBe(id);
    expect(ui.species().textContent).toContain(name);
    expect(ui.strip().getAttribute('aria-label')).toBe('Study scene context');
    expect(ui.badge()).toBeNull();
    expect([...ui.buttons().querySelectorAll('button')].map(button => button.textContent)).toEqual(['Fit whole model', 'Turn view 180°']);
    expect(ui.stage.closest('[data-migration-3d-flight]').getAttribute('data-study-strip')).toBe('true');
    if (id === 'monarch') {
      expect(ui.region().textContent).toBe('Whole-insect wing motion');
      expect(ui.region().textContent).not.toMatch(/feather|^[1-4]/);
    }
  });

  it('identifies a selected follower instead of calling every V-formation individual the lead bird', async () => {
    const ui = await fixture({ flightStudyBird: 2 });
    expect(ui.individual().getAttribute('data-scene-study-individual')).toBe('2');
    expect(ui.individual().textContent).toBe('Individual 3 · isolated for study');
    expect(ui.individual().textContent).not.toMatch(/Lead/);
  });

  it('uses the individual label for the first bird in a solo formation', async () => {
    const ui = await fixture({ flightFormation: 'solo' });
    expect(ui.individual().getAttribute('data-scene-study-individual')).toBe('0');
    expect(ui.individual().textContent).toBe('Individual 1 · isolated for study');
  });

  it.each([
    [false, false], [true, false], [false, true], [true, true]
  ])('keeps identity visible with paths=%s and notes=%s while rendering only the available native actions', async (paths, notes) => {
    const ui = await fixture({ flightShowWingtipPath: paths, flightStudyObservationOpen: notes, ...authoredWork() });
    expect(ui.species()).not.toBeNull(); expect(ui.individual()).not.toBeNull();
    expect(ui.strip().getAttribute('aria-label')).toBe(paths || notes ? 'Scene study actions' : 'Study scene context');
    expect(ui.opposite() !== null).toBe(paths);
    const noteAction = ui.strip().querySelector('[data-study-scene-action="continue-note"]');
    expect(noteAction !== null).toBe(notes);
    expect(ui.buttons()).not.toBeNull();
    expect(ui.buttons().querySelector('[data-scene-study-action="fit"]')).not.toBeNull();
    if (!paths && !notes) expect(ui.buttons().querySelectorAll('button')).toHaveLength(2);
    for (const button of ui.buttons()?.querySelectorAll('button') || []) {
      expect(button.type).toBe('button');
      expect(getComputedStyle(button).minHeight).toBe('44px');
      expect(button.getAttribute('aria-controls')).toBe(button === noteAction ? 'migration-study-observation-note' : 'migration-flight-stage');
    }
  });

  it.each([0, 2, 6, 7])('keeps selected cycle%s current in one footer cue without restoring the in-canvas badge', async index => {
    const ui = await fixture({ ...authoredWork(), flightStudyYaw: 90, flightStudyPitch: 10, flightStudyZoom: 1.25 });
    const before = JSON.stringify(ui.state), fixed = fixedExperiment(ui);
    ui.choose(index);
    const cues = ui.host.querySelectorAll('[data-study-stage-cycle-position]');
    expect(cues).toHaveLength(1);
    expect(cues[0]).toBe(ui.cycle());
    expect(cues[0].getAttribute('data-study-stage-cycle-position')).toBe(String(index));
    expect(cues[0].textContent).toBe('Cycle ' + (index + 1) + '/8 selected');
    expect(ui.strip().contains(cues[0])).toBe(true);
    expect(ui.stage.querySelector('[data-study-stage-cycle-position]')).toBeNull();
    expect(ui.badge()).toBeNull();
    expect(JSON.stringify(ui.state)).toBe(before); expect(fixedExperiment(ui)).toEqual(fixed);
    expect(ui.writes).toEqual([{ flightPaused: true }]);
  });

  it('keeps selection identity visible while waiting, then updates only the context readout when the scene becomes ready', async () => {
    const ui = await fixture({ flightStudyObservationOpen: true, ...authoredWork() }, { deferReady: true });
    expect(ui.species().textContent).toContain('Canada Goose');
    expect(ui.individual().textContent).toBe('Lead bird isolated for study');
    expect(ui.context().getAttribute('data-scene-study-context')).toBe('unavailable');
    expect(ui.region()).toBeNull(); expect(ui.cycle()).toBeNull(); expect(ui.side()).toBeNull();
    const field = ui.field(); field.focus(); field.setSelectionRange(3, 17, 'backward');
    const stateText = JSON.stringify(ui.state), fixed = fixedExperiment(ui), renders = ui.renderCount; ui.writes.length = 0;
    await act(async () => { ui.engineRef.current = ui.engine; ui.stage.setAttribute('data-flight-ready', 'true'); await Promise.resolve(); });
    expect(ui.context().getAttribute('data-scene-study-context')).toBe('ready');
    expect(ui.region().textContent).toBe('2 · Inner wing');
    expect(ui.species().textContent).toContain('Canada Goose'); expect(ui.badge()).toBeNull();
    expect(ui.renderCount).toBe(renders); expect(JSON.stringify(ui.state)).toBe(stateText); expect(fixedExperiment(ui)).toEqual(fixed);
    expect(ui.writes).toEqual([]); expect(ui.field()).toBe(field); expect(document.activeElement).toBe(field);
    expect([field.selectionStart, field.selectionEnd, field.selectionDirection]).toEqual([3, 17, 'backward']);
  });

  it('retains selected identity on context loss without presenting unavailable cycle or anatomy choices as current', async () => {
    const ui = await fixture({ flightStudyObservationOpen: true, ...authoredWork() }); ui.choose(6);
    const field = ui.field(); field.focus(); field.setSelectionRange(4, 20, 'forward');
    const before = JSON.stringify(ui.state), fixed = fixedExperiment(ui), renders = ui.renderCount; ui.writes.length = 0;
    await act(async () => { ui.engine.contextLost = true; ui.stage.setAttribute('data-flight-error', 'true'); await Promise.resolve(); });
    expect(ui.species().textContent).toContain('Canada Goose');
    expect(ui.individual().textContent).toBe('Lead bird isolated for study');
    expect(ui.context().getAttribute('data-scene-study-context')).toBe('unavailable');
    expect(ui.region()).toBeNull(); expect(ui.cycle()).toBeNull(); expect(ui.side()).toBeNull();
    expect(ui.host.querySelector('[data-study-stage-cycle-position]')).toBeNull();
    expect(ui.badge()).toBeNull();
    expect(JSON.stringify(ui.state)).toBe(before); expect(fixedExperiment(ui)).toEqual(fixed); expect(ui.writes).toEqual([]);
    expect(ui.renderCount).toBe(renders); expect(ui.field()).toBe(field); expect(document.activeElement).toBe(field);
    expect([field.selectionStart, field.selectionEnd, field.selectionDirection]).toEqual([4, 20, 'forward']);
  });

  it('uses a ready context individual refreshed by the existing observer rather than a stale parent selection snapshot', async () => {
    const ui = await fixture({ flightStudyObservationOpen: true, ...authoredWork() });
    const field = ui.field(); field.focus(); field.setSelectionRange(2, 12);
    const before = JSON.stringify(ui.state), renders = ui.renderCount; ui.writes.length = 0;
    await act(async () => { ui.live.flightStudyBird = 2; ui.stage.setAttribute('data-flight-source-uuid', ui.engine.flyers[2].uuid); await Promise.resolve(); });
    expect(ui.individual().getAttribute('data-scene-study-individual')).toBe('2');
    expect(ui.individual().textContent).toBe('Individual 3 · isolated for study');
    expect(ui.renderCount).toBe(renders); expect(JSON.stringify(ui.state)).toBe(before); expect(ui.writes).toEqual([]);
    expect(ui.field()).toBe(field); expect(document.activeElement).toBe(field);
    expect([field.selectionStart, field.selectionEnd]).toEqual([2, 12]);
  });

  it('drops a stale numbered cue after source replacement while keeping selected species identity', async () => {
    const ui = await fixture(); ui.choose(2);
    const stateText = JSON.stringify(ui.state), renders = ui.renderCount; ui.writes.length = 0;
    await act(async () => { ui.engine.flyers[0].uuid = 'replacement-identity-bird'; ui.stage.setAttribute('data-flight-source-uuid', 'replacement-identity-bird'); await Promise.resolve(); });
    expect(ui.species().textContent).toContain('Canada Goose');
    expect(ui.cycle().getAttribute('data-scene-study-cycle')).toBe('none');
    expect(ui.cycle().textContent).toBe('No numbered cycle position selected.');
    expect(ui.host.querySelector('[data-study-stage-cycle-position]')).toBeNull();
    expect(ui.renderCount).toBe(renders); expect(JSON.stringify(ui.state)).toBe(stateText); expect(ui.writes).toEqual([]);
  });

  it.each(['chase', 'aerial', 'side'])('restores the existing badge in %s and removes the Study context strip', async camera => {
    const ui = await fixture();
    expect(ui.badge()).toBeNull(); expect(ui.species()).not.toBeNull();
    ui.set({ flightCamera: camera });
    expect(ui.strip()).toBeNull(); expect(ui.species()).toBeNull(); expect(ui.individual()).toBeNull();
    expect(ui.badge()).not.toBeNull(); expect(ui.badge().textContent).toContain('Canada Goose');
    expect(ui.overlay().children).toHaveLength(2);
    expect(getComputedStyle(ui.overlay()).justifyContent).toBe('space-between');
    expect(ui.stage.closest('[data-migration-3d-flight]').getAttribute('data-study-strip')).toBe('false');
    ui.set({ flightCamera: 'study' });
    expect(ui.badge()).toBeNull(); expect(ui.species()).not.toBeNull();
    expect(getComputedStyle(ui.overlay()).justifyContent).toBe('flex-end');
  });
});
