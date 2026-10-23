import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, ReactDOMServer, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { installCanvas2DStub, installLoopStubs, installThreeStub } from './helpers/galaxy_three_stub.js';

vi.setConfig({ testTimeout: 120000 });
const source = readFileSync('stem_lab/stem_tool_galaxy.js', 'utf8');
const block = source.split('// BEGIN GALAXY PLANETARY PROJECTION')[1].split('// END GALAXY PLANETARY PROJECTION')[0];
const model = new Function(block + ';return {direction:galaxyPlanetaryViewDirection,shell:renderGalaxyShellViews,crab:renderGalaxyCrabComponents};')();
const realThree = new Function('var exports={};var module={exports:exports};' + readFileSync('vendor/three-r128/three.min.js', 'utf8') + ';return module.exports;')();
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
function close(actual, expected) { for (const axis of ['x', 'y', 'z']) expect(actual[axis]).toBeCloseTo(expected[axis], 6); }
function direction(state) { const d = {}; const distance = Math.hypot(...['x', 'y', 'z'].map(axis => state.camera[axis] - state.orbitCenter[axis])); for (const axis of ['x', 'y', 'z']) d[axis] = (state.camera[axis] - state.orbitCenter[axis]) / distance; return d; }

describe('Galaxy schematic shell projection math', () => {
  it.each([[0, 0, 0], [Math.PI / 2, 0, 0], [0, Math.PI / 2, 0], [0, 0, Math.PI / 2], [-0.44, 0.28, 0.12], [-0.35, 0.45, 0.12], [0.7, -0.8, 1.2]])('matches real Three XYZ Euler transformation for [%s,%s,%s]', (x, y, z) => {
    const rotation = { x, y, z, order: 'XYZ' };
    const result = model.direction(rotation, 'along', { x: 0.3, y: 0.4, z: 0.8 });
    const expected = new realThree.Vector3(0, 0, 1).applyEuler(new realThree.Euler(x, y, z, 'XYZ'));
    close(result.axis, expected);
    expect(Math.abs(dot(result.axis, result.direction))).toBeCloseTo(1, 9);
  });
  it('uses the nearest along-axis direction and a perpendicular across-axis direction', () => {
    const rotation = Object.freeze({ x: -0.44, y: 0.28, z: 0.12 });
    const axis = model.direction(rotation, 'along', { x: 0, y: 0, z: 1 }).axis;
    const backwards = { x: -axis.x, y: -axis.y, z: -axis.z };
    close(model.direction(rotation, 'along', backwards).direction, backwards);
    const across = model.direction(rotation, 'across', axis);
    expect(dot(across.axis, across.direction)).toBeCloseTo(0, 9);
    expect(Math.hypot(across.direction.x, across.direction.y, across.direction.z)).toBeCloseTo(1, 9);
    const expected = new realThree.Vector3(1, 0, 0).applyEuler(new realThree.Euler(rotation.x, rotation.y, rotation.z, 'XYZ'));
    close(across.direction, expected);
    const current = { x: -0.3, y: 0.2, z: 0.5 };
    const transverse = model.direction(rotation, 'across', current);
    expect(dot(transverse.axis, transverse.direction)).toBeCloseTo(0, 9);
    expect(transverse.phi).toBeGreaterThan(0.1);
    expect(transverse.phi).toBeLessThan(Math.PI - 0.1);
  });
  it.each([[null, 'along', { x: 0, y: 0, z: 1 }], [{ x: 0, y: 0, z: 0 }, 'sideways', { x: 0, y: 0, z: 1 }], [{ x: 0, y: 0, z: 0, order: 'ZYX' }, 'along', { x: 0, y: 0, z: 1 }], [{ x: 0, y: Infinity, z: 0 }, 'along', { x: 0, y: 0, z: 1 }], [{ x: 0, y: 0, z: 0 }, 'along', { x: 0, y: 0, z: 0 }]])('rejects unsupported geometry or direction', (rotation, mode, current) => {
    expect(model.direction(rotation, mode, current)).toBeNull();
  });
  it('renders named 44px projection actions and independent pressed component controls', () => {
    const holder = document.createElement('div');
    holder.innerHTML = ReactDOMServer.renderToStaticMarkup(React.createElement(React.Fragment, null,
      model.shell({ React, onView() {} }), model.crab({ React, state: { available: true, filaments: true, wind: false }, onToggle() {} })
    ));
    expect([...holder.querySelectorAll('[data-galaxy-shell-view]')].map(node => node.textContent)).toEqual(['Along shell axis', 'Oblique · 45°', 'Across shell axis']);
    for (const node of holder.querySelectorAll('button')) expect(node.style.minHeight).toBe('44px');
    expect(holder.querySelector('[data-galaxy-crab-component="filaments"]').getAttribute('aria-pressed')).toBe('true');
    expect(holder.querySelector('[data-galaxy-crab-component="wind"]').getAttribute('aria-pressed')).toBe('false');
    expect(holder.textContent).toContain('not measured emission maps');
    expect(model.crab({ React, state: { available: false }, onToggle() {} })).toBeNull();
  });
});

describe('Galaxy native selected-shell projection controls', () => {
  let host, root, restoreCanvas, restoreThree, loops, originalMedia, errors, now, latest, setLatest;
  beforeEach(() => {
    resetStemLab(); globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    window._galaxyHasLoadedOnce = true; window._galaxyPPLoaded = true;
    delete window._galaxyPPLoading; delete window._galaxyPPCallbacks;
    originalMedia = window.matchMedia;
    window.matchMedia = vi.fn(query => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
    now = 1_000_000; vi.spyOn(Date, 'now').mockImplementation(() => now);
    restoreCanvas = installCanvas2DStub().restore; restoreThree = installThreeStub();
    const Attribute = window.THREE.BufferAttribute;
    window.THREE.BufferAttribute = function (array, itemSize) { const attr = new Attribute(array, itemSize); attr.setXYZ = (i, x, y, z) => { attr.array[i * itemSize] = x; attr.array[i * itemSize + 1] = y; attr.array[i * itemSize + 2] = z; return attr; }; return attr; };
    loops = installLoopStubs(); errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    host = document.createElement('div'); document.body.appendChild(host);
  });
  afterEach(async () => {
    if (root) await React.act(async () => root.unmount());
    root = null; host.remove(); errors.mockRestore(); loops(); restoreThree(); restoreCanvas();
    window.matchMedia = originalMedia; delete window._galaxyPPLoaded; delete window._galaxyPPLoading; delete window._galaxyPPCallbacks;
    delete window.THREE; delete globalThis.IS_REACT_ACT_ENVIRONMENT; vi.restoreAllMocks();
  });
  async function mount(reduced) {
    window.matchMedia.mockImplementation(query => ({ matches: reduced && query.includes('prefers-reduced-motion'), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
    window.StemLab.ensureThree = vi.fn(() => Promise.resolve());
    const config = loadTool('stem_lab/stem_tool_galaxy.js', 'galaxy');
    latest = { galaxy: { simMode: 'galaxy', starCount: 2500, galaxyQuality: 'balanced', galaxyAutoRotate: false } };
    function Host() { const state = React.useState(latest); latest = state[0]; setLatest = state[1]; return config.render(makeCtx({ toolData: state[0], setToolData: state[1] })); }
    root = ReactDOMClient.createRoot(host); await React.act(async () => root.render(React.createElement(Host)));
    return host.querySelector('[data-galaxy-canvas]');
  }
  async function step(ms = 1000) { now += ms; await React.act(async () => loops.step()); }
  async function targets() { await React.act(async () => host.querySelector('[data-galaxy-control-tab="discover"]').click()); const names = [...host.querySelectorAll('[data-galaxy-nebula-target]')].map(node => node.getAttribute('data-galaxy-nebula-target')); expect(names).toHaveLength(8); return names; }
  function namedTarget(names, key) { const found = names.find(name => name.toLowerCase().includes(key)); expect(found, 'Discover target for ' + key).toBeTruthy(); return found; }
  async function band(value) { const select = host.querySelector('[data-galaxy-object-band]'); await React.act(async () => { select.value = value; select.dispatchEvent(new Event('change', { bubbles: true })); }); await step(); }
  function clean() { expect(errors.mock.calls.map(call => call.map(String).join(' ')).filter(message => /\[Galaxy\]|\[StemLab\]/.test(message))).toEqual([]); }

  it.each([false, true])('changes both actual planetary shells in visible/IR and preserves zoom, band and return framing with reduced motion %s', async reduced => {
    const canvas = await mount(reduced);
    expect(canvas._galaxySetPlanetaryView('along')).toBe(false);
    const names = await targets();
    for (const name of [namedTarget(names, 'helix'), namedTarget(names, 'ring')]) {
      await React.act(async () => canvas._galaxyFocusNebula(name));
      const frame = { ...canvas._galaxyOrbit };
      await React.act(async () => canvas._galaxyInspectSelection()); await step();
      for (const signal of ['visible', 'infrared']) {
        await band(signal);
        const before = canvas._galaxyGetInspectionState(), radius = canvas._galaxyOrbit.r;
        expect(canvas._galaxyGetPlanetaryViewState()).toMatchObject({ name, band: signal });
        expect(host.querySelector('[data-galaxy-shell-views]')).not.toBeNull();
        expect(host.querySelector('[data-galaxy-object-context-summary]').textContent).toContain('Explore shell shape');
        for (const mode of ['along', 'across']) {
          const beforeCamera = { ...canvas._galaxyGetInspectionState().camera };
          await React.act(async () => host.querySelector('[data-galaxy-shell-view="' + mode + '"]').click());
          if (!reduced) close(canvas._galaxyGetInspectionState().camera, beforeCamera);
          await step(800);
          const after = canvas._galaxyGetInspectionState(), axis = canvas._galaxyGetPlanetaryViewState().axis;
          expect(Math.abs(dot(direction(after), axis))).toBeCloseTo(mode === 'along' ? 1 : 0, 6);
          expect(canvas._galaxyOrbit.r).toBe(radius); expect(latest.galaxy.observeMode).toBe(signal);
          expect(after).toMatchObject({ active: true, kind: 'nebula', label: name }); close(after.orbitCenter, before.orbitCenter);
        }
      }
      await React.act(async () => canvas._galaxyExitInspection());
      expect(canvas._galaxyOrbit).toEqual(frame);
      expect(canvas._galaxyGetPlanetaryViewState()).toBeNull();
    }
    clean();
  });

  it('takes over a partial inspection fly-in without moving the camera on the action frame', async () => {
    const canvas = await mount(false);
    const name = namedTarget(await targets(), 'helix');
    await React.act(async () => { canvas._galaxyFocusNebula(name); canvas._galaxyInspectSelection(); }); await step(250);
    const before = canvas._galaxyGetInspectionState();
    await React.act(async () => expect(canvas._galaxySetPlanetaryView('across')).toBe(true));
    close(canvas._galaxyGetInspectionState().camera, before.camera);
    const radius = canvas._galaxyOrbit.r;
    await step(800);
    expect(Math.abs(dot(direction(canvas._galaxyGetInspectionState()), canvas._galaxyGetPlanetaryViewState().axis))).toBeCloseTo(0, 6);
    expect(canvas._galaxyOrbit.r).toBe(radius);
    clean();
  });

  it('gates projection actions by actual inspection, band and layer and removes native APIs on teardown', async () => {
    const canvas = await mount(true);
    const name = namedTarget(await targets(), 'helix');
    await React.act(async () => canvas._galaxyFocusNebula(name));
    expect(canvas._galaxyGetPlanetaryViewState()).toBeNull();
    await React.act(async () => canvas._galaxyInspectSelection()); await step();
    for (const mode of ['radio', 'xray', 'gravity']) {
      await band(mode); expect(canvas._galaxyGetPlanetaryViewState()).toBeNull(); expect(canvas._galaxySetPlanetaryView('along')).toBe(false);
      expect(host.querySelector('[data-galaxy-shell-views]')).toBeNull();
    }
    await band('visible');
    expect(canvas._galaxySetPlanetaryView('__proto__')).toBe(false);
    await React.act(async () => canvas._setLayerVisibility('nebulae', false));
    expect(canvas._galaxyGetPlanetaryViewState()).toBeNull(); expect(canvas._galaxySetPlanetaryView('along')).toBe(false);
    await React.act(async () => root.unmount()); root = null;
    expect(canvas._galaxySetPlanetaryView).toBeNull(); expect(canvas._galaxyGetPlanetaryViewState).toBeNull();
    clean();
  });

  it('binds Crab component buttons to actual native visibility and restores their state after a band round trip', async () => {
    const canvas = await mount(true);
    const name = namedTarget(await targets(), 'crab');
    await React.act(async () => { canvas._galaxyFocusNebula(name); canvas._galaxyInspectSelection(); }); await step();
    expect(host.querySelector('[data-galaxy-crab-components]')).not.toBeNull();
    expect(host.querySelector('[data-galaxy-shell-views]')).toBeNull();
    const before = canvas._galaxyGetInspectionState();
    await React.act(async () => host.querySelector('[data-galaxy-crab-component="filaments"]').click()); await step();
    expect(canvas._galaxyGetCrabComponentState()).toEqual({ available: true, filaments: false, wind: true });
    expect(host.querySelector('[data-galaxy-crab-component="filaments"]').getAttribute('aria-pressed')).toBe('false');
    close(canvas._galaxyGetInspectionState().camera, before.camera);
    const components = canvas._galaxyGetInspectionVisualState().crabStructure.components;
    expect(components.find(item => item.kind === 'filaments').visible).toBe(false);
    expect(components.find(item => item.kind === 'wind').visible).toBe(true);
    await band('radio'); expect(host.querySelector('[data-galaxy-crab-components]')).toBeNull();
    await band('infrared'); expect(host.querySelector('[data-galaxy-crab-component="filaments"]').getAttribute('aria-pressed')).toBe('false');
    await React.act(async () => canvas._galaxyExitInspection()); expect(host.querySelector('[data-galaxy-crab-components]')).toBeNull();
    await React.act(async () => setLatest(prev => ({ galaxy: { ...prev.galaxy, galaxyQuality: 'high' } }))); await step();
    expect(typeof canvas._onCrabComponentsChange).toBe('function');
    await React.act(async () => { canvas._galaxyFocusNebula(name); canvas._galaxyInspectSelection(); }); await step();
    expect(canvas._galaxyGetCrabComponentState()).toEqual({ available: true, filaments: false, wind: true });
    expect(host.querySelector('[data-galaxy-crab-component="filaments"]').getAttribute('aria-pressed')).toBe('false');
    await React.act(async () => host.querySelector('[data-galaxy-crab-component="wind"]').click());
    expect(canvas._galaxyGetCrabComponentState().wind).toBe(false);
    expect(host.querySelector('[data-galaxy-crab-component="wind"]').getAttribute('aria-pressed')).toBe('false');
    clean();
  });
  it('uses a schematic close-up label only while a named nebula is actually inspected', async () => {
    const canvas = await mount(true);
    const hostScale = () => host.querySelector('[data-galaxy-live-scale-value]').textContent;
    const panelScale = () => host.querySelector('[data-galaxy-panel-field-height]').textContent;
    expect(hostScale()).toMatch(/\bkpc\b/);
    const name = namedTarget(await targets(), 'helix');
    // Return to View so the panel readout is mounted as well as the stage HUD.
    await React.act(async () => host.querySelector('[data-galaxy-control-tab="view"]').click());
    await React.act(async () => canvas._galaxyFocusNebula(name));
    expect(hostScale()).toMatch(/\bkpc\b/);
    await React.act(async () => canvas._galaxyInspectSelection()); await step();
    expect(hostScale()).toBe('Schematic close-up');
    expect(panelScale()).toBe('Schematic close-up');
    expect(host.querySelector('[data-galaxy-stage]').getAttribute('data-object-controls-visible')).toBe('true');
    expect(host.querySelector('[data-galaxy-live-scale]').getAttribute('aria-label')).toMatch(/schematic/i);
    expect(host.querySelector('[data-galaxy-view-scale]').textContent).toMatch(/no physical size scale/);
    await React.act(async () => canvas._galaxyExitInspection());
    expect(hostScale()).toMatch(/\bkpc\b/);
    expect(panelScale()).toMatch(/\bkpc\b/);
    await React.act(async () => { canvas._galaxyCycleStar(1); canvas._galaxyInspectSelection(); }); await step();
    expect(hostScale()).toMatch(/\bkpc\b/);
    expect(panelScale()).toMatch(/\bkpc\b/);
    const labels = host.querySelector('[data-galaxy-camera-controls] button[data-control-caption="Labels"]');
    await React.act(async () => labels.click());
    expect(host.querySelector('[data-galaxy-stage]').hasAttribute('data-object-controls-visible')).toBe(false);
    await React.act(async () => labels.click());
    expect(host.querySelector('[data-galaxy-stage]').getAttribute('data-object-controls-visible')).toBe('true');
    clean();
  });
});
