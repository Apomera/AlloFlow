import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Round 20 lane timer (tm20): the dive governor and its `slow` signal are paced on
// the clock as well as every 10 frames, so a very slow device is helped, and told
// it is slow, within seconds. Normal devices (25 fps and up) keep the old cadence.
// Real three r128 with a stubbed WebGLRenderer in a fake window and a fake clock,
// as tests/reef_pf19e_perf_profile.test.js does.
vi.setConfig({ testTimeout: 60000 });
const THREE = createRequire(import.meta.url)(path.resolve(process.cwd(), 'vendor/three-r128/three.min.js'));
const EXPLORE = readFileSync(process.env.REEF3D_EXPLORE_SOURCE || 'stem_lab/reef_3d_explore.js', 'utf8');

const cleanups = [];
afterEach(() => { while (cleanups.length) cleanups.pop()(); delete document.hidden; });

// A dive on the high tier. `script` ms of script time pass inside each frame's draw
// (between the governor's start and end marks); `info` is the measured frame size.
function dive({ info = { calls: 7, triangles: 1234 }, script = 0, options = {} } = {}) {
  const frames = new Map(), timers = new Map();
  let serial = 0, timerSerial = 0, base = 1000, clock = 1000, renderer = null, drawn = 0;
  class Renderer {
    constructor(params) { renderer = this; this.params = params; this.shadowMap = {}; this.info = { render: { ...info } }; this.capabilities = { isWebGL2: true }; this.extensions = { has: () => true }; }
    setPixelRatio(ratio) { this.pixelRatio = ratio; } setSize(w, h) { this.size = [w, h]; }
    render(scene, camera) { this.scene = scene; this.camera = camera; clock += t.script; drawn++; }
    dispose() {} forceContextLoss() {}
  }
  const local = {
    innerWidth: 1280, devicePixelRatio: 2, console: { warn() {}, error() {} },
    requestAnimationFrame(cb) { const id = ++serial; frames.set(id, cb); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    performance: { now: () => clock },
    setTimeout(fn, ms) { const id = ++timerSerial; timers.set(id, { fn, at: clock + ms }); return id; },
    clearTimeout(id) { timers.delete(id); },
    ResizeObserver: class { observe() {} disconnect() {} },
    addEventListener() {}, removeEventListener() {}
  };
  const canvas = document.createElement('canvas');
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 500 });
  document.body.appendChild(canvas);
  const states = [], perf = [];
  new Function('window', EXPLORE)(local);
  const t = {
    script, perf, states,
    get renderer() { return renderer; },
    get drawn() { return drawn; },
    elapsed: 0, // seconds of frames fed since mount
    step(ms) {
      base += ms; clock = base; t.elapsed += ms / 1000;
      for (const [id, timer] of [...timers]) if (timer.at <= clock) { timers.delete(id); timer.fn(); }
      const queued = [...frames.values()]; frames.clear(); queued.forEach((cb) => cb(base));
      clock = base;
    },
    slow() { return t.controller.getState().slow; },
    // Feed frames of `ms` for `seconds`; the elapsed time (since mount) when slow first
    // differs from its value at the start, or null.
    until(seconds, ms) {
      const start = t.slow();
      for (let e = 0; e < seconds * 1000; e += ms) { t.step(ms); if (t.slow() !== start) return t.elapsed; }
      return null;
    },
    checks() { return perf.filter((p) => p.over !== null); }
  };
  t.controller = local.Reef3DExplore.mount(canvas, {
    quality: 'high', site: { seed: 7, depthM: 9, health: { coralCover: 0.5, bleaching: 0.05, algae: 0.1 }, population: [{ id: 'clownfish', count: 2 }, { id: 'brain_coral', count: 2 }] },
    onState: (s) => states.push(s), onError: () => {}, onPerf: (p) => perf.push({ ...p, frame: drawn, at: t.elapsed }), ...options, THREE: { ...THREE, WebGLRenderer: Renderer }
  });
  cleanups.push(() => { try { t.controller.dispose(); } catch (ignore) {} canvas.remove(); });
  return t;
}
const DRAW_HEAVY = { calls: 4000, triangles: 9000000 }; // far over the draw budget
const DRAW_MILD = { calls: 7, triangles: 946000 }; // 1.1 times the high tier's triangle budget
const SCENARIOS = [
  ['draw-bound, far over budget', { info: DRAW_HEAVY }],
  ['draw-bound, a little over budget', { info: DRAW_MILD }],
  ['script-bound', { script: 'most' }]
];
const FPS = [2, 5, 9, 15];
function slowDive(fps, cfg) {
  const ms = 1000 / fps;
  return dive({ info: cfg.info, script: cfg.script === 'most' ? Math.round(ms * 0.7) : 0 });
}

describe('a very slow device is helped, and called slow, within seconds', () => {
  // The first 3 s are always skipped, then the 5 s hold must pass after the governor is spent.
  // Target: under about 10 s after those first 3 s.
  describe.each(SCENARIOS)('%s', (label, cfg) => {
    it.each(FPS)('at %s fps', (fps) => {
      const t = slowDive(fps, cfg);
      const at = t.until(40, 1000 / fps);
      expect(at, label + ' at ' + fps + ' fps').not.toBe(null);
      expect(at).toBeGreaterThanOrEqual(8); // never before the first 3 s plus the 5 s hold
      expect(at - 3, 'seconds after the first 3 s').toBeLessThanOrEqual(10.5);
      const last = t.checks().at(-1);
      expect(last.spent).toBe(true);
      // Every reduction the pressure allows came first. (Before round 20 a script-bound
      // dive under 4 fps was called slow with the script reductions untried: its first
      // 60 frames of script time, 30 s at 2 fps, were skipped and read as nothing to cut.)
      if (cfg.script) expect(last.cpu, 'script reductions all made').toBe(3);
      else expect(last.level, 'draw reductions all made').toBe(3);
    });
  });

  it('a device that turns slow mid-dive is called slow within seconds of the change', () => {
    const t = dive({ info: DRAW_HEAVY });
    expect(t.until(10, 1000 / 60)).toBe(null); // fast: the governor trims nothing, never slow
    expect(t.checks().at(-1).level).toBe(0);
    const from = t.elapsed;
    const at = t.until(40, 500); // now 2 fps
    expect(at).not.toBe(null);
    // The frame median needs 3 of its 5 frames to see the change (1 s here), then the
    // governor climbs from level 0 (6 s) and the 5 s hold runs: about 11.5 s.
    expect(at - from).toBeLessThanOrEqual(12);
  });

  it('at 2 fps pause, hide and reduced motion clear slow at once', () => {
    const t = slowDive(2, { info: DRAW_HEAVY });
    expect(t.until(40, 500)).not.toBe(null);
    t.controller.setPaused(true);
    expect(t.slow()).toBe(false);
    for (let i = 0; i < 40; i++) t.step(500);
    expect(t.slow()).toBe(false);
    t.controller.setPaused(false);
    // The governor is still at its last stage, so: the first 3 s again, then the hold.
    const from = t.elapsed, again = t.until(40, 500);
    expect(again - from).toBeGreaterThanOrEqual(7.5);
    expect(again - from).toBeLessThanOrEqual(9.5);

    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(t.slow()).toBe(false);
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(t.until(40, 500)).not.toBe(null);

    t.controller.setReducedMotion(true);
    expect(t.slow()).toBe(false);
    for (let i = 0; i < 40; i++) t.step(500);
    expect(t.slow()).toBe(false);
  });
});

// Each check of the governor, as onPerf reports it.
function deltas(list, key) { const out = []; for (let i = 1; i < list.length; i++) out.push(Math.round((list[i][key] - list[i - 1][key]) * 100) / 100); return out; }
describe('normal devices keep the old governor exactly', () => {
  it.each([
    ['60 fps', () => 1000 / 60],
    ['30 fps', () => 1000 / 30],
    ['30 fps with uneven frames', (i) => (i % 2 ? 50 : 1000 / 60)],
    ['26 fps', () => 1000 / 26]
  ])('%s: a check every 10 frames, the old step sizes, never slow', (label, frameMs) => {
    const t = dive({ info: DRAW_HEAVY, script: 0 });
    t.script = 0;
    let slow = false;
    for (let i = 0; i < 900; i++) { t.step(frameMs(i)); if (t.slow()) slow = true; }
    expect(slow, label + ' never slow').toBe(false);
    const checks = t.checks();
    expect(checks.length).toBeGreaterThan(80);
    // Every 10 drawn frames, exactly.
    const gaps = deltas(checks, 'frame');
    expect(gaps.every((g) => g === 10), label + ' frames between checks: ' + [...new Set(gaps)].join(',')).toBe(true);
    // Level moves by the old amounts only: +0.2 (big overrun on slow frames), or none at 60 fps.
    const steps = [...new Set(deltas(checks, 'level'))].filter((d) => d !== 0);
    if (label === '60 fps') expect(checks.every((c) => c.level === 0), 'a fast device over budget keeps everything').toBe(true);
    else expect(steps.every((d) => d === 0.2), label + ' level steps ' + steps.join(',')).toBe(true);
  });

  it('60 fps with heavy script time: cpu steps by the old 0.25 per 10 frames', () => {
    const t = dive({ script: 30 });
    for (let i = 0; i < 600; i++) t.step(1000 / 60);
    const checks = t.checks();
    expect(deltas(checks, 'frame').every((g) => g === 10)).toBe(true);
    const ups = deltas(checks, 'cpu').filter((d) => d > 0);
    expect(ups.length).toBeGreaterThan(0);
    expect(ups.every((d) => d === 0.25), 'cpu steps ' + [...new Set(ups)].join(',')).toBe(true);
    // The first 60 frames (1 s at 60 fps) are still skipped: no cpu step in the first 70 frames.
    expect(checks.filter((c) => c.frame <= 70).every((c) => c.cpu === 0)).toBe(true);
  });

  it('one 1 s gap on a 60 fps device neither brings a check forward nor weighs more', () => {
    const t = dive({ info: DRAW_HEAVY });
    for (let i = 0; i < 300; i++) t.step(1000 / 60);
    const before = t.checks().length, level0 = t.checks().at(-1).level;
    t.step(1000);
    for (let i = 0; i < 120; i++) t.step(1000 / 60);
    const checks = t.checks();
    expect(deltas(checks, 'frame').every((g) => g === 10)).toBe(true);
    expect(checks.length - before).toBe(12);
    // At most one old-sized step from the gap's raised frame average.
    expect(Math.max(...checks.slice(before).map((c) => c.level)) - level0).toBeLessThanOrEqual(0.2 * 3 + 1e-9);
    expect(t.slow()).toBe(false);
  });
});
