import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { installCanvas2DStub, installLoopStubs, installThreeStub } from './helpers/galaxy_three_stub.js';

vi.setConfig({ testTimeout: 120000 });
describe('Galaxy hover content accessibility', () => {
  let host, root, restoreCanvas, restoreThree, loops, originalMedia, errors, latest, setLatest, now;
  beforeEach(() => {
    resetStemLab(); globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    window._galaxyHasLoadedOnce = true; window._galaxyPPLoaded = true;
    delete window._galaxyPPLoading; delete window._galaxyPPCallbacks;
    originalMedia = window.matchMedia;
    window.matchMedia = vi.fn(query => ({ matches: query.includes('prefers-reduced-motion'), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
    restoreCanvas = installCanvas2DStub().restore; restoreThree = installThreeStub();
    const Attribute = window.THREE.BufferAttribute;
    window.THREE.BufferAttribute = function (array, itemSize) { const attribute = new Attribute(array, itemSize); attribute.setXYZ = (i, x, y, z) => { attribute.array[i * itemSize] = x; attribute.array[i * itemSize + 1] = y; attribute.array[i * itemSize + 2] = z; return attribute; }; return attribute; };
    now = 1000000; vi.spyOn(Date, 'now').mockImplementation(() => now);
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    loops = installLoopStubs(); errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    host = document.createElement('div'); document.body.appendChild(host);
  });
  afterEach(async () => {
    if (root) await React.act(async () => root.unmount()); root = null;
    host.remove(); errors.mockRestore(); loops(); restoreThree(); restoreCanvas(); window.matchMedia = originalMedia;
    delete window.THREE; delete window._galaxyPPLoaded; delete window._galaxyPPLoading; delete window._galaxyPPCallbacks;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT; vi.useRealTimers(); vi.restoreAllMocks();
  });
  const act = async fn => React.act(async () => fn());
  async function tick(ms = 100) { now += ms; await act(() => vi.advanceTimersByTimeAsync(ms)); }
  const rect = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top });
  async function mount() {
    window.StemLab.ensureThree = vi.fn(() => Promise.resolve());
    const config = loadTool('stem_lab/stem_tool_galaxy.js', 'galaxy');
    function Host() { const state = React.useState({ galaxy: { simMode: 'galaxy', starCount: 2500, galaxyQuality: 'balanced', galaxyAutoRotate: false } }); latest = state[0]; setLatest = state[1]; return config.render(makeCtx({ toolData: state[0], setToolData: state[1] })); }
    root = ReactDOMClient.createRoot(host); await act(() => root.render(React.createElement(Host))); await tick(200);
    const canvas = host.querySelector('[data-galaxy-canvas]'), preview = host.querySelector('[data-galaxy-hover-preview]'), stage = canvas.parentElement;
    canvas.getBoundingClientRect = () => rect(0, 0, 800, 540); stage.getBoundingClientRect = () => rect(0, 0, 800, 540);
    Object.defineProperty(stage, 'clientWidth', { configurable: true, value: 800 }); Object.defineProperty(stage, 'clientHeight', { configurable: true, value: 540 });
    Object.defineProperty(preview, 'offsetWidth', { configurable: true, value: 220 }); Object.defineProperty(preview, 'offsetHeight', { configurable: true, value: 72 });
    preview.getBoundingClientRect = () => rect(parseFloat(preview.style.left) || 0, parseFloat(preview.style.top) || 0, 220, 72);
    return { canvas, preview };
  }
  function pointer(target, type, point, relatedTarget = null) {
    const event = new MouseEvent(type, { bubbles: true, clientX: point.x, clientY: point.y, buttons: 0, relatedTarget });
    Object.defineProperty(event, 'pointerType', { value: 'mouse' }); Object.defineProperty(event, 'pointerId', { value: 1 }); target.dispatchEvent(event);
  }
  function escape(target = document.body, options = {}) { const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true, ...options }); target.dispatchEvent(event); return event; }
  function point(canvas, index = 100) { const star = canvas._galaxyGetStarVisualState(index).animated; return { x: (star.x + 1) * 400, y: (1 - star.y) * 270 }; }
  async function previewAt(canvas, target = point(canvas)) { pointer(canvas, 'pointermove', target); await tick(); expect(canvas._galaxyGetHoverState().visible).toBe(true); return canvas._galaxyGetHoverState(); }
  function clean() { expect(errors.mock.calls.flat().map(String).filter(message => /\[Galaxy\]|\[StemLab\]/.test(message))).toEqual([]); }

  it('provides a continuous pointer route into the preview and keeps its information while the preview is hovered', async () => {
    const { canvas, preview } = await mount(), shown = await previewAt(canvas), data = latest.galaxy;
    const card = preview.getBoundingClientRect(), near = { x: Math.max(card.left, Math.min(shown.x, card.right)), y: Math.max(card.top, Math.min(shown.y, card.bottom)) };
    const bridge = { x: shown.x + .8 * (near.x - shown.x), y: shown.y + .8 * (near.y - shown.y) };
    expect(Math.hypot(bridge.x - shown.x, bridge.y - shown.y)).toBeGreaterThan(12);
    pointer(canvas, 'pointermove', bridge); await tick(300);
    expect(canvas._galaxyGetHoverState()).toEqual(shown);
    const center = { x: card.left + card.width / 2, y: card.top + card.height / 2 };
    pointer(canvas, 'pointerleave', center, preview); pointer(preview, 'pointerenter', center, canvas); await tick(1200);
    expect(preview.hidden).toBe(false); expect(canvas._galaxyGetHoverState()).toEqual(shown); expect(latest.galaxy).toBe(data);
    pointer(preview, 'pointerleave', { x: -20, y: -20 }, canvas); await tick();
    expect(canvas._galaxyGetHoverState().visible).toBe(false); clean();
  });

  it('dismisses a mouse preview with Escape without canvas focus, selection changes or an immediate same-target reappearance', async () => {
    const { canvas } = await mount(); await act(() => canvas._galaxyCycleStar(1));
    const target = point(canvas), shown = await previewAt(canvas, target), before = { inspection: canvas._galaxyGetInspectionState(), orbit: { ...canvas._galaxyOrbit }, data: latest.galaxy };
    const button = document.createElement('button'); host.appendChild(button); button.focus();
    const bubbled = vi.fn(); document.body.addEventListener('keydown', bubbled);
    try {
      const event = escape(button); expect(event.defaultPrevented).toBe(true); expect(bubbled).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(button); expect(canvas._galaxyGetHoverState().visible).toBe(false);
      await tick(500); pointer(canvas, 'pointermove', target); await tick(300);
      expect(canvas._galaxyGetHoverState().visible).toBe(false);
      expect(host.querySelector('[data-galaxy-announcer]').textContent).toBe('Object preview dismissed.');
      expect(host.querySelector('#galaxy-canvas-instructions').textContent).toContain('dismisses a pointer preview first');
      expect(canvas._galaxyGetInspectionState()).toEqual(before.inspection); expect(canvas._galaxyOrbit).toEqual(before.orbit); expect(latest.galaxy).toBe(before.data);
      const candidate = Array.from({ length: 100 }, (_, index) => point(canvas, 200 + index)).find(value => value.x > 0 && value.x < 800 && value.y > 0 && value.y < 540 && Math.hypot(value.x - target.x, value.y - target.y) > 100);
      expect(candidate).toBeTruthy(); const next = await previewAt(canvas, candidate);
      expect(next.kind + ':' + next.index).not.toBe(shown.kind + ':' + shown.index);
    } finally { document.body.removeEventListener('keydown', bubbled); }
    clean();
  });

  it.each(['empty space', 'canvas leave'])('permits the dismissed target again after leaving through %s', async path => {
    const { canvas } = await mount(), target = point(canvas); await previewAt(canvas, target);
    expect(canvas._galaxyDismissHoverPreview()).toBe(true);
    if (path === 'empty space') { pointer(canvas, 'pointermove', { x: -20, y: -20 }); await tick(); }
    else pointer(canvas, 'pointerleave', target);
    await previewAt(canvas, target); clean();
  });

  it('keeps a dismissed halo quiet when small pointer movement would pick a different overlapping star', async () => {
    const { canvas } = await mount(), target = point(canvas), original = await previewAt(canvas, target);
    const originalKey = original.kind + ':' + original.index;
    const candidates = Array.from({ length: 2500 }, (_, index) => point(canvas, index)).filter(value => {
      const distance = Math.hypot(value.x - target.x, value.y - target.y);
      return distance > .2 && distance < 10 && value.x > 0 && value.x < 800 && value.y > 0 && value.y < 540;
    }).slice(0, 20);
    let neighbour = null;
    for (const candidate of candidates) {
      pointer(canvas, 'pointerleave', target);
      const visible = await previewAt(canvas, candidate);
      if (visible.kind + ':' + visible.index !== originalKey) { neighbour = candidate; break; }
    }
    expect(neighbour).toBeTruthy();
    pointer(canvas, 'pointerleave', neighbour); await previewAt(canvas, target);
    expect(canvas._galaxyDismissHoverPreview()).toBe(true);
    pointer(canvas, 'pointermove', neighbour); await tick(300);
    expect(canvas._galaxyGetHoverState().visible).toBe(false);
    pointer(canvas, 'pointermove', { x: -20, y: -20 }); await tick();
    await previewAt(canvas, neighbour); clean();
  });

  it('keeps modified keys, IME dismissal and editable/dialog Escape handling untouched', async () => {
    const { canvas } = await mount(); await previewAt(canvas);
    for (const options of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { isComposing: true }, { keyCode: 229 }]) {
      expect(escape(document.body, options).defaultPrevented).toBe(false); expect(canvas._galaxyGetHoverState().visible).toBe(true);
    }
    for (const element of ['input', 'textarea', 'select', 'editable', 'dialog']) {
      const node = document.createElement(['editable', 'dialog'].includes(element) ? 'div' : element);
      if (element === 'editable') node.setAttribute('contenteditable', 'true'); if (element === 'dialog') node.setAttribute('role', 'dialog');
      host.appendChild(node); expect(escape(node).defaultPrevented).toBe(false); expect(canvas._galaxyGetHoverState().visible).toBe(true); node.remove();
    }
    expect(escape().defaultPrevented).toBe(true); expect(canvas._galaxyGetHoverState().visible).toBe(false); clean();
  });

  it('removes preview/key listeners on quality rebuild and teardown, including retained native methods', async () => {
    const add = vi.spyOn(document, 'addEventListener'), remove = vi.spyOn(document, 'removeEventListener');
    const { canvas, preview } = await mount(); await previewAt(canvas);
    const oldGetter = canvas._galaxyGetHoverState, oldDismiss = canvas._galaxyDismissHoverPreview;
    await act(() => setLatest(prev => ({ galaxy: { ...prev.galaxy, galaxyQuality: 'high' } }))); await tick(200);
    expect(oldGetter().visible).toBe(false); expect(oldDismiss()).toBe(false); expect(host.querySelector('[data-galaxy-canvas]')).toBe(canvas);
    await previewAt(canvas); const getter = canvas._galaxyGetHoverState, dismiss = canvas._galaxyDismissHoverPreview;
    await act(() => root.unmount()); root = null; await tick(500);
    expect(canvas._galaxyDismissHoverPreview).toBeNull(); expect(canvas._galaxyGetHoverState).toBeNull(); expect(getter().visible).toBe(false); expect(dismiss()).toBe(false);
    pointer(preview, 'pointerenter', { x: 30, y: 30 }); expect(escape().defaultPrevented).toBe(false);
    const hoverListeners = calls => calls.filter(call => call[0] === 'keydown' && call[1].name === 'onGalaxyHoverKey' && call[2] === true);
    expect(hoverListeners(add.mock.calls)).toHaveLength(2); expect(hoverListeners(remove.mock.calls)).toHaveLength(2); clean();
  });
});
