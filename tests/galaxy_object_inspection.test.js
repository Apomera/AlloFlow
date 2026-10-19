import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { installCanvas2DStub, installLoopStubs, installThreeStub } from './helpers/galaxy_three_stub.js';

const LIGHT = { simMode: 'galaxy', starCount: 2500, galaxyQuality: 'balanced', galaxyAutoRotate: false };
const TIMEOUT = 120000;
function closePosition(actual, expected) {
  for (const axis of ['x', 'y', 'z']) expect(actual[axis]).toBeCloseTo(expected[axis], 6);
}
function radiusFromCenter(state) {
  return Math.hypot(...['x', 'y', 'z'].map(axis => state.camera[axis] - state.orbitCenter[axis]));
}

describe('galaxy selected object inspection', () => {
  let host, root, restoreCanvas, restoreThree, loops, originalMedia, errors, now, latest;
  beforeEach(() => {
    resetStemLab();
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    window._galaxyHasLoadedOnce = true;
    window._galaxyPPLoaded = true;
    delete window._galaxyPPLoading;
    delete window._galaxyPPCallbacks;
    originalMedia = window.matchMedia;
    window.matchMedia = vi.fn(query => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
    now = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    restoreCanvas = installCanvas2DStub().restore;
    restoreThree = installThreeStub();
    const Attribute = window.THREE.BufferAttribute;
    window.THREE.BufferAttribute = function (array, itemSize) {
      const attribute = new Attribute(array, itemSize);
      attribute.setXYZ = (index, x, y, z) => { attribute.array[index * itemSize] = x; attribute.array[index * itemSize + 1] = y; attribute.array[index * itemSize + 2] = z; return attribute; };
      return attribute;
    };
    loops = installLoopStubs();
    errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    host = document.createElement('div'); document.body.appendChild(host);
  });
  afterEach(async () => {
    if (root) await React.act(async () => root.unmount());
    root = null; host.remove();
    errors.mockRestore(); loops(); restoreThree(); restoreCanvas();
    window.matchMedia = originalMedia;
    delete window._galaxyPPLoaded; delete window._galaxyPPLoading; delete window._galaxyPPCallbacks;
    delete window.THREE; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    vi.restoreAllMocks();
  });
  async function mount(reduced = false) {
    window.matchMedia.mockImplementation(query => ({ matches: reduced && query.includes('prefers-reduced-motion'), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
    window.StemLab.ensureThree = vi.fn(() => Promise.resolve());
    const config = loadTool('stem_lab/stem_tool_galaxy.js', 'galaxy');
    latest = { galaxy: LIGHT };
    function Host() { const state = React.useState(latest); latest = state[0]; return config.render(makeCtx({ toolData: state[0], setToolData: state[1] })); }
    root = ReactDOMClient.createRoot(host);
    await React.act(async () => root.render(React.createElement(Host)));
    const canvas = host.querySelector('[data-galaxy-canvas]');
    expect(typeof canvas._galaxyGetInspectionState).toBe('function');
    return canvas;
  }
  async function step(ms = 1000) { now += ms; await React.act(async () => loops.step()); }
  function clean() { expect(errors.mock.calls.map(call => call.map(String).join(' ')).filter(message => /\[Galaxy\]|\[StemLab\]/.test(message))).toEqual([]); }

  it.each([false, true])('orbits the actual animated star and restores prior framing with reduced motion %s', async reduced => {
    const canvas = await mount(reduced);
    expect(canvas._galaxyInspectSelection()).toBe(false);
    await React.act(async () => canvas._galaxyCycleStar(1));
    const selected = canvas._galaxyGetSelectionVisualState().selectedIndex;
    const before = { ...canvas._galaxyOrbit };
    const beforeCamera = canvas._galaxyGetInspectionState().camera;
    await React.act(async () => expect(canvas._galaxyInspectSelection()).toBe(true));
    await step();
    let state = canvas._galaxyGetInspectionState();
    expect(state).toMatchObject({ active: true, kind: 'star', canInspect: true });
    expect(state.label.length).toBeGreaterThan(0);
    closePosition(state.orbitCenter, canvas._galaxyGetStarVisualState(selected).animated);
    expect(radiusFromCenter(state)).toBeCloseTo(0.3, 6);
    await React.act(async () => { canvas._galaxyOrbit.theta += 0.7; canvas._galaxyOrbit.phi = 0.7; canvas._galaxySetZoomPosition(60); });
    state = canvas._galaxyGetInspectionState();
    expect(radiusFromCenter(state)).toBeCloseTo(canvas._galaxyOrbit.r, 6);
    const centerBefore = { ...state.orbitCenter };
    await step(180000);
    state = canvas._galaxyGetInspectionState();
    closePosition(state.orbitCenter, canvas._galaxyGetStarVisualState(selected).animated);
    if (!reduced) expect(Math.hypot(...['x', 'y', 'z'].map(axis => state.orbitCenter[axis] - centerBefore[axis]))).toBeGreaterThan(0.0001);
    await React.act(async () => expect(canvas._galaxyExitInspection()).toBe(true));
    expect(canvas._galaxyOrbit).toEqual(before);
    expect(canvas._galaxyGetInspectionState().active).toBe(false);
    closePosition(canvas._galaxyGetInspectionState().camera, beforeCamera);
    expect(canvas._galaxyGetSelectionVisualState().selectedIndex).toBe(selected);
    clean();
  }, TIMEOUT);

  it('selects real named nebula sprites, cycles both ways, and cannot inspect a hidden layer', async () => {
    const canvas = await mount(true);
    const changes = [], originalCallback = canvas._onInspectionChange;
    canvas._onInspectionChange = value => { changes.push(value); if (originalCallback) originalCallback(value); };
    await React.act(async () => expect(canvas._galaxyCycleNebula(1)).toBe(true));
    const name = latest.galaxy.selectedNebula;
    const first = canvas._galaxyGetInspectionState();
    expect(first).toMatchObject({ kind: 'nebula', label: name, canInspect: true });
    await React.act(async () => { canvas._galaxyCycleNebula(1); canvas._galaxyCycleNebula(-1); });
    expect(latest.galaxy.selectedNebula).toBe(name);
    expect(canvas._galaxyFocusNebula('not a scene object')).toBe(false);
    await React.act(async () => { canvas._galaxyClearSelection(); expect(canvas._galaxyFocusNebula(name)).toBe(true); expect(canvas._galaxyInspectSelection()).toBe(true); });
    const inspected = canvas._galaxyGetInspectionState();
    expect(inspected.active).toBe(true);
    expect(radiusFromCenter(inspected)).toBeCloseTo(0.3, 6);
    expect(Math.hypot(inspected.orbitCenter.x, inspected.orbitCenter.y, inspected.orbitCenter.z)).toBeGreaterThan(0.01);
    await React.act(async () => { canvas._galaxyExitInspection(); canvas._galaxyClearSelection(); });
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 540 });
    await React.act(async () => canvas.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1, clientX: (inspected.orbitCenter.x + 1) * 400, clientY: (1 - inspected.orbitCenter.y) * 270 })));
    expect(canvas._galaxyGetInspectionState()).toMatchObject({ kind: 'nebula', label: name });
    await React.act(async () => canvas._galaxyInspectSelection());
    await React.act(async () => canvas._setLayerVisibility('nebulae', false));
    expect(canvas._galaxyGetInspectionState()).toMatchObject({ active: false, canInspect: false });
    expect(latest.galaxy.selectedNebula).toBeNull();
    expect(canvas._galaxyFocusNebula(name)).toBe(false);
    expect(canvas._galaxyCycleNebula(1)).toBe(false);
    await React.act(async () => canvas._setLayerVisibility('arms', false));
    expect(canvas._galaxyCycleStar(1)).toBe(false);
    expect(canvas._galaxyGetSelectionVisualState().selectedIndex).toBe(-1);
    expect(changes.some(value => value.active && value.kind === 'nebula' && value.label === name)).toBe(true);
    expect(changes.at(-1)).toMatchObject({ active: false, canInspect: false });
    clean();
  }, TIMEOUT);

  it('resets to the galaxy rather than following a previous inspection, preserving ordinary reset undo', async () => {
    const canvas = await mount(true);
    await React.act(async () => { canvas._galaxyCycleStar(1); canvas._galaxyInspectSelection(); canvas._galaxyResetView(); });
    expect(canvas._galaxyGetInspectionState()).toMatchObject({ active: false, canInspect: false, orbitCenter: { x: 0, y: 0, z: 0 } });
    expect(canvas._galaxyOrbit.r).toBeCloseTo(canvas._galaxyOverviewRadius, 7);
    expect(canvas._galaxyGetSelectionVisualState().selectedIndex).toBe(-1);
    expect(latest.galaxy.selectedStar).toBeNull();
    await step(3000);
    expect(canvas._galaxyGetInspectionState().orbitCenter).toEqual({ x: 0, y: 0, z: 0 });
    await React.act(async () => { canvas._galaxyOrbit.theta = 0.9; canvas._galaxyOrbit.phi = 0.7; canvas._galaxySetZoomPosition(45); });
    const previous = { ...canvas._galaxyOrbit };
    await React.act(async () => { canvas._galaxyResetView(); canvas._galaxyUndoReset(); });
    expect(canvas._galaxyOrbit).toEqual(previous);
    await React.act(async () => { canvas._galaxyCycleStar(1); canvas._galaxyInspectSelection(); });
    expect(latest.galaxy.selectedStarMeasurement).toBeTruthy();
    const quality = host.querySelector('button[aria-label="Set high galaxy rendering detail"]');
    expect(quality).not.toBeNull();
    await React.act(async () => quality.click());
    expect(latest.galaxy.selectedStar).toBeNull();
    expect(latest.galaxy.selectedStarMeasurement).toBeNull();
    const rebuilt = host.querySelector('[data-galaxy-canvas]');
    expect(rebuilt._galaxyGetInspectionState()).toMatchObject({ active: false, canInspect: false });
    clean();
  }, TIMEOUT);

  it('uses the first double-click pick and releases inspection APIs during teardown', async () => {
    const canvas = await mount(true);
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 540 });
    const sample = canvas._galaxyGetStarVisualState(100).animated;
    const coordinates = { bubbles: true, clientX: (sample.x + 1) * 400, clientY: (1 - sample.y) * 270 };
    await React.act(async () => canvas.dispatchEvent(new MouseEvent('click', { ...coordinates, detail: 1 })));
    const selected = canvas._galaxyGetInspectionState();
    expect(selected.canInspect).toBe(true);
    await React.act(async () => { canvas.dispatchEvent(new MouseEvent('click', { ...coordinates, detail: 2 })); canvas.dispatchEvent(new MouseEvent('dblclick', { ...coordinates, detail: 2 })); });
    expect(canvas._galaxyGetInspectionState()).toMatchObject({ active: true, kind: selected.kind, label: selected.label });
    const inspect = canvas._galaxyInspectSelection;
    const focus = canvas._galaxyFocusNebula;
    await React.act(async () => root.unmount()); root = null;
    for (const api of ['_galaxyInspectSelection', '_galaxyExitInspection', '_galaxyGetInspectionState', '_galaxyFocusNebula', '_galaxyCycleNebula']) expect(canvas[api]).toBeNull();
    expect(inspect()).toBe(false);
    expect(focus(selected.label)).toBe(false);
    clean();
  }, TIMEOUT);
});
