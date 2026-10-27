import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = 'stem_lab/stem_tool_migration.js';
const source = fs.readFileSync(path.join(process.cwd(), sourcePath), 'utf8').replace(/\r\n/g, '\n');
function section(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error('Missing marked comparison section: ' + start);
  return source.slice(first, last);
}
const num = new Function(section('  function migrNum(', '  // Sibling of migrNum') + '\nreturn migrNum;')();
const helpers = new Function('migrNum', section('      function migrationStudyCycleContext(', '      function renderFlight3D()') +
  '\nreturn { select: selectMigrationMarkedWingPose, matches: migrationStudyMarkedReturnMatches, target: migrationStudyMarkedReturnTarget, cycleMatches: migrationStudyCyclePositionMatches, selectCycle: selectMigrationStudyCyclePosition, frame: migrationStudyComparisonFrame, check: migrationCheckMarkedComparison, checkMatches: migrationStudyComparisonCheckMatches, viewMatches: migrationStudyComparisonViewsMatch, restoreTarget: migrationMarkedViewRestoreTarget, restoreMatches: migrationStudyMarkedViewRestoreMatches };')(num);
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
function fakeEngine(host, values = {}) {
  host.setAttribute('data-flight-ready', 'true');
  const pose = { userData: { captured: false, capturedPhase: null, captureVersion: 0, sourceBirdUuid: '' } };
  pose.capturePose = vi.fn((flyer, speciesId, individual) => {
    pose.userData = { captured: true, capturedPhase: Number.isFinite(flyer.userData.lastRenderedWingPhase) ? normalize(flyer.userData.lastRenderedWingPhase) : null,
      captureVersion: pose.userData.captureVersion + 1, sourceBirdUuid: flyer.uuid, speciesId, individual };
    return true;
  });
  pose.clearPose = vi.fn(() => { pose.userData.captured = false; pose.userData.capturedPhase = null; });
  return { host, flyers: Array.from({ length: 9 }, (_, i) => ({ uuid: 'return-bird-' + i, visible: true,
    position: { y: 0 }, rotation: { z: 0 }, userData: { phase: 1.19 + i * 0.29, flapRate: 5.3 + i * 0.11, baseY: 1, applyWingPhase: vi.fn() } })),
    time: 2.37, wingStepSerial: 14, wingStepPhase: 1.1,
    speciesId: 'canada_goose', formationMode: 'natural', season: 'fall',
    markedWingPose: pose, wingtipPath: { invalidate: vi.fn() }, ...values };
}
function pureFixture(phase = 0.37, liveValues = {}) {
  const host = document.createElement('div'); document.body.append(host);
  const engine = fakeEngine(host);
  const live = { tab: 'flight3d', flightCamera: 'study', flightShowWingtipPath: false, flightPaused: false,
    flightSpecies: 'canada_goose', flightFormation: 'natural', flightSeason: 'fall', flightStudyBird: 2, flightWingStep: 14, flightStudyYaw: 35, flightStudyPitch: 15, flightStudyZoom: 1, ...liveValues };
  const marked = { status: 'marked', speciesId: 'canada_goose', individual: 2, formationMode: 'natural', season: 'fall',
    capturedPhase: phase, captureVersion: 3, sourceBirdUuid: engine.flyers[2].uuid, capturedView: { yaw: 35, pitch: 15, zoom: 1 } };
  engine.markedWingPose.userData = { captured: true, speciesId: marked.speciesId, individual: 2,
    capturedPhase: phase, captureVersion: 3, sourceBirdUuid: marked.sourceBirdUuid };
  return { engine, live, marked, frame() { advance(engine, live, num); } };
}
function fixture(seed = {}, options = {}) {
  let state = { tab: 'flight3d', flightCamera: 'study', flightShowWingtipPath: false, flightWingStep: 14, ...seed }, tree, refresh;
  const refs = [], writes = [], queued = [], announce = vi.fn();
  const tracedReact = { ...React, useRef(value) {
    const ref = React.useRef(value); if (!refs.includes(ref)) refs.push(ref); return ref;
  } };
  const ctx = makeCtx({ React: tracedReact, announceToSR: announce,
    update: (_, key, value) => { writes.push({ [key]: value });
      if (options.delayPause && key === 'flightPaused') { queued.push({ [key]: value }); return; }
      state = { ...state, [key]: value }; refresh(value => value + 1);
    }, updateMulti: (_, values) => { writes.push(values);
      if (options.delayView && Object.keys(values).length && Object.keys(values).every(key => ['flightStudyYaw', 'flightStudyPitch', 'flightStudyZoom'].includes(key))) { queued.push(values); return; }
      state = { ...state, ...values }; refresh(value => value + 1); }
  });
  const host = document.createElement('div'); document.body.append(host);
  const root = ReactDOMClient.createRoot(host); mounts.push(root);
  function Component() { refresh = React.useState(0)[1]; ctx.toolData = { migration: state }; tree = tool.render(ctx); return tree; }
  act(() => { root.render(React.createElement(Component)); });
  const stage = host.querySelector("[data-migration-id=\"migration-flight-stage\"]");
  const engineRef = refs[refs.findIndex(ref => ref.current === stage) + 1];
  const engine = fakeEngine(stage, { speciesId: state.flightSpecies || 'canada_goose', formationMode: state.flightFormation || 'natural',
    season: state.flightSeason || 'fall', wingStepSerial: state.flightWingStep });
  engineRef.current = engine;
  const liveRef = refs.find(ref => ref.current && typeof ref.current === 'object' && 'flightSpeedValues' in ref.current);
  const ui = { host, stage, engine, engineRef, liveRef, refs, writes, queued, announce,
    get state() { return state; }, get live() { return liveRef.current; },
    node(predicate) { return walk(tree, predicate)[0] || null; },
    action(name) { return ui.node(node => node.props?.['data-marked-pose-action'] === name); },
    button(text) { return ui.node(node => node.type === 'button' && node.props.children === text); },
    click(node) { act(() => { node.props.onClick(); }); }, mark() { ui.click(ui.action('mark')); },
    returnPose() { ui.click(ui.action('return')); }, check() { ui.click(ui.action('check')); },
    restore() { const button = host.querySelector('[data-marked-pose-action="restore-view"]'); act(() => { ui.action('restore-view').props.onClick({ currentTarget: button }); }); },
    viewpoint(id) { ui.click(ui.node(node => node.props?.['data-study-viewpoint'] === id)); },
    cue() { return host.querySelector('[data-marked-comparison-check]'); },
    choose(index) { ui.click(ui.node(node => node.props?.['data-study-cycle-position'] === index)); },
    set(values) { act(() => { state = { ...state, ...values }; refresh(value => value + 1); }); },
    flushOne() { act(() => { state = { ...state, ...queued.shift() }; refresh(value => value + 1); }); },
    frame() { advance(engine, liveRef.current, num); },
    returnStatus() { return host.querySelector('[data-marked-pose-return-status]')?.getAttribute('data-marked-pose-return-status') || null; },
    dispose() { act(() => { root.unmount(); }); mounts.splice(mounts.indexOf(root), 1); host.remove(); }
  };
  ui.set({}); ui.frame(); return ui;
}

beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; resetStemLab(); tool = loadTool(sourcePath, 'migration'); });
afterEach(() => { act(() => { mounts.splice(0).forEach(root => root.unmount()); }); document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); });



const require = createRequire(import.meta.url);
const THREE = require(path.join(process.cwd(), 'vendor/three-r128/three.min.js'));
const model = new Function('migrNum', section('      function createMigrationWingGeometry(', '      function migrationFormationPositions(') + '\nreturn { createMigrationFlyer, migrationStudyDistance };')(num);
const cameraFrame = new Function('engineNow', 'live', 'migrNum', 'migrationStudyDistance', 'reducedMotionRef', 'delta', 'studyBirdIndex',
  section('          var desired = engineNow.cameraViews[live.flightCamera]', '          if (engineNow.studyLighting)'));
const validView = new Function(section('      function migrationStudyComparisonViewValid(', '      function migrationStudyComparisonView(') + '\nreturn migrationStudyComparisonViewValid;')();
const domProps = node => node[Object.keys(node).find(key => key.startsWith('__reactProps$'))];
function seed(extra = {}) { return { flightSpecies: 'canada_goose', flightPaused: true, flightStudyYaw: 0, flightStudyPitch: 60,
  flightStudyZoom: 1, flightStudyBird: 0, flightStudyRegion: 'head', flightStudyObservationOpen: true,
  flightShowAnatomy: true, flightShowWingtipPath: true,
  flightStudyObservations: { drafts: { 'canada_goose:head': 'My unfinished surface prediction.' }, records: {}, comparison: { draft: 'Keep this comparison.' } },
  flightInvestigation: { prediction: 'Keep this prediction.', trials: [] }, ...extra }; }
function pointer(ui) {
  const canvas = document.createElement('canvas'); ui.stage.append(canvas); let captured = null;
  ui.stage.setPointerCapture = id => { captured = id; }; ui.stage.hasPointerCapture = id => captured === id;
  ui.stage.releasePointerCapture = () => { captured = null; };
  return { get captured() { return captured; }, event(values = {}) { return { pointerId: 7, isPrimary: true, button: 0,
    clientX: 100, clientY: 100, target: canvas, currentTarget: ui.stage, preventDefault() {}, ...values }; } };
}
function press(ui, key, modifiers = {}) {
  act(() => domProps(ui.stage).onKeyDown({ key, target: ui.stage, currentTarget: ui.stage, preventDefault() {}, ...modifiers }));
}
describe('Study underside viewpoints and surface comparison', () => {
  it('offers four accessible viewpoints in a 2x2 touch-sized grid with an ungraded prediction activity', () => {
    const ui = fixture(seed()), buttons = [...ui.host.querySelectorAll('[data-study-viewpoint]')];
    expect(buttons.map(button => button.textContent)).toEqual(['Front', 'Profile', 'From above', 'From below']);
    expect(getComputedStyle(buttons[0].parentElement).gridTemplateColumns).toBe('repeat(2,minmax(0,1fr))');
    for (const button of buttons) {
      expect(getComputedStyle(button).minHeight).toBe('44px');
      expect(button.getAttribute('aria-describedby')).toBe(ui.host.querySelector('[data-migration-id="migration-study-surface-help"]').id);
    }
    expect(ui.host.querySelector("[data-migration-id=\"migration-study-surface-help\"]").textContent).toContain('compare From above with From below');
    expect(ui.host.querySelector("[data-migration-id=\"migration-study-surface-help\"]").textContent).toContain('keep zoom fixed');
    expect(ui.host.querySelector("[data-migration-id=\"migration-study-surface-help\"]").textContent).toContain('do not mean the model changed');
    expect(ui.writes).toEqual([]);
  });
  it.each([[-999, -60], [-61, -60], [-60, -60], [-47, -45], [-10, -10], [0, 0], [61, 60], [Infinity, 15]])('normalizes imported current pitch %s to %s without writing it', (pitch, expected) => {
    const ui = fixture(seed({ flightStudyPitch: pitch }));
    const slider = ui.host.querySelector('[aria-label="Study elevation in degrees"]');
    expect(Number(slider.value)).toBe(expected); expect(slider.min).toBe('-60'); expect(slider.max).toBe('60');
    expect(ui.live.flightStudyPitch).toBe(expected); expect(ui.writes).toEqual([]);
  });
  it.each([-60, -55, -45, -15, -10, 0, 60])('accepts finite comparison elevation %s', pitch => {
    expect(validView({ yaw: 0, pitch, zoom: 1 })).toBe(true);
  });
  it.each([-61, 61, Infinity, NaN, '-45', null])('rejects invalid comparison elevation %s', pitch => {
    expect(validView({ yaw: 0, pitch, zoom: 1 })).toBe(false);
  });
  it('changes only yaw and pitch while retaining a held cycle, follow, clean view, note identity and caret', () => {
    const ui = fixture(seed({ flightStudyZoom: 1.25 })); ui.choose(2); ui.frame();
    act(() => ui.host.querySelector('[data-wingtip-follow-side="0"]').click());
    act(() => ui.host.querySelector('[data-study-guides-hidden]').click());
    const note = ui.host.querySelector("[data-migration-id=\"migration-study-observation-note\"]"); note.focus(); note.setSelectionRange(3, 11);
    const before = ui.state, cycle = ui.live.flightStudyCyclePosition, phase = ui.engine.wingStepPhase, owner = ui.engine.studyGuidesOwner;
    ui.writes.length = 0; ui.viewpoint('below'); ui.frame();
    expect(ui.writes).toEqual([{ flightStudyYaw: 0, flightStudyPitch: -60 }]);
    expect(ui.state).toEqual({ ...before, flightStudyYaw: 0, flightStudyPitch: -60 });
    expect(ui.engine.studyGuidesOwner).toBe(owner); expect(ui.live.flightStudyCyclePosition).toBe(cycle);
    expect(ui.live.flightWingtipFollowSide).toBe(0); expect(ui.engine.wingStepPhase).toBe(phase);
    expect(ui.host.querySelector("[data-migration-id=\"migration-study-observation-note\"]")).toBe(note);
    expect([note.value, note.selectionStart, note.selectionEnd]).toEqual(['My unfinished surface prediction.', 3, 11]);
    expect(ui.host.querySelector('[data-study-viewpoint="below"]').getAttribute('aria-pressed')).toBe('true');
  });
  it('keeps ordinary running playback running when choosing From below without a held cycle', () => {
    const ui = fixture(seed({ flightPaused: false, flightStudyZoom: 1.25 }));
    const before = ui.state, notes = ui.state.flightStudyObservations;
    expect(ui.live.flightStudyCyclePosition).toBeUndefined(); expect(ui.live.flightPaused).toBe(false);
    ui.viewpoint('below');
    expect(ui.state).toEqual({ ...before, flightStudyYaw: 0, flightStudyPitch: -60 });
    expect(ui.live.flightPaused).toBe(false); expect(ui.state.flightStudyObservations).toBe(notes);
    expect(ui.writes).toEqual([{ flightStudyYaw: 0, flightStudyPitch: -60 }]);
  });
  it('bounds repeated keyboard descent at -60 and ascends without intercepting modified shortcuts', () => {
    const ui = fixture(seed({ flightStudyPitch: -55 }));
    press(ui, 'ArrowDown'); expect(ui.state.flightStudyPitch).toBe(-60);
    press(ui, 'ArrowDown'); expect(ui.state.flightStudyPitch).toBe(-60);
    const count = ui.writes.length; press(ui, 'ArrowUp', { ctrlKey: true }); press(ui, 'ArrowUp', { altKey: true });
    expect(ui.writes).toHaveLength(count); press(ui, 'ArrowUp'); expect(ui.state.flightStudyPitch).toBe(-55);
  });
  it('drags below the model, clamps at -60, and persists only at release', () => {
    const ui = fixture(seed({ flightStudyPitch: -45 })), p = pointer(ui), handlers = domProps(ui.stage);
    act(() => { handlers.onPointerDown(p.event()); handlers.onPointerMove(p.event({ clientY: -300 })); });
    expect(ui.live.flightStudyPitch).toBe(-60); expect(ui.state.flightStudyPitch).toBe(-45); expect(ui.writes).toEqual([]);
    act(() => handlers.onPointerUp(p.event({ clientY: -300 })));
    expect(ui.state.flightStudyPitch).toBe(-60); expect(p.captured).toBeNull();
    expect(ui.writes).toEqual([{ flightStudyYaw: 0, flightStudyPitch: -60 }]);
  });
  it.each([['front', 180, 10], ['profile', 90, 10], ['above', 0, 60], ['below', 0, -60]])('cancels an unfinished orbit before the %s preset and ignores late release', (id, yaw, pitch) => {
    const ui = fixture(seed()), p = pointer(ui), handlers = domProps(ui.stage);
    act(() => { handlers.onPointerDown(p.event()); handlers.onPointerMove(p.event({ clientX: 200, clientY: -200 })); });
    expect(p.captured).toBe(7); ui.viewpoint(id);
    act(() => handlers.onPointerUp(p.event({ clientX: 200, clientY: -200 })));
    expect(p.captured).toBeNull(); expect(ui.stage.hasAttribute('data-study-dragging')).toBe(false);
    expect(ui.state).toMatchObject({ flightStudyYaw: yaw, flightStudyPitch: pitch });
    expect(ui.live).toMatchObject({ flightStudyYaw: yaw, flightStudyPitch: pitch });
    expect(ui.writes).toEqual([{ flightStudyYaw: yaw, flightStudyPitch: pitch }]);
  });
  it.each([-60, -45, -15])('marks, compares, and restores a view captured at %s degrees', pitch => {
    const ui = fixture(seed({ flightStudyPitch: pitch })); ui.choose(2); ui.frame(); ui.mark();
    const mark = ui.live.flightMarkedPose; expect(mark.capturedView).toEqual({ yaw: 0, pitch, zoom: 1 });
    ui.viewpoint('above'); ui.frame(); ui.check();
    expect(ui.cue().getAttribute('data-marked-comparison-kind')).toBe('view-only');
    const phase = ui.engine.wingStepPhase, notes = ui.state.flightStudyObservations; ui.writes.length = 0;
    ui.restore(); ui.frame();
    expect(ui.state).toMatchObject({ flightStudyYaw: 0, flightStudyPitch: pitch, flightStudyZoom: 1 });
    expect(ui.engine.wingStepPhase).toBe(phase); expect(ui.state.flightStudyObservations).toBe(notes);
    expect(ui.writes).toEqual([{ flightStudyYaw: 0, flightStudyPitch: pitch, flightStudyZoom: 1 }]);
    ui.check(); expect(ui.cue().getAttribute('data-marked-comparison-kind')).toBe('same');
  });
  it.each([-60, -45, -15])('records and revisits authored evidence at %s degrees without substituting an answer', pitch => {
    const ui = fixture(seed({ flightStudyPitch: pitch, flightStudyZoom: 1.2 }));
    const note = ui.host.querySelector("[data-migration-id=\"migration-study-observation-note\"]"); note.focus(); note.setSelectionRange(4, 12);
    ui.click(ui.button('Record observation'));
    const notebook = ui.state.flightStudyObservations;
    expect(notebook.records['canada_goose:head']).toMatchObject({ pitch, note: 'My unfinished surface prediction.', zoom: 1.2 });
    ui.viewpoint('above'); ui.writes.length = 0;
    ui.click(ui.node(node => node.props?.['data-study-revisit'] === 'observation'));
    expect(ui.state.flightStudyPitch).toBe(pitch); expect(ui.state.flightStudyObservations).toBe(notebook);
    expect(ui.host.querySelector("[data-migration-id=\"migration-study-observation-note\"]")).toBe(note);
    expect([note.value, note.selectionStart, note.selectionEnd]).toEqual(['My unfinished surface prediction.', 4, 12]);
    expect(ui.writes).toHaveLength(1); expect(ui.writes[0]).toMatchObject({ flightStudyPitch: pitch, flightPaused: true, flightStudyZoom: 1.2 });
    expect(ui.writes[0]).not.toHaveProperty('flightStudyObservations');
  });
  it.each(['canada_goose', 'snow_goose', 'arctic_tern', 'ruby_hummingbird', 'peregrine', 'sandhill_crane', 'bartailed_godwit', 'monarch'])('renders %s below its target and fits every model vertex through negative views', id => {
    const bird = model.createMigrationFlyer(THREE, { id }, 0); bird.position.set(0, 3, -5);
    const camera = new THREE.PerspectiveCamera(54, 1, .1, 900);
    const engine = { flyers: [bird], camera, cameraViews: { chase: new THREE.Vector3() }, studyTarget: new THREE.Vector3(),
      studyOrbit: new THREE.Vector3(), cameraTarget: new THREE.Vector3() };
    for (const aspect of [2.1, 390 / 360, .65]) for (const [yaw, pitch] of [[0, -60], [180, -60], [90, -45]]) for (const phase of [0, Math.PI / 2, 3 * Math.PI / 2]) {
      camera.aspect = aspect; camera.updateProjectionMatrix(); bird.userData.applyWingPhase(phase); bird.updateMatrixWorld(true);
      const live = { flightCamera: 'study', flightStudyYaw: yaw, flightStudyPitch: pitch, flightStudyZoom: 1 };
      cameraFrame(engine, live, num, model.migrationStudyDistance, { current: true }, .016, 0); camera.updateMatrixWorld(true);
      const target = bird.getWorldPosition(new THREE.Vector3()), offset = camera.position.clone().sub(target);
      expect(offset.y).toBeLessThan(0); expect(Math.atan2(offset.y, Math.hypot(offset.x, offset.z)) * 180 / Math.PI).toBeCloseTo(pitch, 7);
      let extent = 0, minDepth = Infinity, maxDepth = -Infinity; const point = new THREE.Vector3();
      bird.traverse(node => { const positions = node.geometry?.attributes?.position; if (!positions) return;
        for (let i = 0; i < positions.count; i++) { point.fromBufferAttribute(positions, i).applyMatrix4(node.matrixWorld).project(camera);
          extent = Math.max(extent, Math.abs(point.x), Math.abs(point.y)); minDepth = Math.min(minDepth, point.z); maxDepth = Math.max(maxDepth, point.z); }
      });
      expect(extent).toBeLessThan(1); expect(minDepth).toBeGreaterThan(-1); expect(maxDepth).toBeLessThan(1);
    }
  });

  it.each(['canada_goose', 'snow_goose', 'arctic_tern', 'ruby_hummingbird', 'peregrine', 'sandhill_crane', 'bartailed_godwit', 'monarch'])('keeps every intermediate ordinary-motion %s surface comparison at fitted radial distance', id => {
    const bird = model.createMigrationFlyer(THREE, { id }, 0); bird.position.set(0, 3, -5);
    const camera = new THREE.PerspectiveCamera(54, 1, .1, 900);
    const engine = { flyers: [bird], camera, cameraViews: { chase: new THREE.Vector3() }, studyTarget: new THREE.Vector3(),
      studyOrbit: new THREE.Vector3(), cameraTarget: new THREE.Vector3() };
    for (const aspect of [.65, 2.1]) for (const phase of [0, Math.PI / 2, 3 * Math.PI / 2]) {
      camera.aspect = aspect; camera.updateProjectionMatrix(); bird.userData.applyWingPhase(phase); bird.updateMatrixWorld(true);
      const live = { flightCamera: 'study', flightStudyYaw: 0, flightStudyPitch: 60, flightStudyZoom: 1 };
      cameraFrame(engine, live, num, model.migrationStudyDistance, { current: true }, .016, 0);
      const radius = model.migrationStudyDistance(bird, camera, 1), point = new THREE.Vector3();
      for (const pitch of [-60, 60]) {
        live.flightStudyPitch = pitch;
        for (let frame = 0; frame < 36; frame++) {
          cameraFrame(engine, live, num, model.migrationStudyDistance, { current: false }, 1 / 30, 0);
          camera.updateMatrixWorld(true);
          expect(camera.position.distanceTo(engine.cameraTarget)).toBeCloseTo(radius, 8);
          let extent = 0, minDepth = Infinity, maxDepth = -Infinity;
          bird.traverse(node => { const positions = node.geometry?.attributes?.position; if (!positions) return;
            for (let i = 0; i < positions.count; i++) { point.fromBufferAttribute(positions, i).applyMatrix4(node.matrixWorld).project(camera);
              extent = Math.max(extent, Math.abs(point.x), Math.abs(point.y)); minDepth = Math.min(minDepth, point.z); maxDepth = Math.max(maxDepth, point.z); }
          });
          expect(extent, id + ' transition frame ' + frame).toBeLessThan(1);
          expect(minDepth).toBeGreaterThan(-1); expect(maxDepth).toBeLessThan(1);
        }
        expect(Math.sign(camera.position.y - engine.cameraTarget.y)).toBe(Math.sign(pitch));
      }
    }
  });
  it.each([[1.6, .65], [.65, 1.6]])('interpolates radial zoom %s to %s without overshoot during ordinary orbit', (initialZoom, zoom) => {
    const bird = model.createMigrationFlyer(THREE, { id: 'canada_goose' }, 0);
    const camera = new THREE.PerspectiveCamera(54, .65, .1, 900);
    const engine = { flyers: [bird], camera, cameraViews: { chase: new THREE.Vector3() }, studyTarget: new THREE.Vector3(),
      studyOrbit: new THREE.Vector3(), cameraTarget: new THREE.Vector3() };
    const live = { flightCamera: 'study', flightStudyYaw: 0, flightStudyPitch: 60, flightStudyZoom: initialZoom };
    cameraFrame(engine, live, num, model.migrationStudyDistance, { current: true }, .016, 0);
    let previous = camera.position.distanceTo(engine.cameraTarget);
    const start = previous, target = model.migrationStudyDistance(bird, camera, zoom), blend = 1 - Math.exp(-4.7 / 30);
    live.flightStudyZoom = zoom; live.flightStudyPitch = -60;
    for (let frame = 0; frame < 50; frame++) {
      cameraFrame(engine, live, num, model.migrationStudyDistance, { current: false }, 1 / 30, 0);
      const actual = camera.position.distanceTo(engine.cameraTarget);
      expect(actual).toBeCloseTo(previous + (target - previous) * blend, 9);
      expect(actual).toBeGreaterThanOrEqual(Math.min(start, target) - 1e-9);
      expect(actual).toBeLessThanOrEqual(Math.max(start, target) + 1e-9);
      expect(Math.abs(target - actual)).toBeLessThan(Math.abs(target - previous));
      previous = actual;
    }
  });
  it('uses the desired orbit direction when opposite positions interpolate to zero without producing an invalid camera', () => {
    const bird = model.createMigrationFlyer(THREE, { id: 'canada_goose' }, 0);
    const camera = new THREE.PerspectiveCamera(54, 2.1, .1, 900), radius = model.migrationStudyDistance(bird, camera, 1);
    const engine = { flyers: [bird], camera, cameraViews: { chase: new THREE.Vector3() }, studyTarget: new THREE.Vector3(),
      studyOrbit: new THREE.Vector3(), cameraTarget: new THREE.Vector3() };
    camera.position.set(0, 0, -radius);
    const live = { flightCamera: 'study', flightStudyYaw: 0, flightStudyPitch: 0, flightStudyZoom: 1 };
    cameraFrame(engine, live, num, model.migrationStudyDistance, { current: false }, Math.log(2) / 4.7, 0);
    camera.updateMatrixWorld(true);
    expect(camera.position.toArray().every(Number.isFinite)).toBe(true);
    expect(camera.quaternion.toArray().every(Number.isFinite)).toBe(true);
    expect(camera.position.distanceTo(engine.cameraTarget)).toBeCloseTo(radius, 8);
    expect(camera.position.z).toBeGreaterThan(0);
  });


  it.each([[180, 0], [-180, 0], [179.5, 0], [180, .5], [180, 5]])('reaches the opposite ordinary viewpoint from yaw %s / pitch %s without a half-turn snap or stall', (yaw, pitch) => {
    const bird = model.createMigrationFlyer(THREE, { id: 'canada_goose' }, 0);
    const camera = new THREE.PerspectiveCamera(54, 2.1, .1, 900);
    const engine = { flyers: [bird], camera, cameraViews: { chase: new THREE.Vector3() }, studyTarget: new THREE.Vector3(),
      studyOrbit: new THREE.Vector3(), cameraTarget: new THREE.Vector3() };
    const live = { flightCamera: 'study', flightStudyYaw: yaw, flightStudyPitch: pitch, flightStudyZoom: 1 };
    cameraFrame(engine, live, num, model.migrationStudyDistance, { current: true }, .016, 0);
    const radius = model.migrationStudyDistance(bird, camera, 1);
    live.flightStudyYaw = 0; live.flightStudyPitch = 0;
    for (let frame = 0; frame < 120; frame++) {
      cameraFrame(engine, live, num, model.migrationStudyDistance, { current: false }, 1 / 30, 0);
      expect(camera.position.distanceTo(engine.cameraTarget)).toBeCloseTo(radius, 8);
      expect(camera.position.toArray().every(Number.isFinite)).toBe(true);
    }
    expect(camera.position.distanceTo(new THREE.Vector3(0, 0, radius))).toBeLessThan(1e-5);
    expect(engine.studyHalfTurnSource || null).toBeNull();
  });

});
