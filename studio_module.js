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
//            onSuggestAlt(dataUrl) -> Promise<string> }      // optional (Milestone B AI)
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
  var ST_ACTORS = { user: true, ai: true, import: true };
  // Verbatim UI honesty line (doc §5) — pinned by tests; do not soften or reword
  // into an "AI detection" claim.
  var ST_HONESTY_LINE = 'This timeline shows what happened inside this editor. It does not detect AI content in imported images.';
  var ST_CANVAS_PRESETS = {
    'letter-portrait': { w: 816, h: 1056 },
    'letter-landscape': { w: 1056, h: 816 },
    'square': { w: 900, h: 900 },
  };

  function stClone(v) { return JSON.parse(JSON.stringify(v)); }
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

  // Undo/redo = ledger navigation. Undo pops the last op onto the redo stack and
  // recomputes the scene by replay; redo re-appends the SAME op object (its seq
  // and ts are preserved — the op happened once; navigation doesn't re-stamp it).
  function stUndo(doc) {
    if (!doc.ledger.ops.length) return false;
    var op = doc.ledger.ops.pop();
    doc._redo.push(op);
    var lastSeq = doc.ledger.ops.length ? doc.ledger.ops[doc.ledger.ops.length - 1].seq : 0;
    doc.ledger.checkpoints = doc.ledger.checkpoints.filter(function (c) { return c.atSeq <= lastSeq; });
    var scene = stReplay(doc, lastSeq);
    doc.title = scene.title; doc.canvas = scene.canvas; doc.objects = scene.objects;
    return true;
  }
  function stRedo(doc) {
    if (!doc._redo.length) return false;
    var op = doc._redo.pop();
    doc.ledger.ops.push(op);
    var next = stApplyOp({ title: doc.title, canvas: doc.canvas, objects: doc.objects }, op);
    doc.title = next.title; doc.canvas = next.canvas; doc.objects = next.objects;
    if (op.seq % ST_CHECKPOINT_EVERY === 0) {
      doc.ledger.checkpoints.push({ atSeq: op.seq, title: doc.title, canvas: stClone(doc.canvas), objects: stClone(doc.objects) });
    }
    return true;
  }

  // Reconstruct the scene at seq ≤ toSeq: seek the nearest checkpoint, then apply
  // the ops after it. stReplay(doc, lastSeq) === the live scene — pinned by tests.
  function stReplay(doc, toSeq) {
    // Canvas SIZE at creation is the base; canvas.resize ops re-establish it
    // during replay (mirrors _baseTitle). Older saves without _baseCanvas fall
    // back to the current canvas — they carry no resize ops, so it is exact.
    var bc = doc._baseCanvas && stIsFiniteNumber(doc._baseCanvas.w) && stIsFiniteNumber(doc._baseCanvas.h) ? doc._baseCanvas : doc.canvas;
    var base = { title: doc.title, canvas: { preset: bc.preset, w: bc.w, h: bc.h, background: { fill: '#ffffff' } }, objects: [] };
    // The doc's ORIGINAL title/background are recoverable only via ops, so start
    // neutral: retitle/background ops re-establish them during replay. Title at
    // creation is not an op — carry it as the base.
    base.title = doc._baseTitle !== undefined ? doc._baseTitle : doc.title;
    var start = base;
    var fromSeq = 0;
    for (var i = doc.ledger.checkpoints.length - 1; i >= 0; i--) {
      var c = doc.ledger.checkpoints[i];
      if (c.atSeq <= toSeq) { start = { title: c.title, canvas: stClone(c.canvas), objects: stClone(c.objects) }; fromSeq = c.atSeq; break; }
    }
    var scene = { title: start.title, canvas: start.canvas, objects: start.objects.slice() };
    for (var j = 0; j < doc.ledger.ops.length; j++) {
      var op = doc.ledger.ops[j];
      if (op.seq <= fromSeq) continue;
      if (op.seq > toSeq) break;
      scene = stApplyOp(scene, op);
    }
    return scene;
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
    if (typeof doc.version !== 'number' || doc.version > ST_DOC_VERSION) errs.push('Newer save version (' + doc.version + ') than this build understands (' + ST_DOC_VERSION + ')');
    if (!doc.canvas || !stIsFiniteNumber(doc.canvas.w) || !stIsFiniteNumber(doc.canvas.h) || !(doc.canvas.w > 0) || !(doc.canvas.h > 0)) errs.push('Missing canvas');
    if (!Array.isArray(doc.objects)) {
      errs.push('Missing objects');
    } else {
      doc.objects.forEach(function (o, i) {
        var label = 'Object #' + (i + 1);
        if (!o || typeof o !== 'object') { errs.push(label + ' is malformed'); return; }
        if (!o.id || typeof o.id !== 'string') errs.push(label + ' is missing an id');
        if (o.type !== 'text' && o.type !== 'image' && o.type !== 'shape') errs.push(label + ' has an unknown type');
        if (!stFrameIsFinite(o.frame) || o.frame.w <= 0 || o.frame.h <= 0) errs.push(label + ' has an invalid frame');
        if (o.type === 'text') {
          if (!Array.isArray(o.runs) || !o.runs[0] || typeof o.runs[0].text !== 'string') errs.push(label + ' has invalid text');
        } else if (o.type === 'image') {
          if (o.src != null && typeof o.src !== 'string') errs.push(label + ' has an invalid image source');
          if (o.alt != null && typeof o.alt !== 'string') errs.push(label + ' has invalid alt text');
          if (o.fit != null && o.fit !== 'cover' && o.fit !== 'contain') errs.push(label + ' has an invalid image fit');
        } else if (o.type === 'shape') {
          if (o.shape !== 'rect' && o.shape !== 'ellipse') errs.push(label + ' has an unknown shape');
        }
      });
    }
    if (!doc.ledger || !Array.isArray(doc.ledger.ops)) {
      errs.push('Missing ledger');
    } else {
      doc.ledger.ops.forEach(function (op, i) {
        var label = 'Step #' + (i + 1);
        if (!op || typeof op !== 'object') { errs.push(label + ' is malformed'); return; }
        if (!ST_ACTORS[op.actor]) errs.push(label + ' has an unknown actor');
        if (!stIsFiniteNumber(op.seq)) errs.push(label + ' has an invalid sequence');
        if (typeof op.type !== 'string') errs.push(label + ' has an invalid type');
      });
      if (doc.ledger.checkpoints && !Array.isArray(doc.ledger.checkpoints)) errs.push('Malformed checkpoints');
    }
    return errs;
  }

  function stDescribeOp(op) {
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
      if (p.src) return 'Replaced an image';
      if (Object.prototype.hasOwnProperty.call(p, 'alt')) return 'Updated alt text';
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
        if (!o.src) issues.push({ id: o.id, type: 'empty-image', severity: 'review', title: 'Empty image frame', message: 'Add an image, remove the frame, or keep it as a placeholder while drafting.' });
        else if (String(o.src).length > 1500000) issues.push({ id: o.id, type: 'large-image', severity: 'warning', title: 'Large image', message: 'This image may make the save file and exports heavy.' });
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
    return { type: 'image', src: src || '', alt: alt || '', decorative: false, frame: frame, z: 5, fit: 'cover',
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
        var style = pos + 'font-size:' + size + 'px;color:' + stSafeCssColor(s.color, '#111827') + ';font-weight:' + (s.bold ? '700' : '400') + ';text-align:' + stSafeAlign(s.align) + ';white-space:pre-wrap;line-height:1.25;font-family:system-ui,sans-serif;overflow-wrap:break-word;';
        parts.push('<' + tag + ' style="' + style + '">' + stEscapeHtml(run.text) + '</' + tag + '>');
      } else if (o.type === 'image') {
        if (!o.src) continue; // empty frame — nothing to show OR announce
        var fit = o.fit === 'contain' ? 'contain' : 'cover';
        if (o.decorative) {
          parts.push('<img src="' + stEscapeHtml(o.src) + '" alt="" role="presentation" style="' + pos + 'object-fit:' + fit + ';">');
        } else {
          parts.push('<img src="' + stEscapeHtml(o.src) + '" alt="' + stEscapeHtml(o.alt) + '" style="' + pos + 'object-fit:' + fit + ';">');
        }
      } else if (o.type === 'shape') {
        var radius = stSafeShape(o.shape) === 'ellipse' ? 'border-radius:50%;' : 'border-radius:8px;';
        parts.push('<div aria-hidden="true" style="' + pos + 'background:' + stSafeCssColor(o.fill, '#e2e8f0') + ';' + radius + '"></div>');
      }
    }
    return '<!DOCTYPE html>\n<html lang="' + stEscapeHtml(lang) + '">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>' + stEscapeHtml(doc.title) + '</title>\n<style>\n  body { margin: 0; background: #f1f5f9; font-family: system-ui, sans-serif; }\n  .st-page { position: relative; width: ' + canvas.w + 'px; height: ' + canvas.h + 'px; background: ' + canvas.background.fill + '; margin: 24px auto; box-shadow: 0 2px 12px rgba(15,23,42,0.15); overflow: hidden; }\n  @media print { body { background: none; } .st-page { margin: 0; box-shadow: none; page-break-after: always; } }\n</style>\n</head>\n<body>\n<main class="st-page">\n' + parts.join('\n') + '\n</main>\n</body>\n</html>';
  }

  // ═══════════════════════════ [ST_PURE_END] ═══════════════════════════

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
          if (o.type === 'image' && o.src) {
            pending.push(new Promise(function (res) {
              var im = new Image();
              im.onload = function () { res({ o: o, im: im }); };
              im.onerror = function () { res(null); };
              im.src = o.src;
            }));
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
              g.font = (s2.bold ? '700 ' : '400 ') + size2 + 'px system-ui, sans-serif';
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
    var _role = React.useState(props.initialRole === 'student' ? 'student' : 'teacher'); var role = _role[0], setRole = _role[1];
    var _scrub = React.useState(null); var scrubSeq = _scrub[0], setScrubSeq = _scrub[1];
    var _exportOpen = React.useState(false); var exportOpen = _exportOpen[0], setExportOpen = _exportOpen[1];
    var _preflightOpen = React.useState(false); var preflightOpen = _preflightOpen[0], setPreflightOpen = _preflightOpen[1];
    var _drag = React.useRef(null); // {id, mode:'move'|'resize', startX, startY, frame0}
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
    var trapTab = function (ev) {
      if (ev.key !== 'Tab') return;
      var root = _shellRef.current; if (!root) return;
      var nodes = root.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])');
      var list = Array.prototype.filter.call(nodes, function (n) { return n.offsetParent !== null || n === document.activeElement; });
      if (!list.length) return;
      var first = list[0], last = list[list.length - 1], active = document.activeElement;
      if (ev.shiftKey) { if (active === first || !root.contains(active)) { ev.preventDefault(); try { last.focus(); } catch (_) {} } }
      else { if (active === last || !root.contains(active)) { ev.preventDefault(); try { first.focus(); } catch (_) {} } }
    };
    // AI (Milestone B) — optional capabilities. The buttons only appear when the
    // host app wires the callbacks, so older wiring degrades cleanly. Every AI
    // result enters the ledger as actor 'ai' (provenance by construction).
    var canGenerateImage = typeof props.onGenerateImage === 'function';
    var canSuggestAlt = typeof props.onSuggestAlt === 'function';
    var _aiGenOpen = React.useState(false); var aiGenOpen = _aiGenOpen[0], setAiGenOpen = _aiGenOpen[1];
    var _aiGenPrompt = React.useState(''); var aiGenPrompt = _aiGenPrompt[0], setAiGenPrompt = _aiGenPrompt[1];
    var _aiBusy = React.useState(null); var aiBusy = _aiBusy[0], setAiBusy = _aiBusy[1];
    var _altNonce = React.useState(0); var altNonce = _altNonce[0], setAltNonce = _altNonce[1];
    // In-editor crop: cropId opens the modal, cropRect is the drag selection in
    // 0..1 fractions of the displayed image.
    var _cropId = React.useState(null); var cropId = _cropId[0], setCropId = _cropId[1];
    var _cropRect = React.useState(null); var cropRect = _cropRect[0], setCropRect = _cropRect[1];
    var _cropImgRef = React.useRef(null);
    var _cropDrag = React.useRef(null);
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

    var doc = _docRef.current;
    var SCALE = 0.62; // canvas display scale (816 → ~506px, fits beside panels)

    var dispatch = function (opBody, actor) {
      try {
        var op = stAppend(_docRef.current, opBody, actor || 'user', Date.now());
        bump();
        return op;
      } catch (err) { addToast('AlloStudio: ' + (err && err.message || 'op failed'), 'error'); }
      return null;
    };
    var selected = doc && selectedId ? doc.objects.filter(function (o) { return o.id === selectedId; })[0] : null;
    var preflight = doc ? stAnalyzeDoc(doc) : { issues: [], counts: { error: 0, warning: 0, review: 0 } };
    var preflightTotal = preflight.counts.error + preflight.counts.warning + preflight.counts.review;

    var startFromTemplate = function (tpl, preset) {
      _docRef.current = tpl.make(Date.now(), preset);
      setView('edit'); setSelectedId(null);
      stAnnounce(TT('studio.a11y_started', 'Started a new document from template') + ': ' + tpl.name);
    };

    // ── object insertion ──
    var selectFromOp = function (op) { if (op && op.object && op.object.id) setSelectedId(op.object.id); return op; };
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
        selectFromOp(dispatch({ type: 'object.add', object: stMakeImage(e.target.result, '', { x: 100, y: 100, w: 320, h: 240 }, 'upload') }, 'import'));
        addToast(TT('studio.image_added', '🖼️ Image added — give it alt text (or mark it decorative) before exporting.'), 'info');
      };
      r.readAsDataURL(f);
    };

    // ── AI (Milestone B): generate image + suggest alt text ──
    var runGenerateImage = function () {
      var prompt = String(aiGenPrompt || '').trim();
      if (!prompt) { addToast(TT('studio.ai_need_prompt', 'Describe the image you want first.'), 'info'); return; }
      if (!canGenerateImage || aiBusy) return;
      setAiBusy('generate');
      Promise.resolve(props.onGenerateImage(prompt)).then(function (dataUrl) {
        setAiBusy(null);
        if (!dataUrl || String(dataUrl).indexOf('data:') !== 0) { addToast(TT('studio.ai_gen_failed', 'Could not generate an image.'), 'error'); return; }
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

    // ── selection + drag ──
    var onObjectPointerDown = function (o, mode) {
      return function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        setSelectedId(o.id);
        _drag.current = { id: o.id, mode: mode, startX: ev.clientX, startY: ev.clientY, frame0: stClone(o.frame) };
        try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch (_) {}
      };
    };
    var onCanvasPointerMove = function (ev) {
      var d = _drag.current; if (!d) return;
      var dx = (ev.clientX - d.startX) / SCALE, dy = (ev.clientY - d.startY) / SCALE;
      var f = stClone(d.frame0);
      if (d.mode === 'move') { f.x += dx; f.y += dy; } else { f.w += dx; f.h += dy; }
      setDragLive({ id: d.id, frame: stClampFrame(f, _docRef.current.canvas) });
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
          if (ev.shiftKey) dispatch({ type: 'object.resize', target: o.id, w: f.w + d[0], h: f.h + d[1] }, 'user');
          else dispatch({ type: 'object.move', target: o.id, x: f.x + d[0], y: f.y + d[1] }, 'user');
        } else if (ev.key === 'Delete' || ev.key === 'Backspace') {
          ev.preventDefault(); ev.stopPropagation();
          dispatch({ type: 'object.remove', target: o.id }, 'user');
          setSelectedId(null);
          stAnnounce(TT('studio.a11y_removed', 'Object removed'));
        } else if (ev.key === 'Escape') {
          ev.stopPropagation(); // handled here — don't let the shell close the modal
          setSelectedId(null);
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
      if (op && op.object && op.object.id) setSelectedId(op.object.id);
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
      download(new Blob([JSON.stringify(doc, null, 1)], { type: 'application/json' }), safeName() + '.allostudio.json');
      addToast(TT('studio.saved', '💾 Saved. The file includes your full process history — it stays on this device.'), 'success');
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
          if (!parsed._redo) parsed._redo = [];
          _docRef.current = parsed;
          setView('edit'); setSelectedId(null); bump();
          addToast(TT('studio.loaded', '📂 Opened — process history intact.'), 'success');
        } catch (_) { addToast(TT('studio.load_failed', 'Could not open: ') + 'not valid JSON', 'error'); }
      };
      r.readAsText(f);
    };

    // ── styles ──
    var S = {
      overlay: { position: 'fixed', inset: 0, zIndex: 9000, background: C.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px' },
      shell: { background: C.shell, color: C.text, border: '1px solid ' + C.border, borderRadius: '14px', width: 'min(1220px, 98vw)', height: 'min(860px, 96vh)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: themeName === 'contrast' ? '0 0 0 3px #ffff00' : '0 8px 40px rgba(15,23,42,0.4)', fontFamily: 'system-ui, sans-serif' },
      header: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: C.headerBg, color: C.headerText, borderBottom: '1px solid ' + C.hBtnBorder },
      hBtn: { padding: '6px 12px', borderRadius: '8px', border: '1px solid ' + C.hBtnBorder, background: C.hBtnBg, color: C.hBtnText, fontSize: '12px', fontWeight: 700, cursor: 'pointer' },
      body: { flex: 1, display: 'flex', minHeight: 0 },
      panel: { width: '215px', padding: '10px', overflowY: 'auto', background: C.panel, color: C.text, borderRight: '1px solid ' + C.border, display: 'flex', flexDirection: 'column', gap: '8px' },
      rpanel: { width: '250px', padding: '10px', overflowY: 'auto', background: C.panel, color: C.text, borderLeft: '1px solid ' + C.border, display: 'flex', flexDirection: 'column', gap: '8px' },
      tool: { padding: '8px 10px', borderRadius: '8px', border: '1px solid ' + C.border, background: C.panelAlt, fontSize: '12px', fontWeight: 700, color: C.text, cursor: 'pointer', textAlign: 'left' },
      label: { fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: C.muted, marginTop: '4px' },
      input: { width: '100%', boxSizing: 'border-box', padding: '5px 7px', border: '1px solid ' + C.border, borderRadius: '6px', fontSize: '12px', background: C.inputBg, color: C.inputText },
    };

    if (!doc || view === 'templates') {
      // ── template picker ──
      return h('div', { className: 'st-root theme-' + themeName, style: S.overlay, role: 'dialog', 'aria-modal': true, 'aria-label': TT('studio.title', 'AlloStudio'),
        onKeyDown: function (ev) { trapTab(ev); if (ev.key === 'Escape') { ev.preventDefault(); if (typeof props.onClose === 'function') props.onClose(); } } },
        h('div', { ref: _shellRef, style: Object.assign({}, S.shell, { width: 'min(860px, 96vw)', height: 'auto', maxHeight: '92vh' }) },
          h('div', { style: S.header },
            h('span', { style: { fontSize: '18px' }, 'aria-hidden': true }, '🎨'),
            h('strong', { style: { fontSize: '15px' } }, TT('studio.title', 'AlloStudio')),
            h('span', { style: { fontSize: '11px', color: C.soft } }, TT('studio.tagline', 'Flyers, worksheets & posters — accessible by construction')),
            h('button', { style: Object.assign({}, S.hBtn, { marginLeft: 'auto' }), onClick: function () { if (loadRef.current) loadRef.current.click(); } }, '📂 ' + TT('studio.open_file', 'Open .allostudio.json')),
            h('button', { style: S.hBtn, 'aria-label': TT('studio.close', 'Close AlloStudio'), onClick: props.onClose }, '✕')),
          h('div', { style: { padding: '18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '12px', overflowY: 'auto' } },
            stTemplates().map(function (tpl) {
              // Cards with an orientation choice render a fieldset of buttons
              // (a card can't be one <button> and also hold nested buttons).
              if (tpl.orientations) {
                return h('div', { key: tpl.key, style: { textAlign: 'left', padding: '16px', borderRadius: '12px', border: '1px solid ' + C.border, background: C.panel, color: C.text, display: 'flex', flexDirection: 'column', gap: '10px' } },
                  h('div', { style: { display: 'flex', gap: '10px', alignItems: 'flex-start' } },
                    h('span', { style: { fontSize: '26px' }, 'aria-hidden': true }, tpl.emoji),
                    h('span', null,
                      h('strong', { style: { display: 'block', fontSize: '14px', color: C.text } }, tpl.name),
                      h('span', { style: { fontSize: '11px', color: C.muted } }, tpl.desc))),
                  h('div', { role: 'group', 'aria-label': tpl.name, style: { display: 'flex', gap: '6px' } },
                    [['letter-portrait', TT('studio.orient_portrait', 'Portrait')], ['letter-landscape', TT('studio.orient_landscape', 'Landscape')], ['square', TT('studio.orient_square', 'Square')]].map(function (opt) {
                      return h('button', { key: opt[0], onClick: function () { startFromTemplate(tpl, opt[0]); }, style: Object.assign({}, S.tool, { flex: 1, textAlign: 'center' }) }, opt[1]);
                    })));
              }
              return h('button', { key: tpl.key, onClick: function () { startFromTemplate(tpl); }, style: { textAlign: 'left', padding: '16px', borderRadius: '12px', border: '1px solid ' + C.border, background: C.panel, color: C.text, cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'flex-start' } },
                h('span', { style: { fontSize: '26px' }, 'aria-hidden': true }, tpl.emoji),
                h('span', null,
                  h('strong', { style: { display: 'block', fontSize: '14px', color: C.text } }, tpl.name),
                  h('span', { style: { fontSize: '11px', color: C.muted } }, tpl.desc)));
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
      var mins = Math.max(1, Math.round(summary.activeMs / 60000));
      return h('div', { className: 'st-root theme-' + themeName, style: S.overlay, role: 'dialog', 'aria-modal': true, 'aria-label': TT('studio.process_title_teacher', 'Process timeline'),
        onKeyDown: function (ev) { trapTab(ev); if (ev.key === 'Escape') { ev.preventDefault(); setScrubSeq(null); setView('edit'); } } },
        h('div', { ref: _shellRef, style: S.shell },
          h('div', { style: S.header },
            h('span', { style: { fontSize: '18px' }, 'aria-hidden': true }, '🎞️'),
            h('strong', null, student ? TT('studio.process_title_student', 'My process') : TT('studio.process_title_teacher', 'Process timeline')),
            h('button', { style: Object.assign({}, S.hBtn, { marginLeft: 'auto' }), onClick: exportProcess }, 'Process notes'),
            h('button', { style: S.hBtn, onClick: function () { setScrubSeq(null); setView('edit'); } }, '← ' + TT('studio.back_to_editing', 'Back to editing'))),
          h('div', { style: { display: 'flex', flex: 1, minHeight: 0 } },
            h('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px', overflow: 'auto' } },
              h('div', { style: { position: 'relative', width: doc.canvas.w * 0.45 + 'px', height: doc.canvas.h * 0.45 + 'px', background: (scene.canvas.background && scene.canvas.background.fill) || '#fff', boxShadow: '0 2px 10px rgba(15,23,42,0.2)', overflow: 'hidden', flexShrink: 0 } },
                scene.objects.map(function (o) { return renderObject(o, 0.45, null, {}, h); })),
              h('label', { style: { width: '90%', marginTop: '12px', fontSize: '12px', color: C.text, fontWeight: 700 } },
                TT('studio.scrub_label', 'Scrub the timeline') + ' — ' + at + ' / ' + maxSeq,
                h('input', { type: 'range', min: 0, max: maxSeq, value: at, style: { width: '100%' }, 'aria-valuetext': TT('studio.scrub_step', 'step') + ' ' + at + ' ' + TT('studio.of', 'of') + ' ' + maxSeq, onChange: function (e) { setScrubSeq(parseInt(e.target.value, 10)); } }))),
            h('div', { style: Object.assign({}, S.rpanel, { width: '300px' }) },
              h('div', { style: { padding: '10px', background: C.exportBg, border: '1px solid ' + C.exportBorder, borderRadius: '10px', fontSize: '12px', color: C.text, fontWeight: 700 } },
                summary.user + ' ' + TT('studio.ops_you', 'edits by ' + (student ? 'you' : 'the student')) + ' · ' + summary.ai + ' ' + TT('studio.ops_ai', 'AI actions') + ' · ' + summary.import + ' ' + TT('studio.ops_import', 'imported items'),
                h('div', { style: { fontWeight: 400, marginTop: '4px', color: C.muted } }, '≈' + mins + ' ' + TT('studio.active_minutes', 'active minutes in the editor'))),
              h('p', { style: { fontSize: '11px', color: C.muted, margin: '2px 0 6px' } }, TT('studio.honesty_line', ST_HONESTY_LINE)),
              h('div', { style: S.label }, TT('studio.recent_steps', 'Steps (latest first)')),
              h('div', { style: { overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' } },
                ops.slice(-120).reverse().map(function (op) {
                  var chip = op.actor === 'ai' ? { bg: '#f3e8ff', fg: '#7c2d12', label: 'AI' } : op.actor === 'import' ? { bg: '#fef3c7', fg: '#92400e', label: TT('studio.actor_import', 'import') } : { bg: '#dcfce7', fg: '#166534', label: TT('studio.actor_user', 'you') };
                  return h('div', { key: op.seq, style: { display: 'flex', gap: '6px', alignItems: 'center', fontSize: '11px', color: C.text, padding: '2px 4px', background: op.seq === at ? C.selectedBg : 'transparent', borderRadius: '4px' } },
                    h('button', { onClick: function () { setScrubSeq(op.seq); }, style: { border: 'none', background: 'none', cursor: 'pointer', color: C.accent, fontWeight: 700, fontSize: '11px', padding: 0 }, 'aria-label': TT('studio.jump_to_step', 'Jump to step') + ' ' + op.seq }, '#' + op.seq),
                    h('span', { style: { background: chip.bg, color: chip.fg, borderRadius: '999px', padding: '0 7px', fontWeight: 700, fontSize: '10px' } }, chip.label),
                    h('span', null, stDescribeOp(op)));
                }))))));
    }

    // ── editor view ──
    var liveFrameFor = function (o) { return (dragLive && dragLive.id === o.id) ? dragLive.frame : o.frame; };

    function renderObject(o, scale, interactivity, extra, hh) {
      var f = interactivity ? liveFrameFor(o) : o.frame;
      var isSel = interactivity && selectedId === o.id;
      var base = {
        position: 'absolute', left: f.x * scale + 'px', top: f.y * scale + 'px',
        width: f.w * scale + 'px', height: f.h * scale + 'px', zIndex: o.z || 1,
        boxSizing: 'border-box', cursor: interactivity ? 'move' : 'default',
        outline: isSel ? '2px solid ' + C.accent : '1px dashed transparent',
      };
      var inner = null;
      if (o.type === 'text') {
        var run = (o.runs && o.runs[0]) || { text: '', style: {} };
        var s = run.style || {};
        inner = hh('div', { style: { fontSize: (s.size || 16) * scale + 'px', color: s.color || '#111827', fontWeight: s.bold ? 700 : 400, textAlign: s.align || 'left', whiteSpace: 'pre-wrap', lineHeight: 1.25, overflow: 'hidden', width: '100%', height: '100%', overflowWrap: 'break-word' } }, run.text);
      } else if (o.type === 'image') {
        inner = o.src
          ? hh('img', { src: o.src, alt: '', draggable: false, style: { width: '100%', height: '100%', objectFit: o.fit === 'contain' ? 'contain' : 'cover', pointerEvents: 'none' } })
          : hh('div', { style: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.panelAlt, border: '2px dashed ' + C.border, borderRadius: '8px', fontSize: 12 * scale + 'px', color: C.muted, pointerEvents: 'none' } }, '🖼️ ' + TT('studio.image_placeholder', 'Image frame'));
      } else if (o.type === 'shape') {
        inner = hh('div', { style: { width: '100%', height: '100%', background: o.fill || '#e2e8f0', borderRadius: o.shape === 'ellipse' ? '50%' : '8px', pointerEvents: 'none' } });
      }
      if (!interactivity) return hh('div', { key: o.id, style: base, 'aria-hidden': true }, inner);
      var labelText = o.type === 'text' ? ((o.runs && o.runs[0] && o.runs[0].text) || 'text').slice(0, 40) : o.type === 'image' ? (o.alt || TT('studio.image_no_alt', 'image without alt text')) : (o.shape || 'shape');
      return hh('div', Object.assign({
        key: o.id, tabIndex: 0, role: 'group',
        'aria-label': o.type + ': ' + labelText,
        style: base,
        onPointerDown: onObjectPointerDown(o, 'move'),
        onPointerMove: onCanvasPointerMove,
        onPointerUp: onCanvasPointerUp,
        onKeyDown: onObjectKeyDown(o),
        onDoubleClick: o.type === 'text' ? function () { setEditingText({ id: o.id, value: (o.runs && o.runs[0] && o.runs[0].text) || '' }); } : undefined,
        onFocus: function () { setSelectedId(o.id); },
      }, extra),
        inner,
        isSel ? hh('div', {
          role: 'presentation',
          onPointerDown: onObjectPointerDown(o, 'resize'),
          onPointerMove: onCanvasPointerMove,
          onPointerUp: onCanvasPointerUp,
          style: { position: 'absolute', right: '-7px', bottom: '-7px', width: '14px', height: '14px', background: C.accent, border: '2px solid ' + C.panel, borderRadius: '4px', cursor: 'nwse-resize' },
        }) : null,
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

    var orderList = doc.objects.map(function (o, i) {
      var text = o.type === 'text' ? ((o.runs && o.runs[0] && o.runs[0].text) || '').slice(0, 26) : o.type === 'image' ? (o.alt ? o.alt.slice(0, 26) : TT('studio.image_no_alt_short', '(no alt yet)')) : (o.shape || 'shape');
      var icon = o.type === 'text' ? (o.role === 'body' ? '¶' : 'H') : o.type === 'image' ? '🖼️' : '⬛';
      return h('div', { key: o.id, style: { display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 4px', borderRadius: '6px', background: selectedId === o.id ? C.selectedBg : C.panelAlt, border: '1px solid ' + C.border } },
        h('button', { onClick: function () { setSelectedId(o.id); }, style: { flex: 1, textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', fontSize: '11px', color: C.text, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }, 'aria-label': TT('studio.select_object', 'Select') + ' ' + o.type + ' ' + text },
          h('span', { 'aria-hidden': true }, icon + ' '), (i + 1) + '. ' + text),
        h('button', { disabled: i === 0, onClick: function () { dispatch({ type: 'object.reorder', target: o.id, toIndex: i - 1 }, 'user'); stAnnounce(TT('studio.a11y_moved_earlier', 'Moved earlier in reading order')); }, title: TT('studio.reading_earlier', 'Read earlier'), 'aria-label': TT('studio.reading_earlier', 'Read earlier') + ' — ' + text, style: { border: '1px solid ' + C.border, background: C.inputBg, color: C.inputText, borderRadius: '4px', cursor: i === 0 ? 'default' : 'pointer', fontSize: '10px', opacity: i === 0 ? 0.4 : 1 } }, '↑'),
        h('button', { disabled: i === doc.objects.length - 1, onClick: function () { dispatch({ type: 'object.reorder', target: o.id, toIndex: i + 1 }, 'user'); stAnnounce(TT('studio.a11y_moved_later', 'Moved later in reading order')); }, title: TT('studio.reading_later', 'Read later'), 'aria-label': TT('studio.reading_later', 'Read later') + ' — ' + text, style: { border: '1px solid ' + C.border, background: C.inputBg, color: C.inputText, borderRadius: '4px', cursor: i === doc.objects.length - 1 ? 'default' : 'pointer', fontSize: '10px', opacity: i === doc.objects.length - 1 ? 0.4 : 1 } }, '↓'));
    });

    var propPanel = null;
    if (selected) {
      var frameInput = function (key, label) {
        return h('label', { style: { fontSize: '10px', color: C.muted, display: 'flex', flexDirection: 'column', gap: '2px' } }, label,
          h('input', { type: 'number', value: selected.frame[key], style: S.input, 'aria-label': label,
            onChange: function (e) {
              var v = parseInt(e.target.value, 10); if (isNaN(v)) return;
              if (key === 'x' || key === 'y') dispatch({ type: 'object.move', target: selected.id, x: key === 'x' ? v : selected.frame.x, y: key === 'y' ? v : selected.frame.y }, 'user');
              else dispatch({ type: 'object.resize', target: selected.id, w: key === 'w' ? v : selected.frame.w, h: key === 'h' ? v : selected.frame.h }, 'user');
            } }));
      };
      propPanel = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
        h('div', { style: S.label }, TT('studio.selection', 'Selection') + ' — ' + selected.type),
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' } }, frameInput('x', 'X'), frameInput('y', 'Y'), frameInput('w', TT('studio.width', 'Width')), frameInput('h', TT('studio.height', 'Height'))),
        h('div', { style: S.label }, 'Layout'),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' } },
          h('button', { style: S.tool, onClick: function () { alignSelected('left'); }, title: 'Align left' }, 'L'),
          h('button', { style: S.tool, onClick: function () { alignSelected('hcenter'); }, title: 'Center horizontally' }, 'C'),
          h('button', { style: S.tool, onClick: function () { alignSelected('right'); }, title: 'Align right' }, 'R'),
          h('button', { style: S.tool, onClick: function () { alignSelected('top'); }, title: 'Align top' }, 'T'),
          h('button', { style: S.tool, onClick: function () { alignSelected('vcenter'); }, title: 'Center vertically' }, 'M'),
          h('button', { style: S.tool, onClick: function () { alignSelected('bottom'); }, title: 'Align bottom' }, 'B')),
        h('div', { style: { display: 'flex', gap: '4px' } },
          h('button', { style: S.tool, onClick: duplicateSelected }, 'Duplicate'),
          h('button', { style: S.tool, onClick: function () { alignSelected('page-width'); } }, 'Page width')),
        selected.type === 'text' ? h('label', { style: { fontSize: '10px', color: C.muted } }, TT('studio.text_role', 'Role (sets the exported tag)'),
          h('select', { value: selected.role, style: S.input, onChange: function (e) { dispatch({ type: 'object.update', target: selected.id, patch: { role: e.target.value } }, 'user'); } },
            h('option', { value: 'heading1' }, 'Heading 1'), h('option', { value: 'heading2' }, 'Heading 2'), h('option', { value: 'heading3' }, 'Heading 3'), h('option', { value: 'body' }, TT('studio.body_text', 'Body text')))) : null,
        selected.type === 'text' ? h('label', { style: { fontSize: '10px', color: C.muted } }, TT('studio.text_content', 'Text'),
          h('textarea', { key: 'text-' + selected.id, defaultValue: (selected.runs && selected.runs[0] && selected.runs[0].text) || '', rows: selected.role === 'body' ? 4 : 2, style: Object.assign({}, S.input, { resize: 'vertical' }), 'aria-label': TT('studio.text_content', 'Text'),
            onKeyDown: function (e) { e.stopPropagation(); },
            onBlur: function (e) { commitTextEdit(selected, e.target.value); } })) : null,
        selected.type === 'text' ? h('label', { style: { fontSize: '10px', color: C.muted } }, TT('studio.font_size', 'Font size'),
          h('input', { type: 'number', min: 8, max: 120, value: (selected.runs[0].style && selected.runs[0].style.size) || 16, style: S.input, onChange: function (e) { var v = parseInt(e.target.value, 10); if (isNaN(v)) return; var runs = stClone(selected.runs); runs[0].style.size = Math.max(8, Math.min(120, v)); dispatch({ type: 'object.update', target: selected.id, patch: { runs: runs } }, 'user'); } })) : null,
        selected.type === 'text' ? h('div', null,
          h('div', { style: S.label }, TT('studio.text_align', 'Text alignment & weight')),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' } },
            ['left', 'center', 'right'].map(function (al) {
              var curAlign = (selected.runs[0].style && selected.runs[0].style.align) || 'left';
              var active = curAlign === al;
              return h('button', { key: al, style: Object.assign({}, S.tool, { textAlign: 'center' }, active ? { borderColor: C.accent, background: C.selectedBg } : null),
                'aria-pressed': active, 'aria-label': TT('studio.align_text', 'Align text') + ' ' + al, title: TT('studio.align_text', 'Align text') + ' ' + al,
                onClick: function () { var runs = stClone(selected.runs); runs[0].style = Object.assign({}, runs[0].style, { align: al }); dispatch({ type: 'object.update', target: selected.id, patch: { runs: runs } }, 'user'); } },
                al === 'left' ? 'L' : al === 'center' ? 'C' : 'R');
            }),
            (function () {
              var bold = !!(selected.runs[0].style && selected.runs[0].style.bold);
              return h('button', { key: 'bold', style: Object.assign({}, S.tool, { textAlign: 'center', fontWeight: 900 }, bold ? { borderColor: C.accent, background: C.selectedBg } : null),
                'aria-pressed': bold, 'aria-label': TT('studio.bold', 'Bold'), title: TT('studio.bold', 'Bold'),
                onClick: function () { var runs = stClone(selected.runs); runs[0].style = Object.assign({}, runs[0].style, { bold: !bold }); dispatch({ type: 'object.update', target: selected.id, patch: { runs: runs } }, 'user'); } }, 'B');
            })())) : null,
        selected.type === 'text' ? h('label', { style: { fontSize: '10px', color: C.muted } }, TT('studio.text_color', 'Text color'),
          h('input', { type: 'color', value: (selected.runs[0].style && selected.runs[0].style.color) || '#111827', style: Object.assign({}, S.input, { padding: '2px', height: '30px' }), onChange: function (e) { var runs = stClone(selected.runs); runs[0].style.color = e.target.value; dispatch({ type: 'object.update', target: selected.id, patch: { runs: runs } }, 'user'); } })) : null,
        selected.type === 'shape' ? h('label', { style: { fontSize: '10px', color: C.muted } }, TT('studio.fill', 'Fill'),
          h('input', { type: 'color', value: selected.fill || '#dbeafe', style: Object.assign({}, S.input, { padding: '2px', height: '30px' }), onChange: function (e) { dispatch({ type: 'object.update', target: selected.id, patch: { fill: e.target.value } }, 'user'); } })) : null,
        selected.type === 'image' ? h('div', null,
          h('label', { style: { fontSize: '10px', color: C.muted } }, TT('studio.alt_text', 'Alt text (what a screen reader hears)'),
            // key by object id AND altNonce: switching selection OR an AI draft
            // remounts with the right defaultValue; commit-on-blur = ONE
            // object.update op per edit.
            h('textarea', { key: 'alt-' + selected.id + '-' + altNonce, defaultValue: selected.alt || '', rows: 3, style: Object.assign({}, S.input, { resize: 'vertical' }), 'data-st-alt-input': selected.id,
              onKeyDown: function (e) { e.stopPropagation(); },
              onBlur: function (e) { if (e.target.value !== (selected.alt || '')) dispatch({ type: 'object.update', target: selected.id, patch: { alt: e.target.value } }, 'user'); } })),
          (canSuggestAlt && selected.src) ? h('button', { style: Object.assign({}, S.tool, { marginTop: '4px', opacity: aiBusy === 'alt' ? 0.6 : 1 }), disabled: aiBusy === 'alt', onClick: runSuggestAlt, title: TT('studio.ai_suggest_alt_hint', 'Draft alt text with AI, then review it — logged as AI in your process') }, aiBusy === 'alt' ? '… ' + TT('studio.ai_drafting', 'Drafting…') : '✨ ' + TT('studio.ai_suggest_alt', 'Suggest alt text')) : null,
          h('label', { style: { fontSize: '11px', color: C.text, display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' } },
            h('input', { type: 'checkbox', checked: !!selected.decorative, onChange: function (e) { dispatch({ type: 'object.update', target: selected.id, patch: { decorative: e.target.checked } }, 'user'); } }),
            TT('studio.decorative', 'Decorative (skip in screen readers)')),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginTop: '4px' } },
            h('button', { style: Object.assign({}, S.tool, selected.fit !== 'contain' ? { borderColor: C.accent } : null), onClick: function () { dispatch({ type: 'object.update', target: selected.id, patch: { fit: 'cover' } }, 'user'); }, 'aria-pressed': selected.fit !== 'contain' }, 'Fill'),
            h('button', { style: Object.assign({}, S.tool, selected.fit === 'contain' ? { borderColor: C.accent } : null), onClick: function () { dispatch({ type: 'object.update', target: selected.id, patch: { fit: 'contain' } }, 'user'); }, 'aria-pressed': selected.fit === 'contain' }, 'Fit')),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginTop: '4px' } },
            h('button', { style: S.tool, onClick: function () { if (fileRef.current) { fileRef.current.setAttribute('data-st-replace', selected.id); fileRef.current.click(); } } }, '🔁 ' + TT('studio.replace_image', 'Replace…')),
            selected.src ? h('button', { style: S.tool, onClick: function () { setCropRect(null); setCropId(selected.id); }, title: TT('studio.crop_hint', 'Trim the image — removed pixels are permanently deleted, including from your saved file') }, '✂ ' + TT('studio.crop', 'Crop…')) : null)) : null,
        h('div', { style: { display: 'flex', gap: '4px', marginTop: '4px' } },
          h('button', { style: S.tool, onClick: function () { dispatch({ type: 'object.z', target: selected.id, z: (selected.z || 1) + 1 }, 'user'); }, title: TT('studio.bring_forward', 'Bring forward (visual stacking only — reading order is the list)') }, '⬆ z'),
          h('button', { style: S.tool, onClick: function () { dispatch({ type: 'object.z', target: selected.id, z: Math.max(0, (selected.z || 1) - 1) }, 'user'); }, title: TT('studio.send_back', 'Send backward') }, '⬇ z'),
          h('button', { style: Object.assign({}, S.tool, { color: '#b91c1c', borderColor: '#fca5a5' }), onClick: function () { dispatch({ type: 'object.remove', target: selected.id }, 'user'); setSelectedId(null); } }, '🗑')));
    }

    // Ctrl+Z / Ctrl+Y (and Ctrl+Shift+Z) — skipped while typing in a field so
    // the browser's native text undo keeps working inside inputs/textareas
    // (the object-level keyboard grammar stays on the objects themselves).
    var onShellKeyDown = function (ev) {
      var tag = (ev.target && ev.target.tagName || '').toUpperCase();
      // Escape: deselect if something is selected, otherwise close the modal.
      // A focused object handles (and stops) its own Escape; text fields keep
      // their native Escape. This only fires from panels/canvas chrome.
      if (ev.key === 'Escape') {
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        ev.preventDefault();
        if (selectedId) { setSelectedId(null); return; }
        if (typeof props.onClose === 'function') props.onClose();
        return;
      }
      if (!(ev.ctrlKey || ev.metaKey)) return;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      var k = (ev.key || '').toLowerCase();
      if (k === 'z' && !ev.shiftKey) { ev.preventDefault(); if (stUndo(_docRef.current)) { bump(); stAnnounce(TT('studio.a11y_undone', 'Undone')); } }
      else if (k === 'y' || (k === 'z' && ev.shiftKey)) { ev.preventDefault(); if (stRedo(_docRef.current)) { bump(); stAnnounce(TT('studio.a11y_redone', 'Redone')); } }
    };
    return h('div', { className: 'st-root theme-' + themeName, style: S.overlay, role: 'dialog', 'aria-modal': true, 'aria-label': TT('studio.title', 'AlloStudio'), onKeyDown: function (ev) { trapTab(ev); onShellKeyDown(ev); } },
      h('div', { ref: _shellRef, style: S.shell },
        // header
        h('div', { style: S.header },
          h('span', { style: { fontSize: '18px' }, 'aria-hidden': true }, '🎨'),
          // Uncontrolled + commit-on-blur: one clean doc.retitle op instead of
          // an op per keystroke polluting the process timeline.
          h('input', { defaultValue: doc.title, 'aria-label': TT('studio.doc_title', 'Document title'), style: { background: C.hBtnBg, color: C.hBtnText, border: '1px solid ' + C.hBtnBorder, borderRadius: '8px', padding: '5px 10px', fontSize: '13px', fontWeight: 700, width: '220px' },
            onBlur: function (e) { if (e.target.value !== doc.title) dispatch({ type: 'doc.retitle', title: e.target.value }, 'user'); },
            onKeyDown: function (e) { if (e.key === 'Enter') e.target.blur(); } }),
          h('button', { style: Object.assign({}, S.hBtn, ops.length ? null : { opacity: 0.45, cursor: 'default' }), disabled: !ops.length, onClick: function () { if (stUndo(_docRef.current)) { bump(); } }, 'aria-label': TT('studio.undo', 'Undo') }, '↩ ' + TT('studio.undo', 'Undo')),
          h('button', { style: Object.assign({}, S.hBtn, (doc._redo && doc._redo.length) ? null : { opacity: 0.45, cursor: 'default' }), disabled: !(doc._redo && doc._redo.length), onClick: function () { if (stRedo(_docRef.current)) { bump(); } }, 'aria-label': TT('studio.redo', 'Redo') }, '↪ ' + TT('studio.redo', 'Redo')),
          h('button', { style: S.hBtn, onClick: function () { setView('process'); } }, '🎞️ ' + (student ? TT('studio.process_title_student', 'My process') : TT('studio.process_title_teacher', 'Process timeline'))),
          h('button', { style: Object.assign({}, S.hBtn, { background: student ? '#7c3aed' : '#1e293b' }), 'aria-pressed': student, title: TT('studio.role_toggle_hint', 'Student mode uses portfolio framing for the process view'), onClick: function () { setRole(student ? 'teacher' : 'student'); } }, student ? '🎓 ' + TT('studio.role_student', 'Student mode') : '🧑‍🏫 ' + TT('studio.role_teacher', 'Teacher mode')),
          h('button', { style: Object.assign({}, S.hBtn, preflight.counts.error ? { borderColor: '#fca5a5' } : null), onClick: function () { setPreflightOpen(!preflightOpen); }, 'aria-expanded': preflightOpen }, 'A11y ' + preflightTotal),
          h('span', { style: { marginLeft: 'auto' } }),
          h('button', { style: S.hBtn, onClick: saveDoc }, '💾 ' + TT('studio.save', 'Save')),
          h('button', { style: Object.assign({}, S.hBtn, { background: '#2563eb', borderColor: '#1e3a8a' }), onClick: function () { setExportOpen(!exportOpen); }, 'aria-expanded': exportOpen }, '📤 ' + TT('studio.export', 'Export')),
          h('button', { style: S.hBtn, 'aria-label': TT('studio.close', 'Close AlloStudio'), onClick: props.onClose }, '✕')),
        preflightOpen ? h('div', { style: { padding: '10px 14px', background: C.panelAlt, color: C.text, borderBottom: '1px solid ' + C.border, display: 'flex', gap: '10px', alignItems: 'flex-start', flexWrap: 'wrap' } },
          h('div', { style: { fontSize: '12px', fontWeight: 800, color: C.text, minWidth: '150px' } }, 'Accessibility Preflight',
            h('div', { style: { fontSize: '11px', fontWeight: 600, color: C.muted, marginTop: '2px' } }, preflight.counts.error + ' errors · ' + preflight.counts.warning + ' warnings · ' + preflight.counts.review + ' review')),
          h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', flex: 1 } },
            preflight.issues.length ? preflight.issues.slice(0, 8).map(function (issue, idx) {
              var bg = issue.severity === 'error' ? '#fee2e2' : issue.severity === 'warning' ? '#fef3c7' : C.panel;
              var fg = issue.severity === 'error' ? '#7f1d1d' : issue.severity === 'warning' ? '#78350f' : C.text;
              return h('button', { key: idx, style: { border: '1px solid ' + (issue.severity === 'review' ? C.border : 'transparent'), background: bg, color: fg, borderRadius: '8px', padding: '5px 8px', cursor: issue.id ? 'pointer' : 'default', fontSize: '11px', fontWeight: 700, textAlign: 'left' },
                onClick: function () { if (issue.id) { setSelectedId(issue.id); stAnnounce(issue.title); } },
                title: issue.message }, issue.title)
            }) : h('span', { style: { fontSize: '12px', color: C.muted, fontWeight: 700 } }, 'No accessibility issues found.'))) : null,
        // export panel
        exportOpen ? h('div', { style: { padding: '10px 14px', background: C.exportBg, color: C.text, borderBottom: '1px solid ' + C.exportBorder, display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } },
          h('button', { style: S.tool, onClick: exportTagged }, '📄 ' + TT('studio.export_tagged', 'Tagged PDF (accessible)')),
          h('button', { style: S.tool, onClick: exportHtml }, '🌐 ' + TT('studio.export_html', 'Accessible HTML')),
          h('button', { style: S.tool, onClick: exportPng }, '🖼️ PNG'),
          h('button', { style: Object.assign({}, S.tool, { borderColor: C.accent }), onClick: exportWorksheetPdf, title: TT('studio.ws_pdf_hint', 'Rebuild as a linear worksheet — real questions + answer spaces — and export a tagged PDF') }, '📝 ' + TT('studio.export_worksheet_pdf', 'Worksheet → Tagged PDF')),
          h('button', { style: S.tool, onClick: exportWorksheetHtml }, '📝 ' + TT('studio.export_worksheet_html', 'Worksheet → HTML')),
          h('button', { style: S.tool, onClick: exportWorksheet }, TT('studio.export_worksheet_json', 'Worksheet JSON')),
          h('button', { style: S.tool, onClick: exportProcess }, 'Process notes'),
          altFailures.length ? h('span', { style: { fontSize: '11px', color: '#b91c1c', fontWeight: 700 } },
            '♿ ' + altFailures.length + ' ' + TT('studio.alt_gate_msg', 'image(s) need alt text or a decorative mark:'),
            altFailures.map(function (m) {
              return h('button', { key: m.id, style: { marginLeft: '6px', border: '1px solid #fca5a5', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', fontSize: '10px', cursor: 'pointer', padding: '2px 6px' },
                onClick: function () { setSelectedId(m.id); stAnnounce(TT('studio.a11y_alt_jump', 'Selected image missing alt text — the alt text field is in the right panel.')); } }, TT('studio.fix', 'Fix') + ' #' + (m.index + 1));
            })) : h('span', { style: { fontSize: '11px', color: '#166534', fontWeight: 700 } }, '♿ ' + TT('studio.alt_gate_ok', 'All images have alt text or are marked decorative — exports are unblocked.'))) : null,
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
            h('div', { style: S.label }, TT('studio.page', 'Page')),
            h('label', { style: { fontSize: '10px', color: C.muted } }, TT('studio.canvas_size', 'Page size'),
              h('select', { value: ST_CANVAS_PRESETS[doc.canvas.preset] ? doc.canvas.preset : 'custom', style: S.input, 'aria-label': TT('studio.canvas_size', 'Page size'),
                onChange: function (e) { var pk = e.target.value; if (!ST_CANVAS_PRESETS[pk]) return; dispatch({ type: 'canvas.resize', preset: pk }, 'user'); stAnnounce(TT('studio.a11y_resized', 'Page size changed — objects re-fit to the page')); } },
                h('option', { value: 'letter-portrait' }, TT('studio.orient_portrait', 'Portrait') + ' (8.5×11)'),
                h('option', { value: 'letter-landscape' }, TT('studio.orient_landscape', 'Landscape') + ' (11×8.5)'),
                h('option', { value: 'square' }, TT('studio.orient_square', 'Square')),
                ST_CANVAS_PRESETS[doc.canvas.preset] ? null : h('option', { value: 'custom', disabled: true }, TT('studio.orient_custom', 'Custom')))),
            h('label', { style: { fontSize: '10px', color: C.muted } }, TT('studio.background', 'Background'),
              h('input', { type: 'color', value: (doc.canvas.background && doc.canvas.background.fill) || '#ffffff', style: Object.assign({}, S.input, { padding: '2px', height: '30px' }), onChange: function (e) { dispatch({ type: 'canvas.background', fill: e.target.value }, 'user'); } })),
            h('p', { style: { fontSize: '10px', color: C.soft, marginTop: 'auto' } }, TT('studio.keyboard_hint', 'Tip: Tab focuses objects; arrows move, Shift+arrows resize, Delete removes. The panel on the right is the reading order.'))),
          // center: canvas
          h('div', { style: { flex: 1, overflow: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '18px' }, onPointerDown: function () { setSelectedId(null); } },
            h('div', { style: { position: 'relative', width: doc.canvas.w * SCALE + 'px', height: doc.canvas.h * SCALE + 'px', background: (doc.canvas.background && doc.canvas.background.fill) || '#fff', boxShadow: '0 2px 14px rgba(15,23,42,0.25)', flexShrink: 0, overflow: 'hidden' },
              onPointerDown: function (e) { e.stopPropagation(); setSelectedId(null); },
              onPointerMove: onCanvasPointerMove, onPointerUp: onCanvasPointerUp },
              doc.objects.map(function (o) { return renderObject(o, SCALE, true, {}, h); }))),
          // right: reading order + properties
          h('div', { style: S.rpanel },
            h('div', { style: S.label }, '🔊 ' + TT('studio.reading_order', 'Reading order (what screen readers follow)')),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '38%', overflowY: 'auto' } }, orderList),
            propPanel || h('p', { style: { fontSize: '11px', color: C.soft } }, TT('studio.no_selection', 'Select an object on the canvas (or in the list above) to edit its properties.')))),
        h('input', { ref: fileRef, type: 'file', accept: 'image/*', style: { display: 'none' },
          onChange: function (ev) {
            var replaceId = ev.target.getAttribute('data-st-replace');
            if (!replaceId) { onPickImage(ev); return; }
            var f2 = ev.target.files && ev.target.files[0];
            ev.target.value = '';
            if (!f2) return;
            var r2 = new FileReader();
            r2.onload = function (e2) { dispatch({ type: 'object.update', target: replaceId, patch: { src: e2.target.result, provenance: { origin: 'upload' } } }, 'import'); };
            r2.readAsDataURL(f2);
          } }),
        h('input', { ref: loadRef, type: 'file', accept: '.json,application/json', style: { display: 'none' }, onChange: onLoadFile }),
        // ── crop modal (position:fixed, overlays the studio) ──
        cropId ? (function () {
          var co = doc.objects.filter(function (x) { return x.id === cropId; })[0];
          if (!co || !co.src) return null;
          var r = cropRect || { x: 0, y: 0, w: 0, h: 0 };
          return h('div', { style: { position: 'fixed', inset: 0, zIndex: 9500, background: 'rgba(2,6,23,0.82)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }, role: 'dialog', 'aria-modal': true, 'aria-label': TT('studio.crop_title', 'Crop image'),
            onKeyDown: function (e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setCropId(null); setCropRect(null); } } },
            h('div', { style: { color: '#fff', fontSize: '13px', fontWeight: 700, marginBottom: '8px', maxWidth: '80vw', textAlign: 'center' } }, '✂ ' + TT('studio.crop_drag', 'Drag on the image to choose the area to keep.'),
              h('div', { style: { fontSize: '11px', fontWeight: 400, color: '#fca5a5', marginTop: '2px' } }, TT('studio.crop_permanent', 'The trimmed-away pixels are permanently removed — including from your saved file.'))),
            h('div', { style: { position: 'relative', maxWidth: '80vw', maxHeight: '68vh', touchAction: 'none' }, onPointerMove: cropPointerMove, onPointerUp: cropPointerUp },
              h('img', { ref: _cropImgRef, src: co.src, alt: '', draggable: false, style: { display: 'block', maxWidth: '80vw', maxHeight: '68vh', userSelect: 'none', cursor: 'crosshair' }, onPointerDown: cropPointerDown }),
              (r.w > 0 && r.h > 0) ? h('div', { style: { position: 'absolute', left: (r.x * 100) + '%', top: (r.y * 100) + '%', width: (r.w * 100) + '%', height: (r.h * 100) + '%', border: '2px solid #6366f1', boxShadow: '0 0 0 9999px rgba(2,6,23,0.55)', pointerEvents: 'none' } }) : null),
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
  AlloStudio.stUndo = stUndo;
  AlloStudio.stRedo = stRedo;
  AlloStudio.stReplay = stReplay;
  AlloStudio.stActorSummary = stActorSummary;
  AlloStudio.stAltGate = stAltGate;
  AlloStudio.stValidateDoc = stValidateDoc;
  AlloStudio.stDescribeOp = stDescribeOp;
  AlloStudio.stTemplates = stTemplates;
  AlloStudio.stExportHtml = stExportHtml;
  AlloStudio.stEscapeHtml = stEscapeHtml;
  AlloStudio.stClampFrame = stClampFrame;
  AlloStudio.stAlignFrame = stAlignFrame;
  AlloStudio.stAnalyzeDoc = stAnalyzeDoc;
  AlloStudio.stContrastRatio = stContrastRatio;
  AlloStudio.stExportWorksheetData = stExportWorksheetData;
  AlloStudio.stExportWorksheetHtml = stExportWorksheetHtml;
  AlloStudio.stCropBox = stCropBox;
  AlloStudio.stScrubObjectSrc = stScrubObjectSrc;
  AlloStudio.stExportProcessMarkdown = stExportProcessMarkdown;
  AlloStudio.ST_HONESTY_LINE = ST_HONESTY_LINE;
  AlloStudio.ST_CANVAS_PRESETS = ST_CANVAS_PRESETS;
  AlloStudio.ST_CHECKPOINT_EVERY = ST_CHECKPOINT_EVERY;
  window.AlloModules.AlloStudio = AlloStudio;
})();
