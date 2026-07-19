// ═══════════════════════════════════════════════════════════════════════
// AlloFlow STEM Lab — Magnetism & Electromagnetism
//
// An interactive study of magnetic fields and how electricity makes them:
//   • Field Explorer — bar magnets with traced field lines + a draggable
//     compass that points along the real local field; add a 2nd magnet to
//     see attraction vs repulsion; iron-filings view; flip polarity.
//   • Electromagnet — a coil + battery: change current and number of turns
//     and watch the solenoid field B = μ₀·n·I respond; drop in an iron core.
//   • Motor — a current loop in a field: F = B·I·L on each side makes torque,
//     and the commutator flips the current every half-turn to keep it spinning.
//   • Generator (Induction) — Faraday's law ε = −N·ΔΦ/Δt: drag a magnet
//     through a coil to light a bulb; still magnet = zero volts; Lenz's law.
//   • Materials — predict-then-test sorter: only iron/nickel/cobalt (and
//     alloys like steel) stick — most metals do NOT.
//   • Crane — junkyard mini-game: an electromagnet with an off switch
//     grabs ONLY the steel; recycle all 4 magnetic items into the bin.
//   • Transformer — mutual induction V₂/V₁ = N₂/N₁, AC-only (DC → 0 V),
//     and why the grid steps voltage up then down (loss ∝ I²R).
//   • Earth's Field — Earth as a giant (tilted) bar magnet: declination,
//     the magnetosphere that deflects the solar wind, and pole reversals.
//   • Quiz — 12 questions with a quest hook at 9+.
//
// Science-accuracy notes (hedged where honesty demands it):
//   • Field LINES are a schematic dipole model — real bar-magnet fields near
//     the metal are messier; the traced lines capture direction/topology, not
//     exact magnitude. This is stated in-tool.
//   • Solenoid law B = μ₀·n·I (n = turns per metre) is exact for a long ideal
//     solenoid; the iron-core boost is shown as a large multiplier (real cores
//     range from ~100× to a few thousand×) and labelled as approximate.
//   • Earth's magnetic poles are NOT the geographic poles; the field wanders
//     and has reversed many times (last full reversal ≈ 780,000 years ago) at
//     irregular intervals — presented as such, no fixed "clock".
//   NGSS MS-PS2-3 (factors affecting magnetic forces), MS-PS2-5 (fields),
//   MS-PS3-5 / HS-PS2-5 (electricity ↔ magnetism).
// House rules: no AI traffic unless ctx.aiHintsEnabled + explicit button.
// ═══════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  // Register only when the STEM Lab host is present; still run the rest so the
  // pure physics helpers below can be require()'d directly by the test suite.
  var _hasHost = !!(typeof window !== 'undefined' && window.StemLab && typeof window.StemLab.registerTool === 'function');

  var MU0 = 1.25663706212e-6; // vacuum permeability (T·m/A)

  // ── Pure physics helpers (exported for tests) ──────────────────────────
  // 2-D magnetic dipole field direction at point p from a dipole at `mag`
  // whose moment points along its `angle` (radians). Returns an UNnormalised
  // vector {x,y}; magnitude ∝ 1/r³ so nearby magnets dominate (as they do).
  function dipoleFieldAt(px, py, mag) {
    var mx = Math.cos(mag.angle) * mag.polarity; // moment direction × N/S sign
    var my = Math.sin(mag.angle) * mag.polarity;
    var rx = px - mag.x, ry = py - mag.y;
    var r2 = rx * rx + ry * ry;
    if (r2 < 1e-6) return { x: 0, y: 0 };
    var r = Math.sqrt(r2);
    var r5 = r2 * r2 * r; // r^5
    var mdotr = mx * rx + my * ry;
    // B ∝ (3(m·r̂)r̂ − m)/r³  →  written with r^5 to avoid re-normalising r̂
    return {
      x: (3 * mdotr * rx - mx * r2) / r5,
      y: (3 * mdotr * ry - my * r2) / r5
    };
  }

  // Superpose the field from every magnet at a point.
  function fieldAt(px, py, magnets) {
    var bx = 0, by = 0;
    for (var i = 0; i < magnets.length; i++) {
      var b = dipoleFieldAt(px, py, magnets[i]);
      bx += b.x; by += b.y;
    }
    return { x: bx, y: by };
  }

  // Trace one field line by stepping along the local field direction.
  // `dir` = +1 follows the field (out of N), −1 traces backward (into S).
  function traceLine(seedX, seedY, magnets, dir, opts) {
    opts = opts || {};
    var step = opts.step || 6;
    var maxSteps = opts.maxSteps || 260;
    var bound = opts.bound || 460;
    var pts = [[seedX, seedY]];
    var x = seedX, y = seedY;
    for (var i = 0; i < maxSteps; i++) {
      var b = fieldAt(x, y, magnets);
      var mag = Math.sqrt(b.x * b.x + b.y * b.y);
      if (mag < 1e-12) break;
      x += dir * step * b.x / mag;
      y += dir * step * b.y / mag;
      if (x < -bound || x > bound || y < -bound || y > bound) break;
      // stop when we plunge into a magnet body (the other pole)
      var swallowed = false;
      for (var j = 0; j < magnets.length; j++) {
        var dx = x - magnets[j].x, dy = y - magnets[j].y;
        if (dx * dx + dy * dy < (opts.poleR || 14) * (opts.poleR || 14)) { swallowed = true; break; }
      }
      pts.push([x, y]);
      if (swallowed) break;
    }
    return pts;
  }

  // Ideal long-solenoid interior field: B = μ₀ · (N/L) · I  (tesla).
  // coreMult models a soft-iron core's relative permeability (approx).
  function solenoidField(turns, current, lengthM, coreMult) {
    var n = turns / Math.max(lengthM, 1e-6);
    return MU0 * n * current * (coreMult || 1);
  }

  // Force on one wire side of the motor loop: F = B · I · L (newtons).
  function wireForce(B, current, lengthM) { return B * current * lengthM; }

  // ── Induction (Faraday's law) helpers ──────────────────────────────────
  // Flux through the coil as a bar magnet sits at position x (coil at x=0).
  // Modeled as a Gaussian bump: max flux when the magnet is centred in the
  // coil, falling off smoothly as it withdraws. Schematic but monotone-correct.
  function fluxAt(x, width) {
    var w = width || 40;
    return Math.exp(-(x * x) / (w * w));
  }

  // Faraday's law: EMF = −N · ΔΦ/Δt. Sign carries Lenz's law (the induced
  // current opposes the CHANGE in flux). Same magnet held still → ΔΦ=0 → 0 V.
  function induceEMF(turns, x1, x2, dt, width) {
    var dPhi = fluxAt(x2, width) - fluxAt(x1, width);
    return -turns * dPhi / Math.max(dt, 1e-9);
  }

  // ── Transformer (mutual induction) ─────────────────────────────────────
  // Ideal transformer: Vout/Vin = N2/N1 — but ONLY for AC. A steady DC
  // current makes a steady flux, and steady flux induces nothing (Faraday).
  function transformerOut(vin, n1, n2, isAC) {
    if (!isAC) return 0;
    return vin * n2 / Math.max(n1, 1e-9);
  }

  // Junkyard-crane item lineup (fixed order → deterministic tests; magnetic
  // and non-magnetic interleaved so every pass is a decision).
  var CRANE_ORDER = ['nail', 'foil', 'clip', 'penny', 'nickel', 'ruler', 'cobalt', 'pencil'];
  var BIN_SLOT = 8; // rightmost position, one past the last item slot

  // ── Magnetic materials (predict-then-test) ─────────────────────────────
  // Only the ferromagnetic trio (iron, nickel, cobalt) and their alloys stick
  // to an everyday magnet — the classic misconception is "all metals do".
  var MATERIALS = [
    { id: 'nail',    name: 'Iron nail',        emoji: '🔩', magnetic: true,  why: 'Iron is ferromagnetic — its atomic magnets can line up and hold.' },
    { id: 'clip',    name: 'Steel paperclip',  emoji: '📎', magnetic: true,  why: 'Steel is mostly iron, so it inherits iron’s magnetism.' },
    { id: 'nickel',  name: 'Nickel bar',       emoji: '🪙', magnetic: true,  why: 'Nickel is one of only three room-temperature ferromagnetic elements (iron, nickel, cobalt).' },
    { id: 'cobalt',  name: 'Cobalt chunk',     emoji: '🪨', magnetic: true,  why: 'Cobalt completes the ferromagnetic trio with iron and nickel.' },
    { id: 'foil',    name: 'Aluminum foil',    emoji: '🥡', magnetic: false, why: 'Aluminum is a metal, but NOT ferromagnetic — a fridge magnet ignores it.' },
    { id: 'penny',   name: 'Copper coin',      emoji: '🥉', magnetic: false, why: 'Copper conducts electricity brilliantly but is not attracted to magnets.' },
    { id: 'ruler',   name: 'Plastic ruler',    emoji: '📏', magnetic: false, why: 'Plastic has no free-to-align atomic magnets at all.' },
    { id: 'pencil',  name: 'Wooden pencil',    emoji: '✏️', magnetic: false, why: 'Wood is non-magnetic — organic materials almost always are.' }
  ];

  // ── Quiz bank ──────────────────────────────────────────────────────────
  var QUIZ = [
    { q: 'Where is a bar magnet’s pull the strongest?', a: ['At the two poles (ends)', 'In the middle', 'It is equal everywhere', 'Just outside the middle'], c: 0,
      why: 'Field lines crowd together at the poles — closer lines mean a stronger field.' },
    { q: 'Two magnets are brought together, north-to-north. They…', a: ['Attract', 'Repel', 'Do nothing', 'Stick only if iron'], c: 1,
      why: 'Like poles repel; opposite poles (N–S) attract.' },
    { q: 'A compass needle is itself a tiny magnet. Its painted north end points…', a: ['Along the local magnetic field', 'Always to true geographic north', 'Toward the nearest heavy object', 'Straight down'], c: 0,
      why: 'The needle lines up with whatever magnetic field it sits in — near a bar magnet that is the magnet’s field, not Earth’s.' },
    { q: 'You wrap more turns of wire into an electromagnet coil (same current). The field…', a: ['Gets stronger', 'Gets weaker', 'Stays the same', 'Reverses'], c: 0,
      why: 'For a solenoid B = μ₀·(N/L)·I — more turns per length means a stronger field.' },
    { q: 'The quickest way to flip an electromagnet’s north and south poles is to…', a: ['Reverse the current direction', 'Add more battery', 'Use thicker wire', 'Cool it down'], c: 0,
      why: 'The poles follow the current’s direction (right-hand rule); reverse the current and the poles swap.' },
    { q: 'Sliding a soft-iron rod into the coil makes the electromagnet…', a: ['Much stronger', 'Slightly weaker', 'Lose its field', 'Spin'], c: 0,
      why: 'Iron concentrates the field lines — its high permeability multiplies the field, often by hundreds of times.' },
    { q: 'In a DC motor, what keeps the loop turning the same way instead of just jiggling?', a: ['The commutator flips the current each half-turn', 'The magnets get stronger', 'Gravity', 'The battery pulses on its own'], c: 0,
      why: 'Without the commutator the torque would reverse and the loop would rock back and forth; the commutator re-flips the current so the push keeps going one way.' },
    { q: 'Earth behaves like a giant bar magnet. Its magnetic poles are…', a: ['Near, but not exactly at, the geographic poles', 'Exactly at the geographic poles', 'At the equator', 'On the Moon'], c: 0,
      why: 'The magnetic and geographic poles are offset — the angle between them at your location is called magnetic declination.' },
    { q: 'Earth’s magnetic field matters for life mainly because it…', a: ['Deflects much of the solar wind', 'Warms the planet', 'Makes the tides', 'Holds the atmosphere down by gravity'], c: 0,
      why: 'The magnetosphere steers charged particles from the Sun around the planet; where they leak in near the poles we get auroras.' },
    { q: 'Over Earth’s history the magnetic poles have…', a: ['Reversed many times, at irregular intervals', 'Never moved', 'Reversed exactly every 1000 years', 'Only moved once'], c: 0,
      why: 'The field flips north↔south irregularly over geologic time; the last full reversal was about 780,000 years ago.' },
    { q: 'You hold a strong magnet perfectly still inside a coil of wire. The voltmeter reads…', a: ['Zero — only CHANGING flux makes voltage', 'A steady high voltage', 'Higher the stronger the magnet', 'It slowly charges up'], c: 0,
      why: 'Faraday’s law: EMF = −N·ΔΦ/Δt. No change in flux means no EMF — you must MOVE the magnet (or vary the field) to generate.' },
    { q: 'Which of these will a fridge magnet actually stick to?', a: ['A steel paperclip', 'Aluminum foil', 'A copper coin', 'All metals equally'], c: 0,
      why: 'Only iron, nickel, cobalt (and their alloys, like steel) are ferromagnetic at room temperature — most metals, including aluminum and copper, are not.' }
  ];

  var FACTS = [
    'A magnet always has two poles. Snap one in half and each piece grows a new N and S — no one has ever found a single, isolated magnetic pole.',
    'Field lines never cross, always leave a north pole and enter a south pole, and are closest together where the field is strongest.',
    'Electricity and magnetism are two faces of one force. A moving charge makes a magnetic field; a changing magnetic field pushes charges — that is how every generator and motor works.',
    'A compass does not sense true north. It senses the local magnetic field, which is why maps print a small "declination" correction for your region.',
    'Magnetite, a naturally magnetic rock, let ancient navigators build the first compasses over a thousand years ago.'
  ];

  if (_hasHost) window.StemLab.registerTool('magnetism', {
    icon: '🧲',
    label: 'Magnetism Lab',
    desc: 'See invisible magnetic fields and learn how electricity makes them. Trace field lines with a live compass, build an electromagnet, spin a DC motor, crank a generator with Faraday’s law, sort magnetic from non-magnetic materials, and explore Earth’s own magnetic shield. NGSS MS-PS2 fields and forces.',
    color: 'rose',
    category: 'science',
    questHooks: [
      { id: 'mag_field', label: 'Move the compass through a magnet’s field', icon: '🧭', check: function (d) { var s = (d && d.magnetism) || {}; return !!s.compassMoved; } },
      { id: 'mag_pair', label: 'See two magnets attract and repel', icon: '🧲', check: function (d) { var s = (d && d.magnetism) || {}; return !!(s.sawAttract && s.sawRepel); } },
      { id: 'mag_electro', label: 'Change an electromagnet’s turns or current', icon: '🔌', check: function (d) { var s = (d && d.magnetism) || {}; return !!s.coilTouched; } },
      { id: 'mag_motor', label: 'Run the DC motor', icon: '⚙️', check: function (d) { var s = (d && d.magnetism) || {}; return !!s.motorRan; } },
      { id: 'mag_earth', label: 'Explore Earth’s magnetic field', icon: '🌍', check: function (d) { var s = (d && d.magnetism) || {}; return !!s.earthSeen; } },
      { id: 'mag_induce', label: 'Generate electricity by moving a magnet', icon: '⚡', check: function (d) { var s = (d && d.magnetism) || {}; return (s.peakEMF || 0) >= 0.5; } },
      { id: 'mag_materials', label: 'Sort all 8 materials correctly', icon: '🔩', check: function (d) { var s = (d && d.magnetism) || {}; return !!s.matPerfect; } },
      { id: 'mag_crane', label: 'Recycle all 4 steel items with the crane', icon: '🏗️', check: function (d) { var s = (d && d.magnetism) || {}; return !!s.craneDone; } },
      { id: 'mag_quiz', label: 'Score 9+ on the magnetism quiz', icon: '🧠', check: function (d) { var s = (d && d.magnetism) || {}; return (s.quizBest || 0) >= 9; } }
    ],
    render: function (ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === 'function') ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      var setLabToolData = ctx.setToolData;
      var addToast = typeof ctx.addToast === 'function' ? ctx.addToast : function () {};
      var awardXP = typeof ctx.awardXP === 'function' ? ctx.awardXP : function () {};
      var callGemini = ctx.callGemini;
      var announceToSR = typeof ctx.announceToSR === 'function' ? ctx.announceToSR : function () {};
      var aiOn = !!(ctx.aiHintsEnabled && typeof callGemini === 'function');
      var labToolData = ctx.toolData;

      var _prefersReducedMotion = false;
      try { _prefersReducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}

      var PANEL = 'var(--allo-stem-panel, #1e293b)';
      var TEXT = 'var(--allo-stem-text, #e2e8f0)';
      var SOFT = 'var(--allo-stem-text-soft, #94a3b8)';
      var BORDER = 'var(--allo-stem-border, #334155)';

      // Fresh per render so the defaults-merge below can never share (and
      // never mutate) a module-level object between renders.
      var MAG_DEFAULTS = {
        tab: 'field',
        // Field Explorer
        magnets: [{ x: -70, y: 0, angle: 0, polarity: 1 }],
        compass: { x: 90, y: 90 }, filings: false, compassMoved: false,
        sawAttract: false, sawRepel: false,
        // Electromagnet
        turns: 20, current: 2, core: false, coilTouched: false,
        // Motor
        motorCurrent: 3, motorField: 4, motorRunning: false, motorAngle: 0, motorRan: false,
        // Earth
        earthSeen: false, declination: 12,
        // Induction (generator)
        induceX: -100, inducePrevX: -100, induceTurns: 50, lastEMF: 0, peakEMF: 0,
        // Materials sorter
        matGuesses: {}, matRevealed: false, matPerfect: false,
        // Junkyard crane
        craneSlot: 0, cranePower: false, craneHolding: null,
        craneItems: { 0: 'nail', 1: 'foil', 2: 'clip', 3: 'penny', 4: 'nickel', 5: 'ruler', 6: 'cobalt', 7: 'pencil' },
        craneDeposited: {}, craneMsg: '', craneDone: false,
        // Transformer
        xfmrN1: 100, xfmrN2: 200, xfmrAC: true, xfmrTouched: false,
        // Quiz
        quizIdx: 0, quizScore: 0, quizPicked: null, quizDone: false, quizBest: 0,
        factIdx: 0,
        askInput: '', askAnswer: '', askLoading: false
      };
      if (!labToolData || !labToolData.magnetism) {
        setLabToolData(function (prev) {
          return Object.assign({}, prev, { magnetism: MAG_DEFAULTS });
        });
        return h('div', { style: { padding: 24, color: SOFT, textAlign: 'center' } }, __alloT('stem.magnetism.initializing', '🧲 Charging the coils…'));
      }
      // PARTIAL state must render, not crash: saved projects from older
      // versions (and the render gate's per-tab probe) supply only some
      // fields — layer the defaults under whatever is present.
      var d = Object.assign({}, MAG_DEFAULTS, labToolData.magnetism);
      function upd(patch) {
        setLabToolData(function (prev) {
          var s = Object.assign({}, (prev && prev.magnetism) || {}, patch);
          return Object.assign({}, prev, { magnetism: s });
        });
      }

      function card(title, children, accent) {
        return h('div', { role: 'region', 'aria-label': typeof title === 'string' ? title : undefined, style: { padding: 14, borderRadius: 12, background: PANEL, border: '1px solid ' + BORDER, borderLeft: '3px solid ' + (accent || '#f43f5e'), marginBottom: 12 } },
          title ? h('h3', { style: { fontSize: 14, fontWeight: 800, color: TEXT, margin: '0 0 8px' } }, title) : null,
          children);
      }

      function wcagStyles() {
        return h('style', { dangerouslySetInnerHTML: { __html:
          '.mag-root button:focus-visible,.mag-root input:focus-visible,.mag-root select:focus-visible,.mag-root textarea:focus-visible,.mag-root [tabindex]:focus-visible{outline:3px solid #fbbf24;outline-offset:2px;border-radius:8px}' +
          '.mag-root .mag-sronly{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}' +
          (_prefersReducedMotion ? '.mag-root *{animation:none!important;transition:none!important}' : '')
        } });
      }

      // ── Tab bar ───────────────────────────────────────────────────────
      var TABS = [
        { id: 'field', label: '🧭 Field Explorer' },
        { id: 'electro', label: '🔌 Electromagnet' },
        { id: 'motor', label: '⚙️ Motor' },
        { id: 'induce', label: '⚡ Generator' },
        { id: 'materials', label: '🔩 Materials' },
        { id: 'crane', label: '🏗️ Crane' },
        { id: 'transformer', label: '🔁 Transformer' },
        { id: 'earth', label: '🌍 Earth’s Field' },
        { id: 'quiz', label: '🧠 Quiz' }
      ];
      function tabBar() {
        return h('div', { role: 'tablist', 'aria-label': 'Magnetism sections', style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 } },
          TABS.map(function (t) {
            var on = d.tab === t.id;
            return h('button', { key: t.id, role: 'tab', 'aria-selected': on ? 'true' : 'false',
              onClick: function () { upd({ tab: t.id }); announceToSR(t.label + ' section'); },
              style: { padding: '8px 12px', borderRadius: 9, border: '1px solid ' + (on ? '#f43f5e' : BORDER), background: on ? '#f43f5e' : 'transparent', color: on ? '#fff' : SOFT, fontWeight: 700, fontSize: 13, cursor: 'pointer' } }, t.label);
          }));
      }

      // ── Field Explorer ────────────────────────────────────────────────
      function renderFieldSVG() {
        var W = 380, HH = 300, cx = W / 2, cy = HH / 2;
        function sx(x) { return cx + x; }
        function sy(y) { return cy + y; }
        var kids = [];
        // background
        kids.push(h('rect', { key: 'bg', x: 0, y: 0, width: W, height: HH, fill: '#0b1220', rx: 10 }));

        // traced field lines (schematic dipole model)
        var seeds = [];
        d.magnets.forEach(function (m) {
          // seed rings around the north end of each magnet
          var nx = m.x + Math.cos(m.angle) * 16 * m.polarity;
          var ny = m.y + Math.sin(m.angle) * 16 * m.polarity;
          for (var a = 0; a < 8; a++) {
            var ang = (a / 8) * Math.PI * 2;
            seeds.push([nx + Math.cos(ang) * 10, ny + Math.sin(ang) * 10]);
          }
        });
        seeds.forEach(function (s, i) {
          var fwd = traceLine(s[0], s[1], d.magnets, 1, { step: 6, maxSteps: 120, bound: 200 });
          var back = traceLine(s[0], s[1], d.magnets, -1, { step: 6, maxSteps: 120, bound: 200 });
          var all = back.slice().reverse().concat(fwd.slice(1));
          if (all.length < 3) return;
          var dpath = 'M ' + all.map(function (p) { return sx(p[0]).toFixed(1) + ' ' + sy(p[1]).toFixed(1); }).join(' L ');
          kids.push(h('path', { key: 'fl' + i, d: dpath, fill: 'none', stroke: d.filings ? 'rgba(148,163,184,0.55)' : 'rgba(244,63,94,0.5)', strokeWidth: d.filings ? 1 : 1.4 }));
        });

        // magnets (bars: red N half, blue S half)
        d.magnets.forEach(function (m, i) {
          var len = 64, wdt = 22;
          var deg = m.angle * 180 / Math.PI;
          var g = [];
          // north half
          g.push(h('rect', { key: 'n', x: 0, y: -wdt / 2, width: len / 2, height: wdt, fill: m.polarity > 0 ? '#ef4444' : '#3b82f6' }));
          g.push(h('rect', { key: 's', x: -len / 2, y: -wdt / 2, width: len / 2, height: wdt, fill: m.polarity > 0 ? '#3b82f6' : '#ef4444' }));
          g.push(h('text', { key: 'nl', x: len / 2 - 9, y: 4, fill: '#fff', fontSize: 12, fontWeight: 800, textAnchor: 'middle' }, m.polarity > 0 ? 'N' : 'S'));
          g.push(h('text', { key: 'sl', x: -len / 2 + 9, y: 4, fill: '#fff', fontSize: 12, fontWeight: 800, textAnchor: 'middle' }, m.polarity > 0 ? 'S' : 'N'));
          kids.push(h('g', { key: 'mag' + i, transform: 'translate(' + sx(m.x) + ',' + sy(m.y) + ') rotate(' + deg.toFixed(1) + ')' }, g));
        });

        // compass — needle points along the local field
        var b = fieldAt(d.compass.x, d.compass.y, d.magnets);
        var bang = Math.atan2(b.y, b.x);
        var cxp = sx(d.compass.x), cyp = sy(d.compass.y);
        kids.push(h('g', { key: 'compass', transform: 'translate(' + cxp + ',' + cyp + ')' },
          h('circle', { r: 18, fill: '#0f172a', stroke: '#e2e8f0', strokeWidth: 1.5 }),
          h('g', { transform: 'rotate(' + (bang * 180 / Math.PI).toFixed(1) + ')' },
            h('polygon', { points: '15,0 -3,-4 -3,4', fill: '#ef4444' }),
            h('polygon', { points: '-15,0 3,-4 3,4', fill: '#e2e8f0' }))
        ));

        return h('svg', { viewBox: '0 0 ' + W + ' ' + HH, width: '100%', style: { maxWidth: 460, borderRadius: 10, border: '1px solid ' + BORDER, touchAction: 'none', cursor: 'crosshair' },
          // Click (or tap) anywhere to teleport the compass there — the direct
          // path for mouse/touch; the D-pad below stays for keyboard and AT.
          onClick: function (e) {
            try {
              var rect = e.currentTarget.getBoundingClientRect();
              if (!rect.width || !rect.height) return;
              var vx = (e.clientX - rect.left) / rect.width * W - W / 2;
              var vy = (e.clientY - rect.top) / rect.height * HH - HH / 2;
              vx = Math.max(-180, Math.min(180, vx));
              vy = Math.max(-130, Math.min(130, vy));
              upd({ compass: { x: vx, y: vy }, compassMoved: true });
            } catch (err) {}
          },
          role: 'img', 'aria-label': 'Magnetic field lines around ' + d.magnets.length + ' bar magnet' + (d.magnets.length > 1 ? 's' : '') + ' with a compass needle pointing along the field. Click anywhere to move the compass.' }, kids);
      }

      function moveCompass(dx, dy) {
        var nx = Math.max(-180, Math.min(180, d.compass.x + dx));
        var ny = Math.max(-130, Math.min(130, d.compass.y + dy));
        upd({ compass: { x: nx, y: ny }, compassMoved: true });
      }

      function fieldTab() {
        var two = d.magnets.length > 1;
        return h('div', null,
          card('Trace the invisible field', h('div', null,
            h('p', { style: { color: SOFT, fontSize: 13, margin: '0 0 10px', lineHeight: 1.5 } }, 'Field lines leave the ', h('b', { style: { color: '#ef4444' } }, 'north (red)'), ' pole and curve back into the ', h('b', { style: { color: '#3b82f6' } }, 'south (blue)'), ' pole. Click anywhere in the field to drop the compass there — its red end always points along the local field.'),
            h('div', { style: { display: 'flex', justifyContent: 'center', marginBottom: 10 } }, renderFieldSVG()),
            // compass D-pad (keyboard + touch friendly)
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3,44px)', gap: 4, justifyContent: 'center', marginBottom: 10 } },
              h('span', null, ''), pad('↑', 0, -18), h('span', null, ''),
              pad('←', -18, 0), h('span', { style: { textAlign: 'center', color: SOFT, fontSize: 11, alignSelf: 'center' } }, 'compass'), pad('→', 18, 0),
              h('span', null, ''), pad('↓', 0, 18), h('span', null, '')),
            // live field-strength readout at the compass position (log scale:
            // dipole fields fall off as 1/r³, so linear bars would be useless)
            (function () {
              var b = fieldAt(d.compass.x, d.compass.y, d.magnets);
              var mag = Math.sqrt(b.x * b.x + b.y * b.y);
              var level = Math.max(0, Math.min(5, Math.floor(Math.log10(mag * 1e7) + 3)));
              var words = ['barely there', 'faint', 'weak', 'moderate', 'strong', 'very strong'];
              return h('div', { role: 'status', style: { textAlign: 'center', marginBottom: 10, color: SOFT, fontSize: 12 } },
                'Field here: ',
                h('span', { 'aria-hidden': 'true', style: { letterSpacing: 1, color: '#f43f5e' } }, '▮'.repeat(level + 1) + '▯'.repeat(5 - level)),
                ' ' + words[level] + ' — try moving closer to a pole');
            })(),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' } },
              h('button', { onClick: function () {
                  var ms = d.magnets.map(function (m, i) { return i === 0 ? Object.assign({}, m, { polarity: -m.polarity }) : m; });
                  upd({ magnets: ms });
                  announceToSR('Flipped the first magnet’s poles');
                }, style: btn() }, '🔄 Flip poles'),
              h('button', { onClick: function () {
                  var ms = d.magnets.map(function (m, i) { return i === 0 ? Object.assign({}, m, { angle: (m.angle + Math.PI / 4) % (Math.PI * 2) }) : m; });
                  upd({ magnets: ms });
                  announceToSR('Rotated the first magnet 45 degrees — watch the whole field swing with it');
                }, style: btn() }, '↻ Rotate 45°'),
              h('button', { onClick: function () { upd({ filings: !d.filings }); }, style: btn(d.filings) }, '🧲 Iron filings: ' + (d.filings ? 'on' : 'off')),
              h('button', { onClick: function () {
                  if (two) { upd({ magnets: [d.magnets[0]] }); return; }
                  // add a 2nd magnet on the right, opposite orientation (attract)
                  upd({ magnets: [Object.assign({}, d.magnets[0], { x: -70 }), { x: 70, y: 0, angle: 0, polarity: 1 }], sawAttract: true });
                  announceToSR('Added a second magnet');
                }, style: btn() }, two ? '➖ One magnet' : '➕ Add magnet')
            )
          )),
          two ? card('Attract or repel?', h('div', null,
            h('p', { style: { color: SOFT, fontSize: 13, margin: '0 0 10px', lineHeight: 1.5 } }, 'The facing ends decide everything. Opposite poles pull together; like poles push apart — you can see it in how the field lines connect or refuse to.'),
            h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
              h('button', { onClick: function () {
                  upd({ magnets: [{ x: -70, y: 0, angle: 0, polarity: 1 }, { x: 70, y: 0, angle: 0, polarity: 1 }], sawAttract: true });
                  announceToSR('N faces S — the magnets attract');
                }, style: btn() }, '🧲 Set up ATTRACT (N–S)'),
              h('button', { onClick: function () {
                  upd({ magnets: [{ x: -70, y: 0, angle: 0, polarity: 1 }, { x: 70, y: 0, angle: Math.PI, polarity: 1 }], sawRepel: true });
                  announceToSR('N faces N — the magnets repel');
                }, style: btn() }, '💥 Set up REPEL (N–N)')),
            (d.sawAttract && d.sawRepel) ? h('p', { style: { color: '#34d399', fontSize: 12, marginTop: 8 } }, '✓ You have now seen both — notice the lines bridge across for attract, and bulge apart for repel.') : null
          ), '#3b82f6') : null,
          disclosure('Field lines here are a schematic dipole model. A real bar magnet’s field is messier right at the metal; the traced lines show the correct direction and shape (topology), not exact strength.')
        );
      }

      function pad(sym, dx, dy) {
        return h('button', { 'aria-label': 'Move compass ' + (dx < 0 ? 'left' : dx > 0 ? 'right' : dy < 0 ? 'up' : 'down'),
          onClick: function () { moveCompass(dx, dy); },
          style: { width: 44, height: 44, borderRadius: 9, border: '1px solid ' + BORDER, background: PANEL, color: TEXT, fontSize: 18, cursor: 'pointer' } }, sym);
      }

      // ── Electromagnet ─────────────────────────────────────────────────
      function electroTab() {
        var coreMult = d.core ? 600 : 1;
        var B = solenoidField(d.turns, d.current, 0.1, coreMult); // 10 cm coil
        var rel = B / solenoidField(20, 2, 0.1, 1); // strength vs the default air coil
        var bars = Math.max(1, Math.min(40, Math.round(rel * 4)));
        return h('div', null,
          card('Build an electromagnet', h('div', null,
            h('p', { style: { color: SOFT, fontSize: 13, margin: '0 0 10px', lineHeight: 1.5 } }, 'A coil of wire carrying current becomes a magnet. Two things you control set its strength: how many ', h('b', null, 'turns'), ' of wire, and how much ', h('b', null, 'current'), ' flows. An iron core multiplies it.'),
            // schematic coil
            h('div', { style: { display: 'flex', justifyContent: 'center', marginBottom: 10 } }, electroSVG(bars)),
            slider('Turns of wire (N)', d.turns, 5, 200, 5, function (v) { upd({ turns: v, coilTouched: true }); }),
            slider('Current (I, amps)', d.current, 0, 6, 0.5, function (v) { upd({ current: v, coilTouched: true }); }),
            h('label', { style: { display: 'flex', alignItems: 'center', gap: 8, color: TEXT, fontSize: 13, margin: '6px 0 10px', cursor: 'pointer' } },
              h('input', { type: 'checkbox', checked: !!d.core, onChange: function () { upd({ core: !d.core, coilTouched: true }); } }),
              'Slide in a soft-iron core'),
            h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.3)' } },
              h('div', { style: { color: TEXT, fontSize: 13, fontWeight: 700 } }, 'Field strength ≈ ' + rel.toFixed(1) + '× the starting coil'),
              h('div', { style: { color: SOFT, fontSize: 12, marginTop: 4 } }, 'B = μ₀ · (N / L) · I' + (d.core ? '  × iron core' : '')),
              d.current === 0 ? h('div', { style: { color: '#fbbf24', fontSize: 12, marginTop: 4 } }, 'No current → no field. An electromagnet is only magnetic while the electricity flows.') : null)
          )),
          disclosure('B = μ₀·(N/L)·I is exact for a long ideal solenoid. The iron-core boost is shown as roughly ×600; real soft-iron cores range from about ×100 to a few thousand, depending on the metal and how hard you drive it.'),
          '#f59e0b'
        );
      }

      function electroSVG(bars) {
        var kids = [];
        kids.push(h('rect', { key: 'bg', x: 0, y: 0, width: 300, height: 120, fill: '#0b1220', rx: 10 }));
        // core rod
        kids.push(h('rect', { key: 'core', x: 60, y: 52, width: 180, height: 16, rx: 3, fill: d.core ? '#94a3b8' : '#1f2937', stroke: '#334155' }));
        // coil loops
        for (var i = 0; i < 8; i++) {
          kids.push(h('ellipse', { key: 'c' + i, cx: 74 + i * 20, cy: 60, rx: 7, ry: 22, fill: 'none', stroke: '#f59e0b', strokeWidth: 3 }));
        }
        // strength meter
        kids.push(h('rect', { key: 'mb', x: 60, y: 96, width: 180, height: 12, rx: 6, fill: '#1f2937' }));
        kids.push(h('rect', { key: 'mf', x: 60, y: 96, width: Math.min(180, bars * 4.5), height: 12, rx: 6, fill: '#f43f5e' }));
        kids.push(h('text', { key: 'poleN', x: 250, y: 64, fill: '#ef4444', fontSize: 13, fontWeight: 800 }, d.current > 0 ? 'N' : ''));
        kids.push(h('text', { key: 'poleS', x: 46, y: 64, fill: '#3b82f6', fontSize: 13, fontWeight: 800, textAnchor: 'end' }, d.current > 0 ? 'S' : ''));
        return h('svg', { viewBox: '0 0 300 120', width: '100%', style: { maxWidth: 340 }, role: 'img', 'aria-label': 'A wire coil ' + (d.core ? 'with an iron core' : 'with an air core') + '; strength meter ' + (d.current > 0 ? 'filled' : 'empty') }, kids);
      }

      // ── Motor ─────────────────────────────────────────────────────────
      function motorTab() {
        var F = wireForce(d.motorField / 10, d.motorCurrent, 0.05); // schematic B in "×0.1 T" units
        var torqueRel = (d.motorField * d.motorCurrent) / (4 * 3);
        return h('div', null,
          card('How a motor spins', h('div', null,
            h('p', { style: { color: SOFT, fontSize: 13, margin: '0 0 10px', lineHeight: 1.5 } }, 'Current in the loop sits inside a magnet’s field. Each side feels a force ', h('b', null, 'F = B·I·L'), ' — one side pushed up, the other down. That twist is torque. A ', h('b', null, 'commutator'), ' flips the current every half turn so the push never reverses.'),
            h('div', { style: { display: 'flex', justifyContent: 'center', marginBottom: 10 } }, motorSVG()),
            slider('Current (I)', d.motorCurrent, 0, 6, 1, function (v) { upd({ motorCurrent: v }); }),
            slider('Magnet strength (B)', d.motorField, 1, 8, 1, function (v) { upd({ motorField: v }); }),
            h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', margin: '6px 0' } },
              h('button', { onClick: function () {
                  var running = !d.motorRunning;
                  upd({ motorRunning: running, motorRan: true, motorAngle: running ? d.motorAngle : d.motorAngle });
                  if (running) { spinMotor(); announceToSR('Motor running'); } else { announceToSR('Motor stopped'); }
                }, style: btn(d.motorRunning) }, d.motorRunning ? '⏹ Stop' : '▶ Run motor'),
              h('button', { onClick: function () { upd({ motorAngle: (d.motorAngle + 30) % 360, motorRan: true }); }, style: btn() }, '↻ Step by hand')),
            h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)' } },
              h('div', { style: { color: TEXT, fontSize: 13, fontWeight: 700 } }, 'Turning force (torque) ≈ ' + torqueRel.toFixed(1) + '× baseline'),
              h('div', { style: { color: SOFT, fontSize: 12, marginTop: 4 } }, 'Torque grows with BOTH current and field. ' + (d.motorCurrent === 0 ? 'No current → no force → it will not turn.' : 'F = B·I·L on each side of the loop.')))
          ), '#38bdf8'),
          disclosure('The spin here is a teaching animation, not a timed simulation — angle advances at a steady rate so you can watch the commutator flip. The force law F = B·I·L and the "torque grows with B and I" relationship are real.')
        );
      }

      function motorSVG() {
        var deg = d.motorAngle;
        var loopColor = d.motorCurrent > 0 ? '#f59e0b' : '#475569';
        var half = (Math.floor(deg / 180) % 2 === 0) ? 1 : -1; // commutator sign
        return h('svg', { viewBox: '0 0 260 180', width: '100%', style: { maxWidth: 320 }, role: 'img', 'aria-label': 'A current loop between a north and south magnet, rotated ' + Math.round(deg) + ' degrees' },
          h('rect', { x: 0, y: 0, width: 260, height: 180, fill: '#0b1220', rx: 10 }),
          h('rect', { x: 6, y: 60, width: 34, height: 60, fill: '#ef4444', rx: 4 }),
          h('text', { x: 23, y: 95, fill: '#fff', fontSize: 14, fontWeight: 800, textAnchor: 'middle' }, 'N'),
          h('rect', { x: 220, y: 60, width: 34, height: 60, fill: '#3b82f6', rx: 4 }),
          h('text', { x: 237, y: 95, fill: '#fff', fontSize: 14, fontWeight: 800, textAnchor: 'middle' }, 'S'),
          // field hint lines
          [70, 90, 110].map(function (yy, i) { return h('line', { key: 'f' + i, x1: 44, y1: yy, x2: 216, y2: yy, stroke: 'rgba(148,163,184,0.25)', strokeWidth: 1 }); }),
          // rotating loop
          h('g', { transform: 'translate(130,90) rotate(' + deg.toFixed(1) + ')' },
            h('rect', { x: -50, y: -30, width: 100, height: 60, fill: 'none', stroke: loopColor, strokeWidth: 5, rx: 4 }),
            // force arrows (up on one side, down on other; flip with commutator)
            d.motorCurrent > 0 ? h('polygon', { points: '-50,' + (-30 - 6 * half) + ' -56,' + (-14 - 6 * half) + ' -44,' + (-14 - 6 * half), fill: '#34d399', transform: half > 0 ? '' : 'rotate(180 -50 -30)' }) : null,
            d.motorCurrent > 0 ? h('circle', { cx: 50, cy: 30, r: 3, fill: '#34d399' }) : null),
          h('text', { x: 130, y: 170, fill: SOFT, fontSize: 11, textAnchor: 'middle' }, 'commutator ' + (half > 0 ? '↑ push up' : '↓ push down') + ' on the near side')
        );
      }

      var _spinRAF = null;
      function spinMotor() {
        if (_prefersReducedMotion) { return; } // respect reduced motion — use "Step by hand"
        if (_spinRAF) return;
        var last = null;
        function frame(ts) {
          var cur = (ctx.toolData && ctx.toolData.magnetism) || {};
          if (!cur.motorRunning) { _spinRAF = null; return; }
          if (last == null) last = ts;
          var dt = ts - last; last = ts;
          var rate = (cur.motorCurrent * cur.motorField) * 0.02; // deg per ms, torque-scaled
          upd({ motorAngle: (cur.motorAngle + dt * rate) % 360 });
          _spinRAF = window.requestAnimationFrame(frame);
        }
        _spinRAF = window.requestAnimationFrame(frame);
      }

      // ── Induction / Generator (Faraday's law) ─────────────────────────
      function moveInduceMagnet(nx) {
        nx = Math.max(-100, Math.min(100, nx));
        // The slider gesture IS the motion: each change is treated as one
        // time-step, so speed of dragging maps to ΔΦ per step — drag fast,
        // induce more. Held still (no change events) → EMF decays to 0.
        var emf = induceEMF(d.induceTurns, d.induceX, nx, 1, 40) * 4; // display-scaled volts
        var peak = Math.max(d.peakEMF || 0, Math.abs(emf));
        upd({ inducePrevX: d.induceX, induceX: nx, lastEMF: emf, peakEMF: peak });
      }

      function induceSVG() {
        var x = d.induceX;                    // −100 (far left) … 0 (in coil) … +100
        var glow = Math.min(1, Math.abs(d.lastEMF) / 2);
        var flux = fluxAt(x, 40);
        return h('svg', { viewBox: '0 0 320 150', width: '100%', style: { maxWidth: 380 }, role: 'img',
          'aria-label': 'A bar magnet at position ' + Math.round(x) + ' near a coil; bulb ' + (glow > 0.15 ? 'glowing' : 'dark') },
          h('rect', { x: 0, y: 0, width: 320, height: 150, fill: '#0b1220', rx: 10 }),
          // coil (fixed at centre)
          [0, 1, 2, 3, 4].map(function (i) {
            return h('ellipse', { key: 'c' + i, cx: 140 + i * 12, cy: 75, rx: 6, ry: 26, fill: 'none', stroke: '#f59e0b', strokeWidth: 3 });
          }),
          // flux indicator (how much field threads the coil right now)
          h('rect', { x: 132, y: 44, width: Math.max(2, flux * 64), height: 4, rx: 2, fill: 'rgba(244,63,94,' + (0.25 + flux * 0.6) + ')' }),
          // magnet (rides the slider)
          h('g', { transform: 'translate(' + (160 + x * 1.1) + ',75)' },
            h('rect', { x: -28, y: -10, width: 28, height: 20, fill: '#3b82f6', rx: 2 }),
            h('rect', { x: 0, y: -10, width: 28, height: 20, fill: '#ef4444', rx: 2 }),
            h('text', { x: 14, y: 4, fill: '#fff', fontSize: 11, fontWeight: 800, textAnchor: 'middle' }, 'N'),
            h('text', { x: -14, y: 4, fill: '#fff', fontSize: 11, fontWeight: 800, textAnchor: 'middle' }, 'S')),
          // wires to bulb
          h('path', { d: 'M 140 101 L 140 128 L 60 128', fill: 'none', stroke: '#64748b', strokeWidth: 2 }),
          h('path', { d: 'M 188 101 L 188 136 L 60 136', fill: 'none', stroke: '#64748b', strokeWidth: 2 }),
          // bulb — brightness ∝ EMF magnitude
          h('circle', { cx: 48, cy: 132, r: 12, fill: glow > 0.05 ? 'rgba(251,191,36,' + (0.25 + glow * 0.75) + ')' : '#1f2937', stroke: '#fbbf24', strokeWidth: 1.5 }),
          glow > 0.4 ? h('circle', { cx: 48, cy: 132, r: 18, fill: 'none', stroke: 'rgba(251,191,36,0.4)', strokeWidth: 3 }) : null,
          h('text', { x: 48, y: 136, fill: glow > 0.3 ? '#0b1220' : '#64748b', fontSize: 10, fontWeight: 700, textAnchor: 'middle' }, '💡')
        );
      }

      function induceTab() {
        var emfAbs = Math.abs(d.lastEMF);
        var lenz = d.lastEMF === 0 ? '—' : (d.lastEMF > 0 ? 'counter-clockwise (opposing the rising flux)' : 'clockwise (opposing the falling flux)');
        return h('div', null,
          card('Make electricity — the generator', h('div', null,
            h('p', { style: { color: SOFT, fontSize: 13, margin: '0 0 10px', lineHeight: 1.5 } }, 'The motor’s mirror twin. ', h('b', null, 'Move'), ' the magnet through the coil and the changing flux pushes charge through the wire: ', h('b', null, 'ε = −N·ΔΦ/Δt'), '. Drag fast for a bright flash; hold still and you get exactly nothing.'),
            h('div', { style: { display: 'flex', justifyContent: 'center', marginBottom: 10 } }, induceSVG()),
            h('div', { style: { marginBottom: 10 } },
              h('label', { style: { display: 'flex', justifyContent: 'space-between', color: TEXT, fontSize: 13, fontWeight: 600, marginBottom: 4 } },
                h('span', null, 'Magnet position — drag it through the coil'), h('span', { style: { color: '#f43f5e' } }, String(Math.round(d.induceX)))),
              h('input', { type: 'range', min: -100, max: 100, step: 2, value: d.induceX,
                'aria-label': 'Magnet position relative to the coil',
                onChange: function (e) { moveInduceMagnet(parseFloat(e.target.value)); },
                style: { width: '100%', accentColor: '#f43f5e' } })),
            slider('Turns on the coil (N)', d.induceTurns, 10, 200, 10, function (v) { upd({ induceTurns: v }); }),
            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 } },
              h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)' } },
                h('div', { style: { color: SOFT, fontSize: 11 } }, 'EMF right now'),
                h('div', { style: { color: TEXT, fontSize: 16, fontWeight: 800 } }, emfAbs.toFixed(2) + ' V'),
                h('div', { style: { color: SOFT, fontSize: 10.5 } }, emfAbs < 0.01 ? 'still magnet = zero volts' : 'induced by the change')),
              h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)' } },
                h('div', { style: { color: SOFT, fontSize: 11 } }, 'Best flash so far'),
                h('div', { style: { color: TEXT, fontSize: 16, fontWeight: 800 } }, (d.peakEMF || 0).toFixed(2) + ' V'),
                h('div', { style: { color: SOFT, fontSize: 10.5 } }, (d.peakEMF || 0) >= 0.5 ? '✓ generator quest earned' : 'target: 0.50 V'))),
            h('div', { style: { color: SOFT, fontSize: 12, lineHeight: 1.5 } },
              h('b', { style: { color: TEXT } }, 'Lenz’s law: '), 'the induced current flows ', lenz, ' — nature resists the change, which is why generators take real effort to crank.')
          ), '#fbbf24'),
          card('Why this runs the world', h('p', { style: { color: SOFT, fontSize: 13, margin: 0, lineHeight: 1.5 } },
            'Nearly every power plant — coal, gas, nuclear, hydro, wind — is just something spinning a magnet near coils. Only solar panels make electricity without this trick. The motor and generator are the same machine run in opposite directions.'), '#fbbf24'),
          disclosure('The flux curve is a smooth schematic (Gaussian) model of a magnet entering a coil, and volts shown are display-scaled. The law itself — EMF = −N·ΔΦ/Δt, zero when nothing changes, sign by Lenz — is the real thing.')
        );
      }

      // ── Magnetic materials (predict-then-test) ────────────────────────
      function materialsTab() {
        var guesses = d.matGuesses || {};
        var answered = Object.keys(guesses).length;
        var allAnswered = answered >= MATERIALS.length;
        var correct = MATERIALS.filter(function (m) { return guesses[m.id] === m.magnetic; }).length;
        return h('div', null,
          card('Will it stick? Predict first', h('div', null,
            h('p', { style: { color: SOFT, fontSize: 13, margin: '0 0 10px', lineHeight: 1.5 } }, 'For each item, predict whether a magnet will grab it — ', h('b', null, 'before'), ' revealing. The common trap: thinking every metal is magnetic.'),
            MATERIALS.map(function (m) {
              var g = guesses[m.id]; // true / false / undefined
              var revealed = d.matRevealed;
              var right = revealed && g === m.magnetic;
              var wrong = revealed && g != null && g !== m.magnetic;
              return h('div', { key: m.id, style: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 9, marginBottom: 6, background: right ? 'rgba(34,197,94,0.12)' : wrong ? 'rgba(239,68,68,0.12)' : 'rgba(148,163,184,0.06)', border: '1px solid ' + (right ? '#22c55e' : wrong ? '#ef4444' : BORDER) } },
                h('span', { style: { fontSize: 18 } }, m.emoji),
                h('div', { style: { flex: 1 } },
                  h('div', { style: { color: TEXT, fontSize: 13, fontWeight: 700 } }, m.name),
                  revealed ? h('div', { style: { color: SOFT, fontSize: 11, lineHeight: 1.4, marginTop: 2 } }, (m.magnetic ? '🧲 Sticks. ' : '🚫 No pull. ') + m.why) : null),
                !revealed ? h('div', { style: { display: 'flex', gap: 4 } },
                  h('button', { 'aria-pressed': g === true ? 'true' : 'false', onClick: function () { var ng = Object.assign({}, guesses); ng[m.id] = true; upd({ matGuesses: ng }); },
                    style: { padding: '5px 9px', borderRadius: 8, border: '1px solid ' + (g === true ? '#f43f5e' : BORDER), background: g === true ? '#f43f5e' : 'transparent', color: g === true ? '#fff' : SOFT, fontSize: 12, fontWeight: 700, cursor: 'pointer' } }, 'Sticks'),
                  h('button', { 'aria-pressed': g === false ? 'true' : 'false', onClick: function () { var ng = Object.assign({}, guesses); ng[m.id] = false; upd({ matGuesses: ng }); },
                    style: { padding: '5px 9px', borderRadius: 8, border: '1px solid ' + (g === false ? '#f43f5e' : BORDER), background: g === false ? '#f43f5e' : 'transparent', color: g === false ? '#fff' : SOFT, fontSize: 12, fontWeight: 700, cursor: 'pointer' } }, 'No pull')
                ) : h('span', { style: { fontSize: 16 } }, right ? '✓' : wrong ? '✗' : '·'));
            }),
            !d.matRevealed ? h('div', { style: { textAlign: 'center', marginTop: 8 } },
              h('button', { disabled: !allAnswered,
                onClick: function () {
                  var perfect = MATERIALS.every(function (m) { return guesses[m.id] === m.magnetic; });
                  upd({ matRevealed: true, matPerfect: perfect || d.matPerfect });
                  if (perfect) { awardXP(15); addToast('🔩 Perfect sort! +15 XP', 'success'); }
                  announceToSR('Revealed: ' + MATERIALS.filter(function (m) { return guesses[m.id] === m.magnetic; }).length + ' of ' + MATERIALS.length + ' correct');
                },
                style: Object.assign({}, btn(true), { opacity: allAnswered ? 1 : 0.5 }) }, allAnswered ? '🧲 Test with the magnet!' : 'Predict all ' + MATERIALS.length + ' first (' + answered + '/' + MATERIALS.length + ')'))
              : h('div', { style: { textAlign: 'center', marginTop: 8 } },
                h('p', { style: { color: correct === MATERIALS.length ? '#34d399' : TEXT, fontSize: 14, fontWeight: 800, margin: '4px 0 8px' } }, correct + ' / ' + MATERIALS.length + ' correct' + (correct === MATERIALS.length ? ' — perfect!' : '')),
                h('button', { onClick: function () { upd({ matGuesses: {}, matRevealed: false }); }, style: btn() }, '↻ Sort again'))
          ), '#a3e635'),
          card('The rule underneath', h('p', { style: { color: SOFT, fontSize: 13, margin: 0, lineHeight: 1.5 } },
            'Only three elements are ferromagnetic at room temperature: ', h('b', { style: { color: TEXT } }, 'iron, nickel, and cobalt'), '. Their atoms are tiny magnets that can lock into alignment. Steel sticks because it is mostly iron; aluminum and copper are metals whose atomic magnets cannot line up this way.'), '#a3e635')
        );
      }

      // ── Junkyard crane (electromagnet + materials, applied) ───────────
      function itemById(id) { return MATERIALS.find(function (m) { return m.id === id; }); }

      function craneMove(dir) {
        if (d.craneDone) return;
        var ns = Math.max(0, Math.min(BIN_SLOT, d.craneSlot + dir));
        if (ns === d.craneSlot) return;
        var patch = { craneSlot: ns };
        // A powered magnet passing over steel grabs it — no click needed,
        // just like a real scrapyard crane sweeping the pile.
        var itemId = (d.craneItems || {})[ns];
        if (d.cranePower && !d.craneHolding && itemId) {
          var it = itemById(itemId);
          if (it && it.magnetic) {
            var items = Object.assign({}, d.craneItems); delete items[ns];
            patch.craneItems = items; patch.craneHolding = itemId;
            patch.craneMsg = 'Clunk! The ' + it.name.toLowerCase() + ' jumped up to the magnet.';
            announceToSR(patch.craneMsg);
          }
        }
        upd(patch);
      }

      function craneTogglePower() {
        if (d.craneDone) return;
        var powerOn = !d.cranePower;
        var patch = { cranePower: powerOn };
        var slot = d.craneSlot;
        var itemId = (d.craneItems || {})[slot];
        if (powerOn && !d.craneHolding && itemId) {
          var it = itemById(itemId);
          if (it.magnetic) {
            var items = Object.assign({}, d.craneItems); delete items[slot];
            patch.craneItems = items; patch.craneHolding = itemId;
            patch.craneMsg = 'Clunk! The ' + it.name.toLowerCase() + ' jumped up to the magnet.';
          } else {
            patch.craneMsg = 'Nothing happens — ' + it.name.toLowerCase() + ' is not ferromagnetic, so the field slides right past it.';
          }
          announceToSR(patch.craneMsg);
        }
        if (!powerOn && d.craneHolding) {
          var held = itemById(d.craneHolding);
          if (slot === BIN_SLOT) {
            var dep = Object.assign({}, d.craneDeposited); dep[d.craneHolding] = true;
            patch.craneDeposited = dep; patch.craneHolding = null;
            var count = Object.keys(dep).length;
            if (count >= 4) {
              patch.craneDone = true;
              patch.craneMsg = 'All 4 steel items recycled — yard cleared! 🏆';
              awardXP(15); addToast('🏗️ Junkyard cleared! +15 XP', 'success');
            } else {
              patch.craneMsg = '+1 recycled (' + count + '/4). Power off = no field = the ' + held.name.toLowerCase() + ' drops.';
            }
          } else if (!(d.craneItems || {})[slot]) {
            var back = Object.assign({}, d.craneItems); back[slot] = d.craneHolding;
            patch.craneItems = back; patch.craneHolding = null;
            patch.craneMsg = 'Dropped the ' + held.name.toLowerCase() + ' back onto the pile.';
          } else {
            patch.cranePower = true; // occupied slot — keep holding, stay on
            patch.craneMsg = 'No room to drop here — carry it to the bin on the right.';
          }
          announceToSR(patch.craneMsg);
        }
        upd(patch);
      }

      function craneSVG() {
        var W = 360, HH = 180;
        var slotX = function (s) { return 22 + s * 36; };
        var cx = slotX(d.craneSlot);
        var kids = [];
        kids.push(h('rect', { key: 'bg', x: 0, y: 0, width: W, height: HH, fill: '#0b1220', rx: 10 }));
        kids.push(h('rect', { key: 'rail', x: 10, y: 18, width: W - 20, height: 5, rx: 2, fill: '#475569' }));
        // trolley + cable + magnet disc
        kids.push(h('rect', { key: 'trolley', x: cx - 12, y: 12, width: 24, height: 14, rx: 3, fill: '#94a3b8' }));
        kids.push(h('line', { key: 'cable', x1: cx, y1: 26, x2: cx, y2: 62, stroke: '#64748b', strokeWidth: 2 }));
        kids.push(h('path', { key: 'disc', d: 'M ' + (cx - 14) + ' 62 A 14 14 0 0 1 ' + (cx + 14) + ' 62 L ' + (cx + 14) + ' 70 L ' + (cx - 14) + ' 70 Z',
          fill: d.cranePower ? '#f43f5e' : '#334155', stroke: d.cranePower ? '#fda4af' : '#475569', strokeWidth: 1.5 }));
        if (d.cranePower) kids.push(h('circle', { key: 'glow', cx: cx, cy: 70, r: 20, fill: 'none', stroke: 'rgba(244,63,94,0.35)', strokeWidth: 4 }));
        // held item rides under the magnet
        if (d.craneHolding) {
          var held = itemById(d.craneHolding);
          kids.push(h('text', { key: 'held', x: cx, y: 92, fontSize: 18, textAnchor: 'middle' }, held.emoji));
        }
        // ground + items
        kids.push(h('rect', { key: 'ground', x: 0, y: 158, width: W, height: 22, fill: '#1e293b' }));
        CRANE_ORDER.forEach(function (id, i) {
          if (!(d.craneItems || {})[i]) return;
          var it = itemById(id);
          kids.push(h('text', { key: 'it' + i, x: slotX(i), y: 152, fontSize: 18, textAnchor: 'middle' }, it.emoji));
        });
        // recycling bin
        kids.push(h('rect', { key: 'bin', x: slotX(BIN_SLOT) - 16, y: 128, width: 32, height: 30, rx: 4, fill: '#14532d', stroke: '#22c55e', strokeWidth: 1.5 }));
        kids.push(h('text', { key: 'binl', x: slotX(BIN_SLOT), y: 148, fontSize: 13, textAnchor: 'middle' }, '♻️'));
        kids.push(h('text', { key: 'binc', x: slotX(BIN_SLOT), y: 124, fill: '#22c55e', fontSize: 10, fontWeight: 700, textAnchor: 'middle' }, Object.keys(d.craneDeposited || {}).length + '/4'));
        return h('svg', { viewBox: '0 0 ' + W + ' ' + HH, width: '100%', style: { maxWidth: 420 }, role: 'img',
          'aria-label': 'Junkyard crane at position ' + d.craneSlot + (d.cranePower ? ', magnet powered' : ', magnet off') + (d.craneHolding ? ', carrying ' + itemById(d.craneHolding).name : '') }, kids);
      }

      function craneTab() {
        return h('div', null,
          card('Junkyard challenge: recycle the steel', h('div', null,
            h('p', { style: { color: SOFT, fontSize: 13, margin: '0 0 10px', lineHeight: 1.5 } }, 'Real scrapyards sort metal with giant electromagnets — power ', h('b', null, 'on'), ' to grab, power ', h('b', null, 'off'), ' to release. Only the steel will come. Carry all 4 magnetic items to the ♻️ bin.'),
            h('div', { style: { display: 'flex', justifyContent: 'center', marginBottom: 10 } }, craneSVG()),
            h('div', { style: { display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 8 } },
              h('button', { 'aria-label': 'Move crane left', onClick: function () { craneMove(-1); }, style: btn() }, '◀ Move'),
              h('button', { 'aria-pressed': d.cranePower ? 'true' : 'false', onClick: craneTogglePower, style: btn(d.cranePower) }, d.cranePower ? '⚡ Power OFF' : '⚡ Power ON'),
              h('button', { 'aria-label': 'Move crane right', onClick: function () { craneMove(1); }, style: btn() }, 'Move ▶')),
            h('div', { role: 'status', 'aria-live': 'polite', style: { minHeight: 34, textAlign: 'center', color: d.craneDone ? '#34d399' : TEXT, fontSize: 13, fontWeight: 600, padding: '4px 8px' } }, d.craneMsg || 'Drive over an item and switch the power on.'),
            d.craneDone ? h('div', { style: { textAlign: 'center' } },
              h('button', { onClick: function () {
                  upd({ craneSlot: 0, cranePower: false, craneHolding: null, craneMsg: '',
                    craneItems: { 0: 'nail', 1: 'foil', 2: 'clip', 3: 'penny', 4: 'nickel', 5: 'ruler', 6: 'cobalt', 7: 'pencil' },
                    craneDeposited: {}, craneDone: false });
                }, style: btn() }, '↻ Reset the yard')) : null
          ), '#f97316'),
          card('Why this works', h('p', { style: { color: SOFT, fontSize: 13, margin: 0, lineHeight: 1.5 } },
            'An electromagnet is a magnet with an off switch — that is its superpower. Permanent magnets can never let go, so cranes, scrap sorters, maglev brakes, and MRI-room door locks all use coils instead. Aluminum and copper ride straight past (eddy-current sorters catch those a different way).'), '#f97316')
        );
      }

      // ── Transformer (mutual induction) ────────────────────────────────
      function transformerSVG() {
        var stepUp = d.xfmrN2 > d.xfmrN1;
        var p = Math.max(2, Math.min(8, Math.round(d.xfmrN1 / 25)));
        var s2 = Math.max(2, Math.min(12, Math.round(d.xfmrN2 / 25)));
        var kids = [];
        kids.push(h('rect', { key: 'bg', x: 0, y: 0, width: 320, height: 140, fill: '#0b1220', rx: 10 }));
        // shared iron core (the flux bridge between the two coils)
        kids.push(h('rect', { key: 'core', x: 120, y: 22, width: 80, height: 96, fill: 'none', stroke: '#94a3b8', strokeWidth: 12, rx: 8, opacity: 0.55 }));
        // primary loops (left leg)
        Array.from({ length: p }).forEach(function (_, i) {
          kids.push(h('ellipse', { key: 'p' + i, cx: 126, cy: 40 + i * (60 / Math.max(p - 1, 1)), rx: 16, ry: 5, fill: 'none', stroke: '#f59e0b', strokeWidth: 3 }));
        });
        // secondary loops (right leg)
        Array.from({ length: s2 }).forEach(function (_, i) {
          kids.push(h('ellipse', { key: 's' + i, cx: 194, cy: 36 + i * (68 / Math.max(s2 - 1, 1)), rx: 16, ry: 5, fill: 'none', stroke: '#38bdf8', strokeWidth: 3 }));
        });
        kids.push(h('text', { key: 'lin', x: 60, y: 66, fill: '#f59e0b', fontSize: 12, fontWeight: 800, textAnchor: 'middle' }, d.xfmrAC ? '120 V AC' : '120 V DC'));
        kids.push(h('text', { key: 'lp', x: 60, y: 82, fill: SOFT, fontSize: 10, textAnchor: 'middle' }, 'primary N₁=' + d.xfmrN1));
        var vout = transformerOut(120, d.xfmrN1, d.xfmrN2, d.xfmrAC);
        kids.push(h('text', { key: 'lout', x: 262, y: 66, fill: '#38bdf8', fontSize: 12, fontWeight: 800, textAnchor: 'middle' }, vout.toFixed(0) + ' V'));
        kids.push(h('text', { key: 'ls', x: 262, y: 82, fill: SOFT, fontSize: 10, textAnchor: 'middle' }, 'secondary N₂=' + d.xfmrN2));
        if (d.xfmrAC) kids.push(h('text', { key: 'tag', x: 160, y: 14, fill: stepUp ? '#34d399' : '#fbbf24', fontSize: 11, fontWeight: 800, textAnchor: 'middle' }, stepUp ? 'STEP-UP ▲' : (d.xfmrN2 === d.xfmrN1 ? '1 : 1' : 'STEP-DOWN ▼')));
        return h('svg', { viewBox: '0 0 320 140', width: '100%', style: { maxWidth: 380 }, role: 'img',
          'aria-label': 'Transformer: primary coil of ' + d.xfmrN1 + ' turns and secondary of ' + d.xfmrN2 + ' turns on a shared iron core, output ' + vout.toFixed(0) + ' volts' }, kids);
      }

      function transformerTab() {
        var vout = transformerOut(120, d.xfmrN1, d.xfmrN2, d.xfmrAC);
        return h('div', null,
          card('Two coils, one trick', h('div', null,
            h('p', { style: { color: SOFT, fontSize: 13, margin: '0 0 10px', lineHeight: 1.5 } }, 'AC in the ', h('b', { style: { color: '#f59e0b' } }, 'primary'), ' coil makes an ever-changing flux in the iron core; the core carries that changing flux through the ', h('b', { style: { color: '#38bdf8' } }, 'secondary'), ', inducing a new voltage. The turns ratio sets the trade: ', h('b', null, 'V₂/V₁ = N₂/N₁'), '.'),
            h('div', { style: { display: 'flex', justifyContent: 'center', marginBottom: 10 } }, transformerSVG()),
            slider('Primary turns (N₁)', d.xfmrN1, 25, 200, 25, function (v) { upd({ xfmrN1: v, xfmrTouched: true }); }),
            slider('Secondary turns (N₂)', d.xfmrN2, 25, 400, 25, function (v) { upd({ xfmrN2: v, xfmrTouched: true }); }),
            h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 } },
              h('button', { 'aria-pressed': d.xfmrAC ? 'true' : 'false', onClick: function () { upd({ xfmrAC: !d.xfmrAC, xfmrTouched: true }); }, style: btn(d.xfmrAC) }, d.xfmrAC ? '〜 AC input' : '⎓ DC input'),
              h('div', { style: { flex: 1, minWidth: 180, padding: 10, borderRadius: 8, background: d.xfmrAC ? 'rgba(56,189,248,0.1)' : 'rgba(239,68,68,0.1)', border: '1px solid ' + (d.xfmrAC ? 'rgba(56,189,248,0.3)' : 'rgba(239,68,68,0.3)') } },
                h('div', { style: { color: TEXT, fontSize: 14, fontWeight: 800 } }, '120 V → ' + vout.toFixed(0) + ' V'),
                h('div', { style: { color: SOFT, fontSize: 11.5, marginTop: 2 } }, d.xfmrAC
                  ? ('ratio ' + d.xfmrN2 + '/' + d.xfmrN1 + ' = ' + (d.xfmrN2 / d.xfmrN1).toFixed(2) + '×')
                  : 'DC = steady current = steady flux = NO induction. Transformers are AC-only machines.')))
          ), '#38bdf8'),
          card('Why your wall has 120 volts', h('p', { style: { color: SOFT, fontSize: 13, margin: 0, lineHeight: 1.5 } },
            'This is why AC won the 1880s “war of the currents”: step voltage UP (to hundreds of kV) and current drops, so long wires waste far less energy as heat (loss ∝ I²R); step it back DOWN near your house. The little brick on a phone charger is the same idea at pocket scale.'), '#38bdf8'),
          disclosure('Ideal-transformer model: real transformers lose a few percent to heat and eddy currents in the core, and power stays conserved — stepping voltage up steps current down by the same ratio. Free energy is not on the menu.')
        );
      }

      // ── Earth's Field ─────────────────────────────────────────────────
      function earthTab() {
        if (!d.earthSeen) { setTimeout(function () { upd({ earthSeen: true }); }, 0); }
        return h('div', null,
          card('Earth is a giant magnet', h('div', null,
            h('div', { style: { display: 'flex', justifyContent: 'center', marginBottom: 10 } }, earthSVG()),
            h('p', { style: { color: SOFT, fontSize: 13, margin: '0 0 8px', lineHeight: 1.5 } }, 'Molten iron churning in Earth’s outer core acts like a bar magnet tilted about 11° from the spin axis. That is why a compass points to ', h('b', null, 'magnetic'), ' north, not the true geographic pole.'),
            slider('Your local declination (°)', d.declination, -30, 30, 1, function (v) { upd({ declination: v }); }),
            h('div', { style: { color: SOFT, fontSize: 12 } }, 'Declination is the angle between where your compass points and true north. Sailors and pilots correct for it using charts for their region.')
          ), '#22c55e'),
          card('A shield for life', h('div', null,
            h('p', { style: { color: SOFT, fontSize: 13, margin: 0, lineHeight: 1.5 } }, 'The field forms a ', h('b', null, 'magnetosphere'), ' that deflects most of the solar wind — the stream of charged particles from the Sun. Where particles funnel in near the poles, they light up the sky as auroras. Mars lost most of its field billions of years ago, and much of its atmosphere with it.')
          ), '#22c55e'),
          disclosure('Earth’s magnetic poles are not fixed: the north magnetic pole drifts tens of km per year, and the whole field has reversed north↔south many times over geologic history — irregularly, most recently about 780,000 years ago. There is no simple countdown to the next one.')
        );
      }

      function earthSVG() {
        var tilt = 11;
        return h('svg', { viewBox: '0 0 240 200', width: '100%', style: { maxWidth: 300 }, role: 'img', 'aria-label': 'Earth as a tilted dipole with field lines looping from the south magnetic pole to the north, and a compass needle offset by declination' },
          h('rect', { x: 0, y: 0, width: 240, height: 200, fill: '#0b1220', rx: 10 }),
          // field loops
          [30, 55, 80].map(function (rr, i) { return h('ellipse', { key: 'e' + i, cx: 120, cy: 100, rx: rr + 20, ry: rr, fill: 'none', stroke: 'rgba(34,197,94,0.4)', strokeWidth: 1.3, transform: 'rotate(' + tilt + ' 120 100)' }); }),
          h('circle', { cx: 120, cy: 100, r: 34, fill: '#1e3a5f', stroke: '#38bdf8', strokeWidth: 1.5 }),
          // spin axis (vertical) vs magnetic axis (tilted)
          h('line', { x1: 120, y1: 40, x2: 120, y2: 160, stroke: '#64748b', strokeWidth: 1, strokeDasharray: '3 3' }),
          h('line', { x1: 120, y1: 40, x2: 120, y2: 160, stroke: '#f43f5e', strokeWidth: 1.5, transform: 'rotate(' + tilt + ' 120 100)' }),
          h('text', { x: 120, y: 34, fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' }, 'geographic N'),
          // little compass showing declination
          h('g', { transform: 'translate(120,100) rotate(' + d.declination + ')' },
            h('polygon', { points: '0,-24 -3,-14 3,-14', fill: '#ef4444' }))
        );
      }

      // ── Quiz ──────────────────────────────────────────────────────────
      function quizTab() {
        if (d.quizDone) {
          return card('Quiz complete', h('div', null,
            h('div', { style: { fontSize: 30, textAlign: 'center', marginBottom: 6 } }, d.quizScore >= 9 ? '🏆' : '🧲'),
            h('p', { style: { color: TEXT, fontSize: 16, fontWeight: 800, textAlign: 'center', margin: '0 0 4px' } }, 'You scored ' + d.quizScore + ' / ' + QUIZ.length),
            h('p', { style: { color: SOFT, fontSize: 13, textAlign: 'center', margin: '0 0 12px' } }, d.quizScore >= 9 ? 'Field mastery unlocked — nicely done.' : 'Solid start — revisit the tabs and try again to reach 9+.'),
            h('div', { style: { textAlign: 'center' } },
              h('button', { onClick: function () { upd({ quizIdx: 0, quizScore: 0, quizPicked: null, quizDone: false }); }, style: btn() }, '↻ Try again'))
          ));
        }
        var item = QUIZ[d.quizIdx];
        return h('div', null,
          card('Question ' + (d.quizIdx + 1) + ' of ' + QUIZ.length, h('div', null,
            h('p', { style: { color: TEXT, fontSize: 15, fontWeight: 700, margin: '0 0 12px', lineHeight: 1.5 } }, item.q),
            item.a.map(function (opt, i) {
              var picked = d.quizPicked === i;
              var reveal = d.quizPicked != null;
              var correct = i === item.c;
              var bg = 'transparent', bd = BORDER;
              if (reveal && correct) { bg = 'rgba(34,197,94,0.18)'; bd = '#22c55e'; }
              else if (reveal && picked && !correct) { bg = 'rgba(239,68,68,0.18)'; bd = '#ef4444'; }
              return h('button', { key: i, disabled: reveal,
                onClick: function () {
                  if (d.quizPicked != null) return;
                  var right = i === item.c;
                  upd({ quizPicked: i, quizScore: d.quizScore + (right ? 1 : 0) });
                  announceToSR(right ? 'Correct. ' + item.why : 'Not quite. ' + item.why);
                },
                style: { display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', marginBottom: 8, borderRadius: 9, border: '1px solid ' + bd, background: bg, color: TEXT, fontSize: 13, cursor: reveal ? 'default' : 'pointer' } },
                opt + (reveal && correct ? '  ✓' : (reveal && picked && !correct ? '  ✗' : '')));
            }),
            d.quizPicked != null ? h('div', null,
              h('p', { style: { color: SOFT, fontSize: 12, lineHeight: 1.5, margin: '4px 0 10px' } }, '💡 ' + item.why),
              h('button', { onClick: function () {
                  if (d.quizIdx + 1 >= QUIZ.length) {
                    var best = Math.max(d.quizBest || 0, d.quizScore);
                    upd({ quizDone: true, quizBest: best });
                    if (d.quizScore >= 9) { awardXP(20); addToast('🏆 Quiz passed! +20 XP', 'success'); }
                  } else {
                    upd({ quizIdx: d.quizIdx + 1, quizPicked: null });
                  }
                }, style: btn(true) }, d.quizIdx + 1 >= QUIZ.length ? 'See results →' : 'Next question →')
            ) : null
          )),
          h('div', { style: { textAlign: 'center', color: SOFT, fontSize: 12 } }, 'Score so far: ' + d.quizScore)
        );
      }

      // ── AI Socratic helper (gated) ────────────────────────────────────
      function askBox() {
        if (!aiOn) return null;
        return card('🤔 Stuck? Ask for a hint', h('div', null,
          h('input', { type: 'text', value: d.askInput || '', placeholder: 'e.g. why does adding turns make it stronger?',
            onChange: function (e) { upd({ askInput: e.target.value }); },
            style: { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid ' + BORDER, background: '#0b1220', color: TEXT, fontSize: 13, marginBottom: 8, boxSizing: 'border-box' } }),
          h('button', { disabled: d.askLoading || !(d.askInput || '').trim(),
            onClick: function () {
              upd({ askLoading: true, askAnswer: '' });
              var prompt = 'You are a Socratic physics tutor for a middle-school magnetism lab. The student asks: "' + (d.askInput || '') + '". Give ONE guiding hint or question, under 45 words, no final numeric answers, no em dashes. Nudge them toward the field-line or B = mu0*n*I idea if relevant.';
              Promise.resolve(callGemini(prompt, false)).then(function (r) {
                upd({ askAnswer: (r && (r.text || r)) || 'Try changing one thing at a time and watch the field respond.', askLoading: false });
              }).catch(function () { upd({ askAnswer: 'Try changing one slider at a time and watch which way the field or compass responds.', askLoading: false }); });
            }, style: btn(true) }, d.askLoading ? '…thinking' : 'Get a hint'),
          d.askAnswer ? h('p', { style: { color: TEXT, fontSize: 13, lineHeight: 1.5, marginTop: 10, padding: 10, background: 'rgba(148,163,184,0.1)', borderRadius: 8 } }, d.askAnswer) : null
        ), '#a855f7');
      }

      // ── shared UI atoms ───────────────────────────────────────────────
      function btn(active) {
        return { padding: '8px 12px', borderRadius: 9, border: '1px solid ' + (active ? '#f43f5e' : BORDER), background: active ? '#f43f5e' : PANEL, color: active ? '#fff' : TEXT, fontWeight: 700, fontSize: 13, cursor: 'pointer' };
      }
      function slider(label, val, min, max, step, onChange) {
        return h('div', { style: { marginBottom: 10 } },
          h('label', { style: { display: 'flex', justifyContent: 'space-between', color: TEXT, fontSize: 13, fontWeight: 600, marginBottom: 4 } },
            h('span', null, label), h('span', { style: { color: '#f43f5e' } }, String(val))),
          h('input', { type: 'range', min: min, max: max, step: step, value: val,
            'aria-label': label,
            onChange: function (e) { onChange(parseFloat(e.target.value)); },
            style: { width: '100%', accentColor: '#f43f5e' } }));
      }
      function disclosure(text, accent) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(148,163,184,0.08)', border: '1px dashed ' + BORDER, marginBottom: 12 } },
          h('div', { style: { color: SOFT, fontSize: 11.5, lineHeight: 1.5 } }, 'ℹ️ ' + text));
      }
      function factStrip() {
        return h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, background: 'rgba(244,63,94,0.08)', border: '1px solid ' + BORDER, marginTop: 4 } },
          h('span', { style: { fontSize: 18 } }, '💡'),
          h('p', { style: { color: SOFT, fontSize: 12.5, margin: 0, flex: 1, lineHeight: 1.45 } }, FACTS[d.factIdx % FACTS.length]),
          h('button', { 'aria-label': 'Next fact', onClick: function () { upd({ factIdx: (d.factIdx + 1) % FACTS.length }); }, style: { padding: '4px 10px', borderRadius: 8, border: '1px solid ' + BORDER, background: PANEL, color: TEXT, cursor: 'pointer', fontSize: 12 } }, 'Next ↻'));
      }

      var body = d.tab === 'field' ? fieldTab()
        : d.tab === 'electro' ? electroTab()
        : d.tab === 'motor' ? motorTab()
        : d.tab === 'induce' ? induceTab()
        : d.tab === 'materials' ? materialsTab()
        : d.tab === 'crane' ? craneTab()
        : d.tab === 'transformer' ? transformerTab()
        : d.tab === 'earth' ? earthTab()
        : quizTab();

      return h('div', { className: 'mag-root', style: { maxWidth: 720, margin: '0 auto', color: TEXT } },
        wcagStyles(),
        h('div', { className: 'mag-sronly', role: 'status', 'aria-live': 'polite' }, ''),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 } },
          h('span', { style: { fontSize: 26 } }, '🧲'),
          h('div', null,
            h('h2', { style: { margin: 0, fontSize: 19, fontWeight: 800, color: TEXT } }, 'Magnetism & Electromagnetism'),
            h('p', { style: { margin: 0, fontSize: 12.5, color: SOFT } }, 'See the invisible field, then make one with electricity.'))),
        tabBar(),
        body,
        d.tab !== 'quiz' ? askBox() : null,
        factStrip()
      );
    }
  });

  // Expose pure helpers for the test suite (no-op in the browser bundle).
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { dipoleFieldAt: dipoleFieldAt, fieldAt: fieldAt, traceLine: traceLine, solenoidField: solenoidField, wireForce: wireForce, fluxAt: fluxAt, induceEMF: induceEMF, transformerOut: transformerOut, CRANE_ORDER: CRANE_ORDER, BIN_SLOT: BIN_SLOT, MATERIALS: MATERIALS, QUIZ: QUIZ, MU0: MU0 };
  }
})();
