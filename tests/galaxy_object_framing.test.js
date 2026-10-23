import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { installCanvas2DStub, installLoopStubs, installThreeStub } from './helpers/galaxy_three_stub.js';

const TIMEOUT = 120000;
describe('galaxy whole-object framing', () => {
  let host, root, restoreCanvas, restoreThree, loops, originalMedia, errors, now, camera, meshes;
  beforeEach(() => {
    resetStemLab(); globalThis.IS_REACT_ACT_ENVIRONMENT = true; window._galaxyHasLoadedOnce = true; window._galaxyPPLoaded = true;
    originalMedia = window.matchMedia; now = 1000000; vi.spyOn(Date, 'now').mockImplementation(() => now);
    restoreCanvas = installCanvas2DStub().restore; restoreThree = installThreeStub(); loops = installLoopStubs();
    const Attribute = window.THREE.BufferAttribute, Camera = window.THREE.PerspectiveCamera, Renderer = window.THREE.WebGLRenderer;
    window.THREE.BufferAttribute = function (array, itemSize) { const value = new Attribute(array, itemSize); value.setXYZ = (i, x, y, z) => { value.array[i * itemSize] = x; value.array[i * itemSize + 1] = y; value.array[i * itemSize + 2] = z; return value; }; return value; };
    window.THREE.PerspectiveCamera = function (...args) { camera = new Camera(...args); camera.near = args[2]; camera.setViewOffset = (fullWidth, fullHeight, offsetX, offsetY, width, height) => { camera.view = { enabled: true, fullWidth, fullHeight, offsetX, offsetY, width, height }; }; camera.clearViewOffset = () => { if (camera.view) camera.view.enabled = false; }; return camera; };
    window.THREE.WebGLRenderer = function (...args) { const renderer = new Renderer(...args), render = renderer.render; renderer.render = function (scene, ...rest) { meshes = []; scene.traverse(node => { if (node.name === 'inspectedPlanetaryGasShell' || node.name === 'inspectedCrabStructure') meshes.push(node); }); return render.call(renderer, scene, ...rest); }; return renderer; };
    errors = vi.spyOn(console, 'error').mockImplementation(() => {}); host = document.createElement('div'); document.body.appendChild(host);
  });
  afterEach(async () => {
    if (root) await React.act(async () => root.unmount()); root = null; host.remove(); errors.mockRestore(); loops(); restoreThree(); restoreCanvas(); window.matchMedia = originalMedia;
    delete window.THREE; delete window._galaxyPPLoaded; delete globalThis.IS_REACT_ACT_ENVIRONMENT; vi.restoreAllMocks();
  });
  async function act(fn) { await React.act(async () => fn()); }
  async function step(ms = 1000) { now += ms; await act(() => loops.step()); }
  async function mount(reduced = true) {
    window.matchMedia = vi.fn(query => ({ matches: reduced && query.includes('prefers-reduced-motion'), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
    window.StemLab.ensureThree = vi.fn(() => Promise.resolve()); const config = loadTool('stem_lab/stem_tool_galaxy.js', 'galaxy');
    function Host() { const state = React.useState({ galaxy: { simMode: 'galaxy', starCount: 2500, galaxyAutoRotate: false, galaxyQuality: 'balanced' } }); return config.render(makeCtx({ toolData: state[0], setToolData: state[1] })); }
    root = ReactDOMClient.createRoot(host); await act(() => root.render(React.createElement(Host)));
    const canvas = host.querySelector('[data-galaxy-canvas]'); canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: canvas.offsetWidth, height: canvas.offsetHeight });
    await resize(canvas, 1000, 640); await step(); return canvas;
  }
  async function resize(canvas, width, height) { Object.defineProperty(canvas, 'offsetWidth', { configurable: true, value: width }); Object.defineProperty(canvas, 'offsetHeight', { configurable: true, value: height }); await act(() => loops.resize(canvas)); }
  function owner(kind = 'planetary') { return meshes.find(node => kind === 'crab' ? node.name === 'inspectedCrabStructure' : node.name === 'inspectedPlanetaryGasShell').userData.nebulaName; }
  const framing = canvas => canvas._galaxyGetObjectFramingState();
  const orbit = canvas => ({ ...canvas._galaxyOrbit });
  const view = canvas => ({ ...orbit(canvas), camera: canvas._galaxyGetInspectionState().camera, offset: camera.view ? { ...camera.view } : null });
  async function inspect(canvas, name = owner()) { await act(() => { canvas._galaxyFocusNebula(name); canvas._galaxyInspectSelection(); }); await step(); }
  function clean() { expect(errors.mock.calls.map(call => call.map(String).join(' ')).filter(message => /\[Galaxy\]|\[StemLab\]/.test(message))).toEqual([]); }
  function overlay(node, box) { node.getBoundingClientRect = vi.fn(() => ({ ...box, width: box.right - box.left, height: box.bottom - box.top })); }
  function overlays(canvas) {
    const stage = canvas.parentElement;
    overlay(stage.querySelector('[data-galaxy-selection-dock]'), { left: 12, top: 430, right: 412, bottom: 628 });
    overlay(stage.querySelector('[data-galaxy-camera-controls]'), { left: 890, top: 360, right: 988, bottom: 628 });
    overlay(stage.querySelector('[data-galaxy-spectral-legend]'), { left: 12, top: 12, right: 180, bottom: 76 });
  }

  it('fits the actual full-owner geometry into a clear ROI while preserving pose, components and the original return', async () => {
    const canvas = await mount(), names = [...new Set(meshes.map(mesh => mesh.userData.nebulaName))]; expect(names).toHaveLength(3);
    for (const name of names) {
      await act(() => canvas._galaxyClearSelection()); const original = orbit(canvas);
      await inspect(canvas, name); expect(host.querySelector('[data-galaxy-center-crosshair]')).toBeNull(); overlays(canvas); await act(() => { canvas._galaxyOrbit.theta = 0.8; canvas._galaxyOrbit.phi = 0.75; canvas._galaxyUpdateCam(); expect(canvas._galaxyFrameObject()).toBe(true); });
      const state = framing(canvas); expect(state).toMatchObject({ contextual: true, available: true, framed: true, zoomPercent: 100 });
      expect(canvas._galaxyOrbit.theta).toBe(0.8); expect(canvas._galaxyOrbit.phi).toBe(0.75); expect(camera.view.enabled).toBe(true);
      expect(state.roi.x).toBeGreaterThan(412); expect(state.roi.x + state.roi.width).toBeLessThan(890);
      let actualRadius = 0;
      meshes.filter(mesh => mesh.userData.nebulaName === name).forEach(mesh => { const array = mesh.geometry.attributes.position.array; for (let index = 0; index < array.length; index += 3) actualRadius = Math.max(actualRadius, Math.hypot(array[index] * mesh.scale.x, array[index + 1] * mesh.scale.y, array[index + 2] * mesh.scale.z)); });
      expect(state.boundsRadius).toBeCloseTo(actualRadius, 7); expect(state.minRadius).toBeGreaterThan(actualRadius + camera.near);
      const focalPixels = canvas.offsetHeight / (2 * Math.tan(camera.fov * Math.PI / 360));
      const projectedSphereRadius = state.boundsRadius / Math.sqrt(state.fitRadius ** 2 - state.boundsRadius ** 2) * focalPixels;
      expect(projectedSphereRadius * 2).toBeLessThan(Math.min(state.roi.width, state.roi.height));
      await act(() => canvas._galaxyExitInspection()); expect(orbit(canvas)).toEqual(original); expect(camera.view.enabled).toBe(false);
    }
    clean();
  }, TIMEOUT);

  it('starts the frame transition without moving the camera or projection, then freezes both when interrupted', async () => {
    const canvas = await mount(false); await inspect(canvas); overlays(canvas);
    const before = view(canvas); await act(() => canvas._galaxyFrameObject());
    expect(orbit(canvas)).toEqual({ theta: before.theta, phi: before.phi, r: before.r }); expect(canvas._galaxyGetInspectionState().camera).toEqual(before.camera);
    expect(camera.view.offsetX).toBe(0); expect(camera.view.offsetY).toBe(0);
    await step(120); expect(Math.abs(camera.view.offsetX) + Math.abs(camera.view.offsetY)).toBeGreaterThan(0);
    await act(() => canvas._galaxyCancelCameraMotion()); const frozen = view(canvas); await step(1000); expect(view(canvas)).toEqual(frozen); clean();
  }, TIMEOUT);

  it('preserves a framed close-up, limits and zoom reference through every signal and a tiny wheel round trip', async () => {
    const canvas = await mount(); await inspect(canvas); await act(() => { canvas._galaxySetHudHidden(true); }); await step();
    await act(() => canvas._galaxyFrameObject()); const before = view(canvas), fit = framing(canvas); expect(before.r).toBeLessThan(0.2);
    for (const band of ['infrared', 'radio', 'xray', 'gravity', 'visible']) {
      await act(() => canvas._setObserveMode(band)); await step(); expect(view(canvas)).toEqual(before);
      expect(framing(canvas)).toMatchObject({ contextual: true, minRadius: fit.minRadius, fitRadius: fit.fitRadius, available: band === 'visible' || band === 'infrared' });
      if (band === 'radio') {
        await act(() => { expect(canvas._galaxyFrameObject()).toBe(false); expect(canvas._galaxyResetZoom()).toBe(false); });
        await act(() => { canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: 1, bubbles: true, cancelable: true })); canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -1, bubbles: true, cancelable: true })); });
        expect(canvas._galaxyOrbit.r).toBeCloseTo(before.r, 10);
      }
    }
    clean();
  }, TIMEOUT);

  it('keeps Crab component comparison camera-neutral, including hiding both components', async () => {
    const canvas = await mount(); await inspect(canvas, owner('crab')); await act(() => canvas._galaxyFrameObject()); const before = view(canvas), fit = framing(canvas).fitRadius;
    for (const [kind, visible] of [['wind', false], ['filaments', false], ['wind', true], ['filaments', true]]) {
      await act(() => canvas._galaxySetCrabComponent(kind, visible)); await step(); expect(view(canvas)).toEqual(before); expect(framing(canvas).fitRadius).toBe(fit);
    }
    clean();
  }, TIMEOUT);

  it('shares the object minimum across slider, wheel, pinch, buttons and restores fine zoom with contextual Fit Undo', async () => {
    const canvas = await mount(); await inspect(canvas); await act(() => canvas._galaxyFrameObject()); const min = framing(canvas).minRadius;
    expect(min).toBeLessThan(0.2); await act(() => canvas._galaxySetZoomPosition(100)); expect(canvas._galaxyOrbit.r).toBeCloseTo(min, 10);
    await act(() => { canvas._galaxyZoom('in'); canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -1000, bubbles: true, cancelable: true })); }); expect(canvas._galaxyOrbit.r).toBe(min);
    await act(() => canvas._galaxyResetZoom()); expect(canvas._galaxyOrbit.r).toBe(framing(canvas).fitRadius);
    await act(() => canvas._galaxyUndoReset()); expect(canvas._galaxyOrbit.r).toBeCloseTo(min, 10);
    await act(() => { canvas._galaxyCycleStar(1); canvas._galaxySetZoomPosition(100); }); expect(canvas._galaxyOrbit.r).toBe(0.2); expect(framing(canvas).contextual).toBe(false); clean();
  }, TIMEOUT);

  it('refits relative zoom on a real viewport resize and never measures overlays in the animation loop', async () => {
    const canvas = await mount(); await inspect(canvas); overlays(canvas); await act(() => canvas._galaxyFrameObject()); await step();
    await act(() => canvas._galaxyZoom('out')); const ratio = canvas._galaxyOrbit.r / framing(canvas).fitRadius;
    const spectral = host.querySelector('[data-galaxy-spectral-legend]'); spectral.getBoundingClientRect.mockClear();
    for (let index = 0; index < 20; index++) await step(16);
    expect(spectral.getBoundingClientRect).not.toHaveBeenCalled();
    overlay(host.querySelector('[data-galaxy-selection-dock]'), { left: 12, top: 440, right: 180, bottom: 606 }); overlay(host.querySelector('[data-galaxy-camera-controls]'), { left: 210, top: 350, right: 308, bottom: 606 });
    await resize(canvas, 320, 618); await step(); expect(canvas._galaxyOrbit.r / framing(canvas).fitRadius).toBeCloseTo(ratio, 6);
    expect(framing(canvas).roi.x).toBe(16); expect(framing(canvas).roi.y + framing(canvas).roi.height).toBeLessThan(350); clean();
  }, TIMEOUT);

  it.each([false, true])('restores both projection and zoom after contextual Fit Undo with reduced motion %s', async reduced => {
    const canvas = await mount(reduced); await inspect(canvas); overlays(canvas);
    await act(() => canvas._galaxySetZoomPosition(80)); const initial = orbit(canvas);
    expect(framing(canvas).framed).toBe(false);
    await act(() => canvas._galaxyResetZoom()); await step(); expect(framing(canvas).framed).toBe(true);
    const fitted = view(canvas); await act(() => canvas._galaxyUndoReset());
    if (!reduced) expect(view(canvas)).toEqual(fitted);
    await step(); expect(framing(canvas).framed).toBe(false); expect(camera.view.enabled).toBe(false);
    expect(canvas._galaxyOrbit.r).toBeCloseTo(initial.r, 8); expect(canvas._galaxyOrbit.theta).toBeCloseTo(initial.theta, 8); expect(canvas._galaxyOrbit.phi).toBeCloseTo(initial.phi, 8);
    await act(() => canvas._galaxyFrameObject()); await step(); await act(() => canvas._galaxyZoom('out')); const alreadyFramed = view(canvas);
    await act(() => canvas._galaxyResetZoom()); await step(); await act(() => canvas._galaxyUndoReset()); await step();
    expect(framing(canvas).framed).toBe(true); expect(view(canvas).offset).toEqual(alreadyFramed.offset); expect(canvas._galaxyOrbit.r).toBeCloseTo(alreadyFramed.r, 8); clean();
  }, TIMEOUT);

  it.each([false, true])('browses from a manually adjusted framed mesh to a centered regular nebula with reduced motion %s', async reduced => {
    const canvas = await mount(reduced); await inspect(canvas); overlays(canvas);
    await act(() => canvas._galaxyFrameObject()); await step();
    await act(() => canvas._galaxySetZoomPosition(100)); const before = view(canvas); expect(before.r).toBeLessThan(0.2);
    expect(Math.abs(before.offset.offsetX) + Math.abs(before.offset.offsetY)).toBeGreaterThan(0);
    const meshOwners = new Set(meshes.map(mesh => mesh.userData.nebulaName));
    await act(() => host.querySelector('[data-galaxy-control-tab="discover"]').click());
    const regular = [...host.querySelectorAll('[data-galaxy-nebula-target]')].map(node => node.getAttribute('data-galaxy-nebula-target')).find(name => !meshOwners.has(name));
    expect(regular).toBeTruthy(); await act(() => canvas._galaxyFocusNebula(regular));
    if (!reduced) {
      expect(canvas._galaxyGetInspectionState().camera).toEqual(before.camera); expect(canvas._galaxyOrbit.r).toBe(before.r); expect(view(canvas).offset).toEqual(before.offset);
    } else expect(camera.view.enabled).toBe(false);
    await step(); expect(canvas._galaxyGetInspectionState()).toMatchObject({ active: true, label: regular });
    expect(framing(canvas).contextual).toBe(false); expect(canvas._galaxyOrbit.r).toBeGreaterThanOrEqual(0.2); expect(camera.view.enabled).toBe(false); clean();
  }, TIMEOUT);

  it.each([false, true])('keeps the inspection lens steady over time with reduced motion %s', async reduced => {
    const canvas = await mount(reduced);
    await inspect(canvas);
    for (const elapsed of [5000, 11000, 30000]) {
      await step(elapsed);
      expect(camera.fov).toBe(60);
    }
    if (reduced) {
      await act(() => canvas._galaxyClearSelection());
      await step(17000);
      expect(camera.fov).toBe(60);
    }
    clean();
  }, TIMEOUT);

  it('keeps host/star framing unchanged and disposes new APIs and observers with the scene', async () => {
    const canvas = await mount(); expect(canvas._galaxyFrameObject()).toBe(false);
    await act(() => { canvas._galaxyCycleStar(1); canvas._galaxyInspectSelection(); }); expect(framing(canvas)).toMatchObject({ contextual: false, available: false, minRadius: 0.2 });
    await act(() => canvas._galaxyResetZoom()); expect(canvas._galaxyOrbit.r).toBe(canvas._galaxyOverviewRadius);
    const frame = canvas._galaxyFrameObject; await act(() => root.unmount()); root = null;
    expect(canvas._galaxyFrameObject).toBeNull(); expect(canvas._galaxyGetObjectFramingState).toBeNull(); expect(frame()).toBe(false);
    expect(loops.resizeObservers.filter(observer => !observer.__disconnected && observer.__targets.size)).toEqual([]); clean();
  }, TIMEOUT);
});
