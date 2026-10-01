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

// PT_TEST_SOURCE: see platetectonics_boundary_model.test.js.
const SRC = process.env.PT_TEST_SOURCE || 'stem_lab/stem_tool_platetectonics.js';
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
function renderTool(toolState, ctxExtra, preserveMount = false) {
  const registry = globalThis.window.StemLab._registry;
  const cfg = registry.plateTectonics;
  expect(cfg, 'plateTectonics must register itself on load').toBeTruthy();

  const host = document.createElement('div');
  document.body.appendChild(host);
  mounted.push(host);

  const patches = [];
  const Icons = new Proxy({}, { get: () => () => React.createElement('span') });
  let state = { plateTectonics: Object.assign({ _ptPicked: true, simTab: 'sim' }, toolState) };

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
  Object.assign(ctx, ctxExtra || {});

  // Most older tests explicitly remount to reset their widget state. Reward
  // receipts must be tested across commits of the SAME mounted component.
  const Tool = () => cfg.render(ctx);
  const rerender = () => ReactDOM.render(React.createElement(preserveMount ? Tool : () => cfg.render(ctx)), host);
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

  it('describes the eruption that each composition actually displays', () => {
    const expected = {
      basalt: ['Lava erupts', 'lava fountain', 'how little ash'],
      andesite: ['Explosive eruption', 'ash column', 'shorter lava flows'],
      rhyolite: ['Explosive eruption', 'dense ash column', 'Flowing lava is not shown']
    };
    for (const magma of Object.keys(expected)) {
      const { host } = renderTool({ ptVent3D: true, ptVentMagma: magma, ptEruptPhase: 'blast' });
      const stage = host.querySelector('[data-pt-vent-phase="blast"]');
      expect(stage).toBeTruthy();
      expected[magma].forEach(text => expect(stage.textContent).toContain(text));
      expect(stage.textContent).toContain('simplified comparison of three model eruptions');
      if (magma === 'basalt') expect(stage.textContent).not.toContain('shatters');
    }
  });

  it('distinguishes the small basalt summit drop from the larger rhyolite collapse', () => {
    const basalt = renderTool({ ptVent3D: true, ptVentMagma: 'basalt', ptEruptPhase: 'caldera' }).host.querySelector('[data-pt-vent-phase]');
    expect(basalt.textContent).toContain('Summit subsides');
    expect(basalt.textContent).toContain('Only a small summit drop');
    const rhyolite = renderTool({ ptVent3D: true, ptVentMagma: 'rhyolite', ptEruptPhase: 'caldera' }).host.querySelector('[data-pt-vent-phase]');
    expect(rhyolite.textContent).toContain('Summit collapses');
    expect(rhyolite.textContent).toContain('widens the crater into a caldera');
  });

  it('describes the canvas for a student who cannot see it', () => {
    const { host } = renderTool({ ptVent3D: true });
    const canvas = host.querySelector('[data-pt-vent-gl]');
    expect(canvas).toBeTruthy();
    expect(canvas.getAttribute('role')).toBe('img');
    expect(canvas.getAttribute('aria-label')).toBeTruthy();

    const ids = canvas.getAttribute('aria-describedby').split(/\s+/);
    const descriptions = ids.map(id => host.querySelector('[id="' + id + '"]'));
    descriptions.forEach(description => expect(description, 'each description must exist').toBeTruthy());
    const text = descriptions.map(description => description.textContent).join(' ');
    expect(text).toMatch(/magma chamber/i);
    expect(text).toMatch(/centre slice/i);
    expect(text).toMatch(/Medium silica/);
    expect(text).toMatch(/sticky/);
    expect(text).toMatch(/steep stratovolcano/);
    expect(text).toMatch(/vent is quiet/i);
    expect(canvas.getAttribute('aria-label')).toContain('Andesitic');
  });

  it('keeps slice controls synchronized with shape, interior and keyboard reset views', () => {
    const { host, patches } = renderTool({ ptVent3D: true });
    const gl = window.__alloVentGL;
    const slider = host.querySelector('#pt-vent-cut');
    const output = host.querySelector('#pt-vent-cut-reading');
    gl.zoom(1.0); gl.setCut(-20);
    host.querySelector('[data-pt-vent-preset="shape"]').click();
    expect(gl.getCam()).toEqual({ rotX: -22, rotY: 34, scale: 1, cut: null });
    expect(slider.value).toBe('30');
    expect(slider.getAttribute('aria-valuetext')).toBe(output.textContent);
    expect(output.textContent).toContain('Whole volcano');
    host.querySelector('[data-pt-vent-preset="inside"]').click();
    expect(gl.getCam()).toEqual({ rotX: -7, rotY: -17, scale: 1, cut: 0 });
    expect(slider.value).toBe('0');
    expect(output.textContent).toBe('Centre slice');
    gl.zoom(0.8); gl.setCam(-65, 90); gl.setCut(null);
    keyOn(host.querySelector('[data-pt-vent-gl]'), 'Home');
    expect(gl.getCam()).toEqual({ rotX: -7, rotY: -17, scale: 1, cut: 0 });
    expect(slider.value).toBe('0');
    expect(output.textContent).toBe('Centre slice');
    expect(patches.some(patch => 'eruptions' in patch || 'researchPoints' in patch)).toBe(false);
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
    // The bank is translated (__alloT wraps every string the student reads), so
    // evaluate it with an English-fallback shim, as the myth-bank tests do: the
    // balance invariants must hold in any language.
    // eslint-disable-next-line no-eval
    return (0, eval)('(function (__alloT) { return (' + literal + '); })')((k, fb) => fb);
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
    // Keep the scientific distinction in the rendered optional notes, using
    // the working ML range listed by USGS rather than a universal M7 cutoff.
    const { host } = renderTool({ simTab: 'earthquake' });
    const note = host.querySelector('[data-pt-eq-magnitude-scales]');
    expect(note).not.toBeNull();
    expect(note.closest('[data-pt-eq-model-limits]')).not.toBeNull();
    expect(note.textContent).toMatch(/moment magnitude \(Mw\).*fault area, slip and rock rigidity/);
    expect(note.textContent).toMatch(/Charles Richter’s original 1935 scale \(local magnitude, ML\)/);
    expect(note.textContent).toMatch(/ML saturates for large earthquakes/);
    expect(note.textContent).toMatch(/working range as about M2–6\.5/);
    expect(note.textContent).toMatch(/Moment magnitude remains useful for the M8–9/);
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
  it('commits one challenge and celebrates once across repeated checks and renders', () => {
    vi.useFakeTimers();
    try {
      const addToast = vi.fn();
      const r = renderTool({ researchPoints: 0, totalRP: 0, completedChallenges: [] }, { addToast }, true);
      const canvas = r.host.querySelector('[data-pt-main-canvas]');
      r.ctx.setToolData((prev) => ({ ...prev, plateTectonics: { ...prev.plateTectonics, ptMadeQuakes: 1 } }));
      const check = canvas._ptLive.checkChallenges;
      check();
      check();
      expect(r.getState().completedChallenges).toEqual(['first_quake']);
      expect(r.getState().researchPoints).toBe(10);
      expect(r.getState().totalRP).toBe(10);
      expect(addToast, 'feedback waits for the award to commit').not.toHaveBeenCalled();
      const act = React.act || React.unstable_act;
      act(() => r.rerender());
      expect(addToast).toHaveBeenCalledTimes(1);
      expect(addToast.mock.calls[0][0]).toContain('Plate Boundary Shaker');
      check();
      act(() => r.rerender());
      act(() => r.rerender());
      vi.advanceTimersByTime(1000);
      expect(addToast).toHaveBeenCalledTimes(1);
      expect(r.getState().completedChallenges).toEqual(['first_quake']);
      expect(r.getState().researchPoints).toBe(10);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not replay celebrations for awards loaded from a saved lab', () => {
    const addToast = vi.fn();
    const r = renderTool({ ptMadeQuakes: 1, researchPoints: 10, totalRP: 10, completedChallenges: ['first_quake'] }, { addToast }, true);
    const act = React.act || React.unstable_act;
    act(() => r.rerender());
    expect(addToast).not.toHaveBeenCalled();
    expect(r.getState().researchPoints).toBe(10);
  });

  // Keep the updater's purity contract alongside the behavioral checks above.
  it('computes points and the earned list from live state, not the closure', () => {
    const source = read(SRC);
    const start = source.indexOf('function checkChallenges()');
    expect(start).toBeGreaterThan(-1);
    const body = source.slice(start, source.indexOf('// Track tab views automatically.', start));

    // Read-modify-write must start from `cur`, the state React hands the updater.
    // Type-guarded now (`|| []` admitted a truthy non-array, and .slice threw);
    // the CLAIM is that the challenge list is copied before mutation.
    expect(body).toMatch(/var done = \([^;]*cur\.completedChallenges[^;]*\)\.slice\(\);/);
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
    const body = source.slice(start, source.indexOf('// Track tab views automatically.', start));
    const updaterStart = body.indexOf('updFn(function(cur)');
    const updaterEnd = body.indexOf('// Notify only after', updaterStart);
    expect(updaterEnd).toBeGreaterThan(updaterStart);
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
    // Read the CURRENT outcome off the diagram that draws it, not by scanning
    // the panel's prose in priority order. The prose scan was a trap waiting to
    // spring: any new copy naming one of the four outcomes — a hint sentence
    // once did it, and a table of logged trials does it again — is picked up as
    // if it were the live result.
    const svg = host.querySelector('[data-pt-stress-diagram]');
    if (svg) return svg.getAttribute('data-pt-stress-diagram');
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

describe('boundary stress lab: the model is earned, not handed out', () => {
  // The meter, its failure line, the equation and "thrusts need the most
  // stress" ARE the answer to the panel's own hypothesis prompt. They open only
  // after evidence at every boundary type plus the student's own explanation,
  // or for a teacher.
  const MODEL = /fails past|net = stress|Thrusts need the most stress/;
  const state = (log, explanation) => ({ simTab: 'boundaryHunt', boundaryHunt: {
    btype: 'convergent', force: 60, friction: 20, hypothesis: '', stuckRevealed: false,
    understood: !!explanation, explanation: explanation || '', log: log || [] } });
  const row = (bt, st) => ({ bt, f: 60, fr: 20, st });
  const ALL = [row('convergent', 'thrust'), row('divergent', 'normal'), row('transform', 'strikeSlip')];
  const WHY = 'Friction holds each fault until the push beats it; thrusts need the biggest push.';

  it('hides the model from a student who has not earned it yet', () => {
    const { host } = renderTool(state());
    expect(host.querySelector('[data-pt-stress-reveal]').getAttribute('data-pt-stress-reveal')).toBe('earning');
    expect(host.textContent).not.toMatch(MODEL);
    // and the figure's accessible name does not leak it either
    const svg = host.querySelector('[data-pt-stress-diagram]');
    expect(svg.getAttribute('aria-label')).not.toMatch(/failure line/);
    // the developer's design note is not student copy
    expect(host.textContent).not.toMatch(/Design note|no reveal/i);
  });

  it('keeps it hidden with evidence but no explanation, or an explanation but gaps in the evidence', () => {
    expect(renderTool(state(ALL, '')).host.textContent).not.toMatch(MODEL);
    expect(renderTool(state(ALL.slice(0, 2), WHY)).host.textContent).not.toMatch(MODEL);
  });

  it('opens once every boundary type is logged and the student has explained it', () => {
    const { host } = renderTool(state(ALL, WHY));
    expect(host.querySelector('[data-pt-stress-reveal]').getAttribute('data-pt-stress-reveal')).toBe('open');
    expect(host.textContent).toMatch(MODEL);
  });

  it('opens straight away for a teacher', () => {
    const { host } = renderTool(state(), { isTeacherMode: true });
    expect(host.textContent).toMatch(MODEL);
  });
});

describe('Erupt! erupts the volcano the model has, or says why not', () => {
  it('does nothing but explain when no subduction zone or ridge is on screen', () => {
    // At rest every seam sits in the untouched resting gap, so there is no
    // boundary at all, let alone one that can erupt.
    const { host, ctx, patches, rerender } = renderTool({ ptErupting: false });
    host.querySelector('[data-pt-erupt]').click();
    expect(patches.some((p) => Object.prototype.hasOwnProperty.call(p, 'eruptionCount'))).toBe(false);
    expect(ctx._sr.join(' ')).toMatch(/No volcano to erupt yet/);
    rerender();
    expect(host.querySelector('[data-pt-erupt-hint]'), 'a sighted student sees the reason too').toBeTruthy();
  });
});

describe('What moves the plates: the force balance behaves like Earth', () => {
  // The force lab replaces the conveyor belt with slab pull + ridge push against
  // mantle drag. These run the lab's own engine, not a copy of it.
  const F = () => globalThis.window.__alloPtForces;
  const run = (w, myr) => { for (let i = 0; i < Math.round(myr / 0.05); i++) F().step(w, 0.05); };

  it('moves a plate with a sinking slab several times faster than a continent plate without one', () => {
    const w = F().make();
    expect(w.vA).toBeGreaterThan(5);
    expect(Math.abs(w.vB)).toBeLessThan(2);
    expect(w.vA / Math.abs(w.vB)).toBeGreaterThan(5);
  });

  it('slows a plate sharply when its slab is cut, without stopping it, and lets it recover as new slab sinks', () => {
    const w = F().make();
    run(w, 5);
    const before = w.vA;
    F().cut(w);
    expect(w.vA).toBeLessThan(before * 0.3);
    expect(w.vA).toBeGreaterThan(0);
    const justAfter = w.vA;
    run(w, 25);
    expect(w.vA, 'slab pull rebuilds as new plate sinks').toBeGreaterThan(justAfter * 2);
  });

  it('jams the trench with a continent, breaks the slab off, and builds mountains', () => {
    const w = F().make();
    expect(F().continent(w)).toBe(true);
    const events = [];
    for (let i = 0; i < 900; i++) { F().step(w, 0.05); events.push(...w.events.splice(0)); }
    expect(events).toContain('collision');
    expect(events).toContain('breakoff');
    expect(events.indexOf('collision')).toBeLessThan(events.indexOf('breakoff'));
    expect(w.vA).toBeLessThan(w.collision.vBefore * 0.3);
    expect(w.mtn).toBeGreaterThan(1);
    expect(w.contA.x1, 'the continent does not go down').toBeLessThanOrEqual(F().PTF.X_TRENCH);
  });

  it('prints mirror-image magnetic stripes and ages on both sides of the ridge', () => {
    const w = F().make();
    run(w, 15);
    [50, 200, 400, 700].forEach((d) => {
      const bA = F().birthAt(w.stripsA, w.xR + d), bB = F().birthAt(w.stripsB, w.xR - d);
      expect(bA).not.toBeNull(); expect(bB).not.toBeNull();
      expect(Math.abs((w.t - bA) - (w.t - bB))).toBeLessThan(0.05);
      expect(F().polAt(bA)).toBe(F().polAt(bB));
    });
  });

  it('makes the sea floor older with distance from the ridge', () => {
    const w = F().make();
    run(w, 10);
    const ages = [100, 600, 1200, 2000].map((d) => w.t - F().birthAt(w.stripsA, w.xR + d));
    for (let i = 1; i < ages.length; i++) expect(ages[i]).toBeGreaterThan(ages[i - 1]);
  });

  it('pulls harder with older, denser plate at the trench', () => {
    const old = F().make();
    const young = F().make();
    young.t -= 50;           // same geometry, every strip 50 Myr younger
    F().solve(young); F().solve(old);
    expect(young.fsp).toBeLessThan(old.fsp);
  });
});

describe('What moves the plates: predict first, then watch', () => {
  it('lives in the Interactive Sim category with a name', () => {
    const text = read(SRC);
    expect(text).toMatch(/tabs: \["sim", "forces", /);
    expect(text).toMatch(/forces: __alloT\('stem\.platetectonics\.tabname_forces', "⚖️ What Moves Plates"\)/);
  });

  it('describes the running model in words, with real units', () => {
    const { host } = renderTool({ simTab: 'forces' });
    const cv = host.querySelector('[data-pt-forces-canvas]');
    expect(cv).toBeTruthy();
    expect(cv.getAttribute('aria-label')).toMatch(/cm per year/);
    expect(cv.getAttribute('aria-label')).toMatch(/slab pull/);
    expect(host.querySelector('[data-pt-forces-balance]').textContent).toMatch(/slab pull [\d.]+ \+ ridge push [\d.]+ = mantle drag [\d.]+/);
  });

  it('asks for a prediction before cutting the slab, and records it', () => {
    // No rerender() here: the harness's rerender remounts the tool, which would
    // wipe the lab's own state. React re-renders the lab itself after each click.
    const { host, ctx, getState } = renderTool({ simTab: 'forces' });
    const cvBefore = host.querySelector('[data-pt-forces-readout]').textContent;
    host.querySelector('[data-pt-forces-cut]').click();
    const fs = host.querySelector('[data-pt-forces-predict]');
    expect(fs, 'a prediction is asked for first').toBeTruthy();
    const lock = host.querySelector('[data-pt-forces-lock]');
    expect(lock.disabled, 'cannot lock in without choosing').toBe(true);
    // Nothing has happened to the model yet.
    expect(host.querySelector('[data-pt-forces-readout]').textContent).toBe(cvBefore);
    fs.querySelectorAll('input[type=radio]')[1].click();
    host.querySelector('[data-pt-forces-lock]').click();
    const saved = getState().ptForce;
    expect(saved && saved.preds && saved.preds.length).toBe(1);
    expect(saved.preds[0]).toMatchObject({ a: 'cut', c: 1, ok: true });
    expect(ctx._sr.join(' ')).toMatch(/Prediction saved/);
    expect(host.querySelector('[data-pt-forces-readout]').textContent, 'the cut happened after the prediction').not.toBe(cvBefore);
  });

  it('records measured evidence once the cut outcome finishes, not when predicted', async () => {
    const { host, getState, patches } = renderTool({ simTab: 'forces' });
    // Parent updates merge the previous completed records into draft-only
    // checkpoints. Count newly saved arrays, not every snapshot carrying them.
    const forceChanges = () => {
      let previous = {};
      return patches.filter((p) => p.ptForce).map(({ ptForce: current }) => {
        const change = {
          draft: current.draft !== previous.draft,
          prediction: current.preds !== previous.preds,
          observation: current.observations !== previous.observations
        };
        previous = current;
        return change;
      });
    };
    expect(forceChanges()).toHaveLength(0);
    host.querySelector('[data-pt-forces-cut]').click();
    host.querySelector('[data-pt-forces-predict] input[type=radio]').click();
    host.querySelector('[data-pt-forces-lock]').click();
    expect(forceChanges().some((change) => change.draft && !change.prediction && !change.observation)).toBe(true);
    expect(forceChanges().filter((change) => change.prediction)).toHaveLength(1);
    expect(forceChanges().filter((change) => change.observation)).toHaveLength(0);
    expect(getState().ptForce.preds).toHaveLength(1);
    expect(getState().ptForce.preds[0]).toMatchObject({ a: 'cut', c: 0, ok: false });
    expect(getState().ptForce.observations).toBeUndefined();
    expect(window.__alloPtEvidenceFrom(getState())).not.toContain('cut');
    host.querySelector('[data-pt-forces-run]').click();
    const step = () => [...host.querySelectorAll('button')].find((b) => /\+1 million years/.test(b.textContent)).click();
    for (let i = 0; i < 4; i++) step();
    await vi.waitFor(() => expect(getState().ptForce.observations).toHaveLength(1));
    const observed = getState().ptForce.observations[0];
    expect(observed.a).toBe('cut');
    expect(observed.vBefore).toBeGreaterThan(observed.vAfter);
    expect(observed.vAfter).toBeGreaterThan(0);
    expect(window.__alloPtEvidenceFrom(getState())).toContain('cut');
    step(); step();
    expect(forceChanges().filter((change) => change.prediction)).toHaveLength(1);
    expect(forceChanges().filter((change) => change.observation)).toHaveLength(1);
    expect(getState().ptForce.observations).toHaveLength(1);
  });

  it('reports collision and slab breakoff when the student advances time in steps', () => {
    const { host, ctx } = renderTool({ simTab: 'forces' });
    host.querySelector('[data-pt-forces-continent]').click();
    host.querySelector('[data-pt-forces-predict] input[type=radio]').click();
    host.querySelector('[data-pt-forces-lock]').click();
    host.querySelector('[data-pt-forces-run]').click();
    for (let i = 0; i < 120 && !ctx._sr.some((m) => /slab has broken off/.test(m)); i++) {
      host.querySelector('[data-pt-forces-step]').click();
    }
    expect(ctx._sr.filter((m) => /continent has reached the trench/.test(m))).toHaveLength(1);
    expect(ctx._sr.filter((m) => /slab has broken off/.test(m))).toHaveLength(1);
    expect(host.textContent).toMatch(/slab has broken off/);
  });
});

describe('Hotspot data lab: the student fits the Pacific plate speed', () => {
  it('fits real NOAA ages and distances to about 9.8 cm per year', () => {
    const H = globalThis.window.__alloPtHawaii;
    expect(H.data.length).toBe(11);
    const midway = H.data.find((p) => p.id === 'midway');
    expect(midway).toMatchObject({ a: 27.7, d: 2432 });
    // least squares through the origin, recomputed independently from the data
    let sad = 0, saa = 0;
    H.data.forEach((p) => { sad += p.a * p.d; saa += p.a * p.a; });
    expect(H.fitKmPerMyr).toBeCloseTo(sad / saa, 6);
    expect(H.fitKmPerMyr / 10).toBeGreaterThan(8);
    expect(H.fitKmPerMyr / 10).toBeLessThan(11);
  });

  it('hides the best fit until the student commits an estimate', () => {
    const { host, getState } = renderTool({ simTab: 'hotspots' });
    const lab = host.querySelector('[data-pt-hotspot-lab]');
    expect(lab.getAttribute('data-pt-hotspot-lab')).toBe('fitting');
    expect(host.textContent).not.toMatch(/Best fit \(blue\)/);
    host.querySelector('[data-pt-hotspot-commit]').click();
    expect(getState().ptHotspot && typeof getState().ptHotspot.est).toBe('number');
  });

  it('shows the fit once an estimate is saved', () => {
    const { host } = renderTool({ simTab: 'hotspots', ptHotspot: { est: 95 } });
    expect(host.querySelector('[data-pt-hotspot-lab]').getAttribute('data-pt-hotspot-lab')).toBe('fitted');
    expect(host.querySelector('[data-pt-hotspot-result]').getAttribute('data-pt-hotspot-result')).toBe('close');
    expect(host.textContent).toMatch(/Best fit \(blue\)/);
  });

  it('marks a far-off estimate as off, and the quest hook agrees', () => {
    const { host } = renderTool({ simTab: 'hotspots', ptHotspot: { est: 40 } });
    expect(host.querySelector('[data-pt-hotspot-result]').getAttribute('data-pt-hotspot-result')).toBe('off');
    const hooks = globalThis.window.StemLab._registry.plateTectonics.questHooks;
    const hr = hooks.find((q) => q.id === 'hotspot_rate');
    expect(hr.check({ ptHotspot: { est: 40 } })).toBe(false);
    expect(hr.check({ ptHotspot: { est: 95 } })).toBe(true);
  });
});

describe('Explain It: claim, evidence and reasoning from the student\'s own findings', () => {
  const WORDS = (n) => Array.from({ length: n }, (_, i) => 'word' + i).join(' ');

  it('does not turn predictions or an unsupported hotspot estimate into evidence', () => {
    const evidence = window.__alloPtEvidenceFrom;
    const predictionsOnly = evidence({ ptForce: { preds: [{ a: 'cut' }, { a: 'continent' }] } });
    expect(predictionsOnly).not.toContain('cut');
    expect(predictionsOnly).not.toContain('continent');
    for (const hs of [{ est: 40, dir: 'nw' }, { est: 95, dir: 'se' }, { est: 95 }, { est: Infinity, dir: 'nw' }]) {
      expect(evidence({ ptHotspot: hs })).not.toContain('hawaii');
    }
    expect(evidence({ ptHotspot: { est: 95, dir: 'nw' } })).toContain('hawaii');
    expect(evidence({ ptForce: { observations: [{ a: 'continent', vBefore: 8, vAfter: 2, mountainKm: 3 }] } })).toContain('continent');
    for (const o of [{ a: 'cut', vBefore: 2, vAfter: 8 }, { a: 'cut', vBefore: Infinity, vAfter: 1 }, { a: 'continent', vBefore: 8, vAfter: 2, mountainKm: 0 }]) {
      expect(evidence({ ptForce: { observations: [o] } })).not.toContain(o.a);
    }
  });

  it('offers only evidence the student has actually collected', () => {
    const { host } = renderTool({ simTab: 'explain', ptForce: { observations: [{ a: 'cut', vBefore: 8, vAfter: 1.5 }] }, ptHotspot: { est: 95, dir: 'nw' } });
    const have = (id) => host.querySelector('[data-pt-evidence="' + id + '"]').getAttribute('data-pt-evidence-have');
    expect(have('cut')).toBe('true');
    expect(have('hawaii')).toBe('true');
    expect(have('continent')).toBe('false');
    expect(have('stress')).toBe('false');
  });

  it('will not save until each part says something, then saves with the evidence for the teacher', () => {
    const snaps = [];
    const { host, getState } = renderTool({ simTab: 'explain', ptForce: { observations: [{ a: 'cut', vBefore: 8, vAfter: 1.5 }] } },
      { saveSnapshot: (tool, label, data) => snaps.push({ tool, label, data }) });
    const save = () => host.querySelector('[data-pt-cer-save]');
    expect(save().disabled).toBe(true);
    const type = (k, text) => {
      const ta = host.querySelector('[data-pt-cer="' + k + '"]');
      const setter = Object.getOwnPropertyDescriptor(globalThis.window.HTMLTextAreaElement.prototype, 'value').set;
      setter.call(ta, text);
      ta.dispatchEvent(new globalThis.window.Event('input', { bubbles: true }));
    };
    type('claim', WORDS(6)); type('evidence', WORDS(9)); type('reasoning', WORDS(9));
    expect(save().disabled).toBe(false);
    save().click();
    expect(getState().ptCER && getState().ptCER.claim).toBe(WORDS(6));
    expect(snaps.length).toBe(1);
    expect(snaps[0].tool).toBe('plateTectonics');
    expect(snaps[0].data.evidence).toContain('cut');
    expect(snaps[0].data.cer.reasoning).toBe(WORDS(9));
  });

  it('shows the teacher guide only in teacher mode', () => {
    expect(renderTool({ simTab: 'explain' }).host.querySelector('[data-pt-teacher-guide]')).toBeNull();
    const t = renderTool({ simTab: 'explain', ptQuizResult: { score: 5, total: 8, band: '6-8', missed: ['Convection'] } }, { isTeacherMode: true });
    const g = t.host.querySelector('[data-pt-teacher-guide]');
    expect(g).toBeTruthy();
    expect(g.querySelector('[data-pt-teacher-evidence]').textContent).toMatch(/Latest completed quiz: 5 of 8 \(grades 6-8\); concepts missed: Convection/);
  });
});

describe('Plate Boundary Simulator: the quake log reads the slab dip off the data', () => {
  it('logs every quake with distance and depth, and clears it on reset', () => {
    const text = read(SRC);
    // A restored checked sample is copied for inspection. Its provenance
    // prevents those old points from joining the next live run's observations.
    expect(text).toMatch(/qlog: restoredSlab \? restoredSlab\.points\.map\(function \(p\) \{ return Object\.assign\(\{\}, p\); \}\) : \[\],/);
    expect(text).toMatch(/qlogRestored: !!restoredSlab,/);
    expect(text).toMatch(/var liveLog = cur\.qlogRestored \? \[\] : \(Array\.isArray\(cur\.qlog\) \? cur\.qlog : \[\]\);/);
    expect(text).toMatch(/if \(cur\.qlogRestored\) \{ patch\.qlog = \[\]; patch\.qlogRestored = false; \}/);
    // Keep the original coordinate/depth recording and bounded history checks.
    expect(text).toMatch(/patch\.qlog = liveLog\.concat\(\[\{ x: Math\.round\(distKm\), z: Math\.round\(depthKm\), m: Math\.round\(magnitude \* 10\) \/ 10 \}\]\)\.slice\(-200\);/);
    expect(text).toMatch(/qlog: \[\], dipLocked: false, dipSample: null, dipRestored: false, qlogRestored: false \}\);/);
  });

  it('fits only the deep quakes, through the boundary, and asks for a guess first', () => {
    const text = read(SRC);
    const i = text.indexOf('var deep = log.filter(function (q) { return q.z >= 70; });');
    expect(i).toBeGreaterThan(-1);
    const blk = text.slice(i, text.indexOf('// Educational cards', i));
    expect(blk).toMatch(/fitDip = Math\.atan\(sxz \/ sxx\) \* 180 \/ Math\.PI/);
    expect(blk).toMatch(/s\.dipLocked && fitDip != null/);
    expect(blk).toMatch(/var canLock = s\.mode === 'convergent' && deep\.length >= \d+;/);
  });

  it('renders the log collapsed, with its chart built only when opened', () => {
    const { host } = renderTool({});
    const log = host.querySelector('[data-pt-quake-log]');
    expect(log).toBeTruthy();
    expect(log.open).toBe(false);
    expect(log.querySelector('svg')).toBeNull();
  });

  it('preserves the current run and paused state when its selected boundary is clicked again', () => {
    const act = React.act || React.unstable_act;
    const oldRAF = globalThis.requestAnimationFrame, oldCancel = globalThis.cancelAnimationFrame;
    const frames = new Map(); let frameId = 0;
    globalThis.requestAnimationFrame = window.requestAnimationFrame = callback => { frames.set(++frameId, callback); return frameId; };
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = id => frames.delete(id);
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    const host = document.createElement('div'); document.body.appendChild(host); mounted.push(host);
    const announcements = [];
    try {
      act(() => ReactDOM.render(React.createElement(window.AlloTectonicsInteractive, { darkMode: true, announceToSR: text => announcements.push(text) }), host));
      let now = performance.now();
      for (let i = 0; i < 3; i++) act(() => {
        now += 1000;
        const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(now));
      });
      const pause = [...host.querySelectorAll('button')].find(button => button.textContent === '⏸ Pause');
      act(() => pause.click());
      const snapshot = () => ({
        time: host.querySelector('[data-pt-model-reading="time"]').textContent,
        movement: host.querySelector('[data-pt-model-reading="movement"]').textContent,
        log: host.querySelector('[data-pt-quake-log]').getAttribute('data-pt-quake-log'),
        paused: [...host.querySelectorAll('button')].some(button => button.textContent === '▶ Play'),
        announcements: announcements.length
      });
      const before = snapshot();
      expect(before.time).not.toBe('0 years'); expect(before.movement).not.toBe('0 m'); expect(Number(before.log)).toBeGreaterThan(0);
      expect(before.paused).toBe(true);
      expect(host.querySelector('[data-pt-model-readings]').getAttribute('aria-live')).toBe('off');
      act(() => host.querySelector('[data-tect-mode="convergent"]').click());
      expect(snapshot()).toEqual(before);
      act(() => host.querySelector('[data-tect-mode="divergent"]').click());
      expect(snapshot()).toMatchObject({ time: '0 years', movement: '0 km', log: '0', paused: true });
    } finally {
      act(() => ReactDOM.unmountComponentAtNode(host));
      random.mockRestore();
      globalThis.requestAnimationFrame = window.requestAnimationFrame = oldRAF;
      globalThis.cancelAnimationFrame = window.cancelAnimationFrame = oldCancel;
    }
  });

  it('draws a slab guide only for subduction and keeps axis descriptions appropriate to the boundary', () => {
    const act = React.act || React.unstable_act;
    const host = document.createElement('div'); document.body.appendChild(host); mounted.push(host);
    act(() => ReactDOM.render(React.createElement(window.AlloTectonicsInteractive, { darkMode: true }), host));
    const log = host.querySelector('[data-pt-quake-log]');
    act(() => { log.open = true; log.dispatchEvent(new window.Event('toggle')); });
    const guess = host.querySelector('[data-pt-slab-line="guess"]');
    expect(guess).toBeTruthy();
    // Presentation changes must not move the data origin or change the axes.
    expect(Number(guess.getAttribute('x1'))).toBeCloseTo(52 + 150 / 950 * (460 - 52 - 12));
    expect(Number(guess.getAttribute('y1'))).toBe(14);
    expect(host.querySelector('[data-pt-quake-axis="distance"]').textContent).toContain('overriding plate');
    expect(log.querySelector('svg').getAttribute('aria-label')).toContain('70 km or deeper');
    expect(log.querySelectorAll('svg text')).toHaveLength(9);
    expect([...log.querySelectorAll('svg text')].every(text => Number(text.getAttribute('font-size')) >= 18)).toBe(true);
    const endpoint = [...log.querySelectorAll('svg text')].find(text => text.textContent === '800');
    expect(endpoint.getAttribute('text-anchor')).toBe('end');
    for (const mode of ['divergent', 'transform']) {
      act(() => host.querySelector('[data-tect-mode="' + mode + '"]').click());
      expect(host.querySelector('[data-pt-slab-line]')).toBeNull();
      expect(host.querySelector('[data-pt-quake-axis="distance"]').textContent).not.toContain('overriding');
      expect(log.querySelector('svg').getAttribute('aria-label')).toContain('No slab-angle line');
    }
  });
});

describe('Epicenter: a mystery quake is found from the readings, not dragged into place', () => {
  it('hides the epicenter and the distances, and asks for a guess', () => {
    const { host } = renderTool({});
    host.querySelector('[data-pt-mystery-start]').click();
    const panel = host.querySelector('[data-pt-mystery]');
    expect(panel.getAttribute('data-pt-mystery')).toBe('hunting');
    // the readings still show S-P times, but not the answer
    expect(panel.textContent).toMatch(/\d+\.\ds/);
    expect(host.textContent).toMatch(/\? km/);
    expect(host.querySelector('[data-pt-mystery-check]').disabled, 'no guess yet').toBe(true);
    const description = host.querySelector('[data-pt-epicenter-canvas]').getAttribute('aria-label');
    expect(description).toMatch(/true epicenter and distances are hidden/);
    expect(description).toMatch(/BRK \d+\.\d seconds/);
    expect(description).not.toMatch(/\d+ kilometers/);
    expect(description).toMatch(/No guess placed/);
  });

  it('describes the keyboard guess with distances from that guess, without revealing the solution', () => {
    const { host, ctx } = renderTool({});
    host.querySelector('[data-pt-mystery-start]').click();
    const cv = host.querySelector('[data-pt-epicenter-canvas]');
    keyOn(cv, 'ArrowRight');
    const first = cv.getAttribute('aria-label');
    expect(first).toMatch(/Your guess is 1104 km right and 720 km down/);
    expect(first).toMatch(/Distances from your guess to stations: BRK 827 km/);
    expect(first).not.toMatch(/\d+ kilometers/);
    keyOn(cv, 'ArrowDown');
    expect(cv.getAttribute('aria-label')).toMatch(/Your guess is 1104 km right and 744 km down/);
    expect(ctx._sr.at(-1)).toMatch(/Your guess is 1104 km right and 744 km down/);
    expect(host.querySelector('[data-pt-mystery-check]').disabled).toBe(false);
  });

  it('lets the keyboard move a selected station while the other station readings stay fixed', () => {
    const { host, ctx } = renderTool({});
    const cv = host.querySelector('[data-pt-epicenter-canvas]');
    const select = host.querySelector('[data-pt-epicenter-target]');
    const before = cv.getAttribute('aria-label');
    Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(select, 'BRK');
    select.dispatchEvent(new window.Event('change', { bubbles: true }));
    keyOn(cv, 'ArrowRight');
    const after = cv.getAttribute('aria-label');
    expect(after.match(/BRK ([\d.]+) seconds/)[1]).not.toBe(before.match(/BRK ([\d.]+) seconds/)[1]);
    expect(after.match(/PAS ([\d.]+) seconds/)[1]).toBe(before.match(/PAS ([\d.]+) seconds/)[1]);
    expect(ctx._sr.at(-1)).toMatch(/BRK moved/);
  });

  it('scores a placed guess in km and records the best one', () => {
    const { host, getState } = renderTool({});
    host.querySelector('[data-pt-mystery-start]').click();
    const cv = host.querySelector('[data-pt-epicenter-canvas]');
    keyOn(cv, 'ArrowRight');
    const check = host.querySelector('[data-pt-mystery-check]');
    expect(check.disabled).toBe(false);
    check.click();
    const err = host.querySelector('[data-pt-mystery-err]');
    expect(err, 'result shown').toBeTruthy();
    expect(Number(err.getAttribute('data-pt-mystery-err'))).toBeGreaterThanOrEqual(0);
    const saved = getState().ptEpi;
    expect(typeof (saved && saved.mysteryBestKm)).toBe('number');
    expect(saved.mysteryTries).toBe(1);
  });

  it('awards the quest only for a location within 50 km', () => {
    const hook = globalThis.window.StemLab._registry.plateTectonics.questHooks.find((q) => q.id === 'mystery_quake');
    expect(hook.check({ ptEpi: { mysteryBestKm: 120 } })).toBe(false);
    expect(hook.check({ ptEpi: { mysteryBestKm: 42 } })).toBe(true);
  });
});

describe('AI tutor: grounded in the scene, and coaching rather than telling', () => {
  const stubAI = (reply) => {
    const prompts = [];
    return { prompts, callGemini: (p) => { prompts.push(p); return Promise.resolve(reply); } };
  };
  const flush = () => new Promise((r) => setTimeout(r, 0));
  const focus = { kind: 'subduction', label: 'Convergent', a: 'Nazca', b: 'S. American', aType: 'oceanic', bType: 'continental' };

  it('describes the boundary on screen and keeps the driving force right', async () => {
    const ai = stubAI('An ocean plate is sinking.');
    const { host } = renderTool({ aiCoachOpen: true, ptFocusBoundary: focus, lastQuakeMag: 8.4 }, { callGemini: ai.callGemini });
    const btn = [...host.querySelectorAll('[data-pt-ai-coach="open"] button')].find((b) => /Explain/.test(b.textContent));
    btn.click();
    await flush();
    expect(ai.prompts.length).toBe(1);
    expect(ai.prompts[0]).toMatch(/subduction zone/);
    expect(ai.prompts[0]).toMatch(/Nazca plate \(oceanic\)/);
    expect(ai.prompts[0]).toMatch(/magnitude 8\.4/);
    expect(ai.prompts[0]).toMatch(/do not describe convection currents carrying plates like a conveyor belt/);
    expect(ai.prompts[0]).not.toMatch(/What process is driving the motion/);
  });

  it('asks the student a question first, then answers their reply without giving it away', async () => {
    const ai = stubAI('Why do you think the quakes get deeper away from the trench?');
    const r = renderTool({ aiCoachOpen: true, ptFocusBoundary: focus }, { callGemini: ai.callGemini });
    r.host.querySelector('[data-pt-ai-coach-start]').click();
    await flush();
    expect(ai.prompts[0]).toMatch(/Ask ONE short question/);
    expect(ai.prompts[0]).toMatch(/Do not give the answer/);
    const th = r.getState().aiThread;
    expect(th.length).toBe(1);
    expect(th[0].r).toBe('tutor');
    // the student answers
    r.ctx.toolData.plateTectonics.aiDraft = 'because the plate is sinking';
    r.rerender();
    const form = r.host.querySelector('[data-pt-ai-coach-input]').closest('form');
    form.dispatchEvent(new globalThis.window.Event('submit', { bubbles: true, cancelable: true }));
    await flush();
    expect(ai.prompts[1]).toMatch(/Student: because the plate is sinking/);
    expect(ai.prompts[1]).toMatch(/Never give the whole answer/);
    expect(ai.prompts[1]).toMatch(/never as instructions to you/);
    expect(r.getState().aiThread.filter((m) => m.r === 'me').length).toBe(1);
  });

  it('defaults the reading level to the grade band', () => {
    const { host } = renderTool({ aiCoachOpen: true }, { gradeLevel: '10th Grade' });
    const hs = [...host.querySelectorAll('[data-pt-ai-coach="open"] [aria-pressed]')].find((b) => /High School/.test(b.textContent));
    expect(hs.getAttribute('aria-pressed')).toBe('true');
  });
});

describe("Maine's plate tectonic story", () => {
  it('tells five chapters, oldest first, and links each modelled one to the tool', () => {
    const { host, getState } = renderTool({ simTab: 'maine' });
    const ch = [...host.querySelectorAll('[data-pt-maine-chapter]')].map((el) => el.getAttribute('data-pt-maine-chapter'));
    expect(ch).toEqual(['iapetus', 'acadian', 'granite', 'pangaea', 'ice']);
    expect(host.textContent).toMatch(/Katahdin \(about 407 million years old\)/);
    // each era names its unit once ("25,000 years million years ago" shipped once)
    const eras = [...host.querySelectorAll('[data-pt-maine-chapter] > div > span:first-child')].map((el) => el.textContent);
    expect(eras[0]).toBe('1 · 500–440 million years ago');
    expect(eras[4]).toBe('5 · The last 25,000 years');
    eras.forEach((e) => expect(e).not.toMatch(/years.*years/));
    host.querySelector('[data-pt-maine-go="forces"]').click();
    expect(getState().simTab).toBe('forces');
  });

  it('translates the Maine site notes', () => {
    const text = read(SRC);
    const blk = text.slice(text.indexOf('var MAINE_GEO = ['), text.indexOf('];', text.indexOf('var MAINE_GEO = [')));
    expect(blk).not.toMatch(/notes: "/);
    expect((blk.match(/notes: __alloT\('stem\.platetectonics\.maine_note_\d+'/g) || []).length).toBe(30);
  });
});

describe('Continent puzzle: the evidence Wegener started from', () => {
  const F = () => globalThis.window.__alloPtFit;
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const gapOf = (host) => +host.querySelector('[data-pt-fit-gap]').getAttribute('data-pt-fit-gap');

  it('searches for the best fit, and there the evidence lines up across the join', () => {
    const f = F();
    const b = f.best();
    const at = (lon, lat) => f.place(f.proj(lon, lat), b.t);
    expect(f.gap({ dx: 0, dy: 0, rot: 0 }).km, 'today the coasts are an ocean apart').toBeGreaterThan(3000);
    expect(b.km).toBeLessThan(320);
    expect(b.overlap).toBeLessThanOrEqual(f.OVERLAP_MAX);
    // Brazil's bulge tucks into the Bight of Biafra, and Sao Luis lands by Accra,
    // where Hurley's team predicted the rock-age boundary would reach Brazil.
    expect(dist(at(-34.9, -8.1), f.proj(9.7, 4.0))).toBeLessThan(400);
    expect(dist(at(-44.3, -2.5), f.proj(-0.2, 5.6))).toBeLessThan(700);
    // Mesosaurus: the Parana basin sits beside Namibia.
    const m = f.EVIDENCE.meso;
    expect(dist(at(m.sa[0][0], m.sa[0][1]), f.proj(m.af[0][0], m.af[0][1]))).toBeLessThan(900);
    // The opening rate the fit implies is the real South Atlantic's, 3-5 cm a year.
    const r = f.cmPerYr(f.recifeMovedKm(b.t), f.OPEN_MYR);
    expect(r).toBeGreaterThan(3);
    expect(r).toBeLessThan(5);
  });

  it('can be solved with the big 200 km / 5 degree buttons alone', () => {
    const f = F();
    const close = f.best().km * f.CLOSE_FACTOR;
    let ok = false;
    for (let dx = 5000; dx <= 6600 && !ok; dx += 200) for (let dy = -400; dy <= 1000 && !ok; dy += 200) for (let rot = 15; rot <= 35 && !ok; rot += 5) {
      const g = f.gap({ dx, dy, rot });
      if (g.overlap <= f.OVERLAP_MAX && g.km <= close) ok = true;
    }
    expect(ok).toBe(true);
  });

  it('measures the gap from the geometry as the student moves South America', () => {
    const { host, ctx } = renderTool({ simTab: 'fit' });
    const gap0 = gapOf(host);
    expect(gap0).toBeGreaterThan(3000);
    const east = host.querySelector('[data-pt-fit-move="e"]');
    for (let i = 0; i < 5; i++) east.click();
    expect(gapOf(host)).toBe(Math.round(F().gap({ dx: 1000, dy: 0, rot: 0 }).km));
    expect(gapOf(host)).toBeLessThan(gap0 - 500);
    expect(ctx._sr[ctx._sr.length - 1]).toMatch(/Average gap/);
    expect(host.querySelector('[data-pt-fit-question]'), 'no question before a fit').toBeNull();
  });

  it('records a close fit, then asks the evidence question and scores it', () => {
    const f = F();
    const b = f.best();
    const { host, getState, rerender } = renderTool({ simTab: 'fit', ptFit: { t: { dx: b.t.dx - 200, dy: b.t.dy, rot: b.t.rot } } });
    host.querySelector('[data-pt-fit-move="e"]').click();
    expect(getState().ptFit.fitted).toBe(true);
    rerender();
    expect(host.querySelector('[data-pt-fit-question]')).toBeTruthy();
    const hook = globalThis.window.StemLab._registry.plateTectonics.questHooks.find((q) => q.id === 'continents_fit');
    host.querySelector('[data-pt-fit-answer="bridge"]').click();
    expect(getState().ptFit.answer).toBe('bridge');
    expect(hook.check(getState())).toBe(false);
    rerender();
    expect(host.querySelector('[data-pt-fit-feedback]').getAttribute('data-pt-fit-feedback')).toBe('rethink');
    host.querySelector('[data-pt-fit-answer="joined"]').click();
    expect(hook.check(getState())).toBe(true);
    // The rate is measured from where this student put South America.
    const rate = +host.querySelector('[data-pt-fit-rate]').getAttribute('data-pt-fit-rate');
    expect(rate).toBeCloseTo(f.cmPerYr(f.recifeMovedKm(getState().ptFit.t), f.OPEN_MYR), 1);
  });

  it('pins the evidence to the continents, so the layers ride with South America', () => {
    const { host } = renderTool({ simTab: 'fit' });
    host.querySelector('[data-pt-fit-toggle="meso"]').click();
    const paths = () => [...host.querySelectorAll('[data-pt-fit-layer="meso"]')].map((p) => p.getAttribute('d'));
    const before = paths();
    expect(before.length).toBe(4);
    host.querySelector('[data-pt-fit-move="e"]').click();
    const after = paths();
    // Africa's two areas stay put; South America's two move.
    expect(after.filter((d) => before.includes(d)).length).toBe(2);
  });

  it('sends the Pangaea activities and the fixed-continents myth to the puzzle', () => {
    const text = read(SRC);
    expect(text.includes("'Pangaea Puzzle': ['fit',")).toBe(true);
    expect(text.includes("'Continental Drift Evidence Lab': ['fit',")).toBe(true);
    expect(/mytry_20', "[^"]+"\), go: 'fit' \}/.test(text)).toBe(true);
  });
});

describe('Fossils tab: evidence, not only a list', () => {
  it('shows where the sea fossils on mountains are, which the myth sends students to find', () => {
    const { host, getState } = renderTool({ simTab: 'fossils' });
    const card = host.querySelector('[data-pt-everest]');
    expect(card, 'the Everest card').toBeTruthy();
    expect(card.textContent).toMatch(/summit of Everest is limestone/);
    expect(card.textContent).toMatch(/trilobites, crinoids/);
    // the myth that points here promises exactly this
    expect(read(SRC)).toMatch(/mytry_6', "Open the Fossils tab and see where marine fossils turn up\."\), go: 'fossils'/);
    host.querySelector('[data-pt-fossils-go="fit"]').click();
    expect(getState().simTab).toBe('fit');
  });

  it('translates every fossil note and era, and fixes the names that taught the wrong thing', () => {
    const text = read(SRC);
    const blk = text.slice(text.indexOf('var FOSSIL_DB = ['), text.indexOf('];', text.indexOf('var FOSSIL_DB = [')));
    expect(blk).not.toMatch(/notes: "/);
    expect(blk).not.toMatch(/era: "/);
    expect((blk.match(/notes: __alloT\('stem\.platetectonics\.fossil_note_\d+'/g) || []).length).toBe(40);
    expect(blk).not.toMatch(/Tetrapod \(Tiktaalik\)/);
    expect(blk).not.toMatch(/Crocodile \(Phytosauria\)/);
    expect(blk).not.toMatch(/Largest arthropod ever/);
  });

  it('reads in dark mode: no white cards left in the list', () => {
    const { host } = renderTool({ simTab: 'fossils' }, { isDark: true });
    const list = host.querySelector('[data-pt-fossil-list]');
    expect(list.children.length).toBe(40);
    expect(list.querySelectorAll('.bg-white').length).toBe(0);
  });
});

describe('Read aloud', () => {
  const focus = { kind: 'subduction', label: 'Convergent — ocean sinks under continent', a: 'Nazca', b: 'S. American', aType: 'oceanic', bType: 'continental' };

  it('reads the boundary explanation through the host TTS, as a user action', () => {
    const calls = [];
    const callTTS = (text, voice, speed, opts) => { calls.push({ text, opts }); return Promise.resolve('blob:x'); };
    const { host } = renderTool({ ptFocusBoundary: focus }, { callTTS });
    const btn = host.querySelector('[data-pt-boundary-explainer] [data-pt-read-aloud]');
    expect(btn, 'a read-aloud button on the explainer').toBeTruthy();
    btn.click();
    expect(calls.length).toBe(1);
    expect(calls[0].text).toMatch(/ocean sinks under continent/);
    expect(calls[0].text).toMatch(/moving TOWARD each other/);
    expect(calls[0].opts).toMatchObject({ force: true });
  });

  it('falls back to the browser speech engine when the host has none', () => {
    const spoken = [];
    const w = globalThis.window;
    const prevS = w.speechSynthesis, prevU = w.SpeechSynthesisUtterance;
    w.speechSynthesis = { cancel() {}, speak(u) { spoken.push(u.text); } };
    w.SpeechSynthesisUtterance = function (t) { this.text = t; };
    try {
      const { host } = renderTool({ simTab: 'quiz' }, { callTTS: null, gradeLevel: '10th Grade' });
      host.querySelector('[data-pt-read-aloud]').click();
      expect(spoken.length).toBe(1);
      // the question and its lettered choices
      expect(spoken[0]).toMatch(/Himalayas\?.*A: .*B: .*C: .*D: /);
    } finally {
      w.speechSynthesis = prevS; w.SpeechSynthesisUtterance = prevU;
    }
  });
});

describe('Myths: Try it goes there', () => {
  it('sends the student to the tab the hint names', () => {
    const myth = { idx: 0, s: 'x', t: true, why: 'y', tryIt: 'Measure the sea floor.', go: 'forces', answered: true, chosen: true };
    const { host, getState } = renderTool({ simTab: 'quiz', ptMyth: myth, quizIdx: 99 });
    const go = host.querySelector('[data-pt-myth-go="forces"]');
    expect(go, 'a Go there button').toBeTruthy();
    go.click();
    expect(getState().simTab).toBe('forces');
    expect(getState()._ptCategory).toBe('sim_quiz');
  });
});

describe('Simulation: three real boundary missions', () => {
  const done = (host, id) => host.querySelector('[data-pt-mission="' + id + '"]').getAttribute('data-pt-mission-done');

  it('starts with nothing done and a hint for each', () => {
    const { host } = renderTool({});
    expect(host.querySelector('[data-pt-missions]').getAttribute('data-pt-missions')).toBe('0');
    ['sink', 'open', 'collide'].forEach((id) => expect(done(host, id)).toBe('false'));
    expect(host.textContent).toMatch(/Push India into Eurasia/);
    expect(host.textContent).not.toMatch(/slide them sideways/);
  });

  it('requires boundaries the learner made, even when all kinds have been seen', () => {
    const { host } = renderTool({ ptSeenKinds: { subduction: true, ocean_ridge: true, collision: true }, ptMadeMaxMag: 8.4 });
    expect(host.querySelector('[data-pt-missions]').getAttribute('data-pt-missions')).toBe('0');
    ['sink', 'open', 'collide'].forEach((id) => expect(done(host, id)).toBe('false'));
  });

  it('ticks off boundaries the learner made, and asks for the M8 on the sinking one', () => {
    const half = renderTool({ ptMadeKinds: { subduction: true, collision: true }, ptMadeMaxMag: 7.6 });
    expect(done(half.host, 'sink'), 'a subduction zone alone is not the mission').toBe('false');
    expect(done(half.host, 'collide')).toBe('true');
    const all = renderTool({ ptMadeKinds: { subduction: true, ocean_ridge: true, collision: true }, ptMadeMaxMag: 8.4 });
    expect(all.host.querySelector('[data-pt-missions]').getAttribute('data-pt-missions')).toBe('3');
    expect(all.host.textContent).toMatch(/All three boundaries built/);
  });

  it('records every boundary kind the sim shows', () => {
    const text = read(SRC);
    expect(text).toMatch(/if \(!seenK\[kk\]\) \{ var addK = \{\}; addK\[kk\] = true; focusPatch\.ptSeenKinds = Object\.assign\(\{\}, seenK, addK\); \}/);
  });
});

describe('Force lab: measuring the sea floor', () => {
  const setVal = (el, v) => {
    const proto = el.tagName === 'SELECT' ? globalThis.window.HTMLSelectElement.prototype : globalThis.window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, String(v));
    el.dispatchEvent(new globalThis.window.Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  };
  const measure = (host, km, side) => {
    const panel = host.querySelector('[data-pt-forces-probe]');
    setVal(panel.querySelector('[data-pt-forces-probe-km]'), km);
    setVal(panel.querySelector('select'), side);
    panel.querySelector('form').dispatchEvent(new globalThis.window.Event('submit', { bubbles: true, cancelable: true }));
  };
  const rows = (host) => [...host.querySelectorAll('[data-pt-forces-probe] tbody tr')].map((tr) => [...tr.children].map((td) => td.textContent));

  it('reads older crust farther from the ridge, on both plates, at one rate', () => {
    const { host } = renderTool({ simTab: 'forces' });
    measure(host, 300, 'A');
    measure(host, 1200, 'A');
    measure(host, 300, 'B');
    const r = rows(host);
    expect(r.length).toBe(3);
    const age = (i) => parseFloat(r[i][3]);
    const rate = (i) => parseFloat(r[i][4]);
    expect(age(1)).toBeGreaterThan(age(0));
    // mirror image: the same distance on the other side is the same age
    expect(Math.abs(age(2) - age(0))).toBeLessThan(0.2);
    // distance / age is the half-spreading rate, the same at each point
    expect(Math.abs(rate(1) - rate(0))).toBeLessThan(0.3);
    expect(host.querySelector('[data-pt-forces-probe-note]')).toBeTruthy();
  });

  it('says so when there is no sea floor at that distance', () => {
    const { host } = renderTool({ simTab: 'forces' });
    measure(host, 5000, 'B');
    expect(rows(host).length).toBe(0);
    expect(host.textContent).toMatch(/There is no sea floor at that distance/);
  });

  it('clears measurements when a reset starts a new world', () => {
    const { host } = renderTool({ simTab: 'forces' });
    measure(host, 300, 'A');
    measure(host, 1200, 'A');
    expect(rows(host)).toHaveLength(2);
    host.querySelector('[data-pt-forces-reset]').click();
    expect(rows(host)).toHaveLength(0);
    expect(host.querySelector('[data-pt-probe-pair]')).toBeNull();
    expect(host.querySelector('[data-pt-probe-next]').textContent).toContain('two different distances on the same plate');
  });
});

describe('Quiz: grades 3-5 get their own bank', () => {
  const bank35 = () => {
    const text = read(SRC);
    const a = text.indexOf('var QUIZZES_35 = ptBalanceAnswers([');
    expect(a).toBeGreaterThan(-1);
    const b = text.indexOf('\n          ]);', a);
    // eslint-disable-next-line no-new-func
    return new Function('__alloT', 'return (' + text.slice(text.indexOf('[', a), b + 12) + ')')((k, fb) => fb);
  };

  it('shows a 4th grader the plainer bank and a 10th grader the main one', () => {
    const young = renderTool({ simTab: 'quiz' }, { gradeLevel: '4th Grade' });
    expect(young.host.textContent).toMatch(/giant moving pieces of Earth's outer shell/);
    const old = renderTool({ simTab: 'quiz' }, { gradeLevel: '10th Grade' });
    expect(old.host.textContent).toMatch(/What kind of plate boundary built the Himalayas\?/);
  });

  it('keeps the 3-5 key from being guessable by length, and its feedback aligned', () => {
    const qs = globalThis.window.__alloPtBalanceAnswers(bank35());
    const ranks = {};
    qs.forEach((q) => {
      const L = q.opts.map((o) => o.length);
      const r = [...L].sort((x, y) => y - x).indexOf(L[q.ans]) + 1;
      ranks[r] = (ranks[r] || 0) + 1;
      expect(q.wrongFeedback[q.ans]).toMatch(/^Correct/);
    });
    Object.values(ranks).forEach((n) => expect(n / qs.length, JSON.stringify(ranks)).toBeLessThanOrEqual(0.4));
  });

  it('names a concept card for every 3-5 question', () => {
    const text = read(SRC);
    bank35().forEach((q) => {
      // A boolean, not toContain on the whole 2.5 MB source: a failing toContain
      // makes vitest diff the entire file, which hangs the run instead of failing it.
      const needle = "'" + q.concept + "': __alloT('stem.platetectonics.vocab_";
      expect(text.includes(needle), 'no vocabulary card for ' + q.concept).toBe(true);
    });
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
