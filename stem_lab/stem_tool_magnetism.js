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
//   • Earth's Field — Earth as a giant (tilted) bar magnet: declination,
//     the magnetosphere that deflects the solar wind, and pole reversals.
//   • Quiz — 10 questions with a quest hook at 7+.
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
      why: 'The field flips north↔south irregularly over geologic time; the last full reversal was about 780,000 years ago.' }
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
    desc: 'See invisible magnetic fields and learn how electricity makes them. Trace field lines around bar magnets with a live compass, build an electromagnet and change its turns and current, spin a DC motor with real forces, and explore Earth’s own magnetic shield. NGSS MS-PS2 fields and forces.',
    color: 'rose',
    category: 'science',
    questHooks: [
      { id: 'mag_field', label: 'Move the compass through a magnet’s field', icon: '🧭', check: function (d) { var s = (d && d.magnetism) || {}; return !!s.compassMoved; } },
      { id: 'mag_pair', label: 'See two magnets attract and repel', icon: '🧲', check: function (d) { var s = (d && d.magnetism) || {}; return !!(s.sawAttract && s.sawRepel); } },
      { id: 'mag_electro', label: 'Change an electromagnet’s turns or current', icon: '🔌', check: function (d) { var s = (d && d.magnetism) || {}; return !!s.coilTouched; } },
      { id: 'mag_motor', label: 'Run the DC motor', icon: '⚙️', check: function (d) { var s = (d && d.magnetism) || {}; return !!s.motorRan; } },
      { id: 'mag_earth', label: 'Explore Earth’s magnetic field', icon: '🌍', check: function (d) { var s = (d && d.magnetism) || {}; return !!s.earthSeen; } },
      { id: 'mag_quiz', label: 'Score 7+ on the magnetism quiz', icon: '🧠', check: function (d) { var s = (d && d.magnetism) || {}; return (s.quizBest || 0) >= 7; } }
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

      if (!labToolData || !labToolData.magnetism) {
        setLabToolData(function (prev) {
          return Object.assign({}, prev, { magnetism: {
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
            // Quiz
            quizIdx: 0, quizScore: 0, quizPicked: null, quizDone: false, quizBest: 0,
            factIdx: 0,
            askInput: '', askAnswer: '', askLoading: false
          } });
        });
        return h('div', { style: { padding: 24, color: SOFT, textAlign: 'center' } }, __alloT('stem.magnetism.initializing', '🧲 Charging the coils…'));
      }
      var d = labToolData.magnetism;
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

        return h('svg', { viewBox: '0 0 ' + W + ' ' + HH, width: '100%', style: { maxWidth: 460, borderRadius: 10, border: '1px solid ' + BORDER, touchAction: 'none' },
          role: 'img', 'aria-label': 'Magnetic field lines around ' + d.magnets.length + ' bar magnet' + (d.magnets.length > 1 ? 's' : '') + ' with a compass needle pointing along the field' }, kids);
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
            h('p', { style: { color: SOFT, fontSize: 13, margin: '0 0 10px', lineHeight: 1.5 } }, 'Field lines leave the ', h('b', { style: { color: '#ef4444' } }, 'north (red)'), ' pole and curve back into the ', h('b', { style: { color: '#3b82f6' } }, 'south (blue)'), ' pole. Move the compass — its red end always points along the local field.'),
            h('div', { style: { display: 'flex', justifyContent: 'center', marginBottom: 10 } }, renderFieldSVG()),
            // compass D-pad (keyboard + touch friendly)
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3,44px)', gap: 4, justifyContent: 'center', marginBottom: 10 } },
              h('span', null, ''), pad('↑', 0, -18), h('span', null, ''),
              pad('←', -18, 0), h('span', { style: { textAlign: 'center', color: SOFT, fontSize: 11, alignSelf: 'center' } }, 'compass'), pad('→', 18, 0),
              h('span', null, ''), pad('↓', 0, 18), h('span', null, '')),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' } },
              h('button', { onClick: function () {
                  var ms = d.magnets.map(function (m, i) { return i === 0 ? Object.assign({}, m, { polarity: -m.polarity }) : m; });
                  upd({ magnets: ms });
                  announceToSR('Flipped the first magnet’s poles');
                }, style: btn() }, '🔄 Flip poles'),
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
            h('div', { style: { fontSize: 30, textAlign: 'center', marginBottom: 6 } }, d.quizScore >= 7 ? '🏆' : '🧲'),
            h('p', { style: { color: TEXT, fontSize: 16, fontWeight: 800, textAlign: 'center', margin: '0 0 4px' } }, 'You scored ' + d.quizScore + ' / ' + QUIZ.length),
            h('p', { style: { color: SOFT, fontSize: 13, textAlign: 'center', margin: '0 0 12px' } }, d.quizScore >= 7 ? 'Field mastery unlocked — nicely done.' : 'Solid start — revisit the tabs and try again to reach 7+.'),
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
                    if (d.quizScore >= 7) { awardXP(20); addToast('🏆 Quiz passed! +20 XP', 'success'); }
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
    module.exports = { dipoleFieldAt: dipoleFieldAt, fieldAt: fieldAt, traceLine: traceLine, solenoidField: solenoidField, wireForce: wireForce, QUIZ: QUIZ, MU0: MU0 };
  }
})();
