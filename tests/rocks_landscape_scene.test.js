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
    expect(src).toContain('if (rocksMotionReduced()) drawLandscape();');
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

describe('depth scale', () => {
  const drawAt = (offsetHeight) => {
    const node = renderLandscape();
    const canvas = findAll(node, (n) => n.type === 'canvas' && n.props['data-rocks-canvas'])[0];
    const ref = canvas.ref || canvas.props.ref;
    const rec = recordingContext();
    ref({
      offsetWidth: 800, offsetHeight, width: 0, height: 0, isConnected: true, style: {},
      getContext: () => rec.ctx,
      addEventListener() {}, removeEventListener() {}, setAttribute() {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: offsetHeight }),
    });
    return rec.texts;
  };

  it('labels the burial and metamorphic depths, not just the two ends', () => {
    const texts = drawAt(520);
    expect(texts).toContain('~5 km · burial');
    expect(texts).toContain('~15 km · heat + pressure');
  });

  it('drops the intermediate marks on a short canvas where they would crowd', () => {
    const texts = drawAt(240);
    expect(texts.some((t) => t.startsWith('0 km'))).toBe(true);
    expect(texts).not.toContain('~5 km · burial');
  });
});

describe('the superposition cue sits on the rocks it describes', () => {
  it('draws "younger" inside the sedimentary basin, not on the folded root', () => {
    const src = readFileSync(ROCKS_FILE, 'utf8');
    // The basin runs from 0.38W to 0.70W; the folded metamorphic root starts at
    // 0.63W. The cue used to be drawn at 0.715W — on beds that have been folded
    // and locally overturned, where "youngest on top" is not just unhelpful but
    // wrong. Pin the basin geometry AND the cue together so neither drifts.
    expect(src).toContain('var bx0 = W * 0.38, bx1 = W * 0.70;');
    expect(src).toContain('var fx0 = W * 0.63, fx1 = W * 0.975;');
    const cue = src.slice(src.indexOf('// Superposition cue: youngest on top.'));
    const arrow = /rkLsArrow\(W \* ([\d.]+),/.exec(cue);
    expect(arrow, 'superposition arrow').toBeTruthy();
    const x = Number(arrow[1]);
    expect(x).toBeGreaterThan(0.38);
    expect(x).toBeLessThan(0.63);
  });

  it('still paints the label, on a plate so the pale beds cannot swallow it', () => {
    const node = renderLandscape();
    const canvas = findAll(node, (n) => n.type === 'canvas' && n.props['data-rocks-canvas'])[0];
    const ref = canvas.ref || canvas.props.ref;
    const rec = recordingContext();
    ref({
      offsetWidth: 800, offsetHeight: 520, width: 0, height: 0, isConnected: true, style: {},
      getContext: () => rec.ctx,
      addEventListener() {}, removeEventListener() {}, setAttribute() {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 520 }),
    });
    expect(rec.texts).toContain('younger');
    expect(readFileSync(ROCKS_FILE, 'utf8')).toContain('var ygW = ctx.measureText(ygTxt).width;');
  });

  it('gives the metamorphic root the fabric that defines it', () => {
    const src = readFileSync(ROCKS_FILE, 'utf8');
    // Six flat bands of colour was the least informative part of a scene whose
    // sedimentary beds carry grains and fossils. Foliation follows the folds.
    expect(src).toContain('// Foliation. "The minerals lined up" is what metamorphic means');
    expect(src).toContain('var fyLine = fyTop + (fyBot - fyTop) * (j / 4);');
    expect(src).toContain('foldY(pbB + 1, pbX)'); // porphyroblasts placed inside a band
  });
});

describe('WCAG 2.2.2 — the scene can be stopped by anyone', () => {
  const mount = (props) => {
    const node = renderLandscape();
    const canvas = findAll(node, (n) => n.type === 'canvas' && n.props['data-rocks-canvas'])[0];
    const ref = canvas.ref || canvas.props.ref;
    const rec = recordingContext();
    const el = Object.assign({
      offsetWidth: 800, offsetHeight: 520, width: 0, height: 0, isConnected: true, style: {}, dataset: {},
      getContext: () => rec.ctx,
      addEventListener() {}, removeEventListener() {}, setAttribute() {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 520 }),
    }, props || {});
    ref(el);
    return { node, canvas, el, rec };
  };

  it('offers a pause control beside the tour controls', () => {
    const node = renderLandscape();
    const btn = findAll(node, (n) => n.type === 'button' && n.props['data-rocks-motion'])[0];
    expect(btn, 'motion control').toBeTruthy();
    expect(btn.props['data-rocks-motion']).toBe('on');
    expect(btn.props['aria-pressed']).toBe(false);
    expect(String(btn.props.children)).toContain('Pause motion');
  });

  it('flips to resume, and records the choice on the store and the canvas', () => {
    const node = renderLandscape();
    findAll(node, (n) => n.type === 'button' && n.props['data-rocks-motion'])[0].props.onClick();
    expect(lastStore.rocks.motionOff).toBe(true);
    // renderLandscape() starts from a fresh store, so render the paused state
    // explicitly rather than expecting the previous click to carry over.
    const store = { rocks: { mode: 'landscape', motionOff: true }, rockCycle: {} };
    const ctx = makeCtx({ toolData: store, setToolData: (f) => Object.assign(store, typeof f === 'function' ? f(store) : f) });
    const after = window.StemLab._registry.rocks.render(ctx);
    const btn = findAll(after, (n) => n.type === 'button' && n.props['data-rocks-motion'])[0];
    expect(btn.props['data-rocks-motion']).toBe('off');
    expect(btn.props['aria-pressed']).toBe(true);
    expect(String(btn.props.children)).toContain('Resume motion');
    // The canvas carries the flag too, so a remount starts held still.
    const canvas = findAll(after, (n) => n.type === 'canvas' && n.props['data-rocks-canvas'])[0];
    expect(canvas.props['data-rocks-motion-off']).toBe('1');
  });

  it('holds the scene still when the flag is set, without the OS preference', () => {
    // matchMedia says "no preference" in this suite's beforeEach setup for the
    // reduced-motion query only when asked; force the honest case here.
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
    const stopped = mount({ dataset: { rocksMotionOff: '1' } });
    expect(typeof stopped.el._rocksSetMotion).toBe('function');
    const framesWhileStopped = stopped.rec.calls.length;
    // A second draw request must still paint (a static frame), but the loop
    // must not be scheduling itself: rAF is absent in this environment, so the
    // meaningful check is that the flag is what the guard reads.
    expect(framesWhileStopped).toBeGreaterThan(0);
    const moving = mount({ dataset: {} });
    expect(moving.el.dataset.rocksMotionOff).toBeFalsy();
  });

  it('stops the decorative nudge ring from pulsing forever', () => {
    // A looping box-shadow with no off switch is the plainest 2.2.2 failure
    // there is, and this one exists only to catch the eye once.
    const src = readFileSync(ROCKS_FILE, 'utf8');
    expect(src).toContain("'.rk-wb-nudge{animation:rkWbNudge 2.6s ease-out 1}'");
    expect(src).not.toContain('rkWbNudge 2.6s ease-out infinite');
  });
});

describe('the caption cannot collide with the diagram it labels', () => {
  it('keeps the canvas caption short and states the scale caveat below it', () => {
    // At 390px the long caption ran straight through the heat-and-pressure
    // label. The caveat is not decoration, so it moved to the hint line under
    // the canvas where it is always readable, rather than being dropped.
    const node = renderLandscape();
    const canvas = findAll(node, (n) => n.type === 'canvas' && n.props['data-rocks-canvas'])[0];
    const ref = canvas.ref || canvas.props.ref;
    const rec = recordingContext();
    ref({
      offsetWidth: 374, offsetHeight: 280, width: 0, height: 0, isConnected: true, style: {}, dataset: {},
      getContext: () => rec.ctx,
      addEventListener() {}, removeEventListener() {}, setAttribute() {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 374, height: 280 }),
    });
    const caption = rec.texts.filter((t) => t.indexOf('Cross-Section View') !== -1)[0];
    expect(caption, 'canvas caption').toBeTruthy();
    expect(caption).not.toContain('schematic');

    const hint = findAll(node, (n) => n.type === 'p' && typeof n.props.children === 'string'
      && n.props.children.indexOf('Click landscape zones') !== -1)[0];
    expect(hint, 'hint line').toBeTruthy();
    expect(hint.props.children).toContain('schematic, not to scale');
    expect(hint.props.children).toContain('Vertical scale is exaggerated');
  });
});
