import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { installCanvas2DStub, installLoopStubs, installThreeStub } from './helpers/galaxy_three_stub.js';

describe('Galaxy alternatives to dragging', () => {
  let host, root, restoreCanvas, restoreThree, loops, originalMedia, now, setLatest, errors;
  beforeEach(() => {
    resetStemLab(); globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    window._galaxyHasLoadedOnce = true; window._galaxyPPLoaded = true;
    originalMedia = window.matchMedia;
    window.matchMedia = vi.fn(query => ({ matches: query.includes('prefers-reduced-motion'), media: query, addEventListener() {}, removeEventListener() {} }));
    now = 1000000; vi.spyOn(Date, 'now').mockImplementation(() => now);
    restoreCanvas = installCanvas2DStub().restore; restoreThree = installThreeStub(); loops = installLoopStubs();
    const Attribute = window.THREE.BufferAttribute;
    window.THREE.BufferAttribute = function (array, itemSize) { const attr = new Attribute(array, itemSize); attr.setXYZ = (i, x, y, z) => { attr.array[i * itemSize] = x; attr.array[i * itemSize + 1] = y; attr.array[i * itemSize + 2] = z; return attr; }; return attr; };
    host = document.createElement('div'); document.body.appendChild(host);
    errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(async () => {
    if (root) await React.act(async () => root.unmount()); root = null;
    host.remove(); errors.mockRestore(); loops(); restoreThree(); restoreCanvas(); window.matchMedia = originalMedia;
    delete window.THREE; delete window._galaxyPPLoaded; delete window._galaxyPPLoading; delete window._galaxyPPCallbacks;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT; vi.restoreAllMocks();
  });
  const act = async fn => React.act(async () => fn());
  async function mount() {
    window.StemLab.ensureThree = vi.fn(() => Promise.resolve());
    const config = loadTool('stem_lab/stem_tool_galaxy.js', 'galaxy');
    function Host() { const state = React.useState({ galaxy: { simMode: 'galaxy', starCount: 2500, galaxyQuality: 'balanced', galaxyAutoRotate: false } }); setLatest = state[1]; return config.render(makeCtx({ toolData: state[0], setToolData: state[1] })); }
    root = ReactDOMClient.createRoot(host); await act(() => root.render(React.createElement(Host)));
    return host.querySelector('[data-galaxy-canvas]');
  }
  async function step() { now += 1000; await act(() => loops.step()); }
  function clean() { expect(errors.mock.calls.flat().map(String).filter(message => /\[Galaxy\]|\[StemLab\]/.test(message))).toEqual([]); }

  it('offers four labelled click targets that match arrow-key orbiting without changing selected object or zoom', async () => {
    const canvas = await mount();
    await act(() => { canvas._galaxyFocusNebula('stem.galaxy.helix_nebula'); canvas._galaxyInspectSelection(); }); await step();
    const controls = [...host.querySelectorAll('[data-galaxy-orbit-step]')];
    expect(controls.map(node => node.getAttribute('data-galaxy-orbit-step'))).toEqual(['left', 'right', 'up', 'down']);
    const inspection = canvas._galaxyGetInspectionState(), radius = canvas._galaxyOrbit.r;
    const start = { ...canvas._galaxyOrbit };
    for (const [direction, key] of [['left', 'ArrowLeft'], ['right', 'ArrowRight'], ['up', 'ArrowUp'], ['down', 'ArrowDown']]) {
      const button = controls.find(node => node.getAttribute('data-galaxy-orbit-step') === direction);
      expect(button.textContent.trim()).not.toBe(''); expect(button.style.minHeight).toBe('44px');
      Object.assign(canvas._galaxyOrbit, start); canvas._galaxyUpdateCam();
      button.focus(); await act(() => button.click()); const clicked = { ...canvas._galaxyOrbit };
      expect(document.activeElement).toBe(button);
      Object.assign(canvas._galaxyOrbit, start); canvas._galaxyUpdateCam();
      await act(() => canvas.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })));
      expect(canvas._galaxyOrbit).toEqual(clicked); expect(canvas._galaxyOrbit.r).toBe(radius);
      expect(canvas._galaxyGetInspectionState()).toMatchObject({ active: true, label: inspection.label, orbitCenter: inspection.orbitCenter });
    }
    const beforeInvalid = { ...canvas._galaxyOrbit };
    for (const direction of ['', null, {}, 'diagonal']) expect(canvas._galaxyNudgeCamera(direction)).toBe(false);
    expect(canvas._galaxyOrbit).toEqual(beforeInvalid);
    const retained = canvas._galaxyNudgeCamera;
    await act(() => root.unmount()); root = null;
    expect(canvas._galaxyNudgeCamera).toBeNull(); expect(retained('left')).toBe(false); clean();
  });

  it('exposes the true splitter range and updates it after clamping, keyboard resizing and a narrower viewport', async () => {
    const canvas = await mount(), workspace = host.querySelector('[data-galaxy-workspace]');
    let width = 800; Object.defineProperty(workspace, 'clientWidth', { configurable: true, get: () => width });
    const separator = host.querySelector('[data-galaxy-panel-resizer]');
    expect(document.getElementById(separator.getAttribute('aria-controls'))).toBe(host.querySelector('[data-galaxy-controls]'));
    await act(() => canvas._galaxySetPanelWidth(9999));
    expect(separator.getAttribute('aria-valuemax')).toBe('480'); expect(separator.getAttribute('aria-valuenow')).toBe('480');
    expect(separator.getAttribute('aria-valuetext')).toBe('480 pixels');
    await act(() => separator.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true })));
    expect(separator.getAttribute('aria-valuenow')).toBe('240');
    await act(() => separator.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true })));
    expect(separator.getAttribute('aria-valuenow')).toBe('480');
    width = 600; await act(() => canvas._galaxySetPanelWidth(canvas._galaxyGetPanelWidth()));
    expect(separator.getAttribute('aria-valuemax')).toBe('360'); expect(separator.getAttribute('aria-valuenow')).toBe('360');
    await act(() => setLatest(prev => ({ galaxy: { ...prev.galaxy, accessibilityTestRender: true } })));
    const current = Number(separator.getAttribute('aria-valuenow'));
    expect(current).toBeGreaterThanOrEqual(Number(separator.getAttribute('aria-valuemin')));
    expect(current).toBeLessThanOrEqual(Number(separator.getAttribute('aria-valuemax'))); clean();
  });
});
