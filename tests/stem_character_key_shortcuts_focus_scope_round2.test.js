import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { sliceBetween } from './helpers/anchored_slice.js';

// WCAG 2.1.4 Character Key Shortcuts, round 2. Each of these tools listened for
// bare letters / digits / Space on window or document. A single-key shortcut
// must act only while focus is inside its component (or be turn-off-able /
// remappable), so a speech-input user dictating into another control does not
// fire it. Each case presses the key with focus OUTSIDE the tool (must be
// ignored) and INSIDE it (must still work).
//
// Handlers that live deep inside a 3D/canvas engine are eval-sliced from the
// real source and run against stubs; the rest render the tool.
//
// VPAT_KEYS2_SRC_DIR points the suite at another copy of stem_lab/ (mutation
// check: the pre-fix copies must turn the "outside" assertions red).

const DIR = process.env.VPAT_KEYS2_SRC_DIR || 'stem_lab';
const src = (name) => readFileSync(resolve(process.cwd(), DIR, 'stem_tool_' + name + '.js'), 'utf8');
const fileOf = (name) => DIR + '/stem_tool_' + name + '.js';

function keyEvent(type, key, code, target, extra) {
  const ev = new window.KeyboardEvent(type, Object.assign({ key, code, bubbles: true, cancelable: true }, extra || {}));
  Object.defineProperty(ev, 'target', { value: target });
  return ev;
}
function box(html) {
  const host = document.createElement('div');
  host.innerHTML = html;
  document.body.appendChild(host);
  return host;
}

afterEach(() => { document.body.innerHTML = ''; });

// ── handler-level cases (eval-sliced) ─────────────────────────────────────────

describe('Space Colony: WASD pan only while focus is inside the colony', () => {
  it('ignores "w" from outside, acts on it from inside', () => {
    const code = sliceBetween(src('spacecolony'), 'window._colonyKeyHandler = function (e) {', "window.addEventListener('keydown', window._colonyKeyHandler);", { file: 'spacecolony' });
    const handler = new Function(code.replace('window._colonyKeyHandler = ', 'return ') )();
    const host = box('<div data-spacecolony-root="true"><button id="in">x</button></div>');
    const upd = vi.fn();
    window._colonyKeyActive = true; window._colonyUpd = upd; window._colonyState = { colonyCamY: 10 };
    handler(keyEvent('keydown', 'w', 'KeyW', document.body));
    expect(upd, '"w" with focus outside the tool panned the map').not.toHaveBeenCalled();
    handler(keyEvent('keydown', 'w', 'KeyW', host.querySelector('#in')));
    expect(upd).toHaveBeenCalled();
    window._colonyKeyActive = false; window._colonyUpd = null; window._colonyState = null;
  });
});

describe('Behavior Lab: Space delivers food only while focus is inside the lab', () => {
  it('ignores Space from outside, acts on the focused chamber canvas', () => {
    const code = sliceBetween(src('behaviorlab'), 'window._blKeyHandler = function (e) {', "document.addEventListener('keydown', window._blKeyHandler);", { file: 'behaviorlab' });
    const handler = new Function(code.replace('window._blKeyHandler = ', 'return '))();
    const host = box('<div class="behaviorlab-tool-shell"><canvas id="bl-chamber-canvas" tabindex="0"></canvas></div>');
    const reinforce = vi.fn();
    window._blReinforceFn = reinforce;
    handler(keyEvent('keydown', ' ', 'Space', document.body));
    expect(reinforce, 'Space with focus outside the lab delivered food').not.toHaveBeenCalled();
    handler(keyEvent('keydown', ' ', 'Space', host.querySelector('canvas')));
    expect(reinforce).toHaveBeenCalledTimes(1);
    window._blReinforceFn = null;
  });
});

describe('Bike Lab ride: Space brakes only while focus is inside the ride view', () => {
  it('ignores Space from outside, brakes from inside', () => {
    const code = sliceBetween(src('bikelab'), 'if (!running) return;\n          var onKey = function(e) {', "var onKeyUp = function(e) { if (e.key === ' ') setBraking(false); };", { file: 'bikelab' });
    const setGear = vi.fn(), setBraking = vi.fn();
    const onKey = new Function('running', 'setGear', 'setBraking', 'if (!running) return;\nvar onKey = function(e) {' + code.slice('if (!running) return;\n          var onKey = function(e) {'.length) + '\nreturn onKey;')(true, setGear, setBraking);
    const host = box('<div data-bikelab-ride-root="true"><button id="in">Brake</button></div>');
    onKey(keyEvent('keydown', ' ', 'Space', document.body));
    expect(setBraking, 'Space with focus outside the ride braked the bike').not.toHaveBeenCalled();
    onKey(keyEvent('keydown', ' ', 'Space', host.querySelector('#in')));
    expect(setBraking).toHaveBeenCalledWith(true);
  });
});

describe('Cell play-as-organism: WASD steer only while focus is inside the Cell tool', () => {
  it('ignores "w" from outside, steers from inside', () => {
    const START = 'function onKey(e) {\n              if (previewCellAnatomyKey(e)) return;';
    const code = sliceBetween(src('cell'), START, "window.addEventListener('keydown', onKey);", { file: 'cell' });
    const host = box('<div data-cell-tool="true"><button id="play">Play</button><canvas id="cv"></canvas></div>');
    const canvasEl = host.querySelector('#cv');
    const playerKeys = {};
    const onKey = new Function('previewCellAnatomyKey', 'dismissCellExplanation', 'cellKeyTargetIsFormControl', 'playAsOrg', 'isMovementKey', 'missionControlsAllowed', 'playerKeys', 'world', 'canvasEl', 'renderStaticFrame',
      code + '\nreturn onKey;')(() => false, () => false, () => false, {}, (k) => /^[wasd]$/i.test(k) || /^Arrow/.test(k), () => true, playerKeys, {}, canvasEl, () => {});
    onKey(keyEvent('keydown', 'w', 'KeyW', document.body));
    expect(playerKeys.w, '"w" with focus outside the tool steered the organism').toBeFalsy();
    onKey(keyEvent('keydown', 'w', 'KeyW', host.querySelector('#play')));
    expect(playerKeys.w).toBe(true);
    onKey(keyEvent('keyup', 'w', 'KeyW', document.body));
    expect(playerKeys.w, 'keyup must still release the key from anywhere').toBe(false);
  });
});

describe('Geometry World: single-key shortcuts only while the world has focus', () => {
  it('ignores "1" from outside, selects block 1 from inside the world', () => {
    const source = src('geometryworld');
    const marker = '_docH.keydown = ';
    const body = sliceBetween(source, marker, "        document.addEventListener('keyup'", { file: 'geometryworld' }).slice(marker.length).trim().replace(/\);$/, '');
    const make = new Function('engine', 'setBuildShape', 'upd', 'BLOCK_TYPES', 'closeGameSettings', 'return (' + body + ');');
    const engine = { _modalState: {}, _toggleHud: vi.fn(), isLocked: false, _touchActive: false };
    const upd = vi.fn(), setBuildShape = vi.fn();
    const handle = make(engine, setBuildShape, upd, [{ id: 'stone' }, { id: 'wood' }], vi.fn());
    const host = box('<div id="geoworld-fs-wrap" tabindex="0"><button id="hud">HUD</button></div>');
    handle(keyEvent('keydown', '1', 'Digit1', document.body));
    expect(upd.mock.calls.length + setBuildShape.mock.calls.length, '"1" with focus outside the world changed it').toBe(0);
    handle(keyEvent('keydown', '1', 'Digit1', host.querySelector('#geoworld-fs-wrap')));
    expect(upd.mock.calls.length + setBuildShape.mock.calls.length).toBeGreaterThan(0);
  });
});

describe('Echo Trainer 3D: movement keys and Space only while the viewport has focus', () => {
  it('ignores Space/W from outside, acts from the focused viewport', () => {
    const code = sliceBetween(src('echotrainer'), '        function onKeyDown(e)', '        function onKeyUp(e)', { file: 'echotrainer' });
    const host = box('<div id="vp" tabindex="0" role="application"></div>');
    const keysRef = { current: {} }, emitClick = vi.fn();
    const onKeyDown = new Function('keysRef', 'emitClick', 'isLocked', 'container', code + '\nreturn onKeyDown;')(keysRef, emitClick, false, host.querySelector('#vp'));
    onKeyDown(keyEvent('keydown', ' ', 'Space', document.body));
    onKeyDown(keyEvent('keydown', 'w', 'KeyW', document.body));
    expect(emitClick, 'Space with focus outside the viewport emitted a click').not.toHaveBeenCalled();
    expect(keysRef.current.KeyW, '"w" with focus outside the viewport moved the player').toBeFalsy();
    onKeyDown(keyEvent('keydown', ' ', 'Space', host.querySelector('#vp')));
    onKeyDown(keyEvent('keydown', 'w', 'KeyW', host.querySelector('#vp')));
    expect(emitClick).toHaveBeenCalledTimes(1);
    expect(keysRef.current.KeyW).toBe(true);
  });
});

describe('Echolocation 3D cave: flight keys only while the cave has focus or the mouse is locked', () => {
  it('ignores W from outside, flies from the focused cave canvas', () => {
    const code = sliceBetween(src('echolocation'), 'var _CAVE_FLIGHT_CODES = {', 'eng._keyUp = function(e) {', { file: 'echolocation' });
    const host = box('<div id="echo-cave3d-fs-wrap"><canvas tabindex="0"></canvas></div>');
    const eng = { keys: {}, _locked: false };
    const keyDown = new Function('eng', 'container', code + '\nreturn eng._keyDown;')(eng, host.querySelector('#echo-cave3d-fs-wrap'));
    keyDown(keyEvent('keydown', 'w', 'KeyW', document.body));
    expect(eng.keys.KeyW, '"w" with focus outside the cave moved the bat').toBeFalsy();
    keyDown(keyEvent('keydown', 'w', 'KeyW', host.querySelector('canvas')));
    expect(eng.keys.KeyW).toBe(true);
    eng.keys = {}; eng._locked = true;
    keyDown(keyEvent('keydown', 'w', 'KeyW', document.body));
    expect(eng.keys.KeyW, 'pointer-locked flight must keep working').toBe(true);
  });
});

describe('Echolocation sonar: flight keys only while focus is inside the sonar workspace', () => {
  it('ignores W from outside, flies from inside', () => {
    const code = sliceBetween(src('echolocation'), "var FLIGHT_KEYS = { 'arrowup'", "window.addEventListener('keydown', onKey);", { file: 'echolocation' });
    const host = box('<div id="echo-sonar-fs-workspace"><canvas tabindex="0"></canvas></div>');
    const sonarKeysRef = { current: {} }, emitSonarPulse = vi.fn();
    const onKey = new Function('sonarKeysRef', 'emitSonarPulse', code + '\nreturn onKey;')(sonarKeysRef, emitSonarPulse);
    onKey(keyEvent('keydown', 'w', 'KeyW', document.body));
    onKey(keyEvent('keydown', ' ', 'Space', document.body));
    expect(sonarKeysRef.current.w, '"w" with focus outside the workspace moved the bat').toBeFalsy();
    expect(emitSonarPulse, 'Space with focus outside the workspace pulsed').not.toHaveBeenCalled();
    onKey(keyEvent('keydown', 'w', 'KeyW', host.querySelector('canvas')));
    expect(sonarKeysRef.current.w).toBe(true);
  });
});

describe('Road Ready driving: letter shortcuts only while focus is inside the drive view', () => {
  it('ignores "h" (HUD) from outside, cycles the HUD from inside', () => {
    const code = sliceBetween(src('roadready'), '        var onKeyDown = function(e) {\n          var keyName', '        var onKeyUp = function(e) { keysRef', { file: 'roadready' });
    const names = ['exitDriving', 'keysRef', 'rideAlongControlsLocked', 'rrAnnounce', '__alloT', 'togglePause', 'cycleCameraMode', 'cycleHudPreset', 'upd', 'dataRef', 'takePhoto', 'attemptDriveGear', 'applyTurnSignal', 'blinkerRef', 'playHorn'];
    const cycleHudPreset = vi.fn();
    const deps = { exitDriving: vi.fn(), keysRef: { current: {} }, rideAlongControlsLocked: () => false, rrAnnounce: vi.fn(), __alloT: (k, f) => f, togglePause: vi.fn(), cycleCameraMode: vi.fn(), cycleHudPreset, upd: vi.fn(), dataRef: { current: {} }, takePhoto: vi.fn(), attemptDriveGear: vi.fn(), applyTurnSignal: vi.fn(), blinkerRef: { current: 0 }, playHorn: vi.fn() };
    const onKeyDown = new Function(...names, code + '\nreturn onKeyDown;')(...names.map((n) => deps[n]));
    const host = box('<div class="rr-drive-shell" data-rr-view="driving"><canvas tabindex="0"></canvas></div>');
    onKeyDown(keyEvent('keydown', 'h', 'KeyH', document.body));
    expect(cycleHudPreset, '"h" with focus outside the drive view changed the HUD').not.toHaveBeenCalled();
    onKeyDown(keyEvent('keydown', 'h', 'KeyH', host.querySelector('canvas')));
    expect(cycleHudPreset).toHaveBeenCalledTimes(1);
    onKeyDown(keyEvent('keydown', 'Escape', 'Escape', document.body));
    expect(deps.exitDriving, 'Escape (not a character key) still ends the drive from anywhere').toHaveBeenCalled();
  });
});

describe('Road Ready drills: shared drill keys only while focus is inside the drill', () => {
  let detach = null;
  beforeEach(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(fileOf('roadready'), 'roadReady'); });
  afterEach(() => { if (detach) detach(); detach = null; delete window.__RR_TEST_EXPORTS__; });
  it('ignores "w" from outside, drives from inside', () => {
    const RR = window.__RR_TEST_EXPORTS__.roadReady;
    const keysRef = { current: {} };
    detach = RR.attachDrillKeys(keysRef, () => {});
    const host = box('<div data-rr-drill="true"><canvas tabindex="0"></canvas></div>');
    document.body.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'w', bubbles: true, cancelable: true }));
    expect(keysRef.current.w, '"w" with focus outside the drill drove the car').toBeFalsy();
    host.querySelector('canvas').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'w', bubbles: true, cancelable: true }));
    expect(keysRef.current.w).toBe(true);
  });
});

// ── render-level cases ───────────────────────────────────────────────────────

const realGetContext = window.HTMLCanvasElement.prototype.getContext;
let root = null, host = null;
function stubDom() {
  const fake = new Proxy(function () {}, {
    get: (t, p) => (p === 'measureText' ? () => ({ width: 0 }) : (p === Symbol.toPrimitive ? () => 0 : () => fake)),
    set: () => true,
    apply: () => fake,
  });
  window.HTMLCanvasElement.prototype.getContext = () => fake;
  if (!window.ResizeObserver) { window.ResizeObserver = globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }; }
  if (!window.IntersectionObserver) { window.IntersectionObserver = globalThis.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} }; }
  // Music Synth requires Web Audio; a do-nothing graph is enough to reach its key handlers.
  const NUM = { currentTime: 0, sampleRate: 44100, value: 0, length: 0, duration: 0, numberOfChannels: 1, baseLatency: 0 };
  const node = new Proxy(function () {}, {
    get: (t, p) => (p === 'then' ? undefined : p === 'state' ? 'running' : p in NUM ? NUM[p] : p === Symbol.toPrimitive ? () => 0 : node),
    set: () => true,
    apply: () => node,
    construct: () => node,
  });
  window.AudioContext = globalThis.AudioContext = function () { return node; };
  window.webkitAudioContext = window.AudioContext;
  if (!window.matchMedia) window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
}
async function mount(id, seed) {
  const tool = window.StemLab._registry[id];
  const view = { snap: null, data: null };
  function App() {
    const [toolData, setToolData] = React.useState(seed || {});
    const [labToolData, setLabToolData] = React.useState({});
    view.data = toolData;
    view.snap = JSON.stringify([toolData, labToolData]);
    const ctx = makeCtx({
      toolData, setToolData, labToolData, setLabToolData,
      // ctx.update(tool, key, value) writes toolData[tool][key]; ctx.update(key, value) writes toolData[key].
      update: function (a, b, c) {
        const nested = arguments.length >= 3;
        setToolData((p) => (nested
          ? Object.assign({}, p, { [a]: Object.assign({}, p[a], { [b]: c }) })
          : Object.assign({}, p, { [a]: b })));
      },
      updateMulti: (a, o) => setToolData((p) => Object.assign({}, p, { [a]: Object.assign({}, p[a], o || {}) })),
    });
    return tool.render(ctx);
  }
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await React.act(async () => { root.render(React.createElement(App)); });
  await React.act(async () => { await new Promise((r) => setTimeout(r, 5)); });
  return view;
}
const fingerprint = (view) => view.snap + '|' + host.innerHTML.length;
async function press(target, key, code) {
  await React.act(async () => { target.dispatchEvent(new window.KeyboardEvent('keydown', { key, code, bubbles: true, cancelable: true })); });
}

describe('render-level tools', () => {
  beforeEach(() => { resetStemLab(); stubDom(); });
  afterEach(async () => {
    if (root) { await React.act(async () => { root.unmount(); }); root = null; }
    if (host) { host.remove(); host = null; }
    window.HTMLCanvasElement.prototype.getContext = realGetContext;
  });

  it('AI Literacy Lab: "g" opens the glossary only while focus is inside the lab', async () => {
    try { localStorage.setItem('alloLlmLitSeenWelcome', '1'); } catch (_) {}
    loadTool(fileOf('llm_literacy'), 'llmLiteracy');
    const view = await mount('llmLiteracy');
    const before = fingerprint(view);
    await press(document.body, 'g', 'KeyG');
    expect(fingerprint(view) === before, '"g" with focus outside the lab opened the glossary').toBe(true);
    await press(host.querySelector('[data-llm-literacy-root] main') || host.querySelector('main'), 'g', 'KeyG');
    expect(fingerprint(view) !== before, '"g" inside the lab did nothing').toBe(true);
  });

  it('Typing Practice menu: "t" cycles the theme only while focus is inside the tool', async () => {
    loadTool(fileOf('typingpractice'), 'typingPractice');
    const view = await mount('typingPractice', { typingPractice: { view: 'menu' } });
    const before = view.snap;
    await press(document.body, 't', 'KeyT');
    expect(view.snap === before, '"t" with focus outside the tool changed the theme').toBe(true);
    await press(host.querySelector('.tp-root'), 't', 'KeyT');
    expect(view.snap !== before, '"t" inside the tool did nothing').toBe(true);
  });

  it('Typing Practice drill intro: Space starts the drill only from quiet space inside the tool, never from a button, a field or outside', async () => {
    loadTool(fileOf('typingpractice'), 'typingPractice');
    const view = await mount('typingPractice', { typingPractice: { view: 'drill-intro', currentDrill: 'home-row' } });
    const tp = host.querySelector('.tp-root');
    expect(tp, 'typing practice root not rendered').toBeTruthy();
    const viewNow = () => (view.data.typingPractice || {}).view;
    expect(viewNow()).toBe('drill-intro');
    await press(document.body, ' ', 'Space');
    expect(viewNow(), 'Space with focus outside the tool started the drill').toBe('drill-intro');
    const btn = tp.querySelector('button');
    expect(btn).toBeTruthy();
    await press(btn, ' ', 'Space');
    expect(viewNow(), 'Space on a focused button started the drill').toBe('drill-intro');
    const field = document.createElement('input');
    tp.appendChild(field);
    await press(field, ' ', 'Space');
    field.remove();
    expect(viewNow(), 'Space in a typing field started the drill').toBe('drill-intro');
    await press(tp, ' ', 'Space');
    expect(viewNow(), 'Space on quiet space inside the tool did not start the drill').toBe('drill');
  });

  it('Aquaculture Lab: "/" opens the topic library only while focus is inside the lab', async () => {
    loadTool(fileOf('aquaculture'), 'aquacultureLab');
    const view = await mount('aquacultureLab');
    const shell = host.querySelector('.aq-lab-shell');
    expect(shell, 'lab shell not rendered').toBeTruthy();
    const before = fingerprint(view);
    await press(document.body, '/', 'Slash');
    expect(fingerprint(view) === before, '"/" with focus outside the lab opened the library').toBe(true);
    await press(shell, '/', 'Slash');
    expect(fingerprint(view) !== before, '"/" inside the lab did nothing').toBe(true);
  });

  it('Music Synth: harmony-pad chord keys, drum pads and piano keys only while focus is inside the tool', async () => {
    loadTool(fileOf('music'), 'musicSynth');
    let view = await mount('musicSynth', { musicSynth: { synthTab: 'harmonypad' } });
    const musicRoot = () => host.querySelector('.allo-music-tool');
    expect(musicRoot(), 'music tool not rendered').toBeTruthy();
    await press(document.body, 'w', 'KeyW');
    expect((view.data.musicSynth || {}).omniChordRoot, '"w" outside the tool changed the chord').toBeUndefined();
    await press(musicRoot(), 'w', 'KeyW');
    expect(view.data.musicSynth.omniChordRoot).toBe('D');
    await React.act(async () => { root.unmount(); }); root = null; host.remove(); host = null;

    view = await mount('musicSynth', { musicSynth: { synthTab: 'beatpad' } });
    const padFired = () => { const m = view.data.musicSynth || {}; return m.padHit_0 === true || m.beatPadActive === 0; };
    await press(document.body, '1', 'Digit1');
    expect(padFired(), 'drum pad "1" outside the tool fired').toBe(false);
    await press(musicRoot(), '1', 'Digit1');
    expect(padFired(), 'drum pad "1" inside the tool did nothing').toBe(true);
    await React.act(async () => { root.unmount(); }); root = null; host.remove(); host = null;

    view = await mount('musicSynth', { musicSynth: { synthTab: 'play' } });
    expect(typeof window._alloSynthKeyDown).toBe('function');
    const outside = { key: 'z', repeat: false, target: document.body, preventDefault() {} };
    await React.act(async () => { window._alloSynthKeyDown(outside); });
    expect((view.data.musicSynth || {}).lastNote, 'piano "z" outside the tool played a note').toBeUndefined();
    const inside = { key: 'z', repeat: false, target: musicRoot(), preventDefault() {} };
    await React.act(async () => { window._alloSynthKeyDown(inside); });
    expect((view.data.musicSynth || {}).lastNote, 'piano "z" inside the tool did nothing').toBeTruthy();
  });
});
