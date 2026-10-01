import fs from 'node:fs';
import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

let React, ReactDOM, act, now, frameId = 0;
const frames = new Map(), hosts = [];
beforeAll(() => {
  const context = new Proxy({}, { get: (_, key) => key === 'measureText' ? () => ({ width: 10 }) : () => ({ addColorStop() {} }) });
  window.HTMLCanvasElement.prototype.getContext = () => context;
  for (const [key, value] of [['offsetWidth', 540], ['offsetHeight', 400]]) Object.defineProperty(window.HTMLElement.prototype, key, { configurable: true, get: () => value });
  window.requestAnimationFrame = globalThis.requestAnimationFrame = callback => { frames.set(++frameId, callback); return frameId; };
  window.cancelAnimationFrame = globalThis.cancelAnimationFrame = id => frames.delete(id);
  window.ResizeObserver = globalThis.ResizeObserver = class { observe() {} disconnect() {} };
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  window.StemLab = { registerTool() {}, ensureThree: () => Promise.reject(new Error('No GPU needed for stepping tests')), makeBayViewer: () => ({}) };
  for (const file of ['desktop/web-app/node_modules/react/umd/react.development.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js', 'stem_lab/stem_tool_platetectonics.js']) (0, eval)(fs.readFileSync(file, 'utf8'));
  React = window.React; ReactDOM = window.ReactDOM; act = React.act || React.unstable_act;
});
beforeEach(() => { frames.clear(); now = 0; vi.spyOn(performance, 'now').mockImplementation(() => now); });
afterEach(() => {
  while (hosts.length) { const host = hosts.pop(); act(() => ReactDOM.unmountComponentAtNode(host)); host.remove(); }
  frames.clear(); vi.restoreAllMocks();
});
function mount() {
  const host = document.createElement('div'); document.body.appendChild(host); hosts.push(host);
  const xp = vi.fn(), announce = vi.fn();
  act(() => ReactDOM.render(React.createElement(window.AlloTectonicsInteractive, { darkMode: true, awardXP: xp, announceToSR: announce }), host));
  const sequence = [0, 0.2, 0.8, 0.9, 0.5, 0.5]; let index = 0;
  vi.spyOn(Math, 'random').mockImplementation(() => sequence[index++ % sequence.length]);
  const click = selector => act(() => host.querySelector(selector).click());
  const frame = (ms = 1000) => { index = 0; now += ms; act(() => { for (const [id, callback] of [...frames]) if (frames.delete(id)) callback(now); }); };
  const step = () => { index = 0; click('[data-pt-model-step]'); };
  const reading = key => host.querySelector('[data-pt-model-reading="' + key + '"]').textContent;
  const rate = value => {
    const input = host.querySelector('input[aria-label="Plate movement rate in centimeters per year"]');
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, String(value));
    act(() => input.dispatchEvent(new window.Event('input', { bubbles: true })));
  };
  return { host, xp, announce, click, frame, step, reading, rate };
}
describe('Paused boundary model advances and numerical readings', () => {
  it('advances one interval while paused without adding animation loops or earning credit', () => {
    const app = mount(); const scheduled = frames.size;
    expect(app.reading('time')).toBe('0 years');
    app.step();
    expect(app.reading('time')).toBe('60,000 years');
    expect(app.reading('movement')).toBe('30 m');
    expect(app.host.querySelector('[data-pt-model-play]').textContent).toContain('Play');
    expect(frames.size).toBe(scheduled);
    const before = app.reading('time'); app.frame();
    expect(app.reading('time')).toBe(before);
    expect(app.xp).not.toHaveBeenCalled();
    expect(app.announce).toHaveBeenCalledTimes(1);
  });
  it('uses the same numerical and earthquake update as a one-second playback frame', () => {
    const stepped = mount(); stepped.step();
    const played = mount(); played.click('[data-pt-model-play]'); played.frame();
    expect(played.reading('time')).toBe(stepped.reading('time'));
    expect(played.reading('movement')).toBe(stepped.reading('movement'));
    expect(played.host.querySelector('[data-pt-quake-log]').dataset.ptQuakeLog).toBe('1');
    expect(stepped.host.querySelector('[data-pt-quake-log]').dataset.ptQuakeLog).toBe('1');
    expect(played.xp).not.toHaveBeenCalled();
  });
  it('requires a pause before manual advance and preserves the run after resuming', () => {
    const app = mount(); app.click('[data-pt-model-play]');
    expect(app.host.querySelector('[data-pt-model-step]').disabled).toBe(true);
    app.step(); expect(app.reading('time')).toBe('0 years');
    app.frame(); app.click('[data-pt-model-play]'); app.step();
    expect(app.reading('time')).toBe('120,000 years');
    app.click('[data-pt-model-play]'); app.frame();
    expect(app.reading('time')).toBe('180,000 years');
    expect(app.xp).not.toHaveBeenCalled();
  });
  it('keeps short-run distances nonzero and distinguishes the average from a changed rate', () => {
    const app = mount(); app.click('[data-tect-mode="divergent"]'); app.rate(1);
    app.click('[data-pt-model-play]'); app.frame(16);
    expect(app.reading('movement')).toBe('0.0096 km');
    expect(app.host.querySelector('[data-pt-sim-check]').textContent).toContain('0.0096 km');
    app.click('[data-pt-model-play]'); app.click('[data-pt-model-reset]');
    app.rate(5); app.step(); app.rate(15); app.step();
    expect(app.reading('movement')).toBe('12 km');
    const math = app.host.querySelector('[data-pt-sim-check]').textContent;
    expect(math).toContain('10.0 cm per year');
    expect(math).toContain('100,000');
    expect(math).toContain('average');
    expect(app.xp).not.toHaveBeenCalled();
  });
  it('honors the drawn rift limit and resets the observations for another measurement', () => {
    const app = mount(); app.click('[data-tect-mode="divergent"]'); app.rate(15);
    for (let i = 0; i < 21; i++) app.step();
    expect(app.reading('movement')).toBe('180 km');
    expect(app.host.querySelector('[data-pt-sim-check]').textContent).toContain('Press Reset');
    app.click('[data-pt-model-reset]');
    expect(app.reading('time')).toBe('0 years');
    expect(app.reading('movement')).toBe('0 km');
    expect(app.host.querySelector('[data-pt-quake-log]').dataset.ptQuakeLog).toBe('0');
    expect(app.xp).not.toHaveBeenCalled();
  });
  it('preserves the checked sample while manual steps add live observations', () => {
    const app = mount();
    for (let i = 0; i < 8; i++) app.step();
    app.click('[data-pt-quake-lock]');
    const fit = app.host.querySelector('[data-pt-quake-fit]').textContent;
    app.step();
    const log = app.host.querySelector('[data-pt-quake-log]');
    expect(log.dataset.ptQuakeLog).toBe('8');
    expect(log.dataset.ptQuakeLiveCount).toBe('9');
    expect(app.host.querySelector('[data-pt-quake-fit]').textContent).toBe(fit);
    app.click('[data-pt-slab-revise]');
    expect(log.dataset.ptQuakeLog).toBe('9');
    expect(app.xp).not.toHaveBeenCalled();
  });
  it('ages older active dots when newer events arrive while retaining every logged observation', () => {
    const app = mount();
    for (let i = 0; i < 4; i++) app.step();
    const readout = app.host.querySelector('[data-pt-sim-readout]');
    expect(readout.textContent).toContain('4 events');
    expect(app.host.querySelector('[data-pt-quake-log]').dataset.ptQuakeLog).toBe('4');
    // The 3D description reports active dots, while the log reports all events.
    app.click('[data-tect-view="3d"]');
    expect(app.host.querySelector('[data-tect-gl]').getAttribute('aria-label')).toContain('of 3 shown earthquakes');
    vi.spyOn(Math, 'random').mockReturnValue(0.999999);
    for (let i = 0; i < 3; i++) app.step();
    expect(app.host.querySelector('[data-tect-gl]').getAttribute('aria-label')).toContain('of 0 shown earthquakes');
    expect(app.host.querySelector('[data-pt-quake-log]').dataset.ptQuakeLog).toBe('4');
    expect(app.xp).not.toHaveBeenCalled();
  });
  it('publishes a new 3D event when active count and rounded movement stay constant', () => {
    const app = mount(); app.click('[data-tect-mode="transform"]'); app.rate(1);
    const submitted = vi.spyOn(window.__alloTectGL, 'submit');
    app.click('[data-tect-view="3d"]');
    for (let i = 0; i < 4; i++) app.step();
    vi.spyOn(Math, 'random').mockReturnValue(0.999999);
    app.click('[data-pt-model-play]'); app.frame(990);
    const before = submitted.mock.calls.at(-1)[0];
    const randoms = [0, 0.2, 0.8, 0.9, 0.5]; let next = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => randoms[next++ % randoms.length]);
    app.frame(16);
    const after = submitted.mock.calls.at(-1)[0];
    expect(before.quakes).toHaveLength(3); expect(after.quakes).toHaveLength(3);
    expect(Math.round(before.offset)).toBe(Math.round(after.offset));
    expect(Math.round(before.quakes.at(-1).depthKm)).toBe(Math.round(after.quakes.at(-1).depthKm));
    expect(after.sig).not.toBe(before.sig);
    expect(app.host.querySelector('[data-pt-quake-log]').dataset.ptQuakeLog).toBe('5');
    expect(app.xp).not.toHaveBeenCalled();
  });
  it('describes only the earthquake foci retained by the visible 3D slice', () => {
    const app = mount();
    const randoms = [0, 0.2, 0.8, 0.9, 0.5, 0.9]; let next = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => randoms[next++ % randoms.length]);
    for (let i = 0; i < 4; i++) app.step();
    app.click('[data-tect-view="3d"]');
    const canvas = app.host.querySelector('[data-tect-gl]');
    expect(canvas.getAttribute('aria-label')).toContain('of 3 shown earthquakes');
    const cut = app.host.querySelector('#tect-cut');
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(cut, '0');
    act(() => cut.dispatchEvent(new window.Event('input', { bubbles: true })));
    expect(canvas.getAttribute('aria-label')).toContain('of 0 shown earthquakes');
    expect(app.host.querySelector('[data-pt-quake-log]').dataset.ptQuakeLog).toBe('4');
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(cut, '100');
    act(() => cut.dispatchEvent(new window.Event('input', { bubbles: true })));
    expect(canvas.getAttribute('aria-label')).toContain('of 3 shown earthquakes');
    expect(app.xp).not.toHaveBeenCalled();
    app.click('[data-tect-mode="transform"]');
    const help = app.host.querySelector('#tect-gl-description').textContent;
    expect(help).toContain('earthquakes remain shallow');
    expect(help).not.toContain('dipping band');
  });
});
