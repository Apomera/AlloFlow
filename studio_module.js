// studio_module.js
// AlloStudio for AlloFlow — a Canva-style flyer / worksheet / poster studio whose
// exports are BORN ACCESSIBLE. Design doc: docs/studio_design.md (v0.2). This file
// is Milestone A: pure scene core + ledger + templates + accessible exports + the
// Tier-2 object editor (text / shape / image). No AI, no raster painting yet.
//
// Design laws implemented here (doc §4):
//   1. READING ORDER IS THE OBJECT ARRAY ORDER — the export emits objects in array
//      order, so what the author arranges in the "Reading order" panel IS the
//      screen-reader order and the PDF tag order. Never inferred at export time.
//   2. TEXT IS TEXT — no rasterized words. Exports emit real <h1>/<h2>/<p>.
//   3. ALT OR DECORATIVE — export is hard-gated until every image has alt text or
//      is explicitly marked decorative.
//
// Provenance ledger (doc §5): the document is EVENT-SOURCED. Every mutation is an
// op {seq, ts, actor, type, ...} where actor ∈ {user, ai, import} — a CLOSED set.
// AI ops enter only through our own API seams, so "student did X / AI did Y" is
// ground truth BY CONSTRUCTION, never detection. The honesty line below ships in
// the UI verbatim (scientific-integrity rule): this timeline shows what happened
// inside this editor; it does NOT detect AI content in imported images. Imports
// are labeled `import` because we cannot see inside a pasted image, and we say so.
// Checkpoints every 50 ops make replay/scrubbing seek-then-apply.
//
// FERPA: the whole document INCLUDING the ledger lives in the local
// .allostudio.json save file. Nothing leaves the device from this module.
//
// Public API: window.AlloModules.AlloStudio (React component for CDNModuleGate)
//   Props: { onClose, t, addToast, onExportTaggedPdf(html, title) -> Promise<bool>,
//            initialRole: 'teacher' | 'student',
//            onGenerateImage(prompt) -> Promise<dataUrl>,   // optional (Milestone B AI)
//            onSuggestAlt(dataUrl) -> Promise<string>,       // optional (Milestone B AI)
//            onAgentEdit(request) -> Promise<plan|jsonText>, // optional (agent plan; TEACHER-ONLY UI)
//            onEditImage(src, instruction) -> Promise<dataUrl>, // optional (whole-image AI edit; teacher-only)
//            onDesignFeedback(pngDataUrl, context) -> Promise<string> } // optional (vision critique; teacher-only)
//   The two AI props are optional: their buttons only render when wired, and
//   every AI result enters the ledger as actor 'ai' (provenance by construction).
//   Pure helpers attached for tests (the [ST_PURE_BEGIN]…[ST_PURE_END] block):
//   stCreateDoc, stApplyOp, stAppend, stUndo, stRedo, stReplay, stActorSummary,
//   stAltGate, stValidateDoc, stTemplates, stExportHtml, stEscapeHtml,
//   ST_HONESTY_LINE, ST_CANVAS_PRESETS, ST_CHECKPOINT_EVERY.
// Version: 0.1.0 (Milestone A, Jul 2026)
(function () {
  if (typeof document !== 'undefined') {
    // WCAG 4.1.3: status live region for dynamic announcements
    if (!document.getElementById('allo-live-allostudio')) {
      var stLive = document.createElement('div');
      stLive.id = 'allo-live-allostudio';
      stLive.setAttribute('aria-live', 'polite');
      stLive.setAttribute('aria-atomic', 'true');
      stLive.setAttribute('role', 'status');
      stLive.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
      document.body.appendChild(stLive);
    }
    // WCAG 2.1 AA: reduced motion + visible focus (module-scoped, mirrors Video Studio)
    if (!document.getElementById('st-a11y-css')) {
      var stA11y = document.createElement('style');
      stA11y.id = 'st-a11y-css';
      stA11y.textContent = [
        '@media (prefers-reduced-motion: reduce) { .st-root *, .st-root *::before, .st-root *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }',
        '.st-root button:focus-visible, .st-root input:focus-visible, .st-root select:focus-visible, .st-root textarea:focus-visible, .st-root [tabindex]:focus-visible { outline: 2px solid #6366f1 !important; outline-offset: 2px !important; border-radius: 6px; }',
        '.st-root :focus:not(:focus-visible) { outline: none !important; }',
      ].join('\n');
      document.head.appendChild(stA11y);
    }
  }
  var stAnnounce = function (msg) {
    try { var el = document.getElementById('allo-live-allostudio'); if (el) el.textContent = msg; } catch (_) {}
  };

  // ═══════════════════════════ [ST_PURE_BEGIN] ═══════════════════════════
  // Pure core — no DOM access, no randomness, fully unit-testable. Object ids
  // derive from the op seq, so replay is deterministic by construction.

  var ST_FORMAT = 'allostudio';
  var ST_DOC_VERSION = 1;
  var ST_CHECKPOINT_EVERY = 50;
  var ST_MIN_SIZE = 8;
  var ST_LARGE_IMAGE_SRC_LENGTH = 1500000;
  var ST_IMAGE_OPTIMIZE_MAX_DIM = 1200;
  var ST_MAX_IMAGE_SRC_LENGTH = 20000000;
  var ST_MAX_CANVAS_DIM = 10000;
  var ST_MAX_OBJECTS = 2000;
  var ST_MAX_LEDGER_OPS = 50000;
  var ST_ACTORS = { user: true, ai: true, import: true };
  // Verbatim UI honesty line (doc §5) — pinned by tests; do not soften or reword
  // into an "AI detection" claim.
  var ST_HONESTY_LINE = 'This timeline shows what happened inside this editor. It does not detect AI content in imported images.';
  var ST_CANVAS_PRESETS = {
    'letter-portrait': { w: 816, h: 1056 },
    'letter-landscape': { w: 1056, h: 816 },
    'square': { w: 900, h: 900 },
  };
  var ST_RECENT_PROJECTS_KEY = 'allostudio_recent_projects';
  var ST_RECENT_PROJECT_LIMIT = 8;

  function stClone(v) { return JSON.parse(JSON.stringify(v)); }
  function stCleanText(v, n) {
    var text = String(v == null ? '' : v).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
    return n ? text.slice(0, n) : text;
  }
  function stSlug(v, fallback) {
    return (stCleanText(v, 80).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || fallback || 'item');
  }
  function stSafeDataImage(v, maxLen) {
    var s = String(v || '').trim();
    var allowed = /^data:image\/(?:png|jpe?g|webp|gif);base64,[a-z0-9+/_=\s-]+$/i.test(s);
    return (allowed && s.length <= (maxLen || 1200000)) ? s : '';
  }
  function stIsSafeDataImage(v, maxLen) {
    return !!stSafeDataImage(v, maxLen || ST_MAX_IMAGE_SRC_LENGTH);
  }
  function stFiniteNumber(v, fallback) {
    if (v === null || v === undefined || v === '') return fallback;
    var n = Number(v);
    return isFinite(n) ? n : fallback;
  }
  function stIsFiniteNumber(v) {
    return typeof v === 'number' && isFinite(v);
  }
  function stFrameIsFinite(frame) {
    return !!frame && stIsFiniteNumber(frame.x) && stIsFiniteNumber(frame.y) && stIsFiniteNumber(frame.w) && stIsFiniteNumber(frame.h);
  }
  function stSafeCssColor(value, fallback) {
    var s = String(value || '').trim();
    return /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(s) ? s : fallback;
  }
  function stSafeAlign(value) {
    return value === 'center' || value === 'right' ? value : 'left';
  }
  function stSafeTextRole(value) {
    return value === 'heading1' || value === 'heading2' || value === 'heading3' || value === 'body' ? value : 'body';
  }
  // Curated font stacks — picked by KEY in the UI/agent; raw strings (brand
  // fonts) pass a charset allowlist so nothing can smuggle CSS declarations
  // through font-family into exports.
  var ST_FONT_STACKS = {
    system: 'system-ui, sans-serif',
    serif: "Georgia, 'Times New Roman', serif",
    friendly: "'Comic Sans MS', 'Segoe UI', sans-serif",
    mono: "'Consolas', 'Courier New', monospace"
  };
  function stSafeFontFamily(v) {
    if (v == null || v === '') return ST_FONT_STACKS.system;
    var key = String(v);
    if (ST_FONT_STACKS[key]) return ST_FONT_STACKS[key];
    var cleaned = key.replace(/[^A-Za-z0-9 ,'-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120);
    return cleaned || ST_FONT_STACKS.system;
  }

  // Import downscale: keeps saves/exports light. Returns null when the image
  // is already small enough (caller keeps the original bytes untouched).
  function stDownscaleDims(w, h, maxDim) {
    var W = stFiniteNumber(w, 0), H = stFiniteNumber(h, 0), M = Math.max(1, stFiniteNumber(maxDim, 1600));
    if (W <= 0 || H <= 0) return null;
    var m = Math.max(W, H);
    if (m <= M) return null;
    var k = M / m;
    return { w: Math.max(1, Math.round(W * k)), h: Math.max(1, Math.round(H * k)) };
  }
  function stImageWeightInfo(src, threshold) {
    var s = String(src || '');
    var t = Math.max(1, stFiniteNumber(threshold, ST_LARGE_IMAGE_SRC_LENGTH));
    var comma = s.indexOf(',');
    var payload = comma >= 0 ? s.slice(comma + 1).replace(/\s+/g, '') : s;
    var approxBytes = payload.length;
    if (/^data:[^,]+;base64,/i.test(s)) {
      var padding = payload.slice(-2) === '==' ? 2 : payload.slice(-1) === '=' ? 1 : 0;
      approxBytes = Math.max(0, Math.floor(payload.length * 3 / 4) - padding);
    }
    return {
      srcLength: s.length,
      approxBytes: approxBytes,
      approxKb: Math.max(1, Math.round(approxBytes / 1024)),
      threshold: t,
      large: s.length > t,
      canOptimize: s.indexOf('data:image/') === 0
    };
  }
  function stOptimizedImagePatch(image, optimizedSrc, beforeInfo, afterInfo) {
    var priorOrigin = (image && image.provenance && image.provenance.origin) || 'unknown';
    var before = beforeInfo || stImageWeightInfo(image && image.src);
    var after = afterInfo || stImageWeightInfo(optimizedSrc);
    return {
      src: String(optimizedSrc || ''),
      provenance: {
        origin: 'optimized',
        prior: priorOrigin,
        approxKbBefore: before.approxKb,
        approxKbAfter: after.approxKb
      }
    };
  }
  function stIsKeptPlaceholder(image) {
    return !!(image && image.type === 'image' && !image.src && image.provenance && image.provenance.placeholder === 'keep');
  }
  function stKeepPlaceholderPatch(image) {
    var prior = (image && image.provenance && typeof image.provenance === 'object') ? image.provenance : {};
    return {
      decorative: true,
      provenance: Object.assign({}, prior, { origin: prior.origin || 'placeholder', placeholder: 'keep' })
    };
  }
  function stUploadedImagePatch(image, src) {
    var patch = { src: stSafeDataImage(src, ST_MAX_IMAGE_SRC_LENGTH), provenance: { origin: 'upload' } };
    if (image && image.type === 'image' && !image.src) patch.decorative = false;
    return patch;
  }
  function stImageFrameState(image) {
    if (!image || image.type !== 'image') return { key: 'none', label: 'Not an image', message: '' };
    if (image.src) {
      if (image.decorative) return { key: 'decorative', label: 'Decorative image', message: 'Skipped by screen readers.' };
      if (image.alt && String(image.alt).trim()) return { key: 'content', label: 'Content image', message: 'Alt text is present.' };
      return { key: 'needs-alt', label: 'Image needs alt text', message: 'Add alt text or mark decorative before accessible export.' };
    }
    if (stIsKeptPlaceholder(image)) return { key: 'kept-placeholder', label: 'Placeholder kept', message: 'This empty frame is intentionally kept for drafting.' };
    return { key: 'empty-placeholder', label: 'Empty image frame', message: 'Replace it, remove it, or keep it as a placeholder.' };
  }

  // Plan preview: apply ops to a DETACHED scene (no ledger, no real ids) so
  // the review panel can render before/after without touching the document.
  // image.request ops are skipped — their pixels don't exist until apply.
  function stPreviewScene(doc, ops) {
    var scene = { title: doc.title, canvas: stClone(doc.canvas), objects: stClone(doc.objects) };
    var minted = 0;
    (Array.isArray(ops) ? ops : []).forEach(function (op) {
      if (!op || op.type === 'image.request') return;
      var body = op;
      if (op.type === 'object.add' && op.object && !op.object.id) {
        body = stClone(op);
        body.object.id = 'preview' + (++minted);
      }
      scene = stApplyOp(scene, body);
    });
    return { title: scene.title, canvas: scene.canvas, objects: scene.objects };
  }

  // Print CSS for the visual print/PDF route: page sized exactly to the canvas
  // (96 dpi CSS pixels -> inches), no margins, no screen chrome.
  function stPrintCss(canvas) {
    var w = Math.max(ST_MIN_SIZE, stFiniteNumber(canvas && canvas.w, 816));
    var h = Math.max(ST_MIN_SIZE, stFiniteNumber(canvas && canvas.h, 1056));
    return '@page { size: ' + (w / 96) + 'in ' + (h / 96) + 'in; margin: 0; }\n' +
      'html, body { margin: 0; padding: 0; background: #ffffff; }\n' +
      '.st-page { margin: 0 !important; box-shadow: none !important; }';
  }

  // Autosave payload (pure half — storage lives with the other localStorage
  // helpers). Restore only ever loads a payload that validates as a real doc.
  function stDurableDoc(doc) {
    var out = stClone(doc);
    // `_redo` is session-only. It may contain full undone ops, including image
    // bytes, so durable artifacts must only save the actual ledger state.
    delete out._redo;
    return out;
  }
  function stAutosavePayload(doc, now) {
    return { v: 1, savedAt: now || 0, title: (doc && doc.title) || 'Untitled', doc: stDurableDoc(doc) };
  }
  function stAutosaveValid(payload) {
    return !!(payload && payload.v === 1 && payload.doc && stValidateDoc(payload.doc).length === 0);
  }

  function stSafeShape(value) {
    return value === 'ellipse' ? 'ellipse' : 'rect';
  }
  function stOrderedObjects(objects) {
    return (Array.isArray(objects) ? objects : []).map(function (o, i) { return { o: o, i: i }; })
      .sort(function (a, b) {
        var dz = stFiniteNumber(a.o && a.o.z, 1) - stFiniteNumber(b.o && b.o.z, 1);
        return dz || (a.i - b.i);
      })
      .map(function (item) { return item.o; });
  }
  function stHexToRgb(hex) {
    var s = stSafeCssColor(hex, '#000000').slice(1);
    if (s.length === 3) s = s.split('').map(function (ch) { return ch + ch; }).join('');
    return { r: parseInt(s.slice(0, 2), 16), g: parseInt(s.slice(2, 4), 16), b: parseInt(s.slice(4, 6), 16) };
  }
  function stRelLum(hex) {
    var rgb = stHexToRgb(hex);
    var vals = [rgb.r, rgb.g, rgb.b].map(function (v) {
      v = v / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * vals[0] + 0.7152 * vals[1] + 0.0722 * vals[2];
  }
  function stContrastRatio(fg, bg) {
    var a = stRelLum(fg), b = stRelLum(bg);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }
  function stFrameContainsPoint(frame, x, y) {
    return !!frame && x >= frame.x && x <= frame.x + frame.w && y >= frame.y && y <= frame.y + frame.h;
  }
  function stFramesOverlap(a, b) {
    return !!a && !!b && a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }
  function stDeepEqual(a, b) {
    if (a === b) return true;
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      for (var i = 0; i < a.length; i++) { if (!stDeepEqual(a[i], b[i])) return false; }
      return true;
    }
    var ak = Object.keys(a).sort(), bk = Object.keys(b).sort();
    if (ak.length !== bk.length) return false;
    for (var j = 0; j < ak.length; j++) {
      if (ak[j] !== bk[j] || !stDeepEqual(a[ak[j]], b[bk[j]])) return false;
    }
    return true;
  }
  // Effective background(s) under a text box, sampled at a 3×3 grid — NOT just
  // the center. A caption that straddles a dark shape and the white page yields
  // BOTH colors, so the preflight can score the worst-case contrast instead of
  // passing a box that is only legible in the middle. Returns distinct colors.
  function stTextBackgroundsFor(doc, textObj) {
    var pageBg = stSafeCssColor(doc && doc.canvas && doc.canvas.background && doc.canvas.background.fill, '#ffffff');
    var f = stClampFrame(textObj && textObj.frame, doc.canvas);
    var shapes = stOrderedObjects(doc.objects).filter(function (o) {
      return o && o.id !== textObj.id && o.type === 'shape' && stFiniteNumber(o.z, 1) <= stFiniteNumber(textObj.z, 1);
    });
    var frac = [0.1, 0.5, 0.9];
    var seen = {}, out = [];
    for (var i = 0; i < frac.length; i++) {
      for (var j = 0; j < frac.length; j++) {
        var px = f.x + f.w * frac[i], py = f.y + f.h * frac[j];
        var bg = pageBg;
        // ordered ascending by z then array index → last match is the topmost
        shapes.forEach(function (o) { if (stFrameContainsPoint(stClampFrame(o.frame, doc.canvas), px, py)) bg = stSafeCssColor(o.fill, bg); });
        if (!seen[bg]) { seen[bg] = true; out.push(bg); }
      }
    }
    return out;
  }
  function stTextOverlapsImage(doc, textObj) {
    if (!doc || !textObj || !Array.isArray(doc.objects)) return false;
    var textFrame = stClampFrame(textObj.frame, doc.canvas);
    return doc.objects.some(function (o) {
      return o && o.id !== textObj.id && o.type === 'image'
        && stIsSafeDataImage(o.src, ST_MAX_IMAGE_SRC_LENGTH)
        && stFramesOverlap(textFrame, stClampFrame(o.frame, doc.canvas));
    });
  }
  function stAlignFrame(frame, canvas, mode) {
    var f = stClampFrame(frame, canvas);
    var c = canvas || ST_CANVAS_PRESETS['letter-portrait'];
    if (mode === 'left') f.x = 0;
    else if (mode === 'hcenter') f.x = Math.round((c.w - f.w) / 2);
    else if (mode === 'right') f.x = Math.round(c.w - f.w);
    else if (mode === 'top') f.y = 0;
    else if (mode === 'vcenter') f.y = Math.round((c.h - f.h) / 2);
    else if (mode === 'bottom') f.y = Math.round(c.h - f.h);
    else if (mode === 'page-width') { f.x = 48; f.w = Math.max(ST_MIN_SIZE, c.w - 96); }
    return stClampFrame(f, c);
  }

  function stCreateDoc(preset, title, now) {
    var p = ST_CANVAS_PRESETS[preset] || ST_CANVAS_PRESETS['letter-portrait'];
    return {
      format: ST_FORMAT,
      version: ST_DOC_VERSION,
      title: title || 'Untitled',
      _baseTitle: title || 'Untitled', // replay-to-seq-0 anchor (title changes are ops; creation is not)
      // replay-to-seq-0 canvas-size anchor (a canvas.resize is an op; creation is
      // not). Older saves without this fall back to doc.canvas in stReplay — they
      // have no resize ops, so base == current == correct.
      _baseCanvas: { preset: ST_CANVAS_PRESETS[preset] ? preset : 'letter-portrait', w: p.w, h: p.h },
      createdAt: now || 0,
      canvas: { preset: ST_CANVAS_PRESETS[preset] ? preset : 'letter-portrait', w: p.w, h: p.h, background: { fill: '#ffffff' } },
      objects: [],            // current scene cache — array order IS the reading order
      ledger: { version: 1, ops: [], checkpoints: [] },
      _redo: [],              // undone ops (session bookkeeping; harmless if saved)
    };
  }

  function stClampFrame(frame, canvas) {
    frame = frame && typeof frame === 'object' ? frame : {};
    canvas = canvas && typeof canvas === 'object' ? canvas : {};
    var cw = Math.max(ST_MIN_SIZE, stFiniteNumber(canvas.w, ST_CANVAS_PRESETS['letter-portrait'].w));
    var ch = Math.max(ST_MIN_SIZE, stFiniteNumber(canvas.h, ST_CANVAS_PRESETS['letter-portrait'].h));
    var w = Math.max(ST_MIN_SIZE, Math.min(stFiniteNumber(frame.w, ST_MIN_SIZE), cw));
    var h = Math.max(ST_MIN_SIZE, Math.min(stFiniteNumber(frame.h, ST_MIN_SIZE), ch));
    var x = Math.max(0, Math.min(stFiniteNumber(frame.x, 0), cw - w));
    var y = Math.max(0, Math.min(stFiniteNumber(frame.y, 0), ch - h));
    return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), rotation: stFiniteNumber(frame.rotation, 0) };
  }

  // Apply ONE op to a scene ({title, canvas, objects}) — pure; unknown op types
  // leave the scene unchanged (forward compatibility: an old build replaying a
  // newer save must not corrupt what it does understand).
  function stApplyOp(scene, op) {
    var objects = scene.objects.slice();
    var idx = function (id) { for (var i = 0; i < objects.length; i++) { if (objects[i].id === id) return i; } return -1; };
    var t = op.type;
    if (t === 'object.add') {
      if (!op.object || typeof op.object !== 'object') return scene;
      var obj = stClone(op.object);
      obj.frame = stClampFrame(obj.frame, scene.canvas);
      objects.push(obj);
    } else if (t === 'object.remove') {
      var ri = idx(op.target); if (ri >= 0) objects.splice(ri, 1);
    } else if (t === 'object.update') {
      var ui = idx(op.target);
      if (ui >= 0) {
        var merged = stClone(objects[ui]);
        var patch = op.patch || {};
        for (var k in patch) { if (Object.prototype.hasOwnProperty.call(patch, k)) merged[k] = stClone(patch[k]); }
        if (patch.frame) merged.frame = stClampFrame(merged.frame, scene.canvas);
        objects[ui] = merged;
      }
    } else if (t === 'object.move' || t === 'object.resize') {
      var mi = idx(op.target);
      if (mi >= 0) {
        var f = stClone(objects[mi].frame);
        if (t === 'object.move') { f.x = op.x; f.y = op.y; } else { f.w = op.w; f.h = op.h; }
        objects[mi] = stClone(objects[mi]);
        objects[mi].frame = stClampFrame(f, scene.canvas);
      }
    } else if (t === 'object.reorder') { // reading order (array position)
      var oi = idx(op.target);
      if (oi >= 0) {
        var item = objects.splice(oi, 1)[0];
        var to = Math.max(0, Math.min(Math.round(stFiniteNumber(op.toIndex, objects.length)), objects.length));
        objects.splice(to, 0, item);
      }
    } else if (t === 'object.z') {
      var zi = idx(op.target);
      if (zi >= 0) { objects[zi] = stClone(objects[zi]); objects[zi].z = Math.round(stFiniteNumber(op.z, objects[zi].z || 1)); }
    } else if (t === 'doc.retitle') {
      return { title: String(op.title || 'Untitled'), canvas: scene.canvas, objects: objects };
    } else if (t === 'canvas.background') {
      var c = stClone(scene.canvas); c.background = { fill: stSafeCssColor(op.fill, '#ffffff') };
      return { title: scene.title, canvas: c, objects: objects };
    } else if (t === 'canvas.resize') {
      // A known preset drives both dims + label; otherwise take explicit w/h.
      // Background is preserved (stClone). Objects re-clamp into the new page so
      // nothing is stranded off-canvas — undo restores originals via replay.
      var rc = stClone(scene.canvas);
      if (ST_CANVAS_PRESETS[op.preset]) { rc.preset = op.preset; rc.w = ST_CANVAS_PRESETS[op.preset].w; rc.h = ST_CANVAS_PRESETS[op.preset].h; }
      else { rc.w = Math.max(ST_MIN_SIZE, Math.round(stFiniteNumber(op.w, rc.w))); rc.h = Math.max(ST_MIN_SIZE, Math.round(stFiniteNumber(op.h, rc.h))); rc.preset = 'custom'; }
      var reclamped = objects.map(function (ob) { var c2 = stClone(ob); c2.frame = stClampFrame(c2.frame, rc); return c2; });
      return { title: scene.title, canvas: rc, objects: reclamped };
    } else if (t === 'doc.template') {
      // marker op (records which template seeded the doc) — no scene change
    }
    return { title: scene.title, canvas: scene.canvas, objects: objects };
  }

  // Append an op to the doc's ledger and apply it. `actor` must be in the closed
  // set — anything else throws, so a future caller can't invent a fourth actor
  // and silently break the provenance story.
  function stAppend(doc, opBody, actor, now) {
    if (!ST_ACTORS[actor]) throw new Error('AlloStudio: unknown actor "' + actor + '" (must be user | ai | import)');
    var last = doc.ledger.ops.length ? doc.ledger.ops[doc.ledger.ops.length - 1].seq : 0;
    var op = stClone(opBody);
    op.seq = last + 1;
    op.ts = now || 0;
    op.actor = actor;
    // object.add ops mint their object's id from the seq → deterministic replay
    if (op.type === 'object.add' && op.object && !op.object.id) op.object.id = 'o' + op.seq;
    doc.ledger.ops.push(op);
    var next = stApplyOp({ title: doc.title, canvas: doc.canvas, objects: doc.objects }, op);
    doc.title = next.title; doc.canvas = next.canvas; doc.objects = next.objects;
    doc._redo = []; // a new op invalidates the redo branch
    if (op.seq % ST_CHECKPOINT_EVERY === 0) {
      doc.ledger.checkpoints.push({ atSeq: op.seq, title: doc.title, canvas: stClone(doc.canvas), objects: stClone(doc.objects) });
    }
    return op;
  }

  function stOpGestureId(op) {
    return op && op.gesture && typeof op.gesture.id === 'string' ? op.gesture.id : '';
  }
  function stAppendGesture(doc, opBodies, actor, now, options) {
    var list = Array.isArray(opBodies) ? opBodies.filter(Boolean) : [];
    if (!list.length) return [];
    options = options || {};
    var last = doc.ledger.ops.length ? doc.ledger.ops[doc.ledger.ops.length - 1].seq : 0;
    var gestureId = stCleanText(options.id || ('g' + (last + 1)), 80);
    var label = stCleanText(options.label || 'Grouped edit', 80);
    return list.map(function (body) {
      var stamped = stClone(body);
      stamped.gesture = { id: gestureId, label: label };
      return stAppend(doc, stamped, actor, now);
    });
  }
  // Undo/redo = ledger navigation. Undo pops the last op onto the redo stack and
  // recomputes the scene by replay; redo re-appends the SAME op object (its seq
  // and ts are preserved — the op happened once; navigation doesn't re-stamp it).
  function stUndo(doc) {
    if (!doc.ledger.ops.length) return false;
    if (!Array.isArray(doc._redo)) doc._redo = [];
    var first = doc.ledger.ops[doc.ledger.ops.length - 1];
    var gestureId = stOpGestureId(first);
    do {
      doc._redo.push(doc.ledger.ops.pop());
    } while (gestureId && doc.ledger.ops.length && stOpGestureId(doc.ledger.ops[doc.ledger.ops.length - 1]) === gestureId);
    var lastSeq = doc.ledger.ops.length ? doc.ledger.ops[doc.ledger.ops.length - 1].seq : 0;
    doc.ledger.checkpoints = (doc.ledger.checkpoints || []).filter(function (c) { return c.atSeq <= lastSeq; });
    var scene = stReplay(doc, lastSeq);
    doc.title = scene.title; doc.canvas = scene.canvas; doc.objects = scene.objects;
    return true;
  }
  function stRedo(doc) {
    if (!Array.isArray(doc._redo) || !doc._redo.length) return false;
    var first = doc._redo[doc._redo.length - 1];
    var gestureId = stOpGestureId(first);
    do {
      var op = doc._redo.pop();
      doc.ledger.ops.push(op);
      var next = stApplyOp({ title: doc.title, canvas: doc.canvas, objects: doc.objects }, op);
      doc.title = next.title; doc.canvas = next.canvas; doc.objects = next.objects;
      if (op.seq % ST_CHECKPOINT_EVERY === 0) {
        doc.ledger.checkpoints.push({ atSeq: op.seq, title: doc.title, canvas: stClone(doc.canvas), objects: stClone(doc.objects) });
      }
    } while (gestureId && doc._redo.length && stOpGestureId(doc._redo[doc._redo.length - 1]) === gestureId);
    return true;
  }
  // Reconstruct the scene at seq <= toSeq. Checkpoints are caches only; loaded
  // documents are verified against a checkpoint-free fold before they are used.
  function stReplayBase(doc) {
    var bc = doc._baseCanvas && stIsFiniteNumber(doc._baseCanvas.w) && stIsFiniteNumber(doc._baseCanvas.h) ? doc._baseCanvas : doc.canvas;
    return {
      title: doc._baseTitle !== undefined ? doc._baseTitle : doc.title,
      canvas: { preset: bc.preset, w: bc.w, h: bc.h, background: { fill: '#ffffff' } },
      objects: []
    };
  }
  function stReplayWithCheckpoints(doc, toSeq, checkpoints) {
    var start = stReplayBase(doc);
    var fromSeq = 0;
    var cache = Array.isArray(checkpoints) ? checkpoints : [];
    for (var i = cache.length - 1; i >= 0; i--) {
      var c = cache[i];
      if (c && c.atSeq <= toSeq) {
        start = { title: c.title, canvas: stClone(c.canvas), objects: stClone(c.objects) };
        fromSeq = c.atSeq;
        break;
      }
    }
    var scene = { title: start.title, canvas: stClone(start.canvas), objects: stClone(start.objects) };
    var ops = doc && doc.ledger && Array.isArray(doc.ledger.ops) ? doc.ledger.ops : [];
    for (var j = 0; j < ops.length; j++) {
      var op = ops[j];
      if (op.seq <= fromSeq) continue;
      if (op.seq > toSeq) break;
      scene = stApplyOp(scene, op);
    }
    return scene;
  }
  function stReplay(doc, toSeq) {
    return stReplayWithCheckpoints(doc, toSeq, doc && doc.ledger && doc.ledger.checkpoints);
  }
  function stReplayCanonical(doc, toSeq) {
    return stReplayWithCheckpoints(doc, toSeq, []);
  }
  function stCanonicalizeDoc(doc) {
    var out = stClone(doc);
    out._redo = [];
    out.ledger.checkpoints = [];
    var scene = stReplayBase(out);
    out.ledger.ops.forEach(function (op) {
      scene = stApplyOp(scene, op);
      if (op.seq % ST_CHECKPOINT_EVERY === 0) {
        out.ledger.checkpoints.push({ atSeq: op.seq, title: scene.title, canvas: stClone(scene.canvas), objects: stClone(scene.objects) });
      }
    });
    out.title = scene.title;
    out.canvas = scene.canvas;
    out.objects = scene.objects;
    return out;
  }
  // Per-actor summary for the Process tab. activeMs sums gaps under 5 minutes —
  // an honest "time in editor" floor, not surveillance-grade timing.
  function stActorSummary(ops) {
    var out = { user: 0, ai: 0, import: 0, total: ops.length, firstTs: null, lastTs: null, activeMs: 0 };
    var prev = null;
    for (var i = 0; i < ops.length; i++) {
      var op = ops[i];
      if (out[op.actor] !== undefined) out[op.actor]++;
      if (out.firstTs === null) out.firstTs = op.ts;
      out.lastTs = op.ts;
      if (prev !== null && op.ts - prev > 0 && op.ts - prev < 5 * 60 * 1000) out.activeMs += (op.ts - prev);
      prev = op.ts;
    }
    return out;
  }

  // Design law 3: every content image needs alt text; decorative is an explicit
  // choice. Returns the offenders (empty array = gate open). Images without src
  // are exempt: an empty frame emits nothing in the export, so there is nothing
  // to announce — and template placeholder frames must not pre-block export.
  function stAltGate(objects) {
    var missing = [];
    for (var i = 0; i < objects.length; i++) {
      var o = objects[i];
      if (o.type === 'image' && o.src && !o.decorative && !(o.alt && String(o.alt).trim())) {
        missing.push({ id: o.id, index: i });
      }
    }
    return missing;
  }

  function stValidateDoc(doc) {
    var errs = [];
    if (!doc || typeof doc !== 'object') return ['Not an object'];
    if (doc.format !== ST_FORMAT) errs.push('Not an AlloStudio file (format "' + doc.format + '")');
    if (!Number.isInteger(doc.version) || doc.version < 1) errs.push('Unsupported save version (' + doc.version + ')');
    else if (doc.version > ST_DOC_VERSION) errs.push('Newer save version (' + doc.version + ') than this build understands (' + ST_DOC_VERSION + ')');
    if (typeof doc.title !== 'string') errs.push('Missing document title');
    if (!doc.canvas || !stIsFiniteNumber(doc.canvas.w) || !stIsFiniteNumber(doc.canvas.h) || !(doc.canvas.w > 0) || !(doc.canvas.h > 0)) {
      errs.push('Missing canvas');
    } else if (doc.canvas.w > ST_MAX_CANVAS_DIM || doc.canvas.h > ST_MAX_CANVAS_DIM) {
      errs.push('Canvas is too large');
    }

    function validateObject(o, label) {
      if (!o || typeof o !== 'object') { errs.push(label + ' is malformed'); return; }
      if (!o.id || typeof o.id !== 'string') errs.push(label + ' is missing an id');
      if (o.type !== 'text' && o.type !== 'image' && o.type !== 'shape') errs.push(label + ' has an unknown type');
      if (!stFrameIsFinite(o.frame) || o.frame.w <= 0 || o.frame.h <= 0) errs.push(label + ' has an invalid frame');
      if (o.type === 'text') {
        if (!Array.isArray(o.runs) || !o.runs[0] || typeof o.runs[0].text !== 'string') errs.push(label + ' has invalid text');
      } else if (o.type === 'image') {
        if (o.src != null && typeof o.src !== 'string') errs.push(label + ' has an invalid image source');
        else if (o.src && !stIsSafeDataImage(o.src, ST_MAX_IMAGE_SRC_LENGTH)) errs.push(label + ' has an unsafe or oversized image source');
        if (o.alt != null && typeof o.alt !== 'string') errs.push(label + ' has invalid alt text');
        if (o.fit != null && o.fit !== 'cover' && o.fit !== 'contain') errs.push(label + ' has an invalid image fit');
      } else if (o.type === 'shape') {
        if (o.shape !== 'rect' && o.shape !== 'ellipse') errs.push(label + ' has an unknown shape');
      }
    }

    if (!Array.isArray(doc.objects)) {
      errs.push('Missing objects');
    } else {
      if (doc.objects.length > ST_MAX_OBJECTS) errs.push('Too many objects');
      var objectIds = {};
      doc.objects.forEach(function (o, i) {
        var label = 'Object #' + (i + 1);
        validateObject(o, label);
        if (o && typeof o.id === 'string') {
          if (objectIds[o.id]) errs.push(label + ' duplicates object id "' + o.id + '"');
          objectIds[o.id] = true;
        }
      });
    }

    if (!doc.ledger || !Array.isArray(doc.ledger.ops)) {
      errs.push('Missing ledger');
    } else {
      if (doc.ledger.ops.length > ST_MAX_LEDGER_OPS) errs.push('Process history is too large');
      var addedIds = {};
      doc.ledger.ops.forEach(function (op, i) {
        var label = 'Step #' + (i + 1);
        if (!op || typeof op !== 'object') { errs.push(label + ' is malformed'); return; }
        if (!ST_ACTORS[op.actor]) errs.push(label + ' has an unknown actor');
        if (!Number.isInteger(op.seq) || op.seq !== i + 1) errs.push(label + ' has a non-contiguous sequence');
        if (!stIsFiniteNumber(op.ts)) errs.push(label + ' has an invalid timestamp');
        if (typeof op.type !== 'string') errs.push(label + ' has an invalid type');
        if (op.target != null && typeof op.target !== 'string') errs.push(label + ' has an invalid target');
        if (op.type === 'object.add') {
          validateObject(op.object, label + ' object');
          if (op.object && typeof op.object.id === 'string') {
            if (addedIds[op.object.id]) errs.push(label + ' reuses object id "' + op.object.id + '"');
            addedIds[op.object.id] = true;
          }
        }
        if (op.type === 'object.update' && op.patch && Object.prototype.hasOwnProperty.call(op.patch, 'src')) {
          if (op.patch.src && !stIsSafeDataImage(op.patch.src, ST_MAX_IMAGE_SRC_LENGTH)) errs.push(label + ' has an unsafe or oversized image source');
        }
      });
      if (!Array.isArray(doc.ledger.checkpoints)) {
        errs.push('Malformed checkpoints');
      } else {
        doc.ledger.checkpoints.forEach(function (checkpoint, ci) {
          var label = 'Checkpoint #' + (ci + 1);
          if (!checkpoint || !Number.isInteger(checkpoint.atSeq) || checkpoint.atSeq < 1 || checkpoint.atSeq > doc.ledger.ops.length || !Array.isArray(checkpoint.objects)) {
            errs.push(label + ' is malformed');
            return;
          }
          checkpoint.objects.forEach(function (o, oi) { validateObject(o, label + ' object #' + (oi + 1)); });
        });
      }
    }

    if (doc.canvas && Array.isArray(doc.objects) && doc.ledger && Array.isArray(doc.ledger.ops)) {
      try {
        var lastSeq = doc.ledger.ops.length ? doc.ledger.ops[doc.ledger.ops.length - 1].seq : 0;
        var canonical = stReplayCanonical(doc, lastSeq);
        var live = { title: doc.title, canvas: doc.canvas, objects: doc.objects };
        if (!stDeepEqual(live, canonical)) errs.push('Current scene does not match the process history');
      } catch (e) {
        errs.push('Process history could not be replayed');
      }
    }
    return errs;
  }
  // Process-tab step label. Ops applied from an agent plan carry the teacher's
  // request (op.agent.prompt on the batch's first op) — surfacing it here keeps
  // the timeline honest about WHY the AI changed something, not just that it did.
  function stDescribeOp(op) {
    var base = stDescribeOpBase(op);
    if (op && op.agent && op.agent.prompt) return base + ' — AI request: "' + stCleanText(op.agent.prompt, 80) + '"';
    return base;
  }
  function stDescribeOpBase(op) {
    if (!op || typeof op !== 'object') return 'Unknown step';
    if (op.type === 'doc.template') return op.template ? 'Started from the ' + op.template + ' template' : 'Started from a template';
    if (op.type === 'doc.retitle') return 'Renamed the document';
    if (op.type === 'canvas.background') return 'Changed the page background';
    if (op.type === 'canvas.resize') return 'Changed the page size';
    if (op.type === 'object.add') {
      var kind = op.object && op.object.type;
      if (kind === 'text') return 'Added text';
      if (kind === 'image') return 'Added an image';
      if (kind === 'shape') return 'Added a shape';
      return 'Added an object';
    }
    if (op.type === 'object.remove') return 'Removed an object';
    if (op.type === 'object.move') return 'Moved an object';
    if (op.type === 'object.resize') return 'Resized an object';
    if (op.type === 'object.reorder') return 'Changed the reading order';
    if (op.type === 'object.z') return 'Changed the visual layer';
    if (op.type === 'object.update') {
      var p = op.patch || {};
      if (p.runs) return 'Edited text';
      if (p._crop) return 'Cropped an image';
      if (p.src) return (p.provenance && p.provenance.origin === 'ai-edited') ? 'AI edited an image' : (p.provenance && p.provenance.origin === 'optimized') ? 'Optimized an image' : 'Replaced an image';
      if (Object.prototype.hasOwnProperty.call(p, 'alt')) return 'Updated alt text';
      if (p.provenance && p.provenance.placeholder === 'keep') return 'Kept image placeholder';
      if (Object.prototype.hasOwnProperty.call(p, 'decorative')) return p.decorative ? 'Marked an image decorative' : 'Marked an image as content';
      if (p.role) return 'Changed the text role';
      if (p.fill) return 'Changed a fill color';
      if (p.provenance) return 'Updated image details';
      return 'Updated an object';
    }
    return op.type;
  }

  function stAnalyzeDoc(doc) {
    var issues = [];
    if (!doc || !Array.isArray(doc.objects)) return { issues: [{ type: 'file', severity: 'error', title: 'Document is not ready', message: 'Open or create an AlloStudio document first.' }], counts: { error: 1, warning: 0, review: 0 } };
    stAltGate(doc.objects).forEach(function (m) {
      issues.push({ id: m.id, type: 'alt', severity: 'error', title: 'Image needs alt text', message: 'Add alt text or mark the image decorative before accessible export.' });
    });
    doc.objects.forEach(function (o, i) {
      if (!o || typeof o !== 'object') return;
      var f = stClampFrame(o.frame, doc.canvas);
      if (o.frame && (f.x !== Math.round(stFiniteNumber(o.frame.x, 0)) || f.y !== Math.round(stFiniteNumber(o.frame.y, 0)) || f.w !== Math.round(stFiniteNumber(o.frame.w, ST_MIN_SIZE)) || f.h !== Math.round(stFiniteNumber(o.frame.h, ST_MIN_SIZE)))) {
        issues.push({ id: o.id, type: 'bounds', severity: 'warning', title: 'Object is outside the page', message: 'Move or resize this object so it sits fully on the page.' });
      }
      if (o.type === 'image') {
        if (!o.src && !stIsKeptPlaceholder(o)) issues.push({ id: o.id, type: 'empty-image', severity: 'review', title: 'Empty image frame', message: 'Add an image, remove the frame, or keep it as a placeholder while drafting.' });
        else if (stImageWeightInfo(o.src).large) issues.push({ id: o.id, type: 'large-image', severity: 'warning', title: 'Large image', message: 'This image may make the save file and exports heavy.' });
      } else if (o.type === 'text') {
        var run = (o.runs && o.runs[0]) || { text: '', style: {} };
        var s = run.style || {};
        var text = String(run.text || '').trim();
        var size = Math.max(8, Math.min(160, stFiniteNumber(s.size, 16)));
        if (!text) issues.push({ id: o.id, type: 'empty-text', severity: 'review', title: 'Empty text box', message: 'Add text or remove this box.' });
        if (text && size < 12) issues.push({ id: o.id, type: 'small-text', severity: 'warning', title: 'Small text', message: 'Text under 12 px can be hard to read in print or projection.' });
        if (text) {
          var fg = stSafeCssColor(s.color, '#111827');
          // worst contrast across every background the box overlaps
          var ratio = stTextBackgroundsFor(doc, o).reduce(function (worst, bg) { return Math.min(worst, stContrastRatio(fg, bg)); }, Infinity);
          var large = size >= 24 || (s.bold && size >= 18);
          var required = large ? 3 : 4.5;
          if (ratio < required) {
            issues.push({ id: o.id, type: 'contrast', severity: 'warning', title: 'Low text contrast', message: 'Text contrast is ' + ratio.toFixed(2) + ':1. Aim for at least ' + required + ':1.' });
          }
          if (stTextOverlapsImage(doc, o)) {
            issues.push({ id: o.id, type: 'image-contrast', severity: 'review', title: 'Review text over image', message: 'Image colors vary. Confirm this text stays readable across the image and that the visual stacking is intentional.' });
          }
        }
      }
    });
    // Heading hierarchy (WCAG 1.3.1 / 2.4.6): exported tags come straight from
    // the role field, so a skipped level (H1→H3) or a missing H1 ships as a real
    // structural defect in the tagged PDF. Evaluated in reading (array) order.
    var headings = doc.objects.filter(function (o) {
      return o && o.type === 'text' && /^heading[123]$/.test(o.role) && String((o.runs && o.runs[0] && o.runs[0].text) || '').trim();
    }).map(function (o) { return { id: o.id, level: parseInt(o.role.slice(7), 10) }; });
    if (headings.length) {
      if (!headings.some(function (hd) { return hd.level === 1; })) {
        issues.push({ id: headings[0].id, type: 'heading-order', severity: 'review', title: 'No top-level heading', message: 'Give the page a Heading 1 so its structure starts at the top level.' });
      }
      var prevLevel = 0;
      headings.forEach(function (hd) {
        if (prevLevel && hd.level > prevLevel + 1) {
          issues.push({ id: hd.id, type: 'heading-order', severity: 'warning', title: 'Skipped heading level', message: 'This jumps from Heading ' + prevLevel + ' to Heading ' + hd.level + '. Screen-reader users rely on levels not being skipped.' });
        }
        prevLevel = hd.level;
      });
    }
    if (doc.objects.length > 1) issues.push({ type: 'reading-order', severity: 'review', title: 'Review reading order', message: 'The right-side order list is what screen readers and tagged PDF follow.' });
    var counts = { error: 0, warning: 0, review: 0 };
    issues.forEach(function (issue) { if (counts[issue.severity] !== undefined) counts[issue.severity]++; });
    return { issues: issues, counts: counts };
  }

  function stExportWorksheetData(doc) {
    var out = { title: doc.title || 'Worksheet', instructions: '', questions: [] };
    var current = null;
    doc.objects.forEach(function (o) {
      if (!o || o.type !== 'text') return;
      var text = String((o.runs && o.runs[0] && o.runs[0].text) || '').trim();
      if (!text) return;
      if (o.role === 'heading1') out.title = text;
      else if (o.role === 'heading2' && /^\d+[\.)]\s*/.test(text)) {
        current = { prompt: text.replace(/^\d+[\.)]\s*/, ''), supportText: '' };
        out.questions.push(current);
      } else if (!out.instructions) {
        out.instructions = text;
      } else if (current) {
        current.supportText = current.supportText ? current.supportText + '\n' + text : text;
      }
    });
    return out;
  }

  // Worksheet BRIDGE (doc §11): turn the VISUAL worksheet into a LINEAR,
  // semantically-structured worksheet document — real <ol>/<li> questions with
  // labeled answer regions — so it flows through the same accessible export
  // pipeline (tagged PDF / HTML) as a proper worksheet, not just a page picture.
  // Distinct from stExportHtml (the pixel-faithful design snapshot).
  function stExportWorksheetHtml(doc, opts) {
    var lang = (opts && opts.lang) || 'en';
    var data = stExportWorksheetData(doc);
    var parts = ['<h1>' + stEscapeHtml(data.title) + '</h1>'];
    if (data.instructions) parts.push('<p class="st-ws-instructions">' + stEscapeHtml(data.instructions) + '</p>');
    if (data.questions.length) {
      parts.push('<ol class="st-ws-questions">');
      data.questions.forEach(function (q) {
        parts.push('<li><p class="st-ws-prompt">' + stEscapeHtml(q.prompt) + '</p>'
          + (q.supportText ? '<p class="st-ws-support">' + stEscapeHtml(q.supportText).replace(/\n/g, '<br>') + '</p>' : '')
          + '<div class="st-ws-answer" role="group" aria-label="Answer space"></div></li>');
      });
      parts.push('</ol>');
    }
    return '<!DOCTYPE html>\n<html lang="' + stEscapeHtml(lang) + '">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>' + stEscapeHtml(data.title) + '</title>\n<style>\n  body { font-family: system-ui, sans-serif; color: #111827; max-width: 720px; margin: 32px auto; padding: 0 24px; line-height: 1.5; }\n  h1 { font-size: 28px; }\n  .st-ws-instructions { background: #fef9c3; padding: 10px 12px; border-radius: 8px; }\n  .st-ws-questions { padding-left: 28px; }\n  .st-ws-questions > li { margin: 18px 0; }\n  .st-ws-prompt { font-weight: 600; margin: 0 0 6px; }\n  .st-ws-support { color: #374151; margin: 0 0 8px; }\n  .st-ws-answer { min-height: 96px; border: 1px solid #cbd5e1; border-radius: 8px; }\n  @media print { .st-ws-answer { min-height: 120px; } }\n</style>\n</head>\n<body>\n<main>\n' + parts.join('\n') + '\n</main>\n</body>\n</html>';
  }

  function stBuildResourceCues(history, options) {
    var list = Array.isArray(history) ? history : [];
    var opts = options || {};
    var out = [];
    var max = Math.max(1, Math.min(200, Number(opts.limit) || 120));
    var push = function (cue) {
      if (!cue || out.length >= max) return;
      var label = stCleanText(cue.label || cue.title || cue.term || cue.question || cue.text, 140);
      var text = stCleanText(cue.text || cue.definition || cue.question || cue.prompt || label, 620);
      var imageSrc = stSafeDataImage(cue.imageSrc || cue.image || cue.imageUrl || cue.src || cue.dataUrl);
      if (!label && !text && !imageSrc) return;
      out.push({
        id: stCleanText(cue.id || ('cue' + (out.length + 1)), 90),
        kind: stCleanText(cue.kind || 'resource', 40),
        label: label || 'Resource',
        text: text,
        imageSrc: imageSrc,
        prompt: stCleanText(cue.prompt || text || label, 700),
        sourceType: stCleanText(cue.sourceType || cue.type || 'resource', 50),
        sourceTitle: stCleanText(cue.sourceTitle || '', 140),
        sourceIndex: Math.max(0, Math.round(Number(cue.sourceIndex) || 0))
      });
    };
    list.forEach(function (item, idx) {
      if (!item) return;
      var type = stCleanText(item.type || item.kind || '', 50).toLowerCase();
      var title = stCleanText(item.title || item.name || item.label || type || 'Resource', 140);
      var data = item.data != null ? item.data : item.content;
      var baseId = stCleanText(item.id || item.resourceId || ('history-' + idx), 60);
      if (type === 'glossary' && Array.isArray(data)) {
        data.slice(0, 80).forEach(function (g, gi) {
          var term = stCleanText(g && (g.term || g.word || g.label), 120);
          var def = stCleanText(g && (g.definition || g.def || g.description || g.meaning), 620);
          push({
            id: baseId + '-term-' + gi,
            kind: 'glossary',
            label: term || ('Term ' + (gi + 1)),
            text: def,
            imageSrc: g && (g.image || g.imageUrl || g.imageSrc || g.src),
            prompt: term ? ('Create a clear visual support for the glossary term "' + term + '". Definition: ' + def) : def,
            sourceType: type,
            sourceTitle: title,
            sourceIndex: idx
          });
        });
      } else if (type === 'image' || type === 'visual' || type === 'visuals') {
        var img = data && (data.imageUrl || data.image || data.src || data.dataUrl);
        push({
          id: baseId + '-image',
          kind: 'image',
          label: title,
          text: stCleanText((data && (data.alt || data.altText || data.caption || data.prompt)) || item.prompt || title, 620),
          imageSrc: img,
          prompt: stCleanText((data && data.prompt) || item.prompt || title, 700),
          sourceType: type,
          sourceTitle: title,
          sourceIndex: idx
        });
      } else if (type === 'quiz' || type === 'assessment') {
        var qs = Array.isArray(data) ? data : (data && (data.questions || data.items));
        (Array.isArray(qs) ? qs : []).slice(0, 30).forEach(function (q, qi) {
          push({
            id: baseId + '-q-' + qi,
            kind: 'question',
            label: stCleanText(q && (q.question || q.prompt || q.text), 140) || ('Question ' + (qi + 1)),
            text: stCleanText(q && (q.question || q.prompt || q.text), 620),
            prompt: stCleanText(q && (q.question || q.prompt || q.text), 700),
            sourceType: type,
            sourceTitle: title,
            sourceIndex: idx
          });
        });
      } else if (type === 'outline' || type === 'lesson-plan' || type === 'lesson_plan') {
        var sections = Array.isArray(data) ? data : (data && (data.sections || data.items || data.outline));
        (Array.isArray(sections) ? sections : []).slice(0, 30).forEach(function (s, si) {
          push({
            id: baseId + '-section-' + si,
            kind: 'section',
            label: stCleanText(s && (s.title || s.heading || s.topic || s.text), 140) || ('Section ' + (si + 1)),
            text: stCleanText(s && (s.summary || s.text || s.description || s.details), 620),
            sourceType: type,
            sourceTitle: title,
            sourceIndex: idx
          });
        });
      } else {
        var txt = stCleanText(typeof data === 'string' ? data : (data && (data.text || data.summary || data.markdown || data.html)) || item.text || item.summary, 620);
        if (txt || title) {
          push({
            id: baseId + '-resource',
            kind: type || 'resource',
            label: title,
            text: txt,
            sourceType: type || 'resource',
            sourceTitle: title,
            sourceIndex: idx
          });
        }
      }
    });
    return out;
  }

  function stObjectsFromResourceCue(cue, options) {
    cue = cue || {};
    options = options || {};
    var canvas = options.canvas || ST_CANVAS_PRESETS['letter-portrait'];
    var x = Math.max(24, Math.min(stFiniteNumber(options.x, 56), Math.max(24, canvas.w - 200)));
    var y = Math.max(24, Math.min(stFiniteNumber(options.y, 72), Math.max(24, canvas.h - 120)));
    var w = Math.max(180, Math.min(stFiniteNumber(options.w, canvas.w - x - 56), canvas.w - x - 24));
    var kind = stCleanText(cue.kind || cue.type || 'resource', 40).toLowerCase();
    var label = stCleanText(cue.label || cue.title || 'Resource', 160);
    var text = stCleanText(cue.text || cue.definition || cue.prompt, 900);
    var imageSrc = stSafeDataImage(cue.imageSrc || cue.image || cue.imageUrl || cue.src || cue.dataUrl);
    var source = {
      origin: 'resource-history',
      resourceId: stCleanText(cue.id, 90),
      sourceTitle: stCleanText(cue.sourceTitle, 140),
      sourceType: stCleanText(cue.sourceType || cue.kind, 50)
    };
    var objects = [];
    var add = function (object) {
      object.provenance = source;
      objects.push(object);
    };
    var card = function (h, fill) {
      add(stMakeShape('rect', { x: x, y: y, w: w, h: h }, fill));
    };
    var bodyText = text && text !== label ? text : '';
    if (kind === 'glossary') {
      var termH = imageSrc ? 230 : 190;
      card(termH, '#ecfeff');
      add(stMakeText('heading2', label || 'Vocabulary term', { x: x + 20, y: y + 18, w: w - 40, h: 42 }, { size: 24 }));
      add(stMakeText('heading3', 'Definition', { x: x + 20, y: y + 66, w: 180, h: 28 }, { size: 15 }));
      if (imageSrc) {
        var termImgW = Math.min(210, Math.max(150, Math.round(w * 0.32)));
        add(stMakeImage(imageSrc, label || bodyText || 'Resource image', { x: x + w - termImgW - 20, y: y + 72, w: termImgW, h: 130 }, 'resource-history'));
        add(stMakeText('body', bodyText || 'Add a student-friendly definition or example.', { x: x + 20, y: y + 98, w: Math.max(160, w - termImgW - 60), h: 104 }, { size: 16 }));
      } else {
        add(stMakeText('body', bodyText || 'Add a student-friendly definition or example.', { x: x + 20, y: y + 98, w: w - 40, h: 70 }, { size: 16 }));
      }
    } else if (kind === 'question') {
      card(238, '#fef9c3');
      add(stMakeText('heading2', 'Question', { x: x + 20, y: y + 18, w: w - 40, h: 36 }, { size: 22 }));
      add(stMakeText('body', text || label || 'Write the question here.', { x: x + 20, y: y + 62, w: w - 40, h: 68 }, { size: 16 }));
      add(stMakeText('heading3', 'Answer space', { x: x + 20, y: y + 142, w: w - 40, h: 26 }, { size: 14 }));
      add(stMakeShape('rect', { x: x + 20, y: y + 170, w: w - 40, h: 50 }, '#ffffff'));
    } else if (kind === 'image' && imageSrc) {
      var imageCardH = 226;
      var imgW = Math.min(280, Math.max(170, Math.round(w * 0.42)));
      card(imageCardH, '#f8fafc');
      add(stMakeImage(imageSrc, label || text || 'Resource image', { x: x + 20, y: y + 24, w: imgW, h: 164 }, 'resource-history'));
      add(stMakeText('heading2', label || 'Visual resource', { x: x + imgW + 36, y: y + 32, w: Math.max(150, w - imgW - 56), h: 44 }, { size: 22 }));
      add(stMakeText('body', bodyText || 'Add a caption or explanation for this visual.', { x: x + imgW + 36, y: y + 88, w: Math.max(150, w - imgW - 56), h: 100 }, { size: 15 }));
    } else {
      var sectionFill = kind === 'section' ? '#eff6ff' : '#f8fafc';
      card(180, sectionFill);
      add(stMakeText('heading2', label || (kind === 'section' ? 'Section' : 'Resource'), { x: x + 20, y: y + 20, w: w - 40, h: 42 }, { size: 22 }));
      add(stMakeText('body', bodyText || text || 'Add notes from this resource.', { x: x + 20, y: y + 76, w: w - 40, h: 82 }, { size: 16 }));
    }
    return objects;
  }

  function stSuggestTextColor(doc, textObj) {
    if (!doc || !textObj || textObj.type !== 'text') return null;
    var run = (textObj.runs && textObj.runs[0]) || { style: {} };
    var style = run.style || {};
    var size = Math.max(8, Math.min(160, stFiniteNumber(style.size, 16)));
    var large = size >= 24 || (style.bold && size >= 18);
    var required = large ? 3 : 4.5;
    var backgrounds = stTextBackgroundsFor(doc, textObj);
    var candidates = ['#111827', '#000000', '#ffffff', '#1e293b'];
    var best = null;
    candidates.forEach(function (color) {
      var ratio = backgrounds.reduce(function (worst, bg) { return Math.min(worst, stContrastRatio(color, bg)); }, Infinity);
      if (!best || ratio > best.ratio) best = { color: color, ratio: ratio, passes: ratio >= required };
    });
    return best;
  }

  function stReadyActionForIssue(doc, issue) {
    if (!issue) return null;
    var action = { type: 'select', targetId: issue.id || null, issueType: issue.type, severity: issue.severity, title: issue.title, message: issue.message };
    if (issue.type === 'alt') action.type = 'add-alt';
    else if (issue.type === 'small-text') action.type = 'fix-small-text';
    else if (issue.type === 'contrast') action.type = 'fix-contrast';
    else if (issue.type === 'heading-order') action.type = 'review-heading';
    else if (issue.type === 'reading-order') action.type = 'review-reading-order';
    else if (issue.type === 'empty-image') action.type = 'replace-image';
    else if (issue.type === 'bounds') action.type = 'fix-bounds';
    else if (issue.type === 'large-image') action.type = 'optimize-image';
    if (action.type === 'fix-contrast' && issue.id && doc && Array.isArray(doc.objects)) {
      var o = doc.objects.filter(function (obj) { return obj && obj.id === issue.id; })[0];
      var suggestion = stSuggestTextColor(doc, o);
      if (suggestion) action.suggestedColor = suggestion.color;
    }
    if (action.type === 'fix-bounds' && issue.id && doc && Array.isArray(doc.objects)) {
      var bounded = doc.objects.filter(function (obj) { return obj && obj.id === issue.id; })[0];
      if (bounded && bounded.frame) action.suggestedFrame = stClampFrame(bounded.frame, doc.canvas);
    }
    if (action.type === 'optimize-image' && issue.id && doc && Array.isArray(doc.objects)) {
      var image = doc.objects.filter(function (obj) { return obj && obj.id === issue.id; })[0];
      if (image && image.src) {
        action.imageWeight = stImageWeightInfo(image.src);
        action.optimizeMaxDim = ST_IMAGE_OPTIMIZE_MAX_DIM;
      }
    }
    return action;
  }

  function stIssueActionChoices(doc, issue) {
    var primary = stReadyActionForIssue(doc, issue);
    if (!primary) return [];
    if (issue && issue.type === 'alt' && issue.id) {
      return [
        primary,
        { type: 'mark-decorative', targetId: issue.id, issueType: issue.type, severity: issue.severity, title: issue.title, message: issue.message }
      ];
    }
    if (issue && issue.type === 'empty-image' && issue.id) {
      return [
        primary,
        { type: 'remove-placeholder', targetId: issue.id, issueType: issue.type, severity: issue.severity, title: issue.title, message: issue.message },
        { type: 'keep-placeholder', targetId: issue.id, issueType: issue.type, severity: issue.severity, title: issue.title, message: issue.message }
      ];
    }
    return [primary];
  }

  function stPreflightGuide(doc, index, filter) {
    var analysis = stAnalyzeDoc(doc);
    var issues = stFilterPreflightIssues(analysis, filter);
    var total = issues.length;
    if (!total) {
      return { total: 0, index: -1, position: 0, issue: null, actions: [], title: 'No open issues', message: 'This artifact is ready for the current checks.' };
    }
    var raw = Math.round(stFiniteNumber(index, 0));
    var safe = ((raw % total) + total) % total;
    var issue = issues[safe];
    return {
      total: total,
      index: safe,
      position: safe + 1,
      issue: issue,
      actions: stIssueActionChoices(doc, issue),
      title: 'Issue ' + (safe + 1) + ' of ' + total,
      message: issue ? issue.title + ': ' + issue.message : ''
    };
  }

  function stFilterPreflightIssues(analysis, filter) {
    var issues = (analysis && Array.isArray(analysis.issues)) ? analysis.issues : [];
    var key = filter === 'fix' ? 'error' : filter;
    if (key !== 'error' && key !== 'warning' && key !== 'review') return issues.slice();
    return issues.filter(function (issue) { return issue && issue.severity === key; });
  }

  function stExportConfidence(doc) {
    if (!doc || !Array.isArray(doc.objects)) {
      return { status: 'blocked', cards: [{ key: 'file', label: 'Document', status: 'blocked', message: 'Open or create a document first.' }] };
    }
    var analysis = stAnalyzeDoc(doc);
    var counts = analysis.counts || { error: 0, warning: 0, review: 0 };
    var altCount = stAltGate(doc.objects).length;
    var openCount = stFiniteNumber(counts.error, 0) + stFiniteNumber(counts.warning, 0) + stFiniteNumber(counts.review, 0);
    var blocked = altCount || stFiniteNumber(counts.error, 0);
    var review = !blocked && (stFiniteNumber(counts.warning, 0) || stFiniteNumber(counts.review, 0));
    var accessibleStatus = blocked ? 'blocked' : review ? 'review' : 'ready';
    var accessibleMessage = blocked
      ? altCount + ' image(s) need alt text or a decorative mark.'
      : review ? openCount + ' review item(s) remain before sharing.' : 'Ready for accessible sharing.';
    var worksheet = stExportWorksheetData(doc);
    var worksheetReady = worksheet.questions && worksheet.questions.length;
    var cards = [
      { key: 'tagged-pdf', label: 'Tagged PDF', status: accessibleStatus, message: accessibleMessage },
      { key: 'html', label: 'Accessible HTML', status: accessibleStatus, message: accessibleMessage },
      { key: 'visual', label: 'Visual copy', status: blocked ? 'blocked' : 'ready', message: blocked ? 'Resolve alt text first; the export gate is still closed.' : 'Pixels-only; pair with HTML or tagged PDF when accessibility matters.' },
      { key: 'worksheet', label: 'Worksheet bridge', status: worksheetReady ? 'ready' : 'review', message: worksheetReady ? worksheet.questions.length + ' structured question(s) found.' : 'Use numbered Heading 2 prompts for a structured worksheet export.' }
    ];
    return { status: blocked ? 'blocked' : review ? 'review' : 'ready', counts: counts, openCount: openCount, altCount: altCount, cards: cards };
  }

  function stProcessStepGroups(ops) {
    var list = Array.isArray(ops) ? ops : [];
    var groups = [];
    list.forEach(function (op) {
      if (!op || typeof op !== 'object') return;
      var label = stDescribeOpBase(op);
      var key = [op.actor || 'user', label, op.type || '', op.target || ''].join('|');
      var prev = groups[groups.length - 1];
      if (prev && prev.key === key) {
        prev.count++;
        prev.endSeq = op.seq;
        prev.latest = op;
        prev.ops.push(op);
        return;
      }
      groups.push({ key: key, actor: op.actor || 'user', label: label, count: 1, startSeq: op.seq, endSeq: op.seq, latest: op, ops: [op] });
    });
    return groups.map(function (g) {
      return {
        actor: g.actor,
        label: g.label,
        count: g.count,
        startSeq: g.startSeq,
        endSeq: g.endSeq,
        latest: g.latest,
        ops: g.ops.slice(),
        text: g.count > 1 ? g.label + ' x' + g.count : stDescribeOp(g.latest)
      };
    });
  }

  function stIssueIndexForObject(analysis, objectId, filter) {
    var issues = stFilterPreflightIssues(analysis, filter);
    for (var i = 0; i < issues.length; i++) {
      if (issues[i] && issues[i].id === objectId) return i;
    }
    return -1;
  }

  function stNextPreflightGuideIndex(beforeAnalysis, afterAnalysis, currentIndex, action, filter) {
    var beforeIssues = stFilterPreflightIssues(beforeAnalysis, filter);
    var afterIssues = stFilterPreflightIssues(afterAnalysis, filter);
    if (!afterIssues.length) return 0;
    var targetId = action && action.targetId;
    var issueType = action && action.issueType;
    var current = Math.max(0, Math.round(stFiniteNumber(currentIndex, 0)));
    var actionIndex = -1;
    if (issueType) {
      for (var i = 0; i < beforeIssues.length; i++) {
        if (beforeIssues[i] && beforeIssues[i].type === issueType && (!targetId || beforeIssues[i].id === targetId)) { actionIndex = i; break; }
      }
    }
    if (actionIndex < 0) actionIndex = Math.min(current, Math.max(0, beforeIssues.length - 1));
    var beforeIssue = beforeIssues[actionIndex] || null;
    var sameType = issueType || (beforeIssue && beforeIssue.type);
    var sameId = targetId || (beforeIssue && beforeIssue.id);
    for (var s = 0; s < afterIssues.length; s++) {
      var issue = afterIssues[s];
      if (!issue) continue;
      if (sameType && issue.type === sameType && (!sameId || issue.id === sameId)) return s;
    }
    if (sameId) {
      for (var t = 0; t < afterIssues.length; t++) {
        if (afterIssues[t] && afterIssues[t].id === sameId) return t;
      }
    }
    return Math.min(Math.max(actionIndex, 0), afterIssues.length - 1);
  }

  function stFilteredProcessStepGroups(ops, actor) {
    var groups = stProcessStepGroups(ops);
    if (!actor || actor === 'all' || !ST_ACTORS[actor]) return groups;
    return groups.filter(function (group) { return group.actor === actor; });
  }

  function stBuildReadyActions(doc, filter) {
    var analysis = stAnalyzeDoc(doc);
    var issues = stFilterPreflightIssues(analysis, filter);
    var counts = (filter && filter !== 'all') ? { error: 0, warning: 0, review: 0 } : analysis.counts;
    if (filter && filter !== 'all') {
      issues.forEach(function (issue) {
        if (issue && Object.prototype.hasOwnProperty.call(counts, issue.severity)) counts[issue.severity]++;
      });
    }
    var status = counts.error ? 'blocked' : ((counts.warning || counts.review) ? 'review' : 'ready');
    var actions = [];
    issues.forEach(function (issue) {
      if (actions.length >= 10) return;
      stIssueActionChoices(doc, issue).forEach(function (action) {
        if (actions.length < 10 && action) actions.push(action);
      });
    });
    return {
      status: status,
      counts: counts,
      totalCounts: analysis.counts,
      filter: filter || 'all',
      actions: actions,
      title: status === 'ready' ? 'Ready to share' : status === 'blocked' ? 'Exports need attention' : 'Review before sharing',
      message: status === 'ready' ? 'No accessibility issues found.' : status === 'blocked' ? 'Fix required items before accessible export.' : 'A few quality checks could improve this artifact.'
    };
  }

  function stObjectReadyActions(doc, objectId) {
    if (!doc || !objectId) return [];
    return stAnalyzeDoc(doc).issues
      .filter(function (issue) { return issue && issue.id === objectId; })
      .reduce(function (out, issue) { return out.concat(stIssueActionChoices(doc, issue)); }, [])
      .filter(Boolean);
  }

  function stBuildAccessibilityChecklist(analysis) {
    var issues = (analysis && Array.isArray(analysis.issues)) ? analysis.issues : [];
    var rank = { error: 3, warning: 2, review: 1, pass: 0 };
    var defs = [
      { key: 'alt', name: 'Alt text', types: ['alt'], pass: 'Content images are described or marked decorative.', fix: 'Some images need alt text before accessible export.' },
      { key: 'contrast', name: 'Contrast', types: ['contrast', 'image-contrast'], pass: 'Text contrast meets the current checks.', fix: 'Some text needs stronger contrast or an image-background review.' },
      { key: 'text', name: 'Readable text', types: ['small-text', 'empty-text'], pass: 'Text is present and readable.', fix: 'Some text is tiny or empty.' },
      { key: 'structure', name: 'Structure', types: ['heading-order', 'reading-order'], pass: 'Headings and reading order look ready.', fix: 'Review headings or reading order before sharing.' },
      { key: 'objects', name: 'Objects', types: ['bounds', 'empty-image', 'large-image'], pass: 'Objects are inside the page and export-friendly.', fix: 'Some objects need layout or file-size attention.' }
    ];
    return defs.map(function (def) {
      var matches = issues.filter(function (issue) { return def.types.indexOf(issue.type) >= 0; });
      var severity = matches.reduce(function (best, issue) { return rank[issue.severity] > rank[best] ? issue.severity : best; }, 'pass');
      return {
        key: def.key,
        name: def.name,
        status: matches.length ? (severity === 'error' ? 'fix' : 'review') : 'pass',
        severity: matches.length ? severity : 'pass',
        count: matches.length,
        message: matches.length ? def.fix : def.pass
      };
    });
  }

  function stObjectIssueSummary(analysis) {
    var issues = (analysis && Array.isArray(analysis.issues)) ? analysis.issues : [];
    var rank = { error: 3, warning: 2, review: 1, pass: 0 };
    var out = {};
    issues.forEach(function (issue) {
      if (!issue || !issue.id) return;
      var id = String(issue.id);
      if (!out[id]) out[id] = { id: id, count: 0, severity: 'pass', issues: [] };
      out[id].count += 1;
      out[id].issues.push(issue);
      if (rank[issue.severity] > rank[out[id].severity]) out[id].severity = issue.severity;
    });
    Object.keys(out).forEach(function (id) {
      var item = out[id];
      var first = item.issues[0] || {};
      item.title = first.title || 'Needs review';
      item.message = first.message || '';
      item.label = item.severity === 'error' ? 'Fix' : item.severity === 'warning' ? 'Check' : 'Review';
    });
    return out;
  }

  function stBuildA11yAutoFixPlan(doc) {
    var analysis = stAnalyzeDoc(doc);
    var objects = (doc && Array.isArray(doc.objects)) ? doc.objects : [];
    var patches = {};
    var fixed = [];
    var review = [];
    function targetFor(issue) {
      return issue && issue.id ? objects.filter(function (o) { return o && o.id === issue.id; })[0] : null;
    }
    function patchFor(o) {
      if (!o || !o.id) return null;
      if (!patches[o.id]) patches[o.id] = { type: 'object.update', target: o.id, patch: {} };
      return patches[o.id].patch;
    }
    analysis.issues.forEach(function (issue) {
      var o = targetFor(issue);
      if (issue.type === 'small-text' && o && o.type === 'text') {
        var p = patchFor(o);
        var runs = p.runs || stClone(o.runs || [{ text: '', style: {} }]);
        if (!runs[0]) runs[0] = { text: '', style: {} };
        runs[0].style = Object.assign({}, runs[0].style, { size: Math.max(12, stFiniteNumber(runs[0].style && runs[0].style.size, 16)) });
        p.runs = runs;
        fixed.push(issue.type);
        return;
      }
      if (issue.type === 'contrast' && o && o.type === 'text') {
        var suggestion = stSuggestTextColor(doc, o);
        if (suggestion && suggestion.color) {
          var cp = patchFor(o);
          var cruns = cp.runs || stClone(o.runs || [{ text: '', style: {} }]);
          if (!cruns[0]) cruns[0] = { text: '', style: {} };
          cruns[0].style = Object.assign({}, cruns[0].style, { color: suggestion.color });
          cp.runs = cruns;
          fixed.push(issue.type);
          return;
        }
      }
      if (issue.type === 'bounds' && o && o.frame) {
        var bp = patchFor(o);
        bp.frame = stClampFrame(o.frame, doc.canvas);
        fixed.push(issue.type);
        return;
      }
      review.push(issue);
    });
    return {
      ops: Object.keys(patches).map(function (id) { return patches[id]; }),
      fixedTypes: fixed,
      reviewCount: review.length,
      remainingIssues: review
    };
  }

  function stLayerItems(objects) {
    return (Array.isArray(objects) ? objects : []).map(function (o, i) {
      return {
        id: o && o.id,
        type: o && o.type,
        label: stObjectLabelForAgent(o),
        z: Math.round(stFiniteNumber(o && o.z, 1)),
        readingIndex: i + 1
      };
    }).filter(function (item) { return !!item.id; }).sort(function (a, b) {
      var dz = b.z - a.z;
      return dz || (b.readingIndex - a.readingIndex);
    });
  }

  function stReadingOrderSuggestion(doc) {
    var objects = (doc && Array.isArray(doc.objects)) ? doc.objects : [];
    var canvas = doc && doc.canvas;
    var items = objects.map(function (o, i) {
      var f = stClampFrame(o && o.frame, canvas);
      return {
        id: o && o.id,
        type: o && o.type,
        label: stObjectLabelForAgent(o),
        currentIndex: i,
        frame: f
      };
    }).filter(function (item) { return !!item.id; });
    var suggested = items.slice().sort(function (a, b) {
      var rowBand = Math.max(16, Math.min(72, Math.min(a.frame.h || 16, b.frame.h || 16) * 0.55));
      var dy = a.frame.y - b.frame.y;
      if (Math.abs(dy) > rowBand) return dy;
      var dx = a.frame.x - b.frame.x;
      if (Math.abs(dx) > 1) return dx;
      return a.currentIndex - b.currentIndex;
    }).map(function (item, i) {
      return Object.assign({}, item, { suggestedIndex: i });
    });
    var byId = {};
    suggested.forEach(function (item) { byId[item.id] = item; });
    var currentIds = items.map(function (item) { return item.id; });
    var suggestedIds = suggested.map(function (item) { return item.id; });
    var changes = suggested.filter(function (item, i) { return currentIds[i] !== item.id; }).map(function (item) {
      return {
        id: item.id,
        label: item.label,
        type: item.type,
        currentIndex: item.currentIndex,
        suggestedIndex: item.suggestedIndex
      };
    });
    return {
      total: items.length,
      changed: changes.length > 0,
      currentIds: currentIds,
      suggestedIds: suggestedIds,
      suggested: suggested,
      changes: changes,
      itemForId: byId
    };
  }

  function stStyleKits(brandProfile) {
    var kits = [
      { key: 'print', name: 'Print clean', background: '#ffffff', heading: '#111827', body: '#1f2937', shape: '#f8fafc' },
      { key: 'calm', name: 'Calm focus', background: '#f8fafc', heading: '#0f766e', body: '#134e4a', shape: '#ccfbf1' },
      { key: 'bold', name: 'Clear color', background: '#ffffff', heading: '#1d4ed8', body: '#111827', shape: '#dbeafe' },
      { key: 'contrast', name: 'High contrast', background: '#ffffff', heading: '#000000', body: '#000000', shape: '#f3f4f6' }
    ];
    var brand = stBrandStyleKit(brandProfile);
    if (brand) kits.unshift(brand);
    return kits;
  }

  function stStyleKitPatch(doc, key, brandProfile) {
    var kits = stStyleKits(brandProfile);
    var kit = kits.filter(function (k) { return k.key === key; })[0] || kits[0];
    var patches = [];
    ((doc && doc.objects) || []).forEach(function (o) {
      if (!o || !o.id) return;
      if (o.type === 'text') {
        var runs = stClone(o.runs || [{ text: '', style: {} }]);
        if (!runs[0]) runs[0] = { text: '', style: {} };
        var isHeading = /^heading/.test(o.role || '');
        runs[0].style = Object.assign({}, runs[0].style, { color: isHeading ? kit.heading : kit.body });
        // Only the brand kit carries fonts — stock kits leave fonts alone.
        if (kit.bodyFont) runs[0].style.font = isHeading ? (kit.headingFont || kit.bodyFont) : kit.bodyFont;
        patches.push({ id: o.id, patch: { runs: runs } });
      } else if (o.type === 'shape') {
        patches.push({ id: o.id, patch: { fill: kit.shape } });
      }
    });
    return { key: kit.key, name: kit.name, canvasFill: kit.background, patches: patches };
  }

  function stSelectionObjects(objects, ids) {
    var wanted = {};
    (Array.isArray(ids) ? ids : []).forEach(function (id) { if (id != null) wanted[String(id)] = true; });
    return (Array.isArray(objects) ? objects : []).filter(function (o) { return o && o.id != null && wanted[String(o.id)]; });
  }

  function stSelectionBounds(objects, ids) {
    var items = stSelectionObjects(objects, ids).filter(function (o) { return o.frame; });
    if (!items.length) return null;
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    items.forEach(function (o) {
      var f = o.frame || {};
      var x = stFiniteNumber(f.x, 0), y = stFiniteNumber(f.y, 0), w = Math.max(1, stFiniteNumber(f.w, 1)), h = Math.max(1, stFiniteNumber(f.h, 1));
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w); maxY = Math.max(maxY, y + h);
    });
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  function stAlignFramesAsGroup(objects, ids, mode) {
    var bounds = stSelectionBounds(objects, ids);
    if (!bounds) return [];
    return stSelectionObjects(objects, ids).map(function (o) {
      var f = stClone(o.frame || { x: 0, y: 0, w: 1, h: 1 });
      if (mode === 'left') f.x = bounds.x;
      else if (mode === 'hcenter') f.x = bounds.x + (bounds.w - f.w) / 2;
      else if (mode === 'right') f.x = bounds.x + bounds.w - f.w;
      else if (mode === 'top') f.y = bounds.y;
      else if (mode === 'vcenter') f.y = bounds.y + (bounds.h - f.h) / 2;
      else if (mode === 'bottom') f.y = bounds.y + bounds.h - f.h;
      return { id: o.id, frame: f };
    });
  }

  function stDistributeFramesAsGroup(objects, ids, axis) {
    var key = axis === 'y' ? 'y' : 'x';
    var sizeKey = key === 'x' ? 'w' : 'h';
    var items = stSelectionObjects(objects, ids).filter(function (o) { return o.frame; }).sort(function (a, b) {
      return stFiniteNumber(a.frame[key], 0) - stFiniteNumber(b.frame[key], 0);
    });
    if (items.length < 3) return [];
    var first = items[0].frame;
    var last = items[items.length - 1].frame;
    var start = stFiniteNumber(first[key], 0);
    var end = stFiniteNumber(last[key], 0) + Math.max(1, stFiniteNumber(last[sizeKey], 1));
    var total = items.reduce(function (sum, o) { return sum + Math.max(1, stFiniteNumber(o.frame[sizeKey], 1)); }, 0);
    var gap = (end - start - total) / (items.length - 1);
    if (!isFinite(gap)) return [];
    var cursor = start;
    return items.map(function (o) {
      var f = stClone(o.frame);
      f[key] = cursor;
      cursor += Math.max(1, stFiniteNumber(f[sizeKey], 1)) + gap;
      return { id: o.id, frame: f };
    });
  }

  function stMoveFramesAsGroup(objects, ids, dx, dy, canvas) {
    var deltaX = stFiniteNumber(dx, 0);
    var deltaY = stFiniteNumber(dy, 0);
    return stSelectionObjects(objects, ids).filter(function (o) { return o.frame; }).map(function (o) {
      var f = stClone(o.frame);
      f.x = stFiniteNumber(f.x, 0) + deltaX;
      f.y = stFiniteNumber(f.y, 0) + deltaY;
      return { id: o.id, frame: canvas ? stClampFrame(f, canvas) : f };
    });
  }

  function stStudioLayout(width, height) {
    var w = Math.max(320, Math.round(stFiniteNumber(width, 1220)));
    var h = Math.max(360, Math.round(stFiniteNumber(height, 860)));
    var phone = w < 720;
    var stacked = phone || w < 1040 || h < 620;
    var compact = stacked || w < 1180;
    return {
      mode: phone ? 'phone' : (stacked ? 'stacked' : (compact ? 'compact' : 'desktop')),
      compact: compact,
      stacked: stacked,
      overlayPadding: phone ? '0' : '12px',
      shellWidth: phone ? '100vw' : 'min(1220px, 98vw)',
      shellHeight: phone ? '100dvh' : 'min(860px, 96vh)',
      shellRadius: phone ? 0 : 14,
      headerWrap: compact ? 'wrap' : 'nowrap',
      titleWidth: phone ? 'min(100%, 210px)' : (compact ? '190px' : '220px'),
      buttonPadding: compact ? '5px 9px' : '6px 12px',
      panelWidth: stacked ? 'auto' : '215px',
      inspectorWidth: stacked ? 'auto' : '250px',
      panelMaxHeight: phone ? '26dvh' : (stacked ? '24vh' : 'none'),
      inspectorMaxHeight: phone ? '32dvh' : (stacked ? '28vh' : 'none'),
      canvasPadding: phone ? 8 : (compact ? 12 : 18),
      canvasScale: phone ? 0.42 : (stacked ? 0.52 : 0.62),
      readingListMaxHeight: stacked ? '132px' : '38%'
    };
  }

  function stCanvasFitScale(canvas, layout, viewport) {
    var l = layout || stStudioLayout();
    var c = canvas || ST_CANVAS_PRESETS['letter-portrait'];
    var vw = stFiniteNumber(viewport && viewport.w, 1220);
    var base = stFiniteNumber(l.canvasScale, 0.62);
    if (!l.stacked) return base;
    var pad = stFiniteNumber(l.canvasPadding, 12);
    var available = Math.max(260, vw - (pad * 2) - 18);
    return Math.max(0.34, Math.min(base, available / Math.max(1, stFiniteNumber(c.w, 816))));
  }

  function stAdjustCanvasZoom(current, action, fitScale) {
    var fit = Math.max(0.25, Math.min(1.5, stFiniteNumber(fitScale, 0.62)));
    var cur = (current === null || current === undefined || current === 'fit') ? fit : stFiniteNumber(current, fit);
    var next = cur;
    if (action === 'fit') return null;
    if (action === 'actual') next = 1;
    else if (action === 'in') next = cur + 0.1;
    else if (action === 'out') next = cur - 0.1;
    next = Math.max(0.25, Math.min(1.5, next));
    return Math.round(next * 100) / 100;
  }

  function stSnapFrame(frame, canvas, objects, options) {
    options = options || {};
    var c = canvas || ST_CANVAS_PRESETS['letter-portrait'];
    var threshold = Math.max(1, Math.min(24, stFiniteNumber(options.threshold, 8)));
    var f = stClampFrame(frame, c);
    var raw = Object.assign({}, f, {
      x: stFiniteNumber(frame && frame.x, f.x),
      y: stFiniteNumber(frame && frame.y, f.y)
    });
    var xCandidates = [
      { value: 0, label: 'page left' },
      { value: 48, label: 'left margin' },
      { value: c.w / 2, label: 'page center' },
      { value: c.w - 48, label: 'right margin' },
      { value: c.w, label: 'page right' }
    ];
    var yCandidates = [
      { value: 0, label: 'page top' },
      { value: 48, label: 'top margin' },
      { value: c.h / 2, label: 'page middle' },
      { value: c.h - 48, label: 'bottom margin' },
      { value: c.h, label: 'page bottom' }
    ];
    (Array.isArray(objects) ? objects : []).forEach(function (o) {
      if (!o || !o.frame) return;
      var of = stClampFrame(o.frame, c);
      xCandidates.push({ value: of.x, label: 'object left' }, { value: of.x + of.w / 2, label: 'object center' }, { value: of.x + of.w, label: 'object right' });
      yCandidates.push({ value: of.y, label: 'object top' }, { value: of.y + of.h / 2, label: 'object middle' }, { value: of.y + of.h, label: 'object bottom' });
    });
    function best(axis, candidates) {
      var probes = axis === 'x'
        ? [{ edge: 'start', value: raw.x }, { edge: 'center', value: raw.x + raw.w / 2 }, { edge: 'end', value: raw.x + raw.w }]
        : [{ edge: 'start', value: raw.y }, { edge: 'center', value: raw.y + raw.h / 2 }, { edge: 'end', value: raw.y + raw.h }];
      var out = null;
      probes.forEach(function (probe) {
        candidates.forEach(function (candidate) {
          var delta = candidate.value - probe.value;
          if (Math.abs(delta) <= threshold && (!out || Math.abs(delta) < Math.abs(out.delta))) {
            out = { axis: axis, edge: probe.edge, value: Math.round(candidate.value), label: candidate.label, delta: delta };
          }
        });
      });
      return out;
    }
    var sx = best('x', xCandidates);
    var sy = best('y', yCandidates);
    if (sx) raw.x += sx.delta;
    if (sy) raw.y += sy.delta;
    var snapped = stClampFrame(raw, c);
    return { frame: snapped, guides: [sx, sy].filter(Boolean).map(function (g) { return { axis: g.axis, value: g.value, label: g.label }; }) };
  }

  function stObjectForAgent(o) {
    if (!o || !o.id) return null;
    var out = { id: o.id, type: o.type, frame: stClone(o.frame || {}), z: stFiniteNumber(o.z, 1) };
    if (o.type === 'text') {
      var run = (o.runs && o.runs[0]) || { text: '', style: {} };
      var s = run.style || {};
      out.role = stSafeTextRole(o.role);
      out.text = stCleanText(run.text, 3000);
      out.style = { size: Math.max(8, Math.min(120, stFiniteNumber(s.size, 16))), color: stSafeCssColor(s.color, '#111827'), bold: !!s.bold, align: stSafeAlign(s.align) };
    } else if (o.type === 'shape') {
      out.shape = stSafeShape(o.shape);
      out.fill = stSafeCssColor(o.fill, '#dbeafe');
      out.decorative = o.decorative !== false;
    } else if (o.type === 'image') {
      out.hasImage = !!o.src;
      out.alt = stCleanText(o.alt, 500);
      out.decorative = !!o.decorative;
      out.fit = o.fit === 'contain' ? 'contain' : 'cover';
      out.origin = (o.provenance && o.provenance.origin) || 'unknown';
    }
    return out;
  }

  function stAgentScopeIds(doc, scope, ids) {
    var objects = (doc && Array.isArray(doc.objects)) ? doc.objects : [];
    var all = objects.map(function (o) { return o && o.id; }).filter(Boolean);
    var requested = (Array.isArray(ids) ? ids : []).filter(function (id) { return all.indexOf(id) >= 0; });
    if (scope === 'selection' && requested.length) return requested;
    return all;
  }

  function stBuildAgentScope(doc, scope, ids) {
    var objects = (doc && Array.isArray(doc.objects)) ? doc.objects : [];
    var selection = stAgentScopeIds(doc, scope, ids);
    var actualScope = (scope === 'selection' && selection.length) ? 'selection' : 'document';
    var allowed = actualScope === 'selection' ? selection : objects.map(function (o) { return o && o.id; }).filter(Boolean);
    var analysis = doc ? stAnalyzeDoc(doc) : { counts: { error: 0, warning: 0, review: 0 } };
    return {
      title: (doc && doc.title) || 'Untitled',
      scope: actualScope,
      selectedIds: actualScope === 'selection' ? allowed.slice() : [],
      canvas: {
        preset: doc && doc.canvas && doc.canvas.preset,
        w: doc && doc.canvas && doc.canvas.w,
        h: doc && doc.canvas && doc.canvas.h,
        background: doc && doc.canvas && doc.canvas.background ? { fill: stSafeCssColor(doc.canvas.background.fill, '#ffffff') } : { fill: '#ffffff' }
      },
      accessibility: { counts: stClone(analysis.counts) },
      objects: objects.filter(function (o) { return allowed.indexOf(o && o.id) >= 0; }).map(stObjectForAgent).filter(Boolean)
    };
  }

  function stAgentTextRuns(target, patch) {
    var base = (target.runs && target.runs[0]) || { text: '', style: {} };
    var source = (patch.runs && patch.runs[0]) || {};
    var sourceStyle = Object.assign({}, source.style || {}, patch.style || {});
    var baseStyle = base.style || {};
    var hasText = Object.prototype.hasOwnProperty.call(patch, 'text') || Object.prototype.hasOwnProperty.call(source, 'text');
    var text = hasText ? (Object.prototype.hasOwnProperty.call(patch, 'text') ? patch.text : source.text) : base.text;
    var styleOut = {
      size: Math.max(8, Math.min(120, stFiniteNumber(sourceStyle.size, stFiniteNumber(baseStyle.size, 16)))),
      color: stSafeCssColor(sourceStyle.color, stSafeCssColor(baseStyle.color, '#111827')),
      bold: Object.prototype.hasOwnProperty.call(sourceStyle, 'bold') ? !!sourceStyle.bold : !!baseStyle.bold,
      align: stSafeAlign(sourceStyle.align || baseStyle.align)
    };
    // The model may only pick font KEYS — a raw stack from the model is
    // ignored (the teacher's existing font, if any, is kept instead).
    var fontPick = ST_FONT_STACKS[sourceStyle.font] || (typeof baseStyle.font === 'string' ? baseStyle.font : null);
    if (fontPick) styleOut.font = fontPick;
    return [{
      text: String(text == null ? '' : text).slice(0, 4000),
      style: styleOut
    }];
  }

  function stNormalizeAgentPatch(target, patch, canvas) {
    patch = patch && typeof patch === 'object' ? patch : {};
    var out = {};
    if (patch.frame) out.frame = stClampFrame(patch.frame, canvas);
    if (target.type === 'text') {
      if (patch.runs || Object.prototype.hasOwnProperty.call(patch, 'text') || patch.style) out.runs = stAgentTextRuns(target, patch);
      if (patch.role) out.role = stSafeTextRole(patch.role);
    } else if (target.type === 'shape') {
      if (patch.fill) out.fill = stSafeCssColor(patch.fill, target.fill || '#dbeafe');
      if (patch.shape) out.shape = stSafeShape(patch.shape);
    } else if (target.type === 'image') {
      if (Object.prototype.hasOwnProperty.call(patch, 'alt')) out.alt = stCleanText(patch.alt, 500);
      if (Object.prototype.hasOwnProperty.call(patch, 'decorative')) out.decorative = !!patch.decorative;
      if (patch.fit === 'contain' || patch.fit === 'cover') out.fit = patch.fit;
    }
    return out;
  }

  // Per-plan cap on NEW objects (adds + image requests). Updates already ride
  // the overall 30-op slice; adds get a tighter budget because every one grows
  // the document the teacher has to review.
  var ST_AGENT_MAX_ADDS = 12;

  // The model may propose NEW objects, but only text and shapes, and only
  // through the same constructors user insertion uses — never raw objects.
  // No ids (stAppend mints them at apply), no src (pixels enter only via
  // image.request → the host's Imagen seam), no unknown fields survive.
  function stSanitizeAgentAdd(op, canvas) {
    var raw = (op && op.object && typeof op.object === 'object') ? op.object : {};
    var frame = stClampFrame(raw.frame || { x: 60, y: 60, w: 380, h: 60 }, canvas);
    if (raw.type === 'text') {
      var srcRun = (raw.runs && raw.runs[0]) || {};
      var text = stCleanText(Object.prototype.hasOwnProperty.call(raw, 'text') ? raw.text : srcRun.text, 4000);
      if (!text) return null;
      var role = stSafeTextRole(raw.role);
      var style = Object.assign({}, srcRun.style || {}, raw.style || {});
      var obj = stMakeText(role, text, frame, {
        size: Math.max(8, Math.min(120, stFiniteNumber(style.size, role === 'heading1' ? 44 : role === 'heading2' ? 28 : 16))),
        color: stSafeCssColor(style.color, '#111827'),
        align: stSafeAlign(style.align)
      });
      if (Object.prototype.hasOwnProperty.call(style, 'bold')) obj.runs[0].style.bold = !!style.bold;
      if (ST_FONT_STACKS[style.font]) obj.runs[0].style.font = ST_FONT_STACKS[style.font];
      return obj;
    }
    if (raw.type === 'shape') {
      return stMakeShape(stSafeShape(raw.shape), frame, stSafeCssColor(raw.fill, '#dbeafe'));
    }
    return null;
  }

  function stNormalizeAgentPlan(plan, doc, options) {
    options = options || {};
    var objects = (doc && Array.isArray(doc.objects)) ? doc.objects : [];
    var scopeName = options.scope || (plan && plan.scope);
    var allowedIds = stAgentScopeIds(doc, scopeName, options.ids);
    var raw = Array.isArray(plan) ? plan : (Array.isArray(plan && plan.ops) ? plan.ops : (Array.isArray(plan && plan.changes) ? plan.changes : []));
    var out = [];
    var rejected = [];
    var added = 0;
    raw.slice(0, 30).forEach(function (op) {
      if (!op || typeof op !== 'object') { rejected.push('Invalid change'); return; }
      if (op.type === 'object.update') {
        var target = objects.filter(function (o) { return o && o.id === op.target; })[0];
        if (!target || allowedIds.indexOf(op.target) < 0) { rejected.push('Skipped change outside scope'); return; }
        var patch = stNormalizeAgentPatch(target, op.patch || {}, doc.canvas);
        if (!Object.keys(patch).length) { rejected.push('Skipped empty object change'); return; }
        out.push({ type: 'object.update', target: op.target, patch: patch });
        return;
      }
      if (op.type === 'object.add') {
        if (added >= ST_AGENT_MAX_ADDS) { rejected.push('Skipped new object beyond the per-plan limit'); return; }
        var obj = stSanitizeAgentAdd(op, doc && doc.canvas);
        if (!obj) { rejected.push('Skipped unsupported new object (only text and shapes; images go through an image request)'); return; }
        added++;
        out.push({ type: 'object.add', object: obj });
        return;
      }
      if (op.type === 'image.request') {
        if (added >= ST_AGENT_MAX_ADDS) { rejected.push('Skipped new object beyond the per-plan limit'); return; }
        var imgPrompt = stCleanText(op.prompt, 600);
        if (!imgPrompt) { rejected.push('Skipped image request without a description'); return; }
        added++;
        out.push({ type: 'image.request', prompt: imgPrompt, frame: stClampFrame(op.frame || { x: 120, y: 120, w: 360, h: 270 }, doc && doc.canvas) });
        return;
      }
      if (op.type === 'object.remove') {
        var gone = objects.filter(function (o) { return o && o.id === op.target; })[0];
        if (!gone || allowedIds.indexOf(op.target) < 0) { rejected.push('Skipped removal outside scope'); return; }
        out.push({ type: 'object.remove', target: op.target });
        return;
      }
      if (op.type === 'object.reorder') {
        var moved = objects.filter(function (o) { return o && o.id === op.target; })[0];
        if (!moved || allowedIds.indexOf(op.target) < 0) { rejected.push('Skipped reorder outside scope'); return; }
        if (!stIsFiniteNumber(op.toIndex)) { rejected.push('Skipped reorder without a position'); return; }
        out.push({ type: 'object.reorder', target: op.target, toIndex: Math.max(0, Math.min(Math.round(op.toIndex), Math.max(0, objects.length - 1))) });
        return;
      }
      if (op.type === 'doc.retitle') {
        if (scopeName === 'selection') { rejected.push('Skipped title change for selection scope'); return; }
        var title = stCleanText(op.title, 140);
        if (!title) { rejected.push('Skipped empty title'); return; }
        out.push({ type: 'doc.retitle', title: title });
        return;
      }
      if (op.type === 'canvas.background') {
        if (scopeName === 'selection') { rejected.push('Skipped page background change for selection scope'); return; }
        out.push({ type: 'canvas.background', fill: stSafeCssColor(op.fill, '#ffffff') });
        return;
      }
      rejected.push('Unsupported change type');
    });
    return {
      summary: stCleanText((plan && (plan.summary || plan.title)) || (out.length ? out.length + ' change(s) ready' : 'No safe changes found'), 220),
      ops: out,
      rejected: rejected
    };
  }

  function stObjectLabelForAgent(o) {
    if (!o) return 'Document';
    if (o.type === 'text') {
      var txt = stCleanText(o.runs && o.runs[0] && o.runs[0].text, 48);
      if (txt) return txt;
      return /^heading/.test(o.role || '') ? 'Heading' : 'Text block';
    }
    if (o.type === 'image') {
      var alt = stCleanText(o.alt, 48);
      return alt ? 'Image: ' + alt : 'Image';
    }
    return o.shape === 'ellipse' ? 'Ellipse' : 'Rectangle';
  }

  function stFrameSummary(frame) {
    var f = frame || {};
    return 'x ' + stFiniteNumber(f.x, 0) + ', y ' + stFiniteNumber(f.y, 0) + ', w ' + stFiniteNumber(f.w, 0) + ', h ' + stFiniteNumber(f.h, 0);
  }

  function stDescribeAgentChange(op, doc, index) {
    var info = {
      targetId: op && op.target ? op.target : null,
      title: 'Change ' + ((index || 0) + 1),
      objectLabel: 'Document',
      kind: 'Document',
      notes: [],
      before: '',
      after: '',
      safety: 'Previewed before apply'
    };
    if (!op || typeof op !== 'object') return info;
    if (op.type === 'canvas.background') {
      info.title = 'Page background';
      info.kind = 'Background';
      info.notes.push('Background changed');
      var currentFill = doc && doc.canvas && doc.canvas.background && doc.canvas.background.fill;
      info.before = stSafeCssColor(currentFill, '#ffffff');
      info.after = stSafeCssColor(op.fill, '#ffffff');
      return info;
    }
    if (op.type === 'doc.retitle') {
      info.title = 'Document title';
      info.kind = 'Document';
      info.notes.push('Title changed');
      info.before = stCleanText(doc && doc.title, 120);
      info.after = stCleanText(op.title, 120);
      return info;
    }
    if (op.type === 'object.add') {
      var addKind = op.object && op.object.type;
      info.objectLabel = stObjectLabelForAgent(op.object);
      info.title = (addKind === 'text' ? 'Add text: ' : 'Add shape: ') + info.objectLabel;
      info.kind = addKind === 'text' ? 'New text' : 'New shape';
      info.notes.push('New object');
      info.after = addKind === 'text'
        ? stCleanText(op.object && op.object.runs && op.object.runs[0] && op.object.runs[0].text, 220)
        : stFrameSummary(op.object && op.object.frame);
      info.safety = 'Added at the end of the reading order — reorder after applying if needed';
      return info;
    }
    if (op.type === 'image.request') {
      info.title = 'Generate image';
      info.kind = 'New image';
      info.notes.push('Image is generated when you apply');
      info.after = stCleanText(op.prompt, 220);
      info.safety = 'Alt text is still required before export';
      return info;
    }
    var objects = (doc && Array.isArray(doc.objects)) ? doc.objects : [];
    var target = objects.filter(function (o) { return o && o.id === op.target; })[0];
    info.objectLabel = stObjectLabelForAgent(target);
    if (op.type === 'object.remove') {
      info.title = 'Remove: ' + info.objectLabel;
      info.kind = target && target.type ? target.type.charAt(0).toUpperCase() + target.type.slice(1) : 'Object';
      info.notes.push('Object removed');
      info.before = info.objectLabel;
      info.safety = 'Undo restores it';
      return info;
    }
    if (op.type === 'object.reorder') {
      var fromIdx = -1;
      objects.forEach(function (o, i) { if (o && o.id === op.target) fromIdx = i; });
      info.title = 'Reading order: ' + info.objectLabel;
      info.kind = 'Reading order';
      info.notes.push('Reading order changed');
      info.before = 'Position ' + (fromIdx + 1);
      info.after = 'Position ' + (Math.round(stFiniteNumber(op.toIndex, fromIdx)) + 1);
      info.safety = 'Screen readers follow this order';
      return info;
    }
    var patch = op.patch || {};
    info.title = info.objectLabel;
    info.kind = target && target.type ? target.type.charAt(0).toUpperCase() + target.type.slice(1) : 'Object';
    if (patch.runs) {
      var beforeText = target && target.runs && target.runs[0] ? target.runs[0].text : '';
      var afterText = patch.runs && patch.runs[0] ? patch.runs[0].text : beforeText;
      if (String(beforeText) !== String(afterText)) {
        info.notes.push('Text changed');
        info.before = stCleanText(beforeText, 220);
        info.after = stCleanText(afterText, 220);
      }
      info.notes.push('Text style checked');
    }
    if (patch.role) {
      info.notes.push('Tag role changed');
      if (!info.before) info.before = target && target.role ? target.role : '';
      if (!info.after) info.after = patch.role;
    }
    if (patch.frame) {
      info.notes.push('Layout changed');
      if (!info.before) info.before = stFrameSummary(target && target.frame);
      if (!info.after) info.after = stFrameSummary(patch.frame);
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'alt')) {
      info.notes.push('Alt text changed');
      if (!info.before) info.before = stCleanText(target && target.alt, 220);
      if (!info.after) info.after = stCleanText(patch.alt, 220);
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'decorative')) {
      info.notes.push('Decorative setting changed');
      if (!info.before) info.before = target && target.decorative ? 'Decorative' : 'Content image';
      if (!info.after) info.after = patch.decorative ? 'Decorative' : 'Content image';
    }
    if (patch.fill) {
      info.notes.push('Fill changed');
      if (!info.before) info.before = target && target.fill ? target.fill : '';
      if (!info.after) info.after = patch.fill;
    }
    if (patch.fit) {
      info.notes.push('Image fit changed');
      if (!info.before) info.before = target && target.fit ? target.fit : 'cover';
      if (!info.after) info.after = patch.fit;
    }
    if (target && target.type === 'image') info.safety = 'No image pixels changed';
    if (!info.notes.length) info.notes.push('Object settings changed');
    return info;
  }

  // ── Agent plan batching: ops applied from one AI proposal share a batch tag
  // (stAppend clones extra opBody fields, so the tag + the teacher's request
  // live in the ledger itself — attribution by construction, and the whole
  // batch reverts in one gesture instead of N undo presses). ──
  function stLastAgentBatch(doc) {
    var ops = doc && doc.ledger && Array.isArray(doc.ledger.ops) ? doc.ledger.ops : [];
    if (!ops.length) return null;
    var tail = ops[ops.length - 1];
    var batch = tail && tail.agent && tail.agent.batch;
    if (!batch) return null;
    var count = 0;
    var prompt = '';
    for (var i = ops.length - 1; i >= 0; i--) {
      var a = ops[i] && ops[i].agent;
      if (!a || a.batch !== batch) break;
      count++;
      if (a.prompt) prompt = a.prompt;
    }
    return { batch: batch, count: count, prompt: prompt };
  }

  function stUndoAgentBatch(doc) {
    var info = stLastAgentBatch(doc);
    if (!info) return 0;
    var before = doc.ledger.ops.length;
    var tail = doc.ledger.ops[before - 1];
    if (stOpGestureId(tail)) {
      stUndo(doc);
      return before - doc.ledger.ops.length;
    }
    var undone = 0;
    while (undone < info.count && stUndo(doc)) undone++;
    return undone;
  }

  // Did an applied plan help or hurt? Errors outrank totals: a plan that trades
  // one contrast warning for a new alt-text ERROR is 'worse' even if the count
  // fell. Drives the honest post-apply toast + the offer to undo the batch.
  function stPreflightDelta(before, after) {
    var b = before || {};
    var a = after || {};
    var be = stFiniteNumber(b.error, 0), ae = stFiniteNumber(a.error, 0);
    var bTotal = be + stFiniteNumber(b.warning, 0) + stFiniteNumber(b.review, 0);
    var aTotal = ae + stFiniteNumber(a.warning, 0) + stFiniteNumber(a.review, 0);
    var direction = ae > be ? 'worse' : ae < be ? 'better' : aTotal > bTotal ? 'worse' : aTotal < bTotal ? 'better' : 'same';
    return { direction: direction, before: bTotal, after: aTotal, text: 'Accessibility check: ' + bTotal + ' -> ' + aTotal + ' open item(s)' };
  }

  // School brand (BrandProfile module) as a one-tap style kit. Hex re-checked
  // here (defense-in-depth) so a hand-edited localStorage profile can't push
  // arbitrary CSS through the studio even if the brand module's guards change.
  function stBrandStyleKit(profile) {
    if (!profile || typeof profile !== 'object') return null;
    var colors = (profile.colors && typeof profile.colors === 'object') ? profile.colors : null;
    if (!colors) return null;
    var hex = function (v, fb) { return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(String(v || '')) ? String(v) : fb; };
    var fonts = (profile.fonts && typeof profile.fonts === 'object') ? profile.fonts : {};
    var bodyFont = fonts.body ? stSafeFontFamily(fonts.body) : null;
    var headingFont = fonts.heading ? stSafeFontFamily(fonts.heading) : bodyFont;
    return {
      key: 'brand',
      name: stCleanText(profile.name, 22) || 'School brand',
      background: hex(colors.bg, '#ffffff'),
      heading: hex(colors.heading, '#1e3a5f'),
      body: hex(colors.body, '#1f2937'),
      shape: hex(colors.cardBg, '#f8fafc'),
      bodyFont: bodyFont,
      headingFont: headingFont
    };
  }

  function stUiStatusTone(themeName, tone) {
    var theme = themeName === 'dark' || themeName === 'contrast' ? themeName : 'light';
    var key = tone === 'error' || tone === 'warning' || tone === 'success' ? tone : 'review';
    var palettes = {
      light: {
        error: { bg: '#fee2e2', fg: '#7f1d1d', border: '#fecaca' },
        warning: { bg: '#fef3c7', fg: '#78350f', border: '#fde68a' },
        success: { bg: '#dcfce7', fg: '#166534', border: '#bbf7d0' },
        review: { bg: '#ffffff', fg: '#0f172a', border: '#cbd5e1' }
      },
      dark: {
        error: { bg: '#450a0a', fg: '#fecaca', border: '#f87171' },
        warning: { bg: '#451a03', fg: '#fde68a', border: '#f59e0b' },
        success: { bg: '#052e16', fg: '#bbf7d0', border: '#22c55e' },
        review: { bg: '#111827', fg: '#f8fafc', border: '#475569' }
      },
      contrast: {
        error: { bg: '#000000', fg: '#ffffff', border: '#ffff00' },
        warning: { bg: '#000000', fg: '#ffff00', border: '#ffff00' },
        success: { bg: '#000000', fg: '#ffffff', border: '#ffff00' },
        review: { bg: '#000000', fg: '#ffffff', border: '#ffff00' }
      }
    };
    return palettes[theme][key];
  }

  function stCropPresetRect(key) {
    if (key === 'full') return { x: 0, y: 0, w: 1, h: 1 };
    if (key === 'top') return { x: 0, y: 0, w: 1, h: 0.5 };
    if (key === 'bottom') return { x: 0, y: 0.5, w: 1, h: 0.5 };
    if (key === 'left') return { x: 0, y: 0, w: 0.5, h: 1 };
    if (key === 'right') return { x: 0.5, y: 0, w: 0.5, h: 1 };
    if (key === 'square') return { x: 0.125, y: 0.125, w: 0.75, h: 0.75 };
    return { x: 0.1, y: 0.1, w: 0.8, h: 0.8 };
  }

  function stAdjustCropRect(rect, action, step) {
    var s = Math.max(0.01, Math.min(0.2, stFiniteNumber(step, 0.04)));
    var r = rect || stCropPresetRect('center');
    var out = {
      x: Math.min(Math.max(stFiniteNumber(r.x, 0.1), 0), 0.95),
      y: Math.min(Math.max(stFiniteNumber(r.y, 0.1), 0), 0.95),
      w: Math.min(Math.max(stFiniteNumber(r.w, 0.8), 0.05), 1),
      h: Math.min(Math.max(stFiniteNumber(r.h, 0.8), 0.05), 1)
    };
    if (action === 'left') out.x -= s;
    else if (action === 'right') out.x += s;
    else if (action === 'up') out.y -= s;
    else if (action === 'down') out.y += s;
    else if (action === 'wider') { out.x -= s / 2; out.w += s; }
    else if (action === 'narrower') { out.x += s / 2; out.w -= s; }
    else if (action === 'taller') { out.y -= s / 2; out.h += s; }
    else if (action === 'shorter') { out.y += s / 2; out.h -= s; }
    out.w = Math.min(Math.max(out.w, 0.05), 1);
    out.h = Math.min(Math.max(out.h, 0.05), 1);
    out.x = Math.min(Math.max(out.x, 0), 1 - out.w);
    out.y = Math.min(Math.max(out.y, 0), 1 - out.h);
    var round = function (v) { return Math.round(v * 10000) / 10000; };
    return { x: round(out.x), y: round(out.y), w: round(out.w), h: round(out.h) };
  }

  function stBuildPortfolioArtifact(doc, opts) {
    opts = opts || {};
    var now = opts.now || new Date().toISOString();
    var analysis = stAnalyzeDoc(doc);
    var lifecycle = analysis.counts.error ? 'draft' : ((analysis.counts.warning || analysis.counts.review) ? 'review' : 'ready');
    var objects = (doc && Array.isArray(doc.objects)) ? doc.objects : [];
    var texts = objects.filter(function (o) { return o && o.type === 'text'; });
    var images = objects.filter(function (o) { return o && o.type === 'image' && o.src; });
    var worksheet = stExportWorksheetData(doc);
    var items = [];
    items.push({
      id: 'overview',
      title: 'Studio product overview',
      toolLabel: 'AlloStudio',
      privacy: 'summary',
      text: 'Objects: ' + objects.length + '. Text blocks: ' + texts.length + '. Images: ' + images.length + '. Accessibility status: ' + lifecycle + '.'
    });
    if (worksheet.questions && worksheet.questions.length) {
      items.push({
        id: 'worksheet-questions',
        title: 'Worksheet questions',
        toolLabel: 'AlloStudio',
        privacy: 'summary',
        text: worksheet.questions.slice(0, 8).map(function (q, i) { return (i + 1) + '. ' + q.prompt; }).join('\n')
      });
    }
    texts.slice(0, 6).forEach(function (o, i) {
      var text = stCleanText(o.runs && o.runs[0] && o.runs[0].text, 900);
      if (!text) return;
      items.push({
        id: o.id || ('text-' + i),
        title: o.role === 'heading1' ? 'Main heading' : o.role === 'heading2' ? 'Section heading' : 'Text block ' + (i + 1),
        toolLabel: 'AlloStudio',
        privacy: 'summary',
        text: text
      });
    });
    images.slice(0, 4).forEach(function (o, i) {
      items.push({
        id: o.id || ('image-' + i),
        title: 'Image ' + (i + 1),
        toolLabel: 'AlloStudio',
        privacy: o.decorative ? 'summary' : 'full',
        text: o.decorative ? 'Decorative image.' : (stCleanText(o.alt, 500) || 'Image has no alt text yet.')
      });
    });
    return {
      id: 'allostudio-' + ((doc && doc.createdAt) || now) + '-' + stSlug(doc && doc.title, 'document'),
      type: 'allostudio-document',
      source: 'allostudio',
      sourceLabel: 'AlloStudio',
      kindLabel: worksheet.questions && worksheet.questions.length ? 'Accessible Worksheet' : 'Accessible Studio Product',
      title: (doc && doc.title) || 'AlloStudio document',
      summary: 'Born-accessible Studio product with ' + objects.length + ' object' + (objects.length === 1 ? '' : 's') + '. Status: ' + lifecycle + '.',
      privacy: 'student-controlled',
      lifecycleStatus: lifecycle,
      version: 1,
      createdAt: doc && doc.createdAt ? new Date(doc.createdAt).toISOString() : now,
      updatedAt: now,
      itemCount: objects.length,
      items: items
    };
  }

  function stRecentProjectSummary(doc, now) {
    now = now || Date.now();
    var at = typeof now === 'number' ? new Date(now).toISOString() : String(now);
    var objects = (doc && Array.isArray(doc.objects)) ? doc.objects : [];
    var analysis = stAnalyzeDoc(doc);
    var textCount = objects.filter(function (o) { return o && o.type === 'text'; }).length;
    var imageCount = objects.filter(function (o) { return o && o.type === 'image'; }).length;
    return {
      id: 'allostudio-' + ((doc && doc.createdAt) || 0) + '-' + stSlug(doc && doc.title, 'document'),
      title: (doc && doc.title) || 'AlloStudio document',
      updatedAt: at,
      createdAt: doc && doc.createdAt ? new Date(doc.createdAt).toISOString() : at,
      objectCount: objects.length,
      textCount: textCount,
      imageCount: imageCount,
      issueCount: analysis.counts.error + analysis.counts.warning + analysis.counts.review,
      blocked: !!analysis.counts.error
    };
  }

  // Convert a normalized selection rect (fractions 0..1 of the image) into an
  // integer pixel crop box clamped to the image, at least 1px each side.
  function stCropBox(imgW, imgH, rect) {
    var W = Math.max(1, Math.round(stFiniteNumber(imgW, 1)));
    var H = Math.max(1, Math.round(stFiniteNumber(imgH, 1)));
    var fx = Math.min(Math.max(stFiniteNumber(rect && rect.x, 0), 0), 1);
    var fy = Math.min(Math.max(stFiniteNumber(rect && rect.y, 0), 0), 1);
    var fw = Math.min(Math.max(stFiniteNumber(rect && rect.w, 1), 0), 1 - fx);
    var fh = Math.min(Math.max(stFiniteNumber(rect && rect.h, 1), 0), 1 - fy);
    var sx = Math.round(fx * W), sy = Math.round(fy * H);
    var sw = Math.max(1, Math.round(fw * W)), sh = Math.max(1, Math.round(fh * H));
    if (sx + sw > W) sw = W - sx;
    if (sy + sh > H) sh = H - sy;
    return { sx: sx, sy: sy, sw: Math.max(1, sw), sh: Math.max(1, sh) };
  }

  // PRIVACY invariant (mirrors the Document Builder crop): cropping REMOVES
  // content, so the pre-crop pixels must not survive where the file is saved.
  // Rewrite the object's src in every ledger op, every checkpoint, AND the live
  // scene to the cropped data — the removed pixels become unrecoverable from the
  // .allostudio.json. A deliberate, documented exception to op-immutability,
  // scoped to image src (so "crop to remove a face/name" actually removes it).
  function stScrubObjectSrc(doc, objId, newSrc) {
    if (!doc || !objId) return;
    ((doc.ledger && doc.ledger.ops) || []).forEach(function (op) {
      if (op.type === 'object.add' && op.object && op.object.id === objId && op.object.type === 'image') op.object.src = newSrc;
      else if (op.type === 'object.update' && op.target === objId && op.patch && Object.prototype.hasOwnProperty.call(op.patch, 'src')) op.patch.src = newSrc;
    });
    ((doc.ledger && doc.ledger.checkpoints) || []).forEach(function (c) {
      ((c && c.objects) || []).forEach(function (o) { if (o && o.id === objId && o.type === 'image') o.src = newSrc; });
    });
    ((doc.objects) || []).forEach(function (o) { if (o && o.id === objId && o.type === 'image') o.src = newSrc; });
  }

  function stExportProcessMarkdown(doc, role) {
    var s = stActorSummary((doc.ledger && doc.ledger.ops) || []);
    var mins = Math.max(1, Math.round(s.activeMs / 60000));
    var lines = ['# ' + (doc.title || 'AlloStudio Process'), '', role === 'student' ? '## My Process' : '## Process Summary', '', '- User edits: ' + s.user, '- AI actions: ' + s.ai, '- Imported items: ' + s.import, '- Approximate active minutes: ' + mins, '', ST_HONESTY_LINE, '', '## Recent Steps'];
    ((doc.ledger && doc.ledger.ops) || []).slice(-20).forEach(function (op) {
      lines.push('- #' + op.seq + ' ' + stDescribeOp(op) + ' (' + op.actor + ')');
    });
    return lines.join('\n');
  }

  // ── Object factories (frames are template/editor concerns; ids minted at append) ──
  function stMakeText(role, text, frame, style) {
    return { type: 'text', role: role, frame: frame, z: 10,
      runs: [{ text: text, style: { size: (style && style.size) || (role === 'heading1' ? 44 : role === 'heading2' ? 28 : 16), color: (style && style.color) || '#111827', bold: role !== 'body', align: (style && style.align) || 'left' } }] };
  }
  function stMakeShape(shape, frame, fill) {
    return { type: 'shape', shape: shape, frame: frame, z: 1, fill: fill || '#dbeafe', decorative: true };
  }
  function stMakeImage(src, alt, frame, origin) {
    return { type: 'image', src: stSafeDataImage(src, ST_MAX_IMAGE_SRC_LENGTH), alt: alt || '', decorative: false, frame: frame, z: 5, fit: 'cover',
      provenance: { origin: origin || 'upload' } };
  }

  // ── Templates (doc §11): every seeded object goes through the LEDGER (actor
  // 'user' — the user chose the template), so replay-from-zero always holds and
  // the Process tab shows the seeding honestly ("doc.template" marker first). ──
  function stTemplates() {
    return [
      { key: 'flyer', emoji: '📣', name: 'Event flyer', desc: 'Hero heading, image, details block — the classic classroom flyer.',
        make: function (now) {
          var d = stCreateDoc('letter-portrait', 'Event flyer', now);
          stAppend(d, { type: 'doc.template', template: 'flyer' }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeShape('rect', { x: 0, y: 0, w: 816, h: 200 }, '#dbeafe') }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('heading1', 'Your Event Title', { x: 48, y: 60, w: 720, h: 80 }, { align: 'center' }) }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeImage('', '', { x: 208, y: 240, w: 400, h: 300 }, 'upload') }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('heading2', 'When & where', { x: 48, y: 580, w: 720, h: 44 }) }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('body', 'Date, time, location, and what to bring. Replace this with your details.', { x: 48, y: 640, w: 720, h: 120 }) }, 'user', now);
          return d;
        } },
      { key: 'worksheet', emoji: '📝', name: 'Worksheet', desc: 'Title, instructions, numbered question blocks with answer space.',
        make: function (now) {
          var d = stCreateDoc('letter-portrait', 'Worksheet', now);
          stAppend(d, { type: 'doc.template', template: 'worksheet' }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('heading1', 'Worksheet title', { x: 48, y: 40, w: 720, h: 60 }, { size: 32 }) }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeShape('rect', { x: 48, y: 120, w: 720, h: 90 }, '#fef9c3') }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('body', 'Instructions: read each question and write your answer in the space below it.', { x: 64, y: 140, w: 688, h: 56 }) }, 'user', now);
          var y = 250;
          for (var q = 1; q <= 3; q++) {
            stAppend(d, { type: 'object.add', object: stMakeText('heading2', q + '. Question ' + q, { x: 48, y: y, w: 720, h: 40 }, { size: 20 }) }, 'user', now);
            stAppend(d, { type: 'object.add', object: stMakeShape('rect', { x: 48, y: y + 48, w: 720, h: 120 }, '#f1f5f9') }, 'user', now);
            y += 200;
          }
          return d;
        } },
      { key: 'poster', emoji: '🙋', name: 'Student poster ("About Me")', desc: 'Big title, image frames, caption text — first-week classic.',
        make: function (now) {
          var d = stCreateDoc('letter-portrait', 'About Me', now);
          stAppend(d, { type: 'doc.template', template: 'poster' }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeShape('rect', { x: 0, y: 0, w: 816, h: 1056 }, '#f0fdf4') }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('heading1', 'All About Me', { x: 48, y: 48, w: 720, h: 80 }, { align: 'center' }) }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeImage('', '', { x: 88, y: 180, w: 300, h: 300 }, 'upload') }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeImage('', '', { x: 428, y: 180, w: 300, h: 300 }, 'upload') }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('heading2', 'Three things about me', { x: 48, y: 540, w: 720, h: 44 }) }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('body', '1. …\n2. …\n3. …', { x: 48, y: 600, w: 720, h: 160 }) }, 'user', now);
          return d;
        } },
      { key: 'exitTicket', emoji: 'OK', name: 'Exit ticket', desc: 'One prompt with quick reflection spaces for the end of class.',
        make: function (now) {
          var d = stCreateDoc('letter-portrait', 'Exit Ticket', now);
          stAppend(d, { type: 'doc.template', template: 'exitTicket' }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('heading1', 'Exit Ticket', { x: 48, y: 44, w: 720, h: 64 }, { size: 38 }) }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('body', 'Today I learned...', { x: 64, y: 150, w: 688, h: 54 }, { size: 22 }) }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeShape('rect', { x: 64, y: 214, w: 688, h: 180 }, '#f8fafc') }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('body', 'One question I still have...', { x: 64, y: 440, w: 688, h: 54 }, { size: 22 }) }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeShape('rect', { x: 64, y: 504, w: 688, h: 180 }, '#f8fafc') }, 'user', now);
          return d;
        } },
      { key: 'vocabPoster', emoji: 'ABC', name: 'Vocabulary poster', desc: 'Term, definition, example, and visual frame.',
        make: function (now) {
          var d = stCreateDoc('letter-portrait', 'Vocabulary Poster', now);
          stAppend(d, { type: 'doc.template', template: 'vocabPoster' }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeShape('rect', { x: 0, y: 0, w: 816, h: 160 }, '#ede9fe') }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('heading1', 'Key Term', { x: 48, y: 50, w: 720, h: 70 }, { align: 'center', size: 46 }) }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('heading2', 'Definition', { x: 48, y: 210, w: 320, h: 42 }) }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('body', 'Write the meaning in student-friendly language.', { x: 48, y: 270, w: 320, h: 140 }) }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeImage('', '', { x: 430, y: 220, w: 300, h: 240 }, 'upload') }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('heading2', 'Example', { x: 48, y: 500, w: 720, h: 42 }) }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('body', 'Use the word in a sentence or show where it appears.', { x: 48, y: 560, w: 720, h: 120 }) }, 'user', now);
          return d;
        } },
      { key: 'labSafety', emoji: 'SAFE', name: 'Lab safety poster', desc: 'Clear safety rules with a strong heading and rule blocks.',
        make: function (now) {
          var d = stCreateDoc('letter-portrait', 'Lab Safety', now);
          stAppend(d, { type: 'doc.template', template: 'labSafety' }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('heading1', 'Lab Safety', { x: 48, y: 48, w: 720, h: 70 }, { align: 'center', size: 44 }) }, 'user', now);
          var rules = ['1. Wear the right protection.', '2. Follow directions before touching materials.', '3. Report spills or broken equipment right away.'];
          for (var r = 0; r < rules.length; r++) {
            var yRule = 170 + r * 190;
            stAppend(d, { type: 'object.add', object: stMakeShape('rect', { x: 64, y: yRule, w: 688, h: 130 }, r % 2 ? '#ecfeff' : '#fef2f2') }, 'user', now);
            stAppend(d, { type: 'object.add', object: stMakeText('heading2', rules[r], { x: 92, y: yRule + 34, w: 632, h: 54 }, { size: 24 }) }, 'user', now);
          }
          return d;
        } },
      { key: 'checklist', emoji: 'LIST', name: 'Checklist', desc: 'A printable checklist or rubric-style task tracker.',
        make: function (now) {
          var d = stCreateDoc('letter-portrait', 'Checklist', now);
          stAppend(d, { type: 'doc.template', template: 'checklist' }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('heading1', 'Project Checklist', { x: 48, y: 44, w: 720, h: 64 }, { size: 38 }) }, 'user', now);
          for (var c = 0; c < 6; c++) {
            var yCheck = 150 + c * 92;
            stAppend(d, { type: 'object.add', object: stMakeShape('rect', { x: 64, y: yCheck, w: 42, h: 42 }, '#ffffff') }, 'user', now);
            stAppend(d, { type: 'object.add', object: stMakeText('body', 'Task or criterion ' + (c + 1), { x: 126, y: yCheck + 6, w: 600, h: 36 }, { size: 20 }) }, 'user', now);
          }
          return d;
        } },
      { key: 'newsletter', emoji: 'NEWS', name: 'Class newsletter', desc: 'Sections for updates, reminders, and highlights.',
        make: function (now) {
          var d = stCreateDoc('letter-portrait', 'Class Newsletter', now);
          stAppend(d, { type: 'doc.template', template: 'newsletter' }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeShape('rect', { x: 0, y: 0, w: 816, h: 140 }, '#dbeafe') }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('heading1', 'Class Newsletter', { x: 48, y: 44, w: 720, h: 58 }, { align: 'center', size: 40 }) }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('heading2', 'This week', { x: 48, y: 190, w: 320, h: 42 }) }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('body', 'Add a short update for families or students.', { x: 48, y: 244, w: 320, h: 180 }) }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('heading2', 'Reminders', { x: 430, y: 190, w: 320, h: 42 }) }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('body', 'Dates, materials, or next steps.', { x: 430, y: 244, w: 320, h: 180 }) }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeImage('', '', { x: 248, y: 520, w: 320, h: 220 }, 'upload') }, 'user', now);
          return d;
        } },
      { key: 'bookReport', emoji: 'BOOK', name: 'Book report poster', desc: 'Book title, visual, summary, and recommendation.',
        make: function (now) {
          var d = stCreateDoc('letter-portrait', 'Book Report Poster', now);
          stAppend(d, { type: 'doc.template', template: 'bookReport' }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('heading1', 'Book Title', { x: 48, y: 44, w: 720, h: 64 }, { align: 'center', size: 40 }) }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeImage('', '', { x: 64, y: 150, w: 260, h: 340 }, 'upload') }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('heading2', 'Summary', { x: 370, y: 160, w: 360, h: 42 }) }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('body', 'Write a brief summary without spoiling the ending.', { x: 370, y: 214, w: 360, h: 180 }) }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('heading2', 'Recommendation', { x: 64, y: 560, w: 666, h: 42 }) }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('body', 'Who would enjoy this book and why?', { x: 64, y: 616, w: 666, h: 120 }) }, 'user', now);
          return d;
        } },
      { key: 'cerOrganizer', emoji: 'CER', name: 'CER organizer', desc: 'Claim, Evidence, Reasoning layout.',
        make: function (now) {
          var d = stCreateDoc('letter-portrait', 'CER Organizer', now);
          stAppend(d, { type: 'doc.template', template: 'cerOrganizer' }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('heading1', 'Claim Evidence Reasoning', { x: 48, y: 44, w: 720, h: 64 }, { align: 'center', size: 34 }) }, 'user', now);
          var labels = ['Claim', 'Evidence', 'Reasoning'];
          for (var ce = 0; ce < labels.length; ce++) {
            var yCer = 150 + ce * 210;
            stAppend(d, { type: 'object.add', object: stMakeText('heading2', labels[ce], { x: 64, y: yCer, w: 688, h: 40 }, { size: 24 }) }, 'user', now);
            stAppend(d, { type: 'object.add', object: stMakeShape('rect', { x: 64, y: yCer + 52, w: 688, h: 130 }, '#f8fafc') }, 'user', now);
          }
          return d;
        } },
      { key: 'compareContrast', emoji: 'A/B', name: 'Compare / contrast', desc: 'Two-column organizer with a shared middle space.',
        make: function (now) {
          var d = stCreateDoc('letter-portrait', 'Compare and Contrast', now);
          stAppend(d, { type: 'doc.template', template: 'compareContrast' }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('heading1', 'Compare and Contrast', { x: 48, y: 44, w: 720, h: 64 }, { align: 'center', size: 38 }) }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('heading2', 'Topic A', { x: 64, y: 150, w: 260, h: 42 }, { align: 'center' }) }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('heading2', 'Both', { x: 330, y: 150, w: 156, h: 42 }, { align: 'center' }) }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('heading2', 'Topic B', { x: 492, y: 150, w: 260, h: 42 }, { align: 'center' }) }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeShape('rect', { x: 64, y: 210, w: 260, h: 440 }, '#eff6ff') }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeShape('rect', { x: 330, y: 210, w: 156, h: 440 }, '#fef9c3') }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeShape('rect', { x: 492, y: 210, w: 260, h: 440 }, '#f0fdf4') }, 'user', now);
          return d;
        } },
      { key: 'visualSchedule', emoji: 'SCHED', name: 'Visual schedule', desc: 'A step-by-step day or lesson sequence with simple visual boxes.',
        make: function (now) {
          var d = stCreateDoc('letter-portrait', 'Visual Schedule', now);
          stAppend(d, { type: 'doc.template', template: 'visualSchedule' }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('heading1', 'Visual Schedule', { x: 48, y: 44, w: 720, h: 64 }, { align: 'center', size: 38 }) }, 'user', now);
          var steps = ['Arrive', 'Warm up', 'Mini lesson', 'Practice', 'Share', 'Wrap up'];
          for (var vs = 0; vs < steps.length; vs++) {
            var yStep = 132 + vs * 128;
            stAppend(d, { type: 'object.add', object: stMakeShape('rect', { x: 64, y: yStep, w: 72, h: 72 }, vs % 2 ? '#ecfeff' : '#eef2ff') }, 'user', now);
            stAppend(d, { type: 'object.add', object: stMakeText('body', String(vs + 1), { x: 64, y: yStep + 17, w: 72, h: 36 }, { align: 'center', size: 28 }) }, 'user', now);
            stAppend(d, { type: 'object.add', object: stMakeShape('rect', { x: 156, y: yStep, w: 596, h: 72 }, '#f8fafc') }, 'user', now);
            stAppend(d, { type: 'object.add', object: stMakeText('heading2', steps[vs], { x: 176, y: yStep + 10, w: 250, h: 32 }, { size: 22 }) }, 'user', now);
            stAppend(d, { type: 'object.add', object: stMakeText('body', 'Time, materials, or support note.', { x: 430, y: yStep + 16, w: 300, h: 34 }, { size: 15 }) }, 'user', now);
          }
          return d;
        } },
      { key: 'socialStory', emoji: 'STORY', name: 'Social story', desc: 'A calm four-part page for expectations, feelings, choices, and plans.',
        make: function (now) {
          var d = stCreateDoc('letter-portrait', 'Social Story', now);
          stAppend(d, { type: 'doc.template', template: 'socialStory' }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('heading1', 'Social Story', { x: 48, y: 44, w: 720, h: 60 }, { align: 'center', size: 38 }) }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('body', 'Use clear, supportive language that helps a student prepare and choose a next step.', { x: 72, y: 112, w: 672, h: 52 }, { align: 'center', size: 16 }) }, 'user', now);
          var storyParts = [
            ['When this happens', 'Describe the situation in concrete, neutral words.'],
            ['I might feel', 'Name possible feelings without judging them.'],
            ['I can try', 'List one or two choices that are safe and realistic.'],
            ['My plan', 'Write the plan the student wants to remember.']
          ];
          for (var ss = 0; ss < storyParts.length; ss++) {
            var xStory = 64 + (ss % 2) * 356;
            var yStory = 188 + Math.floor(ss / 2) * 286;
            stAppend(d, { type: 'object.add', object: stMakeShape('rect', { x: xStory, y: yStory, w: 316, h: 226 }, ss % 2 ? '#f0fdf4' : '#eff6ff') }, 'user', now);
            stAppend(d, { type: 'object.add', object: stMakeText('heading2', storyParts[ss][0], { x: xStory + 18, y: yStory + 18, w: 280, h: 40 }, { size: 22 }) }, 'user', now);
            stAppend(d, { type: 'object.add', object: stMakeText('body', storyParts[ss][1], { x: xStory + 18, y: yStory + 74, w: 280, h: 104 }, { size: 16 }) }, 'user', now);
          }
          return d;
        } },
      { key: 'anchorChart', emoji: 'ANCHOR', name: 'Anchor chart', desc: 'Big idea, reminders, examples, and a student try-it space.',
        make: function (now) {
          var d = stCreateDoc('letter-portrait', 'Anchor Chart', now);
          stAppend(d, { type: 'doc.template', template: 'anchorChart' }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeShape('rect', { x: 0, y: 0, w: 816, h: 150 }, '#dbeafe') }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('heading1', 'Big Idea', { x: 48, y: 48, w: 720, h: 62 }, { align: 'center', size: 44 }) }, 'user', now);
          var chartBlocks = [
            ['Remember', 'Write the rule, strategy, or core concept.'],
            ['Examples', 'Add two or three quick examples students can scan.'],
            ['Try it', 'Leave space for a student-generated example.']
          ];
          for (var ac = 0; ac < chartBlocks.length; ac++) {
            var yChart = 210 + ac * 210;
            stAppend(d, { type: 'object.add', object: stMakeShape('rect', { x: 64, y: yChart, w: 688, h: 144 }, ac === 1 ? '#fef9c3' : '#f8fafc') }, 'user', now);
            stAppend(d, { type: 'object.add', object: stMakeText('heading2', chartBlocks[ac][0], { x: 90, y: yChart + 24, w: 250, h: 38 }, { size: 24 }) }, 'user', now);
            stAppend(d, { type: 'object.add', object: stMakeText('body', chartBlocks[ac][1], { x: 90, y: yChart + 76, w: 610, h: 46 }, { size: 17 }) }, 'user', now);
          }
          return d;
        } },
      { key: 'choiceBoard', emoji: 'CHOICE', name: 'Choice board', desc: 'Nine compact activity choices for centers, extension, or review.',
        make: function (now) {
          var d = stCreateDoc('letter-portrait', 'Choice Board', now);
          stAppend(d, { type: 'doc.template', template: 'choiceBoard' }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('heading1', 'Choice Board', { x: 48, y: 44, w: 720, h: 58 }, { align: 'center', size: 38 }) }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('body', 'Choose activities that help you show what you know.', { x: 72, y: 110, w: 672, h: 40 }, { align: 'center', size: 17 }) }, 'user', now);
          for (var cb = 0; cb < 9; cb++) {
            var xChoice = 64 + (cb % 3) * 232;
            var yChoice = 178 + Math.floor(cb / 3) * 176;
            stAppend(d, { type: 'object.add', object: stMakeShape('rect', { x: xChoice, y: yChoice, w: 204, h: 132 }, cb % 2 ? '#f0fdf4' : '#eff6ff') }, 'user', now);
            stAppend(d, { type: 'object.add', object: stMakeText('heading2', 'Choice ' + (cb + 1), { x: xChoice + 14, y: yChoice + 16, w: 176, h: 32 }, { size: 20, align: 'center' }) }, 'user', now);
            stAppend(d, { type: 'object.add', object: stMakeText('body', 'Activity or product option.', { x: xChoice + 18, y: yChoice + 64, w: 168, h: 42 }, { size: 14, align: 'center' }) }, 'user', now);
          }
          return d;
        } },
      { key: 'vocabMat', emoji: 'VOCAB', name: 'Vocabulary mat', desc: 'Term, definition, example, non-example, and sketch space.',
        make: function (now) {
          var d = stCreateDoc('letter-portrait', 'Vocabulary Mat', now);
          stAppend(d, { type: 'doc.template', template: 'vocabMat' }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('heading1', 'Vocabulary Mat', { x: 48, y: 42, w: 720, h: 58 }, { align: 'center', size: 38 }) }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeShape('rect', { x: 64, y: 122, w: 688, h: 92 }, '#ede9fe') }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('heading2', 'Term', { x: 92, y: 148, w: 632, h: 36 }, { align: 'center', size: 28 }) }, 'user', now);
          var vocabBlocks = [
            ['Definition', 'Write the meaning in your own words.'],
            ['Example', 'Show where the term appears or how it is used.'],
            ['Non-example', 'Show what the term is not.'],
            ['Sketch', 'Draw or add a visual model.']
          ];
          for (var vm = 0; vm < vocabBlocks.length; vm++) {
            var xVocab = 64 + (vm % 2) * 352;
            var yVocab = 248 + Math.floor(vm / 2) * 248;
            stAppend(d, { type: 'object.add', object: stMakeShape('rect', { x: xVocab, y: yVocab, w: 320, h: 196 }, vm % 2 ? '#f8fafc' : '#ecfeff') }, 'user', now);
            stAppend(d, { type: 'object.add', object: stMakeText('heading2', vocabBlocks[vm][0], { x: xVocab + 18, y: yVocab + 18, w: 284, h: 34 }, { size: 22 }) }, 'user', now);
            stAppend(d, { type: 'object.add', object: stMakeText('body', vocabBlocks[vm][1], { x: xVocab + 18, y: yVocab + 70, w: 284, h: 82 }, { size: 16 }) }, 'user', now);
          }
          return d;
        } },
      { key: 'rubric', emoji: 'RUBRIC', name: 'Rubric', desc: 'Criteria rows with four clear performance levels.',
        make: function (now) {
          var d = stCreateDoc('letter-portrait', 'Rubric', now);
          stAppend(d, { type: 'doc.template', template: 'rubric' }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('heading1', 'Rubric', { x: 48, y: 44, w: 720, h: 58 }, { align: 'center', size: 38 }) }, 'user', now);
          var levels = ['Start', 'Grow', 'Meet', 'Extend'];
          var criteria = ['Idea', 'Accuracy', 'Clarity', 'Care'];
          stAppend(d, { type: 'object.add', object: stMakeText('heading2', 'Criteria', { x: 64, y: 130, w: 140, h: 32 }, { size: 18 }) }, 'user', now);
          for (var rl = 0; rl < levels.length; rl++) {
            stAppend(d, { type: 'object.add', object: stMakeText('heading2', levels[rl], { x: 214 + rl * 130, y: 130, w: 118, h: 32 }, { size: 18, align: 'center' }) }, 'user', now);
          }
          for (var rr = 0; rr < criteria.length; rr++) {
            var yRubric = 184 + rr * 112;
            stAppend(d, { type: 'object.add', object: stMakeShape('rect', { x: 64, y: yRubric, w: 668, h: 86 }, rr % 2 ? '#f8fafc' : '#eff6ff') }, 'user', now);
            stAppend(d, { type: 'object.add', object: stMakeText('body', criteria[rr], { x: 78, y: yRubric + 26, w: 116, h: 34 }, { size: 18 }) }, 'user', now);
            for (var rc = 0; rc < 4; rc++) {
              stAppend(d, { type: 'object.add', object: stMakeText('body', 'Descriptor', { x: 214 + rc * 130, y: yRubric + 26, w: 118, h: 34 }, { align: 'center', size: 14 }) }, 'user', now);
            }
          }
          return d;
        } },
      { key: 'labSheet', emoji: 'LAB', name: 'Lab sheet', desc: 'Question, hypothesis, materials, procedure, observations, and conclusion.',
        make: function (now) {
          var d = stCreateDoc('letter-portrait', 'Lab Sheet', now);
          stAppend(d, { type: 'doc.template', template: 'labSheet' }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('heading1', 'Lab Sheet', { x: 48, y: 44, w: 720, h: 58 }, { align: 'center', size: 38 }) }, 'user', now);
          var labBlocks = [
            ['Question', 'What are we trying to find out?'],
            ['Hypothesis', 'I think... because...'],
            ['Materials', 'List what you need.'],
            ['Procedure', 'Number the steps.'],
            ['Observations', 'Record data, drawings, or notes.'],
            ['Conclusion', 'Use evidence to answer the question.']
          ];
          for (var lb = 0; lb < labBlocks.length; lb++) {
            var xLab = 64 + (lb % 2) * 356;
            var yLab = 130 + Math.floor(lb / 2) * 234;
            stAppend(d, { type: 'object.add', object: stMakeShape('rect', { x: xLab, y: yLab, w: 316, h: 176 }, lb % 2 ? '#f8fafc' : '#ecfeff') }, 'user', now);
            stAppend(d, { type: 'object.add', object: stMakeText('heading2', labBlocks[lb][0], { x: xLab + 18, y: yLab + 18, w: 280, h: 34 }, { size: 22 }) }, 'user', now);
            stAppend(d, { type: 'object.add', object: stMakeText('body', labBlocks[lb][1], { x: xLab + 18, y: yLab + 70, w: 280, h: 70 }, { size: 15 }) }, 'user', now);
          }
          return d;
        } },
      { key: 'reflectionPage', emoji: 'REFLECT', name: 'Reflection page', desc: 'Prompts for noticing, strategy, next step, and confidence.',
        make: function (now) {
          var d = stCreateDoc('letter-portrait', 'Reflection Page', now);
          stAppend(d, { type: 'doc.template', template: 'reflectionPage' }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('heading1', 'Reflection', { x: 48, y: 44, w: 720, h: 58 }, { align: 'center', size: 38 }) }, 'user', now);
          var prompts = ['Today I noticed', 'I tried', 'Next time I will', 'A question I still have'];
          for (var rp = 0; rp < prompts.length; rp++) {
            var yReflect = 132 + rp * 166;
            stAppend(d, { type: 'object.add', object: stMakeText('heading2', prompts[rp], { x: 64, y: yReflect, w: 688, h: 34 }, { size: 22 }) }, 'user', now);
            stAppend(d, { type: 'object.add', object: stMakeShape('rect', { x: 64, y: yReflect + 44, w: 688, h: 88 }, '#f8fafc') }, 'user', now);
          }
          stAppend(d, { type: 'object.add', object: stMakeText('heading2', 'Confidence', { x: 64, y: 810, w: 200, h: 34 }, { size: 22 }) }, 'user', now);
          for (var scale = 0; scale < 5; scale++) {
            stAppend(d, { type: 'object.add', object: stMakeShape('rect', { x: 64 + scale * 92, y: 858, w: 58, h: 58 }, '#ffffff') }, 'user', now);
            stAppend(d, { type: 'object.add', object: stMakeText('body', String(scale + 1), { x: 64 + scale * 92, y: 874, w: 58, h: 28 }, { align: 'center', size: 20 }) }, 'user', now);
          }
          return d;
        } },
      { key: 'onePageExplainer', emoji: 'EXPLAIN', name: 'One-page explainer', desc: 'A polished one-page layout for a concept, process, or topic.',
        make: function (now) {
          var d = stCreateDoc('letter-portrait', 'One-Page Explainer', now);
          stAppend(d, { type: 'doc.template', template: 'onePageExplainer' }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeShape('rect', { x: 0, y: 0, w: 816, h: 144 }, '#f0fdf4') }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('heading1', 'Topic or Concept', { x: 48, y: 44, w: 720, h: 62 }, { align: 'center', size: 40 }) }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('heading2', 'Key idea', { x: 64, y: 186, w: 300, h: 38 }, { size: 24 }) }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('body', 'Explain the big idea in one or two sentences.', { x: 64, y: 238, w: 300, h: 96 }, { size: 17 }) }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeShape('rect', { x: 424, y: 186, w: 300, h: 220 }, '#f8fafc') }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('heading2', 'Visual model', { x: 448, y: 214, w: 252, h: 34 }, { align: 'center', size: 22 }) }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('body', 'Add a diagram, example, or sketch.', { x: 454, y: 276, w: 240, h: 60 }, { align: 'center', size: 16 }) }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('heading2', 'Steps or parts', { x: 64, y: 460, w: 688, h: 38 }, { size: 24 }) }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeShape('rect', { x: 64, y: 516, w: 688, h: 160 }, '#eff6ff') }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('body', '1. First part\n2. Second part\n3. Third part', { x: 90, y: 546, w: 636, h: 94 }, { size: 18 }) }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('heading2', 'Takeaway', { x: 64, y: 724, w: 688, h: 38 }, { size: 24 }) }, 'user', now);
          stAppend(d, { type: 'object.add', object: stMakeText('body', 'What should someone remember after reading this?', { x: 64, y: 780, w: 688, h: 70 }, { size: 18 }) }, 'user', now);
          return d;
        } },
      { key: 'blank', emoji: '⬜', name: 'Blank canvas', desc: 'Start from nothing (portrait, landscape, or square).', orientations: true,
        make: function (now, preset) {
          // orientation chosen AT CREATION — the base canvas, so replay/scrub is
          // unaffected (no mid-document resize op). Unknown preset → portrait.
          var d = stCreateDoc(ST_CANVAS_PRESETS[preset] ? preset : 'letter-portrait', 'Untitled', now);
          stAppend(d, { type: 'doc.template', template: 'blank' }, 'user', now);
          return d;
        } },
    ];
  }

  // ── Accessible HTML export (the moat, doc §6) ──
  // DOM order = object array order = reading order. Positioning is pure CSS on
  // top of the semantic element, so screen readers and the tagged-PDF typesetter
  // both see real structure. Decorative objects are aria-hidden. No scripts, no
  // editor chrome, no branding footer.
  function stEscapeHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function stExportHtml(doc, opts) {
    var lang = (opts && opts.lang) || 'en';
    var parts = [];
    var canvas = {
      w: Math.max(ST_MIN_SIZE, stFiniteNumber(doc && doc.canvas && doc.canvas.w, ST_CANVAS_PRESETS['letter-portrait'].w)),
      h: Math.max(ST_MIN_SIZE, stFiniteNumber(doc && doc.canvas && doc.canvas.h, ST_CANVAS_PRESETS['letter-portrait'].h)),
      background: { fill: stSafeCssColor(doc && doc.canvas && doc.canvas.background && doc.canvas.background.fill, '#ffffff') },
    };
    for (var i = 0; i < doc.objects.length; i++) {
      var o = doc.objects[i];
      if (!o || typeof o !== 'object') continue;
      var f = stClampFrame(o.frame, canvas);
      var pos = 'position:absolute;left:' + f.x + 'px;top:' + f.y + 'px;width:' + f.w + 'px;height:' + f.h + 'px;z-index:' + Math.round(stFiniteNumber(o.z, 1)) + ';margin:0;';
      if (o.type === 'text') {
        var run = (o.runs && o.runs[0]) || { text: '', style: {} };
        var s = run.style || {};
        var role = stSafeTextRole(o.role);
        var tag = role === 'heading1' ? 'h1' : role === 'heading2' ? 'h2' : role === 'heading3' ? 'h3' : 'p';
        var size = Math.max(8, Math.min(160, stFiniteNumber(s.size, 16)));
        var style = pos + 'font-size:' + size + 'px;color:' + stSafeCssColor(s.color, '#111827') + ';font-weight:' + (s.bold ? '700' : '400') + ';text-align:' + stSafeAlign(s.align) + ';white-space:pre-wrap;line-height:1.25;font-family:' + stSafeFontFamily(s.font) + ';overflow-wrap:break-word;';
        parts.push('<' + tag + ' style="' + style + '">' + stEscapeHtml(run.text) + '</' + tag + '>');
      } else if (o.type === 'image') {
        var safeImageSrc = stSafeDataImage(o.src, ST_MAX_IMAGE_SRC_LENGTH);
        if (!safeImageSrc) continue; // empty or unsafe frame - nothing to show or request
        var fit = o.fit === 'contain' ? 'contain' : 'cover';
        if (o.decorative) {
          parts.push('<img src="' + stEscapeHtml(safeImageSrc) + '" alt="" role="presentation" style="' + pos + 'object-fit:' + fit + ';">');
        } else {
          parts.push('<img src="' + stEscapeHtml(safeImageSrc) + '" alt="' + stEscapeHtml(o.alt) + '" style="' + pos + 'object-fit:' + fit + ';">');
        }
      } else if (o.type === 'shape') {
        var radius = stSafeShape(o.shape) === 'ellipse' ? 'border-radius:50%;' : 'border-radius:8px;';
        parts.push('<div aria-hidden="true" style="' + pos + 'background:' + stSafeCssColor(o.fill, '#e2e8f0') + ';' + radius + '"></div>');
      }
    }
    return '<!DOCTYPE html>\n<html lang="' + stEscapeHtml(lang) + '">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>' + stEscapeHtml(doc.title) + '</title>\n<style>\n  body { margin: 0; background: #f1f5f9; font-family: system-ui, sans-serif; }\n  .st-page { position: relative; width: ' + canvas.w + 'px; height: ' + canvas.h + 'px; background: ' + canvas.background.fill + '; margin: 24px auto; box-shadow: 0 2px 12px rgba(15,23,42,0.15); overflow: hidden; }\n  @media print { body { background: none; } .st-page { margin: 0; box-shadow: none; page-break-after: always; } }\n</style>\n</head>\n<body>\n<main class="st-page">\n' + parts.join('\n') + '\n</main>\n</body>\n</html>';
  }

  // ── Keyboard shortcut reference (pure data; the editor renders + binds it) ──
  // `mod` = the platform command key (Ctrl on Windows/Linux, ⌘ on Mac); the
  // editor prefixes it and localizes each label by id (studio.sc_<id>). Kept as
  // ONE source of truth so the bound handlers and the help overlay never drift.
  function stShortcutList() {
    return [
      { id: 'undo', mod: true, keys: 'Z', label: 'Undo' },
      { id: 'redo', mod: true, keys: 'Shift+Z / Y', label: 'Redo' },
      { id: 'duplicate', mod: true, keys: 'D', label: 'Duplicate the selection' },
      { id: 'selectAll', mod: true, keys: 'A', label: 'Select all objects' },
      { id: 'save', mod: true, keys: 'S', label: 'Save the document' },
      { id: 'forward', mod: true, keys: ']', label: 'Move later in reading order' },
      { id: 'backward', mod: true, keys: '[', label: 'Move earlier in reading order' },
      { id: 'zoomIn', mod: true, keys: '+', label: 'Zoom in' },
      { id: 'zoomOut', mod: true, keys: '-', label: 'Zoom out' },
      { id: 'zoomFit', mod: true, keys: '0', label: 'Fit the page to the screen' },
      { id: 'nudge', mod: false, keys: 'Arrow keys', label: 'Move the selected object' },
      { id: 'resize', mod: false, keys: 'Shift + Arrows', label: 'Resize the selected object' },
      { id: 'remove', mod: false, keys: 'Delete', label: 'Remove the selected object' },
      { id: 'deselect', mod: false, keys: 'Esc', label: 'Deselect, or close a panel' },
      { id: 'help', mod: false, keys: '?', label: 'Show this shortcuts list' }
    ];
  }

  // ── Color swatch palette (the Canva-style quick picker) ──
  // PURE: gathers three ordered, de-duplicated swatch groups so a teacher clicks
  // a color instead of hunting in the OS picker: (1) BRAND colors from the active
  // school profile, (2) a curated STANDARD palette, (3) DOCUMENT colors already
  // used in this design (text runs, shape fills, page background). All normalized
  // to #rrggbb; a color never repeats across groups.
  function stHexNorm(c) {
    if (typeof c !== 'string') return null;
    var s = c.trim().toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(s)) return s;
    if (/^#[0-9a-f]{3}$/.test(s)) return '#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
    return null;
  }
  var ST_STANDARD_SWATCHES = ['#000000', '#334155', '#64748b', '#ffffff', '#ef4444', '#f97316', '#f59e0b', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#6366f1', '#a855f7', '#ec4899'];
  function stSwatchPalette(doc, brandProfile) {
    var seen = {};
    var take = function (list, into) {
      (list || []).forEach(function (c) { var n = stHexNorm(c); if (n && !seen[n]) { seen[n] = 1; into.push(n); } });
    };
    var brand = [];
    var kit = stBrandStyleKit(brandProfile);
    if (kit) take([kit.heading, kit.body, kit.background, kit.shape], brand);
    try {
      var extra = brandProfile && (brandProfile.palette || brandProfile.swatches);
      if (Array.isArray(extra)) take(extra.map(function (x) { return typeof x === 'string' ? x : (x && x.hex); }), brand);
    } catch (_) {}
    var standard = []; take(ST_STANDARD_SWATCHES, standard);
    var docColors = [];
    var rawDoc = [];
    if (doc && Array.isArray(doc.objects)) {
      doc.objects.forEach(function (o) {
        if (o && o.type === 'text' && Array.isArray(o.runs)) o.runs.forEach(function (r) { if (r && r.style) rawDoc.push(r.style.color); });
        if (o && o.type === 'shape') rawDoc.push(o.fill);
      });
    }
    if (doc && doc.canvas && doc.canvas.background) rawDoc.push(doc.canvas.background.fill);
    take(rawDoc, docColors);
    return { brand: brand, standard: standard, document: docColors };
  }

  // ═══════════════════════════ [ST_PURE_END] ═══════════════════════════

  function stReadRecentProjects() {
    try {
      var raw = localStorage.getItem(ST_RECENT_PROJECTS_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function stSaveRecentProject(doc, options) {
    options = options || {};
    var summary = stRecentProjectSummary(doc, options.now || Date.now());
    var entry = Object.assign({}, summary, { doc: stDurableDoc(doc) });
    var existing = stReadRecentProjects().filter(function (candidate) {
      return candidate && candidate.id !== summary.id;
    });
    var next = [entry].concat(existing).slice(0, ST_RECENT_PROJECT_LIMIT);
    try {
      localStorage.setItem(ST_RECENT_PROJECTS_KEY, JSON.stringify(next));
      return { ok: true, entry: entry, projects: next };
    } catch (e) {
      return { ok: false, entry: entry, projects: existing, error: e && e.message || 'localStorage unavailable' };
    }
  }

  // ── Autosave (crash recovery): one debounced full-doc snapshot per device.
  // Same localStorage idiom as recents; restore only after stValidateDoc. ──
  var ST_AUTOSAVE_KEY = 'alloStudioAutosave_v1';
  var ST_AUTOSAVE_MAX_CHARS = 3800000; // stay clear of the ~5MB localStorage cap
  function stReadAutosave() {
    try {
      var raw = localStorage.getItem(ST_AUTOSAVE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!stAutosaveValid(parsed)) return null;
      parsed.doc = stCanonicalizeDoc(parsed.doc);
      return parsed;
    } catch (_) { return null; }
  }
  function stWriteAutosave(doc, now) {
    try {
      var json = JSON.stringify(stAutosavePayload(doc, now));
      if (json.length > ST_AUTOSAVE_MAX_CHARS) return { ok: false, reason: 'too-large' };
      localStorage.setItem(ST_AUTOSAVE_KEY, json);
      return { ok: true };
    } catch (e) { return { ok: false, reason: e && e.message || 'storage' }; }
  }
  function stClearAutosave() { try { localStorage.removeItem(ST_AUTOSAVE_KEY); } catch (_) {} }

  function stEnsureStudentArtifactStore() {
    if (typeof window === 'undefined') return null;
    window.AlloModules = window.AlloModules || {};
    if (window.AlloModules.StudentArtifactStore && typeof window.AlloModules.StudentArtifactStore.save === 'function') return window.AlloModules.StudentArtifactStore;
    var KEY = 'alloflow_student_artifacts';
    var LIMIT = 80;
    function read() {
      try {
        if (Array.isArray(window.__alloflowStudentArtifacts)) return window.__alloflowStudentArtifacts;
        var raw = localStorage.getItem(KEY);
        if (!raw) return [];
        var parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch (_) { return []; }
    }
    function normalize(artifact) {
      artifact = (artifact && typeof artifact === 'object') ? Object.assign({}, artifact) : {};
      var now = new Date().toISOString();
      artifact.type = artifact.type || artifact.kind || 'student-product';
      artifact.source = artifact.source || 'student-work';
      artifact.sourceLabel = artifact.sourceLabel || (artifact.source === 'allostudio' ? 'AlloStudio' : 'Student work');
      artifact.kindLabel = artifact.kindLabel || 'Student Product';
      artifact.title = artifact.title || artifact.kindLabel;
      artifact.summary = artifact.summary || 'Saved product';
      artifact.privacy = artifact.privacy || 'student-controlled';
      artifact.createdAt = artifact.createdAt || now;
      artifact.updatedAt = artifact.updatedAt || artifact.createdAt;
      artifact.itemCount = Number(artifact.itemCount || (Array.isArray(artifact.items) ? artifact.items.length : 0));
      artifact.id = artifact.id || (String(artifact.type).replace(/[^a-z0-9_-]+/gi, '-').toLowerCase() + '-' + Date.now());
      return artifact;
    }
    function save(artifact, options) {
      options = options || {};
      var normalized = normalize(artifact);
      var existing = read().slice();
      var matchId = options.matchId || normalized.id;
      var replaced = false;
      var next = existing.map(function (candidate) {
        if (options.replaceExisting !== false && matchId && candidate && candidate.id === matchId) {
          replaced = true;
          return normalized;
        }
        return candidate;
      });
      if (!replaced) next.unshift(normalized);
      next = next.filter(Boolean).sort(function (a, b) {
        return Date.parse((b && (b.updatedAt || b.createdAt)) || 0) - Date.parse((a && (a.updatedAt || a.createdAt)) || 0);
      }).slice(0, options.limit || LIMIT);
      try { window.__alloflowStudentArtifacts = next; } catch (_) {}
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch (_) {}
      try {
        window.dispatchEvent(new CustomEvent('alloflow-student-artifacts-changed', {
          detail: { source: normalized.source, sourceLabel: normalized.sourceLabel, kindLabel: normalized.kindLabel, privacy: normalized.privacy, title: normalized.title, action: replaced ? 'updated' : 'saved', artifact: normalized, count: next.length }
        }));
      } catch (_) {}
      return next;
    }
    return { read: read, save: save, normalize: normalize };
  }

  function stSavePortfolioArtifact(doc, options) {
    var artifact = stBuildPortfolioArtifact(doc, options || {});
    var store = stEnsureStudentArtifactStore();
    if (!store || typeof store.save !== 'function') return { ok: false, artifact: artifact };
    try {
      var list = store.save(artifact, { source: 'allostudio', matchId: artifact.id });
      return { ok: true, artifact: artifact, artifacts: list };
    } catch (e) {
      return { ok: false, artifact: artifact, error: e && e.message || 'save failed' };
    }
  }

  // ── Image crop (DOM canvas) — draw the crop box to a new canvas and return a
  // data URL. JPEG in → JPEG out (no alpha); everything else → PNG (alpha-safe).
  function stCropImageToDataUrl(src, box) {
    return new Promise(function (resolve, reject) {
      try {
        var im = new Image();
        im.onload = function () {
          try {
            var c = document.createElement('canvas');
            c.width = box.sw; c.height = box.sh;
            var g = c.getContext('2d');
            g.drawImage(im, box.sx, box.sy, box.sw, box.sh, 0, 0, box.sw, box.sh);
            var isJpeg = /^data:image\/jpe?g/i.test(String(src || ''));
            resolve(c.toDataURL(isJpeg ? 'image/jpeg' : 'image/png', isJpeg ? 0.9 : undefined));
          } catch (e) { reject(e); }
        };
        im.onerror = function () { reject(new Error('image load failed')); };
        im.src = src;
      } catch (e) { reject(e); }
    });
  }

  // ── PNG rasterizer (DOM canvas; approximate visual fidelity for MVP) ──
  // Downscale imported images before they enter the ledger (keeps saves and
  // exports light; privacy-neutral — all in-memory). JPEG stays JPEG (photos),
  // everything else becomes PNG so alpha survives — the crop-tool format rule.
  function stImportImageDataUrl(dataUrl, maxDim) {
    return new Promise(function (resolve) {
      try {
        var original = String(dataUrl || '');
        if (original.indexOf('data:image/') !== 0) { resolve(''); return; }
        var im = new Image();
        im.onload = function () {
          try {
            var naturalW = im.naturalWidth || im.width;
            var naturalH = im.naturalHeight || im.height;
            var dims = stDownscaleDims(naturalW, naturalH, maxDim || 1600);
            if (!dims && stIsSafeDataImage(original, ST_MAX_IMAGE_SRC_LENGTH)) { resolve(original); return; }
            var target = dims || { w: naturalW, h: naturalH };
            if (!target.w || !target.h) { resolve(''); return; }
            var c = document.createElement('canvas');
            c.width = target.w; c.height = target.h;
            c.getContext('2d').drawImage(im, 0, 0, target.w, target.h);
            var isJpeg = /^data:image\/jpe?g;base64,/i.test(original);
            var normalized = isJpeg ? c.toDataURL('image/jpeg', 0.88) : c.toDataURL('image/png');
            resolve(stSafeDataImage(normalized, ST_MAX_IMAGE_SRC_LENGTH));
          } catch (_) { resolve(''); }
        };
        im.onerror = function () { resolve(''); };
        im.src = original;
      } catch (_) { resolve(''); }
    });
  }
  function stOptimizeImageDataUrl(dataUrl, maxDim) {
    return new Promise(function (resolve) {
      try {
        var original = String(dataUrl || '');
        var im = new Image();
        im.onload = function () {
          try {
            var naturalW = im.naturalWidth || im.width;
            var naturalH = im.naturalHeight || im.height;
            var dims = stDownscaleDims(naturalW, naturalH, maxDim || ST_IMAGE_OPTIMIZE_MAX_DIM) || { w: naturalW, h: naturalH };
            if (!dims.w || !dims.h) { resolve(original); return; }
            var c = document.createElement('canvas');
            c.width = dims.w; c.height = dims.h;
            c.getContext('2d').drawImage(im, 0, 0, dims.w, dims.h);
            var isJpeg = /^data:image\/jpe?g/i.test(original);
            var optimized = isJpeg ? c.toDataURL('image/jpeg', 0.82) : c.toDataURL('image/png');
            resolve(optimized && optimized.length < original.length ? optimized : original);
          } catch (_) { resolve(original); }
        };
        im.onerror = function () { resolve(original); };
        im.src = original;
      } catch (_) { resolve(dataUrl); }
    });
  }

  function stRenderPng(doc, scale) {
    scale = scale || 1;
    return new Promise(function (resolvePng, rejectPng) {
      try {
        var c = document.createElement('canvas');
        c.width = Math.round(doc.canvas.w * scale); c.height = Math.round(doc.canvas.h * scale);
        var g = c.getContext('2d');
        g.scale(scale, scale);
        // Paint order = z, stable within equal z by array order. Background is
        // painted once, after images resolve, right before the real draw pass.
        var byZ = stOrderedObjects(doc.objects);
        var pending = [];
        byZ.forEach(function (o) {
          if (!o || typeof o !== 'object') return;
          if (o.type === 'image') {
            var safePendingSrc = stSafeDataImage(o.src, ST_MAX_IMAGE_SRC_LENGTH);
            if (safePendingSrc) {
              pending.push(new Promise(function (res) {
                var im = new Image();
                im.onload = function () { res({ o: o, im: im }); };
                im.onerror = function () { res(null); };
                im.src = safePendingSrc;
              }));
            }
          }
        });
        Promise.all(pending).then(function (loaded) {
          var loadedById = {};
          loaded.filter(Boolean).forEach(function (item) { loadedById[item.o.id || item.o.src] = item.im; });
          g.fillStyle = stSafeCssColor(doc.canvas.background && doc.canvas.background.fill, '#ffffff');
          g.fillRect(0, 0, doc.canvas.w, doc.canvas.h);
          byZ.forEach(function (o) {
            if (!o || typeof o !== 'object') return;
            var f2 = stClampFrame(o.frame, doc.canvas);
            if (o.type === 'shape') {
              g.fillStyle = stSafeCssColor(o.fill, '#e2e8f0');
              if (stSafeShape(o.shape) === 'ellipse') { g.beginPath(); g.ellipse(f2.x + f2.w / 2, f2.y + f2.h / 2, f2.w / 2, f2.h / 2, 0, 0, Math.PI * 2); g.fill(); }
              else { g.fillRect(f2.x, f2.y, f2.w, f2.h); }
            } else if (o.type === 'text') {
              var run2 = (o.runs && o.runs[0]) || { text: '', style: {} };
              var s2 = run2.style || {};
              var size2 = Math.max(8, Math.min(160, stFiniteNumber(s2.size, 16)));
              g.fillStyle = stSafeCssColor(s2.color, '#111827');
              g.font = (s2.bold ? '700 ' : '400 ') + size2 + 'px ' + stSafeFontFamily(s2.font);
              g.textBaseline = 'top';
              var lineH2 = Math.round(size2 * 1.25);
              var y2 = f2.y;
              String(run2.text || '').split('\n').forEach(function (para) {
                var words = para.split(/\s+/); var line = '';
                for (var wi = 0; wi < words.length; wi++) {
                  var probe = line ? line + ' ' + words[wi] : words[wi];
                  if (g.measureText(probe).width > f2.w && line) {
                    stDrawAligned(g, line, f2, y2, stSafeAlign(s2.align)); y2 += lineH2; line = words[wi];
                  } else { line = probe; }
                }
                stDrawAligned(g, line, f2, y2, stSafeAlign(s2.align)); y2 += lineH2;
              });
            } else if (o.type === 'image' && o.src) {
              var im2 = loadedById[o.id || o.src];
              if (im2) { try { stDrawImageFit(g, im2, f2, o.fit); } catch (_) {} }
            }
          });
          // Repainted above in true layer order after async images load.
          c.toBlob(function (blob) { blob ? resolvePng(blob) : rejectPng(new Error('toBlob returned null')); }, 'image/png');
        });
      } catch (err) { rejectPng(err); }
    });
  }
  function stDrawAligned(g, line, f, y, align) {
    if (!line) return;
    var w = g.measureText(line).width;
    var x = align === 'center' ? f.x + (f.w - w) / 2 : align === 'right' ? f.x + f.w - w : f.x;
    g.fillText(line, x, y);
  }
  function stDrawImageFit(g, im, f, fit) {
    var iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
    if (!iw || !ih) { g.drawImage(im, f.x, f.y, f.w, f.h); return; }
    if (fit === 'contain') {
      var contain = Math.min(f.w / iw, f.h / ih);
      var dw = iw * contain, dh = ih * contain;
      g.drawImage(im, f.x + (f.w - dw) / 2, f.y + (f.h - dh) / 2, dw, dh);
      return;
    }
    var cover = Math.max(f.w / iw, f.h / ih);
    var sw = f.w / cover, sh = f.h / cover;
    g.drawImage(im, (iw - sw) / 2, (ih - sh) / 2, sw, sh, f.x, f.y, f.w, f.h);
  }

  // ════════════════════════════ Editor component ════════════════════════════
  function AlloStudio(props) {
    var h = React.createElement;
    var t = props.t || function () { return ''; };
    var TT = function (k, fb) { try { var s = t(k); return s || fb; } catch (_) { return fb; } };
    var addToast = props.addToast || function () {};

    var _docRef = React.useRef(null);
    var _tick = React.useState(0); var setTick = _tick[1];
    var bump = function () { setTick(function (n) { return n + 1; }); };
    var _view = React.useState('templates'); var view = _view[0], setView = _view[1];
    var _sel = React.useState(null); var selectedId = _sel[0], setSelectedId = _sel[1];
    var _multiSel = React.useState([]); var selectedIds = _multiSel[0], setSelectedIds = _multiSel[1];
    var _role = React.useState(props.initialRole === 'student' ? 'student' : 'teacher'); var role = _role[0], setRole = _role[1];
    var _scrub = React.useState(null); var scrubSeq = _scrub[0], setScrubSeq = _scrub[1];
    var _processActor = React.useState('all'); var processActorFilter = _processActor[0], setProcessActorFilter = _processActor[1];
    var _exportOpen = React.useState(false); var exportOpen = _exportOpen[0], setExportOpen = _exportOpen[1];
    var _preflightOpen = React.useState(false); var preflightOpen = _preflightOpen[0], setPreflightOpen = _preflightOpen[1];
    var _preflightGuide = React.useState(0); var preflightGuideIndex = _preflightGuide[0], setPreflightGuideIndex = _preflightGuide[1];
    var _preflightIssueFilter = React.useState('all'); var preflightIssueFilter = _preflightIssueFilter[0], setPreflightIssueFilter = _preflightIssueFilter[1];
    var _shortcutsOpen = React.useState(false); var shortcutsOpen = _shortcutsOpen[0], setShortcutsOpen = _shortcutsOpen[1];
    // Fullscreen editing surface (Aaron request). Preference persists so it sticks
    // across opens; degrades silently if localStorage is unavailable.
    var _fullscreen = React.useState(function () { try { return localStorage.getItem('alloStudioFullscreen_v1') === '1'; } catch (_) { return false; } });
    var fullscreen = _fullscreen[0], setFullscreenState = _fullscreen[1];
    var setFullscreen = function (v) { setFullscreenState(v); try { localStorage.setItem('alloStudioFullscreen_v1', v ? '1' : '0'); } catch (_) {} };
    var _templateFilter = React.useState('all'); var templateFilter = _templateFilter[0], setTemplateFilter = _templateFilter[1];
    var _resourceOpen = React.useState(false); var resourceOpen = _resourceOpen[0], setResourceOpen = _resourceOpen[1];
    var _resourceSearch = React.useState(''); var resourceSearch = _resourceSearch[0], setResourceSearch = _resourceSearch[1];
    var _recentTick = React.useState(0); var recentTick = _recentTick[0], setRecentTick = _recentTick[1];
    var _canvasZoom = React.useState(null); var canvasZoom = _canvasZoom[0], setCanvasZoom = _canvasZoom[1];
    var _navigatorMode = React.useState('reading'); var navigatorMode = _navigatorMode[0], setNavigatorMode = _navigatorMode[1];
    var _orderAssistOpen = React.useState(false); var orderAssistOpen = _orderAssistOpen[0], setOrderAssistOpen = _orderAssistOpen[1];
    var _snapEnabled = React.useState(true); var snapEnabled = _snapEnabled[0], setSnapEnabled = _snapEnabled[1];
    var _snapGuides = React.useState([]); var snapGuides = _snapGuides[0], setSnapGuides = _snapGuides[1];
    var readViewport = function () {
      try { return { w: window.innerWidth || 1220, h: window.innerHeight || 860 }; } catch (_) { return { w: 1220, h: 860 }; }
    };
    var _viewport = React.useState(readViewport); var viewport = _viewport[0], setViewport = _viewport[1];
    var _drag = React.useRef(null); // {id, mode:'move'|'resize', startX, startY, frame0}
    var _skipFocusSelect = React.useRef(false);
    var _dragLive = React.useState(null); var dragLive = _dragLive[0], setDragLive = _dragLive[1];
    var fileRef = React.useRef(null);
    var loadRef = React.useRef(null);
    // Focus management (WCAG 2.4.3): move focus into the dialog on open, restore
    // it to the opener on close, and keep Tab inside the modal while it is up.
    var _shellRef = React.useRef(null);
    var _prevFocusRef = React.useRef(null);
    React.useEffect(function () {
      try { _prevFocusRef.current = document.activeElement; } catch (_) {}
      try {
        var root = _shellRef.current;
        if (root) { var first = root.querySelector('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'); (first || root).focus(); }
      } catch (_) {}
      return function () { try { var p = _prevFocusRef.current; if (p && typeof p.focus === 'function') p.focus(); } catch (_) {} };
    }, []);
    React.useEffect(function () {
      var update = function () { setViewport(readViewport()); };
      update();
      try { window.addEventListener('resize', update); } catch (_) {}
      return function () { try { window.removeEventListener('resize', update); } catch (_) {} };
    }, []);
    var trapTabWithin = function (root, ev) {
      if (ev.key !== 'Tab' || !root) return;
      var nodes = root.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])');
      var list = Array.prototype.filter.call(nodes, function (n) { return n.offsetParent !== null || n === document.activeElement; });
      if (!list.length) { ev.preventDefault(); root.focus(); return; }
      var first = list[0], last = list[list.length - 1], active = document.activeElement;
      if (active === root) {
        ev.preventDefault();
        try { (ev.shiftKey ? last : first).focus(); } catch (_) {}
      } else if (ev.shiftKey) {
        if (active === first || !root.contains(active)) { ev.preventDefault(); try { last.focus(); } catch (_) {} }
      } else if (active === last || !root.contains(active)) {
        ev.preventDefault(); try { first.focus(); } catch (_) {}
      }
    };
    var trapTab = function (ev) {
      trapTabWithin(_shellRef.current, ev);
    };    // AI (Milestone B) — optional capabilities. The buttons only appear when the
    // host app wires the callbacks, so older wiring degrades cleanly. Every AI
    // result enters the ledger as actor 'ai' (provenance by construction).
    var canGenerateImage = typeof props.onGenerateImage === 'function';
    var canSuggestAlt = typeof props.onSuggestAlt === 'function';
    // Agentic surfaces are TEACHER-ONLY for now (Aaron, 2026-07-05): the agent
    // panel, whole-image AI edit, bulk alt drafting, and design feedback all
    // hide in student mode. Single "suggest alt" + "generate image" keep their
    // existing both-roles behavior.
    var canAgentEdit = typeof props.onAgentEdit === 'function' && role !== 'student';
    var canEditImage = typeof props.onEditImage === 'function' && role !== 'student';
    var canDesignFeedback = typeof props.onDesignFeedback === 'function' && role !== 'student';
    var canBulkAlt = canSuggestAlt && role !== 'student';
    var _aiGenOpen = React.useState(false); var aiGenOpen = _aiGenOpen[0], setAiGenOpen = _aiGenOpen[1];
    var _aiGenPrompt = React.useState(''); var aiGenPrompt = _aiGenPrompt[0], setAiGenPrompt = _aiGenPrompt[1];
    var _aiBusy = React.useState(null); var aiBusy = _aiBusy[0], setAiBusy = _aiBusy[1];
    var _altNonce = React.useState(0); var altNonce = _altNonce[0], setAltNonce = _altNonce[1];
    var _agentOpen = React.useState(false); var agentOpen = _agentOpen[0], setAgentOpen = _agentOpen[1];
    var _agentScope = React.useState('selection'); var agentScope = _agentScope[0], setAgentScope = _agentScope[1];
    var _agentPrompt = React.useState(''); var agentPrompt = _agentPrompt[0], setAgentPrompt = _agentPrompt[1];
    var _agentPlan = React.useState(null); var agentPlan = _agentPlan[0], setAgentPlan = _agentPlan[1];
    var _agentSelectedOps = React.useState([]); var agentSelectedOps = _agentSelectedOps[0], setAgentSelectedOps = _agentSelectedOps[1];
    var _agentFollowUp = React.useState(''); var agentFollowUp = _agentFollowUp[0], setAgentFollowUp = _agentFollowUp[1];
    var _imgEditOpen = React.useState(false); var imgEditOpen = _imgEditOpen[0], setImgEditOpen = _imgEditOpen[1];
    var _imgEditPrompt = React.useState(''); var imgEditPrompt = _imgEditPrompt[0], setImgEditPrompt = _imgEditPrompt[1];
    var _designFeedback = React.useState(null); var designFeedback = _designFeedback[0], setDesignFeedback = _designFeedback[1];
    // Active school brand (BrandProfile module) — read once per open via the
    // lazy useState initializer; degrades to the stock kits when absent.
    var _brandProfile = React.useState(function () {
      try {
        var bp = window.AlloModules && window.AlloModules.BrandProfile;
        return (bp && typeof bp.getActiveBrandProfile === 'function') ? bp.getActiveBrandProfile() : null;
      } catch (_) { return null; }
    });
    var brandProfile = _brandProfile[0];
    var _composePrompt = React.useState(''); var composePrompt = _composePrompt[0], setComposePrompt = _composePrompt[1];
    var _composePreset = React.useState('letter-portrait'); var composePreset = _composePreset[0], setComposePreset = _composePreset[1];
    var _agentPreview = React.useState(null); var agentPreview = _agentPreview[0], setAgentPreview = _agentPreview[1];
    var _revokePreview = function (p) { if (p) { try { URL.revokeObjectURL(p.before); } catch (_) {} try { URL.revokeObjectURL(p.after); } catch (_) {} } };
    var clearAgentPreview = function () { setAgentPreview(function (prev) { _revokePreview(prev); return null; }); };
    // Autosave: debounced snapshot of the working doc (full ledger) so a
    // closed tab never loses a class period's work. The timer resets on every
    // render (each op re-renders), so the write lands ~4s after activity stops.
    var _autosaveNoteRef = React.useRef(false);
    React.useEffect(function () {
      var timer = setTimeout(function () {
        var liveDoc = _docRef.current;
        if (!liveDoc || !liveDoc.ledger || !liveDoc.ledger.ops.length) return;
        var res = stWriteAutosave(liveDoc, Date.now());
        if (!res.ok && res.reason === 'too-large' && !_autosaveNoteRef.current) {
          _autosaveNoteRef.current = true;
          addToast(TT('studio.autosave_large', 'Autosave paused: this document is too large to snapshot. Save your file often.'), 'info');
        }
      }, 4000);
      return function () { clearTimeout(timer); };
    });
    // In-editor crop: cropId opens the modal, cropRect is the drag selection in
    // 0..1 fractions of the displayed image.
    var _cropId = React.useState(null); var cropId = _cropId[0], setCropId = _cropId[1];
    var _cropRect = React.useState(null); var cropRect = _cropRect[0], setCropRect = _cropRect[1];
    var _cropImgRef = React.useRef(null);
    var _cropDrag = React.useRef(null);
    var _cropDialogRef = React.useRef(null);
    var _cropReturnFocusRef = React.useRef(null);
    React.useEffect(function () {
      if (!cropId) return undefined;
      try { _cropReturnFocusRef.current = document.activeElement; } catch (_) {}
      var timer = setTimeout(function () {
        try { if (_cropDialogRef.current) _cropDialogRef.current.focus(); } catch (_) {}
      }, 0);
      return function () {
        clearTimeout(timer);
        try {
          var prior = _cropReturnFocusRef.current;
          if (prior && typeof prior.focus === 'function' && document.contains(prior)) prior.focus();
        } catch (_) {}
      };
    }, [cropId]);
    var student = role === 'student';
    var propTheme = ['light', 'dark', 'contrast'].indexOf(props.theme) >= 0 ? props.theme : null;
    var themeName = propTheme || (function () {
      try {
        if (document.querySelector('.theme-contrast')) return 'contrast';
        if (document.querySelector('.theme-dark')) return 'dark';
      } catch (_) {}
      return 'light';
    })();
    var C = themeName === 'contrast'
      ? { overlay: 'rgba(0,0,0,0.88)', shell: '#000000', panel: '#000000', panelAlt: '#000000', text: '#ffffff', muted: '#ffff00', soft: '#ffffff', border: '#ffffff', headerBg: '#000000', headerText: '#ffff00', hBtnBg: '#000000', hBtnText: '#ffff00', hBtnBorder: '#ffff00', inputBg: '#000000', inputText: '#ffffff', accent: '#ffff00', exportBg: '#000000', exportBorder: '#ffff00', selectedBg: '#1f2937' }
      : themeName === 'dark'
        ? { overlay: 'rgba(2,6,23,0.78)', shell: '#0f172a', panel: '#111827', panelAlt: '#1e293b', text: '#f8fafc', muted: '#cbd5e1', soft: '#94a3b8', border: '#475569', headerBg: '#020617', headerText: '#f8fafc', hBtnBg: '#1e293b', hBtnText: '#f8fafc', hBtnBorder: '#475569', inputBg: '#020617', inputText: '#f8fafc', accent: '#a5b4fc', exportBg: '#1e1b4b', exportBorder: '#4338ca', selectedBg: '#312e81' }
        : { overlay: 'rgba(15,23,42,0.55)', shell: '#f8fafc', panel: '#ffffff', panelAlt: '#f8fafc', text: '#0f172a', muted: '#64748b', soft: '#94a3b8', border: '#cbd5e1', headerBg: '#0f172a', headerText: '#ffffff', hBtnBg: '#1e293b', hBtnText: '#e2e8f0', hBtnBorder: '#334155', inputBg: '#ffffff', inputText: '#0f172a', accent: '#6366f1', exportBg: '#eef2ff', exportBorder: '#c7d2fe', selectedBg: '#e0e7ff' };
    var layout = stStudioLayout(viewport.w, viewport.h);
    var statusTone = function (tone) { return stUiStatusTone(themeName, tone); };

    var doc = _docRef.current;
    var fitScale = doc ? stCanvasFitScale(doc.canvas, layout, viewport) : layout.canvasScale;
    var SCALE = canvasZoom === null ? fitScale : stAdjustCanvasZoom(canvasZoom, 'clamp', fitScale);
    var zoomLabel = Math.round(SCALE * 100) + '%';
    var changeCanvasZoom = function (action) {
      setCanvasZoom(function (z) { return stAdjustCanvasZoom(z, action, fitScale); });
      stAnnounce(TT('studio.a11y_zoom_changed', 'Canvas zoom changed'));
    };

    var dispatch = function (opBody, actor) {
      try {
        var op = stAppend(_docRef.current, opBody, actor || 'user', Date.now());
        bump();
        return op;
      } catch (err) { addToast('AlloStudio: ' + (err && err.message || 'op failed'), 'error'); }
      return null;
    };
    var dispatchGesture = function (opBodies, actor, label, gestureId) {
      try {
        var applied = stAppendGesture(_docRef.current, opBodies, actor || 'user', Date.now(), { label: label || 'Grouped edit', id: gestureId });
        if (applied.length) bump();
        return applied;
      } catch (err) { addToast('AlloStudio: ' + (err && err.message || 'grouped edit failed'), 'error'); }
      return [];
    };
    var clearSelection = function () { setSelectedId(null); setSelectedIds([]); };
    var selectOnly = function (id) { setSelectedId(id || null); setSelectedIds(id ? [id] : []); };
    var toggleSelection = function (id) {
      if (!id) return;
      var list = Array.isArray(selectedIds) ? selectedIds.slice() : [];
      var at = list.indexOf(id);
      if (at >= 0) list.splice(at, 1);
      else list.push(id);
      setSelectedIds(list);
      setSelectedId(list.length ? (at >= 0 ? list[list.length - 1] : id) : null);
    };
    var selectAllObjects = function () {
      if (!doc || !doc.objects.length) return;
      var ids = doc.objects.map(function (o) { return o.id; });
      setSelectedIds(ids);
      setSelectedId(ids[ids.length - 1]);
      stAnnounce(TT('studio.a11y_selected_all', 'Selected all objects'));
    };
    // Bring the selected object one step earlier/later in READING ORDER (the same
    // move as the navigator ↑/↓ buttons; Ctrl+[ / Ctrl+]). Single-selection only.
    var reorderSelected = function (dir) {
      if (!doc || !selectedId) return;
      var idx = -1;
      for (var i = 0; i < doc.objects.length; i++) { if (doc.objects[i].id === selectedId) { idx = i; break; } }
      if (idx < 0) return;
      var to = idx + (dir < 0 ? -1 : 1);
      if (to < 0 || to > doc.objects.length - 1) return;
      dispatch({ type: 'object.reorder', target: selectedId, toIndex: to }, 'user');
      stAnnounce(dir < 0 ? TT('studio.a11y_moved_earlier', 'Moved earlier in reading order') : TT('studio.a11y_moved_later', 'Moved later in reading order'));
    };
    var selected = doc && selectedId ? doc.objects.filter(function (o) { return o.id === selectedId; })[0] : null;
    var selectionIds = (Array.isArray(selectedIds) ? selectedIds : []).filter(function (id) {
      return doc && doc.objects.some(function (o) { return o && o.id === id; });
    });
    if (!selectionIds.length && selected) selectionIds = [selected.id];
    var selectedGroup = doc ? stSelectionObjects(doc.objects, selectionIds) : [];
    var agentEffectiveScope = agentScope === 'selection' && selectionIds.length ? 'selection' : 'document';
    var preflight = doc ? stAnalyzeDoc(doc) : { issues: [], counts: { error: 0, warning: 0, review: 0 } };
    var preflightTotal = preflight.counts.error + preflight.counts.warning + preflight.counts.review;
    var visiblePreflightIssues = stFilterPreflightIssues(preflight, preflightIssueFilter);
    var accessibilityChecklist = stBuildAccessibilityChecklist(preflight);
    var ready = doc ? stBuildReadyActions(doc) : null;
    var quickReady = preflightIssueFilter === 'all' ? ready : (doc ? stBuildReadyActions(doc, preflightIssueFilter) : null);
    var preflightGuide = doc ? stPreflightGuide(doc, preflightGuideIndex, preflightIssueFilter) : { total: 0, index: -1, position: 0, issue: null, actions: [] };
    var exportConfidence = doc ? stExportConfidence(doc) : { status: 'blocked', cards: [] };
    var a11yAutoFix = doc ? stBuildA11yAutoFixPlan(doc) : { ops: [], fixedTypes: [], reviewCount: 0 };
    var readingSuggestion = doc ? stReadingOrderSuggestion(doc) : { total: 0, changed: false, currentIds: [], suggestedIds: [], suggested: [], changes: [] };
    var applyReadingOrderSuggestion = function () {
      if (!readingSuggestion.changed) return;
      var reorderOps = [];
      var working = { title: doc.title, canvas: doc.canvas, objects: stClone(doc.objects) };
      readingSuggestion.suggestedIds.forEach(function (id, idx) {
        var cur = working.objects.findIndex(function (o) { return o && o.id === id; });
        if (cur >= 0 && cur !== idx) {
          var body = { type: 'object.reorder', target: id, toIndex: idx };
          reorderOps.push(body);
          working = stApplyOp(working, body);
        }
      });
      dispatchGesture(reorderOps, 'user', 'Apply reading order');
      setNavigatorMode('reading');
      setOrderAssistOpen(false);
      stAnnounce(TT('studio.a11y_order_applied', 'Reading order updated'));
    };
    var historyItems = [];
    try {
      historyItems = Array.isArray(props.history) ? props.history : (Array.isArray(props.resourceHistory) ? props.resourceHistory : (Array.isArray(window.__alloflowHistory) ? window.__alloflowHistory : []));
    } catch (_) { historyItems = []; }
    var resourceCues = stBuildResourceCues(historyItems, { limit: 120 });
    var resourceQuery = stCleanText(resourceSearch, 80).toLowerCase();
    var visibleResourceCues = resourceQuery
      ? resourceCues.filter(function (cue) { return [cue.label, cue.text, cue.kind, cue.sourceTitle, cue.sourceType].join(' ').toLowerCase().indexOf(resourceQuery) >= 0; })
      : resourceCues;

    var startFromTemplate = function (tpl, preset) {
      _docRef.current = tpl.make(Date.now(), preset);
      setView('edit'); clearSelection();
      stAnnounce(TT('studio.a11y_started', 'Started a new document from template') + ': ' + tpl.name);
    };

    // ── object insertion ──
    var selectFromOp = function (op) { if (op && op.object && op.object.id) selectOnly(op.object.id); return op; };
    var insertText = function (roleKind) {
      var obj = stMakeText(roleKind, roleKind === 'body' ? TT('studio.new_text', 'New text — double-click to edit') : TT('studio.new_heading', 'New heading'), { x: 60, y: 60, w: 400, h: roleKind === 'heading1' ? 70 : 50 });
      selectFromOp(dispatch({ type: 'object.add', object: obj }, 'user'));
    };
    var insertShape = function (kind) {
      selectFromOp(dispatch({ type: 'object.add', object: stMakeShape(kind, { x: 80, y: 80, w: 240, h: 160 }, kind === 'ellipse' ? '#fce7f3' : '#dbeafe') }, 'user'));
    };
    var onPickImage = function (ev) {
      var f = ev.target.files && ev.target.files[0];
      ev.target.value = '';
      if (!f) return;
      var r = new FileReader();
      r.onload = function (e) {
        // actor 'import': the asset came from outside the editor — the ledger
        // labels it honestly (we cannot see inside an uploaded image).
        // Downscaled first so a camera photo doesn't bloat the save file.
        stImportImageDataUrl(e.target.result, 1600).then(function (src) {
          if (!src) { addToast(TT('studio.image_import_failed', 'That file could not be imported as an image.'), 'error'); return; }
          selectFromOp(dispatch({ type: 'object.add', object: stMakeImage(src, '', { x: 100, y: 100, w: 320, h: 240 }, 'upload') }, 'import'));
          addToast(TT('studio.image_added', '🖼️ Image added — give it alt text (or mark it decorative) before exporting.'), 'info');
        });
      };
      r.readAsDataURL(f);
    };
    var insertResourceCue = function (cue) {
      if (!doc || !cue) return;
      var y = 72 + (doc.objects.length % 7) * 28;
      var objects = stObjectsFromResourceCue(cue, { canvas: doc.canvas, x: 56, y: y, w: Math.max(220, doc.canvas.w - 112) });
      var applied = dispatchGesture(objects.map(function (obj) { return { type: 'object.add', object: obj }; }), 'import', 'Insert resource');
      var last = applied.length ? applied[applied.length - 1] : null;
      if (last && last.object && last.object.id) selectOnly(last.object.id);
      stAnnounce(TT('studio.resource_inserted_a11y', 'Resource inserted into Studio'));
      addToast(TT('studio.resource_inserted', 'Resource added as editable Studio objects.'), 'success');
    };
    var readyActionLabel = function (action) {
      if (!action) return '';
      return action.type === 'fix-small-text' ? TT('studio.fix_small_text', 'Make text readable')
        : action.type === 'fix-contrast' ? TT('studio.fix_contrast', 'Improve contrast')
          : action.type === 'add-alt' ? TT('studio.add_alt', 'Add alt text')
            : action.type === 'mark-decorative' ? TT('studio.mark_decorative', 'Mark decorative')
              : action.type === 'fix-bounds' ? TT('studio.fit_on_page', 'Fit on page')
              : action.type === 'optimize-image' ? TT('studio.optimize_image', 'Optimize image')
                : action.type === 'replace-image' || action.type === 'select-image' ? TT('studio.replace_image_short', 'Replace image')
                  : action.type === 'remove-placeholder' ? TT('studio.remove_frame', 'Remove frame')
                    : action.type === 'keep-placeholder' ? TT('studio.keep_placeholder', 'Keep placeholder')
                      : action.type === 'review-reading-order' ? TT('studio.review_order', 'Review reading order')
                        : action.title;
    };
    var focusAltTextFor = function (targetId) {
      setTimeout(function () {
        try {
          var nodes = document.querySelectorAll('[data-st-alt-input]');
          for (var i = 0; i < nodes.length; i++) {
            if (nodes[i].getAttribute('data-st-alt-input') === String(targetId)) { nodes[i].focus(); break; }
          }
        } catch (_) {}
      }, 0);
    };
    var advancePreflightGuideAfter = function (action, beforeAnalysis) {
      var afterAnalysis = stAnalyzeDoc(_docRef.current);
      setPreflightGuideIndex(stNextPreflightGuideIndex(beforeAnalysis || preflight, afterAnalysis, preflightGuideIndex, action, preflightIssueFilter));
    };
    var applyReadyAction = function (action) {
      if (!action) return;
      if (action.targetId) selectOnly(action.targetId);
      if (action.type === 'fix-small-text' && action.targetId) {
        var small = doc.objects.filter(function (o) { return o && o.id === action.targetId; })[0];
        if (small && small.type === 'text') {
          var runs = stClone(small.runs || [{ text: '', style: {} }]);
          if (!runs[0]) runs[0] = { text: '', style: {} };
          runs[0].style = Object.assign({}, runs[0].style, { size: Math.max(12, stFiniteNumber(runs[0].style && runs[0].style.size, 16)) });
          var beforeSmallFix = stAnalyzeDoc(_docRef.current);
          dispatch({ type: 'object.update', target: small.id, patch: { runs: runs } }, 'user');
          advancePreflightGuideAfter(action, beforeSmallFix);
          stAnnounce(TT('studio.a11y_text_enlarged', 'Text size increased'));
          return;
        }
      }
      if (action.type === 'fix-contrast' && action.targetId && action.suggestedColor) {
        var contrast = doc.objects.filter(function (o) { return o && o.id === action.targetId; })[0];
        if (contrast && contrast.type === 'text') {
          var cruns = stClone(contrast.runs || [{ text: '', style: {} }]);
          if (!cruns[0]) cruns[0] = { text: '', style: {} };
          cruns[0].style = Object.assign({}, cruns[0].style, { color: action.suggestedColor });
          var beforeContrastFix = stAnalyzeDoc(_docRef.current);
          dispatch({ type: 'object.update', target: contrast.id, patch: { runs: cruns } }, 'user');
          advancePreflightGuideAfter(action, beforeContrastFix);
          stAnnounce(TT('studio.a11y_contrast_fixed', 'Text contrast adjusted'));
          return;
        }
      }
      if (action.type === 'fix-bounds' && action.targetId) {
        var bounded = doc.objects.filter(function (o) { return o && o.id === action.targetId; })[0];
        var frame = action.suggestedFrame || (bounded && bounded.frame ? stClampFrame(bounded.frame, doc.canvas) : null);
        if (bounded && frame) {
          var beforeBoundsFix = stAnalyzeDoc(_docRef.current);
          dispatch({ type: 'object.update', target: bounded.id, patch: { frame: frame } }, 'user');
          advancePreflightGuideAfter(action, beforeBoundsFix);
          stAnnounce(TT('studio.a11y_fit_on_page', 'Object moved onto the page'));
          return;
        }
      }
      if (action.type === 'add-alt' && action.targetId) {
        focusAltTextFor(action.targetId);
        stAnnounce(TT('studio.a11y_alt_jump', 'Selected image missing alt text — the alt text field is in the right panel.'));
        return;
      }
      if (action.type === 'mark-decorative' && action.targetId) {
        var decorativeImage = doc.objects.filter(function (o) { return o && o.id === action.targetId; })[0];
        if (decorativeImage && decorativeImage.type === 'image') {
          var beforeDecorativeFix = stAnalyzeDoc(_docRef.current);
          dispatch({ type: 'object.update', target: decorativeImage.id, patch: { decorative: true } }, 'user');
          advancePreflightGuideAfter(action, beforeDecorativeFix);
          stAnnounce(TT('studio.a11y_marked_decorative', 'Image marked decorative'));
        }
        return;
      }
      if ((action.type === 'replace-image' || action.type === 'select-image') && action.targetId) {
        if (fileRef.current) {
          fileRef.current.setAttribute('data-st-replace', action.targetId);
          fileRef.current.click();
          stAnnounce(TT('studio.a11y_replace_image', 'Choose an image for this frame'));
        }
        return;
      }
      if (action.type === 'remove-placeholder' && action.targetId) {
        var removable = doc.objects.filter(function (o) { return o && o.id === action.targetId; })[0];
        if (removable && removable.type === 'image' && !removable.src) {
          var beforeRemovePlaceholder = stAnalyzeDoc(_docRef.current);
          dispatch({ type: 'object.remove', target: removable.id }, 'user');
          clearSelection();
          advancePreflightGuideAfter(action, beforeRemovePlaceholder);
          stAnnounce(TT('studio.a11y_placeholder_removed', 'Image frame removed'));
        }
        return;
      }
      if (action.type === 'keep-placeholder' && action.targetId) {
        var placeholder = doc.objects.filter(function (o) { return o && o.id === action.targetId; })[0];
        if (placeholder && placeholder.type === 'image' && !placeholder.src) {
          var beforeKeepPlaceholder = stAnalyzeDoc(_docRef.current);
          dispatch({ type: 'object.update', target: placeholder.id, patch: stKeepPlaceholderPatch(placeholder) }, 'user');
          advancePreflightGuideAfter(action, beforeKeepPlaceholder);
          stAnnounce(TT('studio.a11y_placeholder_kept', 'Placeholder kept'));
        }
        return;
      }
      if (action.type === 'optimize-image' && action.targetId) {
        var heavy = doc.objects.filter(function (o) { return o && o.id === action.targetId; })[0];
        if (!heavy || heavy.type !== 'image' || !heavy.src) return;
        if (aiBusy) { addToast(TT('studio.optimize_busy', 'Another Studio action is running. Try again in a moment.'), 'info'); return; }
        var beforeInfo = action.imageWeight || stImageWeightInfo(heavy.src);
        if (!beforeInfo.canOptimize) { addToast(TT('studio.optimize_unavailable', 'This image cannot be optimized in the browser.'), 'info'); return; }
        setAiBusy('optimize-image');
        stOptimizeImageDataUrl(heavy.src, action.optimizeMaxDim || ST_IMAGE_OPTIMIZE_MAX_DIM).then(function (optimized) {
          setAiBusy(null);
          var live = _docRef.current && _docRef.current.objects ? _docRef.current.objects.filter(function (o) { return o && o.id === action.targetId; })[0] : null;
          if (!live || live.type !== 'image') return;
          if (!optimized || optimized.length >= String(live.src || '').length) {
            addToast(TT('studio.optimize_no_gain', 'Image is already as small as Studio can make it safely.'), 'info');
            return;
          }
          var afterInfo = stImageWeightInfo(optimized);
          var beforeOptimizeFix = stAnalyzeDoc(_docRef.current);
          dispatch({ type: 'object.update', target: live.id, patch: stOptimizedImagePatch(live, optimized, beforeInfo, afterInfo) }, 'user');
          advancePreflightGuideAfter(action, beforeOptimizeFix);
          stAnnounce(TT('studio.a11y_image_optimized', 'Image optimized'));
          addToast(TT('studio.optimize_done', 'Image optimized.') + ' ' + beforeInfo.approxKb + ' KB → ' + afterInfo.approxKb + ' KB', 'success');
        }).catch(function () {
          setAiBusy(null);
          addToast(TT('studio.optimize_failed', 'Could not optimize the image.'), 'error');
        });
        return;
      }
      if (action.type === 'review-reading-order') {
        setNavigatorMode('reading');
        stAnnounce(TT('studio.a11y_review_reading_order', 'Review the reading order list on the right'));
        addToast(TT('studio.review_reading_order', 'Use the reading-order list on the right to match the screen-reader order.'), 'info');
        return;
      }
      stAnnounce(action.title || TT('studio.a11y_ready_action', 'Ready to share action selected'));
    };

    // ── AI (Milestone B): generate image + suggest alt text ──
    var applyA11yAutoFix = function () {
      if (!doc) return;
      var plan = stBuildA11yAutoFixPlan(doc);
      if (!plan.ops.length) {
        addToast(TT('studio.a11y_no_quick_fixes', 'No simple accessibility fixes are available. Review the remaining items.'), 'info');
        return;
      }
      dispatchGesture(plan.ops, 'user', 'Fix accessibility');
      stAnnounce(TT('studio.a11y_quick_fixed', 'Simple accessibility fixes applied'));
      addToast(TT('studio.a11y_quick_fixed', 'Simple accessibility fixes applied') + ' (' + plan.fixedTypes.length + ')', 'success');
    };

    var runGenerateImage = function () {
      var prompt = String(aiGenPrompt || '').trim();
      if (!prompt) { addToast(TT('studio.ai_need_prompt', 'Describe the image you want first.'), 'info'); return; }
      if (!canGenerateImage || aiBusy) return;
      setAiBusy('generate');
      Promise.resolve(props.onGenerateImage(prompt)).then(function (dataUrl) {
        setAiBusy(null);
        if (!stIsSafeDataImage(dataUrl, ST_MAX_IMAGE_SRC_LENGTH)) { addToast(TT('studio.ai_gen_failed', 'Could not generate an image.'), 'error'); return; }
        // actor 'ai': the pixels came from a model through our own API seam. The
        // prompt lives in provenance. Alt stays EMPTY — a generation prompt is
        // not screen-reader alt text, so the gate still makes the teacher (or
        // "Suggest alt text") describe it honestly.
        var obj = stMakeImage(dataUrl, '', { x: 120, y: 120, w: 360, h: 270 }, 'ai-generated');
        obj.provenance = { origin: 'ai-generated', prompt: prompt };
        selectFromOp(dispatch({ type: 'object.add', object: obj }, 'ai'));
        setAiGenOpen(false); setAiGenPrompt('');
        stAnnounce(TT('studio.a11y_ai_generated', 'AI image added — remember to add alt text'));
        addToast(TT('studio.ai_gen_ok', '✨ Image generated (logged as AI in your process). Add alt text before exporting.'), 'success');
      }).catch(function (err) { setAiBusy(null); addToast(TT('studio.ai_gen_failed', 'Could not generate an image.') + ' ' + (err && err.message || ''), 'error'); });
    };
    var runSuggestAlt = function () {
      if (!selected || selected.type !== 'image' || !selected.src || !canSuggestAlt || aiBusy) return;
      var id = selected.id;
      setAiBusy('alt');
      Promise.resolve(props.onSuggestAlt(selected.src)).then(function (text) {
        setAiBusy(null);
        var alt = String(text || '').replace(/\s+/g, ' ').trim();
        if (!alt) { addToast(TT('studio.ai_alt_failed', 'Could not draft alt text.'), 'error'); return; }
        // actor 'ai': recorded honestly as an AI DRAFT. The teacher reviews and
        // any edit lands as a 'user' op, so the ledger stays truthful.
        dispatch({ type: 'object.update', target: id, patch: { alt: alt } }, 'ai');
        setAltNonce(function (n) { return n + 1; }); // remount the alt field to show the draft
        stAnnounce(TT('studio.a11y_ai_alt', 'Draft alt text added — review it'));
        addToast(TT('studio.ai_alt_ok', '✨ Draft alt text added (logged as AI). Please review and edit it.'), 'info');
      }).catch(function (err) { setAiBusy(null); addToast(TT('studio.ai_alt_failed', 'Could not draft alt text.') + ' ' + (err && err.message || ''), 'error'); });
    };

    // One agent request → one reviewable plan. `refineOf` carries the previous
    // proposal back to the model so "adjust it" keeps context — conversational
    // iteration with zero hidden chat state (everything shown in the panel).
    var mintBatchId = function () { return 'p' + Date.now().toString(36) + Math.floor(Math.random() * 46656).toString(36); };
    var requestAgentPlan = function (promptText, refineOf, scopeOverride) {
      var liveDoc = _docRef.current;
      if (!liveDoc || !canAgentEdit || aiBusy) return;
      clearAgentPreview();
      var scope = stBuildAgentScope(liveDoc, scopeOverride || agentEffectiveScope, scopeOverride ? [] : selectionIds);
      var request = { prompt: promptText, scope: scope.scope, selectionIds: scope.selectedIds, document: scope };
      var brandKit = stBrandStyleKit(brandProfile);
      if (brandKit) request.brand = { heading: brandKit.heading, body: brandKit.body, background: brandKit.background, shape: brandKit.shape };
      if (refineOf) request.priorPlan = { prompt: refineOf.prompt || '', summary: refineOf.summary || '', ops: refineOf.ops || [] };
      setAiBusy('agent');
      setAgentPlan(null);
      setAgentSelectedOps([]);
      Promise.resolve(props.onAgentEdit(request)).then(function (plan) {
        setAiBusy(null);
        var normalized = stNormalizeAgentPlan(plan, _docRef.current, { scope: scope.scope, ids: scope.selectedIds });
        normalized.prompt = promptText;
        normalized.batch = mintBatchId();
        setAgentPlan(normalized);
        setAgentSelectedOps(normalized.ops.map(function (_, idx) { return idx; }));
        setAgentFollowUp('');
        if (normalized.ops.length) {
          stAnnounce(TT('studio.a11y_agent_plan_ready', 'AI edit proposal ready'));
          addToast(TT('studio.agent_plan_ready', 'AI proposed changes. Review before applying.'), 'info');
        } else {
          addToast(TT('studio.agent_no_safe_changes', 'AI did not return safe editable changes.'), 'error');
        }
      }).catch(function (err) {
        setAiBusy(null);
        addToast(TT('studio.agent_failed', 'AI edit failed.') + ' ' + (err && err.message || ''), 'error');
      });
    };
    var runAgentEdit = function () {
      var prompt = String(agentPrompt || '').trim();
      if (!prompt) { addToast(TT('studio.agent_need_prompt', 'Tell the AI what to change first.'), 'info'); return; }
      requestAgentPlan(prompt, null);
    };
    var runAgentRefine = function () {
      var follow = String(agentFollowUp || '').trim();
      if (!follow || !agentPlan) return;
      requestAgentPlan((agentPlan.prompt ? agentPlan.prompt + ' — adjustment: ' : '') + follow, agentPlan);
    };
    var applyAgentPlan = function () {
      if (!agentPlan || !agentPlan.ops || !agentPlan.ops.length || aiBusy) return;
      var selectedIndexes = Array.isArray(agentSelectedOps) ? agentSelectedOps : [];
      var opsToApply = agentPlan.ops.filter(function (_, idx) { return selectedIndexes.indexOf(idx) >= 0; });
      if (!opsToApply.length) { addToast(TT('studio.agent_select_change', 'Choose at least one change to apply.'), 'info'); return; }
      var beforeCounts = stAnalyzeDoc(_docRef.current).counts;
      var batch = agentPlan.batch || mintBatchId();
      var promptText = agentPlan.prompt || '';
      var stamped = false;
      var touched = [];
      // Batch tag on every op; the teacher's request once (first applied op) —
      // the ledger stays light but the batch is attributable + undoable as one.
      var dispatchAgent = function (op) {
        var body = stClone(op);
        body.agent = stamped ? { batch: batch } : { batch: batch, prompt: promptText };
        body.gesture = { id: 'ai-' + batch, label: 'AI edit' };
        var applied = dispatch(body, 'ai');
        if (!applied) return null;
        stamped = true;
        var id = op.target || (applied.object && applied.object.id);
        if (id && touched.indexOf(id) < 0) touched.push(id);
        return applied;
      };
      var imageReqs = opsToApply.filter(function (op) { return op.type === 'image.request'; });
      var plainOps = opsToApply.filter(function (op) { return op.type !== 'image.request'; });
      var finish = function (failedImages) {
        if (touched.length) { setSelectedIds(touched); setSelectedId(touched[touched.length - 1]); }
        setAgentPlan(null);
        setAgentSelectedOps([]);
        clearAgentPreview();
        var delta = stPreflightDelta(beforeCounts, stAnalyzeDoc(_docRef.current).counts);
        var msg = TT('studio.agent_applied', 'Applied AI changes and logged them in the process history.') + ' ' + delta.text;
        if (failedImages) msg += ' — ' + failedImages + ' ' + TT('studio.agent_images_failed', 'image(s) could not be generated');
        if (delta.direction === 'worse') {
          addToast(msg + '. ' + TT('studio.agent_worse_hint', 'The accessibility check got worse — "Undo AI changes" reverts this in one step.'), 'error');
        } else {
          addToast(msg, failedImages ? 'info' : 'success');
        }
        stAnnounce(TT('studio.a11y_agent_applied', 'AI proposed changes applied'));
      };
      plainOps.forEach(dispatchAgent);
      if (!imageReqs.length) { finish(0); return; }
      // image.request resolves through the SAME Imagen seam as the manual
      // button, sequentially (the queue is rate-limit-aware but order keeps
      // provenance readable). Alt stays EMPTY — the gate still applies.
      if (!canGenerateImage) { finish(imageReqs.length); return; }
      setAiBusy('agent-apply');
      var queue = imageReqs.slice();
      var failedImages = 0;
      var step = function () {
        if (!queue.length) { setAiBusy(null); finish(failedImages); return; }
        var req = queue.shift();
        Promise.resolve(props.onGenerateImage(req.prompt)).then(function (dataUrl) {
          if (stIsSafeDataImage(dataUrl, ST_MAX_IMAGE_SRC_LENGTH)) {
            var obj = stMakeImage(dataUrl, '', req.frame, 'ai-generated');
            obj.provenance = { origin: 'ai-generated', prompt: req.prompt };
            dispatchAgent({ type: 'object.add', object: obj });
          } else { failedImages++; }
          step();
        }).catch(function () { failedImages++; step(); });
      };
      step();
    };
    var undoAgentBatch = function () {
      var n = stUndoAgentBatch(_docRef.current);
      if (!n) return;
      bump();
      clearSelection();
      setAgentPlan(null);
      setAgentSelectedOps([]);
      clearAgentPreview();
      stAnnounce(TT('studio.a11y_agent_undone', 'AI changes undone'));
      addToast(TT('studio.agent_undone', 'Undid the last AI batch') + ' (' + n + ')', 'success');
    };

    // Whole-image AI edit (the app-wide Gemini image-edit seam anchor charts +
    // concept maps already use). NOT a crop: the original stays recoverable
    // through undo/process history, so this is for improving pictures — the
    // crop tool + its scrub invariant own removing sensitive content.
    var runEditImage = function () {
      if (!selected || selected.type !== 'image' || !selected.src || !canEditImage || aiBusy) return;
      var instruction = String(imgEditPrompt || '').trim();
      if (!instruction) { addToast(TT('studio.ai_edit_need_prompt', 'Describe how the image should change first.'), 'info'); return; }
      var id = selected.id;
      var priorOrigin = (selected.provenance && selected.provenance.origin) || 'unknown';
      setAiBusy('img-edit');
      Promise.resolve(props.onEditImage(selected.src, instruction)).then(function (dataUrl) {
        setAiBusy(null);
        if (!stIsSafeDataImage(dataUrl, ST_MAX_IMAGE_SRC_LENGTH)) { addToast(TT('studio.ai_edit_failed', 'Could not edit the image.'), 'error'); return; }
        dispatch({ type: 'object.update', target: id, patch: { src: dataUrl, provenance: { origin: 'ai-edited', prompt: instruction, prior: priorOrigin } } }, 'ai');
        setImgEditPrompt('');
        setImgEditOpen(false);
        stAnnounce(TT('studio.a11y_ai_edited', 'AI edited the image — review the alt text'));
        addToast(TT('studio.ai_edit_ok', '✨ Image edited (logged as AI). Review the alt text — the picture may have changed.'), 'info');
      }).catch(function (err) { setAiBusy(null); addToast(TT('studio.ai_edit_failed', 'Could not edit the image.') + ' ' + (err && err.message || ''), 'error'); });
    };

    // Bulk alt drafting: every unlabeled image gets an AI DRAFT, presented
    // through the SAME review-before-apply panel as agent plans (one
    // attributable, one-step-undoable batch; teacher edits stay 'user' ops).
    var runDraftAllAlt = function () {
      if (!doc || !canBulkAlt || aiBusy) return;
      var byId = {};
      doc.objects.forEach(function (o) { if (o && o.id) byId[o.id] = o; });
      var targets = stAltGate(doc.objects).map(function (m) { return byId[m.id]; }).filter(function (o) { return o && o.src; }).slice(0, 12);
      if (!targets.length) { addToast(TT('studio.ai_alt_none', 'Every image already has alt text or is marked decorative.'), 'info'); return; }
      setAiBusy('alt-all');
      var ops = [];
      var failed = 0;
      var queue = targets.slice();
      var step = function () {
        if (!queue.length) {
          setAiBusy(null);
          if (!ops.length) { addToast(TT('studio.ai_alt_failed', 'Could not draft alt text.'), 'error'); return; }
          setAgentOpen(true);
          setAgentPlan({
            summary: TT('studio.ai_alt_all_summary', 'Draft alt text for review') + ' (' + ops.length + ')',
            ops: ops,
            rejected: failed ? [failed + ' ' + TT('studio.ai_alt_all_failed', 'image(s) could not be drafted')] : [],
            prompt: 'Draft missing alt text',
            batch: mintBatchId()
          });
          setAgentSelectedOps(ops.map(function (_, idx) { return idx; }));
          stAnnounce(TT('studio.a11y_alt_all_ready', 'Alt text drafts ready — review before applying'));
          addToast(TT('studio.ai_alt_all_ready', 'Alt text drafts ready. Review each one before applying.'), 'info');
          return;
        }
        var o = queue.shift();
        Promise.resolve(props.onSuggestAlt(o.src)).then(function (text) {
          var alt = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 300);
          if (alt) ops.push({ type: 'object.update', target: o.id, patch: { alt: alt } }); else failed++;
          step();
        }).catch(function () { failed++; step(); });
      };
      step();
    };

    // Design feedback: render the page → vision critique → text suggestions.
    // Advisory only — no ops, nothing enters the ledger (the document did not
    // change). stRenderPng is the same rasterizer the PNG export uses.
    var runDesignFeedback = function () {
      if (!doc || !canDesignFeedback || aiBusy) return;
      setAiBusy('feedback');
      var feedbackFailed = function (err) {
        setAiBusy(null);
        addToast(TT('studio.feedback_failed', 'Could not get design feedback.') + (err && err.message ? ' ' + err.message : ''), 'error');
      };
      stRenderPng(doc, 0.6).then(function (blob) {
        var reader = new FileReader();
        reader.onload = function (e) {
          var context = (doc.title || 'Untitled') + ' — ' + doc.objects.length + ' object(s), ' + preflightTotal + ' open accessibility item(s)';
          Promise.resolve(props.onDesignFeedback(String(e.target.result || ''), context)).then(function (text) {
            setAiBusy(null);
            var body = String(text || '').trim().slice(0, 1600);
            if (!body) { addToast(TT('studio.feedback_failed', 'Could not get design feedback.'), 'error'); return; }
            setDesignFeedback({ text: body });
            setPreflightOpen(true);
            stAnnounce(TT('studio.a11y_feedback_ready', 'Design feedback ready'));
          }).catch(feedbackFailed);
        };
        reader.onerror = function () { feedbackFailed(null); };
        reader.readAsDataURL(blob);
      }).catch(feedbackFailed);
    };

    // Rendered before/after of the SELECTED plan ops on a detached scene —
    // nothing touches the document or the ledger until Apply.
    var runPlanPreview = function () {
      if (!agentPlan || !agentPlan.ops || aiBusy) return;
      var selectedIndexes = Array.isArray(agentSelectedOps) ? agentSelectedOps : [];
      var opsToPreview = agentPlan.ops.filter(function (_, idx) { return selectedIndexes.indexOf(idx) >= 0; });
      if (!opsToPreview.length) { addToast(TT('studio.agent_select_change', 'Choose at least one change to apply.'), 'info'); return; }
      var liveDoc = _docRef.current;
      if (!liveDoc) return;
      setAiBusy('plan-preview');
      var after = stPreviewScene(liveDoc, opsToPreview);
      Promise.all([stRenderPng(liveDoc, 0.32), stRenderPng(after, 0.32)]).then(function (blobs) {
        setAiBusy(null);
        setAgentPreview(function (prev) { _revokePreview(prev); return { before: URL.createObjectURL(blobs[0]), after: URL.createObjectURL(blobs[1]) }; });
        stAnnounce(TT('studio.a11y_preview_ready', 'Before and after preview rendered'));
      }).catch(function () { setAiBusy(null); addToast(TT('studio.preview_failed', 'Could not render the preview.'), 'error'); });
    };

    // Compose-from-prompt: blank canvas + one agent request, landing in the
    // SAME review panel — the flagship "start with AI" flow (teacher-only).
    var startWithAi = function () {
      var text = String(composePrompt || '').trim();
      if (!text) { addToast(TT('studio.compose_need_prompt', 'Describe the page you want first.'), 'info'); return; }
      if (!canAgentEdit || aiBusy) return;
      var blank = stTemplates().filter(function (tpl) { return tpl.key === 'blank'; })[0];
      _docRef.current = blank ? blank.make(Date.now(), composePreset) : stCreateDoc(composePreset, 'Untitled', Date.now());
      setView('edit'); clearSelection();
      setAgentOpen(true);
      setAgentScope('document');
      setAgentPrompt(text);
      requestAgentPlan('Create a complete, well-organized page on a blank canvas: ' + text + ' Include one clear Heading 1 title near the top, supporting text blocks in reading order, and at most one image request if an image would genuinely help.', null, 'document');
      stAnnounce(TT('studio.a11y_compose', 'Started a blank page and asked the AI for a first draft'));
    };

    // One-click accessibility pass: deterministic fixes apply immediately (as
    // 'user' — they are rules, not model output); alt drafts land in the
    // review panel; structural issues pre-fill a focused agent request.
    var runMakeAccessible = function () {
      if (!doc || aiBusy) return;
      var acted = false;
      if (stBuildA11yAutoFixPlan(doc).ops.length) { applyA11yAutoFix(); acted = true; }
      var live = _docRef.current;
      var needsStructure = stAnalyzeDoc(live).issues.some(function (issue) { return issue.type === 'heading-order'; });
      if (needsStructure && canAgentEdit) {
        setAgentOpen(true);
        setAgentScope('document');
        setAgentPrompt('Fix the heading structure: exactly one clear Heading 1, no skipped heading levels, and a reading order that matches the visual top-to-bottom flow. Keep all wording.');
        acted = true;
      }
      var altTargets = stAltGate(live.objects).filter(function (m) {
        var o = live.objects.filter(function (x) { return x.id === m.id; })[0];
        return o && o.src;
      });
      if (canBulkAlt && altTargets.length) {
        runDraftAllAlt();
        acted = true;
      } else if (needsStructure && canAgentEdit) {
        addToast(TT('studio.a11y_structure_ready', 'A structure-fix request is ready in the AI panel — press "Preview changes".'), 'info');
      }
      if (!acted) addToast(TT('studio.a11y_nothing', 'Nothing to fix automatically — review the remaining items.'), 'info');
    };

    var restoreAutosave = function () {
      var saved = stReadAutosave();
      if (!saved) { addToast(TT('studio.autosave_gone', 'No autosaved work found.'), 'info'); bump(); return; }
      _docRef.current = saved.doc;
      if (!Array.isArray(_docRef.current._redo)) _docRef.current._redo = [];
      setView('edit'); clearSelection();
      stAnnounce(TT('studio.a11y_restored', 'Restored unsaved work'));
      addToast(TT('studio.autosave_restored', '💾 Restored your unsaved work, including its process history.'), 'success');
    };

    // ── in-editor crop ──
    var _cropXY = function (ev) {
      var el = _cropImgRef.current; if (!el) return null;
      var r = el.getBoundingClientRect(); if (!r.width || !r.height) return null;
      return { x: Math.min(Math.max((ev.clientX - r.left) / r.width, 0), 1), y: Math.min(Math.max((ev.clientY - r.top) / r.height, 0), 1) };
    };
    var cropPointerDown = function (ev) {
      var p = _cropXY(ev); if (!p) return;
      ev.preventDefault();
      _cropDrag.current = { x0: p.x, y0: p.y };
      setCropRect({ x: p.x, y: p.y, w: 0, h: 0 });
      try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch (_) {}
    };
    var cropPointerMove = function (ev) {
      var d = _cropDrag.current; if (!d) return;
      var p = _cropXY(ev); if (!p) return;
      setCropRect({ x: Math.min(d.x0, p.x), y: Math.min(d.y0, p.y), w: Math.abs(p.x - d.x0), h: Math.abs(p.y - d.y0) });
    };
    var cropPointerUp = function () { _cropDrag.current = null; };
    var applyCrop = function () {
      var id = cropId;
      var o = doc && id ? doc.objects.filter(function (x) { return x.id === id; })[0] : null;
      if (!o || !o.src) { setCropId(null); return; }
      if (!cropRect || cropRect.w < 0.02 || cropRect.h < 0.02) { addToast(TT('studio.crop_too_small', 'Drag a larger area to crop.'), 'info'); return; }
      var rect = cropRect;
      var im = new Image();
      im.onload = function () {
        var box = stCropBox(im.naturalWidth || im.width, im.naturalHeight || im.height, rect);
        stCropImageToDataUrl(o.src, box).then(function (cropped) {
          // Record the crop in the timeline (honesty), then SCRUB the pre-crop
          // pixels everywhere they persist (privacy invariant). Crop is permanent.
          dispatch({ type: 'object.update', target: id, patch: { src: cropped, _crop: true } }, 'user');
          stScrubObjectSrc(_docRef.current, id, cropped);
          setCropId(null); setCropRect(null); bump();
          stAnnounce(TT('studio.a11y_cropped', 'Image cropped'));
          addToast(TT('studio.cropped_ok', '✂ Image cropped — the trimmed pixels are removed, including from your saved file.'), 'success');
        }).catch(function () { addToast(TT('studio.crop_failed', 'Could not crop the image.'), 'error'); });
      };
      im.onerror = function () { addToast(TT('studio.crop_failed', 'Could not crop the image.'), 'error'); };
      im.src = o.src;
    };
    var setCropPreset = function (key) {
      setCropRect(stCropPresetRect(key));
      stAnnounce(TT('studio.a11y_crop_region_changed', 'Crop region changed'));
    };
    var adjustCrop = function (action) {
      setCropRect(function (r) { return stAdjustCropRect(r || stCropPresetRect('center'), action, 0.04); });
      stAnnounce(TT('studio.a11y_crop_region_changed', 'Crop region changed'));
    };
    var cropSummary = function (rect) {
      if (!rect) return TT('studio.crop_no_region', 'No crop region selected');
      return TT('studio.crop_region', 'Crop region') + ': X ' + Math.round(rect.x * 100) + '%, Y ' + Math.round(rect.y * 100) + '%, W ' + Math.round(rect.w * 100) + '%, H ' + Math.round(rect.h * 100) + '%';
    };

    // ── selection + drag ──
    var onObjectPointerDown = function (o, mode) {
      return function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        if (mode === 'move' && (ev.shiftKey || ev.ctrlKey || ev.metaKey)) {
          _skipFocusSelect.current = true;
          toggleSelection(o.id);
          return;
        }
        selectOnly(o.id);
        _drag.current = { id: o.id, mode: mode, startX: ev.clientX, startY: ev.clientY, frame0: stClone(o.frame) };
        try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch (_) {}
      };
    };
    var onCanvasPointerMove = function (ev) {
      var d = _drag.current; if (!d) return;
      var dx = (ev.clientX - d.startX) / SCALE, dy = (ev.clientY - d.startY) / SCALE;
      var f = stClone(d.frame0);
      if (d.mode === 'move') { f.x += dx; f.y += dy; } else { f.w += dx; f.h += dy; }
      var live = stClampFrame(f, _docRef.current.canvas);
      if (snapEnabled && d.mode === 'move') {
        var others = ((_docRef.current && _docRef.current.objects) || []).filter(function (o) { return o && o.id !== d.id; });
        var snapped = stSnapFrame(f, _docRef.current.canvas, others, { threshold: 8 });
        live = snapped.frame;
        setSnapGuides(snapped.guides);
      } else {
        setSnapGuides([]);
      }
      setDragLive({ id: d.id, frame: live });
    };
    var onCanvasPointerUp = function () {
      var d = _drag.current; if (!d) return;
      _drag.current = null;
      if (dragLive && dragLive.id === d.id) {
        var f = dragLive.frame;
        if (d.mode === 'move') dispatch({ type: 'object.move', target: d.id, x: f.x, y: f.y }, 'user');
        else dispatch({ type: 'object.resize', target: d.id, w: f.w, h: f.h }, 'user');
      }
      setDragLive(null);
      setSnapGuides([]);
    };

    // Keyboard object manipulation (a11y law, doc §7): same grammar as the
    // builder crop modal — arrows move 4px, Shift+arrows resize, Delete removes.
    var onObjectKeyDown = function (o) {
      return function (ev) {
        var f = o.frame;
        var step = 4;
        var moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
        if (moves[ev.key]) {
          ev.preventDefault(); ev.stopPropagation();
          var d = moves[ev.key];
          if (!ev.shiftKey && selectionIds.length > 1 && selectionIds.indexOf(o.id) >= 0) {
            var groupOps = stMoveFramesAsGroup(doc.objects, selectionIds, d[0], d[1], doc.canvas).map(function (p) {
              return { type: 'object.update', target: p.id, patch: { frame: p.frame } };
            });
            dispatchGesture(groupOps, 'user', 'Move objects');
            stAnnounce(TT('studio.a11y_group_moved', 'Selected objects moved'));
          } else if (ev.shiftKey) dispatch({ type: 'object.resize', target: o.id, w: f.w + d[0], h: f.h + d[1] }, 'user');
          else dispatch({ type: 'object.move', target: o.id, x: f.x + d[0], y: f.y + d[1] }, 'user');
        } else if (ev.key === 'Delete' || ev.key === 'Backspace') {
          ev.preventDefault(); ev.stopPropagation();
          var removeIds = selectionIds.length > 1 && selectionIds.indexOf(o.id) >= 0 ? selectionIds : [o.id];
          dispatchGesture(removeIds.map(function (id) { return { type: 'object.remove', target: id }; }), 'user', 'Remove objects');
          clearSelection();
          stAnnounce(TT('studio.a11y_removed', 'Object removed'));
        } else if (ev.key === 'Escape') {
          ev.stopPropagation(); // handled here — don't let the shell close the modal
          clearSelection();
        }
      };
    };

    // ── inline text editing ──
    var _editingText = React.useState(null); var editingText = _editingText[0], setEditingText = _editingText[1];
    var commitTextEdit = function (o, value) {
      setEditingText(null);
      if (value === ((o.runs && o.runs[0] && o.runs[0].text) || '')) return;
      var runs = stClone(o.runs || [{ text: '', style: {} }]);
      runs[0].text = value;
      dispatch({ type: 'object.update', target: o.id, patch: { runs: runs } }, 'user');
    };

    // ── exports ──
    var alignSelected = function (mode) {
      if (!selected) return;
      dispatch({ type: 'object.update', target: selected.id, patch: { frame: stAlignFrame(selected.frame, doc.canvas, mode) } }, 'user');
    };
    var duplicateSelected = function () {
      if (!selected) return;
      var copy = stClone(selected);
      delete copy.id;
      copy.frame = stClampFrame(Object.assign({}, copy.frame, { x: copy.frame.x + 24, y: copy.frame.y + 24 }), doc.canvas);
      copy.z = stFiniteNumber(copy.z, 1) + 1;
      var op = dispatch({ type: 'object.add', object: copy }, 'user');
      if (op && op.object && op.object.id) selectOnly(op.object.id);
    };
    var removeSelectedObjects = function () {
      var ids = selectionIds.length ? selectionIds.slice() : (selectedId ? [selectedId] : []);
      if (!ids.length) return;
      dispatchGesture(ids.map(function (id) { return { type: 'object.remove', target: id }; }), 'user', 'Remove objects');
      clearSelection();
      stAnnounce(TT('studio.a11y_removed', 'Object removed'));
    };
    var alignSelectedGroup = function (mode) {
      if (selectedGroup.length < 2) return;
      var ops = stAlignFramesAsGroup(doc.objects, selectionIds, mode).map(function (p) {
        return { type: 'object.update', target: p.id, patch: { frame: stClampFrame(p.frame, doc.canvas) } };
      });
      dispatchGesture(ops, 'user', 'Align objects');
      stAnnounce(TT('studio.a11y_group_aligned', 'Selected objects aligned'));
    };
    var distributeSelectedGroup = function (axis) {
      if (selectedGroup.length < 3) return;
      var ops = stDistributeFramesAsGroup(doc.objects, selectionIds, axis).map(function (p) {
        return { type: 'object.update', target: p.id, patch: { frame: stClampFrame(p.frame, doc.canvas) } };
      });
      dispatchGesture(ops, 'user', 'Distribute objects');
      stAnnounce(TT('studio.a11y_group_distributed', 'Selected objects distributed'));
    };
    var duplicateSelectedGroup = function () {
      if (selectedGroup.length < 2) return;
      var bodies = selectedGroup.map(function (o, idx) {
        var copy = stClone(o);
        delete copy.id;
        copy.frame = stClampFrame(Object.assign({}, copy.frame, { x: copy.frame.x + 24, y: copy.frame.y + 24 }), doc.canvas);
        copy.z = stFiniteNumber(copy.z, 1) + 1 + idx;
        return { type: 'object.add', object: copy };
      });
      var applied = dispatchGesture(bodies, 'user', 'Duplicate objects');
      var newIds = applied.map(function (op) { return op && op.object && op.object.id; }).filter(Boolean);
      if (newIds.length) { setSelectedIds(newIds); setSelectedId(newIds[newIds.length - 1]); }
    };
    var altFailures = doc ? stAltGate(doc.objects) : [];
    var download = function (blob, name) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a); a.click();
      setTimeout(function () { try { URL.revokeObjectURL(a.href); a.remove(); } catch (_) {} }, 1500);
    };
    var safeName = function () { return (doc.title || 'allostudio').replace(/[^\w\u00C0-\uFFFF -]+/g, '').trim().replace(/ +/g, '_') || 'allostudio'; };
    var gateOr = function (fn) {
      return function () {
        if (altFailures.length) {
          addToast(TT('studio.alt_gate_toast', '♿ Export blocked: every image needs alt text or an explicit "decorative" mark. The offenders are listed in the export panel.'), 'error');
          setExportOpen(true);
          setPreflightIssueFilter('fix');
          setPreflightGuideIndex(0);
          setPreflightOpen(true);
          selectOnly(altFailures[0].id);
          focusAltTextFor(altFailures[0].id);
          stAnnounce(TT('studio.export_show_fixes', 'Showing required accessibility fixes'));
          return;
        }
        fn();
      };
    };
    var exportHtml = gateOr(function () {
      download(new Blob([stExportHtml(doc, { lang: 'en' })], { type: 'text/html' }), safeName() + '.html');
      addToast(TT('studio.exported_html', '📄 Accessible HTML downloaded — reading order and alt text ride along.'), 'success');
    });
    var exportPng = gateOr(function () {
      stRenderPng(doc, 1.5).then(function (blob) {
        download(blob, safeName() + '.png');
        addToast(TT('studio.exported_png', '🖼️ PNG downloaded. Note: PNG is pixels-only — share the HTML or tagged PDF when accessibility matters.'), 'info');
      }).catch(function () { addToast(TT('studio.export_png_failed', 'PNG export failed.'), 'error'); });
    });
    var exportTagged = gateOr(function () {
      if (typeof props.onExportTaggedPdf !== 'function') { addToast(TT('studio.tagged_unavailable', 'Tagged PDF export needs the document pipeline — open AlloStudio from the main app.'), 'error'); return; }
      addToast(TT('studio.tagged_building', '📄 Building the tagged PDF from your reading order…'), 'info');
      Promise.resolve(props.onExportTaggedPdf(stExportHtml(doc, { lang: 'en' }), doc.title || 'AlloStudio document'))
        .then(function (ok) { if (ok !== false) addToast(TT('studio.tagged_done', '✅ Tagged PDF downloaded — structure comes from your reading-order panel.'), 'success'); })
        .catch(function (err) { addToast(TT('studio.tagged_failed', 'Tagged PDF failed: ') + (err && err.message || 'unknown'), 'error'); });
    });
    // Visual print/PDF: the positioned page, pixel-faithful, via a hidden
    // iframe (window.open is unreliable inside the Canvas iframe sandbox).
    // The TAGGED PDF remains the accessible artifact — the toast says so.
    var exportPrint = gateOr(function () {
      var html = stExportHtml(doc, { lang: 'en' }).replace('</head>', '<style>' + stPrintCss(doc.canvas) + '</style>\n</head>');
      var frame = document.createElement('iframe');
      frame.setAttribute('data-allo-studio-print', '1');
      frame.setAttribute('aria-hidden', 'true');
      frame.tabIndex = -1;
      frame.style.position = 'fixed'; frame.style.right = '-9999px'; frame.style.bottom = '0'; frame.style.width = '1px'; frame.style.height = '1px'; frame.style.border = '0';
      frame.onload = function () {
        try { frame.contentWindow.focus(); frame.contentWindow.print(); }
        catch (_) { addToast(TT('studio.print_failed', 'Print was blocked in this environment — download the PNG or HTML instead.'), 'error'); }
        setTimeout(function () { try { frame.remove(); } catch (_) {} }, 60000);
      };
      document.body.appendChild(frame);
      frame.srcdoc = html;
      addToast(TT('studio.print_opening', '🖨️ Opening the print dialog — choose "Save as PDF" for a pixel-faithful copy. For accessibility, share the Tagged PDF.'), 'info');
    });
    var exportWorksheet = function () {
      download(new Blob([JSON.stringify(stExportWorksheetData(doc), null, 2)], { type: 'application/json' }), safeName() + '.worksheet.json');
      addToast(TT('studio.exported_worksheet', 'Worksheet data downloaded.'), 'success');
    };
    var exportWorksheetHtml = function () {
      download(new Blob([stExportWorksheetHtml(doc, { lang: 'en' })], { type: 'text/html' }), safeName() + '.worksheet.html');
      addToast(TT('studio.exported_worksheet_html', '📝 Structured worksheet HTML downloaded — real questions and answer spaces.'), 'success');
    };
    var exportWorksheetPdf = function () {
      if (typeof props.onExportTaggedPdf !== 'function') { addToast(TT('studio.tagged_unavailable', 'Tagged PDF export needs the document pipeline — open AlloStudio from the main app.'), 'error'); return; }
      addToast(TT('studio.ws_building', '📝 Building a structured, tagged worksheet…'), 'info');
      Promise.resolve(props.onExportTaggedPdf(stExportWorksheetHtml(doc, { lang: 'en' }), (doc.title || 'Worksheet') + ' (worksheet)'))
        .then(function (ok) { if (ok !== false) addToast(TT('studio.ws_done', '✅ Structured worksheet PDF downloaded (real questions + answer spaces).'), 'success'); })
        .catch(function (err) { addToast(TT('studio.tagged_failed', 'Tagged PDF failed: ') + (err && err.message || 'unknown'), 'error'); });
    };
    var exportProcess = function () {
      download(new Blob([stExportProcessMarkdown(doc, role)], { type: 'text/markdown' }), safeName() + '.process.md');
      addToast(TT('studio.exported_process', 'Process reflection downloaded.'), 'success');
    };
    var saveDoc = function () {
      download(new Blob([JSON.stringify(stDurableDoc(doc), null, 1)], { type: 'application/json' }), safeName() + '.allostudio.json');
      var recent = stSaveRecentProject(doc);
      setRecentTick(function (n) { return n + 1; });
      stClearAutosave(); // the work is saved — don't offer a stale "unsaved work" restore
      addToast(TT('studio.saved', '💾 Saved. The file includes your full process history — it stays on this device.'), 'success');
      if (!recent.ok) addToast(TT('studio.recent_save_failed', 'Recent-project shelf could not update, but your file downloaded.'), 'info');
    };
    var saveToPortfolio = function () {
      var result = stSavePortfolioArtifact(doc, { now: new Date().toISOString() });
      if (result.ok) {
        stAnnounce(TT('studio.portfolio_saved_a11y', 'AlloStudio product saved to portfolio'));
        addToast(TT('studio.portfolio_saved', 'Saved a read-only product card to AlloHaven Portfolio.'), 'success');
      } else {
        addToast(TT('studio.portfolio_unavailable', 'Portfolio save was not available in this browser.'), 'error');
      }
    };
    var applyStyleKit = function (key) {
      var plan = stStyleKitPatch(doc, key, brandProfile);
      var ops = [{ type: 'canvas.background', fill: plan.canvasFill }].concat(plan.patches.map(function (p) {
        return { type: 'object.update', target: p.id, patch: p.patch };
      }));
      dispatchGesture(ops, 'user', 'Apply style kit');
      addToast(TT('studio.style_applied', 'Style kit applied') + ': ' + plan.name, 'success');
    };
    var onLoadFile = function (ev) {
      var f = ev.target.files && ev.target.files[0];
      ev.target.value = '';
      if (!f) return;
      var r = new FileReader();
      r.onload = function (e) {
        try {
          var parsed = JSON.parse(e.target.result);
          var errs = stValidateDoc(parsed);
          if (errs.length) { addToast(TT('studio.load_failed', 'Could not open: ') + errs[0], 'error'); return; }
          _docRef.current = stCanonicalizeDoc(parsed);
          setView('edit'); clearSelection(); bump();
          addToast(TT('studio.loaded', '📂 Opened — process history intact.'), 'success');
        } catch (_) { addToast(TT('studio.load_failed', 'Could not open: ') + 'not valid JSON', 'error'); }
      };
      r.readAsText(f);
    };

    // ── styles ──
    var S = {
      overlay: { position: 'fixed', inset: 0, zIndex: 9000, background: C.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: layout.overlayPadding },
      shell: { background: C.shell, color: C.text, border: '1px solid ' + C.border, borderRadius: layout.shellRadius + 'px', width: layout.shellWidth, height: layout.shellHeight, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: themeName === 'contrast' ? '0 0 0 3px #ffff00' : '0 8px 40px rgba(15,23,42,0.4)', fontFamily: 'system-ui, sans-serif' },
      header: { display: 'flex', alignItems: 'center', alignContent: 'flex-start', gap: layout.compact ? '6px' : '10px', padding: layout.compact ? '8px 10px' : '10px 14px', background: C.headerBg, color: C.headerText, borderBottom: '1px solid ' + C.hBtnBorder, flexWrap: layout.headerWrap },
      headerSpacer: { marginLeft: layout.compact ? 0 : 'auto', flex: layout.compact ? '1 0 10px' : '0 0 auto' },
      titleInput: { background: C.hBtnBg, color: C.hBtnText, border: '1px solid ' + C.hBtnBorder, borderRadius: '8px', padding: '5px 10px', fontSize: '13px', fontWeight: 700, width: layout.titleWidth, maxWidth: '100%' },
      hBtn: { padding: layout.buttonPadding, minHeight: '32px', borderRadius: '8px', border: '1px solid ' + C.hBtnBorder, background: C.hBtnBg, color: C.hBtnText, fontSize: '12px', fontWeight: 700, cursor: 'pointer' },
      body: { flex: 1, display: 'flex', flexDirection: layout.stacked ? 'column' : 'row', minHeight: 0, overflow: layout.stacked ? 'auto' : 'hidden' },
      panel: Object.assign({ width: layout.panelWidth, padding: '10px', overflowY: 'auto', background: C.panel, color: C.text, display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }, layout.stacked ? { maxHeight: layout.panelMaxHeight, borderRight: 'none', borderBottom: '1px solid ' + C.border } : { borderRight: '1px solid ' + C.border }),
      rpanel: Object.assign({ width: layout.inspectorWidth, padding: '10px', overflowY: 'auto', background: C.panel, color: C.text, display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }, layout.stacked ? { maxHeight: layout.inspectorMaxHeight, borderLeft: 'none', borderTop: '1px solid ' + C.border } : { borderLeft: '1px solid ' + C.border }),
      canvasWrap: { flex: 1, minHeight: layout.stacked ? '260px' : 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start', gap: '8px', padding: layout.canvasPadding + 'px' },
      canvasToolbar: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flexWrap: 'wrap', flexShrink: 0 },
      canvasViewport: { flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' },
      canvasPage: { position: 'relative', background: (doc && doc.canvas && doc.canvas.background && doc.canvas.background.fill) || '#fff', boxShadow: '0 2px 14px rgba(15,23,42,0.25)', flexShrink: 0, overflow: 'hidden' },
      readingList: { display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: layout.readingListMaxHeight, overflowY: 'auto' },
      tool: { padding: layout.compact ? '7px 9px' : '8px 10px', minHeight: '32px', borderRadius: '8px', border: '1px solid ' + C.border, background: C.panelAlt, fontSize: '12px', fontWeight: 700, color: C.text, cursor: 'pointer', textAlign: 'left' },
      label: { fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: C.muted, marginTop: '4px' },
      input: { width: '100%', boxSizing: 'border-box', padding: '5px 7px', border: '1px solid ' + C.border, borderRadius: '6px', fontSize: '12px', background: C.inputBg, color: C.inputText },
    };
    // Fullscreen: edge-to-edge shell (no overlay padding, no rounded corners). The
    // template-picker card keeps its own compact size unless we're fullscreen.
    if (fullscreen) {
      S.overlay = Object.assign({}, S.overlay, { padding: 0 });
      S.shell = Object.assign({}, S.shell, { width: '100vw', height: '100dvh', maxWidth: '100vw', maxHeight: '100dvh', borderRadius: 0 });
    }

    var templateCategoryFor = function (tpl) {
      if (!tpl) return 'all';
      if (tpl.key === 'flyer' || tpl.key === 'poster' || tpl.key === 'vocabPoster' || tpl.key === 'labSafety' || tpl.key === 'newsletter' || tpl.key === 'bookReport' || tpl.key === 'anchorChart' || tpl.key === 'onePageExplainer') return 'poster';
      if (tpl.key === 'worksheet' || tpl.key === 'exitTicket' || tpl.key === 'checklist' || tpl.key === 'rubric' || tpl.key === 'labSheet' || tpl.key === 'reflectionPage') return 'worksheet';
      if (tpl.key === 'cerOrganizer' || tpl.key === 'compareContrast' || tpl.key === 'visualSchedule' || tpl.key === 'socialStory' || tpl.key === 'choiceBoard' || tpl.key === 'vocabMat') return 'organizer';
      if (tpl.key === 'blank') return 'blank';
      return 'poster';
    };
    var templateFilters = [
      ['all', TT('studio.templates_all', 'All')],
      ['poster', TT('studio.templates_posters', 'Flyers & posters')],
      ['worksheet', TT('studio.templates_worksheets', 'Worksheets')],
      ['organizer', TT('studio.templates_organizers', 'Organizers')],
      ['blank', TT('studio.templates_blank', 'Blank')]
    ];
    var renderTemplatePreview = function (tpl, preset) {
      var previewDoc = null;
      try { previewDoc = tpl.make(0, preset || 'letter-portrait'); } catch (_) { previewDoc = null; }
      if (!previewDoc || !previewDoc.canvas) return h('div', { 'aria-hidden': true, style: { height: '88px', borderRadius: '8px', border: '1px dashed ' + C.border, background: C.panelAlt } });
      var scale = Math.min(124 / previewDoc.canvas.w, 92 / previewDoc.canvas.h);
      return h('div', { 'aria-hidden': true, style: { height: '96px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.panelAlt, border: '1px solid ' + C.border, borderRadius: '8px', overflow: 'hidden' } },
        h('div', { style: { position: 'relative', width: previewDoc.canvas.w * scale + 'px', height: previewDoc.canvas.h * scale + 'px', background: (previewDoc.canvas.background && previewDoc.canvas.background.fill) || '#fff', boxShadow: '0 1px 6px rgba(15,23,42,0.22)', overflow: 'hidden' } },
          stOrderedObjects(previewDoc.objects).slice(0, 18).map(function (o) {
            var f = stClampFrame(o.frame, previewDoc.canvas);
            var base = { position: 'absolute', left: f.x * scale + 'px', top: f.y * scale + 'px', width: f.w * scale + 'px', height: f.h * scale + 'px', zIndex: o.z || 1, boxSizing: 'border-box' };
            if (o.type === 'shape') return h('div', { key: o.id, style: Object.assign({}, base, { background: o.fill || '#e2e8f0', borderRadius: o.shape === 'ellipse' ? '50%' : '2px' }) });
            if (o.type === 'image') return h('div', { key: o.id, style: Object.assign({}, base, { border: '1px dashed #94a3b8', background: '#f8fafc' }) });
            var run = (o.runs && o.runs[0]) || { text: '', style: {} };
            return h('div', { key: o.id, style: Object.assign({}, base, { color: (run.style && run.style.color) || '#111827', fontWeight: run.style && run.style.bold ? 800 : 500, fontSize: Math.max(2, ((run.style && run.style.size) || 16) * scale) + 'px', lineHeight: 1.1, overflow: 'hidden', textAlign: (run.style && run.style.align) || 'left' }) }, run.text);
          })));
    };
    var openRecentProject = function (entry) {
      if (!entry || !entry.doc) return;
      var errs = stValidateDoc(entry.doc);
      if (errs.length) { addToast(TT('studio.recent_invalid', 'That recent project could not be reopened.'), 'error'); return; }
      _docRef.current = stCanonicalizeDoc(entry.doc);
      setView('edit'); clearSelection(); bump();
      addToast(TT('studio.recent_opened', 'Recent project opened.'), 'success');
    };

    if (!doc || view === 'templates') {
      // ── template picker ──
      var recentProjects = recentTick >= 0 ? stReadRecentProjects() : [];
      var allTemplates = stTemplates();
      var shownTemplates = templateFilter === 'all' ? allTemplates : allTemplates.filter(function (tpl) { return templateCategoryFor(tpl) === templateFilter; });
      return h('div', { className: 'st-root theme-' + themeName, style: S.overlay, role: 'dialog', 'aria-modal': true, 'aria-label': TT('studio.title', 'AlloStudio'),
        onKeyDown: function (ev) { trapTab(ev); if (ev.key === 'Escape') { ev.preventDefault(); if (typeof props.onClose === 'function') props.onClose(); } } },
        h('div', { ref: _shellRef, style: fullscreen ? S.shell : Object.assign({}, S.shell, { width: layout.stacked ? layout.shellWidth : 'min(860px, 96vw)', height: 'auto', maxHeight: layout.stacked ? layout.shellHeight : '92vh' }) },
          h('div', { style: S.header },
            h('span', { style: { fontSize: '18px' }, 'aria-hidden': true }, '🎨'),
            h('strong', { style: { fontSize: '15px' } }, TT('studio.title', 'AlloStudio')),
            h('span', { style: { fontSize: '11px', color: C.soft } }, TT('studio.tagline', 'Flyers, worksheets & posters — accessible by construction')),
            h('button', { style: Object.assign({}, S.hBtn, { marginLeft: 'auto' }), onClick: function () { if (loadRef.current) loadRef.current.click(); } }, '📂 ' + TT('studio.open_file', 'Open .allostudio.json')),
            h('button', { style: S.hBtn, 'aria-label': TT('studio.close', 'Close AlloStudio'), onClick: props.onClose }, '✕')),
          (function () {
            var saved = stReadAutosave();
            if (!saved) return null;
            return h('div', { style: { margin: '12px 18px 0', padding: '10px 12px', borderRadius: '10px', border: '1px solid ' + C.exportBorder, background: C.exportBg, color: C.text, display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' } },
              h('span', { 'aria-hidden': true }, '💾'),
              h('span', { style: { flex: 1, minWidth: '160px' } },
                h('strong', { style: { display: 'block', fontSize: '12px' } }, TT('studio.autosave_found', 'Unsaved work found') + ': ' + (saved.title || 'Untitled')),
                h('span', { style: { fontSize: '10px', color: C.muted } }, TT('studio.autosave_hint', 'Autosaved on this device. Restore it or discard it.'))),
              h('button', { style: S.tool, onClick: restoreAutosave }, TT('studio.autosave_restore', 'Restore')),
              h('button', { style: S.tool, onClick: function () { stClearAutosave(); bump(); } }, TT('studio.autosave_discard', 'Discard')));
          })(),
          (function () {
            var seen = false;
            try { seen = localStorage.getItem('alloStudioWelcome_v1') === '1'; } catch (_) {}
            if (seen) return null;
            return h('div', { style: { margin: '12px 18px 0', padding: '10px 12px', borderRadius: '10px', border: '1px solid ' + C.border, background: C.panelAlt, fontSize: '11px', color: C.text } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'baseline' } },
                h('strong', null, '👋 ' + TT('studio.welcome_title', 'Welcome to AlloStudio')),
                h('button', { style: Object.assign({}, S.tool, { padding: '2px 8px', minHeight: '22px', fontSize: '10px' }), onClick: function () { try { localStorage.setItem('alloStudioWelcome_v1', '1'); } catch (_) {} bump(); } }, TT('studio.welcome_got_it', 'Got it'))),
              h('ul', { style: { margin: '6px 0 0 16px', padding: 0, lineHeight: 1.5 } },
                h('li', null, TT('studio.welcome_order', 'The reading-order list (right panel in the editor) is what screen readers and the tagged PDF follow — arrange it like you would read aloud.')),
                h('li', null, TT('studio.welcome_alt', 'Every image needs alt text or a decorative mark before export — the A11y button shows what is left.')),
                h('li', null, TT('studio.welcome_process', 'The Process tab shows the document history, with AI steps labeled honestly.'))));
          })(),
          recentProjects.length ? h('div', { style: { padding: '12px 18px 0', borderBottom: '1px solid ' + C.border } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', marginBottom: '8px' } },
              h('strong', { style: { fontSize: '12px', color: C.text } }, TT('studio.recent_projects', 'Recent projects')),
              h('span', { style: { fontSize: '10px', color: C.muted } }, TT('studio.recent_local', 'Stored on this device'))),
            h('div', { style: { display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px' } },
              recentProjects.slice(0, 6).map(function (entry) {
                return h('button', { key: entry.id, onClick: function () { openRecentProject(entry); }, style: { minWidth: '160px', textAlign: 'left', padding: '9px 10px', borderRadius: '8px', border: '1px solid ' + C.border, background: C.panelAlt, color: C.text, cursor: 'pointer' }, title: entry.title },
                  h('strong', { style: { display: 'block', fontSize: '12px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' } }, entry.title || 'AlloStudio document'),
                  h('span', { style: { display: 'block', fontSize: '10px', color: C.muted, marginTop: '3px' } }, (entry.objectCount || 0) + ' objects - ' + (entry.blocked ? 'needs fixes' : 'ready/review')));
              }))) : null,
          h('div', { style: { padding: '12px 18px 0', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }, role: 'group', 'aria-label': TT('studio.template_filters', 'Template filters') },
            templateFilters.map(function (opt) {
              var active = templateFilter === opt[0];
              return h('button', { key: opt[0], onClick: function () { setTemplateFilter(opt[0]); }, 'aria-pressed': active, style: Object.assign({}, S.tool, { padding: '6px 10px', textAlign: 'center' }, active ? { borderColor: C.accent, background: C.selectedBg } : null) }, opt[1]);
            })),
          canAgentEdit ? h('div', { style: { margin: '12px 18px 0', padding: '12px', borderRadius: '12px', border: '1px solid ' + C.accent, background: C.panelAlt, display: 'flex', flexDirection: 'column', gap: '6px' } },
            h('strong', { style: { fontSize: '13px', color: C.text } }, '✨ ' + TT('studio.compose_title', 'Start with AI')),
            h('span', { style: { fontSize: '11px', color: C.muted } }, TT('studio.compose_hint', 'Describe the page; the AI drafts it on a blank canvas as reviewable changes. Nothing applies until you approve each one.')),
            h('textarea', { value: composePrompt, rows: 2, placeholder: TT('studio.compose_placeholder', 'e.g. a lab safety poster for 7th grade with four short rules'), 'aria-label': TT('studio.compose_label', 'Describe the page to draft'), style: Object.assign({}, S.input, { resize: 'vertical' }), disabled: aiBusy === 'agent',
              onKeyDown: function (e) { e.stopPropagation(); }, onChange: function (e) { setComposePrompt(e.target.value); } }),
            h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' } },
              h('select', { value: composePreset, style: Object.assign({}, S.input, { width: 'auto', flex: '0 0 auto' }), 'aria-label': TT('studio.compose_size', 'Page size'),
                onChange: function (e) { setComposePreset(e.target.value); } },
                h('option', { value: 'letter-portrait' }, TT('studio.orient_portrait', 'Portrait')),
                h('option', { value: 'letter-landscape' }, TT('studio.orient_landscape', 'Landscape')),
                h('option', { value: 'square' }, TT('studio.orient_square', 'Square'))),
              h('button', { style: Object.assign({}, S.tool, { background: '#2563eb', color: '#fff', borderColor: '#1e3a8a', flex: 1, textAlign: 'center', opacity: (aiBusy === 'agent' || !String(composePrompt).trim()) ? 0.6 : 1 }), disabled: aiBusy === 'agent' || !String(composePrompt).trim(), onClick: startWithAi }, aiBusy === 'agent' ? TT('studio.agent_thinking', 'Preparing…') : '✨ ' + TT('studio.compose_go', 'Draft my page')))) : null,
          h('div', { style: { padding: '14px 18px 18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '12px', overflowY: 'auto' } },
            shownTemplates.map(function (tpl) {
              var category = templateFilters.filter(function (opt) { return opt[0] === templateCategoryFor(tpl); })[0];
              // Cards with an orientation choice render a fieldset of buttons
              // (a card can't be one <button> and also hold nested buttons).
              if (tpl.orientations) {
                return h('div', { key: tpl.key, style: { textAlign: 'left', padding: '16px', borderRadius: '12px', border: '1px solid ' + C.border, background: C.panel, color: C.text, display: 'flex', flexDirection: 'column', gap: '10px' } },
                  renderTemplatePreview(tpl, 'letter-portrait'),
                  h('div', { style: { display: 'flex', gap: '10px', alignItems: 'flex-start' } },
                    h('span', { style: { fontSize: '26px' }, 'aria-hidden': true }, tpl.emoji),
                    h('span', null,
                      h('strong', { style: { display: 'block', fontSize: '14px', color: C.text } }, tpl.name),
                      h('span', { style: { display: 'inline-block', margin: '4px 0', padding: '2px 7px', borderRadius: '999px', border: '1px solid ' + C.border, fontSize: '9px', color: C.muted, fontWeight: 800 } }, category ? category[1] : TT('studio.templates_blank', 'Blank')),
                      h('span', { style: { fontSize: '11px', color: C.muted } }, tpl.desc))),
                  h('div', { role: 'group', 'aria-label': tpl.name, style: { display: 'flex', gap: '6px' } },
                    [['letter-portrait', TT('studio.orient_portrait', 'Portrait')], ['letter-landscape', TT('studio.orient_landscape', 'Landscape')], ['square', TT('studio.orient_square', 'Square')]].map(function (opt) {
                      return h('button', { key: opt[0], onClick: function () { startFromTemplate(tpl, opt[0]); }, style: Object.assign({}, S.tool, { flex: 1, textAlign: 'center' }) }, opt[1]);
                    })));
              }
              return h('button', { key: tpl.key, onClick: function () { startFromTemplate(tpl); }, style: { textAlign: 'left', padding: '16px', borderRadius: '12px', border: '1px solid ' + C.border, background: C.panel, color: C.text, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '10px' } },
                renderTemplatePreview(tpl),
                h('span', { style: { display: 'flex', gap: '10px', alignItems: 'flex-start' } },
                  h('span', { style: { fontSize: '26px' }, 'aria-hidden': true }, tpl.emoji),
                  h('span', null,
                    h('strong', { style: { display: 'block', fontSize: '14px', color: C.text } }, tpl.name),
                    h('span', { style: { display: 'inline-block', margin: '4px 0', padding: '2px 7px', borderRadius: '999px', border: '1px solid ' + C.border, fontSize: '9px', color: C.muted, fontWeight: 800 } }, category ? category[1] : TT('studio.templates_posters', 'Flyers & posters')),
                    h('span', { style: { display: 'block', fontSize: '11px', color: C.muted, lineHeight: 1.35 } }, tpl.desc))));
            })),
          h('p', { style: { margin: '0 18px 14px', fontSize: '11px', color: C.muted } },
            TT('studio.privacy_note', 'Everything stays on this device. Your document — including its full process history — lives in a local save file.')),
          h('input', { ref: loadRef, type: 'file', accept: '.json,application/json', style: { display: 'none' }, onChange: onLoadFile })));
    }

    var ops = doc.ledger.ops;
    var maxSeq = ops.length ? ops[ops.length - 1].seq : 0;

    if (view === 'process') {
      // ── Process tab (student-visible per doc §11 — portfolio framing) ──
      var at = scrubSeq === null ? maxSeq : scrubSeq;
      var scene = stReplay(doc, at);
      var summary = stActorSummary(ops);
      var allProcessGroups = stProcessStepGroups(ops);
      var processGroups = stFilteredProcessStepGroups(ops, processActorFilter);
      var mins = Math.max(1, Math.round(summary.activeMs / 60000));
      var processScale = layout.stacked
        ? Math.max(0.34, Math.min(0.45, ((viewport.w || 920) - (layout.canvasPadding * 2) - 18) / Math.max(1, doc.canvas.w)))
        : 0.45;
      return h('div', { className: 'st-root theme-' + themeName, style: S.overlay, role: 'dialog', 'aria-modal': true, 'aria-label': TT('studio.process_title_teacher', 'Process timeline'),
        onKeyDown: function (ev) { trapTab(ev); if (ev.key === 'Escape') { ev.preventDefault(); setScrubSeq(null); setView('edit'); } } },
        h('div', { ref: _shellRef, style: S.shell },
          h('div', { style: S.header },
            h('span', { style: { fontSize: '18px' }, 'aria-hidden': true }, '🎞️'),
            h('strong', null, student ? TT('studio.process_title_student', 'My process') : TT('studio.process_title_teacher', 'Process timeline')),
            h('span', { style: S.headerSpacer }),
            h('button', { style: S.hBtn, onClick: exportProcess }, 'Process notes'),
            h('button', { style: S.hBtn, onClick: function () { setScrubSeq(null); setView('edit'); } }, '← ' + TT('studio.back_to_editing', 'Back to editing'))),
          h('div', { style: { display: 'flex', flexDirection: layout.stacked ? 'column' : 'row', flex: 1, minHeight: 0, overflow: layout.stacked ? 'auto' : 'hidden' } },
            h('div', { style: { flex: 1, minHeight: layout.stacked ? '260px' : 0, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: layout.canvasPadding + 'px', overflow: 'auto' } },
              h('div', { style: { position: 'relative', width: doc.canvas.w * processScale + 'px', height: doc.canvas.h * processScale + 'px', background: (scene.canvas.background && scene.canvas.background.fill) || '#fff', boxShadow: '0 2px 10px rgba(15,23,42,0.2)', overflow: 'hidden', flexShrink: 0 } },
                scene.objects.map(function (o) { return renderObject(o, processScale, null, {}, h); })),
              h('label', { style: { width: '90%', marginTop: '12px', fontSize: '12px', color: C.text, fontWeight: 700 } },
                TT('studio.scrub_label', 'Scrub the timeline') + ' — ' + at + ' / ' + maxSeq,
                h('input', { type: 'range', min: 0, max: maxSeq, value: at, style: { width: '100%' }, 'aria-valuetext': TT('studio.scrub_step', 'step') + ' ' + at + ' ' + TT('studio.of', 'of') + ' ' + maxSeq, onChange: function (e) { setScrubSeq(parseInt(e.target.value, 10)); } }))),
            h('div', { style: Object.assign({}, S.rpanel, { width: layout.stacked ? 'auto' : '300px' }) },
              h('div', { style: { padding: '10px', background: C.exportBg, border: '1px solid ' + C.exportBorder, borderRadius: '10px', fontSize: '12px', color: C.text, fontWeight: 700 } },
                summary.user + ' ' + TT('studio.ops_you', 'edits by ' + (student ? 'you' : 'the student')) + ' · ' + summary.ai + ' ' + TT('studio.ops_ai', 'AI actions') + ' · ' + summary.import + ' ' + TT('studio.ops_import', 'imported items'),
                h('div', { style: { fontWeight: 400, marginTop: '4px', color: C.muted } }, '≈' + mins + ' ' + TT('studio.active_minutes', 'active minutes in the editor'))),
              h('p', { style: { fontSize: '11px', color: C.muted, margin: '2px 0 6px' } }, TT('studio.honesty_line', ST_HONESTY_LINE)),
              h('div', { role: 'group', 'aria-label': TT('studio.process_filter', 'Process filter'), style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' } },
                [
                  ['all', TT('studio.process_all', 'All'), allProcessGroups.length],
                  ['user', TT('studio.actor_user', 'you'), allProcessGroups.filter(function (g) { return g.actor === 'user'; }).length],
                  ['ai', 'AI', allProcessGroups.filter(function (g) { return g.actor === 'ai'; }).length],
                  ['import', TT('studio.actor_import', 'import'), allProcessGroups.filter(function (g) { return g.actor === 'import'; }).length]
                ].map(function (item) {
                  var active = processActorFilter === item[0];
                  return h('button', { key: item[0], type: 'button', 'aria-pressed': active, style: Object.assign({}, S.tool, { textAlign: 'center', padding: '5px 4px', minHeight: '26px', fontSize: '10px' }, active ? { borderColor: C.accent, background: C.selectedBg } : null), onClick: function () { setProcessActorFilter(item[0]); } }, item[1] + ' ' + item[2]);
                })),
              h('div', { style: S.label }, TT('studio.recent_steps', 'Steps (latest first)')),
              h('div', { style: { overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' } },
                processGroups.length ? processGroups.slice(-80).reverse().map(function (group) {
                  var chip = group.actor === 'ai' ? { bg: '#f3e8ff', fg: '#7c2d12', label: 'AI' } : group.actor === 'import' ? { bg: '#fef3c7', fg: '#92400e', label: TT('studio.actor_import', 'import') } : { bg: '#dcfce7', fg: '#166534', label: TT('studio.actor_user', 'you') };
                  var active = at >= group.startSeq && at <= group.endSeq;
                  var seqLabel = group.count > 1 ? ('#' + group.startSeq + '-' + group.endSeq) : ('#' + group.endSeq);
                  return h('div', { key: group.startSeq + '-' + group.endSeq, style: { display: 'flex', gap: '6px', alignItems: 'center', fontSize: '11px', color: C.text, padding: '3px 4px', background: active ? C.selectedBg : 'transparent', borderRadius: '4px' } },
                    h('button', { onClick: function () { setScrubSeq(group.endSeq); }, style: { border: 'none', background: 'none', cursor: 'pointer', color: C.accent, fontWeight: 700, fontSize: '11px', padding: 0 }, 'aria-label': TT('studio.jump_to_step', 'Jump to step') + ' ' + group.endSeq }, seqLabel),
                    h('span', { style: { background: chip.bg, color: chip.fg, borderRadius: '999px', padding: '0 7px', fontWeight: 700, fontSize: '10px' } }, chip.label),
                    group.count > 1 ? h('span', { style: { border: '1px solid ' + C.border, borderRadius: '999px', padding: '0 6px', color: C.muted, fontSize: '9.5px', fontWeight: 800 } }, 'x' + group.count) : null,
                    h('span', { style: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' } }, group.text));
                }) : h('div', { style: { fontSize: '11px', color: C.muted, padding: '6px' } }, TT('studio.process_filter_empty', 'No steps in this filter.')))))));
    }

    // ── editor view ──
    var liveFrameFor = function (o) { return (dragLive && dragLive.id === o.id) ? dragLive.frame : o.frame; };
    var agentSelectedSet = {};
    (Array.isArray(agentSelectedOps) ? agentSelectedOps : []).forEach(function (idx) { agentSelectedSet[idx] = true; });
    var agentChangeItems = agentPlan && Array.isArray(agentPlan.ops)
      ? agentPlan.ops.map(function (op, idx) { return stDescribeAgentChange(op, doc, idx); })
      : [];
    var selectedAgentCount = agentPlan && Array.isArray(agentPlan.ops)
      ? agentPlan.ops.filter(function (_, idx) { return !!agentSelectedSet[idx]; }).length
      : 0;
    var agentPendingIds = [];
    if (agentPlan && Array.isArray(agentPlan.ops)) {
      agentPlan.ops.forEach(function (op, idx) {
        if (agentSelectedSet[idx] && op && op.target && agentPendingIds.indexOf(op.target) < 0) agentPendingIds.push(op.target);
      });
    }
    var agentPendingColor = themeName === 'contrast' ? C.accent : '#f59e0b';
    var snapGuideColor = themeName === 'contrast' ? '#ffff00' : '#f59e0b';
    // One-gesture rollback offer — only while the ledger tail IS an agent batch
    // (any manual op in between means the batch is no longer the tail).
    var lastAgentBatch = doc && canAgentEdit ? stLastAgentBatch(doc) : null;
    var issueByObject = stObjectIssueSummary(preflight);
    var issueToneFor = function (summary) {
      if (!summary) return null;
      return statusTone(summary.severity === 'error' ? 'error' : summary.severity === 'warning' ? 'warning' : 'review');
    };
    var openIssueForObject = function (id, title, severity) {
      var match = null;
      for (var oi = 0; oi < preflight.issues.length; oi++) {
        if (preflight.issues[oi] && preflight.issues[oi].id === id) { match = preflight.issues[oi]; break; }
      }
      var nextFilter = severity || (match && match.severity) || preflightIssueFilter;
      nextFilter = nextFilter === 'error' ? 'fix' : (nextFilter === 'warning' || nextFilter === 'review' ? nextFilter : 'all');
      var idx = stIssueIndexForObject(preflight, id, nextFilter);
      if (idx < 0) idx = stIssueIndexForObject(preflight, id);
      setPreflightIssueFilter(nextFilter);
      if (idx >= 0) setPreflightGuideIndex(idx);
      if (id) selectOnly(id);
      setPreflightOpen(true);
      stAnnounce(title || TT('studio.a11y_issue_selected', 'Accessibility issue selected'));
    };
    var resetPreflightIssueFilter = function () {
      setPreflightIssueFilter('all');
      setPreflightGuideIndex(0);
    };

    function renderObject(o, scale, interactivity, extra, hh) {
      var f = interactivity ? liveFrameFor(o) : o.frame;
      var isSel = interactivity && (selectedId === o.id || selectionIds.indexOf(o.id) >= 0);
      var isAgentPending = interactivity && agentPendingIds.indexOf(o.id) >= 0;
      var readingIndex = doc && Array.isArray(doc.objects) ? doc.objects.findIndex(function (item) { return item && item.id === o.id; }) + 1 : 0;
      var issueSummary = issueByObject && issueByObject[o.id];
      var issueTone = (typeof issueToneFor === 'function') ? issueToneFor(issueSummary) : null;
      var frameState = o.type === 'image' ? stImageFrameState(o) : null;
      var base = {
        position: 'absolute', left: f.x * scale + 'px', top: f.y * scale + 'px',
        width: f.w * scale + 'px', height: f.h * scale + 'px', zIndex: o.z || 1,
        boxSizing: 'border-box', cursor: interactivity ? 'move' : 'default',
        outline: isSel ? '2px solid ' + C.accent : (isAgentPending ? '2px solid ' + agentPendingColor : '1px dashed transparent'),
        boxShadow: isSel ? '0 0 0 4px rgba(99,102,241,0.18)' : (isAgentPending ? '0 0 0 4px rgba(245,158,11,0.22)' : undefined),
      };
      var inner = null;
      if (o.type === 'text') {
        var run = (o.runs && o.runs[0]) || { text: '', style: {} };
        var s = run.style || {};
        inner = hh('div', { style: { fontSize: (s.size || 16) * scale + 'px', color: s.color || '#111827', fontWeight: s.bold ? 700 : 400, textAlign: s.align || 'left', whiteSpace: 'pre-wrap', lineHeight: 1.25, overflow: 'hidden', width: '100%', height: '100%', overflowWrap: 'break-word', fontFamily: stSafeFontFamily(s.font) } }, run.text);
      } else if (o.type === 'image') {
        var safeRenderSrc = stSafeDataImage(o.src, ST_MAX_IMAGE_SRC_LENGTH);
        if (safeRenderSrc) {
          inner = hh('img', { src: safeRenderSrc, alt: '', draggable: false, style: { width: '100%', height: '100%', objectFit: o.fit === 'contain' ? 'contain' : 'cover', pointerEvents: 'none' } });
        } else {
          var placeholderTone = frameState && frameState.key === 'kept-placeholder' ? statusTone('success') : statusTone('review');
          inner = hh('div', { style: { width: '100%', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', textAlign: 'center', background: placeholderTone.bg, border: '2px dashed ' + placeholderTone.border, borderRadius: '8px', fontSize: Math.max(9, 12 * scale) + 'px', color: placeholderTone.fg, fontWeight: 800, pointerEvents: 'none', padding: '6px', overflow: 'hidden' } },
            hh('span', null, frameState.label),
            hh('span', { style: { fontSize: Math.max(8, 9 * scale) + 'px', fontWeight: 600, lineHeight: 1.2, opacity: 0.9 } }, frameState.message));
        }
      } else if (o.type === 'shape') {
        inner = hh('div', { style: { width: '100%', height: '100%', background: o.fill || '#e2e8f0', borderRadius: o.shape === 'ellipse' ? '50%' : '8px', pointerEvents: 'none' } });
      }
      if (!interactivity) return hh('div', { key: o.id, style: base, 'aria-hidden': true }, inner);
      var labelText = o.type === 'text' ? ((o.runs && o.runs[0] && o.runs[0].text) || 'text').slice(0, 40) : o.type === 'image' ? (frameState && !o.src ? frameState.label : (o.alt || TT('studio.image_no_alt', 'image without alt text'))) : (o.shape || 'shape');
      var objectA11yLabel = issueSummary ? ', ' + issueSummary.count + ' accessibility item' + (issueSummary.count === 1 ? '' : 's') : '';
      var handleBase = { position: 'absolute', width: '9px', height: '9px', background: C.panel, border: '2px solid ' + C.accent, borderRadius: '999px', pointerEvents: 'none', zIndex: 54 };
      return hh('div', Object.assign({
        key: o.id, tabIndex: 0, role: 'group',
        'aria-label': (isSel ? TT('studio.selected', 'Selected') + ' ' : '') + o.type + ': ' + labelText + (readingIndex ? ', reading order ' + readingIndex : '') + objectA11yLabel,
        style: base,
        onPointerDown: onObjectPointerDown(o, 'move'),
        onPointerMove: onCanvasPointerMove,
        onPointerUp: onCanvasPointerUp,
        onKeyDown: onObjectKeyDown(o),
        onDoubleClick: o.type === 'text' ? function () { setEditingText({ id: o.id, value: (o.runs && o.runs[0] && o.runs[0].text) || '' }); } : undefined,
        onFocus: function () {
          if (_skipFocusSelect.current) { _skipFocusSelect.current = false; return; }
          selectOnly(o.id);
        },
      }, extra),
        inner,
        readingIndex ? hh('span', { 'aria-hidden': true, style: { position: 'absolute', left: '4px', top: '4px', minWidth: '20px', height: '20px', borderRadius: '999px', background: C.headerBg, color: C.headerText, border: '1px solid ' + C.hBtnBorder, fontSize: '10px', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', boxShadow: '0 1px 4px rgba(15,23,42,0.25)', zIndex: 55 } }, readingIndex) : null,
        frameState && (frameState.key === 'kept-placeholder' || frameState.key === 'empty-placeholder') ? hh('span', { 'aria-hidden': true, style: { position: 'absolute', left: '4px', bottom: '4px', maxWidth: 'calc(100% - 8px)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', border: '1px solid ' + (frameState.key === 'kept-placeholder' ? statusTone('success').border : statusTone('review').border), background: frameState.key === 'kept-placeholder' ? statusTone('success').bg : statusTone('review').bg, color: frameState.key === 'kept-placeholder' ? statusTone('success').fg : statusTone('review').fg, borderRadius: '999px', fontSize: '9px', fontWeight: 900, padding: '2px 6px', pointerEvents: 'none', zIndex: 56 } }, frameState.label) : null,
        issueSummary ? hh('button', {
          type: 'button',
          title: issueSummary.title + (issueSummary.message ? ': ' + issueSummary.message : ''),
          'aria-label': issueSummary.label + ' accessibility item for ' + labelText,
          onPointerDown: function (e) { e.stopPropagation(); },
          onClick: function (e) { e.stopPropagation(); openIssueForObject(o.id, issueSummary.title, issueSummary.severity); },
          style: { position: 'absolute', right: '4px', top: '4px', border: '1px solid ' + issueTone.border, background: issueTone.bg, color: issueTone.fg, borderRadius: '999px', fontSize: '9px', fontWeight: 900, padding: '2px 6px', cursor: 'pointer', zIndex: 65, lineHeight: 1.3, boxShadow: '0 1px 4px rgba(15,23,42,0.22)' }
        }, issueSummary.label + (issueSummary.count > 1 ? ' ' + issueSummary.count : '')) : null,
        isSel ? [
          hh('span', { key: 'h-tl', style: Object.assign({}, handleBase, { left: '-6px', top: '-6px' }) }),
          hh('span', { key: 'h-tr', style: Object.assign({}, handleBase, { right: '-6px', top: '-6px' }) }),
          hh('span', { key: 'h-bl', style: Object.assign({}, handleBase, { left: '-6px', bottom: '-6px' }) }),
          hh('div', {
            key: 'resize',
            role: 'presentation',
            onPointerDown: onObjectPointerDown(o, 'resize'),
            onPointerMove: onCanvasPointerMove,
            onPointerUp: onCanvasPointerUp,
            style: { position: 'absolute', right: '-7px', bottom: '-7px', width: '14px', height: '14px', background: C.accent, border: '2px solid ' + C.panel, borderRadius: '4px', cursor: 'nwse-resize', zIndex: 55 },
          })
        ] : null,
        // Floating contextual quick-actions (Canva-style direct manipulation):
        // a small bar hovering over the selected object with Duplicate/Delete, so
        // the two most-common edits are one tap at the object instead of a trip to
        // the side panel. Single-selection only; hidden while editing text or
        // dragging; flips below the object when it hugs the top edge (the page
        // clips overflow). Not part of the drag surface (pointerdown stops here).
        (isSel && selectionIds.length <= 1 && !(editingText && editingText.id === o.id) && !(dragLive && dragLive.id === o.id)) ? hh('div', {
          role: 'toolbar', 'aria-label': TT('studio.quick_actions', 'Quick actions'),
          onPointerDown: function (e) { e.stopPropagation(); },
          style: Object.assign({ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '2px', padding: '3px', background: C.headerBg, border: '1px solid ' + C.hBtnBorder, borderRadius: '9px', boxShadow: '0 3px 12px rgba(15,23,42,0.4)', zIndex: 60, whiteSpace: 'nowrap' }, (f.y * scale > 42) ? { bottom: '100%', marginBottom: '6px' } : { top: '100%', marginTop: '6px' }) },
          hh('button', { type: 'button', title: TT('studio.duplicate', 'Duplicate'), 'aria-label': TT('studio.duplicate', 'Duplicate'),
            onPointerDown: function (e) { e.stopPropagation(); }, onClick: function (e) { e.stopPropagation(); duplicateSelected(); },
            style: { border: 'none', background: 'transparent', color: C.headerText, cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: '4px 7px', borderRadius: '6px' } }, '⧉'),
          hh('button', { type: 'button', title: TT('studio.delete', 'Delete'), 'aria-label': TT('studio.delete', 'Delete'),
            onPointerDown: function (e) { e.stopPropagation(); }, onClick: function (e) { e.stopPropagation(); removeSelectedObjects(); },
            style: { border: 'none', background: 'transparent', color: C.headerText, cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: '4px 7px', borderRadius: '6px' } }, '🗑')
        ) : null,
        (editingText && editingText.id === o.id) ? hh('textarea', {
          autoFocus: true,
          defaultValue: editingText.value,
          'aria-label': TT('studio.edit_text', 'Edit text'),
          style: { position: 'absolute', inset: 0, fontSize: (((o.runs && o.runs[0] && o.runs[0].style && o.runs[0].style.size) || 16) * scale) + 'px', border: '2px solid ' + C.accent, borderRadius: '4px', resize: 'none', padding: '2px', background: C.inputBg, color: C.inputText },
          onBlur: function (e) { commitTextEdit(o, e.target.value); },
          // Stop ALL keys from bubbling to the object's move/resize/delete
          // handler — typing an arrow key must edit the text, not move the box.
          onKeyDown: function (e) { e.stopPropagation(); if (e.key === 'Escape') { commitTextEdit(o, e.target.value); } },
          onPointerDown: function (e) { e.stopPropagation(); },
        }) : null);
    }

    var objectSummary = function (o, n) {
      var max = n || 34;
      if (!o) return TT('studio.object', 'Object');
      if (o.type === 'text') {
        var txt = stCleanText(o.runs && o.runs[0] && o.runs[0].text, max);
        return txt || TT('studio.text_block', 'Text block');
      }
      if (o.type === 'image') {
        if (!o.src) return stImageFrameState(o).label;
        if (o.decorative) return TT('studio.decorative_image', 'Decorative image');
        var alt = stCleanText(o.alt, max);
        return alt ? TT('studio.image', 'Image') + ': ' + alt : TT('studio.image_no_alt_short', 'Image without alt');
      }
      return o.shape === 'ellipse' ? TT('studio.ellipse', 'Ellipse') : TT('studio.rectangle', 'Rectangle');
    };
    var layoutButton = function (label, aria, fn, disabled) {
      return h('button', {
        style: Object.assign({}, S.tool, { textAlign: 'center', padding: '7px 4px', fontSize: '11px' }, disabled ? { opacity: 0.45, cursor: 'default' } : null),
        disabled: !!disabled,
        onClick: fn,
        title: aria,
        'aria-label': aria
      }, label);
    };
    var orderList = doc.objects.map(function (o, i) {
      var text = objectSummary(o, 28);
      var issueSummary = issueByObject[o.id];
      var issueTone = issueToneFor(issueSummary);
      var icon = o.type === 'text' ? (o.role === 'body' ? '¶' : 'H') : o.type === 'image' ? '🖼️' : '⬛';
      return h('div', { key: o.id, style: { display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 4px', borderRadius: '6px', background: selectionIds.indexOf(o.id) >= 0 ? C.selectedBg : C.panelAlt, border: '1px solid ' + (issueTone ? issueTone.border : C.border) } },
        h('button', { onClick: function () { selectOnly(o.id); }, style: { flex: 1, minWidth: 0, textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', fontSize: '11px', color: C.text, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }, 'aria-label': TT('studio.select_object', 'Select') + ' ' + o.type + ' ' + text },
          h('span', { 'aria-hidden': true }, icon + ' '), (i + 1) + '. ' + text),
        issueSummary ? h('button', { type: 'button', onClick: function () { openIssueForObject(o.id, issueSummary.title, issueSummary.severity); }, title: issueSummary.title + (issueSummary.message ? ': ' + issueSummary.message : ''), 'aria-label': issueSummary.label + ' accessibility item for ' + text, style: { border: '1px solid ' + issueTone.border, background: issueTone.bg, color: issueTone.fg, borderRadius: '999px', cursor: 'pointer', fontSize: '9px', fontWeight: 900, padding: '2px 5px', flex: '0 0 auto' } }, issueSummary.label + (issueSummary.count > 1 ? ' ' + issueSummary.count : '')) : null,
        h('button', { disabled: i === 0, onClick: function () { dispatch({ type: 'object.reorder', target: o.id, toIndex: i - 1 }, 'user'); stAnnounce(TT('studio.a11y_moved_earlier', 'Moved earlier in reading order')); }, title: TT('studio.reading_earlier', 'Read earlier'), 'aria-label': TT('studio.reading_earlier', 'Read earlier') + ' — ' + text, style: { border: '1px solid ' + C.border, background: C.inputBg, color: C.inputText, borderRadius: '4px', cursor: i === 0 ? 'default' : 'pointer', fontSize: '10px', opacity: i === 0 ? 0.4 : 1 } }, '↑'),
        h('button', { disabled: i === doc.objects.length - 1, onClick: function () { dispatch({ type: 'object.reorder', target: o.id, toIndex: i + 1 }, 'user'); stAnnounce(TT('studio.a11y_moved_later', 'Moved later in reading order')); }, title: TT('studio.reading_later', 'Read later'), 'aria-label': TT('studio.reading_later', 'Read later') + ' — ' + text, style: { border: '1px solid ' + C.border, background: C.inputBg, color: C.inputText, borderRadius: '4px', cursor: i === doc.objects.length - 1 ? 'default' : 'pointer', fontSize: '10px', opacity: i === doc.objects.length - 1 ? 0.4 : 1 } }, '↓'));
    });

    var layerList = stLayerItems(doc.objects).map(function (item) {
      var o = doc.objects.filter(function (obj) { return obj && obj.id === item.id; })[0];
      var text = objectSummary(o, 30);
      var selectedLayer = selectionIds.indexOf(item.id) >= 0;
      var typeLabel = o && o.type === 'text' ? (o.role === 'body' ? TT('studio.body_text', 'Body text') : o.role || 'text') : o && o.type === 'image' ? stImageFrameState(o).label : (o && o.type || 'object');
      var chipStyle = { display: 'inline-flex', alignItems: 'center', border: '1px solid ' + C.border, borderRadius: '999px', padding: '1px 5px', fontSize: '9px', color: C.muted, background: C.inputBg, whiteSpace: 'nowrap' };
      return h('div', { key: item.id, style: { display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px', padding: '5px', borderRadius: '8px', background: selectedLayer ? C.selectedBg : C.panelAlt, border: '1px solid ' + C.border } },
        h('button', { onClick: function () { selectOnly(item.id); }, style: { border: 'none', background: 'none', color: C.text, textAlign: 'left', cursor: 'pointer', minWidth: 0, padding: 0 }, 'aria-label': TT('studio.select_layer', 'Select layer') + ': ' + text },
          h('span', { style: { display: 'block', fontSize: '11px', fontWeight: 800, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' } }, text),
          h('span', { style: { display: 'flex', gap: '3px', flexWrap: 'wrap', marginTop: '3px' } },
            h('span', { style: chipStyle }, typeLabel),
            h('span', { style: chipStyle }, TT('studio.reading_position', 'Read') + ' ' + item.readingIndex),
            h('span', { style: chipStyle }, TT('studio.layer_z', 'Layer') + ' ' + item.z))),
        h('span', { style: { display: 'flex', gap: '3px', alignItems: 'center' } },
          h('button', { style: { border: '1px solid ' + C.border, background: C.inputBg, color: C.inputText, borderRadius: '4px', cursor: 'pointer', fontSize: '10px', padding: '2px 5px' }, onClick: function () { dispatch({ type: 'object.z', target: item.id, z: item.z + 1 }, 'user'); }, title: TT('studio.bring_forward', 'Bring forward (visual stacking only - reading order is the list)') }, '+z'),
          h('button', { style: { border: '1px solid ' + C.border, background: C.inputBg, color: C.inputText, borderRadius: '4px', cursor: 'pointer', fontSize: '10px', padding: '2px 5px' }, onClick: function () { dispatch({ type: 'object.z', target: item.id, z: Math.max(0, item.z - 1) }, 'user'); }, title: TT('studio.send_back', 'Send backward') }, '-z')));
    });
    var readingOrderTone = readingSuggestion.changed ? statusTone('review') : statusTone('success');
    var readingOrderAssistant = (navigatorMode === 'reading' && readingSuggestion.total > 1) ? h('div', { style: { border: '1px solid ' + readingOrderTone.border, background: readingOrderTone.bg, color: readingOrderTone.fg, borderRadius: '8px', padding: '7px', fontSize: '10.5px', lineHeight: 1.35 } },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: '6px', alignItems: 'baseline' } },
        h('strong', { style: { fontSize: '11px' } }, TT('studio.order_assist', 'Visual order')),
        h('span', { style: { fontSize: '9px', fontWeight: 900, textTransform: 'uppercase' } }, readingSuggestion.changed ? TT('studio.a11y_review', 'Review') : TT('studio.a11y_pass', 'Pass'))),
      h('div', { style: { marginTop: '4px' } }, readingSuggestion.changed ? TT('studio.order_assist_diff', 'Current reading order differs from the visual flow.') : TT('studio.order_assist_ok', 'Reading order matches the visual flow.')),
      readingSuggestion.changed ? h('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' } },
        h('button', { type: 'button', style: { border: '1px solid ' + readingOrderTone.border, background: C.panel, color: C.text, borderRadius: '6px', padding: '3px 7px', cursor: 'pointer', fontSize: '10px', fontWeight: 800 }, onClick: function () { setOrderAssistOpen(!orderAssistOpen); } }, orderAssistOpen ? TT('studio.hide_suggestion', 'Hide suggestion') : TT('studio.review_suggestion', 'Review suggestion')),
        h('button', { type: 'button', style: { border: '1px solid ' + readingOrderTone.border, background: readingOrderTone.bg, color: readingOrderTone.fg, borderRadius: '6px', padding: '3px 7px', cursor: 'pointer', fontSize: '10px', fontWeight: 900 }, onClick: applyReadingOrderSuggestion }, TT('studio.apply_order', 'Apply order'))) : null,
      (readingSuggestion.changed && orderAssistOpen) ? h('ol', { style: { margin: '6px 0 0 18px', padding: 0 } },
        readingSuggestion.suggested.slice(0, 8).map(function (item) {
          return h('li', { key: item.id, style: { marginBottom: '2px', color: readingOrderTone.fg } }, item.label);
        }),
        readingSuggestion.suggested.length > 8 ? h('li', { key: 'more', style: { color: readingOrderTone.fg } }, '+' + (readingSuggestion.suggested.length - 8) + ' more') : null) : null) : null;

    var propPanel = null;
    if (selectedGroup.length > 1) {
      propPanel = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
        h('div', { style: S.label }, TT('studio.group_selection', 'Selection') + ' - ' + selectedGroup.length + ' objects'),
        h('div', { style: { padding: '7px', border: '1px solid ' + C.border, borderRadius: '8px', background: C.panelAlt, color: C.muted, fontSize: '10.5px', lineHeight: 1.35 } },
          TT('studio.group_hint', 'Use Shift/Ctrl-click on the canvas to add or remove objects from this group.')),
        h('div', { style: S.label }, 'Align group'),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' } },
          layoutButton('Left', 'Align selected objects left', function () { alignSelectedGroup('left'); }),
          layoutButton('Center', 'Center selected objects horizontally', function () { alignSelectedGroup('hcenter'); }),
          layoutButton('Right', 'Align selected objects right', function () { alignSelectedGroup('right'); }),
          layoutButton('Top', 'Align selected objects top', function () { alignSelectedGroup('top'); }),
          layoutButton('Middle', 'Center selected objects vertically', function () { alignSelectedGroup('vcenter'); }),
          layoutButton('Bottom', 'Align selected objects bottom', function () { alignSelectedGroup('bottom'); })),
        h('div', { style: S.label }, 'Distribute'),
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' } },
          layoutButton('Horizontal', 'Distribute selected objects horizontally', function () { distributeSelectedGroup('x'); }, selectedGroup.length < 3),
          layoutButton('Vertical', 'Distribute selected objects vertically', function () { distributeSelectedGroup('y'); }, selectedGroup.length < 3)),
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' } },
          h('button', { style: S.tool, onClick: duplicateSelectedGroup }, 'Duplicate'),
          h('button', { style: S.tool, onClick: clearSelection }, 'Clear')),
        h('div', { style: S.label }, 'Objects'),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '110px', overflowY: 'auto' } },
          selectedGroup.map(function (o) {
            var label = objectSummary(o, 38);
            return h('button', { key: o.id, style: Object.assign({}, S.tool, { padding: '5px 7px', fontSize: '10.5px' }), onClick: function () { selectOnly(o.id); }, title: label, 'aria-label': TT('studio.edit_single_object', 'Edit single object') + ': ' + label },
              label);
          })));
    } else if (selected) {
      var frameInput = function (key, label) {
        return h('label', { style: { fontSize: '10px', color: C.muted, display: 'flex', flexDirection: 'column', gap: '2px' } }, label,
          h('input', { type: 'number', value: selected.frame[key], style: S.input, 'aria-label': label,
            onChange: function (e) {
              var v = parseInt(e.target.value, 10); if (isNaN(v)) return;
              if (key === 'x' || key === 'y') dispatch({ type: 'object.move', target: selected.id, x: key === 'x' ? v : selected.frame.x, y: key === 'y' ? v : selected.frame.y }, 'user');
              else dispatch({ type: 'object.resize', target: selected.id, w: key === 'w' ? v : selected.frame.w, h: key === 'h' ? v : selected.frame.h }, 'user');
            } }));
      };
      var textRunsFor = function (o) {
        var runs = stClone((o && o.runs) || [{ text: '', style: {} }]);
        if (!runs[0]) runs[0] = { text: '', style: {} };
        runs[0].style = Object.assign({}, runs[0].style);
        return runs;
      };
      var selectedTextStyle = (selected.runs && selected.runs[0] && selected.runs[0].style) || {};
      var selectedTextValue = (selected.runs && selected.runs[0] && selected.runs[0].text) || '';
      var selectedIssueSummary = issueByObject[selected.id];
      var selectedIssueTone = selectedIssueSummary ? issueToneFor(selectedIssueSummary) : statusTone('success');
      var selectedA11yActions = stObjectReadyActions(doc, selected.id);
      var selectedImageState = selected.type === 'image' ? stImageFrameState(selected) : null;
      propPanel = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
        h('div', { style: S.label }, TT('studio.selection', 'Selection') + ' — ' + selected.type),
        h('div', { style: { padding: '7px', border: '1px solid ' + selectedIssueTone.border, background: selectedIssueTone.bg, color: selectedIssueTone.fg, borderRadius: '8px', fontSize: '10.5px', lineHeight: 1.35 } },
          selectedIssueSummary ? [
            h('strong', { key: 'title', style: { display: 'block', fontSize: '11px' } }, selectedIssueSummary.label + ': ' + selectedIssueSummary.title),
            h('span', { key: 'message' }, selectedIssueSummary.message),
            selectedIssueSummary.count > 1 ? h('div', { key: 'count', style: { marginTop: '4px', fontWeight: 800 } }, selectedIssueSummary.count + ' items on this object') : null,
            selectedA11yActions.length ? h('div', { key: 'actions', style: { display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' } },
              selectedA11yActions.slice(0, 3).map(function (action, idx) {
                return h('button', { key: idx, type: 'button', onClick: function () { applyReadyAction(action); }, title: action.message, style: { border: '1px solid ' + selectedIssueTone.border, background: C.panel, color: C.text, borderRadius: '6px', cursor: 'pointer', fontSize: '10px', fontWeight: 800, padding: '3px 6px', lineHeight: 1.2 } }, readyActionLabel(action));
              })) : null
          ] : h('strong', { style: { display: 'block', fontSize: '11px' } }, TT('studio.object_a11y_ok', 'No object-level accessibility items.'))),
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' } }, frameInput('x', 'X'), frameInput('y', 'Y'), frameInput('w', TT('studio.width', 'Width')), frameInput('h', TT('studio.height', 'Height'))),
        h('div', { style: S.label }, 'Layout'),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' } },
          layoutButton('Left', 'Align selected object left', function () { alignSelected('left'); }),
          layoutButton('Center', 'Center selected object horizontally', function () { alignSelected('hcenter'); }),
          layoutButton('Right', 'Align selected object right', function () { alignSelected('right'); }),
          layoutButton('Top', 'Align selected object top', function () { alignSelected('top'); }),
          layoutButton('Middle', 'Center selected object vertically', function () { alignSelected('vcenter'); }),
          layoutButton('Bottom', 'Align selected object bottom', function () { alignSelected('bottom'); })),
        h('div', { style: { display: 'flex', gap: '4px' } },
          h('button', { style: S.tool, onClick: duplicateSelected }, 'Duplicate'),
          h('button', { style: S.tool, onClick: function () { alignSelected('page-width'); } }, 'Page width')),
        selected.type === 'text' ? h('label', { style: { fontSize: '10px', color: C.muted } }, TT('studio.text_role', 'Role (sets the exported tag)'),
          h('select', { value: selected.role, style: S.input, onChange: function (e) { dispatch({ type: 'object.update', target: selected.id, patch: { role: e.target.value } }, 'user'); } },
            h('option', { value: 'heading1' }, 'Heading 1'), h('option', { value: 'heading2' }, 'Heading 2'), h('option', { value: 'heading3' }, 'Heading 3'), h('option', { value: 'body' }, TT('studio.body_text', 'Body text')))) : null,
        selected.type === 'text' ? h('label', { style: { fontSize: '10px', color: C.muted } }, TT('studio.text_content', 'Text'),
          h('textarea', { key: 'text-' + selected.id + '-' + selectedTextValue, defaultValue: selectedTextValue, rows: selected.role === 'body' ? 4 : 2, style: Object.assign({}, S.input, { resize: 'vertical' }), 'aria-label': TT('studio.text_content', 'Text'),
            onKeyDown: function (e) { e.stopPropagation(); },
            onBlur: function (e) { commitTextEdit(selected, e.target.value); } })) : null,
        selected.type === 'text' ? h('label', { style: { fontSize: '10px', color: C.muted } }, TT('studio.font_size', 'Font size'),
          h('input', { type: 'number', min: 8, max: 120, value: selectedTextStyle.size || 16, style: S.input, onChange: function (e) { var v = parseInt(e.target.value, 10); if (isNaN(v)) return; var runs = textRunsFor(selected); runs[0].style.size = Math.max(8, Math.min(120, v)); dispatch({ type: 'object.update', target: selected.id, patch: { runs: runs } }, 'user'); } })) : null,
        selected.type === 'text' ? h('label', { style: { fontSize: '10px', color: C.muted } }, TT('studio.text_font', 'Font'),
          h('select', {
            value: (function () {
              var cur = selectedTextStyle.font;
              if (!cur) return 'system';
              for (var fk in ST_FONT_STACKS) { if (ST_FONT_STACKS[fk] === cur) return fk; }
              var bk = stBrandStyleKit(brandProfile);
              if (bk && bk.bodyFont === cur) return 'brand-body';
              if (bk && bk.headingFont === cur) return 'brand-heading';
              return '__custom';
            })(),
            style: S.input, 'aria-label': TT('studio.text_font', 'Font'),
            onChange: function (e) {
              var v = e.target.value;
              var bk2 = stBrandStyleKit(brandProfile);
              var stack = v === 'brand-body' ? (bk2 && bk2.bodyFont) : v === 'brand-heading' ? (bk2 && bk2.headingFont) : ST_FONT_STACKS[v];
              if (!stack) return;
              var runs = textRunsFor(selected);
              runs[0].style = Object.assign({}, runs[0].style, { font: stack });
              dispatch({ type: 'object.update', target: selected.id, patch: { runs: runs } }, 'user');
            } },
            h('option', { value: 'system' }, TT('studio.font_default', 'Default (system)')),
            h('option', { value: 'serif' }, TT('studio.font_serif', 'Serif')),
            h('option', { value: 'friendly' }, TT('studio.font_friendly', 'Friendly')),
            h('option', { value: 'mono' }, TT('studio.font_mono', 'Monospace')),
            (function () { var bk3 = stBrandStyleKit(brandProfile); return (bk3 && bk3.bodyFont) ? h('option', { value: 'brand-body' }, TT('studio.font_brand_body', 'School brand — body')) : null; })(),
            (function () { var bk4 = stBrandStyleKit(brandProfile); return (bk4 && bk4.headingFont && bk4.headingFont !== bk4.bodyFont) ? h('option', { value: 'brand-heading' }, TT('studio.font_brand_heading', 'School brand — heading')) : null; })(),
            h('option', { value: '__custom', disabled: true }, TT('studio.font_custom', 'Custom')))) : null,
        selected.type === 'text' ? h('div', null,
          h('div', { style: S.label }, TT('studio.text_align', 'Text alignment & weight')),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' } },
            ['left', 'center', 'right'].map(function (al) {
              var curAlign = selectedTextStyle.align || 'left';
              var active = curAlign === al;
              return h('button', { key: al, style: Object.assign({}, S.tool, { textAlign: 'center' }, active ? { borderColor: C.accent, background: C.selectedBg } : null),
                'aria-pressed': active, 'aria-label': TT('studio.align_text', 'Align text') + ' ' + al, title: TT('studio.align_text', 'Align text') + ' ' + al,
                onClick: function () { var runs = textRunsFor(selected); runs[0].style = Object.assign({}, runs[0].style, { align: al }); dispatch({ type: 'object.update', target: selected.id, patch: { runs: runs } }, 'user'); } },
                al === 'left' ? 'L' : al === 'center' ? 'C' : 'R');
            }),
            (function () {
              var bold = !!selectedTextStyle.bold;
              return h('button', { key: 'bold', style: Object.assign({}, S.tool, { textAlign: 'center', fontWeight: 900 }, bold ? { borderColor: C.accent, background: C.selectedBg } : null),
                'aria-pressed': bold, 'aria-label': TT('studio.bold', 'Bold'), title: TT('studio.bold', 'Bold'),
                onClick: function () { var runs = textRunsFor(selected); runs[0].style = Object.assign({}, runs[0].style, { bold: !bold }); dispatch({ type: 'object.update', target: selected.id, patch: { runs: runs } }, 'user'); } }, 'B');
            })())) : null,
        selected.type === 'text' ? colorField(TT('studio.text_color', 'Text color'), selectedTextStyle.color || '#111827', function (hex) { var runs = textRunsFor(selected); runs[0].style.color = hex; dispatch({ type: 'object.update', target: selected.id, patch: { runs: runs } }, 'user'); }) : null,
        selected.type === 'shape' ? colorField(TT('studio.fill', 'Fill'), selected.fill || '#dbeafe', function (hex) { dispatch({ type: 'object.update', target: selected.id, patch: { fill: hex } }, 'user'); }) : null,
        selected.type === 'image' ? h('div', null,
          (!selected.src && selectedImageState) ? h('div', { style: { border: '1px solid ' + (selectedImageState.key === 'kept-placeholder' ? statusTone('success').border : statusTone('review').border), background: selectedImageState.key === 'kept-placeholder' ? statusTone('success').bg : statusTone('review').bg, color: selectedImageState.key === 'kept-placeholder' ? statusTone('success').fg : statusTone('review').fg, borderRadius: '8px', padding: '7px', fontSize: '10.5px', lineHeight: 1.35, marginBottom: '6px' } },
            h('strong', { style: { display: 'block', fontSize: '11px' } }, selectedImageState.label),
            h('span', null, selectedImageState.message)) : null,
          h('label', { style: { fontSize: '10px', color: C.muted } }, TT('studio.alt_text', 'Alt text (what a screen reader hears)'),
            // key by object id AND altNonce: switching selection OR an AI draft
            // remounts with the right defaultValue; commit-on-blur = ONE
            // object.update op per edit.
            h('textarea', { key: 'alt-' + selected.id + '-' + altNonce + '-' + (selected.alt || ''), defaultValue: selected.alt || '', rows: 3, style: Object.assign({}, S.input, { resize: 'vertical' }), 'data-st-alt-input': selected.id,
              onKeyDown: function (e) { e.stopPropagation(); },
              onBlur: function (e) {
                if (e.target.value !== (selected.alt || '')) {
                  var beforeAltEdit = stAnalyzeDoc(_docRef.current);
                  dispatch({ type: 'object.update', target: selected.id, patch: { alt: e.target.value } }, 'user');
                  advancePreflightGuideAfter({ type: 'add-alt', targetId: selected.id, issueType: 'alt' }, beforeAltEdit);
                }
              } })),
          (canSuggestAlt && selected.src) ? h('button', { style: Object.assign({}, S.tool, { marginTop: '4px', opacity: aiBusy === 'alt' ? 0.6 : 1 }), disabled: aiBusy === 'alt', onClick: runSuggestAlt, title: TT('studio.ai_suggest_alt_hint', 'Draft alt text with AI, then review it — logged as AI in your process') }, aiBusy === 'alt' ? '… ' + TT('studio.ai_drafting', 'Drafting…') : '✨ ' + TT('studio.ai_suggest_alt', 'Suggest alt text')) : null,
          h('label', { style: { fontSize: '11px', color: C.text, display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' } },
            h('input', { type: 'checkbox', checked: !!selected.decorative, onChange: function (e) { var decorativeChecked = !!e.target.checked; var beforeDecorativeEdit = stAnalyzeDoc(_docRef.current); dispatch({ type: 'object.update', target: selected.id, patch: { decorative: decorativeChecked } }, 'user'); advancePreflightGuideAfter({ type: decorativeChecked ? 'mark-decorative' : 'add-alt', targetId: selected.id, issueType: 'alt' }, beforeDecorativeEdit); } }),
            TT('studio.decorative', 'Decorative (skip in screen readers)')),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginTop: '4px' } },
            h('button', { style: Object.assign({}, S.tool, selected.fit !== 'contain' ? { borderColor: C.accent } : null), onClick: function () { dispatch({ type: 'object.update', target: selected.id, patch: { fit: 'cover' } }, 'user'); }, 'aria-pressed': selected.fit !== 'contain' }, 'Fill'),
            h('button', { style: Object.assign({}, S.tool, selected.fit === 'contain' ? { borderColor: C.accent } : null), onClick: function () { dispatch({ type: 'object.update', target: selected.id, patch: { fit: 'contain' } }, 'user'); }, 'aria-pressed': selected.fit === 'contain' }, 'Fit')),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginTop: '4px' } },
            h('button', { style: S.tool, onClick: function () { if (fileRef.current) { fileRef.current.setAttribute('data-st-replace', selected.id); fileRef.current.click(); } } }, '🔁 ' + TT('studio.replace_image', 'Replace…')),
            selected.src ? h('button', { style: S.tool, onClick: function () { setCropRect(null); setCropId(selected.id); }, title: TT('studio.crop_hint', 'Trim the image — removed pixels are permanently deleted, including from your saved file') }, '✂ ' + TT('studio.crop', 'Crop…')) : null),
          (canEditImage && selected.src) ? h('button', { style: Object.assign({}, S.tool, { marginTop: '4px' }, imgEditOpen ? { borderColor: C.accent, background: C.selectedBg } : null), 'aria-expanded': imgEditOpen, onClick: function () { setImgEditOpen(!imgEditOpen); } }, '✨ ' + TT('studio.ai_edit_image', 'Edit image with AI…')) : null,
          (canEditImage && selected.src && imgEditOpen) ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px', padding: '6px', border: '1px solid ' + C.border, borderRadius: '8px', background: C.panelAlt, marginTop: '4px' } },
            h('textarea', { value: imgEditPrompt, rows: 2, placeholder: TT('studio.ai_edit_placeholder', 'e.g. brighten the colors and simplify the background'), 'aria-label': TT('studio.ai_edit_label', 'Describe how the image should change'), style: Object.assign({}, S.input, { resize: 'vertical' }), disabled: aiBusy === 'img-edit',
              onKeyDown: function (e) { e.stopPropagation(); }, onChange: function (e) { setImgEditPrompt(e.target.value); } }),
            h('button', { style: Object.assign({}, S.tool, { background: '#2563eb', color: '#fff', borderColor: '#1e3a8a', opacity: (aiBusy === 'img-edit' || !String(imgEditPrompt).trim()) ? 0.6 : 1 }), disabled: aiBusy === 'img-edit' || !String(imgEditPrompt).trim(), onClick: runEditImage }, aiBusy === 'img-edit' ? '… ' + TT('studio.ai_editing', 'Editing…') : '✨ ' + TT('studio.ai_edit_apply', 'Edit image')),
            h('p', { style: { fontSize: '9px', color: C.soft, margin: 0 } }, TT('studio.ai_edit_note', 'Whole-image edit, logged as AI. The original stays in your process history — use Crop to permanently remove content.'))) : null) : null,
        h('div', { style: { display: 'flex', gap: '4px', marginTop: '4px' } },
          h('button', { style: S.tool, onClick: function () { dispatch({ type: 'object.z', target: selected.id, z: (selected.z || 1) + 1 }, 'user'); }, title: TT('studio.bring_forward', 'Bring forward (visual stacking only — reading order is the list)') }, '⬆ z'),
          h('button', { style: S.tool, onClick: function () { dispatch({ type: 'object.z', target: selected.id, z: Math.max(0, (selected.z || 1) - 1) }, 'user'); }, title: TT('studio.send_back', 'Send backward') }, '⬇ z'),
          h('button', { style: Object.assign({}, S.tool, { color: '#b91c1c', borderColor: '#fca5a5' }), onClick: function () { dispatch({ type: 'object.remove', target: selected.id }, 'user'); clearSelection(); } }, '🗑')));
    }

    // Ctrl+Z / Ctrl+Y (and Ctrl+Shift+Z) — skipped while typing in a field so
    // the browser's native text undo keeps working inside inputs/textareas
    // (the object-level keyboard grammar stays on the objects themselves).
    var onShellKeyDown = function (ev) {
      var tag = (ev.target && ev.target.tagName || '').toUpperCase();
      // Escape: deselect if something is selected, otherwise close the modal.
      // A focused object handles (and stops) its own Escape; text fields keep
      // their native Escape. This only fires from panels/canvas chrome.
      var inField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      // Escape: close the shortcuts overlay first, then deselect, then close.
      if (ev.key === 'Escape') {
        if (inField) return;
        if (shortcutsOpen) { ev.preventDefault(); setShortcutsOpen(false); return; }
        ev.preventDefault();
        if (selectedId || selectionIds.length) { clearSelection(); return; }
        if (typeof props.onClose === 'function') props.onClose();
        return;
      }
      // '?' (Shift+/) toggles the shortcut reference — no modifier, so handle it
      // before the Ctrl/⌘ gate below. Never steals a keystroke from a text field.
      if (ev.key === '?' && !inField && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
        ev.preventDefault(); setShortcutsOpen(function (v) { return !v; }); return;
      }
      if (!(ev.ctrlKey || ev.metaKey)) return;
      if (inField) return;
      var k = (ev.key || '').toLowerCase();
      if (k === '+' || k === '=') { ev.preventDefault(); changeCanvasZoom('in'); }
      else if (k === '-' || k === '_') { ev.preventDefault(); changeCanvasZoom('out'); }
      else if (k === '0') { ev.preventDefault(); changeCanvasZoom('fit'); }
      else if (k === 'z' && !ev.shiftKey) { ev.preventDefault(); if (stUndo(_docRef.current)) { bump(); stAnnounce(TT('studio.a11y_undone', 'Undone')); } }
      else if (k === 'y' || (k === 'z' && ev.shiftKey)) { ev.preventDefault(); if (stRedo(_docRef.current)) { bump(); stAnnounce(TT('studio.a11y_redone', 'Redone')); } }
      // Duplicate the selection (group-aware); mirrors the panel's Duplicate button.
      else if (k === 'd') { ev.preventDefault(); if (selectionIds.length > 1) duplicateSelectedGroup(); else if (selectedId) duplicateSelected(); }
      else if (k === 'a') { ev.preventDefault(); selectAllObjects(); }
      // Ctrl+S saves in-app instead of firing the browser's Save-page dialog.
      else if (k === 's') { ev.preventDefault(); saveDoc(); }
      else if (k === ']') { ev.preventDefault(); reorderSelected(1); }
      else if (k === '[') { ev.preventDefault(); reorderSelected(-1); }
    };
    var errorTone = statusTone('error');
    var successTone = statusTone('success');
    var preflightGuideTone = preflightGuide.issue ? statusTone(preflightGuide.issue.severity === 'error' ? 'error' : preflightGuide.issue.severity === 'warning' ? 'warning' : 'review') : successTone;
    var exportToneFor = function (status) {
      return statusTone(status === 'blocked' ? 'error' : status === 'review' ? 'warning' : 'success');
    };
    var exportCardIssueFilter = function (card) {
      if (!card || (card.key !== 'tagged-pdf' && card.key !== 'html' && card.key !== 'visual')) return null;
      if (card.status === 'blocked') return preflight.counts.error ? 'fix' : (preflight.counts.warning ? 'warning' : (preflight.counts.review ? 'review' : null));
      if (card.status === 'review') return preflight.counts.warning ? 'warning' : (preflight.counts.review ? 'review' : null);
      return null;
    };
    var openExportCardIssues = function (filter) {
      if (!filter) return;
      setPreflightIssueFilter(filter);
      setPreflightGuideIndex(0);
      setPreflightOpen(true);
      stAnnounce(filter === 'fix' ? TT('studio.export_show_fixes', 'Showing required accessibility fixes') : TT('studio.export_show_review', 'Showing accessibility review items'));
    };
    var modLabel = (function () { try { return /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || '') ? '⌘' : 'Ctrl'; } catch (_) { return 'Ctrl'; } })();
    // Canva-style quick color picker: brand swatches + a curated palette + the
    // colors already used in this design, with the OS picker kept as "Custom".
    // One reusable field for text color, shape fill, and page background.
    var swatchGroups = stSwatchPalette(doc, brandProfile);
    var colorField = function (labelText, current, onPick) {
      var cur = stHexNorm(current);
      var ink = function (hex) { try { var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16); return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#111827' : '#ffffff'; } catch (_) { return '#ffffff'; } };
      var swatchBtn = function (hex) {
        var active = cur === hex;
        return h('button', { key: hex, type: 'button', title: hex, 'aria-label': hex, 'aria-pressed': active, onClick: function () { onPick(hex); },
          style: { width: '22px', height: '22px', borderRadius: '5px', cursor: 'pointer', padding: 0, background: hex, border: 'none', boxShadow: active ? ('0 0 0 2px ' + C.accent + ', 0 0 0 3px ' + C.panel) : 'inset 0 0 0 1px rgba(0,0,0,0.18)' } },
          active ? h('span', { 'aria-hidden': true, style: { color: ink(hex), fontSize: '12px', fontWeight: 900, lineHeight: '22px' } }, '✓') : null);
      };
      var groups = [
        { key: 'brand', label: TT('studio.swatch_brand', 'School brand'), colors: swatchGroups.brand },
        { key: 'standard', label: TT('studio.swatch_standard', 'Colors'), colors: swatchGroups.standard },
        { key: 'document', label: TT('studio.swatch_document', 'In this design'), colors: swatchGroups.document }
      ];
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px' } },
        h('div', { style: S.label }, labelText),
        groups.map(function (grp) {
          if (!grp.colors.length) return null;
          return h('div', { key: grp.key, style: { display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' } },
            h('span', { style: { fontSize: '9px', color: C.soft, width: '100%', letterSpacing: '0.03em', textTransform: 'uppercase' } }, grp.label),
            grp.colors.map(swatchBtn));
        }),
        h('label', { style: { display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: C.muted, marginTop: '2px' } }, TT('studio.swatch_custom', 'Custom'),
          h('input', { type: 'color', value: cur || '#000000', 'aria-label': TT('studio.swatch_custom', 'Custom color'),
            style: { width: '36px', height: '24px', padding: '1px', border: '1px solid ' + C.border, borderRadius: '6px', background: C.inputBg, cursor: 'pointer' },
            onChange: function (e) { onPick(e.target.value); } })));
    };
    var shortcutsOverlay = shortcutsOpen ? h('div', {
        role: 'dialog', 'aria-modal': false, 'aria-label': TT('studio.shortcuts', 'Keyboard shortcuts'),
        style: { position: 'absolute', inset: 0, background: 'rgba(2,6,23,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '20px' },
        onClick: function (e) { if (e.target === e.currentTarget) setShortcutsOpen(false); } },
      h('div', { style: { background: C.panel, color: C.text, border: '1px solid ' + C.border, borderRadius: '14px', boxShadow: '0 12px 40px rgba(0,0,0,0.4)', maxWidth: '460px', width: '100%', maxHeight: '82%', overflow: 'auto', padding: '18px 20px' } },
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' } },
          h('h2', { style: { margin: 0, fontSize: '15px', fontWeight: 800 } }, '⌨ ' + TT('studio.shortcuts', 'Keyboard shortcuts')),
          h('button', { style: S.hBtn, 'aria-label': TT('studio.close', 'Close'), onClick: function () { setShortcutsOpen(false); } }, '✕')),
        h('div', { style: { display: 'grid', gap: '6px' } },
          stShortcutList().map(function (sc) {
            var keys = sc.mod ? (modLabel + '+' + sc.keys) : sc.keys;
            return h('div', { key: sc.id, style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '5px 9px', borderRadius: '8px', background: C.panelAlt } },
              h('span', { style: { fontSize: '12.5px' } }, TT('studio.sc_' + sc.id, sc.label)),
              h('kbd', { style: { fontSize: '11px', fontWeight: 800, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', background: C.inputBg, color: C.inputText, border: '1px solid ' + C.border, borderRadius: '6px', padding: '2px 7px', whiteSpace: 'nowrap' } }, keys));
          })),
        h('p', { style: { fontSize: '11px', color: C.soft, margin: '12px 0 0' } }, TT('studio.shortcuts_note', 'Shortcuts work while the editor is focused, not while typing in a text box.'))
      )) : null;
    return h('div', { className: 'st-root theme-' + themeName, style: S.overlay, role: 'dialog', 'aria-modal': true, 'aria-label': TT('studio.title', 'AlloStudio'), onKeyDown: function (ev) { trapTab(ev); onShellKeyDown(ev); } },
      shortcutsOverlay,
      h('div', { ref: _shellRef, style: S.shell },
        // header
        h('div', { style: S.header },
          h('span', { style: { fontSize: '18px' }, 'aria-hidden': true }, '🎨'),
          // Uncontrolled + commit-on-blur: one clean doc.retitle op instead of
          // an op per keystroke polluting the process timeline.
          h('input', { key: 'title-' + ((doc && doc.createdAt) || 0) + '-' + doc.title, defaultValue: doc.title, 'aria-label': TT('studio.doc_title', 'Document title'), style: S.titleInput,
            onBlur: function (e) { if (e.target.value !== doc.title) dispatch({ type: 'doc.retitle', title: e.target.value }, 'user'); },
            onKeyDown: function (e) { if (e.key === 'Enter') e.target.blur(); } }),
          h('button', { style: Object.assign({}, S.hBtn, ops.length ? null : { opacity: 0.45, cursor: 'default' }), disabled: !ops.length, onClick: function () { if (stUndo(_docRef.current)) { bump(); } }, 'aria-label': TT('studio.undo', 'Undo') }, '↩ ' + TT('studio.undo', 'Undo')),
          h('button', { style: Object.assign({}, S.hBtn, (doc._redo && doc._redo.length) ? null : { opacity: 0.45, cursor: 'default' }), disabled: !(doc._redo && doc._redo.length), onClick: function () { if (stRedo(_docRef.current)) { bump(); } }, 'aria-label': TT('studio.redo', 'Redo') }, '↪ ' + TT('studio.redo', 'Redo')),
          h('button', { style: S.hBtn, onClick: function () { setView('process'); } }, '🎞️ ' + (student ? TT('studio.process_title_student', 'My process') : TT('studio.process_title_teacher', 'Process timeline'))),
          h('button', { style: Object.assign({}, S.hBtn, { background: student ? '#7c3aed' : '#1e293b' }), 'aria-pressed': student, title: TT('studio.role_toggle_hint', 'Student mode uses portfolio framing for the process view'), onClick: function () { var next = student ? 'teacher' : 'student'; if (next === 'student') { setAgentOpen(false); setAgentPlan(null); setAgentSelectedOps([]); setAgentFollowUp(''); setDesignFeedback(null); setImgEditOpen(false); } setRole(next); } }, student ? '🎓 ' + TT('studio.role_student', 'Student mode') : '🧑‍🏫 ' + TT('studio.role_teacher', 'Teacher mode')),
          h('button', { style: Object.assign({}, S.hBtn, preflight.counts.error ? { borderColor: '#fca5a5' } : null), onClick: function () { setPreflightOpen(!preflightOpen); }, 'aria-expanded': preflightOpen }, 'A11y ' + preflightTotal),
          h('button', { style: Object.assign({}, S.hBtn, shortcutsOpen ? { borderColor: C.accent, background: C.selectedBg } : null), onClick: function () { setShortcutsOpen(!shortcutsOpen); }, 'aria-expanded': shortcutsOpen, 'aria-label': TT('studio.shortcuts', 'Keyboard shortcuts'), title: TT('studio.shortcuts_hint', 'Keyboard shortcuts (press ?)') }, '⌨'),
          h('button', { style: Object.assign({}, S.hBtn, fullscreen ? { borderColor: C.accent, background: C.selectedBg } : null), onClick: function () { setFullscreen(!fullscreen); }, 'aria-pressed': fullscreen, 'aria-label': fullscreen ? TT('studio.fullscreen_exit', 'Exit fullscreen') : TT('studio.fullscreen_enter', 'Fullscreen'), title: fullscreen ? TT('studio.fullscreen_exit', 'Exit fullscreen') : TT('studio.fullscreen_enter', 'Fullscreen') }, '⛶'),
          h('span', { style: S.headerSpacer }),
          h('button', { style: S.hBtn, onClick: saveDoc }, '💾 ' + TT('studio.save', 'Save')),
          h('button', { style: S.hBtn, onClick: saveToPortfolio, title: TT('studio.portfolio_hint', 'Save a compact, read-only product card to AlloHaven Portfolio') }, TT('studio.portfolio', 'Portfolio')),
          h('button', { style: Object.assign({}, S.hBtn, { background: '#2563eb', borderColor: '#1e3a8a' }), onClick: function () { setExportOpen(!exportOpen); }, 'aria-expanded': exportOpen }, '📤 ' + TT('studio.export', 'Export')),
          h('button', { style: S.hBtn, 'aria-label': TT('studio.close', 'Close AlloStudio'), onClick: props.onClose }, '✕')),
        preflightOpen ? h('div', { style: { padding: '10px 14px', background: C.panelAlt, color: C.text, borderBottom: '1px solid ' + C.border, display: 'flex', gap: '10px', alignItems: 'flex-start', flexWrap: 'wrap' } },
          h('div', { style: { fontSize: '12px', fontWeight: 800, color: C.text, minWidth: '170px' } }, ready ? ready.title : TT('studio.ready_to_share', 'Ready to share'),
            h('div', { style: { fontSize: '11px', fontWeight: 600, color: C.muted, marginTop: '2px' } }, preflight.counts.error + ' errors - ' + preflight.counts.warning + ' warnings - ' + preflight.counts.review + ' review'),
            h('div', { style: { fontSize: '10.5px', fontWeight: 500, color: C.soft, marginTop: '3px', lineHeight: 1.35 } }, ready ? ready.message : ''),
            h('button', { style: Object.assign({}, S.hBtn, { marginTop: '6px', width: '100%', opacity: a11yAutoFix.ops.length ? 1 : 0.5 }), disabled: !a11yAutoFix.ops.length, onClick: applyA11yAutoFix, title: TT('studio.a11y_quick_fix_hint', 'Automatically fixes simple contrast, tiny text, and off-page object issues') }, TT('studio.a11y_quick_fix', 'Fix simple issues') + (a11yAutoFix.ops.length ? ' (' + a11yAutoFix.ops.length + ')' : '')),
            ((canAgentEdit || canBulkAlt) && preflightTotal) ? h('button', { style: Object.assign({}, S.hBtn, { marginTop: '4px', width: '100%', opacity: aiBusy ? 0.6 : 1 }), disabled: !!aiBusy, onClick: runMakeAccessible, title: TT('studio.a11y_guided_hint', 'Applies the simple rule-based fixes, drafts missing alt text for review, and prepares a structure-fix request — you approve every AI change') }, '♿ ' + TT('studio.a11y_guided', 'Fix accessibility (guided)')) : null,
            (canBulkAlt && altFailures.length) ? h('button', { style: Object.assign({}, S.hBtn, { marginTop: '4px', width: '100%', opacity: aiBusy ? 0.6 : 1 }), disabled: !!aiBusy, onClick: runDraftAllAlt, title: TT('studio.ai_alt_all_hint', 'AI drafts alt text for every unlabeled image — you review each draft before it applies, and edits are logged honestly') }, aiBusy === 'alt-all' ? '… ' + TT('studio.ai_drafting', 'Drafting…') : '✨ ' + TT('studio.ai_alt_all', 'Draft missing alt text') + ' (' + Math.min(altFailures.length, 12) + ')') : null,
            canDesignFeedback ? h('button', { style: Object.assign({}, S.hBtn, { marginTop: '4px', width: '100%', opacity: aiBusy ? 0.6 : 1 }), disabled: !!aiBusy, onClick: runDesignFeedback, title: TT('studio.feedback_hint', 'AI looks at the rendered page and suggests design improvements — advisory only, nothing is changed') }, aiBusy === 'feedback' ? '… ' + TT('studio.feedback_busy', 'Reviewing…') : '🎨 ' + TT('studio.feedback', 'Get design feedback')) : null),
          preflightGuide.total ? h('div', { style: { flex: '1 1 250px', border: '1px solid ' + preflightGuideTone.border, background: preflightGuideTone.bg, color: preflightGuideTone.fg, borderRadius: '8px', padding: '8px', fontSize: '11px', lineHeight: 1.35 } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'baseline' } },
              h('strong', { style: { fontSize: '11.5px' } }, TT('studio.preflight_guide', 'Guided review')),
              h('span', { style: { fontSize: '9.5px', fontWeight: 900, textTransform: 'uppercase' } }, preflightGuide.title)),
            h('div', { style: { marginTop: '5px', fontWeight: 800 } }, preflightGuide.issue.title),
            h('div', { style: { marginTop: '2px' } }, preflightGuide.issue.message),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '7px' } },
              h('button', { type: 'button', style: { border: '1px solid ' + preflightGuideTone.border, background: C.panel, color: C.text, borderRadius: '6px', padding: '3px 7px', cursor: 'pointer', fontSize: '10px', fontWeight: 800 }, onClick: function () { setPreflightGuideIndex(preflightGuide.index - 1); } }, TT('studio.previous', 'Previous')),
              h('button', { type: 'button', style: { border: '1px solid ' + preflightGuideTone.border, background: C.panel, color: C.text, borderRadius: '6px', padding: '3px 7px', cursor: 'pointer', fontSize: '10px', fontWeight: 800 }, onClick: function () { setPreflightGuideIndex(preflightGuide.index + 1); } }, TT('studio.next', 'Next')),
              preflightGuide.issue.id ? h('button', { type: 'button', style: { border: '1px solid ' + preflightGuideTone.border, background: C.panel, color: C.text, borderRadius: '6px', padding: '3px 7px', cursor: 'pointer', fontSize: '10px', fontWeight: 800 }, onClick: function () { selectOnly(preflightGuide.issue.id); } }, TT('studio.select', 'Select')) : null,
              preflightGuide.actions.map(function (action, idx) {
                return h('button', { key: idx, type: 'button', style: { border: '1px solid ' + preflightGuideTone.border, background: preflightGuideTone.bg, color: preflightGuideTone.fg, borderRadius: '6px', padding: '3px 7px', cursor: 'pointer', fontSize: '10px', fontWeight: 900 }, onClick: function () { applyReadyAction(action); } }, readyActionLabel(action));
              }))) : h('div', { style: { flex: '1 1 250px', border: '1px solid ' + successTone.border, background: successTone.bg, color: successTone.fg, borderRadius: '8px', padding: '8px', fontSize: '11px', fontWeight: 800 } }, TT('studio.guided_review_done', 'Guided review complete.')),
          h('div', { style: { display: 'grid', gridTemplateColumns: layout.compact ? '1fr' : 'repeat(5, minmax(112px, 1fr))', gap: '6px', flex: '1 1 520px' } },
            accessibilityChecklist.map(function (check) {
              var tone = check.severity === 'error' ? statusTone('error') : check.severity === 'warning' ? statusTone('warning') : check.severity === 'review' ? statusTone('review') : statusTone('success');
              var label = check.status === 'pass' ? TT('studio.a11y_pass', 'Pass') : check.status === 'fix' ? TT('studio.a11y_fix', 'Fix') : TT('studio.a11y_review', 'Review');
              return h('div', { key: check.key, style: { border: '1px solid ' + tone.border, background: tone.bg, color: tone.fg, borderRadius: '8px', padding: '7px', minHeight: '76px' } },
                h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: '6px', alignItems: 'baseline' } },
                  h('strong', { style: { fontSize: '11px' } }, check.name),
                  h('span', { style: { fontSize: '9px', fontWeight: 900, textTransform: 'uppercase' } }, label + (check.count ? ' ' + check.count : ''))),
                h('div', { style: { fontSize: '10px', lineHeight: 1.25, marginTop: '5px' } }, check.message));
            })),
          h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', flex: '1 1 100%' } },
            quickReady && quickReady.actions.length ? quickReady.actions.slice(0, 8).map(function (action, idx) {
              var tone = statusTone(action.severity === 'error' ? 'error' : action.severity === 'warning' ? 'warning' : 'review');
              var label = readyActionLabel(action);
              return h('button', { key: idx, style: { border: '1px solid ' + tone.border, background: tone.bg, color: tone.fg, borderRadius: '8px', padding: '5px 8px', cursor: 'pointer', fontSize: '11px', fontWeight: 700, textAlign: 'left' },
                onClick: function () { applyReadyAction(action); },
                title: action.message }, label);
            }) : h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' } },
              h('span', { style: { fontSize: '12px', color: C.muted, fontWeight: 700 } }, preflight.issues.length && preflightIssueFilter !== 'all' ? TT('studio.no_quick_actions_in_filter', 'No quick actions in this filter.') : TT('studio.no_a11y_issues', 'No accessibility issues found.')),
              preflight.issues.length && preflightIssueFilter !== 'all' ? h('button', { type: 'button', style: Object.assign({}, S.tool, { padding: '3px 7px', minHeight: '22px', fontSize: '10px' }), onClick: resetPreflightIssueFilter }, TT('studio.show_all_issues', 'Show all issues')) : null)),
          designFeedback ? h('div', { style: { flex: '1 1 100%', border: '1px solid ' + C.border, borderRadius: '8px', background: C.panel, padding: '8px', color: C.text } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' } },
              h('strong', { style: { fontSize: '11.5px' } }, '🎨 ' + TT('studio.feedback_title', 'Design feedback (AI)')),
              h('button', { style: Object.assign({}, S.tool, { padding: '2px 8px', minHeight: '22px', fontSize: '10px' }), onClick: function () { setDesignFeedback(null); } }, TT('studio.dismiss', 'Dismiss'))),
            h('p', { style: { margin: '6px 0 4px', fontSize: '11px', lineHeight: 1.45, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } }, designFeedback.text),
            h('p', { style: { margin: 0, fontSize: '9.5px', color: C.soft } }, TT('studio.feedback_note', 'Suggestions only — nothing in your document was changed.'))) : null,
          preflight.issues.length ? h('div', { role: 'group', 'aria-label': TT('studio.issue_filter', 'Issue filter'), style: { display: 'flex', gap: '4px', flexWrap: 'wrap', flex: '1 1 100%' } },
            [
              ['all', TT('studio.issue_filter_all', 'All'), preflight.issues.length],
              ['fix', TT('studio.a11y_fix', 'Fix'), preflight.counts.error],
              ['warning', TT('studio.a11y_warning', 'Warnings'), preflight.counts.warning],
              ['review', TT('studio.a11y_review', 'Review'), preflight.counts.review]
            ].map(function (item) {
              var active = preflightIssueFilter === item[0];
              return h('button', { key: item[0], type: 'button', 'aria-pressed': active, style: Object.assign({}, S.tool, { padding: '4px 8px', minHeight: '24px', fontSize: '10px' }, active ? { borderColor: C.accent, background: C.selectedBg } : null), onClick: function () { setPreflightIssueFilter(item[0]); setPreflightGuideIndex(0); } }, item[1] + ' ' + item[2]);
            })) : null,
          preflight.issues.length ? h('div', { style: { display: 'grid', gridTemplateColumns: layout.compact ? '1fr' : 'repeat(auto-fit, minmax(210px, 1fr))', gap: '6px', flex: '1 1 100%' } },
            visiblePreflightIssues.length ? visiblePreflightIssues.slice(0, 10).map(function (issue, idx) {
              var tone = statusTone(issue.severity === 'error' ? 'error' : issue.severity === 'warning' ? 'warning' : 'review');
              var issueActions = stIssueActionChoices(doc, issue);
              var guideIdx = idx;
              return h('div', { key: idx, style: { border: '1px solid ' + tone.border, background: tone.bg, color: tone.fg, borderRadius: '8px', padding: '7px', textAlign: 'left', fontSize: '11px' }, title: issue.message },
                h('strong', { style: { display: 'block', marginBottom: '2px' } }, issue.title),
                h('span', { style: { display: 'block', lineHeight: 1.25 } }, issue.message),
                h('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' } },
                  issue.id ? h('button', { type: 'button', style: { border: '1px solid ' + tone.border, background: C.panel, color: C.text, borderRadius: '6px', padding: '3px 7px', cursor: 'pointer', fontSize: '10px', fontWeight: 800 }, onClick: function () { setPreflightGuideIndex(guideIdx); selectOnly(issue.id); } }, TT('studio.select', 'Select')) : null,
                  issueActions.map(function (issueAction, actionIdx) {
                    return h('button', { key: actionIdx, type: 'button', style: { border: '1px solid ' + tone.border, background: tone.bg, color: tone.fg, borderRadius: '6px', padding: '3px 7px', cursor: 'pointer', fontSize: '10px', fontWeight: 900 }, onClick: function () { applyReadyAction(issueAction); } }, readyActionLabel(issueAction));
                  })));
            }) : h('div', { style: { gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '11px', color: C.muted, padding: '8px', border: '1px solid ' + C.border, borderRadius: '8px', background: C.panel } },
              h('span', null, TT('studio.issue_filter_empty', 'No issues in this filter.')),
              preflightIssueFilter !== 'all' ? h('button', { type: 'button', style: Object.assign({}, S.tool, { padding: '3px 7px', minHeight: '22px', fontSize: '10px' }), onClick: resetPreflightIssueFilter }, TT('studio.show_all_issues', 'Show all issues')) : null)) : null) : null,
        // export panel
        exportOpen ? h('div', { style: { padding: '10px 14px', background: C.exportBg, color: C.text, borderBottom: '1px solid ' + C.exportBorder, display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } },
          h('div', { style: { display: 'grid', gridTemplateColumns: layout.compact ? '1fr' : 'repeat(4, minmax(150px, 1fr))', gap: '6px', flex: '1 1 100%' } },
            exportConfidence.cards.map(function (card) {
              var tone = exportToneFor(card.status);
              var label = card.status === 'blocked' ? TT('studio.export_blocked', 'Blocked') : card.status === 'review' ? TT('studio.export_review', 'Review') : TT('studio.export_ready', 'Ready');
              var issueFilter = exportCardIssueFilter(card);
              var actionLabel = issueFilter === 'fix' ? TT('studio.open_required_fixes', 'Open fixes') : issueFilter ? TT('studio.open_review_items', 'Open review') : '';
              var cardStyle = { border: '1px solid ' + tone.border, background: tone.bg, color: tone.fg, borderRadius: '8px', padding: '7px', minHeight: '72px', textAlign: 'left', font: 'inherit' };
              if (issueFilter) cardStyle = Object.assign({}, cardStyle, { cursor: 'pointer', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.14)' });
              return h(issueFilter ? 'button' : 'div', { key: card.key, type: issueFilter ? 'button' : undefined, style: cardStyle, onClick: issueFilter ? function () { openExportCardIssues(issueFilter); } : undefined, title: issueFilter ? TT('studio.export_card_open_issues', 'Open related accessibility issues') : undefined },
                h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: '6px', alignItems: 'baseline' } },
                  h('strong', { style: { fontSize: '11px' } }, card.label),
                  h('span', { style: { fontSize: '9px', fontWeight: 900, textTransform: 'uppercase' } }, label)),
                h('div', { style: { fontSize: '10px', lineHeight: 1.25, marginTop: '5px' } }, card.message),
                issueFilter ? h('div', { style: { fontSize: '9.5px', fontWeight: 900, marginTop: '7px', textTransform: 'uppercase' } }, actionLabel) : null);
            })),
          h('button', { style: S.tool, onClick: exportTagged }, '📄 ' + TT('studio.export_tagged', 'Tagged PDF (accessible)')),
          h('button', { style: S.tool, onClick: exportHtml }, '🌐 ' + TT('studio.export_html', 'Accessible HTML')),
          h('button', { style: S.tool, onClick: exportPng }, '🖼️ PNG'),
          h('button', { style: S.tool, onClick: exportPrint, title: TT('studio.print_hint', 'Pixel-faithful print or save-as-PDF of the page as it looks. The Tagged PDF stays the accessible version.') }, '🖨️ ' + TT('studio.export_print', 'Print / PDF (visual)')),
          h('button', { style: Object.assign({}, S.tool, { borderColor: C.accent }), onClick: exportWorksheetPdf, title: TT('studio.ws_pdf_hint', 'Rebuild as a linear worksheet — real questions + answer spaces — and export a tagged PDF') }, '📝 ' + TT('studio.export_worksheet_pdf', 'Worksheet → Tagged PDF')),
          h('button', { style: S.tool, onClick: exportWorksheetHtml }, '📝 ' + TT('studio.export_worksheet_html', 'Worksheet → HTML')),
          h('button', { style: S.tool, onClick: exportWorksheet }, TT('studio.export_worksheet_json', 'Worksheet JSON')),
          h('button', { style: S.tool, onClick: exportProcess }, 'Process notes'),
          h('button', { style: S.tool, onClick: saveToPortfolio, title: TT('studio.portfolio_hint', 'Save a compact, read-only product card to AlloHaven Portfolio') }, TT('studio.save_portfolio', 'Save to Portfolio')),
          altFailures.length ? h('span', { style: { fontSize: '11px', color: errorTone.fg, background: errorTone.bg, border: '1px solid ' + errorTone.border, borderRadius: '8px', padding: '4px 6px', fontWeight: 700 } },
            '♿ ' + altFailures.length + ' ' + TT('studio.alt_gate_msg', 'image(s) need alt text or a decorative mark:'),
            altFailures.map(function (m) {
              return h('button', { key: m.id, style: { marginLeft: '6px', border: '1px solid ' + errorTone.border, background: errorTone.bg, color: errorTone.fg, borderRadius: '6px', fontSize: '10px', cursor: 'pointer', padding: '2px 6px' },
                onClick: function () { openIssueForObject(m.id, TT('studio.a11y_alt_jump', 'Selected image missing alt text — the alt text field is in the right panel.'), 'error'); } }, TT('studio.fix', 'Fix') + ' #' + (m.index + 1));
            })) : h('span', { style: { fontSize: '11px', color: successTone.fg, background: successTone.bg, border: '1px solid ' + successTone.border, borderRadius: '8px', padding: '4px 6px', fontWeight: 700 } }, '♿ ' + TT('studio.alt_gate_ok', 'All images have alt text or are marked decorative — exports are unblocked.'))) : null,
        // body
        h('div', { style: S.body },
          // left: insert tools
          h('div', { style: S.panel },
            h('div', { style: S.label }, TT('studio.insert', 'Insert')),
            h('button', { style: S.tool, onClick: function () { insertText('heading1'); } }, 'H1 ' + TT('studio.insert_heading', 'Heading')),
            h('button', { style: S.tool, onClick: function () { insertText('heading2'); } }, 'H2 ' + TT('studio.insert_subheading', 'Subheading')),
            h('button', { style: S.tool, onClick: function () { insertText('body'); } }, '¶ ' + TT('studio.insert_text', 'Text block')),
            h('button', { style: S.tool, onClick: function () { insertShape('rect'); } }, '▭ ' + TT('studio.insert_rect', 'Rectangle')),
            h('button', { style: S.tool, onClick: function () { insertShape('ellipse'); } }, '◯ ' + TT('studio.insert_ellipse', 'Ellipse')),
            h('button', { style: S.tool, onClick: function () { if (fileRef.current) { fileRef.current.removeAttribute('data-st-replace'); fileRef.current.click(); } } }, '🖼️ ' + TT('studio.insert_image', 'Image…')),
            canGenerateImage ? h('button', { style: Object.assign({}, S.tool, aiGenOpen ? { borderColor: C.accent } : null), 'aria-expanded': aiGenOpen, onClick: function () { setAiGenOpen(!aiGenOpen); } }, '✨ ' + TT('studio.ai_generate_image', 'Generate image…')) : null,
            (canGenerateImage && aiGenOpen) ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px', padding: '6px', border: '1px solid ' + C.border, borderRadius: '8px', background: C.panelAlt } },
              h('textarea', { value: aiGenPrompt, rows: 2, placeholder: TT('studio.ai_prompt_placeholder', 'e.g. a friendly cartoon water droplet'), 'aria-label': TT('studio.ai_prompt_label', 'Describe the image to generate'), style: Object.assign({}, S.input, { resize: 'vertical' }), disabled: aiBusy === 'generate',
                onKeyDown: function (e) { e.stopPropagation(); }, onChange: function (e) { setAiGenPrompt(e.target.value); } }),
              h('button', { style: Object.assign({}, S.tool, { background: '#2563eb', color: '#fff', borderColor: '#1e3a8a', opacity: (aiBusy === 'generate' || !String(aiGenPrompt).trim()) ? 0.6 : 1 }), disabled: aiBusy === 'generate' || !String(aiGenPrompt).trim(), onClick: runGenerateImage }, aiBusy === 'generate' ? '… ' + TT('studio.ai_generating', 'Generating…') : '✨ ' + TT('studio.ai_generate', 'Generate')),
              h('p', { style: { fontSize: '9px', color: C.soft, margin: 0 } }, TT('studio.ai_gen_note', 'Logged as AI in your process. You still add alt text.'))) : null,
            canAgentEdit ? h('button', { style: Object.assign({}, S.tool, agentOpen ? { borderColor: C.accent, background: C.selectedBg } : null), 'aria-expanded': agentOpen, onClick: function () { setAgentOpen(!agentOpen); } }, TT('studio.agent_edit', 'Ask AI to edit')) : null,
            (canAgentEdit && agentOpen) ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px', padding: '6px', border: '1px solid ' + C.border, borderRadius: '8px', background: C.panelAlt } },
              h('label', { style: { fontSize: '10px', color: C.muted, display: 'flex', flexDirection: 'column', gap: '2px' } }, TT('studio.agent_scope', 'Scope'),
                h('select', { value: agentEffectiveScope, style: S.input, 'aria-label': TT('studio.agent_scope', 'Scope'),
                  onChange: function (e) { setAgentScope(e.target.value); setAgentPlan(null); setAgentSelectedOps([]); } },
                  h('option', { value: 'selection', disabled: !selectionIds.length }, TT('studio.agent_scope_selection', 'Selected objects') + (selectionIds.length ? ' (' + selectionIds.length + ')' : '')),
                  h('option', { value: 'document' }, TT('studio.agent_scope_document', 'Whole document')))),
              h('textarea', { value: agentPrompt, rows: 3, placeholder: TT('studio.agent_prompt_placeholder', 'e.g. make this section clearer and easier to read'), 'aria-label': TT('studio.agent_prompt_label', 'Describe the edit to preview'), style: Object.assign({}, S.input, { resize: 'vertical' }), disabled: aiBusy === 'agent',
                onKeyDown: function (e) { e.stopPropagation(); }, onChange: function (e) { setAgentPrompt(e.target.value); setAgentPlan(null); setAgentSelectedOps([]); } }),
              h('button', { style: Object.assign({}, S.tool, { background: '#2563eb', color: '#fff', borderColor: '#1e3a8a', opacity: (aiBusy === 'agent' || !String(agentPrompt).trim()) ? 0.6 : 1 }), disabled: aiBusy === 'agent' || !String(agentPrompt).trim(), onClick: runAgentEdit }, aiBusy === 'agent' ? TT('studio.agent_thinking', 'Preparing…') : TT('studio.agent_preview', 'Preview changes')),
              agentPlan ? h('div', { style: { border: '1px solid ' + C.border, borderRadius: '8px', background: C.panel, padding: '7px', color: C.text, fontSize: '11px', lineHeight: 1.35 } },
                h('strong', { style: { display: 'block', marginBottom: '4px' } }, agentPlan.summary),
                h('div', { style: { color: C.muted } }, selectedAgentCount + ' / ' + agentPlan.ops.length + ' ' + TT('studio.agent_safe_changes', 'safe change(s)') + (agentPlan.rejected.length ? ' - ' + agentPlan.rejected.length + ' ' + TT('studio.agent_skipped_changes', 'skipped') : '')),
                h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginTop: '6px' } },
                  h('button', { style: Object.assign({}, S.tool, { textAlign: 'center', padding: '5px 6px', fontSize: '10.5px' }), disabled: !agentPlan.ops.length, onClick: function () { setAgentSelectedOps(agentPlan.ops.map(function (_, idx) { return idx; })); } }, TT('studio.select_all', 'Select all')),
                  h('button', { style: Object.assign({}, S.tool, { textAlign: 'center', padding: '5px 6px', fontSize: '10.5px' }), disabled: !agentPlan.ops.length, onClick: function () { setAgentSelectedOps([]); } }, TT('studio.select_none', 'Select none'))),
                agentChangeItems.length ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '230px', overflowY: 'auto', marginTop: '7px' } },
                  agentChangeItems.map(function (info, idx) {
                    var checked = !!agentSelectedSet[idx];
                    var tone = checked ? statusTone('review') : { bg: C.panelAlt, fg: C.muted, border: C.border };
                    return h('div', { key: idx, style: { border: '1px solid ' + tone.border, background: tone.bg, color: tone.fg, borderRadius: '8px', padding: '6px' } },
                      h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } },
                        h('label', { style: { display: 'flex', alignItems: 'center', gap: '5px', flex: 1, minWidth: 0, fontWeight: 800 } },
                          h('input', { type: 'checkbox', checked: checked, 'aria-label': TT('studio.agent_include_change', 'Include change') + ' ' + (idx + 1),
                            onChange: function (e) {
                              var want = e.target.checked;
                              setAgentSelectedOps(function (prev) {
                                var list = Array.isArray(prev) ? prev.slice() : [];
                                var at = list.indexOf(idx);
                                if (want && at < 0) list.push(idx);
                                if (!want && at >= 0) list.splice(at, 1);
                                return list.sort(function (a, b) { return a - b; });
                              });
                            } }),
                          h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, info.title)),
                        h('button', { style: Object.assign({}, S.tool, { padding: '4px 6px', minHeight: '24px', fontSize: '10px', opacity: info.targetId ? 1 : 0.45 }), disabled: !info.targetId, onClick: function () { if (info.targetId) selectOnly(info.targetId); } }, TT('studio.show', 'Show'))),
                      h('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '5px' } },
                        info.notes.slice(0, 4).map(function (note, noteIdx) {
                          return h('span', { key: noteIdx, style: { border: '1px solid ' + tone.border, borderRadius: '999px', padding: '1px 6px', fontSize: '9.5px', fontWeight: 800 } }, note);
                        })),
                      (info.before || info.after) ? h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginTop: '5px' } },
                        h('div', { style: { border: '1px solid ' + C.border, borderRadius: '6px', padding: '4px', background: C.panel, color: C.muted, minWidth: 0 } },
                          h('strong', { style: { display: 'block', fontSize: '9px', textTransform: 'uppercase' } }, TT('studio.before', 'Before')),
                          h('span', { style: { overflowWrap: 'anywhere' } }, info.before || '-')),
                        h('div', { style: { border: '1px solid ' + C.border, borderRadius: '6px', padding: '4px', background: C.panel, color: C.text, minWidth: 0 } },
                          h('strong', { style: { display: 'block', fontSize: '9px', textTransform: 'uppercase' } }, TT('studio.after', 'After')),
                          h('span', { style: { overflowWrap: 'anywhere' } }, info.after || '-'))) : null,
                      h('div', { style: { marginTop: '4px', fontSize: '9.5px', color: C.soft } }, info.kind + ' - ' + info.safety));
                  })) : null,
                agentPlan.rejected && agentPlan.rejected.length ? h('details', { style: { marginTop: '6px', color: C.muted } },
                  h('summary', { style: { cursor: 'pointer', fontWeight: 800 } }, TT('studio.agent_skipped_changes', 'Skipped') + ' ' + agentPlan.rejected.length),
                  h('ul', { style: { margin: '4px 0 0 16px', padding: 0 } }, agentPlan.rejected.slice(0, 8).map(function (msg, idx) { return h('li', { key: idx }, msg); }))) : null,
                h('button', { style: Object.assign({}, S.tool, { textAlign: 'center', width: '100%', marginTop: '6px', opacity: (!selectedAgentCount || aiBusy) ? 0.6 : 1 }), disabled: !selectedAgentCount || !!aiBusy, onClick: runPlanPreview, title: TT('studio.preview_hint', 'Renders the page before and after the selected changes — nothing is applied yet') }, aiBusy === 'plan-preview' ? '… ' + TT('studio.previewing', 'Rendering…') : '🖼 ' + TT('studio.preview_result', 'Preview result')),
                agentPreview ? h('div', null,
                  h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginTop: '6px' } },
                    h('figure', { style: { margin: 0 } },
                      h('figcaption', { style: { fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color: C.muted } }, TT('studio.before', 'Before')),
                      h('img', { src: agentPreview.before, alt: TT('studio.preview_before_alt', 'Rendered page before the AI changes'), style: { width: '100%', border: '1px solid ' + C.border, borderRadius: '6px', background: '#ffffff' } })),
                    h('figure', { style: { margin: 0 } },
                      h('figcaption', { style: { fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color: C.muted } }, TT('studio.after', 'After')),
                      h('img', { src: agentPreview.after, alt: TT('studio.preview_after_alt', 'Rendered page after the AI changes'), style: { width: '100%', border: '1px solid ' + C.border, borderRadius: '6px', background: '#ffffff' } }))),
                  agentPlan.ops.some(function (op) { return op && op.type === 'image.request'; }) ? h('p', { style: { margin: '3px 0 0', fontSize: '9px', color: C.soft } }, TT('studio.preview_images_note', 'Requested images are not in the preview — they generate when you apply.')) : null) : null,
                h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginTop: '7px' } },
                  h('button', { style: Object.assign({}, S.tool, { textAlign: 'center', opacity: (!selectedAgentCount || aiBusy) ? 0.6 : 1 }), disabled: !selectedAgentCount || !!aiBusy, onClick: applyAgentPlan }, aiBusy === 'agent-apply' ? '… ' + TT('studio.agent_applying', 'Applying…') : TT('studio.apply_selected', 'Apply selected')),
                  h('button', { style: Object.assign({}, S.tool, { textAlign: 'center' }), disabled: aiBusy === 'agent-apply', onClick: function () { setAgentPlan(null); setAgentSelectedOps([]); setAgentFollowUp(''); clearAgentPreview(); } }, TT('studio.discard', 'Discard'))),
                h('div', { style: { marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' } },
                  h('textarea', { value: agentFollowUp, rows: 2, placeholder: TT('studio.agent_refine_placeholder', 'Adjust this proposal, e.g. keep the heading where it is'), 'aria-label': TT('studio.agent_refine_label', 'Describe an adjustment to the proposal'), style: Object.assign({}, S.input, { resize: 'vertical' }), disabled: !!aiBusy,
                    onKeyDown: function (e) { e.stopPropagation(); }, onChange: function (e) { setAgentFollowUp(e.target.value); } }),
                  h('button', { style: Object.assign({}, S.tool, { textAlign: 'center', opacity: (aiBusy || !String(agentFollowUp).trim()) ? 0.6 : 1 }), disabled: !!aiBusy || !String(agentFollowUp).trim(), onClick: runAgentRefine, title: TT('studio.agent_refine_hint', 'Asks the AI again with your adjustment and the current proposal as context') }, aiBusy === 'agent' ? TT('studio.agent_thinking', 'Preparing…') : '↻ ' + TT('studio.agent_refine', 'Refine proposal')))) : null,
              lastAgentBatch ? h('button', { style: Object.assign({}, S.tool, { width: '100%' }), onClick: undoAgentBatch, title: TT('studio.agent_undo_batch_hint', 'Reverts every change from the last applied AI batch in one step') }, '↩ ' + TT('studio.agent_undo_batch', 'Undo AI changes') + ' (' + lastAgentBatch.count + ')') : null,
              h('p', { style: { fontSize: '9px', color: C.soft, margin: 0 } }, TT('studio.agent_note', 'Preview first. Applied changes are logged as AI.'))) : null,
            h('button', { style: Object.assign({}, S.tool, resourceOpen ? { borderColor: C.accent, background: C.selectedBg } : null), 'aria-expanded': resourceOpen, onClick: function () { setResourceOpen(!resourceOpen); } },
              TT('studio.resource_shelf', 'Source shelf') + ' ' + resourceCues.length),
            resourceOpen ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px', padding: '6px', border: '1px solid ' + C.border, borderRadius: '8px', background: C.panelAlt } },
              h('input', { type: 'search', value: resourceSearch, placeholder: TT('studio.resource_search', 'Search source history'), 'aria-label': TT('studio.resource_search', 'Search source history'), style: S.input,
                onKeyDown: function (e) { e.stopPropagation(); },
                onChange: function (e) { setResourceSearch(e.target.value); } }),
              visibleResourceCues.length ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '230px', overflowY: 'auto' } },
                visibleResourceCues.slice(0, 18).map(function (cue) {
                  return h('div', { key: cue.id, style: { border: '1px solid ' + C.border, borderRadius: '8px', background: C.panel, padding: '7px', color: C.text } },
                    h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: '6px', alignItems: 'baseline' } },
                      h('strong', { style: { fontSize: '11px', overflowWrap: 'anywhere' } }, cue.label),
                      h('span', { style: { flexShrink: 0, color: C.muted, fontSize: '9px', fontWeight: 800, textTransform: 'uppercase' } }, cue.kind || 'resource')),
                    cue.sourceTitle ? h('div', { style: { color: C.soft, fontSize: '9.5px', marginTop: '2px' } }, cue.sourceTitle) : null,
                    cue.text ? h('p', { style: { margin: '4px 0 6px', color: C.muted, fontSize: '10.5px', lineHeight: 1.35 } }, cue.text.slice(0, 150) + (cue.text.length > 150 ? '...' : '')) : null,
                    h('button', { style: Object.assign({}, S.tool, { width: '100%', textAlign: 'center', padding: '6px 8px' }), onClick: function () { insertResourceCue(cue); } }, TT('studio.insert_resource', 'Insert')));
                })) : h('p', { style: { color: C.muted, fontSize: '10.5px', lineHeight: 1.35, margin: 0 } },
                resourceCues.length ? TT('studio.no_resource_matches', 'No matching resources found.') : TT('studio.no_resources', 'No source history resources are available yet.'))) : null,
            h('div', { style: S.label }, TT('studio.style_kits', 'Style kits')),
            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }, role: 'group', 'aria-label': TT('studio.style_kits', 'Style kits') },
              stStyleKits(brandProfile).map(function (kit) {
                return h('button', { key: kit.key, style: Object.assign({}, S.tool, { padding: '6px', minHeight: '54px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '4px' }), onClick: function () { applyStyleKit(kit.key); }, title: kit.name },
                  h('span', { style: { display: 'flex', gap: '3px', alignItems: 'center' }, 'aria-hidden': true },
                    h('span', { style: { width: '16px', height: '14px', borderRadius: '3px', border: '1px solid ' + C.border, background: kit.background } }),
                    h('span', { style: { width: '16px', height: '14px', borderRadius: '3px', border: '1px solid ' + C.border, background: kit.heading } }),
                    h('span', { style: { width: '16px', height: '14px', borderRadius: '3px', border: '1px solid ' + C.border, background: kit.shape } })),
                  h('span', { style: { fontSize: '10.5px', lineHeight: 1.15, color: C.text } }, kit.name));
              })),
            h('div', { style: S.label }, TT('studio.page', 'Page')),
            h('label', { style: { fontSize: '10px', color: C.muted } }, TT('studio.canvas_size', 'Page size'),
              h('select', { value: ST_CANVAS_PRESETS[doc.canvas.preset] ? doc.canvas.preset : 'custom', style: S.input, 'aria-label': TT('studio.canvas_size', 'Page size'),
                onChange: function (e) { var pk = e.target.value; if (!ST_CANVAS_PRESETS[pk]) return; dispatch({ type: 'canvas.resize', preset: pk }, 'user'); stAnnounce(TT('studio.a11y_resized', 'Page size changed — objects re-fit to the page')); } },
                h('option', { value: 'letter-portrait' }, TT('studio.orient_portrait', 'Portrait') + ' (8.5×11)'),
                h('option', { value: 'letter-landscape' }, TT('studio.orient_landscape', 'Landscape') + ' (11×8.5)'),
                h('option', { value: 'square' }, TT('studio.orient_square', 'Square')),
                ST_CANVAS_PRESETS[doc.canvas.preset] ? null : h('option', { value: 'custom', disabled: true }, TT('studio.orient_custom', 'Custom')))),
            colorField(TT('studio.background', 'Background'), (doc.canvas.background && doc.canvas.background.fill) || '#ffffff', function (hex) { dispatch({ type: 'canvas.background', fill: hex }, 'user'); }),
            h('p', { style: { fontSize: '10px', color: C.soft, marginTop: 'auto' } }, TT('studio.keyboard_hint', 'Tip: Shift/Ctrl-click selects a group. Tab focuses objects; arrows move, Shift+arrows resize, Delete removes.'))),
          // center: canvas
          h('div', { style: S.canvasWrap },
            h('div', { style: S.canvasToolbar, role: 'group', 'aria-label': TT('studio.zoom_controls', 'Canvas zoom controls') },
              h('button', { style: S.hBtn, onClick: function () { changeCanvasZoom('out'); }, 'aria-label': TT('studio.zoom_out', 'Zoom out') }, '-'),
              h('span', { role: 'status', 'aria-live': 'polite', style: { minWidth: '48px', textAlign: 'center', fontSize: '12px', fontWeight: 800, color: C.text } }, zoomLabel),
              h('button', { style: S.hBtn, onClick: function () { changeCanvasZoom('in'); }, 'aria-label': TT('studio.zoom_in', 'Zoom in') }, '+'),
              h('button', { style: Object.assign({}, S.hBtn, canvasZoom === null ? { borderColor: C.accent, background: C.selectedBg, color: C.text } : null), onClick: function () { changeCanvasZoom('fit'); }, 'aria-pressed': canvasZoom === null }, TT('studio.zoom_fit', 'Fit')),
              h('button', { style: Object.assign({}, S.hBtn, canvasZoom === 1 ? { borderColor: C.accent, background: C.selectedBg, color: C.text } : null), onClick: function () { changeCanvasZoom('actual'); }, 'aria-pressed': canvasZoom === 1 }, '100%'),
              h('button', { style: Object.assign({}, S.hBtn, snapEnabled ? { borderColor: C.accent, background: C.selectedBg, color: C.text } : null), onClick: function () { setSnapEnabled(!snapEnabled); setSnapGuides([]); }, 'aria-pressed': snapEnabled, title: TT('studio.snap_guides_hint', 'Snap dragged objects to margins, centers, and nearby objects') }, TT('studio.snap_guides', 'Snap'))),
            h('div', { style: S.canvasViewport, onPointerDown: clearSelection },
              h('div', { style: Object.assign({}, S.canvasPage, { width: doc.canvas.w * SCALE + 'px', height: doc.canvas.h * SCALE + 'px', background: (doc.canvas.background && doc.canvas.background.fill) || '#fff' }),
                onPointerDown: function (e) { e.stopPropagation(); clearSelection(); },
                onPointerMove: onCanvasPointerMove, onPointerUp: onCanvasPointerUp },
                snapGuides.map(function (guide, idx) {
                  return h('div', { key: 'snap-' + idx, 'aria-hidden': true, style: guide.axis === 'x'
                    ? { position: 'absolute', left: guide.value * SCALE + 'px', top: 0, width: 0, height: '100%', borderLeft: '2px dashed ' + snapGuideColor, zIndex: 9999, pointerEvents: 'none' }
                    : { position: 'absolute', left: 0, top: guide.value * SCALE + 'px', width: '100%', height: 0, borderTop: '2px dashed ' + snapGuideColor, zIndex: 9999, pointerEvents: 'none' } });
                }),
                doc.objects.map(function (o) { return renderObject(o, SCALE, true, {}, h); })))),
          // right: reading order + properties
          h('div', { style: S.rpanel },
            h('div', { style: S.label }, '🔊 ' + TT('studio.reading_order', 'Reading order (what screen readers follow)')),
            h('div', { role: 'group', 'aria-label': TT('studio.object_navigator', 'Object navigator'), style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' } },
              h('button', { style: Object.assign({}, S.tool, { textAlign: 'center', padding: '6px 4px', fontSize: '10.5px' }, navigatorMode === 'reading' ? { borderColor: C.accent, background: C.selectedBg } : null), 'aria-pressed': navigatorMode === 'reading', onClick: function () { setNavigatorMode('reading'); } }, TT('studio.reading_order_short', 'Reading order')),
              h('button', { style: Object.assign({}, S.tool, { textAlign: 'center', padding: '6px 4px', fontSize: '10.5px' }, navigatorMode === 'layers' ? { borderColor: C.accent, background: C.selectedBg } : null), 'aria-pressed': navigatorMode === 'layers', onClick: function () { setNavigatorMode('layers'); } }, TT('studio.layers', 'Layers'))),
            h('div', { style: { fontSize: '10px', color: C.soft, lineHeight: 1.3 } }, navigatorMode === 'layers' ? TT('studio.layers_hint', 'Visual stack only. Reading order stays in the other tab.') : TT('studio.reading_order_hint', 'This is what screen readers and tagged PDF follow.')),
            readingOrderAssistant,
            h('div', { style: S.readingList }, navigatorMode === 'layers' ? layerList : orderList),
            propPanel || h('p', { style: { fontSize: '11px', color: C.soft } }, TT('studio.no_selection', 'Select an object on the canvas (or in the list above) to edit its properties.')))),
        h('input', { ref: fileRef, type: 'file', accept: 'image/*', style: { display: 'none' },
          onChange: function (ev) {
            var replaceId = ev.target.getAttribute('data-st-replace');
            if (!replaceId) { onPickImage(ev); return; }
            var f2 = ev.target.files && ev.target.files[0];
            ev.target.value = '';
            if (!f2) return;
            var r2 = new FileReader();
            r2.onload = function (e2) {
              stImportImageDataUrl(e2.target.result, 1600).then(function (src2) {
                if (!src2) { addToast(TT('studio.image_import_failed', 'That file could not be imported as an image.'), 'error'); return; }
                var liveReplace = _docRef.current && _docRef.current.objects ? _docRef.current.objects.filter(function (o) { return o && o.id === replaceId; })[0] : null;
                var beforeReplaceImage = stAnalyzeDoc(_docRef.current);
                dispatch({ type: 'object.update', target: replaceId, patch: stUploadedImagePatch(liveReplace, src2) }, 'import');
                advancePreflightGuideAfter({ type: 'replace-image', targetId: replaceId, issueType: 'empty-image' }, beforeReplaceImage);
              });
            };
            r2.readAsDataURL(f2);
          } }),
        h('input', { ref: loadRef, type: 'file', accept: '.json,application/json', style: { display: 'none' }, onChange: onLoadFile }),
        // ── crop modal (position:fixed, overlays the studio) ──
        cropId ? (function () {
          var co = doc.objects.filter(function (x) { return x.id === cropId; })[0];
          if (!co || !co.src) return null;
          var r = cropRect || { x: 0, y: 0, w: 0, h: 0 };
          return h('div', { ref: _cropDialogRef, tabIndex: -1, style: { position: 'fixed', inset: 0, zIndex: 9500, background: 'rgba(2,6,23,0.82)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }, role: 'dialog', 'aria-modal': true, 'aria-label': TT('studio.crop_title', 'Crop image'),
            onKeyDown: function (e) { e.stopPropagation(); if (e.key === 'Escape') { e.preventDefault(); setCropId(null); setCropRect(null); return; } trapTabWithin(_cropDialogRef.current, e); } },
            h('div', { style: { color: '#fff', fontSize: '13px', fontWeight: 700, marginBottom: '8px', maxWidth: '80vw', textAlign: 'center' } }, '✂ ' + TT('studio.crop_drag', 'Drag on the image to choose the area to keep.'),
              h('div', { style: { fontSize: '11px', fontWeight: 400, color: '#fca5a5', marginTop: '2px' } }, TT('studio.crop_permanent', 'The trimmed-away pixels are permanently removed — including from your saved file.'))),
            h('div', { style: { position: 'relative', maxWidth: '80vw', maxHeight: '68vh', touchAction: 'none' }, onPointerMove: cropPointerMove, onPointerUp: cropPointerUp },
              h('img', { ref: _cropImgRef, src: co.src, alt: co.alt || TT('studio.crop_preview_alt', 'Image being cropped'), draggable: false, style: { display: 'block', maxWidth: '80vw', maxHeight: '68vh', userSelect: 'none', cursor: 'crosshair' }, onPointerDown: cropPointerDown }),
              (r.w > 0 && r.h > 0) ? h('div', { style: { position: 'absolute', left: (r.x * 100) + '%', top: (r.y * 100) + '%', width: (r.w * 100) + '%', height: (r.h * 100) + '%', border: '2px solid #6366f1', boxShadow: '0 0 0 9999px rgba(2,6,23,0.55)', pointerEvents: 'none' } }) : null),
            h('div', { role: 'status', 'aria-live': 'polite', style: { color: '#fff', fontSize: '11px', fontWeight: 700, marginTop: '8px', textAlign: 'center' } }, cropSummary(cropRect)),
            h('div', { role: 'group', 'aria-label': TT('studio.crop_presets', 'Crop presets'), style: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(72px, 1fr))', gap: '6px', marginTop: '8px', maxWidth: '80vw' } },
              [['full', 'Full'], ['center', 'Center'], ['square', 'Square'], ['top', 'Top'], ['bottom', 'Bottom'], ['left', 'Left'], ['right', 'Right']].map(function (opt) {
                return h('button', { key: 'preset-' + opt[0], style: Object.assign({}, S.hBtn, { padding: '5px 8px' }), onClick: function () { setCropPreset(opt[0]); }, 'aria-label': TT('studio.crop_preset', 'Crop preset') + ': ' + opt[1] }, opt[1]);
              })),
            h('div', { role: 'group', 'aria-label': TT('studio.crop_adjustments', 'Crop adjustments'), style: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(72px, 1fr))', gap: '6px', marginTop: '8px', maxWidth: '80vw' } },
              [['left', 'Nudge L'], ['right', 'Nudge R'], ['up', 'Nudge U'], ['down', 'Nudge D'], ['wider', 'Wider'], ['narrower', 'Narrower'], ['taller', 'Taller'], ['shorter', 'Shorter']].map(function (opt) {
                return h('button', { key: 'adjust-' + opt[0], style: Object.assign({}, S.hBtn, { padding: '5px 8px' }), onClick: function () { adjustCrop(opt[0]); }, 'aria-label': TT('studio.crop_adjust', 'Adjust crop') + ': ' + opt[1] }, opt[1]);
              })),
            h('div', { style: { display: 'flex', gap: '8px', marginTop: '12px' } },
              h('button', { style: Object.assign({}, S.hBtn, { background: '#2563eb', borderColor: '#1e3a8a', color: '#fff' }), onClick: applyCrop }, '✂ ' + TT('studio.crop_apply', 'Apply crop')),
              h('button', { style: S.hBtn, onClick: function () { setCropId(null); setCropRect(null); } }, TT('studio.cancel', 'Cancel'))));
        })() : null));
  }

  // ── registration + pure helpers for tests ──
  window.AlloModules = window.AlloModules || {};
  AlloStudio.stCreateDoc = stCreateDoc;
  AlloStudio.stApplyOp = stApplyOp;
  AlloStudio.stAppend = stAppend;
  AlloStudio.stAppendGesture = stAppendGesture;
  AlloStudio.stUndo = stUndo;
  AlloStudio.stRedo = stRedo;
  AlloStudio.stReplay = stReplay;
  AlloStudio.stReplayCanonical = stReplayCanonical;
  AlloStudio.stCanonicalizeDoc = stCanonicalizeDoc;
  AlloStudio.stActorSummary = stActorSummary;
  AlloStudio.stAltGate = stAltGate;
  AlloStudio.stValidateDoc = stValidateDoc;
  AlloStudio.stDescribeOp = stDescribeOp;
  AlloStudio.stTemplates = stTemplates;
  AlloStudio.stExportHtml = stExportHtml;
  AlloStudio.stEscapeHtml = stEscapeHtml;
  AlloStudio.stIsSafeDataImage = stIsSafeDataImage;
  AlloStudio.stClampFrame = stClampFrame;
  AlloStudio.stAlignFrame = stAlignFrame;
  AlloStudio.stAnalyzeDoc = stAnalyzeDoc;
  AlloStudio.stContrastRatio = stContrastRatio;
  AlloStudio.stExportWorksheetData = stExportWorksheetData;
  AlloStudio.stExportWorksheetHtml = stExportWorksheetHtml;
  AlloStudio.stCropBox = stCropBox;
  AlloStudio.stScrubObjectSrc = stScrubObjectSrc;
  AlloStudio.stExportProcessMarkdown = stExportProcessMarkdown;
  AlloStudio.stBuildResourceCues = stBuildResourceCues;
  AlloStudio.stObjectsFromResourceCue = stObjectsFromResourceCue;
  AlloStudio.stSuggestTextColor = stSuggestTextColor;
  AlloStudio.stBuildReadyActions = stBuildReadyActions;
  AlloStudio.stObjectReadyActions = stObjectReadyActions;
  AlloStudio.stBuildAccessibilityChecklist = stBuildAccessibilityChecklist;
  AlloStudio.stObjectIssueSummary = stObjectIssueSummary;
  AlloStudio.stBuildA11yAutoFixPlan = stBuildA11yAutoFixPlan;
  AlloStudio.stIsKeptPlaceholder = stIsKeptPlaceholder;
  AlloStudio.stKeepPlaceholderPatch = stKeepPlaceholderPatch;
  AlloStudio.stUploadedImagePatch = stUploadedImagePatch;
  AlloStudio.stImageFrameState = stImageFrameState;
  AlloStudio.stPreflightGuide = stPreflightGuide;
  AlloStudio.stFilterPreflightIssues = stFilterPreflightIssues;
  AlloStudio.stExportConfidence = stExportConfidence;
  AlloStudio.stProcessStepGroups = stProcessStepGroups;
  AlloStudio.stIssueIndexForObject = stIssueIndexForObject;
  AlloStudio.stNextPreflightGuideIndex = stNextPreflightGuideIndex;
  AlloStudio.stFilteredProcessStepGroups = stFilteredProcessStepGroups;
  AlloStudio.stStyleKits = stStyleKits;
  AlloStudio.stStyleKitPatch = stStyleKitPatch;
  AlloStudio.stLayerItems = stLayerItems;
  AlloStudio.stReadingOrderSuggestion = stReadingOrderSuggestion;
  AlloStudio.stSelectionBounds = stSelectionBounds;
  AlloStudio.stAlignFramesAsGroup = stAlignFramesAsGroup;
  AlloStudio.stDistributeFramesAsGroup = stDistributeFramesAsGroup;
  AlloStudio.stMoveFramesAsGroup = stMoveFramesAsGroup;
  AlloStudio.stStudioLayout = stStudioLayout;
  AlloStudio.stCanvasFitScale = stCanvasFitScale;
  AlloStudio.stAdjustCanvasZoom = stAdjustCanvasZoom;
  AlloStudio.stShortcutList = stShortcutList;
  AlloStudio.stSwatchPalette = stSwatchPalette;
  AlloStudio.stHexNorm = stHexNorm;
  AlloStudio.stSnapFrame = stSnapFrame;
  AlloStudio.stBuildAgentScope = stBuildAgentScope;
  AlloStudio.stNormalizeAgentPlan = stNormalizeAgentPlan;
  AlloStudio.stDescribeAgentChange = stDescribeAgentChange;
  AlloStudio.stSanitizeAgentAdd = stSanitizeAgentAdd;
  AlloStudio.stLastAgentBatch = stLastAgentBatch;
  AlloStudio.stUndoAgentBatch = stUndoAgentBatch;
  AlloStudio.stPreflightDelta = stPreflightDelta;
  AlloStudio.stBrandStyleKit = stBrandStyleKit;
  AlloStudio.stSafeFontFamily = stSafeFontFamily;
  AlloStudio.ST_FONT_STACKS = ST_FONT_STACKS;
  AlloStudio.stDownscaleDims = stDownscaleDims;
  AlloStudio.stImageWeightInfo = stImageWeightInfo;
  AlloStudio.stOptimizedImagePatch = stOptimizedImagePatch;
  AlloStudio.stPreviewScene = stPreviewScene;
  AlloStudio.stPrintCss = stPrintCss;
  AlloStudio.stDurableDoc = stDurableDoc;
  AlloStudio.stAutosavePayload = stAutosavePayload;
  AlloStudio.stAutosaveValid = stAutosaveValid;
  AlloStudio.stReadAutosave = stReadAutosave;
  AlloStudio.stWriteAutosave = stWriteAutosave;
  AlloStudio.stClearAutosave = stClearAutosave;
  AlloStudio.stUiStatusTone = stUiStatusTone;
  AlloStudio.stCropPresetRect = stCropPresetRect;
  AlloStudio.stAdjustCropRect = stAdjustCropRect;
  AlloStudio.stBuildPortfolioArtifact = stBuildPortfolioArtifact;
  AlloStudio.stRecentProjectSummary = stRecentProjectSummary;
  AlloStudio.stReadRecentProjects = stReadRecentProjects;
  AlloStudio.stSaveRecentProject = stSaveRecentProject;
  AlloStudio.stSavePortfolioArtifact = stSavePortfolioArtifact;
  AlloStudio.ST_HONESTY_LINE = ST_HONESTY_LINE;
  AlloStudio.ST_CANVAS_PRESETS = ST_CANVAS_PRESETS;
  AlloStudio.ST_CHECKPOINT_EVERY = ST_CHECKPOINT_EVERY;
  window.AlloModules.AlloStudio = AlloStudio;
})();
