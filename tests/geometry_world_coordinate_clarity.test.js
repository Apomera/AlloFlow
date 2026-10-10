import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_geometryworld.js';
const ENGINE_KEY = '__geoWorldEngine';
const PREFERENCE_KEY = 'allo.geometryworld.hud.v1';
let cfg, mounted, source;

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function makeThreeStub() {
  function vector() {
    const value = { x: 0, y: 0, z: 0, w: 0 };
    for (const name of ['set', 'copy', 'add', 'sub', 'subVectors', 'normalize', 'multiplyScalar',
      'applyQuaternion', 'setFromQuaternion', 'crossVectors', 'cross', 'lerp', 'addScaledVector',
      'setY', 'round', 'floor', 'setScalar', 'applyEuler']) value[name] = () => value;
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
  return {
    clearWorld: vi.fn(), scene: { remove() {} }, renderer: { dispose() {}, domElement: document.createElement('canvas') },
    camera: {
      position: { x: -0.1, y: 4.9, z: -2.1, distanceTo: () => 99, set() {}, clone: () => ({ x: -0.1, y: 4.9, z: -2.1 }) },
      quaternion: { x: 0, y: 0, z: 0, w: 1 }, rotation: { x: 0, y: 0, z: 0 },
      getWorldDirection(value) { value.x = 0; value.y = 0; value.z = -1; return value; }, updateProjectionMatrix() {}
    },
    blocks: { '1,1,1': { userData: { blockType: 'stone', shape: 'cube', _measurementLayer: 'student' } } },
    npcs: [], blocksPlaced: 7, sessionLog: [{ type: 'preserved' }], raycaster: null,
    flyMode: false, moveState: {}, velocity: { x: 0, y: 0, z: 0 }, onGround: true,
    _undoStack: [{ id: 'kept-undo' }], _redoStack: [{ id: 'kept-redo' }], _coordAnnounce: false,
    _targetGrid: null, _modalState: {}, _jumpLock: false, _sessionXP: 5, _crosshairTarget: 'none',
    _inWater: false, _inLava: false, _gridHelper: null,
    loadLesson: vi.fn(), logEvent: vi.fn(), undo() {}, redo() {}, returnToSpawn() {},
    clearPlayerBlocks() {}, measureStructure() {}, placeBlock() {}, removeBlock() {},
    applyRenderQuality: preference => ({ label: preference })
  };
}

function mountTool(overrides = {}, engineOverrides = {}) {
  const engine = Object.assign(makeEngine(), engineOverrides); window[ENGINE_KEY] = engine;
  const container = document.createElement('div'); document.body.appendChild(container);
  const toolData = { _threeLoaded: true, geometryWorld: Object.assign({
    _introShownOnce: true, tutorialDismissed: true, worldActive: true, activeLesson: 'areaSurface',
    score: 2, totalQ: 4, answeredNpcs: { 0: true }, npcAnswerDrafts: { 1: { step: 0, text: 'My unfinished explanation' } },
    measureHistory: [{ id: 'kept-record', volume: 7 }], reflectionText: 'I counted equal layers.',
    objectiveChecks: { layers: true }
  }, overrides) };
  let bump;
  const context = makeCtx({ toolData,
    update(section, key, value) { toolData[section] = { ...toolData[section], [key]: value }; if (bump) bump(); },
    updateMulti(section, patch) { toolData[section] = { ...toolData[section], ...patch }; if (bump) bump(); }
  });
  function Host() { const state = React.useState(0); bump = () => state[1](value => value + 1); return cfg.render(context); }
  const root = ReactDOMClient.createRoot(container);
  React.act(() => root.render(React.createElement(Host)));
  mounted = { container, root, engine, bucket: () => toolData.geometryWorld,
    rerender() { React.act(() => bump()); },
    patch(value) { React.act(() => context.updateMulti('geometryWorld', value)); } };
  return mounted;
}

function hud(view) { return view.container.querySelector('.gw-coordinate-hud'); }
function readout(view, kind) { return hud(view).querySelector('.gw-coordinate-readout[data-coordinate-kind="' + kind + '"]'); }
function toggle(view) { return hud(view).querySelector('.gw-coordinate-speech-toggle'); }
function click(node) { expect(node).toBeTruthy(); React.act(() => node.click()); }
function numbers(view, kind) {
  return [...readout(view, kind).querySelectorAll('.gw-coordinate-value')].map(node => node.textContent.trim());
}
function readoutLabel(view, kind) {
  const node = readout(view, kind);
  return node.getAttribute('aria-label') || (node.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean)
    .map(id => view.container.querySelector('#' + id)?.textContent || '').join(' ');
}
function protectedState(view) {
  return structuredClone({
    learning: Object.fromEntries(['activeLesson', 'worldActive', 'score', 'totalQ', 'answeredNpcs',
      'npcAnswerDrafts', 'measureHistory', 'reflectionText', 'objectiveChecks'].map(key => [key, view.bucket()[key]])),
    blocks: view.engine.blocks, blocksPlaced: view.engine.blocksPlaced,
    undo: view.engine._undoStack, redo: view.engine._redoStack, sessionLog: view.engine.sessionLog
  });
}
async function settleAnnouncement(view) {
  await React.act(async () => { await new Promise(resolve => setTimeout(resolve, 45)); });
  view.rerender();
  return document.getElementById('allo-live-geometryworld').textContent;
}
function coordinateHandler(engine, announce, update) {
  const marker = '_docH.keydown = ', start = source.indexOf(marker) + marker.length;
  const end = source.indexOf("        document.addEventListener('keyup'", start);
  expect(start).toBeGreaterThan(marker.length); expect(end).toBeGreaterThan(start);
  const handler = source.slice(start, end).trim().replace(/\);$/, '');
  return new Function('engine', 'setBuildShape', 'upd', 'BLOCK_TYPES', 'focusGameSettingsTrigger',
    'announceToSR', 'setTimeout', 'return (' + handler + ');')(
    engine, vi.fn(), update, [], vi.fn(), announce, vi.fn());
}
function pressC(handler, target = document.createElement('div')) {
  const event = new KeyboardEvent('keydown', { key: 'c', code: 'KeyC', bubbles: true, cancelable: true });
  Object.defineProperty(event, 'target', { value: target }); handler(event); return event;
}

beforeAll(() => {
  source = readFileSync(FILE, 'utf8'); resetStemLab(); window.THREE = makeThreeStub(); cfg = loadTool(FILE, 'geometryWorld');
}, 120000);
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); window.THREE = makeThreeStub();
  if (!document.getElementById('allo-live-geometryworld')) {
    const live = document.createElement('div'); live.id = 'allo-live-geometryworld';
    live.setAttribute('aria-live', 'polite'); live.setAttribute('aria-atomic', 'true'); live.setAttribute('role', 'status');
    document.body.appendChild(live);
  }
});
afterEach(() => {
  if (mounted) { React.act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; }
  vi.restoreAllMocks(); delete window[ENGINE_KEY]; delete window[ENGINE_KEY + '_failed']; document.body.innerHTML = '';
});

describe('Geometry World coordinate inspection clarity', () => {
  it('keeps a native Position disclosure and names the camera readout', () => {
    const view = mountTool();
    expect(hud(view).tagName).toBe('DETAILS');
    const summary = hud(view).querySelector('.gw-coordinate-summary');
    expect(summary.tagName).toBe('SUMMARY'); expect(summary.textContent.trim()).toBe('Position');
    expect(hud(view).textContent).toContain('Camera position');
    expect(readoutLabel(view, 'camera')).toContain('Camera position');
    expect(hud(view).textContent).toMatch(/grid units/i); expect(readout(view, 'camera').tagName).toBe('DL');
  });

  it.each([
    [[-0.1, 4.9, -2.1], ['-1', '4', '-3']],
    [[-3, 0, 8], ['-3', '0', '8']],
    [[12.99, -0.01, 0.99], ['12', '-1', '0']]
  ])('preserves camera cell flooring for position %j', (position, expected) => {
    const view = mountTool(); [view.engine.camera.position.x, view.engine.camera.position.y, view.engine.camera.position.z] = position;
    view.rerender(); expect(numbers(view, 'camera')).toEqual(expected);
  });

  it('distinguishes exact targeted block cells from the floored camera position', () => {
    const target = { x: -48, y: 1, z: 37 }; const view = mountTool({}, { _targetGrid: target });
    expect(hud(view).textContent).toContain('Target block');
    expect(readoutLabel(view, 'target')).toContain('Target block');
    expect(numbers(view, 'target')).toEqual(['-48', '1', '37']);
    expect(numbers(view, 'camera')).toEqual(['-1', '4', '-3']); expect(view.engine._targetGrid).toEqual(target);
  });

  it('omits the target section when there is no aimed block', () => {
    const view = mountTool(); expect(readout(view, 'target')).toBeNull();
    expect(hud(view).textContent).not.toContain('Target block');
  });

  it('uses explicit X, Y and Z axis text rather than color alone', () => {
    const view = mountTool({}, { _targetGrid: { x: 2, y: 1, z: -5 } });
    for (const kind of ['camera', 'target']) {
      const axes = [...readout(view, kind).querySelectorAll('.gw-coordinate-axis')];
      expect(axes.map(node => node.textContent.trim())).toEqual(['X', 'Y', 'Z']);
      expect(axes.map(node => node.dataset.axis)).toEqual(['x', 'y', 'z']);
      expect(axes.every(node => node.getAttribute('aria-hidden') !== 'true')).toBe(true);
      expect(axes.every(node => node.tagName === 'DT')).toBe(true);
      expect([...readout(view, kind).querySelectorAll('.gw-coordinate-value')].every(node => node.tagName === 'DD')).toBe(true);
    }
  });

  it('names the facing readout while retaining direction and degree information', () => {
    const view = mountTool(); const facing = hud(view).querySelector('.gw-coordinate-facing');
    expect(facing.textContent).toContain('Facing'); expect(facing.textContent).toMatch(/S|South/);
    expect(facing.textContent).toContain('180'); expect(facing.textContent).toContain('\u00b0');
  });

  it('uses a native named speech toggle with visible Off state', () => {
    const view = mountTool(); const button = toggle(view);
    expect(button.tagName).toBe('BUTTON'); expect(button.type).toBe('button');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(button.getAttribute('aria-label')).toMatch(/coordinate/i); expect(button.textContent).toContain('Spoken coordinates');
    expect(button.querySelector('strong').textContent).toBe('Off'); expect(button.textContent).not.toMatch(/SR OFF/);
  });

  it('renders an already enabled announcement choice with visible On state', () => {
    const view = mountTool({}, { _coordAnnounce: true });
    expect(toggle(view).getAttribute('aria-pressed')).toBe('true'); expect(toggle(view).querySelector('strong').textContent).toBe('On');
  });

  it('enables speech and immediately announces current position without changing student work', async () => {
    const view = mountTool(); const before = protectedState(view); click(toggle(view));
    expect(view.engine._coordAnnounce).toBe(true);
    const announcement = await settleAnnouncement(view);
    expect(announcement).toMatch(/announcements on/i); expect(announcement).toContain('X -1 Y 4 Z -3');
    expect(toggle(view).getAttribute('aria-pressed')).toBe('true'); expect(toggle(view).querySelector('strong').textContent).toBe('On');
    expect(protectedState(view)).toEqual(before); expect(view.engine.loadLesson).not.toHaveBeenCalled();
  });

  it('disables speech with an immediate announcement and visible Off state', async () => {
    const view = mountTool({}, { _coordAnnounce: true }); const before = protectedState(view); click(toggle(view));
    expect(view.engine._coordAnnounce).toBe(false); const announcement = await settleAnnouncement(view);
    expect(announcement).toMatch(/announcements off/i); expect(toggle(view).getAttribute('aria-pressed')).toBe('false');
    expect(toggle(view).querySelector('strong').textContent).toBe('Off'); expect(protectedState(view)).toEqual(before);
  });

  it('hides and restores coordinates through the saved preference without resetting speech or student work', () => {
    const view = mountTool({}, { _coordAnnounce: true }); const before = protectedState(view);
    click(view.container.querySelector('[data-geometry-settings-trigger="true"]'));
    click(view.container.querySelector('[data-gw-workspace-preference="showCoordinates"]'));
    expect(hud(view)).toBeNull(); expect(view.engine._coordAnnounce).toBe(true);
    expect(JSON.parse(localStorage.getItem(PREFERENCE_KEY)).showCoordinates).toBe(false);
    click(view.container.querySelector('[data-gw-workspace-preference="showCoordinates"]'));
    expect(hud(view)).toBeTruthy(); expect(toggle(view).getAttribute('aria-pressed')).toBe('true');
    expect(JSON.parse(localStorage.getItem(PREFERENCE_KEY)).showCoordinates).toBe(true); expect(protectedState(view)).toEqual(before);
  });

  it.each(['standard', 'large'])('lets %s text styling reach every coordinate label instead of tiny inline overrides', size => {
    const view = mountTool({ uiTextSize: size }, { _targetGrid: { x: 2, y: 1, z: -5 } });
    expect(view.container.querySelector('#geoworld-fs-workspace').dataset.uiTextSize).toBe(size);
    expect(hud(view).querySelector('.gw-coordinate-summary')).toBeTruthy();
    expect(hud(view).querySelector('.gw-coordinate-facing')).toBeTruthy(); expect(toggle(view)).toBeTruthy();
    for (const node of [hud(view), ...hud(view).querySelectorAll('*')]) {
      expect(node.style.fontSize === '' || Number.parseFloat(node.style.fontSize) >= 13).toBe(true);
      expect(node.style.letterSpacing === '' || Number.parseFloat(node.style.letterSpacing) === 0).toBe(true);
    }
  });
});

describe('coordinate speech keeps its keyboard contract', () => {
  it('C toggles the same engine choice and announces the same floored position', () => {
    const engine = makeEngine(), announce = vi.fn(), update = vi.fn(); const handler = coordinateHandler(engine, announce, update);
    pressC(handler); expect(engine._coordAnnounce).toBe(true);
    expect(announce).toHaveBeenLastCalledWith(expect.stringContaining('X -1 Y 4 Z -3'));
    pressC(handler); expect(engine._coordAnnounce).toBe(false);
    expect(announce).toHaveBeenLastCalledWith(expect.stringMatching(/announcements off/i));
  });

  it.each(['input', 'textarea', 'select'])('C in a native %s preserves text entry and the speech choice', tag => {
    const engine = makeEngine(), announce = vi.fn(), update = vi.fn(); const handler = coordinateHandler(engine, announce, update);
    const event = pressC(handler, document.createElement(tag));
    expect(engine._coordAnnounce).toBe(false); expect(announce).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled(); expect(event.defaultPrevented).toBe(false);
  });
});
