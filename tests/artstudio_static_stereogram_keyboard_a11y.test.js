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

function makeDepthContext() {
  return {
    arc: vi.fn(),
    beginPath: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(400 * 400 * 4) })),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    stroke: vi.fn(),
  };
}

function makeOutputContext() {
  return {
    createImageData: vi.fn((width, height) => ({
      data: new Uint8ClampedArray(width * height * 4),
      width,
      height,
    })),
    putImageData: vi.fn(),
  };
}

describe('Art Studio static stereogram accessibility', () => {
  let host;
  let root;
  let announce;
  let depthContext;
  let outputContext;
  let config;

  beforeEach(() => {
    resetStemLab();
    config = loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    announce = vi.fn();
    depthContext = makeDepthContext();
    outputContext = makeOutputContext();
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(function () {
      return this.id === 'depthMapCanvas' ? depthContext : outputContext;
    });
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
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
        artStudio: {
          tab: 'stereogram',
          stereoAnimMode: 'static',
          stereoDepth: 'near',
          stereoPattern: 'bw',
        },
      });
      return config.render(makeCtx({ toolData, setToolData, announceToSR: announce }));
    }
    await act(async () => {
      root.render(React.createElement(Harness));
      await Promise.resolve();
    });
  }

  it('renders grouped controls, selected states, associated labels, reflow, and disclosure semantics', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    const html = renderTool('artStudio', {
      artStudio: {
        tab: 'stereogram',
        stereoAnimMode: 'static',
        stereoDepth: 'mid',
        stereoPattern: 'color',
        stereoPreset: 'sphere',
        showStereoInfo: true,
      },
    });

    expect(html).toContain('role="group" aria-label="Stereogram mode"');
    expect(html).toContain('grid grid-cols-1 lg:grid-cols-2');
    expect(html).toContain('aria-labelledby="artstudio-stereo-depth-brush-label"');
    expect(html).toContain('aria-labelledby="artstudio-stereo-pattern-label"');
    expect(html).toContain('id="artstudio-stereo-brush-size"');
    expect(html).toContain('for="artstudio-stereoStrength"');
    expect(html).toContain('aria-label="Use Sphere depth-map preset" aria-pressed="true"');
    expect(html).toContain('aria-expanded="true" aria-controls="artstudio-stereogram-science"');
    expect(html).toContain('id="artstudio-stereogram-science"');
  });

  it('exposes instructions, shortcuts, a strong focus style, and described output', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    const html = renderTool('artStudio', {
      artStudio: { tab: 'stereogram', stereoAnimMode: 'static' },
    });

    expect(html).toContain('hold Shift with an Arrow key to draw');
    expect(html).toContain('aria-describedby="artstudio-depth-map-legend artstudio-depth-map-touch-help artstudio-depth-map-keyboard-help"');
    expect(html).toContain('Shift+ArrowUp');
    expect(html).toContain('focus-visible:ring-4');
    expect(html).toContain('aria-describedby="artstudio-stereogram-output-help"');
  });

  it('moves, stamps, draws, exposes a visible cursor, and announces keyboard actions', async () => {
    await mount();
    const canvas = host.querySelector('#depthMapCanvas');
    const cursor = host.querySelector('[data-depth-keyboard-cursor="true"]');
    canvas.focus();

    expect(cursor.style.display).toBe('block');
    await act(async () => {
      canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      canvas.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
      canvas.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      }));
      await Promise.resolve();
    });

    expect(announce).toHaveBeenCalledWith('Depth cursor x 210, y 200.');
    expect(announce).toHaveBeenCalledWith('Stamped near depth at x 210, y 200.');
    expect(announce).toHaveBeenCalledWith('Drew depth to x 210, y 210.');
    expect(depthContext.arc).toHaveBeenCalled();
    expect(depthContext.lineTo).toHaveBeenCalledWith(210, 210);
    expect(depthContext.stroke).toHaveBeenCalled();
    expect(canvas.getAttribute('aria-label')).toContain('Keyboard cursor at x 210, y 210');
  });

  it('supports one-pixel movement and returning to center without pointer input', async () => {
    await mount();
    const canvas = host.querySelector('#depthMapCanvas');
    canvas.focus();

    canvas.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'ArrowLeft',
      altKey: true,
      bubbles: true,
      cancelable: true,
    }));
    expect(announce).toHaveBeenCalledWith('Depth cursor x 199, y 200.');
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }));
    expect(announce).toHaveBeenCalledWith('Depth cursor x 200, y 200.');
  });

  it('keeps source and active public mirrors identical', () => {
    expect(fs.readFileSync(publicPath, 'utf8')).toBe(fs.readFileSync(sourcePath, 'utf8'));
  });
});
