import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

/**
 * The rover/probe/submersible scene used to render at the bottom of a ~800px
 * stack of orrery chrome (the orbital 3D canvas, the viewpoint bar, the planet
 * picker and the scale note) that is inert while you are driving. On a laptop
 * that meant scrolling past a second 3D canvas to reach the one you fly.
 *
 * These render the tool for real and assert what the DOM actually does, rather
 * than pinning the source text: a later refactor that keeps the behaviour stays
 * green, and only a real regression in the layout goes red.
 */
const SOURCE = 'stem_lab/stem_tool_solarsystem.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js';
const EARTH = 'stem.solar_sys.earth';
const noop = () => {};

// The chrome that surrounds the orrery and is not useful while driving.
const COLLAPSIBLE = [
  '[data-solarsystem-canvas-world-picker]',
];

describe('Solar System surface-ops immersive layout', () => {
  let host;
  let root;
  let originalGetContext;
  let originalRequestAnimationFrame;
  let originalCancelAnimationFrame;
  let originalResizeObserver;

  const renderWith = async (solarSystem) => {
    const config = window.StemLab._registry.solarSystem;
    function Host() {
      const [toolData, setToolData] = React.useState({ solarSystem });
      return config.render(makeCtx({ toolData, setToolData }));
    }
    root = ReactDOMClient.createRoot(host);
    await React.act(async () => {
      root.render(React.createElement(Host));
      await Promise.resolve();
    });
  };

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
    globalThis.ResizeObserver = window.ResizeObserver = class { observe() {} disconnect() {} };
  });

  afterEach(async () => {
    if (root) await React.act(async () => root.unmount());
    root = null;
    if (host) host.remove();
    window.HTMLCanvasElement.prototype.getContext = originalGetContext;
    globalThis.requestAnimationFrame = window.requestAnimationFrame = originalRequestAnimationFrame;
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = originalCancelAnimationFrame;
    globalThis.ResizeObserver = window.ResizeObserver = originalResizeObserver;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });

  it('keeps the layout implementation mirrored in the deploy copy', () => {
    expect(readFileSync(MIRROR, 'utf8')).toBe(readFileSync(SOURCE, 'utf8'));
  });

  it('shows the orrery chrome on the overview tab', async () => {
    await renderWith({ tutorialDismissed: true, selectedPlanet: EARTH, viewTab: 'overview' });

    const shell = host.querySelector('[data-solarsystem-canvas-shell]');
    expect(shell, 'the orrery canvas shell should render on the overview tab').not.toBeNull();
    expect(shell.getAttribute('data-solarsystem-chrome-collapsed')).toBeNull();
    expect(shell.style.display).not.toBe('none');

    COLLAPSIBLE.forEach((selector) => {
      expect(host.querySelector(selector), `${selector} should render on the overview tab`).not.toBeNull();
    });
  });

  it('collapses the orrery chrome on the surface-ops tab', async () => {
    await renderWith({ tutorialDismissed: true, selectedPlanet: EARTH, viewTab: 'drone' });

    // The orrery canvas stays MOUNTED (tearing down its WebGL context on every
    // tab switch would drop the camera state and cost a full rebuild) but is
    // taken out of layout, out of the a11y tree and out of the tab order.
    const shell = host.querySelector('[data-solarsystem-canvas-shell]');
    expect(shell, 'the orrery shell should stay mounted to keep its WebGL context').not.toBeNull();
    expect(shell.style.display).toBe('none');
    expect(shell.getAttribute('aria-hidden')).toBe('true');
    expect(shell.inert, 'the hidden orrery canvas is focusable, so it must be inert').toBe(true);

    COLLAPSIBLE.forEach((selector) => {
      expect(host.querySelector(selector), `${selector} should be collapsed on the surface-ops tab`).toBeNull();
    });
  });

  it('keeps the view tabs reachable so the scene is not a dead end', async () => {
    await renderWith({ tutorialDismissed: true, selectedPlanet: EARTH, viewTab: 'drone' });

    const tabs = host.querySelector('[data-solarsystem-world-view-tabs]');
    expect(tabs, 'the view tabs must survive the collapse or there is no way back').not.toBeNull();

    const overview = tabs.querySelector('[data-world-view-tab="overview"]');
    expect(overview, 'the overview tab must stay reachable').not.toBeNull();
    expect(overview.disabled).toBe(false);

    // The detail card carries the marker that tightens its own padding.
    const detail = host.querySelector('[data-solarsystem-planet-detail]');
    expect(detail.getAttribute('data-solarsystem-immersive')).toBe('true');
  });

  it('gives the scene more height than the chrome it replaced', async () => {
    await renderWith({ tutorialDismissed: true, selectedPlanet: EARTH, viewTab: 'drone' });

    const canvas = host.querySelector('[data-drone-canvas]');
    expect(canvas, 'the surface-ops canvas should render').not.toBeNull();

    // Target the frame by its own marker: the drone init writes an inline
    // height onto the CANVAS too, so closest('[style*=height]') finds that
    // instead and the assertion below would read the wrong element.
    const frame = host.querySelector('[data-drone-scene-frame]');
    expect(frame, 'the scene frame should carry an explicit height').not.toBeNull();
    expect(frame.contains(canvas), 'the marked frame should be the canvas ancestor').toBe(true);

    // The old frame was capped at 70vh AND hard-capped at an absolute 800px, so
    // on a tall window the scene stopped growing while the chrome above it did
    // not. Assert the viewport share went up and the absolute cap is gone,
    // rather than the exact expression, so a later retune stays green.
    const height = frame.style.height;
    expect(height, `scene height "${height}" should still be viewport-relative`).toMatch(/vh|vmin|%/);

    const vh = Number((height.match(/(\d+(?:\.\d+)?)vh/) || [])[1]);
    expect(vh, `scene height "${height}" should claim more than the old 70vh`).toBeGreaterThan(70);

    // A cap may remain, but it has to track the viewport -- a bare pixel cap is
    // the thing that stopped the scene growing on a tall screen.
    const cap = frame.style.maxHeight;
    if (cap) {
      expect(cap, `max-height "${cap}" should track the viewport, not a fixed pixel ceiling`).toMatch(/vh|vmin|%/);
    }

    // Every declaration must survive the CSS parser. A nested min()/calc() is
    // dropped WHOLESALE by strict parsers, which left the frame with no height
    // at all -- the scene then collapsed to its min-height instead of growing.
    expect(frame.style.height, 'the height declaration must survive parsing').not.toBe('');
    expect(frame.style.minHeight, 'the min-height floor must survive parsing').not.toBe('');
  });
});
