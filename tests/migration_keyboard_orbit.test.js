import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = process.env.MIGRATION_KEYBOARD_ORBIT_CANDIDATE || 'stem_lab/stem_tool_migration.js';
const source = fs.readFileSync(path.join(process.cwd(), sourcePath), 'utf8').replace(/\r\n/g, '\n');
function section(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error('Missing migration keyboard fixture section: ' + start);
  return source.slice(first, last);
}
const num = new Function(section('  function migrNum(', '  // Sibling of migrNum') + '\nreturn migrNum;')();
const advance = new Function('engineNow', 'live', 'migrNum', section('          var studyBirdIndex =', '          engineNow.flockRoot.position.x'));
const tau = Math.PI * 2;
const normalize = value => ((value % tau) + tau) % tau;
const { act } = React;
const mounts = [];
let tool;

function walk(node, predicate, result = []) {
  if (!node || typeof node !== 'object') return result;
  if (Array.isArray(node)) { node.forEach(child => walk(child, predicate, result)); return result; }
  if (predicate(node)) result.push(node);
  walk(node.props?.children, predicate, result); return result;
}
function fakeEngine(host) {
  host.setAttribute('data-flight-ready', 'true');
  const pose = { userData: { captured: false, capturedPhase: null, captureVersion: 0, sourceBirdUuid: '' } };
  pose.capturePose = vi.fn((flyer, speciesId, individual) => {
    pose.userData = { captured: true, capturedPhase: normalize(flyer.userData.lastRenderedWingPhase),
      captureVersion: pose.userData.captureVersion + 1, sourceBirdUuid: flyer.uuid, speciesId, individual };
    return true;
  });
  pose.clearPose = vi.fn(() => { pose.userData.captured = false; pose.userData.capturedPhase = null; });
  return { host, flyers: Array.from({ length: 9 }, (_, index) => ({ uuid: 'orbit-bird-' + index, visible: true,
    position: { y: 0 }, rotation: { z: 0 }, userData: { phase: 1.19 + index * .29, flapRate: 5.3 + index * .11,
      baseY: 1, applyWingPhase: vi.fn() } })),
    time: 2.37, wingStepSerial: 14, wingStepPhase: 1.1,
    speciesId: 'canada_goose', formationMode: 'natural', season: 'fall',
    markedWingPose: pose, wingtipPath: { invalidate: vi.fn() } };
}
function workSeed() {
  return {
    flightStudyObservations: { drafts: { 'canada_goose:primaries': 'Keep my own observation draft.' },
      records: { 'canada_goose:primaries': { speciesId: 'canada_goose', region: 'primaries', note: 'Keep my recorded evidence.',
        bird: 0, yaw: 90, pitch: 10, zoom: 1, wingStep: 4, paused: true, motionReduced: true } },
      comparison: { draft: 'Keep my comparison claim.' } },
    flightInvestigation: { variable: 'wind', prediction: 'Keep my prediction.', trials: [], evidence: 'Keep my evidence.' },
    flightChallenges: { selectedId: 'wind', work: { wind: { prediction: 'Keep my challenge.', notes: 'Keep my reasoning.', attempts: [] } } },
    inquiry: { hypothesis: 'Keep my hypothesis.', explanation: 'Keep my explanation.', trials: [] },
    aiExplorerText: 'Keep my research.'
  };
}
function work(state) {
  return Object.fromEntries(['flightStudyObservations', 'flightInvestigation', 'flightChallenges', 'inquiry', 'aiExplorerText']
    .map(key => [key, state[key]]));
}
function fixture(seed = {}) {
  let state = { tab: 'flight3d', flightCamera: 'study', flightSpecies: 'canada_goose', flightFormation: 'natural', flightSeason: 'fall',
    flightPaused: true, flightShowWingtipPath: false, flightWingStep: 14, flightStudyYaw: 35, flightStudyPitch: 15, flightStudyZoom: 1,
    flightStudyObservationOpen: true, flightStudyRegion: 'primaries', ...workSeed(), ...seed }, tree, refresh;
  const refs = [], writes = [], announce = vi.fn();
  const tracedReact = { ...React, useRef(value) {
    const ref = React.useRef(value); if (!refs.includes(ref)) refs.push(ref); return ref;
  } };
  const ctx = makeCtx({ React: tracedReact, announceToSR: announce,
    update: (_, key, value) => { writes.push({ [key]: value }); state = { ...state, [key]: value }; refresh(value => value + 1); },
    updateMulti: (_, values) => { writes.push(values); state = { ...state, ...values }; refresh(value => value + 1); } });
  const host = document.createElement('div'); document.body.append(host);
  const root = ReactDOMClient.createRoot(host); mounts.push(root);
  function Component() { refresh = React.useState(0)[1]; ctx.toolData = { migration: state }; tree = tool.render(ctx); return tree; }
  act(() => root.render(React.createElement(Component)));
  // Attribute selectors stay scoped to each fixture when two decks share the
  // production IDs; jsdom's simple-ID shortcut otherwise returns the first.
  const stage = host.querySelector("[data-migration-id=\"migration-flight-stage\"]");
  expect(stage).not.toBeNull();
  const engineRef = refs[refs.findIndex(ref => ref.current === stage) + 1], engine = fakeEngine(stage);
  engineRef.current = engine;
  const liveRef = refs.find(ref => ref.current && typeof ref.current === 'object' && 'flightSpeedValues' in ref.current);
  const ui = { host, stage, engine, engineRef, liveRef, refs, writes, announce,
    get state() { return state; }, get live() { return liveRef.current; },
    node(predicate) { return walk(tree, predicate)[0] || null; },
    action(name) { return ui.node(node => node.props?.['data-marked-pose-action'] === name); },
    click(node) { act(() => node.props.onClick()); }, mark() { ui.click(ui.action('mark')); }, check() { ui.click(ui.action('check')); },
    cue() { return host.querySelector('[data-marked-comparison-check]'); }, field() { return host.querySelector("[data-migration-id=\"migration-study-observation-note\"]"); },
    set(values) { act(() => { state = { ...state, ...values }; refresh(value => value + 1); }); },
    frame() { advance(engine, liveRef.current, num); },
    key(key, modifiers = {}, target = stage) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...modifiers });
      act(() => target.dispatchEvent(event)); return event;
    },
    dispose() { act(() => root.unmount()); mounts.splice(mounts.indexOf(root), 1); host.remove(); }
  };
  ui.set({}); ui.frame(); return ui;
}
function pointer(ui) {
  const canvas = document.createElement('canvas'); ui.stage.append(canvas); let captured = null;
  ui.stage.setPointerCapture = id => { captured = id; }; ui.stage.hasPointerCapture = id => captured === id;
  ui.stage.releasePointerCapture = id => { if (captured === id) captured = null; };
  function dispatch(type, values = {}) {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: 100, clientY: 100, ...values });
    Object.defineProperties(event, { pointerId: { value: 7 }, isPrimary: { value: true } });
    act(() => canvas.dispatchEvent(event)); return event;
  }
  return { get captured() { return captured; }, canvas, down: values => dispatch('pointerdown', values),
    move: values => dispatch('pointermove', values), up: values => dispatch('pointerup', values) };
}
function model(ui) {
  return { time: ui.engine.time, phase: ui.engine.wingStepPhase, serial: ui.engine.wingStepSerial,
    birds: ui.engine.flyers.map(bird => ({ uuid: bird.uuid, phase: bird.userData.lastRenderedWingPhase, y: bird.position.y, z: bird.rotation.z })) };
}
function markAndCheck(ui) {
  const previousWriteCount = ui.writes.length;
  ui.mark(); ui.check();
  expect(ui.cue()?.getAttribute('data-marked-comparison-kind')).toBe('same');
  // Marking intentionally acknowledges pause, even for an already paused
  // scene. Subsequent assertions count only the gesture under inspection.
  expect(ui.writes.slice(previousWriteCount)).toEqual([{ flightPaused: true }]);
  ui.writes.length = 0;
}
function expectHeld(ui, before, engine, flyers) {
  expect(ui.engineRef.current).toBe(engine); expect(ui.engine.flyers).toBe(flyers);
  expect(model(ui)).toEqual(before.model); expect(work(ui.state)).toEqual(before.work);
  expect(ui.state.flightPaused).toBe(true); expect(ui.state.flightWingStep).toBe(14);
  expect(ui.state.flightStudyPitch).toBe(before.pitch); expect(ui.state.flightStudyZoom).toBe(before.zoom);
}

beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; resetStemLab(); tool = loadTool(sourcePath, 'migration'); });
afterEach(() => { act(() => mounts.splice(0).forEach(root => root.unmount())); document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Migration continuous focused-scene keyboard orbit', () => {
  it.each([
    [175, 'ArrowRight', -175], [180, 'ArrowRight', -170], [-180, 'ArrowLeft', 170], [-175, 'ArrowLeft', 175],
    [170, 'ArrowRight', -180], [-170, 'ArrowLeft', -180], [-180, 'ArrowRight', -170], [180, 'ArrowLeft', 170]
  ])('continues from %s through %s to %s while consuming the focused-scene key', (start, key, expected) => {
    const ui = fixture({ flightStudyYaw: start }), before = model(ui);
    ui.stage.focus(); const event = ui.key(key);
    expect(event.defaultPrevented).toBe(true); expect(document.activeElement).toBe(ui.stage);
    expect(ui.state.flightStudyYaw).toBe(expected); expect(ui.live.flightStudyYaw).toBe(expected);
    expect(ui.writes).toEqual([{ flightStudyYaw: expected }]); expect(model(ui)).toEqual(before);
  });

  it.each(['ArrowRight', 'ArrowLeft'])('completes a full circular inspection using %s without altering pose or learner work', key => {
    const ui = fixture(), engine = ui.engine, flyers = engine.flyers, field = ui.field();
    field.focus(); field.setSelectionRange(4, 17, 'backward'); markAndCheck(ui);
    const before = { model: model(ui), work: work(ui.state), pitch: ui.state.flightStudyPitch, zoom: ui.state.flightStudyZoom };
    for (let index = 0; index < 36; index++) {
      ui.key(key); ui.frame();
      expect(Number.isFinite(ui.live.flightStudyYaw)).toBe(true);
      expect(ui.live.flightStudyYaw).toBeGreaterThanOrEqual(-180); expect(ui.live.flightStudyYaw).toBeLessThan(180);
      expectHeld(ui, before, engine, flyers);
      expect(ui.cue()).toBeNull();
    }
    expect(ui.state.flightStudyYaw).toBe(35); expect(ui.writes).toHaveLength(36);
    expect(ui.field()).toBe(field); expect(field.value).toBe('Keep my own observation draft.');
    expect([field.selectionStart, field.selectionEnd, field.selectionDirection]).toEqual([4, 17, 'backward']);
    expect(ui.live.flightMarkedPose.capturedView).toEqual({ yaw: 35, pitch: 15, zoom: 1 });
    ui.check(); expect(ui.cue()?.getAttribute('data-marked-comparison-kind')).toBe('same');
  });

  it.each([
    [175, -175], ['175', -175], [' 175 ', -175], [173, -175], [900, -170], [-900, -170],
    [undefined, 45], [null, 45], [true, 45], [{}, 45], ['', 45], ['bad', 45], [NaN, 45], [Infinity, 45], [-Infinity, 45]
  ])('uses the existing finite rendered normalization for saved yaw %s (case %#)', (savedYaw, expected) => {
    const ui = fixture({ flightStudyYaw: savedYaw });
    ui.key('ArrowRight');
    expect(ui.state.flightStudyYaw).toBe(expected); expect(ui.live.flightStudyYaw).toBe(expected);
    expect(ui.host.innerHTML).not.toMatch(/(?:value|width|height)="(?:NaN|Infinity)"/);
  });

  it.each([
    [175, 'ArrowRight', -25, -175], [-175, 'ArrowLeft', 25, 175], [180, 'ArrowRight', -25, -170], [-180, 'ArrowLeft', 25, 170]
  ])('reaches the same view from %s using %s and a %spx pointer drag', (start, key, dx, expected) => {
    const keyboard = fixture({ flightStudyYaw: start }), dragged = fixture({ flightStudyYaw: start });
    markAndCheck(keyboard); markAndCheck(dragged);
    keyboard.key(key); const p = pointer(dragged); p.down(); p.move({ clientX: 100 + dx }); p.up({ clientX: 100 + dx });
    expect(keyboard.state.flightStudyYaw).toBe(expected); expect(dragged.state.flightStudyYaw).toBe(expected);
    for (const field of ['flightStudyYaw', 'flightStudyPitch', 'flightStudyZoom', 'flightPaused', 'flightWingStep']) expect(dragged.state[field]).toBe(keyboard.state[field]);
    expect(model(dragged)).toEqual(model(keyboard)); expect(work(dragged.state)).toEqual(work(keyboard.state));
    expect(keyboard.cue()).toBeNull(); expect(dragged.cue()).toBeNull();
    keyboard.check(); dragged.check();
    expect(keyboard.cue()?.getAttribute('data-marked-comparison-kind')).toBe('view-only');
    expect(dragged.cue()?.getAttribute('data-marked-comparison-kind')).toBe('view-only');
  });

  it.each(['ctrlKey', 'metaKey', 'altKey'])('leaves checked comparison and selected settings intact for %s', modifier => {
    const ui = fixture({ flightStudyYaw: 180 }); markAndCheck(ui);
    const marked = ui.live.flightMarkedPose, checked = marked.comparisonCheck, state = ui.state, cue = ui.cue();
    const event = ui.key('ArrowRight', { [modifier]: true });
    expect(event.defaultPrevented).toBe(false); expect(ui.writes).toEqual([]); expect(ui.state).toBe(state);
    expect(ui.live.flightMarkedPose).toBe(marked); expect(ui.live.flightMarkedPose.comparisonCheck).toBe(checked);
    expect(ui.cue()).toBe(cue); expect(ui.cue()?.getAttribute('data-marked-comparison-kind')).toBe('same');
  });

  it.each(['ctrlKey', 'metaKey', 'altKey'])('preserves a moved pointer preview until pointer-up for ignored %s shortcuts', modifier => {
    const ui = fixture(), p = pointer(ui); markAndCheck(ui);
    const marked = ui.live.flightMarkedPose, checked = marked.comparisonCheck, before = model(ui), authored = work(ui.state);
    p.down(); p.move({ clientX: 150, clientY: 120 });
    const drag = ui.refs.find(ref => ref.current?.pointerId === 7 && ref.current?.host === ui.stage)?.current;
    expect(drag).toBeTruthy(); expect(p.captured).toBe(7);
    expect(ui.live).toMatchObject({ flightStudyYaw: 15, flightStudyPitch: 20 });
    const event = ui.key('ArrowRight', { [modifier]: true });
    expect(event.defaultPrevented).toBe(false); expect(p.captured).toBe(7);
    expect(ui.stage.getAttribute('data-study-dragging')).toBe('true');
    expect(ui.refs.some(ref => ref.current === drag)).toBe(true);
    expect(ui.live).toMatchObject({ flightStudyYaw: 15, flightStudyPitch: 20 });
    expect(ui.live.flightMarkedPose).toBe(marked); expect(ui.live.flightMarkedPose.comparisonCheck).toBe(checked);
    expect(ui.writes).toEqual([]); expect(model(ui)).toEqual(before); expect(work(ui.state)).toEqual(authored);
    p.up({ clientX: 150, clientY: 120 });
    expect(p.captured).toBeNull(); expect(ui.writes).toEqual([{ flightStudyYaw: 15, flightStudyPitch: 20 }]);
  });

  it('does not intercept arrows from the real nested Study button or an observation field', () => {
    const ui = fixture(); markAndCheck(ui);
    const state = ui.state, checked = ui.live.flightMarkedPose.comparisonCheck;
    const nested = ui.host.querySelector('.migration-scene-tools button'), field = ui.field();
    nested.focus(); const buttonEvent = ui.key('ArrowRight', {}, nested);
    field.focus(); field.setSelectionRange(4, 17, 'backward'); const fieldEvent = ui.key('ArrowLeft', {}, field);
    expect(buttonEvent.defaultPrevented).toBe(false); expect(fieldEvent.defaultPrevented).toBe(false);
    expect(ui.state).toBe(state); expect(ui.writes).toEqual([]);
    expect(ui.live.flightMarkedPose.comparisonCheck).toBe(checked);
    expect(ui.cue()?.getAttribute('data-marked-comparison-kind')).toBe('same');
    expect([field.selectionStart, field.selectionEnd, field.selectionDirection]).toEqual([4, 17, 'backward']);
  });

  it('retains a captured pointer preview when an arrow bubbles from a real nested scene button', () => {
    const ui = fixture(), p = pointer(ui); p.down(); p.move({ clientX: 125 });
    const nested = ui.host.querySelector('.migration-scene-tools button');
    const event = ui.key('ArrowRight', {}, nested);
    expect(event.defaultPrevented).toBe(false); expect(p.captured).toBe(7);
    expect(ui.live.flightStudyYaw).toBe(25); expect(ui.writes).toEqual([]);
    p.up({ clientX: 125 }); expect(ui.writes).toEqual([{ flightStudyYaw: 25, flightStudyPitch: 15 }]);
  });

  it('cancels a preview on an actual orbit key, steps from the acknowledged view and requires a new check', () => {
    const ui = fixture({ flightStudyYaw: 175 }), p = pointer(ui), field = ui.field(), engine = ui.engine, flyers = engine.flyers;
    field.focus(); field.setSelectionRange(4, 17, 'backward'); markAndCheck(ui);
    const before = { model: model(ui), work: work(ui.state), pitch: ui.state.flightStudyPitch, zoom: ui.state.flightStudyZoom };
    const captureVersion = ui.live.flightMarkedPose.captureVersion;
    p.down(); p.move({ clientX: 150, clientY: 120 });
    expect(ui.live).toMatchObject({ flightStudyYaw: 155, flightStudyPitch: 20 });
    ui.key('ArrowRight');
    expect(p.captured).toBeNull(); expect(ui.stage.hasAttribute('data-study-dragging')).toBe(false);
    expect(ui.writes).toEqual([{ flightStudyYaw: -175 }]);
    expect(ui.live).toMatchObject({ flightStudyYaw: -175, flightStudyPitch: 15 });
    p.up({ clientX: 160, clientY: 130 }); expect(ui.writes).toHaveLength(1);
    expectHeld(ui, before, engine, flyers); expect(ui.live.flightMarkedPose.captureVersion).toBe(captureVersion);
    expect(ui.live.flightMarkedPose.capturedView).toEqual({ yaw: 175, pitch: 15, zoom: 1 });
    expect(ui.cue()).toBeNull(); ui.check();
    expect(ui.cue()?.getAttribute('data-marked-comparison-kind')).toBe('view-only');
    expect(ui.host.querySelector('[data-marked-view-component="yaw"]').getAttribute('data-component-result')).toBe('changed');
    expect(ui.host.querySelector('[data-marked-view-component="pitch"]').getAttribute('data-component-result')).toBe('matches');
    expect(ui.host.querySelector('[data-marked-view-component="zoom"]').getAttribute('data-component-result')).toBe('matches');
    expect(ui.field()).toBe(field); expect(field.value).toBe('Keep my own observation draft.');
    expect([field.selectionStart, field.selectionEnd, field.selectionDirection]).toEqual([4, 17, 'backward']);
    ui.key('ArrowLeft'); expect(ui.state.flightStudyYaw).toBe(175); expect(ui.cue()).toBeNull();
    ui.check(); expect(ui.cue()?.getAttribute('data-marked-comparison-kind')).toBe('same');
    expectHeld(ui, before, engine, flyers);
  });
});
