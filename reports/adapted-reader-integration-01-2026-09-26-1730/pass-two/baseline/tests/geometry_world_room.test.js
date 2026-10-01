// Geometry World: room for the world (2026-09-24).
//
// Measured before this change, with the real renderer: walking a lesson, the interface
// covered 15% of the world on a Chromebook, 43% on a phone held upright and 57% held
// sideways; talking to a character covered 80 to 100% of the centre of the view, over
// the very structure the question was about. After: the material palette and shape tray
// fold into one Blocks button during lessons (Free Build keeps them open); U hides every
// control; the character dialog docks beside the view and Look folds it to one line; the
// Measure panel opens compact everywhere; phones keep four actions and a More sheet.
// tests/e2e/18-geometry-world-gl.spec.ts measures the coverage on real WebGL.

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, makeCtx, resetStemLab, loadTool } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_geometryworld.js';
const SOURCE = readFileSync(FILE, 'utf8');
const ENGINE_KEY = '__geoWorldEngine';
const ORIGINAL_UA = navigator.userAgent;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let cfg;
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
    isLocked: false, isInputActive: () => false, blockUnderCrosshair: () => null, loadLesson: vi.fn(), placeBlock() {}, removeBlock() {}, releaseInput() {}, getBlocksArr: () => [],
    clock: { getElapsedTime: () => 0, getDelta: () => 0.016 }, logEvent: vi.fn(), sessionLog: [], geometryHomeLessons: [] };
}
const spr = () => ({ position: { x: 4, y: 1, z: 4 }, scale: { set() {}, x: 1, y: 1 }, material: { opacity: 1, color: { setHex() {} } }, visible: true, rotation: { x: 0, y: 0, z: 0 } });
const live = (data) => ({ data, body: spr(), head: spr(), label: spr(), prompt: spr(), qMark: spr(), _arms: [], _eyeParts: [] });
function mount(bucket) {
  const container = document.createElement('div'); document.body.appendChild(container);
  const toolData = { _threeLoaded: true, geometryWorld: Object.assign({}, bucket) };
  let bump = null;
  const ctx = makeCtx({ toolData, update: (b, k, val) => { toolData[b] = Object.assign({}, toolData[b], { [k]: val }); if (bump) bump(); }, updateMulti: (b, patch) => { toolData[b] = Object.assign({}, toolData[b], patch); if (bump) bump(); } });
  const Comp = () => { const st = React.useState(0); bump = () => st[1]((n) => n + 1); return cfg.render(ctx); };
  const root = ReactDOMClient.createRoot(container);
  React.act(() => { root.render(React.createElement(Comp)); });
  React.act(() => bump());
  return { container, bucket: () => toolData.geometryWorld, set: (patch) => React.act(() => ctx.updateMulti('geometryWorld', patch)), root: () => container.querySelector('#geoworld-fs-workspace'), q: (s) => container.querySelector(s), unmount: () => { React.act(() => root.unmount()); container.remove(); } };
}
const click = (node) => React.act(() => node.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 })));
const lesson = { worldActive: true, activeLesson: 'volumeExplorer', _introShownOnce: true, tutorialDismissed: true, showLessonIntro: false, npcTypewriterNpc: 0, npcTypewriterPos: 999, totalQ: 3, score: 0 };

beforeAll(() => { resetStemLab(); window.THREE = makeThreeStub(); cfg = loadTool(FILE, 'geometryWorld'); }, 120000);
beforeEach(() => { window.THREE = makeThreeStub(); localStorage.clear(); window[ENGINE_KEY] = fakeEngine(); });
afterEach(() => { delete window[ENGINE_KEY]; document.body.innerHTML = ''; Object.defineProperty(navigator, 'userAgent', { configurable: true, value: ORIGINAL_UA }); });

describe('the Blocks drawer', () => {
  it('folds the palette and shapes away in a lesson, behind one button that names the current block', () => {
    const m = mount(lesson);
    expect(m.root().getAttribute('data-build-tools')).toBe('closed');
    expect(m.q('.gw-hotbar')).toBeNull();
    expect(m.q('.gw-shape-tray')).toBeNull();
    const blocks = m.q('[data-gw-utility="blocks"]');
    expect(blocks.querySelector('.gw-utility-label').textContent).toBe('Stone');
    expect(blocks.querySelector('.gw-build-toggle-caret').getAttribute('aria-hidden')).toBe('true');
    expect(blocks.getAttribute('aria-expanded')).toBe('false');
    expect(blocks.getAttribute('aria-controls')).toBe('gw-build-tools');
    expect(blocks.getAttribute('aria-label')).toBe('Show blocks and shapes. Building with Stone, Cube shape');
    click(blocks);
    expect(m.bucket().buildToolsOpenLesson).toBe(true);
    expect(m.root().getAttribute('data-build-tools')).toBe('open');
    expect(m.q('#gw-build-tools .gw-hotbar')).toBeTruthy();
    expect(m.q('#gw-build-tools .gw-shape-tray')).toBeTruthy();
    expect(m.q('[data-gw-utility="blocks"]').getAttribute('aria-expanded')).toBe('true');
    expect(m.q('[data-gw-utility="blocks"] .gw-utility-label').textContent).toBe('Blocks');
    m.unmount();
  });
  it('opens in Free Build, and each mode keeps its own choice', () => {
    const m = mount(Object.assign({}, lesson, { activeLesson: 'builderSandbox' }));
    expect(m.root().getAttribute('data-build-tools')).toBe('open');
    expect(m.q('.gw-hotbar')).toBeTruthy();
    click(m.q('[data-gw-utility="blocks"]'));
    expect(m.bucket().buildToolsOpenSandbox).toBe(false);
    expect(m.bucket().buildToolsOpenLesson).toBeUndefined();
    m.unmount();
  });
  it('opens by itself in a lesson whose objectives ask for building, until the student chooses', () => {
    const m = mount(Object.assign({}, lesson, { activeLesson: 'fractionBuilder' }));
    expect(m.root().getAttribute('data-build-tools')).toBe('open');
    expect(m.q('.gw-shape-tray')).toBeTruthy();
    m.unmount();
    window[ENGINE_KEY] = fakeEngine();
    const b = mount(Object.assign({}, lesson, { activeLesson: 'buildChallenge' }));
    expect(b.root().getAttribute('data-build-tools')).toBe('open');
    b.unmount();
    window[ENGINE_KEY] = fakeEngine();
    const chose = mount(Object.assign({}, lesson, { activeLesson: 'fractionBuilder', buildToolsOpenLesson: false }));
    expect(chose.root().getAttribute('data-build-tools')).toBe('closed');
    chose.unmount();
  });
  it('shows the build hint only while building', () => {
    const hint = { allowed: true, code: 'ready', reason: 'Ready to build' };
    let m = mount(Object.assign({}, lesson, { placementHint: hint }));
    expect(m.q('.gw-placement-hint')).toBeNull();
    m.unmount();
    window[ENGINE_KEY] = fakeEngine();
    m = mount(Object.assign({}, lesson, { placementHint: hint, buildToolsOpenLesson: true }));
    expect(m.q('.gw-placement-hint')).toBeTruthy();
    m.unmount();
    // Building with B and the drawer closed: once a block is down, the hint (and its X to
    // remove) comes back, so removing a block stays findable.
    const placedOne = fakeEngine(); placedOne.blocksPlaced = 1; window[ENGINE_KEY] = placedOne;
    m = mount(Object.assign({}, lesson, { placementHint: hint }));
    expect(m.q('.gw-placement-hint')).toBeTruthy();
    expect(m.q('.gw-placement-remove')).toBeTruthy();
    m.unmount();
  });
});

describe('Hide controls (U)', () => {
  it('hides every control but the world, the crosshair and open dialogs, and comes back', () => {
    const m = mount(lesson);
    const hide = m.q('[data-gw-utility="hide"]');
    expect(hide.getAttribute('aria-keyshortcuts')).toBe('U');
    click(hide);
    expect(m.bucket().hudHidden).toBe(true);
    expect(m.root().getAttribute('data-hud-hidden')).toBe('true');
    const restore = m.q('.gw-hud-restore');
    expect(restore.getAttribute('aria-keyshortcuts')).toBe('U');
    expect(restore.textContent).toBe('Show controls');
    // The engine's U and Esc handlers reach it through this bridge.
    React.act(() => window[ENGINE_KEY]._toggleHud());
    expect(m.bucket().hudHidden).toBe(false);
    expect(m.q('.gw-hud-restore')).toBeNull();
    React.act(() => window[ENGINE_KEY]._toggleHud());
    click(m.q('.gw-hud-restore'));
    expect(m.bucket().hudHidden).toBe(false);
    m.unmount();
  });
  it('the rule hides the workspace children except the viewport, styles, dialogs and the restore button', () => {
    const m = mount(Object.assign({}, lesson, { hudHidden: true }));
    const css = m.q('style[data-gw-room]').textContent;
    expect(css).toContain('#geoworld-fs-workspace.gw-root[data-hud-hidden="true"]>:not(style):not(#geoworld-fs-wrap):not([role="dialog"]):not(.gw-hud-restore){display:none!important}');
    m.unmount();
  });
  it('U toggles and Esc restores, in the engine key handler', () => {
    expect(SOURCE).toContain("case 'KeyU': // Hide or show the controls\n              if (engine._toggleHud) { ev.preventDefault(); engine._toggleHud(); }");
    expect(SOURCE).toContain("case 'Escape':\n              if(engine._hudHidden && engine._toggleHud){ev.preventDefault();engine._toggleHud();break;}");
  });
});

describe('the character dialog', () => {
  const bot = { name: 'Builder Bot', dialogue: 'Fill the pool!', color: 0x16a34a, position: [4, 1, 11],
    question: { text: 'What is the area of the pool floor?', choices: ['6 square units', '5 square units', '20 square units'], correct: 0 } };
  it('has one way out: its own close and Esc, with no Back to Game dock', () => {
    window[ENGINE_KEY] = fakeEngine([live(bot)]);
    const m = mount(Object.assign({}, lesson, { showNpcDialog: true, dialogNpcIdx: 0 }));
    expect(m.q('.gw-dialog--npc')).toBeTruthy();
    expect(m.root().getAttribute('data-npc-dialog')).toBe('open');
    expect(m.q('.gw-return-dock')).toBeNull();
    m.unmount();
    // Other overlays keep it.
    window[ENGINE_KEY] = fakeEngine();
    const s = mount(Object.assign({}, lesson, { showHelp: true }));
    expect(s.q('.gw-return-dock')).toBeTruthy();
    s.unmount();
  });
  it('Look folds it to one line, frees the world and its tools, and Back to question restores it', () => {
    window[ENGINE_KEY] = fakeEngine([live(bot)]);
    const m = mount(Object.assign({}, lesson, { showNpcDialog: true, dialogNpcIdx: 0 }));
    expect(m.q('[data-gw-utility="net"]').disabled).toBe(true);
    click(m.q('.gw-npc-look'));
    expect(m.bucket().npcDialogPeek).toBe(true);
    expect(m.root().getAttribute('data-npc-dialog')).toBe('peek');
    expect(m.q('.gw-dialog--npc')).toBeNull();
    const strip = m.q('.gw-npc-peek');
    expect(strip.getAttribute('role')).toBe('region');
    expect(strip.querySelector('.gw-npc-peek-name').textContent).toBe('Builder Bot');
    expect(strip.querySelector('.gw-npc-peek-text').textContent).toBe('What is the area of the pool floor?');
    expect(m.q('[data-gw-utility="net"]').disabled).toBe(false);
    click(strip.querySelector('.gw-npc-peek-back'));
    expect(m.bucket().npcDialogPeek).toBe(false);
    expect(m.q('.gw-dialog--npc')).toBeTruthy();
    click(m.q('.gw-npc-look'));
    click(m.q('.gw-npc-peek-close'));
    expect(m.bucket()).toMatchObject({ showNpcDialog: false, npcDialogPeek: false });
    m.unmount();
  });
  it('every way of starting a conversation starts it unfolded', () => {
    const opens = SOURCE.match(/upd\(\{ showNpcDialog: true,[^}]*\}\)/g) || [];
    expect(opens.length).toBe(3);
    opens.forEach((call) => expect(call).toContain('npcDialogPeek: false'));
  });
});

describe('settings take what is set once', () => {
  it('Open Free Build is in the Menu during a lesson, not floating over the world', () => {
    const eng = fakeEngine(); eng.openFreeBuildLauncher = vi.fn(); window[ENGINE_KEY] = eng;
    const m = mount(Object.assign({}, lesson, { showGameSettings: true }));
    const open = m.q('[data-gw-open-free-build]');
    expect(open.textContent).toContain('Open Free Build');
    click(open);
    expect(eng.openFreeBuildLauncher).toHaveBeenCalledTimes(1);
    m.unmount();
    const sb = fakeEngine(); sb.openFreeBuildLauncher = vi.fn(); window[ENGINE_KEY] = sb;
    const f = mount(Object.assign({}, lesson, { activeLesson: 'builderSandbox', showGameSettings: true }));
    expect(f.q('[data-gw-open-free-build]'), 'already in Free Build').toBeNull();
    f.unmount();
  });
  it('touch look speed lives in settings, not over the world', () => {
    Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' });
    const m = mount(Object.assign({}, lesson, { touchMode: true }));
    expect(m.q('.gw-touch-look-panel')).toBeNull();
    expect(m.q('#gw-touch-look-sensitivity')).toBeNull();
    m.unmount();
    window[ENGINE_KEY] = fakeEngine();
    const s = mount(Object.assign({}, lesson, { touchMode: true, showGameSettings: true }));
    const group = s.q('.gw-settings-look');
    expect(group.getAttribute('role')).toBe('group');
    expect(group.querySelector('#gw-touch-look-sensitivity').type).toBe('range');
    expect(group.textContent).toContain('Look speed');
    s.unmount();
  });
  it('a desktop Menu has no touch look slider', () => {
    const m = mount(Object.assign({}, lesson, { showGameSettings: true }));
    expect(m.q('.gw-settings-look')).toBeNull();
    m.unmount();
  });
});

// Finishing the questions no longer ticks building and measuring objectives nobody did
// (Fraction Builder showed "Place two half-blocks" done with 0 blocks placed); the
// completion dialog lists them instead, as what is still to try.
describe('building objectives read the student\'s own blocks', () => {
  it('Scale Up opens the Blocks drawer, and ticks "build prism A doubled" only for a solid 4 by 2 by 2 of the student\'s cubes', () => {
    const eng = fakeEngine();
    const put = (x, y, z, extra) => { eng.blocks[x + ',' + y + ',' + z] = { userData: Object.assign({ gridPos: { x, y, z }, shape: 'cube', _measurementLayer: 'student' }, extra) }; };
    // Standing up on the pad: 2 long, 2 deep, 4 tall. A protected lesson block touching it does not
    // count, even one with no measurement layer (the builder reads those as lesson blocks too).
    for (let x = 22; x < 24; x++) for (let z = 6; z < 8; z++) for (let y = 1; y < 5; y++) put(x, y, z);
    put(24, 1, 6, { _lessonBlock: true, _measurementLayer: undefined });
    window[ENGINE_KEY] = eng;
    const m = mount(Object.assign({}, lesson, { activeLesson: 'scaleUp', objectivesOpen: true, totalQ: 4, score: 0, answeredNpcs: {} }));
    expect(m.root().getAttribute('data-build-tools')).toBe('open');
    const item = () => [...m.container.querySelectorAll('.gw-objective-item')].find((x) => /sand pad/.test(x.textContent));
    expect(item().getAttribute('data-complete')).toBe('true');
    expect(item().querySelector('.gw-objective-evidence').textContent).toBe('You built prism A doubled: 4 by 2 by 2');
    m.unmount();
    // Take one cube out: a gap.
    delete eng.blocks['23,3,7'];
    window[ENGINE_KEY] = eng;
    const gap = mount(Object.assign({}, lesson, { activeLesson: 'scaleUp', objectivesOpen: true, totalQ: 4, score: 0, answeredNpcs: {} }));
    const open = [...gap.container.querySelectorAll('.gw-objective-item')].find((x) => /sand pad/.test(x.textContent));
    expect(open.getAttribute('data-complete')).toBe('false');
    expect(open.querySelector('.gw-objective-evidence').textContent).toBe('Your build (2 by 2 by 4) has gaps. Fill it in.');
    gap.unmount();
  });
});

describe('an objective met by doing says so', () => {
  const liveText = async () => { await new Promise((r) => setTimeout(r, 60)); return document.getElementById('allo-live-geometryworld').textContent; };
  const put = (eng, x, y, z) => { eng.blocks[x + ',' + y + ',' + z] = { userData: { gridPos: { x, y, z }, shape: 'cube', _measurementLayer: 'student' } }; eng.sessionLog.push({ type: 'block_place', data: { x, y, z } }); };
  const scout = () => live({ name: 'Scale Scout', question: { text: 'How long is B?', choices: ['4 blocks', '6 blocks', '8 blocks'], correct: 0 } });
  const guide = () => live({ name: 'Scale Guide', question: null });
  it('announces the build objective when the last cube goes in, and stays quiet for a solved character', async () => {
    const region = document.createElement('div'); region.id = 'allo-live-geometryworld'; document.body.appendChild(region);
    const eng = fakeEngine([guide(), scout()]);
    window[ENGINE_KEY] = eng;
    const m = mount(Object.assign({}, lesson, { activeLesson: 'scaleUp', totalQ: 4, score: 0, answeredNpcs: {} }));
    expect(await liveText()).toBe('');
    // 15 of 16 cubes: not yet.
    for (let x = 22; x < 26; x++) for (let z = 7; z < 9; z++) for (let y = 1; y < 3; y++) if (!(x === 25 && z === 8 && y === 2)) put(eng, x, y, z);
    m.set({ blocksPlaced: 15 });
    expect(await liveText()).toBe('');
    put(eng, 25, 2, 8);
    m.set({ blocksPlaced: 16 });
    expect(await liveText()).toBe('Objective done: Build prism A doubled from unit cubes on the sand pad. You built prism A doubled: 4 by 2 by 2');
    // A character's objective is announced by its own "Correct", not again here.
    region.textContent = '';
    m.set({ score: 1, answeredNpcs: { 1: true } });
    expect(await liveText()).toBe('');
    // Once is enough: more blocks elsewhere do not repeat it.
    put(eng, 30, 1, 20);
    m.set({ blocksPlaced: 17 });
    expect(await liveText()).toBe('');
    m.unmount();
  });
  it('a lesson opened with the objective already met is the baseline, not news', async () => {
    const region = document.createElement('div'); region.id = 'allo-live-geometryworld'; document.body.appendChild(region);
    const eng = fakeEngine([guide(), scout()]);
    for (let x = 22; x < 26; x++) for (let z = 7; z < 9; z++) for (let y = 1; y < 3; y++) put(eng, x, y, z);
    window[ENGINE_KEY] = eng;
    const m = mount(Object.assign({}, lesson, { activeLesson: 'scaleUp', totalQ: 4, score: 0, answeredNpcs: {} }));
    expect(await liveText()).toBe('');
    // Breaking a cube and putting it back is new again.
    delete eng.blocks['22,1,7']; eng.sessionLog.push({ type: 'block_remove', data: {} });
    m.set({ blocksPlaced: 15 });
    put(eng, 22, 1, 7);
    m.set({ blocksPlaced: 16 });
    expect(await liveText()).toContain('Objective done: Build prism A doubled');
    m.unmount();
  });
  it('dates things with the student own day, not UTC', () => {
    const day = window.StemLab.geometryWorldLessonChecks.localDay;
    expect(day(new Date(2026, 8, 24, 23, 30))).toBe('2026-09-24');
    expect(day(new Date(2026, 0, 5, 0, 5))).toBe('2026-01-05');
    expect(day('not a date')).toBe('');
    // Whatever the test machine's time zone: a date whose UTC day is tomorrow still reads today.
    const evening = new Date(2026, 8, 24, 19, 0);
    evening.toISOString = () => '2026-09-25T02:00:00.000Z';
    expect(day(evening)).toBe('2026-09-24');
    expect(window.StemLab.geometryWorldLessonChecks.localStamp(evening)).toBe('2026-09-24T19-00-00');
  });
});

describe('completion says what is still to try', () => {
  it('lists the objectives nobody did yet, with their evidence', () => {
    const m = mount(Object.assign({}, lesson, { activeLesson: 'fractionBuilder', totalQ: 4, score: 4 }));
    const still = m.q('.gw-completion-dialog .gw-completion-still');
    expect(still.getAttribute('aria-label')).toBe('Still to try');
    const items = [...still.querySelectorAll('li')].map((li) => li.textContent);
    expect(items).toHaveLength(3);
    expect(items[0]).toContain('Place two half-blocks side by side');
    expect(items[0]).toContain('0 of 2 placed');
    expect(still.querySelector('.gw-completion-still-more').textContent).toBe('+ 1 more in Objectives');
    m.unmount();
  });
  it('says nothing when every objective is done', () => {
    const names = ['Quiz Master', 'Builder Bot', 'L-Block Sage'];
    window[ENGINE_KEY] = fakeEngine(names.map((name) => live({ name, dialogue: 'x', position: [0, 1, 0], question: { text: 'q', choices: ['1', '2', '3'], correct: 0 } })));
    const m = mount(Object.assign({}, lesson, { totalQ: 3, score: 3, answeredNpcs: { 0: true, 1: true, 2: true } }));
    expect(m.q('.gw-completion-dialog')).toBeTruthy();
    expect(m.q('.gw-completion-still')).toBeNull();
    m.unmount();
  });
});

describe('phone Talk in a building lesson', () => {
  it('Talk stays in the touch column while the Blocks drawer is open', () => {
    Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' });
    window[ENGINE_KEY] = fakeEngine([live({ name: 'Half Quiz', dialogue: 'x', position: [0, 1, 0], question: { text: 'q', choices: ['1', '2', '3'], correct: 0 } })]);
    const m = mount(Object.assign({}, lesson, { activeLesson: 'fractionBuilder', touchMode: true }));
    const column = [...m.q('[role="group"][aria-label="Touch actions"]').querySelectorAll('button')].map((b) => b.getAttribute('data-gw-touch-action'));
    expect(column).toEqual(['up', 'place', 'break', 'talk', 'more']);
    m.unmount();
  });
});

describe('self-checks after the questions are done', () => {
  it('a student can still mark a self-check objective once the lesson is complete', () => {
    const m = mount(Object.assign({}, lesson, { activeLesson: 'buildChallenge', totalQ: 2, score: 2, objectivesOpen: true }));
    // buildChallenge objective 3, Add a second room, is the student's own check.
    const item = [...m.container.querySelectorAll('.gw-objective-item')][2];
    expect(item.tagName).toBe('BUTTON');
    expect(item.getAttribute('aria-pressed')).toBe('false');
    click(item);
    expect(m.bucket().objectiveChecks.buildChallenge).toEqual({ 2: true });
    expect([...m.container.querySelectorAll('.gw-objective-item')][2].getAttribute('data-complete')).toBe('true');
    m.unmount();
  });
});

describe('small things that stay out of the way', () => {
  const phone = () => Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' });
  it('the swipe-to-look hint goes once the student has looked by swiping', () => {
    phone();
    let m = mount(Object.assign({}, lesson, { touchMode: true }));
    expect(m.q('.gw-touch-mode-hint').textContent).toBe('Swipe on the right to look');
    m.unmount();
    window[ENGINE_KEY] = fakeEngine();
    m = mount(Object.assign({}, lesson, { touchMode: true, touchLookLearned: true }));
    expect(m.q('.gw-touch-mode-hint')).toBeNull();
    m.unmount();
    expect(SOURCE).toContain("if (!engine._touchLookLearned && Math.abs(dx) + Math.abs(dy) > 4) { engine._touchLookLearned = true; upd('touchLookLearned', true); }");
  });
  it('Esc closes the More sheet before anything else', () => {
    phone();
    const m = mount(Object.assign({}, lesson, { touchMode: true, touchMoreOpen: true }));
    expect(window[ENGINE_KEY]._modalState.touchMoreOpen).toBe(true);
    m.unmount();
    const esc = SOURCE.slice(SOURCE.indexOf('// Plain Esc: close the top-priority open dialog/overlay one at a time.'));
    expect(esc.indexOf("if (ms.touchMoreOpen) { upd('touchMoreOpen', false); break; }")).toBeLessThan(esc.indexOf("if (ms.showNpcDialog) {"));
  });
  it('folding and reopening a question is announced', async () => {
    window[ENGINE_KEY] = fakeEngine([live({ name: 'Builder Bot', dialogue: 'x', position: [0, 1, 0], question: { text: 'q', choices: ['1', '2', '3'], correct: 0 } })]);
    const m = mount(Object.assign({}, lesson, { showNpcDialog: true, dialogNpcIdx: 0 }));
    // The host app provides the live region the tool announces through.
    const region = document.createElement('div'); region.id = 'allo-live-geometryworld'; document.body.appendChild(region);
    const announced = () => region.textContent;
    click(m.q('.gw-npc-look'));
    await React.act(async () => { await new Promise((r) => setTimeout(r, 60)); });
    expect(announced()).toBe('Question folded away. Look around, then choose Back to question.');
    click(m.q('.gw-npc-peek-back'));
    await React.act(async () => { await new Promise((r) => setTimeout(r, 60)); });
    expect(announced()).toBe('Question reopened.');
    m.unmount();
  });
});
