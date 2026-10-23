import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { installCanvas2DStub, installLoopStubs, installThreeStub } from './helpers/galaxy_three_stub.js';

vi.setConfig({ testTimeout: 120000 });
describe('Galaxy live orientation navigation', () => {
  let root, host, restoreCanvas, restoreThree, restoreLoops, originalMedia, errors, latest;
  beforeEach(() => {
    resetStemLab();
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    window._galaxyHasLoadedOnce = true; window._galaxyPPLoaded = true;
    delete window._galaxyPPLoading; delete window._galaxyPPCallbacks;
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
    restoreLoops = installLoopStubs();
    errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    host = document.createElement('div'); document.body.appendChild(host);
  });
  afterEach(async () => {
    if (root) await React.act(async () => root.unmount());
    root = null; host.remove();
    errors.mockRestore(); restoreLoops(); restoreThree(); restoreCanvas();
    window.matchMedia = originalMedia;
    delete window._galaxyPPLoaded; delete window._galaxyPPLoading; delete window._galaxyPPCallbacks;
    delete window.THREE; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    vi.restoreAllMocks();
  });
  async function mount() {
    window.StemLab.ensureThree = vi.fn(() => Promise.resolve());
    const config = loadTool('stem_lab/stem_tool_galaxy.js', 'galaxy');
    latest = { galaxy: { simMode: 'galaxy', starCount: 2500, galaxyQuality: 'balanced', galaxyAutoRotate: false } };
    function Host() { const state = React.useState(latest); latest = state[0]; return config.render(makeCtx({ toolData: state[0], setToolData: state[1] })); }
    root = ReactDOMClient.createRoot(host);
    await React.act(async () => root.render(React.createElement(Host)));
    await React.act(async () => new Promise(resolve => setTimeout(resolve, 0)));
    return host.querySelector('[data-galaxy-canvas]');
  }
  it('cycles real camera inclinations while preserving the inspected star, zoom and azimuth', async () => {
    const canvas = await mount();
    await React.act(async () => { canvas._galaxyCycleStar(1); canvas._galaxyInspectSelection(); });
    const selected = canvas._galaxyGetInspectionState();
    const radius = canvas._galaxyOrbit.r, theta = canvas._galaxyOrbit.theta;
    const index = latest.galaxy.selectedStarMeasurement.index;
    for (const expected of ['edge', 'face', 'angled']) {
      const button = host.querySelector('button[data-galaxy-orientation]');
      expect(button.getAttribute('data-next-view')).toBe(expected);
      expect(button.style.minHeight).toBe('44px');
      await React.act(async () => button.click());
      expect(canvas._galaxyGetOrientationState().preset).toBe(expected);
      expect(canvas._galaxyOrbit.r).toBe(radius);
      expect(canvas._galaxyOrbit.theta).toBe(theta);
      expect(latest.galaxy.selectedStarMeasurement.index).toBe(index);
      expect(canvas._galaxyGetInspectionState()).toMatchObject({ active: true, kind: 'star', label: selected.label, orbitCenter: selected.orbitCenter });
      const displays = host.querySelectorAll('[data-galaxy-orientation-display]');
      expect(displays.length).toBe(2);
      for (const display of displays) {
        expect(display.querySelector('[data-galaxy-orientation-front]').getAttribute('d')).toBe(canvas._galaxyGetOrientationState().front);
        expect(display.querySelector('[data-galaxy-orientation-reference]').textContent).toBe('Galaxy disk');
      }
    }
    await React.act(async () => { canvas._galaxyOrbit.phi = Math.PI * 0.65; canvas._galaxyUpdateCam(); });
    expect(canvas._galaxyGetOrientationState().roundedElevation).toBe(-27);
    expect(host.querySelector('[data-galaxy-orientation-panel] [data-galaxy-orientation-elevation]').textContent).toBe('-27°');
    expect(host.querySelector('button[data-galaxy-orientation]').getAttribute('aria-label')).toContain('Switch to Face-on view');
    const labels = host.querySelector('[data-galaxy-camera-controls] button[data-control-caption="Labels"]');
    await React.act(async () => labels.click());
    expect(host.querySelector('button[data-galaxy-orientation]')).toBeNull();
    expect(host.querySelector('[data-galaxy-orientation-panel]')).not.toBeNull();
    await React.act(async () => labels.click());
    expect(host.querySelector('button[data-galaxy-orientation] [data-galaxy-orientation-elevation]').textContent).toBe('-27°');
    expect(errors.mock.calls.map(call => call.map(String).join(' ')).filter(message => /\[Galaxy\]|\[StemLab\]/.test(message))).toEqual([]);
  });
});
