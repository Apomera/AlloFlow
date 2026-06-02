// ═══════════════════════════════════════════════════════════════════════
// stem_tool_arccity.js — Arc City (Phase 1: Line District → Arc Heights)
// ═══════════════════════════════════════════════════════════════════════
// A cooperative, turn-based math game where THE FUNCTION IS THE WEAPON.
// You author a function whose light-beam threads gates, clears walls, and
// reaches dark "nodes" to re-light a neon city. Full design: docs/arc_city_design.md.
//
// Phase 1 ships a 3-level progression across two function families:
//   L1 "First Light"   — line y=mx+b, slope-only (b locked: the isolation on-ramp)
//   L2 "Cross-Street"  — line y=mx+b, slope + intercept through a window
//   L3 "Clear the Wall"— parabola y=a(x-h)²+k, arc over a wall through a gate
// Worlds unlock on COMPLETION (design §5.1) — never on a "clean" solve, which
// protects productive failure. A proactive hint appears after repeated misses.
//
// Design invariants honored:
//   - Parameter-space aiming (sliders + buttons + arrow keys); NO mandatory drag.
//   - Orthographic SVG only (zero shear); no Three.js; no `new Function`
//     (every family is a typed lambda — sidesteps the eval gate).
//   - All state in ctx.toolData._arccity (no React hooks → no host hook-order
//     risk); render wrapped in try/catch returning a VISIBLE fallback (never null).
//   - Pure game logic is DOM-free and exported for the golden-master test.
// ═══════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ══════════════════════════════════════════════════════════════════════
  // PURE GAME LOGIC — no DOM, no window. Node-requirable for tests.
  // ══════════════════════════════════════════════════════════════════════

  var LEVELS = [
    {
      id: 'L1', title: 'First Light', family: 'line',
      world: { x0: 0, x1: 10, y0: 0, y1: 8 },
      walls: [], gates: [], node: { x: 8, y: 4, r: 0.5 }, dx: 0.05,
      paramOrder: ['m', 'b'],
      params: {
        m: { min: -1, max: 2, step: 0.05, default: 0.1, label: 'm  (slope — your aim)' },
        b: { min: 0, max: 8, step: 0.5, default: 0, locked: true, label: 'b  (start height — locked here)' }
      },
      hint: 'Tip: this beam starts at the origin (b is locked at 0). Raise the slope m until the beam climbs to meet the node.'
    },
    {
      id: 'L2', title: 'Cross-Street', family: 'line',
      world: { x0: 0, x1: 10, y0: 0, y1: 8 },
      walls: [], gates: [{ x: 4, lo: 3, hi: 5 }], node: { x: 9, y: 2, r: 0.5 }, dx: 0.05,
      paramOrder: ['m', 'b'],
      params: {
        m: { min: -1.5, max: 1.5, step: 0.05, default: 0, label: 'm  (slope)' },
        b: { min: 0, max: 8, step: 0.5, default: 1, label: 'b  (start height)' }
      },
      hint: 'Tip: a line has two knobs. Use b to set where the beam starts, and m to angle it down through the window and onto the node.'
    },
    {
      id: 'L3', title: 'Clear the Wall', family: 'parabola',
      world: { x0: 0, x1: 10, y0: 0, y1: 8 },
      walls: [{ x: 5, height: 4 }], gates: [{ x: 6.5, lo: 3.4, hi: 4.3 }], node: { x: 8, y: 0.5, r: 0.6 }, dx: 0.05,
      paramOrder: ['a', 'h', 'k'],
      params: {
        a: { min: -1.5, max: 1.5, step: 0.05, default: -0.2, label: 'a  (arc direction & tightness)' },
        h: { min: 0, max: 10, step: 0.25, default: 5, label: 'h  (vertex horizontal)' },
        k: { min: 0, max: 8, step: 0.25, default: 2, label: 'k  (vertex height)' }
      },
      hint: 'Tip: raise k so the arc clears the wall, then adjust a so the beam comes back down through the gate and onto the node.'
    }
  ];

  function levelById(id) { for (var i = 0; i < LEVELS.length; i++) { if (LEVELS[i].id === id) return LEVELS[i]; } return LEVELS[0]; }
  function levelIndex(id) { for (var i = 0; i < LEVELS.length; i++) { if (LEVELS[i].id === id) return i; } return 0; }

  function round1(n) { return Math.round(n * 10) / 10; }

  // Family evaluators — the only "weapons" in Phase 1.
  function fnY(family, p, x) {
    if (family === 'line') return p.m * x + p.b;
    return p.a * (x - p.h) * (x - p.h) + p.k; // parabola (vertex form)
  }

  function defaultParams(level) {
    var o = {};
    for (var i = 0; i < level.paramOrder.length; i++) { var n = level.paramOrder[i]; o[n] = level.params[n].default; }
    return o;
  }

  function sampleCurve(level, params) {
    var pts = [];
    var n = Math.round((level.world.x1 - level.world.x0) / level.dx);
    for (var i = 0; i <= n; i++) {
      var x = level.world.x0 + i * level.dx;
      pts.push({ x: x, y: fnY(level.family, params, x) });
    }
    return pts;
  }

  // Adjudicate a shot. The beam travels left→right and dies at the first
  // obstacle (by x) it fails; otherwise we measure nearest approach to the node.
  function classifyShot(level, params) {
    function y(x) { return fnY(level.family, params, x); }
    var obstacles = [];
    (level.walls || []).forEach(function (w) { obstacles.push({ kind: 'wall', x: w.x, w: w }); });
    (level.gates || []).forEach(function (g) { obstacles.push({ kind: 'gate', x: g.x, g: g }); });
    obstacles.sort(function (a, b) { return a.x - b.x; });

    for (var i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      var yo = y(o.x);
      if (o.kind === 'wall') {
        if (yo <= o.w.height) {
          return { result: 'wall', at: o.x, yAt: yo, obstacle: o.w, nodeDist: null, killedAt: { x: o.x, y: Math.max(0, Math.min(yo, o.w.height)) } };
        }
      } else {
        if (yo < o.g.lo || yo > o.g.hi) {
          return { result: 'gate', at: o.x, yAt: yo, obstacle: o.g, nodeDist: null, killedAt: { x: o.x, y: yo } };
        }
      }
    }

    var pts = sampleCurve(level, params);
    var best = Infinity;
    for (var j = 0; j < pts.length; j++) {
      var dx = pts[j].x - level.node.x, dy = pts[j].y - level.node.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < best) best = d;
    }
    if (best <= level.node.r) return { result: 'hit', at: null, yAt: null, obstacle: null, nodeDist: best, killedAt: null };
    return { result: 'miss', at: null, yAt: null, obstacle: null, nodeDist: best, killedAt: null };
  }

  function actionHint(level, res) {
    var fam = level.family;
    if (res.result === 'wall') {
      return fam === 'line'
        ? 'Lift the beam over the wall — increase the slope (or the start height) so it clears y = ' + res.obstacle.height + '.'
        : 'Arc higher over the wall: raise the vertex height k, or move the vertex h toward x = ' + res.at + '.';
    }
    if (res.result === 'gate') {
      var tooHigh = res.yAt > res.obstacle.hi;
      if (fam === 'line') return tooHigh ? 'The beam is too high there — lower the start height b or reduce the slope.' : 'The beam is too low there — raise the start height b or increase the slope.';
      return tooHigh ? 'The beam is too high there — tighten the arc (more negative a) or lower k.' : 'The beam is too low there — widen the arc or raise k.';
    }
    return '';
  }

  // Outcome narration — direction AND magnitude of the error (design §8.2).
  function describeResult(level, res, shots) {
    if (res.result === 'hit') {
      return 'Lit! The beam reached the node at (' + level.node.x + ', ' + level.node.y + '). Solved in ' +
        shots + (shots === 1 ? ' shot.' : ' shots.');
    }
    if (res.result === 'wall') {
      return 'Blocked — the beam hit the wall at x = ' + res.at + '. It only reached y = ' + round1(res.yAt) +
        ', but the wall is ' + res.obstacle.height + ' tall. ' + actionHint(level, res);
    }
    if (res.result === 'gate') {
      return 'Blocked at the gate (x = ' + res.at + '): the beam passed at y = ' + round1(res.yAt) +
        ', but the opening is y = ' + res.obstacle.lo + ' to ' + res.obstacle.hi + '. ' + actionHint(level, res);
    }
    return 'You reached the node’s street, but the beam missed it by ' + round1(res.nodeDist) +
      ' units. Fine-tune the controls so the beam meets (' + level.node.x + ', ' + level.node.y + ').';
  }

  function describeEquation(level, p) {
    if (level.family === 'line') {
      return 'y = m·x + b, with m = ' + round1(p.m) + ', b = ' + round1(p.b) +
        '. A straight beam, slope ' + round1(p.m) + ', starting at height ' + round1(p.b) + '.';
    }
    var dir = p.a < 0 ? 'opening downward' : (p.a > 0 ? 'opening upward' : 'a flat line');
    return 'y = a(x − h)² + k, with a = ' + round1(p.a) + ', h = ' + round1(p.h) + ', k = ' + round1(p.k) +
      '. A parabola ' + dir + ', vertex at (' + round1(p.h) + ', ' + round1(p.k) + ').';
  }

  function describeBoard(level) {
    var s = 'Arc City, level: ' + level.title + '. ';
    s += level.family === 'line' ? 'Author a straight-line beam. ' : 'Author a parabola beam. ';
    s += 'The dark node to light is at x ' + level.node.x + ', y ' + level.node.y + '. ';
    (level.walls || []).forEach(function (w) { s += 'A wall ' + w.height + ' units tall stands at x ' + w.x + '. '; });
    (level.gates || []).forEach(function (g) { s += 'A gate with an opening from y ' + g.lo + ' to ' + g.hi + ' is at x ' + g.x + '. '; });
    s += 'Aim the beam through any gates, over any walls, to reach the node.';
    return s;
  }

  // A level is unlocked if it's the first, or the previous level is solved.
  function isLevelUnlocked(byLevel, idx) {
    if (idx <= 0) return true;
    var prev = LEVELS[idx - 1];
    var ps = byLevel && byLevel[prev.id];
    return !!(ps && ps.solved);
  }

  // ── Authoring tiers (design §2.4 / §5.2): the anti-slider-fishing gate. ──
  // On guided/independent the live preview is HIDDEN until Fire — you must
  // PREDICT before firing. A solve under a hidden-preview tier is the honest
  // "solved independently" signal (design §9.2): success required a model of
  // the function, not slider-fishing against a live curve.
  var TIERS = ['practice', 'guided', 'independent'];
  function tierLabel(tier) { return tier === 'practice' ? 'Practice' : (tier === 'guided' ? 'Guided' : 'Independent'); }
  function tierBlurb(tier) {
    return tier === 'practice'
      ? 'Live preview on — see the curve as you tune.'
      : 'Preview hidden — predict where the beam goes, then Fire.';
  }
  function previewVisible(tier, fired) { return tier === 'practice' || !!fired; }
  function solveIsIndependent(tier) { return tier !== 'practice'; }

  // ── Action-named badges (design §9.4) — never "mastery"/ability claims. ──
  var BADGES = [
    { id: 'first-light', label: 'First Light — lit your first node' },
    { id: 'window-threader', label: 'Window Threader — threaded a gate and lit a node' },
    { id: 'arc-architect', label: 'Arc Architect — re-lit a node using a parabola' },
    { id: 'sharp-shooter', label: 'Sharp Shooter — lit a node on the first shot' },
    { id: 'independent', label: 'Independent — solved with the preview hidden' }
  ];
  function badgeLabel(id) { for (var i = 0; i < BADGES.length; i++) { if (BADGES[i].id === id) return BADGES[i].label; } return id; }
  // Returns the NEW badge ids earned by this solve (excludes already-earned).
  function badgesForSolve(level, res, shots, tier, earned) {
    if (res.result !== 'hit') return [];
    var out = [];
    function add(id) { if ((earned || []).indexOf(id) === -1 && out.indexOf(id) === -1) out.push(id); }
    if (level.id === 'L1') add('first-light');
    if ((level.gates || []).length) add('window-threader');
    if (level.family === 'parabola') add('arc-architect');
    if (shots === 1) add('sharp-shooter');
    if (solveIsIndependent(tier)) add('independent');
    return out;
  }

  // ── Snap a value to a param's [min,max] grid (shared by sliders + drag). ──
  function snapToRange(val, r) {
    var v = Math.max(r.min, Math.min(r.max, val));
    var snapped = Math.round(v / r.step) * r.step;
    return Math.round(snapped * 1000) / 1000;
  }

  // ── Drag → params (pure, testable): the concrete end of the drag↔equation
  // binding (design §4.2). A dragged handle mutates the SAME params the sliders
  // and the equation read — one source of truth, three editors. ──
  function parabolaVertexParams(worldX, worldY, level) {
    return { h: snapToRange(worldX, level.params.h), k: snapToRange(worldY, level.params.k) };
  }
  function linePivotParams(dragX, dragY, anchorX, anchorY, level) {
    var m = (dragX === anchorX) ? 0 : (dragY - anchorY) / (dragX - anchorX);
    var b = dragY - m * dragX;
    var out = { m: snapToRange(m, level.params.m), b: snapToRange(b, level.params.b) };
    if (level.params.b && level.params.b.locked) out.b = level.params.b.default; // L1: intercept stays put
    return out;
  }

  var ArcCityCore = {
    LEVELS: LEVELS,
    levelById: levelById,
    levelIndex: levelIndex,
    round1: round1,
    fnY: fnY,
    defaultParams: defaultParams,
    sampleCurve: sampleCurve,
    classifyShot: classifyShot,
    describeEquation: describeEquation,
    describeResult: describeResult,
    describeBoard: describeBoard,
    isLevelUnlocked: isLevelUnlocked,
    TIERS: TIERS,
    tierLabel: tierLabel,
    tierBlurb: tierBlurb,
    previewVisible: previewVisible,
    solveIsIndependent: solveIsIndependent,
    BADGES: BADGES,
    badgeLabel: badgeLabel,
    badgesForSolve: badgesForSolve,
    snapToRange: snapToRange,
    parabolaVertexParams: parabolaVertexParams,
    linePivotParams: linePivotParams
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = ArcCityCore; }
  if (typeof window !== 'undefined') { window.ArcCityCore = ArcCityCore; }

  // ══════════════════════════════════════════════════════════════════════
  // BROWSER-ONLY below — bail out cleanly under Node (no window/document).
  // ══════════════════════════════════════════════════════════════════════
  if (typeof window === 'undefined' || typeof document === 'undefined') { return; }

  var HINT_AFTER = 3; // proactive, opt-out hint after N misses on a level (design §8.3)

  window.StemLab = window.StemLab || {
    _registry: {}, _order: [],
    registerTool: function (id, config) {
      config.id = id; config.ready = config.ready !== false;
      this._registry[id] = config;
      if (this._order.indexOf(id) === -1) this._order.push(id);
    },
    getRegisteredTools: function () { var s = this; return this._order.map(function (id) { return s._registry[id]; }).filter(Boolean); },
    isRegistered: function (id) { return !!this._registry[id]; },
    renderTool: function (id, ctx) { var t = this._registry[id]; if (!t || !t.render) return null; try { return t.render(ctx); } catch (e) { console.error('[StemLab] Error rendering ' + id, e); return null; } }
  };

  (function () {
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();

  (function () {
    if (document.getElementById('allo-live-arccity')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-arccity';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();

  (function () {
    if (document.getElementById('allo-arccity-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-arccity-css';
    st.textContent =
      '#allo-arccity-root [role="slider"]{cursor:pointer;}' +
      '#allo-arccity-root [role="slider"]:focus{outline:3px solid #22d3ee;outline-offset:2px;border-radius:6px;}' +
      '#allo-arccity-root [role="slider"]:focus-visible{outline:3px solid #22d3ee;outline-offset:2px;border-radius:6px;}' +
      '#allo-arccity-root button:focus-visible{outline:2px solid #22d3ee;outline-offset:2px;border-radius:6px;}' +
      '@keyframes arccityPulse{0%,100%{opacity:1;}50%{opacity:.45;}}' +
      '#allo-arccity-root .arccity-node-unlit{animation:arccityPulse 1.8s ease-in-out infinite;}';
    document.head.appendChild(st);
  })();

  function announceArc(ctx, msg) {
    try { var el = document.getElementById('allo-live-arccity'); if (el) el.textContent = msg; } catch (e) { }
    try { if (ctx && typeof ctx.announceToSR === 'function') ctx.announceToSR(msg); } catch (e) { }
  }

  function clampStep(val, r) { return snapToRange(val, r); }

  function beamRef(el) {
    if (!el) return;
    try {
      var len = el.getTotalLength ? el.getTotalLength() : 0;
      if (!len) return;
      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce) { el.style.strokeDasharray = 'none'; el.style.strokeDashoffset = '0'; return; }
      if (el._arcAnimated) return;
      el._arcAnimated = true;
      el.style.strokeDasharray = String(len);
      el.style.strokeDashoffset = String(len);
      var start = null, dur = 850;
      function step(ts) {
        if (start === null) start = ts;
        var prog = Math.min(1, (ts - start) / dur);
        el.style.strokeDashoffset = String(len * (1 - prog));
        if (prog < 1) { el._arcAnimId = window.requestAnimationFrame(step); }
      }
      el._arcAnimId = window.requestAnimationFrame(step);
    } catch (e) { try { el.style.strokeDashoffset = '0'; } catch (e2) { } }
  }

  // ══════════════════════════════════════════════════════════════════════
  // Registration + render
  // ══════════════════════════════════════════════════════════════════════
  window.StemLab.registerTool('arccity', {
    icon: '🌆', // 🌆
    label: 'Arc City',
    desc: 'Author functions to fire light-beams, clear walls, and re-light a neon city.',
    color: 'fuchsia',
    category: 'math',
    render: function (ctx) {
      var React = ctx && ctx.React;
      if (!React) { return null; }
      var h = React.createElement;
      try {
        var toolData = ctx.toolData || {};
        var setToolData = ctx.setToolData;
        var t = ctx.t || function (k, d) { return d || k; };

        if (!toolData._arccity) {
          if (typeof setToolData === 'function') {
            setToolData(function (prev) {
              return Object.assign({}, prev, { _arccity: { levelId: 'L1', fired: false, byLevel: {}, tier: 'practice', badges: [] } });
            });
          }
          return h('div', { style: { padding: 24, color: 'var(--allo-stem-text, #e2e8f0)' } }, t('arccity.loading', 'Loading Arc City…'));
        }

        var S = toolData._arccity;
        var byLevel = S.byLevel || {};
        var level = levelById(S.levelId || 'L1');
        var lIdx = levelIndex(level.id);
        var rawLS = byLevel[level.id];
        var ls = (rawLS && rawLS.params) ? rawLS : { params: defaultParams(level), shots: 0, solved: false, misses: 0 };
        var P = Object.assign({}, ls.params);
        var res = classifyShot(level, P);
        var tier = S.tier || 'practice';
        var badges = S.badges || [];
        var showPreview = previewVisible(tier, S.fired);
        var indepSolved = !!(ls && ls.independent);

        // ── state updaters (all via setToolData; no React hooks) ──
        function mergeLevel(prevRoot, partial, paramsOverride) {
          var cur = (prevRoot && prevRoot._arccity) || S;
          var bl = Object.assign({}, cur.byLevel || {});
          var base = Object.assign({ params: defaultParams(level), shots: 0, solved: false, misses: 0 }, bl[level.id] || {});
          if (paramsOverride) base = Object.assign({}, base, { params: paramsOverride });
          bl[level.id] = Object.assign({}, base, partial || {});
          return Object.assign({}, prevRoot, { _arccity: Object.assign({}, cur, { byLevel: bl }, partial && partial._root ? partial._root : {}) });
        }
        function setParam(name, raw) {
          if (typeof setToolData !== 'function') return;
          var nv = clampStep(raw, level.params[name]);
          var np = Object.assign({}, P); np[name] = nv;
          setToolData(function (prev) {
            var cur = (prev && prev._arccity) || S;
            var bl = Object.assign({}, cur.byLevel || {});
            var base = Object.assign({ params: defaultParams(level), shots: 0, solved: false, misses: 0 }, bl[level.id] || {});
            bl[level.id] = Object.assign({}, base, { params: np });
            return Object.assign({}, prev, { _arccity: Object.assign({}, cur, { byLevel: bl, fired: false }) });
          });
        }
        function setParamsMulti(np) {
          if (typeof setToolData !== 'function') return;
          setToolData(function (prev) {
            var cur = (prev && prev._arccity) || S;
            var bl = Object.assign({}, cur.byLevel || {});
            var base = Object.assign({ params: defaultParams(level), shots: 0, solved: false, misses: 0 }, bl[level.id] || {});
            bl[level.id] = Object.assign({}, base, { params: Object.assign({}, base.params, np) });
            return Object.assign({}, prev, { _arccity: Object.assign({}, cur, { byLevel: bl, fired: false }) });
          });
        }
        function fire() {
          if (typeof setToolData !== 'function') return;
          var r = classifyShot(level, P);
          var shotsNow = (ls.shots || 0) + 1;
          var newBadges = badgesForSolve(level, r, shotsNow, tier, badges);
          var indep = r.result === 'hit' && solveIsIndependent(tier);
          setToolData(function (prev) {
            var cur = (prev && prev._arccity) || S;
            var bl = Object.assign({}, cur.byLevel || {});
            var base = Object.assign({ params: defaultParams(level), shots: 0, solved: false, misses: 0, independent: false }, bl[level.id] || {});
            var shots = (base.shots || 0) + 1;
            var solved = base.solved || r.result === 'hit';
            var misses = (base.misses || 0) + (r.result === 'hit' ? 0 : 1);
            bl[level.id] = Object.assign({}, base, { params: P, shots: shots, solved: solved, misses: misses, independent: base.independent || indep });
            var mergedBadges = (cur.badges || []).slice();
            newBadges.forEach(function (bd) { if (mergedBadges.indexOf(bd) === -1) mergedBadges.push(bd); });
            return Object.assign({}, prev, { _arccity: Object.assign({}, cur, { byLevel: bl, fired: true, badges: mergedBadges }) });
          });
          var msg = describeResult(level, r, shotsNow);
          if (r.result === 'hit') {
            if (indep) msg += ' ' + t('arccity.independent', 'Solved independently — the preview was hidden.');
            if (lIdx < LEVELS.length - 1) msg += ' ' + t('arccity.unlocked', 'Next level unlocked!');
            if (newBadges.length) msg += ' ' + t('arccity.badge', 'Badge earned: ') + newBadges.map(badgeLabel).join(', ') + '.';
          }
          announceArc(ctx, msg);
        }
        function resetLevel() {
          if (typeof setToolData !== 'function') return;
          setToolData(function (prev) {
            var cur = (prev && prev._arccity) || S;
            var bl = Object.assign({}, cur.byLevel || {});
            var base = Object.assign({ params: defaultParams(level), shots: 0, solved: false, misses: 0 }, bl[level.id] || {});
            bl[level.id] = Object.assign({}, base, { params: defaultParams(level) });
            return Object.assign({}, prev, { _arccity: Object.assign({}, cur, { byLevel: bl, fired: false }) });
          });
          announceArc(ctx, t('arccity.reset', 'Reset. ') + describeBoard(level));
        }
        function switchLevel(id) {
          if (typeof setToolData !== 'function') return;
          setToolData(function (prev) {
            var cur = (prev && prev._arccity) || S;
            return Object.assign({}, prev, { _arccity: Object.assign({}, cur, { levelId: id, fired: false }) });
          });
          announceArc(ctx, describeBoard(levelById(id)));
        }
        function setTier(tr) {
          if (typeof setToolData !== 'function') return;
          setToolData(function (prev) {
            var cur = (prev && prev._arccity) || S;
            return Object.assign({}, prev, { _arccity: Object.assign({}, cur, { tier: tr, fired: false }) });
          });
          announceArc(ctx, t('arccity.tier', 'Tier:') + ' ' + tierLabel(tr) + '. ' + tierBlurb(tr));
        }

        // ── SVG transforms (orthographic, zero shear) ──
        var W = 640, H = 420;
        var wx0 = level.world.x0, wx1 = level.world.x1, wy0 = level.world.y0, wy1 = level.world.y1;
        function sx(x) { return (x - wx0) / (wx1 - wx0) * W; }
        function sy(y) { return H - (y - wy0) / (wy1 - wy0) * H; }
        function svgWorldFromEvent(svgEl, evt) {
          try {
            var pt = svgEl.createSVGPoint(); pt.x = evt.clientX; pt.y = evt.clientY;
            var loc = pt.matrixTransform(svgEl.getScreenCTM().inverse());
            return { x: wx0 + (loc.x / W) * (wx1 - wx0), y: wy0 + (1 - loc.y / H) * (wy1 - wy0) };
          } catch (e) { return null; }
        }
        function startHandleDrag(evt, computeParams) {
          if (typeof setToolData !== 'function') return;
          if (evt && evt.preventDefault) evt.preventDefault();
          var svgEl = evt.currentTarget && evt.currentTarget.ownerSVGElement;
          if (!svgEl) return;
          function move(ev) { var w = svgWorldFromEvent(svgEl, ev); if (w) setParamsMulti(computeParams(w.x, w.y)); }
          function up() { try { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); } catch (e) { } }
          try { window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); } catch (e) { }
        }

        var INK = 'var(--allo-stem-text, #e2e8f0)';
        var GRID = 'var(--allo-stem-border, #334155)';
        var BEAM = '#22d3ee', NODE_OFF = '#f0abfc', NODE_ON = '#34d399', GATE = '#a78bfa', WALL = '#64748b';

        var gridEls = [];
        for (var gx = 0; gx <= 10; gx++) gridEls.push(h('line', { key: 'gx' + gx, x1: sx(gx), y1: sy(wy0), x2: sx(gx), y2: sy(wy1), stroke: GRID, strokeWidth: gx === 0 ? 1.5 : 0.5, opacity: gx === 0 ? 0.9 : 0.4 }));
        for (var gy = 0; gy <= 8; gy++) gridEls.push(h('line', { key: 'gy' + gy, x1: sx(wx0), y1: sy(gy), x2: sx(wx1), y2: sy(gy), stroke: GRID, strokeWidth: gy === 0 ? 1.5 : 0.5, opacity: gy === 0 ? 0.9 : 0.4 }));

        var obstacleEls = [];
        (level.walls || []).forEach(function (w, i) {
          obstacleEls.push(h('rect', { key: 'wall' + i, x: sx(w.x) - 4, y: sy(w.height), width: 8, height: sy(0) - sy(w.height), fill: WALL, rx: 2 }));
        });
        (level.gates || []).forEach(function (g, i) {
          obstacleEls.push(h('rect', { key: 'gateLo' + i, x: sx(g.x) - 4, y: sy(g.lo), width: 8, height: sy(0) - sy(g.lo), fill: GATE, opacity: 0.85, rx: 2 }));
          obstacleEls.push(h('rect', { key: 'gateHi' + i, x: sx(g.x) - 4, y: sy(wy1), width: 8, height: sy(g.hi) - sy(wy1), fill: GATE, opacity: 0.85, rx: 2 }));
        });

        var nodeR = (W / (wx1 - wx0)) * level.node.r;
        var lit = ls.solved || res.result === 'hit';
        var nodeEl = h('circle', {
          key: 'node', cx: sx(level.node.x), cy: sy(level.node.y), r: nodeR,
          fill: lit ? NODE_ON : NODE_OFF, opacity: lit ? 1 : 0.85,
          className: lit ? '' : 'arccity-node-unlit', stroke: lit ? NODE_ON : NODE_OFF, strokeWidth: 2
        });

        var samples = sampleCurve(level, P);
        function ptsStr(filterFn) {
          var s = '';
          for (var i = 0; i < samples.length; i++) {
            if (filterFn && !filterFn(samples[i])) continue;
            var py = samples[i].y;
            if (py < wy0 - 2 || py > wy1 + 2) continue;
            s += sx(samples[i].x) + ',' + sy(py) + ' ';
          }
          return s.trim();
        }
        var previewEls = [];
        if (showPreview) {
          previewEls.push(h('polyline', { key: 'preview', points: ptsStr(null), fill: 'none', stroke: INK, strokeWidth: 2, strokeDasharray: '4 5', opacity: 0.55 }));
        } else {
          // Hidden-preview tier: the curve is concealed until Fire (anti-fishing).
          previewEls.push(h('text', { key: 'pvhide', x: W / 2, y: 28, textAnchor: 'middle', fill: INK, opacity: 0.6, fontSize: 14 }, t('arccity.preview_hidden', 'Preview hidden — predict, then Fire ⚡')));
        }

        var overlay = [];
        if (S.fired) {
          var killX = res.killedAt ? res.killedAt.x : wx1;
          overlay.push(h('polyline', { key: 'beam-' + (ls.shots || 0), ref: beamRef, points: ptsStr(function (pt) { return pt.x <= killX + 0.0001; }), fill: 'none', stroke: res.result === 'hit' ? NODE_ON : BEAM, strokeWidth: 3.5, strokeLinecap: 'round', style: { filter: 'drop-shadow(0 0 4px ' + (res.result === 'hit' ? NODE_ON : BEAM) + ')' } }));
          if (res.killedAt) {
            var kx = sx(res.killedAt.x), ky = sy(res.killedAt.y), mk = 7;
            overlay.push(h('line', { key: 'kx1', x1: kx - mk, y1: ky - mk, x2: kx + mk, y2: ky + mk, stroke: '#f87171', strokeWidth: 3, strokeLinecap: 'round' }));
            overlay.push(h('line', { key: 'kx2', x1: kx - mk, y1: ky + mk, x2: kx + mk, y2: ky - mk, stroke: '#f87171', strokeWidth: 3, strokeLinecap: 'round' }));
          }
        }

        // ── Drag handles (Practice tier only: the concrete scaffold. Never on
        // hidden-preview tiers, so they can't undercut the integrity gate). The
        // handle shares the equation's accent color = the always-on co-highlight. ──
        var HANDLE = BEAM;
        var handleEls = [];
        if (tier === 'practice') {
          if (level.family === 'parabola') {
            handleEls.push(h('circle', {
              key: 'vh', cx: sx(P.h), cy: sy(P.k), r: 9, fill: HANDLE, opacity: 0.95, stroke: '#06262b', strokeWidth: 2,
              style: { cursor: 'grab' }, 'aria-hidden': 'true',
              onPointerDown: function (e) { startHandleDrag(e, function (wx, wy) { return parabolaVertexParams(wx, wy, level); }); }
            }));
            handleEls.push(h('text', { key: 'vhl', x: sx(P.h) + 12, y: sy(P.k) - 8, fill: HANDLE, fontSize: 11, 'aria-hidden': 'true' }, 'vertex (h, k)'));
          } else if (level.params.b && level.params.b.locked) {
            var xH = level.node.x, yH = fnY('line', P, xH);
            handleEls.push(h('circle', {
              key: 'lh', cx: sx(xH), cy: sy(yH), r: 9, fill: HANDLE, opacity: 0.95, stroke: '#06262b', strokeWidth: 2,
              style: { cursor: 'grab' }, 'aria-hidden': 'true',
              onPointerDown: function (e) { startHandleDrag(e, function (wx, wy) { return linePivotParams(xH, wy, 0, 0, level); }); }
            }));
          } else {
            var xA = 2, xB = 8, yA = fnY('line', P, xA), yB = fnY('line', P, xB);
            handleEls.push(h('circle', {
              key: 'lhA', cx: sx(xA), cy: sy(yA), r: 9, fill: HANDLE, opacity: 0.95, stroke: '#06262b', strokeWidth: 2,
              style: { cursor: 'grab' }, 'aria-hidden': 'true',
              onPointerDown: (function (bx, by) { return function (e) { startHandleDrag(e, function (wx, wy) { return linePivotParams(xA, wy, bx, by, level); }); }; })(xB, yB)
            }));
            handleEls.push(h('circle', {
              key: 'lhB', cx: sx(xB), cy: sy(yB), r: 9, fill: HANDLE, opacity: 0.95, stroke: '#06262b', strokeWidth: 2,
              style: { cursor: 'grab' }, 'aria-hidden': 'true',
              onPointerDown: (function (ax, ay) { return function (e) { startHandleDrag(e, function (wx, wy) { return linePivotParams(xB, wy, ax, ay, level); }); }; })(xA, yA)
            }));
          }
        }

        var svg = h('svg', {
          key: 'svg', viewBox: '0 0 ' + W + ' ' + H, width: '100%',
          role: 'img', 'aria-label': describeBoard(level),
          style: { display: 'block', maxHeight: '50vh', background: 'transparent', borderRadius: 12, border: '1px solid ' + GRID, overflow: 'hidden', touchAction: 'none' }
        }, [].concat(gridEls, obstacleEls, previewEls, overlay, [nodeEl], handleEls));

        // ── Level progression bar ──
        var levelBtns = LEVELS.map(function (lv, i) {
          var unlocked = isLevelUnlocked(byLevel, i);
          var solved = !!(byLevel[lv.id] && byLevel[lv.id].solved);
          var current = lv.id === level.id;
          var face = (solved ? '✅ ' : (unlocked ? '' : '🔒 ')) + lv.title;
          return h('button', {
            key: 'lvl-' + lv.id, type: 'button', disabled: !unlocked,
            'aria-current': current ? 'true' : null,
            'aria-label': lv.title + (solved ? ' (completed)' : (unlocked ? '' : ' (locked)')),
            onClick: function () { if (unlocked) switchLevel(lv.id); },
            style: {
              padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: current ? 800 : 600,
              border: '1px solid ' + (current ? BEAM : GRID),
              background: current ? 'rgba(34,211,238,0.15)' : 'transparent',
              color: unlocked ? INK : 'var(--allo-stem-text, #64748b)',
              opacity: unlocked ? 1 : 0.5, cursor: unlocked ? 'pointer' : 'not-allowed'
            }
          }, face);
        });

        // ── Parameter controls ──
        function paramRow(name) {
          var spec = level.params[name];
          var val = P[name];
          if (spec.locked) {
            return h('div', { key: 'row-' + name, style: { marginBottom: 10, fontSize: 13, color: INK, opacity: 0.7 } },
              h('span', { key: 'l' }, spec.label + ': '),
              h('span', { key: 'v', style: { fontWeight: 700 } }, String(round1(val))));
          }
          var pct = (val - spec.min) / (spec.max - spec.min);
          function onKey(e) {
            var key = e.key;
            if (key === 'ArrowRight' || key === 'ArrowUp') { e.preventDefault(); setParam(name, val + (e.shiftKey ? spec.step * 5 : spec.step)); }
            else if (key === 'ArrowLeft' || key === 'ArrowDown') { e.preventDefault(); setParam(name, val - (e.shiftKey ? spec.step * 5 : spec.step)); }
            else if (key === 'Home') { e.preventDefault(); setParam(name, spec.min); }
            else if (key === 'End') { e.preventDefault(); setParam(name, spec.max); }
          }
          var btn = { width: 30, height: 30, borderRadius: 8, border: '1px solid ' + GRID, background: 'rgba(255,255,255,0.06)', color: INK, fontSize: 18, lineHeight: '26px', cursor: 'pointer' };
          return h('div', { key: 'row-' + name, role: 'group', 'aria-label': spec.label, style: { marginBottom: 10 } },
            h('div', { key: 'hdr', style: { display: 'flex', justifyContent: 'space-between', fontSize: 13, color: INK, marginBottom: 4 } },
              h('span', { key: 'l' }, spec.label),
              h('span', { key: 'v', style: { fontVariantNumeric: 'tabular-nums', fontWeight: 700 } }, String(round1(val)))),
            h('div', { key: 'ctl', style: { display: 'flex', alignItems: 'center', gap: 8 } },
              h('button', { key: 'dec', type: 'button', 'aria-label': 'Decrease ' + spec.label, onClick: function () { setParam(name, val - spec.step); }, style: btn }, '−'),
              h('div', {
                key: 'sld', role: 'slider', tabIndex: 0, 'aria-label': spec.label,
                'aria-valuemin': spec.min, 'aria-valuemax': spec.max, 'aria-valuenow': round1(val), 'aria-valuetext': spec.label + ' ' + round1(val),
                onKeyDown: onKey,
                style: { position: 'relative', flex: 1, height: 10, borderRadius: 6, background: 'rgba(148,163,184,0.25)' }
              },
                h('div', { key: 'fill', style: { position: 'absolute', left: 0, top: 0, height: 10, width: (pct * 100) + '%', background: BEAM, borderRadius: 6, opacity: 0.5 } }),
                h('div', { key: 'thumb', style: { position: 'absolute', top: -3, left: 'calc(' + (pct * 100) + '% - 8px)', width: 16, height: 16, borderRadius: '50%', background: BEAM, boxShadow: '0 0 6px ' + BEAM } })),
              h('button', { key: 'inc', type: 'button', 'aria-label': 'Increase ' + spec.label, onClick: function () { setParam(name, val + spec.step); }, style: btn }, '+')));
        }

        var paramRows = level.paramOrder.map(function (n) { return paramRow(n); });

        var fireBtnStyle = { flex: 1, padding: '10px 14px', borderRadius: 10, border: 'none', background: BEAM, color: '#06262b', fontWeight: 800, fontSize: 15, cursor: 'pointer' };
        var resetBtnStyle = { padding: '10px 14px', borderRadius: 10, border: '1px solid ' + GRID, background: 'transparent', color: INK, fontWeight: 700, fontSize: 14, cursor: 'pointer' };

        var resultText = S.fired ? describeResult(level, res, ls.shots || 0) : describeBoard(level);
        var resultColor = !S.fired ? INK : (res.result === 'hit' ? NODE_ON : (res.result === 'miss' ? '#fbbf24' : '#f87171'));

        var showHint = !ls.solved && (ls.misses || 0) >= HINT_AFTER;

        var coordItems = [h('li', { key: 'cn' }, '🎯 ' + t('arccity.node', 'Node (target):') + ' x ' + level.node.x + ', y ' + level.node.y)];
        (level.walls || []).forEach(function (w, i) { coordItems.push(h('li', { key: 'cw' + i }, '🧱 ' + t('arccity.wall', 'Wall:') + ' x ' + w.x + ', height ' + w.height)); });
        (level.gates || []).forEach(function (g, i) { coordItems.push(h('li', { key: 'cg' + i }, '🚪 ' + t('arccity.gate', 'Gate:') + ' x ' + g.x + ', opening y ' + g.lo + ' to ' + g.hi)); });

        var controls = h('div', { key: 'controls', style: { marginTop: 14 } },
          h('div', { key: 'eq', 'aria-label': describeEquation(level, P), style: { fontSize: 15, color: INK, marginBottom: 6, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', fontVariantNumeric: 'tabular-nums' } },
            level.family === 'line'
              ? ['y = ', h('span', { key: 'm', style: { color: BEAM, fontWeight: 800 } }, round1(P.m)), ' · x + ', h('span', { key: 'b', style: { color: BEAM, fontWeight: 800 } }, round1(P.b))]
              : ['y = ', h('span', { key: 'a', style: { color: BEAM, fontWeight: 800 } }, round1(P.a)), ' (x − ', h('span', { key: 'h', style: { color: BEAM, fontWeight: 800 } }, round1(P.h)), ')² + ', h('span', { key: 'k', style: { color: BEAM, fontWeight: 800 } }, round1(P.k))]),
          tier === 'practice' ? h('div', { key: 'draghint', style: { fontSize: 11, color: INK, opacity: 0.6, marginBottom: 10 } }, t('arccity.drag_hint', 'Tip: drag the glowing handle on the grid — the highlighted numbers update. Or use the sliders.')) : null,
          h('div', { key: 'rows' }, paramRows),
          h('div', { key: 'btns', style: { display: 'flex', gap: 10, marginTop: 6 } },
            h('button', { key: 'fire', type: 'button', onClick: fire, style: fireBtnStyle }, '⚡ ' + t('arccity.fire', 'Fire beam')),
            h('button', { key: 'reset', type: 'button', onClick: resetLevel, style: resetBtnStyle }, t('arccity.reset_btn', 'Reset'))),
          h('div', { key: 'result', role: 'status', style: { marginTop: 12, fontSize: 14, lineHeight: 1.5, color: resultColor, minHeight: 42 } }, resultText),
          showHint ? h('div', { key: 'hint', style: { marginTop: 8, fontSize: 13, color: '#fcd34d', padding: '8px 10px', borderRadius: 8, background: 'rgba(252,211,77,0.10)' } }, '💡 ' + level.hint) : null,
          h('div', { key: 'shots', style: { marginTop: 6, fontSize: 12, color: INK, opacity: 0.7 } },
            (ls.solved ? '✅ ' + t('arccity.solved', 'Node lit!') + (indepSolved ? ' ' + t('arccity.indep_tag', '(solved independently)') : '') + '  ' : '') + t('arccity.shots', 'Shots fired:') + ' ' + (ls.shots || 0)),
          h('ul', { key: 'coords', style: { listStyle: 'none', padding: 0, margin: '8px 0 0', fontSize: 12, color: INK, opacity: 0.8 } }, coordItems));

        var header = h('div', { key: 'hdr', style: { marginBottom: 10 } },
          h('h2', { key: 'h2', style: { margin: 0, fontSize: 20, fontWeight: 800, color: INK } }, '🌆 ' + t('arccity.title', 'Arc City')),
          h('p', { key: 'sub', style: { margin: '4px 0 0', fontSize: 13, color: INK, opacity: 0.8 } },
            t('arccity.subtitle', 'Author a function whose beam threads the gates, clears the walls, and lights the node.')));

        var levelBar = h('div', { key: 'levelbar', role: 'group', 'aria-label': t('arccity.levels', 'Levels'), style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 } }, levelBtns);

        var tierBtns = TIERS.map(function (tr) {
          var active = tr === tier;
          return h('button', {
            key: 'tier-' + tr, type: 'button', 'aria-pressed': active ? 'true' : 'false',
            'aria-label': t('arccity.tier', 'Tier:') + ' ' + tierLabel(tr) + ' — ' + tierBlurb(tr),
            onClick: function () { setTier(tr); },
            style: {
              padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: active ? 800 : 600,
              border: '1px solid ' + (active ? BEAM : GRID), background: active ? 'rgba(34,211,238,0.15)' : 'transparent', color: INK, cursor: 'pointer'
            }
          }, tierLabel(tr));
        });
        var tierBar = h('div', { key: 'tierbar', role: 'group', 'aria-label': t('arccity.tier_select', 'Authoring tier'), style: { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 } },
          [h('span', { key: 'tlab', style: { fontSize: 12, color: INK, opacity: 0.7 } }, t('arccity.tier', 'Tier:'))]
            .concat(tierBtns)
            .concat([h('span', { key: 'tblurb', style: { fontSize: 11, color: INK, opacity: 0.6 } }, tierBlurb(tier))]));

        var badgeStrip = badges.length
          ? h('div', { key: 'badges', role: 'group', 'aria-label': t('arccity.badges', 'Badges earned'), style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 } },
            badges.map(function (bid) {
              return h('span', { key: 'badge-' + bid, title: badgeLabel(bid), style: { fontSize: 11, padding: '3px 8px', borderRadius: 999, border: '1px solid ' + GRID, background: 'rgba(52,211,153,0.12)', color: INK } }, '🏅 ' + badgeLabel(bid));
            }))
          : null;

        return h('div', { id: 'allo-arccity-root', style: { padding: 16, maxWidth: 760, margin: '0 auto', color: INK } },
          header, levelBar, tierBar, svg, controls, badgeStrip);

      } catch (e) {
        return h('div', { style: { padding: 16, color: '#fca5a5', fontSize: 14 } },
          'Arc City could not render: ' + (e && e.message ? e.message : String(e)));
      }
    }
  });

})();
