// Rocks & Minerals landscape: the first diagram a student sees.
//
// Runs the real canvas initialiser against a recording 2D context so the
// frame is actually DRAWN (a golden of the SSR tree cannot see a canvas).
// Pins the scene's teaching content and that it needs no ctx.roundRect.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const ROCKS_FILE = 'stem_lab/stem_tool_rocks.js';

function findAll(node, predicate, acc = []) {
  if (node == null || typeof node !== 'object') return acc;
  if (Array.isArray(node)) { node.forEach((n) => findAll(n, predicate, acc)); return acc; }
  if (predicate(node)) acc.push(node);
  const kids = node.props && node.props.children;
  if (kids != null) findAll(kids, predicate, acc);
  return acc;
}

function recordingContext() {
  const calls = [];
  const texts = [];
  const gradient = { addColorStop() {} };
  const target = {
    measureText: (t) => ({ width: String(t).length * 5 }),
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    fillText: (t) => { texts.push(String(t)); calls.push('fillText'); },
  };
  const ctx = new Proxy(target, {
    get(t, prop) {
      if (prop in t) return t[prop];
      if (typeof prop !== 'string') return undefined;
      if (prop === 'roundRect') return undefined; // older WebViews lack it
      return (...args) => { calls.push(prop); return undefined; };
    },
    set(t, prop, v) { t[prop] = v; return true; },
  });
  return { ctx, calls, texts };
}

let lastStore = null;
function renderLandscape() {
  const store = { rocks: { mode: 'landscape' }, rockCycle: {} };
  lastStore = store;
  const ctx = makeCtx({ toolData: store, setToolData: (f) => Object.assign(store, typeof f === 'function' ? f(store) : f) });
  return window.StemLab._registry.rocks.render(ctx);
}

beforeEach(() => {
  resetStemLab();
  loadTool(ROCKS_FILE, 'rocks');
  globalThis.ResizeObserver = class { observe() {} disconnect() {} };
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('landscape cross-section scene', () => {
  it('draws the full scene on first frame without ctx.roundRect and tears down cleanly', () => {
    const node = renderLandscape();
    const canvas = findAll(node, (n) => n.type === 'canvas' && n.props['data-rocks-canvas'])[0];
    expect(canvas, 'landscape canvas').toBeTruthy();
    const refOf = (el) => el.ref || (el.props && el.props.ref);
    const ref = refOf(canvas);
    expect(typeof ref).toBe('function');
    expect(refOf(findAll(renderLandscape(), (n) => n.type === 'canvas')[0])).toBe(ref); // identity-stable

    const rec = recordingContext();
    const el = {
      offsetWidth: 800, offsetHeight: 520, width: 0, height: 0, isConnected: true, style: {},
      getContext: () => rec.ctx,
      addEventListener() {}, removeEventListener() {}, setAttribute() {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 520 }),
    };
    expect(() => ref(el)).not.toThrow();
    expect(el._rocksInit).toBe(true);
    expect(rec.calls).not.toContain('roundRect');
    expect(rec.calls.filter((c) => c === 'fill').length).toBeGreaterThan(80);
    ['ellipse', 'quadraticCurveTo', 'clip', 'setLineDash'].forEach((c) => expect(rec.calls).toContain(c));
    // Teaching content the scene must carry.
    ['🪨 Cross-Section View', 'younger', 'Weathering & erosion', 'Melting', 'Cooling', 'uplift', 'pressure', 'Igneous', 'Sedimentary', 'Metamorphic']
      .forEach((label) => expect(rec.texts, label).toContain(label));
    expect(rec.texts.some((t) => t.startsWith('0 km'))).toBe(true);
    expect(rec.texts.some((t) => t.includes('hot'))).toBe(true);
    // No emoji fossils painted straight onto the beds any more.
    expect(rec.texts).not.toContain('🦴');
    expect(rec.texts).not.toContain('🐚');
    expect(typeof el._rocksCleanup).toBe('function');
    el._rocksCleanup();
    expect(el._rocksInit).toBe(false);
  });

  it('keeps the zone hit-areas, keyboard selector and reduced-motion loop contract', () => {
    const src = readFileSync(ROCKS_FILE, 'utf8');
    expect(src).toContain("{ id: 'volcano', label: '🌋 Volcano (Igneous)', x: 0.12, y: 0.15, w: 0.22, h: 0.55, type: 'igneous' }");
    expect(src).toContain("{ id: 'river', label: '🏖️ River Delta (Sedimentary)', x: 0.5, y: 0.45, w: 0.28, h: 0.35, type: 'sedimentary' }");
    expect(src).toContain("{ id: 'mountain', label: '⛰️ Mountain Core (Metamorphic)', x: 0.75, y: 0.08, w: 0.22, h: 0.62, type: 'metamorphic' }");
    expect(src).toContain('function onRockKey(e)');
    expect(src).toContain('if (rocksMotionReduced) drawLandscape();');
    // Scene features, by name, so a later "simplification" cannot silently drop them.
    ['Alternating lava / ash layers', 'Ash plume', 'Convection cells', 'Folded metamorphic root', 'Fossils drawn as shapes', 'Delta fan', 'Depth / temperature scale', 'Contact']
      .forEach((marker) => expect(src, marker).toContain(marker));
  });
});

describe('landscape keyboard two-press selector', () => {
  function mountWithListeners() {
    const node = renderLandscape();
    const canvas = findAll(node, (n) => n.type === 'canvas' && n.props['data-rocks-canvas'])[0];
    const ref = canvas.ref || canvas.props.ref;
    const rec = recordingContext();
    const handlers = {};
    const selected = [];
    const el = {
      offsetWidth: 800, offsetHeight: 520, width: 0, height: 0, isConnected: true, style: {},
      getContext: () => rec.ctx,
      addEventListener(type, fn) { handlers[type] = fn; }, removeEventListener() {}, setAttribute() {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 520 }),
      _onSelectRock: (id, type) => selected.push(type),
    };
    ref(el);
    return { el, handlers, selected, rec };
  }
  const live = () => document.getElementById('allo-live-rocks');

  it('previews a zone on the first press and opens it on the second', () => {
    const { handlers, selected, rec } = mountWithListeners();
    const prevented = [];
    handlers.keydown({ key: '2', preventDefault: () => prevented.push(1) });
    expect(lastStore.rocks.mode).toBe('landscape');
    expect(live().textContent).toMatch(/sedimentary/i);
    expect(live().textContent).toMatch(/press the same key again/i);
    expect(rec.texts).toContain('Sediment settles, compacts and cements → sedimentary'); // caption drawn (reduced motion redraws)
    handlers.keydown({ key: '2', preventDefault: () => prevented.push(1) });
    expect(lastStore.rocks.mode).toBe('rocks');
    expect(lastStore.rocks.selectedType).toBe('sedimentary');
    expect(prevented).toHaveLength(2);
  });

  it('opens a previewed zone with Enter and clears it with Escape', () => {
    const { handlers, selected } = mountWithListeners();
    handlers.keydown({ key: '3', preventDefault() {} });
    handlers.keydown({ key: 'Escape', preventDefault() {} });
    expect(live().textContent).toMatch(/cleared/i);
    handlers.keydown({ key: 'Enter', preventDefault() {} });
    expect(lastStore.rocks.mode).toBe('landscape'); // nothing previewed after Escape
    handlers.keydown({ key: '1', preventDefault() {} });
    handlers.keydown({ key: 'Enter', preventDefault() {} });
    expect(lastStore.rocks.mode).toBe('rocks');
    expect(lastStore.rocks.selectedType).toBe('igneous');
  });
});

describe('follow-one-rock tour', () => {
  function mountTour() {
    const node = renderLandscape();
    const canvas = findAll(node, (n) => n.type === 'canvas' && n.props['data-rocks-canvas'])[0];
    const ref = canvas.ref || canvas.props.ref;
    const rec = recordingContext();
    const handlers = {};
    const el = {
      offsetWidth: 800, offsetHeight: 520, width: 0, height: 0, isConnected: true, style: {},
      getContext: () => rec.ctx,
      addEventListener(type, fn) { handlers[type] = fn; }, removeEventListener() {}, setAttribute() {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 520 }),
    };
    ref(el);
    return { el, handlers, rec, node };
  }
  const live = () => document.getElementById('allo-live-rocks');

  it('steps through five announced stages, drawing a still frame per stage under reduced motion', () => {
    const { el, rec } = mountTour();
    expect(typeof el._rocksTourCmd).toBe('function');
    expect(rec.texts.some((t) => t.startsWith('Stage '))).toBe(false);
    el._rocksTourCmd('play');
    expect(el._rocksTourState()).toMatchObject({ stage: 0, playing: false, total: 5 }); // reduced motion: never auto-plays
    expect(live().textContent).toMatch(/^Stage 1 of 5: Magma cools/);
    expect(rec.texts.some((t) => t.startsWith('Stage 1 of 5'))).toBe(true);
    el._rocksTourCmd('next');
    expect(live().textContent).toMatch(/Stage 2 of 5: Weathering/);
    el._rocksTourCmd('next'); el._rocksTourCmd('next'); el._rocksTourCmd('next');
    expect(live().textContent).toMatch(/Stage 5 of 5: Deep enough, it melts/);
    el._rocksTourCmd('next');
    expect(el._rocksTourState().stage).toBe(0); // wraps: the cycle never stops
    el._rocksTourCmd('stop');
    expect(el._rocksTourState().stage).toBe(-1);
    expect(live().textContent).toMatch(/stopped/i);
  });

  it('is reachable from the keyboard (T toggles, N and P step) and from the React controls', () => {
    const { el, handlers, node } = mountTour();
    handlers.keydown({ key: 't', preventDefault() {} });
    expect(el._rocksTourState().stage).toBe(0);
    handlers.keydown({ key: 'n', preventDefault() {} });
    expect(el._rocksTourState().stage).toBe(1);
    handlers.keydown({ key: 'p', preventDefault() {} });
    expect(el._rocksTourState().stage).toBe(0);
    handlers.keydown({ key: 'T', preventDefault() {} });
    expect(el._rocksTourState().stage).toBe(-1);
    const play = findAll(node, (n) => n.type === 'button' && n.props['data-rocks-tour'] === 'play')[0];
    expect(play, 'play control').toBeTruthy();
    expect(play.props['aria-pressed']).toBe(false);
  });
});

describe('clickable process labels', () => {
  it('jumps the tour to the stage whose label was clicked', () => {
    const node = renderLandscape();
    const canvas = findAll(node, (n) => n.type === 'canvas' && n.props['data-rocks-canvas'])[0];
    const ref = canvas.ref || canvas.props.ref;
    const rec = recordingContext();
    const handlers = {};
    const el = {
      offsetWidth: 800, offsetHeight: 520, width: 0, height: 0, isConnected: true, style: {},
      getContext: () => rec.ctx,
      addEventListener(type, fn) { handlers[type] = fn; }, removeEventListener() {}, setAttribute() {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 520 }),
    };
    ref(el);
    // The "Melting" pill is drawn centred at (0.44W, 0.91H); click its centre.
    handlers.click({ clientX: 0.44 * 800, clientY: 0.91 * 520 - 3 });
    expect(el._rocksTourState().stage).toBe(4);
    expect(document.getElementById('allo-live-rocks').textContent).toMatch(/Stage 5 of 5/);
    expect(lastStore.rocks.tourOn).toBe(true);
    // Hovering a pill shows a pointer.
    handlers.mousemove({ clientX: 0.44 * 800, clientY: 0.91 * 520 - 3 });
    expect(el.style.cursor).toBe('pointer');
  });
});
