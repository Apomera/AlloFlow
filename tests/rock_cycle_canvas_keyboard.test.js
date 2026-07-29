// The rock cycle diagram canvas: keyboard access and an honest label.
//
// TWO DEFECTS, both invisible to every existing test:
//
//   1. KEYBOARD (SC 2.1.1). The canvas shipped as tabIndex=0 with a click
//      listener and no key handler. A keyboard user tabbed onto it, heard its
//      label say "click to inspect", and had nothing to press. The three family
//      buttons below do the same job, so no function was lost — but the canvas
//      was a focus stop that promised interaction and delivered none.
//
//   2. THE LABEL (SC 1.1.1). It read "Rock sample close-up of igneous — click
//      to inspect", copied from the sibling rocks tool's specimen canvas. This
//      canvas draws an Earth cross-section with three family nodes, six pathway
//      arrows and a magma chamber. The label described a different picture.
//
// WHY THIS TEST MOUNTS INSTEAD OF GREPPING. The sibling canvas tests in
// rocks_canvas_loop.test.js assert on source strings. That catches deletion but
// not deadness: a handler can be attached and still never fire. Twice this
// session a test passed against markup that never reached the DOM. So this
// drives the real ref, dispatches real events, and reads the real store.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  React,
  ReactDOMServer,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const ROCKS_FILE = 'stem_lab/stem_tool_rocks.js';
const PATHS = [
  'stem_lab/stem_tool_rocks.js',
  'desktop/web-app/public/stem_lab/stem_tool_rocks.js',
];

const W = 600;
const H = 420;

// A recording 2D context. Every method returns one object that answers both
// addColorStop (gradients) and .width (measureText), so draw() runs start to
// finish without a canvas backend.
function stubCanvas() {
  const el = document.createElement('canvas');
  Object.defineProperty(el, 'offsetWidth', { value: W });
  Object.defineProperty(el, 'offsetHeight', { value: H });
  el.getBoundingClientRect = () => ({ left: 0, top: 0, width: W, height: H, right: W, bottom: H });
  const returned = { addColorStop() {}, width: 24 };
  el.getContext = () => new Proxy({}, {
    get: (_t, k) => (k === 'canvas' ? el : () => returned),
    set: () => true,
  });
  document.body.appendChild(el);
  return el;
}

function mk(rockCycle, overrides) {
  const store = { rocks: {}, rockCycle: Object.assign({}, rockCycle) };
  const ctx = makeCtx(Object.assign({
    toolData: store,
    setToolData: (fnOrObj) => {
      const next = typeof fnOrObj === 'function' ? fnOrObj(store) : fnOrObj;
      Object.assign(store, next);
    },
    // The harness default returns the raw key when there is no fallback, so
    // rock.label would be 'stem.rocks.igneous'. Trim to the last segment: the
    // announcement assertions below then read as a human would hear them.
    t: (k, fb) => fb || String(k).split('.').pop(),
  }, overrides || {}));
  return { store, ctx };
}

function tree(rockCycle, overrides) {
  const { store, ctx } = mk(rockCycle, overrides);
  return { store, ctx, node: window.StemLab._registry.rockCycle.render(ctx) };
}

function findAll(node, predicate, acc = []) {
  if (node == null || typeof node !== 'object') return acc;
  if (Array.isArray(node)) { node.forEach((n) => findAll(n, predicate, acc)); return acc; }
  if (predicate(node)) acc.push(node);
  const kids = node.props && node.props.children;
  if (kids != null) findAll(kids, predicate, acc);
  return acc;
}

function canvasNode(node) {
  const hits = findAll(node, (n) => n.type === 'canvas');
  expect(hits.length, 'expected exactly one canvas in the rock cycle tool').toBe(1);
  return hits[0];
}

// Render, pull the ref React would have called, and hand it a live element.
function mountCanvas(rockCycle, overrides) {
  const live = tree(rockCycle, overrides);
  const el = stubCanvas();
  const ref = canvasNode(live.node).ref;
  expect(typeof ref, 'the canvas must take a callback ref').toBe('function');
  ref(el);
  expect(el._rcInit, 'canvas initialiser did not run — the rest of this test would be vacuous').toBe(true);
  return Object.assign(live, { el });
}

function press(el, key) {
  const ev = new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  el.dispatchEvent(ev);
  return ev;
}

beforeEach(() => {
  resetStemLab();
  loadTool(ROCKS_FILE, 'rocks');
  // Reduced motion keeps draw() to a single synchronous pass instead of an
  // endless rAF loop, and exercises the redraw-on-select branch.
  window.matchMedia = () => ({ matches: true, addListener() {}, removeListener() {} });
  document.body.innerHTML = '';
});

describe('rock cycle canvas — keyboard selection', () => {
  it('selects a family with the number keys', () => {
    const { el, store } = mountCanvas({});
    expect(store.rockCycle.selectedRock).toBeUndefined();

    press(el, '2');
    expect(store.rockCycle.selectedRock).toBe('sedimentary');

    press(el, '3');
    expect(store.rockCycle.selectedRock).toBe('metamorphic');

    press(el, '1');
    expect(store.rockCycle.selectedRock).toBe('igneous');
  });

  it('accepts the letter aliases its own label does not have to spell out', () => {
    const cases = [['i', 'igneous'], ['S', 'sedimentary'], ['m', 'metamorphic']];
    cases.forEach(([key, id]) => {
      const { el, store } = mountCanvas({});
      press(el, key);
      expect(store.rockCycle.selectedRock, `key "${key}"`).toBe(id);
    });
  });

  it('credits the family as explored, so the quest hook can advance', () => {
    const { el, store } = mountCanvas({});
    press(el, '1');
    press(el, '2');
    press(el, '3');
    expect(Object.keys(store.rockCycle.rcViewed || {}).sort())
      .toEqual(['igneous', 'metamorphic', 'sedimentary']);

    // That is exactly what the tool's own quest hook counts.
    const hook = window.StemLab._registry.rockCycle.questHooks
      .find((q) => q.id === 'view_3_rocks');
    expect(hook.check(store.rockCycle)).toBe(true);
  });

  it('announces the selection — role=application announces nothing on its own', () => {
    const announceToSR = vi.fn();
    const { el } = mountCanvas({}, { announceToSR });
    press(el, '2');
    expect(announceToSR).toHaveBeenCalledTimes(1);
    const said = announceToSR.mock.calls[0][0];
    expect(said).toContain('sedimentary');
    expect(said).toMatch(/selected/i);
    // Not just the name: the family's own description follows, so a
    // screen-reader user gets the same payload the sighted panel shows.
    expect(said.length).toBeGreaterThan(40);
  });

  it('ignores keys it does not own, and does not swallow them', () => {
    const { el, store } = mountCanvas({});
    const ev = press(el, 'a');
    expect(store.rockCycle.selectedRock).toBeUndefined();
    expect(ev.defaultPrevented, 'an unhandled key must stay available to the page').toBe(false);

    // A modified chord belongs to the browser, not to us.
    const chord = new window.KeyboardEvent('keydown', { key: '1', ctrlKey: true, bubbles: true, cancelable: true });
    el.dispatchEvent(chord);
    expect(store.rockCycle.selectedRock).toBeUndefined();
  });

  it('claims the keys it handles', () => {
    const { el } = mountCanvas({});
    expect(press(el, '2').defaultPrevented).toBe(true);
  });

  it('stops listening once the canvas is torn down', () => {
    const { el, store } = mountCanvas({});
    el._rcCleanup();
    press(el, '1');
    expect(store.rockCycle.selectedRock).toBeUndefined();
  });
});

describe('rock cycle canvas — the pointer path still works', () => {
  // The click handler was refactored to call the same rcSelectFamily the
  // keyboard uses. If that refactor had broken the pointer path, every test
  // above would still pass.
  it('selects the family whose node was clicked', () => {
    const { el, store } = mountCanvas({});
    // Node centres are fractions of the canvas; dpr cancels out of the
    // client→canvas mapping, so clientX/Y are just the CSS-pixel centres.
    el.dispatchEvent(new window.MouseEvent('click', {
      clientX: W * 0.82, clientY: H * 0.7, bubbles: true,
    }));
    expect(store.rockCycle.selectedRock).toBe('sedimentary');
    expect(store.rockCycle.rcViewed.sedimentary).toBe(true);
  });

  it('ignores a click on empty rock', () => {
    const { el, store } = mountCanvas({});
    el.dispatchEvent(new window.MouseEvent('click', { clientX: 2, clientY: 2, bubbles: true }));
    expect(store.rockCycle.selectedRock).toBeUndefined();
  });
});

describe('rock cycle canvas — the label describes this canvas', () => {
  function label(rockCycle) {
    return canvasNode(tree(rockCycle).node).props['aria-label'];
  }

  it('no longer describes the sibling tool’s specimen close-up', () => {
    const l = label({});
    expect(l).not.toMatch(/close-?up/i);
    expect(l).not.toMatch(/click to inspect/i);
  });

  it('describes what is actually drawn', () => {
    const l = label({});
    // The three nodes and their positions, and the six arrows the canvas draws.
    ['igneous', 'sedimentary', 'metamorphic'].forEach((fam) => expect(l).toContain(fam));
    expect(l).toMatch(/six/i);
    expect(l).toMatch(/magma/i);
  });

  it('tells the user which keys work', () => {
    const l = label({});
    expect(l).toMatch(/press 1/i);
    expect(l).toMatch(/2/);
    expect(l).toMatch(/3/);
  });

  it('reports the current selection', () => {
    expect(label({})).not.toMatch(/currently selected/i);
    const l = label({ selectedRock: 'metamorphic' });
    expect(l).toMatch(/currently selected/i);
    expect(l).toContain('metamorphic');
  });

  it('is a focus stop, so it must not claim to be an image', () => {
    const props = canvasNode(tree({}).node).props;
    expect(props.tabIndex).toBe(0);
    expect(props.role).toBe('application');
  });

  it('survives a selectedRock id that no longer exists', () => {
    // Tool data persists across sessions; a stale id must not throw or print
    // "undefined" into the label.
    const l = label({ selectedRock: 'obsidian' });
    expect(l).not.toMatch(/undefined/);
    expect(l).not.toMatch(/currently selected/i);
  });

  it('still renders the whole tool', () => {
    const markup = ReactDOMServer.renderToStaticMarkup(
      React.createElement(() => tree({ selectedRock: 'igneous' }).node)
    );
    expect(markup).toContain('<canvas');
    expect(markup).toContain('Rock Transformation Machine');
  });
});

describe('rock cycle canvas — both delivery copies', () => {
  it('ships the keyboard handler and its teardown in the mirror too', () => {
    PATHS.forEach((p) => {
      const src = readFileSync(p, 'utf8');
      expect(src, p).toContain('function onRockCycleKey(e)');
      expect(src, p).toContain("canvasEl.addEventListener('keydown', onRockCycleKey);");
      expect(src, p).toContain("canvasEl.removeEventListener('keydown', onRockCycleKey);");
      expect(src, p).toContain('function rcSelectFamily(rock)');
      // The old label must be gone from both copies, not just the one that
      // happens to be loaded by this suite.
      expect(src, p).not.toContain('rock_sample_closeup_a');
    });
  });
});
