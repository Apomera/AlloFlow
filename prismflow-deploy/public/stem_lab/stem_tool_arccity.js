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
    },
    {
      id: 'L4', title: 'Switchback', family: 'absval',
      world: { x0: 0, x1: 10, y0: 0, y1: 8 },
      walls: [], gates: [{ x: 2, lo: 4, hi: 6 }, { x: 8, lo: 4, hi: 6 }], node: { x: 5, y: 1, r: 0.6 }, dx: 0.05,
      paramOrder: ['a', 'h', 'k'],
      params: {
        a: { min: 0, max: 2, step: 0.05, default: 0.5, label: 'a  (how steep the V bends)' },
        h: { min: 0, max: 10, step: 0.25, default: 5, label: 'h  (vertex horizontal)' },
        k: { min: 0, max: 8, step: 0.25, default: 3, label: 'k  (vertex height — bottom of the V)' }
      },
      hint: 'Tip: this beam bends into a sharp V. Lower the vertex height k down onto the node, then raise a until the V is steep enough that its two arms still pass through both high windows.'
    },
    {
      id: 'L5', title: 'Sine Boulevard', family: 'sine',
      world: { x0: 0, x1: 10, y0: 0, y1: 8 },
      // §3.1 refinement (high-school REACH, not 8th-grade core): the full 3-parameter
      // sine, made tractable. PERIOD snaps to whole numbers (b = 2π/P, P ∈ {4,5,6,8})
      // so the player thinks "one wave every N units"; PHASE c is authored by a
      // crest-grabber drag handle (drag a peak onto a window — phase is spatial, not a
      // number hunt); k (midline) is locked. ε is generous (windows ±0.45, node r 0.6).
      // Intended period 6 (b≈1.047), amplitude 2.5, phase 1.0: crests at x≈0.5 & 6.5,
      // trough at x≈3.5, ending in the trough node. Verified solvable + load-bearing
      // (27/1300 ≈ 2% on the authored grid) in arc_city_solvability.test.js.
      walls: [], gates: [{ x: 0.5, lo: 6.05, hi: 6.95 }, { x: 3.5, lo: 1.05, hi: 1.95 }, { x: 6.5, lo: 6.05, hi: 6.95 }], node: { x: 9.5, y: 1.5, r: 0.6 }, dx: 0.05,
      paramOrder: ['a', 'b', 'c', 'k'],
      params: {
        a: { min: 0.5, max: 3.5, step: 0.25, default: 1, label: 'a  (amplitude — how tall the wave)' },
        // b is authored as PERIOD: the slider snaps to b = 2π/P for whole-number P and
        // shows "one wave every N units" (asPeriod). 1.5708=P4, 1.2566=P5, 1.0472=P6, 0.7854=P8.
        b: { min: 0.7854, max: 1.5708, step: 0.05, snapValues: [1.5708, 1.2566, 1.0472, 0.7854], asPeriod: true, default: 1.5708, label: 'period  (one full wave every N units)' },
        c: { min: 0, max: 6, step: 0.25, default: 0, label: 'c  (phase — slides the wave sideways; drag a crest to set it)' },
        k: { min: 4, max: 4, step: 1, default: 4, locked: true, label: 'k  (midline — locked at 4)' }
      },
      hint: 'High-school reach: the full sine. Drag a crest (the glowing handle) onto a high window to set the phase, set the PERIOD so the next crest/trough lands on the other windows, and the amplitude a so it reaches them. Midline is locked at y = 4.'
    },
    {
      id: 'L6', title: 'Tilt Gates', family: 'parabola',
      world: { x0: 0, x1: 10, y0: 0, y1: 8 },
      walls: [],
      // Two gates demand OPPOSITE slopes (climbing +1.5, then descending -1.5).
      // A straight beam has one constant slope and cannot satisfy both; the slope
      // DIFFERENCE forces a concave-down arc (a < 0) of a specific curvature. So
      // the derivative is genuinely load-bearing — verified in
      // tests/arc_city_solvability.test.js: every grid win has a < 0 (the §13.2.4
      // forcing certificate). Intended solution ≈ a=-0.4, h=5, k=5.5.
      gates: [{ x: 3, lo: 2.5, hi: 4.5, slope: { value: 1.5, tol: 0.5 } }, { x: 7, lo: 2.5, hi: 4.5, slope: { value: -1.5, tol: 0.5 } }],
      node: { x: 8.5, y: 0.5, r: 0.6 }, dx: 0.05,
      paramOrder: ['a', 'h', 'k'],
      params: {
        a: { min: -1.5, max: 1.5, step: 0.05, default: -0.2, label: 'a  (arc direction & tightness)' },
        h: { min: 0, max: 10, step: 0.25, default: 5, label: 'h  (vertex horizontal)' },
        k: { min: 0, max: 8, step: 0.25, default: 2, label: 'k  (vertex height)' }
      },
      hint: 'Tip: two TILTED gates demand opposite angles — the beam must be CLIMBING through the first and DESCENDING through the second. A straight beam can’t do both; only an arc whose slope changes will thread them. Raise k to lift the arc, then set a so it bends from rising to falling between the gates.'
    },
    {
      id: 'L7', title: 'Exponent Reach', family: 'exp',
      world: { x0: 0, x1: 10, y0: 0, y1: 8 },
      // Five NARROW windows lie on a single decay curve y = k + a·e^(b·x). Five
      // points over-determine any 3-parameter family, so no line, V, or parabola
      // can thread them all — only an exponential, whose (y−k) ratio is constant,
      // rides the whole sequence down toward the floor it never crosses; the node
      // hugs that asymptote at the far right. Verified forcing certificate (only
      // exp wins) in tests/arc_city_solvability.test.js. Intended ≈ a=5, b=-0.4, k=1.
      walls: [],
      gates: [{ x: 1, lo: 4.2, hi: 4.5 }, { x: 3, lo: 2.36, hi: 2.66 }, { x: 5, lo: 1.53, hi: 1.83 }, { x: 7, lo: 1.15, hi: 1.45 }, { x: 9, lo: 1.0, hi: 1.3 }],
      node: { x: 9.5, y: 1.1, r: 0.4 }, dx: 0.05,
      paramOrder: ['a', 'b', 'k'],
      params: {
        a: { min: 3, max: 6, step: 0.25, default: 3, label: 'a  (starting height above the floor)' },
        b: { min: -0.6, max: -0.25, step: 0.025, default: -0.25, label: 'b  (decay rate — more negative drops faster)' },
        k: { min: 0.5, max: 1.0, step: 0.1, default: 1.0, label: 'k  (the floor / asymptote it approaches but never crosses — always below the node)' }
      },
      hint: 'Tip: this beam decays toward a floor (k) it never touches. The five narrow windows all sit on one decay curve — set the floor k, the start height a, and the decay rate b so the curve threads every window on its way down.'
    },
    {
      id: 'L8', title: 'Logarithm Heights', family: 'log',
      world: { x0: 0, x1: 10, y0: 0, y1: 8 },
      // SIX narrow windows lie on one logarithmic climb y = k + a·ln(x + c) — a
      // concave, ever-slowing rise. Six points over-determine any 3-parameter
      // family; no line, V, parabola, or EXPONENTIAL (opposite, convex curvature)
      // can thread them all — only a logarithm fits its own slowing climb, with
      // the node at the flat far-right end. Verified forcing certificate (only log
      // wins) in tests/arc_city_solvability.test.js. Intended ≈ a=2, c=1, k=1.
      // (Logs are above the 8th-grade core — a reach/enrichment level.)
      walls: [],
      gates: [{ x: 0.5, lo: 1.68, hi: 1.94 }, { x: 1, lo: 2.26, hi: 2.52 }, { x: 3, lo: 3.64, hi: 3.9 }, { x: 5, lo: 4.45, hi: 4.71 }, { x: 7, lo: 5.03, hi: 5.29 }, { x: 9, lo: 5.47, hi: 5.73 }],
      node: { x: 9.5, y: 5.7, r: 0.3 }, dx: 0.05,
      paramOrder: ['a', 'c', 'k'],
      params: {
        a: { min: 1.5, max: 3, step: 0.1, default: 1.5, label: 'a  (climb strength — how high it rises)' },
        c: { min: 0.5, max: 2, step: 0.1, default: 2, label: 'c  (shift — smaller = steeper early rise)' },
        k: { min: 0, max: 2, step: 0.1, default: 0, label: 'k  (vertical offset)' }
      },
      hint: 'Tip: a logarithm climbs fast at first, then slows — concave, the mirror of exponential GROWTH (not the decay you just saw). Six narrow windows sit on one such climb: set the climb strength a, the shift c, and the offset k so the slowing curve threads them all.'
    },
    {
      // ── L9: Cubic Switchback — the POLYNOMIAL (cubic) family, turning-point form. ──
      // y = a[x³/3 − ½(p+q)x² + p·q·x] + k. The player AUTHORS THE TURNING POINTS:
      // p = where the curve crests (local max), q = where it dips (local min), a =
      // steepness; k is fixed by the level. FIVE windows trace an asymmetric
      // up-crest-down-dip-up wiggle that ONLY a two-turning-point cubic can thread —
      // a line/V (≤1 kink), a parabola (1 turn), an exponential/logarithm (monotonic
      // curvature), and even a sine (the wiggle is asymmetric, not periodic) all fail.
      // Verified forcing certificate (only poly wins) in arc_city_solvability.test.js.
      // Intended ≈ a=0.12, p=2.5, q=6.5, k=4. (Cubics are above the 8th-grade core —
      // a reach/enrichment level, like the logarithm.)
      id: 'L9', title: 'Cubic Switchback', family: 'poly',
      world: { x0: 0, x1: 10, y0: 0, y1: 8 },
      walls: [],
      gates: [{ x: 1, lo: 5.11, hi: 5.79 }, { x: 2.5, lo: 5.79, hi: 6.47 }, { x: 4.5, lo: 5.15, hi: 5.82 }, { x: 6, lo: 4.56, hi: 5.24 }, { x: 8.5, lo: 5.79, hi: 6.47 }],
      node: { x: 9.4, y: 7.84, r: 0.34 }, dx: 0.05,
      paramOrder: ['a', 'p', 'q', 'k'],
      params: {
        a: { min: 0.06, max: 0.2, step: 0.01, default: 0.06, label: 'a  (steepness — how sharp the bends are)' },
        p: { min: 1.5, max: 3.5, step: 0.25, default: 1.5, label: 'p  (where it crests — the first turning point)' },
        q: { min: 5.5, max: 7.5, step: 0.25, default: 7.5, label: 'q  (where it dips — the second turning point)' },
        k: { min: 4, max: 4, step: 1, default: 4, locked: true, label: 'k  (vertical offset — fixed this level)' }
      },
      hint: 'Tip: a cubic has TWO turning points — it rises, crests, dips, then rises again. Place the crest p and the dip q under the windows, then set the steepness a so the wiggle threads them all on its way to the node.'
    },
    {
      // ── L10: The Gauntlet — adaptive, integrative capstone (design §11 boss world). ──
      // Not a function level itself: it SEQUENCES one challenge from every family
      // (line, parabola, V, sine, exponential, logarithm, cubic) in an order ADAPTED
      // to the player — the families they've practiced LEAST come first, surfaced out
      // loud (gauntletWhy). "Adaptive" = honest re-sequencing by demonstrated practice,
      // NOT a hidden difficulty knob (§9 integrity). Each stage reuses an already
      // forcing-certified level's geometry via a namespaced clone (id 'G-Lx'), so it
      // inherits that level's solvability proof — no new forcing risk. Re-light a node
      // with EVERY function type to finish. The stub geometry below is never played
      // directly (render always resolves to the current stage clone); it only keeps
      // LEVELS-iterating code (level bar, unlock chain) total.
      id: 'L10', title: 'The Gauntlet', family: 'gauntlet',
      stages: ['L1', 'L3', 'L4', 'L5', 'L7', 'L8', 'L9'],
      world: { x0: 0, x1: 10, y0: 0, y1: 8 }, walls: [], gates: [], node: { x: 5, y: 4, r: 0.5 }, dx: 0.05,
      paramOrder: [], params: {},
      hint: 'The Gauntlet: one challenge from every function family, ordered to put your weakest first. Re-light a node with each — line, parabola, V, sine, exponential, logarithm, and cubic — to win.'
    }
  ];

  function levelById(id) { for (var i = 0; i < LEVELS.length; i++) { if (LEVELS[i].id === id) return LEVELS[i]; } return LEVELS[0]; }
  function levelIndex(id) { for (var i = 0; i < LEVELS.length; i++) { if (LEVELS[i].id === id) return i; } return 0; }

  function round1(n) { return Math.round(n * 10) / 10; }
  // Format a value at the precision of its slider STEP, so the readout/equation/
  // aria never freeze while a sub-0.1-step param (e.g. exp's b, step 0.025) is
  // tuned. (round1 stayed at 1 decimal and collapsed distinct states to one string.)
  function fmtVal(val, step) { var s = String(step); var d = s.indexOf('.') >= 0 ? s.length - s.indexOf('.') - 1 : 0; return Number(val).toFixed(d); }

  // Family evaluators — the only "weapons" in Phase 1.
  function fnY(family, p, x) {
    if (family === 'line') return p.m * x + p.b;
    if (family === 'absval') return p.a * Math.abs(x - p.h) + p.k; // absolute value (vertex form)
    if (family === 'sine') return p.a * Math.sin(p.b * x + p.c) + p.k; // sine: amplitude/frequency/phase/midline
    if (family === 'exp') return p.k + p.a * Math.exp(p.b * x); // exponential: floor k + a·e^(b·x); b<0 decays toward k
    if (family === 'log') return p.k + p.a * Math.log(x + p.c); // logarithm: concave slow climb; c>0 keeps x+c>0 over the world
    // cubic in TURNING-POINT form: y'(x) = a(x−p)(x−q), so the curve has its two
    // turning points exactly at x = p and x = q (local max then local min for a>0).
    // Integrating: y = a[ x³/3 − ½(p+q)x² + p·q·x ] + k. The player authors the two
    // turn positions (p, q) and the steepness (a); k is fixed per level.
    if (family === 'poly') return p.a * (x * x * x / 3 - (p.p + p.q) / 2 * x * x + p.p * p.q * x) + p.k;
    return p.a * (x - p.h) * (x - p.h) + p.k; // parabola (vertex form)
  }

  // Numeric central-difference derivative f'(x) for slope-gates (§3.2): the SAME
  // analytic-style slope the gate checks, the tangent tick draws, and the SR
  // readout announces — never a crude adjacent-sample secant.
  function fPrime(family, p, x) {
    var e = 0.001;
    return (fnY(family, p, x + e) - fnY(family, p, x - e)) / (2 * e);
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
        if (o.g.slope) {
          var slopeAt = fPrime(level.family, params, o.x);
          if (Math.abs(slopeAt - o.g.slope.value) > o.g.slope.tol) {
            return { result: 'slope', at: o.x, yAt: yo, slopeAt: slopeAt, obstacle: o.g, nodeDist: null, killedAt: { x: o.x, y: yo } };
          }
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
      if (fam === 'line') return 'Lift the beam over the wall — increase the slope (or the start height) so it clears y = ' + res.obstacle.height + '.';
      if (fam === 'absval') return 'Bend the V over the wall — raise the vertex height k, or move the vertex h toward x = ' + res.at + '.';
      if (fam === 'sine') return 'Reshape the wave — raise the amplitude a so a crest rises over the wall.';
      if (fam === 'exp') return 'Raise the start height a or the floor k so the curve clears the wall.';
      if (fam === 'log') return 'Raise the climb strength a or the offset k so the curve clears the wall.';
      if (fam === 'poly') return 'Reshape the cubic — increase the steepness a, or move the crest p / dip q so a rise clears the wall.';
      return 'Arc higher over the wall: raise the vertex height k, or move the vertex h toward x = ' + res.at + '.';
    }
    if (res.result === 'gate') {
      var tooHigh = res.yAt > res.obstacle.hi;
      if (fam === 'line') return tooHigh ? 'The beam is too high there — lower the start height b or reduce the slope.' : 'The beam is too low there — raise the start height b or increase the slope.';
      if (fam === 'absval') return tooHigh ? 'The beam is too high there — lower the vertex k, or move the vertex h so the V dips into the window.' : 'The beam is too low there — raise the vertex k, or steepen a so the arm climbs through the window.';
      if (fam === 'sine') return tooHigh ? 'The wave is too high at this window — reduce the amplitude a, or change the frequency b so a dip lands here.' : 'The wave is too low at this window — increase the amplitude a, or change the frequency b so a crest lands here.';
      if (fam === 'exp') return tooHigh ? 'The curve is too high here — lower the start height a, decay faster (more negative b), or lower the floor k.' : 'The curve is too low here — raise the start height a, decay slower (less negative b), or raise the floor k.';
      if (fam === 'log') return tooHigh ? 'The climb is too high here — lower the climb strength a, lower the shift c, or lower the offset k.' : 'The climb is too low here — raise the climb strength a, raise the shift c, or raise the offset k.';
      if (fam === 'poly') return tooHigh ? 'The wiggle sits too high here — nudge the crest p or the dip q toward this window, or ease the steepness a.' : 'The wiggle sits too low here — nudge the crest p or the dip q toward this window, or increase the steepness a.';
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
    if (res.result === 'slope') {
      return 'Through the opening at x = ' + res.at + ', but at the wrong angle — your beam’s slope there was ' + round1(res.slopeAt) +
        ', and this tilted gate needs about ' + res.obstacle.slope.value + ' (± ' + res.obstacle.slope.tol + '). ' +
        (res.slopeAt > res.obstacle.slope.value ? 'Make the beam descend more steeply as it passes through.' : 'Make the beam flatter (or climbing) as it passes through.');
    }
    return 'You reached the node’s street, but the beam missed it by ' + round1(res.nodeDist) +
      ' units. Fine-tune the controls so the beam meets (' + level.node.x + ', ' + level.node.y + ').';
  }

  // Escalating, ACTION-based celebration word for the big on-hit pop (never an
  // ability/mastery claim — it's about how clean THIS shot was). Decorative only;
  // the screen reader hears the full describeResult, not this.
  function successWord(shots) {
    return (shots || 0) <= 1 ? 'FIRST TRY!' : ((shots || 0) <= 3 ? 'NAILED IT!' : 'LIT!');
  }

  function describeEquation(level, p) {
    if (level.family === 'line') {
      return 'y = m·x + b, with m = ' + fmtVal(p.m, level.params.m.step) + ', b = ' + fmtVal(p.b, level.params.b.step) +
        '. A straight beam, slope ' + fmtVal(p.m, level.params.m.step) + ', starting at height ' + fmtVal(p.b, level.params.b.step) + '.';
    }
    if (level.family === 'absval') {
      var vshape = p.a < 0 ? 'an upside-down V' : (p.a > 0 ? 'a V' : 'a flat line');
      return 'y = a·|x − h| + k, with a = ' + fmtVal(p.a, level.params.a.step) + ', h = ' + fmtVal(p.h, level.params.h.step) + ', k = ' + fmtVal(p.k, level.params.k.step) +
        '. ' + vshape + '-shaped beam that bends at the vertex (' + fmtVal(p.h, level.params.h.step) + ', ' + fmtVal(p.k, level.params.k.step) + ').';
    }
    if (level.family === 'sine') {
      return 'y = a·sin(b·x + c) + k, with a = ' + fmtVal(p.a, level.params.a.step) + ', b = ' + fmtVal(p.b, level.params.b.step) + ', c = ' + fmtVal(p.c, level.params.c.step) + ', k = ' + fmtVal(p.k, level.params.k.step) +
        '. A wave of amplitude ' + fmtVal(p.a, level.params.a.step) + ' centered on the midline y = ' + fmtVal(p.k, level.params.k.step) +
        (p.b ? ', one full wave every ' + periodOf(p.b) + ' units.' : '.');
    }
    if (level.family === 'exp') {
      var ek = fmtVal(p.k, level.params.k.step);
      var etail = (p.b < 0)
        ? (p.a < 0 ? 'rising toward the ceiling y = ' + ek + ', which it approaches but never crosses' : 'decaying toward the floor y = ' + ek + ', which it approaches but never crosses')
        : 'growing away from the baseline y = ' + ek + ' (its starting level, not a limit it reaches)';
      return 'y = a·e^(b·x) + k, with a = ' + fmtVal(p.a, level.params.a.step) + ', b = ' + fmtVal(p.b, level.params.b.step) + ', k = ' + ek +
        '. An exponential ' + etail + '.';
    }
    if (level.family === 'log') {
      // Copy assumes a > 0 (L8's a slider is positive). Branch on sign like the
      // exp case if a future log level ever exposes a <= 0 (then it falls, not climbs).
      return 'y = a·ln(x + c) + k, with a = ' + fmtVal(p.a, level.params.a.step) + ', c = ' + fmtVal(p.c, level.params.c.step) + ', k = ' + fmtVal(p.k, level.params.k.step) +
        '. A logarithm — a concave climb that rises fast then slows (the mirror of exponential growth).';
    }
    if (level.family === 'poly') {
      return 'y = a·[x³⁄3 − ½(p+q)x² + p·q·x] + k, with a = ' + fmtVal(p.a, level.params.a.step) + ', p = ' + fmtVal(p.p, level.params.p.step) + ', q = ' + fmtVal(p.q, level.params.q.step) + ', k = ' + fmtVal(p.k, level.params.k.step) +
        '. A cubic with two turning points — it crests at x = ' + fmtVal(p.p, level.params.p.step) + ', dips at x = ' + fmtVal(p.q, level.params.q.step) + ', then rises again.';
    }
    var dir = p.a < 0 ? 'opening downward' : (p.a > 0 ? 'opening upward' : 'a flat line');
    return 'y = a(x − h)² + k, with a = ' + fmtVal(p.a, level.params.a.step) + ', h = ' + fmtVal(p.h, level.params.h.step) + ', k = ' + fmtVal(p.k, level.params.k.step) +
      '. A parabola ' + dir + ', vertex at (' + fmtVal(p.h, level.params.h.step) + ', ' + fmtVal(p.k, level.params.k.step) + ').';
  }

  function describeBoard(level) {
    if (level.family === 'gauntlet') return 'Arc City, ' + level.title + ': an adaptive capstone — one challenge from every function family, weakest first.';
    var s = 'Arc City, level: ' + level.title + '. ';
    s += level.family === 'line' ? 'Author a straight-line beam. ' : (level.family === 'absval' ? 'Author a V-shaped, absolute-value beam. ' : (level.family === 'sine' ? 'Author a sine-wave beam. ' : (level.family === 'exp' ? 'Author an exponential beam that curves toward a floor it never touches. ' : (level.family === 'log' ? 'Author a logarithmic beam — a concave climb that rises fast then slows. ' : (level.family === 'poly' ? 'Author a cubic beam — an S-shaped curve with two turning points, a crest then a dip, set by placing p and q. ' : 'Author a parabola beam. ')))));
    s += 'The dark node to light is at x ' + level.node.x + ', y ' + level.node.y + '. ';
    (level.walls || []).forEach(function (w) { s += 'A wall ' + w.height + ' units tall stands at x ' + w.x + '. '; });
    (level.gates || []).forEach(function (g) { s += 'A gate with an opening from y ' + g.lo + ' to ' + g.hi + ' is at x ' + g.x + (g.slope ? ', which the beam must pass while ' + (g.slope.value < 0 ? 'descending' : (g.slope.value > 0 ? 'climbing' : 'level')) + ' at a slope near ' + g.slope.value + ' (give or take ' + g.slope.tol + ')' : '') + '. '; });
    s += 'Aim the beam through any gates, over any walls, to reach the node.';
    return s;
  }

  // A level is unlocked if it's the first, or the previous level is solved. The
  // Gauntlet (capstone) is the exception: it unlocks once the player has solved
  // GAUNTLET_MIN_FAMILIES families — so the core path reaches it without first
  // clearing the reach levels (exp/log/cubic). It then sequences only what's solved.
  function isLevelUnlocked(byLevel, idx) {
    if (idx <= 0) return true;
    var lvl = LEVELS[idx];
    if (lvl && lvl.family === 'gauntlet') return solvedFamilies(byLevel, lvl.stages).length >= GAUNTLET_MIN_FAMILIES;
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
    { id: 'switchback', label: 'Switchback — re-lit a node using an absolute-value V' },
    { id: 'wave-rider', label: 'Wave Rider — re-lit a node using a sine wave' },
    { id: 'decay-rider', label: 'Decay Rider — re-lit a node riding an exponential to its asymptote' },
    { id: 'log-climber', label: 'Log Climber — re-lit a node riding a logarithm’s slowing climb' },
    { id: 'twin-turn', label: 'Twin Turn — re-lit a node by threading a cubic’s two turning points' },
    { id: 'tilt-threader', label: 'Tilt Threader — passed a tilted slope-gate at the right angle' },
    { id: 'sharp-shooter', label: 'Sharp Shooter — lit a node on the first shot' },
    { id: 'independent', label: 'Independent — solved with the preview hidden' },
    { id: 'grand-tour', label: 'Grand Tour — re-lit a node with every function family in the Gauntlet' }
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
    if (level.family === 'absval') add('switchback');
    if (level.family === 'sine') add('wave-rider');
    if (level.family === 'exp') add('decay-rider');
    if (level.family === 'log') add('log-climber');
    if (level.family === 'poly') add('twin-turn');
    if ((level.gates || []).some(function (g) { return g.slope; })) add('tilt-threader');
    if (shots === 1) add('sharp-shooter');
    if (solveIsIndependent(tier)) add('independent');
    return out;
  }

  // ── Snap a value to a param's grid (shared by sliders + drag). If the spec lists
  // snapValues, snap to the NEAREST of those (used for sine's whole-number periods,
  // §3.1 — b = 2π/P only ever lands on clean periods); otherwise snap to the step. ──
  function snapToRange(val, r) {
    if (r.snapValues && r.snapValues.length) {
      var best = r.snapValues[0], bd = Math.abs(val - best);
      for (var i = 1; i < r.snapValues.length; i++) { var d = Math.abs(val - r.snapValues[i]); if (d < bd) { bd = d; best = r.snapValues[i]; } }
      return best;
    }
    var v = Math.max(r.min, Math.min(r.max, val));
    var snapped = Math.round(v / r.step) * r.step;
    return Math.round(snapped * 1000) / 1000;
  }
  // The period (in world units) of a snapped sine frequency b = 2π/P, for display.
  function periodOf(b) { return b ? Math.round((2 * Math.PI) / b) : 0; }
  // Crest-grabber (§3.1): drag a peak → back-solve amplitude (height above midline)
  // and PHASE c so a crest lands at the dragged x (phase is spatial, not a number
  // hunt). b (period) and k (midline) stay as authored. Pure + testable.
  function sineCrestParams(worldX, worldY, level, b, k) {
    var a = snapToRange(worldY - k, level.params.a);
    var TAU = 2 * Math.PI;
    var c = ((Math.PI / 2 - b * worldX) % TAU + TAU) % TAU; // crest at worldX ⇒ b·x + c ≡ π/2
    return { a: a, c: snapToRange(c, level.params.c) };
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

  // ── Theme-aware accent palette (design §7.1): functional colors must pass
  // WCAG on each theme's canvas. The DEFAULT theme is LIGHT (#ffffff), so the
  // old fixed dark-substrate accents failed there — these palettes fix it.
  // Pure + testable; the golden master asserts each palette passes contrast. ──
  var THEME_CANVAS = { light: '#ffffff', dark: '#0f172a', contrast: '#000000' };
  function arcPalette(theme) {
    if (theme === 'contrast') return { accent: '#ffff00', nodeOff: '#ffffff', nodeOn: '#00ff00', gate: '#00ffff', wall: '#ffffff', warn: '#ffff00', danger: '#ff5555', btnText: '#000000' };
    if (theme === 'dark') return { accent: '#22d3ee', nodeOff: '#f0abfc', nodeOn: '#34d399', gate: '#a78bfa', wall: '#64748b', warn: '#fbbf24', danger: '#f87171', btnText: '#06262b' };
    return { accent: '#0e7490', nodeOff: '#c026d3', nodeOn: '#047857', gate: '#6d28d9', wall: '#475569', warn: '#b45309', danger: '#b91c1c', btnText: '#ffffff' }; // light (default :root / .theme-default)
  }

  // ── Teacher summary (design §9.5 / §9.2 / §9.4): deterministic, template-built
  // from logged events (NO AI verdict), anonymous, honest-language only. Captures
  // observed BEHAVIOR — never ability/mastery/score. The caveat is non-removable. ──
  var TEACHER_CAVEAT = 'These are observations of what this player did inside Arc City — which functions they used and how. They are NOT a test score, a grade, a measure of ability, or a prediction. Use them as one piece of formative evidence alongside your own observation.';
  function familyStatus(byLevel, family) {
    byLevel = byLevel || {};
    var anyIndep = false, anySolved = false, anyTried = false;
    for (var i = 0; i < LEVELS.length; i++) {
      var l = LEVELS[i]; if (l.family !== family) continue;
      var st = byLevel[l.id]; if (!st) continue;
      if (st.solved) { anySolved = true; if (st.independent) anyIndep = true; }
      if ((st.shots || 0) > 0 || (st.misses || 0) > 0) anyTried = true;
    }
    if (anyIndep) return 'used independently';
    if (anySolved) return 'used with scaffold';
    if (anyTried) return 'explored';
    return 'not started';
  }

  // ── The Gauntlet (L9): adaptive ORDER over the family stages (design §11). ──
  // "Adaptive" here = honest, transparent re-sequencing by demonstrated practice,
  // NOT a hidden difficulty knob (§9 integrity: no black-box manipulation, no
  // overclaim). Rank each stage by how far the player has gotten with its family
  // (never solved → explored → solved-with-scaffold → solved-independently) and
  // present the LEAST-practiced first, so the run leans into where the player is
  // weakest — and gauntletWhy() says so out loud. Deterministic; stable for ties.
  function gauntletRank(byLevel, stageId) {
    var lv = levelById(stageId); if (!lv) return 9;
    var st = familyStatus(byLevel, lv.family);
    return st === 'used independently' ? 3 : (st === 'used with scaffold' ? 2 : (st === 'explored' ? 1 : 0));
  }
  // A family belongs in the gauntlet only once the player has SOLVED it standalone —
  // the capstone replays what you've LEARNED, never a family you haven't met. This
  // keeps the run honest AND (with the unlock rule below) lets a core-path student
  // reach a right-sized gauntlet without first clearing the above-grade reach levels.
  var GAUNTLET_MIN_FAMILIES = 4; // the gauntlet unlocks once this many families are solved
  function solvedFamilies(byLevel, stageIds) {
    return (stageIds || []).filter(function (id) {
      var st = familyStatus(byLevel, levelById(id).family);
      return st === 'used with scaffold' || st === 'used independently';
    });
  }
  function gauntletOrder(byLevel, stageIds) {
    // only the families solved standalone, ordered weakest-of-those first (stable);
    // grows on a fresh run as the player learns more families.
    return solvedFamilies(byLevel, stageIds)
      .map(function (id, i) { return { id: id, r: gauntletRank(byLevel, id), i: i }; })
      .sort(function (a, b) { return a.r - b.r || a.i - b.i; })
      .map(function (o) { return o.id; });
  }
  function gauntletWhy(byLevel, stageId) {
    var lv = levelById(stageId); if (!lv) return '';
    var st = familyStatus(byLevel, lv.family);
    return st === 'used independently' ? 'you’ve solved this independently — here’s one more'
      : (st === 'used with scaffold' ? 'you’ve used this with the preview on — now try it your way'
        : (st === 'explored' ? 'you’d only explored this — let’s solidify it'
          : 'a family you haven’t solved yet — here’s your shot'));
  }
  // True once every stage's namespaced clone (byLevel['G-' + stageId]) is solved.
  // 'G-' is a fixed gauntlet-stage namespace, deliberately decoupled from the
  // gauntlet level's id so renumbering the level never disturbs saved run state.
  function gauntletComplete(byLevel, stageIds) {
    byLevel = byLevel || {};
    return (stageIds || []).length > 0 && (stageIds || []).every(function (sid) {
      var st = byLevel['G-' + sid]; return !!(st && st.solved);
    });
  }

  function teacherSummary(byLevel, badges) {
    byLevel = byLevel || {}; badges = badges || [];
    // The Gauntlet (family 'gauntlet') is a meta-level that replays the others
    // under namespaced 'G-*' state — it is NOT a node or a function family, so it
    // is excluded from the per-level list, the family roster, and the node count
    // (its completion is reported via the 'grand-tour' badge instead). Including it
    // would otherwise read "The Gauntlet: not started" forever and skew "N of M".
    var fnLevels = LEVELS.filter(function (l) { return l.family !== 'gauntlet'; });
    var levels = fnLevels.map(function (l) {
      var st = byLevel[l.id] || {};
      var status = st.solved ? 'completed' : (((st.shots || 0) > 0 || (st.misses || 0) > 0) ? 'explored' : 'not started');
      return { id: l.id, title: l.title, family: l.family, status: status, independent: !!st.independent, shots: st.shots || 0, exploredAdjustments: st.misses || 0 };
    });
    var families = {};
    fnLevels.map(function (l) { return l.family; }).filter(function (f, i, a) { return a.indexOf(f) === i; }).forEach(function (f) { families[f] = familyStatus(byLevel, f); });
    var nodesReLit = levels.filter(function (l) { return l.status === 'completed'; }).length;
    return { caveat: TEACHER_CAVEAT, families: families, levels: levels, nodesReLit: nodesReLit, totalLevels: fnLevels.length, badges: badges.map(badgeLabel) };
  }
  function teacherSummaryText(summary) {
    var lines = ['Arc City — progress summary', '', summary.caveat, '', 'Nodes re-lit: ' + summary.nodesReLit + ' of ' + summary.totalLevels, '', 'Functions:'];
    Object.keys(summary.families).forEach(function (f) { lines.push('  - ' + f + ': ' + summary.families[f]); });
    lines.push(''); lines.push('Levels:');
    summary.levels.forEach(function (l) {
      var bit = l.status;
      if (l.status === 'completed') bit += l.independent ? ' (independently)' : ' (with live preview)';
      if (l.status !== 'not started') bit += ' — ' + l.shots + ' shot' + (l.shots === 1 ? '' : 's') + ' (' + l.exploredAdjustments + ' missed)';
      lines.push('  - ' + l.title + ': ' + bit);
    });
    if (summary.badges.length) { lines.push(''); lines.push('Badges: ' + summary.badges.join(', ')); }
    return lines.join('\n');
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
    fPrime: fPrime,
    describeEquation: describeEquation,
    describeResult: describeResult,
    successWord: successWord,
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
    linePivotParams: linePivotParams,
    sineCrestParams: sineCrestParams,
    periodOf: periodOf,
    fmtVal: fmtVal,
    THEME_CANVAS: THEME_CANVAS,
    arcPalette: arcPalette,
    TEACHER_CAVEAT: TEACHER_CAVEAT,
    familyStatus: familyStatus,
    gauntletOrder: gauntletOrder,
    gauntletWhy: gauntletWhy,
    gauntletComplete: gauntletComplete,
    teacherSummary: teacherSummary,
    teacherSummaryText: teacherSummaryText
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
      // success-celebration elements are invisible / un-transformed unless the
      // (reduced-motion-gated) animation reveals them — so reduced-motion is calm.
      '#allo-arccity-root .arccity-burst,#allo-arccity-root .arccity-sparks,#allo-arccity-root .arccity-shock,#allo-arccity-root .arccity-pop{transform-box:fill-box;transform-origin:center;opacity:0;}' +
      '#allo-arccity-root .arccity-ember{transform-box:fill-box;transform-origin:center;opacity:0;}' +
      '#allo-arccity-root .arccity-node-lit{transform-box:fill-box;transform-origin:center;}' +
      '@keyframes arccityPulse{0%,100%{opacity:1;}50%{opacity:.5;}}' +
      '@keyframes arccityBurst{0%{transform:scale(.3);opacity:.9;}100%{transform:scale(2.7);opacity:0;}}' +
      '@keyframes arccityShock{0%{transform:scale(.4);opacity:.6;}100%{transform:scale(4.2);opacity:0;}}' +
      '@keyframes arccityHalo{0%,100%{opacity:.28;}50%{opacity:.12;}}' +
      '@keyframes arccitySparks{0%{transform:scale(.4);opacity:.95;}100%{transform:scale(1.9);opacity:0;}}' +
      '@keyframes arccityEmber{0%{transform:translateY(0) scale(1);opacity:.9;}100%{transform:translateY(-32px) scale(.3);opacity:0;}}' +
      // node power-on punch (squash → overshoot → settle) the instant it lights
      '@keyframes arccityNodePop{0%{transform:scale(.55);}55%{transform:scale(1.22);}100%{transform:scale(1);}}' +
      // big celebration word: snap in, hold, fade
      '@keyframes arccityPop{0%{transform:scale(.5);opacity:0;}22%{transform:scale(1.18);opacity:1;}72%{transform:scale(1);opacity:1;}100%{transform:scale(1);opacity:0;}}' +
      // gates flash bright the moment the beam threads them all
      '@keyframes arccityGateLit{0%{opacity:.35;}45%{opacity:1;}100%{opacity:.85;}}' +
      // beam draws on from the source when fired (dashoffset along its own length)
      '@keyframes arccityBeamDraw{from{stroke-dashoffset:100;}to{stroke-dashoffset:0;}}' +
      // ALL motion is opt-in: nothing animates when the user prefers reduced motion.
      '@media (prefers-reduced-motion: no-preference){' +
      '#allo-arccity-root .arccity-node-unlit{animation:arccityPulse 1.8s ease-in-out infinite;}' +
      '#allo-arccity-root .arccity-node-lit{animation:arccityNodePop .5s cubic-bezier(.34,1.56,.64,1);}' +
      '#allo-arccity-root .arccity-burst{animation:arccityBurst .65s ease-out forwards;}' +
      '#allo-arccity-root .arccity-shock{animation:arccityShock .6s ease-out forwards;}' +
      '#allo-arccity-root .arccity-sparks{animation:arccitySparks .55s ease-out forwards;}' +
      '#allo-arccity-root .arccity-ember{animation:arccityEmber .8s ease-out forwards;}' +
      '#allo-arccity-root .arccity-pop{animation:arccityPop 1.1s ease-out forwards;}' +
      '#allo-arccity-root .arccity-gate-lit{animation:arccityGateLit .5s ease-out;}' +
      '#allo-arccity-root .arccity-halo{animation:arccityHalo 2.6s ease-in-out infinite;}' +
      '#allo-arccity-root .arccity-beam-draw{animation:arccityBeamDraw .5s ease-out;}' +
      '}';
    document.head.appendChild(st);
  })();

  function announceArc(ctx, msg) {
    try { var el = document.getElementById('allo-live-arccity'); if (el) el.textContent = msg; } catch (e) { }
    try { if (ctx && typeof ctx.announceToSR === 'function') ctx.announceToSR(msg); } catch (e) { }
  }

  function clampStep(val, r) { return snapToRange(val, r); }

  // Detect the active theme by class (default :root / .theme-default = light).
  function arcTheme() {
    try {
      if (document.querySelector('.theme-contrast')) return 'contrast';
      if (document.querySelector('.theme-dark')) return 'dark';
    } catch (e) { }
    return 'light';
  }

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

  // ── Audio: OFF by default (§7.3), always redundant to the text/announce,
  // max gain ~0.1, never autoplay, fully try/catch (no AudioContext → no-op). ──
  var _arcAC = null;
  function getArcAC() {
    try {
      if (!_arcAC && (window.AudioContext || window.webkitAudioContext)) _arcAC = new (window.AudioContext || window.webkitAudioContext)();
      if (_arcAC && _arcAC.state === 'suspended') { try { _arcAC.resume(); } catch (e) { } }
    } catch (e) { _arcAC = null; }
    return _arcAC;
  }
  function arcTone(freq, dur, type, vol, delay) {
    var ac = getArcAC(); if (!ac) return;
    try {
      var t0 = ac.currentTime + (delay || 0);
      var o = ac.createOscillator(), g = ac.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(Math.min(0.1, vol == null ? 0.06 : vol), t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + (dur || 0.12));
      o.connect(g); g.connect(ac.destination);
      o.start(t0); o.stop(t0 + (dur || 0.12) + 0.02);
    } catch (e) { }
  }
  function sfxFire() {
    var ac = getArcAC(); if (!ac) return;
    try {
      var o = ac.createOscillator(), g = ac.createGain();
      o.type = 'triangle'; o.frequency.setValueAtTime(420, ac.currentTime); o.frequency.exponentialRampToValueAtTime(720, ac.currentTime + 0.12);
      g.gain.setValueAtTime(0.06, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.16);
      o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.18);
    } catch (e) { }
  }
  function sfxHit() { arcTone(660, 0.12, 'sine', 0.07, 0.16); arcTone(990, 0.16, 'sine', 0.07, 0.27); }   // pleasant two-note chime
  function sfxBlock() { arcTone(150, 0.16, 'sine', 0.08, 0.16); }                                          // soft low thud

  // ══════════════════════════════════════════════════════════════════════
  // Registration + render
  // ══════════════════════════════════════════════════════════════════════
  window.StemLab.registerTool('arccity', {
    icon: '🌆', // 🌆
    label: 'Arc City',
    desc: 'Author functions to fire light-beams, clear walls, and re-light a neon city.',
    color: 'fuchsia',
    category: 'strategy',
    render: function (ctx) {
      var React = ctx && ctx.React;
      if (!React) { return null; }
      var h = React.createElement;
      try {
        var toolData = ctx.toolData || {};
        var setToolData = ctx.setToolData;
        var t = ctx.t || function (k, d) { return d || k; };

        // Render the board immediately from an inline default; persist the initial
        // state in the background. This previously returned a "Loading…" placeholder
        // and gated the first board render on a setToolData round-trip — but that
        // setState runs DURING render, so the host defers it (setTimeout via
        // _renderingFlag), which left the tool STUCK on "Loading…". Reading a default
        // inline (the same pattern Dino Lab uses) renders the board on the first
        // pass; interactions still persist via the event-handler setToolData calls.
        var S = toolData._arccity || { levelId: 'L1', fired: false, byLevel: {}, tier: 'practice', badges: [] };
        if (!toolData._arccity && typeof setToolData === 'function') {
          setToolData(function (prev) {
            if (prev && prev._arccity) return prev;
            return Object.assign({}, prev, { _arccity: { levelId: 'L1', fired: false, byLevel: {}, tier: 'practice', badges: [] } });
          });
        }
        var byLevel = S.byLevel || {};
        // ── Level resolution. For the Gauntlet (L9) the EFFECTIVE level is the
        // current stage's geometry, cloned under a namespaced id ('G-Lx') so every
        // downstream updater/byLevel key/classifyShot works unchanged — the gauntlet
        // is pure orchestration on top of the existing one-family-per-level machine. ──
        var rawLevel = levelById(S.levelId || 'L1');
        var gauntlet = null;
        var level;
        if (rawLevel.family === 'gauntlet') {
          var gIdx = (S.gauntlet && typeof S.gauntlet.idx === 'number') ? S.gauntlet.idx : 0;
          if (gIdx < 0) gIdx = 0;
          // Fresh run (idx 0): RE-EVALUATE the adaptive order against the player's
          // CURRENT standalone history, so re-entering after progress made elsewhere
          // reflects it (honours the "adaptive" contract). Mid-run (idx>0): keep the
          // cached order so stages never reorder under the player. resetGauntlet()
          // rebuilds then sets idx 0, which this path then re-evaluates.
          var gOrder = (gIdx > 0 && S.gauntlet && S.gauntlet.order && S.gauntlet.order.length)
            ? S.gauntlet.order
            : gauntletOrder(byLevel, rawLevel.stages);
          if (!gOrder.length) {
            // No solved families to sequence (only reachable via odd state — the
            // unlock rule needs >= GAUNTLET_MIN_FAMILIES). Show a gentle note instead
            // of resolving a phantom stage.
            gauntlet = { order: [], idx: 0, total: 0, stageId: null, why: '', empty: true };
            level = rawLevel;
          } else {
            if (gIdx > gOrder.length - 1) gIdx = gOrder.length - 1;
            var gStageId = gOrder[gIdx];
            level = Object.assign({}, levelById(gStageId), { id: 'G-' + gStageId });
            gauntlet = { order: gOrder, idx: gIdx, total: gOrder.length, stageId: gStageId, why: gauntletWhy(byLevel, gStageId) };
            // Persist the adaptive order once (built from the player's standalone
            // history at entry), so it stays stable across renders/sessions.
            if ((!S.gauntlet || !S.gauntlet.order) && typeof setToolData === 'function') {
              setToolData(function (prev) {
                var cur = (prev && prev._arccity) || S;
                if (cur.gauntlet && cur.gauntlet.order) return prev;
                return Object.assign({}, prev, { _arccity: Object.assign({}, cur, { gauntlet: { order: gOrder, idx: 0 } }) });
              });
            }
          }
        } else {
          level = rawLevel;
        }
        var lIdx = levelIndex(level.id);
        var rawLS = byLevel[level.id];
        var ls = (rawLS && rawLS.params) ? rawLS : { params: defaultParams(level), shots: 0, solved: false, misses: 0 };
        var P = Object.assign({}, ls.params);
        var res = classifyShot(level, P);
        // The Gauntlet LOCKS to the independent (preview-hidden-until-Fire) tier so
        // every stage is solved by prediction — the Grand Tour run is genuinely
        // preview-hidden, not a fished result. The proactive miss hint (>= HINT_AFTER
        // misses) still fires, so it stays humane, not punitive.
        var tier = gauntlet ? 'independent' : (S.tier || 'practice');
        var badges = S.badges || [];
        var showPreview = previewVisible(tier, S.fired);
        var indepSolved = !!(ls && ls.independent);
        var view = S.view || 'play';
        var exportEnabled = !!S.exportEnabled;
        var muted = S.muted !== false; // audio OFF by default (§7.3)

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
          // §9.2: "used independently" requires hidden-preview tier (a/c) AND no
          // directive hint used (b). The hint shows at >= HINT_AFTER misses, so a
          // solve after that many misses is hint-assisted → not counted independent.
          var indep = r.result === 'hit' && solveIsIndependent(tier) && (ls.misses || 0) < HINT_AFTER;
          // Grand Tour: only on the final stage's solve — and the gauntlet only
          // advances on a solve, so reaching the last index means every prior
          // family was already re-lit (no false award).
          if (gauntlet && r.result === 'hit' && gauntlet.idx === gauntlet.total - 1 && badges.indexOf('grand-tour') === -1 && newBadges.indexOf('grand-tour') === -1) newBadges.push('grand-tour');
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
            if (gauntlet) {
              msg += gauntlet.idx < gauntlet.total - 1
                ? ' ' + t('arccity.stage_cleared', 'Stage cleared — press Next challenge.')
                : ' ' + t('arccity.gauntlet_complete', 'Gauntlet complete — you re-lit a node with every function family!');
            } else if (lIdx < LEVELS.length - 1) {
              msg += ' ' + t('arccity.unlocked', 'Next level unlocked!');
            }
            if (newBadges.length) msg += ' ' + t('arccity.badge', 'Badge earned: ') + newBadges.map(badgeLabel).join(', ') + '.';
          }
          announceArc(ctx, msg);
          if (!muted) { try { sfxFire(); if (r.result === 'hit') sfxHit(); else sfxBlock(); } catch (e) { } }
          // Subtle haptic punch on a hit (mobile), unless the user prefers reduced motion.
          if (r.result === 'hit') { try { var rm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; if (!rm && navigator.vibrate) navigator.vibrate(14); } catch (e) { } }
        }
        function advanceGauntlet() {
          if (typeof setToolData !== 'function' || !gauntlet) return;
          var ni = Math.min(gauntlet.idx + 1, gauntlet.total - 1);
          setToolData(function (prev) {
            var cur = (prev && prev._arccity) || S;
            // Persist the render's CURRENT order (the fresh idx-0 evaluation) so the
            // rest of the run is frozen to what the player just started on.
            // _focusFire: move keyboard focus to the Fire button after this re-render
            // (the Next button the user just clicked is gone — otherwise focus drops
            // to <body>). focusFireRef clears the flag once it has focused.
            return Object.assign({}, prev, { _arccity: Object.assign({}, cur, { gauntlet: { order: gauntlet.order, idx: ni }, fired: false, _focusFire: true }) });
          });
          var nextLv = levelById(gauntlet.order[ni]);
          announceArc(ctx, t('arccity.challenge', 'Challenge') + ' ' + (ni + 1) + ' / ' + gauntlet.total + ': ' + nextLv.title + '. ' + describeBoard(nextLv));
        }
        function resetGauntlet() {
          if (typeof setToolData !== 'function' || !gauntlet) return;
          setToolData(function (prev) {
            var cur = (prev && prev._arccity) || S;
            // Clear only this run's per-stage clone state ('G-*'); standalone level
            // progress (which drives the adaptive order) is untouched, so the fresh
            // order is RE-EVALUATED against the player's current standalone history.
            var bl = Object.assign({}, cur.byLevel || {});
            Object.keys(bl).forEach(function (k) { if (k.indexOf('G-') === 0) delete bl[k]; });
            var fresh = gauntletOrder(bl, rawLevel.stages);
            return Object.assign({}, prev, { _arccity: Object.assign({}, cur, { byLevel: bl, gauntlet: { order: fresh, idx: 0 }, fired: false, _focusFire: true }) });
          });
          announceArc(ctx, t('arccity.gauntlet_restarted', 'Gauntlet restarted — a fresh run, preview hidden. Predict, then Fire.'));
        }
        // Ref on the Fire button: when a control that just vanished (Next/Restart) set
        // _focusFire, move focus here so keyboard users aren't dropped to <body>, then
        // clear the flag (a post-commit callback, so this setToolData is safe).
        function focusFireRef(el) {
          if (!el || !S._focusFire || typeof setToolData !== 'function') return;
          try { el.focus(); } catch (e) { }
          setToolData(function (prev) {
            var cur = (prev && prev._arccity) || S;
            if (!cur._focusFire) return prev;
            return Object.assign({}, prev, { _arccity: Object.assign({}, cur, { _focusFire: false }) });
          });
        }
        function toggleMute() {
          if (typeof setToolData !== 'function') return;
          setToolData(function (prev) {
            var cur = (prev && prev._arccity) || S;
            return Object.assign({}, prev, { _arccity: Object.assign({}, cur, { muted: !(cur.muted !== false) }) });
          });
          announceArc(ctx, muted ? t('arccity.sound_on', 'Sound on.') : t('arccity.sound_off', 'Sound off.'));
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
        function setView(v) {
          if (typeof setToolData !== 'function') return;
          setToolData(function (prev) {
            var cur = (prev && prev._arccity) || S;
            return Object.assign({}, prev, { _arccity: Object.assign({}, cur, { view: v }) });
          });
          announceArc(ctx, v === 'teacher' ? t('arccity.view_teacher', 'Teacher view.') : t('arccity.view_play', 'Play view.'));
        }
        function toggleExport() {
          if (typeof setToolData !== 'function') return;
          setToolData(function (prev) {
            var cur = (prev && prev._arccity) || S;
            return Object.assign({}, prev, { _arccity: Object.assign({}, cur, { exportEnabled: !cur.exportEnabled }) });
          });
        }
        function copySummary() {
          if (!exportEnabled) { announceArc(ctx, t('arccity.export_disabled', 'Enable export first.')); return; }
          try {
            var txt = teacherSummaryText(teacherSummary(byLevel, badges));
            if (window.navigator && window.navigator.clipboard && window.navigator.clipboard.writeText) window.navigator.clipboard.writeText(txt);
            announceArc(ctx, t('arccity.copied', 'Summary copied to clipboard.'));
          } catch (e) { announceArc(ctx, t('arccity.copy_fail', 'Copy failed — select and copy the summary text manually.')); }
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
          var handleEl = evt.currentTarget;
          var svgEl = handleEl && handleEl.ownerSVGElement;
          if (!svgEl) return;
          // Capture the pointer so a fast or touch drag that leaves the small handle
          // keeps delivering move events (prevents the drag "dropping" on mobile).
          try { if (handleEl.setPointerCapture && evt.pointerId != null) handleEl.setPointerCapture(evt.pointerId); } catch (e) { }
          function move(ev) { var w = svgWorldFromEvent(svgEl, ev); if (w) setParamsMulti(computeParams(w.x, w.y)); }
          function up(ev) {
            try { if (handleEl.releasePointerCapture && ev && ev.pointerId != null) handleEl.releasePointerCapture(ev.pointerId); } catch (e) { }
            try { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); } catch (e) { }
          }
          try { window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); } catch (e) { }
        }

        // Fallbacks match the DEFAULT (light) theme — if the host CSS var is ever
        // missing (tool mounted before/outside the themed container), we're almost
        // certainly in that default context, so INK must be DARK (#0f172a) to stay
        // legible on the white canvas. A light fallback (#e2e8f0) was invisible there.
        var INK = 'var(--allo-stem-text, #0f172a)';
        var GRID = 'var(--allo-stem-border, #94a3b8)';
        var THEME = arcTheme();
        var PAL = arcPalette(THEME);
        var BEAM = PAL.accent, NODE_OFF = PAL.nodeOff, NODE_ON = PAL.nodeOn, GATE = PAL.gate, WALL = PAL.wall;

        // ── Neon-city atmosphere (decorative, aria-hidden, theme-aware). Glow filters
        // only ADD a halo around the beam/node/gates — the cores keep their tested
        // colours, so contrast is never reduced. The sky stays within a hair of the
        // canvas colour on the light theme (and contrast theme keeps a plain canvas)
        // so the WCAG-verified palette contrast holds. ──
        var SKY = THEME === 'dark' ? [['0%', '#141c38'], ['55%', '#0a0e1c'], ['100%', '#05070f']]
          : (THEME === 'contrast' ? null
            : [['0%', '#ffffff'], ['72%', '#f6f9fc'], ['100%', '#eef3f9']]);
        var defs = h('defs', { key: 'defs' },
          h('filter', { key: 'g', id: 'arc-glow', x: '-30%', y: '-30%', width: '160%', height: '160%' },
            h('feGaussianBlur', { key: 'b', stdDeviation: 2.4, result: 'gb' }),
            h('feMerge', { key: 'm' }, h('feMergeNode', { key: 'n1', in: 'gb' }), h('feMergeNode', { key: 'n2', in: 'SourceGraphic' }))),
          h('filter', { key: 'gs', id: 'arc-glow-strong', x: '-70%', y: '-70%', width: '240%', height: '240%' },
            h('feGaussianBlur', { key: 'b', stdDeviation: 4.5, result: 'gb' }),
            h('feMerge', { key: 'm' }, h('feMergeNode', { key: 'n1', in: 'gb' }), h('feMergeNode', { key: 'n2', in: 'SourceGraphic' }))),
          SKY ? h('radialGradient', { key: 'sky', id: 'arc-sky', cx: '50%', cy: '40%', r: '78%' },
            SKY.map(function (s, i) { return h('stop', { key: 'st' + i, offset: s[0], stopColor: s[1] }); })) : null,
          THEME === 'dark' ? h('linearGradient', { key: 'hz', id: 'arc-horizon', x1: '0', y1: '0', x2: '0', y2: '1' },
            h('stop', { key: 'h0', offset: '0%', stopColor: BEAM, stopOpacity: 0 }),
            h('stop', { key: 'h1', offset: '100%', stopColor: BEAM, stopOpacity: 0.2 })) : null);
        var backdropEls = [];
        if (SKY) backdropEls.push(h('rect', { key: 'backdrop', x: 0, y: 0, width: W, height: H, fill: 'url(#arc-sky)', 'aria-hidden': 'true' }));
        if (THEME === 'dark') backdropEls.push(h('rect', { key: 'horizon', x: 0, y: H * 0.6, width: W, height: H * 0.4, fill: 'url(#arc-horizon)', 'aria-hidden': 'true' }));
        // Faint distant city skyline along the bottom (dark theme only — decorative,
        // aria-hidden, low-opacity so it never competes with the grid/gameplay above).
        if (THEME === 'dark') {
          var bld = [[0, 46, 26], [42, 30, 40], [78, 60, 20], [104, 40, 34], [150, 34, 52], [198, 54, 24], [228, 30, 44], [264, 64, 18], [296, 38, 36], [344, 30, 50], [390, 56, 22], [422, 34, 40], [462, 48, 30], [506, 30, 46], [542, 62, 20], [578, 36, 38], [612, 28, 48]];
          bld.forEach(function (b, i) { backdropEls.push(h('rect', { key: 'bld' + i, x: b[0], y: H - b[2], width: b[1] - 2, height: b[2], fill: '#0d1530', opacity: 0.55, 'aria-hidden': 'true' })); });
        }

        var gridEls = [];
        for (var gx = 0; gx <= 10; gx++) gridEls.push(h('line', { key: 'gx' + gx, x1: sx(gx), y1: sy(wy0), x2: sx(gx), y2: sy(wy1), stroke: GRID, strokeWidth: gx === 0 ? 1.5 : 0.5, opacity: gx === 0 ? 0.9 : 0.4 }));
        for (var gy = 0; gy <= 8; gy++) gridEls.push(h('line', { key: 'gy' + gy, x1: sx(wx0), y1: sy(gy), x2: sx(wx1), y2: sy(gy), stroke: GRID, strokeWidth: gy === 0 ? 1.5 : 0.5, opacity: gy === 0 ? 0.9 : 0.4 }));

        // Gates IGNITE green the moment the beam threads them all (a solved board
        // turns success-green) — ties the visceral payoff straight to the math.
        var litNow = ls.solved || res.result === 'hit';
        var gateFill = litNow ? NODE_ON : GATE;
        var gateCls = litNow ? 'arccity-gate-lit' : '';
        var gateKey = litNow ? 'on' : 'off';
        var obstacleEls = [];
        (level.walls || []).forEach(function (w, i) {
          obstacleEls.push(h('rect', { key: 'wall' + i, x: sx(w.x) - 4, y: sy(w.height), width: 8, height: sy(0) - sy(w.height), fill: WALL, rx: 2, filter: 'url(#arc-glow)' }));
        });
        (level.gates || []).forEach(function (g, i) {
          obstacleEls.push(h('rect', { key: 'gateLo' + i + gateKey, x: sx(g.x) - 4, y: sy(g.lo), width: 8, height: sy(0) - sy(g.lo), fill: gateFill, opacity: 0.85, rx: 2, filter: 'url(#arc-glow)', className: gateCls }));
          obstacleEls.push(h('rect', { key: 'gateHi' + i + gateKey, x: sx(g.x) - 4, y: sy(wy1), width: 8, height: sy(g.hi) - sy(wy1), fill: gateFill, opacity: 0.85, rx: 2, filter: 'url(#arc-glow)', className: gateCls }));
          if (g.slope) { // tangent tick showing the required entry slope (the "tilt")
            var smy = (g.lo + g.hi) / 2, sdx = 0.9;
            obstacleEls.push(h('line', { key: 'gslope' + i, x1: sx(g.x - sdx), y1: sy(smy - g.slope.value * sdx), x2: sx(g.x + sdx), y2: sy(smy + g.slope.value * sdx), stroke: PAL.warn, strokeWidth: 2.5, strokeDasharray: '5 3', strokeLinecap: 'round' }));
          }
        });

        var nodeR = (W / (wx1 - wx0)) * level.node.r;
        var lit = ls.solved || res.result === 'hit';
        var ncx = sx(level.node.x), ncy = sy(level.node.y);
        // The node "powers on" with a squash-overshoot punch the instant it lights
        // (key flips on lit ⇒ remount ⇒ the one-shot pop plays exactly once).
        var nodeEl = h('circle', {
          key: 'node-' + (lit ? 'on' : 'off'), cx: ncx, cy: ncy, r: nodeR,
          fill: lit ? NODE_ON : NODE_OFF, opacity: lit ? 1 : 0.85,
          filter: lit ? 'url(#arc-glow-strong)' : 'url(#arc-glow)',
          className: lit ? 'arccity-node-lit' : 'arccity-node-unlit', stroke: lit ? NODE_ON : NODE_OFF, strokeWidth: 2
        });
        // Soft halo behind a lit node; full celebration the moment a shot lands.
        var nodeGlowEls = lit ? [h('circle', { key: 'nodehalo', cx: ncx, cy: ncy, r: nodeR * 1.9, fill: NODE_ON, opacity: 0.24, filter: 'url(#arc-glow-strong)', className: 'arccity-halo', 'aria-hidden': 'true' })] : [];
        var sk = ls.shots || 0; // celebration els key off the shot count → replay on every hit
        var nodeBurstEls = (S.fired && res.result === 'hit') ? [
          h('circle', { key: 'shock-' + sk, cx: ncx, cy: ncy, r: nodeR, fill: 'none', stroke: NODE_ON, strokeWidth: 4, className: 'arccity-shock', 'aria-hidden': 'true' }),
          h('circle', { key: 'burst-' + sk, cx: ncx, cy: ncy, r: nodeR, fill: 'none', stroke: NODE_ON, strokeWidth: 3, className: 'arccity-burst', 'aria-hidden': 'true' }),
          // sparks: 8 short rays bursting outward
          h('g', { key: 'sparks-' + sk, className: 'arccity-sparks', 'aria-hidden': 'true' },
            [0, 45, 90, 135, 180, 225, 270, 315].map(function (deg, i) {
              var rad = deg * Math.PI / 180, r0 = nodeR * 1.1, r1 = nodeR * 1.9;
              return h('line', { key: 'spk' + i, x1: ncx + Math.cos(rad) * r0, y1: ncy + Math.sin(rad) * r0, x2: ncx + Math.cos(rad) * r1, y2: ncy + Math.sin(rad) * r1, stroke: NODE_ON, strokeWidth: 2.5, strokeLinecap: 'round' });
            })),
          // embers drifting up from the node
          h('g', { key: 'embers-' + sk, 'aria-hidden': 'true' },
            [-2, -1, 0, 1, 2].map(function (d, i) {
              return h('circle', { key: 'ember' + i, cx: ncx + d * nodeR * 0.55, cy: ncy - nodeR * 0.3, r: Math.max(2, nodeR * 0.18), fill: NODE_ON, className: 'arccity-ember', style: { animationDelay: (i * 0.05) + 's' } });
            })),
          // big celebration word, escalating with how clean the solve was (action-praise, not ability)
          h('text', { key: 'pop-' + sk, x: W / 2, y: 54, textAnchor: 'middle', fill: NODE_ON, fontSize: 34, fontWeight: 900, className: 'arccity-pop', 'aria-hidden': 'true', style: { letterSpacing: '1px', paintOrder: 'stroke', stroke: 'rgba(2,8,6,0.35)', strokeWidth: 3 } }, successWord(sk))
        ] : [];

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
          overlay.push(h('polyline', { key: 'beam-' + (ls.shots || 0), ref: beamRef, points: ptsStr(function (pt) { return pt.x <= killX + 0.0001; }), fill: 'none', stroke: res.result === 'hit' ? NODE_ON : BEAM, strokeWidth: 3.5, strokeLinecap: 'round', filter: 'url(#arc-glow)', pathLength: 100, strokeDasharray: 100, className: 'arccity-beam-draw' }));
          if (res.killedAt) {
            var kx = sx(res.killedAt.x), ky = sy(res.killedAt.y), mk = 7;
            overlay.push(h('line', { key: 'kx1', x1: kx - mk, y1: ky - mk, x2: kx + mk, y2: ky + mk, stroke: PAL.danger, strokeWidth: 3, strokeLinecap: 'round' }));
            overlay.push(h('line', { key: 'kx2', x1: kx - mk, y1: ky + mk, x2: kx + mk, y2: ky - mk, stroke: PAL.danger, strokeWidth: 3, strokeLinecap: 'round' }));
          }
        }

        // ── Drag handles (Practice tier only: the concrete scaffold. Never on
        // hidden-preview tiers, so they can't undercut the integrity gate). The
        // handle shares the equation's accent color = the always-on co-highlight. ──
        var HANDLE = BEAM;
        var handleEls = [];
        if (tier === 'practice') {
          if (level.family === 'parabola' || level.family === 'absval') {
            handleEls.push(h('circle', {
              key: 'vh', cx: sx(P.h), cy: sy(P.k), r: 9, fill: HANDLE, opacity: 0.95, stroke: '#06262b', strokeWidth: 2,
              style: { cursor: 'grab' }, 'aria-hidden': 'true',
              onPointerDown: function (e) { startHandleDrag(e, function (wx, wy) { return parabolaVertexParams(wx, wy, level); }); }
            }));
            handleEls.push(h('text', { key: 'vhl', x: sx(P.h) + 12, y: sy(P.k) - 8, fill: HANDLE, fontSize: 11, 'aria-hidden': 'true' }, 'vertex (h, k)'));
          } else if (level.family === 'line' && level.params.b && level.params.b.locked) {
            var xH = level.node.x, yH = fnY('line', P, xH);
            handleEls.push(h('circle', {
              key: 'lh', cx: sx(xH), cy: sy(yH), r: 9, fill: HANDLE, opacity: 0.95, stroke: '#06262b', strokeWidth: 2,
              style: { cursor: 'grab' }, 'aria-hidden': 'true',
              onPointerDown: function (e) { startHandleDrag(e, function (wx, wy) { return linePivotParams(xH, wy, 0, 0, level); }); }
            }));
          } else if (level.family === 'line') {
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
          } else if (level.family === 'sine') {
            // Crest-grabber (§3.1): a handle on the first visible peak. Drag it up/down
            // to set amplitude, left/right to set phase so a crest lands where you drop it.
            var TAU = 2 * Math.PI;
            var xc = (Math.PI / 2 - P.c) / P.b; // first crest of a·sin(b·x+c)+k
            while (xc < wx0) xc += TAU / P.b;
            while (xc > wx1) xc -= TAU / P.b;
            var yc = P.k + P.a;
            handleEls.push(h('circle', {
              key: 'sh', cx: sx(xc), cy: sy(yc), r: 9, fill: HANDLE, opacity: 0.95, stroke: '#06262b', strokeWidth: 2,
              style: { cursor: 'grab' }, 'aria-hidden': 'true',
              onPointerDown: function (e) { startHandleDrag(e, function (wx, wy) { return sineCrestParams(wx, wy, level, P.b, P.k); }); }
            }));
            handleEls.push(h('text', { key: 'shl', x: sx(xc) + 12, y: sy(yc) - 8, fill: HANDLE, fontSize: 11, 'aria-hidden': 'true' }, 'crest — drag onto a window'));
          }
        }

        // Ghost target dots (§3.1): on the scaffold tier, mark each window's centre so
        // the crest-grabber has a visible target to drop a peak/trough onto.
        var ghostEls = [];
        if (tier === 'practice' && level.family === 'sine') {
          (level.gates || []).forEach(function (g, i) {
            ghostEls.push(h('circle', { key: 'ghost-' + i, cx: sx(g.x), cy: sy((g.lo + g.hi) / 2), r: 4, fill: 'none', stroke: HANDLE, strokeWidth: 1.5, strokeDasharray: '2 2', opacity: 0.6, 'aria-hidden': 'true' }));
          });
        }

        var svg = (gauntlet && gauntlet.empty) ? null : h('svg', {
          key: 'svg', viewBox: '0 0 ' + W + ' ' + H, width: '100%',
          role: 'img', 'aria-label': describeBoard(level),
          style: { display: 'block', maxHeight: '50vh', background: 'transparent', borderRadius: 12, border: '1px solid ' + GRID, overflow: 'hidden', touchAction: 'none' }
        }, [].concat([defs], backdropEls, gridEls, obstacleEls, ghostEls, previewEls, overlay, nodeGlowEls, [nodeEl], nodeBurstEls, handleEls));

        // ── Level progression bar ──
        var levelBtns = LEVELS.map(function (lv, i) {
          var unlocked = isLevelUnlocked(byLevel, i);
          // The Gauntlet keys its stage progress under 'G-Lx', so its tile reads
          // "solved" from completion of all stages, and "current" from the selected
          // raw level id (the resolved `level` is the stage clone, not L9).
          var solved = lv.family === 'gauntlet' ? gauntletComplete(byLevel, gauntletOrder(byLevel, lv.stages)) : !!(byLevel[lv.id] && byLevel[lv.id].solved);
          var current = lv.id === (S.levelId || 'L1');
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
          // asPeriod params display the whole-number period ("6 units"), not raw b.
          var valLabel = spec.asPeriod ? (periodOf(val) + ' units') : fmtVal(val, spec.step);
          if (spec.locked) {
            return h('div', { key: 'row-' + name, style: { marginBottom: 10, fontSize: 13, color: INK, opacity: 0.7 } },
              h('span', { key: 'l' }, spec.label + ': '),
              h('span', { key: 'v', style: { fontWeight: 700 } }, valLabel));
          }
          // snapValues params (sine period) step between their discrete values by INDEX
          // — a plain ±step would snap back to the same value and feel stuck.
          var snaps = spec.snapValues;
          var idx = 0;
          if (snaps) { var bd = Infinity; for (var j = 0; j < snaps.length; j++) { var d = Math.abs(snaps[j] - val); if (d < bd) { bd = d; idx = j; } } }
          var pct = snaps ? (snaps.length > 1 ? idx / (snaps.length - 1) : 0) : (val - spec.min) / (spec.max - spec.min);
          function bump(dir, big) {
            if (snaps) { setParam(name, snaps[Math.max(0, Math.min(snaps.length - 1, idx + dir))]); }
            else { setParam(name, val + dir * (big ? spec.step * 5 : spec.step)); }
          }
          function onKey(e) {
            var key = e.key;
            if (key === 'ArrowRight' || key === 'ArrowUp') { e.preventDefault(); bump(1, e.shiftKey); }
            else if (key === 'ArrowLeft' || key === 'ArrowDown') { e.preventDefault(); bump(-1, e.shiftKey); }
            else if (key === 'Home') { e.preventDefault(); setParam(name, snaps ? snaps[0] : spec.min); }
            else if (key === 'End') { e.preventDefault(); setParam(name, snaps ? snaps[snaps.length - 1] : spec.max); }
          }
          var btn = { width: 30, height: 30, borderRadius: 8, border: '1px solid ' + GRID, background: 'rgba(255,255,255,0.06)', color: INK, fontSize: 18, lineHeight: '26px', cursor: 'pointer' };
          return h('div', { key: 'row-' + name, role: 'group', 'aria-label': spec.label, style: { marginBottom: 10 } },
            h('div', { key: 'hdr', style: { display: 'flex', justifyContent: 'space-between', fontSize: 13, color: INK, marginBottom: 4 } },
              h('span', { key: 'l' }, spec.label),
              h('span', { key: 'v', style: { fontVariantNumeric: 'tabular-nums', fontWeight: 700 } }, valLabel)),
            h('div', { key: 'ctl', style: { display: 'flex', alignItems: 'center', gap: 8 } },
              h('button', { key: 'dec', type: 'button', 'aria-label': 'Decrease ' + spec.label, onClick: function () { bump(-1); }, style: btn }, '−'),
              h('div', {
                key: 'sld', role: 'slider', tabIndex: 0, 'aria-label': spec.label,
                'aria-valuemin': spec.min, 'aria-valuemax': spec.max, 'aria-valuenow': val, 'aria-valuetext': spec.label + ' ' + valLabel,
                onKeyDown: onKey,
                style: { position: 'relative', flex: 1, height: 10, borderRadius: 6, background: 'rgba(148,163,184,0.25)' }
              },
                h('div', { key: 'fill', style: { position: 'absolute', left: 0, top: 0, height: 10, width: (pct * 100) + '%', background: BEAM, borderRadius: 6, opacity: 0.5 } }),
                h('div', { key: 'thumb', style: { position: 'absolute', top: -3, left: 'calc(' + (pct * 100) + '% - 8px)', width: 16, height: 16, borderRadius: '50%', background: BEAM, boxShadow: '0 0 6px ' + BEAM } })),
              h('button', { key: 'inc', type: 'button', 'aria-label': 'Increase ' + spec.label, onClick: function () { bump(1); }, style: btn }, '+')));
        }

        var paramRows = level.paramOrder.map(function (n) { return paramRow(n); });

        var fireBtnStyle = { flex: 1, padding: '10px 14px', borderRadius: 10, border: 'none', background: BEAM, color: PAL.btnText, fontWeight: 800, fontSize: 15, cursor: 'pointer' };
        var resetBtnStyle = { padding: '10px 14px', borderRadius: 10, border: '1px solid ' + GRID, background: 'transparent', color: INK, fontWeight: 700, fontSize: 14, cursor: 'pointer' };

        var resultText = S.fired ? describeResult(level, res, ls.shots || 0) : describeBoard(level);
        var resultColor = !S.fired ? INK : (res.result === 'hit' ? NODE_ON : (res.result === 'miss' ? PAL.warn : PAL.danger));

        var showHint = !ls.solved && (ls.misses || 0) >= HINT_AFTER;

        var coordItems = [h('li', { key: 'cn' }, '🎯 ' + t('arccity.node', 'Node (target):') + ' x ' + level.node.x + ', y ' + level.node.y)];
        (level.walls || []).forEach(function (w, i) { coordItems.push(h('li', { key: 'cw' + i }, '🧱 ' + t('arccity.wall', 'Wall:') + ' x ' + w.x + ', height ' + w.height)); });
        (level.gates || []).forEach(function (g, i) { coordItems.push(h('li', { key: 'cg' + i }, '🚪 ' + t('arccity.gate', 'Gate:') + ' x ' + g.x + ', opening y ' + g.lo + ' to ' + g.hi + (g.slope ? ', slope ≈ ' + g.slope.value + ' ±' + g.slope.tol + ' (' + (g.slope.value < 0 ? 'descending' : 'climbing') + ')' : ''))); });

        var controls = (gauntlet && gauntlet.empty) ? null : h('div', { key: 'controls', style: { marginTop: 14 } },
          h('div', { key: 'eq', 'aria-label': describeEquation(level, P), style: { fontSize: 15, color: INK, marginBottom: 6, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', fontVariantNumeric: 'tabular-nums' } },
            level.family === 'line'
              ? ['y = ', h('span', { key: 'm', style: { color: BEAM, fontWeight: 800 } }, fmtVal(P.m, level.params.m.step)), ' · x + ', h('span', { key: 'b', style: { color: BEAM, fontWeight: 800 } }, fmtVal(P.b, level.params.b.step))]
              : (level.family === 'absval'
                ? ['y = ', h('span', { key: 'a', style: { color: BEAM, fontWeight: 800 } }, fmtVal(P.a, level.params.a.step)), ' · |x − ', h('span', { key: 'h', style: { color: BEAM, fontWeight: 800 } }, fmtVal(P.h, level.params.h.step)), '| + ', h('span', { key: 'k', style: { color: BEAM, fontWeight: 800 } }, fmtVal(P.k, level.params.k.step))]
                : (level.family === 'sine'
                  ? ['y = ', h('span', { key: 'a', style: { color: BEAM, fontWeight: 800 } }, fmtVal(P.a, level.params.a.step)), ' · sin(', h('span', { key: 'b', style: { color: BEAM, fontWeight: 800 } }, fmtVal(P.b, level.params.b.step)), '·x + ', h('span', { key: 'c', style: { color: BEAM, fontWeight: 800 } }, fmtVal(P.c, level.params.c.step)), ') + ', h('span', { key: 'k', style: { color: BEAM, fontWeight: 800 } }, fmtVal(P.k, level.params.k.step)), h('span', { key: 'per', style: { opacity: 0.7, fontWeight: 600 } }, '   (period ' + periodOf(P.b) + ')')]
                  : (level.family === 'exp'
                    ? ['y = ', h('span', { key: 'a', style: { color: BEAM, fontWeight: 800 } }, fmtVal(P.a, level.params.a.step)), ' · e^(', h('span', { key: 'b', style: { color: BEAM, fontWeight: 800 } }, fmtVal(P.b, level.params.b.step)), '·x) + ', h('span', { key: 'k', style: { color: BEAM, fontWeight: 800 } }, fmtVal(P.k, level.params.k.step))]
                    : (level.family === 'log'
                      ? ['y = ', h('span', { key: 'a', style: { color: BEAM, fontWeight: 800 } }, fmtVal(P.a, level.params.a.step)), ' · ln(x + ', h('span', { key: 'c', style: { color: BEAM, fontWeight: 800 } }, fmtVal(P.c, level.params.c.step)), ') + ', h('span', { key: 'k', style: { color: BEAM, fontWeight: 800 } }, fmtVal(P.k, level.params.k.step))]
                      : (level.family === 'poly'
                        ? ['y = cubic — crest x=', h('span', { key: 'p', style: { color: BEAM, fontWeight: 800 } }, fmtVal(P.p, level.params.p.step)), ', dip x=', h('span', { key: 'q', style: { color: BEAM, fontWeight: 800 } }, fmtVal(P.q, level.params.q.step)), ', steepness ', h('span', { key: 'a', style: { color: BEAM, fontWeight: 800 } }, fmtVal(P.a, level.params.a.step))]
                        : ['y = ', h('span', { key: 'a', style: { color: BEAM, fontWeight: 800 } }, fmtVal(P.a, level.params.a.step)), ' (x − ', h('span', { key: 'h', style: { color: BEAM, fontWeight: 800 } }, fmtVal(P.h, level.params.h.step)), ')² + ', h('span', { key: 'k', style: { color: BEAM, fontWeight: 800 } }, fmtVal(P.k, level.params.k.step))])))))),
          tier === 'practice' ? h('div', { key: 'draghint', style: { fontSize: 11, color: INK, opacity: 0.6, marginBottom: 10 } }, handleEls.length ? t('arccity.drag_hint', 'Tip: drag the glowing handle on the grid — the highlighted numbers update. Or use the sliders.') : t('arccity.slider_hint', 'Tip: use the sliders (or the +/− buttons and arrow keys) to shape the beam.')) : null,
          h('div', { key: 'rows' }, paramRows),
          h('div', { key: 'btns', style: { display: 'flex', gap: 10, marginTop: 6 } },
            h('button', { key: 'fire', type: 'button', ref: focusFireRef, onClick: fire, style: fireBtnStyle }, '⚡ ' + t('arccity.fire', 'Fire beam')),
            h('button', { key: 'reset', type: 'button', onClick: resetLevel, style: resetBtnStyle }, t('arccity.reset_btn', 'Reset')),
            h('button', { key: 'mute', type: 'button', 'aria-label': muted ? t('arccity.unmute', 'Sound is off — turn on') : t('arccity.mute', 'Sound is on — turn off'), onClick: toggleMute, style: resetBtnStyle }, muted ? '🔇' : '🔊')),
          h('div', { key: 'result', role: 'status', style: { marginTop: 12, fontSize: 14, lineHeight: 1.5, color: resultColor, minHeight: 42 } }, resultText),
          showHint ? h('div', { key: 'hint', style: { marginTop: 8, fontSize: 13, color: PAL.warn, padding: '8px 10px', borderRadius: 8, background: 'rgba(252,211,77,0.10)' } }, '💡 ' + level.hint) : null,
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

        // ── View toggle (Play ↔ Teacher) ──
        function viewBtn(v, label) {
          var active = view === v;
          return h('button', {
            key: 'view-' + v, type: 'button', 'aria-pressed': active ? 'true' : 'false', onClick: function () { setView(v); },
            style: { padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: active ? 800 : 600, border: '1px solid ' + (active ? BEAM : GRID), background: active ? 'rgba(34,211,238,0.15)' : 'transparent', color: INK, cursor: 'pointer' }
          }, label);
        }
        var viewToggle = h('div', { key: 'viewtoggle', role: 'group', 'aria-label': t('arccity.view', 'View'), style: { display: 'flex', gap: 6, marginBottom: 12 } },
          viewBtn('play', '🎮 ' + t('arccity.play', 'Play')), viewBtn('teacher', '📋 ' + t('arccity.teacher', 'Teacher view')));

        // ── Teacher panel: honest, anonymous, deterministic; FERPA export OFF by default (§9.5) ──
        var summary = teacherSummary(byLevel, badges);
        var teacherPanel = h('div', { key: 'teacherpanel', style: { marginTop: 4 } },
          h('div', { key: 'caveat', role: 'note', style: { fontSize: 13, lineHeight: 1.5, color: INK, padding: '10px 12px', borderRadius: 8, border: '1px solid ' + GRID, background: 'rgba(148,163,184,0.10)', marginBottom: 12 } }, '⚠️ ' + summary.caveat),
          h('h3', { key: 'psh', style: { fontSize: 15, margin: '0 0 8px', color: INK } }, t('arccity.progress_summary', 'Progress summary')),
          h('div', { key: 'relit', style: { fontSize: 14, fontWeight: 700, color: INK, marginBottom: 10 } }, t('arccity.nodes_relit', 'Nodes re-lit:') + ' ' + summary.nodesReLit + ' / ' + summary.totalLevels),
          h('h3', { key: 'fh', style: { fontSize: 14, margin: '0 0 6px', color: INK } }, t('arccity.functions', 'Functions')),
          h('ul', { key: 'fams', style: { listStyle: 'none', padding: 0, margin: '0 0 12px', fontSize: 13, color: INK } },
            Object.keys(summary.families).map(function (f) { return h('li', { key: 'fam-' + f, style: { marginBottom: 3 } }, f + ': ' + summary.families[f]); })),
          h('div', { key: 'indepnote', style: { fontSize: 11, color: INK, opacity: 0.65, margin: '0 0 12px' } }, t('arccity.indep_def', '"Used independently" = solved with the preview hidden and without using the hint.')),
          h('h3', { key: 'lh', style: { fontSize: 14, margin: '0 0 6px', color: INK } }, t('arccity.levels', 'Levels')),
          h('ul', { key: 'lvls', style: { listStyle: 'none', padding: 0, margin: '0 0 12px', fontSize: 13, color: INK } },
            summary.levels.map(function (l) {
              var bit = l.status;
              if (l.status === 'completed') bit += l.independent ? ' (independently)' : ' (with live preview)';
              if (l.status !== 'not started') bit += ' — ' + l.shots + ' shot' + (l.shots === 1 ? '' : 's') + ' (' + l.exploredAdjustments + ' missed)';
              return h('li', { key: 'tl-' + l.id, style: { marginBottom: 3 } }, l.title + ': ' + bit);
            })),
          summary.badges.length ? h('div', { key: 'tbadges', style: { fontSize: 13, color: INK, marginBottom: 12 } }, t('arccity.badges', 'Badges earned') + ': ' + summary.badges.join(', ')) : null,
          h('div', { key: 'exportbox', style: { borderTop: '1px solid ' + GRID, paddingTop: 10 } },
            h('label', { key: 'el', style: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: INK } },
              h('input', { key: 'ec', type: 'checkbox', checked: exportEnabled, onChange: toggleExport }),
              t('arccity.export_note', 'Enable export (off by default — local only, contains no student names)')),
            h('button', { key: 'eb', type: 'button', disabled: !exportEnabled, onClick: copySummary,
              style: { marginTop: 8, padding: '8px 12px', borderRadius: 8, border: '1px solid ' + GRID, background: exportEnabled ? 'rgba(34,211,238,0.12)' : 'transparent', color: INK, fontSize: 13, fontWeight: 700, cursor: exportEnabled ? 'pointer' : 'not-allowed', opacity: exportEnabled ? 1 : 0.5 } },
              '📋 ' + t('arccity.copy_summary', 'Copy summary'))));

        // ── Gauntlet banner (progress + transparent "why this one") + advance ──
        var gDoneCount = (gauntlet && !gauntlet.empty) ? gauntlet.order.filter(function (sid) { var st = byLevel['G-' + sid]; return !!(st && st.solved); }).length : 0;
        var gauntletBanner = !gauntlet ? null : (gauntlet.empty
          ? h('div', { key: 'gbanner', role: 'status', style: { marginBottom: 12, padding: '10px 12px', borderRadius: 10, border: '1px solid ' + BEAM, background: 'rgba(34,211,238,0.10)', color: INK, fontSize: 14, fontWeight: 700 } },
            '🏆 ' + t('arccity.gauntlet', 'The Gauntlet') + ' — ' + t('arccity.gauntlet_empty', 'Solve a few function families first, then come back — the Gauntlet replays the ones you’ve learned.'))
          : h('div', { key: 'gbanner', role: 'status', style: { marginBottom: 12, padding: '10px 12px', borderRadius: 10, border: '1px solid ' + BEAM, background: 'rgba(34,211,238,0.10)', color: INK } },
          // The heading is the SR text-equivalent for the (aria-hidden) dot row, so
          // it must carry the completion count too — not just the current position.
          h('div', { key: 'gt', style: { fontSize: 14, fontWeight: 800 } }, '🏆 ' + t('arccity.gauntlet', 'The Gauntlet') + ' — ' + t('arccity.challenge', 'Challenge') + ' ' + (gauntlet.idx + 1) + '/' + gauntlet.total + ' (' + gDoneCount + ' ' + t('arccity.done', 'done') + '): ' + levelById(gauntlet.stageId).title),
          h('div', { key: 'gw', style: { fontSize: 12, opacity: 0.85, marginTop: 2 } }, gauntlet.why),
          // Dots are decorative (aria-hidden — the heading is the SR equivalent). Each
          // state is distinguished by COLOR + SHAPE so it survives low-vision and
          // colour-blindness: done = filled green w/ ✓, current = filled teal w/ ring +
          // larger, to-do = empty w/ outline. Colours are the contrast-tested palette
          // tokens (NODE_ON/BEAM), not low-opacity tints.
          h('div', { key: 'gd', 'aria-hidden': 'true', style: { display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' } }, gauntlet.order.map(function (sid, gi) {
            var done = !!(byLevel['G-' + sid] && byLevel['G-' + sid].solved);
            var cur = gi === gauntlet.idx;
            return h('span', { key: 'gdot-' + sid, title: levelById(sid).title, style: {
              width: cur ? 16 : 13, height: cur ? 16 : 13, borderRadius: 999,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 800, color: '#ffffff', lineHeight: 1,
              border: '2px solid ' + (done ? NODE_ON : (cur ? INK : GRID)),
              background: done ? NODE_ON : (cur ? BEAM : 'transparent')
            } }, done ? '✓' : '');
          }))));
        var gauntletNav = (gauntlet && ls.solved)
          ? (gauntlet.idx < gauntlet.total - 1
            ? h('button', { key: 'gnext', type: 'button', onClick: advanceGauntlet, 'aria-label': t('arccity.next_challenge_aria', 'Next challenge — advance to the next function family in the Gauntlet'), style: { marginTop: 12, padding: '10px 16px', borderRadius: 10, border: '1px solid ' + BEAM, background: 'rgba(34,211,238,0.15)', color: INK, fontSize: 14, fontWeight: 800, cursor: 'pointer' } }, t('arccity.next_challenge', 'Next challenge →'))
            : h('div', { key: 'gdonewrap', style: { marginTop: 12 } },
              h('div', { key: 'gdone', role: 'status', style: { padding: '10px 12px', borderRadius: 10, border: '1px solid ' + GRID, background: 'rgba(52,211,153,0.12)', color: INK, fontSize: 14, fontWeight: 800 } }, '🏆 ' + t('arccity.gauntlet_done', 'Gauntlet complete — every function family used to re-light a node!')),
              h('button', { key: 'grestart', type: 'button', onClick: resetGauntlet, 'aria-label': t('arccity.restart_gauntlet_aria', 'Restart the Gauntlet — clear this run and start a fresh adaptive sequence'), style: { marginTop: 10, padding: '9px 14px', borderRadius: 10, border: '1px solid ' + BEAM, background: 'transparent', color: INK, fontSize: 13, fontWeight: 700, cursor: 'pointer' } }, '🔄 ' + t('arccity.restart_gauntlet', 'Restart Gauntlet (fresh adaptive run)'))))
          : null;

        // In the Gauntlet the tier is locked (preview-hidden), so swap the tier
        // picker for a plain notice explaining the proving-ground rule.
        var gauntletTierLock = gauntlet ? h('div', { key: 'gtierlock', role: 'note', style: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: INK, opacity: 0.85, marginBottom: 12, padding: '6px 10px', borderRadius: 8, border: '1px solid ' + GRID, background: 'rgba(148,163,184,0.10)' } },
          '🔒 ' + t('arccity.gauntlet_tier_lock', 'The Gauntlet runs preview-hidden — predict where the beam goes, then Fire. A hint appears if you miss a few times.')) : null;

        var body = view === 'teacher'
          ? teacherPanel
          : ((gauntlet && gauntlet.empty)
            ? h('div', { key: 'game' }, levelBar, gauntletBanner) // no board until families are solved
            : h('div', { key: 'game' }, levelBar, gauntletBanner, (gauntlet ? gauntletTierLock : tierBar), svg, controls, gauntletNav, badgeStrip));

        return h('div', { id: 'allo-arccity-root', style: { padding: 16, maxWidth: 760, margin: '0 auto', color: INK } },
          header, viewToggle, body);

      } catch (e) {
        return h('div', { style: { padding: 16, color: '#fca5a5', fontSize: 14 } },
          'Arc City could not render: ' + (e && e.message ? e.message : String(e)));
      }
    }
  });

})();
