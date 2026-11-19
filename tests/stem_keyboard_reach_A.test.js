// Keyboard reach (WCAG 2.1.1) for actions that were pointer-only:
// - Geometry World: the home-language translation line ("click to hear") and the
//   Class World Library cards (load a classmate's world) were divs with onClick.
// - Play Lab: repositioning a player (customPositions, which two football drills
//   need) was drag or tap-then-tap on the canvas only.
// - Space Colony: selecting a map tile (which unlocks Explore, Build and anomaly
//   scans) was a canvas click only; the keyboard could pan but never select.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const act = React.act;
const mounted = [];

const fakeCtx2d = () => new Proxy({}, {
  get: (o, k) => (k in o ? o[k] : (k === 'measureText' ? () => ({ width: 0 }) : (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') ? () => ({ addColorStop() {} }) : (k === 'getImageData' || k === 'createImageData') ? () => ({ data: new Uint8ClampedArray(4) }) : () => {})),
  set: (o, k, v) => { o[k] = v; return true; }
});

function key(node, k, extra) {
  act(() => { node.dispatchEvent(new KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true, cancelable: true }, extra || {}))); });
}

function mountStateful(toolId, initial, extraCtx) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const out = { state: null };
  function Harness() {
    const [data, setData] = React.useState(initial);
    out.state = data;
    const setter = (fn) => setData((prev) => (typeof fn === 'function' ? fn(prev) : fn));
    return window.StemLab._registry[toolId].render(makeCtx(Object.assign({ toolData: data, setToolData: setter }, extraCtx || {})));
  }
  const root = ReactDOMClient.createRoot(host);
  act(() => { root.render(React.createElement(Harness)); });
  mounted.push({ root, host });
  return { host, out };
}

afterEach(() => {
  while (mounted.length) { const m = mounted.pop(); act(() => m.root.unmount()); m.host.remove(); }
  vi.restoreAllMocks();
});

describe('Play Lab: move a player without a pointer', () => {
  it('the move buttons are focusable and Enter/Space move the chosen player one yard', () => {
    resetStemLab();
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => fakeCtx2d());
    loadTool('stem_lab/stem_tool_playlab.js', 'playlab');
    const { host, out } = mountStateful('playlab', {});
    const group = host.querySelector('[data-playlab-key-move]');
    expect(group, 'keyboard move group renders for football').toBeTruthy();
    const select = group.querySelector('select');
    act(() => {
      Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(select, 'QB');
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const right = host.querySelector('[data-playlab-key-move-dir="right"]');
    expect(right.tagName).toBe('BUTTON');
    right.focus();
    expect(document.activeElement).toBe(right);
    expect(right.getAttribute('aria-label')).toBe('Move QB one yard right');
    // A native button activates on Enter/Space through click; jsdom does not
    // synthesize that, so press it the way the browser does.
    act(() => { right.click(); });
    const first = out.state.playlab.customPositions.QB;
    expect(first).toBeTruthy();
    const down = host.querySelector('[data-playlab-key-move-dir="down"]');
    act(() => { down.click(); });
    const second = out.state.playlab.customPositions.QB;
    expect(second.x).toBe(first.x);
    expect(second.y).toBe(first.y + 1);
  });

  it('is not offered for soccer, where customPositions are ignored', () => {
    resetStemLab();
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => fakeCtx2d());
    loadTool('stem_lab/stem_tool_playlab.js', 'playlab');
    const { host } = mountStateful('playlab', { playlab: { sport: 'soccer', formationId: '433', conceptId: 'tikitaka', shapeId: 'midblock', savedPlays: [], customPositions: {}, badgesEarned: {}, drillStats: {} } });
    expect(host.querySelector('[data-playlab-key-move]')).toBeNull();
  });
});

describe('Space Colony: select a map tile from the keyboard', () => {
  function colonyState() {
    const tiles = [];
    for (let y = 0; y < 200; y++) for (let x = 0; x < 200; x++) tiles.push({ x, y, type: 'plains', color: '#000', name: 'Plains', icon: '.', res: 'none', explored: x < 20, hasAnomaly: false });
    return {
      colonyPhase: 'playing', colony: { name: 'Aurora', planet: 'Kepler-442b' },
      colonyMap: { tiles, colonyPos: { x: 6, y: 6 } }, colonyTurn: 3, turnPhase: 'day',
      colonyRes: { food: 100, energy: 100, water: 100, materials: 100, science: 100 },
      colonyBuildings: [], colonySettlers: [],
      colonyStats: { questionsAnswered: 0, correct: 0, buildingsConstructed: 0, anomaliesExplored: 0, turnsPlayed: 3 }
    };
  }

  it('Enter selects the middle tile and Shift+arrow moves the selection; Space works too', () => {
    resetStemLab();
    HTMLCanvasElement.prototype.getContext = function () { return fakeCtx2d(); };
    loadTool('stem_lab/stem_tool_spacecolony.js', 'spaceColony');
    const { host, out } = mountStateful('spaceColony', colonyState());
    const map = host.querySelector('canvas[role="application"]');
    expect(map).toBeTruthy();
    expect(map.tabIndex).toBe(0);
    expect(map.getAttribute('aria-describedby')).toBe('spacecolony-map-tile-keys');
    expect(host.querySelector('#spacecolony-map-tile-keys').textContent).toMatch(/Enter selects/);
    map.focus();
    expect(document.activeElement).toBe(map);
    key(map, 'Enter');
    const sel = out.state.colonySelTile;
    expect(sel, 'Enter selects a tile').toBeTruthy();
    const ts = 24;
    expect(sel.x).toBe(Math.floor(Math.ceil(map.width / ts) / 2));
    expect(sel.y).toBe(Math.floor(Math.ceil((map.height - 60) / ts) / 2));
    key(map, 'ArrowRight', { shiftKey: true });
    expect(out.state.colonySelTile.x).toBe(sel.x + 1);
    expect(out.state.colonySelTile.y).toBe(sel.y);
    // Shift+arrow moves the selection, not the camera.
    expect(out.state.colonyCamX || 0).toBe(0);
    key(map, 'ArrowDown', { shiftKey: true });
    expect(out.state.colonySelTile.y).toBe(sel.y + 1);
    // Space re-selects the current tile without moving it.
    key(map, ' ');
    expect(out.state.colonySelTile.x).toBe(sel.x + 1);
    expect(out.state.colonySelTile.tile).toBe(out.state.colonyMap.tiles[(sel.y + 1) * 200 + sel.x + 1]);
  });
});

describe('Geometry World: translation line and class world cards', () => {
  function makeThreeStub() {
    function vec() {
      const v = { x: 0, y: 0, z: 0, w: 0 };
      ['set', 'copy', 'add', 'sub', 'subVectors', 'normalize', 'multiplyScalar', 'applyQuaternion', 'setFromQuaternion', 'crossVectors', 'cross', 'lerp', 'addScaledVector', 'setY', 'round', 'floor', 'setScalar', 'applyEuler', 'fromArray', 'lookAt'].forEach((m) => { v[m] = () => v; });
      v.clone = () => vec(); v.distanceTo = () => 99; v.length = () => 1; v.lengthSq = () => 1; v.dot = () => 0; v.toArray = () => [0, 0, 0];
      return v;
    }
    return new Proxy({}, { get: (_t, prop) => (prop === 'SRGBColorSpace' ? 'srgb' : typeof prop === 'symbol' ? undefined : function () { return vec(); }) });
  }
  function fakeEngine(npcs) {
    const canvas = document.createElement('canvas');
    const v = () => ({ x: 0, y: 0, z: 0, distanceTo: () => 99, set() {}, clone() { return v(); }, toArray: () => [0, 0, 0], copy() { return this; }, sub() { return this; }, normalize() { return this; }, lengthSq: () => 1, length: () => 1 });
    return { clearWorld() {}, scene: { remove() {}, add() {}, children: [], background: { setRGB() {} }, fog: { color: { setRGB() {} } } }, renderer: { dispose() {}, domElement: canvas },
      camera: { position: { x: 0, y: 0, z: 0, set: vi.fn(), toArray: () => [0, 0, 0] }, quaternion: { x: 0, y: 0, z: 0, w: 1, toArray: () => [0, 0, 0, 1] }, rotation: { x: 0, y: 0, z: 0 }, getWorldDirection: (o) => o || v(), updateProjectionMatrix() {}, lookAt: vi.fn(), up: v() },
      blocks: {}, npcs: npcs || [], _particles: [], _dimLines: [], _selectionGlows: [], _layerGhosts: [], moveState: {}, lookState: {}, euler: { x: 0, y: 0, z: 0, setFromQuaternion() {} },
      velocity: { x: 0, y: 0, z: 0 }, _undoStack: [], _redoStack: [], flyMode: false,
      isLocked: false, isInputActive: () => false, blockUnderCrosshair: () => null, loadLesson: vi.fn(() => true), placeBlock() {}, removeBlock() {}, releaseInput() {}, getBlocksArr: () => [],
      clock: { getElapsedTime: () => 0, getDelta: () => 0.016 }, logEvent: vi.fn(), sessionLog: [], geometryHomeLessons: [] };
  }
  const spr = () => ({ position: { x: 4, y: 1, z: 4 }, scale: { set() {}, x: 1, y: 1 }, material: { opacity: 1, color: { setHex() {} } }, visible: true, rotation: { x: 0, y: 0, z: 0 } });
  const live = (data) => ({ data, body: spr(), head: spr(), label: spr(), prompt: spr(), qMark: spr(), _arms: [], _eyeParts: [] });
  const lesson = { worldActive: true, activeLesson: 'volumeExplorer', _introShownOnce: true, tutorialDismissed: true, showLessonIntro: false, npcTypewriterNpc: 0, npcTypewriterPos: 999, totalQ: 3, score: 0 };

  function mountGw(bucket) {
    const container = document.createElement('div'); document.body.appendChild(container);
    const toolData = { _threeLoaded: true, geometryWorld: Object.assign({}, bucket) };
    let bump = null;
    const ctx = makeCtx({ toolData, update: (b, k, val) => { toolData[b] = Object.assign({}, toolData[b], { [k]: val }); if (bump) bump(); }, updateMulti: (b, patch) => { toolData[b] = Object.assign({}, toolData[b], patch); if (bump) bump(); } });
    const cfg = window.StemLab._registry.geometryWorld;
    const Comp = () => { const st = React.useState(0); bump = () => st[1]((n) => n + 1); return cfg.render(ctx); };
    const root = ReactDOMClient.createRoot(container);
    act(() => { root.render(React.createElement(Comp)); });
    act(() => bump());
    mounted.push({ root, host: container });
    return { container, bucket: () => toolData.geometryWorld, q: (s) => container.querySelector(s) };
  }
  function loadGw() {
    resetStemLab();
    window.THREE = makeThreeStub();
    loadTool('stem_lab/stem_tool_geometryworld.js', 'geometryWorld');
  }

  it('the translation line is a real button that speaks the translation', () => {
    loadGw();
    const bot = { name: 'Builder Bot', dialogue: 'Fill the pool!', color: 0x16a34a, position: [4, 1, 11] };
    window.__geoWorldEngine = fakeEngine([live(bot)]);
    const speak = vi.spyOn(window.StemLab.geometryWorldSpeech, 'speakLine').mockReturnValue({ key: 'k', spoken: false, reason: 'muted' });
    const m = mountGw(Object.assign({}, lesson, { showNpcDialog: true, dialogNpcIdx: 0, homeLang: 'es', npcTranslations: { '0_es': { dialogue: '¡Llena la piscina!' } } }));
    const line = m.q('[data-gw-npc-translation]');
    expect(line, 'translation line renders').toBeTruthy();
    expect(line.tagName).toBe('BUTTON');
    expect(line.getAttribute('type')).toBe('button');
    line.focus();
    expect(document.activeElement).toBe(line);
    act(() => { line.click(); });
    expect(speak).toHaveBeenCalledWith('¡Llena la piscina!', expect.anything(), expect.objectContaining({ language: 'Spanish' }));
    delete window.__geoWorldEngine;
  });

  it('a class world card is focusable and Enter or Space loads that world', () => {
    loadGw();
    const engine = fakeEngine([]);
    window.__geoWorldEngine = engine;
    const world = { title: 'Tower', author: 'Sam', timestamp: 0, data: { title: 'Tower', structures: [], npcs: [] } };
    const m = mountGw(Object.assign({}, lesson, { showPeerWorlds: true, peerWorldsList: [world, world] }));
    const card = m.q('[data-gw-peer-world="0"]');
    expect(card).toBeTruthy();
    expect(card.getAttribute('role')).toBe('button');
    expect(card.tabIndex).toBe(0);
    card.focus();
    expect(document.activeElement).toBe(card);
    key(card, 'Enter');
    expect(engine.loadLesson).toHaveBeenCalledTimes(1);
    expect(engine.loadLesson.mock.calls[0][0]).toBe(world.data);
    // The world loaded and the library closed; reopen it and use Space.
    engine.loadLesson.mockClear();
    const m2 = mountGw(Object.assign({}, lesson, { showPeerWorlds: true, peerWorldsList: [world] }));
    const card2 = m2.q('[data-gw-peer-world="0"]');
    const ev = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    act(() => { card2.dispatchEvent(ev); });
    expect(ev.defaultPrevented).toBe(true);
    expect(engine.loadLesson).toHaveBeenCalledTimes(1);
    delete window.__geoWorldEngine;
  });
});
