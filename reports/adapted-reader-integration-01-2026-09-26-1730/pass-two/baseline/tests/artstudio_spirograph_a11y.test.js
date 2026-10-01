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

function makeSpiroContext() {
  return {
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
  };
}

describe('Art Studio Spirograph accessibility', () => {
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
    canvasContext = makeSpiroContext();
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
        artStudio: { tab: 'spirograph', ...initial },
      });
      latest = toolData;
      return config.render(makeCtx({ toolData, setToolData, announceToSR: announce }));
    }
    await act(async () => {
      root.render(React.createElement(Harness));
      await Promise.resolve();
    });
  }

  it('provides responsive layout, associated sliders, grouped presets, state, and a descriptive output', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    const html = renderTool('artStudio', {
      artStudio: {
        tab: 'spirograph',
        spiroR: 150,
        spiror: 50,
        spirop: 25,
        spiroSpeed: 12,
        spiroRainbow: true,
      },
    });

    expect(html).toContain('grid grid-cols-1 lg:grid-cols-2');
    expect(html).toContain('for="artstudio-spiroR"');
    expect(html).toContain('id="artstudio-spiroR"');
    expect(html).toContain('for="artstudio-spiroSpeed"');
    expect(html).toContain('aria-valuetext="12 drawing steps per frame"');
    expect(html).toContain('aria-label="Use a single color for the spirograph" aria-pressed="true"');
    expect(html).toContain('role="group" aria-labelledby="artstudio-spiro-presets-label"');
    expect(html).toContain('aria-label="Load Star spirograph preset"');
    expect(html).toContain('aria-describedby="artstudio-spiro-description"');
    expect(html).toContain('aria-label="Spirograph output: a rainbow hypotrochoid with outer radius 150, inner radius 50, and pen offset 25."');
    expect(html).toContain('↻ Redraw');
    expect(html).not.toContain('id="spiroCanvas" tabindex=');
  });

  it('updates the output from keyboard-operable controls and announces color-mode changes', async () => {
    await mount({ spiroR: 120, spiroRainbow: false });
    const radius = host.querySelector('#artstudio-spiroR');
    const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

    await act(async () => {
      valueSetter.call(radius, '180');
      radius.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.spiroR).toBe(180);
    expect(host.querySelector('#spiroCanvas').getAttribute('aria-label')).toContain('outer radius 180');

    const rainbow = host.querySelector('button[aria-label="Use a rainbow color progression for the spirograph"]');
    await act(async () => {
      rainbow.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.spiroRainbow).toBe(true);
    expect(announce).toHaveBeenCalledWith('Rainbow spirograph enabled.');
    expect(host.querySelector('button[aria-label="Use a single color for the spirograph"]').getAttribute('aria-pressed')).toBe('true');
  });

  it('draws the complete result without progressive animation for reduced motion', async () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn(() => ({ matches: true })),
    });
    await mount();

    expect(canvasContext.stroke).toHaveBeenCalled();
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
    expect(announce).toHaveBeenCalledWith('Spirograph drawing complete.');
  });

  it('keeps source and active public mirrors identical', () => {
    expect(fs.readFileSync(publicPath, 'utf8')).toBe(fs.readFileSync(sourcePath, 'utf8'));
  });
});
