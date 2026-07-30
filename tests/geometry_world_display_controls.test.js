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

beforeAll(function() {
  resetStemLab();
  window.THREE = makeThreeStub();
  cfg = loadTool(FILE, 'geometryWorld');
});

beforeEach(function() {
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
  });

  it('renders and persists an accessible graphics-quality selector', function() {
    const view = mountTool({ _introShownOnce: true, worldActive: true });
    let select = view.container.querySelector('[data-geometry-render-quality=true]');
    expect(select).toBeTruthy();
    expect(select.getAttribute('aria-label')).toBe('3D graphics quality');
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
    expect(window[ENGINE_KEY].qualityCalls).toEqual(['saver']);
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
  });

  it('pauses offscreen animation and disconnects the observer during teardown', function() {
    expect(SOURCE).toContain('engine._pausedByViewport');
    expect(SOURCE).toContain('new IntersectionObserver');
    expect(SOURCE).toContain('engine._intersectionObserver.observe(container)');
    expect(SOURCE).toContain('engine._intersectionObserver.disconnect()');
    expect(SOURCE).toContain('engine._pausedByVisibility || engine._pausedByViewport');
    expect(SOURCE).toContain('engine._postFxEnabled !== false');
  });
});
