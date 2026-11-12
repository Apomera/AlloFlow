import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

// Round 30, lane perf. Road Ready graphics levels: the device profile, the one quality
// table and how it is applied to a renderer, the Auto governor (driven here with synthetic
// frame times), throttled mirrors, the chunk build budget and the Graphics setting.

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
let loadTool, resetStemLab, makeCtx, React, ReactDOMClient, G, SOURCE;
beforeAll(async () => {
  const mod = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
  ({ loadTool, resetStemLab, makeCtx, React, ReactDOMClient } = mod);
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool(TOOL, 'roadReady');
  G = window.__RR_TEST_EXPORTS__.roadReadyGfx;
  SOURCE = readFileSync(TOOL, 'utf8');
});

// ── fakes ──
const PCFSoft = 2, Basic = 0;
function fakeThree() {
  const T = { PCFSoftShadowMap: PCFSoft, BasicShadowMap: Basic, made: { targets: 0, textures: 0 } };
  T.WebGLRenderTarget = function (w, h) { T.made.targets++; this.width = w; this.height = h; this.texture = {}; this.setSize = (a, b) => { this.width = a; this.height = b; }; this.dispose = () => {}; };
  T.MeshBasicMaterial = function (o) { Object.assign(this, o); };
  T.Scene = function () { this.isBlit = true; this.add = () => {}; };
  T.OrthographicCamera = function () { this.position = { z: 0 }; };
  T.PlaneGeometry = function () {};
  T.Mesh = function (g, m) { this.geometry = g; this.material = m; };
  T.CanvasTexture = function (c) { T.made.textures++; this.image = c; };
  return T;
}
function fakeScene3(T) {
  let ratio = 2;
  const log = [];
  const particles = (count) => ({ geometry: { attributes: { position: { count } }, drawRange: { start: 0, count: Infinity }, setDrawRange(s, c) { this.drawRange = { start: s, count: c }; } } });
  const sun = { isDirectionalLight: true, castShadow: true, shadow: { mapSize: { x: 1024, y: 1024, set(x, y) { this.x = x; this.y = y; } }, map: { disposed: 0, dispose() { this.disposed++; } } } };
  const litMaterial = { needsUpdate: false };
  const scene = { children: [{ isAmbientLight: true }, sun], traverse(fn) { fn({ material: litMaterial }); } };
  const renderer = {
    outputEncoding: 3000, shadowMap: { enabled: true, type: PCFSoft, autoUpdate: false, needsUpdate: false },
    getPixelRatio: () => ratio, setPixelRatio: (v) => { ratio = v; log.push(['ratio', v]); },
    setScissor: (...a) => log.push(['scissor', ...a]), setViewport: (...a) => log.push(['viewport', ...a]),
    setRenderTarget: (t) => log.push(['target', t ? 'texture' : 'canvas']),
    render: (sc, cam) => log.push(['render', sc === scene ? 'scene' : 'blit', cam && cam.name]),
  };
  return { renderer, scene, sun, litMaterial, log, weatherParticles: particles(4800), snowParticles: particles(1200) };
}
// Runs the governor at a frame time that may depend on the level; returns the history of levels.
function drive(gov, seconds, frameMsFor, flagsFor) {
  const changes = [];
  let t = 0, n = 0;
  while (t < seconds * 1000) {
    const ms = typeof frameMsFor === 'function' ? frameMsFor(gov.level, n, t) : frameMsFor;
    const moved = G.rrGfxGovernorSample(gov, ms, flagsFor ? flagsFor(n, t) : null);
    if (moved >= 0) changes.push({ at: Math.round(t), level: moved });
    t += ms; n++;
  }
  return changes;
}

describe('Road Ready device profile (pf30)', () => {
  it('names the first matching reason and a start level for each device shape', () => {
    const p = (env) => { const r = G.rrGfxProfileDevice(env); return r.level + ':' + r.reason; };
    expect(p({ cores: 12, memory: 8, fine: true })).toBe('high:default');
    expect(p({ cores: 8, memory: 8, renderer: 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)' })).toBe('low:software_gl');
    expect(p({ cores: 4, memory: 8, renderer: 'llvmpipe (LLVM 15)' })).toBe('low:software_gl');
    expect(p({ cores: 4, memory: 4 })).toBe('medium:cores');
    expect(p({ cores: 2, memory: 4 })).toBe('low:cores');
    expect(p({ cores: 8, memory: 4 })).toBe('medium:memory');
    expect(p({ cores: 8, memory: 2 })).toBe('low:memory');
    expect(p({ cores: 8, memory: 8, saveData: true })).toBe('medium:save_data');
    expect(p({ cores: 8, memory: 8, small: true, fine: false })).toBe('medium:small_touch');
    expect(p({ cores: 8, memory: 8, small: true, fine: true })).toBe('high:default');
    expect(p({})).toBe('high:default');
    expect(p(null)).toBe('high:default');
    expect(G.rrGfxProfileDevice({ cores: 4, memory: 4 }).cores).toBe(4);
  });
  it('reads a pre-set device once and never throws without WebGL', () => {
    delete window.__rrGfxDevice;
    const read = G.rrGfxReadDevice();
    expect(G.RR_GFX_LEVELS[read.level]).toBeDefined();
    expect(G.rrGfxReadDevice()).toBe(read);
    window.__rrGfxDevice = G.rrGfxProfileDevice({ cores: 2 });
    expect(G.rrGfxReadDevice().level).toBe('low');
    delete window.__rrGfxDevice;
  });
  it('normalises the saved setting and picks the start level', () => {
    expect(['high', 'medium', 'low', 'auto', undefined, 'lowest', 7].map(G.rrGfxSetting)).toEqual(['high', 'medium', 'low', 'auto', 'auto', 'auto', 'auto']);
    const chromebook = G.rrGfxProfileDevice({ cores: 4, memory: 4 });
    expect(G.rrGfxStartLevel(undefined, chromebook)).toBe('medium');
    expect(G.rrGfxStartLevel('auto', chromebook)).toBe('medium');
    expect(G.rrGfxStartLevel('high', chromebook)).toBe('high');
    expect(G.rrGfxStartLevel('low', G.rrGfxProfileDevice({ cores: 16 }))).toBe('low');
  });
});

describe('Road Ready quality table (pf30)', () => {
  it('is one table ordered from most to least detail, and High is the old look', () => {
    expect(G.RR_GFX_ORDER).toEqual(['high', 'medium', 'low', 'lowest']);
    const rows = G.RR_GFX_ORDER.map((k) => G.RR_GFX_LEVELS[k]);
    expect(rows.map((r) => r.pixelRatio)).toEqual([2, 1.5, 1, 0.75]);
    expect(rows.map((r) => r.mirrors)).toEqual(['scene', 'target', 'drawn', 'drawn']);
    expect(rows.map((r) => r.shadows + r.shadowSize)).toEqual(['soft1024', 'basic512', 'off512', 'off512']);
    expect(rows.map((r) => r.bloom)).toEqual([true, true, false, false]);
    expect(rows.map((r) => r.antialias)).toEqual([true, false, false, false]);
    expect(rows[0]).toMatchObject({ chunksAhead: 8, chunksBehind: 3, fogScale: 1, particles: 1 });
    for (let i = 1; i < rows.length; i++) {
      for (const key of ['pixelRatio', 'chunksAhead', 'chunksBehind', 'fogScale', 'particles', 'shadowSize']) expect(rows[i][key]).toBeLessThanOrEqual(rows[i - 1][key]);
      // Every built chunk range still reaches past the fog (clear-day fog ends at 120 m; a chunk is 32 m).
      expect(rows[i].chunksAhead * 32).toBeGreaterThanOrEqual(120 * rows[i].fogScale);
    }
  });
  it('applies each row to a renderer: pixel ratio, shadows, particles, bloom, chunk range', () => {
    const T = fakeThree();
    const seen = {};
    for (const dpr of [2, 1]) {
      for (const level of G.RR_GFX_ORDER) {
        const s3 = fakeScene3(T);
        G.rrGfxApplyLevel(s3, T, level, dpr);
        seen[dpr + level] = [s3.renderer.getPixelRatio(), s3.renderer.shadowMap.type, s3.sun.castShadow, s3.sun.shadow.mapSize.x,
          s3.weatherParticles.geometry.drawRange.count, s3.snowParticles.geometry.drawRange.count, s3._gfxBloom, s3._gfxChunksAhead, s3._gfxChunksBehind, s3._gfxFogScale];
      }
    }
    expect(seen['2high']).toEqual([2, PCFSoft, true, 1024, 4800, 1200, true, 8, 3, 1]);
    expect(seen['2medium']).toEqual([1.5, Basic, true, 512, 2880, 720, true, 6, 3, 1]);
    expect(seen['2low']).toEqual([1, PCFSoft, false, 512, 1680, 420, false, 5, 2, 1]);
    expect(seen['2lowest']).toEqual([0.75, PCFSoft, false, 512, 1200, 300, false, 4, 2, 0.85]);
    // A school Chromebook screen (device pixel ratio 1): only the lowest level lowers resolution.
    expect(['high', 'medium', 'low', 'lowest'].map((k) => seen['1' + k][0])).toEqual([1, 1, 1, 0.75]);
  });
  it('High leaves an untouched scene exactly as it was; a filter change recompiles lit materials once', () => {
    const T = fakeThree();
    const s3 = fakeScene3(T);
    G.rrGfxApplyLevel(s3, T, 'high', 2);
    expect(s3.log).toEqual([]);
    expect(s3.litMaterial.needsUpdate).toBe(false);
    expect(s3.sun.shadow.map.disposed).toBe(0);
    const map = s3.sun.shadow.map;
    G.rrGfxApplyLevel(s3, T, 'medium', 2);
    expect(s3.litMaterial.needsUpdate).toBe(true);
    expect(map.disposed).toBe(1);
    expect(s3.sun.shadow.map).toBe(null);
  });
  it('a change of setting mid-drive applies on the next frame without a new renderer', () => {
    const T = fakeThree();
    window.__rrGfxDevice = G.rrGfxProfileDevice({ cores: 4, memory: 4 });
    const s3 = fakeScene3(T);
    const renderer = s3.renderer;
    let now = 0;
    const frame = (setting) => G.rrGfxFrame(s3, T, setting, (now += 16), { devicePixelRatio: 2 });
    expect(frame(undefined).applied).toBe('medium');
    expect(s3._gfx.profile.reason).toBe('cores');
    expect(frame('low').applied).toBe('low');
    expect(s3.sun.castShadow).toBe(false);
    expect(frame('high').applied).toBe('high');
    expect([renderer.getPixelRatio(), renderer.shadowMap.type, s3.sun.castShadow, s3.sun.shadow.mapSize.x, s3._gfxBloom]).toEqual([2, PCFSoft, true, 1024, true]);
    expect(s3.renderer).toBe(renderer);
    expect(frame('auto').applied).toBe('medium');
    delete window.__rrGfxDevice;
  });
  it('the scene code uses the table: antialias at start, one shadow render a frame, bloom switch, fog, particles', () => {
    // Round 31 (lane render): the K photo draws the frame again and copies at once, so the canvas no longer keeps its picture.
    expect(SOURCE.includes("antialias: !!RR_GFX_LEVELS[gfxStartLevel].antialias, preserveDrawingBuffer: false")).toBe(true);
    expect(SOURCE.includes('renderer.shadowMap.autoUpdate = false;')).toBe(true);
    const needs = SOURCE.indexOf('s3.renderer.shadowMap.needsUpdate = true;');
    const mainPass = SOURCE.indexOf('var _ac=gfxComposer; if(_ac){');
    const mirror = SOURCE.indexOf("rrGfxMirrorPass(s3, T, 'rear'");
    expect(needs).toBeGreaterThan(0);
    expect(mainPass).toBeGreaterThan(needs);
    expect(mirror).toBeGreaterThan(mainPass);
    expect(SOURCE.slice(needs, mirror).split('shadowMap.needsUpdate = true').length).toBe(2);
    expect(SOURCE.includes('var gfxComposer = s3._gfxBloom === false ? null : s3.renderer._alloComposer;')).toBe(true);
    expect(SOURCE.includes('gfxFog.far = gfxFog._rrFar0 * s3._gfxFogScale;')).toBe(true);
    expect(SOURCE.includes('for (var rpi = 0; rpi < rpDrawn; rpi += 2) {')).toBe(true);
    expect(SOURCE.includes('for (var spi = 0; spi < spDrawn; spi++) {')).toBe(true);
  });
});

describe('Road Ready Auto governor (pf30)', () => {
  it('steps down one notch after several seconds of slow frames, and not before', () => {
    const gov = G.rrGfxGovernorCreate(0);
    expect(drive(gov, 6, 50)).toEqual([]); // 3 s warm-up + under 4 s of slow frames
    const changes = drive(gov, 3, 50);
    expect(changes.map((c) => c.level)).toEqual([1]);
    expect(gov.level).toBe(1);
  });
  it('keeps stepping down to the lowest level on a device that stays slow, then stops', () => {
    const gov = G.rrGfxGovernorCreate(1);
    const changes = drive(gov, 60, 70);
    expect(changes.map((c) => c.level)).toEqual([2, 3]);
    expect(gov.level).toBe(3);
  });
  it('judges a device at 2 frames a second too', () => {
    const gov = G.rrGfxGovernorCreate(0);
    expect(drive(gov, 20, 500).length).toBeGreaterThanOrEqual(1);
  });
  it('ignores pauses, a hidden tab and the frame after them', () => {
    const gov = G.rrGfxGovernorCreate(0);
    drive(gov, 5, 16.7);
    // 5 minutes paused at a crawl, then hidden, then one huge gap frame, then normal frames.
    expect(drive(gov, 300, 400, () => ({ paused: true }))).toEqual([]);
    expect(drive(gov, 60, 1000, () => ({ hidden: true }))).toEqual([]);
    expect(G.rrGfxGovernorSample(gov, 90000, {})).toBe(-1);
    expect(drive(gov, 30, 16.7)).toEqual([]);
    expect(gov.level).toBe(0);
  });
  it('ignores chunk-build spikes and lone hitches', () => {
    const flagged = G.rrGfxGovernorCreate(0);
    // Every 4th frame builds a chunk (120 ms, flagged as a spike); the rest are quick.
    expect(drive(flagged, 60, (level, n) => (n % 4 === 0 ? 120 : 17), (n) => ({ spike: n % 4 === 0 }))).toEqual([]);
    const unflagged = G.rrGfxGovernorCreate(0);
    // An unflagged 300 ms hitch every 6th frame: the median of 5 never sees it.
    expect(drive(unflagged, 60, (level, n) => (n % 6 === 0 ? 300 : 17))).toEqual([]);
  });
  it('leaves a 30 frames-a-second cap alone', () => {
    const gov = G.rrGfxGovernorCreate(0);
    expect(drive(gov, 120, 33.4)).toEqual([]);
    const low = G.rrGfxGovernorCreate(2);
    expect(drive(low, 120, 33.4)).toEqual([]);
  });
  it('does not oscillate on a device that is slow at one level and fast at the next', () => {
    const gov = G.rrGfxGovernorCreate(1);
    // Medium = 50 ms, anything lower = 18 ms: the trap that makes a naive governor flip forever.
    const changes = drive(gov, 1800, (level) => (level <= 1 ? 50 : 18));
    expect(changes.map((c) => c.level)).toEqual([2, 1, 2, 1, 2]);
    expect(gov.level).toBe(2);
    // Each new try waits longer than the one before, and after two failed tries it stays put.
    expect(changes[3].at - changes[2].at).toBeGreaterThan(1.8 * (changes[1].at - changes[0].at));
    expect(changes[4].at).toBeLessThan(200000);
  });
  it('steps back up to the profile level only after a long fast spell', () => {
    const gov = G.rrGfxGovernorCreate(1);
    drive(gov, 10, 60);
    expect(gov.level).toBe(2);
    expect(drive(gov, 15, 18)).toEqual([]);
    expect(drive(gov, 10, 18).map((c) => c.level)).toEqual([1]);
  });
  it('never goes above the profile level unless frames are clearly fast', () => {
    const steady = G.rrGfxGovernorCreate(1);
    expect(drive(steady, 600, 20)).toEqual([]); // 50 fps: fine, but not proof of headroom
    const jitter = G.rrGfxGovernorCreate(1);
    expect(drive(jitter, 600, (level, n) => (n % 3 === 0 ? 30 : 16.7))).toEqual([]);
    const fast = G.rrGfxGovernorCreate(1);
    expect(drive(fast, 25, 16.7)).toEqual([]);
    expect(drive(fast, 15, 16.7).map((c) => c.level)).toEqual([0]);
  });
  it('rrGfxFrame feeds the governor only in Auto and marks its own level change as a spike', () => {
    const T = fakeThree();
    window.__rrGfxDevice = G.rrGfxProfileDevice({ cores: 16, memory: 8 });
    const s3 = fakeScene3(T);
    let now = 0;
    for (let i = 0; i < 400; i++) G.rrGfxFrame(s3, T, 'high', (now += 60), { devicePixelRatio: 1 });
    expect(s3._gfx.applied).toBe('high');
    expect(s3._gfx.gov.level).toBe(0);
    for (let i = 0; i < 400 && s3._gfx.applied === 'high'; i++) G.rrGfxFrame(s3, T, 'auto', (now += 60), { devicePixelRatio: 1 });
    expect(s3._gfx.applied).toBe('medium');
    expect(s3._gfx.spike).toBe(true);
    expect(s3._gfx.history).toEqual([{ atMs: now, level: 'medium', medianMs: 60 }]);
    // Paused frames never move it.
    for (let i = 0; i < 400; i++) G.rrGfxFrame(s3, T, 'auto', (now += 200), { devicePixelRatio: 1, paused: true });
    expect(s3._gfx.applied).toBe('medium');
    delete window.__rrGfxDevice;
  });
  it('the frame hook passes pause, input-suspend and hidden-tab state, and chunk builds flag a spike', () => {
    expect(SOURCE.includes("gfxFlags.paused = !!pausedRef.current || !!(window.StemInput && window.StemInput.isSuspended());")).toBe(true);
    expect(SOURCE.includes("gfxFlags.hidden = typeof document !== 'undefined' && !!document.hidden;")).toBe(true);
    expect(SOURCE.includes('if (chunkBuildPlan.length && s3._gfx) s3._gfx.spike = true;')).toBe(true);
  });
});

describe('Road Ready mirrors per level (pf30)', () => {
  const count = (level, frames, sides) => {
    const totals = { rear: 0, left: 0, right: 0, most: 0 };
    for (let f = 0; f < frames; f++) {
      const plan = G.rrGfxMirrorPlan(level, f, sides, true);
      const n = (plan.rear ? 1 : 0) + (plan.left ? 1 : 0) + (plan.right ? 1 : 0);
      totals.rear += plan.rear ? 1 : 0; totals.left += plan.left ? 1 : 0; totals.right += plan.right ? 1 : 0;
      totals.most = Math.max(totals.most, n);
    }
    return totals;
  };
  it('High draws every mirror every frame; Medium one mirror a frame in turn; Low uses the drawn HUD mirrors', () => {
    expect(count('high', 60, true)).toEqual({ rear: 60, left: 60, right: 60, most: 3 });
    expect(count('high', 60, false)).toEqual({ rear: 60, left: 0, right: 0, most: 1 });
    expect(count('medium', 60, true)).toEqual({ rear: 20, left: 20, right: 20, most: 1 });
    expect(count('medium', 60, false)).toEqual({ rear: 30, left: 0, right: 0, most: 1 });
    expect(count('low', 60, true)).toEqual({ rear: 0, left: 0, right: 0, most: 0 });
    expect(G.rrGfxMirrorPlan('low', 0, true, true).mode).toBe('drawn');
    expect(G.rrGfxMirrorPlan('lowest', 0, true, true).mode).toBe('drawn');
    // The first frame after the mirrors come back fills all of them.
    expect(G.rrGfxMirrorPlan('medium', 1, true, false)).toEqual({ mode: 'target', rear: true, left: true, right: true });
  });
  it('a throttled mirror shows its texture every frame and redraws the scene only on its turn', () => {
    const T = fakeThree();
    const s3 = fakeScene3(T);
    const cam = { name: 'rear' };
    const sceneRenders = () => s3.log.filter((e) => e[0] === 'render' && e[1] === 'scene').length;
    const blits = () => s3.log.filter((e) => e[0] === 'render' && e[1] === 'blit').length;
    G.rrGfxMirrorPass(s3, T, 'rear', cam, 10, 20, 200, 80, true, false); // new texture: must draw once
    expect([sceneRenders(), blits(), T.made.targets]).toEqual([1, 1, 1]);
    expect(s3._gfxMirrorTargets.rear.target.width).toBe(400); // 200 px at pixel ratio 2
    G.rrGfxMirrorPass(s3, T, 'rear', cam, 10, 20, 200, 80, true, false);
    G.rrGfxMirrorPass(s3, T, 'rear', cam, 10, 20, 200, 80, true, false);
    expect([sceneRenders(), blits(), T.made.targets]).toEqual([1, 3, 1]);
    G.rrGfxMirrorPass(s3, T, 'rear', cam, 10, 20, 200, 80, true, true);
    expect([sceneRenders(), blits()]).toEqual([2, 4]);
    G.rrGfxMirrorPass(s3, T, 'rear', cam, 10, 20, 240, 80, true, false); // resized: redraw
    expect(sceneRenders()).toBe(3);
    // The scene pass goes to the texture, and the canvas is the target again before the blit.
    const firstTarget = s3.log.findIndex((e) => e[0] === 'target');
    expect(s3.log.slice(firstTarget, firstTarget + 3).map((e) => e.slice(0, 2).join(':'))).toEqual(['target:texture', 'render:scene', 'target:canvas']);
    // High: the original direct pass, no texture.
    const direct = fakeScene3(T);
    G.rrGfxMirrorPass(direct, T, 'rear', cam, 10, 20, 200, 80, false, true);
    expect(direct.log).toEqual([['scissor', 10, 20, 200, 80], ['viewport', 10, 20, 200, 80], ['render', 'scene', 'rear']]);
    expect(direct._gfxMirrorTargets).toBeUndefined();
  });
  it('the render code asks the plan, and the drawn level hands the mirrors to the HUD', () => {
    expect(SOURCE.includes("if (cameraModeRef.current === 'cockpit' && dataRef.current.realMirrors !== false && gfxRow.mirrors !== 'drawn') {")).toBe(true);
    expect(SOURCE.includes('var mirrorPlan = rrGfxMirrorPlan(s3._gfxLevel, s3._gfx ? s3._gfx.frame : 0, rW >= 680, s3._gfxMirrorPrimed);')).toBe(true);
    expect(SOURCE.includes("rrGfxMirrorPass(s3, T, 'rear', mc, mx, my, mw, mh, mirrorToTarget, mirrorPlan.rear);")).toBe(true);
    expect(SOURCE.includes('var mirrorRenderSize = s3._mirrorSizeVec ? s3.renderer.getSize(s3._mirrorSizeVec) : (s3._mirrorSizeVec = s3.renderer.getSize(new T.Vector2()));')).toBe(true);
  });
});

describe('Road Ready chunk build budget (pf30)', () => {
  it('starts with the chunks around the car, then one chunk a frame, nearest first', () => {
    const loaded = {};
    const built = [];
    const frame = (current, sign, first) => {
      const plan = G.rrChunkBuildPlan(current, sign < 0 ? -8 : -3, sign < 0 ? 3 : 8, sign, loaded, first);
      plan.forEach((ci) => { loaded[ci] = true; });
      built.push(plan);
      return plan;
    };
    expect(frame(10, 1, true)).toEqual([10, 11, 9]);
    for (let f = 0; f < 12; f++) frame(10, 1, false);
    expect(built.slice(1, 10).map((p) => p.length)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(built.slice(1, 10).map((p) => p[0])).toEqual([12, 8, 13, 7, 14, 15, 16, 17, 18]);
    expect(built.slice(10).every((p) => p.length === 0)).toBe(true);
    expect(Object.keys(loaded).length).toBe(12);
  });
  it('travelling toward lower chunks mirrors the order', () => {
    const plan = G.rrChunkBuildPlan(10, -8, 3, -1, {}, true);
    expect(plan).toEqual([10, 9, 11]);
    const loaded = { 10: 1, 9: 1, 11: 1 };
    expect(G.rrChunkBuildPlan(10, -8, 3, -1, loaded, false)).toEqual([8]);
  });
  it('the car cannot outrun the road: its own chunk and the next one always exist', () => {
    const loaded = {};
    let current = 0, most = 0;
    G.rrChunkBuildPlan(current, -3, 8, 1, loaded, true).forEach((ci) => { loaded[ci] = true; });
    // One new chunk entered EVERY frame (32 m a frame: far beyond any car), 200 frames.
    for (let f = 0; f < 200; f++) {
      current++;
      const plan = G.rrChunkBuildPlan(current, -3, 8, 1, loaded, false);
      plan.forEach((ci) => { loaded[ci] = true; });
      most = Math.max(most, plan.length);
      expect(loaded[current] && loaded[current + 1]).toBe(true);
    }
    expect(most).toBeLessThanOrEqual(2);
    // Normal driving (a new chunk every 30 frames at highway speed): never more than one a frame.
    const calm = {}; let chunk = 0, worst = 0;
    G.rrChunkBuildPlan(0, -3, 8, 1, calm, true).forEach((ci) => { calm[ci] = true; });
    for (let f = 0; f < 600; f++) {
      if (f % 30 === 29) chunk++;
      const plan = G.rrChunkBuildPlan(chunk, -3, 8, 1, calm, false);
      plan.forEach((ci) => { calm[ci] = true; });
      worst = Math.max(worst, plan.length);
      for (let ahead = 0; ahead <= 4; ahead++) if (f > 12) expect(calm[chunk + ahead]).toBe(true);
    }
    expect(worst).toBe(1);
  });
  it('a jump (respawn) builds the chunk under the car and the one ahead at once', () => {
    const loaded = { 0: 1, 1: 1, 2: 1 };
    expect(G.rrChunkBuildPlan(40, -3, 8, 1, loaded, false)).toEqual([40, 41]);
  });
  it('a chunk built on its own frame gets the same scenery: no builder variable is read before it is set', () => {
    // The builder is one 4,700-line loop body. A `var` read above its declaration sees the value
    // left by the chunk built before it, or undefined (NaN positions: nothing drawn) when the chunk
    // is the first one built in a frame. roadHalfW and ribbonChunkBaseY were read that way.
    const acorn = createRequire(path.resolve(process.cwd(), 'package.json'))('acorn');
    const ast = acorn.parse(SOURCE, { ecmaVersion: 2022 });
    const isFn = (n) => n.type === 'FunctionExpression' || n.type === 'FunctionDeclaration' || n.type === 'ArrowFunctionExpression';
    const visit = (node, fn) => { if (!node || typeof node.type !== 'string') return; if (fn(node) === false) return; for (const k in node) { const v = node[k]; if (Array.isArray(v)) v.forEach((c) => visit(c, fn)); else if (v && typeof v.type === 'string') visit(v, fn); } };
    let loop = null;
    visit(ast, (n) => { if (n.type === 'ForStatement' && n.body.type === 'BlockStatement' && n.body.body.some((s) => s.type === 'VariableDeclaration' && s.declarations.some((d) => d.id.name === 'chunkGroup'))) loop = n; });
    expect(loop).toBeTruthy();
    const firstAssign = new Map();
    visit(loop.body, (n) => {
      if (isFn(n)) return false;
      if (n.type === 'VariableDeclaration' && n.kind === 'var') n.declarations.forEach((d) => { if (d.id.type === 'Identifier' && d.init && (!firstAssign.has(d.id.name) || d.end < firstAssign.get(d.id.name))) firstAssign.set(d.id.name, d.end); });
    });
    expect(firstAssign.size).toBeGreaterThan(500);
    const reads = new Map();
    const scan = (node, shadow) => visit(node, (n) => {
      if (isFn(n)) {
        const own = new Set(shadow);
        n.params.forEach((p) => { if (p.type === 'Identifier') own.add(p.name); });
        visit(n.body, (m) => { if (isFn(m)) return false; if (m.type === 'VariableDeclaration') m.declarations.forEach((d) => { if (d.id.type === 'Identifier') own.add(d.id.name); }); });
        scan(n.body, own);
        return false;
      }
      if (n.type === 'Identifier' && firstAssign.has(n.name) && !shadow.has(n.name) && (!reads.has(n.name) || n.start < reads.get(n.name))) reads.set(n.name, n.start);
      if (n.type === 'MemberExpression' && !n.computed) { scan(n.object, shadow); return false; }
      if (n.type === 'Property' && !n.computed) { scan(n.value, shadow); return false; }
      if (n.type === 'VariableDeclarator') { if (n.init) scan(n.init, shadow); return false; }
      if (n.type === 'AssignmentExpression' && n.left.type === 'Identifier') { scan(n.right, shadow); return false; }
    });
    scan(loop.body, new Set());
    const early = [];
    reads.forEach((pos, name) => { if (pos < firstAssign.get(name)) early.push(name); });
    expect(early).toEqual([]);
  });
  it('the builder loop runs the plan with the level range; the simulation range is untouched', () => {
    expect(SOURCE.includes('var chunkBuildPlan = rrChunkBuildPlan(currentChunk, travelSign === -1 ? -gfxAhead : -gfxBehind,')).toBe(true);
    expect(SOURCE.includes('for (var chunkBuildIndex = 0; chunkBuildIndex < chunkBuildPlan.length; chunkBuildIndex++) {')).toBe(true);
    expect(SOURCE.includes('for (var ci = currentChunk + loFromTravel; ci <= currentChunk + hiFromTravel; ci++) {')).toBe(false);
    expect(SOURCE.includes('var loFromTravel = travelSign === -1 ? -RR_STREAM_CHUNKS_AHEAD : -RR_STREAM_CHUNKS_BEHIND;')).toBe(true);
    expect(SOURCE.includes('for (var sci = currentChunk + loFromTravel; sci <= currentChunk + hiFromTravel; sci++) {')).toBe(true);
  });
});

describe('Road Ready shared sign textures and on-change walks (pf30)', () => {
  it('one texture per sign text; the chunk unload skips shared textures', () => {
    const T = fakeThree();
    const s3 = {};
    const a = G.rrSharedCanvasTexture(s3, T, 'speedLarge:25', { id: 1 });
    const b = G.rrSharedCanvasTexture(s3, T, 'speedLarge:25', { id: 2 });
    const c = G.rrSharedCanvasTexture(s3, T, 'speedLarge:35', { id: 3 });
    expect(b).toBe(a);
    expect(c).not.toBe(a);
    expect(a._rrShared).toBe(true);
    expect(T.made.textures).toBe(2);
    // The cache is bounded: past the cap a texture is made but not shared (so the unload frees it).
    for (let i = 0; i < 200; i++) G.rrSharedCanvasTexture(s3, T, 'k' + i, {});
    expect(Object.keys(s3._rrTexCache).length).toBe(96);
    expect(G.rrSharedCanvasTexture(s3, T, 'late', {})._rrShared).toBeUndefined();
    expect(SOURCE.includes("if (m.map && !m.map._rrShared && typeof m.map.dispose === 'function') m.map.dispose();")).toBe(true);
    for (const key of ["'speedLarge:' + biomeLimit", "'speedSmall:' + slBiomeMph", "'street:' + stName", "'stopFace'", "'lampLetter:' + ld.name", "'oneWay:' + (owDir > 0 ? 1 : -1)", "'landmark:' + lt.signColor + ':' + lt.sign"]) {
      expect(SOURCE.includes('rrSharedCanvasTexture(s3, T, ' + key)).toBe(true);
    }
  });
  it('streetlights, beacons and the unload scan run on change, not every frame', () => {
    expect(SOURCE.includes("var slKey = (slLit ? 'L' : 'D') + (s3._rrChunkEpoch | 0);")).toBe(true);
    expect(SOURCE.includes('if (s3._rrStreetlightKey !== slKey) {')).toBe(true);
    expect(SOURCE.includes('var beaconPrune = s3._rrBeaconUnloadEpoch !== (s3._rrUnloadEpoch | 0);')).toBe(true);
    expect(SOURCE.includes('if (s3._rrUnloadRangeKey !== unloadRangeKey) Object.keys(s3._loadedChunks).forEach(function(key) {')).toBe(true);
    expect(SOURCE.includes('s3._rrChunkEpoch = (s3._rrChunkEpoch | 0) + 1;')).toBe(true);
  });
});

describe('Road Ready Graphics setting (pf30)', () => {
  let mounted = [];
  async function mount(roadReady) {
    resetStemLab();
    const config = loadTool(TOOL, 'roadReady');
    const state = { toolData: { roadReady } };
    function Host() {
      const [toolData, setToolData] = React.useState(state.toolData);
      state.toolData = toolData;
      const ctx = makeCtx({
        toolData,
        update: (tool, key, value) => setToolData((p) => ({ ...p, [tool]: { ...(p[tool] || {}), [key]: value } })),
        updateMulti: (tool, values) => setToolData((p) => ({ ...p, [tool]: { ...(p[tool] || {}), ...(values || {}) } })),
      });
      return config.render(ctx);
    }
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    await React.act(async () => { root.render(React.createElement(Host)); });
    const m = { host, root, state };
    mounted.push(m);
    return m;
  }
  afterEach(async () => {
    for (const m of mounted) { await React.act(async () => { m.root.unmount(); }); m.host.remove(); }
    mounted = [];
    delete window.__rrGfxDevice;
  });
  const choose = async (select, value) => {
    await React.act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
      setter.call(select, value);
      select.dispatchEvent(new window.Event('change', { bubbles: true }));
    });
  };

  it('defaults to Auto and says which level this device gets and why', async () => {
    window.__rrGfxDevice = G.rrGfxProfileDevice({ cores: 4, memory: 4 });
    const m = await mount({ view: 'menu', tourCompleted: true });
    const select = m.host.querySelector('select[data-rr-gfx-quality]');
    expect(select).toBeTruthy();
    expect(select.value).toBe('auto');
    expect([...select.options].map((o) => o.value + '=' + o.textContent)).toEqual(['auto=Auto', 'high=High', 'medium=Medium', 'low=Low']);
    expect(m.host.querySelector('[data-rr-gfx-status]').textContent).toBe('Auto: Medium on this device (4 processor cores).');
    const note = m.host.querySelector('#' + select.getAttribute('aria-describedby'));
    expect(note.textContent).toContain('Lower levels run more smoothly on slower computers. The road and the rules stay the same.');
  });
  it('saves the choice in the tool state and rewrites the reason line', async () => {
    window.__rrGfxDevice = G.rrGfxProfileDevice({ cores: 4, memory: 4 });
    const m = await mount({ view: 'menu', tourCompleted: true });
    await choose(m.host.querySelector('select[data-rr-gfx-quality]'), 'low');
    expect(m.state.toolData.roadReady.gfxQuality).toBe('low');
    expect(m.host.querySelector('select[data-rr-gfx-quality]').value).toBe('low');
    expect(m.host.querySelector('[data-rr-gfx-status]').textContent).toBe('You chose Low. Auto would pick Medium on this device (4 processor cores).');
    await choose(m.host.querySelector('select[data-rr-gfx-quality]'), 'auto');
    expect(m.state.toolData.roadReady.gfxQuality).toBe('auto');
    expect(m.host.querySelector('[data-rr-gfx-status]').textContent).toBe('Auto: Medium on this device (4 processor cores).');
  });
  it('a saved choice comes back selected', async () => {
    window.__rrGfxDevice = G.rrGfxProfileDevice({ cores: 16, memory: 8 });
    const m = await mount({ view: 'menu', tourCompleted: true, gfxQuality: 'medium' });
    expect(m.host.querySelector('select[data-rr-gfx-quality]').value).toBe('medium');
    expect(m.host.querySelector('[data-rr-gfx-status]').textContent).toBe('You chose Medium. Auto would pick High on this device (it can show full detail).');
  });
  it('writes each reason and the governor states in plain words', () => {
    const line = (env, live, setting) => G.rrGfxStatusLine(setting, G.rrGfxProfileDevice(env), live);
    expect(line({ renderer: 'SwiftShader' })).toBe('Auto: Low on this device (it draws 3D without a graphics chip).');
    expect(line({ cores: 2 })).toBe('Auto: Low on this device (2 processor cores).');
    expect(line({ cores: 8, memory: 4 })).toBe('Auto: Medium on this device (4 GB of memory).');
    expect(line({ cores: 8, saveData: true })).toBe('Auto: Medium on this device (data saver is on).');
    expect(line({ cores: 8, small: true })).toBe('Auto: Medium on this device (small touch screen).');
    expect(line({ cores: 8 })).toBe('Auto: High on this device (it can show full detail).');
    expect(line({ cores: 4 }, { gov: { level: 3 } })).toBe('Auto: Lowest now. The picture was slow, so detail went down.');
    expect(line({ cores: 4 }, { gov: { level: 0 } })).toBe('Auto: High now. The picture was smooth, so detail went up.');
    expect(line({ cores: 4 }, { gov: { level: 1 } })).toBe('Auto: Medium on this device (4 processor cores).');
  });
  it('the drive More panel shows the level in use', () => {
    expect(SOURCE.includes("h('div', { 'data-rr-gfx-live': 'true'")).toBe(true);
    expect(SOURCE.includes('rrGfxStatusLine(d.gfxQuality, rrGfxReadDevice(), threeRef.current && threeRef.current._gfx),')).toBe(true);
  });
});
