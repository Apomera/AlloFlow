var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// tests/e2e/helpers/stem_gl_harness.ts
var stem_gl_harness_exports = {};
__export(stem_gl_harness_exports, {
  GlHarness: () => GlHarness,
  findAppStylesheet: () => findAppStylesheet
});
module.exports = __toCommonJS(stem_gl_harness_exports);
var import_node_http = require("node:http");
var import_promises = require("node:fs/promises");
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");
var ROOT = process.cwd();
var MIME = {
  ".js": "text/javascript; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  // Without this the stylesheet is served as octet-stream and Chromium refuses it.
  ".css": "text/css; charset=utf-8",
  ".wasm": "application/wasm"
};
function findAppStylesheet() {
  for (const dir of ["app/static/css", "desktop/web-app/public/app/static/css"]) {
    let names = [];
    try {
      names = (0, import_node_fs.readdirSync)((0, import_node_path.join)(ROOT, dir));
    } catch {
      continue;
    }
    const hit = names.filter((n) => /^main\..*\.css$/.test(n)).sort()[0];
    if (hit) return dir + "/" + hit;
  }
  return null;
}
function harnessHtml(o, appCss) {
  const extra = (o.extraScripts || []).map((s) => '<script src="/' + s + '"></script>').join("\n");
  const pre = (o.preScripts || []).map((s) => '<script src="/' + s + '"></script>').join("\n");
  const styles = appCss ? `<link rel="stylesheet" href="/${appCss}">` : "";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${o.toolId} harness</title>
${styles}
<style>html,body{margin:0;height:100%;background:#0f172a}
#wrap{width:${o.width || 900}px;height:${o.height || 600}px;position:relative;display:flex}</style></head>
<body><div id="wrap"></div>
<script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script>
<script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script>
<script src="/vendor/three-r128/three.min.js"></script>
<script>
  window.__events = { toasts: [], errors: [] };
  window.addEventListener('error', function (e) { window.__events.errors.push(String(e.message)); });
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
  window.StemLab.ensureThree = function () { return Promise.resolve(window.THREE); };
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
  // position \u2014 several of these tools also mount 2D canvases (charts, minimaps),
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

  ${o.probes || ""}
</script></body></html>`;
}
var GlHarness = class {
  constructor(opts) {
    this.opts = opts;
  }
  opts;
  server = null;
  base = "";
  /** Call in test.beforeAll. */
  async start() {
    let appCss = null;
    if (this.opts.appStyles) {
      appCss = findAppStylesheet();
      if (!appCss) {
        throw new Error(
          "appStyles was requested but no app/static/css/main.*.css exists in the tree. Build the web app first, or drop appStyles for this spec."
        );
      }
    }
    const html = harnessHtml(this.opts, appCss);
    this.server = (0, import_node_http.createServer)(async (req, res) => {
      const url = (req.url || "/").split("?")[0];
      if (url === "/__harness") {
        res.writeHead(200, { "content-type": MIME[".html"] });
        res.end(html);
        return;
      }
      try {
        const rel = (0, import_node_path.normalize)(decodeURIComponent(url)).replace(/^([/\\])+/, "");
        const file = (0, import_node_path.join)(ROOT, rel);
        if (!file.startsWith(ROOT)) {
          res.writeHead(403);
          res.end("no");
          return;
        }
        const body = await (0, import_promises.readFile)(file);
        res.writeHead(200, { "content-type": MIME[(0, import_node_path.extname)(file)] || "application/octet-stream" });
        res.end(body);
      } catch {
        res.writeHead(404);
        res.end("not found");
      }
    });
    await new Promise((r) => this.server.listen(0, "127.0.0.1", r));
    const addr = this.server.address();
    this.base = `http://127.0.0.1:${typeof addr === "object" && addr ? addr.port : 0}`;
  }
  /** Harness URL, for throwaway probes that drive the page directly. */
  get url() {
    return this.base;
  }
  /** Call in test.afterAll. */
  async stop() {
    if (this.server) await new Promise((r) => this.server.close(() => r()));
    this.server = null;
  }
  /**
   * Navigate, mount the tool, and wait for a canvas.
   * `readyExpr` is an in-page boolean expression polled after the canvas appears —
   * use it to wait for the tool's own engine global.
   */
  async mount(page, toolData = {}, readyExpr, opts = {}) {
    const expectCanvas = opts.expectCanvas !== false;
    await page.goto(`${this.base}/__harness`);
    await page.waitForFunction(
      (id) => !!window.StemLab?._registry?.[id],
      this.opts.toolId,
      { timeout: 3e4 }
    );
    await page.evaluate((d) => window.__mount(d), toolData);
    if (!expectCanvas) {
      await page.waitForTimeout(900);
      return;
    }
    await page.waitForSelector("#wrap canvas", { timeout: 3e4 });
    await page.waitForFunction(() => {
      const h = window.__glCanvas();
      return !!h && !h.gl.isContextLost();
    }, null, { timeout: 3e4 }).catch(() => {
    });
    if (readyExpr) {
      await page.waitForFunction(`(function(){ return !!(${readyExpr}); })()`, null, { timeout: 3e4 });
    }
    await page.waitForTimeout(700);
  }
  /** Tear the scene down — see trap 1. Safe to call when nothing is mounted. */
  async destroy(page) {
    await page.evaluate(() => {
      try {
        window.__destroy();
      } catch {
      }
    }).catch(() => {
    });
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  GlHarness,
  findAppStylesheet
});
