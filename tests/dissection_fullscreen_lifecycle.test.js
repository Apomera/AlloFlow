import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const fixtures = [];
const settle = () => new Promise(resolve => setTimeout(resolve, 25));
let originalHelper;
let fullscreenDescriptors, originalOverflow, originalOverscroll;

function loadSharedFullscreen() {
  const source = readFileSync('stem_lab/stem_lab_module.js', 'utf8');
  const start = source.indexOf('var _stemFsProps =');
  const end = source.indexOf('// Fullscreen button binder', start);
  expect(start).toBeGreaterThan(-1); expect(end).toBeGreaterThan(start);
  const segment = source.slice(start, end);
  new Function('window', 'document', segment.slice(0, segment.lastIndexOf('};') + 2))(window, document);
}

async function mountLab(patch = {}) {
  const config = window.StemLab._registry.dissection || loadTool('stem_lab/stem_tool_dissection.js', 'dissection');
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), pluginInstanceToken = {};
  let state;
  function Lab() {
    const [toolData, setToolData] = React.useState({ dissection: {
      specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', toolbarViewOpen: true,
      workspaceMode: 'advanced', reducedMotion: true, soundEnabled: false, ...patch
    } });
    state = toolData.dissection;
    return config.render(makeCtx({ toolData, setToolData, pluginInstanceToken }));
  }
  const fixture = { host, get state() { return state; },
    get entry() { return host.querySelector('[aria-label="Enter fullscreen specimen mode with view and tool controls"]'); },
    get stage() { return host.querySelector('[data-diss-fullscreen-stage]'); },
    get exit() { return host.querySelector('[data-diss-fullscreen-exit]'); },
    async close() { if (!host.isConnected) return; await act(async () => { root.unmount(); }); host.remove(); await act(async () => { await settle(); }); }
  };
  fixtures.push(fixture);
  await act(async () => { root.render(React.createElement(Lab)); });
  await act(async () => { await settle(); });
  return fixture;
}
async function click(control) {
  expect(control).not.toBeNull(); control.focus();
  await act(async () => { control.click(); });
  await act(async () => { await settle(); });
}
async function fallback(stage, active) {
  await act(async () => {
    stage.__alloFsOn = active;
    if (active) stage.setAttribute('data-allo-fullscreen-active', 'true');
    else stage.removeAttribute('data-allo-fullscreen-active');
    await Promise.resolve();
  });
}
beforeEach(() => {
  localStorage.clear(); resetStemLab();
  originalHelper = window.__alloStemFS;
  fullscreenDescriptors = new Map(['fullscreenElement', 'webkitFullscreenElement', 'fullscreenEnabled', 'exitFullscreen']
    .map(name => [name, Object.getOwnPropertyDescriptor(document, name)]));
  originalOverflow = document.body.style.overflow;
  originalOverscroll = document.body.style.overscrollBehavior;
  document.body.style.overflow = 'auto'; document.body.style.overscrollBehavior = 'contain';
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});
afterEach(async () => {
  for (const fixture of fixtures.splice(0).reverse()) await fixture.close();
  window.__alloStemFS = originalHelper;
  window.__alloDissectionFullscreenStage = null;
  window.__alloDissectionFullscreenReturn = null;
  for (const [name, descriptor] of fullscreenDescriptors) {
    if (descriptor) Object.defineProperty(document, name, descriptor); else delete document[name];
  }
  document.body.style.overflow = originalOverflow;
  document.body.style.overscrollBehavior = originalOverscroll;
  vi.restoreAllMocks();
});

describe('dissection fullscreen transition ownership', () => {
  it('waits for delayed CSS fallback before moving focus or announcing entry', async () => {
    window.__alloStemFS = vi.fn();
    const lab = await mountLab();
    await click(lab.entry);
    expect(document.activeElement).toBe(lab.entry);
    expect(lab.host.textContent).not.toContain('Fullscreen specimen mode opened');
    // A native fullscreen request may reject after the first timer has run.
    await fallback(lab.stage, true);
    expect(document.activeElement).toBe(lab.exit);
    expect(lab.host.textContent).toContain('Fullscreen specimen mode opened');
    await fallback(lab.stage, false);
    expect(document.activeElement).toBe(lab.entry);
    expect(lab.stage._dissFullscreenRelease).toBeNull();
  });

  it('ignores an Escape while entry is pending and prevents duplicate requests', async () => {
    const helper = vi.fn(); window.__alloStemFS = helper;
    const lab = await mountLab();
    await click(lab.entry);
    await act(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await settle(); });
    expect(lab.host.textContent).not.toContain('Exited fullscreen specimen mode');
    await click(lab.entry);
    expect(helper).toHaveBeenCalledTimes(1);
    await fallback(lab.stage, true);
    expect(document.activeElement).toBe(lab.exit);
  });

  it('follows prefixed native fullscreen transitions in the originating lab', async () => {
    window.__alloStemFS = vi.fn();
    const first = await mountLab(), second = await mountLab();
    await click(second.entry);
    await act(async () => {
      Object.defineProperty(document, 'webkitFullscreenElement', { configurable: true, value: second.stage });
      document.dispatchEvent(new Event('webkitfullscreenchange'));
    });
    expect(document.activeElement).toBe(second.exit);
    expect(first.host.textContent).not.toContain('Fullscreen specimen mode opened');
    await act(async () => {
      Object.defineProperty(document, 'webkitFullscreenElement', { configurable: true, value: null });
      document.dispatchEvent(new Event('webkitfullscreenchange'));
    });
    expect(document.activeElement).toBe(second.entry);
  });

  it('releases transition handlers and CSS fullscreen when its lab unmounts', async () => {
    window.__alloStemFS = vi.fn(stage => {
      stage.__alloFsOn = !stage.__alloFsOn;
      if (stage.__alloFsOn) stage.setAttribute('data-allo-fullscreen-active', 'true');
      else stage.removeAttribute('data-allo-fullscreen-active');
    });
    const lab = await mountLab();
    await click(lab.entry);
    const stage = lab.stage;
    expect(stage.__alloFsOn).toBe(true);
    await lab.close();
    expect(stage.__alloFsOn).toBe(false);
    expect(stage._dissFullscreenRelease).toBeNull();
    expect(stage._dissFullscreenEscapeHandler).toBeNull();
    expect(window.__alloDissectionFullscreenStage).toBeNull();
  });

  it('cleans up a throwing helper and allows another entry attempt', async () => {
    window.__alloStemFS = vi.fn(() => { throw new Error('unavailable'); });
    const lab = await mountLab();
    await click(lab.entry);
    expect(lab.host.textContent).toContain('Fullscreen is unavailable in this view.');
    expect(lab.stage._dissFullscreenRelease).toBeNull();
    expect(window.__alloDissectionFullscreenStage).toBeNull();
    await click(lab.entry);
    expect(window.__alloStemFS).toHaveBeenCalledTimes(2);
  });

  it('does not lock the page when the real native request rejects after unmount', async () => {
    loadSharedFullscreen();
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true });
    const lab = await mountLab(), stage = lab.stage;
    let rejectEntry;
    stage.requestFullscreen = vi.fn(() => new Promise((resolve, reject) => { rejectEntry = reject; }));
    await click(lab.entry);
    expect(stage.requestFullscreen).toHaveBeenCalledTimes(1);
    await lab.close();
    const addListener = vi.spyOn(document, 'addEventListener');
    await act(async () => { rejectEntry(new Error('fullscreen denied')); await Promise.resolve(); });
    expect(stage.__alloFsOn).not.toBe(true);
    expect(stage.hasAttribute('data-allo-fullscreen-active')).toBe(false);
    expect(document.body.style.overflow).toBe('auto');
    expect(document.body.style.overscrollBehavior).toBe('contain');
    expect(addListener.mock.calls.filter(([type]) => type === 'keydown')).toHaveLength(0);
    expect(stage._dissFullscreenRelease).toBeNull();
    expect(window.__alloDissectionFullscreenStage).toBeNull();
  });

  it('still opens the real CSS fallback after a delayed denial while mounted', async () => {
    loadSharedFullscreen();
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true });
    const lab = await mountLab();
    let rejectEntry;
    lab.stage.requestFullscreen = vi.fn(() => new Promise((resolve, reject) => { rejectEntry = reject; }));
    await click(lab.entry);
    expect(document.activeElement).toBe(lab.entry);
    await act(async () => { rejectEntry(new Error('fullscreen denied')); await Promise.resolve(); });
    expect(document.activeElement).toBe(lab.exit);
    expect(document.body.style.overflow).toBe('hidden');
    await lab.close();
    expect(document.body.style.overflow).toBe('auto');
    expect(document.body.style.overscrollBehavior).toBe('contain');
  });

  it('releases its CSS lock without exiting another element’s native fullscreen', async () => {
    loadSharedFullscreen();
    const lab = await mountLab(), stage = lab.stage;
    await click(lab.entry);
    expect(stage.__alloFsOn).toBe(true);
    const otherOwner = document.createElement('div'); document.body.appendChild(otherOwner);
    const exitNative = vi.fn(() => Promise.resolve());
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: otherOwner });
    Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: exitNative });
    try {
      await lab.close();
      expect(exitNative).not.toHaveBeenCalled();
      expect(document.fullscreenElement).toBe(otherOwner);
      expect(stage.__alloFsOn).toBe(false);
      expect(document.body.style.overflow).toBe('auto');
      expect(document.body.style.overscrollBehavior).toBe('contain');
    } finally { otherOwner.remove(); }
  });

  it.each(['selection', 'annotation', 'ruler'])('Escape exits CSS fullscreen without clearing %s work', async mode => {
    loadSharedFullscreen();
    const lab = await mountLab({ selectedOrgan: 'nictitating', exploredOrgans: { 'frog|nictitating': true },
      annotateMode: mode === 'annotation', rulerMode: mode === 'ruler',
      annotations: [{ x: 0.4, y: 0.5, label: 'Keep this point' }],
      organNotes: { 'frog|nictitating': 'Keep this evidence note.' },
      organConfidence: { 'frog|nictitating': 2 } });
    await click(lab.entry);
    const stage = lab.stage, canvas = stage.querySelector('[data-diss-canvas]');
    const keys = ['selectedOrgan', 'annotateMode', 'rulerMode', 'annotations', 'organNotes', 'organConfidence', 'exploredOrgans'];
    const before = structuredClone(Object.fromEntries(keys.map(key => [key, lab.state[key]])));
    let event;
    await act(async () => {
      canvas.focus();
      event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
      canvas.dispatchEvent(event); await settle();
    });
    expect(event.defaultPrevented).toBe(false); // Native Escape remains available.
    expect(stage.__alloFsOn).toBe(false);
    expect(document.activeElement).toBe(lab.entry);
    expect(Object.fromEntries(keys.map(key => [key, lab.state[key]]))).toEqual(before);
    expect(document.body.style.overflow).toBe('auto');
  });

  it('wraps Tab within visible fullscreen controls, skipping unavailable controls', async () => {
    loadSharedFullscreen();
    const lab = await mountLab(); await click(lab.entry);
    const stage = lab.stage;
    const controls = [...stage.querySelectorAll('button, input, select, textarea, a[href], [tabindex]')];
    // jsdom has no layout: model only the visible dock and canvas endpoints.
    controls.forEach(node => Object.defineProperty(node, 'getClientRects', { configurable: true, value: () => [] }));
    const first = lab.exit, last = stage.querySelector('[data-diss-canvas]');
    for (const node of [first, last]) Object.defineProperty(node, 'getClientRects', { configurable: true, value: () => [{}] });
    const hidden = document.createElement('button'); hidden.hidden = true;
    const disabled = document.createElement('button'); disabled.disabled = true;
    for (const node of [hidden, disabled]) {
      Object.defineProperty(node, 'getClientRects', { configurable: true, value: () => [{}] }); stage.appendChild(node);
    }
    for (const [origin, shiftKey, expected] of [[first, true, last], [last, false, first]]) {
      let event;
      await act(async () => {
        origin.focus(); event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true }); origin.dispatchEvent(event);
      });
      expect(event.defaultPrevented).toBe(true); expect(document.activeElement).toBe(expected);
    }
    hidden.remove(); disabled.remove();
  });

  it('leaves editable keys, modified Tab and another lab outside fullscreen keyboard containment', async () => {
    loadSharedFullscreen();
    const active = await mountLab(), other = await mountLab(); await click(active.entry);
    const input = active.stage.querySelector('input'); expect(input).not.toBeNull();
    for (const key of ['ArrowLeft', 'ArrowRight', 'Home', 'End', '1', 'v']) {
      let event;
      await act(async () => { input.focus(); event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }); input.dispatchEvent(event); });
      expect(event.defaultPrevented).toBe(false); expect(document.activeElement).toBe(input);
    }
    const canvas = active.stage.querySelector('[data-diss-canvas]');
    Object.defineProperty(canvas, 'getClientRects', { configurable: true, value: () => [{}] });
    for (const options of [{ ctrlKey: true }, { altKey: true }, { metaKey: true }, { isComposing: true }, { keyCode: 229 }]) {
      let event;
      await act(async () => { canvas.focus(); event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true, ...options }); canvas.dispatchEvent(event); });
      expect(event.defaultPrevented).toBe(false); expect(document.activeElement).toBe(canvas);
    }
    let event;
    await act(async () => { other.entry.focus(); event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }); other.entry.dispatchEvent(event); });
    expect(event.defaultPrevented).toBe(false); expect(document.activeElement).toBe(other.entry);
  });
});
