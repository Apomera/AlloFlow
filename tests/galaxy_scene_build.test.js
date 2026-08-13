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
const SCENE_TIMEOUT = 90000;

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


  it('keeps spiral-only layers unavailable in the elliptical scene', async () => {
    await mountGalaxy({ ...LIGHT, galaxyType: 'elliptical', galaxyQuality: 'balanced' });
    await React.act(async () => { await new Promise((resolve) => setTimeout(resolve, 5)); });
    const canvas = host.querySelector('[data-galaxy-canvas]');
    expect(canvas._layers.arms.visible).toBe(true);
    for (const layer of ['dust', 'gas', 'nebulae']) {
      expect(canvas._isLayerAllowed(layer), layer).toBe(false);
      expect(canvas._layers[layer].visible, layer).toBe(false);
      expect(canvas._setLayerVisibility(layer, true), layer).toBe(false);
      expect(canvas._layers[layer].visible, layer).toBe(false);
      expect(host.querySelector('[data-galaxy-toggle="' + layer + '"]').disabled, layer).toBe(true);
    }
    expect(host.textContent).toContain('Old warm stars');
    expect(host.textContent).toContain('Concentrated core');
    const motionTab = host.querySelector('[data-galaxy-control-tab="motion"]');
    await React.act(async () => { motionTab.click(); });
    expect(host.querySelector('[data-galaxy-elliptical-kinematics]')).not.toBeNull();
    expect(host.textContent).toContain('velocity dispersion');
    assertClean();
  }, SCENE_TIMEOUT);

  it('keeps the irregular morphology clumpy and free of spiral fallbacks', async () => {
    await mountGalaxy({ ...LIGHT, galaxyType: 'irregular', galaxyQuality: 'high' });
    const canvas = host.querySelector('[data-galaxy-canvas]');
    const morphology = canvas._galaxyGetMorphologyVisualState();

    expect(morphology.morphology).toBe('irregular');
    expect(morphology.sharedIrregularAnchorCount).toBe(5);
    expect(morphology.spiralRidgeCount).toBe(0);
    expect(morphology.radioRingCount).toBe(0);
    expect(morphology.orderedRadioFieldVisible).toBe(false);
    expect(morphology.coreFlareVisible).toBe(false);
    expect(morphology.coherentIrregularMotion).toBe(true);
    expect(morphology.morphologySignatureCount).toBe(7);
    expect(morphology.armScatteringCount).toBe(32);
    expect(morphology.molecularFilamentCount).toBe(28);
    expect(morphology.remnantArcCount).toBe(15);
    expect(morphology.ionizedShellCount).toBe(13);
    expect(canvas._isLayerAllowed('bulge')).toBe(false);
    expect(canvas._layers.bulge.visible).toBe(false);
    expect(host.querySelector('[data-galaxy-toggle="bulge"]').disabled).toBe(true);
    expect(host.querySelector('[data-galaxy-toggle="bulge"]').getAttribute('aria-label')).toContain('irregular galaxies');

    for (const mode of ['visible', 'infrared', 'radio', 'xray', 'gravity']) {
      expect(() => canvas._setObserveMode(mode), mode).not.toThrow();
      expect(canvas._galaxyGetMorphologyVisualState().orderedRadioFieldVisible, mode).toBe(false);
    }
    assertClean();
  }, SCENE_TIMEOUT);

  it('exposes working scene handles after building', async () => {
    await mountGalaxy({ ...LIGHT, galaxyQuality: 'high' });
    const canvas = host.querySelector('[data-galaxy-canvas]');
    for (const handle of ['_setStarCount', '_setRotMode', '_setObserveMode', '_updateAge', '_triggerSupernova', '_galaxyWarp', '_galaxyResetView', '_galaxyZoom', '_galaxyGetAdaptiveVisualState', '_galaxyGetInstrumentVisualState', '_galaxyGetMorphologyVisualState']) {
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

  it('uses soft instrument profiles and preserves each observing mode hierarchy', async () => {
    await mountGalaxy({ ...LIGHT, galaxyQuality: 'high' });
    const canvas = host.querySelector('[data-galaxy-canvas]');
    const built = canvas._galaxyGetInstrumentVisualState();
    expect(built.softInstrumentPointCount).toBe(4);
    expect(built.nonFiniteAdaptiveMaterialCount).toBe(0);
    expect(built.materials.infrared).toMatchObject({ baseSize: 0.014, baseOpacity: 0.68, hasAlphaMap: true });
    expect(built.materials.radio).toMatchObject({ baseSize: 0.008, baseOpacity: 0.32, hasAlphaMap: true });
    expect(built.materials.doppler).toMatchObject({ baseSize: 0.008, baseOpacity: 0.42, hasAlphaMap: true });
    expect(built.materials.xray).toMatchObject({ baseSize: 0.0095, baseOpacity: 0.52, hasAlphaMap: true });

    canvas._setObserveMode('infrared');
    for (let frame = 0; frame < 8; frame += 1) expect(restoreLoops.step()).toBe(true);
    const infrared = canvas._galaxyGetInstrumentVisualState();
    expect(infrared).toMatchObject({ thermalCloudCount: 38, nonFiniteThermalOpacityCount: 0, opticalPsf: 0.22 });
    expect(infrared.thermalCloudOpacity).toBeGreaterThan(0);

    const modeScales = { visible: 1, infrared: 0.5, radio: 0.06, xray: 0.04, gravity: 0.1 };
    for (const [mode, scale] of Object.entries(modeScales)) {
      canvas._setObserveMode(mode);
      for (let frame = 0; frame < 40; frame += 1) expect(restoreLoops.step()).toBe(true);
      const active = canvas._galaxyGetInstrumentVisualState();
      expect(active.microStarModeScale, mode).toBeCloseTo(scale, 6);
      expect(active.opticalPsf, mode).toBe(mode === 'visible' ? 1 : mode === 'infrared' ? 0.22 : 0);
      expect(active.nonFiniteAdaptiveMaterialCount, mode).toBe(0);
    }

    canvas._setObserveMode('visible');
    for (let frame = 0; frame < 12; frame += 1) expect(restoreLoops.step()).toBe(true);
    const visible = canvas._galaxyGetInstrumentVisualState();
    expect(visible.depthOfField).toBeGreaterThan(0);
    expect(visible.nebulaMaxOpacity).toBeGreaterThan(0.1);

    canvas._setObserveMode('gravity');
    for (let frame = 0; frame < 5; frame += 1) expect(restoreLoops.step()).toBe(true);
    const gravity = canvas._galaxyGetInstrumentVisualState();
    expect(gravity.depthOfField).toBe(0);
    expect(gravity.gasOpacity).toBeLessThan(0.008);
    expect(gravity.dustOpacity).toBeCloseTo(0.006, 6);
    expect(gravity.nebulaMaxOpacity).toBeLessThanOrEqual(0.0161);
    expect(gravity.nebulaWispMaxOpacityScale).toBeLessThanOrEqual(0.0601);
    expect(visible.nebulaMaxOpacity / gravity.nebulaMaxOpacity).toBeGreaterThan(6);
    canvas._updateAge(0.4);
    expect(canvas._galaxyGetInstrumentVisualState().nebulaMaxOpacity).toBeLessThanOrEqual(0.0161);
    expect(restoreLoops.step()).toBe(true);
    expect(canvas._galaxyGetInstrumentVisualState().nebulaMaxOpacity).toBeLessThanOrEqual(0.0161);
    assertClean();
  }, SCENE_TIMEOUT);

  it('separates every dense particle layer at the widest overview in every observing mode', async () => {
    await mountGalaxy({ ...LIGHT, galaxyQuality: 'high' });
    const canvas = host.querySelector('[data-galaxy-canvas]');
    for (let frame = 0; frame < 120; frame += 1) expect(restoreLoops.step()).toBe(true);
    const near = canvas._galaxyGetAdaptiveVisualState();
    expect(near.pointScale).toBeGreaterThan(0.985);
    expect(near.opacity).toBeGreaterThan(0.985);
    expect(near.overlayMaterialCount).toBe(3);
    expect(near.denseMaterialCount).toBe(6);

    const bases = (materials) => Object.fromEntries(Object.entries(materials).map(([name, material]) => [
      name, { baseSize: material.baseSize, baseOpacity: material.baseOpacity },
    ]));
    const initialBases = bases(canvas._galaxyGetInstrumentVisualState().materials);
    for (let i = 0; i < 7; i += 1) canvas._galaxyZoom('out');
    for (let frame = 0; frame < 180; frame += 1) expect(restoreLoops.step()).toBe(true);
    const distant = canvas._galaxyGetAdaptiveVisualState();
    expect(distant.distance).toBeCloseTo(3, 4);
    expect(distant.pointScale).toBeGreaterThanOrEqual(0.53);
    expect(distant.pointScale).toBeLessThanOrEqual(0.55);
    expect(distant.opacity).toBeGreaterThanOrEqual(0.59);
    expect(distant.opacity).toBeLessThanOrEqual(0.61);

    let visuals = canvas._galaxyGetInstrumentVisualState();
    for (const name of ['microStars', 'armGlow', 'gas', 'openClusters', 'thickDisk']) {
      expect(visuals.materials[name].sizeScale, name + ' size').toBeCloseTo(distant.pointScale, 6);
      expect(visuals.materials[name].opacityScale, name + ' opacity').toBeCloseTo(distant.opacity, 6);
      expect(visuals.materials[name].finite, name + ' finite').toBe(true);
    }

    for (const mode of ['visible', 'infrared', 'radio', 'xray', 'gravity']) {
      canvas._setObserveMode(mode);
      for (let frame = 0; frame < 40; frame += 1) expect(restoreLoops.step()).toBe(true);
      const adaptive = canvas._galaxyGetAdaptiveVisualState();
      visuals = canvas._galaxyGetInstrumentVisualState();
      expect(adaptive.pointScale, mode).toBeGreaterThanOrEqual(0.53);
      expect(adaptive.pointScale, mode).toBeLessThanOrEqual(0.55);
      expect(adaptive.opacity, mode).toBeGreaterThanOrEqual(0.59);
      expect(adaptive.opacity, mode).toBeLessThanOrEqual(0.61);
      if (['infrared', 'radio', 'xray'].includes(mode)) {
        expect(visuals.materials[mode].sizeScale, mode + ' size').toBeCloseTo(adaptive.pointScale, 6);
        expect(visuals.materials[mode].opacityScale, mode + ' opacity').toBeCloseTo(adaptive.opacity, 6);
      }
      if (mode === 'radio') {
        expect(visuals.materials.doppler.sizeScale).toBeCloseTo(adaptive.pointScale, 6);
        expect(visuals.materials.doppler.opacityScale).toBeCloseTo(adaptive.opacity, 6);
      }
      expect(visuals.nonFiniteAdaptiveMaterialCount, mode).toBe(0);
    }
    expect(bases(canvas._galaxyGetInstrumentVisualState().materials)).toEqual(initialBases);
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
    const created = [];
    // Stand in for Aladin Lite: A.aladin() returns an instance bound to the div.
    window.A = {
      aladin: () => { created.push('create'); return {
        destroy() { destroyed.push('destroy'); },
        setFov() {}, gotoObject() {}, gotoRaDec() {}, setImageSurvey() {}, removeLayers() {}, addCatalog() {},
      }; },
    };
    // ensureGalaxyAladinLite short-circuits when the global is already present.
    await mountGalaxy({ ...LIGHT, simMode: 'realSky' });

    const container = host.querySelector('#galaxy-real-sky-aladin');
    expect(container).not.toBeNull();
    expect(container._galaxyAladin, 'atlas should have been created').toBeTruthy();
    await React.act(async () => { await new Promise((r) => setTimeout(r, 5)); });
    expect(created, 'status renders recreated the atlas').toEqual(['create']);
    assertClean();

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
