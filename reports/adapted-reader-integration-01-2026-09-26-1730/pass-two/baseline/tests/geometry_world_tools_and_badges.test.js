// Geometry World: measuring tools by pointer and touch, and badges a builder can earn
// (2026-09-24).
//
// The ruler (T), angle (V) and net (N) tools lived inside the keydown switch, so a
// touch or mouse-only student could never use them. They are engine actions now,
// with buttons in the action bar and a Tools toggle in the touch column.
// Badges were only checked after a measurement or an answer, and the 3D Printer
// badge read an event only the old core STL button logged; Free Build's download and
// Send to Print Lab never earned it.

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, makeCtx, resetStemLab, loadTool } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_geometryworld.js';
const SOURCE = readFileSync(FILE, 'utf8');
const ENGINE_KEY = '__geoWorldEngine';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function makeThreeStub() {
  function vec() {
    const v = { x: 0, y: 0, z: 0, w: 0 };
    ['set', 'copy', 'add', 'sub', 'subVectors', 'normalize', 'multiplyScalar', 'applyQuaternion', 'setFromQuaternion', 'crossVectors', 'cross', 'lerp', 'addScaledVector', 'setY', 'round', 'floor', 'setScalar', 'applyEuler', 'fromArray', 'lookAt'].forEach((m) => { v[m] = () => v; });
    v.clone = () => vec(); v.distanceTo = () => 99; v.length = () => 1; v.lengthSq = () => 1; v.dot = () => 0; v.toArray = () => [0, 0, 0];
    return v;
  }
  return new Proxy({}, { get: (_t, prop) => (prop === 'SRGBColorSpace' ? 'srgb' : typeof prop === 'symbol' ? undefined : function () { return vec(); }) });
}
function fakeEngine() {
  const canvas = document.createElement('canvas');
  const v = () => ({ x: 0, y: 0, z: 0, distanceTo: () => 99, set() {}, clone() { return v(); }, toArray: () => [0, 0, 0], copy() { return this; }, sub() { return this; }, normalize() { return this; }, lengthSq: () => 1, length: () => 1 });
  return { clearWorld() {}, scene: { remove() {}, add() {}, children: [], background: { setRGB() {} }, fog: { color: { setRGB() {} } } }, renderer: { dispose() {}, domElement: canvas },
    camera: { position: v(), quaternion: { x: 0, y: 0, z: 0, w: 1, toArray: () => [0, 0, 0, 1] }, rotation: { x: 0, y: 0, z: 0 }, getWorldDirection: (o) => o || v(), updateProjectionMatrix() {}, lookAt() {}, up: v() },
    blocks: {}, npcs: [], _particles: [], _dimLines: [], _selectionGlows: [], _layerGhosts: [], moveState: {}, lookState: {}, euler: { x: 0, y: 0, z: 0, setFromQuaternion() {} },
    isLocked: false, isInputActive: () => false, blockUnderCrosshair: () => null, loadLesson() {}, placeBlock() {}, removeBlock() {}, releaseInput() {}, getBlocksArr: () => [],
    clock: { getElapsedTime: () => 0, getDelta: () => 0.016 }, logEvent() {}, sessionLog: [], geometryHomeLessons: [],
    useRuler: vi.fn(), useAngleTool: vi.fn(), useNetTool: vi.fn() };
}
let cfg;
beforeAll(() => { resetStemLab(); window.THREE = makeThreeStub(); cfg = loadTool(FILE, 'geometryWorld'); }, 120000);
beforeEach(() => { window.THREE = makeThreeStub(); localStorage.clear(); });
afterEach(() => { delete window[ENGINE_KEY]; document.body.innerHTML = ''; });

function mount(bucket) {
  const container = document.createElement('div'); document.body.appendChild(container);
  const toolData = { _threeLoaded: true, geometryWorld: Object.assign({}, bucket) };
  let bump = null;
  const ctx = makeCtx({ toolData, update: (b, k, val) => { toolData[b] = Object.assign({}, toolData[b], { [k]: val }); if (bump) bump(); }, updateMulti: (b, patch) => { toolData[b] = Object.assign({}, toolData[b], patch); if (bump) bump(); } });
  const Comp = () => { const st = React.useState(0); bump = () => st[1]((n) => n + 1); return cfg.render(ctx); };
  const root = ReactDOMClient.createRoot(container);
  React.act(() => { root.render(React.createElement(Comp)); });
  React.act(() => bump());
  return { container, unmount: () => { React.act(() => root.unmount()); container.remove(); } };
}
const base = { worldActive: true, activeLesson: 'volumeExplorer', _introShownOnce: true, tutorialDismissed: true, showLessonIntro: false, touchMode: false };

describe('measuring tools reach pointer users', () => {
  it('the action bar offers Ruler, Angle and Net, each calling the same engine action as its key', () => {
    const eng = fakeEngine(); window[ENGINE_KEY] = eng;
    const m = mount(base);
    const btn = (id) => m.container.querySelector('.gw-action-bar [data-gw-utility="' + id + '"]');
    expect(btn('ruler').getAttribute('aria-keyshortcuts')).toBe('T');
    expect(btn('angle').getAttribute('aria-keyshortcuts')).toBe('V');
    expect(btn('net').getAttribute('aria-keyshortcuts')).toBe('N');
    React.act(() => btn('ruler').click());
    React.act(() => btn('angle').click());
    React.act(() => btn('net').click());
    expect(eng.useRuler).toHaveBeenCalledTimes(1);
    expect(eng.useAngleTool).toHaveBeenCalledTimes(1);
    expect(eng.useNetTool).toHaveBeenCalledTimes(1);
    m.unmount();
  });
  it('the keys call those actions, and the actions hold what the keys used to do', () => {
    ["case 'KeyT': // Point-to-point ruler: set point A, then point B\n              engine.useRuler();\n              break;",
     "case 'KeyV': // 3-point angle tool: click 3 blocks (A, vertex B, C), get the angle at B\n              engine.useAngleTool();\n              break;",
     "case 'KeyN': // Net unfolding for prisms; exposed-face analysis for composite structures\n              engine.useNetTool();\n              break;"].forEach((c) => expect(SOURCE).toContain(c));
    const body = (name) => SOURCE.slice(SOURCE.indexOf('engine.' + name + ' = function() {'), SOURCE.indexOf('        };\n', SOURCE.indexOf('engine.' + name + ' = function() {')));
    expect(body('useRuler')).toContain('engine._rulerA');
    expect(body('useAngleTool')).toContain("engine.logEvent('angle_measure'");
    expect(body('useNetTool')).toContain("engine.performMeasurement('surface')");
    expect(body('useNetTool')).not.toMatch(/\bbreak;/);
  });
  it('touch: the More sheet holds the ruler, angle and net (2026-09-24)', () => {
    const start = SOURCE.indexOf("d.touchMoreOpen && el('div', { id: 'gw-touch-more'");
    expect(start).toBeGreaterThan(-1);
    const more = SOURCE.slice(start, SOURCE.indexOf("touchActionButton('hide', 'hide', 'Hide'", start));
    expect(more).toContain('MEASURING_TOOLS.map(function(tool) { return touchActionButton(tool.id, tool.id, tool.label, tool.title, fromMore(');
    expect(more).toContain('live[tool.action]()');
    expect(SOURCE).toContain("'aria-expanded': d.touchMoreOpen ? 'true' : 'false', 'aria-controls': 'gw-touch-more'");
  });
});

describe('badges a builder can earn', () => {
  it('placement checks Builder and Master Builder while either is unearned', () => {
    expect(SOURCE).toContain("if (engine._runAchievementCheck && ((engine.blocksPlaced >= 10 && !heldBadges.builder_10) || (engine.blocksPlaced >= 100 && !heldBadges.builder_100))) setTimeout(engine._runAchievementCheck, 100);");
  });
  it('the render hands its achievement check to the engine', () => {
    const eng = fakeEngine(); window[ENGINE_KEY] = eng;
    const m = mount(base);
    expect(typeof eng._runAchievementCheck).toBe('function');
    m.unmount();
  });
  it('3D Printer is earned by an STL export or a Print Lab hand-off', () => {
    const row = SOURCE.slice(SOURCE.indexOf("{ id: 'printer_3d'"), SOURCE.indexOf('\n', SOURCE.indexOf("{ id: 'printer_3d'")));
    const check = new Function('return ' + /check: (function\(log\) \{.*\}) \},/.exec(row)[1])();
    expect(check([{ type: 'print_lab_handoff' }])).toBe(true);
    expect(check([{ type: 'stl_export' }])).toBe(true);
    expect(check([{ type: 'block_place' }])).toBe(false);
  });
});

describe('Free Build logs its exports for the badge', () => {
  let builder, realThree;
  beforeAll(() => {
    const lab = resetStemLab();
    lab.registerTool('geometryWorld', { aliases: [], render() { return null; } });
    const exports = {};
    new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(exports, { exports });
    window.THREE = realThree = exports;
    new Function(readFileSync('stem_lab/stem_tool_geometryworld_builder.js', 'utf8'))();
    builder = window.StemLab.geometryWorldBuilderPure;
  });
  it('the STL download logs stl_export and runs the badge check', () => {
    // The file-level beforeEach swaps in a stub; this test needs real geometry.
    const THREE = realThree; window.THREE = realThree;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    mesh.position.set(0.5, 1.5, 0.5); mesh.updateMatrixWorld(true);
    mesh.userData = { blockType: 'wood', gridPos: { x: 0, y: 1, z: 0 }, shape: 'cube', rotation: 0, volume: 1, _measurementLayer: 'student' };
    const events = [], check = vi.fn();
    window[ENGINE_KEY] = { blocks: { '0,1,0': mesh }, _builderSelection: { blocks: [{ x: 0, y: 1, z: 0 }], exact: true }, _currentLesson: { sandbox: true },
      measureStructure: (_x, _y, _z, r) => ({ blocks: r.slice(), count: r.length, isComplete: true }), logEvent: (type, data) => events.push({ type, data }), _runAchievementCheck: check };
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:x', revokeObjectURL() {} });
    try {
      expect(builder.selectedBuildStlDownload({ toolData: { geometryWorld: {} }, addToast() {} })).toBe(true);
    } finally { vi.unstubAllGlobals(); }
    expect(events.map((e) => e.type)).toContain('stl_export');
    expect(events.find((e) => e.type === 'stl_export').data).toMatchObject({ blocks: 1, source: 'free_build' });
    expect(check).toHaveBeenCalledTimes(1);
  });
});
