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
    lineTo: vi.fn(),
    moveTo: vi.fn(),
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

  async function mount() {
    function Harness() {
      const [toolData, setToolData] = React.useState({
        artStudio: { tab: 'symmetry', symmetryFolds: 6, symBrushMode: 'solid' },
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

  it('keeps source and active public mirrors identical', () => {
    expect(fs.readFileSync(publicPath, 'utf8')).toBe(fs.readFileSync(sourcePath, 'utf8'));
  });
});
