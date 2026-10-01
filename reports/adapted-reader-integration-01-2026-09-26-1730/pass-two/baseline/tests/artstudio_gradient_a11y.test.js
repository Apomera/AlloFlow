import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_artstudio.js');
const publicPath = path.join(process.cwd(), 'desktop', 'web-app', 'public', 'stem_lab', 'stem_tool_artstudio.js');
const originalMatchMedia = window.matchMedia;
const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Art Studio Gradient Lab accessibility', () => {
  let host;
  let root;
  let config;
  let announce;
  let latest;
  let clipboard;

  beforeEach(() => {
    resetStemLab();
    Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: vi.fn(() => ({ matches: false })) });
    const gradient = { addColorStop: vi.fn() };
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      createLinearGradient: vi.fn(() => gradient),
      createRadialGradient: vi.fn(() => gradient),
      fillRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
    });
    clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: clipboard });
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
    Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: originalMatchMedia });
    if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard);
    else delete navigator.clipboard;
  });

  async function mount(initial = {}) {
    function Harness() {
      const [toolData, setToolData] = React.useState({ artStudio: { tab: 'gradient', ...initial } });
      latest = toolData;
      return config.render(makeCtx({ toolData, setToolData, announceToSR: announce }));
    }
    await act(async () => {
      root.render(React.createElement(Harness));
      await Promise.resolve();
    });
  }

  it('provides responsive grouped controls, visible stop labels, disclosure semantics, and descriptive output', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    const html = renderTool('artStudio', {
      artStudio: {
        tab: 'gradient',
        gradType: 'linear',
        gradAngle: 135,
        gradBlend: 'hard',
        gradStops: [{ hue: 330, pos: 0 }, { hue: 180, pos: 50 }, { hue: 45, pos: 100 }],
        showGradInfo: true,
      },
    });

    expect(html).toContain('grid grid-cols-1 lg:grid-cols-2');
    expect(html).toContain('role="group" aria-labelledby="artstudio-gradient-type-label"');
    expect(html).toContain('role="group" aria-labelledby="artstudio-gradient-blend-label"');
    expect(html).toContain('for="artstudio-grad-angle"');
    expect(html).toContain('aria-valuetext="135 degrees"');
    expect(html).toContain('role="group" aria-labelledby="artstudio-gradient-stops-label"');
    expect(html).toContain('Color stop 2, hue 180 degrees, position 50 percent');
    expect(html).toContain('for="artstudio-grad-stop-1-hue"');
    expect(html).toContain('for="artstudio-grad-stop-1-position"');
    expect(html).toContain('aria-label="Remove color stop 2"');
    expect(html).toContain('role="group" aria-labelledby="artstudio-gradient-presets-label"');
    expect(html).toContain('aria-label="Copy gradient CSS to clipboard"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('role="region" aria-labelledby="artstudio-gradient-info-toggle"');
    expect(html).toContain('aria-label="Gradient output: linear at 135 degrees, hard blend, with 3 color stops: hue 330 at 0 percent, hue 180 at 50 percent, hue 45 at 100 percent."');
    expect(html).not.toContain('id="gradientCanvas" tabindex=');
  });

  it('adds and edits stops without reordering the focused row', async () => {
    await mount({ gradStops: [{ hue: 330, pos: 0 }, { hue: 45, pos: 100 }] });
    const add = host.querySelector('button[aria-label="Add color stop"]');
    await act(async () => {
      add.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.gradStops).toHaveLength(3);
    expect(announce).toHaveBeenCalledWith('Color stop added. 3 stops total.');

    const position = host.querySelector('#artstudio-grad-stop-1-position');
    const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    await act(async () => {
      valueSetter.call(position, '60');
      position.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.gradStops[1].pos).toBe(60);
    expect(host.querySelector('#artstudio-grad-stop-1-position')).not.toBeNull();
    expect(host.querySelector('#gradientCanvas').getAttribute('aria-label')).toContain('at 60 percent');
  });

  it('announces successful CSS copy status', async () => {
    await mount();
    const copy = host.querySelector('button[aria-label="Copy gradient CSS to clipboard"]');
    await act(async () => {
      copy.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('linear-gradient'));
    expect(announce).toHaveBeenCalledWith('Gradient CSS copied to the clipboard.');
  });

  it('keeps source and active public mirrors identical', () => {
    expect(fs.readFileSync(publicPath, 'utf8')).toBe(fs.readFileSync(sourcePath, 'utf8'));
  });
});
