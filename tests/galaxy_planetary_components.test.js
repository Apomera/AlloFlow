import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, ReactDOMServer, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { installCanvas2DStub, installLoopStubs, installThreeStub } from './helpers/galaxy_three_stub.js';

vi.setConfig({ testTimeout: 120000 });
const source = readFileSync('stem_lab/stem_tool_galaxy.js', 'utf8');
const block = source.split('// BEGIN GALAXY PLANETARY PROJECTION')[1].split('// END GALAXY PLANETARY PROJECTION')[0];
const model = new Function(block + ';return {render:renderGalaxyPlanetaryComponents,renderViews:renderGalaxyShellViews,apply:galaxyApplyShellViewDisplay};')();
const realThree = new Function('var exports={};var module={exports:exports};' + readFileSync('vendor/three-r128/three.min.js', 'utf8') + ';return module.exports;')();
const LIGHT = { simMode: 'galaxy', starCount: 2500, galaxyQuality: 'balanced', galaxyAutoRotate: false };

describe('Galaxy planetary component study controls', () => {
  it('identifies the two schematic parts with their actual material colors and a nonempty three-choice study', () => {
    for (const [primaryComponent, secondaryComponent, labels, colors] of [
      ['thick-disk', 'inclined-disk', ['Both', 'Main ring', 'Tilted outer ring'], ['#36b9c6', '#458c9e']],
      ['equatorial-shell', 'polar-envelope', ['Both', 'Equatorial ring', 'Polar envelope'], ['#b37fda', '#85a6dc']]
    ]) {
      const holder = document.createElement('div');
      holder.innerHTML = ReactDOMServer.renderToStaticMarkup(model.render({ React, state: { available: true, mode: 'secondary', primaryComponent, secondaryComponent }, onChange() {} }));
      const buttons = [...holder.querySelectorAll('[data-galaxy-shell-component-mode]')];
      expect(buttons.map(button => button.textContent)).toEqual(labels);
      expect(buttons.map(button => button.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'true']);
      expect(buttons.every(button => button.style.minHeight === '44px')).toBe(true);
      expect([...holder.querySelectorAll('[data-galaxy-component-swatch]')].map(node => node.getAttribute('data-galaxy-component-swatch'))).toEqual([...colors, ...colors]);
      expect(holder.querySelector('[role="group"]').getAttribute('aria-describedby')).toBe('galaxy-shell-components-help');
      expect(holder.textContent).toContain('This schematic combines');
      expect(holder.textContent).toContain('Both uses the main component’s axis');
      expect(holder.textContent).toContain('keeping your view and zoom');
    }
  });

  it('names the current reference in the live angle and preserves the generic helper fallback', () => {
    const holder = document.createElement('div');
    holder.innerHTML = ReactDOMServer.renderToStaticMarkup(model.renderViews({ React, state: { angleDegrees: 45, projection: 'oblique', axisVisible: false, referenceComponent: 'inclined-disk' }, onView() {} }));
    const panel = holder.firstElementChild, angle = holder.querySelector('[data-galaxy-shell-angle]');
    expect(angle.textContent).toBe('Tilted outer ring: 45° from its axis');
    model.apply(panel, { angleDegrees: 27.4, projection: 'free', referenceComponent: 'polar-envelope' });
    expect(holder.querySelector('[data-galaxy-shell-angle]')).toBe(angle);
    expect(angle.textContent).toBe('Polar envelope: 27° from its axis');
    expect(panel.getAttribute('data-shell-reference-component')).toBe('polar-envelope');
    model.apply(panel, { angleDegrees: 33, projection: 'free' });
    expect(angle.textContent).toBe('Viewing angle: 33° from shell axis');
    expect(panel.hasAttribute('data-shell-reference-component')).toBe(false);
  });

  it('shows a filled envelope growing more elongated across its axis while ring references retain their hole', () => {
    const holder = document.createElement('div');
    holder.innerHTML = ReactDOMServer.renderToStaticMarkup(model.renderViews({ React, state: { angleDegrees: 0, projection: 'along', referenceComponent: 'polar-envelope' }, onView() {} }));
    const ratios = [...holder.querySelectorAll('[data-galaxy-shell-view]')].map(button => {
      const ellipses = [...button.querySelectorAll('ellipse')]; expect(ellipses).toHaveLength(1);
      const ellipse = ellipses[0]; expect(ellipse.getAttribute('fill')).not.toBe('white');
      return Number(ellipse.getAttribute('ry')) / Number(ellipse.getAttribute('rx'));
    });
    expect(ratios[0]).toBe(1); expect(ratios[1]).toBeGreaterThan(ratios[0]); expect(ratios[2]).toBeGreaterThan(ratios[1]);
    for (const referenceComponent of ['thick-disk', 'inclined-disk', 'equatorial-shell']) {
      holder.innerHTML = ReactDOMServer.renderToStaticMarkup(model.renderViews({ React, state: { referenceComponent }, onView() {} }));
      expect(holder.querySelectorAll('ellipse[fill="white"]')).toHaveLength(3);
    }
  });
});

describe('Galaxy native planetary component comparison', () => {
  let host, root, restoreCanvas, restoreThree, loops, originalMedia, errors, now, latest, setLatest, camera, meshes, guide, drawn;
  beforeEach(() => {
    resetStemLab(); globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    window._galaxyHasLoadedOnce = true; window._galaxyPPLoaded = true;
    delete window._galaxyPPLoading; delete window._galaxyPPCallbacks;
    originalMedia = window.matchMedia; now = 1000000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    restoreCanvas = installCanvas2DStub().restore; restoreThree = installThreeStub(); loops = installLoopStubs();
    const Attribute = window.THREE.BufferAttribute, Camera = window.THREE.PerspectiveCamera, Renderer = window.THREE.WebGLRenderer;
    window.THREE.BufferAttribute = function (array, itemSize) { const attr = new Attribute(array, itemSize); attr.setXYZ = (i, x, y, z) => { attr.array[i * itemSize] = x; attr.array[i * itemSize + 1] = y; attr.array[i * itemSize + 2] = z; return attr; }; return attr; };
    window.THREE.PerspectiveCamera = function (...args) {
      camera = new Camera(...args); camera.near = args[2];
      const lookAt = camera.lookAt; camera.lookAt = function (x, y, z) { camera.lastLookAt = { x, y, z }; return lookAt.call(camera, x, y, z); };
      camera.setViewOffset = (fullWidth, fullHeight, offsetX, offsetY, width, height) => { camera.view = { enabled: true, fullWidth, fullHeight, offsetX, offsetY, width, height }; };
      camera.clearViewOffset = () => { if (camera.view) camera.view.enabled = false; }; return camera;
    };
    window.THREE.WebGLRenderer = function (...args) {
      const renderer = new Renderer(...args), render = renderer.render;
      renderer.render = function (scene, ...rest) {
        meshes = []; scene.traverse(node => { if (node.name === 'inspectedPlanetaryGasShell') meshes.push(node); });
        guide = scene.children.find(node => node.name === 'planetaryShellAxisGuide');
        drawn = { shells: meshes.map(node => ({ name: node.userData.nebulaName, kind: node.userData.component, visible: node.visible, opacity: node.material.uniforms.uOpacity.value })), guideVisible: !!(guide && guide.visible) };
        return render.call(renderer, scene, ...rest);
      }; return renderer;
    };
    errors = vi.spyOn(console, 'error').mockImplementation(() => {}); host = document.createElement('div'); document.body.appendChild(host);
  });
  afterEach(async () => {
    if (root) await React.act(async () => root.unmount()); root = null;
    host.remove(); errors.mockRestore(); loops(); restoreThree(); restoreCanvas(); window.matchMedia = originalMedia;
    delete window.THREE; delete window._galaxyPPLoaded; delete window._galaxyPPLoading; delete window._galaxyPPCallbacks; delete globalThis.IS_REACT_ACT_ENVIRONMENT; vi.restoreAllMocks();
  });
  async function act(fn) { await React.act(async () => fn()); }
  async function step(ms = 1000) { now += ms; await act(() => loops.step()); }
  async function mount(reduced = true) {
    window.matchMedia = vi.fn(query => ({ matches: reduced && query.includes('prefers-reduced-motion'), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
    window.StemLab.ensureThree = vi.fn(() => Promise.resolve()); const config = loadTool('stem_lab/stem_tool_galaxy.js', 'galaxy'); latest = { galaxy: { ...LIGHT } };
    function Host() { const state = React.useState(latest); latest = state[0]; setLatest = state[1]; return config.render(makeCtx({ toolData: state[0], setToolData: state[1] })); }
    root = ReactDOMClient.createRoot(host); await act(() => root.render(React.createElement(Host)));
    const canvas = host.querySelector('[data-galaxy-canvas]');
    Object.defineProperty(canvas, 'offsetWidth', { configurable: true, value: 1000 }); Object.defineProperty(canvas, 'offsetHeight', { configurable: true, value: 640 });
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 640 });
    await act(() => loops.resize(canvas)); await step(); return canvas;
  }
  async function inspect(canvas, name) { await act(() => { canvas._galaxyFocusNebula(name); canvas._galaxyInspectSelection(); }); await step(); }
  function names() { return [...new Set(meshes.map(mesh => mesh.userData.nebulaName))]; }
  function view(canvas) { return { orbit: { ...canvas._galaxyOrbit }, inspection: canvas._galaxyGetInspectionState(), lookAt: { ...camera.lastLookAt }, offset: camera.view ? { ...camera.view } : null }; }
  function clean() { expect(errors.mock.calls.map(call => call.map(String).join(' ')).filter(message => /\[Galaxy\]|\[StemLab\]/.test(message))).toEqual([]); }

  it.each([false, true])('compares fixed owner geometry at identical angle, zoom and brightness with reduced motion %s', async reduced => {
    const canvas = await mount(reduced), targets = names(); expect(targets).toHaveLength(2);
    for (const name of targets) {
      await act(() => canvas._galaxyClearSelection()); await inspect(canvas, name);
      await act(() => { canvas._galaxyFrameObject(); canvas._galaxySetInspectionBackdrop(false); }); await step();
      const before = view(canvas), frame = canvas._galaxyGetObjectFramingState();
      const geometry = meshes.map(mesh => Array.from(mesh.geometry.attributes.position.array));
      const own = meshes.filter(mesh => mesh.userData.nebulaName === name), opacities = own.map(mesh => mesh.material.uniforms.uOpacity.value);
      const changes = [], callback = canvas._onPlanetaryComponentsChange;
      canvas._onPlanetaryComponentsChange = value => { changes.push(value); callback(value); };
      for (const mode of ['primary', 'secondary', 'both']) {
        const button = host.querySelector('[data-galaxy-shell-component-mode="' + mode + '"]');
        expect(button).not.toBeNull(); await act(() => button.click()); await step();
        expect(canvas._galaxyGetPlanetaryComponentState()).toMatchObject({ available: true, name, mode });
        expect(view(canvas)).toEqual(before); expect(canvas._galaxyGetObjectFramingState()).toEqual(frame);
        expect(canvas._galaxyGetInspectionBackdrop()).toEqual({ available: true, showContext: false });
        expect(meshes.map(mesh => Array.from(mesh.geometry.attributes.position.array))).toEqual(geometry);
        expect(own.map(mesh => mesh.material.uniforms.uOpacity.value)).toEqual(opacities);
        expect(drawn.shells.filter(mesh => mesh.visible)).toHaveLength(mode === 'both' ? 2 : 1);
        expect(drawn.shells.filter(mesh => mesh.visible).every(mesh => mesh.name === name)).toBe(true);
        const state = canvas._galaxyGetPlanetaryComponentState(), expectedKind = mode === 'secondary' ? state.secondaryComponent : state.primaryComponent;
        if (mode !== 'both') expect(drawn.shells.find(mesh => mesh.visible).kind).toBe(expectedKind);
        expect(canvas._galaxyGetInspectionVisualState().planetaryShell).toMatchObject({ componentMode: mode, referenceComponent: expectedKind });
        expect([...host.querySelectorAll('[data-galaxy-shell-component-mode][aria-pressed="true"]')].map(node => node.getAttribute('data-galaxy-shell-component-mode'))).toEqual([mode]);
        expect(meshes.every(mesh => mesh.visible === false)).toBe(true);
      }
      expect(changes.some(state => state.name === name && state.mode === 'secondary')).toBe(true);
      canvas._onPlanetaryComponentsChange = callback;
    }
    clean();
  });

  it('makes the live angle, guide and presets use the actual studied mesh while the primary field keeps its meaning', async () => {
    const canvas = await mount();
    for (const name of names()) {
      await act(() => canvas._galaxyClearSelection()); await inspect(canvas, name);
      const primary = canvas._galaxyGetPlanetaryViewState().primaryComponent, before = view(canvas);
      await act(() => { canvas._galaxySetPlanetaryAxisVisible(true); canvas._galaxySetPlanetaryComponentMode('secondary'); }); await step();
      expect(view(canvas)).toEqual(before);
      const state = canvas._galaxyGetPlanetaryViewState(), secondary = meshes.find(mesh => mesh.userData.nebulaName === name && mesh.userData.component === state.referenceComponent);
      expect(state.primaryComponent).toBe(primary); expect(state.referenceComponent).not.toBe(primary);
      const axis = new realThree.Vector3(0, 0, 1).applyEuler(new realThree.Euler(secondary.rotation.x, secondary.rotation.y, secondary.rotation.z, 'XYZ'));
      const direction = new realThree.Vector3(before.inspection.camera.x - secondary.position.x, before.inspection.camera.y - secondary.position.y, before.inspection.camera.z - secondary.position.z).normalize();
      expect(state.angleDegrees).toBeCloseTo(Math.acos(Math.abs(direction.dot(axis))) * 180 / Math.PI, 8);
      for (const key of ['x', 'y', 'z']) { expect(state.axis[key]).toBeCloseTo(axis[key], 9); expect(guide.rotation[key]).toBe(secondary.rotation[key]); }
      expect(drawn.guideVisible).toBe(true); expect(guide.visible).toBe(false);
      const readout = host.querySelector('[data-galaxy-shell-angle]'); expect(readout.textContent).toContain(primary === 'thick-disk' ? 'Tilted outer ring:' : 'Polar envelope:');
      const radius = canvas._galaxyOrbit.r;
      for (const [mode, angle] of [['along', 0], ['oblique', 45], ['across', 90]]) {
        await act(() => canvas._galaxySetPlanetaryView(mode)); await step();
        expect(canvas._galaxyGetPlanetaryViewState()).toMatchObject({ primaryComponent: primary, referenceComponent: secondary.userData.component, projection: mode });
        expect(canvas._galaxyGetPlanetaryViewState().angleDegrees).toBeCloseTo(angle, 5);
        expect(canvas._galaxyOrbit.r).toBe(radius); expect(readout.textContent).toContain(angle + '°');
      }
      const current = view(canvas); await act(() => canvas._galaxySetPlanetaryComponentMode('both')); await step();
      expect(view(canvas)).toEqual(current); expect(canvas._galaxyGetPlanetaryViewState()).toMatchObject({ primaryComponent: primary, referenceComponent: primary });
    }
    clean();
  });

  it.each(['frame', 'view'])('lets an already-running %s transition continue when the component changes', async transition => {
    const canvas = await mount(false), name = names().find(name => /helix/i.test(name)); await inspect(canvas, name);
    const dock = canvas.parentElement.querySelector('[data-galaxy-selection-dock]'); dock.getBoundingClientRect = () => ({ left: 12, top: 430, right: 412, bottom: 628, width: 400, height: 198 });
    const toolbar = canvas.parentElement.querySelector('[data-galaxy-camera-controls]'); toolbar.getBoundingClientRect = () => ({ left: 890, top: 360, right: 988, bottom: 628, width: 98, height: 268 });
    await act(() => transition === 'frame' ? canvas._galaxyFrameObject() : canvas._galaxySetPlanetaryView('along')); await step(180);
    const before = view(canvas); await act(() => canvas._galaxySetPlanetaryComponentMode('secondary'));
    expect(view(canvas)).toEqual(before); await step(180); expect(view(canvas)).not.toEqual(before);
    await step(1000); expect(canvas._galaxyGetPlanetaryComponentState().mode).toBe('secondary');
    if (transition === 'frame') expect(canvas._galaxyGetObjectFramingState().zoomPercent).toBe(100);
    else {
      const primary = meshes.find(mesh => mesh.userData.nebulaName === name && mesh.userData.component === 'thick-disk');
      const axis = new realThree.Vector3(0, 0, 1).applyEuler(new realThree.Euler(primary.rotation.x, primary.rotation.y, primary.rotation.z, 'XYZ'));
      const position = canvas._galaxyGetInspectionState().camera, direction = new realThree.Vector3(position.x - primary.position.x, position.y - primary.position.y, position.z - primary.position.z).normalize();
      expect(Math.abs(direction.dot(axis))).toBeCloseTo(1, 8);
    }
    clean();
  });

  it('keeps independent choices through unsupported bands, a quality rebuild and returning to each object', async () => {
    const canvas = await mount(), targets = names(), helix = targets.find(name => /helix/i.test(name)), ring = targets.find(name => /ring/i.test(name));
    await inspect(canvas, helix); await act(() => canvas._galaxySetPlanetaryComponentMode('secondary'));
    await inspect(canvas, ring); expect(canvas._galaxyGetPlanetaryComponentState().mode).toBe('both');
    await act(() => canvas._galaxySetPlanetaryComponentMode('primary'));
    for (const band of ['radio', 'xray', 'gravity']) {
      await act(() => { canvas._setObserveMode(band); setLatest(prev => ({ galaxy: { ...prev.galaxy, observeMode: band } })); }); await step();
      expect(canvas._galaxyGetPlanetaryComponentState()).toMatchObject({ available: false, name: ring, mode: 'primary' });
      expect(canvas._galaxySetPlanetaryComponentMode('secondary')).toBe(false); expect(canvas._galaxyGetPlanetaryViewState()).toBeNull();
      expect(drawn.shells.some(mesh => mesh.visible)).toBe(false); expect(host.querySelector('[data-galaxy-shell-components]')).toBeNull();
    }
    await act(() => { canvas._setObserveMode('infrared'); setLatest(prev => ({ galaxy: { ...prev.galaxy, observeMode: 'infrared' } })); }); await step();
    expect(canvas._galaxyGetPlanetaryComponentState()).toMatchObject({ available: true, name: ring, mode: 'primary' });
    const callback = canvas._onPlanetaryComponentsChange;
    await act(() => setLatest(prev => ({ galaxy: { ...prev.galaxy, galaxyQuality: 'high' } }))); await step();
    expect(host.querySelector('[data-galaxy-canvas]')).toBe(canvas); expect(canvas._onPlanetaryComponentsChange).toBe(callback);
    for (const [name, mode] of [[helix, 'secondary'], [ring, 'primary']]) {
      await inspect(canvas, name); expect(canvas._galaxyGetPlanetaryComponentState()).toMatchObject({ available: true, name, mode });
      expect(host.querySelector('[data-galaxy-shell-component-mode="' + mode + '"]').getAttribute('aria-pressed')).toBe('true');
    }
    clean();
  });

  it('rejects invalid and unavailable changes and removes native methods and the React callback on teardown', async () => {
    const canvas = await mount(), name = names()[0];
    expect(canvas._galaxyGetPlanetaryComponentState().available).toBe(false); expect(canvas._galaxySetPlanetaryComponentMode('primary')).toBe(false);
    await act(() => canvas._galaxyFocusNebula(name)); expect(canvas._galaxySetPlanetaryComponentMode('primary')).toBe(false);
    await act(() => canvas._galaxyInspectSelection()); await step();
    const before = canvas._galaxyGetPlanetaryComponentState();
    for (const invalid of ['', 'all', null, true, {}, 1]) expect(canvas._galaxySetPlanetaryComponentMode(invalid)).toBe(false);
    expect(canvas._galaxyGetPlanetaryComponentState()).toEqual(before);
    await act(() => canvas._setLayerVisibility('nebulae', false)); await step();
    expect(canvas._galaxyGetPlanetaryComponentState().available).toBe(false); expect(canvas._galaxySetPlanetaryComponentMode('secondary')).toBe(false);
    expect(drawn.shells.some(mesh => mesh.visible)).toBe(false);
    const oldGetter = canvas._galaxyGetPlanetaryComponentState, oldSetter = canvas._galaxySetPlanetaryComponentMode;
    await act(() => root.unmount()); root = null;
    expect(canvas._galaxyGetPlanetaryComponentState).toBeNull(); expect(canvas._galaxySetPlanetaryComponentMode).toBeNull(); expect(canvas._onPlanetaryComponentsChange).toBeNull();
    expect(oldGetter().available).toBe(false); expect(oldSetter('both')).toBe(false); clean();
  });
});
