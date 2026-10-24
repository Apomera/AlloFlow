// 3D Volume Explorer, "Same volume, different shape" panel stays on the sliders.
// The panel listed every whole-number factorization of the volume and let the
// student jump to one, so a 2 x 3 x 4 prism offered the 1 x 1 x 24 "rod" and a
// 7 x 7 x 1 slab offered 1 x 1 x 49. The sliders stop at 10, so the student
// landed on a prism the sliders cannot show or reach (the range input clamps to
// 10 while the model draws 24 or 49). Only shapes the sliders can make are
// offered now. Also: the panel is only ever empty for half-unit dimensions
// (the sliders cap V at 1000), which it misreported as "out of range (V <= 1000)".
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = process.env.MATH_REVIEW2_VOLUME_SRC || 'stem_lab/stem_tool_volume.js';
const SLIDER_MAX = 10;

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

// Rows read "<label>: L by W by H, surface area S".
function compareRows(c) {
  return Array.from(c.querySelectorAll('button[aria-label]'))
    .map((b) => ({ el: b, m: /^(.*): (\d+) by (\d+) by (\d+), surface area (\d+)$/.exec(b.getAttribute('aria-label')) }))
    .filter((r) => r.m)
    .map((r) => ({ el: r.el, label: r.m[1], dims: [Number(r.m[2]), Number(r.m[3]), Number(r.m[4])], sa: Number(r.m[5]) }));
}

const compareState = (dims) => ({ mode: 'slider', shape: 'prism', dims: dims, showCompare: true, badges: {} });

describe('same-volume comparison offers only slider-reachable prisms', () => {
  const cases = [
    { l: 2, w: 3, h: 4 },   // 24: 1 x 1 x 24 and 1 x 2 x 12 are off the sliders
    { l: 7, w: 7, h: 1 },   // 49: 1 x 1 x 49
    { l: 9, w: 8, h: 1 },   // 72: 1 x 1 x 72, 1 x 2 x 36 ...
    { l: 10, w: 10, h: 10 },
    { l: 1, w: 1, h: 7 },
  ];
  for (const dims of cases) {
    it(dims.l + ' x ' + dims.w + ' x ' + dims.h + ': every offered shape fits the sliders, and picking it lands there', async () => {
      const V = dims.l * dims.w * dims.h;
      const c = await mountVolume(compareState(dims));
      const rows = compareRows(c);
      expect(rows.length, 'compare rows').toBeGreaterThan(0);
      for (const r of rows) {
        expect(r.dims[0] * r.dims[1] * r.dims[2]).toBe(V);
        expect(Math.max.apply(null, r.dims), r.label + ' ' + r.dims.join('x')).toBeLessThanOrEqual(SLIDER_MAX);
      }
      // Jump to each offered shape: the sliders must show exactly that prism.
      for (const r of compareRows(c)) {
        const row = compareRows(c).find((x) => x.dims.join('x') === r.dims.join('x'));
        if (!row) continue; // the row set changes once the clicked shape becomes "Current"
        await click(row.el);
        for (const k of ['l', 'w', 'h']) {
          const slider = c.querySelector('#volume-dimension-' + k);
          expect(Number(latest.dims[k])).toBeLessThanOrEqual(SLIDER_MAX);
          expect(Number(slider.value), k + ' slider shows the model').toBe(Number(latest.dims[k]));
        }
      }
    });
  }

  it('2 x 3 x 4 still contrasts the most and least efficient reachable boxes', async () => {
    const c = await mountVolume(compareState({ l: 2, w: 3, h: 4 }));
    const rows = compareRows(c);
    const most = rows.find((r) => r.label.startsWith('Most efficient'));
    const least = rows.find((r) => r.label.startsWith('Least efficient'));
    // 2 x 3 x 4 (SA 52) is itself the most efficient whole-number box of 24.
    expect(rows.find((r) => r.label === 'Current').sa).toBe(52);
    expect(most).toBeUndefined();
    expect(least && least.dims.join('x')).toBe('1x3x8');
    expect(least.sa).toBe(70);
  });
});

describe('half-unit volumes', () => {
  it('a 2.5 x 3 x 3 prism (22.5) is not called "out of range"', async () => {
    const c = await mountVolume(Object.assign(compareState({ l: 2.5, w: 3, h: 3 }), { allowFractional: true }));
    const text = c.textContent.replace(/\s+/g, ' ');
    expect(text.includes('Try a smaller prism'), 'misreported as too large').toBe(false);
    expect(text.includes('works with whole-number sides from 1 to 10'), 'explains the whole-number requirement').toBe(true);
  });
});
