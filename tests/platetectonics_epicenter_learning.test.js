import fs from 'node:fs';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

let React, ReactDOM, act;
let hosts = [], resizeCallbacks = [];
const contexts = new WeakMap();
beforeAll(() => {
  window.HTMLCanvasElement.prototype.getContext = function () {
    if (!contexts.has(this)) {
      const gradient = { addColorStop: vi.fn() };
      const ctx = new Proxy({ fillRect: vi.fn(), arc: vi.fn(), gradient,
        createLinearGradient: () => gradient, measureText: () => ({ width: 20 }) },
      { get: (target, key) => key in target ? target[key] : () => {} });
      contexts.set(this, ctx);
    }
    return contexts.get(this);
  };
  window.matchMedia = () => ({ matches: true, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  window.ResizeObserver = globalThis.ResizeObserver = class {
    constructor(callback) { resizeCallbacks.push(callback); }
    observe() {} disconnect() {}
  };
  window.requestAnimationFrame = globalThis.requestAnimationFrame = vi.fn(() => 1);
  window.cancelAnimationFrame = globalThis.cancelAnimationFrame = vi.fn();
  window.StemLab = { registerTool() {} };
  for (const file of ['desktop/web-app/node_modules/react/umd/react.development.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js', 'stem_lab/stem_tool_platetectonics.js']) (0, eval)(fs.readFileSync(file, 'utf8'));
  React = window.React; ReactDOM = window.ReactDOM; act = React.act || React.unstable_act;
});
afterEach(() => {
  hosts.forEach(host => { act(() => ReactDOM.unmountComponentAtNode(host)); host.remove(); });
  hosts = []; resizeCallbacks = [];
  vi.clearAllMocks();
});
function mount(extra = {}) {
  const host = document.createElement('div'); document.body.appendChild(host); hosts.push(host);
  const onRecord = vi.fn(), announceToSR = vi.fn();
  let props = { onRecord, announceToSR, t: (_key, fallback) => fallback, ...extra };
  const render = patch => { props = { ...props, ...patch }; act(() => ReactDOM.render(React.createElement(window.AlloTectonicsEpicenter, props), host)); };
  render();
  return { host, onRecord, announceToSR, render, canvas: host.querySelector('canvas') };
}
const click = el => act(() => el.click());
const key = (el, name) => act(() => el.dispatchEvent(new window.KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true })));
function setInput(el, value) {
  act(() => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, String(value));
    el.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}

describe('Epicenter learning and deterministic drawing', () => {
  it('repaints keyboard input, mysteries, theme and size in reduced motion without scheduling animation', () => {
    const app = mount(), ctx = contexts.get(app.canvas);
    expect(ctx.fillRect).toHaveBeenCalled();
    let painted = ctx.fillRect.mock.calls.length;
    key(app.canvas, 'ArrowRight'); expect(ctx.fillRect.mock.calls.length).toBeGreaterThan(painted);
    painted = ctx.fillRect.mock.calls.length;
    click(app.host.querySelector('[data-pt-mystery-start]'));
    expect(ctx.fillRect.mock.calls.length).toBeGreaterThan(painted);
    painted = ctx.fillRect.mock.calls.length;
    setInput(app.host.querySelector('[data-pt-mystery-dist="BRK"]'), 420);
    expect(ctx.fillRect.mock.calls.length).toBeGreaterThan(painted);
    expect(ctx.arc.mock.calls.some(args => args[0] === 90 && args[1] === 90 && args[2] === 105)).toBe(true);
    app.render({ darkMode: true });
    expect(ctx.gradient.addColorStop).toHaveBeenCalledWith(0, '#0b1220');
    painted = ctx.fillRect.mock.calls.length;
    Object.defineProperty(app.canvas, 'clientWidth', { configurable: true, value: 320 });
    act(() => resizeCallbacks.forEach(callback => callback()));
    expect(ctx.fillRect.mock.calls.length).toBeGreaterThan(painted);
    expect(app.canvas.width).toBe(320);
    expect(app.canvas.height).toBe(213);
    Object.defineProperty(app.canvas, 'clientWidth', { configurable: true, value: 2400 });
    act(() => resizeCallbacks.forEach(callback => callback()));
    expect(app.canvas.width).toBe(1200);
    expect(app.canvas.height).toBe(800);
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('checks displayed S-P calculations without revealing or recording the location', () => {
    const app = mount(); click(app.host.querySelector('[data-pt-mystery-start]'));
    const readings = [...app.host.querySelectorAll('[data-pt-epi-reading]')];
    const expected = readings.map(row => Math.round(Number(row.textContent.match(/([\d.]+)s/)[1]) * 8.4));
    const inputs = [...app.host.querySelectorAll('[data-pt-mystery-dist]')];
    setInput(inputs[0], expected[0]); setInput(inputs[1], expected[1] / 2); setInput(inputs[2], expected[2] * 2);
    click(app.host.querySelector('[data-pt-mystery-check-distances]'));
    expect([...app.host.querySelectorAll('[data-pt-radius-status]')].map(el => el.dataset.ptRadiusStatus)).toEqual(['correct', 'short', 'long']);
    expect(app.host.querySelector('[data-pt-mystery]').dataset.ptMystery).toBe('hunting');
    expect(app.canvas.getAttribute('aria-label')).toContain('true epicenter and distances are hidden');
    expect(app.onRecord).not.toHaveBeenCalled();
    setInput(inputs[1], expected[1]); setInput(inputs[2], expected[2]);
    click(app.host.querySelector('[data-pt-mystery-check-distances]'));
    expect([...app.host.querySelectorAll('[data-pt-radius-status]')].every(el => el.dataset.ptRadiusStatus === 'correct')).toBe(true);
    expect(inputs.every(el => !el.disabled)).toBe(true);
    key(app.canvas, 'ArrowRight'); click(app.host.querySelector('[data-pt-mystery-check]'));
    expect(app.host.querySelector('[data-pt-mystery]').dataset.ptMystery).toBe('revealed');
    expect(app.onRecord).toHaveBeenCalledTimes(1);
    expect(app.onRecord.mock.calls[0][0].mysteryTries).toBe(1);
  });

  it('identifies missing radii and teaches the model limits without invented historical accuracy', () => {
    const app = mount();
    expect(app.host.querySelector('[data-pt-epi-worked-example]').textContent).toContain('25 s gap gives 210 km');
    expect(app.host.querySelector('[data-pt-epi-model-note]').textContent).toMatch(/constant speeds/);
    expect(app.host.textContent).not.toMatch(/before GPS|exactly how the 1906|as close as a three-station hand solution/);
    click(app.host.querySelector('[data-pt-mystery-start]'));
    click(app.host.querySelector('[data-pt-mystery-check-distances]'));
    expect([...app.host.querySelectorAll('[data-pt-radius-status]')].every(el => el.dataset.ptRadiusStatus === 'missing')).toBe(true);
    expect(app.onRecord).not.toHaveBeenCalled();
  });
});
