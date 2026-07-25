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

function makeStringContext() {
  return {
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
  };
}

describe('Art Studio String Art accessibility', () => {
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
    canvasContext = makeStringContext();
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
        artStudio: { tab: 'stringArt', ...initial },
      });
      latest = toolData;
      return config.render(makeCtx({ toolData, setToolData, announceToSR: announce }));
    }
    await act(async () => {
      root.render(React.createElement(Harness));
      await Promise.resolve();
    });
  }

  it('provides responsive layout, grouped shape state, associated sliders, presets, and descriptive output', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    const html = renderTool('artStudio', {
      artStudio: {
        tab: 'stringArt',
        strShape: 'triangle',
        strNails: 72,
        strMult: 37,
        strOpacity: 45,
        strRainbow: true,
      },
    });

    expect(html).toContain('grid grid-cols-1 lg:grid-cols-2');
    expect(html).toContain('role="group" aria-labelledby="artstudio-string-shape-label"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('for="artstudio-strNails"');
    expect(html).toContain('id="artstudio-strNails"');
    expect(html).toContain('aria-valuetext="72 nails"');
    expect(html).toContain('for="artstudio-strOpacity"');
    expect(html).toContain('aria-valuetext="45 percent opacity"');
    expect(html).toContain('aria-label="Use a single thread color" aria-pressed="true"');
    expect(html).toContain('role="group" aria-labelledby="artstudio-string-presets-label"');
    expect(html).toContain('aria-label="Load Cardioid string-art preset"');
    expect(html).toContain('aria-describedby="artstudio-string-description"');
    expect(html).toContain('aria-label="String-art output: 72 nails arranged on a triangle frame, connected with multiplier 37 using rainbow threads at 45 percent opacity."');
    expect(html).toContain('↻ Redraw');
    expect(html).not.toContain('id="stringCanvas" tabindex=');
  });

  it('updates the output from keyboard-operable controls and announces thread-mode changes', async () => {
    await mount({ strNails: 80, strRainbow: false });
    const nails = host.querySelector('#artstudio-strNails');
    const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

    await act(async () => {
      valueSetter.call(nails, '100');
      nails.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.strNails).toBe(100);
    expect(host.querySelector('#stringCanvas').getAttribute('aria-label')).toContain('100 nails');

    const rainbow = host.querySelector('button[aria-label="Use a rainbow thread progression"]');
    await act(async () => {
      rainbow.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.strRainbow).toBe(true);
    expect(announce).toHaveBeenCalledWith('Rainbow threads enabled.');
    expect(host.querySelector('button[aria-label="Use a single thread color"]').getAttribute('aria-pressed')).toBe('true');
  });

  it('draws the complete result without progressive animation for reduced motion', async () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn(() => ({ matches: true })),
    });
    await mount();

    expect(canvasContext.stroke).toHaveBeenCalledTimes(80);
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
    expect(announce).toHaveBeenCalledWith('String-art drawing complete.');
  });

  it('keeps source and active public mirrors identical', () => {
    expect(fs.readFileSync(publicPath, 'utf8')).toBe(fs.readFileSync(sourcePath, 'utf8'));
  });
});
