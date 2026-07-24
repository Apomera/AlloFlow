// ═══════════════════════════════════════════════════════════════════════
// stem_tool_arccity.js — Arc City (Phase 1: Line District → Arc Heights)
// ═══════════════════════════════════════════════════════════════════════
// A cooperative, turn-based math game where THE FUNCTION IS THE WEAPON.
// You author a function whose light-beam threads gates, clears walls, and
// reaches dark "nodes" to re-light a neon city. Full design: docs/arc_city_design.md.
// CURRENT IMPLEMENTATION (2026-07-22): 13 campaign levels, seven function
// families, transformations, the adaptive Gauntlet, teacher summaries, versioned
// save state, and Circuit Clash (CPU/hot-seat) with an authoritative tactical SVG
// plus an optional lifecycle-managed Three.js peer projection.
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
    },
    {
      // ── Re-Target Yards (Transformations world, design §5 / HSF-BF.B.3). A new
      // GOAL TYPE: 'match' — overlay your curve onto a faint GHOST (a transformed
      // parent in the same family) instead of threading gates. No walls/gates; the
      // stub node is never adjudicated (classifyShot branches early on goal:'match').
      // L11 isolates TRANSLATION: a is locked, the player slides h & k onto the ghost.
      // Forcing certificate (basin small + load-bearing + default is a clear miss)
      // verified in arc_city_solvability.test.js. Unlocks once ≥4 families are solved.
      id: 'L11', title: 'Re-Target: Slide', family: 'parabola', goal: 'match',
      world: { x0: 0, x1: 10, y0: 0, y1: 8 }, walls: [], gates: [], node: { x: 5, y: 4, r: 0.5 }, dx: 0.05,
      ghost: { params: { a: 0.3, h: 5, k: 3 } }, matchTol: 0.3,
      paramOrder: ['a', 'h', 'k'],
      params: {
        a: { min: -1.5, max: 1.5, step: 0.05, default: 0.3, locked: true, label: 'a  (arc tightness — fixed this level)' },
        h: { min: 0, max: 10, step: 0.25, default: 2, label: 'h  (slide left/right)' },
        k: { min: 0, max: 8, step: 0.25, default: 1, label: 'k  (slide up/down)' }
      },
      hint: 'Re-target the ghost: it is the SAME parabola, just moved. Slide it into place — set h to shift left/right and k to shift up/down until your curve lies on top of the ghost. The arc tightness a is fixed this round.'
    },
    {
      // L12 adds REFLECTION + VERTICAL STRETCH: a is now free (and goes negative).
      id: 'L12', title: 'Re-Target: Flip & Stretch', family: 'parabola', goal: 'match',
      world: { x0: 0, x1: 10, y0: 0, y1: 8 }, walls: [], gates: [], node: { x: 5, y: 4, r: 0.5 }, dx: 0.05,
      ghost: { params: { a: -0.6, h: 5, k: 6 } }, matchTol: 0.35,
      paramOrder: ['a', 'h', 'k'],
      params: {
        a: { min: -1.5, max: 1.5, step: 0.05, default: 0.3, label: 'a  (flip with a negative sign; stretch with a bigger size)' },
        h: { min: 0, max: 10, step: 0.25, default: 5, label: 'h  (slide left/right)' },
        k: { min: 0, max: 8, step: 0.25, default: 3, label: 'k  (slide up/down)' }
      },
      hint: 'This ghost opens the other way and is stretched. Make a NEGATIVE to flip the curve over, then change its size to match the steepness, and slide h/k so it sits on the ghost.'
    },
    {
      // L13 moves to SINE so HORIZONTAL STRETCH (period, b) is honest — on a parabola
      // it would collapse into a (a·b²(x−h)²), so it's only taught here. k (midline)
      // is locked so the player must engage amplitude/period/phase, not slide vertically.
      id: 'L13', title: 'Re-Target: The Wave', family: 'sine', goal: 'match',
      world: { x0: 0, x1: 10, y0: 0, y1: 8 }, walls: [], gates: [], node: { x: 5, y: 4, r: 0.5 }, dx: 0.05,
      ghost: { params: { a: 2.5, b: 1.0472, c: 1, k: 4 } }, matchTol: 0.3,
      paramOrder: ['a', 'b', 'c', 'k'],
      params: {
        a: { min: 0.5, max: 3.5, step: 0.25, default: 1, label: 'a  (amplitude — how tall)' },
        b: { min: 0.7854, max: 1.5708, step: 0.05, snapValues: [1.5708, 1.2566, 1.0472, 0.7854], asPeriod: true, default: 1.5708, label: 'period  (stretch the wave wider/narrower)' },
        c: { min: 0, max: 6, step: 0.25, default: 0, label: 'c  (phase — slide the wave sideways)' },
        k: { min: 4, max: 4, step: 1, default: 4, locked: true, label: 'k  (midline — fixed this level)' }
      },
      hint: 'Re-target the wave. Set the amplitude a (height), the PERIOD (how wide each wave is — a stretch you can only make on a wave, not a parabola), and the phase c (slide sideways) until your wave overlays the ghost. The midline is fixed.'
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

  // ── Transformations world (§5 "Re-Target"): the "match the ghost" goal. The
  // player overlays their curve onto a faint TARGET curve (a transformed parent in
  // the SAME family) by authoring h/k/a (and b/c on sine). Success = the curves
  // agree to within level.matchTol everywhere on the match domain (L∞, sampled on
  // the shared x-grid so there is no interpolation/aliasing). ──
  function normalizeForMatch(family, p) {
    // sine: a·sin(bx+c) ≡ −a·sin(bx + c+π). Fold a<0 into a positive amplitude so an
    // equivalent authoring (−a, c+π) is judged a MATCH, not a near-miss. Parabola
    // vertex form is unique → no normalization.
    if (family === 'sine' && p.a < 0) {
      var TAU = 2 * Math.PI;
      return Object.assign({}, p, { a: -p.a, c: ((p.c + Math.PI) % TAU + TAU) % TAU });
    }
    return p;
  }
  function classifyMatch(level, params) {
    var g = normalizeForMatch(level.family, Object.assign({}, level.ghost.params)); // defensive copy — never mutate the stored ghost
    var pp = normalizeForMatch(level.family, params);
    var dom = level.matchDomain || [level.world.x0, level.world.x1];
    var lo = Math.max(dom[0], level.world.x0), hi = Math.min(dom[1], level.world.x1);
    var n = Math.round((hi - lo) / level.dx);
    var maxGap = 0, worstX = null, pw = null, gw = null;
    for (var i = 0; i <= n; i++) {
      var x = lo + i * level.dx;
      var pe = fnY(level.family, pp, x), ge = fnY(level.family, g, x);
      if (!isFinite(pe) || !isFinite(ge)) { maxGap = Infinity; worstX = x; pw = pe; gw = ge; break; }
      var d = Math.abs(pe - ge);
      if (d > maxGap) { maxGap = d; worstX = x; pw = pe; gw = ge; }
    }
    return { result: maxGap <= level.matchTol ? 'hit' : 'miss', matchErr: maxGap, matchWorstX: worstX, playerYAtWorst: pw, ghostYAtWorst: gw, at: null, yAt: null, obstacle: null, nodeDist: null, killedAt: null };
  }

  // Adjudicate a shot. The beam travels left→right and dies at the first
  // obstacle (by x) it fails; otherwise we measure nearest approach to the node.
  function classifyShot(level, params) {
    // Enforce LOCKED params at the adjudication layer (the UI hides their sliders,
    // but a bypass must not soften the math or break a level's isolation). Pin each
    // locked param to its default — on a non-mutating copy, only if something differs.
    var lparams = level.params || {}, clamped = null;
    (level.paramOrder || []).forEach(function (n) {
      var sp = lparams[n];
      if (sp && sp.locked && params[n] !== sp.default) { if (!clamped) clamped = Object.assign({}, params); clamped[n] = sp.default; }
    });
    if (clamped) params = clamped;
    if (level.goal === 'match') return classifyMatch(level, params); // Transformations world
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

  // ── Circuit Clash: deterministic turn-based battle rules. ──────────────────
  // Each lane reuses a forcing-certified level. classifyShot remains authoritative,
  // and both the accessible SVG and optional Three.js view consume the same samples.
  var ARC_STATE_VERSION = 2;
  var BATTLE_STATE_VERSION = 7;
  var BATTLE_LANE_IDS = ['L1', 'L3', 'L5'];
  var BATTLE_LANE_META = [
    { id: 'direct', title: 'Direct Circuit', short: 'Line', color: '#22d3ee', solution: { m: 0.5, b: 0 } },
    { id: 'arc', title: 'Arc Circuit', short: 'Parabola', color: '#f472b6', solution: { a: -0.5, h: 5, k: 5 } },
    { id: 'wave', title: 'Wave Circuit', short: 'Sine', color: '#facc15', solution: { a: 2.5, b: 1.0472, c: 1, k: 4 } }
  ];

  var BATTLE_ARENAS = {
    classic: {
      id: 'classic', title: 'Neon Basics',
      blurb: 'Line, parabola, and sine circuits from the Arc City foundations.',
      lanes: BATTLE_LANE_META.map(function (meta, index) { return Object.assign({ levelId: BATTLE_LANE_IDS[index] }, meta); })
    },
    remix: {
      id: 'remix', title: 'Function Remix',
      blurb: 'V-shape, exponential decay, and cubic switchback circuits.',
      lanes: [
        { levelId: 'L4', id: 'switchback', title: 'Switchback Circuit', short: 'V-shape', color: '#a78bfa', solution: { a: 1, h: 5, k: 1 } },
        { levelId: 'L7', id: 'decay', title: 'Decay Circuit', short: 'Exponential', color: '#34d399', solution: { a: 5, b: -0.4, k: 1 } },
        { levelId: 'L9', id: 'cubic', title: 'Cubic Circuit', short: 'Cubic', color: '#fb923c', solution: { a: 0.12, p: 2.5, q: 6.5, k: 4 } }
      ]
    }
  };

  function battleArena(id) {
    return BATTLE_ARENAS[id] || BATTLE_ARENAS.classic;
  }

  function battleLane(index, arenaId) {
    var arena = battleArena(arenaId);
    var i = Math.max(0, Math.min(arena.lanes.length - 1, Number(index) || 0));
    return levelById(arena.lanes[i].levelId);
  }

  function battleDrafts(arenaId) {
    var arena = battleArena(arenaId);
    return [0, 1].map(function () {
      return arena.lanes.map(function (lane) { return defaultParams(levelById(lane.levelId)); });
    });
  }

  function createBattleState(mode, options) {
    var opts = options && typeof options === 'object' ? options : {};
    var arenaId = battleArena(opts.arena).id;
    return {
      schemaVersion: BATTLE_STATE_VERSION, mode: mode === 'hotseat' ? 'hotseat' : 'cpu',
      assist: opts.assist === 'challenge' ? 'challenge' : 'guided',
      trailRule: mode === 'hotseat' && opts.trailRule === 'walls' ? 'walls' : 'visual',
      weapon: ['standard', 'standard'],
      phaseCharges: mode === 'hotseat' && opts.trailRule === 'walls' ? [1, 1] : [0, 0],
      arena: arenaId,
      cpuLevel: opts.cpuLevel === 'practice' ? 'practice' : 'standard',
      status: 'playing', turn: 0, round: 1, winner: null,
      selectedLane: [0, 0], drafts: battleDrafts(arenaId),
      shields: [[true, true, true], [true, true, true]],
      trails: [], shots: 0, handoff: false, stats: [{ shots: 0, captures: 0 }, { shots: 0, captures: 0 }], replayIndex: 0,
      log: ['Circuit Clash ready. Player 1 begins. Choose an active circuit, shape the function, then fire.']
    };
  }

  function normalizeBattleState(raw) {
    var base = createBattleState(raw && raw.mode, raw || {});
    if (!raw || typeof raw !== 'object') return base;
    var out = Object.assign({}, base, raw, { schemaVersion: BATTLE_STATE_VERSION });
    out.assist = raw.assist === 'challenge' ? 'challenge' : 'guided';
    out.trailRule = out.mode === 'hotseat' && raw.trailRule === 'walls' ? 'walls' : 'visual';
    out.phaseCharges = [0, 1].map(function (seat) {
      if (out.trailRule !== 'walls') return 0;
      if (!raw.phaseCharges || raw.phaseCharges[seat] == null) return base.phaseCharges[seat];
      return Number(raw.phaseCharges[seat]) > 0 ? 1 : 0;
    });
    out.weapon = [0, 1].map(function (seat) {
      return out.trailRule === 'walls' && out.phaseCharges[seat] > 0 && raw.weapon && raw.weapon[seat] === 'phase' ? 'phase' : 'standard';
    });
    out.arena = battleArena(raw.arena).id;
    out.cpuLevel = raw.cpuLevel === 'practice' ? 'practice' : 'standard';
    out.selectedLane = [0, 1].map(function (seat) {
      var v = raw.selectedLane && raw.selectedLane[seat];
      return Math.max(0, Math.min(2, Number(v) || 0));
    });
    out.handoff = out.mode === 'hotseat' && out.status !== 'won' && raw.handoff === true;
    out.shields = [0, 1].map(function (seat) {
      return [0, 1, 2].map(function (lane) {
        return !(raw.shields && raw.shields[seat] && raw.shields[seat][lane] === false);
      });
    });
    var defaults = battleDrafts(out.arena);
    out.drafts = [0, 1].map(function (seat) {
      return [0, 1, 2].map(function (lane) {
        return Object.assign({}, defaults[seat][lane], raw.drafts && raw.drafts[seat] && raw.drafts[seat][lane]);
      });
    });
    out.trails = Array.isArray(raw.trails) ? raw.trails.slice(-12) : [];
    var maxReplayIndex = Math.max(0, out.trails.length - 1);
    var requestedReplayIndex = raw.replayIndex == null ? maxReplayIndex : Math.floor(Number(raw.replayIndex));
    out.replayIndex = isFinite(requestedReplayIndex) ? Math.max(0, Math.min(maxReplayIndex, requestedReplayIndex)) : maxReplayIndex;
    out.log = Array.isArray(raw.log) && raw.log.length ? raw.log.slice(-12) : base.log;
    out.stats = [0, 1].map(function (seat) {
      var persisted = raw.stats && raw.stats[seat];
      var trailShots = out.trails.filter(function (trail) { return trail && trail.seat === seat; }).length;
      var defender = seat === 0 ? 1 : 0;
      var captures = 3 - out.shields[defender].filter(function (active) { return active; }).length;
      captures = Math.min(3, Math.max(captures, Number(persisted && persisted.captures) || 0));
      return {
        shots: Math.max(captures, Number(persisted && persisted.shots) || trailShots),
        captures: captures
      };
    });
    if (out.turn !== 1) out.turn = 0;
    if (out.status !== 'won') { out.status = 'playing'; out.winner = null; }
    return out;
  }

  function migrateArcState(raw) {
    var base = { schemaVersion: ARC_STATE_VERSION, levelId: 'L1', fired: false, byLevel: {}, tier: 'practice', badges: [] };
    if (!raw || typeof raw !== 'object') return base;
    var out = Object.assign({}, base, raw, { schemaVersion: ARC_STATE_VERSION });
    out.byLevel = raw.byLevel && typeof raw.byLevel === 'object' ? raw.byLevel : {};
    out.badges = Array.isArray(raw.badges) ? raw.badges : [];
    if (raw.battle) out.battle = normalizeBattleState(raw.battle);
    return out;
  }

  function battlePlayerLabel(battle, seat) {
    if (battle.mode === 'cpu' && seat === 1) return 'CPU';
    return 'Player ' + (seat + 1);
  }

  function battleBeginTurn(rawBattle) {
    var battle = normalizeBattleState(rawBattle);
    if (battle.mode !== 'hotseat' || battle.status === 'won' || !battle.handoff) {
      return { battle: battle, message: 'No hot-seat handoff is pending.' };
    }
    var message = battlePlayerLabel(battle, battle.turn) + ' turn confirmed. Choose a circuit and shape the function.';
    var next = Object.assign({}, battle, { handoff: false, log: [message].concat(battle.log).slice(0, 12) });
    return { battle: next, message: message };
  }

  function firstActiveBattleLane(battle, defenderSeat) {
    for (var i = 0; i < 3; i++) if (battle.shields[defenderSeat][i]) return i;
    return 0;
  }

  function battleCpuChoice(rawBattle) {
    var battle = normalizeBattleState(rawBattle);
    var lane = firstActiveBattleLane(battle, 0);
    var alreadyProbed = battle.trails.some(function (trail) { return trail && trail.seat === 1 && trail.lane === lane; });
    var probing = battle.cpuLevel === 'practice' && !alreadyProbed;
    var laneMeta = battleArena(battle.arena).lanes[lane];
    return {
      lane: lane,
      strategy: probing ? 'probe' : 'solution',
      params: probing ? defaultParams(battleLane(lane, battle.arena)) : Object.assign({}, laneMeta.solution)
    };
  }

  function battleTrailYAt(trail, localX) {
    var samples = trail && Array.isArray(trail.samples) ? trail.samples : [];
    var killX = trail && trail.killedAt && isFinite(trail.killedAt.x) ? trail.killedAt.x : Infinity;
    if (!isFinite(localX) || localX > killX + 0.001) return null;
    for (var i = 1; i < samples.length; i++) {
      var a = samples[i - 1], b = samples[i];
      if (!a || !b || !isFinite(a.x) || !isFinite(a.y) || !isFinite(b.x) || !isFinite(b.y)) continue;
      if (a.x > killX + 0.001) break;
      if (localX < a.x - 0.001 || localX > b.x + 0.001) continue;
      var span = b.x - a.x;
      var mix = Math.abs(span) < 0.000001 ? 0 : (localX - a.x) / span;
      return a.y + (b.y - a.y) * mix;
    }
    return null;
  }

  // Trail Walls uses the mirrored battle field, not the authored level's local
  // coordinates. Failed opposing trails remain as deterministic light walls;
  // successful trails dissipate so every relay always retains counterplay.
  function battleTrailCollision(level, samples, rawBattle, seat, lane, baseResult) {
    var battle = normalizeBattleState(rawBattle);
    if (battle.trailRule !== 'walls' || battle.mode !== 'hotseat') return null;
    var current = Array.isArray(samples) ? samples : [];
    var killX = baseResult && baseResult.killedAt && isFinite(baseResult.killedAt.x) ? baseResult.killedAt.x : Infinity;
    var tolerance = Math.max(0.16, Math.min(0.28, (Number(level && level.dx) || 0.05) * 2.5));
    var hazards = battle.trails.filter(function (trail) {
      return trail && trail.seat !== seat && trail.lane === lane && trail.result !== 'hit' && Array.isArray(trail.samples);
    });
    for (var ci = 0; ci < current.length; ci++) {
      var point = current[ci];
      if (!point || !isFinite(point.x) || !isFinite(point.y) || point.x > killX + 0.001) continue;
      var globalX = seat === 0 ? point.x : 10 - point.x;
      for (var hi = hazards.length - 1; hi >= 0; hi--) {
        var hazard = hazards[hi];
        var hazardLocalX = hazard.seat === 0 ? globalX : 10 - globalX;
        var hazardY = battleTrailYAt(hazard, hazardLocalX);
        if (hazardY == null || Math.abs(point.y - hazardY) > tolerance) continue;
        return {
          result: 'trail', at: point.x, yAt: point.y, globalX: globalX,
          obstacle: { id: hazard.id, seat: hazard.seat, tolerance: tolerance },
          trailId: hazard.id, trailSeat: hazard.seat, nodeDist: null,
          killedAt: { x: point.x, y: point.y }, baseResult: baseResult && baseResult.result
        };
      }
    }
    return null;
  }

  function battleFire(rawBattle, paramsOverride, laneOverride) {
    var battle = normalizeBattleState(rawBattle);
    if (battle.status === 'won') return { battle: battle, result: null, message: 'The match is already complete.' };
    if (battle.handoff) return { battle: battle, result: null, message: 'Turn handoff pending. Confirm the next player before firing.' };
    var seat = battle.turn, defender = seat === 0 ? 1 : 0;
    var lane = laneOverride == null ? battle.selectedLane[seat] : Number(laneOverride);
    lane = Math.max(0, Math.min(2, lane || 0));
    var level = battleLane(lane, battle.arena);
    var params = Object.assign({}, battle.drafts[seat][lane], paramsOverride || {});
    var samples = sampleCurve(level, params).map(function (pt) {
      return { x: Math.round(pt.x * 100) / 100, y: Math.round(pt.y * 100) / 100 };
    });
    var baseResult = classifyShot(level, params);
    var weapon = battle.trailRule === 'walls' && battle.weapon[seat] === 'phase' && battle.phaseCharges[seat] > 0 ? 'phase' : 'standard';
    var result = weapon === 'phase' ? baseResult : (battleTrailCollision(level, samples, battle, seat, lane, baseResult) || baseResult);
    var captured = result.result === 'hit' && battle.shields[defender][lane];
    var shields = battle.shields.map(function (row) { return row.slice(); });
    if (captured) shields[defender][lane] = false;
    var trail = {
      id: 'trail-' + (battle.shots + 1), seat: seat, lane: lane,
      family: level.family, params: Object.assign({}, params), result: result.result, captured: captured,
      weapon: weapon,
      trailSeat: result.trailSeat == null ? null : result.trailSeat,
      collisionTrailId: result.trailId || null,
      killedAt: result.killedAt ? { x: result.killedAt.x, y: result.killedAt.y } : null,
      samples: samples
    };
    var trails = battle.trails.concat([trail]).slice(-12);
    var attackerName = battlePlayerLabel(battle, seat), laneName = battleArena(battle.arena).lanes[lane].title;
    var message;
    if (result.result === 'trail') message = attackerName + ' collided with ' + battlePlayerLabel(battle, result.trailSeat) + '\'s failed trail in the ' + laneName + '.';
    else if (captured) message = attackerName + ' captured the ' + laneName + ' relay.';
    else if (result.result === 'hit') message = attackerName + ' reached the ' + laneName + ', but that relay was already offline.';
    else message = attackerName + ' missed the ' + laneName + ': ' + describeResult(level, result, 1);
    var won = shields[defender].every(function (active) { return !active; });
    var nextTurn = won ? seat : defender;
    if (won) message += ' ' + attackerName + ' wins Circuit Clash!';
    else message += ' ' + battlePlayerLabel(battle, nextTurn) + ' is next.';
    if (weapon === 'phase') message = 'Phase Pulse: ' + message;
    var drafts = battle.drafts.map(function (seatDrafts) {
      return seatDrafts.map(function (p) { return Object.assign({}, p); });
    });
    drafts[seat][lane] = Object.assign({}, params);
    var stats = battle.stats.map(function (row) { return { shots: row.shots, captures: row.captures }; });
    stats[seat].shots += 1;
    if (captured) stats[seat].captures += 1;
    var weapons = battle.weapon.slice(), phaseCharges = battle.phaseCharges.slice();
    weapons[seat] = 'standard';
    if (weapon === 'phase') phaseCharges[seat] = Math.max(0, phaseCharges[seat] - 1);
    var next = Object.assign({}, battle, {
      replayIndex: won ? trails.length - 1 : battle.replayIndex,
      status: won ? 'won' : 'playing', winner: won ? seat : null, handoff: !won && battle.mode === 'hotseat',
      turn: nextTurn, round: battle.round + (!won && seat === 1 ? 1 : 0),
      weapon: weapons, phaseCharges: phaseCharges,
      shields: shields, drafts: drafts, trails: trails, shots: battle.shots + 1, stats: stats,
      log: [message].concat(battle.log).slice(0, 12)
    });
    return { battle: next, result: result, message: message, captured: captured, trail: trail, weapon: weapon };
  }

  function battleTrailSummary(rawBattle, trail) {
    var battle = normalizeBattleState(rawBattle);
    if (!trail) return null;
    var arena = battleArena(battle.arena);
    var laneIndex = Math.max(0, Math.min(2, Number(trail.lane) || 0));
    var level = battleLane(laneIndex, battle.arena);
    var params = trail.params || defaultParams(level);
    var result = classifyShot(level, params);
    var laneMeta = arena.lanes[laneIndex] || arena.lanes[0];
    var outcome;
    if (trail.captured) outcome = 'captured the relay';
    else if (trail.result === 'trail') outcome = 'collided with ' + battlePlayerLabel(battle, trail.trailSeat == null ? (trail.seat === 0 ? 1 : 0) : trail.trailSeat) + '\'s failed trail at x = ' + round1(trail.killedAt && trail.killedAt.x);
    else if (result.result === 'hit') outcome = 'reached an offline relay';
    else outcome = describeResult(level, result, 1);
    if (trail.weapon === 'phase') outcome = 'Phase Pulse: ' + outcome;
    return {
      player: battlePlayerLabel(battle, trail.seat),
      lane: laneIndex,
      laneTitle: laneMeta.title,
      equation: describeEquation(level, params),
      outcome: outcome
    };
  }

  function battleReplayFrame(rawBattle, requestedIndex) {
    var battle = normalizeBattleState(rawBattle);
    var total = battle.trails.length;
    if (!total) return null;
    var rawIndex = requestedIndex == null ? battle.replayIndex : Math.floor(Number(requestedIndex));
    var index = isFinite(rawIndex) ? Math.max(0, Math.min(total - 1, rawIndex)) : battle.replayIndex;
    var trail = battle.trails[index];
    var summary = battleTrailSummary(battle, trail);
    return Object.assign({}, summary, {
      index: index,
      number: index + 1,
      total: total,
      trail: trail,
      announcement: 'Replay shot ' + (index + 1) + ' of ' + total + '. ' + summary.player + ', ' + summary.laneTitle + '. ' + summary.equation + '. Result: ' + summary.outcome + '.'
    });
  }

  function battleReplayParamValue(level, name, value) {
    var spec = level.params[name] || {};
    return spec.asPeriod ? periodOf(value) + ' units per wave' : fmtVal(value, spec.step == null ? 0.01 : spec.step);
  }

  function battleReplayComparison(rawBattle, requestedIndex) {
    var battle = normalizeBattleState(rawBattle);
    var frame = battleReplayFrame(battle, requestedIndex);
    if (!frame) return null;
    var previousIndex = -1;
    for (var i = frame.index - 1; i >= 0; i--) {
      var candidate = battle.trails[i];
      if (candidate && candidate.seat === frame.trail.seat && Number(candidate.lane) === frame.lane) {
        previousIndex = i;
        break;
      }
    }
    if (previousIndex < 0) {
      return {
        comparable: false,
        previousIndex: null,
        changes: [],
        summary: 'First recorded attempt by ' + frame.player + ' in the ' + frame.laneTitle + '; no earlier comparable shot.'
      };
    }
    var previousTrail = battle.trails[previousIndex];
    var level = battleLane(frame.lane, battle.arena);
    var currentParams = frame.trail.params || defaultParams(level);
    var previousParams = previousTrail.params || defaultParams(level);
    var changes = [];
    (level.paramOrder || []).forEach(function (name) {
      var spec = level.params[name] || {};
      var fromValue = Number(previousParams[name]);
      var toValue = Number(currentParams[name]);
      if (!isFinite(fromValue) || !isFinite(toValue) || Math.abs(toValue - fromValue) <= 0.000001) return;
      var fromComparable = spec.asPeriod ? periodOf(fromValue) : fromValue;
      var toComparable = spec.asPeriod ? periodOf(toValue) : toValue;
      var direction = toComparable > fromComparable ? 'increased' : (toComparable < fromComparable ? 'decreased' : 'changed');
      var label = spec.asPeriod ? 'period' : name;
      changes.push({
        name: name,
        label: label,
        from: battleReplayParamValue(level, name, fromValue),
        to: battleReplayParamValue(level, name, toValue),
        direction: direction,
        text: label + ' ' + direction + ' from ' + battleReplayParamValue(level, name, fromValue) + ' to ' + battleReplayParamValue(level, name, toValue)
      });
    });
    var previousSummary = battleTrailSummary(battle, previousTrail);
    var improved = !previousTrail.captured && !!frame.trail.captured;
    var changeText = changes.length ? changes.map(function (change) { return change.text; }).join('; ') + '.' : 'Equation parameters were unchanged.';
    var outcomeText = improved
      ? 'The revision captured the relay.'
      : (previousSummary.outcome === frame.outcome ? 'The recorded outcome stayed the same.' : 'The recorded outcome changed from ' + previousSummary.outcome + ' to ' + frame.outcome + '.');
    return {
      comparable: true,
      previousIndex: previousIndex,
      previousNumber: previousIndex + 1,
      previousTrail: previousTrail,
      previousOutcome: previousSummary.outcome,
      changes: changes,
      improved: improved,
      changeText: changeText,
      outcomeText: outcomeText,
      summary: 'Compared with shot ' + (previousIndex + 1) + ' by the same player in the same circuit. ' + changeText + ' ' + outcomeText
    };
  }

  function battleRecap(rawBattle) {
    var battle = normalizeBattleState(rawBattle);
    var arena = battleArena(battle.arena);
    var missCounts = [0, 0, 0];
    battle.trails.forEach(function (trail) {
      if (trail && trail.result !== 'hit' && missCounts[trail.lane] != null) missCounts[trail.lane] += 1;
    });
    var hardestLane = null;
    for (var lane = 0; lane < 3; lane++) if (missCounts[lane] && (hardestLane == null || missCounts[lane] > missCounts[hardestLane])) hardestLane = lane;
    var players = [0, 1].map(function (seat) {
      var stat = battle.stats[seat];
      return {
        seat: seat,
        label: battlePlayerLabel(battle, seat),
        captures: stat.captures,
        shots: stat.shots,
        accuracy: stat.shots ? Math.round(stat.captures / stat.shots * 100) : 0
      };
    });
    var recent = battle.trails.slice(-6).reverse().map(function (trail) { return battleTrailSummary(battle, trail); });
    var recommendation = 'No missed trajectories in the recorded shots. Try Predict Then Fire or the other arena next.';
    if (hardestLane != null) {
      var hardestTrail = null;
      for (var i = battle.trails.length - 1; i >= 0; i--) {
        var trail = battle.trails[i];
        if (trail && trail.lane === hardestLane && trail.result !== 'hit') { hardestTrail = trail; break; }
      }
      if (hardestTrail) {
        if (hardestTrail.result === 'trail') {
          recommendation = arena.lanes[hardestLane].title + ' caused the most misses. Change the curve so it separates from the opposing trail before x = ' + round1(hardestTrail.killedAt && hardestTrail.killedAt.x) + '.';
        } else {
          var hardestLevel = battleLane(hardestLane, battle.arena);
          var hardestResult = classifyShot(hardestLevel, hardestTrail.params || defaultParams(hardestLevel));
          recommendation = arena.lanes[hardestLane].title + ' caused the most misses. ' + actionHint(hardestLevel, hardestResult);
        }
      }
    }
    return {
      arena: arena.id,
      arenaTitle: arena.title,
      winner: battle.winner,
      winnerLabel: battle.winner == null ? null : battlePlayerLabel(battle, battle.winner),
      totalShots: battle.shots,
      players: players,
      hardestLane: hardestLane,
      hardestLaneTitle: hardestLane == null ? null : arena.lanes[hardestLane].title,
      recent: recent,
      recommendation: recommendation
    };
  }

  function actionHint(level, res) {
    var fam = level.family;
    if (res.result === 'trail') {
      return 'Change at least one parameter so your curve separates from the opposing light wall before x = ' + round1(res.at) + '.';
    }
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
    // Transformations world — directional match coaching, by family + which side
    // the worst gap is on (never disclose the ghost's exact params).
    if (res.result === 'miss' && level.goal === 'match') {
      var above = res.playerYAtWorst > res.ghostYAtWorst;
      if (fam === 'sine') return above ? 'Your wave sits above the ghost there — lower the amplitude a, slide sideways with the phase c, or widen the period.' : 'Your wave sits below the ghost there — raise the amplitude a, slide with the phase c, or narrow the period.';
      return above ? 'Your curve sits above the ghost there — slide it down with k, change the size or sign of a, or shift h.' : 'Your curve sits below the ghost there — slide it up with k, change the size or sign of a, or shift h.';
    }
    return '';
  }

  // Outcome narration — direction AND magnitude of the error (design §8.2).
  function describeResult(level, res, shots) {
    if (res.result === 'trail') {
      return 'Trail collision at x = ' + round1(res.at) + '. Your beam met Player ' + ((Number(res.trailSeat) || 0) + 1) + '\'s failed trail and stopped. ' + actionHint(level, res);
    }
    if (level.goal === 'match') {
      if (res.result === 'hit') return 'Matched! Your curve overlays the ghost — within ' + level.matchTol + ' units the whole way. Solved in ' + shots + (shots === 1 ? ' shot.' : ' shots.');
      return 'Not matched yet — your curve and the ghost differ most at x ≈ ' + round1(res.matchWorstX) + ', where yours is ' + round1(res.playerYAtWorst) + ' and the target is ' + round1(res.ghostYAtWorst) + '. ' + actionHint(level, res);
    }
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
    if (level.goal === 'match') {
      var freeP = (level.paramOrder || []).filter(function (n) { return !(level.params[n] && level.params[n].locked); });
      var lockedP = (level.paramOrder || []).filter(function (n) { return level.params[n] && level.params[n].locked; });
      var shape = level.family === 'sine' ? 'sine wave' : 'parabola';
      var dom = level.matchDomain;
      var domMsg = (dom && (dom[0] !== level.world.x0 || dom[1] !== level.world.x1)) ? ' (judged from x ' + dom[0] + ' to ' + dom[1] + ')' : '';
      return 'Arc City, ' + level.title + ': match the ghost curve — overlay your ' + shape + ' onto the faint target by adjusting ' + freeP.join(', ') + (lockedP.length ? ' (' + lockedP.join(', ') + ' is fixed this level)' : '') + '. Keep your curve within ' + level.matchTol + ' units of the ghost the whole way across' + domMsg + '.' + (level.family === 'sine' ? ' You can stretch this wave left-to-right by changing its period — a move that is invisible on a parabola, so it is taught here on a wave.' : '');
    }
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
    // Re-Target Yards (L11) is capstone content, same gate as the Gauntlet: unlock
    // on ≥4 solved families (NOT byLevel['L10'].solved — the Gauntlet never sets it).
    // L12/L13 fall through to the linear prev-solved rule (their prev is L11/L12).
    if (lvl && lvl.id === 'L11') return solvedFamilies(byLevel, levelById('L10').stages).length >= GAUNTLET_MIN_FAMILIES;
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
    { id: 're-targeter', label: 'Re-Targeter — overlaid a curve onto its ghost by transforming it' },
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
    if (level.goal === 'match') {
      add('re-targeter'); // Transformations world — a transform, not a node-lighting
    } else {
      // family "re-lit a node using X" badges apply only to node-goal levels
      if (level.family === 'parabola') add('arc-architect');
      if (level.family === 'absval') add('switchback');
      if (level.family === 'sine') add('wave-rider');
      if (level.family === 'exp') add('decay-rider');
      if (level.family === 'log') add('log-climber');
      if (level.family === 'poly') add('twin-turn');
    }
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
      // Skip Transformations (match-goal) levels: matching a parabola/sine GHOST is
      // not the same as "using" that family to light a node, and conflating them
      // would let a transform level satisfy the gauntlet's family-solved gate.
      var l = LEVELS[i]; if (l.family !== family || l.goal === 'match') continue;
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

  // ── Mastery stars (design §9.4): rewards INDEPENDENCE, never ability. ──
  //  ★   solved (any tier — you lit the node)
  //  ★★  solved with the preview hidden + no hint ("independent")
  //  ★★★ ...AND aced it with no misses that run ("flawless"). Re-earnable: Reset
  //      clears the attempt counters (not the earned stars), so anyone can try for 3.
  function levelStars(st) {
    if (!st || !st.solved) return 0;
    if (st.flawless) return 3;
    if (st.independent) return 2;
    return 1;
  }
  var STAR_LEGEND = '★ solved · ★★ solved preview-hidden · ★★★ first try, preview-hidden';

  function teacherSummary(byLevel, badges) {
    byLevel = byLevel || {}; badges = badges || [];
    // The Gauntlet (family 'gauntlet') is a meta-level that replays the others
    // under namespaced 'G-*' state — it is NOT a node or a function family, so it
    // is excluded from the per-level list, the family roster, and the node count
    // (its completion is reported via the 'grand-tour' badge instead). Including it
    // would otherwise read "The Gauntlet: not started" forever and skew "N of M".
    // Exclude the Gauntlet (meta) AND the Transformations (goal:'match') levels:
    // matching a ghost is not "re-lighting a node", so counting it under "Levels
    // solved" would conflate two different objectives. Transformations progress is
    // surfaced via the 're-targeter' badge instead.
    var fnLevels = LEVELS.filter(function (l) { return l.family !== 'gauntlet' && l.goal !== 'match'; });
    var levels = fnLevels.map(function (l) {
      var st = byLevel[l.id] || {};
      var status = st.solved ? 'completed' : (((st.shots || 0) > 0 || (st.misses || 0) > 0) ? 'explored' : 'not started');
      return { id: l.id, title: l.title, family: l.family, status: status, independent: !!st.independent, shots: st.shots || 0, exploredAdjustments: st.misses || 0, stars: levelStars(st) };
    });
    var families = {};
    fnLevels.map(function (l) { return l.family; }).filter(function (f, i, a) { return a.indexOf(f) === i; }).forEach(function (f) { families[f] = familyStatus(byLevel, f); });
    var nodesReLit = levels.filter(function (l) { return l.status === 'completed'; }).length;
    var starsEarned = levels.reduce(function (n, l) { return n + l.stars; }, 0);
    return { caveat: TEACHER_CAVEAT, families: families, levels: levels, nodesReLit: nodesReLit, totalLevels: fnLevels.length, stars: starsEarned, starsMax: fnLevels.length * 3, starLegend: STAR_LEGEND, badges: badges.map(badgeLabel) };
  }
  function teacherSummaryText(summary) {
    var lines = ['Arc City — progress summary', '', summary.caveat, '', 'Levels solved: ' + summary.nodesReLit + ' of ' + summary.totalLevels, '', 'Functions:'];
    Object.keys(summary.families).forEach(function (f) { lines.push('  - ' + f + ': ' + summary.families[f]); });
    lines.push(''); lines.push('Levels:');
    summary.levels.forEach(function (l) {
      var bit = l.status;
      if (l.status === 'completed') bit += l.independent ? ' (independently)' : ' (with live preview)';
      if (l.status !== 'not started') bit += ' — ' + l.shots + ' shot' + (l.shots === 1 ? '' : 's') + ' (' + l.exploredAdjustments + ' missed)';
      if (l.stars) bit += ' — ' + l.stars + '/3 stars';
      lines.push('  - ' + l.title + ': ' + bit);
    });
    lines.push(''); lines.push('Stars: ' + summary.stars + ' of ' + summary.starsMax + ' (' + summary.starLegend + ')');
    if (summary.badges.length) { lines.push(''); lines.push('Badges: ' + summary.badges.join(', ')); }
    return lines.join('\n');
  }

  var ArcCityCore = {
    LEVELS: LEVELS,
    ARC_STATE_VERSION: ARC_STATE_VERSION,
    BATTLE_STATE_VERSION: BATTLE_STATE_VERSION,
    migrateArcState: migrateArcState,
    BATTLE_LANE_IDS: BATTLE_LANE_IDS,
    BATTLE_ARENAS: BATTLE_ARENAS,
    battleArena: battleArena,
    BATTLE_LANE_META: BATTLE_LANE_META,
    battleLane: battleLane,
    createBattleState: createBattleState,
    normalizeBattleState: normalizeBattleState,
    battlePlayerLabel: battlePlayerLabel,
    battleBeginTurn: battleBeginTurn,
    firstActiveBattleLane: firstActiveBattleLane,
    battleCpuChoice: battleCpuChoice,
    battleTrailCollision: battleTrailCollision,
    battleFire: battleFire,
    battleRecap: battleRecap,
    battleReplayFrame: battleReplayFrame,
    battleReplayComparison: battleReplayComparison,
    levelById: levelById,
    levelIndex: levelIndex,
    round1: round1,
    fnY: fnY,
    defaultParams: defaultParams,
    sampleCurve: sampleCurve,
    classifyShot: classifyShot,
    classifyMatch: classifyMatch,
    normalizeForMatch: normalizeForMatch,
    fPrime: fPrime,
    describeEquation: describeEquation,
    describeResult: describeResult,
    successWord: successWord,
    describeBoard: describeBoard,
    isLevelUnlocked: isLevelUnlocked,
    solvedFamilies: solvedFamilies,
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
    levelStars: levelStars,
    STAR_LEGEND: STAR_LEGEND,
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
      '#allo-arccity-root,#allo-arccity-root *{box-sizing:border-box;}' +
      '#allo-arccity-root .arc-battle-options>summary{min-height:44px;display:flex;align-items:center;cursor:pointer;font-weight:800;}' +
      '#allo-arccity-root .arc-battle-option-group button,#allo-arccity-root .arc-battle-lanes button,#allo-arccity-root .arc-battle-loadout button,#allo-arccity-root .arc-battle-replay button{min-height:40px;}' +
      '@media (max-width:520px){' +
      '#allo-arccity-root{width:100%;padding:10px!important;overflow-x:hidden;}' +
      '#allo-arccity-root .arc-battle-panel{min-width:0;}' +
      '#allo-arccity-root .arc-battle-option-group{align-items:stretch!important;}' +
      '#allo-arccity-root .arc-battle-option-group button{flex:1 1 135px;margin-left:0!important;}' +
      '#allo-arccity-root .arc-battle-score>*{min-width:0!important;flex:1 1 100%!important;}' +
      '#allo-arccity-root .arc-battle-param-snap{grid-template-columns:minmax(0,1fr)!important;}' +
      '#allo-arccity-root .arc-battle-param-inputs{grid-template-columns:minmax(0,1fr) 76px!important;}' +
      '#allo-arccity-root .arc-battle-lanes button{flex:1 1 90px;min-height:44px;}' +
      '#allo-arccity-root .arc-battle-actions{position:sticky;bottom:0;z-index:4;padding:8px 0 10px;background:var(--allo-stem-surface,#0f172a);border-top:1px solid var(--allo-stem-border,#475569);}' +
      '#allo-arccity-root .arc-battle-actions button{min-height:44px;}' +
      '#allo-arccity-root .arc-battle-secondary{font-size:12px!important;line-height:1.45;}' +
      '#allo-arccity-root .arc-battle-board{max-height:none!important;}' +
      '}' +
      '@media (max-width:360px){#allo-arccity-root .arc-battle-param-inputs{grid-template-columns:minmax(0,1fr) 72px!important;}}' +
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

  var _arcActiveBeams = [];
  function beamRef(el) {
    if (!el) {
      _arcActiveBeams.forEach(function (beam) {
        try { if (beam && beam._arcAnimId) window.cancelAnimationFrame(beam._arcAnimId); } catch (e) { }
      });
      _arcActiveBeams = [];
      return;
    }
    try {
      var len = el.getTotalLength ? el.getTotalLength() : 0;
      if (!len) return;
      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce) { el.style.strokeDasharray = 'none'; el.style.strokeDashoffset = '0'; return; }
      if (el._arcAnimated) return;
      _arcActiveBeams.push(el);
      el._arcAnimated = true;
      el.style.strokeDasharray = String(len);
      el.style.strokeDashoffset = String(len);
      var start = null, dur = 850;
      function step(ts) {
        if (start === null) start = ts;
        var prog = Math.min(1, (ts - start) / dur);
        el.style.strokeDashoffset = String(len * (1 - prog));
        if (prog < 1) { el._arcAnimId = window.requestAnimationFrame(step); }
        else {
          el._arcAnimId = null;
          _arcActiveBeams = _arcActiveBeams.filter(function (beam) { return beam !== el; });
        }
      }
      el._arcAnimId = window.requestAnimationFrame(step);
    } catch (e) {
      _arcActiveBeams = _arcActiveBeams.filter(function (beam) { return beam !== el; });
      try { el.style.strokeDashoffset = '0'; } catch (e2) { }
    }
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

  // ── Optional Three.js Circuit Clash projection. ────────────────────────────
  // This component is a visual peer of the always-present tactical SVG. It never
  // adjudicates shots, never owns match state, and renders only when state/size
  // changes. That keeps idle Chromebook GPU use near zero.
  function clearArcBattle3DGroup(group) {
    if (!group) return;
    while (group.children.length) {
      var child = group.children.pop();
      if (child.geometry && child.geometry.dispose) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(function (m) { if (m && m.dispose) m.dispose(); });
        else if (child.material.dispose) child.material.dispose();
      }
    }
  }

  function disposeArcBattle3D(pack) {
    if (!pack) return;
    try {
      pack.scene.traverse(function (obj) {
        if (obj.geometry && obj.geometry.dispose) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(function (m) { if (m && m.dispose) m.dispose(); });
          else if (obj.material.dispose) obj.material.dispose();
        }
      });
      if (pack.renderer) { pack.renderer.dispose(); if (pack.renderer.forceContextLoss) pack.renderer.forceContextLoss(); }
    } catch (e) { }
  }

  function syncArcBattle3D(pack, rawBattle) {
    if (!pack || !pack.THREE) return;
    var THREE = pack.THREE, battle = normalizeBattleState(rawBattle);
    var laneMeta = battleArena(battle.arena).lanes;
    var replayComparison3D = battle.status === 'won' ? battleReplayComparison(battle) : null;
    for (var seat = 0; seat < 2; seat++) {
      for (var lane = 0; lane < 3; lane++) {
        var relay = pack.relays[seat][lane], online = battle.shields[seat][lane];
        var color = laneMeta[lane].color;
        relay.material.color.set(online ? color : '#334155');
        relay.material.emissive.set(online ? color : '#000000');
        relay.material.emissiveIntensity = online ? 0.8 : 0;
        relay.material.opacity = online ? 1 : 0.38;
      }
    }
    clearArcBattle3DGroup(pack.trailGroup);
    function addTrail(samples, shooter, laneNo, color, opacity, dashed, killX) {
      var pts = [];
      for (var i = 0; i < samples.length; i++) {
        var pt = samples[i];
        if (killX != null && pt.x > killX + 0.001) continue;
        if (!isFinite(pt.y) || pt.y < -1 || pt.y > 9) continue;
        var gx = shooter === 0 ? -5 + pt.x : 5 - pt.x;
        pts.push(new THREE.Vector3(gx, Math.max(0.03, pt.y * 0.52), [-3, 0, 3][laneNo]));
      }
      if (pts.length < 2) return;
      var geo = new THREE.BufferGeometry().setFromPoints(pts);
      var mat = dashed
        ? new THREE.LineDashedMaterial({ color: color, transparent: true, opacity: opacity, dashSize: 0.25, gapSize: 0.16 })
        : new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: opacity });
      var line = new THREE.Line(geo, mat);
      if (dashed && line.computeLineDistances) line.computeLineDistances();
      pack.trailGroup.add(line);
      return pts;
    }
    battle.trails.forEach(function (trail, trailIndex) {
      var selectedReplay = battle.status === 'won' && trailIndex === battle.replayIndex;
      var comparedReplay = replayComparison3D && replayComparison3D.comparable && trailIndex === replayComparison3D.previousIndex;
      var trailColor = selectedReplay ? '#ffffff' : (comparedReplay ? '#94a3b8' : (trail.weapon === 'phase' ? '#ffffff' : laneMeta[trail.lane].color));
      var trailOpacity = selectedReplay ? 1 : (comparedReplay ? 0.72 : (battle.status === 'won' ? 0.16 : (trail.weapon === 'phase' ? 0.95 : 0.58)));
      var trailDashed = selectedReplay ? false : (comparedReplay ? true : (trail.weapon === 'phase' ? false : trail.result !== 'hit'));
      var renderedPoints = addTrail(trail.samples || [], trail.seat, trail.lane, trailColor, trailOpacity, trailDashed, trail.killedAt && trail.killedAt.x);
      if (selectedReplay && renderedPoints && renderedPoints.length) {
        var endpoint = renderedPoints[renderedPoints.length - 1];
        var replayGeo = new THREE.SphereGeometry(0.12, 10, 8);
        var replayMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
        var replayMarker = new THREE.Mesh(replayGeo, replayMat);
        replayMarker.position.copy(endpoint);
        pack.trailGroup.add(replayMarker);
      }
    });
    if (battle.status !== 'won' && !battle.handoff && battle.assist !== 'challenge' && !(battle.mode === 'cpu' && battle.turn === 1)) {
      var activeSeat = battle.turn, activeLane = battle.selectedLane[activeSeat];
      var previewLevel = battleLane(activeLane, battle.arena);
      var preview = sampleCurve(previewLevel, battle.drafts[activeSeat][activeLane]);
      var previewBase = classifyShot(previewLevel, battle.drafts[activeSeat][activeLane]);
      var previewWeapon = battle.trailRule === 'walls' && battle.weapon[activeSeat] === 'phase' && battle.phaseCharges[activeSeat] > 0 ? 'phase' : 'standard';
      var previewResult = previewWeapon === 'phase' ? previewBase : (battleTrailCollision(previewLevel, preview, battle, activeSeat, activeLane, previewBase) || previewBase);
      addTrail(preview, activeSeat, activeLane, previewWeapon === 'phase' ? '#ffffff' : (activeSeat === 0 ? '#e0ffff' : '#ffe4f3'), 0.95, previewWeapon !== 'phase', previewResult.killedAt && previewResult.killedAt.x);
      if (previewResult.result === 'trail' && previewResult.killedAt) {
        var impact = previewResult.killedAt, impactX = activeSeat === 0 ? -5 + impact.x : 5 - impact.x;
        var impactGeo = new THREE.SphereGeometry(0.13, 10, 8);
        var impactMat = new THREE.MeshBasicMaterial({ color: '#ef4444' });
        var impactMarker = new THREE.Mesh(impactGeo, impactMat);
        impactMarker.position.set(impactX, Math.max(0.03, impact.y * 0.52), [-3, 0, 3][activeLane]);
        pack.trailGroup.add(impactMarker);
      }
    }
    pack.renderer.render(pack.scene, pack.camera);
  }

  function ArcCityBattle3D(props) {
    var React = props.React, h = React.createElement;
    var canvasRef = React.useRef(null), packRef = React.useRef(null);
    var statusHook = React.useState('loading'), status = statusHook[0], setStatus = statusHook[1];
    React.useEffect(function () {
      var disposed = false, resizeObserver = null;
      var canvas = canvasRef.current;
      if (!canvas || !window.StemLab || typeof window.StemLab.ensureThree !== 'function') {
        setStatus('unavailable');
        return function () { };
      }
      window.StemLab.ensureThree({ orbit: false, failMessage: 'The 3D engine could not load. The tactical battle view remains available.' }).then(function (THREE) {
        if (disposed || !canvas) return;
        var arenaConfig = battleArena(props.battle.arena);
        var scene = new THREE.Scene();
        scene.background = new THREE.Color(0x050712);
        scene.fog = new THREE.Fog(0x050712, 14, 30);
        var camera = new THREE.PerspectiveCamera(48, 2, 0.1, 100);
        camera.position.set(11.5, 8.5, 13.5); camera.lookAt(0, 1.5, 0);
        var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        if ('outputEncoding' in renderer && THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
        scene.add(new THREE.HemisphereLight(0x9adfff, 0x12091f, 0.85));
        var keyLight = new THREE.DirectionalLight(0xffffff, 0.72); keyLight.position.set(4, 9, 7); scene.add(keyLight);
        var ground = new THREE.Mesh(new THREE.PlaneGeometry(12, 9), new THREE.MeshPhongMaterial({ color: 0x090d20, shininess: 25 }));
        ground.rotation.x = -Math.PI / 2; ground.position.y = -0.04; scene.add(ground);
        var grid = new THREE.GridHelper(12, 24, 0x22d3ee, 0x24304b); grid.scale.z = 0.72; scene.add(grid);
        var laneZ = [-3, 0, 3];
        for (var li = 0; li < 3; li++) {
          var laneGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-5.4, 0.03, laneZ[li]), new THREE.Vector3(5.4, 0.03, laneZ[li])]);
          scene.add(new THREE.Line(laneGeo, new THREE.LineBasicMaterial({ color: arenaConfig.lanes[li].color, transparent: true, opacity: 0.28 })));
        }
        var relays = [[], []];
        for (var defender = 0; defender < 2; defender++) {
          for (var laneNo = 0; laneNo < 3; laneNo++) {
            var relayLevel = battleLane(laneNo, arenaConfig.id), shooter = defender === 1 ? 0 : 1;
            var rx = shooter === 0 ? -5 + relayLevel.node.x : 5 - relayLevel.node.x;
            var relayMat = new THREE.MeshPhongMaterial({ color: arenaConfig.lanes[laneNo].color, emissive: arenaConfig.lanes[laneNo].color, emissiveIntensity: 0.8, transparent: true });
            var relay = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 14), relayMat);
            relay.position.set(rx, Math.max(0.28, relayLevel.node.y * 0.52), laneZ[laneNo]);
            scene.add(relay); relays[defender][laneNo] = relay;
          }
        }
        // Mirror each selected arena's wall and gate markers into both firing directions.
        for (var obstacleLane = 0; obstacleLane < 3; obstacleLane++) {
          var obstacleLevel = battleLane(obstacleLane, arenaConfig.id), obstacleColor = arenaConfig.lanes[obstacleLane].color;
          (obstacleLevel.walls || []).forEach(function (wallSpec) {
            var wallHeight = Math.max(0.2, wallSpec.height * 0.52);
            var wallX = -5 + wallSpec.x;
            var wall = new THREE.Mesh(new THREE.BoxGeometry(0.24, wallHeight, 0.72), new THREE.MeshPhongMaterial({ color: 0x64748b, emissive: 0x101827 }));
            wall.position.set(wallX, wallHeight / 2, laneZ[obstacleLane]);
            scene.add(wall);
            var wallMirror = wall.clone(); wallMirror.material = wall.material.clone(); wallMirror.position.x = -wallX;
            scene.add(wallMirror);
          });
          (obstacleLevel.gates || []).forEach(function (gate) {
            var px = -5 + gate.x, center = (gate.lo + gate.hi) * 0.26;
            var post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.8, 0.32), new THREE.MeshPhongMaterial({ color: obstacleColor, emissive: obstacleColor, transparent: true, opacity: 0.62 }));
            post.position.set(px, center, laneZ[obstacleLane]);
            scene.add(post);
            var mirror = post.clone(); mirror.material = post.material.clone(); mirror.position.x = -px;
            scene.add(mirror);
          });
        }
        var trailGroup = new THREE.Group(); scene.add(trailGroup);
        var pack = { THREE: THREE, scene: scene, camera: camera, renderer: renderer, relays: relays, trailGroup: trailGroup };
        packRef.current = pack;
        function resize() {
          if (disposed || !canvas.parentElement) return;
          var width = Math.max(280, canvas.parentElement.clientWidth || 640), height = Math.max(220, Math.min(380, width * 0.52));
          renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
          renderer.render(scene, camera);
        }
        resize();
        if (window.ResizeObserver) { resizeObserver = new window.ResizeObserver(resize); resizeObserver.observe(canvas.parentElement); }
        syncArcBattle3D(pack, props.battle);
        setStatus('ready');
      }).catch(function () { if (!disposed) setStatus('unavailable'); });
      return function () {
        disposed = true;
        if (resizeObserver) resizeObserver.disconnect();
        disposeArcBattle3D(packRef.current); packRef.current = null;
      };
    }, []);
    React.useEffect(function () { if (packRef.current) syncArcBattle3D(packRef.current, props.battle); }, [props.battle]);
    return h('div', { style: { position: 'relative', marginBottom: 10, border: '1px solid rgba(34,211,238,0.35)', borderRadius: 12, overflow: 'hidden', background: '#050712' } },
      h('canvas', { ref: canvasRef, 'aria-hidden': 'true', style: { display: 'block', width: '100%', minHeight: 220 } }),
      status !== 'ready' ? h('div', { role: 'status', style: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 20, color: '#e2e8f0', background: 'rgba(5,7,18,0.88)', textAlign: 'center', fontSize: 12 } }, status === 'unavailable' ? '3D unavailable. Continue in the complete tactical view below.' : 'Loading the optional 3D arena…') : null,
      h('div', { style: { padding: '6px 10px', color: '#cbd5e1', fontSize: 11 } }, 'Visual 3D projection — match rules and controls remain in the tactical view below.'));
  }

  // ══════════════════════════════════════════════════════════════════════
  // Registration + render
  // ══════════════════════════════════════════════════════════════════════
  window.StemLab.registerTool('arccity', {
    icon: '🌆', // 🌆
    label: 'Arc City',
    desc: 'Author functions, re-light a neon city, and battle across two function-powered Circuit Clash arenas.',
    color: 'fuchsia',
    category: 'strategy',
    render: function (ctx) {
      var React = ctx && ctx.React;
      if (!React) { return null; }
      var h = React.createElement;
      try {
        var toolData = ctx.toolData || {};
        var setToolData = ctx.setToolData;
        // honor the 2nd-arg English fallback (ctx.t is single-arg & ignores it; see dev-tools/check_i18n_fallback.cjs)
        var t = function (k, fb) { var v; try { v = (typeof ctx.t === 'function') ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };

        // Render the board immediately from an inline default; persist the initial
        // state in the background. This previously returned a "Loading…" placeholder
        // and gated the first board render on a setToolData round-trip — but that
        // setState runs DURING render, so the host defers it (setTimeout via
        // _renderingFlag), which left the tool STUCK on "Loading…". Reading a default
        // inline (the same pattern Dino Lab uses) renders the board on the first
        // pass; interactions still persist via the event-handler setToolData calls.
        var rawArcState = toolData._arccity;
        var S = migrateArcState(rawArcState);
        // Migration is idempotent and preserves every existing progress field. The
        // host defers render-phase writes, so first paint remains immediate.
        if ((!rawArcState || rawArcState.schemaVersion !== ARC_STATE_VERSION) && typeof setToolData === 'function') {
          setToolData(function (prev) {
            var migrated = migrateArcState(prev && prev._arccity);
            if (prev && prev._arccity && prev._arccity.schemaVersion === ARC_STATE_VERSION) return prev;
            return Object.assign({}, prev, { _arccity: migrated });
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
        var battle = normalizeBattleState(S.battle);
        var battleArenaConfig = battleArena(battle.arena);
        var battleLaneMeta = battleArenaConfig.lanes;
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
            // flawless (3rd star): an independent solve with ZERO misses THIS run
            // (base.misses is the count before this shot). Sticky once earned.
            var flawless = base.flawless || (r.result === 'hit' && solveIsIndependent(tier) && (base.misses || 0) === 0);
            bl[level.id] = Object.assign({}, base, { params: P, shots: shots, solved: solved, misses: misses, independent: base.independent || indep, flawless: flawless });
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
            // Reset = a FRESH attempt: clear the shot/miss counters (so a clean run can
            // earn the 3rd star) but KEEP the earned achievements (solved/independent/
            // flawless/stars never regress).
            bl[level.id] = Object.assign({}, base, { params: defaultParams(level), shots: 0, misses: 0 });
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
            var cur = migrateArcState((prev && prev._arccity) || S);
            var patch = { view: v };
            if (v === 'battle' && !cur.battle) patch.battle = createBattleState('cpu');
            return Object.assign({}, prev, { _arccity: Object.assign({}, cur, patch) });
          });
          announceArc(ctx, v === 'teacher' ? t('arccity.view_teacher', 'Teacher view.') : (v === 'battle' ? 'Circuit Clash battle view.' : t('arccity.view_play', 'Play view.')));
        }
        function replaceBattle(nextBattle, rootPatch) {
          if (typeof setToolData !== 'function') return;
          setToolData(function (prev) {
            var cur = migrateArcState((prev && prev._arccity) || S);
            return Object.assign({}, prev, { _arccity: Object.assign({}, cur, rootPatch || {}, { battle: normalizeBattleState(nextBattle) }) });
          });
        }
        function setBattleMode(mode) {
          replaceBattle(createBattleState(mode, { assist: battle.assist, trailRule: battle.trailRule, cpuLevel: battle.cpuLevel, arena: battle.arena }));
          announceArc(ctx, 'New Circuit Clash match: ' + (mode === 'hotseat' ? 'two-player hot-seat.' : 'solo versus CPU.'));
        }
        function setBattleArena(arenaId) {
          var arena = battleArena(arenaId);
          replaceBattle(createBattleState(battle.mode, { assist: battle.assist, trailRule: battle.trailRule, cpuLevel: battle.cpuLevel, arena: arena.id }));
          announceArc(ctx, arena.title + ' arena selected. New match ready. ' + arena.blurb);
        }
        function setBattleAssist(assist) {
          var next = normalizeBattleState(battle);
          next.assist = assist === 'challenge' ? 'challenge' : 'guided';
          var message = next.assist === 'challenge' ? 'Challenge aim enabled. The trajectory and result preview stay hidden until Fire.' : 'Guided aim enabled. The trajectory and result preview are visible before Fire.';
          next.log = [message].concat(next.log).slice(0, 12);
          replaceBattle(next);
          announceArc(ctx, message);
        }
        function setBattleTrailRule(rule) {
          var trailRule = rule === 'walls' ? 'walls' : 'visual';
          var next = createBattleState('hotseat', { assist: battle.assist, trailRule: trailRule, cpuLevel: battle.cpuLevel, arena: battle.arena });
          var message = trailRule === 'walls'
            ? 'Trail Walls enabled. Failed opposing trails can block later shots in the same circuit. New match ready.'
            : 'Visual Trails enabled. Trails show shot history but do not block beams. New match ready.';
          next.log = [message].concat(next.log).slice(0, 12);
          replaceBattle(next);
          announceArc(ctx, message);
        }
        function setBattleCpuLevel(level) {
          var next = normalizeBattleState(battle);
          next.cpuLevel = level === 'practice' ? 'practice' : 'standard';
          var message = next.cpuLevel === 'practice' ? 'Practice CPU enabled. It demonstrates one near miss before solving each relay.' : 'Standard CPU enabled. It uses a direct solved strategy.';
          next.log = [message].concat(next.log).slice(0, 12);
          replaceBattle(next);
          announceArc(ctx, message);
        }
        function setBattleLane(lane) {
          var next = normalizeBattleState(battle), selected = next.selectedLane.slice();
          selected[next.turn] = lane;
          replaceBattle(Object.assign({}, next, { selectedLane: selected }));
          announceArc(ctx, battleLaneMeta[lane].title + ' selected. ' + describeBoard(battleLane(lane, battle.arena)));
        }
        function setBattleParam(name, raw) {
          var next = normalizeBattleState(battle);
          var seat = next.turn, lane = next.selectedLane[seat], laneLevel = battleLane(lane, next.arena);
          if (!laneLevel.params[name] || laneLevel.params[name].locked) return;
          var value = snapToRange(Number(raw), laneLevel.params[name]);
          var drafts = next.drafts.map(function (seatDrafts) {
            return seatDrafts.map(function (p) { return Object.assign({}, p); });
          });
          drafts[seat][lane][name] = value;
          replaceBattle(Object.assign({}, next, { drafts: drafts }));
        }
        function setBattleWeapon(weapon) {
          var next = normalizeBattleState(battle), seat = next.turn;
          if (next.trailRule !== 'walls' || next.status === 'won' || next.handoff) return;
          var weapons = next.weapon.slice();
          weapons[seat] = weapon === 'phase' && next.phaseCharges[seat] > 0 ? 'phase' : 'standard';
          replaceBattle(Object.assign({}, next, { weapon: weapons }));
          announceArc(ctx, weapons[seat] === 'phase' ? 'Phase Pulse armed. This shot will pass through light trails but must still clear the circuit.' : 'Standard function trail armed.');
        }
        function beginBattleTurn() {
          var outcome = battleBeginTurn(battle);
          if (outcome.battle === battle || !battle.handoff) return;
          replaceBattle(outcome.battle);
          announceArc(ctx, outcome.message);
        }

        function fireBattle() {
          if (battle.status === 'won') return;
          if (battle.handoff) {
            announceArc(ctx, 'Pass the device and confirm the next player before firing.');
            return;
          }
          if (battle.mode === 'cpu' && battle.turn === 1) {
            announceArc(ctx, 'CPU turn. Press Run CPU turn.');
            return;
          }
          var outcome = battleFire(battle);
          replaceBattle(outcome.battle);
          announceArc(ctx, outcome.message);
          if (!muted) { try { sfxFire(); if (outcome.captured) sfxHit(); else sfxBlock(); } catch (e) { } }
        }
        function runBattleCpu() {
          if (battle.mode !== 'cpu' || battle.turn !== 1 || battle.status === 'won') return;
          var choice = battleCpuChoice(battle);
          var prepared = normalizeBattleState(battle);
          var selected = prepared.selectedLane.slice(); selected[1] = choice.lane;
          prepared = Object.assign({}, prepared, { selectedLane: selected });
          var outcome = battleFire(prepared, choice.params, choice.lane);
          var cpuMessage = choice.strategy === 'probe' ? 'CPU practice probe. ' + outcome.message : outcome.message;
          outcome.battle.log[0] = cpuMessage;
          replaceBattle(outcome.battle);
          announceArc(ctx, cpuMessage);
          if (!muted) { try { sfxFire(); if (outcome.captured) sfxHit(); else sfxBlock(); } catch (e) { } }
        }
        function resetBattle() {
          replaceBattle(createBattleState(battle.mode, { assist: battle.assist, trailRule: battle.trailRule, cpuLevel: battle.cpuLevel, arena: battle.arena }));
          announceArc(ctx, 'Circuit Clash reset. Player 1 begins.');
        }
        function setBattleReplay(index) {
          var next = normalizeBattleState(battle);
          if (next.status !== 'won' || !next.trails.length) return;
          var frame = battleReplayFrame(next, index);
          if (!frame) return;
          var comparison = battleReplayComparison(next, frame.index);
          replaceBattle(Object.assign({}, next, { replayIndex: frame.index }));
          announceArc(ctx, frame.announcement + (comparison ? ' ' + comparison.summary : ''));
        }

        function toggleBattle3D() {
          if (typeof setToolData !== 'function') return;
          setToolData(function (prev) {
            var cur = migrateArcState((prev && prev._arccity) || S);
            return Object.assign({}, prev, { _arccity: Object.assign({}, cur, { battle3d: !cur.battle3d }) });
          });
          announceArc(ctx, S.battle3d ? '3D arena hidden. The tactical view remains active.' : '3D arena requested. The tactical view remains active below it.');
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
            try {
              window.removeEventListener('pointermove', move);
              window.removeEventListener('pointerup', up);
              window.removeEventListener('pointercancel', up);
              window.removeEventListener('blur', up);
            } catch (e) { }
          }
          try {
            window.addEventListener('pointermove', move);
            window.addEventListener('pointerup', up);
            window.addEventListener('pointercancel', up);
            window.addEventListener('blur', up);
          } catch (e) { }
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

        // ── Axis tick numbers + titles ──
        // A graphing tool must let the student READ coordinates off the grid:
        // without these, tuning m to reach node (8,4) meant counting unlabeled
        // gridlines. Integer ticks along the bottom (x) and left (y) edges (inset
        // so the overflow-hidden viewBox never clips them), a single origin "0",
        // and x/y axis titles. Bounds come from the world (not hardcoded) so they
        // track any window. paintOrder halo keeps them legible over grid/sky on
        // both themes; INK is the WCAG-tested, theme-aware ink colour.
        var axisEls = [];
        var _gxMax = Math.round(wx1), _gyMax = Math.round(wy1);
        var _tickHalo = THEME === 'dark' ? 'rgba(2,8,6,0.55)' : 'rgba(255,255,255,0.7)';
        var _tickStyle = { paintOrder: 'stroke', stroke: _tickHalo, strokeWidth: 2.5 };
        axisEls.push(h('text', { key: 'ax0', x: 6, y: H - 5, textAnchor: 'start', fill: INK, fontSize: 10, fontWeight: 600, style: _tickStyle, 'aria-hidden': 'true' }, '0'));
        for (var _tx = 1; _tx < _gxMax; _tx++) axisEls.push(h('text', { key: 'axx' + _tx, x: sx(_tx), y: H - 5, textAnchor: 'middle', fill: INK, fontSize: 10, fontWeight: 600, style: _tickStyle, 'aria-hidden': 'true' }, String(_tx)));
        for (var _ty = 1; _ty < _gyMax; _ty++) axisEls.push(h('text', { key: 'axy' + _ty, x: 6, y: sy(_ty) + 3, textAnchor: 'start', fill: INK, fontSize: 10, fontWeight: 600, style: _tickStyle, 'aria-hidden': 'true' }, String(_ty)));
        axisEls.push(h('text', { key: 'axtX', x: W - 6, y: H - 6, textAnchor: 'end', fill: INK, fontSize: 12, fontWeight: 700, fontStyle: 'italic', style: _tickStyle, 'aria-hidden': 'true' }, 'x'));
        axisEls.push(h('text', { key: 'axtY', x: 6, y: 14, textAnchor: 'start', fill: INK, fontSize: 12, fontWeight: 700, fontStyle: 'italic', style: _tickStyle, 'aria-hidden': 'true' }, 'y'));

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

        // Transformations (match) levels have no node-to-light — the payoff is the
        // player curve overlaying the ghost (and turning green on a match). Suppress
        // the node circle + halo, but keep the celebration burst on a match-hit.
        var isMatch = level.goal === 'match';
        var nodeR = (W / (wx1 - wx0)) * level.node.r;
        var lit = ls.solved || res.result === 'hit';
        var ncx = sx(level.node.x), ncy = sy(level.node.y);
        // The node "powers on" with a squash-overshoot punch the instant it lights
        // (key flips on lit ⇒ remount ⇒ the one-shot pop plays exactly once).
        var nodeEl = isMatch ? null : h('circle', {
          key: 'node-' + (lit ? 'on' : 'off'), cx: ncx, cy: ncy, r: nodeR,
          fill: lit ? NODE_ON : NODE_OFF, opacity: lit ? 1 : 0.85,
          filter: lit ? 'url(#arc-glow-strong)' : 'url(#arc-glow)',
          className: lit ? 'arccity-node-lit' : 'arccity-node-unlit', stroke: lit ? NODE_ON : NODE_OFF, strokeWidth: 2
        });
        // Soft halo behind a lit node; full celebration the moment a shot lands.
        var nodeGlowEls = (!isMatch && lit) ? [h('circle', { key: 'nodehalo', cx: ncx, cy: ncy, r: nodeR * 1.9, fill: NODE_ON, opacity: 0.24, filter: 'url(#arc-glow-strong)', className: 'arccity-halo', 'aria-hidden': 'true' })] : [];
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
          // On a match level the burst anchors at the board-centre node stub (5,4) —
          // an intentional centred celebration — and the word reflects the goal.
          h('text', { key: 'pop-' + sk, x: W / 2, y: 54, textAnchor: 'middle', fill: NODE_ON, fontSize: 34, fontWeight: 900, className: 'arccity-pop', 'aria-hidden': 'true', style: { letterSpacing: '1px', paintOrder: 'stroke', stroke: 'rgba(2,8,6,0.35)', strokeWidth: 3 } }, isMatch ? 'MATCHED!' : successWord(sk))
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
        // Ghost target curve (Transformations world): the faint curve to overlay.
        // Shown ONLY when the preview is — same anti-fishing gate as the player's own
        // curve (hidden on guided/independent until Fire). Distinct dash + glow so it
        // never reads as the player's line.
        var ghostCurveEls = [];
        if (isMatch && level.ghost && showPreview) {
          // Sample the SAME (normalized, copied) ghost the adjudication judges against,
          // so the drawn target can never diverge from the one classifyMatch compares.
          var gp = normalizeForMatch(level.family, Object.assign({}, level.ghost.params));
          var gsamp = sampleCurve(level, gp), gs = '';
          for (var gi = 0; gi < gsamp.length; gi++) { var gy = gsamp[gi].y; if (gy < wy0 - 2 || gy > wy1 + 2) continue; gs += sx(gsamp[gi].x) + ',' + sy(gy) + ' '; }
          // opacity 0.85 (clears WCAG 3:1 for graphical objects on the light canvas)
          // + a long dash distinct from the player preview's '4 5', so it never reads
          // as the player's own line.
          ghostCurveEls.push(h('polyline', { key: 'ghost-curve', points: gs.trim(), fill: 'none', stroke: GATE, strokeWidth: 3, strokeDasharray: '10 6', opacity: 0.85, filter: 'url(#arc-glow)', 'aria-hidden': 'true' }));
        }
        var previewEls = [];
        if (showPreview) {
          previewEls.push(h('polyline', { key: 'preview', points: ptsStr(null), fill: 'none', stroke: INK, strokeWidth: 2, strokeDasharray: '4 5', opacity: 0.55 }));
        } else {
          // Hidden-preview tier: the curve (and, on match levels, the ghost) is
          // concealed until Fire (anti-fishing).
          previewEls.push(h('text', { key: 'pvhide', x: W / 2, y: 28, textAnchor: 'middle', fill: INK, opacity: 0.6, fontSize: 14 }, isMatch ? t('arccity.preview_hidden_match', 'Preview hidden — predict the curve, then Fire ⚡') : t('arccity.preview_hidden', 'Preview hidden — predict, then Fire ⚡')));
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
            handleEls.push(h('text', { key: 'vhl', x: sx(P.h) + 12, y: sy(P.k) - 8, fill: HANDLE, fontSize: 11, 'aria-hidden': 'true' }, t('stem.arccity.vertex_h_k', 'vertex (h, k)')));
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
            handleEls.push(h('text', { key: 'shl', x: sx(xc) + 12, y: sy(yc) - 8, fill: HANDLE, fontSize: 11, 'aria-hidden': 'true' }, t('stem.arccity.crest_drag_onto_a_window', 'crest — drag onto a window')));
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

        // ── Coordinate-reading helpers: the y-intercept (0, b) marker for line
        // levels + a live readout of where the beam crosses the target's x
        // column vs the node's own y. The readout only shows when the curve is
        // visible (respects the hidden-preview anti-fishing gate). All aria-hidden.
        var mathEls = [];
        var _mhalo = THEME === 'dark' ? 'rgba(2,8,6,0.55)' : 'rgba(255,255,255,0.7)';
        if (level.family === 'line' && P.b >= wy0 - 0.5 && P.b <= wy1 + 0.5) {
          var _byPx = sy(P.b);
          mathEls.push(h('circle', { key: 'bdot', cx: sx(0), cy: _byPx, r: 4.5, fill: BEAM, stroke: '#06262b', strokeWidth: 1.5, 'aria-hidden': 'true' }));
          mathEls.push(h('text', { key: 'blabel', x: sx(0) + 8, y: _byPx - 6, fill: BEAM, fontSize: 11, fontWeight: 800, style: { paintOrder: 'stroke', stroke: _mhalo, strokeWidth: 2.6 }, 'aria-hidden': 'true' }, 'b = ' + fmtVal(P.b, level.params.b.step)));
        }
        if (showPreview && !isMatch && level.node) {
          var _nx = level.node.x, _ny = fnY(level.family, P, _nx);
          if (isFinite(_ny) && _ny >= wy0 - 1 && _ny <= wy1 + 1) {
            mathEls.push(h('line', { key: 'bhdrop', x1: sx(_nx), y1: sy(_ny), x2: sx(_nx), y2: sy(level.node.y), stroke: INK, strokeWidth: 1, strokeDasharray: '2 3', opacity: 0.5, 'aria-hidden': 'true' }));
            mathEls.push(h('circle', { key: 'bhdot', cx: sx(_nx), cy: sy(_ny), r: 3.5, fill: 'none', stroke: BEAM, strokeWidth: 2, 'aria-hidden': 'true' }));
            mathEls.push(h('text', { key: 'bhlabel', x: sx(_nx) - 7, y: sy(_ny) - 5, textAnchor: 'end', fill: INK, fontSize: 10, fontWeight: 700, style: { paintOrder: 'stroke', stroke: _mhalo, strokeWidth: 2.6 }, 'aria-hidden': 'true' }, 'y=' + (Math.round(_ny * 10) / 10)));
          }
        }

        var svg = (gauntlet && gauntlet.empty) ? null : h('svg', {
          key: 'svg', viewBox: '0 0 ' + W + ' ' + H, width: '100%',
          role: 'img', 'aria-label': describeBoard(level),
          style: { display: 'block', maxHeight: '50vh', background: 'transparent', borderRadius: 12, border: '1px solid ' + GRID, overflow: 'hidden', touchAction: 'none' }
        }, [].concat([defs], backdropEls, gridEls, axisEls, obstacleEls, ghostEls, ghostCurveEls, previewEls, overlay, mathEls, nodeGlowEls, (nodeEl ? [nodeEl] : []), nodeBurstEls, handleEls));

        // ── Level progression bar ──
        var levelBtns = LEVELS.map(function (lv, i) {
          var unlocked = isLevelUnlocked(byLevel, i);
          // The Gauntlet keys its stage progress under 'G-Lx', so its tile reads
          // "solved" from completion of all stages, and "current" from the selected
          // raw level id (the resolved `level` is the stage clone, not L9).
          var solved = lv.family === 'gauntlet' ? gauntletComplete(byLevel, gauntletOrder(byLevel, lv.stages)) : !!(byLevel[lv.id] && byLevel[lv.id].solved);
          var current = lv.id === (S.levelId || 'L1');
          var face = (solved ? '✅ ' : (unlocked ? '' : '🔒 ')) + lv.title;
          // Mastery stars (function levels only — the Gauntlet shows ✅ via its own rule).
          var stars = lv.family === 'gauntlet' ? 0 : levelStars(byLevel[lv.id]);
          var starLine = stars > 0
            ? h('div', { key: 'stars', 'aria-hidden': 'true', style: { fontSize: 11, lineHeight: 1, marginTop: 3, letterSpacing: '1px', color: PAL.warn } }, '★★★☆☆☆'.slice(3 - stars, 6 - stars))
            : null;
          return h('button', {
            key: 'lvl-' + lv.id, type: 'button', disabled: !unlocked,
            'aria-current': current ? 'true' : null,
            'aria-label': lv.title + (solved ? ' (completed' + (stars ? ', ' + stars + ' of 3 stars' : '') + ')' : (unlocked ? '' : ' (locked)')),
            onClick: function () { if (unlocked) switchLevel(lv.id); },
            style: {
              padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: current ? 800 : 600,
              border: '1px solid ' + (current ? BEAM : GRID),
              background: current ? 'rgba(34,211,238,0.15)' : 'transparent',
              color: unlocked ? INK : 'var(--allo-stem-text-soft, #475569)',
              opacity: unlocked ? 1 : 0.7, cursor: unlocked ? 'pointer' : 'not-allowed', textAlign: 'center'
            }
          }, h('div', { key: 'face' }, face), starLine);
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
          viewBtn('battle', 'Circuit Clash'),
          viewBtn('play', '🎮 ' + t('arccity.play', 'Play')), viewBtn('teacher', '📋 ' + t('arccity.teacher', 'Teacher view')));

        // ── Teacher panel: honest, anonymous, deterministic; FERPA export OFF by default (§9.5) ──
        var summary = teacherSummary(byLevel, badges);
        var teacherPanel = h('div', { key: 'teacherpanel', style: { marginTop: 4 } },
          h('div', { key: 'caveat', role: 'note', style: { fontSize: 13, lineHeight: 1.5, color: INK, padding: '10px 12px', borderRadius: 8, border: '1px solid ' + GRID, background: 'rgba(148,163,184,0.10)', marginBottom: 12 } }, '⚠️ ' + summary.caveat),
          h('h3', { key: 'psh', style: { fontSize: 15, margin: '0 0 8px', color: INK } }, t('arccity.progress_summary', 'Progress summary')),
          h('div', { key: 'relit', style: { fontSize: 14, fontWeight: 700, color: INK, marginBottom: 4 } }, t('arccity.levels_solved', 'Levels solved:') + ' ' + summary.nodesReLit + ' / ' + summary.totalLevels),
          h('div', { key: 'starsline', style: { fontSize: 14, fontWeight: 700, color: INK, marginBottom: 2 } }, t('arccity.stars', 'Stars:') + ' ' + summary.stars + ' / ' + summary.starsMax),
          h('div', { key: 'starlegend', style: { fontSize: 11, color: INK, opacity: 0.65, marginBottom: 10 } }, summary.starLegend),
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
              if (l.stars) bit += '  ' + '★★★☆☆☆'.slice(3 - l.stars, 6 - l.stars);
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

        // ── Circuit Clash tactical projection. The SVG is the complete, accessible
        // game surface; the optional Three.js arena added below is a peer view only.
        var battleReplay = battle.status === 'won' ? battleReplayFrame(battle) : null;
        var battleReplayComparisonData = battleReplay ? battleReplayComparison(battle, battleReplay.index) : null;
        var battleSeat = battleReplay ? battleReplay.trail.seat : battle.turn;
        var battleDefender = battleSeat === 0 ? 1 : 0;
        var battleLaneIndex = battleReplay ? battleReplay.lane : battle.selectedLane[battleSeat];
        var battleLevel = battleLane(battleLaneIndex, battle.arena);
        var battleParams = battleReplay ? (battleReplay.trail.params || defaultParams(battleLevel)) : battle.drafts[battleSeat][battleLaneIndex];
        var battlePreview = sampleCurve(battleLevel, battleParams);
        var battlePreviewBaseResult = classifyShot(battleLevel, battleParams);
        var battleWeapon = battleReplay ? (battleReplay.trail.weapon === 'phase' ? 'phase' : 'standard') : (battle.trailRule === 'walls' && battle.weapon[battleSeat] === 'phase' && battle.phaseCharges[battleSeat] > 0 ? 'phase' : 'standard');
        var battlePreviewResult = battleWeapon === 'phase' ? battlePreviewBaseResult : (battleTrailCollision(battleLevel, battlePreview, battle, battleSeat, battleLaneIndex, battlePreviewBaseResult) || battlePreviewBaseResult);
        var battleHandoff = battle.mode === 'hotseat' && battle.handoff && battle.status !== 'won';
        var battleLocked = battle.status === 'won' || battleHandoff || (battle.mode === 'cpu' && battleSeat === 1);
        var battlePreviewVisible = battle.status !== 'won' && !battleHandoff && battle.assist !== 'challenge' && !(battle.mode === 'cpu' && battleSeat === 1);
        var BW = 640, BH = 340;
        function bsx(x) { return x / 10 * BW; }
        function bsy(y) { return BH - y / 8 * BH; }
        function battleGlobalX(localX, seat) { return seat === 0 ? localX : 10 - localX; }
        function battlePoints(samples, seat, killX) {
          var out = '';
          for (var bi = 0; bi < samples.length; bi++) {
            var pt = samples[bi];
            if (killX != null && pt.x > killX + 0.001) continue;
            if (!isFinite(pt.y) || pt.y < -1 || pt.y > 9) continue;
            out += bsx(battleGlobalX(pt.x, seat)) + ',' + bsy(pt.y) + ' ';
          }
          return out.trim();
        }
        var battleSvgEls = [];
        battleSvgEls.push(h('rect', { key: 'bg', x: 0, y: 0, width: BW, height: BH, fill: THEME === 'light' ? '#f8fafc' : '#070b18' }));
        for (var bgx = 0; bgx <= 10; bgx++) battleSvgEls.push(h('line', { key: 'bgx' + bgx, x1: bsx(bgx), y1: 0, x2: bsx(bgx), y2: BH, stroke: GRID, strokeWidth: 0.6, opacity: 0.35 }));
        for (var bgy = 0; bgy <= 8; bgy++) battleSvgEls.push(h('line', { key: 'bgy' + bgy, x1: 0, y1: bsy(bgy), x2: BW, y2: bsy(bgy), stroke: GRID, strokeWidth: 0.6, opacity: 0.35 }));
        battleSvgEls.push(h('text', { key: 'p1label', x: 10, y: 20, fill: INK, fontSize: 12, fontWeight: 800 }, 'PLAYER 1'));
        battleSvgEls.push(h('text', { key: 'p2label', x: BW - 10, y: 20, fill: INK, fontSize: 12, fontWeight: 800, textAnchor: 'end' }, battle.mode === 'cpu' ? 'CPU' : 'PLAYER 2'));
        // Draw previous shots as bounded Tron-like light trails.
        battle.trails.forEach(function (trail, ti) {
          var meta = battleLaneMeta[trail.lane] || battleLaneMeta[0];
          battleSvgEls.push(h('polyline', {
            key: 'bt-' + trail.id + '-' + ti,
            points: battlePoints(trail.samples || [], trail.seat, trail.killedAt && trail.killedAt.x),
            fill: 'none', stroke: trail.weapon === 'phase' ? '#ffffff' : meta.color, strokeWidth: trail.weapon === 'phase' ? 4 : 2.5,
            strokeDasharray: trail.weapon === 'phase' || trail.result === 'hit' ? null : '7 5', opacity: trail.weapon === 'phase' ? 0.9 : 0.42,
            'aria-hidden': 'true'
          }));
          if (trail.result === 'trail' && trail.killedAt) {
            battleSvgEls.push(h('circle', { key: 'bt-hit-' + trail.id + '-' + ti, cx: bsx(battleGlobalX(trail.killedAt.x, trail.seat)), cy: bsy(trail.killedAt.y), r: 6, fill: PAL.danger, stroke: '#ffffff', strokeWidth: 1.5, 'aria-hidden': 'true' }));
          }
        });
        if (battleReplay) {
          if (battleReplayComparisonData && battleReplayComparisonData.comparable) {
            var compareTrail = battleReplayComparisonData.previousTrail;
            var compareKillX = compareTrail.killedAt && compareTrail.killedAt.x;
            battleSvgEls.push(h('polyline', { key: 'battle-replay-compare-trail', points: battlePoints(compareTrail.samples || [], compareTrail.seat, compareKillX), fill: 'none', stroke: '#94a3b8', strokeWidth: 3, strokeDasharray: '4 4', opacity: 0.82, 'aria-hidden': 'true' }));
          }
          var replayTrail = battleReplay.trail, replayKillX = replayTrail.killedAt && replayTrail.killedAt.x, replayEndpoint = null;
          for (var replayPointIndex = 0; replayPointIndex < (replayTrail.samples || []).length; replayPointIndex++) {
            var replayPoint = replayTrail.samples[replayPointIndex];
            if (replayKillX != null && replayPoint.x > replayKillX + 0.001) continue;
            if (!isFinite(replayPoint.y) || replayPoint.y < -1 || replayPoint.y > 9) continue;
            replayEndpoint = replayPoint;
          }
          battleSvgEls.push(h('polyline', { key: 'battle-replay-trail', points: battlePoints(replayTrail.samples || [], replayTrail.seat, replayKillX), fill: 'none', stroke: '#ffffff', strokeWidth: 6, opacity: 1, filter: 'url(#arc-glow)', 'aria-hidden': 'true' }));
          if (replayEndpoint) {
            battleSvgEls.push(h('circle', { key: 'battle-replay-end', cx: bsx(battleGlobalX(replayEndpoint.x, replayTrail.seat)), cy: bsy(replayEndpoint.y), r: 7, fill: '#111827', stroke: '#ffffff', strokeWidth: 3, 'aria-hidden': 'true' }));
          }
        }
        // Obstacles are mirrored into the active player's firing direction.
        (battleLevel.walls || []).forEach(function (wall, wi) {
          var wx = battleGlobalX(wall.x, battleSeat);
          battleSvgEls.push(h('rect', { key: 'bwall' + wi, x: bsx(wx) - 5, y: bsy(wall.height), width: 10, height: bsy(0) - bsy(wall.height), fill: WALL, rx: 2 }));
        });
        (battleLevel.gates || []).forEach(function (gate, gi2) {
          var gx2 = battleGlobalX(gate.x, battleSeat);
          battleSvgEls.push(h('rect', { key: 'bglo' + gi2, x: bsx(gx2) - 5, y: bsy(gate.lo), width: 10, height: bsy(0) - bsy(gate.lo), fill: GATE, opacity: 0.82, rx: 2 }));
          battleSvgEls.push(h('rect', { key: 'bghi' + gi2, x: bsx(gx2) - 5, y: 0, width: 10, height: bsy(gate.hi), fill: GATE, opacity: 0.82, rx: 2 }));
        });
        // Current authored function preview.
        if (battlePreviewVisible) {
          battleSvgEls.push(h('polyline', {
            key: 'battle-preview', points: battlePoints(battlePreview, battleSeat, battlePreviewResult.killedAt && battlePreviewResult.killedAt.x),
            fill: 'none', stroke: battleWeapon === 'phase' ? '#ffffff' : (battleSeat === 0 ? '#22d3ee' : '#f472b6'),
            strokeWidth: battleWeapon === 'phase' ? 4 : 3.5, strokeDasharray: battleWeapon === 'phase' ? null : '5 4', filter: 'url(#arc-glow)'
          }));
          if (battlePreviewResult.result === 'trail' && battlePreviewResult.killedAt) {
            battleSvgEls.push(h('circle', { key: 'battle-preview-collision', cx: bsx(battleGlobalX(battlePreviewResult.killedAt.x, battleSeat)), cy: bsy(battlePreviewResult.killedAt.y), r: 7, fill: '#ef4444', stroke: '#ffffff', strokeWidth: 2, 'aria-hidden': 'true' }));
          }
        } else {
          battleSvgEls.push(h('text', { key: 'battle-preview-hidden', x: BW / 2, y: 42, textAnchor: 'middle', fill: INK, opacity: 0.7, fontSize: 13, fontWeight: 800 }, battleHandoff ? 'PASS DEVICE — CONTROLS HIDDEN' : (battle.mode === 'cpu' && battleSeat === 1 ? 'CPU TRAJECTORY HIDDEN' : 'CHALLENGE AIM — PREVIEW HIDDEN')));
        }
        // Three relays per side. Each lane keeps its own forcing-certified target.
        [0, 1].forEach(function (defender) {
          for (var laneNo = 0; laneNo < 3; laneNo++) {
            var relayLevel = battleLane(laneNo, battle.arena);
            var shooter = defender === 1 ? 0 : 1;
            var relayX = battleGlobalX(relayLevel.node.x, shooter);
            var relayY = relayLevel.node.y;
            var relayOn = battle.shields[defender][laneNo];
            var selectedTarget = defender === battleDefender && laneNo === battleLaneIndex;
            if (selectedTarget) battleSvgEls.push(h('circle', { key: 'bring' + defender + '-' + laneNo, cx: bsx(relayX), cy: bsy(relayY), r: 19, fill: 'none', stroke: PAL.warn, strokeWidth: 2.5, strokeDasharray: '4 3' }));
            battleSvgEls.push(h('circle', {
              key: 'brelay' + defender + '-' + laneNo,
              cx: bsx(relayX), cy: bsy(relayY), r: 10,
              fill: relayOn ? battleLaneMeta[laneNo].color : '#64748b',
              stroke: relayOn ? '#ffffff' : '#334155', strokeWidth: 2,
              opacity: relayOn ? 1 : 0.45, filter: relayOn ? 'url(#arc-glow)' : null
            }));
          }
        });
        var battleBoardLabel = battleReplay ? 'Circuit Clash ' + battleArenaConfig.title + ' replay board. ' + battleReplay.announcement + ' ' + battleReplayComparisonData.summary + ' ' + describeBoard(battleLevel) : 'Circuit Clash ' + battleArenaConfig.title + ' tactical board. ' + (battleHandoff ? 'Turn handoff pending for ' + battlePlayerLabel(battle, battleSeat) + '. Controls and preview are hidden.' : battlePlayerLabel(battle, battleSeat) + ' is aiming at the ' + battleLaneMeta[battleLaneIndex].title + '. ' + describeBoard(battleLevel)) + (battle.trailRule === 'walls' ? ' Failed opposing trails are active light walls.' : ' Trails are visual history only.');
        if (battlePreviewVisible && battlePreviewResult.result === 'trail') battleBoardLabel += ' Guided preview predicts a collision with ' + battlePlayerLabel(battle, battlePreviewResult.trailSeat) + '\'s failed trail at x ' + round1(battlePreviewResult.at) + '.';
        var battleSvg = h('svg', {
          key: 'battle-svg', className: 'arc-battle-board', viewBox: '0 0 ' + BW + ' ' + BH, width: '100%', role: 'img',
          'aria-label': battleBoardLabel,
          style: { display: 'block', maxHeight: '48vh', border: '1px solid ' + GRID, borderRadius: 12, overflow: 'hidden' }
        }, battleSvgEls);

        function battleShieldCard(seat) {
          return h('div', { key: 'shield-card-' + seat, style: { flex: 1, minWidth: 210, padding: '10px 12px', border: '1px solid ' + (seat === battleSeat ? BEAM : GRID), borderRadius: 10, background: seat === battleSeat ? 'rgba(34,211,238,0.09)' : 'rgba(148,163,184,0.06)' } },
            h('div', { key: 'name', style: { color: INK, fontSize: 13, fontWeight: 800, marginBottom: 6 } }, battlePlayerLabel(battle, seat) + (seat === battleSeat && battle.status !== 'won' ? (battleHandoff ? ' — awaiting handoff' : ' — active turn') : '')),
            h('div', { key: 'relays', style: { display: 'flex', gap: 6, flexWrap: 'wrap' } }, battleLaneMeta.map(function (meta, laneNo) {
              var active = battle.shields[seat][laneNo];
              return h('span', { key: 'shield-' + seat + '-' + laneNo, style: { padding: '3px 7px', borderRadius: 999, border: '1px solid ' + (active ? meta.color : GRID), color: INK, fontSize: 11, opacity: active ? 1 : 0.55 } }, (active ? '● ' : '○ ') + meta.short + (active ? ' online' : ' offline'));
            })));
        }

        function battleParamControl(name) {
          var spec = battleLevel.params[name], value = battleParams[name];
          var display = spec.asPeriod ? periodOf(value) + ' units' : fmtVal(value, spec.step);
          if (spec.locked) return h('div', { key: 'bp-' + name, className: 'arc-battle-param', style: { marginBottom: 8, color: INK, fontSize: 12, opacity: 0.72 } }, spec.label + ': ' + display + ' (fixed)');
          if (spec.snapValues) return h('label', { key: 'bp-' + name, className: 'arc-battle-param arc-battle-param-snap', style: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(110px,180px)', gap: 10, alignItems: 'center', marginBottom: 9, color: INK, fontSize: 12 } },
            h('span', { key: 'label' }, spec.label),
            h('select', { key: 'select', value: String(value), disabled: battleLocked, onChange: function (e) { setBattleParam(name, e.target.value); }, style: { width: '100%', padding: '7px 8px', borderRadius: 8, border: '1px solid ' + GRID, background: 'var(--allo-stem-surface, #ffffff)', color: INK } }, spec.snapValues.map(function (snap) {
              return h('option', { key: 'snap-' + snap, value: String(snap) }, periodOf(snap) + ' units');
            })));
          return h('div', { key: 'bp-' + name, className: 'arc-battle-param', style: { marginBottom: 9 } },
            h('label', { key: 'label', htmlFor: 'arc-battle-' + name, style: { display: 'flex', justifyContent: 'space-between', gap: 8, color: INK, fontSize: 12, marginBottom: 4 } }, h('span', { key: 'txt' }, spec.label), h('span', { key: 'val', style: { fontWeight: 800 } }, display)),
            h('div', { key: 'inputs', className: 'arc-battle-param-inputs', style: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 86px', gap: 8, alignItems: 'center' } },
              h('input', { key: 'range', id: 'arc-battle-' + name, type: 'range', min: spec.min, max: spec.max, step: spec.step, value: value, disabled: battleLocked, onChange: function (e) { setBattleParam(name, e.target.value); }, style: { width: '100%', accentColor: BEAM } }),
              h('input', { key: 'number', type: 'number', min: spec.min, max: spec.max, step: spec.step, value: value, disabled: battleLocked, 'aria-label': spec.label + ' exact value', onChange: function (e) { setBattleParam(name, e.target.value); }, style: { width: '100%', boxSizing: 'border-box', padding: '6px 7px', borderRadius: 8, border: '1px solid ' + GRID, background: 'var(--allo-stem-surface, #ffffff)', color: INK } })));
        }

        var battleReview = battle.status === 'won' ? battleRecap(battle) : null;
        var battleReplayPanel = battleReplay ? h('section', { key: 'battle-replay', className: 'arc-battle-replay', 'aria-labelledby': 'arc-battle-replay-title', style: { margin: '10px 0', padding: '9px 10px', border: '1px solid ' + GRID, borderRadius: 9, background: 'rgba(255,255,255,0.05)' } },
          h('h3', { key: 'title', id: 'arc-battle-replay-title', style: { margin: '0 0 6px', fontSize: 13 } }, 'Shot replay'),
          h('div', { key: 'battle-replay-frame', id: 'arc-battle-replay-frame', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', style: { fontSize: 12, lineHeight: 1.45 } },
            h('div', { key: 'position', style: { fontWeight: 800 } }, 'Shot ' + battleReplay.number + ' of ' + battleReplay.total + ' â€” ' + battleReplay.player + ' â€” ' + battleReplay.laneTitle),
            h('div', { key: 'equation' }, battleReplay.equation),
            h('div', { key: 'outcome', style: { opacity: 0.82 } }, 'Result: ' + battleReplay.outcome),
            h('div', { key: 'battle-replay-comparison', role: 'note', style: { marginTop: 8, padding: '7px 8px', borderLeft: '3px dashed #94a3b8', background: 'rgba(148,163,184,0.08)' } },
              h('div', { key: 'title', style: { fontWeight: 800 } }, battleReplayComparisonData.comparable ? 'Compared with shot ' + battleReplayComparisonData.previousNumber : 'Revision comparison'),
              battleReplayComparisonData.comparable
                ? (battleReplayComparisonData.changes.length
                  ? h('ul', { key: 'changes', style: { margin: '4px 0', paddingLeft: 20 } }, battleReplayComparisonData.changes.map(function (change) { return h('li', { key: 'change-' + change.name }, change.text); }))
                  : h('p', { key: 'unchanged', style: { margin: '4px 0' } }, 'Equation parameters were unchanged.'))
                : h('p', { key: 'first', style: { margin: '4px 0' } }, battleReplayComparisonData.summary),
              battleReplayComparisonData.comparable ? h('p', { key: 'comparison-outcome', style: { margin: '4px 0 0', opacity: 0.82 } }, battleReplayComparisonData.outcomeText) : null)),
          h('div', { key: 'controls', role: 'group', 'aria-label': 'Shot replay navigation', style: { display: 'flex', gap: 8, marginTop: 8 } },
            h('button', { key: 'battle-replay-prev', type: 'button', disabled: battleReplay.index === 0, 'aria-controls': 'arc-battle-replay-frame', onClick: function () { setBattleReplay(battleReplay.index - 1); }, style: { padding: '6px 9px', borderRadius: 8, border: '1px solid ' + GRID, background: 'transparent', color: INK, opacity: battleReplay.index === 0 ? 0.5 : 1 } }, 'Previous shot'),
            h('button', { key: 'battle-replay-next', type: 'button', disabled: battleReplay.index === battleReplay.total - 1, 'aria-controls': 'arc-battle-replay-frame', onClick: function () { setBattleReplay(battleReplay.index + 1); }, style: { padding: '6px 9px', borderRadius: 8, border: '1px solid ' + GRID, background: 'transparent', color: INK, opacity: battleReplay.index === battleReplay.total - 1 ? 0.5 : 1 } }, 'Next shot'))
        ) : null;

        var battleRecapPanel = battleReview ? h('section', { key: 'battle-recap', 'aria-labelledby': 'arc-battle-recap-title', style: { marginTop: 14, padding: '12px 14px', border: '1px solid ' + NODE_ON, borderRadius: 10, background: 'rgba(52,211,153,0.08)', color: INK } },
          h('h2', { key: 'title', id: 'arc-battle-recap-title', style: { margin: '0 0 6px', fontSize: 16 } }, 'Post-match analysis'),
          h('p', { key: 'summary', style: { margin: '0 0 8px', fontSize: 12, lineHeight: 1.45 } }, battleReview.winnerLabel + ' won ' + battleReview.arenaTitle + ' after ' + battleReview.totalShots + ' total shots.'),
          h('div', { key: 'players', style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 } }, battleReview.players.map(function (player) {
            return h('span', { key: 'recap-player-' + player.seat, style: { padding: '4px 7px', border: '1px solid ' + GRID, borderRadius: 999, fontSize: 11 } }, player.label + ': ' + player.captures + '/' + player.shots + ' captures (' + player.accuracy + '%)');
          })),
          battleReview.hardestLaneTitle ? h('p', { key: 'hardest', style: { margin: '0 0 8px', fontSize: 12 } }, 'Most difficult circuit: ' + battleReview.hardestLaneTitle + '.') : h('p', { key: 'hardest', style: { margin: '0 0 8px', fontSize: 12 } }, 'No missed trajectories were recorded.'),
          battleReplayPanel,
          h('h3', { key: 'recent-title', style: { margin: '8px 0 5px', fontSize: 13 } }, 'Recent function shots'),
          battleReview.recent.length ? h('ol', { key: 'battle-recap-shots', style: { margin: 0, paddingLeft: 22, fontSize: 11, lineHeight: 1.45 } }, battleReview.recent.map(function (shot, shotIndex) {
            return h('li', { key: 'recap-shot-' + shotIndex, style: { marginBottom: 6 } },
              h('div', { key: 'who', style: { fontWeight: 800 } }, shot.player + ' — ' + shot.laneTitle),
              h('div', { key: 'equation' }, shot.equation),
              h('div', { key: 'outcome', style: { opacity: 0.82 } }, 'Result: ' + shot.outcome));
          })) : h('p', { key: 'no-shots', style: { fontSize: 12 } }, 'No shot history is available.'),
          h('div', { key: 'recap-next', role: 'note', style: { marginTop: 8, padding: '7px 9px', borderRadius: 8, background: 'rgba(34,211,238,0.09)', fontSize: 12 } }, 'Next step: ' + battleReview.recommendation)
        ) : null;


        var battleSetupSummary = (battle.mode === 'cpu' ? 'Solo vs CPU' : 'Two-player hot-seat') + ' / ' + battleArenaConfig.title + ' / ' + (battle.assist === 'challenge' ? 'Predict then fire' : 'Guided preview') + ' / ' + (battle.mode === 'cpu' ? (battle.cpuLevel === 'practice' ? 'Practice probe' : 'Standard solver') : (battle.trailRule === 'walls' ? 'Trail walls' : 'Visual trails')) + (S.battle3d ? ' / 3D on' : ' / tactical view');
        var battlePanel = h('div', { key: 'battle-panel', className: 'arc-battle-panel' },
          h('div', { key: 'battle-intro', style: { padding: '10px 12px', borderRadius: 10, border: '1px solid ' + BEAM, background: 'rgba(34,211,238,0.08)', color: INK, marginBottom: 12 } },
            h('div', { key: 'title', style: { fontSize: 17, fontWeight: 900 } }, 'Circuit Clash'),
            h('div', { key: 'copy', style: { fontSize: 12, lineHeight: 1.45, opacity: 0.82, marginTop: 3 } }, 'Turn-based neon function battle. Capture all three opposing relays. Every shot leaves a light trail; there is no timer.')),
          h('details', { key: 'battle-help', style: { marginBottom: 10, padding: '7px 10px', border: '1px solid ' + GRID, borderRadius: 8, color: INK, fontSize: 12 } },
            h('summary', { key: 'summary', style: { cursor: 'pointer', fontWeight: 800 } }, 'How to play Circuit Clash'),
            h('ul', { key: 'steps', style: { margin: '7px 0 2px', paddingLeft: 20, lineHeight: 1.45 } },
              h('li', { key: 'goal' }, 'Capture all three opposing relays by authoring a function that clears its circuit.'),
              h('li', { key: 'turns' }, 'Choose a relay, adjust the equation, and fire. Every valid shot ends the turn.'),
              h('li', { key: 'aim' }, 'Guided Preview shows the trajectory; Predict Then Fire keeps it hidden until the shot.'),
              h('li', { key: 'handoff' }, 'In hot-seat play, pass the device when prompted. The next player confirms before controls reappear.'),
              h('li', { key: 'trail-walls' }, 'Optional Trail Walls make failed opposing trails block later beams in that circuit. Change the curve to route around them.'),
              h('li', { key: 'phase-pulse' }, 'Each Trail Walls player gets one Phase Pulse. It passes through light trails, but walls, gates, and the target still use the authored function.'))),

          h('details', { key: 'battle-options', className: 'arc-battle-options', style: { marginBottom: 10, padding: '5px 10px 9px', border: '1px solid ' + GRID, borderRadius: 9, color: INK } },
            h('summary', { key: 'battle-options-summary', 'aria-label': 'Match options. Current setup: ' + battleSetupSummary }, 'Match options'),
            h('div', { key: 'current-setup', className: 'arc-battle-secondary', style: { margin: '0 0 9px', opacity: 0.78 } }, 'Current setup: ' + battleSetupSummary),
          h('div', { key: 'battle-mode', className: 'arc-battle-option-group', role: 'group', 'aria-label': 'Battle opponent', style: { display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 10 } },
            h('button', { key: 'cpu', type: 'button', 'aria-pressed': battle.mode === 'cpu', onClick: function () { setBattleMode('cpu'); }, style: { padding: '6px 10px', borderRadius: 8, border: '1px solid ' + (battle.mode === 'cpu' ? BEAM : GRID), background: battle.mode === 'cpu' ? 'rgba(34,211,238,0.14)' : 'transparent', color: INK, fontWeight: 700 } }, 'Solo vs CPU'),
            h('button', { key: 'hotseat', type: 'button', 'aria-pressed': battle.mode === 'hotseat', onClick: function () { setBattleMode('hotseat'); }, style: { padding: '6px 10px', borderRadius: 8, border: '1px solid ' + (battle.mode === 'hotseat' ? BEAM : GRID), background: battle.mode === 'hotseat' ? 'rgba(34,211,238,0.14)' : 'transparent', color: INK, fontWeight: 700 } }, 'Two-player hot-seat'),
            h('button', { key: 'toggle-3d', type: 'button', 'aria-pressed': !!S.battle3d, onClick: toggleBattle3D, style: { marginLeft: 'auto', padding: '6px 10px', borderRadius: 8, border: '1px solid ' + GRID, background: S.battle3d ? 'rgba(244,114,182,0.13)' : 'transparent', color: INK, fontWeight: 700 } }, S.battle3d ? 'Hide 3D arena' : 'Show 3D arena')),
          h('div', { key: 'battle-arena', className: 'arc-battle-option-group', role: 'group', 'aria-label': 'Battle arena', style: { display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 5 } },
            h('span', { key: 'label', style: { color: INK, fontSize: 12, fontWeight: 800 } }, 'Arena:'),
            Object.keys(BATTLE_ARENAS).map(function (arenaId) {
              var arenaOption = BATTLE_ARENAS[arenaId], active = battle.arena === arenaId;
              return h('button', { key: 'battle-arena-' + arenaId, type: 'button', 'aria-pressed': active, onClick: function () { setBattleArena(arenaId); }, style: { padding: '5px 9px', borderRadius: 8, border: '1px solid ' + (active ? '#a78bfa' : GRID), background: active ? 'rgba(167,139,250,0.14)' : 'transparent', color: INK } }, arenaOption.title);
            })),
          h('div', { key: 'battle-arena-blurb', style: { color: INK, fontSize: 11, opacity: 0.72, marginBottom: 8 } }, battleArenaConfig.blurb),
          h('div', { key: 'battle-assist', className: 'arc-battle-option-group', role: 'group', 'aria-label': 'Trajectory preview rule', style: { display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 8 } },
            h('span', { key: 'label', style: { color: INK, fontSize: 12, fontWeight: 800 } }, 'Aim rule:'),
            h('button', { key: 'battle-assist-guided', type: 'button', 'aria-pressed': battle.assist === 'guided', onClick: function () { setBattleAssist('guided'); }, style: { padding: '5px 9px', borderRadius: 8, border: '1px solid ' + (battle.assist === 'guided' ? BEAM : GRID), background: battle.assist === 'guided' ? 'rgba(34,211,238,0.14)' : 'transparent', color: INK } }, 'Guided preview'),
            h('button', { key: 'battle-assist-challenge', type: 'button', 'aria-pressed': battle.assist === 'challenge', onClick: function () { setBattleAssist('challenge'); }, style: { padding: '5px 9px', borderRadius: 8, border: '1px solid ' + (battle.assist === 'challenge' ? '#facc15' : GRID), background: battle.assist === 'challenge' ? 'rgba(250,204,21,0.12)' : 'transparent', color: INK } }, 'Predict then fire')),
          battle.mode === 'hotseat' ? h('div', { key: 'battle-trail-rule', className: 'arc-battle-option-group', role: 'group', 'aria-label': 'Persistent trail collision rule', style: { display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 8 } },
            h('span', { key: 'label', style: { color: INK, fontSize: 12, fontWeight: 800 } }, 'Trail rule:'),
            h('button', { key: 'battle-trails-visual', type: 'button', 'aria-pressed': battle.trailRule === 'visual', onClick: function () { setBattleTrailRule('visual'); }, style: { padding: '5px 9px', borderRadius: 8, border: '1px solid ' + (battle.trailRule === 'visual' ? BEAM : GRID), background: battle.trailRule === 'visual' ? 'rgba(34,211,238,0.14)' : 'transparent', color: INK } }, 'Visual only'),
            h('button', { key: 'battle-trails-walls', type: 'button', 'aria-pressed': battle.trailRule === 'walls', onClick: function () { setBattleTrailRule('walls'); }, style: { padding: '5px 9px', borderRadius: 8, border: '1px solid ' + (battle.trailRule === 'walls' ? '#ef4444' : GRID), background: battle.trailRule === 'walls' ? 'rgba(239,68,68,0.12)' : 'transparent', color: INK } }, 'Trail walls'),
            h('span', { key: 'note', style: { color: INK, fontSize: 11, opacity: 0.72 } }, battle.trailRule === 'walls' ? 'Failed opposing trails block later shots.' : 'Trails show history without blocking.')) : null,
          battle.mode === 'cpu' ? h('div', { key: 'battle-cpu-level', className: 'arc-battle-option-group', role: 'group', 'aria-label': 'CPU strategy', style: { display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 10 } },
            h('span', { key: 'label', style: { color: INK, fontSize: 12, fontWeight: 800 } }, 'CPU strategy:'),
            h('button', { key: 'cpu-level-practice', type: 'button', 'aria-pressed': battle.cpuLevel === 'practice', onClick: function () { setBattleCpuLevel('practice'); }, style: { padding: '5px 9px', borderRadius: 8, border: '1px solid ' + (battle.cpuLevel === 'practice' ? '#f472b6' : GRID), background: battle.cpuLevel === 'practice' ? 'rgba(244,114,182,0.13)' : 'transparent', color: INK } }, 'Practice probe'),
            h('button', { key: 'cpu-level-standard', type: 'button', 'aria-pressed': battle.cpuLevel === 'standard', onClick: function () { setBattleCpuLevel('standard'); }, style: { padding: '5px 9px', borderRadius: 8, border: '1px solid ' + (battle.cpuLevel === 'standard' ? '#f472b6' : GRID), background: battle.cpuLevel === 'standard' ? 'rgba(244,114,182,0.13)' : 'transparent', color: INK } }, 'Standard solver')) : null),
          h('div', { key: 'score', className: 'arc-battle-score', style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 7 } }, battleShieldCard(0), battleShieldCard(1)),
          h('div', { key: 'battle-stats', className: 'arc-battle-secondary', 'aria-label': 'Match statistics', style: { display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 10, color: INK, fontSize: 11, opacity: 0.82 } }, [0, 1].map(function (seat) {
            var stat = battle.stats[seat], accuracy = stat.shots ? Math.round(stat.captures / stat.shots * 100) : 0;
            return h('span', { key: 'battle-stat-' + seat }, battlePlayerLabel(battle, seat) + ': ' + stat.captures + ' captures / ' + stat.shots + ' shots (' + accuracy + '%)');
          })),
          S.battle3d ? h(ArcCityBattle3D, { key: 'battle3d-' + battle.arena, React: React, battle: battle }) : null,
          battleSvg,
          h('div', { key: 'turn', role: 'status', style: { margin: '10px 0', padding: '8px 10px', borderRadius: 8, background: battle.status === 'won' ? 'rgba(52,211,153,0.14)' : (battleHandoff ? 'rgba(250,204,21,0.11)' : 'rgba(148,163,184,0.09)'), color: INK, fontWeight: 800, fontSize: 13 } }, battle.status === 'won' ? battlePlayerLabel(battle, battle.winner) + ' won in round ' + battle.round + '.' : (battleHandoff ? 'Pass the device to ' + battlePlayerLabel(battle, battleSeat) + '. Controls remain hidden until they confirm.' : 'Round ' + battle.round + ' — ' + battlePlayerLabel(battle, battleSeat) + ' turn')),
          h('div', { key: 'lane-group', className: 'arc-battle-lanes', role: 'group', 'aria-label': 'Target circuit', style: { display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 12 } }, battleLaneMeta.map(function (meta, laneNo) {
            var selected = laneNo === battleLaneIndex, available = battle.shields[battleDefender][laneNo];
            return h('button', { key: 'lane-' + laneNo, type: 'button', disabled: battleLocked || !available, 'aria-pressed': selected, onClick: function () { setBattleLane(laneNo); }, style: { padding: '7px 10px', borderRadius: 8, border: '1px solid ' + (selected ? meta.color : GRID), background: selected ? 'rgba(34,211,238,0.11)' : 'transparent', color: INK, opacity: available ? 1 : 0.48, fontWeight: selected ? 800 : 600, cursor: battleLocked || !available ? 'not-allowed' : 'pointer' } }, meta.short + (available ? ' relay' : ' captured'));
          })),
          !battleHandoff && battle.trailRule === 'walls' && battle.status !== 'won' ? h('div', { key: 'battle-weapon', className: 'arc-battle-loadout', role: 'group', 'aria-label': 'Shot loadout', style: { display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 10 } },
            h('span', { key: 'label', style: { color: INK, fontSize: 12, fontWeight: 800 } }, 'Loadout:'),
            h('button', { key: 'battle-weapon-standard', type: 'button', 'aria-pressed': battleWeapon === 'standard', onClick: function () { setBattleWeapon('standard'); }, style: { padding: '6px 9px', borderRadius: 8, border: '1px solid ' + (battleWeapon === 'standard' ? BEAM : GRID), background: battleWeapon === 'standard' ? 'rgba(34,211,238,0.14)' : 'transparent', color: INK } }, 'Standard trail'),
            h('button', { key: 'battle-weapon-phase', type: 'button', disabled: battle.phaseCharges[battleSeat] < 1, 'aria-pressed': battleWeapon === 'phase', onClick: function () { setBattleWeapon('phase'); }, style: { padding: '6px 9px', borderRadius: 8, border: '1px solid ' + (battleWeapon === 'phase' ? '#ffffff' : GRID), background: battleWeapon === 'phase' ? 'rgba(255,255,255,0.14)' : 'transparent', color: INK, opacity: battle.phaseCharges[battleSeat] > 0 ? 1 : 0.5 } }, 'Phase pulse (' + battle.phaseCharges[battleSeat] + ')'),
            h('span', { key: 'note', style: { color: INK, fontSize: 11, opacity: 0.72 } }, battleWeapon === 'phase' ? 'Ignores light trails; circuit geometry still applies.' : 'Persistent trails can collide.')) : null,
          battleHandoff ? h('div', { key: 'battle-handoff-card', role: 'status', style: { padding: '12px 14px', borderRadius: 10, border: '1px solid ' + PAL.warn, background: 'rgba(250,204,21,0.08)', color: INK, fontSize: 13, fontWeight: 800, textAlign: 'center' } }, 'Pass the device. Equation controls and trajectory are hidden for ' + battlePlayerLabel(battle, battleSeat) + '.') : h('div', { key: 'battle-equation', 'aria-label': describeEquation(battleLevel, battleParams), style: { color: INK, fontSize: 13, fontWeight: 700, marginBottom: 10 } }, battleLaneMeta[battleLaneIndex].title + ' — ' + describeEquation(battleLevel, battleParams)),
          battleHandoff ? null : h('div', { key: 'battle-params', className: 'arc-battle-params' }, battleLevel.paramOrder.map(battleParamControl)),
          h('div', { key: 'battle-actions', className: 'arc-battle-actions', style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 } },
            battleHandoff
              ? h('button', { key: 'battle-begin-turn', type: 'button', autoFocus: true, onClick: beginBattleTurn, style: { flex: 1, padding: '11px 14px', border: 'none', borderRadius: 10, background: '#facc15', color: '#111827', fontWeight: 900 } }, 'Start ' + battlePlayerLabel(battle, battleSeat) + ' turn')
              : (battle.mode === 'cpu' && battleSeat === 1 && battle.status !== 'won'
                ? h('button', { key: 'cpu-turn', type: 'button', onClick: runBattleCpu, style: { flex: 1, padding: '10px 14px', border: 'none', borderRadius: 10, background: '#f472b6', color: '#111827', fontWeight: 900 } }, 'Run CPU turn')
                : h('button', { key: 'battle-fire', type: 'button', disabled: battle.status === 'won', onClick: fireBattle, style: { flex: 1, padding: '10px 14px', border: 'none', borderRadius: 10, background: battleWeapon === 'phase' ? '#ffffff' : BEAM, color: battleWeapon === 'phase' ? '#111827' : PAL.btnText, fontWeight: 900, opacity: battle.status === 'won' ? 0.55 : 1 } }, battleWeapon === 'phase' ? 'Fire phase pulse' : 'Fire function trail')),
            h('button', { key: 'battle-reset', type: 'button', onClick: resetBattle, style: resetBtnStyle }, battle.status === 'won' ? 'Rematch' : 'Reset match')),
          h('div', { key: 'preview-readout', className: 'arc-battle-secondary', style: { marginTop: 9, color: battlePreviewVisible && battlePreviewResult.result === 'hit' ? NODE_ON : PAL.warn, fontSize: 12 } }, battle.status === 'won' ? 'Match complete. Choose Rematch to keep these rules.' : (battleHandoff ? 'Hot-seat handoff pending. No equation or trajectory is visible.' : (battle.mode === 'cpu' && battleSeat === 1 ? 'CPU controls and trajectory are hidden. Run the CPU turn when ready.' : (battlePreviewVisible ? 'Prediction: ' + describeResult(battleLevel, battlePreviewResult, 1) : 'Challenge aim: trajectory and result stay hidden until Fire.')))),
          battleRecapPanel,
          h('h3', { key: 'log-title', style: { color: INK, fontSize: 14, margin: '14px 0 5px' } }, 'Battle log'),
          h('ol', { key: 'battle-log', 'aria-label': 'Circuit Clash battle log, newest first', style: { margin: 0, paddingLeft: 22, color: INK, fontSize: 12, lineHeight: 1.5 } }, battle.log.map(function (entry, logIndex) { return h('li', { key: 'blog-' + battle.shots + '-' + logIndex }, entry); })));

        var body = view === 'teacher'
          ? teacherPanel
          : (view === 'battle'
            ? battlePanel
            : ((gauntlet && gauntlet.empty)
              ? h('div', { key: 'game' }, levelBar, gauntletBanner) // no board until families are solved
              : h('div', { key: 'game' }, levelBar, gauntletBanner, (gauntlet ? gauntletTierLock : tierBar), svg, controls, gauntletNav, badgeStrip)));

        return h('div', { id: 'allo-arccity-root', className: 'arc-city-root', style: { padding: 16, maxWidth: 760, margin: '0 auto', color: INK } },
          header, viewToggle, body);

      } catch (e) {
        return h('div', { style: { padding: 16, color: '#fca5a5', fontSize: 14 } },
          'Arc City could not render: ' + (e && e.message ? e.message : String(e)));
      }
    }
  });

})();
