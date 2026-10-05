import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const CORE = 'stem_lab/stem_tool_geometryworld.js';
const BUILDER = 'stem_lab/stem_tool_geometryworld_builder.js';
const ENGINE_KEY = '__geoWorldEngine';
const schema = 'alloflow-geometry-world/2';
const lesson = () => ({ title: 'Area investigation', npcs: [], structures: [] });
const block = (x, shape = 'cube', rotation = 0, type = 'stone') => ({ x, y: 1, z: 0, type, shape, rotation });
let core, cfg, builder, transitions, THREE, mounted, disposers = [];
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function vector(x = 0, y = 0, z = 0) {
  return { x, y, z, set(a, b, c) { this.x = a; this.y = b; this.z = c; return this; },
    toArray() { return [this.x, this.y, this.z]; }, clone() { return vector(this.x, this.y, this.z); },
    copy(value) { this.x = value.x; this.y = value.y; this.z = value.z; return this; },
    distanceTo: () => 99, sub() { return this; }, normalize() { return this; }, lengthSq: () => 1, length: () => 1 };
}

function memoryStorage(initial) {
  let raw = initial;
  return { getItem: vi.fn(() => raw ?? null), setItem: vi.fn((_key, value) => { raw = value; }),
    raw: () => raw, replace(value) { raw = value; } };
}

function put(engine, record) {
  const value = { ...record };
  engine.blocks[[value.x, value.y, value.z].join(',')] = { userData: { gridPos: { x: value.x, y: value.y, z: value.z },
    blockType: value.type, shape: value.shape, rotation: value.rotation, _measurementLayer: 'student' } };
  return engine;
}

function makeEngine(records = [block(0, 'halfA', 3), block(7, 'quarter', 1, 'wood')]) {
  const engine = {
    _currentLesson: { title: 'My bridge', sandbox: true, builderGarden: false }, _worldActive: true,
    blocks: {}, npcs: [], _particles: [], _dimLines: [], _selectionGlows: [], _layerGhosts: [],
    _undoStack: [{ added: records.map(value => ({ ...value })) }], _redoStack: [{ removed: [block(-3)] }],
    _builderSelection: { exact: true, blocks: records.map(({ x, y, z }) => ({ x, y, z })) },
    _buildBatchPreview: { owner: 'starter', recipe: 'arch' }, _predictionState: { commitment: 12, history: [6] },
    _viewPreset: 'side', _viewPresetReturn: { name: 'free' }, _activityWaypoint: { id: 'layers' },
    _previewReviewCamera: { dispose: vi.fn() }, _modalState: {}, blocksPlaced: records.length,
    moveState: {}, lookState: {}, isLocked: false, isInputActive: () => false, blockUnderCrosshair: () => null,
    camera: { position: vector(9, 7, 4), quaternion: { x: 0, y: 0, z: 0, w: 1, toArray: () => [0, 0, 0, 1] },
      rotation: { x: 0, y: 0, z: 0 }, up: vector(0, 1, 0), lookAt: vi.fn(), updateMatrixWorld: vi.fn(),
      updateProjectionMatrix() {}, getWorldDirection: value => value || vector() },
    scene: { children: [], remove: vi.fn(), add: vi.fn(), background: { setRGB() {} }, fog: { color: { setRGB() {} } } },
    renderer: { dispose: vi.fn(), domElement: document.createElement('canvas') },
    euler: { x: 0, y: 0, z: 0, setFromQuaternion: vi.fn() }, velocity: vector(),
    clock: { getElapsedTime: () => 0, getDelta: () => 0.016 }, sessionLog: [], geometryHomeLessons: [],
    endShowcase: vi.fn(), cancelDrawing: vi.fn(), clearBuildBatchPreview: vi.fn(), clearLayerFocus: vi.fn(),
    releaseInput: vi.fn(), refreshAllAO: vi.fn(), fillBlocks: vi.fn(), createNPC: vi.fn(),
    placeBlock(x, y, z, type, shape, rotation) { put(engine, { x, y, z, type, shape, rotation }); return true; },
    loadLesson() {}, removeBlock() {}, getBlocksArr() { return Object.values(engine.blocks); }
  };
  engine.clearWorld = vi.fn(() => { engine.blocks = {}; engine.npcs = []; });
  engine.logEvent = vi.fn((type, data) => engine.sessionLog.push({ type, data }));
  records.forEach(value => put(engine, value));
  return engine;
}

function installLoader(engine, update = vi.fn(), progress = null, productionBoundary = false) {
  const start = core.indexOf(productionBoundary ? '        // Protect live builds before any world replacement.'
    : '        engine.loadLesson = function(lesson) {');
  const end = core.indexOf('        // Measure all face-connected blocks', start);
  expect(start).toBeGreaterThan(0); expect(end).toBeGreaterThan(start);
  const dependencies = { engine, upd: update, d: { envPreset: 'day' }, setViewPreset: vi.fn(), setLayerFocus: vi.fn(),
    applyEnvPreset: vi.fn(), updateEnvTransition: vi.fn(), addToast: vi.fn(), MAX_BLOCKS: 1500,
    geometryProgressKey: value => value.title, geometryResumableProgress: () => progress,
    geometryStorage: () => localStorage, gwChatKey: value => value.title,
    geometryInstallWorldTransitionGuard: transitions.install, engineKey: ENGINE_KEY, worldTransitionConfirmRef: { current: null },
    focusWorldSurface() { document.getElementById('geoworld-fs-wrap')?.focus(); } };
  new Function(...Object.keys(dependencies), core.slice(start, end))(...Object.values(dependencies));
  return engine;
}

function protect(engine, store, hooks = {}) {
  const blocked = vi.fn(), cleared = vi.fn();
  transitions.install(engine, { blocked, cleared, isCurrent: () => true, ...hooks });
  if (store) disposers.push(builder.installWorldAutosave(engine, vi.fn(), store));
  installLoader(engine);
  return { engine, blocked, cleared };
}

function snapshot(engine) {
  return { lesson: engine._currentLesson, blocks: Object.entries(engine.blocks).map(([key, mesh]) => ({ key, mesh,
    data: structuredClone(mesh.userData) })), project: [engine._workshopProjectId, engine._workshopProjectVersion,
    engine._workshopSavedSignature], selection: structuredClone(engine._builderSelection),
    undo: structuredClone(engine._undoStack), redo: structuredClone(engine._redoStack),
    camera: engine.camera.position.toArray(), previewCamera: engine._previewReviewCamera, preview: engine._buildBatchPreview,
    prediction: structuredClone(engine._predictionState), view: engine._viewPreset, returnView: engine._viewPresetReturn,
    waypoint: engine._activityWaypoint, blocksPlaced: engine.blocksPlaced, events: structuredClone(engine.sessionLog) };
}

function expectPreserved(engine, before) {
  expect(snapshot(engine)).toEqual(before);
  for (const name of ['clearWorld', 'endShowcase', 'cancelDrawing', 'clearBuildBatchPreview', 'clearLayerFocus'])
    expect(engine[name]).not.toHaveBeenCalled();
  expect(engine._previewReviewCamera.dispose).not.toHaveBeenCalled();
  expect(engine.logEvent).not.toHaveBeenCalled();
}

function savedProject(id, records, savedAt = 1) {
  return { id, version: 'v1', savedAt, garden: false,
    world: { schema, title: id, coordinateSystem: 'x-right,y-up,z-depth', blocks: records } };
}
const shelf = projects => JSON.stringify({ schema: 'alloflow-geometry-projects/1', projects });

function mountWorkspace(store = memoryStorage('{broken'), overrides = {}, threeLoaded = true) {
  const engine = makeEngine(); engine._builderSelection = null; engine._buildBatchPreview = null;
  window[ENGINE_KEY] = engine;
  const container = document.createElement('div'); document.body.appendChild(container);
  const toolData = { _threeLoaded: threeLoaded, geometryWorld: Object.assign({
    activeLesson: 'builderSandbox', worldActive: true, _introShownOnce: true, tutorialDismissed: true,
    showGeometryHome: true, _geometryHomeInitial: false, geometryHomePage: 'start', geometryHomeLesson: 'areaSurface',
    showLessonIntro: false, hudPreset: 'builder', hudPanel: '', score: 1, totalQ: 3,
    answeredNpcs: { 0: true }, npcAnswerDrafts: { 1: { step: 0, text: 'kept draft' } },
    measureHistory: [{ id: 'kept-measurement' }], reflectionText: 'I tested two layers.',
    volumeEstimateCommitment: { value: 12 }, sandboxDockCollapsed: true
  }, overrides) };
  let bump; const awardXP = vi.fn(), addToast = vi.fn();
  const context = makeCtx({ toolData, awardXP, addToast,
    update(section, key, value) { toolData[section] = Object.assign({}, toolData[section], { [key]: value }); if (bump) bump(); },
    updateMulti(section, patch) { toolData[section] = Object.assign({}, toolData[section], patch); if (bump) bump(); } });
  function Host() { const state = React.useState(0); bump = () => state[1](value => value + 1); return cfg.render(context); }
  const root = ReactDOMClient.createRoot(container);
  React.act(() => root.render(React.createElement(Host)));
  React.act(() => bump());
  const update = (key, value) => typeof key === 'object' ? context.updateMulti('geometryWorld', key) : context.update('geometryWorld', key, value);
  installLoader(engine, update, null, true);
  disposers.push(builder.installWorldAutosave(engine, vi.fn(), store));
  mounted = { container, root, engine, store, awardXP, addToast, context, bucket: () => toolData.geometryWorld,
    patch(value) { React.act(() => context.updateMulti('geometryWorld', value)); },
    setThreeLoaded(value) { React.act(() => { toolData._threeLoaded = value; bump(); }); } };
  return mounted;
}

function click(node) { expect(node).toBeTruthy(); React.act(() => node.click()); }
function recovery(view) { return view.container.querySelector('[data-gw-save-recovery] [role="alertdialog"]'); }
function recoveryButton(view, label) {
  return [...(recovery(view)?.querySelectorAll('button') || [])].find(node => node.textContent.trim() === label);
}
function learningState(view) {
  const value = view.bucket();
  return structuredClone(Object.fromEntries(['activeLesson', 'worldActive', 'showGeometryHome', 'showLessonIntro',
    'hudPreset', 'hudPanel', 'score', 'totalQ', 'answeredNpcs', 'npcAnswerDrafts', 'measureHistory',
    'reflectionText', 'volumeEstimateCommitment', 'objectiveChecks', 'npcWrongCount', 'npcLastWrong',
    'consecutiveWrong'].map(key => [key, value[key]])));
}

function expectRecoveryVisible(view) {
  const panel = recovery(view); expect(panel).toBeTruthy();
  for (let node = panel; node && node !== view.container; node = node.parentElement) {
    expect(node.hidden).toBe(false); expect(node.style.visibility).not.toBe('hidden');
    expect(node.style.display).not.toBe('none'); expect(node.hasAttribute('inert')).toBe(false);
  }
}

function peerRow(view) {
  const library = view.container.querySelector('[aria-label="Class world library"]');
  expect(library).toBeTruthy();
  return [...library.querySelectorAll('div')].find(node => node.style.cursor === 'pointer' && node.textContent.includes('Peer bridge'));
}

beforeAll(() => {
  const exports = {}; new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(exports, { exports });
  THREE = exports; core = readFileSync(CORE, 'utf8'); resetStemLab(); window.THREE = THREE;
  cfg = loadTool(CORE, 'geometryWorld'); transitions = window.StemLab.geometryWorldTransitions;
  new Function(readFileSync(BUILDER, 'utf8'))();
  builder = window.StemLab.geometryWorldBuilderPure; cfg = window.StemLab._registry.geometryWorld;
  expect(transitions?.install).toBeTypeOf('function');
}, 120000);

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); window.THREE = THREE; });
afterEach(() => {
  if (mounted) { React.act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; }
  disposers.forEach(dispose => dispose()); disposers = [];
  vi.restoreAllMocks(); vi.unstubAllGlobals(); delete window[ENGINE_KEY]; delete window[ENGINE_KEY + '_failed'];
  delete window.__alloGeometryWorldPendingBuild; delete window.__alloGeometryWorldReturnProject;
  delete window.__alloGeometryWorldLastDraft; delete window.__alloGeometryWorldHomePresented;
  document.body.innerHTML = '';
});

describe('real lesson replacement honors the installed autosave result', () => {
  it('preserves exact live geometry and workspace state after a browser quota failure', () => {
    const engine = makeEngine(), store = memoryStorage();
    expect(builder.saveWorldDraft(engine, 'Bridge', store).ok).toBe(true);
    put(engine, block(10, 'halfB', 2, 'glass'));
    const durable = store.raw(), before = snapshot(engine);
    store.setItem.mockImplementation(() => { throw Error('quota'); });
    const guard = protect(engine, store);
    expect(engine.loadLesson(lesson())).toBe(false); expectPreserved(engine, before);
    expect(store.raw()).toBe(durable); expect(guard.blocked).toHaveBeenCalledTimes(1);
    expect(engine._pendingWorldTransition.reason).toMatch(/write|autosave/i);
    expect(engine._pendingWorldTransition.target.title).toBe('Area investigation');
  });

  it.each([
    ['malformed shelf', '{broken', /read|JSON/i],
    ['oversized shelf', ' '.repeat(1536 * 1024 + 1), /safe limit/i],
    ['invalid saved geometry', shelf([savedProject('invalid', [block(70)])]), /range|schema/i]
  ])('refuses %s without repairing storage or changing the live world', (_name, raw, reason) => {
    const engine = makeEngine(), store = memoryStorage(raw), before = snapshot(engine);
    protect(engine, store); expect(engine.loadLesson(lesson())).toBe(false);
    expectPreserved(engine, before); expect(store.raw()).toBe(raw); expect(store.setItem).not.toHaveBeenCalled();
    expect(engine._pendingWorldTransition.reason).toMatch(reason);
  });

  it('turns unavailable shelf reads into a controlled rejection', () => {
    const engine = makeEngine(), before = snapshot(engine), store = memoryStorage();
    store.getItem.mockImplementation(() => { throw Error('Storage unavailable'); });
    protect(engine, store); expect(() => engine.loadLesson(lesson())).not.toThrow();
    expectPreserved(engine, before); expect(engine._pendingWorldTransition.reason).toMatch(/unavailable/i);
  });

  it('refuses a full eight-project shelf, then retries after explicit removal of another project', () => {
    const store = memoryStorage(shelf(Array.from({ length: 8 }, (_, index) => savedProject('project_' + index, [block(index)], index + 1))));
    const engine = makeEngine(), before = snapshot(engine), durable = store.raw(); protect(engine, store);
    expect(engine.loadLesson(lesson())).toBe(false); expectPreserved(engine, before);
    expect(store.raw()).toBe(durable); expect(engine._pendingWorldTransition.reason).toContain('8 projects');
    expect(builder.removeWorldProject('project_7', store).ok).toBe(true);
    expect(engine.retryWorldTransition()).toBe(true); expect(engine.clearWorld).toHaveBeenCalledTimes(1);
    expect(builder.readWorldShelf(store).projects).toHaveLength(8);
  });

  it('rejects shelf-wide block overflow without dropping earlier projects', () => {
    const records = Array.from({ length: 1251 }, (_, index) => ({ ...block(index % 50), z: Math.floor(index / 50) }));
    const raw = shelf(Array.from({ length: 8 }, (_, index) => savedProject('project_' + index, records, index)));
    const engine = makeEngine(), store = memoryStorage(raw), before = snapshot(engine); protect(engine, store);
    expect(engine.loadLesson(lesson())).toBe(false); expectPreserved(engine, before);
    expect(store.raw()).toBe(raw); expect(engine._pendingWorldTransition.reason).toMatch(/too many blocks/i);
  });

  it('does not overwrite newer stored geometry when a stale tab starts a lesson', () => {
    const store = memoryStorage(), newer = makeEngine(), stale = makeEngine();
    expect(builder.saveWorldDraft(newer, 'Shared bridge', store).ok).toBe(true);
    stale._workshopProjectId = newer._workshopProjectId; stale._workshopProjectVersion = newer._workshopProjectVersion;
    stale._workshopSavedSignature = newer._workshopSavedSignature;
    put(newer, block(11, 'cube', 0, 'gold')); expect(builder.saveWorldDraft(newer, null, store).ok).toBe(true);
    put(stale, block(-11, 'quarter', 2, 'glass')); const durable = store.raw(), before = snapshot(stale);
    protect(stale, store); expect(stale.loadLesson(lesson())).toBe(false); expectPreserved(stale, before);
    expect(store.raw()).toBe(durable); expect(stale._pendingWorldTransition.reason).toContain('another tab');
    expect(builder.editableWorld(stale).blocks).toContainEqual(block(-11, 'quarter', 2, 'glass'));
    expect(builder.editableWorld(stale).blocks).not.toContainEqual(block(11, 'cube', 0, 'gold'));
  });

  it('checks ownership before the unchanged-signature shortcut', () => {
    const engine = makeEngine(), store = memoryStorage(); builder.saveWorldDraft(engine, 'Shared bridge', store);
    const stored = JSON.parse(store.raw()); stored.projects[0].version = 'newer-tab-version'; store.replace(JSON.stringify(stored));
    const before = snapshot(engine), durable = store.raw(); protect(engine, store);
    expect(engine.loadLesson(lesson())).toBe(false); expectPreserved(engine, before); expect(store.raw()).toBe(durable);
  });

  it('does not recreate a deleted identity and permits an intentional new variation before retry', () => {
    const engine = makeEngine(), store = memoryStorage(); builder.saveWorldDraft(engine, 'Removed bridge', store);
    const oldId = engine._workshopProjectId; store.replace(shelf([savedProject('other', [block(2)])]));
    const before = snapshot(engine); protect(engine, store);
    expect(engine.loadLesson(lesson())).toBe(false); expectPreserved(engine, before);
    expect(builder.readWorldShelf(store).projects.map(project => project.id)).toEqual(['other']);
    expect(builder.saveWorldCopy(engine, 'Kept bridge', store).ok).toBe(true);
    expect(engine._workshopProjectId).not.toBe(oldId); expect(engine.retryWorldTransition()).toBe(true);
    expect(builder.readWorldShelf(store).projects).toHaveLength(2);
    expect(builder.readWorldShelf(store).projects.some(project => project.id === oldId)).toBe(false);
  });

  it('preserves live blocks that cannot fit the editable sandbox coordinate range', () => {
    const engine = makeEngine([block(70)]), store = memoryStorage(), before = snapshot(engine); protect(engine, store);
    expect(engine.loadLesson(lesson())).toBe(false); expectPreserved(engine, before);
    expect(engine._pendingWorldTransition.reason).toMatch(/coordinate range|schema/i); expect(store.raw()).toBeUndefined();
  });

  it.each([
    ['missing grid position', data => { delete data.gridPos; }],
    ['non-finite coordinate', data => { data.gridPos.x = NaN; }],
    ['string coordinate', data => { data.gridPos.x = '0'; }],
    ['fractional coordinate', data => { data.gridPos.x = 0.25; }],
    ['missing material', data => { delete data.blockType; }],
    ['unknown material', data => { data.blockType = 'unrecognized'; }],
    ['missing shape', data => { delete data.shape; }],
    ['unknown shape', data => { data.shape = 'unrecognized'; }],
    ['missing rotation', data => { delete data.rotation; }],
    ['fractional rotation', data => { data.rotation = 1.5; }],
    ['out-of-range rotation', data => { data.rotation = 5; }],
    ['BigInt coordinate', data => { data.gridPos.x = 1n; }],
    ['circular coordinate', data => { data.gridPos.x = data.gridPos; }]
  ])('does not sanitize away %s to authorize a destructive replacement', (_name, corrupt) => {
    const engine = makeEngine(), store = memoryStorage(); builder.saveWorldDraft(engine, 'Earlier valid bridge', store);
    corrupt(engine.blocks['0,1,0'].userData); const before = snapshot(engine), durable = store.raw(); protect(engine, store);
    expect(() => engine.loadLesson(lesson())).not.toThrow(); expectPreserved(engine, before);
    expect(engine._pendingWorldTransition).toBeTruthy(); expect(store.raw()).toBe(durable);
  });

  it('preserves geometry after a metadata getter throws during autosave validation', () => {
    const engine = makeEngine(), store = memoryStorage(); builder.saveWorldDraft(engine, 'Earlier valid bridge', store);
    const durable = store.raw(), currentLesson = engine._currentLesson, mesh = engine.blocks['0,1,0'];
    Object.defineProperty(mesh.userData, 'shape', { configurable: true, get() { throw Error('Shape metadata unavailable'); } });
    protect(engine, store); expect(() => engine.loadLesson(lesson())).not.toThrow();
    expect(engine.clearWorld).not.toHaveBeenCalled(); expect(engine.blocks['0,1,0']).toBe(mesh);
    expect(engine._currentLesson).toBe(currentLesson); expect(engine._previewReviewCamera.dispose).not.toHaveBeenCalled();
    expect(engine._pendingWorldTransition.reason).toMatch(/metadata|shape|saved/i); expect(store.raw()).toBe(durable);
  });

  it('saves once before a successful replacement and restores unfinished lesson progress', () => {
    const engine = makeEngine(), store = memoryStorage(), update = vi.fn(); protect(engine, store);
    installLoader(engine, update, { score: 1, answeredNpcs: { 0: true }, npcFollowUpStep: { 0: 1 } });
    const target = { ...lesson(), npcs: [{ question: {} }, { question: {} }] };
    expect(engine.loadLesson(target)).toBe(true); expect(store.setItem).toHaveBeenCalledTimes(1);
    expect(engine.clearWorld).toHaveBeenCalledTimes(1); expect(engine._currentLesson).toBe(target);
    expect(engine._workshopProjectId).toBeNull(); expect(engine._undoStack).toEqual([]); expect(engine._redoStack).toEqual([]);
    expect(engine.sessionLog.filter(event => event.type === 'lesson_load')).toHaveLength(1);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ score: 1, answeredNpcs: { 0: true }, totalQ: 2 }));
  });

  it('does not rewrite an unchanged valid draft at the transition boundary', () => {
    const engine = makeEngine(), store = memoryStorage(); builder.saveWorldDraft(engine, 'Bridge', store);
    const durable = store.raw(); store.setItem.mockClear(); protect(engine, store);
    expect(engine.loadLesson(lesson())).toBe(true); expect(store.raw()).toBe(durable); expect(store.setItem).not.toHaveBeenCalled();
  });

  it.each(['initial', 'blank', 'guided', 'transactional restore'])('allows %s without manufacturing a local project', kind => {
    const engine = makeEngine(kind === 'blank' || kind === 'initial' ? [] : undefined), store = memoryStorage();
    if (kind === 'initial') { transitions.install(engine, { isCurrent: () => true }); installLoader(engine); }
    else { if (kind === 'guided') engine._currentLesson.sandbox = false;
      if (kind === 'transactional restore') engine._workshopRestoreInProgress = true; protect(engine, store); }
    expect(engine.loadLesson(lesson())).toBe(true); expect(store.raw()).toBeUndefined();
    expect(engine.clearWorld).toHaveBeenCalledTimes(1);
  });

  it.each([undefined, null, false, true, {}, { ok: 'true' }])('fails closed on malformed installed flush result %j', result => {
    const engine = makeEngine(), before = snapshot(engine); protect(engine); engine.flushWorkshopDraft = vi.fn(() => result);
    expect(engine.loadLesson(lesson())).toBe(false); expectPreserved(engine, before);
    expect(engine.flushWorkshopDraft).toHaveBeenCalledTimes(1); expect(engine._pendingWorldTransition.reason).toMatch(/confirm|save|autosave/i);
  });

  it('converts a throwing flush into a readable failed transition before any mutation', () => {
    const engine = makeEngine(), before = snapshot(engine); protect(engine);
    engine.flushWorkshopDraft = vi.fn(() => { throw Error('Storage is locked'); });
    expect(() => engine.loadLesson(lesson())).not.toThrow(); expectPreserved(engine, before);
    expect(engine._pendingWorldTransition.reason).toMatch(/Storage is locked|save|autosave/i);
  });

  it('flushes once when a whole caller action contains a nested real loader', () => {
    const engine = makeEngine(), store = memoryStorage(); protect(engine, store); const target = lesson();
    const action = vi.fn(() => engine.loadLesson(target));
    expect(engine.transitionWorld(target, action)).toBe(true); expect(action).toHaveBeenCalledTimes(1);
    expect(store.setItem).toHaveBeenCalledTimes(1); expect(engine.clearWorld).toHaveBeenCalledTimes(1);
  });
});

describe('continuation is explicit, current, and one-shot', () => {
  function blockedWorld(hooks = {}) {
    const engine = makeEngine(), store = memoryStorage('{broken'); protect(engine, store, hooks);
    const target = lesson(), action = vi.fn(() => engine.loadLesson(target));
    expect(engine.transitionWorld(target, action)).toBe(false);
    return { engine, store, target, action, pending: engine._pendingWorldTransition };
  }

  it('Stay cancels only the pending intent and returns its initiating focus target', () => {
    const opener = document.createElement('button'); document.body.appendChild(opener); opener.focus();
    const { engine, action, pending } = blockedWorld(); const before = snapshot(engine);
    expect(pending.opener).toBe(opener); expect(engine.cancelWorldTransition()).toBe(opener);
    expectPreserved(engine, before); expect(action).not.toHaveBeenCalled(); expect(engine._pendingWorldTransition).toBeFalsy();
    expect(engine.discardWorldTransition(pending)).toBe(false);
  });

  it('Retry retains the initiating action until saving succeeds, then applies it once', () => {
    const { engine, store, action } = blockedWorld(); const before = snapshot(engine);
    expect(engine.retryWorldTransition()).toBe(false); expectPreserved(engine, before); expect(action).not.toHaveBeenCalled();
    store.replace(null); expect(engine.retryWorldTransition()).toBe(true); expect(action).toHaveBeenCalledTimes(1);
    expect(engine.retryWorldTransition()).toBe(false); expect(action).toHaveBeenCalledTimes(1);
  });

  it('confirmed discard replaces only this world once while leaving durable storage untouched', () => {
    const { engine, store, action, pending } = blockedWorld(), durable = store.raw();
    expect(engine.discardWorldTransition(pending)).toBe(true); expect(action).toHaveBeenCalledTimes(1);
    expect(engine.clearWorld).toHaveBeenCalledTimes(1); expect(store.raw()).toBe(durable);
    expect(engine.discardWorldTransition(pending)).toBe(false); expect(engine._pendingWorldTransition).toBeFalsy();
    engine._currentLesson = { title: 'Later bridge', sandbox: true }; put(engine, block(3));
    expect(engine.loadLesson({ title: 'Another investigation' })).toBe(false);
    expect(engine.clearWorld).toHaveBeenCalledTimes(1); expect(store.raw()).toBe(durable);
  });

  it('does not accept a cloned or invented confirmation object', () => {
    const { engine, action, pending } = blockedWorld(); const before = snapshot(engine);
    expect(engine.discardWorldTransition({ ...pending })).toBe(false); expectPreserved(engine, before);
    expect(action).not.toHaveBeenCalled();
  });

  it.each([
    ['new block', engine => put(engine, block(12))],
    ['removed block', engine => { delete engine.blocks['0,1,0']; }],
    ['changed material', engine => { engine.blocks['0,1,0'].userData.blockType = 'gold'; }],
    ['changed shape', engine => { engine.blocks['0,1,0'].userData.shape = 'quarter'; }],
    ['changed rotation', engine => { engine.blocks['0,1,0'].userData.rotation = 0; }],
    ['changed coordinates', engine => { engine.blocks['0,1,0'].userData.gridPos.x = 1; }],
    ['changed project', engine => { engine._workshopProjectId = 'different'; }],
    ['changed version', engine => { engine._workshopProjectVersion = 'different'; }],
    ['different live lesson', engine => { engine._currentLesson = { ...engine._currentLesson }; }]
  ])('invalidates a discard after %s', (_name, edit) => {
    const { engine, action, pending } = blockedWorld(); edit(engine); const before = snapshot(engine);
    expect(engine.discardWorldTransition(pending)).toBe(false); expectPreserved(engine, before); expect(action).not.toHaveBeenCalled();
  });

  it('invalidates a discard when the target payload changes', () => {
    const { engine, action, pending, target } = blockedWorld(); target.title = 'Changed investigation';
    const before = snapshot(engine); expect(engine.discardWorldTransition(pending)).toBe(false);
    expectPreserved(engine, before); expect(action).not.toHaveBeenCalled();
  });

  it('invalidates a discard when the engine is no longer current', () => {
    let current = true; const { engine, action, pending } = blockedWorld({ isCurrent: () => current });
    current = false; const before = snapshot(engine);
    expect(engine.discardWorldTransition(pending)).toBe(false); expectPreserved(engine, before); expect(action).not.toHaveBeenCalled();
  });

  it('cannot reuse confirmation for a different transition request', () => {
    const { engine, action, pending } = blockedWorld(); const secondAction = vi.fn();
    expect(engine.transitionWorld({ title: 'Different target' }, secondAction)).toBe(false);
    expect(engine._pendingWorldTransition).not.toBe(pending);
    expect(engine.discardWorldTransition(pending)).toBe(false); expect(action).not.toHaveBeenCalled();
    expect(secondAction).not.toHaveBeenCalled();
  });
});

describe('mounted callers preserve the learner workspace and offer usable recovery', () => {
  it('keeps Home, lesson identity, HUD, and learning evidence when guided launch is blocked', () => {
    const view = mountWorkspace(), before = snapshot(view.engine), evidence = learningState(view);
    const opener = view.container.querySelector('[data-gwe-featured-lesson="areaSurface"]'); opener.focus(); click(opener);
    expectPreserved(view.engine, before); expect(learningState(view)).toEqual(evidence);
    expect(view.bucket().showSaveRecovery).toBe(true); expect(recovery(view)).toBeTruthy();
    expect(recovery(view).getAttribute('aria-modal')).toBe('true');
    expect(recovery(view).textContent).toContain('Your current build is still here');
    expect(recovery(view).textContent).toContain(view.engine._pendingWorldTransition.reason);
    expectRecoveryVisible(view);
    expect(view.awardXP).not.toHaveBeenCalled();
    expect(recovery(view).contains(document.activeElement)).toBe(true);
    expect(view.engine._pendingWorldTransition.opener).toBe(opener);
  });

  it('returns false from Home and practice bridges without beginning a practice record', () => {
    const view = mountWorkspace(), evidence = learningState(view), before = snapshot(view.engine);
    let home, practice;
    React.act(() => { home = view.engine.startHomeLesson('areaSurface'); }); expect(home).toBe(false);
    React.act(() => view.engine.stayInCurrentWorld());
    const record = localStorage.getItem('gw_practice');
    React.act(() => { practice = view.engine.startPracticeRound(42, 'core'); }); expect(practice).toBe(false);
    expect(localStorage.getItem('gw_practice')).toBe(record); expect(learningState(view)).toEqual(evidence);
    expectPreserved(view.engine, before); expect(view.awardXP).not.toHaveBeenCalled();
  });

  it.each(['build', 'create'])('keeps the %s chooser and current build after a blocked blank workspace launch', page => {
    const view = mountWorkspace(); view.patch({ geometryHomePage: page });
    const before = snapshot(view.engine), evidence = learningState(view);
    const label = page === 'build' ? 'Open blank sandbox' : 'Start a blank lesson';
    const button = [...view.container.querySelectorAll('.gwe-home button')].find(node => node.textContent === label);
    click(button); expectPreserved(view.engine, before); expect(learningState(view)).toEqual(evidence);
    expect(view.bucket().geometryHomePage).toBe(page); expect(view.bucket().creatorMode).not.toBe(true);
    expect(recovery(view)).toBeTruthy();
  });

  it.each(['Stay here', 'Escape'])('returns focus to the initiating button with %s and does not load a world', async mode => {
    const view = mountWorkspace(), opener = view.container.querySelector('[data-gwe-featured-lesson="areaSurface"]');
    const before = snapshot(view.engine); opener.focus(); click(opener);
    if (mode === 'Stay here') click(recoveryButton(view, mode));
    else React.act(() => recovery(view).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
    await React.act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
    expect(recovery(view)).toBeNull(); expect(view.bucket().showGeometryHome).toBe(true);
    expect(document.activeElement).toBe(opener); expectPreserved(view.engine, before);
    expect(view.engine._pendingWorldTransition).toBeFalsy();
  });

  it('downloads the live build without treating the download as a successful save or transition', async () => {
    const view = mountWorkspace(); put(view.engine, block(-9, 'halfB', 2, 'glass'));
    const before = snapshot(view.engine), oldCreate = URL.createObjectURL, oldRevoke = URL.revokeObjectURL;
    let downloaded; URL.createObjectURL = vi.fn(blob => { downloaded = blob; return 'blob:geometry-world-test'; });
    URL.revokeObjectURL = vi.fn(); vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    try {
      click(view.container.querySelector('[data-gwe-featured-lesson="areaSurface"]'));
      click(recoveryButton(view, 'Download build JSON'));
      expect(URL.createObjectURL).toHaveBeenCalledTimes(1); expect(downloaded).toBeTruthy();
      const text = await new Promise((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsText(downloaded);
      });
      expect(JSON.parse(text).blocks).toEqual(builder.editableWorld(view.engine).blocks);
      expect(JSON.parse(text).blocks).toContainEqual(block(-9, 'halfB', 2, 'glass'));
      expect(view.bucket().showSaveRecovery).toBe(true); expect(view.bucket().showGeometryHome).toBe(true);
      expect(recovery(view).querySelector('[role="status"]').textContent).toMatch(/download|file/i);
      expectPreserved(view.engine, before); expect(view.store.raw()).toBe('{broken');
    } finally { if (oldCreate) URL.createObjectURL = oldCreate; else delete URL.createObjectURL;
      if (oldRevoke) URL.revokeObjectURL = oldRevoke; else delete URL.revokeObjectURL; }
  });

  it('Retry runs the initiating Home action once after storage recovers', () => {
    const view = mountWorkspace(); click(view.container.querySelector('[data-gwe-featured-lesson="areaSurface"]'));
    click(recoveryButton(view, 'Retry saving')); expect(view.engine.clearWorld).not.toHaveBeenCalled();
    view.store.replace(null); click(recoveryButton(view, 'Retry saving'));
    expect(view.engine.clearWorld).toHaveBeenCalledTimes(1); expect(view.bucket().showSaveRecovery).toBe(false);
    expect(view.bucket().showGeometryHome).toBe(false); expect(view.bucket().activeLesson).toBe('areaSurface');
    expect(view.engine.sessionLog.filter(event => event.type === 'lesson_load')).toHaveLength(1);
  });

  it('requires a second named confirmation before leaving and keeps earlier saved bytes untouched', () => {
    const view = mountWorkspace(), before = snapshot(view.engine); click(view.container.querySelector('[data-gwe-featured-lesson="areaSurface"]'));
    click(recoveryButton(view, 'Continue without saving')); expectPreserved(view.engine, before);
    expect(recovery(view).textContent).toContain('Leave without saving this build?');
    expect(recovery(view).textContent).toContain(view.engine._pendingWorldTransition.target.title);
    click(recoveryButton(view, 'Confirm: leave without saving'));
    expect(view.engine.clearWorld).toHaveBeenCalledTimes(1); expect(view.store.raw()).toBe('{broken');
    expect(view.bucket().activeLesson).toBe('areaSurface'); expect(view.bucket().showGeometryHome).toBe(false);
    expect(view.bucket().showSaveRecovery).toBe(false); expect(view.engine._pendingWorldTransition).toBeFalsy();
  });

  it('does not apply the confirmation when a live edit occurs before the final click', () => {
    const view = mountWorkspace(); click(view.container.querySelector('[data-gwe-featured-lesson="areaSurface"]'));
    click(recoveryButton(view, 'Continue without saving')); put(view.engine, block(12)); const before = snapshot(view.engine);
    click(recoveryButton(view, 'Confirm: leave without saving')); expectPreserved(view.engine, before);
    expect(view.bucket().showGeometryHome).toBe(true); expect(view.bucket().activeLesson).toBe('builderSandbox');
    expect(view.engine._pendingWorldTransition).toBeFalsy();
  });

  it('binds the confirmation UI to the original pending object instead of authorizing a replacement intent', () => {
    const view = mountWorkspace(); click(view.container.querySelector('[data-gwe-featured-lesson="areaSurface"]'));
    click(recoveryButton(view, 'Continue without saving'));
    const original = view.engine._pendingWorldTransition, replacementAction = vi.fn(() => true);
    view.engine._pendingWorldTransition = { ...original, action: replacementAction };
    const before = snapshot(view.engine); click(recoveryButton(view, 'Confirm: leave without saving'));
    expectPreserved(view.engine, before); expect(replacementAction).not.toHaveBeenCalled();
    expect(view.engine._pendingWorldTransition).toBeFalsy(); expect(view.bucket().activeLesson).toBe('builderSandbox');
  });

  it('does not erase notebook, prediction, objective checks, or score before a blocked Reset World', () => {
    const view = mountWorkspace(); view.patch({ showGeometryHome: false, objectivesOpen: true,
      objectiveChecks: { builderSandbox: { 0: true } }, npcWrongCount: { 1: 2 }, consecutiveWrong: 2 });
    const before = snapshot(view.engine), evidence = learningState(view); click(view.container.querySelector('.gw-reset-button'));
    expectPreserved(view.engine, before); expect(learningState(view)).toEqual(evidence);
    expect(view.bucket().objectivesOpen).toBe(true); expectRecoveryVisible(view);
  });

  it.each(['replay', 'next', 'practice'])('preserves completed evidence and persisted answers before a blocked completion %s action', action => {
    const view = mountWorkspace(); view.patch({ showGeometryHome: false, activeLesson: action === 'practice' ? 'practice_42' : 'volumeExplorer',
      score: 3, totalQ: 3, answeredNpcs: { 0: true, 1: true, 2: true }, npcWrongCount: { 1: 2 },
      npcLastWrong: { 1: 'kept error' }, consecutiveWrong: 2 });
    const title = action === 'practice' ? window.StemLab.geometryWorldPractice.lesson(42, 'core').title
      : window.StemLab.geometryWorldWorksheets.presets().volumeExplorer.title;
    const keyStart = core.indexOf('  function geometryProgressKey('), keyEnd = core.indexOf('  function geometryQuestionCount(', keyStart);
    const keyForLesson = new Function(core.slice(keyStart, keyEnd) + '\nreturn geometryProgressKey;')();
    const key = keyForLesson({ title }), saved = JSON.stringify({ score: 3, answeredNpcs: { 0: true, 1: true, 2: true } });
    localStorage.setItem(key, saved); const completed = localStorage.getItem('gw_completed_lessons');
    const before = snapshot(view.engine), evidence = learningState(view);
    const selector = action === 'replay' ? '.gw-completion-replay' : action === 'next' ? '.gw-completion-next' : '.gw-completion-practice';
    const practiceRecord = localStorage.getItem('gw_practice');
    click(view.container.querySelector(selector)); expectPreserved(view.engine, before); expect(learningState(view)).toEqual(evidence);
    expect(localStorage.getItem(key)).toBe(saved); expect(localStorage.getItem('gw_completed_lessons')).toBe(completed);
    expect(localStorage.getItem('gw_practice')).toBe(practiceRecord);
    expect(view.awardXP).not.toHaveBeenCalled(); expectRecoveryVisible(view);
  });

  it('keeps My Lessons open and does not switch identity or editor metadata after a rejected launch', () => {
    const authored = { ...lesson(), _id: 'ai_saved_teacher', title: 'Saved teacher lesson' };
    localStorage.setItem('gw_my_lessons', JSON.stringify([authored]));
    const view = mountWorkspace(); view.patch({ showGeometryHome: false, showMyLessons: true,
      lessonEditorJson: 'retained editor draft', lastGeneratedLesson: { title: 'Previous draft' } });
    const before = snapshot(view.engine), evidence = learningState(view), draft = view.bucket().lessonEditorJson;
    click(view.container.querySelector('[aria-label="Load saved lesson: Saved teacher lesson"]'));
    expectPreserved(view.engine, before); expect(learningState(view)).toEqual(evidence);
    expect(view.bucket().showMyLessons).toBe(true); expect(view.bucket().lessonEditorJson).toBe(draft);
    expect(view.bucket().lastGeneratedLesson).toEqual({ title: 'Previous draft' }); expectRecoveryVisible(view);
  });

  it('keeps typed lesson JSON and its editor open without announcing or saving an application that was blocked', () => {
    const authored = { ...lesson(), title: 'Typed teacher lesson' }, text = JSON.stringify(authored, null, 2);
    const view = mountWorkspace(); view.patch({ showGeometryHome: false, showLessonEditor: true,
      lastGeneratedLesson: authored, lessonEditorJson: text });
    const before = snapshot(view.engine), evidence = learningState(view), library = localStorage.getItem('gw_my_lessons');
    const editor = view.container.querySelector('[aria-label="Lesson editor"]');
    click([...editor.querySelectorAll('button')].find(node => /Apply & Save/.test(node.textContent)));
    expectPreserved(view.engine, before); expect(learningState(view)).toEqual(evidence);
    expect(view.bucket().showLessonEditor).toBe(true); expect(view.bucket().lessonEditorJson).toBe(text);
    expect(editor.querySelector('textarea').value).toBe(text); expect(localStorage.getItem('gw_my_lessons')).toBe(library);
    expect(view.addToast.mock.calls.some(([message]) => /applied and saved/i.test(message))).toBe(false);
    expect(view.awardXP).not.toHaveBeenCalled(); expectRecoveryVisible(view);
  });

  it('does not announce or log a legacy lesson JSON import that the live-save guard rejects', () => {
    const text = JSON.stringify({ ...lesson(), title: 'Imported lesson JSON' });
    vi.stubGlobal('FileReader', class { readAsText() { this.onload({ target: { result: text } }); } });
    let fileInput; vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(function() { fileInput = this; });
    const view = mountWorkspace(); view.patch({ showGeometryHome: false, showGameSettings: true });
    const before = snapshot(view.engine), evidence = learningState(view);
    click(view.container.querySelector('[title="Import a world from JSON file"]'));
    expect(fileInput).toBeTruthy(); Object.defineProperty(fileInput, 'files', { value: [{ size: text.length, name: 'lesson.json' }] });
    React.act(() => fileInput.onchange({ target: fileInput }));
    expectPreserved(view.engine, before); expect(learningState(view)).toEqual(evidence);
    expect(view.bucket().showGameSettings).toBe(true);
    expect(view.addToast.mock.calls.some(([message]) => /Loaded:|Opened .*validated/i.test(message))).toBe(false);
    expect(view.engine.sessionLog.some(event => event.type === 'world_import')).toBe(false); expectRecoveryVisible(view);
  });

  it('keeps the class library and metadata intact when a peer lesson load is rejected', () => {
    const view = mountWorkspace(); view.patch({ showGeometryHome: false, showPeerWorlds: true,
      lessonEditorJson: 'retained lesson text', lastGeneratedLesson: { title: 'Earlier draft' },
      peerWorldsList: [{ title: 'Peer bridge', author: 'Classmate', data: { ...lesson(), title: 'Class lesson' } }] });
    const before = snapshot(view.engine), evidence = learningState(view); click(peerRow(view));
    expectPreserved(view.engine, before); expect(learningState(view)).toEqual(evidence);
    expect(view.bucket().showPeerWorlds).toBe(true); expect(view.bucket().lessonEditorJson).toBe('retained lesson text');
    expect(view.bucket().lastGeneratedLesson).toEqual({ title: 'Earlier draft' });
    expect(view.engine.sessionLog.some(event => event.type === 'peer_world_loaded')).toBe(false); expectRecoveryVisible(view);
  });

  it('keeps a legacy peer-block import behind the same preflight and retains its initiating library', () => {
    const view = mountWorkspace(); view.patch({ showGeometryHome: false, showPeerWorlds: true,
      peerWorldsList: [{ title: 'Peer bridge', author: 'Classmate', data: { blocks: [block(12, 'halfB', 2, 'glass')] } }] });
    const before = snapshot(view.engine), evidence = learningState(view); click(peerRow(view));
    expectPreserved(view.engine, before); expect(learningState(view)).toEqual(evidence);
    expect(view.bucket().showPeerWorlds).toBe(true); expect(recovery(view)).toBeTruthy();
    expect(view.addToast.mock.calls.some(([message]) => /Loaded/.test(message))).toBe(false);
  });

  it.each(['saved successfully', 'explicit stale-tab discard'])('starts legacy peer geometry with a new draft identity after %s', mode => {
    const store = memoryStorage(), view = mountWorkspace(store);
    expect(builder.saveWorldDraft(view.engine, 'My earlier bridge', store).ok).toBe(true);
    const oldId = view.engine._workshopProjectId;
    if (mode === 'explicit stale-tab discard') {
      const newer = JSON.parse(store.raw()); newer.projects[0].version = 'newer-tab-version';
      newer.projects[0].world.blocks.push(block(20, 'cube', 0, 'gold')); store.replace(JSON.stringify(newer));
      put(view.engine, block(-20, 'quarter', 3, 'glass'));
    }
    const oldProject = JSON.stringify(builder.readWorldShelf(store).projects.find(project => project.id === oldId));
    const peerBlocks = [block(12, 'halfB', 2, 'glass'), block(13, 'quarter', 1, 'wood')];
    view.patch({ showGeometryHome: false, showPeerWorlds: true,
      peerWorldsList: [{ title: 'Peer bridge', author: 'Classmate', data: { blocks: peerBlocks } }] });
    click(peerRow(view));
    if (mode === 'explicit stale-tab discard') {
      expect(view.engine.clearWorld).not.toHaveBeenCalled(); click(recoveryButton(view, 'Continue without saving'));
      click(recoveryButton(view, 'Confirm: leave without saving'));
    }
    expect(view.engine.clearWorld).toHaveBeenCalledTimes(1); expect(view.engine._workshopProjectId).toBeNull();
    expect(view.engine._builderSelection).toBeNull(); expect(view.engine._undoStack).toEqual([]);
    expect(builder.editableWorld(view.engine).blocks).toEqual(peerBlocks);
    expect(view.bucket().activeLesson).toBe('builderSandbox'); expect(view.bucket().showPeerWorlds).toBe(false);
    expect(view.engine.flushWorkshopDraft().ok).toBe(true); expect(view.engine._workshopProjectId).not.toBe(oldId);
    const projects = builder.readWorldShelf(store).projects;
    expect(projects).toHaveLength(2); expect(JSON.stringify(projects.find(project => project.id === oldId))).toBe(oldProject);
    expect(projects.find(project => project.id === view.engine._workshopProjectId).world.blocks).toEqual(peerBlocks);
    expect(view.engine.sessionLog.filter(event => event.type === 'peer_world_loaded')).toHaveLength(1);
  });

  it('keeps hook order stable when a cold loading surface becomes a ready world', () => {
    const view = mountWorkspace(undefined, {}, false);
    expect(view.container.textContent).toMatch(/loading/i);
    expect(() => view.setThreeLoaded(true)).not.toThrow();
    expect(view.container.querySelector('.gwe-home')).toBeTruthy();
  });
});
