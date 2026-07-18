// ═══════════════════════════════════════════
// stem_tool_freeforms.js — Free Forms: a constructive 3D "World of Forms"
//
// ARCHITECTURE NOTES (for contributors)
// ─────────────────────────────────────
// The inverse of the Visual Organizer's AI-filled 3D views: here the STUDENT
// authors the content and the AI only coaches. Pick an archetypal form (any of
// the 12 organizer-shaped spatial grammars from the ConceptGraph engine, or a
// free space), populate it by hand, arrange it in 3D, sculpt per-idea Prim3D
// art, then ask the AI to assess the composition as a whole.
//
// Reused organs (all lazy-loaded from the CDN root, same trick as geosandbox's
// ensurePrim3d):
//   • concept_graph_engine_module.js — acg/v1 graphs, applyStructureLayout
//     (the organizer-shaped grammars), arrangements.
//   • concept_graph_3d_module.js — the orbitable editable WebGL view with its
//     own a11y reading spine + graceful WebGL fallback.
//   • prim3d_module.js — recipe sculptures (same engine as Memory Palace and
//     Geometry Sandbox AI-Sculpt). Recipes are small JSON → safe to persist.
//
// State (in ctx.toolData.freeForms):
//   scaffold: <structureType> | 'free' | null (null = picker screen)
//   title, rev (bump = remount the 3D view), nextId (stable uid counter)
//   groups: [{ id, title, items: [{ id, text, note }] }]   ← the SOURCE OF TRUTH
//   arrangement: {axes, axisValues, categories} | null      ← 3D placement edits
//   nodeArt: { nodeId: { type:'object', recipe } }          ← Prim3D recipes ONLY
//   assessment: { strengths[], questions[], suggestions[] } | null
//
// Design rules:
//   1. The DOM authoring panel is the accessible source of truth — every create/
//      rename/delete is a plain button/input, no in-canvas-only affordance. The
//      3D view adds spatial arrangement on top (drag / strand chips / nudges via
//      the cg3d editable contract) and stays fully usable by keyboard.
//   2. Strand moves made INSIDE the 3D view reconcile BACK into the groups doc
//      (ffReconcileMembership), so sidebar and space never disagree.
//   3. Structural edits bump doc.rev → the 3D view remounts (entrance stagger);
//      arrangement edits persist WITHOUT a remount (the live handle already moved).
//   4. AI is optional everywhere: no callGemini ⇒ sculpt/assess hide, the
//      constructive core still works. Assessment is formative — no grades, no
//      scores, never rewrites student text.
//   5. Sculptures persist as recipes (tiny JSON), never images — a whole world
//      stays saveable.
//
// PURE, unit-tested seams on window.StemLab.ffPure: ffNewDoc / ffGraphFromDoc /
// ffComposeGraph / ffReconcileMembership / ffRenameCategory / ffBuildAssessPrompt /
// ffParseAssessment / ffStats / FF_SCAFFOLDS.
// Contributors: run `node --check` after edits; tests at
// tests/freeforms_pure.test.js.
// ═══════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

(function() {
  'use strict';

  // ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEM Lab tools ──
  (function() {
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();

  // ── Accessibility live region (WCAG 4.1.3) ──
  function announce(msg) {
    try {
      var lr = document.getElementById('allo-live-freeforms');
      if (!lr) {
        lr = document.createElement('div');
        lr.id = 'allo-live-freeforms';
        lr.setAttribute('aria-live', 'polite');
        lr.setAttribute('aria-atomic', 'true');
        lr.setAttribute('role', 'status');
        lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
        document.body.appendChild(lr);
      }
      lr.textContent = msg;
    } catch (e) {}
  }

  // Scoped contrast + focus lift (same conventions as the other 3D lab tools).
  (function() {
    if (document.getElementById('allo-freeforms-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-freeforms-css';
    st.textContent = [
      '#allo-free-forms { color: #f8fafc; }',
      '#allo-free-forms button:focus-visible, #allo-free-forms input:focus-visible, #allo-free-forms select:focus-visible, #allo-free-forms textarea:focus-visible { outline: 3px solid #facc15 !important; outline-offset: 2px !important; box-shadow: 0 0 0 5px rgba(250,204,21,0.28) !important; }',
      '#allo-free-forms input::placeholder, #allo-free-forms textarea::placeholder { color: #cbd5e1 !important; opacity: 1 !important; }',
      '#allo-free-forms .ff-card { transition: transform 0.15s ease, border-color 0.15s ease; }',
      '#allo-free-forms .ff-card:hover { transform: translateY(-2px); border-color: #a78bfa; }',
      '@media (max-width: 900px) { #allo-free-forms .ff-split { flex-direction: column !important; } #allo-free-forms .ff-sidebar { width: 100% !important; max-height: 42vh; } #allo-free-forms .ff-stage { min-height: 380px; } }',
      '@media (forced-colors: active) { #allo-free-forms button, #allo-free-forms input, #allo-free-forms textarea { forced-color-adjust: auto; border: 1px solid CanvasText !important; } }'
    ].join('\n');
    document.head.appendChild(st);
  })();

  // ── Module loaders (CDN-root discovery, same regex trick as geosandbox) ──
  function _cdnBase() {
    var base = 'https://alloflow-cdn.pages.dev/', q = '';
    try {
      var scr = document.querySelectorAll('script[src]');
      for (var i = 0; i < scr.length; i++) {
        var src = scr[i].getAttribute('src') || '';
        var m = src.match(/^(.*\/)(?:stem_lab\/stem_tool_freeforms|stem_lab\/stem_tool_geosandbox|memory_palace_module|concept_graph_3d_module|prim3d_module)\.js(\?.*)?$/);
        if (m) { base = m[1]; q = m[2] || ''; break; }
      }
    } catch (e) {}
    return { base: base, q: q };
  }
  function _loadScript(file, check, cb) {
    if (check()) { cb(true); return; }
    var b = _cdnBase();
    try {
      var el = document.createElement('script'); el.src = b.base + file + b.q; el.async = true;
      el.onload = function() { cb(!!check()); };
      el.onerror = function() { cb(false); };
      document.head.appendChild(el);
    } catch (e) { cb(false); }
  }
  function ensureConceptGraph(cb) {
    _loadScript('concept_graph_engine_module.js',
      function() { return window.AlloModules && window.AlloModules.ConceptGraphEngine; },
      function(okE) {
        if (!okE) { cb(false); return; }
        _loadScript('concept_graph_3d_module.js',
          function() { return window.AlloModules && window.AlloModules.ConceptGraph3D; },
          cb);
      });
  }
  function ensurePrim3d(cb) {
    _loadScript('prim3d_module.js',
      function() { return window.AlloModules && window.AlloModules.Prim3D; },
      cb);
  }

  // ═══ PURE CORE (window.StemLab.ffPure) ═══════════════════════════════

  // The archetypal forms. `type` feeds engine.applyStructureLayout verbatim
  // ('free' opts out); `grammar` is reused by the picker AND the assessment
  // prompt so the AI judges against the same spatial meaning the student saw;
  // `starters` seed renamable group titles (student content, not UI strings).
  var FF_SCAFFOLDS = [
    { type: 'Structured Outline', icon: '\u{1FA9C}', name: 'Outline Cascade', grammar: 'sections step down like a staircase in reading order, each carrying its details', starters: ['Section 1', 'Section 2', 'Section 3'] },
    { type: 'Venn Diagram', icon: '\u{1FAE7}', name: 'Venn', grammar: 'two overlapping sets — items true of both float in the shared lens between the clusters', starters: ['Set A', 'Set B', 'Shared'] },
    { type: 'T-Chart', icon: '\u{1F9F1}', name: 'T-Chart', grammar: 'two contrasting columns standing as walls that face each other across a gap', starters: ['Left', 'Right'] },
    { type: 'Fishbone', icon: '\u{1F41F}', name: 'Fishbone', grammar: 'cause categories as ribs angling into a spine that points at the central effect', starters: ['Category 1', 'Category 2', 'Category 3', 'Category 4'] },
    { type: 'Cause and Effect', icon: '⚡', name: 'Cause & Effect', grammar: 'causes flow into the central event, which flows out to its effects', starters: ['Causes', 'Effects'] },
    { type: 'Frayer Model', icon: '\u{1F532}', name: 'Frayer Model', grammar: 'one term at the very center with four corner clusters around it', starters: ['Definition', 'Characteristics', 'Examples', 'Non-Examples'] },
    { type: 'KWL Chart', icon: '\u{1F9ED}', name: 'KWL Journey', grammar: 'three stations along a learning journey that bends through depth', starters: ['Know', 'Want to Know', 'Learned'] },
    { type: 'See-Think-Wonder', icon: '\u{1F441}️', name: 'See-Think-Wonder', grammar: 'observing, interpreting, and questioning as three linked stations', starters: ['See', 'Think', 'Wonder'] },
    { type: 'Claim-Evidence-Reasoning', icon: '\u{1F3D7}️', name: 'Claim-Evidence-Reasoning', grammar: 'evidence pillars at the base hold up the reasoning, which holds up the claim', starters: ['Claim', 'Evidence', 'Reasoning'] },
    { type: 'Story Map', icon: '⛰️', name: 'Story Mountain', grammar: 'story stages climb to the climax and descend to the resolution — height is tension', starters: ['Exposition', 'Rising Action', 'Climax', 'Falling Action', 'Resolution'] },
    { type: 'Flow Chart', icon: '\u{1F300}', name: 'Flow Path', grammar: 'steps advance along a corkscrew path through space', starters: ['Step 1', 'Step 2', 'Step 3'] },
    { type: 'Key Concept Map', icon: '\u{1FA90}', name: 'Orbit Map', grammar: 'idea clusters orbit one central concept like moons', starters: ['Idea A', 'Idea B', 'Idea C'] },
    { type: 'Problem Solution', icon: '\u{1F6E0}️', name: 'Problem & Solutions', grammar: 'solution clusters orbit the central problem', starters: ['Solution 1', 'Solution 2'] },
    { type: 'free', icon: '✨', name: 'Free Space', grammar: 'no template — your groups become floating layers you arrange however you like', starters: ['Ideas'] }
  ];
  function ffScaffold(type) {
    for (var i = 0; i < FF_SCAFFOLDS.length; i++) { if (FF_SCAFFOLDS[i].type === type) return FF_SCAFFOLDS[i]; }
    return null;
  }

  function ffNewDoc(scaffoldType) {
    var sc = ffScaffold(scaffoldType);
    var starters = (sc && sc.starters) || ['Ideas'];
    return {
      scaffold: scaffoldType || null,
      title: '',
      rev: 1,
      nextId: starters.length + 1,
      groups: starters.map(function(title, i) { return { id: 'g' + (i + 1), title: title, items: [] }; }),
      arrangement: null,
      nodeArt: {},
      assessment: null,
      _xp: {}
    };
  }

  // Doc → acg/v1 graph with STABLE ids (uids survive insert/delete, so saved
  // arrangements and sculptures never mis-key the way index-derived ids would).
  function ffGraphFromDoc(doc) {
    var g = { version: 'acg/v1', title: (doc && doc.title) || '', axes: null, nodes: [], edges: [], layers: [], meta: { generated: { structureType: (doc && doc.scaffold && doc.scaffold !== 'free') ? doc.scaffold : null } } };
    g.nodes.push({ id: 'root', label: (doc && doc.title) || 'My World of Forms', type: 'main', x: 0, y: 0, z: 0, category: null });
    ((doc && doc.groups) || []).forEach(function(grp) {
      g.nodes.push({ id: grp.id, label: grp.title, type: 'branch', x: 0, y: 0, z: 0, category: grp.title });
      g.edges.push({ id: 'e_root_' + grp.id, fromId: 'root', toId: grp.id, type: 'elaborates' });
      (grp.items || []).forEach(function(it) {
        g.nodes.push({ id: it.id, label: it.text, type: 'item', x: 0, y: 0, z: 0, category: grp.title, summary: it.note || '' });
        g.edges.push({ id: 'e_' + grp.id + '_' + it.id, fromId: grp.id, toId: it.id, type: 'elaborates' });
      });
    });
    return g;
  }

  // Full pipeline: doc → shaped layout → default fill → saved arrangement wins.
  function ffComposeGraph(doc, E) {
    var g = ffGraphFromDoc(doc);
    if (doc && doc.scaffold && doc.scaffold !== 'free' && E.applyStructureLayout) g = E.applyStructureLayout(g, { structureType: doc.scaffold });
    if (E.ensureDefaultAxisValues) g = E.ensureDefaultAxisValues(g);
    if (doc && doc.arrangement && E.applyArrangement) g = E.applyArrangement(g, doc.arrangement);
    return g;
  }

  // Strand moves made inside the 3D view (categories = {nodeId: groupTitle})
  // reconcile back into the groups doc so the sidebar agrees with the space.
  // Returns { doc, moved } — doc is a NEW object only when something moved.
  function ffReconcileMembership(doc, categories) {
    if (!doc || !categories) return { doc: doc, moved: 0 };
    var byTitle = {};
    (doc.groups || []).forEach(function(g) { if (byTitle[g.title] == null) byTitle[g.title] = g.id; });
    var moves = [];
    (doc.groups || []).forEach(function(g) {
      (g.items || []).forEach(function(it) {
        var target = categories[it.id];
        if (typeof target === 'string' && target && target !== g.title && byTitle[target] != null) {
          moves.push({ item: it, fromId: g.id, toId: byTitle[target] });
        }
      });
    });
    if (!moves.length) return { doc: doc, moved: 0 };
    var groups = doc.groups.map(function(g) { return Object.assign({}, g, { items: (g.items || []).slice() }); });
    var byId = {}; groups.forEach(function(g) { byId[g.id] = g; });
    moves.forEach(function(mv) {
      var from = byId[mv.fromId], to = byId[mv.toId];
      var idx = from.items.indexOf(mv.item);
      if (idx >= 0) { from.items.splice(idx, 1); to.items.push(mv.item); }
    });
    return { doc: Object.assign({}, doc, { groups: groups }), moved: moves.length };
  }

  // Group rename: keep a saved arrangement's category strings in step.
  function ffRenameCategory(arrangement, oldTitle, newTitle) {
    if (!arrangement || !arrangement.categories || oldTitle === newTitle) return arrangement;
    var cats = {}, changed = false;
    Object.keys(arrangement.categories).forEach(function(id) {
      var v = arrangement.categories[id];
      if (v === oldTitle) { cats[id] = newTitle; changed = true; } else { cats[id] = v; }
    });
    return changed ? Object.assign({}, arrangement, { categories: cats }) : arrangement;
  }

  function ffStats(doc) {
    var groups = 0, items = 0, notes = 0, sculpted = 0;
    ((doc && doc.groups) || []).forEach(function(g) {
      groups++;
      (g.items || []).forEach(function(it) {
        items++;
        if (it.note && String(it.note).trim()) notes++;
        if (doc.nodeArt && doc.nodeArt[it.id]) sculpted++;
      });
    });
    return { groups: groups, items: items, notes: notes, sculpted: sculpted };
  }

  // Formative whole-composition feedback. Deliberately: no grades, no scores,
  // questions never contain answers, never rewrites student text. The prompt
  // shows the SAME spatial grammar the student saw, so the AI assesses meaning
  // against the form's logic — it never sees pixels (semantics-first, like the
  // whole ConceptGraph stack).
  function ffBuildAssessPrompt(doc) {
    var sc = ffScaffold(doc && doc.scaffold);
    var lines = [
      'You are a warm, encouraging teacher looking at a 3D composition a student built themselves in a tool called Free Forms.',
      sc && sc.type !== 'free'
        ? 'They built it inside the "' + sc.name + '" form, whose spatial grammar is: ' + sc.grammar + '.'
        : 'They built it in free space (no template), arranging groups of ideas however they liked.',
      (doc && doc.title && doc.title.trim()) ? 'Their title: "' + doc.title.trim() + '"' : 'They have not titled it yet.',
      '',
      'Their groups and ideas (notes in parentheses are their own annotations; [sculpted] means they built a small 3D artwork for that idea):'
    ];
    ((doc && doc.groups) || []).forEach(function(g) {
      var row = '- ' + g.title + ':';
      var parts = (g.items || []).map(function(it) {
        var s = '"' + it.text + '"';
        if (it.note && String(it.note).trim()) s += ' (note: ' + String(it.note).trim() + ')';
        if (doc.nodeArt && doc.nodeArt[it.id]) s += ' [sculpted]';
        return s;
      });
      lines.push(parts.length ? row + ' ' + parts.join(', ') : row + ' (empty so far)');
    });
    var arranged = !!(doc && doc.arrangement && doc.arrangement.axisValues && Object.keys(doc.arrangement.axisValues).length);
    if (arranged) lines.push('', 'They also hand-arranged some placements in 3D space.');
    lines.push(
      '',
      'Respond as a coach, not a grader:',
      '- "strengths": up to 3 specific strengths, quoting their own words where possible.',
      '- "questions": up to 3 short Socratic questions that push their thinking about the form\'s logic (empty spots, items that might belong elsewhere, missing relationships). NEVER include the answer in a question.',
      '- "suggestions": up to 3 concrete, kind next-build steps.',
      'No grades, no scores, no rewriting their text. Keep every sentence student-friendly and school-appropriate.',
      'Return ONLY JSON exactly of this shape: {"strengths":["..."],"questions":["..."],"suggestions":["..."]}'
    );
    return lines.join('\n');
  }

  function ffParseAssessment(text) {
    var s = String(text || '').trim();
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    var a = s.indexOf('{'), b = s.lastIndexOf('}');
    if (a >= 0 && b > a) s = s.slice(a, b + 1);
    var parsed;
    try { parsed = JSON.parse(s); } catch (e) { return null; }
    if (!parsed || typeof parsed !== 'object') return null;
    function arr(v) {
      return (Array.isArray(v) ? v : []).filter(function(x) { return typeof x === 'string' && x.trim(); }).slice(0, 4);
    }
    var out = { strengths: arr(parsed.strengths), questions: arr(parsed.questions), suggestions: arr(parsed.suggestions) };
    return (out.strengths.length || out.questions.length || out.suggestions.length) ? out : null;
  }

  // "Make it mine" import: an AI-generated organizer {main, branches,
  // structureType} becomes a Free Forms doc the student can rework — fresh
  // stable uids, notes empty, no arrangement (the scaffold shapes it).
  function ffDocFromGenerated(gen) {
    if (!gen || !Array.isArray(gen.branches) || !gen.branches.length) return null;
    var scaffold = ffScaffold(gen.structureType) ? gen.structureType : 'free';
    var nid = 1;
    var groups = gen.branches.map(function(b) {
      var gid = 'g' + (nid++);
      var items = (Array.isArray(b && b.items) ? b.items : []).map(function(it) {
        var text = (it && typeof it === 'object') ? String(it.text || '') : String(it == null ? '' : it);
        return { id: 'n' + (nid++), text: text.trim(), note: '' };
      }).filter(function(it) { return it.text; });
      return { id: gid, title: (b && b.title != null && String(b.title).trim()) ? String(b.title).trim() : 'Group', items: items };
    });
    return {
      scaffold: scaffold,
      title: gen.main != null ? String(gen.main) : '',
      rev: 1, nextId: nid, groups: groups,
      arrangement: null, nodeArt: {}, assessment: null, _xp: {}
    };
  }

  // Recall mode ("Test yourself"): the engine's Strand Challenge run over the
  // student's OWN composition — items fall out of their groups, the student
  // puts them back from memory. Build-then-recall = generation + retrieval
  // practice on self-authored structure. On top of buildStrandChallenge (which
  // strips item categories/z and answer-leaking edges) we ALSO neutralize the
  // items' x/y into an alphabetical tray row along the bottom — in shaped
  // layouts the cluster x/y themselves would leak the grouping.
  function ffBuildChallenge(doc, E) {
    if (!doc || !E || !E.buildStrandChallenge) return null;
    var composed = ffComposeGraph(Object.assign({}, doc, { arrangement: null }), E);
    var ch = E.buildStrandChallenge(composed);
    if (!ch || !ch.targets || ch.targets.length < 4 || !ch.strands || ch.strands.length < 2) return null;
    var labelById = {};
    composed.nodes.forEach(function(n) { labelById[n.id] = n.label || n.id; });
    var order = ch.targets.slice().sort(function(a, b) {
      var la = String(labelById[a] || a).toLowerCase(), lb = String(labelById[b] || b).toLowerCase();
      return la < lb ? -1 : la > lb ? 1 : 0;
    });
    var n = order.length;
    var nodes = ch.graph.nodes.map(function(nd) {
      var i = order.indexOf(nd.id);
      if (i < 0) return nd;
      return Object.assign({}, nd, { axisValues: { x: n <= 1 ? 0.5 : 0.06 + 0.88 * (i / (n - 1)), y: 0.97, z: 0.5 } });
    });
    return { graph: Object.assign({}, ch.graph, { nodes: nodes }), answerKey: ch.answerKey, targets: ch.targets, strands: ch.strands };
  }

  // ── Printable one-pager — PURE html builder (tested; all student text
  // escaped). Downloaded as a self-contained .html the family/teacher opens
  // and prints (portfolio / progress evidence); no pipeline dependency.
  function _esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function ffBuildPrintableHtml(doc, opts) {
    opts = opts || {};
    var sc = ffScaffold(doc && doc.scaffold);
    var title = (doc && doc.title && doc.title.trim()) ? doc.title.trim() : 'My World of Forms';
    var rows = [];
    ((doc && doc.groups) || []).forEach(function (g) {
      var items = (g.items || []).map(function (it) {
        var s = '<li>' + _esc(it.text);
        if (doc.nodeArt && doc.nodeArt[it.id]) s += ' <span class="tag">sculpted</span>';
        if (it.note && String(it.note).trim()) s += '<div class="note">' + _esc(it.note) + '</div>';
        return s + '</li>';
      }).join('');
      rows.push('<section class="group"><h3>' + _esc(g.title) + '</h3>' + (items ? '<ul>' + items + '</ul>' : '<p class="empty">(empty)</p>') + '</section>');
    });
    var coach = '';
    if (doc && doc.assessment) {
      var block = function (label, list) {
        if (!list || !list.length) return '';
        return '<div class="coach-col"><h4>' + _esc(label) + '</h4><ul>' + list.map(function (s) { return '<li>' + _esc(s) + '</li>'; }).join('') + '</ul></div>';
      };
      coach = block('What is working', doc.assessment.strengths) + block('Questions to consider', doc.assessment.questions) + block('Next build steps', doc.assessment.suggestions);
      if (coach) coach = '<h2>Coach feedback</h2><div class="coach">' + coach + '</div>';
    }
    var recall = '';
    if (doc && Array.isArray(doc.recallLog) && doc.recallLog.length) {
      recall = '<h2>Recall practice</h2><ul class="recall">' + doc.recallLog.map(function (r) {
        var when = r.when ? new Date(r.when).toLocaleDateString() : '';
        var missed = (r.missed && r.missed.length) ? ' — still learning: ' + r.missed.map(_esc).join(', ') : '';
        return '<li><strong>' + _esc(r.correct + '/' + r.total) + '</strong> ' + _esc(when) + missed + '</li>';
      }).join('') + '</ul>';
    }
    return [
      '<!doctype html><html><head><meta charset="utf-8"><title>' + _esc(title) + '</title><style>',
      'body{font-family:system-ui,sans-serif;color:#1e293b;max-width:820px;margin:24px auto;padding:0 16px;line-height:1.45}',
      'h1{margin:0 0 2px;font-size:26px} .sub{color:#64748b;font-size:13px;margin-bottom:14px}',
      'img.snap{max-width:100%;border-radius:12px;border:1px solid #cbd5e1;margin:8px 0 16px}',
      '.group{break-inside:avoid;border:1px solid #e2e8f0;border-radius:10px;padding:8px 14px;margin-bottom:10px}',
      '.group h3{margin:2px 0 6px;font-size:15px;color:#6d28d9} .group ul{margin:0;padding-left:20px}',
      '.note{color:#64748b;font-size:12px;font-style:italic} .empty{color:#94a3b8;font-size:12px}',
      '.tag{font-size:10px;background:#ede9fe;color:#6d28d9;border-radius:6px;padding:1px 5px;vertical-align:middle}',
      'h2{font-size:16px;margin:18px 0 6px} .coach{display:flex;gap:12px;flex-wrap:wrap} .coach-col{flex:1;min-width:180px;border:1px solid #e2e8f0;border-radius:10px;padding:6px 12px}',
      '.coach-col h4{margin:4px 0;font-size:13px} .coach-col ul{margin:0;padding-left:18px;font-size:12px}',
      '.recall{font-size:13px} .printbtn{position:fixed;top:12px;right:12px;padding:8px 14px;font-weight:700;border-radius:8px;border:1px solid #6d28d9;background:#7c3aed;color:#fff;cursor:pointer}',
      '@media print{.printbtn{display:none}}',
      '</style></head><body>',
      '<button class="printbtn" onclick="window.print()">Print</button>',
      '<h1>🏛️ ' + _esc(title) + '</h1>',
      '<div class="sub">' + _esc((sc ? sc.name : 'Free Forms')) + (opts.generatedAt ? ' · ' + _esc(opts.generatedAt) : '') + ' · built by hand in AlloFlow Free Forms</div>',
      (opts.snapshotDataUrl ? '<img class="snap" alt="3D view of the composition" src="' + opts.snapshotDataUrl + '">' : ''),
      rows.join(''),
      coach,
      recall,
      '</body></html>'
    ].join('\n');
  }

  window.StemLab.ffPure = {
    FF_SCAFFOLDS: FF_SCAFFOLDS,
    ffScaffold: ffScaffold,
    ffNewDoc: ffNewDoc,
    ffGraphFromDoc: ffGraphFromDoc,
    ffComposeGraph: ffComposeGraph,
    ffReconcileMembership: ffReconcileMembership,
    ffRenameCategory: ffRenameCategory,
    ffStats: ffStats,
    ffBuildAssessPrompt: ffBuildAssessPrompt,
    ffParseAssessment: ffParseAssessment,
    ffDocFromGenerated: ffDocFromGenerated,
    ffBuildChallenge: ffBuildChallenge,
    ffBuildPrintableHtml: ffBuildPrintableHtml
  };

  // ═══ TOOL REGISTRATION ═══════════════════════════════════════════════

  window.StemLab.registerTool('freeForms', {
    icon: '\u{1F3DB}️', label: 'Free Forms',
    desc: 'Build your own World of Forms: fill an archetypal 3D structure (Venn, story mountain, fishbone…) with your OWN ideas, sculpt them, and get AI coaching on the whole composition.',
    color: 'violet', category: 'creative',

    init: function(ctx) {
      ensureConceptGraph(function(ok) {
        if (!ok && ctx.addToast) ctx.addToast('⚠️ Free Forms: the 3D engine could not load — the builder panel still works.', 'info');
        if (ctx.setToolData) ctx.setToolData(function(p) { return Object.assign({}, p, { _ffModulesReady: !!ok }); });
      });
    },

    cleanup: function() {},

    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      // honor the 2nd-arg English fallback (ctx.t is single-arg & ignores it; see dev-tools/check_i18n_fallback.cjs)
      var t = function(k, fb) { var v; try { v = (typeof ctx.t === 'function') ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null || v === k) ? (fb != null ? fb : k) : v; };
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;
      var announceToSR = ctx.announceToSR || announce;

      return (function() {

      var labToolData = ctx.toolData || {};
      var doc = labToolData.freeForms || null;
      var setDoc = function(updater) {
        ctx.setToolData(function(prev) {
          prev = prev || {};
          var cur = prev.freeForms || null;
          var next = (typeof updater === 'function') ? updater(cur) : updater;
          return Object.assign({}, prev, { freeForms: next });
        });
      };

      var _ready = React.useState(!!(window.AlloModules && window.AlloModules.ConceptGraphEngine && window.AlloModules.ConceptGraph3D));
      var modulesReady = _ready[0], setModulesReady = _ready[1];
      var _fail = React.useState(false); var modulesFailed = _fail[0], setModulesFailed = _fail[1];
      var _sel = React.useState(null); var selectedId = _sel[0], setSelectedId = _sel[1];
      var _sb = React.useState(false); var sculptBusy = _sb[0], setSculptBusy = _sb[1];
      var _ab = React.useState(false); var assessBusy = _ab[0], setAssessBusy = _ab[1];
      var _sp = React.useState(''); var sculptText = _sp[0], setSculptText = _sp[1];
      var _ch = React.useState(null); var challenge = _ch[0], setChallenge = _ch[1];
      var _pl = React.useState({}); var placed = _pl[0], setPlaced = _pl[1];
      var _ck = React.useState(null); var checked = _ck[0], setChecked = _ck[1];
      var _hb = React.useState(false); var hintBusy = _hb[0], setHintBusy = _hb[1];
      var _ht = React.useState(''); var hintText = _ht[0], setHintText = _ht[1];
      var _p3 = React.useState(!!(window.AlloModules && window.AlloModules.Prim3D)); var prim3dReady = _p3[0], setPrim3dReady = _p3[1];
      var _pp = React.useState(0); var selPart = _pp[0], setSelPart = _pp[1];
      var hostRef = React.useRef(null);
      var handleRef = React.useRef(null);
      var undoRef = React.useRef([]);   // bounded in-session undo (doc snapshots)
      var hasAI = typeof ctx.callGemini === 'function';

      // ── Undo safety net — every destructive/structural mutation snapshots
      // the doc first (deep copy, capped, deduped so double-run updaters are
      // harmless). Session-scoped by design: protects against slips ("deleted
      // my group"), not a persisted history.
      var pushUndo = function(d) {
        if (!d) return;
        try {
          var snap = JSON.stringify(d);
          var st = undoRef.current;
          if (st.length && st[st.length - 1] === snap) return;
          st.push(snap);
          if (st.length > 25) st.shift();
        } catch (e) {}
      };
      var doUndo = function() {
        var st = undoRef.current;
        if (!st.length || challenge) return;
        var snap = st.pop();
        try {
          var restored = JSON.parse(snap);
          setSelectedId(null); setSelPart(0);
          setDoc(function(d) { restored.rev = ((d && d.rev) || restored.rev || 0) + 1; return restored; });
          announce(t('stem.freeforms.sr_undone', 'Undone'));
        } catch (e) {}
      };
      var onRootKeyDown = function(e) {
        if (!(e.ctrlKey || e.metaKey) || (e.key !== 'z' && e.key !== 'Z') || e.shiftKey) return;
        var tag = e.target && e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;   // native text undo wins inside fields
        e.preventDefault();
        doUndo();
      };

      React.useEffect(function() {
        var alive = true;
        if (!modulesReady) ensureConceptGraph(function(ok) { if (!alive) return; if (ok) setModulesReady(true); else setModulesFailed(true); });
        return function() { alive = false; };
      }, []);

      // ── "Make it mine" import handoff (labToolData._ffImport, set by the host
      // when a Visual Organizer dispatches 'allo-open-freeforms'). Auto-consume
      // when the current composition is empty; otherwise keep the payload and
      // render a confirm strip so student work is never silently replaced.
      var pendingImport = labToolData._ffImport || null;
      React.useEffect(function() {
        if (!pendingImport) return;
        ctx.setToolData(function(prev) {
          prev = prev || {};
          var im = prev._ffImport;
          if (!im) return prev;
          var cur = prev.freeForms;
          var hasContent = cur && cur.groups && cur.groups.some(function(g) { return g.items && g.items.length; });
          if (hasContent) return prev;   // confirm strip decides
          var p = Object.assign({}, prev); delete p._ffImport;
          var nd = ffDocFromGenerated(im);
          if (nd) p.freeForms = nd;
          return p;
        });
      }, [pendingImport]);
      var consumeImport = function(accept) {
        ctx.setToolData(function(prev) {
          prev = prev || {};
          var p = Object.assign({}, prev); var im = p._ffImport; delete p._ffImport;
          if (accept && im) {
            var nd = ffDocFromGenerated(im);
            if (nd) { pushUndo(p.freeForms); p.freeForms = nd; }   // ↩ can bring the replaced work back
          }
          return p;
        });
        if (accept) { setChallenge(null); setChecked(null); setPlaced({}); setSelectedId(null); announce(t('stem.freeforms.sr_imported', 'Organizer imported — now make it yours')); }
      };

      // ── Mount / remount the 3D view on structural changes only (doc.rev) —
      // or on entering/leaving recall mode (challenge identity). In recall
      // mode the SAME editable machinery drives placement, but nothing is
      // ever persisted: onArrangementChange only collects target placements.
      var scaffold = doc && doc.scaffold;
      var rev = (doc && doc.rev) || 0;
      React.useEffect(function() {
        if (!modulesReady || !doc || !scaffold || !hostRef.current) return;
        var E = window.AlloModules && window.AlloModules.ConceptGraphEngine;
        var CG3D = window.AlloModules && window.AlloModules.ConceptGraph3D;
        if (!E || !CG3D) return;
        var graph;
        try { graph = challenge ? challenge.graph : ffComposeGraph(doc, E); } catch (e) { return; }
        var handle = null;
        try {
          handle = CG3D.render(hostRef.current, graph, {
            t: ctx.t,
            editable: true,
            onArrangementChange: challenge
              ? function(arr) {
                  if (!arr || !arr.categories) return;
                  var np = {};
                  challenge.targets.forEach(function(id) { if (typeof arr.categories[id] === 'string' && arr.categories[id]) np[id] = arr.categories[id]; });
                  setPlaced(np);
                }
              : function(arr) {
                  setDoc(function(d) {
                    if (!d) return d;
                    var nd = Object.assign({}, d, { arrangement: arr });
                    if (arr && arr.categories) {
                      var rec = ffReconcileMembership(nd, arr.categories);
                      if (rec.moved) nd = rec.doc;
                    }
                    return nd;
                  });
                },
            onSelectNode: function(id) { setSelectedId(id); setSelPart(0); setSculptText(''); },
            initialNodeArt: (doc.nodeArt && Object.keys(doc.nodeArt).length) ? doc.nodeArt : null
          });
        } catch (e) { handle = null; }
        handleRef.current = handle;
        return function() {
          try { if (handle && handle.destroy) handle.destroy(); } catch (e) {}
          if (handleRef.current === handle) handleRef.current = null;
        };
      }, [modulesReady, scaffold, rev, challenge]);

      // Lazy-load the sculpting engine once an idea is selected (shape studio).
      React.useEffect(function() {
        var alive = true;
        if (selectedId && !prim3dReady) ensurePrim3d(function(ok) { if (alive && ok) setPrim3dReady(true); });
        return function() { alive = false; };
      }, [selectedId]);

      // ── Doc mutations (structural ⇒ rev bump ⇒ remount; undo-snapshotted) ──
      var bump = function(mut) {
        setDoc(function(d) {
          if (!d) return d;
          pushUndo(d);
          var nd = mut(Object.assign({}, d));
          nd.rev = (d.rev || 0) + 1;
          return nd;
        });
      };
      var chooseScaffold = function(type) {
        setSelectedId(null);
        setDoc(function(d) {
          if (d && d.groups && d.groups.some(function(g) { return (g.items || []).length; })) {
            // keep the student's content; only the form (and its layout) changes
            return Object.assign({}, d, { scaffold: type, arrangement: null, rev: (d.rev || 0) + 1 });
          }
          return ffNewDoc(type);
        });
        announce(t('stem.freeforms.sr_form_chosen', 'Form chosen'));
      };
      var backToPicker = function() { setSelectedId(null); setDoc(function(d) { return d ? Object.assign({}, d, { scaffold: null }) : d; }); };
      var setTitle = function(v) { bump(function(d) { d.title = v; return d; }); };
      var renameGroup = function(gid, title) {
        bump(function(d) {
          var old = null;
          d.groups = d.groups.map(function(g) {
            if (g.id !== gid) return g;
            old = g.title;
            return Object.assign({}, g, { title: title });
          });
          if (old != null && d.arrangement) d.arrangement = ffRenameCategory(d.arrangement, old, title);
          return d;
        });
      };
      var addGroup = function() {
        bump(function(d) {
          var id = 'g' + d.nextId;
          d.nextId = (d.nextId || 1) + 1;
          d.groups = d.groups.concat([{ id: id, title: t('stem.freeforms.new_group', 'New group') + ' ' + d.groups.length, items: [] }]);
          return d;
        });
      };
      var deleteGroup = function(gid) {
        if (selectedId) setSelectedId(null);
        bump(function(d) {
          var gone = d.groups.filter(function(g) { return g.id === gid; })[0];
          d.groups = d.groups.filter(function(g) { return g.id !== gid; });
          if (gone) {
            var art = Object.assign({}, d.nodeArt || {});
            var avs = d.arrangement && d.arrangement.axisValues ? Object.assign({}, d.arrangement.axisValues) : null;
            var cats = d.arrangement && d.arrangement.categories ? Object.assign({}, d.arrangement.categories) : null;
            (gone.items || []).forEach(function(it) { delete art[it.id]; if (avs) delete avs[it.id]; if (cats) delete cats[it.id]; });
            d.nodeArt = art;
            if (d.arrangement) d.arrangement = Object.assign({}, d.arrangement, avs ? { axisValues: avs } : {}, cats ? { categories: cats } : {});
          }
          return d;
        });
      };
      var addItem = function(gid, text) {
        var txt = String(text || '').trim();
        if (!txt) return;
        bump(function(d) {
          var id = 'n' + d.nextId;
          d.nextId = (d.nextId || 1) + 1;
          d.groups = d.groups.map(function(g) { return g.id === gid ? Object.assign({}, g, { items: (g.items || []).concat([{ id: id, text: txt, note: '' }]) }) : g; });
          return d;
        });
        announce(t('stem.freeforms.sr_idea_added', 'Idea added'));
        var st = ffStats(doc);
        if (doc && (!doc._xp || !doc._xp.compose) && st.items + 1 >= 5 && typeof awardXP === 'function') {
          awardXP('freeForms', 10, 'World of Forms builder');
          setDoc(function(d) { return d ? Object.assign({}, d, { _xp: Object.assign({}, d._xp || {}, { compose: true }) }) : d; });
        }
      };
      var editItem = function(gid, iid, patch) {
        bump(function(d) {
          d.groups = d.groups.map(function(g) {
            if (g.id !== gid) return g;
            return Object.assign({}, g, { items: (g.items || []).map(function(it) { return it.id === iid ? Object.assign({}, it, patch) : it; }) });
          });
          return d;
        });
      };
      var deleteItem = function(gid, iid) {
        if (selectedId === iid) setSelectedId(null);
        bump(function(d) {
          d.groups = d.groups.map(function(g) { return g.id === gid ? Object.assign({}, g, { items: (g.items || []).filter(function(it) { return it.id !== iid; }) }) : g; });
          var art = Object.assign({}, d.nodeArt || {}); delete art[iid]; d.nodeArt = art;
          if (d.arrangement) {
            var avs = Object.assign({}, d.arrangement.axisValues || {}); delete avs[iid];
            var cats = Object.assign({}, d.arrangement.categories || {}); delete cats[iid];
            d.arrangement = Object.assign({}, d.arrangement, { axisValues: avs, categories: cats });
          }
          return d;
        });
      };
      var resetArrangement = function() {
        bump(function(d) { d.arrangement = null; return d; });
        announce(t('stem.freeforms.sr_reset', 'Arrangement reset to the form’s shape'));
      };

      // ── Sculpt (Prim3D recipes; live handle updated, NO remount) ──
      var findItem = function(id) {
        var found = null;
        ((doc && doc.groups) || []).forEach(function(g) {
          (g.items || []).forEach(function(it) { if (it.id === id) found = { group: g, item: it }; });
        });
        return found;
      };
      // applyRecipe — single write path for EVERY sculpting change (AI, preset,
      // hand-built part edit, clear). Updates the live 3D handle (no remount)
      // and persists; null recipe = cleared. Undo-snapshotted.
      var applyRecipe = function(id, recipe, srMsg) {
        try {
          if (handleRef.current) {
            if (recipe && handleRef.current.setNodeObject) handleRef.current.setNodeObject(id, recipe);
            else if (!recipe && handleRef.current.clearNodeArt) handleRef.current.clearNodeArt(id);
          }
        } catch (e) {}
        setDoc(function(d) {
          if (!d) return d;
          pushUndo(d);
          var art = Object.assign({}, d.nodeArt || {});
          if (recipe) art[id] = { type: 'object', recipe: recipe }; else delete art[id];
          return Object.assign({}, d, { nodeArt: art });
        });
        if (srMsg) announce(srMsg);
      };
      var currentRecipe = function() {
        var a = selectedId && doc && doc.nodeArt && doc.nodeArt[selectedId];
        return (a && a.type === 'object' && a.recipe) ? a.recipe : null;
      };
      var doSculpt = function() {
        var sel = findItem(selectedId);
        if (!sel || sculptBusy || !hasAI) return;
        var P3D = window.AlloModules && window.AlloModules.Prim3D;
        if (!P3D) { ensurePrim3d(function(ok) { if (ok) { setPrim3dReady(true); doSculpt(); } else if (addToast) addToast('⚠️ ' + t('stem.freeforms.sculpt_engine_failed', 'The sculpting engine could not load.'), 'error'); }); return; }
        var subj = (sculptText || '').trim() || sel.item.text;
        setSculptBusy(true);
        ctx.callGemini(P3D.buildRecipePrompt(subj), false, false, 0.85).then(function(resp) {
          var recipe = P3D.parseRecipe(typeof resp === 'string' ? resp : (resp && (resp.text || resp.output || resp.response)) || '');
          setSculptBusy(false);
          if (!recipe) { if (addToast) addToast('⚠️ ' + t('stem.freeforms.sculpt_failed', 'Sculpting failed — try a simpler description.'), 'error'); return; }
          recipe.name = subj.slice(0, 80);
          setSelPart(0);
          applyRecipe(sel.item.id, recipe, t('stem.freeforms.sr_sculpted', 'Sculpture placed'));
        }).catch(function() { setSculptBusy(false); if (addToast) addToast('⚠️ ' + t('stem.freeforms.sculpt_failed', 'Sculpting failed — try a simpler description.'), 'error'); });
      };
      var doClearArt = function() {
        var sel = findItem(selectedId);
        if (!sel) return;
        setSelPart(0);
        applyRecipe(sel.item.id, null, t('stem.freeforms.sr_art_cleared', 'Sculpture removed'));
      };
      // Hand-built sculpting: each button routes a PURE Prim3D recipe op through
      // applyRecipe — no AI anywhere in this path.
      var doPartOp = function(op) {
        var P3D = window.AlloModules && window.AlloModules.Prim3D;
        var sel = findItem(selectedId);
        if (!P3D || !sel) return;
        var r = currentRecipe();
        var next = op(P3D, r);
        if (next === r) return;   // no-op (cap hit / invalid index)
        applyRecipe(sel.item.id, next, null);
      };

      // ── Whole-composition AI assessment ──
      var stats = ffStats(doc);
      var doAssess = function() {
        if (!doc || assessBusy || !hasAI || stats.items < 3) return;
        setAssessBusy(true);
        ctx.callGemini(ffBuildAssessPrompt(doc), false, false, 0.6).then(function(resp) {
          setAssessBusy(false);
          var a = ffParseAssessment(typeof resp === 'string' ? resp : (resp && (resp.text || resp.output || resp.response)) || '');
          if (!a) { if (addToast) addToast('⚠️ ' + t('stem.freeforms.assess_failed', 'The coach could not respond — try again.'), 'error'); return; }
          setDoc(function(d) { return d ? Object.assign({}, d, { assessment: a }) : d; });
          announce(t('stem.freeforms.sr_assessed', 'Coaching feedback is ready below the builder panel'));
          if (doc && (!doc._xp || !doc._xp.assess) && typeof awardXP === 'function') {
            awardXP('freeForms', 5, 'Asked the coach');
            setDoc(function(d) { return d ? Object.assign({}, d, { _xp: Object.assign({}, d._xp || {}, { assess: true }) }) : d; });
          }
        }).catch(function() { setAssessBusy(false); if (addToast) addToast('⚠️ ' + t('stem.freeforms.assess_failed', 'The coach could not respond — try again.'), 'error'); });
      };

      // ── Recall mode (Test yourself) ──
      var groupsWithItems = ((doc && doc.groups) || []).filter(function(g) { return (g.items || []).length; }).length;
      var recallEligible = stats.items >= 4 && groupsWithItems >= 2;
      var startChallenge = function() {
        var E = window.AlloModules && window.AlloModules.ConceptGraphEngine;
        var ch = E ? ffBuildChallenge(doc, E) : null;
        if (!ch) { if (addToast) addToast('⚠️ ' + t('stem.freeforms.recall_needs_more', 'Add at least 4 ideas across 2 groups first'), 'info'); return; }
        setSelectedId(null); setPlaced({}); setChecked(null); setHintText('');
        setChallenge(ch);
        announce(t('stem.freeforms.sr_recall_started', 'Recall mode: every idea fell into the tray. Put each one back where it belongs.'));
      };
      var checkChallenge = function() {
        var E = window.AlloModules && window.AlloModules.ConceptGraphEngine;
        if (!challenge || !E) return;
        var score = E.scoreStrandChallenge(challenge.answerKey, placed);
        setChecked(score);
        var srMsg = t('stem.freeforms.sr_recall_score', 'Checked:') + ' ' + score.correct + '/' + score.total;
        try { if (handleRef.current && handleRef.current.flagNodes) handleRef.current.flagNodes(score.results, srMsg); } catch (e) {}
        // Recall history — persisted evidence a teacher/family can actually use:
        // which self-authored ideas the student could not yet re-place. Shows in
        // the recall panel and rides into the printable one-pager.
        var missed = [];
        Object.keys(score.results || {}).forEach(function(id) {
          if (score.results[id] !== 'correct' && missed.length < 8) {
            var f = findItem(id);
            if (f) missed.push(f.item.text);
          }
        });
        setDoc(function(d) {
          if (!d) return d;
          var log = (Array.isArray(d.recallLog) ? d.recallLog : []).concat([{ when: Date.now(), correct: score.correct, total: score.total, missed: missed }]);
          if (log.length > 10) log = log.slice(log.length - 10);
          return Object.assign({}, d, { recallLog: log });
        });
        if (score.complete) {
          announce('🎉 ' + t('stem.freeforms.sr_recall_complete', 'You rebuilt your whole world from memory!'));
          if (doc && (!doc._xp || !doc._xp.recall) && typeof awardXP === 'function') {
            awardXP('freeForms', 15, 'Recalled my world');
            setDoc(function(d) { return d ? Object.assign({}, d, { _xp: Object.assign({}, d._xp || {}, { recall: true }) }) : d; });
          }
        }
      };
      var retryChallenge = function() {
        var E = window.AlloModules && window.AlloModules.ConceptGraphEngine;
        var ch = E ? ffBuildChallenge(doc, E) : null;
        if (!ch) { setChallenge(null); return; }
        setPlaced({}); setChecked(null); setHintText(''); setSelectedId(null);
        setChallenge(ch);   // fresh object → remount → tray restored
      };
      var exitChallenge = function() {
        setChallenge(null); setChecked(null); setPlaced({}); setHintText(''); setSelectedId(null);
        announce(t('stem.freeforms.sr_recall_exited', 'Back to building.'));
      };
      // Post-check hint for the selected misplaced idea. buildStrandHintPrompt
      // NEVER reveals the correct group (pure engine helper, tested there).
      var doHint = function() {
        var E = window.AlloModules && window.AlloModules.ConceptGraphEngine;
        var id = selectedId;
        if (!challenge || !checked || !id || !challenge.answerKey[id] || hintBusy || !hasAI || !E || !E.buildStrandHintPrompt) return;
        if (checked.results && checked.results[id] === 'correct') return;
        var sel = findItem(id);
        setHintBusy(true);
        ctx.callGemini(E.buildStrandHintPrompt({
          strands: challenge.strands,
          itemLabel: (sel && sel.item.text) || id,
          placedStrand: placed[id] || null,
          topic: (doc && doc.title) || ''
        }), false, false, 0.7).then(function(resp) {
          setHintBusy(false);
          var txt = String(typeof resp === 'string' ? resp : (resp && (resp.text || resp.output || resp.response)) || '').trim();
          if (txt) { setHintText(txt); announce(t('stem.freeforms.sr_hint', 'Hint:') + ' ' + txt); }
        }).catch(function() { setHintBusy(false); });
      };

      // ── Snapshot (📷): capture the live WebGL view to a PNG download ──
      var doSnapshot = function() {
        var url = null;
        try { url = handleRef.current && handleRef.current.snapshot ? handleRef.current.snapshot() : null; } catch (e) {}
        if (!url) { if (addToast) addToast('⚠️ ' + t('stem.freeforms.snapshot_failed', 'Could not capture the 3D view here.'), 'error'); return; }
        try {
          var a = document.createElement('a');
          var slug = String((doc && doc.title) || 'free-forms').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'free-forms';
          a.href = url; a.download = slug + '.png';
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          if (addToast) addToast('📷 ' + t('stem.freeforms.snapshot_saved', 'Snapshot saved'), 'success');
        } catch (e) { if (addToast) addToast('⚠️ ' + t('stem.freeforms.snapshot_failed', 'Could not capture the 3D view here.'), 'error'); }
      };

      // ── Printable one-pager (🖨): snapshot + outline + notes + coach + recall
      // history as a self-contained downloadable HTML (open → Print).
      var doPrint = function() {
        if (!doc) return;
        var snap = null;
        try { snap = handleRef.current && handleRef.current.snapshot ? handleRef.current.snapshot() : null; } catch (e) {}
        try {
          var html = ffBuildPrintableHtml(doc, { snapshotDataUrl: snap, generatedAt: new Date().toLocaleDateString() });
          var blob = new Blob([html], { type: 'text/html' });
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          var slug = String(doc.title || 'free-forms').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'free-forms';
          a.href = url; a.download = slug + '-one-pager.html';
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          setTimeout(function() { try { URL.revokeObjectURL(url); } catch (e) {} }, 4000);
          if (addToast) addToast('🖨 ' + t('stem.freeforms.print_saved', 'One-pager downloaded — open it and print'), 'success');
        } catch (e) { if (addToast) addToast('⚠️ ' + t('stem.freeforms.print_failed', 'Could not build the one-pager.'), 'error'); }
      };

      // ═══ UI ═══
      var BTN = 'min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer';
      var BTN_GHOST = BTN + ' bg-slate-800/70 border-slate-600 text-slate-200 hover:bg-slate-700';
      var BTN_HOT = BTN + ' bg-violet-600 border-violet-500 text-white hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed';

      // Import confirm strip — shown (on either screen) only when an organizer
      // handoff is pending AND the student already has content to protect.
      var renderImportStrip = function() {
        if (!pendingImport) return null;
        return h('div', { className: 'mb-3 flex flex-wrap items-center gap-2 bg-amber-950/60 border border-amber-600 rounded-xl p-2', role: 'alert' },
          h('div', { className: 'text-xs text-amber-200 flex-1 min-w-0' },
            '🏛️ ' + t('stem.freeforms.import_prompt', 'Import the organizer') + ' "' + String(pendingImport.main || '').slice(0, 60) + '"? ' + t('stem.freeforms.import_replaces', 'This replaces your current composition.')),
          h('button', { className: BTN_HOT, onClick: function() { consumeImport(true); } }, t('stem.freeforms.import_yes', 'Import')),
          h('button', { className: BTN_GHOST, onClick: function() { consumeImport(false); } }, t('stem.freeforms.import_no', 'Keep mine'))
        );
      };

      // ── Picker screen ──
      if (!doc || !doc.scaffold) {
        return h('div', { id: 'allo-free-forms', className: 'p-4 md:p-6' },
          h('div', { className: 'max-w-5xl mx-auto' },
            renderImportStrip(),
            h('h2', { className: 'text-2xl font-black text-violet-200 mb-1' }, '\u{1F3DB}️ ' + t('stem.freeforms.title', 'Free Forms')),
            h('p', { className: 'text-sm text-slate-300 mb-1' }, t('stem.freeforms.tagline', 'Build your own World of Forms: pick an archetypal structure, fill it with YOUR ideas, arrange it in 3D, and sculpt what matters.')),
            h('p', { className: 'text-xs text-slate-400 mb-4' }, t('stem.freeforms.tagline2', 'You are the author here — the AI only coaches, and only when you ask.')),
            doc && doc.groups && doc.groups.some(function(g) { return (g.items || []).length; })
              ? h('p', { className: 'text-xs text-amber-300 mb-3' }, t('stem.freeforms.keep_content_hint', 'Your groups and ideas stay — choosing a form just changes the shape of the space.'))
              : null,
            h('div', { className: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3', role: 'list' },
              FF_SCAFFOLDS.map(function(sc) {
                return h('button', {
                  key: sc.type, role: 'listitem',
                  className: 'ff-card text-left bg-slate-800/70 border-2 border-slate-700 rounded-2xl p-4 min-h-[44px]',
                  onClick: function() { chooseScaffold(sc.type); },
                  'aria-label': sc.name + '. ' + sc.grammar
                },
                  h('div', { className: 'text-3xl mb-2', 'aria-hidden': 'true' }, sc.icon),
                  h('div', { className: 'font-black text-slate-100 text-sm mb-1' }, sc.name),
                  h('div', { className: 'text-[11px] leading-snug text-slate-400' }, sc.grammar)
                );
              })
            )
          )
        );
      }

      var sc = ffScaffold(doc.scaffold) || FF_SCAFFOLDS[FF_SCAFFOLDS.length - 1];
      var selected = selectedId ? findItem(selectedId) : null;

      // ── Builder screen ──
      var inChallenge = !!challenge;
      var placedCount = Object.keys(placed).length;
      return h('div', { id: 'allo-free-forms', className: 'p-3 md:p-4', onKeyDown: onRootKeyDown },
        renderImportStrip(),
        // header
        h('div', { className: 'flex flex-wrap items-center gap-2 mb-3' },
          !inChallenge ? h('button', { className: BTN_GHOST, onClick: backToPicker, 'aria-label': t('stem.freeforms.change_form', 'Change form') }, '← ' + t('stem.freeforms.forms', 'Forms')) : null,
          h('div', { className: 'text-lg font-black text-violet-200' }, (inChallenge ? '🎯 ' : sc.icon + ' ') + (inChallenge ? t('stem.freeforms.recall_title', 'Recall: rebuild your world') : sc.name)),
          !inChallenge ? h('div', { className: 'text-[11px] text-slate-400 hidden md:block flex-1 min-w-0 truncate' }, sc.grammar) : h('div', { className: 'flex-1' }),
          !inChallenge ? h('div', { className: 'text-[11px] font-bold text-slate-300 bg-slate-800/70 border border-slate-700 rounded-full px-3 py-1' },
            stats.groups + ' ' + t('stem.freeforms.groups', 'groups') + ' · ' + stats.items + ' ' + t('stem.freeforms.ideas', 'ideas') + (stats.sculpted ? ' · ' + stats.sculpted + ' ' + t('stem.freeforms.sculpted', 'sculpted') : '')) : null,
          !inChallenge ? h('button', { className: BTN_GHOST, onClick: doUndo, disabled: !undoRef.current.length, 'aria-label': t('stem.freeforms.undo_tip', 'Undo the last change (Ctrl+Z)'), title: t('stem.freeforms.undo_tip', 'Undo the last change (Ctrl+Z)') }, '↩ ' + t('stem.freeforms.undo', 'Undo')) : null,
          (modulesReady && !modulesFailed) ? h('button', { className: BTN_GHOST, onClick: doSnapshot, title: t('stem.freeforms.snapshot_tip', 'Save a picture of your 3D world') }, '📷 ' + t('stem.freeforms.snapshot', 'Snapshot')) : null,
          !inChallenge ? h('button', { className: BTN_GHOST, onClick: doPrint, title: t('stem.freeforms.print_tip', 'Download a printable one-pager (snapshot + your ideas + coach feedback)') }, '🖨 ' + t('stem.freeforms.print', 'One-pager')) : null,
          (!inChallenge && doc.arrangement) ? h('button', { className: BTN_GHOST, onClick: resetArrangement }, '↺ ' + t('stem.freeforms.reset_arrangement', 'Reset arrangement')) : null,
          !inChallenge ? h('button', { className: BTN_GHOST, onClick: startChallenge, disabled: !recallEligible,
            title: recallEligible ? t('stem.freeforms.recall_tip', 'Your ideas fall into a tray — put them back from memory') : t('stem.freeforms.recall_needs_more', 'Add at least 4 ideas across 2 groups first') },
            '🎯 ' + t('stem.freeforms.recall', 'Test yourself')) : null,
          (!inChallenge && hasAI) ? h('button', { className: BTN_HOT, onClick: doAssess, disabled: assessBusy || stats.items < 3, 'aria-busy': assessBusy ? 'true' : 'false',
            title: stats.items < 3 ? t('stem.freeforms.assess_needs_items', 'Add at least 3 ideas first') : t('stem.freeforms.assess_tip', 'Ask the AI coach to look at your whole composition') },
            (assessBusy ? '… ' : '\u{1F9E0} ') + t('stem.freeforms.assess', 'Assess my composition')) : null
        ),
        // split: sidebar + 3D stage
        h('div', { className: 'ff-split flex gap-3 items-stretch' },
          // ── recall panel (challenge) OR authoring sidebar (the accessible source of truth) ──
          inChallenge ? h('div', { className: 'ff-sidebar w-80 shrink-0 bg-slate-900/70 border border-amber-700 rounded-2xl p-3 overflow-y-auto', style: { maxHeight: '72vh' } },
            h('div', { className: 'text-sm font-black text-amber-200 mb-2' }, '🎯 ' + t('stem.freeforms.recall_heading', 'Rebuild it from memory')),
            h('p', { className: 'text-xs text-slate-300 leading-snug mb-2' },
              t('stem.freeforms.recall_instructions', 'Every idea fell out of its place into the tray at the bottom. Select an idea in the space, then use the group chips (or the [ and ] keys) to send it home. Nothing is saved during the game.')),
            h('div', { className: 'text-xs font-bold text-slate-200 bg-slate-800/70 border border-slate-700 rounded-full px-3 py-1.5 inline-block mb-2', role: 'status' },
              placedCount + '/' + challenge.targets.length + ' ' + t('stem.freeforms.recall_placed', 'placed')),
            checked ? h('div', { className: 'text-sm font-black rounded-xl px-3 py-2 mb-2 ' + (checked.complete ? 'bg-emerald-900/60 text-emerald-200 border border-emerald-600' : 'bg-slate-800/70 text-slate-100 border border-slate-600'), role: 'status' },
              (checked.complete ? '🎉 ' : '') + checked.correct + '/' + checked.total + ' ' + t('stem.freeforms.recall_correct', 'correct') +
              (checked.complete ? ' — ' + t('stem.freeforms.recall_complete', 'you rebuilt your whole world!') : '')) : null,
            h('div', { className: 'flex flex-wrap gap-1 mb-2' },
              h('button', { className: BTN_HOT, onClick: checkChallenge, disabled: !placedCount }, '✓ ' + t('stem.freeforms.recall_check', 'Check')),
              h('button', { className: BTN_GHOST, onClick: retryChallenge }, '↺ ' + t('stem.freeforms.recall_retry', 'Retry')),
              h('button', { className: BTN_GHOST, onClick: exitChallenge }, t('stem.freeforms.recall_exit', 'Exit'))
            ),
            (hasAI && checked && !checked.complete && selectedId && challenge.answerKey[selectedId] && checked.results && checked.results[selectedId] !== 'correct')
              ? h('button', { className: BTN_GHOST + ' w-full mb-1', onClick: doHint, disabled: hintBusy, 'aria-busy': hintBusy ? 'true' : 'false' },
                  (hintBusy ? '… ' : '💡 ') + t('stem.freeforms.recall_hint', 'Hint for the selected idea')) : null,
            h('div', { 'aria-live': 'polite' },
              hintText ? h('p', { className: 'text-xs text-amber-200 bg-amber-950/50 border border-amber-800 rounded-lg p-2 leading-snug' }, '💡 ' + hintText) : null),
            // recall history — persisted attempts + which ideas are still settling
            (doc.recallLog && doc.recallLog.length) ? h('div', { className: 'mt-2' },
              h('div', { className: 'text-[11px] font-bold text-slate-400 mb-1' }, '📈 ' + t('stem.freeforms.recall_history', 'Recall history')),
              h('ul', { className: 'space-y-1' }, doc.recallLog.slice().reverse().slice(0, 5).map(function(r, i) {
                return h('li', { key: i, className: 'text-[11px] text-slate-300 leading-snug' },
                  r.correct + '/' + r.total + (r.missed && r.missed.length ? ' — ' + t('stem.freeforms.recall_still_learning', 'still learning:') + ' ' + r.missed.slice(0, 4).join(', ') : ' 🎉'));
              }))) : null
          )
          : h('div', { className: 'ff-sidebar w-80 shrink-0 bg-slate-900/70 border border-slate-700 rounded-2xl p-3 overflow-y-auto', style: { maxHeight: '72vh' } },
            h('label', { className: 'block text-[11px] font-bold text-slate-400 mb-1', htmlFor: 'ff-title' }, t('stem.freeforms.composition_title', 'Composition title')),
            h('input', {
              id: 'ff-title', key: 'title-' + rev, defaultValue: doc.title || '',
              placeholder: t('stem.freeforms.title_placeholder', 'What is this world about?'),
              className: 'w-full bg-slate-800 border border-slate-600 rounded-lg px-2 py-2 text-sm text-slate-100 mb-3',
              onBlur: function(e) { if (e.target.value !== doc.title) setTitle(e.target.value); }
            }),
            doc.groups.map(function(g) {
              return h('div', { key: g.id + '-' + rev, className: 'mb-3 bg-slate-800/60 border border-slate-700 rounded-xl p-2' },
                h('div', { className: 'flex items-center gap-1 mb-1' },
                  h('input', {
                    defaultValue: g.title, 'aria-label': t('stem.freeforms.group_name', 'Group name'),
                    className: 'flex-1 min-w-0 bg-transparent border border-transparent focus:border-slate-500 rounded px-1 py-1 text-sm font-black text-violet-200',
                    onBlur: function(e) { var v = e.target.value.trim(); if (v && v !== g.title) renameGroup(g.id, v); }
                  }),
                  h('button', { className: 'min-h-[44px] min-w-[44px] rounded-lg text-slate-400 hover:text-rose-300 hover:bg-slate-700', 'aria-label': t('stem.freeforms.delete_group', 'Delete group') + ' ' + g.title, onClick: function() { deleteGroup(g.id); } }, '\u{1F5D1}️')
                ),
                (g.items || []).map(function(it) {
                  var isSel = selectedId === it.id;
                  return h('div', { key: it.id, className: 'flex items-center gap-1 mb-1 rounded-lg ' + (isSel ? 'bg-violet-900/40 ring-1 ring-violet-500' : '') },
                    h('button', {
                      className: 'min-h-[44px] min-w-[32px] text-xs', 'aria-pressed': isSel ? 'true' : 'false',
                      'aria-label': (isSel ? t('stem.freeforms.selected', 'Selected') + ': ' : t('stem.freeforms.select_idea', 'Select idea') + ': ') + it.text,
                      onClick: function() { setSelectedId(isSel ? null : it.id); setSelPart(0); setSculptText(''); }
                    }, (doc.nodeArt && doc.nodeArt[it.id]) ? '\u{1F5FF}' : '●'),
                    h('input', {
                      defaultValue: it.text, 'aria-label': t('stem.freeforms.idea_text', 'Idea text'),
                      className: 'flex-1 min-w-0 bg-transparent border border-transparent focus:border-slate-500 rounded px-1 py-1 text-sm text-slate-100',
                      onBlur: function(e) { var v = e.target.value.trim(); if (v && v !== it.text) editItem(g.id, it.id, { text: v }); }
                    }),
                    h('button', { className: 'min-h-[44px] min-w-[36px] rounded-lg text-slate-500 hover:text-rose-300 hover:bg-slate-700 text-xs', 'aria-label': t('stem.freeforms.delete_idea', 'Delete idea') + ' ' + it.text, onClick: function() { deleteItem(g.id, it.id); } }, '✕')
                  );
                }),
                h('form', {
                  className: 'flex gap-1 mt-1',
                  onSubmit: function(e) { e.preventDefault(); var inp = e.target.elements['ff-add-' + g.id]; if (inp) { addItem(g.id, inp.value); inp.value = ''; } }
                },
                  h('input', { name: 'ff-add-' + g.id, placeholder: t('stem.freeforms.add_idea_placeholder', 'Add an idea…'), 'aria-label': t('stem.freeforms.add_idea_to', 'Add an idea to') + ' ' + g.title, className: 'flex-1 min-w-0 bg-slate-900 border border-slate-600 rounded-lg px-2 py-1.5 text-sm text-slate-100' }),
                  h('button', { type: 'submit', className: BTN_GHOST, 'aria-label': t('stem.freeforms.add_idea_to', 'Add an idea to') + ' ' + g.title }, '+')
                )
              );
            }),
            h('button', { className: BTN_GHOST + ' w-full', onClick: addGroup }, '+ ' + t('stem.freeforms.add_group', 'Add a group')),
            // selected-idea detail: note + sculpt
            selected ? h('div', { className: 'mt-3 bg-violet-950/50 border border-violet-700 rounded-xl p-2' },
              h('div', { className: 'text-xs font-black text-violet-200 mb-1' }, '✦ ' + selected.item.text),
              h('label', { className: 'block text-[11px] font-bold text-slate-400 mb-1', htmlFor: 'ff-note' }, t('stem.freeforms.note_label', 'Note to self (shows in 3D)')),
              h('textarea', {
                id: 'ff-note', key: 'note-' + selected.item.id + '-' + rev, defaultValue: selected.item.note || '', rows: 2,
                placeholder: t('stem.freeforms.note_placeholder', 'Why does this idea live here?'),
                className: 'w-full bg-slate-900 border border-slate-600 rounded-lg px-2 py-1.5 text-xs text-slate-100 mb-2',
                onBlur: function(e) { if (e.target.value !== (selected.item.note || '')) editItem(selected.group.id, selected.item.id, { note: e.target.value }); }
              }),
              // ── Shape studio — sculpt by hand (no AI needed), from a preset,
              // or by description. All three paths emit the same Prim3D recipe.
              (function() {
                var P3D = window.AlloModules && window.AlloModules.Prim3D;
                if (!prim3dReady || !P3D) {
                  return h('div', { className: 'text-[11px] text-slate-500', role: 'status' }, t('stem.freeforms.studio_loading', 'Loading the shape studio…'));
                }
                var recipe = currentRecipe();
                var norm = recipe ? P3D.normalizeRecipe(recipe) : null;
                var parts = (norm && norm.parts) || [];
                var pi = Math.min(selPart, Math.max(0, parts.length - 1));
                var SHAPE_ICONS = { box: '📦', sphere: '⚪', cylinder: '🛢', cone: '🔺', torus: '🍩' };
                var mini = 'min-h-[44px] min-w-[44px] rounded-lg border border-slate-600 bg-slate-900 text-slate-200 text-xs font-bold hover:bg-slate-700';
                var nudge = function(field, axis, delta, label) {
                  return h('button', { key: field + axis + delta, className: mini, 'aria-label': label, title: label,
                    onClick: function() { doPartOp(function(P, r) { return P.nudgePart(r, pi, field, axis, delta); }); } }, label.split(' ')[0]);
                };
                return h('div', null,
                  h('div', { className: 'text-[11px] font-bold text-slate-400 mb-1' }, '🗿 ' + t('stem.freeforms.studio_label', 'Shape studio')),
                  // preset shelf — zero-AI quick starts (same recipes the AI emits)
                  !parts.length ? h('div', { className: 'flex flex-wrap gap-1 mb-1', role: 'group', 'aria-label': t('stem.freeforms.studio_presets', 'Preset shapes') },
                    (P3D.PRESETS || []).slice(0, 8).map(function(ps) {
                      return h('button', { key: ps.id, className: mini, title: ps.label, 'aria-label': t('stem.freeforms.studio_place_preset', 'Place preset') + ' ' + ps.label,
                        onClick: function() { var r = P3D.getPreset(ps.id); if (r) { setSelPart(0); applyRecipe(selected.item.id, r, t('stem.freeforms.sr_sculpted', 'Sculpture placed')); } } }, ps.emoji);
                    })) : null,
                  // add-a-part row — the hand-building entry point
                  h('div', { className: 'flex flex-wrap gap-1 mb-1 items-center', role: 'group', 'aria-label': t('stem.freeforms.studio_add_part', 'Add a part') },
                    h('span', { className: 'text-[10px] text-slate-500 font-bold' }, '+'),
                    (P3D.SHAPES || []).map(function(shp) {
                      return h('button', { key: shp, className: mini, title: t('stem.freeforms.studio_add', 'Add') + ' ' + shp, 'aria-label': t('stem.freeforms.studio_add', 'Add') + ' ' + shp,
                        onClick: function() { doPartOp(function(P, r) { var n2 = P.addPart(r, shp); return n2; }); setSelPart(parts.length); } }, SHAPE_ICONS[shp] || shp);
                    })),
                  // part list + per-part controls (only when something exists)
                  parts.length ? h('div', null,
                    h('div', { className: 'flex flex-wrap gap-1 mb-1', role: 'group', 'aria-label': t('stem.freeforms.studio_parts', 'Parts') },
                      parts.map(function(p, i) {
                        return h('button', { key: i, className: mini + (i === pi ? ' ring-2 ring-violet-400' : ''), 'aria-pressed': i === pi ? 'true' : 'false',
                          'aria-label': t('stem.freeforms.studio_part', 'Part') + ' ' + (i + 1) + ': ' + p.shape,
                          style: { borderBottom: '3px solid ' + p.color },
                          onClick: function() { setSelPart(i); } }, SHAPE_ICONS[p.shape] || p.shape);
                      })),
                    h('div', { className: 'grid grid-cols-6 gap-1 mb-1', role: 'group', 'aria-label': t('stem.freeforms.studio_move', 'Move the selected part') },
                      nudge('position', 0, -0.08, '◀ ' + t('stem.freeforms.studio_left', 'Left')),
                      nudge('position', 0, 0.08, '▶ ' + t('stem.freeforms.studio_right', 'Right')),
                      nudge('position', 1, 0.08, '⬆ ' + t('stem.freeforms.studio_up', 'Up')),
                      nudge('position', 1, -0.08, '⬇ ' + t('stem.freeforms.studio_down', 'Down')),
                      nudge('position', 2, 0.08, '↗ ' + t('stem.freeforms.studio_closer', 'Closer')),
                      nudge('position', 2, -0.08, '↙ ' + t('stem.freeforms.studio_farther', 'Farther'))
                    ),
                    h('div', { className: 'grid grid-cols-6 gap-1 mb-1', role: 'group', 'aria-label': t('stem.freeforms.studio_shape_tools', 'Shape tools') },
                      h('button', { className: mini, title: t('stem.freeforms.studio_bigger', 'Bigger'), 'aria-label': t('stem.freeforms.studio_bigger', 'Bigger'), onClick: function() { doPartOp(function(P, r) { return P.scalePart(r, pi, 1.25); }); } }, '➕'),
                      h('button', { className: mini, title: t('stem.freeforms.studio_smaller', 'Smaller'), 'aria-label': t('stem.freeforms.studio_smaller', 'Smaller'), onClick: function() { doPartOp(function(P, r) { return P.scalePart(r, pi, 0.8); }); } }, '➖'),
                      h('button', { className: mini, title: t('stem.freeforms.studio_spin', 'Spin'), 'aria-label': t('stem.freeforms.studio_spin', 'Spin'), onClick: function() { doPartOp(function(P, r) { return P.nudgePart(r, pi, 'rotation', 1, 30); }); } }, '🔄'),
                      h('button', { className: mini, title: t('stem.freeforms.studio_recolor', 'Change color'), 'aria-label': t('stem.freeforms.studio_recolor', 'Change color'), onClick: function() { doPartOp(function(P, r) { return P.recolorPart(r, pi); }); } }, '🎨'),
                      h('button', { className: mini, title: t('stem.freeforms.studio_duplicate', 'Duplicate'), 'aria-label': t('stem.freeforms.studio_duplicate', 'Duplicate'), onClick: function() { doPartOp(function(P, r) { return P.duplicatePart(r, pi); }); } }, '⧉'),
                      h('button', { className: mini, title: t('stem.freeforms.studio_remove_part', 'Remove part'), 'aria-label': t('stem.freeforms.studio_remove_part', 'Remove part'), onClick: function() { doPartOp(function(P, r) { return P.removePart(r, pi); }); setSelPart(Math.max(0, pi - 1)); } }, '✕')
                    )
                  ) : null,
                  // AI describe row — optional, same recipe format
                  hasAI ? h('div', { className: 'flex gap-1 mt-1' },
                    h('input', { id: 'ff-sculpt', value: sculptText, onChange: function(e) { setSculptText(e.target.value); }, placeholder: t('stem.freeforms.sculpt_label', 'Or describe it…') + ' ' + selected.item.text, 'aria-label': t('stem.freeforms.sculpt_label', 'Or describe it…'), className: 'flex-1 min-w-0 bg-slate-900 border border-slate-600 rounded-lg px-2 py-1.5 text-xs text-slate-100' }),
                    h('button', { className: BTN_HOT, onClick: doSculpt, disabled: sculptBusy, 'aria-busy': sculptBusy ? 'true' : 'false' }, sculptBusy ? '…' : '✨ ' + t('stem.freeforms.sculpt', 'Sculpt'))
                  ) : null,
                  parts.length ? h('button', { className: BTN_GHOST + ' mt-1 w-full', onClick: doClearArt }, t('stem.freeforms.clear_art', 'Remove sculpture')) : null
                );
              })()
            ) : null
          ),
          // ── 3D stage (cg3d owns its own a11y spine + WebGL fallback) ──
          h('div', { className: 'ff-stage flex-1 min-w-0 relative bg-[#0b1020] border border-slate-700 rounded-2xl overflow-hidden', style: { minHeight: '540px', maxHeight: '72vh' } },
            (!modulesReady && !modulesFailed) ? h('div', { className: 'absolute inset-0 flex items-center justify-center text-slate-300 text-sm', role: 'status' }, '\u{1F9ED} ' + t('stem.freeforms.loading_3d', 'Loading the 3D space…')) : null,
            modulesFailed ? h('div', { className: 'absolute inset-0 flex items-center justify-center text-center p-6 text-slate-300 text-sm', role: 'status' }, '⚠️ ' + t('stem.freeforms.no_3d', 'The 3D space could not load here — your builder panel still works, and everything you write is saved.')) : null,
            h('div', { ref: hostRef, className: 'absolute inset-0' })
          )
        ),
        // hint line
        h('p', { className: 'text-[11px] text-slate-500 mt-2' }, t('stem.freeforms.stage_hint', 'In the space: drag an idea to place it · drag the background to orbit · scroll to zoom · [ and ] move a selected idea between groups.')),
        // assessment cards (hidden during recall so the coach can't spoil answers)
        (!inChallenge && doc.assessment) ? h('div', { className: 'mt-3 grid md:grid-cols-3 gap-3', 'aria-label': t('stem.freeforms.coach_heading', 'Coaching feedback') },
          [['strengths', '\u{1F4AA}', t('stem.freeforms.strengths', 'What is working')],
           ['questions', '\u{1F914}', t('stem.freeforms.questions', 'Questions to consider')],
           ['suggestions', '\u{1F331}', t('stem.freeforms.suggestions', 'Next build steps')]].map(function(cfg) {
            var list = doc.assessment[cfg[0]] || [];
            if (!list.length) return null;
            return h('div', { key: cfg[0], className: 'bg-slate-900/70 border border-slate-700 rounded-2xl p-3' },
              h('div', { className: 'text-xs font-black text-violet-200 mb-2' }, cfg[1] + ' ' + cfg[2]),
              h('ul', { className: 'space-y-1' }, list.map(function(s, i) { return h('li', { key: i, className: 'text-xs text-slate-300 leading-snug' }, s); }))
            );
          })
        ) : null
      );

      })();
    }
  });
})();
