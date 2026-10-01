import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, resetStemLab, loadTool, makeCtx } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// The Geometry World <-> Print Lab round trip must survive the student using the
// app's own navigation, not only the two "send" and "revise" buttons. Measured in
// the real shell before this change:
// - Leaving Geometry World destroys its engine. Coming back offered "Continue your
//   workspace", which opened an EMPTY sandbox.
// - Leaving Print Lab and coming back showed a blank model under the old title.
// - Print Lab's "Start in Geometry World" landed on the Home chooser.
// - If the host ignored the tool switch, the fallback STL waited 20 s.

let THREE, builder, makeShape;
const volumes = { cube: 1, halfA: 0.5, halfB: 0.5, quarter: 0.25 };
beforeAll(() => {
  const exports = {};
  new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(exports, { exports });
  THREE = exports; window.THREE = THREE;
  const lab = resetStemLab();
  lab.registerTool('geometryWorld', { aliases: [], render() { return null; } });
  new Function(readFileSync('stem_lab/stem_tool_geometryworld_builder.js', 'utf8'))();
  builder = window.StemLab.geometryWorldBuilderPure;
  const core = readFileSync('stem_lab/stem_tool_geometryworld.js', 'utf8');
  makeShape = new Function(core.slice(core.indexOf('  function createShapeGeometry('), core.indexOf('  // Format fractional volume for display')) + '\nreturn createShapeGeometry;')();
});
afterEach(() => {
  ['__alloGeometryWorldReturnProject', '__alloPrintLabPendingHandoff', '__alloGeometryWorldPendingBuild', '__geoWorldEngine',
    '__alloGeometryWorldLastDraft', '__alloPrintLabGeometrySession', '__alloPrintLabRejectedHandoff'].forEach((key) => { delete window[key]; });
  try { window.localStorage.removeItem(builder.WORLD_SHELF_KEY); } catch (_) {}
  vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});
function stubDownloads() {
  const created = vi.fn(() => 'blob:x');
  vi.stubGlobal('URL', { createObjectURL: created, revokeObjectURL() {} });
  return created;
}

// Mirrors the engine: loadLesson clears blocks and the My Worlds identity, and a
// placement made while events are suppressed is recorded as such.
function engineFor(blocks, lesson = builder.FREE_BUILD_LESSON) {
  const en = { blocks: {}, _undoStack: [], _redoStack: [], camera: new THREE.PerspectiveCamera(), velocity: new THREE.Vector3(), _currentLesson: lesson, placements: [] };
  en.placeBlock = (x, y, z, type = 'stone', shape = 'cube', rotation = 0) => {
    const mesh = new THREE.Mesh(makeShape(shape), new THREE.MeshBasicMaterial());
    mesh.position.set(x + 0.5, y + (shape === 'cube' ? 0.5 : shape === 'halfB' ? 0.25 : 0), z + 0.5);
    mesh.rotation.y = rotation * Math.PI / 2;
    mesh.userData = { blockType: type, shape, rotation, volume: volumes[shape], gridPos: { x, y, z }, _measurementLayer: 'student' };
    mesh.updateMatrixWorld(true); en.blocks[[x, y, z].join(',')] = mesh;
    en.placements.push({ suppressed: !!en._batchSuppressEvents });
  };
  en.loadLesson = (next) => { en.blocks = {}; en._currentLesson = next; en._undoStack = []; en._redoStack = []; en._workshopProjectId = null; en._workshopProjectVersion = null; en._workshopSavedSignature = null; };
  en.measureStructure = (_x, _y, _z, retained) => ({ blocks: retained || [], count: (retained || []).length, isComplete: true });
  blocks.forEach((b) => en.placeBlock(b.x, b.y, b.z, b.type, b.shape, b.rotation));
  en.placements = [];
  return en;
}
function stateCtx(initial) {
  const ctx = { toasts: [], toolData: { geometryWorld: { ...initial } } };
  ctx.updateMulti = (_tool, patch) => { ctx.toolData.geometryWorld = { ...ctx.toolData.geometryWorld, ...patch }; };
  ctx.addToast = (message) => ctx.toasts.push(message);
  return ctx;
}
const HOUSE = [
  { x: 0, y: 1, z: 0, type: 'emerald', shape: 'cube', rotation: 0 },
  { x: 1, y: 1, z: 0, type: 'wool', shape: 'cube', rotation: 0 },
  { x: 0, y: 2, z: 0, type: 'grass', shape: 'halfB', rotation: 0 },
];
const VOLUME_EXPLORER = { title: 'Volume Explorer', ground: { xMin: 0, xMax: 1, zMin: 0, zMax: 1, y: 0, type: 'grass' } };

describe('coming back to Geometry World through the app', () => {
  it('reopens the Print Lab project behind Home instead of an empty sandbox', () => {
    const ctxA = stateCtx({ activeLesson: 'builderSandbox', worldActive: true });
    const before = engineFor(HOUSE);
    before._builderSelection = { blocks: HOUSE.slice(0, 2).map(({ x, y, z }) => ({ x, y, z })) };
    window.__alloGeometryWorldReturnProject = builder.captureProject(ctxA, before, 'gw-sent');

    // The student used "All tools" and reopened Geometry World: a new engine,
    // not in the sandbox, with Home showing "Continue your workspace".
    const after = engineFor([], VOLUME_EXPLORER);
    const ctx = stateCtx({ activeLesson: 'builderSandbox', worldActive: true, showGeometryHome: true, _geometryHomeInitial: false });
    expect(builder.resumeSandboxWorkspace(ctx, after)).toBe(true);
    expect(Object.keys(after.blocks).sort()).toEqual(['0,1,0', '0,2,0', '1,1,0']);
    expect(after.blocks['1,1,0'].userData.blockType).toBe('wool');
    expect(after._builderSelection.blocks).toHaveLength(2);
    // Rebuilt behind Home: the chooser stays open and nothing is announced.
    expect(ctx.toolData.geometryWorld.showGeometryHome).toBe(true);
    expect(ctx.toasts).toEqual([]);
    // Rebuilding is not the student placing blocks (badges, research log).
    expect(after.placements.length).toBe(3);
    expect(after.placements.every((p) => p.suppressed)).toBe(true);
    expect(window.__alloGeometryWorldReturnProject).toBeUndefined();
  });

  it('is what a fresh engine does when it mounts in the sandbox', () => {
    // The mount effect is inside the enhanced render; the behaviour is tested above,
    // this pins that the effect uses it rather than loading an empty sandbox.
    const source = readFileSync('stem_lab/stem_tool_geometryworld_builder.js', 'utf8');
    const effect = source.slice(source.indexOf('if (restorePendingEditableBuild(ctx, engine)) return;'), source.indexOf('attempts += 1;', source.indexOf('if (restorePendingEditableBuild(ctx, engine)) return;')));
    expect(effect).toContain('if (!resumeSandboxWorkspace(ctx, engine)) engine.loadLesson(FREE_BUILD_LESSON);');
    expect(effect).toContain("engine._currentLesson.sandbox !== true");
  });

  it('otherwise reopens the draft that was autosaved on the way out', () => {
    const live = engineFor(HOUSE);
    const uninstall = builder.installWorldAutosave(live, null);
    live.flushWorkshopDraft();
    const id = live._workshopProjectId;
    expect(id).toBeTruthy();
    expect(window.__alloGeometryWorldLastDraft).toEqual({ id });
    uninstall();

    const fresh = engineFor([], VOLUME_EXPLORER);
    expect(builder.resumeSandboxWorkspace(stateCtx({ activeLesson: 'builderSandbox', worldActive: true }), fresh)).toBe(true);
    expect(Object.keys(fresh.blocks).sort()).toEqual(['0,1,0', '0,2,0', '1,1,0']);
    expect(fresh.blocks['0,1,0'].userData.blockType).toBe('emerald');
    expect(fresh.blocks['0,2,0'].userData.blockType).toBe('grass');
    // Autosave keeps writing to the same My Worlds project.
    expect(fresh._workshopProjectId).toBe(id);
    expect(fresh.placements.every((p) => p.suppressed)).toBe(true);
  });

  it('does not resurrect a sent project once the student has moved to another draft', () => {
    const sent = engineFor(HOUSE);
    sent._workshopProjectId = 'world_old';
    window.__alloGeometryWorldReturnProject = builder.captureProject(stateCtx({}), sent, 'gw-stranded');
    // Then a blank sandbox: its draft is empty, so there is nothing to reopen.
    window.__alloGeometryWorldLastDraft = { id: null };
    const fresh = engineFor([], VOLUME_EXPLORER);
    expect(builder.resumeSandboxWorkspace(stateCtx({}), fresh)).toBe(false);
    expect(fresh.blocks).toEqual({});
    // Still the same draft: the full project (undo, selection, camera) wins.
    window.__alloGeometryWorldLastDraft = { id: 'world_old' };
    expect(builder.resumeSandboxWorkspace(stateCtx({}), fresh)).toBe(true);
    expect(Object.keys(fresh.blocks)).toHaveLength(3);
  });

  it('a blank sandbox the student left empty comes back empty', () => {
    const blank = engineFor([]);
    const uninstall = builder.installWorldAutosave(blank, null);
    blank.flushWorkshopDraft();
    uninstall();
    expect(window.__alloGeometryWorldLastDraft).toEqual({ id: null });
    const fresh = engineFor([], VOLUME_EXPLORER);
    expect(builder.resumeSandboxWorkspace(stateCtx({}), fresh)).toBe(false);
    expect(fresh.blocks).toEqual({});
  });

  it('Revise after Continue opens the latest draft, not a copy of the old selection', () => {
    const live = engineFor(HOUSE);
    const uninstall = builder.installWorldAutosave(live, null);
    live.flushWorkshopDraft(); uninstall();
    // The return project was already used by Continue; Print Lab still holds the send.
    window.__alloGeometryWorldPendingBuild = { schema: 'alloflow-geometry-world-build/1', projectId: 'gw-old', draftId: live._workshopProjectId,
      sourceModel: { schema: 'alloflow-geometry-world-build/1', blocks: [{ x: 0, y: 0, z: 0, type: 'stone', shape: 'cube', rotation: 0 }] },
      printContext: { unitMm: 10, aiUse: 'NONE', aiDisclosure: '' } };
    const fresh = engineFor([], VOLUME_EXPLORER);
    const ctx = stateCtx({ showGeometryHome: true });
    expect(builder.restorePendingEditableBuild(ctx, fresh)).toBe(true);
    expect(Object.keys(fresh.blocks).sort()).toEqual(['0,1,0', '0,2,0', '1,1,0']);
    expect(ctx.toolData.geometryWorld).toMatchObject({ showGeometryHome: false, activeLesson: 'builderSandbox', builderPrintContext: { unitMm: 10 } });
    expect(window.__alloGeometryWorldPendingBuild).toBeUndefined();
  });

  it('Print Lab\'s "Start in Geometry World" opens Free Build, not the Home chooser', () => {
    window.__alloGeometryWorldPendingBuild = { schema: 'alloflow-geometry-world-intent/1', intent: 'freeBuild' };
    const fresh = engineFor([], VOLUME_EXPLORER);
    const ctx = stateCtx({ showGeometryHome: true });
    expect(builder.restorePendingEditableBuild(ctx, fresh)).toBe(true);
    expect(fresh._currentLesson.sandbox).toBe(true);
    expect(ctx.toolData.geometryWorld).toMatchObject({ showGeometryHome: false, activeLesson: 'builderSandbox', worldActive: true });
    expect(ctx.toasts.join(' ')).not.toMatch(/invalid/i);
    expect(window.__alloGeometryWorldPendingBuild).toBeUndefined();
  });
});

describe('sending to Print Lab', () => {
  function sendable(title) {
    const en = engineFor(HOUSE);
    en._builderSelection = { blocks: HOUSE.map(({ x, y, z }) => ({ x, y, z })) };
    const uninstall = builder.installWorldAutosave(en, null);
    en.flushWorkshopDraft();
    if (title) builder.saveWorldDraft(en, title);
    uninstall();
    window.__geoWorldEngine = en;
    return en;
  }

  it('carries the My Worlds project and its name', () => {
    const en = sendable('Lighthouse');
    builder.openSelectedBuildInPrintLab({ toolData: { geometryWorld: {} }, setStemLabTool() {}, addToast() {} });
    const handoff = window.__alloPrintLabPendingHandoff;
    expect(handoff.draftId).toBe(en._workshopProjectId);
    expect(handoff.title).toBe('Lighthouse');
    expect(handoff.sourceModel.blocks.map((b) => b.type).sort()).toEqual(['emerald', 'grass', 'wool']);
  });

  it('downloads the STL within about 2 s when the host ignores the tool switch', () => {
    vi.useFakeTimers();
    sendable();
    const created = stubDownloads();
    const toasts = [];
    // The loader's no-op setter: the call succeeds and nothing changes.
    builder.openSelectedBuildInPrintLab({ toolData: { geometryWorld: {} }, setStemLabTool() {}, addToast(m) { toasts.push(m); } });
    vi.advanceTimersByTime(2200);
    expect(created).toHaveBeenCalledTimes(1);
    expect(window.__alloPrintLabPendingHandoff).toBeUndefined();
    expect(toasts.join(' ')).toMatch(/did not open here/);
  });

  it('keeps waiting while Print Lab downloads after a real switch', () => {
    vi.useFakeTimers();
    const en = sendable();
    const created = stubDownloads();
    builder.openSelectedBuildInPrintLab({ toolData: { geometryWorld: {} }, setStemLabTool() { en._destroyed = true; }, addToast() {} });
    vi.advanceTimersByTime(5000);
    expect(created).not.toHaveBeenCalled();
    expect(window.__alloPrintLabPendingHandoff).toBeTruthy();
  });

  it('gives the student the file when Print Lab cannot read the build', () => {
    vi.useFakeTimers();
    const en = sendable();
    const created = stubDownloads();
    const toasts = [];
    builder.openSelectedBuildInPrintLab({ toolData: { geometryWorld: {} }, setStemLabTool() { en._destroyed = true; }, addToast(m) { toasts.push(m); } });
    const handoff = window.__alloPrintLabPendingHandoff;
    // What Print Lab's intake does with a slot it rejects.
    delete window.__alloPrintLabPendingHandoff;
    window.__alloPrintLabRejectedHandoff = { id: handoff.id };
    vi.advanceTimersByTime(700);
    expect(created).toHaveBeenCalledTimes(1);
    expect(toasts.join(' ')).toMatch(/could not read this build/);
  });

  it('can be found by searching the Tool Finder', () => {
    expect(builder.findWorkshopTools('print lab', false)[0]).toMatchObject({ id: 'send', available: true });
    expect(builder.findWorkshopTools('send', false).map((t) => t.id)).toContain('send');
  });
});

describe('Print Lab keeps the Geometry World build for the page session', () => {
  function stl() {
    const en = engineFor(HOUSE);
    return builder.buildGeometryWorldStl(en, HOUSE.map(({ x, y, z }) => ({ x, y, z })));
  }
  function handoffFor(bundle, extra = {}) {
    return { schema: 'alloflow-print-source/1', id: 'gw-1', projectId: 'gw-1', draftId: 'world_a', sourceTool: 'geometryWorld', format: 'STL',
      bytes: new Uint8Array(bundle.buffer), title: 'Geometry World build - 3 blocks', unitMm: 5, sourceModel: bundle.sourceModel, ...extra };
  }
  function mount(printLabData) {
    resetStemLab();
    window.StemLab.geometryWorldBuilderPure = builder;
    const cfg = loadTool('stem_lab/stem_tool_printlab.js', 'printLab');
    const host = document.createElement('div'); document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    let toolData = { printLab: { ...printLabData } };
    const ctx = makeCtx({ toolData });
    ctx.setToolData = (fn) => { toolData = typeof fn === 'function' ? fn(toolData) : fn; ctx.toolData = toolData; };
    act(() => root.render(React.createElement(function Host() { return cfg.render(ctx); })));
    return { host, ctx, unmount() { act(() => root.unmount()); host.remove(); } };
  }

  it('reopening Print Lab finds the same build, scale and stage', () => {
    const bundle = stl();
    window.__alloPrintLabPendingHandoff = handoffFor(bundle);
    const first = mount({});
    expect(first.host.textContent).toContain('From Geometry World');
    expect(window.__alloPrintLabGeometrySession).toBeTruthy();
    const saved = { ...first.ctx.toolData.printLab, unitMm: 10, printStage: 'Preflight', title: 'My tower' };
    first.unmount();

    const again = mount(saved);
    expect(again.host.textContent).toContain('still open here');
    expect(again.host.querySelector('#print-lab-tab-preflight').getAttribute('aria-selected')).toBe('true');
    act(() => again.host.querySelector('#print-lab-tab-design').dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
    expect(again.host.textContent).toContain('From Geometry World');
    // 2 x 1 x 1.5 blocks (a half slab on top) at the 10 mm the student chose.
    expect(again.host.textContent).toContain('20 × 10 × 15 mm');
    expect(again.host.textContent).toContain('Exact STL mesh envelope at 10 mm per Geometry World block');
    expect(again.host.innerHTML).not.toContain('Add or import geometry to preview it');
    again.unmount();
  });

  it('says plainly when the build closed with the page, and resets to a fresh design', () => {
    const view = mount({ gwProjectId: 'gw-gone', unitMm: 5, printStage: 'Submit', title: 'Geometry World build - 3 blocks' });
    expect(view.host.textContent).toContain('closed with the page');
    expect(view.host.textContent).not.toContain('From Geometry World');
    expect(view.ctx.toolData.printLab).toMatchObject({ gwProjectId: '', printStage: 'Design', unitMm: 20 });
    view.unmount();
  });

  it('keeps the title typed for this project when it is sent again, and drops a note about another', () => {
    const bundle = stl();
    window.__alloPrintLabPendingHandoff = handoffFor(bundle, { id: 'gw-2', projectId: 'gw-2' });
    const same = mount({ gwDraftId: 'world_a', title: 'My tower', studentNote: 'Print the roof first' });
    expect(same.ctx.toolData.printLab).toMatchObject({ title: 'My tower', studentNote: 'Print the roof first', gwProjectId: 'gw-2', gwDraftId: 'world_a' });
    same.unmount();

    window.__alloPrintLabPendingHandoff = handoffFor(bundle, { id: 'gw-3', projectId: 'gw-3', draftId: 'world_b', title: 'Bridge' });
    const other = mount({ gwDraftId: 'world_a', title: 'My tower', studentNote: 'Print the roof first' });
    expect(other.ctx.toolData.printLab).toMatchObject({ title: 'Bridge', studentNote: '', gwDraftId: 'world_b' });
    other.unmount();
  });

  it('flags a build it cannot read so Geometry World can fall back to a file', () => {
    window.__alloPrintLabPendingHandoff = { schema: 'alloflow-print-source/1', id: 'gw-bad', sourceTool: 'geometryWorld', format: 'STL', bytes: new Uint8Array(12) };
    const view = mount({});
    expect(window.__alloPrintLabRejectedHandoff).toEqual({ id: 'gw-bad' });
    expect(view.host.textContent).toContain('could not be opened here');
    view.unmount();
  });
});
