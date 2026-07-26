// The volume predictor used to compare a live-adjusted guess against an actual
// volume that was printed directly above it AND inside the widget itself, so the
// outcome chip acted as a hot/cold meter you could hill-climb without doing any
// multiplication. It is now commit-then-check: arming a prediction masks every
// volume readout (visual and screen-reader), and the truth is captured at lock
// time so a later slider drag cannot rewrite what you were graded on.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_volume.js';

const mounted = [];

beforeEach(() => {
  resetStemLab();
  loadTool(SOURCE, 'volume');
});

// Each mount has to be torn down: leaving roots attached leaks duplicate element
// ids into document.body and later lookups resolve against the wrong tree.
afterEach(async () => {
  while (mounted.length) {
    const { root, container } = mounted.pop();
    await React.act(async () => root.unmount());
    container.remove();
  }
});

function buttonByText(container, text) {
  return Array.from(container.querySelectorAll('button'))
    .find((b) => (b.textContent || '').includes(text));
}

function setNativeValue(element, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(element, value);
}

// The tool mounts a canvas-backed formula animation; jsdom needs the same stubs
// the freeform-builder suite installs before it will render.
function stubCanvas() {
  window.HTMLCanvasElement.prototype.getContext = function() {
    const noop = function() {};
    return {
      scale: noop, fillRect: noop, save: noop, translate: noop, rotate: noop,
      beginPath: noop, moveTo: noop, lineTo: noop, closePath: noop,
      rect: noop, arc: noop, ellipse: noop, fill: noop, stroke: noop,
      restore: noop, fillText: noop, setTransform: noop, clearRect: noop,
      measureText: function() { return { width: 0 }; },
    };
  };
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

async function mountVolume(initialVolumeState) {
  stubCanvas();
  const cfg = window.StemLab._registry.volume;
  const container = document.createElement('div');
  document.body.appendChild(container);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  function Host() {
    const [toolData, setToolData] = React.useState({ _volume: initialVolumeState });
    return cfg.render(makeCtx({ toolData, setToolData }));
  }

  const root = ReactDOMClient.createRoot(container);
  await React.act(async () => {
    root.render(React.createElement(Host));
  });
  mounted.push({ root, container });
  return { container, root };
}

async function typeGuess(container, value) {
  const input = container.querySelector('#vp-guess');
  expect(input).not.toBeNull();
  await React.act(async () => {
    setNativeValue(input, value);
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}

describe('3D Volume Explorer — predictor commit-then-check', () => {
  it('shows volume normally until a prediction is armed', async () => {
    // 4 x 3 x 2 = 24. Masking is opt-in, so an untouched tool is unchanged.
    const { container } = await mountVolume({ mode: 'slider', dims: { l: 4, w: 3, h: 2 } });

    expect(container.textContent).toContain('24 unit cubes');
    expect(container.textContent).toContain('Area of Base');
    expect(buttonByText(container, 'Start a prediction')).toBeTruthy();
    expect(container.querySelector('#vp-guess')).toBeNull();
  });

  it('masks every volume readout while a prediction is armed', async () => {
    const { container } = await mountVolume({ mode: 'slider', dims: { l: 4, w: 3, h: 2 } });

    await React.act(async () => buttonByText(container, 'Start a prediction').click());

    // Total, the "Area of Base x Height" breakdown that reconstructs it, and the
    // substituted-formula result all have to go — masking only the total is not enough.
    expect(container.textContent).not.toContain('24 unit cubes');
    expect(container.textContent).not.toContain('Area of Base');
    expect(container.textContent).not.toContain('24 cubic units');
    expect(container.textContent).toContain('hidden until you lock your prediction');

    // Screen-reader parity: the slider label must not narrate what the eye cannot see.
    const lengthSlider = container.querySelector('#volume-dimension-l');
    expect(lengthSlider.getAttribute('aria-label')).toContain('hidden until you lock');
    expect(lengthSlider.getAttribute('aria-label')).not.toContain('volume 24');

    // Surface area stays live — it does not leak the volume.
    expect(container.textContent).toContain('SA = ');
  });

  it('reveals the comparison and restores the readouts once locked', async () => {
    const { container } = await mountVolume({ mode: 'slider', dims: { l: 4, w: 3, h: 2 } });

    await React.act(async () => buttonByText(container, 'Start a prediction').click());
    await typeGuess(container, '24');
    await React.act(async () => buttonByText(container, 'Lock prediction').click());

    expect(container.textContent).toContain('Spot on');
    expect(container.textContent).toContain('You said 24');
    expect(container.textContent).toContain('Actual 24');
    expect(container.textContent).toContain('24 unit cubes');
    expect(container.querySelector('#vp-guess')).toBeNull();
  });

  it('will not lock an empty or non-positive prediction', async () => {
    const { container } = await mountVolume({ mode: 'slider', dims: { l: 4, w: 3, h: 2 } });

    await React.act(async () => buttonByText(container, 'Start a prediction').click());
    expect(buttonByText(container, 'Lock prediction').disabled).toBe(true);

    await typeGuess(container, '0');
    expect(buttonByText(container, 'Lock prediction').disabled).toBe(true);

    await typeGuess(container, '20');
    expect(buttonByText(container, 'Lock prediction').disabled).toBe(false);
  });

  it('bands on relative error, not an absolute cube count', async () => {
    // 30 vs 24 is 25% off. The old absolute rule (|diff| < 8) called this a
    // ballpark hit; on a 24-cube prism that is a quarter of the whole solid.
    const small = await mountVolume({ mode: 'slider', dims: { l: 4, w: 3, h: 2 } });
    await React.act(async () => buttonByText(small.container, 'Start a prediction').click());
    await typeGuess(small.container, '30');
    await React.act(async () => buttonByText(small.container, 'Lock prediction').click());
    expect(small.container.textContent).toContain('Far off');
    expect(small.container.textContent).toContain('25% off');

    // 1005 vs 1000 is 0.5% off — excellent reasoning the old rule scored as a
    // near-miss purely because the prism was big.
    const large = await mountVolume({ mode: 'slider', dims: { l: 10, w: 10, h: 10 } });
    await React.act(async () => buttonByText(large.container, 'Start a prediction').click());
    await typeGuess(large.container, '1005');
    await React.act(async () => buttonByText(large.container, 'Lock prediction').click());
    expect(large.container.textContent).toContain('Spot on');
  });

  it('freezes the graded truth at lock time', async () => {
    const { container } = await mountVolume({ mode: 'slider', dims: { l: 4, w: 3, h: 2 } });

    await React.act(async () => buttonByText(container, 'Start a prediction').click());
    await typeGuess(container, '24');
    await React.act(async () => buttonByText(container, 'Lock prediction').click());
    expect(container.textContent).toContain('Actual 24');

    // Drag height 2 -> 5 after locking. The live volume becomes 60, but the
    // recorded comparison must still be the prism that was actually predicted.
    const heightSlider = container.querySelector('#volume-dimension-h');
    await React.act(async () => {
      setNativeValue(heightSlider, '5');
      heightSlider.dispatchEvent(new window.Event('change', { bubbles: true }));
    });

    expect(container.textContent).toContain('You said 24');
    expect(container.textContent).toContain('Actual 24');
    expect(container.textContent).not.toContain('Actual 60');
    expect(container.textContent).toContain('60 unit cubes');
  });

  it('logs every locked attempt, not just the flattering ones', async () => {
    const { container } = await mountVolume({ mode: 'slider', dims: { l: 4, w: 3, h: 2 } });

    await React.act(async () => buttonByText(container, 'Start a prediction').click());
    await typeGuess(container, '40');
    await React.act(async () => buttonByText(container, 'Lock prediction').click());

    await React.act(async () => buttonByText(container, 'New prediction').click());
    await typeGuess(container, '24');
    await React.act(async () => buttonByText(container, 'Lock prediction').click());

    const attempts = container.querySelectorAll('ul li');
    const text = Array.from(attempts).map((li) => li.textContent).join('|');
    expect(text).toContain('40 vs 24');
    expect(text).toContain('24 vs 24');
  });
});
