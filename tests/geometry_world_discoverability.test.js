// Geometry World control discoverability and first-block guidance.
//
// Users were not finding that Q cycles shapes, R rotates, and Escape frees a
// captured cursor; a first-time builder aiming at the sky got no guidance at all
// (the no_target case was suppressed); and placement status sat right under the
// crosshair. These pin the visible affordances, the guidance rules, and the one
// invariant that matters most: helping never mutates the world.

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { React, ReactDOMClient, makeCtx, resetStemLab, loadTool } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const THREE = require('../vendor/three-r128/three.min.js');
const FILE = 'stem_lab/stem_tool_geometryworld.js';
const src = readFileSync(FILE, 'utf8');
const ENGINE_KEY = '__geoWorldEngine';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// ── Engine-level: the placement preview and the aim action, sliced from source ──
function slice(start, end) { const a = src.indexOf(start), b = src.indexOf(end, a); if (a < 0 || b < a) throw new Error('missing ' + start); return src.slice(a, b); }
const MAX_BLOCKS = Number((src.match(/var MAX_BLOCKS = (\d+)/) || [])[1] || 1500);
function makeEngine() {
  const updates = [];
  const engine = { blocks: {}, _currentLesson: { ground: { y: 0 } }, blocksPlaced: 0, camera: new THREE.PerspectiveCamera(75, 1.5, 0.1, 200), euler: new THREE.Euler(0, 0, 0, 'YXZ') };
  engine.camera.position.set(2, 3, 2);
  engine.camera.lookAt(2, 3, -10); // dead level: the sky
  engine.euler.setFromQuaternion(engine.camera.quaternion);
  engine.getBlocksArr = () => Object.values(engine.blocks);
  engine.blockUnderCrosshair = () => null;
  const body = slice("        engine.getPlacementEligibility = function(x, y, z) {", "        engine.publishPlacementPreview(null);");
  new Function('engine', 'window', 'MAX_BLOCKS', 'upd', body)(engine, window, MAX_BLOCKS, (k, v) => updates.push({ key: k, value: v }));
  // placementCellForHit is defined elsewhere; null hit is all these tests need
  engine.placementCellForHit = (hit) => hit && hit.cell ? hit.cell : null;
  return { engine, updates };
}

describe('first-block guidance never touches the world', () => {
  let savedThree;
  beforeAll(() => { savedThree = window.THREE; window.THREE = THREE; });
  afterEach(() => { window.THREE = THREE; });
  it('explains how to aim when there is no target and the student has yet to build', () => {
    const { engine, updates } = makeEngine();
    engine.publishPlacementPreview(engine.placementForHit(null));
    const hint = updates.at(-1).value;
    expect(hint).toBeTruthy();
    expect(hint.code).toBe('no_target');
    expect(hint.allowed).toBe(false);
    expect(hint.reason).toMatch(/Look down at the nearby ground or a block face/);
    expect(hint.reason).toMatch(/press B or tap Place/);
    expect(hint.aim).toBe(true);
    // and nothing was placed to help
    expect(Object.keys(engine.blocks)).toHaveLength(0);
    expect(engine._placementPreview.cell).toBeNull();
  });

  it('goes quiet about no_target once the student has placed a block', () => {
    const { engine, updates } = makeEngine();
    engine.blocksPlaced = 1;
    engine.publishPlacementPreview(engine.placementForHit(null));
    expect(updates.at(-1).value).toBeNull();
  });

  it('keeps the ready hint shape unchanged for real targets', () => {
    const { engine, updates } = makeEngine();
    engine.publishPlacementPreview(engine.getPlacementEligibility(0, 1, 0));
    expect(updates.at(-1).value).toEqual({ allowed: true, code: 'ready', reason: 'Ready to build' });
  });

  it('preserves every existing refusal code and reason', () => {
    const { engine } = makeEngine();
    engine.blocks['0,1,0'] = {};
    expect(engine.getPlacementEligibility(0, 1, 0).code).toBe('occupied');
    expect(engine.getPlacementEligibility(0.5, 1, 0).code).toBe('out_of_bounds');
    expect(engine.getPlacementEligibility(0, -1, 0).code).toBe('below_floor');
    engine._currentLesson = { sandbox: true, ground: { y: 0 } };
    expect(engine.getPlacementEligibility(65, 1, 0).code).toBe('out_of_bounds');
  });

  it('the aim action pitches the camera to the ground ahead and moves nothing else', () => {
    const { engine } = makeEngine();
    const before = engine.camera.getWorldDirection(new THREE.Vector3());
    expect(Math.abs(before.y)).toBeLessThan(0.05); // looking level, at nothing
    const pos = engine.camera.position.clone();
    expect(engine.aimAtBuildArea()).toBe(true);
    const after = engine.camera.getWorldDirection(new THREE.Vector3());
    expect(after.y).toBeLessThan(-0.3); // now pitched down
    // yaw kept: still facing -z
    expect(after.z).toBeLessThan(0);
    expect(Math.abs(after.x)).toBeLessThan(0.05);
    // camera did not move, no block appeared, and the look euler follows the camera
    expect(engine.camera.position.toArray()).toEqual(pos.toArray());
    expect(Object.keys(engine.blocks)).toHaveLength(0);
    const e = new THREE.Euler().setFromQuaternion(engine.camera.quaternion, 'YXZ');
    expect(engine.euler.x).toBeCloseTo(e.x, 6);
    expect(engine.euler.y).toBeCloseTo(e.y, 6);
  });
});

// ── Source contracts for the visible affordances ──
describe('control discoverability affordances', () => {
  it('shows Q on the shape heading and keeps every shape directly clickable', () => {
    expect(src).toContain("className: 'gw-shape-heading gw-focusable', 'aria-keyshortcuts': 'Q'");
    expect(src).toContain("onClick: function() { setBuildShape('cycle'); } }");
    expect(src).toContain("el('kbd', { className: 'gw-key-badge', 'aria-hidden': 'true' }, 'Q')");
    expect(src).toContain("onClick: function() { setBuildShape('select', i); },");
    expect(src).toContain("'aria-pressed': i === selectedShape ? 'true' : 'false',");
  });

  it('shows R on an always-present rotate control that is inert for the cube', () => {
    expect(src).not.toContain("selectedShape > 0 && el('button', {\n            style: { fontSize: '8px'");
    expect(src).toContain("disabled: selectedShape === 0,");
    expect(src).toContain("'aria-keyshortcuts': 'R',");
    expect(src).toContain("el('kbd', { className: 'gw-key-badge', 'aria-hidden': 'true' }, 'R')");
  });

  it('tells a captured-cursor user how to get it back, and a free-cursor user how to look', () => {
    expect(src).toContain("className: 'gw-pointer-hint', 'data-locked': pointerLocked ? 'true' : 'false'");
    expect(src).toContain("'Free cursor'");
    expect(src).toContain("'Click the world to look'");
    // fed by the real pointerlockchange handler, never persisted
    expect(src).toContain("try { if (engine._setPointerLocked) engine._setPointerLocked(engine.isLocked); } catch (e) {}");
    expect(src).not.toMatch(/upd\(\s*['"]pointerLocked['"]/);
    // hidden on touch layouts and under overlays
    expect(src).toContain("worldActive && !isMobile && openModals.length === 0 && !d.showcaseActive && el('div', {\n          className: 'gw-pointer-hint'");
    // and it must not key on the touch-controls preference, which defaults on everywhere,
    // including desktop: that hid the chip for every desktop user in the first QA pass
    expect(src).not.toContain("!isMobile && !touchMode && openModals.length === 0 && !d.showcaseActive && el('div', {\n          className: 'gw-pointer-hint'");
  });

  it('moves placement status out from under the crosshair', () => {
    const css = src.slice(src.indexOf('".gw-placement-hint{'), src.indexOf('".gw-placement-hint{') + 200);
    expect(css).not.toContain('top:calc(50% + 28px)');
    expect(css).toContain('bottom:186px');
    expect(css).toContain('flex-wrap:wrap');
    // the touch chip never covers the crosshair either, and touch targets stay 44px
    expect(src).toContain('@media(pointer:coarse){.gw-shape-heading,.gw-shape-rotate{min-height:44px!important;min-width:44px!important}');
  });

  it('keeps the screen-reader instructions accurate for Q, R and Escape', () => {
    const instructions = src.slice(src.indexOf("'Interactive 3D world. W A S D to move"), src.indexOf("'Interactive 3D world. W A S D to move") + 700);
    expect(instructions).toMatch(/Q changes block shape/);
    expect(instructions).toMatch(/R rotates it/);
    expect(instructions).toMatch(/Escape releases it/);
  });
});

// ── Mounted: the chips and badges render, and no ghost exists with no target ──
function makeThreeStub() {
  function vec() {
    const v = { x: 0, y: 0, z: 0, w: 0 };
    ['set', 'copy', 'add', 'sub', 'subVectors', 'normalize', 'multiplyScalar', 'applyQuaternion', 'setFromQuaternion', 'crossVectors', 'cross', 'lerp', 'addScaledVector', 'setY', 'round', 'floor', 'setScalar', 'applyEuler', 'fromArray', 'lookAt'].forEach((m) => { v[m] = () => v; });
    v.clone = () => vec(); v.distanceTo = () => 99; v.length = () => 1; v.lengthSq = () => 1; v.dot = () => 0; v.toArray = () => [0, 0, 0];
    return v;
  }
  return new Proxy({}, { get: function (_t, prop) { if (prop === 'SRGBColorSpace') return 'srgb'; if (typeof prop === 'symbol') return undefined; return function () { return vec(); }; } });
}
function fakeEngine() {
  const canvas = document.createElement('canvas');
  const v = () => ({ x: 0, y: 0, z: 0, distanceTo: () => 99, set() {}, clone() { return v(); }, toArray: () => [0, 0, 0], copy() { return this; }, sub() { return this; }, normalize() { return this; }, lengthSq: () => 1, length: () => 1 });
  return { clearWorld() {}, scene: { remove() {}, add() {}, children: [], background: { setRGB() {} }, fog: { color: { setRGB() {} } } }, renderer: { dispose() {}, domElement: canvas },
    camera: { position: v(), quaternion: { x: 0, y: 0, z: 0, w: 1, toArray: () => [0, 0, 0, 1] }, rotation: { x: 0, y: 0, z: 0 }, getWorldDirection: (o) => o || v(), updateProjectionMatrix() {}, lookAt() {}, up: v() },
    blocks: {}, npcs: [], _particles: [], _dimLines: [], _selectionGlows: [], _layerGhosts: [], moveState: {}, lookState: {}, euler: { x: 0, y: 0, z: 0, setFromQuaternion() {} },
    isLocked: false, isInputActive: () => false, blockUnderCrosshair: () => null, loadLesson() {}, placeBlock() {}, removeBlock() {}, releaseInput() {}, getBlocksArr: () => [],
    clock: { getElapsedTime: () => 0, getDelta: () => 0.016 }, logEvent() {}, geometryHomeLessons: [] };
}
function mountTool(cfg, bucket) {
  const container = document.createElement('div'); document.body.appendChild(container);
  const toolData = { _threeLoaded: true, geometryWorld: Object.assign({}, bucket) };
  let bump = null;
  const ctx = makeCtx({ toolData, update: (b, k, val) => { toolData[b] = Object.assign({}, toolData[b], { [k]: val }); if (bump) bump(); }, updateMulti: (b, patch) => { toolData[b] = Object.assign({}, toolData[b], patch); if (bump) bump(); } });
  const Comp = () => { const st = React.useState(0); bump = () => st[1]((n) => n + 1); return cfg.render(ctx); };
  const root = ReactDOMClient.createRoot(container);
  React.act(() => { root.render(React.createElement(Comp)); });
  return { container, bucket: () => toolData.geometryWorld, rerender: () => React.act(() => bump()), unmount: () => { React.act(() => root.unmount()); container.remove(); } };
}

describe('mounted affordances', () => {
  let cfg;
  beforeAll(() => { resetStemLab(); window.THREE = makeThreeStub(); cfg = loadTool(FILE, 'geometryWorld'); });
  beforeEach(() => { window.THREE = makeThreeStub(); window[ENGINE_KEY] = fakeEngine(); });
  afterEach(() => { delete window[ENGINE_KEY]; document.body.innerHTML = ''; });

  it('renders the Q heading, the R control and the free-cursor hint in a live desktop world', () => {
    const m = mountTool(cfg, { worldActive: true, activeLesson: 'builderSandbox', _introShownOnce: true, tutorialDismissed: true, showLessonIntro: false });
    m.rerender();
    const q = m.container.querySelector('button.gw-shape-heading[aria-keyshortcuts="Q"]');
    expect(q).toBeTruthy();
    expect(q.textContent).toContain('Q');
    const r = m.container.querySelector('button.gw-shape-rotate[aria-keyshortcuts="R"]');
    expect(r).toBeTruthy();
    expect(r.disabled).toBe(true); // cube selected by default
    expect(r.textContent).toContain('R');
    // every shape is still its own button
    const shapes = m.container.querySelectorAll('button.gw-shape-item[aria-pressed]');
    expect(shapes.length).toBeGreaterThanOrEqual(4);
    const chip = m.container.querySelector('.gw-pointer-hint');
    expect(chip).toBeTruthy();
    expect(chip.getAttribute('data-locked')).toBe('false');
    expect(chip.textContent).toContain('Click the world to look');
    m.unmount();
  });

  it('switches the chip to the Escape hint when the engine reports a captured cursor', () => {
    const m = mountTool(cfg, { worldActive: true, activeLesson: 'builderSandbox', _introShownOnce: true, tutorialDismissed: true, showLessonIntro: false });
    m.rerender();
    const eng = window[ENGINE_KEY];
    expect(typeof eng._setPointerLocked).toBe('function');
    React.act(() => { eng._setPointerLocked(true); });
    const chip = m.container.querySelector('.gw-pointer-hint');
    expect(chip.getAttribute('data-locked')).toBe('true');
    expect(chip.textContent).toContain('Esc');
    expect(chip.textContent).toContain('Free cursor');
    // and it is never written into the persisted bucket
    expect(m.bucket().pointerLocked).toBeUndefined();
    m.unmount();
  });

  it('renders the no-target hint with an aim button and no ghost preview', () => {
    const m = mountTool(cfg, { worldActive: true, activeLesson: 'builderSandbox', _introShownOnce: true, tutorialDismissed: true, showLessonIntro: false,
      placementHint: { allowed: false, code: 'no_target', reason: 'Look down at the nearby ground or a block face, then press B or tap Place.', aim: true } });
    m.rerender();
    const hint = m.container.querySelector('.gw-placement-hint[data-placement-code="no_target"]');
    expect(hint).toBeTruthy();
    expect(hint.textContent).toContain('Look down at the nearby ground');
    const aim = hint.querySelector('button.gw-placement-aim');
    expect(aim).toBeTruthy();
    // the engine owns the ghost; with no hit it was never created
    expect(window[ENGINE_KEY]._ghostMesh).toBeUndefined();
    m.unmount();
  });
});
