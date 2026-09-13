import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { React, ReactDOMClient, makeCtx, resetStemLab, loadTool } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url), THREE = require('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/stem_tool_geometryworld.js', 'utf8');
const entryStart = source.indexOf('          // Free Build is immediately interactive.');
const entryEnd = source.indexOf('          // Reset undo stacks on lesson load', entryStart);
if (entryStart < 0 || entryEnd < entryStart) throw Error('Missing production entry block');
const enter = new Function('engine', 'lesson', source.slice(entryStart, entryEnd));

describe('Free Build arrives ready for direct input', () => {
  function fixture() {
    return { camera: new THREE.PerspectiveCamera(75, 1.5, .1, 200), euler: new THREE.Euler(0, 0, 0, 'YXZ'),
      velocity: new THREE.Vector3(3, -4, 2), _entryAnim: { progress: .2 }, blocks: { '0,0,0': {} }, _undoStack: [{ action: 'place' }] };
  }
  it('starts at spawn with a reachable ground target and no focus-dependent animation', () => {
    const engine = fixture(), blocks = engine.blocks, history = engine._undoStack;
    enter(engine, { sandbox: true, spawnPoint: [0, 3, 6], ground: { y: 0 } });
    expect(engine.camera.position.toArray()).toEqual([0, 3, 6]);
    expect(engine._entryAnim).toBeNull(); expect(engine.velocity.length()).toBe(0);
    const caster = new THREE.Raycaster();
    caster.setFromCamera(new THREE.Vector2(0, 0), engine.camera);
    const ground = caster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -1), new THREE.Vector3());
    expect(ground.x).toBeCloseTo(0.5); expect(ground.y).toBeCloseTo(1); expect(ground.z).toBeCloseTo(3.5);
    expect(ground.distanceTo(engine.camera.position)).toBeLessThan(5);
    expect(new THREE.Quaternion().setFromEuler(engine.euler).angleTo(engine.camera.quaternion)).toBeCloseTo(0, 7);
    expect(engine.blocks).toBe(blocks); expect(engine._undoStack).toBe(history);
  });
  it('keeps the camera above an elevated floor and aims at that floor', () => {
    const engine = fixture();
    enter(engine, { sandbox: true, spawnPoint: [8, 2, -7], ground: { y: 5 } });
    expect(engine.camera.position.toArray()).toEqual([8, 7.6, -7]);
    const expected = new THREE.Vector3(0.5, 6 - 7.6, -2.5).normalize();
    expect(engine.camera.getWorldDirection(new THREE.Vector3()).distanceTo(expected)).toBeLessThan(1e-8);
  });
  it('retains the authored lesson fly-in', () => {
    const engine = fixture();
    enter(engine, { spawnPoint: [4, 3, 9], ground: { y: 0 } });
    expect(engine.camera.position.toArray()).toEqual([4, 18, 1]);
    expect(engine._entryAnim).toEqual({ targetX: 4, targetY: 3, targetZ: 9, progress: 0 });
  });
});

// Reuse the existing mounted core fixture; all UI under test comes from the
// current registered production module, not report scripts or copied markup.
const fixtureSource = readFileSync('tests/geometry_world_discoverability.test.js', 'utf8');
const fixtureStart = fixtureSource.indexOf('function makeThreeStub() {');
const fixtureEnd = fixtureSource.indexOf("describe('mounted affordances'", fixtureStart);
if (fixtureStart < 0 || fixtureEnd < fixtureStart) throw Error('Missing mounted discoverability fixture');
const fixtures = new Function('document', 'React', 'ReactDOMClient', 'makeCtx', fixtureSource.slice(fixtureStart, fixtureEnd) + '\nreturn {makeThreeStub,fakeEngine,mountTool};')(document, React, ReactDOMClient, makeCtx);
let cfg, mounted;
const originalWidth = window.innerWidth;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
beforeEach(() => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
  resetStemLab(); window.THREE = fixtures.makeThreeStub();
  cfg = loadTool('stem_lab/stem_tool_geometryworld.js', 'geometryWorld');
  window.__geoWorldEngine = fixtures.fakeEngine();
  window.__geoWorldEngine._currentLesson = { title: 'Free Build Sandbox', sandbox: true, ground: { y: 0 } };
});
afterEach(() => {
  if (mounted) mounted.unmount(); mounted = null;
  delete window.__geoWorldEngine; vi.restoreAllMocks();
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
});
function mount(patch = {}) {
  mounted = fixtures.mountTool(cfg, { worldActive: true, activeLesson: 'builderSandbox', totalQ: 0, score: 0,
    _introShownOnce: true, tutorialDismissed: true, showLessonIntro: false, ...patch });
  mounted.rerender(); return mounted.container;
}

describe('Free Build toolbar and placement guidance', () => {
  it('omits empty quiz progress and lesson objectives while retaining useful build tools', () => {
    const ui = mount();
    expect(ui.querySelector('.gw-toolbar').getAttribute('aria-label')).toBe('Geometry World building tools');
    expect(ui.querySelector('.gw-status-cluster').getAttribute('aria-label')).toBe('Build status and tools');
    expect(ui.querySelector('.gw-stat-chip[aria-label^="Lesson progress:"]')).toBeNull();
    expect(ui.querySelector('[aria-label="Open lesson objectives"]')).toBeNull();
    expect(ui.querySelector('[aria-label="Open volume estimate drawer"]')).toBeTruthy();
    expect(ui.querySelector('[data-geometry-settings-trigger]')).toBeTruthy();
    expect(ui.querySelector('#geoworld-fs-wrap').getAttribute('aria-label')).not.toContain('0 of 0');
  });
  it('retains question progress and objectives in an authored lesson', () => {
    const ui = mount({ activeLesson: 'volumeExplorer', totalQ: 3, score: 1 });
    expect(ui.querySelector('.gw-stat-chip[aria-label^="Lesson progress:"]').textContent).toContain('1/3');
    expect(ui.querySelectorAll('[aria-label="Open lesson objectives"]').length).toBe(2);
  });
  it('keeps no-target aiming neutral and actionable without changing the world', () => {
    const engine = window.__geoWorldEngine, aim = engine.aimAtBuildArea = vi.fn();
    const ui = mount({ placementHint: { allowed: false, code: 'no_target', reason: 'Old verbose instruction', aim: true } });
    const hint = ui.querySelector('.gw-placement-hint');
    expect(hint.dataset.placementState).toBe('aim');
    expect(hint.textContent).toContain('Look down at the nearby ground or a block face.');
    expect(hint.querySelector('.gw-placement-hint-mark').textContent).not.toContain('!');
    React.act(() => hint.querySelector('.gw-placement-aim').click());
    expect(aim).toHaveBeenCalledOnce(); expect(engine.blocks).toEqual({});
  });
  it('shows the usable desktop shortcut only for an allowed destination', () => {
    const ui = mount({ placementHint: { allowed: true, code: 'ready', reason: 'Ready to build' } });
    expect(ui.querySelector('.gw-placement-hint').dataset.placementState).toBe('ready');
    expect(ui.querySelector('.gw-placement-shortcut kbd').textContent).toBe('B');
  });
  it('uses the existing Place action while touch controls are active', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    const ui = mount({ touchMode: true, placementHint: { allowed: true, code: 'ready', reason: 'Ready to build' } });
    expect(ui.querySelector('.gw-placement-shortcut').textContent).toBe('Tap Place');
  });
  it('preserves an actual blocker reason and never advertises a valid placement', () => {
    const ui = mount({ placementHint: { allowed: false, code: 'occupied', reason: 'This cell already has a block' } });
    expect(ui.querySelector('.gw-placement-hint').dataset.placementState).toBe('blocked');
    expect(ui.querySelector('.gw-placement-text').textContent).toBe('This cell already has a block');
    expect(ui.querySelector('.gw-placement-shortcut')).toBeNull();
  });
});
