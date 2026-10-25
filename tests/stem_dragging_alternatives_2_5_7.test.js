import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React as HReact, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// WCAG 2.5.7 Dragging Movements: every drag needs a single-pointer, non-drag
// alternative. Keyboard support alone does not count.
//
//  - Angle Explorer: the second ray could only be dragged (or moved by arrow
//    keys). It now has a range input that sets it by a click on the track.
//  - Plate Tectonics epicenter explorer: the epicenter and the three stations
//    could only be dragged (or arrow-keyed). Now pressing a point selects it and
//    a click on empty map moves the selected point there.
//
// VPAT_DRAG_ANGLES_SRC / VPAT_DRAG_PT_SRC point at other copies (mutation
// check: the pre-fix copies must turn these red).

const ANGLES = process.env.VPAT_DRAG_ANGLES_SRC || 'stem_lab/stem_tool_angles.js';
const PT = process.env.VPAT_DRAG_PT_SRC || 'stem_lab/stem_tool_platetectonics.js';

describe('Angle Explorer second ray: click-settable without dragging', () => {
  let root = null;
  let host = null;
  beforeEach(() => { resetStemLab(); loadTool(ANGLES, 'protractor'); });
  afterEach(async () => {
    if (root) { await HReact.act(async () => { root.unmount(); }); root = null; }
    if (host) { host.remove(); host = null; }
  });

  it('a range input sets secondAngle when the second ray is shown', async () => {
    const tool = window.StemLab._registry.protractor;
    const view = { d: null };
    function App() {
      const [toolData, setToolData] = HReact.useState({ protractor: { showSecondRay: true, secondAngle: 120 } });
      view.d = toolData.protractor;
      const ctx = makeCtx({
        toolData, setToolData,
        update: (tool_, k, v) => setToolData((p) => Object.assign({}, p, { [tool_]: Object.assign({}, p[tool_], { [k]: v }) })),
        updateMulti: (tool_, o) => setToolData((p) => Object.assign({}, p, { [tool_]: Object.assign({}, p[tool_], o) })),
      });
      return tool.render(ctx);
    }
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    await HReact.act(async () => { root.render(HReact.createElement(App)); });
    const handle = host.querySelector('circle[role="slider"][aria-label="Second angle ray handle"]');
    expect(handle, 'second ray handle not rendered').toBeTruthy();
    const range = [...host.querySelectorAll('input[type="range"]')].find((r) => r.getAttribute('aria-label') === 'Second angle ray handle');
    expect(range, 'no non-drag control for the second ray').toBeTruthy();
    expect(range.value).toBe('120');
    await HReact.act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(range, '200');
      range.dispatchEvent(new window.Event('input', { bubbles: true }));
      range.dispatchEvent(new window.Event('change', { bubbles: true }));
    });
    expect(view.d.secondAngle).toBe(200);
  });
});

describe('Plate Tectonics epicenter map: click-to-place without dragging', () => {
  const act = HReact.act;
  let mounted = [];
  beforeEach(() => {
    window.HTMLCanvasElement.prototype.getContext = function () {
      return new Proxy({ measureText: () => ({ width: 20 }), createLinearGradient: () => ({ addColorStop() {} }) },
        { get: (target, key) => (key in target ? target[key] : () => {}) });
    };
    window.matchMedia = () => ({ matches: true, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
    window.ResizeObserver = globalThis.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} };
    window.requestAnimationFrame = globalThis.requestAnimationFrame = vi.fn(() => 1);
    window.cancelAnimationFrame = globalThis.cancelAnimationFrame = vi.fn();
    resetStemLab();
    window.AlloTectonicsEpicenter = null;
    new Function(fs.readFileSync(PT, 'utf8'))();
    expect(typeof window.AlloTectonicsEpicenter).toBe('function');
  });
  afterEach(() => {
    mounted.forEach(({ r, h }) => { act(() => { r.unmount(); }); h.remove(); });
    mounted = [];
  });

  function mount() {
    const h = document.createElement('div'); document.body.appendChild(h);
    const r = ReactDOMClient.createRoot(h);
    mounted.push({ r, h });
    const announceToSR = vi.fn();
    act(() => { r.render(HReact.createElement(window.AlloTectonicsEpicenter, { onRecord: vi.fn(), announceToSR, t: (_k, fb) => fb })); });
    const canvas = h.querySelector('[data-pt-epicenter-canvas]');
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 540, height: 360, right: 540, bottom: 360 });
    return { h, canvas, announceToSR };
  }
  const readings = (h) => [...h.querySelectorAll('[data-pt-epi-reading]')].map((r) => r.textContent).join(' | ');
  const tap = (canvas, x, y) => act(() => {
    canvas.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: x, clientY: y }));
    canvas.dispatchEvent(new window.MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX: x, clientY: y }));
  });

  it('a click on empty map moves the epicenter there (no drag)', () => {
    const { h, canvas } = mount();
    const before = readings(h);
    tap(canvas, 400, 80);
    expect(readings(h), 'readings unchanged: the click did not move the epicenter').not.toBe(before);
    // Epicenter at (400, 80) is 50 px (200 km) from Pasadena's x and 180 px down:
    // Pasadena (450, 260) is now nearer than Berkeley (90, 90) on the readings card.
    const km = (id) => Number(h.querySelector('[data-pt-epi-reading="' + id + '"]').textContent.match(/(\d+)\s*km/)[1]);
    expect(km('PAS')).toBeLessThan(km('BRK'));
  });

  it('tapping a station selects it; the next tap on the map places that station', () => {
    const { h, canvas } = mount();
    tap(canvas, 450, 260); // press Pasadena (no drag)
    const select = h.querySelector('[data-pt-epicenter-target]');
    expect(select.value).toBe('PAS');
    const pasBefore = h.querySelector('[data-pt-epi-reading="PAS"]').textContent;
    const brkBefore = h.querySelector('[data-pt-epi-reading="BRK"]').textContent;
    tap(canvas, 300, 130); // empty map, 54 px from the epicenter (280, 180)
    expect(h.querySelector('[data-pt-epi-reading="PAS"]').textContent).not.toBe(pasBefore);
    expect(h.querySelector('[data-pt-epi-reading="BRK"]').textContent).toBe(brkBefore);
  });
});
