import fs from 'node:fs';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Actual React UI and Three scene. jsdom stubs drawing; native summary keyboard
// activation and painted swatches are checked separately in Chromium.
let React, ReactDOM, THREE, act, gl, renderedCamera, now = 0, frameId = 0, renders = 0;
const frames = new Map(), apps = [];
const SCENE_KEY = '[data-pt-scene-key]', BLOCK = '[data-tect-gl]';
const ROCK_KEY = '[data-tect-rock-details]', CONTENT = '[data-tect-block-guide-detail]';
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
  frames.clear(); now = 0; renders = 0;
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
}
function setOpen(app, open) {
  act(() => { const details = app.query(ROCK_KEY); details.open = open; details.dispatchEvent(new window.Event('toggle')); });
  expect(app.query(ROCK_KEY).open).toBe(open);
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
    selected: app.query('[data-pt-quake-model-values]')?.textContent
  };
}
function expectRockRows(app) {
  const details = app.query(ROCK_KEY), content = details.querySelector(CONTENT);
  expect(content).not.toBeNull(); expect(content.tagName).toBe('DL');
  const rows = [...content.querySelectorAll('[data-pt-rock-row]')];
  expect(rows.map(row => row.dataset.ptRockRow)).toEqual(['motion', 'lithosphere', 'mantle', 'earthquakes']);
  for (const row of rows) {
    const term = row.querySelector('dt'), meaning = row.querySelector('dd');
    expect(term?.textContent.trim().length).toBeGreaterThan(0);
    expect(meaning?.textContent.trim().length).toBeGreaterThan(10);
    const swatch = term.querySelector('[data-pt-rock-swatch="' + row.dataset.ptRockRow + '"]');
    expect(swatch, row.dataset.ptRockRow + ' has a decorative visual key').not.toBeNull();
    expect(swatch.getAttribute('aria-hidden')).toBe('true');
  }
  expect(rows[0].textContent).toMatch(/A/); expect(rows[0].textContent).toMatch(/B/);
  expect(rows[0].textContent).toMatch(/motion/i);
  expect(rows[1].textContent).toContain('Plate (lithosphere)');
  expect(rows[1].textContent).toContain('Crust: light upper band');
  expect(rows[1].textContent).toContain('Uppermost mantle: darker band below');
  expect(rows[1].textContent).toContain('These layers together form one tectonic plate.');
  expect(rows[2].textContent).toMatch(/solid/i); expect(rows[2].textContent).toMatch(/slow/i);
  expect(rows[3].textContent).toMatch(/earthquake/i); expect(rows[3].textContent).toMatch(/location/i);
  expect(details.querySelector('[aria-live="polite"],[aria-live="assertive"]')).toBeNull();
}

describe('A nearby visual key for plate layers and motion', () => {
  it('puts one native collapsed rock key beside the depth key with textual meanings for every swatch', async () => {
    const app = mount(); expect(app.all(ROCK_KEY)).toHaveLength(0);
    await ready3D(app);
    expect(app.all(ROCK_KEY)).toHaveLength(1);
    const details = app.query(ROCK_KEY), panel = app.query(SCENE_KEY);
    expect(details.tagName).toBe('DETAILS'); expect(details.open).toBe(false);
    expect(details.firstElementChild.tagName).toBe('SUMMARY');
    expect(details.firstElementChild.textContent).toBe('Read the rock and motion key');
    expect(panel.contains(details)).toBe(true);
    expect(app.query('#pt-quake-model-frame').nextElementSibling).toBe(panel);
    expect(panel.nextElementSibling).toBe(app.query('[data-pt-boundary-inspector]'));
    expect(panel.querySelector('h4').textContent).toBe('Earthquake depth key');
    expect(app.all('[data-pt-model-depth-key]')).toHaveLength(1);
    expectRockRows(app);
  });

  it('keeps the selected checked event, camera and effects unchanged while the learner repeatedly reads the rock key', async () => {
    const app = mount(true); await projectSample(app);
    const select = app.query('[data-pt-quake-model-select]');
    act(() => { Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(select, '2'); select.dispatchEvent(new window.Event('change', { bubbles: true })); });
    expect(app.query('[data-pt-quake-model-distance]').textContent).toBe(String(saved.points[2].x));
    expect(app.query('[data-pt-quake-model-depth]').textContent).toBe(String(saved.points[2].z));
    const originalCamera = cameraSnapshot(); app.key('ArrowLeft'); frame();
    expect(cameraSnapshot()).not.toEqual(originalCamera);
    const details = app.query(ROCK_KEY), summary = details.querySelector('summary');
    summary.focus();
    const before = evidence(app), view = cameraSnapshot(), geometryBuilds = gl.debug().geometryBuilds, renderCount = renders;
    const focus = vi.spyOn(window.HTMLElement.prototype, 'focus'), scroll = vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView');
    clearEffects(app);
    for (let i = 0; i < 6; i++) { setOpen(app, true); expectRockRows(app); setOpen(app, false); }
    setOpen(app, true); frame(1200);
    expect(app.query(ROCK_KEY)).toBe(details); expect(details.open).toBe(true);
    expect(evidence(app)).toEqual(before); expect(cameraSnapshot()).toEqual(view);
    expect(gl.debug().geometryBuilds).toBe(geometryBuilds); expect(renders).toBe(renderCount);
    expect(document.activeElement).toBe(summary); expect(focus).not.toHaveBeenCalled(); expect(scroll).not.toHaveBeenCalled();
    expect(app.query('[data-pt-quake-sample-counts]').dataset.total).toBe('8'); quiet(app);
  });

  it('retains the open key through boundary and theme changes and hides it with the 3D view', async () => {
    const app = mount(); await ready3D(app); setOpen(app, true);
    const details = app.query(ROCK_KEY);
    const cues = { convergent: /sinking slab beneath the volcanic arc/i, divergent: /wider ridge around it is new, cooling rock/i, transform: /separation is schematic and stops at the picture limit/i };
    const kinds = { convergent: ['oceanic', 'continental'], divergent: ['oceanic', 'oceanic'], transform: ['continental', 'continental'] };
    for (const darkMode of [false, true, false]) {
      app.render(darkMode);
      for (const mode of ['convergent', 'divergent', 'transform']) {
        app.click('[data-tect-mode="' + mode + '"]'); frame();
        expect(app.query(ROCK_KEY)).toBe(details); expect(details.open).toBe(true);
        expectRockRows(app);
        expect([...details.querySelectorAll('[data-pt-rock-swatch="lithosphere"] [data-pt-rock-kind]')].map(swatch => swatch.dataset.ptRockKind)).toEqual(kinds[mode]);
        expect(details.querySelector('[data-pt-rock-boundary-cue]').textContent).toMatch(cues[mode]);
      }
    }
    app.click('[data-tect-view="2d"]');
    expect(app.all(ROCK_KEY)).toHaveLength(0); expect(app.all('[data-pt-model-depth-key]')).toHaveLength(1);
    await ready3D(app); expect(app.query(ROCK_KEY).open).toBe(false); expectRockRows(app);
  });
});
