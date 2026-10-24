// 3D Volume Explorer, buildable challenge library: each card's description
// must agree with the structure it sets.
//  - Staircase said "V = 4 + 3 + 2 + 1 = 10 cubes" beside "V = 20 cubes"; the
//    model is two cubes deep (8 + 6 + 4 + 2 = 20).
//  - Bridge said "V = 6 + 6 + 5 = 17" beside "V = 22 cubes"; the deck is 5 x 2
//    (6 + 6 + 10 = 22).
//  - Tower said "Each level smaller than the last" over a 9, 4, 1, 1 stack.
// The wrong English is stored in ui_strings.js under the old keys, and the
// translation pipeline never updates an existing key's value, so the fix is a
// NEW key. This test feeds the tool the stored values for the old keys, the way
// the app's ctx.t does: a tool still reading an old key shows the old text.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = process.env.MATH_REVIEW2_VOLUME_SRC || 'stem_lab/stem_tool_volume.js';

// Copied from ui_strings.js (stem.volume.*) as stored on 2026-10-19.
const STORED = {
  'stem.volume.4_steps_of_decreasing_size_v_4_3_2_1_1': '4 steps of decreasing size. V = 4 + 3 + 2 + 1 = 10 cubes.',
  'stem.volume.two_pillars_connected_by_a_deck_v_6_6_': 'Two pillars connected by a deck — V = 6 + 6 + 5 = 17.',
  'stem.volume.tapering_tower_each_level_smaller_than': 'Tapering tower. Each level smaller than the last.',
  'stem.volume.a_3_tier_step_pyramid_v_9_4_1_14_cubes': 'A 3-tier step pyramid. V = 9 + 4 + 1 = 14 cubes.',
  'stem.volume.5_cube_plus_shape_1_layer_v_5': '5-cube plus shape, 1 layer. V = 5.',
};

const mounted = [];
let latest = null;

beforeEach(() => {
  resetStemLab();
  loadTool(SOURCE, 'volume');
  latest = null;
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
      toolData, setToolData, awardXP: function () {}, announceToSR: function () {},
      t: function (k, fb) { return Object.prototype.hasOwnProperty.call(STORED, k) ? STORED[k] : fb; },
    }));
  }
  const root = ReactDOMClient.createRoot(container);
  await React.act(async () => { root.render(React.createElement(Host)); });
  mounted.push({ root, container });
  return container;
}

async function click(el) {
  await React.act(async () => { el.click(); });
}

async function openLibrary() {
  const c = await mountVolume({ mode: 'freeform', positions: [], badges: {} });
  await click(c.querySelector('button[aria-label="Open buildable challenges library"]'));
  return c;
}

function cards(c) {
  return Array.from(c.querySelectorAll('button')).filter((b) => /^V = \d+ cubes$/.test((b.children[1] && b.children[1].textContent) || ''))
    .map((b) => ({ el: b, label: b.children[0].textContent, v: Number(/\d+/.exec(b.children[1].textContent)[0]), desc: b.children[2].textContent }));
}

describe('library card descriptions match their structures', () => {
  it('every card shows the volume of the structure it sets, and any sum in its text adds up to it', async () => {
    const c = await openLibrary();
    const list = cards(c);
    expect(list.length).toBe(8);
    for (const card of list) {
      // "V = a + b + ... = N": the terms add to N, and N is the card's volume.
      const m = /V = ([\d\s+]+?)\s*=\s*(\d+)/.exec(card.desc);
      if (m) {
        const sum = m[1].split('+').reduce((s, x) => s + Number(x.trim()), 0);
        expect(sum, card.label + ': ' + card.desc).toBe(Number(m[2]));
        expect(Number(m[2]), card.label + ': ' + card.desc).toBe(card.v);
      }
    }
    for (const label of list.map((x) => x.label)) {
      const again = cards(c).length ? cards(c) : cards(await openLibraryAgain(c));
      const card = again.find((x) => x.label === label);
      await click(card.el);
      const set = new Set(latest.builderChallenge.libraryPositions);
      expect(set.size, label + ' positions').toBe(card.v);
      expect(latest.builderChallenge.answer, label + ' answer').toBe(card.v);
    }
  });

  it('Staircase reads 8 + 6 + 4 + 2 = 20 and Bridge reads 6 + 6 + 10 = 22', async () => {
    const c = await openLibrary();
    const list = cards(c);
    const stair = list.find((x) => x.label.includes('Staircase'));
    const bridge = list.find((x) => x.label.includes('Bridge'));
    expect(stair.desc.includes('= 10'), stair.desc).toBe(false);
    expect(stair.desc.includes('8 + 6 + 4 + 2 = 20'), stair.desc).toBe(true);
    expect(bridge.desc.includes('17'), bridge.desc).toBe(false);
    expect(bridge.desc.includes('6 + 6 + 10 = 22'), bridge.desc).toBe(true);
  });

  it('Tower no longer claims every level is smaller than the last', async () => {
    const c = await openLibrary();
    const tower = cards(c).find((x) => x.label.includes('Tower'));
    expect(tower.desc.includes('Each level smaller than the last'), tower.desc).toBe(false);
    expect(tower.desc.includes('= 15'), tower.desc).toBe(true);
  });
});

async function openLibraryAgain(c) {
  await click(c.querySelector('button[aria-label="Open buildable challenges library"]'));
  return c;
}
