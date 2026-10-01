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

function makeContext() {
  return {
    beginPath: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    restore: vi.fn(),
    rotate: vi.fn(),
    save: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
  };
}

describe('Art Studio Tessellation accessibility', () => {
  let host;
  let root;
  let config;
  let announce;
  let context;
  let latest;

  beforeEach(() => {
    resetStemLab();
    config = loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    announce = vi.fn();
    context = makeContext();
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
        artStudio: {
          tab: 'tessellation',
          tessShape: 'square',
          tessGrid: 4,
          tessRotation: 0,
          tessWarpAmt: 0,
          tessScheme: 'rainbow',
          tessClickData: {},
          ...initial,
        },
      });
      latest = toolData;
      return config.render(makeCtx({ toolData, setToolData, announceToSR: announce }));
    }
    await act(async () => {
      root.render(React.createElement(Harness));
      await Promise.resolve();
    });
  }

  it('renders responsive layout, grouped choices, associated sliders, instructions, and disclosure state', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    const html = renderTool('artStudio', {
      artStudio: {
        tab: 'tessellation',
        tessShape: 'square',
        tessGrid: 4,
        tessRotation: 15,
        tessWarpAmt: 10,
        tessScheme: 'cool',
      },
    });

    expect(html).toContain('grid grid-cols-1 lg:grid-cols-2 gap-4');
    expect(html).toContain('role="group" aria-labelledby="artstudio-tess-shape-label"');
    expect(html).toMatch(/aria-pressed="true"[^>]*>□ Square/);
    expect(html).toContain('for="artstudio-tessGrid"');
    expect(html).toContain('for="artstudio-tessRotation"');
    expect(html).toContain('role="group" aria-labelledby="artstudio-tess-scheme-label"');
    expect(html).toContain('aria-describedby="artstudio-tess-keyboard-help"');
    expect(html).toContain('Shift+ArrowUp');
    expect(html).toContain('aria-expanded="false" aria-controls="artstudio-tess-math"');
    expect(html).toContain('focus-visible:ring-4');
  });

  it('moves between visible tiles and cycles a tile color without pointer input', async () => {
    await mount();
    const canvas = host.querySelector('#tessCanvas');
    const cursor = host.querySelector('[data-tess-keyboard-cursor="true"]');
    const initialFillCount = context.fill.mock.calls.length;
    canvas.focus();

    expect(cursor.style.display).toBe('block');
    await act(async () => {
      canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      canvas.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
      await Promise.resolve();
    });

    expect(announce).toHaveBeenCalledWith(expect.stringMatching(/^Selected tile \d+ of \d+\.$/));
    expect(announce).toHaveBeenCalledWith(expect.stringMatching(/^Tile \d+ of \d+ changed to orange\.$/));
    expect(context.fill.mock.calls.length).toBeGreaterThan(initialFillCount);
    expect(Object.keys(latest.artStudio.tessClickData)).toHaveLength(1);
    expect(canvas.getAttribute('aria-label')).toMatch(/Selected tile \d+ of \d+, colored orange\./);
  });

  it('cycles the tile under a pointer click and exposes a non-color announcement', async () => {
    await mount();
    const canvas = host.querySelector('#tessCanvas');
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 512,
      height: 512,
      right: 512,
      bottom: 512,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    await act(async () => {
      canvas.dispatchEvent(new MouseEvent('click', { clientX: 256, clientY: 256, bubbles: true }));
      await Promise.resolve();
    });

    expect(Object.keys(latest.artStudio.tessClickData)).toHaveLength(1);
    expect(announce).toHaveBeenCalledWith(expect.stringMatching(/changed to orange\.$/));
  });

  it('keeps source and active public mirrors identical', () => {
    expect(fs.readFileSync(publicPath, 'utf8')).toBe(fs.readFileSync(sourcePath, 'utf8'));
  });
});
