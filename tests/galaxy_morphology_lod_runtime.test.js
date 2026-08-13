// Focused runtime contracts for morphology-specific particle populations and
// non-point instrument LOD. This deliberately uses the real Galaxy scene
// builder (with lightweight Three.js stubs) rather than source-string checks.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';
import {
  installCanvas2DStub,
  installLoopStubs,
  installThreeStub,
} from './helpers/galaxy_three_stub.js';

const FILE = 'stem_lab/stem_tool_galaxy.js';
const SCENE_TIMEOUT = 90000;
const LIGHT = { starCount: 2500 };
const HIGH_OPEN_CLUSTER_POINTS = 3200;
const HIGH_OPEN_CLUSTER_CENTERS = Math.ceil(HIGH_OPEN_CLUSTER_POINTS / 28);
const HIGH_THICK_DISK_POINTS = 6500;

describe('galaxy morphology populations and non-point instrument LOD', () => {
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

  async function mountGalaxy(galaxyState) {
    window.StemLab.ensureThree = vi.fn(() => Promise.resolve());
    const config = loadTool(FILE, 'galaxy');

    function GalaxyHarness() {
      const [state, setState] = React.useState({ galaxy: galaxyState || {} });
      return config.render(makeCtx({ toolData: state, setToolData: setState }));
    }

    root = ReactDOMClient.createRoot(host);
    await React.act(async () => {
      root.render(React.createElement(GalaxyHarness));
    });
    const canvas = host.querySelector('[data-galaxy-canvas]');
    expect(canvas).not.toBeNull();
    expect(typeof canvas._galaxyGetMorphologyVisualState).toBe('function');
    expect(typeof canvas._galaxyGetInstrumentVisualState).toBe('function');
    return canvas;
  }

  function assertClean() {
    const messages = errorSpy.mock.calls
      .map((call) => call.map(String).join(' '))
      .filter((message) => message.includes('[Galaxy]') || message.includes('[StemLab]'));
    expect(messages, 'galaxy logged an error').toEqual([]);
    expect(canvasStub.nanArgs, 'non-finite canvas coordinates').toEqual([]);
  }

  function stepFrames(count) {
    for (let frame = 0; frame < count; frame += 1) {
      expect(restoreLoops.step(), 'animation loop stopped at frame ' + frame).toBe(true);
    }
  }

  function expectFiniteFields(state, fields, label) {
    for (const field of fields) {
      expect(Number.isFinite(state[field]), label + '.' + field + ' must be finite').toBe(true);
      expect(state[field], label + '.' + field + ' must not be negative').toBeGreaterThanOrEqual(0);
    }
  }

  function expectFarFieldSuppression(near, far, fields, label) {
    expectFiniteFields(near, fields, label + '.near');
    expectFiniteFields(far, fields, label + '.far');
    for (const field of fields) {
      expect(near[field], label + '.' + field + ' must be active nearby').toBeGreaterThan(0);
      expect(far[field], label + '.' + field + ' must remain distinguishable far away').toBeGreaterThan(0);
      expect(far[field], label + '.' + field + ' must separate at overview distance').toBeLessThan(near[field]);
    }
  }

  it.each([
    ['elliptical', {
      diffuseEnvelopePresent: false,
      diffuseBodyKind: 'triaxial-volume',
      openClusterPointCount: 0,
      openClusterCenterCount: 0,
      thickDiskPointCount: 0,
    }],
    ['irregular', {
      diffuseEnvelopePresent: false,
      diffuseBodyKind: 'clumpy-volume',
      openClusterPointCount: HIGH_OPEN_CLUSTER_POINTS,
      openClusterCenterCount: HIGH_OPEN_CLUSTER_CENTERS,
      thickDiskPointCount: 0,
    }],
    ['barredSpiral', {
      diffuseEnvelopePresent: true,
      diffuseBodyKind: 'disk-plane',
      openClusterPointCount: HIGH_OPEN_CLUSTER_POINTS,
      openClusterCenterCount: HIGH_OPEN_CLUSTER_CENTERS,
      thickDiskPointCount: HIGH_THICK_DISK_POINTS,
    }],
    ['grandDesign', {
      diffuseEnvelopePresent: true,
      diffuseBodyKind: 'disk-plane',
      openClusterPointCount: HIGH_OPEN_CLUSTER_POINTS,
      openClusterCenterCount: HIGH_OPEN_CLUSTER_CENTERS,
      thickDiskPointCount: HIGH_THICK_DISK_POINTS,
    }],
  ])('realizes the high-quality %s population policy', async (galaxyType, expected) => {
    const canvas = await mountGalaxy({ ...LIGHT, galaxyType, galaxyQuality: 'high' });
    const morphology = canvas._galaxyGetMorphologyVisualState();

    expect(morphology.diffuseEnvelopePresent).toBe(expected.diffuseEnvelopePresent);
    expect(morphology.diffuseBodyKind).toBe(expected.diffuseBodyKind);
    expect(morphology.openClusterPointCount).toBe(expected.openClusterPointCount);
    expect(morphology.openClusterCenterCount).toBe(expected.openClusterCenterCount);
    expect(morphology.thickDiskPointCount).toBe(expected.thickDiskPointCount);

    if (galaxyType === 'irregular') {
      expect(Number.isFinite(morphology.openClusterMeanNearestAnchorDistance)).toBe(true);
      expect(morphology.openClusterMeanNearestAnchorDistance).toBeGreaterThanOrEqual(0);
      // Cluster centers should remain local to the five shared star-forming
      // associations, not fall back to a galaxy-wide flat random disk.
      expect(morphology.openClusterMeanNearestAnchorDistance).toBeLessThan(0.16);
    }

    assertClean();
  }, SCENE_TIMEOUT);

  it('separates extended and resolved radio, infrared, and X-ray overlays at the far overview', async () => {
    const canvas = await mountGalaxy({ ...LIGHT, galaxyType: 'barredSpiral', galaxyQuality: 'high' });
    const modes = ['infrared', 'radio', 'xray'];
    const near = {};
    const far = {};

    stepFrames(120);
    for (const mode of modes) {
      canvas._setObserveMode(mode);
      stepFrames(80);
      near[mode] = canvas._galaxyGetInstrumentVisualState();
    }

    for (let zoom = 0; zoom < 7; zoom += 1) canvas._galaxyZoom('out');
    stepFrames(180);
    expect(canvas._galaxyGetAdaptiveVisualState().distance).toBeCloseTo(3, 4);

    for (const mode of modes) {
      canvas._setObserveMode(mode);
      stepFrames(100);
      far[mode] = canvas._galaxyGetInstrumentVisualState();
      expectFiniteFields(
        far[mode],
        ['extendedInstrumentDetail', 'resolvedInstrumentDetail'],
        mode + '.lod',
      );
      expect(far[mode].extendedInstrumentDetail).toBeGreaterThan(far[mode].resolvedInstrumentDetail);
      expect(far[mode].extendedInstrumentDetail).toBeLessThan(near[mode].extendedInstrumentDetail);
      expect(far[mode].resolvedInstrumentDetail).toBeLessThan(near[mode].resolvedInstrumentDetail);
    }

    expectFarFieldSuppression(
      near.radio,
      far.radio,
      ['radioVelocityMapOpacity'],
      'radio',
    );
    expectFarFieldSuppression(
      near.infrared,
      far.infrared,
      ['thermalCloudMaxOpacity', 'thermalLaneMaxOpacity'],
      'infrared',
    );
    expectFarFieldSuppression(
      near.xray,
      far.xray,
      [
        'xrayEventMaxOpacity',
        'xrayShockMaxOpacity',
        'xrayOutflowMaxOpacity',
        'xrayJetOpacity',
      ],
      'xray',
    );
    expect(far.xray.xrayNuclearOutflowVisible).toBe(true);

    // An additional settled frame window catches a late animation writer
    // restoring authored opacity after the overview compositor has run.
    stepFrames(40);
    const settledXray = canvas._galaxyGetInstrumentVisualState();
    expectFiniteFields(
      settledXray,
      [
        'extendedInstrumentDetail',
        'resolvedInstrumentDetail',
        'xrayEventMaxOpacity',
        'xrayShockMaxOpacity',
        'xrayOutflowMaxOpacity',
        'xrayJetOpacity',
      ],
      'xray.settled',
    );
    expect(settledXray.extendedInstrumentDetail).toBeCloseTo(far.xray.extendedInstrumentDetail, 3);
    expect(settledXray.resolvedInstrumentDetail).toBeCloseTo(far.xray.resolvedInstrumentDetail, 3);
    for (const field of ['xrayEventMaxOpacity', 'xrayShockMaxOpacity', 'xrayOutflowMaxOpacity', 'xrayJetOpacity']) {
      expect(settledXray[field], field + ' must stay overview-compressed').toBeLessThan(near.xray[field]);
    }

    assertClean();
  }, SCENE_TIMEOUT);
});
