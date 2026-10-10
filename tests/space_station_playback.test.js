import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const start = source.indexOf('  function issExperimentPlayback(');
const end = source.indexOf('  var ISS_SIDEREAL_DAY_S', start);
if (start < 0 || end < start) throw new Error('The standalone station experiment playback component was not found.');
const Playback = new Function(source.slice(start, end) + '\nreturn issExperimentPlayback;')();
const require = createRequire(import.meta.url);
const modules = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require(resolve(modules, 'react'));
const { createRoot } = require(resolve(modules, 'react-dom/client'));
const { act } = require(resolve(modules, 'react-dom/test-utils'));

let frames;
let nextFrame;
let clock;
let cleanups;

beforeEach(() => {
  frames = new Map();
  nextFrame = 0;
  clock = 0;
  cleanups = [];
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  vi.stubGlobal('requestAnimationFrame', callback => {
    const id = ++nextFrame;
    frames.set(id, callback);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', id => frames.delete(id));
  vi.spyOn(performance, 'now').mockImplementation(() => clock);
});

afterEach(() => {
  cleanups.forEach(cleanup => cleanup());
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function frame(milliseconds = 0) {
  clock += milliseconds;
  const pending = [...frames.values()];
  frames.clear();
  act(() => pending.forEach(callback => callback(clock)));
}

function advance(milliseconds) {
  let remaining = milliseconds;
  while (remaining > 0) {
    const step = Math.min(20, remaining);
    frame(step);
    remaining -= step;
  }
}

function mountPlayback(overrides = {}) {
  let props = { id: 'momentum', max: 30, resetKey: 'initial', disabled: false, speeds: [1, 4, 10], t: (key, fallback) => fallback ?? key, ...overrides };
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  const updates = [];
  let value = overrides.value ?? 0;
  let setValue;
  let closed = false;
  function Harness() {
    const state = React.useState(overrides.value ?? 0);
    value = state[0];
    setValue = state[1];
    return React.createElement(Playback, {
      ...props,
      React,
      value,
      onAdvance(next) { updates.push(next); setValue(next); },
    });
  }
  act(() => root.render(React.createElement(Harness)));
  const view = {
    host,
    updates,
    get value() { return value; },
    get toggle() { return host.querySelector('[data-iss-playback-toggle="' + props.id + '"]'); },
    get playing() { return view.toggle.getAttribute('aria-pressed') === 'true'; },
    play() { act(() => view.toggle.click()); frame(); },
    update(next) { props = { ...props, ...next }; act(() => root.render(React.createElement(Harness))); },
    seek(next) { act(() => setValue(next)); },
    speed(next) {
      const select = host.querySelector('[data-iss-playback-speed="' + props.id + '"]');
      act(() => { select.value = String(next); select.dispatchEvent(new Event('change', { bubbles: true })); });
    },
    close() {
      if (closed) return;
      closed = true;
      act(() => root.unmount());
      host.remove();
    },
  };
  cleanups.push(() => view.close());
  return view;
}

describe('space station experiment playback', () => {
  it('only advances after an explicit start and resumes without counting paused wall time', () => {
    const view = mountPlayback();
    expect(view.host.querySelector('[data-iss-playback="momentum"]')).not.toBeNull();
    expect(view.playing).toBe(false);
    advance(1000);
    expect(view.value).toBe(0);
    expect(view.updates).toHaveLength(0);

    view.play();
    expect(view.playing).toBe(true);
    advance(1000);
    expect(view.value).toBeCloseTo(1, 1);
    // Rendering is throttled; state must not be committed on all 50 frames.
    expect(view.updates.length).toBeLessThan(20);
    act(() => view.toggle.click());
    expect(view.playing).toBe(false);
    const paused = view.value;
    advance(5000);
    expect(view.value).toBe(paused);
    view.play();
    advance(1000);
    expect(view.value - paused).toBeCloseTo(1, 1);
  });

  it('applies the selected simulation speed while keeping elapsed values in seconds', () => {
    const view = mountPlayback({ id: 'transfer', max: 3000 });
    view.speed(4);
    view.play();
    advance(1000);
    expect(view.value).toBeCloseTo(4, 1);
  });

  it('bounds a stalled foreground frame instead of advancing through the whole delay', () => {
    const view = mountPlayback();
    view.play();
    advance(1000);
    const before = view.value;
    frame(60000);
    expect(view.value - before).toBeGreaterThanOrEqual(0);
    expect(view.value - before).toBeLessThanOrEqual(0.250001);
  });

  it('pauses on a hidden document and requires a new start after becoming visible', () => {
    const view = mountPlayback();
    view.play();
    advance(1000);
    act(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(view.playing).toBe(false);
    const paused = view.value;
    advance(60000);
    act(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: false });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    advance(1000);
    expect(view.value).toBe(paused);
    expect(view.playing).toBe(false);
    view.play();
    advance(1000);
    expect(view.value - paused).toBeCloseTo(1, 1);
  });

  it('pauses when experiment settings change and stays paused until explicitly restarted', () => {
    const view = mountPlayback();
    view.play();
    advance(1000);
    view.update({ resetKey: 'new-mass-and-impulse' });
    expect(view.playing).toBe(false);
    const paused = view.value;
    advance(1000);
    expect(view.value).toBe(paused);
    view.play();
    advance(1000);
    expect(view.value).toBeGreaterThan(paused);
  });

  it('stops when disabled and does not automatically restart when reenabled', () => {
    const view = mountPlayback();
    view.play();
    advance(1000);
    view.update({ disabled: true });
    expect(view.playing).toBe(false);
    expect(view.toggle.disabled).toBe(true);
    const paused = view.value;
    advance(1000);
    view.update({ disabled: false });
    advance(1000);
    expect(view.value).toBe(paused);
    expect(view.playing).toBe(false);
    expect(view.toggle.disabled).toBe(false);
  });

  it('treats an external time seek as a pause and preserves the requested position', () => {
    const view = mountPlayback();
    view.play();
    advance(1000);
    view.seek(12);
    expect(view.value).toBe(12);
    expect(view.playing).toBe(false);
    advance(1000);
    expect(view.value).toBe(12);
    view.play();
    advance(1000);
    expect(view.value).toBeCloseTo(13, 1);
  });

  it('commits the exact endpoint without overshooting or looping', () => {
    const view = mountPlayback({ value: 29.93 });
    view.play();
    advance(500);
    expect(view.value).toBe(30);
    expect(view.playing).toBe(false);
    expect(view.updates.every(value => value <= 30)).toBe(true);
    const commits = view.updates.length;
    advance(1000);
    expect(view.updates).toHaveLength(commits);
    view.seek(0);
    advance(1000);
    expect(view.value).toBe(0);
    expect(view.playing).toBe(false);
  });

  it('cancels pending animation frames when the experiment unmounts', () => {
    const view = mountPlayback();
    view.play();
    advance(100);
    expect(frames.size).toBeGreaterThan(0);
    const commits = view.updates.length;
    view.close();
    expect(frames.size).toBe(0);
    advance(1000);
    expect(view.updates).toHaveLength(commits);
  });
});
