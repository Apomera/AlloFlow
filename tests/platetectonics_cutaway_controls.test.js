import fs from 'node:fs';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Real React events and Three geometry/camera; Chromium separately checks the
// native range interaction, wrapping, keyboard activation and painted controls.
let React, ReactDOM, THREE, act, gl, renderedCamera, now = 0, frameId = 0, renders = 0;
const frames = new Map(), apps = [];
const BLOCK = '[data-tect-gl]', POSITION = '[data-tect-cut-position]';
const endpoint = id => '[data-tect-cut-endpoint="' + id + '"]';
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
    render(scene, camera) { renders++; scene.updateMatrixWorld(true); camera.updateMatrixWorld(true); renderedCamera = camera; }
  };
  (0, eval)(fs.readFileSync('stem_lab/stem_lab_module.js', 'utf8'));
  window.StemLab.ensureThree = () => Promise.resolve(THREE);
  (0, eval)(fs.readFileSync('stem_lab/stem_tool_platetectonics.js', 'utf8'));
  gl = window.__alloTectGL;
});
beforeEach(() => {
  frames.clear(); now = 0; renders = 0; renderedCamera = null;
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
  const key = key => act(() => query(BLOCK).dispatchEvent(new window.KeyboardEvent('keydown', { bubbles: true, cancelable: true, key })));
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
  const select = app.query('[data-pt-quake-model-select]');
  act(() => { Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(select, '2'); select.dispatchEvent(new window.Event('change', { bubbles: true })); });
  frame();
  expect(app.query('[data-pt-quake-model-distance]').textContent).toBe(String(saved.points[2].x));
  expect(app.query('[data-pt-quake-model-depth]').textContent).toBe(String(saved.points[2].z));
}
function setCut(app, value) {
  const slider = app.query('#tect-cut');
  act(() => { Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(slider, String(value)); slider.dispatchEvent(new window.Event('input', { bubbles: true })); });
  frame();
}
function expectPosition(app, value) {
  expect(app.query('#tect-cut').value).toBe(String(value));
  expect(app.query(POSITION).textContent).toBe('Cut position: ' + value + ' / 100');
  expect(app.query(POSITION).getAttribute('aria-live')).toBe('off');
  expect(app.query(endpoint('center')).getAttribute('aria-pressed')).toBe(String(value === 0));
  expect(app.query(endpoint('whole')).getAttribute('aria-pressed')).toBe(String(value === 100));
}
function clearEffects(app) { for (const callback of Object.values(app.effects)) callback.mockClear(); }
function quiet(app) { for (const callback of Object.values(app.effects)) expect(callback).not.toHaveBeenCalled(); }
function cameraSnapshot() {
  expect(renderedCamera?.isPerspectiveCamera).toBe(true);
  return { position: renderedCamera.position.toArray(), quaternion: renderedCamera.quaternion.toArray(), projection: renderedCamera.projectionMatrix.elements.slice() };
}
function evidence(app) {
  return {
    time: app.query('[data-pt-model-reading="time"]').textContent,
    movement: app.query('[data-pt-model-reading="movement"]').textContent,
    play: app.query('[data-pt-model-play]').textContent,
    dip: app.query('#pt-ql-dip')?.value,
    fit: app.query('[data-pt-quake-fit]')?.textContent,
    points: app.all('[data-pt-quake-point]').map(point => [point.dataset.distanceKm, point.dataset.depthKm]),
    selected: {
      index: app.query('[data-pt-quake-model-values]')?.getAttribute('data-pt-quake-model-values'),
      distance: app.query('[data-pt-quake-model-distance]')?.textContent,
      depth: app.query('[data-pt-quake-model-depth]')?.textContent
    }
  };
}
function geometrySnapshot() {
  const builds = gl.debug().geometryBuilds;
  expect(Number.isInteger(builds)).toBe(true);
  expect(builds).toBeGreaterThan(0);
  return builds;
}

describe('Cutaway positions preserve the learner’s chosen view', () => {
  it('synchronizes direct slider changes, the visible position and exact endpoint selection', async () => {
    const app = mount(); await ready3D(app); expectPosition(app, 100);
    clearEffects(app);
    for (const value of [0, 37, 99, 100]) {
      setCut(app, value); expectPosition(app, value);
      if (value === 100) expect(app.query('#tect-cut').getAttribute('aria-valuetext')).toBe('Cutaway: off');
      else expect(app.query('#tect-cut').getAttribute('aria-valuetext')).toContain('Cut position ' + value + ' of 100');
    }
    expect(app.query('[data-tect-cut-endpoints]').getAttribute('role')).toBe('group');
    for (const id of ['center', 'whole']) {
      const button = app.query(endpoint(id));
      expect(button.getAttribute('aria-controls')).toBe('pt-boundary-3d');
      expect(button.getAttribute('aria-describedby')).toBe('tect-cut-help');
      expect(button.style.minHeight).toBe('44px');
    }
    quiet(app);
  });

  it('changes only the cut after rotation and zoom while keeping a checked event and its geometry', async () => {
    const app = mount(true); await projectSample(app);
    const initialCamera = cameraSnapshot(); app.key('ArrowLeft'); frame();
    expect(cameraSnapshot()).not.toEqual(initialCamera);
    const rotatedCamera = cameraSnapshot(); app.click('[data-tect-zoom="in"]'); frame();
    expect(cameraSnapshot()).not.toEqual(rotatedCamera);
    const view = cameraSnapshot(), before = evidence(app), geometry = geometrySnapshot(), frozen = JSON.stringify(saved);
    clearEffects(app);
    for (const id of ['whole', 'center', 'whole', 'center']) {
      app.click(endpoint(id)); frame(); expectPosition(app, id === 'whole' ? 100 : 0);
      expect(cameraSnapshot()).toEqual(view); expect(evidence(app)).toEqual(before); expect(geometrySnapshot()).toEqual(geometry);
      const debug = gl.debug(), exposed = id === 'center';
      expect(app.query('[data-pt-quake-projection-status]').getAttribute('data-pt-quake-projection-status')).toBe(exposed ? 'exposed' : 'cut-face');
      expect(app.query('[data-pt-quake-model-visibility]').textContent).toContain(exposed
        ? 'The hollow cyan diamond marks this sample event projected onto the cut face.'
        : 'This view hides the projection. Show the event on an exposed cut face');
      expect(app.query('[data-pt-quake-sample-status]').textContent).toContain(exposed
        ? 'Small hollow circles project this sample onto the cut face.'
        : 'This view hides the sample projection. Show the sample on an exposed cut face');
      if (exposed) expect(app.query('[data-pt-quake-projection-reveal]')).toBeNull();
      else expect(app.query('[data-pt-quake-projection-reveal]')).not.toBeNull();
      expect(debug.observationProjection.visible).toBe(exposed);
      expect(debug.observationProjection.reason).toBe(exposed ? 'exposed' : 'cut-face');
      expect(debug.observationSample.visible).toBe(exposed);
      expect(debug.observationSample.total).toBe(8);
      expect(debug.observationProjection.index).toBe(2);
      expect(debug.observationProjection.distanceKm).toBe(saved.points[2].x);
      expect(debug.observationProjection.depthKm).toBe(saved.points[2].z);
      expect(debug.observationProjection.captured).toBe(true);
      if (exposed) expect(debug.observationProjection.point).toHaveLength(3);
      else expect(debug.observationProjection.point).toBeNull();
    }
    expect(JSON.stringify(saved)).toBe(frozen); quiet(app);
  });

  it('keeps repeated active endpoint presses and 1,200 paused frames free of draws or callbacks', async () => {
    const app = mount(); await projectSample(app);
    for (const id of ['whole', 'center']) {
      app.click(endpoint(id)); frame(); expectPosition(app, id === 'whole' ? 100 : 0);
      const button = app.query(endpoint(id)); button.focus();
      const before = evidence(app), view = cameraSnapshot(), geometry = geometrySnapshot(), renderCount = renders;
      clearEffects(app);
      for (let i = 0; i < 6; i++) app.click(endpoint(id));
      frame(600);
      expect(renders).toBe(renderCount); expect(cameraSnapshot()).toEqual(view); expect(evidence(app)).toEqual(before);
      expect(geometrySnapshot()).toEqual(geometry); expect(document.activeElement).toBe(button); quiet(app);
    }
  });

  it('keeps endpoint state aligned with view presets, boundary changes and the 2D round trip', async () => {
    const app = mount(); expect(app.query(POSITION)).toBeNull(); await ready3D(app);
    for (const [preset, value] of [['section', 0], ['surface', 100], ['oblique', 100]]) {
      app.click('[data-tect-preset="' + preset + '"]'); frame(); expectPosition(app, value);
    }
    setCut(app, 37);
    for (const mode of ['divergent', 'transform', 'convergent']) {
      app.click('[data-tect-mode="' + mode + '"]'); frame(); expectPosition(app, 37);
    }
    app.click('[data-tect-view="2d"]'); expect(app.query(POSITION)).toBeNull(); expect(app.query('[data-tect-cut-endpoints]')).toBeNull();
    await ready3D(app); expectPosition(app, 37);
    app.click(endpoint('center')); frame(); expectPosition(app, 0);
    app.render(true); frame(); expectPosition(app, 0);
    app.click('[data-tect-preset="surface"]'); frame(); expectPosition(app, 100);
  });
});
