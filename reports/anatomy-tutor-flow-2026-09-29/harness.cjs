var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// tests/e2e/helpers/stem_gl_harness.ts
var stem_gl_harness_exports = {};
__export(stem_gl_harness_exports, {
  BLANK_DOMINANT_SHARE: () => BLANK_DOMINANT_SHARE,
  GlHarness: () => GlHarness,
  findAppStylesheet: () => findAppStylesheet,
  looksBlank: () => looksBlank,
  parseSubstitutes: () => parseSubstitutes
});
module.exports = __toCommonJS(stem_gl_harness_exports);
var import_node_http = require("node:http");
var import_promises = require("node:fs/promises");
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");

// tests/e2e/helpers/png_pixels.ts
var zlib = __toESM(require("zlib"));
function readPng(buf) {
  if (buf.readUInt32BE(0) !== 2303741511) throw new Error("not a PNG");
  let pos = 8;
  let width = 0, height = 0, depth = 0, colorType = 0, interlace = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      depth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    pos += 12 + len;
  }
  if (depth !== 8 || interlace !== 0 || colorType !== 2 && colorType !== 6) {
    throw new Error(`unsupported PNG: depth ${depth}, colorType ${colorType}, interlace ${interlace}`);
  }
  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const out = Buffer.alloc(height * stride);
  let rp = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[rp];
    rp += 1;
    const line = raw.subarray(rp, rp + stride);
    rp += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i += 1) {
      const a = i >= channels ? cur[i - channels] : 0;
      const b = prev ? prev[i] : 0;
      const c = prev && i >= channels ? prev[i - channels] : 0;
      let v = line[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += a + b >> 1;
      else if (filter === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      } else if (filter !== 0) throw new Error("bad PNG filter " + filter);
      cur[i] = v & 255;
    }
  }
  return {
    width,
    height,
    at(x, y) {
      const i = y * stride + x * channels;
      return [out[i], out[i + 1], out[i + 2]];
    }
  };
}
function pixelStats(p) {
  const counts = new Uint32Array(32768);
  for (let y = 0; y < p.height; y += 1) {
    for (let x = 0; x < p.width; x += 1) {
      const [r, g, b] = p.at(x, y);
      counts[r >> 3 << 10 | g >> 3 << 5 | b >> 3] += 1;
    }
  }
  const total = p.width * p.height || 1;
  let best = 0, distinct = 0, significant = 0;
  for (let k = 0; k < counts.length; k += 1) {
    if (!counts[k]) continue;
    distinct += 1;
    if (counts[k] >= total * 1e-3) significant += 1;
    if (counts[k] > counts[best]) best = k;
  }
  const centre = (v) => (v << 3) + 4;
  return {
    width: p.width,
    height: p.height,
    dominant: [centre(best >> 10 & 31), centre(best >> 5 & 31), centre(best & 31)],
    dominantShare: counts[best] / total,
    distinctColors: distinct,
    significantColors: significant
  };
}

// tests/e2e/helpers/stem_gl_harness.ts
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
function parseSubstitutes(raw) {
  const out = /* @__PURE__ */ new Map();
  for (const pair of (raw || "").split(";")) {
    const at = pair.indexOf("=");
    if (at <= 0) continue;
    const key = pair.slice(0, at).trim().replace(/\\/g, "/").replace(/^\/+/, "");
    const file = pair.slice(at + 1).trim();
    if (key && file) out.set(key, file);
  }
  return out;
}
var GL_RECORDER = `
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
var THREE_CENSUS = `
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
function harnessHtml(o, appCss, substitutes) {
  const dependencies = ["beehive", "butterfly"].includes(o.toolId) ? ["stem_lab/stem_sim_meadow.js"] : [];
  const extra = dependencies.concat(o.extraScripts || []).map((s) => '<script src="/' + s + '"></script>').join("\n");
  const pre = (o.preScripts || []).map((s) => '<script src="/' + s + '"></script>').join("\n");
  const styles = appCss ? `<link rel="stylesheet" href="/${appCss}">` : "";
  const wrapCss = o.layout === "document" ? `#wrap{width:${o.width || 900}px;min-height:${o.height || 600}px;position:relative;display:block}` : `#wrap{width:${o.width || 900}px;height:${o.height || 600}px;position:relative;display:flex}`;
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
  // months). Every request is noted so a spec can assert it was satisfied \u2014
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
  // that frees its GL context from one that leaks every context it opens \u2014
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
  // than by position \u2014 several of these tools also mount 2D canvases (charts,
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

  ${o.probes || ""}
</script></body></html>`;
}
var BLANK_DOMINANT_SHARE = 0.995;
function looksBlank(s) {
  return s.dominantShare >= BLANK_DOMINANT_SHARE || s.significantColors < 2;
}
var PIXELS_ONLY_STYLE = `
  body * { visibility: hidden !important; }
  [data-gl-pixels-under-test] {
    visibility: visible !important;
    background: #ff00ff !important;
    background-image: none !important;
  }
`;
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
    const substitutes = parseSubstitutes(process.env.STEM_GL_SUBSTITUTE);
    for (const [rel, file] of substitutes) {
      console.warn(`[stem_gl_harness] STEM_GL_SUBSTITUTE is serving ${file} in place of ${rel}`);
    }
    const html = harnessHtml(this.opts, appCss, [...substitutes.keys()]);
    this.server = (0, import_node_http.createServer)(async (req, res) => {
      const url = (req.url || "/").split("?")[0];
      if (url === "/__harness") {
        res.writeHead(200, { "content-type": MIME[".html"] });
        res.end(html);
        return;
      }
      try {
        const rel = (0, import_node_path.normalize)(decodeURIComponent(url)).replace(/^([/\\])+/, "");
        const sub = substitutes.get(rel.replace(/\\/g, "/"));
        const file = sub || (0, import_node_path.join)(ROOT, rel);
        if (!sub && !file.startsWith(ROOT)) {
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
    try {
      await page.waitForFunction(() => [...document.querySelectorAll("#wrap canvas")].some((c) => {
        const b = c.getBoundingClientRect();
        return b.width > 0 && b.height > 0 && getComputedStyle(c).visibility !== "hidden";
      }), null, { timeout: 3e4 });
    } catch (err) {
      const seen = await page.evaluate(() => [...document.querySelectorAll("#wrap canvas")].map((c) => {
        const b = c.getBoundingClientRect();
        return `${Math.round(b.width)}x${Math.round(b.height)}`;
      })).catch(() => []);
      throw new Error(`${this.opts.toolId}: no VISIBLE canvas in #wrap after 30s (canvases present, CSS px: [${seen.join(", ") || "none"}]). If every one is 0px wide, the tool root may have collapsed inside the flex #wrap; try layout: 'document'.
${err.message}`);
    }
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
  /**
   * Unmount the tool WITHOUT the harness's own GL cleanup, so what is still live
   * afterwards is what the tool left behind. Follow with destroy() (afterEach does).
   */
  async unmount(page) {
    await page.evaluate(() => window.__unmount());
  }
  /** Every GL context the page created (optionally only those of one mount). */
  async glContexts(page, mount) {
    return page.evaluate((m) => window.__glContexts(m), mount);
  }
  /** The current __mount() generation, for glContexts(page, mount). */
  async currentMount(page) {
    return page.evaluate(() => window.__glRecorder.mount);
  }
  /** Mesh census of what three.js last drew on the GL canvas; null if there is none. */
  async glScene(page, sel) {
    return page.evaluate((s) => window.__glScene(s), sel);
  }
  /**
   * After unmount(): wait (up to timeoutMs) for every context the tool was responsible
   * for to be lost, and return the ones still live. unmount() notes them: live contexts
   * made during this mount OR sitting in #wrap, so a renderer built before the mount
   * cannot slip past. Tools release on a deferred tick (StemLab.releaseGl uses
   * setTimeout 0), so an immediate read is too early.
   */
  async leakedAfterUnmount(page, timeoutMs = 5e3) {
    const deadline = Date.now() + timeoutMs;
    let live = [];
    for (; ; ) {
      const watched = await page.evaluate(() => window.__glWatched());
      if (!watched) throw new Error("leakedAfterUnmount: call harness.unmount(page) first");
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
  async glPixels(page, sel) {
    const tagged = await page.evaluate((s) => {
      document.querySelectorAll("[data-gl-pixels-under-test]").forEach((n) => n.removeAttribute("data-gl-pixels-under-test"));
      const hit = window.__glCanvas(s);
      if (!hit) return false;
      hit.el.setAttribute("data-gl-pixels-under-test", "1");
      return true;
    }, sel);
    if (!tagged) return null;
    const png = await page.locator("[data-gl-pixels-under-test]").screenshot({
      timeout: 6e4,
      style: PIXELS_ONLY_STYLE
    });
    return { ...pixelStats(readPng(png)), png };
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BLANK_DOMINANT_SHARE,
  GlHarness,
  findAppStylesheet,
  looksBlank,
  parseSubstitutes
});
