import fs from 'node:fs';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Actual React UI and Three scene; only canvas drawing is stubbed in jsdom.
let React, ReactDOM, THREE, act, gl, now = 0, frameId = 0;
const frames = new Map(), apps = [];
const KEY = '[data-pt-model-depth-key]', SCENE_KEY = '[data-pt-scene-key]';
const NOTE = '[data-pt-depth-guide-note]', BLOCK = '[data-tect-gl]';
const labels = ['Shallow: less than 70 km', 'Intermediate: 70 to less than 300 km', 'Deep: 300–700 km'];
const colors = { light: ['#be123c', '#c2410c', '#6d28d9'], dark: ['#fb7185', '#fdba74', '#c4b5fd'] };
const saved = { version: 1, angle: 42, points: Array.from({ length: 8 }, (_, i) => ({ x: 100.125 + i * 45, z: 100.625 + i * 40, m: 4 })) };
const actEnvironmentStates = [...new Set([window, globalThis])].map(target => ({ target, descriptor: Object.getOwnPropertyDescriptor(target, 'IS_REACT_ACT_ENVIRONMENT') }));

beforeAll(() => {
  for (const { target } of actEnvironmentStates) target.IS_REACT_ACT_ENVIRONMENT = true;
  const context = new Proxy({}, { get: (_, key) => key === 'measureText' ? text => ({ width: String(text).length * 10 }) : () => ({ addColorStop() {} }) });
  window.HTMLCanvasElement.prototype.getContext = () => context;
  for (const [key, value] of [['offsetWidth', 540], ['offsetHeight', 400], ['clientWidth', 540], ['clientHeight', 300]]) {
    Object.defineProperty(window.HTMLElement.prototype, key, { configurable: true, get: () => value });
  }
  window.SVGElement.prototype.getBoundingClientRect = function () {
    const height = Number((this.getAttribute('viewBox') || '0 0 460 354').split(' ')[3]);
    return { width: 460, height, x: 0, y: 0, left: 0, top: 0, right: 460, bottom: height };
  };
  if (!window.HTMLElement.prototype.scrollIntoView) Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', { configurable: true, writable: true, value() {} });
  window.requestAnimationFrame = globalThis.requestAnimationFrame = callback => { frames.set(++frameId, callback); return frameId; };
  window.cancelAnimationFrame = globalThis.cancelAnimationFrame = id => frames.delete(id);
  window.ResizeObserver = globalThis.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} };
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  for (const file of ['desktop/web-app/node_modules/react/umd/react.development.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js', 'vendor/three-r128/three.min.js']) (0, eval)(fs.readFileSync(file, 'utf8'));
  React = window.React; ReactDOM = window.ReactDOM; THREE = window.THREE; act = React.act || React.unstable_act;
  THREE.WebGLRenderer = class {
    constructor(options) { this.domElement = options.canvas; }
    setClearColor() {} setPixelRatio() {} setSize() {} dispose() {}
    getContext() { return { isContextLost: () => false }; }
    render(scene, camera) { scene.updateMatrixWorld(true); camera.updateMatrixWorld(true); }
  };
  (0, eval)(fs.readFileSync('stem_lab/stem_lab_module.js', 'utf8'));
  window.StemLab.ensureThree = () => Promise.resolve(THREE);
  (0, eval)(fs.readFileSync(process.env.PT_TEST_SOURCE || 'stem_lab/stem_tool_platetectonics.js', 'utf8'));
  gl = window.__alloTectGL;
});
beforeEach(() => {
  frames.clear(); now = 0;
  for (const clock of new Set([globalThis.performance, window.performance])) vi.spyOn(clock, 'now').mockImplementation(() => now);
});
afterEach(() => {
  while (apps.length) { const app = apps.pop(); act(() => app.root.unmount()); app.host.remove(); }
  gl?.unmount(); frames.clear(); vi.restoreAllMocks();
});
afterAll(() => {
  for (const { target, descriptor } of actEnvironmentStates) {
    if (descriptor) Object.defineProperty(target, 'IS_REACT_ACT_ENVIRONMENT', descriptor);
    else delete target.IS_REACT_ACT_ENVIRONMENT;
  }
});

function mount(darkMode = false) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOM.createRoot(host), effects = Object.fromEntries(['onRecordSlab', 'onRecordDepths', 'onRecordBoundaryInquiry', 'onRecordBoundaryDraft', 'awardXP', 'beep', 'announceToSR'].map(key => [key, vi.fn()]));
  const render = darkMode => act(() => root.render(React.createElement(React.StrictMode, null,
    React.createElement(window.AlloTectonicsInteractive, { darkMode, savedSlab: saved, ...effects }))));
  render(darkMode);
  const query = selector => host.querySelector(selector), all = selector => [...host.querySelectorAll(selector)];
  const click = selector => act(() => { const node = query(selector); expect(node).not.toBeNull(); node.click(); });
  const key = (key, shiftKey = false) => act(() => query(BLOCK).dispatchEvent(new window.KeyboardEvent('keydown', { bubbles: true, cancelable: true, key, shiftKey })));
  const app = { host, root, effects, query, all, click, key, render }; apps.push(app); return app;
}
function frame(count = 1) {
  for (let i = 0; i < count; i++) {
    now += 1000;
    act(() => { for (const [id, callback] of [...frames]) if (frames.delete(id)) callback(now); });
  }
}
async function flush() { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); }
async function ready3D(app) { app.click('[data-tect-view="3d"]'); await flush(); frame(); expect(gl.isReady()).toBe(true); expect(app.query(BLOCK).getAttribute('aria-hidden')).toBe('false'); }
async function projectSample(app) {
  act(() => { const log = app.query('[data-pt-quake-log]'); log.open = true; log.dispatchEvent(new window.Event('toggle', { bubbles: true })); });
  app.click('[data-pt-quake-sample-project]'); await flush(); frame(); expect(gl.isReady()).toBe(true);
}
function clearEffects(app) { for (const callback of Object.values(app.effects)) callback.mockClear(); }
function quiet(app) { for (const callback of Object.values(app.effects)) expect(callback).not.toHaveBeenCalled(); }
function describedIds(app) { return (app.query(BLOCK)?.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean); }
function expectGuide(app, visible) {
  expect(app.all(NOTE)).toHaveLength(visible ? 1 : 0);
  expect(describedIds(app).includes('tect-depth-guide-note')).toBe(visible);
  if (visible) {
    const note = app.query(NOTE); expect(note.id).toBe('tect-depth-guide-note');
    expect(note.textContent).toContain('70'); expect(note.textContent).toContain('300'); expect(note.textContent.toLowerCase()).toContain('dashed');
    expect(app.query(SCENE_KEY).contains(note)).toBe(true);
  }
  for (const id of describedIds(app)) expect(app.query('#' + id)).not.toBeNull();
}
function normalizedColor(value) { const span = document.createElement('span'); span.style.backgroundColor = value; return span.style.backgroundColor; }
function expectDepthKey(app, darkMode = false) {
  expect(app.all(SCENE_KEY)).toHaveLength(1); expect(app.all(KEY)).toHaveLength(1);
  const panel = app.query(SCENE_KEY), key = app.query(KEY), bands = [...key.children];
  expect(panel.querySelector('h3,h4,h5,h6').textContent).toBe('Earthquake depth key');
  expect(panel.contains(key)).toBe(true); expect(bands).toHaveLength(3); expect(bands.map(band => band.textContent)).toEqual(labels);
  bands.forEach((band, i) => {
    const swatch = band.querySelector('span'); expect(swatch.getAttribute('aria-hidden')).toBe('true');
    expect(swatch.style.backgroundColor).toBe(normalizedColor(colors[darkMode ? 'dark' : 'light'][i]));
  });
  expect(panel.querySelector('button,input,select')).toBeNull();
  expect(panel.getAttribute('aria-live')).not.toBe('polite'); expect(panel.getAttribute('aria-live')).not.toBe('assertive');
}
function evidence(app) {
  return {
    time: app.query('[data-pt-model-reading="time"]').textContent,
    movement: app.query('[data-pt-model-reading="movement"]').textContent,
    play: app.query('[data-pt-model-play]').textContent,
    dip: app.query('#pt-ql-dip')?.value,
    fit: app.query('[data-pt-quake-fit]')?.textContent,
    points: app.all('[data-pt-quake-point]').map(point => [point.dataset.distanceKm, point.dataset.depthKm]),
    selected: app.query('[data-pt-quake-model-values]')?.textContent
  };
}

describe('A nearby earthquake depth key and truthful side-view guidance', () => {
  it('places one unchanged three-band key directly after the model, ahead of the projection and feature panels', async () => {
    const app = mount(); expectDepthKey(app); expectGuide(app, false);
    expect(app.query('#pt-quake-model-frame').nextElementSibling).toBe(app.query(SCENE_KEY));
    expect(app.query(SCENE_KEY).nextElementSibling).toBe(app.query('[data-pt-boundary-inspector]'));
    await projectSample(app); expectDepthKey(app);
    expect(app.query('#pt-quake-model-frame').nextElementSibling).toBe(app.query(SCENE_KEY));
    expect(app.query(SCENE_KEY).nextElementSibling).toBe(app.query('[data-pt-quake-projection-panel]'));
    expect(app.query('[data-pt-quake-projection-panel]').nextElementSibling).toBe(app.query('[data-pt-boundary-inspector]'));
    expect(app.query('[data-pt-quake-sample-counts]').dataset.total).toBe('8');
  });

  it('connects the dashed depth-guide explanation to the active side-view canvas', async () => {
    const app = mount(); expectGuide(app, false); await ready3D(app);
    app.click('[data-tect-preset="section"]'); expectGuide(app, true);
    const block = app.query(BLOCK); expect(block.tabIndex).toBe(0); expect(block.getAttribute('aria-hidden')).toBe('false');
    expect(app.query('[data-tect-scale-toggle]').getAttribute('aria-pressed')).toBe('true');
    app.click('[data-tect-view="2d"]'); expectGuide(app, false); expectDepthKey(app);
    expect(app.query('[data-tect-section]').getAttribute('aria-hidden')).toBe('false');
  });

  it('removes the depth-guide description when the learner hides the scale and preserves that choice through a view round trip', async () => {
    const app = mount(); await ready3D(app); app.click('[data-tect-preset="section"]'); expectGuide(app, true);
    const before = evidence(app); app.click('[data-tect-scale-toggle]'); expectGuide(app, false);
    expect(app.query('[data-tect-scale-toggle]').getAttribute('aria-pressed')).toBe('false');
    app.click('[data-tect-view="2d"]'); expectGuide(app, false); await ready3D(app); expectGuide(app, false);
    expect(app.query('[data-tect-scale-toggle]').getAttribute('aria-pressed')).toBe('false');
    app.click('[data-tect-scale-toggle]'); expectGuide(app, true); expect(evidence(app)).toEqual(before);
    clearEffects(app); expectDepthKey(app); quiet(app);
  });

  it('suppresses the guide note in the overhead preset and after keyboard tilting, restoring it in a side view', async () => {
    const app = mount(); await ready3D(app); app.click('[data-tect-preset="section"]'); expectGuide(app, true);
    app.click('[data-tect-preset="surface"]'); expectGuide(app, false); expectDepthKey(app);
    expect(app.query('[data-tect-scale-toggle]').disabled).toBe(true);
    app.click('[data-tect-preset="oblique"]'); expectGuide(app, true);
    for (let i = 0; i < 4; i++) app.key('ArrowUp', true);
    expectGuide(app, false); expect(app.query('[data-tect-scale-toggle]').disabled).toBe(true);
    app.click('[data-tect-preset="section"]'); expectGuide(app, true);
  });

  it('retains all depth ranges and theme colors while changing among the three boundary models', async () => {
    const app = mount(); await ready3D(app); app.click('[data-tect-preset="section"]');
    for (const darkMode of [false, true, false]) {
      app.render(darkMode);
      for (const mode of ['convergent', 'divergent', 'transform']) {
        app.click('[data-tect-mode="' + mode + '"]');
        expect(app.query('[data-pt-model-readings]').dataset.ptModelReadings).toBe(mode);
        expectDepthKey(app, darkMode); expectGuide(app, true);
        clearEffects(app); const text = app.query(KEY).textContent; expect(text).toBe(labels.join('')); quiet(app);
      }
    }
  });

  it('declares usable arrow and Home shortcuts and keeps them bound to the existing camera controls', async () => {
    const app = mount(); await ready3D(app); app.click('[data-tect-preset="section"]');
    const block = app.query(BLOCK), shortcuts = block.getAttribute('aria-keyshortcuts').split(/\s+/);
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home']) expect(shortcuts).toContain(key);
    clearEffects(app); const before = evidence(app);
    const view = () => block.dataset.tectView.split(',').map(Number);
    expect(view()).toEqual([0, 0, 1]);
    app.key('ArrowLeft'); expect(view()).toEqual([0, -8, 1]);
    app.key('ArrowRight'); expect(view()).toEqual([0, 0, 1]);
    app.key('ArrowUp'); expect(view()).toEqual([-8, 0, 1]);
    app.key('ArrowDown'); expect(view()).toEqual([0, 0, 1]); quiet(app);
    app.key('Home'); expect(view()).toEqual([-22, -38, 1]);
    expect(app.effects.announceToSR.mock.calls.map(call => call[0])).toEqual(['Block view reset.']);
    clearEffects(app); expect(evidence(app)).toEqual(before); expectDepthKey(app); expectGuide(app, true); quiet(app);
  });

  it('keeps a checked event, reading focus and every effect quiet while the paused learner rereads the nearby key', async () => {
    const app = mount(true); await projectSample(app);
    const select = app.query('[data-pt-quake-model-select]');
    act(() => { Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(select, '2'); select.dispatchEvent(new window.Event('change', { bubbles: true })); });
    expect(app.query('[data-pt-quake-model-distance]').textContent).toBe(String(saved.points[2].x));
    expect(app.query('[data-pt-quake-model-depth]').textContent).toBe(String(saved.points[2].z));
    const block = app.query(BLOCK); block.focus(); const before = evidence(app), key = app.query(SCENE_KEY), text = key.textContent, view = block.dataset.tectView;
    const focus = vi.spyOn(window.HTMLElement.prototype, 'focus'), scroll = vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView');
    clearEffects(app);
    for (let i = 0; i < 3; i++) { expectDepthKey(app, true); expect(app.query(KEY).textContent).toBe(labels.join('')); }
    frame(1200);
    expect(app.query(SCENE_KEY)).toBe(key); expect(key.textContent).toBe(text); expect(evidence(app)).toEqual(before);
    expect(block.dataset.tectView).toBe(view); expect(document.activeElement).toBe(block);
    expect(app.query('[data-pt-quake-sample-counts]').dataset.total).toBe('8');
    expect(focus).not.toHaveBeenCalled(); expect(scroll).not.toHaveBeenCalled(); quiet(app);
  });
});
