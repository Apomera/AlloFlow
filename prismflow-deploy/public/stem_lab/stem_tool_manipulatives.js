// ═══════════════════════════════════════════════════════════════════════
// stem_tool_manipulatives.js — Math Manipulatives (v3 — broad + deep)
//
// ARCHITECTURE OVERVIEW (for contributors)
// ────────────────────────────────────────
// A hub of virtual math manipulatives. Each manipulative is a self-contained
// mode with its own state, render block, and (where useful) challenges.
//
// v3 expands from 4 modes (base-10 blocks, abacus, slide rule, quiz) to
// 12 manipulative modes covering K-5 math intervention needs:
//
//   1.  Base-10 Blocks      — place value (existing, refined)
//   2.  Abacus              — soroban / suanpan / schoty (existing)
//   3.  Slide Rule          — logarithms hands-on (existing)
//   4.  Place Value Quiz    — assessment (existing)
//   5.  Ten Frames          — K-2 number sense, subitizing
//   6.  Two-Color Counters  — integer add/sub, debt-and-asset model
//   7.  Place-Value Disks   — bridge between concrete blocks and procedure
//   8.  Hundreds Chart      — patterns, skip-counting, multiples
//   9.  Pattern Blocks      — fraction equivalence, geometry, symmetry
//  10.  Geoboard            — area, perimeter, fractions, polygons
//  11.  Cuisenaire Rods     — number sense, addition, fractions
//  12.  Number Bonds        — part-part-whole reasoning
//
// PEDAGOGICAL FRAMEWORK
// ─────────────────────
// Bruner's CRA (Concrete-Representational-Abstract) progression.
// This tool covers the CONCRETE stage. The Fraction Lab and Number Line tools
// cover REPRESENTATIONAL. Worksheets and challenge problems are ABSTRACT.
//
// All manipulatives align to CCSS K-5 standards. See STANDARDS_MAP below.
//
// STATE LAYOUT (in ctx.toolData._manipulatives)
// ─────────────────────────────────────────────
//   mode               — current manipulative mode
//   b10, abacus, sr    — original three modes' state
//   tenFrame, counters, pvDisks, hundredsChart, patternBlocks,
//   geoboard, cRods, numberBonds — v3 manipulative state
//   saved              — { name → snapshot } of named constructions
//   palette            — color-blind-safe palette choice
//   craStage           — 1/2/3 for the CRA progression mode
//
// ACCESSIBILITY
// ─────────────
//   aria-live region #allo-live-manipulatives for SR announcements.
//   Reduced-motion CSS respected. Color-blind palette toggle in Settings.
//   Touch + mouse interactions via Pointer Events where applicable.
//
// CONTRIBUTORS
// ────────────
//   Run `node --check stem_lab/stem_tool_manipulatives.js` after edits.
//   E2E test at tests/e2e/manipulatives-tool.spec.ts.
// ═══════════════════════════════════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; } }
};

(function() {
  'use strict';
  // ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEM Lab tools ──
  (function() {
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();

  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-manipulatives')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-manipulatives';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();


  // ══════════════════════════════════════════════════════════════
  // ── Sound Effects ──
  // ══════════════════════════════════════════════════════════════
  var _audioCtx = null;
  function getAC() { if (!_audioCtx) try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} return _audioCtx; }
  function playTone(f, dur, type, vol) {
    var ac = getAC(); if (!ac) return;
    try { var o = ac.createOscillator(), g = ac.createGain(); o.type = type || 'sine'; o.frequency.value = f; g.gain.setValueAtTime(vol || 0.08, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (dur || 0.12)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + (dur || 0.12)); } catch(e) {}
  }
  function sfxClick() { playTone(600, 0.04, 'sine', 0.05); }
  function sfxCorrect() { playTone(523, 0.08, 'sine', 0.08); setTimeout(function() { playTone(659, 0.08, 'sine', 0.08); }, 70); setTimeout(function() { playTone(784, 0.12, 'sine', 0.1); }, 140); }
  function sfxWrong() { playTone(330, 0.12, 'sawtooth', 0.05); setTimeout(function() { playTone(262, 0.15, 'sawtooth', 0.04); }, 80); }
  function sfxBadge() { playTone(523, 0.1, 'sine', 0.1); setTimeout(function() { playTone(784, 0.1, 'sine', 0.1); }, 100); setTimeout(function() { playTone(1047, 0.18, 'sine', 0.12); }, 250); }
  function sfxRegroup() { playTone(440, 0.06, 'triangle', 0.06); setTimeout(function() { playTone(660, 0.06, 'triangle', 0.06); }, 60); }
  function sfxBead() { playTone(800, 0.03, 'sine', 0.04); }
  function sfxTick() { playTone(1000, 0.02, 'sine', 0.03); }

  // ══════════════════════════════════════════════════════════════
  // ── Badge Definitions (14) ──
  // ══════════════════════════════════════════════════════════════
  var badgeDefs = [
    { id: 'first_build', icon: '\uD83E\uDDF1', name: 'First Build', desc: 'Build your first number with blocks' },
    { id: 'regroup_5', icon: '\u21C4', name: 'Regrouper', desc: 'Regroup 5 times' },
    { id: 'blocks_10', icon: '\uD83C\uDFC6', name: 'Block Master', desc: 'Solve 10 block challenges' },
    { id: 'abacus_5', icon: '\uD83E\uDDEE', name: 'Abacus Ace', desc: 'Solve 5 abacus challenges' },
    { id: 'speed_10s', icon: '\u23F1\uFE0F', name: 'Speed Demon', desc: 'Abacus speed < 10 seconds' },
    { id: 'speed_5s', icon: '\u26A1', name: 'Lightning', desc: 'Abacus speed < 5 seconds' },
    { id: 'slide_5', icon: '\uD83D\uDCCF', name: 'Slide Ruler', desc: 'Solve 5 slide rule problems' },
    { id: 'quiz_10', icon: '\uD83E\uDDE0', name: 'Quiz Whiz', desc: 'Answer 10 quiz questions' },
    { id: 'streak_5', icon: '\uD83D\uDD25', name: 'On Fire', desc: '5 correct in a row' },
    { id: 'streak_10', icon: '\uD83C\uDF1F', name: 'Unstoppable', desc: '10 correct in a row' },
    { id: 'all_modes', icon: '\uD83C\uDFA8', name: 'Explorer', desc: 'Try all 4 modes' },
    { id: 'thousand', icon: '\uD83D\uDCAF', name: 'Big Number', desc: 'Build a number \u2265 1000' },
    { id: 'ai_tutor', icon: '\uD83E\uDD16', name: 'AI Student', desc: 'Ask the AI tutor' },
    { id: 'addition', icon: '\u2795', name: 'Adder', desc: 'Complete an addition problem' },
    // \u2500\u2500 v3.1: badges for the 8 new manipulatives + meta modes \u2500\u2500
    { id: 'tenframe_full',  icon: '\ud83d\udd1f', name: 'Ten Maker',        desc: 'Fill a ten frame to exactly 10' },
    { id: 'tenframe_double',icon: '\u2728',       name: 'Twenty Maker',     desc: 'Fill the double ten frame to 20' },
    { id: 'zero_pair',      icon: '\u2696\ufe0f', name: 'Zero Pair',        desc: 'Make a counters pile net to 0' },
    { id: 'integer_master', icon: '\ud83d\udd34', name: 'Integer Master',   desc: 'Solve 5 counter challenges' },
    { id: 'pvd_regroup',    icon: '\ud83d\udcbf', name: 'Disk Trader',      desc: 'Regroup with place-value disks' },
    { id: 'hc_skipcount',   icon: '\ud83d\udcaf', name: 'Skip Counter',     desc: 'Use a skip-count overlay' },
    { id: 'hc_primes',      icon: '\ud83d\udd22', name: 'Prime Hunter',     desc: 'Show the primes on the hundreds chart' },
    { id: 'pb_hex_cover',   icon: '\u2b22',       name: 'Hex Coverer',      desc: 'Cover exactly 1 hexagon with parts' },
    { id: 'gb_polygon',     icon: '\u2b1c',       name: 'Polygon Builder',  desc: 'Build a polygon with 5+ segments' },
    { id: 'cr_train',       icon: '\ud83d\udfe7', name: 'Rod Train',        desc: 'Build a Cuisenaire train of length 10+' },
    { id: 'nb_practice5',   icon: '\ud83d\udd17', name: 'Bond Builder',     desc: 'Get 5 number-bond practice problems right' },
    { id: 'cra_complete',   icon: '\ud83d\udd04', name: 'Triple Threat',    desc: 'Complete all 3 stages of a CRA problem' },
    { id: 'challenge_hub',  icon: '\ud83c\udfc6', name: 'Hub Champion',     desc: 'Solve 10 Challenge Hub problems' },
    { id: 'all_12_modes',   icon: '\ud83c\udf1f', name: 'Polyglot',         desc: 'Try all 12 manipulative modes' }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Place Value Quiz Questions ──
  // ══════════════════════════════════════════════════════════════
  function generatePVQuiz() {
    var types = ['digit_place', 'expanded_to_standard', 'standard_to_expanded', 'compare', 'round'];
    var type = types[Math.floor(Math.random() * types.length)];
    var num = 10 + Math.floor(Math.random() * 9990);
    var digits = { thousands: Math.floor(num / 1000) % 10, hundreds: Math.floor(num / 100) % 10, tens: Math.floor(num / 10) % 10, ones: num % 10 };
    var places = ['ones', 'tens', 'hundreds', 'thousands'];
    var place = places[Math.floor(Math.random() * places.length)];

    if (type === 'digit_place') {
      return { type: type, q: 'What digit is in the ' + place + ' place of ' + num.toLocaleString() + '?', answer: digits[place].toString(), opts: [digits[place].toString(), Math.floor(Math.random()*10).toString(), Math.floor(Math.random()*10).toString(), Math.floor(Math.random()*10).toString()].filter(function(v, i, a) { return a.indexOf(v) === i; }).slice(0, 4).sort(function() { return Math.random() - 0.5; }) };
    } else if (type === 'expanded_to_standard') {
      var exp = '';
      if (digits.thousands > 0) exp += digits.thousands + ',000';
      if (digits.hundreds > 0) exp += (exp ? ' + ' : '') + digits.hundreds + '00';
      if (digits.tens > 0) exp += (exp ? ' + ' : '') + digits.tens + '0';
      if (digits.ones > 0) exp += (exp ? ' + ' : '') + digits.ones;
      if (!exp) exp = '0';
      var fakes = [num + 100, num - 10, num + 1000, Math.floor(Math.random() * 9999)].map(function(n) { return Math.max(0, n).toString(); });
      return { type: type, q: 'What number is ' + exp + '?', answer: num.toString(), opts: [num.toString()].concat(fakes).filter(function(v, i, a) { return a.indexOf(v) === i; }).slice(0, 4).sort(function() { return Math.random() - 0.5; }) };
    } else if (type === 'standard_to_expanded') {
      var parts = [];
      if (digits.thousands > 0) parts.push(digits.thousands + ' \u00D7 1000');
      if (digits.hundreds > 0) parts.push(digits.hundreds + ' \u00D7 100');
      if (digits.tens > 0) parts.push(digits.tens + ' \u00D7 10');
      if (digits.ones > 0) parts.push(digits.ones + ' \u00D7 1');
      var correct = parts.join(' + ');
      // Generate wrong options by swapping place values
      var wrong1 = [digits.ones + ' \u00D7 1000', digits.thousands + ' \u00D7 1'].filter(function(s) { return s.charAt(0) !== '0'; }).join(' + ') || '0';
      var wrong2 = (digits.hundreds || 1) + ' \u00D7 1000 + ' + (digits.thousands || 1) + ' \u00D7 100';
      return { type: type, q: 'Write ' + num.toLocaleString() + ' in expanded form:', answer: correct, opts: [correct, wrong1, wrong2].filter(function(v, i, a) { return a.indexOf(v) === i; }).slice(0, 4).sort(function() { return Math.random() - 0.5; }) };
    } else if (type === 'compare') {
      var num2 = 10 + Math.floor(Math.random() * 9990);
      while (num2 === num) num2 = 10 + Math.floor(Math.random() * 9990);
      var ans = num > num2 ? '>' : num < num2 ? '<' : '=';
      return { type: type, q: num.toLocaleString() + ' ___ ' + num2.toLocaleString(), answer: ans, opts: ['>', '<', '='].sort(function() { return Math.random() - 0.5; }) };
    } else {
      // Rounding
      var roundTo = [10, 100, 1000][Math.floor(Math.random() * 3)];
      var rounded = Math.round(num / roundTo) * roundTo;
      var fakes2 = [rounded + roundTo, rounded - roundTo, Math.round(num / (roundTo / 10)) * (roundTo / 10)].map(function(n) { return Math.max(0, Math.round(n)).toString(); });
      return { type: type, q: 'Round ' + num.toLocaleString() + ' to the nearest ' + roundTo.toLocaleString() + ':', answer: rounded.toString(), opts: [rounded.toString()].concat(fakes2).filter(function(v, i, a) { return a.indexOf(v) === i; }).slice(0, 4).sort(function() { return Math.random() - 0.5; }) };
    }
  }

  // ══════════════════════════════════════════════════════════════
  // ── Slide Rule Practice Problems ──
  // ══════════════════════════════════════════════════════════════
  var srProblems = [
    { a: 2, b: 3, answer: 6 }, { a: 2, b: 4, answer: 8 }, { a: 3, b: 3, answer: 9 },
    { a: 2.5, b: 4, answer: 10 }, { a: 1.5, b: 6, answer: 9 }, { a: 4, b: 5, answer: 20 },
    { a: 3, b: 7, answer: 21 }, { a: 2, b: 8, answer: 16 }, { a: 5, b: 5, answer: 25 },
    { a: 1.2, b: 3, answer: 3.6 }, { a: 6, b: 3, answer: 18 }, { a: 7, b: 4, answer: 28 }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Abacus Culture Facts ──
  // ══════════════════════════════════════════════════════════════
  var abacusFacts = [
    { emoji: '\uD83C\uDDEF\uD83C\uDDF5', name: 'Soroban (Japan)', desc: '1 heaven bead (5) + 4 earth beads (1). Used in schools today. Speed competitions are popular!' },
    { emoji: '\uD83C\uDDE8\uD83C\uDDF3', name: 'Suanpan (China)', desc: '2 heaven beads (5) + 5 earth beads (1). Invented over 2,000 years ago during the Han Dynasty.' },
    { emoji: '\uD83C\uDDF7\uD83C\uDDFA', name: 'Schoty (Russia)', desc: '10 beads per rod, no divider bar. Used in Russian shops until the 1990s!' },
    { emoji: '\uD83C\uDDF2\uD83C\uDDFD', name: 'Nepohualtzintzin (Aztec)', desc: 'Base-20 abacus using corn kernels on strings. Used for astronomy calculations!' }
  ];

  // ══════════════════════════════════════════════════════════════════
  // ── v3: STANDARDS_MAP — CCSS K-5 alignment per manipulative ──
  // ══════════════════════════════════════════════════════════════════
  var STANDARDS_MAP = {
    blocks: [
      { code: 'K.NBT.A.1', grade: 'K', desc: 'Compose and decompose numbers from 11 to 19 into ten ones and some further ones.' },
      { code: '1.NBT.B.2', grade: '1', desc: 'Understand that two digits represent amounts of tens and ones.' },
      { code: '2.NBT.A.1', grade: '2', desc: 'Understand that the three digits of a three-digit number represent amounts of hundreds, tens, and ones.' },
      { code: '4.NBT.A.1', grade: '4', desc: 'Recognize that in a multi-digit whole number, a digit in one place represents 10 times what it represents in the place to its right.' }
    ],
    abacus: [
      { code: '2.NBT.B.5', grade: '2', desc: 'Fluently add and subtract within 100 using strategies based on place value.' },
      { code: '3.NBT.A.2', grade: '3', desc: 'Fluently add and subtract within 1000 using strategies and algorithms based on place value.' }
    ],
    tenFrame: [
      { code: 'K.OA.A.4', grade: 'K', desc: 'For any number from 1 to 9, find the number that makes 10 when added to the given number.' },
      { code: 'K.CC.B.4', grade: 'K', desc: 'Understand the relationship between numbers and quantities; connect counting to cardinality.' },
      { code: '1.OA.B.4', grade: '1', desc: 'Understand subtraction as an unknown-addend problem.' }
    ],
    counters: [
      { code: '1.OA.A.1', grade: '1', desc: 'Use addition and subtraction within 20 to solve word problems.' },
      { code: '6.NS.C.5', grade: '6', desc: 'Understand that positive and negative numbers describe quantities having opposite directions or values.' },
      { code: '7.NS.A.1', grade: '7', desc: 'Apply and extend previous understandings of addition and subtraction to add and subtract rational numbers.' }
    ],
    pvDisks: [
      { code: '4.NBT.B.4', grade: '4', desc: 'Fluently add and subtract multi-digit whole numbers using the standard algorithm.' },
      { code: '4.NBT.A.2', grade: '4', desc: 'Read and write multi-digit whole numbers using base-ten numerals, number names, and expanded form.' }
    ],
    hundredsChart: [
      { code: '1.NBT.A.1', grade: '1', desc: 'Count to 120, starting at any number less than 120.' },
      { code: '2.NBT.A.2', grade: '2', desc: 'Count within 1000; skip-count by 5s, 10s, and 100s.' },
      { code: '3.OA.D.9', grade: '3', desc: 'Identify arithmetic patterns and explain them using properties of operations.' }
    ],
    patternBlocks: [
      { code: '2.G.A.3', grade: '2', desc: 'Partition circles and rectangles into 2, 3, or 4 equal shares.' },
      { code: '3.NF.A.1', grade: '3', desc: 'Understand a fraction 1/b as the quantity formed by 1 part when a whole is partitioned into b equal parts.' },
      { code: '4.G.A.3', grade: '4', desc: 'Recognize a line of symmetry for a two-dimensional figure.' }
    ],
    geoboard: [
      { code: '3.MD.D.8', grade: '3', desc: 'Solve real world and mathematical problems involving perimeters of polygons.' },
      { code: '4.MD.A.3', grade: '4', desc: 'Apply the area and perimeter formulas for rectangles in real world and mathematical problems.' },
      { code: '5.NF.B.4.b', grade: '5', desc: 'Find the area of a rectangle with fractional side lengths.' }
    ],
    cRods: [
      { code: 'K.CC.C.6', grade: 'K', desc: 'Identify whether the number of objects in one group is greater than, less than, or equal to another group.' },
      { code: '1.NBT.C.4', grade: '1', desc: 'Add within 100 using concrete models or drawings.' },
      { code: '3.NF.A.1', grade: '3', desc: 'Understand a fraction 1/b as the quantity formed by 1 part of a whole partitioned into b equal parts.' }
    ],
    numberBonds: [
      { code: 'K.OA.A.3', grade: 'K', desc: 'Decompose numbers less than or equal to 10 into pairs in more than one way.' },
      { code: '1.OA.B.3', grade: '1', desc: 'Apply properties of operations as strategies to add and subtract.' },
      { code: '1.OA.C.6', grade: '1', desc: 'Add and subtract within 20, demonstrating fluency for addition and subtraction within 10.' }
    ]
  };

  // ══════════════════════════════════════════════════════════════════
  // ── v3: COLOR-BLIND SAFE PALETTES ──
  // ══════════════════════════════════════════════════════════════════
  var MANIP_PALETTES = {
    standard: {
      name: 'Standard',
      counter1: '#dc2626', counter2: '#facc15', // red / yellow (two-color counters)
      rods: ['#fef3c7', '#fca5a5', '#fdba74', '#fcd34d', '#bef264', '#86efac', '#67e8f9', '#a5b4fc', '#c4b5fd', '#f9a8d4'],
      blocks: { ones: '#10b981', tens: '#3b82f6', hundreds: '#a855f7', thousands: '#dc2626' },
      geoboard: '#0ea5e9',
      tenFrame: '#f97316'
    },
    okabe: {
      name: 'Okabe-Ito (CB-safe)',
      counter1: '#D55E00', counter2: '#F0E442',
      rods: ['#000000', '#E69F00', '#56B4E9', '#009E73', '#F0E442', '#0072B2', '#D55E00', '#CC79A7', '#999999', '#000000'],
      blocks: { ones: '#009E73', tens: '#0072B2', hundreds: '#CC79A7', thousands: '#D55E00' },
      geoboard: '#0072B2',
      tenFrame: '#E69F00'
    },
    high: {
      name: 'High contrast',
      counter1: '#000000', counter2: '#ffffff',
      rods: ['#000000', '#333333', '#555555', '#777777', '#999999', '#bbbbbb', '#888888', '#666666', '#444444', '#222222'],
      blocks: { ones: '#000000', tens: '#444444', hundreds: '#888888', thousands: '#bbbbbb' },
      geoboard: '#000000',
      tenFrame: '#333333'
    }
  };

  // ══════════════════════════════════════════════════════════════
  // ── REGISTER TOOL ──
  // ══════════════════════════════════════════════════════════════
  window.StemLab.registerTool('base10', {
    icon: '\uD83E\uDDEE', label: 'Math Manipulatives',
    desc: 'Base-10 blocks, abacus, slide rule & place value quiz.',
    color: 'orange', category: 'math',
    render: function(ctx) {
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      var React = ctx.React;
      var h = React.createElement;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var setStemLabTool = ctx.setStemLabTool;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;
      var announceToSR = ctx.announceToSR;
      var a11yClick = ctx.a11yClick;
      var celebrate = ctx.celebrate;
      var callGemini = ctx.callGemini || window.callGemini;

      // ── State ──
      var ld = ctx.toolData || {};
      var _m = ld._manipulatives || {};
      var upd = function(obj) {
        if (typeof ctx.setToolData === 'function') {
          ctx.setToolData(function(prev) {
            var mn = Object.assign({}, (prev && prev._manipulatives) || {}, obj);
            return Object.assign({}, prev, { _manipulatives: mn });
          });
        }
      };

      var manipMode = _m.mode || 'blocks';
      var score = _m.score || { correct: 0, total: 0 };
      var soundEnabled = _m.soundEnabled != null ? _m.soundEnabled : true;
      var earnedBadges = _m.earnedBadges || {};
      var showBadgesPanel = _m.showBadgesPanel || false;
      var streak = _m.streak || 0;
      var modesVisited = _m.modesVisited || {};
      var regroupCount = _m.regroupCount || 0;
      var blocksSolved = _m.blocksSolved || 0;
      var abacusSolved = _m.abacusSolved || 0;
      var slideSolved = _m.slideSolved || 0;
      var quizSolved = _m.quizSolved || 0;
      var aiInsight = _m.aiInsight || '';
      var aiLoading = _m.aiLoading || false;

      // ═══ BASE-10 BLOCKS STATE ═══
      var b10 = _m.b10 || { ones: 0, tens: 0, hundreds: 0, thousands: 0 };
      var b10Challenge = _m.b10Challenge || null;
      var b10Feedback = _m.b10Feedback || null;
      var regroupFlash = _m.regroupFlash || null;
      var totalValue = b10.ones + b10.tens * 10 + b10.hundreds * 100 + b10.thousands * 1000;
      var diffLevel = _m.diffLevel || 'any';
      var showExpanded = _m.showExpanded != null ? _m.showExpanded : true;
      var b10AddMode = _m.b10AddMode || false;
      var b10Addends = _m.b10Addends || null;

      // ═══ ABACUS STATE ═══
      var abacus = _m.abacus || { rods: [0, 0, 0, 0, 0] };
      var abacusChallenge = _m.abacusChallenge || null;
      var abacusFeedback = _m.abacusFeedback || null;
      var rods = abacus.rods || [0, 0, 0, 0, 0];
      var placeNames = ['Ones', 'Tens', 'Hundreds', 'Thousands', 'Ten-Thousands'];
      var placeMultipliers = [1, 10, 100, 1000, 10000];
      var abacusTotal = rods.reduce(function(sum, v, i) { return sum + v * placeMultipliers[i]; }, 0);
      var speedChallenge = _m.speedChallenge || null;
      var speedBest = _m.speedBest || null;
      var showCulture = _m.showCulture || false;

      // ═══ SLIDE RULE STATE ═══
      var sr = _m.slideRule || { cOffset: 0, cursorPos: 0.301 };
      var dVal = Math.pow(10, sr.cursorPos || 0.301);
      var cVal = Math.pow(10, (sr.cursorPos || 0.301) - (sr.cOffset || 0));
      var product = dVal * Math.pow(10, sr.cOffset || 0);
      var srProblem = _m.srProblem || null;
      var srFeedback = _m.srFeedback || null;

      // ═══ QUIZ STATE ═══
      var pvQuiz = _m.pvQuiz || null;
      var pvFeedback = _m.pvFeedback || null;

      // ═══ v3 STATE: NEW MANIPULATIVES ═══

      // Palette choice (shared accessibility setting)
      var paletteId = _m.paletteId || 'standard';
      var palette = MANIP_PALETTES[paletteId] || MANIP_PALETTES.standard;

      // Saved constructions: { name → { mode, snapshot, savedAt } }
      var savedConstructions = _m.savedConstructions || {};
      var showSaved = _m.showSaved || false;

      // CRA progression mode (1=concrete, 2=representational, 3=abstract)
      var craStage = _m.craStage || 1;

      // Ten frame: count of filled cells (0-10 for single, 0-20 for double)
      var tenFrameFilled = _m.tenFrameFilled != null ? _m.tenFrameFilled : 0;
      var tenFrameDouble = _m.tenFrameDouble || false;

      // Two-color counters: { red, yellow } counts. Net value = yellow - red.
      var counters = _m.counters || { red: 0, yellow: 0 };

      // Place-value disks: { ones, tens, hundreds, thousands } counts of disks
      var pvDisks = _m.pvDisks || { ones: 0, tens: 0, hundreds: 0, thousands: 0 };

      // Hundreds chart: highlighted cells + skip-count overlay
      var hundredsHighlight = _m.hundredsHighlight || {};
      var hundredsSkipCount = _m.hundredsSkipCount || null; // 2, 3, 5, 10, etc.

      // Pattern blocks: array of placed blocks {type, x, y, rotation}
      var patternBlocks = _m.patternBlocks || [];
      var pbCurrentShape = _m.pbCurrentShape || 'hex';

      // Geoboard: array of placed segments (rubber bands) {x1, y1, x2, y2}
      var geoboardSegments = _m.geoboardSegments || [];
      var geoboardSelected = _m.geoboardSelected || null;
      var geoboardSize = _m.geoboardSize || 5;

      // Cuisenaire rods: array of placed rods {length, x, y}
      var cRods = _m.cRods || [];

      // Number bonds: whole + parts (one with the missing part hidden)
      var nbWhole = _m.nbWhole != null ? _m.nbWhole : 10;
      var nbPart1 = _m.nbPart1 != null ? _m.nbPart1 : 6;
      var nbMode = _m.nbMode || 'explore'; // 'explore' | 'practice'

      // ═══ v3 CHALLENGE STATE (per-manipulative practice problems) ═══
      var tfChallenge = _m.tfChallenge || null;
      var tfFeedback = _m.tfFeedback || null;
      var counterChallenge = _m.counterChallenge || null;
      var counterFeedback = _m.counterFeedback || null;
      var pvdChallenge = _m.pvdChallenge || null;
      var pvdFeedback = _m.pvdFeedback || null;
      var hcChallenge = _m.hcChallenge || null;
      var hcFeedback = _m.hcFeedback || null;
      var pbChallenge = _m.pbChallenge || null;
      var pbFeedback = _m.pbFeedback || null;
      var gbChallenge = _m.gbChallenge || null;
      var gbFeedback = _m.gbFeedback || null;
      var crChallenge = _m.crChallenge || null;
      var crFeedback = _m.crFeedback || null;
      var cRodChallenge = _m.cRodChallenge || null;
      var cRodFeedback = _m.cRodFeedback || null;

      // CRA progression: target operation + step (1=concrete, 2=representational, 3=abstract)
      var craTarget = _m.craTarget || null;
      var craStep = _m.craStep || 1;
      var craFeedback = _m.craFeedback || null;

      // Standards browser filter
      var standardsFilter = _m.standardsFilter || 'all'; // 'all' | grade
      var standardsSearch = _m.standardsSearch || '';

      // Settings panel toggle
      var showSettings = _m.showSettings || false;
      var showHelp = _m.showHelp || false;
      var showTeacher = _m.showTeacher || false;

      // Library / saved name input
      var libraryName = _m.libraryName || '';

      // ═══ v3.1 NEW MANIPULATIVES ═══
      // NOTE: There used to be an embedded "Number Line" mode here. It's been
      // removed (v3.2) because a much richer standalone tool already exists at
      // stem_tool_numberline.js (4 tabs, drag-the-marker, fraction/decimal/percent
      // equivalence). Use that tool from the STEM Lab launcher for number-line work.

      // Fraction Bars: which denominators to display, highlighted parts per denom
      var fbDenoms = _m.fbDenoms || [1, 2, 3, 4, 6, 8, 12];
      var fbSelected = _m.fbSelected || {};   // { denom: [partIdx, partIdx, ...] }
      var fbChallenge = _m.fbChallenge || null;
      var fbFeedback = _m.fbFeedback || null;

      // Algebra Tiles: tile counts, two-color (positive / negative)
      var atTiles = _m.atTiles || { unit: 0, unitNeg: 0, x: 0, xNeg: 0, xSq: 0, xSqNeg: 0 };
      var atChallenge = _m.atChallenge || null;
      var atFeedback = _m.atFeedback || null;
      var nbAnswer = _m.nbAnswer || '';
      var nbFeedback = _m.nbFeedback || null;

      // ══════════════════════════════════════════════════════════════
      // ── Badge Checker ──
      // ══════════════════════════════════════════════════════════════
      var checkBadges = function(updates) {
        var newB = Object.assign({}, earnedBadges);
        var awarded = [];
        var chk = function(id, cond) { if (!newB[id] && cond) { newB[id] = Date.now(); awarded.push(id); } };
        var s = updates || {};
        chk('first_build', totalValue > 0 || (s.totalValue || 0) > 0);
        chk('regroup_5', (s.regroupCount || regroupCount) >= 5);
        chk('blocks_10', (s.blocksSolved || blocksSolved) >= 10);
        chk('abacus_5', (s.abacusSolved || abacusSolved) >= 5);
        chk('speed_10s', !!s.speedUnder10);
        chk('speed_5s', !!s.speedUnder5);
        chk('slide_5', (s.slideSolved || slideSolved) >= 5);
        chk('quiz_10', (s.quizSolved || quizSolved) >= 10);
        chk('streak_5', (s.streak || streak) >= 5);
        chk('streak_10', (s.streak || streak) >= 10);
        chk('all_modes', Object.keys(s.modesVisited || modesVisited).length >= 4);
        chk('thousand', totalValue >= 1000 || (s.totalValue || 0) >= 1000);
        chk('ai_tutor', !!s.aiUsed);
        chk('addition', !!s.additionDone);
        // ── v3.1: badges for v3 manipulatives ──
        chk('tenframe_full',  tenFrameFilled === 10 && !tenFrameDouble);
        chk('tenframe_double', tenFrameFilled === 20 && tenFrameDouble);
        chk('zero_pair',      (counters.red + counters.yellow) > 0 && counters.red === counters.yellow);
        chk('integer_master', (s.counterSolved || 0) >= 5);
        chk('pvd_regroup',    !!s.pvdRegroupDone);
        chk('hc_skipcount',   !!hundredsSkipCount);
        chk('hc_primes',      !!s.hcPrimesShown);
        chk('pb_hex_cover',   !!s.pbHexCovered);
        chk('gb_polygon',     geoboardSegments.length >= 5);
        chk('cr_train',       cRods.reduce(function(a, r) { return a + r.length; }, 0) >= 10 && cRods.length >= 2);
        chk('nb_practice5',   (s.nbSolved || 0) >= 5);
        chk('cra_complete',   !!s.craCompleted);
        chk('challenge_hub',  (s.hubSolved || 0) >= 10);
        chk('all_12_modes',   (function() {
          var v = s.modesVisited || modesVisited;
          var manips = ['blocks','abacus','slideRule','quiz','tenFrame','counters','pvDisks','hundredsChart','patternBlocks','geoboard','cRods','numberBonds'];
          return manips.every(function(m) { return v[m]; });
        })());
        if (awarded.length > 0) {
          upd({ earnedBadges: newB });
          awarded.forEach(function(bid) {
            var badge = badgeDefs.find(function(b) { return b.id === bid; });
            if (badge && addToast) addToast('\uD83C\uDFC5 ' + badge.icon + ' ' + badge.name + '!', 'success');
            if (awardXP) awardXP('base10_badge_' + bid, 5, 'Badge: ' + (badge ? badge.name : bid));
          });
          if (soundEnabled) sfxBadge();
          if (celebrate) celebrate();
        }
      };

      // ══════════════════════════════════════════════════════════════
      // ── Mode Switch ──
      // ══════════════════════════════════════════════════════════════
      var switchMode = function(mode) {
        var visited = Object.assign({}, modesVisited);
        visited[mode] = true;
        // Track previous non-meta mode so the Library can snapshot the right thing.
        var metaModes = { library: 1, teacher: 1, standards: 1, cra: 1 };
        var patch = { mode: mode, modesVisited: visited };
        if (!metaModes[mode] && manipMode !== mode) patch.lastMode = mode;
        else if (metaModes[mode] && !metaModes[manipMode]) patch.lastMode = manipMode;
        upd(patch);
        checkBadges({ modesVisited: visited });
      };

      // ══════════════════════════════════════════════════════════════
      // ── Regrouping ──
      // ══════════════════════════════════════════════════════════════
      var doRegroup = function(fromPlace, toPlace) {
        if (b10[fromPlace] < 10) return; // 10 of a place always regroup into 1 of the next — the old `toPlace >= 9` clause wrongly blocked this (dead end at e.g. ones=20, tens=9)
        var newB10 = Object.assign({}, b10);
        newB10[fromPlace] = b10[fromPlace] - 10;
        newB10[toPlace] = b10[toPlace] + 1;
        var newRC = regroupCount + 1;
        upd({ b10: newB10, regroupFlash: toPlace, regroupCount: newRC });
        setTimeout(function() { upd({ regroupFlash: null }); }, 700);
        if (soundEnabled) sfxRegroup();
        checkBadges({ regroupCount: newRC });
      };
      var doUngroup = function(fromPlace, toPlace) {
        if (b10[fromPlace] < 1) return;
        var newB10 = Object.assign({}, b10);
        newB10[fromPlace] = b10[fromPlace] - 1;
        newB10[toPlace] = b10[toPlace] + 10;
        var newRC = regroupCount + 1;
        upd({ b10: newB10, regroupFlash: toPlace, regroupCount: newRC });
        setTimeout(function() { upd({ regroupFlash: null }); }, 700);
        if (soundEnabled) sfxRegroup();
        checkBadges({ regroupCount: newRC });
      };

      // ══════════════════════════════════════════════════════════════
      // ── Challenge Generators ──
      // ══════════════════════════════════════════════════════════════
      var genBlockChallenge = function() {
        var target;
        if (diffLevel === 'ones') target = 1 + Math.floor(Math.random() * 9);
        else if (diffLevel === 'tens') target = 10 + Math.floor(Math.random() * 90);
        else if (diffLevel === 'hundreds') target = 100 + Math.floor(Math.random() * 900);
        else if (diffLevel === 'thousands') target = 1000 + Math.floor(Math.random() * 9000);
        else target = 10 + Math.floor(Math.random() * 9990);
        upd({ b10Challenge: { target: target, type: 'build' }, b10: { ones: 0, tens: 0, hundreds: 0, thousands: 0 }, b10Feedback: null, b10AddMode: false });
      };

      var genAdditionProblem = function() {
        var maxVal = diffLevel === 'ones' ? 9 : diffLevel === 'tens' ? 99 : diffLevel === 'hundreds' ? 999 : 4999;
        var a = 1 + Math.floor(Math.random() * maxVal);
        var b = 1 + Math.floor(Math.random() * Math.min(maxVal, 9999 - a));
        var sum = a + b;
        upd({
          b10AddMode: true,
          b10Addends: { a: a, b: b, sum: sum },
          b10Challenge: { target: sum, type: 'addition' },
          b10: { ones: 0, tens: 0, hundreds: 0, thousands: 0 },
          b10Feedback: null
        });
      };

      // ══════════════════════════════════════════════════════════════
      // ── Challenge Checks ──
      // ══════════════════════════════════════════════════════════════
      var checkBase10 = function() {
        if (!b10Challenge) return;
        var ok = totalValue === b10Challenge.target;
        if (announceToSR) announceToSR(ok ? 'Correct!' : 'Incorrect');
        var newStreak = ok ? streak + 1 : 0;
        var newBS = blocksSolved + (ok ? 1 : 0);
        var isAddition = b10Challenge.type === 'addition';
        upd({
          b10Feedback: ok
            ? { correct: true, msg: '\u2705 Correct! ' + b10Challenge.target.toLocaleString() + (b10.thousands > 0 ? ' = ' + b10.thousands + ' thousands + ' + b10.hundreds + ' hundreds + ' + b10.tens + ' tens + ' + b10.ones + ' ones' : '') }
            : { correct: false, msg: '\u274C Your blocks show ' + totalValue.toLocaleString() + ', target is ' + b10Challenge.target.toLocaleString() },
          score: { correct: score.correct + (ok ? 1 : 0), total: score.total + 1 },
          streak: newStreak,
          blocksSolved: newBS
        });
        if (ok) {
          if (awardXP) awardXP('base10', 5, 'base-10 blocks');
          if (soundEnabled) sfxCorrect();
          checkBadges({ streak: newStreak, blocksSolved: newBS, totalValue: totalValue, additionDone: isAddition || undefined });
        } else {
          if (soundEnabled) sfxWrong();
          upd({ streak: 0 });
        }
      };

      var checkAbacus = function() {
        if (!abacusChallenge) return;
        var ok = abacusTotal === abacusChallenge.target;
        var newStreak = ok ? streak + 1 : 0;
        var newAS = abacusSolved + (ok ? 1 : 0);
        upd({
          abacusFeedback: ok
            ? { correct: true, msg: '\u2705 Correct! ' + abacusChallenge.target.toLocaleString() }
            : { correct: false, msg: '\u274C Shows ' + abacusTotal.toLocaleString() + ', target is ' + abacusChallenge.target.toLocaleString() },
          score: { correct: score.correct + (ok ? 1 : 0), total: score.total + 1 },
          streak: newStreak,
          abacusSolved: newAS
        });
        if (ok) {
          if (awardXP) awardXP('base10', 5, 'abacus');
          if (soundEnabled) sfxCorrect();
          checkBadges({ streak: newStreak, abacusSolved: newAS });
        } else {
          if (soundEnabled) sfxWrong();
          upd({ streak: 0 });
        }
      };

      var checkSpeed = function() {
        if (!speedChallenge) return;
        if (abacusTotal !== speedChallenge.target) {
          if (addToast) addToast('\u274C Shows ' + abacusTotal.toLocaleString() + ', need ' + speedChallenge.target.toLocaleString(), 'error');
          if (soundEnabled) sfxWrong();
          return;
        }
        var elapsed = ((Date.now() - speedChallenge.startTime) / 1000);
        var best = speedBest ? Math.min(elapsed, speedBest) : elapsed;
        var isNewBest = !speedBest || elapsed < speedBest;
        upd({ speedBest: best, speedChallenge: null, score: { correct: score.correct + 1, total: score.total + 1 } });
        if (addToast) addToast('\u23F1\uFE0F ' + elapsed.toFixed(1) + 's!' + (isNewBest ? ' \uD83C\uDFC6 New best!' : ' Best: ' + best.toFixed(1) + 's'), 'success');
        if (soundEnabled) sfxCorrect();
        if (awardXP) awardXP('base10', 8, 'speed challenge');
        checkBadges({ speedUnder10: elapsed < 10, speedUnder5: elapsed < 5 });
      };

      var checkSR = function() {
        if (!srProblem) return;
        var tolerance = srProblem.answer * 0.15;
        var ok = Math.abs(product - srProblem.answer) <= tolerance;
        var newStreak = ok ? streak + 1 : 0;
        var newSS = slideSolved + (ok ? 1 : 0);
        upd({
          srFeedback: ok
            ? { correct: true, msg: '\u2705 Close enough! ' + srProblem.a + ' \u00D7 ' + srProblem.b + ' = ' + srProblem.answer + ' (you got \u2248' + product.toFixed(1) + ')' }
            : { correct: false, msg: '\u274C Need \u2248' + srProblem.answer + ', your slide rule reads \u2248' + product.toFixed(1) },
          score: { correct: score.correct + (ok ? 1 : 0), total: score.total + 1 },
          streak: newStreak,
          slideSolved: newSS
        });
        if (ok) {
          if (awardXP) awardXP('base10', 5, 'slide rule');
          if (soundEnabled) sfxCorrect();
          checkBadges({ streak: newStreak, slideSolved: newSS });
        } else {
          if (soundEnabled) sfxWrong();
          upd({ streak: 0 });
        }
      };

      var answerPVQuiz = function(opt) {
        if (!pvQuiz || pvFeedback) return;
        var ok = opt === pvQuiz.answer;
        var newStreak = ok ? streak + 1 : 0;
        var newQS = quizSolved + (ok ? 1 : 0);
        upd({
          pvFeedback: ok ? { correct: true, msg: '\u2705 Correct!' } : { correct: false, msg: '\u274C Answer: ' + pvQuiz.answer },
          score: { correct: score.correct + (ok ? 1 : 0), total: score.total + 1 },
          streak: newStreak,
          quizSolved: newQS
        });
        if (ok) {
          if (awardXP) awardXP('base10', 5, 'place value quiz');
          if (soundEnabled) sfxCorrect();
          checkBadges({ streak: newStreak, quizSolved: newQS });
        } else {
          if (soundEnabled) sfxWrong();
          upd({ streak: 0 });
        }
      };

      // ── AI Tutor ──
      // v3.1: context-aware across all 12 manipulatives + meta modes.
      var askAI = function() {
        if (!callGemini || aiLoading) return;
        upd({ aiLoading: true });
        var pvdT = pvDisks.ones + pvDisks.tens * 10 + pvDisks.hundreds * 100 + pvDisks.thousands * 1000;
        var ctNet = counters.yellow - counters.red;
        var rodSum = cRods.reduce(function(a, r) { return a + r.length; }, 0);
        var hcCount = Object.keys(hundredsHighlight).length;
        var context;
        if (manipMode === 'blocks')             context = 'Base-10 blocks showing ' + totalValue.toLocaleString() + '. ' + (b10Challenge ? 'Challenge: build ' + b10Challenge.target.toLocaleString() : 'Free play.');
        else if (manipMode === 'abacus')        context = 'Abacus showing ' + abacusTotal.toLocaleString() + '.';
        else if (manipMode === 'slideRule')     context = 'Slide rule: C=' + cVal.toFixed(2) + ', D=' + dVal.toFixed(2) + ', product\u2248' + product.toFixed(2);
        else if (manipMode === 'quiz')          context = 'Place value quiz mode.' + (pvQuiz ? ' Current question: ' + pvQuiz.q : '');
        else if (manipMode === 'tenFrame')      context = 'Ten Frame with ' + tenFrameFilled + ' of ' + (tenFrameDouble ? 20 : 10) + ' cells filled.' + (tfChallenge ? ' Challenge: ' + tfChallenge.q : ' Free play.');
        else if (manipMode === 'counters')      context = 'Two-color counters: ' + counters.yellow + ' yellow (+1 each) and ' + counters.red + ' red (-1 each). Net = ' + ctNet + '.' + (counterChallenge ? ' Challenge: ' + counterChallenge.q : '');
        else if (manipMode === 'pvDisks')       context = 'Place-value disks totaling ' + pvdT.toLocaleString() + '.' + (pvdChallenge ? ' Challenge: ' + pvdChallenge.q : ' Free play.');
        else if (manipMode === 'hundredsChart') context = 'Hundreds chart with ' + hcCount + ' cells highlighted.' + (hundredsSkipCount ? ' Skip-count overlay on multiples of ' + hundredsSkipCount + '.' : '') + (hcChallenge ? ' Challenge: ' + hcChallenge.q : '');
        else if (manipMode === 'patternBlocks') context = 'Pattern blocks workspace with ' + patternBlocks.length + ' shapes placed.' + (pbChallenge ? ' Challenge: ' + pbChallenge.q : '');
        else if (manipMode === 'geoboard')      context = 'Geoboard ' + geoboardSize + 'x' + geoboardSize + ' with ' + geoboardSegments.length + ' segments drawn.' + (gbChallenge ? ' Challenge: ' + gbChallenge.q : '');
        else if (manipMode === 'cRods')         context = 'Cuisenaire rods workspace: ' + cRods.length + ' rods, total length ' + rodSum + '.' + (cRodChallenge ? ' Challenge: ' + cRodChallenge.q : '');
        else if (manipMode === 'numberBonds')   context = 'Number bond: whole = ' + nbWhole + ', part 1 = ' + nbPart1 + ', part 2 = ' + (nbWhole - nbPart1) + '. Sub-mode: ' + nbMode + '.';
        else if (manipMode === 'cra')           context = 'CRA Progression. ' + (craTarget ? 'Working on ' + craTarget.a + ' ' + craTarget.op + ' ' + craTarget.b + ' at step ' + craStep + ' of 3 (' + ['concrete', 'representational', 'abstract'][craStep - 1] + ').' : 'No problem selected yet.');
        else if (manipMode === 'challenges')    context = 'Challenge Hub.' + (crChallenge ? ' Working on: ' + crChallenge.q : ' No problem picked yet.');
        else context = 'Browsing the ' + manipMode + ' section.';
        var prompt = 'You are a fun math tutor for kids ages 8-14 in a math manipulatives tool. Mode: ' + manipMode + '. ' + context + ' Score: ' + score.correct + '/' + score.total + '. Streak: ' + streak + '. Give 2-3 SHORT tips or fun facts directly tied to what they are doing right now. Use emoji. Return JSON: {"tips":["...","..."],"funFact":"..."}';
        callGemini(prompt, true, false, 0.8).then(function(resp) {
          try {
            var parsed = typeof resp === 'string' ? JSON.parse(resp.replace(/```json\s*/g,'').replace(/```/g,'').trim()) : resp;
            var text = '';
            if (parsed.tips) parsed.tips.forEach(function(t, i) { text += (i > 0 ? '\n' : '') + t; });
            if (parsed.funFact) text += '\n\n\uD83D\uDCA1 ' + parsed.funFact;
            upd({ aiInsight: text, aiLoading: false });
          } catch(e) { upd({ aiInsight: typeof resp === 'string' ? resp : 'Keep practicing!', aiLoading: false }); }
        }).catch(function() { upd({ aiInsight: '\u26A0\uFE0F Could not reach AI.', aiLoading: false }); });
        checkBadges({ aiUsed: true });
      };

      // ══════════════════════════════════════════════════════════════
      // ── Base-10 Block Renderer ──
      // ──────────────────────────────────────────────────────────────
      // FIX (v3.1): previously the grid backgroundImage *replaced* the
      // colored gradient, so all blocks rendered as faint grid-on-transparent
      // — they looked beige. Now: solid colored backgroundColor + grid as
      // backgroundImage layered on top, with a strong slate border for
      // category contrast.
      // ══════════════════════════════════════════════════════════════
      var renderBlock3D = function(color, lightColor, w, ht, count, gridCols, gridRows) {
        var hasGrid = gridCols > 1 || gridRows > 1;
        return Array.from({ length: count }).map(function(_, i) {
          return h('div', {
            key: i,
            style: {
              width: w + 'px', height: ht + 'px',
              backgroundColor: color,
              backgroundImage: hasGrid
                ? 'repeating-linear-gradient(90deg, transparent, transparent ' + (100/gridCols) + '%, rgba(255,255,255,0.55) ' + (100/gridCols) + '%, rgba(255,255,255,0.55) calc(' + (100/gridCols) + '% + 1.2px)), repeating-linear-gradient(0deg, transparent, transparent ' + (100/gridRows) + '%, rgba(255,255,255,0.55) ' + (100/gridRows) + '%, rgba(255,255,255,0.55) calc(' + (100/gridRows) + '% + 1.2px))'
                : 'none',
              border: '1.5px solid #0f172a',
              borderRadius: '3px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.18)',
              transition: 'transform 0.15s ease', flexShrink: 0
            }
          });
        });
      };

      // ── Abacus Rod Setter ──
      var setRod = function(idx, val) {
        var nr = rods.slice();
        nr[idx] = Math.max(0, Math.min(9, val));
        upd({ abacus: { rods: nr } });
        if (soundEnabled) sfxBead();
      };

      // ── Place Value Column ──
      var placeCol = function(label, symbol, place, color, lightColor, bw, bh, gridC, gridR) {
        return h('div', { 
          className: 'bg-white rounded-xl p-3 border-2 text-center shadow-sm',
          style: Object.assign({ borderColor: lightColor }, regroupFlash === place ? { animation: 'b10regroup 0.7s ease' } : {})
        },
          h('div', { className: 'text-xs font-bold uppercase mb-1', style: { color: color } }, symbol + ' ' + label),
          h('div', { className: 'flex justify-center gap-1 mb-2 min-h-[58px] flex-wrap items-center' }, renderBlock3D(color, lightColor, bw, bh, b10[place], gridC, gridR)),
          h('div', { className: 'flex items-center justify-center gap-2' },
            h('button', { 'aria-label': __alloT('stem.manipulatives.remove_one_place', 'Remove one ') + place,
              onClick: function() { var n = Object.assign({}, b10); n[place] = Math.max(0, n[place] - 1); upd({ b10: n }); if (soundEnabled) sfxClick(); },
              className: 'w-8 h-8 rounded-full font-bold text-lg hover:opacity-80 transition-all flex items-center justify-center',
              style: { background: lightColor + '33', color: color }
            }, '\u2212'),
            h('span', { className: 'text-2xl font-bold w-8 text-center', style: { color: color } }, b10[place]),
            h('button', { 'aria-label': 'Add',
              onClick: function() {
                var n = Object.assign({}, b10); n[place] = Math.min(20, n[place] + 1); upd({ b10: n }); if (soundEnabled) sfxClick();
                if (n[place] + n.tens * 10 + n.hundreds * 100 + n.thousands * 1000 + (place === 'ones' ? n[place] : b10.ones) >= 0) checkBadges({ totalValue: n.ones + n.tens * 10 + n.hundreds * 100 + n.thousands * 1000 });
              },
              className: 'w-8 h-8 rounded-full font-bold text-lg hover:opacity-80 transition-all flex items-center justify-center',
              style: { background: lightColor + '33', color: color }
            }, '+')
          ),
          h('div', { className: 'text-xs mt-1', style: { color: color } }, '\u00D7' + { thousands: 1000, hundreds: 100, tens: 10, ones: 1 }[place] + ' = ' + b10[place] * { thousands: 1000, hundreds: 100, tens: 10, ones: 1 }[place])
        );
      };

      // ── Regroup Button ──
      var regroupBtn = function(label, from, to, enabled, colorFrom, colorTo) {
        return h('button', { onClick: function() { if (label.indexOf('\u2192') > 0 && label.indexOf('10') === 0) doRegroup(from, to); else doUngroup(from, to); },
          disabled: !enabled,
          className: 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all ' + (enabled ? 'text-white shadow hover:shadow-md hover:scale-105' : 'bg-slate-100 text-slate-600 cursor-not-allowed'),
          style: enabled ? { background: 'linear-gradient(90deg, ' + colorFrom + ', ' + colorTo + ')' } : {}
        }, label);
      };

      // ── Expanded Form ──
      var expandedForm = function(val) {
        if (val === 0) return '0';
        var parts = [];
        var th = Math.floor(val / 1000); if (th > 0) parts.push(th + ' \u00D7 1,000');
        var hu = Math.floor((val % 1000) / 100); if (hu > 0) parts.push(hu + ' \u00D7 100');
        var te = Math.floor((val % 100) / 10); if (te > 0) parts.push(te + ' \u00D7 10');
        var on = val % 10; if (on > 0) parts.push(on + ' \u00D7 1');
        return parts.join(' + ');
      };

      // ── Number Words ──
      var numberWords = function(val) {
        if (val === 0) return 'zero';
        var ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
        var tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
        var parts = [];
        if (val >= 1000) { parts.push(ones[Math.floor(val / 1000)] + ' thousand'); val %= 1000; }
        if (val >= 100) { parts.push(ones[Math.floor(val / 100)] + ' hundred'); val %= 100; }
        if (val >= 20) { parts.push(tens[Math.floor(val / 10)] + (val % 10 > 0 ? '-' + ones[val % 10] : '')); }
        else if (val > 0) { parts.push(ones[val]); }
        return parts.join(' ');
      };

      // ══════════════════════════════════════════════════════════════
      // ── HEADER ──
      // ══════════════════════════════════════════════════════════════
      var manipModeLabel = {
        blocks: 'Base-10 blocks', abacus: 'Abacus', slideRule: 'Slide rule', quiz: 'Place-value quiz',
        tenFrame: 'Ten frames', counters: 'Counters', pvDisks: 'Place-value disks', hundredsChart: 'Hundreds chart',
        patternBlocks: 'Pattern blocks', geoboard: 'Geoboard', cRods: 'Cuisenaire rods', numberBonds: 'Number bonds',
        fracBars: 'Fraction bars', algebraTiles: 'Algebra tiles', cra: 'CRA progression', challenges: 'Challenge hub'
      }[manipMode] || 'Math resources';
      var manipDisplayValue = manipMode === 'blocks' ? totalValue : (manipMode === 'abacus' ? abacusTotal : score.correct);
      var manipNext = manipMode === 'blocks' && totalValue === 0
        ? 'Build a number with blocks, then name the value of each place.'
        : manipMode === 'blocks'
          ? 'Regroup ten blocks into one block of the next place and explain why the value stays equal.'
          : manipMode === 'abacus'
            ? 'Set one number, read each rod by place value, then change one bead.'
            : 'Use the representation first, then connect it to numbers or an equation.';

      var headerEl = h('div', { className: 'space-y-3 mb-4' },
        h('section', { 'data-manipulatives-command': 'true', className: 'overflow-hidden rounded-2xl border border-orange-300/40 bg-gradient-to-br from-slate-950 via-orange-950 to-amber-950 text-white shadow-xl' },
          h('div', { className: 'p-4 sm:p-5' },
            h('div', { className: 'flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between' },
              h('div', { className: 'min-w-0' },
                h('div', { className: 'flex items-center gap-2' },
                  h('button', { onClick: function() { setStemLabTool(null); }, className: 'shrink-0 rounded-lg border border-white/20 bg-white/10 p-2 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-orange-300', 'aria-label': __alloT('stem.manipulatives.back', 'Back to tools') }, h(ArrowLeft, { size: 18 })),
                  h('span', { className: 'rounded-full bg-orange-300/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-orange-100 ring-1 ring-orange-200/30' }, 'Representation studio')
                ),
                h('h3', { className: 'mt-3 text-xl font-black tracking-tight sm:text-2xl' }, __alloT('stem.manipulatives.math_manipulatives', '\uD83E\uDDEE Math Manipulatives')),
                h('p', { className: 'mt-1 max-w-2xl text-sm leading-6 text-orange-100' }, 'Make number relationships visible, then connect concrete models to pictures and equations.'),
                h('div', { className: 'mt-3 rounded-xl border border-white/15 bg-white/10 p-3' },
                  h('p', { className: 'text-[10px] font-black uppercase tracking-[0.16em] text-orange-200' }, 'Recommended next move'),
                  h('p', { className: 'mt-1 text-sm font-semibold text-white' }, manipNext)
                )
              ),
              h('div', { className: 'grid grid-cols-3 gap-2 lg:w-[22rem]' },
                [
                  { label: 'Model', value: manipModeLabel },
                  { label: 'Value', value: String(manipDisplayValue) },
                  { label: 'Solved', value: String(score.correct) }
                ].map(function(metric) {
                  return h('div', { key: metric.label, className: 'min-w-0 rounded-xl border border-white/15 bg-white/10 px-2 py-3 text-center' },
                    h('div', { className: 'truncate text-sm font-black text-white', title: metric.value }, metric.value),
                    h('div', { className: 'mt-1 text-[10px] font-bold uppercase tracking-wider text-orange-200' }, metric.label)
                  );
                })
              )
            ),
            h('ol', { className: 'mt-4 grid gap-2 text-xs sm:grid-cols-3', 'aria-label': 'Manipulative reasoning pathway' },
              [
                { n: '1', title: 'Build', detail: 'Represent the quantity.' },
                { n: '2', title: 'Regroup', detail: 'Trade or reorganize equal values.' },
                { n: '3', title: 'Explain', detail: 'Connect the model to symbols.' }
              ].map(function(step) {
                return h('li', { key: step.n, className: 'flex items-center gap-2 rounded-xl border border-white/10 bg-black/10 p-2.5' },
                  h('span', { className: 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-300 font-black text-slate-950' }, step.n),
                  h('span', null, h('strong', { className: 'block text-white' }, step.title), h('span', { className: 'text-orange-200' }, step.detail))
                );
              })
            )
          )
        ),
        h('div', { className: 'flex flex-wrap items-center justify-end gap-2' },
          streak >= 3 && h('span', { className: 'text-xs font-bold text-orange-500' }, '\uD83D\uDD25 ' + streak),
          h('div', { className: 'flex gap-1.5' },
            h('span', { className: 'text-xs font-bold text-emerald-600 self-center' }, score.correct + '/' + score.total),
            h('button', { 'aria-label': __alloT('stem.manipulatives.badges', 'Badges'), onClick: function() { upd({ showBadgesPanel: !showBadgesPanel }); }, className: 'text-[11px] font-bold px-2 py-0.5 rounded-full border transition-all ' + (showBadgesPanel ? 'bg-amber-100 border-amber-600 text-amber-700' : 'bg-slate-100 border-slate-200 text-slate-600') }, '\uD83C\uDFC5 ' + Object.keys(earnedBadges).length + '/' + badgeDefs.length),
            h('button', { onClick: function() { upd({ soundEnabled: !soundEnabled }); }, 'aria-label': soundEnabled ? 'Mute sound' : 'Enable sound', className: 'text-sm px-1' }, soundEnabled ? '\uD83D\uDD0A' : '\uD83D\uDD07'),
            callGemini && h('button', { 'aria-label': aiLoading ? 'AI Tutor thinking' : 'Ask AI Tutor', 'aria-busy': aiLoading, onClick: askAI, disabled: aiLoading, className: 'text-[11px] font-bold px-2 py-0.5 rounded-full border transition-all ' + (aiLoading ? 'bg-pink-100 border-pink-600 text-pink-400' : 'bg-pink-50 border-pink-600 text-pink-600 hover:bg-pink-100') }, aiLoading ? '\u23F3' : '\uD83E\uDD16 Tutor')
          )
        ),

        // Badges panel
        showBadgesPanel && h('div', { className: 'bg-amber-50 rounded-xl p-3 border border-amber-200' },
          h('div', { className: 'text-xs font-bold text-amber-700 uppercase mb-2' }, __alloT('stem.manipulatives.badges_2', '\uD83C\uDFC5 Badges')),
          h('div', { className: 'grid grid-cols-3 sm:grid-cols-4 gap-2' },
            badgeDefs.map(function(badge) {
              var earned = !!earnedBadges[badge.id];
              return h('div', { key: badge.id, className: 'flex items-center gap-2 p-1.5 rounded-lg ' + (earned ? 'bg-amber-100 border border-amber-300' : 'bg-white border border-slate-400 opacity-40') },
                h('span', { className: 'text-base', style: earned ? {} : { filter: 'grayscale(1)' } }, badge.icon),
                h('div', null,
                  h('div', { className: 'text-[11px] font-bold ' + (earned ? 'text-amber-800' : 'text-slate-600') }, badge.name),
                  h('div', { className: 'text-[11px] ' + (earned ? 'text-amber-600' : 'text-slate-600') }, __alloT('stem.manipulatives.' + (badge.id) + '_desc', badge.desc))
                )
              );
            })
          )
        ),

        // AI insight
        aiInsight && h('div', { className: 'bg-pink-50 rounded-lg p-3 border border-pink-200 text-xs text-slate-700 whitespace-pre-line' },
          h('span', { className: 'font-bold text-pink-600' }, __alloT('stem.manipulatives.ai_tutor', '\uD83E\uDD16 AI Tutor: ')),
          aiInsight
        ),

        // v3: Mode tabs (12 modes \u2014 wraps to multiple lines on small screens).
        // Organized into 2 rows: classic manipulatives first, then v3 additions.
        h('div', { className: 'flex gap-1 overflow-x-auto bg-slate-100 rounded-xl p-1' },
          [{ id: 'blocks',        icon: '\uD83E\uDDF1', label: __alloT('stem.manipulatives.base_10_blocks', 'Base-10 Blocks') },
           { id: 'abacus',        icon: '\uD83E\uDDEE', label: __alloT('stem.manipulatives.abacus', 'Abacus') },
           { id: 'slideRule',     icon: '\uD83D\uDCCF', label: __alloT('stem.manipulatives.slide_rule', 'Slide Rule') },
           { id: 'quiz',          icon: '\uD83E\uDDE0', label: __alloT('stem.manipulatives.quiz', 'Quiz') },
           { id: 'tenFrame',      icon: '\uD83D\uDD1F', label: __alloT('stem.manipulatives.ten_frames', 'Ten Frames') },
           { id: 'counters',      icon: '\uD83D\uDD34', label: __alloT('stem.manipulatives.counters', 'Counters') },
           { id: 'pvDisks',       icon: '\uD83D\uDCBF', label: __alloT('stem.manipulatives.place_value_disks', 'Place-Value Disks') },
           { id: 'hundredsChart', icon: '\uD83D\uDCAF', label: __alloT('stem.manipulatives.hundreds_chart', 'Hundreds Chart') },
           { id: 'patternBlocks', icon: '\u2B22',       label: __alloT('stem.manipulatives.pattern_blocks', 'Pattern Blocks') },
           { id: 'geoboard',      icon: '\u2B1C', label: __alloT('stem.manipulatives.geoboard', 'Geoboard') },
           { id: 'cRods',         icon: '\uD83D\uDFE7', label: __alloT('stem.manipulatives.cuisenaire', 'Cuisenaire') },
           { id: 'numberBonds',   icon: '\uD83D\uDD17', label: __alloT('stem.manipulatives.number_bonds', 'Number Bonds') },
           { id: 'fracBars',      icon: '\u25AD',  label: __alloT('stem.manipulatives.fraction_bars', 'Fraction Bars') },
           { id: 'algebraTiles',  icon: '\uD83D\uDD32', label: __alloT('stem.manipulatives.algebra_tiles', 'Algebra Tiles') },
           { id: 'cra',           icon: '\uD83D\uDD04', label: __alloT('stem.manipulatives.cra_progression', 'CRA Progression') },
           { id: 'challenges',    icon: '\uD83C\uDFC6', label: __alloT('stem.manipulatives.challenge_hub', 'Challenge Hub') },
           { id: 'puzzles',       icon: '\uD83E\uDDE9', label: __alloT('stem.manipulatives.brain_teasers', 'Brain Teasers') },
           { id: 'history',       icon: '\uD83C\uDFDB', label: __alloT('stem.manipulatives.history', 'History') },
           { id: 'curriculum',    icon: '\uD83D\uDDFA', label: __alloT('stem.manipulatives.curriculum_map', 'Curriculum Map') },
           { id: 'activities',    icon: '\uD83C\uDCCF', label: __alloT('stem.manipulatives.activity_cards', 'Activity Cards') },
           { id: 'help',          icon: '\u2753', label: __alloT('stem.manipulatives.help_faq', 'Help & FAQ') },
           { id: 'glossary',      icon: '\uD83D\uDCD6', label: __alloT('stem.manipulatives.glossary', 'Glossary') },
           { id: 'standards',     icon: '\uD83D\uDCDC', label: __alloT('stem.manipulatives.standards', 'Standards') },
           { id: 'library',       icon: '\uD83D\uDCDA', label: __alloT('stem.manipulatives.library', 'Library') },
           { id: 'teacher',       icon: '\uD83D\uDC69\u200D\uD83C\uDFEB', label: __alloT('stem.manipulatives.teacher', 'Teacher') },
           { id: 'inquiry',       icon: '\uD83D\uDD2C', label: __alloT('stem.manipulatives.math_inquiry', 'Math Inquiry') }
          ].map(function(m) {
            return h('button', { 'aria-label': 'Switch to ' + m.label + ' mode',
              key: m.id, onClick: function() { switchMode(m.id); },
              className: 'min-h-[2.5rem] py-2 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-orange-400 ' +
                (manipMode === m.id ? 'bg-white text-orange-800 shadow-sm' : 'text-slate-600 hover:text-slate-700 hover:bg-slate-50')
            }, m.icon + ' ' + m.label);
          })
        ),

        // ── Topic-accent hero band per mode ──
        (function() {
          var MODE_META = {
            blocks:    { accent: '#a855f7', soft: 'rgba(168,85,247,0.10)', icon: '\uD83E\uDDF1', title: __alloT('stem.manipulatives.base_10_blocks_ones_tens_hundreds_thou', 'Base-10 Blocks \u2014 ones, tens, hundreds, thousands'),  hint: __alloT('stem.manipulatives.the_whole_point_of_place_value_made_ta', 'The whole point of place value made TANGIBLE. 10 ones = 1 ten; 10 tens = 1 hundred; 10 hundreds = 1 thousand. Regrouping (carrying / borrowing) becomes obvious when you have to physically swap blocks.') },
            abacus:    { accent: '#dc2626', soft: 'rgba(220,38,38,0.10)',  icon: '\uD83E\uDDEE', title: __alloT('stem.manipulatives.abacus_4_500_years_of_mental_arithmeti', 'Abacus \u2014 4,500 years of mental arithmetic'),         hint: __alloT('stem.manipulatives.soroban_japanese_and_suanpan_chinese_a', 'Soroban (Japanese) and Suanpan (Chinese) are still taught \u2014 advanced users beat calculators on speed for many problems. Each rod is a place value; bead-state IS the number. Concrete \u2192 mental in months.') },
            slideRule: { accent: '#0891b2', soft: 'rgba(8,145,178,0.10)',  icon: '\uD83D\uDCCF', title: __alloT('stem.manipulatives.slide_rule_logarithms_in_your_hand', 'Slide Rule \u2014 logarithms in your hand'),              hint: __alloT('stem.manipulatives.how_engineers_multiplied_before_electr', 'How engineers multiplied before electronic calculators: align logarithmic scales, read the answer. Apollo 11 (1969) did orbital math with slide rules. Replaced en masse only after the HP-35 dropped in 1972.') },
            quiz:      { accent: '#d97706', soft: 'rgba(217,119,6,0.10)',  icon: '\uD83E\uDDE0', title: __alloT('stem.manipulatives.quiz_graded_place_value_arithmetic', 'Quiz \u2014 graded place-value + arithmetic'),           hint: __alloT('stem.manipulatives.ccss_1_nbt_2_nbt_3_nbt_4_nbt_progressi', 'CCSS 1.NBT, 2.NBT, 3.NBT, 4.NBT progression. Mixed concrete-pictorial-abstract sequencing (CPA, Bruner 1966) is the spine of every well-designed elementary math curriculum.') },
            tenFrame:      { accent: '#f97316', soft: 'rgba(249,115,22,0.10)', icon: '\uD83D\uDD1F', title: __alloT('stem.manipulatives.ten_frames_the_k_2_number_sense_workho', 'Ten Frames \u2014 the K-2 number-sense workhorse'), hint: __alloT('stem.manipulatives.a_5_by_2_grid_fill_cells_to_show_a_num', 'A 5-by-2 grid. Fill cells to show a number. Subitizing (instant recognition without counting) develops here. CCSS K.OA.A.4: the "what makes 10?" question is the gateway to all later arithmetic fluency.') },
            counters:      { accent: '#dc2626', soft: 'rgba(220,38,38,0.10)', icon: '\uD83D\uDD34', title: __alloT('stem.manipulatives.two_color_counters_integers_concrete', 'Two-Color Counters \u2014 integers concrete'),     hint: __alloT('stem.manipulatives.yellow_1_red_1_a_yellow_red_pair_0_a_z', 'Yellow = +1; red = -1. A yellow + red pair = 0 (a "zero pair"). The most concrete model for understanding negative numbers and integer arithmetic. CCSS 6.NS.C.5, 7.NS.A.1.') },
            pvDisks:       { accent: '#0891b2', soft: 'rgba(8,145,178,0.10)', icon: '\uD83D\uDCBF', title: __alloT('stem.manipulatives.place_value_disks_bridge_to_algorithm', 'Place-Value Disks \u2014 bridge to algorithm'),     hint: __alloT('stem.manipulatives.each_disk_labeled_with_its_value_1_10_', 'Each disk labeled with its value (1, 10, 100, 1000). Move 10 disks of one kind to trade for 1 of the next. The conceptual bridge from physical blocks to the standard algorithm. CCSS 4.NBT.B.4.') },
            hundredsChart: { accent: '#16a34a', soft: 'rgba(22,163,74,0.10)',  icon: '\uD83D\uDCAF', title: __alloT('stem.manipulatives.hundreds_chart_count_pattern_and_skip', 'Hundreds Chart \u2014 count, pattern, and skip'),  hint: __alloT('stem.manipulatives.a_10x10_grid_of_1_100_click_to_highlig', 'A 10x10 grid of 1-100. Click to highlight cells. Skip-count overlays reveal multiplication patterns. CCSS 2.NBT.A.2: skip-counting by 5s, 10s, 100s.') },
            patternBlocks: { accent: '#7c3aed', soft: 'rgba(124,58,237,0.10)', icon: '\u2B22',       title: __alloT('stem.manipulatives.pattern_blocks_fractions_symmetry', 'Pattern Blocks \u2014 fractions + symmetry'), hint: __alloT('stem.manipulatives.hexagon_trapezoid_rhombus_triangle_squ', 'Hexagon, trapezoid, rhombus, triangle, square, narrow rhombus. 6 trapezoids = 1 hexagon (so 1 trapezoid = 1/2 hex). 3 rhombi = 1 hex (so 1 rhombus = 1/3). 6 triangles = 1 hex (so 1 triangle = 1/6).') },
            geoboard:      { accent: '#0ea5e9', soft: 'rgba(14,165,233,0.10)', icon: '\u2B1C', title: __alloT('stem.manipulatives.geoboard_polygons_on_a_peg_grid', 'Geoboard \u2014 polygons on a peg grid'),         hint: __alloT('stem.manipulatives.connect_pegs_with_rubber_bands_to_make', 'Connect pegs with "rubber bands" to make polygons. Measure perimeter and area. The classic concrete tool for plane geometry and Pick\'s theorem.') },
            cRods:         { accent: '#d97706', soft: 'rgba(217,119,6,0.10)',  icon: '\uD83D\uDFE7', title: __alloT('stem.manipulatives.cuisenaire_rods_numbers_in_color', 'Cuisenaire Rods \u2014 numbers in color'),         hint: __alloT('stem.manipulatives.belgian_teacher_georges_cuisenaire_195', 'Belgian teacher Georges Cuisenaire (1952): 10 rods, lengths 1-10, each a different color. Add rods to make new numbers. White=1, red=2, light green=3, purple=4, yellow=5, dark green=6, black=7, brown=8, blue=9, orange=10.') },
            numberBonds:   { accent: '#be185d', soft: 'rgba(190,24,93,0.10)',  icon: '\uD83D\uDD17', title: __alloT('stem.manipulatives.number_bonds_part_part_whole', 'Number Bonds \u2014 part-part-whole'),             hint: __alloT('stem.manipulatives.the_whole_splits_into_two_parts_singap', 'The whole splits into two parts. Singapore Math made this central. CCSS K.OA.A.3: decompose 10 into pairs. This builds toward all addition and subtraction.') },
            fracBars:      { accent: '#ea580c', soft: 'rgba(234,88,12,0.10)',  icon: '\u25AD',  title: __alloT('stem.manipulatives.fraction_bars_compare_and_add_fraction', 'Fraction Bars \u2014 compare and add fractions'),           hint: __alloT('stem.manipulatives.equal_length_bars_partitioned_into_hal', 'Equal-length bars partitioned into halves, thirds, fourths, sixths, eighths, twelfths. Stack to compare. Find equivalents visually. The cleanest single tool for fraction equivalence (3.NF, 4.NF).') },
            algebraTiles:  { accent: '#1e40af', soft: 'rgba(30,64,175,0.10)',  icon: '\uD83D\uDD32', title: __alloT('stem.manipulatives.algebra_tiles_model_expressions_and_eq', 'Algebra Tiles \u2014 model expressions and equations'),     hint: __alloT('stem.manipulatives.a_tile_for_1_unit_x_variable_x_square_', 'A tile for 1 (unit), x (variable), x\u00B2 (square). Two-color: positive and negative. Model expressions like 2x + 3 or factor quadratics by arranging tiles into rectangles. CCSS 7.EE, 8.EE.') },
            cra:           { accent: '#0d9488', soft: 'rgba(13,148,136,0.10)', icon: '\uD83D\uDD04', title: __alloT('stem.manipulatives.cra_progression_concrete_picture_equat', 'CRA Progression \u2014 concrete \u2192 picture \u2192 equation'), hint: __alloT('stem.manipulatives.bruner_1966_students_master_each_conce', 'Bruner (1966): students master each concept by moving through three modes of representation. We step you through the SAME problem in all three ways so the abstract symbol is grounded in a thing you can SEE and TOUCH.') },
            challenges:    { accent: '#f59e0b', soft: 'rgba(245,158,11,0.10)', icon: '\uD83C\uDFC6', title: __alloT('stem.manipulatives.challenge_hub_quick_practice_across_ev', 'Challenge Hub \u2014 quick practice across every manipulative'), hint: __alloT('stem.manipulatives.random_problems_spanning_all_12_manipu', 'Random problems spanning all 12 manipulatives. Designed for distributed practice (Cepeda et al. 2006): a quick five-minute set, mixing kinds, beats twenty minutes of one kind in a row.') },
            glossary:      { accent: '#06b6d4', soft: 'rgba(6,182,212,0.10)',  icon: '\uD83D\uDCD6', title: __alloT('stem.manipulatives.glossary_math_vocabulary_with_examples', 'Glossary \u2014 math vocabulary, with examples'),                 hint: __alloT('stem.manipulatives.vocabulary_is_the_curriculum_a_student', 'Vocabulary IS the curriculum. A student who hears "regroup," "compose," "decompose," "fluently," and "place value" enough times in context will internalize the system. Definitions are tied to the specific manipulative that demonstrates each.') },
            puzzles:       { accent: '#ec4899', soft: 'rgba(236,72,153,0.10)', icon: '\uD83E\uDDE9', title: __alloT('stem.manipulatives.brain_teasers_classic_math_puzzles', 'Brain Teasers \u2014 classic math puzzles'),                          hint: __alloT('stem.manipulatives.classic_problems_that_are_solvable_sat', 'Classic problems that are solvable, satisfying, and often easier with a manipulative in hand. Useful as warm-ups, sponge activities, or anchor tasks for class discussion.') },
            history:       { accent: '#84cc16', soft: 'rgba(132,204,22,0.10)', icon: '\uD83C\uDFDB', title: __alloT('stem.manipulatives.history_math_tools_through_time', 'History \u2014 math tools through time'),                          hint: __alloT('stem.manipulatives.counting_bones_lebombo_35_000_bce_sume', 'Counting bones (Lebombo, ~35,000 BCE) \u2192 Sumerian tokens \u2192 Roman abacus \u2192 Cuisenaire rods (1952) \u2192 today. Every manipulative in this tool is part of a long lineage of teaching aids.') },
            curriculum:    { accent: '#22c55e', soft: 'rgba(34,197,94,0.10)',  icon: '\uD83D\uDDFA', title: __alloT('stem.manipulatives.curriculum_map_which_tool_which_grade', 'Curriculum Map \u2014 which tool, which grade'),                  hint: __alloT('stem.manipulatives.a_k_5_progression_chart_showing_which_', 'A K-5 progression chart showing which manipulatives are typically introduced at which grade and which standards they support. Click any cell to open that tool.') },
            activities:    { accent: '#f43f5e', soft: 'rgba(244,63,94,0.10)',  icon: '\uD83C\uDCCF', title: __alloT('stem.manipulatives.activity_cards_printable_lessons', 'Activity Cards \u2014 printable lessons'),                    hint: __alloT('stem.manipulatives.ready_to_print_activity_cards_for_smal', 'Ready-to-print activity cards for small-group or whole-class use. Each card names a goal, materials, steps, and an extension question. Designed to be used WITHOUT this app \u2014 but you can also walk through them in-app.') },
            help:          { accent: '#64748b', soft: 'rgba(100,116,139,0.10)', icon: '\u2753', title: __alloT('stem.manipulatives.help_faq_2', 'Help & FAQ'),                                              hint: __alloT('stem.manipulatives.quick_reference_answers_to_common_stud', 'Quick-reference answers to common student and teacher questions, plus keyboard shortcuts, accessibility info, and how to contact AlloFlow support.') },
            standards:     { accent: '#7c3aed', soft: 'rgba(124,58,237,0.10)', icon: '\uD83D\uDCDC', title: __alloT('stem.manipulatives.ccss_standards_browser', 'CCSS Standards Browser'),                                      hint: __alloT('stem.manipulatives.common_core_state_standards_for_mathem', 'Common Core State Standards for Mathematics, K\u20135. Browse by grade, see which manipulative addresses each standard, and jump straight to it.') },
            library:       { accent: '#475569', soft: 'rgba(71,85,105,0.10)',  icon: '\uD83D\uDCDA', title: __alloT('stem.manipulatives.library_saved_constructions', 'Library \u2014 saved constructions'),                          hint: __alloT('stem.manipulatives.every_manipulative_s_current_state_can', 'Every manipulative\u2019s current state can be named, saved, and reopened later. Useful for setting up class examples in advance, or for students to return to in-progress work.') },
            teacher:       { accent: '#0f172a', soft: 'rgba(15,23,42,0.10)',   icon: '\uD83D\uDC69\u200D\uD83C\uDFEB', title: __alloT('stem.manipulatives.teacher_dashboard_progress_planning', 'Teacher Dashboard \u2014 progress + planning'),          hint: __alloT('stem.manipulatives.per_student_progress_badges_earned_mod', 'Per-student progress (badges earned, modes visited, streak best, problems solved). Quick lesson-plan templates aligned to CCSS. Export progress as CSV/JSON.') }
          };
          var meta = MODE_META[manipMode] || MODE_META.blocks;
          return h('div', {
            style: {
              margin: '8px 0 0',
              padding: '12px 14px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, ' + meta.soft + ' 0%, rgba(255,255,255,0) 100%)',
              border: '1px solid ' + meta.accent + '55',
              borderLeft: '4px solid ' + meta.accent,
              display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
            }
          },
            h('div', { style: { fontSize: 28, flexShrink: 0 }, 'aria-hidden': 'true' }, meta.icon),
            h('div', { style: { flex: 1, minWidth: 220 } },
              h('h3', { style: { color: meta.accent, fontSize: 15, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, meta.title),
              h('p', { style: { margin: '3px 0 0', color: 'var(--allo-stem-text-soft, #475569)', fontSize: 11, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
            )
          );
        })()
      );

      // ═══════════════════════════════════════════════════════════════
      // ── BASE-10 BLOCKS MODE ──
      // ═══════════════════════════════════════════════════════════════
      if (manipMode === 'blocks') {
        return h('div', { className: 'space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200' },
          headerEl,
          h('style', null, __alloT('stem.manipulatives.keyframes_b10regroup_0_transform_scale', '@keyframes b10regroup { 0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(168,85,247,0.5); } 40% { transform: scale(1.15); box-shadow: 0 0 20px 8px rgba(168,85,247,0.4); } 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(168,85,247,0); } }')),

          h('div', { className: 'bg-gradient-to-b from-orange-50 to-amber-50 rounded-xl border-2 border-orange-200 p-6' },
            // Total display with expanded form + number words
            h('div', { className: 'text-center mb-4' },
              h('span', { className: 'text-4xl font-bold text-orange-800 font-mono' }, totalValue.toLocaleString()),
              showExpanded && totalValue > 0 && h('div', { className: 'text-xs text-orange-500 font-mono mt-1' }, expandedForm(totalValue)),
              showExpanded && totalValue > 0 && totalValue < 10000 && h('div', { className: 'text-[11px] text-orange-400 italic mt-0.5' }, '"' + numberWords(totalValue) + '"'),
              h('span', { className: 'text-2xl text-slate-600 mx-3' }, '='),
              h('div', { className: 'flex items-end gap-2 flex-wrap justify-center', style: { minHeight: '60px' } },
                renderBlock3D('#db2777', '#f472b6', 56, 56, b10.thousands, 10, 10),
                b10.thousands > 0 && b10.hundreds > 0 && h('span', { className: 'w-px h-8 bg-slate-200 mx-0.5' }),
                renderBlock3D('#2563eb', '#60a5fa', 48, 48, b10.hundreds, 10, 10),
                (b10.thousands > 0 || b10.hundreds > 0) && b10.tens > 0 && h('span', { className: 'w-px h-8 bg-slate-200 mx-0.5' }),
                renderBlock3D('#059669', '#34d399', 10, 48, b10.tens, 1, 10),
                (b10.thousands > 0 || b10.hundreds > 0 || b10.tens > 0) && b10.ones > 0 && h('span', { className: 'w-px h-8 bg-slate-200 mx-0.5' }),
                renderBlock3D('#ea580c', '#fb923c', 10, 10, b10.ones, 1, 1),
                totalValue === 0 && h('span', { className: 'text-sm text-slate-600 italic' }, __alloT('stem.manipulatives.no_blocks', 'no blocks'))
              )
            ),
            h('div', { className: 'flex items-center justify-center gap-4 mb-3 text-[11px] font-bold text-slate-600' },
              h('span', null, __alloT('stem.manipulatives.cube_1000', '\u25A0 Cube = 1000')), h('span', null, __alloT('stem.manipulatives.flat_100', '\u25AC Flat = 100')), h('span', null, __alloT('stem.manipulatives.rod_10', '\u2503 Rod = 10')), h('span', null, __alloT('stem.manipulatives.unit_1', '\u25AA Unit = 1'))
            ),
            // Place value columns
            h('div', { className: 'grid grid-cols-4 gap-3' },
              placeCol('Thousands', '\u25A0', 'thousands', '#db2777', '#f472b6', 56, 56, 10, 10),
              placeCol('Hundreds', '\u25AC', 'hundreds', '#2563eb', '#60a5fa', 48, 48, 10, 10),
              placeCol('Tens', '\u2503', 'tens', '#059669', '#34d399', 10, 48, 1, 10),
              placeCol('Ones', '\u25AA', 'ones', '#ea580c', '#fb923c', 10, 10, 1, 1)
            ),
            // Regrouping
            h('div', { className: 'bg-gradient-to-r from-violet-50 to-fuchsia-50 rounded-xl border border-violet-200 p-3 mt-1' },
              h('p', { className: 'text-[11px] font-bold text-violet-700 uppercase tracking-wider mb-2 text-center' }, __alloT('stem.manipulatives.regroup_ungroup', '\u21C4 Regroup / Ungroup')),
              h('div', { className: 'flex flex-wrap gap-2 justify-center' },
                regroupBtn('10 \u25AA \u2192 1 \u2503', 'ones', 'tens', b10.ones >= 10, '#ea580c', '#059669'),
                regroupBtn('1 \u2503 \u2192 10 \u25AA', 'tens', 'ones', b10.tens >= 1, '#059669', '#ea580c'),
                h('span', { className: 'w-px h-6 bg-violet-200 mx-1 self-center' }),
                regroupBtn('10 \u2503 \u2192 1 \u25AC', 'tens', 'hundreds', b10.tens >= 10, '#059669', '#2563eb'),
                regroupBtn('1 \u25AC \u2192 10 \u2503', 'hundreds', 'tens', b10.hundreds >= 1, '#2563eb', '#059669'),
                h('span', { className: 'w-px h-6 bg-violet-200 mx-1 self-center' }),
                regroupBtn('10 \u25AC \u2192 1 \u25A0', 'hundreds', 'thousands', b10.hundreds >= 10, '#2563eb', '#db2777'),
                regroupBtn('1 \u25A0 \u2192 10 \u25AC', 'thousands', 'hundreds', b10.thousands >= 1, '#db2777', '#2563eb')
              ),
              h('p', { className: 'text-[11px] text-violet-400 text-center mt-1.5 italic' }, __alloT('stem.manipulatives.10_of_one_place_value_always_equals_1_', '\uD83D\uDCA1 10 of one place value always equals 1 of the next!'))
            )
          ),

          // Difficulty selector
          h('div', { className: 'flex gap-1.5 items-center flex-wrap' },
            h('span', { className: 'text-[11px] font-bold text-slate-600' }, 'Difficulty:'),
            [{ id: 'ones', label: '1\u20139', color: '#ea580c' }, { id: 'tens', label: '10\u201399', color: '#059669' }, { id: 'hundreds', label: '100\u2013999', color: '#2563eb' }, { id: 'thousands', label: '1K\u20139K', color: '#db2777' }, { id: 'any', label: 'Any', color: 'var(--allo-stem-text-soft, #94a3b8)' }].map(function(dl) {
              return h('button', { 'aria-label': __alloT('stem.manipulatives.expanded_form', 'Expanded Form'), key: dl.id, onClick: function() { upd({ diffLevel: dl.id }); },
                className: 'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ' + (diffLevel === dl.id ? 'text-white shadow' : 'bg-white border border-slate-400 text-slate-600 hover:bg-slate-50'),
                style: diffLevel === dl.id ? { backgroundColor: dl.color } : {}
              }, dl.label);
            }),
            h('label', { className: 'flex items-center gap-1 text-[11px] font-bold text-orange-600 cursor-pointer ml-auto' },
              h('input', { type: 'checkbox', checked: showExpanded, onChange: function() { upd({ showExpanded: !showExpanded }); }, className: 'accent-orange-600' }), __alloT('stem.manipulatives.expanded_form_2', 'Expanded Form'))
          ),

          // Action buttons
          h('div', { className: 'flex gap-2 flex-wrap' },
            h('button', { onClick: genBlockChallenge, className: 'flex-1 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-lg text-sm hover:from-orange-600 hover:to-amber-600 transition-all shadow-md' }, __alloT('stem.manipulatives.build_number', '\uD83C\uDFB2 Build Number')),
            h('button', { 'aria-label': __alloT('stem.manipulatives.addition', 'Addition'), onClick: genAdditionProblem, className: 'flex-1 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-lg text-sm hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md' }, __alloT('stem.manipulatives.addition_2', '\u2795 Addition')),
            h('button', { 'aria-label': __alloT('stem.manipulatives.reset', 'Reset'), onClick: function() { upd({ b10: { ones: 0, tens: 0, hundreds: 0, thousands: 0 }, b10Challenge: null, b10Feedback: null, b10AddMode: false, b10Addends: null }); }, className: 'px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300 transition-all' }, __alloT('stem.manipulatives.reset_2', '\u21BA Reset'))
          ),

          // Addition problem display
          b10AddMode && b10Addends && h('div', { className: 'bg-emerald-50 rounded-xl p-4 border border-emerald-200' },
            h('div', { className: 'text-center' },
              h('div', { className: 'text-sm font-bold text-emerald-800 mb-2' }, __alloT('stem.manipulatives.addition_with_regrouping', '\u2795 Addition with Regrouping')),
              h('div', { className: 'flex items-center justify-center gap-3 text-2xl font-bold font-mono' },
                h('span', { className: 'text-emerald-700' }, b10Addends.a.toLocaleString()),
                h('span', { className: 'text-emerald-500' }, '+'),
                h('span', { className: 'text-emerald-700' }, b10Addends.b.toLocaleString()),
                h('span', { className: 'text-emerald-500' }, '='),
                h('span', { className: 'text-emerald-400' }, '?')
              ),
              h('p', { className: 'text-xs text-emerald-600 mt-2' }, __alloT('stem.manipulatives.use_the_blocks_above_to_show_the_sum_a', 'Use the blocks above to show the sum. Add blocks for each number, then regroup if needed!'))
            )
          ),

          // Challenge display
          b10Challenge && !b10AddMode && h('div', { className: 'bg-orange-50 rounded-lg p-3 border border-orange-200' },
            h('p', { className: 'text-sm font-bold text-orange-800 mb-2' }, '\uD83C\uDFAF Show ' + b10Challenge.target.toLocaleString() + ' using base-10 blocks'),
            h('div', { className: 'flex gap-2 items-center' },
              h('span', { className: 'text-xs text-orange-600' }, __alloT('stem.manipulatives.your_value', 'Your value: '), h('span', { className: 'font-bold text-orange-900' }, totalValue.toLocaleString())),
              h('button', { 'aria-label': __alloT('stem.manipulatives.check', 'Check'), onClick: checkBase10, className: 'ml-auto px-4 py-1.5 bg-orange-700 text-white font-bold rounded-lg text-sm hover:bg-orange-600 transition-all' }, __alloT('stem.manipulatives.check_2', '\u2714 Check'))
            ),
            b10Feedback && h('p', { className: 'text-sm font-bold mt-2 ' + (b10Feedback.correct ? 'text-green-600' : 'text-red-600') }, b10Feedback.msg)
          ),

          // Addition challenge check
          b10AddMode && b10Challenge && h('div', { className: 'bg-orange-50 rounded-lg p-3 border border-orange-200' },
            h('div', { className: 'flex gap-2 items-center' },
              h('span', { className: 'text-xs text-orange-600' }, __alloT('stem.manipulatives.your_value_2', 'Your value: '), h('span', { className: 'font-bold text-orange-900' }, totalValue.toLocaleString()), ' (need ' + b10Challenge.target.toLocaleString() + ')'),
              h('button', { 'aria-label': __alloT('stem.manipulatives.check_sum', 'Check Sum'), onClick: checkBase10, className: 'ml-auto px-4 py-1.5 bg-emerald-700 text-white font-bold rounded-lg text-sm hover:bg-emerald-600 transition-all' }, __alloT('stem.manipulatives.check_sum_2', '\u2714 Check Sum'))
            ),
            b10Feedback && h('p', { className: 'text-sm font-bold mt-2 ' + (b10Feedback.correct ? 'text-green-600' : 'text-red-600') }, b10Feedback.msg)
          )
        );
      }

      // ═══════════════════════════════════════════════════════════════
      // ── ABACUS MODE ──
      // ═══════════════════════════════════════════════════════════════
      if (manipMode === 'abacus') {
        var ROD_COLORS = ['#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];
        var BEAD_SIZE = 28;
        return h('div', { className: 'space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200' },
          headerEl,
          // Total + speed timer
          h('div', { className: 'text-center' },
            h('span', { className: 'text-4xl font-bold font-mono text-amber-800' }, abacusTotal.toLocaleString()),
            speedChallenge && h('div', { className: 'text-xs font-bold text-rose-500 mt-1' }, '\u23F1\uFE0F Target: ' + speedChallenge.target.toLocaleString() + ' \u2014 GO!'),
            speedBest && h('span', { className: 'text-[11px] text-amber-500 ml-2' }, '\uD83C\uDFC6 Best: ' + speedBest.toFixed(1) + 's')
          ),
          // Abacus frame
          h('div', {
            className: 'rounded-xl border-2 border-amber-300 p-4 shadow-inner relative overflow-hidden',
            style: { background: 'linear-gradient(180deg, #fef3c7 0%, #fde68a 30%, #fef3c7 100%)' }
          },
            h('div', { style: { position: 'absolute', left: 0, right: 0, top: '36%', height: '4px', background: 'linear-gradient(90deg, #92400e, #b45309, #92400e)', zIndex: 5, boxShadow: '0 1px 3px rgba(0,0,0,0.3)' } }),
            h('div', { className: 'flex justify-center gap-6' },
              rods.slice().reverse().map(function(val, ri) {
                var rodIdx = rods.length - 1 - ri;
                var heavenlyVal = Math.floor(val / 5);
                var earthlyVal = val % 5;
                var rodColor = ROD_COLORS[rodIdx];
                return h('div', { key: rodIdx, className: 'flex flex-col items-center', style: { width: '48px' } },
                  h('div', { className: 'flex flex-col items-center gap-1 mb-1', style: { minHeight: '60px', justifyContent: 'flex-end' } },
                    h('div', { style: { position: 'absolute', width: '3px', height: '100%', background: 'linear-gradient(180deg, #92400e 0%, #b45309 100%)', borderRadius: '2px', zIndex: 0 } }),
                    h('button', { 'aria-label': __alloT('stem.manipulatives.set_rod', 'Set Rod'),
                      onClick: function() { setRod(rodIdx, heavenlyVal ? val - 5 : val + 5); },
                      className: 'relative z-10 transition-all duration-200',
                      style: {
                        width: BEAD_SIZE + 8 + 'px', height: BEAD_SIZE - 4 + 'px', borderRadius: '50%',
                        background: heavenlyVal ? 'linear-gradient(135deg, ' + rodColor + ' 0%, ' + rodColor + 'cc 100%)' : 'linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%)',
                        border: '2px solid ' + (heavenlyVal ? rodColor : '#9ca3af'),
                        boxShadow: heavenlyVal ? '0 3px 8px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.5)' : '0 2px 4px rgba(0,0,0,0.15)',
                        transform: heavenlyVal ? 'translateY(12px)' : 'translateY(-2px)', cursor: 'pointer'
                      }
                    })
                  ),
                  h('div', { className: 'flex flex-col items-center gap-0.5 mt-2', style: { minHeight: '130px' } },
                    Array.from({ length: 5 }).map(function(_, bi) {
                      var isActive = bi < earthlyVal;
                      return h('button', { key: bi,
                        onClick: function() {
                          var newE = isActive && bi === earthlyVal - 1 ? earthlyVal - 1 : !isActive && bi === earthlyVal ? earthlyVal + 1 : bi < earthlyVal ? bi : bi + 1;
                          setRod(rodIdx, heavenlyVal * 5 + Math.max(0, Math.min(5, newE)));
                        },
                        className: 'relative z-10 transition-all duration-200',
                        style: {
                          width: BEAD_SIZE + 8 + 'px', height: BEAD_SIZE - 6 + 'px', borderRadius: '50%',
                          background: isActive ? 'linear-gradient(135deg, ' + rodColor + ' 0%, ' + rodColor + 'cc 100%)' : 'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)',
                          border: '2px solid ' + (isActive ? rodColor : '#d1d5db'),
                          boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.25), inset 0 1px 2px rgba(255,255,255,0.4)' : '0 1px 3px rgba(0,0,0,0.1)',
                          transform: isActive ? 'translateY(-' + (5 - earthlyVal) * 2 + 'px)' : 'translateY(' + (bi - earthlyVal) * 2 + 'px)',
                          cursor: 'pointer'
                        }
                      });
                    })
                  ),
                  h('div', { className: 'text-[11px] font-bold mt-1', style: { color: rodColor } }, placeNames[rodIdx]),
                  h('div', { className: 'text-xs font-mono font-bold text-amber-900' }, val)
                );
              })
            )
          ),

          // Controls
          h('div', { className: 'flex gap-2 flex-wrap' },
            h('button', { 'aria-label': __alloT('stem.manipulatives.challenge', 'Challenge'), onClick: function() {
              var target = 1 + Math.floor(Math.random() * 99999);
              upd({ abacusChallenge: { target: target }, abacusFeedback: null, abacus: { rods: [0, 0, 0, 0, 0] }, speedChallenge: null });
            }, className: 'flex-1 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-lg text-sm hover:from-amber-600 hover:to-orange-600 transition-all shadow-md' }, __alloT('stem.manipulatives.challenge_2', '\uD83C\uDFB2 Challenge')),
            h('button', { 'aria-label': __alloT('stem.manipulatives.speed', 'Speed'), onClick: function() {
              var target = 1 + Math.floor(Math.random() * 99999);
              upd({ speedChallenge: { target: target, startTime: Date.now() }, abacusChallenge: null, abacusFeedback: null, abacus: { rods: [0, 0, 0, 0, 0] } });
            }, className: 'flex-1 py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold rounded-lg text-sm hover:from-rose-600 hover:to-pink-600 transition-all shadow-md' }, __alloT('stem.manipulatives.speed_2', '\u23F1\uFE0F Speed')),
            h('button', { 'aria-label': __alloT('stem.manipulatives.reset_3', 'Reset'), onClick: function() { upd({ abacus: { rods: [0, 0, 0, 0, 0] }, abacusChallenge: null, abacusFeedback: null, speedChallenge: null }); }, className: 'px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300 transition-all' }, __alloT('stem.manipulatives.reset_4', '\u21BA Reset'))
          ),

          // Challenge / Speed display
          abacusChallenge && h('div', { className: 'bg-amber-50 rounded-lg p-3 border border-amber-200' },
            h('p', { className: 'text-sm font-bold text-amber-800 mb-2' }, '\uD83C\uDFAF Show ' + abacusChallenge.target.toLocaleString() + ' on the abacus'),
            h('div', { className: 'flex gap-2 items-center' },
              h('span', { className: 'text-xs text-amber-600' }, __alloT('stem.manipulatives.your_value_3', 'Your value: '), h('span', { className: 'font-bold text-amber-900' }, abacusTotal.toLocaleString())),
              h('button', { 'aria-label': __alloT('stem.manipulatives.check_3', 'Check'), onClick: checkAbacus, className: 'ml-auto px-4 py-1.5 bg-amber-700 text-white font-bold rounded-lg text-sm hover:bg-amber-600 transition-all' }, __alloT('stem.manipulatives.check_4', '\u2714 Check'))
            ),
            abacusFeedback && h('p', { className: 'text-sm font-bold mt-2 ' + (abacusFeedback.correct ? 'text-green-600' : 'text-red-600') }, abacusFeedback.msg)
          ),
          speedChallenge && h('div', { className: 'bg-rose-50 rounded-lg p-3 border border-rose-200' },
            h('p', { className: 'text-sm font-bold text-rose-800 mb-2' }, '\u23F1\uFE0F Speed: Show ' + speedChallenge.target.toLocaleString() + ' as fast as you can!'),
            h('div', { className: 'flex gap-2 items-center' },
              h('span', { className: 'text-xs text-rose-600' }, __alloT('stem.manipulatives.your_value_4', 'Your value: '), h('span', { className: 'font-bold text-rose-900' }, abacusTotal.toLocaleString())),
              h('button', { 'aria-label': 'Done!', onClick: checkSpeed, className: 'ml-auto px-4 py-1.5 bg-rose-700 text-white font-bold rounded-lg text-sm hover:bg-rose-600 transition-all' }, __alloT('stem.manipulatives.done', '\u2714 Done!'))
            )
          ),

          // Culture cards
          h('div', null,
            h('button', { 'aria-label': __alloT('stem.manipulatives.toggle_cultural_context_panel', 'Toggle cultural context panel'), onClick: function() { upd({ showCulture: !showCulture }); }, className: 'text-[11px] font-bold ' + (showCulture ? 'text-amber-600' : 'text-slate-600') + 'transition-colors  hover:text-amber-600' }, (showCulture ? '\u25B2' : '\u25BC') + ' \uD83C\uDF0F Abacus Around the World'),
            showCulture && h('div', { className: 'grid grid-cols-2 gap-2 mt-2' },
              abacusFacts.map(function(fact) {
                return h('div', { key: fact.name, className: 'bg-amber-50 rounded-lg p-3 border border-amber-200' },
                  h('div', { className: 'text-sm font-bold text-amber-800 mb-1' }, fact.emoji + ' ' + fact.name),
                  h('div', { className: 'text-xs text-amber-700' }, fact.desc)
                );
              })
            )
          )
        );
      }

      // ═══════════════════════════════════════════════════════════════
      // ── SLIDE RULE MODE ──
      // ═══════════════════════════════════════════════════════════════
      if (manipMode === 'slideRule') {
        var PAD = 40, RULER_W = 520, SW = 600, SH = 180;
        var log10 = function(x) { return Math.log(x) / Math.LN10; };

        var renderScale = function(yBase, color, label, offset) {
          var ticks = [];
          for (var sn = 1; sn <= 10; sn++) {
            var x = PAD + (log10(sn) + (offset || 0)) * RULER_W;
            if (x < PAD || x > PAD + RULER_W) continue;
            ticks.push(h('line', { key: label + sn, x1: x, y1: yBase - 12, x2: x, y2: yBase + 12, stroke: color, strokeWidth: sn === 1 || sn === 10 ? 2 : 1 }));
            ticks.push(h('text', { key: label + 't' + sn, x: x, y: yBase + 24, textAnchor: 'middle', fill: color, style: { fontSize: '10px', fontWeight: 'bold' } }, sn));
          }
          for (var sm = 1; sm < 10; sm++) {
            for (var ss = 1; ss <= 9; ss++) {
              var val2 = sm + ss * 0.1;
              var xv = PAD + (log10(val2) + (offset || 0)) * RULER_W;
              if (xv >= PAD && xv <= PAD + RULER_W) {
                ticks.push(h('line', { key: label + 's' + sm + ss, x1: xv, y1: yBase - (ss === 5 ? 8 : 4), x2: xv, y2: yBase + (ss === 5 ? 8 : 4), stroke: color, strokeWidth: 0.5 }));
              }
            }
          }
          ticks.push(h('text', { key: label + 'lbl', x: PAD - 20, y: yBase + 4, textAnchor: 'middle', fill: color, style: { fontSize: '12px', fontWeight: 'bold' } }, label));
          return ticks;
        };

        var cursorX = PAD + (sr.cursorPos || 0.301) * RULER_W;

        return h('div', { className: 'space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200' },
          headerEl,
          h('div', { className: 'relative' },
            h('svg', {
              viewBox: '0 0 ' + SW + ' ' + SH, className: 'w-full rounded-xl border-2 border-amber-300 cursor-crosshair shadow-md',
              style: { maxWidth: '600px', background: '#fffbeb' },
              onClick: function(e) {
                var rect = e.currentTarget.getBoundingClientRect();
                var svgX = (e.clientX - rect.left) * (SW / rect.width);
                var svgY = (e.clientY - rect.top) * (SH / rect.height);
                var normX = (svgX - PAD) / RULER_W;
                if (normX < 0 || normX > 1) return;
                if (svgY < SH / 2) {
                  upd({ slideRule: Object.assign({}, sr, { cOffset: Math.max(-0.5, Math.min(0.5, normX - (sr.cursorPos || 0.301))) }) });
                } else {
                  upd({ slideRule: Object.assign({}, sr, { cursorPos: Math.max(0, Math.min(1, normX)) }) });
                }
                if (soundEnabled) sfxTick();
              }
            },
              h('rect', { x: 0, y: 0, width: SW, height: SH * 0.45, fill: '#f0fdf4', rx: 4 }),
              h('rect', { x: 0, y: SH * 0.45, width: SW, height: SH * 0.55, fill: '#fffbeb', rx: 4 }),
              renderScale(SH * 0.3, '#16a34a', 'C', sr.cOffset || 0),
              renderScale(SH * 0.7, '#d97706', 'D', 0),
              h('line', { x1: cursorX, y1: 0, x2: cursorX, y2: SH, stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '4 2' }),
              h('circle', { cx: cursorX, cy: SH * 0.3, r: 4, fill: '#ef4444' }),
              h('circle', { cx: cursorX, cy: SH * 0.7, r: 4, fill: '#ef4444' })
            )
          ),
          // Readout
          h('div', { className: 'bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200 p-4' },
            h('div', { className: 'grid grid-cols-3 gap-4 text-center' },
              h('div', null, h('div', { className: 'text-xs font-bold text-green-700 uppercase mb-1' }, __alloT('stem.manipulatives.c_scale', 'C Scale')), h('div', { className: 'text-2xl font-bold font-mono text-green-800' }, cVal.toFixed(2))),
              h('div', null, h('div', { className: 'text-xs font-bold text-slate-600 uppercase mb-1' }, '\u00D7'), h('div', { className: 'text-2xl font-bold text-slate-600' }, '\u00D7')),
              h('div', null, h('div', { className: 'text-xs font-bold text-amber-700 uppercase mb-1' }, __alloT('stem.manipulatives.d_scale', 'D Scale')), h('div', { className: 'text-2xl font-bold font-mono text-amber-800' }, dVal.toFixed(2)))
            ),
            h('div', { className: 'text-center mt-3 pt-3 border-t border-amber-200' },
              h('div', { className: 'text-xs font-bold text-slate-600 uppercase mb-1' }, __alloT('stem.manipulatives.result', 'Result')),
              h('div', { className: 'text-3xl font-bold font-mono text-orange-800' }, '\u2248 ' + product.toFixed(2))
            )
          ),

          // Controls + practice problems
          h('div', { className: 'flex gap-2 flex-wrap' },
            h('button', { 'aria-label': __alloT('stem.manipulatives.practice_problem', 'Practice Problem'), onClick: function() {
              var p = srProblems[Math.floor(Math.random() * srProblems.length)];
              upd({ srProblem: p, srFeedback: null, slideRule: { cOffset: 0, cursorPos: 0.301 } });
            }, className: 'flex-1 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-lg text-sm hover:from-amber-600 hover:to-orange-600 transition-all shadow-md' }, __alloT('stem.manipulatives.practice_problem_2', '\uD83C\uDFAF Practice Problem')),
            h('button', { 'aria-label': __alloT('stem.manipulatives.reset_5', 'Reset'), onClick: function() { upd({ slideRule: { cOffset: 0, cursorPos: 0.301 }, srProblem: null, srFeedback: null }); }, className: 'px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300 transition-all' }, __alloT('stem.manipulatives.reset_6', '\u21BA Reset'))
          ),

          // Practice problem display
          srProblem && h('div', { className: 'bg-amber-50 rounded-lg p-3 border border-amber-200' },
            h('p', { className: 'text-sm font-bold text-amber-800 mb-2' }, '\uD83C\uDFAF Use the slide rule to multiply: ' + srProblem.a + ' \u00D7 ' + srProblem.b + ' = ?'),
            h('p', { className: 'text-xs text-amber-600 mb-2' }, '\uD83D\uDCA1 Set C-scale "1" to line up with ' + srProblem.a + ' on D, then find ' + srProblem.b + ' on C. Read D under it!'),
            h('div', { className: 'flex gap-2 items-center' },
              h('span', { className: 'text-xs text-amber-600' }, __alloT('stem.manipulatives.your_result', 'Your result: '), h('span', { className: 'font-bold text-amber-900' }, '\u2248 ' + product.toFixed(1))),
              h('button', { 'aria-label': __alloT('stem.manipulatives.check_5', 'Check'), onClick: checkSR, className: 'ml-auto px-4 py-1.5 bg-amber-700 text-white font-bold rounded-lg text-sm hover:bg-amber-600 transition-all' }, __alloT('stem.manipulatives.check_6', '\u2714 Check'))
            ),
            srFeedback && h('p', { className: 'text-sm font-bold mt-2 ' + (srFeedback.correct ? 'text-green-600' : 'text-red-600') }, srFeedback.msg)
          ),

          // Tutorial
          h('div', { className: 'bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-xs text-yellow-800 space-y-2' },
            h('p', { className: 'font-bold text-sm text-amber-800' }, __alloT('stem.manipulatives.how_to_use_the_slide_rule', '\uD83D\uDCCF How to Use the Slide Rule')),
            h('div', { className: 'space-y-1.5' },
              h('p', null, __alloT('stem.manipulatives.1_the_slide_rule_multiplies_using', '1\uFE0F\u20E3 The slide rule multiplies using '), h('strong', null, __alloT('stem.manipulatives.logarithmic_scales', 'logarithmic scales')), __alloT('stem.manipulatives.sliding_turns_multiplication_into_addi', ' \u2014 sliding turns multiplication into addition.')),
              h('p', null, '2\uFE0F\u20E3 ', h('strong', null, __alloT('stem.manipulatives.click_the_top_c_area', 'Click the top (C) area')), __alloT('stem.manipulatives.to_shift_the_c_scale_relative_to_d', ' to shift the C scale relative to D.')),
              h('p', null, '3\uFE0F\u20E3 ', h('strong', null, __alloT('stem.manipulatives.click_the_bottom_d_area', 'Click the bottom (D) area')), __alloT('stem.manipulatives.to_move_the_red_cursor', ' to move the red cursor.')),
              h('p', null, __alloT('stem.manipulatives.4_read_where_the', '4\uFE0F\u20E3 Read where the '), h('strong', null, __alloT('stem.manipulatives.cursor_crosses_both_scales', 'cursor crosses both scales')), __alloT('stem.manipulatives.the_readout_shows_exact_values', '. The readout shows exact values.'))
            ),
            h('p', { className: 'text-[11px] text-amber-600 italic mt-1' }, __alloT('stem.manipulatives.nasa_engineers_used_slide_rules_for_ap', '\uD83D\uDE80 NASA engineers used slide rules for Apollo moon mission trajectories!'))
          )
        );
      }

      // ═══════════════════════════════════════════════════════════════
      // ── QUIZ MODE ──
      // ═══════════════════════════════════════════════════════════════
      if (manipMode === 'quiz') {
        return h('div', { className: 'space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200' },
          headerEl,
          h('div', { className: 'text-center' },
            h('h4', { className: 'text-lg font-bold text-orange-800' }, __alloT('stem.manipulatives.place_value_quiz', '\uD83E\uDDE0 Place Value Quiz')),
            h('p', { className: 'text-xs text-slate-600' }, __alloT('stem.manipulatives.test_your_understanding_of_place_value', 'Test your understanding of place value, expanded form, and number comparison'))
          ),

          h('button', { 'aria-label': __alloT('stem.manipulatives.generate_new_place_value_quiz', 'Generate new place value quiz'), onClick: function() { upd({ pvQuiz: generatePVQuiz(), pvFeedback: null }); },
            className: 'w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-xl text-sm hover:from-orange-600 hover:to-amber-600 transition-all shadow-md'
          }, pvQuiz ? '\uD83D\uDD04 Next Question' : '\uD83C\uDFAF Start Quiz'),

          pvQuiz && h('div', { className: 'bg-white rounded-xl p-5 border-2 border-orange-200 shadow-sm' },
            h('div', { className: 'flex items-center gap-2 mb-3' },
              h('span', { className: 'text-[11px] font-bold uppercase px-2 py-0.5 rounded-full ' + (
                pvQuiz.type === 'digit_place' ? 'bg-blue-100 text-blue-700' :
                pvQuiz.type === 'expanded_to_standard' ? 'bg-green-100 text-green-700' :
                pvQuiz.type === 'standard_to_expanded' ? 'bg-purple-100 text-purple-700' :
                pvQuiz.type === 'compare' ? 'bg-amber-100 text-amber-700' :
                'bg-rose-100 text-rose-700'
              ) },
                pvQuiz.type === 'digit_place' ? 'Digit in Place' :
                pvQuiz.type === 'expanded_to_standard' ? 'Expanded \u2192 Standard' :
                pvQuiz.type === 'standard_to_expanded' ? 'Standard \u2192 Expanded' :
                pvQuiz.type === 'compare' ? 'Compare' : 'Rounding'
              )
            ),
            h('p', { className: 'text-lg font-bold text-slate-800 mb-4' }, pvQuiz.q),
            !pvFeedback && h('div', { className: 'grid grid-cols-2 gap-3' },
              pvQuiz.opts.map(function(opt) {
                return h('button', { 'aria-label': __alloT('stem.manipulatives.next', 'Next'), key: opt, onClick: function() { answerPVQuiz(opt); },
                  className: 'px-4 py-3 rounded-xl text-sm font-bold border-2 bg-white text-slate-700 border-slate-200 hover:border-orange-400 hover:bg-orange-50 transition-all cursor-pointer'
                }, opt);
              })
            ),
            pvFeedback && h('div', { className: 'p-3 rounded-xl text-sm font-bold ' + (pvFeedback.correct ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200') },
              pvFeedback.msg,
              h('button', { 'aria-label': __alloT('stem.manipulatives.next_2', 'Next'), onClick: function() { upd({ pvQuiz: generatePVQuiz(), pvFeedback: null }); }, className: 'ml-3 text-xs font-bold underline' }, __alloT('stem.manipulatives.next_3', '\u27A1 Next'))
            )
          ),

          !pvQuiz && h('div', { className: 'text-center text-sm text-slate-600 py-8' }, __alloT('stem.manipulatives.click_start_quiz_to_test_your_place_va', 'Click "Start Quiz" to test your place value skills!')),

          // Quiz categories info
          h('div', { className: 'grid grid-cols-2 sm:grid-cols-3 gap-2' },
            [
              { icon: '\uD83D\uDD22', name: __alloT('stem.manipulatives.digit_in_place', 'Digit in Place'), desc: __alloT('stem.manipulatives.find_a_specific_digit', 'Find a specific digit') },
              { icon: '\uD83D\uDCC4', name: __alloT('stem.manipulatives.expanded_form_3', 'Expanded Form'), desc: __alloT('stem.manipulatives.break_numbers_apart', 'Break numbers apart') },
              { icon: '\u2696\uFE0F', name: __alloT('stem.manipulatives.compare', 'Compare'), desc: __alloT('stem.manipulatives.greater_less_than', 'Greater/less than') },
              { icon: '\uD83C\uDFAF', name: __alloT('stem.manipulatives.rounding', 'Rounding'), desc: __alloT('stem.manipulatives.round_to_nearest_10_100_1000', 'Round to nearest 10/100/1000') },
              { icon: '\u21C4', name: __alloT('stem.manipulatives.convert', 'Convert'), desc: __alloT('stem.manipulatives.between_standard_expanded', 'Between standard & expanded') },
              { icon: '\uD83E\uDDE0', name: __alloT('stem.manipulatives.place_value', 'Place Value'), desc: __alloT('stem.manipulatives.what_is_each_digit_worth', 'What is each digit worth?') }
            ].map(function(cat) {
              return h('div', { key: cat.name, className: 'bg-orange-50 rounded-lg p-2 border border-orange-200 text-center' },
                h('div', { className: 'text-base mb-0.5' }, cat.icon),
                h('div', { className: 'text-[11px] font-bold text-orange-800' }, cat.name),
                h('div', { className: 'text-[11px] text-orange-500' }, cat.desc)
              );
            })
          ),

          // Coach tip
          h('div', { className: 'bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-3 border border-orange-100 text-xs text-orange-700' },
            streak >= 5 ? '\uD83D\uDD25 ' + streak + ' in a row! You\'re on fire! Keep going!'
            : score.total > 0 && score.correct === score.total ? '\u2B50 Perfect score so far! Try all the quiz types!'
            : '\uD83D\uDCA1 Place value is the foundation of our number system. Each position is 10\u00D7 the one to its right!'
          )
        );
      }

      // ═══════════════════════════════════════════════════════════════
      // ── v3: TEN FRAMES MODE ──
      // ═══════════════════════════════════════════════════════════════
      // K-2 number sense workhorse. Click cells to fill. Double mode adds
      // a second frame for numbers up to 20.
      if (manipMode === 'tenFrame') {
        var tfMax = tenFrameDouble ? 20 : 10;
        var tfRows = tenFrameDouble ? 4 : 2;
        var tfCells = [];
        for (var tfi = 0; tfi < tfMax; tfi++) {
          var filled = tfi < tenFrameFilled;
          tfCells.push(h('button', {
            key: 'tf-' + tfi,
            onClick: function(idx) { return function() {
              // Click empty cell: fill up to that point. Click filled: reduce to before.
              var newCount = idx < tenFrameFilled ? idx : idx + 1;
              upd({ tenFrameFilled: newCount });
              sfxClick();
              announceToSR && announceToSR('Ten frame now shows ' + newCount);
            }; }(tfi),
            'aria-label': 'Cell ' + (tfi + 1) + (filled ? ', filled' : ', empty') + '. Click to ' + (filled ? 'remove' : 'fill') + '.',
            className: 'aspect-square border-2 rounded-lg transition-all hover:shadow-md ' +
              (filled ? 'border-orange-600' : 'border-orange-300 bg-white hover:bg-orange-50'),
            style: filled ? { background: palette.tenFrame } : {}
          },
            filled && h('span', { className: 'text-2xl', style: { color: '#fff', textShadow: '0 2px 3px rgba(0,0,0,0.4)' } }, '●')
          ));
        }
        return h('div', { className: 'space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200' },
          headerEl,
          h('div', { className: 'flex items-center gap-3 justify-center mb-3' },
            h('p', { className: 'text-3xl font-black text-orange-800' }, tenFrameFilled),
            h('span', { className: 'text-xl text-slate-500' }, ' of ' + tfMax + ' = '),
            h('p', { className: 'text-xl font-bold text-orange-700' }, tenFrameFilled === tfMax ? 'full!' : (tfMax - tenFrameFilled) + ' more to fill'),
            h('label', { className: 'ml-auto flex items-center gap-1 text-xs font-bold text-orange-700' },
              h('input', { type: 'checkbox', checked: tenFrameDouble,
                onChange: function(e) { upd({ tenFrameDouble: e.target.checked, tenFrameFilled: Math.min(tenFrameFilled, e.target.checked ? 20 : 10) }); },
                'aria-label': __alloT('stem.manipulatives.toggle_double_ten_frame', 'Toggle double ten frame'),
                className: 'accent-orange-600'
              }),
              __alloT('stem.manipulatives.double_frame_to_20', 'Double frame (to 20)')
            )
          ),
          h('div', { className: 'bg-white rounded-xl border-2 border-orange-200 p-4 flex justify-center' },
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(5, 60px)', gridTemplateRows: 'repeat(' + tfRows + ', 60px)', gap: 4 } },
              tfCells
            )
          ),
          h('div', { className: 'flex gap-2 justify-center' },
            h('button', { onClick: function() { upd({ tenFrameFilled: 0 }); },
              className: 'transition-colors px-3 py-1.5 rounded text-xs font-bold bg-rose-100 text-rose-700 hover:bg-rose-200' }, __alloT('stem.manipulatives.clear', '↺ Clear')),
            h('button', { onClick: function() { upd({ tenFrameFilled: Math.min(tfMax, tenFrameFilled + 1) }); sfxClick(); },
              className: 'transition-colors px-3 py-1.5 rounded text-xs font-bold bg-orange-600 text-white hover:bg-orange-700' }, __alloT('stem.manipulatives.add_one', '+ Add one')),
            h('button', { onClick: function() { upd({ tenFrameFilled: Math.max(0, tenFrameFilled - 1) }); sfxClick(); },
              className: 'transition-colors px-3 py-1.5 rounded text-xs font-bold bg-orange-200 text-orange-800 hover:bg-orange-300' }, __alloT('stem.manipulatives.remove_one', '− Remove one')),
            h('button', { onClick: function() { upd({ tenFrameFilled: Math.floor(Math.random() * (tfMax + 1)) }); sfxClick(); },
              className: 'transition-colors px-3 py-1.5 rounded text-xs font-bold bg-amber-100 text-amber-800 hover:bg-amber-200' }, __alloT('stem.manipulatives.random', '🎲 Random'))
          ),
          h('div', { className: 'bg-orange-50 rounded-lg p-3 border border-orange-100 text-xs text-orange-800' },
            '💡 ',
            tenFrameFilled === 0 ? 'Empty. Click cells to fill them.' :
            tenFrameFilled === 5 ? 'Half full (the top row is complete). ' + (10 - tenFrameFilled) + ' more to make 10.' :
            tenFrameFilled === 10 ? '✓ Full! That\'s 10.' :
            tenFrameFilled < 5 ? tenFrameFilled + ' in the top row, ' + (5 - tenFrameFilled) + ' empty. ' + (10 - tenFrameFilled) + ' more to make 10.' :
            tenFrameFilled < 10 ? 'Top row full + ' + (tenFrameFilled - 5) + ' in bottom row. ' + (10 - tenFrameFilled) + ' more to make 10.' :
            'Above 10. First frame full + ' + (tenFrameFilled - 10) + ' in second frame.'
          ),
          // ── Challenge sub-panel ──
          (function() {
            var genTfChallenge = function() {
              // 3 types: subitize, make-ten, double-frame total
              var types = ['subitize', 'makeTen', 'addToMake'];
              var t = types[Math.floor(Math.random() * types.length)];
              if (t === 'subitize') {
                var n = 1 + Math.floor(Math.random() * 10);
                upd({ tfChallenge: { type: t, target: n, q: 'Fill the ten frame so it shows ' + n + '.' }, tfFeedback: null, tenFrameFilled: 0 });
              } else if (t === 'makeTen') {
                var have = 1 + Math.floor(Math.random() * 9);
                upd({ tfChallenge: { type: t, target: 10 - have, prefill: have, q: 'There are already ' + have + ' dots. Add the right number more to make 10.' }, tfFeedback: null, tenFrameFilled: have });
              } else {
                // Add-to-make (with double frame)
                var goal = 11 + Math.floor(Math.random() * 9);
                upd({ tfChallenge: { type: t, target: goal, q: 'Fill the double frame so it shows ' + goal + '.' }, tfFeedback: null, tenFrameDouble: true, tenFrameFilled: 0 });
              }
            };
            var checkTf = function() {
              if (!tfChallenge) return;
              var ok = false;
              if (tfChallenge.type === 'subitize') ok = tenFrameFilled === tfChallenge.target;
              else if (tfChallenge.type === 'makeTen') ok = tenFrameFilled === 10;
              else if (tfChallenge.type === 'addToMake') ok = tenFrameFilled === tfChallenge.target;
              var newStreak = ok ? streak + 1 : 0;
              upd({
                tfFeedback: { ok: ok, msg: ok ? '✅ Correct!' : '❌ Currently ' + tenFrameFilled + ', need ' + (tfChallenge.type === 'makeTen' ? 10 : tfChallenge.target) },
                score: { correct: score.correct + (ok ? 1 : 0), total: score.total + 1 },
                streak: newStreak
              });
              if (ok) { if (soundEnabled) sfxCorrect(); if (awardXP) awardXP('manip_tf', 3, 'ten frame challenge'); }
              else if (soundEnabled) sfxWrong();
            };
            return h('div', { className: 'bg-white rounded-xl border-2 border-orange-300 p-3' },
              h('div', { className: 'flex items-center justify-between mb-2' },
                h('p', { className: 'text-xs font-bold text-orange-800 uppercase' }, __alloT('stem.manipulatives.challenge_3', '🎯 Challenge')),
                h('button', { onClick: genTfChallenge,
                  className: 'transition-colors px-3 py-1 rounded text-xs font-bold bg-orange-600 text-white hover:bg-orange-700' }, __alloT('stem.manipulatives.new', '🎲 New'))
              ),
              !tfChallenge && h('p', { className: 'text-xs text-orange-700 italic' },
                __alloT('stem.manipulatives.click_new_for_a_quick_practice_problem', 'Click "New" for a quick practice problem (subitize, make 10, or fill the double frame).')
              ),
              tfChallenge && h('div', { className: 'space-y-2' },
                h('p', { className: 'text-sm text-slate-800' }, tfChallenge.q),
                !tfFeedback && h('button', { onClick: checkTf,
                  className: 'transition-colors w-full px-3 py-1.5 rounded text-xs font-bold bg-orange-600 text-white hover:bg-orange-700' },
                  'Check (current: ' + tenFrameFilled + ')'
                ),
                tfFeedback && h('div', { className: 'space-y-1' },
                  h('p', { className: 'text-sm font-bold ' + (tfFeedback.ok ? 'text-green-700' : 'text-red-700') }, tfFeedback.msg),
                  h('button', { onClick: genTfChallenge,
                    className: 'transition-colors w-full px-3 py-1.5 rounded text-xs font-bold bg-orange-600 text-white hover:bg-orange-700' }, __alloT('stem.manipulatives.next_4', '🔄 Next'))
                )
              )
            );
          })()
        );
      }

      // ═══════════════════════════════════════════════════════════════
      // ── v3: TWO-COLOR COUNTERS MODE ──
      // ═══════════════════════════════════════════════════════════════
      // Yellow = +1, Red = -1. Zero pairs (one of each) cancel out.
      // Concrete model for integer arithmetic. CCSS 6.NS.C.5, 7.NS.A.1.
      if (manipMode === 'counters') {
        var net = counters.yellow - counters.red;
        var zeroPairs = Math.min(counters.red, counters.yellow);
        // v3.1: drag-and-drop — drag a yellow onto a red (or red onto yellow)
        // to remove that zero pair. _m.ctDrag stores which kind is being dragged.
        var startDrag = function(kind) { upd({ ctDrag: kind }); };
        var endDrag = function() { upd({ ctDrag: null }); };
        var dropOn = function(targetKind) {
          var src = _m.ctDrag;
          if (!src || src === targetKind) { endDrag(); return; }
          // Opposite colors → remove a zero pair
          var nc = Object.assign({}, counters);
          nc[src] = Math.max(0, nc[src] - 1);
          nc[targetKind] = Math.max(0, nc[targetKind] - 1);
          upd({ counters: nc, ctDrag: null });
          if (soundEnabled) sfxRegroup();
          announceToSR && announceToSR('Zero pair removed by drag.');
        };
        var renderCounter = function(color, count, kind) {
          var arr = [];
          for (var ci = 0; ci < count; ci++) {
            arr.push(h('button', {
              key: kind + '-' + ci,
              draggable: true,
              onDragStart: function(k) { return function(e) { try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', k); } catch (_) {} startDrag(k); }; }(kind),
              onDragEnd: endDrag,
              onClick: function() {
                var nc = Object.assign({}, counters); nc[kind] = Math.max(0, nc[kind] - 1);
                upd({ counters: nc }); sfxClick();
              },
              'aria-label': __alloT('stem.manipulatives.counter_drag_to_opposite_color_zone_to', 'Counter — drag to opposite-color zone to remove zero pair, or click to remove just this one'),
              title: __alloT('stem.manipulatives.drag_onto_opposite_color_to_cancel_cli', 'Drag onto opposite color to cancel; click to remove'),
              style: {
                width: 36, height: 36, borderRadius: '50%',
                background: color, border: '2px solid #0f172a', cursor: 'grab',
                boxShadow: 'inset 0 4px 5px rgba(255,255,255,0.35), inset 0 -4px 5px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.3)',
                transition: 'transform 0.1s ease',
                opacity: _m.ctDrag === kind ? 0.5 : 1
              }
            }));
          }
          return arr;
        };
        var dropZoneStyle = function(activeFor) {
          var isDragging = !!_m.ctDrag;
          var isTarget = isDragging && _m.ctDrag !== activeFor;
          return {
            outline: isTarget ? '3px dashed #16a34a' : 'none',
            outlineOffset: -3, transition: 'outline 0.15s'
          };
        };
        return h('div', { className: 'space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200' },
          headerEl,
          // Net value display
          h('div', { className: 'bg-white rounded-xl border-2 border-rose-200 p-4 text-center' },
            h('p', { className: 'text-xs font-bold text-rose-700' }, __alloT('stem.manipulatives.net_value_yellow_red', 'Net value (yellow − red):')),
            h('p', { className: 'text-5xl font-black ' + (net > 0 ? 'text-emerald-700' : net < 0 ? 'text-rose-700' : 'text-slate-600') },
              (net > 0 ? '+' : '') + net
            ),
            zeroPairs > 0 && h('p', { className: 'text-[11px] text-slate-600 mt-1' },
              zeroPairs + ' zero pair' + (zeroPairs === 1 ? '' : 's') + ' (cancel each other out)'
            )
          ),
          // Counter pile display (drop targets for zero-pair drag)
          h('div', { className: 'grid grid-cols-2 gap-3' },
            h('div', {
                className: 'bg-amber-50 rounded-xl p-3 border-2 border-amber-200',
                style: dropZoneStyle('yellow'),
                onDragOver: function(e) { if (_m.ctDrag === 'red') { e.preventDefault(); } },
                onDrop: function(e) { e.preventDefault(); dropOn('yellow'); }
              },
              h('p', { className: 'text-xs font-bold text-amber-700 mb-2 text-center' }, '🟡 Yellow (positive): ' + counters.yellow),
              h('div', { className: 'flex flex-wrap gap-1 justify-center min-h-[80px]' },
                counters.yellow === 0
                  ? h('p', { className: 'text-[11px] italic text-slate-500 self-center' }, __alloT('stem.manipulatives.no_yellow_counters_yet', 'No yellow counters yet'))
                  : renderCounter(palette.counter2, counters.yellow, 'yellow')
              ),
              h('div', { className: 'flex gap-1 mt-2' },
                h('button', { onClick: function() { upd({ counters: Object.assign({}, counters, { yellow: counters.yellow + 1 }) }); sfxClick(); },
                  className: 'transition-colors flex-1 px-2 py-1 rounded text-[11px] font-bold bg-amber-600 text-white hover:bg-amber-700' }, __alloT('stem.manipulatives.yellow', '+ Yellow')),
                h('button', { onClick: function() { upd({ counters: Object.assign({}, counters, { yellow: counters.yellow + 5 }) }); sfxClick(); },
                  className: 'transition-colors flex-1 px-2 py-1 rounded text-[11px] font-bold bg-amber-700 text-white hover:bg-amber-800' }, __alloT('stem.manipulatives.5', '+ 5'))
              )
            ),
            h('div', {
                className: 'bg-rose-50 rounded-xl p-3 border-2 border-rose-200',
                style: dropZoneStyle('red'),
                onDragOver: function(e) { if (_m.ctDrag === 'yellow') { e.preventDefault(); } },
                onDrop: function(e) { e.preventDefault(); dropOn('red'); }
              },
              h('p', { className: 'text-xs font-bold text-rose-700 mb-2 text-center' }, '🔴 Red (negative): ' + counters.red),
              h('div', { className: 'flex flex-wrap gap-1 justify-center min-h-[80px]' },
                counters.red === 0
                  ? h('p', { className: 'text-[11px] italic text-slate-500 self-center' }, __alloT('stem.manipulatives.no_red_counters_yet', 'No red counters yet'))
                  : renderCounter(palette.counter1, counters.red, 'red')
              ),
              h('div', { className: 'flex gap-1 mt-2' },
                h('button', { onClick: function() { upd({ counters: Object.assign({}, counters, { red: counters.red + 1 }) }); sfxClick(); },
                  className: 'transition-colors flex-1 px-2 py-1 rounded text-[11px] font-bold bg-rose-600 text-white hover:bg-rose-700' }, __alloT('stem.manipulatives.red', '+ Red')),
                h('button', { onClick: function() { upd({ counters: Object.assign({}, counters, { red: counters.red + 5 }) }); sfxClick(); },
                  className: 'transition-colors flex-1 px-2 py-1 rounded text-[11px] font-bold bg-rose-700 text-white hover:bg-rose-800' }, __alloT('stem.manipulatives.5_2', '+ 5'))
              )
            )
          ),
          // Drag hint
          (counters.red > 0 && counters.yellow > 0) && h('p', { className: 'text-[11px] text-center text-emerald-700 italic' },
            __alloT('stem.manipulatives.tip_drag_a_yellow_onto_the_red_box_or_', '✋ Tip: drag a yellow onto the red box (or vice versa) to remove a zero pair.')
          ),
          // Actions
          h('div', { className: 'flex gap-2 justify-center' },
            h('button', { onClick: function() { upd({ counters: { red: 0, yellow: 0 } }); sfxClick(); announceToSR && announceToSR('Counters cleared'); },
              className: 'transition-colors px-3 py-1.5 rounded text-xs font-bold bg-slate-200 text-slate-700 hover:bg-slate-300' }, __alloT('stem.manipulatives.clear_all', '↺ Clear all')),
            zeroPairs > 0 && h('button', {
              onClick: function() { upd({ counters: { red: counters.red - zeroPairs, yellow: counters.yellow - zeroPairs } }); sfxRegroup(); announceToSR && announceToSR('Removed ' + zeroPairs + ' zero pairs'); },
              className: 'transition-colors px-3 py-1.5 rounded text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700' },
              '✂ Remove ' + zeroPairs + ' zero pair' + (zeroPairs === 1 ? '' : 's')
            )
          ),
          // Pedagogical note
          h('div', { className: 'bg-rose-50 rounded-lg p-3 border border-rose-100 text-xs text-rose-800' },
            '💡 ',
            net === 0 ? 'Net = 0. ' + (counters.red + counters.yellow > 0 ? 'All counters cancel out — that\'s ' + zeroPairs + ' zero pair' + (zeroPairs === 1 ? '' : 's') + '.' : 'Empty.') :
            'Equation: ', h('span', { className: 'font-mono font-bold' }, counters.yellow + ' + (−' + counters.red + ') = ' + (net > 0 ? '+' : '') + net),
            counters.red > 0 && counters.yellow > 0 && '. You could remove ' + zeroPairs + ' zero pair' + (zeroPairs === 1 ? '' : 's') + ' to simplify.'
          ),
          // ── Challenge sub-panel ──
          (function() {
            var genCtChallenge = function() {
              var types = ['matchNet', 'makeZero', 'addInteger'];
              var t = types[Math.floor(Math.random() * types.length)];
              if (t === 'matchNet') {
                var target = -8 + Math.floor(Math.random() * 17); // -8..8
                upd({ counterChallenge: { type: t, target: target, q: 'Arrange counters so the net value is ' + (target >= 0 ? '+' : '') + target + '.' }, counterFeedback: null });
              } else if (t === 'makeZero') {
                upd({ counterChallenge: { type: t, target: 0, q: 'Build a pile that nets to ZERO with at least 6 counters total.' }, counterFeedback: null });
              } else {
                var a = 1 + Math.floor(Math.random() * 6);
                var b = 1 + Math.floor(Math.random() * 6);
                var sign = Math.random() < 0.5 ? -1 : 1;
                var ans = a + sign * b;
                upd({ counterChallenge: { type: t, target: ans,
                  q: 'Show ' + a + ' + (' + (sign < 0 ? '−' : '+') + b + ') by arranging counters. (Hint: yellow = +1, red = −1.)' }, counterFeedback: null });
              }
            };
            var checkCt = function() {
              if (!counterChallenge) return;
              var ok;
              if (counterChallenge.type === 'makeZero') ok = net === 0 && (counters.red + counters.yellow) >= 6;
              else ok = net === counterChallenge.target;
              var newStreak = ok ? streak + 1 : 0;
              upd({
                counterFeedback: { ok: ok, msg: ok ? '✅ Correct! Net = ' + net : '❌ Currently net = ' + net + ', need ' + counterChallenge.target },
                score: { correct: score.correct + (ok ? 1 : 0), total: score.total + 1 },
                streak: newStreak
              });
              if (ok) {
                var newCts = (_m.counterSolved || 0) + 1;
                upd({ counterSolved: newCts });
                checkBadges({ counterSolved: newCts });
                if (soundEnabled) sfxCorrect();
                if (awardXP) awardXP('manip_counters', 3, 'counters challenge');
              } else if (soundEnabled) sfxWrong();
            };
            return h('div', { className: 'bg-white rounded-xl border-2 border-rose-300 p-3' },
              h('div', { className: 'flex items-center justify-between mb-2' },
                h('p', { className: 'text-xs font-bold text-rose-800 uppercase' }, __alloT('stem.manipulatives.integer_challenge', '🎯 Integer Challenge')),
                h('button', { onClick: genCtChallenge,
                  className: 'transition-colors px-3 py-1 rounded text-xs font-bold bg-rose-600 text-white hover:bg-rose-700' }, __alloT('stem.manipulatives.new_2', '🎲 New'))
              ),
              !counterChallenge && h('p', { className: 'text-xs text-rose-700 italic' },
                __alloT('stem.manipulatives.click_new_for_a_quick_problem_match_a_', 'Click "New" for a quick problem: match a net value, build a zero pile, or model an addition.')
              ),
              counterChallenge && h('div', { className: 'space-y-2' },
                h('p', { className: 'text-sm text-slate-800' }, counterChallenge.q),
                !counterFeedback && h('button', { onClick: checkCt,
                  className: 'transition-colors w-full px-3 py-1.5 rounded text-xs font-bold bg-rose-600 text-white hover:bg-rose-700' },
                  'Check (current net: ' + (net >= 0 ? '+' : '') + net + ')'
                ),
                counterFeedback && h('div', { className: 'space-y-1' },
                  h('p', { className: 'text-sm font-bold ' + (counterFeedback.ok ? 'text-green-700' : 'text-red-700') }, counterFeedback.msg),
                  h('button', { onClick: genCtChallenge,
                    className: 'transition-colors w-full px-3 py-1.5 rounded text-xs font-bold bg-rose-600 text-white hover:bg-rose-700' }, __alloT('stem.manipulatives.next_5', '🔄 Next'))
                )
              )
            );
          })()
        );
      }

      // ═══════════════════════════════════════════════════════════════
      // ── v3: PLACE-VALUE DISKS MODE ──
      // ═══════════════════════════════════════════════════════════════
      // Each disk labeled with its value. Click columns to add disks.
      // Regroup: 10 disks in any column → 1 disk in the next column up.
      if (manipMode === 'pvDisks') {
        var pvdTotal = pvDisks.ones + pvDisks.tens * 10 + pvDisks.hundreds * 100 + pvDisks.thousands * 1000;
        var canRegroup = pvDisks.ones >= 10 || pvDisks.tens >= 10 || pvDisks.hundreds >= 10;
        var doRegroup = function() {
          var nd = Object.assign({}, pvDisks);
          if (nd.ones >= 10) { nd.tens += Math.floor(nd.ones / 10); nd.ones = nd.ones % 10; }
          if (nd.tens >= 10) { nd.hundreds += Math.floor(nd.tens / 10); nd.tens = nd.tens % 10; }
          if (nd.hundreds >= 10) { nd.thousands += Math.floor(nd.hundreds / 10); nd.hundreds = nd.hundreds % 10; }
          upd({ pvDisks: nd });
          sfxRegroup();
          announceToSR && announceToSR('Regrouped. Now ' + (nd.ones + nd.tens * 10 + nd.hundreds * 100 + nd.thousands * 1000));
          checkBadges({ pvdRegroupDone: true });
        };
        var renderDiskColumn = function(place, value, label, color) {
          var disks = [];
          for (var di = 0; di < value; di++) {
            disks.push(h('div', { key: 'd-' + place + '-' + di, style: {
              width: 38, height: 38, borderRadius: '50%',
              background: color, border: '2px solid #0f172a',
              boxShadow: 'inset 0 2px 3px rgba(255,255,255,0.4), inset 0 -3px 4px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 'bold', fontSize: 10,
              marginTop: -8
            } }, label));
          }
          return h('div', { className: 'bg-white rounded-xl border-2 border-cyan-200 p-3' },
            h('p', { className: 'text-xs font-bold text-cyan-800 text-center mb-1' }, place + ' (' + label + ')'),
            h('p', { className: 'text-2xl font-black text-cyan-900 text-center mb-2' }, value),
            h('div', { className: 'min-h-[150px] flex flex-col items-center justify-end px-2' },
              value === 0
                ? h('span', { className: 'text-[11px] italic text-slate-400' }, 'empty')
                : disks.slice(0, Math.min(value, 12)),
              value > 12 && h('span', { className: 'text-[10px] text-cyan-600 mt-2' }, '+ ' + (value - 12) + ' more')
            ),
            h('div', { className: 'flex gap-1 mt-2' },
              h('button', {
                onClick: function() { var nd = Object.assign({}, pvDisks); nd[place] = value + 1; upd({ pvDisks: nd }); sfxClick(); },
                className: 'transition-colors flex-1 px-2 py-1 rounded text-[10px] font-bold bg-cyan-600 text-white hover:bg-cyan-700'
              }, '+'),
              h('button', {
                onClick: function() { var nd = Object.assign({}, pvDisks); nd[place] = Math.max(0, value - 1); upd({ pvDisks: nd }); sfxClick(); },
                className: 'transition-colors flex-1 px-2 py-1 rounded text-[10px] font-bold bg-cyan-200 text-cyan-800 hover:bg-cyan-300'
              }, '−')
            )
          );
        };
        return h('div', { className: 'space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200' },
          headerEl,
          h('div', { className: 'bg-white rounded-xl border-2 border-cyan-200 p-3 text-center' },
            h('p', { className: 'text-xs font-bold text-cyan-700' }, __alloT('stem.manipulatives.total_value', 'Total value:')),
            h('p', { className: 'text-4xl font-black text-cyan-900 font-mono' }, pvdTotal.toLocaleString())
          ),
          h('div', { className: 'grid grid-cols-4 gap-2' },
            renderDiskColumn('thousands', pvDisks.thousands, '1000', '#dc2626'),
            renderDiskColumn('hundreds', pvDisks.hundreds, '100', '#a855f7'),
            renderDiskColumn('tens', pvDisks.tens, '10', '#3b82f6'),
            renderDiskColumn('ones', pvDisks.ones, '1', '#10b981')
          ),
          h('div', { className: 'flex gap-2 justify-center' },
            canRegroup && h('button', { onClick: doRegroup,
              className: 'transition-colors px-4 py-2 rounded-lg text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-md animate-pulse' },
              '⇄ Regroup (' + (pvDisks.ones >= 10 ? '10 ones → 1 ten' : '') + (pvDisks.tens >= 10 ? '10 tens → 1 hundred' : '') + ')'
            ),
            h('button', { onClick: function() { upd({ pvDisks: { ones: 0, tens: 0, hundreds: 0, thousands: 0 } }); },
              className: 'transition-colors px-3 py-1.5 rounded text-xs font-bold bg-rose-100 text-rose-700 hover:bg-rose-200' }, __alloT('stem.manipulatives.clear_2', '↺ Clear'))
          ),
          h('div', { className: 'bg-cyan-50 rounded-lg p-3 border border-cyan-100 text-xs text-cyan-800' },
            __alloT('stem.manipulatives.each_disk_has_a_labeled_value_when_you', '💡 Each disk has a labeled value. When you have 10 disks of the same kind, you can trade them for 1 disk of the next-higher value. This is the conceptual bridge from blocks to the standard addition algorithm.')
          ),
          // ── Challenge sub-panel ──
          (function() {
            var genPvd = function() {
              var types = ['build', 'addAndRegroup', 'subtractWithUngroup'];
              var t = types[Math.floor(Math.random() * types.length)];
              if (t === 'build') {
                var n = 100 + Math.floor(Math.random() * 4900);
                upd({ pvdChallenge: { type: t, target: n, q: 'Build ' + n.toLocaleString() + ' using the fewest disks possible.' }, pvdFeedback: null, pvDisks: { ones: 0, tens: 0, hundreds: 0, thousands: 0 } });
              } else if (t === 'addAndRegroup') {
                var a = 100 + Math.floor(Math.random() * 400);
                var b = 100 + Math.floor(Math.random() * 400);
                upd({ pvdChallenge: { type: t, target: a + b, q: 'Build ' + a + ' + ' + b + ' = ?  Place all the disks, then regroup.' }, pvdFeedback: null, pvDisks: { ones: 0, tens: 0, hundreds: 0, thousands: 0 } });
              } else {
                var x = 200 + Math.floor(Math.random() * 700);
                var y = 100 + Math.floor(Math.random() * (x - 50));
                upd({ pvdChallenge: { type: t, target: x - y, q: 'Build ' + x + ', then take away ' + y + '. What disks remain?' }, pvdFeedback: null, pvDisks: { ones: 0, tens: 0, hundreds: 0, thousands: 0 } });
              }
            };
            var checkPvd = function() {
              if (!pvdChallenge) return;
              var total = pvDisks.ones + pvDisks.tens * 10 + pvDisks.hundreds * 100 + pvDisks.thousands * 1000;
              var ok;
              if (pvdChallenge.type === 'build') {
                // Fewest disks = canonical
                var diskCount = pvDisks.ones + pvDisks.tens + pvDisks.hundreds + pvDisks.thousands;
                var canonicalCount = 0;
                var rem = pvdChallenge.target;
                canonicalCount += Math.floor(rem / 1000); rem = rem % 1000;
                canonicalCount += Math.floor(rem / 100); rem = rem % 100;
                canonicalCount += Math.floor(rem / 10); rem = rem % 10;
                canonicalCount += rem;
                ok = total === pvdChallenge.target && diskCount === canonicalCount;
              } else {
                ok = total === pvdChallenge.target;
              }
              var newStreak = ok ? streak + 1 : 0;
              upd({
                pvdFeedback: { ok: ok, msg: ok ? '✅ Correct! Total = ' + total.toLocaleString() : '❌ Currently ' + total.toLocaleString() + ', need ' + pvdChallenge.target.toLocaleString() },
                score: { correct: score.correct + (ok ? 1 : 0), total: score.total + 1 },
                streak: newStreak
              });
              if (ok) { if (soundEnabled) sfxCorrect(); if (awardXP) awardXP('manip_pvd', 4, 'disks challenge'); }
              else if (soundEnabled) sfxWrong();
            };
            return h('div', { className: 'bg-white rounded-xl border-2 border-cyan-300 p-3' },
              h('div', { className: 'flex items-center justify-between mb-2' },
                h('p', { className: 'text-xs font-bold text-cyan-800 uppercase' }, __alloT('stem.manipulatives.disk_challenge', '🎯 Disk Challenge')),
                h('button', { onClick: genPvd,
                  className: 'transition-colors px-3 py-1 rounded text-xs font-bold bg-cyan-600 text-white hover:bg-cyan-700' }, __alloT('stem.manipulatives.new_3', '🎲 New'))
              ),
              !pvdChallenge && h('p', { className: 'text-xs text-cyan-700 italic' },
                __alloT('stem.manipulatives.build_a_number_add_and_regroup_or_mode', 'Build a number, add and regroup, or model subtraction with disks.')
              ),
              pvdChallenge && h('div', { className: 'space-y-2' },
                h('p', { className: 'text-sm text-slate-800' }, pvdChallenge.q),
                !pvdFeedback && h('button', { onClick: checkPvd,
                  className: 'transition-colors w-full px-3 py-1.5 rounded text-xs font-bold bg-cyan-600 text-white hover:bg-cyan-700' },
                  __alloT('stem.manipulatives.check_7', 'Check')
                ),
                pvdFeedback && h('div', { className: 'space-y-1' },
                  h('p', { className: 'text-sm font-bold ' + (pvdFeedback.ok ? 'text-green-700' : 'text-red-700') }, pvdFeedback.msg),
                  h('button', { onClick: genPvd,
                    className: 'transition-colors w-full px-3 py-1.5 rounded text-xs font-bold bg-cyan-600 text-white hover:bg-cyan-700' }, __alloT('stem.manipulatives.next_6', '🔄 Next'))
                )
              )
            );
          })()
        );
      }

      // ═══════════════════════════════════════════════════════════════
      // ── v3: HUNDREDS CHART MODE ──
      // ═══════════════════════════════════════════════════════════════
      // 10x10 grid of 1-100. Click to highlight. Skip-count overlay.
      if (manipMode === 'hundredsChart') {
        var renderHCCell = function(n) {
          var highlighted = !!hundredsHighlight[n];
          var isSkipCounted = hundredsSkipCount && n % hundredsSkipCount === 0;
          return h('button', {
            key: 'hc-' + n,
            onClick: function() {
              var nh = Object.assign({}, hundredsHighlight);
              if (nh[n]) delete nh[n]; else nh[n] = true;
              upd({ hundredsHighlight: nh });
              sfxClick();
            },
            'aria-label': 'Number ' + n + (highlighted ? ', highlighted' : '') + (isSkipCounted ? ', skip-count match' : ''),
            className: 'aspect-square text-xs font-bold transition-all rounded border ' +
              (highlighted ? 'bg-green-500 text-white border-green-700' :
               isSkipCounted ? 'bg-blue-100 text-blue-900 border-blue-300' :
               'bg-white text-slate-700 border-slate-200 hover:bg-slate-100')
          }, n);
        };
        var cells = [];
        for (var hi = 1; hi <= 100; hi++) cells.push(renderHCCell(hi));
        return h('div', { className: 'space-y-3 max-w-3xl mx-auto animate-in fade-in duration-200' },
          headerEl,
          h('div', { className: 'bg-white rounded-xl border-2 border-green-200 p-3' },
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 2 } }, cells)
          ),
          h('div', { className: 'bg-green-50 rounded-xl p-3 border border-green-200' },
            h('p', { className: 'text-xs font-bold text-green-700 mb-2' }, __alloT('stem.manipulatives.skip_count_overlay_highlights_multiple', 'Skip-count overlay (highlights multiples):')),
            h('div', { className: 'flex gap-1 flex-wrap' },
              [null, 2, 3, 5, 10].map(function(sc) {
                var active = hundredsSkipCount === sc;
                return h('button', { key: 'sc-' + sc,
                  onClick: function() { upd({ hundredsSkipCount: sc }); },
                  className: 'px-3 py-1 rounded text-xs font-bold transition-all ' +
                    (active ? 'bg-green-700 text-white' : 'bg-white text-green-700 border border-green-300 hover:bg-green-100')
                }, sc === null ? 'Off' : 'Skip ' + sc + 's');
              })
            ),
            hundredsSkipCount && h('p', { className: 'text-[11px] text-green-700 italic mt-2' },
              'Blue cells are multiples of ' + hundredsSkipCount + '. There are ' + Math.floor(100 / hundredsSkipCount) + ' multiples between 1 and 100.'
            )
          ),
          h('div', { className: 'flex gap-2 justify-center' },
            h('button', { onClick: function() { upd({ hundredsHighlight: {} }); },
              className: 'transition-colors px-3 py-1.5 rounded text-xs font-bold bg-rose-100 text-rose-700 hover:bg-rose-200' }, __alloT('stem.manipulatives.clear_highlights', '↺ Clear highlights')),
            h('button', { onClick: function() {
              var nh = {};
              for (var p = 2; p <= 100; p++) {
                var isPrime = true;
                for (var pp = 2; pp * pp <= p; pp++) if (p % pp === 0) { isPrime = false; break; }
                if (isPrime) nh[p] = true;
              }
              upd({ hundredsHighlight: nh });
              checkBadges({ hcPrimesShown: true });
            },
              className: 'transition-colors px-3 py-1.5 rounded text-xs font-bold bg-violet-600 text-white hover:bg-violet-700' }, __alloT('stem.manipulatives.show_primes', '🔢 Show primes')),
            h('button', { onClick: function() {
              var f = parseInt(prompt('Highlight multiples of which number?', '7') || '0', 10);
              if (!f || f < 2 || f > 99) return;
              var nh = {};
              for (var k = f; k <= 100; k += f) nh[k] = true;
              upd({ hundredsHighlight: nh });
            },
              className: 'transition-colors px-3 py-1.5 rounded text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700' }, __alloT('stem.manipulatives.multiples_of_n', '× Multiples of n')),
            h('button', { onClick: function() {
              // Sieve of Eratosthenes step: highlight all composites
              var nh = {};
              for (var k = 2; k <= 100; k++) {
                for (var d = 2; d < k; d++) if (k % d === 0) { nh[k] = true; break; }
              }
              upd({ hundredsHighlight: nh });
            },
              className: 'transition-colors px-3 py-1.5 rounded text-xs font-bold bg-rose-600 text-white hover:bg-rose-700' }, __alloT('stem.manipulatives.composites', '🚫 Composites'))
          ),
          // ── Challenge sub-panel ──
          (function() {
            var genHc = function() {
              var types = ['skipFind', 'multiple', 'prime', 'pattern'];
              var t = types[Math.floor(Math.random() * types.length)];
              if (t === 'skipFind') {
                var step = [2, 3, 5, 10][Math.floor(Math.random() * 4)];
                var nth = 3 + Math.floor(Math.random() * 8);
                upd({ hcChallenge: { type: t, q: 'Skip-count by ' + step + 's. Click the ' + nth + 'th number you land on.', target: step * nth }, hcFeedback: null });
              } else if (t === 'multiple') {
                var bases = [3, 4, 6, 7, 8, 9, 11];
                var b = bases[Math.floor(Math.random() * bases.length)];
                var mult = 2 + Math.floor(Math.random() * Math.floor(100 / b));
                upd({ hcChallenge: { type: t, q: 'Click any multiple of ' + b + ' greater than 20.', target: null, validator: function(n) { return n % b === 0 && n > 20; } }, hcFeedback: null });
              } else if (t === 'prime') {
                upd({ hcChallenge: { type: t, q: 'Click any prime number between 30 and 70.', target: null, validator: function(n) {
                  if (n < 30 || n > 70) return false;
                  for (var d = 2; d * d <= n; d++) if (n % d === 0) return false;
                  return n > 1;
                } }, hcFeedback: null });
              } else {
                var diff = 2 + Math.floor(Math.random() * 8);
                var startSeq = 1 + Math.floor(Math.random() * 9);
                upd({ hcChallenge: { type: t, q: 'In the pattern starting at ' + startSeq + ' and adding ' + diff + ' each step, click the 4th number.', target: startSeq + 3 * diff }, hcFeedback: null });
              }
            };
            var checkHc = function() {
              if (!hcChallenge) return;
              // Last highlighted cell — newest key
              var highlighted = Object.keys(hundredsHighlight).map(Number);
              if (highlighted.length === 0) return;
              var picked = highlighted[highlighted.length - 1];
              var ok;
              if (hcChallenge.validator) ok = hcChallenge.validator(picked);
              else ok = picked === hcChallenge.target;
              var newStreak = ok ? streak + 1 : 0;
              upd({
                hcFeedback: { ok: ok, msg: ok ? '✅ Correct! You clicked ' + picked : '❌ You clicked ' + picked + (hcChallenge.target ? ', target was ' + hcChallenge.target : '') },
                score: { correct: score.correct + (ok ? 1 : 0), total: score.total + 1 },
                streak: newStreak
              });
              if (ok) { if (soundEnabled) sfxCorrect(); if (awardXP) awardXP('manip_hc', 3, 'hundreds chart'); }
              else if (soundEnabled) sfxWrong();
            };
            return h('div', { className: 'bg-white rounded-xl border-2 border-green-300 p-3' },
              h('div', { className: 'flex items-center justify-between mb-2' },
                h('p', { className: 'text-xs font-bold text-green-800 uppercase' }, __alloT('stem.manipulatives.chart_challenge', '🎯 Chart Challenge')),
                h('button', { onClick: genHc,
                  className: 'transition-colors px-3 py-1 rounded text-xs font-bold bg-green-600 text-white hover:bg-green-700' }, __alloT('stem.manipulatives.new_4', '🎲 New'))
              ),
              !hcChallenge && h('p', { className: 'text-xs text-green-700 italic' },
                __alloT('stem.manipulatives.click_a_chart_cell_then_check_we_score', 'Click a chart cell, then "Check" — we score based on which cell you most recently clicked.')
              ),
              hcChallenge && h('div', { className: 'space-y-2' },
                h('p', { className: 'text-sm text-slate-800' }, hcChallenge.q),
                !hcFeedback && h('button', { onClick: checkHc,
                  className: 'transition-colors w-full px-3 py-1.5 rounded text-xs font-bold bg-green-600 text-white hover:bg-green-700' },
                  __alloT('stem.manipulatives.check_last_clicked_cell', 'Check (last clicked cell)')
                ),
                hcFeedback && h('div', { className: 'space-y-1' },
                  h('p', { className: 'text-sm font-bold ' + (hcFeedback.ok ? 'text-green-700' : 'text-red-700') }, hcFeedback.msg),
                  h('button', { onClick: function() { upd({ hundredsHighlight: {} }); genHc(); },
                    className: 'transition-colors w-full px-3 py-1.5 rounded text-xs font-bold bg-green-600 text-white hover:bg-green-700' }, __alloT('stem.manipulatives.next_clears_chart', '🔄 Next (clears chart)'))
                )
              )
            );
          })()
        );
      }

      // ═══════════════════════════════════════════════════════════════
      // ── v3: PATTERN BLOCKS MODE ──
      // ═══════════════════════════════════════════════════════════════
      if (manipMode === 'patternBlocks') {
        var PB_SHAPES = [
          { id: 'hex',          name: __alloT('stem.manipulatives.hexagon', 'Hexagon'),       color: '#fbbf24', value: 1,    sides: 6, fraction: '1'    },
          { id: 'trap',         name: __alloT('stem.manipulatives.trapezoid', 'Trapezoid'),     color: '#dc2626', value: 0.5,  sides: 4, fraction: '1/2'  },
          { id: 'rhombus_blue', name: __alloT('stem.manipulatives.blue_rhombus', 'Blue rhombus'),  color: '#3b82f6', value: 1/3,  sides: 4, fraction: '1/3'  },
          { id: 'triangle',     name: __alloT('stem.manipulatives.triangle', 'Triangle'),      color: '#16a34a', value: 1/6,  sides: 3, fraction: '1/6'  },
          { id: 'square',       name: __alloT('stem.manipulatives.square', 'Square'),        color: '#f97316', value: null, sides: 4, fraction: 'n/a' },
          { id: 'rhombus_tan',  name: __alloT('stem.manipulatives.tan_rhombus', 'Tan rhombus'),   color: '#a16207', value: null, sides: 4, fraction: 'n/a' }
        ];
        // ── v3.1: SVG polygon coordinates for each true pattern-block shape ──
        // Centered at (cx, cy); all sized so 1 hexagon fits in a 60x60 viewBox.
        // The hexagon has side length 20 → height 20*√3 ≈ 34.64.
        // Each sub-shape uses the same side length so visual ratios are correct.
        var pbPolyPoints = function(type, cx, cy, sideLen) {
          var s = sideLen, sq = s * Math.sqrt(3) / 2;
          if (type === 'hex') {
            return [
              [cx + s,     cy        ],
              [cx + s / 2, cy - sq   ],
              [cx - s / 2, cy - sq   ],
              [cx - s,     cy        ],
              [cx - s / 2, cy + sq   ],
              [cx + s / 2, cy + sq   ]
            ];
          }
          if (type === 'trap') {
            return [
              [cx + s,     cy + sq / 2],
              [cx + s / 2, cy - sq / 2],
              [cx - s / 2, cy - sq / 2],
              [cx - s,     cy + sq / 2]
            ];
          }
          if (type === 'rhombus_blue') {
            // 60-120 rhombus, two equilateral triangles joined on a side
            return [
              [cx,     cy - sq],
              [cx + s, cy     ],
              [cx,     cy + sq],
              [cx - s, cy     ]
            ];
          }
          if (type === 'triangle') {
            // equilateral triangle, side s
            return [
              [cx,         cy - sq * 2 / 3],
              [cx + s / 2, cy + sq / 3    ],
              [cx - s / 2, cy + sq / 3    ]
            ];
          }
          if (type === 'square') {
            var half = s * 0.85;  // visually similar weight
            return [
              [cx - half, cy - half],
              [cx + half, cy - half],
              [cx + half, cy + half],
              [cx - half, cy + half]
            ];
          }
          if (type === 'rhombus_tan') {
            // narrow 30-150 rhombus
            var longH = s * Math.cos(Math.PI / 12) * 1.3;   // ~15° axis
            var shortH = s * Math.sin(Math.PI / 12) * 1.3;
            return [
              [cx,         cy - shortH],
              [cx + longH, cy         ],
              [cx,         cy + shortH],
              [cx - longH, cy         ]
            ];
          }
          return [[cx - s, cy - s], [cx + s, cy - s], [cx + s, cy + s], [cx - s, cy + s]];
        };
        var pbSvg = function(type, color, size) {
          var pts = pbPolyPoints(type, size / 2, size / 2, size * 0.32);
          return h('svg', {
            width: size, height: size, viewBox: '0 0 ' + size + ' ' + size,
            style: { display: 'block' }
          },
            h('polygon', {
              points: pts.map(function(p) { return p[0].toFixed(2) + ',' + p[1].toFixed(2); }).join(' '),
              fill: color, stroke: '#0f172a', strokeWidth: 1.5, strokeLinejoin: 'round'
            })
          );
        };

        var totalValue = patternBlocks.reduce(function(acc, b) {
          var shape = PB_SHAPES.find(function(s) { return s.id === b.type; });
          return acc + (shape && shape.value ? shape.value : 0);
        }, 0);
        return h('div', { className: 'space-y-3 max-w-3xl mx-auto animate-in fade-in duration-200' },
          headerEl,
          h('div', { className: 'bg-white rounded-xl border-2 border-purple-200 p-3' },
            h('p', { className: 'text-xs font-bold text-purple-700 mb-2' }, __alloT('stem.manipulatives.shape_palette_click_to_add_to_workspac', 'Shape palette (click to add to workspace):')),
            h('div', { className: 'grid grid-cols-6 gap-2' },
              PB_SHAPES.map(function(s) {
                return h('button', { key: 'pb-' + s.id,
                  'aria-label': 'Add a ' + s.name,
                  onClick: function() {
                    var np = patternBlocks.concat([{ type: s.id, x: Math.random() * 200, y: Math.random() * 100, rotation: 0 }]);
                    upd({ patternBlocks: np, pbCurrentShape: s.id });
                    sfxClick();
                  },
                  className: 'p-2 rounded-lg border-2 hover:shadow-md text-center bg-white transition-all hover:scale-105',
                  style: { borderColor: s.color }
                },
                  h('div', { className: 'flex justify-center' }, pbSvg(s.id, s.color, 44)),
                  h('p', { className: 'text-[10px] font-bold text-slate-700 mt-1' }, s.name),
                  h('p', { className: 'text-[10px] text-slate-500 font-mono' }, s.fraction)
                );
              })
            )
          ),
          h('div', { className: 'bg-purple-50 rounded-xl border-2 border-purple-200 p-3' },
            h('div', { className: 'flex items-center justify-between mb-2' },
              h('p', { className: 'text-xs font-bold text-purple-700' }, 'Workspace (' + patternBlocks.length + ' shapes):'),
              h('button', { onClick: function() { upd({ patternBlocks: [] }); },
                className: 'transition-colors px-2 py-1 rounded text-[10px] font-bold bg-rose-100 text-rose-700 hover:bg-rose-200' }, __alloT('stem.manipulatives.clear_3', '↺ Clear'))
            ),
            patternBlocks.length === 0
              ? h('p', { className: 'text-[11px] italic text-slate-500 text-center py-4' }, __alloT('stem.manipulatives.empty_workspace_click_a_shape_above_to', 'Empty workspace. Click a shape above to add it. Click a workspace shape to remove it.'))
              : h('div', { className: 'flex flex-wrap gap-1 justify-center', style: { filter: 'drop-shadow(0 2px 2px rgba(15,23,42,0.25))' } },
                  patternBlocks.map(function(b, i) {
                    var shape = PB_SHAPES.find(function(s) { return s.id === b.type; });
                    if (!shape) return null;
                    return h('button', {
                      key: 'pbw-' + i,
                      onClick: function() { upd({ patternBlocks: patternBlocks.filter(function(_, j) { return j !== i; }) }); },
                      title: 'Click to remove this ' + shape.name,
                      'aria-label': 'Remove ' + shape.name,
                      style: { background: 'transparent', border: 'none', padding: 2, cursor: 'pointer' }
                    }, pbSvg(b.type, shape.color, 56));
                  })
                ),
            patternBlocks.length > 0 && h('p', { className: 'text-[11px] text-purple-700 mt-2 text-center font-bold' },
              __alloT('stem.manipulatives.total_fractional_value_in_hexagons', 'Total fractional value (in hexagons): '), h('span', { className: 'font-mono' }, totalValue.toFixed(3)),
              totalValue === Math.floor(totalValue) && totalValue > 0 && ' = ' + totalValue + ' whole hexagon' + (totalValue === 1 ? '' : 's')
            )
          ),
          h('div', { className: 'bg-purple-50 rounded-lg p-3 border border-purple-100 text-xs text-purple-800' },
            __alloT('stem.manipulatives.fraction_relationships_1_hexagon_2_tra', '💡 Fraction relationships: 1 hexagon = 2 trapezoids = 3 blue rhombi = 6 triangles. '),
            __alloT('stem.manipulatives.so_1_trapezoid_1_2_of_a_hexagon_1_rhom', 'So 1 trapezoid = 1/2 of a hexagon, 1 rhombus = 1/3, 1 triangle = 1/6. '),
            __alloT('stem.manipulatives.mix_shapes_that_add_up_to_hexagons_to_', 'Mix shapes that add up to hexagons to explore equivalent fractions visually.')
          ),
          // ── Challenge sub-panel ──
          (function() {
            var genPb = function() {
              var puzzles = [
                { q: 'Cover one hexagon using ONLY trapezoids. (Goal: total = 1)', target: 1, mustUse: 'trap' },
                { q: 'Cover one hexagon using ONLY blue rhombi.', target: 1, mustUse: 'rhombus_blue' },
                { q: 'Cover one hexagon using ONLY triangles.', target: 1, mustUse: 'triangle' },
                { q: 'Make exactly 1½ hexagons using any mix.', target: 1.5, mustUse: null },
                { q: 'Make exactly 1/2 using two DIFFERENT shapes (one trapezoid is fine, but also try 3 triangles).', target: 0.5, mustUse: null, minVariety: 1 },
                { q: 'Build a value of 2 using exactly 6 pieces.', target: 2, mustUse: null, exactCount: 6 },
                { q: 'Make exactly 2/3 using only blue rhombi.', target: 2/3, mustUse: 'rhombus_blue' },
                { q: 'Make exactly 5/6 using exactly 5 triangles.', target: 5/6, mustUse: 'triangle', exactCount: 5 }
              ];
              var p = puzzles[Math.floor(Math.random() * puzzles.length)];
              upd({ pbChallenge: p, pbFeedback: null, patternBlocks: [] });
            };
            var checkPb = function() {
              if (!pbChallenge) return;
              var total = patternBlocks.reduce(function(acc, b) {
                var s = PB_SHAPES.find(function(x) { return x.id === b.type; });
                return acc + (s && s.value ? s.value : 0);
              }, 0);
              var valOk = Math.abs(total - pbChallenge.target) < 0.001;
              var useOk = true;
              if (pbChallenge.mustUse) {
                useOk = patternBlocks.every(function(b) {
                  var s = PB_SHAPES.find(function(x) { return x.id === b.type; });
                  return !s || !s.value || b.type === pbChallenge.mustUse;
                });
              }
              var countOk = pbChallenge.exactCount == null || patternBlocks.length === pbChallenge.exactCount;
              var ok = valOk && useOk && countOk;
              var newStreak = ok ? streak + 1 : 0;
              var msgParts = [];
              if (!valOk) msgParts.push('value is ' + total.toFixed(3) + ', need ' + pbChallenge.target);
              if (!useOk) msgParts.push('only use ' + pbChallenge.mustUse);
              if (!countOk) msgParts.push('use exactly ' + pbChallenge.exactCount + ' pieces (you have ' + patternBlocks.length + ')');
              upd({
                pbFeedback: { ok: ok, msg: ok ? '✅ Correct! Value = ' + total.toFixed(3) : '❌ ' + msgParts.join('; ') },
                score: { correct: score.correct + (ok ? 1 : 0), total: score.total + 1 },
                streak: newStreak
              });
              if (ok) {
                if (Math.abs(pbChallenge.target - 1) < 0.001) checkBadges({ pbHexCovered: true });
                if (soundEnabled) sfxCorrect();
                if (awardXP) awardXP('manip_pb', 4, 'pattern blocks');
              } else if (soundEnabled) sfxWrong();
            };
            return h('div', { className: 'bg-white rounded-xl border-2 border-purple-300 p-3' },
              h('div', { className: 'flex items-center justify-between mb-2' },
                h('p', { className: 'text-xs font-bold text-purple-800 uppercase' }, __alloT('stem.manipulatives.fraction_puzzle', '🎯 Fraction Puzzle')),
                h('button', { onClick: genPb,
                  className: 'transition-colors px-3 py-1 rounded text-xs font-bold bg-purple-600 text-white hover:bg-purple-700' }, __alloT('stem.manipulatives.new_5', '🎲 New'))
              ),
              !pbChallenge && h('p', { className: 'text-xs text-purple-700 italic' },
                __alloT('stem.manipulatives.cover_a_hexagon_build_a_target_value_o', 'Cover a hexagon, build a target value, or compose fractions out of mixed shapes.')
              ),
              pbChallenge && h('div', { className: 'space-y-2' },
                h('p', { className: 'text-sm text-slate-800' }, pbChallenge.q),
                !pbFeedback && h('button', { onClick: checkPb,
                  className: 'transition-colors w-full px-3 py-1.5 rounded text-xs font-bold bg-purple-600 text-white hover:bg-purple-700' },
                  'Check (current = ' + totalValue.toFixed(3) + ')'
                ),
                pbFeedback && h('div', { className: 'space-y-1' },
                  h('p', { className: 'text-sm font-bold ' + (pbFeedback.ok ? 'text-green-700' : 'text-red-700') }, pbFeedback.msg),
                  h('button', { onClick: genPb,
                    className: 'transition-colors w-full px-3 py-1.5 rounded text-xs font-bold bg-purple-600 text-white hover:bg-purple-700' }, __alloT('stem.manipulatives.next_7', '🔄 Next'))
                )
              )
            );
          })()
        );
      }

      // ═══════════════════════════════════════════════════════════════
      // ── v3: GEOBOARD MODE ──
      // ═══════════════════════════════════════════════════════════════
      // SVG grid of pegs. Click pegs to add segments. Compute perimeter/area.
      if (manipMode === 'geoboard') {
        var GB_SIZE = geoboardSize;
        var GB_SPACING = 40;
        var GB_OFFSET = 24;
        var pegs = [];
        for (var py = 0; py < GB_SIZE; py++) {
          for (var px = 0; px < GB_SIZE; px++) {
            pegs.push(h('circle', {
              key: 'peg-' + px + '-' + py,
              cx: GB_OFFSET + px * GB_SPACING, cy: GB_OFFSET + py * GB_SPACING, r: 4,
              fill: '#1f2937', stroke: '#fff', strokeWidth: 1,
              style: { cursor: 'pointer' },
              onClick: function(x, y) { return function() {
                if (!geoboardSelected) {
                  upd({ geoboardSelected: { x: x, y: y } });
                  sfxClick();
                } else {
                  // Add segment from selected to clicked
                  if (geoboardSelected.x === x && geoboardSelected.y === y) {
                    // Same peg — cancel
                    upd({ geoboardSelected: null });
                  } else {
                    var newSegs = geoboardSegments.concat([{ x1: geoboardSelected.x, y1: geoboardSelected.y, x2: x, y2: y }]);
                    upd({ geoboardSegments: newSegs, geoboardSelected: null });
                    sfxClick();
                  }
                }
              }; }(px, py)
            }));
          }
        }
        // Highlight selected
        if (geoboardSelected) {
          pegs.push(h('circle', {
            key: 'sel',
            cx: GB_OFFSET + geoboardSelected.x * GB_SPACING, cy: GB_OFFSET + geoboardSelected.y * GB_SPACING, r: 10,
            fill: 'none', stroke: '#ef4444', strokeWidth: 2
          }));
        }
        // Render existing segments
        var segElements = geoboardSegments.map(function(s, i) {
          return h('line', {
            key: 'seg-' + i,
            x1: GB_OFFSET + s.x1 * GB_SPACING, y1: GB_OFFSET + s.y1 * GB_SPACING,
            x2: GB_OFFSET + s.x2 * GB_SPACING, y2: GB_OFFSET + s.y2 * GB_SPACING,
            stroke: palette.geoboard, strokeWidth: 3
          });
        });
        // Compute perimeter
        var perimeter = geoboardSegments.reduce(function(acc, s) {
          return acc + Math.sqrt((s.x2 - s.x1) * (s.x2 - s.x1) + (s.y2 - s.y1) * (s.y2 - s.y1));
        }, 0);
        var svgW = GB_OFFSET * 2 + (GB_SIZE - 1) * GB_SPACING;
        return h('div', { className: 'space-y-3 max-w-3xl mx-auto animate-in fade-in duration-200' },
          headerEl,
          h('div', { className: 'bg-white rounded-xl border-2 border-sky-200 p-3 flex justify-center' },
            h('svg', { viewBox: '0 0 ' + svgW + ' ' + svgW, width: '100%', style: { maxWidth: svgW + 'px' } },
              segElements,
              pegs
            )
          ),
          h('div', { className: 'grid grid-cols-3 gap-2' },
            h('div', { className: 'bg-sky-50 rounded p-2 border border-sky-200 text-center' },
              h('p', { className: 'text-[10px] font-bold text-sky-700' }, __alloT('stem.manipulatives.segments', 'Segments')),
              h('p', { className: 'text-xl font-black text-sky-900' }, geoboardSegments.length)
            ),
            h('div', { className: 'bg-sky-50 rounded p-2 border border-sky-200 text-center' },
              h('p', { className: 'text-[10px] font-bold text-sky-700' }, __alloT('stem.manipulatives.perimeter_units', 'Perimeter (units)')),
              h('p', { className: 'text-xl font-black text-sky-900' }, perimeter.toFixed(2))
            ),
            h('div', { className: 'bg-sky-50 rounded p-2 border border-sky-200 text-center' },
              h('p', { className: 'text-[10px] font-bold text-sky-700' }, __alloT('stem.manipulatives.grid_size', 'Grid size')),
              h('p', { className: 'text-xl font-black text-sky-900' }, GB_SIZE + '×' + GB_SIZE)
            )
          ),
          h('div', { className: 'flex gap-2 justify-center' },
            h('button', { onClick: function() { upd({ geoboardSegments: [], geoboardSelected: null }); },
              className: 'transition-colors px-3 py-1.5 rounded text-xs font-bold bg-rose-100 text-rose-700 hover:bg-rose-200' }, __alloT('stem.manipulatives.clear_4', '↺ Clear')),
            h('button', { onClick: function() { upd({ geoboardSize: Math.min(10, GB_SIZE + 1), geoboardSegments: [], geoboardSelected: null }); },
              className: 'transition-colors px-3 py-1.5 rounded text-xs font-bold bg-sky-100 text-sky-700 hover:bg-sky-200' }, __alloT('stem.manipulatives.larger_grid', '+ Larger grid')),
            h('button', { onClick: function() { upd({ geoboardSize: Math.max(3, GB_SIZE - 1), geoboardSegments: [], geoboardSelected: null }); },
              className: 'transition-colors px-3 py-1.5 rounded text-xs font-bold bg-sky-100 text-sky-700 hover:bg-sky-200' }, __alloT('stem.manipulatives.smaller_grid', '− Smaller grid'))
          ),
          h('div', { className: 'bg-sky-50 rounded-lg p-3 border border-sky-100 text-xs text-sky-800' },
            __alloT('stem.manipulatives.click_any_two_pegs_to_draw_a_segment_b', '💡 Click any two pegs to draw a segment between them. Build polygons. '),
            geoboardSelected ? 'Selected peg highlighted in red — click another peg to draw, or click the same peg to cancel.' :
            'Click a peg to start a segment.'
          ),
          // ── Challenge sub-panel ──
          (function() {
            var genGb = function() {
              var puzzles = [
                { q: 'Build any rectangle with perimeter 10.', type: 'perim', target: 10 },
                { q: 'Build any rectangle with perimeter 12.', type: 'perim', target: 12 },
                { q: 'Build any rectangle with perimeter 14.', type: 'perim', target: 14 },
                { q: 'Build any rectangle with perimeter 16.', type: 'perim', target: 16 },
                { q: 'Build a triangle (3 segments, all pegs different).', type: 'tri', segs: 3 },
                { q: 'Build a quadrilateral (4 segments forming a closed shape).', type: 'quad', segs: 4 },
                { q: 'Build a pentagon (5 segments).', type: 'penta', segs: 5 },
                { q: 'Make a square with side length 3 (perimeter = 12).', type: 'perim', target: 12 },
                { q: 'Build any closed shape with perimeter ≥ 20.', type: 'perimGte', target: 20 }
              ];
              var p = puzzles[Math.floor(Math.random() * puzzles.length)];
              upd({ gbChallenge: p, gbFeedback: null, geoboardSegments: [], geoboardSelected: null });
            };
            // ── v3.2 FIX: real validation, not just segment-length sum ──
            // A "rectangle with perimeter X" must (a) be closed, (b) have 4 axis-aligned sides
            // with right angles, AND (c) sum to X. A "polygon with N segs" must be a closed
            // cycle of N segments where each peg appears in exactly 2 segments.
            var segsFormClosedCycle = function(segs) {
              if (segs.length < 3) return false;
              // Build adjacency: peg-key → [other peg-keys]
              var key = function(x, y) { return x + ',' + y; };
              var adj = {};
              for (var i = 0; i < segs.length; i++) {
                var s = segs[i];
                var a = key(s.x1, s.y1), b = key(s.x2, s.y2);
                if (a === b) return false; // zero-length
                (adj[a] = adj[a] || []).push(b);
                (adj[b] = adj[b] || []).push(a);
              }
              var pegs = Object.keys(adj);
              // Every peg used in exactly 2 segments (entry + exit of the cycle)
              for (var p = 0; p < pegs.length; p++) {
                if (adj[pegs[p]].length !== 2) return false;
              }
              // Cycle must visit all pegs — walk from any starting peg
              if (pegs.length !== segs.length) return false;
              var visited = {};
              var cur = pegs[0];
              var prev = null;
              for (var step = 0; step < segs.length; step++) {
                visited[cur] = true;
                var nbrs = adj[cur];
                var nxt = nbrs[0] === prev ? nbrs[1] : nbrs[0];
                prev = cur;
                cur = nxt;
              }
              return cur === pegs[0] && Object.keys(visited).length === segs.length;
            };
            var segsFormAxisRect = function(segs) {
              if (segs.length !== 4) return false;
              if (!segsFormClosedCycle(segs)) return false;
              // Collect unique x and y coordinates from the 4 corners
              var xs = {}, ys = {};
              for (var i = 0; i < segs.length; i++) {
                xs[segs[i].x1] = true; xs[segs[i].x2] = true;
                ys[segs[i].y1] = true; ys[segs[i].y2] = true;
              }
              if (Object.keys(xs).length !== 2 || Object.keys(ys).length !== 2) return false;
              // Each segment must be either horizontal or vertical
              for (var j = 0; j < segs.length; j++) {
                var sx = segs[j].x1 === segs[j].x2;
                var sy = segs[j].y1 === segs[j].y2;
                if (!sx && !sy) return false;
              }
              return true;
            };
            var checkGb = function() {
              if (!gbChallenge) return;
              var per = geoboardSegments.reduce(function(acc, s) {
                return acc + Math.sqrt((s.x2 - s.x1) * (s.x2 - s.x1) + (s.y2 - s.y1) * (s.y2 - s.y1));
              }, 0);
              var ok = false, msg = '';
              if (gbChallenge.type === 'perim') {
                // Must be an axis-aligned rectangle of the right perimeter
                var isRect = segsFormAxisRect(geoboardSegments);
                var perOk = Math.abs(per - gbChallenge.target) < 0.05;
                ok = isRect && perOk;
                if (!isRect) msg = '❌ Not a closed rectangle (need 4 axis-aligned sides forming a closed cycle). You have ' + geoboardSegments.length + ' segments.';
                else if (!perOk) msg = '❌ Rectangle perimeter = ' + per.toFixed(2) + ', target was ' + gbChallenge.target;
                else msg = '✅ Rectangle with perimeter ' + per.toFixed(2);
              } else if (gbChallenge.type === 'perimGte') {
                var closed = segsFormClosedCycle(geoboardSegments);
                ok = closed && per >= gbChallenge.target;
                if (!closed) msg = '❌ Not a closed shape (each corner peg must touch exactly 2 segments).';
                else if (per < gbChallenge.target) msg = '❌ Closed shape, but perimeter = ' + per.toFixed(2) + ', need ≥ ' + gbChallenge.target;
                else msg = '✅ Closed shape with perimeter ' + per.toFixed(2);
              } else {
                // tri / quad / penta — N segments forming a single closed cycle
                var hasN = geoboardSegments.length === gbChallenge.segs;
                var isClosed = hasN && segsFormClosedCycle(geoboardSegments);
                ok = hasN && isClosed;
                if (!hasN) msg = '❌ You have ' + geoboardSegments.length + ' segments, need exactly ' + gbChallenge.segs;
                else if (!isClosed) msg = '❌ ' + geoboardSegments.length + ' segments but they do not form a closed shape.';
                else msg = '✅ Closed ' + geoboardSegments.length + '-sided shape.';
              }
              var newStreak = ok ? streak + 1 : 0;
              upd({
                gbFeedback: { ok: ok, msg: msg },
                score: { correct: score.correct + (ok ? 1 : 0), total: score.total + 1 },
                streak: newStreak
              });
              if (ok) { if (soundEnabled) sfxCorrect(); if (awardXP) awardXP('manip_gb', 4, 'geoboard'); }
              else if (soundEnabled) sfxWrong();
            };
            return h('div', { className: 'bg-white rounded-xl border-2 border-sky-300 p-3' },
              h('div', { className: 'flex items-center justify-between mb-2' },
                h('p', { className: 'text-xs font-bold text-sky-800 uppercase' }, __alloT('stem.manipulatives.geoboard_challenge', '🎯 Geoboard Challenge')),
                h('button', { onClick: genGb,
                  className: 'transition-colors px-3 py-1 rounded text-xs font-bold bg-sky-600 text-white hover:bg-sky-700' }, __alloT('stem.manipulatives.new_6', '🎲 New'))
              ),
              !gbChallenge && h('p', { className: 'text-xs text-sky-700 italic' },
                __alloT('stem.manipulatives.build_a_rectangle_of_a_given_perimeter', 'Build a rectangle of a given perimeter, or a polygon of a given side count.')
              ),
              gbChallenge && h('div', { className: 'space-y-2' },
                h('p', { className: 'text-sm text-slate-800' }, gbChallenge.q),
                !gbFeedback && h('button', { onClick: checkGb,
                  className: 'transition-colors w-full px-3 py-1.5 rounded text-xs font-bold bg-sky-600 text-white hover:bg-sky-700' },
                  'Check (current perim = ' + perimeter.toFixed(2) + ', segs = ' + geoboardSegments.length + ')'
                ),
                gbFeedback && h('div', { className: 'space-y-1' },
                  h('p', { className: 'text-sm font-bold ' + (gbFeedback.ok ? 'text-green-700' : 'text-red-700') }, gbFeedback.msg),
                  h('button', { onClick: genGb,
                    className: 'transition-colors w-full px-3 py-1.5 rounded text-xs font-bold bg-sky-600 text-white hover:bg-sky-700' }, __alloT('stem.manipulatives.next_8', '🔄 Next'))
                )
              )
            );
          })()
        );
      }

      // ═══════════════════════════════════════════════════════════════
      // ── v3: CUISENAIRE RODS MODE ──
      // ═══════════════════════════════════════════════════════════════
      if (manipMode === 'cRods') {
        var rodLengthsTotal = cRods.reduce(function(acc, r) { return acc + r.length; }, 0);
        var addRod = function(len) {
          var nr = cRods.concat([{ length: len, id: Date.now() + Math.random() }]);
          upd({ cRods: nr });
          sfxClick();
        };
        return h('div', { className: 'space-y-3 max-w-3xl mx-auto animate-in fade-in duration-200' },
          headerEl,
          h('div', { className: 'bg-white rounded-xl border-2 border-amber-200 p-3' },
            h('p', { className: 'text-xs font-bold text-amber-700 mb-2' }, __alloT('stem.manipulatives.rod_palette_click_to_add', 'Rod palette (click to add):')),
            h('div', { className: 'grid grid-cols-10 gap-1' },
              [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function(len) {
                return h('button', { key: 'cr-' + len,
                  onClick: function() { addRod(len); },
                  style: { background: palette.rods[len - 1], height: 28, border: '1px solid #0f172a', borderRadius: 4 },
                  title: len + (len === 1 ? ' unit' : ' units')
                }, h('span', { style: { fontSize: 9, fontWeight: 'bold', color: '#fff', textShadow: '0 0 2px #000' } }, len));
              })
            )
          ),
          h('div', { className: 'bg-amber-50 rounded-xl border-2 border-amber-200 p-3' },
            h('div', { className: 'flex items-center justify-between mb-2' },
              h('p', { className: 'text-xs font-bold text-amber-700' }, 'Workspace (' + cRods.length + ' rods, total length = ' + rodLengthsTotal + '):'),
              h('button', { onClick: function() { upd({ cRods: [] }); },
                className: 'transition-colors px-2 py-1 rounded text-[10px] font-bold bg-rose-100 text-rose-700 hover:bg-rose-200' }, __alloT('stem.manipulatives.clear_5', '↺ Clear'))
            ),
            cRods.length === 0
              ? h('p', { className: 'text-[11px] italic text-slate-500 text-center py-4' }, __alloT('stem.manipulatives.no_rods_yet_click_a_colored_rod_above_', 'No rods yet. Click a colored rod above to add it.'))
              : h('div', { className: 'space-y-1' },
                  cRods.map(function(r, i) {
                    return h('button', {
                      key: 'crw-' + i,
                      onClick: function() { upd({ cRods: cRods.filter(function(_, j) { return j !== i; }) }); },
                      title: __alloT('stem.manipulatives.click_to_remove', 'Click to remove'),
                      style: {
                        width: (r.length * 30) + 'px',
                        height: 24, background: palette.rods[r.length - 1],
                        border: '2px solid #0f172a', borderRadius: 4,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 'bold', fontSize: 11,
                        textShadow: '0 0 2px #000', cursor: 'pointer'
                      }
                    }, r.length);
                  })
                ),
            cRods.length >= 2 && h('p', { className: 'text-[11px] text-amber-700 italic mt-2 text-center' },
              'Equation: ' + cRods.map(function(r) { return r.length; }).join(' + ') + ' = ' + rodLengthsTotal
            )
          ),
          h('div', { className: 'bg-amber-50 rounded-lg p-3 border border-amber-100 text-xs text-amber-800' },
            __alloT('stem.manipulatives.cuisenaire_rods_1952_georges_cuisenair', '💡 Cuisenaire rods (1952, Georges Cuisenaire) come in 10 lengths, each a distinct color. '),
            __alloT('stem.manipulatives.white_1_red_2_light_green_3_purple_4_y', 'White=1, Red=2, Light green=3, Purple=4, Yellow=5, Dark green=6, Black=7, Brown=8, Blue=9, Orange=10. '),
            __alloT('stem.manipulatives.combine_rods_to_make_new_numbers_two_r', 'Combine rods to make new numbers. Two reds (2+2) = a purple (4).')
          ),
          // ── Challenge sub-panel ──
          (function() {
            var genCr = function() {
              var puzzles = [
                { q: 'Make a train of length 10 using exactly 2 rods.', target: 10, count: 2 },
                { q: 'Make a train of length 10 using exactly 3 rods (any colors).', target: 10, count: 3 },
                { q: 'Make a train of length 10 using exactly 4 rods.', target: 10, count: 4 },
                { q: 'Make a train of length 12 using exactly 3 rods.', target: 12, count: 3 },
                { q: 'Make a train of length 15 using exactly 3 rods, no two the same color.', target: 15, count: 3, distinct: true },
                { q: 'Make a train as long as 1 orange + 1 yellow rod (15) using ONLY white rods.', target: 15, only: 1 },
                { q: 'Make a train as long as an orange rod (10) using ONLY rods of length 2.', target: 10, only: 2 },
                { q: 'Find 3 different rods whose lengths sum to 9.', target: 9, count: 3, distinct: true },
                { q: 'Make a train of length 20 using exactly 4 rods.', target: 20, count: 4 }
              ];
              var p = puzzles[Math.floor(Math.random() * puzzles.length)];
              upd({ cRodChallenge: p, cRodFeedback: null, cRods: [] });
            };
            var checkCr = function() {
              if (!cRodChallenge) return;
              var lens = cRods.map(function(r) { return r.length; });
              var total = lens.reduce(function(a, b) { return a + b; }, 0);
              var unique = lens.filter(function(v, i, a) { return a.indexOf(v) === i; }).length;
              var ok = total === cRodChallenge.target;
              if (ok && cRodChallenge.count != null) ok = lens.length === cRodChallenge.count;
              if (ok && cRodChallenge.distinct) ok = unique === lens.length;
              if (ok && cRodChallenge.only != null) ok = lens.every(function(v) { return v === cRodChallenge.only; });
              var newStreak = ok ? streak + 1 : 0;
              var msg = ok ? '✅ Total = ' + total + ' with ' + lens.length + ' rods' :
                '❌ Total ' + total + ' (' + lens.length + ' rods)' +
                (cRodChallenge.count != null ? '; need ' + cRodChallenge.count : '') +
                (total !== cRodChallenge.target ? '; need length ' + cRodChallenge.target : '');
              upd({
                cRodFeedback: { ok: ok, msg: msg },
                score: { correct: score.correct + (ok ? 1 : 0), total: score.total + 1 },
                streak: newStreak
              });
              if (ok) { if (soundEnabled) sfxCorrect(); if (awardXP) awardXP('manip_cr', 4, 'cuisenaire'); }
              else if (soundEnabled) sfxWrong();
            };
            return h('div', { className: 'bg-white rounded-xl border-2 border-amber-300 p-3' },
              h('div', { className: 'flex items-center justify-between mb-2' },
                h('p', { className: 'text-xs font-bold text-amber-800 uppercase' }, __alloT('stem.manipulatives.rod_challenge', '🎯 Rod Challenge')),
                h('button', { onClick: genCr,
                  className: 'transition-colors px-3 py-1 rounded text-xs font-bold bg-amber-600 text-white hover:bg-amber-700' }, __alloT('stem.manipulatives.new_7', '🎲 New'))
              ),
              !cRodChallenge && h('p', { className: 'text-xs text-amber-700 italic' },
                __alloT('stem.manipulatives.make_a_train_of_rods_matching_a_target', 'Make a "train" of rods matching a target length under specific constraints.')
              ),
              cRodChallenge && h('div', { className: 'space-y-2' },
                h('p', { className: 'text-sm text-slate-800' }, cRodChallenge.q),
                !cRodFeedback && h('button', { onClick: checkCr,
                  className: 'transition-colors w-full px-3 py-1.5 rounded text-xs font-bold bg-amber-600 text-white hover:bg-amber-700' },
                  'Check (current train = ' + rodLengthsTotal + ', ' + cRods.length + ' rods)'
                ),
                cRodFeedback && h('div', { className: 'space-y-1' },
                  h('p', { className: 'text-sm font-bold ' + (cRodFeedback.ok ? 'text-green-700' : 'text-red-700') }, cRodFeedback.msg),
                  h('button', { onClick: genCr,
                    className: 'transition-colors w-full px-3 py-1.5 rounded text-xs font-bold bg-amber-600 text-white hover:bg-amber-700' }, __alloT('stem.manipulatives.next_9', '🔄 Next'))
                )
              )
            );
          })()
        );
      }

      // ═══════════════════════════════════════════════════════════════
      // ── v3: NUMBER BONDS MODE ──
      // ═══════════════════════════════════════════════════════════════
      if (manipMode === 'numberBonds') {
        var nbPart2 = nbWhole - nbPart1;
        var validNb = nbPart2 >= 0 && nbPart1 >= 0 && nbPart1 <= nbWhole;
        var newNbPractice = function() {
          var w = randInt(5, 10);
          var p1 = randInt(0, w);
          upd({ nbWhole: w, nbPart1: p1, nbMode: 'practice', nbAnswer: '', nbFeedback: null });
        };
        var checkNb = function() {
          var ans = parseInt(nbAnswer);
          var ok = ans === (nbWhole - nbPart1);
          if (ok) {
            var newNbS = (_m.nbSolved || 0) + 1;
            sfxCorrect();
            upd({ nbFeedback: { correct: true, msg: '✅ Correct! ' + nbPart1 + ' + ' + ans + ' = ' + nbWhole }, nbSolved: newNbS });
            announceToSR && announceToSR('Correct');
            checkBadges({ nbSolved: newNbS });
          } else {
            sfxWrong();
            upd({ nbFeedback: { correct: false, msg: '❌ ' + nbPart1 + ' + ' + (nbWhole - nbPart1) + ' = ' + nbWhole } });
          }
        };
        function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

        return h('div', { className: 'space-y-3 max-w-3xl mx-auto animate-in fade-in duration-200' },
          headerEl,
          h('div', { className: 'flex gap-1 bg-pink-50 rounded-xl p-1 border border-pink-200' },
            h('button', { onClick: function() { upd({ nbMode: 'explore' }); },
              className: 'flex-1 py-1.5 rounded text-xs font-bold ' + (nbMode === 'explore' ? 'bg-white text-pink-800' : 'text-pink-600') }, __alloT('stem.manipulatives.explore', '🔍 Explore')),
            h('button', { onClick: newNbPractice,
              className: 'flex-1 py-1.5 rounded text-xs font-bold ' + (nbMode === 'practice' ? 'bg-white text-pink-800' : 'text-pink-600') }, __alloT('stem.manipulatives.practice', '🎯 Practice'))
          ),
          h('div', { className: 'bg-white rounded-xl border-2 border-pink-200 p-4' },
            // Whole-part-part visualization
            h('div', { className: 'flex flex-col items-center gap-2' },
              // Whole circle
              h('div', { style: {
                width: 80, height: 80, borderRadius: '50%',
                background: '#fce7f3', border: '4px solid #be185d',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 32, fontWeight: 900, color: '#be185d'
              } }, nbWhole),
              // Lines down
              h('div', { style: { width: 2, height: 24, background: '#be185d' } }),
              h('div', { className: 'flex gap-12' },
                // Part 1
                h('div', { style: {
                  width: 60, height: 60, borderRadius: '50%',
                  background: '#fbcfe8', border: '3px solid #db2777',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, fontWeight: 900, color: '#831843'
                } }, nbPart1),
                // Part 2 (hidden in practice mode)
                nbMode === 'practice' && !nbFeedback
                  ? h('div', { style: {
                      width: 60, height: 60, borderRadius: '50%',
                      background: '#fff', border: '3px dashed #db2777',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 32, fontWeight: 900, color: '#831843'
                    } }, '?')
                  : h('div', { style: {
                      width: 60, height: 60, borderRadius: '50%',
                      background: '#fbcfe8', border: '3px solid #db2777',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 24, fontWeight: 900, color: '#831843'
                    } }, nbPart2)
              )
            ),
            // Controls
            nbMode === 'explore' && h('div', { className: 'mt-4 space-y-2' },
              h('label', { className: 'block text-xs font-bold text-pink-700' }, 'Whole: ' + nbWhole),
              h('input', { type: 'range', 'aria-label': 'Whole number', 'aria-valuetext': String(nbWhole), min: 2, max: 20, value: nbWhole,
                onChange: function(e) { var v = parseInt(e.target.value); upd({ nbWhole: v, nbPart1: Math.min(nbPart1, v) }); },
                className: 'w-full accent-pink-600' }),
              h('label', { className: 'block text-xs font-bold text-pink-700' }, 'Part 1: ' + nbPart1 + ' (Part 2 = ' + nbPart2 + ')'),
              h('input', { type: 'range', 'aria-label': 'First part', 'aria-valuetext': String(nbPart1), min: 0, max: nbWhole, value: nbPart1,
                onChange: function(e) { upd({ nbPart1: parseInt(e.target.value) }); },
                className: 'w-full accent-pink-600' })
            ),
            nbMode === 'practice' && h('div', { className: 'mt-4' },
              !nbFeedback && h('div', { className: 'flex gap-2' },
                h('input', { type: 'number', value: nbAnswer,
                  onChange: function(e) { upd({ nbAnswer: e.target.value }); },
                  onKeyDown: function(e) { if (e.key === 'Enter' && nbAnswer) checkNb(); },
                  placeholder: __alloT('stem.manipulatives.what_s_the_missing_part', 'What\'s the missing part?'),
                  'aria-label': __alloT('stem.manipulatives.number_bond_answer', 'Number bond answer'),
                  className: 'flex-1 px-3 py-2 border border-pink-400 rounded-lg text-sm font-mono' }),
                h('button', { onClick: checkNb,
                  className: 'transition-colors px-4 py-2 bg-pink-600 text-white font-bold rounded-lg hover:bg-pink-700' }, __alloT('stem.manipulatives.check_8', 'Check'))
              ),
              nbFeedback && h('div', { className: 'space-y-2' },
                h('p', { className: 'text-sm font-bold ' + (nbFeedback.correct ? 'text-green-700' : 'text-red-700') }, nbFeedback.msg),
                h('button', { onClick: newNbPractice,
                  className: 'transition-colors w-full px-4 py-2 bg-pink-600 text-white font-bold rounded-lg hover:bg-pink-700' }, __alloT('stem.manipulatives.next_problem', '🔄 Next problem'))
              )
            )
          ),
          h('div', { className: 'bg-pink-50 rounded-lg p-3 border border-pink-100 text-xs text-pink-800' },
            __alloT('stem.manipulatives.a_whole_splits_into_two_parts_the_sing', '💡 A whole splits into two parts. The Singapore Math curriculum (1980s) made this the cornerstone for early addition and subtraction. '),
            __alloT('stem.manipulatives.once_a_student_fluently_sees_10_6_4_7_', 'Once a student fluently sees 10 = 6 + 4 = 7 + 3 = 5 + 5, they can add and subtract with much less effort.')
          ),
          // ── Rainbow / doubles overlay panel ──
          h('div', { className: 'bg-white rounded-xl border-2 border-pink-200 p-3' },
            h('p', { className: 'text-xs font-bold text-pink-700 mb-2' }, '🌈 Rainbow facts (all pairs that make ' + nbWhole + '):'),
            h('div', { className: 'flex flex-wrap gap-2' },
              (function() {
                var arr = [];
                for (var k = 0; k <= nbWhole; k++) {
                  var isDouble = k === nbWhole - k;
                  var nearTen = nbWhole === 10;
                  arr.push(h('button', { key: 'rb' + k,
                    onClick: function(v) { return function() { upd({ nbPart1: v }); }; }(k),
                    className: 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all ' +
                      (nbPart1 === k ? 'bg-pink-700 text-white shadow' :
                        isDouble ? 'bg-amber-100 text-amber-800 border border-amber-400 hover:bg-amber-200' :
                        'bg-pink-50 text-pink-700 border border-pink-300 hover:bg-pink-100')
                  }, k + ' + ' + (nbWhole - k) + (isDouble ? ' (double!)' : '')));
                }
                return arr;
              })()
            ),
            nbWhole === 10 && h('p', { className: 'text-[11px] italic text-pink-700 mt-2' },
              __alloT('stem.manipulatives.the_make_ten_facts_are_the_gateway_to_', 'The "make-ten" facts are the gateway to all later regrouping. Doubles facts (1+1, 2+2, ...) are usually learned earliest.')
            )
          )
        );
      }

      // ═══════════════════════════════════════════════════════════════
      // ── v3: CRA PROGRESSION MODE ──
      // ═══════════════════════════════════════════════════════════════
      // Bruner (1966) Concrete-Representational-Abstract.
      // Same problem, three views: blocks → picture → equation.
      // Forces the learner to translate between modes — the strongest
      // single predictor of durable arithmetic understanding
      // (NCTM 2014; Witzel, Mercer & Miller 2003 meta-analysis).
      if (manipMode === 'cra') {
        var craGenAddition = function() {
          var a = 3 + Math.floor(Math.random() * 8);  // 3..10
          var b = 2 + Math.floor(Math.random() * 7);  // 2..8
          upd({ craTarget: { op: '+', a: a, b: b, ans: a + b }, craStep: 1, craFeedback: null });
        };
        var craGenSubtraction = function() {
          var a = 5 + Math.floor(Math.random() * 10); // 5..14
          var b = 1 + Math.floor(Math.random() * Math.min(a - 1, 8));
          upd({ craTarget: { op: '−', a: a, b: b, ans: a - b }, craStep: 1, craFeedback: null });
        };
        var craGenRegroup = function() {
          // Force a regrouping addition (carrying)
          var a = 13 + Math.floor(Math.random() * 15); // 13..27
          var b = 14 + Math.floor(Math.random() * 15); // 14..28
          upd({ craTarget: { op: '+', a: a, b: b, ans: a + b, requiresRegroup: true }, craStep: 1, craFeedback: null });
        };
        var craGenMultiplication = function() {
          var a = 2 + Math.floor(Math.random() * 4);
          var b = 2 + Math.floor(Math.random() * 5);
          upd({ craTarget: { op: '×', a: a, b: b, ans: a * b }, craStep: 1, craFeedback: null });
        };
        var craNext = function() {
          if (craStep < 3) upd({ craStep: craStep + 1, craFeedback: null });
        };
        var craBack = function() {
          if (craStep > 1) upd({ craStep: craStep - 1, craFeedback: null });
        };

        // Render block for concrete stage
        var renderConcreteAddition = function(t) {
          var renderDots = function(count, color) {
            var arr = [];
            for (var i = 0; i < count; i++) {
              arr.push(h('span', {
                key: 'd' + i,
                style: {
                  display: 'inline-block', width: 18, height: 18, borderRadius: '50%',
                  background: color, border: '1.5px solid #0f172a', margin: 2
                }
              }));
            }
            return arr;
          };
          return h('div', { className: 'space-y-3' },
            h('div', { className: 'bg-emerald-50 rounded-xl p-4 border-2 border-emerald-200' },
              h('p', { className: 'text-xs font-bold text-emerald-700 mb-1' }, 'GROUP A — ' + t.a + (t.a === 1 ? ' object' : ' objects')),
              h('div', { className: 'flex flex-wrap' }, renderDots(t.a, '#fbbf24'))
            ),
            h('p', { className: 'text-center text-2xl font-black text-teal-700' }, '+'),
            h('div', { className: 'bg-emerald-50 rounded-xl p-4 border-2 border-emerald-200' },
              h('p', { className: 'text-xs font-bold text-emerald-700 mb-1' }, 'GROUP B — ' + t.b + (t.b === 1 ? ' object' : ' objects')),
              h('div', { className: 'flex flex-wrap' }, renderDots(t.b, '#60a5fa'))
            ),
            h('p', { className: 'text-center text-2xl font-black text-teal-700' }, '='),
            h('div', { className: 'bg-amber-50 rounded-xl p-4 border-2 border-amber-200' },
              h('p', { className: 'text-xs font-bold text-amber-700 mb-1' }, __alloT('stem.manipulatives.push_them_together_count_them_all', 'PUSH THEM TOGETHER — count them all')),
              h('div', { className: 'flex flex-wrap' },
                renderDots(t.a, '#fbbf24'),
                renderDots(t.b, '#60a5fa')
              )
            ),
            h('p', { className: 'text-center text-sm text-teal-700 italic mt-2' },
              __alloT('stem.manipulatives.total_objects_count_them_out_loud_one_', 'Total objects? Count them out loud, one by one.')
            )
          );
        };

        var renderConcreteSubtraction = function(t) {
          var dots = [];
          for (var i = 0; i < t.a; i++) {
            var removed = i >= t.a - t.b;
            dots.push(h('span', {
              key: 'd' + i,
              style: {
                display: 'inline-block', width: 20, height: 20, borderRadius: '50%',
                background: removed ? '#fecaca' : '#fbbf24',
                border: '1.5px solid #0f172a', margin: 2,
                position: 'relative', opacity: removed ? 0.4 : 1
              }
            }, removed && h('span', { style: { position: 'absolute', top: -2, left: 5, color: '#dc2626', fontWeight: 900, fontSize: 18 } }, '×')));
          }
          return h('div', { className: 'space-y-3' },
            h('div', { className: 'bg-amber-50 rounded-xl p-4 border-2 border-amber-200' },
              h('p', { className: 'text-xs font-bold text-amber-700 mb-1' }, 'START WITH ' + t.a + ' objects:'),
              h('div', { className: 'flex flex-wrap' }, dots)
            ),
            h('p', { className: 'text-center text-sm text-teal-700 italic mt-2' },
              t.b + ' have been crossed out (taken away). How many are left?'
            )
          );
        };

        var renderRepresentationalAddition = function(t) {
          // Number-line picture
          var max = t.ans + 2;
          var step = 540 / max;
          return h('div', { className: 'space-y-3' },
            h('div', { className: 'bg-blue-50 rounded-xl p-4 border-2 border-blue-200' },
              h('p', { className: 'text-xs font-bold text-blue-700 mb-2' }, 'NUMBER LINE — jump forward from ' + t.a + ' by ' + t.b),
              h('svg', { width: 560, height: 96, viewBox: '0 0 560 96', style: { maxWidth: '100%' } },
                // Line
                h('line', { x1: 10, y1: 70, x2: 550, y2: 70, stroke: '#1e3a8a', strokeWidth: 2 }),
                // Tick marks
                Array.from({ length: max + 1 }).map(function(_, n) {
                  return h('g', { key: 'tk' + n },
                    h('line', { x1: 10 + n * step, y1: 64, x2: 10 + n * step, y2: 76, stroke: '#1e3a8a', strokeWidth: 1 }),
                    h('text', { x: 10 + n * step, y: 90, textAnchor: 'middle', fontSize: 10, fill: '#1e3a8a' }, n)
                  );
                }),
                // Marker for a
                h('circle', { cx: 10 + t.a * step, cy: 70, r: 5, fill: '#10b981', stroke: '#064e3b', strokeWidth: 1.5 }),
                h('text', { x: 10 + t.a * step, y: 55, textAnchor: 'middle', fontSize: 11, fontWeight: 'bold', fill: '#10b981' }, 'start ' + t.a),
                // Marker for ans
                h('circle', { cx: 10 + t.ans * step, cy: 70, r: 5, fill: '#dc2626', stroke: '#7f1d1d', strokeWidth: 1.5 }),
                h('text', { x: 10 + t.ans * step, y: 55, textAnchor: 'middle', fontSize: 11, fontWeight: 'bold', fill: '#dc2626' }, 'end ' + t.ans),
                // Jump arcs
                Array.from({ length: t.b }).map(function(_, j) {
                  var x1 = 10 + (t.a + j) * step;
                  var x2 = 10 + (t.a + j + 1) * step;
                  var mx = (x1 + x2) / 2;
                  return h('path', { key: 'arc' + j,
                    d: 'M ' + x1 + ' 70 Q ' + mx + ' 30 ' + x2 + ' 70',
                    stroke: '#7c3aed', strokeWidth: 1.5, fill: 'none', strokeDasharray: '3,2'
                  });
                })
              )
            ),
            h('p', { className: 'text-center text-sm text-teal-700 italic' },
              'Each purple arc is a "jump" of 1. ' + t.b + ' jumps from ' + t.a + ' lands on ' + t.ans + '.'
            )
          );
        };

        var renderRepresentationalSubtraction = function(t) {
          var max = t.a + 1;
          var step = 540 / max;
          return h('div', { className: 'space-y-3' },
            h('div', { className: 'bg-blue-50 rounded-xl p-4 border-2 border-blue-200' },
              h('p', { className: 'text-xs font-bold text-blue-700 mb-2' }, 'NUMBER LINE — jump BACKWARD from ' + t.a + ' by ' + t.b),
              h('svg', { width: 560, height: 96, viewBox: '0 0 560 96', style: { maxWidth: '100%' } },
                h('line', { x1: 10, y1: 70, x2: 550, y2: 70, stroke: '#1e3a8a', strokeWidth: 2 }),
                Array.from({ length: max + 1 }).map(function(_, n) {
                  return h('g', { key: 'tk' + n },
                    h('line', { x1: 10 + n * step, y1: 64, x2: 10 + n * step, y2: 76, stroke: '#1e3a8a', strokeWidth: 1 }),
                    h('text', { x: 10 + n * step, y: 90, textAnchor: 'middle', fontSize: 10, fill: '#1e3a8a' }, n)
                  );
                }),
                h('circle', { cx: 10 + t.a * step, cy: 70, r: 5, fill: '#dc2626', stroke: '#7f1d1d', strokeWidth: 1.5 }),
                h('text', { x: 10 + t.a * step, y: 55, textAnchor: 'middle', fontSize: 11, fontWeight: 'bold', fill: '#dc2626' }, 'start ' + t.a),
                h('circle', { cx: 10 + t.ans * step, cy: 70, r: 5, fill: '#10b981', stroke: '#064e3b', strokeWidth: 1.5 }),
                h('text', { x: 10 + t.ans * step, y: 55, textAnchor: 'middle', fontSize: 11, fontWeight: 'bold', fill: '#10b981' }, 'end ' + t.ans),
                Array.from({ length: t.b }).map(function(_, j) {
                  var x1 = 10 + (t.a - j) * step;
                  var x2 = 10 + (t.a - j - 1) * step;
                  var mx = (x1 + x2) / 2;
                  return h('path', { key: 'arc' + j,
                    d: 'M ' + x1 + ' 70 Q ' + mx + ' 30 ' + x2 + ' 70',
                    stroke: '#7c3aed', strokeWidth: 1.5, fill: 'none', strokeDasharray: '3,2'
                  });
                })
              )
            ),
            h('p', { className: 'text-center text-sm text-teal-700 italic' },
              'Each purple arc is a backward jump of 1. ' + t.b + ' jumps back from ' + t.a + ' lands on ' + t.ans + '.'
            )
          );
        };

        var renderRepresentationalMultiplication = function(t) {
          // Array model
          var cells = [];
          for (var rI = 0; rI < t.a; rI++) {
            var row = [];
            for (var cI = 0; cI < t.b; cI++) {
              row.push(h('div', { key: 'm' + rI + '-' + cI, style: {
                width: 26, height: 26, background: '#fbbf24', border: '1.5px solid #0f172a', borderRadius: 3
              } }));
            }
            cells.push(h('div', { key: 'row' + rI, className: 'flex gap-1 mb-1' }, row));
          }
          return h('div', { className: 'space-y-3' },
            h('div', { className: 'bg-blue-50 rounded-xl p-4 border-2 border-blue-200' },
              h('p', { className: 'text-xs font-bold text-blue-700 mb-2' }, 'ARRAY MODEL — ' + t.a + ' rows of ' + t.b),
              h('div', { className: 'flex justify-center' },
                h('div', null, cells)
              )
            ),
            h('p', { className: 'text-center text-sm text-teal-700 italic' },
              t.a + ' × ' + t.b + ' is "' + t.a + ' groups of ' + t.b + '" — count all the cells.'
            )
          );
        };

        var renderAbstract = function(t) {
          return h('div', { className: 'space-y-3' },
            h('div', { className: 'bg-purple-50 rounded-xl p-6 border-2 border-purple-200 text-center' },
              h('p', { className: 'text-xs font-bold text-purple-700 mb-2 uppercase tracking-wider' }, __alloT('stem.manipulatives.now_write_the_equation', 'Now WRITE the equation')),
              h('div', { className: 'flex items-center justify-center gap-3 font-mono text-4xl font-black text-purple-900' },
                h('span', null, t.a),
                h('span', null, t.op),
                h('span', null, t.b),
                h('span', null, '='),
                h('input', {
                  type: 'number', value: _m.craUserAns || '',
                  onChange: function(e) { upd({ craUserAns: e.target.value }); },
                  onKeyDown: function(e) {
                    if (e.key === 'Enter') {
                      var u = parseInt(_m.craUserAns);
                      var ok = u === t.ans;
                      upd({ craFeedback: { ok: ok, msg: ok ? '✅ Correct! ' + t.a + ' ' + t.op + ' ' + t.b + ' = ' + t.ans : '❌ Answer is ' + t.ans } });
                      if (ok) { sfxCorrect(); checkBadges({ craCompleted: true }); } else sfxWrong();
                    }
                  },
                  className: 'w-24 px-2 py-1 border-2 border-purple-400 rounded text-center',
                  style: { fontSize: 36 }
                })
              )
            ),
            craFeedback && h('div', {
              className: 'rounded-lg p-3 text-center font-bold text-sm border-2 ' +
                (craFeedback.ok ? 'bg-green-50 border-green-300 text-green-800' : 'bg-red-50 border-red-300 text-red-800')
            }, craFeedback.msg),
            h('p', { className: 'text-center text-sm text-teal-700 italic' },
              __alloT('stem.manipulatives.you_have_just_translated_a_real_physic', 'You have just translated a real physical idea into a symbol. That symbol now MEANS that thing.')
            )
          );
        };

        return h('div', { className: 'space-y-4 max-w-4xl mx-auto animate-in fade-in duration-200' },
          headerEl,
          // Generator buttons
          h('div', { className: 'bg-white rounded-xl border-2 border-teal-200 p-3' },
            h('p', { className: 'text-xs font-bold text-teal-700 uppercase tracking-wider mb-2' }, __alloT('stem.manipulatives.choose_an_operation_to_walk_through', 'Choose an operation to walk through:')),
            h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2' },
              h('button', { onClick: craGenAddition,
                className: 'transition-colors px-3 py-2 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300' },
                __alloT('stem.manipulatives.addition_within_20', '+ Addition (within 20)')
              ),
              h('button', { onClick: craGenSubtraction,
                className: 'transition-colors px-3 py-2 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300' },
                __alloT('stem.manipulatives.subtraction_take_away', '− Subtraction (take-away)')
              ),
              h('button', { onClick: craGenRegroup,
                className: 'transition-colors px-3 py-2 rounded-lg text-xs font-bold bg-violet-100 text-violet-800 hover:bg-violet-200 border border-violet-300' },
                __alloT('stem.manipulatives.addition_w_regroup', '+ Addition w/ regroup')
              ),
              h('button', { onClick: craGenMultiplication,
                className: 'transition-colors px-3 py-2 rounded-lg text-xs font-bold bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300' },
                __alloT('stem.manipulatives.multiplication_array', '× Multiplication (array)')
              )
            )
          ),
          // Stage indicator
          craTarget && h('div', { className: 'flex items-center justify-center gap-2 bg-teal-50 rounded-xl p-3 border border-teal-200' },
            [1, 2, 3].map(function(s) {
              var labels = { 1: 'CONCRETE\n(objects)', 2: 'REPRESENTATIONAL\n(picture)', 3: 'ABSTRACT\n(equation)' };
              return h('button', { key: 's' + s,
                onClick: function() { upd({ craStep: s, craFeedback: null }); },
                className: 'px-4 py-2 rounded-lg text-xs font-bold whitespace-pre-line text-center transition-all ' +
                  (craStep === s ? 'bg-teal-600 text-white shadow-md scale-105' : 'bg-white text-teal-700 border border-teal-300 hover:bg-teal-100')
              }, s + '. ' + labels[s]);
            })
          ),
          // Stage body
          craTarget && h('div', { className: 'bg-white rounded-xl border-2 border-teal-200 p-4' },
            craStep === 1 && (craTarget.op === '+' ? renderConcreteAddition(craTarget)
                              : craTarget.op === '−' ? renderConcreteSubtraction(craTarget)
                              : craTarget.op === '×' ? (function() {
                                  // Concrete multiplication: groups of objects
                                  var groups = [];
                                  for (var gI = 0; gI < craTarget.a; gI++) {
                                    var grp = [];
                                    for (var oI = 0; oI < craTarget.b; oI++) {
                                      grp.push(h('span', { key: 'o' + oI, style: {
                                        display: 'inline-block', width: 14, height: 14, borderRadius: '50%',
                                        background: '#fbbf24', border: '1.5px solid #0f172a', margin: 1
                                      } }));
                                    }
                                    groups.push(h('div', { key: 'g' + gI, className: 'bg-emerald-50 rounded p-2 border border-emerald-200' },
                                      h('p', { className: 'text-[10px] font-bold text-emerald-700 mb-1' }, 'Group ' + (gI + 1)),
                                      h('div', null, grp)
                                    ));
                                  }
                                  return h('div', { className: 'space-y-2' },
                                    h('p', { className: 'text-xs font-bold text-emerald-700' }, craTarget.a + ' GROUPS of ' + craTarget.b + ' objects each:'),
                                    h('div', { className: 'grid gap-2', style: { gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' } }, groups)
                                  );
                                })()
                              : null),
            craStep === 2 && (craTarget.op === '+' ? renderRepresentationalAddition(craTarget)
                              : craTarget.op === '−' ? renderRepresentationalSubtraction(craTarget)
                              : craTarget.op === '×' ? renderRepresentationalMultiplication(craTarget)
                              : null),
            craStep === 3 && renderAbstract(craTarget),
            // Nav
            h('div', { className: 'flex gap-2 mt-4 justify-between' },
              h('button', { onClick: craBack, disabled: craStep <= 1,
                className: 'px-3 py-1.5 rounded text-xs font-bold ' + (craStep <= 1 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'transition-colors bg-slate-200 text-slate-700 hover:bg-slate-300')
              }, __alloT('stem.manipulatives.previous_stage', '← Previous stage')),
              h('button', { onClick: craNext, disabled: craStep >= 3,
                className: 'px-3 py-1.5 rounded text-xs font-bold ' + (craStep >= 3 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'transition-colors bg-teal-600 text-white hover:bg-teal-700')
              }, __alloT('stem.manipulatives.next_stage', 'Next stage →'))
            )
          ),
          !craTarget && h('div', { className: 'bg-white rounded-xl border-2 border-teal-200 p-6 text-center' },
            h('p', { className: 'text-base font-bold text-teal-800 mb-2' }, __alloT('stem.manipulatives.pick_an_operation_above_to_begin', 'Pick an operation above to begin.')),
            h('p', { className: 'text-xs text-teal-600 mb-4' },
              __alloT('stem.manipulatives.you_will_walk_through_the_same_problem', 'You will walk through the same problem in three forms: physical objects → a picture → a written equation.')
            ),
            h('div', { className: 'bg-teal-50 rounded-lg p-3 border border-teal-100 text-xs text-teal-800 text-left max-w-xl mx-auto' },
              h('p', { className: 'font-bold mb-1' }, __alloT('stem.manipulatives.why_cra', 'Why CRA?')),
              h('p', null,
                __alloT('stem.manipulatives.bruner_1966_argued_that_for_a_concept_', 'Bruner (1966) argued that for a concept to be fully understood, the learner has to '),
                __alloT('stem.manipulatives.experience_it_in_three_ways_enactively', 'experience it in three ways: enactively (do it with their hands), iconically (see a picture), '),
                __alloT('stem.manipulatives.and_symbolically_write_the_symbol_witz', 'and symbolically (write the symbol). Witzel, Mercer & Miller (2003) meta-analyzed CRA across '),
                __alloT('stem.manipulatives.special_education_math_interventions_a', 'special-education math interventions and found average effect sizes around 0.5 — large enough '),
                __alloT('stem.manipulatives.to_be_the_difference_between_a_student', 'to be the difference between a student passing or failing.')
              )
            )
          ),
          h('div', { className: 'bg-teal-50 rounded-lg p-3 border border-teal-100 text-xs text-teal-800' },
            __alloT('stem.manipulatives.cra_is_not_three_different_problems_it', '💡 CRA is not "three different problems." It is the SAME problem expressed three ways. '),
            __alloT('stem.manipulatives.the_point_is_that_the_abstract_symbol_', 'The point is that the abstract symbol "8" means a thing you can count, group, and arrange — '),
            __alloT('stem.manipulatives.not_a_magic_spell_to_memorize', 'not a magic spell to memorize.')
          )
        );
      }

      // ═══════════════════════════════════════════════════════════════
      // ── v3: STANDARDS BROWSER MODE ──
      // ═══════════════════════════════════════════════════════════════
      // Browse CCSS K-5 standards, see which manipulative addresses each.
      if (manipMode === 'standards') {
        // Flatten the STANDARDS_MAP into a per-standard list with backref to manipulative
        var allStandards = [];
        Object.keys(STANDARDS_MAP).forEach(function(manip) {
          STANDARDS_MAP[manip].forEach(function(s) {
            allStandards.push({ manip: manip, code: s.code, grade: s.grade, desc: s.desc });
          });
        });
        // Filter by grade
        var filtered = allStandards.filter(function(s) {
          if (standardsFilter !== 'all' && s.grade !== standardsFilter) return false;
          if (standardsSearch && s.desc.toLowerCase().indexOf(standardsSearch.toLowerCase()) < 0
              && s.code.toLowerCase().indexOf(standardsSearch.toLowerCase()) < 0) return false;
          return true;
        });
        // Group by grade
        var grouped = {};
        filtered.forEach(function(s) {
          if (!grouped[s.grade]) grouped[s.grade] = [];
          grouped[s.grade].push(s);
        });
        var grades = Object.keys(grouped).sort();
        var manipLabel = {
          blocks: 'Base-10 Blocks', abacus: 'Abacus',
          tenFrame: 'Ten Frames', counters: 'Two-Color Counters',
          pvDisks: 'Place-Value Disks', hundredsChart: 'Hundreds Chart',
          patternBlocks: 'Pattern Blocks', geoboard: 'Geoboard',
          cRods: 'Cuisenaire Rods', numberBonds: 'Number Bonds'
        };
        var manipIcon = {
          blocks: '🧱', abacus: '🧮', tenFrame: '🔟', counters: '🔴',
          pvDisks: '💿', hundredsChart: '💯', patternBlocks: '⬢',
          geoboard: '⬜', cRods: '🟧', numberBonds: '🔗'
        };

        return h('div', { className: 'space-y-3 max-w-4xl mx-auto animate-in fade-in duration-200' },
          headerEl,
          // Filter bar
          h('div', { className: 'bg-white rounded-xl border-2 border-purple-200 p-3' },
            h('div', { className: 'flex gap-2 flex-wrap mb-2' },
              h('span', { className: 'text-xs font-bold text-purple-700 self-center' }, 'Grade:'),
              ['all', 'K', '1', '2', '3', '4', '5', '6', '7'].map(function(g) {
                return h('button', { key: 'gr' + g,
                  onClick: function() { upd({ standardsFilter: g }); },
                  className: 'px-2.5 py-1 rounded text-xs font-bold transition-all ' +
                    (standardsFilter === g ? 'bg-purple-700 text-white' : 'bg-white border border-purple-300 text-purple-700 hover:bg-purple-50')
                }, g === 'all' ? 'All' : 'Grade ' + g);
              })
            ),
            h('input', {
              type: 'search',
              value: standardsSearch,
              onChange: function(e) { upd({ standardsSearch: e.target.value }); },
              placeholder: __alloT('stem.manipulatives.search_standards_e_g_fluently_add_or_k', 'Search standards (e.g. "fluently add" or "K.OA")...'),
              className: 'w-full px-3 py-1.5 text-xs border border-purple-300 rounded-lg'
            })
          ),
          // Results
          h('div', { className: 'space-y-3' },
            grades.length === 0 && h('div', { className: 'bg-white rounded-xl border border-slate-200 p-6 text-center text-sm text-slate-500' },
              __alloT('stem.manipulatives.no_standards_match_try_clearing_the_fi', 'No standards match. Try clearing the filter or search.')
            ),
            grades.map(function(g) {
              return h('div', { key: 'gg' + g, className: 'bg-white rounded-xl border-2 border-purple-200 overflow-hidden' },
                h('div', { className: 'bg-purple-100 px-3 py-1.5 text-xs font-bold text-purple-800' },
                  'GRADE ' + g + '  (' + grouped[g].length + ' standard' + (grouped[g].length === 1 ? '' : 's') + ')'
                ),
                h('div', { className: 'divide-y divide-purple-100' },
                  grouped[g].map(function(s, idx) {
                    return h('div', { key: g + '-' + idx, className: 'transition-colors p-3 hover:bg-purple-50' },
                      h('div', { className: 'flex items-start gap-2 mb-1' },
                        h('span', { className: 'font-mono text-[11px] font-bold text-purple-900 bg-purple-100 px-2 py-0.5 rounded' }, s.code),
                        h('button', {
                          onClick: function() { switchMode(s.manip); upd({ aiInsight: '' }); },
                          className: 'transition-colors text-[11px] font-bold text-purple-700 hover:text-purple-900 underline'
                        }, '→ ' + (manipIcon[s.manip] || '') + ' ' + (manipLabel[s.manip] || s.manip))
                      ),
                      h('p', { className: 'text-xs text-slate-700' }, s.desc)
                    );
                  })
                )
              );
            })
          ),
          h('div', { className: 'bg-purple-50 rounded-lg p-3 border border-purple-100 text-xs text-purple-800' },
            __alloT('stem.manipulatives.ccss_common_core_state_standards_the_c', '💡 CCSS = Common Core State Standards. The codes are read as '),
            h('span', { className: 'font-mono' }, 'GRADE.DOMAIN.CLUSTER.STANDARD'),
            __alloT('stem.manipulatives.so', '. So '), h('span', { className: 'font-mono' }, '2.NBT.A.1'),
            __alloT('stem.manipulatives.grade_2_number_operations_in_base_ten_', ' = "Grade 2, Number & Operations in Base Ten, cluster A, standard 1."')
          )
        );
      }

      // ═══════════════════════════════════════════════════════════════
      // ── v3: LIBRARY MODE (save / load) ──
      // ═══════════════════════════════════════════════════════════════
      if (manipMode === 'library') {
        var saveCurrent = function() {
          if (!libraryName.trim()) {
            if (addToast) addToast('Name your construction first.', 'error');
            return;
          }
          // Snapshot the relevant state for the *previously visible* mode.
          // We track this by saving the last non-library mode in _m.lastMode.
          var srcMode = _m.lastMode || 'blocks';
          var snap = {};
          if (srcMode === 'blocks') snap = { b10: b10 };
          else if (srcMode === 'abacus') snap = { abacus: abacus };
          else if (srcMode === 'tenFrame') snap = { tenFrameFilled: tenFrameFilled, tenFrameDouble: tenFrameDouble };
          else if (srcMode === 'counters') snap = { counters: counters };
          else if (srcMode === 'pvDisks') snap = { pvDisks: pvDisks };
          else if (srcMode === 'hundredsChart') snap = { hundredsHighlight: hundredsHighlight, hundredsSkipCount: hundredsSkipCount };
          else if (srcMode === 'patternBlocks') snap = { patternBlocks: patternBlocks };
          else if (srcMode === 'geoboard') snap = { geoboardSegments: geoboardSegments, geoboardSize: geoboardSize };
          else if (srcMode === 'cRods') snap = { cRods: cRods };
          else if (srcMode === 'numberBonds') snap = { nbWhole: nbWhole, nbPart1: nbPart1 };
          var nc = Object.assign({}, savedConstructions);
          nc[libraryName.trim()] = { mode: srcMode, snapshot: snap, savedAt: Date.now() };
          upd({ savedConstructions: nc, libraryName: '' });
          if (addToast) addToast('💾 Saved "' + libraryName.trim() + '"', 'success');
        };
        var loadConstr = function(name) {
          var c = savedConstructions[name];
          if (!c) return;
          // Apply snapshot, then switch to that mode.
          var patch = Object.assign({}, c.snapshot, { mode: c.mode });
          upd(patch);
          if (addToast) addToast('📂 Loaded "' + name + '"', 'success');
        };
        var deleteConstr = function(name) {
          var nc = Object.assign({}, savedConstructions);
          delete nc[name];
          upd({ savedConstructions: nc });
          if (addToast) addToast('🗑 Deleted "' + name + '"', 'info');
        };
        var exportConstr = function() {
          var blob = JSON.stringify(savedConstructions, null, 2);
          var url = 'data:application/json;charset=utf-8,' + encodeURIComponent(blob);
          var a = document.createElement('a');
          a.href = url; a.download = 'manipulatives-library.json';
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
        };
        var importConstr = function(file) {
          var rdr = new FileReader();
          rdr.onload = function() {
            try {
              var parsed = JSON.parse(rdr.result);
              upd({ savedConstructions: Object.assign({}, savedConstructions, parsed) });
              if (addToast) addToast('📥 Imported library.', 'success');
            } catch (e) {
              if (addToast) addToast('Could not parse library file.', 'error');
            }
          };
          rdr.readAsText(file);
        };
        var names = Object.keys(savedConstructions).sort();
        var fmtDate = function(ts) {
          if (!ts) return '';
          var d = new Date(ts);
          var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
          return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
            ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
        };

        return h('div', { className: 'space-y-3 max-w-3xl mx-auto animate-in fade-in duration-200' },
          headerEl,
          // Save panel
          h('div', { className: 'bg-white rounded-xl border-2 border-slate-200 p-3' },
            h('p', { className: 'text-xs font-bold text-slate-700 mb-2' }, __alloT('stem.manipulatives.save_the_current_workspace_from_the_ma', '💾 Save the current workspace (from the manipulative you were just on):')),
            h('div', { className: 'flex gap-2' },
              h('input', {
                type: 'text', value: libraryName,
                onChange: function(e) { upd({ libraryName: e.target.value }); },
                onKeyDown: function(e) { if (e.key === 'Enter') saveCurrent(); },
                placeholder: __alloT('stem.manipulatives.name_e_g_wed_lesson_regroup_demo', 'Name (e.g. "Wed lesson: regroup demo")'),
                className: 'flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded'
              }),
              h('button', { onClick: saveCurrent,
                className: 'transition-colors px-3 py-1.5 rounded text-xs font-bold bg-slate-700 text-white hover:bg-slate-800' }, __alloT('stem.manipulatives.save', 'Save'))
            ),
            _m.lastMode && h('p', { className: 'text-[11px] text-slate-500 italic mt-1' },
              'Will snapshot the current state of: ' + (_m.lastMode || 'blocks')
            )
          ),
          // List
          h('div', { className: 'bg-white rounded-xl border-2 border-slate-200 p-3' },
            h('div', { className: 'flex items-center justify-between mb-2' },
              h('p', { className: 'text-xs font-bold text-slate-700' }, '📂 Saved (' + names.length + ')'),
              h('div', { className: 'flex gap-1' },
                h('button', { onClick: exportConstr, disabled: names.length === 0,
                  className: 'transition-colors px-2 py-1 rounded text-[11px] font-bold bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50' }, __alloT('stem.manipulatives.export_json', 'Export JSON')),
                h('label', { className: 'transition-colors px-2 py-1 rounded text-[11px] font-bold bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer' },
                  __alloT('stem.manipulatives.import', 'Import'),
                  h('input', { type: 'file', accept: '.json,application/json',
                    onChange: function(e) { if (e.target.files && e.target.files[0]) importConstr(e.target.files[0]); },
                    style: { display: 'none' } })
                )
              )
            ),
            names.length === 0
              ? h('p', { className: 'text-xs italic text-slate-500 text-center py-4' },
                  __alloT('stem.manipulatives.nothing_saved_yet_build_something_in_a', 'Nothing saved yet. Build something in any manipulative, then come back here to name and save it.'))
              : h('div', { className: 'divide-y divide-slate-200' },
                  names.map(function(n) {
                    var c = savedConstructions[n];
                    return h('div', { key: n, className: 'py-2 flex items-center gap-2' },
                      h('div', { className: 'flex-1 min-w-0' },
                        h('p', { className: 'text-xs font-bold text-slate-800 truncate' }, n),
                        h('p', { className: 'text-[10px] text-slate-500' },
                          (manipLabel && manipLabel[c.mode]) || c.mode, ' · ', fmtDate(c.savedAt))
                      ),
                      h('button', { onClick: function() { loadConstr(n); },
                        className: 'transition-colors px-2 py-1 rounded text-[11px] font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200' },
                        __alloT('stem.manipulatives.open', 'Open')),
                      h('button', { onClick: function() { deleteConstr(n); },
                        className: 'transition-colors px-2 py-1 rounded text-[11px] font-bold bg-rose-100 text-rose-700 hover:bg-rose-200' },
                        '✕')
                    );
                  })
                )
          ),
          h('div', { className: 'bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs text-slate-700' },
            __alloT('stem.manipulatives.the_library_lives_in_your_browser_use', '💡 The library lives in your browser. Use '), h('b', null, __alloT('stem.manipulatives.export_json_2', 'Export JSON')), __alloT('stem.manipulatives.to_back_it_up_or_share_saved_construct', ' to back it up or share saved constructions across devices. '),
            __alloT('stem.manipulatives.teachers_pre_save_a_sequence_of_look_a', 'Teachers: pre-save a sequence of "look at this" examples to walk a small group through.')
          )
        );
      }

      // ══ MATH INQUIRY widget (H7b'') ══
      if (manipMode === 'inquiry') {
        var iq = _m.mathInquiry || { gradeLevel: 4, abstractness: 3, scaffoldDensity: 5, errorTolerance: 5, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
        var setIQ = function(patch) { upd({ mathInquiry: Object.assign({}, iq, patch) }); };
        var setKey = function(k, v) { var p = {}; p[k] = v; setIQ(p); };
        var gradeAbstractMatch = Math.abs(iq.gradeLevel - iq.abstractness * 2) < 2 ? 'aligned' : 'mismatched';
        var loadIndex = (iq.abstractness * 1.5) - (iq.scaffoldDensity * 0.6) - (iq.errorTolerance * 0.4) + (10 - iq.gradeLevel) * 0.3;
        var state = gradeAbstractMatch === 'mismatched' ? 'mismatch' : loadIndex < 2 ? 'sandbox' : loadIndex < 4 ? 'productive' : loadIndex < 7 ? 'stretching' : 'overload';
        var sm = ({
          mismatch: { label: __alloT('stem.manipulatives.grade_abstractness_mismatch', 'Grade-abstractness mismatch'), color: '#f87171', bg: '#2a0a0a', border: '#dc2626', desc: __alloT('stem.manipulatives.picked_abstractness_is_far_from_grade_', 'Picked abstractness is far from grade-typical (e.g., K students with abstract algebra). Students will be lost or bored.') },
          sandbox: { label: __alloT('stem.manipulatives.sandbox_play', 'Sandbox / play'), color: '#22d3ee', bg: '#0a1f2e', border: '#0891b2', desc: __alloT('stem.manipulatives.low_cognitive_load_heavy_scaffolding_c', 'Low cognitive load. Heavy scaffolding + concrete tools = exploration-friendly. Good for first exposure.') },
          productive: { label: __alloT('stem.manipulatives.productive_struggle', 'Productive struggle'), color: '#4ade80', bg: '#0a2e1a', border: '#16a34a', desc: __alloT('stem.manipulatives.sweet_spot_challenging_enough_to_requi', 'Sweet spot. Challenging enough to require thought; scaffolded enough to make progress. The growth zone.') },
          stretching: { label: __alloT('stem.manipulatives.stretching', 'Stretching'), color: '#facc15', bg: '#2a2410', border: '#eab308', desc: __alloT('stem.manipulatives.approaching_the_upper_bound_of_product', 'Approaching the upper bound of productive challenge. Risk of frustration without teacher proximity.') },
          overload: { label: __alloT('stem.manipulatives.cognitive_overload', 'Cognitive overload'), color: '#fb923c', bg: '#2a1a0a', border: '#ea580c', desc: __alloT('stem.manipulatives.too_abstract_too_little_scaffold_too_l', 'Too abstract, too little scaffold, too little tolerance. Students freeze, give up, or develop math anxiety.') }
        })[state];
        return h('div', { className: 'p-4' },
          h('div', { className: 'flex items-center gap-3 mb-3' },
            ArrowLeft && h('button', { onClick: function() { switchMode(_m.lastMode || 'blocks'); }, className: 'transition-colors p-1.5 hover:bg-slate-100 rounded-lg' }, h(ArrowLeft, { size: 18 })),
            h('div', null, h('h3', { className: 'text-base font-bold text-slate-800' }, __alloT('stem.manipulatives.math_inquiry_pick_the_productive_strug', '🔬 Math Inquiry — Pick the Productive-Struggle Zone')), h('p', { className: 'text-xs text-slate-600' }, __alloT('stem.manipulatives.no_right_answer_tune_four_dials_predic', 'No right answer. Tune four dials. Predict where you land.')))
          ),
          h('div', { style: { padding: 14, borderRadius: 12, background: sm.bg, border: '1px solid ' + sm.border, color: '#e8f0f5' } },
            h('div', { style: { display: 'inline-block', padding: '4px 10px', borderRadius: 999, background: sm.color, color: '#000', fontSize: 11, fontWeight: 800, marginBottom: 6 } }, sm.label + ' · load index ' + loadIndex.toFixed(1)),
            h('p', { style: { margin: '0 0 10px', fontSize: 11, opacity: 0.8 } }, sm.desc),
            h('svg', { width: '100%', height: 80, viewBox: '0 0 320 80', style: { background: '#0a0a1a', borderRadius: 6, marginBottom: 8 } },
              h('rect', { x: 30, y: 30, width: 260, height: 26, fill: '#0f172a', stroke: '#1e293b' }),
              h('rect', { x: 30 + Math.max(0, Math.min(220, 60)), y: 30, width: 60, height: 26, fill: '#4ade80', opacity: 0.4 }),
              h('text', { x: 120, y: 22, fill: '#4ade80', fontSize: 9, textAnchor: 'middle' }, __alloT('stem.manipulatives.sweet_spot', 'sweet spot')),
              h('circle', { cx: 30 + Math.max(0, Math.min(260, (loadIndex + 2) * 20)), cy: 43, r: 6, fill: sm.color, stroke: '#fff', strokeWidth: 1.5 }),
              h('text', { x: 30, y: 72, fill: '#94a3b8', fontSize: 9 }, __alloT('stem.manipulatives.too_easy', 'too easy')),
              h('text', { x: 290, y: 72, fill: '#94a3b8', fontSize: 9, textAnchor: 'end' }, __alloT('stem.manipulatives.too_hard', 'too hard'))
            ),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px 12px', marginBottom: 10 } },
              h('label', { style: { fontSize: 11 } },
                h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 2 } }, h('span', null, __alloT('stem.manipulatives.grade_level_k_0_to_8', 'Grade level (K=0 to 8)')), h('span', { style: { color: sm.color, fontFamily: 'monospace', fontWeight: 700 } }, iq.gradeLevel)),
                h('input', { type: 'range', 'aria-label': 'Grade level', 'aria-valuetext': (iq.gradeLevel === 0 ? 'Kindergarten' : 'grade ' + iq.gradeLevel), min: 0, max: 8, step: 1, value: iq.gradeLevel, onChange: function(e) { setKey('gradeLevel', parseInt(e.target.value, 10)); }, style: { width: '100%' } })
              ),
              h('label', { style: { fontSize: 11 } },
                h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 2 } }, h('span', null, __alloT('stem.manipulatives.abstractness_concrete_1_symbolic_5', 'Abstractness (concrete 1 → symbolic 5)')), h('span', { style: { color: sm.color, fontFamily: 'monospace', fontWeight: 700 } }, iq.abstractness)),
                h('input', { type: 'range', 'aria-label': 'Abstractness', 'aria-valuetext': iq.abstractness + ' of 5, concrete to symbolic', min: 1, max: 5, step: 1, value: iq.abstractness, onChange: function(e) { setKey('abstractness', parseInt(e.target.value, 10)); }, style: { width: '100%' } })
              ),
              h('label', { style: { fontSize: 11 } },
                h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 2 } }, h('span', null, __alloT('stem.manipulatives.scaffold_density_1_10', 'Scaffold density (1-10)')), h('span', { style: { color: sm.color, fontFamily: 'monospace', fontWeight: 700 } }, iq.scaffoldDensity)),
                h('input', { type: 'range', 'aria-label': 'Scaffold density', 'aria-valuetext': iq.scaffoldDensity + ' of 10', min: 1, max: 10, step: 1, value: iq.scaffoldDensity, onChange: function(e) { setKey('scaffoldDensity', parseInt(e.target.value, 10)); }, style: { width: '100%' } })
              ),
              h('label', { style: { fontSize: 11 } },
                h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 2 } }, h('span', null, __alloT('stem.manipulatives.error_tolerance_1_10', 'Error tolerance (1-10)')), h('span', { style: { color: sm.color, fontFamily: 'monospace', fontWeight: 700 } }, iq.errorTolerance)),
                h('input', { type: 'range', 'aria-label': 'Error tolerance', 'aria-valuetext': iq.errorTolerance + ' of 10', min: 1, max: 10, step: 1, value: iq.errorTolerance, onChange: function(e) { setKey('errorTolerance', parseInt(e.target.value, 10)); }, style: { width: '100%' } })
              )
            ),
            h('div', { style: { display: 'flex', gap: 8, marginBottom: 10 } },
              h('button', { onClick: function() {
                var t = new Date().toISOString().slice(11, 19);
                setIQ({ log: iq.log.concat([{ t: t, g: iq.gradeLevel, a: iq.abstractness, sc: iq.scaffoldDensity, et: iq.errorTolerance, idx: loadIndex.toFixed(1), state: sm.label }]) });
              }, style: { flex: 1, padding: 6, fontSize: 11, fontWeight: 700, borderRadius: 6, border: '1px solid ' + sm.border, background: sm.bg, color: sm.color, cursor: 'pointer' } }, __alloT('stem.manipulatives.log_this_lesson_design', '📋 Log this lesson design')),
              h('button', { onClick: function() { setIQ({ gradeLevel: 4, abstractness: 3, scaffoldDensity: 5, errorTolerance: 5 }); }, style: { padding: '6px 10px', fontSize: 11, borderRadius: 6, border: '1px solid #1e293b', background: '#0a0a1a', color: '#94a3b8', cursor: 'pointer' } }, __alloT('stem.manipulatives.reset_7', 'Reset'))
            ),
            iq.log.length > 0 && h('div', { style: { maxHeight: 80, overflow: 'auto', padding: 6, borderRadius: 6, background: '#0a0a1a', border: '1px solid #1e293b', marginBottom: 10, fontSize: 10, fontFamily: 'monospace', lineHeight: 1.4 } },
              iq.log.slice(-5).map(function(e, i) { return h('div', { key: i }, e.t + '  ' + e.state + ' · g' + e.g + ' abs' + e.a + ' sc' + e.sc + ' et' + e.et + ' → idx ' + e.idx); })
            ),
            h('label', { style: { display: 'block', fontSize: 11, fontWeight: 700, opacity: 0.85, marginBottom: 4 } }, __alloT('stem.manipulatives.your_hypothesis_which_slider_should_a_', 'Your hypothesis (which slider should a beginning teacher worry about most? Why?)')),
            h('textarea', { value: iq.hypothesis, onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, rows: 2, placeholder: __alloT('stem.manipulatives.e_g_abstractness_mismatch_causes_the_m', 'e.g., abstractness mismatch causes the most damage because students can\'t see what they\'re even working on...'), style: { width: '100%', padding: 6, borderRadius: 6, border: '1px solid ' + sm.border, background: '#0a0a1a', color: '#e8f0f5', fontSize: 11, marginBottom: 10, resize: 'vertical' } }),
            !iq.stuckRevealed && h('button', { onClick: function() { setIQ({ stuckRevealed: true }); }, style: { padding: '6px 10px', fontSize: 11, fontWeight: 700, borderRadius: 6, border: '1px solid #1e293b', background: '#0a0a1a', color: sm.color, cursor: 'pointer', marginBottom: 10 } }, __alloT('stem.manipulatives.i_m_stuck_show_open_questions', "🤔 I'm stuck — show open questions")),
            iq.stuckRevealed && h('div', { style: { padding: 10, borderRadius: 6, background: '#0a0a1a', border: '1px dashed ' + sm.border, fontSize: 11, marginBottom: 10, lineHeight: 1.5 } },
              h('div', { style: { fontWeight: 700, color: sm.color, marginBottom: 4 } }, __alloT('stem.manipulatives.open_questions_no_answer_key', 'Open questions (no answer key)')),
              h('ul', { style: { margin: 0, paddingLeft: 16 } },
                h('li', null, __alloT('stem.manipulatives.what_does_productive_struggle_look_lik', 'What does "productive struggle" look like vs "frustration"? How would you tell the difference in a classroom?')),
                h('li', null, __alloT('stem.manipulatives.bruner_s_cpa_concrete_pictorial_abstra', 'Bruner\'s CPA: Concrete → Pictorial → Abstract. Map your abstractness slider to this progression.')),
                h('li', null, __alloT('stem.manipulatives.high_error_tolerance_means_more_room_t', 'High error tolerance means more room to be wrong. When is that helpful and when is it cruel?')),
                h('li', null, __alloT('stem.manipulatives.why_does_the_same_task_feel_different_', 'Why does the same task feel different in K vs 5th grade vs 8th grade?'))
              )
            ),
            h('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', marginBottom: 6 } },
              h('input', { type: 'checkbox', checked: iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); } }),
              h('span', null, __alloT('stem.manipulatives.i_can_explain_why_this_lesson_design_l', 'I can explain why this lesson design lands in this state.'))
            ),
            iq.understood && h('textarea', { value: iq.explanation, onChange: function(e) { setIQ({ explanation: e.target.value }); }, rows: 2, placeholder: __alloT('stem.manipulatives.explain_in_your_own_words', 'Explain in your own words...'), style: { width: '100%', padding: 6, borderRadius: 6, border: '1px solid ' + sm.border, background: '#0a0a1a', color: '#e8f0f5', fontSize: 11, marginBottom: 6, resize: 'vertical' } }),
            h('p', { style: { margin: 0, fontSize: 10, fontStyle: 'italic', opacity: 0.6 } }, __alloT('stem.manipulatives.inquiry_widget_no_score_no_reveal_no_a', 'Inquiry widget — no score, no reveal, no answer dump. Load index is a heuristic; real lesson design depends on prior knowledge, motivation, peer dynamics, and many more dimensions than four.'))
          )
        );
      }

      // ═══════════════════════════════════════════════════════════════
      // ── v3: TEACHER DASHBOARD MODE ──
      // ═══════════════════════════════════════════════════════════════
      if (manipMode === 'teacher') {
        var totalSolved = blocksSolved + abacusSolved + slideSolved + quizSolved;
        var modesUsed = Object.keys(modesVisited).length;
        var badgesCount = Object.keys(earnedBadges).length;
        var pct = badgeDefs.length > 0 ? Math.round((badgesCount / badgeDefs.length) * 100) : 0;

        var exportProgress = function() {
          var data = {
            generated: new Date().toISOString(),
            score: score, streak: streak,
            modesVisited: modesVisited,
            badges: earnedBadges,
            solved: { blocks: blocksSolved, abacus: abacusSolved, slide: slideSolved, quiz: quizSolved },
            regroupCount: regroupCount, speedBest: speedBest
          };
          var blob = JSON.stringify(data, null, 2);
          var url = 'data:application/json;charset=utf-8,' + encodeURIComponent(blob);
          var a = document.createElement('a');
          a.href = url; a.download = 'manipulatives-progress.json';
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
        };

        var exportCSV = function() {
          var rows = [
            ['metric', 'value'],
            ['generated', new Date().toISOString()],
            ['score_correct', score.correct],
            ['score_total', score.total],
            ['streak', streak],
            ['modes_visited', modesUsed],
            ['badges_earned', badgesCount],
            ['badges_total', badgeDefs.length],
            ['blocks_solved', blocksSolved],
            ['abacus_solved', abacusSolved],
            ['slide_solved', slideSolved],
            ['quiz_solved', quizSolved],
            ['regroup_count', regroupCount],
            ['speed_best_sec', speedBest != null ? speedBest.toFixed(2) : '']
          ];
          var csv = rows.map(function(r) { return r.join(','); }).join('\n');
          var url = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
          var a = document.createElement('a');
          a.href = url; a.download = 'manipulatives-progress.csv';
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
        };

        var resetProgress = function() {
          if (confirm('Reset ALL progress (score, badges, streaks, solves)? This cannot be undone.')) {
            upd({
              score: { correct: 0, total: 0 }, streak: 0,
              earnedBadges: {}, modesVisited: {},
              blocksSolved: 0, abacusSolved: 0, slideSolved: 0, quizSolved: 0,
              regroupCount: 0, speedBest: null
            });
            if (addToast) addToast('Progress reset.', 'info');
          }
        };

        var lessonPlans = [
          { grade: 'K', title: __alloT('stem.manipulatives.build_to_10', 'Build to 10'), manips: ['tenFrame', 'numberBonds'],
            desc: __alloT('stem.manipulatives.use_a_ten_frame_to_fill_in_dots_up_to_', 'Use a ten frame to fill in dots up to 10. Then switch to Number Bonds and decompose 10 into pairs (1+9, 2+8, 3+7...).'),
            standards: ['K.OA.A.3', 'K.OA.A.4'] },
          { grade: '1', title: __alloT('stem.manipulatives.adding_within_20_with_regrouping', 'Adding within 20 with regrouping'), manips: ['blocks', 'cra'],
            desc: __alloT('stem.manipulatives.build_8_with_orange_unit_blocks_add_5_', 'Build 8 with orange unit blocks. Add 5 more. Notice you now have 13 ones. Regroup 10 of them into 1 green ten-rod.'),
            standards: ['1.NBT.C.4', '1.OA.C.6'] },
          { grade: '2', title: __alloT('stem.manipulatives.place_value_to_1_000', 'Place value to 1,000'), manips: ['blocks', 'pvDisks'],
            desc: __alloT('stem.manipulatives.build_347_now_build_347_with_disks_sam', 'Build 347. Now build 347 with disks. Same number, two representations — which felt easier?'),
            standards: ['2.NBT.A.1', '2.NBT.A.3'] },
          { grade: '2', title: __alloT('stem.manipulatives.skip_counting_by_5s_and_10s', 'Skip-counting by 5s and 10s'), manips: ['hundredsChart'],
            desc: __alloT('stem.manipulatives.turn_on_the_skip_5_overlay_what_patter', 'Turn on the Skip 5 overlay. What pattern do you see? (Two vertical columns highlighted.) Now Skip 10. Now compare.'),
            standards: ['2.NBT.A.2'] },
          { grade: '3', title: __alloT('stem.manipulatives.unit_fractions_with_pattern_blocks', 'Unit fractions with pattern blocks'), manips: ['patternBlocks'],
            desc: __alloT('stem.manipulatives.place_1_hexagon_now_build_the_same_sha', 'Place 1 hexagon. Now build the SAME shape with trapezoids only — how many fit? With triangles — how many?'),
            standards: ['3.NF.A.1'] },
          { grade: '3', title: __alloT('stem.manipulatives.multiplication_as_repeated_groups', 'Multiplication as repeated groups'), manips: ['cra'],
            desc: __alloT('stem.manipulatives.pick_the_multiplication_cra_path_walk_', 'Pick the × Multiplication CRA path. Walk through 3 × 4 as three groups of 4, then as a 3×4 array, then as the equation.'),
            standards: ['3.OA.A.1'] },
          { grade: '4', title: __alloT('stem.manipulatives.area_and_perimeter_on_the_geoboard', 'Area and perimeter on the geoboard'), manips: ['geoboard'],
            desc: __alloT('stem.manipulatives.make_a_4_3_rectangle_what_is_the_perim', 'Make a 4×3 rectangle. What is the perimeter (count the unit segments around the edge)? What is the area (count the unit squares inside)?'),
            standards: ['4.MD.A.3'] },
          { grade: '4', title: __alloT('stem.manipulatives.multi_digit_addition_with_disks', 'Multi-digit addition with disks'), manips: ['pvDisks'],
            desc: __alloT('stem.manipulatives.build_256_add_178_drop_in_8_ones_7_ten', 'Build 256. Add 178: drop in 8 ones, 7 tens, 1 hundred. Now regroup: 10 ones = 1 ten, 10 tens = 1 hundred. Read the answer.'),
            standards: ['4.NBT.B.4'] },
          { grade: '5', title: __alloT('stem.manipulatives.cuisenaire_fractions', 'Cuisenaire fractions'), manips: ['cRods'],
            desc: __alloT('stem.manipulatives.place_an_orange_rod_10_what_fraction_o', 'Place an orange rod (10). What fraction of it is the yellow rod (5)? The red rod (2)? Write each as a fraction.'),
            standards: ['5.NF.B.4.b'] },
          { grade: '6', title: __alloT('stem.manipulatives.negative_numbers_with_counters', 'Negative numbers with counters'), manips: ['counters'],
            desc: __alloT('stem.manipulatives.start_with_4_yellow_and_7_red_what_is_', 'Start with 4 yellow and 7 red. What is the net value? Now remove zero pairs one at a time — what stays?'),
            standards: ['6.NS.C.5', '7.NS.A.1'] },
          { grade: 'K', title: __alloT('stem.manipulatives.subitizing_with_the_ten_frame', 'Subitizing with the ten frame'), manips: ['tenFrame'],
            desc: __alloT('stem.manipulatives.flash_a_ten_frame_for_1_second_have_st', 'Flash a ten frame for 1 second. Have students say how many they saw — no counting. Build up from 1-3, then 4-7, then 8-10.'),
            standards: ['K.CC.B.4'] },
          { grade: '1', title: __alloT('stem.manipulatives.number_bonds_to_5', 'Number bonds to 5'), manips: ['numberBonds'],
            desc: __alloT('stem.manipulatives.whole_5_drag_the_slider_so_part_1_rang', 'Whole = 5. Drag the slider so part 1 ranges through 0..5. Each time, say the bond aloud: "5 is 0 and 5, 5 is 1 and 4, ..."'),
            standards: ['K.OA.A.3', '1.OA.C.6'] },
          { grade: '2', title: __alloT('stem.manipulatives.same_number_two_ways_with_blocks', 'Same number, two ways with blocks'), manips: ['blocks'],
            desc: __alloT('stem.manipulatives.build_47_in_the_standard_way_then_buil', 'Build 47 in the standard way. Then build it again using only ones (47 ones). Then again using only tens and ones. Compare.'),
            standards: ['2.NBT.A.3'] },
          { grade: '3', title: __alloT('stem.manipulatives.skip_counting_by_7s', 'Skip-counting by 7s'), manips: ['hundredsChart'],
            desc: __alloT('stem.manipulatives.click_cells_in_7s_order_7_14_21_28_wha', 'Click cells in 7s order: 7, 14, 21, 28, ... What pattern of cells do you see? (A diagonal stripe.)'),
            standards: ['2.NBT.A.2', '3.OA.D.9'] },
          { grade: '3', title: __alloT('stem.manipulatives.equivalent_fractions_with_pattern_bloc', 'Equivalent fractions with pattern blocks'), manips: ['patternBlocks'],
            desc: __alloT('stem.manipulatives.cover_1_hexagon_with_2_trapezoids_cove', 'Cover 1 hexagon with 2 trapezoids. Cover it with 3 rhombi. Cover with 6 triangles. So 2/2 = 3/3 = 6/6 = 1.'),
            standards: ['3.NF.A.3'] },
          { grade: '4', title: __alloT('stem.manipulatives.polygons_names_on_the_geoboard', 'Polygons + names on the geoboard'), manips: ['geoboard'],
            desc: __alloT('stem.manipulatives.build_any_3_sided_shape_triangle_4_sid', 'Build any 3-sided shape (triangle), 4-sided (quadrilateral), 5-sided (pentagon), 6-sided (hexagon). Name each before building.'),
            standards: ['3.G.A.1', '4.G.A.2'] },
          { grade: '4', title: __alloT('stem.manipulatives.cuisenaire_division', 'Cuisenaire division'), manips: ['cRods'],
            desc: __alloT('stem.manipulatives.take_a_brown_8_rod_lay_red_2_rods_alon', 'Take a brown (8) rod. Lay red (2) rods alongside it: 4 fit. So 8 ÷ 2 = 4. Try with other small rods under larger ones.'),
            standards: ['3.OA.C.7', '4.NBT.B.6'] },
          { grade: '5', title: __alloT('stem.manipulatives.order_of_operations_with_counters', 'Order of operations with counters'), manips: ['counters', 'cra'],
            desc: __alloT('stem.manipulatives.model_3_2_4_first_make_a_group_of_3_2_', 'Model (3 + 2) × 4: first make a group of (3 + 2) yellows, then make 4 copies of that group. Now model 3 + (2 × 4).'),
            standards: ['5.OA.A.1'] },
          { grade: '5', title: __alloT('stem.manipulatives.prime_numbers_under_100', 'Prime numbers under 100'), manips: ['hundredsChart'],
            desc: __alloT('stem.manipulatives.use_the_show_primes_button_on_the_hund', 'Use the "Show primes" button on the Hundreds Chart. Count them. Notice the gaps. Discuss: which row has the most primes? Which has the fewest?'),
            standards: ['4.OA.B.4'] },
          { grade: '6', title: __alloT('stem.manipulatives.integer_subtraction_keep_change_change', 'Integer subtraction (KEEP-CHANGE-CHANGE)'), manips: ['counters', 'cra'],
            desc: __alloT('stem.manipulatives.model_5_3_keep_5_change_minus_to_plus_', 'Model 5 − (−3): "Keep 5, change minus to plus, change −3 to +3" → 5 + 3 = 8. Show with counters: removing 3 reds from a pile increases the net by 3.'),
            standards: ['7.NS.A.1.C'] },
          { grade: 'K-1', title: __alloT('stem.manipulatives.showing_more_and_less', 'Showing "more" and "less"'), manips: ['cRods', 'tenFrame'],
            desc: __alloT('stem.manipulatives.show_a_red_rod_2_and_a_yellow_rod_5_wh', 'Show a red rod (2) and a yellow rod (5). Which is more? By how many? Now do the same with ten frames showing 4 and 7.'),
            standards: ['K.CC.C.6', '1.OA.A.1'] },
          { grade: '2-3', title: __alloT('stem.manipulatives.composing_100', 'Composing 100'), manips: ['blocks', 'pvDisks'],
            desc: __alloT('stem.manipulatives.use_10_tens_rods_to_build_100_trade_fo', 'Use 10 tens-rods to build 100. Trade for one hundreds-flat. Same idea with disks: 10 ten-disks → 1 hundred-disk.'),
            standards: ['2.NBT.A.1.A'] },
          { grade: '4-5', title: __alloT('stem.manipulatives.hands_off_slide_rule_demo', 'Hands-off slide rule demo'), manips: ['slideRule'],
            desc: __alloT('stem.manipulatives.show_2_3_on_the_slide_rule_by_aligning', 'Show 2 × 3 on the slide rule by aligning 1 on the C scale with 2 on the D scale, then reading under 3 on C. The cursor lands on 6.'),
            standards: ['5.OA.A.2'] },
          { grade: 'K', title: __alloT('stem.manipulatives.make_10_with_counters', 'Make-10 with counters'), manips: ['counters', 'tenFrame'],
            desc: __alloT('stem.manipulatives.pretend_yellow_is_in_our_jar_and_we_ne', 'Pretend yellow is "in our jar" and we need 10. Start with some yellow. How many MORE to get to 10? Place that many. Verify with a ten frame.'),
            standards: ['K.OA.A.4'] },
          { grade: '4', title: __alloT('stem.manipulatives.standard_algorithm_with_disks_subtract', 'Standard algorithm with disks (subtraction)'), manips: ['pvDisks'],
            desc: __alloT('stem.manipulatives.build_503_subtract_248_you_ll_need_to_', 'Build 503. Subtract 248. You\'ll need to ungroup: trade 1 hundred for 10 tens, then 1 ten for 10 ones. Read the answer from the remaining disks: 255.'),
            standards: ['4.NBT.B.4'] },
          { grade: '5', title: __alloT('stem.manipulatives.area_as_multiplication', 'Area as multiplication'), manips: ['geoboard'],
            desc: __alloT('stem.manipulatives.build_a_4_6_rectangle_on_the_geoboard_', 'Build a 4×6 rectangle on the geoboard. Count unit squares: 24. Notice 4 × 6 = 24. Area = length × width.'),
            standards: ['5.MD.C.5'] },
          { grade: '2', title: __alloT('stem.manipulatives.odd_vs_even_on_the_hundreds_chart', 'Odd vs even on the hundreds chart'), manips: ['hundredsChart'],
            desc: __alloT('stem.manipulatives.color_every_other_cell_starting_at_2_w', 'Color every other cell starting at 2. What pattern do you see? (Columns of evens, columns of odds.) Why is the rightmost digit always 0, 2, 4, 6, or 8 for evens?'),
            standards: ['2.OA.C.3'] },
          { grade: '3', title: __alloT('stem.manipulatives.multiplication_facts_with_arrays', 'Multiplication facts with arrays'), manips: ['cRods', 'cra'],
            desc: __alloT('stem.manipulatives.walk_through_cra_for_4_3_4_groups_of_3', 'Walk through CRA for 4 × 3: 4 groups of 3 white rods, then a 4-by-3 array of dots, then the equation 4 × 3 = 12.'),
            standards: ['3.OA.A.1', '3.OA.C.7'] },
          { grade: '1', title: __alloT('stem.manipulatives.counting_on_with_the_abacus', 'Counting on with the abacus'), manips: ['abacus'],
            desc: __alloT('stem.manipulatives.show_6_on_the_ones_rod_add_2_by_slidin', 'Show 6 on the ones rod. Add 2 by sliding two more earth beads. Now show 9 + 4: add 5 by sliding the heaven bead down, then take back 1.'),
            standards: ['1.OA.C.5', '1.OA.C.6'] },
          { grade: '3-4', title: __alloT('stem.manipulatives.money_with_disks', 'Money with disks'), manips: ['pvDisks'],
            desc: __alloT('stem.manipulatives.re_label_disks_ones_pennies_tens_dimes', 'Re-label disks: ones = pennies, tens = dimes, hundreds = dollars. Build $2.47 with 2 dollar-disks, 4 dime-disks, 7 penny-disks. Add $1.85.'),
            standards: ['2.MD.C.8'] },
          { grade: '4-5', title: __alloT('stem.manipulatives.decimals_with_disks', 'Decimals with disks'), manips: ['pvDisks'],
            desc: __alloT('stem.manipulatives.re_label_ones_tenths_tens_wholes_so_23', 'Re-label: ones = tenths, tens = wholes. So 23 disks = 2.3. Build, regroup, read aloud.'),
            standards: ['4.NF.C.6', '5.NBT.A.3'] },
          { grade: '5-6', title: __alloT('stem.manipulatives.fraction_addition', 'Fraction addition'), manips: ['cRods'],
            desc: __alloT('stem.manipulatives.build_1_2_1_3_with_rods_using_a_6_rod_', 'Build 1/2 + 1/3 with rods, using a 6-rod (dark green) as the whole. Half of 6 is 3 (light green). A third is 2 (red). Combined: 5. Read as 5/6.'),
            standards: ['5.NF.A.1'] },
          { grade: '6', title: __alloT('stem.manipulatives.subtracting_negatives', 'Subtracting negatives'), manips: ['counters'],
            desc: __alloT('stem.manipulatives.show_3_yellow_pose_3_2_you_don_t_have_', 'Show 3 yellow. Pose: 3 − (−2). You don\'t have any reds to take away! So FIRST add a zero pair (1 yellow + 1 red doesn\'t change net). Now you can remove 2 reds. Final: 5.'),
            standards: ['7.NS.A.1.C'] },
          { grade: 'K-1', title: __alloT('stem.manipulatives.shape_sorting', 'Shape sorting'), manips: ['patternBlocks'],
            desc: __alloT('stem.manipulatives.sort_blocks_into_bins_by_number_of_sid', 'Sort blocks into bins by number of sides: triangles (3), squares (4), trapezoids (4), hexagons (6). Count each pile.'),
            standards: ['K.G.A.2', '1.G.A.1'] },
          { grade: '4-5', title: __alloT('stem.manipulatives.place_value_to_one_million', 'Place value to one million'), manips: ['blocks', 'pvDisks'],
            desc: __alloT('stem.manipulatives.a_thousand_cube_is_1_000_ten_of_those_', 'A thousand-cube is 1,000. Ten of those would be 10,000. A hundred of those is 1,000,000. Build 1,000,000 in your imagination: 10 stacks of 10 cubes of 10 cubes. Now you understand "ten million."'),
            standards: ['4.NBT.A.1'] },
          { grade: '5', title: __alloT('stem.manipulatives.coordinate_grid_intro', 'Coordinate grid intro'), manips: ['geoboard'],
            desc: __alloT('stem.manipulatives.label_the_geoboard_pegs_with_x_y_coord', 'Label the geoboard pegs with (x, y) coordinates. Plot the point (2, 3). Connect (1,1), (4,1), (4,3), (1,3) to make a rectangle. Compute its perimeter and area.'),
            standards: ['5.G.A.1', '5.G.A.2'] },
          { grade: '6', title: __alloT('stem.manipulatives.ratios_with_cuisenaire', 'Ratios with Cuisenaire'), manips: ['cRods'],
            desc: __alloT('stem.manipulatives.place_2_red_rods_2_each_and_3_yellow_r', 'Place 2 red rods (2 each) and 3 yellow rods (5 each). Ratio of reds to yellows is 2:3. Total reds = 4 units; total yellows = 15 units. What is the ratio of total LENGTHS?'),
            standards: ['6.RP.A.1'] },
          { grade: '7', title: __alloT('stem.manipulatives.percent_as_fraction_with_blocks', 'Percent as fraction with blocks'), manips: ['blocks', 'patternBlocks'],
            desc: __alloT('stem.manipulatives.50_means_50_out_of_100_build_a_100_fla', '50% means 50 out of 100. Build a 100-flat. Show 50%: half the flat = 50 ones. Show 25%: 1/4 of the flat = 25 ones. Show 75%, 10%, 5%.'),
            standards: ['6.RP.A.3.C'] },
          { grade: '3-4', title: __alloT('stem.manipulatives.combinations_puzzle', 'Combinations puzzle'), manips: ['cRods', 'numberBonds'],
            desc: __alloT('stem.manipulatives.how_many_ways_can_you_make_a_train_of_', 'How many ways can you make a "train" of length 4 using only Cuisenaire rods? Find all of them and list. (1+1+1+1, 1+1+2, 1+3, 2+2, 4 — 5 unordered ways.)'),
            standards: ['4.OA.A.3'] },
          { grade: 'K-1', title: __alloT('stem.manipulatives.counting_backward_from_10', 'Counting backward from 10'), manips: ['tenFrame', 'cRods'],
            desc: __alloT('stem.manipulatives.fill_a_ten_frame_remove_dots_one_at_a_', 'Fill a ten frame. Remove dots one at a time, counting backward: 10, 9, 8, 7, ... 1, 0. Notice the visual shrinking.'),
            standards: ['K.CC.A.2'] },
          { grade: '2-3', title: __alloT('stem.manipulatives.skip_count_chant', 'Skip-count chant'), manips: ['hundredsChart'],
            desc: __alloT('stem.manipulatives.skip_count_by_2s_aloud_2_4_6_30_by_5s_', 'Skip-count by 2s aloud: 2, 4, 6, ... 30. By 5s: 5, 10, ... 50. Highlight each on the chart as you say it. Notice columns / diagonals.'),
            standards: ['2.NBT.A.2', '3.OA.A.4'] },
          { grade: '3-4', title: __alloT('stem.manipulatives.fact_family_triangles', 'Fact-family triangles'), manips: ['numberBonds'],
            desc: __alloT('stem.manipulatives.a_number_bond_with_whole_12_and_parts_', 'A number bond with whole 12 and parts 5 and 7 gives 4 facts: 5+7=12, 7+5=12, 12−5=7, 12−7=5. Have students list all 4 from any single bond.'),
            standards: ['3.OA.B.6'] },
          { grade: '4', title: __alloT('stem.manipulatives.long_multiplication_via_array', 'Long multiplication via array'), manips: ['cRods', 'cra'],
            desc: __alloT('stem.manipulatives.model_13_14_build_a_13_by_14_grid_with', 'Model 13 × 14: build a 13-by-14 grid with rods. Break it: (10+3) × (10+4) = 100 + 40 + 30 + 12 = 182. This is "area model" multiplication.'),
            standards: ['4.NBT.B.5'] },
          { grade: '5', title: __alloT('stem.manipulatives.common_denominators_with_c_rods', 'Common denominators with C-rods'), manips: ['cRods'],
            desc: __alloT('stem.manipulatives.compare_1_3_and_1_4_the_lcd_is_12_use_', 'Compare 1/3 and 1/4. The LCD is 12. Use 12 = orange + red as your whole. 1/3 = 4 white rods. 1/4 = 3 white rods. Visible: 1/3 > 1/4.'),
            standards: ['5.NF.A.1'] }
        ];

        return h('div', { className: 'space-y-4 max-w-4xl mx-auto animate-in fade-in duration-200' },
          headerEl,
          // Progress overview
          h('div', { className: 'bg-white rounded-xl border-2 border-slate-700 p-4' },
            h('p', { className: 'text-xs font-bold text-slate-700 uppercase tracking-wider mb-3' }, __alloT('stem.manipulatives.student_progress_this_device', '📊 Student progress (this device)')),
            h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2' },
              h('div', { className: 'bg-emerald-50 rounded p-2 text-center' },
                h('p', { className: 'text-xs text-emerald-700' }, __alloT('stem.manipulatives.score', 'Score')),
                h('p', { className: 'text-xl font-black text-emerald-900' }, score.correct + '/' + score.total)
              ),
              h('div', { className: 'bg-amber-50 rounded p-2 text-center' },
                h('p', { className: 'text-xs text-amber-700' }, __alloT('stem.manipulatives.best_streak', 'Best streak')),
                h('p', { className: 'text-xl font-black text-amber-900' }, streak)
              ),
              h('div', { className: 'bg-blue-50 rounded p-2 text-center' },
                h('p', { className: 'text-xs text-blue-700' }, __alloT('stem.manipulatives.modes_used', 'Modes used')),
                h('p', { className: 'text-xl font-black text-blue-900' }, modesUsed + '/12')
              ),
              h('div', { className: 'bg-purple-50 rounded p-2 text-center' },
                h('p', { className: 'text-xs text-purple-700' }, __alloT('stem.manipulatives.badges_3', 'Badges')),
                h('p', { className: 'text-xl font-black text-purple-900' }, badgesCount + '/' + badgeDefs.length + ' (' + pct + '%)')
              )
            ),
            h('div', { className: 'mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]' },
              h('div', { className: 'bg-slate-50 rounded p-2 text-center' },
                h('p', { className: 'text-slate-600' }, __alloT('stem.manipulatives.blocks_solved', 'Blocks solved')),
                h('p', { className: 'font-bold text-slate-900' }, blocksSolved)
              ),
              h('div', { className: 'bg-slate-50 rounded p-2 text-center' },
                h('p', { className: 'text-slate-600' }, __alloT('stem.manipulatives.abacus_solved', 'Abacus solved')),
                h('p', { className: 'font-bold text-slate-900' }, abacusSolved)
              ),
              h('div', { className: 'bg-slate-50 rounded p-2 text-center' },
                h('p', { className: 'text-slate-600' }, __alloT('stem.manipulatives.regroups', 'Regroups')),
                h('p', { className: 'font-bold text-slate-900' }, regroupCount)
              ),
              h('div', { className: 'bg-slate-50 rounded p-2 text-center' },
                h('p', { className: 'text-slate-600' }, __alloT('stem.manipulatives.best_speed', 'Best speed')),
                h('p', { className: 'font-bold text-slate-900' }, speedBest != null ? speedBest.toFixed(1) + 's' : '—')
              )
            ),
            // Mode-by-mode visited indicator
            h('p', { className: 'text-[11px] font-bold text-slate-700 mt-3 mb-1' }, __alloT('stem.manipulatives.mode_coverage', 'Mode coverage:')),
            h('div', { className: 'flex flex-wrap gap-1' },
              ['blocks', 'abacus', 'slideRule', 'quiz', 'tenFrame', 'counters', 'pvDisks', 'hundredsChart', 'patternBlocks', 'geoboard', 'cRods', 'numberBonds'].map(function(mid) {
                return h('span', { key: mid,
                  className: 'px-2 py-0.5 rounded text-[10px] font-mono ' +
                    (modesVisited[mid] ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400 line-through')
                }, mid);
              })
            )
          ),
          // Export panel
          h('div', { className: 'bg-white rounded-xl border-2 border-slate-200 p-3' },
            h('p', { className: 'text-xs font-bold text-slate-700 mb-2' }, __alloT('stem.manipulatives.export_reset', '📤 Export / reset:')),
            h('div', { className: 'flex gap-2 flex-wrap' },
              h('button', { onClick: exportCSV,
                className: 'transition-colors px-3 py-1.5 rounded text-xs font-bold bg-blue-600 text-white hover:bg-blue-700' }, __alloT('stem.manipulatives.export_csv', 'Export CSV')),
              h('button', { onClick: exportProgress,
                className: 'transition-colors px-3 py-1.5 rounded text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700' }, __alloT('stem.manipulatives.export_json_3', 'Export JSON')),
              h('button', { onClick: resetProgress,
                className: 'transition-colors px-3 py-1.5 rounded text-xs font-bold bg-rose-100 text-rose-700 hover:bg-rose-200 ml-auto' }, __alloT('stem.manipulatives.reset_progress', '↻ Reset progress'))
            )
          ),
          // Lesson plan templates
          h('div', { className: 'bg-white rounded-xl border-2 border-slate-200 overflow-hidden' },
            h('div', { className: 'bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-800' },
              '📝 Lesson plan templates (' + lessonPlans.length + ')'
            ),
            h('div', { className: 'divide-y divide-slate-200' },
              lessonPlans.map(function(lp, i) {
                return h('div', { key: 'lp' + i, className: 'p-3' },
                  h('div', { className: 'flex items-start justify-between gap-2 mb-1' },
                    h('div', null,
                      h('span', { className: 'inline-block px-1.5 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded mr-2' }, 'Grade ' + lp.grade),
                      h('span', { className: 'text-sm font-bold text-slate-800' }, lp.title)
                    ),
                    h('div', { className: 'flex gap-1' },
                      lp.manips.map(function(m) {
                        return h('button', { key: m, onClick: function() { switchMode(m); },
                          className: 'transition-colors px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 whitespace-nowrap'
                        }, '→ ' + m);
                      })
                    )
                  ),
                  h('p', { className: 'text-xs text-slate-700 mb-1' }, lp.desc),
                  h('div', { className: 'flex gap-1 flex-wrap' },
                    lp.standards.map(function(s) {
                      return h('span', { key: s, className: 'font-mono text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded' }, s);
                    })
                  )
                );
              })
            )
          ),
          // Settings (palette, sound, motion)
          h('div', { className: 'bg-white rounded-xl border-2 border-slate-200 p-3' },
            h('p', { className: 'text-xs font-bold text-slate-700 mb-2' }, __alloT('stem.manipulatives.accessibility_settings', '⚙️ Accessibility settings:')),
            h('div', { className: 'space-y-2' },
              h('div', null,
                h('p', { className: 'text-[11px] font-bold text-slate-700 mb-1' }, __alloT('stem.manipulatives.color_palette_applies_to_counters_rods', 'Color palette (applies to counters, rods, geoboard, ten frame):')),
                h('div', { className: 'flex gap-1 flex-wrap' },
                  Object.keys(MANIP_PALETTES).map(function(pid) {
                    return h('button', { key: pid, onClick: function() { upd({ paletteId: pid }); },
                      className: 'px-2.5 py-1 rounded text-[11px] font-bold transition-all ' +
                        (paletteId === pid ? 'bg-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100')
                    }, MANIP_PALETTES[pid].name);
                  })
                )
              ),
              h('label', { className: 'flex items-center gap-2 text-[11px] text-slate-700' },
                h('input', { type: 'checkbox', checked: soundEnabled,
                  onChange: function() { upd({ soundEnabled: !soundEnabled }); }, className: 'accent-slate-600' }),
                __alloT('stem.manipulatives.sound_effects', 'Sound effects')
              )
            )
          ),
          h('div', { className: 'bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs text-slate-700' },
            __alloT('stem.manipulatives.the_teacher_dashboard_is_local_to_this', '💡 The Teacher dashboard is local to this device. If multiple students share a device, export each student\'s '),
            __alloT('stem.manipulatives.csv_at_the_end_of_a_session_and_reset_', 'CSV at the end of a session and reset before the next student begins.')
          )
        );
      }

      // ═══════════════════════════════════════════════════════════════
      // ── v3: CHALLENGE HUB MODE ──
      // ═══════════════════════════════════════════════════════════════
      // Random mixed-manipulative practice. The cognitive-science argument
      // is interleaving (Rohrer & Taylor 2007): mixed practice produces
      // better transfer than blocked practice of one type.
      if (manipMode === 'challenges') {
        var chProblems = [
          { id: 'tf_makeTen', cat: 'Ten Frames',
            gen: function() {
              var have = 1 + Math.floor(Math.random() * 9);
              return { q: 'A ten frame shows ' + have + ' dots. How many MORE to make 10?', a: 10 - have };
            }, mode: 'tenFrame', goal: 'tenFrame' },
          { id: 'tf_subitize', cat: 'Ten Frames',
            gen: function() {
              var n = 4 + Math.floor(Math.random() * 6);
              return { q: 'A ten frame has the top row full and ' + (n - 5) + ' more in the bottom row. How many total?', a: n };
            }, mode: 'tenFrame', goal: 'tenFrame' },
          { id: 'ct_net', cat: 'Counters',
            gen: function() {
              var y = 1 + Math.floor(Math.random() * 8);
              var r = 1 + Math.floor(Math.random() * 8);
              return { q: 'Yellow: ' + y + ', Red: ' + r + '. What is the net value (yellow − red)?', a: y - r };
            }, mode: 'counters', goal: 'counters' },
          { id: 'ct_pairs', cat: 'Counters',
            gen: function() {
              var y = 2 + Math.floor(Math.random() * 6);
              var r = 2 + Math.floor(Math.random() * 6);
              return { q: y + ' yellow, ' + r + ' red — how many zero pairs?', a: Math.min(y, r) };
            }, mode: 'counters', goal: 'counters' },
          { id: 'pvd_total', cat: 'PV Disks',
            gen: function() {
              var th = Math.floor(Math.random() * 4);
              var hu = Math.floor(Math.random() * 10);
              var te = Math.floor(Math.random() * 10);
              var on = Math.floor(Math.random() * 10);
              return { q: th + ' thousands + ' + hu + ' hundreds + ' + te + ' tens + ' + on + ' ones = ?',
                       a: th * 1000 + hu * 100 + te * 10 + on };
            }, mode: 'pvDisks', goal: 'pvDisks' },
          { id: 'pvd_regroup', cat: 'PV Disks',
            gen: function() {
              var te = 12 + Math.floor(Math.random() * 8); // 12..19
              return { q: 'You have ' + te + ' tens disks. After regrouping, how many TENS are left?', a: te - 10 };
            }, mode: 'pvDisks', goal: 'pvDisks' },
          { id: 'hc_skip', cat: 'Hundreds Chart',
            gen: function() {
              var step = [2, 3, 5, 10][Math.floor(Math.random() * 4)];
              var n = 2 + Math.floor(Math.random() * 8);
              return { q: 'Skip-count by ' + step + 's. The ' + n + 'th number is?', a: step * n };
            }, mode: 'hundredsChart', goal: 'hundredsChart' },
          { id: 'pb_frac', cat: 'Pattern Blocks',
            gen: function() {
              var which = ['trap', 'rhom', 'tri'][Math.floor(Math.random() * 3)];
              var ans = { trap: '1/2', rhom: '1/3', tri: '1/6' };
              var name = { trap: 'red trapezoid', rhom: 'blue rhombus', tri: 'green triangle' };
              return { q: 'If a yellow hexagon = 1, what fraction is the ' + name[which] + '?', a: ans[which] };
            }, mode: 'patternBlocks', goal: 'patternBlocks', strAnswer: true },
          { id: 'gb_area', cat: 'Geoboard',
            gen: function() {
              var w = 2 + Math.floor(Math.random() * 4);
              var hgt = 2 + Math.floor(Math.random() * 4);
              return { q: 'A rectangle on the geoboard is ' + w + ' units wide and ' + hgt + ' units tall. Area?', a: w * hgt };
            }, mode: 'geoboard', goal: 'geoboard' },
          { id: 'gb_perim', cat: 'Geoboard',
            gen: function() {
              var w = 2 + Math.floor(Math.random() * 4);
              var hgt = 2 + Math.floor(Math.random() * 4);
              return { q: 'A rectangle on the geoboard is ' + w + ' wide and ' + hgt + ' tall. Perimeter?', a: 2 * (w + hgt) };
            }, mode: 'geoboard', goal: 'geoboard' },
          { id: 'cr_sum', cat: 'Cuisenaire',
            gen: function() {
              var a = 1 + Math.floor(Math.random() * 9);
              var b = 1 + Math.floor(Math.random() * (10 - a));
              return { q: 'A rod of length ' + a + ' next to a rod of length ' + b + '. Combined length?', a: a + b };
            }, mode: 'cRods', goal: 'cRods' },
          { id: 'cr_fit', cat: 'Cuisenaire',
            gen: function() {
              var bigs = [4, 6, 8, 10];
              var big = bigs[Math.floor(Math.random() * bigs.length)];
              var small = [2, 2, 3, 5][bigs.indexOf(big)];
              return { q: 'How many rods of length ' + small + ' fit along an orange-' + big + '?', a: big / small };
            }, mode: 'cRods', goal: 'cRods' },
          { id: 'nb_part', cat: 'Number Bonds',
            gen: function() {
              var w = 5 + Math.floor(Math.random() * 6);
              var p1 = 1 + Math.floor(Math.random() * (w - 1));
              return { q: 'A number bond: whole = ' + w + ', one part = ' + p1 + '. Other part?', a: w - p1 };
            }, mode: 'numberBonds', goal: 'numberBonds' },
          { id: 'nb_decomp', cat: 'Number Bonds',
            gen: function() {
              // Total number of ways to decompose w into two non-negative ordered parts
              var w = 5 + Math.floor(Math.random() * 6);
              return { q: 'How many DIFFERENT ways can ' + w + ' be split into two parts (order matters, parts may be 0)?', a: w + 1 };
            }, mode: 'numberBonds', goal: 'numberBonds' }
        ];

        var chPick = function() {
          var p = chProblems[Math.floor(Math.random() * chProblems.length)];
          var made = p.gen();
          upd({ crChallenge: { catId: p.id, cat: p.cat, q: made.q, ans: made.a, mode: p.mode, strAnswer: !!p.strAnswer }, crUserAns: '', crFeedback: null });
        };
        var chCheck = function() {
          if (!crChallenge) return;
          var raw = (_m.crUserAns || '').toString().trim();
          if (raw === '') return;
          var ok = crChallenge.strAnswer ? raw === crChallenge.ans : parseFloat(raw) === crChallenge.ans;
          var newStreak = ok ? streak + 1 : 0;
          upd({
            crFeedback: { ok: ok, msg: ok ? '✅ Correct! Answer = ' + crChallenge.ans : '❌ Answer was ' + crChallenge.ans },
            score: { correct: score.correct + (ok ? 1 : 0), total: score.total + 1 },
            streak: newStreak
          });
          if (ok) {
            var newHub = (_m.hubSolved || 0) + 1;
            upd({ hubSolved: newHub });
            if (soundEnabled) sfxCorrect();
            if (awardXP) awardXP('manip_challenge_hub', 4, 'challenge hub');
            checkBadges({ streak: newStreak, hubSolved: newHub });
          } else {
            if (soundEnabled) sfxWrong();
          }
        };
        var chJumpToManip = function() {
          if (crChallenge && crChallenge.mode) switchMode(crChallenge.mode);
        };

        // Counter the categories
        var catCounts = {};
        chProblems.forEach(function(p) { catCounts[p.cat] = (catCounts[p.cat] || 0) + 1; });
        var cats = Object.keys(catCounts).sort();

        return h('div', { className: 'space-y-3 max-w-3xl mx-auto animate-in fade-in duration-200' },
          headerEl,
          h('div', { className: 'bg-white rounded-xl border-2 border-amber-200 p-4' },
            h('div', { className: 'flex items-center justify-between mb-3' },
              h('p', { className: 'text-xs font-bold text-amber-700 uppercase tracking-wider' },
                'Challenge ' + (score.total > 0 ? '· ' + score.correct + '/' + score.total : '')
              ),
              streak >= 3 && h('p', { className: 'text-xs font-bold text-orange-600' }, '🔥 ' + streak + ' in a row')
            ),
            !crChallenge && h('div', { className: 'text-center py-6' },
              h('p', { className: 'text-sm text-slate-600 mb-3' }, 'Hit the button. We will pick a random problem from any of the ' + chProblems.length + ' challenge types.'),
              h('button', { onClick: chPick,
                className: 'transition-colors px-5 py-2.5 rounded-lg bg-amber-600 text-white font-bold text-sm hover:bg-amber-700 shadow-md' },
                __alloT('stem.manipulatives.pick_a_problem', '🎲 Pick a problem')
              )
            ),
            crChallenge && h('div', { className: 'space-y-3' },
              h('div', { className: 'flex items-center justify-between' },
                h('span', { className: 'inline-block px-2 py-0.5 bg-amber-100 text-amber-800 text-[11px] font-bold rounded' }, crChallenge.cat),
                h('button', { onClick: chJumpToManip,
                  className: 'transition-colors text-[11px] text-blue-600 hover:text-blue-800 underline' },
                  '→ open the ' + crChallenge.cat + ' manipulative')
              ),
              h('p', { className: 'text-base font-bold text-slate-800 px-2 py-3 bg-amber-50 rounded-lg border border-amber-200' },
                crChallenge.q
              ),
              !crFeedback && h('div', { className: 'flex gap-2' },
                h('input', { type: crChallenge.strAnswer ? 'text' : 'number',
                  value: _m.crUserAns || '',
                  onChange: function(e) { upd({ crUserAns: e.target.value }); },
                  onKeyDown: function(e) { if (e.key === 'Enter') chCheck(); },
                  placeholder: __alloT('stem.manipulatives.your_answer', 'Your answer'),
                  className: 'flex-1 px-3 py-2 border border-amber-400 rounded text-sm font-mono'
                }),
                h('button', { onClick: chCheck,
                  className: 'transition-colors px-4 py-2 bg-amber-600 text-white font-bold rounded text-sm hover:bg-amber-700' }, __alloT('stem.manipulatives.check_9', 'Check'))
              ),
              crFeedback && h('div', { className: 'space-y-2' },
                h('p', { className: 'text-sm font-bold ' + (crFeedback.ok ? 'text-green-700' : 'text-red-700') }, crFeedback.msg),
                h('button', { onClick: chPick,
                  className: 'transition-colors w-full px-4 py-2 bg-amber-600 text-white font-bold rounded text-sm hover:bg-amber-700' },
                  __alloT('stem.manipulatives.next_problem_2', '🔄 Next problem')
                )
              )
            )
          ),
          // Category breakdown
          h('div', { className: 'bg-white rounded-xl border-2 border-amber-200 p-3' },
            h('p', { className: 'text-xs font-bold text-amber-700 mb-2' }, __alloT('stem.manipulatives.categories_in_the_pool', 'Categories in the pool:')),
            h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-1.5' },
              cats.map(function(c) {
                return h('div', { key: c, className: 'bg-amber-50 rounded p-2 text-center border border-amber-100' },
                  h('p', { className: 'text-[10px] font-bold text-amber-800' }, c),
                  h('p', { className: 'text-base font-black text-amber-900' }, catCounts[c]),
                  h('p', { className: 'text-[10px] text-amber-600' }, catCounts[c] === 1 ? 'problem type' : 'problem types')
                );
              })
            )
          ),
          h('div', { className: 'bg-amber-50 rounded-lg p-3 border border-amber-100 text-xs text-amber-800' },
            __alloT('stem.manipulatives.interleaving_mixed_practice_across_top', '💡 Interleaving (mixed practice across topics) usually beats blocked practice for long-term retention '),
            __alloT('stem.manipulatives.rohrer_taylor_2007_the_trade_off_it_fe', '(Rohrer & Taylor 2007). The trade-off: it FEELS harder during the session. That feeling of difficulty is the learning happening.')
          )
        );
      }

      // ═══════════════════════════════════════════════════════════════
      // ── v3: GLOSSARY MODE ──
      // ═══════════════════════════════════════════════════════════════
      // Mathematical vocabulary, tied to the manipulative that shows the concept.
      if (manipMode === 'glossary') {
        var glossary = [
          { term: 'Place value',           manip: 'blocks',
            def: 'A digit\'s value depends on its position. In 347 the "3" means 300, not 3.',
            example: 'In 5,280 the 5 is in the thousands place — it stands for 5,000, not 5.' },
          { term: 'Regroup (carrying)',    manip: 'blocks',
            def: 'When you have 10 of one place-value unit, trade them in for 1 of the next.',
            example: '14 ones = 1 ten + 4 ones. The 1 "carries" into the tens column.' },
          { term: 'Ungroup (borrowing)',   manip: 'blocks',
            def: 'When you can\'t subtract, trade 1 of a place for 10 of the place below.',
            example: 'To do 32 − 17 you need to ungroup: 32 becomes 2 tens + 12 ones.' },
          { term: 'Expanded form',         manip: 'blocks',
            def: 'A number written as a sum of its place values.',
            example: '347 = 300 + 40 + 7. Or: 3 × 100 + 4 × 10 + 7 × 1.' },
          { term: 'Standard form',         manip: 'blocks',
            def: 'A number written as digits in a row, the normal way.',
            example: 'The standard form of "three hundred forty-seven" is 347.' },
          { term: 'Subitize',              manip: 'tenFrame',
            def: 'Recognize a small quantity instantly without counting one-by-one.',
            example: 'Most adults subitize up to about 4 dots; ten frames teach kids to subitize up to 10.' },
          { term: 'Decompose',             manip: 'numberBonds',
            def: 'Break a number into smaller parts that add back to the whole.',
            example: '10 can be decomposed as 6+4, 7+3, 9+1, 5+5, and so on.' },
          { term: 'Compose',               manip: 'numberBonds',
            def: 'Put two parts together to make a whole.',
            example: 'Composing 7 + 3 gives 10.' },
          { term: 'Zero pair',             manip: 'counters',
            def: 'One positive and one negative cancel each other out.',
            example: '+1 paired with −1 = 0. So 5 yellow and 3 red counters net to +2.' },
          { term: 'Integer',               manip: 'counters',
            def: 'A whole number, positive or negative (or zero), with no fraction.',
            example: '... −3, −2, −1, 0, 1, 2, 3 ... are integers.' },
          { term: 'Multiple',              manip: 'hundredsChart',
            def: 'The result of multiplying a number by a whole number.',
            example: 'The multiples of 5 are 5, 10, 15, 20, 25... — every 5th cell on the chart.' },
          { term: 'Skip counting',         manip: 'hundredsChart',
            def: 'Counting forward by a step bigger than 1.',
            example: 'Skip-count by 2s: 2, 4, 6, 8, 10... Skip-count by 5s: 5, 10, 15...' },
          { term: 'Prime number',          manip: 'hundredsChart',
            def: 'A number greater than 1 with exactly two factors (1 and itself).',
            example: '2, 3, 5, 7, 11, 13, 17, 19, 23, 29 — these are all primes.' },
          { term: 'Factor',                manip: 'hundredsChart',
            def: 'A number that divides another evenly (no remainder).',
            example: 'The factors of 12 are 1, 2, 3, 4, 6, 12.' },
          { term: 'Unit fraction',         manip: 'patternBlocks',
            def: 'A fraction with a 1 on top — one piece of a whole partitioned into equal parts.',
            example: '1/2, 1/3, 1/4, 1/6 are all unit fractions.' },
          { term: 'Equivalent fraction',   manip: 'patternBlocks',
            def: 'Two fractions that represent the same amount.',
            example: '2/4 and 1/2 are equivalent (six trapezoids = three rhombi = one hexagon).' },
          { term: 'Perimeter',             manip: 'geoboard',
            def: 'The distance around the outside of a shape.',
            example: 'A 3-by-4 rectangle has perimeter 3 + 4 + 3 + 4 = 14 units.' },
          { term: 'Area',                  manip: 'geoboard',
            def: 'The amount of space inside a flat shape, measured in square units.',
            example: 'A 3-by-4 rectangle has area 3 × 4 = 12 square units.' },
          { term: 'Polygon',               manip: 'geoboard',
            def: 'A closed flat shape made of straight line segments.',
            example: 'Triangles, rectangles, pentagons, and hexagons are all polygons.' },
          { term: 'Symmetry',              manip: 'patternBlocks',
            def: 'A shape has a line of symmetry if you can fold it so both halves match exactly.',
            example: 'A square has 4 lines of symmetry. A hexagon has 6.' },
          { term: 'Array',                 manip: 'cRods',
            def: 'A rectangular arrangement of objects in rows and columns.',
            example: '3 rows of 4 dots = a 3×4 array, used to show 3 × 4 = 12.' },
          { term: 'Number line',           manip: 'cra',
            def: 'A horizontal line with numbers marked at equal intervals.',
            example: 'Addition is jumping forward; subtraction is jumping backward.' },
          { term: 'Compose ten',           manip: 'tenFrame',
            def: 'Filling all 10 cells of a ten frame — a key skill before regrouping.',
            example: 'Showing 8 and then adding 2 more to "make 10" is composing ten.' },
          { term: 'Algorithm',             manip: 'pvDisks',
            def: 'A step-by-step procedure that always gets the right answer.',
            example: 'The "standard algorithm" for addition is the column-by-column carry method.' },
          { term: 'Fluency',               manip: 'numberBonds',
            def: 'Doing something accurately, efficiently, and flexibly.',
            example: 'A fluent first-grader knows 7+3 = 10 instantly, not by counting on fingers.' },
          { term: 'Addend',                manip: 'numberBonds',
            def: 'A number being added to others.',
            example: 'In 4 + 5 = 9, the 4 and 5 are addends; 9 is the sum.' },
          { term: 'Sum',                   manip: 'numberBonds',
            def: 'The result of adding.',
            example: 'In 4 + 5 = 9, the sum is 9.' },
          { term: 'Difference',            manip: 'counters',
            def: 'The result of subtracting.',
            example: 'In 9 − 4 = 5, the difference is 5.' },
          { term: 'Product',               manip: 'cRods',
            def: 'The result of multiplying.',
            example: 'In 3 × 4 = 12, the product is 12.' },
          { term: 'Quotient',              manip: 'cRods',
            def: 'The result of dividing.',
            example: 'In 12 ÷ 4 = 3, the quotient is 3.' },
          { term: 'Estimate',              manip: 'hundredsChart',
            def: 'A reasonable guess at a quantity, usually rounded.',
            example: 'A pile of 47 dots is "about 50" — that\'s an estimate.' },
          { term: 'Round',                 manip: 'hundredsChart',
            def: 'Replace a number with a nearby simpler one ending in 0.',
            example: '47 rounds to 50 (nearest ten); 47 rounds to 0 (nearest hundred).' },
          { term: 'Greater than (>)',      manip: 'cRods',
            def: 'A symbol meaning the first quantity is bigger.',
            example: '7 > 4 reads "7 is greater than 4."' },
          { term: 'Less than (<)',         manip: 'cRods',
            def: 'A symbol meaning the first quantity is smaller.',
            example: '4 < 7 reads "4 is less than 7."' },
          { term: 'Equal sign (=)',        manip: 'numberBonds',
            def: 'A symbol showing both sides have the SAME value.',
            example: '3 + 4 = 7 means 3 + 4 is the same amount as 7.' },
          { term: 'Commutative property',  manip: 'patternBlocks',
            def: 'For addition and multiplication, order doesn\'t change the result.',
            example: '3 + 5 = 5 + 3. And 2 × 4 = 4 × 2.' },
          { term: 'Associative property',  manip: 'numberBonds',
            def: 'How you group three+ numbers does not change the sum (or product).',
            example: '(2 + 3) + 4 = 2 + (3 + 4). Both equal 9.' },
          { term: 'Distributive property', manip: 'patternBlocks',
            def: 'Multiplying a sum is the same as multiplying each part and adding.',
            example: '3 × (4 + 2) = (3 × 4) + (3 × 2) = 12 + 6 = 18.' },
          { term: 'Vertex',                manip: 'geoboard',
            def: 'A "corner" — where two sides of a polygon meet.',
            example: 'A triangle has 3 vertices. A pentagon has 5.' },
          { term: 'Right angle',           manip: 'geoboard',
            def: 'A 90° corner — the kind a square has at every corner.',
            example: 'A 3-4-5 triangle has one right angle.' },
          { term: 'Square unit',           manip: 'geoboard',
            def: 'The area enclosed by a 1×1 square. The basic unit for area.',
            example: 'A 3-by-4 rectangle has area = 12 square units.' },
          { term: 'Numerator',             manip: 'patternBlocks',
            def: 'The TOP number in a fraction — how many parts you have.',
            example: 'In 3/4, the 3 is the numerator.' },
          { term: 'Denominator',           manip: 'patternBlocks',
            def: 'The BOTTOM number in a fraction — how many equal parts the whole is split into.',
            example: 'In 3/4, the 4 is the denominator.' },
          { term: 'Whole number',          manip: 'blocks',
            def: '0, 1, 2, 3, 4, ... — counts of things, no fractions, no negatives.',
            example: '7 is a whole number; 3.5 is not.' },
          { term: 'Digit',                 manip: 'blocks',
            def: 'One of the 10 symbols 0-9 used to write numbers.',
            example: '247 has three digits: 2, 4, and 7.' },
          { term: 'Even number',           manip: 'hundredsChart',
            def: 'A whole number that can be split evenly into two groups.',
            example: '2, 4, 6, 8, 10, ... are even. The ones-digit is 0, 2, 4, 6, or 8.' },
          { term: 'Odd number',            manip: 'hundredsChart',
            def: 'A whole number that cannot be split evenly into two groups.',
            example: '1, 3, 5, 7, 9, 11, ... are odd. The ones-digit is 1, 3, 5, 7, or 9.' },
          { term: 'Equivalent (equal in value)', manip: 'patternBlocks',
            def: 'Two expressions or fractions that represent the same amount.',
            example: '1/2 and 2/4 are equivalent. So are 5+5 and 7+3.' },
          { term: 'Concrete-Representational-Abstract (CRA)', manip: 'cra',
            def: 'The three stages of learning a math concept: a hands-on object, then a picture, then a written symbol.',
            example: 'For 3+4: 3 cubes + 4 cubes, then 3 dots + 4 dots, then "3 + 4 = 7."' },
          { term: 'Cardinality',           manip: 'tenFrame',
            def: 'The understanding that the LAST number counted tells you HOW MANY there are.',
            example: 'When you count 1, 2, 3, 4, 5, you know there are 5. A young child may need to learn this is not just counting — 5 IS the count.' },
          { term: 'One-to-one correspondence', manip: 'tenFrame',
            def: 'Each object gets exactly one number-word as you count.',
            example: 'Pointing to each apple as you say "1, 2, 3" — not skipping any, not double-counting any.' },
          { term: 'Tally mark',            manip: 'hundredsChart',
            def: 'A vertical line representing one count; groups of five marked with a diagonal cross.',
            example: '||||̸ means five.  ||||̸ ||| means eight.' },
          { term: 'Variable',              manip: 'cra',
            def: 'A letter or symbol standing in for an unknown or changing number.',
            example: 'In x + 3 = 7, x is the variable. Here it stands for 4.' },
          { term: 'Equation',              manip: 'numberBonds',
            def: 'A mathematical statement that two expressions are equal.',
            example: '4 + 5 = 9 is an equation. So is x + 2 = 7.' },
          { term: 'Expression',            manip: 'cra',
            def: 'A combination of numbers and operations WITHOUT an equal sign.',
            example: '"5 + 3" is an expression. "5 + 3 = 8" is an equation.' },
          { term: 'Inverse operation',     manip: 'numberBonds',
            def: 'An operation that undoes another.',
            example: 'Addition and subtraction are inverses. Multiplication and division are inverses.' },
          { term: 'Pattern',               manip: 'patternBlocks',
            def: 'A predictable arrangement that repeats or follows a rule.',
            example: 'Red-blue-red-blue is a pattern. So is 2, 4, 6, 8.' },
          { term: 'Area model',            manip: 'geoboard',
            def: 'A rectangle drawn to show multiplication, with side lengths as factors.',
            example: 'A 3-by-5 rectangle has area 15, showing 3 × 5 = 15.' },
          { term: 'Number line',           manip: 'cra',
            def: 'A line with equally spaced marks for each number.',
            example: 'Use it to model addition (move right) and subtraction (move left).' },
          { term: 'Greatest common factor (GCF)', manip: 'cRods',
            def: 'The largest whole number that divides two given numbers evenly.',
            example: 'GCF of 12 and 18 is 6. Both are evenly divisible by 6 (and 1, 2, 3) — but 6 is the largest.' },
          { term: 'Least common multiple (LCM)', manip: 'cRods',
            def: 'The smallest number that is a multiple of two given numbers.',
            example: 'LCM of 4 and 6 is 12. Multiples of 4: 4, 8, 12, ... Multiples of 6: 6, 12, ... First match: 12.' },
          { term: 'Bar model',             manip: 'cra',
            def: 'A rectangular drawing (often segmented) that represents quantities in a problem. A staple of Singapore Math.',
            example: 'For "Amy has 24 stickers, 3 times as many as Ben," draw Ben\'s bar as 1 unit and Amy\'s as 3 units of the same length.' },
          { term: 'Composite number',      manip: 'hundredsChart',
            def: 'A whole number greater than 1 that has more than two factors (so, NOT prime).',
            example: '6 is composite (factors: 1, 2, 3, 6). 7 is not (factors: 1, 7).' },
          { term: 'Square number',         manip: 'geoboard',
            def: 'A whole number that is the product of an integer with itself.',
            example: '1, 4, 9, 16, 25, ... are square numbers. 4 = 2², 9 = 3², etc.' },
          { term: 'Cube number',           manip: 'blocks',
            def: 'A whole number that is the product of an integer with itself, three times.',
            example: '1, 8, 27, 64, ... are cube numbers. 8 = 2³, 27 = 3³.' },
          { term: 'Mean (average)',        manip: 'hundredsChart',
            def: 'The sum of values divided by the count of values.',
            example: 'Mean of 3, 5, 8 is (3 + 5 + 8) / 3 = 16/3 ≈ 5.33.' },
          { term: 'Median',                manip: 'hundredsChart',
            def: 'The middle value when all values are sorted.',
            example: 'Median of 1, 3, 4, 7, 100 is 4. (The 100 doesn\'t pull the median much.)' },
          { term: 'Mode',                  manip: 'counters',
            def: 'The value that appears most often in a data set.',
            example: 'Mode of 3, 5, 5, 6, 7 is 5. (Some sets have no mode, or more than one.)' },
          { term: 'Range',                 manip: 'cRods',
            def: 'The difference between the largest and smallest values.',
            example: 'Range of 4, 9, 11, 20 is 20 − 4 = 16.' },
          { term: 'Probability',           manip: 'counters',
            def: 'The likelihood of an event, between 0 (impossible) and 1 (certain).',
            example: 'P(heads on a fair coin) = 1/2 = 0.5 = 50%.' },
          { term: 'Volume',                manip: 'blocks',
            def: 'The amount of space a 3D object occupies, in cubic units.',
            example: 'A 2×3×4 box has volume 2 × 3 × 4 = 24 cubic units.' },
          { term: 'Surface area',          manip: 'blocks',
            def: 'The total area of all outer faces of a 3D object.',
            example: 'A 1×1×1 cube has surface area = 6 (six faces, each of area 1).' },
          { term: 'Improper fraction',     manip: 'patternBlocks',
            def: 'A fraction where the numerator is at least the denominator.',
            example: '7/4 is improper. It equals 1 3/4 as a mixed number.' },
          { term: 'Mixed number',          manip: 'patternBlocks',
            def: 'A whole number combined with a proper fraction.',
            example: '2 1/2 is a mixed number meaning 2 + 1/2.' },
          { term: 'Whole',                 manip: 'numberBonds',
            def: 'The complete quantity being decomposed; the SUM in a number bond.',
            example: 'In a bond where 4 + 6 = 10, the 10 is the whole.' },
          { term: 'Part',                  manip: 'numberBonds',
            def: 'One of the pieces that combine to make the whole.',
            example: 'In 4 + 6 = 10, the 4 and 6 are the parts.' },
          { term: 'Ones place',            manip: 'blocks',
            def: 'The rightmost digit of a whole number — counts single units.',
            example: 'In 347 the ones digit is 7, worth 7 ones.' },
          { term: 'Tens place',            manip: 'blocks',
            def: 'The second-from-right digit of a whole number — counts groups of ten.',
            example: 'In 347 the tens digit is 4, worth 40 (4 tens).' },
          { term: 'Hundreds place',        manip: 'blocks',
            def: 'The third-from-right digit — counts groups of one hundred.',
            example: 'In 347 the hundreds digit is 3, worth 300.' },
          { term: 'Thousands place',       manip: 'blocks',
            def: 'The fourth-from-right digit — counts groups of one thousand.',
            example: 'In 5,280 the thousands digit is 5, worth 5,000.' },
          { term: 'Bead',                  manip: 'abacus',
            def: 'A small object on an abacus rod; sliding it toward the bar gives it value.',
            example: 'On a soroban, a heaven bead is worth 5; an earth bead is worth 1.' },
          { term: 'Operation',             manip: 'cra',
            def: 'A math action — typically add, subtract, multiply, or divide.',
            example: 'In 4 + 5 = 9, the + is the operation.' },
          { term: 'Manipulative',          manip: 'curriculum',
            def: 'A physical or virtual object students hold, move, and arrange to make a math idea visible.',
            example: 'Base-10 blocks, ten frames, Cuisenaire rods, pattern blocks, and number bonds are all manipulatives.'
          },
          { term: 'Decimal',               manip: 'pvDisks',
            def: 'A number written with a decimal point, with place values continuing past the ones.',
            example: '3.25 is a decimal: 3 ones, 2 tenths, 5 hundredths.'
          },
          { term: 'Percent',               manip: 'pvDisks',
            def: 'A fraction with a denominator of 100, written with the % symbol.',
            example: '25% means 25/100 = 1/4 = 0.25.'
          }
        ];

        return h('div', { className: 'space-y-3 max-w-3xl mx-auto animate-in fade-in duration-200' },
          headerEl,
          h('p', { className: 'text-xs text-cyan-700 italic px-1' },
            __alloT('stem.manipulatives.click_the_manipulative_tag_on_any_entr', 'Click the manipulative tag on any entry to jump to that tool.')
          ),
          h('div', { className: 'space-y-2' },
            glossary.map(function(g, i) {
              return h('div', { key: 'gl' + i, className: 'bg-white rounded-xl border-2 border-cyan-200 p-3' },
                h('div', { className: 'flex items-baseline gap-2 mb-1' },
                  h('p', { className: 'text-base font-bold text-cyan-900' }, g.term),
                  h('button', { onClick: function() { switchMode(g.manip); },
                    className: 'transition-colors ml-auto text-[10px] font-bold bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded hover:bg-cyan-200' },
                    '→ try in ' + g.manip)
                ),
                h('p', { className: 'text-sm text-slate-800 mb-1' }, g.def),
                h('p', { className: 'text-xs text-slate-600 italic' }, 'e.g. ', g.example)
              );
            })
          ),
          h('div', { className: 'bg-cyan-50 rounded-lg p-3 border border-cyan-100 text-xs text-cyan-800' },
            __alloT('stem.manipulatives.why_vocabulary_matters_a_marzano_2004_', '💡 Why vocabulary matters: a Marzano (2004) meta-analysis estimated that direct vocabulary instruction in a content area produces an average percentile gain of ~33 points. '),
            __alloT('stem.manipulatives.in_math_the_words_are_the_conceptual_m', 'In math, the words are the conceptual moves: "regroup," "decompose," "fluently."')
          )
        );
      }

      // ═══════════════════════════════════════════════════════════════
      // ── v3: BRAIN TEASERS MODE ──
      // ═══════════════════════════════════════════════════════════════
      if (manipMode === 'puzzles') {
        var puzzles = [
          { id: 'handshake', title: __alloT('stem.manipulatives.the_handshake_problem', 'The Handshake Problem'),
            difficulty: 'easy', tools: ['hundredsChart'],
            q: 'There are 6 people at a party. Everyone shakes hands with everyone else exactly once. How many handshakes happen?',
            hint: __alloT('stem.manipulatives.person_1_shakes_with_5_others_person_2', 'Person 1 shakes with 5 others. Person 2 with 4 NEW others. Person 3 with 3 new. Add: 5+4+3+2+1 = ?'),
            answer: '15',
            why: 'For n people: n(n−1)/2 handshakes. With 6: 6×5/2 = 15.'
          },
          { id: 'pizza', title: __alloT('stem.manipulatives.the_pizza_slices', 'The Pizza Slices'),
            difficulty: 'easy', tools: ['patternBlocks'],
            q: 'A pizza is cut into 8 equal slices. Anna eats 3 slices, Ben eats 2. How much pizza is LEFT (as a fraction)?',
            hint: __alloT('stem.manipulatives.they_ate_5_of_8_slices_so_5_8_is_gone_', 'They ate 5 of 8 slices. So 5/8 is gone. How much remains?'),
            answer: '3/8',
            why: '8/8 − 3/8 − 2/8 = 3/8. Pattern blocks model the same idea: 3 of 8 equal pieces remain.'
          },
          { id: 'chicken', title: __alloT('stem.manipulatives.chickens_cows', 'Chickens & Cows'),
            difficulty: 'medium', tools: ['counters', 'blocks'],
            q: 'On a farm, chickens (2 legs) and cows (4 legs) total 10 animals with 28 legs. How many cows?',
            hint: __alloT('stem.manipulatives.try_10_chickens_would_have_20_legs_eve', 'Try: 10 chickens would have 20 legs. Every swap of a chicken for a cow adds 2 legs. You need 8 more legs.'),
            answer: '4',
            why: 'If all 10 were chickens: 20 legs. Need 28 − 20 = 8 more legs. Each cow swap adds 2. So 4 cows, 6 chickens.'
          },
          { id: 'staircase', title: __alloT('stem.manipulatives.the_staircase', 'The Staircase'),
            difficulty: 'medium', tools: ['cRods', 'numberBonds'],
            q: 'Make a staircase by stacking Cuisenaire rods: 1, then 1+2, then 1+2+3, etc. What is the total length after the 10th step?',
            hint: __alloT('stem.manipulatives.you_re_summing_1_2_3_10_use_the_trick_', 'You\'re summing 1+2+3+...+10. Use the trick: pair (1+10)+(2+9)+(3+8)+(4+7)+(5+6) = ?'),
            answer: '55',
            why: 'The formula is n(n+1)/2. For n=10: 10×11/2 = 55. Gauss\'s trick at age 8: pair from the ends inward.'
          },
          { id: 'change', title: __alloT('stem.manipulatives.make_25_three_ways', 'Make 25¢ Three Ways'),
            difficulty: 'easy', tools: ['pvDisks'],
            q: 'You have only nickels (5¢) and pennies (1¢). Find at least three different combinations that make exactly 25¢.',
            hint: __alloT('stem.manipulatives.start_with_how_many_nickels_you_could_', 'Start with how many nickels you could use: 5? 4? 3? Each one leaves a different number of pennies.'),
            answer: __alloT('stem.manipulatives.5_nickels_4_nickels_5_pennies_3_nickel', '5 nickels; 4 nickels + 5 pennies; 3 nickels + 10 pennies; 2 nickels + 15 pennies; 1 nickel + 20 pennies; 25 pennies. (Six possible combinations.)'),
            why: '6 valid combinations exist: 5n+0p, 4n+5p, 3n+10p, 2n+15p, 1n+20p, 0n+25p.'
          },
          { id: 'kaprekar', title: __alloT('stem.manipulatives.kaprekar_s_constant', 'Kaprekar\'s Constant'),
            difficulty: 'hard', tools: ['blocks', 'pvDisks'],
            q: 'Pick any 4-digit number with at least two different digits (e.g. 5294). Arrange the digits in descending order, then ascending order, and subtract. Repeat. What happens?',
            hint: __alloT('stem.manipulatives.try_5294_9542_2459_7083_now_7083_8730_', 'Try: 5294 → 9542 − 2459 = 7083. Now 7083 → 8730 − 0378 = 8352. Keep going.'),
            answer: '6174',
            why: 'You always converge to 6174 within 7 steps. This is Kaprekar\'s constant (D.R. Kaprekar, 1949).'
          },
          { id: 'frogs', title: __alloT('stem.manipulatives.the_two_frogs', 'The Two Frogs'),
            difficulty: 'medium', tools: ['hundredsChart', 'cRods'],
            q: 'Frog A jumps 3 squares forward. Frog B jumps 5 squares forward. They both start on square 0 and jump at the same time. After 30 squares, what square will they BOTH have landed on together (other than 0)?',
            hint: __alloT('stem.manipulatives.a_lands_on_multiples_of_3_b_lands_on_m', 'A lands on multiples of 3. B lands on multiples of 5. They meet on common multiples.'),
            answer: '15',
            why: 'LCM(3, 5) = 15. They also meet at 30, 45, 60, etc.'
          },
          { id: 'pigeon', title: __alloT('stem.manipulatives.the_sock_drawer', 'The Sock Drawer'),
            difficulty: 'medium', tools: ['counters'],
            q: 'A drawer has 10 black socks and 10 white socks, all mixed up. In the dark, what is the FEWEST socks you must grab to guarantee a matching pair?',
            hint: __alloT('stem.manipulatives.worst_case_you_grab_one_of_each_color_', 'Worst case: you grab one of each color first. The next one must match SOMETHING.'),
            answer: '3',
            why: 'Pigeonhole principle: with 2 colors and 3 socks, at least two must share a color.'
          },
          { id: 'pascalrow', title: __alloT('stem.manipulatives.pascal_s_row', 'Pascal\'s Row'),
            difficulty: 'hard', tools: ['hundredsChart'],
            q: 'In Pascal\'s triangle, each number is the sum of the two above it. The first row is just "1". The second row is "1 1". The third row is "1 2 1". What is the SUM of all numbers in the 6th row?',
            hint: __alloT('stem.manipulatives.row_sums_row_1_1_row_2_2_row_3_4_row_4', 'Row sums: row 1 = 1, row 2 = 2, row 3 = 4, row 4 = 8... see the pattern?'),
            answer: '32',
            why: 'The sum of row n is 2^(n−1). Row 6: 2^5 = 32.'
          },
          { id: 'broken_calc', title: __alloT('stem.manipulatives.broken_calculator', 'Broken Calculator'),
            difficulty: 'easy', tools: ['blocks', 'numberBonds'],
            q: 'Your calculator can ONLY add 7 or subtract 3. Starting at 0, what is the FEWEST presses to reach 11?',
            hint: __alloT('stem.manipulatives.try_7_first_where_does_that_put_you_ho', 'Try +7 first. Where does that put you? How much more (or less) do you need?'),
            answer: __alloT('stem.manipulatives.3_presses_7_7_3_7_14_11', '3 presses: +7, +7, −3 → 7, 14, 11.'),
            why: 'You need to solve 7a − 3b = 11 with a, b ≥ 0. The smallest non-negative solution is a = 2, b = 1, giving 3 presses. (For target 17 it would take 11 presses — a = 5, b = 6 — which is why we use 11 here for a cleaner puzzle.)'
          },
          { id: 'mobius', title: __alloT('stem.manipulatives.m_bius_half_twist', 'Möbius Half-Twist'),
            difficulty: 'easy', tools: [],
            q: 'Take a strip of paper, give it a half-twist, and tape the ends. How many SIDES does the resulting band have?',
            hint: __alloT('stem.manipulatives.try_it_with_paper_and_a_pen_draw_a_lin', 'Try it with paper and a pen. Draw a line down the middle without lifting your pen.'),
            answer: '1',
            why: 'A Möbius strip has only ONE side. The line you draw eventually covers what looks like both sides.'
          },
          { id: 'monty', title: __alloT('stem.manipulatives.monty_hall_junior_version', 'Monty Hall (junior version)'),
            difficulty: 'hard', tools: [],
            q: 'There are 3 doors. Behind one is a prize. You pick door 1. The host opens door 3 to show no prize. Should you switch to door 2, stay with door 1, or does it not matter?',
            hint: __alloT('stem.manipulatives.think_about_what_was_true_before_the_h', 'Think about what was true BEFORE the host opened door 3.'),
            answer: 'Switch.',
            why: 'Your original 1/3 stays 1/3. The other 2/3 was distributed across doors 2 and 3 — but now ALL of it is concentrated on door 2. Switching doubles your odds (1/3 → 2/3).'
          },
          { id: 'truelies', title: __alloT('stem.manipulatives.two_doors', 'Two Doors'),
            difficulty: 'hard', tools: [],
            q: 'You face two doors. One has a treasure, one has a tiger. Two guards stand by — one ALWAYS lies, one ALWAYS tells the truth. You don\'t know which is which. You may ask ONE question to ONE guard. What do you ask?',
            hint: __alloT('stem.manipulatives.ask_a_question_whose_answer_does_the_s', 'Ask a question whose ANSWER does the same thing whether asked of the truth-teller or the liar.'),
            answer: __alloT('stem.manipulatives.point_to_either_door_and_ask_either_gu', 'Point to either door and ask either guard: "Would the OTHER guard say this door has the treasure?" Then pick the OPPOSITE door from what they say.'),
            why: 'Both guards will give the same (wrong) answer, because either truth-tells-a-lie or lies-about-the-truth. So whatever you hear, do the opposite.'
          },
          { id: 'arithmetic_seq', title: __alloT('stem.manipulatives.hidden_sequence', 'Hidden Sequence'),
            difficulty: 'medium', tools: ['hundredsChart'],
            q: 'What\'s next: 2, 6, 12, 20, 30, ___?',
            hint: __alloT('stem.manipulatives.subtract_neighbors_4_6_8_10_the_differ', 'Subtract neighbors: 4, 6, 8, 10. The differences grow by 2 each time.'),
            answer: '42',
            why: 'Each term is n(n+1) for n = 1, 2, 3... So the 6th term is 6×7 = 42. These are the "pronic" or rectangular numbers.'
          },
          { id: 'wheels', title: __alloT('stem.manipulatives.bike_and_trike', 'Bike and Trike'),
            difficulty: 'easy', tools: ['counters', 'blocks'],
            q: 'In a garage there are bikes (2 wheels) and tricycles (3 wheels). 7 vehicles total, 18 wheels. How many trikes?',
            hint: __alloT('stem.manipulatives.7_bikes_would_have_14_wheels_4_short_e', '7 bikes would have 14 wheels — 4 short. Each swap (bike→trike) adds 1 wheel.'),
            answer: '4',
            why: 'Need 18 − 14 = 4 more wheels. Each trike adds 1 over a bike. So 4 trikes, 3 bikes.'
          },
          { id: 'paint_cube', title: __alloT('stem.manipulatives.the_painted_cube', 'The Painted Cube'),
            difficulty: 'hard', tools: ['blocks'],
            q: 'A 3×3×3 cube of small unit cubes is painted on the outside, then taken apart. How many small cubes have NO paint on any face?',
            hint: __alloT('stem.manipulatives.the_unpainted_ones_are_entirely_interi', 'The unpainted ones are entirely interior. What is the size of the interior?'),
            answer: '1',
            why: 'The interior is a 1×1×1 cube — exactly one little cube. (Try with 4×4×4: 2×2×2 = 8 unpainted.)'
          },
          { id: 'race', title: __alloT('stem.manipulatives.the_race', 'The Race'),
            difficulty: 'easy', tools: [],
            q: 'You\'re running in a race. You pass the person in 2nd place. What place are you now?',
            hint: __alloT('stem.manipulatives.not_first', 'Not first.'),
            answer: '2nd',
            why: 'You took the spot of the person you passed — that\'s 2nd. (1st place is still ahead of you.)'
          },
          { id: 'doubling_penny', title: __alloT('stem.manipulatives.doubling_penny', 'Doubling Penny'),
            difficulty: 'medium', tools: ['hundredsChart'],
            q: 'Would you rather get $1,000,000 right now, or 1 penny today that doubles every day for 30 days?',
            hint: __alloT('stem.manipulatives.day_1_1_day_2_2_day_10_5_12_day_20_5_2', 'Day 1: 1¢. Day 2: 2¢. Day 10: $5.12. Day 20: $5,242. Day 30: ?'),
            answer: __alloT('stem.manipulatives.take_the_doubling_penny_total_after_30', 'Take the doubling penny. Total after 30 days ≈ $10.7 million.'),
            why: 'Day 30 alone is 2^29 cents = $5,368,709. Sum of days 1-30 ≈ $10,737,418. Exponential growth crushes linear thinking.'
          },
          { id: 'birthday', title: __alloT('stem.manipulatives.birthday_coincidence', 'Birthday Coincidence'),
            difficulty: 'hard', tools: [],
            q: 'How many people need to be in a room before there\'s better than a 50% chance two share a birthday (same month + day, ignoring year)?',
            hint: __alloT('stem.manipulatives.it_is_way_fewer_than_you_think', 'It is way fewer than you think.'),
            answer: '23',
            why: 'Counter-intuitive but true. With 23 people there are 23 × 22 / 2 = 253 PAIRS, each with a ~1/365 chance of matching.'
          },
          { id: 'envelopes', title: __alloT('stem.manipulatives.two_envelopes', 'Two Envelopes'),
            difficulty: 'medium', tools: [],
            q: 'Five envelopes lie in front of you. Each contains either $1 or nothing — flipped fairly per envelope. You take all five and dump them out. What is the EXPECTED amount you get?',
            hint: __alloT('stem.manipulatives.each_envelope_has_probability_1_2_of_h', 'Each envelope has probability 1/2 of having $1.'),
            answer: '$2.50',
            why: 'Expected value per envelope = $0.50. Five envelopes: 5 × $0.50 = $2.50.'
          },
          { id: 'four_fours', title: __alloT('stem.manipulatives.four_fours', 'Four Fours'),
            difficulty: 'medium', tools: [],
            q: 'Using exactly four 4s and any of +, −, ×, ÷, and parentheses, make the number 5.',
            hint: __alloT('stem.manipulatives.think_4_4_something_or_4_4_4', 'Think (4 + 4)/something or 4 + 4/4 + ?'),
            answer: __alloT('stem.manipulatives.4_4_4_4_4_2_6_hmm_wait_target_is_5_try', '4 + (4 + 4) / 4 = 4 + 2 = 6. Hmm wait, target is 5. Try: 4 + 4/4 + 0 = 5? Need exactly four 4s. Try: (4 × 4 + 4) / 4 = 20/4 = 5. ✓'),
            why: '(4 × 4 + 4) ÷ 4 = 5. You can build the integers 0-100 with four 4s. This is a classic puzzle from 1881.'
          },
          { id: 'pascal_diag', title: __alloT('stem.manipulatives.pascal_s_diagonal', 'Pascal\'s Diagonal'),
            difficulty: 'hard', tools: ['hundredsChart'],
            q: 'In Pascal\'s triangle, the second diagonal is 1, 2, 3, 4, 5... (counting numbers). The third diagonal is 1, 3, 6, 10, 15... What ARE those numbers?',
            hint: __alloT('stem.manipulatives.try_1_1_2_1_2_3_1_2_3_4_so_each_is_the', 'Try: 1, 1+2, 1+2+3, 1+2+3+4. So each is the SUM of all earlier counting numbers.'),
            answer: __alloT('stem.manipulatives.triangular_numbers', 'Triangular numbers.'),
            why: 'The nth triangular number T_n = n(n+1)/2 = number of objects in a triangle of n rows. T_4 = 10 = bowling pin setup.'
          },
          { id: 'sock_match', title: __alloT('stem.manipulatives.three_color_sock_drawer', 'Three Color Sock Drawer'),
            difficulty: 'medium', tools: ['counters'],
            q: 'A drawer has black, white, and grey socks (lots of each). What is the fewest socks you must grab in the dark to guarantee a matching pair?',
            hint: __alloT('stem.manipulatives.pigeonhole_again_but_with_3_colors_ins', 'Pigeonhole again, but with 3 colors instead of 2.'),
            answer: '4',
            why: 'Worst case: you grab one of each (3). The 4th sock must match one of them.'
          },
          { id: 'tens_decomposition', title: __alloT('stem.manipulatives.sum_to_10', 'Sum to 10'),
            difficulty: 'easy', tools: ['numberBonds'],
            q: 'How many different pairs of WHOLE NUMBERS (order doesn\'t matter, both positive) add to 10?',
            hint: __alloT('stem.manipulatives.1_9_2_8_3_7_4_6_5_5_then_6_4_is_the_sa', '1+9, 2+8, 3+7, 4+6, 5+5. Then 6+4 is the same as 4+6.'),
            answer: '5',
            why: 'Unordered, positive: (1,9), (2,8), (3,7), (4,6), (5,5). If you include 0, that\'s 6; if order matters, 11.'
          },
          { id: 'ant_clock', title: __alloT('stem.manipulatives.the_clock_ant', 'The Clock Ant'),
            difficulty: 'easy', tools: [],
            q: 'A clock\'s minute hand moves 360° in 60 minutes. How many degrees does it move in 15 minutes?',
            hint: __alloT('stem.manipulatives.15_minutes_is_1_4_of_an_hour', '15 minutes is 1/4 of an hour.'),
            answer: '90°',
            why: '15/60 = 1/4 of a full rotation. 1/4 × 360° = 90°.'
          },
          { id: 'twelve_eggs', title: __alloT('stem.manipulatives.the_twelve_eggs', 'The Twelve Eggs'),
            difficulty: 'medium', tools: ['blocks'],
            q: 'You have 12 eggs. One is heavier than the rest. Using a balance scale, what is the FEWEST number of weighings needed to identify it?',
            hint: __alloT('stem.manipulatives.split_into_groups_of_4_4_and_4', 'Split into groups of 4, 4, and 4.'),
            answer: __alloT('stem.manipulatives.3_weighings', '3 weighings'),
            why: 'Weigh 4 vs 4. If equal, heavy egg is in the third group. Then weigh 2 vs 2 within the heavy group. Then 1 vs 1.'
          },
          { id: 'pizza_cut', title: __alloT('stem.manipulatives.pizza_cuts', 'Pizza Cuts'),
            difficulty: 'medium', tools: ['patternBlocks'],
            q: 'With 4 straight cuts, what\'s the MOST pieces of pizza you can get?',
            hint: __alloT('stem.manipulatives.each_new_cut_should_cross_every_previo', 'Each new cut should cross every previous cut.'),
            answer: '11',
            why: 'Formula: (n² + n + 2) / 2. For n=4: (16+4+2)/2 = 11. The pattern is 2, 4, 7, 11, 16, ...'
          },
          { id: 'gold_chain', title: __alloT('stem.manipulatives.gold_chain', 'Gold Chain'),
            difficulty: 'hard', tools: [],
            q: 'A 7-link gold chain. You owe someone 1 link per day for 7 days. They want full payment each day, but you\'ll get the chain back at the end. What is the MINIMUM number of links you need to CUT?',
            hint: __alloT('stem.manipulatives.think_about_what_you_can_give_and_take', 'Think about what you can give and TAKE BACK each day.'),
            answer: '1',
            why: 'Cut the 3rd link. You now have a 1, a 2, and a 4. Day 1: give the 1. Day 2: give the 2, take back the 1. Day 3: give the 1. Day 4: give the 4, take back the 1 and 2. Continue similarly.'
          },
          { id: 'lcm_birthdays', title: __alloT('stem.manipulatives.when_do_we_meet', 'When do we meet?'),
            difficulty: 'medium', tools: ['hundredsChart'],
            q: 'Alex visits grandma every 4 days. Bo visits every 6 days. They both visit today. When is the NEXT day they both visit?',
            hint: __alloT('stem.manipulatives.find_a_number_that_is_a_multiple_of_bo', 'Find a number that is a multiple of BOTH 4 and 6.'),
            answer: __alloT('stem.manipulatives.in_12_days', 'In 12 days'),
            why: 'LCM(4, 6) = 12. Multiples of 4: 4, 8, 12, 16, 20, 24. Multiples of 6: 6, 12, 18, 24. The smallest shared is 12.'
          },
          { id: 'square_dance', title: __alloT('stem.manipulatives.square_dance', 'Square Dance'),
            difficulty: 'medium', tools: ['geoboard', 'patternBlocks'],
            q: 'Build a square. Cut it in half by joining opposite vertices (a diagonal). What two shapes do you get?',
            hint: __alloT('stem.manipulatives.they_are_identical_to_each_other', 'They are identical to each other.'),
            answer: __alloT('stem.manipulatives.two_right_triangles', 'Two right triangles.'),
            why: 'Each triangle has one 90° angle (a corner of the square) and two 45° angles. Together they reassemble into the square.'
          },
          { id: 'triangle_inequality', title: __alloT('stem.manipulatives.stick_triangles', 'Stick Triangles'),
            difficulty: 'medium', tools: ['cRods'],
            q: 'Can you make a triangle with rods of length 2, 3, and 6?',
            hint: __alloT('stem.manipulatives.try_to_lay_them_down_does_the_long_one', 'Try to lay them down. Does the long one reach across?'),
            answer: 'No',
            why: 'The sum of any two sides must be GREATER than the third. 2 + 3 = 5, but the third side is 6. The two short rods can\'t even meet.'
          },
          { id: 'square_root', title: __alloT('stem.manipulatives.square_roots_without_a_calculator', 'Square Roots Without a Calculator'),
            difficulty: 'hard', tools: ['blocks', 'geoboard'],
            q: 'What is √49?',
            hint: __alloT('stem.manipulatives.what_integer_multiplied_by_itself_equa', 'What integer, multiplied by itself, equals 49?'),
            answer: '7',
            why: '7 × 7 = 49. A 7-by-7 square has area 49. Square root = the side length of a square with that area.'
          },
          { id: 'frac_dec', title: __alloT('stem.manipulatives.fraction_decimal', 'Fraction → Decimal'),
            difficulty: 'medium', tools: ['pvDisks'],
            q: 'Express 3/4 as a decimal.',
            hint: __alloT('stem.manipulatives.3_4_100', '3/4 = ?/100.'),
            answer: '0.75',
            why: '3/4 = 75/100 = 0.75. Think: 1 dollar split four ways is 25 cents each. Three shares = 75 cents = 0.75.'
          },
          { id: 'sum_evens', title: __alloT('stem.manipulatives.sum_of_first_10_evens', 'Sum of First 10 Evens'),
            difficulty: 'easy', tools: ['hundredsChart'],
            q: 'What is 2 + 4 + 6 + 8 + ... + 20?',
            hint: __alloT('stem.manipulatives.pair_them_2_20_4_18_6_16_8_14_10_12', 'Pair them: (2 + 20), (4 + 18), (6 + 16), (8 + 14), (10 + 12).'),
            answer: '110',
            why: '5 pairs of 22 = 110. Or: n(n+1) for n = 10: 10 × 11 = 110.'
          },
          { id: 'odd_sums', title: __alloT('stem.manipulatives.sum_of_first_n_odds', 'Sum of First n Odds'),
            difficulty: 'hard', tools: ['hundredsChart'],
            q: '1 + 3 + 5 + 7 + ... + 19 = ?',
            hint: __alloT('stem.manipulatives.try_shorter_1_3_4_2_1_3_5_9_3_1_3_5_7_', 'Try shorter: 1 + 3 = 4 (2²). 1 + 3 + 5 = 9 (3²). 1 + 3 + 5 + 7 = 16 (4²). See the pattern?'),
            answer: '100',
            why: 'The sum of the first n odd numbers is n². There are 10 odd numbers from 1 to 19, so the sum is 10² = 100.'
          }
        ];

        var pIdx = _m.puzzleIdx != null ? _m.puzzleIdx : 0;
        var pCurrent = puzzles[pIdx];
        var pShowHint = _m.puzzleShowHint || false;
        var pShowAns = _m.puzzleShowAns || false;

        return h('div', { className: 'space-y-3 max-w-3xl mx-auto animate-in fade-in duration-200' },
          headerEl,
          h('div', { className: 'bg-white rounded-xl border-2 border-pink-200 p-4' },
            h('div', { className: 'flex items-baseline justify-between mb-2' },
              h('div', null,
                h('p', { className: 'text-xs font-bold text-pink-700 uppercase tracking-wider' },
                  'Brain Teaser ' + (pIdx + 1) + ' of ' + puzzles.length
                ),
                h('p', { className: 'text-lg font-black text-pink-900' }, pCurrent.title)
              ),
              h('span', { className: 'inline-block px-2 py-0.5 text-[10px] font-bold rounded ' +
                (pCurrent.difficulty === 'easy' ? 'bg-emerald-100 text-emerald-800' :
                 pCurrent.difficulty === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800')
              }, pCurrent.difficulty)
            ),
            h('p', { className: 'text-sm text-slate-800 mb-3' }, pCurrent.q),
            pCurrent.tools && pCurrent.tools.length > 0 && h('p', { className: 'text-xs text-pink-700 italic mb-2' },
              __alloT('stem.manipulatives.try_with', 'Try with: '),
              pCurrent.tools.map(function(t, i) {
                return h('button', { key: t,
                  onClick: function() { switchMode(t); },
                  className: 'transition-colors inline-block px-2 py-0.5 mx-0.5 bg-pink-100 text-pink-800 rounded hover:bg-pink-200 text-[11px] font-bold'
                }, t);
              })
            ),
            // Hint / answer
            h('div', { className: 'flex gap-2 flex-wrap' },
              h('button', { onClick: function() { upd({ puzzleShowHint: !pShowHint }); },
                className: 'px-3 py-1 rounded text-xs font-bold ' + (pShowHint ? 'bg-pink-200 text-pink-900' : 'transition-colors bg-pink-50 text-pink-700 border border-pink-300 hover:bg-pink-100')
              }, pShowHint ? '🙈 Hide hint' : '💡 Show hint'),
              h('button', { onClick: function() { upd({ puzzleShowAns: !pShowAns }); },
                className: 'px-3 py-1 rounded text-xs font-bold ' + (pShowAns ? 'bg-emerald-200 text-emerald-900' : 'transition-colors bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100')
              }, pShowAns ? '🙈 Hide answer' : '✓ Reveal answer')
            ),
            pShowHint && h('div', { className: 'mt-3 p-3 bg-pink-50 rounded border border-pink-200 text-sm text-pink-900' },
              h('p', { className: 'font-bold text-xs mb-1' }, 'HINT:'), pCurrent.hint
            ),
            pShowAns && h('div', { className: 'mt-3 p-3 bg-emerald-50 rounded border border-emerald-200 text-sm text-emerald-900' },
              h('p', { className: 'font-bold text-xs mb-1' }, 'ANSWER:'), pCurrent.answer,
              h('p', { className: 'mt-2 text-xs italic text-emerald-700' }, pCurrent.why)
            )
          ),
          // Nav
          h('div', { className: 'flex gap-2 justify-between' },
            h('button', {
              onClick: function() { upd({ puzzleIdx: Math.max(0, pIdx - 1), puzzleShowHint: false, puzzleShowAns: false }); },
              disabled: pIdx <= 0,
              className: 'px-4 py-2 rounded text-xs font-bold ' + (pIdx <= 0 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'transition-colors bg-slate-200 text-slate-700 hover:bg-slate-300')
            }, __alloT('stem.manipulatives.previous', '← Previous')),
            h('button', {
              onClick: function() {
                var r;
                do { r = Math.floor(Math.random() * puzzles.length); } while (r === pIdx && puzzles.length > 1);
                upd({ puzzleIdx: r, puzzleShowHint: false, puzzleShowAns: false });
              },
              className: 'transition-colors px-4 py-2 rounded text-xs font-bold bg-pink-600 text-white hover:bg-pink-700' }, __alloT('stem.manipulatives.random_2', '🎲 Random')),
            h('button', {
              onClick: function() { upd({ puzzleIdx: Math.min(puzzles.length - 1, pIdx + 1), puzzleShowHint: false, puzzleShowAns: false }); },
              disabled: pIdx >= puzzles.length - 1,
              className: 'px-4 py-2 rounded text-xs font-bold ' + (pIdx >= puzzles.length - 1 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'transition-colors bg-slate-200 text-slate-700 hover:bg-slate-300')
            }, __alloT('stem.manipulatives.next_10', 'Next →'))
          ),
          // Index
          h('div', { className: 'bg-white rounded-xl border-2 border-pink-200 p-3' },
            h('p', { className: 'text-xs font-bold text-pink-700 mb-2' }, __alloT('stem.manipulatives.jump_to_puzzle', 'Jump to puzzle:')),
            h('div', { className: 'flex flex-wrap gap-1' },
              puzzles.map(function(p, i) {
                return h('button', { key: 'pn' + i,
                  onClick: function() { upd({ puzzleIdx: i, puzzleShowHint: false, puzzleShowAns: false }); },
                  title: p.title,
                  className: 'px-2 py-1 rounded text-[11px] font-bold transition-all ' +
                    (i === pIdx ? 'bg-pink-700 text-white' : 'bg-white border border-pink-300 text-pink-700 hover:bg-pink-100')
                }, p.title);
              })
            )
          ),
          h('div', { className: 'bg-pink-50 rounded-lg p-3 border border-pink-100 text-xs text-pink-800' },
            __alloT('stem.manipulatives.these_puzzles_are_good_for', '💡 These puzzles are good for '), h('b', null, __alloT('stem.manipulatives.class_discussion', 'class discussion')),
            __alloT('stem.manipulatives.more_than_silent_practice_the_richest_', ' more than silent practice. The richest pedagogy: state the problem, give students 5 minutes with a manipulative, then have them present their reasoning at the board.')
          )
        );
      }

      // ═══════════════════════════════════════════════════════════════
      // ── v3: HISTORY MODE ──
      // ═══════════════════════════════════════════════════════════════
      if (manipMode === 'history') {
        var timeline = [
          { year: '~35,000 BCE', title: __alloT('stem.manipulatives.lebombo_bone_eswatini', 'Lebombo Bone (Eswatini)'),
            desc: __alloT('stem.manipulatives.a_baboon_fibula_with_29_notches_likely', 'A baboon fibula with 29 notches — likely the oldest known mathematical artifact. Possibly a lunar phase tally.'),
            tools: [] },
          { year: '~18,000 BCE', title: __alloT('stem.manipulatives.ishango_bone_dr_congo', 'Ishango Bone (DR Congo)'),
            desc: __alloT('stem.manipulatives.a_baboon_fibula_with_three_columns_of_', 'A baboon fibula with three columns of grouped notches. Some columns are pairs of doubles; one column contains only prime numbers.'),
            tools: [] },
          { year: '~4,000 BCE', title: __alloT('stem.manipulatives.sumerian_clay_tokens', 'Sumerian Clay Tokens'),
            desc: __alloT('stem.manipulatives.pebble_sized_clay_tokens_with_shapes_r', 'Pebble-sized clay tokens with shapes representing quantities of grain, livestock, etc. The probable ancestor of writing AND of base-10 blocks.'),
            tools: ['blocks'] },
          { year: '~2,700 BCE', title: __alloT('stem.manipulatives.egyptian_hieroglyphs', 'Egyptian Hieroglyphs'),
            desc: __alloT('stem.manipulatives.egyptians_used_distinct_symbols_for_1_', 'Egyptians used distinct symbols for 1, 10, 100, 1000 — additive, base-10. (A "tally" for 1, a heel-bone for 10, a coil for 100, a lotus for 1000.)'),
            tools: ['blocks'] },
          { year: '~500 BCE', title: __alloT('stem.manipulatives.salamis_tablet_greece', 'Salamis Tablet (Greece)'),
            desc: __alloT('stem.manipulatives.the_oldest_surviving_counting_board_a_', 'The oldest surviving counting board: a marble slab with parallel lines, where pebbles ("calculi" in Latin — the origin of "calculate") were moved to compute sums.'),
            tools: ['abacus'] },
          { year: '~200 BCE', title: __alloT('stem.manipulatives.chinese_suanpan', 'Chinese Suanpan'),
            desc: __alloT('stem.manipulatives.the_chinese_abacus_2_heaven_beads_5_ea', 'The Chinese abacus: 2 heaven beads + 5 earth beads per rod. Allows base-16 (for traditional Chinese weight) as well as base-10. Still used in shops today.'),
            tools: ['abacus'] },
          { year: '~600 CE', title: __alloT('stem.manipulatives.indian_numerals', 'Indian Numerals'),
            desc: __alloT('stem.manipulatives.brahmi_script_gives_us_0_9_and_place_v', 'Brahmi script gives us 0–9 and place-value notation. The single most consequential invention in numeracy.'),
            tools: ['blocks', 'pvDisks'] },
          { year: '~825 CE', title: __alloT('stem.manipulatives.al_khw_rizm_baghdad', 'Al-Khwārizmī (Baghdad)'),
            desc: __alloT('stem.manipulatives.persian_mathematician_writes_kit_b_al_', 'Persian mathematician writes "Kitāb al-mukhtaṣar fī ḥisāb al-jabr wal-muqābala." The word "algorithm" comes from his name; "algebra" from the title.'),
            tools: ['cra'] },
          { year: '~1200 CE', title: __alloT('stem.manipulatives.fibonacci_s_liber_abaci', 'Fibonacci\'s Liber Abaci'),
            desc: __alloT('stem.manipulatives.leonardo_of_pisa_s_book_introduces_the', 'Leonardo of Pisa\'s book introduces the Hindu-Arabic numerals to medieval Europe. Includes the famous "rabbit population" problem.'),
            tools: ['hundredsChart'] },
          { year: '~1300 CE', title: __alloT('stem.manipulatives.russian_schoty', 'Russian Schoty'),
            desc: __alloT('stem.manipulatives.10_beads_per_rod_no_divider_used_in_ru', '10 beads per rod, no divider. Used in Russian shops until cash registers replaced them in the 1990s.'),
            tools: ['abacus'] },
          { year: '1614', title: __alloT('stem.manipulatives.napier_s_logarithms', 'Napier\'s Logarithms'),
            desc: __alloT('stem.manipulatives.john_napier_publishes_the_first_table_', 'John Napier publishes the first table of logarithms. Lets multiplication become addition.'),
            tools: ['slideRule'] },
          { year: '1622', title: __alloT('stem.manipulatives.oughtred_s_slide_rule', 'Oughtred\'s Slide Rule'),
            desc: __alloT('stem.manipulatives.william_oughtred_slides_two_log_scales', 'William Oughtred slides two log scales past each other. The slide rule becomes the calculator for the next 350 years.'),
            tools: ['slideRule'] },
          { year: '1798', title: __alloT('stem.manipulatives.carl_gauss_age_8', 'Carl Gauss, age 8'),
            desc: __alloT('stem.manipulatives.famously_sums_1_through_100_in_seconds', 'Famously sums 1 through 100 in seconds by pairing 1+100, 2+99, ..., 50+51 — fifty pairs of 101 = 5050. The story may be apocryphal but the method is real.'),
            tools: ['hundredsChart'] },
          { year: '1857', title: __alloT('stem.manipulatives.maria_montessori_is_born', 'Maria Montessori is born'),
            desc: __alloT('stem.manipulatives.the_italian_physician_will_go_on_to_de', 'The Italian physician will go on to design the "Golden Beads" base-10 system, which is the direct ancestor of every modern set of base-10 blocks.'),
            tools: ['blocks'] },
          { year: '1888', title: __alloT('stem.manipulatives.hilaire_belloc_pattern_blocks', 'Hilaire Belloc & Pattern Blocks'),
            desc: __alloT('stem.manipulatives.european_primary_classrooms_begin_usin', 'European primary classrooms begin using wooden geometric tiles for tessellation work. Pattern blocks as standardized today come later (1960s, ESS curriculum).'),
            tools: ['patternBlocks'] },
          { year: '1952', title: __alloT('stem.manipulatives.cuisenaire_rods', 'Cuisenaire Rods'),
            desc: __alloT('stem.manipulatives.belgian_teacher_georges_cuisenaire_sho', 'Belgian teacher Georges Cuisenaire shows his colored rods to Caleb Gattegno. Gattegno popularizes them worldwide.'),
            tools: ['cRods'] },
          { year: '1960', title: __alloT('stem.manipulatives.geoboard_gattegno', 'Geoboard (Gattegno)'),
            desc: __alloT('stem.manipulatives.gattegno_also_popularizes_the_geoboard', 'Gattegno also popularizes the geoboard: a peg grid for stretching rubber bands into polygons. Brings discrete geometry into reach for young children.'),
            tools: ['geoboard'] },
          { year: '1966', title: __alloT('stem.manipulatives.jerome_bruner_cra_theory', 'Jerome Bruner — CRA Theory'),
            desc: __alloT('stem.manipulatives.toward_a_theory_of_instruction_bruner_', '"Toward a Theory of Instruction." Bruner argues for enactive → iconic → symbolic progression — what U.S. classrooms call Concrete-Representational-Abstract.'),
            tools: ['cra'] },
          { year: '1972', title: __alloT('stem.manipulatives.hp_35_calculator', 'HP-35 calculator'),
            desc: __alloT('stem.manipulatives.hewlett_packard_releases_the_first_han', 'Hewlett-Packard releases the first handheld scientific calculator. Slide rule sales collapse within 5 years.'),
            tools: ['slideRule'] },
          { year: '1980s', title: __alloT('stem.manipulatives.singapore_math', 'Singapore Math'),
            desc: __alloT('stem.manipulatives.singapore_s_ministry_of_education_adop', 'Singapore\'s Ministry of Education adopts a curriculum centered on the "Number Bond" model and CRA progression. Singapore tops international rankings within two decades.'),
            tools: ['numberBonds', 'cra'] },
          { year: '2010', title: __alloT('stem.manipulatives.common_core_state_standards', 'Common Core State Standards'),
            desc: __alloT('stem.manipulatives.u_s_ccss_m_adopted_in_most_states_expl', 'U.S. CCSS-M adopted in most states. Explicitly names "concrete models" and "manipulatives" for K-5 — pulling the methods of Montessori, Cuisenaire, and Singapore into the national standards.'),
            tools: ['standards'] },
          { year: '2020s', title: __alloT('stem.manipulatives.virtual_manipulatives', 'Virtual Manipulatives'),
            desc: __alloT('stem.manipulatives.web_based_tools_like_this_one_let_stud', 'Web-based tools like this one let students interact with classical manipulatives anywhere. The pedagogy is the same; only the medium has changed.'),
            tools: ['blocks', 'tenFrame', 'cRods', 'patternBlocks'] },
          { year: '~3,500 BCE', title: __alloT('stem.manipulatives.sumerian_sexagesimal', 'Sumerian Sexagesimal'),
            desc: __alloT('stem.manipulatives.the_sumerians_use_a_base_60_system_sex', 'The Sumerians use a base-60 system (sexagesimal) — still visible in our 60-second minute and 360-degree circle. Base-60 has many divisors, which is mathematically elegant.'),
            tools: ['blocks'] },
          { year: '~250 BCE', title: __alloT('stem.manipulatives.archimedes', 'Archimedes'),
            desc: __alloT('stem.manipulatives.approximates_by_inscribing_polygons_in', 'Approximates π by inscribing polygons inside a circle and circumscribing polygons around it. Squeezes π between 3 10/71 and 3 1/7.'),
            tools: ['geoboard'] },
          { year: '~830 CE', title: __alloT('stem.manipulatives.algebra', 'Algebra'),
            desc: __alloT('stem.manipulatives.al_khw_rizm_s_algebra_is_geometric_he_', 'Al-Khwārizmī\'s algebra is geometric — he completes squares LITERALLY by drawing rectangles. Manipulative-based algebra is older than symbolic algebra.'),
            tools: ['geoboard'] },
          { year: '1202', title: __alloT('stem.manipulatives.liber_abaci_in_detail', 'Liber Abaci (in detail)'),
            desc: __alloT('stem.manipulatives.fibonacci_s_book_includes_a_problem_ab', 'Fibonacci\'s book includes a problem about rabbit reproduction that produces the Fibonacci sequence: 1, 1, 2, 3, 5, 8, 13... These same numbers appear in nature and in pattern-block tilings.'),
            tools: ['patternBlocks'] },
          { year: '1631', title: __alloT('stem.manipulatives.oughtred_publishes_clavis_mathematicae', 'Oughtred publishes Clavis Mathematicae'),
            desc: __alloT('stem.manipulatives.in_addition_to_inventing_the_slide_rul', 'In addition to inventing the slide rule, Oughtred introduces the × symbol for multiplication. (Leibniz hated it: he thought × looked too much like the variable x.)'),
            tools: ['slideRule'] },
          { year: '1707', title: __alloT('stem.manipulatives.euler_is_born', 'Euler is born'),
            desc: __alloT('stem.manipulatives.leonhard_euler_will_give_us_e_i_for_1_', 'Leonhard Euler will give us e, i for √(−1), the function-notation f(x), and the Euler formula. Geoboards demonstrate his "V − E + F = 2" formula for polyhedra.'),
            tools: ['geoboard'] },
          { year: '1924', title: __alloT('stem.manipulatives.friedrich_fr_bel_s_gifts', 'Friedrich Fröbel\'s Gifts'),
            desc: __alloT('stem.manipulatives.building_on_fr_bel_s_19th_century_kind', 'Building on Fröbel\'s 19th-century kindergarten "gifts" (wooden manipulatives), Edith Somervell publishes A Rhythmic Approach to Mathematics — an early manipulative-rich curriculum.'),
            tools: ['blocks', 'patternBlocks'] },
          { year: '1937', title: __alloT('stem.manipulatives.cuisenaire_s_rods_discovered', 'Cuisenaire\'s rods discovered'),
            desc: __alloT('stem.manipulatives.georges_cuisenaire_a_belgian_school_pr', 'Georges Cuisenaire, a Belgian school principal, has been quietly using colored rods for 4 years. A visit by an inspector leads to publication; uptake remains slow until the 1950s.'),
            tools: ['cRods'] },
          { year: '1958', title: __alloT('stem.manipulatives.caleb_gattegno_s_tour', 'Caleb Gattegno\'s tour'),
            desc: __alloT('stem.manipulatives.gattegno_tours_uk_schools_demonstratin', 'Gattegno tours UK schools demonstrating Cuisenaire rods. Adoption explodes. By the 1960s the rods are in classrooms across Europe and the Commonwealth.'),
            tools: ['cRods'] },
          { year: '1973', title: __alloT('stem.manipulatives.nctm_standards', 'NCTM Standards'),
            desc: __alloT('stem.manipulatives.the_national_council_of_teachers_of_ma', 'The National Council of Teachers of Mathematics issues guidance recommending manipulatives at all grades. The shift from procedural to conceptual emphasis begins in earnest in U.S. classrooms.'),
            tools: ['cra'] },
          { year: '1989', title: __alloT('stem.manipulatives.nctm_curriculum_evaluation_standards', 'NCTM Curriculum & Evaluation Standards'),
            desc: __alloT('stem.manipulatives.the_seminal_nctm_document_that_anchore', 'The seminal NCTM document that anchored "reform math." Names problem-solving, reasoning, communication, and connections as core. Manipulatives become standard equipment.'),
            tools: ['standards'] },
          { year: '2000', title: __alloT('stem.manipulatives.nctm_principles_and_standards', 'NCTM Principles and Standards'),
            desc: __alloT('stem.manipulatives.updated_standards_add_a_representation', 'Updated standards add a Representation strand: students should be able to translate among physical, pictorial, symbolic, and contextual representations — i.e., the CRA loop.'),
            tools: ['cra'] },
          { year: '2010', title: __alloT('stem.manipulatives.common_core_in_detail', 'Common Core in detail'),
            desc: __alloT('stem.manipulatives.ccss_m_explicitly_names_number_lines_t', 'CCSS-M explicitly names number lines, ten frames, base-10 blocks, and area models. The mathematical practices (MP1-MP8) frame HOW students should engage with manipulatives.'),
            tools: ['standards'] }
        ];

        return h('div', { className: 'space-y-3 max-w-3xl mx-auto animate-in fade-in duration-200' },
          headerEl,
          h('div', { className: 'space-y-3' },
            timeline.map(function(t, i) {
              return h('div', { key: 'ht' + i, className: 'bg-white rounded-xl border-2 border-lime-200 p-3' },
                h('div', { className: 'flex items-baseline justify-between mb-1' },
                  h('p', { className: 'font-mono text-xs font-bold text-lime-700' }, t.year),
                  t.tools.length > 0 && h('div', { className: 'flex gap-1' },
                    t.tools.map(function(tk) {
                      return h('button', { key: tk, onClick: function() { switchMode(tk); },
                        className: 'transition-colors px-2 py-0.5 rounded text-[10px] font-bold bg-lime-100 text-lime-800 hover:bg-lime-200'
                      }, '→ ' + tk);
                    })
                  )
                ),
                h('p', { className: 'text-sm font-bold text-slate-800' }, t.title),
                h('p', { className: 'text-xs text-slate-700 mt-1' }, t.desc)
              );
            })
          ),
          h('div', { className: 'bg-lime-50 rounded-lg p-3 border border-lime-100 text-xs text-lime-800' },
            __alloT('stem.manipulatives.mathematics_is_older_than_writing_ever', '💡 Mathematics is older than writing. Every manipulative in this tool is a descendent of something ancient. '),
            __alloT('stem.manipulatives.showing_students_the_lineage_this_is_t', 'Showing students the lineage — "this is the same idea your great-great-great-grandparents used" — re-frames math as a human invention, not a mystery to memorize.')
          )
        );
      }

      // ═══════════════════════════════════════════════════════════════
      // ── v3: CURRICULUM MAP MODE ──
      // ═══════════════════════════════════════════════════════════════
      if (manipMode === 'curriculum') {
        var grades = ['K', '1', '2', '3', '4', '5', '6', '7'];
        // Per-grade manipulative usage matrix
        var matrix = {
          tenFrame:      { K: 'core', '1': 'core', '2': 'review', '3': '', '4': '', '5': '', '6': '', '7': '' },
          numberBonds:   { K: 'core', '1': 'core', '2': 'review', '3': '', '4': '', '5': '', '6': '', '7': '' },
          counters:      { K: 'intro', '1': 'core', '2': 'core', '3': '', '4': '', '5': '', '6': 'core', '7': 'core' },
          blocks:        { K: 'intro', '1': 'core', '2': 'core', '3': 'review', '4': 'review', '5': '', '6': '', '7': '' },
          hundredsChart: { K: '', '1': 'core', '2': 'core', '3': 'core', '4': 'review', '5': 'review', '6': '', '7': '' },
          pvDisks:       { K: '', '1': '', '2': 'intro', '3': 'core', '4': 'core', '5': 'review', '6': '', '7': '' },
          patternBlocks: { K: 'intro', '1': 'intro', '2': 'core', '3': 'core', '4': 'review', '5': 'review', '6': '', '7': '' },
          cRods:         { K: 'intro', '1': 'core', '2': 'core', '3': 'review', '4': 'review', '5': 'review', '6': '', '7': '' },
          geoboard:      { K: '', '1': '', '2': 'intro', '3': 'core', '4': 'core', '5': 'core', '6': 'review', '7': 'review' },
          abacus:        { K: '', '1': 'intro', '2': 'core', '3': 'core', '4': 'review', '5': 'review', '6': '', '7': '' },
          slideRule:     { K: '', '1': '', '2': '', '3': '', '4': '', '5': 'enrichment', '6': 'enrichment', '7': 'core' },
          fracBars:      { K: '', '1': '', '2': '', '3': 'intro', '4': 'core', '5': 'core', '6': 'review', '7': '' },
          algebraTiles:  { K: '', '1': '', '2': '', '3': '', '4': '', '5': '', '6': 'intro', '7': 'core' }
        };
        var manipOrder = ['tenFrame', 'numberBonds', 'counters', 'blocks', 'hundredsChart', 'pvDisks', 'patternBlocks', 'cRods', 'geoboard', 'abacus', 'fracBars', 'algebraTiles', 'slideRule'];
        var cellClass = function(state) {
          if (state === 'core') return 'bg-emerald-500 text-white';
          if (state === 'intro') return 'bg-emerald-200 text-emerald-900';
          if (state === 'review') return 'bg-amber-200 text-amber-900';
          if (state === 'enrichment') return 'bg-purple-200 text-purple-900';
          return 'bg-slate-100 text-slate-300';
        };
        var labelOf = {
          tenFrame: '🔟 Ten Frames', numberBonds: '🔗 Number Bonds',
          counters: '🔴 Counters', blocks: '🧱 Blocks',
          hundredsChart: '💯 Hundreds Chart', pvDisks: '💿 PV Disks',
          patternBlocks: '⬢ Pattern Blocks', cRods: '🟧 Cuisenaire',
          geoboard: '⬜ Geoboard', abacus: '🧮 Abacus', slideRule: '📏 Slide Rule',
          fracBars: '▭ Fraction Bars', algebraTiles: '🔲 Algebra Tiles'
        };

        return h('div', { className: 'space-y-3 max-w-4xl mx-auto animate-in fade-in duration-200' },
          headerEl,
          // Legend
          h('div', { className: 'bg-white rounded-xl border-2 border-green-200 p-3' },
            h('p', { className: 'text-xs font-bold text-green-700 mb-2' }, 'Legend:'),
            h('div', { className: 'flex gap-2 flex-wrap text-[11px]' },
              h('span', { className: 'px-2 py-0.5 rounded font-bold bg-emerald-200 text-emerald-900' }, 'intro'),
              h('span', { className: 'px-2 py-0.5 rounded font-bold bg-emerald-500 text-white' }, 'core'),
              h('span', { className: 'px-2 py-0.5 rounded font-bold bg-amber-200 text-amber-900' }, 'review'),
              h('span', { className: 'px-2 py-0.5 rounded font-bold bg-purple-200 text-purple-900' }, 'enrichment')
            )
          ),
          // Matrix
          h('div', { className: 'bg-white rounded-xl border-2 border-green-200 p-3 overflow-x-auto' },
            h('table', { className: 'w-full text-xs', style: { borderCollapse: 'separate', borderSpacing: 2 } },
              h('thead', null,
                h('tr', null,
                  h('th', { className: 'text-left text-green-800 font-bold py-1' }, __alloT('stem.manipulatives.manipulative', 'Manipulative')),
                  grades.map(function(g) {
                    return h('th', { key: g, className: 'text-center text-green-800 font-bold py-1 px-2 min-w-[44px]' }, g);
                  })
                )
              ),
              h('tbody', null,
                manipOrder.map(function(mk) {
                  return h('tr', { key: 'cm' + mk },
                    h('td', { className: 'py-1 pr-2' },
                      h('button', { onClick: function() { switchMode(mk); },
                        className: 'transition-colors text-xs font-bold text-slate-700 hover:text-green-700 underline'
                      }, labelOf[mk] || mk)
                    ),
                    grades.map(function(g) {
                      var st = (matrix[mk] || {})[g] || '';
                      return h('td', { key: g + '-' + mk, className: 'text-center' },
                        h('div', { className: 'rounded text-[10px] font-bold uppercase py-1 ' + cellClass(st) }, st || '·')
                      );
                    })
                  );
                })
              )
            )
          ),
          // Suggested sequencing
          h('div', { className: 'bg-white rounded-xl border-2 border-green-200 p-3' },
            h('p', { className: 'text-xs font-bold text-green-700 mb-2' }, __alloT('stem.manipulatives.suggested_first_month_sequence_any_gra', 'Suggested first-month sequence (any grade):')),
            h('ol', { className: 'list-decimal pl-5 text-xs text-slate-700 space-y-1' },
              h('li', null, __alloT('stem.manipulatives.start_with_the_manipulative_most_centr', 'Start with the manipulative most central to current standards.')),
              h('li', null, __alloT('stem.manipulatives.spend_2_3_sessions_on_free_exploration', 'Spend 2–3 sessions on free exploration before any "challenge."')),
              h('li', null, __alloT('stem.manipulatives.use_the_glossary_to_introduce_1_2_voca', 'Use the Glossary to introduce 1–2 vocab terms per session.')),
              h('li', null, __alloT('stem.manipulatives.build_into_cra_progression_mode_once_a', 'Build into CRA Progression mode once a concept is fluent.')),
              h('li', null, __alloT('stem.manipulatives.save_anchor_examples_to_the_library_re', 'Save anchor examples to the Library; revisit weekly.')),
              h('li', null, __alloT('stem.manipulatives.use_the_challenge_hub_for_5_min_warm_u', 'Use the Challenge Hub for 5-min warm-ups (interleaved practice).'))
            )
          ),
          h('div', { className: 'bg-green-50 rounded-lg p-3 border border-green-100 text-xs text-green-800' },
            __alloT('stem.manipulatives.manipulative_use_should', '💡 Manipulative use should '), h('b', null, 'decrease'), __alloT('stem.manipulatives.across_grades_as_students_internalize_', ' across grades as students internalize the representations. '),
            __alloT('stem.manipulatives.a_6th_grader_who_needs_blocks_for_23_4', 'A 6th grader who needs blocks for 23+47 has not been failed by the blocks — they were never taken away soon enough.')
          )
        );
      }

      // ═══════════════════════════════════════════════════════════════
      // ── v3: ACTIVITY CARDS MODE ──
      // ═══════════════════════════════════════════════════════════════
      if (manipMode === 'activities') {
        var activities = [
          { id: 'tf_make10', grade: 'K-1', tool: 'tenFrame', time: '5 min',
            goal: __alloT('stem.manipulatives.find_all_ways_to_make_10_with_two_part', 'Find all ways to make 10 with two parts.'),
            materials: 'One ten frame and 10 counters per pair.',
            steps: [
              'Show 5 dots filled in. Ask: "How many more to make 10?"',
              'Cover the 5 dots with your hand. Ask the same question.',
              'Now ask: "How many ways can two numbers make 10?"',
              'Have students record pairs: 0+10, 1+9, 2+8, ... 10+0.'
            ],
            extension: 'Are 3+7 and 7+3 the same or different? (This is the commutative property.)'
          },
          { id: 'b10_regroup', grade: '1-2', tool: 'blocks', time: '10 min',
            goal: __alloT('stem.manipulatives.discover_regrouping_carrying_by_runnin', 'Discover regrouping (carrying) by running out of ones.'),
            materials: 'Base-10 blocks: ~30 ones, ~10 tens.',
            steps: [
              'Each student builds 27 with 2 tens and 7 ones.',
              'Add 5 more ones. Now they have 12 ones — too many!',
              'Show the trade: 10 ones for 1 ten. Now they have 3 tens and 2 ones.',
              'Read the number: 32. Notice the answer was right all along.'
            ],
            extension: 'Why is it called "regrouping"? What is being "re-grouped"?'
          },
          { id: 'ct_zero', grade: '6-7', tool: 'counters', time: '15 min',
            goal: __alloT('stem.manipulatives.model_integer_addition_with_positive_n', 'Model integer addition with positive/negative counters.'),
            materials: 'Two-color counters (yellow = +1, red = −1). About 20 per pair.',
            steps: [
              'Show 5 yellow + 3 red. Net = +2.',
              'Discuss zero pairs: a yellow + a red cancel out.',
              'Try (-4) + 7. Place 4 red + 7 yellow. Remove zero pairs. What is left?',
              'Have students explain in words: "the negatives canceled three of the positives."'
            ],
            extension: 'Why does (-3) + (-5) make MORE negative? (No zero pairs to cancel.)'
          },
          { id: 'pb_hex', grade: '2-3', tool: 'patternBlocks', time: '10 min',
            goal: __alloT('stem.manipulatives.use_the_hexagon_as_the_unit_whole_buil', 'Use the hexagon as the unit whole; build other shapes as fractions of it.'),
            materials: 'Pattern blocks: hexagons, trapezoids, blue rhombi, triangles.',
            steps: [
              'Place 1 hexagon. Ask: "How many trapezoids cover this exactly?" (2 — so 1 trap = 1/2.)',
              '"How many blue rhombi?" (3 — so 1 rhombus = 1/3.)',
              '"How many triangles?" (6 — so 1 triangle = 1/6.)',
              'Mix: 1 trapezoid + 2 triangles. What does it cover? (1/2 + 2/6 = 1/2 + 1/3 = 5/6.)'
            ],
            extension: 'Find THREE different ways to cover 2 hexagons. Which uses the fewest pieces?'
          },
          { id: 'gb_rect', grade: '3-4', tool: 'geoboard', time: '15 min',
            goal: __alloT('stem.manipulatives.discover_that_area_and_perimeter_are_i', 'Discover that area and perimeter are independent.'),
            materials: 'A geoboard per student (or 5×5 dot paper).',
            steps: [
              'Build a 3×4 rectangle. Count perimeter: 14 units. Count area: 12 sq units.',
              'Build a 6×2 rectangle. Perimeter = 16, area = 12. Same area, different perimeter!',
              'Find all rectangles with area = 12 sq units. Compare their perimeters.',
              'Find all rectangles with perimeter = 12. Compare their areas.'
            ],
            extension: 'Of all rectangles with perimeter 12, which has the LARGEST area? Why?'
          },
          { id: 'cr_staircase', grade: '1-2', tool: 'cRods', time: '10 min',
            goal: __alloT('stem.manipulatives.see_the_addition_staircase_pattern', 'See the addition staircase pattern.'),
            materials: 'A set of Cuisenaire rods per pair.',
            steps: [
              'Line up rods 1 through 10 in a "staircase" — shortest to longest.',
              'Count the steps: 1, 2, 3, ... 10.',
              'Stack the staircase on its end. What total length do you get?',
              'Discover: 1+2+3+...+10 = 55.'
            ],
            extension: 'How would you compute 1+2+3+...+100 without writing them all down?'
          },
          { id: 'hc_primes', grade: '4-5', tool: 'hundredsChart', time: '20 min',
            goal: __alloT('stem.manipulatives.find_all_primes_1_100_using_the_sieve_', 'Find all primes 1-100 using the Sieve of Eratosthenes.'),
            materials: 'A blank hundreds chart for each student.',
            steps: [
              'Cross out 1 (not prime).',
              'Circle 2 (prime). Cross out every other multiple of 2.',
              'Circle 3. Cross out every other multiple of 3.',
              'Continue with 5, then 7. The rest of the circled numbers are all primes.'
            ],
            extension: 'Why didn\'t we need to check past 10 (since 10² = 100)?'
          },
          { id: 'nb_compose', grade: 'K-1', tool: 'numberBonds', time: '10 min',
            goal: __alloT('stem.manipulatives.fluently_decompose_any_number_from_5_t', 'Fluently decompose any number from 5 to 10.'),
            materials: 'Number bond template + 10 counters per child.',
            steps: [
              'Place 7 counters in the "whole" circle.',
              'Move some to part 1 and the rest to part 2.',
              'Read the bond: 7 is "3 and 4," or "5 and 2," or "1 and 6."',
              'List all the ways. There are 8 ways to decompose 7 (including 0+7).'
            ],
            extension: 'How many ways are there to decompose 8? 9? 10? Do you see a pattern?'
          },
          { id: 'ab_speed', grade: '3-5', tool: 'abacus', time: '15 min',
            goal: __alloT('stem.manipulatives.build_mental_imagery_of_place_value_vi', 'Build mental imagery of place value via the abacus.'),
            materials: 'A virtual abacus (this app) or physical soroban.',
            steps: [
              'Show 234 on the abacus (2 hundreds, 3 tens, 4 ones).',
              'Add 100 by sliding one bead up on the hundreds rod. New value: 334.',
              'Subtract 10. New value: 324.',
              'Add 5 ones, then trade up: the ones rod resets when it hits 10 (1 ten bead carries).'
            ],
            extension: 'Time a speed round: who can show "678" the fastest, starting from empty?'
          },
          { id: 'pvd_addition', grade: '4', tool: 'pvDisks', time: '20 min',
            goal: __alloT('stem.manipulatives.connect_the_standard_addition_algorith', 'Connect the standard addition algorithm to physical regrouping.'),
            materials: 'A place-value mat with columns for ones, tens, hundreds, thousands. Disks labeled 1, 10, 100, 1000.',
            steps: [
              'Build 256 in the ones/tens/hundreds columns.',
              'Below it, build 178 in the same columns.',
              'Combine, column by column: 6+8 = 14 ones, etc.',
              'Whenever a column hits 10 disks, regroup: trade 10 small disks for 1 large.',
              'Read the answer from the regrouped disks: 434.'
            ],
            extension: 'How is the "carry the 1" in the written algorithm the SAME as trading disks?'
          },
          { id: 'tf_dice', grade: 'K', tool: 'tenFrame', time: '5 min',
            goal: __alloT('stem.manipulatives.subitize_numbers_1_6_instantly', 'Subitize numbers 1-6 instantly.'),
            materials: 'A die per student and one ten frame each.',
            steps: [
              'Roll the die.',
              'Without counting, fill that many cells.',
              'Pass the die.',
              'After 5 rolls, check: did you and your partner agree on each count?'
            ],
            extension: 'Roll twice. Add the two numbers using ONE ten frame.'
          },
          { id: 'ct_temp', grade: '6', tool: 'counters', time: '10 min',
            goal: __alloT('stem.manipulatives.use_counters_as_a_thermometer_model', 'Use counters as a thermometer model.'),
            materials: 'Two-color counters; yellow = +1 degree, red = −1 degree.',
            steps: [
              'Place 5 yellow. "Temperature = +5°."',
              'The temperature drops 8 degrees. Add 8 red counters.',
              'Remove zero pairs. What is left? (3 red = −3°.)',
              'Now the temperature rises 5 more. Add 5 yellow. Pair up. Final temperature?'
            ],
            extension: 'The temperature drops 12, then rises 4, then drops 7. Starting at 0°, what is the final?'
          },
          { id: 'pb_symm', grade: '3-4', tool: 'patternBlocks', time: '15 min',
            goal: __alloT('stem.manipulatives.build_symmetric_designs', 'Build symmetric designs.'),
            materials: 'Pattern blocks. A line drawn on paper as a "mirror."',
            steps: [
              'Place 2 hexagons and 4 triangles on the left of the mirror line.',
              'Copy the design EXACTLY to the right side, but mirrored.',
              'Use the geoboard / blocks: each placement on the left has a matching placement on the right at equal distance from the line.',
              'Check: does the whole design look balanced across the line?'
            ],
            extension: 'How many lines of symmetry does a hexagon have? Try folding paper to discover.'
          },
          { id: 'hc_arrow', grade: '1-2', tool: 'hundredsChart', time: '10 min',
            goal: __alloT('stem.manipulatives.notice_that_adds_10_and_adds_1', 'Notice that ↓ adds 10 and → adds 1.'),
            materials: 'A printed hundreds chart per pair.',
            steps: [
              'Start at 24. Move 1 cell DOWN. What number? (34.)',
              'From 24, move 1 cell RIGHT. (25.)',
              'From 24, move 2 down, 3 right. (45.)',
              'Generalize: down adds 10, right adds 1, up subtracts 10, left subtracts 1.'
            ],
            extension: 'From 56, what arrow path lands on 89? (3 down, 3 right.)'
          },
          { id: 'cr_train', grade: '1-3', tool: 'cRods', time: '10 min',
            goal: __alloT('stem.manipulatives.find_all_trains_of_a_given_total', 'Find all "trains" of a given total.'),
            materials: 'A full set of Cuisenaire rods per pair.',
            steps: [
              'Pick a target length, say 5.',
              'Find a rod of length 5 (yellow). Place it.',
              'Make another train of length 5 using TWO rods (1+4, 2+3, etc.).',
              'Then with THREE rods, then FOUR. List every train you find.'
            ],
            extension: 'How many DIFFERENT trains of length 5 exist? (16 if you count order, 7 if not.)'
          },
          { id: 'gb_quad', grade: '3-4', tool: 'geoboard', time: '15 min',
            goal: __alloT('stem.manipulatives.sort_quadrilaterals_by_their_propertie', 'Sort quadrilaterals by their properties.'),
            materials: 'Geoboards or dot paper.',
            steps: [
              'Build a square. Note: 4 equal sides, 4 right angles.',
              'Build a rectangle that isn\'t a square. Note: 2 pairs of equal sides, 4 right angles.',
              'Build a parallelogram with NO right angles.',
              'Build a trapezoid (exactly 1 pair of parallel sides).',
              'Compare: which are subsets of which? (Every square is a rectangle.)'
            ],
            extension: 'Build a shape that is BOTH a rectangle and a rhombus. (It\'s a square.)'
          },
          { id: 'nb_doubles', grade: 'K-1', tool: 'numberBonds', time: '10 min',
            goal: __alloT('stem.manipulatives.master_the_doubles_facts_1_1_2_2_3_3_5', 'Master the doubles facts (1+1, 2+2, 3+3, ..., 5+5).'),
            materials: 'Number bonds template.',
            steps: [
              'Set whole = 2. Move part 1 to 1. Note: 1+1=2.',
              'Set whole = 4. Move part 1 to 2. Note: 2+2=4.',
              'Continue: 3+3=6, 4+4=8, 5+5=10.',
              'Chant the chain: 2, 4, 6, 8, 10. These are the doubles.'
            ],
            extension: 'Why do all doubles end in an even number?'
          },
          { id: 'pvd_estimate', grade: '4-5', tool: 'pvDisks', time: '15 min',
            goal: __alloT('stem.manipulatives.estimate_before_computing', 'Estimate before computing.'),
            materials: 'Place-value disks.',
            steps: [
              'Pose: "Is 387 + 246 closer to 500 or 700?"',
              'Round each: 400 + 200 = 600. Estimate.',
              'Now build with disks and combine. Regroup as needed.',
              'Compare the answer (633) to the estimate (600). Within 50? Good estimate!'
            ],
            extension: 'When is rounding to the nearest hundred FINE, and when is it too coarse?'
          },
          { id: 'frac_compare', grade: '3-4', tool: 'patternBlocks', time: '15 min',
            goal: __alloT('stem.manipulatives.compare_two_fractions_using_the_same_w', 'Compare two fractions using the same whole.'),
            materials: 'Pattern blocks.',
            steps: [
              'Lay out 1 hexagon — call it 1 whole.',
              'Cover one side with 3 triangles (3/6).',
              'Cover the other side with 2 rhombi (2/3).',
              'Which is bigger? Use the blocks themselves: 2/3 covers more.'
            ],
            extension: 'Why does the rule "bigger denominator = smaller pieces" make sense, given the blocks?'
          },
          { id: 'tf_dot_talk', grade: 'K-1', tool: 'tenFrame', time: '5 min',
            goal: __alloT('stem.manipulatives.dot_talks_multiple_ways_to_see_the_sam', 'Dot Talks — multiple ways to see the same arrangement.'),
            materials: 'A pre-arranged ten frame (e.g. 7 dots).',
            steps: [
              'Show the frame for 3 seconds, then hide.',
              'Ask: "How many? How did you SEE it?"',
              'Accept multiple answers: "5 in the top row + 2", "10 − 3 missing", "3 + 4."',
              'Surface that EVERY decomposition is valid.'
            ],
            extension: 'Same activity but with two different arrangements showing 7 — which feels easier to see?'
          },
          { id: 'hc_target', grade: '2-3', tool: 'hundredsChart', time: '10 min',
            goal: __alloT('stem.manipulatives.find_a_number_through_10_and_1_navigat', 'Find a number through 10-and-1 navigation.'),
            materials: 'Printed hundreds chart.',
            steps: [
              'Pick a "secret" number 1-100. Don\'t tell.',
              'Partner guesses; respond only "higher" or "lower."',
              'After each guess, the guesser must move +/− 10 or +/− 1 (not a fresh guess).',
              'Track how many moves it takes.'
            ],
            extension: 'Is moving by 10s first faster than moving by 1s first? Why?'
          },
          { id: 'gb_pick', grade: '5', tool: 'geoboard', time: '20 min',
            goal: __alloT('stem.manipulatives.discover_pick_s_theorem_for_area', 'Discover Pick\'s Theorem for area.'),
            materials: 'Geoboards or dot paper.',
            steps: [
              'Build a polygon. Count: I = pegs INSIDE the shape; B = pegs ON the boundary.',
              'Compute: A = I + B/2 − 1.',
              'Cross-check by counting unit squares (if the shape is simple).',
              'Try several polygons. Does Pick\'s formula always work?'
            ],
            extension: 'Why does the formula need "− 1" at the end? (Hint: try a 1-by-1 square.)'
          },
          { id: 'b10_compare', grade: '2', tool: 'blocks', time: '10 min',
            goal: __alloT('stem.manipulatives.compare_3_digit_numbers_using_place_va', 'Compare 3-digit numbers using place-value blocks.'),
            materials: 'Base-10 blocks for two players.',
            steps: [
              'Each player builds a 3-digit number (say, 234 and 252).',
              'Compare by looking at the highest place first: hundreds match (2 = 2).',
              'Then tens: 5 > 3, so 252 > 234.',
              'Have students write the comparison symbol: 252 > 234 or 234 < 252.'
            ],
            extension: 'What if the hundreds digit differs? Then you can stop comparing immediately. Why?'
          },
          { id: 'cr_ratios', grade: '5-6', tool: 'cRods', time: '20 min',
            goal: __alloT('stem.manipulatives.find_equivalent_ratios_with_rods', 'Find equivalent ratios with rods.'),
            materials: 'Cuisenaire rods.',
            steps: [
              'Place a yellow (5) and a red (2). Ratio 5:2.',
              'Now align 2 yellows above 2 reds. Combined length 10:4.',
              'Notice: 10:4 simplifies back to 5:2 — they\'re EQUIVALENT.',
              'Try other ratios: 6:3 = 2:1, 8:6 = 4:3, etc.'
            ],
            extension: 'Why does 5:2 simplify to itself? (It\'s already in lowest terms — GCD is 1.)'
          },
          { id: 'nb_minus', grade: '1', tool: 'numberBonds', time: '5 min',
            goal: __alloT('stem.manipulatives.solve_missing_addend_subtraction_with_', 'Solve missing-addend subtraction with a number bond.'),
            materials: 'Number bond template.',
            steps: [
              'Pose: 8 − ? = 3.',
              'Place whole = 8, part 1 = 3. Find part 2 = ? (5)',
              'Re-read as subtraction: 8 − 5 = 3. Same fact, different form.',
              'Practice: 10 − ? = 6, 9 − ? = 4, etc.'
            ],
            extension: 'How does the bond help when you don\'t know the answer? (It turns subtraction into an addition.)'
          },
          { id: 'tf_double', grade: 'K-1', tool: 'tenFrame', time: '10 min',
            goal: __alloT('stem.manipulatives.use_the_double_ten_frame_to_add_within', 'Use the double ten frame to add within 20.'),
            materials: 'Two ten frames per student.',
            steps: [
              'Place 8 in the first frame. Place 5 in the second frame.',
              'Move 2 from the second frame to fill the first (make 10).',
              'You now have 10 + 3. Total = 13.',
              'Repeat with other near-ten pairs: 9+4, 7+6, 8+7.'
            ],
            extension: 'Why does "make ten first" feel easier than just counting all? (Working memory: 10 + something is automatic.)'
          },
          { id: 'pb_mosaic', grade: '2-3', tool: 'patternBlocks', time: '20 min',
            goal: __alloT('stem.manipulatives.tile_a_region_with_no_gaps_tessellatio', 'Tile a region with no gaps (tessellation).'),
            materials: 'Pattern blocks, a paper outline (square or hexagon).',
            steps: [
              'Trace a 6-inch square on paper.',
              'Cover it with pattern blocks of any shape — no gaps, no overlaps.',
              'Count how many of each block you used.',
              'Try again with a single shape only (e.g. all triangles). Does it still work?'
            ],
            extension: 'Which shapes tile the plane all by themselves? (Triangle, square, hexagon are the only 3 regular polygons that do.)'
          },
          { id: 'ab_kindergarten', grade: 'K', tool: 'abacus', time: '5 min',
            goal: __alloT('stem.manipulatives.connect_one_bead_to_one_count', 'Connect one bead to one count.'),
            materials: 'Soroban abacus (1 rod is enough).',
            steps: [
              'Slide one bead up. "One."',
              'Slide another. "Two." Continue to 4.',
              'Now slide the heaven bead down (worth 5).',
              'Notice: 5 + 0 earth beads = 5. Total = 5.'
            ],
            extension: 'Make 9: heaven bead + 4 earth beads = 5 + 4 = 9.'
          },
          { id: 'sr_lookup', grade: '7-8', tool: 'slideRule', time: '15 min',
            goal: __alloT('stem.manipulatives.look_up_the_log_of_a_number', 'Look up the log of a number.'),
            materials: 'The virtual slide rule.',
            steps: [
              'Find 2 on the D scale.',
              'Read its position: it sits at log₁₀(2) ≈ 0.301 of the way along.',
              'Find 3 on D — at 0.477.',
              'Find 5 on D — at 0.699. So log₁₀(5) = 1 − log₁₀(2) (since 2 × 5 = 10).'
            ],
            extension: 'Why does the D scale start at 1 instead of 0?'
          },
          { id: 'all_show2025', grade: '3-5', tool: 'curriculum', time: '5 min',
            goal: __alloT('stem.manipulatives.pick_the_right_tool_for_the_goal', 'Pick the right tool for the goal.'),
            materials: 'Just this app.',
            steps: [
              'Open the Curriculum Map.',
              'Show a student the matrix. Ask: "If you wanted to learn fractions, which manipulatives would you use?"',
              'Discuss: pattern blocks (for unit fractions), Cuisenaire rods (for parts of a whole), the Fraction Lab (for abstract operations).',
              'Same exercise for "negative numbers" → counters.'
            ],
            extension: 'Pick ONE topic from the standards browser. Find every manipulative that supports it.'
          },
          { id: 'b10_estimate', grade: '2-3', tool: 'blocks', time: '10 min',
            goal: __alloT('stem.manipulatives.estimate_before_computing_3_digit_sums', 'Estimate before computing 3-digit sums.'),
            materials: 'Base-10 blocks.',
            steps: [
              'Pose: 287 + 156. Before building, estimate to the nearest 100: ~300 + ~200 = ~500.',
              'Now build both and combine.',
              'Regroup. Compare the actual answer (443) with the estimate (500). Within 100? Reasonable.',
              'Discuss why estimating first protects against silly errors.'
            ],
            extension: 'Try 412 + 87. Estimate: ~400 + ~100 = ~500. Then verify: 499. Close!'
          },
          { id: 'cra_real_world', grade: '3-5', tool: 'cra', time: '15 min',
            goal: __alloT('stem.manipulatives.apply_cra_to_a_real_word_problem', 'Apply CRA to a real word problem.'),
            materials: 'A word problem (e.g. "There are 4 packs of pencils, with 6 pencils in each pack").',
            steps: [
              'CONCRETE: Have students stack 4 piles of 6 cubes.',
              'REPRESENTATIONAL: Have them draw a 4-by-6 array of dots or boxes.',
              'ABSTRACT: Write the equation 4 × 6 = 24.',
              'Discuss: which step felt easiest? Hardest?'
            ],
            extension: 'Take a different word problem from your math book. Walk the same C → R → A path.'
          },
          { id: 'all_warm_up', grade: 'any', tool: 'challenges', time: '5 min',
            goal: __alloT('stem.manipulatives.five_minute_warm_up_across_all_manipul', 'Five-minute warm-up across all manipulatives.'),
            materials: 'Just this app.',
            steps: [
              'Open the Challenge Hub.',
              'Hit "Pick a problem." Solve.',
              'Click "→ open the manipulative" if you want to verify with the tool.',
              'Repeat 3-5 times. The randomness ensures different topics each time.'
            ],
            extension: 'Track which CATEGORIES of problem your students miss most. Use that data to plan the next focused lesson.'
          }
        ];

        var aIdx = _m.activityIdx != null ? _m.activityIdx : 0;
        var curAct = activities[aIdx];

        var doPrint = function() {
          window.print();
        };

        return h('div', { className: 'space-y-3 max-w-3xl mx-auto animate-in fade-in duration-200' },
          headerEl,
          h('div', { className: 'bg-white rounded-xl border-2 border-rose-200 p-4', style: { breakInside: 'avoid' } },
            h('div', { className: 'flex items-baseline justify-between mb-2' },
              h('div', null,
                h('p', { className: 'text-xs font-bold text-rose-700 uppercase tracking-wider' },
                  'Card ' + (aIdx + 1) + ' of ' + activities.length
                ),
                h('h3', { className: 'text-lg font-black text-rose-900' }, curAct.goal)
              ),
              h('div', { className: 'text-right' },
                h('span', { className: 'inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-rose-100 text-rose-800' }, 'Grade ' + curAct.grade),
                h('span', { className: 'inline-block ml-1 px-2 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800' }, curAct.time)
              )
            ),
            h('p', { className: 'text-xs font-bold text-rose-700 mt-3 mb-1' }, 'MATERIALS:'),
            h('p', { className: 'text-sm text-slate-800 mb-3' }, curAct.materials),
            h('p', { className: 'text-xs font-bold text-rose-700 mb-1' }, 'STEPS:'),
            h('ol', { className: 'list-decimal pl-5 text-sm text-slate-800 space-y-1 mb-3' },
              curAct.steps.map(function(s, i) {
                return h('li', { key: 'st' + i }, s);
              })
            ),
            h('p', { className: 'text-xs font-bold text-rose-700 mb-1' }, __alloT('stem.manipulatives.extension_question', 'EXTENSION QUESTION:')),
            h('p', { className: 'text-sm text-slate-800 italic' }, curAct.extension)
          ),
          h('div', { className: 'flex gap-2 justify-between' },
            h('button', {
              onClick: function() { upd({ activityIdx: Math.max(0, aIdx - 1) }); },
              disabled: aIdx <= 0,
              className: 'px-4 py-2 rounded text-xs font-bold ' + (aIdx <= 0 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'transition-colors bg-slate-200 text-slate-700 hover:bg-slate-300')
            }, __alloT('stem.manipulatives.previous_2', '← Previous')),
            h('button', { onClick: function() { switchMode(curAct.tool); },
              className: 'transition-colors px-4 py-2 rounded text-xs font-bold bg-rose-600 text-white hover:bg-rose-700' },
              '→ Open the ' + curAct.tool + ' tool'
            ),
            h('button', { onClick: doPrint,
              className: 'transition-colors px-4 py-2 rounded text-xs font-bold bg-blue-600 text-white hover:bg-blue-700' }, __alloT('stem.manipulatives.print', '🖨 Print')),
            h('button', {
              onClick: function() { upd({ activityIdx: Math.min(activities.length - 1, aIdx + 1) }); },
              disabled: aIdx >= activities.length - 1,
              className: 'px-4 py-2 rounded text-xs font-bold ' + (aIdx >= activities.length - 1 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'transition-colors bg-slate-200 text-slate-700 hover:bg-slate-300')
            }, __alloT('stem.manipulatives.next_11', 'Next →'))
          ),
          h('div', { className: 'bg-white rounded-xl border-2 border-rose-200 p-3' },
            h('p', { className: 'text-xs font-bold text-rose-700 mb-2' }, __alloT('stem.manipulatives.all_cards', 'All cards:')),
            h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-1' },
              activities.map(function(a, i) {
                return h('button', { key: 'ac' + i, onClick: function() { upd({ activityIdx: i }); },
                  title: a.goal,
                  className: 'text-left p-2 rounded text-xs transition-all ' +
                    (i === aIdx ? 'bg-rose-100 border border-rose-400' : 'bg-white border border-slate-200 hover:bg-rose-50')
                },
                  h('span', { className: 'font-mono text-[10px] bg-slate-200 px-1 rounded mr-1' }, a.grade),
                  h('span', { className: 'font-bold' }, a.goal.length > 50 ? a.goal.slice(0, 50) + '…' : a.goal)
                );
              })
            )
          ),
          h('div', { className: 'bg-rose-50 rounded-lg p-3 border border-rose-100 text-xs text-rose-800' },
            __alloT('stem.manipulatives.cards_are_designed_to_be_printed_and_u', '💡 Cards are designed to be printed and used away from the screen. Real, physical manipulatives still beat virtual ones for K-2 — the kinesthetic loop matters. '),
            __alloT('stem.manipulatives.the_app_gives_you_every_manipulative_o', 'The app gives you EVERY manipulative on hand, even when the physical kit isn\'t in the room.')
          )
        );
      }

      // ═══════════════════════════════════════════════════════════════
      // ── v3: HELP & FAQ MODE ──
      // ═══════════════════════════════════════════════════════════════
      if (manipMode === 'help') {
        var faqs = [
          { q: 'What is a "manipulative"?',
            a: 'A physical (or virtual) object students hold, move, and arrange to make a math idea visible. Think Cuisenaire rods, ten frames, base-10 blocks. Research (Carbonneau, Marley & Selig 2013 meta-analysis) shows manipulatives lift learning outcomes when used with clear instruction — they aren\'t magic on their own.' },
          { q: 'Should every kid have the physical version too?',
            a: 'For K-2, yes if you can swing it. Kinesthetic feedback matters at that age. For 3-5 the virtual version is roughly as effective and lets you save / share constructions. By 6+, students mostly work in the representational and abstract registers; manipulatives become explanatory tools, not daily fare.' },
          { q: 'Why so many modes?',
            a: 'Each manipulative addresses a different cluster of CCSS standards. The Standards Browser shows which standard each mode hits. The Curriculum Map shows when each is typically introduced. You almost never need all 12 in one lesson.' },
          { q: 'How do I save a student\'s work to come back to next session?',
            a: 'Switch to Library mode, give your construction a name, and click Save. Next session, open Library and click the saved entry.' },
          { q: 'Can students see the answers in the Brain Teasers?',
            a: 'Yes — the Reveal Answer button shows it. You can use them as silent practice or as discussion prompts. The hidden-by-default design is meant to encourage attempt-first.' },
          { q: 'Does this work for kids with low vision?',
            a: 'The Settings panel in Teacher mode lets you switch to the high-contrast palette. All buttons have aria-labels; aria-live regions announce changes. CSS respects prefers-reduced-motion.' },
          { q: 'What about kids who can\'t use a mouse?',
            a: 'Most interactions are keyboard-reachable. Tab cycles focus; Enter / Space activates buttons. The base-10 blocks support arrow-key fine-tuning. Where touch is required (drag-and-drop on the geoboard, peg-to-peg), we support tap-tap-to-connect rather than drag, which works for touch and pointer users.' },
          { q: 'My student gets stuck quickly. What should I do?',
            a: 'Move them to CRA Progression mode and start with addition. The three-stage walk-through (objects → picture → equation) is the most reliable scaffold for stuck learners. Witzel et al. (2003) effect size ~0.5.' },
          { q: 'Why no fractions in the manipulatives section?',
            a: 'Pattern blocks and Cuisenaire rods both teach fractions hands-on. For deep fraction work, the separate Fraction Lab tool covers the topic in depth (number lines, equivalence, operations).' },
          { q: 'Do you store student data?',
            a: 'No. Everything lives in your browser. Use the Teacher dashboard to export progress as CSV/JSON if you need records. Nothing leaves your device unless you explicitly export.' },
          { q: 'Can I use this in a flipped classroom?',
            a: 'Yes — assign an Activity Card or a CRA walk-through as homework, then discuss it the next day. The Library lets students save their construction and pick up where they left off.' },
          { q: 'My class is hybrid (some in-room, some remote). Tips?',
            a: 'Share your screen and walk through a Library construction; remote students can follow along on their own devices. The print button on Activity Cards generates a handout for in-room use.' },
          { q: 'Is this tool aligned to any specific curriculum?',
            a: 'It is aligned to Common Core (CCSS-M). Texas TEKS, Florida B.E.S.T., and most state standards share most CCSS K-5 content. The mapping is conceptual; check your specific standards for exact wording.' },
          { q: 'Where can I report a bug or request a feature?',
            a: 'AlloFlow is open source. Visit the project repository to file an issue. For classroom-specific questions, your AlloFlow administrator should be able to route the request.' },
          { q: 'Why a virtual abacus?',
            a: 'A soroban (Japanese) abacus is still taught in many countries because users develop strong mental imagery for place value and arithmetic. The virtual version lets you try it without buying one.' },
          { q: 'Is the slide rule actually useful for kids today?',
            a: 'Honestly, no — for daily arithmetic. We include it because it makes logarithms physically concrete: addition of distances = multiplication of values. It is a "wow" tool for an enrichment unit, not a fluency tool.' },
          { q: 'How do I differentiate for advanced students?',
            a: 'Send them to the Brain Teasers mode (especially the "hard" ones — Pascal\'s row, Kaprekar, Möbius, painted cube). Or have them build a CRA progression for a peer who is just learning the concept; teaching cements understanding faster than re-solving practice problems.' },
          { q: 'What about students well below grade level?',
            a: 'The Curriculum Map mode shows which manipulative is "introductory" at each grade. For a 5th grader struggling with fractions, return to Pattern Blocks and Cuisenaire Rods (introduced in Grade 1-3). The pacing of the curriculum, not the tool, is the limiting factor.' },
          { q: 'How long should a manipulative session be?',
            a: 'For K-2, 10-15 minutes of focused work, then a movement break. For 3-5, 20-30 minutes is realistic. Sessions longer than ~45 minutes hit diminishing returns; better to revisit the manipulative the next day than to extend a session.' },
          { q: 'Should students work alone or in pairs?',
            a: 'Pairs, almost always — for ALL ages. The "math talk" that happens between two students reasoning over a manipulative is where conceptual understanding consolidates. Solo work is fine for fluency drill but not for new learning.' },
          { q: 'Do I really need to teach vocabulary explicitly?',
            a: 'Yes. Marzano (2004) estimated direct vocab instruction in a content area produces ~33 percentile points of gain. The Glossary mode gives definitions, examples, and links to the manipulative that demonstrates each term.' },
          { q: 'Are there assessments built in?',
            a: 'Yes — each manipulative has a Challenge sub-panel that scores correct/total. The Challenge Hub interleaves problems across manipulatives. The Teacher Dashboard aggregates scores, streaks, badges, and mode coverage and exports them as CSV/JSON.' },
          { q: 'Can I use this tool without internet access?',
            a: 'After the first load, AlloFlow tools work offline via service-worker caching. Refresh once with internet to make sure the cache is warm, then offline use should work normally on the same device.' },
          { q: 'What about students with dyscalculia?',
            a: 'The CRA progression mode is particularly important — most dyscalculic students struggle to bridge from concrete to symbolic without explicit, step-by-step support. Pair with the Number Bonds mode for foundational number-sense work. Keep manipulative work going LONGER than typical kids; their abstract leap takes more scaffolding.' },
          { q: 'Why does the slide rule problem set use 2.5 × 4?',
            a: 'Slide rules are inherently analog and imprecise. Practice problems with answers like 2.5 × 4 = 10 are forgiving (the 15% tolerance accepts ≈9 to ≈11). Integer-only problems would frustrate honest attempts.' },
          { q: 'My ten frame challenge says "10" but I want 12. Can I change it?',
            a: 'Toggle Double Frame (to 20) in the ten frame mode\'s settings. The challenges automatically scale to support up to 20.' },
          { q: 'How is this different from a paper worksheet?',
            a: 'Worksheets give problems and an answer key. This tool lets students MANIPULATE — try arrangements, see the regrouping happen, undo, reset. The action is the learning. Worksheets test what you already know; manipulatives BUILD what you know.' },
          { q: 'My class has English learners. Will this work?',
            a: 'Better than worksheets, in most cases. Manipulatives are language-light: students can demonstrate understanding by arranging, even if their English vocab is limited. The Glossary helps build math-specific English over time. Pair language-rich and language-lighter students.' },
          { q: 'What if a student finishes a challenge too fast?',
            a: 'Don\'t just hand them more of the same. Send them to Brain Teasers (the "hard" tier), or have them invent a problem for a peer using the same manipulative. Inventing problems is harder than solving them.'
          },
          { q: 'Can I track progress across sessions on the same device?',
            a: 'Yes — progress is saved automatically in the browser. The Teacher Dashboard shows running totals. To start fresh between students, click "Reset progress" before the next student starts.'
          },
          { q: 'Are the puzzles original?',
            a: 'Most are classic problems (handshake, Monty Hall, Kaprekar, pigeonhole, painted cube, etc.). Where a specific problem has a known historical source, the "why" section notes it.'
          },
          { q: 'How do you decide which manipulative is "core" at each grade in the Curriculum Map?',
            a: 'A consensus reading of CCSS-M, NCTM Principles to Actions (2014), and common K-5 curricula (Eureka, Bridges, Singapore in Focus). It is a STARTING POINT for planning — adjust to your local pacing and your students.'
          }
        ];

        var shortcuts = [
          { keys: 'Tab', what: 'Move focus to the next button or control.' },
          { keys: 'Shift+Tab', what: 'Move focus backward.' },
          { keys: 'Enter / Space', what: 'Activate the focused button.' },
          { keys: 'Esc', what: 'Close the current dialog / panel.' },
          { keys: 'Ctrl+P', what: 'Print the current activity card or construction.' },
          { keys: 'Ctrl++', what: 'Browser zoom in (helpful for fine-grained pegs).' },
          { keys: 'Ctrl+−', what: 'Browser zoom out.' },
          { keys: 'Ctrl+0', what: 'Reset browser zoom to 100%.' },
          { keys: 'Arrow keys', what: 'In some panels, fine-tune values one step at a time.' },
          { keys: '?', what: 'Toggle the Help panel from anywhere (where bound).' }
        ];

        var helpAct = _m.helpSub || 'faq'; // 'faq' | 'shortcuts' | 'about'

        return h('div', { className: 'space-y-3 max-w-3xl mx-auto animate-in fade-in duration-200' },
          headerEl,
          // Sub-tabs
          h('div', { className: 'flex gap-1 bg-slate-100 rounded-lg p-1' },
            [{ id: 'faq', label: __alloT('stem.manipulatives.faq', '❓ FAQ') }, { id: 'shortcuts', label: __alloT('stem.manipulatives.shortcuts', '⌨ Shortcuts') }, { id: 'pitfalls', label: __alloT('stem.manipulatives.pitfalls', '⚠ Pitfalls') }, { id: 'about', label: __alloT('stem.manipulatives.about', 'ℹ About') }].map(function(s) {
              return h('button', { key: 'hs' + s.id,
                onClick: function() { upd({ helpSub: s.id }); },
                className: 'flex-1 py-1.5 rounded text-xs font-bold transition-all ' +
                  (helpAct === s.id ? 'bg-white text-slate-800 shadow' : 'text-slate-600 hover:bg-slate-50')
              }, s.label);
            })
          ),
          helpAct === 'faq' && h('div', { className: 'space-y-2' },
            faqs.map(function(f, i) {
              return h('details', { key: 'faq' + i, className: 'bg-white rounded-xl border-2 border-slate-200 p-3' },
                h('summary', { className: 'transition-colors text-sm font-bold text-slate-800 cursor-pointer hover:text-slate-900' }, f.q),
                h('p', { className: 'text-xs text-slate-700 mt-2 leading-relaxed' }, f.a)
              );
            })
          ),
          helpAct === 'shortcuts' && h('div', { className: 'bg-white rounded-xl border-2 border-slate-200 p-3' },
            h('p', { className: 'text-xs font-bold text-slate-700 mb-2' }, __alloT('stem.manipulatives.keyboard_shortcuts', 'Keyboard shortcuts:')),
            h('table', { className: 'w-full text-xs' },
              h('tbody', null,
                shortcuts.map(function(s) {
                  return h('tr', { key: 'sc' + s.keys, className: 'border-b border-slate-100' },
                    h('td', { className: 'py-2 pr-3' },
                      h('kbd', { className: 'inline-block px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-[11px]' }, s.keys)
                    ),
                    h('td', { className: 'py-2 text-slate-700' }, s.what)
                  );
                })
              )
            )
          ),
          helpAct === 'pitfalls' && h('div', { className: 'space-y-2' },
            [
              { title: __alloT('stem.manipulatives.treating_manipulatives_as_filler_not_i', 'Treating manipulatives as "filler" not instruction'),
                detail: __alloT('stem.manipulatives.common_mistake_handing_out_blocks_and_', 'Common mistake: handing out blocks and walking away. Without explicit instruction CONNECTING the manipulative to the symbol, students often play with the toy and learn nothing new. Always close every manipulative session with: "Show me on paper what you just did."')
              },
              { title: __alloT('stem.manipulatives.keeping_students_on_the_concrete_stage', 'Keeping students on the concrete stage too long'),
                detail: __alloT('stem.manipulatives.a_4th_grader_who_still_needs_blocks_fo', 'A 4th grader who still NEEDS blocks for 23 + 47 has a problem. The blocks were a scaffold; if they never come off, fluency never develops. Move to representational (pictures) by grade 2-3, to abstract (symbols) by grade 3-4. Re-enter concrete only for new concepts.')
              },
              { title: __alloT('stem.manipulatives.skipping_the_representational_stage', 'Skipping the representational stage'),
                detail: __alloT('stem.manipulatives.most_rushed_teachers_go_from_blocks_st', 'Most rushed teachers go from blocks straight to "now write 4 + 5 = 9." That skips the iconic stage (drawing dots, number lines, arrays). Witzel, Mercer & Miller (2003) found the gap is where most learners fail. Always include a picture step.')
              },
              { title: __alloT('stem.manipulatives.letting_students_always_work_alone', 'Letting students always work alone'),
                detail: __alloT('stem.manipulatives.manipulative_work_without_talk_is_half', 'Manipulative work without TALK is half the value. Pair students; require them to verbalize what they\'re doing. The verbalization IS the consolidation step that moves the action from "fingers know" to "head knows."')
              },
              { title: __alloT('stem.manipulatives.confusing_speed_with_understanding', 'Confusing speed with understanding'),
                detail: __alloT('stem.manipulatives.timed_fact_fluency_drills_can_make_stu', 'Timed fact-fluency drills can make students faster at procedures they don\'t understand (look up "math anxiety" research: Boaler 2014). Slow manipulative work is NOT inferior to fast paper work for K-3.')
              },
              { title: __alloT('stem.manipulatives.mismatching_manipulative_to_standard', 'Mismatching manipulative to standard'),
                detail: __alloT('stem.manipulatives.don_t_use_the_abacus_to_teach_fraction', 'Don\'t use the abacus to teach fractions. Don\'t use pattern blocks to teach place value. The Curriculum Map shows which manipulative addresses which CCSS — start there.')
              },
              { title: __alloT('stem.manipulatives.praising_effort_but_not_strategy', 'Praising effort but not strategy'),
                detail: __alloT('stem.manipulatives.saying_great_job_rewards_completion_sa', 'Saying "great job!" rewards completion. Saying "I noticed you tried 3 trapezoids before switching to 6 triangles — what made you switch?" rewards thinking. Be specific.')
              },
              { title: __alloT('stem.manipulatives.ignoring_student_invented_strategies', 'Ignoring student-invented strategies'),
                detail: __alloT('stem.manipulatives.a_student_who_shows_8_5_as_9_4_because', 'A student who shows 8 + 5 as "9 + 4" (because they took 1 from 5 and added it to 8 first) has invented a make-ten strategy. Surface it; name it; teach the class to try it. The textbook approach is not the only correct approach.')
              },
              { title: __alloT('stem.manipulatives.using_too_many_manipulatives_at_once', 'Using too many manipulatives at once'),
                detail: __alloT('stem.manipulatives.a_table_covered_in_4_different_manipul', 'A table covered in 4 different manipulatives is a recipe for distraction, not differentiation. Pick ONE per lesson. The other 11 in this tool are great — for other lessons.')
              },
              { title: __alloT('stem.manipulatives.forgetting_to_ask_why', 'Forgetting to ask "why?"'),
                detail: __alloT('stem.manipulatives.students_will_arrange_counters_correct', 'Students will arrange counters correctly because they\'ve memorized the moves, without understanding the meaning. "Why did you put the 1 in the tens column?" should be your most-asked question.')
              },
              { title: __alloT('stem.manipulatives.cleaning_up_too_quickly', 'Cleaning up too quickly'),
                detail: __alloT('stem.manipulatives.a_built_construction_is_a_powerful_art', 'A built construction is a powerful artifact — leave it on the table while the class talks about it. Save it to the Library if you need it back tomorrow. Don\'t make students dismantle a hard-won build to "be ready for the next subject."')
              },
              { title: __alloT('stem.manipulatives.asking_only_convergent_questions', 'Asking only convergent questions'),
                detail: __alloT('stem.manipulatives.what_is_4_3_has_one_answer_convergent_', '"What is 4 + 3?" has one answer (convergent). "Show me 7 in three different ways" has many (divergent). Divergent prompts expose how students think — which is the assessment that matters.')
              }
            ].map(function(p, i) {
              return h('details', { key: 'pf' + i, className: 'bg-white rounded-xl border-2 border-amber-200 p-3' },
                h('summary', { className: 'transition-colors text-sm font-bold text-amber-900 cursor-pointer hover:text-amber-700' }, '⚠ ', p.title),
                h('p', { className: 'text-xs text-slate-700 mt-2 leading-relaxed' }, p.detail)
              );
            })
          ),
          helpAct === 'about' && h('div', { className: 'bg-white rounded-xl border-2 border-slate-200 p-4 space-y-3 text-xs text-slate-800' },
            h('h3', { className: 'text-base font-bold' }, __alloT('stem.manipulatives.about_math_manipulatives', 'About Math Manipulatives')),
            h('p', null,
              __alloT('stem.manipulatives.a_virtual_kit_of_12_classic_k_5_math_m', 'A virtual kit of 12 classic K-5 math manipulatives, plus a CRA progression scaffold, '),
              __alloT('stem.manipulatives.a_challenge_bank_a_ccss_standards_brow', 'a challenge bank, a CCSS standards browser, a printable activity-card library, and '),
              __alloT('stem.manipulatives.a_teacher_dashboard_with_progress_expo', 'a teacher dashboard with progress export.')
            ),
            h('p', null,
              __alloT('stem.manipulatives.built_as_part_of', 'Built as part of '), h('b', null, 'AlloFlow'),
              __alloT('stem.manipulatives.an_open_source_learning_platform_for_k', ', an open-source learning platform for K-12 classrooms. '),
              __alloT('stem.manipulatives.alloflow_is_licensed_under_agpl_v3', 'AlloFlow is licensed under AGPL v3.')
            ),
            h('h4', { className: 'font-bold mt-3' }, __alloT('stem.manipulatives.sources_credits', 'Sources & credits')),
            h('ul', { className: 'list-disc pl-5 space-y-1' },
              h('li', null, __alloT('stem.manipulatives.pedagogy_bruner_1966_witzel_mercer_mil', 'Pedagogy: Bruner (1966), Witzel/Mercer/Miller (2003 meta-analysis), Carbonneau/Marley/Selig (2013 meta-analysis).')),
              h('li', null, __alloT('stem.manipulatives.manipulatives_montessori_golden_beads_', 'Manipulatives: Montessori (Golden Beads), Cuisenaire (1952), Gattegno (Geoboard), Singapore Math (Number Bonds).')),
              h('li', null, __alloT('stem.manipulatives.standards_common_core_state_standards_', 'Standards: Common Core State Standards for Mathematics, K-7.')),
              h('li', null, __alloT('stem.manipulatives.accessibility_wcag_2_1_aa_okabe_ito_cb', 'Accessibility: WCAG 2.1 AA. Okabe-Ito CB-safe palette.')),
              h('li', null, __alloT('stem.manipulatives.audio_web_audio_api_for_sound_effects_', 'Audio: Web Audio API for sound effects, fully togglable.'))
            ),
            h('h4', { className: 'font-bold mt-3' }, __alloT('stem.manipulatives.privacy', 'Privacy')),
            h('p', null,
              __alloT('stem.manipulatives.all_state_lives_in_your_browser_no_dat', 'All state lives in your browser. No data is sent anywhere unless you explicitly export. '),
              __alloT('stem.manipulatives.browser_storage_is_per_device_clearing', 'Browser storage is per-device — clearing site data resets progress.')
            )
          )
        );
      }

      // ── Number Line mode removed in v3.2: see stem_tool_numberline.js for
      //    the richer standalone tool. The Curriculum Map / Standards browser
      //    no longer link here for number-line work.

      // ═══════════════════════════════════════════════════════════════
      // ── v3.1: FRACTION BARS MODE ──
      // ═══════════════════════════════════════════════════════════════
      // Equal-length bars partitioned into halves, thirds, fourths, etc.
      // Click parts to highlight. See equivalence visually (stack of bars).
      if (manipMode === 'fracBars') {
        var fbBarWidth = 640;
        var fbColors = { 1: '#dc2626', 2: '#ea580c', 3: '#f59e0b', 4: '#84cc16', 6: '#10b981', 8: '#06b6d4', 12: '#3b82f6' };
        var toggleFbPart = function(denom, partIdx) {
          var cur = (fbSelected[denom] || []).slice();
          var i = cur.indexOf(partIdx);
          if (i >= 0) cur.splice(i, 1); else cur.push(partIdx);
          var ns = Object.assign({}, fbSelected);
          ns[denom] = cur;
          upd({ fbSelected: ns });
          if (soundEnabled) sfxClick();
        };
        var clearFb = function() { upd({ fbSelected: {} }); };
        var fbFractionValue = function(denom) {
          var parts = (fbSelected[denom] || []).length;
          return parts / denom;
        };
        var genFb = function() {
          var puzzles = [
            { q: 'Highlight exactly 1/2 on the halves bar.', denom: 2, target: 1 },
            { q: 'Highlight exactly 1/4 on the fourths bar.', denom: 4, target: 1 },
            { q: 'Highlight exactly 3/4 on the fourths bar.', denom: 4, target: 3 },
            { q: 'Highlight 2/3 on the thirds bar.', denom: 3, target: 2 },
            { q: 'Highlight a fraction equivalent to 1/2 using sixths.', denom: 6, target: 3 },
            { q: 'Highlight a fraction equivalent to 2/3 using sixths.', denom: 6, target: 4 },
            { q: 'Highlight a fraction equivalent to 1/4 using eighths.', denom: 8, target: 2 },
            { q: 'Highlight a fraction equivalent to 1/3 using twelfths.', denom: 12, target: 4 },
            { q: 'Highlight 5/8 on the eighths bar.', denom: 8, target: 5 },
            { q: 'Highlight 7/12 on the twelfths bar.', denom: 12, target: 7 }
          ];
          var p = puzzles[Math.floor(Math.random() * puzzles.length)];
          upd({ fbChallenge: p, fbFeedback: null, fbSelected: {} });
        };
        var checkFb = function() {
          if (!fbChallenge) return;
          var have = (fbSelected[fbChallenge.denom] || []).length;
          var ok = have === fbChallenge.target;
          upd({
            fbFeedback: { ok: ok,
              msg: ok ? '✅ Correct! You highlighted ' + have + '/' + fbChallenge.denom + '.'
                : '❌ You highlighted ' + have + '/' + fbChallenge.denom + ', need ' + fbChallenge.target + '/' + fbChallenge.denom + '.'
            },
            score: { correct: score.correct + (ok ? 1 : 0), total: score.total + 1 }
          });
          if (ok && soundEnabled) sfxCorrect();
          if (!ok && soundEnabled) sfxWrong();
        };

        var renderBar = function(denom) {
          var partW = fbBarWidth / denom;
          var selected = fbSelected[denom] || [];
          var parts = [];
          for (var p = 0; p < denom; p++) {
            var sel = selected.indexOf(p) >= 0;
            parts.push(h('button', {
              key: 'fbp-' + denom + '-' + p,
              onClick: function(d, pi) { return function() { toggleFbPart(d, pi); }; }(denom, p),
              'aria-label': 'Part ' + (p + 1) + ' of ' + denom + (sel ? ' (selected)' : ''),
              style: {
                width: partW + 'px',
                height: '32px',
                backgroundColor: sel ? fbColors[denom] : '#fff',
                border: '1.5px solid #0f172a',
                borderLeft: p === 0 ? '1.5px solid #0f172a' : '0.75px solid #0f172a',
                borderRight: p === denom - 1 ? '1.5px solid #0f172a' : '0.75px solid #0f172a',
                cursor: 'pointer',
                transition: 'background-color 0.15s',
                color: sel ? '#fff' : '#0f172a',
                fontSize: denom > 8 ? 8 : 10, fontWeight: 'bold'
              }
            }, denom === 1 ? '1 whole' : '1/' + denom));
          }
          var fracVal = fbFractionValue(denom);
          return h('div', { key: 'fb-row-' + denom, className: 'space-y-1' },
            h('div', { className: 'flex items-center gap-2' },
              h('span', { className: 'text-xs font-mono font-bold text-slate-700', style: { minWidth: 56 } },
                denom === 1 ? '1' : '1/' + denom
              ),
              h('div', { className: 'flex' }, parts)
            ),
            fracVal > 0 && h('p', { className: 'text-[10px] text-slate-600 ml-14' },
              'Selected: ' + (fbSelected[denom] || []).length + '/' + denom + ' = ' + fracVal.toFixed(3)
            )
          );
        };

        return h('div', { className: 'space-y-3 max-w-4xl mx-auto animate-in fade-in duration-200' },
          headerEl,
          h('div', { className: 'bg-white rounded-xl border-2 border-orange-200 p-3' },
            fbDenoms.map(function(d) { return renderBar(d); })
          ),
          h('div', { className: 'flex gap-2 justify-center flex-wrap' },
            h('button', { onClick: clearFb,
              className: 'transition-colors px-3 py-1.5 rounded text-xs font-bold bg-slate-200 text-slate-700 hover:bg-slate-300' }, __alloT('stem.manipulatives.clear_6', '↺ Clear')),
            h('button', { onClick: genFb,
              className: 'transition-colors px-3 py-1.5 rounded text-xs font-bold bg-orange-600 text-white hover:bg-orange-700' }, __alloT('stem.manipulatives.new_challenge', '🎯 New challenge'))
          ),
          fbChallenge && h('div', { className: 'bg-white rounded-xl border-2 border-orange-300 p-3' },
            h('p', { className: 'text-sm text-slate-800 mb-2' }, fbChallenge.q),
            !fbFeedback && h('button', { onClick: checkFb,
              className: 'transition-colors w-full px-3 py-2 rounded text-xs font-bold bg-orange-600 text-white hover:bg-orange-700' }, __alloT('stem.manipulatives.check_10', 'Check')),
            fbFeedback && h('div', { className: 'space-y-1' },
              h('p', { className: 'text-sm font-bold ' + (fbFeedback.ok ? 'text-green-700' : 'text-red-700') }, fbFeedback.msg),
              h('button', { onClick: genFb,
                className: 'transition-colors w-full px-3 py-1.5 rounded text-xs font-bold bg-orange-600 text-white hover:bg-orange-700' }, __alloT('stem.manipulatives.next_12', '🔄 Next'))
            )
          ),
          h('div', { className: 'bg-orange-50 rounded-lg p-3 border border-orange-100 text-xs text-orange-800' },
            __alloT('stem.manipulatives.fraction_bars_make_equivalence_visible', '💡 Fraction bars make equivalence VISIBLE: highlight 1/2 of the halves bar and 3/6 of the sixths bar — they cover the same length. Same fraction.')
          )
        );
      }

      // ═══════════════════════════════════════════════════════════════
      // ── v3.1: ALGEBRA TILES MODE ──
      // ═══════════════════════════════════════════════════════════════
      // Three tile sizes: 1 (small square), x (rectangle), x² (large square).
      // Two colors per shape: positive (red) and negative (white-bordered).
      // Model 2x + 3 or factor quadratics by arranging.
      if (manipMode === 'algebraTiles') {
        var atAdd = function(kind) {
          var n = Object.assign({}, atTiles);
          n[kind] = (n[kind] || 0) + 1;
          upd({ atTiles: n });
          if (soundEnabled) sfxClick();
        };
        var atSub = function(kind) {
          var n = Object.assign({}, atTiles);
          n[kind] = Math.max(0, (n[kind] || 0) - 1);
          upd({ atTiles: n });
          if (soundEnabled) sfxClick();
        };
        var atClear = function() { upd({ atTiles: { unit: 0, unitNeg: 0, x: 0, xNeg: 0, xSq: 0, xSqNeg: 0 } }); };
        var atZeroPairs = function() {
          var n = Object.assign({}, atTiles);
          var u = Math.min(n.unit, n.unitNeg); n.unit -= u; n.unitNeg -= u;
          var xp = Math.min(n.x, n.xNeg); n.x -= xp; n.xNeg -= xp;
          var x2p = Math.min(n.xSq, n.xSqNeg); n.xSq -= x2p; n.xSqNeg -= x2p;
          upd({ atTiles: n });
          if (soundEnabled) sfxRegroup();
        };
        // Build an expression string
        var atExpr = function() {
          var nU = (atTiles.unit || 0) - (atTiles.unitNeg || 0);
          var nX = (atTiles.x || 0) - (atTiles.xNeg || 0);
          var nX2 = (atTiles.xSq || 0) - (atTiles.xSqNeg || 0);
          var parts = [];
          if (nX2) parts.push((nX2 > 0 && parts.length ? '+ ' : (nX2 < 0 ? '− ' : '')) + (Math.abs(nX2) === 1 ? '' : Math.abs(nX2)) + 'x²');
          if (nX)  parts.push((nX > 0 && parts.length ? '+ ' : (nX < 0 ? '− ' : '')) + (Math.abs(nX) === 1 ? '' : Math.abs(nX)) + 'x');
          if (nU)  parts.push((nU > 0 && parts.length ? '+ ' : (nU < 0 ? '− ' : '')) + Math.abs(nU));
          if (parts.length === 0) parts.push('0');
          return parts.join(' ');
        };
        var atTileVisual = function(kind, color, w, ht) {
          var arr = [];
          var count = atTiles[kind] || 0;
          for (var i = 0; i < count; i++) {
            arr.push(h('button', {
              key: kind + '-' + i,
              onClick: function() { atSub(kind); },
              'aria-label': 'Remove a ' + kind + ' tile',
              title: __alloT('stem.manipulatives.click_to_remove_2', 'Click to remove'),
              style: {
                width: w + 'px', height: ht + 'px',
                backgroundColor: color,
                border: kind.indexOf('Neg') >= 0 ? '2.5px dashed #0f172a' : '2px solid #0f172a',
                borderRadius: 3, margin: 2, padding: 0, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                color: color === '#fef2f2' ? '#0f172a' : '#fff', fontWeight: 900, fontSize: kind === 'unit' || kind === 'unitNeg' ? 9 : 11,
                textShadow: color === '#fef2f2' ? 'none' : '0 1px 2px rgba(0,0,0,0.5)' // negative tiles are near-white — white labels were invisible
              }
            }, kind === 'unit' || kind === 'unitNeg' ? (kind === 'unit' ? '1' : '−1') :
               kind === 'x' || kind === 'xNeg' ? (kind === 'x' ? 'x' : '−x') :
               (kind === 'xSq' ? 'x²' : '−x²')));
          }
          return arr;
        };
        var palette = [
          { kind: 'xSq',    color: '#1e40af', w: 64, h: 64, name: __alloT('stem.manipulatives.x_square', '+x² (square)') },
          { kind: 'xSqNeg', color: '#fef2f2', w: 64, h: 64, name: __alloT('stem.manipulatives.x_square_dashed', '−x² (square, dashed)') },
          { kind: 'x',      color: '#2563eb', w: 64, h: 24, name: '+x' },
          { kind: 'xNeg',   color: '#fef2f2', w: 64, h: 24, name: '−x' },
          { kind: 'unit',   color: '#3b82f6', w: 24, h: 24, name: '+1' },
          { kind: 'unitNeg',color: '#fef2f2', w: 24, h: 24, name: '−1' }
        ];

        return h('div', { className: 'space-y-3 max-w-4xl mx-auto animate-in fade-in duration-200' },
          headerEl,
          h('div', { className: 'bg-white rounded-xl border-2 border-indigo-200 p-3' },
            h('p', { className: 'text-xs font-bold text-indigo-700 mb-2' }, __alloT('stem.manipulatives.tile_palette_click_to_add', 'Tile palette (click + to add):')),
            h('div', { className: 'grid grid-cols-3 sm:grid-cols-6 gap-2' },
              palette.map(function(p) {
                return h('div', { key: 'pal-' + p.kind, className: 'flex flex-col items-center gap-1 p-2 bg-indigo-50 rounded border border-indigo-200' },
                  h('div', { style: {
                    width: p.w + 'px', height: p.h + 'px',
                    backgroundColor: p.color,
                    border: p.kind.indexOf('Neg') >= 0 ? '2.5px dashed #0f172a' : '2px solid #0f172a',
                    borderRadius: 3,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: p.color === '#fef2f2' ? '#0f172a' : '#fff', fontWeight: 900,
                    fontSize: p.w >= 40 ? 12 : 10,
                    textShadow: p.color === '#fef2f2' ? 'none' : '0 1px 2px rgba(0,0,0,0.5)'
                  } }, p.name.split(' ')[0]),
                  h('p', { className: 'text-[10px] font-bold text-indigo-700 text-center' }, p.name),
                  h('button', { onClick: function(k) { return function() { atAdd(k); }; }(p.kind),
                    className: 'transition-colors px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-600 text-white hover:bg-indigo-700' }, __alloT('stem.manipulatives.add', '+ Add'))
                );
              })
            )
          ),
          h('div', { className: 'bg-indigo-50 rounded-xl border-2 border-indigo-200 p-3' },
            h('div', { className: 'flex items-center justify-between mb-2' },
              h('p', { className: 'text-xs font-bold text-indigo-700' }, __alloT('stem.manipulatives.workspace_expression', 'Workspace — expression: ')),
              h('span', { className: 'font-mono text-base font-black text-indigo-900' }, atExpr())
            ),
            h('div', { className: 'min-h-[80px] p-1' },
              atTileVisual('xSq', '#1e40af', 64, 64),
              atTileVisual('xSqNeg', '#fef2f2', 64, 64),
              atTileVisual('x', '#2563eb', 64, 24),
              atTileVisual('xNeg', '#fef2f2', 64, 24),
              atTileVisual('unit', '#3b82f6', 24, 24),
              atTileVisual('unitNeg', '#fef2f2', 24, 24)
            )
          ),
          h('div', { className: 'flex gap-2 justify-center flex-wrap' },
            h('button', { onClick: atClear,
              className: 'transition-colors px-3 py-1.5 rounded text-xs font-bold bg-slate-200 text-slate-700 hover:bg-slate-300' }, __alloT('stem.manipulatives.clear_7', '↺ Clear')),
            h('button', { onClick: atZeroPairs,
              className: 'transition-colors px-3 py-1.5 rounded text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700' }, __alloT('stem.manipulatives.remove_zero_pairs', '✂ Remove zero pairs'))
          ),
          h('div', { className: 'bg-indigo-50 rounded-lg p-3 border border-indigo-100 text-xs text-indigo-800' },
            __alloT('stem.manipulatives.algebra_tiles_make_abstract_algebra_ph', '💡 Algebra tiles make abstract algebra physical. A positive and a negative tile of the same shape make a "zero pair." Solid colored tiles are positive; dashed-bordered white tiles are negative. Use these to model expressions, simplify, and (for older students) factor quadratics by arranging tiles into rectangles.')
          )
        );
      }

      // Default fallback
      return h('div', { className: 'space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200' },
        headerEl,
        h('p', { className: 'text-sm text-slate-600 text-center' }, __alloT('stem.manipulatives.select_a_tool_above_to_get_started', 'Select a tool above to get started.'))
      );
    }
  });
})();
