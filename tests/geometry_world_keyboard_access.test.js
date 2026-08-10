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

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
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
    rerender: function () { React.act(function () { bump(); }); },
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

  // Loaded ONCE: loadTool re-parses a 550KB IIFE, and doing that per-test pushed
  // the mount cases past vitest's 5s default on a loaded machine.
  beforeAll(() => {
    resetStemLab();
    window.THREE = makeThreeStub();
    cfg = loadTool(FILE, 'geometryWorld');
  });

  beforeEach(() => {
    window.THREE = makeThreeStub();
    window[ENGINE_KEY] = makeFakeEngine();
  });

  afterEach(() => {
    delete window[ENGINE_KEY];
    delete window[ENGINE_KEY + '_failed'];
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
  }, 20000);

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
  }, 20000);

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
  }, 20000);

  it('advertises arrow-key look in the in-app controls panel', () => {
    const m = mountTool(cfg, { _introShownOnce: true, worldActive: true, showHelp: true });
    expect(m.container.textContent).toContain('Look around (no mouse)');
    m.unmount();
  }, 20000);
});

describe('Geometry World NPC dialog focus', () => {
  let cfg;

  beforeAll(() => {
    resetStemLab();
    window.THREE = makeThreeStub();
    cfg = loadTool(FILE, 'geometryWorld');
  });

  beforeEach(() => {
    window.THREE = makeThreeStub();
    const eng = makeFakeEngine();
    eng.npcs = [{
      body: { position: { x: 0, y: 0, z: 0 } },
      data: { name: 'Ada', color: 0x7c3aed, dialogue: 'Count the layers.', question: { text: 'What is 2x3x4?', choices: ['24', '9', '12'], correct: 0 } },
    }];
    window[ENGINE_KEY] = eng;
  });

  afterEach(() => {
    delete window[ENGINE_KEY];
    document.body.innerHTML = '';
  });

  function openDialog() {
    return mountTool(cfg, {
      _introShownOnce: true,
      worldActive: true,
      showNpcDialog: true,
      dialogNpcIdx: 0,
      npcTypewriterNpc: 0,
      npcTypewriterPos: 999,
    });
  }

  it('is a labelled modal dialog, not an anonymous div', () => {
    const m = openDialog();
    const dlg = m.container.querySelector('[role="dialog"]');

    expect(dlg).toBeTruthy();
    expect(dlg.getAttribute('aria-modal')).toBe('true');
    // Named after the character so a reader says who is speaking.
    expect(dlg.getAttribute('aria-label')).toContain('Ada');
    m.unmount();
  }, 20000);

  it('moves focus into the dialog when it opens', () => {
    // Opening exits pointer lock, but focus used to stay on the world surface — a
    // keyboard student had to tab through the whole HUD to reach the answer choices.
    const m = openDialog();
    const dlg = m.container.querySelector('[role="dialog"]');

    expect(document.activeElement).toBe(dlg);
    m.unmount();
  }, 20000);

  it('does not re-steal focus on a re-render', () => {
    // An unguarded inline ref re-fires on every commit; re-focusing there would yank
    // focus off whichever choice the student had tabbed to.
    const m = openDialog();
    const dlg = m.container.querySelector('[role="dialog"]');
    const choice = m.container.querySelector('[role="dialog"] button');
    expect(choice).toBeTruthy();

    choice.focus();
    expect(document.activeElement).toBe(choice);

    m.rerender();

    expect(document.activeElement).toBe(choice);
    expect(document.activeElement).not.toBe(dlg);
    m.unmount();
  }, 20000);

  it('sends focus back to the world when the dialog closes', () => {
    expect(SOURCE).toContain('function focusWorldSurface() {');
    // Every close path: the X button, Escape, and Shift+Escape.
    expect(SOURCE).toContain("onClick: function() { upd({ showNpcDialog: false }); focusWorldSurface(); }");
    expect(SOURCE).toContain("if (ms.showNpcDialog) { upd('showNpcDialog', false); focusWorldSurface(); break; }");
  });
});

describe('Geometry World keyboard building', () => {
  // Placing and breaking were reachable only through mouse buttons under pointer
  // lock (or the mobile touch buttons), so a keyboard-only student could walk,
  // look, talk and measure but never actually BUILD — the central activity of a
  // block-based volume tool.

  it('binds break and build to keys', () => {
    expect(SOURCE).toContain("engine.interactAtCrosshair('break');");
    expect(SOURCE).toContain("engine.interactAtCrosshair('place');");
    expect(SOURCE).toMatch(/case 'KeyX':[\s\S]{0,120}interactAtCrosshair\('break'\)/);
    expect(SOURCE).toMatch(/case 'KeyB':[\s\S]{0,120}interactAtCrosshair\('place'\)/);
  });

  it('routes mouse, keyboard and touch through ONE crosshair path', () => {
    // Three divergent copies existed. The mobile pair skipped the XP milestones,
    // the first-block celebration, the tutorial-step advance and
    // checkBreakFrustration() — an SEL nudge mobile students never received.
    expect(SOURCE).toContain('engine.interactAtCrosshair = function(action) {');
    expect(SOURCE).toContain("engine.interactAtCrosshair(ev.button === 0 ? 'break' : ev.button === 2 ? 'place' : null);");
    // The duplicated mobile bodies are gone.
    expect(SOURCE).not.toContain('engine.placeBlock(px, py, pz, BLOCK_TYPES[selectedBlock].id, BLOCK_SHAPES[selectedShape].id, blockRotation);');
    expect(SOURCE).not.toContain("engine.removeBlock(pp.x, pp.y, pp.z); sfxBreak(h2[0].object.userData.blockType || 'stone');");
    // Exactly one place and one break implementation remain.
    expect((SOURCE.match(/checkBreakFrustration\(\);/g) || [])).toHaveLength(1);
  });

  it('keeps the block limit and lesson-block protection on the shared path', () => {
    // The keyboard route must not become a way around either guard.
    expect(SOURCE).toMatch(/interactAtCrosshair = function[\s\S]{0,4000}Object\.keys\(engine\.blocks\)\.length >= MAX_BLOCKS/);
    // Protection lives in removeBlock itself, which the shared path calls.
    expect(SOURCE).toContain('if (mesh.userData._lessonBlock && !forceRemove) {');
  });

  it('documents the new keys where students and screen readers will find them', () => {
    expect(SOURCE).toContain("'X / B'), 'Break / build (no mouse)',");
    expect(SOURCE).toMatch(/B builds a block where you are facing and X breaks one/);
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

describe('Geometry World every overlay is a dialog', () => {
  let cfg;

  beforeAll(() => {
    resetStemLab();
    window.THREE = makeThreeStub();
    cfg = loadTool(FILE, 'geometryWorld');
  });

  beforeEach(() => {
    window.THREE = makeThreeStub();
    window[ENGINE_KEY] = makeFakeEngine();
  });

  afterEach(() => {
    delete window[ENGINE_KEY];
    document.body.innerHTML = '';
  });

  // Panel flag -> the accessible name it should carry.
  const PANELS = [
    ['showHelp', 'Controls and help'],
    ['showMyLessons', 'My lessons'],
    ['showPeerWorlds', 'Class world library'],
    ['showTeacherView', 'Teacher view'],
    ['showLessonIntro', 'Lesson introduction'],
  ];

  PANELS.forEach(([flag, label]) => {
    it(`${flag} opens a named dialog that takes focus`, () => {
      const m = mountTool(cfg, { _introShownOnce: true, worldActive: true, [flag]: true });
      const dlg = m.container.querySelector(`[aria-label="${label}"]`);

      expect(dlg).toBeTruthy();
      expect(dlg.getAttribute('role')).toBe('dialog');
      expect(dlg.getAttribute('aria-modal')).toBe('true');
      expect(document.activeElement).toBe(dlg);
      m.unmount();
    }, 20000);
  });

  it('hands focus back to the world on every Escape close, not just the NPC dialog', () => {
    // Closing with focus inside a panel dropped the caret to the top of the
    // document, so WASD did nothing until the student tabbed all the way back in.
    const chain = SOURCE.match(/if \(ms\.show\w+\) \{ upd\('show\w+', false\); focusWorldSurface\(\); break; \}/g) || [];
    expect(chain.length).toBeGreaterThanOrEqual(10);
    // No close path left without it.
    expect(SOURCE).not.toMatch(/if \(ms\.show\w+\) \{ upd\('show\w+', false\); break; \}/);
  });

  it('keeps forward and reverse Tab focus inside every modal dialog', () => {
    const m = mountTool(cfg, { _introShownOnce: true, worldActive: true, showMyLessons: true });
    const dlg = m.container.querySelector('[aria-label="My lessons"]');
    const close = dlg.querySelector('button');

    close.focus();
    const forward = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    close.dispatchEvent(forward);
    expect(forward.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(close);

    dlg.focus();
    const reverse = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
    dlg.dispatchEvent(reverse);
    expect(reverse.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(close);
    m.unmount();
  }, 20000);

  it('returns focus to the world when Back to Game closes all overlays', () => {
    const m = mountTool(cfg, { _introShownOnce: true, worldActive: true, showMyLessons: true });
    const world = m.container.querySelector('#geoworld-fs-wrap');
    const back = Array.from(
      m.container.querySelectorAll('button')
    ).find(function(button) { return button.textContent.indexOf('Back to Game') >= 0; });

    expect(back).toBeTruthy();
    React.act(function() { back.click(); });
    expect(document.activeElement).toBe(world);
    m.unmount();
  }, 20000);

  it('shows the high-contrast focus ring on every native control in the tool', () => {
    expect(SOURCE).toContain("className: 'gw-root'");
    expect(SOURCE).toContain('.gw-root button:focus-visible');
    expect(SOURCE).toContain('.gw-root textarea:focus-visible');
  });

  it('shares one guarded focus ref rather than repeating it per panel', () => {
    expect(SOURCE).toContain('function gwDialogRef(node) {');
    expect(SOURCE).toContain('if (node && !node._gwDialogFocused) {');
    expect(SOURCE).toContain("node.addEventListener('keydown', trapDialogTabKey);");
    expect((SOURCE.match(/ref: gwDialogRef/g) || []).length).toBeGreaterThanOrEqual(9);
  });
});

describe('Geometry World single measurement path', () => {
  it('routes keyboard and touch through engine.performMeasurement', () => {
    expect(SOURCE).toContain('engine.performMeasurement = function(inputMode) {');
    expect(SOURCE).toContain("engine.performMeasurement('key');");
    expect(SOURCE).toContain("engine.performMeasurement('touch');");
  });

  it('gives touch the feedback the duplicate had lost', () => {
    // The mobile copy never drew the dimension lines or the selection glow — the
    // main visual affordance for reading L x W x H — gave no first-measurement XP,
    // and never advanced past tutorial step 2.
    const fn = SOURCE.slice(
      SOURCE.indexOf('engine.performMeasurement = function(inputMode) {'),
      SOURCE.indexOf('// Shared crosshair interaction'),
    );
    expect(fn).toContain('showDimLines(m, m.minX, m.minY, m.minZ);');
    expect(fn).toContain('if (m.blocks) showSelectionGlow(m.blocks);');
    expect(fn).toContain("awardXP('geometryWorld', 5, 'First measurement');");
    expect(fn).toContain("if (ts2.step === 2 && !ts2.dismissed) upd('tutorialStep', 3);");
    // History comes from the engine bridge, not a stale React closure.
    expect(fn).toContain('(((engine._predictionState || {}).history) || [])');
  });

  it('uses the cached block array instead of rebuilding it per keypress', () => {
    expect(SOURCE).toContain('engine.blockUnderCrosshair = function() {');
    expect(SOURCE).toContain('var hits = engine.raycaster.intersectObjects(engine.getBlocksArr());');
    // Object.values(engine.blocks) rebuilt up to MAX_BLOCKS entries every time.
    expect(SOURCE).not.toContain('engine.raycaster.intersectObjects(Object.values(engine.blocks))');
  });

  it('does not index the block palette without a fallback', () => {
    // Both indices persist in toolData; a shrunken palette would throw at click time.
    expect(SOURCE).not.toContain('BLOCK_TYPES[ps.selectedBlock].id');
    expect(SOURCE).toContain('var typeDef = BLOCK_TYPES[ps.selectedBlock] || BLOCK_TYPES[0];');
    expect(SOURCE).toContain('var shapeDef2 = BLOCK_SHAPES[ps.selectedShape] || BLOCK_SHAPES[0];');
  });
});

describe('Geometry World application mode is scoped to the 3D surface', () => {
  let cfg;

  beforeAll(() => {
    resetStemLab();
    window.THREE = makeThreeStub();
    cfg = loadTool(FILE, 'geometryWorld');
  });

  beforeEach(() => {
    window.THREE = makeThreeStub();
    window[ENGINE_KEY] = makeFakeEngine();
  });

  afterEach(() => {
    delete window[ENGINE_KEY];
    document.body.innerHTML = '';
  });

  it('does not put the whole tool into application mode', () => {
    // role="application" switches a screen reader out of browse mode for everything
    // inside. The root contains the lesson picker, the reflection textarea, the help
    // panel and the objectives — all ordinary content a blind student needs browse
    // mode to read. Exactly ONE element should claim the exception.
    const m = mountTool(cfg, { _introShownOnce: true, worldActive: true });
    const apps = m.container.querySelectorAll('[role="application"]');

    expect(apps).toHaveLength(1);
    expect(apps[0].id, 'the only application should be the 3D surface').toBe('geoworld-fs-wrap');
    m.unmount();
  }, 20000);

  it('exposes the tool as a named landmark instead', () => {
    // A landmark is navigable without changing interaction mode.
    const m = mountTool(cfg, { _introShownOnce: true, worldActive: true });
    const root = m.container.querySelector('[role="region"]');

    expect(root, 'no landmark for the tool').toBeTruthy();
    expect(root.getAttribute('aria-label')).toBe('Geometry World');
    m.unmount();
  }, 20000);

  it('keeps the control list on the surface it describes, and current', () => {
    // The root label used to recite the controls, duplicating the surface's own
    // description and going stale: it predated B/X, arrow-key look and L.
    const m = mountTool(cfg, { _introShownOnce: true, worldActive: true });
    const root = m.container.querySelector('[role="region"]');
    expect(root.getAttribute('aria-label')).not.toMatch(/WASD|left-click|right-click/i);

    const wrap = m.container.querySelector('#geoworld-fs-wrap');
    const desc = m.container.querySelector('#' + wrap.getAttribute('aria-describedby'));
    expect(desc.textContent).toMatch(/W A S D/i);
    expect(desc.textContent).toMatch(/\bB builds\b/i);
    expect(desc.textContent).toMatch(/arrow keys/i);
    m.unmount();
  }, 20000);
});

describe('Geometry World mobile action WCAG parity', () => {
  it('gives every touch action native button and keyboard activation semantics', () => {
    [
      ['Jump', 'jump', 'activateMobileJump'],
      ['Place block', 'place', 'placeMobileBlock'],
      ['Break block', 'break', 'breakMobileBlock'],
      ['Measure structure', 'measure', 'measureMobileStructure'],
      ['Talk to nearby character', 'talk', 'talkToNearbyNpc'],
      ['Undo last block action', 'undo', 'undoMobileBlockAction'],
    ].forEach(function(pair) {
      expect(SOURCE).toContain("type: 'button', className: 'gw-focusable', 'aria-label': '" + pair[0]);
      expect(SOURCE).toContain(`onClick: function() { runMobileButtonAction('${pair[1]}', ${pair[2]}); },`);
    });
    expect(SOURCE).toContain("engine._lastTouchAction = { key: actionKey, at: Date.now() };");
    expect(SOURCE).toContain("Date.now() - lastTouch.at < 700");
  });

  it('gives icon-only controls explicit names and toggle state', () => {
    expect(SOURCE).toContain("'aria-label': d.autoCycle ? 'Stop automatic day and night cycle'");
    expect(SOURCE).toContain("'aria-pressed': d.autoCycle ? 'true' : 'false'");
    expect(SOURCE).toContain("'aria-label': 'Load saved lesson: ' + (lesson.title || 'Untitled lesson')");
    expect(SOURCE).toContain("'aria-label': 'Delete saved lesson: ' + (lesson.title || 'Untitled lesson')");
  });
});

describe('Geometry World visual refinement contract', () => {
  it('keeps the primary hierarchy classes on the toolbar, stats and viewport', () => {
    expect(SOURCE).toContain("className: 'gw-toolbar'");
    expect(SOURCE).toContain("className: 'gw-brand-mark'");
    expect((SOURCE.match(/className: 'gw-stat-chip'/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(SOURCE).toContain("className: 'gw-viewport'");
  });

  it('includes responsive and reduced-motion presentation fallbacks', () => {
    expect(SOURCE).toContain('@media(max-width:720px)');
    expect(SOURCE).toContain('@media(prefers-reduced-motion:reduce)');
  });

  it('keeps measurement details in a dismissible floating inspector', () => {
    expect(SOURCE).toContain("className: 'gw-prediction-bar gw-prediction-panel'");
    expect(SOURCE).toContain("className: 'gw-measure-card'");
    expect(SOURCE).toContain("'aria-label': 'Measurement inspector'");
    expect(SOURCE).toContain("'aria-label': 'Close measurement inspector'");
    expect(SOURCE).toContain('.gw-measure-card{position:absolute!important;');
  });

  it('uses one responsive floating-HUD system for guidance and notifications', () => {
    expect(SOURCE).toContain("className: 'gw-achievement-toast'");
    expect(SOURCE).toContain("role: 'status', 'aria-live': 'polite', className: 'gw-achievement-toast'");
    expect(SOURCE).toContain("className: 'gw-return-dock'");
    expect(SOURCE).toContain("className: 'gw-tutorial-shell'");
    expect(SOURCE).toContain("className: 'gw-target-hint'");
    expect(SOURCE).toContain('@keyframes gw-float-in');
    expect(SOURCE).toContain('.gw-achievement-toast{animation:none!important;}');
  });

  it('separates the bottom controls into responsive visual tiers', () => {
    expect(SOURCE).toContain("className: 'gw-badge-strip'");
    expect(SOURCE).toContain("className: 'gw-shape-tray'");
    expect(SOURCE).toContain("className: 'gw-hotbar'");
    expect(SOURCE).toContain("className: 'gw-focusable gw-hotbar-item'");
    expect(SOURCE).toContain("className: 'gw-action-bar'");
    expect(SOURCE).toContain('.gw-action-bar{bottom:98px!important;');
    expect(SOURCE).toContain('flex-wrap:nowrap!important;overflow-x:auto;');
  });

  it('uses shared dialog framing while preserving the full-screen intro variant', () => {
    expect((SOURCE.match(/className: 'gw-dialog gw-dialog--compact(?:'| )/g) || []).length).toBeGreaterThanOrEqual(8);
    expect(SOURCE).toContain("className: 'gw-dialog gw-dialog--intro'");
    expect(SOURCE).toContain("className: 'gw-intro-card'");
    expect(SOURCE).toContain("className: 'gw-primary-cta gw-intro-start gw-focusable'");
    expect((SOURCE.match(/className: 'gw-dialog-close'/g) || []).length).toBeGreaterThanOrEqual(6);
    expect(SOURCE).toContain("className: 'gw-dialog gw-dialog--npc'");
    expect(SOURCE).toMatch(/className: 'gw-dialog gw-dialog--npc'[\s\S]{0,300}ref: gwDialogRef/);
    expect(SOURCE).toContain('@media(max-width:520px)');
  });

  it('uses one accessible state-card system for mobile, loading and 3D recovery', () => {
    expect(SOURCE).toContain("className: 'gw-root gw-state-screen'");
    expect(SOURCE).toContain("'aria-labelledby': 'gw-mobile-title'");
    expect(SOURCE).toContain("role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', 'aria-busy': 'true'");
    expect(SOURCE).toContain("className: 'gw-loading-track', role: 'progressbar', 'aria-label': 'Loading 3D engine'");
    expect(SOURCE).not.toContain("width: '60%'");
    expect(SOURCE).toContain("role: 'alert', 'aria-live': 'assertive', 'aria-labelledby': 'gw-webgl-recovery-title'");
    expect(SOURCE).toContain("className: 'gw-recovery-details'");
    expect(SOURCE).toContain("id: 'gw-webgl-recovery'");
    expect(SOURCE).toContain("'aria-labelledby': 'gw-webgl-recovery-title'");
    expect(SOURCE).toContain("'data-geometry-webgl-recovery': 'true'");
    expect(SOURCE).toContain('function retryWebglMode(useSaverQuality)');
    expect(SOURCE).toContain("className: 'gw-recovery-checklist'");
    expect(SOURCE).toContain('Retry in saver mode');
    expect(SOURCE).toContain("stopAnimationAfterError(new Error('WebGL context lost");
    expect(SOURCE).toContain("stopAnimationAfterError(new Error('WebGL context lost. The browser may have reset the graphics device or reclaimed GPU memory.'), 'context');");
    expect(SOURCE).toContain('#gw-webgl-recovery:focus-visible');
    expect((SOURCE.match(/className: 'gw-state-card'/g) || []).length).toBeGreaterThanOrEqual(3);
    expect((SOURCE.match(/className: 'gw-primary-cta gw-state-primary gw-focusable'/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(SOURCE).toContain("type: 'button', className: 'gw-state-secondary gw-focusable'");
    expect(SOURCE).toContain("'aria-label': 'Touch look settings'");
    expect(SOURCE).toContain("'aria-label': 'Touch look sensitivity'");
    expect(SOURCE).toContain("'aria-valuetext': 'Look speed '");
    expect(SOURCE).toContain('.gw-state-icon,.gw-loading-mark,.gw-loading-sweep{animation:none!important}');
  });

  it('keeps secondary HUD overlays distinct, responsive and keyboard-readable', () => {
    expect(SOURCE).toContain("className: 'gw-minimap'");
    expect(SOURCE).toContain('bottom:150px!important');
    expect(SOURCE).toContain("className: 'gw-collab-roster'");
    expect(SOURCE).toContain("role: 'region',\n          'aria-label': 'Builders online'");
    expect(SOURCE).toContain("'data-self': isMe ? 'true' : 'false'");
    expect(SOURCE).toContain("className: 'gw-transform-panel', role: 'region', 'aria-label': 'Transform discovery'");
    expect(SOURCE).toContain("className: 'gw-transform-state', role: 'status', 'aria-live': 'polite'");
    expect(SOURCE).toContain("'aria-label': 'Add current transform to observation log'");
    expect(SOURCE).toContain("'aria-label': 'Reset transform discovery'");
    expect(SOURCE).toContain('@media(prefers-reduced-motion:reduce){.gw-minimap{transition:none!important}');
  });

  it('presents lesson objectives as a semantic progress dashboard', () => {
    expect(SOURCE).toContain("className: 'gw-objective-panel', role: 'region', 'aria-labelledby': 'gw-objective-title'");
    expect(SOURCE).toContain("id: 'gw-objective-title', className: 'gw-objective-title'");
    expect(SOURCE).toContain("className: 'gw-objective-progress', role: 'progressbar'");
    expect(SOURCE).toContain("'aria-valuenow': Math.min(score, totalQ)");
    expect(SOURCE).toContain("return el(isDone ? 'div' : 'button'");
    expect(SOURCE).toContain("type: isDone ? undefined : 'button'");
    expect(SOURCE).toContain("'aria-label': isDone ? undefined : 'Navigate to objective: ' + objectiveText");
    expect(SOURCE).toContain("className: 'gw-reset-button gw-focusable'");
    expect(SOURCE).toContain("'aria-label': 'Reset lesson progress and reload the world'");
    expect(SOURCE).toContain('.gw-collab-roster{top:auto;bottom:150px}');
  });

  it('unifies viewport controls and exposes interaction feedback accessibly', () => {
    expect(SOURCE).toContain("className: 'gw-action-feedback', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true'");
    expect(SOURCE).toContain("className: 'gw-crosshair', 'data-target': ct, 'aria-hidden': 'true'");
    expect(SOURCE).toContain("isMobile ? 'Tap Talk' : 'Press E'");
    expect(SOURCE).toContain("className: 'gw-viewport-control gw-viewport-control--fullscreen gw-focusable'");
    expect(SOURCE).toContain("className: 'gw-viewport-control gw-viewport-control--vr gw-focusable'");
    expect(SOURCE).toContain("className: 'gw-viewport-control gw-viewport-control--touch gw-focusable'");
    expect((SOURCE.match(/className: 'gw-viewport-control/g) || []).length).toBe(3);
    expect(SOURCE).toContain('.gw-crosshair[data-target="npc_question"]');
    expect(SOURCE).toContain('.gw-viewport-control--fullscreen{right:10px!important}');
    expect(SOURCE).toContain('.gw-viewport-control--vr{left:10px!important;border-color:');
    expect(SOURCE).toContain('.gw-crosshair{transition:none!important}');
  });

  it('styles secondary data panels and environmental alerts as accessible HUD content', () => {
    expect(SOURCE).toContain("className: 'gw-history-panel', role: 'region', 'aria-label': 'Measurement history'");
    expect(SOURCE).toContain("className: 'gw-history-title gw-hud-panel-heading'");
    expect(SOURCE).toContain("'data-current': mi === 0 ? 'true' : 'false'");
    expect(SOURCE).toContain("className: 'gw-retrieval-card'");
    expect(SOURCE).toContain("className: 'gw-retrieval-input gw-focusable'");
    expect(SOURCE).toContain("className: 'gw-focusable gw-retrieval-button'");
    expect(SOURCE).toContain("className: 'gw-inventory-panel', role: 'region', 'aria-label': 'Block inventory'");
    expect(SOURCE).toContain("className: 'gw-inventory-row'");
    expect(SOURCE).toContain('bottom:238px!important');
    expect(SOURCE).toContain("className: 'gw-environment-tint gw-environment-tint--water'");
    expect(SOURCE).toContain("'aria-hidden': 'true'");
    expect(SOURCE).toContain("className: 'gw-environment-tint gw-environment-tint--lava'");
    expect(SOURCE).toContain("className: 'gw-environment-warning', role: 'alert', 'aria-live': 'assertive', 'aria-atomic': 'true'");
    expect(SOURCE).toContain('.gw-environment-warning{position:absolute;');
    expect(SOURCE).toContain('@media(prefers-reduced-motion:reduce){.gw-environment-tint{transition:none!important}');
  });

  it('keeps the game bar compact and moves secondary controls into accessible overlays', () => {
    expect(SOURCE).toContain("className: 'gw-root', 'aria-label': __alloT('stem.geometryworld.tool_name', 'Geometry World')");
    expect(SOURCE).toContain("el('header', { className: 'gw-toolbar', 'aria-label': 'Geometry World lesson controls'");
    expect(SOURCE).toContain("className: 'gw-brand-lockup'");
    expect(SOURCE).toContain("el('h2', { id: 'gw-title', className: 'gw-title' }");
    expect(SOURCE).toContain("className: 'gw-status-cluster', 'aria-label': 'Lesson status and game menu'");
    expect(SOURCE).toContain("'data-geometry-settings-trigger': 'true', 'aria-haspopup': 'dialog'");
    expect(SOURCE).toContain("id: 'gw-settings-dialog', role: 'dialog', 'aria-modal': 'true'");
    expect(SOURCE).toContain("className: 'gw-fullscreen-quickbar'");
    expect(SOURCE).toContain("objectivesOpen && el('section', { id: 'gw-objective-panel'");
    expect(SOURCE).toContain('.gw-toolbar{box-sizing:border-box;display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;min-height:52px;max-height:64px;');
    expect(SOURCE).toContain('#geoworld-fs-workspace[data-fullscreen="true"]>.gw-toolbar{display:none!important}');
    expect(SOURCE).toContain('.gw-prediction-panel{position:absolute!important;');
    expect(SOURCE).toContain('.gw-settings-backdrop{position:absolute;inset:0;');
    expect(SOURCE).toContain("var hudPreset = isGeometryHudPreset(d.hudPreset)");
    expect(SOURCE).toContain("var hudPanel = gwHasOwn(d, 'hudPanel')");
    expect(SOURCE).toContain("GW_HUD_PRESET_KEY = 'allo.geometryworld.hud.v1'");
    expect(SOURCE).toContain("minimal: { hudPanel: '', label: 'Minimal'");
    expect(SOURCE).toContain("learning: { hudPanel: 'progress', label: 'Learning'");
    expect(SOURCE).toContain("builder: { hudPanel: 'inventory', label: 'Builder'");
    expect(SOURCE).toContain("className: 'gw-hud-preset-fieldset'");
    expect(SOURCE).toContain("id: 'gw-hud-preset-help'");
    expect(SOURCE).toContain("'data-geometry-hud-preset': preset.id");
    expect(SOURCE).toContain("'aria-pressed': active");
    expect(SOURCE).toContain("'data-hud-preset': hudPreset");
    expect(SOURCE).toContain("hudPanel === 'inventory' && engine");
    expect(SOURCE).toContain("'data-hud-preset': hudPreset");
    expect(SOURCE).toContain("'Optional HUD overlays'");
    expect(SOURCE).toContain("hudPanel === 'progress' && el('section', { id: 'gw-progress-hud'");
    expect(SOURCE).toContain("hudPanel === 'map' && el('section', { id: 'gw-minimap'");
    expect(SOURCE).toContain("hudPanel === 'history' && measureHistory.length > 0");
    expect(SOURCE).toContain("hudPanel === 'inventory' && engine");
    expect(SOURCE).toContain("hudPanel === 'transform' && (function()");
    expect(SOURCE).toContain("className: 'gw-hud-panel-close gw-focusable'");
    expect(SOURCE).toContain('.gw-touch-look-zone{opacity:1!important}');
    expect(SOURCE).toContain('.gw-fullscreen-quickbar .gw-compact-action-label{display:none!important}');
  });

  it('presents onboarding as a named, responsive tutorial with semantic progress', () => {
    expect(SOURCE).toContain("role: 'region', 'aria-labelledby': 'gw-tutorial-title', 'aria-describedby': 'gw-tutorial-instruction'");
    expect(SOURCE).toContain("el('h3', { id: 'gw-tutorial-title', className: 'gw-tutorial-title' }");
    expect(SOURCE).toContain("['Explore the world', 'Meet a guide', 'Measure a structure', 'Build a block'][tutorialStep]");
    expect(SOURCE).toContain("id: 'gw-tutorial-instruction', className: 'gw-tutorial-instruction'");
    expect(SOURCE).toContain("className: 'gw-tutorial-progress', role: 'progressbar', 'aria-label': 'Tutorial progress'");
    expect(SOURCE).toContain("'aria-valuenow': tutorialStep + 1");
    expect(SOURCE).toContain("className: 'gw-tutorial-dot', 'data-complete': si < tutorialStep ? 'true' : 'false'");
    expect(SOURCE).toContain("className: 'gw-tutorial-actions'");
    expect(SOURCE).toContain("className: 'gw-tutorial-skip gw-focusable'");
    expect(SOURCE).toContain("className: 'gw-tutorial-next gw-focusable'");
    expect(SOURCE).toContain("tutorialStep === 3 ? 'Finish tutorial and start exploring'");
    expect(SOURCE).toContain("tutorialStep === 3 ? 'Start exploring' : 'Next \\u2192'");
    expect(SOURCE).toContain('.gw-tutorial-shell{bottom:150px!important;');
    expect(SOURCE).toContain('.gw-tutorial-skip,.gw-tutorial-next{min-height:44px;flex:1}');
    expect(SOURCE).toContain('@media(prefers-reduced-motion:reduce){.gw-tutorial-dot{transition:none!important}');
  });

  it('frames the lesson introduction as structured content with distinct start paths', () => {
    expect(SOURCE).toContain("'aria-labelledby': 'gw-intro-title', 'aria-describedby': 'gw-intro-description'");
    expect(SOURCE).toContain("el('h2', { id: 'gw-intro-title', className: 'gw-intro-title' }");
    expect(SOURCE).toContain("el('p', { id: 'gw-intro-description', className: 'gw-intro-description' }");
    expect(SOURCE).toContain("el('section', { className: 'gw-intro-objectives', 'aria-labelledby': 'gw-intro-objectives-title'");
    expect(SOURCE).toContain("el('ol', null");
    expect(SOURCE).toContain("return el('li', { key: 'objlist-' + i");
    expect(SOURCE).toContain("className: 'gw-intro-formula', role: 'note', 'aria-label': 'Key formulas'");
    expect(SOURCE).toContain("className: 'gw-intro-meta', 'aria-label': 'Lesson overview'");
    expect(SOURCE).toContain("className: 'gw-intro-actions'");
    expect(SOURCE).toContain("className: 'gw-primary-cta gw-intro-start gw-focusable'");
    expect(SOURCE).toContain("className: 'gw-intro-secondary gw-focusable'");
    expect(SOURCE).toContain("'aria-label': 'Start lesson without the guided tutorial'");
    expect(SOURCE).toContain('function loadLessonByKey(lessonKey, _attempt, skipTutorial)');
    expect(SOURCE).toContain('loadLessonByKey(lessonKey, attempt + 1, skipTutorial)');
    expect(SOURCE).toContain('if (skipTutorial) { lessonState.tutorialStep = 4; lessonState.tutorialDismissed = true; }');
    expect(SOURCE).toContain('.gw-intro-card{box-sizing:border-box;width:min(520px,calc(100% - 24px))!important;');
    expect(SOURCE).toContain('.gw-intro-actions{flex-direction:column}');
  });

  it('makes reflection evidence, writing readiness and optional continuation explicit', () => {
    expect(SOURCE).toContain("className: 'gw-dialog gw-dialog--compact gw-reflection-dialog'");
    expect(SOURCE).toContain("'aria-labelledby': 'gw-reflection-title', 'aria-describedby': 'gw-reflection-description gw-reflection-prompt'");
    expect(SOURCE).toContain("el('h2', { id: 'gw-reflection-title', className: 'gw-reflection-title' }");
    expect(SOURCE).toContain("id: 'gw-reflection-prompt', className: 'gw-reflection-prompt'");
    expect(SOURCE).toContain("htmlFor: 'gw-reflection-text', className: 'gw-reflection-label'");
    expect(SOURCE).toContain("id: 'gw-reflection-text', className: 'gw-reflection-textarea gw-focusable'");
    expect(SOURCE).toContain("maxLength: 600, 'aria-describedby': 'gw-reflection-prompt gw-reflection-count'");
    expect(SOURCE).toContain("className: 'gw-reflection-footer'");
    expect(SOURCE).toContain("className: 'gw-reflection-readiness', 'data-ready': reflectionText.trim() ? 'true' : 'false'");
    expect(SOURCE).toContain("id: 'gw-reflection-count'");
    expect(SOURCE).toContain("className: 'gw-reflection-actions'");
    expect(SOURCE).toContain("className: 'gw-reflection-save gw-focusable', disabled: !reflectionText.trim()");
    expect(SOURCE).toContain("text: reflectionText.trim()");
    expect(SOURCE).toContain("className: 'gw-reflection-skip gw-focusable'");
    expect(SOURCE).toContain("'aria-label': 'Continue without saving a reflection'");
    expect(SOURCE).toContain('.gw-reflection-dialog{box-sizing:border-box;width:min(430px,calc(100% - 24px))!important;');
    expect(SOURCE).toContain('.gw-reflection-textarea{box-sizing:border-box;width:100%!important;min-height:92px;');
    expect(SOURCE).toContain('.gw-reflection-save,.gw-reflection-skip{width:100%;min-height:48px}');
  });


  it('makes the guided explore tour perceivable and keyboard operable', () => {
    expect(SOURCE).toContain("className: 'gw-tour-button gw-focusable'");
    expect(SOURCE).toContain("'aria-pressed': guidedTourActive");
    expect(SOURCE).toContain("'aria-label': 'Guided explore checkpoint'");
    expect(SOURCE).toContain("'aria-label': 'Exit guided explore tour'");
    expect(SOURCE).toContain("role: 'region', 'aria-label': 'Guided explore checkpoint'");
    expect(SOURCE).toContain("role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true'");
    expect(SOURCE).toContain("guidedTourReducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)");
    expect(SOURCE).toContain('if (!tour.reducedMotion)');
    expect(SOURCE).toContain("className: 'gw-view-presets', role: 'group', 'aria-label': 'Camera views'");
    expect(SOURCE).toContain("'aria-label': viewPresetLabels[preset] + ' camera view'");
    expect(SOURCE).toContain("'aria-pressed': active");
    expect(SOURCE).toContain('Camera view: ');
    expect(SOURCE).toContain('Camera preset canceled. Free exploration restored.');
  });
  it('makes the Layer Explorer semantic and keyboard operable', () => {
    expect(SOURCE).toContain("className: 'gw-layer-explorer', role: 'region', 'aria-label': 'Layer explorer'");
    expect(SOURCE).toContain("id: 'gw-layer-focus', type: 'range'");
    expect(SOURCE).toContain("'aria-label': 'Layer explorer depth'");
    expect(SOURCE).toContain("'aria-valuetext': layerFocus === 0 ? 'All layers visible'");
    expect(SOURCE).toContain("'aria-label': 'Show all layers'");
    expect(SOURCE).toContain('Showing layers 1 through ');
    expect(SOURCE).toContain('data-geometry-layer-explorer');
  });
  it('provides a named Scene Map text alternative with structure controls', () => {
    expect(SOURCE).toContain("className: 'gw-scene-map', role: 'region', 'aria-labelledby': 'gw-scene-map-title'");
    expect(SOURCE).toContain("id: 'gw-scene-map-title'");
    expect(SOURCE).toContain("'aria-controls': 'gw-scene-map'");
    expect(SOURCE).toContain("'aria-label': 'View structure: ' + structure.label");
    expect(SOURCE).toContain("role: 'list', 'aria-label': 'Structures in scene'");
    expect(SOURCE).toContain('engine.getSceneOverview = function()');
    expect(SOURCE).toContain('engine.focusStructure = function(index)');
    expect(SOURCE).toContain('Text alternative');
  });
  it('presents lesson completion as a focused results dialog with semantic metrics', () => {
    expect(SOURCE).toContain("className: 'gw-dialog gw-dialog--compact gw-completion-dialog'");
    expect(SOURCE).toContain("'aria-labelledby': 'gw-completion-title', 'aria-describedby': 'gw-completion-description'");
    expect(SOURCE).toContain("el('h2', { id: 'gw-completion-title', className: 'gw-completion-title' }");
    expect(SOURCE).toContain("el('p', { id: 'gw-completion-description', className: 'gw-completion-description' }");
    expect(SOURCE).toContain("className: 'gw-completion-metrics', role: 'list', 'aria-label': 'Lesson activity summary'");
    expect(SOURCE).toContain("className: 'gw-completion-metric', role: 'listitem'");
    expect(SOURCE).toContain("className: 'gw-completion-actions'");
    expect(SOURCE).toContain("type: 'button', className: 'gw-completion-next gw-focusable'");
    expect(SOURCE).toContain("'aria-label': 'Continue to next lesson: '");
    expect(SOURCE).toContain("type: 'button', className: 'gw-completion-replay gw-focusable'");
    expect(SOURCE).toContain("'aria-label': 'Replay current lesson'");
    expect(SOURCE).toContain("upd({ activeLesson: nextKey, measureHistory: [], reflectionText: '' })");
    expect(SOURCE).toContain("upd({ measureHistory: [], reflectionText: '' })");
    expect(SOURCE).toContain("el('section', { className: 'gw-completion-journey', 'aria-labelledby': 'gw-journey-title'");
    expect(SOURCE).toContain("el('h3', { id: 'gw-journey-title', className: 'gw-journey-title' }");
    expect(SOURCE).toContain("className: 'gw-journey-stats', role: 'list', 'aria-label': 'Course achievement summary'");
    expect(SOURCE).toContain("className: 'gw-journey-stat', role: 'listitem', 'data-metric': 'badges'");
    expect(SOURCE).toContain("el('blockquote', { className: 'gw-journey-quote' }");
    expect(SOURCE).toContain('.gw-completion-dialog{box-sizing:border-box;width:min(460px,calc(100% - 24px))!important;');
    expect(SOURCE).toContain('.gw-completion-next,.gw-completion-replay{width:100%;min-height:48px}');
  });
});
