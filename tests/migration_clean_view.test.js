import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const mounts = [];
let tool;
const props = node => node[Object.keys(node).find(key => key.startsWith('__reactProps$'))];
async function fixture(seed = {}, options = {}) {
  let state = { tab: 'flight3d', flightCamera: 'study', flightPaused: true, flightSpecies: 'arctic_tern',
    flightStudyYaw: 90, flightStudyPitch: 10, flightStudyZoom: 1, flightStudyBird: 0, flightWingStep: 19,
    flightShowAnatomy: true, flightShowWingtipPath: true, flightShowAirflow: true, flightStudyRegion: 'head',
    flightStudyObservationOpen: true, ...seed }, refresh;
  const refs = [], writes = [], announce = vi.fn();
  const tracedReact = { ...React, useRef(value) { const ref = React.useRef(value); if (!refs.includes(ref)) refs.push(ref); return ref; } };
  const write = patch => { writes.push(patch); state = { ...state, ...patch }; refresh(n => n + 1); };
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
    flyers: Array.from({ length: 11 }, (_, index) => ({ uuid: 'clean-bird-' + index, visible: true,
      position: { y: 0 }, rotation: { z: 0 }, userData: { phase: .2 + index * .1, flapRate: 4.2, baseY: 1, applyWingPhase: vi.fn() } })),
    markedWingPose: { userData: { captured: false, captureVersion: 0 }, clearPose: vi.fn() }, wingtipPath: { invalidate: vi.fn() } };
  const liveRef = refs.find(ref => ref.current && typeof ref.current === 'object' && 'flightSpeedValues' in ref.current);
  const ui = { host, stage, engine, engineRef, liveRef, writes, announce,
    get state() { return state; }, get live() { return liveRef.current; },
    strip: () => host.querySelector('[data-scene-study-actions]'),
    toggle: () => host.querySelector('[data-study-guides-hidden]'),
    note: () => host.querySelector('#migration-study-observation-note'),
    click() { act(() => { ui.toggle().focus(); ui.toggle().click(); }); },
    set(patch) { act(() => { state = { ...state, ...patch }; refresh(n => n + 1); }); },
    choose(index) { act(() => host.querySelector('[data-study-cycle-position="' + index + '"]').click()); }
  };
  await act(async () => { engineRef.current = options.deferReady ? null : engine;
    stage.setAttribute('data-flight-ready', options.deferReady ? 'false' : 'true');
    state = { ...state }; refresh(n => n + 1); await Promise.resolve(); });
  return ui;
}
function authored(species = 'arctic_tern', region = 'head') { return {
  flightStudyObservations: { drafts: { [species + ':' + region]: 'Keep my unfinished shape prediction.' }, records: {}, comparison: { draft: 'Keep my comparison.' } },
  flightInvestigation: { prediction: 'Keep my migration prediction.', trials: [] }, inquiry: { hypothesis: 'Keep my hypothesis.' }
}; }
function pose(ui) { return { time: ui.engine.time, phase: ui.engine.wingStepPhase, serial: ui.engine.wingStepSerial,
  sources: ui.engine.flyers.map(bird => bird.uuid), bodies: ui.engine.flyers.map(bird => [bird.position.y, bird.rotation.z]),
  mark: JSON.stringify(ui.engine.markedWingPose.userData), cycle: ui.host.querySelector('[data-scene-study-cycle]')?.textContent,
  followed: ui.host.querySelector('[data-scene-study-side]')?.getAttribute('data-scene-study-side') };
}
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); resetStemLab(); tool = loadTool('stem_lab/stem_tool_migration.js', 'migration'); });
afterEach(() => { act(() => mounts.splice(0).forEach(root => root.unmount())); window.dispatchEvent(new Event('blur')); document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Temporarily inspect the migration model without guides', () => {
  it('offers a named native checkbox with a 44px label and a learning prompt beside its scene', async () => {
    const ui = await fixture(), input = ui.toggle(), label = input.closest('label');
    expect(ui.strip().previousElementSibling).toBe(ui.stage); expect(input.tagName).toBe('INPUT'); expect(input.type).toBe('checkbox');
    expect(input.getAttribute('aria-label')).toBe('Inspect without guides'); expect(input.disabled).toBe(false); expect(input.checked).toBe(false);
    expect(input.getAttribute('aria-controls')).toBe('migration-flight-stage'); expect(input.getAttribute('aria-describedby')).toBe('migration-study-clean-help');
    expect(getComputedStyle(label).minHeight).toBe('44px'); expect(label.textContent).toContain('Inspect without guides');
    expect(ui.host.querySelector('#migration-study-clean-help').textContent).toMatch(/predict/i); expect(ui.writes).toEqual([]);
  });
  it.each([[true, true, true], [false, true, false], [true, false, true], [false, false, false]])('restores the exact anatomy/path/airflow preference mix %s/%s/%s without host writes', async (anatomy, path, airflow) => {
    const ui = await fixture({ flightShowAnatomy: anatomy, flightShowWingtipPath: path, flightShowAirflow: airflow, ...authored() });
    const before = JSON.parse(JSON.stringify(ui.state)), frozen = pose(ui), input = ui.toggle();
    ui.click(); expect(ui.toggle()).toBe(input); expect(input.checked).toBe(true);
    expect(ui.engine.studyGuidesOwner).toMatchObject({ sourceUuid: ui.engine.flyers[0].uuid, speciesId: 'arctic_tern', individual: 0, formationMode: 'natural', season: 'fall' });
    expect(ui.state).toEqual(before); expect(pose(ui)).toEqual(frozen);
    ui.click(); expect(input.checked).toBe(false); expect(ui.engine.studyGuidesOwner).toBeNull();
    expect(ui.state).toEqual(before); expect(pose(ui)).toEqual(frozen); expect(ui.writes).toEqual([]);
    expect(ui.engine.markedWingPose.clearPose).not.toHaveBeenCalled(); expect(ui.engine.wingtipPath.invalidate).not.toHaveBeenCalled();
  });
  it.each([true, false])('leaves playback %s, selected individual, and camera untouched', async paused => {
    const ui = await fixture({ flightPaused: paused, flightStudyBird: 3, flightStudyPitch: 45, flightStudyZoom: 1.4, ...authored() });
    const before = JSON.parse(JSON.stringify(ui.state)), frozen = pose(ui); ui.click();
    expect(ui.engine.studyGuidesOwner.sourceUuid).toBe(ui.engine.flyers[3].uuid); expect(ui.state).toEqual(before); expect(pose(ui)).toEqual(frozen);
    expect(ui.live).toMatchObject({ flightPaused: paused, flightStudyBird: 3, flightStudyYaw: 90, flightStudyPitch: 45, flightStudyZoom: 1.4 }); expect(ui.writes).toEqual([]);
  });
  it('retains cycle, followed wing, captured reference and the actual note value/caret', async () => {
    const ui = await fixture({ ...authored() }); ui.choose(2);
    act(() => ui.host.querySelector('[data-wingtip-follow-side="0"]').click());
    ui.engine.markedWingPose.userData = { captured: true, captureVersion: 2, capturedPhase: Math.PI / 2, sourceBirdUuid: ui.engine.flyers[0].uuid };
    const before = JSON.parse(JSON.stringify(ui.state)), frozen = pose(ui), field = ui.note();
    field.focus(); field.setSelectionRange(4, 16); ui.writes.length = 0; ui.click();
    expect(pose(ui)).toEqual(frozen); expect(ui.state).toEqual(before); expect(ui.note()).toBe(field);
    expect(field.value).toBe('Keep my unfinished shape prediction.'); expect([field.selectionStart, field.selectionEnd]).toEqual([4, 16]);
    ui.click(); expect(pose(ui)).toEqual(frozen); expect(ui.note()).toBe(field); expect(ui.writes).toEqual([]);
  });
  it('shows honest masked status and restores the original region/evidence prompts', async () => {
    const ui = await fixture({ ...authored() }); const originalRegion = ui.host.querySelector('[data-scene-study-region]').textContent;
    expect(ui.host.querySelector('.migration-flight-layer-key')).not.toBeNull();
    expect(originalRegion).toMatch(/^1/); expect(ui.host.querySelector('[data-study-anatomy-side]')).not.toBeNull();
    ui.click(); expect(ui.host.querySelector('[data-study-guides-status]').textContent).toContain('Guides temporarily hidden.');
    expect(ui.host.querySelector('[data-scene-study-region]').textContent).toBe('Region: Head & bill');
    expect(ui.host.querySelector('[data-study-anatomy-side]')).toBeNull();
    expect(ui.host.querySelector('.migration-flight-layer-key')).toBeNull();
    const prompt = ui.host.querySelector('[data-study-motion-evidence="clean-view"]');
    expect(prompt.textContent).toMatch(/predict/i); expect(prompt.textContent).toMatch(/restore/i);
    ui.click(); expect(ui.host.querySelector('.migration-flight-layer-key')).not.toBeNull();
    expect(ui.host.querySelector('[data-scene-study-region]').textContent).toBe(originalRegion);
    expect(ui.host.querySelector('[data-study-motion-evidence="clean-view"]')).toBeNull(); expect(ui.host.querySelector('[data-study-anatomy-side]')).not.toBeNull();
  });
  it.each(['head', 'inner-wing', 'primaries', 'tail'])('provides an ungraded shape prediction for the %s region', async region => {
    const ui = await fixture({ flightStudyRegion: region, ...authored('arctic_tern', region) }); ui.click();
    expect(ui.host.querySelector('[data-study-motion-evidence="clean-view"]')).not.toBeNull(); expect(ui.writes).toEqual([]);
  });
  it('supports Monarch whole-wing observation without implying bird anatomy is shown', async () => {
    const ui = await fixture({ flightSpecies: 'monarch', flightStudyRegion: 'whole-wing', ...authored('monarch', 'whole-wing') }); ui.click();
    expect(ui.toggle().checked).toBe(true); expect(ui.host.querySelector('[data-scene-study-region]').textContent).toBe('Whole-insect wing motion');
    expect(ui.host.querySelector('[data-study-motion-evidence="clean-view"]')).not.toBeNull(); expect(ui.host.querySelector('[data-study-anatomy-side]')).toBeNull(); expect(ui.writes).toEqual([]);
  });
  it('uses the latest guide choices after inspection instead of replaying stale preferences', async () => {
    const ui = await fixture(); ui.click(); ui.set({ flightShowAirflow: false, flightShowAnatomy: false });
    expect(ui.toggle().checked).toBe(true); const before = JSON.parse(JSON.stringify(ui.state)); ui.click();
    expect(ui.state).toEqual(before); expect(ui.state).toMatchObject({ flightShowAirflow: false, flightShowAnatomy: false, flightShowWingtipPath: true }); expect(ui.writes).toEqual([]);
  });
  it.each([0, 1])('reports selected side %s without claiming hidden wingtip guides are showing', async side => {
    const ui = await fixture(); ui.click(); ui.writes.length = 0;
    act(() => ui.host.querySelector('[data-wingtip-follow-side="' + side + '"]').click());
    const expected = 'Individual’s ' + (side === 0 ? 'left' : 'right') + ' wingtip selected. Guides are temporarily hidden.';
    expect(ui.host.querySelector('[data-wingtip-follow-status]').textContent).toBe(expected);
    expect(ui.announce).toHaveBeenLastCalledWith(expected); expect(ui.toggle().checked).toBe(true);
    expect(ui.host.querySelector('[data-scene-study-side]').getAttribute('data-scene-study-side')).toBe(side === 0 ? 'left' : 'right');
    act(() => ui.host.querySelector('[data-wingtip-follow-side="' + side + '"]').click());
    expect(ui.host.querySelector('[data-wingtip-follow-status]').textContent).toBe('Both wingtip guides selected. Guides are temporarily hidden.');
    expect(ui.announce).toHaveBeenLastCalledWith('Both wingtip guides selected. Guides are temporarily hidden.');
    ui.click(); expect(ui.host.querySelector('[data-wingtip-follow-status]').textContent).toBe('Showing both wingtip guides.'); expect(ui.writes).toEqual([]);
  });
  it('announces anatomy preference changes honestly while its guides remain hidden', async () => {
    const ui = await fixture(); act(() => ui.host.querySelector('[data-wingtip-follow-side="0"]').click()); ui.click(); ui.writes.length = 0;
    act(() => ui.host.querySelector('[data-followed-anatomy-toggle]').click());
    expect(ui.announce).toHaveBeenLastCalledWith('Anatomy deselected. Guides remain temporarily hidden.');
    expect(ui.host.querySelector('[data-followed-anatomy-toggle]').getAttribute('aria-pressed')).toBe('false'); expect(ui.toggle().checked).toBe(true);
    act(() => ui.host.querySelector('[data-followed-anatomy-toggle]').click());
    expect(ui.announce).toHaveBeenLastCalledWith('Anatomy selected for the followed wing. Guides remain temporarily hidden.');
    expect(ui.host.querySelector('[data-followed-anatomy-toggle]').getAttribute('aria-pressed')).toBe('true'); expect(ui.toggle().checked).toBe(true);
    expect(ui.writes).toEqual([{ flightShowAnatomy: false }, { flightShowAnatomy: true }]);
    ui.click(); expect(ui.state.flightShowAnatomy).toBe(true); expect(ui.host.querySelector('[data-study-anatomy-side]')).not.toBeNull();
  });
  it('uses temporary inspection guidance for follow, anatomy, marked reference and cycle activities', async () => {
    const ui = await fixture(); act(() => ui.host.querySelector('[data-wingtip-follow-side="0"]').click());
    const selectors = ['#migration-wingtip-follow-help', '#migration-followed-anatomy-help', '#migration-marked-pose-help', '#migration-study-cycle-help'];
    const original = selectors.map(selector => ui.host.querySelector(selector).textContent); ui.click();
    for (const selector of selectors) {
      const text = ui.host.querySelector(selector).textContent;
      expect(text).toMatch(/hidden/); expect(text).toMatch(/Restore the guides/); expect(text).not.toContain('marked outline stay visible'); expect(text).not.toContain('diamonds keep the marked tip positions visible');
    }
    ui.click(); expect(selectors.map(selector => ui.host.querySelector(selector).textContent)).toEqual(original);
  });
  it('asks learners to restore hidden references before visually comparing a marked pose', async () => {
    const ui = await fixture(); ui.choose(2);
    ui.engine.markedWingPose.capturePose = function(flyer, speciesId, individual) {
      this.userData = { captured: true, captureVersion: 1, capturedPhase: ui.engine.time * flyer.userData.flapRate + flyer.userData.phase + ui.engine.wingStepPhase,
        sourceBirdUuid: flyer.uuid, speciesId, individual }; return true;
    };
    act(() => ui.host.querySelector('[data-marked-pose-action="mark"]').click()); ui.click(); ui.choose(3);
    const flyer = ui.engine.flyers[0]; flyer.userData.lastRenderedWingPhase = ui.engine.time * flyer.userData.flapRate + flyer.userData.phase + ui.engine.wingStepPhase;
    act(() => ui.host.querySelector('[data-marked-pose-action="check"]').click());
    expect(ui.announce).toHaveBeenLastCalledWith('The illustrative wing-cycle position changed; selected view settings still match the mark. Restore the guides to compare with the marked outline.');
    act(() => ui.host.querySelector('[data-marked-pose-action="return"]').click());
    expect(ui.announce).toHaveBeenLastCalledWith('Marked wing pose selected. Guides are temporarily hidden; restore them to compare with the marked outline.');
    expect(ui.toggle().checked).toBe(true); expect(ui.engine.markedWingPose.userData.captured).toBe(true);
  });
  it('keeps rapid native toggles reversible without any persistence acknowledgment', async () => {
    const ui = await fixture(), before = JSON.parse(JSON.stringify(ui.state));
    ui.click(); ui.click(); ui.click(); expect(ui.toggle().checked).toBe(true); ui.click();
    expect(ui.toggle().checked).toBe(false); expect(ui.state).toEqual(before); expect(ui.writes).toEqual([]);
  });
  it('steps the selected cycle and returns while keeping its temporary mask and reference', async () => {
    const ui = await fixture({ ...authored() }); ui.choose(2);
    act(() => ui.host.querySelector('[data-wingtip-follow-side="0"]').click());
    ui.click(); const before = JSON.parse(JSON.stringify(ui.state)), owner = ui.engine.studyGuidesOwner, frozen = pose(ui); ui.writes.length = 0;
    for (const [direction, index] of [['next', 3], ['previous', 2]]) {
      act(() => ui.host.querySelector('[data-scene-study-action="' + direction + '"]').click());
      expect(ui.toggle().checked).toBe(true); expect(ui.engine.studyGuidesOwner).toBe(owner);
      expect(ui.host.querySelector('[data-scene-study-cycle]').getAttribute('data-scene-study-cycle')).toBe(String(index));
      expect(ui.state).toEqual(before); expect(ui.host.querySelector('[data-scene-study-side]').getAttribute('data-scene-study-side')).toBe('left');
    }
    expect(pose(ui)).toEqual(frozen); expect(ui.writes).toEqual([{ flightPaused: true }, { flightPaused: true }]);
  });
  it('enables only for a ready scene and becomes unavailable after context loss', async () => {
    const ui = await fixture({}, { deferReady: true }); expect(ui.toggle().disabled).toBe(true);
    await act(async () => { ui.engineRef.current = ui.engine; ui.stage.setAttribute('data-flight-ready', 'true'); await Promise.resolve(); });
    expect(ui.toggle().disabled).toBe(false); ui.click();
    await act(async () => { ui.engine.contextLost = true; ui.stage.setAttribute('data-flight-error', 'true'); await Promise.resolve(); });
    expect(ui.toggle().disabled).toBe(true); expect(ui.writes).toEqual([]);
  });
  it.each([
    ['disconnected strip', ui => ui.strip().remove()],
    ['changed live camera', ui => { ui.live.flightCamera = 'chase'; }],
    ['lost scene context', ui => { ui.engine.contextLost = true; }],
    ['replaced strip', ui => { const old = ui.strip(); old.replaceWith(old.cloneNode(true)); }],
    ['different live species', ui => { ui.live.flightSpecies = 'canada_goose'; }]
  ])('rejects a retained checkbox handler after %s', async (_, invalidate) => {
    const ui = await fixture(), input = ui.toggle(), retained = props(input).onChange; invalidate(ui);
    const before = JSON.stringify(ui.state); input.checked = true; act(() => retained({ currentTarget: input, target: input }));
    expect(JSON.stringify(ui.state)).toBe(before); expect(ui.writes).toEqual([]); expect(ui.engine.studyGuidesOwner || null).toBeNull();
  });
  it.each([
    ['camera', ui => Array.from(ui.host.querySelectorAll('button')).find(button => button.textContent === 'Chase').click(), 'flightCamera', 'chase'],
    ['individual', ui => props(ui.host.querySelector('[aria-label="Study individual"]')).onChange({ target: { value: '1' } }), 'flightStudyBird', 1],
    ['species', ui => props(ui.host.querySelector('[aria-label="3D migration focus species"]')).onChange({ target: { value: 'canada_goose' } }), 'flightSpecies', 'canada_goose'],
    ['formation', ui => props(ui.host.querySelector('[aria-label="3D migration flight pattern"]')).onChange({ target: { value: 'solo' } }), 'flightFormation', 'solo'],
    ['season', ui => props(ui.host.querySelector('[aria-label="Migration season and direction"]')).onChange({ target: { value: 'spring' } }), 'flightSeason', 'spring']
  ])('drops temporary guide hiding when the learner explicitly changes %s', async (_, action, key, value) => {
    const ui = await fixture(); ui.click(); expect(ui.engine.studyGuidesOwner).not.toBeNull(); act(() => action(ui));
    expect(ui.state[key]).toBe(value); expect(ui.engine.studyGuidesOwner || null).toBeNull();
  });
  it('does not revive inspection after leaving Study and returning to the same source', async () => {
    const ui = await fixture(); ui.click(); ui.set({ flightCamera: 'chase' }); expect(ui.toggle()).toBeNull();
    ui.set({ flightCamera: 'study' }); expect(ui.toggle().checked).toBe(false); expect(ui.engine.studyGuidesOwner || null).toBeNull();
  });
  it('does not transfer or revive inspection after replacing a flyer at the same index', async () => {
    const ui = await fixture(); ui.click(); const original = ui.engine.flyers[0].uuid; ui.engine.flyers[0].uuid = 'replacement-flyer';
    ui.set({ flightShowRoute: false }); expect(ui.toggle().checked).toBe(false);
    ui.engine.flyers[0].uuid = original; ui.set({ flightShowRoute: true }); expect(ui.toggle().checked).toBe(false); expect(ui.engine.studyGuidesOwner || null).toBeNull();
  });
  it('cancels unfinished orbit preview and ignores its late release without saving new angles', async () => {
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
    expect(ui.live).toMatchObject({ flightStudyYaw: 90, flightStudyPitch: 10, flightStudyZoom: 1 }); expect(ui.writes).toEqual([]);
  });
  it('rejects stale marker picking immediately, before a frame has hidden the old marker', async () => {
    const ui = await fixture(), canvas = document.createElement('canvas'); ui.stage.append(canvas);
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 400 });
    const project = vi.fn(function() { return this; });
    ui.engine.camera = {}; ui.engine.renderer = { domElement: canvas };
    ui.engine.anatomyPickPoint = { x: -.5, y: .5, z: 0, project };
    ui.engine.anatomyMarkers = { visible: true, updateMatrixWorld() {}, children: [{ visible: true,
      userData: { anatomyId: 'tail' }, getWorldPosition(point) { point.x = -.5; point.y = .5; point.z = 0; } }] };
    ui.click(); const stageProps = props(ui.stage);
    const event = { pointerId: 1, isPrimary: true, button: 0, clientX: 100, clientY: 100,
      target: canvas, currentTarget: ui.stage, preventDefault() {} };
    act(() => { stageProps.onPointerDown(event); stageProps.onPointerUp(event); });
    expect(project).not.toHaveBeenCalled(); expect(ui.state.flightStudyRegion).toBe('head'); expect(ui.writes).toEqual([]);
  });
});
