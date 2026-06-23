/**
 * AlloFlow ConceptGraph 3D — orbitable WebGL renderer for the shared acg/v1 format
 *
 * The "epic" render layer on top of concept_graph_engine_module.js: it takes a
 * ConceptGraph, runs it through the engine's project() to turn SEMANTIC axis values
 * into real x/y/z, and draws an orbitable 3D scene (nodes coloured + grouped by
 * strand into depth planes, typed edges, drifting camera). Registers
 * window.AlloModules.ConceptGraph3D.
 *
 * DESIGN RULES (grounded in docs/concept_graph_engine_design.md + the a11y-first ethos):
 *   1. OPTIONAL / default-off: this is a *view*, never the canonical surface.
 *   2. The linear reading spine (engine.deriveOutline) is the ACCESSIBLE SOURCE OF
 *      TRUTH. It is always rendered as an ordered list: screen-reader-only while the
 *      3D canvas is live, and made VISIBLE if anything fails. Keyboard/SR users never
 *      lose the content. Depth is derived FROM semantics, so the geometry and the SR
 *      text share one source.
 *   3. three.js is LAZY-LOADED from a CDN at runtime (no bundler in the Canvas iframe).
 *      Load failure, no-WebGL, or any GL error → graceful fallback to the outline.
 *   4. GL context + requestAnimationFrame are torn down on destroy (no zombie loop —
 *      the repo has hit rAF-leak crash classes before).
 *
 * TESTABLE SEAM: buildScene() is a PURE function (normalize → project → scene model)
 * and is fully unit-tested. The imperative GL mount is wrapped in try/catch and
 * degrades to the outline, so a wrong GL call can never crash the host — but the real
 * 3D render still needs a live Canvas/browser smoke (jsdom has no WebGL).
 *
 * RUNTIME: plain JS; React only needed for the optional <View> wrapper (read lazily
 * from window.React inside View, so buildScene/render work without React).
 */
(function () {
  'use strict';
  if (window.AlloModules && window.AlloModules.ConceptGraph3D) {
    console.log('[ConceptGraph3D] Already loaded, skipping');
    return;
  }

  var VERSION = 'cg3d/1';
  // Strand palette (cool + meaningful: each lane/depth-plane gets a stable colour).
  var PALETTE = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#a855f7', '#84cc16', '#ec4899'];
  var UNCATEGORIZED = '#94a3b8';
  var EDGE_DEFAULT = '#64748b';
  var EDGE_PREREQ = '#d97706';
  var BG = 0x0b1020;
  // A version that still ships a UMD global `THREE` build (no bundler/importmap needed).
  var THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.137.0/build/three.min.js';
  // Optional post-processing bloom addons (UMD examples/js, attach to THREE.*).
  // Load order matters: shaders → EffectComposer(Pass) → passes → UnrealBloomPass.
  var BLOOM_BASE = 'https://cdn.jsdelivr.net/npm/three@0.137.0/examples/js/';
  var BLOOM_FILES = ['shaders/CopyShader.js', 'shaders/LuminosityHighPassShader.js', 'postprocessing/EffectComposer.js', 'postprocessing/RenderPass.js', 'postprocessing/ShaderPass.js', 'postprocessing/UnrealBloomPass.js'];

  function isNum(v) { return typeof v === 'number' && !isNaN(v); }
  function num(v, d) { return isNum(v) ? v : d; }
  var SR_ONLY = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;';

  function engine() { return window.AlloModules && window.AlloModules.ConceptGraphEngine; }

  function computeBounds(nodes) {
    if (!nodes.length) return { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 }, center: { x: 0, y: 0, z: 0 }, radius: 1 };
    var min = { x: Infinity, y: Infinity, z: Infinity }, max = { x: -Infinity, y: -Infinity, z: -Infinity };
    nodes.forEach(function (n) {
      min.x = Math.min(min.x, n.x); min.y = Math.min(min.y, n.y); min.z = Math.min(min.z, n.z);
      max.x = Math.max(max.x, n.x); max.y = Math.max(max.y, n.y); max.z = Math.max(max.z, n.z);
    });
    var center = { x: (min.x + max.x) / 2, y: (min.y + max.y) / 2, z: (min.z + max.z) / 2 };
    var dx = max.x - min.x, dy = max.y - min.y, dz = max.z - min.z;
    return { min: min, max: max, center: center, radius: Math.max(1, 0.5 * Math.sqrt(dx * dx + dy * dy + dz * dz)) };
  }

  // ── buildScene — PURE: ConceptGraph → renderable, centered scene model ──
  function buildScene(graph, opts) {
    opts = opts || {};
    var E = engine();
    var g = E ? E.normalizeGraph(graph) : (graph && typeof graph === 'object' ? graph : { nodes: [], edges: [] });
    var projected = (E && opts.project !== false) ? E.project(g, opts) : g;
    var lanes = E ? E.deriveLanes(projected) : [];
    var outline = E ? E.deriveOutline(projected) : { order: (projected.nodes || []).map(function (n) { return n.id; }), hasCycle: false };

    var laneIndex = {};
    lanes.forEach(function (l) { laneIndex[l.key == null ? '__none' : l.key] = l.index; });

    var nodes = (projected.nodes || []).map(function (n) {
      var cat = (typeof n.category === 'string' && n.category) ? n.category : null;
      var li = laneIndex[cat == null ? '__none' : cat];
      if (li == null) li = 0;
      var imp = isNum(n.importance) ? Math.max(0, Math.min(1, n.importance)) : null;
      return {
        id: n.id, label: n.label || n.text || n.id, type: n.type || 'node',
        x: num(n.x, 0), y: num(n.y, 0), z: num(n.z, 0),
        lane: li, category: cat,
        summary: (typeof n.summary === 'string') ? n.summary : '',
        importance: imp,
        size: imp == null ? 1 : (0.7 + imp * 1.3),   // 0.7..2.0 — visual weight from data
        color: cat == null ? UNCATEGORIZED : PALETTE[li % PALETTE.length]
      };
    });

    var bounds = computeBounds(nodes);
    // Scene space: centre at origin, flip Y so "up" reads up.
    nodes.forEach(function (n) { n.sx = n.x - bounds.center.x; n.sy = -(n.y - bounds.center.y); n.sz = n.z - bounds.center.z; });

    var byId = {}; nodes.forEach(function (n) { byId[n.id] = n; });
    var links = (projected.edges || []).map(function (e) {
      var a = byId[e.fromId], b = byId[e.toId];
      if (!a || !b) return null;
      var ty = e.type || 'associates';
      var prereq = ty === 'prerequisite';
      var directed = ty !== 'associates';     // sequence/prerequisite/cause/elaborates have a direction
      var head = null, dir = null;
      if (directed) {
        var dx = b.sx - a.sx, dy = b.sy - a.sy, dz = b.sz - a.sz;
        var len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        dir = { x: dx / len, y: dy / len, z: dz / len };
        var back = 9 * (b.size || 1) + 6;     // sit the arrowhead just off the target node's surface
        head = { x: b.sx - dir.x * back, y: b.sy - dir.y * back, z: b.sz - dir.z * back };
      }
      return {
        fromId: e.fromId, toId: e.toId, type: ty, directed: directed,
        from: { x: a.sx, y: a.sy, z: a.sz }, to: { x: b.sx, y: b.sy, z: b.sz },
        head: head, dir: dir,
        color: prereq ? EDGE_PREREQ : EDGE_DEFAULT, dashed: prereq
      };
    }).filter(Boolean);

    // One depth plane per lane (makes the z axis legible as stacked "floors").
    var laneZ = {};
    nodes.forEach(function (n) { if (laneZ[n.lane] == null) laneZ[n.lane] = n.sz; });
    var lanePlanes = lanes.map(function (l) {
      return { index: l.index, key: l.key, label: l.label, z: laneZ[l.index] != null ? laneZ[l.index] : 0,
               color: l.key == null ? UNCATEGORIZED : PALETTE[l.index % PALETTE.length] };
    });

    // undirected adjacency (id -> [neighbour ids]) — powers hover neighbour-focus
    var adjacency = {};
    nodes.forEach(function (n) { adjacency[n.id] = []; });
    links.forEach(function (lk) {
      if (adjacency[lk.fromId] && adjacency[lk.fromId].indexOf(lk.toId) < 0) adjacency[lk.fromId].push(lk.toId);
      if (adjacency[lk.toId] && adjacency[lk.toId].indexOf(lk.fromId) < 0) adjacency[lk.toId].push(lk.fromId);
    });

    return { nodes: nodes, links: links, lanes: lanes, lanePlanes: lanePlanes, outline: outline, bounds: bounds, axes: projected.axes || null, adjacency: adjacency };
  }

  function accessibleName(n) {
    return n.label + (n.category ? ' — ' + n.category : '') + (n.type && n.type !== 'node' ? ' (' + n.type + ')' : '');
  }

  // ── Pure a11y / navigation helpers (operate on the buildScene model; unit-tested) ──
  function _tr(t, k, fallback) { try { var v = t && t(k); return (v && v !== k) ? v : fallback; } catch (e) { return fallback; } }

  // Move focus across nodes deterministically. action: next|prev|first|last (teaching
  // order = outline.order) or neighbor-next|neighbor-prev (jump to a connection).
  function navigateFocus(scene, currentId, action) {
    var order = (scene && scene.outline && scene.outline.order) || [];
    if (!order.length) return null;
    if (action === 'first') return order[0];
    if (action === 'last') return order[order.length - 1];
    var i = order.indexOf(currentId);
    if (action === 'next') return i < 0 ? order[0] : order[Math.min(order.length - 1, i + 1)];
    if (action === 'prev') return i < 0 ? order[0] : order[Math.max(0, i - 1)];
    if (action === 'neighbor-next' || action === 'neighbor-prev') {
      var nb = (scene.adjacency && scene.adjacency[currentId]) || [];
      if (!nb.length) return currentId || order[0];
      return action === 'neighbor-next' ? nb[0] : nb[nb.length - 1];
    }
    return currentId || order[0];
  }

  // Screen-reader announcement for a node: label, strand, connection count, and
  // teaching-order position. t() optional (host i18n; English fallbacks).
  function describeNodeForSR(scene, id, t) {
    var n = null, nodes = (scene && scene.nodes) || [];
    for (var i = 0; i < nodes.length; i++) { if (nodes[i].id === id) { n = nodes[i]; break; } }
    if (!n) return '';
    var order = (scene.outline && scene.outline.order) || [];
    var pos = order.indexOf(id);
    var conn = ((scene.adjacency && scene.adjacency[id]) || []).length;
    var parts = [n.label];
    if (n.category) parts.push(_tr(t, 'cg3d.sr_strand', 'strand') + ' ' + n.category);
    parts.push(conn + ' ' + _tr(t, 'cg3d.sr_connections', conn === 1 ? 'connection' : 'connections'));
    if (pos >= 0) parts.push(_tr(t, 'cg3d.sr_step', 'step') + ' ' + (pos + 1) + ' ' + _tr(t, 'cg3d.sr_of', 'of') + ' ' + order.length);
    return parts.join(', ');
  }

  // The prerequisite ladder behind a node: walk edges BACKWARD over prerequisite +
  // sequence ("what must be taught first"). Cycle-safe. Returns {ids, order} excluding
  // the start node; order = discovery order (closest prerequisite first).
  function derivePrereqChain(scene, id) {
    var links = (scene && scene.links) || [];
    var incoming = {};
    links.forEach(function (lk) {
      if (lk.type === 'prerequisite' || lk.type === 'sequence') { (incoming[lk.toId] = incoming[lk.toId] || []).push(lk.fromId); }
    });
    var ids = [], seen = {}; seen[id] = true;
    var queue = [id];
    while (queue.length) {
      var cur = queue.shift();
      (incoming[cur] || []).forEach(function (pid) { if (!seen[pid]) { seen[pid] = true; ids.push(pid); queue.push(pid); } });
    }
    return { ids: ids, order: ids.slice() };
  }

  // ── Accessible outline DOM (the source of truth across every mode) ──
  function buildOutlineDom(scene, t, visible) {
    var wrap = document.createElement('div');
    wrap.style.cssText = visible ? 'color:#e2e8f0;padding:8px 16px;max-height:100%;overflow:auto;' : SR_ONLY;
    var heading = document.createElement('div');
    heading.textContent = t('cg3d.outline_title') || 'Reading order';
    heading.style.cssText = visible ? 'font-weight:800;font-size:13px;margin-bottom:6px;color:#f1f5f9;' : '';
    wrap.appendChild(heading);
    var ol = document.createElement('ol');
    ol.setAttribute('aria-label', t('cg3d.outline_aria') || 'Concept map reading order');
    ol.style.cssText = visible ? 'font-size:13px;line-height:1.6;padding-left:22px;margin:0;' : 'margin:0;';
    scene.outline.order.forEach(function (id) {
      var n = null; for (var i = 0; i < scene.nodes.length; i++) { if (scene.nodes[i].id === id) { n = scene.nodes[i]; break; } }
      var li = document.createElement('li');
      li.textContent = n ? accessibleName(n) : id;
      ol.appendChild(li);
    });
    wrap.appendChild(ol);
    return wrap;
  }

  function isWebGLAvailable() {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }

  // Lazy-load three.js once (dedup across instances); resolves to window.THREE.
  function loadThree(opts) {
    opts = opts || {};
    if (window.THREE) return Promise.resolve(window.THREE);
    if (window.__cg3dThreePromise) return window.__cg3dThreePromise;
    window.__cg3dThreePromise = new Promise(function (resolve, reject) {
      try {
        var s = document.createElement('script');
        s.src = opts.threeUrl || THREE_URL;
        s.async = true;
        s.onload = function () { window.THREE ? resolve(window.THREE) : reject(new Error('three.js loaded but window.THREE missing')); };
        s.onerror = function () { reject(new Error('failed to load three.js')); };
        document.head.appendChild(s);
      } catch (e) { reject(e); }
    });
    return window.__cg3dThreePromise;
  }

  // Sequentially load a script once (dedup by URL). Resolves on load, rejects on error.
  function _cg3dScript(url) {
    return new Promise(function (resolve, reject) {
      try {
        var ex = document.querySelector('script[data-cg3d-src="' + url + '"]');
        if (ex) { if (ex.getAttribute('data-cg3d-done') === '1') return resolve(); ex.addEventListener('load', function () { resolve(); }); ex.addEventListener('error', function () { reject(new Error('x')); }); return; }
        var s = document.createElement('script'); s.src = url; s.async = false; s.setAttribute('data-cg3d-src', url);
        s.onload = function () { s.setAttribute('data-cg3d-done', '1'); resolve(); };
        s.onerror = function () { reject(new Error('load failed: ' + url)); };
        document.head.appendChild(s);
      } catch (e) { reject(e); }
    });
  }
  // Best-effort: load the bloom addon chain in order. NEVER rejects — resolves false
  // if anything is missing, so the renderer cleanly falls back to the fake-glow look.
  function loadBloom(THREE, opts) {
    if (opts && opts.bloom === false) return Promise.resolve(false);
    if (THREE.UnrealBloomPass && THREE.EffectComposer) return Promise.resolve(true);
    var base = (opts && opts.bloomBase) || BLOOM_BASE;
    var p = Promise.resolve();
    BLOOM_FILES.forEach(function (f) { p = p.then(function () { return _cg3dScript(base + f); }); });
    return p.then(function () { return !!(THREE.UnrealBloomPass && THREE.EffectComposer && THREE.RenderPass); }).catch(function () { return false; });
  }

  function makeLabelSprite(THREE, text, hex) {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var font = 26, pad = 10;
    ctx.font = '600 ' + font + 'px sans-serif';
    var tw = Math.ceil(ctx.measureText(text || '').width);
    canvas.width = Math.max(2, tw + pad * 2); canvas.height = font + pad * 2;
    ctx.font = '600 ' + font + 'px sans-serif';
    ctx.fillStyle = 'rgba(15,23,42,0.88)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#3b4252'; ctx.fillRect(0, canvas.height - 4, canvas.width, 4);  // accent underline slot
    ctx.fillStyle = hex || '#ffffff'; ctx.fillRect(0, canvas.height - 4, canvas.width, 4);
    ctx.fillStyle = '#ffffff'; ctx.textBaseline = 'middle'; ctx.fillText(text || '', pad, canvas.height / 2 - 2);
    var tex = new THREE.CanvasTexture(canvas);
    if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    var k = 0.5; sp.scale.set(canvas.width * k, canvas.height * k, 1);
    return sp;
  }

  // Soft additive halo behind a node — fake bloom/glow with zero post-processing deps.
  var _glowTex = null;
  function makeGlowSprite(THREE, hex, scale) {
    if (!_glowTex) {
      var c = document.createElement('canvas'); c.width = c.height = 128;
      var g = c.getContext('2d');
      var grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.22, 'rgba(255,255,255,0.5)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
      _glowTex = new THREE.CanvasTexture(c);
    }
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: _glowTex, color: new THREE.Color(hex || '#ffffff'), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.9 }));
    sp.scale.set(scale, scale, 1);
    return sp;
  }

  // ── Imperative GL mount (wrapped in try/catch by the caller). ──
  function mountGL(holder, THREE, scene, opts, state) {
    var w = holder.clientWidth || 800, hgt = holder.clientHeight || 480;
    var renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, hgt);
    renderer.setClearColor(BG, 1);
    try { renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15; if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding; } catch (e) {}
    holder.appendChild(renderer.domElement);
    state.renderer = renderer;

    var root = new THREE.Scene();
    root.background = new THREE.Color(BG);
    var camera = new THREE.PerspectiveCamera(55, w / hgt, 0.1, 200000);
    // depth fog: distant nodes recede (reads as "less foreground" + looks moody)
    try { root.fog = new THREE.FogExp2(BG, 0.9 / Math.max(200, scene.bounds.radius * 12)); } catch (e) {}
    root.add(new THREE.AmbientLight(0xffffff, 0.55));
    try { root.add(new THREE.HemisphereLight(0xbfd4ff, 0x0b1020, 0.7)); } catch (e) {}
    var dir = new THREE.DirectionalLight(0xffffff, 0.5); dir.position.set(1, 1.3, 1.4); root.add(dir);
    var rim = new THREE.DirectionalLight(0x6366f1, 0.35); rim.position.set(-1.2, -0.6, -1); root.add(rim);
    var group = new THREE.Group(); root.add(group);

    // sparse starfield backdrop — a "concept galaxy" (pure Points, no deps)
    var stars = null;
    try {
      var SN = 500, sp3 = new Float32Array(SN * 3), sr = Math.max(300, scene.bounds.radius);
      for (var si = 0; si < SN; si++) {
        var rr = sr * (6 + Math.random() * 12), th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
        sp3[si * 3] = rr * Math.sin(ph) * Math.cos(th); sp3[si * 3 + 1] = rr * Math.sin(ph) * Math.sin(th); sp3[si * 3 + 2] = rr * Math.cos(ph);
      }
      var sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp3, 3));
      stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0x93c5fd, size: Math.max(1.5, sr * 0.05), sizeAttenuation: true, transparent: true, opacity: 0.5, depthWrite: false }));
      root.add(stars);
    } catch (e) {}

    var spanX = Math.max(1, scene.bounds.max.x - scene.bounds.min.x);
    var spanY = Math.max(1, scene.bounds.max.y - scene.bounds.min.y);
    var planeW = spanX * 1.3 + 240, planeH = spanY * 1.3 + 240;
    (scene.lanePlanes || []).forEach(function (lp) {
      var mesh = new THREE.Mesh(new THREE.PlaneGeometry(planeW, planeH),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(lp.color), transparent: true, opacity: 0.07, side: THREE.DoubleSide }));
      mesh.position.set(0, 0, lp.z);   // depth plane at constant z
      group.add(mesh);
      if (lp.label) { var tag = makeLabelSprite(THREE, lp.label, lp.color); tag.position.set(-planeW / 2 + 60, planeH / 2 - 40, lp.z); group.add(tag); }
    });

    var nodeMeshes = [], nodeById3d = {};
    scene.nodes.forEach(function (n) {
      var rad = 9 * (n.size || 1);
      var col = new THREE.Color(n.color);
      var sphere = new THREE.Mesh(new THREE.SphereGeometry(rad, 20, 20),
        new THREE.MeshStandardMaterial({ color: col, emissive: col.clone().multiplyScalar(0.5), emissiveIntensity: 0.7, roughness: 0.4, metalness: 0.15, transparent: true, opacity: 1 }));
      sphere.position.set(n.sx, n.sy, n.sz); sphere.userData.nodeId = n.id; group.add(sphere);
      var glow = makeGlowSprite(THREE, n.color, rad * 6);   // soft additive halo (fake bloom)
      glow.position.set(n.sx, n.sy, n.sz); group.add(glow);
      var label = makeLabelSprite(THREE, n.label, n.color);
      label.position.set(n.sx, n.sy + rad + 14, n.sz); group.add(label);
      var ref = { node: n, sphere: sphere, glow: glow, label: label, baseGlow: rad * 6, baseEmissive: 0.7 };
      nodeMeshes.push(ref); nodeById3d[n.id] = ref;
    });

    var nodeColorById = {}; scene.nodes.forEach(function (n) { nodeColorById[n.id] = n.color; });
    var flowMats = [], edgeObjs = [];
    scene.links.forEach(function (lk) {
      var a = new THREE.Vector3(lk.from.x, lk.from.y, lk.from.z);
      var b = new THREE.Vector3(lk.to.x, lk.to.y, lk.to.z);
      var mid = a.clone().add(b).multiplyScalar(0.5);
      mid.y += a.distanceTo(b) * 0.14;                       // gentle arc instead of a flat line
      var pts = new THREE.QuadraticBezierCurve3(a, mid, b).getPoints(26);
      var geo = new THREE.BufferGeometry().setFromPoints(pts);
      var isSeq = lk.type === 'sequence';
      var isPrereq = !!lk.dashed;
      var mat;
      if (isPrereq) {                                        // keep prerequisites a clear, single amber
        mat = new THREE.LineDashedMaterial({ color: new THREE.Color(lk.color), dashSize: 6, gapSize: 5, transparent: true, opacity: 0.9 });
      } else {                                               // gradient blending the two endpoint strand colours
        var c0 = new THREE.Color(nodeColorById[lk.fromId] || lk.color), c1 = new THREE.Color(nodeColorById[lk.toId] || lk.color);
        var cattr = new Float32Array(pts.length * 3);
        for (var pi = 0; pi < pts.length; pi++) { var f = pi / (pts.length - 1); var cc = c0.clone().lerp(c1, f); cattr[pi * 3] = cc.r; cattr[pi * 3 + 1] = cc.g; cattr[pi * 3 + 2] = cc.b; }
        geo.setAttribute('color', new THREE.BufferAttribute(cattr, 3));
        mat = isSeq
          ? new THREE.LineDashedMaterial({ vertexColors: true, dashSize: 10, gapSize: 8, transparent: true, opacity: 0.78 })
          : new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55 });
      }
      var line = new THREE.Line(geo, mat);
      line.computeLineDistances();
      group.add(line);
      if (isSeq) flowMats.push(mat);                         // animate teaching-order flow in tick
      edgeObjs.push({ mat: mat, fromId: lk.fromId, toId: lk.toId, baseOpacity: mat.opacity });
      // directional arrowhead — edges carry direction (fromId->toId); show it statically
      if (lk.directed && lk.head && lk.dir) {
        try {
          var cone = new THREE.Mesh(new THREE.ConeGeometry(4, 9.6, 12),
            new THREE.MeshBasicMaterial({ color: new THREE.Color(lk.color), transparent: true, opacity: 0.9 }));
          cone.position.set(lk.head.x, lk.head.y, lk.head.z);
          var d = new THREE.Vector3(lk.dir.x, lk.dir.y, lk.dir.z);
          cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), Math.abs(d.y) > 0.9999 ? new THREE.Vector3(0, d.y >= 0 ? 1 : -1, 0) : d);
          group.add(cone);
          edgeObjs.push({ mat: cone.material, fromId: lk.fromId, toId: lk.toId, baseOpacity: 0.9 });
        } catch (e) {}
      }
    });

    // Self-contained orbit with damping (no 2nd CDN dep). `current` eases toward
    // `target`; starting at a larger radius gives a cinematic ease-in for free.
    var reduce = false; try { reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    var finalR = Math.max(140, scene.bounds.radius * 2.4);
    var tTheta = Math.PI * 0.25, tPhi = Math.PI * 0.34, tRadius = finalR;
    var theta = tTheta, phi = tPhi, radius = reduce ? finalR : finalR * 2.6;   // ease-in start
    var target = new THREE.Vector3(0, 0, 0);
    function applyCamera() {
      var sp = Math.sin(phi);
      camera.position.set(target.x + radius * sp * Math.sin(theta), target.y + radius * Math.cos(phi), target.z + radius * sp * Math.cos(theta));
      camera.lookAt(target);
    }
    applyCamera();

    var t = (opts && opts.t) || function (k) { return k; };
    var tTarget = target.clone();                 // camera focus point (eased toward in tick)

    // ── Hover highlight + neighbour focus + tooltip (raycaster) ──
    var raycaster = new THREE.Raycaster();
    var ndc = new THREE.Vector2();
    var hoveredId = null;
    var spheres = nodeMeshes.map(function (m) { return m.sphere; });
    function pickNode(ev) {
      var r = el.getBoundingClientRect();
      ndc.x = ((ev.clientX - r.left) / Math.max(1, r.width)) * 2 - 1;
      ndc.y = -((ev.clientY - r.top) / Math.max(1, r.height)) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      var hits = raycaster.intersectObjects(spheres, false);
      return hits.length ? hits[0].object.userData.nodeId : null;
    }
    function setKeep(keep, hotId) {   // keep: map of kept ids (null = keep all)
      nodeMeshes.forEach(function (m) {
        var on = !keep || keep[m.node.id], isHot = hotId && m.node.id === hotId;
        m.sphere.material.opacity = on ? 1 : 0.16;
        m.sphere.material.emissiveIntensity = isHot ? 1.5 : m.baseEmissive * (on ? 1 : 0.4);
        m.glow.material.opacity = on ? (isHot ? 1 : 0.85) : 0.1;
        var gs = m.baseGlow * (isHot ? 1.55 : 1); m.glow.scale.set(gs, gs, 1);
        m.label.material.opacity = on ? 1 : 0.1;
      });
      edgeObjs.forEach(function (eo) {
        var inc = !keep || eo.fromId === hotId || eo.toId === hotId || (keep[eo.fromId] && keep[eo.toId]);
        eo.mat.opacity = inc ? eo.baseOpacity : 0.04;
      });
    }
    function applyHighlight(id) {
      var keep = null;
      if (id) { keep = {}; keep[id] = 1; (scene.adjacency[id] || []).forEach(function (nid) { keep[nid] = 1; }); }
      setKeep(keep, id);
    }
    function highlightChain(ids, hotId) {   // path/prereq highlight: keep an explicit set
      var keep = {}; (ids || []).forEach(function (i) { keep[i] = 1; });
      setKeep(keep, hotId);
    }
    var tip = document.createElement('div');
    tip.style.cssText = 'position:absolute;pointer-events:none;z-index:6;background:rgba(2,6,23,0.92);color:#e2e8f0;border:1px solid #334155;border-radius:8px;padding:6px 10px;font-size:12px;max-width:240px;display:none;box-shadow:0 6px 18px rgba(0,0,0,0.45);';
    holder.appendChild(tip);
    function showTip(node, ev) {
      tip.innerHTML = '';
      var ti = document.createElement('div'); ti.style.cssText = 'font-weight:800;margin-bottom:2px;'; ti.textContent = node.label; tip.appendChild(ti);
      if (node.category) { var s = document.createElement('div'); s.style.cssText = 'color:#94a3b8;'; s.textContent = (t('cg3d.tip_strand') || 'Strand') + ': ' + node.category; tip.appendChild(s); }
      var nb = (scene.adjacency[node.id] || []).length;
      var c = document.createElement('div'); c.style.cssText = 'color:#94a3b8;'; c.textContent = nb + ' ' + (t('cg3d.tip_links') || 'connection(s)'); tip.appendChild(c);
      var r = el.getBoundingClientRect();
      tip.style.left = (ev.clientX - r.left + 14) + 'px'; tip.style.top = (ev.clientY - r.top + 14) + 'px'; tip.style.display = 'block';
      el.style.cursor = 'pointer';
    }
    function hideTip() { tip.style.display = 'none'; el.style.cursor = 'grab'; }

    // ── Selection + detail panel (click a node) ──
    var selectedId = null;
    var panel = document.createElement('div');
    panel.style.cssText = 'position:absolute;top:12px;right:12px;z-index:6;width:230px;max-height:72%;overflow:auto;background:rgba(2,6,23,0.92);border:1px solid #334155;border-radius:10px;padding:12px;color:#e2e8f0;font-size:12px;display:none;box-shadow:0 10px 28px rgba(0,0,0,0.5);';
    holder.appendChild(panel);
    function selectNode(id) {
      selectedId = id || null;
      applyHighlight(hoveredId || selectedId);
      if (!selectedId || !nodeById3d[selectedId]) { panel.style.display = 'none'; return; }
      var n = nodeById3d[selectedId].node;
      panel.innerHTML = '';
      var close = document.createElement('button'); close.textContent = '✕'; close.setAttribute('aria-label', t('common.close') || 'Close');
      close.style.cssText = 'float:right;border:none;background:transparent;color:#94a3b8;cursor:pointer;font-size:15px;line-height:1;';
      close.onclick = function () { selectNode(null); };
      panel.appendChild(close);
      var ti = document.createElement('div'); ti.style.cssText = 'font-weight:800;font-size:13px;margin-bottom:4px;padding-right:18px;'; ti.textContent = n.label; panel.appendChild(ti);
      if (n.category) { var st = document.createElement('div'); st.style.cssText = 'color:' + n.color + ';font-weight:700;margin-bottom:5px;'; st.textContent = n.category; panel.appendChild(st); }
      if (n.summary) { var sm = document.createElement('div'); sm.style.cssText = 'color:#cbd5e1;margin-bottom:6px;line-height:1.45;'; sm.textContent = n.summary; panel.appendChild(sm); }
      var neigh = scene.adjacency[selectedId] || [];
      if (neigh.length) {
        var nh = document.createElement('div'); nh.style.cssText = 'font-weight:700;color:#94a3b8;margin:6px 0 2px;'; nh.textContent = (t('cg3d.connections') || 'Connections') + ' (' + neigh.length + ')'; panel.appendChild(nh);
        neigh.forEach(function (nid) {
          if (!nodeById3d[nid]) return;
          var b = document.createElement('button'); b.textContent = '• ' + nodeById3d[nid].node.label;
          b.style.cssText = 'display:block;width:100%;text-align:left;border:none;background:transparent;color:#a5b4fc;cursor:pointer;padding:2px 0;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
          b.onclick = function () { var tn = nodeById3d[nid].node; tTarget.set(tn.sx, tn.sy, tn.sz); selectNode(nid); };
          panel.appendChild(b);
        });
      }
      var chain = derivePrereqChain(scene, selectedId);
      if (chain.ids.length) {
        var pb = document.createElement('button'); pb.textContent = '⛓ ' + (t('cg3d.show_prereqs') || 'Show prerequisites') + ' (' + chain.ids.length + ')';
        pb.style.cssText = 'margin-top:8px;width:100%;padding:6px;border:1px solid #d97706;background:#3b2a12;color:#fde68a;border-radius:7px;cursor:pointer;font-weight:700;';
        pb.onclick = function () { highlightChain([selectedId].concat(chain.ids), selectedId); };
        panel.appendChild(pb);
      }
      if (typeof opts.onOpenNode === 'function') {
        var jb = document.createElement('button'); jb.textContent = '↗ ' + (t('cg3d.open') || 'Open');
        jb.style.cssText = 'margin-top:9px;width:100%;padding:6px;border:1px solid #6366f1;background:#312e81;color:#e0e7ff;border-radius:7px;cursor:pointer;font-weight:700;';
        jb.onclick = function () { try { opts.onOpenNode(selectedId); } catch (e) {} };
        panel.appendChild(jb);
      }
      panel.style.display = 'block';
    }

    // ── Orbit + hover + click-to-focus ──
    var dragging = false, moved = false, lx = 0, ly = 0;
    var el = renderer.domElement;
    el.style.cursor = 'grab';
    function onDown(e) { dragging = true; moved = false; lx = e.clientX; ly = e.clientY; el.style.cursor = 'grabbing'; }
    function onMove(e) {
      if (dragging) {
        var dx = e.clientX - lx, dy = e.clientY - ly;
        if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
        tTheta -= dx * 0.005; tPhi -= dy * 0.005; tPhi = Math.max(0.12, Math.min(Math.PI - 0.12, tPhi)); lx = e.clientX; ly = e.clientY;
      } else {
        try { var id = pickNode(e); if (id !== hoveredId) { hoveredId = id; applyHighlight(hoveredId || selectedId); } if (id && nodeById3d[id]) showTip(nodeById3d[id].node, e); else hideTip(); } catch (er) {}
      }
    }
    function onUp(e) {
      if (dragging && !moved) {                   // a click (not a drag) → select + focus
        try {
          var id = pickNode(e);
          if (id && nodeById3d[id]) { var nn = nodeById3d[id].node; tTarget.set(nn.sx, nn.sy, nn.sz); tRadius = Math.max(60, scene.bounds.radius * 1.2); selectNode(id); }
          else { selectNode(null); }
        } catch (er) {}
      }
      dragging = false; el.style.cursor = 'grab';
    }
    function onWheel(e) { e.preventDefault(); tRadius *= (1 + (e.deltaY > 0 ? 1 : -1) * 0.08); tRadius = Math.max(40, Math.min(scene.bounds.radius * 14 + 600, tRadius)); }
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    el.addEventListener('wheel', onWheel, { passive: false });

    // ── Legend overlay (ties colour/axes/edges to MEANING) ──
    var legend = document.createElement('div');
    legend.style.cssText = 'position:absolute;left:12px;bottom:12px;z-index:6;background:rgba(2,6,23,0.78);border:1px solid #1e293b;border-radius:10px;padding:8px 11px;font-size:11px;color:#cbd5e1;max-width:240px;line-height:1.5;';
    (function () {
      var strands = (scene.lanes || []).filter(function (l) { return l.key != null; });
      if (strands.length) {
        var sh = document.createElement('div'); sh.style.cssText = 'font-weight:800;color:#f1f5f9;margin-bottom:3px;'; sh.textContent = t('cg3d.legend_strands') || 'Strands (depth)'; legend.appendChild(sh);
        strands.forEach(function (l) {
          var row = document.createElement('div'); row.style.cssText = 'display:flex;align-items:center;gap:6px;';
          var sw = document.createElement('span'); sw.style.cssText = 'display:inline-block;width:10px;height:10px;border-radius:50%;flex:0 0 auto;background:' + PALETTE[l.index % PALETTE.length] + ';';
          var lb = document.createElement('span'); lb.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;'; lb.textContent = l.label;
          row.appendChild(sw); row.appendChild(lb); legend.appendChild(row);
        });
      }
      if (scene.axes) {
        var ah = document.createElement('div'); ah.style.cssText = 'font-weight:800;color:#f1f5f9;margin:6px 0 3px;'; ah.textContent = t('cg3d.legend_axes') || 'Axes'; legend.appendChild(ah);
        ['x', 'y', 'z'].forEach(function (ax) { if (scene.axes[ax] && scene.axes[ax].label) { var d = document.createElement('div'); d.style.cssText = 'color:#94a3b8;'; d.textContent = ax + ' = ' + scene.axes[ax].label; legend.appendChild(d); } });
      }
      var ek = document.createElement('div'); ek.style.cssText = 'margin-top:6px;color:#94a3b8;';
      ek.textContent = t('cg3d.legend_help') || 'Flowing line = teaching order · dashed amber = prerequisite. Hover to focus · click a node to center.';
      legend.appendChild(ek);
    })();
    holder.appendChild(legend);

    // ── Reset / fit-view button ──
    var resetBtn = document.createElement('button');
    resetBtn.textContent = '⊙ ' + (t('cg3d.reset') || 'Reset view');
    resetBtn.style.cssText = 'position:absolute;top:12px;left:12px;z-index:6;background:rgba(2,6,23,0.8);border:1px solid #334155;color:#cbd5e1;border-radius:8px;padding:5px 10px;font-size:12px;font-weight:700;cursor:pointer;';
    resetBtn.onclick = function () { tTarget.set(0, 0, 0); tTheta = Math.PI * 0.25; tPhi = Math.PI * 0.34; tRadius = finalR; selectNode(null); };
    holder.appendChild(resetBtn);

    // ── Orientation gizmo (corner xyz, drawn as a 2nd scissor viewport) ──
    var cw = w, ch = hgt, gizmoScene = null, gizmoCam = null;
    try {
      gizmoScene = new THREE.Scene();
      gizmoCam = new THREE.OrthographicCamera(-1.6, 1.6, 1.6, -1.6, 0.1, 100);
      gizmoScene.add(new THREE.AxesHelper(1.2));   // x=red y=green z=blue
      [['x', '#ef4444', 0], ['y', '#22c55e', 1], ['z', '#3b82f6', 2]].forEach(function (a) {
        var s = makeLabelSprite(THREE, a[0], a[1]); s.scale.multiplyScalar(0.014);
        s.position.set(a[2] === 0 ? 1.45 : 0, a[2] === 1 ? 1.45 : 0, a[2] === 2 ? 1.45 : 0);
        gizmoScene.add(s);
      });
    } catch (e) { gizmoScene = null; }

    // ── Optional REAL bloom (UnrealBloom) if the addons loaded; else the fake glow ──
    var composer = null;
    try {
      if (THREE.EffectComposer && THREE.RenderPass && THREE.UnrealBloomPass) {
        composer = new THREE.EffectComposer(renderer);
        composer.addPass(new THREE.RenderPass(root, camera));
        composer.addPass(new THREE.UnrealBloomPass(new THREE.Vector2(w, hgt), 0.6, 0.55, 0.82)); // strength, radius, threshold
        composer.setSize(w, hgt);
      }
    } catch (e) { composer = null; }

    // ── Keyboard + screen-reader operability of the 3D canvas itself ──
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'application');
    el.setAttribute('aria-roledescription', _tr(t, 'cg3d.canvas_role', 'Interactive 3D concept map'));
    el.setAttribute('aria-label', _tr(t, 'cg3d.canvas_label', '3D concept map. Use arrow keys to move through lessons in teaching order.'));
    var instrId = 'cg3d-instr-' + (window.__cg3dSeq = (window.__cg3dSeq || 0) + 1);
    var instr = document.createElement('p'); instr.id = instrId; instr.style.cssText = SR_ONLY;
    instr.textContent = _tr(t, 'cg3d.canvas_instructions', 'Arrow keys move through lessons in teaching order. N jumps to a connection. Enter opens the focused lesson. Escape deselects.');
    var live = document.createElement('div'); live.setAttribute('aria-live', 'polite'); live.setAttribute('role', 'status'); live.style.cssText = SR_ONLY;
    holder.appendChild(instr); holder.appendChild(live);
    el.setAttribute('aria-describedby', instrId);
    // visual chrome is conveyed via the live region + the linear outline — hide from AT to avoid double-speak
    [legend, panel, tip, resetBtn].forEach(function (nd) { try { nd.setAttribute('aria-hidden', 'true'); } catch (e) {} });
    var kbFocusId = null;
    function kbFocus(id) {
      if (!id || !nodeById3d[id]) return;
      kbFocusId = id; var n = nodeById3d[id].node;
      selectNode(id); tTarget.set(n.sx, n.sy, n.sz);
      try { if (live) live.textContent = describeNodeForSR(scene, id, t); } catch (e) {}
    }
    function onKeyDown(e) {
      var k = e.key, act = null;
      if (k === 'ArrowRight' || k === 'ArrowDown') act = 'next';
      else if (k === 'ArrowLeft' || k === 'ArrowUp') act = 'prev';
      else if (k === 'Home') act = 'first';
      else if (k === 'End') act = 'last';
      else if (k === 'n' || k === 'N') act = 'neighbor-next';
      else if (k === 'Enter') { if (kbFocusId && typeof opts.onOpenNode === 'function') { e.preventDefault(); opts.onOpenNode(kbFocusId); } return; }
      else if (k === 'Escape') { kbFocusId = null; selectNode(null); if (live) live.textContent = ''; return; }
      else return;
      e.preventDefault();
      var nx = navigateFocus(scene, kbFocusId, act);
      if (nx) kbFocus(nx);
    }
    el.addEventListener('keydown', onKeyDown);

    state.cleanup.push(function () {
      el.removeEventListener('pointerdown', onDown); window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp); el.removeEventListener('wheel', onWheel);
      el.removeEventListener('keydown', onKeyDown);
      try { if (tip.parentNode) tip.parentNode.removeChild(tip); } catch (e) {}
      try { if (legend.parentNode) legend.parentNode.removeChild(legend); } catch (e) {}
      try { if (panel.parentNode) panel.parentNode.removeChild(panel); } catch (e) {}
      try { if (resetBtn.parentNode) resetBtn.parentNode.removeChild(resetBtn); } catch (e) {}
      try { if (instr.parentNode) instr.parentNode.removeChild(instr); } catch (e) {}
      try { if (live.parentNode) live.parentNode.removeChild(live); } catch (e) {}
      try { if (composer && composer.dispose) composer.dispose(); } catch (e) {}
    });

    function tick() {
      if (state.disposed) return;
      if (!dragging && !reduce && opts.autoRotate !== false) tTheta += 0.0016;
      theta += (tTheta - theta) * 0.12;          // damping toward targets
      phi += (tPhi - phi) * 0.12;
      radius += (tRadius - radius) * 0.08;
      target.lerp(tTarget, 0.1);                 // ease the focus point (click-to-focus)
      applyCamera();
      if (!reduce) {
        for (var fi = 0; fi < flowMats.length; fi++) { flowMats[fi].dashOffset = (flowMats[fi].dashOffset || 0) - 0.4; }   // teaching-order flow
        if (stars) stars.rotation.y += 0.0003;
      }
      if (composer) composer.render(); else renderer.render(root, camera);
      if (gizmoScene) {
        try {
          var GS = 84, pad = 12;
          renderer.setScissorTest(true);
          renderer.setViewport(cw - GS - pad, pad, GS, GS);
          renderer.setScissor(cw - GS - pad, pad, GS, GS);
          renderer.autoClear = false; renderer.clearDepth();
          gizmoCam.position.copy(camera.position).sub(target).normalize().multiplyScalar(4);
          gizmoCam.up.copy(camera.up); gizmoCam.lookAt(0, 0, 0);
          renderer.render(gizmoScene, gizmoCam);
          renderer.autoClear = true;
          renderer.setViewport(0, 0, cw, ch); renderer.setScissor(0, 0, cw, ch); renderer.setScissorTest(false);
        } catch (e) {}
      }
      state.raf = (window.requestAnimationFrame || function () { return 0; })(tick);
    }
    tick();

    state.onResize = function () {
      var W = holder.clientWidth || w, H = holder.clientHeight || hgt;
      cw = W; ch = H;
      camera.aspect = W / H; camera.updateProjectionMatrix(); renderer.setSize(W, H);
      if (composer && composer.setSize) composer.setSize(W, H);
    };
    window.addEventListener('resize', state.onResize);
  }

  // ── render — public imperative API. Returns { destroy, update, fellBack }. ──
  function render(container, graph, opts) {
    opts = opts || {};
    var t = opts.t || function (k) { return k; };
    if (!container) return { destroy: function () {}, update: function () {}, fellBack: true };
    var scene = buildScene(graph, opts);
    while (container.firstChild) container.removeChild(container.firstChild);

    var outlineEl = buildOutlineDom(scene, t, false);   // sr-only while 3D is live
    container.appendChild(outlineEl);

    var state = { raf: 0, renderer: null, disposed: false, onResize: null, cleanup: [] };
    function destroy() {
      state.disposed = true;
      if (state.raf) { try { (window.cancelAnimationFrame || function () {})(state.raf); } catch (e) {} state.raf = 0; }
      if (state.onResize) { try { window.removeEventListener('resize', state.onResize); } catch (e) {} state.onResize = null; }
      state.cleanup.forEach(function (fn) { try { fn(); } catch (e) {} });
      state.cleanup = [];
      if (state.renderer) {
        try { state.renderer.dispose(); } catch (e) {}
        try { var dom = state.renderer.domElement; if (dom && dom.parentNode) dom.parentNode.removeChild(dom); } catch (e) {}
        state.renderer = null;
      }
    }
    function showFallback(msg) {
      outlineEl.style.cssText = 'color:#e2e8f0;padding:8px 16px;max-height:100%;overflow:auto;'; // un-hide the outline
      var note = document.createElement('div');
      note.setAttribute('role', 'status');
      note.textContent = msg;
      note.style.cssText = 'font-size:12px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:6px 10px;margin:8px;';
      container.insertBefore(note, outlineEl);
    }

    if (!isWebGLAvailable()) {
      showFallback(t('cg3d.no_webgl') || 'This browser cannot show the 3D view. Showing the reading-order outline instead.');
      return { destroy: destroy, update: function () {}, fellBack: true };
    }

    var holder = document.createElement('div');
    // NOT aria-hidden: the canvas is a focusable role=application widget with its own
    // aria-live announcer; decorative chrome inside is individually aria-hidden in mountGL.
    holder.style.cssText = 'position:absolute;inset:0;';
    container.appendChild(holder);

    loadThree(opts).then(function (THREE) {
      if (state.disposed) return null;
      return loadBloom(THREE, opts).then(function () { return THREE; });   // best-effort; never blocks
    }).then(function (THREE) {
      if (!THREE || state.disposed) return;
      try { mountGL(holder, THREE, scene, opts, state); }
      catch (e) { console.warn('[ConceptGraph3D] GL mount failed:', e && e.message); showFallback(t('cg3d.gl_error') || 'The 3D view could not start. Showing the reading-order outline instead.'); }
    }).catch(function (e) {
      if (state.disposed) return;
      console.warn('[ConceptGraph3D] three.js load failed:', e && e.message);
      showFallback(t('cg3d.load_error') || 'The 3D library could not load. Showing the reading-order outline instead.');
    });

    return { destroy: destroy, update: function () {}, fellBack: false };
  }

  // ── Optional React wrapper (lifecycle-managed). React read lazily. ──
  function View(props) {
    var React = window.React;
    if (!React) return null;
    var h = React.createElement;
    var t = props.t || function (k) { return k; };
    var ref = React.useRef(null);
    var handle = React.useRef(null);
    React.useEffect(function () {
      if (!ref.current) return function () {};
      handle.current = render(ref.current, props.graph, Object.assign({ t: t, onOpenNode: props.onOpenNode }, props.options || {}));
      return function () { if (handle.current && handle.current.destroy) handle.current.destroy(); handle.current = null; };
    }, [props.graph]); // eslint-disable-line
    // SSR / pre-effect placeholder: the accessible outline, so there is real content
    // before (or without) JS; render() replaces it on the client.
    var scene = buildScene(props.graph, props.options || {});
    return h('div', { style: { position: 'relative', width: '100%', height: props.height || '100%', minHeight: 320, background: '#0b1020', borderRadius: 12, overflow: 'hidden' } },
      h('div', { ref: ref, style: { position: 'absolute', inset: 0 } },
        h('ol', { 'aria-label': t('cg3d.outline_aria') || 'Concept map reading order', style: { color: '#cbd5e1', fontSize: 13, lineHeight: 1.6, padding: '12px 20px 12px 38px', margin: 0 } },
          scene.outline.order.map(function (id) {
            var n = null; for (var i = 0; i < scene.nodes.length; i++) { if (scene.nodes[i].id === id) { n = scene.nodes[i]; break; } }
            return h('li', { key: id }, n ? accessibleName(n) : id);
          })
        )
      )
    );
  }

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.ConceptGraph3D = {
    version: VERSION,
    PALETTE: PALETTE,
    buildScene: buildScene,
    navigateFocus: navigateFocus,
    describeNodeForSR: describeNodeForSR,
    derivePrereqChain: derivePrereqChain,
    isWebGLAvailable: isWebGLAvailable,
    loadThree: loadThree,
    render: render,
    View: View
  };
  console.log('[ConceptGraph3D] Registered (orbitable WebGL renderer for acg/v1; lazy three.js, outline fallback)');
})();
