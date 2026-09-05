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
    clearRect: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    restore: vi.fn(),
    rotate: vi.fn(),
    save: vi.fn(),
    translate: vi.fn(),
  };
}

describe('Art Studio Spin Art accessibility', () => {
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
        artStudio: {
          tab: 'spinArt',
          spinRPM: 120,
          spinBrush: 6,
          activePalette: 'retro',
          hue: 0,
          sat: 85,
          lit: 45,
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

  it('renders labeled controls, accurate toggle states, named colors, instructions, and disclosure state', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    const html = renderTool('artStudio', {
      artStudio: {
        tab: 'spinArt',
        spinRPM: 160,
        spinBrush: 8,
        spinSplatter: true,
        spinPaused: true,
        activePalette: 'retro',
        hue: 0,
        sat: 85,
        lit: 45,
      },
    });

    expect(html).toContain('role="group" aria-label="Spin art controls"');
    expect(html).toContain('for="artstudio-spin-rpm"');
    expect(html).toContain('for="artstudio-spin-brush"');
    expect(html).toContain('aria-label="Disable paint splatter" aria-pressed="true"');
    expect(html).toContain('aria-label="Resume spin art animation" aria-pressed="true"');
    expect(html).toContain('aria-label="Use');
    expect(html).toContain('palette" aria-pressed="true"');
    expect(html).toContain('aria-label="Select color HSL 0, 85 percent saturation, 45 percent lightness" aria-pressed="true"');
    expect(html).not.toContain('aria-label="HSL("');
    expect(html).toContain('aria-describedby="artstudio-spin-keyboard-help"');
    expect(html).toContain('aria-expanded="false" aria-controls="artstudio-spin-physics"');
  });

  it('moves the keyboard cursor and adds paint without pointer input', async () => {
    await mount();
    const canvas = host.querySelector('#spinCanvas');
    const cursor = host.querySelector('[data-spin-keyboard-cursor="true"]');
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

    expect(announce).toHaveBeenCalledWith('Spin art cursor x 266, y 256.');
    expect(announce).toHaveBeenCalledWith('Added paint at x 266, y 256.');
    expect(announce).toHaveBeenCalledWith('Added paint at x 266, y 266.');
    expect(canvas.getAttribute('aria-label')).toContain('Keyboard cursor at x 266, y 266');
  });

  it('starts paused for reduced motion and refreshes live controls after initialization', async () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn(() => ({ matches: true })),
    });
    await mount();
    const canvas = host.querySelector('#spinCanvas');
    expect(canvas.dataset.paused).toBe('1');

    const resume = host.querySelector('button[aria-label="Resume spin art animation"]');
    await act(async () => {
      resume.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.spinPaused).toBe(false);
    expect(canvas.dataset.paused).toBe('0');
    expect(announce).toHaveBeenCalledWith('Spin art animation resumed.');

    const rpm = host.querySelector('#artstudio-spin-rpm');
    const brush = host.querySelector('#artstudio-spin-brush');
    const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    await act(async () => {
      valueSetter.call(rpm, '220');
      rpm.dispatchEvent(new Event('input', { bubbles: true }));
      valueSetter.call(brush, '12');
      brush.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });
    expect(canvas.dataset.rpm).toBe('220');
    expect(canvas.dataset.brush).toBe('12');
  });

  it('keeps source and active public mirrors identical', () => {
    expect(fs.readFileSync(publicPath, 'utf8')).toBe(fs.readFileSync(sourcePath, 'utf8'));
  });
});
