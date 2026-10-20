import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Base-10 "Solid blocks" (WebGL) view. Its layout capped every place at 9
// blocks, so the regrouping states the tool itself suggests ("Start with 14
// ones") drew 9 unit cubes beside a label and a flat view that both say 14.
// The real renderer is run here against a recording stand-in for three.js and
// the host's voxel batch, and must draw one cube per unit of the value shown.
//
// MR2_NUMBERSENSE_MANIP_SRC points the suite at another copy of the tool
// (mutation check: the pre-fix copy must turn these red).

const FILE = process.env.MR2_NUMBERSENSE_MANIP_SRC || 'stem_lab/stem_tool_manipulatives.js';

class NoopObserver { observe() {} unobserve() {} disconnect() {} }
const ctx2d = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => { t[k] = v; return true; } });

// Anything-goes stand-in for three.js objects: every property is a callable that returns another one.
function fake() {
  const target = function () {};
  return new Proxy(target, {
    get(t, k) {
      if (k === 'then') return undefined;
      if (k === Symbol.toPrimitive) return () => 0;
      if (!(k in t)) t[k] = fake();
      return t[k];
    },
    set(t, k, v) { t[k] = v; return true; },
    apply() { return fake(); },
    construct() { return fake(); }
  });
}
const THREE = new Proxy({}, { get: (t, k) => (k === 'then' ? undefined : function FakeThreeClass() { return fake(); }) });

let root = null, frames = [], batches = [];
const saved = {};
beforeEach(() => {
  vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ctx2d);
  for (const k of ['ResizeObserver', 'requestAnimationFrame', 'cancelAnimationFrame']) saved[k] = window[k];
  window.ResizeObserver = NoopObserver;
  frames = []; batches = [];
  window.requestAnimationFrame = (cb) => { frames.push(cb); return frames.length; };
  window.cancelAnimationFrame = () => {};
  resetStemLab();
  window.StemLab.ensureThree = () => Promise.resolve(THREE);
  window.StemLab.makeVoxelBatch = (T, opts) => {
    const b = { capacity: opts.capacity, cubes: [], drawn: 0,
      set(i, x, y, z, s, color) { b.cubes[i] = { x, y, z, color }; }, commit(n) { b.drawn = n; },
      drawnCount() { return b.drawn; }, outlinedCount() { return b.drawn; }, addTo() {}, dispose() {} };
    batches.push(b);
    return b;
  };
  loadTool(FILE, 'base10');
});
afterEach(async () => {
  if (root) { await React.act(async () => { root.unmount(); }); root = null; }
  document.body.innerHTML = '';
  for (const k of Object.keys(saved)) window[k] = saved[k];
  vi.restoreAllMocks();
});

const COLORS = { thousands: 0xdb2777, hundreds: 0x2563eb, tens: 0x059669, ones: 0xea580c };
const UNITS = { thousands: 1000, hundreds: 100, tens: 10, ones: 1 };

async function drawSolid(b10) {
  if (root) { await React.act(async () => { root.unmount(); }); root = null; }
  const tool = window.StemLab._registry.base10;
  function App() {
    const [state, setState] = React.useState({ _manipulatives: { mode: 'blocks', b10Solid: true, b10 } });
    return tool.render(makeCtx({ toolData: state, setToolData: setState }));
  }
  document.body.innerHTML = '<div id="m-root"></div>';
  root = ReactDOMClient.createRoot(document.getElementById('m-root'));
  await React.act(async () => { root.render(React.createElement(App)); });
  await React.act(async () => { await Promise.resolve(); await Promise.resolve(); });
  // Run queued animation frames (each frame queues the next; three passes apply and settle).
  for (let pass = 0; pass < 3; pass++) { const run = frames.splice(0); run.forEach((cb) => cb(0)); }
  const gl = window.__alloB10GL.debug();
  const batch = batches[batches.length - 1];
  const perPlace = {};
  for (const c of batch.cubes.slice(0, batch.drawn)) {
    const place = Object.keys(COLORS).find((p) => COLORS[p] === c.color);
    perPlace[place] = (perPlace[place] || 0) + 1;
  }
  const label = document.querySelector('canvas[data-b10-gl]').getAttribute('aria-label');
  return { gl, perPlace, label };
}

describe('the solid view draws what the label says', () => {
  it('14 ones (the "Start with 14 ones" state) draws 14 unit cubes', async () => {
    const { gl, perPlace, label } = await drawSolid({ thousands: 0, hundreds: 0, tens: 0, ones: 14 });
    expect(gl.state).toBe('ready');
    expect(label).toContain('14 units');
    expect(gl.cubeCount).toBe(14);
    expect(perPlace).toEqual({ ones: 14 });
  });

  it('every place past 9 draws in full, after ungrouping too', async () => {
    for (const b10 of [
      { thousands: 0, hundreds: 0, tens: 12, ones: 0 },
      { thousands: 0, hundreds: 15, tens: 20, ones: 19 },
      { thousands: 11, hundreds: 0, tens: 0, ones: 3 },
      { thousands: 1, hundreds: 9, tens: 9, ones: 30 }
    ]) {
      const { gl, perPlace } = await drawSolid(b10);
      const want = {};
      for (const p of Object.keys(UNITS)) if (b10[p]) want[p] = b10[p] * UNITS[p];
      expect(perPlace, JSON.stringify(b10)).toEqual(want);
      expect(gl.cubeCount).toBe(Object.keys(UNITS).reduce((s, p) => s + b10[p] * UNITS[p], 0));
    }
  });

  it('up to 9 per place keeps the old 3-wide layout', async () => {
    const { gl } = await drawSolid({ thousands: 1, hundreds: 0, tens: 0, ones: 0 });
    expect(gl.cubeCount).toBe(1000);
    expect(gl.extent).toMatchObject({ h: 10, d: 10 });
    const nine = await drawSolid({ thousands: 9, hundreds: 9, tens: 9, ones: 9 });
    expect(nine.gl.cubeCount).toBe(9999);
  });

  it('blocks never overlap', async () => {
    const { gl } = await drawSolid({ thousands: 2, hundreds: 13, tens: 17, ones: 25 });
    const batch = batches[batches.length - 1];
    const seen = new Set();
    for (const c of batch.cubes.slice(0, batch.drawn)) seen.add([c.x, c.y, c.z].join(','));
    expect(seen.size).toBe(gl.cubeCount);
  });
});
