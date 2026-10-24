// 3D Volume Explorer, buildable challenge library: grade the SHAPE.
// The library ("Match the shape, then Check") graded only the cube count, so a
// flat 5 x 4 slab of 20 cubes passed as the 4-step Staircase and earned the
// score, streak and XP. A build now passes when its cubes form the target
// structure, placed anywhere on the grid and turned any way about the
// vertical axis. "Random Vol" (build ANY shape of a given volume) still grades
// the count only.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = process.env.MATH_REVIEW2_VOLUME_SRC || 'stem_lab/stem_tool_volume.js';

const mounted = [];
let latest = null;
let xpAwards = [];

beforeEach(() => {
  resetStemLab();
  loadTool(SOURCE, 'volume');
  latest = null;
  xpAwards = [];
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
    return cfg.render(makeCtx({
      toolData,
      setToolData,
      awardXP: function (id, amt, why) { xpAwards.push([id, amt, why]); },
      announceToSR: function () {},
    }));
  }
  const root = ReactDOMClient.createRoot(container);
  await React.act(async () => { root.render(React.createElement(Host)); });
  mounted.push({ root, container });
  return container;
}

const xpFor = (why) => xpAwards.filter((a) => a[2] === why);
const checkBtn = (c) => c.querySelector('button[aria-label="Check"]');
const byText = (c, sel, text) => Array.from(c.querySelectorAll(sel)).find((b) => (b.textContent || '').includes(text));

async function click(el) {
  await React.act(async () => { el.click(); });
}

async function selectLayer(c, z) {
  const sel = c.querySelector('#volume-freeform-layer');
  await React.act(async () => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
    setter.call(sel, String(z));
    sel.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
}

// Place cubes the way a student does: through the layer placement grid.
async function place(c, keys) {
  const byLayer = {};
  keys.forEach((k) => { const z = k.split('-')[2]; (byLayer[z] = byLayer[z] || []).push(k); });
  for (const z of Object.keys(byLayer).sort()) {
    await selectLayer(c, z);
    for (const k of byLayer[z]) {
      const cell = c.querySelector('[data-volume-cell="' + k + '"]');
      expect(cell, 'layer grid cell ' + k).toBeTruthy();
      await click(cell);
    }
  }
}

async function openStructure(label) {
  const c = await mountVolume({ mode: 'freeform', positions: [], score: { correct: 0, total: 0 }, streak: 0, badges: {} });
  await click(c.querySelector('button[aria-label="Open buildable challenges library"]'));
  const card = byText(c, 'button', label);
  expect(card, 'library card ' + label).toBeTruthy();
  await click(card);
  expect(latest.builderChallenge && latest.builderChallenge.library, 'library challenge set').toBeTruthy();
  return c;
}

const move = (keys, fn) => keys.map((k) => fn(k.split('-').map(Number)).join('-'));
const translate = (keys, dx, dy) => move(keys, ([x, y, z]) => [x + dx, y + dy, z]);
// 90 degrees about the vertical axis, shifted back onto the grid.
const turn = (keys, dx, dy) => move(keys, ([x, y, z]) => [dy - y, x + dx, z]);

const STAIRCASE = ['0-0-0','1-0-0','2-0-0','3-0-0','0-1-0','1-1-0','2-1-0','3-1-0','0-0-1','1-0-1','2-0-1','0-1-1','1-1-1','2-1-1','0-0-2','1-0-2','0-1-2','1-1-2','0-0-3','0-1-3'];
const BRIDGE = ['0-0-0','0-1-0','0-0-1','0-1-1','0-0-2','0-1-2','4-0-0','4-1-0','4-0-1','4-1-1','4-0-2','4-1-2','0-0-3','1-0-3','2-0-3','3-0-3','4-0-3','0-1-3','1-1-3','2-1-3','3-1-3','4-1-3'];

describe('library builds are graded by shape, not just cube count', () => {
  it('a flat 20-cube slab is not the 4-step Staircase', async () => {
    const c = await openStructure('Staircase');
    const slab = [];
    for (let x = 0; x < 5; x++) for (let y = 0; y < 4; y++) slab.push(x + '-' + y + '-0');
    await place(c, slab);
    expect(latest.positions.length).toBe(20);
    await click(checkBtn(c));
    expect(latest.builderFeedback && latest.builderFeedback.correct, latest.builderFeedback && latest.builderFeedback.msg).toBe(false);
    expect(latest.score).toEqual({ correct: 0, total: 1 });
    expect(xpFor('volume quiz').length).toBe(0);
    // The miss names the problem: the count is right, the arrangement is not.
    expect(/shape/i.test(latest.builderFeedback.msg), latest.builderFeedback.msg).toBe(true);
  });

  it('the Staircase built in place passes once', async () => {
    const c = await openStructure('Staircase');
    await place(c, STAIRCASE);
    await click(checkBtn(c));
    await click(checkBtn(c));
    expect(latest.builderFeedback && latest.builderFeedback.correct, latest.builderFeedback && latest.builderFeedback.msg).toBe(true);
    expect(latest.score).toEqual({ correct: 1, total: 1 });
    expect(xpFor('volume quiz').length).toBe(1);
  });

  it('the Staircase moved across the grid still passes', async () => {
    const c = await openStructure('Staircase');
    await place(c, translate(STAIRCASE, 3, 4));
    await click(checkBtn(c));
    expect(latest.builderFeedback && latest.builderFeedback.correct, latest.builderFeedback && latest.builderFeedback.msg).toBe(true);
  });

  it('the Staircase turned a quarter-turn on the table still passes', async () => {
    const c = await openStructure('Staircase');
    await place(c, turn(STAIRCASE, 2, 1));
    await click(checkBtn(c));
    expect(latest.builderFeedback && latest.builderFeedback.correct, latest.builderFeedback && latest.builderFeedback.msg).toBe(true);
  });

  it('a Bridge with its pillars pushed together is not the Bridge', async () => {
    const c = await openStructure('Bridge');
    // Same 22 cubes: one pillar moved under the middle of the deck.
    const wrong = BRIDGE.map((k) => (k.startsWith('4-') && !k.endsWith('-3') ? '2-' + k.slice(2) : k));
    expect(new Set(wrong).size).toBe(22);
    await place(c, wrong);
    await click(checkBtn(c));
    expect(latest.builderFeedback && latest.builderFeedback.correct).toBe(false);
    expect(xpFor('volume quiz').length).toBe(0);
  });

  it('the Bridge turned and moved passes', async () => {
    const c = await openStructure('Bridge');
    await place(c, turn(BRIDGE, 3, 2));
    await click(checkBtn(c));
    expect(latest.builderFeedback && latest.builderFeedback.correct, latest.builderFeedback && latest.builderFeedback.msg).toBe(true);
  });

  it('the challenge line asks for the structure, not "a shape with volume N"', async () => {
    const c = await openStructure('Staircase');
    const text = c.textContent.replace(/\s+/g, ' ');
    expect(text.includes('Build a shape with volume'), text.slice(0, 400)).toBe(false);
    expect(text.includes('Staircase (4 steps)')).toBe(true);
  });
});

describe('Random Vol still accepts any shape of the right volume', () => {
  it('any 7 cubes answer "build a shape with volume = 7"', async () => {
    const c = await mountVolume({
      mode: 'freeform', positions: [], score: { correct: 0, total: 0 }, streak: 0, badges: {},
      builderChallenge: { type: 'volume', answer: 7, shape: 'any' },
    });
    await place(c, ['0-0-0', '5-5-0', '2-3-0', '7-7-0', '1-6-0', '6-1-0', '3-3-0']);
    await click(checkBtn(c));
    expect(latest.builderFeedback && latest.builderFeedback.correct).toBe(true);
    expect(xpFor('volume quiz').length).toBe(1);
  });
});
