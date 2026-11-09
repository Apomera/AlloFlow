import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Round 19 lane engines (pf19e): device profile, autoReason and the `slow` signal
// in both 3D engines. Real three r128 with a stubbed WebGLRenderer in a fake
// window, as tests/reef_3d_explore.test.js and tests/reef_3d_engine.test.js do.
vi.setConfig({ testTimeout: 60000 });
const THREE = createRequire(import.meta.url)(path.resolve(process.cwd(), 'vendor/three-r128/three.min.js'));
const EXPLORE = readFileSync(process.env.REEF3D_EXPLORE_SOURCE || 'stem_lab/reef_3d_explore.js', 'utf8');
const ENGINE = readFileSync(process.env.REEF3D_ENGINE_SOURCE || 'stem_lab/reef_3d_engine.js', 'utf8');
const HABITAT = readFileSync(process.env.REEF3D_HABITAT_SOURCE || 'stem_lab/reef_3d_habitat.js', 'utf8');
const REASONS = ['cores', 'memory', 'software_gl', 'small_touch', 'save_data', 'default'];

// A fake document whose canvases hand out a fake WebGL context.
function gpuDocument(rendererName, { blockInfo = false, throwOnContext = false, nullContext = false, throwOnParam = false } = {}) {
  const log = { contexts: 0, sizes: [], lost: 0, names: [] };
  return {
    log,
    createElement(tag) {
      const c = { tag, width: 300, height: 150 };
      c.getContext = (name) => {
        log.names.push(name);
        if (throwOnContext) throw new Error('blocked');
        if (nullContext) return null;
        log.contexts++; log.sizes.push([c.width, c.height]);
        return {
          getExtension(ext) {
            if (ext === 'WEBGL_debug_renderer_info') return blockInfo ? null : { UNMASKED_RENDERER_WEBGL: 0x9246, UNMASKED_VENDOR_WEBGL: 0x9245 };
            if (ext === 'WEBGL_lose_context') return { loseContext() { log.lost++; } };
            return null;
          },
          getParameter(p) { if (throwOnParam) throw new Error('nope'); return p === 0x9246 ? rendererName : 'WebKit WebGL'; }
        };
      };
      return c;
    }
  };
}
function bareWindow(extras = {}) {
  return { innerWidth: 1280, devicePixelRatio: 1, console: { warn() {}, error() {} }, ...extras };
}
function load(source, win) { new Function('window', source)(win); return win; }
const ENGINES = [
  ['dive (Reef3DExplore)', EXPLORE, 'Reef3DExplore'],
  ['survey (Reef3D)', ENGINE, 'Reef3D']
];

describe.each(ENGINES)('profileDevice in %s', (label, source, name) => {
  const profile = (extras) => load(source, bareWindow(extras))[name].profileDevice();

  it('is exported and keeps the interface shape', () => {
    const p = profile({});
    expect(Object.keys(p).sort()).toEqual(['cores', 'memory', 'reason', 'renderer', 'tier']);
    expect(p).toEqual({ tier: 'high', reason: 'default', cores: null, memory: null, renderer: null });
    expect(REASONS).toContain(p.reason);
  });

  it('gives each reason, in rule order', () => {
    expect(profile({ navigator: { hardwareConcurrency: 4, deviceMemory: 2 } })).toMatchObject({ tier: 'low', reason: 'cores', cores: 4, memory: 2 });
    expect(profile({ navigator: { hardwareConcurrency: 8, deviceMemory: 4 } })).toMatchObject({ tier: 'low', reason: 'memory', cores: 8, memory: 4 });
    expect(profile({ navigator: { hardwareConcurrency: 8, deviceMemory: 8, connection: { saveData: true } } })).toMatchObject({ tier: 'low', reason: 'save_data' });
    expect(profile({ innerWidth: 400, navigator: { hardwareConcurrency: 8 }, matchMedia: () => ({ matches: false }) })).toMatchObject({ tier: 'low', reason: 'small_touch' });
    expect(profile({ innerWidth: 400, navigator: { hardwareConcurrency: 8 }, matchMedia: () => ({ matches: true }) })).toMatchObject({ tier: 'high', reason: 'default' });
    expect(profile({ navigator: { hardwareConcurrency: 8, deviceMemory: 8 } })).toMatchObject({ tier: 'high', reason: 'default', cores: 8, memory: 8 });
  });

  it('reads the unmasked renderer once, on a tiny context it then releases', () => {
    const doc = gpuDocument('ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)');
    const win = load(source, bareWindow({ document: doc, WebGLRenderingContext: function () {}, navigator: { hardwareConcurrency: 8, deviceMemory: 8 } }));
    const p = win[name].profileDevice();
    expect(p).toMatchObject({ tier: 'high', reason: 'default', renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)' });
    expect(doc.log.contexts).toBe(1);
    expect(doc.log.sizes[0][0] * doc.log.sizes[0][1]).toBeLessThanOrEqual(16);
    expect(doc.log.lost).toBe(1);
    // Cached for the page: a second call, and the other engine on the same page, do not probe again.
    expect(win[name].profileDevice()).toEqual(p);
    const other = ENGINES.find((e) => e[2] !== name);
    load(other[1], win);
    expect(win[other[2]].profileDevice()).toEqual(p);
    expect(doc.log.contexts).toBe(1);
    // A caller cannot change the cached answer.
    win[name].profileDevice().tier = 'low';
    expect(win[name].profileDevice().tier).toBe('high');
  });

  it.each([
    'Google SwiftShader',
    'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)',
    'llvmpipe (LLVM 15.0.7, 256 bits)',
    'ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0, D3D11)',
    'Mesa OffScreen'
  ])('treats software rendering (%s) as low, before cores', (rendererName) => {
    const doc = gpuDocument(rendererName);
    const win = load(source, bareWindow({ document: doc, WebGLRenderingContext: function () {}, navigator: { hardwareConcurrency: 2, deviceMemory: 8 } }));
    expect(win[name].profileDevice()).toEqual({ tier: 'low', reason: 'software_gl', cores: 2, memory: 8, renderer: rendererName });
  });

  it('never throws: no WebGL, a blocked extension, a throwing context or parameter, a throwing navigator', () => {
    const noGl = gpuDocument('Google SwiftShader');
    let win = load(source, bareWindow({ document: noGl, navigator: { hardwareConcurrency: 8, deviceMemory: 8 } }));
    expect(win[name].profileDevice()).toMatchObject({ tier: 'high', reason: 'default', renderer: null });
    expect(noGl.log.names).toHaveLength(0); // no WebGLRenderingContext: no probe at all

    const blocked = gpuDocument('Google SwiftShader', { blockInfo: true });
    win = load(source, bareWindow({ document: blocked, WebGLRenderingContext: function () {}, navigator: { hardwareConcurrency: 8, deviceMemory: 8 } }));
    expect(win[name].profileDevice()).toMatchObject({ tier: 'high', reason: 'default', renderer: null });
    expect(blocked.log.lost).toBe(1);

    for (const opts of [{ throwOnContext: true }, { nullContext: true }, { throwOnParam: true }]) {
      const d = gpuDocument('Google SwiftShader', opts);
      win = load(source, bareWindow({ document: d, WebGLRenderingContext: function () {} }));
      expect(() => win[name].profileDevice()).not.toThrow();
      expect(win[name].profileDevice().renderer).toBe(null);
    }

    const hostile = bareWindow({ innerWidth: 300, matchMedia() { throw new Error('mm'); } });
    Object.defineProperty(hostile, 'navigator', { get() { throw new Error('nav'); } });
    load(source, hostile);
    expect(() => hostile[name].profileDevice()).not.toThrow();
    expect(hostile[name].profileDevice()).toMatchObject({ tier: 'low', reason: 'small_touch' });

    const bad = bareWindow({ document: { createElement() { throw new Error('ce'); } }, WebGLRenderingContext: function () {} });
    load(source, bad);
    expect(bad[name].profileDevice().renderer).toBe(null);
  });

  it('works in jsdom itself without touching getContext', () => {
    const spy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext');
    const win = load(source, bareWindow({ document, navigator: { hardwareConcurrency: 8, deviceMemory: 8 } }));
    expect(win[name].profileDevice()).toMatchObject({ tier: 'high', renderer: null });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('registers no enumerable global beyond its own', () => {
    const win = load(source, bareWindow({ navigator: { hardwareConcurrency: 4 } }));
    win[name].profileDevice();
    expect(Object.keys(win).filter((k) => !(k in bareWindow({ navigator: 1 })))).toEqual([name]);
  });
});

// ---- Mounting runtimes ------------------------------------------------------------------
const cleanups = [];
afterEach(() => { while (cleanups.length) cleanups.pop()(); });

function fakeRuntime(kind, options = {}, { windowExtras = {}, info = { calls: 7, triangles: 1234 } } = {}) {
  const frames = new Map(), timers = new Map();
  let serial = 0, timerSerial = 0, clock = 1000, renderer = null;
  class Renderer {
    constructor(params) { renderer = this; this.params = params; this.shadowMap = {}; this.info = { render: { ...info } }; this.capabilities = { isWebGL2: true }; this.extensions = { has: () => true }; this.ratios = []; }
    setPixelRatio(ratio) { this.pixelRatio = ratio; this.ratios.push(ratio); } setSize(w, h) { this.size = [w, h]; }
    render(scene, camera) { this.scene = scene; this.camera = camera; }
    dispose() {} forceContextLoss() {}
  }
  class FakeResizeObserver { constructor(cb) { this.cb = cb; } observe() {} disconnect() {} }
  const local = {
    innerWidth: 1280, devicePixelRatio: 2, console: { warn() {}, error() {} },
    requestAnimationFrame(cb) { const id = ++serial; frames.set(id, cb); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    performance: { now: () => clock },
    setTimeout(fn, ms) { const id = ++timerSerial; timers.set(id, { fn, at: clock + ms }); return id; },
    clearTimeout(id) { timers.delete(id); },
    ResizeObserver: FakeResizeObserver,
    addEventListener() {}, removeEventListener() {},
    ...windowExtras
  };
  const canvas = document.createElement('canvas');
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 500 });
  document.body.appendChild(canvas);
  const states = [], errors = [], perf = [];
  let controller;
  const common = { onState: (s) => states.push(s), onError: (e) => errors.push(e), onPerf: (p) => perf.push(p), ...options, THREE: { ...THREE, WebGLRenderer: Renderer } };
  if (kind === 'dive') {
    new Function('window', EXPLORE)(local);
    controller = local.Reef3DExplore.mount(canvas, { quality: 'low', site: { seed: 7, depthM: 9, health: { coralCover: 0.5, bleaching: 0.05, algae: 0.1 }, population: [{ id: 'clownfish', count: 2 }, { id: 'brain_coral', count: 2 }] }, ...common });
  } else {
    new Function('window', HABITAT)(local);
    new Function('window', ENGINE)(local);
    const points = []; for (let i = 0; i < 20; i++) points.push({ distanceM: i * 0.5, category: i % 2 ? 'sand' : 'hard_coral', coralForm: i % 2 ? undefined : 'massive' });
    const layout = { lengthM: 10, beltHalfWidthM: 2.5, depthM: 8, points, fish: [{ id: 'f1', family: 'parrotfish', alongM: 2, offsetM: 0.5, heightM: 0.6 }], background: { coralCover: 0.4, bleaching: 0.1, algae: 0.3 } };
    controller = local.Reef3D.mount(canvas, { quality: 'low', seed: 4, layout, ...common });
  }
  const t = {
    local, canvas, controller, states, errors, perf,
    get renderer() { return renderer; },
    step(ms) {
      clock += ms;
      for (const [id, timer] of [...timers]) if (timer.at <= clock) { timers.delete(id); timer.fn(); }
      const queued = [...frames.values()]; frames.clear(); queued.forEach((cb) => cb(clock));
    },
    // Run `seconds` of frames, each `ms` long; returns the first time slow changed, or null.
    feed(seconds, ms) {
      const start = t.controller.getState().slow;
      for (let elapsed = 0; elapsed < seconds * 1000; elapsed += ms) { t.step(ms); if (t.controller.getState().slow !== start) return (elapsed + ms) / 1000; }
      return null;
    }
  };
  cleanups.push(() => { try { controller.dispose(); } catch (ignore) {} canvas.remove(); });
  return t;
}
function setHidden(value) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => value });
  document.dispatchEvent(new Event('visibilitychange'));
}
afterEach(() => { delete document.hidden; });

describe.each(['dive', 'survey'])('state contract in the %s engine', (kind) => {
  it('reports autoReason for an automatic choice and null for a chosen one', () => {
    const auto = fakeRuntime(kind, { quality: 'auto' }, { windowExtras: { navigator: { hardwareConcurrency: 4 } } });
    expect(auto.controller.getState()).toMatchObject({ quality: 'low', autoReason: 'cores', slow: false });
    const undef = fakeRuntime(kind, { quality: undefined }, { windowExtras: { navigator: { hardwareConcurrency: 8, deviceMemory: 8 } } });
    expect(undef.controller.getState()).toMatchObject({ quality: 'high', autoReason: 'default', slow: false });
    const chosen = fakeRuntime(kind, { quality: 'high' }, { windowExtras: { navigator: { hardwareConcurrency: 2 } } });
    expect(chosen.controller.getState()).toMatchObject({ quality: 'high', autoReason: null, slow: false });
    expect(auto.states.at(-1)).toHaveProperty('autoReason', 'cores');
    expect(auto.states.at(-1)).toHaveProperty('slow', false);
  });
});

describe.each(['dive', 'survey'])('the slow signal in the %s engine', (kind) => {
  it('turns true only after about five seconds of slow frames, past the first seconds', () => {
    const t = fakeRuntime(kind, { quality: 'high' });
    const at = t.feed(20, 50); // 20 fps
    expect(at).not.toBe(null);
    // Never inside the first seconds plus the 5 s hold.
    expect(at).toBeGreaterThanOrEqual(7.5);
    expect(t.controller.getState().slow).toBe(true);
    expect(t.states.at(-1).slow).toBe(true); // delivered through onState
  });

  it('never fires for a device that keeps up, or one only a little slow (30 fps cap)', () => {
    const fast = fakeRuntime(kind, { quality: 'high' });
    expect(fast.feed(15, 16)).toBe(null);
    const capped = fakeRuntime(kind, { quality: 'high' });
    expect(capped.feed(15, 33)).toBe(null);
  });

  it('turns false again when the device recovers', () => {
    const t = fakeRuntime(kind, { quality: 'high' });
    expect(t.feed(20, 50)).not.toBe(null);
    const back = t.feed(10, 16);
    expect(back).not.toBe(null);
    expect(back).toBeGreaterThanOrEqual(2.5);
    expect(t.controller.getState().slow).toBe(false);
  });

  it('is never true while paused, and pause time never counts', () => {
    const t = fakeRuntime(kind, { quality: 'high' });
    expect(t.feed(20, 50)).not.toBe(null);
    t.controller.setPaused(true);
    expect(t.controller.getState().slow).toBe(false);
    t.step(250); // onState is throttled to one call per 200 ms
    expect(t.states.at(-1).slow).toBe(false);
    for (let i = 0; i < 400; i++) t.step(50);
    expect(t.controller.getState().slow).toBe(false);
    t.controller.setPaused(false);
    // After resuming it needs the first seconds again plus the hold.
    const again = t.feed(20, 50);
    expect(again).toBeGreaterThanOrEqual(7.5);
  });

  it('is never true while the page is hidden', () => {
    const t = fakeRuntime(kind, { quality: 'high' });
    expect(t.feed(20, 50)).not.toBe(null);
    setHidden(true);
    expect(t.controller.getState().slow).toBe(false);
    setHidden(false);
    t.step(16);
    const again = t.feed(20, 50);
    expect(again).toBeGreaterThanOrEqual(7.5);
  });

  it('never fires under reduced motion', () => {
    const t = fakeRuntime(kind, { quality: 'high', reducedMotion: true });
    if (kind === 'dive') t.controller.setPaused(false);
    for (let i = 0; i < 400; i++) t.step(50);
    expect(t.controller.getState().slow).toBe(false);
  });

  it('a lone long hitch never makes it slow, and counts at most 1 s', () => {
    const t = fakeRuntime(kind, { quality: 'high' });
    expect(t.feed(5, 16)).toBe(null);
    t.step(5000); t.step(4000);
    expect(t.controller.getState().slow).toBe(false);
    expect(t.feed(15, 16)).toBe(null);
  });

  it('still judges a device under 1 fps (each frame counts as at most 1 s)', () => {
    const t = fakeRuntime(kind, { quality: 'high' });
    let n = 0;
    while (!t.controller.getState().slow && n < 40) { t.step(2000); n++; }
    expect(t.controller.getState().slow).toBe(true);
    // 3 counted seconds first, then the 5 s hold (plus the survey ladder's 3 steps): never before frame 8.
    expect(n).toBeGreaterThanOrEqual(8);
  });
});

describe('the dive waits for its governor', () => {
  it('does not call a device slow while the governor still has reductions to make', () => {
    // Far over the draw budget: the governor climbs to its last stage (level 3) first.
    const t = fakeRuntime('dive', { quality: 'high' }, { info: { calls: 4000, triangles: 9000000 } });
    for (let i = 0; i < 80; i++) t.step(50); // 4 s: the level is still climbing
    expect(t.controller.getState().slow).toBe(false);
    const last = t.perf.at(-1);
    expect(last.level).toBeLessThan(3);
    expect(last.spent).toBe(false);
    const at = t.feed(30, 50);
    expect(at).not.toBe(null);
    // Round 20: under 25 fps the governor checks every 400 ms, so level 3 comes near 6 s, then the 5 s hold.
    expect(4 + at).toBeGreaterThanOrEqual(10.5);
    expect(t.perf.at(-1).level).toBe(3);
    expect(t.perf.at(-1).spent).toBe(true);
  });
});

describe('the survey engine governor', () => {
  it('steps the pixel ratio down, then the shadows, before calling the device slow, and back up when fast', () => {
    const t = fakeRuntime('survey', { quality: 'high' }); // devicePixelRatio 2
    expect(t.renderer.pixelRatio).toBe(1.75);
    expect(t.renderer.shadowMap.enabled).toBe(true);
    const at = t.feed(30, 50);
    expect(at).not.toBe(null);
    expect(t.renderer.ratios).toEqual([1.75, 1.25, 1]);
    expect(t.renderer.shadowMap.autoUpdate).toBe(false);
    const levels = t.perf.map((p) => p.level);
    expect(Math.max(...levels)).toBe(3);
    // Every step came before slow turned true.
    expect(t.perf.find((p) => p.slow).level).toBe(3);
    // Fast frames: slow clears, then the governor gives quality back, one step at a time.
    t.feed(30, 16);
    for (let i = 0; i < 1500; i++) t.step(16);
    expect(t.renderer.pixelRatio).toBe(1.75);
    expect(t.renderer.shadowMap.autoUpdate).toBe(true);
  });

  it('has nothing to step on the low tier, and never changes what is under a point', () => {
    const low = fakeRuntime('survey', { quality: 'low' });
    expect(low.feed(20, 50)).not.toBe(null); // nothing to reduce: slow after the first seconds and the hold
    expect(low.renderer.ratios).toEqual([1]);
    const high = fakeRuntime('survey', { quality: 'high' });
    const pointsOf = (t) => t.renderer.scene.getObjectByName('reef-survey-points');
    const describeScene = (t) => {
      const out = []; pointsOf(t).traverse((o) => out.push(o.uuid + ':' + o.visible + ':' + o.position.toArray().join(',') + ':' + (o.geometry ? o.geometry.uuid : '')));
      return out.join('|');
    };
    const before = describeScene(high), count = high.renderer.scene.children.length;
    expect(high.feed(30, 50)).not.toBe(null);
    expect(high.perf.at(-1).level).toBe(3);
    expect(describeScene(high)).toBe(before);
    expect(high.renderer.scene.children.length).toBe(count);
  });
});
