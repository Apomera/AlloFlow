import fs from 'node:fs';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  resetStemLab
} from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const THREE = require('../vendor/three-r128/three.min.js');
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function startingSim(overrides = {}) {
  return Object.assign({
    year: 0,
    fuelLoad: 15,
    canopyCover: 60,
    understoryDensity: 20,
    biodiversity: 85,
    soilHealth: 70,
    carbonStored: 50,
    waterYield: 80,
    yearsSinceLastBurn: 0,
    totalBurns: 0,
    wildfires: 0,
    strategy: 'indigenous',
    visualSequence: 0,
    visualEvent: null,
    eventLog: [],
    decade: []
  }, overrides);
}

function buttonByName(host, name) {
  return [...host.querySelectorAll('button')].find((button) =>
    button.getAttribute('aria-label') === name || button.textContent.trim() === name
  );
}

describe('Fire Ecology controlled-burn visualization', () => {
  let host;
  let root;
  let latest;
  let viewer;
  let viewerConfig;
  let statusListener;
  let rafQueue;
  let reducedMotion;
  let initialFireState;

  beforeEach(() => {
    vi.useFakeTimers();
    reducedMotion = false;
    initialFireState = { tab: 'simulator', simViewMode: '3d' };
    rafQueue = [];

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({
        matches: reducedMotion,
        media: '(prefers-reduced-motion: reduce)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }))
    });
    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: vi.fn((callback) => {
        rafQueue.push(callback);
        return rafQueue.length;
      })
    });
    Object.defineProperty(window, 'cancelAnimationFrame', {
      configurable: true,
      value: vi.fn()
    });
    Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn()
    });
    Object.defineProperty(window.HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: vi.fn(() => null)
    });

    const registry = resetStemLab();
    viewer = {
      attach: vi.fn(),
      push: vi.fn(),
      onStatusChange: vi.fn((listener) => { statusListener = listener; }),
      status: vi.fn(() => 'idle'),
      debug: vi.fn(() => ({ state: 'idle' })),
      dispose: vi.fn()
    };
    registry.makeOrbitViewer = vi.fn((config) => {
      viewerConfig = config;
      return viewer;
    });

    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(async () => {
    vi.clearAllTimers();
    if (root) await act(async () => { root.unmount(); });
    if (host) host.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  async function mount() {
    const config = loadTool('stem_lab/stem_tool_fireecology.js', 'fireEcology');
    function Harness() {
      const [toolData, setToolData] = React.useState({ fireEcology: initialFireState });
      latest = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    }
    await act(async () => {
      root.render(React.createElement(Harness));
      await Promise.resolve();
    });
    return config;
  }

  async function flushRaf() {
    let guard = 0;
    while (rafQueue.length && guard < 20) {
      const batch = rafQueue.splice(0);
      batch.forEach((callback) => callback(performance.now()));
      await Promise.resolve();
      guard += 1;
    }
    expect(guard).toBeLessThan(20);
  }

  it('keeps a cultural-burn replay presentation-only and completes playback', async () => {
    await mount();
    const action = buttonByName(host, 'Cultural Burn (+10 yrs)');
    expect(action).toBeTruthy();

    await act(async () => {
      action.click();
      await Promise.resolve();
      await flushRaf();
    });

    const event = latest.fireEcology.sim.visualEvent;
    expect(event).toMatchObject({
      kind: 'culturalBurn',
      intensity: 'illustrated-patchier-surface-fire',
      sequence: 1,
      before: { fuelLoad: 15 },
      after: { fuelLoad: 7 }
    });
    expect(event).not.toHaveProperty('startedAt');
    expect(latest.fireEcology.simVisualFrame).toBe('animate');
    expect(latest.fireEcology.simVisualReplay).toBe(1);

    const visualRegion = host.querySelector('#fireecology-sim-visual-shell');
    expect(visualRegion).toBeTruthy();
    expect(visualRegion.getAttribute('data-visual-kind')).toBe('culturalBurn');
    expect(document.activeElement).toBe(visualRegion);
    expect(visualRegion.scrollIntoView).toHaveBeenCalled();
    expect(host.textContent).toContain('illustrated patchier surface fire');

    const deltaComparison = host.querySelector('.fireecology-sim-deltas');
    expect(deltaComparison).toBeTruthy();
    expect(deltaComparison.querySelectorAll('.fireecology-sim-delta')).toHaveLength(4);
    const fuelDelta = deltaComparison.querySelector('[data-metric="fuel"]');
    expect(fuelDelta.getAttribute('data-direction')).toBe('decreased');
    expect(fuelDelta.getAttribute('data-difference')).toBe('-8');
    expect(fuelDelta.textContent).toContain('15 t/acre');
    expect(fuelDelta.textContent).toContain('7 t/acre');
    expect(fuelDelta.textContent).toContain('decreased by 8 t/acre');
    expect(fuelDelta.querySelector('.fireecology-sim-delta-bars').getAttribute('aria-hidden')).toBe('true');

    const firstPush = viewer.push.mock.calls.at(-1)[0];
    expect(firstPush).toMatchObject({
      visualEvent: expect.objectContaining({ kind: 'culturalBurn' }),
      playbackToken: 1,
      frame: 'animate',
      static: false
    });

    const simAfterAction = latest.fireEcology.sim;
    const serializedResult = JSON.stringify(simAfterAction);
    await act(async () => {
      buttonByName(host, 'Pause').click();
      await Promise.resolve();
    });
    expect(latest.fireEcology.simVisualPaused).toBe(true);
    expect(JSON.stringify(latest.fireEcology.sim)).toBe(serializedResult);

    await act(async () => {
      buttonByName(host, 'Resume').click();
      await Promise.resolve();
      buttonByName(host, 'Skip to outcome').click();
      await Promise.resolve();
    });
    expect(latest.fireEcology.simVisualFrame).toBe('outcome');
    expect(latest.fireEcology.sim).toBe(simAfterAction);

    await act(async () => {
      buttonByName(host, 'Replay last change').click();
      await Promise.resolve();
    });
    expect(latest.fireEcology.simVisualReplay).toBe(2);
    expect(latest.fireEcology.sim).toBe(simAfterAction);

    await act(async () => {
      vi.advanceTimersByTime(4400);
      await Promise.resolve();
      await flushRaf();
    });
    expect(latest.fireEcology.simVisualFrame).toBe('outcome');
    expect(latest.fireEcology.sim).toBe(simAfterAction);

    await act(async () => {
      buttonByName(host, 'Rotate left').click();
      await Promise.resolve();
    });
    expect(latest.fireEcology.sim3dRotY).toBe(-46);
    expect(latest.fireEcology.sim).toBe(simAfterAction);

    await act(async () => {
      statusListener('failed');
      await Promise.resolve();
    });
    expect(latest.fireEcology.simViewMode).toBe('2d');
    expect(latest.fireEcology.sim3dFallback).toBe(true);
    expect(latest.fireEcology.sim).toBe(simAfterAction);
    expect(host.textContent).toContain('All simulation results are preserved');
  });

  it('offers static treatment phases when reduced motion is requested', async () => {
    reducedMotion = true;
    await mount();

    await act(async () => {
      buttonByName(host, 'Prescribed Burn (+10 yrs)').click();
      await Promise.resolve();
      await flushRaf();
    });

    expect(latest.fireEcology.sim.visualEvent).toMatchObject({
      kind: 'prescribedBurn',
      intensity: 'illustrated-broader-surface-fire'
    });
    expect(latest.fireEcology.simVisualFrame).toBe('during');
    expect(buttonByName(host, 'Pause')).toBeUndefined();
    expect(buttonByName(host, 'Before treatment')).toBeTruthy();
    expect(buttonByName(host, 'During treatment')).toBeTruthy();
    expect(buttonByName(host, 'Outcome')).toBeTruthy();

    const result = latest.fireEcology.sim;
    await act(async () => {
      buttonByName(host, 'Before treatment').click();
      await Promise.resolve();
      await flushRaf();
    });
    expect(latest.fireEcology.simVisualFrame).toBe('before');
    expect(latest.fireEcology.sim).toBe(result);
    expect(viewer.push.mock.calls.at(-1)[0]).toMatchObject({ frame: 'before', static: true });
  });

  it('renders comparison landscapes and announces their modeled divergence', async () => {
    initialFireState = { tab: 'simulator', simViewMode: '2d', comparisonMode: true };
    await mount();

    const scenesBefore = host.querySelectorAll('.fireecology-compare-scene');
    expect(scenesBefore).toHaveLength(2);
    expect(scenesBefore[0].getAttribute('aria-label')).toContain('fuel load 15 tons per acre');
    expect(host.querySelector('.fireecology-compare-summary').textContent).toContain('same conditions');

    const advanceBoth = [...host.querySelectorAll('button')].find((button) =>
      button.textContent.includes('Advance Both Forests')
    );
    await act(async () => {
      advanceBoth.click();
      await Promise.resolve();
      await flushRaf();
    });

    const scenesAfter = host.querySelectorAll('.fireecology-compare-scene');
    expect(scenesAfter[0].getAttribute('aria-label')).toContain('fuel load 7 tons per acre');
    expect(scenesAfter[1].getAttribute('aria-label')).toContain('fuel load 27 tons per acre');
    expect(host.querySelector('.fireecology-compare-summary').textContent).toContain('20 more tons of fuel per acre');
    expect(host.querySelector('.fireecology-compare-summary').textContent).toContain('16 fewer biodiversity points');
  });

  it('uses the wildfire visual type only when the stochastic wildfire occurs', async () => {
    initialFireState = {
      tab: 'simulator',
      simViewMode: '3d',
      sim: startingSim({ seed: 'classroom-wildfire', year: 30, fuelLoad: 60, yearsSinceLastBurn: 30 })
    };
    await mount();
    vi.spyOn(Math, 'random').mockReturnValue(0);

    await act(async () => {
      buttonByName(host, 'Suppress Fire (+10 yrs)').click();
      await Promise.resolve();
      await flushRaf();
    });

    expect(latest.fireEcology.sim.visualEvent).toMatchObject({
      kind: 'wildfire',
      intensity: 'illustrated-crown-fire'
    });
    expect(host.querySelector('#fireecology-sim-visual-shell').getAttribute('data-visual-kind')).toBe('wildfire');
    expect(host.textContent).toContain('illustrated crown-fire behavior');
  });

  it('cancels an old playback session on unmount before a new mount starts', async () => {
    await mount();
    await act(async () => {
      buttonByName(host, 'Cultural Burn (+10 yrs)').click();
      await Promise.resolve();
    });
    expect(latest.fireEcology.simVisualFrame).toBe('animate');

    await act(async () => { root.unmount(); });
    root = null;
    host.remove();
    host = null;
    vi.advanceTimersByTime(1000);

    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    await mount();
    await act(async () => {
      buttonByName(host, 'Cultural Burn (+10 yrs)').click();
      await Promise.resolve();
      vi.advanceTimersByTime(3400);
      await Promise.resolve();
    });
    // This is when the first mount's timer would have completed. The new
    // session must still be playing for its own full duration.
    expect(latest.fireEcology.simVisualFrame).toBe('animate');

    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
    });
    expect(latest.fireEcology.simVisualFrame).toBe('outcome');
  });
  it('builds the procedural scene with the pinned offline Three r128 API', async () => {
    await mount();
    expect(THREE.REVISION).toBe('128');
    expect(viewerConfig).toBeTruthy();

    const sceneHost = document.createElement('div');
    document.body.appendChild(sceneHost);
    const canvasStub = document.createElement('canvas');
    sceneHost.appendChild(canvasStub);
    const model = new THREE.Group();
    const S = {
      model,
      renderer: { domElement: canvasStub },
      target: new THREE.Vector3(),
      fitPts: null,
      data: null,
      tick: null
    };
    const before = startingSim();
    const after = startingSim({ year: 10, fuelLoad: 7, understoryDensity: 5, biodiversity: 93 });
    const visualEvent = {
      id: 'builder-smoke',
      kind: 'culturalBurn',
      label: 'Cultural burn',
      year: 10,
      sequence: 1,
      before,
      after
    };

    expect(() => viewerConfig.build(THREE, S, {
      visualEvent,
      current: after,
      playbackToken: 1,
      frame: 'during',
      paused: false,
      reducedMotion: true,
      static: true
    })).not.toThrow();
    expect(typeof S.tick).toBe('function');
    expect(() => S.tick(0)).not.toThrow();

    const instances = [];
    model.traverse((child) => {
      if (child.isInstancedMesh) instances.push(child);
    });
    expect(instances.length).toBeGreaterThanOrEqual(8);
    expect(S.fitPts).toHaveLength(5);
    expect(instances.some((mesh) => mesh.material.transparent && mesh.material.depthWrite === false)).toBe(true);

    const geometries = new Set();
    const materials = new Set();
    model.traverse((child) => {
      if (typeof child.dispose === 'function') child.dispose();
      if (child.geometry) geometries.add(child.geometry);
      if (child.material) (Array.isArray(child.material) ? child.material : [child.material]).forEach((material) => materials.add(material));
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    sceneHost.remove();
  });
});

describe('shared orbit-viewer lifecycle contract', () => {
  it('keeps source/public mirrors identical and includes safe failure/disposal paths', () => {
    const source = fs.readFileSync('stem_lab/stem_lab_module.js', 'utf8');
    const mirror = fs.readFileSync('desktop/web-app/public/stem_lab/stem_lab_module.js', 'utf8');
    expect(crypto.createHash('sha256').update(source).digest('hex'))
      .toBe(crypto.createHash('sha256').update(mirror).digest('hex'));
    expect(source).toContain("typeof c.dispose === 'function'");
    expect(source).toContain('function failRuntime(error, phase)');
    expect(source).toContain('retiring.disposing = true');
    expect(source).toContain('S.data && S.data.static');
  });
  it('ignores a stale same-host loader rejection and preserves the ref subscriber', async () => {
    const source = fs.readFileSync('stem_lab/stem_lab_module.js', 'utf8');
    const previousStemLab = window.StemLab;
    const previousModules = window.AlloModules;
    let viewerUnderTest;
    try {
      window.StemLab = undefined;
      window.AlloModules = {};
      // eslint-disable-next-line no-new-func
      new Function(source)();
      const shared = window.StemLab;
      let rejectFirst;
      let rejectSecond;
      const first = new Promise((resolve, reject) => { rejectFirst = reject; });
      const second = new Promise((resolve, reject) => { rejectSecond = reject; });
      shared.ensureThree = vi.fn()
        .mockReturnValueOnce(first)
        .mockReturnValueOnce(second);

      const statuses = [];
      viewerUnderTest = shared.makeOrbitViewer({ build: vi.fn() });
      viewerUnderTest.onStatusChange((status) => statuses.push(status));
      const viewerHost = document.createElement('div');
      document.body.appendChild(viewerHost);

      viewerUnderTest.attach(viewerHost);
      viewerUnderTest.attach(null);
      viewerUnderTest.attach(viewerHost);
      await Promise.resolve();
      rejectFirst(new Error('stale first request'));
      await Promise.resolve();
      await Promise.resolve();
      expect(viewerUnderTest.status()).toBe('loading');

      rejectSecond(new Error('current request'));
      await Promise.resolve();
      await Promise.resolve();
      expect(viewerUnderTest.status()).toBe('failed');
      expect(statuses.at(-1)).toBe('failed');
      viewerHost.remove();
    } finally {
      if (viewerUnderTest) viewerUnderTest.dispose();
      window.StemLab = previousStemLab;
      window.AlloModules = previousModules;
    }
  });
});