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

function makeContext() {
  return {
    arc: vi.fn(),
    beginPath: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
  };
}

describe('Art Studio Generative Art accessibility', () => {
  let host;
  let root;
  let config;
  let announce;
  let context;
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
    context = makeContext();
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => context);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
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
        artStudio: { tab: 'generative', genStyle: 'flow', genDensity: 100, ...initial },
      });
      latest = toolData;
      return config.render(makeCtx({ toolData, setToolData, announceToSR: announce }));
    }
    await act(async () => {
      root.render(React.createElement(Harness));
      await Promise.resolve();
    });
  }

  it('renders accurate style names and states, associated density, instructions, shortcuts, and focus', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    const html = renderTool('artStudio', {
      artStudio: { tab: 'generative', genStyle: 'stars', genDensity: 140, genPaused: true },
    });

    expect(html).toContain('role="group" aria-label="Generative art controls"');
    expect(html).toContain('aria-label="Use Starfield generative style" aria-pressed="true"');
    expect(html).not.toContain('aria-label="Clear">✨ Starfield');
    expect(html).toContain('aria-label="Resume generative animation" aria-pressed="true"');
    expect(html).toContain('for="artstudio-generative-density"');
    expect(html).toContain('aria-describedby="artstudio-generative-density-value"');
    expect(html).toContain('aria-describedby="artstudio-generative-keyboard-help"');
    expect(html).toContain('Shift+ArrowUp');
    expect(html).toContain('focus-visible:ring-4');
  });

  it('moves the keyboard cursor and creates particle bursts without pointer input', async () => {
    await mount();
    const canvas = host.querySelector('#genCanvas');
    const cursor = host.querySelector('[data-generative-keyboard-cursor="true"]');
    canvas.focus();

    expect(cursor.style.display).toBe('block');
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    canvas.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    }));

    expect(announce).toHaveBeenCalledWith('Generative cursor x 330, y 240.');
    expect(announce).toHaveBeenCalledWith('Created particle burst at x 330, y 240.');
    expect(announce).toHaveBeenCalledWith('Created particle burst at x 330, y 250.');
    expect(canvas.getAttribute('aria-label')).toContain('Keyboard cursor at x 330, y 250');
  });

  it('starts paused for reduced motion and allows an explicit user resume', async () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn(() => ({ matches: true })),
    });
    await mount();
    const canvas = host.querySelector('#genCanvas');
    const resume = host.querySelector('button[aria-label="Resume generative animation"]');

    expect(canvas.getAttribute('data-paused')).toBe('1');
    await act(async () => {
      resume.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(latest.artStudio.genPaused).toBe(false);
    expect(canvas.getAttribute('data-paused')).toBe('0');
    expect(host.querySelector('button[aria-label="Pause generative animation"]')).not.toBeNull();
    expect(announce).toHaveBeenCalledWith('Generative animation resumed.');
  });

  it('keeps source and active public mirrors identical', () => {
    expect(fs.readFileSync(publicPath, 'utf8')).toBe(fs.readFileSync(sourcePath, 'utf8'));
  });
});
