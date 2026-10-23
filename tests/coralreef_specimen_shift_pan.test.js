import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
let X, namespace, api, renderers, models, observers;
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; renderers = []; models = []; observers = [];
  class Renderer {
    constructor(options) { this.canvas = options.canvas; this.capabilities = { isWebGL2: true }; this.ratio = 1; this.info = { programs: [] }; this.getContext = () => ({ isContextLost: () => false }); this.render = vi.fn(); this.dispose = vi.fn(); this.forceContextLoss = vi.fn(); renderers.push(this); }
    setPixelRatio(n) { this.ratio = n; } getPixelRatio() { return this.ratio; }
    setSize(w, h) { this.canvas.width = Math.round(w * this.ratio); this.canvas.height = Math.round(h * this.ratio); }
  }
  namespace = { ...THREE, WebGLRenderer: Renderer };
  api = { version: '1.0.0', info: () => ({ group: 'fish', portrait: { dir: [.3, .5, 3.2], lookY: 0 } }), create: vi.fn(() => { const root = new THREE.Group(), mesh = new THREE.Mesh(new THREE.BoxGeometry(.4, .2, .1), new THREE.MeshBasicMaterial()); mesh.position.y = .1; root.add(mesh); const model = { root, radius: .25, dispose: vi.fn(), update: vi.fn() }; models.push(model); return model; }) };
  window.THREE = namespace; window.Reef3DSpecies = api;
  vi.stubGlobal('ResizeObserver', class { constructor(callback) { this.callback = callback; this.disconnect = vi.fn(); observers.push(this); } observe() {} });
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addListener() {}, removeListener() {} })));
  loadTool('stem_lab/stem_tool_coralreef.js', 'coralReef'); X = window.__RR_TEST_EXPORTS__.coralReef;
});
afterEach(async () => { while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); } delete window.THREE; delete window.Reef3DSpecies; vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const q = (t, s) => t.host.querySelector(s), dataView = t => ({ ...q(t, '[data-specimen-view]').dataset });
async function click(el) { expect(el, 'control exists').toBeTruthy(); await React.act(async () => { el.focus(); el.click(); await new Promise(resolve => setTimeout(resolve, 0)); }); }
async function mount(kind = 'study') {
  let data = { coralReef: { section: 'guide', guideSpeciesId: kind === 'study' ? 'clownfish' : null, speciesBookmarks: { clownfish: true, blue_tang: true }, speciesFieldNotes: { clownfish: 'Keep this note' }, speciesLog: { green_turtle: { firstSeen: 1 } } } };
  const host = document.createElement('div'); document.body.appendChild(host); const root = ReactDOMClient.createRoot(host), cfg = window.StemLab._registry.coralReef;
  function Shell() { const [state, setState] = React.useState(data); data = state; t.setData = setState; return cfg.render({ React, toolData: state, setToolData: setState, t: (k, v) => v || k, reduceMotion: true }); }
  const t = { host, root, get data() { return data.coralReef; } }; mounted.push(t); await React.act(async () => root.render(React.createElement(Shell)));
  if (kind === 'study') { await click(q(t, '[data-open-study]')); await click(q(t, '[data-study-specimen-toggle]')); }
  else { await click(q(t, '[data-start-practice]')); await React.act(async () => { const select = q(t, '[data-practice-collection-select]'); select.value = 'saved'; select.dispatchEvent(new Event('change', { bubbles: true })); }); await click(q(t, '[data-practice-start]')); await click(q(t, '[data-practice-specimen-toggle]')); }
  return t;
}

async function magnify(t) { for (let i = 0; i < 4; i++) await click(q(t, '[data-specimen-zoom="in"]')); }
async function pointer(t, type, values = {}) { const canvas = q(t, '[data-specimen-canvas]'); let event; await React.act(async () => { event = new Event(type, { bubbles: true, cancelable: true }); Object.assign(event, { pointerId: 7, button: 0, clientX: 100, clientY: 100, shiftKey: false, altKey: false, ctrlKey: false, metaKey: false, ...values }); canvas.dispatchEvent(event); }); return event; }
function pointerCanvas(t) { const canvas = q(t, '[data-specimen-canvas]'); canvas.getBoundingClientRect = () => ({ width: 400, height: 240, left: 0, top: 0 }); canvas.setPointerCapture = vi.fn(); return canvas; }
const frames = () => renderers[0].render.mock.calls.length;

describe('temporary Shift-drag specimen panning', () => {
  it('latches the drag action at pointer-down, preserves Turn, and lets the following ordinary drag turn again', async () => {
    const t = await mount(), canvas = pointerCanvas(t), records = JSON.stringify(t.data); await magnify(t); const start = dataView(t), count = frames(); await pointer(t, 'pointerdown', { shiftKey: true }); expect(frames()).toBe(count); await pointer(t, 'pointermove', { clientX: 120, clientY: 112, shiftKey: false }); const moved = dataView(t); expect(Number(moved.specimenPanX)).toBeGreaterThan(0); expect(Number(moved.specimenPanY)).toBeLessThan(0); expect(moved).toMatchObject({ specimenTurn: start.specimenTurn, specimenTilt: start.specimenTilt, specimenAngle: start.specimenAngle, specimenMode: 'turn' }); expect(q(t, '[data-specimen-mode-button="turn"]').getAttribute('aria-pressed')).toBe('true'); expect(frames()).toBe(count + 1); await pointer(t, 'pointerup', { clientX: 120, clientY: 112 });
    await pointer(t, 'pointerdown'); await pointer(t, 'pointermove', { clientX: 120, clientY: 112, shiftKey: true }); const turned = dataView(t); expect(turned.specimenTurn).not.toBe(moved.specimenTurn); expect(turned.specimenTilt).not.toBe(moved.specimenTilt); expect(turned.specimenPanX).toBe(moved.specimenPanX); expect(turned.specimenPanY).toBe(moved.specimenPanY); expect(turned.specimenMode).toBe('turn'); await pointer(t, 'pointerup'); expect(canvas.setPointerCapture).toHaveBeenCalledTimes(2); expect(JSON.stringify(t.data)).toBe(records); expect(renderers).toHaveLength(1); expect(models[0].update).not.toHaveBeenCalled();
  });

  it('applies the same quarter gain in Fine control without changing zoom steps or allocating another renderer', async () => {
    const t = await mount(); pointerCanvas(t); await magnify(t); await pointer(t, 'pointerdown', { shiftKey: true }); await pointer(t, 'pointermove', { clientX: 120, clientY: 112 }); await pointer(t, 'pointerup'); const coarse = dataView(t); await click(q(t, '[data-specimen-fit]')); await magnify(t); await click(q(t, '[data-specimen-fine]')); await pointer(t, 'pointerdown', { shiftKey: true }); const count = frames(); await pointer(t, 'pointermove', { clientX: 120, clientY: 112 }); await pointer(t, 'pointerup'); const fine = dataView(t); expect(Number(fine.specimenPanX)).toBeCloseTo(Number(coarse.specimenPanX) * .25, 12); expect(Number(fine.specimenPanY)).toBeCloseTo(Number(coarse.specimenPanY) * .25, 12); expect(fine).toMatchObject({ specimenMode: 'turn', specimenScale: '2', specimenPrecision: 'fine' }); expect(frames()).toBe(count + 1); await click(q(t, '[data-specimen-zoom="in"]')); expect(dataView(t).specimenScale).toBe('2.25'); expect(api.create).toHaveBeenCalledTimes(1);
  });

  it('makes100% Shift-drag a no-op and leaves Shift/Space keys and browser modifier chords untouched', async () => {
    const t = await mount(), canvas = pointerCanvas(t), fitted = dataView(t), initial = frames(); await pointer(t, 'pointerdown', { shiftKey: true }); await pointer(t, 'pointermove', { clientX: 160, clientY: 140 }); await pointer(t, 'pointerup'); expect(dataView(t)).toEqual(fitted); expect(frames()).toBe(initial); expect(canvas.setPointerCapture).not.toHaveBeenCalled();
    for (const values of [{ key: 'Shift', shiftKey: true }, { key: ' ' }, { key: ' ', shiftKey: true }]) { const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...values }); await React.act(async () => canvas.dispatchEvent(event)); expect(event.defaultPrevented).toBe(false); } expect(frames()).toBe(initial); await magnify(t); const before = dataView(t), count = frames();
    for (const modifier of ['altKey', 'ctrlKey', 'metaKey']) { const event = await pointer(t, 'pointerdown', { shiftKey: true, [modifier]: true }); expect(event.defaultPrevented).toBe(false); await pointer(t, 'pointermove', { clientX: 150, clientY: 125 }); await pointer(t, 'pointerup'); expect(dataView(t)).toEqual(before); expect(frames()).toBe(count); } expect(canvas.setPointerCapture).not.toHaveBeenCalled();
  });

  it('retains normal Move dragging and ignores secondary buttons, concurrent pointer IDs, cancellation and lost capture', async () => {
    const t = await mount(), canvas = pointerCanvas(t); await magnify(t); await click(q(t, '[data-specimen-mode-button="move"]')); const start = dataView(t); await pointer(t, 'pointerdown'); await pointer(t, 'pointermove', { clientX: 120, clientY: 112 }); const ordinary = dataView(t); expect(ordinary.specimenPanX).not.toBe(start.specimenPanX); expect(ordinary).toMatchObject({ specimenMode: 'move', specimenTurn: start.specimenTurn, specimenTilt: start.specimenTilt }); await pointer(t, 'pointerup'); await click(q(t, '[data-specimen-mode-button="turn"]')); const count = frames(), before = dataView(t);
    await pointer(t, 'pointerdown', { button: 2, shiftKey: true }); await pointer(t, 'pointermove', { clientX: 180, clientY: 150 }); expect(dataView(t)).toEqual(before); expect(frames()).toBe(count);
    await pointer(t, 'pointerdown', { shiftKey: true, pointerId: 7 }); await pointer(t, 'pointerdown', { pointerId: 8 }); await pointer(t, 'pointermove', { pointerId: 8, clientX: 190, clientY: 150 }); await pointer(t, 'pointerup', { pointerId: 8 }); expect(dataView(t)).toEqual(before); await pointer(t, 'pointermove', { pointerId: 7, clientX: 120, clientY: 112 }); const primary = dataView(t); expect(primary.specimenPanX).not.toBe(before.specimenPanX); expect(primary.specimenTurn).toBe(before.specimenTurn); await pointer(t, 'pointercancel', { pointerId: 7 }); const cancelledFrames = frames(); await pointer(t, 'pointermove', { pointerId: 7, clientX: 160, clientY: 140 }); expect(dataView(t)).toEqual(primary); expect(frames()).toBe(cancelledFrames);
    await pointer(t, 'pointerdown', { pointerId: 9, shiftKey: true }); await pointer(t, 'lostpointercapture', { pointerId: 9 }); await pointer(t, 'pointermove', { pointerId: 9, clientX: 170, clientY: 130 }); expect(dataView(t)).toEqual(primary); expect(frames()).toBe(cancelledFrames); expect(canvas.setPointerCapture).toHaveBeenCalledTimes(3);
  });

  it('keeps the accessible and visible directions consistent and shares temporary panning with mystery memory without adding help', async () => {
    const t = await mount('mystery'), canvas = pointerCanvas(t), ids = canvas.getAttribute('aria-describedby').split(' '), canonical = q(t, '#' + ids[1]), visible = [...q(t, '[data-specimen-tips]').querySelectorAll('p')].find(p => p.textContent.includes('hold Shift when starting a drag')); expect(canonical.textContent).toContain('hold Shift when starting a drag'); expect(visible.textContent).toBe(canonical.textContent); expect(canonical.closest('[data-specimen-tips]')).toBeNull(); expect(q(t, '[data-specimen-tips]').open).toBe(false); const records = JSON.stringify(t.data); await magnify(t); await React.act(async () => { q(t, '[data-specimen-memory]').open = true; }); await click(q(t, '[data-specimen-remember]')); const a = dataView(t); await pointer(t, 'pointerdown', { shiftKey: true }); await pointer(t, 'pointermove', { clientX: 120, clientY: 112 }); await pointer(t, 'pointerup'); const b = dataView(t); expect(b.specimenMode).toBe('turn'); await click(q(t, '[data-specimen-swap]')); expect(dataView(t)).toEqual(a); await click(q(t, '[data-specimen-swap]')); expect(dataView(t)).toEqual(b); expect(JSON.stringify(t.data)).toBe(records); expect(canvas.getAttribute('aria-label')).toBe('Interactive 3D model of the mystery organism'); expect(q(t, '[data-practice-specimen]').textContent).not.toContain('Common clownfish'); expect(renderers).toHaveLength(1);
  });
});
