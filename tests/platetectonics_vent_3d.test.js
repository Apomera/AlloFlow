// Behavioural coverage for the 3D volcano cutaway.
//
// WHY THIS SHAPE. The sibling plate-tectonics tests assert on the SOURCE TEXT of
// this file. That catches a deleted line, but it cannot tell a working control
// from a broken one, and a grep passes just as happily against a bug as against
// a fix. These tests load the tool, render it, and ask the running code
// questions instead.
//
// The eruption's own rendering is WebGL and cannot run here at all — that is what
// dev-tools/pt_vent_shots.cjs is for. What IS testable without a GPU is
// everything that decides WHAT gets drawn: the magma table's pedagogical
// invariants, the derivation that keeps the 2D and 3D edifices in agreement, and
// the accessible controls around the canvas.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, beforeAll, afterEach, vi } from 'vitest';

const SRC = 'stem_lab/stem_tool_platetectonics.js';
const MIRRORS = [
  'desktop/web-app/public/stem_lab/stem_tool_platetectonics.js',
  'desktop/app-build/stem_lab/stem_tool_platetectonics.js'
]
  // desktop/app-build/ is a gitignored local build output — absent in CI.
  .filter((rel) => !rel.includes('app-build') || fs.existsSync(rel));

const read = (p) => fs.readFileSync(path.resolve(p), 'utf8');

let React;
let ReactDOM;

// jsdom has no 2D canvas context and no useful rAF for this purpose. Both are
// stubbed HERE, in the test, rather than guarded for in the tool: the tool is
// entitled to assume a real canvas, and adding null-checks to its hot draw loop
// to satisfy a test would be the tail wagging the dog.
//
// Scope matters. These stubs neutralise the 2D sim's PAINTING, which nothing
// below asserts on. They do not stand in for any behaviour under test — the
// magma table, the profile derivation and the React tree are all the real thing.
function installCanvasStubs() {
  const gradient = () => ({ addColorStop() {} });
  const seed = {
    canvas: null, globalAlpha: 1, lineWidth: 1, miterLimit: 10, shadowBlur: 0,
    font: '10px sans-serif', textAlign: 'left', textBaseline: 'alphabetic',
    fillStyle: '#000', strokeStyle: '#000', shadowColor: '#000',
    lineCap: 'butt', lineJoin: 'miter', globalCompositeOperation: 'source-over'
  };
  const make = () => new Proxy(Object.assign({}, seed), {
    get(target, key) {
      if (key in target) return target[key];
      if (typeof key !== 'string') return undefined;
      if (/^create(Linear|Radial|Conic)Gradient$/.test(key)) return gradient;
      // measureText and friends: one shape that satisfies every caller.
      return () => ({ addColorStop() {}, width: 10, actualBoundingBoxAscent: 8, data: [] });
    },
    set(target, key, value) { target[key] = value; return true; }
  });
  globalThis.window.HTMLCanvasElement.prototype.getContext = function () { return make(); };

  // jsdom performs no layout, so every element reports offsetWidth 0. The sim
  // sizes its whole world from that at init (cW = offsetWidth * 2) and lays the
  // plates out as fractions of it, so with 0 the plate widths collapse and every
  // position clamps to 0 — movement tests would pass or fail for reasons that
  // have nothing to do with the code under test. A plausible layout box is the
  // minimum needed for the sim's own arithmetic to mean anything.
  for (const [prop, value] of [['offsetWidth', 540], ['offsetHeight', 400]]) {
    Object.defineProperty(globalThis.window.HTMLElement.prototype, prop, {
      configurable: true,
      get() { return value; }
    });
  }

  // The tool resizes its canvas through ResizeObserver, which jsdom does not
  // implement. Absent, it throws from inside a React ref and takes the whole
  // render down before a single control exists to assert on.
  if (typeof globalThis.window.ResizeObserver === 'undefined') {
    globalThis.window.ResizeObserver = class {
      observe() {} unobserve() {} disconnect() {}
    };
    globalThis.ResizeObserver = globalThis.window.ResizeObserver;
  }
  if (typeof globalThis.window.matchMedia !== 'function') {
    globalThis.window.matchMedia = () => ({
      matches: false, media: '', addListener() {}, removeListener() {},
      addEventListener() {}, removeEventListener() {}
    });
  }

  // One draw pass, not an endless loop. Letting the sim run would spray quake
  // upd() patches into every assertion below and make the suite time-dependent.
  globalThis.window.requestAnimationFrame = () => 0;
  globalThis.window.cancelAnimationFrame = () => {};
  globalThis.requestAnimationFrame = globalThis.window.requestAnimationFrame;
  globalThis.cancelAnimationFrame = globalThis.window.cancelAnimationFrame;
}

beforeAll(() => {
  installCanvasStubs();
  const reactSrc = read('desktop/web-app/node_modules/react/umd/react.development.js');
  const domSrc = read('desktop/web-app/node_modules/react-dom/umd/react-dom.development.js');

  // Minimal host. registerTool/_registry mirror the real StemLab contract; the
  // 3D helpers are only reached on mount, which cannot happen without WebGL.
  // ensureThree REJECTS rather than hanging, so the tool takes its documented
  // "3D engine unavailable" path instead of sitting in a permanent loading state
  // that would make every assertion below vacuously true.
  globalThis.window.StemLab = {
    _registry: {},
    _order: [],
    registerTool(id, config) {
      config.id = id;
      this._registry[id] = config;
      this._order.push(id);
    },
    ensureThree: () => Promise.reject(new Error('no webgl in jsdom')),
    makeVoxelBatch: () => { throw new Error('makeVoxelBatch should not be reached without a GL context'); },
    makeBayViewer: () => ({}),
    loadScriptResilient: () => Promise.reject(new Error('no network in jsdom'))
  };

  // eslint-disable-next-line no-eval
  (0, eval)(reactSrc);
  // eslint-disable-next-line no-eval
  (0, eval)(domSrc);
  React = globalThis.window.React;
  ReactDOM = globalThis.window.ReactDOM;
  expect(React, 'React UMD must attach to window').toBeTruthy();

  // eslint-disable-next-line no-eval
  (0, eval)(read(SRC));
});

// Every render is torn down. Leaving hosts in the document is not merely untidy
// here: the tool uses fixed element ids, and jsdom resolves an `#id` selector
// through document.getElementById, which returns only the FIRST match. A leaked
// earlier host therefore makes the current host's copy unreachable, and the
// aria-describedby check failed against markup that was present and correct.
const mounted = [];
afterEach(() => {
  while (mounted.length) {
    const el = mounted.pop();
    ReactDOM.unmountComponentAtNode(el);
    el.remove();
  }
});

// The tool writes state through an UPDATER FUNCTION: upd(patch) calls
// setLabToolData(function (prev) { ... }). A host that merely records its
// argument therefore collects opaque closures, and any assertion shaped like
// `patches.some(p => 'someKey' in p)` is false no matter what the tool did. One
// assertion here passed for exactly that reason until this was fixed, so the
// host now APPLIES each updater and records the resulting delta.
//
// It deliberately does NOT re-render on every write. This component is the whole
// 1.8 MB tool; re-rendering it synchronously per state change ran the suite into
// a worker crash. Tests that need the tool to observe its own writes call
// rerender() explicitly.
function renderTool(toolState) {
  const registry = globalThis.window.StemLab._registry;
  const cfg = registry.plateTectonics;
  expect(cfg, 'plateTectonics must register itself on load').toBeTruthy();

  const host = document.createElement('div');
  document.body.appendChild(host);
  mounted.push(host);

  const patches = [];
  const Icons = new Proxy({}, { get: () => () => React.createElement('span') });
  let state = { plateTectonics: Object.assign({ simTab: 'sim' }, toolState) };

  const ctx = {
    React,
    toolData: state,
    setToolData: (arg) => {
      const before = state.plateTectonics || {};
      const next = typeof arg === 'function' ? arg(state) : Object.assign({}, state, arg);
      const after = next.plateTectonics || {};
      const delta = {};
      Object.keys(after).forEach((k) => { if (after[k] !== before[k]) delta[k] = after[k]; });
      if (Object.keys(delta).length) patches.push(delta);
      state = next;
      ctx.toolData = state;
    },
    setStemLabTool() {}, setStemLabTab() {}, setToolSnapshots() {}, addToast() {},
    announceToSR(m) { ctx._sr.push(m); },
    _sr: [],
    awardXP() {}, getXP: () => 0, beep() {}, celebrate() {},
    canvasNarrate() {}, canvasA11yDesc() {},
    callGemini: null, callTTS: null, callImagen: null, callGeminiVision: null,
    gradeLevel: '5th', stemLabTab: 'explore', stemLabTool: 'plateTectonics',
    toolSnapshots: [], props: {}, srOnly: {}, isDark: true, isContrast: false, pal: null,
    a11yClick: (f) => ({ onClick: f }),
    icons: Icons,
    t: (k, fb) => (fb == null ? k : fb)
  };

  const rerender = () => ReactDOM.render(React.createElement(() => cfg.render(ctx)), host);
  rerender();

  return { host, ctx, patches, rerender, getState: () => state.plateTectonics };
}

// Shared by several suites, so it lives above them rather than inside one.
const keyOn = (el, key, opts) => {
  const ev = new globalThis.window.KeyboardEvent('keydown', Object.assign({ key, bubbles: true, cancelable: true }, opts || {}));
  el.dispatchEvent(ev);
  return ev;
};

describe('3D volcano cutaway: magma composition', () => {
  it('exposes exactly the three compositions the UI offers', () => {
    const types = globalThis.window.__alloVentGL.magmaTypes();
    expect(types.map((t) => t.id)).toEqual(['basalt', 'andesite', 'rhyolite']);
  });

  // These are the claims the tool teaches. A future retune is free to change the
  // numbers, but reversing any of these DIRECTIONS would make the model say
  // something false about volcanoes while every screenshot still looked fine.
  it('keeps the silica-to-landform relationships pointing the right way', () => {
    const [basalt, andesite, rhyolite] = globalThis.window.__alloVentGL.magmaTypes();

    // Runnier melt spreads wider and stands lower: shield, not spire.
    expect(basalt.coneR).toBeGreaterThan(andesite.coneR);
    expect(andesite.coneR).toBeGreaterThan(rhyolite.coneR);
    expect(basalt.coneH).toBeLessThan(andesite.coneH);
    expect(andesite.coneH).toBeLessThan(rhyolite.coneH);

    // Trapped gas is what shatters magma into ash, so ash rises with silica...
    expect(basalt.ashRate).toBeLessThan(andesite.ashRate);
    expect(andesite.ashRate).toBeLessThan(rhyolite.ashRate);

    // ...while flowing lava does the opposite. Stiff rhyolite does not pour.
    expect(basalt.lavaRate).toBeGreaterThan(andesite.lavaRate);
    expect(andesite.lavaRate).toBeGreaterThan(rhyolite.lavaRate);
    expect(rhyolite.lavaRate).toBe(0);

    // A bigger evacuated chamber drops more roof.
    expect(basalt.calderaDrop).toBeLessThan(andesite.calderaDrop);
    expect(andesite.calderaDrop).toBeLessThan(rhyolite.calderaDrop);
  });

  it('never lets a collapse consume the whole edifice', () => {
    for (const m of globalThis.window.__alloVentGL.magmaTypes()) {
      // summit scale is 1 - calderaDrop; at >= 1 the cone inverts through zero
      // and the crater and vent label follow it underground.
      expect(m.calderaDrop).toBeGreaterThan(0);
      expect(m.calderaDrop).toBeLessThan(0.9);
    }
  });

  it('carries the plain-language chain each composition is meant to teach', () => {
    for (const m of globalThis.window.__alloVentGL.magmaTypes()) {
      for (const field of ['label', 'silica', 'visc', 'gas', 'landform', 'example']) {
        expect(String(m[field] || ''), `${m.id}.${field}`).not.toHaveLength(0);
      }
    }
  });
});

describe('3D volcano cutaway: the two views show one volcano', () => {
  it('derives the 2D cone from the 3D edifice rather than a second table', () => {
    const profileFor = globalThis.window.__alloPtEruptProfile;
    for (const m of globalThis.window.__alloVentGL.magmaTypes()) {
      const prof = profileFor(m.id);
      expect(prof.id).toBe(m.id);
      // Same ordering as the block model: wider base, shorter cone.
      expect(prof.coneW).toBe(Math.round(m.coneR * 4.0));
      expect(prof.coneH).toBe(Math.round(m.coneH * 2.7));
    }
  });

  it('gives every composition a visibly different 2D cone', () => {
    const profileFor = globalThis.window.__alloPtEruptProfile;
    const seen = globalThis.window.__alloVentGL.magmaTypes()
      .map((m) => profileFor(m.id))
      .map((p) => `${p.coneW}x${p.coneH}`);
    expect(new Set(seen).size).toBe(seen.length);
  });

  it('falls back to a real edifice for an unknown composition', () => {
    // Tool data is persisted, so a stale or hand-edited id must not produce
    // NaN geometry and a cone that vanishes.
    const prof = globalThis.window.__alloPtEruptProfile('obsidian-flavoured');
    expect(Number.isFinite(prof.coneW)).toBe(true);
    expect(Number.isFinite(prof.coneH)).toBe(true);
    expect(prof.coneW).toBeGreaterThan(0);
    expect(prof.coneH).toBeGreaterThan(0);
  });
});

describe('3D volcano cutaway: controls', () => {
  it('offers the 2D/3D view toggle with pressed state', () => {
    const { host } = renderTool({ ptVent3D: false });
    const btns = host.querySelectorAll('[data-pt-vent-view]');
    expect(btns.length).toBe(2);
    const pressed = [...btns].map((b) => b.getAttribute('aria-pressed'));
    expect(pressed).toEqual(['true', 'false']);
  });

  it('renders the magma, rotate and cutaway controls only in the 3D view', () => {
    const flat = renderTool({ ptVent3D: false }).host;
    expect(flat.querySelectorAll('[data-pt-vent-magma]').length).toBe(0);
    expect(flat.querySelector('[id="pt-vent-cut"]')).toBeNull();
    ReactDOM.unmountComponentAtNode(flat);
    flat.remove();
    mounted.splice(mounted.indexOf(flat), 1);

    const deep = renderTool({ ptVent3D: true }).host;
    expect(deep.querySelectorAll('[data-pt-vent-magma]').length).toBe(3);

    const slider = deep.querySelector('[id="pt-vent-cut"]');
    expect(slider).toBeTruthy();
    expect(slider.getAttribute('type')).toBe('range');
    // A range with no accessible name is a dead control for a screen reader.
    expect(slider.getAttribute('aria-label')).toBeTruthy();

    // Drag is not the only way to turn the model.
    const rotate = [...deep.querySelectorAll('button')]
      .filter((b) => /Rotate|Tilt/.test(b.getAttribute('aria-label') || ''));
    expect(rotate.length).toBe(4);
  });

  it('marks the selected composition and leaves the others unpressed', () => {
    const { host } = renderTool({ ptVent3D: true, ptVentMagma: 'rhyolite' });
    const btns = [...host.querySelectorAll('[data-pt-vent-magma]')];
    const on = btns.filter((b) => b.getAttribute('aria-pressed') === 'true');
    expect(on).toHaveLength(1);
    expect(on[0].getAttribute('data-pt-vent-magma')).toBe('rhyolite');
  });

  it('describes the canvas for a student who cannot see it', () => {
    const { host } = renderTool({ ptVent3D: true });
    const canvas = host.querySelector('[data-pt-vent-gl]');
    expect(canvas).toBeTruthy();
    expect(canvas.getAttribute('role')).toBe('img');
    expect(canvas.getAttribute('aria-label')).toBeTruthy();

    const descId = canvas.getAttribute('aria-describedby');
    expect(descId).toBeTruthy();
    const desc = host.querySelector('[id="' + descId + '"]');
    expect(desc, 'aria-describedby must point at a node that exists').toBeTruthy();
    // The description has to carry the CAUSAL chain, not just name the parts:
    // that text is the only route a nonvisual user has to the whole lesson.
    expect(desc.textContent).toMatch(/magma chamber/i);
    expect(desc.textContent).toMatch(/caldera/i);
    expect(desc.textContent).toMatch(/basalt/i);
    expect(desc.textContent).toMatch(/rhyolite/i);
  });
});

describe('3D volcano cutaway: the Erupt button tells the truth', () => {
  // The tool's own handler ignores a click while an eruption runs. A control that
  // silently does nothing reads as broken, so the button has to say so.
  it('is live and unpressed when nothing is erupting', () => {
    const { host } = renderTool({ ptErupting: false });
    const btn = host.querySelector('[data-pt-erupt]');
    expect(btn).toBeTruthy();
    expect(btn.getAttribute('aria-disabled')).toBe('false');
    expect(btn.className).not.toMatch(/opacity-60/);
  });

  it('shows itself inert while an eruption is running', () => {
    const { host } = renderTool({ ptErupting: true });
    const btn = host.querySelector('[data-pt-erupt]');
    expect(btn.getAttribute('aria-disabled')).toBe('true');
    expect(btn.className).toMatch(/opacity-60/);
    expect(btn.textContent).toMatch(/Erupting/);
    // aria-disabled, not the disabled attribute: a disabled button leaves the
    // tab order, so the user who tabs to it gets no explanation at all.
    expect(btn.hasAttribute('disabled')).toBe(false);
  });

  it('explains itself instead of doing nothing when pressed mid-eruption', () => {
    const { host, ctx, patches } = renderTool({ ptErupting: true });
    const btn = host.querySelector('[data-pt-erupt]');
    btn.click();
    expect(ctx._sr.join(' ')).toMatch(/already in progress/i);
    // A successful trigger bumps eruptionCount. Counting ALL patches would be
    // meaningless here: the sim writes its own unrelated ones.
    const counted = patches.some((p) => p && Object.prototype.hasOwnProperty.call(p, 'eruptionCount'));
    expect(counted, 'a busy click must not start a second eruption').toBe(false);
  });

  it('starts an eruption when it is not busy', () => {
    // The mirror image of the test above: proves the guard blocks the BUSY case
    // specifically, rather than the button being inert in every case.
    const { host, ctx } = renderTool({ ptErupting: false });
    const btn = host.querySelector('[data-pt-erupt]');
    let dispatched = 0;
    const canvas = host.querySelector('[data-pt-main-canvas]');
    expect(canvas, 'the 2D sim canvas must be mounted').toBeTruthy();
    const realDispatch = canvas.dispatchEvent.bind(canvas);
    canvas.dispatchEvent = (ev) => { if (ev.type === 'triggerEruption') dispatched++; return realDispatch(ev); };
    btn.click();
    expect(dispatched, 'an idle click must reach the sim').toBe(1);
    expect(ctx._sr.join(' ')).not.toMatch(/already in progress/i);
  });
});

describe('plate simulation: the canvas is operable without a mouse', () => {
  // The canvas has always been a focus stop (tabIndex 0) and its label has always
  // told the student to move the plates. Until this was wired, tabbing to it did
  // nothing at all — WCAG 2.1.1 against the tool's primary interaction.

  it('exposes a keyboard plate handle on the running sim', () => {
    const { host } = renderTool({});
    const canvas = host.querySelector('[data-pt-main-canvas]');
    expect(canvas).toBeTruthy();
    expect(canvas.getAttribute('tabindex')).toBe('0');
    expect(canvas._ptKb, 'the sim must publish a keyboard handle').toBeTruthy();
  });

  it('selects a plate with the vertical arrows and says which one', () => {
    const { host, ctx } = renderTool({});
    const canvas = host.querySelector('[data-pt-main-canvas]');
    keyOn(canvas, 'ArrowDown');
    const current = canvas._ptKb.current();
    expect(current, 'a plate must be selected').toBeTruthy();
    expect(ctx._sr.join(' ')).toContain(current.name);
    // The announcement has to say what to do next, not just what happened.
    expect(ctx._sr.join(' ')).toMatch(/arrows move it/i);
  });

  it('actually moves the selected plate with the horizontal arrows', () => {
    const { host } = renderTool({});
    const canvas = host.querySelector('[data-pt-main-canvas]');
    keyOn(canvas, 'ArrowDown');
    const plate = canvas._ptKb.current();

    const before = plate.x;
    keyOn(canvas, 'ArrowRight');
    expect(plate.x).toBeGreaterThan(before);

    // Make room first: the first plate in the model sits against x = 0, so
    // asserting leftward movement from its start position tests the clamp, not
    // the control.
    keyOn(canvas, 'ArrowRight', { shiftKey: true });
    const mid = plate.x;
    expect(mid).toBeGreaterThan(0);
    keyOn(canvas, 'ArrowLeft');
    expect(plate.x).toBeLessThan(mid);
  });

  it('says the plate is stuck instead of claiming a move that did not happen', () => {
    const { host, ctx } = renderTool({});
    const canvas = host.querySelector('[data-pt-main-canvas]');
    keyOn(canvas, 'ArrowDown');
    const plate = canvas._ptKb.current();
    // Drive it hard against the left edge, then try to keep going.
    for (let i = 0; i < 60; i++) keyOn(canvas, 'ArrowLeft', { shiftKey: true });
    expect(plate.x).toBe(0);
    ctx._sr.length = 0;
    keyOn(canvas, 'ArrowLeft');
    expect(ctx._sr.join(' ')).toMatch(/already at the left edge/i);
    expect(ctx._sr.join(' ')).not.toMatch(/moved left/i);
  });

  it('gives Shift a coarser step so a boundary is reachable', () => {
    const { host } = renderTool({});
    const canvas = host.querySelector('[data-pt-main-canvas]');
    keyOn(canvas, 'ArrowDown');
    const plate = canvas._ptKb.current();

    const start = plate.x;
    keyOn(canvas, 'ArrowRight');
    const fine = plate.x - start;

    const mid = plate.x;
    keyOn(canvas, 'ArrowRight', { shiftKey: true });
    const coarse = plate.x - mid;

    expect(fine).toBeGreaterThan(0);
    expect(coarse).toBeGreaterThan(fine);
  });

  it('claims the arrow keys so the page does not scroll instead', () => {
    const { host } = renderTool({});
    const canvas = host.querySelector('[data-pt-main-canvas]');
    for (const k of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
      expect(keyOn(canvas, k).defaultPrevented, `${k} must be consumed`).toBe(true);
    }
  });

  it('keeps the plate inside the canvas however long a key is held', () => {
    const { host } = renderTool({});
    const canvas = host.querySelector('[data-pt-main-canvas]');
    keyOn(canvas, 'ArrowDown');
    const plate = canvas._ptKb.current();
    for (let i = 0; i < 200; i++) keyOn(canvas, 'ArrowRight', { shiftKey: true });
    expect(plate.x).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(plate.x)).toBe(true);
    for (let i = 0; i < 400; i++) keyOn(canvas, 'ArrowLeft', { shiftKey: true });
    expect(plate.x).toBe(0);
  });

  it('separates moving from scoring so key repeat cannot farm quakes', () => {
    // A drag settles the boundary ONCE, on mouseup. When the key handler settled
    // on every press instead, 14 presses produced 14 quakes and the student was
    // scored on their key-repeat rate. move() must be movement only; settle() is
    // the gesture end, and the handler debounces it.
    const { host } = renderTool({});
    const canvas = host.querySelector('[data-pt-main-canvas]');
    keyOn(canvas, 'ArrowDown');
    for (let i = 0; i < 25; i++) {
      const res = canvas._ptKb.move(1, true);
      expect(res.report.collided, 'move() must not award anything').toBe(false);
    }
    expect(typeof canvas._ptKb.settle, 'the gesture end must be callable').toBe('function');
  });

  it('records which plate is selected, so the challenge can be completed', () => {
    // `selectedPlate` was read in three places — the "Study a tectonic plate"
    // challenge gate, the mission cue, and the screen-reader summary — and
    // written in none. The challenge sat at "Pick a plate" forever, and no
    // student could complete it however hard they tried.
    const { host, patches } = renderTool({});
    const canvas = host.querySelector('[data-pt-main-canvas]');
    keyOn(canvas, 'ArrowDown');
    const picked = canvas._ptKb.current();
    expect(picked).toBeTruthy();
    const wrote = patches.filter((p) => p && Object.prototype.hasOwnProperty.call(p, 'selectedPlate'));
    expect(wrote.length, 'picking a plate must publish it to tool state').toBeGreaterThan(0);
    expect(wrote[wrote.length - 1].selectedPlate).toBe(picked.name);
  });

  it('does not rewrite state when the same plate is picked again', () => {
    // The host component is the whole tool, so a redundant write is a full
    // re-render for no change on screen. rerender() is explicit here because the
    // dedupe check reads the tool's own last-rendered state.
    const { host, patches, rerender } = renderTool({});
    const canvas = host.querySelector('[data-pt-main-canvas]');
    keyOn(canvas, 'ArrowDown');
    rerender();
    const afterFirst = patches.filter((p) => 'selectedPlate' in p).length;
    expect(afterFirst).toBeGreaterThan(0);
    // Same plate again: the guard should suppress the write.
    canvas._ptKb.select(0);
    expect(patches.filter((p) => 'selectedPlate' in p).length).toBe(afterFirst);
  });

  it('tells the canvas label that the keys exist', () => {
    const { host } = renderTool({});
    const canvas = host.querySelector('[data-pt-main-canvas]');
    const label = canvas.getAttribute('aria-label') || '';
    // A keyboard affordance nobody is told about is not an affordance.
    expect(label).toMatch(/arrow/i);
    expect(label).toMatch(/shift/i);
  });
});

describe('quiz: answer positions cannot be gamed', () => {
  // The bank is declared inside the render body, so it is read back from source
  // rather than exposed on window: publishing an answer key at runtime to make a
  // test convenient would be a worse trade than parsing the literal here.
  const authoredBank = () => {
    const lines = read(SRC).split('\n');
    const start = lines.findIndex((l) => l.includes('var QUIZZES = ptBalanceAnswers(['));
    expect(start, 'quiz bank must still be balanced at the call site').toBeGreaterThan(-1);
    let end = -1;
    for (let i = start; i < lines.length; i++) {
      if (/^ {10}\]\);\s*$/.test(lines[i])) { end = i; break; }
    }
    const literal = lines.slice(start, end + 1).join('\n')
      .replace(/^\s*var QUIZZES = ptBalanceAnswers\(/, '')
      .replace(/\);\s*$/, '');
    // eslint-disable-next-line no-eval
    return (0, eval)('(' + literal + ')');
  };

  it('spreads the correct answer evenly across the option slots', () => {
    const balanced = globalThis.window.__alloPtBalanceAnswers(authoredBank());
    const counts = {};
    balanced.forEach((q) => { counts[q.ans] = (counts[q.ans] || 0) + 1; });
    const n = balanced.length;
    const slots = balanced[0].opts.length;
    // Every slot within one question of an even share.
    for (let k = 0; k < slots; k++) {
      expect(Math.abs((counts[k] || 0) - n / slots), `slot ${k} share`).toBeLessThanOrEqual(1);
    }
  });

  it('defeats the "never pick A or D" strategy', () => {
    const balanced = globalThis.window.__alloPtBalanceAnswers(authoredBank());
    const middle = balanced.filter((q) => q.ans !== 0 && q.ans !== q.opts.length - 1).length;
    // As authored this scored 75%. Uniform positions put the ceiling at half.
    expect(middle / balanced.length).toBeLessThanOrEqual(0.55);
  });

  it('keeps each option paired with its own feedback after reordering', () => {
    // The renderer reads wrongFeedback[chosenOpt]. Rotating opts without
    // rotating feedback would hand every student the explanation for a choice
    // they did not make, and nothing on screen would look wrong.
    const balanced = globalThis.window.__alloPtBalanceAnswers(authoredBank());
    balanced.forEach((q, i) => {
      expect(q.wrongFeedback, `Q${i} keeps feedback`).toBeTruthy();
      expect(q.wrongFeedback.length, `Q${i} feedback length`).toBe(q.opts.length);
      expect(q.wrongFeedback[q.ans], `Q${i} feedback at the answer`).toMatch(/^Correct/i);
      q.wrongFeedback.forEach((fb, k) => {
        if (k !== q.ans) expect(fb, `Q${i} slot ${k}`).not.toMatch(/^Correct/i);
      });
    });
  });

  it('moves the option text with its answer index', () => {
    const authored = authoredBank();
    const balanced = globalThis.window.__alloPtBalanceAnswers(authored);
    authored.forEach((q, i) => {
      // The correct option must still be the same STRING, just in a new slot.
      expect(balanced[i].opts[balanced[i].ans]).toBe(q.opts[q.ans]);
      // And the option set must be preserved, not dropped or duplicated.
      expect([...balanced[i].opts].sort()).toEqual([...q.opts].sort());
    });
  });

  it('is deterministic, so two students see the same paper', () => {
    const a = globalThis.window.__alloPtBalanceAnswers(authoredBank());
    const b = globalThis.window.__alloPtBalanceAnswers(authoredBank());
    expect(a.map((q) => q.ans)).toEqual(b.map((q) => q.ans));
    expect(a.map((q) => q.opts.join('|'))).toEqual(b.map((q) => q.opts.join('|')));
  });
});

describe('earthquake lab: the magnitude scale is named correctly', () => {
  const magSlider = (host) => [...host.querySelectorAll('input[type="range"]')]
    .find((el) => /magnitude/i.test(el.getAttribute('aria-label') || ''));

  it('offers magnitudes above 7', () => {
    const { host } = renderTool({ simTab: 'earthquake' });
    const el = magSlider(host);
    expect(el, 'the magnitude slider must exist').toBeTruthy();
    expect(Number(el.getAttribute('max'))).toBeGreaterThan(7);
  });

  // The tool's own glossary states that the Richter scale saturates above about
  // M7. A control that runs to 9 and calls itself Richter therefore contradicts
  // the tool's own teaching, at exactly the magnitudes students find exciting.
  it('does not attribute magnitudes above 7 to the Richter scale', () => {
    const { host } = renderTool({ simTab: 'earthquake' });
    const label = magSlider(host).getAttribute('aria-label') || '';
    expect(label).toMatch(/moment magnitude|Mw/i);
    expect(label).not.toMatch(/Richter scale/i);
  });

  it('keeps the visible label and the accessible name telling the same story', () => {
    // A sighted student reading "Magnitude:" and a screen-reader user hearing
    // "moment magnitude" should not come away with different ideas about what
    // the number means.
    const { host } = renderTool({ simTab: 'earthquake' });
    const el = magSlider(host);
    const row = el.closest('div');
    expect(row.textContent).toMatch(/Mw/);
  });

  it('still states the saturation limit that makes the distinction matter', () => {
    // Renaming the slider without keeping the explanation would trade one
    // inaccuracy for a silent gap.
    const source = read(SRC);
    expect(source).toMatch(/saturates above/i);
    expect(source).toMatch(/Charles Richter's original 1935 scale/);
  });
});

describe('discovery timeline: reads in the order it happened', () => {
  // Rendered from the DOM, not from the source array: what matters is the order
  // the student actually reads, and sorting at render is exactly the step a
  // source-order check would miss.
  // Read the year NODES, not sliced text. Each entry renders as
  // [title, year, description], and the descriptions are full of other years
  // ("1699-1700", "1907", "1959"), so scanning raw text mixes narrative dates
  // into the sequence under test.
  const years = (host) => [...host.querySelectorAll('div.font-mono')]
    .map((el) => (el.textContent || '').trim())
    .filter((s) => /^(1[6-9]\d{2}|20\d{2})$/.test(s))
    .map(Number);

  it('renders the discovery years in nondecreasing order', () => {
    // simTab is 'history'. The first version of this test guessed
    // 'earthHistory', found no timeline, and fell through to a source-text
    // fallback that passed without ever looking at the rendered order — a
    // vacuous pass dressed as coverage. No fallback now: if the timeline is not
    // on screen, that is a failure, not a skip.
    const { host } = renderTool({ simTab: 'history' });
    const ys = years(host);
    expect(ys, 'the history tab must render the discovery timeline').toBeTruthy();
    expect(ys.length).toBeGreaterThan(5);
    for (let i = 1; i < ys.length; i++) {
      expect(ys[i], `entry ${i} (${ys[i]}) must not precede entry ${i - 1} (${ys[i - 1]})`)
        .toBeGreaterThanOrEqual(ys[i - 1]);
    }
  });

  it('sorts rather than relying on the author appending in order', () => {
    // The Bullard entry was authored between 1928 and 1956. Reordering that one
    // line would fix today's timeline and leave the next appended entry free to
    // break it again.
    const source = read(SRC);
    expect(source).toContain('return H.slice().sort(function(a, b) {');
    expect(source).toContain('parseInt(a[0], 10) - parseInt(b[0], 10)');
  });

  it('names the volcano that erupted after the 1960 Valdivia earthquake', () => {
    const source = read(SRC);
    expect(source).not.toMatch(/Cintura Volcano/);
    expect(source).toMatch(/Cordon Caulle/);
  });
});

describe('research points: an award cannot be counted twice', () => {
  // checkChallenges is scheduled with setTimeout from several places at once —
  // a boundary collision, a slider change, a tab view. Two of those landing in
  // the window before React re-renders used to read the SAME stale
  // completedChallenges and researchPoints from the render closure, so the same
  // challenge was awarded twice and the second write overwrote the first total.
  const finalState = (r) => r.getState();

  it('never lists the same challenge twice after normal play', () => {
    vi.useFakeTimers();
    try {
      const r = renderTool({ quakeCount: 1, researchPoints: 0, totalRP: 0, completedChallenges: [] });
      const canvas = r.host.querySelector('[data-pt-main-canvas]');
      keyOn(canvas, 'ArrowDown');
      keyOn(canvas, 'ArrowRight', { shiftKey: true });
      vi.advanceTimersByTime(500);
      keyOn(canvas, 'ArrowRight', { shiftKey: true });
      vi.advanceTimersByTime(500);
      const done = r.getState().completedChallenges || [];
      expect(done.length, 'no challenge id may appear twice').toBe(new Set(done).size);
    } finally {
      vi.useRealTimers();
    }
  });

  // HONESTY NOTE. The two behavioural tests first written here did NOT
  // discriminate: reverting the fix left them green. Reproducing the race needs
  // two checkChallenges calls inside one pre-re-render window, and the host
  // deliberately does not re-render (doing so crashed the worker on a component
  // this size), so that window never opens here.
  //
  // Rather than keep coverage that cannot fail, this pins the specific dangerous
  // pattern at the source. It is a weaker kind of test than the rest of this
  // file and is only used because the behavioural route is genuinely unavailable
  // — but it does flip: both halves of the fix, reverted independently, fail it.
  it('computes points and the earned list from live state, not the closure', () => {
    const source = read(SRC);
    const start = source.indexOf('function checkChallenges()');
    expect(start).toBeGreaterThan(-1);
    const body = source.slice(start, start + 1800);

    // Read-modify-write must start from `cur`, the state React hands the updater.
    expect(body).toContain('var done = (cur.completedChallenges || []).slice();');
    expect(body).toContain('researchPoints: (cur.researchPoints || 0) + rpGain');
    expect(body).toContain('totalRP: (cur.totalRP || 0) + rpGain');

    // The render-closure copies are the trap: reading them here is what let a
    // second call re-award a challenge and discard the first call's points.
    expect(body).not.toMatch(/researchPoints:\s*researchPoints \+ rpGain/);
    expect(body).not.toMatch(/totalRP:\s*totalRP \+ rpGain/);
    expect(body).not.toContain('var done = completedChallenges.slice();');
  });

  it('does not fire its celebration from inside the state updater', () => {
    // React may invoke an updater more than once. A toast or a sound raised in
    // there would replay for a single win, so both must happen outside it.
    const source = read(SRC);
    const start = source.indexOf('function checkChallenges()');
    const body = source.slice(start, start + 1800);
    const updaterStart = body.indexOf('updFn(function(cur)');
    const updaterEnd = body.indexOf('});', updaterStart);
    const updaterBody = body.slice(updaterStart, updaterEnd);
    expect(updaterBody).not.toContain('addToast');
    expect(updaterBody).not.toContain('sfxTectCorrect');
    expect(body).toContain('addToast');
  });
});

describe('tab tracking: state is never mutated in place', () => {
  it('records a visited tab without touching the object it was given', () => {
    // The old code did `currentViews[simTab] = true` on d.tabsViewed itself and
    // then guarded on that same object. Mutating first makes the guard lie: a
    // superseded write leaves the tab marked locally but absent from state, and
    // the visit — which the "Explore 3 tectonics topics" challenge counts — is
    // gone for good.
    const seeded = {};
    const r = renderTool({ simTab: 'sim', tabsViewed: seeded });
    expect(Object.keys(seeded), 'the seeded object must be left alone').toHaveLength(0);
    const wrote = r.patches.filter((p) => 'tabsViewed' in p);
    expect(wrote.length, 'the visit must be written to state').toBeGreaterThan(0);
    expect(wrote[wrote.length - 1].tabsViewed.sim).toBe(true);
    // A fresh object, not the one handed in.
    expect(wrote[wrote.length - 1].tabsViewed).not.toBe(seeded);
  });

  it('does not re-record a tab already visited', () => {
    const r = renderTool({ simTab: 'sim', tabsViewed: { sim: true } });
    expect(r.patches.filter((p) => 'tabsViewed' in p)).toHaveLength(0);
  });
});

describe('boundary stress lab: friction resists slip', () => {
  // This activity asks the student to form a hypothesis about how stress and
  // friction interact, so the direction of each relationship is the whole
  // lesson. The original model computed force * (friction/100), which made a
  // frictionless fault unbreakable and maximum friction the fastest route to
  // failure — the opposite of how a fault works, taught inside the one activity
  // built to have students discover it.
  const outcome = (state) => {
    const { host } = renderTool(Object.assign({ simTab: 'boundaryHunt' }, state));
    const text = host.textContent || '';
    if (/Thrust faulting/i.test(text)) return 'thrust';
    if (/Normal faulting/i.test(text)) return 'normal';
    if (/Strike-slip/i.test(text)) return 'strikeSlip';
    if (/Stable/i.test(text)) return 'stable';
    return null;
  };
  const bh = (btype, force, friction) => ({
    boundaryHunt: { btype, force, friction, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] }
  });

  it('renders a failure mode at all', () => {
    expect(outcome(bh('convergent', 50, 50))).toBeTruthy();
  });

  it('breaks a frictionless fault instead of making it indestructible', () => {
    // The single clearest symptom of the old model: friction 0 gave stress 0,
    // so nothing ever failed no matter how hard it was pushed.
    expect(outcome(bh('convergent', 100, 0))).toBe('thrust');
    expect(outcome(bh('divergent', 100, 0))).toBe('normal');
    expect(outcome(bh('transform', 100, 0))).toBe('strikeSlip');
  });

  it('holds a heavily locked fault stable under the same stress', () => {
    for (const bt of ['convergent', 'divergent', 'transform']) {
      expect(outcome(bh(bt, 50, 100)), `${bt} at high friction`).toBe('stable');
    }
  });

  it('makes more stress break it and more friction hold it', () => {
    // Monotonic in both directions, which is what a student sweeping a slider
    // needs in order to read a relationship off the model at all.
    expect(outcome(bh('convergent', 20, 50))).toBe('stable');
    expect(outcome(bh('convergent', 100, 50))).toBe('thrust');
    expect(outcome(bh('transform', 60, 10))).toBe('strikeSlip');
    expect(outcome(bh('transform', 60, 95))).toBe('stable');
  });

  it('needs the most stress for a thrust and the least for a normal fault', () => {
    // Andersonian faulting. At one setting the weakest geometry has already
    // gone while the strongest still holds.
    const force = 50;
    const friction = 50;
    expect(outcome(bh('divergent', force, friction))).toBe('normal');
    expect(outcome(bh('transform', force, friction))).toBe('strikeSlip');
    expect(outcome(bh('convergent', force, friction))).toBe('stable');
  });

  it('describes what each slider does, now that one is inverted from before', () => {
    const { host } = renderTool({ simTab: 'boundaryHunt' });
    expect(host.textContent).toMatch(/friction holds it back|friction resists slip/i);
  });
});

describe('3D volcano cutaway: mirrors', () => {
  it('keeps all three deployed copies byte-identical', () => {
    const source = read(SRC);
    for (const m of MIRRORS) {
      expect(read(m), `${m} drifted from ${SRC}`).toBe(source);
    }
  });
});
