// Math review 3: 3D Volume Explorer reads saved dimensions within the slider range.
// Before the 10-19 fix the "same volume" panel could set a side to 24 or 49, and that
// value stayed in saved tool state and in saved constructions. The slider (max 10)
// then sat at 10 while the model, readouts and challenges used 24. Decision (Aaron,
// 10-19): clamp l, w and h to the slider range when saved state loads, and change
// nothing else in a saved model.
// MATH_REVIEW3_VOLUME points the suite at another copy (mutation checks).
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = process.env.MATH_REVIEW3_VOLUME || 'stem_lab/stem_tool_volume.js';

const mounted = [];
let latest = null;

beforeEach(() => { resetStemLab(); loadTool(SOURCE, 'volume'); latest = null; });
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

// What the model is built from: the slider's reported value and the header Volume tile.
const sliderNow = (c, dim) => Number(c.querySelector('#volume-dimension-' + dim).getAttribute('aria-valuenow'));
function headerVolume(c) {
  const head = c.querySelector('[data-volume-command]');
  const label = Array.from(head.querySelectorAll('div')).find((d) => d.textContent === 'Volume');
  expect(label, 'header Volume tile').toBeTruthy();
  return label.previousElementSibling.textContent;
}

describe('saved dimensions above the slider maximum', () => {
  it('a saved 1 x 1 x 24 rod loads as 1 x 1 x 10', async () => {
    const c = await mountVolume({ mode: 'slider', shape: 'prism', dims: { l: 1, w: 1, h: 24 } });
    expect(sliderNow(c, 'h')).toBe(10);
    expect(sliderNow(c, 'l')).toBe(1);
    expect(headerVolume(c)).toBe('10');
  });

  it('each side is clamped on its own', async () => {
    const c = await mountVolume({ mode: 'slider', shape: 'prism', dims: { l: 49, w: 12, h: 3 } });
    expect([sliderNow(c, 'l'), sliderNow(c, 'w'), sliderNow(c, 'h')]).toEqual([10, 10, 3]);
    expect(headerVolume(c)).toBe('300');
  });

  it('in-range sides, half units included, are left exactly as saved', async () => {
    const c = await mountVolume({ mode: 'slider', shape: 'prism', dims: { l: 2.5, w: 3, h: 10 }, allowFractional: true });
    expect([sliderNow(c, 'l'), sliderNow(c, 'w'), sliderNow(c, 'h')]).toEqual([2.5, 3, 10]);
    expect(headerVolume(c)).toBe('75');
  });

  it('loading a saved construction clamps its sides and changes nothing else in it', async () => {
    const entry = { positions: ['0-0-0', '1-0-0'], dims: { l: 1, w: 2, h: 24 }, mode: 'slider', layerColors: {}, activeBuildLayer: 0, createdAt: 1 };
    const c = await mountVolume({ mode: 'slider', shape: 'prism', dims: { l: 3, w: 2, h: 2 }, showSaved: true, saved: { rod: JSON.parse(JSON.stringify(entry)) } });
    const load = c.querySelector('button[aria-label="Load rod"]');
    expect(load, 'Load rod').toBeTruthy();
    await React.act(async () => { load.click(); });
    expect([sliderNow(c, 'l'), sliderNow(c, 'w'), sliderNow(c, 'h')]).toEqual([1, 2, 10]);
    expect(headerVolume(c)).toBe('20');
    expect(latest.dims, 'the loaded state is in range').toEqual({ l: 1, w: 2, h: 10 });
    expect(latest.positions).toEqual(entry.positions);
    expect(latest.saved.rod, 'the saved construction itself is untouched').toEqual(entry);
  });
});
