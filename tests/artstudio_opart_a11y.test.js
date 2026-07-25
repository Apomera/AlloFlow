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

function makeOpContext() {
  return {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    save: vi.fn(),
    ellipse: vi.fn(),
    stroke: vi.fn(),
    restore: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    closePath: vi.fn(),
  };
}

describe('Art Studio Op Art accessibility', () => {
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
    canvasContext = makeOpContext();
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvasContext);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
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
        artStudio: { tab: 'opArt', ...initial },
      });
      latest = toolData;
      return config.render(makeCtx({ toolData, setToolData, announceToSR: announce }));
    }
    await act(async () => {
      root.render(React.createElement(Harness));
      await Promise.resolve();
    });
  }

  it('provides responsive layout, grouped state, associated sliders, disclosure semantics, and descriptive output', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    const html = renderTool('artStudio', {
      artStudio: {
        tab: 'opArt',
        opStyle: 'moire',
        opSpeed: 6,
        opDensity: 40,
        opHueA: 200,
        opHueB: 30,
        opPaused: true,
        showOpInfo: true,
      },
    });

    expect(html).toContain('grid grid-cols-1 lg:grid-cols-2');
    expect(html).toContain('role="group" aria-labelledby="artstudio-op-style-label"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('for="artstudio-opSpeed"');
    expect(html).toContain('id="artstudio-opSpeed"');
    expect(html).toContain('aria-valuetext="6 animation speed"');
    expect(html).toContain('for="artstudio-opHueA"');
    expect(html).toContain('aria-valuetext="200 degrees hue"');
    expect(html).toContain('aria-label="Resume Op Art animation" aria-describedby="artstudio-op-motion-status"');
    expect(html).toContain('Animation paused.');
    expect(html).toContain('role="group" aria-labelledby="artstudio-op-presets-label"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('aria-controls="artstudio-op-info"');
    expect(html).toContain('role="region" aria-labelledby="artstudio-op-info-toggle"');
    expect(html).toContain('aria-describedby="artstudio-op-motion-status"');
    expect(html).toContain('aria-label="Op Art output: overlapping Moire line fields at density 40 and speed 6, paused."');
    expect(html).not.toContain('id="opArtCanvas" tabindex=');
  });

  it('updates the output from keyboard-operable style and density controls', async () => {
    await mount({ opStyle: 'concentric', opDensity: 20, opPaused: true });
    const density = host.querySelector('#artstudio-opDensity');
    const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

    await act(async () => {
      valueSetter.call(density, '32');
      density.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.opDensity).toBe(32);
    expect(host.querySelector('#opArtCanvas').getAttribute('aria-label')).toContain('density 32');

    const checker = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Checker'));
    await act(async () => {
      checker.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.opStyle).toBe('checkerboard');
    expect(checker.getAttribute('aria-pressed')).toBe('true');
    expect(announce).toHaveBeenCalledWith(expect.stringContaining('Checker'));
  });

  it('starts paused for reduced motion and resumes only after explicit activation', async () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn(() => ({ matches: true })),
    });
    await mount();

    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
    expect(host.querySelector('#opArtCanvas').getAttribute('aria-label')).toContain('paused');
    const resume = host.querySelector('button[aria-label="Resume Op Art animation"]');

    await act(async () => {
      resume.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.opPaused).toBe(false);
    expect(window.requestAnimationFrame).toHaveBeenCalled();
    expect(host.querySelector('button[aria-label="Pause Op Art animation"]')).not.toBeNull();
    expect(announce).toHaveBeenCalledWith('Op Art animation resumed.');

    const pause = host.querySelector('button[aria-label="Pause Op Art animation"]');
    await act(async () => {
      pause.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.opPaused).toBe(true);
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
    expect(announce).toHaveBeenCalledWith('Op Art animation paused.');
  });

  it('keeps source and active public mirrors identical', () => {
    expect(fs.readFileSync(publicPath, 'utf8')).toBe(fs.readFileSync(sourcePath, 'utf8'));
  });
});
