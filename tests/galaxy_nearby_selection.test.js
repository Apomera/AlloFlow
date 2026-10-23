import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { installCanvas2DStub, installLoopStubs, installThreeStub } from './helpers/galaxy_three_stub.js';

const TIMEOUT = 120000;
const samePoint = (actual, expected) => ['x', 'y', 'z'].forEach(axis => expect(actual[axis]).toBeCloseTo(expected[axis], 6));
describe('galaxy objects at the same screen point', () => {
  let host, root, restoreCanvas, restoreThree, loops, originalMedia, errors, now, latest;
  beforeEach(() => {
    resetStemLab(); globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    window._galaxyHasLoadedOnce = true; window._galaxyPPLoaded = true;
    originalMedia = window.matchMedia;
    window.matchMedia = vi.fn(query => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
    now = 1000000; vi.spyOn(Date, 'now').mockImplementation(() => now);
    restoreCanvas = installCanvas2DStub().restore; restoreThree = installThreeStub();
    const Attribute = window.THREE.BufferAttribute;
    window.THREE.BufferAttribute = function (array, itemSize) { const attribute = new Attribute(array, itemSize); attribute.setXYZ = (index, x, y, z) => { attribute.array[index * itemSize] = x; attribute.array[index * itemSize + 1] = y; attribute.array[index * itemSize + 2] = z; return attribute; }; return attribute; };
    loops = installLoopStubs(); errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    host = document.createElement('div'); document.body.appendChild(host);
  });
  afterEach(async () => {
    if (root) await React.act(async () => root.unmount()); root = null; host.remove(); errors.mockRestore();
    loops(); restoreThree(); restoreCanvas(); window.matchMedia = originalMedia;
    delete window.THREE; delete window._galaxyPPLoaded; delete globalThis.IS_REACT_ACT_ENVIRONMENT; vi.restoreAllMocks();
  });
  async function mount(reduced = true) {
    window.matchMedia.mockImplementation(query => ({ matches: reduced && query.includes('prefers-reduced-motion'), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
    window.StemLab.ensureThree = vi.fn(() => Promise.resolve());
    const config = loadTool('stem_lab/stem_tool_galaxy.js', 'galaxy'); latest = { galaxy: { simMode: 'galaxy', starCount: 2500, galaxyAutoRotate: false, galaxyQuality: 'balanced' } };
    function Host() { const state = React.useState(latest); latest = state[0]; return config.render(makeCtx({ toolData: state[0], setToolData: state[1] })); }
    root = ReactDOMClient.createRoot(host); await React.act(async () => root.render(React.createElement(Host)));
    const canvas = host.querySelector('[data-galaxy-canvas]');
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 540 });
    expect(typeof canvas._galaxyCycleNearby).toBe('function'); return canvas;
  }
  const inspection = canvas => canvas._galaxyGetInspectionState();
  const selected = canvas => canvas._galaxyGetSelectionVisualState().selectedIndex;
  async function clickCore(canvas) {
    await React.act(async () => canvas.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1, clientX: 400, clientY: 270 })));
    const state = inspection(canvas); expect(state.kind).toBe('star'); expect(state.nearbyCount).toBe(12); expect(state.nearbyTotal).toBeGreaterThan(12); return state;
  }
  async function step(ms = 1000) { now += ms; await React.act(async () => loops.step()); }
  function clean() { expect(errors.mock.calls.map(call => call.map(String).join(' ')).filter(message => /\[Galaxy\]|\[StemLab\]/.test(message))).toEqual([]); }

  it('bounds a crowded screen point, exposes the true total and wraps through distinct stable live stars', async () => {
    const canvas = await mount();
    expect(inspection(canvas)).toMatchObject({ nearbyIndex: -1, nearbyCount: 0, nearbyTotal: 0 });
    const initial = await clickCore(canvas), first = selected(canvas), indices = [first];
    expect(initial.nearbyIndex).toBe(0);
    for (let index = 1; index < 12; index++) {
      await React.act(async () => expect(canvas._galaxyCycleNearby(1)).toBe(true));
      expect(inspection(canvas)).toMatchObject({ nearbyIndex: index, nearbyCount: 12, nearbyTotal: initial.nearbyTotal });
      const chosen = selected(canvas), position = canvas._galaxyGetStarVisualState(chosen).animated;
      expect(Math.hypot(position.x * 400, position.y * 270)).toBeLessThan(12);
      indices.push(chosen); expect(latest.galaxy.selectedStarMeasurement.index).toBe(chosen);
    }
    expect(new Set(indices).size).toBe(12);
    await React.act(async () => canvas._galaxyCycleNearby(1)); expect(selected(canvas)).toBe(first);
    await React.act(async () => canvas._galaxyCycleNearby(-1)); expect(selected(canvas)).toBe(indices.at(-1));
    clean();
  }, TIMEOUT);

  it.each([false, true])('browses during inspection without losing framing or return history with reduced motion %s', async reduced => {
    const canvas = await mount(reduced); await clickCore(canvas);
    const original = { ...canvas._galaxyOrbit };
    await React.act(async () => canvas._galaxyInspectSelection()); await step();
    await React.act(async () => { canvas._galaxyOrbit.theta = 0.6; canvas._galaxyOrbit.phi = 0.7; canvas._galaxySetZoomPosition(65); });
    const closeup = { ...canvas._galaxyOrbit }, before = inspection(canvas).camera;
    await React.act(async () => canvas._galaxyCycleNearby(1));
    expect(inspection(canvas).active).toBe(true); expect(canvas._galaxyOrbit).toEqual(closeup);
    if (!reduced) samePoint(inspection(canvas).camera, before);
    await step();
    const chosen = selected(canvas), state = inspection(canvas);
    samePoint(state.orbitCenter, canvas._galaxyGetStarVisualState(chosen).animated);
    expect(Math.hypot(...['x', 'y', 'z'].map(axis => state.camera[axis] - state.orbitCenter[axis]))).toBeCloseTo(closeup.r, 6);
    await step(180000); samePoint(inspection(canvas).orbitCenter, canvas._galaxyGetStarVisualState(chosen).animated);
    await React.act(async () => canvas._galaxyExitInspection()); expect(canvas._galaxyOrbit).toEqual(original);
    expect(inspection(canvas).nearbyCount).toBe(12);
    clean();
  }, TIMEOUT);

  it('clears the screen-point list when the signal, population or selection changes while preserving ordinary close-up browsing', async () => {
    const canvas = await mount(); await clickCore(canvas);
    await React.act(async () => canvas._setObserveMode('infrared'));
    expect(inspection(canvas)).toMatchObject({ nearbyCount: 0, nearbyTotal: 0, canInspect: true }); expect(canvas._galaxyCycleNearby(1)).toBe(false);
    await clickCore(canvas); await React.act(async () => canvas._galaxyInspectSelection());
    const orbit = { ...canvas._galaxyOrbit }, clickedIndex = selected(canvas);
    await React.act(async () => canvas._galaxyCycleStar(1)); expect(inspection(canvas)).toMatchObject({ active: true, nearbyCount: 0 }); expect(canvas._galaxyOrbit).toEqual(orbit);
    expect(selected(canvas)).toBe((clickedIndex + Math.floor(2500 / 47)) % 2500);
    await React.act(async () => canvas._galaxyCycleNebula(1)); expect(inspection(canvas)).toMatchObject({ active: true, kind: 'nebula' }); expect(canvas._galaxyOrbit).toEqual(orbit);
    await React.act(async () => canvas._setLayerVisibility('nebulae', false)); expect(inspection(canvas)).toMatchObject({ active: false, nearbyCount: 0, canInspect: false });
    await React.act(async () => canvas._galaxyClearSelection()); expect(canvas._galaxyCycleNearby(-1)).toBe(false);
    const cycle = canvas._galaxyCycleNearby;
    await React.act(async () => root.unmount()); root = null; expect(canvas._galaxyCycleNearby).toBeNull(); expect(cycle(1)).toBe(false);
    clean();
  }, TIMEOUT);

  it.each([[false, '_galaxyResetView'], [true, '_galaxyResetView'], [false, '_galaxyResetZoom'], [true, '_galaxyResetZoom']])('adapts %s motion %s and Undo to a changing overview without a camera jump', async (reduced, action) => {
    const canvas = await mount(reduced);
    const resize = async width => { Object.defineProperty(canvas, 'offsetWidth', { configurable: true, value: width }); await React.act(async () => loops.resize(canvas)); };
    await resize(1600);
    await clickCore(canvas);
    await React.act(async () => { canvas._galaxyOrbit.theta = 0.8; canvas._galaxyOrbit.phi = 0.6; canvas._galaxySetZoomPosition(65); });
    const original = { ...canvas._galaxyOrbit }, ratio = original.r / canvas._galaxyOverviewRadius, oldHome = canvas._galaxyOverviewRadius;
    await React.act(async () => canvas[action]()); await step(120);
    const during = inspection(canvas).camera;
    await resize(320); expect(canvas._galaxyOverviewRadius).toBeGreaterThan(oldHome);
    if (!reduced) samePoint(inspection(canvas).camera, during);
    await step(600);
    expect(canvas._galaxyOrbit.r).toBeCloseTo(canvas._galaxyOverviewRadius, 6);
    expect(canvas._galaxyOrbit.theta).toBeCloseTo(action === '_galaxyResetView' ? Math.PI * 0.1 : original.theta, 6);
    expect(canvas._galaxyOrbit.phi).toBeCloseTo(action === '_galaxyResetView' ? Math.PI * 0.35 : original.phi, 6);
    if (reduced) await resize(1600);
    await React.act(async () => canvas._galaxyUndoReset()); await step(120);
    if (!reduced) { const before = inspection(canvas).camera; await resize(1600); samePoint(inspection(canvas).camera, before); }
    await step(600);
    expect(canvas._galaxyOrbit.r / canvas._galaxyOverviewRadius).toBeCloseTo(ratio, 6);
    expect(canvas._galaxyOrbit.theta).toBeCloseTo(original.theta, 6); expect(canvas._galaxyOrbit.phi).toBeCloseTo(original.phi, 6);
    clean();
  }, TIMEOUT);
});
