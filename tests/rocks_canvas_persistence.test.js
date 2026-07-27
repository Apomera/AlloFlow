// Behavioural proof that the rocks/rockCycle canvases survive re-renders.
//
// The string assertions in rocks_canvas_loop.test.js pin the SHAPE of the fix
// (module-scope stable ref + init box). This file proves the EFFECT: mount the
// tool for real, change state, re-render, and assert the canvas was not torn
// down and rebuilt.
//
// That is the bug users actually felt. Both canvases were attached with inline
// callback refs, so React saw a new ref identity on every commit and ran
// ref(null) → cleanup → ref(el) → full re-init. For the landscape canvas that
// meant cancelling the rAF loop, removing the mousemove/click/keydown
// listeners, disconnecting the ResizeObserver, then rebuilding all of it with
// tick reset to 0 and hoverZone dropped — on EVERY state update.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

// `act` must come from the SAME React instance the harness mounts with — React
// lives under desktop/web-app/node_modules and is not resolvable from the repo
// root, so importing 'react' directly fails to resolve.
const act = React.act;

const ROCKS_FILE = 'stem_lab/stem_tool_rocks.js';

let restore = [];

function stubEnvironment() {
  // jsdom has no canvas backend.
  const ctx2d = new Proxy({}, {
    get: (_t, prop) => {
      if (prop === 'canvas') return null;
      if (prop === 'measureText') return () => ({ width: 10 });
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
        return () => ({ addColorStop: () => {} });
      }
      return typeof prop === 'string' ? () => {} : undefined;
    },
    set: () => true,
  });
  const origGetContext = window.HTMLCanvasElement.prototype.getContext;
  window.HTMLCanvasElement.prototype.getContext = () => ctx2d;
  restore.push(() => { window.HTMLCanvasElement.prototype.getContext = origGetContext; });

  // jsdom reports every element as 0x0, which our zero-size guard would (correctly)
  // refuse to initialise on. Give the canvases a real box.
  const origW = Object.getOwnPropertyDescriptor(window.HTMLElement.prototype, 'offsetWidth');
  const origH = Object.getOwnPropertyDescriptor(window.HTMLElement.prototype, 'offsetHeight');
  Object.defineProperty(window.HTMLElement.prototype, 'offsetWidth', { configurable: true, get: () => 640 });
  Object.defineProperty(window.HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => 480 });
  restore.push(() => {
    if (origW) Object.defineProperty(window.HTMLElement.prototype, 'offsetWidth', origW);
    if (origH) Object.defineProperty(window.HTMLElement.prototype, 'offsetHeight', origH);
  });

  if (!window.ResizeObserver) {
    window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
    restore.push(() => { delete window.ResizeObserver; });
  }
  if (!global.ResizeObserver) {
    global.ResizeObserver = window.ResizeObserver;
    restore.push(() => { delete global.ResizeObserver; });
  }
}

beforeEach(() => {
  restore = [];
  stubEnvironment();
  resetStemLab();
  loadTool(ROCKS_FILE, 'rocks');
  global.IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  restore.forEach((fn) => fn());
  restore = [];
  global.IS_REACT_ACT_ENVIRONMENT = false;
  vi.restoreAllMocks();
});

/** Mount a tool with live state and return handles for driving re-renders. */
function mountTool(toolId, initialSlice, sliceKey) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const store = { rocks: {}, rockCycle: {} };
  store[sliceKey] = Object.assign({}, initialSlice);

  let bump = null;
  function Harness() {
    const [, setN] = React.useState(0);
    bump = () => setN((n) => n + 1);
    const ctx = makeCtx({
      toolData: store,
      setToolData: (fnOrObj) => {
        const next = typeof fnOrObj === 'function' ? fnOrObj(store) : fnOrObj;
        Object.assign(store, next);
      },
    });
    return window.StemLab._registry[toolId].render(ctx);
  }

  act(() => { root.render(React.createElement(Harness)); });
  return { host, root, store, rerender: () => act(() => { bump(); }) };
}

describe('landscape canvas persistence', () => {
  it('keeps the SAME canvas node and does not re-initialise across re-renders', () => {
    const { host, root, rerender } = mountTool('rocks', { mode: 'landscape' }, 'rocks');

    const canvas = host.querySelector('[data-rocks-canvas]');
    expect(canvas, 'landscape canvas should mount').toBeTruthy();
    expect(canvas._rocksInit, 'canvas should have initialised').toBe(true);

    // Spy on the teardown. Before the fix this fired on every commit.
    const cleanupSpy = vi.fn(canvas._rocksCleanup);
    canvas._rocksCleanup = cleanupSpy;

    for (let i = 0; i < 5; i++) rerender();

    expect(host.querySelector('[data-rocks-canvas]'), 'canvas node identity').toBe(canvas);
    expect(canvas._rocksInit, 'still initialised').toBe(true);
    expect(cleanupSpy, 'teardown must not run on a re-render').not.toHaveBeenCalled();

    act(() => { root.unmount(); });
  });

  it('still tears the loop down on a real unmount', () => {
    const { host, root } = mountTool('rocks', { mode: 'landscape' }, 'rocks');
    const canvas = host.querySelector('[data-rocks-canvas]');
    const cleanupSpy = vi.fn(canvas._rocksCleanup);
    canvas._rocksCleanup = cleanupSpy;

    act(() => { root.unmount(); });

    expect(cleanupSpy, 'unmount must stop the animation loop').toHaveBeenCalled();
  });

  it('routes zone clicks through the CURRENT render closure, not a stale one', () => {
    // The element's handler is bound once at mount, so it must forward into the
    // live closure rather than capture the first render's `upd`.
    const { host, store, rerender, root } = mountTool('rocks', { mode: 'landscape' }, 'rocks');
    const canvas = host.querySelector('[data-rocks-canvas]');
    expect(typeof canvas._onSelectRock).toBe('function');

    rerender();
    rerender();

    act(() => { canvas._onSelectRock('granite', 'igneous'); });

    expect(store.rocks.selectedRock).toBe('granite');
    expect(store.rocks.selectedType).toBe('igneous');
    expect(store.rocks.mode).toBe('rocks');

    act(() => { root.unmount(); });
  });
});

describe('specimen detail art is stable across visits', () => {
  // The hand-lens canvas is what a student studies to learn a specimen. It used
  // Math.random(), and the canvas unmounts on deselect — so re-selecting the
  // same rock drew a completely new texture. "Learn what granite looks like"
  // cannot work if granite looks different every time you open it.
  function recordDrawCalls(rockId) {
    const calls = [];
    const ctx2d = new Proxy({}, {
      get: (_t, prop) => {
        if (prop === 'canvas') return null;
        if (prop === 'measureText') return () => ({ width: 10 });
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
          return () => ({ addColorStop: () => {} });
        }
        if (typeof prop !== 'string') return undefined;
        return (...args) => { calls.push(prop + ':' + args.map((a) => (typeof a === 'number' ? a.toFixed(3) : String(a))).join(',')); };
      },
      set: (_t, prop, value) => { calls.push('set ' + String(prop) + '=' + String(value)); return true; },
    });
    const orig = window.HTMLCanvasElement.prototype.getContext;
    window.HTMLCanvasElement.prototype.getContext = () => ctx2d;
    // A separate zone-highlight overlay pulses off Date.now(). That is a real
    // animation, not part of the specimen art — freeze it so this assertion
    // isolates the texture.
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1767225600000);

    const { host, root } = mountTool('rocks', { mode: 'rocks', selectedRock: rockId }, 'rocks');
    act(() => { root.unmount(); });
    host.remove();

    nowSpy.mockRestore();
    window.HTMLCanvasElement.prototype.getContext = orig;
    return calls;
  }

  it('draws the same rock texture on every visit', () => {
    const first = recordDrawCalls('granite');
    const second = recordDrawCalls('granite');
    expect(first.length).toBeGreaterThan(20);
    expect(second).toEqual(first);
  });

  it('still draws different textures for different rocks', () => {
    const granite = recordDrawCalls('granite');
    const shale = recordDrawCalls('shale');
    expect(shale).not.toEqual(granite);
  });
});

describe('rock cycle canvas persistence', () => {
  it('keeps the SAME canvas node across re-renders', () => {
    const { host, root, rerender } = mountTool('rockCycle', {}, 'rockCycle');

    const canvas = host.querySelector('canvas');
    expect(canvas, 'rock cycle canvas should mount').toBeTruthy();
    expect(canvas._rcInit, 'canvas should have initialised').toBe(true);

    const cleanupSpy = vi.fn(canvas._rcCleanup);
    canvas._rcCleanup = cleanupSpy;

    for (let i = 0; i < 5; i++) rerender();

    expect(host.querySelector('canvas'), 'canvas node identity').toBe(canvas);
    expect(canvas._rcInit, 'still initialised').toBe(true);
    expect(cleanupSpy, 'teardown must not run on a re-render').not.toHaveBeenCalled();

    act(() => { root.unmount(); });
  });

  it('survives the transformation machine progress timer', () => {
    // The timer writes progress ~10x/second. Under the old inline ref that was
    // ten full canvas rebuilds per second, which is what made the animation look
    // frozen while the machine ran.
    vi.useFakeTimers();
    const { host, root, store, rerender } = mountTool(
      'rockCycle', { startingRock: 'shale', geologicalAgent: 'heat_pressure' }, 'rockCycle'
    );

    const canvas = host.querySelector('canvas');
    const cleanupSpy = vi.fn(canvas._rcCleanup);
    canvas._rcCleanup = cleanupSpy;

    const btn = [...host.querySelectorAll('button')]
      .find((b) => (b.textContent || '').includes('Transform!'));
    expect(btn).toBeTruthy();

    act(() => { btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); });
    act(() => { vi.advanceTimersByTime(3000); });
    rerender();

    expect(cleanupSpy, 'progress ticks must not rebuild the canvas').not.toHaveBeenCalled();
    expect(host.querySelector('canvas')).toBe(canvas);
    expect(store.rockCycle.transformationResult, 'run should have completed').toBeTruthy();
    expect(store.rockCycle.transformationAnimActive).toBe(false);

    act(() => { root.unmount(); });
    vi.useRealTimers();
  });
});
