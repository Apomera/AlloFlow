import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_artstudio.js');
const publicPath = path.join(process.cwd(), 'desktop', 'web-app', 'public', 'stem_lab', 'stem_tool_artstudio.js');
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function makeCanvasContext() {
  return {
    arc: vi.fn(),
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    putImageData: vi.fn(),
    stroke: vi.fn(),
  };
}

describe('Art Studio Symmetry keyboard accessibility', () => {
  let host;
  let root;
  let announce;
  let context;
  let config;

  beforeEach(() => {
    resetStemLab();
    config = loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    announce = vi.fn();
    context = makeCanvasContext();
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => context);
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.restoreAllMocks();
  });

  async function mount(initial = {}) {
    function Harness() {
      const [toolData, setToolData] = React.useState({
        artStudio: { tab: 'symmetry', symmetryFolds: 6, symBrushMode: 'solid', ...initial },
      });
      return config.render(makeCtx({ toolData, setToolData, announceToSR: announce }));
    }
    await act(async () => {
      root.render(React.createElement(Harness));
      await Promise.resolve();
    });
  }

  it('renders instructions, declared shortcuts, visible focus styling, and control states', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    const html = renderTool('artStudio', {
      artStudio: {
        tab: 'symmetry',
        symmetryFolds: 8,
        symBrushMode: 'solid',
        symMirrorOnly: true,
      },
    });

    expect(html).toContain('hold Shift with an Arrow key to draw a line');
    expect(html).toContain('aria-describedby="artstudio-symmetry-touch-help artstudio-symmetry-keyboard-help"');
    expect(html).toContain('Shift+ArrowUp');
    expect(html).toContain('focus-visible:ring-4');
    expect(html).toContain('Dot stamp stroke mode');
    expect(html).toContain('Continuous freehand stroke mode');
    expect(html).toContain('Straight line stroke mode');
    expect(html).toContain('Symmetric continuous eraser mode');
    expect(html).toContain('Pointer: drag for dots, freehand, or symmetric erasing');
    expect(html).toContain('Rotational symmetry pattern');
    expect(html).toContain('Kaleidoscope reflected symmetry pattern');
    expect(html).toContain('Bilateral mirror symmetry pattern');
    expect(html).toContain('Custom symmetry fold count');
    expect(html).toContain('Symmetry brush opacity');
    expect(html).toContain('Symmetry stroke stabilization');
    expect(html).toContain('Use pen pressure for symmetry brush size');
    expect(html).toContain('Stabilization softens hand jitter');
    expect(html).toContain('Symmetry origin horizontal position');
    expect(html).toContain('Symmetry origin vertical position');
    expect(html).toContain('Normal symmetry brush blending');
    expect(html).toContain('Glow symmetry brush blending');
    expect(html).toContain('Pattern, fold, and origin changes affect new marks; existing artwork stays');
    expect(html).toContain('Pattern rotation, repeat variation &amp; canvas');
    expect(html).toContain('Symmetry pattern rotation');
    expect(html).toContain('Symmetry mirror axis angle');
    expect(html).toContain('Hue change per symmetry copy');
    expect(html).toContain('Brush size change per symmetry copy');
    expect(html).toContain('Opacity change per symmetry copy');
    expect(html).toContain('Show symmetry guides');
    expect(html).toContain('Transparent symmetry canvas background');
    expect(html).toContain('Undo symmetry change');
    expect(html).toContain('Control+Z');
    expect(html).toMatch(/aria-label="8 symmetry folds" aria-pressed="true"/);
    expect(html).toContain('aria-pressed="true"');
    expect(html).not.toContain('aria-label="Brush:"');
  });

  it('moves, stamps, draws a line, exposes a visible cursor, and announces actions', async () => {
    await mount();
    const canvas = host.querySelector('#symmetryCanvas');
    const cursor = host.querySelector('[data-symmetry-keyboard-cursor="true"]');
    canvas.focus();

    expect(cursor.style.display).toBe('block');
    await act(async () => {
      canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      canvas.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
      canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true, bubbles: true, cancelable: true }));
      await Promise.resolve();
    });

    expect(announce).toHaveBeenCalledWith('Symmetry cursor x 266, y 256.');
    expect(announce).toHaveBeenCalledWith('Placed symmetric marks at x 266, y 256.');
    expect(announce).toHaveBeenCalledWith('Drew to x 266, y 266.');
    expect(context.arc).toHaveBeenCalled();
    expect(context.lineTo).toHaveBeenCalled();
    expect(canvas.getAttribute('aria-label')).toContain('Keyboard cursor at x 266, y 266');
  });

  it('supports fine Alt movement and Home without pointer input', async () => {
    await mount();
    const canvas = host.querySelector('#symmetryCanvas');
    canvas.focus();

    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', altKey: true, bubbles: true, cancelable: true }));
    expect(announce).toHaveBeenCalledWith('Symmetry cursor x 255, y 256.');
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }));
    expect(announce).toHaveBeenCalledWith('Symmetry cursor x 256, y 256.');
  });

  it('supports continuous, dot, and straight-line pointer stroke modes', async () => {
    await mount({ symStrokeMode: 'freehand' });
    let canvas = host.querySelector('#symmetryCanvas');
    context.lineTo.mockClear();
    canvas.onpointerdown({ button: 0, clientX: 100, clientY: 120, pointerId: 1, preventDefault: vi.fn() });
    canvas.onpointermove({ clientX: 150, clientY: 170, pointerId: 1, preventDefault: vi.fn() });
    canvas.onpointerup({ clientX: 150, clientY: 170, pointerId: 1 });
    expect(context.lineTo).toHaveBeenCalled();
    expect(canvas._symDrawing).toBe(false);

    const buttons = Array.from(host.querySelectorAll('button'));
    const dots = buttons.find((button) => button.getAttribute('aria-label') === 'Dot stamp stroke mode');
    await act(async () => {
      dots.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    canvas = host.querySelector('#symmetryCanvas');
    context.arc.mockClear();
    context.lineTo.mockClear();
    canvas.onpointerdown({ button: 0, clientX: 80, clientY: 90, pointerId: 2, preventDefault: vi.fn() });
    canvas.onpointermove({ clientX: 120, clientY: 130, pointerId: 2, preventDefault: vi.fn() });
    canvas.onpointerup({ clientX: 120, clientY: 130, pointerId: 2 });
    expect(context.arc).toHaveBeenCalled();
    expect(context.lineTo).not.toHaveBeenCalled();

    const line = Array.from(host.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Straight line stroke mode');
    await act(async () => {
      line.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    canvas = host.querySelector('#symmetryCanvas');
    context.lineTo.mockClear();
    context.putImageData.mockClear();
    canvas.onpointerdown({ button: 0, clientX: 70, clientY: 80, pointerId: 3, preventDefault: vi.fn() });
    canvas.onpointermove({ clientX: 180, clientY: 190, pointerId: 3, preventDefault: vi.fn() });
    canvas.onpointerup({ clientX: 180, clientY: 190, pointerId: 3 });
    expect(context.putImageData).toHaveBeenCalled();
    expect(context.lineTo).toHaveBeenCalled();
  });

  it('draws distinct rotational, kaleidoscope, and bilateral copy layouts', async () => {
    await mount({ symStrokeMode: 'dots', symPatternMode: 'rotate', symmetryFolds: 6 });
    let canvas = host.querySelector('#symmetryCanvas');

    context.arc.mockClear();
    canvas.onpointerdown({ button: 0, clientX: 100, clientY: 120, pointerId: 10, preventDefault: vi.fn() });
    canvas.onpointerup({ clientX: 100, clientY: 120, pointerId: 10 });
    expect(context.arc).toHaveBeenCalledTimes(6);
    const originalCanvas = canvas;
    const originalHistoryLength = canvas._symUndo.length;

    const kaleidoscope = Array.from(host.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Kaleidoscope reflected symmetry pattern');
    await act(async () => {
      kaleidoscope.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    canvas = host.querySelector('#symmetryCanvas');
    expect(canvas).toBe(originalCanvas);
    expect(canvas._symUndo).toHaveLength(originalHistoryLength);
    context.arc.mockClear();
    canvas.onpointerdown({ button: 0, clientX: 100, clientY: 120, pointerId: 11, preventDefault: vi.fn() });
    canvas.onpointerup({ clientX: 100, clientY: 120, pointerId: 11 });
    expect(context.arc).toHaveBeenCalledTimes(12);

    const bilateral = Array.from(host.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Bilateral mirror symmetry pattern');
    await act(async () => {
      bilateral.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    canvas = host.querySelector('#symmetryCanvas');
    context.arc.mockClear();
    canvas.onpointerdown({ button: 0, clientX: 100, clientY: 120, pointerId: 12, preventDefault: vi.fn() });
    canvas.onpointerup({ clientX: 100, clientY: 120, pointerId: 12 });
    expect(context.arc).toHaveBeenCalledTimes(2);
    expect(canvas.getAttribute('aria-label')).toContain('bilateral mirror mode');
  });

  it('undoes and redoes canvas actions from shortcuts and can undo Clear', async () => {
    await mount({ symStrokeMode: 'dots', symPatternMode: 'rotate' });
    const canvas = host.querySelector('#symmetryCanvas');
    canvas.focus();

    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    expect(canvas._symUndo).toHaveLength(1);

    context.putImageData.mockClear();
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true }));
    expect(context.putImageData).toHaveBeenCalled();
    expect(canvas._symRedo).toHaveLength(1);
    expect(announce).toHaveBeenCalledWith('Undid the last symmetry change.');

    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true }));
    expect(canvas._symRedo).toHaveLength(0);
    expect(announce).toHaveBeenCalledWith('Redid the symmetry change.');

    const clear = Array.from(host.querySelectorAll('#symmetryFullscreenWorkspace button')).find((button) => button.textContent.includes('Clear'));
    clear.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(announce).toHaveBeenCalledWith('Cleared the symmetry artwork.');

    const undo = host.querySelector('button[aria-label="Undo symmetry change"]');
    undo.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(announce).toHaveBeenCalledWith('Undid the last symmetry change.');
  });

  it('supports custom fold counts and translucent brushes without fading Clear', async () => {
    await mount({ symmetryFolds: 24, symBrushOpacity: 0.35, symStrokeMode: 'dots', symPatternMode: 'rotate' });
    const canvas = host.querySelector('#symmetryCanvas');
    const foldControl = host.querySelector('input[aria-label="Custom symmetry fold count"]');
    const opacityControl = host.querySelector('input[aria-label="Symmetry brush opacity"]');

    expect(foldControl.value).toBe('24');
    expect(opacityControl.value).toBe('35');
    context.arc.mockClear();
    canvas.onpointerdown({ button: 0, clientX: 110, clientY: 130, pointerId: 20, preventDefault: vi.fn() });
    canvas.onpointerup({ clientX: 110, clientY: 130, pointerId: 20 });
    expect(context.arc).toHaveBeenCalledTimes(24);
    expect(context.globalAlpha).toBe(0.35);

    canvas._symClearAction();
    expect(context.globalAlpha).toBe(1);
  });

  it('draws around an off-center origin and supports additive Glow blending', async () => {
    await mount({
      symmetryFolds: 4,
      symCenterX: 0.25,
      symCenterY: 0.75,
      symBlendMode: 'glow',
      symStrokeMode: 'dots',
      symPatternMode: 'rotate',
    });
    const canvas = host.querySelector('#symmetryCanvas');
    const originX = host.querySelector('input[aria-label="Symmetry origin horizontal position"]');
    const originY = host.querySelector('input[aria-label="Symmetry origin vertical position"]');

    expect(originX.value).toBe('25');
    expect(originY.value).toBe('75');
    expect(canvas.getAttribute('aria-label')).toContain('Origin at 25 percent x, 75 percent y');
    context.arc.mockClear();
    canvas.onpointerdown({ button: 0, clientX: 200, clientY: 200, pointerId: 30, preventDefault: vi.fn() });
    canvas.onpointerup({ clientX: 200, clientY: 200, pointerId: 30 });

    expect(context.arc).toHaveBeenCalledTimes(4);
    expect(context.arc.mock.calls[1][0]).toBeCloseTo(312, 5);
    expect(context.arc.mock.calls[1][1]).toBeCloseTo(456, 5);
    expect(context.globalCompositeOperation).toBe('lighter');

    canvas._symClearAction();
    expect(context.globalCompositeOperation).toBe('source-over');
  });

  it('stabilizes freehand movement and consumes coalesced pointer samples', async () => {
    await mount({ symStrokeMode: 'freehand', symSmoothing: 0.5, symmetryFolds: 6 });
    const canvas = host.querySelector('#symmetryCanvas');
    const smoothing = host.querySelector('input[aria-label="Symmetry stroke stabilization"]');
    expect(smoothing.value).toBe('50');

    context.lineTo.mockClear();
    canvas.onpointerdown({ button: 0, clientX: 100, clientY: 100, pointerId: 40, preventDefault: vi.fn() });
    canvas.onpointermove({
      clientX: 140,
      clientY: 140,
      pointerId: 40,
      preventDefault: vi.fn(),
      getCoalescedEvents: () => [
        { clientX: 120, clientY: 120 },
        { clientX: 140, clientY: 140 },
      ],
    });
    canvas.onpointerup({ clientX: 140, clientY: 140, pointerId: 40 });

    expect(context.lineTo).toHaveBeenCalledTimes(18);
    expect(context.lineTo.mock.calls[0][0]).toBeCloseTo(110, 5);
    expect(context.lineTo.mock.calls[0][1]).toBeCloseTo(110, 5);
    expect(context.lineTo.mock.calls[6][0]).toBeCloseTo(125, 5);
    expect(context.lineTo.mock.calls[6][1]).toBeCloseTo(125, 5);
    expect(context.lineTo.mock.calls[12][0]).toBeCloseTo(132.5, 5);
    expect(context.lineTo.mock.calls[12][1]).toBeCloseTo(132.5, 5);
  });

  it('rotates repeat geometry and varies hue, size, and opacity per copy', async () => {
    await mount({
      symmetryFolds: 3,
      symStrokeMode: 'dots',
      symPatternMode: 'rotate',
      symHue: 10,
      symSat: 80,
      symLit: 50,
      brushSize: 2,
      symPhaseDeg: 90,
      symCopyHueStep: 30,
      symCopySizeStep: 10,
      symCopyOpacityStep: -10,
    });
    const canvas = host.querySelector('#symmetryCanvas');
    const fillStates = [];
    context.fill.mockImplementation(() => fillStates.push({ color: context.fillStyle, alpha: context.globalAlpha }));
    context.arc.mockClear();
    canvas.onpointerdown({ button: 0, clientX: 356, clientY: 256, pointerId: 44, preventDefault: vi.fn() });
    canvas.onpointerup({ clientX: 356, clientY: 256, pointerId: 44 });

    expect(context.arc).toHaveBeenCalledTimes(3);
    expect(context.arc.mock.calls[0][0]).toBeCloseTo(256, 5);
    expect(context.arc.mock.calls[0][1]).toBeCloseTo(356, 5);
    expect(context.arc.mock.calls.map((call) => call[2])).toEqual([2, 2.2, 2.4]);
    expect(fillStates).toEqual([
      { color: 'hsl(10,80%,50%)', alpha: 1 },
      { color: 'hsl(40,80%,50%)', alpha: 0.9 },
      { color: 'hsl(70,80%,50%)', alpha: 0.8 },
    ]);
  });

  it('reflects around a custom mirror axis and erases artwork without touching guides', async () => {
    await mount({ symStrokeMode: 'dots', symPatternMode: 'bilateral', symMirrorAxisDeg: 45 });
    let canvas = host.querySelector('#symmetryCanvas');
    context.arc.mockClear();
    canvas.onpointerdown({ button: 0, clientX: 356, clientY: 256, pointerId: 45, preventDefault: vi.fn() });
    canvas.onpointerup({ clientX: 356, clientY: 256, pointerId: 45 });
    expect(context.arc).toHaveBeenCalledTimes(2);
    expect(context.arc.mock.calls[1][0]).toBeCloseTo(256, 5);
    expect(context.arc.mock.calls[1][1]).toBeCloseTo(356, 5);
    expect(canvas.parentElement.querySelector('svg')).toBeTruthy();

    const eraser = host.querySelector('button[aria-label="Symmetric continuous eraser mode"]');
    await act(async () => {
      eraser.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    canvas = host.querySelector('#symmetryCanvas');
    canvas.onpointerdown({ button: 0, clientX: 320, clientY: 256, pointerId: 46, preventDefault: vi.fn() });
    canvas.onpointerup({ clientX: 330, clientY: 256, pointerId: 46 });
    expect(context.globalCompositeOperation).toBe('destination-out');

    context.clearRect.mockClear();
    canvas._symClearAction();
    expect(context.clearRect).toHaveBeenCalledWith(0, 0, 512, 512);
    expect(context.globalCompositeOperation).toBe('source-over');
    expect(canvas.parentElement.querySelector('svg')).toBeTruthy();
  });

  it('uses stylus pressure for brush width without changing mouse behavior', async () => {
    await mount({ symStrokeMode: 'dots', symPressureEnabled: true, brushSize: 4, symmetryFolds: 6 });
    const canvas = host.querySelector('#symmetryCanvas');
    const pressureToggle = host.querySelector('button[aria-label="Use pen pressure for symmetry brush size"]');
    expect(pressureToggle.getAttribute('aria-pressed')).toBe('true');

    context.arc.mockClear();
    canvas.onpointerdown({ button: 0, pointerType: 'pen', pressure: 0.2, clientX: 100, clientY: 100, pointerId: 41, preventDefault: vi.fn() });
    canvas.onpointerup({ clientX: 100, clientY: 100, pointerId: 41 });
    expect(context.arc.mock.calls[0][2]).toBeCloseTo(2.32, 5);

    context.arc.mockClear();
    canvas.onpointerdown({ button: 0, pointerType: 'pen', pressure: 1, clientX: 100, clientY: 100, pointerId: 42, preventDefault: vi.fn() });
    canvas.onpointerup({ clientX: 100, clientY: 100, pointerId: 42 });
    expect(context.arc.mock.calls[0][2]).toBeCloseTo(6, 5);

    context.arc.mockClear();
    canvas.onpointerdown({ button: 0, pointerType: 'mouse', pressure: 0.5, clientX: 100, clientY: 100, pointerId: 43, preventDefault: vi.fn() });
    canvas.onpointerup({ clientX: 100, clientY: 100, pointerId: 43 });
    expect(context.arc.mock.calls[0][2]).toBeCloseTo(4, 5);
  });

  it('keeps source and active public mirrors identical', () => {
    expect(fs.readFileSync(publicPath, 'utf8')).toBe(fs.readFileSync(sourcePath, 'utf8'));
  });
});
