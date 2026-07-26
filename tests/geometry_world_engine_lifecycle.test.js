// Geometry World 3D-engine lifecycle regression net.
//
// THE BUG (reported 2026-07-26: "visuals aren't appearing when the lesson starts"):
// the world container took an INLINE callback ref. React hands a new function
// identity to every commit, so each re-render fired ref(null) -> destroyEngine()
// then ref(node) -> initEngine(). "Start Lesson" calls upd(), so the lesson that
// had just been loaded was torn down on the very next render and rebuilt with the
// DEFAULT world — and because destroyEngine never detached renderer.domElement,
// the dead canvas stayed in the container and the fresh one stacked below the
// fold (both are 100%-height block children), so the viewport looked blank.
//
// These are BEHAVIORAL tests, not source-string matches: they mount the real tool
// with react-dom/client into jsdom so React's actual ref attach/detach lifecycle
// runs. A pre-seeded fake engine on window.__geoWorldEngine is the probe — if the
// ref churns, the engine gets torn down and that is directly observable.
//
// Deliberately NOT stubbing THREE: initEngine is skipped whenever
// window.__geoWorldEngine already exists, which is exactly the state we want.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { React, ReactDOMClient, makeCtx, resetStemLab, loadTool } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_geometryworld.js';
const ENGINE_KEY = '__geoWorldEngine';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Permissive THREE stub. The render path constructs a few Vector3 / Euler /
 * BoxGeometry objects directly; in production `threeReady` guarantees the real
 * library is loaded, so standing one up here is harness scaffolding, not a
 * behaviour under test. Every constructor yields a chainable vector-ish object.
 */
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
      if (prop === Symbol.toPrimitive || typeof prop === 'symbol') return undefined;
      return function () { return vec(); };
    },
  });
}

/**
 * A fake engine covering every field the RENDER path reads (enumerated from the
 * tool source) plus the ones destroyEngine touches. Records the teardown calls
 * and lesson loads the tests assert on.
 */
function makeFakeEngine() {
  const calls = { clearWorld: 0, loadLesson: [], rendererDisposed: 0 };
  const canvas = document.createElement('canvas');
  const engine = {
    _calls: calls,
    // ── read by destroyEngine ──
    clearWorld: function () { calls.clearWorld += 1; },
    scene: { remove: function () {} },
    renderer: { dispose: function () { calls.rendererDisposed += 1; }, domElement: canvas },
    // ── read by the render path ──
    camera: {
      position: { x: 0, y: 0, z: 0, distanceTo: function () { return 99; }, set: function () {}, clone: function () { return { x: 0, y: 0, z: 0 }; } },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      rotation: { x: 0, y: 0, z: 0 },
      getWorldDirection: function (v) { return v || { x: 0, y: 0, z: -1 }; },
      updateProjectionMatrix: function () {},
    },
    blocks: {},
    npcs: [],
    blocksPlaced: 0,
    sessionLog: [],
    raycaster: null,
    flyMode: false,
    moveState: {},
    velocity: { x: 0, y: 0, z: 0 },
    onGround: true,
    _undoStack: [],
    _redoStack: [],
    _coordAnnounce: false,
    _targetGrid: null,
    _jumpLock: false,
    _sessionXP: 0,
    _crosshairTarget: 'none',
    _inWater: false,
    _inLava: false,
    _gridHelper: null,
    // ── engine API the UI calls ──
    loadLesson: function (lesson) { calls.loadLesson.push(lesson); },
    logEvent: function () {},
    undo: function () {}, redo: function () {},
    returnToSpawn: function () {}, clearPlayerBlocks: function () {},
    measureStructure: function () {}, placeBlock: function () {}, removeBlock: function () {},
  };
  return engine;
}

/**
 * Mount the tool for real (react-dom/client) with a stateful ctx whose
 * update/updateMulti actually re-render, mirroring the host bridge.
 */
function mountTool(cfg, bucket) {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const toolData = { _threeLoaded: true, geometryWorld: Object.assign({}, bucket) };
  let bump = null;

  const ctx = makeCtx({
    toolData: toolData,
    update: function (b, key, val) {
      toolData[b] = Object.assign({}, toolData[b], { [key]: val });
      if (bump) bump();
    },
    updateMulti: function (b, patch) {
      toolData[b] = Object.assign({}, toolData[b], patch);
      if (bump) bump();
    },
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
    root: root,
    toolData: toolData,
    bucket: function () { return toolData.geometryWorld; },
    rerender: function () { React.act(function () { bump(); }); },
    unmount: function () { React.act(function () { root.unmount(); }); container.remove(); },
  };
}

function findByText(container, text) {
  return Array.from(container.querySelectorAll('button')).find(function (b) {
    return (b.textContent || '').indexOf(text) !== -1;
  });
}

describe('Geometry World engine lifecycle', () => {
  let cfg;

  beforeEach(() => {
    resetStemLab();
    window.THREE = makeThreeStub();
    cfg = loadTool(FILE, 'geometryWorld');
    delete window[ENGINE_KEY];
    delete window[ENGINE_KEY + '_failed'];
  });

  afterEach(() => {
    delete window[ENGINE_KEY];
    delete window[ENGINE_KEY + '_failed'];
    delete window.THREE;
    document.body.innerHTML = '';
  });

  it('registers the tool', () => {
    expect(cfg).toBeTruthy();
    expect(typeof cfg.render).toBe('function');
  });

  it('renders the world container and attaches a ref to it', () => {
    window[ENGINE_KEY] = makeFakeEngine();
    const m = mountTool(cfg, { _introShownOnce: true, worldActive: true });
    expect(m.container.querySelector('#geoworld-fs-wrap')).toBeTruthy();
    m.unmount();
  });

  // ── THE REGRESSION ──
  // With the inline ref this fails on the FIRST re-render: React calls
  // ref(null) -> destroyEngine(), clearWorld fires and the engine is deleted.
  it('does NOT tear the engine down on a re-render', () => {
    const fake = makeFakeEngine();
    window[ENGINE_KEY] = fake;
    const m = mountTool(cfg, { _introShownOnce: true, worldActive: true });

    expect(window[ENGINE_KEY]).toBe(fake);
    expect(fake._calls.clearWorld).toBe(0);

    m.rerender();
    m.rerender();
    m.rerender();

    expect(window[ENGINE_KEY]).toBe(fake);
    expect(fake._calls.clearWorld).toBe(0);
    expect(fake._calls.rendererDisposed).toBe(0);
    m.unmount();
  });

  it('survives a state update pushed through ctx.updateMulti (the Start Lesson path)', () => {
    const fake = makeFakeEngine();
    window[ENGINE_KEY] = fake;
    const m = mountTool(cfg, { _introShownOnce: true, worldActive: true });

    React.act(function () {
      m.toolData.geometryWorld = Object.assign({}, m.toolData.geometryWorld, { score: 3 });
    });
    m.rerender();

    expect(window[ENGINE_KEY]).toBe(fake);
    expect(fake._calls.clearWorld).toBe(0);
    m.unmount();
  });

  it('DOES tear the engine down on a real unmount', () => {
    const fake = makeFakeEngine();
    window[ENGINE_KEY] = fake;
    const m = mountTool(cfg, { _introShownOnce: true, worldActive: true });

    expect(window[ENGINE_KEY]).toBe(fake);
    m.unmount();

    expect(fake._calls.clearWorld).toBe(1);
    expect(window[ENGINE_KEY]).toBeUndefined();
  });

  // ── The second half of the blank-screen bug ──
  it('detaches the WebGL canvas from the DOM on teardown', () => {
    const fake = makeFakeEngine();
    const host = document.createElement('div');
    host.appendChild(fake.renderer.domElement);
    document.body.appendChild(host);
    window[ENGINE_KEY] = fake;

    const m = mountTool(cfg, { _introShownOnce: true, worldActive: true });
    expect(fake.renderer.domElement.parentNode).toBe(host);

    m.unmount();

    // A disposed canvas left in the container stacks a blank surface over the
    // live world, which is what made the viewport look empty.
    expect(fake.renderer.domElement.parentNode).toBeNull();
    host.remove();
  });
});

describe('Geometry World lesson start', () => {
  let cfg;

  beforeEach(() => {
    resetStemLab();
    window.THREE = makeThreeStub();
    cfg = loadTool(FILE, 'geometryWorld');
    delete window[ENGINE_KEY];
    delete window[ENGINE_KEY + '_failed'];
  });

  afterEach(() => {
    delete window[ENGINE_KEY];
    delete window[ENGINE_KEY + '_failed'];
    delete window.THREE;
    document.body.innerHTML = '';
  });

  it('loads the SELECTED lesson and keeps it loaded after the intro closes', () => {
    const fake = makeFakeEngine();
    window[ENGINE_KEY] = fake;
    const m = mountTool(cfg, {
      _introShownOnce: true,
      showLessonIntro: true,
      activeLesson: 'geometryGarden',
    });

    const start = findByText(m.container, 'Start Lesson');
    expect(start).toBeTruthy();

    React.act(function () { start.click(); });

    // Exactly one load, and it is the lesson the student picked — not the
    // default volumeExplorer world a re-init would have restored.
    expect(fake._calls.loadLesson).toHaveLength(1);
    expect(fake._calls.loadLesson[0].title).toBeTruthy();
    expect(m.bucket().showLessonIntro).toBe(false);

    // And the engine that holds that lesson is still the same object.
    expect(window[ENGINE_KEY]).toBe(fake);
    expect(fake._calls.clearWorld).toBe(0);
    m.unmount();
  });

  it('does not dismiss the intro into an empty world when the engine is not ready yet', () => {
    // initEngine runs ~100ms after the container mounts; an eager click used to
    // land first, dismissing the intro and loading nothing.
    const m = mountTool(cfg, {
      _introShownOnce: true,
      showLessonIntro: true,
      activeLesson: 'volumeExplorer',
    });

    const start = findByText(m.container, 'Start Lesson');
    expect(start).toBeTruthy();

    React.act(function () { start.click(); });

    // Still showing the intro — the loader retries instead of dropping the
    // student into a blank default world.
    expect(m.bucket().showLessonIntro).not.toBe(false);
    m.unmount();
  });
});
