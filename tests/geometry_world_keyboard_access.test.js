// Geometry World keyboard + screen-reader access.
//
// Two defects this pins:
//
// 1. The 3D world container carried role="img" while also being tabIndex=0 with
//    its own WASD / pointer-lock key handling. ARIA treats an img's subtree as
//    presentational, so the Fullscreen and Enter VR buttons rendered inside it
//    were pruned out of the accessibility tree entirely (WCAG 4.1.2).
//
// 2. Looking around was mouse-only (pointer-lock mousemove / touch drag). A
//    keyboard-only student could WALK but never TURN — and both "E to talk" and
//    "M to measure" raycast from the crosshair, so they could never aim at an NPC
//    or a structure. Arrow keys now steer the camera.
//
// The DOM assertions mount the real tool; the look-integration assertions extract
// applyKeyLook from source (same new Function slice technique as
// geometry_world_measurement_model.test.js) because the animate loop it normally
// runs inside needs a WebGL context jsdom does not have.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, makeCtx, resetStemLab, loadTool } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_geometryworld.js';
const SOURCE = readFileSync(FILE, 'utf8');
const ENGINE_KEY = '__geoWorldEngine';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function makeThreeStub() {
  function vec() {
    const v = { x: 0, y: 0, z: 0, w: 0 };
    ['set', 'copy', 'add', 'sub', 'subVectors', 'normalize', 'multiplyScalar', 'applyQuaternion',
     'setFromQuaternion', 'crossVectors', 'cross', 'lerp', 'addScaledVector', 'setY', 'round',
     'floor', 'setScalar', 'applyEuler'].forEach(function (m) { v[m] = function () { return v; }; });
    v.clone = function () { return vec(); };
    v.distanceTo = function () { return 99; };
    v.length = function () { return 1; };
    v.dot = function () { return 0; };
    return v;
  }
  return new Proxy({}, {
    get: function (_t, prop) {
      if (prop === 'SRGBColorSpace') return 'srgb';
      if (typeof prop === 'symbol') return undefined;
      return function () { return vec(); };
    },
  });
}

function makeFakeEngine() {
  return {
    clearWorld: function () {},
    scene: { remove: function () {} },
    renderer: { dispose: function () {}, domElement: document.createElement('canvas') },
    camera: {
      position: { x: 0, y: 0, z: 0, distanceTo: function () { return 99; }, set: function () {}, clone: function () { return { x: 0, y: 0, z: 0 }; } },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      rotation: { x: 0, y: 0, z: 0 },
      getWorldDirection: function (v) { return v || { x: 0, y: 0, z: -1 }; },
      updateProjectionMatrix: function () {},
    },
    blocks: {}, npcs: [], blocksPlaced: 0, sessionLog: [],
    raycaster: null, flyMode: false, moveState: {}, velocity: { x: 0, y: 0, z: 0 }, onGround: true,
    _undoStack: [], _redoStack: [], _coordAnnounce: false, _targetGrid: null, _jumpLock: false,
    _sessionXP: 0, _crosshairTarget: 'none', _inWater: false, _inLava: false, _gridHelper: null,
    loadLesson: function () {}, logEvent: function () {},
    undo: function () {}, redo: function () {},
    returnToSpawn: function () {}, clearPlayerBlocks: function () {},
    measureStructure: function () {}, placeBlock: function () {}, removeBlock: function () {},
  };
}

function mountTool(cfg, bucket) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const toolData = { _threeLoaded: true, geometryWorld: Object.assign({}, bucket) };
  let bump = null;
  const ctx = makeCtx({
    toolData: toolData,
    update: function (b, k, v) { toolData[b] = Object.assign({}, toolData[b], { [k]: v }); if (bump) bump(); },
    updateMulti: function (b, p) { toolData[b] = Object.assign({}, toolData[b], p); if (bump) bump(); },
  });
  const Comp = function () {
    const st = React.useState(0);
    bump = function () { st[1](function (n) { return n + 1; }); };
    return cfg.render(ctx);
  };
  const root = ReactDOMClient.createRoot(container);
  React.act(function () { root.render(React.createElement(Comp)); });
  return {
    container: container,
    unmount: function () { React.act(function () { root.unmount(); }); container.remove(); },
  };
}

/** Pull applyKeyLook (+ its constants) out of the IIFE without running the tool. */
function loadLookMath() {
  const start = SOURCE.indexOf('  var KEY_LOOK_SPEED');
  const end = SOURCE.indexOf('\n', SOURCE.indexOf('  }', SOURCE.indexOf('function applyKeyLook')));
  const body = SOURCE.slice(start, end);
  // eslint-disable-next-line no-new-func
  return new Function(body + '\nreturn { applyKeyLook, KEY_LOOK_SPEED, PITCH_LIMIT };')();
}

describe('Geometry World world-surface accessibility', () => {
  let cfg;

  beforeEach(() => {
    resetStemLab();
    window.THREE = makeThreeStub();
    cfg = loadTool(FILE, 'geometryWorld');
    window[ENGINE_KEY] = makeFakeEngine();
  });

  afterEach(() => {
    delete window[ENGINE_KEY];
    delete window[ENGINE_KEY + '_failed'];
    delete window.THREE;
    document.body.innerHTML = '';
  });

  it('does not label the interactive world surface as an image', () => {
    const m = mountTool(cfg, { _introShownOnce: true, worldActive: true });
    const wrap = m.container.querySelector('#geoworld-fs-wrap');

    expect(wrap).toBeTruthy();
    // role="img" prunes the subtree from the accessibility tree.
    expect(wrap.getAttribute('role')).not.toBe('img');
    expect(wrap.getAttribute('role')).toBe('application');
    m.unmount();
  });

  it('keeps the controls inside the world surface exposed to assistive tech', () => {
    const m = mountTool(cfg, { _introShownOnce: true, worldActive: true });
    const wrap = m.container.querySelector('#geoworld-fs-wrap');

    // The fullscreen toggle is a real child of the surface; under role="img" it
    // was unreachable. It must be a genuine button with an accessible name.
    const buttons = Array.from(wrap.querySelectorAll('button'));
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach(function (b) {
      expect(b.getAttribute('aria-label') || b.textContent).toBeTruthy();
    });
    m.unmount();
  });

  it('is focusable and describes its keyboard contract', () => {
    const m = mountTool(cfg, { _introShownOnce: true, worldActive: true });
    const wrap = m.container.querySelector('#geoworld-fs-wrap');

    expect(wrap.getAttribute('tabindex')).toBe('0');

    const describedBy = wrap.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();

    const desc = m.container.querySelector('#' + describedBy);
    expect(desc).toBeTruthy();
    // Names the keys a non-mouse user needs, not just "click to enter".
    expect(desc.textContent).toMatch(/arrow keys/i);
    expect(desc.textContent).toMatch(/W A S D/i);
    m.unmount();
  });

  it('advertises arrow-key look in the in-app controls panel', () => {
    const m = mountTool(cfg, { _introShownOnce: true, worldActive: true, showHelp: true });
    expect(m.container.textContent).toContain('Look around (no mouse)');
    m.unmount();
  });
});

describe('Geometry World arrow-key look', () => {
  const math = loadLookMath();

  it('turns left and right on the yaw axis', () => {
    const e = { x: 0, y: 0, z: 0 };
    expect(math.applyKeyLook(e, { left: true }, 0.1)).toBe(true);
    expect(e.y).toBeCloseTo(math.KEY_LOOK_SPEED * 0.1, 10);

    const e2 = { x: 0, y: 0, z: 0 };
    math.applyKeyLook(e2, { right: true }, 0.1);
    expect(e2.y).toBeCloseTo(-math.KEY_LOOK_SPEED * 0.1, 10);
  });

  it('is frame-rate independent', () => {
    // One 0.2s frame must equal two 0.1s frames — otherwise look speed rides on FPS.
    const slow = { x: 0, y: 0, z: 0 };
    math.applyKeyLook(slow, { left: true }, 0.2);

    const fast = { x: 0, y: 0, z: 0 };
    math.applyKeyLook(fast, { left: true }, 0.1);
    math.applyKeyLook(fast, { left: true }, 0.1);

    expect(fast.y).toBeCloseTo(slow.y, 10);
  });

  it('clamps pitch short of vertical so the view cannot flip', () => {
    const e = { x: 0, y: 0, z: 0 };
    for (let i = 0; i < 200; i += 1) math.applyKeyLook(e, { up: true }, 0.1);
    expect(e.x).toBeLessThanOrEqual(math.PITCH_LIMIT);
    expect(e.x).toBeLessThan(Math.PI / 2);

    const d = { x: 0, y: 0, z: 0 };
    for (let i = 0; i < 200; i += 1) math.applyKeyLook(d, { down: true }, 0.1);
    expect(d.x).toBeGreaterThanOrEqual(-math.PITCH_LIMIT);
    expect(d.x).toBeGreaterThan(-Math.PI / 2);
  });

  it('reports no movement when nothing is held, so idle frames skip the write', () => {
    const e = { x: 0.3, y: 0.4, z: 0 };
    expect(math.applyKeyLook(e, { left: false, right: false, up: false, down: false }, 0.1)).toBe(false);
    expect(e.x).toBe(0.3);
    expect(e.y).toBe(0.4);
  });

  it('cancels out when opposite keys are held together', () => {
    const e = { x: 0, y: 0, z: 0 };
    math.applyKeyLook(e, { left: true, right: true, up: true, down: true }, 0.1);
    expect(e.y).toBeCloseTo(0, 10);
    expect(e.x).toBeCloseTo(0, 10);
  });
});

describe('Geometry World held-key release', () => {
  it('clears movement and look state when the window loses focus', () => {
    // Held keys emit no keyup once the window blurs (alt-tab), so movement latched
    // on and the player walked by itself; arrow look would spin forever.
    expect(SOURCE).toContain("window.addEventListener('blur', _winH.blur = function() {");
    expect(SOURCE).toMatch(/_winH\.blur[\s\S]{0,400}engine\.lookState = \{ left: false, right: false, up: false, down: false \};/);
  });

  it('detaches the window listener on teardown', () => {
    // _docHandlers are removed from document; a window listener needs its own map
    // or it outlives the engine and pins the whole closure.
    expect(SOURCE).toContain('window.removeEventListener(ev, engine._winHandlers[ev]);');
  });

  it('clears look state on keyup without a focus guard', () => {
    // If keyup were gated the same way keydown is, losing focus mid-hold would
    // strand the camera spinning.
    expect(SOURCE).toContain("case 'ArrowLeft': engine.lookState.left = false; break;");
    expect(SOURCE).toContain("case 'ArrowDown': engine.lookState.down = false; break;");
  });
});
