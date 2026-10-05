import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_geometryworld.js';
const KEY = 'allo.geometryworld.hud.v1';
const ENGINE_KEY = '__geoWorldEngine';
const DEFAULTS = { version: 1, preset: 'minimal', toolbarCollapsed: false, uiTextSize: 'standard',
  uiSurface: 'solid', showCoordinates: true, showStationCompass: true };
let cfg, mounted, source;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function storage(initial = null) {
  let raw = initial;
  return { getItem: vi.fn(() => raw), setItem: vi.fn((_key, value) => { raw = value; }), raw: () => raw };
}

function isolatedPreferences(store) {
  const window = { StemLab: { registerTool() {} } };
  const globals = { window, document: { getElementById: () => ({}) }, console: { log() {} } };
  if (store !== undefined) { globals.localStorage = store; window.localStorage = store; }
  runInNewContext(source, globals, { filename: FILE, timeout: 10000 });
  const api = window.StemLab.geometryWorldWorkspacePreferences;
  expect(api).toBeTruthy();
  return api;
}

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

function makeEngine() {
  const canvas = document.createElement('canvas');
  return {
    clearWorld: vi.fn(), scene: { remove() {} }, renderer: { dispose() {}, domElement: canvas },
    camera: { position: { x: 3, y: 5, z: 8, distanceTo: () => 99, set() {}, clone: () => ({ x: 3, y: 5, z: 8 }) },
      quaternion: { x: 0, y: 0, z: 0, w: 1 }, rotation: { x: 0, y: 0, z: 0 },
      getWorldDirection: value => value || { x: 0, y: 0, z: -1 }, updateProjectionMatrix() {} },
    blocks: {}, npcs: [], blocksPlaced: 7, sessionLog: [{ type: 'preserved' }], raycaster: null,
    flyMode: false, moveState: {}, velocity: { x: 0, y: 0, z: 0 }, onGround: true,
    _undoStack: [{ id: 'kept-undo' }], _redoStack: [{ id: 'kept-redo' }], _coordAnnounce: false, _targetGrid: null,
    _jumpLock: false, _sessionXP: 5, _crosshairTarget: 'none', _inWater: false, _inLava: false, _gridHelper: null,
    loadLesson: vi.fn(), logEvent: vi.fn(), undo() {}, redo() {}, returnToSpawn() {}, clearPlayerBlocks() {},
    measureStructure() {}, placeBlock() {}, removeBlock() {},
    applyRenderQuality: preference => ({ label: preference })
  };
}

function mountTool(overrides = {}) {
  const engine = makeEngine(); window[ENGINE_KEY] = engine;
  const container = document.createElement('div'); document.body.appendChild(container);
  const toolData = { _threeLoaded: true, geometryWorld: { _introShownOnce: true, tutorialDismissed: true,
    worldActive: true, activeLesson: 'areaSurface', score: 2, totalQ: 4, answeredNpcs: { 0: true },
    npcAnswerDrafts: { 1: { step: 0, text: 'My unfinished explanation' } },
    measureHistory: [{ id: 'kept-record', volume: 7 }], reflectionText: 'I counted equal layers.',
    objectiveChecks: { layers: true }, ...overrides } };
  let bump;
  const context = makeCtx({ toolData,
    update(section, key, value) { toolData[section] = { ...toolData[section], [key]: value }; if (bump) bump(); },
    updateMulti(section, patch) { toolData[section] = { ...toolData[section], ...patch }; if (bump) bump(); }
  });
  function Host() { const state = React.useState(0); bump = () => state[1](value => value + 1); return cfg.render(context); }
  const root = ReactDOMClient.createRoot(container);
  React.act(() => root.render(React.createElement(Host)));
  mounted = { container, root, engine, toolData, bucket: () => toolData.geometryWorld };
  return mounted;
}

function click(node) { expect(node).toBeTruthy(); React.act(() => node.click()); }
function openSettings(view) {
  click(view.container.querySelector('[data-geometry-settings-trigger="true"]'));
  const dialog = view.container.querySelector('#gw-settings-dialog'); expect(dialog).toBeTruthy(); return dialog;
}
function tab(view, id) { return view.container.querySelector('[data-gw-settings-tab="' + id + '"]'); }
async function key(node, value) {
  await React.act(async () => {
    node.dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true }));
    await new Promise(resolve => setTimeout(resolve, 5));
  });
}
function preference(view, name) { return view.container.querySelector('[data-gw-workspace-preference="' + name + '"]'); }
function select(view, name, value) {
  const node = preference(view, name); expect(node).toBeTruthy();
  React.act(() => {
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(node, value);
    node.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
function learningEvidence(view) {
  return structuredClone(Object.fromEntries(['activeLesson', 'worldActive', 'score', 'totalQ', 'answeredNpcs',
    'npcAnswerDrafts', 'measureHistory', 'reflectionText', 'objectiveChecks'].map(name => [name, view.bucket()[name]])));
}

beforeAll(() => {
  source = readFileSync(FILE, 'utf8'); resetStemLab(); window.THREE = makeThreeStub(); cfg = loadTool(FILE, 'geometryWorld');
}, 120000);
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); window.THREE = makeThreeStub(); });
afterEach(() => {
  if (mounted) { React.act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; }
  vi.restoreAllMocks(); delete window[ENGINE_KEY]; delete window[ENGINE_KEY + '_failed']; document.body.innerHTML = '';
});

describe('isolated workspace presentation preferences', () => {
  it('exposes fresh, independent defaults', () => {
    const api = isolatedPreferences(); const first = api.defaults(); expect(first).toEqual(DEFAULTS);
    first.uiTextSize = 'large'; first.showCoordinates = false; expect(api.defaults()).toEqual(DEFAULTS);
  });

  it.each([null, undefined, false, 1, 'large', [], [DEFAULTS], {}, { version: 2, uiTextSize: 'large' },
    { version: '1', showCoordinates: false }].map(value => [value]))('defaults unversioned or non-object input %#', value => {
    expect(isolatedPreferences().normalize(value)).toEqual(DEFAULTS);
  });

  it('upgrades an old version-one preset without losing toolbar state', () => {
    expect(isolatedPreferences().normalize({ version: 1, preset: 'builder', toolbarCollapsed: true }))
      .toEqual({ ...DEFAULTS, preset: 'builder', toolbarCollapsed: true });
  });

  it('retains valid, deliberately less dense presentation choices', () => {
    const value = { version: 1, preset: 'learning', toolbarCollapsed: true, uiTextSize: 'large', uiSurface: 'glass',
      showCoordinates: false, showStationCompass: false };
    expect(isolatedPreferences().normalize(value)).toEqual(value);
  });

  it.each([
    ['preset', '__proto__', 'minimal'], ['preset', 'Builder', 'minimal'], ['toolbarCollapsed', 'true', false],
    ['toolbarCollapsed', 1, false], ['uiTextSize', 'LARGE', 'standard'], ['uiTextSize', 20, 'standard'],
    ['uiSurface', 'transparent', 'solid'], ['uiSurface', false, 'solid'], ['showCoordinates', 'false', true],
    ['showCoordinates', 0, true], ['showStationCompass', 'true', true], ['showStationCompass', null, true]
  ])('strictly normalizes invalid %s value %#', (name, value, fallback) => {
    const normalized = isolatedPreferences().normalize({ ...DEFAULTS, [name]: value });
    expect(normalized[name]).toBe(fallback);
  });

  it('omits unrelated lesson state and unknown keys from persisted preferences', () => {
    const normalized = isolatedPreferences().normalize({ ...DEFAULTS, score: 99, activeLesson: 'different',
      measureHistory: [{ private: true }], extra: 'ignored' });
    expect(normalized).toEqual(DEFAULTS);
  });

  it.each([null, '', '{invalid', 'null', '[]', '{"version":2,"preset":"builder"}'])
    ('loads safe defaults for missing or corrupt storage %#', raw => {
      const store = storage(raw); expect(isolatedPreferences(store).load()).toEqual(DEFAULTS);
      expect(store.setItem).not.toHaveBeenCalled();
    });

  it('reads a supplied store independently of global storage', () => {
    const globalStore = storage(JSON.stringify({ ...DEFAULTS, preset: 'builder' }));
    const supplied = storage(JSON.stringify({ ...DEFAULTS, uiTextSize: 'large' }));
    const api = isolatedPreferences(globalStore); expect(api.load(supplied).uiTextSize).toBe('large');
    expect(api.load().preset).toBe('builder'); expect(supplied.getItem).toHaveBeenCalledWith(KEY);
  });

  it('merges a partial save with both old and new preferences', () => {
    const store = storage(JSON.stringify({ version: 1, preset: 'builder', toolbarCollapsed: true }));
    const api = isolatedPreferences(); expect(api.save({ uiTextSize: 'large', showCoordinates: false }, store)).toBe(true);
    expect(JSON.parse(store.raw())).toEqual({ ...DEFAULTS, preset: 'builder', toolbarCollapsed: true,
      uiTextSize: 'large', showCoordinates: false });
    expect(store.setItem).toHaveBeenCalledWith(KEY, expect.any(String));
    expect(api.load(store)).toEqual(JSON.parse(store.raw()));
  });

  it('preserves unrelated presentation choices across a preset-only save', () => {
    const saved = { ...DEFAULTS, uiSurface: 'glass', uiTextSize: 'large', showStationCompass: false };
    const store = storage(JSON.stringify(saved)); const api = isolatedPreferences();
    expect(api.save({ preset: 'learning' }, store)).toBe(true);
    expect(api.load(store)).toEqual({ ...saved, preset: 'learning' });
  });

  it('reports denied writes without replacing previous preferences', () => {
    const old = JSON.stringify({ ...DEFAULTS, preset: 'builder' }); const store = storage(old);
    store.setItem.mockImplementation(() => { throw Error('Quota denied'); });
    expect(isolatedPreferences().save({ uiTextSize: 'large' }, store)).toBe(false); expect(store.raw()).toBe(old);
  });

  it('turns denied reads into defaults and denied read/write access into a false save', () => {
    const store = storage(); store.getItem.mockImplementation(() => { throw Error('Access denied'); });
    store.setItem.mockImplementation(() => { throw Error('Access denied'); });
    const api = isolatedPreferences(); expect(api.load(store)).toEqual(DEFAULTS);
    expect(api.save({ uiSurface: 'glass' }, store)).toBe(false);
  });

  it('does not throw when browser storage is unavailable', () => {
    const api = isolatedPreferences(); expect(api.load()).toEqual(DEFAULTS); expect(api.save({ uiTextSize: 'large' })).toBe(false);
  });

  it('supports resetting all presentation fields with fresh defaults', () => {
    const store = storage(JSON.stringify({ ...DEFAULTS, preset: 'builder', toolbarCollapsed: true, uiTextSize: 'large',
      uiSurface: 'glass', showCoordinates: false, showStationCompass: false })); const api = isolatedPreferences();
    expect(api.save(api.defaults(), store)).toBe(true); expect(api.load(store)).toEqual(DEFAULTS);
  });
});

describe('workspace settings category navigation', () => {
  it('opens on Workspace with one selected, tabbable category and one labelled panel', () => {
    const view = mountTool(); const dialog = openSettings(view);
    expect([...dialog.querySelectorAll('[role="tab"]')].map(node => node.getAttribute('data-gw-settings-tab')))
      .toEqual(['workspace', 'view', 'learning', 'create']);
    const selected = dialog.querySelector('[role="tab"][aria-selected="true"]'); expect(selected).toBe(tab(view, 'workspace'));
    expect([...dialog.querySelectorAll('[role="tab"]')].filter(node => node.tabIndex === 0)).toEqual([selected]);
    const panels = [...dialog.querySelectorAll('[role="tabpanel"]')].filter(node => !node.hidden);
    expect(panels).toHaveLength(1); const panel = panels[0];
    expect(panel.id).toBe(selected.getAttribute('aria-controls')); expect(panel.getAttribute('aria-labelledby')).toBe(selected.id);
  });

  it('selects categories with arrow keys and wraps at either end', async () => {
    const view = mountTool(); openSettings(view); tab(view, 'workspace').focus();
    await key(tab(view, 'workspace'), 'ArrowRight'); expect(tab(view, 'view').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tab(view, 'view'));
    await key(tab(view, 'view'), 'ArrowLeft'); expect(tab(view, 'workspace').getAttribute('aria-selected')).toBe('true');
    await key(tab(view, 'workspace'), 'ArrowLeft'); expect(tab(view, 'create').getAttribute('aria-selected')).toBe('true');
    await key(tab(view, 'create'), 'ArrowRight'); expect(tab(view, 'workspace').getAttribute('aria-selected')).toBe('true');
  });

  it('supports Home and End without moving game controls or evidence', async () => {
    const view = mountTool(); const before = learningEvidence(view); openSettings(view);
    await key(tab(view, 'workspace'), 'End'); expect(tab(view, 'create').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tab(view, 'create'));
    await key(tab(view, 'create'), 'Home'); expect(tab(view, 'workspace').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tab(view, 'workspace')); expect(learningEvidence(view)).toEqual(before);
    expect(view.engine.loadLesson).not.toHaveBeenCalled(); expect(view.engine.clearWorld).not.toHaveBeenCalled();
  });

  it.each(['l', 't', 'u'])('keeps native Settings key %s away from world shortcuts', value => {
    const view = mountTool(); openSettings(view);
    const control = preference(view, 'uiTextSize'); control.focus();
    const leaked = vi.fn(); document.addEventListener('keydown', leaked);
    const event = new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true });
    try {
      React.act(() => control.dispatchEvent(event));
      expect(leaked).not.toHaveBeenCalled(); expect(event.defaultPrevented).toBe(false);
      expect(document.activeElement).toBe(control); expect(view.bucket().showGameSettings).toBe(true);
      expect(view.bucket().hudHidden).not.toBe(true); expect(view.engine.moveState).toEqual({});
    } finally { document.removeEventListener('keydown', leaked); }
  });

  it('changes the HUD preset without closing the settings workspace', () => {
    const view = mountTool(); const before = learningEvidence(view); openSettings(view);
    click(view.container.querySelector('[data-geometry-hud-preset="learning"]'));
    expect(view.bucket()).toMatchObject({ hudPreset: 'learning', hudPanel: 'progress', showGameSettings: true });
    expect(view.container.querySelector('#gw-settings-dialog')).toBeTruthy(); expect(learningEvidence(view)).toEqual(before);
  });

  it('reports a Custom layout when an optional panel differs from the selected preset', () => {
    const view = mountTool(); const before = learningEvidence(view); openSettings(view);
    const panel = view.container.querySelector('[data-gw-workspace-panel="true"]');
    expect(panel.labels.length).toBeGreaterThan(0);
    React.act(() => {
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(panel, 'map');
      panel.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(view.bucket()).toMatchObject({ hudPanel: 'map', showGameSettings: true });
    expect(view.container.querySelectorAll('[data-geometry-hud-preset][aria-pressed="true"]')).toHaveLength(0);
    expect(view.container.querySelector('#gw-settings-panel-workspace').textContent).toContain('Current layout: Custom');
    click(view.container.querySelector('[data-geometry-hud-preset="minimal"]'));
    expect(view.bucket().hudPanel).toBe('');
    expect(view.container.querySelector('#gw-settings-panel-workspace').textContent).toContain('Current layout: Minimal');
    expect(view.container.querySelectorAll('[data-geometry-hud-preset][aria-pressed="true"]')).toHaveLength(1);
    expect(learningEvidence(view)).toEqual(before);
  });

  it('renders native, labelled presentation controls with clear defaults', () => {
    const view = mountTool(); openSettings(view);
    for (const name of ['uiTextSize', 'uiSurface']) {
      const control = preference(view, name); expect(control?.tagName).toBe('SELECT');
      expect(control.labels.length).toBeGreaterThan(0); expect(control.labels[0].textContent.trim().length).toBeGreaterThan(0);
      expect(control.value).toBe(DEFAULTS[name]);
    }
    for (const name of ['showCoordinates', 'showStationCompass', 'toolbarCollapsed']) {
      const control = preference(view, name); expect(control?.type).toBe('checkbox');
      expect(control.labels.length).toBeGreaterThan(0);
      expect(control.checked).toBe(name === 'toolbarCollapsed' ? !DEFAULTS[name] : DEFAULTS[name]);
    }
  });

  it('applies text and surface changes live and saves them without closing settings', () => {
    const view = mountTool(); const before = learningEvidence(view); openSettings(view);
    select(view, 'uiTextSize', 'large'); select(view, 'uiSurface', 'glass');
    expect(view.bucket()).toMatchObject({ uiTextSize: 'large', uiSurface: 'glass', showGameSettings: true });
    const workspace = view.container.querySelector('#geoworld-fs-workspace');
    expect(workspace.getAttribute('data-ui-text-size')).toBe('large'); expect(workspace.getAttribute('data-ui-surface')).toBe('glass');
    expect(JSON.parse(localStorage.getItem(KEY))).toMatchObject({ uiTextSize: 'large', uiSurface: 'glass' });
    expect(learningEvidence(view)).toEqual(before); expect(view.engine.loadLesson).not.toHaveBeenCalled();
  });

  it('toggles optional coordinate and station overlays without changing progress', () => {
    const view = mountTool(); const before = learningEvidence(view); openSettings(view);
    click(preference(view, 'showCoordinates')); click(preference(view, 'showStationCompass'));
    expect(view.bucket()).toMatchObject({ showCoordinates: false, showStationCompass: false, showGameSettings: true });
    expect(view.container.querySelector('.gw-coordinate-hud')).toBeFalsy();
    expect(view.container.querySelector('.gw-learning-compass')).toBeFalsy(); expect(learningEvidence(view)).toEqual(before);
    expect(JSON.parse(localStorage.getItem(KEY))).toMatchObject({ showCoordinates: false, showStationCompass: false });
  });

  it('hides and restores the top bar with the positively labelled checkbox', () => {
    const view = mountTool(); const before = learningEvidence(view); openSettings(view);
    click(preference(view, 'toolbarCollapsed')); expect(view.bucket().toolbarCollapsed).toBe(true);
    expect(view.container.querySelector('#geoworld-fs-workspace').getAttribute('data-toolbar-collapsed')).toBe('true');
    expect(preference(view, 'toolbarCollapsed').checked).toBe(false);
    click(preference(view, 'toolbarCollapsed')); expect(view.bucket().toolbarCollapsed).toBe(false);
    expect(preference(view, 'toolbarCollapsed').checked).toBe(true); expect(learningEvidence(view)).toEqual(before);
  });

  it('restores saved presentation state after a fresh mount', () => {
    localStorage.setItem(KEY, JSON.stringify({ ...DEFAULTS, uiTextSize: 'large', uiSurface: 'glass',
      showCoordinates: false, showStationCompass: false }));
    const view = mountTool(); const workspace = view.container.querySelector('#geoworld-fs-workspace'); openSettings(view);
    expect(workspace.getAttribute('data-ui-text-size')).toBe('large'); expect(workspace.getAttribute('data-ui-surface')).toBe('glass');
    expect(preference(view, 'uiTextSize').value).toBe('large'); expect(preference(view, 'uiSurface').value).toBe('glass');
    expect(preference(view, 'showCoordinates').checked).toBe(false); expect(preference(view, 'showStationCompass').checked).toBe(false);
  });

  it('keeps an existing session preference ahead of saved device defaults', () => {
    localStorage.setItem(KEY, JSON.stringify({ ...DEFAULTS, uiTextSize: 'large', uiSurface: 'glass', showCoordinates: false }));
    const view = mountTool({ uiTextSize: 'standard', uiSurface: 'solid', showCoordinates: true }); openSettings(view);
    expect(preference(view, 'uiTextSize').value).toBe('standard'); expect(preference(view, 'uiSurface').value).toBe('solid');
    expect(preference(view, 'showCoordinates').checked).toBe(true);
  });

  it('keeps live customization usable when saving is denied', () => {
    const old = JSON.stringify(DEFAULTS); localStorage.setItem(KEY, old);
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('Quota denied'); });
    const view = mountTool(); openSettings(view); select(view, 'uiTextSize', 'large');
    expect(view.bucket()).toMatchObject({ uiTextSize: 'large', showGameSettings: true });
    expect(preference(view, 'uiTextSize').value).toBe('large'); expect(localStorage.getItem(KEY)).toBe(old);
    expect(write).toHaveBeenCalled();
  });

  it('resets only presentation settings, preserving exact world and learning evidence', () => {
    const view = mountTool({ hudPreset: 'builder', hudPanel: 'inventory', toolbarCollapsed: true, uiTextSize: 'large',
      uiSurface: 'glass', showCoordinates: false, showStationCompass: false });
    const before = learningEvidence(view), world = { blocks: view.engine.blocks, undo: view.engine._undoStack,
      redo: view.engine._redoStack, camera: { ...view.engine.camera.position }, log: structuredClone(view.engine.sessionLog) };
    openSettings(view); click(view.container.querySelector('[data-gw-workspace-reset="true"]'));
    expect(view.bucket()).toMatchObject({ hudPreset: 'minimal', hudPanel: '', toolbarCollapsed: false,
      uiTextSize: 'standard', uiSurface: 'solid', showCoordinates: true, showStationCompass: true, showGameSettings: true });
    expect(learningEvidence(view)).toEqual(before); expect(view.engine.blocks).toBe(world.blocks);
    expect(view.engine._undoStack).toBe(world.undo); expect(view.engine._redoStack).toBe(world.redo);
    expect(view.engine.camera.position).toEqual(world.camera); expect(view.engine.sessionLog).toEqual(world.log);
    expect(view.engine.loadLesson).not.toHaveBeenCalled(); expect(view.engine.clearWorld).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem(KEY))).toEqual(DEFAULTS);
  });
});
