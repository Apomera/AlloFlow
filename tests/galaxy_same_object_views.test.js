import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab, renderTool } from './helpers/stem_widgets_smoke_harness.js';
import { installCanvas2DStub, installLoopStubs, installThreeStub } from './helpers/galaxy_three_stub.js';

vi.setConfig({ testTimeout: 30000 });
const LIGHT = { simMode: 'galaxy', starCount: 2500, galaxyQuality: 'balanced', galaxyAutoRotate: false };
const SCENE_TIMEOUT = 120000;

describe('Galaxy same-object model views', () => {
  let host, root, restoreCanvas, restoreThree, loops, originalMedia, errors, latest;
  beforeEach(() => {
    resetStemLab();
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    window._galaxyHasLoadedOnce = true;
    window._galaxyPPLoaded = true;
    delete window._galaxyPPLoading;
    delete window._galaxyPPCallbacks;
    originalMedia = window.matchMedia;
    window.matchMedia = vi.fn(query => ({ matches: query.includes('prefers-reduced-motion'), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
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
  async function mount() {
    window.StemLab.ensureThree = vi.fn(() => Promise.resolve());
    const config = loadTool('stem_lab/stem_tool_galaxy.js', 'galaxy');
    latest = { galaxy: LIGHT };
    function Host() { const state = React.useState(latest); latest = state[0]; return config.render(makeCtx({ toolData: state[0], setToolData: state[1] })); }
    root = ReactDOMClient.createRoot(host);
    await React.act(async () => root.render(React.createElement(Host)));
    const canvas = host.querySelector('[data-galaxy-canvas]');
    expect(typeof canvas._galaxyGetInspectionState).toBe('function');
    await React.act(async () => new Promise(resolve => setTimeout(resolve, 0)));
    return canvas;
  }
  async function changeBand(mode) {
    const select = host.querySelector('[data-galaxy-object-band]');
    expect(select).not.toBeNull();
    await React.act(async () => { select.value = mode; select.dispatchEvent(new Event('change', { bubbles: true })); });
  }
  function clean() {
    expect(errors.mock.calls.map(call => call.map(String).join(' ')).filter(message => /\[Galaxy\]|\[StemLab\]/.test(message))).toEqual([]);
  }

  it.each(['star', 'nebula'])('changes the signal around the same %s without losing identity or the close-up camera', async kind => {
    const canvas = await mount();
    await React.act(async () => kind === 'star' ? canvas._galaxyCycleStar(1) : canvas._galaxyCycleNebula(1));
    await React.act(async () => canvas._galaxyInspectSelection());
    const before = canvas._galaxyGetInspectionState();
    const beforeOrbit = { ...canvas._galaxyOrbit };
    const beforeStar = latest.galaxy.selectedStarMeasurement && { ...latest.galaxy.selectedStarMeasurement };
    const beforeNebula = latest.galaxy.selectedNebula;
    const select = host.querySelector('[data-galaxy-object-band]');
    expect(host.querySelector('label[for="' + select.id + '"]').textContent).toBe('Compare this object');
    expect([...select.options].map(option => option.value)).toEqual(['visible', 'infrared', 'radio', 'xray', 'gravity']);
    expect(select.options[4].textContent).toBe('Gravity inference');
    expect(host.querySelector('#galaxy-object-band-help').textContent).toContain('illustrative');
    for (const mode of ['infrared', 'radio', 'xray', 'gravity', 'visible']) {
      await changeBand(mode);
      const after = canvas._galaxyGetInspectionState();
      expect(after).toMatchObject({ active: true, kind, canInspect: true, label: before.label });
      expect(after.camera).toEqual(before.camera);
      expect(after.orbitCenter).toEqual(before.orbitCenter);
      expect(canvas._galaxyOrbit).toEqual(beforeOrbit);
      expect(latest.galaxy.observeMode).toBe(mode);
      expect(latest.galaxy.selectedStarMeasurement).toEqual(beforeStar);
      expect(latest.galaxy.selectedNebula).toBe(beforeNebula);
      expect(host.querySelector('[data-galaxy-object-band]').value).toBe(mode);
    }
    clean();
  }, SCENE_TIMEOUT);

  it('keeps ordinary filters and guided comparisons as explicit clear-and-reframe actions', async () => {
    const canvas = await mount();
    await React.act(async () => { canvas._galaxyCycleStar(1); canvas._galaxyInspectSelection(); });
    const ordinaryFilter = [...host.querySelectorAll('[data-galaxy-controls] button')].find(button => button.textContent.includes('Infrared') && button.textContent.includes('seeing through dust'));
    expect(ordinaryFilter).not.toBeNull();
    await React.act(async () => ordinaryFilter.click());
    expect(latest.galaxy.observeMode).toBe('infrared');
    expect(latest.galaxy.selectedStarMeasurement).toBeNull();
    expect(canvas._galaxyGetInspectionState()).toMatchObject({ active: false, canInspect: false });
    expect(host.querySelector('[data-galaxy-object-band]')).toBeNull();
    await React.act(async () => { canvas._galaxyCycleNebula(1); canvas._galaxyInspectSelection(); });
    await changeBand('xray');
    const guided = host.querySelector('[data-galaxy-evidence-observe="0"]');
    await React.act(async () => guided.click());
    expect(latest.galaxy.observeMode).toBe('visible');
    expect(latest.galaxy.selectedNebula).toBeNull();
    expect(canvas._galaxyGetInspectionState()).toMatchObject({ active: false, canInspect: false });
    expect(latest.galaxy.galaxyEvidenceWorkbench.entries.dust.visited).toEqual([true, false]);
    clean();
  }, SCENE_TIMEOUT);

  it('refuses same-object preservation when the native star identity no longer matches the metadata', async () => {
    const canvas = await mount();
    await React.act(async () => canvas._galaxyCycleStar(1));
    const original = canvas._galaxyGetSelectionVisualState;
    const nativeIndex = original().selectedIndex;
    canvas._galaxyGetSelectionVisualState = () => ({ selectedIndex: nativeIndex + 1 });
    await changeBand('radio');
    canvas._galaxyGetSelectionVisualState = original;
    expect(latest.galaxy.observeMode).toBe('radio');
    expect(latest.galaxy.selectedStar).toBeNull();
    expect(latest.galaxy.selectedStarMeasurement).toBeNull();
    expect(canvas._galaxyGetInspectionState().canInspect).toBe(false);
    clean();
  }, SCENE_TIMEOUT);

  it('starts hover feedback hidden and never promotes persisted metadata to a live comparison target', () => {
    loadTool('stem_lab/stem_tool_galaxy.js', 'galaxy');
    host.innerHTML = renderTool('galaxy', { galaxy: { simMode: 'galaxy', selectedStar: 'M', selectedStarMeasurement: { index: 2, x: 0.5, y: 0, z: 0, radiusNorm: 0.5 } } });
    for (const selector of ['[data-galaxy-hover-preview]', '[data-galaxy-hover-marker]']) {
      const node = host.querySelector(selector);
      expect(node.hidden).toBe(true);
      expect(node.getAttribute('aria-hidden')).toBe('true');
    }
    expect(host.querySelector('[data-galaxy-hover-label]').textContent).toBe('');
    expect(host.querySelector('[data-galaxy-hover-hint]').textContent).toMatch(/click to select/i);
    expect(host.querySelector('[data-galaxy-hover-hint]').textContent).toContain('Escape');
    expect(host.querySelector('[data-galaxy-object-band]')).toBeNull();
  });
});
