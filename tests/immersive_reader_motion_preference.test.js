import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const reactPath = resolve('desktop/web-app/node_modules');
const query = '(prefers-reduced-motion: reduce)';
const passage = 'First reading paragraph.\n\nSecond reading paragraph.';
let React, createRoot, act, Crawl, root, host, frames;

beforeAll(() => {
  React = require(resolve(reactPath, 'react'));
  ({ createRoot } = require(resolve(reactPath, 'react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloLanguageContext = React.createContext({ t: key => key });
  loadAlloModule('immersive_reader_module.js');
  Crawl = window.AlloModules.PerspectiveCrawlOverlay;
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  localStorage.clear();
  frames = new Map();
  let serial = 0;
  vi.stubGlobal('requestAnimationFrame', vi.fn(callback => {
    const id = ++serial;
    frames.set(id, callback);
    return id;
  }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn(id => frames.delete(id)));
});

afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  host?.remove();
  host = null;
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function preference(initial, legacy = false) {
  const listeners = new Set();
  const added = [];
  const removed = [];
  const media = { matches: initial, media: query };
  const add = listener => { listeners.add(listener); added.push(listener); };
  const remove = listener => { listeners.delete(listener); removed.push(listener); };
  if (legacy) {
    media.addListener = vi.fn(add);
    media.removeListener = vi.fn(remove);
  } else {
    media.addEventListener = vi.fn((type, listener) => {
      expect(type).toBe('change');
      add(listener);
    });
    media.removeEventListener = vi.fn((type, listener) => {
      expect(type).toBe('change');
      remove(listener);
    });
  }
  vi.stubGlobal('matchMedia', vi.fn(value => {
    expect(value).toBe(query);
    return media;
  }));
  return {
    media, listeners, added, removed,
    change(matches) {
      media.matches = matches;
      act(() => [...listeners].forEach(listener => listener({ matches, media: query })));
    }
  };
}

function render(props = {}, strict = false) {
  if (!host) {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
  }
  const element = React.createElement(Crawl, { text: passage, isOpen: true, onClose: () => {}, ...props });
  act(() => root.render(strict ? React.createElement(React.StrictMode, null, element) : element));
}

function surface() {
  return host.querySelector('[role="button"][aria-pressed]');
}

function playing() {
  return surface().getAttribute('aria-pressed') === 'true';
}

function clickPlay() {
  const play = host.querySelector('button[aria-label="Play"]');
  expect(play).not.toBeNull();
  act(() => play.click());
}

function frame(time) {
  act(() => {
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach(callback => callback(time));
  });
}

function ambientAudio() {
  const contexts = [];
  vi.stubGlobal('AudioContext', class {
    constructor() {
      this.currentTime = 0;
      this.state = 'running';
      this.destination = {};
      this.oscillators = [];
      this.gain = { gain: { value: 0, cancelScheduledValues: vi.fn(), setTargetAtTime: vi.fn() }, connect: vi.fn() };
      this.close = vi.fn(() => { this.state = 'closed'; });
      contexts.push(this);
    }
    createGain() { return this.gain; }
    createBiquadFilter() { return { frequency: { value: 0 }, Q: { value: 0 }, connect: vi.fn() }; }
    createOscillator() {
      const oscillator = { frequency: { value: 0 }, detune: { value: 0 }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
      this.oscillators.push(oscillator);
      return oscillator;
    }
  });
  localStorage.setItem('allo_crawl_ambient', '1');
  return contexts;
}

function expectAudioClosed(contexts) {
  expect(contexts.length).toBeGreaterThan(0);
  contexts.forEach(context => {
    expect(context.close).toHaveBeenCalledOnce();
    expect(context.oscillators).toHaveLength(3);
    context.oscillators.forEach(oscillator => expect(oscillator.stop).toHaveBeenCalledOnce());
  });
}

describe.each([false, true])('Crawl motion preference (StrictMode=%s)', strict => {
  it('starts reduced motion paused and still allows intentional playback', () => {
    const motion = preference(true);
    render({}, strict);
    expect(playing()).toBe(false);
    expect(surface().className).toContain('overflow-auto');
    expect(frames.size).toBe(0);
    expect(motion.listeners.size).toBe(1);
    clickPlay();
    expect(playing()).toBe(true);
    expect(frames.size).toBe(1);
  });

  it.each([false, true])('pauses a moving crawl on a live preference change without auto-resuming (legacy=%s)', legacy => {
    const motion = preference(false, legacy);
    render({}, strict);
    expect(playing()).toBe(true);
    expect(frames.size).toBe(1);
    const slab = surface().querySelector('p').parentElement;
    frame(0);
    frame(100);
    const position = slab.style.transform;
    expect(position).not.toContain('translateY(0px)');
    motion.change(true);
    expect(playing()).toBe(false);
    expect(frames.size).toBe(0);
    frame(500);
    expect(slab.style.transform).toBe(position);
    motion.change(false);
    expect(playing()).toBe(false);
    expect(frames.size).toBe(0);
    motion.change(true);
    clickPlay();
    expect(playing()).toBe(true);
    expect(frames.size).toBe(1);
  });

  it('checks the current preference when the text changes or the overlay reopens', () => {
    const motion = preference(false);
    render({}, strict);
    expect(playing()).toBe(true);
    motion.media.matches = true;
    render({ text: 'A replacement passage.' }, strict);
    expect(host.textContent).toContain('A replacement passage.');
    expect(playing()).toBe(false);
    expect(frames.size).toBe(0);
    clickPlay();
    render({ text: 'A replacement passage.', isOpen: false }, strict);
    expect(motion.listeners.size).toBe(0);
    expect(frames.size).toBe(0);
    render({ text: 'A replacement passage.' }, strict);
    expect(playing()).toBe(false);
    render({ isOpen: false }, strict);
    motion.media.matches = false;
    render({}, strict);
    expect(playing()).toBe(true);
    expect(motion.listeners.size).toBe(1);
  });

  it.each([false, true])('removes listeners on close and unmount and ignores callbacks from old sessions (legacy=%s)', legacy => {
    const motion = preference(false, legacy);
    render({ isOpen: false }, strict);
    expect(motion.listeners.size).toBe(0);
    expect(frames.size).toBe(0);
    render({}, strict);
    expect(motion.listeners.size).toBe(1);
    const stale = [...motion.listeners][0];
    render({ isOpen: false }, strict);
    expect(motion.listeners.size).toBe(0);
    expect(motion.removed).toHaveLength(motion.added.length);
    expect(frames.size).toBe(0);
    act(() => stale({ matches: true, media: query }));
    expect(host.childElementCount).toBe(0);
    expect(frames.size).toBe(0);
    render({}, strict);
    expect(playing()).toBe(true);
    act(() => stale({ matches: true, media: query }));
    expect(playing()).toBe(true);
    expect(frames.size).toBe(1);
    const finalListener = [...motion.listeners][0];
    act(() => root.unmount());
    root = null;
    expect(motion.listeners.size).toBe(0);
    expect(motion.removed).toHaveLength(motion.added.length);
    act(() => finalListener({ matches: true, media: query }));
    expect(frames.size).toBe(0);
  });

  it('does not allocate ambient audio when first opened from hidden with a reduced preference', () => {
    const motion = preference(false);
    const contexts = ambientAudio();
    render({ isOpen: false }, strict);
    expect(contexts).toHaveLength(0);
    motion.media.matches = true;
    render({}, strict);
    expect(playing()).toBe(false);
    expect(frames.size).toBe(0);
    expect(contexts).toHaveLength(0);
  });

  it('fades ambient audio on reduction, resumes only by explicit play, and releases audio on unmount', () => {
    const motion = preference(false);
    const contexts = ambientAudio();
    render({}, strict);
    const count = contexts.length;
    expect(count).toBeGreaterThan(0);
    const current = contexts[count - 1];
    expect(contexts.filter(context => context.state === 'running')).toHaveLength(1);
    expect(current.gain.gain.setTargetAtTime).toHaveBeenLastCalledWith(0.06, 0, 0.8);
    motion.change(true);
    expect(playing()).toBe(false);
    expect(current.gain.gain.setTargetAtTime).toHaveBeenLastCalledWith(0, 0, 0.4);
    motion.change(false);
    expect(playing()).toBe(false);
    expect(current.gain.gain.setTargetAtTime).toHaveBeenLastCalledWith(0, 0, 0.4);
    clickPlay();
    expect(playing()).toBe(true);
    expect(contexts).toHaveLength(count);
    expect(current.gain.gain.setTargetAtTime).toHaveBeenLastCalledWith(0.06, 0, 0.8);
    act(() => root.unmount());
    root = null;
    expectAudioClosed(contexts);
    expect(frames.size).toBe(0);
  });

  it('releases ambient audio on close and does not allocate it while reopening reduced motion', () => {
    const motion = preference(false);
    const contexts = ambientAudio();
    render({}, strict);
    const count = contexts.length;
    expect(playing()).toBe(true);
    render({ isOpen: false }, strict);
    expectAudioClosed(contexts);
    expect(frames.size).toBe(0);
    motion.media.matches = true;
    render({}, strict);
    expect(playing()).toBe(false);
    expect(frames.size).toBe(0);
    expect(contexts).toHaveLength(count);
  });
});
