import fs from 'node:fs';
import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

let React, ReactDOM, act, now, frameId = 0;
const frames = new Map(), hosts = [];
const noop = () => {};
beforeAll(() => {
  const context = new Proxy({}, { get: (_, key) => key === 'measureText' ? () => ({ width: 10 }) : () => ({ addColorStop() {} }) });
  window.HTMLCanvasElement.prototype.getContext = () => context;
  for (const [key, value] of [['offsetWidth', 540], ['offsetHeight', 400]]) Object.defineProperty(window.HTMLElement.prototype, key, { configurable: true, get: () => value });
  window.requestAnimationFrame = globalThis.requestAnimationFrame = callback => { frames.set(++frameId, callback); return frameId; };
  window.cancelAnimationFrame = globalThis.cancelAnimationFrame = id => frames.delete(id);
  window.ResizeObserver = globalThis.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} };
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  window.StemLab = { registerTool() {}, ensureThree: () => Promise.reject(new Error('No GPU needed for sample tests')), makeBayViewer: () => ({}) };
  for (const file of ['desktop/web-app/node_modules/react/umd/react.development.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js', 'stem_lab/stem_tool_platetectonics.js']) (0, eval)(fs.readFileSync(file, 'utf8'));
  React = window.React; ReactDOM = window.ReactDOM; act = React.act || React.unstable_act;
});
beforeEach(() => {
  frames.clear();
  now = 0;
  // The model reads performance.now() when its frame loop mounts. Its starting
  // time and our rAF timestamps must use the same clock: slow rendering must
  // not make the first synthetic frame precede that starting time.
  for (const clock of new Set([globalThis.performance, window.performance])) {
    vi.spyOn(clock, 'now').mockImplementation(() => now);
  }
});
afterEach(() => { while (hosts.length) { const host = hosts.pop(); ReactDOM.unmountComponentAtNode(host); host.remove(); } frames.clear(); vi.restoreAllMocks(); });
function mount() {
  const host = document.createElement('div'); document.body.appendChild(host); hosts.push(host);
  const xp = vi.fn(), announce = vi.fn();
  act(() => ReactDOM.render(React.createElement(window.AlloTectonicsInteractive, { darkMode: true, awardXP: xp, announceToSR: announce }), host));
  const click = selector => act(() => host.querySelector(selector).click());
  const play = () => act(() => [...host.querySelectorAll('button')].find(button => /Play$/.test(button.textContent)).click());
  const log = () => host.querySelector('[data-pt-quake-log]');
  const open = () => { log().open = true; act(() => log().dispatchEvent(new window.Event('toggle', { bubbles: true }))); };
  open();
  let index = 0;
  const sequence = [0, 0.2, 0.8, 0.9, 0.5, 0.5];
  vi.spyOn(Math, 'random').mockImplementation(() => sequence[index++ % sequence.length]);
  const event = () => { index = 0; now += 1000; act(() => { for (const [id, callback] of [...frames]) if (frames.delete(id)) callback(now); }); };
  return { host, click, play, log, event, xp, announce };
}
function setInput(node, value) {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(node, String(value));
  act(() => node.dispatchEvent(new window.Event('input', { bubbles: true })));
}
function enter(host, value) {
  const node = host.querySelector('[data-pt-slab-angle-number]');
  act(() => node.focus());
  setInput(node, value);
  act(() => node.blur());
}
function typeDigits(host, value) {
  const node = host.querySelector('[data-pt-slab-angle-number]');
  const slider = host.querySelector('#pt-ql-dip');
  const committed = slider.value;
  act(() => node.focus());
  setInput(node, '');
  let expected = '';
  for (const digit of String(value)) {
    // Use the value left by the preceding render, just as a browser appends a
    // keystroke. Inserting the complete number at once misses early clamping.
    setInput(node, node.value + digit);
    expected += digit;
    expect(node.value).toBe(expected);
    expect(slider.value).toBe(committed);
  }
  return node;
}
describe('Slab-angle inquiry from actual model observations', () => {
  it('plots generated observations using their actual distance and depth coordinates', () => {
    const app = mount(); app.play(); app.event();
    const point = app.host.querySelector('[data-pt-quake-point]');
    const distance = Number(point.dataset.distanceKm), cx = Number(point.getAttribute('cx'));
    expect(distance).toBeGreaterThan(0);
    expect(cx).toBeCloseTo(52 + (distance + 150) / 950 * 396, 5);
    expect(cx).toBeLessThan(448);
    expect([...app.log().querySelectorAll('svg text')].find(node => node.textContent === '800').getAttribute('text-anchor')).toBe('end');
    expect(app.xp).not.toHaveBeenCalled();
  });
  it('captures only on Check, pauses, and keeps the checked sample fixed when time resumes', () => {
    const app = mount(); app.play(); for (let i = 0; i < 8; i++) app.event();
    expect(app.host.querySelector('[data-pt-quake-fit]')).toBeNull();
    expect(app.host.querySelector('[data-pt-quake-lock]').disabled).toBe(false);
    app.click('[data-pt-quake-lock]');
    expect(app.host.querySelector('[data-pt-quake-sample-note]').dataset.ptQuakeSampleNote).toBe('captured');
    expect([...app.host.querySelectorAll('button')].some(node => /Play$/.test(node.textContent))).toBe(true);
    expect(document.activeElement).toBe(app.host.querySelector('[data-pt-slab-revise]'));
    const points = app.log().querySelectorAll('[data-pt-quake-point]').length;
    const fit = app.host.querySelector('[data-pt-quake-fit]').textContent;
    expect(points).toBe(8); expect(fit).toContain('within the slab');
    expect(app.host.querySelector('[data-pt-slab-line="guess"]').getAttribute('stroke-dasharray')).toBe('7 5');
    expect(app.host.querySelector('[data-pt-slab-angle-number]').disabled).toBe(true);
    app.play(); app.event();
    expect(Number(app.log().dataset.ptQuakeLiveCount)).toBe(9);
    expect(app.log().querySelectorAll('[data-pt-quake-point]').length).toBe(points);
    expect(app.host.querySelector('[data-pt-quake-fit]').textContent).toBe(fit);
    expect(app.xp).not.toHaveBeenCalled();
  });
  it('revises without discarding observations and clears a captured fit on boundary change', () => {
    const app = mount(); app.play(); for (let i = 0; i < 8; i++) app.event();
    app.click('[data-pt-quake-lock]'); app.click('[data-pt-slab-revise]');
    expect(app.log().dataset.ptQuakeLog).toBe('8');
    expect(document.activeElement).toBe(app.host.querySelector('#pt-ql-dip'));
    enter(app.host, 37);
    expect(app.host.querySelector('#pt-ql-dip').value).toBe('37');
    app.click('[data-pt-quake-lock]');
    expect(app.host.querySelector('[data-pt-quake-fit]').textContent).toContain('Your estimate was 37°');
    app.click('[data-tect-mode="divergent"]');
    expect(app.log().dataset.ptQuakeLog).toBe('0');
    expect(app.host.querySelector('[data-pt-quake-fit]')).toBeNull();
    expect(app.log().textContent).toContain('No earthquakes are plotted yet');
    app.click('[data-tect-mode="convergent"]');
    expect(app.host.querySelector('[data-pt-quake-lock]').disabled).toBe(true);
    expect(app.xp).not.toHaveBeenCalled();
  });
  it.each([['37', 'blur'], ['15', 'Enter'], ['42', 'blur']])('keeps sequentially typed %s as a draft until %s', (value, commit) => {
    const app = mount();
    const node = typeDigits(app.host, value);
    if (commit === 'blur') act(() => node.blur());
    else act(() => node.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    expect(node.value).toBe(value);
    expect(app.host.querySelector('#pt-ql-dip').value).toBe(value);
    expect(app.host.querySelector('[data-pt-quake-fit]')).toBeNull();
    expect(app.xp).not.toHaveBeenCalled();
    expect(app.announce).not.toHaveBeenCalled();
  });
  it('commits a pending exact-angle draft when Check captures the observations', () => {
    const app = mount(); app.play(); for (let i = 0; i < 8; i++) app.event();
    const node = typeDigits(app.host, '42');
    expect(document.activeElement).toBe(node);
    // A direct activation deliberately avoids a preceding blur: Check must
    // commit the same draft for keyboard and assistive-technology activation.
    app.click('[data-pt-quake-lock]');
    expect(app.host.querySelector('#pt-ql-dip').value).toBe('42');
    expect(app.host.querySelector('[data-pt-quake-fit]').textContent).toContain('Your estimate was 42°');
    expect(document.activeElement).toBe(app.host.querySelector('[data-pt-slab-revise]'));
    expect(app.log().dataset.ptQuakeLog).toBe('8');
    expect(app.xp).not.toHaveBeenCalled();
  });
  it('synchronizes exact-angle text when the range control changes', () => {
    const app = mount();
    typeDigits(app.host, '37');
    const slider = app.host.querySelector('#pt-ql-dip');
    act(() => slider.focus());
    setInput(slider, '61');
    expect(slider.value).toBe('61');
    expect(app.host.querySelector('[data-pt-slab-angle-number]').value).toBe('61');
    expect(app.xp).not.toHaveBeenCalled();
  });
  it('clears a captured fit on Reset and allows a fresh sample to be checked', () => {
    const app = mount(); app.play(); for (let i = 0; i < 8; i++) app.event();
    enter(app.host, 37);
    app.click('[data-pt-quake-lock]');
    const reset = [...app.host.querySelectorAll('button')].find(node => node.textContent === '↻ Reset');
    act(() => { reset.focus(); reset.click(); });
    expect(document.activeElement).toBe(reset);
    expect(app.log().dataset.ptQuakeLog).toBe('0');
    expect(app.log().dataset.ptQuakeLiveCount).toBe('0');
    expect(app.host.querySelector('[data-pt-quake-fit]')).toBeNull();
    expect(app.host.querySelector('[data-pt-quake-sample-note]').dataset.ptQuakeSampleNote).toBe('live');
    expect(app.host.querySelector('[data-pt-quake-lock]').disabled).toBe(true);
    expect(app.host.querySelector('[data-pt-slab-angle-number]').disabled).toBe(false);
    expect(app.host.querySelector('[data-pt-slab-angle-number]').value).toBe('37');
    app.play(); for (let i = 0; i < 8; i++) app.event();
    app.click('[data-pt-quake-lock]');
    expect(app.host.querySelector('[data-pt-quake-fit]').textContent).toContain('Your estimate was 37°');
    expect(app.log().dataset.ptQuakeLog).toBe('8');
    expect(document.activeElement).toBe(app.host.querySelector('[data-pt-slab-revise]'));
    expect(app.xp).not.toHaveBeenCalled();
  });
  it('requires enough measured events and bounds exact angle entry', () => {
    const app = mount();
    expect(app.host.querySelector('[data-pt-quake-lock]').disabled).toBe(true);
    enter(app.host, 95); expect(app.host.querySelector('#pt-ql-dip').value).toBe('85');
    enter(app.host, 1); expect(app.host.querySelector('#pt-ql-dip').value).toBe('5');
    enter(app.host, 33.6); expect(app.host.querySelector('#pt-ql-dip').value).toBe('34');
    enter(app.host, ''); expect(app.host.querySelector('#pt-ql-dip').value).toBe('34');
    app.play(); app.event();
    expect(app.host.querySelector('[data-pt-quake-lock]').disabled).toBe(true);
    expect(app.host.querySelector('[data-pt-quake-fit]')).toBeNull();
    expect(app.xp).not.toHaveBeenCalled();
  });
});
