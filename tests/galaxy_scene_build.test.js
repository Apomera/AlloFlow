// Runs the Galaxy Explorer's Three.js scene builder for real.
//
// Every other galaxy test stops at the React boundary: the smoke harness resolves
// ensureThree() with a promise that never settles, so the ~2,300-line initGalaxy()
// was never entered by any test. That is exactly how a self-recursive
// upscaleGalaxyCanvas() shipped — it threw a RangeError inside loadGalaxyPP's
// `try { fn() } catch {}`, leaving a black canvas and no console output.
//
// With THREE and canvas-2D stubbed, the builder runs end to end and one frame of
// the animation loop executes, so a scene-construction failure is now loud.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';
import { installCanvas2DStub, installThreeStub, installLoopStubs } from './helpers/galaxy_three_stub.js';

// Scene construction is allocation-heavy under the stubs; the default 5s budget
// is not enough on a loaded machine and produced flaky timeouts.
const SCENE_TIMEOUT = 30000;

const FILE = 'stem_lab/stem_tool_galaxy.js';

describe('galaxy 3-D scene builder', () => {
  let host;
  let root;
  let restoreCanvas;
  let restoreThree;
  let restoreLoops;
  let canvasStub;
  let errorSpy;

  beforeEach(() => {
    resetStemLab();
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    window._galaxyHasLoadedOnce = true;
    // loadGalaxyPP short-circuits when the post-processing bundle is "already"
    // loaded, so initGalaxy is reached synchronously.
    window._galaxyPPLoaded = true;
    delete window._galaxyPPLoading;
    delete window._galaxyPPCallbacks;
    canvasStub = installCanvas2DStub();
    restoreCanvas = canvasStub.restore;
    restoreThree = installThreeStub();
    restoreLoops = installLoopStubs();
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(async () => {
    if (root) await React.act(async () => root.unmount());
    root = null;
    host.remove();
    errorSpy.mockRestore();
    restoreLoops();
    restoreThree();
    restoreCanvas();
    delete window._galaxyPPLoaded;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    delete window.THREE;
  });

  // Building the scene allocates several hundred thousand stub objects (25,000
  // catalogue stars plus micro-star, thick-disk and open-cluster fields), which
  // in jsdom takes seconds. Tests that only care about code paths use the
  // slider's minimum star count; one test below keeps the real default.
  const LIGHT = { starCount: 2500 };

  async function mountGalaxy(galaxyState) {
    window.StemLab.ensureThree = vi.fn(() => Promise.resolve());
    const config = loadTool(FILE, 'galaxy');
    let latest = { galaxy: galaxyState || {} };

    function GalaxyHarness() {
      const state = React.useState(latest);
      latest = state[0];
      return config.render(makeCtx({ toolData: state[0], setToolData: state[1] }));
    }

    root = ReactDOMClient.createRoot(host);
    await React.act(async () => {
      root.render(React.createElement(GalaxyHarness));
    });
    return () => latest;
  }

  function assertClean() {
    // initGalaxy failures are caught and logged rather than propagating, so the
    // console is the signal. Filter to the tool's own prefixes: React also routes
    // its warnings through console.error, and an unrelated act()/key warning
    // would otherwise make this assertion flaky.
    const messages = errorSpy.mock.calls
      .map((c) => c.map(String).join(' '))
      .filter((m) => m.includes('[Galaxy]') || m.includes('[StemLab]'));
    expect(messages, 'galaxy logged an error').toEqual([]);
    expect(canvasStub.nanArgs, 'non-finite canvas coordinates').toEqual([]);
  }

  it('builds the scene at the default quality without throwing', async () => {
    const getState = await mountGalaxy({});
    assertClean();
    const canvas = host.querySelector('[data-galaxy-canvas]');
    expect(canvas).not.toBeNull();
    // _layers is assigned near the END of initGalaxy, so its presence proves the
    // builder ran to completion rather than dying partway.
    expect(canvas._layers).toBeTruthy();
    expect(Object.keys(canvas._layers).sort()).toEqual(
      ['arms', 'bgStars', 'blackHole', 'bulge', 'dust', 'gas', 'grid', 'labels', 'nebulae'].sort(),
    );
    expect(typeof canvas._galaxyCleanup).toBe('function');
    expect(getState().galaxy.webglError).toBeFalsy();
  }, SCENE_TIMEOUT);

  // This is the regression that matters: `auto` resolves to cinematic on a
  // typical desktop, and cinematic/high are the tiers the recursion killed.
  it.each(['auto', 'balanced', 'high', 'cinematic'])('builds the scene at %s quality', async (quality) => {
    const getState = await mountGalaxy({ ...LIGHT, galaxyQuality: quality });
    assertClean();
    const canvas = host.querySelector('[data-galaxy-canvas]');
    expect(canvas._layers, 'quality=' + quality).toBeTruthy();
    expect(getState().galaxy.webglError, 'quality=' + quality).toBeFalsy();
  }, SCENE_TIMEOUT);

  it.each(['barredSpiral', 'grandDesign', 'elliptical', 'irregular'])(
    'builds the %s morphology',
    async (galaxyType) => {
      await mountGalaxy({ ...LIGHT, galaxyType, galaxyQuality: 'cinematic' });
      assertClean();
      expect(host.querySelector('[data-galaxy-canvas]')._layers).toBeTruthy();
    },
    SCENE_TIMEOUT,
  );

  it('exposes working scene handles after building', async () => {
    await mountGalaxy({ ...LIGHT, galaxyQuality: 'high' });
    const canvas = host.querySelector('[data-galaxy-canvas]');
    for (const handle of ['_setStarCount', '_setRotMode', '_setObserveMode', '_updateAge', '_triggerSupernova', '_galaxyWarp', '_galaxyResetView', '_galaxyZoom']) {
      expect(typeof canvas[handle], handle).toBe('function');
    }
    // Each observing filter re-tunes dozens of materials; a typo in any branch
    // would throw here.
    for (const mode of ['visible', 'infrared', 'radio', 'xray', 'gravity']) {
      expect(() => canvas._setObserveMode(mode), mode).not.toThrow();
    }
    for (const rot of ['rigid', 'keplerian', 'flat']) {
      expect(() => canvas._setRotMode(rot), rot).not.toThrow();
    }
    expect(() => canvas._updateAge(0.4)).not.toThrow();
    expect(() => canvas._updateAge(13.8)).not.toThrow();
    expect(() => canvas._setStarCount(5000)).not.toThrow();
    expect(() => canvas._triggerSupernova()).not.toThrow();
    assertClean();
  }, SCENE_TIMEOUT);

  it('tears the scene down cleanly', async () => {
    await mountGalaxy(LIGHT);
    const canvas = host.querySelector('[data-galaxy-canvas]');
    expect(() => canvas._galaxyCleanup()).not.toThrow();
    // Cleanup nulls its own handle; calling again must stay a no-op.
    expect(canvas._galaxyCleanup).toBeNull();
    assertClean();
  }, SCENE_TIMEOUT);

  it('disposes the Real Sky atlas when its container unmounts', async () => {
    const destroyed = [];
    // Stand in for Aladin Lite: A.aladin() returns an instance bound to the div.
    window.A = {
      aladin: () => ({
        destroy() { destroyed.push('destroy'); },
        setFov() {}, gotoObject() {}, gotoRaDec() {}, setImageSurvey() {}, removeLayers() {}, addCatalog() {},
      }),
    };
    // ensureGalaxyAladinLite short-circuits when the global is already present.
    await mountGalaxy({ ...LIGHT, simMode: 'realSky' });

    const container = host.querySelector('#galaxy-real-sky-aladin');
    expect(container).not.toBeNull();
    expect(container._galaxyAladin, 'atlas should have been created').toBeTruthy();

    // The container is keyed on target+survey+catalog, so switching targets used
    // to remount it and abandon the previous instance — twelve targets, twelve
    // live instances holding canvases and tile caches.
    await React.act(async () => root.unmount());
    root = null;
    await React.act(async () => { await new Promise((r) => setTimeout(r, 5)); });

    expect(destroyed, 'atlas instance was leaked on unmount').toEqual(['destroy']);
    expect(container._galaxyAladin).toBeNull();
    delete window.A;
  }, SCENE_TIMEOUT);

  it('stops drawing while the canvas is scrolled off-screen', async () => {
    await mountGalaxy(LIGHT);
    const canvas = host.querySelector('[data-galaxy-canvas]');
    const renderer = window.THREE.__renderers[0];
    expect(renderer, 'renderer was never created').toBeTruthy();

    // Baseline: on-screen frames draw.
    const before = renderer.renderCount;
    expect(restoreLoops.step(), 'no frame was scheduled').toBe(true);
    expect(renderer.renderCount).toBeGreaterThan(before);

    // Scrolled out of view: rAF stays scheduled (so it is live the instant it
    // returns) but the bloom composer over a six-figure particle count must not
    // keep running. The browser only throttles rAF for hidden TABS, not for
    // off-screen elements.
    restoreLoops.setIntersecting(canvas, false);
    const offscreenStart = renderer.renderCount;
    expect(restoreLoops.step()).toBe(true);
    expect(restoreLoops.step()).toBe(true);
    expect(renderer.renderCount, 'kept drawing while off-screen').toBe(offscreenStart);

    // ...and resumes on the first frame after it reappears.
    restoreLoops.setIntersecting(canvas, true);
    expect(restoreLoops.step()).toBe(true);
    expect(renderer.renderCount).toBeGreaterThan(offscreenStart);
    assertClean();
  }, SCENE_TIMEOUT);

  it('shows a building overlay until the scene exists, then clears it', async () => {
    // The overlay is present in the very first render, before initGalaxy runs.
    await mountGalaxy(LIGHT);
    // reportSceneReady defers a tick so it never sets state during commit.
    await React.act(async () => { await new Promise((r) => setTimeout(r, 5)); });
    expect(host.querySelector('[data-galaxy-building]'), 'overlay outlived the build').toBeNull();
    // The "drag to orbit" pill only appears once there is something to drag.
    expect(host.querySelector('[data-galaxy-status]')).not.toBeNull();
  }, SCENE_TIMEOUT);

  it('gives each nebula sprite its own texture image', async () => {
    await mountGalaxy({ ...LIGHT, galaxyQuality: 'cinematic' });
    const canvas = host.querySelector('[data-galaxy-canvas]');
    const nebulae = canvas._layers.nebulae;
    const coreSprites = nebulae.children.filter((c) => c.userData && c.userData.name);
    expect(coreSprites.length).toBe(8);
    // One shared canvas meant all eight uploaded the same image — and therefore
    // the same colour.
    const images = new Set(coreSprites.map((s) => s.material.map.image));
    expect(images.size).toBe(8);
  }, SCENE_TIMEOUT);
});
