import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const strings = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
const translate = (key, fallback) => key.split('.').reduce((value, part) => value?.[part], strings) || fallback || key;
const flatten = node => !node || typeof node !== 'object' ? [] : (Array.isArray(node) ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)]);
let observers, hidden;
function context2d() {
  const stack = [];
  const state = { font: '10px sans-serif', globalAlpha: 1, clearRect: vi.fn() };
  state.save = () => stack.push({ font: state.font, globalAlpha: state.globalAlpha });
  state.restore = () => Object.assign(state, stack.pop() || {});
  state.measureText = text => ({ width: String(text).length * (parseFloat(/([\d.]+)px/.exec(state.font)?.[1]) || 10) * 0.56 });
  state.createLinearGradient = state.createRadialGradient = () => ({ addColorStop() {} });
  return new Proxy(state, { get: (target, key) => key in target ? target[key] : () => {} });
}
function setup(width = 280, state = {}, overrides = {}) {
  const tool = loadTool('stem_lab/stem_tool_brainatlas.js', 'brainAtlas');
  const store = newStore({ brainAtlas: { view: 'lateral', ...state } });
  const canvas = document.createElement('canvas');
  const ctx = context2d();
  let displayWidth = width, canvasNode;
  canvas.getContext = () => ctx;
  Object.defineProperties(canvas, {
    clientWidth: { get: () => displayWidth }, clientHeight: { get: () => displayWidth * canvas.height / canvas.width },
    clientLeft: { value: 2 }, clientTop: { value: 2 },
    offsetWidth: { get: () => canvas.clientWidth + 4 }, offsetHeight: { get: () => canvas.clientHeight + 4 }
  });
  canvas.getBoundingClientRect = () => ({ left: 20, top: 30, width: canvas.offsetWidth, height: canvas.offsetHeight });
  document.body.appendChild(canvas);
  const render = () => {
    canvasNode = flatten(tool.render(makeCtx({ t: translate, ...overrides }, store))).find(node => node.props?.['data-brainatlas-canvas'] === 'true');
    canvas.width = canvasNode.props.width; canvas.height = canvasNode.props.height;
    canvasNode.ref(canvas);
  };
  render();
  const click = (x, y) => canvasNode.props.onClick({ currentTarget: canvas, target: canvas, clientX: 22 + x * canvas.clientWidth, clientY: 32 + y * canvas.clientHeight });
  const resize = next => { displayWidth = next; observers.at(-1).callback([{ target: canvas }]); };
  return { canvas, ctx, store, render, click, resize, targets: () => canvas._brainLabelTargets };
}
beforeEach(() => {
  resetStemLab(); vi.useFakeTimers(); observers = [];
  hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback) { this.callback = callback; this.disconnect = vi.fn(); observers.push(this); }
    observe() {}
  });
});
afterEach(() => {
  window.__alloBrainAtlasCanvasCleanup?.();
  document.querySelectorAll('canvas, #allo-live-brainatlas').forEach(el => el.remove());
  vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Brain Atlas readable and directly selectable callouts', () => {
  it.each([['small', 12], ['medium', 14], ['large', 17]])('keeps %s labels readable across phone and desktop widths', (size, minimum) => {
    const s = setup(280, { diagramLabelSize: size });
    for (const width of [280, 390, 640, 1160, 1740]) {
      s.resize(width);
      expect(s.canvas._brainLabelMetrics.fontPx).toBeGreaterThanOrEqual(minimum - 0.01);
      expect(s.targets().length).toBeGreaterThan(0);
      for (const target of s.targets()) {
        expect(target.h * s.canvas.clientHeight).toBeGreaterThanOrEqual(31.99);
        expect(target.x).toBeGreaterThanOrEqual(0); expect(target.y).toBeGreaterThanOrEqual(0);
        expect(target.x + target.w).toBeLessThanOrEqual(1); expect(target.y + target.h).toBeLessThanOrEqual(1);
      }
    }
  });
  it.each(['lateral', 'medial', 'superior', 'inferior'])('keeps %s labels separate and the selected region visible', view => {
    const s = setup(280, { view, diagramLabelDensity: 'all', diagramLabelSize: 'large' });
    const selected = s.targets()[0].id;
    s.store.toolData.brainAtlas.selectedRegion = selected; s.render();
    expect(s.targets().some(target => target.id === selected)).toBe(true);
    for (const [index, a] of s.targets().entries()) {
      for (const b of s.targets().slice(index + 1)) {
        expect(a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y).toBe(false);
      }
    }
  });
  it('selects the named label even at an edge far from its anatomical dot', () => {
    const s = setup(280, { diagramLabelDensity: 'all' });
    const targets = [...s.targets()];
    expect(targets.length).toBeGreaterThan(1);
    for (const target of targets) {
      s.click(target.x + target.w * 0.9, target.y + target.h * 0.5);
      expect(s.store.toolData.brainAtlas.selectedRegion).toBe(target.id);
    }
  });
  it('keeps precise label selection after resizing and preserves learning answers', () => {
    const s = setup(1160, { plainCheckAnswers: { frontal: 0 }, keyWordsOpen: true });
    s.resize(280);
    const target = s.targets().at(-1); s.click(target.x + target.w / 2, target.y + target.h / 2);
    expect(s.store.toolData.brainAtlas).toMatchObject({ selectedRegion: target.id, plainCheckAnswers: { frontal: 0 }, keyWordsOpen: true });
  });
  it('ignores old-view and filtered-out callouts', () => {
    const s = setup(280, { search: 'vision' });
    s.canvas._brainLabelTargets = [{ id: 'frontal', x: 0, y: 0, w: 1, h: 1 }];
    s.click(0.98, 0.98); expect(s.store.toolData.brainAtlas.selectedRegion).toBeUndefined();
    s.canvas._brainLabelTargets = [{ id: 'occipital', x: 0, y: 0, w: 1, h: 1 }];
    s.canvas._brainLabelView = 'medial';
    s.click(0.98, 0.98); expect(s.store.toolData.brainAtlas.selectedRegion).toBeUndefined();
  });
  it('keeps marker selection available when optional labels are hidden', () => {
    const s = setup(280, { diagramLabelDensity: 'essential' });
    expect(s.targets()).toHaveLength(0);
    s.click(0.28, 0.32);
    expect(s.store.toolData.brainAtlas.selectedRegion).toBe('frontal');
    s.render(); expect(s.targets().map(target => target.id)).toEqual(['frontal']);
  });
  it('redraws reduced-motion diagrams once per size change without animation', () => {
    const s = setup(); const initial = s.ctx.clearRect.mock.calls.length;
    s.resize(390); expect(s.ctx.clearRect.mock.calls.length).toBe(initial + 1);
    s.resize(390); expect(s.ctx.clearRect.mock.calls.length).toBe(initial + 1);
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });
  it('defers hidden-tab painting and refreshes labels when visible again', () => {
    const s = setup(1160); const initial = s.ctx.clearRect.mock.calls.length;
    hidden.mockReturnValue(true); s.resize(280);
    expect(s.ctx.clearRect.mock.calls.length).toBe(initial);
    hidden.mockReturnValue(false); document.dispatchEvent(new Event('visibilitychange'));
    expect(s.canvas._brainLabelMetrics.displayScale).toBeCloseTo(280 / s.canvas.width);
    expect(s.ctx.clearRect.mock.calls.length).toBe(initial + 1);
  });
  it('disconnects old observers and clears obsolete targets on cleanup', () => {
    const s = setup(); const oldObserver = observers.at(-1);
    s.render(); expect(oldObserver.disconnect).toHaveBeenCalledTimes(1);
    const observer = observers.at(-1), draws = s.ctx.clearRect.mock.calls.length;
    s.canvas._brainCleanup(); s.resize(390);
    expect(observer.disconnect).toHaveBeenCalledTimes(1);
    expect(s.targets()).toEqual([]); expect(s.canvas._brainLabelView).toBeNull();
    expect(s.ctx.clearRect.mock.calls.length).toBe(draws);
  });
  it('does not expose anatomical callout targets in specialty diagrams', () => {
    const s = setup(280, { view: 'prenatalDevelopment' });
    expect(s.canvas._brainLabelMetrics.supported).toBe(false); expect(s.targets()).toEqual([]);
  });
  it('ignores clicks outside the content area and zero-sized canvases', () => {
    const s = setup(); s.click(-0.01, -0.01);
    expect(s.store.toolData.brainAtlas.selectedRegion).toBeUndefined();
    s.canvas.getBoundingClientRect = () => ({ left: 20, top: 30, width: 0, height: 0 });
    s.click(0.3, 0.4); expect(s.store.toolData.brainAtlas.selectedRegion).toBeUndefined();
  });
});
