import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_geometryworld.js';
const SOURCE = readFileSync(FILE, 'utf8');
const ENGINE_KEY = '__geoWorldEngine';
let cfg;
let mounted;

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function makeThreeStub() {
  function vec() {
    const value = { x: 0, y: 0, z: 0, w: 0 };
    ['set','copy','add','sub','subVectors','normalize','multiplyScalar','applyQuaternion','setFromQuaternion','crossVectors','cross','lerp','addScaledVector','setY','round','floor','setScalar','applyEuler'].forEach(function(name) { value[name] = function() { return value; }; });
    value.clone = function() { return vec(); };
    value.distanceTo = function() { return 99; };
    value.length = function() { return 1; };
    value.dot = function() { return 0; };
    return value;
  }
  return new Proxy({}, { get: function(_target, property) { if (property === 'SRGBColorSpace') return 'srgb'; if (typeof property === 'symbol') return undefined; return function() { return vec(); }; } });
}

function makeEngine() {
  const qualityCalls = [];
  const canvas = document.createElement('canvas');
  return {
    qualityCalls,
    clearWorld: function() {},
    scene: { remove: function() {} },
    renderer: { dispose: function() {}, domElement: canvas },
    camera: {
      position: { x: 0, y: 0, z: 0, distanceTo: function() { return 99; }, set: function() {}, clone: function() { return { x: 0, y: 0, z: 0 }; } },
      quaternion: { x: 0, y: 0, z: 0, w: 1 }, rotation: { x: 0, y: 0, z: 0 },
      getWorldDirection: function(value) { return value || { x: 0, y: 0, z: -1 }; }, updateProjectionMatrix: function() {}
    },
    blocks: {}, npcs: [], blocksPlaced: 0, sessionLog: [], raycaster: null,
    flyMode: false, moveState: {}, velocity: { x: 0, y: 0, z: 0 }, onGround: true,
    _undoStack: [], _redoStack: [], _coordAnnounce: false, _targetGrid: null,
    _jumpLock: false, _sessionXP: 0, _crosshairTarget: 'none', _inWater: false, _inLava: false, _gridHelper: null,
    loadLesson: function() {}, logEvent: function() {}, undo: function() {}, redo: function() {},
    returnToSpawn: function() {}, clearPlayerBlocks: function() {}, measureStructure: function() {}, placeBlock: function() {}, removeBlock: function() {},
    applyRenderQuality: function(preference) { qualityCalls.push(preference); return { label: preference === 'saver' ? 'Battery saver' : preference }; }
  };
}

function mountTool(bucket) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const toolData = { _threeLoaded: true, geometryWorld: Object.assign({}, bucket) };
  let bump;
  const context = makeCtx({
    toolData,
    update: function(section,key,value) { toolData[section] = Object.assign({}, toolData[section], { [key]: value }); if (bump) bump(); },
    updateMulti: function(section,patch) { toolData[section] = Object.assign({}, toolData[section], patch); if (bump) bump(); }
  });
  function Host() { const state = React.useState(0); bump = function() { state[1](function(value) { return value + 1; }); }; return cfg.render(context); }
  const root = ReactDOMClient.createRoot(container);
  React.act(function() { root.render(React.createElement(Host)); });
  mounted = { container, root, toolData };
  return mounted;
}

function openSettings(view) {
  let trigger = view.container.querySelector('[data-geometry-settings-trigger="true"]');
  expect(trigger).toBeTruthy();
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  React.act(function() { trigger.dispatchEvent(new Event('click', { bubbles: true })); });
  const dialog = view.container.querySelector('#gw-settings-dialog');
  expect(dialog).toBeTruthy();
  expect(dialog.getAttribute('role')).toBe('dialog');
  expect(dialog.getAttribute('aria-modal')).toBe('true');
  expect(dialog.getAttribute('aria-labelledby')).toBe('gw-settings-title');
  trigger = view.container.querySelector('[data-geometry-settings-trigger="true"]');
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
  return dialog;
}

beforeAll(function() {
  resetStemLab();
  window.THREE = makeThreeStub();
  cfg = loadTool(FILE, 'geometryWorld');
});

beforeEach(function() {
  window.localStorage.removeItem('allo.geometryworld.hud.v1');
  window.THREE = makeThreeStub();
  window[ENGINE_KEY] = makeEngine();
});

afterEach(function() {
  if (mounted) { React.act(function() { mounted.root.unmount(); }); mounted.container.remove(); mounted = null; }
  delete window[ENGINE_KEY];
  delete window[ENGINE_KEY + '_failed'];
  delete document.fullscreenElement;
  document.body.innerHTML = '';
});

describe('Geometry World display stability controls', function() {
  it('resolves reusable Auto, saver, balanced, and detailed profiles', function() {
    const resolve = window.StemLab.GeometryWorldRenderProfile;
    expect(resolve).toBeTypeOf('function');
    expect(resolve('auto', { isMobile: true, hardwareConcurrency: 8 }).tier).toBe('saver');
    expect(resolve('auto', { reducedMotion: true, hardwareConcurrency: 12 }).tier).toBe('saver');
    expect(resolve('auto', { hardwareConcurrency: 8 }).tier).toBe('detail');
    expect(resolve('balanced', {}).maxPixelRatio).toBe(1.5);
    expect(resolve('saver', {}).shadows).toBe(false);
    expect(resolve('detail', {}).postFx).toBe(true);
    expect(resolve('auto', { hardwareConcurrency: 8 }).reason).toContain('Detailed');
    expect(resolve('auto', { isMobile: true }).reason).toContain('Battery saver');
  });

  it('renders and persists an accessible graphics-quality selector', function() {
    const view = mountTool({ _introShownOnce: true, worldActive: true });
    openSettings(view);
    let select = view.container.querySelector('[data-geometry-render-quality=true]');
    expect(select).toBeTruthy();
    expect(select.getAttribute('aria-label')).toBe('3D graphics quality');
    expect(select.getAttribute('aria-describedby')).toBe('gw-quality-help');
    expect(view.container.querySelector('.gw-quality-resolved').textContent).toBe('Detailed');
    expect(select.value).toBe('auto');
    expect(select.querySelectorAll('option')).toHaveLength(4);
    React.act(function() {
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
      setter.call(select, 'saver');
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    select = view.container.querySelector('[data-geometry-render-quality=true]');
    expect(view.toolData.geometryWorld.renderQuality).toBe('saver');
    expect(select.value).toBe('saver');
    expect(view.container.querySelector('.gw-quality-resolved').textContent).toBe('Battery saver');
    expect(window[ENGINE_KEY].qualityCalls).toEqual(['saver']);
  });

  it('keeps optional HUD overlays off by default and limits play to one open panel', function() {
    const view = mountTool({ _introShownOnce: true, worldActive: true });
    ['#gw-progress-hud', '#gw-minimap', '#gw-history-panel', '#gw-inventory-panel', '#gw-transform-panel'].forEach(function(selector) {
      expect(view.container.querySelector(selector)).toBeFalsy();
    });

    let dialog = openSettings(view);
    const mapButton = dialog.querySelector('[aria-controls="gw-minimap"]');
    expect(mapButton).toBeTruthy();
    expect(mapButton.getAttribute('aria-pressed')).toBe('false');
    React.act(function() { mapButton.dispatchEvent(new Event('click', { bubbles: true })); });
    expect(view.toolData.geometryWorld.hudPanel).toBe('map');
    expect(view.container.querySelector('#gw-minimap')).toBeTruthy();
    expect(view.container.querySelector('#gw-transform-panel')).toBeFalsy();

    dialog = openSettings(view);
    const transformButton = dialog.querySelector('[aria-controls="gw-transform-panel"]');
    React.act(function() { transformButton.dispatchEvent(new Event('click', { bubbles: true })); });
    expect(view.toolData.geometryWorld.hudPanel).toBe('transform');
    expect(view.container.querySelector('#gw-minimap')).toBeFalsy();
    expect(view.container.querySelector('#gw-transform-panel')).toBeTruthy();

    const close = view.container.querySelector('[aria-label="Hide transform discovery"]');
    React.act(function() { close.dispatchEvent(new Event('click', { bubbles: true })); });
    expect(view.toolData.geometryWorld.hudPanel).toBe('');
    expect(view.container.querySelector('#gw-transform-panel')).toBeFalsy();
  });

  it('applies and restores Minimal, Learning, and Builder HUD presets', function() {
    const key = 'allo.geometryworld.hud.v1';
    let view = mountTool({ _introShownOnce: true, worldActive: true });
    let workspace = view.container.querySelector('#geoworld-fs-workspace');
    let dialog = openSettings(view);
    let presetButtons = Array.from(dialog.querySelectorAll('[data-geometry-hud-preset]'));
    expect(presetButtons.map(function(button) { return button.getAttribute('data-geometry-hud-preset'); })).toEqual(['minimal', 'learning', 'builder']);
    expect(presetButtons.map(function(button) { return button.getAttribute('aria-pressed'); })).toEqual(['true', 'false', 'false']);
    expect(presetButtons.map(function(button) { return button.getAttribute('aria-label'); })).toEqual([
      'Use Minimal HUD: hide optional HUD panels',
      'Use Learning HUD: show lesson progress',
      'Use Builder HUD: show block inventory'
    ]);
    expect(workspace.getAttribute('data-hud-preset')).toBe('minimal');
    expect(workspace.getAttribute('data-toolbar-collapsed')).toBe('false');
    expect(view.container.querySelector('.gw-toolbar')).toBeTruthy();

    const learning = dialog.querySelector('[data-geometry-hud-preset="learning"]');
    React.act(function() { learning.dispatchEvent(new Event('click', { bubbles: true })); });
    expect(view.toolData.geometryWorld).toMatchObject({ hudPreset: 'learning', hudPanel: 'progress' });
    expect(view.container.querySelector('#gw-progress-hud')).toBeTruthy();
    expect(JSON.parse(window.localStorage.getItem(key))).toEqual({ version: 1, preset: 'learning', toolbarCollapsed: false });

    React.act(function() { view.root.unmount(); });
    view.container.remove();
    mounted = null;
    delete window[ENGINE_KEY];
    window[ENGINE_KEY] = makeEngine();
    view = mountTool({ _introShownOnce: true, worldActive: true });
    workspace = view.container.querySelector('#geoworld-fs-workspace');
    expect(workspace.getAttribute('data-hud-preset')).toBe('learning');
    expect(workspace.getAttribute('data-toolbar-collapsed')).toBe('false');
    expect(view.container.querySelector('#gw-progress-hud')).toBeTruthy();

    dialog = openSettings(view);
    const builder = dialog.querySelector('[data-geometry-hud-preset="builder"]');
    React.act(function() { builder.dispatchEvent(new Event('click', { bubbles: true })); });
    expect(view.toolData.geometryWorld).toMatchObject({ hudPreset: 'builder', hudPanel: 'inventory' });
    expect(view.container.querySelector('#gw-progress-hud')).toBeFalsy();
    expect(view.container.querySelector('#gw-inventory-panel')).toBeTruthy();
    expect(view.container.querySelector('#gw-inventory-panel').textContent).toContain('None yet');

    dialog = openSettings(view);
    const minimal = dialog.querySelector('[data-geometry-hud-preset="minimal"]');
    React.act(function() { minimal.dispatchEvent(new Event('click', { bubbles: true })); });
    expect(view.toolData.geometryWorld).toMatchObject({ hudPreset: 'minimal', hudPanel: '' });
    expect(view.container.querySelector('.gw-toolbar')).toBeTruthy();
    expect(view.container.querySelector('#gw-inventory-panel')).toBeFalsy();

    const collapse = view.container.querySelector('.gw-toolbar-collapse');
    React.act(function() { collapse.dispatchEvent(new Event('click', { bubbles: true })); });
    expect(view.toolData.geometryWorld.toolbarCollapsed).toBe(true);
    expect(JSON.parse(window.localStorage.getItem(key))).toEqual({ version: 1, preset: 'minimal', toolbarCollapsed: true });

    React.act(function() { view.root.unmount(); });
    view.container.remove();
    mounted = null;
    delete window[ENGINE_KEY];
    window[ENGINE_KEY] = makeEngine();
    view = mountTool({ _introShownOnce: true, worldActive: true });
    workspace = view.container.querySelector('#geoworld-fs-workspace');
    expect(workspace.getAttribute('data-hud-preset')).toBe('minimal');
    expect(workspace.getAttribute('data-toolbar-collapsed')).toBe('true');
    const reveal = view.container.querySelector('.gw-toolbar-reveal');
    expect(reveal).toBeTruthy();
    React.act(function() { reveal.dispatchEvent(new Event('click', { bubbles: true })); });
    expect(JSON.parse(window.localStorage.getItem(key))).toEqual({ version: 1, preset: 'minimal', toolbarCollapsed: false });
  });

  it('falls back safely when the saved HUD preference is corrupted', function() {
    window.localStorage.setItem('allo.geometryworld.hud.v1', '{not-json');
    const view = mountTool({ _introShownOnce: true, worldActive: true });
    const workspace = view.container.querySelector('#geoworld-fs-workspace');
    expect(workspace.getAttribute('data-hud-preset')).toBe('minimal');
    expect(workspace.getAttribute('data-toolbar-collapsed')).toBe('false');
    expect(view.container.querySelector('#gw-progress-hud')).toBeFalsy();
    const dialog = openSettings(view);
    expect(dialog.querySelectorAll('[data-geometry-hud-preset][aria-pressed="true"]')).toHaveLength(1);
    expect(dialog.querySelector('[data-geometry-hud-preset="minimal"]').getAttribute('aria-pressed')).toBe('true');
  });

  it('treats the textual Scene Map as part of the one-panel HUD contract', function() {
    window[ENGINE_KEY].getSceneOverview = function() {
      return { title: 'Test lesson', structures: [], npcs: [], camera: { x: 0, y: 0, z: 0 }, target: null };
    };
    const view = mountTool({ _introShownOnce: true, worldActive: true, tutorialDismissed: true });
    let dialog = openSettings(view);
    const sceneMap = dialog.querySelector('[aria-controls="gw-scene-map"]');
    React.act(function() { sceneMap.dispatchEvent(new Event('click', { bubbles: true })); });
    expect(view.container.querySelector('#gw-scene-map')).toBeTruthy();

    dialog = openSettings(view);
    const minimap = dialog.querySelector('[aria-controls="gw-minimap"]');
    React.act(function() { minimap.dispatchEvent(new Event('click', { bubbles: true })); });
    expect(view.container.querySelector('#gw-scene-map')).toBeFalsy();
    expect(view.container.querySelector('#gw-minimap')).toBeTruthy();
    expect(view.toolData.geometryWorld.hudPanel).toBe('map');
  });
  it('keeps fullscreen naming, pressed state, and workspace state synchronized', function() {
    let active = null;
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: function() { return active; } });
    const view = mountTool({ _introShownOnce: true, worldActive: true });
    const workspace = view.container.querySelector('#geoworld-fs-workspace');
    let button = Array.from(view.container.querySelectorAll('button')).find(function(node) { return node.getAttribute('aria-label') === 'Enter fullscreen for the Geometry World workspace'; });
    expect(button).toBeTruthy();
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(workspace.getAttribute('data-fullscreen')).toBe('false');
    active = workspace;
    React.act(function() { document.dispatchEvent(new Event('fullscreenchange')); });
    button = Array.from(view.container.querySelectorAll('button')).find(function(node) { return node.getAttribute('aria-label') === 'Exit fullscreen for the Geometry World workspace'; });
    expect(button).toBeTruthy();
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(workspace.getAttribute('data-fullscreen')).toBe('true');
    expect(view.container.querySelector('.gw-fullscreen-quickbar')).toBeTruthy();
    expect(SOURCE).toContain('#geoworld-fs-workspace[data-fullscreen="true"]>.gw-toolbar{display:none!important}');
    expect(SOURCE).toContain('#geoworld-fs-workspace:fullscreen .gw-viewport');
  });

  it('pauses offscreen animation and disconnects the observer during teardown', function() {
    expect(SOURCE).toContain('engine._pausedByViewport');
    expect(SOURCE).toContain('new IntersectionObserver');
    expect(SOURCE).toContain('engine._intersectionObserver.observe(container)');
    expect(SOURCE).toContain('engine._intersectionObserver.disconnect()');
    expect(SOURCE).toContain('engine._pausedByVisibility || engine._pausedByViewport');
    expect(SOURCE).toContain('engine._postFxEnabled !== false');
  });
  it('offers explicit touch and desktop-style modes with a persistent fullscreen toggle', function() {
    const originalUserAgent = navigator.userAgent;
    Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' });
    try {
      const view = mountTool({ _introShownOnce: true, worldActive: true });
      const touchCta = Array.from(view.container.querySelectorAll('button')).find(function(node) { return node.textContent.indexOf('Enter touch mode') >= 0; });
      const desktopCta = Array.from(view.container.querySelectorAll('button')).find(function(node) { return node.textContent.indexOf('Use desktop-style view') >= 0; });
      expect(view.container.querySelector('#gw-mobile-title').textContent).toBe('Touch-ready Geometry World');
      expect(touchCta).toBeTruthy();
      expect(desktopCta).toBeTruthy();
      React.act(function() { desktopCta.dispatchEvent(new Event('click', { bubbles: true })); });
      let toggle = view.container.querySelector('[data-geometry-touch-toggle=true]');
      expect(view.toolData.geometryWorld.touchMode).toBe(false);
      expect(toggle.getAttribute('aria-pressed')).toBe('false');
      expect(view.container.querySelector('#geoworld-fs-workspace').getAttribute('data-touch-mode')).toBe('desktop');
      expect(view.container.querySelector('.gw-touch-controls')).toBeNull();
      React.act(function() { toggle.dispatchEvent(new Event('click', { bubbles: true })); });
      toggle = view.container.querySelector('[data-geometry-touch-toggle=true]');
      expect(view.toolData.geometryWorld.touchMode).toBe(true);
      expect(toggle.getAttribute('aria-pressed')).toBe('true');
      expect(view.container.querySelector('#geoworld-fs-workspace').getAttribute('data-touch-mode')).toBe('touch');
      expect(SOURCE).toContain('isMobile && touchMode && worldActive && engine');
    } finally {
      Object.defineProperty(navigator, 'userAgent', { configurable: true, value: originalUserAgent });
    }
  });


  it('reveals an accessible layer explorer for measured structures', function() {
    const view = mountTool({ _introShownOnce: true, worldActive: true, tutorialDismissed: true, measureResult: { count: 12, L: 2, W: 2, H: 3, boundingVolume: 12, totalVolume: 12, shapeCounts: { cube: 12 }, blocks: [{ x: 0, y: 0, z: 0 }], isComplete: true } });
    const panel = view.container.querySelector('[data-geometry-layer-explorer=true]');
    expect(panel).toBeTruthy();
    const slider = panel.querySelector('#gw-layer-focus');
    expect(slider).toBeTruthy();
    expect(slider.getAttribute('aria-label')).toBe('Layer explorer depth');
    expect(slider.getAttribute('aria-valuetext')).toBe('All layers visible');
    expect(slider.max).toBe('3');
    expect(panel.querySelector('[aria-label="Show all layers"]')).toBeTruthy();
    expect(SOURCE).toContain('engine.setLayerFocus = function(level, silent)');
    expect(SOURCE).toContain('engine.clearLayerFocus = function(silent)');
    expect(SOURCE).toContain('engine._layerExplorerBlocks');
    expect(SOURCE).toContain('engine._layerExplorerMinY');
  });
  it('opens a semantic Scene Map with structure jump actions', function() {
    window[ENGINE_KEY].getSceneOverview = function() {
      return { title: 'Test lesson', structures: [{ index: 0, label: 'Blue prism', type: 'fill', dimensions: { length: 2, width: 3, height: 4 }, origin: { x: 1, y: 2, z: 3 } }], npcs: [{ index: 0, name: 'Guide Ada', prompt: 'Question available' }], camera: { x: 1, y: 2, z: 3 }, target: null };
    };
    window[ENGINE_KEY].focusStructure = function() {};
    const view = mountTool({ _introShownOnce: true, worldActive: true, tutorialDismissed: true });
    openSettings(view);
    let button = view.container.querySelector('[aria-label="Open textual scene map"]');
    expect(button).toBeTruthy();
    expect(button.getAttribute('aria-expanded')).toBe('false');
    React.act(function() { button.dispatchEvent(new Event('click', { bubbles: true })); });
    const panel = view.container.querySelector('#gw-scene-map');
    expect(panel).toBeTruthy();
    expect(panel.querySelector('#gw-scene-map-title').textContent).toBe('Scene map');
    expect(panel.querySelector('[aria-label="View structure: Blue prism"]')).toBeTruthy();
    expect(panel.textContent).toContain('2 × 3 × 4 units');
    expect(panel.textContent).toContain('Guide Ada');
    button = view.container.querySelector('[aria-label="Close textual scene map"]');
    expect(button).toBeTruthy();
    React.act(function() { button.dispatchEvent(new Event('click', { bubbles: true })); });
    expect(view.container.querySelector('#gw-scene-map')).toBeNull();
  });
  it('offers repeatable front, side, top, and free camera evidence views', function() {
    const view = mountTool({ _introShownOnce: true, worldActive: true, tutorialDismissed: true });
    openSettings(view);
    const group = view.container.querySelector('[aria-label="Camera views"]');
    expect(group).toBeTruthy();
    ['Front', 'Side', 'Top', 'Free'].forEach(function(label) {
      const button = group.querySelector('[aria-label="' + label + ' camera view"]');
      expect(button).toBeTruthy();
      expect(button.getAttribute('aria-pressed')).toBe(label === 'Free' ? 'true' : 'false');
    });
    expect(SOURCE).toContain('engine.setViewPreset = function(preset, focusOverride)');
    expect(SOURCE).toContain('getViewPresetTarget');
    expect(SOURCE).toContain("className: 'gw-view-presets'");
    expect(SOURCE).toContain("'aria-label': 'Camera views'");
    expect(SOURCE).toContain("'aria-label': viewPresetLabels[preset] + ' camera view'");
    expect(SOURCE).toContain('engine._viewPresetReturn');
  });
  it('offers a guided explore tour with visible checkpoints and an exit path', function() {
    const view = mountTool({ _introShownOnce: true, worldActive: true, tutorialDismissed: true });
    openSettings(view);
    const button = Array.from(view.container.querySelectorAll('button')).find(function(node) { return node.getAttribute('aria-label') === 'Start guided explore tour'; });
    expect(button).toBeTruthy();
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(SOURCE).toContain('engine.startGuidedTour = function()');
    expect(SOURCE).toContain('engine.stopGuidedTour = function(completed)');
    expect(SOURCE).toContain("className: 'gw-tour-overlay'");
    expect(SOURCE).toContain("'aria-label': 'Guided explore checkpoint'");
    expect(SOURCE).toContain('guidedTourSteps');
    expect(SOURCE).toContain('tourProgress');
    expect(SOURCE).toContain('reducedMotion: guidedTourReducedMotion');
  });
  it('keeps touch controls discoverable and WCAG-sized in source and fullscreen markup', function() {
    expect(SOURCE).toContain("'data-geometry-touch-toggle': 'true'");
    expect(SOURCE).toContain("'aria-label': 'Touch joystick: drag on the left side to move'");
    expect(SOURCE).toContain("'aria-label': 'Touch actions'");
    expect(SOURCE).toContain('.gw-touch-controls button{min-width:56px!important;min-height:56px!important');
    expect(SOURCE).toContain('engine.setTouchControlsEnabled = function(enabled)');
    expect(SOURCE).toContain("'data-touch-mode': touchMode ? 'touch' : 'desktop'");
    expect(SOURCE).toContain('env(safe-area-inset-bottom)');
    expect(SOURCE).toContain('height:100dvh');
    expect(SOURCE).toContain('overscroll-behavior:contain');
    expect(SOURCE).toContain('@media(max-height:520px) and (orientation:landscape)');
    expect(SOURCE).toContain('flex-direction:row!important');
    expect(SOURCE).toContain("canvas.addEventListener('touchcancel'");
    expect(SOURCE).toContain('engine._touchActive = false');
    expect(SOURCE).toContain("canvas.style.touchAction = 'none'");
    expect(SOURCE).toContain("className: 'gw-touch-toggle-label'");
    expect(SOURCE).toContain("touchMode ? 'Touch' : 'Desktop'");
    expect(SOURCE).toContain("className: 'gw-touch-joystick-thumb'");
    expect(SOURCE).toContain("className: 'gw-touch-look-zone'");
    expect(SOURCE).toContain("className: 'gw-touch-look-panel'");
    expect(SOURCE).toContain("className: 'gw-touch-actions'");
    expect(SOURCE).toContain('.gw-touch-controls>.gw-touch-actions');
    expect(SOURCE).not.toContain('.gw-touch-controls > [role="group"]');
    expect(SOURCE).toContain("id: 'gw-touch-look-sensitivity'");
    expect(SOURCE).toContain('engine.setTouchLookSensitivity');
    expect(SOURCE).toContain('updateTouchLookFeedback(dx, dy)');
    expect(SOURCE).toContain('--gw-touch-look-x');
    expect(SOURCE).toContain('.gw-touch-look-reticle{transition:none!important}');
    expect(SOURCE).toContain('updateTouchJoystick(mx, mz, mag)');
    expect(SOURCE).toContain('resetTouchJoystick()');
    expect(SOURCE).toContain('--gw-touch-stick-x');
    expect(SOURCE).toContain('.gw-touch-joystick-thumb{transition:transform 80ms ease-out');
    expect(SOURCE).toContain('.gw-touch-joystick-thumb{transition:none!important}');
  });
});
