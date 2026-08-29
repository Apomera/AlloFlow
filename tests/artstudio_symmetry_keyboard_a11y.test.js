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
    fill: vi.fn(),
    fillRect: vi.fn(),
    globalAlpha: 1,
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
    expect(html).toContain('aria-describedby="artstudio-symmetry-keyboard-help"');
    expect(html).toContain('Shift+ArrowUp');
    expect(html).toContain('focus-visible:ring-4');
    expect(html).toContain('Dot stamp stroke mode');
    expect(html).toContain('Continuous freehand stroke mode');
    expect(html).toContain('Straight line stroke mode');
    expect(html).toContain('Pointer: drag for dots or freehand');
    expect(html).toContain('Rotational symmetry pattern');
    expect(html).toContain('Kaleidoscope reflected symmetry pattern');
    expect(html).toContain('Bilateral mirror symmetry pattern');
    expect(html).toContain('Custom symmetry fold count');
    expect(html).toContain('Symmetry brush opacity');
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

    const kaleidoscope = Array.from(host.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Kaleidoscope reflected symmetry pattern');
    await act(async () => {
      kaleidoscope.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    canvas = host.querySelector('#symmetryCanvas');
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

  it('keeps source and active public mirrors identical', () => {
    expect(fs.readFileSync(publicPath, 'utf8')).toBe(fs.readFileSync(sourcePath, 'utf8'));
  });
});
