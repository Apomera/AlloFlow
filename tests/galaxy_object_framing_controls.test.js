import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, ReactDOMServer, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { installCanvas2DStub, installLoopStubs, installThreeStub } from './helpers/galaxy_three_stub.js';

vi.setConfig({ testTimeout: 120000 });
const source = readFileSync('stem_lab/stem_tool_galaxy.js', 'utf8');
const contextBlock = source.split('// BEGIN GALAXY OBJECT CONTEXT')[1].split('// END GALAXY OBJECT CONTEXT')[0];
const { context, render } = new Function(contextBlock + ';return {context:galaxyObjectContext,render:renderGalaxyObjectContext};')();

describe('Galaxy object framing and backdrop disclosure', () => {
  it('renders available 44px actions with explicit pressed backdrop state and no added scene overlay', () => {
    const holder = document.createElement('div');
    const props = { React, context: context({ kind: 'nebula', nebulaType: 'Planetary' }, 'visible'), name: 'Selected shell', bandLabel: 'Visible', objectFraming: { available: true }, inspectionBackdrop: { available: true, showContext: false }, onFrameObject() {}, onBackdropChange() {} };
    holder.innerHTML = ReactDOMServer.renderToStaticMarkup(render(props));
    const frame = holder.querySelector('[data-galaxy-frame-object="context"]');
    expect(frame.textContent).toBe('Frame whole object');
    expect(frame.style.minHeight).toBe('44px');
    const backdrop = holder.querySelector('[data-galaxy-inspection-backdrop]');
    expect(backdrop.textContent).toBe('Show galaxy context');
    expect(backdrop.getAttribute('aria-pressed')).toBe('false');
    expect(backdrop.style.minHeight).toBe('44px');
    expect(holder.querySelector('[data-galaxy-object-context]').open).toBe(false);
    expect(holder.querySelector('[data-galaxy-selection-dock]')).toBeNull();
    holder.innerHTML = ReactDOMServer.renderToStaticMarkup(render({ ...props, objectFraming: { available: false }, inspectionBackdrop: { available: false, showContext: true } }));
    expect(holder.querySelector('[data-galaxy-frame-object]')).toBeNull();
    expect(holder.querySelector('[data-galaxy-inspection-backdrop]')).toBeNull();
  });
});

describe('Galaxy native object framing UI integration', () => {
  let host, root, restoreCanvas, restoreThree, loops, originalMedia, errors, now, latest, setLatest;
  beforeEach(() => {
    resetStemLab(); globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    window._galaxyHasLoadedOnce = true; window._galaxyPPLoaded = true;
    delete window._galaxyPPLoading; delete window._galaxyPPCallbacks;
    originalMedia = window.matchMedia;
    window.matchMedia = vi.fn(query => ({ matches: query.includes('prefers-reduced-motion'), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
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
  async function mount() {
    window.StemLab.ensureThree = vi.fn(() => Promise.resolve());
    const config = loadTool('stem_lab/stem_tool_galaxy.js', 'galaxy');
    latest = { galaxy: { simMode: 'galaxy', starCount: 2500, galaxyQuality: 'balanced', galaxyAutoRotate: false, layers: { arms: true, bulge: true, blackHole: true, nebulae: true, bgStars: true, grid: false, labels: false, dust: true, gas: true } } };
    function Host() { const state = React.useState(latest); latest = state[0]; setLatest = state[1]; return config.render(makeCtx({ toolData: state[0], setToolData: state[1] })); }
    root = ReactDOMClient.createRoot(host); await React.act(async () => root.render(React.createElement(Host)));
    return host.querySelector('[data-galaxy-canvas]');
  }
  async function step(ms = 1000) { now += ms; await React.act(async () => loops.step()); }
  async function target(key) {
    await React.act(async () => host.querySelector('[data-galaxy-control-tab="discover"]').click());
    const name = [...host.querySelectorAll('[data-galaxy-nebula-target]')].map(node => node.getAttribute('data-galaxy-nebula-target')).find(value => value.toLowerCase().includes(key));
    expect(name).toBeTruthy();
    await React.act(async () => host.querySelector('[data-galaxy-control-tab="view"]').click());
    return name;
  }
  async function band(value) { const select = host.querySelector('[data-galaxy-object-band]'); await React.act(async () => { select.value = value; select.dispatchEvent(new Event('change', { bubbles: true })); }); await step(); }
  function clean() { expect(errors.mock.calls.map(call => call.map(String).join(' ')).filter(message => /\[Galaxy\]|\[StemLab\]/.test(message))).toEqual([]); }

  it('frames through the context button, returns focus to the scene and scopes zoom to actual rendered object inspection', async () => {
    const canvas = await mount(), name = await target('helix');
    expect(host.querySelector('[data-galaxy-frame-object="context"]')).toBeNull();
    await React.act(async () => canvas._galaxyFocusNebula(name));
    expect(host.querySelector('[data-galaxy-frame-object="context"]')).toBeNull();
    await React.act(async () => canvas._galaxyInspectSelection()); await step();
    const details = host.querySelector('[data-galaxy-object-context]'); details.open = true;
    expect(canvas._galaxyGetObjectFramingState().available).toBe(true);
    expect(host.querySelector('[data-galaxy-current-zoom]').textContent).toMatch(/^Object zoom /);
    expect(host.querySelector('[data-galaxy-zoom-slider]').getAttribute('aria-label')).toBe('Object zoom');
    expect(host.querySelector('[data-galaxy-frame-object="view"]').textContent).toBe('100% · Fit object');
    await React.act(async () => canvas._galaxySetZoomPosition(80)); await step();
    const focus = vi.spyOn(canvas, 'focus'); canvas.scrollIntoView = vi.fn();
    const before = canvas._galaxyGetInspectionState();
    await React.act(async () => host.querySelector('[data-galaxy-frame-object="context"]').click()); await step();
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(canvas.scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
    expect(document.activeElement).toBe(canvas);
    expect(canvas._galaxyGetInspectionState()).toMatchObject({ active: true, kind: 'nebula', label: name, orbitCenter: before.orbitCenter });
    expect(canvas._galaxyGetObjectFramingState().zoomPercent).toBeCloseTo(100, 5);
    expect(host.querySelector('[data-galaxy-current-zoom]').textContent).toBe('Object zoom 100%');
    const viewFit = host.querySelector('[data-galaxy-frame-object="view"]'); viewFit.focus(); focus.mockClear();
    await React.act(async () => viewFit.click());
    expect(focus).not.toHaveBeenCalled(); expect(document.activeElement).toBe(viewFit);
    await band('radio');
    expect(host.querySelector('[data-galaxy-object-context]')).toBe(details); expect(details.open).toBe(true);
    expect(host.querySelector('[data-galaxy-frame-object="context"]')).toBeNull();
    expect(host.querySelector('[data-galaxy-current-zoom]').textContent).toMatch(/^Object zoom /);
    expect(host.querySelector('[data-galaxy-zoom-overview]').textContent).toBe('100% · Fit object');
    expect(host.querySelector('[data-galaxy-zoom-overview]').disabled).toBe(true);
    expect(host.querySelector('[data-galaxy-zoom-overview]').getAttribute('title')).toMatch(/Visible or Infrared/);
    await band('infrared');
    expect(host.querySelector('[data-galaxy-frame-object="context"]')).not.toBeNull();
    await React.act(async () => canvas._galaxyExitInspection());
    expect(host.querySelector('[data-galaxy-frame-object]')).toBeNull();
    clean();
  });

  it('binds the context toggle to native backdrop state without changing layers, camera or signal, including a canvas rebuild', async () => {
    const canvas = await mount(), name = await target('crab');
    await React.act(async () => { canvas._galaxyFocusNebula(name); canvas._galaxyInspectSelection(); }); await step();
    const before = canvas._galaxyGetInspectionState(), layers = { ...latest.galaxy.layers };
    let button = host.querySelector('[data-galaxy-inspection-backdrop]');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    await React.act(async () => button.click()); await step();
    expect(canvas._galaxyGetInspectionBackdrop()).toEqual({ available: true, showContext: false });
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(canvas._galaxyGetInspectionState().camera).toEqual(before.camera);
    expect(latest.galaxy.layers).toEqual(layers); expect(latest.galaxy.observeMode || 'visible').toBe('visible');
    await band('radio'); expect(host.querySelector('[data-galaxy-inspection-backdrop]')).toBeNull();
    await band('infrared'); button = host.querySelector('[data-galaxy-inspection-backdrop]');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    await React.act(async () => setLatest(prev => ({ galaxy: { ...prev.galaxy, galaxyQuality: 'high' } }))); await step();
    expect(typeof canvas._onInspectionBackdropChange).toBe('function');
    expect(typeof canvas._onObjectFramingChange).toBe('function');
    await React.act(async () => { canvas._galaxyFocusNebula(name); canvas._galaxyInspectSelection(); }); await step();
    expect(canvas._galaxyGetInspectionBackdrop()).toEqual({ available: true, showContext: false });
    expect(host.querySelector('[data-galaxy-inspection-backdrop]').getAttribute('aria-pressed')).toBe('false');
    expect(host.querySelector('[data-galaxy-frame-object="context"]')).not.toBeNull();
    await React.act(async () => canvas._setLayerVisibility('nebulae', false));
    expect(host.querySelector('[data-galaxy-frame-object]')).toBeNull();
    expect(host.querySelector('[data-galaxy-inspection-backdrop]')).toBeNull();
    clean();
  });
});
