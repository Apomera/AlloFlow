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
      // Windows narrowed so AMPLITUDE genuinely matters (a must be ~2.5, not any
      // big value). Gates sit at sin(x)'s extrema (π/2, 3π/2, 5π/2) so the
      // intended period is 2π (b=1); c and k are locked as the interim
      // tractability measure (design §3.1 snapped-periods + crest-grabber are
      // DEFERRED to Phase 2b). The node is the end landing zone; the gates are
      // the real constraint.
      walls: [], gates: [{ x: 1.5, lo: 6, hi: 6.9 }, { x: 4.7, lo: 1.1, hi: 2 }, { x: 7.85, lo: 6, hi: 6.9 }], node: { x: 9.4, y: 4, r: 0.7 }, dx: 0.05,
      paramOrder: ['a', 'b', 'c', 'k'],
      params: {
        a: { min: 0, max: 4, step: 0.25, default: 1, label: 'a  (amplitude — how tall the wave)' },
        b: { min: 0.5, max: 1.5, step: 0.05, default: 0.5, label: 'b  (squeezes/stretches the wave — line peaks up with the windows)' },
        c: { min: 0, max: 0, step: 1, default: 0, locked: true, label: 'c  (phase — locked at 0)' },
        k: { min: 4, max: 4, step: 1, default: 4, locked: true, label: 'k  (midline — locked at 4)' }
      },
      hint: 'Tip: the wave is centered on the midline y = 4. Set b so its peaks and dips line up with the windows, and a so it reaches high/low enough to thread each one.'
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
      return 'Arc higher over the wall: raise the vertex height k, or move the vertex h toward x = ' + res.at + '.';
    }
    if (res.result === 'gate') {
      var tooHigh = res.yAt > res.obstacle.hi;
      if (fam === 'line') return tooHigh ? 'The beam is too high there — lower the start height b or reduce the slope.' : 'The beam is too low there — raise the start height b or increase the slope.';
      if (fam === 'absval') return tooHigh ? 'The beam is too high there — lower the vertex k, or move the vertex h so the V dips into the window.' : 'The beam is too low there — raise the vertex k, or steepen a so the arm climbs through the window.';
      if (fam === 'sine') return tooHigh ? 'The wave is too high at this window — reduce the amplitude a, or change the frequency b so a dip lands here.' : 'The wave is too low at this window — increase the amplitude a, or change the frequency b so a crest lands here.';
      if (fam === 'exp') return tooHigh ? 'The curve is too high here — lower the start height a, decay faster (more negative b), or lower the floor k.' : 'The curve is too low here — raise the start height a, decay slower (less negative b), or raise the floor k.';
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
        (p.b ? ', one full wave about every ' + round1((2 * Math.PI) / p.b) + ' units.' : '.');
    }
    if (level.family === 'exp') {
      var ek = fmtVal(p.k, level.params.k.step);
      var etail = (p.b < 0)
        ? (p.a < 0 ? 'rising toward the ceiling y = ' + ek + ', which it approaches but never crosses' : 'decaying toward the floor y = ' + ek + ', which it approaches but never crosses')
        : 'growing away from the baseline y = ' + ek + ' (its starting level, not a limit it reaches)';
      return 'y = a·e^(b·x) + k, with a = ' + fmtVal(p.a, level.params.a.step) + ', b = ' + fmtVal(p.b, level.params.b.step) + ', k = ' + ek +
        '. An exponential ' + etail + '.';
    }
    var dir = p.a < 0 ? 'opening downward' : (p.a > 0 ? 'opening upward' : 'a flat line');
    return 'y = a(x − h)² + k, with a = ' + fmtVal(p.a, level.params.a.step) + ', h = ' + fmtVal(p.h, level.params.h.step) + ', k = ' + fmtVal(p.k, level.params.k.step) +
      '. A parabola ' + dir + ', vertex at (' + fmtVal(p.h, level.params.h.step) + ', ' + fmtVal(p.k, level.params.k.step) + ').';
  }

  function describeBoard(level) {
    var s = 'Arc City, level: ' + level.title + '. ';
    s += level.family === 'line' ? 'Author a straight-line beam. ' : (level.family === 'absval' ? 'Author a V-shaped, absolute-value beam. ' : (level.family === 'sine' ? 'Author a sine-wave beam. ' : (level.family === 'exp' ? 'Author an exponential beam that curves toward a floor it never touches. ' : 'Author a parabola beam. ')));
    s += 'The dark node to light is at x ' + level.node.x + ', y ' + level.node.y + '. ';
    (level.walls || []).forEach(function (w) { s += 'A wall ' + w.height + ' units tall stands at x ' + w.x + '. '; });
    (level.gates || []).forEach(function (g) { s += 'A gate with an opening from y ' + g.lo + ' to ' + g.hi + ' is at x ' + g.x + (g.slope ? ', which the beam must pass while ' + (g.slope.value < 0 ? 'descending' : (g.slope.value > 0 ? 'climbing' : 'level')) + ' at a slope near ' + g.slope.value + ' (give or take ' + g.slope.tol + ')' : '') + '. '; });
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
    { id: 'switchback', label: 'Switchback — re-lit a node using an absolute-value V' },
    { id: 'wave-rider', label: 'Wave Rider — re-lit a node using a sine wave' },
    { id: 'decay-rider', label: 'Decay Rider — re-lit a node riding an exponential to its asymptote' },
    { id: 'tilt-threader', label: 'Tilt Threader — passed a tilted slope-gate at the right angle' },
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
    if (level.family === 'absval') add('switchback');
    if (level.family === 'sine') add('wave-rider');
    if (level.family === 'exp') add('decay-rider');
    if ((level.gates || []).some(function (g) { return g.slope; })) add('tilt-threader');
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
  function teacherSummary(byLevel, badges) {
    byLevel = byLevel || {}; badges = badges || [];
    var levels = LEVELS.map(function (l) {
      var st = byLevel[l.id] || {};
      var status = st.solved ? 'completed' : (((st.shots || 0) > 0 || (st.misses || 0) > 0) ? 'explored' : 'not started');
      return { id: l.id, title: l.title, family: l.family, status: status, independent: !!st.independent, shots: st.shots || 0, exploredAdjustments: st.misses || 0 };
    });
    var families = {};
    LEVELS.map(function (l) { return l.family; }).filter(function (f, i, a) { return a.indexOf(f) === i; }).forEach(function (f) { families[f] = familyStatus(byLevel, f); });
    var nodesReLit = levels.filter(function (l) { return l.status === 'completed'; }).length;
    return { caveat: TEACHER_CAVEAT, families: families, levels: levels, nodesReLit: nodesReLit, totalLevels: LEVELS.length, badges: badges.map(badgeLabel) };
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
    fmtVal: fmtVal,
    THEME_CANVAS: THEME_CANVAS,
    arcPalette: arcPalette,
    TEACHER_CAVEAT: TEACHER_CAVEAT,
    familyStatus: familyStatus,
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
      '@keyframes arccityPulse{0%,100%{opacity:1;}50%{opacity:.45;}}' +
      '#allo-arccity-root .arccity-node-unlit{animation:arccityPulse 1.8s ease-in-out infinite;}';
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
          if (!muted) { try { sfxFire(); if (r.result === 'hit') sfxHit(); else sfxBlock(); } catch (e) { } }
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
          var svgEl = evt.currentTarget && evt.currentTarget.ownerSVGElement;
          if (!svgEl) return;
          function move(ev) { var w = svgWorldFromEvent(svgEl, ev); if (w) setParamsMulti(computeParams(w.x, w.y)); }
          function up() { try { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); } catch (e) { } }
          try { window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); } catch (e) { }
        }

        var INK = 'var(--allo-stem-text, #e2e8f0)';
        var GRID = 'var(--allo-stem-border, #334155)';
        var PAL = arcPalette(arcTheme());
        var BEAM = PAL.accent, NODE_OFF = PAL.nodeOff, NODE_ON = PAL.nodeOn, GATE = PAL.gate, WALL = PAL.wall;

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
          if (g.slope) { // tangent tick showing the required entry slope (the "tilt")
            var smy = (g.lo + g.hi) / 2, sdx = 0.9;
            obstacleEls.push(h('line', { key: 'gslope' + i, x1: sx(g.x - sdx), y1: sy(smy - g.slope.value * sdx), x2: sx(g.x + sdx), y2: sy(smy + g.slope.value * sdx), stroke: PAL.warn, strokeWidth: 2.5, strokeDasharray: '5 3', strokeLinecap: 'round' }));
          }
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
              h('span', { key: 'v', style: { fontWeight: 700 } }, fmtVal(val, spec.step)));
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
              h('span', { key: 'v', style: { fontVariantNumeric: 'tabular-nums', fontWeight: 700 } }, fmtVal(val, spec.step))),
            h('div', { key: 'ctl', style: { display: 'flex', alignItems: 'center', gap: 8 } },
              h('button', { key: 'dec', type: 'button', 'aria-label': 'Decrease ' + spec.label, onClick: function () { setParam(name, val - spec.step); }, style: btn }, '−'),
              h('div', {
                key: 'sld', role: 'slider', tabIndex: 0, 'aria-label': spec.label,
                'aria-valuemin': spec.min, 'aria-valuemax': spec.max, 'aria-valuenow': val, 'aria-valuetext': spec.label + ' ' + fmtVal(val, spec.step),
                onKeyDown: onKey,
                style: { position: 'relative', flex: 1, height: 10, borderRadius: 6, background: 'rgba(148,163,184,0.25)' }
              },
                h('div', { key: 'fill', style: { position: 'absolute', left: 0, top: 0, height: 10, width: (pct * 100) + '%', background: BEAM, borderRadius: 6, opacity: 0.5 } }),
                h('div', { key: 'thumb', style: { position: 'absolute', top: -3, left: 'calc(' + (pct * 100) + '% - 8px)', width: 16, height: 16, borderRadius: '50%', background: BEAM, boxShadow: '0 0 6px ' + BEAM } })),
              h('button', { key: 'inc', type: 'button', 'aria-label': 'Increase ' + spec.label, onClick: function () { setParam(name, val + spec.step); }, style: btn }, '+')));
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

        var controls = h('div', { key: 'controls', style: { marginTop: 14 } },
          h('div', { key: 'eq', 'aria-label': describeEquation(level, P), style: { fontSize: 15, color: INK, marginBottom: 6, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', fontVariantNumeric: 'tabular-nums' } },
            level.family === 'line'
              ? ['y = ', h('span', { key: 'm', style: { color: BEAM, fontWeight: 800 } }, fmtVal(P.m, level.params.m.step)), ' · x + ', h('span', { key: 'b', style: { color: BEAM, fontWeight: 800 } }, fmtVal(P.b, level.params.b.step))]
              : (level.family === 'absval'
                ? ['y = ', h('span', { key: 'a', style: { color: BEAM, fontWeight: 800 } }, fmtVal(P.a, level.params.a.step)), ' · |x − ', h('span', { key: 'h', style: { color: BEAM, fontWeight: 800 } }, fmtVal(P.h, level.params.h.step)), '| + ', h('span', { key: 'k', style: { color: BEAM, fontWeight: 800 } }, fmtVal(P.k, level.params.k.step))]
                : (level.family === 'sine'
                  ? ['y = ', h('span', { key: 'a', style: { color: BEAM, fontWeight: 800 } }, fmtVal(P.a, level.params.a.step)), ' · sin(', h('span', { key: 'b', style: { color: BEAM, fontWeight: 800 } }, fmtVal(P.b, level.params.b.step)), '·x + ', h('span', { key: 'c', style: { color: BEAM, fontWeight: 800 } }, fmtVal(P.c, level.params.c.step)), ') + ', h('span', { key: 'k', style: { color: BEAM, fontWeight: 800 } }, fmtVal(P.k, level.params.k.step))]
                  : (level.family === 'exp'
                    ? ['y = ', h('span', { key: 'a', style: { color: BEAM, fontWeight: 800 } }, fmtVal(P.a, level.params.a.step)), ' · e^(', h('span', { key: 'b', style: { color: BEAM, fontWeight: 800 } }, fmtVal(P.b, level.params.b.step)), '·x) + ', h('span', { key: 'k', style: { color: BEAM, fontWeight: 800 } }, fmtVal(P.k, level.params.k.step))]
                    : ['y = ', h('span', { key: 'a', style: { color: BEAM, fontWeight: 800 } }, fmtVal(P.a, level.params.a.step)), ' (x − ', h('span', { key: 'h', style: { color: BEAM, fontWeight: 800 } }, fmtVal(P.h, level.params.h.step)), ')² + ', h('span', { key: 'k', style: { color: BEAM, fontWeight: 800 } }, fmtVal(P.k, level.params.k.step))])))),
          tier === 'practice' ? h('div', { key: 'draghint', style: { fontSize: 11, color: INK, opacity: 0.6, marginBottom: 10 } }, handleEls.length ? t('arccity.drag_hint', 'Tip: drag the glowing handle on the grid — the highlighted numbers update. Or use the sliders.') : t('arccity.slider_hint', 'Tip: use the sliders (or the +/− buttons and arrow keys) to shape the beam.')) : null,
          h('div', { key: 'rows' }, paramRows),
          h('div', { key: 'btns', style: { display: 'flex', gap: 10, marginTop: 6 } },
            h('button', { key: 'fire', type: 'button', onClick: fire, style: fireBtnStyle }, '⚡ ' + t('arccity.fire', 'Fire beam')),
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

        var body = view === 'teacher'
          ? teacherPanel
          : h('div', { key: 'game' }, levelBar, tierBar, svg, controls, badgeStrip);

        return h('div', { id: 'allo-arccity-root', style: { padding: 16, maxWidth: 760, margin: '0 auto', color: INK } },
          header, viewToggle, body);

      } catch (e) {
        return h('div', { style: { padding: 16, color: '#fca5a5', fontSize: 14 } },
          'Arc City could not render: ' + (e && e.message ? e.message : String(e)));
      }
    }
  });

})();
