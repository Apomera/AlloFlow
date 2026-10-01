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
const originalMatchMedia = window.matchMedia;
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function makeFractalContext() {
  return {
    createImageData: vi.fn((width, height) => ({
      data: new Uint8ClampedArray(width * height * 4),
    })),
    putImageData: vi.fn(),
    fillRect: vi.fn(),
  };
}

describe('Art Studio Fractal Explorer accessibility', () => {
  let host;
  let root;
  let config;
  let announce;
  let latest;
  let canvasContext;

  beforeEach(() => {
    resetStemLab();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn(() => ({ matches: false })),
    });
    canvasContext = makeFractalContext();
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvasContext);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    config = loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    announce = vi.fn();
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.restoreAllMocks();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    });
  });

  async function mount(initial = {}) {
    function Harness() {
      const [toolData, setToolData] = React.useState({
        artStudio: { tab: 'fractal', ...initial },
      });
      latest = toolData;
      return config.render(makeCtx({ toolData, setToolData, announceToSR: announce }));
    }
    await act(async () => {
      root.render(React.createElement(Harness));
      await Promise.resolve();
    });
  }

  it('provides responsive layout, grouped states, associated sliders, disclosure semantics, and a descriptive output', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    const html = renderTool('artStudio', {
      artStudio: {
        tab: 'fractal',
        fractalType: 'burningShip',
        fractalIter: 300,
        fractalZoom: 80,
        fractalPanX: 36,
        fractalPanY: -4,
        fractalColor: 'ocean',
        showFractalInfo: true,
      },
    });

    expect(html).toContain('grid grid-cols-1 lg:grid-cols-2');
    expect(html).toContain('role="group" aria-labelledby="artstudio-fractal-type-label"');
    expect(html).toContain('role="group" aria-labelledby="artstudio-fractal-color-label"');
    expect(html).toContain('role="group" aria-labelledby="artstudio-fractal-presets-label"');
    expect(html).toContain('for="artstudio-fractalPanX"');
    expect(html).toContain('id="artstudio-fractalPanX"');
    expect(html).toContain('aria-valuetext="36 horizontal units"');
    expect(html).toContain('for="artstudio-fractalPanY"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('aria-controls="artstudio-fractal-info"');
    expect(html).toContain('role="region" aria-labelledby="artstudio-fractal-info-toggle"');
    expect(html).toContain('aria-describedby="artstudio-fractal-instructions"');
    expect(html).toContain('aria-label="Burning Ship fractal: an asymmetric ship-like boundary with flame-shaped repeating detail. 300 maximum iterations, 80 times zoom, horizontal pan 36, vertical pan -4, ocean color scheme."');
    expect(html).not.toContain('id="fractalCanvas" tabindex=');
  });

  it('offers keyboard-operable pan and zoom controls and announces reset', async () => {
    await mount({ fractalPanX: 0, fractalZoom: 1 });
    const pan = host.querySelector('#artstudio-fractalPanX');
    const zoom = host.querySelector('#artstudio-fractalZoom');
    const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

    await act(async () => {
      valueSetter.call(pan, '74');
      pan.dispatchEvent(new Event('input', { bubbles: true }));
      valueSetter.call(zoom, '120');
      zoom.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });

    expect(latest.artStudio.fractalPanX).toBe(74);
    expect(latest.artStudio.fractalZoom).toBe(120);
    expect(host.querySelector('#fractalCanvas').getAttribute('aria-label')).toContain('120 times zoom, horizontal pan 74');

    const reset = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Reset View'));
    await act(async () => {
      reset.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.fractalPanX).toBe(0);
    expect(latest.artStudio.fractalZoom).toBe(1);
    expect(announce).toHaveBeenCalledWith('Fractal view reset to one times zoom and centered pan.');
  });

  it('suppresses progressive canvas painting when reduced motion is requested', async () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn(() => ({ matches: true })),
    });
    await mount();

    expect(window.requestAnimationFrame).toHaveBeenCalled();
    expect(canvasContext.putImageData).not.toHaveBeenCalled();
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain('var batchSize = reducedMotion ? total : 500;');
    expect(source).toContain("if (endRow === H) ctx.putImageData(imgData, 0, 0);");
  });

  it('keeps source and active public mirrors identical', () => {
    expect(fs.readFileSync(publicPath, 'utf8')).toBe(fs.readFileSync(sourcePath, 'utf8'));
  });
});
