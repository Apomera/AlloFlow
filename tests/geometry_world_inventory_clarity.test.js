import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const ENGINE_KEY = '__geoWorldEngine';
const STORAGE_KEY = 'allo.geometryworld.hud.v1';
let cfg, mounted;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function makeThreeStub() {
  function vector() {
    const value = { x: 0, y: 0, z: 0, w: 0 };
    for (const name of ['set', 'copy', 'add', 'sub', 'subVectors', 'normalize', 'multiplyScalar', 'applyQuaternion',
      'setFromQuaternion', 'crossVectors', 'cross', 'lerp', 'addScaledVector', 'setY', 'round', 'floor', 'setScalar', 'applyEuler'])
      value[name] = () => value;
    value.clone = () => vector(); value.distanceTo = () => 99; value.length = () => 1; value.dot = () => 0;
    return value;
  }
  return new Proxy({}, { get(_target, property) {
    if (property === 'SRGBColorSpace') return 'srgb';
    if (typeof property === 'symbol') return undefined;
    return function() { return vector(); };
  } });
}

function block(type, volume = 1, overrides = {}) {
  return { userData: { blockType: type, volume, shape: 'cube', gridPos: { x: 0, y: 1, z: 0 },
    _lessonBlock: false, _measurementLayer: 'student', ...overrides } };
}

function mountTool(blocks = {}, overrides = {}) {
  const engine = {
    clearWorld: vi.fn(), scene: { remove() {} }, renderer: { dispose() {}, domElement: document.createElement('canvas') },
    camera: { position: { x: 3, y: 5, z: 8, distanceTo: () => 99, set() {}, clone: () => ({ x: 3, y: 5, z: 8 }) },
      quaternion: { x: 0, y: 0, z: 0, w: 1 }, rotation: { x: 0, y: 0, z: 0 },
      getWorldDirection: value => value || { x: 0, y: 0, z: -1 }, updateProjectionMatrix() {} },
    blocks, npcs: [], blocksPlaced: 7, sessionLog: [{ type: 'preserved' }], raycaster: null,
    flyMode: false, moveState: {}, velocity: { x: 0, y: 0, z: 0 }, onGround: true,
    _undoStack: [{ id: 'kept-undo' }], _redoStack: [{ id: 'kept-redo' }], _coordAnnounce: false, _targetGrid: null,
    loadLesson: vi.fn(), logEvent: vi.fn(), undo() {}, redo() {}, returnToSpawn() {}, clearPlayerBlocks() {},
    measureStructure() {}, placeBlock() {}, removeBlock() {}, applyRenderQuality: preference => ({ label: preference })
  };
  window[ENGINE_KEY] = engine;
  const container = document.createElement('div'); document.body.appendChild(container);
  const toolData = { _threeLoaded: true, geometryWorld: { _introShownOnce: true, tutorialDismissed: true,
    worldActive: true, activeLesson: 'areaSurface', hudPreset: 'builder', hudPanel: 'inventory',
    score: 2, totalQ: 4, answeredNpcs: { 0: true }, npcAnswerDrafts: { 1: { text: 'My explanation' } },
    measureHistory: [], reflectionText: 'I counted equal layers.', ...overrides } };
  let bump;
  const context = makeCtx({ toolData,
    update(section, key, value) { toolData[section] = { ...toolData[section], [key]: value }; if (bump) bump(); },
    updateMulti(section, patch) { toolData[section] = { ...toolData[section], ...patch }; if (bump) bump(); }
  });
  function Host() { const state = React.useState(0); bump = () => state[1](value => value + 1); return cfg.render(context); }
  const root = ReactDOMClient.createRoot(container);
  React.act(() => root.render(React.createElement(Host)));
  mounted = { container, root, engine, bucket: () => toolData.geometryWorld,
    refresh() { React.act(() => context.updateMulti('geometryWorld', {})); } };
  return mounted;
}

function panel(view) { return view.container.querySelector('#gw-inventory-panel'); }
function pieces(view) { return panel(view).querySelector('[data-geometry-inventory-pieces]').textContent; }
function volume(view) { return panel(view).querySelector('[data-geometry-inventory-volume]').textContent; }
function rows(view) { return [...panel(view).querySelectorAll('.gw-inventory-row')]; }
function click(node) { expect(node).toBeTruthy(); React.act(() => node.click()); }
function selectPreference(view, name, value) {
  const node = view.container.querySelector('[data-gw-workspace-preference="' + name + '"]');
  expect(node).toBeTruthy();
  React.act(() => {
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(node, value);
    node.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

beforeAll(() => { resetStemLab(); window.THREE = makeThreeStub(); cfg = loadTool('stem_lab/stem_tool_geometryworld.js', 'geometryWorld'); }, 120000);
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); window.THREE = makeThreeStub(); });
afterEach(() => {
  if (mounted) { React.act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; }
  vi.restoreAllMocks(); delete window[ENGINE_KEY]; delete window[ENGINE_KEY + '_failed']; document.body.innerHTML = '';
});

describe('student block inventory', () => {
  it('counts student Grass as a placed piece and a named material', () => {
    const view = mountTool({ grass: block('grass') });
    expect(pieces(view)).toBe('1 piece'); expect(volume(view)).toBe('1 cubic unit');
    expect(rows(view)).toHaveLength(1);
    expect(rows(view)[0].querySelector('.gw-inventory-material-name').textContent).toBe('Grass');
    expect(rows(view)[0].querySelector('.gw-inventory-count').textContent).toBe('1');
  });

  it('excludes protected lesson and terrain pieces from both material counts and volume', () => {
    const view = mountTool({ student: block('wood'), protected: block('gold', 100, { _lessonBlock: true }),
      lessonLayer: block('diamond', 100, { _measurementLayer: 'lesson' }),
      groundLayer: block('grass', 100, { _measurementLayer: 'ground' }),
      groundProxy: block('stone', 100, { gwGroundProxy: true }), absent: null, decorative: {} });
    expect(pieces(view)).toBe('1 piece'); expect(volume(view)).toBe('1 cubic unit');
    expect(rows(view).map(row => row.dataset.geometryInventoryMaterial)).toEqual(['wood']);
  });

  it('retains legacy unflagged student pieces without treating legacy lesson blocks as students', () => {
    const legacy = block('grass'); delete legacy.userData._measurementLayer; delete legacy.userData._lessonBlock;
    const lesson = block('stone', 5, { _lessonBlock: true }); delete lesson.userData._measurementLayer;
    const view = mountTool({ legacy, lesson });
    expect(pieces(view)).toBe('1 piece'); expect(volume(view)).toBe('1 cubic unit');
  });

  it('keeps fractional occupied volume distinct from the number of placed pieces', () => {
    const view = mountTool({ cube: block('stone'), half: block('stone', 0.5, { shape: 'halfB' }),
      quarter: block('grass', 0.25, { shape: 'quarter' }) });
    expect(pieces(view)).toBe('3 pieces'); expect(volume(view)).toBe('1 3/4 cubic units');
    expect(rows(view).map(row => [row.dataset.geometryInventoryMaterial, row.querySelector('.gw-inventory-count').textContent]))
      .toEqual([['stone', '2'], ['grass', '1']]);
  });

  it('makes every material group available with its full name and decorative swatch', () => {
    const materials = ['stone', 'grass', 'wood', 'diamond', 'gold', 'sand', 'glass', 'water', 'brick', 'ice',
      'lava', 'torch', 'obsidian', 'marble', 'copper', 'emerald', 'amethyst', 'leaves', 'snow', 'wool'];
    const view = mountTool(Object.fromEntries(materials.map(type => [type, block(type)])));
    expect(pieces(view)).toBe('20 pieces'); expect(volume(view)).toBe('20 cubic units'); expect(rows(view)).toHaveLength(20);
    for (const type of materials) {
      const row = rows(view).find(candidate => candidate.dataset.geometryInventoryMaterial === type);
      expect(row.querySelector('.gw-inventory-material-name').textContent).toBe(type[0].toUpperCase() + type.slice(1));
      expect(row.querySelector('.gw-material-swatch').getAttribute('aria-hidden')).toBe('true');
    }
    const list = panel(view).querySelector('.gw-inventory-materials');
    expect(list.tabIndex).toBe(0); expect(list.getAttribute('aria-label')).toBe('Placed pieces by material');
    expect(list.querySelector('ul').children).toHaveLength(20);
  });

  it('keeps native list scrolling and typing keys away from world shortcuts while allowing Escape', () => {
    const view = mountTool({ grass: block('grass') });
    const list = panel(view).querySelector('.gw-inventory-materials'), leaked = vi.fn();
    list.focus(); document.addEventListener('keydown', leaked);
    try {
      for (const [key, code] of [['ArrowDown', 'ArrowDown'], ['PageDown', 'PageDown'], ['End', 'End'], ['q', 'KeyQ'], ['1', 'Digit1']]) {
        const event = new KeyboardEvent('keydown', { key, code, bubbles: true, cancelable: true });
        React.act(() => list.dispatchEvent(event));
        expect(leaked).not.toHaveBeenCalled(); expect(event.defaultPrevented).toBe(false);
        expect(document.activeElement).toBe(list); expect(view.engine.moveState).toEqual({});
      }
      React.act(() => list.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true })));
      expect(leaked).toHaveBeenCalledOnce();
    } finally { document.removeEventListener('keydown', leaked); }
  });

  it('shows an explicit empty count without an unavailable or missing volume', () => {
    const view = mountTool({ lesson: block('gold', 10, { _lessonBlock: true }) });
    expect(pieces(view)).toBe('0 pieces'); expect(volume(view)).toBe('0 cubic units'); expect(rows(view)).toHaveLength(0);
    expect(panel(view).querySelector('.gw-inventory-empty').textContent).toBe('No student-placed pieces yet.');
  });

  it.each([NaN, Infinity, -1, '1', null])('keeps the piece count but marks an invalid volume unavailable: %s', invalid => {
    const view = mountTool({ normal: block('grass'), invalid: block('stone', invalid) });
    expect(pieces(view)).toBe('2 pieces'); expect(volume(view)).toBe('Unavailable'); expect(rows(view)).toHaveLength(2);
    expect(panel(view).querySelector('[data-geometry-inventory-volume]').dataset.geometryInventoryVolume).toBe('unavailable');
  });

  it('updates the complete inventory after student additions and removals', () => {
    const view = mountTool({ first: block('stone'), second: block('wood') });
    delete view.engine.blocks.first; view.engine.blocks.third = block('grass', 0.5); view.refresh();
    expect(pieces(view)).toBe('2 pieces'); expect(volume(view)).toBe('1 1/2 cubic units');
    expect(rows(view).map(row => row.dataset.geometryInventoryMaterial)).toEqual(['grass', 'wood']);
  });

  it('applies saved and live appearance choices without replacing inventory or learner work', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, preset: 'builder', uiTextSize: 'large', uiSurface: 'glass' }));
    const view = mountTool({ grass: block('grass') }), before = JSON.stringify(view.bucket());
    const workspace = view.container.querySelector('#geoworld-fs-workspace');
    expect(workspace.dataset.uiTextSize).toBe('large'); expect(workspace.dataset.uiSurface).toBe('glass');
    const world = view.engine.blocks, undo = view.engine._undoStack;
    click(view.container.querySelector('[data-geometry-settings-trigger="true"]'));
    selectPreference(view, 'uiTextSize', 'standard'); selectPreference(view, 'uiSurface', 'solid');
    expect(workspace.dataset.uiTextSize).toBe('standard'); expect(workspace.dataset.uiSurface).toBe('solid');
    expect(pieces(view)).toBe('1 piece'); expect(volume(view)).toBe('1 cubic unit');
    expect(view.engine.blocks).toBe(world); expect(view.engine._undoStack).toBe(undo);
    const original = JSON.parse(before);
    for (const key of ['score', 'totalQ', 'answeredNpcs', 'npcAnswerDrafts', 'measureHistory', 'reflectionText'])
      expect(view.bucket()[key]).toEqual(original[key]);
    expect(view.engine.loadLesson).not.toHaveBeenCalled(); expect(view.engine.clearWorld).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toMatchObject({ uiTextSize: 'standard', uiSurface: 'solid' });
  });

  it('closes only the optional inventory panel while retaining the world and measurement', () => {
    const scan = { L: 1, W: 1, H: 1, totalVolume: 1, occupiedVolume: 1, count: 1, boundingVolume: 1, fillPercent: 100,
      shapeCounts: { cube: 1 }, blocks: [{ x: 0, y: 1, z: 0 }], isComplete: true };
    const view = mountTool({ grass: block('grass') }, { measureResult: scan });
    const world = view.engine.blocks, result = view.bucket().measureResult;
    expect(view.container.querySelector('.gw-measure-card')).toBeTruthy();
    click(panel(view).querySelector('.gw-hud-panel-close'));
    expect(panel(view)).toBeNull(); expect(view.bucket().hudPanel).toBe('');
    expect(view.bucket().measureResult).toBe(result); expect(view.engine.blocks).toBe(world);
    expect(view.container.querySelector('.gw-measure-card')).toBeTruthy();
  });
});
