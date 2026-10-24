import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { installCanvas2DStub, installLoopStubs, installThreeStub } from './helpers/galaxy_three_stub.js';

const TIMEOUT = 120000;
describe('galaxy continuous zoom and pointer lifecycle', () => {
  let host, root, restoreCanvas, restoreThree, loops, originalMedia, errors, now;
  beforeEach(() => {
    resetStemLab(); globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    window._galaxyHasLoadedOnce = true; window._galaxyPPLoaded = true;
    originalMedia = window.matchMedia;
    now = 1000000; vi.spyOn(Date, 'now').mockImplementation(() => now);
    restoreCanvas = installCanvas2DStub().restore; restoreThree = installThreeStub();
    const Attribute = window.THREE.BufferAttribute;
    window.THREE.BufferAttribute = function (array, itemSize) { const attribute = new Attribute(array, itemSize); attribute.setXYZ = (index, x, y, z) => { attribute.array[index * itemSize] = x; attribute.array[index * itemSize + 1] = y; attribute.array[index * itemSize + 2] = z; return attribute; }; return attribute; };
    loops = installLoopStubs(); errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    host = document.createElement('div'); document.body.appendChild(host);
  });
  afterEach(async () => {
    if (root) await React.act(async () => root.unmount()); root = null; host.remove(); errors.mockRestore();
    loops(); restoreThree(); restoreCanvas(); window.matchMedia = originalMedia;
    delete window.THREE; delete window._galaxyPPLoaded; delete globalThis.IS_REACT_ACT_ENVIRONMENT; vi.restoreAllMocks();
  });
  async function mount(reduced = true) {
    window.matchMedia = vi.fn(query => ({ matches: reduced && query.includes('prefers-reduced-motion'), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
    window.StemLab.ensureThree = vi.fn(() => Promise.resolve());
    const config = loadTool('stem_lab/stem_tool_galaxy.js', 'galaxy');
    function Host() { const state = React.useState({ galaxy: { simMode: 'galaxy', starCount: 2500, galaxyAutoRotate: false, galaxyQuality: 'balanced' } }); return config.render(makeCtx({ toolData: state[0], setToolData: state[1] })); }
    root = ReactDOMClient.createRoot(host); await React.act(async () => root.render(React.createElement(Host)));
    const canvas = host.querySelector('[data-galaxy-canvas]');
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 540 });
    Object.defineProperty(canvas, 'offsetHeight', { configurable: true, value: 540 });
    const captures = new Set();
    canvas.setPointerCapture = vi.fn(id => captures.add(id)); canvas.hasPointerCapture = id => captures.has(id);
    canvas.releasePointerCapture = vi.fn(id => { captures.delete(id); pointer(canvas, 'lostpointercapture', id, 0, 0, { buttons: 0 }); });
    return canvas;
  }
  function pointer(canvas, type, id, x, y, extra = {}) {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' || type === 'pointercancel' ? 0 : 1, ...extra });
    Object.defineProperties(event, { pointerId: { value: id }, pointerType: { value: extra.pointerType || 'touch' } }); canvas.dispatchEvent(event);
  }
  function wheel(canvas, deltaY, extra = {}) {
    const event = new Event('wheel', { bubbles: true, cancelable: true });
    Object.defineProperties(event, { deltaY: { value: deltaY }, deltaX: { value: extra.deltaX || 0 }, deltaMode: { value: extra.deltaMode || 0 } }); canvas.dispatchEvent(event); return event;
  }
  async function act(fn) { await React.act(async () => fn()); }
  async function step(ms = 1000) { now += ms; await act(() => loops.step()); }
  const radius = canvas => canvas._galaxyOrbit.r;
  const camera = canvas => canvas._galaxyGetInspectionState().camera;
  function clean() { expect(errors.mock.calls.map(call => call.map(String).join(' ')).filter(message => /\[Galaxy\]|\[StemLab\]/.test(message))).toEqual([]); }

  it('uses wheel distance rather than event count, gives fine control and reverses equal opposite input', async () => {
    const canvas = await mount(); await act(() => canvas._galaxySetZoomPosition(45)); const initial = radius(canvas);
    await act(() => wheel(canvas, 1)); const fine = radius(canvas) / initial;
    expect(fine).toBeGreaterThan(1); expect(fine).toBeLessThan(1.01);
    await act(() => { canvas._galaxySetZoomPosition(45); wheel(canvas, 120); }); const coarse = radius(canvas);
    expect(coarse / initial).toBeGreaterThan(1.05); expect(coarse / initial).toBeLessThan(1.4);
    await act(() => { canvas._galaxySetZoomPosition(45); for (let index = 0; index < 120; index++) wheel(canvas, 1); });
    expect(radius(canvas)).toBeCloseTo(coarse, 10);
    await act(() => wheel(canvas, -120)); expect(radius(canvas)).toBeCloseTo(initial, 10); clean();
  }, TIMEOUT);

  it('normalizes pixel, line and page units and bounds pathological finite wheel distances', async () => {
    const canvas = await mount();
    const fromBaseline = async (delta, deltaMode = 0) => { await act(() => { canvas._galaxySetZoomPosition(45); wheel(canvas, delta, { deltaMode }); }); return radius(canvas); };
    const pixels = await fromBaseline(16); expect(await fromBaseline(1, 1)).toBeCloseTo(pixels, 10);
    const page = await fromBaseline(1, 2); expect(await fromBaseline(540)).toBeCloseTo(page, 10);
    const initial = await fromBaseline(0), huge = await fromBaseline(Number.MAX_VALUE);
    expect(huge).toBeGreaterThan(initial); expect(huge / initial).toBeLessThanOrEqual(2); expect(Number.isFinite(huge)).toBe(true);
    await act(() => wheel(canvas, -Number.MAX_VALUE)); expect(radius(canvas)).toBeCloseTo(initial, 10); clean();
  }, TIMEOUT);

  it('ignores empty, horizontal, invalid and clamped input without interrupting an unfinished camera transition', async () => {
    const canvas = await mount(false); await act(() => canvas._galaxySetViewAngle('face')); await step(120);
    const before = { ...canvas._galaxyOrbit };
    await act(() => { wheel(canvas, 0); wheel(canvas, 0, { deltaX: 120 }); wheel(canvas, 1, { deltaX: 120 }); wheel(canvas, NaN); wheel(canvas, Infinity); });
    expect(canvas._galaxyOrbit).toEqual(before); await step(600); expect(canvas._galaxyOrbit.phi).toBeCloseTo(0.1, 8);
    await act(() => { canvas._galaxySetZoomPosition(100); canvas._galaxySetViewAngle('edge'); }); await step(120);
    await act(() => wheel(canvas, -120)); await step(600);
    expect(radius(canvas)).toBe(0.2); expect(canvas._galaxyOrbit.phi).toBeCloseTo(Math.PI * 0.5, 8); clean();
  }, TIMEOUT);

  it('takes over an inspection fly-in with a fine radial move and does not resume the old motion', async () => {
    const canvas = await mount(false); await act(() => { canvas._galaxyCycleNebula(1); canvas._galaxyInspectSelection(); }); await step(120);
    const before = canvas._galaxyGetInspectionState(), target = before.label;
    await act(() => wheel(canvas, 1)); const after = canvas._galaxyGetInspectionState(), r = radius(canvas);
    const distance = Math.hypot(...['x', 'y', 'z'].map(axis => after.camera[axis] - before.camera[axis]));
    expect(distance).toBeLessThan(r * 0.01); expect(after).toMatchObject({ active: true, label: target });
    await step(1000); expect(radius(canvas)).toBeCloseTo(r, 10); clean();
  }, TIMEOUT);

  it('rebases pinch geometry when fingers leave, rejoin or change the active pair', async () => {
    const canvas = await mount(), initial = radius(canvas);
    await act(() => { pointer(canvas, 'pointerdown', 1, 100, 220); pointer(canvas, 'pointerdown', 2, 200, 220); pointer(canvas, 'pointermove', 2, 250, 220); });
    expect(radius(canvas)).toBeCloseTo(initial * 100 / 150, 10);
    await act(() => pointer(canvas, 'pointerup', 2, 250, 220)); const one = { ...canvas._galaxyOrbit };
    await act(() => pointer(canvas, 'pointermove', 1, 110, 220)); expect(radius(canvas)).toBe(one.r); expect(canvas._galaxyOrbit.theta).toBeCloseTo(one.theta + 0.05, 10);
    await act(() => pointer(canvas, 'pointerdown', 3, 210, 220)); const resumed = radius(canvas);
    await act(() => pointer(canvas, 'pointermove', 3, 250, 220)); expect(radius(canvas)).toBeCloseTo(resumed * 100 / 140, 10);
    await act(() => { pointer(canvas, 'pointerdown', 4, 400, 220); pointer(canvas, 'pointerup', 3, 250, 220); }); const changedPair = radius(canvas);
    await act(() => pointer(canvas, 'pointermove', 4, 401, 220)); expect(radius(canvas)).toBeCloseTo(changedPair * 290 / 291, 10); clean();
  }, TIMEOUT);

  it.each(['pointercancel', 'lostpointercapture'])('ends %s without ghost orbiting or selecting, and accepts the next normal click', async type => {
    const canvas = await mount(); await act(() => { pointer(canvas, 'pointerdown', 1, 400, 270, { pointerType: 'mouse' }); pointer(canvas, type, 1, 400, 270, { pointerType: 'mouse', buttons: 0 }); });
    const before = { ...canvas._galaxyOrbit };
    await act(() => pointer(canvas, 'pointermove', 1, 420, 270, { pointerType: 'mouse', buttons: 0 })); expect(canvas._galaxyOrbit).toEqual(before); expect(canvas.style.cursor).toBe('grab');
    await act(() => canvas.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1, clientX: 400, clientY: 270 })));
    expect(canvas._galaxyGetInspectionState().canInspect).toBe(false);
    await act(() => { pointer(canvas, 'pointerdown', 2, 400, 270, { pointerType: 'mouse' }); pointer(canvas, 'pointerup', 2, 400, 270, { pointerType: 'mouse' }); canvas.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1, clientX: 400, clientY: 270 })); });
    expect(canvas._galaxyGetInspectionState().canInspect).toBe(true); clean();
  }, TIMEOUT);

  it('cancels the entire captured gesture on blur and releases its listeners at teardown', async () => {
    const canvas = await mount(); await act(() => { canvas._galaxyCycleNebula(1); canvas._galaxyInspectSelection(); pointer(canvas, 'pointerdown', 1, 200, 250); pointer(canvas, 'pointerdown', 2, 300, 250); window.dispatchEvent(new Event('blur')); });
    const before = { ...canvas._galaxyOrbit }, position = camera(canvas);
    await act(() => { pointer(canvas, 'pointermove', 1, 240, 260); pointer(canvas, 'pointermove', 2, 350, 260); });
    expect(canvas._galaxyOrbit).toEqual(before); expect(camera(canvas)).toEqual(position); expect(canvas.style.cursor).toBe('grab'); expect(canvas.releasePointerCapture).toHaveBeenCalledTimes(2);
    const releases = canvas.releasePointerCapture.mock.calls.length;
    await act(() => root.unmount()); root = null;
    window.dispatchEvent(new Event('blur')); pointer(canvas, 'pointerdown', 3, 400, 270); wheel(canvas, 120);
    expect(canvas.releasePointerCapture).toHaveBeenCalledTimes(releases); expect(canvas._galaxyOrbit).toEqual(before); clean();
  }, TIMEOUT);

  it('recovers when a pointer disappears before capture can be acquired or released', async () => {
    const canvas = await mount(), reported = [];
    const onError = event => reported.push(String(event.error || event.message)); window.addEventListener('error', onError);
    canvas.setPointerCapture = vi.fn(() => { throw new DOMException('Pointer is no longer active', 'NotFoundError'); });
    canvas.hasPointerCapture = () => true;
    canvas.releasePointerCapture = vi.fn(() => { throw new DOMException('Pointer already disappeared', 'NotFoundError'); });
    try {
      await act(() => { pointer(canvas, 'pointerdown', 987, 400, 270); window.dispatchEvent(new Event('blur')); });
      const before = { ...canvas._galaxyOrbit };
      await act(() => pointer(canvas, 'pointermove', 987, 420, 280));
      expect(canvas._galaxyOrbit).toEqual(before); expect(canvas.style.cursor).toBe('grab'); expect(reported).toEqual([]);
      expect(canvas.setPointerCapture).toHaveBeenCalled(); expect(canvas.releasePointerCapture).toHaveBeenCalled(); clean();
    } finally { window.removeEventListener('error', onError); }
  }, TIMEOUT);
});
