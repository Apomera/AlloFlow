import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, ReactDOMServer, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { installCanvas2DStub, installLoopStubs, installThreeStub } from './helpers/galaxy_three_stub.js';

vi.setConfig({ testTimeout: 120000 });
const source = readFileSync('stem_lab/stem_tool_galaxy.js', 'utf8');
const block = source.split('// BEGIN GALAXY PLANETARY PROJECTION')[1].split('// END GALAXY PLANETARY PROJECTION')[0];
const model = new Function(block + ';return {direction:galaxyPlanetaryViewDirection,state:galaxyPlanetaryProjectionState,render:renderGalaxyShellViews,apply:galaxyApplyShellViewDisplay};')();
const realThree = new Function('var exports={};var module={exports:exports};' + readFileSync('vendor/three-r128/three.min.js', 'utf8') + ';return module.exports;')();
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;

describe('Galaxy object-axis exploration math and controls', () => {
  it('uses the true shell axis on either side and chooses the nearest oblique direction', () => {
    const rotation = { x: -0.44, y: 0.28, z: 0.12, order: 'XYZ' };
    const axis = new realThree.Vector3(0, 0, 1).applyEuler(new realThree.Euler(rotation.x, rotation.y, rotation.z, 'XYZ'));
    const side = new realThree.Vector3(1, 0, 0).applyEuler(new realThree.Euler(rotation.x, rotation.y, rotation.z, 'XYZ'));
    for (const sign of [-1, 1]) {
      for (const [angle, projection] of [[0, 'along'], [19, 'free'], [45, 'oblique'], [90, 'across']]) {
        const radians = angle * Math.PI / 180;
        const current = { x: sign * Math.cos(radians) * axis.x + Math.sin(radians) * side.x, y: sign * Math.cos(radians) * axis.y + Math.sin(radians) * side.y, z: sign * Math.cos(radians) * axis.z + Math.sin(radians) * side.z };
        const state = model.state(rotation, current);
        expect(state.angleDegrees).toBeCloseTo(angle, 6); expect(state.projection).toBe(projection);
        const oblique = model.direction(rotation, 'oblique', current);
        expect(Math.abs(dot(oblique.axis, oblique.direction))).toBeCloseTo(Math.SQRT1_2, 9);
        expect(Math.hypot(oblique.direction.x, oblique.direction.y, oblique.direction.z)).toBeCloseTo(1, 9);
        if (angle < 90) expect(Math.sign(dot(oblique.axis, oblique.direction))).toBe(sign);
      }
    }
    expect(model.state(rotation, { x: 0, y: 0, z: 0 })).toBeNull();
  });

  it('presents accessible 44px presets and updates live degrees, pressed state and the optional guide without remounting', () => {
    const holder = document.createElement('div');
    holder.innerHTML = ReactDOMServer.renderToStaticMarkup(model.render({ React, state: { angleDegrees: 45, projection: 'oblique', axisVisible: false }, onView() {}, onAxis() {} }));
    const panel = holder.firstElementChild, angle = holder.querySelector('[data-galaxy-shell-angle]');
    expect(angle.textContent).toBe('Viewing angle: 45° from shell axis');
    expect(holder.querySelector('[data-galaxy-shell-view="oblique"]').getAttribute('aria-pressed')).toBe('true');
    expect(holder.querySelector('[data-galaxy-shell-axis-toggle]').getAttribute('aria-pressed')).toBe('false');
    for (const button of holder.querySelectorAll('button')) expect(button.style.minHeight).toBe('44px');
    model.apply(panel, { angleDegrees: 33.2, projection: 'free', axisVisible: true });
    expect(holder.querySelector('[data-galaxy-shell-angle]')).toBe(angle);
    expect(angle.textContent).toBe('Viewing angle: 33° from shell axis');
    expect([...holder.querySelectorAll('[data-galaxy-shell-view]')].every(button => button.getAttribute('aria-pressed') === 'false')).toBe(true);
    expect(holder.querySelector('[data-galaxy-shell-axis-toggle]').getAttribute('aria-pressed')).toBe('true');
    expect(holder.textContent).toContain('solid on the nearer half');
    expect(holder.textContent).toContain('host galaxy’s plane');
  });
});

describe('Galaxy native shell-axis exploration', () => {
  let host, root, restoreCanvas, restoreThree, loops, originalMedia, errors, now, camera, guide, shellMeshes, draw, mediaChange, latest, setLatest;
  beforeEach(() => {
    resetStemLab(); globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    window._galaxyHasLoadedOnce = true; window._galaxyPPLoaded = true;
    originalMedia = window.matchMedia; now = 1000000; vi.spyOn(Date, 'now').mockImplementation(() => now);
    restoreCanvas = installCanvas2DStub().restore; restoreThree = installThreeStub(); loops = installLoopStubs();
    const Attribute = window.THREE.BufferAttribute, Camera = window.THREE.PerspectiveCamera, Renderer = window.THREE.WebGLRenderer;
    window.THREE.BufferAttribute = function (array, itemSize) { const value = new Attribute(array, itemSize); value.setXYZ = (i, x, y, z) => { value.array[i * itemSize] = x; value.array[i * itemSize + 1] = y; value.array[i * itemSize + 2] = z; return value; }; return value; };
    window.THREE.PerspectiveCamera = function (...args) { camera = new Camera(...args); camera.near = args[2]; const lookAt = camera.lookAt; camera.lookAt = function (x, y, z) { camera.lastLookAt = { x, y, z }; return lookAt.call(camera, x, y, z); }; camera.setViewOffset = (fullWidth, fullHeight, offsetX, offsetY, width, height) => { camera.view = { enabled: true, fullWidth, fullHeight, offsetX, offsetY, width, height }; }; camera.clearViewOffset = () => { if (camera.view) camera.view.enabled = false; }; return camera; };
    window.THREE.WebGLRenderer = function (...args) { const renderer = new Renderer(...args), render = renderer.render; renderer.render = function (scene, ...rest) {
      guide = scene.children.find(node => node.name === 'planetaryShellAxisGuide'); shellMeshes = [];
      scene.traverse(node => { if (node.name === 'inspectedPlanetaryGasShell') shellMeshes.push(node); });
      draw = { guideVisible: !!(guide && guide.visible), shellCount: shellMeshes.filter(node => node.visible).length };
      return render.call(renderer, scene, ...rest);
    }; return renderer; };
    errors = vi.spyOn(console, 'error').mockImplementation(() => {}); host = document.createElement('div'); document.body.appendChild(host);
  });
  afterEach(async () => {
    if (root) await React.act(async () => root.unmount()); root = null; host.remove(); errors.mockRestore(); loops(); restoreThree(); restoreCanvas(); window.matchMedia = originalMedia;
    delete window.THREE; delete window._galaxyPPLoaded; delete globalThis.IS_REACT_ACT_ENVIRONMENT; vi.restoreAllMocks();
  });
  async function act(fn) { await React.act(async () => fn()); }
  async function step(ms = 1000) { now += ms; await act(() => loops.step()); }
  async function mount(reduced = true) {
    const mediaListeners = new Set(); let mediaReduced = reduced;
    mediaChange = event => { mediaReduced = event.matches; for (const listener of [...mediaListeners]) listener(event); };
    window.matchMedia = vi.fn(query => ({ get matches() { return mediaReduced && query.includes('prefers-reduced-motion'); }, media: query, addEventListener(type, listener) { if (query.includes('prefers-reduced-motion')) mediaListeners.add(listener); }, removeEventListener(type, listener) { mediaListeners.delete(listener); }, addListener(listener) { if (query.includes('prefers-reduced-motion')) mediaListeners.add(listener); }, removeListener(listener) { mediaListeners.delete(listener); } }));
    window.StemLab.ensureThree = vi.fn(() => Promise.resolve()); const config = loadTool('stem_lab/stem_tool_galaxy.js', 'galaxy');
    latest = { galaxy: { simMode: 'galaxy', starCount: 2500, galaxyAutoRotate: false, galaxyQuality: 'balanced' } };
    function Host() { const state = React.useState(latest); latest = state[0]; setLatest = state[1]; return config.render(makeCtx({ toolData: state[0], setToolData: state[1] })); }
    root = ReactDOMClient.createRoot(host); await act(() => root.render(React.createElement(Host)));
    const canvas = host.querySelector('[data-galaxy-canvas]'); canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: canvas.offsetWidth, height: canvas.offsetHeight });
    Object.defineProperty(canvas, 'offsetWidth', { configurable: true, value: 1000 }); Object.defineProperty(canvas, 'offsetHeight', { configurable: true, value: 640 });
    await act(() => loops.resize(canvas)); await step(); return canvas;
  }
  async function names() { await act(() => host.querySelector('[data-galaxy-control-tab="discover"]').click()); return [...host.querySelectorAll('[data-galaxy-nebula-target]')].map(node => node.getAttribute('data-galaxy-nebula-target')); }
  async function inspect(canvas, name) { await act(() => { canvas._galaxyFocusNebula(name); canvas._galaxyInspectSelection(); }); await step(); }
  const view = canvas => ({ ...canvas._galaxyOrbit, camera: canvas._galaxyGetInspectionState().camera, lookAt: { ...camera.lastLookAt }, offset: camera.view ? { ...camera.view } : null });
  function clean() { expect(errors.mock.calls.map(call => call.map(String).join(' ')).filter(message => /\[Galaxy\]|\[StemLab\]/.test(message))).toEqual([]); }

  it.each([false, true])('binds live angles and all three projections to the actual shells while keeping framed radius and backdrop with reduced motion %s', async reduced => {
    const canvas = await mount(reduced), targets = (await names()).filter(name => /helix|ring/i.test(name)); expect(targets).toHaveLength(2);
    for (const name of targets) {
      await act(() => canvas._galaxyClearSelection()); const original = { ...canvas._galaxyOrbit };
      await inspect(canvas, name); expect(canvas._galaxyGetPlanetaryViewState().axisVisible).toBe(false);
      await act(() => { canvas._galaxyFrameObject(); canvas._galaxySetInspectionBackdrop(false); }); await step();
      const radius = canvas._galaxyOrbit.r;
      for (const [mode, angle] of [['along', 0], ['oblique', 45], ['across', 90]]) {
        const before = view(canvas); await act(() => host.querySelector('[data-galaxy-shell-view="' + mode + '"]').click());
        if (!reduced) expect(view(canvas)).toEqual(before);
        await step(800); const state = canvas._galaxyGetPlanetaryViewState();
        expect(state.angleDegrees).toBeCloseTo(angle, 5); expect(state.projection).toBe(mode);
        expect(canvas._galaxyOrbit.r).toBe(radius); expect(canvas._galaxyGetInspectionBackdrop().showContext).toBe(false);
        expect(host.querySelector('[data-galaxy-shell-view="' + mode + '"]').getAttribute('aria-pressed')).toBe('true');
        expect(host.querySelector('[data-galaxy-shell-angle]').textContent).toContain(angle + '°');
      }
      const readout = host.querySelector('[data-galaxy-shell-angle]');
      await act(() => { canvas._galaxyOrbit.theta += 0.23; canvas._galaxyUpdateCam(); });
      const state = canvas._galaxyGetPlanetaryViewState(); expect(readout.textContent).toContain(Math.round(state.angleDegrees) + '°');
      expect(host.querySelector('[data-galaxy-shell-angle]')).toBe(readout);
      await act(() => canvas._galaxyExitInspection()); expect(canvas._galaxyOrbit).toEqual(original);
    }
    clean();
  });

  it('draws a true selected-object axis only when enabled, preserves isolation and restores visibility after every draw', async () => {
    const canvas = await mount(), name = (await names()).find(value => /helix/i.test(value)); await inspect(canvas, name);
    expect(draw.guideVisible).toBe(false); const before = view(canvas);
    await act(() => host.querySelector('[data-galaxy-shell-axis-toggle]').click()); await step();
    expect(view(canvas)).toEqual(before); expect(draw).toMatchObject({ guideVisible: true, shellCount: 2 }); expect(guide.visible).toBe(false);
    const state = canvas._galaxyGetPlanetaryViewState(), selected = shellMeshes.find(mesh => mesh.userData.nebulaName === name && mesh.userData.component === 'thick-disk');
    const actualAxis = new realThree.Vector3(0, 0, 1).applyEuler(new realThree.Euler(selected.rotation.x, selected.rotation.y, selected.rotation.z, 'XYZ'));
    for (const key of ['x', 'y', 'z']) { expect(state.axis[key]).toBeCloseTo(actualAxis[key], 8); expect(guide.position[key]).toBe(selected.position[key]); expect(guide.rotation[key]).toBe(selected.rotation[key]); }
    expect(Math.hypot(...['x', 'y', 'z'].map(key => state.guide.nearEnd[key] - state.guide.center[key]))).toBeCloseTo(state.guide.extent, 8);
    expect(guide.children.map(child => child.name)).toEqual(['planetaryAxisNear', 'planetaryAxisFar']);
    expect(guide.children[0].geometry.attributes.position.count).toBeLessThan(guide.children[1].geometry.attributes.position.count);
    await act(() => canvas._galaxySetInspectionBackdrop(false)); await step(); expect(draw.guideVisible).toBe(true); expect(guide.visible).toBe(false);
    await act(() => canvas._galaxySetPlanetaryView('oblique')); await step(); expect(canvas._galaxyGetPlanetaryViewState()).toMatchObject({ axisVisible: true, axisRendered: true }); expect(canvas._galaxyGetPlanetaryViewState().angleDegrees).toBeCloseTo(45, 8);
    await act(() => canvas._setObserveMode('radio')); await step(); expect(draw.guideVisible).toBe(false); expect(canvas._galaxyGetPlanetaryViewState()).toBeNull(); expect(canvas._galaxySetPlanetaryAxisVisible(false)).toBe(false);
    await act(() => canvas._setObserveMode('infrared')); await step(); expect(draw.guideVisible).toBe(true); expect(canvas._galaxyGetPlanetaryViewState().axisVisible).toBe(true);
    await act(() => canvas._galaxySetHudHidden(true)); await step(); expect(draw.guideVisible).toBe(false);
    await act(() => canvas._galaxySetHudHidden(false)); await step(); expect(draw.guideVisible).toBe(true);
    await act(() => canvas._setLayerVisibility('nebulae', false)); await step(); expect(draw.guideVisible).toBe(false); expect(canvas._galaxyGetPlanetaryViewState()).toBeNull();
    clean();
  });

  it('keeps the optional guide preference through a quality rebuild and disposes guide resources and APIs on teardown', async () => {
    const canvas = await mount(), name = (await names()).find(value => /ring/i.test(value)); await inspect(canvas, name);
    await act(() => canvas._galaxySetPlanetaryAxisVisible(true)); await step();
    await act(() => setLatest(prev => ({ galaxy: { ...prev.galaxy, galaxyQuality: 'high' } }))); await step();
    await inspect(canvas, name); expect(canvas._galaxyGetPlanetaryViewState().axisVisible).toBe(true); expect(draw.guideVisible).toBe(true);
    const disposals = guide.children.flatMap(child => [vi.spyOn(child.geometry, 'dispose'), vi.spyOn(child.material, 'dispose')]);
    await act(() => root.unmount()); root = null;
    for (const dispose of disposals) expect(dispose).toHaveBeenCalledOnce();
    expect(canvas._galaxySetPlanetaryAxisVisible).toBeNull(); expect(canvas._galaxyRefreshPlanetaryView).toBeNull(); expect(canvas._galaxyGetPlanetaryViewState).toBeNull();
    clean();
  });

  it('freezes a framing pan and radius immediately when reduced motion is enabled during a transition', async () => {
    const canvas = await mount(false), name = (await names()).find(value => /helix/i.test(value)); await inspect(canvas, name);
    const dock = canvas.parentElement.querySelector('[data-galaxy-selection-dock]'); dock.getBoundingClientRect = () => ({ left: 12, top: 430, right: 412, bottom: 628, width: 400, height: 198 });
    const toolbar = canvas.parentElement.querySelector('[data-galaxy-camera-controls]'); toolbar.getBoundingClientRect = () => ({ left: 890, top: 360, right: 988, bottom: 628, width: 98, height: 268 });
    await act(() => canvas._galaxyFrameObject()); await step(180);
    expect(Math.abs(camera.view.offsetX) + Math.abs(camera.view.offsetY)).toBeGreaterThan(0);
    const before = view(canvas); await act(() => mediaChange({ matches: true })); expect(view(canvas)).toEqual(before);
    await step(1000); expect(view(canvas)).toEqual(before); expect(canvas.getAttribute('data-auto-rotate')).toBe('false'); clean();
  });

  it('freezes the actual fly-in look target and camera position across frames until deliberate camera input', async () => {
    const canvas = await mount(false), name = (await names()).find(value => /helix/i.test(value));
    await act(() => { canvas._galaxyFocusNebula(name); canvas._galaxyInspectSelection(); }); await step(220);
    const before = view(canvas), origin = { ...canvas._galaxyGetInspectionState().orbitCenter };
    const shell = shellMeshes.find(mesh => mesh.userData.nebulaName === name), objectCenter = { x: shell.position.x, y: shell.position.y, z: shell.position.z };
    expect(before.lookAt).toEqual(origin); expect(before.lookAt).not.toEqual(objectCenter);
    const shellState = canvas._galaxyGetPlanetaryViewState();
    const physicalView = new realThree.Vector3(before.camera.x - objectCenter.x, before.camera.y - objectCenter.y, before.camera.z - objectCenter.z).normalize();
    const physicalAxis = new realThree.Vector3(0, 0, 1).applyEuler(new realThree.Euler(shell.rotation.x, shell.rotation.y, shell.rotation.z, 'XYZ'));
    expect(shellState.angleDegrees).toBeCloseTo(Math.acos(Math.abs(physicalView.dot(physicalAxis))) * 180 / Math.PI, 8);
    const distance = end => Math.hypot(before.camera.x - end.x, before.camera.y - end.y, before.camera.z - end.z);
    expect(distance(shellState.guide.nearEnd)).toBeLessThanOrEqual(distance(shellState.guide.farEnd));
    await act(() => mediaChange({ matches: true })); expect(view(canvas)).toEqual(before);
    for (const duration of [100, 1000, 3000]) { await step(duration); expect(view(canvas)).toEqual(before); expect(canvas._galaxyGetInspectionState().orbitCenter).toEqual(origin); }
    await act(() => mediaChange({ matches: false })); await step(); expect(view(canvas)).toEqual(before);
    await act(() => canvas._galaxyZoom('out')); await step();
    expect(camera.lastLookAt).toEqual(objectCenter); expect(canvas._galaxyGetInspectionState().orbitCenter).toEqual(objectCenter);
    clean();
  });
});
