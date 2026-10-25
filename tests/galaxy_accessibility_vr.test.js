import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { installCanvas2DStub, installLoopStubs } from './helpers/galaxy_three_stub.js';

describe('Galaxy VR accessible activation', () => {
  let root, host, restoreCanvas, loops, xrDescriptor, media, supported, deviceChange, xr;
  beforeEach(() => {
    resetStemLab(); globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    window._galaxyHasLoadedOnce = true;
    media = window.matchMedia;
    window.matchMedia = vi.fn(query => ({ matches: query.includes('prefers-reduced-motion'), media: query, addEventListener() {}, removeEventListener() {} }));
    xrDescriptor = Object.getOwnPropertyDescriptor(navigator, 'xr'); supported = true; deviceChange = null;
    xr = { isSessionSupported: vi.fn(async () => supported), addEventListener: vi.fn((type, callback) => { if (type === 'devicechange') deviceChange = callback; }), removeEventListener: vi.fn() };
    Object.defineProperty(navigator, 'xr', { configurable: true, value: xr });
    restoreCanvas = installCanvas2DStub().restore; loops = installLoopStubs();
    // Keep the graphics loader pending: the real conditional control and React
    // effects can be exercised without allocating a scene or requesting a headset.
    window.StemLab.ensureThree = vi.fn(() => new Promise(() => {}));
    host = document.createElement('div'); document.body.appendChild(host);
  });
  afterEach(async () => {
    if (root) await React.act(async () => root.unmount()); root = null;
    host.remove(); loops(); restoreCanvas(); window.matchMedia = media;
    if (xrDescriptor) Object.defineProperty(navigator, 'xr', xrDescriptor); else delete navigator.xr;
    delete window._galaxyVR; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    vi.restoreAllMocks();
  });
  async function mount() {
    const config = loadTool('stem_lab/stem_tool_galaxy.js', 'galaxy');
    function Host() {
      const state = React.useState({ galaxy: { simMode: 'galaxy', galaxyControlPanel: 'time', galaxyAutoRotate: false, galaxyQuality: 'balanced', starCount: 2500 } });
      return config.render(makeCtx({ toolData: state[0], setToolData: state[1] }));
    }
    root = ReactDOMClient.createRoot(host);
    await React.act(async () => root.render(React.createElement(Host)));
  }
  it('uses the same native button activation path for keyboard and pointer without requesting twice on pointer down', async () => {
    await mount();
    const button = host.querySelector('[data-galaxy-vr-enter]'), enterVR = vi.fn();
    window._galaxyVR = { enterVR };
    expect(button).not.toBeNull(); expect(button.type).toBe('button');
    expect(button.getAttribute('aria-label')).toBe('Enter VR (needs a headset)');
    button.focus(); expect(document.activeElement).toBe(button);
    await React.act(async () => button.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true, cancelable: true })));
    expect(enterVR).not.toHaveBeenCalled();
    await React.act(async () => button.dispatchEvent(new MouseEvent('click', { detail: 1, bubbles: true, cancelable: true })));
    expect(enterVR).toHaveBeenCalledTimes(1);
    // Enter/Space activation of a native button produces a detail=0 click.
    await React.act(async () => button.dispatchEvent(new MouseEvent('click', { detail: 0, bubbles: true, cancelable: true })));
    expect(enterVR).toHaveBeenCalledTimes(2);
  });
  it('keeps headset availability gating and removes the live capability listener on teardown', async () => {
    supported = false; await mount();
    expect(host.querySelector('[data-galaxy-vr-enter]')).toBeNull();
    supported = true; await React.act(async () => deviceChange());
    expect(host.querySelector('[data-galaxy-vr-enter]')).not.toBeNull();
    supported = false; await React.act(async () => deviceChange());
    expect(host.querySelector('[data-galaxy-vr-enter]')).toBeNull();
    await React.act(async () => root.unmount()); root = null;
    expect(xr.removeEventListener).toHaveBeenCalledWith('devicechange', deviceChange);
  });
});
