import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = process.env.MIGRATION_CYCLE_CANDIDATE || 'stem_lab/stem_tool_migration.js';
const source = fs.readFileSync(path.join(process.cwd(), sourcePath), 'utf8').replace(/\r\n/g, '\n');
function section(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error('Missing canonical cycle position section: ' + start);
  return source.slice(first, last);
}
const num = new Function(section('  function migrNum(', '  // Sibling of migrNum') + '\nreturn migrNum;')();
const cycle = new Function('migrNum', section('      function migrationStudyCycleContext(', '      function renderFlight3D()') +
  '\nreturn { select: selectMigrationStudyCyclePosition, matches: migrationStudyCyclePositionMatches };')(num);
const advance = new Function('engineNow', 'live', 'migrNum', section('          var studyBirdIndex =', '          engineNow.flockRoot.position.x'));
const installLoss = new Function('renderer', 'cancelMigrationStudyPreview', 'engine', 'host', 'statusNode', 't',
  'studyCyclePositionState', '_liveVals', '_f3dStudyCyclePauseRef', 'studyWingtipFollowState', '_f3dStudyStepAckRef',
  section("          renderer.domElement.addEventListener('webglcontextlost'", "          host.setAttribute('data-flight-ready', 'true');"));
const tau = Math.PI * 2;
const normalize = value => ((value % tau) + tau) % tau;
const { act } = React;
const mounts = [];
let tool;

function walk(node, predicate, output = []) {
  if (!node || typeof node !== 'object') return output;
  if (Array.isArray(node)) { node.forEach(child => walk(child, predicate, output)); return output; }
  if (predicate(node)) output.push(node);
  walk(node.props?.children, predicate, output); return output;
}
function fakeEngine(host, values = {}) {
  host.setAttribute('data-flight-ready', 'true');
  const flyers = Array.from({ length: 9 }, (_, individual) => ({ uuid: 'cycle-bird-' + individual, visible: true,
    position: { y: 0 }, rotation: { z: 0 }, userData: { phase: 1.91 + individual * 0.27, flapRate: 5.3 + individual * 0.11, baseY: 1,
      applyWingPhase: vi.fn() } }));
  return { host, flyers, time: 2.37, wingStepSerial: 14, wingStepPhase: 1.1,
    speciesId: 'canada_goose', formationMode: 'natural', season: 'fall',
    markedWingPose: { capturePose: () => true, clearPose: vi.fn() }, wingtipPath: { invalidate: vi.fn() }, ...values };
}
function pureFixture(values = {}) {
  const host = document.createElement('div'); document.body.append(host);
  const engine = fakeEngine(host);
  const live = { tab: 'flight3d', flightCamera: 'study', flightShowWingtipPath: true, flightPaused: false,
    flightSpecies: 'canada_goose', flightFormation: 'natural', flightSeason: 'fall', flightStudyBird: 2, flightWingStep: 14, ...values };
  return { engine, live, frame() { advance(engine, live, num); } };
}
function fixture(seed = {}, options = {}) {
  let state = { tab: 'flight3d', flightCamera: 'study', flightShowWingtipPath: true, flightWingStep: 14, ...seed }, tree, refresh;
  const writes = [], queued = [], refs = [], states = [], announce = vi.fn();
  const tracedReact = { ...React, useRef(value) {
    const ref = React.useRef(value); if (!refs.includes(ref)) refs.push(ref); return ref;
  }, useState(value) {
    const result = React.useState(value); if (!states.some(item => item[1] === result[1])) states.push(result); return result;
  } };
  const ctx = makeCtx({ React: tracedReact, announceToSR: announce,
    update: (_, key, value) => {
      writes.push({ [key]: value });
      if (options.delayPause && key === 'flightPaused') { queued.push({ [key]: value }); return; }
      state = { ...state, [key]: value }; refresh(value => value + 1);
    }, updateMulti: (_, values) => { writes.push(values); state = { ...state, ...values }; refresh(value => value + 1); }
  });
  const host = document.createElement('div'); document.body.append(host);
  const root = ReactDOMClient.createRoot(host); mounts.push(root);
  function Component() {
    refresh = React.useState(0)[1]; ctx.toolData = { migration: state }; tree = tool.render(ctx); return tree;
  }
  act(() => { root.render(React.createElement(Component)); });
  const stage = host.querySelector('#migration-flight-stage');
  const engineRef = refs[refs.findIndex(ref => ref.current === stage) + 1];
  const engine = fakeEngine(stage, { speciesId: state.flightSpecies || 'canada_goose', formationMode: state.flightFormation || 'natural',
    season: state.flightSeason || 'fall', wingStepSerial: state.flightWingStep });
  engineRef.current = engine;
  const liveRef = refs.find(ref => ref.current && typeof ref.current === 'object' && 'flightSpeedValues' in ref.current);
  const ui = {
    host, engine, engineRef, liveRef, refs, states, writes, announce,
    get state() { return state; }, get live() { return liveRef.current; },
    node(predicate) { return walk(tree, predicate)[0] || null; },
    button(text) { return ui.node(node => node.type === 'button' && node.props.children === text); },
    positions() { return walk(tree, node => node.props?.['data-study-cycle-position'] != null); },
    position(index) { return ui.node(node => node.props?.['data-study-cycle-position'] === index); },
    click(node) { act(() => { node.props.onClick(); }); },
    choose(index) { ui.click(ui.position(index)); },
    set(values) { act(() => { state = { ...state, ...values }; refresh(value => value + 1); }); },
    flushOne() { act(() => { state = { ...state, ...queued.shift() }; refresh(value => value + 1); }); },
    frame() { advance(engine, liveRef.current, num); },
    dispose() { act(() => { root.unmount(); }); mounts.splice(mounts.indexOf(root), 1); host.remove(); }
  };
  ui.set({}); return ui;
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; resetStemLab(); tool = loadTool(sourcePath, 'migration');
});
afterEach(() => {
  act(() => { mounts.splice(0).forEach(root => root.unmount()); });
  document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Study exact illustrative cycle positions', () => {
  it.each([0, 1, 2, 3, 4, 5, 6, 7])('applies checkpoint %i through the real wing RAF at nonzero time and individual phase', index => {
    const f = pureFixture(), originalTime = f.engine.time, serial = f.live.flightWingStep;
    const selected = cycle.select(f.engine, f.live, index);
    expect(selected).toMatchObject({ index, manualStep: serial, sourceBirdUuid: 'cycle-bird-2', engineTime: originalTime });
    expect(f.live.flightPaused).toBe(true); expect(f.live.flightWingStep).toBe(serial); expect(f.engine.time).toBe(originalTime);
    f.frame(); const phase = f.engine.flyers[2].userData.applyWingPhase.mock.lastCall[0];
    expect(Math.cos(phase)).toBeCloseTo(Math.cos(index * tau / 8), 10);
    expect(Math.sin(phase)).toBeCloseTo(Math.sin(index * tau / 8), 10);
    expect(cycle.matches(selected, f.engine, f.live)).toBe(true);
  });

  it('lets the latest checkpoint consume earlier queued steps without resetting body time or the manual serial', () => {
    const f = pureFixture({ flightWingStep: 20 }); f.engine.wingStepSerial = 14;
    cycle.select(f.engine, f.live, 1); const selected = cycle.select(f.engine, f.live, 6);
    expect(f.engine.wingStepSerial).toBe(20); expect(f.live.flightWingStep).toBe(20); f.frame();
    expect(normalize(f.engine.flyers[2].userData.applyWingPhase.mock.lastCall[0])).toBeCloseTo(6 * tau / 8, 10);
    expect(selected.index).toBe(6); expect(f.engine.time).toBe(2.37);
  });

  it('retains later wrapped and batched Step wingbeat intent after a selected checkpoint', () => {
    for (const [nextSerial, steps] of [[0, 1], [2, 3]]) {
      const f = pureFixture({ flightWingStep: 1000000 });
      const selected = cycle.select(f.engine, f.live, 4); f.live.flightWingStep = nextSerial; f.frame();
      const phase = f.engine.flyers[2].userData.applyWingPhase.mock.lastCall[0];
      expect(Math.cos(phase)).toBeCloseTo(Math.cos((4 + steps) * tau / 8), 10);
      expect(Math.sin(phase)).toBeCloseTo(Math.sin((4 + steps) * tau / 8), 10);
      expect(cycle.matches(selected, f.engine, f.live)).toBe(false);
    }
  });

  it('rejects unavailable, stale, hidden or malformed scene contexts without mutation', () => {
    const changes = [f => { f.engine.disposed = true; }, f => { f.engine.host.removeAttribute('data-flight-ready'); },
      f => { f.engine.host.setAttribute('data-flight-error', 'true'); }, f => { f.engine.speciesId = 'monarch'; },
      f => { f.engine.formationMode = 'solo'; }, f => { f.engine.season = 'spring'; }, f => { f.engine.flyers[2].visible = false; },
      f => { f.engine.time = NaN; }, f => { f.live.flightCamera = 'chase'; }, f => { f.live.tab = 'inquiry'; },
      f => { f.live.flightShowWingtipPath = false; }, f => { f.live.flightStudyBird = -1; }];
    for (const change of changes) {
      const f = pureFixture(); change(f); const original = { serial: f.engine.wingStepSerial, phase: f.engine.wingStepPhase, paused: f.live.flightPaused };
      expect(cycle.select(f.engine, f.live, 3)).toBeNull();
      expect({ serial: f.engine.wingStepSerial, phase: f.engine.wingStepPhase, paused: f.live.flightPaused }).toEqual(original);
    }
    const f = pureFixture(); for (const index of [-1, 8, 1.5, '2', NaN]) expect(cycle.select(f.engine, f.live, index)).toBeNull();
    expect(cycle.select(null, f.live, 0)).toBeNull();
  });

  it('offers eight labeled native controls only while Study paths are enabled', () => {
    const ui = fixture(); expect(ui.positions()).toHaveLength(8);
    for (const [index, button] of ui.positions().entries()) {
      expect(button.type).toBe('button'); expect(button.props.type).toBe('button');
      expect(button.props.children).toBe(index + 1); expect(button.props['aria-label']).toBe(`Cycle position ${index + 1} of 8`);
      expect(button.props['aria-pressed']).toBe('false'); expect(button.props['aria-controls']).toBe('migration-flight-stage');
      expect(button.props['aria-describedby']).toBe('migration-study-cycle-help');
    }
    expect(ui.host.textContent).toContain('Predict how positions 3 and 7 will differ');
    expect(ui.host.textContent).toContain('use Compare opposite position to switch between 3 and 7');
    expect(ui.host.textContent).toContain('predict whether live dots will meet marked diamonds when you return to 3');
    expect(ui.host.textContent).toContain('describe your evidence in the existing notes');
    expect(ui.host.textContent).toContain('Write the position numbers in your note');
    ui.set({ flightShowWingtipPath: false }); expect(ui.positions()).toHaveLength(0);
    ui.set({ flightShowWingtipPath: true, flightCamera: 'chase' }); expect(ui.positions()).toHaveLength(0);
  });

  it('uses the real native handler to select a pose while retaining all work, camera settings and marked geometry', () => {
    const observations = { drafts: { 'canada_goose:primaries': 'My prediction.' }, records: {} };
    const investigation = { prediction: 'Wind prediction.' }, challenges = { work: { wind: { notes: 'Challenge evidence.' } } };
    const ui = fixture({ flightStudyObservations: observations, flightInvestigation: investigation, flightChallenges: challenges,
      flightStudyYaw: 90, flightStudyPitch: 10, flightStudyZoom: 1.2, flightWind: -7 });
    ui.choose(0); ui.frame(); ui.click(ui.node(node => node.props?.['data-marked-pose-action'] === 'mark'));
    const markedStatus = ui.node(node => node.props?.['data-marked-pose-status']).props['data-marked-pose-status'];
    ui.writes.length = 0; ui.choose(4); ui.frame();
    expect(ui.writes).toEqual([{ flightPaused: true }]); expect(ui.position(4).props['aria-pressed']).toBe('true');
    expect(ui.live.flightStudyCyclePosition).toBe(4); expect(ui.host.textContent).toContain('Larger rings: selected position');
    expect(ui.node(node => node.props?.['data-marked-pose-status']).props['data-marked-pose-status']).toBe(markedStatus);
    expect(ui.state).toMatchObject({ flightStudyYaw: 90, flightStudyPitch: 10, flightStudyZoom: 1.2, flightWind: -7, flightWingStep: 14 });
    expect(ui.state.flightStudyObservations).toBe(observations); expect(ui.state.flightInvestigation).toBe(investigation); expect(ui.state.flightChallenges).toBe(challenges);
    expect(Object.keys(ui.state).some(key => /cycle/i.test(key))).toBe(false);
  });

  it('retains a position through orbit, zoom and viewpoint changes but clears it for manual stepping', () => {
    const ui = fixture(); ui.choose(2);
    ui.set({ flightStudyYaw: -90, flightStudyPitch: 50, flightStudyZoom: 1.3 }); expect(ui.position(2).props['aria-pressed']).toBe('true');
    ui.click(ui.node(node => node.props?.['data-study-viewpoint'] === 'above')); expect(ui.position(2).props['aria-pressed']).toBe('true');
    ui.click(ui.button('Step wingbeat')); expect(ui.positions().every(button => button.props['aria-pressed'] === 'false')).toBe(true);
    expect(ui.live.flightStudyCyclePosition).toBeUndefined(); ui.frame();
    expect(normalize(ui.engine.flyers[0].userData.applyWingPhase.mock.lastCall[0])).toBeCloseTo(3 * tau / 8, 10);
  });

  it('clears selection on Resume and does not revive it when paused again', () => {
    const ui = fixture(); ui.choose(1); ui.click(ui.button('Resume flight'));
    expect(ui.positions().every(button => button.props['aria-pressed'] === 'false')).toBe(true);
    ui.click(ui.button('Pause flight')); expect(ui.positions().every(button => button.props['aria-pressed'] === 'false')).toBe(true);
  });

  it('holds exact phase and displays Resume while a requested pause waits for the host store', () => {
    const ui = fixture({}, { delayPause: true }); ui.choose(3);
    expect(ui.state.flightPaused).toBeUndefined(); expect(ui.live.flightPaused).toBe(true); expect(ui.button('Resume flight')).not.toBeNull();
    expect(ui.position(3).props['aria-pressed']).toBe('true'); ui.frame();
    expect(normalize(ui.engine.flyers[0].userData.applyWingPhase.mock.lastCall[0])).toBeCloseTo(3 * tau / 8, 10);
    ui.set({ flightStudyYaw: 90 }); expect(ui.live.flightPaused).toBe(true); expect(ui.position(3).props['aria-pressed']).toBe('true');
    ui.flushOne(); expect(ui.state.flightPaused).toBe(true); expect(ui.position(3).props['aria-pressed']).toBe('true');
  });

  it('lets an explicit Resume cancel pending pause selection and rejects a late pause acknowledgement as a new selection', () => {
    const ui = fixture({}, { delayPause: true }); ui.choose(3); ui.click(ui.button('Resume flight'));
    expect(ui.live.flightPaused).toBe(false); expect(ui.live.flightStudyCyclePosition).toBeUndefined();
    ui.flushOne(); expect(ui.state.flightPaused).toBe(true); expect(ui.positions().every(button => button.props['aria-pressed'] === 'false')).toBe(true);
    ui.flushOne(); expect(ui.state.flightPaused).toBe(false); expect(ui.live.flightStudyCyclePosition).toBeUndefined();
  });

  it('retains the latest checkpoint through an older queued Resume acknowledgement', () => {
    const ui = fixture({ flightPaused: true }, { delayPause: true });
    ui.click(ui.button('Resume flight')); expect(ui.live.flightPaused).toBe(false);
    ui.choose(5); expect(ui.live.flightPaused).toBe(true); expect(ui.position(5).props['aria-pressed']).toBe('true');
    ui.flushOne(); expect(ui.state.flightPaused).toBe(false); expect(ui.live.flightPaused).toBe(true);
    expect(ui.position(5).props['aria-pressed']).toBe('true'); expect(ui.button('Resume flight')).not.toBeNull();
    ui.frame(); expect(normalize(ui.engine.flyers[0].userData.applyWingPhase.mock.lastCall[0])).toBeCloseTo(5 * tau / 8, 10);
    ui.flushOne(); expect(ui.state.flightPaused).toBe(true); expect(ui.position(5).props['aria-pressed']).toBe('true');
    ui.click(ui.button('Resume flight')); expect(ui.live.flightStudyCyclePosition).toBeUndefined();
  });

  it('clears stale selections for changed species, individual, formation, season, path, camera, source UUID or frame time', () => {
    const changes = [{ flightSpecies: 'monarch' }, { flightStudyBird: 1 }, { flightFormation: 'solo' }, { flightSeason: 'spring' },
      { flightShowWingtipPath: false }, { flightCamera: 'chase' }];
    for (const changed of changes) {
      const ui = fixture(); ui.choose(0); ui.set(changed);
      expect(ui.live.flightStudyCyclePosition).toBeUndefined();
      ui.set({ flightSpecies: 'canada_goose', flightStudyBird: 0, flightFormation: 'natural', flightSeason: 'fall', flightShowWingtipPath: true, flightCamera: 'study' });
      expect(ui.positions().every(button => button.props['aria-pressed'] === 'false')).toBe(true);
      ui.dispose();
    }
    const ui = fixture(); ui.choose(0); ui.engine.flyers[0].uuid = 'replacement-bird'; ui.set({});
    expect(ui.live.flightStudyCyclePosition).toBeUndefined(); ui.choose(1); ui.engine.time += 0.01; ui.set({});
    expect(ui.positions().every(button => button.props['aria-pressed'] === 'false')).toBe(true);
  });

  it('clears a selection when revisiting a saved observation even if its camera and manual step match', () => {
    const ui = fixture({ flightStudyRegion: 'primaries', flightStudyObservationOpen: true,
      flightStudyObservations: { records: { 'canada_goose:primaries': { speciesId: 'canada_goose', region: 'primaries', note: 'Saved note.',
        bird: 0, yaw: 35, pitch: 15, zoom: 1, wingStep: 14, paused: true } } } });
    ui.choose(2); ui.click(ui.node(node => node.props?.['data-study-revisit'] === 'observation'));
    expect(ui.positions().every(button => button.props['aria-pressed'] === 'false')).toBe(true);
    expect(ui.live.flightStudyCyclePosition).toBeUndefined();
  });

  it('rejects a not-ready scene without persisting pause or claiming a selected position', () => {
    const ui = fixture(); ui.engine.host.removeAttribute('data-flight-ready'); ui.writes.length = 0; ui.choose(6);
    expect(ui.writes).toEqual([]); expect(ui.positions().every(button => button.props['aria-pressed'] === 'false')).toBe(true);
    expect(ui.announce).toHaveBeenCalledWith(expect.stringContaining('Wait until the Study scene is ready'));
  });

  it('clears local selection and pause intent directly in the real context-loss listener', () => {
    const f = pureFixture(), clear = vi.fn(), selectionState = [{ index: 2 }, clear], liveRef = { current: f.live }, pauseRef = { current: { index: 2 } };
    const canvas = document.createElement('canvas'); f.engine.host.append(canvas); f.live.flightStudyCyclePosition = 2;
    const stepAckRef = { current: { pending: { manualStep: 20 } } };
    installLoss({ domElement: canvas }, vi.fn(), f.engine, f.engine.host, document.createElement('div'), (_, fallback) => fallback,
      selectionState, liveRef, pauseRef, [null, vi.fn()], stepAckRef);
    const loss = new Event('webglcontextlost', { cancelable: true }); canvas.dispatchEvent(loss);
    expect(stepAckRef.current.pending).toBeNull();
    expect(loss.defaultPrevented).toBe(true); expect(clear).toHaveBeenCalledWith(null); expect(pauseRef.current).toBeNull();
    expect(f.live.flightStudyCyclePosition).toBeUndefined(); expect(f.engine.host.hasAttribute('data-flight-ready')).toBe(false);
  });
});
