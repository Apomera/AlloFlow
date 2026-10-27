import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React as HReact, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// WCAG 2.5.7 Dragging Movements (lane B): every drag needs a single-pointer,
// non-drag alternative. Keyboard support alone does not count.
//
//  - Play Lab (football): players could only be repositioned by dragging.
//    Now a tap on a player picks them up and a tap on open field places them.
//  - Ecosystem sandbox Move tool: animals could only be dragged (or keyboard
//    picked). Now a click on an animal picks it up and the next click drops it.
//
// VPAT_DRAG_PLAYLAB_SRC / VPAT_DRAG_ECO_SRC point at other copies (the pre-fix
// copies must turn these red).

const PLAYLAB = process.env.VPAT_DRAG_PLAYLAB_SRC || 'stem_lab/stem_tool_playlab.js';
const ECO = process.env.VPAT_DRAG_ECO_SRC || 'stem_lab/stem_tool_ecosystem.js';
const act = HReact.act;

function stubCanvasEnv() {
  window.HTMLCanvasElement.prototype.getContext = function () {
    return new Proxy({ measureText: () => ({ width: 20 }), createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }), getImageData: () => ({ data: new Uint8ClampedArray(4) }) },
      { get: (target, key) => (key in target ? target[key] : () => {}) });
  };
  window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  window.ResizeObserver = globalThis.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} };
  window.requestAnimationFrame = globalThis.requestAnimationFrame = vi.fn(() => 1);
  window.cancelAnimationFrame = globalThis.cancelAnimationFrame = vi.fn();
}

function mountTool(toolId, seed, announceToSR) {
  const tool = window.StemLab._registry[toolId];
  const view = { data: null };
  function App() {
    const [toolData, setToolData] = HReact.useState(seed);
    view.data = toolData;
    const ctx = makeCtx({
      toolData, setToolData, announceToSR: announceToSR || (() => {}),
      update: (k, v) => setToolData((p) => Object.assign({}, p, { [toolId]: Object.assign({}, p[toolId], { [k]: v }) })),
      updateMulti: (o) => setToolData((p) => Object.assign({}, p, { [toolId]: Object.assign({}, p[toolId], o) })),
    });
    return tool.render(ctx);
  }
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  act(() => { root.render(HReact.createElement(App)); });
  return { host, root, view };
}

const mouse = (el, type, x, y) => el.dispatchEvent(new window.MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, detail: 1 }));

describe('Play Lab: tap a player, then tap the field (no drag)', () => {
  let mounted = null;
  beforeEach(() => { stubCanvasEnv(); resetStemLab(); loadTool(PLAYLAB, 'playlab'); });
  afterEach(() => { if (mounted) { act(() => { mounted.root.unmount(); }); mounted.host.remove(); mounted = null; } });

  it('picks up a player on tap and places them on the next tap', () => {
    mounted = mountTool('playlab', { playlab: { sport: 'football', playId: 'slant', coverageId: 'cover2', losX: 25, customPositions: {} } });
    const { host, view } = mounted;
    const canvas = host.querySelector('canvas[data-playlab-canvas]');
    expect(canvas).toBeTruthy();
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 720, height: 360, right: 720, bottom: 360, x: 0, y: 0 });
    canvas._plLogicalW = 720; canvas._plLogicalH = 360;
    const live = () => (document.getElementById('allo-live-playlab') || {}).textContent || '';
    const toClient = (yx, yy) => [30 + (yx / 120) * 660, 18 + (yy / 53.33) * 310];
    // Find a player by tapping across the offensive backfield.
    let pid = null;
    for (let yx = 10; yx <= 30 && !pid; yx += 1) {
      for (let yy = 2; yy <= 52 && !pid; yy += 2) {
        const [cx, cy] = toClient(yx, yy);
        act(() => { mouse(canvas, 'mousedown', cx, cy); });
        const m = live().match(/^Dragging (\S+)\./);
        act(() => { mouse(canvas, 'mouseup', cx, cy); });
        if (m) pid = m[1];
      }
    }
    expect(pid, 'no player found on the field').toBeTruthy();
    expect(live()).toContain('Picked up ' + pid);
    expect(host.querySelector('[data-playlab-picked="' + pid + '"]'), 'visible picked-up status').toBeTruthy();
    expect((view.data.playlab.customPositions || {})[pid]).toBeUndefined();
    // Tap open field far from every offensive player.
    const [tx, ty] = toClient(100, 40);
    act(() => { mouse(canvas, 'mousedown', tx, ty); mouse(canvas, 'mouseup', tx, ty); });
    expect(view.data.playlab.customPositions[pid]).toEqual({ x: 100, y: 40 });
    expect(host.querySelector('[data-playlab-picked]')).toBeNull();
    expect(live()).toContain('Placed ' + pid);
  });
});

describe('Ecosystem sandbox Move tool: click to pick up, click to drop (no drag)', () => {
  let mounted = null;
  let widthDesc, heightDesc;
  beforeEach(() => {
    stubCanvasEnv();
    widthDesc = Object.getOwnPropertyDescriptor(window.HTMLElement.prototype, 'clientWidth');
    heightDesc = Object.getOwnPropertyDescriptor(window.HTMLElement.prototype, 'clientHeight');
    Object.defineProperty(window.HTMLCanvasElement.prototype, 'clientWidth', { configurable: true, get() { return 400; } });
    Object.defineProperty(window.HTMLCanvasElement.prototype, 'clientHeight', { configurable: true, get() { return 300; } });
    resetStemLab();
    loadTool(ECO, 'ecosystem');
  });
  afterEach(() => {
    if (mounted) { act(() => { mounted.root.unmount(); }); mounted.host.remove(); mounted = null; }
    delete window.HTMLCanvasElement.prototype.clientWidth;
    delete window.HTMLCanvasElement.prototype.clientHeight;
    void widthDesc; void heightDesc;
    if (window._ecosystemCanvasCleanup) window._ecosystemCanvasCleanup();
  });

  it('a click on an animal picks it up and the next click drops it there', () => {
    const announce = vi.fn();
    mounted = mountTool('ecosystem', { ecosystem: { tab: 'sandbox', sandboxTool: 'move', simPaused: true } }, announce);
    const canvas = mounted.host.querySelector('canvas[data-eco-canvas]');
    expect(canvas).toBeTruthy();
    expect(canvas.dataset.sandboxTool).toBe('move');
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 300, right: 400, bottom: 300, x: 0, y: 0 });
    // Tap across the scene until a press lands on an animal (press + release in place, then the click).
    let held = null;
    for (let x = 10; x < 400 && !held; x += 15) {
      for (let y = 10; y < 300 && !held; y += 15) {
        act(() => { mouse(canvas, 'mousedown', x, y); });
        const pressedOn = canvas._dragEntity;
        act(() => { mouse(canvas, 'mouseup', x, y); mouse(canvas, 'click', x, y); });
        if (pressedOn) held = pressedOn;
      }
    }
    expect(held, 'no animal found to pick up').toBeTruthy();
    expect(canvas._moveHeld, 'a tap (no drag) should leave the animal picked up').toBe(held);
    expect(announce.mock.calls.map((c) => c[0]).join(' | ')).toContain('Picked up');
    // Drop on a spot: press/release/click with no movement, away from where it was.
    const dropX = held.x < 200 ? 330 : 40, dropY = 150;
    act(() => { mouse(canvas, 'mousedown', dropX, dropY); });
    const pressedOnAnother = canvas._dragEntity;
    act(() => { mouse(canvas, 'mouseup', dropX, dropY); mouse(canvas, 'click', dropX, dropY); });
    expect(canvas._moveHeld).toBeNull();
    expect(held.x).toBe(dropX);
    expect(held.y).toBe(dropY);
    expect(pressedOnAnother === held).toBe(false);
  });

  it('a real drag still moves the animal and does not leave it picked up', () => {
    mounted = mountTool('ecosystem', { ecosystem: { tab: 'sandbox', sandboxTool: 'move', simPaused: true } });
    const canvas = mounted.host.querySelector('canvas[data-eco-canvas]');
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 300, right: 400, bottom: 300, x: 0, y: 0 });
    let start = null;
    for (let x = 10; x < 400 && !start; x += 15) {
      for (let y = 10; y < 300 && !start; y += 15) {
        act(() => { mouse(canvas, 'mousedown', x, y); });
        if (canvas._dragEntity) start = [x, y]; else act(() => { mouse(canvas, 'mouseup', x, y); });
      }
    }
    expect(start).toBeTruthy();
    act(() => { mouse(canvas, 'mousemove', start[0] + 40, start[1]); mouse(canvas, 'mouseup', start[0] + 40, start[1]); mouse(canvas, 'click', start[0] + 40, start[1]); });
    expect(canvas._dragging).toBe(false);
    expect(canvas._moveHeld == null).toBe(true);
  });
});
