import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Exercise production camera, picking and timer code with the shipped Three.js
// maths/geometries. Only GPU calls and the browser's animation clock are replaced.
vi.setConfig({ testTimeout: 30000, hookTimeout: 45000 });
let THREE, source, pure, host, viewer, renderer, rafCallbacks, frames, hidden;
beforeAll(() => {
  const exports = {}, module = { exports };
  new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(exports, module);
  THREE = module.exports;
  source = readFileSync('stem_lab/stem_tool_astronomy.js', 'utf8').replace(
    '  // The flat sky map drew 44 curated stars',
    '  window.__createObservatoryForTest = createObservatorySky;\n  // The flat sky map drew 44 curated stars'
  );
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-12-22T03:00:00Z'));
  hidden = false;
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
  rafCallbacks = new Map(); frames = 0;
  vi.stubGlobal('requestAnimationFrame', cb => { rafCallbacks.set(++frames, cb); return frames; });
  vi.stubGlobal('cancelAnimationFrame', id => rafCallbacks.delete(id));
  vi.stubGlobal('Image', undefined);
  const context = new Proxy({}, { get: (obj, key) => obj[key] || (obj[key] = key === 'createRadialGradient' ? () => ({ addColorStop() {} }) : vi.fn()) });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  resetStemLab();
  new Function(source)();
  pure = window.__alloAstroPure;
  host = document.createElement('div'); document.body.appendChild(host);
  Object.defineProperties(host, { clientWidth: { value: 800 }, clientHeight: { value: 500 } });
  renderer = null; viewer = null;
});

afterEach(() => {
  if (viewer) viewer.dispose();
  host.remove();
  delete window.__createObservatoryForTest;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

function create(hooks = {}, overrides = {}) {
  class Renderer {
    constructor() {
      renderer = this;
      this.domElement = document.createElement('canvas');
      this.domElement.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 500 });
      this.domElement.setPointerCapture = vi.fn();
      this.info = { render: { calls: 1 }, memory: { geometries: 1 } };
      this.dispose = vi.fn(); this.forceContextLoss = vi.fn();
    }
    setPixelRatio(value) { this.pixelRatio = value; }
    getPixelRatio() { return this.pixelRatio; }
    setSize() {}
    render(scene, camera) { this.scene = scene; this.camera = camera; scene.updateMatrixWorld(); }
  }
  viewer = window.__createObservatoryForTest({ ...THREE, WebGLRenderer: Renderer, ...overrides }, host, hooks);
  return viewer;
}
function model(state = {}, extra = {}) {
  return { reduced: true, catalog: pure.fallbackCatalog(), resolved: pure.observatoryResolve({ obsLive: false, obsDate: '2026-12-21', obsTime: '22:00', ...state }, Date.now()), ...extra };
}
function pointer(type, x, y, id = 1) {
  const event = new Event(type);
  Object.assign(event, { clientX: x, clientY: y, pointerId: id, button: 0, isPrimary: true });
  renderer.domElement.dispatchEvent(event);
}
function animate() {
  for (let now = 1000; now < 2000; now += 33) {
    const scheduled = [...rafCallbacks.values()]; rafCallbacks.clear();
    scheduled.forEach(cb => cb(now));
  }
}

describe('Observatory renderer interactions and lifecycle', () => {
  it('centres and identifies every object reached by the keyboard stepper', () => {
    const onPick = vi.fn();
    create({ onPick }).sync(model());
    const first = viewer.step(1);
    expect(first.total).toBeGreaterThan(3);
    const all = [first];
    for (let i = 1; i < first.total; i++) all.push(viewer.step(1));
    for (const out of all) {
      expect(out.info, out.item.name).toBeTruthy();
      expect(out.info.kind).toBe(out.item.kind === 'named' ? 'star' : out.item.kind);
      expect(out.info.alt).toBeCloseTo(out.item.alt, 4);
      if (out.item.kind === 'named') expect(out.info.hip).toBeGreaterThan(0);
    }
    const last = all.at(-1), camera = host.__observatoryDebug().camera;
    expect(camera.yaw).toBeCloseTo(last.item.az, 6);
    expect(camera.pitch).toBeCloseTo(Math.min(89, last.item.alt), 6);
    expect(onPick).toHaveBeenCalledTimes(first.total);
  });

  it('refreshes live sky with reduced motion without starting an animation loop', () => {
    const onLiveRefresh = vi.fn();
    create({ onLiveRefresh }).sync(model({ obsLive: true }));
    const start = host.__observatoryDebug();
    expect(start.raf).toBe(false);
    expect(start.liveTimer).toBe(true);
    vi.advanceTimersByTime(30000);
    const after = host.__observatoryDebug();
    expect(Date.parse(after.utc) - Date.parse(start.utc)).toBe(30000);
    expect(after.lst).not.toBe(start.lst);
    expect(onLiveRefresh).toHaveBeenCalledOnce();
    expect(rafCallbacks.size).toBe(0);
    viewer.dispose();
    expect(vi.getTimerCount()).toBe(0);
    expect(host.children.length).toBe(0);
    expect(renderer.dispose).toHaveBeenCalledOnce();
  });

  it('suspends the live refresh while hidden and refreshes immediately on return', () => {
    create().sync(model({ obsLive: true }));
    hidden = true; document.dispatchEvent(new Event('visibilitychange'));
    expect(host.__observatoryDebug().liveTimer).toBe(false);
    vi.advanceTimersByTime(120000);
    hidden = false; document.dispatchEvent(new Event('visibilitychange'));
    expect(host.__observatoryDebug().utc).toBe(new Date().toISOString());
    expect(host.__observatoryDebug().liveTimer).toBe(true);
  });

  it('does not select an object after a drag that returns to its start', () => {
    const onPick = vi.fn();
    create({ onPick }).sync(model());
    pointer('pointerdown', 400, 250);
    pointer('pointermove', 460, 250);
    pointer('pointermove', 400, 250);
    pointer('pointerup', 400, 250);
    expect(onPick).not.toHaveBeenCalled();
    pointer('pointerdown', 400, 250);
    pointer('pointerup', 400, 250);
    expect(onPick).toHaveBeenCalledOnce();
  });

  it('ignores a second pointer ending while the primary pointer is dragging', () => {
    create().sync(model());
    pointer('pointerdown', 400, 250, 1);
    pointer('pointerup', 400, 250, 2);
    pointer('pointermove', 450, 250, 1);
    expect(host.__observatoryDebug().camera.yaw).toBeCloseTo(172.5, 5);
    pointer('pointercancel', 450, 250, 1);
    pointer('pointermove', 500, 250, 1);
    expect(host.__observatoryDebug().camera.yaw).toBeCloseTo(172.5, 5);
  });

  it('removes partly built canvases and resources when initialization fails', () => {
    expect(() => create({}, { ShaderMaterial: class { constructor() { throw new Error('GPU allocation failed'); } } })).toThrow('GPU allocation failed');
    expect(host.children.length).toBe(0);
    expect(renderer.dispose).toHaveBeenCalledOnce();
    expect(renderer.forceContextLoss).toHaveBeenCalledOnce();
  });

  it('does not keep a hidden Sun in the deep-time object stepper', () => {
    create().sync(model({ obsDate: '2026-06-21', obsTime: '12:00', obsDrift: 10000 }));
    const first = viewer.step(1), items = [first.item];
    for (let i = 1; i < first.total; i++) items.push(viewer.step(1).item);
    expect(items.some(it => it.kind === 'sun')).toBe(false);
  });

  it('commits Pause at the displayed instant without jumping back to the start', () => {
    const onClockCommit = vi.fn();
    create({ onClockCommit }).sync(model({ obsPlaying: true }, { reduced: false }));
    animate();
    const during = host.__observatoryDebug();
    expect(during.playMs).toBeGreaterThan(500000);
    expect(viewer.isPlaying()).toBe(true);
    expect(viewer.getInstant()).toBe(Date.parse(during.utc));
    viewer.sync(model({ obsPlaying: false }, { reduced: false }));
    expect(onClockCommit).toHaveBeenCalledWith(Date.parse(during.utc));
    expect(host.__observatoryDebug().utc).toBe(during.utc);
    expect(viewer.isPlaying()).toBe(false);
    expect(viewer.getInstant()).toBe(Date.parse(during.utc));
  });

  it('respects an explicit date jump while time-lapse is running', () => {
    const onClockCommit = vi.fn();
    create({ onClockCommit }).sync(model({ obsPlaying: true }, { reduced: false }));
    animate();
    const next = model({ obsPlaying: false, obsDate: '2026-12-23' }, { reduced: false });
    viewer.sync(next);
    expect(onClockCommit).not.toHaveBeenCalled();
    expect(host.__observatoryDebug().utc).toBe(new Date(next.resolved.utcMs).toISOString());
    expect(host.__observatoryDebug().playMs).toBe(0);
  });
});


describe('Observatory catalog search and current selection', () => {
  function realCatalog() { return pure.normalizeCatalog(JSON.parse(readFileSync('stem_lab/assets/astronomy/hyg-v41-naked-eye.json', 'utf8'))); }

  it('finds the same catalog star by common name, HIP prefix, or exact number', () => {
    create().sync(model({}, { catalog: realCatalog() }));
    const sirius = viewer.search('Sirius')[0];
    expect(sirius).toMatchObject({ kind: 'star', id: '32349', hip: 32349, name: 'Sirius' });
    expect(viewer.search('hip 32349')[0]).toEqual(sirius);
    expect(viewer.search('32349')[0]).toEqual(sirius);
    expect(viewer.search('  SÍRIUS ')).toEqual([sirius]);
    expect(viewer.search('HIP').length).toBeLessThanOrEqual(6);
    expect(viewer.search('')).toEqual([]);
    expect(viewer.search('not-a-real-catalog-name')).toEqual([]);
    expect(viewer.search('M 31')[0]).toMatchObject({ kind: 'deepsky', id: 'm31' });
    expect(viewer.search('Jupiter')[0]).toMatchObject({ kind: 'planet', id: 'jupiter' });
  });

  it('focuses and identifies the exact requested star instead of a neighboring object', () => {
    const onPick = vi.fn();
    create({ onPick }).sync(model({}, { catalog: realCatalog() }));
    const item = viewer.search('Sirius')[0];
    expect(item.status).toBe('visible');
    const out = viewer.focus(item.kind, item.id);
    expect(out.focused).toBe(true);
    expect(out.info).toMatchObject({ kind: 'star', hip: 32349, name: 'Sirius', visibility: 'visible' });
    expect(host.__observatoryDebug().camera.yaw).toBeCloseTo(out.info.az, 6);
    expect(host.__observatoryDebug().camera.pitch).toBeCloseTo(out.info.alt, 6);
    expect(onPick).toHaveBeenLastCalledWith(out.info);
  });

  it('allows inspection of below-horizon and hidden stars without moving the camera', () => {
    const cat = realCatalog();
    create().sync(model({}, { catalog: cat }));
    const low = viewer.search('Canopus')[0], before = host.__observatoryDebug().camera;
    expect(low.status).toBe('below');
    const below = viewer.focus(low.kind, low.id);
    expect(below.focused).toBe(false);
    expect(below.info.name).toBe('Canopus');
    expect(below.info.alt).toBeLessThan(0);
    expect(host.__observatoryDebug().camera).toEqual(before);
    viewer.sync(model({ obsLayers: { stars: false } }, { catalog: cat }));
    const hidden = viewer.focus('star', '32349');
    expect(hidden.info.visibility).toBe('layer-off');
    expect(hidden.focused).toBe(false);
    expect(host.__observatoryDebug().camera).toEqual(before);
  });

  it('rechecks the current layer at activation and suppresses body coordinates in deep time', () => {
    const cat = realCatalog();
    create().sync(model({}, { catalog: cat }));
    const savedResult = viewer.search('Sirius')[0];
    viewer.sync(model({ obsLayers: { stars: false } }, { catalog: cat }));
    expect(viewer.focus(savedResult.kind, savedResult.id).item.status).toBe('layer-off');
    viewer.sync(model({ obsDrift: 10000 }, { catalog: cat }));
    const moon = viewer.search('Moon')[0];
    expect(moon).toMatchObject({ status: 'deep-time', alt: null, az: null });
    expect(viewer.focus('moon', 'moon')).toMatchObject({ info: null, focused: false });
  });

  it('refreshes selected details when time changes and stays quiet on equivalent syncs', () => {
    const onSelectionRefresh = vi.fn(), cat = realCatalog();
    create({ onSelectionRefresh }).sync(model({}, { catalog: cat }));
    const selected = viewer.focus('star', '32349').info;
    viewer.sync(model({ obsTime: '23:00' }, { catalog: cat, picked: selected }));
    expect(onSelectionRefresh).toHaveBeenCalledOnce();
    const updated = onSelectionRefresh.mock.calls[0][0];
    expect(updated.hip).toBe(32349);
    expect(updated.alt).not.toBeCloseTo(selected.alt, 0);
    viewer.sync(model({ obsTime: '23:00' }, { catalog: cat, picked: updated }));
    expect(onSelectionRefresh).toHaveBeenCalledOnce();
    viewer.sync(model({ obsTime: '12:00' }, { catalog: cat, picked: updated }));
    expect(onSelectionRefresh.mock.lastCall[0].visibility).toBe('below');
  });

  it('refreshes Moon phase and clears inapplicable coordinates in deep time', () => {
    const onSelectionRefresh = vi.fn(), cat = realCatalog();
    create({ onSelectionRefresh }).sync(model({}, { catalog: cat }));
    const selected = viewer.focus('moon', 'moon').info;
    viewer.sync(model({ obsDate: '2026-12-28' }, { catalog: cat, picked: selected }));
    expect(onSelectionRefresh.mock.lastCall[0].illum).not.toBeCloseTo(selected.illum, 2);
    viewer.sync(model({ obsDrift: 10000 }, { catalog: cat, picked: selected }));
    expect(onSelectionRefresh.mock.lastCall[0]).toMatchObject({ visibility: 'deep-time', alt: null, az: null });
  });

  it('drops a held drag when the sky leaves the viewport', () => {
    let intersect;
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback) { intersect = callback; }
      observe() {} disconnect() {}
    });
    const onPick = vi.fn();
    create({ onPick }).sync(model());
    pointer('pointerdown', 400, 250);
    intersect([{ isIntersecting: false }]);
    intersect([{ isIntersecting: true }]);
    pointer('pointerup', 400, 250);
    expect(onPick).not.toHaveBeenCalled();
  });
});
