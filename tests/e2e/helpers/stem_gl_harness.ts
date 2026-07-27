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
 *
 * TRAPS, both learned the hard way:
 *   1. Always tear the scene down in afterEach. Chromium caps live WebGL contexts per
 *      process and silently kills the oldest; the symptom is not an error but the
 *      whole suite running ~4x slower with random timeouts.
 *   2. Raise the timeout. SwiftShader pixel readback is slow ("GPU stall due to
 *      ReadPixels"); a mount plus two screenshots does not fit in the default 30s.
 *      Use test.describe.configure({ timeout: 150_000 }).
 *   3. Never run two Playwright suites at once on this machine — 2 min becomes 17.
 */
import { createServer, Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import type { Page } from '@playwright/test';

const ROOT = process.cwd();
const MIME: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
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
  /** Injected verbatim into the page after mount helpers — define your own probes. */
  probes?: string;
}

function harnessHtml(o: HarnessOptions): string {
  const extra = (o.extraScripts || []).map((s) => '<script src="/' + s + '"></script>').join('\n');
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${o.toolId} harness</title>
<style>html,body{margin:0;height:100%;background:#0f172a}
#wrap{width:${o.width || 900}px;height:${o.height || 600}px;position:relative;display:flex}</style></head>
<body><div id="wrap"></div>
<script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script>
<script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script>
<script src="/vendor/three-r128/three.min.js"></script>
<script>
  window.__events = { toasts: [], errors: [] };
  window.addEventListener('error', function (e) { window.__events.errors.push(String(e.message)); });
  window.StemLab = {
    _registry: {},
    registerTool: function (id, cfg) { cfg.id = id; this._registry[id] = cfg; },
    isRegistered: function (id) { return !!this._registry[id]; },
    loadScriptResilient: function () { return new Promise(function () {}); },
    ensureThree: function () { return Promise.resolve(window.THREE); },
    getRegisteredTools: function () { var s = this; return Object.keys(s._registry).map(function (k) { return s._registry[k]; }); }
  };
</script>
${extra}
<script src="/${o.toolFile}"></script>
<script>
  var e = React.createElement;
  window.__mount = function (toolData) {
    var cfg = window.StemLab._registry[${JSON.stringify(o.toolId)}];
    if (!cfg) return false;
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

  window.__destroy = function () {
    try { if (window.__root) window.__root.unmount(); } catch (err) {}
    // Unmounting disposes the renderer, but three.js does not reliably hand the GL
    // context back straight away. Chromium caps live contexts per PROCESS and
    // silently kills the oldest past the limit, so across several GL specs in one
    // run the earliest suite starts failing for reasons that have nothing to do with
    // it. Releasing explicitly makes multi-suite runs deterministic.
    try {
      var cs = document.querySelectorAll('canvas');
      for (var i = 0; i < cs.length; i++) {
        var g = null;
        try { g = cs[i].getContext('webgl2') || cs[i].getContext('webgl'); } catch (e) {}
        if (!g || g.isContextLost()) continue;
        var ext = g.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
      }
    } catch (err) {}
  };

  // The WebGL canvas, chosen by actually having a GL context rather than by
  // position — several of these tools also mount 2D canvases (charts, minimaps),
  // and picking the last one found a 2D canvas and reported nonsense.
  window.__glCanvas = function (sel) {
    var cs = document.querySelectorAll((sel || '#wrap') + ' canvas');
    for (var i = 0; i < cs.length; i++) {
      try {
        var g = cs[i].getContext('webgl2') || cs[i].getContext('webgl');
        if (g) return { el: cs[i], gl: g };
      } catch (e) { /* a 2D canvas throws or returns null */ }
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

  ${o.probes || ''}
</script></body></html>`;
}

export class GlHarness {
  private server: Server | null = null;
  private base = '';
  constructor(private opts: HarnessOptions) {}

  /** Call in test.beforeAll. */
  async start(): Promise<void> {
    const html = harnessHtml(this.opts);
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
        const file = join(ROOT, rel);
        if (!file.startsWith(ROOT)) { res.writeHead(403); res.end('no'); return; }
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
    await page.waitForSelector('#wrap canvas', { timeout: 30000 });
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
}
