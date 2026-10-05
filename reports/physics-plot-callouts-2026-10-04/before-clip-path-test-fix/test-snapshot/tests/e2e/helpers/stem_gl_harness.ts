/**
 * Reusable real-WebGL harness for STEM Lab plugin tools.
 *
 * WHY THIS EXISTS
 * ~16 STEM tools render through three.js and every test around them runs in jsdom,
 * which has no WebGL — so their engines have only ever been verified by eye. Headless
 * Chromium rasterises WebGL 2.0 through SwiftShader, which needs no GPU and sidesteps
 * this machine's ARM/Adreno driver entirely.
 *
 * The first spec built on this (18-geometry-world-gl) immediately found two bugs
 * nothing else could reach: a canvas growing without bound through a ResizeObserver
 * feedback loop, and movement gated on pointer lock so keyboard-only students could
 * not walk. Neither is visible without layout and an animation loop.
 *
 * This module is the boilerplate from that spec, so the next tool costs ~40 lines
 * instead of ~380:
 *   - a static server over the WORKING TREE (not the deployed site — playwright.config
 *     points baseURL at production, which cannot test a change in progress)
 *   - React UMD and three r128 served from the tree too, so no network is needed
 *   - a minimal window.StemLab registry (the tool IIFEs return early without one)
 *   - a stateful ctx whose update/updateMulti really re-render, which is the loop
 *     several of these bugs ride on
 *   - a GL RECORDER (below) so a spec can tell what the TOOL did from what the test did
 *
 * THE GL RECORDER, and the vacuous passes it exists to stop (audit 2026-09-22):
 *   The old __glCanvas found "the GL canvas" by calling getContext('webgl2') on every
 *   canvas. On a canvas the tool had never set up, that CREATES a fresh, live context,
 *   so "mounts a live GL context" passed for a tool that built no scene at all. The
 *   molecule row did exactly that for months: without OrbitControls its initThree
 *   returns before the renderer, and the harness supplied the only context on the page.
 *   Worse, on a canvas the tool had not drawn to YET, the probe stole it: the tool's own
 *   later getContext('2d') returned null.
 *   Now an init script, the first thing in <head>, wraps getContext before any tool
 *   code exists and records every GL context the PAGE creates: its canvas, draw calls,
 *   the code that asked for it, and whether and by whom it was lost. Everything in
 *   this file reads that record and never calls getContext itself.
 *
 *   Read it from a spec with harness.glContexts(page) / glScene(page) / glPixels(page),
 *   or in-page with window.__glContexts() / __glScene() / __glRecord(canvas).
 *
 * TRAPS, all learned the hard way:
 *   1. Always tear the scene down in afterEach. Chromium caps live WebGL contexts per
 *      process and silently kills the oldest; the symptom is not an error but the
 *      whole suite running ~4x slower with random timeouts.
 *   2. Raise the timeout. SwiftShader pixel readback is slow ("GPU stall due to
 *      ReadPixels"); a mount plus two screenshots does not fit in the default 30s.
 *      Use test.describe.configure({ timeout: 150_000 }).
 *   3. Never run two Playwright suites at once on this machine — 2 min becomes 17.
 *   4. A screenshot of the canvas's BOX includes every DOM overlay drawn over it (HUD
 *      text, buttons, status panels) and the canvas's own CSS background. A dead GL
 *      canvas under a busy overlay photographs as "content". glPixels() hides every
 *      other element and flattens the canvas background before it looks.
 *   5. SwiftShader output is not byte-deterministic between two frames of the same
 *      scene. Compare statistics (pixelStats), or calibrate same-input-twice first,
 *      before trusting any byte-level comparison.
 *   6. A retried test that passes on its second attempt is "flaky", and flaky does
 *      not fail the exit code. Conformance-style specs set retries: 0 themselves.
 *
 * MUTATION TESTING a spec built on this: set STEM_GL_SUBSTITUTE to serve a scratch copy
 * in place of a tree file, so the tree is never edited:
 *     STEM_GL_SUBSTITUTE="stem_lab/stem_tool_molecule.js=C:/tmp/x/molecule_mut.js"
 * (several pairs separated by ';'). start() warns loudly while one is active.
 */
import { createServer, Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { readdirSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import type { Page } from '@playwright/test';
import { readPng, pixelStats } from './png_pixels';
import type { PixelStats } from './png_pixels';

const ROOT = process.cwd();
const MIME: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  // Without this the stylesheet is served as octet-stream and Chromium refuses it.
  '.css': 'text/css; charset=utf-8',
  '.wasm': 'application/wasm',
};

export interface HarnessOptions {
  /** Tool source, repo-relative, e.g. 'stem_lab/stem_tool_solarsystem.js'. */
  toolFile: string;
  /** Registered tool id, e.g. 'solarSystem'. */
  toolId: string;
  /** Mount box. Some tools read clientWidth at mount, so give them a real size. */
  width?: number;
  height?: number;
  /** Extra <script> src URLs (repo-relative) loaded before the tool. */
  extraScripts?: string[];
  /**
   * Scripts loaded BEFORE the fallback StemLab registry below — use this to
   * load the real host (stem_lab/stem_lab_module.js) when a tool depends on
   * something only the host provides, e.g. window.StemLab.makeBayViewer.
   *
   * Order matters and is easy to get wrong: the host installs its registry
   * behind `if (!window.StemLab)`, so anything that defines a stub first wins
   * permanently. That is why the fallback below fills gaps instead of
   * replacing wholesale.
   */
  preScripts?: string[];
  /**
   * Serve the app's real compiled stylesheet (Tailwind + app CSS) into the harness.
   *
   * Off by default, because it changes what every existing spec renders: without it a
   * tool is laid out by its inline styles alone, which is what the screenshots in
   * specs 18-24 were baselined against.
   *
   * Turn it ON when the thing under test depends on CSS — responsive grids that only
   * split at a breakpoint, or anything colour-contrast related. axe's colour-contrast
   * rule is meaningless without it: unstyled text on the harness background is not
   * what a student sees, so a pass would be worthless and a fail misleading.
   *
   * The bundle is resolved by glob rather than by its content hash, so a rebuild that
   * renames main.<hash>.css does not silently drop the styling. If no bundle exists in
   * the tree, start() throws rather than quietly serving an unstyled page.
   */
  appStyles?: boolean;
  /**
   * 'viewport' (default): #wrap is a fixed width x height FLEX ROW, the shape the 3D
   * specs were baselined against.
   * 'document': #wrap is block flow, `width` wide and growing with its content. Use it
   * for long scrolling tools. A root with `container-type: inline-size` has an
   * intrinsic width of ZERO, so as a content-sized flex item it collapses to 0px and
   * every canvas inside is invisible (nuclearLab, 2026-09-22).
   */
  layout?: 'viewport' | 'document';
  /** Injected verbatim into the page after mount helpers — define your own probes. */
  probes?: string;
}

/** One GL context as the in-page recorder saw it. */
export interface GlContextRecord {
  id: number;
  /** 'webgl2' | 'webgl' | 'experimental-webgl' */
  type: string;
  /** __mount() generation it was created under (0 = before any mount). */
  mount: number;
  /** 'page' when a served script (tool, host) asked for it; 'test' when only harness
   * page code or page.evaluate did (a spec probe calling getContext itself). */
  createdBy: 'page' | 'test';
  lost: boolean;
  /** Who lost it: 'page' (tool or spec called loseContext / forceContextLoss),
   * 'harness' (__destroy cleaning up), 'browser' (eviction, GPU reset), or null. */
  lostBy: string | null;
  draws: number;
  /** three.js renders on this canvas, when it belongs to a THREE.WebGLRenderer. */
  renders: number;
  /** Milliseconds since its last draw call; null if it never drew. */
  lastDrawAgoMs: number | null;
  connected: boolean;
  /** Canvas is inside #wrap (the tool's mount box). */
  inWrap: boolean;
  width: number;
  height: number;
  /** First stack frames outside three.js and the recorder: the code that asked. */
  creator: string[];
}

/** What three.js last drew on a canvas. */
export interface GlSceneCensus {
  renders: number;
  draws: number;
  hasScene: boolean;
  objects: number;
  meshes: number;
  visibleMeshes: number;
  lines: number;
  points: number;
  sprites: number;
  lights: number;
}

/**
 * Locate the app's compiled stylesheet. Globbed, not hash-pinned: the filename carries
 * a content hash that changes on every rebuild.
 */
export function findAppStylesheet(): string | null {
  for (const dir of ['app/static/css', 'desktop/web-app/public/app/static/css']) {
    let names: string[] = [];
    try { names = readdirSync(join(ROOT, dir)); } catch { continue; }
    const hit = names.filter((n) => /^main\..*\.css$/.test(n)).sort()[0];
    if (hit) return dir + '/' + hit;
  }
  return null;
}

/** Parse STEM_GL_SUBSTITUTE ("repo/rel.js=abs/path.js;...") into a map. */
export function parseSubstitutes(raw: string | undefined): Map<string, string> {
  const out = new Map<string, string>();
  for (const pair of (raw || '').split(';')) {
    const at = pair.indexOf('=');
    if (at <= 0) continue;
    const key = pair.slice(0, at).trim().replace(/\\/g, '/').replace(/^\/+/, '');
    const file = pair.slice(at + 1).trim();
    if (key && file) out.set(key, file);
  }
  return out;
}

/**
 * The recorder. Runs as the first script in <head>, before React, three or any tool.
 * Plain ES5 in a string: it is page code, not Node code.
 */
const GL_RECORDER = `
(function () {
  if (window.__glRecorder) return;
  var proto = HTMLCanvasElement.prototype;
  var origGetContext = proto.getContext;
  var GL_TYPES = { webgl: 1, webgl2: 1, 'experimental-webgl': 1 };
  var byCanvas = new WeakMap(), byCtx = new WeakMap();
  var records = [], seq = 0;
  var R = window.__glRecorder = { records: records, mount: 0, releasing: false,
    forCanvas: function (c) { return c ? byCanvas.get(c) || null : null; },
    forContext: function (g) { return g ? byCtx.get(g) || null : null; } };
  function now() { return Math.round(performance.now()); }
  // The first frames from a SERVED script (tool, host) that led here. Frames from the
  // harness page itself, three.js, React, and page.evaluate are skipped; if nothing is
  // left, the test created the context, not the page (createdBy 'test').
  function creator() {
    var limit = Error.stackTraceLimit, stack;
    try { Error.stackTraceLimit = 40; stack = String(new Error().stack || ''); }
    finally { Error.stackTraceLimit = limit; }
    var lines = stack.split('\\n').slice(1), keep = [], origin = location.origin + '/';
    for (var i = 0; i < lines.length && keep.length < 3; i++) {
      var l = lines[i].trim();
      if (l.indexOf(origin) === -1 || l.indexOf(origin + '__harness') !== -1) continue;
      if (/three(\\.min)?\\.js|react(-dom)?\\.(production|development)/.test(l)) continue;
      keep.push(l.replace(/^at /, '').split(origin).join(''));
    }
    return keep;
  }
  proto.getContext = function (type) {
    var ctx = origGetContext.apply(this, arguments);
    if (ctx && GL_TYPES[type] && !byCanvas.has(this)) {
      var made = creator();
      var rec = { id: ++seq, canvas: this, ctx: ctx, type: String(type), mount: R.mount,
        createdAt: now(), draws: 0, lastDrawAt: null, lostAt: null, lostBy: null,
        restored: 0, renders: 0, scene: null, creator: made,
        createdBy: made.length ? 'page' : 'test' };
      byCanvas.set(this, rec); byCtx.set(ctx, rec); records.push(rec);
      this.addEventListener('webglcontextlost', function () {
        if (!rec.lostAt) { rec.lostAt = now(); rec.lostBy = rec.lostBy || 'browser'; }
      });
      this.addEventListener('webglcontextrestored', function () {
        rec.restored++; rec.lostAt = null; rec.lostBy = null;
      });
    }
    return ctx;
  };
  // Draw calls per context: a scene that only clears issues none.
  function countDraws(C, names) {
    if (!C) return;
    names.forEach(function (n) {
      var orig = C.prototype[n];
      if (typeof orig !== 'function') return;
      C.prototype[n] = function () {
        var rec = byCtx.get(this);
        if (rec) { rec.draws++; rec.lastDrawAt = performance.now(); }
        return orig.apply(this, arguments);
      };
    });
  }
  countDraws(window.WebGLRenderingContext, ['drawArrays', 'drawElements']);
  countDraws(window.WebGL2RenderingContext, ['drawArrays', 'drawElements',
    'drawArraysInstanced', 'drawElementsInstanced', 'drawRangeElements']);
  // Attribute deliberate losses (three's forceContextLoss goes through this extension).
  function watchLoss(C) {
    if (!C) return;
    var orig = C.prototype.getExtension;
    C.prototype.getExtension = function (name) {
      var ext = orig.apply(this, arguments);
      if (ext && /^WEBGL_lose_context$/i.test(String(name)) && !ext.__glRecorded) {
        var g = this, lose = ext.loseContext;
        ext.loseContext = function () {
          var rec = byCtx.get(g);
          if (rec && !rec.lostAt) { rec.lostAt = now(); rec.lostBy = R.releasing ? 'harness' : 'page'; }
          return lose.apply(this, arguments);
        };
        try { Object.defineProperty(ext, '__glRecorded', { value: true }); } catch (e) {}
      }
      return ext;
    };
  }
  watchLoss(window.WebGLRenderingContext);
  watchLoss(window.WebGL2RenderingContext);
})();
`;

/**
 * Runs right after three.min.js: tags each THREE.WebGLRenderer's context record with
 * the scene it last rendered, so a spec can count meshes without tool cooperation.
 * A Proxy keeps instanceof, statics and subclassing intact.
 */
const THREE_CENSUS = `
(function () {
  var T = window.THREE, R = window.__glRecorder;
  if (!T || !T.WebGLRenderer || !R || T.WebGLRenderer.__glRecorded) return;
  var Orig = T.WebGLRenderer;
  var P = new Proxy(Orig, {
    construct: function (target, args, newTarget) {
      var r = Reflect.construct(target, args, newTarget);
      try {
        var rec = R.forCanvas(r.domElement), render = r.render;
        if (rec && typeof render === 'function') {
          r.render = function (scene, camera) {
            rec.renders++;
            // EffectComposer passes render a bare full-screen quad; keep the real scene.
            if (scene && scene.isScene) rec.scene = scene;
            return render.apply(this, arguments);
          };
        }
      } catch (e) {}
      return r;
    },
    get: function (target, key, receiver) {
      if (key === '__glRecorded') return true;
      return Reflect.get(target, key, receiver);
    }
  });
  T.WebGLRenderer = P;
})();
`;

function harnessHtml(o: HarnessOptions, appCss: string | null, substitutes: string[]): string {
  const dependencies = ['beehive', 'butterfly'].includes(o.toolId) ? ['stem_lab/stem_sim_meadow.js'] : [];
  const extra = dependencies.concat(o.extraScripts || []).map((s) => '<script src="/' + s + '"></script>').join('\n');
  const pre = (o.preScripts || []).map((s) => '<script src="/' + s + '"></script>').join('\n');
  // Before the inline block below, so the harness's own sizing still wins.
  const styles = appCss ? `<link rel="stylesheet" href="/${appCss}">` : '';
  const wrapCss = o.layout === 'document'
    ? `#wrap{width:${o.width || 900}px;min-height:${o.height || 600}px;position:relative;display:block}`
    : `#wrap{width:${o.width || 900}px;height:${o.height || 600}px;position:relative;display:flex}`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${o.toolId} harness</title>
<script>${GL_RECORDER}</script>
${styles}
<style>html,body{margin:0;height:100%;background:#0f172a}
${wrapCss}</style></head>
<body><div id="wrap"></div>
<script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script>
<script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script>
<script src="/vendor/three-r128/three.min.js"></script>
<script>${THREE_CENSUS}</script>
<script>
  window.__events = { toasts: [], errors: [] };
  window.addEventListener('error', function (e) { window.__events.errors.push(String(e.message)); });
  // Kept apart from __events so specs that compare __events wholesale are unaffected.
  window.__harnessNotes = { ensureThree: [], substitutes: ${JSON.stringify(substitutes)} };
</script>
${pre}
<script>
  // Fill in only what is missing. When preScripts loaded the real host this
  // keeps its registry and its extras (makeBayViewer); with no preScripts it
  // behaves exactly as the original minimal stub did.
  window.StemLab = window.StemLab || { _registry: {}, _order: [] };
  if (!window.StemLab._registry) window.StemLab._registry = {};
  if (!window.StemLab.registerTool) {
    window.StemLab.registerTool = function (id, cfg) { cfg.id = id; this._registry[id] = cfg; };
  }
  if (!window.StemLab.isRegistered) {
    window.StemLab.isRegistered = function (id) { return !!this._registry[id]; };
  }
  if (!window.StemLab.getRegisteredTools) {
    window.StemLab.getRegisteredTools = function () { var s = this; return Object.keys(s._registry).map(function (k) { return s._registry[k]; }); };
  }
  // Always overridden, host or not: the harness guarantees no network, and
  // three.js is already on the page.
  window.StemLab.loadScriptResilient = function () { return new Promise(function () {}); };
  // The real ensureThree loads OrbitControls when asked ({orbit:true}); this stub
  // does not, so a tool that needs it silently skips its 3D (molecule did, for
  // months). Every request is noted so a spec can assert it was satisfied —
  // load vendor/three-r128/OrbitControls.js through extraScripts.
  window.StemLab.ensureThree = function (opts) {
    try {
      window.__harnessNotes.ensureThree.push({
        orbit: !!(opts && opts.orbit === true),
        orbitRequired: !!(opts && opts.orbitRequired),
        orbitPresent: !!(window.THREE && window.THREE.OrbitControls)
      });
    } catch (noteError) {}
    return Promise.resolve(window.THREE);
  };
  // releaseGl was MISSING, and its absence was invisible: every tool guards the
  // call with an if (window.StemLab && window.StemLab.releaseGl) guard, so the
  // release path silently no-opped under test while running for real in the
  // app. 19 stem_lab tools call it. Without this, a spec cannot tell a tool
  // that frees its GL context from one that leaks every context it opens —
  // and Chromium caps live contexts per process, so leaks matter.
  //
  // Mirrors the host implementation in stem_lab_module.js: defer a tick, skip
  // canvases still in the document (a React re-render keeps the canvas), then
  // force the loss.
  window.StemLab.releaseGl = function (renderer) {
    try {
      var canvas = renderer && renderer.domElement;
      if (!canvas || typeof renderer.forceContextLoss !== 'function') return;
      window.setTimeout(function () {
        if (canvas.isConnected) return;
        try { renderer.forceContextLoss(); } catch (lossError) {}
      }, 0);
    } catch (releaseError) {}
  };
</script>
${extra}
<script src="/${o.toolFile}"></script>
<script>
  var e = React.createElement;
  window.__mount = function (toolData) {
    var cfg = window.StemLab._registry[${JSON.stringify(o.toolId)}];
    if (!cfg) return false;
    // Contexts created from here on belong to this mount.
    window.__glRecorder.mount++;
    var data = Object.assign({ _threeLoaded: true }, toolData || {});
    window.__toolData = data;
    var bump = null;
    // Two state channels exist across these tools and a harness has to serve both:
    // most read ctx.toolData + ctx.update/updateMulti, but some (galaxy) read
    // ctx.labToolData + ctx.setLabToolData. Backing them with the SAME object means
    // a spec can seed or read state without caring which the tool happens to use.
    var applyFn = function (fnOrVal) {
      var next = typeof fnOrVal === 'function' ? fnOrVal(data) : fnOrVal;
      if (next && next !== data) { Object.keys(next).forEach(function (k) { data[k] = next[k]; }); }
      if (bump) bump();
    };
    var ctx = {
      React: React,
      toolData: data,
      labToolData: data,
      update: function (b, k, v) { data[b] = Object.assign({}, data[b]); data[b][k] = v; if (bump) bump(); },
      updateMulti: function (b, patch) { data[b] = Object.assign({}, data[b], patch); if (bump) bump(); },
      setToolData: applyFn,
      setLabToolData: applyFn,
      setStemLabTool: function () {}, setStemLabTab: function () {},
      addToast: function (m, k) { window.__events.toasts.push({ message: String(m), kind: k }); },
      awardXP: function () {}, getXP: function () { return 0; },
      announceToSR: function () {}, celebrate: function () {}, beep: function () {},
      canvasNarrate: function () {}, saveSnapshot: function () {},
      callGemini: null, callTTS: null, callImagen: null, callGeminiVision: null,
      gradeLevel: '5th Grade', gradeBand: 'g68', toolSnapshots: [], props: {},
      stemLabTab: 'explore', stemLabTool: null,
      t: function (k, fb) { return fb || k; },
      icons: new Proxy({}, { get: function () { return function () { return e('span'); }; } }),
      a11yClick: function (fn) { return { onClick: fn, role: 'button', tabIndex: 0 }; },
      canvasA11yDesc: function (d) { return { role: 'img', 'aria-label': d }; },
      srOnly: {}, pal: new Proxy({}, { get: function () { return '#888888'; } }),
      isDark: false, isContrast: false, theme: 'default',
      activeSessionCode: null, studentNickname: 'Tester', isTeacherMode: false,
      gridRange: { min: -10, max: 10 }
    };
    window.__ctx = ctx;
    function Comp() {
      var st = React.useState(0);
      bump = function () { st[1](function (n) { return n + 1; }); };
      return cfg.render(ctx);
    }
    window.__rerender = function () { if (bump) bump(); };
    window.__root = ReactDOM.createRoot(document.getElementById('wrap'));
    window.__root.render(e(Comp));
    return true;
  };

  // Unmount the tool and nothing else, so a spec can see what the TOOL releases.
  // First note what is the tool's to release: every live context made during this
  // mount OR on a canvas inside #wrap. The second half matters: a viewer built at
  // module load, before any mount, would otherwise slip past a leak check.
  window.__unmount = function () {
    var R = window.__glRecorder, wrap = document.getElementById('wrap');
    R.watch = R.records.filter(function (r) {
      var lost = true;
      try { lost = r.ctx.isContextLost(); } catch (err) {}
      return !lost && (r.mount === R.mount || !!(wrap && wrap.contains(r.canvas)));
    }).map(function (r) { return r.id; });
    try { if (window.__root) window.__root.unmount(); } catch (err) {}
  };

  window.__destroy = function () {
    window.__unmount();
    // Unmounting disposes the renderer, but three.js does not reliably hand the GL
    // context back straight away. Chromium caps live contexts per PROCESS and
    // silently kills the oldest past the limit, so across several GL specs in one
    // run the earliest suite starts failing for reasons that have nothing to do with
    // it. Releasing explicitly makes multi-suite runs deterministic.
    //
    // From the recorder, not from the DOM: React has already removed the canvases by
    // now, and calling getContext on whatever is left CREATED contexts, never freed one.
    var R = window.__glRecorder;
    R.releasing = true;
    try {
      R.records.forEach(function (rec) {
        try {
          if (rec.ctx.isContextLost()) return;
          var ext = rec.ctx.getExtension('WEBGL_lose_context');
          if (ext) ext.loseContext();
        } catch (err) {}
      });
    } finally { R.releasing = false; }
  };

  // The recorded GL context for a canvas, or null. Never creates one.
  window.__glRecord = function (canvas) { return window.__glRecorder.forCanvas(canvas); };

  // The WebGL canvas, chosen by the page having created a GL context on it rather
  // than by position — several of these tools also mount 2D canvases (charts,
  // minimaps), and picking the last one found a 2D canvas and reported nonsense.
  // First in DOM order, exactly as before; only the lookup changed.
  window.__glCanvas = function (sel) {
    var cs = document.querySelectorAll((sel || '#wrap') + ' canvas');
    for (var i = 0; i < cs.length; i++) {
      var rec = window.__glRecorder.forCanvas(cs[i]);
      if (rec) return { el: cs[i], gl: rec.ctx, rec: rec };
    }
    return null;
  };

  window.__glLive = function (sel) {
    var cs = document.querySelectorAll((sel || '#wrap') + ' canvas');
    var hit = window.__glCanvas(sel);
    if (!hit) return null;
    var c = hit.el, p = c.parentElement;
    var cr = c.getBoundingClientRect();
    var pr = p ? p.getBoundingClientRect() : cr;
    return {
      canvasCount: cs.length,
      lost: hit.gl.isContextLost(),
      w: c.clientWidth, h: c.clientHeight,
      // Measured against its OWN parent: the harness box is arbitrary, so a canvas
      // legitimately larger than it is not evidence of anything.
      box: { w: Math.round(cr.width), h: Math.round(cr.height) },
      parentBox: { w: Math.round(pr.width), h: Math.round(pr.height) },
      attr: { w: c.width, h: c.height }
    };
  };

  // Every GL context the page created, serialisable. Pass a mount number to keep
  // only that mount's contexts (window.__glRecorder.mount is the current one).
  window.__glContexts = function (mount) {
    var wrap = document.getElementById('wrap');
    return window.__glRecorder.records.filter(function (r) {
      return mount === undefined || r.mount === mount;
    }).map(function (r) {
      var lost = true;
      try { lost = r.ctx.isContextLost(); } catch (err) {}
      return {
        id: r.id, type: r.type, mount: r.mount, createdBy: r.createdBy,
        lost: lost, lostBy: lost ? (r.lostBy || 'browser') : null,
        draws: r.draws, renders: r.renders,
        lastDrawAgoMs: r.lastDrawAt === null ? null : Math.round(performance.now() - r.lastDrawAt),
        connected: r.canvas.isConnected,
        inWrap: !!(wrap && wrap.contains(r.canvas)), width: r.canvas.width, height: r.canvas.height,
        creator: r.creator.slice()
      };
    });
  };

  // The contexts __unmount noted as the tool's to release; null if it never ran.
  window.__glWatched = function () {
    var ids = window.__glRecorder.watch;
    if (!ids) return null;
    return window.__glContexts().filter(function (c) { return ids.indexOf(c.id) !== -1; });
  };

  // What three.js last rendered on the GL canvas: mesh counts without tool help.
  window.__glScene = function (sel) {
    var hit = window.__glCanvas(sel);
    if (!hit) return null;
    var rec = hit.rec, s = rec.scene;
    var out = { renders: rec.renders, draws: rec.draws, hasScene: !!s, objects: 0, meshes: 0,
      visibleMeshes: 0, lines: 0, points: 0, sprites: 0, lights: 0 };
    if (!s || !s.traverse) return out;
    s.traverse(function (o) {
      out.objects++;
      if (o.isMesh) out.meshes++;
      else if (o.isLine) out.lines++;
      else if (o.isPoints) out.points++;
      else if (o.isSprite) out.sprites++;
      else if (o.isLight) out.lights++;
    });
    if (s.traverseVisible) s.traverseVisible(function (o) { if (o.isMesh) out.visibleMeshes++; });
    return out;
  };

  ${o.probes || ''}
</script></body></html>`;
}

/**
 * A surface nothing drew on: one colour covers (almost) all of it. Measured, not
 * byte-compared (trap 5); the thresholds are calibrated in 22b-stem-gl-harness-selftest
 * and against every conformance row (see that spec's header for the numbers).
 */
export const BLANK_DOMINANT_SHARE = 0.995;
export function looksBlank(s: PixelStats): boolean {
  return s.dominantShare >= BLANK_DOMINANT_SHARE || s.significantColors < 2;
}

/** A GL canvas's own pixels, with overlays hidden and its CSS background flattened. */
const PIXELS_ONLY_STYLE = `
  body * { visibility: hidden !important; }
  [data-gl-pixels-under-test] {
    visibility: visible !important;
    background: #ff00ff !important;
    background-image: none !important;
  }
`;

export class GlHarness {
  private server: Server | null = null;
  private base = '';
  constructor(private opts: HarnessOptions) {}

  /** Call in test.beforeAll. */
  async start(): Promise<void> {
    // Resolved once per run. Asking for app styles and silently not getting them
    // would make a colour-contrast pass meaningless, so an absent bundle is an error.
    let appCss: string | null = null;
    if (this.opts.appStyles) {
      appCss = findAppStylesheet();
      if (!appCss) {
        throw new Error(
          'appStyles was requested but no app/static/css/main.*.css exists in the tree. '
          + 'Build the web app first, or drop appStyles for this spec.');
      }
    }
    const substitutes = parseSubstitutes(process.env.STEM_GL_SUBSTITUTE);
    for (const [rel, file] of substitutes) {
      // eslint-disable-next-line no-console
      console.warn(`[stem_gl_harness] STEM_GL_SUBSTITUTE is serving ${file} in place of ${rel}`);
    }
    const html = harnessHtml(this.opts, appCss, [...substitutes.keys()]);
    this.server = createServer(async (req, res) => {
      const url = (req.url || '/').split('?')[0];
      if (url === '/__harness') {
        res.writeHead(200, { 'content-type': MIME['.html'] });
        res.end(html);
        return;
      }
      try {
        // Serve the working tree, refusing to climb out of it.
        const rel = normalize(decodeURIComponent(url)).replace(/^([/\\])+/, '');
        const sub = substitutes.get(rel.replace(/\\/g, '/'));
        const file = sub || join(ROOT, rel);
        if (!sub && !file.startsWith(ROOT)) { res.writeHead(403); res.end('no'); return; }
        const body = await readFile(file);
        res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
        res.end(body);
      } catch {
        res.writeHead(404);
        res.end('not found');
      }
    });
    await new Promise<void>((r) => this.server!.listen(0, '127.0.0.1', r));
    const addr = this.server.address();
    this.base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
  }

  /** Harness URL, for throwaway probes that drive the page directly. */
  get url(): string { return this.base; }

  /** Call in test.afterAll. */
  async stop(): Promise<void> {
    if (this.server) await new Promise<void>((r) => this.server!.close(() => r()));
    this.server = null;
  }

  /**
   * Navigate, mount the tool, and wait for a canvas.
   * `readyExpr` is an in-page boolean expression polled after the canvas appears —
   * use it to wait for the tool's own engine global.
   */
  async mount(
    page: Page,
    toolData: Record<string, unknown> = {},
    readyExpr?: string,
    // Some views legitimately have no 3D surface (a tool's first phase, a 2D tab).
    // Waiting for a canvas there just times out and reads like a failure.
    opts: { expectCanvas?: boolean } = {},
  ): Promise<void> {
    const expectCanvas = opts.expectCanvas !== false;
    await page.goto(`${this.base}/__harness`);
    await page.waitForFunction(
      (id) => !!(window as any).StemLab?._registry?.[id], this.opts.toolId, { timeout: 30000 });
    await page.evaluate((d) => (window as any).__mount(d), toolData);
    if (!expectCanvas) { await page.waitForTimeout(900); return; }
    try {
      // ANY visible canvas. waitForSelector('#wrap canvas') judged only the FIRST
      // match, so a tool whose first canvas is a hidden 0x0 helper timed out beside
      // a visible 1275x570 scene (solarSystem rover view, 2026-09-22).
      await page.waitForFunction(() => [...document.querySelectorAll('#wrap canvas')].some((c) => {
        const b = c.getBoundingClientRect();
        return b.width > 0 && b.height > 0 && getComputedStyle(c).visibility !== 'hidden';
      }), null, { timeout: 30000 });
    } catch (err) {
      // "Timeout exceeded" alone sent the last triage down the wrong path: the
      // canvases existed, they were 0px wide, and the wait is for a VISIBLE one.
      const seen = await page.evaluate(() => [...document.querySelectorAll('#wrap canvas')]
        .map((c) => { const b = c.getBoundingClientRect(); return `${Math.round(b.width)}x${Math.round(b.height)}`; }))
        .catch(() => [] as string[]);
      throw new Error(`${this.opts.toolId}: no VISIBLE canvas in #wrap after 30s `
        + `(canvases present, CSS px: [${seen.join(', ') || 'none'}]). If every one is 0px wide, `
        + `the tool root may have collapsed inside the flex #wrap; try layout: 'document'.\n${(err as Error).message}`);
    }
    // Wait for a GL context that is actually usable. A canvas exists in the DOM
    // before three.js has finished with it, and probing too early reports the
    // context as lost — which reads exactly like a real failure.
    await page.waitForFunction(() => {
      const h = (window as any).__glCanvas();
      return !!h && !h.gl.isContextLost();
    }, null, { timeout: 30000 }).catch(() => { /* leave it to the assertions */ });
    if (readyExpr) {
      await page.waitForFunction(`(function(){ return !!(${readyExpr}); })()`, null, { timeout: 30000 });
    }
    await page.waitForTimeout(700); // let three.js settle a few frames
  }

  /** Tear the scene down — see trap 1. Safe to call when nothing is mounted. */
  async destroy(page: Page): Promise<void> {
    await page.evaluate(() => { try { (window as any).__destroy(); } catch { /* already gone */ } }).catch(() => {});
  }

  /**
   * Unmount the tool WITHOUT the harness's own GL cleanup, so what is still live
   * afterwards is what the tool left behind. Follow with destroy() (afterEach does).
   */
  async unmount(page: Page): Promise<void> {
    await page.evaluate(() => (window as any).__unmount());
  }

  /** Every GL context the page created (optionally only those of one mount). */
  async glContexts(page: Page, mount?: number): Promise<GlContextRecord[]> {
    return page.evaluate((m) => (window as any).__glContexts(m), mount);
  }

  /** The current __mount() generation, for glContexts(page, mount). */
  async currentMount(page: Page): Promise<number> {
    return page.evaluate(() => (window as any).__glRecorder.mount);
  }

  /** Mesh census of what three.js last drew on the GL canvas; null if there is none. */
  async glScene(page: Page, sel?: string): Promise<GlSceneCensus | null> {
    return page.evaluate((s) => (window as any).__glScene(s), sel);
  }

  /**
   * After unmount(): wait (up to timeoutMs) for every context the tool was responsible
   * for to be lost, and return the ones still live. unmount() notes them: live contexts
   * made during this mount OR sitting in #wrap, so a renderer built before the mount
   * cannot slip past. Tools release on a deferred tick (StemLab.releaseGl uses
   * setTimeout 0), so an immediate read is too early.
   */
  async leakedAfterUnmount(page: Page, timeoutMs = 5000): Promise<GlContextRecord[]> {
    const deadline = Date.now() + timeoutMs;
    let live: GlContextRecord[] = [];
    for (;;) {
      const watched: GlContextRecord[] | null = await page.evaluate(() => (window as any).__glWatched());
      // Without the note this would return [] and pass every tool: refuse instead.
      if (!watched) throw new Error('leakedAfterUnmount: call harness.unmount(page) first');
      live = watched.filter((c) => !c.lost);
      if (!live.length || Date.now() > deadline) return live;
      await page.waitForTimeout(100);
    }
  }

  /**
   * Photograph the GL canvas's OWN pixels and summarise them (see trap 4). Every other
   * element is hidden and the canvas's CSS background is forced to flat magenta for the
   * shot, so a canvas with no GL content comes out as one flat colour. Returns null if
   * the page has no recorded GL canvas under `sel`.
   */
  async glPixels(page: Page, sel?: string): Promise<(PixelStats & { png: Buffer }) | null> {
    const tagged = await page.evaluate((s) => {
      document.querySelectorAll('[data-gl-pixels-under-test]')
        .forEach((n) => n.removeAttribute('data-gl-pixels-under-test'));
      const hit = (window as any).__glCanvas(s);
      if (!hit) return false;
      hit.el.setAttribute('data-gl-pixels-under-test', '1');
      return true;
    }, sel);
    if (!tagged) return null;
    const png = await page.locator('[data-gl-pixels-under-test]').screenshot({
      timeout: 60000, style: PIXELS_ONLY_STYLE,
    });
    return { ...pixelStats(readPng(png)), png };
  }
}
