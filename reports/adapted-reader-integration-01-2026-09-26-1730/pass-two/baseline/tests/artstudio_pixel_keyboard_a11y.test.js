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

function canvasContext() {
  return {
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    stroke: vi.fn(),
    strokeRect: vi.fn(),
  };
}

describe('Art Studio Pixel Art keyboard accessibility', () => {
  let host;
  let root;
  let config;
  let announce;

  beforeEach(() => {
    resetStemLab();
    config = loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    announce = vi.fn();
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => canvasContext());
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.restoreAllMocks();
  });

  async function mount(initialState) {
    function Harness() {
      const [toolData, setToolData] = React.useState({
        artStudio: Object.assign({ tab: 'pixel', tutorialDismissed: true }, initialState),
      });
      return React.createElement(React.Fragment, null,
        config.render(makeCtx({ toolData, setToolData, announceToSR: announce })),
        React.createElement('output', { 'data-testid': 'pixel-state' }, JSON.stringify(toolData.artStudio.pixelData || {}))
      );
    }
    await act(async () => {
      root.render(React.createElement(Harness));
      await Promise.resolve();
    });
  }

  it('renders visible keyboard instructions, shortcuts, focus styling, and accurate tool states', () => {
    const html = (() => {
      resetStemLab();
      loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
      return renderTool('artStudio', {
        artStudio: { tab: 'pixel', pixelTool: 'eraser', activePalette: 'nature' },
      });
    })();

    expect(html).toContain('move the cell cursor with Arrow keys');
    expect(html).toContain('aria-describedby="artstudio-pixel-keyboard-help"');
    expect(html).toContain('aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Home End Enter Space"');
    expect(html).toContain('focus-visible:ring-4');
    expect(html).toMatch(/aria-label="Eraser" aria-pressed="true"/);
    expect(html).toContain('aria-label="Choose color: hue');
    expect(html).not.toContain('aria-label="HSL("');
  });

  it('moves the keyboard cursor, paints the selected cell, and announces both actions', async () => {
    await mount({ pixelGrid: 8, pixelTool: 'brush', pixelData: {} });
    const canvas = host.querySelector('canvas[aria-describedby="artstudio-pixel-keyboard-help"]');
    canvas.focus();

    await act(async () => {
      canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
      canvas.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
      await Promise.resolve();
    });

    expect(announce).toHaveBeenCalledWith('Pixel row 1, column 2.');
    expect(announce).toHaveBeenCalledWith('Pixel row 2, column 2.');
    expect(announce).toHaveBeenCalledWith('Painted row 2, column 2.');
    expect(host.querySelector('[data-testid="pixel-state"]').textContent).toContain('"1,1"');
    expect(document.activeElement).toBe(canvas);
  });

  it('supports Home, End, Enter, and erasing without requiring a pointer', async () => {
    await mount({
      pixelGrid: 8,
      pixelTool: 'eraser',
      pixelData: { '0,0': 'red', '7,7': 'blue' },
    });
    let canvas = host.querySelector('canvas[aria-describedby="artstudio-pixel-keyboard-help"]');
    canvas.focus();

    await act(async () => {
      canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
      canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(host.querySelector('[data-testid="pixel-state"]').textContent).not.toContain('"7,7"');

    canvas = host.querySelector('canvas[aria-describedby="artstudio-pixel-keyboard-help"]');
    canvas.focus();
    await act(async () => {
      canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }));
      canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(host.querySelector('[data-testid="pixel-state"]').textContent).toBe('{}');
    expect(announce).toHaveBeenCalledWith('Erased row 8, column 8.');
    expect(announce).toHaveBeenCalledWith('Erased row 1, column 1.');
  });

  it('keeps source and active public mirrors identical', () => {
    expect(fs.readFileSync(publicPath, 'utf8')).toBe(fs.readFileSync(sourcePath, 'utf8'));
  });
});
