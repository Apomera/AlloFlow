import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';
import { installCanvas2DStub, installLoopStubs, installThreeStub } from './helpers/galaxy_three_stub.js';

const FILE = 'stem_lab/stem_tool_galaxy.js';
const SCENE_TIMEOUT = 120000;
const LIGHT = { starCount: 2500, galaxyQuality: 'balanced', galaxyAutoRotate: false };
const STAR_IDS = ['O', 'B', 'A', 'F', 'G', 'K', 'M'];

function expectPositionClose(actual, expected, precision = 6) {
  expect(actual.x).toBeCloseTo(expected.x, precision);
  expect(actual.y).toBeCloseTo(expected.y, precision);
  expect(actual.z).toBeCloseTo(expected.z, precision);
}

function assertMotionFamily(canvas, morphology) {
  expect(typeof canvas._galaxyGetStarVisualState).toBe('function');
  let greatestDisplacement = 0;

  for (let index = 0; index < 96; index += 1) {
    const atZero = canvas._galaxyGetStarVisualState(index, 0, true);
    const motionOff = canvas._galaxyGetStarVisualState(index, 240, false);
    const animated = canvas._galaxyGetStarVisualState(index, 240, true);

    expect(atZero.morphology).toBe(morphology);
    expectPositionClose(atZero.animated, atZero.base, 7);
    expectPositionClose(motionOff.animated, motionOff.base, 7);
    for (const component of ['x', 'y', 'z', 'angularRate']) {
      expect(Number.isFinite(animated.animated[component]), `${morphology} star ${index} ${component}`).toBe(true);
    }

    greatestDisplacement = Math.max(
      greatestDisplacement,
      Math.hypot(
        animated.animated.x - animated.base.x,
        animated.animated.y - animated.base.y,
        animated.animated.z - animated.base.z,
      ),
    );
  }

  expect(greatestDisplacement, `${morphology} stars did not move`).toBeGreaterThan(1e-4);
}

describe('galaxy animated selection runtime', () => {
  let host;
  let root;
  let restoreCanvas;
  let restoreThree;
  let loopController;
  let errorSpy;
  let originalMatchMedia;
  let clockMs;

  beforeEach(() => {
    resetStemLab();
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    window._galaxyHasLoadedOnce = true;
    window._galaxyPPLoaded = true;
    delete window._galaxyPPLoading;
    delete window._galaxyPPCallbacks;

    originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn((query) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }));
    clockMs = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => clockMs);

    restoreCanvas = installCanvas2DStub().restore;
    restoreThree = installThreeStub();
    // Selection is the first Galaxy scene test to update a line attribute after
    // construction. The shared lightweight Three stub omits BufferAttribute's
    // standard mutator, so provide it locally without changing the shared harness.
    const StubBufferAttribute = window.THREE.BufferAttribute;
    window.THREE.BufferAttribute = function BufferAttributeWithSetXYZ(array, itemSize) {
      const attribute = new StubBufferAttribute(array, itemSize);
      attribute.setXYZ = function setXYZ(index, x, y, z) {
        const offset = index * attribute.itemSize;
        attribute.array[offset] = x;
        attribute.array[offset + 1] = y;
        attribute.array[offset + 2] = z;
        return attribute;
      };
      return attribute;
    };
    loopController = installLoopStubs();
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(async () => {
    if (root) await React.act(async () => root.unmount());
    root = null;
    host.remove();
    errorSpy.mockRestore();
    loopController();
    restoreThree();
    restoreCanvas();
    window.matchMedia = originalMatchMedia;
    delete window._galaxyPPLoaded;
    delete window._galaxyPPLoading;
    delete window._galaxyPPCallbacks;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    delete window.THREE;
    vi.restoreAllMocks();
  });

  async function mountGalaxy(galaxyState) {
    window.StemLab.ensureThree = vi.fn(() => Promise.resolve());
    const config = loadTool(FILE, 'galaxy');
    let latest = { galaxy: galaxyState };

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
    const messages = errorSpy.mock.calls
      .map((call) => call.map(String).join(' '))
      .filter((message) => message.includes('[Galaxy]') || message.includes('[StemLab]'));
    expect(messages, 'galaxy logged an error').toEqual([]);
  }

  it('keeps spiral selection, reticles, measurements, and evolved metadata on the rendered star', async () => {
    const getState = await mountGalaxy({ ...LIGHT, galaxyType: 'barredSpiral' });
    const canvas = host.querySelector('[data-galaxy-canvas]');
    assertMotionFamily(canvas, 'barredSpiral');

    await React.act(async () => {
      canvas._galaxyCycleStar(1);
    });
    const initialSelection = canvas._galaxyGetSelectionVisualState();
    expect(initialSelection.selectedIndex).toBeGreaterThanOrEqual(0);

    clockMs += 180_000;
    expect(loopController.step(), 'galaxy animation frame was not scheduled').toBe(true);
    const trackedSelection = canvas._galaxyGetSelectionVisualState();
    const trackedStar = canvas._galaxyGetStarVisualState(
      trackedSelection.selectedIndex,
      trackedSelection.elapsed,
      true,
    );
    expectPositionClose(trackedSelection.marker, trackedStar.animated, 5);
    expectPositionClose(trackedSelection.halo, trackedStar.animated, 5);
    expectPositionClose(trackedSelection.rulerEnd, trackedStar.animated, 5);

    const beforeTypes = Array.from({ length: LIGHT.starCount }, (_, index) => (
      canvas._galaxyGetStarVisualState(index).gpuTypeIndex
    ));
    await React.act(async () => {
      canvas._updateAge(0.4);
    });

    let changedTypeCount = 0;
    for (let index = 0; index < LIGHT.starCount; index += 1) {
      const visual = canvas._galaxyGetStarVisualState(index);
      if (visual.gpuTypeIndex !== beforeTypes[index]) changedTypeCount += 1;
      expect(visual.metadataTypeIndex, `star ${index} spectral metadata`).toBe(visual.gpuTypeIndex);
      expect(visual.metadataLuminosity, `star ${index} luminosity metadata`).toBeCloseTo(visual.gpuLuminosity, 6);
    }
    expect(changedTypeCount).toBeGreaterThan(0);

    const evolvedSelection = canvas._galaxyGetSelectionVisualState();
    const evolvedStar = canvas._galaxyGetStarVisualState(evolvedSelection.selectedIndex);
    const galaxyState = getState().galaxy;
    expect(galaxyState.selectedStar).toBe(STAR_IDS[evolvedStar.metadataTypeIndex]);
    expect(galaxyState.selectedStarMeasurement.index).toBe(evolvedSelection.selectedIndex);
    expect(galaxyState.selectedStarMeasurement.luminosity).toBeCloseTo(evolvedStar.metadataLuminosity, 6);
    expectPositionClose(galaxyState.selectedStarMeasurement, evolvedStar.animated, 5);

    await React.act(async () => {
      expect(canvas._setLayerVisibility('arms', false)).toBe(false);
    });
    expect(canvas._galaxyGetSelectionVisualState().selectedIndex).toBe(-1);
    expect(getState().galaxy.selectedStar).toBeNull();
    expect(getState().galaxy.selectedStarMeasurement).toBeNull();
    assertClean();
  }, SCENE_TIMEOUT);

  it.each(['elliptical', 'irregular'])('matches the %s shader motion on the CPU', async (galaxyType) => {
    await mountGalaxy({ ...LIGHT, galaxyType });
    const canvas = host.querySelector('[data-galaxy-canvas]');
    assertMotionFamily(canvas, galaxyType);
    assertClean();
  }, SCENE_TIMEOUT);

  it('does not raycast the undeformed star point geometry', () => {
    const source = readFileSync(FILE, 'utf8');
    expect(source).not.toMatch(/raycaster\s*\.\s*intersectObject\s*\(\s*starPoints\s*\)/);
  });
});
