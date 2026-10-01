import fs from 'node:fs';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

let React, ReactDOM, act, initialOffset = 0, now = 0, frameId = 0;
const frames = new Map(), hosts = [], contexts = new WeakMap();
beforeAll(() => {
  window.HTMLCanvasElement.prototype.getContext = function () {
    if (contexts.has(this)) return contexts.get(this);
    const context = new Proxy({
      path: [], stream: null, streamOutline: null, arrows: [],
      measureText: text => ({ width: String(text).length * 6 }),
      beginPath() { this.path = []; },
      moveTo(x, y) { this.path.push(['M', x, y]); },
      lineTo(x, y) { this.path.push(['L', x, y]); },
      stroke() {
        const path = this.path.map(point => point.slice());
        if (this.strokeStyle === '#a16207' && this.lineWidth === 3.5) this.stream = path;
        if (this.strokeStyle === '#f59e0b' && this.lineWidth === 2.4 && path.length === 2) this.arrows.push(path);
        if (this.strokeStyle === '#fff7ae' && this.lineWidth === 2.5 && path.length === 4 && path[0][1] === 240) this.streamOutline = path;
      }
    }, { get: (target, key) => key in target ? target[key] : () => ({ addColorStop() {} }) });
    contexts.set(this, context); return context;
  };
  for (const [key, value] of [['offsetWidth', 540], ['offsetHeight', 400]]) Object.defineProperty(window.HTMLElement.prototype, key, { configurable: true, get: () => value });
  window.HTMLElement.prototype.getBoundingClientRect = () => ({ x: 0, y: 0, top: 0, left: 0, right: 540, bottom: 400, width: 540, height: 400 });
  window.requestAnimationFrame = globalThis.requestAnimationFrame = callback => { frames.set(++frameId, callback); return frameId; };
  window.cancelAnimationFrame = globalThis.cancelAnimationFrame = id => frames.delete(id);
  window.ResizeObserver = globalThis.ResizeObserver = class { observe() {} disconnect() {} };
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  window.StemLab = { registerTool() {}, ensureThree: () => Promise.reject(new Error('No GPU required for transform section tests')), makeBayViewer: () => ({}) };
  for (const file of ['desktop/web-app/node_modules/react/umd/react.development.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js', 'stem_lab/stem_tool_platetectonics.js']) (0, eval)(fs.readFileSync(file, 'utf8'));
  React = window.React; ReactDOM = window.ReactDOM; act = React.act || React.unstable_act;
});
beforeEach(() => {
  frames.clear(); now = 0; vi.spyOn(performance, 'now').mockImplementation(() => now);
  const useState = React.useState;
  // Initial physical fixtures obey rate x time. All drawing, controls and
  // subsequent physics run through the real component.
  vi.spyOn(React, 'useState').mockImplementation(initial => {
    if (initial && typeof initial === 'object' && Object.hasOwn(initial, 'offset') && Object.hasOwn(initial, 'quakes') && Object.hasOwn(initial, 'years')) initial = { ...initial, mode: 'transform', offset: initialOffset, years: initialOffset * 100000 / initial.rate, running: false };
    return useState(initial);
  });
});
afterEach(() => {
  while (hosts.length) { const host = hosts.pop(); act(() => ReactDOM.unmountComponentAtNode(host)); host.remove(); }
  frames.clear(); vi.restoreAllMocks();
});
function mount(offset = 0) {
  initialOffset = offset;
  const host = document.createElement('div'); document.body.appendChild(host); hosts.push(host);
  const xp = vi.fn(), announce = vi.fn(), audio = vi.fn(), save = vi.fn();
  act(() => ReactDOM.render(React.createElement(window.AlloTectonicsInteractive, { darkMode: true, awardXP: xp, announceToSR: announce, beep: audio, onSaveBoundaryInquiry: save }), host));
  const click = selector => act(() => host.querySelector(selector).click());
  const frame = (count = 1) => { for (let i = 0; i < count; i++) { now += 16; act(() => { for (const [id, callback] of [...frames]) if (frames.delete(id)) callback(now); }); } };
  const reading = key => host.querySelector(`[data-pt-model-reading="${key}"]`).textContent;
  const extent = () => host.querySelector('[data-pt-transform-extent]');
  const context = contexts.get(host.querySelector('[data-tect-section]'));
  const rate = value => {
    const input = host.querySelector('input[aria-label="Plate movement rate in centimeters per year"]');
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, String(value));
    act(() => input.dispatchEvent(new window.Event('input', { bubbles: true })));
  };
  frame(); return { host, context, xp, announce, audio, save, click, frame, reading, extent, rate };
}
describe('Transform slip pictures and cumulative readings', () => {
  it.each([0, 25.9, 26, 26.1, 279, 280, 281, 1200])('keeps matching endpoints, physical slip and truthful picture-extent feedback at %s km', offset => {
    const app = mount(offset), stream = app.context.stream, separation = 26 * Math.min(1, offset / 280);
    expect(stream).toHaveLength(4);
    expect(stream[0][2]).toBeCloseTo(70 - separation / 2); expect(stream[1][2]).toBe(stream[0][2]);
    expect(stream[2][2]).toBeCloseTo(70 + separation / 2); expect(stream[3][2]).toBe(stream[2][2]);
    const [a, b] = app.context.arrows.slice(-2);
    expect(a[1][2]).toBeLessThan(a[0][2]); expect(b[1][2]).toBeGreaterThan(b[0][2]);
    expect(app.reading('movement')).toBe(offset.toLocaleString(undefined, offset >= 1 ? { maximumFractionDigits: 2 } : { maximumSignificantDigits: 3 }) + ' km');
    expect(app.extent().dataset.ptTransformExtent).toBe(offset >= 280 ? 'limited' : 'growing');
    expect(app.extent().getAttribute('aria-live')).toBe('off');
    expect(app.extent().textContent).toContain(offset >= 280 ? 'Picture limit reached at 280 km' : 'both pictures reach their display limit at 280 km');
    expect(app.xp).not.toHaveBeenCalled(); expect(app.audio).not.toHaveBeenCalled(); expect(app.announce).not.toHaveBeenCalled();
  });
  it('moves each stream half with its arrow across the former 26 km reset', () => {
    const app = mount(25.9), before = app.context.stream.map(point => point.slice());
    app.rate(1); app.click('[data-pt-model-step]'); app.frame();
    expect(app.reading('movement')).toBe('26.5 km');
    expect(app.context.stream[0][2]).toBeLessThan(before[0][2]); expect(app.context.stream[2][2]).toBeGreaterThan(before[2][2]);
    expect(app.context.stream[2][2] - app.context.stream[0][2]).toBeGreaterThan(before[2][2] - before[0][2]);
  });
  it('keeps cumulative distance and rate x time advancing after the finite picture stops', () => {
    const app = mount(1200), before = app.context.stream.map(point => point.slice());
    app.click('[data-pt-model-step]'); app.frame();
    expect(app.reading('movement')).toBe('1,203 km'); expect(app.reading('time')).toBe('24.1 million years');
    app.rate(15); app.click('[data-pt-model-step]'); app.frame();
    expect(app.reading('movement')).toBe('1,212 km'); expect(app.context.stream).toEqual(before);
    expect(app.extent().textContent).toContain('cumulative slip reading continues to increase');
    app.click('[data-pt-model-reset]'); app.frame();
    expect(app.reading('movement')).toBe('0 km'); expect(app.reading('time')).toBe('0 years');
    expect(app.extent().dataset.ptTransformExtent).toBe('growing'); expect(app.context.stream[0][2]).toBe(app.context.stream[2][2]);
    expect(app.xp).not.toHaveBeenCalled(); expect(app.audio).not.toHaveBeenCalled();
  });
  it('keeps the stream inspection outline on the actual separated endpoints without changing the experiment', () => {
    const app = mount(281), before = { time: app.reading('time'), movement: app.reading('movement'), notices: app.announce.mock.calls.length, saves: app.save.mock.calls.length };
    app.click('[data-pt-boundary-feature-select="markers"]'); app.frame();
    expect(app.context.streamOutline).toHaveLength(4);
    expect(app.context.streamOutline).toEqual(app.context.stream);
    expect(app.reading('time')).toBe(before.time); expect(app.reading('movement')).toBe(before.movement);
    expect(app.announce).toHaveBeenCalledTimes(before.notices); expect(app.save).toHaveBeenCalledTimes(before.saves);
    expect(app.xp).not.toHaveBeenCalled(); expect(app.audio).not.toHaveBeenCalled();
  });
  it('stays paused and silent while idle at the picture limit', () => {
    const app = mount(280), before = { time: app.reading('time'), movement: app.reading('movement'), path: app.context.stream.map(point => point.slice()), notices: app.announce.mock.calls.length, saves: app.save.mock.calls.length };
    app.frame(1200);
    expect(app.reading('time')).toBe(before.time); expect(app.reading('movement')).toBe(before.movement); expect(app.context.stream).toEqual(before.path);
    expect(app.announce).toHaveBeenCalledTimes(before.notices); expect(app.save).toHaveBeenCalledTimes(before.saves);
    expect(app.xp).not.toHaveBeenCalled(); expect(app.audio).not.toHaveBeenCalled();
  });
  it.each([[0.00096, '0.00096 km'], [123456789.125, '123,456,789.13 km']])('keeps short and long %s km cumulative readings useful', (offset, value) => {
    const app = mount(offset);
    expect(app.reading('movement')).toBe(value);
    expect(app.host.querySelector('[data-pt-model-reading="movement"]').style.overflowWrap).toBe('anywhere');
  });
});
