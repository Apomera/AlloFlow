// Bird Lab Field Observation: the tracking step must meet WCAG 2.2.1 Timing
// Adjustable. Untimed is the default; the 30-second window is an opt-in
// challenge that can be extended ("More time") or turned off mid-run, and the
// reticle can be aimed with the arrow keys.
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const MODULES_DIR = ['desktop/web-app/node_modules', 'node_modules']
  .map((p) => resolve(process.cwd(), p))
  .find((p) => existsSync(resolve(p, 'react')));
if (!MODULES_DIR) throw new Error('birdlab_field_observation_timing: no vendored React found');
const React = require(resolve(MODULES_DIR, 'react'));
const ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
const { act } = require(resolve(MODULES_DIR, 'react-dom/test-utils'));

function loadBirdLab() {
  const reg = {
    _registry: {}, _order: [],
    registerTool(id, config) { config.id = id; this._registry[id] = config; this._order.push(id); },
    isRegistered(id) { return !!this._registry[id]; },
    loadScriptResilient() { return new Promise(() => {}); },
    ensureThree() { return new Promise(() => {}); },
    getRegisteredTools() { return this._order.map((id) => this._registry[id]); },
    renderTool(id, ctx) { const t = this._registry[id]; return t && t.render ? t.render(ctx) : null; },
  };
  window.StemLab = reg; globalThis.StemLab = reg;
  if (!window.React) window.React = React;
  if (!globalThis.React) globalThis.React = React;
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_birdlab.js'), 'utf8'))();
  return reg._registry.birdLab;
}

const ctxStub = new Proxy({}, { get: () => () => ctxStub });
HTMLCanvasElement.prototype.getContext = function () { return ctxStub; };
if (!global.requestAnimationFrame) global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16);
if (!global.cancelAnimationFrame) global.cancelAnimationFrame = (id) => clearTimeout(id);
const noop = () => {};

function mount(cfg) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const Icons = new Proxy({}, { get: () => () => React.createElement('span', { 'aria-hidden': 'true' }) });
  function Harness() {
    const [toolData, setToolData] = React.useState({ birdLab: { view: 'fieldObs' } });
    const update = (toolId, key, val) => setToolData((p) => ({ ...p, [toolId]: { ...(p[toolId] || {}), [key]: val } }));
    const updateMulti = (toolId, obj) => setToolData((p) => ({ ...p, [toolId]: { ...(p[toolId] || {}), ...obj } }));
    return cfg.render({
      React, toolData, setToolData, update, updateMulti,
      setStemLabTool: noop, setStemLabTab: noop, setToolSnapshots: noop, addToast: noop,
      announceToSR: noop, awardXP: noop, beep: noop, celebrate: noop, canvasNarrate: noop,
      canvasA11yDesc: noop, callGemini: null, callTTS: null, callImagen: null,
      callGeminiVision: null, callGeminiImageEdit: null, gradeLevel: '5th Grade',
      gradeBand: 'g68', isContrast: false, stemLabTab: 'explore', stemLabTool: null,
      toolSnapshots: [], props: {}, srOnly: {},
      a11yClick: (fn) => ({ onClick: fn, role: 'button', tabIndex: 0 }),
      icons: Icons, t: (k, f) => f || k, tryAward: noop, getXP: () => 0,
    });
  }
  act(() => { root.render(React.createElement(Harness)); });
  const api = {
    host,
    q: (sel) => host.querySelector(sel),
    button: (text) => [...host.querySelectorAll('button')].find((b) => b.textContent.includes(text)),
    click(el) { act(() => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })); }); },
    key(el, key, n = 1) { for (let i = 0; i < n; i++) act(() => { el.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })); }); },
    advance(ms) { for (let t = 0; t < ms; t += 1000) act(() => { vi.advanceTimersByTime(Math.min(1000, ms - t)); }); },
    teardown() { try { act(() => root.unmount()); } catch (_) {} host.remove(); },
  };
  return api;
}

// Park the reticle in the top-left corner, away from the centre-seeking bird.
function aimAway(app) {
  const field = app.q('[data-fo-field]');
  expect(field.getAttribute('tabindex')).toBe('0');
  const reticle = () => [...field.querySelectorAll('g[transform^="translate"]')].find((g) => g.textContent.includes('8×42'));
  const before = reticle() && reticle().getAttribute('transform');
  expect(before).toBeTruthy();
  app.key(field, 'ArrowLeft', 20);
  app.key(field, 'ArrowUp', 12);
  expect(reticle().getAttribute('transform')).toBe('translate(0 0)');
}
const failed = (app) => !!app.button('Try again with a fresh bird');

let cfg;
beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
  vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
  vi.spyOn(Math, 'random').mockReturnValue(0.4242);
  cfg = loadBirdLab();
});
afterAll(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
beforeEach(() => { try { localStorage.clear(); } catch (_) {} });

describe('Bird Lab Field Observation timing (WCAG 2.2.1)', () => {
  it('is untimed by default: no countdown and no forced failure', () => {
    const app = mount(cfg);
    try {
      const toggle = app.q('[data-fo-timed-toggle]');
      expect(toggle.tagName).toBe('BUTTON');
      expect(toggle.getAttribute('aria-pressed')).toBe('false');
      app.click(app.button('Begin observation'));
      expect(app.q('[data-fo-timer="off"]')).toBeTruthy();
      expect(app.q('[data-fo-more-time]')).toBeNull();
      aimAway(app);
      app.advance(45000);
      expect(failed(app)).toBe(false);
      expect(app.q('[data-fo-field]')).toBeTruthy();
    } finally { app.teardown(); }
  });

  it('opt-in 30-second challenge can be extended with More time', () => {
    const app = mount(cfg);
    try {
      app.click(app.q('[data-fo-timed-toggle]'));
      expect(app.q('[data-fo-timed-toggle]').getAttribute('aria-pressed')).toBe('true');
      expect(JSON.parse(localStorage.getItem('birdLab.fieldObsTimed.v1'))).toBe(true);
      app.click(app.button('Begin observation'));
      expect(app.q('[data-fo-timer="on"]')).toBeTruthy();
      aimAway(app);
      app.advance(20000);
      const more = app.q('[data-fo-more-time]');
      expect(more.tagName).toBe('BUTTON');
      expect(more.getAttribute('type')).toBe('button');
      app.click(more);
      app.advance(25000); // 45 s elapsed, past the original 30 s window
      expect(failed(app)).toBe(false);
      expect(app.q('[data-fo-timer="on"]').textContent).toMatch(/1[45]\.\d s/);
      app.advance(20000); // 65 s: the extended 60 s window has ended
      expect(failed(app)).toBe(true);
    } finally { app.teardown(); }
  });

  it('the timer can be turned off mid-run', () => {
    localStorage.setItem('birdLab.fieldObsTimed.v1', 'true');
    const app = mount(cfg);
    try {
      app.click(app.button('Begin observation'));
      aimAway(app);
      app.advance(25000);
      app.click(app.q('[data-fo-timer-off]'));
      expect(app.q('[data-fo-timer="off"]')).toBeTruthy();
      app.advance(30000);
      expect(failed(app)).toBe(false);
      expect(app.q('[data-fo-field]')).toBeTruthy();
    } finally { app.teardown(); }
  });
});
