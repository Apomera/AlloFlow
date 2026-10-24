import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = process.env.MIGRATION_OPPOSITE_CYCLE_CANDIDATE || 'stem_lab/stem_tool_migration.js';
const source = fs.readFileSync(path.join(process.cwd(), sourcePath), 'utf8').replace(/\r\n/g, '\n');
function section(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error('Missing opposite-cycle source: ' + start);
  return source.slice(first, last);
}
const num = new Function(section('  function migrNum(', '  // Sibling of migrNum') + '\nreturn migrNum;')();
const helpers = new Function('migrNum', section('      function migrationStudyCycleContext(', '      function renderFlight3D()') +
  '\nreturn { opposite: migrationStudyOppositeCycleTarget, select: selectMigrationStudyCyclePosition, matches: migrationStudyCyclePositionMatches };')(num);
const { act } = React;
const mounts = [];
let tool;

function walk(node, predicate, matches = []) {
  if (!node || typeof node !== 'object') return matches;
  if (Array.isArray(node)) { node.forEach(child => walk(child, predicate, matches)); return matches; }
  if (predicate(node)) matches.push(node);
  walk(node.props?.children, predicate, matches); return matches;
}
function makeEngine(host, values = {}) {
  host.setAttribute('data-flight-ready', 'true');
  const pose = { userData: { captured: false, captureVersion: 0 }, clearPose: vi.fn(() => { pose.userData.captured = false; }) };
  const engine = { host, speciesId: 'canada_goose', formationMode: 'natural', season: 'fall',
    time: 1.3, wingStepSerial: 19, wingStepPhase: 0.7, contextLost: false,
    flyers: Array.from({ length: 11 }, (_, index) => ({ uuid: 'context-bird-' + index, visible: true,
      position: { y: 0 }, rotation: { z: 0 }, userData: { phase: .2 + index * .1, flapRate: 4.2, baseY: 1, applyWingPhase: vi.fn() } })),
    markedWingPose: pose, wingtipPath: { invalidate: vi.fn() }, ...values };
  pose.capturePose = vi.fn((flyer, speciesId, individual) => {
    const tau = Math.PI * 2, phase = engine.time * flyer.userData.flapRate + flyer.userData.phase + engine.wingStepPhase;
    pose.userData = { captured: true, captureVersion: pose.userData.captureVersion + 1,
      capturedPhase: ((phase % tau) + tau) % tau, sourceBirdUuid: flyer.uuid, speciesId, individual };
    return true;
  });
  return engine;
}
function pureFixture(index = 2, speciesId = 'canada_goose') {
  const host = document.createElement('div'); document.body.append(host);
  const engine = makeEngine(host, { speciesId });
  const live = { tab: 'flight3d', flightSpecies: speciesId, flightCamera: 'study', flightPaused: true,
    flightShowWingtipPath: true, flightStudyBird: 0, flightWingStep: 19, flightStudyRegion: 'inner-wing',
    flightFormation: 'natural', flightSeason: 'fall' };
  const selection = helpers.select(engine, live, index);
  return { host, engine, live, selection, target() { return helpers.opposite(engine, live, this.selection); } };
}
function fixture(seed = {}, options = {}) {
  let state = { tab: 'flight3d', flightCamera: 'study', flightPaused: true, flightShowWingtipPath: true,
    flightShowAnatomy: true, flightStudyRegion: 'inner-wing', flightWingStep: 19,
    flightStudyObservationOpen: true, ...seed }, tree, refresh, renderCount = 0;
  const writes = [], queued = [], refs = [], announce = vi.fn();
  const tracedReact = { ...React, useRef(value) {
    const ref = React.useRef(value); if (!refs.includes(ref)) refs.push(ref); return ref;
  } };
  const ctx = makeCtx({ React: tracedReact, announceToSR: announce,
    update: (_, key, value) => {
      writes.push({ [key]: value });
      if (options.delayPause && key === 'flightPaused') { queued.push({ [key]: value }); return; }
      state = { ...state, [key]: value }; refresh(value => value + 1);
    },
    updateMulti: (_, patch) => {
      writes.push(patch);
      if (options.delayMulti) { queued.push(patch); return; }
      state = { ...state, ...patch }; refresh(value => value + 1);
    } });
  const host = document.createElement('div'); document.body.append(host);
  const root = ReactDOMClient.createRoot(host); mounts.push(root);
  function Component() { renderCount++; refresh = React.useState(0)[1]; ctx.toolData = { migration: state }; tree = tool.render(ctx); return tree; }
  act(() => { root.render(React.createElement(Component)); });
  const stage = host.querySelector('#migration-flight-stage');
  const engineRef = refs[refs.findIndex(ref => ref.current === stage) + 1];
  const engine = makeEngine(stage, { speciesId: state.flightSpecies || 'canada_goose',
    formationMode: state.flightFormation || 'natural', season: state.flightSeason || 'fall', wingStepSerial: state.flightWingStep });
  engineRef.current = options.deferReady ? null : engine;
  if (options.deferReady) stage.setAttribute('data-flight-ready', 'false');
  const liveRef = refs.find(ref => ref.current && typeof ref.current === 'object' && 'flightSpeedValues' in ref.current);
  const ui = { host, stage, engine, engineRef, liveRef, writes, queued, announce,
    get state() { return state; }, get live() { return liveRef.current; }, get renderCount() { return renderCount; },
    node(predicate) { return walk(tree, predicate)[0] || null; },
    button(label) { return ui.node(node => node.type === 'button' && node.props.children === label); },
    click(node) { act(() => { node.props.onClick(); }); },
    choose(index) { ui.click(ui.node(node => node.props?.['data-study-cycle-position'] === index)); },
    follow(side = 0) { ui.click(ui.node(node => node.props?.['data-wingtip-follow-side'] === side)); },
    set(patch) { act(() => { state = { ...state, ...patch }; refresh(value => value + 1); }); },
    flushOne() { act(() => { state = { ...state, ...queued.shift() }; refresh(value => value + 1); }); },
    context() { return host.querySelector('#migration-study-current-context'); },
    cycle() { return host.querySelector('[data-study-context-cycle]'); },
    side() { return host.querySelector('[data-study-context-side]'); },
    badge() { return host.querySelector('[data-study-stage-cycle-position]'); },
    opposite() { return host.querySelector('[data-study-cycle-action="opposite"]'); },
    oppositeNode() {
      // The stable readout renders outside the parent tree. Inspect its public
      // render callback to retain an actual old event handler for race coverage.
      const readouts = walk(tree, node => typeof node.props?.readContext === 'function' && typeof node.props?.renderContext === 'function');
      for (const node of readouts) {
        const element = node.props.renderContext(node.props.readContext());
        if (element?.props?.['data-study-cycle-action'] === 'opposite') return element;
      }
      throw new Error('Missing opposite-cycle readout');
    },
    renderPhase() {
      const flyer = engine.flyers[ui.live.flightStudyBird];
      flyer.userData.lastRenderedWingPhase = engine.time * flyer.userData.flapRate + flyer.userData.phase + engine.wingStepPhase;
    },
    field() { return host.querySelector('#migration-study-observation-note'); }
  };
  ui.set({}); return ui;
}

beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; resetStemLab(); tool = loadTool(sourcePath, 'migration'); });
afterEach(() => {
  act(() => { mounts.splice(0).forEach(root => root.unmount()); }); document.body.innerHTML = '';
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});


describe('Explicit opposite cycle comparison', () => {
  it.each([0, 1, 2, 3, 4, 5, 6, 7])('maps explicit checkpoint %s to its opposite and back without phase or step inference', index => {
    const f = pureFixture(index);
    const before = JSON.stringify({ live: f.live, selection: f.selection, time: f.engine.time, serial: f.engine.wingStepSerial, phase: f.engine.wingStepPhase });
    expect(f.target()).toBe((index + 4) % 8);
    expect(JSON.stringify({ live: f.live, selection: f.selection, time: f.engine.time, serial: f.engine.wingStepSerial, phase: f.engine.wingStepPhase })).toBe(before);
    f.selection = helpers.select(f.engine, f.live, f.target());
    expect(f.target()).toBe(index); expect(f.live.flightWingStep).toBe(19); expect(f.engine.time).toBe(1.3);
  });

  it.each([
    ['no explicit intent', f => { f.selection = null; }],
    ['marked-return intent', f => { f.selection = { ...f.selection, kind: 'marked-return' }; }],
    ['lost context while host still says ready', f => { f.engine.contextLost = true; }],
    ['replaced source UUID', f => { f.engine.flyers[0].uuid = 'replacement'; }],
    ['advanced body clock', f => { f.engine.time += .1; }],
    ['different manual serial', f => { f.live.flightWingStep += 1; }],
    ['resumed playback', f => { f.live.flightPaused = false; }],
    ['hidden wingtip path', f => { f.live.flightShowWingtipPath = false; }],
    ['unready scene', f => { f.host.setAttribute('data-flight-ready', 'false'); }],
    ['changed Study individual', f => { f.live.flightStudyBird = 1; }]
  ])('rejects %s without changing the live model', (_, change) => {
    const f = pureFixture(); change(f);
    const before = JSON.stringify({ live: f.live, selection: f.selection, time: f.engine.time, serial: f.engine.wingStepSerial, phase: f.engine.wingStepPhase });
    expect(f.target()).toBeNull();
    expect(JSON.stringify({ live: f.live, selection: f.selection, time: f.engine.time, serial: f.engine.wingStepSerial, phase: f.engine.wingStepPhase })).toBe(before);
  });

  it('starts disabled and never derives a numbered selection from manual Wing steps or a rendered phase', () => {
    const ui = fixture();
    ui.engine.flyers[0].userData.lastRenderedWingPhase = Math.PI / 2;
    expect(ui.opposite().disabled).toBe(true); expect(ui.badge()).toBeNull();
    expect(ui.opposite().textContent).toBe('Compare opposite position');
    expect(ui.opposite().getAttribute('aria-controls')).toBe('migration-flight-stage');
    expect(ui.opposite().getAttribute('aria-describedby')).toBe('migration-study-cycle-help');
    expect(ui.host.querySelectorAll('[data-study-cycle-action="opposite"]')).toHaveLength(1);
    expect(ui.state.flightWingStep).toBe(19); expect(ui.engine.markedWingPose.capturePose).not.toHaveBeenCalled();
    ui.writes.length = 0; ui.click(ui.oppositeNode());
    expect(ui.writes).toEqual([]); expect(ui.announce).toHaveBeenLastCalledWith('Choose a numbered cycle position in a ready Study view first.');
  });

  it('uses a retained old handler for rapid 3 to 7 to 3 choices before pause acknowledgements', () => {
    const ui = fixture({ flightPaused: false }, { delayPause: true }); ui.choose(2);
    const oldHandler = ui.oppositeNode().props.onClick;
    expect(ui.opposite().disabled).toBe(false); ui.writes.length = 0;
    act(() => {
      oldHandler(); expect(ui.live.flightStudyCyclePosition).toBe(6);
      oldHandler(); expect(ui.live.flightStudyCyclePosition).toBe(2);
    });
    expect(ui.state.flightPaused).toBe(false); expect(ui.live.flightPaused).toBe(true);
    expect(ui.badge().getAttribute('data-study-stage-cycle-position')).toBe('2');
    expect(ui.engine.wingStepSerial).toBe(19); expect(ui.engine.time).toBe(1.3);
    expect(ui.writes).toEqual([{ flightPaused: true }, { flightPaused: true }]);
    expect(ui.announce).toHaveBeenLastCalledWith('Selected opposite cycle position 3. Flight paused. Keep the view fixed and describe what you see.');
    ui.flushOne(); expect(ui.live.flightStudyCyclePosition).toBe(2); expect(ui.opposite().disabled).toBe(false);
  });

  it('preserves the camera, followed segment, marked reference, manual serial and learner-authored work', () => {
    const observations = { drafts: { 'canada_goose:inner-wing': 'My exact prediction and evidence.' }, records: {} };
    const investigation = { prediction: 'Keep this separate learner response.' };
    const ui = fixture({ flightStudyYaw: 90, flightStudyPitch: 10, flightStudyZoom: 1.2, flightStudyObservations: observations, flightInvestigation: investigation });
    ui.follow(1); ui.choose(2); ui.renderPhase(); ui.click(ui.button('Mark wing pose'));
    const marked = { ...ui.engine.markedWingPose.userData };
    const field = ui.field(); field.focus(); ui.writes.length = 0;
    const before = { view: [ui.live.flightStudyYaw, ui.live.flightStudyPitch, ui.live.flightStudyZoom],
      side: ui.live.flightWingtipFollowSide, source: ui.live.flightWingtipFollowSourceUuid, region: ui.live.flightStudyRegion,
      time: ui.engine.time, serial: ui.engine.wingStepSerial, steps: ui.state.flightWingStep };
    ui.click(ui.oppositeNode());
    expect(ui.live.flightStudyCyclePosition).toBe(6); expect(ui.opposite().disabled).toBe(false);
    expect([ui.live.flightStudyYaw, ui.live.flightStudyPitch, ui.live.flightStudyZoom]).toEqual(before.view);
    expect(ui.live.flightWingtipFollowSide).toBe(before.side); expect(ui.live.flightWingtipFollowSourceUuid).toBe(before.source);
    expect(ui.live.flightStudyRegion).toBe(before.region); expect(ui.engine.time).toBe(before.time);
    expect(ui.engine.wingStepSerial).toBe(before.serial); expect(ui.state.flightWingStep).toBe(before.steps);
    expect(ui.engine.markedWingPose.userData).toEqual(marked); expect(ui.engine.markedWingPose.capturePose).toHaveBeenCalledTimes(1);
    expect(ui.state.flightStudyObservations).toBe(observations); expect(ui.state.flightInvestigation).toBe(investigation);
    expect(ui.field()).toBe(field); expect(document.activeElement).toBe(field); expect(field.value).toBe('My exact prediction and evidence.');
    expect(ui.writes).toEqual([{ flightPaused: true }]);
    expect(ui.state).not.toHaveProperty('flightStudyOppositeCycle');
  });

  it('requires the learner to mark explicitly and waits for the new rendered pose before reporting a wing-only comparison', () => {
    const ui = fixture(); ui.choose(2); ui.renderPhase();
    expect(ui.engine.markedWingPose.capturePose).not.toHaveBeenCalled();
    ui.click(ui.button('Mark wing pose')); const version = ui.engine.markedWingPose.userData.captureVersion;
    ui.click(ui.oppositeNode());
    expect(ui.engine.markedWingPose.capturePose).toHaveBeenCalledTimes(1); expect(ui.engine.markedWingPose.userData.captureVersion).toBe(version);
    ui.click(ui.node(node => node.props?.['data-marked-pose-action'] === 'check'));
    expect(ui.host.querySelector('[data-marked-comparison-status]').getAttribute('data-marked-comparison-status')).toBe('waiting');
    expect(ui.host.querySelector('[data-marked-comparison-kind]').getAttribute('data-marked-comparison-kind')).toBe('');
    ui.renderPhase(); ui.click(ui.node(node => node.props?.['data-marked-pose-action'] === 'check'));
    expect(ui.host.querySelector('[data-marked-comparison-kind]').getAttribute('data-marked-comparison-kind')).toBe('wing-only');
    expect(ui.state.flightStudyObservations).toBeUndefined();
  });

  it.each(['Step', 'Resume', 'Return'])('clears the opposite action after %s and rejects a retained stale handler', action => {
    const ui = fixture(); ui.choose(2); ui.renderPhase();
    if (action === 'Return') ui.click(ui.button('Mark wing pose'));
    const oldHandler = ui.oppositeNode().props.onClick;
    if (action === 'Step') ui.click(ui.button('Step wingbeat'));
    else if (action === 'Resume') ui.click(ui.button('Resume flight'));
    else ui.click(ui.node(node => node.props?.['data-marked-pose-action'] === 'return'));
    expect(ui.opposite().disabled).toBe(true); expect(ui.badge()).toBeNull();
    ui.writes.length = 0; const phase = ui.engine.wingStepPhase, time = ui.engine.time, serial = ui.engine.wingStepSerial;
    act(() => { oldHandler(); });
    expect(ui.writes).toEqual([]); expect([ui.engine.wingStepPhase, ui.engine.time, ui.engine.wingStepSerial]).toEqual([phase, time, serial]);
    expect(ui.announce).toHaveBeenLastCalledWith('Choose a numbered cycle position in a ready Study view first.');
  });

  it('disables a rebuilt-source action without rerendering the parent and guards its retained handler', async () => {
    const ui = fixture(); ui.follow(); ui.choose(2);
    await act(async () => { await Promise.resolve(); });
    const oldHandler = ui.oppositeNode().props.onClick, before = ui.renderCount, phase = ui.engine.wingStepPhase;
    ui.writes.length = 0;
    await act(async () => {
      ui.engine.flyers[0].uuid = 'rebuilt-opposite-source';
      ui.stage.setAttribute('data-flight-source-uuid', ui.engine.flyers[0].uuid); await Promise.resolve();
    });
    expect(ui.opposite().disabled).toBe(true); expect(ui.opposite().textContent).toBe('Compare opposite position');
    expect(ui.badge()).toBeNull(); expect(ui.renderCount).toBe(before); expect(ui.writes).toEqual([]);
    act(() => { oldHandler(); });
    expect(ui.writes).toEqual([]); expect(ui.engine.wingStepPhase).toBe(phase); expect(ui.renderCount).toBe(before);
  });

  it('rejects contextLost immediately and updates disabled state on the loss signal without a parent render', async () => {
    const ui = fixture(); ui.choose(2); await act(async () => { await Promise.resolve(); });
    const oldHandler = ui.oppositeNode().props.onClick, before = ui.renderCount, phase = ui.engine.wingStepPhase;
    ui.writes.length = 0; ui.engine.contextLost = true;
    expect(ui.stage.getAttribute('data-flight-ready')).toBe('true');
    act(() => { oldHandler(); }); expect(ui.writes).toEqual([]); expect(ui.engine.wingStepPhase).toBe(phase);
    await act(async () => {
      ui.stage.setAttribute('data-flight-error', 'true'); ui.stage.removeAttribute('data-flight-ready'); await Promise.resolve();
    });
    expect(ui.opposite().disabled).toBe(true); expect(ui.badge()).toBeNull(); expect(ui.renderCount).toBe(before);
    expect(ui.writes).toEqual([]);
  });

  it('reflects ready transitions locally and preserves a later opposite selection through an older Resume acknowledgement', async () => {
    const ui = fixture({ flightPaused: true }, { delayPause: true });
    await act(async () => { await Promise.resolve(); });
    ui.click(ui.button('Resume flight')); expect(ui.live.flightPaused).toBe(false); expect(ui.state.flightPaused).toBe(true);
    const before = ui.renderCount;
    await act(async () => { ui.stage.setAttribute('data-flight-ready', 'false'); await Promise.resolve(); });
    expect(ui.opposite().disabled).toBe(true); expect(ui.live.flightPaused).toBe(false); expect(ui.renderCount).toBe(before);
    await act(async () => { ui.stage.setAttribute('data-flight-ready', 'true'); await Promise.resolve(); });
    expect(ui.opposite().disabled).toBe(true); expect(ui.live.flightPaused).toBe(false); expect(ui.renderCount).toBe(before);
    ui.choose(2); ui.click(ui.oppositeNode()); expect(ui.live.flightStudyCyclePosition).toBe(6);
    ui.flushOne(); expect(ui.state.flightPaused).toBe(false); expect(ui.live.flightPaused).toBe(true);
    expect(ui.live.flightStudyCyclePosition).toBe(6); expect(ui.opposite().disabled).toBe(false);
  });

  it('keeps an open late-bootstrap scene disabled until an explicit checkpoint is selected', async () => {
    const ui = fixture({}, { deferReady: true }); await act(async () => { await Promise.resolve(); });
    const before = ui.renderCount; ui.writes.length = 0; expect(ui.opposite().disabled).toBe(true);
    await act(async () => {
      ui.engineRef.current = ui.engine; ui.stage.setAttribute('data-flight-ready', 'true'); await Promise.resolve();
    });
    expect(ui.opposite().disabled).toBe(true); expect(ui.renderCount).toBe(before); expect(ui.writes).toEqual([]);
    ui.choose(2); expect(ui.opposite().disabled).toBe(false); ui.click(ui.oppositeNode());
    expect(ui.live.flightStudyCyclePosition).toBe(6);
  });

  it('supports Monarch comparisons while preserving whole-insect notes and avoiding bird anatomy labels', () => {
    const observations = { drafts: { 'monarch:whole-wing': 'My butterfly observation.' }, records: {} };
    const ui = fixture({ flightSpecies: 'monarch', flightStudyObservations: observations }); ui.follow(1); ui.choose(6); ui.click(ui.oppositeNode());
    expect(ui.live.flightStudyCyclePosition).toBe(2); expect(ui.opposite().disabled).toBe(false);
    expect(ui.context().querySelector('[data-study-context-region]').textContent).toBe('Region: Whole-insect wing motion');
    expect(ui.context().textContent).not.toContain('Primary feathers'); expect(ui.side().getAttribute('data-study-context-side')).toBe('right');
    expect(ui.field().value).toBe('My butterfly observation.'); expect(ui.state.flightStudyObservations).toBe(observations);
    expect(ui.engine.markedWingPose.capturePose).not.toHaveBeenCalled();
  });

  it('disconnects the additional control readout when Study controls unmount', async () => {
    const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect');
    const ui = fixture(); ui.choose(2); await act(async () => { await Promise.resolve(); });
    const oldHandler = ui.oppositeNode().props.onClick, beforeDisconnects = disconnect.mock.calls.length;
    ui.set({ flightCamera: 'chase' }); expect(ui.opposite()).toBeNull(); expect(disconnect.mock.calls.length).toBeGreaterThan(beforeDisconnects);
    ui.writes.length = 0; const before = ui.renderCount, phase = ui.engine.wingStepPhase;
    await act(async () => { ui.stage.setAttribute('data-flight-ready', 'false'); await Promise.resolve(); });
    act(() => { oldHandler(); });
    expect(ui.renderCount).toBe(before); expect(ui.writes).toEqual([]); expect(ui.engine.wingStepPhase).toBe(phase);
  });
});


describe('Opposite comparison with pending manual-Step acknowledgements', () => {
  it.each([false, true])('preserves Step then choose 3 then opposite 7 before the old Step arrives (existing mark: %s)', existingMark => {
    const observations = { drafts: { 'canada_goose:inner-wing': 'My prediction remains my own.' }, records: {} };
    const investigation = { prediction: 'My separate investigation.' };
    const ui = fixture({ flightStudyYaw: 90, flightStudyPitch: 10, flightStudyZoom: 1.2,
      flightStudyObservations: observations, flightInvestigation: investigation }, { delayMulti: true });
    ui.follow(1);
    if (existingMark) { ui.choose(0); ui.renderPhase(); ui.click(ui.button('Mark wing pose')); }
    const marked = { ...ui.engine.markedWingPose.userData }, captures = ui.engine.markedWingPose.capturePose.mock.calls.length;
    const field = ui.field(); field.focus(); ui.writes.length = 0;
    ui.click(ui.button('Step wingbeat'));
    expect(ui.state.flightWingStep).toBe(19); expect(ui.live.flightWingStep).toBe(20); expect(ui.queued).toHaveLength(1);
    ui.choose(2); expect(ui.live.flightStudyCyclePosition).toBe(2); expect(ui.engine.wingStepSerial).toBe(20);
    ui.click(ui.oppositeNode()); expect(ui.live.flightStudyCyclePosition).toBe(6); expect(ui.opposite().disabled).toBe(false);
    const phase = ui.engine.wingStepPhase;
    ui.set({ flightWind: -7 });
    expect(ui.live.flightWingStep).toBe(20); expect(ui.live.flightStudyCyclePosition).toBe(6);
    expect(ui.state.flightWingStep).toBe(19); expect(ui.engine.wingStepPhase).toBe(phase);
    ui.flushOne(); expect(ui.state.flightWingStep).toBe(20); expect(ui.live.flightStudyCyclePosition).toBe(6);
    expect(ui.engine.wingStepSerial).toBe(20); expect(ui.engine.wingStepPhase).toBe(phase); expect(ui.engine.time).toBe(1.3);
    expect([ui.live.flightStudyYaw, ui.live.flightStudyPitch, ui.live.flightStudyZoom]).toEqual([90, 10, 1.2]);
    expect(ui.live.flightWingtipFollowSide).toBe(1); expect(ui.live.flightStudyRegion).toBe('inner-wing');
    expect(ui.engine.markedWingPose.userData).toEqual(marked); expect(ui.engine.markedWingPose.capturePose).toHaveBeenCalledTimes(captures);
    expect(ui.state.flightStudyObservations).toBe(observations); expect(ui.state.flightInvestigation).toBe(investigation);
    expect(ui.field()).toBe(field); expect(document.activeElement).toBe(field); expect(field.value).toBe('My prediction remains my own.');
    expect(ui.writes).toEqual([{ flightPaused: true, flightWingStep: 20 }, { flightPaused: true }, { flightPaused: true }]);
  });

  it.each([19, 1000000])('consumes actual queued serials in order, including wrap, without advancing the selected phase (start %s)', start => {
    const ui = fixture({ flightWingStep: start }, { delayMulti: true });
    const step = ui.button('Step wingbeat').props.onClick;
    act(() => { step(); step(); });
    const first = (start + 1) % 1000001, latest = (start + 2) % 1000001;
    expect(ui.queued).toEqual([{ flightPaused: true, flightWingStep: first }, { flightPaused: true, flightWingStep: latest }]);
    ui.choose(2); ui.click(ui.oppositeNode()); const phase = ui.engine.wingStepPhase;
    expect(ui.live.flightWingStep).toBe(latest); expect(ui.engine.wingStepSerial).toBe(latest); expect(ui.live.flightStudyCyclePosition).toBe(6);
    ui.flushOne(); expect(ui.state.flightWingStep).toBe(first); expect(ui.live.flightWingStep).toBe(latest);
    expect(ui.live.flightStudyCyclePosition).toBe(6); expect(ui.opposite().disabled).toBe(false); expect(ui.engine.wingStepPhase).toBe(phase);
    ui.flushOne(); expect(ui.state.flightWingStep).toBe(latest); expect(ui.live.flightWingStep).toBe(latest);
    expect(ui.live.flightStudyCyclePosition).toBe(6); expect(ui.engine.wingStepPhase).toBe(phase); expect(ui.engine.time).toBe(1.3);
  });

  it('holds the pending atomic Step pause across local renders but lets a later Resume defeat every older acknowledgement', () => {
    const ui = fixture({ flightPaused: false }, { delayMulti: true, delayPause: true });
    ui.click(ui.button('Step wingbeat')); ui.set({ flightStudyYaw: 90 });
    expect(ui.state.flightPaused).toBe(false); expect(ui.live.flightPaused).toBe(true); expect(ui.live.flightWingStep).toBe(20);
    ui.choose(2); ui.click(ui.oppositeNode()); expect(ui.live.flightStudyCyclePosition).toBe(6);
    ui.click(ui.button('Resume flight')); ui.set({ flightStudyZoom: 1.2 });
    expect(ui.live.flightPaused).toBe(false); expect(ui.live.flightStudyCyclePosition).toBeUndefined(); expect(ui.opposite().disabled).toBe(true);
    expect(ui.queued).toEqual([{ flightPaused: true, flightWingStep: 20 }, { flightPaused: true }, { flightPaused: true }, { flightPaused: false }]);
    for (let index = 0; index < 3; index++) {
      ui.flushOne(); expect(ui.state.flightPaused).toBe(true); expect(ui.live.flightPaused).toBe(false);
      expect(ui.live.flightWingStep).toBe(20); expect(ui.live.flightStudyCyclePosition).toBeUndefined(); expect(ui.opposite().disabled).toBe(true);
    }
    ui.flushOne(); expect(ui.state.flightPaused).toBe(false); expect(ui.live.flightPaused).toBe(false);
    ui.set({ flightWingStep: 21 }); expect(ui.live.flightWingStep).toBe(21); expect(ui.live.flightPaused).toBe(false);
    expect(ui.engine.markedWingPose.capturePose).not.toHaveBeenCalled();
  });

  it.each([
    ['individual', ui => { ui.set({ flightStudyBird: 1 }); }, ui => { ui.set({ flightStudyBird: 0 }); }],
    ['source UUID', ui => { ui.engine.flyers[0].uuid = 'new-pending-step-source'; ui.set({}); }, ui => { ui.engine.flyers[0].uuid = 'context-bird-0'; ui.set({}); }],
    ['context loss', ui => { ui.engine.contextLost = true; ui.set({}); }, ui => { ui.engine.contextLost = false; ui.set({}); }],
    ['unready scene', ui => { ui.stage.setAttribute('data-flight-ready', 'false'); ui.set({}); }, ui => { ui.stage.setAttribute('data-flight-ready', 'true'); ui.set({}); }]
  ])('cancels a pending serial for %s and never restores its old numbered selection', (_, change, restore) => {
    const ui = fixture({}, { delayMulti: true }); ui.click(ui.button('Step wingbeat')); ui.choose(2); ui.click(ui.oppositeNode());
    expect(ui.live.flightWingStep).toBe(20); expect(ui.live.flightStudyCyclePosition).toBe(6);
    const oldHandler = ui.oppositeNode().props.onClick;
    change(ui); expect(ui.live.flightWingStep).toBe(19); expect(ui.live.flightStudyCyclePosition).toBeUndefined(); expect(ui.opposite().disabled).toBe(true);
    restore(ui); ui.writes.length = 0; act(() => { oldHandler(); }); expect(ui.writes).toEqual([]);
    ui.choose(2); expect(ui.engine.wingStepSerial).toBe(19); expect(ui.live.flightStudyCyclePosition).toBe(2);
    ui.flushOne(); expect(ui.live.flightWingStep).toBe(20); expect(ui.live.flightStudyCyclePosition).toBeUndefined(); expect(ui.opposite().disabled).toBe(true);
    expect(ui.engine.markedWingPose.capturePose).not.toHaveBeenCalled();
  });

  it('revalidates a replaced source at click time before a fresh numbered choice can consume an old pending serial', () => {
    const ui = fixture({}, { delayMulti: true }); ui.click(ui.button('Step wingbeat')); ui.choose(2);
    expect(ui.live.flightWingStep).toBe(20); ui.engine.flyers[0].uuid = 'replacement-before-parent-render';
    ui.choose(2); expect(ui.engine.wingStepSerial).toBe(19); expect(ui.live.flightWingStep).toBe(19);
    expect(ui.live.flightStudyCyclePosition).toBe(2); expect(ui.opposite().disabled).toBe(false);
    ui.flushOne(); expect(ui.live.flightStudyCyclePosition).toBeUndefined(); expect(ui.opposite().disabled).toBe(true);
  });

  it.each([0, 19, 21])('releases serial ownership after acknowledgement so external serial %s invalidates the selection', next => {
    const ui = fixture({}, { delayMulti: true }); ui.click(ui.button('Step wingbeat')); ui.choose(2); ui.click(ui.oppositeNode()); ui.flushOne();
    expect(ui.state.flightWingStep).toBe(20); expect(ui.live.flightStudyCyclePosition).toBe(6);
    const oldHandler = ui.oppositeNode().props.onClick, phase = ui.engine.wingStepPhase;
    ui.set({ flightWingStep: next }); expect(ui.live.flightWingStep).toBe(next); expect(ui.live.flightStudyCyclePosition).toBeUndefined();
    expect(ui.opposite().disabled).toBe(true); ui.writes.length = 0; act(() => { oldHandler(); });
    expect(ui.writes).toEqual([]); expect(ui.engine.wingStepPhase).toBe(phase); expect(ui.engine.wingStepSerial).toBe(20);
  });

  it('lets a later manual Step end the comparison and create a separately acknowledged serial', () => {
    const ui = fixture({}, { delayMulti: true }); ui.click(ui.button('Step wingbeat')); ui.choose(2); ui.click(ui.oppositeNode()); ui.flushOne();
    expect(ui.live.flightStudyCyclePosition).toBe(6); ui.click(ui.button('Step wingbeat'));
    expect(ui.state.flightWingStep).toBe(20); expect(ui.live.flightWingStep).toBe(21); expect(ui.live.flightStudyCyclePosition).toBeUndefined();
    expect(ui.opposite().disabled).toBe(true); ui.choose(2); ui.click(ui.oppositeNode()); const phase = ui.engine.wingStepPhase;
    ui.flushOne(); expect(ui.state.flightWingStep).toBe(21); expect(ui.engine.wingStepSerial).toBe(21);
    expect(ui.live.flightStudyCyclePosition).toBe(6); expect(ui.engine.wingStepPhase).toBe(phase);
  });

  it.each(['recorded', 'matched-first', 'matched-second'])('clears an older pending Step before the deliberate %s manual-serial replay', replay => {
    const first = { speciesId: 'canada_goose', region: 'inner-wing', note: 'My saved inner-wing evidence.', bird: 0, yaw: 35, pitch: 15, zoom: 1, wingStep: 4, paused: true };
    const second = { ...first, region: 'primaries', note: 'My saved primary-feather evidence.', wingStep: 7 };
    const observations = { drafts: { 'canada_goose:inner-wing': 'My unrecorded draft.' }, records: { 'canada_goose:inner-wing': first, 'canada_goose:primaries': second } };
    const ui = fixture({ flightStudyObservations: observations }, { delayMulti: true });
    ui.click(ui.button('Step wingbeat')); ui.choose(2); ui.click(ui.oppositeNode()); expect(ui.live.flightWingStep).toBe(20);
    const action = replay === 'recorded' ? ui.node(node => node.props?.['data-study-revisit'] === 'observation')
      : ui.node(node => node.props?.['data-study-matched'] === (replay === 'matched-first' ? 'first' : 'second'));
    expect(action).not.toBeNull(); ui.click(action);
    expect(ui.live.flightWingStep).toBe(19); expect(ui.live.flightStudyCyclePosition).toBeUndefined(); expect(ui.opposite().disabled).toBe(true);
    expect(ui.queued).toHaveLength(2); ui.flushOne(); ui.flushOne(); const replaySerial = replay === 'recorded' ? 4 : 0;
    expect(ui.state.flightWingStep).toBe(replaySerial); expect(ui.live.flightWingStep).toBe(replaySerial);
    ui.choose(2); ui.click(ui.oppositeNode()); expect(ui.engine.wingStepSerial).toBe(replaySerial); expect(ui.live.flightStudyCyclePosition).toBe(6);
    expect(ui.state.flightStudyObservations).toBe(observations); expect(ui.engine.markedWingPose.capturePose).not.toHaveBeenCalled();
  });

  it('records the effective retained manual serial only when the learner explicitly records their note', () => {
    const evidence = 'My own observed difference between these two wing poses.';
    const observations = { drafts: { 'canada_goose:inner-wing': evidence }, records: {} };
    const investigation = { prediction: 'Keep my unrelated work.' };
    const ui = fixture({ flightStudyObservations: observations, flightInvestigation: investigation }, { delayMulti: true });
    ui.click(ui.button('Step wingbeat')); ui.choose(2); ui.click(ui.oppositeNode());
    expect(ui.state.flightWingStep).toBe(19); expect(ui.live.flightWingStep).toBe(20); expect(ui.live.flightStudyCyclePosition).toBe(6);
    expect(ui.state.flightStudyObservations).toBe(observations);
    expect(ui.writes.filter(patch => Object.hasOwn(patch, 'flightStudyObservations'))).toHaveLength(0);
    ui.click(ui.button('Record observation'));
    const recorded = ui.state.flightStudyObservations, record = recorded.records['canada_goose:inner-wing'];
    expect(record).toMatchObject({ note: evidence, wingStep: 20, paused: true, speciesId: 'canada_goose', region: 'inner-wing' });
    expect(ui.state.flightWingStep).toBe(19); expect(ui.live.flightStudyCyclePosition).toBe(6);
    expect(recorded.drafts['canada_goose:inner-wing']).toBe(evidence); expect(ui.state.flightInvestigation).toBe(investigation);
    for (const key of ['cyclePosition', 'oppositePosition', 'followedSide', 'flightStudyCyclePosition', 'flightWingtipFollowSide']) expect(record).not.toHaveProperty(key);
    expect(ui.writes.filter(patch => Object.hasOwn(patch, 'flightStudyObservations'))).toHaveLength(1);
    ui.flushOne(); expect(ui.state.flightWingStep).toBe(20); expect(ui.state.flightStudyObservations).toBe(recorded); expect(record.wingStep).toBe(20);
    expect(ui.engine.markedWingPose.capturePose).not.toHaveBeenCalled();
  });

  it('releases a residual Resume owner when a later external serial brings its own pause after Step acknowledgement', () => {
    const observations = { drafts: { 'canada_goose:inner-wing': 'Unchanged learner response.' }, records: {} };
    const ui = fixture({ flightStudyObservations: observations }, { delayMulti: true, delayPause: true });
    ui.click(ui.button('Step wingbeat')); ui.choose(2); ui.click(ui.oppositeNode()); ui.click(ui.button('Resume flight'));
    ui.flushOne(); expect(ui.state.flightWingStep).toBe(20); expect(ui.state.flightPaused).toBe(true); expect(ui.live.flightPaused).toBe(false);
    ui.set({ flightWingStep: 21, flightPaused: true });
    expect(ui.live.flightWingStep).toBe(21); expect(ui.live.flightPaused).toBe(true); expect(ui.live.flightStudyCyclePosition).toBeUndefined();
    expect(ui.opposite().disabled).toBe(true); expect(ui.state.flightStudyObservations).toBe(observations);
    ui.set({ flightWind: -3 }); expect(ui.live.flightWingStep).toBe(21); expect(ui.live.flightPaused).toBe(true);
    expect(ui.engine.markedWingPose.capturePose).not.toHaveBeenCalled();
  });


  it.each([false, true])('records a direct Step with a retained Record handler before any numbered choice, render or acknowledgement (initial pause %s)', paused => {
    const evidence = 'My direct wing-step observation.';
    const observations = { drafts: { 'canada_goose:inner-wing': evidence }, records: {} };
    const investigation = { prediction: 'Keep this investigation unchanged.' };
    const ui = fixture({ flightPaused: paused, flightStudyObservations: observations, flightInvestigation: investigation }, { delayMulti: true });
    const retainedRecord = ui.button('Record observation'), renders = ui.renderCount;
    ui.writes.length = 0; ui.click(ui.button('Step wingbeat'));
    expect(ui.renderCount).toBe(renders); expect(ui.state.flightWingStep).toBe(19); expect(ui.state.flightPaused).toBe(paused);
    expect(ui.live.flightWingStep).toBe(20); expect(ui.live.flightPaused).toBe(true); expect(ui.live.flightStudyCyclePosition).toBeUndefined();
    expect(ui.state.flightStudyObservations).toBe(observations); expect(ui.writes).toEqual([{ flightPaused: true, flightWingStep: 20 }]);
    ui.click(retainedRecord);
    const recorded = ui.state.flightStudyObservations, record = recorded.records['canada_goose:inner-wing'];
    expect(record).toMatchObject({ speciesId: 'canada_goose', region: 'inner-wing', note: evidence, wingStep: 20, paused: true });
    expect(Object.keys(record).sort()).toEqual(['speciesId', 'region', 'note', 'bird', 'yaw', 'pitch', 'zoom', 'wingStep', 'paused', 'motionReduced'].sort());
    expect(ui.state.flightWingStep).toBe(19); expect(ui.state.flightPaused).toBe(paused); expect(ui.live.flightStudyCyclePosition).toBeUndefined();
    expect(recorded.drafts['canada_goose:inner-wing']).toBe(evidence); expect(ui.state.flightInvestigation).toBe(investigation);
    expect(ui.writes.filter(patch => Object.hasOwn(patch, 'flightStudyObservations'))).toHaveLength(1);
    expect(ui.engine.markedWingPose.capturePose).not.toHaveBeenCalled();
    ui.flushOne(); expect(ui.state.flightWingStep).toBe(20); expect(ui.state.flightPaused).toBe(true);
    expect(ui.state.flightStudyObservations).toBe(recorded); expect(record.wingStep).toBe(20); expect(record.paused).toBe(true);
  });

});
