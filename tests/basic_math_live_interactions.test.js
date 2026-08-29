import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const mounted = [];

function installCanvasStubs() {
  window.HTMLCanvasElement.prototype.getContext = function() {
    const noop = () => {};
    const gradient = () => ({ addColorStop: noop });
    return {
      scale: noop, setTransform: noop, resetTransform: noop,
      clearRect: noop, fillRect: noop, strokeRect: noop,
      save: noop, restore: noop, translate: noop, rotate: noop,
      beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop,
      rect: noop, arc: noop, ellipse: noop, quadraticCurveTo: noop, bezierCurveTo: noop,
      fill: noop, stroke: noop, clip: noop, setLineDash: noop,
      fillText: noop, strokeText: noop,
      measureText: () => ({ width: 0 }),
      createLinearGradient: gradient, createRadialGradient: gradient,
      createPattern: () => null,
    };
  };
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

beforeEach(() => {
  resetStemLab();
  document.body.innerHTML = '';
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  installCanvasStubs();
});

afterEach(async () => {
  while (mounted.length) {
    const { root, container } = mounted.pop();
    await React.act(async () => root.unmount());
    container.remove();
  }
});

async function mountTool(file, id, initialToolData) {
  const config = loadTool(file, id);
  const container = document.createElement('div');
  document.body.appendChild(container);
  let latest = initialToolData;

  function Host() {
    const [toolData, setToolData] = React.useState(initialToolData);
    latest = toolData;
    return config.render(makeCtx({ toolData, setToolData }));
  }

  const root = ReactDOMClient.createRoot(container);
  await React.act(async () => root.render(React.createElement(Host)));
  mounted.push({ root, container });
  return { container, getState: () => latest };
}

async function enterText(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await React.act(async () => {
    setter.call(input, value);
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}

describe('draft-safe basic-math numeric inputs', () => {
  it('preserves an intermediate minus sign and then commits a negative temperature', async () => {
    const runtime = await mountTool('stem_lab/stem_tool_unitconvert.js', 'unitConvert', {
      unitConvert: { tab: 'convert', category: 'temperature', value: 1, fromUnit: '\u00b0C', toUnit: '\u00b0F' },
    });
    const input = runtime.container.querySelector('[aria-label="Value to convert"]');

    expect(input).not.toBeNull();
    await enterText(input, '-');
    expect(input.value).toBe('-');
    expect(runtime.getState().unitConvert.value).toBe(1);
    expect(runtime.getState().unitConvert.valueDraft).toBe('-');

    await enterText(input, '-40');
    expect(input.value).toBe('-40');
    expect(runtime.getState().unitConvert.value).toBe(-40);
    expect(runtime.container.textContent).toContain('-40');
    expect(runtime.container.textContent).not.toContain('Finish entering a number');
  });

  it('keeps the last valid number-line range while a negative bound is incomplete', async () => {
    const runtime = await mountTool('stem_lab/stem_tool_numberline.js', 'numberline', {
      _numberline: { tab: 'explore', range: { min: 0, max: 20 } },
    });
    const minimum = runtime.container.querySelector('[aria-label="Minimum value"]');

    expect(minimum).not.toBeNull();
    await enterText(minimum, '-');
    expect(minimum.value).toBe('-');
    expect(runtime.getState()._numberline.range).toEqual({ min: 0, max: 20 });

    await enterText(minimum, '-10');
    expect(minimum.value).toBe('-10');
    expect(runtime.getState()._numberline.range).toEqual({ min: -10, max: 20 });
  });

  it('lets learners repair an inverted range by editing the other bound', async () => {
    const runtime = await mountTool('stem_lab/stem_tool_numberline.js', 'numberline', {
      _numberline: { tab: 'explore', range: { min: 0, max: 20 } },
    });
    const minimum = runtime.container.querySelector('[aria-label="Minimum value"]');
    const maximum = runtime.container.querySelector('[aria-label="Maximum value"]');

    await enterText(minimum, '30');
    expect(runtime.getState()._numberline.range).toEqual({ min: 0, max: 20 });
    expect(runtime.container.textContent).toContain('Minimum value must be less than maximum value');

    await enterText(maximum, '40');
    expect(runtime.getState()._numberline.range).toEqual({ min: 30, max: 40 });
    expect(runtime.container.textContent).not.toContain('Minimum value must be less than maximum value');
  });
});

describe('normalized fraction answers', () => {
  it('accepts equivalent mixed, improper, decimal, and signed forms', () => {
    loadTool('stem_lab/stem_tool_fractions.js', 'fractions');
    const core = window.__FractionsCore;

    expect(core.evaluateRationalAnswer('1 2/4', { n: 3, d: 2 })).toMatchObject({ valid: true, correct: true });
    expect(core.evaluateRationalAnswer('6/4', { n: 3, d: 2 })).toMatchObject({ valid: true, correct: true });
    expect(core.evaluateRationalAnswer('0.5', { n: 1, d: 2 })).toMatchObject({ valid: true, correct: true });
    expect(core.parseRationalAnswer('-1 1/2')).toMatchObject({ valid: true, n: -3, d: 2 });
    expect(core.parseRationalAnswer('\u22123\u20444')).toMatchObject({ valid: true, n: -3, d: 4 });
  });

  it('rejects malformed and zero-denominator responses', () => {
    loadTool('stem_lab/stem_tool_fractions.js', 'fractions');
    const core = window.__FractionsCore;

    expect(core.parseRationalAnswer('1/0')).toMatchObject({ valid: false, reason: 'zero-denominator' });
    expect(core.parseRationalAnswer('1 1/0')).toMatchObject({ valid: false, reason: 'zero-denominator' });
    expect(core.parseRationalAnswer('12abc')).toMatchObject({ valid: false, reason: 'format' });
  });

  it('uses the normalized evaluator in the mounted story checker', async () => {
    const runtime = await mountTool('stem_lab/stem_tool_fractions.js', 'fractions', {
      _fractions: { navMode: 'apply', tab: 'story', storyCh: 4, storyAnswer: '', storyFeedback: null },
    });
    const input = runtime.container.querySelector('[aria-label="Story answer"]');
    const submit = Array.from(runtime.container.querySelectorAll('button')).find((button) => button.textContent === 'Submit');

    expect(input).not.toBeNull();
    expect(submit).toBeTruthy();
    await enterText(input, '3 6/16');
    await React.act(async () => submit.click());

    expect(runtime.getState()._fractions.storyFeedback.correct).toBe(true);
    expect(runtime.container.textContent).toContain('Equivalent value; it simplifies to 3 3/8.');
  });
});
