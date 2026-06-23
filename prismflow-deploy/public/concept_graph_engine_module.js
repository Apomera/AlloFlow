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
  var EDGE_TYPES = { sequence: 1, prerequisite: 1, cause: 1, contrast: 1, elaborates: 1, associates: 1 };

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
    if (hasUngrouped || lanes.length === 0) lanes.push({ key: null, label: 'Ungrouped', index: lanes.length });
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
        g.nodes.push({ id: iid, label: String(it), type: 'item', x: 0, y: 0, z: 0, category: title });
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

  // ── normalizeGraph — accept any known shape → acg (idempotent) ───────
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
    x: { label: 'Teaching sequence / chronology (taught first -> last)', kind: 'ordinal' },
    y: { label: 'Cognitive depth (concrete/recall -> abstract/create, Bloom)', kind: 'ordinal' },
    z: { label: 'Strand / theme', kind: 'categorical' }
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
    fromThroughlineUnit: fromThroughlineUnit,
    toThroughlineUnit: toThroughlineUnit,
    fromConceptMap: fromConceptMap,
    toConceptMap: toConceptMap,
    adaptGenerated: adaptGenerated,
    buildSemanticGraphPrompt: buildSemanticGraphPrompt,
    parseSemanticGraph: parseSemanticGraph,
    layoutWithGemini: layoutWithGemini
  };
  console.log('[ConceptGraphEngine] Registered (acg/v1 — shared concept-graph format + spine + adapters)');
})();
