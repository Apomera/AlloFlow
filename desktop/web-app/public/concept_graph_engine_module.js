/**
 * AlloFlow ConceptGraph Engine — shared spatial-graph format + logic (acg/v1)
 *
 * STEP 0 of the reusable-engine extraction (design: docs/concept_graph_engine_design.md).
 * This is the dependency-light DATA + LAYOUT + A11Y-SPINE core that both existing
 * node/edge surfaces can share:
 *   • the "Visual Organizer" AI concept map (concept_map_handlers + view_renderers), and
 *   • Throughline / the unit builder (mind_map_module.js).
 *
 * WHAT THIS MODULE OWNS (renderer-agnostic on purpose):
 *   - the shared format `ConceptGraph` (acg/v1) — a SUPERSET of both existing schemas
 *   - normalizeGraph()  — accept acg | throughline unit | concept-map {nodes,edges} | a
 *                         Gemini-generated {main,branches} graph; idempotent
 *   - from/to adapters  — LOSSLESS round-trip with each existing surface
 *   - adaptGenerated()  — Stage-1 Gemini semantic graph → acg
 *   - deriveOutline()   — the cycle-safe Kahn topo-sort that is the linear a11y reading
 *                         spine (copied verbatim from mind_map_module, generalized to acg)
 *   - deriveLanes()     — distinct categories → ordered lanes / z-planes
 *   - project()         — SEMANTIC axisValues → x/y/z coordinates (the pattern that makes
 *                         3D spatial relationships carry real meaning; the model never
 *                         emits pixels, it ranks nodes on named axes and JS projects them)
 *
 * WHAT IT DOES NOT OWN YET (later steps): the renderers. render({mode:'2d'|'iso'|'3d'})
 * — including the orbitable WebGL 3D view — is the next layer and is intentionally absent
 * here so the format/spine can land + be golden-tested without any render/CDN risk.
 *
 * RUNTIME: plain JS, only window.React-class environments; NO bundler, NO hard imports.
 * Functions that need host capabilities (callGemini, t, addToast) take them as injected
 * params — this module imports nothing.
 */
(function () {
  'use strict';
  if (window.AlloModules && window.AlloModules.ConceptGraphEngine) {
    console.log('[ConceptGraphEngine] Already loaded, skipping');
    return;
  }

  var VERSION = 'acg/v1';
  var EDGE_TYPES = {
    sequence: 1, prerequisite: 1, cause: 1, contrast: 1, elaborates: 1, associates: 1,
    alignedTo: 1, evidencedBy: 1, assessedBy: 1, contains: 1, relatedTo: 1, generatedFor: 1
  };

  function isNum(v) { return typeof v === 'number' && !isNaN(v); }
  function num(v, d) { return isNum(v) ? v : d; }

  function emptyGraph() {
    return { version: VERSION, title: '', axes: null, nodes: [], edges: [], layers: [], meta: {} };
  }

  // ── deriveOutline — cycle-safe Kahn topo sort, x-then-y tiebreak ─────
  // Verbatim port of mind_map_module.js deriveOutline(), generalized from
  // {nodeId, x, y}/{from,to} to acg {id, x, y}/{fromId, toId}. This is the
  // load-bearing accessibility artifact (the print/copy/screen-reader order),
  // so it MUST stay behaviourally identical to Throughline's.
  function deriveOutline(graph) {
    var nodes = (graph && Array.isArray(graph.nodes)) ? graph.nodes.slice() : [];
    var edges = (graph && Array.isArray(graph.edges)) ? graph.edges : [];
    var byX = nodes.slice().sort(function (a, b) { return (num(a.x, 0) - num(b.x, 0)) || (num(a.y, 0) - num(b.y, 0)); });
    var indeg = {}, adj = {};
    nodes.forEach(function (n) { indeg[n.id] = 0; adj[n.id] = []; });
    edges.forEach(function (e) { if (adj[e.fromId] && indeg[e.toId] != null) { adj[e.fromId].push(e.toId); indeg[e.toId]++; } });
    var ready = byX.filter(function (n) { return indeg[n.id] === 0; }).map(function (n) { return n.id; });
    var order = [];
    var localIndeg = {}; nodes.forEach(function (n) { localIndeg[n.id] = indeg[n.id]; });
    var posOf = {}; byX.forEach(function (n, i) { posOf[n.id] = i; });
    while (ready.length) {
      ready.sort(function (a, b) { return posOf[a] - posOf[b]; });
      var id = ready.shift();
      order.push(id);
      (adj[id] || []).forEach(function (to) { localIndeg[to]--; if (localIndeg[to] === 0) ready.push(to); });
    }
    if (order.length !== nodes.length) {
      return { order: byX.map(function (n) { return n.id; }), hasCycle: true };
    }
    return { order: order, hasCycle: false };
  }

  // ── deriveLanes — distinct categories → ordered lanes (= z-planes) ───
  // First-appearance order; uncategorized nodes fall into a trailing null lane.
  // The index is the band position AND the depth plane a 3D view stacks on.
  function deriveLanes(graph) {
    var nodes = (graph && Array.isArray(graph.nodes)) ? graph.nodes : [];
    var order = [], seen = {}, hasUngrouped = false;
    nodes.forEach(function (n) {
      var c = (n && typeof n.category === 'string' && n.category) ? n.category : null;
      if (c === null) { hasUngrouped = true; return; }
      if (!seen[c]) { seen[c] = true; order.push(c); }
    });
    var lanes = order.map(function (c, i) { return { key: c, label: c, index: i }; });
    // labelKey rides ALONGSIDE label, never instead of it. This engine stays translator-free
    // by design: axis/lane labels double as model-prompt vocabulary (see DEFAULT_AXES), so
    // `label` is the canonical English and views translate via t(labelKey) || label.
    if (hasUngrouped || lanes.length === 0) lanes.push({ key: null, label: 'Ungrouped', labelKey: 'concept_graph.ungrouped', index: lanes.length });
    return lanes;
  }

  // ── project — SEMANTIC axisValues → x/y/z coordinates ───────────────
  // The model ranks each node on NAMED axes (ordinal 0..1, or a categorical z
  // bucket); JS turns those into pixels. This is what makes the geometry mean
  // something (and keeps it reproducible/testable). Nodes without axisValues
  // keep whatever x/y they already have (manual drag / legacy layout).
  function project(graph, opts) {
    opts = opts || {};
    var width = num(opts.width, 2000), height = num(opts.height, 1200), planeGap = num(opts.planeGap, 300);
    var catDepth = opts.categoryDepth !== false;   // category-lane → depth plane, even without axisValues
    var zPlane = {};
    if (graph.axes && graph.axes.z && Array.isArray(graph.axes.z.categories)) {
      graph.axes.z.categories.forEach(function (c, i) { zPlane[c] = i; });
    } else {
      deriveLanes(graph).forEach(function (l) { if (l.key != null) zPlane[l.key] = l.index; });
    }
    var nodes = graph.nodes.map(function (n) {
      var av = (n.axisValues && typeof n.axisValues === 'object') ? n.axisValues : null;
      var cat = (typeof n.category === 'string' && n.category) ? n.category : null;
      var hasX = !!(av && isNum(av.x)), hasY = !!(av && isNum(av.y));
      var hasZ = !!(av && (typeof av.z === 'string' || isNum(av.z)));
      var hasCatDepth = catDepth && cat != null;
      if (!hasX && !hasY && !hasZ && !hasCatDepth) return n;     // nothing to project — leave manual/legacy coords
      var nx = hasX ? av.x * width : num(n.x, 0);
      var ny = hasY ? av.y * height : num(n.y, 0);
      var nz = num(n.z, 0);
      if (hasZ) nz = (typeof av.z === 'string') ? (zPlane[av.z] || 0) * planeGap : av.z * planeGap;
      else if (hasCatDepth) nz = (zPlane[cat] || 0) * planeGap;  // swim-lane index becomes the depth plane
      return Object.assign({}, n, { x: nx, y: ny, z: nz });
    });
    return Object.assign({}, graph, { nodes: nodes });
  }

  // ── Arrangement: persistable spatial meaning + constrained editing ──
  // An "arrangement" is the spatial meaning a user or the AI has layered onto a
  // graph: { axes, axisValues: {nodeId:{x,y,z}}, categories: {nodeId: strand} }.
  // Hosts store it (e.g. generatedContent.data.conceptSpace) and re-apply it with
  // applyArrangement() before rendering, so 3D placement survives save/reload.
  function extractArrangement(graph) {
    graph = normalizeGraph(graph);
    var axisValues = {}, categories = {};
    (graph.nodes || []).forEach(function (n) {
      if (n.axisValues && typeof n.axisValues === 'object' && Object.keys(n.axisValues).length) axisValues[n.id] = Object.assign({}, n.axisValues);
      if (typeof n.category === 'string' && n.category) categories[n.id] = n.category;
    });
    return { axes: graph.axes || null, axisValues: axisValues, categories: categories };
  }

  function applyArrangement(graph, arrangement) {
    graph = normalizeGraph(graph);
    if (!arrangement || typeof arrangement !== 'object') return graph;
    var av = arrangement.axisValues || {}, cats = arrangement.categories || {};
    var nodes = graph.nodes.map(function (n) {
      var patch = null;
      if (typeof cats[n.id] === 'string' && cats[n.id] && cats[n.id] !== n.category) { patch = patch || {}; patch.category = cats[n.id]; }
      if (av[n.id] && typeof av[n.id] === 'object') { patch = patch || {}; patch.axisValues = Object.assign({}, n.axisValues || {}, av[n.id]); }
      return patch ? Object.assign({}, n, patch) : n;
    });
    var g = Object.assign({}, graph, { nodes: nodes, axes: arrangement.axes || graph.axes });
    g.layers = deriveLanes(g);
    return g;
  }

  // Deterministic default axisValues for graphs with no geometry at all (e.g.
  // adaptGenerated output, where every node sits at 0,0,0): x = reading order,
  // y = tree depth (main → branch → item), z = category (strand). Nodes that
  // already carry axisValues or real coordinates are left untouched, so this is
  // safe to call on any graph before a 3D render.
  function ensureDefaultAxisValues(graph) {
    graph = normalizeGraph(graph);
    var outline = deriveOutline(graph);
    var span = Math.max(1, outline.order.length - 1);
    var pos = {}; outline.order.forEach(function (id, i) { pos[id] = i; });
    var Y_BY_TYPE = { main: 0.12, branch: 0.45, item: 0.78 };
    var changed = false;
    var nodes = graph.nodes.map(function (n) {
      var hasAv = n.axisValues && (isNum(n.axisValues.x) || isNum(n.axisValues.y));
      var hasCoords = (isNum(n.x) && n.x !== 0) || (isNum(n.y) && n.y !== 0);
      if (hasAv || hasCoords) return n;
      changed = true;
      var av = Object.assign({}, n.axisValues || {});
      av.x = (pos[n.id] != null ? pos[n.id] : 0) / span;
      av.y = Y_BY_TYPE[n.type] != null ? Y_BY_TYPE[n.type] : 0.5;
      if (av.z == null && typeof n.category === 'string' && n.category) av.z = n.category;
      return Object.assign({}, n, { axisValues: av });
    });
    return changed ? Object.assign({}, graph, { nodes: nodes }) : graph;
  }

  // ── Structure-shaped 3D layouts — the organizer's OWN spatial grammar ──
  // Generic strand-planes treat every organizer identically; these builders give
  // each structureType its native 3D shape instead (a Venn's two clusters with
  // the shared traits floating in the lens between them, a Story Map's tension
  // arc, a Fishbone's ribs…). Each builder is PURE: it receives {graph, main,
  // branches:[{node, items}]} (dispatcher branch ORDER carries the role — titles
  // are localized, indices are not) and returns
  //   { pos: {nodeId:{x,y,z}},        — normalized 0..1 axisValues (z numeric =
  //                                     free depth via project()'s planeGap)
  //     axes,                          — human meaning of the axes
  //     layout: {mode, zones, planeGap}, — renderer hints; zones = translucent
  //                                     bubbles/walls INSTEAD of depth planes
  //     extraEdges }                   — semantic edges the tree form lacks
  // or null to fall back to the generic planes layout.
  var GOLDEN_ANGLE = 2.399963229728653;
  // Deterministic ball scatter: i-th of n points around (cx,cy,cz), golden-angle
  // spherical distribution (NO Math.random — layouts must be reproducible).
  function _scatter(cx, cy, cz, i, n, sx, sy, sz) {
    var N = Math.max(1, n), k = i + 0.5;
    if (n <= 1) return { x: cx, y: cy, z: cz };
    var phi = Math.acos(Math.max(-1, Math.min(1, 1 - 2 * k / N)));
    var th = GOLDEN_ANGLE * i;
    var r = 0.55 + 0.45 * (k / N);   // fill the ball, not just its shell
    return { x: cx + Math.sin(phi) * Math.cos(th) * sx * r, y: cy + Math.sin(phi) * Math.sin(th) * sy * r, z: cz + Math.cos(phi) * sz * r };
  }

  // Venn Diagram — dispatcher contract: branches = [Set A, Set B, Shared?].
  // Two side-by-side clusters; shared items float in the gap between them; the
  // renderer draws each set as a translucent sphere that ENCLOSES its own items
  // PLUS the shared ones, so the two bubbles intersect in a lens around the
  // shared cluster — a literal 3D Venn.
  function _layoutVenn(ctx) {
    var B = ctx.branches;
    if (B.length < 2 || B.length > 3) return null;
    var A = B[0], Bb = B[1], SH = B[2] || null;
    var pos = {};
    if (ctx.main) pos[ctx.main.id] = { x: 0.5, y: 0.04, z: 0.5 };
    pos[A.node.id] = { x: 0.13, y: 0.24, z: 0.5 };
    pos[Bb.node.id] = { x: 0.87, y: 0.24, z: 0.5 };
    A.items.forEach(function (n, i) { pos[n.id] = _scatter(0.18, 0.6, 0.5, i, A.items.length, 0.11, 0.17, 0.3); });
    Bb.items.forEach(function (n, i) { pos[n.id] = _scatter(0.82, 0.6, 0.5, i, Bb.items.length, 0.11, 0.17, 0.3); });
    if (SH) {
      pos[SH.node.id] = { x: 0.5, y: 0.28, z: 0.5 };
      SH.items.forEach(function (n, i) { pos[n.id] = _scatter(0.5, 0.6, 0.5, i, SH.items.length, 0.05, 0.15, 0.17); });
    }
    var inc = SH ? [SH.node.category] : [];
    return {
      pos: pos,
      axes: { x: { label: (A.node.label || 'Set A') + ' ↔ ' + (Bb.node.label || 'Set B'), kind: 'ordinal' }, y: { label: '', kind: 'ordinal' }, z: { label: '', kind: 'ordinal' } },
      layout: { mode: 'venn', planeGap: 1100, zones: [
        { key: A.node.category, shape: 'sphere', includeKeys: inc },
        { key: Bb.node.category, shape: 'sphere', includeKeys: inc }
      ] }
    };
  }

  // T-Chart — two facing walls of items across a gap (rows = y, columns = depth).
  function _layoutTChart(ctx) {
    var B = ctx.branches;
    if (B.length !== 2) return null;
    var pos = {};
    if (ctx.main) pos[ctx.main.id] = { x: 0.5, y: 0.08, z: 0.5 };
    B.forEach(function (b, side) {
      var wx = side === 0 ? 0.2 : 0.8;
      pos[b.node.id] = { x: wx, y: 0.22, z: 0.5 };
      var n = b.items.length, cols = Math.max(1, Math.ceil(Math.sqrt(n))), rows = Math.max(1, Math.ceil(n / cols));
      b.items.forEach(function (it, i) {
        var row = Math.floor(i / cols), col = i % cols;
        pos[it.id] = {
          x: wx,
          y: rows <= 1 ? 0.62 : 0.4 + 0.48 * (row / (rows - 1)),
          z: cols <= 1 ? 0.5 : 0.18 + 0.64 * (col / (cols - 1))
        };
      });
    });
    return {
      pos: pos,
      axes: { x: { label: (B[0].node.label || '') + ' ↔ ' + (B[1].node.label || ''), kind: 'ordinal' }, y: { label: '', kind: 'ordinal' }, z: { label: '', kind: 'ordinal' } },
      layout: { mode: 'tchart', planeGap: 1100, zones: [
        { key: B[0].node.category, shape: 'wall' },
        { key: B[1].node.category, shape: 'wall' }
      ] }
    };
  }

  // Fishbone — the effect at the head (right), cause categories as ribs angling
  // off the spine, alternating above/below AND front/back for real depth.
  function _layoutFishbone(ctx) {
    var B = ctx.branches;
    if (B.length < 2) return null;
    var pos = {};
    if (ctx.main) pos[ctx.main.id] = { x: 0.94, y: 0.5, z: 0.5 };
    var pairs = Math.max(1, Math.ceil(B.length / 2) - 1);
    B.forEach(function (b, k) {
      var p = Math.floor(k / 2), up = (k % 2 === 0);
      var ax = 0.14 + (B.length <= 2 ? 0.3 : 0.56 * (p / pairs));
      var head = { x: ax - 0.06, y: up ? 0.16 : 0.84, z: up ? 0.3 : 0.7 };
      var attach = { x: ax + 0.1, y: 0.5, z: 0.5 };
      pos[b.node.id] = head;
      var n = b.items.length;
      b.items.forEach(function (it, i) {
        var tt = (i + 1) / (n + 1);
        pos[it.id] = {
          x: head.x + (attach.x - head.x) * tt,
          y: head.y + (attach.y - head.y) * tt,
          z: head.z + (attach.z - head.z) * tt + (i % 2 ? 0.04 : -0.04)
        };
      });
    });
    return {
      pos: pos,
      axes: { x: { label: 'causes → effect', labelKey: 'concept_graph.axis_cause_effect', kind: 'ordinal' }, y: { label: '', kind: 'ordinal' }, z: { label: '', kind: 'ordinal' } },
      layout: { mode: 'fishbone', planeGap: 1100, zones: [] }
    };
  }

  // Cause and Effect — dispatcher contract: branches = [Causes, Effects, Chain?].
  // Causes cluster flows INTO the central event, which flows OUT to the effects;
  // an optional chain snakes along beneath.
  function _layoutCauseEffect(ctx) {
    var B = ctx.branches;
    if (B.length < 2 || B.length > 3 || !ctx.main) return null;
    var C = B[0], Ef = B[1], CH = B[2] || null;
    var pos = {}, extraEdges = [];
    pos[ctx.main.id] = { x: 0.5, y: 0.42, z: 0.5 };
    pos[C.node.id] = { x: 0.13, y: 0.16, z: 0.5 };
    pos[Ef.node.id] = { x: 0.87, y: 0.16, z: 0.5 };
    C.items.forEach(function (n, i) {
      pos[n.id] = _scatter(0.16, 0.5, 0.5, i, C.items.length, 0.1, 0.2, 0.3);
      extraEdges.push({ fromId: n.id, toId: ctx.main.id, type: 'cause' });
    });
    Ef.items.forEach(function (n, i) {
      pos[n.id] = _scatter(0.84, 0.5, 0.5, i, Ef.items.length, 0.1, 0.2, 0.3);
      extraEdges.push({ fromId: ctx.main.id, toId: n.id, type: 'cause' });
    });
    if (CH) {
      pos[CH.node.id] = { x: 0.5, y: 0.93, z: 0.5 };
      var m = CH.items.length;
      CH.items.forEach(function (n, i) {
        pos[n.id] = { x: m <= 1 ? 0.5 : 0.26 + 0.48 * (i / (m - 1)), y: 0.8, z: 0.5 + 0.16 * Math.sin(i * 1.7) };
        if (i) extraEdges.push({ fromId: CH.items[i - 1].id, toId: n.id, type: 'sequence' });
      });
    }
    return {
      pos: pos,
      axes: { x: { label: (C.node.label || 'Causes') + ' → ' + (Ef.node.label || 'Effects'), kind: 'ordinal' }, y: { label: '', kind: 'ordinal' }, z: { label: '', kind: 'ordinal' } },
      layout: { mode: 'causeeffect', planeGap: 1100, zones: [
        { key: C.node.category, shape: 'sphere' },
        { key: Ef.node.category, shape: 'sphere' }
      ] },
      extraEdges: extraEdges
    };
  }

  // Frayer Model — the term at the very center, its four quadrants as corner
  // clusters (Definition / Characteristics / Examples / Non-Examples).
  function _layoutQuadrants(ctx) {
    var B = ctx.branches;
    if (B.length !== 4) return null;
    var pos = {};
    if (ctx.main) pos[ctx.main.id] = { x: 0.5, y: 0.5, z: 0.5 };
    var corners = [
      { x: 0.17, y: 0.2, z: 0.36 }, { x: 0.83, y: 0.2, z: 0.64 },
      { x: 0.17, y: 0.8, z: 0.64 }, { x: 0.83, y: 0.8, z: 0.36 }
    ];
    var zones = [];
    B.forEach(function (b, k) {
      var c = corners[k];
      pos[b.node.id] = { x: c.x, y: c.y - 0.08, z: c.z };
      b.items.forEach(function (it, i) { pos[it.id] = _scatter(c.x, c.y + 0.08, c.z, i, b.items.length, 0.09, 0.12, 0.22); });
      zones.push({ key: b.node.category, shape: 'sphere' });
    });
    return {
      pos: pos,
      axes: { x: { label: '', kind: 'ordinal' }, y: { label: '', kind: 'ordinal' }, z: { label: '', kind: 'ordinal' } },
      layout: { mode: 'quadrants', planeGap: 1100, zones: zones }
    };
  }

  // KWL / See-Think-Wonder — a three-station journey that bends through depth,
  // linked by sequence arrows (the thinking routine's direction of travel).
  function _layoutJourney(ctx) {
    var B = ctx.branches;
    if (B.length !== 3) return null;
    var pos = {}, extraEdges = [], zones = [];
    if (ctx.main) pos[ctx.main.id] = { x: 0.5, y: 0.05, z: 0.35 };
    var st = [{ x: 0.12, z: 0.3 }, { x: 0.5, z: 0.68 }, { x: 0.88, z: 0.3 }];
    B.forEach(function (b, k) {
      pos[b.node.id] = { x: st[k].x, y: 0.26, z: st[k].z };
      b.items.forEach(function (it, i) { pos[it.id] = _scatter(st[k].x, 0.62, st[k].z, i, b.items.length, 0.08, 0.17, 0.16); });
      zones.push({ key: b.node.category, shape: 'sphere' });
      if (k) extraEdges.push({ fromId: B[k - 1].node.id, toId: b.node.id, type: 'sequence' });
    });
    return {
      pos: pos,
      axes: { x: { label: B.map(function (b) { return b.node.label; }).join(' → '), kind: 'ordinal' }, y: { label: '', kind: 'ordinal' }, z: { label: '', kind: 'ordinal' } },
      layout: { mode: 'journey', planeGap: 1100, zones: zones },
      extraEdges: extraEdges
    };
  }

  // Claim-Evidence-Reasoning — an argument you can walk under: evidence pillars
  // at the base, the reasoning layer bridging upward, the claim held on top.
  function _layoutPillars(ctx) {
    var B = ctx.branches;
    if (B.length !== 3) return null;
    var CL = B[0], EV = B[1], RE = B[2];
    var pos = {}, extraEdges = [];
    if (ctx.main) pos[ctx.main.id] = { x: 0.5, y: 0.02, z: 0.5 };
    pos[CL.node.id] = { x: 0.5, y: 0.16, z: 0.5 };
    CL.items.forEach(function (it, i) { pos[it.id] = { x: 0.5 + (i - (CL.items.length - 1) / 2) * 0.14, y: 0.3, z: 0.5 }; });
    pos[RE.node.id] = { x: 0.07, y: 0.54, z: 0.5 };
    RE.items.forEach(function (it, i) {
      var n = RE.items.length;
      pos[it.id] = { x: n <= 1 ? 0.5 : 0.25 + 0.5 * (i / (n - 1)), y: 0.54, z: 0.5 + (i % 2 ? 0.12 : -0.12) };
    });
    pos[EV.node.id] = { x: 0.07, y: 0.86, z: 0.5 };
    EV.items.forEach(function (it, i) {
      var n = EV.items.length;
      pos[it.id] = { x: n <= 1 ? 0.5 : 0.18 + 0.64 * (i / (n - 1)), y: 0.86, z: 0.5 + (i % 2 ? 0.18 : -0.18) };
    });
    extraEdges.push({ fromId: EV.node.id, toId: RE.node.id, type: 'sequence' });
    extraEdges.push({ fromId: RE.node.id, toId: CL.node.id, type: 'sequence' });
    return {
      pos: pos,
      axes: { x: { label: '', kind: 'ordinal' }, y: { label: (EV.node.label || 'Evidence') + ' → ' + (RE.node.label || 'Reasoning') + ' → ' + (CL.node.label || 'Claim'), kind: 'ordinal' }, z: { label: '', kind: 'ordinal' } },
      layout: { mode: 'pillars', planeGap: 1100, zones: [] },
      extraEdges: extraEdges
    };
  }

  // Story Map — the plot mountain in actual 3D: x = story order, HEIGHT = tension
  // (exposition low, climax on the summit, resolution back down), with a gentle
  // drift through depth; stages linked by sequence arrows, items strung as beads
  // along the slope toward the next stage.
  function _layoutArc(ctx) {
    var B = ctx.branches;
    if (B.length !== 5) return null;
    var pos = {}, extraEdges = [];
    if (ctx.main) pos[ctx.main.id] = { x: 0.5, y: 0.03, z: 0.75 };
    var st = [
      { x: 0.07, y: 0.82, z: 0.3 }, { x: 0.28, y: 0.5, z: 0.4 }, { x: 0.5, y: 0.1, z: 0.5 },
      { x: 0.72, y: 0.5, z: 0.6 }, { x: 0.93, y: 0.82, z: 0.7 }
    ];
    B.forEach(function (b, k) {
      pos[b.node.id] = st[k];
      var next = k < 4 ? st[k + 1] : { x: st[4].x + (st[4].x - st[3].x), y: st[4].y + (st[4].y - st[3].y), z: st[4].z + (st[4].z - st[3].z) };
      var n = b.items.length;
      b.items.forEach(function (it, i) {
        var tt = (i + 1) / (n + 1);
        pos[it.id] = { x: st[k].x + (next.x - st[k].x) * tt * 0.72, y: st[k].y + (next.y - st[k].y) * tt * 0.72 + 0.06, z: st[k].z + (next.z - st[k].z) * tt * 0.72 };
      });
      if (k) extraEdges.push({ fromId: B[k - 1].node.id, toId: b.node.id, type: 'sequence' });
    });
    return {
      pos: pos,
      axes: { x: { label: 'story order', labelKey: 'concept_graph.axis_story_order', kind: 'ordinal' }, y: { label: 'tension', labelKey: 'concept_graph.axis_tension', kind: 'ordinal' }, z: { label: '', kind: 'ordinal' } },
      layout: { mode: 'arc', planeGap: 1100, zones: [] },
      extraEdges: extraEdges
    };
  }

  // Flow Chart — steps advance along a corkscrew through depth; consecutive
  // steps get sequence arrows ONLY when the AI supplied no connectsTo edges.
  function _layoutFlow(ctx) {
    var B = ctx.branches;
    if (B.length < 2) return null;
    var pos = {}, extraEdges = [];
    if (ctx.main) pos[ctx.main.id] = { x: 0.02, y: 0.5, z: 0.5 };
    var hasSeq = (ctx.graph.edges || []).some(function (e) { return e.type === 'sequence'; });
    B.forEach(function (b, k) {
      var tt = k / (B.length - 1);
      var ang = tt * Math.PI * 1.6;
      var c = { x: 0.1 + 0.84 * tt, y: 0.42 - 0.26 * Math.sin(ang), z: 0.5 + 0.3 * Math.cos(ang) };
      pos[b.node.id] = c;
      b.items.forEach(function (it, i) { pos[it.id] = _scatter(c.x, c.y + 0.18, c.z, i, b.items.length, 0.05, 0.12, 0.12); });
      if (k && !hasSeq) extraEdges.push({ fromId: B[k - 1].node.id, toId: b.node.id, type: 'sequence' });
    });
    return {
      pos: pos,
      axes: { x: { label: 'first step → last step', labelKey: 'concept_graph.axis_first_last', kind: 'ordinal' }, y: { label: '', kind: 'ordinal' }, z: { label: '', kind: 'ordinal' } },
      layout: { mode: 'flow', planeGap: 1100, zones: [] },
      extraEdges: extraEdges
    };
  }

  // Key Concept Map / Problem Solution — a true 3D hub: branches orbit the
  // center on a tilted ring, each with its own constellation bubble of items
  // pushed radially outward.
  function _layoutOrbital(ctx) {
    var B = ctx.branches;
    if (!B.length) return null;
    var pos = {}, zones = [];
    if (ctx.main) pos[ctx.main.id] = { x: 0.5, y: 0.45, z: 0.5 };
    B.forEach(function (b, k) {
      var a = (k / B.length) * Math.PI * 2;
      var lift = (k % 2 ? 0.16 : -0.16);
      var c = { x: 0.5 + 0.34 * Math.cos(a), y: 0.45 + lift, z: 0.5 + 0.36 * Math.sin(a) };
      pos[b.node.id] = c;
      b.items.forEach(function (it, i) {
        pos[it.id] = _scatter(c.x + (c.x - 0.5) * 0.42, c.y + lift * 0.8, c.z + (c.z - 0.5) * 0.42, i, b.items.length, 0.07, 0.13, 0.1);
      });
      zones.push({ key: b.node.category, shape: 'sphere' });
    });
    return {
      pos: pos,
      axes: { x: { label: '', kind: 'ordinal' }, y: { label: '', kind: 'ordinal' }, z: { label: '', kind: 'ordinal' } },
      layout: { mode: 'orbital', planeGap: 1100, zones: zones }
    };
  }

  // Structured Outline — a cascade: sections step down-and-across like the
  // indentation of the written outline itself (reading order = the staircase),
  // each section carrying its details in a small cluster, linked in sequence.
  function _layoutCascade(ctx) {
    var B = ctx.branches;
    if (B.length < 2) return null;
    var pos = {}, extraEdges = [], zones = [];
    if (ctx.main) pos[ctx.main.id] = { x: 0.06, y: 0.05, z: 0.5 };
    var K = B.length;
    B.forEach(function (b, k) {
      var tt = k / (K - 1);
      var c = { x: 0.14 + 0.74 * tt, y: 0.18 + 0.5 * tt, z: 0.5 + (k % 2 ? 0.14 : -0.14) };
      pos[b.node.id] = c;
      b.items.forEach(function (it, i) { pos[it.id] = _scatter(c.x + 0.03, c.y + 0.17, c.z, i, b.items.length, 0.07, 0.11, 0.13); });
      zones.push({ key: b.node.category, shape: 'sphere' });
      if (k) extraEdges.push({ fromId: B[k - 1].node.id, toId: b.node.id, type: 'sequence' });
    });
    return {
      pos: pos,
      axes: { x: { label: 'reading order', labelKey: 'concept_graph.axis_reading_order', kind: 'ordinal' }, y: { label: '', kind: 'ordinal' }, z: { label: '', kind: 'ordinal' } },
      layout: { mode: 'cascade', planeGap: 1100, zones: zones },
      extraEdges: extraEdges
    };
  }

  // structureType → builder. Types NOT here ('3D Concept Space',
  // unknown/custom) keep the generic strand-plane layout on purpose.
  var STRUCTURE_LAYOUTS = {
    'Structured Outline': _layoutCascade,
    'Venn Diagram': _layoutVenn,
    'T-Chart': _layoutTChart,
    'Fishbone': _layoutFishbone,
    'Cause and Effect': _layoutCauseEffect,
    'Frayer Model': _layoutQuadrants,
    'KWL Chart': _layoutJourney,
    'See-Think-Wonder': _layoutJourney,
    'Claim-Evidence-Reasoning': _layoutPillars,
    'Story Map': _layoutArc,
    'Flow Chart': _layoutFlow,
    'Key Concept Map': _layoutOrbital,
    'Problem Solution': _layoutOrbital
  };

  // Apply the organizer-shaped layout for the graph's structureType (or
  // opts.structureType). Writes numeric axisValues for every node the builder
  // placed, stamps meta.layout (renderer hints) + type-specific axes, and adds
  // any semantic extraEdges (id 'e_layout_*', added once — idempotent). Unknown
  // types and builder fallbacks return the graph UNCHANGED, so callers can
  // always follow with ensureDefaultAxisValues.
  // opts.onlyIds: recompute the full layout but write ONLY those nodes' positions
  // (used after a strand reassignment so the node flies to its new cluster) —
  // axes/meta/extraEdges are left untouched in that mode.
  function applyStructureLayout(graph, opts) {
    opts = opts || {};
    graph = normalizeGraph(graph);
    var type = opts.structureType
      || (graph.meta && graph.meta.generated && graph.meta.generated.structureType)
      || (graph.meta && graph.meta.conceptMap && graph.meta.conceptMap.structureType)
      || (graph.meta && graph.meta.layout && graph.meta.layout.structureType)
      || null;
    var builder = type ? STRUCTURE_LAYOUTS[type] : null;
    if (!builder) return graph;
    var main = null, branches = [], byCat = {};
    graph.nodes.forEach(function (n) {
      if (n.type === 'main' && !main) main = n;
      else if (n.type === 'branch') {
        var b = { node: n, items: [] };
        branches.push(b);
        var key = (typeof n.category === 'string' && n.category) ? n.category : n.label;
        if (key && !byCat[key]) byCat[key] = b;
      }
    });
    graph.nodes.forEach(function (n) {
      if (n.type === 'item' && byCat[n.category]) byCat[n.category].items.push(n);
    });
    var res = builder({ graph: graph, main: main, branches: branches });
    if (!res || !res.pos) return graph;
    var only = null;
    if (Array.isArray(opts.onlyIds)) { only = {}; opts.onlyIds.forEach(function (id) { only[id] = 1; }); }
    var changed = false;
    var nodes = graph.nodes.map(function (n) {
      var p = res.pos[n.id];
      if (!p || (only && !only[n.id])) return n;
      changed = true;
      return Object.assign({}, n, { axisValues: Object.assign({}, n.axisValues || {}, { x: clamp01(p.x), y: clamp01(p.y), z: clamp01(p.z) }) });
    });
    if (only && !changed) return graph;
    var g = Object.assign({}, graph, { nodes: nodes });
    if (!only) {
      g.axes = res.axes || g.axes;
      g.meta = Object.assign({}, g.meta, { layout: Object.assign({ structureType: type }, res.layout || {}) });
      if (Array.isArray(res.extraEdges) && res.extraEdges.length) {
        var have = {}; (g.edges || []).forEach(function (e) { if (e && e.id) have[e.id] = 1; });
        var add = [];
        res.extraEdges.forEach(function (e) {
          if (!e || !e.fromId || !e.toId) return;
          var id = 'e_layout_' + e.fromId + '_' + e.toId;
          if (have[id]) return;
          have[id] = 1;
          add.push({ id: id, fromId: e.fromId, toId: e.toId, type: EDGE_TYPES[e.type] ? e.type : 'sequence' });
        });
        if (add.length) g.edges = (g.edges || []).concat(add);
      }
    }
    return g;
  }

  // Reassign a node to a different strand (= depth plane). category + axisValues.z
  // move in lock-step so geometry, lanes, and the SR description keep one source
  // of truth.
  function setNodeStrand(graph, id, category) {
    graph = normalizeGraph(graph);
    var cat = (typeof category === 'string' && category) ? category : null;
    var found = false;
    var nodes = graph.nodes.map(function (n) {
      if (n.id !== id) return n;
      found = true;
      var av = Object.assign({}, n.axisValues || {});
      if (cat) av.z = cat; else delete av.z;
      return Object.assign({}, n, { category: cat, axisValues: av });
    });
    if (!found) return graph;
    var g = Object.assign({}, graph, { nodes: nodes });
    g.layers = deriveLanes(g);
    return g;
  }

  // Nudge a node along a normalized ordinal axis ('x' or 'y') by delta, clamped to
  // 0..1. If the node has no axisValue yet, one is derived from its current
  // coordinate relative to project()'s scale, so the first nudge moves it FROM
  // WHERE IT IS, not from a reset position.
  function nudgeNodeAxis(graph, id, axis, delta, opts) {
    graph = normalizeGraph(graph);
    if (axis !== 'x' && axis !== 'y') return graph;
    opts = opts || {};
    var scale = axis === 'x' ? num(opts.width, 2000) : num(opts.height, 1200);
    var node = null;
    for (var i = 0; i < graph.nodes.length; i++) { if (graph.nodes[i].id === id) { node = graph.nodes[i]; break; } }
    if (!node) return graph;
    var cur = (node.axisValues && isNum(node.axisValues[axis])) ? node.axisValues[axis] : clamp01(num(node[axis], 0) / scale);
    var next = clamp01(cur + (isNum(delta) ? delta : 0));
    var nodes = graph.nodes.map(function (n) {
      if (n.id !== id) return n;
      var av = Object.assign({}, n.axisValues || {});
      av[axis] = next;
      return Object.assign({}, n, { axisValues: av });
    });
    return Object.assign({}, graph, { nodes: nodes });
  }

  // ── Strand Challenge — the 3D-native "sort game" ────────────────────
  // Counterpart of the 2D organizer sort games: strip strand membership from
  // ITEM nodes (they fall onto the trailing "Ungrouped" plane) and drop every
  // edge touching an item (a branch→item edge would give the answer away).
  // Branch nodes keep their categories so the strand planes stay visible as
  // the drop targets. Scoring is a pure comparison — the whole game loop is
  // unit-testable without WebGL.
  function buildStrandChallenge(graph) {
    graph = normalizeGraph(graph);
    var answerKey = {}, targets = [], strands = [], seenStrand = {};
    graph.nodes.forEach(function (n) {
      if (n.type === 'item' && typeof n.category === 'string' && n.category) {
        answerKey[n.id] = n.category;
        targets.push(n.id);
        if (!seenStrand[n.category]) { seenStrand[n.category] = true; strands.push(n.category); }
      }
    });
    var targetSet = {}; targets.forEach(function (id) { targetSet[id] = 1; });
    var nodes = graph.nodes.map(function (n) {
      if (!targetSet[n.id]) return n;
      var av = Object.assign({}, n.axisValues || {});
      delete av.z;
      return Object.assign({}, n, { category: null, axisValues: av });
    });
    var edges = (graph.edges || []).filter(function (e) { return !targetSet[e.fromId] && !targetSet[e.toId]; });
    var g = Object.assign({}, graph, { nodes: nodes, edges: edges });
    g.layers = deriveLanes(g);
    return { graph: g, answerKey: answerKey, targets: targets, strands: strands };
  }

  // One-shot pedagogical hint for a misplaced/unplaced concept. Deliberately
  // NEVER reveals the correct strand — it nudges the student to think about what
  // the concept is/does. PURE (string builder); the host owns the callGemini.
  function buildStrandHintPrompt(opts) {
    opts = opts || {};
    var strands = Array.isArray(opts.strands) ? opts.strands : [];
    var label = String(opts.itemLabel || 'this concept');
    return [
      opts.topic ? 'Topic: ' + opts.topic : '',
      opts.gradeLevel ? 'Grade band: ' + opts.gradeLevel : '',
      'A student is sorting concepts onto thematic strands: ' + JSON.stringify(strands) + '.',
      (opts.placedStrand
        ? 'They placed the concept "' + label + '" on the strand "' + opts.placedStrand + '", which is not where it belongs.'
        : 'They have not yet placed the concept "' + label + '".'),
      'Give ONE short hint (maximum 2 sentences, student-friendly) that helps them think about what "' + label + '" is, does, or is part of —',
      'WITHOUT naming or revealing the correct strand, WITHOUT listing the strands, and WITHOUT the words "correct" or "wrong".',
      'Return plain text only, no markdown.'
    ].filter(Boolean).join('\n');
  }

  // ── Method-of-loci imagery layer (borrowed from the Memory Palace) ──
  // The palace's Furnish is driven by each locus's MNEMONIC, not its bare label:
  // a vivid, concrete, slightly surreal picture is what makes a locus stick. A
  // concept space has no mnemonic field — only the Memory Palace organizer type
  // asks the dispatcher for one — so a batch furnish generates them on demand in
  // ONE call, then feeds `mnemonic || label` to the image/sculpture generator
  // exactly the way the palace does. PURE builder; the host owns callGemini.
  function buildNodeMnemonicPrompt(items, opts) {
    opts = opts || {};
    var list = (Array.isArray(items) ? items : []).map(function (it) {
      return {
        id: String((it && it.id != null) ? it.id : ''),
        label: String((it && it.label != null) ? it.label : '')
      };
    }).filter(function (it) { return it.id && it.label; });
    return [
      opts.topic ? 'Topic: ' + opts.topic : '',
      opts.gradeLevel ? 'Grade band: ' + opts.gradeLevel : '',
      'For each concept below write ONE vivid, concrete picture that stands for it — the kind of image a method-of-loci memory practice uses.',
      'Rules: describe something a person could actually SEE (objects, exaggerated size, action, colour); one sentence, under 20 words;',
      'the image must be a HONEST cue for the concept (never a pun or a visual that would teach the wrong idea); school-appropriate; no text or lettering in the picture.',
      'Concepts: ' + JSON.stringify(list),
      'Return ONLY a JSON array of {"id","mnemonic"} objects — no prose, no markdown fences.'
    ].filter(Boolean).join('\n');
  }

  // PURE: model text → { [nodeId]: mnemonic }. Tolerates fenced JSON and drops
  // anything that is not a usable {id, mnemonic} pair, so a partial or malformed
  // reply degrades to "some nodes keep their label" rather than failing the batch.
  function parseNodeMnemonics(text) {
    var out = {};
    var s = String(text || '').trim();
    if (!s) return out;
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    var a = s.indexOf('['), b = s.lastIndexOf(']');
    if (a < 0 || b <= a) return out;
    var arr;
    try { arr = JSON.parse(s.slice(a, b + 1)); } catch (e) { return out; }
    if (!Array.isArray(arr)) return out;
    arr.forEach(function (row) {
      if (!row || typeof row !== 'object') return;
      var id = (typeof row.id === 'string') ? row.id.trim() : '';
      var m = (typeof row.mnemonic === 'string') ? row.mnemonic.trim() : '';
      if (id && m) out[id] = m.slice(0, 240);
    });
    return out;
  }

  // placed = {nodeId: strand} (from the emitted arrangement's categories).
  function scoreStrandChallenge(answerKey, placed) {
    placed = placed || {};
    var results = {}, total = 0, correct = 0, unplaced = 0, incorrect = 0;
    Object.keys(answerKey || {}).forEach(function (id) {
      total++;
      var p = placed[id];
      if (!p) { results[id] = 'unplaced'; unplaced++; }
      else if (p === answerKey[id]) { results[id] = 'correct'; correct++; }
      else { results[id] = 'incorrect'; incorrect++; }
    });
    return { total: total, correct: correct, incorrect: incorrect, unplaced: unplaced, results: results, complete: total > 0 && correct === total };
  }

  // ── Throughline (unit builder) ↔ acg ────────────────────────────────
  function fromThroughlineUnit(unit) {
    var g = emptyGraph();
    if (!unit || typeof unit !== 'object') return g;
    var meta = Object.assign({}, unit); delete meta.nodes; delete meta.edges;
    g.meta = { throughline: meta };
    g.title = unit.title || '';
    g.nodes = (Array.isArray(unit.nodes) ? unit.nodes : []).map(function (n) {
      var node = Object.assign({}, n);
      node.id = n.nodeId; delete node.nodeId;
      node.z = isNum(n.z) ? n.z : 0;
      node.label = (typeof n.label === 'string') ? n.label : '';
      return node;
    });
    g.edges = (Array.isArray(unit.edges) ? unit.edges : []).map(function (e) {
      return { fromId: e.from, toId: e.to, type: EDGE_TYPES[e.type] ? e.type : 'sequence' };
    });
    g.layers = deriveLanes(g);
    return g;
  }
  function toThroughlineUnit(graph) {
    graph = normalizeGraph(graph);
    var unit = Object.assign({}, (graph.meta && graph.meta.throughline) || {});
    unit.nodes = (graph.nodes || []).map(function (node) {
      var n = Object.assign({}, node);
      n.nodeId = node.id; delete n.id;
      delete n.z; delete n.label; delete n.axisValues;   // throughline stores none of these
      return n;
    });
    unit.edges = (graph.edges || []).map(function (e) {
      return { from: e.fromId, to: e.toId, type: EDGE_TYPES[e.type] ? e.type : 'sequence' };
    });
    return unit;
  }

  // ── Visual-Organizer concept map ↔ acg ──────────────────────────────
  function fromConceptMap(nodes, edges, structureType) {
    var g = emptyGraph();
    g.meta = { conceptMap: { structureType: structureType || null } };
    g.nodes = (Array.isArray(nodes) ? nodes : []).map(function (n) {
      var node = Object.assign({}, n);          // carry id,x,y,text,type,colorVariant,…
      node.label = (typeof n.text === 'string') ? n.text : (n.label || '');
      node.z = isNum(n.z) ? n.z : 0;
      return node;
    });
    g.edges = (Array.isArray(edges) ? edges : []).map(function (e) {
      var edge = Object.assign({}, e);          // carry id,fromId,toId,style,color,status,…
      edge.type = EDGE_TYPES[e.type] ? e.type : 'associates';
      return edge;
    });
    g.layers = deriveLanes(g);
    return g;
  }
  function toConceptMap(graph) {
    graph = normalizeGraph(graph);
    var nodes = (graph.nodes || []).map(function (node) {
      var n = Object.assign({}, node);
      delete n.label; delete n.z; delete n.axisValues;   // concept-map node = {id,x,y,text,type,colorVariant?}
      return n;
    });
    var edges = (graph.edges || []).map(function (e) {
      var edge = Object.assign({}, e); delete edge.type;   // concept-map native edge has no `type` (acg-only)
      return edge;
    });
    var structureType = (graph.meta && graph.meta.conceptMap && graph.meta.conceptMap.structureType) || null;
    return { nodes: nodes, edges: edges, structureType: structureType };
  }

  // ── Gemini Stage-1 semantic graph → acg ─────────────────────────────
  // {main, branches:[{title, items, connectsTo}], structureType} → a real graph.
  // Lossy by nature (a transform, not a round-trip): root + branch + item nodes,
  // elaborates edges down the tree, sequence edges across connectsTo.
  function adaptGenerated(gen) {
    var g = emptyGraph();
    g.title = (gen && gen.main != null) ? String(gen.main) : '';
    g.meta = { generated: { structureType: (gen && gen.structureType) || null } };
    var rootId = 'root';
    g.nodes.push({ id: rootId, label: g.title, type: 'main', x: 0, y: 0, z: 0, category: null });
    var branches = (gen && Array.isArray(gen.branches)) ? gen.branches : [];
    var branchIds = branches.map(function (_, bi) { return 'b' + bi; });
    branches.forEach(function (b, bi) {
      var bid = branchIds[bi];
      var title = (b && b.title != null) ? String(b.title) : ('Branch ' + (bi + 1));
      g.nodes.push({ id: bid, label: title, type: 'branch', x: 0, y: 0, z: 0, category: title });
      g.edges.push({ id: 'e_' + rootId + '_' + bid, fromId: rootId, toId: bid, type: 'elaborates' });
      var items = (b && Array.isArray(b.items)) ? b.items : [];
      items.forEach(function (it, ii) {
        var iid = bid + '_i' + ii;
        // Items can be plain strings or {text: …} objects (seeded/template organizers).
        var label = (it && typeof it === 'object') ? String(it.text || '') : String(it);
        g.nodes.push({ id: iid, label: label, type: 'item', x: 0, y: 0, z: 0, category: title });
        g.edges.push({ id: 'e_' + bid + '_' + iid, fromId: bid, toId: iid, type: 'elaborates' });
      });
    });
    branches.forEach(function (b, bi) {
      var ct = (b && Array.isArray(b.connectsTo)) ? b.connectsTo : [];
      ct.forEach(function (target) {
        if (branchIds[target] && target !== bi) {
          g.edges.push({ id: 'e_ct' + bi + '_' + target, fromId: branchIds[bi], toId: branchIds[target], type: 'sequence' });
        }
      });
    });
    g.layers = deriveLanes(g);
    return g;
  }

  // ── Alignment audit → acg ───────────────────────────────────────────────
  // This is a projection, not a round-trip. It deliberately preserves the
  // audit's evidence and provenance while refusing to infer artifact links
  // from free-text phrases such as "Artifact 3".
  function auditText(value) { return value == null ? '' : String(value).trim(); }
  function auditIdPart(value) {
    var out = auditText(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return out || 'item';
  }
  function auditToken(value) {
    return auditText(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/^\s+|\s+$/g, '');
  }
  function normalizeAttributionSource(value, fallback) {
    var normalized = auditText(value).toLowerCase();
    if (normalized === 'audit-model' || normalized === 'teacher' || normalized === 'deterministic-check' || normalized === 'unknown') return normalized;
    return fallback || 'unknown';
  }
  function exactStandardsContextRecord(records, query) {
    var q = auditToken(query);
    if (!q || !Array.isArray(records)) return null;
    var matches = records.filter(function (record) {
      if (!record || record.resolvable === false) return false;
      return [record.code, record.id, record.label].some(function (value) { return auditToken(value) === q; });
    });
    return matches.length === 1 ? matches[0] : null;
  }
  function resolveStandardsContextRecord(provider, standardsContext, query) {
    var direct = exactStandardsContextRecord(standardsContext && standardsContext.standards, query);
    if (direct) return { status: 'resolved', record: direct };
    if (!provider || typeof provider.resolveStandard !== 'function') return { status: 'unavailable', record: null };
    try {
      var result = provider.resolveStandard(query);
      if (result && result.status === 'resolved' && result.match && result.match.resolvable !== false) {
        return { status: 'resolved', record: result.match };
      }
      return { status: result && result.status ? String(result.status) : 'not-found', record: null };
    } catch (e) {
      return { status: 'unavailable', record: null };
    }
  }
  function standardsContextNodeId(record, usedIds) {
    var base = 'standards-context-' + auditIdPart(record && record.id);
    var id = base, suffix = 2;
    while (usedIds[id] && usedIds[id] !== String(record && record.id)) id = base + '-' + suffix++;
    usedIds[id] = String(record && record.id);
    return id;
  }
  function standardsContextNode(record, id) {
    return {
      id: id,
      label: auditText(record && (record.label || record.code || record.id)) || 'Standards context',
      type: 'standardsContext',
      category: 'Standards context',
      role: 'context',
      contextId: auditText(record && record.id) || null,
      code: auditText(record && record.code) || null,
      kind: auditText(record && record.kind) || 'standard',
      resolvable: record && record.resolvable !== false,
      framework: auditText(record && record.framework) || null,
      frameworkId: auditText(record && record.frameworkId) || null,
      text: auditText(record && (record.text || record.description)) || null,
      sourceUrl: auditText(record && record.sourceUrl) || null
    };
  }
  function contextRelationshipType(type) {
    // Preserve the semantics the dataset actually carries instead of flattening everything
    // to 'relatedTo'. 'buildsTowards' maps onto the acg 'prerequisite' type deliberately:
    // "A buildsTowards B" means A is an earlier step toward B, which is exactly what the
    // existing prerequisite styling (amber dash in the 3D and unit-path views) communicates.
    // 'supports' is the LearningComponent edge (component -> standard) introduced with the
    // --include-components snapshots. The raw value always survives in edge.relationType,
    // so this mapping only chooses the STYLING family, and unknown types still fall back
    // to the generic 'relatedTo' rendering in every view.
    var normalized = String(type || '').toLowerCase();
    if (normalized === 'haschild') return 'contains';
    if (normalized === 'buildstowards') return 'prerequisite';
    if (normalized === 'supports') return 'supports';
    return 'relatedTo';
  }
  function normalizeAuditStatus(value) {
    var raw = auditText(value), lower = raw.toLowerCase();
    if (!raw) return 'Not evaluated';
    if (lower === 'pass' || lower === 'aligned' || lower === 'source verified') return 'Aligned';
    if (lower.indexOf('partial') !== -1) return 'Partially aligned';
    if (lower === 'revise' || lower.indexOf('not aligned') !== -1 || lower === 'fail' || lower === 'failed') return 'Not aligned';
    if (lower.indexOf('source unavailable') !== -1 || lower === 'unavailable') return 'Source unavailable';
    if (lower.indexOf('inference') !== -1) return 'Inference only';
    if (lower === 'not evaluated' || lower === 'not applicable' || lower === 'incomplete') return 'Not evaluated';
    return 'Not evaluated';
  }
  function fromAlignmentAudit(input, opts) {
    opts = opts || {};
    var root = input;
    if (root && root.content && root.content.comprehensive) root = root.content.comprehensive;
    else if (root && root.comprehensive) root = root.comprehensive;
    if (!root || typeof root !== 'object') root = {};
    var standards = (root.standards && typeof root.standards === 'object') ? root.standards : root;
    var reports = Array.isArray(input) ? input : (Array.isArray(standards.perStandard) ? standards.perStandard : (Array.isArray(standards.reports) ? standards.reports : []));
    var standardsContext = opts.standardsContext || root.standardsContext || standards.standardsContext || null;
    var auditScope = opts.auditScope || root.auditScope || standards.auditScope || null;
    var contextProvenance = standardsContext && typeof standardsContext === 'object' && standardsContext.provenance ? standardsContext.provenance : null;
    var provenance = opts.provenance || contextProvenance || root.provenance || standards.provenance || null;
    var auditStatus = normalizeAuditStatus(standards.status);
    var title = auditText(opts.title || root.title) || 'Curriculum alignment audit';
    var g = emptyGraph();
    g.title = title;
    g.meta = {
      alignmentAudit: {
        provider: auditText(opts.provider || (standardsContext && standardsContext.provider) || (provenance && provenance.provider)) || 'AlloFlow curriculum audit',
        datasetVersion: auditText(opts.datasetVersion || (standardsContext && standardsContext.datasetVersion) || (provenance && provenance.datasetVersion)) || null,
        snapshotId: auditText(opts.snapshotId || (standardsContext && standardsContext.snapshotId) || (provenance && provenance.snapshotId)) || null,
        generatedAt: auditText(opts.generatedAt || (root.auditMetadata && root.auditMetadata.generatedAt)) || null,
        status: auditStatus,
        rawStatus: auditText(standards.status) || null,
        standardsCount: reports.length,
        passCount: typeof standards.passCount === 'number' ? standards.passCount : null,
        reviseCount: typeof standards.reviseCount === 'number' ? standards.reviseCount : null,
        provenance: provenance && typeof provenance === 'object' ? Object.assign({}, provenance) : null,
        auditScope: auditScope && typeof auditScope === 'object' ? Object.assign({}, auditScope) : null,
        standardsContext: standardsContext && typeof standardsContext === 'object' ? Object.assign({}, standardsContext) : null
      }
    };

    var standardsProvider = opts.standardsProvider && typeof opts.standardsProvider === 'object' ? opts.standardsProvider : null;
    var standardsGraph = {
      enabled: !!standardsProvider,
      provider: auditText((standardsContext && standardsContext.provider) || (provenance && provenance.provider)) || null,
      datasetVersion: auditText((standardsContext && standardsContext.datasetVersion) || (provenance && provenance.datasetVersion)) || null,
      snapshotId: auditText((standardsContext && standardsContext.snapshotId) || (provenance && provenance.snapshotId)) || null,
      matchedTargets: 0,
      unresolvedTargets: [],
      contextNodes: 0,
      contextRelationships: 0,
      truncatedTargets: 0
    };
    g.meta.alignmentAudit.standardsGraph = standardsGraph;
    g.meta.alignmentMap = {
      version: 'alloflow-alignment-map/v2',
      targetNodeType: 'standard',
      contextNodeType: 'standardsContext',
      evidenceNodeType: 'auditEvidence',
      scopeNodeType: 'auditArtifact',
      attributionMode: 'explicit-only',
      attributionEdgeType: 'evidenceFrom',
      findingAttributionEdgeType: 'findingFrom',
      provenancePolicy: 'explicit-attribution-only',
      attributionSources: ['audit-model', 'teacher', 'deterministic-check', 'unknown']
    };
    var contextNodeIds = {};
    var contextEdgeKeys = {};
    var contextGraphIds = {};
    function ensureContextNode(record) {
      var key = auditText(record && record.id);
      if (!key) return null;
      if (contextGraphIds[key]) return contextGraphIds[key];
      var id = standardsContextNodeId(record, contextNodeIds);
      contextGraphIds[key] = id;
      g.nodes.push(standardsContextNode(record, id));
      standardsGraph.contextNodes++;
      return id;
    }
    var auditId = 'alignment-audit';
    g.nodes.push({ id: auditId, label: title, type: 'audit', category: 'Audit', status: auditStatus });
    var scopeArtifacts = auditScope && Array.isArray(auditScope.includedArtifacts) ? auditScope.includedArtifacts.slice(0, 100) : [];
    if (!scopeArtifacts.length && auditScope && Array.isArray(auditScope.includedArtifactIds)) {
      scopeArtifacts = auditScope.includedArtifactIds.slice(0, 100).map(function (id) { return { id: id, title: 'Audited artifact ' + id, type: 'unknown' }; });
    }
    if (auditScope && typeof auditScope === 'object') {
      g.meta.alignmentAudit.auditScopeGraph = {
        nodeCount: scopeArtifacts.length,
        truncated: Array.isArray(auditScope.includedArtifacts) && auditScope.includedArtifacts.length > scopeArtifacts.length,
        selectionMode: auditText(auditScope.selectionMode) || null
      };
    }
    var scopeArtifactNodeIds = {};
    var attributionStats = { mode: 'explicit-only', evidenceLinks: 0, findingLinks: 0, evidenceBySource: {}, findingBySource: {} };
    function noteAttribution(kind, source) {
      var key = kind === 'finding' ? 'findingBySource' : 'evidenceBySource';
      var normalized = normalizeAttributionSource(source, 'unknown');
      attributionStats[key][normalized] = (attributionStats[key][normalized] || 0) + 1;
    }
    scopeArtifacts.forEach(function (artifact, artifactIndex) {
      artifact = artifact && typeof artifact === 'object' ? artifact : { id: artifact };
      var artifactKey = auditText(artifact.id) || ('artifact-' + artifactIndex);
      var artifactNodeId = 'audit-artifact-' + artifactIndex + '-' + auditIdPart(artifactKey);
      var artifactLabel = auditText(artifact.title) || ('Audited artifact ' + artifactKey);
      var artifactType = auditText(artifact.type) || 'unknown';
      g.nodes.push({
        id: artifactNodeId,
        label: artifactLabel,
        type: 'auditArtifact',
        category: 'Audit scope',
        role: 'scope',
        artifactId: artifactKey,
        artifactType: artifactType,
        timestamp: auditText(artifact.timestamp) || null,
        status: 'Audited',
        attributionSource: 'deterministic-check'
      });
      scopeArtifactNodeIds[artifactKey] = artifactNodeId;
      g.edges.push({
        id: 'scope-' + auditId + '-' + artifactIndex,
        fromId: auditId,
        toId: artifactNodeId,
        type: 'contains',
        relationType: 'auditScope',
        provenance: 'alloflow-audit',
        attributionSource: 'deterministic-check'
      });
    });
    function explicitArtifactIds(value) {
      if (!Array.isArray(value)) return [];
      var seen = {};
      return value.map(function (id) { return auditText(id); }).filter(function (id) {
        if (!id || !scopeArtifactNodeIds[id] || seen[id]) return false;
        seen[id] = true;
        return true;
      }).slice(0, 12);
    }
    function explicitFindingAttribution(report, gap, gapText) {
      var direct = gap && typeof gap === 'object' ? gap : null;
      var directIds = direct && (direct.artifactIds || direct.findingArtifactIds);
      if (Array.isArray(directIds)) return { artifactIds: explicitArtifactIds(directIds), attributionSource: direct.attributionSource };
      var attributions = report && Array.isArray(report.findingAttributions) ? report.findingAttributions : [];
      for (var attributionIndex = 0; attributionIndex < attributions.length; attributionIndex++) {
        var attribution = attributions[attributionIndex];
        if (attribution && auditText(attribution.text) === gapText) return { artifactIds: explicitArtifactIds(attribution.artifactIds || attribution.findingArtifactIds), attributionSource: attribution.attributionSource };
      }
      return { artifactIds: [], attributionSource: null };
    }
    g.meta.alignmentAudit.evidenceAttribution = attributionStats;
    reports.forEach(function (report, ri) {
      report = report && typeof report === 'object' ? report : {};
      var standardLabel = auditText(report.standard) || ('Standard ' + (ri + 1));
      var standardId = 'standard-' + ri + '-' + auditIdPart(standardLabel);
      var standardRawStatus = report.overallDetermination || report.status;
      var standardStatus = normalizeAuditStatus(standardRawStatus);
      var standardNode = {
        id: standardId,
        label: standardLabel,
        type: 'standard',
        category: 'Standards',
        role: 'target',
        status: standardStatus,
        rawStatus: auditText(standardRawStatus) || null,
        standardBreakdown: report.standardBreakdown && typeof report.standardBreakdown === 'object' ? Object.assign({}, report.standardBreakdown) : null
      };
      g.nodes.push(standardNode);
      g.edges.push({ id: 'contains-' + auditId + '-' + standardId, fromId: auditId, toId: standardId, type: 'contains', status: standardStatus, provenance: 'alloflow-audit', attributionSource: 'deterministic-check' });
      var contextResolution = resolveStandardsContextRecord(standardsProvider, standardsContext, standardLabel);
      if (contextResolution.record) {
        var contextRecord = contextResolution.record;
        standardNode.standardsContext = standardsContextNode(contextRecord, auditText(contextRecord.id) || standardId);
        if (standardsProvider && typeof standardsProvider.getNeighborhood === 'function') {
          var neighborhood = null;
          try {
            neighborhood = standardsProvider.getNeighborhood(contextRecord.id, {
              depth: Number(opts.standardsContextDepth) || 2,
              maxNodes: Number(opts.standardsContextMaxNodes) || 24,
              maxEdges: Number(opts.standardsContextMaxEdges) || 48
            });
          } catch (e) {
            neighborhood = null;
          }
          if (neighborhood && Array.isArray(neighborhood.nodes)) {
            standardsGraph.matchedTargets++;
            if (neighborhood.truncated) standardsGraph.truncatedTargets++;
            var contextRecordsById = {};
            neighborhood.nodes.forEach(function (node) {
              var nodeKey = auditText(node && node.id);
              if (nodeKey) contextRecordsById[nodeKey] = node;
              if (nodeKey && nodeKey !== auditText(contextRecord.id)) ensureContextNode(node);
            });
            (Array.isArray(neighborhood.relationships) ? neighborhood.relationships : []).forEach(function (relationship, relationIndex) {
              var fromKey = auditText(relationship && relationship.fromId);
              var toKey = auditText(relationship && relationship.toId);
              var fromId = fromKey === auditText(contextRecord.id) ? standardId : ensureContextNode(contextRecordsById[fromKey]);
              var toId = toKey === auditText(contextRecord.id) ? standardId : ensureContextNode(contextRecordsById[toKey]);
              if (!fromId || !toId || fromId === toId) return;
              var relationType = auditText(relationship.type) || 'related';
              var edgeType = contextRelationshipType(relationType);
              var edgeKey = fromId + '|' + toId + '|' + relationType;
              if (contextEdgeKeys[edgeKey]) return;
              contextEdgeKeys[edgeKey] = true;
              g.edges.push({
                id: 'standards-context-' + standardId + '-' + relationIndex + '-' + auditIdPart(relationType),
                fromId: fromId,
                toId: toId,
                type: edgeType,
                relationType: relationType,
                direction: relationship.direction || null,
                source: relationship.source || null,
                provenance: 'standards-provider',
                attributionSource: 'deterministic-check'
              });
              standardsGraph.contextRelationships++;
            });
          } else {
            standardsGraph.unresolvedTargets.push({ query: standardLabel, status: 'neighborhood-unavailable' });
          }
        }
      } else if (standardsProvider) {
        standardsGraph.unresolvedTargets.push({ query: standardLabel, status: contextResolution.status });
      }

      var analysis = report.analysis && typeof report.analysis === 'object' ? report.analysis : {};
      [
        { key: 'textAlignment', label: 'Text alignment', labelKey: 'concept_graph.dim_text', edgeType: 'evidencedBy' },
        { key: 'activityAlignment', label: 'Activity alignment', labelKey: 'concept_graph.dim_activity', edgeType: 'evidencedBy' },
        { key: 'assessmentAlignment', label: 'Assessment alignment', labelKey: 'concept_graph.dim_assessment', edgeType: 'assessedBy' }
      ].forEach(function (dimension) {
        var section = analysis[dimension.key] && typeof analysis[dimension.key] === 'object' ? analysis[dimension.key] : {};
        var rawStatus = section.status;
        var status = normalizeAuditStatus(rawStatus);
        var evidenceId = standardId + '-' + dimension.key;
        var evidence = auditText(section.evidence);
        var notes = auditText(section.notes);
        var artifactIds = explicitArtifactIds(section.artifactIds || section.evidenceArtifactIds);
        var evidenceAttributionSource = artifactIds.length ? normalizeAttributionSource(section.attributionSource, 'audit-model') : null;
        g.nodes.push({
          id: evidenceId,
          label: dimension.label,
          labelKey: dimension.labelKey,
          type: 'auditEvidence',
          category: 'Alignment evidence',
          status: status,
          rawStatus: auditText(rawStatus) || null,
          dimension: dimension.key,
          evidence: evidence,
          notes: notes,
          artifactIds: artifactIds,
          attribution: artifactIds.length ? 'explicit' : null,
          attributionSource: evidenceAttributionSource
        });
        g.edges.push({
          id: 'evidence-' + standardId + '-' + dimension.key,
          fromId: standardId,
          toId: evidenceId,
          type: dimension.edgeType,
          status: status,
          evidence: evidence,
          notes: notes,
          provenance: 'alloflow-audit',
          attributionSource: 'deterministic-check'
        });
        artifactIds.forEach(function (artifactId, artifactIndex) {
          var artifactNodeId = scopeArtifactNodeIds[artifactId];
          if (!artifactNodeId) return;
          g.edges.push({
            id: 'evidence-artifact-' + standardId + '-' + dimension.key + '-' + artifactIndex,
            fromId: evidenceId,
            toId: artifactNodeId,
            type: 'supportedBy',
            relationType: 'evidenceFrom',
            artifactId: artifactId,
            attribution: 'explicit',
            attributionSource: evidenceAttributionSource,
            provenance: 'alloflow-audit'
          });
          attributionStats.evidenceLinks++;
          noteAttribution('evidence', evidenceAttributionSource);
        });
      });

      (Array.isArray(report.gaps) ? report.gaps : []).forEach(function (gap, gi) {
        var gapValue = gap && typeof gap === 'object' ? (gap.text || gap.finding || gap.label) : gap;
        var gapText = auditText(gapValue);
        if (!gapText) return;
        var findingAttribution = explicitFindingAttribution(report, gap, gapText);
        var findingArtifactIds = findingAttribution.artifactIds;
        var findingAttributionSource = findingArtifactIds.length ? normalizeAttributionSource(findingAttribution.attributionSource, 'audit-model') : null;
        var findingId = standardId + '-finding-' + gi;
        g.nodes.push({ id: findingId, label: gapText, type: 'auditFinding', category: 'Audit findings', status: 'Not aligned', finding: gapText, artifactIds: findingArtifactIds, attribution: findingArtifactIds.length ? 'explicit' : null, attributionSource: findingAttributionSource });
        g.edges.push({ id: 'finding-' + standardId + '-' + gi, fromId: standardId, toId: findingId, type: 'contains', status: 'Not aligned', provenance: 'alloflow-audit', attributionSource: 'deterministic-check' });
        findingArtifactIds.forEach(function (artifactId, artifactIndex) {
          var artifactNodeId = scopeArtifactNodeIds[artifactId];
          if (!artifactNodeId) return;
          g.edges.push({
            id: 'finding-artifact-' + standardId + '-' + gi + '-' + artifactIndex,
            fromId: findingId,
            toId: artifactNodeId,
            type: 'supportedBy',
            relationType: 'findingFrom',
            artifactId: artifactId,
            attribution: 'explicit',
            attributionSource: findingAttributionSource,
            provenance: 'alloflow-audit'
          });
          attributionStats.findingLinks++;
          noteAttribution('finding', findingAttributionSource);
        });
      });
      var recommendation = auditText(report.adminRecommendation);
      if (recommendation) {
        var recommendationId = standardId + '-recommendation';
        g.nodes.push({ id: recommendationId, label: recommendation, type: 'auditRecommendation', category: 'Audit findings', status: standardStatus, recommendation: recommendation });
        g.edges.push({ id: 'recommendation-' + standardId, fromId: standardId, toId: recommendationId, type: 'contains', status: standardStatus, provenance: 'alloflow-audit', attributionSource: 'deterministic-check' });
      }
    });
    g.layers = deriveLanes(g);
    return g;
  }
  // ── normalizeGraph — accept any known shape → acg (idempotent) ───────
  // Create a derived graph in which a teacher confirms existing explicit
  // evidence/finding relationships. This never creates a new artifact edge or
  // mutates the original graph; the producer declaration remains in history.
  function confirmExplicitAttributions(input, confirmations, opts) {
    opts = opts || {};
    var graph = normalizeGraph(input);
    var requests = Array.isArray(confirmations) ? confirmations : [];
    var requested = {};
    requests.forEach(function (confirmation) {
      if (!confirmation || typeof confirmation !== 'object') return;
      var ids = Array.isArray(confirmation.edgeIds)
        ? confirmation.edgeIds
        : (confirmation.edgeId != null ? [confirmation.edgeId] : []);
      ids.forEach(function (id) {
        var key = auditText(id);
        if (key) requested[key] = confirmation;
      });
    });
    var nodeById = {};
    (Array.isArray(graph.nodes) ? graph.nodes : []).forEach(function (node) {
      if (node && node.id) nodeById[node.id] = node;
    });
    var changedEdgeIds = [];
    var edges = (Array.isArray(graph.edges) ? graph.edges : []).map(function (edge) {
      var request = edge && requested[auditText(edge.id)];
      var fromNode = edge && nodeById[edge.fromId];
      var toNode = edge && nodeById[edge.toId];
      var isExplicitArtifactEdge = !!(edge
        && edge.type === 'supportedBy'
        && edge.attribution === 'explicit'
        && (edge.relationType === 'evidenceFrom' || edge.relationType === 'findingFrom')
        && fromNode
        && (fromNode.type === 'auditEvidence' || fromNode.type === 'auditFinding')
        && toNode
        && toNode.type === 'auditArtifact');
      if (!request || !isExplicitArtifactEdge || edge.attributionSource === 'teacher') return edge;
      var originalSource = normalizeAttributionSource(edge.attributionSource, 'audit-model');
      var history = Array.isArray(edge.attributionHistory) ? edge.attributionHistory.slice(0, 8) : [];
      if (!history.some(function (entry) { return entry && entry.role === 'producer'; })) {
        history.unshift({ source: originalSource, role: 'producer', method: 'declared' });
      }
      history.push({
        source: 'teacher',
        role: 'confirmation',
        method: 'teacher-confirmed',
        confirmedAt: auditText(request.confirmedAt || opts.confirmedAt) || null,
        confirmedBy: auditText(request.confirmedBy || opts.confirmedBy) || null,
        note: auditText(request.note || opts.note) || null
      });
      changedEdgeIds.push(edge.id);
      return Object.assign({}, edge, {
        attributionSource: 'teacher',
        attributionHistory: history.slice(-8)
      });
    });
    var alignmentMap = graph.meta && graph.meta.alignmentMap ? graph.meta.alignmentMap : {};
    var alignmentAudit = graph.meta && graph.meta.alignmentAudit ? graph.meta.alignmentAudit : {};
    // The summary describes the whole derived snapshot, not merely this click.
    // Recompute it from the resulting edges so sequential confirmations remain
    // cumulative even when older snapshots had incomplete summary metadata.
    var confirmedEdgeIds = edges.filter(function (edge) {
      if (!edge || edge.attributionSource !== 'teacher' || edge.attribution !== 'explicit') return false;
      return edge.relationType === 'evidenceFrom' || edge.relationType === 'findingFrom';
    }).map(function (edge) { return auditText(edge.id); }).filter(Boolean).slice(0, 100);
    var meta = Object.assign({}, graph.meta || {}, {
      alignmentMap: Object.assign({}, alignmentMap, { attributionConfirmationPolicy: 'derived-copy-only' }),
      alignmentAudit: Object.assign({}, alignmentAudit, {
        attributionConfirmations: {
          mode: 'derived-copy-only',
          count: confirmedEdgeIds.length,
          edgeIds: confirmedEdgeIds
        }
      })
    });
    return Object.assign({}, graph, { nodes: (graph.nodes || []).slice(), edges: edges, meta: meta });
  }
  // Read-only Throughline contract for exported alignment graphs. This validator
  // accepts only the explicit export schema and the alignment-map metadata; it does
  // not infer evidence links from labels, phrases, or node proximity.
  var ALIGNMENT_EXPORT_SCHEMA = 'alloflow-alignment-graph-export/v1';
  var ALIGNMENT_NODE_TYPES = ['audit', 'standard', 'standardsContext', 'auditArtifact', 'auditEvidence', 'auditFinding', 'auditRecommendation'];
  var ALIGNMENT_ATTRIBUTION_SOURCES = ['audit-model', 'teacher', 'deterministic-check', 'unknown'];

  function alignmentStringList(value) {
    if (!Array.isArray(value)) return [];
    var seen = {};
    return value.map(function (item) { return auditText(item).toLowerCase(); }).filter(function (item) {
      if (!item || seen[item]) return false;
      seen[item] = true;
      return true;
    });
  }
  var ALIGNMENT_IMPORT_LIMITS = { maxString: 4000, maxDepth: 8, maxKeys: 80, maxArray: 500, maxTotalText: 600000 };
  function sanitizeAlignmentValue(value, depth, state) {
    if (value == null || typeof value === 'boolean') return value;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'string') {
      var remaining = Math.max(0, ALIGNMENT_IMPORT_LIMITS.maxTotalText - state.text);
      var out = value.slice(0, Math.min(ALIGNMENT_IMPORT_LIMITS.maxString, remaining));
      state.text += out.length;
      return out;
    }
    if (depth >= ALIGNMENT_IMPORT_LIMITS.maxDepth) return null;
    if (Array.isArray(value)) {
      return value.slice(0, ALIGNMENT_IMPORT_LIMITS.maxArray).map(function (item) {
        return sanitizeAlignmentValue(item, depth + 1, state);
      }).filter(function (item) { return item !== undefined; });
    }
    if (typeof value !== 'object') return null;
    var outObject = {};
    Object.keys(value).slice(0, ALIGNMENT_IMPORT_LIMITS.maxKeys).forEach(function (key) {
      if (key === '__proto__' || key === 'prototype' || key === 'constructor') return;
      var safeKey = String(key).slice(0, 120);
      var safeValue = sanitizeAlignmentValue(value[key], depth + 1, state);
      if (safeValue !== undefined) outObject[safeKey] = safeValue;
    });
    return outObject;
  }
  function boundedAlignmentGraph(graph, opts) {
    opts = opts || {};
    var maxNodes = Math.max(1, Math.min(500, parseInt(opts.maxNodes, 10) || 240));
    var maxEdges = Math.max(1, Math.min(1000, parseInt(opts.maxEdges, 10) || 480));
    var state = { text: 0 };
    var sourceNodes = graph && Array.isArray(graph.nodes) ? graph.nodes : [];
    var nodeIds = {};
    var nodes = sourceNodes.slice(0, maxNodes).map(function (node) {
      var safe = sanitizeAlignmentValue(node, 0, state);
      if (!safe || typeof safe !== 'object') return null;
      var id = auditText(safe.id).slice(0, 240);
      if (!id || nodeIds[id]) return null;
      safe.id = id;
      nodeIds[id] = true;
      return safe;
    }).filter(Boolean);
    var sourceEdges = graph && Array.isArray(graph.edges) ? graph.edges : [];
    var edges = sourceEdges.map(function (edge) {
      var safe = sanitizeAlignmentValue(edge, 0, state);
      if (!safe || typeof safe !== 'object') return null;
      safe.fromId = auditText(safe.fromId).slice(0, 240);
      safe.toId = auditText(safe.toId).slice(0, 240);
      return nodeIds[safe.fromId] && nodeIds[safe.toId] ? safe : null;
    }).filter(Boolean).slice(0, maxEdges);
    var graphMeta = graph && graph.meta && typeof graph.meta === 'object'
      ? sanitizeAlignmentValue(graph.meta, 0, state)
      : {};
    var viewMeta = graphMeta.alignmentView && typeof graphMeta.alignmentView === 'object' ? graphMeta.alignmentView : {};
    var meta = Object.assign({}, graphMeta, {
      alignmentView: Object.assign({}, viewMeta, { bounded: true, maxNodes: maxNodes, maxEdges: maxEdges, truncated: nodes.length < sourceNodes.length || edges.length < sourceEdges.length })
    });
    var bounded = {
      version: VERSION,
      title: auditText(graph && graph.title).slice(0, 400),
      axes: sanitizeAlignmentValue(graph && graph.axes, 0, state),
      nodes: nodes,
      edges: edges,
      layers: [],
      meta: meta
    };
    bounded.layers = deriveLanes(bounded);
    return bounded;
  }
  function alignmentExportError(code) {
    return { ok: false, error: code, schema: ALIGNMENT_EXPORT_SCHEMA, graph: emptyGraph(), originalGraph: null, audit: null, filters: null, counts: { nodes: 0, edges: 0 } };
  }
  function normalizeAlignmentGraphExport(input, opts) {
    opts = opts || {};
    var payload = input;
    if (input && input.version === VERSION && Array.isArray(input.nodes)) {
      payload = { schema: ALIGNMENT_EXPORT_SCHEMA, graph: input };
    }
    if (!payload || typeof payload !== 'object' || payload.schema !== ALIGNMENT_EXPORT_SCHEMA) return alignmentExportError('invalid-export-schema');
    var graph = normalizeGraph(payload.graph);
    var alignmentMeta = graph && graph.meta && graph.meta.alignmentMap;
    if (!graph || graph.version !== VERSION || !alignmentMeta || alignmentMeta.version !== 'alloflow-alignment-map/v2') return alignmentExportError('invalid-alignment-graph');
    var originalGraph = null;
    if (payload.originalGraph && typeof payload.originalGraph === 'object') {
      var candidate = normalizeGraph(payload.originalGraph);
      var candidateMeta = candidate && candidate.meta && candidate.meta.alignmentMap;
      if (candidate && candidate.version === VERSION && candidateMeta && candidateMeta.version === 'alloflow-alignment-map/v2') originalGraph = boundedAlignmentGraph(candidate, opts);
    }
    return {
      ok: true,
      schema: payload.schema,
      graph: boundedAlignmentGraph(graph, opts),
      originalGraph: originalGraph,
      audit: payload.audit && typeof payload.audit === 'object' ? Object.assign({}, payload.audit) : null,
      filters: null,
      counts: { nodes: graph.nodes.length, edges: graph.edges.length }
    };
  }
  function alignmentNodeSearchText(node) {
    if (!node || typeof node !== 'object') return '';
    return [node.id, node.label, node.type, node.category, node.dimension, node.evidence, node.notes,
      node.finding, node.recommendation, node.artifactId, node.artifactType, node.code, node.framework,
      node.contextId, node.text, node.status].map(function (value) { return auditText(value); }).join(' ').toLowerCase();
  }
  function filterAlignmentGraph(input, filters, opts) {
    opts = opts || {};
    filters = filters && typeof filters === 'object' ? filters : {};
    var normalized = normalizeAlignmentGraphExport(input, opts);
    if (!normalized.ok) return normalized;
    var graph = normalized.graph;
    var requestedTypes = alignmentStringList(filters.nodeTypes || filters.types);
    var requestedSources = alignmentStringList(filters.attributionSources || filters.sources);
    var query = auditText(filters.query).toLowerCase();
    var keepStructure = filters.keepStructure !== false;
    var edgeSources = {};
    (graph.edges || []).forEach(function (edge) {
      var source = normalizeAttributionSource(edge && edge.attributionSource, 'unknown');
      if (!edge || !source) return;
      [edge.fromId, edge.toId].forEach(function (id) {
        if (!id) return;
        edgeSources[id] = edgeSources[id] || {};
        edgeSources[id][source] = true;
      });
    });
    var nodeById = {};
    var visible = {};
    var visibleNodes = [];
    (graph.nodes || []).forEach(function (node) {
      if (!node || !node.id) return;
      nodeById[node.id] = node;
      var type = auditText(node.type).toLowerCase() || 'node';
      var structural = type === 'audit' || type === 'standard';
      // 'learningComponent' is a VIRTUAL filter type: components are standardsContext nodes
      // whose record kind is 'component' (they arrive via supports edges in
      // --include-components snapshots). Filtering by 'standardsContext' still shows them
      // (superset, unchanged behavior); filtering by 'learningComponent' isolates them.
      var filterTypes = [type];
      if (type === 'standardscontext' && auditText(node.kind).toLowerCase() === 'component') filterTypes.push('learningcomponent');
      var typeMatch = !requestedTypes.length
        || filterTypes.some(function (candidate) { return requestedTypes.indexOf(candidate) >= 0; })
        || (keepStructure && structural);
      var nodeSource = auditText(node.attributionSource).toLowerCase();
      var incidentSourceMatch = edgeSources[node.id] && requestedSources.length
        ? requestedSources.some(function (source) { return !!edgeSources[node.id][source]; })
        : false;
      var sourceMatch = !requestedSources.length || requestedSources.indexOf(nodeSource) >= 0 || incidentSourceMatch || (keepStructure && structural);
      var searchMatch = !query || alignmentNodeSearchText(node).indexOf(query) >= 0;
      if (typeMatch && sourceMatch && searchMatch) { visible[node.id] = true; visibleNodes.push(node); }
    });
    var visibleEdges = (graph.edges || []).filter(function (edge) {
      if (!edge || !visible[edge.fromId] || !visible[edge.toId]) return false;
      if (!requestedSources.length) return true;
      var edgeSource = auditText(edge.attributionSource).toLowerCase();
      var structuralEdge = nodeById[edge.fromId] && nodeById[edge.toId]
        && (nodeById[edge.fromId].type === 'audit' || nodeById[edge.fromId].type === 'standard'
          || nodeById[edge.toId].type === 'audit' || nodeById[edge.toId].type === 'standard');
      return requestedSources.indexOf(edgeSource) >= 0 || (keepStructure && structuralEdge);
    });
    var filtered = boundedAlignmentGraph(Object.assign({}, graph, { nodes: visibleNodes, edges: visibleEdges }), opts);
    var sourceCounts = {};
    visibleNodes.forEach(function (node) {
      var source = auditText(node.attributionSource).toLowerCase();
      if (source) sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });
    visibleEdges.forEach(function (edge) {
      var source = auditText(edge.attributionSource).toLowerCase();
      if (source) sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });
    filtered.meta = Object.assign({}, filtered.meta, {
      alignmentView: Object.assign({}, filtered.meta && filtered.meta.alignmentView || {}, {
        filters: { nodeTypes: requestedTypes, attributionSources: requestedSources, query: query, keepStructure: keepStructure },
        visibleNodeTypes: visibleNodes.reduce(function (out, node) { var type = auditText(node.type).toLowerCase() || 'node'; out[type] = (out[type] || 0) + 1; return out; }, {}),
        visibleAttributionSources: sourceCounts
      })
    });
    return {
      ok: true,
      schema: normalized.schema,
      graph: filtered,
      originalGraph: normalized.originalGraph,
      audit: normalized.audit,
      filters: { nodeTypes: requestedTypes, attributionSources: requestedSources, query: query, keepStructure: keepStructure },
      counts: { nodes: filtered.nodes.length, edges: filtered.edges.length },
      outline: deriveOutline(filtered),
      available: { nodeTypes: ALIGNMENT_NODE_TYPES.slice(), attributionSources: ALIGNMENT_ATTRIBUTION_SOURCES.slice() }
    };
  }
  function normalizeGraph(input) {
    if (!input || typeof input !== 'object') return emptyGraph();
    if (input.version === VERSION && Array.isArray(input.nodes)) return input;          // already acg
    if (input.unitLayout) return fromThroughlineUnit(input.unitLayout);                  // a saved unit pack
    if (Array.isArray(input.nodes) && input.nodes.some(function (n) { return n && n.nodeId != null; })) return fromThroughlineUnit(input);
    if (Array.isArray(input.nodes)) return fromConceptMap(input.nodes, input.edges || [], input.structureType);
    if (input.main != null || Array.isArray(input.branches)) return adaptGenerated(input);
    return emptyGraph();
  }

  // ── Semantic-axis Gemini prompt — "AI fills the x/y/z MEANING" ──────
  // The model is weak at raw geometry but strong at ranking nodes on NAMED axes.
  // So we never ask it for pixels: buildSemanticGraphPrompt asks it to SCORE the
  // given nodes (by id) on declared axes; parseSemanticGraph validates+clamps;
  // layoutWithGemini ties them to a callGemini and merges axisValues back onto the
  // graph (project() then turns those into real, interpretable 3D coordinates).
  var DEFAULT_AXES = {
    x: { label: 'Teaching sequence / chronology (taught first -> last)', labelKey: 'concept_graph.axis_teaching_sequence', kind: 'ordinal' },
    y: { label: 'Cognitive depth (concrete/recall -> abstract/create, Bloom)', labelKey: 'concept_graph.axis_cognitive_depth', kind: 'ordinal' },
    z: { label: 'Strand / theme', labelKey: 'concept_graph.axis_strand', kind: 'categorical' }
  };

  function buildSemanticGraphPrompt(graph, opts) {
    opts = opts || {};
    graph = normalizeGraph(graph);
    var axes = opts.axes || (graph.axes && graph.axes.x ? graph.axes : DEFAULT_AXES);
    var strands = [], seen = {};
    graph.nodes.forEach(function (n) { var c = (typeof n.category === 'string' && n.category) ? n.category : null; if (c && !seen[c]) { seen[c] = true; strands.push(c); } });
    var nodeList = graph.nodes.map(function (n) { return '- id "' + n.id + '": ' + (n.label || n.text || n.id); }).join('\n');
    var zLine = strands.length
      ? 'z = one of these strands (assign each node its best fit): ' + JSON.stringify(strands)
      : 'z = a short strand/theme label you choose (reuse the same label for related nodes)';
    return [
      (opts.topic ? 'Topic / unit: ' + opts.topic : ''),
      (opts.gradeLevel ? 'Grade band: ' + opts.gradeLevel : ''),
      'You are arranging a concept map in 3D so that POSITION carries meaning. Do NOT output pixel coordinates.',
      'Score EACH node below on three named axes:',
      '  x = ' + axes.x.label + '  (a number from 0.0 to 1.0)',
      '  y = ' + axes.y.label + '  (a number from 0.0 to 1.0)',
      '  ' + zLine + '.',
      '',
      'Nodes:',
      nodeList,
      '',
      'Rules: include EXACTLY one entry per id above; x and y are normalized 0.0-1.0; never output pixels; z is a short label.',
      'Return ONLY JSON of this shape:',
      '{ "axes": { "x": {"label":"..."}, "y": {"label":"..."}, "z": {"label":"...", "categories":["..."]} },',
      '  "nodes": [ { "id": "<an id above>", "axisValues": { "x": 0.0, "y": 0.0, "z": "<strand>" } } ] }'
    ].filter(Boolean).join('\n');
  }

  function _stripToJson(text) {
    var s = String(text || '').trim();
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    var a = s.indexOf('{'), b = s.lastIndexOf('}');
    if (a >= 0 && b > a) s = s.slice(a, b + 1);
    return s;
  }
  function clamp01(v) { return isNum(v) ? Math.max(0, Math.min(1, v)) : 0; }

  function parseSemanticGraph(text) {
    var out = { axes: null, nodes: [] };
    var parsed;
    try { parsed = JSON.parse(_stripToJson(text)); } catch (e) { return out; }
    if (!parsed || typeof parsed !== 'object') return out;
    if (parsed.axes && typeof parsed.axes === 'object') out.axes = parsed.axes;
    var nodes = Array.isArray(parsed.nodes) ? parsed.nodes : [];
    out.nodes = nodes.map(function (n) {
      if (!n || typeof n.id !== 'string') return null;
      var av = (n.axisValues && typeof n.axisValues === 'object') ? n.axisValues : {};
      var clean = {};
      if (isNum(av.x)) clean.x = clamp01(av.x);
      if (isNum(av.y)) clean.y = clamp01(av.y);
      if (typeof av.z === 'string' && av.z) clean.z = av.z; else if (isNum(av.z)) clean.z = clamp01(av.z);
      return { id: n.id, axisValues: clean };
    }).filter(Boolean);
    return out;
  }

  // Merge AI-scored axisValues onto the graph (does NOT call project — the renderer
  // does). Rejects if callGemini is absent. Returns the merged ConceptGraph.
  function layoutWithGemini(graph, callGemini, opts) {
    graph = normalizeGraph(graph);
    if (typeof callGemini !== 'function') return Promise.reject(new Error('callGemini not available'));
    var prompt = buildSemanticGraphPrompt(graph, opts || {});
    return Promise.resolve(callGemini(prompt)).then(function (res) {
      var text = (typeof res === 'string') ? res : (res && (res.text || res.output || res.response)) || '';
      var parsed = parseSemanticGraph(text);
      var avById = {};
      parsed.nodes.forEach(function (n) { avById[n.id] = n.axisValues; });
      return Object.assign({}, graph, {
        axes: parsed.axes || graph.axes || DEFAULT_AXES,
        nodes: graph.nodes.map(function (n) { return avById[n.id] ? Object.assign({}, n, { axisValues: avById[n.id] }) : n; })
      });
    });
  }

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.ConceptGraphEngine = {
    version: VERSION,
    EDGE_TYPES: EDGE_TYPES,
    DEFAULT_AXES: DEFAULT_AXES,
    emptyGraph: emptyGraph,
    normalizeGraph: normalizeGraph,
    deriveOutline: deriveOutline,
    deriveLanes: deriveLanes,
    project: project,
    extractArrangement: extractArrangement,
    applyArrangement: applyArrangement,
    ensureDefaultAxisValues: ensureDefaultAxisValues,
    applyStructureLayout: applyStructureLayout,
    STRUCTURE_LAYOUT_TYPES: Object.keys(STRUCTURE_LAYOUTS),
    setNodeStrand: setNodeStrand,
    nudgeNodeAxis: nudgeNodeAxis,
    buildStrandChallenge: buildStrandChallenge,
    scoreStrandChallenge: scoreStrandChallenge,
    buildStrandHintPrompt: buildStrandHintPrompt,
    buildNodeMnemonicPrompt: buildNodeMnemonicPrompt,
    parseNodeMnemonics: parseNodeMnemonics,
    fromThroughlineUnit: fromThroughlineUnit,
    toThroughlineUnit: toThroughlineUnit,
    fromConceptMap: fromConceptMap,
    toConceptMap: toConceptMap,
    adaptGenerated: adaptGenerated,
    fromAlignmentAudit: fromAlignmentAudit,
    ALIGNMENT_EXPORT_SCHEMA: ALIGNMENT_EXPORT_SCHEMA,
    ALIGNMENT_IMPORT_LIMITS: Object.assign({}, ALIGNMENT_IMPORT_LIMITS),
    ALIGNMENT_NODE_TYPES: ALIGNMENT_NODE_TYPES.slice(),
    ALIGNMENT_ATTRIBUTION_SOURCES: ALIGNMENT_ATTRIBUTION_SOURCES.slice(),
    normalizeAlignmentGraphExport: normalizeAlignmentGraphExport,
    filterAlignmentGraph: filterAlignmentGraph,
    confirmExplicitAttributions: confirmExplicitAttributions,
    buildSemanticGraphPrompt: buildSemanticGraphPrompt,
    parseSemanticGraph: parseSemanticGraph,
    layoutWithGemini: layoutWithGemini
  };
  console.log('[ConceptGraphEngine] Registered (acg/v1 — shared concept-graph format + spine + adapters)');
})();
