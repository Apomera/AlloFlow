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

  // ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEAM Lab tools ──
  (function() {
    if (typeof document === 'undefined' || !document.head) return;
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();

  // ── Accessibility live region (WCAG 4.1.3) ──
  var _announceToggle = false;
  function announce(msg) {
    try {
      if (typeof document === 'undefined' || !document.body) return;
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
      _announceToggle = !_announceToggle;
      lr.textContent = String(msg || '') + (_announceToggle ? '\u200B' : '');
    } catch (e) {}
  }

  // Scoped contrast + focus lift + Studio Workbench styling (same conventions as the other 3D lab tools).
  (function() {
    if (typeof document === 'undefined' || !document.head) return;
    if (document.getElementById('allo-freeforms-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-freeforms-css';
    st.textContent = [
      // ★The root declared an INK but no GROUND. This tool is dark-authored throughout
      // -- bg-slate-900, bg-slate-800/70, bg-amber-950/60 and 30 uses of the
      // -100/-200/-300/-400 text shades -- and the host card is white in the light
      // theme and white again in dark (stem_lab_module.js ~1633). So the /70 alphas
      // composited over white to a mid-grey #626976 with slate-400 on it at 2.56:1,
      // and the title sat on bare white at 1.38:1. Giving the alphas the dark ground
      // they were mixed against fixes all 17 at once, and it belongs HERE rather than
      // on a return: two branches render with this same id.
      '#allo-free-forms { color: #f8fafc; background: radial-gradient(1100px 460px at 8% -10%, rgba(124,58,237,0.22), transparent 60%), radial-gradient(900px 420px at 94% 0%, rgba(14,165,233,0.14), transparent 55%), #0b1120; border: 1px solid #334155; border-radius: 16px; box-shadow: 0 18px 40px -22px rgba(2,6,23,0.75); }',
      '.theme-contrast #allo-free-forms { background: #000000 !important; color: #ffffff !important; border: 2px solid #fbbf24 !important; box-shadow: none !important; }',
      '.theme-contrast #allo-free-forms .ff-surface, .theme-contrast #allo-free-forms .ff-card, .theme-contrast #allo-free-forms .ff-hero, .theme-contrast #allo-free-forms .ff-sidebar, .theme-contrast #allo-free-forms .ff-stage { background: #000000 !important; border-color: #fbbf24 !important; color: #ffffff !important; }',
      '.theme-contrast #allo-free-forms .ff-pill { background: #000000 !important; border-color: #fbbf24 !important; color: #ffff00 !important; }',
      '#allo-free-forms button:focus-visible, #allo-free-forms input:focus-visible, #allo-free-forms select:focus-visible, #allo-free-forms textarea:focus-visible { outline: 3px solid #facc15 !important; outline-offset: 2px !important; box-shadow: 0 0 0 5px rgba(250,204,21,0.28) !important; }',
      '#allo-free-forms input::placeholder, #allo-free-forms textarea::placeholder { color: #cbd5e1 !important; opacity: 1 !important; }',
      '#allo-free-forms .ff-sidebar .text-slate-500, #allo-free-forms .text-slate-500 { color: #cbd5e1 !important; }',
      '#allo-free-forms :is(.border-slate-600, .border-slate-700) { border-color: #475569 !important; }',
      '#allo-free-forms .border-violet-700 { border-color: #8b5cf6 !important; }',
      '#allo-free-forms .ff-hero { background: linear-gradient(135deg, rgba(30,41,59,0.92), rgba(15,23,42,0.96)); border: 1px solid rgba(139,92,246,0.38); border-radius: 14px; }',
      '#allo-free-forms .ff-surface { background: rgba(15,23,42,0.82); border: 1px solid #334155; }',
      '#allo-free-forms .ff-card { width: 100%; height: 100%; display: flex; flex-direction: column; transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease; }',
      '#allo-free-forms .ff-card:hover { transform: translateY(-2px); border-color: #a78bfa !important; box-shadow: 0 12px 24px -14px rgba(139,92,246,0.55); background: rgba(30,41,59,0.95); }',
      '.theme-contrast #allo-free-forms .ff-card-svg { background: #000000 !important; border-color: #fbbf24 !important; }',
      '#allo-free-forms .ff-card-svg { background: linear-gradient(180deg, rgba(11,17,32,0.96), rgba(30,27,75,0.52)); border: 1px solid rgba(139,92,246,0.34); border-radius: 10px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -6px 14px rgba(2,6,23,0.48); }',
      '#allo-free-forms .ff-stage-bg { background-color: #090e1d; background-image: radial-gradient(rgba(148,163,184,0.16) 1px, transparent 1px); background-size: 22px 22px; }',
      '@media (max-width: 900px) { #allo-free-forms .ff-split { flex-direction: column !important; } #allo-free-forms .ff-sidebar { width: 100% !important; max-height: 46vh; } #allo-free-forms .ff-stage { min-height: 380px; } }',
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
      var el = document.createElement('script');
      if (typeof window.__alloConfigureTrustedScript !== 'function') throw new Error('Trusted script delivery is unavailable.');
      window.__alloConfigureTrustedScript(el, b.base + file + b.q); el.async = true;
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
    ((doc && Array.isArray(doc.groups)) ? doc.groups : []).forEach(function(grp) {
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
    var byTitle = Object.create(null);
    (Array.isArray(doc.groups) ? doc.groups : []).forEach(function(g) { if (g && typeof g.title === 'string' && byTitle[g.title] == null) byTitle[g.title] = g.id; });
    var moves = [];
    (Array.isArray(doc.groups) ? doc.groups : []).forEach(function(g) {
      (g.items || []).forEach(function(it) {
        var target = Object.prototype.hasOwnProperty.call(categories, it.id) ? categories[it.id] : null;
        if (typeof target === 'string' && target && target !== g.title && byTitle[target] != null) {
          moves.push({ item: it, fromId: g.id, toId: byTitle[target] });
        }
      });
    });
    if (!moves.length) return { doc: doc, moved: 0 };
    var groups = (Array.isArray(doc.groups) ? doc.groups : []).map(function(g) { return Object.assign({}, g, { items: (Array.isArray(g.items) ? g.items : []).slice() }); });
    var byId = Object.create(null); groups.forEach(function(g) { if (g && g.id != null) byId[g.id] = g; });
    moves.forEach(function(mv) {
      var from = byId[mv.fromId], to = byId[mv.toId];
      if (!from || !to) return;
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
    ((doc && Array.isArray(doc.groups)) ? doc.groups : []).forEach(function(g) {
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
    ((doc && Array.isArray(doc.groups)) ? doc.groups : []).forEach(function(g) {
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
    ((doc && Array.isArray(doc.groups)) ? doc.groups : []).forEach(function (g) {
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
    var docEl = (typeof document !== 'undefined' && document.documentElement) ? document.documentElement : null;
    var safeSnap = (typeof opts.snapshotDataUrl === 'string' && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/i.test(opts.snapshotDataUrl)) ? opts.snapshotDataUrl : '';
    return [
      '<!doctype html><html lang="' + String((docEl && docEl.lang) || 'en').replace(/[^\w-]/g, '') + '"' + (docEl && docEl.dir === 'rtl' ? ' dir="rtl"' : '') + '><head><meta charset="utf-8"><title>' + _esc(title) + '</title><style>',
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
      (safeSnap ? '<img class="snap" alt="3D view of the composition" src="' + safeSnap + '">' : ''),
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
    icon: '\uD83E\uDDFE', label: 'Free Forms',
    desc: 'Build your own World of Forms: fill an archetypal 3D structure (Venn, story mountain, fishbone…) with your OWN ideas, sculpt them, and get AI coaching on the whole composition.',
    color: 'violet', category: 'creative',
    gradeRange: '4-12',
    aliases: ['graphic organizer', 'venn diagram', 'story mountain', 'fishbone', 'concept map', 'world of forms', 'mind map'],
    // This tool had NO learning contract: no quest hooks, no definition of what a
    // good structure contains, and the only feedback loop was the optional AI coach.
    // These hooks are checkable from the groups doc alone -- no model involved -- and
    // encode the minimum that makes a graphic organizer an organizer: multiple groups,
    // populated groups, and at least one deliberate spatial arrangement pass.
    questDataKey: 'freeForms',
    questHooks: [
      { id: 'ff_structure', label: 'Create a structure with 3 or more groups', icon: '🌳',
        check: function (d) { return !!(d && d.groups && d.groups.length >= 3); },
        progress: function (d) { return Math.min(3, (d && d.groups && d.groups.length) || 0) + '/3 groups'; } },
      { id: 'ff_populate', label: 'Put 2+ of your own ideas in every group', icon: '🧾',
        check: function (d) { var g = (d && d.groups) || []; return g.length >= 2 && g.every(function (x) { return x.items && x.items.length >= 2; }); },
        progress: function (d) { var g = (d && d.groups) || []; var done = g.filter(function (x) { return x.items && x.items.length >= 2; }).length; return done + '/' + Math.max(2, g.length) + ' groups filled'; } },
      { id: 'ff_arrange', label: 'Arrange your ideas in 3D space', icon: '🔗',
        check: function (d) { return !!(d && d.arrangement); },
        progress: function (d) { return (d && d.arrangement) ? 'Arranged' : 'Not yet'; } },
      { id: 'ff_sculpt', label: 'Sculpt at least one idea into an object', icon: '🎨',
        check: function (d) { return !!(d && d.nodeArt && Object.keys(d.nodeArt).length >= 1); },
        progress: function (d) { return Object.keys((d && d.nodeArt) || {}).length + ' sculpted'; } }
    ],

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
      var _cat = React.useState('all'); var pickerCat = _cat[0], setPickerCat = _cat[1];
      var hostRef = React.useRef(null);
      var handleRef = React.useRef(null);
      var undoRef = React.useRef([]);   // bounded in-session undo (doc snapshots)
      var aliveRef = React.useRef(true);
      var xpSentRef = React.useRef(Object.create(null));
      var hasAI = typeof ctx.callGemini === 'function';

      React.useEffect(function() {
        aliveRef.current = true;
        return function() { aliveRef.current = false; };
      }, []);

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
          announceToSR(t('stem.freeforms.sr_undone', 'Undone'));
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
        if (accept) { setChallenge(null); setChecked(null); setPlaced({}); setSelectedId(null); announceToSR(t('stem.freeforms.sr_imported', 'Organizer imported — now make it yours')); }
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
        announceToSR(t('stem.freeforms.sr_form_chosen', 'Form chosen'));
      };
      var backToPicker = function() { setSelectedId(null); setDoc(function(d) { return d ? Object.assign({}, d, { scaffold: null }) : d; }); };
      var setTitle = function(v) { bump(function(d) { d.title = v; return d; }); };
      var renameGroup = function(gid, title) {
        bump(function(d) {
          var old = null;
          d.groups = (Array.isArray(d.groups) ? d.groups : []).map(function(g) {
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
          var nid = (typeof d.nextId === 'number' && isFinite(d.nextId) && d.nextId > 0) ? Math.floor(d.nextId) : 1;
          var id = 'g' + nid;
          d.nextId = nid + 1;
          var grps = Array.isArray(d.groups) ? d.groups : [];
          d.groups = grps.concat([{ id: id, title: t('stem.freeforms.new_group', 'New group') + ' ' + grps.length, items: [] }]);
          return d;
        });
      };
      var deleteGroup = function(gid) {
        if (selectedId) setSelectedId(null);
        bump(function(d) {
          var grps = Array.isArray(d.groups) ? d.groups : [];
          var gone = grps.filter(function(g) { return g.id === gid; })[0];
          d.groups = grps.filter(function(g) { return g.id !== gid; });
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
          var nid = (typeof d.nextId === 'number' && isFinite(d.nextId) && d.nextId > 0) ? Math.floor(d.nextId) : 1;
          var id = 'n' + nid;
          d.nextId = nid + 1;
          var grps = Array.isArray(d.groups) ? d.groups : [];
          d.groups = grps.map(function(g) { return g.id === gid ? Object.assign({}, g, { items: (g.items || []).concat([{ id: id, text: txt, note: '' }]) }) : g; });
          return d;
        });
        announceToSR(t('stem.freeforms.sr_idea_added', 'Idea added'));
        var st = ffStats(doc);
        if (doc && (!doc._xp || !doc._xp.compose) && !xpSentRef.current.compose && st.items + 1 >= 5 && typeof awardXP === 'function') {
          xpSentRef.current.compose = true;
          awardXP('freeForms', 10, 'World of Forms builder');
          setDoc(function(d) { return d ? Object.assign({}, d, { _xp: Object.assign({}, d._xp || {}, { compose: true }) }) : d; });
        }
      };
      var editItem = function(gid, iid, patch) {
        bump(function(d) {
          d.groups = (Array.isArray(d.groups) ? d.groups : []).map(function(g) {
            if (g.id !== gid) return g;
            return Object.assign({}, g, { items: (g.items || []).map(function(it) { return it.id === iid ? Object.assign({}, it, patch) : it; }) });
          });
          return d;
        });
      };
      var deleteItem = function(gid, iid) {
        if (selectedId === iid) setSelectedId(null);
        bump(function(d) {
          d.groups = (Array.isArray(d.groups) ? d.groups : []).map(function(g) { return g.id === gid ? Object.assign({}, g, { items: (g.items || []).filter(function(it) { return it.id !== iid; }) }) : g; });
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
        announceToSR(t('stem.freeforms.sr_reset', 'Arrangement reset to the form’s shape'));
      };

      // ── Sculpt (Prim3D recipes; live handle updated, NO remount) ──
      var findItem = function(id) {
        var found = null;
        ((doc && Array.isArray(doc.groups)) ? doc.groups : []).forEach(function(g) {
          (g.items || []).forEach(function(it) { if (it.id === id) found = { group: g, item: it }; });
        });
        return found;
      };
      // applyRecipe — single write path for EVERY sculpting change (AI, preset,
      // hand-built part edit, clear). Updates the live 3D handle (no remount)
      // and persists; null recipe = cleared. Undo-snapshotted.
      var applyRecipe = function(id, recipe, srMsg) {
        var applied = false;
        setDoc(function(d) {
          if (!d) return d;
          var exists = (Array.isArray(d.groups) ? d.groups : []).some(function(g) {
            return (g.items || []).some(function(it) { return it.id === id; });
          });
          if (!exists) return d;
          applied = true;
          pushUndo(d);
          var art = Object.assign({}, d.nodeArt || {});
          if (recipe) art[id] = { type: 'object', recipe: recipe }; else delete art[id];
          return Object.assign({}, d, { nodeArt: art });
        });
        try {
          if (handleRef.current) {
            if (recipe && handleRef.current.setNodeObject) handleRef.current.setNodeObject(id, recipe);
            else if (!recipe && handleRef.current.clearNodeArt) handleRef.current.clearNodeArt(id);
          }
        } catch (e) {}
        if (srMsg) announceToSR(srMsg);
      };
      var currentRecipe = function() {
        var a = selectedId && doc && doc.nodeArt && doc.nodeArt[selectedId];
        return (a && a.type === 'object' && a.recipe) ? a.recipe : null;
      };
      var runSculptWithP3D = function(P3D, sel) {
        var subj = (sculptText || '').trim() || sel.item.text;
        ctx.callGemini(P3D.buildRecipePrompt(subj), false, false, 0.85).then(function(resp) {
          if (!aliveRef.current) return;
          var recipe = P3D.parseRecipe(typeof resp === 'string' ? resp : (resp && (resp.text || resp.output || resp.response)) || '');
          setSculptBusy(false);
          if (!recipe) { if (addToast) addToast('⚠️ ' + t('stem.freeforms.sculpt_failed', 'Sculpting failed — try a simpler description.'), 'error'); return; }
          recipe.name = subj.slice(0, 80);
          setSelPart(0);
          applyRecipe(sel.item.id, recipe, t('stem.freeforms.sr_sculpted', 'Sculpture placed'));
        }).catch(function() {
          if (!aliveRef.current) return;
          setSculptBusy(false);
          if (addToast) addToast('⚠️ ' + t('stem.freeforms.sculpt_failed', 'Sculpting failed — try a simpler description.'), 'error');
        });
      };
      var doSculpt = function() {
        var sel = findItem(selectedId);
        if (!sel || sculptBusy || !hasAI) return;
        var P3D = window.AlloModules && window.AlloModules.Prim3D;
        setSculptBusy(true);
        if (!P3D) {
          ensurePrim3d(function(ok) {
            if (!aliveRef.current) return;
            var loadedP3D = ok && window.AlloModules && window.AlloModules.Prim3D;
            if (loadedP3D) { setPrim3dReady(true); runSculptWithP3D(loadedP3D, sel); }
            else { setSculptBusy(false); if (addToast) addToast('⚠️ ' + t('stem.freeforms.sculpt_engine_failed', 'The sculpting engine could not load.'), 'error'); }
          });
          return;
        }
        runSculptWithP3D(P3D, sel);
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
          if (!aliveRef.current) return;
          setAssessBusy(false);
          var a = ffParseAssessment(typeof resp === 'string' ? resp : (resp && (resp.text || resp.output || resp.response)) || '');
          if (!a) { if (addToast) addToast('⚠️ ' + t('stem.freeforms.assess_failed', 'The coach could not respond — try again.'), 'error'); return; }
          setDoc(function(d) { return d ? Object.assign({}, d, { assessment: a }) : d; });
          announceToSR(t('stem.freeforms.sr_assessed', 'Coaching feedback is ready below the builder panel'));
          if (doc && (!doc._xp || !doc._xp.assess) && !xpSentRef.current.assess && typeof awardXP === 'function') {
            xpSentRef.current.assess = true;
            awardXP('freeForms', 5, 'Asked the coach');
            setDoc(function(d) { return d ? Object.assign({}, d, { _xp: Object.assign({}, d._xp || {}, { assess: true }) }) : d; });
          }
        }).catch(function() { if (!aliveRef.current) return; setAssessBusy(false); if (addToast) addToast('⚠️ ' + t('stem.freeforms.assess_failed', 'The coach could not respond — try again.'), 'error'); });
      };

      // ── Recall mode (Test yourself) ──
      var groupsWithItems = ((doc && Array.isArray(doc.groups)) ? doc.groups : []).filter(function(g) { return (g.items || []).length; }).length;
      var recallEligible = stats.items >= 4 && groupsWithItems >= 2;
      var startChallenge = function() {
        var E = window.AlloModules && window.AlloModules.ConceptGraphEngine;
        var ch = E ? ffBuildChallenge(doc, E) : null;
        if (!ch) { if (addToast) addToast('⚠️ ' + t('stem.freeforms.recall_needs_more', 'Add at least 4 ideas across 2 groups first'), 'info'); return; }
        setSelectedId(null); setPlaced({}); setChecked(null); setHintText('');
        setChallenge(ch);
        announceToSR(t('stem.freeforms.sr_recall_started', 'Recall mode: every idea fell into the tray. Put each one back where it belongs.'));
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
          announceToSR('🎉 ' + t('stem.freeforms.sr_recall_complete', 'You rebuilt your whole world from memory!'));
          if (doc && (!doc._xp || !doc._xp.recall) && !xpSentRef.current.recall && typeof awardXP === 'function') {
            xpSentRef.current.recall = true;
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
        announceToSR(t('stem.freeforms.sr_recall_exited', 'Back to building.'));
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
          if (!aliveRef.current) return;
          setHintBusy(false);
          var txt = String(typeof resp === 'string' ? resp : (resp && (resp.text || resp.output || resp.response)) || '').trim();
          if (txt) { setHintText(txt); announceToSR(t('stem.freeforms.sr_hint', 'Hint:') + ' ' + txt); }
        }).catch(function() { if (!aliveRef.current) return; setHintBusy(false); });
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
      var BTN = 'min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5';
      var BTN_GHOST = BTN + ' bg-slate-800/80 border-slate-500 text-slate-100 hover:bg-slate-700 disabled:opacity-45 disabled:cursor-not-allowed';
      var BTN_HOT = BTN + ' bg-violet-600 border-violet-400 text-white hover:bg-violet-500 disabled:opacity-45 disabled:cursor-not-allowed shadow-sm';
      var GROUP_ACCENTS = ['#a78bfa', '#38bdf8', '#34d399', '#fbbf24', '#f472b6', '#fb923c'];

      var FORM_FAMILY = {
        'Venn Diagram': 'compare', 'T-Chart': 'compare', 'Frayer Model': 'compare',
        'Fishbone': 'cause', 'Cause and Effect': 'cause', 'Flow Chart': 'cause', 'Problem Solution': 'cause',
        'Story Map': 'inquiry', 'KWL Chart': 'inquiry', 'See-Think-Wonder': 'inquiry', 'Claim-Evidence-Reasoning': 'inquiry',
        'Structured Outline': 'structure', 'Key Concept Map': 'structure', 'free': 'structure'
      };
      var FAMILY_TABS = [
        { id: 'all', label: t('stem.freeforms.fam_all', 'All Forms') },
        { id: 'compare', label: t('stem.freeforms.fam_compare', 'Compare & Define') },
        { id: 'cause', label: t('stem.freeforms.fam_cause', 'Cause & Flow') },
        { id: 'inquiry', label: t('stem.freeforms.fam_inquiry', 'Story & Inquiry') },
        { id: 'structure', label: t('stem.freeforms.fam_structure', 'Structure & Free') }
      ];

      // Bespoke inline SVG architectural schematics for each of the 14 spatial grammars.
      var renderScaffoldBlueprint = function(type, size) {
        var w = size === 'sm' ? 42 : 120, hh = size === 'sm' ? 30 : 54;
        var uid = String(type || 'free').toLowerCase().replace(/[^a-z0-9]+/g, '') + (size === 'sm' ? 's' : 'l');
        var svgProps = {
          viewBox: '0 0 120 54', width: w, height: hh, 'aria-hidden': 'true', focusable: 'false',
          style: { display: 'block', flexShrink: 0 }
        };
        var defs = h('defs', { key: 'defs' },
          h('linearGradient', { id: 'ff-bg-' + uid, x1: '0', y1: '0', x2: '0', y2: '1' },
            h('stop', { offset: '0%', stopColor: '#0b1224' }),
            h('stop', { offset: '100%', stopColor: '#131c36' })
          ),
          h('radialGradient', { id: 'ff-aura-' + uid, cx: '50%', cy: '48%', r: '55%' },
            h('stop', { offset: '0%', stopColor: '#8b5cf6', stopOpacity: '0.24' }),
            h('stop', { offset: '100%', stopColor: '#0b1224', stopOpacity: '0' })
          ),
          h('linearGradient', { id: 'ff-vio-' + uid, x1: '0', y1: '0', x2: '0', y2: '1' },
            h('stop', { offset: '0%', stopColor: '#c4b5fd' }),
            h('stop', { offset: '100%', stopColor: '#6d28d9' })
          ),
          h('linearGradient', { id: 'ff-sky-' + uid, x1: '0', y1: '0', x2: '0', y2: '1' },
            h('stop', { offset: '0%', stopColor: '#7dd3fc' }),
            h('stop', { offset: '100%', stopColor: '#0284c7' })
          ),
          h('linearGradient', { id: 'ff-em-' + uid, x1: '0', y1: '0', x2: '0', y2: '1' },
            h('stop', { offset: '0%', stopColor: '#6ee7b7' }),
            h('stop', { offset: '100%', stopColor: '#059669' })
          ),
          h('linearGradient', { id: 'ff-amb-' + uid, x1: '0', y1: '0', x2: '0', y2: '1' },
            h('stop', { offset: '0%', stopColor: '#fde68a' }),
            h('stop', { offset: '100%', stopColor: '#d97706' })
          )
        );
        var bgGrid = [
          h('rect', { key: 'plate', x: 1, y: 1, width: 118, height: 52, rx: 7, fill: 'url(#ff-bg-' + uid + ')', stroke: 'rgba(148,163,184,0.22)', strokeWidth: 0.9 }),
          h('rect', { key: 'aura', x: 1, y: 1, width: 118, height: 52, rx: 7, fill: 'url(#ff-aura-' + uid + ')' }),
          h('line', { key: 'g1', x1: 8, y1: 46, x2: 112, y2: 46, stroke: 'rgba(148,163,184,0.24)', strokeWidth: 0.9, strokeDasharray: '2 3' }),
          h('line', { key: 'g2', x1: 60, y1: 6, x2: 60, y2: 48, stroke: 'rgba(148,163,184,0.14)', strokeWidth: 0.8 }),
          h('path', { key: 'ticks', d: 'M6 10 V6 H10 M114 10 V6 H110 M6 44 V48 H10 M114 44 V48 H110', fill: 'none', stroke: 'rgba(167,139,250,0.42)', strokeWidth: 1, strokeLinecap: 'round' })
        ];
        var shapes = [];
        if (type === 'Structured Outline') {
          shapes = [
            h('path', { key: 'pg', d: 'M30 19 L30 27 L34 27 M52 32 L52 40 L56 40', stroke: 'rgba(56,189,248,0.35)', strokeWidth: 4, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }),
            h('path', { key: 'p', d: 'M30 19 L30 27 L34 27 M52 32 L52 40 L56 40', stroke: '#e2e8f0', strokeWidth: 1.5, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }),
            h('rect', { key: 's1', x: 14, y: 10, width: 32, height: 9, rx: 3, fill: 'url(#ff-vio-' + uid + ')', stroke: 'rgba(221,214,254,0.65)', strokeWidth: 0.8 }),
            h('line', { key: 'sh1', x1: 17, y1: 11.5, x2: 43, y2: 11.5, stroke: 'rgba(255,255,255,0.45)', strokeWidth: 1, strokeLinecap: 'round' }),
            h('rect', { key: 's2', x: 34, y: 23, width: 42, height: 9, rx: 3, fill: 'url(#ff-sky-' + uid + ')', stroke: 'rgba(186,230,253,0.65)', strokeWidth: 0.8 }),
            h('line', { key: 'sh2', x1: 37, y1: 24.5, x2: 73, y2: 24.5, stroke: 'rgba(255,255,255,0.45)', strokeWidth: 1, strokeLinecap: 'round' }),
            h('rect', { key: 's3', x: 56, y: 36, width: 48, height: 9, rx: 3, fill: 'url(#ff-em-' + uid + ')', stroke: 'rgba(167,243,208,0.65)', strokeWidth: 0.8 }),
            h('line', { key: 'sh3', x1: 59, y1: 37.5, x2: 101, y2: 37.5, stroke: 'rgba(255,255,255,0.45)', strokeWidth: 1, strokeLinecap: 'round' })
          ];
        } else if (type === 'Venn Diagram') {
          shapes = [
            h('circle', { key: 'c1g', cx: 46, cy: 27, r: 19, fill: 'rgba(139,92,246,0.28)', stroke: 'rgba(167,139,250,0.28)', strokeWidth: 4.5 }),
            h('circle', { key: 'c2g', cx: 74, cy: 27, r: 19, fill: 'rgba(56,189,248,0.24)', stroke: 'rgba(56,189,248,0.28)', strokeWidth: 4.5 }),
            h('circle', { key: 'c1', cx: 46, cy: 27, r: 19, fill: 'none', stroke: '#c4b5fd', strokeWidth: 1.8 }),
            h('circle', { key: 'c2', cx: 74, cy: 27, r: 19, fill: 'none', stroke: '#7dd3fc', strokeWidth: 1.8 }),
            h('circle', { key: 'mg', cx: 60, cy: 27, r: 7, fill: 'rgba(251,191,36,0.25)' }),
            h('circle', { key: 'm', cx: 60, cy: 27, r: 3.6, fill: 'url(#ff-amb-' + uid + ')', stroke: '#fef3c7', strokeWidth: 0.9 })
          ];
        } else if (type === 'T-Chart') {
          shapes = [
            h('rect', { key: 'l', x: 18, y: 12, width: 32, height: 32, rx: 4, fill: 'rgba(139,92,246,0.24)', stroke: '#a78bfa', strokeWidth: 1.6 }),
            h('rect', { key: 'r', x: 70, y: 12, width: 32, height: 32, rx: 4, fill: 'rgba(56,189,248,0.24)', stroke: '#38bdf8', strokeWidth: 1.6 }),
            h('line', { key: 'barg', x1: 16, y1: 12, x2: 104, y2: 12, stroke: 'rgba(248,250,252,0.28)', strokeWidth: 5, strokeLinecap: 'round' }),
            h('line', { key: 'bar', x1: 16, y1: 12, x2: 104, y2: 12, stroke: '#f8fafc', strokeWidth: 2, strokeLinecap: 'round' }),
            h('line', { key: 'div', x1: 60, y1: 13, x2: 60, y2: 45, stroke: '#cbd5e1', strokeWidth: 1.4, strokeDasharray: '3 2' }),
            h('circle', { key: 'hub', cx: 60, cy: 12, r: 2.6, fill: 'url(#ff-amb-' + uid + ')' })
          ];
        } else if (type === 'Fishbone') {
          shapes = [
            h('line', { key: 'spg', x1: 16, y1: 27, x2: 96, y2: 27, stroke: 'rgba(226,232,240,0.24)', strokeWidth: 5, strokeLinecap: 'round' }),
            h('line', { key: 'sp', x1: 16, y1: 27, x2: 96, y2: 27, stroke: '#f8fafc', strokeWidth: 2, strokeLinecap: 'round' }),
            h('polygon', { key: 'hd', points: '96,19 110,27 96,35', fill: 'url(#ff-amb-' + uid + ')', stroke: '#fef3c7', strokeWidth: 0.9, strokeLinejoin: 'round' }),
            h('line', { key: 'r1', x1: 30, y1: 11, x2: 42, y2: 27, stroke: '#a78bfa', strokeWidth: 2, strokeLinecap: 'round' }),
            h('line', { key: 'r2', x1: 54, y1: 11, x2: 66, y2: 27, stroke: '#38bdf8', strokeWidth: 2, strokeLinecap: 'round' }),
            h('line', { key: 'r3', x1: 30, y1: 43, x2: 42, y2: 27, stroke: '#34d399', strokeWidth: 2, strokeLinecap: 'round' }),
            h('line', { key: 'r4', x1: 54, y1: 43, x2: 66, y2: 27, stroke: '#f472b6', strokeWidth: 2, strokeLinecap: 'round' }),
            h('circle', { key: 'b1', cx: 30, cy: 11, r: 2.4, fill: '#ddd6fe' }),
            h('circle', { key: 'b2', cx: 54, cy: 11, r: 2.4, fill: '#bae6fd' }),
            h('circle', { key: 'b3', cx: 30, cy: 43, r: 2.4, fill: '#a7f3d0' }),
            h('circle', { key: 'b4', cx: 54, cy: 43, r: 2.4, fill: '#fbcfe8' })
          ];
        } else if (type === 'Cause and Effect') {
          shapes = [
            h('path', { key: 'ag', d: 'M28 17 L47 25 M28 37 L47 29 M73 25 L92 17 M73 29 L92 37', stroke: 'rgba(148,163,184,0.28)', strokeWidth: 4, strokeLinecap: 'round' }),
            h('path', { key: 'a', d: 'M28 17 L47 25 M28 37 L47 29 M73 25 L92 17 M73 29 L92 37', stroke: '#e2e8f0', strokeWidth: 1.5, strokeLinecap: 'round' }),
            h('circle', { key: 'c1', cx: 22, cy: 15, r: 5.5, fill: 'url(#ff-vio-' + uid + ')', stroke: '#ede9fe', strokeWidth: 0.9 }),
            h('circle', { key: 'c2', cx: 22, cy: 39, r: 5.5, fill: 'url(#ff-vio-' + uid + ')', stroke: '#ede9fe', strokeWidth: 0.9 }),
            h('rect', { key: 'mid', x: 48, y: 18, width: 24, height: 18, rx: 5, fill: 'url(#ff-amb-' + uid + ')', stroke: '#fef3c7', strokeWidth: 1 }),
            h('line', { key: 'ms', x1: 52, y1: 20.5, x2: 68, y2: 20.5, stroke: 'rgba(255,255,255,0.55)', strokeWidth: 1, strokeLinecap: 'round' }),
            h('circle', { key: 'e1', cx: 98, cy: 15, r: 5.5, fill: 'url(#ff-em-' + uid + ')', stroke: '#d1fae5', strokeWidth: 0.9 }),
            h('circle', { key: 'e2', cx: 98, cy: 39, r: 5.5, fill: 'url(#ff-sky-' + uid + ')', stroke: '#e0f2fe', strokeWidth: 0.9 })
          ];
        } else if (type === 'Frayer Model') {
          shapes = [
            h('rect', { key: 'q1', x: 16, y: 8, width: 38, height: 16, rx: 3.5, fill: 'rgba(139,92,246,0.26)', stroke: '#a78bfa', strokeWidth: 1.4 }),
            h('rect', { key: 'q2', x: 66, y: 8, width: 38, height: 16, rx: 3.5, fill: 'rgba(56,189,248,0.26)', stroke: '#38bdf8', strokeWidth: 1.4 }),
            h('rect', { key: 'q3', x: 16, y: 30, width: 38, height: 16, rx: 3.5, fill: 'rgba(52,211,153,0.26)', stroke: '#34d399', strokeWidth: 1.4 }),
            h('rect', { key: 'q4', x: 66, y: 30, width: 38, height: 16, rx: 3.5, fill: 'rgba(244,114,182,0.26)', stroke: '#f472b6', strokeWidth: 1.4 }),
            h('circle', { key: 'ctrg', cx: 60, cy: 27, r: 11.5, fill: 'rgba(251,191,36,0.22)' }),
            h('circle', { key: 'ctr', cx: 60, cy: 27, r: 8.2, fill: 'url(#ff-amb-' + uid + ')', stroke: '#0f172a', strokeWidth: 2 }),
            h('circle', { key: 'ctrh', cx: 57.5, cy: 24.5, r: 2, fill: 'rgba(255,255,255,0.55)' })
          ];
        } else if (type === 'KWL Chart') {
          shapes = [
            h('path', { key: 'arcg', d: 'M20 38 Q60 8 100 32', stroke: 'rgba(56,189,248,0.3)', strokeWidth: 4.5, fill: 'none', strokeLinecap: 'round' }),
            h('path', { key: 'arc', d: 'M20 38 Q60 8 100 32', stroke: '#cbd5e1', strokeWidth: 1.8, fill: 'none', strokeDasharray: '4 3', strokeLinecap: 'round' }),
            h('circle', { key: 'k', cx: 22, cy: 36, r: 7.5, fill: 'url(#ff-vio-' + uid + ')', stroke: '#ede9fe', strokeWidth: 1 }),
            h('circle', { key: 'w', cx: 60, cy: 19, r: 8.5, fill: 'url(#ff-sky-' + uid + ')', stroke: '#e0f2fe', strokeWidth: 1 }),
            h('circle', { key: 'l', cx: 98, cy: 32, r: 9, fill: 'url(#ff-em-' + uid + ')', stroke: '#d1fae5', strokeWidth: 1 })
          ];
        } else if (type === 'See-Think-Wonder') {
          shapes = [
            h('polygon', { key: 'tri', points: '60,11 26,41 94,41', fill: 'rgba(139,92,246,0.16)', stroke: '#cbd5e1', strokeWidth: 1.5, strokeLinejoin: 'round' }),
            h('circle', { key: 'n1', cx: 60, cy: 11, r: 6.5, fill: 'url(#ff-sky-' + uid + ')', stroke: '#e0f2fe', strokeWidth: 1 }),
            h('circle', { key: 'n2', cx: 26, cy: 41, r: 6.5, fill: 'url(#ff-vio-' + uid + ')', stroke: '#ede9fe', strokeWidth: 1 }),
            h('circle', { key: 'n3', cx: 94, cy: 41, r: 6.5, fill: 'url(#ff-amb-' + uid + ')', stroke: '#fef3c7', strokeWidth: 1 })
          ];
        } else if (type === 'Claim-Evidence-Reasoning') {
          shapes = [
            h('rect', { key: 'p1', x: 24, y: 31, width: 14, height: 15, rx: 2.5, fill: 'url(#ff-em-' + uid + ')', stroke: 'rgba(167,243,208,0.6)', strokeWidth: 0.8 }),
            h('rect', { key: 'p2', x: 53, y: 31, width: 14, height: 15, rx: 2.5, fill: 'url(#ff-em-' + uid + ')', stroke: 'rgba(167,243,208,0.6)', strokeWidth: 0.8 }),
            h('rect', { key: 'p3', x: 82, y: 31, width: 14, height: 15, rx: 2.5, fill: 'url(#ff-em-' + uid + ')', stroke: 'rgba(167,243,208,0.6)', strokeWidth: 0.8 }),
            h('rect', { key: 'beam', x: 20, y: 22, width: 80, height: 7, rx: 2.5, fill: 'url(#ff-sky-' + uid + ')', stroke: 'rgba(186,230,253,0.65)', strokeWidth: 0.8 }),
            h('polygon', { key: 'roof', points: '60,7 18,21 102,21', fill: 'url(#ff-vio-' + uid + ')', stroke: '#ddd6fe', strokeWidth: 0.9, strokeLinejoin: 'round' }),
            h('circle', { key: 'apex', cx: 60, cy: 14, r: 2.2, fill: '#fef08a' })
          ];
        } else if (type === 'Story Map') {
          shapes = [
            h('path', { key: 'mtg', d: 'M12 44 L36 30 L64 10 L86 29 L108 44', stroke: 'rgba(167,139,250,0.34)', strokeWidth: 6, fill: 'none', strokeLinejoin: 'round', strokeLinecap: 'round' }),
            h('path', { key: 'mt', d: 'M12 44 L36 30 L64 10 L86 29 L108 44', stroke: '#c4b5fd', strokeWidth: 2.2, fill: 'rgba(139,92,246,0.2)', strokeLinejoin: 'round', strokeLinecap: 'round' }),
            h('circle', { key: 'pkg', cx: 64, cy: 10, r: 7.5, fill: 'rgba(251,191,36,0.25)' }),
            h('circle', { key: 'pk', cx: 64, cy: 10, r: 4.5, fill: 'url(#ff-amb-' + uid + ')', stroke: '#fef3c7', strokeWidth: 1 }),
            h('circle', { key: 'p1', cx: 36, cy: 30, r: 3.4, fill: 'url(#ff-sky-' + uid + ')', stroke: '#e0f2fe', strokeWidth: 0.8 }),
            h('circle', { key: 'p2', cx: 86, cy: 29, r: 3.4, fill: 'url(#ff-em-' + uid + ')', stroke: '#d1fae5', strokeWidth: 0.8 })
          ];
        } else if (type === 'Flow Chart') {
          shapes = [
            h('path', { key: 'flg', d: 'M18 14 H56 C70 14 70 27 56 27 H44 C30 27 30 41 44 41 H98', stroke: 'rgba(56,189,248,0.3)', strokeWidth: 5.5, fill: 'none', strokeLinecap: 'round' }),
            h('path', { key: 'fl', d: 'M18 14 H56 C70 14 70 27 56 27 H44 C30 27 30 41 44 41 H98', stroke: '#7dd3fc', strokeWidth: 2, fill: 'none', strokeLinecap: 'round' }),
            h('circle', { key: 'a', cx: 20, cy: 14, r: 4.5, fill: 'url(#ff-vio-' + uid + ')', stroke: '#ede9fe', strokeWidth: 0.9 }),
            h('circle', { key: 'b', cx: 52, cy: 27, r: 4.8, fill: 'url(#ff-amb-' + uid + ')', stroke: '#fef3c7', strokeWidth: 0.9 }),
            h('circle', { key: 'c', cx: 96, cy: 41, r: 4.5, fill: 'url(#ff-em-' + uid + ')', stroke: '#d1fae5', strokeWidth: 0.9 })
          ];
        } else if (type === 'Key Concept Map') {
          shapes = [
            h('ellipse', { key: 'o1', cx: 60, cy: 27, rx: 40, ry: 15, fill: 'none', stroke: 'rgba(148,163,184,0.48)', strokeWidth: 1.4, strokeDasharray: '3 2' }),
            h('circle', { key: 'sung', cx: 60, cy: 27, r: 12, fill: 'rgba(251,191,36,0.22)' }),
            h('circle', { key: 'sun', cx: 60, cy: 27, r: 8.2, fill: 'url(#ff-amb-' + uid + ')', stroke: '#fef3c7', strokeWidth: 1 }),
            h('circle', { key: 'm1', cx: 22, cy: 24, r: 5, fill: 'url(#ff-vio-' + uid + ')', stroke: '#ede9fe', strokeWidth: 0.9 }),
            h('circle', { key: 'm2', cx: 96, cy: 22, r: 5, fill: 'url(#ff-sky-' + uid + ')', stroke: '#e0f2fe', strokeWidth: 0.9 }),
            h('circle', { key: 'm3', cx: 74, cy: 41, r: 5, fill: 'url(#ff-em-' + uid + ')', stroke: '#d1fae5', strokeWidth: 0.9 })
          ];
        } else if (type === 'Problem Solution') {
          shapes = [
            h('line', { key: 'l1', x1: 50, y1: 27, x2: 24, y2: 18, stroke: '#cbd5e1', strokeWidth: 1.5 }),
            h('line', { key: 'l2', x1: 70, y1: 27, x2: 96, y2: 18, stroke: '#cbd5e1', strokeWidth: 1.5 }),
            h('line', { key: 'l3', x1: 60, y1: 37, x2: 60, y2: 46, stroke: '#cbd5e1', strokeWidth: 1.5 }),
            h('polygon', { key: 'prg', points: '60,14 73,27 60,40 47,27', fill: 'rgba(244,63,94,0.25)' }),
            h('polygon', { key: 'pr', points: '60,17 70,27 60,37 50,27', fill: '#fb7185', stroke: '#ffe4e6', strokeWidth: 1, strokeLinejoin: 'round' }),
            h('circle', { key: 's1', cx: 22, cy: 17, r: 6, fill: 'url(#ff-em-' + uid + ')', stroke: '#d1fae5', strokeWidth: 0.9 }),
            h('circle', { key: 's2', cx: 98, cy: 17, r: 6, fill: 'url(#ff-sky-' + uid + ')', stroke: '#e0f2fe', strokeWidth: 0.9 }),
            h('circle', { key: 's3', cx: 60, cy: 46, r: 5, fill: 'url(#ff-vio-' + uid + ')', stroke: '#ede9fe', strokeWidth: 0.9 })
          ];
        } else {
          shapes = [
            h('polygon', { key: 'pl1', points: '24,18 54,10 74,20 44,28', fill: 'rgba(139,92,246,0.42)', stroke: '#c4b5fd', strokeWidth: 1.4, strokeLinejoin: 'round' }),
            h('polygon', { key: 'pl2', points: '44,32 76,24 98,34 66,42', fill: 'rgba(56,189,248,0.38)', stroke: '#7dd3fc', strokeWidth: 1.4, strokeLinejoin: 'round' }),
            h('circle', { key: 'st1', cx: 34, cy: 14, r: 2.8, fill: 'url(#ff-amb-' + uid + ')', stroke: '#fef3c7', strokeWidth: 0.7 }),
            h('circle', { key: 'st2', cx: 88, cy: 16, r: 2.8, fill: 'url(#ff-em-' + uid + ')', stroke: '#d1fae5', strokeWidth: 0.7 })
          ];
        }
        return h('svg', svgProps, defs, bgGrid, shapes);
      };

      // Live 2D topology minimap of the student's current composition (always crisp even before/without WebGL).
      var renderLiveTopologySvg = function(d) {
        var grps = (d && Array.isArray(d.groups)) ? d.groups : [];
        var cx = 140, cy = 62;
        var gNodes = grps.map(function(g, gi) {
          var ang = (-Math.PI / 2) + (gi / Math.max(1, grps.length)) * Math.PI * 2;
          var rx = grps.length <= 2 ? 78 : 88, ry = grps.length <= 2 ? 22 : 34;
          return { g: g, x: cx + Math.cos(ang) * rx, y: cy + Math.sin(ang) * ry, color: GROUP_ACCENTS[gi % GROUP_ACCENTS.length] };
        });
        return h('svg', {
          viewBox: '0 0 280 124', className: 'w-full h-auto block', role: 'img',
          'aria-label': t('stem.freeforms.minimap_aria', 'Spatial blueprint showing') + ' ' + stats.groups + ' ' + t('stem.freeforms.groups', 'groups') + ' & ' + stats.items + ' ' + t('stem.freeforms.ideas', 'ideas')
        },
          h('defs', null,
            h('linearGradient', { id: 'ff-topo-bg', x1: '0', y1: '0', x2: '0', y2: '1' },
              h('stop', { offset: '0%', stopColor: '#060a16' }),
              h('stop', { offset: '100%', stopColor: '#0d152a' })
            ),
            h('radialGradient', { id: 'ff-topo-aura', cx: '50%', cy: '50%', r: '48%' },
              h('stop', { offset: '0%', stopColor: '#7c3aed', stopOpacity: '0.32' }),
              h('stop', { offset: '65%', stopColor: '#0ea5e9', stopOpacity: '0.08' }),
              h('stop', { offset: '100%', stopColor: '#060a16', stopOpacity: '0' })
            ),
            h('radialGradient', { id: 'ff-topo-core', cx: '35%', cy: '32%', r: '68%' },
              h('stop', { offset: '0%', stopColor: '#ddd6fe' }),
              h('stop', { offset: '55%', stopColor: '#7c3aed' }),
              h('stop', { offset: '100%', stopColor: '#4c1d95' })
            )
          ),
          h('rect', { x: 1, y: 1, width: 278, height: 122, rx: 10, fill: 'url(#ff-topo-bg)', stroke: '#334155', strokeWidth: 1.1 }),
          h('rect', { x: 1, y: 1, width: 278, height: 122, rx: 10, fill: 'url(#ff-topo-aura)' }),
          h('line', { x1: 14, y1: cy, x2: 266, y2: cy, stroke: 'rgba(148,163,184,0.12)', strokeWidth: 0.8, strokeDasharray: '2 4' }),
          h('line', { x1: cx, y1: 10, x2: cx, y2: 114, stroke: 'rgba(148,163,184,0.12)', strokeWidth: 0.8, strokeDasharray: '2 4' }),
          h('path', { d: 'M8 14 V8 H14 M272 14 V8 H266 M8 110 V116 H14 M272 110 V116 H266', fill: 'none', stroke: 'rgba(167,139,250,0.45)', strokeWidth: 1.1, strokeLinecap: 'round' }),
          h('ellipse', { cx: cx, cy: cy, rx: 94, ry: 38, fill: 'none', stroke: 'rgba(148,163,184,0.22)', strokeWidth: 1, strokeDasharray: '3 3' }),
          h('ellipse', { cx: cx, cy: cy, rx: 52, ry: 21, fill: 'none', stroke: 'rgba(167,139,250,0.16)', strokeWidth: 0.8 }),
          gNodes.map(function(gn) {
            return h('g', { key: 'ln-' + gn.g.id },
              h('line', { x1: cx, y1: cy, x2: gn.x, y2: gn.y, stroke: gn.color, strokeOpacity: 0.22, strokeWidth: 4.5, strokeLinecap: 'round' }),
              h('line', { x1: cx, y1: cy, x2: gn.x, y2: gn.y, stroke: gn.color, strokeOpacity: 0.72, strokeWidth: 1.5, strokeLinecap: 'round' })
            );
          }),
          h('circle', { cx: cx, cy: cy, r: 14, fill: 'rgba(124,58,237,0.2)' }),
          h('circle', { cx: cx, cy: cy, r: 9.2, fill: 'url(#ff-topo-core)', stroke: '#ddd6fe', strokeWidth: 1.6 }),
          h('circle', { cx: cx - 2.6, cy: cy - 2.8, r: 2.2, fill: 'rgba(255,255,255,0.55)' }),
          gNodes.map(function(gn) {
            var items = gn.g.items || [];
            return h('g', { key: 'gn-' + gn.g.id },
              h('circle', { cx: gn.x, cy: gn.y, r: 10, fill: gn.color, fillOpacity: 0.18 }),
              h('circle', { cx: gn.x, cy: gn.y, r: 6.5, fill: gn.color, stroke: '#0f172a', strokeWidth: 1.5 }),
              h('circle', { cx: gn.x - 1.8, cy: gn.y - 1.8, r: 1.6, fill: 'rgba(255,255,255,0.5)' }),
              items.slice(0, 6).map(function(it, ii) {
                var a2 = (ii / Math.max(1, Math.min(items.length, 6))) * Math.PI * 2;
                var ix = Math.max(12, Math.min(268, gn.x + Math.cos(a2) * 18));
                var iy = Math.max(12, Math.min(112, gn.y + Math.sin(a2) * 14));
                var isSel = selectedId === it.id;
                var hasArt = !!(d.nodeArt && d.nodeArt[it.id]);
                return h('g', { key: it.id },
                  isSel ? h('circle', { cx: ix, cy: iy, r: 7.5, fill: 'none', stroke: '#facc15', strokeWidth: 1.1, strokeDasharray: '2 2' }) : null,
                  hasArt ? h('circle', { cx: ix, cy: iy, r: 5.8, fill: 'rgba(251,191,36,0.24)' }) : null,
                  h('circle', {
                    cx: ix, cy: iy, r: isSel ? 4.8 : 3.4,
                    fill: hasArt ? '#fbbf24' : '#f1f5f9',
                    stroke: isSel ? '#fef08a' : gn.color,
                    strokeWidth: isSel ? 1.8 : 1.1
                  })
                );
              })
            );
          })
        );
      };

      // Quick-start sample seed for empty compositions (one-click inspiration, undoable).
      var loadStarterSample = function() {
        if (!doc || !doc.groups || !doc.groups.length) return;
        var sampleBank = {
          'Venn Diagram': { title: 'Ocean vs. Desert Ecosystems', lists: [['Coral reefs', 'Saltwater currents'], ['Cacti water storage', 'Extreme night chill'], ['Food webs', 'Adapted predators']] },
          'Story Map': { title: 'The Lighthouse Signal', lists: [['Storm gathers at dusk'], ['Power fails on the headland'], ['Lantern lit by hand in the gale'], ['Freighter steers clear'], ['Dawn reveals calm harbor']] },
          'Claim-Evidence-Reasoning': { title: 'Urban Trees Cool Cities', lists: [['Street canopies reduce heat islands'], ['Shaded asphalt is 12°C cooler', 'Satellite thermal maps confirm drops'], ['Evapotranspiration + shade absorb solar energy']] },
          'Fishbone': { title: 'Why Pollinators Decline', lists: [['Habitat loss', 'Fragmented meadows'], ['Pesticide runoff'], ['Shifting bloom seasons'], ['Parasites & mites']] }
        };
        var bank = sampleBank[doc.scaffold];
        bump(function(d) {
          if (!d.title && bank) d.title = bank.title;
          else if (!d.title) d.title = (ffScaffold(d.scaffold) ? ffScaffold(d.scaffold).name : 'My') + ' Exploration';
          var nid = (typeof d.nextId === 'number' && isFinite(d.nextId) && d.nextId > 0) ? Math.floor(d.nextId) : 1;
          d.groups = (Array.isArray(d.groups) ? d.groups : []).map(function(g, gi) {
            if ((g.items || []).length) return g;
            var seedList = (bank && bank.lists[gi]) ? bank.lists[gi] : ['Key idea ' + (gi + 1) + 'A', 'Key idea ' + (gi + 1) + 'B'];
            var added = seedList.map(function(txt) { var id = 'n' + (nid++); return { id: id, text: txt, note: '' }; });
            return Object.assign({}, g, { items: added });
          });
          d.nextId = nid;
          return d;
        });
        announceToSR(t('stem.freeforms.sr_sample_loaded', 'Starter ideas added — edit or replace any idea to make it yours.'));
      };

      // Import confirm strip — shown (on either screen) only when an organizer
      // handoff is pending AND the student already has content to protect.
      var renderImportStrip = function() {
        if (!pendingImport) return null;
        return h('div', { className: 'mb-3 flex flex-wrap items-center gap-2 bg-amber-950/75 border border-amber-500 rounded-xl p-2.5', role: 'alert' },
          h('div', { className: 'text-xs text-amber-100 flex-1 min-w-0' },
            '🏛️ ' + t('stem.freeforms.import_prompt', 'Import the organizer') + ' "' + String(pendingImport.main || '').slice(0, 60) + '"? ' + t('stem.freeforms.import_replaces', 'This replaces your current composition.')),
          h('button', { className: BTN_HOT, onClick: function() { consumeImport(true); } }, t('stem.freeforms.import_yes', 'Import')),
          h('button', { className: BTN_GHOST, onClick: function() { consumeImport(false); } }, t('stem.freeforms.import_no', 'Keep mine'))
        );
      };

      // ── Picker screen ──
      if (!doc || !doc.scaffold) {
        var visibleScaffolds = pickerCat === 'all' ? FF_SCAFFOLDS : FF_SCAFFOLDS.filter(function(s) { return FORM_FAMILY[s.type] === pickerCat; });
        var hasExistingContent = !!(doc && doc.groups && (Array.isArray(doc.groups) ? doc.groups : []).some(function(g) { return (g.items || []).length; }));
        return h('div', { id: 'allo-free-forms', className: 'p-4 md:p-6' },
          h('div', { className: 'max-w-5xl mx-auto space-y-4' },
            renderImportStrip(),
            // Hero Studio Workbench Header
            h('div', { className: 'ff-hero p-4 md:p-5' },
              h('div', { className: 'flex flex-wrap items-start justify-between gap-3' },
                h('div', { className: 'flex-1 min-w-[220px]' },
                  h('div', { className: 'flex flex-wrap items-center gap-2 mb-1.5' },
                    h('span', { className: 'ff-pill text-[0.6875rem] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-violet-950/90 text-violet-200 border border-violet-500/60' }, '🏛️ ' + t('stem.freeforms.subject_badge', '3D Spatial Studio · Arts & Concept Craft')),
                    h('span', { className: 'ff-pill text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-sky-200 border border-slate-600' }, FF_SCAFFOLDS.length + ' ' + t('stem.freeforms.spatial_grammars', 'Spatial Grammars'))
                  ),
                  h('h2', { className: 'text-2xl md:text-3xl font-black text-white tracking-tight mb-1' }, t('stem.freeforms.title', 'Free Forms')),
                  h('p', { className: 'text-sm text-slate-200 leading-relaxed' }, t('stem.freeforms.tagline', 'Build your own World of Forms: pick an archetypal structure, fill it with YOUR ideas, arrange it in 3D, and sculpt what matters.')),
                  h('p', { className: 'text-xs text-slate-300 mt-1' }, t('stem.freeforms.tagline2', 'You are the author here — the AI only coaches, and only when you ask.'))
                ),
                // 3-step studio workflow strip
                h('div', { className: 'ff-surface rounded-xl p-3 text-xs space-y-1.5 min-w-[200px] max-w-xs' },
                  h('div', { className: 'text-[0.6875rem] font-extrabold uppercase tracking-wider text-violet-300' }, t('stem.freeforms.workflow_heading', 'Studio Workflow')),
                  h('div', { className: 'text-slate-200' }, '1. ' + t('stem.freeforms.wf_step1', 'Pick a spatial grammar below')),
                  h('div', { className: 'text-slate-200' }, '2. ' + t('stem.freeforms.wf_step2', 'Author groups, notes & 3D sculptures')),
                  h('div', { className: 'text-slate-200' }, '3. ' + t('stem.freeforms.wf_step3', 'Arrange in 3D & test your recall'))
                )
              ),
              hasExistingContent
                ? h('div', { className: 'mt-3 px-3 py-2 rounded-lg bg-amber-950/60 border border-amber-500/60 text-xs text-amber-200 font-medium' },
                    '✨ ' + t('stem.freeforms.keep_content_hint', 'Your groups and ideas stay — choosing a form just changes the shape of the space.'))
                : null
            ),
            // Form-family filter chips
            h('div', { className: 'flex flex-wrap items-center gap-2', role: 'group', 'aria-label': t('stem.freeforms.filter_forms', 'Filter forms by purpose') },
              FAMILY_TABS.map(function(ft) {
                var active = pickerCat === ft.id;
                return h('button', {
                  key: ft.id, type: 'button', 'aria-pressed': active ? 'true' : 'false',
                  onClick: function() { setPickerCat(ft.id); },
                  className: 'min-h-[38px] px-3 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer ' +
                    (active ? 'bg-violet-600 border-violet-300 text-white shadow-sm' : 'bg-slate-900/80 border-slate-600 text-slate-200 hover:bg-slate-800')
                }, ft.label);
              })
            ),
            // Archetype blueprint grid
            h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3', role: 'list' },
              visibleScaffolds.map(function(sc) {
                return h('div', { key: sc.type, role: 'listitem', className: 'flex' }, h('button', {
                  type: 'button',
                  className: 'ff-card text-left bg-slate-900/85 border-2 border-slate-700 rounded-2xl p-3.5 min-h-[44px] gap-2.5',
                  onClick: function() { chooseScaffold(sc.type); },
                  'aria-label': sc.name + '. ' + sc.grammar
                },
                  h('div', { className: 'ff-card-svg w-full p-2 flex items-center justify-center' }, renderScaffoldBlueprint(sc.type, 'md')),
                  h('div', { className: 'flex items-center gap-1.5' },
                    h('span', { className: 'text-lg leading-none', 'aria-hidden': 'true' }, sc.icon),
                    h('span', { className: 'font-black text-slate-50 text-sm' }, sc.name)
                  ),
                  h('div', { className: 'text-xs leading-snug text-slate-300 flex-1' }, sc.grammar),
                  h('div', { className: 'flex flex-wrap gap-1 pt-1 border-t border-slate-700/80' },
                    (sc.starters || []).slice(0, 3).map(function(stLabel, si) {
                      return h('span', { key: si, className: 'ff-pill text-[0.625rem] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-violet-200 border border-slate-600' }, stLabel);
                    })
                  )
                ));
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
        // Studio Workbench Header
        h('div', { className: 'ff-hero p-3 md:p-3.5 mb-3 space-y-2.5' },
          h('div', { className: 'flex flex-wrap items-center gap-2.5' },
            !inChallenge ? h('button', { className: BTN_GHOST, onClick: backToPicker, 'aria-label': t('stem.freeforms.change_form', 'Change form') }, '← ' + t('stem.freeforms.forms', 'Forms')) : null,
            h('div', { className: 'ff-card-svg p-1 shrink-0 hidden sm:block' }, renderScaffoldBlueprint(sc.type, 'sm')),
            h('div', { className: 'flex-1 min-w-[160px]' },
              h('div', { className: 'flex flex-wrap items-center gap-2' },
                h('h2', { className: 'text-base md:text-lg font-black text-white m-0' }, (inChallenge ? '🎯 ' : sc.icon + ' ') + (inChallenge ? t('stem.freeforms.recall_title', 'Recall: rebuild your world') : sc.name)),
                h('span', { className: 'ff-pill text-[0.6875rem] font-bold px-2 py-0.5 rounded-full ' + (inChallenge ? 'bg-amber-950 text-amber-200 border border-amber-500' : 'bg-violet-950 text-violet-200 border border-violet-500/70') },
                  inChallenge ? t('stem.freeforms.recall_badge', 'Recall Mode') : t('stem.freeforms.studio_badge', '3D Form Studio'))
              ),
              !inChallenge ? h('p', { className: 'text-xs text-slate-300 mt-0.5 mb-0' }, sc.grammar) : null
            ),
            !inChallenge ? h('div', { className: 'flex flex-wrap items-center gap-1.5', 'aria-label': t('stem.freeforms.metrics_aria', 'Composition metrics') },
              h('span', { className: 'ff-pill text-xs font-bold text-slate-100 bg-slate-800 border border-slate-600 rounded-full px-2.5 py-1' }, stats.groups + ' ' + t('stem.freeforms.groups', 'groups')),
              h('span', { className: 'ff-pill text-xs font-bold text-sky-200 bg-slate-800 border border-slate-600 rounded-full px-2.5 py-1' }, stats.items + ' ' + t('stem.freeforms.ideas', 'ideas')),
              stats.sculpted > 0 ? h('span', { className: 'ff-pill text-xs font-bold text-amber-200 bg-slate-800 border border-amber-500/70 rounded-full px-2.5 py-1' }, '🗿 ' + stats.sculpted + ' ' + t('stem.freeforms.sculpted', 'sculpted')) : null
            ) : null
          ),
          // Action toolbar row
          h('div', { className: 'flex flex-wrap items-center gap-2 pt-2 border-t border-slate-700/80' },
            !inChallenge ? h('button', { className: BTN_GHOST, onClick: doUndo, disabled: !undoRef.current.length, 'aria-label': t('stem.freeforms.undo_tip', 'Undo the last change (Ctrl+Z)'), title: t('stem.freeforms.undo_tip', 'Undo the last change (Ctrl+Z)') }, '↩ ' + t('stem.freeforms.undo', 'Undo')) : null,
            (modulesReady && !modulesFailed) ? h('button', { className: BTN_GHOST, onClick: doSnapshot, title: t('stem.freeforms.snapshot_tip', 'Save a picture of your 3D world') }, '📷 ' + t('stem.freeforms.snapshot', 'Snapshot')) : null,
            !inChallenge ? h('button', { className: BTN_GHOST, onClick: doPrint, title: t('stem.freeforms.print_tip', 'Download a printable one-pager (snapshot + your ideas + coach feedback)') }, '🖨 ' + t('stem.freeforms.print', 'One-pager')) : null,
            (!inChallenge && doc.arrangement) ? h('button', { className: BTN_GHOST, onClick: resetArrangement }, '↺ ' + t('stem.freeforms.reset_arrangement', 'Reset arrangement')) : null,
            !inChallenge ? h('button', { className: BTN_GHOST, onClick: startChallenge, disabled: !recallEligible,
              title: recallEligible ? t('stem.freeforms.recall_tip', 'Your ideas fall into a tray — put them back from memory') : t('stem.freeforms.recall_needs_more', 'Add at least 4 ideas across 2 groups first') },
              '🎯 ' + t('stem.freeforms.recall', 'Test yourself')) : null,
            (!inChallenge && hasAI) ? h('button', { className: BTN_HOT + ' ml-auto', onClick: doAssess, disabled: assessBusy || stats.items < 3, 'aria-busy': assessBusy ? 'true' : 'false',
              title: stats.items < 3 ? t('stem.freeforms.assess_needs_items', 'Add at least 3 ideas first') : t('stem.freeforms.assess_tip', 'Ask the AI coach to look at your whole composition') },
              (assessBusy ? '… ' : '\u{1F9E0} ') + t('stem.freeforms.assess', 'Assess my composition')) : null
          )
        ),
        // split: sidebar + 3D stage
        h('div', { className: 'ff-split flex gap-3 items-stretch' },
          // ── recall panel (challenge) OR authoring sidebar (the accessible source of truth) ──
          inChallenge ? h('div', { className: 'ff-sidebar w-80 shrink-0 bg-slate-900/90 border border-amber-500 rounded-2xl p-3.5 overflow-y-auto', style: { maxHeight: '72vh' } },
            h('div', { className: 'text-sm font-black text-amber-200 mb-2' }, '🎯 ' + t('stem.freeforms.recall_heading', 'Rebuild it from memory')),
            h('p', { className: 'text-xs text-slate-200 leading-relaxed mb-3' },
              t('stem.freeforms.recall_instructions', 'Every idea fell out of its place into the tray at the bottom. Select an idea in the space, then use the group chips (or the [ and ] keys) to send it home. Nothing is saved during the game.')),
            h('div', { className: 'text-xs font-bold text-slate-100 bg-slate-800 border border-slate-600 rounded-full px-3 py-1.5 inline-block mb-3', role: 'status' },
              placedCount + '/' + challenge.targets.length + ' ' + t('stem.freeforms.recall_placed', 'placed')),
            checked ? h('div', { className: 'text-sm font-black rounded-xl px-3 py-2 mb-3 ' + (checked.complete ? 'bg-emerald-900/75 text-emerald-100 border border-emerald-500' : 'bg-slate-800 text-slate-100 border border-slate-500'), role: 'status' },
              (checked.complete ? '🎉 ' : '') + checked.correct + '/' + checked.total + ' ' + t('stem.freeforms.recall_correct', 'correct') +
              (checked.complete ? ' — ' + t('stem.freeforms.recall_complete', 'you rebuilt your whole world!') : '')) : null,
            h('div', { className: 'flex flex-wrap gap-1.5 mb-2' },
              h('button', { className: BTN_HOT, onClick: checkChallenge, disabled: !placedCount }, '✓ ' + t('stem.freeforms.recall_check', 'Check')),
              h('button', { className: BTN_GHOST, onClick: retryChallenge }, '↺ ' + t('stem.freeforms.recall_retry', 'Retry')),
              h('button', { className: BTN_GHOST, onClick: exitChallenge }, t('stem.freeforms.recall_exit', 'Exit'))
            ),
            (hasAI && checked && !checked.complete && selectedId && challenge.answerKey[selectedId] && checked.results && checked.results[selectedId] !== 'correct')
              ? h('button', { className: BTN_GHOST + ' w-full mb-1', onClick: doHint, disabled: hintBusy, 'aria-busy': hintBusy ? 'true' : 'false' },
                  (hintBusy ? '… ' : '💡 ') + t('stem.freeforms.recall_hint', 'Hint for the selected idea')) : null,
            h('div', { 'aria-live': 'polite' },
              hintText ? h('p', { className: 'text-xs text-amber-100 bg-amber-950/75 border border-amber-600 rounded-lg p-2.5 leading-snug' }, '💡 ' + hintText) : null),
            // recall history — persisted attempts + which ideas are still settling
            (doc.recallLog && doc.recallLog.length) ? h('div', { className: 'mt-3 pt-2 border-t border-slate-700' },
              h('div', { className: 'text-xs font-bold text-slate-200 mb-1.5' }, '📈 ' + t('stem.freeforms.recall_history', 'Recall history')),
              h('ul', { className: 'space-y-1' }, doc.recallLog.slice().reverse().slice(0, 5).map(function(r, i) {
                return h('li', { key: i, className: 'text-xs text-slate-300 leading-snug' },
                  r.correct + '/' + r.total + (r.missed && r.missed.length ? ' — ' + t('stem.freeforms.recall_still_learning', 'still learning:') + ' ' + r.missed.slice(0, 4).join(', ') : ' 🎉'));
              }))) : null
          )
          : h('div', { className: 'ff-sidebar w-80 shrink-0 bg-slate-900/90 border border-slate-700 rounded-2xl p-3.5 overflow-y-auto space-y-3', style: { maxHeight: '72vh' } },
            // Live spatial topology minimap card
            h('div', { className: 'ff-surface rounded-xl p-2' },
              h('div', { className: 'flex items-center justify-between text-[0.6875rem] font-bold text-slate-300 mb-1.5 px-1' },
                h('span', null, '🧭 ' + t('stem.freeforms.blueprint_map', 'Live Form Blueprint')),
                h('span', { className: 'text-violet-300' }, stats.notes ? stats.notes + ' ' + t('stem.freeforms.notes_count', 'notes') : sc.name)
              ),
              renderLiveTopologySvg(doc)
            ),
            h('div', null,
              h('label', { className: 'block text-xs font-bold text-slate-200 mb-1', htmlFor: 'ff-title' }, t('stem.freeforms.composition_title', 'Composition title')),
              h('input', {
                id: 'ff-title', key: 'title-' + rev, defaultValue: doc.title || '',
                placeholder: t('stem.freeforms.title_placeholder', 'What is this world about?'),
                className: 'w-full bg-slate-800 border border-slate-500 rounded-lg px-2.5 py-2 text-sm text-slate-50',
                onBlur: function(e) { if (e.target.value !== doc.title) setTitle(e.target.value); }
              })
            ),
            stats.items === 0 ? h('div', { className: 'rounded-xl bg-violet-950/60 border border-violet-500/60 p-2.5 flex items-center justify-between gap-2' },
              h('span', { className: 'text-xs text-violet-100 leading-snug' }, t('stem.freeforms.empty_prompt', 'Want to see the 3D form populated first?')),
              h('button', { type: 'button', className: BTN_HOT + ' shrink-0', onClick: loadStarterSample }, '✨ ' + t('stem.freeforms.try_sample', 'Seed sample'))
            ) : null,
            (Array.isArray(doc.groups) ? doc.groups : []).map(function(g, gi) {
              var accent = GROUP_ACCENTS[gi % GROUP_ACCENTS.length];
              return h('div', {
                key: g.id + '-' + rev,
                className: 'bg-slate-800/75 border border-slate-700 rounded-xl p-2.5',
                style: { borderLeft: '4px solid ' + accent }
              },
                h('div', { className: 'flex items-center gap-1.5 mb-1.5' },
                  h('input', {
                    defaultValue: g.title, 'aria-label': t('stem.freeforms.group_name', 'Group name'),
                    className: 'flex-1 min-w-0 bg-transparent border border-transparent focus:border-slate-500 rounded px-1.5 py-1 text-sm font-black text-white',
                    onBlur: function(e) { var v = e.target.value.trim(); if (v && v !== g.title) renameGroup(g.id, v); }
                  }),
                  h('span', { className: 'ff-pill text-[0.6875rem] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-slate-200 border border-slate-600' }, (g.items || []).length),
                  h('button', { className: 'min-h-[40px] min-w-[40px] rounded-lg text-slate-300 hover:text-rose-300 hover:bg-slate-700', 'aria-label': t('stem.freeforms.delete_group', 'Delete group') + ' ' + g.title, onClick: function() { deleteGroup(g.id); } }, '\u{1F5D1}️')
                ),
                (g.items || []).map(function(it) {
                  var isSel = selectedId === it.id;
                  var hasArt = !!(doc.nodeArt && doc.nodeArt[it.id]);
                  return h('div', { key: it.id, className: 'flex items-center gap-1 mb-1 rounded-lg px-0.5 ' + (isSel ? 'bg-violet-900/55 ring-1 ring-violet-400' : 'hover:bg-slate-700/40') },
                    h('button', {
                      className: 'min-h-[40px] min-w-[34px] text-xs rounded-md', 'aria-pressed': isSel ? 'true' : 'false',
                      'aria-label': (isSel ? t('stem.freeforms.selected', 'Selected') + ': ' : t('stem.freeforms.select_idea', 'Select idea') + ': ') + it.text,
                      style: { color: hasArt ? '#fbbf24' : accent },
                      onClick: function() { setSelectedId(isSel ? null : it.id); setSelPart(0); setSculptText(''); }
                    }, hasArt ? '\u{1F5FF}' : '●'),
                    h('input', {
                      defaultValue: it.text, 'aria-label': t('stem.freeforms.idea_text', 'Idea text'),
                      className: 'flex-1 min-w-0 bg-transparent border border-transparent focus:border-slate-500 rounded px-1 py-1 text-sm text-slate-100',
                      onBlur: function(e) { var v = e.target.value.trim(); if (v && v !== it.text) editItem(g.id, it.id, { text: v }); }
                    }),
                    h('button', { className: 'min-h-[40px] min-w-[36px] rounded-lg text-slate-300 hover:text-rose-300 hover:bg-slate-700 text-xs', 'aria-label': t('stem.freeforms.delete_idea', 'Delete idea') + ' ' + it.text, onClick: function() { deleteItem(g.id, it.id); } }, '✕')
                  );
                }),
                h('form', {
                  className: 'flex gap-1.5 mt-1.5',
                  onSubmit: function(e) { e.preventDefault(); var inp = e.target.elements['ff-add-' + g.id]; if (inp) { addItem(g.id, inp.value); inp.value = ''; } }
                },
                  h('input', { name: 'ff-add-' + g.id, placeholder: t('stem.freeforms.add_idea_placeholder', 'Add an idea…'), 'aria-label': t('stem.freeforms.add_idea_to', 'Add an idea to') + ' ' + g.title, className: 'flex-1 min-w-0 bg-slate-900 border border-slate-500 rounded-lg px-2.5 py-1.5 text-sm text-slate-100' }),
                  h('button', { type: 'submit', className: BTN_GHOST, 'aria-label': t('stem.freeforms.add_idea_to', 'Add an idea to') + ' ' + g.title }, '+')
                )
              );
            }),
            h('button', { className: BTN_GHOST + ' w-full', onClick: addGroup }, '+ ' + t('stem.freeforms.add_group', 'Add a group')),
            // selected-idea detail: note + sculpt
            selected ? h('div', { className: 'bg-violet-950/65 border border-violet-500 rounded-xl p-3 space-y-2' },
              h('div', { className: 'flex items-center justify-between gap-2' },
                h('div', { className: 'text-xs font-black text-violet-100 truncate' }, '✦ ' + selected.item.text),
                h('span', { className: 'ff-pill text-[0.625rem] font-bold px-2 py-0.5 rounded-full bg-violet-900 text-violet-100 border border-violet-500/60 shrink-0' }, selected.group.title)
              ),
              h('label', { className: 'block text-xs font-bold text-slate-200', htmlFor: 'ff-note' }, t('stem.freeforms.note_label', 'Note to self (shows in 3D)')),
              h('textarea', {
                id: 'ff-note', key: 'note-' + selected.item.id + '-' + rev, defaultValue: selected.item.note || '', rows: 2,
                placeholder: t('stem.freeforms.note_placeholder', 'Why does this idea live here?'),
                className: 'w-full bg-slate-900 border border-slate-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-100',
                onBlur: function(e) { if (e.target.value !== (selected.item.note || '')) editItem(selected.group.id, selected.item.id, { note: e.target.value }); }
              }),
              // ── Shape studio — sculpt by hand (no AI needed), from a preset,
              // or by description. All three paths emit the same Prim3D recipe.
              (function() {
                var P3D = window.AlloModules && window.AlloModules.Prim3D;
                if (!prim3dReady || !P3D) {
                  return h('div', { className: 'text-xs text-slate-300', role: 'status' }, t('stem.freeforms.studio_loading', 'Loading the shape studio…'));
                }
                var recipe = currentRecipe();
                var norm = recipe ? P3D.normalizeRecipe(recipe) : null;
                var parts = (norm && norm.parts) || [];
                var pi = Math.min(selPart, Math.max(0, parts.length - 1));
                var SHAPE_ICONS = { box: '📦', sphere: '⚪', cylinder: '🛢', cone: '🔺', torus: '🍩' };
                var mini = 'min-h-[40px] min-w-[40px] rounded-lg border border-slate-500 bg-slate-900 text-slate-100 text-xs font-bold hover:bg-slate-700 cursor-pointer';
                var nudge = function(field, axis, delta, label) {
                  return h('button', { key: field + axis + delta, className: mini, 'aria-label': label, title: label,
                    onClick: function() { doPartOp(function(P, r) { return P.nudgePart(r, pi, field, axis, delta); }); } }, label.split(' ')[0]);
                };
                return h('div', { className: 'pt-2 border-t border-violet-700/60 space-y-1.5' },
                  h('div', { className: 'flex items-center justify-between text-xs font-bold text-slate-200' },
                    h('span', null, '🗿 ' + t('stem.freeforms.studio_label', 'Shape studio')),
                    parts.length ? h('span', { className: 'text-[0.6875rem] text-amber-200 font-bold' }, parts.length + ' ' + t('stem.freeforms.parts_count', 'parts')) : null
                  ),
                  // preset shelf — zero-AI quick starts (same recipes the AI emits)
                  !parts.length ? h('div', { className: 'flex flex-wrap gap-1', role: 'group', 'aria-label': t('stem.freeforms.studio_presets', 'Preset shapes') },
                    (P3D.PRESETS || []).slice(0, 8).map(function(ps) {
                      return h('button', { key: ps.id, className: mini, title: ps.label, 'aria-label': t('stem.freeforms.studio_place_preset', 'Place preset') + ' ' + ps.label,
                        onClick: function() { var r = P3D.getPreset(ps.id); if (r) { setSelPart(0); applyRecipe(selected.item.id, r, t('stem.freeforms.sr_sculpted', 'Sculpture placed')); } } }, ps.emoji);
                    })) : null,
                  // add-a-part row — the hand-building entry point
                  h('div', { className: 'flex flex-wrap gap-1 items-center', role: 'group', 'aria-label': t('stem.freeforms.studio_add_part', 'Add a part') },
                    h('span', { className: 'text-xs text-slate-300 font-bold px-1' }, '+'),
                    (P3D.SHAPES || []).map(function(shp) {
                      return h('button', { key: shp, className: mini, title: t('stem.freeforms.studio_add', 'Add') + ' ' + shp, 'aria-label': t('stem.freeforms.studio_add', 'Add') + ' ' + shp,
                        onClick: function() { doPartOp(function(P, r) { var n2 = P.addPart(r, shp); return n2; }); setSelPart(parts.length); } }, SHAPE_ICONS[shp] || shp);
                    })),
                  // part list + per-part controls (only when something exists)
                  parts.length ? h('div', { className: 'space-y-1.5' },
                    h('div', { className: 'flex flex-wrap gap-1', role: 'group', 'aria-label': t('stem.freeforms.studio_parts', 'Parts') },
                      parts.map(function(p, i) {
                        return h('button', { key: i, className: mini + (i === pi ? ' ring-2 ring-violet-400' : ''), 'aria-pressed': i === pi ? 'true' : 'false',
                          'aria-label': t('stem.freeforms.studio_part', 'Part') + ' ' + (i + 1) + ': ' + p.shape,
                          style: { borderBottom: '3px solid ' + p.color },
                          onClick: function() { setSelPart(i); } }, SHAPE_ICONS[p.shape] || p.shape);
                      })),
                    h('div', { className: 'grid grid-cols-6 gap-1', role: 'group', 'aria-label': t('stem.freeforms.studio_move', 'Move the selected part') },
                      nudge('position', 0, -0.08, '◀ ' + t('stem.freeforms.studio_left', 'Left')),
                      nudge('position', 0, 0.08, '▶ ' + t('stem.freeforms.studio_right', 'Right')),
                      nudge('position', 1, 0.08, '⬆ ' + t('stem.freeforms.studio_up', 'Up')),
                      nudge('position', 1, -0.08, '⬇ ' + t('stem.freeforms.studio_down', 'Down')),
                      nudge('position', 2, 0.08, '↗ ' + t('stem.freeforms.studio_closer', 'Closer')),
                      nudge('position', 2, -0.08, '↙ ' + t('stem.freeforms.studio_farther', 'Farther'))
                    ),
                    h('div', { className: 'grid grid-cols-6 gap-1', role: 'group', 'aria-label': t('stem.freeforms.studio_shape_tools', 'Shape tools') },
                      h('button', { className: mini, title: t('stem.freeforms.studio_bigger', 'Bigger'), 'aria-label': t('stem.freeforms.studio_bigger', 'Bigger'), onClick: function() { doPartOp(function(P, r) { return P.scalePart(r, pi, 1.25); }); } }, '➕'),
                      h('button', { className: mini, title: t('stem.freeforms.studio_smaller', 'Smaller'), 'aria-label': t('stem.freeforms.studio_smaller', 'Smaller'), onClick: function() { doPartOp(function(P, r) { return P.scalePart(r, pi, 0.8); }); } }, '➖'),
                      h('button', { className: mini, title: t('stem.freeforms.studio_spin', 'Spin'), 'aria-label': t('stem.freeforms.studio_spin', 'Spin'), onClick: function() { doPartOp(function(P, r) { return P.nudgePart(r, pi, 'rotation', 1, 30); }); } }, '🔄'),
                      h('button', { className: mini, title: t('stem.freeforms.studio_recolor', 'Change color'), 'aria-label': t('stem.freeforms.studio_recolor', 'Change color'), onClick: function() { doPartOp(function(P, r) { return P.recolorPart(r, pi); }); } }, '🎨'),
                      h('button', { className: mini, title: t('stem.freeforms.studio_duplicate', 'Duplicate'), 'aria-label': t('stem.freeforms.studio_duplicate', 'Duplicate'), onClick: function() { doPartOp(function(P, r) { return P.duplicatePart(r, pi); }); } }, '⧉'),
                      h('button', { className: mini, title: t('stem.freeforms.studio_remove_part', 'Remove part'), 'aria-label': t('stem.freeforms.studio_remove_part', 'Remove part'), onClick: function() { doPartOp(function(P, r) { return P.removePart(r, pi); }); setSelPart(Math.max(0, pi - 1)); } }, '✕')
                    )
                  ) : null,
                  // AI describe row — optional, same recipe format
                  hasAI ? h('div', { className: 'flex gap-1.5 pt-1' },
                    h('input', { id: 'ff-sculpt', value: sculptText, onChange: function(e) { setSculptText(e.target.value); }, placeholder: t('stem.freeforms.sculpt_label', 'Or describe it…') + ' ' + selected.item.text, 'aria-label': t('stem.freeforms.sculpt_label', 'Or describe it…'), className: 'flex-1 min-w-0 bg-slate-900 border border-slate-500 rounded-lg px-2 py-1.5 text-xs text-slate-100' }),
                    h('button', { className: BTN_HOT, onClick: doSculpt, disabled: sculptBusy, 'aria-busy': sculptBusy ? 'true' : 'false' }, sculptBusy ? '…' : '✨ ' + t('stem.freeforms.sculpt', 'Sculpt'))
                  ) : null,
                  parts.length ? h('button', { className: BTN_GHOST + ' w-full', onClick: doClearArt }, t('stem.freeforms.clear_art', 'Remove sculpture')) : null
                );
              })()
            ) : null
          ),
          // ── 3D stage (cg3d owns its own a11y spine + WebGL fallback) ──
          h('div', { className: 'ff-stage ff-stage-bg flex-1 min-w-0 relative border border-slate-600 rounded-2xl overflow-hidden', style: { minHeight: '540px', maxHeight: '72vh' } },
            (!modulesReady && !modulesFailed) ? h('div', { className: 'absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-slate-200 text-sm text-center', role: 'status' },
              h('div', { className: 'ff-card-svg p-3' }, renderScaffoldBlueprint(sc.type, 'md')),
              h('div', { className: 'font-bold text-slate-100' }, '\u{1F9ED} ' + t('stem.freeforms.loading_3d', 'Loading the 3D space…'))
            ) : null,
            modulesFailed ? h('div', { className: 'absolute inset-0 flex flex-col items-center justify-center gap-3 text-center p-6 text-slate-200 text-sm', role: 'status' },
              h('div', { className: 'max-w-xs w-full' }, renderLiveTopologySvg(doc)),
              h('div', { className: 'max-w-md' }, '⚠️ ' + t('stem.freeforms.no_3d', 'The 3D space could not load here — your builder panel still works, and everything you write is saved.'))
            ) : null,
            h('div', { ref: hostRef, className: 'absolute inset-0' })
          )
        ),
        // hint line
        h('div', { className: 'mt-2.5 px-3 py-2 rounded-xl bg-slate-900/75 border border-slate-700/80 text-xs text-slate-300 flex flex-wrap items-center gap-x-4 gap-y-1' },
          h('span', null, '🖱️ ' + t('stem.freeforms.stage_hint', 'In the space: drag an idea to place it · drag the background to orbit · scroll to zoom · [ and ] move a selected idea between groups.'))
        ),
        // assessment cards (hidden during recall so the coach can't spoil answers)
        (!inChallenge && doc.assessment) ? h('div', { className: 'mt-3 grid md:grid-cols-3 gap-3', 'aria-label': t('stem.freeforms.coach_heading', 'Coaching feedback') },
          [['strengths', '\u{1F4AA}', t('stem.freeforms.strengths', 'What is working'), '#34d399'],
           ['questions', '\u{1F914}', t('stem.freeforms.questions', 'Questions to consider'), '#fbbf24'],
           ['suggestions', '\u{1F331}', t('stem.freeforms.suggestions', 'Next build steps'), '#a78bfa']].map(function(cfg) {
            var list = doc.assessment[cfg[0]] || [];
            if (!list.length) return null;
            return h('div', { key: cfg[0], className: 'ff-surface rounded-2xl p-3.5', style: { borderTop: '3px solid ' + cfg[3] } },
              h('div', { className: 'text-xs font-black text-white mb-2' }, cfg[1] + ' ' + cfg[2]),
              h('ul', { className: 'space-y-1.5 pl-4 list-disc' }, list.map(function(s, i) { return h('li', { key: i, className: 'text-xs text-slate-200 leading-relaxed' }, s); }))
            );
          })
        ) : null
      );

      })();
    }
  });
})();
