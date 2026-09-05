import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const originalMatchMedia = window.matchMedia;

// A deterministic canvas command fingerprint verifies both the saved trails
// and the next drawing steps, in addition to comparing particle state.
function makeContext(canvas) {
  const context = { canvas, fingerprint: 2166136261 };
  function record(operation, args) {
    const text = JSON.stringify([operation, args, context.fillStyle, context.globalCompositeOperation]);
    for (let index = 0; index < text.length; index++) {
      context.fingerprint = Math.imul(context.fingerprint ^ text.charCodeAt(index), 16777619) >>> 0;
    }
  }
  for (const operation of ['fillRect', 'beginPath', 'arc', 'fill']) {
    context[operation] = (...args) => record(operation, args);
  }
  context.drawImage = (image) => {
    context.fingerprint = image._savedFingerprint ?? image._testContext?.fingerprint ?? 0;
  };
  context.createImageData = (width, height) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) });
  context.getImageData = (x, y, width, height) => context.createImageData(width, height);
  context.createLinearGradient = context.createRadialGradient = () => ({ addColorStop() {} });
  return new Proxy(context, {
    get(target, property) {
      if (!(property in target)) target[property] = () => {};
      return target[property];
    },
  });
}

describe('Art Studio reproducible generative experiments', () => {
  let config;
  let host;
  let root;
  let latest;
  let setData;
  let pendingFrames;
  let holdImages;
  let pendingImages;
  let latestSnapshots;
  let onUseArtwork;

  beforeEach(() => {
    resetStemLab();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn(() => ({ matches: false })),
    });
    config = loadTool(process.env.ARTSTUDIO_TEST_SOURCE || 'stem_lab/stem_tool_artstudio.js', 'artStudio');
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(function () {
      if (!this._testContext) this._testContext = makeContext(this);
      return this._testContext;
    });
    vi.spyOn(window.HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(function () {
      return 'data:image/png;base64,' + btoa(String(this.getContext('2d').fingerprint));
    });
    holdImages = false;
    pendingImages = [];
    onUseArtwork = vi.fn();
    vi.stubGlobal('Image', class {
      set src(value) {
        this._savedFingerprint = Number(atob(value.split(',')[1]));
        const complete = () => this.onload?.();
        if (holdImages) pendingImages.push(complete);
        else queueMicrotask(complete);
      }
    });
    pendingFrames = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      pendingFrames.push(callback);
      return pendingFrames.length;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    });
  });

  async function mount(initial = {}) {
    function Harness() {
      const [toolData, setToolData] = React.useState({ artStudio: {
        tab: 'generative', studioHome: false, studioStarted: true,
        genStyle: 'rain', genSeed: 29417, genDensity: 40, genPaused: true, ...initial,
      } });
      const [toolSnapshots, setToolSnapshots] = React.useState([]);
      latestSnapshots = toolSnapshots;
      latest = toolData.artStudio;
      setData = (data) => setToolData({ artStudio: data });
      return config.render(makeCtx({ toolData, setToolData, toolSnapshots, setToolSnapshots, onUseArtwork }));
    }
    await act(async () => { root.render(React.createElement(Harness)); });
  }

  function canvas() { return host.querySelector('#genCanvas'); }
  function capture() { return canvas()._captureArtStudioState(); }
  async function click(text) {
    const button = [...host.querySelectorAll('button')].find((node) => node.textContent.trim() === text);
    expect(button).toBeTruthy();
    await act(async () => { button.click(); });
  }
  async function restore(saved, restoreToken) {
    await act(async () => {
      setData({ ...latest, ...saved, genPaused: true, genReset: restoreToken || (Number(latest.genReset) || 0) + 1 });
    });
  }

  it.each(['flow', 'rain', 'stars', 'aurora'])('repeats identical %s trails and particles at equal steps with the same seed', async (style) => {
    await mount({ genStyle: style });
    expect(capture().genFrame).toBe(0);
    await click('+100 steps');
    await click('+100 steps');
    const first = capture();
    expect(first.genFrame).toBe(200);
    expect(host.querySelector('#artstudio-generative-step').textContent).toBe('Step 200');
    await click('Same seed');
    expect(capture().genFrame).toBe(0);
    await click('+100 steps');
    await click('+100 steps');
    expect(capture()).toEqual(first);
  });

  it('uses a new seed only when requested and makes the resulting field different', async () => {
    await mount();
    await click('+100 steps');
    const first = capture();
    await click('New seed');
    expect(capture().genSeed).not.toBe(first.genSeed);
    expect(capture().genFrame).toBe(0);
    await click('+100 steps');
    expect(capture().genState.particles).not.toEqual(first.genState.particles);
    expect(capture().genSnapshot).not.toBe(first.genSnapshot);
  });

  it('restores an exact saved frame, trails, and bursts, then follows the same random continuation', async () => {
    await mount();
    await click('+100 steps');
    canvas().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await click('+100 steps');
    const saved = capture();
    const immutableSaved = JSON.stringify(saved);
    expect(saved.genState.burstCount).toBe(1);
    await click('+100 steps');
    const uninterrupted = capture();
    await restore({ ...saved, genState: { ...saved.genState, settings: Object.fromEntries(Object.entries(saved.genState.settings).reverse()) } });
    expect(capture()).toEqual(saved);
    await click('+100 steps');
    expect(capture()).toEqual(uninterrupted);
    expect(JSON.stringify(saved)).toBe(immutableSaved);
  });

  it('does not restore old particles after changing an experimental setting', async () => {
    await mount();
    await click('+100 steps');
    const saved = capture();
    await act(async () => {
      setData({ ...latest, ...saved, genDensity: 80 });
    });
    const changed = capture();
    expect(changed.genFrame).toBe(0);
    expect(changed.genSeed).toBe(saved.genSeed);
    expect(changed.genState.particles).toHaveLength(80);
    expect(changed.genState.settings.density).toBe(80);
  });

  it('exports, hands off, and resaves the stored artwork while restored trails are still loading', async () => {
    await mount();
    await click('+100 steps');
    const saved = capture();
    holdImages = true;
    await restore(saved, 'restore-pending-image');
    expect(pendingImages).toHaveLength(1);
    expect(canvas().toDataURL()).not.toBe(saved.genSnapshot);
    expect(canvas()._genExportAction(true)).toBe(saved.genSnapshot);
    const heldFrames = pendingFrames.splice(0);
    heldFrames.forEach((callback) => callback(1));
    expect(capture()).toEqual(saved);

    let exportedSrc;
    vi.spyOn(window.HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
      exportedSrc = this.href;
    });
    await act(async () => { host.querySelector('#artstudio-panel-generative button[aria-label="Export PNG"]').click(); });
    expect(exportedSrc).toBe(saved.genSnapshot);
    const handoff = [...host.querySelectorAll('button')].find((button) => button.textContent.includes('Page Designer'));
    expect(handoff).toBeTruthy();
    await act(async () => { handoff.click(); });
    expect(onUseArtwork).toHaveBeenCalledWith(expect.objectContaining({ src: saved.genSnapshot }), 'page-designer');
    await act(async () => { host.querySelector('button[aria-label="Save current study"]').click(); });
    expect(latestSnapshots).toHaveLength(1);
    expect(latestSnapshots[0].artStudioStudy.previewSrc).toBe(saved.genSnapshot);
    expect(latestSnapshots[0].data.genSnapshot).toBe(saved.genSnapshot);
    expect(latestSnapshots[0].data.genFrame).toBe(saved.genFrame);

    await act(async () => { pendingImages.splice(0).forEach((complete) => complete()); });
    expect(canvas()._genExportAction(true)).toBe('');
    expect(canvas().toDataURL()).toBe(saved.genSnapshot);
    await click('+100 steps');
    expect(canvas()._genExportAction()).toBe(canvas().toDataURL());
    expect(canvas()._genExportAction()).not.toBe(saved.genSnapshot);
  });
  it('captures the live simulation when opening Watercolor and restores it on return', async () => {
    await mount();
    await click('+100 steps');
    canvas().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    canvas()._genAdvance(7);
    const beforeLeave = capture();
    expect(beforeLeave.genFrame).toBe(107);
    expect(latest.genFrame).toBe(100);
    expect(beforeLeave.genState.burstCount).toBe(1);
    async function switchLab(tab) {
      await act(async () => {
        const picker = host.querySelector('#artstudio-mobile-tool-picker');
        picker.value = tab;
        picker.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }
    await switchLab('watercolor');
    expect(latest.tab).toBe('watercolor');
    expect(latest.genFrame).toBe(107);
    expect(latest.genState).toEqual(beforeLeave.genState);
    await switchLab('generative');
    expect(latest.tab).toBe('generative');
    expect(capture()).toEqual(beforeLeave);
  });
  it('pauses during exact-step experiments and ignores animation callbacks from disconnected canvases', async () => {
    await mount({ genPaused: false });
    const oldCanvas = canvas();
    await click('+100 steps');
    const paused = capture();
    expect(paused.genPaused).toBe(true);
    const queued = pendingFrames.splice(0);
    queued.forEach((callback) => callback(1));
    expect(capture()).toEqual(paused);
    await click('Same seed');
    expect(oldCanvas.isConnected).toBe(false);
    const pendingCount = pendingFrames.length;
    queued.forEach((callback) => callback(2));
    expect(pendingFrames.length).toBe(pendingCount);
    expect(capture().genFrame).toBe(0);
  });
});
