import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { installCanvas2DStub, installLoopStubs, installThreeStub } from './helpers/galaxy_three_stub.js';

vi.setConfig({ testTimeout: 120000 });
const LIGHT = { simMode: 'galaxy', starCount: 2500, galaxyQuality: 'balanced', galaxyAutoRotate: false };

describe('Galaxy Crab foreground cutaway', () => {
  let host, root, restoreCanvas, restoreThree, loops, originalMedia, errors, now, latest, setLatest, meshes, drawn;
  beforeEach(() => {
    resetStemLab(); globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    window._galaxyHasLoadedOnce = true; window._galaxyPPLoaded = true;
    delete window._galaxyPPLoading; delete window._galaxyPPCallbacks;
    originalMedia = window.matchMedia;
    window.matchMedia = vi.fn(query => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
    now = 1_000_000; vi.spyOn(Date, 'now').mockImplementation(() => now);
    restoreCanvas = installCanvas2DStub().restore; restoreThree = installThreeStub();
    const Attribute = window.THREE.BufferAttribute;
    window.THREE.BufferAttribute = function (array, itemSize) {
      const attr = new Attribute(array, itemSize);
      attr.setXYZ = (i, x, y, z) => { attr.array[i * itemSize] = x; attr.array[i * itemSize + 1] = y; attr.array[i * itemSize + 2] = z; return attr; };
      return attr;
    };
    const Renderer = window.THREE.WebGLRenderer;
    window.THREE.WebGLRenderer = function (...args) {
      const renderer = new Renderer(...args), render = renderer.render;
      renderer.render = function (scene, camera) {
        meshes = [];
        scene.traverse(node => { if (node.name === 'inspectedCrabStructure') meshes.push(node); });
        drawn = meshes.map(node => ({ kind: node.userData.component, visible: node.visible, strength: node.material.uniforms.uCutawayStrength.value, centerDepth: node.material.uniforms.uCutawayCenterDepth.value, softness: node.material.uniforms.uCutawaySoftness.value }));
        return render.call(renderer, scene, camera);
      };
      return renderer;
    };
    loops = installLoopStubs(); errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    host = document.createElement('div'); document.body.appendChild(host);
  });
  afterEach(async () => {
    if (root) await React.act(async () => root.unmount());
    root = null; host.remove(); errors.mockRestore(); loops(); restoreThree(); restoreCanvas();
    window.matchMedia = originalMedia;
    delete window._galaxyPPLoaded; delete window._galaxyPPLoading; delete window._galaxyPPCallbacks;
    delete window.THREE; delete globalThis.IS_REACT_ACT_ENVIRONMENT; vi.restoreAllMocks();
  });
  async function mount(reduced = false) {
    window.matchMedia.mockImplementation(query => ({ matches: reduced && query.includes('prefers-reduced-motion'), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
    window.StemLab.ensureThree = vi.fn(() => Promise.resolve());
    const config = loadTool('stem_lab/stem_tool_galaxy.js', 'galaxy'); latest = { galaxy: { ...LIGHT } };
    function Host() { const state = React.useState(latest); latest = state[0]; setLatest = state[1]; return config.render(makeCtx({ toolData: state[0], setToolData: state[1] })); }
    root = ReactDOMClient.createRoot(host); await React.act(async () => root.render(React.createElement(Host)));
    return host.querySelector('[data-galaxy-canvas]');
  }
  async function step(ms = 1000) { now += ms; await React.act(async () => loops.step()); }
  async function inspect(canvas) {
    const name = meshes[0].userData.nebulaName;
    await React.act(async () => { canvas._galaxyFocusNebula(name); canvas._galaxyInspectSelection(); }); await step();
    return name;
  }
  function clean() { expect(errors.mock.calls.map(call => call.map(String).join(' ')).filter(message => /\[Galaxy\]|\[StemLab\]/.test(message))).toEqual([]); }

  it.each([false, true])('opens only foreground filaments without moving the model or camera with reduced motion %s', async reduced => {
    const canvas = await mount(reduced);
    expect(canvas._galaxyGetCrabComponentState()).toEqual({ available: false, filaments: true, wind: true });
    expect(canvas._galaxyGetCrabCutawayState()).toEqual({ available: false, enabled: false });
    expect(canvas._galaxySetCrabCutaway(true)).toBe(false);
    await inspect(canvas);
    const positions = meshes.map(node => Array.from(node.geometry.attributes.position.array));
    const before = canvas._galaxyGetInspectionState(), orbit = { ...canvas._galaxyOrbit }, frame = canvas._galaxyGetObjectFramingState();
    const changes = [], callback = canvas._onCrabCutawayChange;
    canvas._onCrabCutawayChange = value => { changes.push(value); callback(value); };
    const button = host.querySelector('[data-galaxy-crab-cutaway]');
    expect(button.disabled).toBe(false); expect(button.style.minHeight).toBe('44px');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(host.querySelector('#galaxy-crab-cutaway-help').textContent).toMatch(/schematic.*follows your view.*not a gap/);
    await React.act(async () => button.click()); await step();
    expect(canvas._galaxyGetCrabCutawayState()).toEqual({ available: true, enabled: true });
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(canvas._galaxyGetInspectionState()).toEqual(before); expect(canvas._galaxyOrbit).toEqual(orbit);
    expect(canvas._galaxyGetObjectFramingState()).toEqual(frame);
    expect(canvas._galaxyGetCrabComponentState()).toEqual({ available: true, filaments: true, wind: true });
    const filament = drawn.find(node => node.kind === 'filaments'), wind = drawn.find(node => node.kind === 'wind');
    expect(filament).toMatchObject({ visible: true, strength: 1 }); expect(wind).toMatchObject({ visible: true, strength: 0 });
    const visual = canvas._galaxyGetInspectionVisualState().crabStructure;
    expect(visual.cutaway).toEqual({ enabled: true, applied: true, centerDepth: filament.centerDepth, softness: filament.softness });
    expect(filament.centerDepth).toBeCloseTo(Math.hypot(...['x', 'y', 'z'].map(axis => before.camera[axis] - visual.source[axis])), 6);
    expect(filament.softness).toBeCloseTo(0.003, 8);
    const shader = meshes.find(node => node.userData.component === 'filaments').material.fragmentShader;
    expect(shader).toContain('vGasView.z'); expect(shader).toContain('smoothstep(uCutawayCenterDepth-uCutawaySoftness,uCutawayCenterDepth+uCutawaySoftness,vGasView.z)');
    await React.act(async () => { canvas._galaxyOrbit.theta += Math.PI; canvas._galaxyUpdateCam(); }); await step();
    expect(meshes.map(node => Array.from(node.geometry.attributes.position.array))).toEqual(positions);
    expect(drawn.find(node => node.kind === 'filaments').strength).toBe(1);
    await React.act(async () => canvas._galaxySetCrabCutaway(false)); await step();
    expect(drawn.every(node => node.strength === 0)).toBe(true);
    expect(changes).toContainEqual({ available: true, enabled: true }); clean();
  });

  it('explains the empty model and restores both components while preserving the opening preference', async () => {
    const canvas = await mount(true); await inspect(canvas);
    await React.act(async () => canvas._galaxySetCrabCutaway(true));
    const before = canvas._galaxyGetInspectionState(), orbit = { ...canvas._galaxyOrbit };
    await React.act(async () => { canvas._galaxySetCrabComponent('filaments', false); canvas._galaxySetCrabComponent('wind', false); }); await step();
    expect(canvas._galaxyGetCrabComponentState()).toEqual({ available: true, filaments: false, wind: false });
    expect(canvas._galaxyGetCrabCutawayState()).toEqual({ available: false, enabled: true });
    expect(host.querySelector('[data-galaxy-crab-cutaway]').disabled).toBe(true);
    expect(canvas._galaxySetCrabCutaway(false)).toBe(false);
    expect(host.querySelector('[data-galaxy-crab-empty]').textContent).toContain('Only the central source marker remains');
    expect(canvas._galaxyGetInspectionVisualState().crabStructure.cutaway.applied).toBe(false);
    expect(drawn.every(node => !node.visible && node.strength === 0)).toBe(true);
    const recovery = host.querySelector('[data-galaxy-crab-show-both]'); expect(recovery.style.minHeight).toBe('44px');
    await React.act(async () => recovery.click()); await step();
    expect(canvas._galaxyGetCrabComponentState()).toEqual({ available: true, filaments: true, wind: true });
    expect(canvas._galaxyGetCrabCutawayState()).toEqual({ available: true, enabled: true });
    expect(host.querySelector('[data-galaxy-crab-empty]')).toBeNull();
    expect(canvas._galaxyGetInspectionState()).toEqual(before); expect(canvas._galaxyOrbit).toEqual(orbit); clean();
  });

  it('retains all three preferences across signal changes and quality rebuilds', async () => {
    const canvas = await mount(true), name = await inspect(canvas);
    await React.act(async () => { canvas._galaxySetCrabCutaway(true); canvas._galaxySetCrabComponent('wind', false); });
    for (const band of ['radio', 'xray', 'gravity']) {
      await React.act(async () => canvas._setObserveMode(band)); await step();
      expect(canvas._galaxyGetCrabCutawayState()).toEqual({ available: false, enabled: true });
      expect(canvas._galaxySetCrabCutaway(false)).toBe(false);
      expect(canvas._galaxyGetInspectionVisualState().crabStructure).toBeNull();
      expect(host.querySelector('[data-galaxy-crab-cutaway]')).toBeNull();
    }
    await React.act(async () => canvas._setObserveMode('infrared')); await step();
    expect(canvas._galaxyGetCrabComponentState()).toEqual({ available: true, filaments: true, wind: false });
    expect(canvas._galaxyGetCrabCutawayState()).toEqual({ available: true, enabled: true });
    await React.act(async () => canvas._galaxySetCrabComponent('filaments', false));
    await React.act(async () => setLatest(prev => ({ galaxy: { ...prev.galaxy, galaxyQuality: 'high' } }))); await step();
    expect(host.querySelector('[data-galaxy-canvas]')).toBe(canvas);
    expect(canvas._galaxyGetCrabComponentState()).toEqual({ available: false, filaments: false, wind: false });
    expect(canvas._galaxyGetCrabCutawayState()).toEqual({ available: false, enabled: true });
    expect(typeof canvas._onCrabCutawayChange).toBe('function');
    await React.act(async () => { canvas._galaxyFocusNebula(name); canvas._galaxyInspectSelection(); }); await step();
    expect(host.querySelector('[data-galaxy-crab-empty]')).not.toBeNull();
    await React.act(async () => host.querySelector('[data-galaxy-crab-show-both]').click()); await step();
    expect(canvas._galaxyGetCrabCutawayState()).toEqual({ available: true, enabled: true });
    expect(drawn.find(node => node.kind === 'filaments').strength).toBe(1); clean();
  });

  it('rejects invalid values, gates the nebula layer and releases native APIs on teardown', async () => {
    const canvas = await mount(true); await inspect(canvas);
    for (const value of ['true', 1, null, undefined, {}]) expect(canvas._galaxySetCrabCutaway(value)).toBe(false);
    const changes = [], callback = canvas._onCrabCutawayChange;
    canvas._onCrabCutawayChange = value => { changes.push(value); callback(value); };
    await React.act(async () => { canvas._galaxySetCrabCutaway(true); canvas._setLayerVisibility('nebulae', false); }); await step();
    expect(canvas._galaxyGetCrabCutawayState()).toEqual({ available: false, enabled: true });
    expect(canvas._galaxySetCrabCutaway(false)).toBe(false);
    expect(changes.at(-1)).toEqual({ available: false, enabled: true });
    const retainedSetter = canvas._galaxySetCrabCutaway, retainedGetter = canvas._galaxyGetCrabCutawayState;
    await React.act(async () => root.unmount()); root = null;
    expect(canvas._galaxySetCrabCutaway).toBeNull(); expect(canvas._galaxyGetCrabCutawayState).toBeNull();
    expect(retainedSetter(false)).toBe(false); expect(retainedGetter()).toEqual({ available: false, enabled: true }); clean();
  });
});
