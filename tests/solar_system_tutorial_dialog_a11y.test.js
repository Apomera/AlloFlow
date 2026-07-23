import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_solarsystem.js';
const MIRROR = 'prismflow-deploy/public/stem_lab/stem_tool_solarsystem.js';
const noop = () => {};

describe('Solar System first-visit tutorial dialog', () => {
  let host;
  let root;
  let originalGetContext;
  let originalRequestAnimationFrame;
  let originalCancelAnimationFrame;
  let originalResizeObserver;

  beforeEach(() => {
    resetStemLab();
    loadTool(SOURCE, 'solarSystem');
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    host = document.createElement('div');
    document.body.appendChild(host);

    originalGetContext = window.HTMLCanvasElement.prototype.getContext;
    window.HTMLCanvasElement.prototype.getContext = () => ({
      setTransform: noop, clearRect: noop, save: noop, restore: noop, fillRect: noop,
      strokeRect: noop, beginPath: noop, closePath: noop, roundRect: noop, rect: noop,
      arc: noop, ellipse: noop, moveTo: noop, lineTo: noop, bezierCurveTo: noop,
      quadraticCurveTo: noop, fill: noop, stroke: noop, setLineDash: noop, translate: noop,
      rotate: noop, scale: noop, fillText: noop, strokeText: noop,
      createLinearGradient: () => ({ addColorStop: noop }),
      createRadialGradient: () => ({ addColorStop: noop }),
      measureText: (text) => ({ width: String(text || '').length * 6 }),
    });

    originalRequestAnimationFrame = globalThis.requestAnimationFrame;
    originalCancelAnimationFrame = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = window.requestAnimationFrame = () => 1;
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = noop;

    originalResizeObserver = globalThis.ResizeObserver;
    const ResizeObserverStub = class { observe() {} disconnect() {} };
    globalThis.ResizeObserver = window.ResizeObserver = ResizeObserverStub;
  });

  afterEach(async () => {
    if (root) await React.act(async () => root.unmount());
    if (host) host.remove();
    window.HTMLCanvasElement.prototype.getContext = originalGetContext;
    globalThis.requestAnimationFrame = window.requestAnimationFrame = originalRequestAnimationFrame;
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = originalCancelAnimationFrame;
    globalThis.ResizeObserver = window.ResizeObserver = originalResizeObserver;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });

  it('keeps the dialog implementation mirrored in the deploy copy', () => {
    expect(readFileSync(MIRROR, 'utf8')).toBe(readFileSync(SOURCE, 'utf8'));
  });

  it('names, focuses, traps, dismisses, and returns focus from the tutorial', async () => {
    const config = window.StemLab._registry.solarSystem;
    function Host() {
      const [toolData, setToolData] = React.useState({ solarSystem: { tutorialDismissed: false, selectedPlanet: 'stem.solar_sys.earth' } });
      return config.render(makeCtx({ toolData, setToolData }));
    }

    root = ReactDOMClient.createRoot(host);
    await React.act(async () => {
      root.render(React.createElement(Host));
      await Promise.resolve();
    });

    const dialog = host.querySelector('[data-solarsystem-tutorial="true"]');
    const title = host.querySelector('#solar-system-tutorial-title');
    const start = Array.from(dialog.querySelectorAll('button')).find((button) => button.textContent.includes('Start Exploring'));
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('solar-system-tutorial-title');
    expect(dialog.getAttribute('aria-describedby')).toBe('solar-system-tutorial-description');
    expect(dialog.querySelector('.max-h-\\[calc\\(100vh-2rem\\)\\]')).not.toBeNull();
    expect(start.className).toContain('min-h-[44px]');
    expect(document.activeElement).toBe(title);

    await React.act(async () => {
      title.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
    });
    expect(document.activeElement).toBe(start);

    await React.act(async () => {
      start.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    });
    expect(document.activeElement).toBe(start);

    await React.act(async () => {
      start.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await Promise.resolve();
    });
    expect(host.querySelector('[data-solarsystem-tutorial="true"]')).toBeNull();
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Back to tools');
  });
});
