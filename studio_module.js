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
//            initialRole: 'teacher' | 'student' }
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

  function stCreateDoc(preset, title, now) {
    var p = ST_CANVAS_PRESETS[preset] || ST_CANVAS_PRESETS['letter-portrait'];
    return {
      format: ST_FORMAT,
      version: ST_DOC_VERSION,
      title: title || 'Untitled',
      _baseTitle: title || 'Untitled', // replay-to-seq-0 anchor (title changes are ops; creation is not)
      createdAt: now || 0,
      canvas: { preset: ST_CANVAS_PRESETS[preset] ? preset : 'letter-portrait', w: p.w, h: p.h, background: { fill: '#ffffff' } },
      objects: [],            // current scene cache — array order IS the reading order
      ledger: { version: 1, ops: [], checkpoints: [] },
      _redo: [],              // undone ops (session bookkeeping; harmless if saved)
    };
  }

  function stClampFrame(frame, canvas) {
    var w = Math.max(ST_MIN_SIZE, Math.min(frame.w, canvas.w));
    var h = Math.max(ST_MIN_SIZE, Math.min(frame.h, canvas.h));
    var x = Math.max(0, Math.min(frame.x, canvas.w - w));
    var y = Math.max(0, Math.min(frame.y, canvas.h - h));
    return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), rotation: frame.rotation || 0 };
  }

  // Apply ONE op to a scene ({title, canvas, objects}) — pure; unknown op types
  // leave the scene unchanged (forward compatibility: an old build replaying a
  // newer save must not corrupt what it does understand).
  function stApplyOp(scene, op) {
    var objects = scene.objects.slice();
    var idx = function (id) { for (var i = 0; i < objects.length; i++) { if (objects[i].id === id) return i; } return -1; };
    var t = op.type;
    if (t === 'object.add') {
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
        var to = Math.max(0, Math.min(op.toIndex, objects.length));
        objects.splice(to, 0, item);
      }
    } else if (t === 'object.z') {
      var zi = idx(op.target);
      if (zi >= 0) { objects[zi] = stClone(objects[zi]); objects[zi].z = op.z; }
    } else if (t === 'doc.retitle') {
      return { title: String(op.title || 'Untitled'), canvas: scene.canvas, objects: objects };
    } else if (t === 'canvas.background') {
      var c = stClone(scene.canvas); c.background = { fill: op.fill };
      return { title: scene.title, canvas: c, objects: objects };
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
    var base = { title: doc.title, canvas: { preset: doc.canvas.preset, w: doc.canvas.w, h: doc.canvas.h, background: { fill: '#ffffff' } }, objects: [] };
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
    if (!doc.canvas || !(doc.canvas.w > 0) || !(doc.canvas.h > 0)) errs.push('Missing canvas');
    if (!Array.isArray(doc.objects)) errs.push('Missing objects');
    if (!doc.ledger || !Array.isArray(doc.ledger.ops)) errs.push('Missing ledger');
    return errs;
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
    return { type: 'image', src: src || '', alt: alt || '', decorative: false, frame: frame, z: 5,
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
      { key: 'blank', emoji: '⬜', name: 'Blank canvas', desc: 'Start from nothing (portrait, landscape, or square).',
        make: function (now) {
          var d = stCreateDoc('letter-portrait', 'Untitled', now);
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
    var canvas = doc.canvas;
    for (var i = 0; i < doc.objects.length; i++) {
      var o = doc.objects[i];
      var f = o.frame;
      var pos = 'position:absolute;left:' + f.x + 'px;top:' + f.y + 'px;width:' + f.w + 'px;height:' + f.h + 'px;z-index:' + (o.z || 1) + ';margin:0;';
      if (o.type === 'text') {
        var run = (o.runs && o.runs[0]) || { text: '', style: {} };
        var s = run.style || {};
        var tag = o.role === 'heading1' ? 'h1' : o.role === 'heading2' ? 'h2' : o.role === 'heading3' ? 'h3' : 'p';
        var style = pos + 'font-size:' + (s.size || 16) + 'px;color:' + (s.color || '#111827') + ';font-weight:' + (s.bold ? '700' : '400') + ';text-align:' + (s.align || 'left') + ';white-space:pre-wrap;line-height:1.25;font-family:system-ui,sans-serif;overflow-wrap:break-word;';
        parts.push('<' + tag + ' style="' + style + '">' + stEscapeHtml(run.text) + '</' + tag + '>');
      } else if (o.type === 'image') {
        if (!o.src) continue; // empty frame — nothing to show OR announce
        if (o.decorative) {
          parts.push('<img src="' + o.src + '" alt="" role="presentation" style="' + pos + 'object-fit:cover;">');
        } else {
          parts.push('<img src="' + o.src + '" alt="' + stEscapeHtml(o.alt) + '" style="' + pos + 'object-fit:cover;">');
        }
      } else if (o.type === 'shape') {
        var radius = o.shape === 'ellipse' ? 'border-radius:50%;' : 'border-radius:8px;';
        parts.push('<div aria-hidden="true" style="' + pos + 'background:' + (o.fill || '#e2e8f0') + ';' + radius + '"></div>');
      }
    }
    return '<!DOCTYPE html>\n<html lang="' + lang + '">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>' + stEscapeHtml(doc.title) + '</title>\n<style>\n  body { margin: 0; background: #f1f5f9; font-family: system-ui, sans-serif; }\n  .st-page { position: relative; width: ' + canvas.w + 'px; height: ' + canvas.h + 'px; background: ' + (canvas.background && canvas.background.fill || '#ffffff') + '; margin: 24px auto; box-shadow: 0 2px 12px rgba(15,23,42,0.15); overflow: hidden; }\n  @media print { body { background: none; } .st-page { margin: 0; box-shadow: none; page-break-after: always; } }\n</style>\n</head>\n<body>\n<main class="st-page">\n' + parts.join('\n') + '\n</main>\n</body>\n</html>';
  }

  // ═══════════════════════════ [ST_PURE_END] ═══════════════════════════

  // ── PNG rasterizer (DOM canvas; approximate visual fidelity for MVP) ──
  function stRenderPng(doc, scale) {
    scale = scale || 1;
    return new Promise(function (resolvePng, rejectPng) {
      try {
        var c = document.createElement('canvas');
        c.width = Math.round(doc.canvas.w * scale); c.height = Math.round(doc.canvas.h * scale);
        var g = c.getContext('2d');
        g.scale(scale, scale);
        g.fillStyle = (doc.canvas.background && doc.canvas.background.fill) || '#ffffff';
        g.fillRect(0, 0, doc.canvas.w, doc.canvas.h);
        // Paint order = z, stable within equal z by array order
        var byZ = doc.objects.slice().sort(function (a, b) { return (a.z || 1) - (b.z || 1); });
        var pending = [];
        byZ.forEach(function (o) {
          var f = o.frame;
          if (o.type === 'shape') {
            g.fillStyle = o.fill || '#e2e8f0';
            if (o.shape === 'ellipse') { g.beginPath(); g.ellipse(f.x + f.w / 2, f.y + f.h / 2, f.w / 2, f.h / 2, 0, 0, Math.PI * 2); g.fill(); }
            else { g.fillRect(f.x, f.y, f.w, f.h); }
          } else if (o.type === 'text') {
            var run = (o.runs && o.runs[0]) || { text: '', style: {} };
            var s = run.style || {};
            g.fillStyle = s.color || '#111827';
            g.font = (s.bold ? '700 ' : '400 ') + (s.size || 16) + 'px system-ui, sans-serif';
            g.textBaseline = 'top';
            var lineH = Math.round((s.size || 16) * 1.25);
            var y = f.y;
            String(run.text || '').split('\n').forEach(function (para) {
              var words = para.split(/\s+/); var line = '';
              for (var wi = 0; wi < words.length; wi++) {
                var probe = line ? line + ' ' + words[wi] : words[wi];
                if (g.measureText(probe).width > f.w && line) {
                  stDrawAligned(g, line, f, y, s.align); y += lineH; line = words[wi];
                } else { line = probe; }
              }
              stDrawAligned(g, line, f, y, s.align); y += lineH;
            });
          } else if (o.type === 'image' && o.src) {
            pending.push(new Promise(function (res) {
              var im = new Image();
              im.onload = function () { res({ o: o, im: im }); };
              im.onerror = function () { res(null); };
              im.src = o.src;
            }));
          }
        });
        Promise.all(pending).then(function (loaded) {
          // Images painted after shapes/text of any z — acceptable MVP approximation
          // EXCEPT we honor z among images themselves by re-sorting.
          loaded.filter(Boolean).sort(function (a, b) { return (a.o.z || 1) - (b.o.z || 1); }).forEach(function (item) {
            var f = item.o.frame;
            try { g.drawImage(item.im, f.x, f.y, f.w, f.h); } catch (_) {}
          });
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
    var _drag = React.useRef(null); // {id, mode:'move'|'resize', startX, startY, frame0}
    var _dragLive = React.useState(null); var dragLive = _dragLive[0], setDragLive = _dragLive[1];
    var fileRef = React.useRef(null);
    var loadRef = React.useRef(null);
    var student = role === 'student';

    var doc = _docRef.current;
    var SCALE = 0.62; // canvas display scale (816 → ~506px, fits beside panels)

    var dispatch = function (opBody, actor) {
      try {
        stAppend(_docRef.current, opBody, actor || 'user', Date.now());
        bump();
      } catch (err) { addToast('AlloStudio: ' + (err && err.message || 'op failed'), 'error'); }
    };
    var selected = doc && selectedId ? doc.objects.filter(function (o) { return o.id === selectedId; })[0] : null;

    var startFromTemplate = function (tpl) {
      _docRef.current = tpl.make(Date.now());
      setView('edit'); setSelectedId(null);
      stAnnounce(TT('studio.a11y_started', 'Started a new document from template') + ': ' + tpl.name);
    };

    // ── object insertion ──
    var insertText = function (roleKind) {
      var obj = stMakeText(roleKind, roleKind === 'body' ? TT('studio.new_text', 'New text — double-click to edit') : TT('studio.new_heading', 'New heading'), { x: 60, y: 60, w: 400, h: roleKind === 'heading1' ? 70 : 50 });
      dispatch({ type: 'object.add', object: obj }, 'user');
    };
    var insertShape = function (kind) {
      dispatch({ type: 'object.add', object: stMakeShape(kind, { x: 80, y: 80, w: 240, h: 160 }, kind === 'ellipse' ? '#fce7f3' : '#dbeafe') }, 'user');
    };
    var onPickImage = function (ev) {
      var f = ev.target.files && ev.target.files[0];
      ev.target.value = '';
      if (!f) return;
      var r = new FileReader();
      r.onload = function (e) {
        // actor 'import': the asset came from outside the editor — the ledger
        // labels it honestly (we cannot see inside an uploaded image).
        dispatch({ type: 'object.add', object: stMakeImage(e.target.result, '', { x: 100, y: 100, w: 320, h: 240 }, 'upload') }, 'import');
        addToast(TT('studio.image_added', '🖼️ Image added — give it alt text (or mark it decorative) before exporting.'), 'info');
      };
      r.readAsDataURL(f);
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
    var altFailures = doc ? stAltGate(doc.objects) : [];
    var download = function (blob, name) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a); a.click();
      setTimeout(function () { try { URL.revokeObjectURL(a.href); a.remove(); } catch (_) {} }, 1500);
    };
    var safeName = function () { return (doc.title || 'allostudio').replace(/[^\wÀ-￿ -]+/g, '').trim().replace(/ +/g, '_') || 'allostudio'; };
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
      overlay: { position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px' },
      shell: { background: '#f8fafc', borderRadius: '14px', width: 'min(1220px, 98vw)', height: 'min(860px, 96vh)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 8px 40px rgba(15,23,42,0.4)', fontFamily: 'system-ui, sans-serif' },
      header: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#0f172a', color: '#fff' },
      hBtn: { padding: '6px 12px', borderRadius: '8px', border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: '12px', fontWeight: 700, cursor: 'pointer' },
      body: { flex: 1, display: 'flex', minHeight: 0 },
      panel: { width: '215px', padding: '10px', overflowY: 'auto', background: '#fff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' },
      rpanel: { width: '250px', padding: '10px', overflowY: 'auto', background: '#fff', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' },
      tool: { padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '12px', fontWeight: 700, color: '#334155', cursor: 'pointer', textAlign: 'left' },
      label: { fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', marginTop: '4px' },
      input: { width: '100%', boxSizing: 'border-box', padding: '5px 7px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px' },
    };

    if (!doc || view === 'templates') {
      // ── template picker ──
      return h('div', { className: 'st-root', style: S.overlay, role: 'dialog', 'aria-modal': true, 'aria-label': TT('studio.title', 'AlloStudio') },
        h('div', { style: Object.assign({}, S.shell, { width: 'min(860px, 96vw)', height: 'auto', maxHeight: '92vh' }) },
          h('div', { style: S.header },
            h('span', { style: { fontSize: '18px' }, 'aria-hidden': true }, '🎨'),
            h('strong', { style: { fontSize: '15px' } }, TT('studio.title', 'AlloStudio')),
            h('span', { style: { fontSize: '11px', color: '#94a3b8' } }, TT('studio.tagline', 'Flyers, worksheets & posters — accessible by construction')),
            h('button', { style: Object.assign({}, S.hBtn, { marginLeft: 'auto' }), onClick: function () { if (loadRef.current) loadRef.current.click(); } }, '📂 ' + TT('studio.open_file', 'Open .allostudio.json')),
            h('button', { style: S.hBtn, 'aria-label': TT('studio.close', 'Close AlloStudio'), onClick: props.onClose }, '✕')),
          h('div', { style: { padding: '18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '12px', overflowY: 'auto' } },
            stTemplates().map(function (tpl) {
              return h('button', { key: tpl.key, onClick: function () { startFromTemplate(tpl); }, style: { textAlign: 'left', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'flex-start' } },
                h('span', { style: { fontSize: '26px' }, 'aria-hidden': true }, tpl.emoji),
                h('span', null,
                  h('strong', { style: { display: 'block', fontSize: '14px', color: '#0f172a' } }, tpl.name),
                  h('span', { style: { fontSize: '11px', color: '#64748b' } }, tpl.desc)));
            })),
          h('p', { style: { margin: '0 18px 14px', fontSize: '11px', color: '#64748b' } },
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
      return h('div', { className: 'st-root', style: S.overlay, role: 'dialog', 'aria-modal': true, 'aria-label': TT('studio.process_title_teacher', 'Process timeline') },
        h('div', { style: S.shell },
          h('div', { style: S.header },
            h('span', { style: { fontSize: '18px' }, 'aria-hidden': true }, '🎞️'),
            h('strong', null, student ? TT('studio.process_title_student', 'My process') : TT('studio.process_title_teacher', 'Process timeline')),
            h('button', { style: Object.assign({}, S.hBtn, { marginLeft: 'auto' }), onClick: function () { setScrubSeq(null); setView('edit'); } }, '← ' + TT('studio.back_to_editing', 'Back to editing'))),
          h('div', { style: { display: 'flex', flex: 1, minHeight: 0 } },
            h('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px', overflow: 'auto' } },
              h('div', { style: { position: 'relative', width: doc.canvas.w * 0.45 + 'px', height: doc.canvas.h * 0.45 + 'px', background: (scene.canvas.background && scene.canvas.background.fill) || '#fff', boxShadow: '0 2px 10px rgba(15,23,42,0.2)', overflow: 'hidden', flexShrink: 0 } },
                scene.objects.map(function (o) { return renderObject(o, 0.45, null, {}, h); })),
              h('label', { style: { width: '90%', marginTop: '12px', fontSize: '12px', color: '#334155', fontWeight: 700 } },
                TT('studio.scrub_label', 'Scrub the timeline') + ' — ' + at + ' / ' + maxSeq,
                h('input', { type: 'range', min: 0, max: maxSeq, value: at, style: { width: '100%' }, 'aria-valuetext': TT('studio.scrub_step', 'step') + ' ' + at + ' ' + TT('studio.of', 'of') + ' ' + maxSeq, onChange: function (e) { setScrubSeq(parseInt(e.target.value, 10)); } }))),
            h('div', { style: Object.assign({}, S.rpanel, { width: '300px' }) },
              h('div', { style: { padding: '10px', background: '#eef2ff', borderRadius: '10px', fontSize: '12px', color: '#312e81', fontWeight: 700 } },
                summary.user + ' ' + TT('studio.ops_you', 'edits by ' + (student ? 'you' : 'the student')) + ' · ' + summary.ai + ' ' + TT('studio.ops_ai', 'AI actions') + ' · ' + summary.import + ' ' + TT('studio.ops_import', 'imported items'),
                h('div', { style: { fontWeight: 400, marginTop: '4px', color: '#4338ca' } }, '≈' + mins + ' ' + TT('studio.active_minutes', 'active minutes in the editor'))),
              h('p', { style: { fontSize: '11px', color: '#64748b', margin: '2px 0 6px' } }, TT('studio.honesty_line', ST_HONESTY_LINE)),
              h('div', { style: S.label }, TT('studio.recent_steps', 'Steps (latest first)')),
              h('div', { style: { overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' } },
                ops.slice(-120).reverse().map(function (op) {
                  var chip = op.actor === 'ai' ? { bg: '#f3e8ff', fg: '#7c2d12', label: 'AI' } : op.actor === 'import' ? { bg: '#fef3c7', fg: '#92400e', label: TT('studio.actor_import', 'import') } : { bg: '#dcfce7', fg: '#166534', label: TT('studio.actor_user', 'you') };
                  return h('div', { key: op.seq, style: { display: 'flex', gap: '6px', alignItems: 'center', fontSize: '11px', color: '#334155', padding: '2px 4px', background: op.seq === at ? '#e0e7ff' : 'transparent', borderRadius: '4px' } },
                    h('button', { onClick: function () { setScrubSeq(op.seq); }, style: { border: 'none', background: 'none', cursor: 'pointer', color: '#6366f1', fontWeight: 700, fontSize: '11px', padding: 0 }, 'aria-label': TT('studio.jump_to_step', 'Jump to step') + ' ' + op.seq }, '#' + op.seq),
                    h('span', { style: { background: chip.bg, color: chip.fg, borderRadius: '999px', padding: '0 7px', fontWeight: 700, fontSize: '10px' } }, chip.label),
                    h('span', null, op.type + (op.template ? ' (' + op.template + ')' : '')));
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
        outline: isSel ? '2px solid #6366f1' : '1px dashed transparent',
      };
      var inner = null;
      if (o.type === 'text') {
        var run = (o.runs && o.runs[0]) || { text: '', style: {} };
        var s = run.style || {};
        inner = hh('div', { style: { fontSize: (s.size || 16) * scale + 'px', color: s.color || '#111827', fontWeight: s.bold ? 700 : 400, textAlign: s.align || 'left', whiteSpace: 'pre-wrap', lineHeight: 1.25, overflow: 'hidden', width: '100%', height: '100%', overflowWrap: 'break-word' } }, run.text);
      } else if (o.type === 'image') {
        inner = o.src
          ? hh('img', { src: o.src, alt: '', draggable: false, style: { width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' } })
          : hh('div', { style: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', border: '2px dashed #cbd5e1', borderRadius: '8px', fontSize: 12 * scale + 'px', color: '#64748b', pointerEvents: 'none' } }, '🖼️ ' + TT('studio.image_placeholder', 'Image frame'));
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
          style: { position: 'absolute', right: '-7px', bottom: '-7px', width: '14px', height: '14px', background: '#6366f1', border: '2px solid #fff', borderRadius: '4px', cursor: 'nwse-resize' },
        }) : null,
        (editingText && editingText.id === o.id) ? hh('textarea', {
          autoFocus: true,
          defaultValue: editingText.value,
          'aria-label': TT('studio.edit_text', 'Edit text'),
          style: { position: 'absolute', inset: 0, fontSize: (((o.runs && o.runs[0] && o.runs[0].style && o.runs[0].style.size) || 16) * scale) + 'px', border: '2px solid #6366f1', borderRadius: '4px', resize: 'none', padding: '2px', background: '#fff' },
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
      return h('div', { key: o.id, style: { display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 4px', borderRadius: '6px', background: selectedId === o.id ? '#e0e7ff' : '#f8fafc', border: '1px solid #e2e8f0' } },
        h('button', { onClick: function () { setSelectedId(o.id); }, style: { flex: 1, textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', fontSize: '11px', color: '#334155', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }, 'aria-label': TT('studio.select_object', 'Select') + ' ' + o.type + ' ' + text },
          h('span', { 'aria-hidden': true }, icon + ' '), (i + 1) + '. ' + text),
        h('button', { disabled: i === 0, onClick: function () { dispatch({ type: 'object.reorder', target: o.id, toIndex: i - 1 }, 'user'); stAnnounce(TT('studio.a11y_moved_earlier', 'Moved earlier in reading order')); }, title: TT('studio.reading_earlier', 'Read earlier'), 'aria-label': TT('studio.reading_earlier', 'Read earlier') + ' — ' + text, style: { border: '1px solid #cbd5e1', background: '#fff', borderRadius: '4px', cursor: i === 0 ? 'default' : 'pointer', fontSize: '10px', opacity: i === 0 ? 0.4 : 1 } }, '↑'),
        h('button', { disabled: i === doc.objects.length - 1, onClick: function () { dispatch({ type: 'object.reorder', target: o.id, toIndex: i + 1 }, 'user'); stAnnounce(TT('studio.a11y_moved_later', 'Moved later in reading order')); }, title: TT('studio.reading_later', 'Read later'), 'aria-label': TT('studio.reading_later', 'Read later') + ' — ' + text, style: { border: '1px solid #cbd5e1', background: '#fff', borderRadius: '4px', cursor: i === doc.objects.length - 1 ? 'default' : 'pointer', fontSize: '10px', opacity: i === doc.objects.length - 1 ? 0.4 : 1 } }, '↓'));
    });

    var propPanel = null;
    if (selected) {
      var frameInput = function (key, label) {
        return h('label', { style: { fontSize: '10px', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '2px' } }, label,
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
        selected.type === 'text' ? h('label', { style: { fontSize: '10px', color: '#64748b' } }, TT('studio.text_role', 'Role (sets the exported tag)'),
          h('select', { value: selected.role, style: S.input, onChange: function (e) { dispatch({ type: 'object.update', target: selected.id, patch: { role: e.target.value } }, 'user'); } },
            h('option', { value: 'heading1' }, 'Heading 1'), h('option', { value: 'heading2' }, 'Heading 2'), h('option', { value: 'heading3' }, 'Heading 3'), h('option', { value: 'body' }, TT('studio.body_text', 'Body text')))) : null,
        selected.type === 'text' ? h('label', { style: { fontSize: '10px', color: '#64748b' } }, TT('studio.font_size', 'Font size'),
          h('input', { type: 'number', min: 8, max: 120, value: (selected.runs[0].style && selected.runs[0].style.size) || 16, style: S.input, onChange: function (e) { var v = parseInt(e.target.value, 10); if (isNaN(v)) return; var runs = stClone(selected.runs); runs[0].style.size = Math.max(8, Math.min(120, v)); dispatch({ type: 'object.update', target: selected.id, patch: { runs: runs } }, 'user'); } })) : null,
        selected.type === 'text' ? h('label', { style: { fontSize: '10px', color: '#64748b' } }, TT('studio.text_color', 'Text color'),
          h('input', { type: 'color', value: (selected.runs[0].style && selected.runs[0].style.color) || '#111827', style: Object.assign({}, S.input, { padding: '2px', height: '30px' }), onChange: function (e) { var runs = stClone(selected.runs); runs[0].style.color = e.target.value; dispatch({ type: 'object.update', target: selected.id, patch: { runs: runs } }, 'user'); } })) : null,
        selected.type === 'shape' ? h('label', { style: { fontSize: '10px', color: '#64748b' } }, TT('studio.fill', 'Fill'),
          h('input', { type: 'color', value: selected.fill || '#dbeafe', style: Object.assign({}, S.input, { padding: '2px', height: '30px' }), onChange: function (e) { dispatch({ type: 'object.update', target: selected.id, patch: { fill: e.target.value } }, 'user'); } })) : null,
        selected.type === 'image' ? h('div', null,
          h('label', { style: { fontSize: '10px', color: '#64748b' } }, TT('studio.alt_text', 'Alt text (what a screen reader hears)'),
            // key by object id: switching selection remounts with the right
            // defaultValue; commit-on-blur = ONE object.update op per edit.
            h('textarea', { key: 'alt-' + selected.id, defaultValue: selected.alt || '', rows: 3, style: Object.assign({}, S.input, { resize: 'vertical' }), 'data-st-alt-input': selected.id,
              onKeyDown: function (e) { e.stopPropagation(); },
              onBlur: function (e) { if (e.target.value !== (selected.alt || '')) dispatch({ type: 'object.update', target: selected.id, patch: { alt: e.target.value } }, 'user'); } })),
          h('label', { style: { fontSize: '11px', color: '#334155', display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' } },
            h('input', { type: 'checkbox', checked: !!selected.decorative, onChange: function (e) { dispatch({ type: 'object.update', target: selected.id, patch: { decorative: e.target.checked } }, 'user'); } }),
            TT('studio.decorative', 'Decorative (skip in screen readers)')),
          h('button', { style: Object.assign({}, S.tool, { marginTop: '4px' }), onClick: function () { if (fileRef.current) { fileRef.current.setAttribute('data-st-replace', selected.id); fileRef.current.click(); } } }, '🔁 ' + TT('studio.replace_image', 'Replace image…'))) : null,
        h('div', { style: { display: 'flex', gap: '4px', marginTop: '4px' } },
          h('button', { style: S.tool, onClick: function () { dispatch({ type: 'object.z', target: selected.id, z: (selected.z || 1) + 1 }, 'user'); }, title: TT('studio.bring_forward', 'Bring forward (visual stacking only — reading order is the list)') }, '⬆ z'),
          h('button', { style: S.tool, onClick: function () { dispatch({ type: 'object.z', target: selected.id, z: Math.max(0, (selected.z || 1) - 1) }, 'user'); }, title: TT('studio.send_back', 'Send backward') }, '⬇ z'),
          h('button', { style: Object.assign({}, S.tool, { color: '#b91c1c', borderColor: '#fca5a5' }), onClick: function () { dispatch({ type: 'object.remove', target: selected.id }, 'user'); setSelectedId(null); } }, '🗑')));
    }

    // Ctrl+Z / Ctrl+Y (and Ctrl+Shift+Z) — skipped while typing in a field so
    // the browser's native text undo keeps working inside inputs/textareas
    // (the object-level keyboard grammar stays on the objects themselves).
    var onShellKeyDown = function (ev) {
      if (!(ev.ctrlKey || ev.metaKey)) return;
      var tag = (ev.target && ev.target.tagName || '').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      var k = (ev.key || '').toLowerCase();
      if (k === 'z' && !ev.shiftKey) { ev.preventDefault(); if (stUndo(_docRef.current)) { bump(); stAnnounce(TT('studio.a11y_undone', 'Undone')); } }
      else if (k === 'y' || (k === 'z' && ev.shiftKey)) { ev.preventDefault(); if (stRedo(_docRef.current)) { bump(); stAnnounce(TT('studio.a11y_redone', 'Redone')); } }
    };
    return h('div', { className: 'st-root', style: S.overlay, role: 'dialog', 'aria-modal': true, 'aria-label': TT('studio.title', 'AlloStudio'), onKeyDown: onShellKeyDown },
      h('div', { style: S.shell },
        // header
        h('div', { style: S.header },
          h('span', { style: { fontSize: '18px' }, 'aria-hidden': true }, '🎨'),
          // Uncontrolled + commit-on-blur: one clean doc.retitle op instead of
          // an op per keystroke polluting the process timeline.
          h('input', { defaultValue: doc.title, 'aria-label': TT('studio.doc_title', 'Document title'), style: { background: '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '8px', padding: '5px 10px', fontSize: '13px', fontWeight: 700, width: '220px' },
            onBlur: function (e) { if (e.target.value !== doc.title) dispatch({ type: 'doc.retitle', title: e.target.value }, 'user'); },
            onKeyDown: function (e) { if (e.key === 'Enter') e.target.blur(); } }),
          h('button', { style: S.hBtn, onClick: function () { if (stUndo(_docRef.current)) { bump(); } }, 'aria-label': TT('studio.undo', 'Undo') }, '↩ ' + TT('studio.undo', 'Undo')),
          h('button', { style: S.hBtn, onClick: function () { if (stRedo(_docRef.current)) { bump(); } }, 'aria-label': TT('studio.redo', 'Redo') }, '↪ ' + TT('studio.redo', 'Redo')),
          h('button', { style: S.hBtn, onClick: function () { setView('process'); } }, '🎞️ ' + (student ? TT('studio.process_title_student', 'My process') : TT('studio.process_title_teacher', 'Process timeline'))),
          h('button', { style: Object.assign({}, S.hBtn, { background: student ? '#7c3aed' : '#1e293b' }), 'aria-pressed': student, title: TT('studio.role_toggle_hint', 'Student mode uses portfolio framing for the process view'), onClick: function () { setRole(student ? 'teacher' : 'student'); } }, student ? '🎓 ' + TT('studio.role_student', 'Student mode') : '🧑‍🏫 ' + TT('studio.role_teacher', 'Teacher mode')),
          h('span', { style: { marginLeft: 'auto' } }),
          h('button', { style: S.hBtn, onClick: saveDoc }, '💾 ' + TT('studio.save', 'Save')),
          h('button', { style: Object.assign({}, S.hBtn, { background: '#2563eb', borderColor: '#1e3a8a' }), onClick: function () { setExportOpen(!exportOpen); }, 'aria-expanded': exportOpen }, '📤 ' + TT('studio.export', 'Export')),
          h('button', { style: S.hBtn, 'aria-label': TT('studio.close', 'Close AlloStudio'), onClick: props.onClose }, '✕')),
        // export panel
        exportOpen ? h('div', { style: { padding: '10px 14px', background: '#eef2ff', borderBottom: '1px solid #c7d2fe', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } },
          h('button', { style: S.tool, onClick: exportTagged }, '📄 ' + TT('studio.export_tagged', 'Tagged PDF (accessible)')),
          h('button', { style: S.tool, onClick: exportHtml }, '🌐 ' + TT('studio.export_html', 'Accessible HTML')),
          h('button', { style: S.tool, onClick: exportPng }, '🖼️ PNG'),
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
            h('div', { style: S.label }, TT('studio.page', 'Page')),
            h('label', { style: { fontSize: '10px', color: '#64748b' } }, TT('studio.background', 'Background'),
              h('input', { type: 'color', value: (doc.canvas.background && doc.canvas.background.fill) || '#ffffff', style: Object.assign({}, S.input, { padding: '2px', height: '30px' }), onChange: function (e) { dispatch({ type: 'canvas.background', fill: e.target.value }, 'user'); } })),
            h('p', { style: { fontSize: '10px', color: '#94a3b8', marginTop: 'auto' } }, TT('studio.keyboard_hint', 'Tip: Tab focuses objects; arrows move, Shift+arrows resize, Delete removes. The panel on the right is the reading order.'))),
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
            propPanel || h('p', { style: { fontSize: '11px', color: '#94a3b8' } }, TT('studio.no_selection', 'Select an object on the canvas (or in the list above) to edit its properties.')))),
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
        h('input', { ref: loadRef, type: 'file', accept: '.json,application/json', style: { display: 'none' }, onChange: onLoadFile })));
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
  AlloStudio.stTemplates = stTemplates;
  AlloStudio.stExportHtml = stExportHtml;
  AlloStudio.stEscapeHtml = stEscapeHtml;
  AlloStudio.stClampFrame = stClampFrame;
  AlloStudio.ST_HONESTY_LINE = ST_HONESTY_LINE;
  AlloStudio.ST_CANVAS_PRESETS = ST_CANVAS_PRESETS;
  AlloStudio.ST_CHECKPOINT_EVERY = ST_CHECKPOINT_EVERY;
  window.AlloModules.AlloStudio = AlloStudio;
})();
