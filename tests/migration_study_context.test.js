import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = process.env.MIGRATION_STUDY_CONTEXT_CANDIDATE || 'stem_lab/stem_tool_migration.js';
const source = fs.readFileSync(path.join(process.cwd(), sourcePath), 'utf8').replace(/\r\n/g, '\n');
function section(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error('Missing current-study-context source: ' + start);
  return source.slice(first, last);
}
const num = new Function(section('  function migrNum(', '  // Sibling of migrNum') + '\nreturn migrNum;')();
const helpers = new Function('migrNum', section('      function migrationStudyCycleContext(', '      function renderFlight3D()') +
  '\nreturn { current: migrationStudyCurrentContext, select: selectMigrationStudyCyclePosition, followContext: migrationStudyWingtipFollowContext, follow: migrationStudyWingtipFollowTarget };')(num);
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
function pureFixture(speciesId = 'canada_goose') {
  const host = document.createElement('div'); document.body.append(host);
  const engine = makeEngine(host, { speciesId });
  const live = { tab: 'flight3d', flightSpecies: speciesId, flightCamera: 'study', flightPaused: true,
    flightShowWingtipPath: true, flightStudyBird: 0, flightWingStep: 19, flightStudyRegion: 'inner-wing',
    flightFormation: 'natural', flightSeason: 'fall' };
  const cycle = helpers.select(engine, live, 2);
  const follow = helpers.follow(engine, live, 0, helpers.followContext(engine, live));
  live.flightWingtipFollowSide = 0; live.flightWingtipFollowSourceUuid = follow.context.sourceBirdUuid;
  return { host, engine, live, cycle, follow, read() { return helpers.current(engine, live, cycle, follow); } };
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
  const stage = host.querySelector("[data-migration-id=\"migration-flight-stage\"]");
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
    context() { return host.querySelector("[data-migration-id=\"migration-study-current-context\"]"); },
    cycle() { return host.querySelector('[data-study-context-cycle]'); },
    side() { return host.querySelector('[data-study-context-side]'); },
    badge() { return host.querySelector('[data-study-stage-cycle-position]'); },
    field() { return host.querySelector("[data-migration-id=\"migration-study-observation-note\"]"); }
  };
  ui.set({}); return ui;
}

beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; resetStemLab(); tool = loadTool(sourcePath, 'migration'); });
afterEach(() => {
  act(() => { mounts.splice(0).forEach(root => root.unmount()); }); document.body.innerHTML = '';
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Read-only current 3D study context', () => {
  it('derives current explicit choices without writing model, pose or learner state', () => {
    const f = pureFixture();
    const before = JSON.stringify({ live: f.live, cycle: f.cycle, follow: f.follow, time: f.engine.time,
      phase: f.engine.wingStepPhase, serial: f.engine.wingStepSerial, sources: f.engine.flyers.map(bird => bird.uuid) });
    expect(f.read()).toEqual({ speciesId: 'canada_goose', individual: 0, region: 'inner-wing', cyclePosition: 2, followedSide: 0 });
    expect(JSON.stringify({ live: f.live, cycle: f.cycle, follow: f.follow, time: f.engine.time,
      phase: f.engine.wingStepPhase, serial: f.engine.wingStepSerial, sources: f.engine.flyers.map(bird => bird.uuid) })).toBe(before);
  });

  it.each([
    ['disposed', f => { f.engine.disposed = true; }],
    ['context lost', f => { f.engine.contextLost = true; }],
    ['not ready', f => { f.host.setAttribute('data-flight-ready', 'false'); }],
    ['scene error', f => { f.host.setAttribute('data-flight-error', 'true'); }],
    ['detached host', f => { f.host.remove(); }],
    ['wrong species', f => { f.engine.speciesId = 'arctic_tern'; }],
    ['wrong season', f => { f.live.flightSeason = 'spring'; }],
    ['wrong formation', f => { f.live.flightFormation = 'solo'; }],
    ['other camera', f => { f.live.flightCamera = 'chase'; }],
    ['other tab', f => { f.live.tab = 'inquiry'; }],
    ['missing individual', f => { f.live.flightStudyBird = 99; }],
    ['hidden flyer', f => { f.engine.flyers[0].visible = false; }],
    ['nonfinite clock', f => { f.engine.time = NaN; }],
    ['invalid bird region', f => { f.live.flightStudyRegion = 'whole-wing'; }]
  ])('withholds current context for %s rather than presenting stale viewing choices', (_, change) => {
    const f = pureFixture(); change(f); expect(f.read()).toBeNull();
  });

  it('drops old selections when the current individual source UUID is replaced', () => {
    const f = pureFixture(); f.engine.flyers[0].uuid = 'replacement-source';
    expect(f.read()).toEqual({ speciesId: 'canada_goose', individual: 0, region: 'inner-wing', cyclePosition: null, followedSide: null });
  });

  it('invalidates the old checkpoint when body time changes while retaining a valid followed wing', () => {
    const f = pureFixture(); f.engine.time += .1;
    expect(f.read()).toMatchObject({ cyclePosition: null, followedSide: 0 });
  });

  it.each([
    ['side', f => { f.live.flightWingtipFollowSide = 1; }],
    ['source provenance', f => { f.live.flightWingtipFollowSourceUuid = 'stale'; }]
  ])('does not claim a followed wing after %s changes', (_, change) => {
    const f = pureFixture(); change(f);
    expect(f.read()).toMatchObject({ cyclePosition: 2, followedSide: null });
  });

  it('keeps the current region available when paths are off but removes path-owned choices', () => {
    const f = pureFixture(); f.live.flightShowWingtipPath = false;
    expect(f.read()).toMatchObject({ region: 'inner-wing', cyclePosition: null, followedSide: null });
  });

  it('supports Monarch whole-insect context and valid followed side without bird anatomy labels', () => {
    const f = pureFixture('monarch');
    expect(f.read()).toEqual({ speciesId: 'monarch', individual: 0, region: 'whole-wing', cyclePosition: 2, followedSide: 0 });
  });

  it.each([0, 1, 2, 3, 4, 5, 6, 7])('shows explicit cycle choice %s in the Study context strip and beside the note', index => {
    const ui = fixture(); ui.follow(0); ui.choose(index);
    expect(ui.context().getAttribute('data-study-current-context')).toBe('ready');
    expect(ui.cycle().textContent).toBe('Cycle position ' + (index + 1) + ' of 8 selected.');
    expect(ui.badge().getAttribute('data-study-stage-cycle-position')).toBe(String(index));
    expect(ui.badge().textContent).toBe('Cycle ' + (index + 1) + '/8 selected');
    expect(ui.badge().closest('[data-scene-study-actions]')).not.toBeNull();
    expect(ui.badge().closest('.migration-flight-stage')).toBeNull();
    expect(ui.badge().closest('[aria-hidden="true"]')).toBeNull();
    expect(ui.side().getAttribute('data-study-context-side')).toBe('left');
    expect(ui.context().querySelector('[data-study-context-region]').textContent).toBe('Region: Inner wing');
    expect(ui.state.flightWingStep).toBe(19);
    expect(ui.context().querySelectorAll('input,textarea,select')).toHaveLength(0);
    const inspect = ui.context().querySelectorAll('button');
    expect(inspect).toHaveLength(1);
    expect(inspect[0].getAttribute('data-study-action')).toBe('inspect-current-view');
    expect(inspect[0].textContent).toBe('Inspect current 3D view');
    expect(inspect[0].disabled).toBe(false);
    expect(inspect[0].getAttribute('aria-controls')).toBe(ui.host.querySelector('[data-migration-id="migration-flight-stage"]').id);
    expect(ui.field().getAttribute('aria-describedby').split(/\s+/)).toContain(ui.host.querySelector('[data-migration-id="migration-study-current-context"]').id);
  });

  it('says no numbered choice is selected without inferring where the rendered wing lies', () => {
    const ui = fixture(); ui.follow(1);
    expect(ui.cycle().textContent).toBe('No numbered cycle position selected.');
    expect(ui.cycle().getAttribute('data-study-context-cycle')).toBe('none'); expect(ui.badge()).toBeNull();
    expect(ui.side().textContent).toBe('Followed wingtip: individual’s right.');
    expect(ui.context().textContent).not.toContain('Between numbered positions');
  });

  it('removes the explicit cycle caption after a manual Step even though numbered positions can still coincide', () => {
    const ui = fixture(); ui.follow(); ui.choose(2); ui.click(ui.button('Step wingbeat'));
    expect(ui.cycle().textContent).toBe('No numbered cycle position selected.'); expect(ui.badge()).toBeNull();
    expect(ui.state.flightWingStep).toBe(20); expect(ui.side().getAttribute('data-study-context-side')).toBe('left');
  });

  it('does not carry a numbered selection through Return wings to marked pose', () => {
    const ui = fixture(); ui.follow(); ui.choose(2); ui.click(ui.button('Mark wing pose')); ui.choose(6);
    ui.click(ui.node(node => node.props?.['data-marked-pose-action'] === 'return'));
    expect(ui.cycle().textContent).toBe('No numbered cycle position selected.'); expect(ui.badge()).toBeNull();
    expect(ui.side().getAttribute('data-study-context-side')).toBe('left'); expect(ui.state.flightWingStep).toBe(19);
  });

  it('removes the explicit selected caption when playback resumes', () => {
    const ui = fixture(); ui.choose(2); ui.click(ui.button('Resume flight'));
    expect(ui.state.flightPaused).toBe(false); expect(ui.badge()).toBeNull();
    expect(ui.cycle().textContent).toBe('No numbered cycle position selected.');
  });

  it('shows unavailable context and clears the selected cycle badge on context loss without rerendering controls', async () => {
    const ui = fixture(); ui.follow(); ui.choose(2);
    await act(async () => { await Promise.resolve(); });
    const before = ui.renderCount; ui.writes.length = 0;
    await act(async () => {
      ui.engine.contextLost = true; ui.stage.setAttribute('data-flight-error', 'true'); ui.stage.removeAttribute('data-flight-ready');
      await Promise.resolve();
    });
    expect(ui.context().getAttribute('data-study-current-context')).toBe('unavailable');
    expect(ui.context().textContent).toContain('unavailable until the Study scene is ready');
    expect(ui.context().querySelectorAll('[data-study-context-cycle],[data-study-context-side],[data-study-context-region]')).toHaveLength(0);
    expect(ui.badge()).toBeNull(); expect(ui.renderCount).toBe(before); expect(ui.writes).toEqual([]);
  });

  it('keeps note drafts, recorded work, pose and focus unchanged when the read-only context refreshes', () => {
    const observations = { drafts: { 'canada_goose:inner-wing': 'Keep my exact draft.' }, records: {} };
    const investigation = { prediction: 'Keep my prediction.' };
    const ui = fixture({ flightStudyObservations: observations, flightInvestigation: investigation }); ui.follow(); ui.choose(2);
    const field = ui.field(); field.focus(); ui.writes.length = 0;
    const before = { state: ui.state, time: ui.engine.time, phase: ui.engine.wingStepPhase, serial: ui.engine.wingStepSerial };
    ui.set({});
    expect(ui.writes).toEqual([]); expect(ui.state).toEqual(before.state);
    expect(ui.field()).toBe(field); expect(document.activeElement).toBe(field); expect(field.value).toBe('Keep my exact draft.');
    expect([ui.engine.time, ui.engine.wingStepPhase, ui.engine.wingStepSerial]).toEqual([before.time, before.phase, before.serial]);
    expect(ui.state.flightStudyObservations).toBe(observations); expect(ui.state.flightInvestigation).toBe(investigation);
  });

  it('keeps the current choice context with the selected-segment draft when Describe opens notes', () => {
    const observations = { drafts: { 'canada_goose:inner-wing': 'My own evidence.' }, records: {} };
    const ui = fixture({ flightStudyObservations: observations, flightStudyObservationOpen: false }); ui.follow(); ui.choose(2);
    const before = ui.context().textContent;
    ui.click(ui.node(node => node.props?.['data-study-action'] === 'describe-wing-segment'));
    expect(document.activeElement).toBe(ui.field()); expect(ui.field().value).toBe('My own evidence.');
    expect(ui.context().textContent).toBe(before); expect(ui.state.flightStudyObservations).toBe(observations);
    expect(ui.context().textContent).toContain('Record observation does not save the numbered cycle position or followed side');
  });

  it('records only the learner-authored existing note fields and leaves context viewing choices transient', () => {
    const observations = { drafts: { 'canada_goose:inner-wing': 'I compared positions 3 and 7.' }, records: {} };
    const ui = fixture({ flightStudyObservations: observations }); ui.follow(); ui.choose(2);
    ui.click(ui.button('Record observation'));
    const record = ui.state.flightStudyObservations.records['canada_goose:inner-wing'];
    expect(record.note).toBe('I compared positions 3 and 7.');
    expect(Object.keys(record).sort()).toEqual(['speciesId', 'region', 'note', 'bird', 'yaw', 'pitch', 'zoom', 'wingStep', 'paused', 'motionReduced'].sort());
    expect(record.wingStep).toBe(19); expect(record).not.toHaveProperty('cyclePosition'); expect(record).not.toHaveProperty('followedSide');
    expect(ui.cycle().textContent).toBe('Cycle position 3 of 8 selected.');
    expect(ui.state).not.toHaveProperty('flightStudyCurrentContext');
  });

  it('labels the mounted Monarch observation as whole-insect motion and preserves its own note', () => {
    const ui = fixture({ flightSpecies: 'monarch', flightStudyObservations: { drafts: { 'monarch:whole-wing': 'My butterfly observation.' }, records: {} } });
    ui.follow(1); ui.choose(6);
    expect(ui.context().querySelector('[data-study-context-region]').getAttribute('data-study-context-region')).toBe('whole-wing');
    expect(ui.context().querySelector('[data-study-context-region]').textContent).toBe('Region: Whole-insect wing motion');
    expect(ui.side().getAttribute('data-study-context-side')).toBe('right'); expect(ui.cycle().textContent).toBe('Cycle position 7 of 8 selected.');
    expect(ui.context().textContent).not.toContain('Primary feathers'); expect(ui.field().value).toBe('My butterfly observation.');
  });
  it('refreshes initially open notes when late engine bootstrap becomes ready without a learner interaction', async () => {
    const observations = { drafts: { 'canada_goose:inner-wing': 'Keep this open draft.' }, records: {} };
    const ui = fixture({ flightStudyObservations: observations }, { deferReady: true });
    await act(async () => { await Promise.resolve(); });
    expect(ui.context().getAttribute('data-study-current-context')).toBe('unavailable');
    ui.writes.length = 0; ui.field().focus();
    await act(async () => {
      ui.engineRef.current = ui.engine; ui.stage.setAttribute('data-flight-ready', 'true');
      await Promise.resolve();
    });
    expect(ui.context().getAttribute('data-study-current-context')).toBe('ready');
    expect(ui.cycle().textContent).toBe('No numbered cycle position selected.');
    expect(ui.field().value).toBe('Keep this open draft.'); expect(document.activeElement).toBe(ui.field());
    expect(ui.writes).toEqual([]); expect(ui.state.flightStudyObservations).toBe(observations);
  });

  it('refreshes a rebuilt source even when data-flight-ready stays true', async () => {
    const ui = fixture(); ui.follow(); ui.choose(2);
    await act(async () => { await Promise.resolve(); });
    const savedState = { ...ui.state }, before = ui.renderCount; ui.writes.length = 0; ui.field().focus();
    await act(async () => {
      ui.engine.flyers[0].uuid = 'newly-rebuilt-context-source';
      ui.stage.setAttribute('data-flight-source-uuid', ui.engine.flyers[0].uuid);
      await Promise.resolve();
    });
    expect(ui.context().getAttribute('data-study-current-context')).toBe('ready');
    expect(ui.cycle().textContent).toBe('No numbered cycle position selected.');
    expect(ui.side().textContent).toBe('No wingtip followed.'); expect(ui.badge()).toBeNull();
    expect(document.activeElement).toBe(ui.field()); expect(ui.writes).toEqual([]); expect(ui.state).toEqual(savedState);
    expect(ui.renderCount).toBe(before);
  });

  it('refreshes notes on a context-loss signal without needing a local selection state change', async () => {
    const ui = fixture();
    await act(async () => { await Promise.resolve(); });
    expect(ui.context().getAttribute('data-study-current-context')).toBe('ready'); ui.writes.length = 0;
    await act(async () => {
      ui.engine.contextLost = true; ui.stage.setAttribute('data-flight-error', 'true'); ui.stage.removeAttribute('data-flight-ready');
      await Promise.resolve();
    });
    expect(ui.context().getAttribute('data-study-current-context')).toBe('unavailable');
    expect(ui.context().querySelector('[data-study-context-region]')).toBeNull(); expect(ui.badge()).toBeNull();
    expect(ui.writes).toEqual([]);
  });

  it('does not rerender for repeated readiness values or unrelated frame attributes', async () => {
    const ui = fixture();
    await act(async () => { await Promise.resolve(); });
    const before = ui.renderCount; ui.writes.length = 0;
    await act(async () => {
      for (let index = 0; index < 20; index++) {
        ui.stage.setAttribute('data-flight-ready', 'true'); ui.stage.setAttribute('data-study-view', 'true');
      }
      await Promise.resolve();
    });
    expect(ui.renderCount).toBe(before); expect(ui.writes).toEqual([]);
  });

  it('disconnects its stage observer when the lab unmounts', async () => {
    const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect');
    const ui = fixture(); await act(async () => { await Promise.resolve(); });
    const mounted = mounts.pop(); act(() => { mounted.unmount(); });
    expect(disconnect).toHaveBeenCalled();
    const before = ui.renderCount;
    await act(async () => { ui.stage.setAttribute('data-flight-ready', 'false'); await Promise.resolve(); });
    expect(ui.renderCount).toBe(before);
  });

  it('keeps pending Resume intent and the latest checkpoint intact through genuine readiness notifications', async () => {
    const ui = fixture({ flightPaused: true }, { delayPause: true });
    await act(async () => { await Promise.resolve(); });
    ui.click(ui.button('Resume flight'));
    expect(ui.live.flightPaused).toBe(false); expect(ui.state.flightPaused).toBe(true);
    const before = ui.renderCount;
    await act(async () => { ui.stage.setAttribute('data-flight-ready', 'false'); await Promise.resolve(); });
    expect(ui.context().getAttribute('data-study-current-context')).toBe('unavailable');
    expect(ui.live.flightPaused).toBe(false); expect(ui.renderCount).toBe(before);
    await act(async () => { ui.stage.setAttribute('data-flight-ready', 'true'); await Promise.resolve(); });
    expect(ui.context().getAttribute('data-study-current-context')).toBe('ready');
    expect(ui.live.flightPaused).toBe(false); expect(ui.renderCount).toBe(before);
    ui.choose(5); expect(ui.live.flightPaused).toBe(true);
    expect(ui.cycle().textContent).toBe('Cycle position 6 of 8 selected.');
    ui.flushOne(); expect(ui.state.flightPaused).toBe(false); expect(ui.live.flightPaused).toBe(true);
    expect(ui.cycle().textContent).toBe('Cycle position 6 of 8 selected.');
    ui.flushOne(); expect(ui.state.flightPaused).toBe(true); expect(ui.live.flightPaused).toBe(true);
    expect(ui.state).not.toHaveProperty('flightStudyCurrentContext');
  });

  it('keeps a pending manual Step serial through readiness notifications without rerendering the tool parent', async () => {
    const ui = fixture({ flightPaused: true, flightWingStep: 19 }, { delayMulti: true });
    await act(async () => { await Promise.resolve(); });
    ui.click(ui.button('Step wingbeat'));
    expect(ui.live.flightWingStep).toBe(20); expect(ui.state.flightWingStep).toBe(19);
    const before = ui.renderCount, queued = ui.queued.slice(), phase = ui.engine.wingStepPhase;
    await act(async () => { ui.stage.setAttribute('data-flight-ready', 'false'); await Promise.resolve(); });
    expect(ui.context().getAttribute('data-study-current-context')).toBe('unavailable');
    expect(ui.live.flightWingStep).toBe(20); expect(ui.renderCount).toBe(before);
    await act(async () => { ui.stage.setAttribute('data-flight-ready', 'true'); await Promise.resolve(); });
    expect(ui.context().getAttribute('data-study-current-context')).toBe('ready');
    expect(ui.live.flightWingStep).toBe(20); expect(ui.renderCount).toBe(before);
    expect(ui.queued).toEqual(queued); expect(ui.engine.wingStepPhase).toBe(phase);
    expect(ui.cycle().textContent).toBe('No numbered cycle position selected.');
    ui.flushOne(); expect(ui.state.flightWingStep).toBe(20); expect(ui.live.flightWingStep).toBe(20);
  });

});
