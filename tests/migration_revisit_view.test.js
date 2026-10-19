import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let tool;
function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const hit = find(child, predicate); if (hit) return hit; } return null; }
  return predicate(node) ? node : find(node.props?.children, predicate);
}
function recorded(speciesId = 'canada_goose', region = 'head', values = {}) {
  return { speciesId, region, note: 'A saved shape observation.', bird: 2, yaw: 90, pitch: 10, zoom: 1.2, wingStep: 3, paused: false, motionReduced: false, ...values };
}
function fixture(seed = {}) {
  let state = { tab: 'flight3d', flightCamera: 'study', flightStudyObservationOpen: true, ...seed }, tree;
  const writes = [], announce = vi.fn();
  const ctx = makeCtx({ announceToSR: announce, update: (_, key, value) => { writes.push({ [key]: value }); state = { ...state, [key]: value }; }, updateMulti: (_, patch) => { writes.push(patch); state = { ...state, ...patch }; } });
  const ui = {
    get state() { return state; }, writes, announce,
    render() { ctx.toolData = { migration: state }; function Component() { tree = tool.render(ctx); return tree; } return ReactDOMServer.renderToStaticMarkup(React.createElement(Component)); },
    node(predicate) { return find(tree, predicate); },
    action(source) { return ui.node(node => node.props?.['data-study-revisit'] === source); },
    revisit(source) { ui.action(source).props.onClick(); },
    set(values) { state = { ...state, ...values }; ui.render(); }
  };
  ui.render(); return ui;
}
function comparison(first = recorded(), second = recorded('arctic_tern', 'tail', { bird: 1, yaw: 0, pitch: 60, zoom: .85, wingStep: 6, paused: true })) {
  return { firstKey: first.speciesId + ':' + first.region, secondKey: second.speciesId + ':' + second.region, first, second, claim: 'Saved evidence from both views.' };
}
beforeEach(() => { resetStemLab(); tool = loadTool('stem_lab/stem_tool_migration.js', 'migration'); });
afterEach(() => { window.dispatchEvent(new Event('blur')); document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Migration recorded view revisit actions', () => {
  it('offers native revisit actions for recorded evidence and explains the paused illustrative baseline', () => {
    const empty = fixture(); expect(empty.action('observation')).toBeNull();
    const ui = fixture({ flightStudyObservations: { records: { 'canada_goose:head': recorded() } } });
    expect(ui.action('observation').type).toBe('button');
    expect(ui.action('observation').props.type).toBe('button');
    expect(ui.action('observation').props.children).toBe('Revisit recorded view');
    expect(ui.action('observation').props['aria-describedby']).toBe('migration-study-revisit-help');
    expect(ui.render()).toContain('The original animation frame was not recorded');
    expect(ui.node(node => node.props?.['data-study-revisit-status'] != null).props.role).toBe('status');
    const chase = fixture({ flightCamera: 'chase', flightStudyObservations: { records: { 'canada_goose:head': recorded() } } });
    expect(chase.action('observation')).toBeNull();
  });

  it('restores saved camera settings and pauses while preserving draft, notebook, weather, and inquiry data by reference', () => {
    const notebook = { drafts: { 'canada_goose:head': 'An unfinished revision.' }, records: { 'canada_goose:head': recorded() }, comparison: { draft: 'Unfinished comparison.' } };
    const investigation = { prediction: 'Keep this wind evidence.', trials: [] }, challenges = { selected: 'wind', results: {} };
    const ui = fixture({ flightStudyYaw: -80, flightStudyPitch: 50, flightStudyZoom: .7, flightStudyBird: 0, flightWingStep: 12, flightWind: -9, flightSeason: 'spring', flightFormation: 'natural', flightInvestigation: investigation, flightChallenges: challenges, flightStudyObservations: notebook });
    const host = document.createElement('div'); host.id = 'migration-flight-stage'; host.tabIndex = 0; document.body.append(host);
    ui.revisit('observation');
    expect(ui.writes).toHaveLength(1);
    expect(ui.writes[0]).toEqual({ flightSpecies: 'canada_goose', flightCamera: 'study', flightPaused: true, flightStudyRegion: 'head', flightStudyBird: 2, flightStudyYaw: 90, flightStudyPitch: 10, flightStudyZoom: 1.2, flightWingStep: 3, flightShowAnatomy: true, flightStudyObservationOpen: true });
    expect(ui.state.flightStudyObservations).toBe(notebook); expect(ui.state.flightInvestigation).toBe(investigation); expect(ui.state.flightChallenges).toBe(challenges);
    expect(ui.state.flightWind).toBe(-9); expect(ui.state.flightSeason).toBe('spring'); expect(ui.state.flightFormation).toBe('natural');
    expect(document.activeElement).toBe(host);
    expect(ui.announce).toHaveBeenLastCalledWith(expect.stringContaining('Recorded state: Running.'));
    expect(ui.announce).toHaveBeenLastCalledWith(expect.stringContaining('original animation frame was not recorded'));
  });

  it('revisits the first captured comparison snapshot even when its source observation was revised', () => {
    const saved = comparison();
    const notebook = { records: { 'canada_goose:head': recorded('canada_goose', 'head', { yaw: -90, note: 'A newer note.' }), 'arctic_tern:tail': saved.second }, comparison: { saved, draft: 'Unrecorded claim revision.' } };
    const ui = fixture({ flightStudyObservations: notebook });
    expect(ui.action('comparison-first').props.children).toBe('Revisit first captured view');
    ui.revisit('comparison-first');
    expect(ui.state.flightStudyYaw).toBe(90); expect(ui.state.flightWingStep).toBe(3);
    expect(ui.state.flightStudyObservations).toBe(notebook); expect(saved.first.note).toBe('A saved shape observation.');
    expect(notebook.records['canada_goose:head'].note).toBe('A newer note.');
  });

  it('revisits the second captured snapshot across species after both source records were removed', () => {
    const saved = comparison();
    const notebook = { records: {}, drafts: { 'arctic_tern:tail': 'Keep this draft.' }, comparison: { saved, draft: 'My comparison draft.' } };
    const ui = fixture({ flightStudyObservations: notebook });
    expect(ui.action('comparison-second').props.children).toBe('Revisit second captured view');
    ui.revisit('comparison-second');
    expect(ui.state).toMatchObject({ flightSpecies: 'arctic_tern', flightStudyRegion: 'tail', flightStudyBird: 1, flightStudyYaw: 0, flightStudyPitch: 60, flightStudyZoom: .85, flightWingStep: 6, flightPaused: true });
    expect(ui.state.flightStudyObservations).toBe(notebook); expect(saved.claim).toBe('Saved evidence from both views.');
    expect(ui.announce).toHaveBeenLastCalledWith(expect.stringContaining('Recorded state: Paused.'));
  });

  it('revisits whole-insect evidence without enabling bird anatomy', () => {
    const saved = comparison(recorded(), recorded('monarch', 'whole-wing', { bird: 0, yaw: 180, pitch: 10, wingStep: 7, motionReduced: true }));
    const ui = fixture({ flightShowAnatomy: true, flightStudyObservations: { comparison: { saved } } });
    ui.revisit('comparison-second');
    expect(ui.state).toMatchObject({ flightSpecies: 'monarch', flightStudyRegion: 'head', flightStudyBird: 0, flightShowAnatomy: false, flightWingStep: 7, flightPaused: true });
    expect(ui.announce).toHaveBeenLastCalledWith(expect.stringContaining('Whole-insect wing motion'));
    expect(ui.announce).toHaveBeenLastCalledWith(expect.stringContaining('Recorded state: Still: Reduce motion.'));
  });

  it('preserves the current formation and explains a clamped unavailable individual', () => {
    const ui = fixture({ flightFormation: 'solo', flightStudyObservations: { records: { 'canada_goose:head': recorded() } } });
    ui.revisit('observation');
    expect(ui.state.flightStudyBird).toBe(0); expect(ui.state.flightFormation).toBe('solo');
    expect(ui.announce).toHaveBeenLastCalledWith(expect.stringContaining('fewer individuals; showing Individual 1.'));
  });

  it('normalizes imported camera and step settings before restoring them', () => {
    const ui = fixture({ flightStudyObservations: { records: { 'canada_goose:head': recorded('canada_goose', 'head', { bird: 999, yaw: 999, pitch: -999, zoom: 999, wingStep: 9999999 }) } } });
    ui.revisit('observation');
    expect(ui.state).toMatchObject({ flightStudyYaw: 180, flightStudyPitch: -10, flightStudyZoom: 1.6, flightWingStep: 1000000, flightPaused: true });
    expect(ui.state.flightStudyBird).toBeGreaterThanOrEqual(0); expect(ui.state.flightStudyBird).toBeLessThan(32);
    const malformed = fixture({ flightStudyObservations: { records: { 'canada_goose:head': recorded('constructor', 'head') }, comparison: { saved: { firstKey: 'constructor:head', secondKey: 'toString:tail', claim: 'Malformed sources.', first: {}, second: {} } } } });
    expect(malformed.action('observation')).toBeNull(); expect(malformed.action('comparison-first')).toBeNull(); expect(malformed.action('comparison-second')).toBeNull();
  });

  it('cancels an in-progress orbit before restoring evidence so a late pointerup cannot overwrite it', () => {
    const ui = fixture({ flightStudyObservations: { records: { 'canada_goose:head': recorded() } } });
    const props = ui.node(node => node.props?.id === 'migration-flight-stage').props;
    const host = document.createElement('div'); host.tabIndex = 0; host.setAttribute('data-flight-ready', 'true');
    const canvas = document.createElement('canvas'); host.append(canvas); document.body.append(host);
    let captured = null;
    host.setPointerCapture = id => { captured = id; }; host.hasPointerCapture = id => captured === id; host.releasePointerCapture = () => { captured = null; };
    const event = values => ({ pointerId: 1, isPrimary: true, button: 0, clientX: 100, clientY: 100, target: canvas, currentTarget: host, preventDefault() {}, ...values });
    props.onPointerDown(event()); props.onPointerMove(event({ clientX: 200 }));
    ui.revisit('observation'); props.onPointerUp(event({ clientX: 200 }));
    expect(captured).toBeNull(); expect(host.hasAttribute('data-study-dragging')).toBe(false);
    expect(ui.writes).toHaveLength(1); expect(ui.state.flightStudyYaw).toBe(90);
  });

  it('keeps the device motion preference rather than restoring a captured preference', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    const ui = fixture({ flightStudyObservations: { records: { 'canada_goose:head': recorded('canada_goose', 'head', { motionReduced: false }) } } });
    ui.revisit('observation'); ui.render();
    expect(ui.render()).toContain('Reduce motion');
    expect(ui.writes[0]).not.toHaveProperty('motionReduced'); expect(ui.writes[0]).not.toHaveProperty('reducedMotion');
    expect(ui.state.flightStudyObservations.records['canada_goose:head'].motionReduced).toBe(false);
  });
});

const canonical = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_migration.js'), 'utf8');
const resetStart = canonical.indexOf('          // Revisit starts a repeatable illustrative pose.');
const resetEnd = canonical.indexOf('          var studyBirdIndex = ', resetStart);
const applyRevisitPose = new Function('_f3dStudyRevisitRef', 'species', 'live', 'engineNow', canonical.slice(resetStart, resetEnd));
function pending(wingStep = 3) { return { speciesId: 'canada_goose', wingStep, bird: 2, yaw: 90, pitch: 10, zoom: 1.2 }; }
function livePose(pose) { return { flightCamera: 'study', flightPaused: true, flightStudyBird: pose.bird, flightStudyYaw: pose.yaw, flightStudyPitch: pose.pitch, flightStudyZoom: pose.zoom, flightWingStep: pose.wingStep }; }

describe('Migration revisit illustrative pose lifecycle', () => {
  it('uses an absolute eight-part phase when revisiting backward steps, independent of previous running time and phase', () => {
    expect(resetStart).toBeGreaterThan(0); expect(resetEnd).toBeGreaterThan(resetStart);
    const engine = { time: 98, wingStepSerial: 400, wingStepPhase: 5.8, flown: 12345, movers: [{ position: { z: 37 } }] };
    const ref = { current: pending(3) };
    applyRevisitPose(ref, { id: 'canada_goose' }, livePose(ref.current), engine);
    expect(engine.time).toBe(0); expect(engine.wingStepSerial).toBe(3); expect(engine.wingStepPhase).toBe(3 * Math.PI / 4); expect(ref.current).toBeNull();
    engine.time = 147; engine.wingStepSerial = 12; engine.wingStepPhase = .1; ref.current = pending(3);
    applyRevisitPose(ref, { id: 'canada_goose' }, livePose(ref.current), engine);
    expect(engine.time).toBe(0); expect(engine.wingStepPhase).toBe(3 * Math.PI / 4);
    expect(engine.flown).toBe(12345); expect(engine.movers[0].position.z).toBe(37);
    ref.current = pending(11); applyRevisitPose(ref, { id: 'canada_goose' }, livePose(ref.current), engine);
    expect(engine.wingStepPhase).toBe(3 * Math.PI / 4);
  });

  it('applies a pending request at engine boot and cancels one whose camera or pose changed before the first frame', () => {
    const engine = { time: 0, wingStepSerial: 6, wingStepPhase: 0 };
    const ref = { current: pending(6) };
    applyRevisitPose(ref, { id: 'canada_goose' }, livePose(ref.current), engine);
    expect(engine.wingStepPhase).toBe(6 * Math.PI / 4); expect(ref.current).toBeNull();
    for (const altered of [{ flightCamera: 'chase' }, { flightPaused: false }, { flightStudyYaw: -90 }, { flightWingStep: 7 }]) {
      engine.time = 19; engine.wingStepPhase = .7; ref.current = pending(6);
      applyRevisitPose(ref, { id: 'canada_goose' }, { ...livePose(ref.current), ...altered }, engine);
      expect(engine.time).toBe(19); expect(engine.wingStepPhase).toBe(.7); expect(ref.current).toBeNull();
    }
    ref.current = pending(6); applyRevisitPose(ref, { id: 'arctic_tern' }, livePose(ref.current), engine);
    expect(engine.time).toBe(19); expect(ref.current).toBeNull();
  });
});
