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

function makeWheelContext() {
  return {
    arc: vi.fn(),
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    closePath: vi.fn(),
    drawImage: vi.fn(),
    fill: vi.fn(),
    fillText: vi.fn(),
    moveTo: vi.fn(),
    stroke: vi.fn(),
  };
}

describe('Art Studio color wheel accessibility', () => {
  let host;
  let root;
  let config;
  let announce;
  let context;
  let raf;
  let latest;

  beforeEach(() => {
    resetStemLab();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn(() => ({ matches: false })),
    });
    config = loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    announce = vi.fn();
    context = makeWheelContext();
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => context);
    raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
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
        artStudio: { tab: 'colorWheel', hue: 0, sat: 100, lit: 50, ...initial },
      });
      latest = toolData;
      return config.render(makeCtx({ toolData, setToolData, announceToSR: announce }));
    }
    await act(async () => {
      root.render(React.createElement(Harness));
      await Promise.resolve();
    });
  }

  async function press(canvas, init) {
    await act(async () => {
      canvas.dispatchEvent(new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        ...init,
      }));
      await Promise.resolve();
    });
  }

  it('renders instructions, selected harmony state, associated sliders, strong focus, and narrow reflow', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    const html = renderTool('artStudio', {
      artStudio: { tab: 'colorWheel', hue: 120, sat: 80, lit: 40, harmony: 'triadic' },
    });

    expect(html).toContain('flex flex-col lg:flex-row gap-4');
    expect(html).toContain('aria-label="Interactive color wheel. Hue 120 degrees, saturation 80 percent, lightness 40 percent."');
    expect(html).toContain('aria-describedby="artstudio-color-wheel-help"');
    expect(html).toContain('Shift+ArrowUp');
    expect(html).toContain('focus-visible:ring-4');
    expect(html).toContain('for="artstudio-color-hue"');
    expect(html).toContain('for="artstudio-color-sat"');
    expect(html).toContain('role="group" aria-labelledby="artstudio-color-harmony-label"');
    expect(html).toMatch(/aria-pressed="true"[^>]*>triadic/);
    expect(html).toContain('text-pink-700');
  });

  it('adjusts hue with coarse and fine keyboard steps and exposes the current value', async () => {
    await mount();
    const canvas = host.querySelector('canvas[aria-describedby="artstudio-color-wheel-help"]');
    canvas.focus();

    await press(canvas, { key: 'ArrowRight' });
    expect(latest.artStudio.hue).toBe(1);
    await press(canvas, { key: 'ArrowRight', shiftKey: true });
    expect(latest.artStudio.hue).toBe(11);
    await press(canvas, { key: 'Home' });
    expect(latest.artStudio.hue).toBe(0);
    await press(canvas, { key: 'End' });
    expect(latest.artStudio.hue).toBe(359);

    expect(announce).toHaveBeenCalledWith('Hue 1 degrees.');
    expect(announce).toHaveBeenCalledWith('Hue 11 degrees.');
    expect(canvas.getAttribute('aria-label')).toContain('Hue 359 degrees');
  });

  it('does not schedule the decorative wheel pulse when reduced motion is requested', async () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn(() => ({ matches: true })),
    });
    await mount();

    expect(raf).not.toHaveBeenCalled();
    expect(context.arc).toHaveBeenCalled();
  });

  it('keeps source and active public mirrors identical', () => {
    expect(fs.readFileSync(publicPath, 'utf8')).toBe(fs.readFileSync(sourcePath, 'utf8'));
  });
});
