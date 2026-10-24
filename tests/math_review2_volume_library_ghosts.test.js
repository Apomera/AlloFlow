// 3D Volume Explorer, buildable challenge library: the ghost outlines exist.
// The library promised "the cubes will appear as ghost outlines", but only the
// "Build Prism" challenge drew any, and only in the CSS Blocks view (the Solid
// 3D view, which is the default, drew none at all). Picking a structure showed
// an empty grid. Now every unplaced target cube is outlined in the Blocks
// view, handed to the WebGL view as ghost cells, and marked on the layer
// placement grid (the keyboard / screen-reader building surface).
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = process.env.MATH_REVIEW2_VOLUME_SRC || 'stem_lab/stem_tool_volume.js';

const mounted = [];
let latest = null;
let glModels = [];

beforeEach(() => {
  resetStemLab();
  loadTool(SOURCE, 'volume');
  latest = null;
  glModels = [];
  // render() hands the WebGL layer a plain model through VolGL.submit; jsdom
  // has no WebGL, so read the model there instead of the GPU.
  const gl = window.__alloVolGL;
  expect(gl && typeof gl.submit, 'VolGL test seam').toBe('function');
  const original = gl.submit;
  gl.submit = function (m) { glModels.push(m); return original.call(this, m); };
});

afterEach(async () => {
  while (mounted.length) {
    const { root, container } = mounted.pop();
    await React.act(async () => root.unmount());
    container.remove();
  }
});

function stubCanvas() {
  window.HTMLCanvasElement.prototype.getContext = function () {
    const noop = function () {};
    return {
      scale: noop, fillRect: noop, save: noop, translate: noop, rotate: noop,
      beginPath: noop, moveTo: noop, lineTo: noop, closePath: noop,
      rect: noop, arc: noop, ellipse: noop, fill: noop, stroke: noop,
      restore: noop, fillText: noop, setTransform: noop, clearRect: noop,
      measureText: function () { return { width: 0 }; },
    };
  };
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
}

async function mountVolume(initial) {
  stubCanvas();
  const cfg = window.StemLab._registry.volume;
  const container = document.createElement('div');
  document.body.appendChild(container);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  function Host() {
    const [toolData, setToolData] = React.useState({ _volume: initial });
    latest = toolData._volume || {};
    return cfg.render(makeCtx({ toolData, setToolData, awardXP: function () {}, announceToSR: function () {} }));
  }
  const root = ReactDOMClient.createRoot(container);
  await React.act(async () => { root.render(React.createElement(Host)); });
  mounted.push({ root, container });
  return container;
}

async function click(el) {
  await React.act(async () => { el.click(); });
}
const byText = (c, sel, text) => Array.from(c.querySelectorAll(sel)).find((b) => (b.textContent || '').includes(text));

async function openStructure(label) {
  const c = await mountVolume({ mode: 'freeform', positions: [], score: { correct: 0, total: 0 }, streak: 0, badges: {} });
  await click(c.querySelector('button[aria-label="Open buildable challenges library"]'));
  await click(byText(c, 'button', label));
  expect(latest.builderChallenge && latest.builderChallenge.library).toBeTruthy();
  return c;
}

const ghostCells = (c) => Array.from(c.querySelectorAll('[data-volume-ghost="true"]')).map((g) => g.getAttribute('data-volume-ghost-cell')).sort();
const lastGl = () => glModels[glModels.length - 1];

describe('library structures show their target as ghost outlines', () => {
  it('picking the Staircase outlines all 20 of its cubes in the Blocks view', async () => {
    const c = await openStructure('Staircase');
    const target = latest.builderChallenge.libraryPositions.slice().sort();
    expect(target.length).toBe(20);
    expect(ghostCells(c)).toEqual(target);
  });

  it('a placed target cube replaces its ghost', async () => {
    const c = await openStructure('Staircase');
    await click(c.querySelector('[data-volume-cell="0-0-0"]'));
    const ghosts = ghostCells(c);
    expect(ghosts.length).toBe(19);
    expect(ghosts.includes('0-0-0')).toBe(false);
  });

  it('the Solid 3D view gets the same ghost cells', async () => {
    await openStructure('Bridge');
    const m = lastGl();
    expect(m && Array.isArray(m.ghosts), 'model.ghosts').toBe(true);
    const cells = m.ghosts.map((g) => g.x + '-' + g.y + '-' + g.z).sort();
    expect(cells).toEqual(latest.builderChallenge.libraryPositions.slice().sort());
    // The GL loop only re-uploads when the signature changes.
    expect(String(m.sig).includes('4-1-3'), m.sig).toBe(true);
    // Frame the whole target, not just the cubes placed so far (none yet).
    expect(m.gh).toBe(4);
  });

  it('the layer placement grid marks the target squares on the active layer', async () => {
    const c = await openStructure('Staircase');
    const marked = Array.from(c.querySelectorAll('[data-volume-cell][data-volume-target="true"]')).map((b) => b.getAttribute('data-volume-cell')).sort();
    expect(marked).toEqual(['0-0-0', '0-1-0', '1-0-0', '1-1-0', '2-0-0', '2-1-0', '3-0-0', '3-1-0']);
    const label = c.querySelector('[data-volume-cell="0-0-0"]').getAttribute('aria-label');
    expect(/target/i.test(label), label).toBe(true);
    const plain = c.querySelector('[data-volume-cell="5-5-0"]').getAttribute('aria-label');
    expect(/target/i.test(plain), plain).toBe(false);
  });

  it('a structure with no ghost to draw (none picked) draws none', async () => {
    const c = await mountVolume({ mode: 'freeform', positions: ['0-0-0'] });
    expect(ghostCells(c)).toEqual([]);
    expect((lastGl().ghosts || []).length).toBe(0);
    expect(c.querySelectorAll('[data-volume-target="true"]').length).toBe(0);
  });
});

describe('Build Prism keeps its ghost and gains the same marks', () => {
  it('a 2 x 2 x 1 prism target outlines four cells in every view', async () => {
    const c = await mountVolume({
      mode: 'freeform', positions: [],
      builderChallenge: { type: 'prism', target: { l: 2, w: 2, h: 1 }, answer: 4 },
    });
    expect(ghostCells(c)).toEqual(['0-0-0', '0-1-0', '1-0-0', '1-1-0']);
    expect(lastGl().ghosts.length).toBe(4);
    expect(c.querySelectorAll('[data-volume-target="true"]').length).toBe(4);
  });
});
