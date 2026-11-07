// ═══════════════════════════════════════════
// stem_tool_multtable.js: Multiplication Table (deep rebuild v4, 2026-11-03)
// Tabs: Practice, Arrays & groups (predict, then build), Patterns (+ claim tests).
// Practice: named mistakes, a second try with a strategy hint before any reveal,
// fading worked examples, smart practice from factScores, a real drill of the
// missed set, grade-band fact sets, fair XP (tool-chosen, answer hidden, once
// per fact per visit, no speed rewards), keyboard grids, teacher panel.
// ═══════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

(function() {
  'use strict';
  // ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEAM Lab tools ──
  (function() {
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();

  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-multtable')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-multtable';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  // Backgrounds, dot animation, grid focus ring.
  (function() {
    if (document.getElementById('allo-multtable-v4-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-multtable-v4-css';
    st.textContent = [
      '@keyframes allo-mt-dot-in { 0% { transform: scale(0); opacity: 0; } 60% { transform: scale(1.15); } 100% { transform: scale(1); opacity: 1; } }',
      '@keyframes allo-mt-cell-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(236,72,153,0.55); } 50% { box-shadow: 0 0 0 6px rgba(236,72,153,0); } }',
      '.allo-mt-dot { animation: allo-mt-dot-in 0.22s ease-out backwards; }',
      '.allo-mt-pattern-cell { animation: allo-mt-cell-pulse 1.6s ease-in-out 2; }',
      '.allo-mt-bg-practice { background: radial-gradient(ellipse 1100px 480px at 50% -10%, rgba(236,72,153,0.10) 0%, rgba(236,72,153,0.04) 35%, rgba(255,255,255,0) 70%), linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); border-radius: 16px; padding: 10px; }',
      '.allo-mt-bg-visual   { background: radial-gradient(ellipse 1100px 480px at 50% -10%, rgba(217,119,6,0.10)  0%, rgba(217,119,6,0.04)  35%, rgba(255,255,255,0) 70%), linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); border-radius: 16px; padding: 10px; }',
      '.allo-mt-bg-patterns { background: radial-gradient(ellipse 1100px 480px at 50% -10%, rgba(99,102,241,0.10)  0%, rgba(99,102,241,0.04) 35%, rgba(255,255,255,0) 70%), linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); border-radius: 16px; padding: 10px; }',
      '[data-mt-grid] [role="gridcell"]:focus-visible { outline: 3px solid #1d4ed8; outline-offset: -3px; position: relative; z-index: 1; }',
      '[data-mt-grid] [role="gridcell"] { cursor: pointer; }',
      '[data-mt-sieve-grid] [role="gridcell"]:focus-visible { outline: 3px solid #1d4ed8; outline-offset: 1px; position: relative; z-index: 1; }',
      '[data-mt-theme="dark"] [data-mt-sieve-grid] [role="gridcell"]:focus-visible { outline-color: #fbbf24; }',
      '[data-mt-theme="hc"] [data-mt-sieve-grid] [role="gridcell"]:focus-visible { outline-color: #00ffff; }',
      // WCAG 1.4.3 high contrast: text panels/buttons drop their light or mid-tone gradients.
      '.theme-contrast [data-stem-tool-shell="multtable"] :is(.allo-mt-bg-practice, .allo-mt-bg-visual, .allo-mt-bg-patterns, .from-amber-50, .from-purple-50, .from-pink-600.to-rose-600, .from-amber-700.to-orange-700) { background-image: none !important; background-color: #000 !important; }',
      // High contrast (ctx.isContrast sets data-mt-hc on the tool root): light cards go black, dark ink goes white,
      // whether or not the hub's own remap stylesheet is present. Dark chips with white ink keep their colours.
      '[data-mt-hc="true"] :is(.bg-white, .bg-white\\/80, .bg-slate-50, .bg-slate-100, .bg-slate-200, .bg-amber-50, .bg-emerald-50, .bg-fuchsia-50, .bg-indigo-50, .bg-orange-50, .bg-pink-50, .bg-red-50, .bg-sky-50, .bg-violet-50, .bg-emerald-100, .bg-pink-100, .bg-purple-100, .bg-violet-100, .bg-amber-200, .bg-amber-400, [class~="from-amber-50"], [class~="from-purple-50"]) { background-color: #000000 !important; background-image: none !important; }',
      '[data-mt-hc="true"] :is(.text-amber-800, .text-amber-900, .text-emerald-800, .text-emerald-900, .text-fuchsia-800, .text-fuchsia-900, .text-green-800, .text-green-900, .text-indigo-800, .text-indigo-900, .text-orange-800, .text-pink-800, .text-pink-900, .text-purple-700, .text-purple-800, .text-purple-900, .text-red-800, .text-red-900, .text-rose-800, .text-rose-900, .text-sky-900, .text-slate-700, .text-slate-800, .text-slate-900, .text-violet-800, .text-violet-900) { color: #ffffff !important; }',
      '[data-mt-hc="true"] :is(.border, .border-2):not(.border-white\\/10):not(.border-white\\/15):not(.border-white\\/20):not([class*="border-pink-300/"]) { border-color: #ffffff !important; }',
      '[data-mt-hc="true"] [data-mt-grid] td:is(.bg-pink-50, .bg-indigo-50, .bg-emerald-100) { color: #ffff00 !important; }',
      '[data-mt-hc="true"] [data-mt-grid] td.bg-amber-400 { outline-color: #ffff00 !important; }',
      '[data-mt-hc="true"] [role="tab"][aria-selected="true"] { outline: 3px solid #ffff00; outline-offset: -3px; }',
      '@media (prefers-reduced-motion: reduce) { .allo-mt-dot, .allo-mt-pattern-cell { animation: none !important; } }'
    ].join('\n');
    document.head.appendChild(st);
  })();


  // Quest labels are read by the hub outside render: getters use the last render's ctx.t.
  var __alloCtx_multtable = null;
  var __alloT = function(k, fb) {
    var v; try { v = (__alloCtx_multtable && typeof __alloCtx_multtable.t === 'function') ? __alloCtx_multtable.t(k, fb) : null; } catch (e) { v = null; }
    return (typeof v === 'string' && v && v !== k) ? v : fb;
  };

  // ── Difficulty presets ──
  var DIFFICULTY = {
    easy:   { min: 2, max: 5,  label: 'Easy' },
    medium: { min: 2, max: 9,  label: 'Medium' },
    hard:   { min: 2, max: 12, label: 'Hard' },
    tens:   { min: 2, max: 10, label: 'All to 10' }
  };
  // Grade-band fact sets. K-2: arrays with 2s, 5s and 10s. Grades 3-4: all
  // facts to 10 (Hard reaches 12). Grade 5+: division and missing factors.
  var FOUNDATION_FACTORS = [2, 5, 10];
  var BAND_PRESETS = {
    early:  { difficulty: 'foundations', quizMode: 'mult',  smartPool: 'foundations' },
    core:   { difficulty: 'tens',        quizMode: 'mult',  smartPool: 'tens' },
    extend: { difficulty: 'hard',        quizMode: 'mixed', smartPool: 'hard' }
  };
  var QUIZ_MODE_IDS = ['mult', 'div', 'missing', 'equations', 'derive', 'mixed'];
  var DIFFICULTY_IDS = ['foundations', 'tens', 'easy', 'medium', 'hard', 'adaptive', 'tricky'];
  // 'k2' or 'upper' from a grade written any way ("K", "Pre-K", "2nd Grade", "Grade 3", "third", "9-12");
  // '' when it cannot be told, including a span across grade 3 such as "K-5".
  var GRADE_WORDS = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12 };
  function gradeTierFromText(gradeLevel) {
    if (typeof gradeLevel !== 'string') return '';
    var g = gradeLevel.toLowerCase();
    if (/college|graduate|university|adult/.test(g)) return 'upper';
    g = g.replace(/\bpre-?\s?k(indergarten)?\b|\bpreschool\b|\btk\b|\bkinder(garten)?\b/g, 'k')
      .replace(/\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth)\b/g, function(w) { return GRADE_WORDS[w]; })
      .replace(/(\d)(st|nd|rd|th)\b/g, '$1');
    var marks = g.match(/\bk\b|\b\d{1,2}\b/g);
    if (!marks) return '';
    var nums = marks.map(function(m) { return m === 'k' ? 0 : Number(m); });
    var lo = Math.min.apply(null, nums), hi = Math.max.apply(null, nums);
    if (hi > 12) return '';
    return hi <= 2 ? 'k2' : lo >= 3 ? 'upper' : '';
  }
  // Whether counting dots before a prediction suits this learner: K-2 only. A grade that cannot be
  // told is treated as grade 3+, like resolveBand's 'core': the build is one press away for anyone.
  function gradeIsK2(gradeBand, gradeLevel) {
    var tier = gradeTierFromText(gradeLevel);
    return tier ? tier === 'k2' : gradeBand === 'k2';
  }
  // gradeLevel ("3rd Grade") is finer than the host's gradeBand ('k2'|'g35'|'g68'|'g912').
  function resolveBand(gradeBand, gradeLevel) {
    if (gradeTierFromText(gradeLevel) === 'k2') return 'early';
    var g = String(gradeLevel || '').toLowerCase();
    if (/\b(3rd|4th)\b/.test(g)) return 'core';
    if (/kindergarten|pre-?k|\b(1st|2nd)\b/.test(g)) return 'early';
    if (/\b(5th|6th|7th|8th|9th|10th|11th|12th)\b/.test(g) || /college|graduate|adult/.test(g)) return 'extend';
    if (gradeBand === 'k2') return 'early';
    if (gradeBand === 'g35') return 'core';
    if (gradeBand === 'g68' || gradeBand === 'g912') return 'extend';
    return 'core';
  }

  // ── "Start here" path and tab order per band ──
  // The band's core activities come first; every tab stays reachable.
  var TAB_ORDER = {
    early:  ['visual', 'practice', 'patterns', 'fluency', 'words', 'factors'],
    core:   ['practice', 'patterns', 'words', 'fluency', 'visual', 'factors'],
    extend: ['practice', 'factors', 'words', 'fluency', 'patterns', 'visual']
  };
  var MODE_COUNT_IDS = ['mult', 'div', 'missing', 'divmiss', 'derive'];
  function pathCount(v) { var n = Number(v); return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0; }
  function pathKeys(o) { return o && typeof o === 'object' && !Array.isArray(o) ? Object.keys(o).length : 0; }
  // Distinct facts of a set right on a first try at least once (factScores.correct counts first tries only).
  function poolSolved(scores, setId) {
    var s = scores && typeof scores === 'object' ? scores : {};
    return factPool(setId).filter(function(k) { return s[k] && Number(s[k].correct) > 0; }).length;
  }
  // Ticks come only from saved progress keys in _multExt, so they survive a reload.
  function learningPath(band, ext) {
    ext = ext && typeof ext === 'object' ? ext : {};
    var mc = ext.modeCorrect && typeof ext.modeCorrect === 'object' ? ext.modeCorrect : {};
    var pe = ext.patternsExplored && typeof ext.patternsExplored === 'object' ? ext.patternsExplored : {};
    var steps;
    if (band === 'early') steps = [
      { id: 'arrays', tab: 'visual', have: pathKeys(ext.visualExplored), need: 3 },
      { id: 'skipPatterns', tab: 'patterns', have: ['doubles', 'fives', 'tens'].filter(function(p) { return !!pe[p]; }).length, need: 3 },
      { id: 'foundations', tab: 'practice', setup: { quizMode: 'mult', difficulty: 'foundations' }, have: poolSolved(ext.factScores, 'foundations'), need: 10 },
      { id: 'climb', tab: 'fluency', have: pathCount(ext.fluencyRounds), need: 1 }
    ];
    else if (band === 'extend') steps = [
      { id: 'division', tab: 'practice', setup: { quizMode: 'div', difficulty: 'hard' }, have: pathCount(mc.div), need: 10 },
      { id: 'missing', tab: 'practice', setup: { quizMode: 'equations', difficulty: 'hard' }, have: pathCount(mc.missing) + pathCount(mc.divmiss), need: 8 },
      { id: 'primes', tab: 'factors', have: pathCount(ext.primeCorrect), need: 5 },
      { id: 'sieve', tab: 'factors', have: pathCount(ext.sieveDone), need: 1 }
    ];
    else steps = [
      { id: 'strategies', tab: 'practice', setup: { quizMode: 'derive', difficulty: 'tens' }, have: pathCount(mc.derive), need: 5 },
      { id: 'allFacts', tab: 'practice', setup: { quizMode: 'mult', difficulty: 'tens' }, have: poolSolved(ext.factScores, 'tens'), need: 20 },
      { id: 'words', tab: 'words', have: pathCount(ext.wordSolved), need: 5 },
      { id: 'climb', tab: 'fluency', have: pathCount(ext.fluencyRounds), need: 1 }
    ];
    var next = -1;
    steps.forEach(function(s, i) { s.have = Math.min(s.have, s.need); s.done = s.have >= s.need; if (!s.done && next === -1) next = i; });
    return { steps: steps, next: next };
  }

  // ── Tricky Middle: the 15 commonly-hardest facts ──
  // These are the facts that need real recall (everything else has a rule:
  // 1s identity, 2s doubles, 5s end-in-0/5, 9s digit-sum, 10s add-zero, 11s repeat).
  // Pairs are unordered; quiz will randomize commutative direction.
  var TRICKY_15 = [
    [6,7], [6,8], [6,9],
    [7,7], [7,8], [7,9],
    [8,8], [8,9],
    [9,9],
    [6,11], [6,12],
    [7,11], [7,12],
    [8,11], [8,12]
  ];

  // ── Memory tricks for the trickiest facts (and a few peripherals) ──
  // Keyed by min-max for commutative dedupe ("6x7" == "7x6").
  function tkey(a, b) { return Math.min(a,b) + 'x' + Math.max(a,b); }
  function parseWholeAnswer(value) {
    var text = String(value == null ? '' : value).trim();
    if (!text) return null;
    var parsed = Number(text);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }
  function missedFactMode(missed) {
    if (missed && (missed.mode === 'mult' || missed.mode === 'div' || missed.mode === 'missing')) return missed.mode;
    if (missed && missed.mode === 'derive') return 'mult';
    if (missed && missed.mode === 'divmiss' && (missed.form === 'dividend' || missed.form === 'divisor')) return 'divmiss';
    var a = Number(missed && missed.a), b = Number(missed && missed.b), answer = Number(missed && missed.answer);
    return Number.isFinite(a) && Number.isFinite(b) && Number.isFinite(answer) &&
      answer !== a * b && (answer === a || answer === b) ? 'div' : 'mult';
  }
  function missedFactDivisor(missed) {
    var a = Number(missed && missed.a), b = Number(missed && missed.b), divisor = Number(missed && missed.divisor);
    if (divisor === a || divisor === b) return divisor;
    var answer = Number(missed && missed.answer);
    if (answer === a) return b;
    if (answer === b) return a;
    return null;
  }
  // Missing-factor facts ("7 × ? = 56") remember which factor was shown.
  function missedFactKnown(missed) {
    var a = Number(missed && missed.a), b = Number(missed && missed.b), known = Number(missed && missed.known);
    return (known === a || known === b) ? known : a;
  }
  function missedFactIdentity(missed) {
    var mode = missedFactMode(missed);
    return mode + ':' + tkey(Number(missed && missed.a), Number(missed && missed.b)) +
      (mode === 'div' ? ':by-' + missedFactDivisor(missed) : mode === 'missing' ? ':known-' + missedFactKnown(missed)
        : mode === 'divmiss' ? ':by-' + missedFactDivisor(missed) + ':' + missed.form : '');
  }
  function formatMissedFact(missed) {
    var a = Number(missed && missed.a), b = Number(missed && missed.b);
    var mode = missedFactMode(missed);
    if (mode === 'divmiss') {
      var dv = missedFactDivisor(missed);
      if (dv == null) dv = a;
      return (a * b) + ' ÷ ' + dv + ' = ' + (dv === a ? b : a);
    }
    if (mode === 'div') {
      var divisor = missedFactDivisor(missed);
      if (divisor != null) return (a * b) + ' ÷ ' + divisor + ' = ' + (divisor === a ? b : a);
    }
    if (mode === 'missing') return a + ' × ' + b + ' = ' + (a * b);
    return a + ' × ' + b + ' = ' + (a * b);
  }
  // The answer a challenge expects: product, quotient or missing factor.
  function factAnswer(ch) {
    if (!ch) return null;
    var a = Number(ch.a), b = Number(ch.b);
    if (ch.mode === 'div') return Number(ch.divisor) === a ? b : a;
    if (ch.mode === 'missing') return Number(ch.known) === a ? b : a;
    // 3.OA.4 division with the unknown elsewhere: "? ÷ d = q" or "p ÷ ? = q".
    if (ch.mode === 'divmiss') return ch.form === 'divisor' ? Number(ch.divisor) : a * b;
    return a * b;
  }
  // The quotient shown in a "divmiss" equation (the factor that is not the divisor).
  function divmissQuotient(ch) { var a = Number(ch.a), b = Number(ch.b); return Number(ch.divisor) === a ? b : a; }
  var MEMORY_TRICKS = {
    '6x7':  { trick: '"6 times 7 is 42." A jingle works here.',     icon: '🎵' },
    '6x8':  { trick: '6×8 = 48. Tip: 6×8 is 6×(10−2) = 60−12 = 48.', icon: '✂️' },
    '6x9':  { trick: '6×9 = 54. Digits 5+4=9, and 5 is one less than 6.', icon: '9️⃣' },
    '7x7':  { trick: '7×7 = 49. "Sevens lucky, forty-nine."',        icon: '⭐' },
    '7x8':  { trick: '7×8 = 56. "5, 6, 7, 8 — fifty-six = seven times eight." The digits march in order.', icon: '🎯' },
    '7x9':  { trick: '7×9 = 63. Digits 6+3=9, and 6 is one less than 7.', icon: '9️⃣' },
    '8x8':  { trick: '8×8 = 64. "I ate and ate till I was sick on the floor — 8×8 is 64."', icon: '🎵' },
    '8x9':  { trick: '8×9 = 72. Digits 7+2=9, and 7 is one less than 8.', icon: '9️⃣' },
    '9x9':  { trick: '9×9 = 81. Digits 8+1=9, and 8 is one less than 9. All 9s × 1-10 work this way.', icon: '9️⃣' },
    '6x11': { trick: '6×11 = 66. For 11 × 1-9, write the digit twice: 6 and 6.', icon: '1️⃣1️⃣' },
    '7x11': { trick: '7×11 = 77. For 11 × 1-9, write the digit twice: 7 and 7.', icon: '1️⃣1️⃣' },
    '8x11': { trick: '8×11 = 88. For 11 × 1-9, write the digit twice: 8 and 8.', icon: '1️⃣1️⃣' },
    '6x12': { trick: '6×12 = 72. Split: 6×12 = 6×10 + 6×2 = 60 + 12 = 72.', icon: '✂️' },
    '7x12': { trick: '7×12 = 84. Split: 7×12 = 7×10 + 7×2 = 70 + 14 = 84.', icon: '✂️' },
    '8x12': { trick: '8×12 = 96. Split: 8×12 = 8×10 + 8×2 = 80 + 16 = 96.', icon: '✂️' },
    '9x11': { trick: '9×11 = 99. 11s repeat the digit (9 and 9), and 99 is one less than 100.', icon: '🎯' },
    '9x12': { trick: '9×12 = 108. Split: 9×12 = 9×10 + 9×2 = 90 + 18 = 108.', icon: '✂️' },
    '11x12':{ trick: '11×12 = 132. Split: 11×12 = 11×10 + 11×2 = 110 + 22 = 132.', icon: '✂️' },
    '12x12':{ trick: '12×12 = 144. A gross. Worth memorizing.',     icon: '⭐' }
  };

  // ── Adaptive engine ──
  function getAdaptiveRange(history) {
    if (!history || history.length < 3) return DIFFICULTY.medium;
    var last5 = history.slice(-5);
    var last3 = history.slice(-3);
    var wrongCount = last5.filter(function(h) { return !h.correct; }).length;
    var streak3 = last3.every(function(h) { return h.correct; });
    if (streak3 && history.length >= 5) return DIFFICULTY.hard;
    if (wrongCount >= 2) return DIFFICULTY.easy;
    return DIFFICULTY.medium;
  }

  function pickFactors(difficulty, adaptiveHistory) {
    // Tricky 15: pick from the curated hard-facts set, randomizing commutative direction
    if (difficulty === 'tricky') {
      var pair = TRICKY_15[Math.floor(Math.random() * TRICKY_15.length)];
      if (Math.random() < 0.5) return { a: pair[0], b: pair[1] };
      return { a: pair[1], b: pair[0] };
    }
    // 2s, 5s and 10s (grades K-2): one anchor factor, the other 1-10.
    if (difficulty === 'foundations') {
      var f = FOUNDATION_FACTORS[Math.floor(Math.random() * FOUNDATION_FACTORS.length)];
      var other = 1 + Math.floor(Math.random() * 10);
      return Math.random() < 0.5 ? { a: f, b: other } : { a: other, b: f };
    }
    var range;
    if (difficulty === 'adaptive') {
      range = getAdaptiveRange(adaptiveHistory);
    } else {
      range = DIFFICULTY[difficulty] || DIFFICULTY.hard;
    }
    var span = range.max - range.min + 1;
    var a = range.min + Math.floor(Math.random() * span);
    var b = range.min + Math.floor(Math.random() * span);
    return { a: a, b: b };
  }

  // Tricky 15 membership check (commutative)
  function isTrickyFact(a, b) {
    var key = tkey(a, b);
    return TRICKY_15.some(function(p) { return tkey(p[0], p[1]) === key; });
  }

  // Every fact (as a commutative key) in a practice set.
  function factPool(setId) {
    var out = [];
    if (setId === 'foundations') {
      FOUNDATION_FACTORS.forEach(function(f) {
        for (var x = 1; x <= 10; x++) { var k = tkey(f, x); if (out.indexOf(k) === -1) out.push(k); }
      });
      return out;
    }
    if (setId === 'tricky') return TRICKY_15.map(function(p) { return tkey(p[0], p[1]); });
    var r = DIFFICULTY[setId] || DIFFICULTY.hard;
    for (var a = r.min; a <= r.max; a++) for (var b = a; b <= r.max; b++) out.push(a + 'x' + b);
    return out;
  }
  // Smart practice weight: weak facts and missed facts come up far more often,
  // mastered ones rarely, and the last few facts are held back.
  function factWeight(key, factScores, focus, recent) {
    var s = factScores && factScores[key];
    var attempts = s ? Number(s.attempts) : 0, correct = s ? Number(s.correct) : 0;
    var w;
    if (!(attempts > 0)) w = 2;
    else {
      var acc = correct / attempts;
      if (acc >= 0.85 && attempts >= 2) w = 0.5;
      else if (acc >= 0.6) w = 2.5;
      else w = 4;
    }
    if (focus && focus[key]) w += 4;
    if (recent && recent.indexOf(key) !== -1) w *= 0.1;
    return w;
  }
  function pickAdaptiveFact(pool, factScores, focus, recent, rng) {
    rng = rng || Math.random;
    if (!pool || !pool.length) pool = factPool('medium');
    var weights = pool.map(function(k) { return factWeight(k, factScores, focus, recent); });
    var total = weights.reduce(function(s, w) { return s + w; }, 0);
    var x = rng() * total, i = 0;
    for (; i < pool.length - 1; i++) { x -= weights[i]; if (x < 0) break; }
    var parts = pool[i].split('x').map(Number);
    return rng() < 0.5 ? { a: parts[0], b: parts[1], key: pool[i] } : { a: parts[1], b: parts[0], key: pool[i] };
  }

  // ── Strategy hints (never contain the answer) ──
  // The factor with the friendliest rule decides the strategy.
  var STRATEGY_ORDER = [1, 10, 2, 11, 5, 9, 4, 3, 6, 7, 12, 8];
  function strategyFor(a, b) {
    for (var i = 0; i < STRATEGY_ORDER.length; i++) {
      var f = STRATEGY_ORDER[i];
      if (f === 11 && !((a === 11 && b <= 9) || (b === 11 && a <= 9))) continue;
      if (a === f || b === f) return { id: 'x' + f, f: f, n: a === f ? b : a };
    }
    if (a === 11 || b === 11) return { id: 'x11split', f: 11, n: a === 11 ? b : a };
    return { id: 'x7', f: a, n: b };
  }
  // Which fact a learner who already knows 2s, 5s, 10s and squares can start from.
  function deriveAnchor(a, b, rng) {
    rng = rng || Math.random;
    var options = [];
    [[a, b], [b, a]].forEach(function(pair) {
      var keep = pair[0], vary = pair[1];
      [2, 5, 10].forEach(function(n) {
        var d = Math.abs(vary - n);
        if (d >= 1 && d <= 2) options.push({ keep: keep, vary: vary, anchor: n });
      });
      if (Math.abs(keep - vary) === 1) options.push({ keep: keep, vary: vary, anchor: keep });
    });
    if (!options.length) options.push({ keep: a, vary: b, anchor: b > 1 ? b - 1 : b + 1 });
    return options[Math.floor(rng() * options.length) % options.length];
  }
  // "Facts I can use": true relations around a × b (values included; shown
  // only once the answer is known or the learner has built the array).
  function derivedFacts(a, b) {
    var p = a * b, out = [];
    if (a !== b) out.push({ id: 'twin', a: a, b: b, p: p });
    if (b > 1) out.push({ id: 'addGroup', a: a, b: b, b1: b - 1, k: a * (b - 1), p: p });
    if (b < 12) out.push({ id: 'removeGroup', a: a, b: b, b1: b + 1, k: a * (b + 1), p: p });
    if (b > 5 && b !== 10) {
      var s1 = b > 10 ? 10 : 5, s2 = b - s1;
      out.push({ id: 'split', a: a, b: b, s1: s1, s2: s2, k1: a * s1, k2: a * s2, p: p });
    }
    if (b % 2 === 0 && b >= 4) out.push({ id: 'double', a: a, b: b, half: b / 2, k: a * b / 2, p: p });
    return out;
  }
  function digitsSwapped(x, y) {
    if (x < 10 || y < 10) return false;
    var sx = String(x), sy = String(y);
    return sx.length === sy.length && sx !== sy && sx.split('').reverse().join('') === sy;
  }
  function neighbourFact(a, b, given) {
    var c = [[a, b - 1, a], [a, b + 1, a], [a - 1, b, b], [a + 1, b, b]];
    for (var i = 0; i < c.length; i++) {
      if (c[i][0] >= 1 && c[i][1] >= 1 && c[i][0] * c[i][1] === given) return { x: c[i][0], y: c[i][1], g: c[i][2] };
    }
    return null;
  }
  // Name the mistake. Returns null for a right answer.
  function diagnoseMistake(ch, given) {
    if (!ch || given == null) return null;
    var a = Number(ch.a), b = Number(ch.b), p = a * b;
    var right = factAnswer(ch);
    if (given === right) return null;
    var res = function(kind, extra) { var o = { kind: kind, given: given }; for (var k in (extra || {})) o[k] = extra[k]; return o; };
    if (ch.mode === 'divmiss') {
      var dd = Number(ch.divisor), q = divmissQuotient(ch), x = { d: dd, q: q, p: p };
      if (ch.form === 'divisor') {
        // p ÷ ? = q: the missing number is the divisor.
        if (given === q) return res('quotientEcho', x);
        if (given === p) return res('product', x);
        if (given === p - q) return res('subtracted', x);
        if (Math.abs(given - right) === 1) return res('offByOneDivisor', x);
        return res('other', x);
      }
      // ? ÷ d = q: the missing number is the dividend, d × q.
      if (given === q) return res('quotientEcho', x);
      if (given === dd) return res('divisorEcho', x);
      if (given === dd + q) return res('added', x);
      if ((q % dd === 0 && given === q / dd) || (dd % q === 0 && given === dd / q)) return res('dividedInstead', x);
      if (Math.abs(given - p) === dd || Math.abs(given - p) === q) return res('oneGroupOff', x);
      if (digitsSwapped(given, p)) return res('swapped', x);
      if (Math.abs(given - p) <= 2) return res('close', x);
      return res('other', x);
    }
    if (ch.mode === 'div' || ch.mode === 'missing') {
      var d = ch.mode === 'div' ? Number(ch.divisor) : Number(ch.known);
      if (given === p) return res('product', { d: d, p: p });
      if (given === d) return res('divisorEcho', { d: d, p: p });
      if (given === p - d) return res('subtracted', { d: d, p: p });
      if (given === p + d) return res('added', { d: d, p: p });
      if (Math.abs(given - right) === 1) return res('offByOne', { d: d, p: p });
      if (digitsSwapped(given, right)) return res('swapped', { d: d, p: p });
      return res('other', { d: d, p: p });
    }
    if (given === a + b) return res('added', { a: a, b: b });
    if (ch.mode === 'derive' && given === a * Number(ch.anchor)) return res('anchorEcho', { a: a, b: b, n: Number(ch.anchor), k: a * Number(ch.anchor) });
    if (digitsSwapped(given, p)) return res('swapped', { a: a, b: b });
    var nb = neighbourFact(a, b, given);
    if (nb) return res('neighbour', { a: a, b: b, x: nb.x, y: nb.y, g: nb.g });
    if ((a === 1 || b === 1) && (given === 1 || given === 0)) return res('identity', { a: a, b: b });
    if (Math.abs(given - p) <= 2) return res('close', { a: a, b: b });
    return res('other', { a: a, b: b });
  }

  // ── Pattern claims (claim, evidence, reasoning) ──
  function digitSum(n) { return String(n).split('').reduce(function(s, d) { return s + Number(d); }, 0); }
  var PATTERN_CLAIMS = [
    { id: 'fives_end', isTrue: true, inGroup: function(a, b) { return a === 5 || b === 5; }, holds: function(a, b) { var u = (a * b) % 10; return u === 0 || u === 5; } },
    { id: 'nines_sum', isTrue: false, inGroup: function(a, b) { return a === 9 || b === 9; }, holds: function(a, b) { return digitSum(a * b) === 9; } },
    { id: 'squares_odd', isTrue: false, inGroup: function(a, b) { return a === b; }, holds: function(a, b) { return (a * b) % 2 === 1; } },
    { id: 'fours_even', isTrue: true, inGroup: function(a, b) { return a === 4 || b === 4; }, holds: function(a, b) { return (a * b) % 2 === 0; } },
    { id: 'elevens_repeat', isTrue: false, inGroup: function(a, b) { return a === 11 || b === 11; }, holds: function(a, b) { var s = String(a * b); return s.length === 2 && s[0] === s[1]; } }
  ];

  // ── Factors, multiples and primes (4.OA.4) ──
  function factorPairs(n) {
    n = Math.floor(Number(n));
    var out = [];
    if (!(n >= 1)) return out;
    for (var w = 1; w * w <= n; w++) if (n % w === 0) out.push([w, n / w]);
    return out;
  }
  function factorsOf(n) {
    var list = [];
    factorPairs(n).forEach(function(pr) { if (list.indexOf(pr[0]) === -1) list.push(pr[0]); if (list.indexOf(pr[1]) === -1) list.push(pr[1]); });
    return list.sort(function(x, y) { return x - y; });
  }
  function primeStatus(n) {
    if (n === 1) return 'neither';
    return factorsOf(n).length === 2 ? 'prime' : 'composite';
  }
  // Widths worth testing for factor pairs: w × w must not pass n.
  function widthLimit(n) { var w = 1; while ((w + 1) * (w + 1) <= n) w++; return w; }
  var DETECTIVE_MAX = { early: 30, core: 50, extend: 100 };
  // Name the mistake in a prime / composite / neither claim; null when right.
  function diagnosePrimeClaim(n, claim) {
    var truth = primeStatus(n);
    if (claim === truth) return null;
    var s = widthLimit(n);
    if (n === 1) return { kind: claim === 'prime' ? 'onePrime' : 'oneComposite', n: 1, s: s };
    if (claim === 'neither') return { kind: 'neitherOnlyOne', n: n, s: s };
    if (truth === 'prime') return { kind: n === 2 ? 'twoEven' : 'primeHasPair', n: n, s: s };
    return { kind: n % 2 === 1 ? 'oddPrime' : 'evenPrime', n: n, s: s };
  }
  function pickFrom(list, rng) { return list[Math.floor(rng() * list.length) % list.length]; }
  // "Number detective" items: classify a number, compare factor counts, or test a multiple.
  function pickPrimeItem(max, rng) {
    var r = rng(), pool = [];
    if (r < 0.1) return { type: 'prime', n: 1 };
    for (var n = 2; n <= max; n++) {
      var st = primeStatus(n);
      if (r < 0.45 ? (st === 'composite' && n % 2 === 1) : r < 0.8 ? st === 'prime' : n % 2 === 0) pool.push(n);
    }
    return { type: 'prime', n: pickFrom(pool, rng) };
  }
  function pickMoreItem(max, rng) {
    // Half the time the bigger number has FEWER factors (the "big number" trap).
    var wantTrap = rng() < 0.5;
    for (var i = 0; i < 400; i++) {
      var x = 2 + Math.floor(rng() * (max - 1)), y = 2 + Math.floor(rng() * (max - 1));
      if (x === y) continue;
      var cx = factorsOf(x).length, cy = factorsOf(y).length;
      if (cx === cy) continue;
      var big = Math.max(x, y), small = Math.min(x, y);
      if ((factorsOf(big).length < factorsOf(small).length) !== wantTrap) continue;
      return { type: 'more', x: x, y: y, answer: cx > cy ? x : y };
    }
    return { type: 'more', x: 12, y: 13, answer: 12 };
  }
  function pickMultipleItem(max, rng) {
    var r = rng(), d = 2 + Math.floor(rng() * 8);
    var inner = factorsOf(d).filter(function(f) { return f > 1 && f < d; });
    // Trap: is a FACTOR of d a multiple of d?
    if (r < 0.15 && inner.length) return { type: 'multiple', n: pickFrom(inner, rng), d: d, yes: false };
    var kmax = Math.floor(max / d);
    if (r < 0.6 && kmax >= 2) { var k = 2 + Math.floor(rng() * (kmax - 1)); return { type: 'multiple', n: d * k, d: d, yes: true }; }
    for (var i = 0; i < 200; i++) {
      var n = d + 1 + Math.floor(rng() * Math.max(1, max - d));
      if (n % d !== 0) return { type: 'multiple', n: n, d: d, yes: false };
    }
    return { type: 'multiple', n: d + 1, d: d, yes: false };
  }
  function pickDetectiveItem(band, rng) {
    rng = rng || Math.random;
    var max = DETECTIVE_MAX[band] || 50, r = rng();
    var item = r < 0.5 ? pickPrimeItem(max, rng) : r < 0.75 ? pickMoreItem(max, rng) : pickMultipleItem(max, rng);
    item.id = item.type + ':' + (item.type === 'prime' ? item.n : item.type === 'more' ? Math.min(item.x, item.y) + '-' + Math.max(item.x, item.y) : item.n + '/' + item.d);
    return item;
  }
  function detectiveAnswer(item) {
    if (!item) return null;
    if (item.type === 'prime') return primeStatus(item.n);
    if (item.type === 'more') return item.answer;
    return Number(item.n) % Number(item.d) === 0 ? 'yes' : 'no';
  }
  function diagnoseDetective(item, choice) {
    if (!item || choice == null || choice === detectiveAnswer(item)) return null;
    if (item.type === 'prime') return diagnosePrimeClaim(item.n, choice);
    if (item.type === 'more') {
      var big = Math.max(item.x, item.y);
      return { kind: Number(choice) === big ? 'biggerMore' : 'countAgain', x: item.x, y: item.y };
    }
    var n = Number(item.n), d = Number(item.d);
    if (choice === 'yes' && n < d && d % n === 0) return { kind: 'factorNotMultiple', n: n, d: d };
    return { kind: choice === 'yes' ? 'notAMultiple' : 'missedMultiple', n: n, d: d };
  }

  // ── Sieve of Eratosthenes: a pure reducer the grid drives ──
  function sieveInit(N) { return { n: N, crossed: {}, primes: {}, phase: 'one', p: null, hits: 0, need: 0, done: false }; }
  function sieveNext(s) { for (var i = 2; i <= s.n; i++) if (!s.crossed[i] && !s.primes[i]) return i; return null; }
  function sieveMultiplesLeft(s, p) { var out = []; for (var m = 2 * p; m <= s.n; m += p) if (!s.crossed[m]) out.push(m); return out; }
  function smallestFactor(n) { for (var f = 2; f * f <= n; f++) if (n % f === 0) return f; return n; }
  function sieveCopy(s) { return Object.assign({}, s, { crossed: Object.assign({}, s.crossed), primes: Object.assign({}, s.primes) }); }
  function sieveFinish(s) {
    for (var i = 2; i <= s.n; i++) if (!s.crossed[i]) s.primes[i] = true;
    s.phase = 'done'; s.done = true; s.p = null;
    return s;
  }
  // Returns { s: next state, fb: { kind, ... } } and never mutates the input.
  function sieveAct(state, act) {
    var s = sieveCopy(state), fb = null, n = Number(act && act.n);
    if (act.type === 'one') {
      if (s.phase !== 'one') return { s: s, fb: null };
      if (act.choice === 'prime') return { s: s, fb: { kind: 'onePrime' } };
      s.crossed[1] = true; s.phase = 'pick';
      return { s: s, fb: { kind: 'oneCrossed' } };
    }
    if (act.type === 'predict') {
      if (s.phase !== 'predict') return { s: s, fb: null };
      var left = sieveMultiplesLeft(s, s.p);
      var truth = left.length > 0;
      if (!!act.yes !== truth) return { s: s, fb: { kind: truth ? 'predictMissed' : 'predictNoNew', p: s.p, sq: s.p * s.p, n: s.n } };
      if (truth) { s.phase = 'cross'; s.hits = 0; s.need = left.length; return { s: s, fb: { kind: 'predictRight', p: s.p, sq: s.p * s.p } }; }
      var p0 = s.p;
      sieveFinish(s);
      return { s: s, fb: { kind: 'finished', p: p0, sq: p0 * p0, n: s.n, count: Object.keys(s.primes).length } };
    }
    if (act.type === 'finishP') {
      if (s.phase !== 'cross' || s.hits < Math.min(3, s.need)) return { s: s, fb: null };
      var rest = sieveMultiplesLeft(s, s.p);
      rest.forEach(function(m) { s.crossed[m] = true; });
      var pDone = s.p;
      s.phase = 'pick';
      return { s: s, fb: { kind: 'autoCrossed', p: pDone, count: rest.length } };
    }
    if (act.type !== 'cell' || !(n >= 1 && n <= s.n)) return { s: s, fb: null };
    if (s.phase === 'one') return { s: s, fb: { kind: 'oneFirst' } };
    if (s.phase === 'done') return { s: s, fb: { kind: s.primes[n] ? 'isPrime' : 'isCrossed', n: n, f: smallestFactor(n) } };
    if (s.phase === 'predict') return { s: s, fb: { kind: 'predictFirst', p: s.p } };
    if (s.phase === 'pick') {
      var next = sieveNext(s);
      if (n === next) { s.primes[n] = true; s.p = n; s.phase = 'predict'; return { s: s, fb: { kind: 'circled', n: n } }; }
      if (s.crossed[n]) return { s: s, fb: { kind: 'alreadyCrossed', n: n } };
      if (s.primes[n]) return { s: s, fb: { kind: 'alreadyCircled', n: n } };
      return { s: s, fb: { kind: 'notSmallest', n: n } };
    }
    // phase 'cross'
    var p = s.p;
    if (n === p) return { s: s, fb: { kind: 'keepPrime', p: p } };
    if (n % p === 0 && n > p) {
      // Crossed in this pass (its smallest factor is p) or in an earlier one (a smaller prime).
      if (s.crossed[n]) { var f0 = smallestFactor(n); return { s: s, fb: f0 === p ? { kind: 'alreadyCrossed', n: n } : { kind: 'alsoMultiple', n: n, p: p, f: f0 } }; }
      s.crossed[n] = true; s.hits += 1;
      if (!sieveMultiplesLeft(s, p).length) { s.phase = 'pick'; return { s: s, fb: { kind: 'crossedLast', n: n, p: p, k: n / p } }; }
      return { s: s, fb: { kind: 'crossed', n: n, p: p, k: n / p } };
    }
    if (s.primes[n]) return { s: s, fb: { kind: 'circledNotMultiple', n: n, p: p } };
    if (s.crossed[n]) return { s: s, fb: { kind: 'alreadyCrossed', n: n } };
    var lo = Math.floor(n / p) * p;
    return { s: s, fb: { kind: 'notMultiple', n: n, p: p, lo: lo, hi: lo + p, k1: lo / p, k2: lo / p + 1 } };
  }

  // ── Word problems (3.OA.3, 3.OA.8): generated by band, operation chosen first ──
  var WP_ONE = ['groups_mul', 'groups_share', 'groups_howmany', 'array_mul', 'array_rows', 'measure_area', 'measure_cut', 'measure_share', 'compare_mul', 'compare_div'];
  var WP_TWO = ['two_mul_sub', 'two_mul_add', 'two_div_sub', 'two_add_div', 'two_sub_div'];
  function wpTypesFor(band, lock) {
    if (band === 'early') return ['groups_mul', 'array_mul'];
    if (lock === 'one') return WP_ONE.slice();
    if (lock === 'two') return WP_TWO.slice();
    return WP_ONE.concat(WP_TWO);
  }
  function wpFactor(band, rng) {
    if (band === 'early') return 2 + Math.floor(rng() * 4);
    var max = band === 'extend' ? 12 : 10;
    return 2 + Math.floor(rng() * (max - 1));
  }
  function wpGivens(item) { return Object.keys(item.vals).map(function(k) { return item.vals[k]; }); }
  var WP_STEP = { mul: '×', div: '÷', add: '+', sub: '−' };
  function wpBuild(type, a, b, c, ctx2) {
    var p = a * b, it = { type: type, a: a, b: b, p: p };
    switch (type) {
      case 'groups_mul': case 'array_mul': case 'measure_area': case 'compare_mul':
        it.vals = { a: a, b: b }; it.steps = [{ l: a, op: 'mul', r: b, v: p }]; break;
      case 'groups_share': case 'measure_share': case 'compare_div':
        it.vals = { p: p, a: a }; it.steps = [{ l: p, op: 'div', r: a, v: b }]; break;
      case 'groups_howmany': case 'array_rows': case 'measure_cut':
        it.vals = { p: p, b: b }; it.steps = [{ l: p, op: 'div', r: b, v: a }]; break;
      case 'two_mul_sub':
        it.vals = { a: a, b: b, c: c }; it.steps = [{ l: a, op: 'mul', r: b, v: p }, { l: p, op: 'sub', r: c, v: p - c }]; break;
      case 'two_mul_add':
        it.vals = { a: a, b: b, c: c }; it.steps = [{ l: a, op: 'mul', r: b, v: p }, { l: p, op: 'add', r: c, v: p + c }]; break;
      case 'two_div_sub':
        it.vals = { p: p, a: a, c: c }; it.steps = [{ l: p, op: 'div', r: a, v: b }, { l: b, op: 'sub', r: c, v: b - c }]; break;
      case 'two_add_div':
        it.vals = { x: p - c, y: c, a: a }; it.steps = [{ l: p - c, op: 'add', r: c, v: p }, { l: p, op: 'div', r: a, v: b }]; break;
      default: // two_sub_div
        it.vals = { x: p + c, y: c, b: b }; it.steps = [{ l: p + c, op: 'sub', r: c, v: p }, { l: p, op: 'div', r: b, v: a }];
    }
    it.ops = it.steps.map(function(st) { return st.op; });
    it.answer = it.steps[it.steps.length - 1].v;
    it.variant = ctx2 || 0;
    return it;
  }
  function wpValid(it) {
    var g = wpGivens(it);
    if (!(it.answer >= 1)) return false;
    if (g.some(function(v) { return !(v >= 1) || v === it.answer; })) return false;
    if (it.steps.length > 1 && g.indexOf(it.steps[0].v) !== -1) return false;
    return true;
  }
  function makeWordProblem(band, rng, opts) {
    rng = rng || Math.random; opts = opts || {};
    var types = wpTypesFor(band, opts.lock);
    var type = types.indexOf(opts.type) !== -1 ? opts.type : pickFrom(types, rng);
    var it = null;
    for (var i = 0; i < 80 && !it; i++) {
      var a = wpFactor(band, rng), b = band === 'early' ? pickFrom([2, 3, 4, 5, 10], rng) : wpFactor(band, rng);
      var isDiv = /share|howmany|rows|cut|compare_div|two_div|two_add_div|two_sub_div/.test(type);
      if (isDiv && a === b) continue;
      var p = a * b, c;
      if (type === 'two_mul_sub') c = 1 + Math.floor(rng() * (p - 1));
      else if (type === 'two_mul_add') c = 2 + Math.floor(rng() * 18);
      else if (type === 'two_div_sub') { if (b < 3) continue; c = 1 + Math.floor(rng() * (b - 1)); }
      else if (type === 'two_add_div') { if (p < 4) continue; c = 1 + Math.floor(rng() * (p - 1)); }
      else if (type === 'two_sub_div') c = 2 + Math.floor(rng() * 18);
      var cand = wpBuild(type, a, b, c, Math.floor(rng() * 2));
      if (wpValid(cand)) it = cand;
    }
    if (!it) it = wpBuild('groups_mul', 3, 4, 0, 0);
    it.id = it.type + ':' + it.variant + ':' + wpGivens(it).join('-');
    it.options = wpOptions(it, rng);
    return it;
  }
  function wpOpposite(op) { return { mul: 'add', add: 'mul', div: 'sub', sub: 'div' }[op]; }
  function wpFlip(op) { return { mul: 'div', div: 'mul', add: 'sub', sub: 'add' }[op]; }
  // Two-step operation choices: the right pair plus three named distractors.
  function wpOptions(it, rng) {
    if (it.ops.length === 1) return [['mul'], ['div'], ['add'], ['sub']];
    var right = it.ops;
    var list = [right.slice(), [right[0], wpFlip(right[1])], [wpOpposite(right[0]), right[1]], [right[0]]];
    for (var i = list.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var tmp = list[i]; list[i] = list[j]; list[j] = tmp; }
    return list;
  }
  function sameOps(x, y) { return Array.isArray(x) && Array.isArray(y) && x.length === y.length && x.every(function(v, i) { return v === y[i]; }); }
  function diagnoseOps(it, picked) {
    if (!it || !Array.isArray(picked) || sameOps(it.ops, picked)) return null;
    var right = it.ops;
    if (right.length === 2) {
      if (picked.length === 1) return { kind: 'oneStepOnly' };
      return { kind: picked[0] !== right[0] ? 'firstStepOp' : 'secondStepOp' };
    }
    var r = right[0], p = picked[0], cmp = it.type.indexOf('compare') === 0;
    if (r === 'mul') return { kind: p === 'add' ? (cmp ? 'timesAsManyAdd' : 'addForMult') : p === 'div' ? 'divForMult' : 'subForMult' };
    return { kind: p === 'mul' ? (cmp ? 'timesAsManyMult' : 'multForDiv') : p === 'sub' ? 'subForDiv' : 'addForDiv' };
  }
  function wpStepAnswer(st) { return st.v; }
  // Name a wrong answer to one step of a word problem.
  function diagnoseStep(st, given) {
    if (given == null || given === st.v) return null;
    if (st.op === 'mul') return diagnoseMistake({ a: st.l, b: st.r, mode: 'mult' }, given);
    if (st.op === 'div') return diagnoseMistake({ a: st.v, b: st.r, mode: 'div', divisor: st.r }, given);
    var o = { given: given, l: st.l, r: st.r };
    if (st.op === 'sub' && given === st.l + st.r) return Object.assign({ kind: 'addedNotSub' }, o);
    if (st.op === 'add' && given === st.l - st.r) return Object.assign({ kind: 'subNotAdd' }, o);
    if (Math.abs(given - st.v) <= 2) return Object.assign({ kind: 'close' }, o);
    return Object.assign({ kind: 'other' }, o);
  }

  // ── Fact families: which equations belong to the family of a, b and a × b? ──
  function makeFamily(band, rng) {
    rng = rng || Math.random;
    var a = wpFactor(band, rng), b = wpFactor(band, rng);
    for (var i = 0; i < 40 && a === b; i++) b = wpFactor(band, rng);
    if (a === b) b = a + 1;
    var p = a * b;
    var cards = [
      { id: 'm1', l: a, op: 'mul', r: b, v: p, ok: true },
      { id: 'm2', l: b, op: 'mul', r: a, v: p, ok: true },
      { id: 'd1', l: p, op: 'div', r: a, v: b, ok: true },
      { id: 'd2', l: p, op: 'div', r: b, v: a, ok: true }
    ];
    var traps = [
      { id: 'x1', l: a, op: 'div', r: p, v: b, ok: false, kind: 'divReverse' },
      { id: 'x2', l: a, op: 'add', r: b, v: p, ok: false, kind: 'addFamily' },
      { id: 'x3', l: p, op: 'sub', r: a, v: b, ok: false, kind: 'addFamily' }
    ];
    var drop = Math.floor(rng() * 2) + 1; // keep the reversed division, plus one of + or −
    traps.splice(drop, 1);
    var all = cards.concat(traps);
    for (var k = all.length - 1; k > 0; k--) { var j = Math.floor(rng() * (k + 1)); var tmp = all[k]; all[k] = all[j]; all[j] = tmp; }
    return { a: a, b: b, p: p, cards: all, id: 'fam:' + Math.min(a, b) + 'x' + Math.max(a, b) };
  }
  function cardTrue(c) {
    if (c.op === 'mul') return c.l * c.r === c.v;
    if (c.op === 'div') return c.r !== 0 && c.l / c.r === c.v;
    if (c.op === 'add') return c.l + c.r === c.v;
    return c.l - c.r === c.v;
  }
  function diagnoseFamily(fam, picked) {
    picked = picked || {};
    var wrongIn = fam.cards.filter(function(c) { return !c.ok && picked[c.id]; });
    var missing = fam.cards.filter(function(c) { return c.ok && !picked[c.id]; }).length;
    if (!wrongIn.length && !missing) return null;
    return { wrong: wrongIn.map(function(c) { return c.kind; }), wrongCards: wrongIn, missing: missing, found: 4 - missing };
  }

  // ── Fluency game: a round of distinct facts, weak ones first ──
  function makeFluencyRound(pool, factScores, rng, n, withDivision) {
    rng = rng || Math.random; n = n || 10;
    var picked = [], keys = [];
    for (var i = 0; i < n * 20 && picked.length < Math.min(n, pool.length); i++) {
      var f = pickAdaptiveFact(pool, factScores, {}, keys, rng);
      if (keys.indexOf(f.key) !== -1) continue;
      keys.push(f.key);
      var item = { a: f.a, b: f.b, mode: 'mult' };
      if (withDivision && rng() < 0.4) { item.mode = 'div'; item.divisor = rng() < 0.5 ? f.a : f.b; }
      picked.push(item);
    }
    return picked;
  }

  // ── Sound effects ──
  // The host's shared context (StemLab.audioContext) is fetched on every use: the
  // host resumes it and owns its lifetime. A context this tool made itself is
  // resumed on each gesture and closed by releaseAudio() when the tool unmounts.
  var _audioCtx = null, _audioOwn = false, _audioUsers = 0;
  function getAudioCtx() {
    if (window.StemLab && typeof window.StemLab.audioContext === 'function') {
      var shared = window.StemLab.audioContext();
      if (shared) { _audioCtx = shared; _audioOwn = false; return shared; }
    }
    if (!_audioCtx || !_audioOwn || _audioCtx.state === 'closed') {
      var Ctor = window.AudioContext || window.webkitAudioContext;
      _audioCtx = new Ctor(); _audioOwn = true;
    }
    if (_audioCtx.state === 'suspended' && typeof _audioCtx.resume === 'function') {
      try { var p = _audioCtx.resume(); if (p && typeof p.catch === 'function') p.catch(function() {}); } catch (e) { /* resume refused */ }
    }
    return _audioCtx;
  }
  function audioMounted() { _audioUsers += 1; }
  function releaseAudio() {
    _audioUsers = Math.max(0, _audioUsers - 1);
    stopRhythm();
    if (_audioUsers > 0) return;
    if (_audioCtx && _audioOwn && _audioCtx.state !== 'closed' && typeof _audioCtx.close === 'function') {
      try { var p = _audioCtx.close(); if (p && typeof p.catch === 'function') p.catch(function() {}); } catch (e) { /* already closed */ }
    }
    _audioCtx = null; _audioOwn = false;
  }
  function playSound(type) {
    if (window._multTableMuted) return;  // global mute flag, set by the tool when state changes
    try {
      var ac = getAudioCtx();
      var o = ac.createOscillator();
      var g = ac.createGain();
      o.connect(g); g.connect(ac.destination);
      g.gain.value = 0.13;
      switch (type) {
        case 'correct':
          o.frequency.value = 523; o.type = 'sine';
          g.gain.setValueAtTime(0.13, ac.currentTime);
          g.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.25);
          o.start(); o.stop(ac.currentTime + 0.25);
          var o2 = ac.createOscillator(); var g2 = ac.createGain();
          o2.connect(g2); g2.connect(ac.destination);
          o2.frequency.value = 659; o2.type = 'sine';
          g2.gain.setValueAtTime(0.11, ac.currentTime + 0.1);
          g2.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.35);
          o2.start(ac.currentTime + 0.1); o2.stop(ac.currentTime + 0.35);
          break;
        case 'wrong':
          o.frequency.value = 200; o.type = 'sawtooth';
          g.gain.setValueAtTime(0.1, ac.currentTime);
          g.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.3);
          o.start(); o.stop(ac.currentTime + 0.3);
          break;
        case 'streak':
          o.frequency.value = 587; o.type = 'triangle';
          g.gain.setValueAtTime(0.12, ac.currentTime);
          g.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.15);
          o.start(); o.stop(ac.currentTime + 0.15);
          var o3 = ac.createOscillator(); var g3 = ac.createGain();
          o3.connect(g3); g3.connect(ac.destination);
          o3.frequency.value = 784; o3.type = 'triangle';
          g3.gain.setValueAtTime(0.12, ac.currentTime + 0.12);
          g3.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.35);
          o3.start(ac.currentTime + 0.12); o3.stop(ac.currentTime + 0.35);
          break;
        case 'badge':
          o.frequency.value = 440; o.type = 'sine';
          g.gain.setValueAtTime(0.12, ac.currentTime);
          g.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.12);
          o.start(); o.stop(ac.currentTime + 0.12);
          [554, 659, 880].forEach(function(f, i) {
            var ox = ac.createOscillator(); var gx = ac.createGain();
            ox.connect(gx); gx.connect(ac.destination);
            ox.frequency.value = f; ox.type = 'sine';
            var t0 = ac.currentTime + 0.1 * (i + 1);
            gx.gain.setValueAtTime(0.1, t0);
            gx.gain.exponentialRampToValueAtTime(0.01, t0 + 0.15);
            ox.start(t0); ox.stop(t0 + 0.15);
          });
          break;
        case 'speedStart':
          o.frequency.value = 392; o.type = 'square';
          g.gain.setValueAtTime(0.08, ac.currentTime);
          g.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.12);
          o.start(); o.stop(ac.currentTime + 0.12);
          [523, 659].forEach(function(f, i) {
            var ox = ac.createOscillator(); var gx = ac.createGain();
            ox.connect(gx); gx.connect(ac.destination);
            ox.frequency.value = f; ox.type = 'square';
            var t0 = ac.currentTime + 0.12 * (i + 1);
            gx.gain.setValueAtTime(0.08, t0);
            gx.gain.exponentialRampToValueAtTime(0.01, t0 + 0.12);
            ox.start(t0); ox.stop(t0 + 0.12);
          });
          break;
        case 'speedEnd':
          o.frequency.value = 880; o.type = 'sine';
          g.gain.setValueAtTime(0.12, ac.currentTime);
          g.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.5);
          o.start(); o.stop(ac.currentTime + 0.5);
          break;
        default:
          o.frequency.value = 440; o.type = 'sine';
          g.gain.setValueAtTime(0.1, ac.currentTime);
          g.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.15);
          o.start(); o.stop(ac.currentTime + 0.15);
      }
    } catch (e) { /* audio not available */ }
  }
  // ── Skip-count rhythm: one beat per group, pitch rising, every 5th beat accented ──
  // Scheduled on the audio clock (no JS timers); stopRhythm() silences it.
  var _rhythmNodes = [];
  function stopRhythm() {
    _rhythmNodes.forEach(function(n) {
      try { n.o.stop(); } catch (e) { /* already stopped */ }
      try { n.o.disconnect(); n.g.disconnect(); } catch (e2) { /* already disconnected */ }
    });
    _rhythmNodes = [];
  }
  function playRhythm(beats, gap) {
    stopRhythm();
    if (window._multTableMuted) return false;
    beats = Math.max(1, Math.min(12, Math.floor(Number(beats) || 0)));
    gap = gap || 0.55;
    try {
      var ac = getAudioCtx();
      for (var i = 0; i < beats; i++) {
        var o = ac.createOscillator(), g = ac.createGain();
        o.connect(g); g.connect(ac.destination);
        o.type = 'triangle';
        o.frequency.value = 330 * Math.pow(2, i / 12);
        var t0 = ac.currentTime + 0.05 + i * gap, loud = (i + 1) % 5 === 0 ? 0.16 : 0.1;
        g.gain.setValueAtTime(loud, t0);
        g.gain.exponentialRampToValueAtTime(0.01, t0 + 0.18);
        o.start(t0); o.stop(t0 + 0.2);
        _rhythmNodes.push({ o: o, g: g });
      }
      return true;
    } catch (e) { return false; }
  }

  // ── Badge definitions ── (shown text comes from badgeText() so it translates)
  var BADGES = [
    { id: 'firstCorrect',  icon: '⭐', label: 'First Star',        desc: 'Answer your first problem correctly' },
    { id: 'streak5',       icon: '🔥', label: 'On Fire',     desc: '5 correct answers in a row' },
    { id: 'streak10',      icon: '⚡', label: 'Lightning',          desc: '10 correct answers in a row' },
    { id: 'streak20',      icon: '🌟', label: 'Unstoppable', desc: '20 correct answers in a row' },
    { id: 'speedRunner',   icon: '⏱️', label: 'Speed Runner', desc: 'Complete a Speed Run' },
    { id: 'speedDemon',    icon: '😈', label: 'Speed Demon', desc: '20+ correct in a Speed Run' },
    { id: 'perfectRun',    icon: '💯', label: 'Perfect Run', desc: '100% accuracy in Speed Run (10+ Qs)' },
    { id: 'squareMaster',  icon: '🟦', label: 'Square Master', desc: 'Answer all 12 perfect squares' },
    { id: 'hiddenHero',    icon: '🙈', label: 'Hidden Hero', desc: '10 correct in Hidden mode' },
    { id: 'adaptiveAce',   icon: '🎯', label: 'Adaptive Ace', desc: 'Reach Hard difficulty in Adaptive' },
    { id: 'centurion',     icon: '🏅', label: 'Centurion',   desc: '100 total correct answers' },
    { id: 'mathlete',      icon: '🏆', label: 'Mathlete',    desc: '50 correct in one session' },
    { id: 'trickyMaster',  icon: '🧩', label: 'Tricky Master', desc: '10 correct on Tricky 15 facts' },
    { id: 'patternFinder', icon: '🔍', label: 'Pattern Finder', desc: 'Explore 5+ patterns in the Patterns tab' },
    { id: 'visualLearner', icon: '🟩', label: 'Visual Explorer', desc: 'Explore 10 facts in the Visual tab' },
    { id: 'sieveSolver',   icon: '🧮', label: 'Sieve Solver', desc: 'Finish the sieve of Eratosthenes' },
    { id: 'primeDetective', icon: '🕵️', label: 'Number Detective', desc: '10 number detective questions right on the first try' },
    { id: 'wordSolver',    icon: '📖', label: 'Problem Solver', desc: 'Solve 10 word problems' },
    { id: 'fluencyClimber', icon: '🧗', label: 'Fluency Climber', desc: 'Finish a fluency game round' }
  ];
  // Speed is not rewarded with XP: these badges are kept, but award nothing.
  // Speed badges and the arrays badge (10 facts the learner picked and built, right or not) carry no XP.
  var NO_XP_BADGES = { speedRunner: true, speedDemon: true, perfectRun: true, visualLearner: true };

  window.StemLab.registerTool('multtable', {
    icon: '🔢', label: 'Multiplication Table',
    desc: 'Times-table strategies: arrays, patterns, fact families, named-mistake feedback and smart practice.',
    color: 'pink', category: 'math',
    // State is split across _multExt (practice totals, badges) and _multTimer
    // (speed-run session) — the hub's quest checker merges these keys so the
    // hooks below can see both.
    questDataKeys: ['_multExt', '_multTimer'],
    questHooks: [
      { id: 'answer_10', get label() { return __alloT('stem.multtable.quest_answer_10', 'Answer 10 facts correctly'); }, icon: '🔢', check: function(d) { return (d.totalCorrect || 0) >= 10; },
        progress: function(d) { var k = d.totalCorrect || 0; return __alloT('stem.multtable.quest_answer_10_progress', '{k}/10 correct').replace('{k}', function() { return String(k); }); } },
      { id: 'squares_5', get label() { return __alloT('stem.multtable.quest_squares_5', 'Answer 5 square facts (n × n)'); }, icon: '🟪', check: function(d) { return Object.keys(d.squaresAnswered || {}).length >= 5; },
        progress: function(d) { var k = Object.keys(d.squaresAnswered || {}).length; return __alloT('stem.multtable.quest_squares_5_progress', '{k}/5 squares').replace('{k}', function() { return String(k); }); } },
      { id: 'speedrun_10', get label() { return __alloT('stem.multtable.quest_speedrun_10', 'Score 10 in a speed run'); }, icon: '⏱️', check: function(d) { return (d.score || 0) >= 10; },
        progress: function(d) { var k = d.score || 0; return __alloT('stem.multtable.quest_speedrun_10_progress', '{k}/10 in best run').replace('{k}', function() { return String(k); }); } }
    ],
    render: function(ctx) {
      __alloCtx_multtable = ctx;
      var React = ctx.React;
      var h = React.createElement;
      var noop = function() {};
      var ArrowLeft = (ctx.icons && ctx.icons.ArrowLeft) || function() { return null; };
      var setStemLabTool = typeof ctx.setStemLabTool === 'function' ? ctx.setStemLabTool : noop;
      var addToast = typeof ctx.addToast === 'function' ? ctx.addToast : noop;
      var awardXP = ctx.awardXP;
      var announceToSR = typeof ctx.announceToSR === 'function' ? ctx.announceToSR : noop;
      var rawT = ctx.t;
      var t = function(key, fallback) {
        if (typeof rawT !== 'function') return fallback;
        var v = rawT(key, fallback);
        return (typeof v === 'string' && v) ? v : fallback;
      };
      // Whole sentences with {placeholders}; a replacer function, so "$&" in a value stays literal.
      // English only: "1 dots are" reads "1 dot is". Other languages word their own sentences, and these nouns do not match them.
      function __alloOneWord(s) { if (String(s).indexOf('1 ') < 0) return s; var irr = { inches: 'inch', boxes: 'box', copies: 'copy', batches: 'batch', categories: 'category', entries: 'entry', halves: 'half', shelves: 'shelf', tries: 'try', classes: 'class', guesses: 'guess', quizzes: 'quiz', feet: 'foot', people: 'person', children: 'child', volcanoes: 'volcano' }; return String(s).replace(/(^|[^\d.,\-−\/:])([Tt]here are )?1 ((?:square|cubic|unit|equal|full|whole|live|alive|dying|new|more|fewer|extra|small|real|complete|separate|shaded|missed|remaining|plotted|turning|significant|decimal|wrong|required|sample|spaceship|part|path|trail|walking|cool|factor|zero|loose|trading|question|bottom|planned|residual|imperial|different|two-way|best-fit) )?((?:dot|row|column|square|tile|unit|piece|part|group|hop|jump|step|cup|stack|point|value|cell|face|block|marker|answer|question|problem|cube|counter|item|round|badge|generation|meter|metre|kilometer|kilometre|centimeter|centimetre|millimeter|millimetre|liter|litre|gram|kilogram|gallon|yard|mile|hectare|acre|teaspoon|tablespoon|ounce|pound|cent|dollar|coin|degree|space|place|side|second|minute|hour|day|week|month|year|apple|sticker|pencil|chair|student|bag|muffin|trial|rule|sector|shot|hundredth|tenth|thousandth|third|fourth|fifth|sixth|eighth|twelfth|quarter|whole|table|plant|marble|card|seat|ball|book|sample|ticket|tick|check|number|crayon|pack|grape|attempt|page|seed|bead|cookie|ribbon|caterpillar|feather|tray|egg|edge|mission|serving|member|dig|field|angle|birth|death|tone|parcel|prime|player|bucket|beat|pet|line|bar|slice|bin|record|response|pair|outlier|orange|crate|disk|mark|length|car|desk|tree|chocolate|challenge|section|hit|spot|landmark|pool|bee|carrot|textbook|elephant|bottle|tub|sneeze|screen|room|pin|ray|diagonal|corner|polygon|survivor|neighbour|neighbor|neighbourhood|observation|pattern|period|change|edit|stop|plan|home|wedge|figure|estimate|layer|wave|word|image|note|lesson|star|color|colour|photo|airport|event|earthquake|quake|eruption|droplet|stage|input|design|topic|case|cycle|pole|location|objective|character|credit|plate|pick|result|sound)s|inches|boxes|copies|batches|categories|entries|halves|shelves|tries|classes|guesses|quizzes|feet|people|children|volcanoes)\b( are| were| have| make| fit| remain| get| meet| need)?/g, function (m, pre, there, mod, noun, verb, at, all) { if (/(?:\b(?:Grade|Row|Column|Group|Team|Player|Level|Round|Step|Set|Part|Page|Table|Type|Day|Week|Stage|Trial|Test|Sample|Question|Problem|Card|Box|Line|Side|Figure|Item|Number|Chapter|Section|Area|Zone|Class|Tier|Unit|Lesson|Module|Generation)|[×÷+*]) $/i.test(all.slice(0, at + pre.length))) return m; if (/^(?:square|cube|round|point|change|group)s$/.test(noun) && /^ (?:to|up|down|into)\b/.test(all.slice(at + m.length))) return m; return pre + (there ? there.replace('are', 'is') : '') + '1 ' + (mod || '') + (irr[noun] || noun.slice(0, -1)) + (verb === ' are' ? ' is' : verb === ' were' ? ' was' : verb === ' have' ? ' has' : verb ? verb + 's' : ''); }).replace(/\b1 (row|group) of (\d+) make\b/g, '1 $1 of $2 makes'); }
      function fmt(s, vals) {
        var out = String(s);
        Object.keys(vals || {}).forEach(function(k) {
          out = out.replace(new RegExp('\\{' + k + '\\}', 'g'), function() { return String(vals[k]); });
        });
        return __alloOneWord(out);
      }
      var TIMES = ' × ', DIV = ' ÷ ';
      var BTN = { minHeight: 44 };
      var CHIP = { minHeight: 36 };

      // ── State from ctx ──
      var multTableAnswer = ctx.multTableAnswer || '';
      var setMultTableAnswer = ctx.setMultTableAnswer || noop;
      var multTableChallenge = ctx.multTableChallenge || null;
      var setMultTableChallenge = ctx.setMultTableChallenge || noop;
      var multTableFeedback = ctx.multTableFeedback || null;
      var setMultTableFeedback = ctx.setMultTableFeedback || noop;
      var multTableHidden = ctx.multTableHidden || false;
      var setMultTableHidden = ctx.setMultTableHidden || noop;
      var setMultTableHover = ctx.setMultTableHover || noop;
      var multTableRevealed = ctx.multTableRevealed || new Set();
      var setMultTableRevealed = ctx.setMultTableRevealed || noop;
      var labToolData = ctx.labToolData || {};
      var setLabToolData = ctx.setLabToolData || noop;
      var exploreScore = ctx.exploreScore || { correct: 0, total: 0 };
      var setExploreScore = ctx.setExploreScore || noop;
      var isTeacher = ctx.isTeacherMode === true;
      // Theme for the inline-styled panels (sieve, fluency climb). Same precedence as the host shell.
      var mtTheme = (ctx.theme === 'contrast' || ctx.theme === 'dark' || ctx.theme === 'light')
        ? (ctx.theme === 'contrast' ? 'hc' : ctx.theme) : (ctx.isContrast ? 'hc' : ctx.isDark ? 'dark' : 'light');
      var PANEL_INK = {
        dark: { bg: '#0f172a', border: '#64748b', text: '#e2e8f0', soft: '#cbd5e1', head: '#fbcfe8', accent: '#c7d2fe', ok: '#86efac', bad: '#fca5a5' },
        hc:   { bg: '#000000', border: '#ffff00', text: '#ffffff', soft: '#ffffff', head: '#ffff00', accent: '#ffff00', ok: '#ffffff', bad: '#ffffff' }
      }[mtTheme] || null;
      // Inline ink for text in a themed panel; undefined keeps the light classes.
      function ink(role) { return PANEL_INK ? { color: PANEL_INK[role] || PANEL_INK.text } : undefined; }
      function panelStyle() { return PANEL_INK ? { background: PANEL_INK.bg, borderColor: PANEL_INK.border, color: PANEL_INK.text } : undefined; }
      // High contrast: the host turns light chips black, so their ink must be white (and black without the host CSS).
      function chipInk(style) { return mtTheme === 'hc' ? Object.assign({}, style || {}, { background: '#000000', color: '#ffffff', borderColor: '#ffff00' }) : style; }
      // Light sub-cards inside a themed panel keep dark ink, except in high contrast.
      function cardInk(role) { return mtTheme === 'hc' ? { color: role === 'head' ? '#ffff00' : '#ffffff' } : undefined; }
      function cardStyle() { return mtTheme === 'hc' ? { background: '#000000', borderColor: '#ffff00', color: '#ffffff' } : undefined; }
      // Sieve cells and climb steps: light, dark and high-contrast palettes (text 4.5:1, edges 3:1).
      var SIEVE_INK = {
        light: { open: { bg: '#ffffff', fg: '#0f172a', bd: '1px solid #94a3b8' }, prime: { bg: '#dcfce7', fg: '#14532d', bd: '3px solid #15803d' }, crossed: { bg: '#f1f5f9', fg: '#475569', bd: '1px solid #94a3b8' } },
        dark:  { open: { bg: '#1e293b', fg: '#f1f5f9', bd: '1px solid #94a3b8' }, prime: { bg: '#14532d', fg: '#dcfce7', bd: '3px solid #4ade80' }, crossed: { bg: '#0f172a', fg: '#94a3b8', bd: '1px solid #64748b' } },
        hc:    { open: { bg: '#000000', fg: '#ffffff', bd: '1px solid #ffffff' }, prime: { bg: '#000000', fg: '#ffff00', bd: '3px solid #ffff00' }, crossed: { bg: '#000000', fg: '#c0c0c0', bd: '1px dashed #c0c0c0' } }
      }[mtTheme];
      var CLIMB_INK = {
        light: { up: '#be185d', down: '#ffffff', bd: '#831843' },
        dark:  { up: '#f472b6', down: '#1e293b', bd: '#f9a8d4' },
        hc:    { up: '#ffff00', down: '#000000', bd: '#ffffff' }
      }[mtTheme];

      var maxNum = 12;

      // ── Speed Run session state (never saved) ──
      var _mt = Object.assign({ active: false, paused: false, endTime: 0, score: 0, total: 0, timeLeft: 120, streak: 0, missed: [], adaptiveHistory: [] }, labToolData._multTimer || {});
      if (!Array.isArray(_mt.missed)) _mt.missed = [];
      if (!Array.isArray(_mt.adaptiveHistory)) _mt.adaptiveHistory = [];
      var _mtUpd = function(obj) {
        setLabToolData(function(prev) {
          return Object.assign({}, prev, { _multTimer: Object.assign({}, prev._multTimer || _mt, obj) });
        });
      };

      // ── Extended state for badges, progress and settings ──
      var _ext = Object.assign({ badges: {}, totalCorrect: 0, sessionCorrect: 0, hiddenCorrect: 0, squaresAnswered: {}, rowsAnswered: {}, showBadges: false }, labToolData._multExt || {});
      if (!_ext.badges || typeof _ext.badges !== 'object') _ext.badges = {};
      var extUpd = function(obj) {
        setLabToolData(function(prev) {
          return Object.assign({}, prev, { _multExt: Object.assign({}, prev._multExt || _ext, obj) });
        });
      };

      var MT_TABS = ['practice', 'visual', 'patterns', 'factors', 'words', 'fluency'];
      var muted = _ext.muted || false;
      window._multTableMuted = muted;             // synced flag read by playSound (module-scope fn)
      var visualSkipOn = _ext.visualSkipOn !== false;
      var patternId = _ext.patternId || null;
      var factScores = (_ext.factScores && typeof _ext.factScores === 'object') ? _ext.factScores : {};
      var showHeatmap = _ext.showHeatmap || false;
      var coachOpen = !!(_ext.showCoach || _ext.showAI);

      // ── Teacher settings (ctx.isTeacherMode sets them; they apply to learners) ──
      var teach = (_ext.teacher && typeof _ext.teacher === 'object') ? _ext.teacher : {};
      function teacherSet(patch) { extUpd({ teacher: Object.assign({}, teach, patch) }); }
      var bandLock = BAND_PRESETS[teach.lockBand] ? teach.lockBand : null;
      var modeLock = QUIZ_MODE_IDS.indexOf(teach.lockMode) !== -1 ? teach.lockMode : null;
      var maxTries = teach.tries === 2 ? 2 : 3;
      var showAnswerButton = teach.showAnswer !== false;
      var speedAllowed = teach.speedOff !== true;
      // Fluency game: untimed unless the teacher opts in; extended time = 1.5 ×.
      var fluTimerSetting = (teach.fluencyTimer === 180 || teach.fluencyTimer === 300) ? teach.fluencyTimer : 0;
      var fluExtended = teach.fluencyExtended === true;
      var fluLimit = fluTimerSetting ? Math.round(fluTimerSetting * (fluExtended ? 1.5 : 1)) : 0;
      var wpLock = (teach.wpLock === 'one' || teach.wpLock === 'two') ? teach.wpLock : null;
      // Typed text for the new sections stays in this component (never saved).
      var localState = React.useState({});
      var local = localState[0];
      var setLocal = localState[1];
      function setL(patch) { setLocal(function(prev) { return Object.assign({}, prev, patch); }); }

      // ── Grade band → fact set, range and direction ──
      var gradeBandId = resolveBand(ctx.gradeBand, ctx.gradeLevel);
      var band = bandLock || (BAND_PRESETS[_ext.band] ? _ext.band : gradeBandId);
      var preset = BAND_PRESETS[band];
      // Live dots before a build let a learner count out the total: K-2, or a teacher's K-2 lock. The learner's own fact-set choice does not change it.
      var liveDots = gradeIsK2(ctx.gradeBand, ctx.gradeLevel) || bandLock === 'early';
      // Arrays open on a fact from the band's set: K-2 starts with 2 rows of 5; grades 3+ on a tricky fact.
      var VIS_DEFAULT = band === 'early' ? [2, 5] : [7, 8];
      var visualA = Math.max(1, Math.min(12, Math.round(Number(_ext.visualA)) || VIS_DEFAULT[0]));
      var visualB = Math.max(1, Math.min(12, Math.round(Number(_ext.visualB)) || VIS_DEFAULT[1]));
      var VIS_CHIPS = band === 'early' ? [[2,3],[2,5],[3,2],[4,5],[5,5],[2,10],[3,10],[5,10]] : [[6,7],[6,8],[6,9],[7,7],[7,8],[7,9],[8,8],[8,9],[9,9],[11,12],[12,12]];
      var chosenDiff = DIFFICULTY_IDS.indexOf(_ext.difficulty) !== -1 ? _ext.difficulty : null;
      var exploreDifficulty = chosenDiff || preset.difficulty;
      if (bandLock && exploreDifficulty !== 'adaptive') exploreDifficulty = preset.difficulty;
      var quizMode = modeLock || (QUIZ_MODE_IDS.indexOf(_ext.quizMode) !== -1 ? _ext.quizMode : (bandLock ? preset.quizMode : 'mult'));
      // Tabs in the band's order; with no saved tab the band's first activity opens.
      var tabOrder = TAB_ORDER[band] || MT_TABS;
      var mtTab = MT_TABS.indexOf(_ext.mtTab) !== -1 ? _ext.mtTab : tabOrder[0];

      // "This visit" = one opening of the tool. Session counts, XP-once ledger,
      // revealed facts, the missed list and the mistake tally live here.
      var mtVisitRef = React.useRef(null);
      if (!mtVisitRef.current) mtVisitRef.current = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      var mtVisit = mtVisitRef.current;
      var sessionCorrectNow = _ext.sessionVisit === mtVisit ? (_ext.sessionCorrect || 0) : 0;
      var VISIT_DEFAULT = { id: mtVisit, xp: {}, revealed: {}, missed: [], tally: {}, recent: [], worked: {}, aiHint: null, claims: {} };
      var visit = (_ext.visit && _ext.visit.id === mtVisit) ? Object.assign({}, VISIT_DEFAULT, _ext.visit) : VISIT_DEFAULT;
      function visitPatch(patch) { return Object.assign({}, visit, patch); }

      // ── Highlight cell + input latch (live in labToolData, as before) ──
      var highlightCell = labToolData._multHighlight || null;
      var setHighlightCell = function(cell) {
        setLabToolData(function(prev) { return Object.assign({}, prev, { _multHighlight: cell }); });
      };
      var inputDisabled = labToolData._multInputDisabled || false;
      // A paused Speed Run takes no answers: its clock and score stand still together.
      var speedPaused = !!(_mt.active && _mt.paused);
      var answerLocked = inputDisabled || speedPaused;
      var setInputDisabled = function(val) {
        setLabToolData(function(prev) { return Object.assign({}, prev, { _multInputDisabled: val }); });
      };
      var autoAdvancePending = !!(_mt.active && !_mt.paused && labToolData._multAdvanceTimer);
      React.useEffect(function() {
        if ((!_mt.active || _mt.paused) && labToolData._multAdvanceTimer) {
          clearTimeout(labToolData._multAdvanceTimer);
          setLabToolData(function(previous) { return Object.assign({}, previous, { _multAdvanceTimer: null }); });
        }
      }, [_mt.active, _mt.paused, labToolData._multAdvanceTimer]);
      React.useEffect(function() {
        var timer = labToolData._multAdvanceTimer;
        return function() { if (timer) clearTimeout(timer); };
      }, [labToolData._multAdvanceTimer]);

      // ── Grid focus (roving tabindex) and the selected table cell ──
      var gridFocusState = React.useState({});
      var gridFocus = gridFocusState[0], setGridFocus = gridFocusState[1];
      var selState = React.useState(null);
      var selCell = selState[0], setSelCell = selState[1];

      // ── Speed Run timer: one interval per running run, cleared on unmount ──
      var mtRef = React.useRef(_mt);
      mtRef.current = _mt;
      var finishRef = React.useRef(null);
      React.useEffect(function() {
        if (!_mt.active || _mt.paused) return undefined;
        var iv = setInterval(function() {
          var tm = mtRef.current;
          if (!tm || !tm.active || tm.paused) return;
          if (!Number.isFinite(Number(tm.endTime)) || !tm.endTime) { _mtUpd({ endTime: Date.now() + Math.max(0, Number(tm.timeLeft) || 0) * 1000 }); return; }
          var left = Math.max(0, Math.round((tm.endTime - Date.now()) / 1000));
          if (left <= 0) { clearInterval(iv); if (finishRef.current) finishRef.current(false); return; }
          if (left !== tm.timeLeft) _mtUpd({ timeLeft: left });
        }, 500);
        return function() { clearInterval(iv); };
      }, [_mt.active, _mt.paused, _mt.endTime]);

      // ── Localized text helpers ──
      function badgeText(id) {
        switch (id) {
          case 'firstCorrect': return { label: t('stem.multtable.badge_first_correct', 'First Star'), desc: t('stem.multtable.badge_first_correct_desc', 'Answer your first problem correctly') };
          case 'streak5': return { label: t('stem.multtable.badge_streak5', 'On Fire'), desc: t('stem.multtable.badge_streak5_desc', '5 right on the first try in a row') };
          case 'streak10': return { label: t('stem.multtable.badge_streak10', 'Lightning'), desc: t('stem.multtable.badge_streak10_desc', '10 right on the first try in a row') };
          case 'streak20': return { label: t('stem.multtable.badge_streak20', 'Unstoppable'), desc: t('stem.multtable.badge_streak20_desc', '20 right on the first try in a row') };
          case 'speedRunner': return { label: t('stem.multtable.badge_speed_runner', 'Speed Runner'), desc: t('stem.multtable.badge_speed_runner_desc', 'Finish a full Speed Run') };
          case 'speedDemon': return { label: t('stem.multtable.badge_speed_demon', 'Speed Demon'), desc: t('stem.multtable.badge_speed_demon_desc', '20 or more correct in a Speed Run') };
          case 'perfectRun': return { label: t('stem.multtable.badge_perfect_run', 'Perfect Run'), desc: t('stem.multtable.badge_perfect_run_desc', 'Every answer right in a Speed Run of 10 or more') };
          case 'squareMaster': return { label: t('stem.multtable.badge_square_master', 'Square Master'), desc: t('stem.multtable.badge_square_master_desc', 'Answer all 12 perfect squares') };
          case 'hiddenHero': return { label: t('stem.multtable.badge_hidden_hero', 'Hidden Hero'), desc: t('stem.multtable.badge_hidden_hero_desc', '10 correct with the table answers hidden') };
          case 'adaptiveAce': return { label: t('stem.multtable.badge_adaptive_ace', 'Adaptive Ace'), desc: t('stem.multtable.badge_adaptive_ace_desc', 'Reach the hardest level in Smart practice') };
          case 'centurion': return { label: t('stem.multtable.badge_centurion', 'Centurion'), desc: t('stem.multtable.badge_centurion_desc', '100 total correct answers') };
          case 'mathlete': return { label: t('stem.multtable.badge_mathlete', 'Mathlete'), desc: t('stem.multtable.badge_mathlete_desc', '50 correct in one session') };
          case 'trickyMaster': return { label: t('stem.multtable.badge_tricky_master', 'Tricky Master'), desc: t('stem.multtable.badge_tricky_master_desc', '10 correct on Tricky 15 facts') };
          case 'patternFinder': return { label: t('stem.multtable.badge_pattern_finder', 'Pattern Finder'), desc: t('stem.multtable.badge_pattern_finder_desc', 'Explore 5 or more patterns in the Patterns tab') };
          case 'visualLearner': return { label: t('stem.multtable.badge_visual_learner', 'Visual Explorer'), desc: t('stem.multtable.badge_visual_learner_desc', 'Build 10 facts as arrays') };
          case 'sieveSolver': return { label: t('stem.multtable.badge_sieve_solver', 'Sieve Solver'), desc: t('stem.multtable.badge_sieve_solver_desc', 'Finish the sieve of Eratosthenes') };
          case 'primeDetective': return { label: t('stem.multtable.badge_prime_detective', 'Number Detective'), desc: t('stem.multtable.badge_prime_detective_desc', '10 number detective questions right on the first try') };
          case 'wordSolver': return { label: t('stem.multtable.badge_word_solver', 'Problem Solver'), desc: t('stem.multtable.badge_word_solver_desc', 'Solve 10 word problems') };
          case 'fluencyClimber': return { label: t('stem.multtable.badge_fluency_climber', 'Fluency Climber'), desc: t('stem.multtable.badge_fluency_climber_desc', 'Finish a fluency game round') };
          default: return { label: id, desc: '' };
        }
      }
      function trickText(key) {
        switch (key) {
          case '6x7': return t('stem.multtable.trick_6x7', '"6 times 7 is 42." A jingle works here.');
          case '6x8': return t('stem.multtable.trick_6x8', '6×8 = 48. Tip: 6×8 is 6×(10−2) = 60−12 = 48.');
          case '6x9': return t('stem.multtable.trick_6x9', '6×9 = 54. Digits 5+4=9, and 5 is one less than 6.');
          case '7x7': return t('stem.multtable.trick_7x7', '7×7 = 49. "Sevens lucky, forty-nine."');
          case '7x8': return t('stem.multtable.trick_7x8', '7×8 = 56. "5, 6, 7, 8 — fifty-six = seven times eight." The digits march in order.');
          case '7x9': return t('stem.multtable.trick_7x9', '7×9 = 63. Digits 6+3=9, and 6 is one less than 7.');
          case '8x8': return t('stem.multtable.trick_8x8', '8×8 = 64. "I ate and ate till I was sick on the floor — 8×8 is 64."');
          case '8x9': return t('stem.multtable.trick_8x9', '8×9 = 72. Digits 7+2=9, and 7 is one less than 8.');
          case '9x9': return t('stem.multtable.trick_9x9', '9×9 = 81. Digits 8+1=9, and 8 is one less than 9. All 9s × 1-10 work this way.');
          case '6x11': return t('stem.multtable.trick_6x11', '6×11 = 66. For 11 × 1-9, write the digit twice: 6 and 6.');
          case '7x11': return t('stem.multtable.trick_7x11', '7×11 = 77. For 11 × 1-9, write the digit twice: 7 and 7.');
          case '8x11': return t('stem.multtable.trick_8x11', '8×11 = 88. For 11 × 1-9, write the digit twice: 8 and 8.');
          case '6x12': return t('stem.multtable.trick_6x12', '6×12 = 72. Split: 6×12 = 6×10 + 6×2 = 60 + 12 = 72.');
          case '7x12': return t('stem.multtable.trick_7x12', '7×12 = 84. Split: 7×12 = 7×10 + 7×2 = 70 + 14 = 84.');
          case '8x12': return t('stem.multtable.trick_8x12', '8×12 = 96. Split: 8×12 = 8×10 + 8×2 = 80 + 16 = 96.');
          case '9x11': return t('stem.multtable.trick_9x11', '9×11 = 99. 11s repeat the digit (9 and 9), and 99 is one less than 100.');
          case '9x12': return t('stem.multtable.trick_9x12', '9×12 = 108. Split: 9×12 = 9×10 + 9×2 = 90 + 18 = 108.');
          case '11x12': return t('stem.multtable.trick_11x12', '11×12 = 132. Split: 11×12 = 11×10 + 11×2 = 110 + 22 = 132.');
          case '12x12': return t('stem.multtable.trick_12x12', '12×12 = 144. A gross. Worth memorizing.');
          default: return MEMORY_TRICKS[key] ? MEMORY_TRICKS[key].trick : '';
        }
      }
      function questionText(ch) {
        var p = ch.a * ch.b;
        if (ch.mode === 'divmiss') return ch.form === 'divisor' ? p + DIV + '? = ' + divmissQuotient(ch) : '?' + DIV + ch.divisor + ' = ' + divmissQuotient(ch);
        if (ch.mode === 'div') return p + DIV + ch.divisor + ' = ?';
        if (ch.mode === 'missing') return Number(ch.known) === ch.a ? ch.a + TIMES + '? = ' + p : '?' + TIMES + ch.b + ' = ' + p;
        return ch.a + TIMES + ch.b + ' = ?';
      }
      function solvedText(ch) {
        var p = ch.a * ch.b, ans = factAnswer(ch);
        if (ch.mode === 'divmiss') return p + DIV + ch.divisor + ' = ' + divmissQuotient(ch);
        if (ch.mode === 'div') return p + DIV + ch.divisor + ' = ' + ans;
        if (ch.mode === 'missing') return Number(ch.known) === ch.a ? ch.a + TIMES + ans + ' = ' + p : ans + TIMES + ch.b + ' = ' + p;
        return ch.a + TIMES + ch.b + ' = ' + p;
      }
      function mistakeText(m, ch) {
        if (!m) return '';
        if (ch && ch.mode === 'divmiss') {
          var dvs = ch.form === 'divisor';
          switch (m.kind) {
            case 'quotientEcho': return dvs
              ? fmt(t('stem.multtable.mis_quotient_echo_divisor', '{given} is already in the equation as the answer. Find the number you divide by: {p} ÷ what = {q}?'), m)
              : fmt(t('stem.multtable.mis_quotient_echo_dividend', '{given} is already in the equation as the answer. The missing number is the total you start with.'), m);
            case 'product': return fmt(t('stem.multtable.mis_product_divisor', '{given} is the total you started with. Into how many equal groups of {q} does {p} split?'), m);
            case 'subtracted': return fmt(t('stem.multtable.mis_subtracted_divisor', 'It looks like you took {q} away once. Count how many groups of {q} fit into {p}.'), m);
            case 'offByOneDivisor': return fmt(t('stem.multtable.mis_off_by_one_divisor', 'Very close. Check it: multiply {given} × {q} and compare it with {p}.'), m);
            case 'divisorEcho': return fmt(t('stem.multtable.mis_divisor_echo_dividend', '{given} is the number you divide by. The missing number is the total: {q} groups of {d}.'), m);
            case 'added': return fmt(t('stem.multtable.mis_added_dividend', 'It looks like you added {d} and {q}. If ? ÷ {d} = {q}, the missing number is {q} groups of {d}, all together.'), m);
            case 'dividedInstead': return fmt(t('stem.multtable.mis_divided_instead', 'It looks like you divided. To undo a division, multiply: the missing number is {d} × {q}.'), m);
            case 'oneGroupOff': return fmt(t('stem.multtable.mis_one_group_off', 'Very close: you are one group away. Check it: divide your answer by {d} and compare it with {q}.'), m);
            case 'swapped': return t('stem.multtable.mis_swapped', 'Your digits look swapped. Check the order of the tens and the ones.');
            case 'close': return t('stem.multtable.mis_close', 'Very close. Recount the last group.');
            default: return t('stem.multtable.mis_other', 'Not this time.');
          }
        }
        var inverse = ch && (ch.mode === 'div' || ch.mode === 'missing');
        switch (m.kind) {
          case 'added':
            return inverse
              ? fmt(t('stem.multtable.mis_added_inverse', 'It looks like you added {d} to {p}. The question asks how many groups of {d} make {p}.'), m)
              : fmt(t('stem.multtable.mis_added', 'It looks like you added: {a} + {b} = {given}. Multiplying means {a} groups of {b}, not {a} plus {b}.'), m);
          case 'product':
            return ch.mode === 'missing'
              ? fmt(t('stem.multtable.mis_product_missing', '{given} is the product, and it is already in the equation. Which number times {d} makes {p}?'), m)
              : fmt(t('stem.multtable.mis_product_div', '{given} is the total you started with. Division asks how many groups of {d} fit into {p}.'), m);
          case 'divisorEcho':
            return ch.mode === 'missing'
              ? fmt(t('stem.multtable.mis_known_echo', '{given} is the factor you were given. Find the other factor: {d} times what makes {p}?'), m)
              : fmt(t('stem.multtable.mis_divisor_echo', '{given} is the number you are dividing by. The answer is how many groups of {d} make {p}.'), m);
          case 'subtracted':
            return fmt(t('stem.multtable.mis_subtracted', 'It looks like you took {d} away once. The question asks how many times {d} fits into {p}.'), m);
          case 'swapped':
            return t('stem.multtable.mis_swapped', 'Your digits look swapped. Check the order of the tens and the ones.');
          case 'neighbour':
            return fmt(t('stem.multtable.mis_neighbour', '{given} is {x} × {y}, a neighbouring fact. Are you one group of {g} too high or too low?'), m);
          case 'offByOne':
            return fmt(t('stem.multtable.mis_off_by_one', 'Very close: you are one group away. Check it: multiply {d} × {given} and compare it with {p}.'), m);
          case 'identity':
            return t('stem.multtable.mis_identity', 'Any number times 1 stays the same number.');
          case 'anchorEcho':
            return fmt(t('stem.multtable.mis_anchor_echo', '{given} is the fact you already know, {a} × {n}. Now add or take away groups of {a} to reach {a} × {b}.'), m);
          case 'close':
            return t('stem.multtable.mis_close', 'Very close. Recount the last group.');
          default:
            return t('stem.multtable.mis_other', 'Not this time.');
        }
      }
      function mistakeLabel(kind) {
        switch (kind) {
          case 'added': return t('stem.multtable.kind_added', 'Added instead of multiplied');
          case 'product': return t('stem.multtable.kind_product', 'Gave the product for a division or missing-factor question');
          case 'divisorEcho': return t('stem.multtable.kind_divisor_echo', 'Repeated the number given');
          case 'subtracted': return t('stem.multtable.kind_subtracted', 'Subtracted once instead of dividing');
          case 'swapped': return t('stem.multtable.kind_swapped', 'Swapped digits');
          case 'neighbour': return t('stem.multtable.kind_neighbour', 'Neighbouring fact (one group off)');
          case 'offByOne': return t('stem.multtable.kind_off_by_one', 'Quotient one group off');
          case 'identity': return t('stem.multtable.kind_identity', 'Times-1 rule');
          case 'anchorEcho': return t('stem.multtable.kind_anchor_echo', 'Repeated the known fact');
          case 'close': return t('stem.multtable.kind_close', 'Counting slip');
          case 'quotientEcho': return t('stem.multtable.kind_quotient_echo', 'Repeated the answer already in the equation');
          case 'offByOneDivisor': return t('stem.multtable.kind_off_by_one_divisor', 'Divisor one off');
          case 'dividedInstead': return t('stem.multtable.kind_divided_instead', 'Divided instead of undoing the division');
          case 'oneGroupOff': return t('stem.multtable.kind_one_group_off', 'Total one group off');
          case 'onePrime': return t('stem.multtable.kind_one_prime', 'Called 1 prime');
          case 'oneComposite': return t('stem.multtable.kind_one_composite', 'Called 1 composite');
          case 'neitherOnlyOne': return t('stem.multtable.kind_neither_only_one', 'Called a number other than 1 "neither"');
          case 'twoEven': return t('stem.multtable.kind_two_even', 'Thought 2 is not prime because it is even');
          case 'primeHasPair': return t('stem.multtable.kind_prime_has_pair', 'Called a prime composite');
          case 'oddPrime': return t('stem.multtable.kind_odd_prime', 'Thought every odd number is prime');
          case 'evenPrime': return t('stem.multtable.kind_even_prime', 'Called an even number above 2 prime');
          case 'biggerMore': return t('stem.multtable.kind_bigger_more', 'Thought a bigger number has more factors');
          case 'countAgain': return t('stem.multtable.kind_count_again', 'Miscounted factors');
          case 'factorNotMultiple': return t('stem.multtable.kind_factor_not_multiple', 'Mixed up factors and multiples');
          case 'notAMultiple': return t('stem.multtable.kind_not_a_multiple', 'Called a non-multiple a multiple');
          case 'missedMultiple': return t('stem.multtable.kind_missed_multiple', 'Missed a multiple');
          case 'addForMult': return t('stem.multtable.kind_add_for_mult', 'Word problem: added equal groups instead of multiplying');
          case 'timesAsManyAdd': return t('stem.multtable.kind_times_as_many_add', 'Word problem: read "times as many" as "more"');
          case 'divForMult': return t('stem.multtable.kind_div_for_mult', 'Word problem: divided when the total was unknown');
          case 'subForMult': return t('stem.multtable.kind_sub_for_mult', 'Word problem: subtracted when groups join');
          case 'multForDiv': return t('stem.multtable.kind_mult_for_div', 'Word problem: multiplied when the total was given');
          case 'timesAsManyMult': return t('stem.multtable.kind_times_as_many_mult', 'Word problem: multiplied to find the smaller amount');
          case 'subForDiv': return t('stem.multtable.kind_sub_for_div', 'Word problem: took away once instead of dividing');
          case 'addForDiv': return t('stem.multtable.kind_add_for_div', 'Word problem: added when the total was given');
          case 'oneStepOnly': return t('stem.multtable.kind_one_step_only', 'Two-step problem: stopped after one step');
          case 'firstStepOp': return t('stem.multtable.kind_first_step_op', 'Two-step problem: wrong first step');
          case 'secondStepOp': return t('stem.multtable.kind_second_step_op', 'Two-step problem: wrong second step');
          case 'addedNotSub': return t('stem.multtable.kind_added_not_sub', 'Added instead of subtracting');
          case 'subNotAdd': return t('stem.multtable.kind_sub_not_add', 'Subtracted instead of adding');
          case 'divReverse': return t('stem.multtable.kind_div_reverse', 'Fact family: turned a division around');
          case 'addFamily': return t('stem.multtable.kind_add_family', 'Fact family: included + or − facts');
          case 'familyMissing': return t('stem.multtable.kind_family_missing', 'Fact family: missed a member');
          default: return t('stem.multtable.kind_other', 'Other');
        }
      }
      function strategyText(ch) {
        if (ch.mode === 'divmiss') {
          var dq = { d: Number(ch.divisor), q: divmissQuotient(ch), p: ch.a * ch.b };
          if (ch.form === 'divisor') return fmt(t('stem.multtable.hint_divisor_unknown', 'Think multiplication: ? × {q} = {p}. Count by {q}s until you reach {p}, then count how many jumps you made.'), dq);
          return fmt(t('stem.multtable.hint_dividend_unknown', 'Undo the division with multiplication: the missing number is {d} × {q}. Count by {q}s, {d} times.'), dq);
        }
        if (ch.mode === 'div' || ch.mode === 'missing') {
          var d = ch.mode === 'div' ? Number(ch.divisor) : Number(ch.known), p = ch.a * ch.b;
          var think = fmt(t('stem.multtable.hint_think_mult', 'Think multiplication: {d} × ? = {p}.'), { d: d, p: p });
          var how;
          if (d === 1) how = t('stem.multtable.hint_div_1', 'Dividing by 1 leaves the number the same.');
          else if (d === 2) how = fmt(t('stem.multtable.hint_div_2', 'Dividing by 2 is halving. What is half of {p}?'), { p: p });
          else if (d === 10) how = fmt(t('stem.multtable.hint_div_10', 'Dividing by 10: take the zero off the end of {p}.'), { p: p });
          else if (d === 5) how = fmt(t('stem.multtable.hint_div_5', 'Count by 5s until you reach {p}, then count how many jumps you made.'), { p: p });
          else how = fmt(t('stem.multtable.hint_div_count', 'Count by {d}s until you reach {p}, then count how many jumps you made.'), { d: d, p: p });
          return think + ' ' + how;
        }
        if (ch.mode === 'derive' && ch.anchor) {
          var diff = ch.b - Number(ch.anchor);
          var vals = { a: ch.a, b: ch.b, n: ch.anchor, k: ch.a * ch.anchor, m: Math.abs(diff) };
          if (diff > 0) return fmt(diff === 1 ? t('stem.multtable.hint_derive_more_one', 'Start from {a} × {n} = {k}. {a} × {b} is one more group of {a}.') : t('stem.multtable.hint_derive_more', 'Start from {a} × {n} = {k}. {a} × {b} is {m} more groups of {a}.'), vals);
          return fmt(diff === -1 ? t('stem.multtable.hint_derive_less_one', 'Start from {a} × {n} = {k}. {a} × {b} is one group of {a} fewer.') : t('stem.multtable.hint_derive_less', 'Start from {a} × {n} = {k}. {a} × {b} is {m} groups of {a} fewer.'), vals);
        }
        var s = strategyFor(ch.a, ch.b), v = { n: s.n };
        switch (s.id) {
          case 'x1': return t('stem.multtable.hint_x1', 'Any number times 1 stays the same number.');
          case 'x10': return fmt(t('stem.multtable.hint_x10', 'Times 10: write {n}, then put a zero on the end.'), v);
          case 'x2': return fmt(t('stem.multtable.hint_x2', 'Times 2 means double it: {n} + {n}.'), v);
          case 'x11': return t('stem.multtable.hint_x11', '11 times a single digit: write that digit twice.');
          case 'x5': return fmt(t('stem.multtable.hint_x5', 'Times 5 is half of times 10. Find {n} × 10, then take half.'), v);
          case 'x9': return fmt(t('stem.multtable.hint_x9', 'Times 9 is one group less than times 10: {n} × 10 − {n}.'), v);
          case 'x4': return fmt(t('stem.multtable.hint_x4', 'Times 4 is double, then double again. Double {n}, then double that.'), v);
          case 'x3': return fmt(t('stem.multtable.hint_x3', 'Times 3 is a double plus one more group: {n} + {n} + {n}.'), v);
          case 'x6': return fmt(t('stem.multtable.hint_x6', 'Times 6 is times 5 plus one more group: {n} × 5 + {n}.'), v);
          case 'x7': return fmt(t('stem.multtable.hint_x7', 'Split the rows: times 7 is times 5 plus times 2. Find {n} × 5 and {n} × 2, then add.'), v);
          case 'x12': return fmt(t('stem.multtable.hint_x12', 'Split 12 into 10 + 2. Find {n} × 10 and {n} × 2, then add.'), v);
          case 'x8': return fmt(t('stem.multtable.hint_x8', 'Times 8 is double three times: double {n}, double again, then double once more.'), v);
          default: return fmt(t('stem.multtable.hint_x11_split', 'Split 11 into 10 + 1. Find {n} × 10 and {n} × 1, then add.'), v);
        }
      }
      function derivedText(f) {
        switch (f.id) {
          case 'twin': return fmt(t('stem.multtable.derived_twin', 'Turn it around: {b} × {a} = {p}. Same dots, turned sideways.'), f);
          case 'addGroup': return fmt(t('stem.multtable.derived_add_group', 'From {a} × {b1} = {k}, add one more group of {a}: {k} + {a} = {p}.'), f);
          case 'removeGroup': return fmt(t('stem.multtable.derived_remove_group', 'From {a} × {b1} = {k}, take away one group of {a}: {k} − {a} = {p}.'), f);
          case 'split': return fmt(t('stem.multtable.derived_split', 'Split {b} into {s1} + {s2}: {a} × {s1} = {k1} and {a} × {s2} = {k2}, so {k1} + {k2} = {p}.'), f);
          case 'double': return fmt(t('stem.multtable.derived_double', 'Double a half: {a} × {half} = {k}, and double {k} is {p}.'), f);
          default: return '';
        }
      }
      function modeName(id) {
        switch (id) {
          case 'mult': return t('stem.multtable.multiplication', 'Multiplication');
          case 'div': return t('stem.multtable.division', 'Division');
          case 'missing': return t('stem.multtable.missing_factor', 'Missing factor');
          case 'equations': return t('stem.multtable.missing_numbers', 'Missing numbers (× and ÷)');
          case 'divmiss': return t('stem.multtable.missing_division', 'Missing number in division');
          case 'derive': return t('stem.multtable.use_known_fact', 'Use a fact I know');
          default: return t('stem.multtable.mixed', 'Mixed');
        }
      }
      function bandName(id) {
        if (id === 'early') return t('stem.multtable.band_early', 'Arrays with 2s, 5s and 10s');
        if (id === 'core') return t('stem.multtable.band_core', 'All facts to 10');
        return t('stem.multtable.band_extend', 'Division and missing factors');
      }

      // ── Badge checker (one award per badge; speed badges carry no XP) ──
      function checkBadges(updates) {
        var changed = {};
        var badges = Object.assign({}, _ext.badges);
        Object.keys(updates).forEach(function(key) {
          if (updates[key] && !badges[key]) {
            changed[key] = true;
            badges[key] = true;
          }
        });
        if (Object.keys(changed).length > 0) {
          extUpd({ badges: badges });
          Object.keys(changed).forEach(function(bid) {
            var badge = BADGES.find(function(b) { return b.id === bid; });
            if (badge) {
              playSound('badge');
              var msg = fmt(t('stem.multtable.badge_earned', 'Badge earned: {name}!'), { name: badgeText(bid).label });
              addToast(badge.icon + ' ' + msg, 'success');
              announceToSR(msg);
              if (!NO_XP_BADGES[bid] && typeof awardXP === 'function') awardXP('multtable', 15, 'badge');
            }
          });
        }
      }

      // ── Challenges ──
      function newChallengeId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
      function challengeKey(ch) { return ch ? (ch.id || (ch.mode + ':' + ch.a + 'x' + ch.b + ':' + (ch.divisor || '') + ':' + (ch.known || ''))) : ''; }
      function factIdentity(ch) { return missedFactIdentity({ a: ch.a, b: ch.b, mode: ch.mode === 'derive' ? 'mult' : ch.mode, divisor: ch.divisor, known: ch.known, form: ch.form, answer: factAnswer(ch) }); }
      function pickMode(modeOverride) {
        var qm = modeOverride || quizMode;
        // Missing numbers in × and ÷ (3.OA.4): a × ? = p, ? × b = p, ? ÷ d = q, p ÷ ? = q.
        if (qm === 'equations') return Math.random() < 0.5 ? 'missing' : 'divmiss';
        if (qm !== 'mixed') return qm;
        var r = Math.random();
        return r < 0.35 ? 'mult' : (r < 0.6 ? 'div' : (r < 0.8 ? 'missing' : 'divmiss'));
      }
      function buildChallenge(a, b, mode, source, extra) {
        var ch = { a: a, b: b, mode: mode, divisor: null, source: source || 'tool', id: newChallengeId() };
        if (mode === 'div' || mode === 'divmiss') ch.divisor = (extra && (extra.divisor === a || extra.divisor === b)) ? extra.divisor : (Math.random() < 0.5 ? a : b);
        if (mode === 'divmiss') ch.form = (extra && (extra.form === 'dividend' || extra.form === 'divisor')) ? extra.form : (Math.random() < 0.5 ? 'dividend' : 'divisor');
        if (mode === 'missing') ch.known = (extra && (extra.known === a || extra.known === b)) ? extra.known : (Math.random() < 0.5 ? a : b);
        if (mode === 'derive') { var d = deriveAnchor(a, b, Math.random); ch.a = d.keep; ch.b = d.vary; ch.anchor = d.anchor; }
        return ch;
      }
      function focusKeys() {
        var f = {};
        (visit.missed || []).concat(_mt.missed || []).forEach(function(m) { f[tkey(Number(m.a), Number(m.b))] = true; });
        return f;
      }
      function chooseFactors(difficulty) {
        if (difficulty === 'adaptive') {
          var pick = pickAdaptiveFact(factPool(preset.smartPool), factScores, focusKeys(), visit.recent, Math.random);
          return { a: pick.a, b: pick.b };
        }
        return pickFactors(difficulty, _mt.adaptiveHistory || []);
      }
      function drillItemId(it) { return missedFactIdentity(it); }
      function nextDrillItem(drill) {
        var items = Array.isArray(drill.items) ? drill.items : [];
        var cleared = drill.cleared || {};
        var left = items.filter(function(it) { return !cleared[drillItemId(it)]; });
        if (!left.length) return null;
        var notLast = left.filter(function(it) { return drillItemId(it) !== drill.last; });
        return (notLast.length ? notLast : left)[0];
      }
      function focusInputSoon() {
        setTimeout(function() { var inp = document.getElementById('multtable-input'); if (inp && !inp.disabled) inp.focus(); }, 30);
      }
      // After the control just used is disabled or removed, focus the control that comes next.
      function focusSoon(sel) {
        setTimeout(function() { var el = document.querySelector('[data-multtable-root] ' + sel); if (el && !el.disabled && typeof el.focus === 'function') el.focus(); }, 30);
      }
      // Open the Arrays tab on a fact; the button that did it is gone, so focus the prediction (or the first row once built).
      function openArrays(patch) {
        extUpd(Object.assign({ mtTab: 'visual' }, patch));
        focusAndShow(['[data-mt-predict-input]', '[data-mt-skiprow][tabindex="0"]'], 'visual');
      }
      function setChallenge(ch) {
        if (labToolData._multAdvanceTimer) {
          clearTimeout(labToolData._multAdvanceTimer);
          setLabToolData(function(previous) { return Object.assign({}, previous, { _multAdvanceTimer: null }); });
        }
        setMultTableChallenge(ch);
        setMultTableAnswer('');
        setMultTableFeedback(null);
        setHighlightCell(null);
        setInputDisabled(false);
      }
      // ── Generate next problem ──
      function nextProblem(opts) {
        opts = opts || {};
        var drill = (!opts.ignoreDrill && _mt.drill && _mt.drill.active) ? _mt.drill : null;
        var ch = null;
        if (drill) {
          var item = nextDrillItem(drill);
          if (item) ch = buildChallenge(item.a, item.b, item.mode, 'drill', item);
        }
        if (!ch) {
          var f = chooseFactors(opts.difficulty || exploreDifficulty);
          ch = buildChallenge(f.a, f.b, pickMode(opts.mode), 'tool');
        }
        setChallenge(ch);
        var k = tkey(ch.a, ch.b);
        extUpd({ visit: visitPatch({ recent: [k].concat((visit.recent || []).filter(function(x) { return x !== k; })).slice(0, 4), aiHint: null }) });
      }
      var nextProblemRef = React.useRef(null);
      nextProblemRef.current = nextProblem;
      // A fact the learner picked from the table or heatmap: practice only, no XP.
      function practiseChosen(a, b) {
        var mode = quizMode === 'derive' ? 'mult' : pickMode();
        setChallenge(buildChallenge(a, b, mode, 'chosen'));
        extUpd({ mtTab: 'practice' });
        focusInputSoon();
      }

      // ── Check answer ──
      // React may batch two click/Enter activations before _multInputDisabled is
      // rendered back through ctx. Keep a render-local latch as well so the
      // same problem cannot score or award twice during that gap.
      var multSubmissionPending = false;
      function checkMult() {
        var ch = multTableChallenge;
        if (!ch || answerLocked || multSubmissionPending) return;
        var given = parseWholeAnswer(multTableAnswer);
        if (given === null) {
          setMultTableFeedback(Object.assign({}, multTableFeedback || {}, { note: 'wholeNumber' }));
          announceToSR(t('stem.multtable.whole_number_needed', 'Type a whole number, then check.'));
          return;
        }
        multSubmissionPending = true;
        var key = challengeKey(ch);
        var fb = multTableFeedback;
        var priorTries = (fb && fb.retry && fb.forKey === key) ? (fb.tries || 1) : 0;
        var tries = priorTries + 1;
        var ok = given === factAnswer(ch);
        var timed = !!(_mt.active && !_mt.paused);
        var diag = ok ? null : diagnoseMistake(ch, given);
        var tally = Object.assign({}, visit.tally);
        if (diag) tally[diag.kind] = (tally[diag.kind] || 0) + 1;
        if (!ok && !timed && tries < maxTries) {
          playSound('wrong');
          setMultTableFeedback({ correct: false, retry: true, tries: tries, forKey: key, lastWrong: given, mistake: diag });
          setMultTableAnswer('');
          extUpd({ visit: visitPatch({ tally: tally }) });
          announceToSR(mistakeText(diag, ch) + ' ' + t('stem.multtable.try_again_hint', 'Try again. A strategy hint is below.'));
          focusInputSoon();
          return;
        }
        resolveChallenge(ch, ok, tries, ok ? null : given, ok ? (fb && fb.forKey === key ? fb.mistake : null) : diag, tally);
      }
      // "Show the answer" after the hints: the item closes with no credit.
      function revealNow() {
        var ch = multTableChallenge, fb = multTableFeedback;
        if (!ch || answerLocked || multSubmissionPending) return;
        multSubmissionPending = true;
        resolveChallenge(ch, false, (fb && fb.tries) || 1, fb ? fb.lastWrong : null, fb ? fb.mistake : null, visit.tally);
      }
      function resolveChallenge(ch, ok, tries, lastWrong, mistake, tally) {
        var a = Number(ch.a), b = Number(ch.b);
        var correct = factAnswer(ch);
        var firstTry = ok && tries === 1;
        var fk = tkey(a, b);
        var xid = factIdentity(ch);
        var timed = !!(_mt.active && !_mt.paused);
        announceToSR(ok
          ? (firstTry ? t('stem.multtable.sr_correct', 'Correct!') : t('stem.multtable.sr_correct_retry', 'Correct on this try. Well reasoned!')) + ' ' + solvedText(ch)
          : fmt(t('stem.multtable.sr_revealed', 'The answer is {answer}. Review the feedback before the next question.'), { answer: solvedText(ch) }));
        playSound(ok ? 'correct' : 'wrong');

        // A fact picked from the table (its answer on screen) is practice only: it leaves
        // mastery, the smart-practice history and the streak (and so streak badges) alone.
        var practiceOnly = ch.source === 'chosen';
        // Per-fact mastery (persistent): one attempt per item, right only on the first try.
        var prevScore = factScores[fk] || { attempts: 0, correct: 0 };
        var newFactScores = Object.assign({}, factScores);
        if (!practiceOnly) newFactScores[fk] = { attempts: (Number(prevScore.attempts) || 0) + 1, correct: (Number(prevScore.correct) || 0) + (firstTry ? 1 : 0) };

        var newHistory = practiceOnly ? (_mt.adaptiveHistory || []) : (_mt.adaptiveHistory || []).concat([{ correct: firstTry }]);
        if (newHistory.length > 20) newHistory = newHistory.slice(-20);
        var newStreak = practiceOnly ? (_mt.streak || 0) : firstTry ? (_mt.streak || 0) + 1 : 0;
        if (!practiceOnly && firstTry && newStreak >= 3 && newStreak % 5 === 0) playSound('streak');

        setMultTableFeedback({
          correct: ok, resolved: true, firstTry: firstTry, revealed: !ok, tries: tries, forKey: challengeKey(ch),
          lastWrong: lastWrong, mistake: mistake || null, streak: practiceOnly ? 0 : newStreak,
          isTricky: isTrickyFact(a, b), trickKey: fk,
          msg: ok ? solvedText(ch) : fmt(t('stem.multtable.answer_is', 'The answer is {answer}.'), { answer: solvedText(ch) })
        });
        setExploreScore(function(prev) {
          prev = prev || { correct: 0, total: 0 };
          return { correct: (prev.correct || 0) + (ok ? 1 : 0), total: (prev.total || 0) + 1 };
        });

        // Fair XP: tool-chosen fact, answer never shown, once per fact per visit.
        var revealedMap = Object.assign({}, visit.revealed);
        var xpMap = Object.assign({}, visit.xp);
        var counts = ch.source !== 'chosen';
        if (ok && counts && ch.source !== 'drill' && !xpMap[xid] && !revealedMap[fk]) {
          xpMap[xid] = true;
          if (typeof awardXP === 'function') awardXP('multtable', firstTry ? 5 : 2, firstTry ? 'multiplication fact' : 'multiplication fact, second try');
        }
        if (!ok) revealedMap[fk] = true;

        // Missed list for this visit (anything not right first time).
        var missedEntry = { a: a, b: b, answer: correct, mode: ch.mode === 'derive' ? 'mult' : ch.mode, divisor: (ch.mode === 'div' || ch.mode === 'divmiss') ? ch.divisor : null, known: ch.mode === 'missing' ? ch.known : null };
        if (ch.mode === 'divmiss') missedEntry.form = ch.form;
        var visitMissed = (visit.missed || []).slice();
        if (!firstTry && !visitMissed.some(function(m) { return missedFactIdentity(m) === missedFactIdentity(missedEntry); })) visitMissed.push(missedEntry);
        var worked = Object.assign({}, visit.worked);
        // Same grouping the worked example reads (renderFactStrategy's isDiv).
        var wk = (ch.mode === 'div' || ch.mode === 'missing' || ch.mode === 'divmiss') ? 'div' : 'split';
        worked[wk] = (worked[wk] || 0) + 1;

        var timerPatch = { streak: newStreak, adaptiveHistory: newHistory };
        if (_mt.active) {
          timerPatch.score = _mt.score + (ok ? 1 : 0);
          timerPatch.total = _mt.total + 1;
          timerPatch.missed = ok ? (_mt.missed || []) : (_mt.missed || []).concat([missedEntry]);
        }
        if (ch.source === 'drill' && _mt.drill && _mt.drill.active) {
          var drill = Object.assign({}, _mt.drill, { cleared: Object.assign({}, _mt.drill.cleared || {}), last: missedFactIdentity(missedEntry) });
          if (firstTry) drill.cleared[missedFactIdentity(missedEntry)] = true;
          var remaining = (drill.items || []).filter(function(it) { return !drill.cleared[drillItemId(it)]; }).length;
          if (!remaining) {
            drill.active = false; drill.done = true;
            var doneMsg = fmt(t('stem.multtable.drill_done', 'Practice set cleared: all {n} facts right on the first try.'), { n: (drill.items || []).length });
            addToast('🎯 ' + doneMsg, 'success');
            announceToSR(doneMsg);
          }
          timerPatch.drill = drill;
        }
        _mtUpd(timerPatch);

        if (!ok) {
          setHighlightCell({ r: a, c: b });
          if (multTableHidden) {
            setMultTableRevealed(function(prev) {
              var ns = new Set(prev);
              ns.add((a - 1) + '-' + (b - 1));
              return ns;
            });
          }
        }

        var extPatch = { factScores: newFactScores, visit: visitPatch({ xp: xpMap, revealed: revealedMap, missed: visitMissed, tally: tally || visit.tally, worked: worked }) };
        if (ok && counts) {
          var newTotal = (_ext.totalCorrect || 0) + 1;
          var newSession = sessionCorrectNow + 1;
          var newHidden = multTableHidden ? (_ext.hiddenCorrect || 0) + 1 : (_ext.hiddenCorrect || 0);
          var newSquares = Object.assign({}, _ext.squaresAnswered || {});
          if (a === b) newSquares[a] = true;
          var newRows = Object.assign({}, _ext.rowsAnswered || {});
          newRows[a] = true;
          newRows[b] = true;
          var newTricky = (_ext.trickySolved || 0) + (isTrickyFact(a, b) ? 1 : 0);
          // Per-direction counts feed the "Start here" ticks (division, missing numbers, strategies).
          var newModes = Object.assign({}, (_ext.modeCorrect && typeof _ext.modeCorrect === 'object') ? _ext.modeCorrect : {});
          if (ch.source !== 'drill' && MODE_COUNT_IDS.indexOf(ch.mode) !== -1) newModes[ch.mode] = pathCount(newModes[ch.mode]) + 1;
          Object.assign(extPatch, { totalCorrect: newTotal, sessionCorrect: newSession, sessionVisit: mtVisit, hiddenCorrect: newHidden, squaresAnswered: newSquares, rowsAnswered: newRows, trickySolved: newTricky, modeCorrect: newModes });
          extUpd(extPatch);
          var reachedHard = exploreDifficulty === 'adaptive' && getAdaptiveRange(newHistory) === DIFFICULTY.hard;
          checkBadges({
            firstCorrect: newTotal >= 1,
            streak5: newStreak >= 5,
            streak10: newStreak >= 10,
            streak20: newStreak >= 20,
            squareMaster: Object.keys(newSquares).length >= 12,
            hiddenHero: newHidden >= 10,
            adaptiveAce: reachedHard,
            centurion: newTotal >= 100,
            mathlete: newSession >= 50,
            trickyMaster: newTricky >= 10,
            patternFinder: Object.keys(_ext.patternsExplored || {}).length >= 5,
            visualLearner: Object.keys(_ext.visualExplored || {}).length >= 10
          });
        } else {
          extUpd(extPatch);
        }

        // Keep untimed feedback available until the learner chooses to continue.
        setInputDisabled(true);
        // The input is now disabled: move focus to "Next question" so it is not dropped.
        focusSoon('[data-mt-next]');
        if (!timed) return;
        var delay = ok ? 1200 : 2200;
        var _advanceTimer = setTimeout(function() {
          setLabToolData(function(previous) { return Object.assign({}, previous, { _multAdvanceTimer: null }); });
          // Through the ref: this render's nextProblem holds the visit from before this answer,
          // and would write that stale ledger (XP-once, reveals, missed list) back.
          (nextProblemRef.current || nextProblem)();
          // After the render that re-enables the box. A learner who has moved to another control stays there.
          setTimeout(function() {
            var _inp = document.getElementById('multtable-input');
            var _ae = document.activeElement;
            if (_inp && !_inp.disabled && (!_ae || _ae === document.body || (_ae.closest && _ae.closest('[data-mt-challenge]')))) _inp.focus();
          }, 30);
        }, delay);
        setLabToolData(function(prev) { return Object.assign({}, prev, { _multAdvanceTimer: _advanceTimer }); });
      }

      // ── Speed Run ──
      function startSpeedRun() {
        if (!speedAllowed) return;
        nextProblem({ ignoreDrill: true });
        _mtUpd({ active: true, paused: false, endTime: Date.now() + 120000, score: 0, total: 0, timeLeft: 120, streak: 0, missed: [], adaptiveHistory: [], ended: false, endedEarly: false, drill: null });
        playSound('speedStart');
        var msg = t('stem.multtable.speed_started', 'Speed Run started: 2 minutes on the clock.');
        addToast('⏱️ ' + msg, 'success');
        announceToSR(msg);
        focusInputSoon();
      }
      function finishRun(early) {
        var tm = mtRef.current || _mt;
        if (!tm.active) return;
        var left = early ? Math.max(0, Math.round(((tm.paused ? Date.now() + (tm.timeLeft || 0) * 1000 : tm.endTime) - Date.now()) / 1000)) : 0;
        _mtUpd({ active: false, paused: false, ended: true, endedEarly: !!early, timeLeft: left });
        playSound('speedEnd');
        var msg = fmt(t('stem.multtable.run_over', 'Speed Run over: {score} of {total} correct.'), { score: tm.score || 0, total: tm.total || 0 });
        addToast('⏱️ ' + msg, 'info');
        announceToSR(msg);
        checkBadges({
          speedRunner: !early,
          speedDemon: (tm.score || 0) >= 20,
          perfectRun: (tm.total || 0) >= 10 && tm.score === tm.total
        });
      }
      finishRef.current = finishRun;
      function stopRunQuietly() {
        if (_mt.active) _mtUpd({ active: false, paused: false });
      }

      // ── Practice set (drill the missed facts until each is right first time) ──
      function getUniqueMissed(missed) {
        var seen = {};
        return (missed || []).filter(function(m) {
          var key = missedFactIdentity(m);
          if (seen[key]) return false;
          seen[key] = true;
          return true;
        });
      }
      function startDrill(list) {
        var items = getUniqueMissed(list).map(function(m) {
          var mode = missedFactMode(m);
          return { a: Number(m.a), b: Number(m.b), mode: mode, divisor: (mode === 'div' || mode === 'divmiss') ? missedFactDivisor(m) : null, known: mode === 'missing' ? missedFactKnown(m) : null, form: mode === 'divmiss' ? m.form : undefined };
        }).filter(function(it) { return it.a >= 1 && it.a <= 12 && it.b >= 1 && it.b <= 12; });
        if (!items.length) return;
        var first = items[0];
        setChallenge(buildChallenge(first.a, first.b, first.mode, 'drill', first));
        _mtUpd({ active: false, paused: false, score: 0, total: 0, timeLeft: 120, ended: false, endedEarly: false, missed: _mt.missed, drill: { active: true, items: items, cleared: {}, last: null, done: false } });
        extUpd({ mtTab: 'practice' });
        announceToSR(fmt(t('stem.multtable.drill_started', 'Practice set started: {n} facts. Answer each one right on the first try to clear it.'), { n: items.length }));
        focusInputSoon();
      }

      // ── AI hint: only through the host's guarded getHint, never raw callGemini ──
      var aiCanAsk = typeof ctx.getHint === 'function' && ctx.aiHintsEnabled !== false && ctx.aiAvailable !== false && ctx.callGemini !== null;
      function setAiHint(key, text) {
        setLabToolData(function(prev) {
          var ext = prev._multExt || {};
          var v = (ext.visit && ext.visit.id === mtVisit) ? ext.visit : { id: mtVisit };
          return Object.assign({}, prev, { _multExt: Object.assign({}, ext, { visit: Object.assign({}, v, { aiHint: { key: key, text: String(text) } }) }) });
        });
        announceToSR(String(text));
      }
      function requestAIHint() {
        var ch = multTableChallenge, fb = multTableFeedback;
        if (!aiCanAsk || !ch || !fb || !fb.retry) return;
        var key = challengeKey(ch);
        try {
          ctx.getHint('multtable', questionText(ch), String(fb.lastWrong), String(factAnswer(ch)), fb.tries || 0, function(text) { setAiHint(key, text); });
        } catch (e) {
          setAiHint(key, t('stem.multtable.ai_unavailable', 'The AI hint is not available right now. Use the strategy hint above.'));
        }
      }

      // ── Keyboard shortcuts: only while the practice panel itself has focus ──
      var kbRef = React.useRef(null);
      kbRef.current = function(e) {
        // The listener lives on window, so it must check the tool is on screen.
        if (!document.querySelector('[data-multtable-command]')) return;
        // WCAG 2.1.4: single-key shortcuts act only while focus is inside this tool.
        var mtRoot = document.querySelector('[data-multtable-root]');
        if (!mtRoot || !e.target || !mtRoot.contains(e.target)) return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        // Never from a control: a focused button, field, tab or grid cell keeps its own keys.
        if (e.target.closest && e.target.closest('button, input, select, textarea, summary, a, [role="gridcell"], [role="tab"], [contenteditable="true"]')) return;
        var key = String(e.key || '').toLowerCase();
        if (key === 'q') { e.preventDefault(); nextProblem(); focusInputSoon(); }
        if (key === 's' && !_mt.active) { e.preventDefault(); startSpeedRun(); }
        if (key === 'h') { e.preventDefault(); setMultTableHidden(!multTableHidden); setMultTableRevealed(new Set()); }
        if (key === '?' || key === 'c' || (e.shiftKey && key === '/')) { e.preventDefault(); extUpd({ showCoach: !coachOpen, showAI: false }); }
        if (key === 'b') { e.preventDefault(); extUpd({ showBadges: !_ext.showBadges }); }
      };
      React.useEffect(function() {
        var handler = function(e) { if (kbRef.current) kbRef.current(e); };
        window.addEventListener('keydown', handler);
        return function() { window.removeEventListener('keydown', handler); };
      }, []);

      // ── Count earned badges ──
      var earnedBadges = BADGES.filter(function(b) { return _ext.badges[b.id]; });
      var earnedCount = earnedBadges.length;

      var challengeOpen = !!(multTableChallenge && !inputDisabled && !(multTableFeedback && multTableFeedback.resolved));

      // ── Roving-tabindex grids (full table + mastery heatmap) ──
      function gridKeyDown(e, gridId, r, c, onActivate) {
        var nr = r, nc = c, k = e.key;
        if (k === 'ArrowRight') nc = Math.min(maxNum, c + 1);
        else if (k === 'ArrowLeft') nc = Math.max(1, c - 1);
        else if (k === 'ArrowDown') nr = Math.min(maxNum, r + 1);
        else if (k === 'ArrowUp') nr = Math.max(1, r - 1);
        else if (k === 'Home') { nc = 1; if (e.ctrlKey) nr = 1; }
        else if (k === 'End') { nc = maxNum; if (e.ctrlKey) nr = maxNum; }
        else if (k === 'Enter' || k === ' ') { e.preventDefault(); onActivate(r, c); return; }
        else return;
        e.preventDefault();
        setGridFocus(function(prev) { var p = Object.assign({}, prev); p[gridId] = { r: nr, c: nc }; return p; });
        var table = e.currentTarget && e.currentTarget.closest ? e.currentTarget.closest('table') : null;
        var next = table && table.querySelector('[data-r="' + nr + '"][data-c="' + nc + '"]');
        if (next) next.focus();
      }
      function renderGrid(opts) {
        var pos = gridFocus[opts.id] || { r: 1, c: 1 };
        var headCells = [h('th', { key: 'corner', scope: 'col', role: 'columnheader', className: opts.headClass + ' w-8 h-8' }, '×')];
        for (var hc = 1; hc <= maxNum; hc++) {
          headCells.push(h('th', { key: 'h' + hc, scope: 'col', role: 'columnheader', className: opts.headClass + ' w-8 h-8', style: opts.headStyle ? opts.headStyle('c', hc) : null }, hc));
        }
        var bodyRows = [];
        for (var r = 1; r <= maxNum; r++) {
          var cells = [h('th', { key: 'rh', scope: 'row', role: 'rowheader', className: opts.headClass + ' w-8 h-8', style: opts.headStyle ? opts.headStyle('r', r) : null }, r)];
          for (var c = 1; c <= maxNum; c++) {
            (function(r, c) {
              var cell = opts.cell(r, c);
              cells.push(h('td', {
                key: 'c' + c, role: 'gridcell', 'data-r': r, 'data-c': c,
                tabIndex: pos.r === r && pos.c === c ? 0 : -1,
                'aria-label': cell.label,
                'aria-selected': cell.selected ? 'true' : undefined,
                onClick: function() { setGridFocus(function(prev) { var p = Object.assign({}, prev); p[opts.id] = { r: r, c: c }; return p; }); opts.onActivate(r, c); },
                onKeyDown: function(e) { gridKeyDown(e, opts.id, r, c, opts.onActivate); },
                className: cell.className, style: cell.style
              }, cell.text));
            })(r, c);
          }
          bodyRows.push(h('tr', { key: 'r' + r, role: 'row' }, cells));
        }
        return h('table', { role: 'grid', 'aria-label': opts.label, 'aria-describedby': opts.describedBy, 'data-mt-grid': opts.id, className: 'border-collapse mx-auto text-center' },
          h('caption', { className: 'sr-only' }, opts.caption),
          h('thead', null, h('tr', { role: 'row' }, headCells)),
          h('tbody', null, bodyRows));
      }

      // The facts being asked right now (Practice or the fluency round). Showing one elsewhere counts as a reveal.
      function openFactKeys() {
        var o = {};
        if (challengeOpen) o[tkey(Number(multTableChallenge.a), Number(multTableChallenge.b))] = true;
        var fi = flu && flu.phase === 'play' && !flu.resolved ? flu.round[flu.i] : null;
        if (fi) o[tkey(Number(fi.a), Number(fi.b))] = true;
        return o;
      }
      function noteShownIfOpen(a, b) {
        var k = tkey(a, b);
        if (!openFactKeys()[k]) return;
        setLabToolData(function(prev) {
          var e0 = prev._multExt || {};
          var v0 = (e0.visit && e0.visit.id === mtVisit) ? e0.visit : visit;
          var rv = Object.assign({}, v0.revealed); rv[k] = true;
          return Object.assign({}, prev, { _multExt: Object.assign({}, e0, { visit: Object.assign({}, v0, { revealed: rv }) }) });
        });
      }
      // ═══ VISUAL TAB: predict, then build the array ═══
      // Memorization comes after understanding: rows of dots with skip-count
      // totals, built only after the learner commits to a prediction.
      var renderVisual = function() {
        var a = visualA, b = visualB;
        var product = a * b;
        var vKey = a + 'x' + b;
        var vp = (_ext.visualPred && _ext.visualPred.key === vKey) ? _ext.visualPred : { key: vKey, guess: '', built: false };
        // An array built earlier does not answer a question opened since, unless the learner builds it again.
        var built = !!vp.built && (!openFactKeys()[tkey(a, b)] || !!(visit.revealed || {})[tkey(a, b)]);
        var trickHere = MEMORY_TRICKS[tkey(a, b)] ? trickText(tkey(a, b)) : '';
        function vpSet(patch) { extUpd({ visualPred: Object.assign({}, vp, patch) }); }
        function buildIt(skip) {
          var guess = skip ? null : parseWholeAnswer(vp.guess);
          if (!skip && guess === null) { announceToSR(t('stem.multtable.predict_first', 'Type a whole-number prediction first, or choose to build without one.')); return; }
          var explored = Object.assign({}, _ext.visualExplored || {});
          explored[tkey(a, b)] = true;
          extUpd({ visualPred: Object.assign({}, vp, { built: true, committed: guess }), visualExplored: explored });
          noteShownIfOpen(a, b);
          playSound(guess === product ? 'correct' : 'default');
          announceToSR(guess === null
            ? (a === 1
              ? fmt(t('stem.multtable.built_no_guess_one', 'Built: 1 row of {b} makes {p} in all.'), { b: b, p: product })
              : fmt(t('stem.multtable.built_no_guess', 'Built: {a} rows of {b} make {p} dots.'), { a: a, b: b, p: product }))
            : guess === product
              ? (a === 1
                ? fmt(t('stem.multtable.built_match_one', 'Your prediction of {g} matches: 1 row of {b} makes {p} in all.'), { g: guess, b: b, p: product })
                : fmt(t('stem.multtable.built_match', 'Your prediction of {g} matches: {a} rows of {b} make {p} dots.'), { g: guess, a: a, b: b, p: product }))
              : fmt(t('stem.multtable.built_differs', 'You predicted {g}. The array has {p} dots.'), { g: guess, p: product }));
          if (Object.keys(explored).length >= 10 && !_ext.badges.visualLearner) checkBadges({ visualLearner: true });
          // The predict card is gone now: move focus to the first row so the learner can skip-count.
          setL({ skipCount: null });
          focusSoon('[data-mt-skiprow="1"]');
        }
        var rowColors = ['#dc2626', '#c2410c', '#b45309', '#15803d', '#0e7490', '#2563eb', '#7c3aed', '#db2777', '#4d7c0f', '#0f766e', '#9333ea', '#be185d'];
        var dotSize = b <= 5 ? 22 : (b <= 8 ? 18 : (b <= 10 ? 15 : 13));
        var dotGap = b <= 8 ? 6 : 4;
        // The dots follow the sliders live; the total stays "?" and the running totals stay hidden until the learner builds.
        // After the build, each row is a button: tapping it skip-counts up to that row and announces the running total.
        var rowH = built || a <= 6 ? 44 : 32;
        var skip = (local.skipCount && local.skipCount.key === vKey) ? local.skipCount : null;
        var counted = built && skip ? Math.max(0, Math.min(a, skip.k || 0)) : 0;
        var rowFocus = built && skip ? Math.max(1, Math.min(a, skip.f || 1)) : 1;
        function countRow(k) {
          setL({ skipCount: { key: vKey, k: k, f: k } });
          announceToSR(fmt(k === 1 ? t('stem.multtable.skip_row_said_one', '1 row of {b} makes {total}.') : t('stem.multtable.skip_row_said', '{k} rows of {b} make {total}.'), { k: k, b: b, total: k * b }));
        }
        function skipRowKey(e, k) {
          var n = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? k + 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? k - 1 : e.key === 'Home' ? 1 : e.key === 'End' ? a : 0;
          if (!n) return;
          e.preventDefault();
          n = Math.max(1, Math.min(a, n));
          setL({ skipCount: { key: vKey, k: counted, f: n } });
          var el = document.querySelector('[data-multtable-root] [data-mt-skiprow="' + n + '"]');
          if (el) el.focus();
        }
        var rows = [];
        for (var ri = 0; ri < a; ri++) {
          var dots = [];
          for (var ci = 0; ci < b; ci++) {
            dots.push(h('div', { key: 'dot-' + ri + '-' + ci, className: 'allo-mt-dot rounded-full', 'aria-hidden': 'true',
              style: { width: dotSize, minWidth: 0, flexShrink: 1, aspectRatio: '1 / 1', alignSelf: 'center', backgroundColor: rowColors[ri % rowColors.length], animationDelay: (built ? ri * 0.04 + ci * 0.015 : 0) + 's' } }));
          }
          var runningTotal = (ri + 1) * b;
          var showTotal = built && (visualSkipOn || ri < counted);
          var totalCol = h('div', { className: 'text-xs font-bold text-amber-900 font-mono w-12 text-right pr-1 shrink-0', style: { fontVariantNumeric: 'tabular-nums' }, 'aria-hidden': 'true', 'data-mt-skip-total': showTotal ? runningTotal : undefined },
            showTotal ? (ri < counted ? '✓ ' : '') + (ri === 0 ? String(b) : '+' + b) : '',
            showTotal ? h('span', { className: 'block text-[0.625rem] text-amber-900' }, '=' + runningTotal) : null);
          var dotRow = h('div', { className: 'flex min-w-0', style: { gap: dotGap } }, dots);
          if (built) {
            rows.push(h('button', { key: 'vrow-' + ri, type: 'button', 'data-mt-skiprow': ri + 1, 'data-counted': ri < counted ? 'true' : 'false', tabIndex: rowFocus === ri + 1 ? 0 : -1,
              'aria-label': fmt(t('stem.multtable.skip_row_label', 'Count row {k} of {n}'), { k: ri + 1, n: a }),
              onClick: (function(k) { return function() { countRow(k); }; })(ri + 1),
              onKeyDown: (function(k) { return function(e) { skipRowKey(e, k); }; })(ri + 1),
              className: 'flex items-center gap-2 rounded-lg border-2 px-1 ' + (ri < counted ? 'bg-amber-100 border-amber-700' : 'bg-white border-transparent hover:border-amber-400'),
              style: { minHeight: rowH, maxWidth: '100%' } }, totalCol, dotRow));
          } else {
            rows.push(h('div', { key: 'vrow-' + ri, className: 'flex items-center gap-2 border-2 border-transparent px-1', style: { minHeight: rowH, maxWidth: '100%' } }, dotRow));
          }
        }
        var countedList = [];
        for (var ck = 1; ck <= counted; ck++) countedList.push(ck * b);
        var committed = vp.committed;
        var predictionNote = null;
        if (built && committed != null) {
          if (committed === product) predictionNote = fmt(t('stem.multtable.predict_matched', 'You predicted {g}, and the array has {p} dots. Your prediction matched!'), { g: committed, p: product });
          else {
            var m = diagnoseMistake({ a: a, b: b, mode: 'mult' }, committed);
            predictionNote = fmt(t('stem.multtable.predict_differs', 'You predicted {g}, and the array has {p} dots.'), { g: committed, p: product }) + (m && m.kind !== 'other' ? ' ' + mistakeText(m, { a: a, b: b, mode: 'mult' }) : '');
          }
        }
        var skipList = [];
        for (var si = 1; si <= a; si++) skipList.push(si * b);
        var liveLabel = fmt(t('stem.multtable.live_array_label_v2', 'Rows: {a}. Dots in each row: {b}. How many dots in all?'), { a: a, b: b });
        // Grades 3+: the rows and the row size, one mark each, and nothing to count. The job is to split it into facts they know.
        function renderEmptyFrame() {
          var cell = 22, edge = 9, fw = b * cell + edge + 2, fh = a * cell + edge + 2;
          var cut = local.frameSplit && local.frameSplit.key === vKey && local.frameSplit.n > 0 && local.frameSplit.n < a ? local.frameSplit.n : 0;
          var options = [a > 10 ? 10 : 0, a > 5 ? 5 : 0, Math.floor(a / 2), 1].filter(function(v, i, all) { return v >= 1 && v < a && all.indexOf(v) === i; });
          var ink = mtTheme === 'hc'
            ? { edge: '#ffff00', tick: '#ffff00', whole: '#000000', first: '#000000', second: '#000000', line: '#ffffff', text: '#ffff00' }
            : { edge: '#92400e', tick: '#92400e', whole: '#fffbeb', first: '#dbeafe', second: '#fef3c7', line: '#0f172a', text: '#0f172a' };
          function saidFor(n) { return fmt(t('stem.multtable.frame_split_said', 'Split into {r1} + {r2} rows, with {b} in each row. Find each part, then add.'), { r1: n, r2: a - n, b: b }); }
          function pick(n) {
            playSound('default');
            setL({ frameSplit: n === cut ? null : { key: vKey, n: n } });
            announceToSR(n === cut ? t('stem.multtable.frame_split_removed', 'Split removed.') : saidFor(n));
          }
          var marks = [];
          for (var mr = 0; mr < a; mr++) marks.push(h('line', { key: 'r' + mr, 'data-mt-tick': 'row', x1: 1, x2: edge - 2, y1: edge + mr * cell + cell / 2, y2: edge + mr * cell + cell / 2, stroke: ink.tick, strokeWidth: 2 }));
          for (var mc = 0; mc < b; mc++) marks.push(h('line', { key: 'c' + mc, 'data-mt-tick': 'col', y1: 1, y2: edge - 2, x1: edge + mc * cell + cell / 2, x2: edge + mc * cell + cell / 2, stroke: ink.tick, strokeWidth: 2 }));
          return h('div', { className: 'flex flex-col items-center gap-1' },
            h('p', { className: 'text-sm font-bold text-amber-900 text-center' }, fmt(t('stem.multtable.frame_in_each_row', '{b} in each row'), { b: b })),
            h('div', { className: 'flex items-center justify-center gap-2', style: { width: '100%' } },
              h('p', { className: 'text-sm font-bold text-amber-900', style: { writingMode: 'vertical-rl', transform: 'rotate(180deg)', flexShrink: 0, whiteSpace: 'nowrap' } },
                a === 1 ? t('stem.multtable.frame_one_row', '1 row') : fmt(t('stem.multtable.frame_rows', '{a} rows'), { a: a })),
              h('div', { role: 'img', 'data-mt-frame': vKey, 'data-mt-frame-parts': cut ? cut + ',' + (a - cut) : '', 'aria-label': cut ? liveLabel + ' ' + saidFor(cut) : liveLabel, style: { width: fw, minWidth: 0, flexShrink: 1 } },
                h('svg', { viewBox: '0 0 ' + fw + ' ' + fh, 'aria-hidden': 'true', focusable: 'false', style: { width: '100%', height: 'auto', display: 'block' } },
                  marks,
                  !cut && h('rect', { x: edge, y: edge, width: b * cell, height: a * cell, fill: ink.whole }),
                  cut > 0 && h('rect', { x: edge, y: edge, width: b * cell, height: cut * cell, fill: ink.first }),
                  cut > 0 && h('rect', { x: edge, y: edge + cut * cell, width: b * cell, height: (a - cut) * cell, fill: ink.second }),
                  h('rect', { x: edge, y: edge, width: b * cell, height: a * cell, fill: 'none', stroke: ink.edge, strokeWidth: 3 }),
                  cut > 0 && h('line', { x1: edge, x2: edge + b * cell, y1: edge + cut * cell, y2: edge + cut * cell, stroke: ink.line, strokeWidth: 3, strokeDasharray: '6 4' }),
                  cut > 0 && h('text', { x: edge + b * cell / 2, y: edge + cut * cell / 2 + 5, textAnchor: 'middle', fontSize: 15, fontWeight: 800, fill: ink.text }, cut),
                  cut > 0 && h('text', { x: edge + b * cell / 2, y: edge + cut * cell + (a - cut) * cell / 2 + 5, textAnchor: 'middle', fontSize: 15, fontWeight: 800, fill: ink.text }, a - cut)))),
            h('p', { className: 'text-xs text-slate-800 text-center' }, t('stem.multtable.frame_empty_note', 'The dots appear when you build it.')),
            options.length > 0 && h('p', { className: 'text-sm font-bold text-amber-900 text-center' }, t('stem.multtable.frame_split_prompt', 'Split the rows into facts you know, then add the parts.')),
            options.length > 0 && h('div', { role: 'group', 'data-mt-frame-split': 'true', 'aria-label': t('stem.multtable.choose_row_split', 'Choose a row split'), className: 'flex flex-wrap items-center justify-center gap-2' },
              options.map(function(n) {
                var on = n === cut;
                return h('button', { key: n, type: 'button', 'aria-pressed': on, onClick: function() { pick(n); },
                  className: 'px-3 rounded-lg text-sm font-bold ' + (on ? 'bg-amber-700 text-white' : 'bg-white text-amber-900 border border-amber-700'), style: BTN },
                  (on ? '\u2713 ' : '') + n + ' + ' + (a - n) + ' ' + t('stem.multtable.rows_label', 'rows'));
              })),
            cut > 0 && h('p', { className: 'text-sm text-slate-800 text-center', 'data-mt-frame-said': 'true' }, saidFor(cut)));
        }
        return h('div', { className: 'space-y-3' },
          h('div', { className: 'bg-amber-50 rounded-lg p-3 border border-amber-200' },
            h('div', { className: 'grid grid-cols-2 gap-3' },
              h('div', {},
                h('label', { htmlFor: 'mt-visual-a', className: 'block text-xs font-bold text-amber-900 mb-1' }, t('stem.multtable.rows_a', 'Rows (a)')),
                h('input', { id: 'mt-visual-a', type: 'range', min: '1', max: '12', value: a,
                  onChange: function(e) { extUpd({ visualA: parseInt(e.target.value, 10) }); },
                  'aria-label': t('stem.multtable.factor_a_rows', 'Factor a (rows)'),
                  className: 'w-full accent-amber-600', style: { minHeight: 24 }
                }),
                h('div', { className: 'text-center text-xl font-bold text-amber-900' }, a)
              ),
              h('div', {},
                h('label', { htmlFor: 'mt-visual-b', className: 'block text-xs font-bold text-amber-900 mb-1' }, t('stem.multtable.columns_b', 'Columns (b)')),
                h('input', { id: 'mt-visual-b', type: 'range', min: '1', max: '12', value: b,
                  onChange: function(e) { extUpd({ visualB: parseInt(e.target.value, 10) }); },
                  'aria-label': t('stem.multtable.factor_b_columns', 'Factor b (columns)'),
                  className: 'w-full accent-amber-600', style: { minHeight: 24 }
                }),
                h('div', { className: 'text-center text-xl font-bold text-amber-900' }, b)
              )
            ),
            h('div', { className: 'flex flex-wrap items-center gap-3 mt-2 text-[0.6875rem]' },
              h('label', { className: 'font-bold text-amber-900 flex items-center gap-1 cursor-pointer', style: { minHeight: 32 } },
                h('input', { type: 'checkbox', checked: visualSkipOn, style: { width: 20, height: 20 },
                  onChange: function() { playSound('default'); extUpd({ visualSkipOn: !visualSkipOn }); }
                }),
                t('stem.multtable.skip_count_overlay_column_of_running_t', 'Skip-count overlay (column of running totals)')
              ),
              h('button', { type: 'button',
                onClick: function() {
                  extUpd({ visualA: b, visualB: a, visualPred: built ? { key: b + 'x' + a, guess: '', built: true, committed: null, swapped: true } : null });
                  announceToSR(b === 1 ? fmt(t('stem.multtable.swapped_to_one', 'Swapped to 1 row of {b}.'), { b: a }) : fmt(t('stem.multtable.swapped_to', 'Swapped to {a} rows of {b}.'), { a: b, b: a }));
                },
                'aria-label': t('stem.multtable.swap_factors_commutativity', 'Swap factors (commutativity)'),
                className: 'ml-auto px-3 rounded bg-violet-100 text-violet-800 border border-violet-300 font-bold hover:bg-violet-200', style: CHIP
              }, t('stem.multtable.swap_commutativity', '⇄ Swap (commutativity)'))
            )
          ),

          // Predict, then build
          !built && h('div', { className: 'bg-white rounded-xl border-2 border-amber-300 p-4 space-y-3', 'data-mt-predict': 'true' },
            h('p', { id: 'mt-predict-q', className: 'text-base font-bold text-amber-900' }, a === 1 ? fmt(t('stem.multtable.predict_prompt_one', 'Predict first: how many dots are in 1 row of {b}?'), { b: b }) : fmt(t('stem.multtable.predict_prompt', 'Predict first: how many dots are in {a} rows of {b}?'), { a: a, b: b })),
            h('p', { className: 'text-2xl font-bold text-amber-900 font-mono text-center', 'data-mt-live-total': '?' }, a + TIMES + b + ' = ?'),
            liveDots
              ? h('div', { className: 'flex flex-col gap-1 items-center justify-center overflow-x-auto', role: 'img', 'data-mt-live-array': vKey, 'aria-label': liveLabel }, rows)
              : renderEmptyFrame(),
            h('div', { className: 'flex flex-wrap items-end gap-2' },
              h('label', { className: 'text-sm font-bold text-amber-900' }, t('stem.multtable.your_prediction', 'Your prediction'),
                h('input', { type: 'number', inputMode: 'numeric', value: vp.guess || '', 'data-mt-predict-input': 'true', 'aria-describedby': 'mt-predict-q',
                  onChange: function(e) { vpSet({ guess: e.target.value }); },
                  onKeyDown: function(e) { if (e.key === 'Enter') buildIt(false); },
                  className: 'block w-24 px-2 py-2 border-2 border-amber-700 rounded-lg text-lg font-bold text-amber-900 bg-white' })),
              h('button', { type: 'button', onClick: function() { buildIt(false); }, disabled: !String(vp.guess || '').trim(),
                className: 'px-4 rounded-lg bg-amber-700 text-white font-bold disabled:opacity-50', style: BTN }, t('stem.multtable.build_it', 'Build it and check')),
              h('button', { type: 'button', onClick: function() { buildIt(true); },
                className: 'px-3 rounded-lg bg-white text-amber-900 border border-amber-700 font-bold', style: BTN }, t('stem.multtable.build_without_guess', 'I am not sure: just build it'))
            )
          ),

          built && h('div', { className: 'bg-white rounded-xl border-2 border-amber-200 p-4 overflow-x-auto', 'data-mt-built': 'true' },
            h('div', { className: 'text-center mb-3' },
              h('p', { className: 'text-2xl font-bold text-amber-900 font-mono' }, a + TIMES + b + ' = ', h('span', { className: 'text-3xl text-amber-800 ml-2' }, product)),
              h('p', { className: 'text-[0.6875rem] text-amber-800 italic mt-1' },
                (a === 1 ? fmt(t('stem.multtable.rows_groups_added_one', '1 row of {b} = 1 group of {b} = {b} added once'), { b: b }) : fmt(t('stem.multtable.rows_groups_added', '{a} rows of {b} = {a} groups of {b} = {b} added {a} times'), { a: a, b: b }))),
              vp.swapped && h('p', { className: 'text-xs text-violet-800 font-bold mt-1' }, t('stem.multtable.swapped_same_total', 'Same dots, turned sideways, so the total stays the same.')),
              predictionNote && h('p', { role: 'status', className: 'text-sm font-bold mt-2 ' + (committed === product ? 'text-green-800' : 'text-slate-800') }, predictionNote)
            ),
            h('p', { id: 'mt-skip-help', className: 'text-xs font-bold text-amber-900 text-center mb-1' }, fmt(t('stem.multtable.skip_tap_help', 'Tap each row to count by {b}s.'), { b: b }),
              h('span', { className: 'sr-only' }, ' ' + t('stem.multtable.skip_keys_help', 'Use the arrow keys to move between rows.'))),
            h('div', { className: 'flex flex-col gap-1 items-center justify-center', role: 'group', 'aria-describedby': 'mt-skip-help',
              'aria-label': a === 1 ? fmt(t('stem.multtable.array_label_one', 'Array of 1 row with {b} in that row, {p} in all. Skip-count: {list}.'), { b: b, p: product, list: skipList.join(', ') }) : fmt(t('stem.multtable.array_label', 'Array of {a} rows with {b} dots in each row, {p} dots in all. Skip-count: {list}.'), { a: a, b: b, p: product, list: skipList.join(', ') }) }, rows),
            counted > 0 && h('p', { className: 'mt-2 text-sm font-bold text-amber-900 text-center font-mono', 'data-mt-skip-said': counted },
              fmt(t('stem.multtable.skip_so_far', 'Skip-count so far: {list}'), { list: countedList.join(', ') })),
            h('button', { type: 'button', onClick: function() { vpSet({ built: false, guess: '', committed: null, swapped: false }); focusSoon('[data-mt-predict-input]'); },
              className: 'mt-3 px-3 rounded-lg bg-white text-amber-900 border border-amber-700 text-xs font-bold', style: CHIP }, t('stem.multtable.predict_again_v2', 'Hide the total and predict again'))
          ),

          built && h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2' },
            h('div', { className: 'bg-amber-50 rounded-lg p-3 border border-amber-200' },
              h('p', { className: 'text-[0.625rem] font-bold text-amber-800 uppercase tracking-wider mb-1' }, t('stem.multtable.repeated_addition', '➕ Repeated addition')),
              h('p', { className: 'text-sm font-mono font-bold text-amber-900' }, Array.from({ length: a }, function() { return b; }).join(' + ') + ' = ' + product)
            ),
            h('div', { className: 'bg-violet-50 rounded-lg p-3 border border-violet-200' },
              h('p', { className: 'text-[0.625rem] font-bold text-violet-800 uppercase tracking-wider mb-1' }, t('stem.multtable.commutativity_twin', '⇄ Commutativity twin')),
              h('p', { className: 'text-sm font-mono font-bold text-violet-900' }, a + TIMES + b + ' = ' + b + TIMES + a + ' = ' + product),
              h('p', { className: 'text-[0.625rem] text-violet-800 italic mt-0.5' }, t('stem.multtable.same_dots_just_turned_sideways_learn_o', 'Same dots, just turned sideways. Learn one fact, know two.'))
            )
          ),
          built && renderDerivedFacts(a, b),
          built && trickHere && h('div', { className: 'bg-fuchsia-50 rounded-xl p-3 border-2 border-fuchsia-300' },
            h('p', { className: 'text-[0.6875rem] font-bold text-fuchsia-900 uppercase tracking-wider mb-1' }, MEMORY_TRICKS[tkey(a, b)].icon + ' ' + fmt(t('stem.multtable.memory_trick_for', 'Memory trick for {a} × {b}'), { a: a, b: b })),
            h('p', { className: 'text-sm text-fuchsia-900 leading-relaxed' }, trickHere),
            isTrickyFact(a, b) && h('p', { className: 'text-[0.625rem] text-fuchsia-800 italic mt-1' },
              t('stem.multtable.this_is_one_of_the_tricky_15_facts_the', 'This is one of the Tricky 15 facts — the small set that needs real recall. Switch to Practice → "Tricky 15" mode to drill it.'))
          ),
          built && h('div', { className: 'bg-emerald-50 rounded-lg p-3 border border-emerald-200' },
            h('p', { className: 'text-[0.625rem] font-bold text-emerald-800 uppercase tracking-wider mb-1' }, t('stem.multtable.fact_family_multiplication_division', '👨‍👩‍👧 Fact family — multiplication ↔ division')),
            h('p', { className: 'text-xs font-mono font-bold text-emerald-900' },
              a + TIMES + b + ' = ' + product +
              (a === b ? '' : ',  ' + b + TIMES + a + ' = ' + product) +
              ',  ' + product + DIV + a + ' = ' + b +
              (a === b ? '' : ',  ' + product + DIV + b + ' = ' + a)),
            h('p', { className: 'text-[0.625rem] text-emerald-800 italic mt-1' }, t('stem.multtable.same_numbers_four_faces_knowing_one_fa', 'Same numbers, four faces. Knowing one fact gives you the others.'))
          ),
          h('div', { className: 'flex flex-wrap items-center gap-1.5', role: 'group', 'data-mt-vis-chips': band === 'early' ? 'band' : 'tricky',
            'aria-label': band === 'early' ? t('stem.multtable.band_facts_to_build', 'Facts with 2s, 5s and 10s to build:') : t('stem.multtable.tricky_facts_to_visualize', 'Tricky facts to visualize:') },
            h('span', { className: 'text-[0.6875rem] font-bold text-amber-900 self-center mr-1' }, band === 'early' ? t('stem.multtable.band_facts_to_build', 'Facts with 2s, 5s and 10s to build:') : t('stem.multtable.tricky_facts_to_visualize', 'Tricky facts to visualize:')),
            VIS_CHIPS.map(function(pair) {
              return h('button', { key: 'vp-' + pair[0] + '-' + pair[1], type: 'button',
                onClick: function() { extUpd({ visualA: pair[0], visualB: pair[1] }); },
                className: 'px-2 rounded text-[0.6875rem] font-mono bg-white text-amber-900 border border-amber-500 hover:bg-amber-100', style: CHIP
              }, pair[0] + '×' + pair[1]);
            })
          ),
          renderFamilyCheck()
        );
      };
      function renderDerivedFacts(a, b) {
        var list = derivedFacts(a, b);
        if (!list.length) return null;
        return h('div', { className: 'bg-sky-50 rounded-lg p-3 border border-sky-200', 'data-mt-derived': 'true' },
          h('p', { className: 'text-xs font-bold text-sky-900 mb-1' }, fmt(t('stem.multtable.facts_i_can_use', 'Facts I can use to find {a} × {b}'), { a: a, b: b })),
          h('ul', { className: 'list-disc pl-5 space-y-0.5 text-xs text-slate-800' }, list.map(function(f) { return h('li', { key: f.id }, derivedText(f)); })));
      }

      // ═══ PATTERNS TAB: discover the structure of the times table ═══
      // Click a pattern chip → cells light up on the table + an explanation appears.
      // Builds number-sense ("WHY 9s digits add to 9") not just rote recall.
      var PATTERNS = [
        {
          id: 'fives', label: t('stem.multtable.5s_end_in_0_or_5', '5s end in 0 or 5'), icon: '5️⃣', accent: '#0e7490',
          quotes: [[5, 1], [5, 2], [5, 3], [5, 4]],
          cellMatches: function(r, c) { return (r + 1) === 5 || (c + 1) === 5; },
          explain: t('stem.multtable.pattern_fives_explain', 'Every multiple of 5 ends in either 0 or 5. Look: 5×1=5, 5×2=10, 5×3=15, 5×4=20… alternating. This is the easiest column to memorize first.')
        },
        {
          id: 'nines', label: t('stem.multtable.9s_digits_sum_to_9', '9s digits sum to 9'), icon: '9️⃣', accent: '#b91c1c',
          quotes: [[9, 3], [9, 7]],
          cellMatches: function(r, c) { return (r + 1) === 9 || (c + 1) === 9; },
          explain: t('stem.multtable.pattern_nines_explain', 'For 9 × 1-10: the two digits of the answer always add to 9. 9×3=27 (2+7=9). 9×7=63 (6+3=9). Also: the tens digit is one less than what you multiplied by (9×7 → tens is 6, one less than 7).')
        },
        {
          id: 'squares', label: t('stem.multtable.perfect_squares', 'Perfect squares'), icon: '⬛', accent: '#6d28d9',
          quotes: [[1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [7, 7], [8, 8], [9, 9], [10, 10], [11, 11], [12, 12]],
          cellMatches: function(r, c) { return r === c; },
          explain: t('stem.multtable.pattern_squares_explain', 'The diagonal: n × n. 1, 4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144. Every fact off the diagonal has a twin on the other side (commutativity), so learning one side gives you the other.')
        },
        {
          id: 'doubles', label: t('stem.multtable.doubles_2', 'Doubles (×2)'), icon: '🔁', accent: '#15803d',
          quotes: [[7, 2]],
          cellMatches: function(r, c) { return (r + 1) === 2 || (c + 1) === 2; },
          explain: t('stem.multtable.pattern_doubles_explain', '×2 is just doubling — adding the number to itself. 7×2 = 7+7 = 14. If you know your doubles, you also know ×4 (double again) and ×8 (double once more).')
        },
        {
          id: 'tens', label: t('stem.multtable.10_adds_a_zero', '×10 adds a zero'), icon: '🔟', accent: '#0f766e',
          quotes: [[7, 10]],
          cellMatches: function(r, c) { return (r + 1) === 10 || (c + 1) === 10; },
          explain: t('stem.multtable.pattern_tens_explain', '×10 is the easiest: just put a 0 at the end. 7×10 = 70. This works because our number system is base 10. ×100 puts two zeros, ×1000 puts three, etc.')
        },
        {
          id: 'elevens', label: t('stem.multtable.11s_repeat_the_digit_1_9', '11s repeat the digit (×1-9)'), icon: '1️⃣1️⃣', accent: '#7e22ce',
          quotes: [[11, 3], [11, 7], [11, 10], [11, 11], [11, 12]],
          cellMatches: function(r, c) { return (r + 1) === 11 || (c + 1) === 11; },
          explain: t('stem.multtable.pattern_elevens_explain', 'For 11 × 1 through 11 × 9: the answer is that digit written twice. 11×3=33, 11×7=77. (11×10 breaks the pattern: 110. 11×11=121, 11×12=132.)')
        },
        {
          id: 'distributive', label: t('stem.multtable.7s_5s_2s_distributive', '7s = 5s + 2s (distributive)'), icon: '✂️', accent: '#b45309',
          cellMatches: function(r, c) { return (r + 1) === 7 || (c + 1) === 7; },
          explain: t('stem.multtable.pattern_distributive_explain', 'Forgot 7×8? Split: 7×8 = (5+2)×8 = 5×8 + 2×8 = 40 + 16 = 56. Any "hard" fact can be split into two "easy" facts using the distributive property.')
        }
      ];

      var renderPatterns = function() {
        var selectedPattern = patternId ? PATTERNS.find(function(p) { return p.id === patternId; }) : null;
        // Worked examples must not answer an open question. The 7×8 split moves to another 7s fact, and an open question has at most two facts, so one of three is free.
        function quotesOpen(list) { var open = openFactKeys(); return list.some(function(f) { return open[tkey(f[0], f[1])]; }); }
        var splitB = [8, 6, 4].filter(function(n) { return !quotesOpen([[7, n], [5, n], [2, n]]); })[0];
        var splitNums = { b: splitB, x: 5 * splitB, y: 2 * splitB, p: 7 * splitB };
        function patternExplain(p) {
          if (p.id === 'distributive') return splitB === 8 ? p.explain : fmt(t('stem.multtable.pattern_distributive_explain_alt', 'Forgot 7×{b}? Split: 7×{b} = (5+2)×{b} = 5×{b} + 2×{b} = {x} + {y} = {p}. Any "hard" fact can be split into two "easy" facts using the distributive property.'), splitNums);
          return quotesOpen(p.quotes || []) ? t('stem.multtable.pattern_example_hidden', 'The worked example here uses your open question, so it stays hidden until you answer. The highlighted cells show the pattern.') : p.explain;
        }
        var headerRow = [h('th', { key: 'corner', scope: 'col', className: 'w-8 h-8 text-[0.6875rem] font-bold text-indigo-800' }, '×')];
        for (var hc = 0; hc < maxNum; hc++) {
          var colHasMatch = false;
          if (selectedPattern) {
            for (var rr = 0; rr < maxNum; rr++) { if (selectedPattern.cellMatches(rr, hc)) { colHasMatch = true; break; } }
          }
          headerRow.push(h('th', { key: 'h' + hc, scope: 'col',
            className: 'w-8 h-8 text-xs font-bold ' + (colHasMatch ? 'text-white' : 'text-indigo-800'),
            style: colHasMatch ? { backgroundColor: selectedPattern.accent } : null
          }, hc + 1));
        }
        var bodyRows = [];
        var openNow = openFactKeys();
        for (var br = 0; br < maxNum; br++) {
          var rowHasMatch = false;
          if (selectedPattern) {
            for (var cc = 0; cc < maxNum; cc++) { if (selectedPattern.cellMatches(br, cc)) { rowHasMatch = true; break; } }
          }
          var cells = [h('th', { key: 'rh-' + br, scope: 'row',
            className: 'w-8 h-8 text-xs font-bold ' + (rowHasMatch ? 'text-white' : 'text-indigo-800'),
            style: rowHasMatch ? { backgroundColor: selectedPattern.accent } : null
          }, br + 1)];
          for (var bc = 0; bc < maxNum; bc++) {
            var val = openNow[tkey(br + 1, bc + 1)] ? '?' : (br + 1) * (bc + 1);
            var isMatch = selectedPattern && selectedPattern.cellMatches(br, bc);
            // In-pattern cells carry a dark outline and bold text as well as colour.
            cells.push(h('td', {
              key: 'pc-' + br + '-' + bc,
              className: 'w-8 h-8 text-[0.6875rem] font-mono border border-slate-200 ' +
                (isMatch ? 'font-bold text-white allo-mt-pattern-cell' : 'text-slate-700'),
              style: isMatch ? { backgroundColor: selectedPattern.accent, outline: '2px solid #0f172a', outlineOffset: '-2px' } : null
            }, isMatch ? h(React.Fragment, null, val, h('span', { className: 'sr-only' }, ' ' + t('stem.multtable.in_pattern', '(in pattern)'))) : val));
          }
          bodyRows.push(h('tr', { key: 'br-' + br }, cells));
        }

        return h('div', { className: 'space-y-3' },
          h('div', { className: 'bg-indigo-50 rounded-xl p-3 border border-indigo-200' },
            h('p', { className: 'text-[0.6875rem] font-bold text-indigo-900 mb-2' },
              t('stem.multtable.pick_a_pattern_to_highlight_the_table_', '🔍 Pick a pattern to highlight. The table is full of structure — once you see it, half the facts become predictable.')
            ),
            h('div', { className: 'flex flex-wrap gap-1.5' },
              PATTERNS.map(function(p) {
                var active = patternId === p.id;
                return h('button', {
                  key: 'pat-' + p.id, type: 'button', 'data-mt-pattern': p.id,
                  onClick: function() {
                    playSound('default');
                    var explored = Object.assign({}, _ext.patternsExplored || {});
                    explored[p.id] = true;
                    extUpd({ patternId: active ? null : p.id, patternsExplored: explored });
                    if (!active && Object.keys(explored).length >= 5 && !_ext.badges.patternFinder) checkBadges({ patternFinder: true });
                    announceToSR(active ? t('stem.multtable.pattern_off', 'Pattern off') : fmt(t('stem.multtable.pattern_on', 'Pattern: {name}'), { name: p.label }));
                  },
                  'aria-pressed': active,
                  className: 'px-2.5 rounded-lg text-[0.6875rem] font-bold transition-all ' +
                    (active ? 'text-white shadow-sm' : 'bg-white text-indigo-800 border border-indigo-300 hover:bg-indigo-100'),
                  style: Object.assign({}, CHIP, active ? { backgroundColor: p.accent, borderColor: p.accent } : {})
                }, p.icon + ' ' + p.label);
              })
            )
          ),
          h('div', { className: 'bg-white rounded-xl border-2 border-indigo-200 p-3 overflow-x-auto', role: 'region', tabIndex: 0, 'aria-label': t('stem.multtable.multiplication_table_with_pattern_high', 'Multiplication table with pattern highlighting') },
            h('table', { className: 'border-collapse w-full text-center', 'aria-label': t('stem.multtable.multiplication_table_with_pattern_high', 'Multiplication table with pattern highlighting') },
              h('caption', { className: 'sr-only' }, selectedPattern ? fmt(t('stem.multtable.showing_pattern', 'Showing pattern: {name}'), { name: selectedPattern.label }) : t('stem.multtable.multiplication_table_caption', 'Multiplication table')),
              h('thead', null, h('tr', null, headerRow)),
              h('tbody', null, bodyRows)
            )
          ),
          selectedPattern && h('div', { className: 'bg-white rounded-xl border-2 p-3', style: { borderColor: selectedPattern.accent } },
            h('p', { className: 'text-sm font-bold mb-1', style: { color: mtTheme === 'hc' ? '#ffff00' : selectedPattern.accent } }, selectedPattern.icon + ' ' + selectedPattern.label),
            h('p', { className: 'text-xs text-slate-800 leading-relaxed', 'data-mt-pattern-explain': 'true' }, patternExplain(selectedPattern))
          ),
          !selectedPattern && h('p', { className: 'text-xs text-indigo-800 italic text-center' },
            t('stem.multtable.click_any_pattern_above_to_light_up_th', '👆 Click any pattern above to light up the cells and read the rule. Multiple patterns may overlap (e.g., 5×5 is both a "5s multiple" and a "perfect square").')
          ),
          renderClaims(),
          h('details', { className: 'bg-white rounded-xl border border-indigo-200 p-3' },
            h('summary', { style: { color: ctx.isContrast ? '#ffffff' : undefined, minHeight: 32 }, className: 'text-xs font-bold text-indigo-800 cursor-pointer' }, t('stem.multtable.why_patterns_beat_brute_memorization', '💡 Why patterns beat brute memorization')),
            h('div', { className: 'mt-2 space-y-2 text-xs text-slate-800' },
              h('p', {}, h('b', {}, t('stem.multtable.you_only_need_to_memorize_about_a_thir', 'You only need to memorize about a third of the table. ')),
                t('stem.multtable.anything_in_the_1s_2s_5s_10s_11s_colum', 'Anything in the 1s, 2s, 5s, 10s, 11s columns has an easy rule. The squares are a small set (12 facts). What remains is the "tricky middle" — about 15 facts — that needs real recall: 6×7, 6×8, 6×9, 7×8, 7×9, 8×9 and their twins.')
              ),
              h('p', {}, h('b', {}, t('stem.multtable.distributive_shortcut_for_the_tricky_m', 'Distributive shortcut for the tricky middle. ')),
                splitB === 8
                  ? t('stem.multtable.forget_7_8_7_8_5_8_2_8_40_16_56_build_', 'Forget 7×8? 7×8 = 5×8 + 2×8 = 40 + 16 = 56. Build the hard fact from two easy ones. After enough repetitions, the answer becomes automatic.')
                  : fmt(t('stem.multtable.forget_split_alt', 'Forget 7×{b}? 7×{b} = 5×{b} + 2×{b} = {x} + {y} = {p}. Build the hard fact from two easy ones. After enough repetitions, the answer becomes automatic.'), splitNums)
              ),
              h('p', {}, h('b', {}, t('stem.multtable.for_dyscalculia_specifically', 'For dyscalculia specifically: ')),
                t('stem.multtable.visualizing_each_fact_as_an_area_model', 'Visualizing each fact as an area-model rectangle (Visual tab) or a pattern (this tab) gives you a path to the answer that does not require automatic recall. Recall builds eventually, but not from drilling alone.')
              )
            )
          )
        );
      };

      // ── Pattern claims: decide, test facts as evidence, then conclude ──
      function claimText(id) {
        switch (id) {
          case 'fives_end': return t('stem.multtable.claim_fives_end', 'Every product in the 5s row ends in 0 or 5.');
          case 'nines_sum': return t('stem.multtable.claim_nines_sum', 'Every product in the 9s row has digits that add up to 9.');
          case 'squares_odd': return t('stem.multtable.claim_squares_odd', 'Every square number (n × n) is odd.');
          case 'fours_even': return t('stem.multtable.claim_fours_even', 'Every product in the 4s row is even.');
          default: return t('stem.multtable.claim_elevens_repeat', 'Every product in the 11s row is one digit written twice.');
        }
      }
      function claimGroupText(id) {
        switch (id) {
          case 'fives_end': return t('stem.multtable.claim_group_fives', 'Test a fact with a factor of 5.');
          case 'nines_sum': return t('stem.multtable.claim_group_nines', 'Test a fact with a factor of 9.');
          case 'squares_odd': return t('stem.multtable.claim_group_squares', 'Test a square: use the same number twice.');
          case 'fours_even': return t('stem.multtable.claim_group_fours', 'Test a fact with a factor of 4.');
          default: return t('stem.multtable.claim_group_elevens', 'Test a fact with a factor of 11.');
        }
      }
      function claimReason(id) {
        switch (id) {
          case 'fives_end': return t('stem.multtable.claim_reason_fives', 'Why it works: 5 times an even number is a whole number of tens, so it ends in 0. 5 times an odd number is that plus one more 5, so it ends in 5.');
          case 'nines_sum': return t('stem.multtable.claim_reason_nines', 'The digit rule works for 9 × 1 up to 9 × 10, but 9 × 11 = 99 and 9 + 9 = 18. One counterexample is enough to show a claim is not always true.');
          case 'squares_odd': return t('stem.multtable.claim_reason_squares', 'An even number times itself is even, like 4 × 4 = 16. Only odd numbers make odd squares.');
          case 'fours_even': return t('stem.multtable.claim_reason_fours', 'Why it works: 4 × n is double (2 × n), and double any whole number is even.');
          default: return t('stem.multtable.claim_reason_elevens', 'The repeat rule works for 11 × 1 up to 11 × 9, but 11 × 10 = 110 breaks it.');
        }
      }
      function renderClaims() {
        var claimsState = visit.claims || {};
        function setClaim(id, patch) {
          var next = Object.assign({}, claimsState);
          next[id] = Object.assign({ pick: null, tests: [], conclusion: null, fa: '', fb: '' }, claimsState[id] || {}, patch);
          extUpd({ visit: visitPatch({ claims: next }) });
        }
        return h('section', { className: 'bg-white rounded-xl border-2 border-indigo-200 p-3 space-y-3', 'aria-labelledby': 'mt-claims-h', 'data-mt-claims': 'true' },
          h('h3', { id: 'mt-claims-h', className: 'text-sm font-black text-indigo-900' }, t('stem.multtable.claims_title', '🔬 Pattern detective: is the claim always true?')),
          h('p', { className: 'text-xs text-slate-800' }, t('stem.multtable.claims_intro', 'Decide first, then test facts as evidence. One fact that breaks a rule (a counterexample) proves it is not always true.')),
          PATTERN_CLAIMS.map(function(cl) {
            var st = Object.assign({ pick: null, tests: [], conclusion: null, fa: '', fb: '' }, claimsState[cl.id] || {});
            var tests = Array.isArray(st.tests) ? st.tests : [];
            var counter = tests.some(function(x) { return x.inGroup && !x.holds; });
            // Different facts: 5 × 2 tested three times (or turned into 2 × 5) is one piece of evidence.
            var supporting = Object.keys(tests.reduce(function(o, x) { if (x.inGroup && x.holds) o[tkey(x.a, x.b)] = true; return o; }, {})).length;
            function runTest() {
              var fa = parseWholeAnswer(st.fa), fbv = parseWholeAnswer(st.fb);
              if (fa === null || fbv === null || fa < 1 || fa > 12 || fbv < 1 || fbv > 12) { announceToSR(t('stem.multtable.claim_need_factors', 'Type two factors from 1 to 12.')); return; }
              var rec = { a: fa, b: fbv, p: fa * fbv, inGroup: cl.inGroup(fa, fbv), holds: cl.holds(fa, fbv) };
              setClaim(cl.id, { tests: tests.concat([rec]).slice(-8) });
              noteShownIfOpen(fa, fbv);
              announceToSR(testLine(rec));
            }
            function testLine(x) {
              if (!x.inGroup) return fmt(t('stem.multtable.claim_not_in_group', '{a} × {b} = {p} is not in this group, so it is not evidence here.'), x);
              return x.holds ? fmt(t('stem.multtable.claim_holds', '{a} × {b} = {p}: the rule holds here.'), x) : fmt(t('stem.multtable.claim_breaks', '{a} × {b} = {p}: the rule breaks here. That is a counterexample!'), x);
            }
            function conclude(always) {
              var right = always ? (cl.isTrue && supporting >= 3) : (!cl.isTrue && counter);
              setClaim(cl.id, { conclusion: always ? 'always' : 'not', right: right });
              if (right && !(visit.claimXp || {})[cl.id]) {
                var cx = Object.assign({}, visit.claimXp || {});
                cx[cl.id] = true;
                var nextClaims = Object.assign({}, claimsState);
                nextClaims[cl.id] = Object.assign({}, st, { conclusion: always ? 'always' : 'not', right: true });
                extUpd({ visit: visitPatch({ claims: nextClaims, claimXp: cx }) });
                if (typeof awardXP === 'function') awardXP('multtable', 5, 'pattern claim with evidence');
              }
            }
            var verdict = null;
            if (st.conclusion) {
              if (st.conclusion === 'not' && counter) verdict = t('stem.multtable.claim_right_false', 'Yes: your counterexample proves the claim is not always true.');
              else if (st.conclusion === 'not') verdict = t('stem.multtable.claim_need_counter', 'To say it is not always true, find a fact in the group that breaks the rule. Keep testing.');
              else if (cl.isTrue && supporting >= 3) verdict = t('stem.multtable.claim_right_true', 'Every fact you tested fits. Examples support a rule, but the reason below is what makes it always true.');
              else if (cl.isTrue) verdict = t('stem.multtable.claim_need_more', 'Test at least three facts from the group before you decide.');
              else verdict = t('stem.multtable.claim_look_further', 'Look further along the row, past 10. Does every fact really fit?');
            }
            return h('div', { key: cl.id, className: 'rounded-lg border border-indigo-200 p-2 space-y-2', 'data-mt-claim': cl.id },
              h('p', { className: 'text-sm font-bold text-slate-900' }, claimText(cl.id)),
              h('div', { role: 'group', 'aria-label': t('stem.multtable.claim_your_guess', 'Your first guess'), className: 'flex flex-wrap gap-2 items-center' },
                h('span', { className: 'text-xs font-bold text-slate-800' }, t('stem.multtable.claim_your_guess', 'Your first guess')),
                [['always', t('stem.multtable.claim_guess_always', 'Always true')], ['not', t('stem.multtable.claim_guess_not', 'Not always true')]].map(function(o) {
                  return h('button', { key: o[0], type: 'button', 'aria-pressed': st.pick === o[0], onClick: function() { setClaim(cl.id, { pick: o[0] }); },
                    className: 'px-3 rounded-lg text-xs font-bold border ' + (st.pick === o[0] ? 'bg-indigo-700 text-white border-indigo-800' : 'bg-white text-indigo-800 border-indigo-400'), style: CHIP }, o[1]);
                })),
              st.pick && h('div', { className: 'flex flex-wrap items-end gap-2' },
                h('span', { className: 'text-xs text-slate-800 w-full' }, claimGroupText(cl.id)),
                h('label', { className: 'text-xs font-bold text-slate-800' }, t('stem.multtable.claim_factor_1', 'Factor'),
                  h('input', { type: 'number', min: 1, max: 12, value: st.fa, onChange: function(e) { setClaim(cl.id, { fa: e.target.value }); }, className: 'block w-16 px-2 py-1 border border-slate-500 rounded bg-white text-slate-900', style: { minHeight: 36 } })),
                h('label', { className: 'text-xs font-bold text-slate-800' }, t('stem.multtable.claim_factor_2', 'Other factor'),
                  h('input', { type: 'number', min: 1, max: 12, value: st.fb, onChange: function(e) { setClaim(cl.id, { fb: e.target.value }); }, className: 'block w-16 px-2 py-1 border border-slate-500 rounded bg-white text-slate-900', style: { minHeight: 36 } })),
                h('button', { type: 'button', onClick: runTest, className: 'px-3 rounded-lg text-xs font-bold bg-indigo-700 text-white', style: CHIP }, t('stem.multtable.claim_test', 'Test this fact'))),
              tests.length > 0 && h('ul', { className: 'text-xs text-slate-800 list-disc pl-5' }, tests.map(function(x, i) { return h('li', { key: i }, testLine(x)); })),
              tests.length > 0 && h('div', { role: 'group', 'aria-label': t('stem.multtable.claim_conclude', 'Your conclusion'), className: 'flex flex-wrap gap-2 items-center' },
                h('span', { className: 'text-xs font-bold text-slate-800' }, t('stem.multtable.claim_conclude', 'Your conclusion')),
                h('button', { type: 'button', onClick: function() { conclude(true); }, className: 'px-3 rounded-lg text-xs font-bold bg-white text-emerald-900 border border-emerald-700', style: CHIP }, t('stem.multtable.claim_conclude_always', 'It is always true')),
                h('button', { type: 'button', onClick: function() { conclude(false); }, className: 'px-3 rounded-lg text-xs font-bold bg-white text-rose-900 border border-rose-700', style: CHIP }, t('stem.multtable.claim_conclude_not', 'It is not always true'))),
              verdict && h('p', { role: 'status', className: 'text-xs font-bold text-slate-900' }, verdict),
              st.conclusion && st.right && h('p', { className: 'text-xs text-slate-800' }, claimReason(cl.id))
            );
          })
        );
      }

      // ── One hint ladder for every tab with a typed or chosen answer ──
      // Rung 1 (after try 1): what you said, the named mistake, a strategy hint.
      // Rung 2 (after try 2): a picture or a fact to start from, and the
      // "Show me" button (teacher setting). A shown answer earns no credit.
      function hintLadder(o) {
        var tries = o.tries || 0;
        return h('div', Object.assign({ className: 'mx-auto max-w-xl rounded-lg border-2 border-amber-400 bg-amber-50 p-3 text-left space-y-1 text-slate-900', 'data-mt-hint-ladder': tries >= 2 ? '2' : '1', style: cardStyle() }, o.attrs || {}),
          o.said != null && h('p', { className: 'text-sm font-bold text-red-800', style: cardInk('head') }, o.said),
          o.mistake ? h('p', Object.assign({ className: 'text-sm text-slate-900', style: cardInk('text') }, o.mistakeAttrs || {}), o.mistake) : null,
          o.hint ? h('p', { className: 'text-sm text-slate-900', style: cardInk('text') }, h('strong', null, t('stem.multtable.hint_label', 'Hint: ')), o.hint) : null,
          tries >= 2 ? (o.rung2 || null) : null,
          o.showTries && h('p', { className: 'text-xs text-slate-800', 'data-mt-tries': 'true', style: cardInk('text') }, fmt(t('stem.multtable.tries_left', 'Try {n} of {max}.'), { n: tries + 1, max: o.max || maxTries })),
          o.onReveal && tries >= 2 && showAnswerButton && h('button', { type: 'button', onClick: o.onReveal, 'data-mt-reveal': 'true',
            className: 'mt-1 px-3 rounded-lg text-xs font-bold bg-white text-slate-800 border border-slate-500', style: chipInk(CHIP) }, o.revealLabel || t('stem.multtable.show_answer', 'Show me the answer')),
          o.extra || null);
      }
      function saidText(given) { return fmt(t('stem.multtable.not_yet_you_said', 'Not yet. You said {given}.'), { given: given }); }
      // Rung 2 for a fact: a picture and a neighbouring fact (never the answer).
      function factRung2(ch) {
        return [
          h('div', { key: 'pic' }, renderHintPicture(ch)),
          (ch.mode === 'mult' || ch.mode === 'derive') && ch.b > 1 && h('p', { key: 'nb', className: 'text-sm text-slate-900', style: cardInk('text') },
            fmt(t('stem.multtable.hint_neighbour_fact', 'A fact you can use: {a} × {b1} = {k}. One more group of {a} gives {a} × {b}.'), { a: ch.a, b: ch.b, b1: ch.b - 1, k: ch.a * (ch.b - 1) }))
        ];
      }

      // ═══════════════════════════════
      // ═══ PRACTICE: pieces ═══
      // ═══════════════════════════════
      function renderHintPicture(ch) {
        // Rows split into a friendly part and the rest; part sizes only, never totals.
        var rows, cols;
        if (ch.mode === 'divmiss') {
          var dmD = Number(ch.divisor), dmQ = divmissQuotient(ch);
          if (!(dmD >= 1 && dmQ >= 1 && dmD <= 12 && dmQ <= 12)) return null;
          var dmLabel = ch.form === 'divisor'
            ? fmt(t('stem.multtable.hint_picture_divisor', '{p} dots in rows of {q}. How many rows are there?'), { p: ch.a * ch.b, q: dmQ })
            : (dmD === 1
              ? fmt(t('stem.multtable.hint_picture_dividend_one', '1 row of {q} dots. Count all the dots.'), { q: dmQ })
              : fmt(t('stem.multtable.hint_picture_dividend', '{d} rows of {q} dots. Count all the dots.'), { d: dmD, q: dmQ }));
          var dmW = dmQ * 22 + 30, dmH = dmD * 22 + 20;
          return h('figure', { className: 'mt-2', 'data-mt-hint-picture': 'true' },
            h('div', { style: { overflowX: 'auto' } },
              h('svg', { viewBox: '0 0 ' + dmW + ' ' + dmH, role: 'img', 'aria-label': dmLabel, style: { minWidth: Math.min(dmW, 320), width: '100%', maxWidth: dmW * 1.4, maxHeight: 300, display: 'block', background: '#fff' } },
                Array.from({ length: dmD * dmQ }, function(_, i) { var r = Math.floor(i / dmQ), c = i % dmQ; return h('circle', { key: i, cx: 15 + c * 22, cy: 15 + r * 22, r: 6.5, fill: r % 2 ? '#b45309' : '#1d4ed8' }); }))),
            h('figcaption', { className: 'text-xs text-slate-800 mt-1' }, dmLabel));
        }
        if (ch.mode === 'div' || ch.mode === 'missing') { rows = ch.mode === 'div' ? Number(ch.divisor) : Number(ch.known); cols = factAnswer(ch); }
        else { var s = strategyFor(ch.a, ch.b); rows = s.f; cols = s.n; if (rows === 1 || rows === 10 || rows === 11) { rows = ch.a; cols = ch.b; } }
        if (!(rows >= 1 && cols >= 1 && rows <= 12 && cols <= 12)) return null;
        var split = (ch.mode === 'div' || ch.mode === 'missing') ? rows : (rows > 10 ? 10 : rows > 5 ? 5 : rows > 2 ? Math.floor(rows / 2) : rows);
        var rest = rows - split;
        var w = cols * 22 + 30, ht = rows * 22 + 20;
        var label = (ch.mode === 'div' || ch.mode === 'missing')
          ? (rows === 1
            ? fmt(t('stem.multtable.hint_picture_div_one', '{p} dots shared into 1 row. How many dots are in that row?'), { p: ch.a * ch.b })
            : fmt(t('stem.multtable.hint_picture_div', '{p} dots shared into {d} equal rows. How many dots are in each row?'), { p: ch.a * ch.b, d: rows }))
          : (rest > 0
            ? (split === 1
              ? fmt(t('stem.multtable.hint_picture_split_first_one', 'The rows split into 1 row of {c} and {r2} rows of {c}. Find each part, then add.'), { r2: rest, c: cols })
              : rest === 1
                ? fmt(t('stem.multtable.hint_picture_split_last_one', 'The rows split into {r1} rows of {c} and 1 row of {c}. Find each part, then add.'), { r1: split, c: cols })
                : fmt(t('stem.multtable.hint_picture_split', 'The rows split into {r1} rows of {c} and {r2} rows of {c}. Find each part, then add.'), { r1: split, r2: rest, c: cols }))
            : (rows === 1
              ? fmt(t('stem.multtable.hint_picture_rows_one', '1 row of {c} dots. Count the dots.'), { c: cols })
              : fmt(t('stem.multtable.hint_picture_rows', '{r} rows of {c} dots. Skip-count the rows.'), { r: rows, c: cols })));
        return h('figure', { className: 'mt-2', 'data-mt-hint-picture': 'true' },
          h('div', { style: { overflowX: 'auto' } },
            h('svg', { viewBox: '0 0 ' + w + ' ' + ht, role: 'img', 'aria-label': label, style: { minWidth: Math.min(w, 320), width: '100%', maxWidth: w * 1.4, maxHeight: 300, display: 'block', background: '#fff' } },
              Array.from({ length: rows * cols }, function(_, i) { var r = Math.floor(i / cols), c = i % cols; return h('circle', { key: i, cx: 15 + c * 22, cy: 15 + r * 22, r: 6.5, fill: r < split ? '#1d4ed8' : '#b45309', 'data-hint-part': r < split ? 'first' : 'second' }); }),
              rest > 0 && h('line', { x1: 4, y1: 4 + split * 22, x2: cols * 22 + 8, y2: 4 + split * 22, stroke: '#0f172a', strokeWidth: 2, strokeDasharray: '5 3' }))),
          h('figcaption', { className: 'text-xs text-slate-800 mt-1' }, label));
      }

      function renderFactStrategy() {
        if (!multTableChallenge || !multTableFeedback || !multTableFeedback.resolved || _mt.active) return null;
        var c = multTableChallenge;
        var product = c.a * c.b;
        var isDiv = c.mode === 'div' || c.mode === 'missing' || c.mode === 'divmiss';
        var rows = (c.mode === 'div' || c.mode === 'divmiss') ? c.divisor : (c.mode === 'missing' ? c.known : c.a);
        var cols = product / rows;
        if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1 || rows > 12 || cols > 12) return null;
        var key = rows + ':' + cols + ':' + c.mode;
        var split = _ext.factSplitKey === key ? Math.max(1, Math.min(rows, _ext.factSplit || 1)) : Math.min(5, rows);
        var rest = rows - split;
        var options = Array.from(new Set([Math.min(5, rows), Math.max(1, Math.floor(rows / 2)), 1]));
        var w = cols * 26 + 90, height = rows * 26 + 55;
        // Fading worked example: after a few, the learner finishes the last steps.
        var seen = (visit.worked || {})[isDiv ? 'div' : 'split'] || 0;
        var fadeLevel = seen >= 5 ? 2 : seen >= 3 ? 1 : 0;
        var shownSteps = _ext.fadeShownKey === key ? (_ext.fadeShown || 0) : 0;
        var steps = [
          rows + TIMES + cols + ' = (' + split + TIMES + cols + ') + (' + rest + TIMES + cols + ')',
          (split * cols) + ' + ' + (rest * cols) + ' = ' + product
        ];
        if (isDiv) steps.push(product + DIV + rows + ' = ' + cols);
        var visibleSteps = fadeLevel === 0 ? steps.length : Math.max(fadeLevel === 1 ? 1 : 0, shownSteps);
        var svgInk = mtTheme === 'hc' ? { first: '#ffff00', second: '#ffffff', line: '#ffffff', num2: '#ffffff', text: '#ffff00' } : { first: '#1d4ed8', second: '#b45309', line: '#0f172a', num2: '#92400e', text: '#0f172a' };
        return h('details', { className: 'bg-white border border-pink-200 rounded-xl p-3 mt-3', key: key, 'data-fact-strategy': true },
          h('summary', { style: { color: ctx.isContrast ? '#ffffff' : undefined, minHeight: 32 }, className: 'text-sm font-bold text-pink-800 cursor-pointer' }, t('stem.multtable.build_fact_strategy', 'Build this fact from smaller facts')),
          h('p', { className: 'text-sm text-slate-700 mt-2' }, isDiv ? t('stem.multtable.division_strategy_reason', 'Use the related multiplication fact to check the division. Each row is one equal group.') : t('stem.multtable.split_strategy_reason', 'Split the rows into two groups. Multiply each group, then add the parts. The total number of dots stays the same.')),
          h('div', { role: 'group', 'aria-label': t('stem.multtable.choose_row_split', 'Choose a row split'), className: 'flex flex-wrap gap-2 mt-3' }, options.map(function(value) {
            return h('button', { key: value, type: 'button', 'aria-pressed': split === value, onClick: function() { extUpd({ factSplitKey: key, factSplit: value }); },
              style: { minHeight: 44, padding: '6px 12px', border: '2px solid #9d174d', borderRadius: 8, background: split === value ? '#9d174d' : '#fff', color: split === value ? '#fff' : '#831843', fontWeight: 800 } }, value + ' + ' + (rows - value) + ' ' + t('stem.multtable.rows_label', 'rows'));
          })),
          h('div', { role: 'region', tabIndex: 0, 'aria-label': t('stem.multtable.strategy_array_scroll', 'Scrollable strategy dot array'), style: { overflowX: 'auto', marginTop: 12 } },
            h('svg', { viewBox: '0 0 ' + w + ' ' + height, role: 'img', 'aria-label': rows + TIMES + cols + ' = ' + split + TIMES + cols + ' + ' + rest + TIMES + cols, style: { minWidth: w, width: '100%', maxHeight: 380, display: 'block', background: '#fff' }, 'data-fact-strategy-array': true },
              Array.from({ length: rows * cols }, function(_, i) { var row = Math.floor(i / cols), col = i % cols; return h('circle', { key: i, cx: 26 + col * 26, cy: 30 + row * 26, r: 7, fill: row < split ? svgInk.first : svgInk.second, 'data-strategy-part': row < split ? 'first' : 'second' }); }),
              rest > 0 && h('line', { x1: 12, y1: 17 + split * 26, x2: cols * 26 + 12, y2: 17 + split * 26, stroke: svgInk.line, strokeWidth: 2, strokeDasharray: '5 3' }),
              h('text', { x: cols * 26 + 24, y: 24 + split * 13, fill: svgInk.first, fontSize: 16, fontWeight: 800 }, split),
              rest > 0 && h('text', { x: cols * 26 + 24, y: 24 + split * 26 + rest * 13, fill: svgInk.num2, fontSize: 16, fontWeight: 800 }, rest),
              h('text', { x: cols * 13 + 13, y: height - 5, textAnchor: 'middle', fill: svgInk.text, fontSize: 16, fontWeight: 800 }, cols + ' ' + t('stem.multtable.dots_each_row', 'in each row')))),
          h('div', { role: 'status', className: 'text-sm font-bold text-slate-800 mt-3', 'data-fact-strategy-equation': true },
            steps.slice(0, visibleSteps).map(function(s, i) { return h('p', { key: i }, s); }),
            visibleSteps < steps.length && h('div', { className: 'mt-1' },
              h('p', { className: 'text-xs font-normal text-slate-700' }, t('stem.multtable.fade_your_turn', 'Your turn: work out the next step in your head, then check it.')),
              h('button', { type: 'button', onClick: function() { extUpd({ fadeShownKey: key, fadeShown: visibleSteps + 1 }); },
                className: 'mt-1 px-3 rounded-lg text-xs font-bold bg-white text-pink-800 border border-pink-700', style: CHIP }, t('stem.multtable.fade_show_step', 'Show the next step')))),
          h('p', { className: 'text-xs text-slate-700 mt-2' }, t('stem.multtable.strategy_reflect', 'Which smaller fact did you know already? Try another split and explain why the total stays the same.')));
      }

      function renderChallenge() {
        var ch = multTableChallenge;
        if (!ch) return null;
        var fb = multTableFeedback;
        var resolved = !!(fb && fb.resolved);
        var retry = !!(fb && fb.retry && !resolved);
        var product = ch.a * ch.b;
        var aiHint = visit.aiHint && visit.aiHint.key === challengeKey(ch) ? visit.aiHint.text : '';
        var prompt;
        if (ch.mode === 'derive' && ch.anchor) {
          prompt = h('div', { className: 'text-center mb-2', id: 'multtable-q' },
            h('p', { className: 'text-sm font-bold text-pink-900' }, fmt(t('stem.multtable.derive_known', 'You know {a} × {n} = {k}.'), { a: ch.a, n: ch.anchor, k: ch.a * ch.anchor })),
            h('p', { className: 'text-lg font-bold text-pink-800' }, fmt(t('stem.multtable.derive_ask', 'Use it to find {a} × {b} = ?'), { a: ch.a, b: ch.b })));
        } else {
          prompt = h('p', { className: 'text-lg font-bold text-pink-800 mb-2 text-center', id: 'multtable-q' }, questionText(ch));
        }
        var sourceNote = ch.source === 'chosen' ? t('stem.multtable.chosen_note', 'You picked this fact from the table, so it is practice only: it earns no XP.')
          : ch.source === 'drill' ? t('stem.multtable.drill_note', 'Practice-set fact: it counts toward your mastery, not XP, because you saw its answer in the review.') : null;
        return h('div', { className: 'bg-pink-50 rounded-lg p-3 border border-pink-200', 'data-mt-challenge': 'true' },
          prompt,
          sourceNote && h('p', { className: 'text-xs text-slate-700 text-center mb-2' }, sourceNote),
          h('div', { className: 'flex gap-2 items-center justify-center flex-wrap' },
            h('input', {
              type: 'number', inputMode: 'numeric',
              'aria-label': t('stem.multtable.answer', 'Multiplication or division answer'),
              'aria-describedby': 'multtable-q',
              value: multTableAnswer,
              onChange: function(e) { if (!answerLocked) setMultTableAnswer(e.target.value); },
              onKeyDown: function(e) { if (e.key === 'Enter' && multTableAnswer && !answerLocked) checkMult(); },
              className: 'w-24 px-3 py-2 text-center text-lg font-bold border-2 rounded-lg transition-all ' +
                (answerLocked ? 'border-slate-300 bg-slate-50 text-slate-700 cursor-not-allowed' : 'border-pink-700 bg-white text-slate-900 focus:border-pink-500'),
              placeholder: '?',
              disabled: answerLocked,
              id: 'multtable-input'
            }),
            h('button', { 'aria-label': t('stem.multtable.check', 'Check'), type: 'button',
              onClick: checkMult,
              disabled: !multTableAnswer || answerLocked,
              className: 'px-4 py-2 bg-pink-700 text-white font-bold rounded-lg hover:bg-pink-800 transition-all disabled:opacity-40', style: BTN
            }, t('stem.multtable.check_2', '✔ Check')),
            retry && aiCanAsk && (fb.tries || 0) >= 2 && h('button', { 'aria-label': t('stem.multtable.get_a_hint_from_ai', 'Get a hint from AI'), type: 'button', onClick: requestAIHint,
              className: 'px-3 py-2 bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-700 font-bold rounded-lg transition-all text-sm', style: BTN,
              title: t('stem.multtable.get_a_hint_from_ai', 'Get a hint from AI')
            }, '🧠 ' + t('stem.multtable.ai_hint_short', 'AI hint'))
          ),
          speedPaused && h('p', { 'data-mt-paused-note': 'true', className: 'text-sm font-bold text-slate-800 text-center mt-2' }, t('stem.multtable.speed_paused_note', 'Speed Run is paused. Choose Resume to keep answering.')),
          h('div', { role: 'status', 'aria-live': 'polite', className: 'mt-2', 'data-mt-feedback': 'true' },
            fb && fb.note === 'wholeNumber' && !resolved && h('p', { className: 'text-sm font-bold text-slate-800 text-center' }, t('stem.multtable.whole_number_needed', 'Type a whole number, then check.')),
            retry && hintLadder({ attrs: { 'data-mt-retry': 'true' }, tries: fb.tries || 1, said: saidText(fb.lastWrong),
              mistake: fb.mistake && fb.mistake.kind !== 'other' ? mistakeText(fb.mistake, ch) : null, mistakeAttrs: fb.mistake ? { 'data-mt-mistake': fb.mistake.kind } : null,
              hint: strategyText(ch), rung2: factRung2(ch), showTries: true, onReveal: revealNow,
              extra: aiHint ? h('p', { className: 'text-sm text-purple-900 mt-2 whitespace-pre-wrap' }, aiHint) : null }),
            resolved && h('p', { className: 'text-sm font-bold text-center ' + (fb.correct ? 'text-green-800' : 'text-red-800') },
              fb.correct
                ? (fb.firstTry ? '✅ ' + fmt(t('stem.multtable.correct_eq', 'Correct! {eq}'), { eq: solvedText(ch) }) : '✅ ' + fmt(t('stem.multtable.correct_retry_eq', 'Correct on try {n}: {eq}. Using the hint is how strategies stick.'), { n: fb.tries, eq: solvedText(ch) }))
                : '❌ ' + fmt(t('stem.multtable.revealed_eq', 'The answer is {eq}.'), { eq: solvedText(ch) })),
            resolved && fb.correct && fb.firstTry && (fb.streak || 0) >= 3 && h('p', { className: 'text-xs font-bold text-orange-800 text-center' }, '🔥 ' + fmt(t('stem.multtable.streak_n', '{n} in a row!'), { n: fb.streak })),
            resolved && !fb.correct && fb.mistake && fb.mistake.kind !== 'other' && h('p', { className: 'text-sm text-slate-900 text-center mt-1' }, mistakeText(fb.mistake, ch))
          ),
          renderFactStrategy(),
          resolved && h('div', { className: 'mt-2 mx-auto bg-pink-50 rounded-lg px-3 py-2 border border-pink-200 max-w-md text-center' },
            h('p', { className: 'text-[0.625rem] font-bold text-pink-800 uppercase tracking-wider mb-1' }, t('stem.multtable.fact_family_same_numbers_four_faces', '👨‍👩‍👧 Fact family — same numbers, four faces')),
            h('p', { className: 'text-[0.6875rem] font-mono text-pink-900' },
              ch.a + TIMES + ch.b + ' = ' + product +
              (ch.a === ch.b ? '' : ',  ' + ch.b + TIMES + ch.a + ' = ' + product) +
              ',  ' + product + DIV + ch.a + ' = ' + ch.b +
              (ch.a === ch.b ? '' : ',  ' + product + DIV + ch.b + ' = ' + ch.a))
          ),
          resolved && !_mt.active && renderDerivedFacts(ch.a, ch.b),
          resolved && MEMORY_TRICKS[tkey(ch.a, ch.b)] && h('div', { className: 'mt-2 mx-auto bg-amber-50 rounded-lg px-3 py-2 border border-amber-200 max-w-md' },
            h('p', { className: 'text-[0.625rem] font-bold text-amber-800 uppercase tracking-wider mb-1' }, MEMORY_TRICKS[tkey(ch.a, ch.b)].icon + ' ' + t('stem.multtable.memory_trick', 'Memory trick')),
            h('p', { className: 'text-[0.75rem] text-amber-900 leading-relaxed' }, trickText(tkey(ch.a, ch.b)))
          ),
          resolved && inputDisabled && h('div', { className: 'flex items-center justify-center gap-2 mt-2 flex-wrap' },
            !speedPaused && h('p', { className: 'text-xs text-slate-700' }, autoAdvancePending ? t('stem.multtable.next_question_coming', 'Next question coming...') : t('stem.multtable.read_feedback_first', 'Take time to read the feedback. Continue when you are ready.')),
            h('button', { 'aria-label': autoAdvancePending ? t('stem.multtable.skip_next', 'Skip Next') : t('stem.multtable.next_when_ready', 'Next question'), type: 'button', 'data-mt-next': 'true', disabled: speedPaused,
              onClick: function() {
                if (labToolData._multAdvanceTimer) clearTimeout(labToolData._multAdvanceTimer);
                nextProblem();
                focusInputSoon();
              },
              className: 'text-[0.6875rem] font-bold px-3 rounded-full bg-pink-100 text-pink-800 hover:bg-pink-200 border border-pink-700 transition-all disabled:opacity-50', style: CHIP
            }, autoAdvancePending ? t('stem.multtable.skip_next_2', 'Skip → Next') : t('stem.multtable.next_when_ready', 'Next question'))
          )
        );
      }

      function renderResults() {
        var drillActive = !!(_mt.drill && _mt.drill.active);
        if (_mt.active || drillActive || !(_mt.total > 0) || !(_mt.timeLeft === 0 || _mt.ended)) return null;
        var pct = Math.round((_mt.score / _mt.total) * 100);
        var tier = _mt.score === _mt.total && _mt.total >= 10 ? 'perfect' : pct >= 90 ? 'fluent' : pct >= 75 ? 'strong' : pct >= 50 ? 'building' : 'practice';
        var tierColor = { perfect: '#92400e', fluent: '#047857', strong: '#15803d', building: '#b45309', practice: '#b91c1c' }[tier];
        var tierIcon = tier === 'perfect' ? '🏆' : tier === 'fluent' ? '⚡' : tier === 'strong' ? '🎯' : tier === 'building' ? '📚' : '🔁';
        var tierTitle = tier === 'perfect' ? t('stem.multtable.tier_perfect', 'Perfect run')
          : tier === 'fluent' ? t('stem.multtable.tier_fluent', 'Fact fluency')
          : tier === 'strong' ? t('stem.multtable.tier_strong', 'Strong recall')
          : tier === 'building' ? t('stem.multtable.tier_building', 'Building recall')
          : t('stem.multtable.tier_practice', 'Keep practicing');
        var tierMsg = tier === 'perfect' ? fmt(t('stem.multtable.tier_perfect_msg', '{n} for {n} under timer pressure. Recall is automatic for you now, which frees working memory for harder problems.'), { n: _mt.total })
          : tier === 'fluent' ? t('stem.multtable.tier_fluent_msg', 'Near-automatic recall. The facts you missed are usually one family (7s and 8s for most learners). Use "Practice these" to lock them in.')
          : tier === 'strong' ? t('stem.multtable.tier_strong_msg', 'Strong recall under time pressure. Use the missed list below to target weak spots: short focused practice beats long random drills.')
          : tier === 'building' ? t('stem.multtable.tier_building_msg', 'Building real recall. The missed list is your roadmap: practice a few facts at a time, not the whole table.')
          : t('stem.multtable.tier_practice_msg', 'Recall is still slow under pressure. That is normal. Practice without the timer for a few sessions before you try another Speed Run.');
        var rad = 38, circ = 2 * Math.PI * rad;
        var dashOff = circ - (pct / 100) * circ;
        var uniq = getUniqueMissed(_mt.missed);
        return h('div', { className: 'rounded-xl overflow-hidden border-2 bg-white', style: { borderColor: tierColor }, 'data-mt-results': 'true' },
          h('div', { className: 'p-4 flex flex-wrap items-center gap-4' },
            h('div', { className: 'relative flex-shrink-0', style: { width: 92, height: 92 } },
              h('svg', { viewBox: '0 0 100 100', width: 92, height: 92, role: 'img',
                'aria-label': fmt(t('stem.multtable.score_label', 'Score: {score} out of {total}'), { score: _mt.score, total: _mt.total }) },
                h('circle', { cx: 50, cy: 50, r: rad, fill: 'none', stroke: 'rgba(148,163,184,0.35)', strokeWidth: 9 }),
                h('circle', { cx: 50, cy: 50, r: rad, fill: 'none', stroke: tierColor, strokeWidth: 9, strokeLinecap: 'round',
                  strokeDasharray: circ, strokeDashoffset: dashOff, transform: 'rotate(-90 50 50)' })
              ),
              h('div', { 'aria-hidden': 'true', style: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } },
                h('div', { style: { fontSize: 20, fontWeight: 900, color: tierColor, lineHeight: 1 } }, pct + '%'),
                h('div', { style: { fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#334155' } }, _mt.score + ' / ' + _mt.total)
              )
            ),
            h('div', { className: 'flex-1', style: { minWidth: 200 } },
              h('div', { style: { fontSize: 26, marginBottom: 2 }, 'aria-hidden': 'true' }, tierIcon),
              h('h3', { style: { margin: '0 0 4px', fontSize: 16, color: tierColor, fontWeight: 900, lineHeight: 1.15 } }, tierTitle),
              _mt.endedEarly && h('p', { style: { margin: '0 0 4px', color: '#1e293b', fontSize: 12, fontWeight: 700 } }, fmt(t('stem.multtable.stopped_early', 'You stopped the run with {s} seconds left.'), { s: _mt.timeLeft || 0 })),
              h('p', { style: { margin: 0, color: '#1e293b', fontSize: 12, lineHeight: 1.5 } }, tierMsg)
            )
          ),
          uniq.length > 0 && h('div', { className: 'mx-4 mb-3 bg-white rounded-lg p-3 border border-red-200' },
            h('p', { className: 'text-xs font-bold text-red-800 mb-2' }, '📝 ' + fmt(t('stem.multtable.review_mistakes', 'Review mistakes ({n})'), { n: uniq.length })),
            h('ul', { className: 'flex flex-wrap gap-1.5', 'aria-label': t('stem.multtable.missed_facts', 'Missed facts') },
              uniq.map(function(m, i) {
                return h('li', { key: i, className: 'inline-flex items-center gap-1 px-2 py-1 bg-red-50 border border-red-200 rounded-lg text-xs font-bold text-red-800' }, formatMissedFact(m));
              })
            ),
            h('button', { 'aria-label': t('stem.multtable.practice_these', 'Practice These'), type: 'button',
              onClick: function() { startDrill(_mt.missed); },
              className: 'mt-2 px-4 bg-red-700 text-white font-bold rounded-lg text-xs hover:bg-red-800 transition-all', style: BTN
            }, t('stem.multtable.practice_these_2', '🎯 Practice these'))
          ),
          h('div', { className: 'px-4 pb-4' },
            speedAllowed && h('button', { 'aria-label': t('stem.multtable.try_again', 'Try Again'), type: 'button',
              onClick: function() { startSpeedRun(); },
              className: 'px-4 bg-emerald-700 text-white font-bold rounded-lg text-xs hover:bg-emerald-800 transition-all', style: BTN
            }, t('stem.multtable.try_again_2', '🔄 Try again'))
          )
        );
      }

      function renderDrillBanner() {
        var d = _mt.drill;
        if (!d || (!d.active && !d.done)) return null;
        var n = (d.items || []).length;
        var cleared = (d.items || []).filter(function(it) { return d.cleared && d.cleared[drillItemId(it)]; }).length;
        return h('div', { className: 'rounded-xl border-2 border-red-300 bg-white p-3 flex flex-wrap items-center gap-2', 'data-mt-drill': 'true' },
          h('p', { className: 'text-sm font-bold text-red-900 flex-1', role: 'status' }, d.active
            ? fmt(t('stem.multtable.drill_progress', 'Practice set: {c} of {n} facts cleared. A fact clears when you get it right on the first try.'), { c: cleared, n: n })
            : fmt(t('stem.multtable.drill_done', 'Practice set cleared: all {n} facts right on the first try.'), { n: n })),
          h('button', { type: 'button', onClick: function() { _mtUpd({ drill: null }); },
            className: 'px-3 rounded-lg text-xs font-bold bg-white text-red-900 border border-red-700', style: CHIP }, d.active ? t('stem.multtable.drill_stop', 'Stop the practice set') : t('stem.multtable.drill_close', 'Close'))
        );
      }

      function renderHeatmap() {
        var totalTracked = Object.keys(factScores).length;
        function status(score) {
          if (!score || !(Number(score.attempts) > 0)) return 'untried';
          var pct = Number(score.correct) / Number(score.attempts);
          if (pct >= 0.85 && score.attempts >= 2) return 'mastered';
          if (pct >= 0.6) return 'building';
          return 'needs';
        }
        var STYLE = mtTheme === 'hc' ? {
          untried: { bg: '#000000', fg: '#ffff00', sym: '·' },
          needs: { bg: '#000000', fg: '#ffff00', sym: '!' },
          building: { bg: '#000000', fg: '#ffff00', sym: '~' },
          mastered: { bg: '#000000', fg: '#ffff00', sym: '✓' }
        } : {
          untried: { bg: '#f1f5f9', fg: '#334155', sym: '·' },
          needs: { bg: '#fecaca', fg: '#7f1d1d', sym: '!' },
          building: { bg: '#fde68a', fg: '#78350f', sym: '~' },
          mastered: { bg: '#bbf7d0', fg: '#14532d', sym: '✓' }
        };
        function statusName(s) {
          if (s === 'mastered') return t('stem.multtable.status_mastered', 'mastered');
          if (s === 'building') return t('stem.multtable.status_building', 'building');
          if (s === 'needs') return t('stem.multtable.status_needs', 'needs practice');
          return t('stem.multtable.status_untried', 'not tried yet');
        }
        var masteryRow = h('div', { className: 'flex flex-wrap items-center gap-2 mb-2' },
          h('label', { className: 'text-[0.6875rem] font-bold text-emerald-900 flex items-center gap-1 cursor-pointer', style: { minHeight: 32 } },
            h('input', { type: 'checkbox', checked: showHeatmap, style: { width: 20, height: 20 },
              onChange: function() { playSound('default'); extUpd({ showHeatmap: !showHeatmap }); }
            }),
            '📊 ' + fmt(t('stem.multtable.mastery_heatmap_toggle', 'Mastery heatmap ({n} facts tracked)'), { n: totalTracked })
          ),
          showHeatmap && totalTracked > 0 && h('button', { type: 'button',
            onClick: function() {
              var confirmModule = typeof window !== 'undefined' && window.AlloModules && window.AlloModules.ConfirmDialog && window.AlloModules.ConfirmDialog.ConfirmDialog;
              var confirmApi = typeof window !== 'undefined' && window.AlloFlowUX && window.AlloFlowUX.confirm;
              var unavailable = t('stem.multtable.mastery_reset_unavailable', 'Mastery reset is unavailable right now, so your tracking was kept.');
              if (typeof confirmModule !== 'function' || typeof confirmApi !== 'function') {
                addToast(unavailable, 'warning');
                announceToSR(unavailable);
                return;
              }
              confirmApi(t('stem.multtable.mastery_reset_question', 'Clear all mastery tracking? This resets per-fact stats but keeps badges and totals.'), {
                title: t('stem.multtable.mastery_reset_title', 'Clear mastery tracking'),
                detail: t('stem.multtable.mastery_reset_detail', 'Your badges and totals will remain.'),
                confirmText: t('stem.multtable.mastery_reset_confirm', 'Clear mastery data'),
                cancelText: t('stem.multtable.mastery_reset_cancel', 'Keep mastery data'),
                tone: 'warning'
              }).then(function(confirmed) {
                if (confirmed) {
                  extUpd({ factScores: {} });
                  announceToSR(t('stem.multtable.mastery_cleared', 'Mastery tracking cleared'));
                } else announceToSR(t('stem.multtable.mastery_kept', 'Mastery tracking kept.'));
              }).catch(function() {
                addToast(unavailable, 'warning');
                announceToSR(unavailable);
              });
            },
            className: 'ml-auto text-[0.625rem] font-bold text-rose-800 hover:text-rose-900 underline px-2', style: { minHeight: 32 }
          }, t('stem.multtable.clear_mastery_data', 'Clear mastery data'))
        );
        if (!showHeatmap) return masteryRow;
        var grid = renderGrid({
          id: 'heat', label: t('stem.multtable.mastery_heatmap', 'Mastery heatmap'), describedBy: 'mt-heat-help',
          caption: t('stem.multtable.heatmap_caption', 'Mastery heatmap: each cell shows how often a fact was right on the first try.'),
          headClass: 'text-[0.625rem] font-bold text-emerald-900',
          cell: function(r, c) {
            var s = status(factScores[tkey(r, c)]);
            var sc = factScores[tkey(r, c)];
            var st = STYLE[s];
            return {
              text: st.sym,
              label: s === 'untried'
                ? fmt(t('stem.multtable.heat_cell_untried', '{r} times {c}: not tried yet.'), { r: r, c: c })
                : fmt(t('stem.multtable.heat_cell', '{r} times {c}: {right} of {tries} right on the first try, {status}.'), { r: r, c: c, right: sc.correct, tries: sc.attempts, status: statusName(s) }),
              className: 'w-7 h-7 text-xs font-bold border border-slate-400',
              style: { backgroundColor: st.bg, color: st.fg, minWidth: 28, height: 28 }
            };
          },
          onActivate: function(r, c) { practiseChosen(r, c); }
        });
        return h('div', { className: 'bg-white rounded-xl border-2 border-emerald-200 p-3', 'data-mt-heatmap': 'true' },
          masteryRow,
          h('p', { id: 'mt-heat-help', className: 'text-[0.625rem] text-emerald-900 mb-2' },
            t('stem.multtable.heatmap_help', 'Each cell is one fact. The symbol and colour show your first-try record. Use the arrow keys to move, and Enter to practise a fact (practice only, no XP).')),
          h('div', { className: 'overflow-x-auto' }, grid),
          h('ul', { className: 'flex flex-wrap items-center justify-center gap-3 mt-2 text-[0.625rem] text-slate-800', 'aria-label': t('stem.multtable.heatmap_key', 'Heatmap key') },
            ['untried', 'needs', 'building', 'mastered'].map(function(s) {
              var lbl = s === 'untried' ? t('stem.multtable.key_untried', 'not tried')
                : s === 'needs' ? t('stem.multtable.key_needs', 'under 60%')
                : s === 'building' ? t('stem.multtable.key_building', '60 to 84%')
                : t('stem.multtable.key_mastered', '85% or more, 2+ tries');
              return h('li', { key: s, className: 'inline-flex items-center gap-1' },
                h('span', { 'aria-hidden': 'true', className: 'inline-flex items-center justify-center w-5 h-5 rounded border border-slate-400 font-bold', style: { backgroundColor: STYLE[s].bg, color: STYLE[s].fg } }, STYLE[s].sym),
                statusName(s) + ' (' + lbl + ')');
            })
          )
        );
      }

      // The 12 × 12 grid (144 cells) is memoised: typing an answer re-renders the
      // tool on every key, and the grid only changes with these inputs. Cell
      // handlers call through a ref, so they always run the current render's code.
      var tableActRef = React.useRef(null);
      tableActRef.current = function(r, c) {
        setSelCell({ r: r, c: c });
        announceToSR(challengeOpen
          ? fmt(t('stem.multtable.selected_hidden', 'Selected {r} × {c}. Answers are hidden while you work on a question.'), { r: r, c: c })
          : (r === c
            ? fmt(t('stem.multtable.selected_square', 'Selected {r} × {c} = {p}, a square number.'), { r: r, c: c, p: r * c })
            : fmt(t('stem.multtable.selected_fact', 'Selected {r} × {c} = {p}. Its twin {c} × {r} is lit too.'), { r: r, c: c, p: r * c })));
      };
      var tblText = {
        name: t('stem.multtable.12_by_12_multiplication_table', '12 by 12 multiplication table'),
        hidden: t('stem.multtable.cell_hidden', '{r} times {c}, answer hidden.'),
        twin: t('stem.multtable.cell_twin', '{r} times {c} equals {p}, the twin of the selected fact.'),
        cell: t('stem.multtable.cell', '{r} times {c} equals {p}.')
      };
      var tblRevealedKey = multTableRevealed instanceof Set ? Array.from(multTableRevealed).sort().join(',') : '';
      var tblFocus = gridFocus.table ? gridFocus.table.r + '-' + gridFocus.table.c : '';
      var tableGrid = React.useMemo(function() {
        if (mtTab !== 'practice') return null;
        var sel = selCell, masked = challengeOpen;
        return renderGrid({
          id: 'table', label: tblText.name, describedBy: 'mt-table-help',
          caption: tblText.name,
          headClass: 'text-xs font-bold text-pink-800',
          headStyle: function(kind, n) { return sel && ((kind === 'c' && sel.c === n) || (kind === 'r' && sel.r === n)) ? (mtTheme === 'hc' ? { outline: '2px solid #ffff00', outlineOffset: '-2px' } : { backgroundColor: '#fce7f3' }) : null; },
          cell: function(r, c) {
            var val = r * c;
            var isSel = !!(sel && sel.r === r && sel.c === c);
            var inCross = !!(sel && (sel.r === r || sel.c === c));
            var isTwin = !!(sel && sel.r !== sel.c && sel.r === c && sel.c === r);
            var isHighlighted = !!(highlightCell && highlightCell.r === r && highlightCell.c === c);
            var hiddenHere = masked || (multTableHidden && !isHighlighted && !(multTableRevealed instanceof Set && multTableRevealed.has((r - 1) + '-' + (c - 1))));
            var cls = 'w-8 h-8 text-[0.6875rem] font-mono border border-slate-200 ';
            cls += isHighlighted ? 'bg-amber-400 text-amber-900 font-bold'
              : isSel ? 'bg-pink-700 text-white font-bold'
              : isTwin ? 'bg-emerald-100 text-emerald-900 font-bold'
              : inCross ? 'bg-pink-50 text-pink-900 font-semibold'
              : r === c ? 'bg-indigo-50 text-indigo-800 font-semibold'
              : 'text-slate-700';
            return {
              text: hiddenHere ? '?' : val,
              selected: isSel,
              label: hiddenHere
                ? fmt(tblText.hidden, { r: r, c: c })
                : fmt(isTwin ? tblText.twin : tblText.cell, { r: r, c: c, p: val }),
              className: cls,
              style: isHighlighted ? { outline: '3px solid ' + (mtTheme === 'hc' ? '#ffff00' : '#92400e'), outlineOffset: '-3px' }
                : mtTheme === 'hc' && isSel ? { outline: '4px double #ffff00', outlineOffset: '-4px' }
                : mtTheme === 'hc' && isTwin ? { outline: '2px dashed #ffff00', outlineOffset: '-2px' } : null
            };
          },
          onActivate: function(r, c) { if (tableActRef.current) tableActRef.current(r, c); }
        });
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [mtTab, selCell && selCell.r, selCell && selCell.c, challengeOpen, highlightCell && highlightCell.r, highlightCell && highlightCell.c,
        multTableHidden, tblRevealedKey, tblFocus, tblText.name, tblText.hidden, tblText.twin, tblText.cell, mtTheme]);
      function renderFullTable() {
        var sel = selCell;
        var masked = challengeOpen;
        var grid = tableGrid;
        return h('details', { className: 'rounded-xl border border-pink-200 bg-white p-3', 'data-full-fact-table': true },
          h('summary', { style: { color: ctx.isContrast ? '#ffffff' : undefined, minHeight: 32 }, className: 'cursor-pointer font-bold text-pink-900' }, t('stem.multtable.open_full_table', 'Full multiplication table')),
          h('p', { id: 'mt-table-help', className: 'text-xs text-slate-700 mt-2' }, masked
            ? t('stem.multtable.table_masked', 'Answers are hidden while a question is open. Use the arrow keys to move and Enter to select a fact.')
            : t('stem.multtable.table_help', 'Use the arrow keys to move and Enter to select a fact. The selected fact lights its row, its column and its twin.')),
          h('div', { className: 'bg-white rounded-xl border-2 border-pink-200 p-3 overflow-x-auto mt-2' }, grid),
          sel && !masked && h('div', { className: 'mt-2 flex flex-wrap items-center gap-2', 'data-mt-selected': 'true' },
            h('p', { className: 'text-sm font-bold text-pink-900' }, sel.r + TIMES + sel.c + ' = ' + (sel.r * sel.c) + (sel.r !== sel.c ? '   ⇄   ' + sel.c + TIMES + sel.r + ' = ' + (sel.r * sel.c) : '')),
            h('button', { type: 'button', onClick: function() { openArrays({ visualA: sel.r, visualB: sel.c, visualPred: null }); },
              className: 'px-3 rounded-lg text-xs font-bold bg-white text-pink-800 border border-pink-700', style: CHIP }, t('stem.multtable.build_selected', 'Build it as an array')),
            h('button', { type: 'button', onClick: function() { practiseChosen(sel.r, sel.c); },
              className: 'px-3 rounded-lg text-xs font-bold bg-white text-pink-800 border border-pink-700', style: CHIP }, t('stem.multtable.practise_selected', 'Practise this fact (no XP)'))
          ),
          h('div', { className: 'text-[0.6875rem] text-slate-700 text-center mt-2' },
            h('span', { className: 'inline-block w-3 h-3 bg-indigo-50 border border-indigo-300 rounded mr-1', 'aria-hidden': 'true' }), t('stem.multtable.perfect_squares_2', ' Perfect squares'),
            h('span', { className: 'ml-3 inline-block w-3 h-3 bg-pink-50 border border-pink-300 rounded mr-1', 'aria-hidden': 'true' }), t('stem.multtable.selected_cross', ' Selected row and column'),
            h('span', { className: 'ml-3 inline-block w-3 h-3 bg-pink-700 rounded mr-1', 'aria-hidden': 'true', style: mtTheme === 'hc' ? { outline: '4px double #ffff00', outlineOffset: '-4px' } : undefined }), t('stem.multtable.selected', ' Selected'),
            h('span', { className: 'ml-3 inline-block w-3 h-3 bg-amber-400 border-2 border-amber-800 rounded mr-1', 'aria-hidden': 'true', style: mtTheme === 'hc' ? { outline: '3px solid #ffff00', outlineOffset: '-3px' } : undefined }), t('stem.multtable.correct_answer', ' Correct answer')
          )
        );
      }

      function renderCoach() {
        if (!coachOpen) return null;
        var weak = Object.keys(factScores).filter(function(k) {
          var s = factScores[k]; return s && Number(s.attempts) > 0 && Number(s.correct) / Number(s.attempts) < 0.85 && /^\d+x\d+$/.test(k);
        }).sort(function(x, y) {
          var sx = factScores[x], sy = factScores[y];
          return (sx.correct / sx.attempts) - (sy.correct / sy.attempts) || sy.attempts - sx.attempts;
        }).slice(0, 3);
        var tally = visit.tally || {};
        var topKind = Object.keys(tally).filter(function(k) { return k !== 'other'; }).sort(function(x, y) { return tally[y] - tally[x]; })[0];
        return h('section', { className: 'bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-3 border-2 border-purple-200', 'aria-labelledby': 'mt-coach-h', 'data-mt-coach': 'true' },
          h('div', { className: 'flex items-center justify-between mb-2' },
            h('h3', { id: 'mt-coach-h', className: 'text-sm font-bold text-purple-900' }, '🧭 ' + t('stem.multtable.coach_title', 'Strategy coach')),
            h('button', { type: 'button', onClick: function() { extUpd({ showCoach: false, showAI: false }); }, 'aria-label': t('stem.multtable.close_coach', 'Close strategy coach'),
              className: 'text-sm text-slate-700 hover:text-slate-900 rounded', style: { minWidth: 36, minHeight: 36 } }, '✕')
          ),
          weak.length === 0
            ? h('p', { className: 'text-sm text-purple-900' }, t('stem.multtable.coach_no_data', 'Answer a few questions and the coach will find the facts that need a strategy. Start with 2s, 5s and 10s: every other fact can be built from them.'))
            : h('ul', { className: 'space-y-2' }, weak.map(function(k) {
                var parts = k.split('x').map(Number), s = factScores[k];
                return h('li', { key: k, className: 'text-sm text-slate-900' },
                  h('strong', null, parts[0] + TIMES + parts[1] + ': '),
                  fmt(t('stem.multtable.coach_record', '{right} of {tries} right on the first try.'), { right: s.correct, tries: s.attempts }) + ' ',
                  strategyText({ a: parts[0], b: parts[1], mode: 'mult' }));
              })),
          topKind && h('p', { className: 'text-sm text-slate-900 mt-2' }, fmt(t('stem.multtable.coach_top_mistake', 'Most common mistake this session: {kind}.'), { kind: mistakeLabel(topKind) })),
          weak.length > 0 && h('button', { type: 'button',
            onClick: function() { extUpd({ difficulty: 'adaptive' }); nextProblem({ difficulty: 'adaptive' }); },
            className: 'mt-2 px-3 rounded-full bg-purple-100 text-purple-800 hover:bg-purple-200 border border-purple-700 text-xs font-bold', style: CHIP }, t('stem.multtable.coach_practise', 'Practise my trickiest facts'))
        );
      }

      function renderTeacherPanel() {
        if (!isTeacher) return null;
        var tally = visit.tally || {};
        var missedAll = getUniqueMissed((visit.missed || []).concat(_mt.missed || []));
        function seg(label, options, current, onPick) {
          return h('div', { role: 'group', 'aria-label': label, className: 'flex flex-wrap items-center gap-1 mt-2' },
            h('span', { className: 'text-xs font-bold text-slate-800 mr-1' }, label),
            options.map(function(o) {
              var on = current === o[0];
              return h('button', { key: String(o[0]), type: 'button', 'aria-pressed': on, onClick: function() { onPick(o[0]); },
                className: 'px-2 rounded-lg text-xs font-bold border ' + (on ? 'bg-indigo-700 text-white border-indigo-800' : 'bg-white text-indigo-800 border-indigo-400'), style: CHIP }, o[1]);
            }));
        }
        var summary = [t('stem.multtable.teacher_summary_title', 'Multiplication Table: this session')]
          .concat(missedAll.map(function(m) { return '- ' + formatMissedFact(m); }))
          .concat(Object.keys(tally).map(function(k) { return mistakeLabel(k) + ': ' + tally[k]; })).join('\n');
        var iq = _ext._factHunt || { threshold: 80, factor: 6, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
        function setIQ(patch) { extUpd({ _factHunt: Object.assign({}, iq, patch) }); }
        var perf = Math.min(100, iq.factor * 10);
        var state = perf < 60 ? 'struggling' : perf < iq.threshold ? 'building' : 'mastered';
        var sm = {
          struggling: { label: t('stem.multtable.struggling_60', '🔴 Struggling (<60%)'), color: '#b91c1c', bg: '#fef2f2', border: '#fca5a5' },
          building:   { label: '🟡 ' + fmt(t('stem.multtable.sim_building', 'Building (60-{x}%)'), { x: iq.threshold - 1 }), color: '#92400e', bg: '#fffbeb', border: '#fcd34d' },
          mastered:   { label: '🟢 ' + fmt(t('stem.multtable.sim_mastered', 'Mastered (≥{x}%)'), { x: iq.threshold }), color: '#047857', bg: '#ecfdf5', border: '#86efac' }
        }[state];
        return h('section', { className: 'rounded-xl border-2 border-indigo-300 bg-white p-3 space-y-2', 'data-mt-teacher': 'true', 'aria-labelledby': 'mt-teacher-h' },
          h('h3', { id: 'mt-teacher-h', className: 'text-sm font-black text-indigo-900' }, '👩‍🏫 ' + t('stem.multtable.teacher_title', 'Teacher panel')),
          h('p', { className: 'text-xs text-slate-800' }, t('stem.multtable.teacher_intro', 'These settings apply to learners on this device. Learners do not see this panel.')),
          seg(t('stem.multtable.teacher_lock_band', 'Lock the fact set'), [[null, t('stem.multtable.teacher_no_lock', 'No lock')], ['early', bandName('early')], ['core', bandName('core')], ['extend', bandName('extend')]], bandLock, function(v) { teacherSet({ lockBand: v }); }),
          seg(t('stem.multtable.teacher_lock_mode', 'Lock the direction'), [[null, t('stem.multtable.teacher_no_lock', 'No lock')]].concat(QUIZ_MODE_IDS.map(function(id) { return [id, modeName(id)]; })), modeLock, function(v) { teacherSet({ lockMode: v }); }),
          seg(t('stem.multtable.teacher_tries', 'Tries before the answer is shown'), [[2, '2'], [3, '3']], maxTries, function(v) { teacherSet({ tries: v }); }),
          seg(t('stem.multtable.teacher_show_answer', '"Show me the answer" button'), [[true, t('stem.multtable.on', 'On')], [false, t('stem.multtable.off', 'Off')]], showAnswerButton, function(v) { teacherSet({ showAnswer: v }); }),
          seg(t('stem.multtable.teacher_speed', 'Speed Runs'), [[true, t('stem.multtable.allowed', 'Allowed')], [false, t('stem.multtable.off', 'Off')]], speedAllowed, function(v) { teacherSet({ speedOff: !v }); }),
          seg(t('stem.multtable.teacher_fluency_timer', 'Fluency game timer'), [[0, t('stem.multtable.timer_off_default', 'Off (default)')], [180, t('stem.multtable.timer_3', '3 minutes')], [300, t('stem.multtable.timer_5', '5 minutes')]], fluTimerSetting, function(v) { teacherSet({ fluencyTimer: v }); }),
          fluTimerSetting > 0 && seg(t('stem.multtable.teacher_extended', 'Extended time (accommodation)'), [[false, t('stem.multtable.off', 'Off')], [true, t('stem.multtable.extended_15', '1.5 × the time')]], fluExtended, function(v) { teacherSet({ fluencyExtended: v }); }),
          h('p', { className: 'text-xs text-slate-700' }, t('stem.multtable.teacher_timer_note', 'The fluency game has no clock unless you choose one. A clock can raise anxiety and lower accuracy for some learners; learners can always pause it, and a timed-out round never counts unanswered facts as wrong.')),
          seg(t('stem.multtable.teacher_path', '"Start here" steps'), [[true, t('stem.multtable.shown', 'Shown')], [false, t('stem.multtable.hidden', 'Hidden')]], teach.hidePath !== true, function(v) { teacherSet({ hidePath: !v }); }),
          seg(t('stem.multtable.teacher_wp_lock', 'Word problems'), [[null, t('stem.multtable.wp_all_types', 'All types')], ['one', t('stem.multtable.wp_one_step', 'One-step only')], ['two', t('stem.multtable.wp_two_step', 'Two-step only')]], wpLock, function(v) { teacherSet({ wpLock: v }); }),
          h('div', { className: 'rounded-lg border border-slate-300 p-2', 'data-mt-teacher-missed': 'true' },
            h('p', { className: 'text-xs font-bold text-slate-900' }, fmt(t('stem.multtable.teacher_missed', 'Missed this session ({n})'), { n: missedAll.length })),
            missedAll.length ? h('ul', { className: 'text-xs text-slate-800 list-disc pl-5' }, missedAll.map(function(m, i) { return h('li', { key: i }, formatMissedFact(m)); }))
              : h('p', { className: 'text-xs text-slate-700' }, t('stem.multtable.teacher_none_missed', 'Nothing missed yet.')),
            Object.keys(tally).length > 0 && h('p', { className: 'text-xs font-bold text-slate-900 mt-2' }, t('stem.multtable.teacher_mistakes', 'Mistake types')),
            Object.keys(tally).length > 0 && h('ul', { className: 'text-xs text-slate-800 list-disc pl-5' }, Object.keys(tally).map(function(k) { return h('li', { key: k }, mistakeLabel(k) + ': ' + tally[k]); })),
            h('button', { type: 'button', className: 'mt-2 px-3 rounded-lg text-xs font-bold bg-white text-indigo-800 border border-indigo-500', style: CHIP,
              onClick: function() {
                var done = function(ok) { var msg = ok ? t('stem.multtable.teacher_copied', 'Summary copied.') : t('stem.multtable.teacher_copy_failed', 'Copy is not available here. Select the list and copy it instead.'); addToast(msg, ok ? 'success' : 'info'); announceToSR(msg); };
                // The host's writeClipboard has the execCommand fallback Gemini Canvas needs.
                var write = window.StemLab && typeof window.StemLab.writeClipboard === 'function' ? function(s) { return window.StemLab.writeClipboard(s); }
                  : (navigator.clipboard && navigator.clipboard.writeText ? function(s) { return navigator.clipboard.writeText(s); } : null);
                try { if (write) Promise.resolve(write(summary)).then(function() { done(true); }, function() { done(false); }); else done(false); } catch (e) { done(false); }
              } }, t('stem.multtable.teacher_copy', 'Copy session summary'))
          ),
          // Mastery-threshold thought experiment (teacher only; simulated data).
          h('details', { className: 'mt-1 p-3 rounded-xl bg-white border border-indigo-300 space-y-2', 'data-teacher-mastery-demo': true },
            h('summary', { style: { color: ctx.isContrast ? '#ffffff' : undefined, minHeight: 32 }, className: 'cursor-pointer text-sm font-bold text-indigo-800' }, t('stem.multtable.teacher_data_activity', 'Teacher activity: explore a hypothetical mastery threshold')),
            h('p', { className: 'text-sm text-slate-700' }, t('stem.multtable.simulation_notice', 'This is simulated data, not your practice results. Use the mastery heatmap above to review answers you have actually given.')),
            h('h4', { className: 'text-sm font-black text-indigo-800' }, t('stem.multtable.fact_mastery_discovery', '🎯 Fact mastery discovery')),
            h('div', { className: 'p-2 rounded text-center', style: mtTheme === 'hc' ? { background: '#000000', border: '1px solid #ffffff' } : { background: sm.bg, border: '1px solid ' + sm.border } },
              h('div', { className: 'text-sm font-black', style: { color: mtTheme === 'hc' ? '#ffff00' : sm.color } }, sm.label),
              h('div', { className: 'text-[0.625rem] text-slate-700 mt-1 font-mono' }, fmt(t('stem.multtable.sim_accuracy', 'Factor {f} simulated accuracy = {p}%'), { f: iq.factor, p: perf }))
            ),
            h('div', { className: 'grid grid-cols-2 gap-2' },
              [{ k: 'threshold', l: t('stem.multtable.sim_threshold', 'Mastery threshold %'), mn: 60, mx: 100, st: 5 },
               { k: 'factor', l: t('stem.multtable.sim_factor', 'Factor'), mn: 1, mx: 12, st: 1 }].map(function(s) {
                return h('div', { key: s.k },
                  h('label', { htmlFor: 'fm-' + s.k, className: 'block text-[0.625rem] font-bold text-slate-700' }, s.l + ': ', h('span', { className: 'font-mono text-indigo-800' }, iq[s.k])),
                  h('input', { id: 'fm-' + s.k, type: 'range', min: s.mn, max: s.mx, step: s.st, value: iq[s.k],
                    onChange: function(e) { var p = {}; p[s.k] = parseInt(e.target.value, 10); setIQ(p); },
                    className: 'w-full', 'aria-label': s.l, style: { minHeight: 24 } }));
              })
            ),
            h('textarea', { value: iq.hypothesis || '', onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, placeholder: t('stem.multtable.hypothesis_how_does_threshold_change_f', 'Hypothesis: How does threshold change feedback for struggling learners?'),
              'aria-label': t('stem.multtable.mastery_hypothesis', 'Mastery threshold hypothesis'),
              className: 'w-full text-[0.6875rem] border border-slate-500 rounded p-1 font-mono leading-snug', rows: 2 }),
            h('ul', { className: 'list-disc pl-4 space-y-0.5 text-[0.625rem] text-slate-700' },
              h('li', null, t('stem.multtable.what_if_mastery_100_what_gets_praised', 'What if mastery = 100%? What gets praised?')),
              h('li', null, t('stem.multtable.how_does_color_coding_affect_motivatio', 'How does color-coding affect motivation?'))),
            h('textarea', { value: iq.explanation || '', onChange: function(e) { setIQ({ explanation: e.target.value }); }, placeholder: t('stem.multtable.explain_mastery_learning_thresholds', 'Explain mastery learning thresholds.'),
              'aria-label': t('stem.multtable.mastery_explanation', 'Explain mastery learning thresholds'),
              className: 'w-full text-[0.6875rem] border border-emerald-700 rounded p-1 font-mono leading-snug mt-1', rows: 3 }),
            h('p', { className: 'text-[0.625rem] italic text-slate-700' }, t('stem.multtable.threshold_reflection', 'How does changing the threshold change the support you would offer? A label alone cannot explain a learner’s understanding.'))
          )
        );
      }

      // ═══════════════════════════════════════════
      // ═══ STAGE B: factors, word problems, fact families, fluency game ═══
      // ═══════════════════════════════════════════
      function opWord(op) {
        switch (op) {
          case 'mul': return t('stem.multtable.op_mul', 'Multiply (×)');
          case 'div': return t('stem.multtable.op_div', 'Divide (÷)');
          case 'add': return t('stem.multtable.op_add', 'Add (+)');
          default: return t('stem.multtable.op_sub', 'Subtract (−)');
        }
      }
      function opsLabel(ops) {
        if (ops.length === 1) return fmt(t('stem.multtable.wp_op_only', '{op} only'), { op: opWord(ops[0]) });
        return fmt(t('stem.multtable.wp_op_pair', '{first}, then {second}'), { first: opWord(ops[0]), second: opWord(ops[1]) });
      }
      function itOpsLabel(it) { return it.ops.length === 1 ? opWord(it.ops[0]) : opsLabel(it.ops); }
      function stepEq(st, showValue) { return st.l + ' ' + WP_STEP[st.op] + ' ' + st.r + ' = ' + (showValue ? st.v : '?'); }
      function listJoin(arr) { return arr.join(', '); }
      // XP once per item per visit: returns the new ledger.
      function xpOnce(ledger, id, pts, reason) {
        if (ledger[id]) return ledger;
        var next = Object.assign({}, ledger);
        next[id] = true;
        if (typeof awardXP === 'function') awardXP('multtable', pts, reason);
        return next;
      }
      function bumpTally(tally, kind) { var n = Object.assign({}, tally || {}); if (kind) n[kind] = (n[kind] || 0) + 1; return n; }

      // ── Factor rectangles (pairs as arrays) ──
      var fxMax = band === 'early' ? 30 : band === 'core' ? 50 : 100;
      var fx = Object.assign({ n: 24, pred: null, found: [], tests: [], checks: 0, complete: false, revealed: false }, (_ext.fx && typeof _ext.fx === 'object') ? _ext.fx : {});
      if (!(fx.n >= 1 && fx.n <= 100)) fx.n = 24;
      fx.found = (Array.isArray(fx.found) ? fx.found : []).filter(function(pr) { return Array.isArray(pr) && pr[0] >= 1 && pr[0] * pr[1] === fx.n; });
      fx.tests = (Array.isArray(fx.tests) ? fx.tests : []).filter(function(x) { return x && typeof x === 'object' && x.w >= 1; });
      function fxSet(patch) { extUpd({ fx: Object.assign({}, fx, patch) }); }
      function fxNewNumber(n) {
        var v = n;
        if (v == null) { v = 4 + Math.floor(Math.random() * (fxMax - 3)); if (v === fx.n) v = v < fxMax ? v + 1 : v - 1; }
        extUpd({ fx: { n: v, pred: null, found: [], tests: [], checks: 0, complete: false, revealed: false } });
        setL({ fxWidth: '' });
        announceToSR(fmt(t('stem.multtable.fx_new', 'New number: {n}. Predict first: prime or composite?'), { n: v }));
      }
      function fxTest() {
        var w = parseWholeAnswer(local.fxWidth), n = fx.n;
        if (w === null || w < 1 || w > n) { announceToSR(fmt(t('stem.multtable.fx_need_width', 'Type a number of rows from 1 to {n}.'), { n: n })); return; }
        var ok = n % w === 0, q = Math.floor(n / w), r = n % w;
        var rec = { w: w, ok: ok, q: q, r: r };
        var found = fx.found.slice();
        var pair = ok ? [Math.min(w, n / w), Math.max(w, n / w)] : null;
        var isNew = pair && !found.some(function(f) { return f[0] === pair[0] && f[1] === pair[1]; });
        if (isNew) found.push(pair);
        found.sort(function(x, y) { return x[0] - y[0]; });
        fxSet({ found: found, tests: fx.tests.concat([rec]).slice(-8) });
        setL({ fxWidth: '' });
        announceToSR(fxTestLine(rec, n) + (pair && !isNew ? ' ' + t('stem.multtable.fx_already', 'You already have this rectangle.') : ''));
      }
      function fxTestLine(x, n) {
        if (x.ok && x.w === 1) return fmt(t('stem.multtable.fx_yes_one', '1 row of {q}: yes. 1 × {q} = {n}, so 1 and {q} are a factor pair.'), { q: x.q, n: n });
        if (x.ok) return fmt(t('stem.multtable.fx_yes', '{w} rows of {q}: yes. {w} × {q} = {n}, so {w} and {q} are a factor pair.'), { w: x.w, q: x.q, n: n });
        if (x.q === 0) return fmt(t('stem.multtable.fx_too_wide', '{w} rows: no. There are not enough squares to put one in each of {w} rows.'), { w: x.w });
        return fmt(t('stem.multtable.fx_no', '{w} rows: no. {w} rows of {q} make {m}, with {r} left over.'), { w: x.w, q: x.q, m: x.w * x.q, r: x.r });
      }
      function fxCheckAll() {
        var all = factorPairs(fx.n);
        var missing = all.filter(function(pr) { return !fx.found.some(function(f) { return f[0] === pr[0] && f[1] === pr[1]; }); });
        if (!missing.length) {
          // No credit for a number whose pairs were shown this visit.
          var visitXp = (visit.revealed || {})['fx:' + fx.n] ? visit.xp : xpOnce(visit.xp, 'fx:' + fx.n, 3, 'factor pairs found');
          extUpd({ fx: Object.assign({}, fx, { complete: true }), visit: visitPatch({ xp: visitXp }) });
          announceToSR(fxDoneText());
          return;
        }
        var checks = (fx.checks || 0) + 1;
        fxSet({ checks: checks });
        announceToSR(fxMissingText());
      }
      // Visit record of items shown without credit, so they earn nothing when they come back.
      function revealedWith(id) { var r = Object.assign({}, visit.revealed); r[id] = true; return r; }
      function fxRevealMissing() {
        extUpd({ fx: Object.assign({}, fx, { found: factorPairs(fx.n), complete: true, revealed: true }), visit: visitPatch({ revealed: revealedWith('fx:' + fx.n) }) });
        announceToSR(fxDoneText());
      }
      function fxMissingText() {
        var s = widthLimit(fx.n);
        return fmt(t('stem.multtable.fx_missing', 'Not yet: there is at least one more factor pair. Test every number of rows from 1 to {s}. {s} × {s} is the biggest square that fits inside {n}, so you never need to test more rows than that.'), { s: s, n: fx.n });
      }
      function fxDoneText() {
        var n = fx.n, fl = factorsOf(n), st = primeStatus(n);
        var line = fmt(t('stem.multtable.fx_done', '{n} has {k} factor pairs, so its factors are {list}.'), { n: n, k: factorPairs(n).length, list: listJoin(fl) });
        return line + ' ' + statusSentence(n, st);
      }
      function statusSentence(n, st) {
        if (st === 'neither') return t('stem.multtable.status_neither', '1 has only one factor, so it is neither prime nor composite.');
        if (st === 'prime') return fmt(t('stem.multtable.status_prime', '{n} has exactly two factors, 1 and {n}, so it is prime: its only rectangle is one long row.'), { n: n });
        return fmt(t('stem.multtable.status_composite', '{n} has more than two factors, so it is composite: it makes more than one rectangle.'), { n: n });
      }
      function renderRect(w, hgt, key, labelText) {
        var unit = Math.max(4, Math.min(16, Math.floor(260 / Math.max(w, hgt, 1))));
        var W = hgt * unit + 2, H = w * unit + 2, cells = [];
        if (w * hgt <= 400) {
          for (var r = 0; r < w; r++) for (var c = 0; c < hgt; c++) cells.push(h('rect', { key: r + '-' + c, x: 1 + c * unit, y: 1 + r * unit, width: unit, height: unit, fill: (r + c) % 2 ? '#bfdbfe' : '#dbeafe', stroke: '#1e3a8a', strokeWidth: 1 }));
        }
        return h('svg', { key: key, viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': labelText, style: { width: Math.min(W, 280), maxWidth: '100%', height: 'auto', display: 'block', background: '#fff' } }, cells);
      }
      function renderFactorRects() {
        var n = fx.n, s = widthLimit(n);
        var predicted = fx.pred;
        var predChoices = [['prime', t('stem.multtable.choice_prime', 'Prime')], ['composite', t('stem.multtable.choice_composite', 'Composite')], ['unsure', t('stem.multtable.choice_unsure', 'Not sure yet')]];
        return h('section', { className: 'bg-white rounded-xl border-2 border-indigo-200 p-3 space-y-3', 'aria-labelledby': 'mt-fx-h', 'data-mt-factors': 'true' },
          h('h3', { id: 'mt-fx-h', className: 'text-sm font-black text-indigo-900' }, t('stem.multtable.fx_title', 'Factor rectangles: every way to make a number as an array')),
          h('p', { className: 'text-xs text-slate-800' }, t('stem.multtable.fx_intro', 'A factor pair is a rectangle: rows × squares in each row. Find every rectangle the number can make.')),
          h('div', { className: 'flex flex-wrap items-end gap-2' },
            h('label', { className: 'text-xs font-bold text-slate-800' }, fmt(t('stem.multtable.fx_number', 'Number (1 to {max})'), { max: 100 }),
              h('input', { type: 'number', min: 1, max: 100, value: local.fxNum != null ? local.fxNum : n, 'data-mt-fx-number': 'true',
                onChange: function(e) { setL({ fxNum: e.target.value }); },
                onKeyDown: function(e) { if (e.key === 'Enter') { var v = parseWholeAnswer(local.fxNum); if (v !== null && v >= 1 && v <= 100) { setL({ fxNum: null }); fxNewNumber(v); } } },
                className: 'block w-20 px-2 py-1 border border-slate-500 rounded bg-white text-slate-900', style: { minHeight: 36 } })),
            h('button', { type: 'button', onClick: function() { var v = parseWholeAnswer(local.fxNum); if (v !== null && v >= 1 && v <= 100) { setL({ fxNum: null }); fxNewNumber(v); } else announceToSR(t('stem.multtable.fx_need_number', 'Type a whole number from 1 to 100.')); },
              className: 'px-3 rounded-lg text-xs font-bold bg-white text-indigo-800 border border-indigo-500', style: CHIP }, t('stem.multtable.fx_use_number', 'Explore this number')),
            h('button', { type: 'button', onClick: function() { setL({ fxNum: null }); fxNewNumber(null); },
              className: 'px-3 rounded-lg text-xs font-bold bg-indigo-700 text-white', style: CHIP }, t('stem.multtable.fx_random', 'Give me a number'))),
          h('p', { className: 'text-base font-bold text-indigo-900' }, fmt(t('stem.multtable.fx_exploring', 'Exploring {n}'), { n: n })),
          h('div', { role: 'group', 'aria-label': t('stem.multtable.fx_predict', 'Predict first: is it prime or composite?'), className: 'flex flex-wrap gap-2 items-center' },
            h('span', { className: 'text-xs font-bold text-slate-800' }, t('stem.multtable.fx_predict', 'Predict first: is it prime or composite?')),
            predChoices.map(function(o) {
              return h('button', { key: o[0], type: 'button', 'aria-pressed': predicted === o[0], disabled: fx.complete,
                onClick: function() { fxSet({ pred: o[0] }); announceToSR(fmt(t('stem.multtable.fx_pred_saved', 'Prediction saved: {p}. Now test rectangles.'), { p: o[1] })); },
                className: 'px-3 rounded-lg text-xs font-bold border disabled:opacity-60 ' + (predicted === o[0] ? 'bg-indigo-700 text-white border-indigo-800' : 'bg-white text-indigo-800 border-indigo-400'), style: CHIP }, o[1]);
            })),
          predicted && !fx.complete && h('div', { className: 'flex flex-wrap items-end gap-2' },
            h('label', { className: 'text-xs font-bold text-slate-800' }, t('stem.multtable.fx_rows', 'Rows to try'),
              h('input', { type: 'number', min: 1, max: n, value: local.fxWidth || '', 'data-mt-fx-width': 'true',
                onChange: function(e) { setL({ fxWidth: e.target.value }); },
                onKeyDown: function(e) { if (e.key === 'Enter') fxTest(); },
                className: 'block w-20 px-2 py-1 border border-slate-500 rounded bg-white text-slate-900', style: { minHeight: 36 } })),
            h('button', { type: 'button', onClick: fxTest, disabled: !String(local.fxWidth || '').trim(), className: 'px-3 rounded-lg text-xs font-bold bg-indigo-700 text-white disabled:opacity-50', style: CHIP }, t('stem.multtable.fx_test', 'Test these rows')),
            h('button', { type: 'button', onClick: fxCheckAll, className: 'px-3 rounded-lg text-xs font-bold bg-white text-emerald-900 border border-emerald-700', style: CHIP }, t('stem.multtable.fx_check_all', 'I have found every pair')),
            (fx.checks || 0) >= 2 && showAnswerButton && h('button', { type: 'button', onClick: fxRevealMissing, className: 'px-3 rounded-lg text-xs font-bold bg-white text-slate-800 border border-slate-500', style: CHIP }, t('stem.multtable.fx_show_missing', 'Show me the missing pairs'))),
          fx.tests.length > 0 && h('ul', { className: 'text-xs text-slate-800 list-disc pl-5', 'aria-label': t('stem.multtable.fx_tests', 'Rows you tested') }, fx.tests.map(function(x, i) { return h('li', { key: i }, fxTestLine(x, n)); })),
          h('div', { role: 'status', className: 'text-sm font-bold text-slate-900', 'data-mt-fx-status': 'true' },
            fx.complete ? fxDoneText() : (fx.checks > 0 ? fxMissingText() : '')),
          fx.complete && predicted && predicted !== 'unsure' && h('p', { className: 'text-sm text-slate-900' },
            predicted === primeStatus(n)
              ? t('stem.multtable.fx_pred_right', 'Your prediction was right, and the rectangles are the evidence.')
              : fmt(t('stem.multtable.fx_pred_wrong', 'You predicted {p}. The rectangles show otherwise: that is what testing is for.'), { p: predicted === 'prime' ? t('stem.multtable.choice_prime', 'Prime') : t('stem.multtable.choice_composite', 'Composite') })),
          fx.complete && h('p', { className: 'text-xs text-slate-800' }, fmt(t('stem.multtable.fx_why_stop', 'Why stop at {s} rows? Any rectangle with more rows than {s} is one you already found, turned on its side.'), { s: s })),
          fx.found.length > 0 && h('ul', { className: 'flex flex-wrap gap-3 items-start', 'aria-label': t('stem.multtable.fx_found', 'Rectangles found') },
            fx.found.map(function(pr) {
              var lbl = pr[0] === 1 ? fmt(t('stem.multtable.fx_rect_label_one', '1 row of {q} squares, {n} squares in all.'), { q: pr[1], n: n }) : fmt(t('stem.multtable.fx_rect_label', '{w} rows of {q} squares, {n} squares in all.'), { w: pr[0], q: pr[1], n: n });
              return h('li', { key: pr[0] + 'x' + pr[1], className: 'rounded-lg border border-indigo-200 p-2 bg-white' },
                renderRect(pr[0], pr[1], 'r', lbl),
                h('p', { className: 'text-xs font-bold text-indigo-900 mt-1' }, pr[0] + TIMES + pr[1] + ' = ' + n),
                pr[0] <= 12 && pr[1] <= 12 && h('button', { type: 'button', onClick: function() { openArrays({ visualA: pr[0], visualB: pr[1], visualPred: null }); },
                  className: 'mt-1 px-2 rounded text-xs font-bold bg-white text-indigo-800 border border-indigo-500', style: CHIP }, fmt(t('stem.multtable.fx_as_array', 'Build {w} × {q} as an array'), { w: pr[0], q: pr[1] })));
            }))
        );
      }

      // ── Number detective: prime / composite, more factors, multiples ──
      var det = (_ext.det && _ext.det.item && typeof _ext.det.item === 'object' && ['prime', 'more', 'multiple'].indexOf(_ext.det.item.type) !== -1) ? _ext.det : null;
      function detNew() {
        var item = pickDetectiveItem(band, Math.random);
        extUpd({ det: { item: item, tries: 0, wrong: [], resolved: false, ok: false, mistake: null } });
        announceToSR(detQuestion(item));
        focusSoon('[data-mt-det-choice]');
      }
      function detQuestion(item) {
        if (item.type === 'prime') return fmt(t('stem.multtable.det_q_prime', 'Is {n} prime, composite, or neither?'), { n: item.n });
        if (item.type === 'more') return fmt(t('stem.multtable.det_q_more', 'Which number has more factors: {x} or {y}?'), { x: item.x, y: item.y });
        return fmt(t('stem.multtable.det_q_multiple', 'Is {n} a multiple of {d}?'), { n: item.n, d: item.d });
      }
      function detOptions(item) {
        if (item.type === 'prime') return [['prime', t('stem.multtable.choice_prime', 'Prime')], ['composite', t('stem.multtable.choice_composite', 'Composite')], ['neither', t('stem.multtable.choice_neither', 'Neither')]];
        if (item.type === 'more') return [[item.x, String(item.x)], [item.y, String(item.y)]];
        return [['yes', t('stem.multtable.choice_yes', 'Yes')], ['no', t('stem.multtable.choice_no', 'No')]];
      }
      function detHint(m) {
        switch (m.kind) {
          case 'onePrime': return t('stem.multtable.det_hint_one_prime', 'Careful: 1 is a special case. A prime number has exactly two different factors. How many factors does 1 have?');
          case 'oneComposite': return t('stem.multtable.det_hint_one_composite', 'A composite number has more than two factors. How many factors does 1 have?');
          case 'neitherOnlyOne': return fmt(t('stem.multtable.det_hint_neither', 'Only one whole number is neither prime nor composite, and it is 1. Count the factors of {n}.'), m);
          case 'twoEven': return t('stem.multtable.det_hint_two_even', 'Even does not always mean composite. List the factors of 2: how many are there?');
          case 'primeHasPair': return fmt(t('stem.multtable.det_hint_prime_pair', 'Can you find a rectangle for {n} other than one long row? Test 2 rows, 3 rows, and so on up to {s}.'), m);
          case 'oddPrime': return fmt(t('stem.multtable.det_hint_odd_prime', 'Odd numbers can still be composite. Test the odd numbers of rows from 3 up to {s}: does any of them fit into {n} with nothing left over?'), m);
          case 'evenPrime': return fmt(t('stem.multtable.det_hint_even_prime', 'Every even number can be split into 2 equal rows. What does that tell you about {n}?'), m);
          case 'biggerMore': return t('stem.multtable.det_hint_bigger_more', 'A bigger number does not always have more factors. List the factors of both numbers and count them.');
          case 'countAgain': return fmt(t('stem.multtable.det_hint_count_again', 'Count again: list every factor of {x}, then every factor of {y}.'), m);
          case 'factorNotMultiple': return fmt(t('stem.multtable.det_hint_factor_multiple', 'Multiples of {d} are {d}, 2 × {d}, 3 × {d}, and so on, so they are never smaller than {d}. Is {n} a factor of {d} or a multiple of it?'), m);
          default: return fmt(t('stem.multtable.det_hint_skip_count', 'Skip-count by {d}s. Do you land exactly on {n}?'), m);
        }
      }
      function detEvidence(item) {
        if (item.type === 'prime') {
          var pairs = factorPairs(item.n).map(function(pr) { return pr[0] + TIMES + pr[1]; });
          return fmt(t('stem.multtable.det_ev_prime', 'Factors of {n}: {list}. Factor pairs: {pairs}.'), { n: item.n, list: listJoin(factorsOf(item.n)), pairs: listJoin(pairs) }) + ' ' + statusSentence(item.n, primeStatus(item.n));
        }
        if (item.type === 'more') {
          var fxs = factorsOf(item.x), fys = factorsOf(item.y);
          return fmt(t('stem.multtable.det_ev_more', '{x} has {cx} factors: {lx}. {y} has {cy} factors: {ly}.'), { x: item.x, cx: fxs.length, lx: listJoin(fxs), y: item.y, cy: fys.length, ly: listJoin(fys) });
        }
        var n = item.n, d = item.d;
        if (n % d === 0) return fmt(t('stem.multtable.det_ev_yes', 'Yes: {d} × {k} = {n}, so {n} is a multiple of {d}.'), { d: d, k: n / d, n: n });
        if (n < d) return fmt(d % n === 0 ? t('stem.multtable.det_ev_factor', 'No: the multiples of {d} start at {d}, and {n} is smaller. {n} is a factor of {d}, not a multiple.') : t('stem.multtable.det_ev_smaller', 'No: the multiples of {d} start at {d}, and {n} is smaller.'), { d: d, n: n });
        var k1 = Math.floor(n / d);
        return fmt(t('stem.multtable.det_ev_no', 'No: {d} × {k1} = {lo} and {d} × {k2} = {hi}. Counting by {d}s jumps over {n}.'), { d: d, k1: k1, lo: d * k1, k2: k1 + 1, hi: d * (k1 + 1), n: n });
      }
      function detPick(choice) {
        if (!det || det.resolved) return;
        var item = det.item, ok = choice === detectiveAnswer(item);
        var tries = (det.tries || 0) + 1;
        var m = ok ? null : diagnoseDetective(item, choice);
        var tally = bumpTally(visit.tally, m && m.kind);
        if (!ok && tries < 2) {
          playSound('wrong');
          extUpd({ det: Object.assign({}, det, { tries: tries, wrong: (det.wrong || []).concat([choice]), mistake: m }), visit: visitPatch({ tally: tally }) });
          announceToSR(detHint(m) + ' ' + t('stem.multtable.det_try_again', 'Think again, then choose.'));
          focusSoon('[data-mt-det-choice]:not([disabled])'); // the choice just used is now disabled
          return;
        }
        playSound(ok ? 'correct' : 'wrong');
        var firstTry = ok && tries === 1;
        // The evidence is now shown: a later first try at this item (same visit) earns nothing.
        var detKey = 'det:' + item.id, detSeen = !!(visit.revealed || {})[detKey];
        var xp = firstTry && !detSeen ? xpOnce(visit.xp, detKey, 3, 'number detective') : visit.xp;
        var patch = { det: Object.assign({}, det, { tries: tries, resolved: true, ok: ok, firstTry: firstTry, mistake: ok ? det.mistake : m, wrong: ok ? det.wrong : (det.wrong || []).concat([choice]) }),
          visit: visitPatch({ xp: xp, tally: tally, revealed: firstTry ? visit.revealed : revealedWith(detKey) }) };
        var newCount = (_ext.primeCorrect || 0) + (firstTry && xp !== visit.xp ? 1 : 0);
        patch.primeCorrect = newCount;
        extUpd(patch);
        focusSoon('[data-mt-det-next]');
        announceToSR((ok ? (firstTry ? t('stem.multtable.sr_correct', 'Correct!') : t('stem.multtable.det_right_second', 'Right on the second try.')) : t('stem.multtable.det_not_this_time', 'Not this time.')) + ' ' + detEvidence(item));
        if (newCount >= 10) checkBadges({ primeDetective: true });
      }
      function renderDetective() {
        return h('section', { className: 'bg-white rounded-xl border-2 border-indigo-200 p-3 space-y-3', 'aria-labelledby': 'mt-det-h', 'data-mt-detective': 'true' },
          h('h3', { id: 'mt-det-h', className: 'text-sm font-black text-indigo-900' }, t('stem.multtable.det_title', 'Number detective: decide first, then check')),
          !det && h('div', null,
            h('p', { className: 'text-xs text-slate-800 mb-2' }, t('stem.multtable.det_intro', 'Prime or composite? Which has more factors? Is it a multiple? Commit to an answer, then see the evidence.')),
            h('button', { type: 'button', onClick: detNew, className: 'px-4 rounded-lg bg-indigo-700 text-white font-bold text-sm', style: BTN }, t('stem.multtable.det_start', 'Give me a question'))),
          det && h('div', { className: 'space-y-2' },
            h('p', { id: 'mt-det-q', className: 'text-base font-bold text-slate-900', 'data-mt-det-question': 'true' }, detQuestion(det.item)),
            h('div', { role: 'group', 'aria-label': t('stem.multtable.det_choices', 'Your answer'), className: 'flex flex-wrap gap-2' },
              detOptions(det.item).map(function(o) {
                var tried = (det.wrong || []).some(function(w) { return w === o[0]; });
                return h('button', { key: String(o[0]), type: 'button', disabled: det.resolved || tried, 'data-mt-det-choice': String(o[0]), 'aria-describedby': 'mt-det-q',
                  onClick: function() { detPick(o[0]); },
                  className: 'px-4 rounded-lg text-sm font-bold border-2 disabled:opacity-60 ' + (tried ? 'bg-slate-100 text-slate-800 border-slate-400 line-through' : 'bg-white text-indigo-900 border-indigo-600'), style: BTN }, o[1]);
              })),
            h('div', { role: 'status', 'aria-live': 'polite', 'data-mt-det-feedback': 'true' },
              !det.resolved && det.mistake && h('p', { className: 'text-sm text-slate-900', 'data-mt-det-mistake': det.mistake.kind }, detHint(det.mistake)),
              det.resolved && h('p', { className: 'text-sm font-bold ' + (det.ok ? 'text-green-800' : 'text-red-800') },
                det.ok ? (det.firstTry ? '✅ ' + t('stem.multtable.sr_correct', 'Correct!') : '✅ ' + t('stem.multtable.det_right_second', 'Right on the second try.')) : '❌ ' + t('stem.multtable.det_not_this_time', 'Not this time.')),
              det.resolved && h('p', { className: 'text-sm text-slate-900' }, detEvidence(det.item)),
              det.resolved && det.mistake && det.mistake.kind === 'biggerMore' && h('p', { className: 'text-xs text-slate-800' }, t('stem.multtable.det_bigger_note', 'Size does not decide how many factors a number has. 97 is big but prime; 12 is small but has six factors.'))),
            det.resolved && det.item.type === 'prime' && det.item.n <= 100 && h('div', { className: 'flex flex-wrap gap-2' },
              factorPairs(det.item.n).map(function(pr) { return h('div', { key: pr[0] }, renderRect(pr[0], pr[1], 'r', pr[0] === 1 ? fmt(t('stem.multtable.fx_rect_label_one', '1 row of {q} squares, {n} squares in all.'), { q: pr[1], n: det.item.n }) : fmt(t('stem.multtable.fx_rect_label', '{w} rows of {q} squares, {n} squares in all.'), { w: pr[0], q: pr[1], n: det.item.n }))); })),
            det.resolved && h('button', { type: 'button', onClick: detNew, 'data-mt-det-next': 'true', className: 'px-4 rounded-lg bg-indigo-700 text-white font-bold text-sm', style: BTN }, t('stem.multtable.det_next', 'Next question')))
        );
      }

      // ── Sieve of Eratosthenes (keyboard grid, one tab stop) ──
      var sieveN = (_ext.sieve && [30, 50, 100].indexOf(_ext.sieve.n) !== -1) ? _ext.sieve.n : (band === 'early' ? 30 : band === 'core' ? 50 : 100);
      var sieve = (_ext.sieve && _ext.sieve.n === sieveN && _ext.sieve.crossed && _ext.sieve.primes) ? _ext.sieve : sieveInit(sieveN);
      var sieveFb = _ext.sieveFb || null;
      function sieveDo(act) {
        var res = sieveAct(sieve, act);
        var patch = { sieve: res.s, sieveFb: res.fb };
        var tally = res.fb && res.fb.kind === 'onePrime' ? bumpTally(visit.tally, 'onePrime') : null;
        if (tally) patch.visit = visitPatch({ tally: tally });
        if (res.s.done && !sieve.done) {
          patch.sieveDone = (_ext.sieveDone || 0) + 1;
          patch.visit = visitPatch({ tally: (tally || visit.tally), xp: xpOnce(visit.xp, 'sieve:' + sieveN, 10, 'sieve of Eratosthenes') });
        }
        extUpd(patch);
        if (res.fb) announceToSR(sieveFbText(res.fb));
        if (res.s.done && !sieve.done) checkBadges({ sieveSolver: true });
      }
      function sieveFbText(fb) {
        switch (fb.kind) {
          case 'onePrime': return t('stem.multtable.sv_one_prime', 'Not quite. A prime has exactly two different factors, 1 and itself. 1 has only one factor. Try again: what should happen to 1?');
          case 'oneCrossed': return t('stem.multtable.sv_one_crossed', 'Yes: 1 is neither prime nor composite, so cross it out. Now circle the first number that is not crossed out.');
          case 'oneFirst': return t('stem.multtable.sv_one_first', 'Decide about 1 first, using the buttons above the grid.');
          case 'circled': return fmt(t('stem.multtable.sv_circled', '{n} is circled: it is prime, because no smaller number except 1 goes into it. Predict before you cross anything out.'), fb);
          case 'alreadyCrossed': return fmt(t('stem.multtable.sv_already_crossed', '{n} is already crossed out.'), fb);
          case 'alreadyCircled': return fmt(t('stem.multtable.sv_already_circled', '{n} is already circled as a prime.'), fb);
          case 'notSmallest': return t('stem.multtable.sv_not_smallest', 'Look for a smaller number that is not crossed out yet. The next prime is always the first number left.');
          case 'predictFirst': return fmt(t('stem.multtable.sv_predict_first', 'Answer the question first: will crossing out multiples of {p} cross out any new numbers?'), fb);
          case 'predictRight': return fmt(t('stem.multtable.sv_predict_right', 'Yes. Now cross out every multiple of {p}: count by {p}s. Move with the arrow keys and press Enter on each one.'), fb);
          case 'predictMissed': return fmt(t('stem.multtable.sv_predict_missed', 'Check {sq}: it is {p} × {p}, and it is not crossed out yet. Try the question again.'), fb);
          case 'predictNoNew': return fmt(t('stem.multtable.sv_predict_no_new', 'Think about the multiples of {p}: 2 × {p}, 3 × {p} and the rest already had a smaller factor crossed out. The first new one would be {p} × {p} = {sq}, which is more than {n}. Try the question again.'), fb);
          case 'finished': return fmt(t('stem.multtable.sv_finished', 'Right: {p} × {p} = {sq} is more than {n}, so nothing new would be crossed out. Every number left is prime. You found {count} primes.'), fb);
          case 'autoCrossed': return fmt(t('stem.multtable.sv_auto', 'The rest of the multiples of {p} are crossed out. Now circle the next number that is left.'), fb);
          case 'keepPrime': return fmt(t('stem.multtable.sv_keep_prime', 'Keep {p}: it is prime. Cross out only the bigger multiples of {p}.'), fb);
          case 'alsoMultiple': return fmt(t('stem.multtable.sv_also', '{n} is a multiple of {p}, but it was already crossed out as a multiple of {f}.'), fb);
          case 'crossed': return fmt(t('stem.multtable.sv_crossed', '{n} crossed out: {p} × {k} = {n}.'), fb);
          case 'crossedLast': return fmt(t('stem.multtable.sv_crossed_last', '{n} crossed out: {p} × {k} = {n}. That was the last new multiple of {p}. Circle the next number that is left.'), fb);
          case 'circledNotMultiple': return fmt(t('stem.multtable.sv_circled_not_multiple', '{n} is a circled prime, not a multiple of {p}.'), fb);
          case 'notMultiple': return fmt(t('stem.multtable.sv_not_multiple', '{n} is not a multiple of {p}: {p} × {k1} = {lo} and {p} × {k2} = {hi}.'), fb);
          case 'isPrime': return fmt(t('stem.multtable.sv_is_prime', '{n} is prime.'), fb);
          case 'isCrossed': return fb.n === 1 ? t('stem.multtable.sv_is_one', '1 is neither prime nor composite.') : fmt(t('stem.multtable.sv_is_crossed', '{n} is composite: {f} is one of its factors.'), fb);
          default: return '';
        }
      }
      function sieveCellLabel(n) {
        if (sieve.primes[n]) return fmt(t('stem.multtable.sv_cell_prime', '{n}, circled: prime.'), { n: n });
        if (sieve.crossed[n]) return fmt(t('stem.multtable.sv_cell_crossed', '{n}, crossed out.'), { n: n });
        return fmt(t('stem.multtable.sv_cell_open', '{n}, not marked yet.'), { n: n });
      }
      function sieveKeyDown(e, i, N) {
        var cols = 10, ni = i, k = e.key;
        if (k === 'ArrowRight') ni = Math.min(N, i + 1);
        else if (k === 'ArrowLeft') ni = Math.max(1, i - 1);
        else if (k === 'ArrowDown') ni = Math.min(N, i + cols);
        else if (k === 'ArrowUp') ni = Math.max(1, i - cols);
        else if (k === 'Home') ni = e.ctrlKey ? 1 : i - ((i - 1) % cols);
        else if (k === 'End') ni = e.ctrlKey ? N : Math.min(N, i - ((i - 1) % cols) + cols - 1);
        else if (k === 'Enter' || k === ' ') { e.preventDefault(); sieveDo({ type: 'cell', n: i }); return; }
        else return;
        e.preventDefault();
        setGridFocus(function(prev) { var p = Object.assign({}, prev); p.sieve = { i: ni }; return p; });
        var grid = e.currentTarget && e.currentTarget.closest ? e.currentTarget.closest('[role="grid"]') : null;
        var next = grid && grid.querySelector('[data-sv="' + ni + '"]');
        if (next) next.focus();
      }
      function renderSieve() {
        var N = sieveN, pos = (gridFocus.sieve && gridFocus.sieve.i) || 1;
        if (pos > N) pos = 1;
        var rows = [];
        for (var r = 0; r < N / 10; r++) {
          var cells = [];
          for (var c = 1; c <= 10; c++) {
            (function(n) {
              var isP = !!sieve.primes[n], isX = !!sieve.crossed[n];
              var sk = SIEVE_INK[isP ? 'prime' : isX ? 'crossed' : 'open'];
              cells.push(h('div', { key: n, role: 'gridcell', 'data-sv': n, 'data-sv-state': isP ? 'prime' : isX ? 'crossed' : 'open', tabIndex: pos === n ? 0 : -1, 'aria-label': sieveCellLabel(n),
                onClick: function() { setGridFocus(function(prev) { var p = Object.assign({}, prev); p.sieve = { i: n }; return p; }); sieveDo({ type: 'cell', n: n }); },
                onKeyDown: function(e) { sieveKeyDown(e, n, N); },
                className: 'flex items-center justify-center text-xs font-mono select-none',
                style: { minWidth: 24, height: 28, borderRadius: isP ? 999 : 4, cursor: 'pointer',
                  border: sk.bd, background: sk.bg, color: sk.fg, fontWeight: isP ? 800 : 500,
                  textDecoration: isX ? 'line-through' : 'none' } }, n));
            })(r * 10 + c);
          }
          rows.push(h('div', { key: r, role: 'row', className: 'grid', style: { gap: 2, gridTemplateColumns: 'repeat(10, minmax(24px, 1fr))' } }, cells));
        }
        var primesList = Object.keys(sieve.primes).map(Number).sort(function(x, y) { return x - y; });
        var crossedCount = Object.keys(sieve.crossed).length;
        var phaseText = sieve.phase === 'one' ? t('stem.multtable.sv_phase_one', 'Step 1: decide about the number 1.')
          : sieve.phase === 'pick' ? t('stem.multtable.sv_phase_pick', 'Circle the first number that is not crossed out or circled.')
          : sieve.phase === 'predict' ? fmt(t('stem.multtable.sv_phase_predict', 'Predict: will crossing out the multiples of {p} cross out any number that is not crossed out yet?'), { p: sieve.p })
          : sieve.phase === 'cross' ? fmt(t('stem.multtable.sv_phase_cross', 'Cross out every multiple of {p} that is bigger than {p}.'), { p: sieve.p })
          : fmt(t('stem.multtable.sv_phase_done', 'Done: the circled numbers are all the primes up to {n}.'), { n: N });
        var minHits = Math.min(3, sieve.need || 0);
        var activeChip = mtTheme === 'hc' ? { background: '#ffff00', color: '#000000', borderColor: '#ffff00' } : null;
        return h('section', { className: 'bg-white rounded-xl border-2 border-indigo-200 p-3 space-y-3', 'aria-labelledby': 'mt-sv-h', 'data-mt-sieve': sieve.phase, 'data-mt-theme': mtTheme, style: panelStyle() },
          h('h3', { id: 'mt-sv-h', className: 'text-sm font-black text-indigo-900', style: ink('accent') }, t('stem.multtable.sv_title', 'Sieve of Eratosthenes: find every prime')),
          h('p', { className: 'text-xs text-slate-800', style: ink('soft') }, t('stem.multtable.sv_intro', 'Circle a prime, then cross out its multiples. Repeat. Circled cells have a round green border; crossed-out numbers have a line through them.')),
          (sieve.phase === 'one' || sieve.done) && h('div', { role: 'group', 'aria-label': t('stem.multtable.sv_size', 'Numbers in the sieve'), className: 'flex flex-wrap gap-2 items-center' },
            h('span', { className: 'text-xs font-bold text-slate-800', style: ink('soft') }, t('stem.multtable.sv_size', 'Numbers in the sieve')),
            [30, 50, 100].map(function(sz) {
              return h('button', { key: sz, type: 'button', 'aria-pressed': sieveN === sz, onClick: function() { extUpd({ sieve: sieveInit(sz), sieveFb: null }); },
                className: 'px-3 rounded-lg text-xs font-bold border ' + (sieveN === sz ? 'bg-indigo-700 text-white border-indigo-800' : 'bg-white text-indigo-800 border-indigo-400'),
                style: sieveN === sz ? Object.assign({}, CHIP, activeChip || {}) : chipInk(CHIP) }, fmt(t('stem.multtable.sv_size_n', '1 to {n}'), { n: sz }));
            })),
          h('p', { className: 'text-sm font-bold text-slate-900', 'data-mt-sv-phase': 'true', style: ink('text') }, phaseText),
          sieve.phase === 'one' && h('div', { className: 'flex flex-wrap gap-2' },
            h('button', { type: 'button', onClick: function() { sieveDo({ type: 'one', choice: 'prime' }); }, className: 'px-3 rounded-lg text-sm font-bold bg-white text-green-900 border-2 border-green-700', style: chipInk(BTN) }, t('stem.multtable.sv_one_circle', 'Circle 1 as a prime')),
            h('button', { type: 'button', onClick: function() { sieveDo({ type: 'one', choice: 'cross' }); }, className: 'px-3 rounded-lg text-sm font-bold bg-white text-slate-900 border-2 border-slate-600', style: chipInk(BTN) }, t('stem.multtable.sv_one_cross', 'Cross out 1'))),
          sieve.phase === 'predict' && h('div', { className: 'flex flex-wrap gap-2' },
            h('button', { type: 'button', onClick: function() { sieveDo({ type: 'predict', yes: true }); }, className: 'px-3 rounded-lg text-sm font-bold bg-white text-indigo-900 border-2 border-indigo-600', style: chipInk(BTN) }, t('stem.multtable.sv_pred_yes', 'Yes, new numbers get crossed out')),
            h('button', { type: 'button', onClick: function() { sieveDo({ type: 'predict', yes: false }); }, className: 'px-3 rounded-lg text-sm font-bold bg-white text-indigo-900 border-2 border-indigo-600', style: chipInk(BTN) }, t('stem.multtable.sv_pred_no', 'No, nothing new'))),
          sieve.phase === 'cross' && h('div', { className: 'flex flex-wrap gap-2 items-center' },
            h('button', { type: 'button', disabled: sieve.hits < minHits, onClick: function() { sieveDo({ type: 'finishP' }); }, className: 'px-3 rounded-lg text-sm font-bold bg-indigo-700 text-white disabled:opacity-50', style: mtTheme === 'hc' ? Object.assign({}, BTN, activeChip) : BTN },
              fmt(t('stem.multtable.sv_finish_p', 'Cross out the rest of the multiples of {p} for me'), { p: sieve.p })),
            sieve.hits < minHits && h('span', { className: 'text-xs text-slate-800', style: ink('soft') }, fmt(t('stem.multtable.sv_do_some', 'Cross out {k} more yourself first.'), { k: minHits - sieve.hits }))),
          h('div', { style: { overflowX: 'auto' } },
            h('div', { role: 'grid', 'aria-label': fmt(t('stem.multtable.sv_grid', 'Numbers 1 to {n}'), { n: N }), 'aria-describedby': 'mt-sv-help', 'data-mt-sieve-grid': 'true', className: 'space-y-0.5', style: { maxWidth: 420, minWidth: 258, padding: 3 } }, rows)),
          h('p', { id: 'mt-sv-help', className: 'text-xs text-slate-700', style: ink('soft') }, t('stem.multtable.sv_help', 'Use the arrow keys to move through the numbers and Enter to choose one.')),
          h('div', { role: 'status', 'aria-live': 'polite', className: 'text-sm text-slate-900', 'data-mt-sv-feedback': 'true', style: ink('text') }, sieveFb ? sieveFbText(sieveFb) : ''),
          h('p', { className: 'text-xs text-slate-800', 'data-mt-sv-summary': 'true', style: ink('soft') },
            fmt(t('stem.multtable.sv_summary', 'Circled so far ({k}): {list}. Crossed out: {x} numbers.'), { k: primesList.length, list: primesList.length ? listJoin(primesList) : '–', x: crossedCount })),
          !sieve.done && sieve.phase !== 'one' && (local.svConfirm
            ? h('div', { className: 'flex flex-wrap gap-2 items-center', role: 'group', 'aria-label': t('stem.multtable.sv_restart_q', 'Start the sieve again?') },
                h('span', { className: 'text-xs font-bold text-slate-900', style: ink('text') }, t('stem.multtable.sv_restart_q', 'Start the sieve again?')),
                h('button', { type: 'button', onClick: function() { setL({ svConfirm: false }); extUpd({ sieve: sieveInit(sieveN), sieveFb: null }); }, className: 'px-3 rounded-lg text-xs font-bold bg-white text-rose-900 border border-rose-700', style: chipInk(CHIP) }, t('stem.multtable.sv_restart_yes', 'Yes, start again')),
                h('button', { type: 'button', onClick: function() { setL({ svConfirm: false }); }, className: 'px-3 rounded-lg text-xs font-bold bg-white text-slate-900 border border-slate-500', style: chipInk(CHIP) }, t('stem.multtable.sv_restart_no', 'Keep going')))
            : h('button', { type: 'button', onClick: function() { setL({ svConfirm: true }); }, className: 'px-3 rounded-lg text-xs font-bold bg-white text-slate-800 border border-slate-500', style: chipInk(CHIP) }, t('stem.multtable.sv_restart', 'Start over'))),
          sieve.done && h('button', { type: 'button', onClick: function() { extUpd({ sieve: sieveInit(sieveN), sieveFb: null }); }, className: 'px-3 rounded-lg text-xs font-bold bg-white text-indigo-800 border border-indigo-500', style: chipInk(CHIP) }, t('stem.multtable.sv_again', 'Do the sieve again'))
        );
      }
      function renderFactors() {
        return h('div', { className: 'space-y-4' }, renderFactorRects(), renderDetective(), renderSieve(),
          h('p', { className: 'text-xs text-slate-800' }, t('stem.multtable.fx_misconceptions', 'Watch out for three traps: 1 is not prime, odd does not mean prime, and a bigger number does not always have more factors.')));
      }

      // ── Word problems ──
      var wpKind = wpLock || (_ext.wpKind === 'one' || _ext.wpKind === 'two' ? _ext.wpKind : null);
      var wp = (_ext.wp && _ext.wp.item && Array.isArray(_ext.wp.item.steps) && _ext.wp.item.steps.length && Array.isArray(_ext.wp.item.options) &&
        Array.isArray(_ext.wp.item.ops) && _ext.wp.item.vals && typeof _ext.wp.item.vals === 'object') ? _ext.wp : null;
      if (wp && !Array.isArray(wp.opWrong)) wp = Object.assign({}, wp, { opWrong: [] });
      function wpText(it) {
        var v = it.vals, k = it.type + '_' + (it.variant ? 1 : 0), s;
        switch (k) {
          case 'groups_mul_0': s = t('stem.multtable.wp_groups_mul_0', '{a} bags each hold {b} apples. How many apples are there in all?'); break;
          case 'groups_mul_1': s = t('stem.multtable.wp_groups_mul_1', 'There are {a} tables with {b} chairs at each table. How many chairs are there in all?'); break;
          case 'groups_share_0': s = t('stem.multtable.wp_groups_share_0', '{p} apples are shared equally into {a} bags. How many apples go in each bag?'); break;
          case 'groups_share_1': s = t('stem.multtable.wp_groups_share_1', '{p} chairs are set out equally at {a} tables. How many chairs are at each table?'); break;
          case 'groups_howmany_0': s = t('stem.multtable.wp_groups_howmany_0', '{p} apples are packed {b} to a bag. How many bags are filled?'); break;
          case 'groups_howmany_1': s = t('stem.multtable.wp_groups_howmany_1', 'Mia has {p} stickers. She puts {b} stickers on each page. How many pages does she fill?'); break;
          case 'array_mul_0': s = t('stem.multtable.wp_array_mul_0', 'A garden has {a} rows of plants with {b} plants in each row. How many plants are in the garden?'); break;
          case 'array_mul_1': s = t('stem.multtable.wp_array_mul_1', 'Chairs are set out in {a} rows, with {b} chairs in each row. How many chairs are there?'); break;
          case 'array_rows_0': s = t('stem.multtable.wp_array_rows_0', '{p} plants are planted in rows of {b}. How many rows are there?'); break;
          case 'array_rows_1': s = t('stem.multtable.wp_array_rows_1', 'A marching band of {p} players marches in rows of {b}. How many rows are there?'); break;
          case 'measure_area_0': s = t('stem.multtable.wp_measure_area_0', 'A rug is {a} feet wide and {b} feet long. What is its area in square feet?'); break;
          case 'measure_area_1': s = t('stem.multtable.wp_measure_area_1', 'A garden bed is {a} metres wide and {b} metres long. How many square metres does it cover?'); break;
          case 'measure_cut_0': s = t('stem.multtable.wp_measure_cut_0', 'A ribbon is {p} centimetres long. It is cut into pieces that are each {b} centimetres long. How many pieces are there?'); break;
          case 'measure_cut_1': s = t('stem.multtable.wp_measure_cut_1', 'A rope {p} feet long is cut into pieces {b} feet long. How many pieces are there?'); break;
          case 'measure_share_0': s = t('stem.multtable.wp_measure_share_0', 'A water tank holds {p} litres. The water is poured equally into {a} buckets. How many litres go in each bucket?'); break;
          case 'measure_share_1': s = t('stem.multtable.wp_measure_share_1', 'A board is {p} inches long. It is cut into {a} equal pieces. How long is each piece, in inches?'); break;
          case 'compare_mul_0': s = t('stem.multtable.wp_compare_mul_0', 'Sam has {b} marbles. Jo has {a} times as many marbles as Sam. How many marbles does Jo have?'); break;
          case 'compare_mul_1': s = t('stem.multtable.wp_compare_mul_1', 'A puppy weighs {b} kilograms. A grown dog weighs {a} times as much as the puppy. How many kilograms does the dog weigh?'); break;
          case 'compare_div_0': s = t('stem.multtable.wp_compare_div_0', 'Jo has {p} marbles. That is {a} times as many marbles as Sam has. How many marbles does Sam have?'); break;
          case 'compare_div_1': s = t('stem.multtable.wp_compare_div_1', 'A tree is {p} feet tall. It is {a} times as tall as a bush. How tall is the bush, in feet?'); break;
          case 'two_mul_sub_0': s = t('stem.multtable.wp_two_mul_sub_0', '{a} boxes each hold {b} crayons. {c} of the crayons are broken. How many crayons are not broken?'); break;
          case 'two_mul_sub_1': s = t('stem.multtable.wp_two_mul_sub_1', 'A class has {a} packs of {b} pencils. The class uses {c} pencils. How many pencils are left?'); break;
          case 'two_mul_add_0': s = t('stem.multtable.wp_two_mul_add_0', 'Mia buys {a} packs of {b} cards. Her friend gives her {c} more cards. How many cards does Mia have now?'); break;
          case 'two_mul_add_1': s = t('stem.multtable.wp_two_mul_add_1', 'A bus has {a} rows of {b} seats, plus {c} extra seats at the back. How many seats are there in all?'); break;
          case 'two_div_sub_0': s = t('stem.multtable.wp_two_div_sub_0', '{p} pencils are shared equally among {a} tables. Each table then gives away {c} pencils. How many pencils does each table have left?'); break;
          case 'two_div_sub_1': s = t('stem.multtable.wp_two_div_sub_1', '{p} grapes are shared equally among {a} friends. Each friend eats {c} grapes. How many grapes does each friend have left?'); break;
          case 'two_add_div_0': s = t('stem.multtable.wp_two_add_div_0', 'Sam has {x} stickers and gets {y} more. He shares all of them equally among {a} friends. How many stickers does each friend get?'); break;
          case 'two_add_div_1': s = t('stem.multtable.wp_two_add_div_1', 'A team has {x} balls in one bag and {y} in another. The balls are shared equally among {a} groups. How many balls does each group get?'); break;
          case 'two_sub_div_0': s = t('stem.multtable.wp_two_sub_div_0', 'A baker makes {x} muffins and sells {y} of them. The rest are packed {b} to a box. How many boxes are filled?'); break;
          default: s = t('stem.multtable.wp_two_sub_div_1', 'A library has {x} books, and {y} are checked out. The rest go on shelves, {b} books to a shelf. How many shelves are filled?');
        }
        return fmt(s, v);
      }
      function wpOpMistakeText(m) {
        switch (m.kind) {
          case 'addForMult': return t('stem.multtable.wp_mis_add_for_mult', 'Adding joins amounts, but here every group is the same size. Equal groups are a job for multiplication.');
          case 'timesAsManyAdd': return t('stem.multtable.wp_mis_times_add', '"Times as many" means that many copies of the amount, not that many more.');
          case 'divForMult': return t('stem.multtable.wp_mis_div_for_mult', 'You are looking for the total, so there is no total yet to divide. Put the equal groups together.');
          case 'subForMult': return t('stem.multtable.wp_mis_sub_for_mult', 'Nothing is taken away here. Equal groups are put together to find the total.');
          case 'multForDiv': return t('stem.multtable.wp_mis_mult_for_div', 'The total is already given. When you know the total and need the size of each group, or the number of groups, divide.');
          case 'timesAsManyMult': return t('stem.multtable.wp_mis_times_mult', 'The bigger amount is already given. To find the smaller one, undo "times as many": divide.');
          case 'subForDiv': return t('stem.multtable.wp_mis_sub_for_div', 'Taking away once is not enough: the whole total is split into equal groups. Division finds the groups or the size of each one.');
          case 'addForDiv': return t('stem.multtable.wp_mis_add_for_div', 'The total is already given, so adding would make it bigger. Split the total into equal groups: divide.');
          case 'oneStepOnly': return t('stem.multtable.wp_mis_one_step', 'That is only one step. Read the question again: after the first step, something else happens to the amount.');
          case 'firstStepOp': return t('stem.multtable.wp_mis_first_step', 'Check the first step: what do you need to find before you can answer the question?');
          default: return t('stem.multtable.wp_mis_second_step', 'Your first step is right. Check the second step: is something added, taken away, or shared?');
        }
      }
      function wpOpExplain(it) {
        var type = it.type;
        if (type === 'groups_mul' || type === 'array_mul') return t('stem.multtable.wp_why_mul_groups', 'Equal groups (or equal rows) are joined to find the total, so multiply.');
        if (type === 'measure_area') return t('stem.multtable.wp_why_area', 'Area counts the unit squares in a rectangle: rows of squares times squares in each row, so multiply.');
        if (type === 'compare_mul') return t('stem.multtable.wp_why_compare_mul', '"Times as many" means copies of the smaller amount, so multiply.');
        if (type === 'compare_div') return t('stem.multtable.wp_why_compare_div', 'The bigger amount is known, and it is made of copies of the smaller one, so divide.');
        if (type === 'groups_share' || type === 'measure_share') return t('stem.multtable.wp_why_share', 'The total is split into a known number of equal parts. Find the size of each part: divide.');
        if (type === 'groups_howmany' || type === 'array_rows' || type === 'measure_cut') return t('stem.multtable.wp_why_howmany', 'The total and the size of each group are known. Find how many groups: divide.');
        return t('stem.multtable.wp_why_two', 'This story has two steps. Find the amount the first sentence gives, then use it in the second step.');
      }
      function wpNew(kindOverride) {
        var kind = kindOverride !== undefined ? kindOverride : wpKind;
        var it = makeWordProblem(band, Math.random, { lock: kind });
        extUpd({ wp: { item: it, phase: 'op', opTries: 0, opWrong: [], opMistake: null, opRevealed: false, step: 0, ansTries: 0, lastWrong: null, ansMistake: null, anyRetry: false, revealed: false, solved: [] } });
        setL({ wpAns: '' });
        announceToSR(wpText(it) + ' ' + t('stem.multtable.wp_choose_first', 'Choose the operation first.'));
        focusSoon('[data-mt-wp-op]');
      }
      function wpPickOp(ops) {
        if (!wp || wp.phase !== 'op') return;
        var it = wp.item, m = diagnoseOps(it, ops), tries = (wp.opTries || 0) + 1;
        // Grades K-2 write equal groups as repeated addition (2.OA.4), so + counts there.
        var addOk = !!m && band === 'early' && it.ops.length === 1 && it.ops[0] === 'mul' && ops[0] === 'add';
        if (addOk) m = null;
        var tally = bumpTally(visit.tally, m && m.kind);
        if (!m) {
          playSound('correct');
          // Found within two picks: reasoning. Later, only elimination is left, so it counts as shown.
          var late = tries > 2;
          extUpd({ wp: Object.assign({}, wp, { phase: 'solve', opTries: tries, step: 0, ansTries: 0, addNote: addOk, opRevealed: late || !!wp.opRevealed }), visit: visitPatch({ tally: tally }) });
          announceToSR(t('stem.multtable.wp_op_right', 'Yes, that is the right operation.') + ' ' + wpOpExplain(it) + ' ' + fmt(t('stem.multtable.wp_now_solve', 'Now solve: {eq}'), { eq: stepEq(it.steps[0], false) }));
          focusSoon('[data-mt-wp-input]');
          return;
        }
        playSound('wrong');
        extUpd({ wp: Object.assign({}, wp, { opTries: tries, opWrong: wp.opWrong.concat([ops.join('-')]), opMistake: m, anyRetry: true }), visit: visitPatch({ tally: tally }) });
        announceToSR(wpOpMistakeText(m) + ' ' + t('stem.multtable.wp_try_op', 'Try again: choose the operation.'));
        focusSoon('[data-mt-wp-op]:not([disabled])'); // the choice just used is now disabled
      }
      // "Show me the operation" (after two wrong picks): no credit for this problem.
      function wpRevealOp() {
        if (!wp || wp.phase !== 'op') return;
        var it = wp.item;
        extUpd({ wp: Object.assign({}, wp, { phase: 'solve', opRevealed: true, anyRetry: true, step: 0, ansTries: 0 }) });
        announceToSR(fmt(t('stem.multtable.wp_op_reveal', 'The operation is: {ops}.'), { ops: itOpsLabel(it) }) + ' ' + wpOpExplain(it) + ' ' + fmt(t('stem.multtable.wp_now_solve', 'Now solve: {eq}'), { eq: stepEq(it.steps[0], false) }));
        focusSoon('[data-mt-wp-input]');
      }
      function wpStepMistakeText(st, m) {
        if (!m) return '';
        if (st.op === 'mul') return m.kind === 'other' ? '' : mistakeText(m, { a: st.l, b: st.r, mode: 'mult' });
        if (st.op === 'div') return m.kind === 'other' ? '' : mistakeText(m, { a: st.v, b: st.r, mode: 'div', divisor: st.r });
        if (m.kind === 'addedNotSub') return fmt(t('stem.multtable.wp_mis_added_not_sub', 'It looks like you added {r}. This step takes {r} away from {l}.'), m);
        if (m.kind === 'subNotAdd') return fmt(t('stem.multtable.wp_mis_sub_not_add', 'It looks like you took {r} away. This step adds {r} to {l}.'), m);
        if (m.kind === 'close') return t('stem.multtable.mis_close', 'Very close. Recount the last group.');
        return '';
      }
      function wpStepHint(st) {
        if (st.op === 'mul') return strategyText({ a: st.l, b: st.r, mode: 'mult' });
        if (st.op === 'div') return strategyText({ a: st.v, b: st.r, mode: 'div', divisor: st.r });
        if (st.op === 'add') return fmt(t('stem.multtable.wp_hint_add', 'Count on {r} from {l}, or add the tens and then the ones.'), st);
        return fmt(t('stem.multtable.wp_hint_sub', 'Count back {r} from {l}, or take away the tens and then the ones.'), st);
      }
      function wpCheck() {
        if (!wp || wp.phase !== 'solve') return;
        var it = wp.item, st = it.steps[wp.step], given = parseWholeAnswer(local.wpAns);
        if (given === null) { announceToSR(t('stem.multtable.whole_number_needed', 'Type a whole number, then check.')); return; }
        var ok = given === st.v, tries = (wp.ansTries || 0) + 1;
        var m = ok ? null : diagnoseStep(st, given);
        var tally = bumpTally(visit.tally, m && m.kind !== 'other' ? m.kind : null);
        setL({ wpAns: '' });
        if (!ok && tries < maxTries) {
          playSound('wrong');
          extUpd({ wp: Object.assign({}, wp, { ansTries: tries, lastWrong: given, ansMistake: m, anyRetry: true }), visit: visitPatch({ tally: tally }) });
          announceToSR(wpStepMistakeText(st, m) + ' ' + t('stem.multtable.try_again_hint', 'Try again. A strategy hint is below.'));
          focusSoon('[data-mt-wp-input]');
          return;
        }
        wpResolveStep(ok, tries, tally);
      }
      // "Show me the answer" for this step: the step is shown, and the problem earns no credit.
      function wpRevealStep() {
        if (!wp || wp.phase !== 'solve') return;
        wpResolveStep(false, Math.max(1, wp.ansTries || 0), visit.tally);
      }
      function wpResolveStep(ok, tries, tally) {
        var it = wp.item, st = it.steps[wp.step];
        playSound(ok ? 'correct' : 'wrong');
        var solved = (wp.solved || []).concat([{ ok: ok, tries: tries }]);
        var revealed = wp.revealed || !ok;
        var last = wp.step >= it.steps.length - 1;
        var next = Object.assign({}, wp, { solved: solved, revealed: revealed, anyRetry: wp.anyRetry || tries > 1, lastWrong: null, ansMistake: null, ansTries: 0 });
        var patch = { visit: visitPatch({ tally: tally }) };
        if (!last) {
          next.step = wp.step + 1;
          patch.wp = next;
          extUpd(patch);
          announceToSR((ok ? t('stem.multtable.wp_step_right', 'Step 1 is right.') : fmt(t('stem.multtable.wp_step_shown', 'Step 1 is {eq}.'), { eq: stepEq(st, true) })) + ' ' + fmt(t('stem.multtable.wp_step2', 'Step 2: {eq}'), { eq: stepEq(it.steps[1], false) }));
          focusSoon('[data-mt-wp-input]');
          return;
        }
        next.phase = 'done';
        patch.wp = next;
        var earned = !revealed && !wp.opRevealed;
        if (earned) {
          var xp2 = xpOnce(visit.xp, 'wp:' + it.id, next.anyRetry ? 2 : 5, 'word problem');
          patch.visit = visitPatch({ tally: tally, xp: xp2 });
          if (xp2 !== visit.xp) patch.wordSolved = (_ext.wordSolved || 0) + 1;
        }
        extUpd(patch);
        announceToSR((ok ? t('stem.multtable.wp_solved', 'Solved!') : t('stem.multtable.wp_answer_shown', 'Here is the answer.')) + ' ' + fmt(t('stem.multtable.wp_answer_is', 'The answer is {n}.'), { n: it.answer }));
        if (patch.wordSolved >= 10) checkBadges({ wordSolver: true });
        focusSoon('[data-mt-wp-next]');
      }
      function renderWpPicture(it, full) {
        var a = it.a, b = it.b;
        if (!(a >= 1 && b >= 1 && a <= 12 && b <= 12)) return null;
        var cmp = it.type.indexOf('compare') === 0, area = it.type === 'measure_area';
        var label;
        if (cmp) label = full ? fmt(t('stem.multtable.wp_pic_compare_full', 'A tape diagram: the small bar is {b}. The long bar is {a} copies of it, {p} in all.'), { a: a, b: b, p: a * b })
          : fmt(t('stem.multtable.wp_pic_compare', 'A tape diagram: the long bar is {a} copies of the small bar.'), { a: a });
        else if (area) label = full ? fmt(t('stem.multtable.wp_pic_area_full', 'A rectangle {a} units by {b} units, covered by {p} unit squares.'), { a: a, b: b, p: a * b })
          : fmt(t('stem.multtable.wp_pic_area', 'A rectangle {a} units by {b} units, covered by unit squares.'), { a: a, b: b });
        else if (full) label = fmt(t('stem.multtable.wp_pic_groups_full', '{a} equal groups of {b}, {p} in all.'), { a: a, b: b, p: a * b });
        else {
          // Hint labels name only what the story gives, never the unknown.
          var divStep = it.steps.filter(function(s3) { return s3.op === 'div'; })[0];
          label = !divStep ? fmt(t('stem.multtable.wp_pic_groups', '{a} equal groups, with {b} in each group.'), { a: a, b: b })
            : divStep.r === a ? fmt(t('stem.multtable.wp_pic_share', '{p} shared into {a} equal groups. How many are in each group?'), { p: a * b, a: a })
            : fmt(t('stem.multtable.wp_pic_howmany', '{p} in groups of {b}. How many groups are there?'), { p: a * b, b: b });
        }
        var u = 18, W, H, kids = [];
        if (cmp) {
          W = a * b * 8 + 20; H = 70;
          kids.push(h('rect', { key: 's', x: 10, y: 10, width: b * 8, height: 18, fill: '#bfdbfe', stroke: '#1e3a8a' }));
          for (var k = 0; k < a; k++) kids.push(h('rect', { key: 'l' + k, x: 10 + k * b * 8, y: 40, width: b * 8, height: 18, fill: k % 2 ? '#fde68a' : '#fef3c7', stroke: '#78350f' }));
        } else {
          W = b * u + 20; H = a * u + 20;
          for (var r = 0; r < a; r++) for (var c = 0; c < b; c++) {
            kids.push(area
              ? h('rect', { key: r + '-' + c, x: 10 + c * u, y: 10 + r * u, width: u, height: u, fill: (r + c) % 2 ? '#bfdbfe' : '#dbeafe', stroke: '#1e3a8a' })
              : h('circle', { key: r + '-' + c, cx: 10 + c * u + u / 2, cy: 10 + r * u + u / 2, r: 6, fill: r % 2 ? '#b45309' : '#1d4ed8' }));
          }
        }
        return h('figure', { className: 'mt-2', 'data-mt-wp-picture': full ? 'full' : 'hint' },
          h('div', { style: { overflowX: 'auto' } },
            h('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': label, style: { width: Math.min(W, 320), maxWidth: '100%', height: 'auto', display: 'block', background: '#fff' } }, kids)),
          h('figcaption', { className: 'text-xs text-slate-800 mt-1' }, label));
      }
      function renderWords() {
        var kinds = band === 'early' ? [] : [[null, t('stem.multtable.wp_mixed', 'Mixed')], ['one', t('stem.multtable.wp_one_step', 'One-step only')], ['two', t('stem.multtable.wp_two_step', 'Two-step only')]];
        var it = wp && wp.item;
        var st = wp && wp.phase === 'solve' ? it.steps[wp.step] : null;
        return h('section', { className: 'bg-white rounded-xl border-2 border-amber-300 p-3 space-y-3', 'aria-labelledby': 'mt-wp-h', 'data-mt-words': wp ? wp.phase : 'none' },
          h('h3', { id: 'mt-wp-h', className: 'text-sm font-black text-amber-900' }, t('stem.multtable.wp_title', 'Word problems: choose the operation, then solve')),
          h('p', { className: 'text-xs text-slate-800' }, t('stem.multtable.wp_intro', 'Read the story. Decide what is happening: equal groups joining, a total being shared, rows, areas, or "times as many". Then choose the operation before you work it out.')),
          kinds.length > 0 && h('div', { role: 'group', 'aria-label': t('stem.multtable.wp_kind', 'Kind of problem'), className: 'flex flex-wrap gap-2 items-center' },
            h('span', { className: 'text-xs font-bold text-slate-800' }, t('stem.multtable.wp_kind', 'Kind of problem')),
            kinds.map(function(o) {
              return h('button', { key: String(o[0]), type: 'button', 'aria-pressed': wpKind === o[0], disabled: !!wpLock && wpLock !== o[0],
                onClick: function() { extUpd({ wpKind: o[0] }); },
                className: 'px-3 rounded-lg text-xs font-bold border disabled:opacity-50 ' + (wpKind === o[0] ? 'bg-amber-800 text-white border-amber-900' : 'bg-white text-amber-900 border-amber-600'), style: CHIP }, o[1]);
            }),
            wpLock && h('span', { className: 'text-xs font-bold text-indigo-900' }, '🔒 ' + t('stem.multtable.wp_locked', 'Your teacher chose the kind of problem.'))),
          !wp && h('button', { type: 'button', onClick: function() { wpNew(); }, className: 'px-4 rounded-lg bg-amber-800 text-white font-bold text-sm', style: BTN }, t('stem.multtable.wp_start', 'Give me a word problem')),
          wp && h('div', { className: 'space-y-3' },
            h('p', { id: 'mt-wp-q', className: 'text-base font-bold text-slate-900 leading-relaxed', 'data-mt-wp-text': 'true' }, wpText(it)),
            wp.phase === 'op' && h('div', { className: 'space-y-2' },
              h('p', { className: 'text-sm font-bold text-amber-900' }, it.steps.length > 1 ? t('stem.multtable.wp_choose_two', 'This story has two steps. Which operations, in order?') : t('stem.multtable.wp_choose_first', 'Choose the operation first.')),
              h('div', { role: 'group', 'aria-label': t('stem.multtable.wp_ops', 'Operation'), className: 'flex flex-wrap gap-2' },
                it.options.map(function(ops) {
                  var key = ops.join('-'), tried = (wp.opWrong || []).indexOf(key) !== -1;
                  return h('button', { key: key, type: 'button', disabled: tried, 'data-mt-wp-op': key, 'aria-describedby': 'mt-wp-q', onClick: function() { wpPickOp(ops); },
                    className: 'px-3 rounded-lg text-sm font-bold border-2 disabled:opacity-60 ' + (tried ? 'bg-slate-100 text-slate-800 border-slate-400 line-through' : 'bg-white text-amber-900 border-amber-700'), style: BTN },
                    ops.length === 1 && it.steps.length === 1 ? opWord(ops[0]) : opsLabel(ops));
                }))),
            h('div', { role: 'status', 'aria-live': 'polite', 'data-mt-wp-feedback': 'true', className: 'space-y-1' },
              wp.phase === 'op' && wp.opMistake && hintLadder({ tries: wp.opTries || 1,
                mistake: wpOpMistakeText(wp.opMistake), mistakeAttrs: { 'data-mt-wp-mistake': wp.opMistake.kind },
                hint: it.steps.length > 1 ? t('stem.multtable.wp_op_hint_two', 'Read one sentence at a time: what does the first sentence give you, and what does the question ask for?')
                  : t('stem.multtable.wp_op_hint', 'Ask yourself: are equal groups being put together, or is a total being split into equal groups?'),
                onReveal: wpRevealOp, revealLabel: t('stem.multtable.wp_show_op', 'Show me the operation') }),
              wp.phase !== 'op' && wp.opMistake && wp.opRevealed && h('p', { className: 'text-sm text-slate-900', 'data-mt-wp-mistake': wp.opMistake.kind }, wpOpMistakeText(wp.opMistake)),
              wp.addNote && wp.phase !== 'op' && h('p', { className: 'text-sm text-slate-900' }, fmt(t('stem.multtable.wp_add_ok', 'Repeated addition works too: {a} groups of {b} is {b} added {a} times. Multiplication is the short way to write it.'), it)),
              wp.phase !== 'op' && h('p', { className: 'text-sm text-slate-900' }, (wp.opRevealed ? fmt(t('stem.multtable.wp_op_reveal', 'The operation is: {ops}.'), { ops: itOpsLabel(it) }) + ' ' : '') + wpOpExplain(it)),
              st && wp.ansTries > 0 && hintLadder({ tries: wp.ansTries, said: wp.lastWrong != null ? saidText(wp.lastWrong) : null,
                mistake: wp.ansMistake ? wpStepMistakeText(st, wp.ansMistake) || null : null, mistakeAttrs: wp.ansMistake ? { 'data-mt-wp-ans-mistake': wp.ansMistake.kind } : null,
                hint: wpStepHint(st), rung2: (st.op === 'mul' || st.op === 'div') ? renderWpPicture(it, false) : null, showTries: true, onReveal: wpRevealStep })),
            wp.phase !== 'op' && it.steps.length > 1 && wp.step > 0 && h('p', { className: 'text-sm font-mono font-bold text-slate-900' }, fmt(t('stem.multtable.wp_step1_done', 'Step 1: {eq}'), { eq: stepEq(it.steps[0], true) })),
            st && h('div', { className: 'flex flex-wrap items-end gap-2' },
              h('p', { className: 'text-lg font-mono font-bold text-amber-900 w-full', 'data-mt-wp-eq': 'true' },
                it.steps.length > 1 ? fmt(t('stem.multtable.wp_step_n', 'Step {n}: {eq}'), { n: wp.step + 1, eq: stepEq(st, false) }) : stepEq(st, false)),
              st.op === 'div' && h('p', { className: 'text-xs text-slate-800 w-full' }, fmt(t('stem.multtable.wp_think_mult', 'Or think multiplication: {r} × ? = {l}.'), st)),
              h('label', { className: 'text-sm font-bold text-slate-800' }, t('stem.multtable.wp_answer', 'Your answer'),
                h('input', { type: 'number', inputMode: 'numeric', value: local.wpAns || '', 'data-mt-wp-input': 'true', 'aria-describedby': 'mt-wp-q',
                  onChange: function(e) { setL({ wpAns: e.target.value }); },
                  onKeyDown: function(e) { if (e.key === 'Enter') wpCheck(); },
                  className: 'block w-24 px-2 py-2 border-2 border-amber-700 rounded-lg text-lg font-bold text-slate-900 bg-white' })),
              h('button', { type: 'button', onClick: wpCheck, disabled: !String(local.wpAns || '').trim(), className: 'px-4 rounded-lg bg-amber-800 text-white font-bold disabled:opacity-50', style: BTN }, t('stem.multtable.check_2', '✔ Check'))),
            wp.phase === 'done' && h('div', { className: 'rounded-lg border-2 border-emerald-600 bg-emerald-50 p-3 space-y-1', 'data-mt-wp-done': 'true' },
              h('p', { className: 'text-sm font-bold text-emerald-900' }, (wp.revealed || wp.opRevealed ? t('stem.multtable.wp_answer_shown', 'Here is the answer.') : t('stem.multtable.wp_solved', 'Solved!')) + ' ' + fmt(t('stem.multtable.wp_answer_is', 'The answer is {n}.'), { n: it.answer })),
              it.steps.map(function(s2, i) { return h('p', { key: i, className: 'text-sm font-mono text-slate-900' }, (it.steps.length > 1 ? fmt(t('stem.multtable.wp_step_n', 'Step {n}: {eq}'), { n: i + 1, eq: stepEq(s2, true) }) : stepEq(s2, true))); }),
              h('p', { className: 'text-xs text-slate-800' }, t('stem.multtable.wp_reasonable', 'Check that the answer makes sense: read the question again with your answer in it.'))),
            wp.phase === 'done' && renderWpPicture(it, true),
            wp.phase === 'done' && h('button', { type: 'button', onClick: function() { wpNew(); }, 'data-mt-wp-next': 'true', className: 'px-4 rounded-lg bg-amber-800 text-white font-bold text-sm', style: BTN }, t('stem.multtable.wp_next', 'Next word problem')))
        );
      }

      // ── Fact family check (Arrays & groups tab) ──
      var famState = (_ext.fam && _ext.fam.fam && Array.isArray(_ext.fam.fam.cards) && _ext.fam.fam.cards.every(function(c) { return c && typeof c === 'object'; })) ? _ext.fam : null;
      if (famState && (!famState.picked || typeof famState.picked !== 'object')) famState = Object.assign({}, famState, { picked: {} });
      function famNew() {
        var fam = makeFamily(band, Math.random);
        extUpd({ fam: { fam: fam, picked: {}, tries: 0, resolved: false, ok: false, diag: null } });
        announceToSR(fmt(t('stem.multtable.fam_q', 'Which facts belong to the fact family of {a}, {b} and {p}? Tick every one, then check.'), fam));
        focusSoon('[data-mt-fam-card]');
      }
      function famCardText(c) { return c.l + ' ' + WP_STEP[c.op] + ' ' + c.r + ' = ' + c.v; }
      function famCheck() {
        if (!famState || famState.resolved) return;
        var fam = famState.fam, d = diagnoseFamily(fam, famState.picked), tries = (famState.tries || 0) + 1;
        var tally = visit.tally;
        if (d) { (d.wrong || []).forEach(function(k) { tally = bumpTally(tally, k); }); if (d.missing) tally = bumpTally(tally, 'familyMissing'); }
        if (d && tries < maxTries) {
          playSound('wrong');
          extUpd({ fam: Object.assign({}, famState, { tries: tries, diag: d }), visit: visitPatch({ tally: tally }) });
          announceToSR(famDiagText(d) + ' ' + t('stem.multtable.fam_try_again', 'Change your ticks, then check again.'));
          return;
        }
        playSound(d ? 'wrong' : 'correct');
        // The marked family is shown after a miss: the same family later (same visit) earns nothing.
        var famFirst = !d && tries === 1, famSeen = !!(visit.revealed || {})[famState.fam.id];
        var xp = famFirst && !famSeen ? xpOnce(visit.xp, famState.fam.id, 3, 'fact family') : visit.xp;
        var patch = { fam: Object.assign({}, famState, { tries: tries, resolved: true, ok: !d, diag: d }), visit: visitPatch({ tally: tally, xp: xp, revealed: famFirst ? visit.revealed : revealedWith(famState.fam.id) }) };
        if (xp !== visit.xp) patch.familyCorrect = (_ext.familyCorrect || 0) + 1;
        extUpd(patch);
        announceToSR(!d ? t('stem.multtable.fam_right', 'Yes: those four facts are the whole family.') : t('stem.multtable.fam_shown', 'Here is the whole family, marked below.'));
        focusSoon('[data-mt-fam-next]');
      }
      // "Show me the family" after two checks: the family is marked, with no credit.
      function famReveal() {
        if (!famState || famState.resolved) return;
        var d = famState.diag || diagnoseFamily(famState.fam, famState.picked);
        extUpd({ fam: Object.assign({}, famState, { resolved: true, ok: false, diag: d, shown: true }), visit: visitPatch({ revealed: revealedWith(famState.fam.id) }) });
        announceToSR(t('stem.multtable.fam_shown', 'Here is the whole family, marked below.'));
        focusSoon('[data-mt-fam-next]');
      }
      function famDiagText(d) {
        var parts = [];
        (d.wrongCards || []).forEach(function(c) {
          parts.push(c.kind === 'divReverse'
            ? fmt(t('stem.multtable.fam_mis_reverse', '{eq} turns the division around. Division does not work both ways: start from the total.'), { eq: famCardText(c) })
            : fmt(t('stem.multtable.fam_mis_add', '{eq} uses + or −. A multiplication fact family has only × and ÷ facts.'), { eq: famCardText(c) }));
        });
        if (d.missing) parts.push(fmt(t('stem.multtable.fam_mis_missing', 'You ticked {k} of the 4 family facts. With two different factors there are two × facts and two ÷ facts.'), { k: d.found }));
        return parts.join(' ');
      }
      function renderFamilyCheck() {
        return h('section', { className: 'bg-white rounded-xl border-2 border-emerald-300 p-3 space-y-2', 'aria-labelledby': 'mt-fam-h', 'data-mt-family': famState ? (famState.resolved ? 'done' : 'open') : 'none' },
          h('h3', { id: 'mt-fam-h', className: 'text-sm font-black text-emerald-900' }, t('stem.multtable.fam_title', 'Fact family check')),
          !famState && h('div', null,
            h('p', { className: 'text-xs text-slate-800 mb-2' }, t('stem.multtable.fam_intro', 'Three numbers, four facts. Pick out the true members of a fact family from look-alikes.')),
            h('button', { type: 'button', onClick: famNew, className: 'px-4 rounded-lg bg-emerald-800 text-white font-bold text-sm', style: BTN }, t('stem.multtable.fam_start', 'Give me a fact family'))),
          famState && h('fieldset', { className: 'space-y-1' },
            h('legend', { className: 'text-sm font-bold text-slate-900' }, fmt(t('stem.multtable.fam_legend', 'Which facts belong to the family of {a}, {b} and {p}?'), famState.fam)),
            famState.fam.cards.map(function(c) {
              var on = !!famState.picked[c.id];
              var mark = famState.resolved ? (c.ok ? ' ✓ ' + t('stem.multtable.fam_member', 'member') : ' ✕ ' + t('stem.multtable.fam_not_member', 'not a member')) : '';
              return h('label', { key: c.id, className: 'flex items-center gap-2 text-sm font-mono text-slate-900', style: { minHeight: 32 } },
                h('input', { type: 'checkbox', checked: on, disabled: famState.resolved, 'data-mt-fam-card': c.id, style: { width: 20, height: 20 },
                  onChange: function() { var p = Object.assign({}, famState.picked); if (on) delete p[c.id]; else p[c.id] = true; extUpd({ fam: Object.assign({}, famState, { picked: p }) }); } }),
                famCardText(c), mark && h('span', { className: 'font-sans text-xs font-bold ' + (c.ok ? 'text-green-800' : 'text-red-800') }, mark));
            })),
          famState && !famState.resolved && h('button', { type: 'button', onClick: famCheck, className: 'px-4 rounded-lg bg-emerald-800 text-white font-bold text-sm', style: BTN }, t('stem.multtable.fam_check', 'Check my family')),
          famState && h('div', { role: 'status', 'aria-live': 'polite', className: 'text-sm text-slate-900', 'data-mt-fam-feedback': 'true' },
            famState.diag && !famState.resolved ? hintLadder({ tries: famState.tries || 1, mistake: famDiagText(famState.diag),
                hint: fmt(t('stem.multtable.fam_hint', 'Start from the total {p}: the × facts make {p}, and the ÷ facts start from {p}.'), famState.fam),
                showTries: true, onReveal: famReveal, revealLabel: t('stem.multtable.fam_show', 'Show me the family') })
              : famState.resolved ? (famState.ok ? t('stem.multtable.fam_right', 'Yes: those four facts are the whole family.') : t('stem.multtable.fam_shown', 'Here is the whole family, marked below.')) : ''),
          famState && famState.resolved && h('button', { type: 'button', onClick: famNew, 'data-mt-fam-next': 'true', className: 'px-4 rounded-lg bg-white text-emerald-900 border-2 border-emerald-700 font-bold text-sm', style: BTN }, t('stem.multtable.fam_next', 'Another fact family'))
        );
      }

      // ── Fluency game: untimed by default, second try before any reveal ──
      var flu = (_ext.flu && Array.isArray(_ext.flu.round) && _ext.flu.round.every(function(r) { return r && Number(r.a) >= 1 && Number(r.b) >= 1; })) ? _ext.flu : null;
      var fluRhythmOn = _ext.fluRhythm === true;
      var fluRef = React.useRef(flu);
      fluRef.current = flu;
      var fluTimer = flu && flu.timer ? flu.timer : null;
      React.useEffect(function() {
        if (!fluTimer || !fluTimer.active || fluTimer.paused) return undefined;
        var iv = setInterval(function() {
          var f = fluRef.current, tm = f && f.timer;
          if (!tm || !tm.active || tm.paused) return;
          var left = Math.max(0, Math.round((tm.endTime - Date.now()) / 1000));
          if (left <= 0) { clearInterval(iv); fluTimeUp(); return; }
          if (left !== tm.timeLeft) extUpdFlu({ timer: Object.assign({}, tm, { timeLeft: left }) });
        }, 500);
        return function() { clearInterval(iv); };
      }, [fluTimer && fluTimer.active, fluTimer && fluTimer.paused, fluTimer && fluTimer.endTime]);
      // Unmount: stop the rhythm and close the audio context this tool opened.
      React.useEffect(function() { audioMounted(); return function() { releaseAudio(); }; }, []);
      function extUpdFlu(patch) {
        setLabToolData(function(prev) {
          var ext = prev._multExt || {};
          var cur = ext.flu || {};
          return Object.assign({}, prev, { _multExt: Object.assign({}, ext, { flu: Object.assign({}, cur, patch) }) });
        });
      }
      function fluTimeUp() { fluFinish(fluRef.current, true); }
      // A round ends once, by the last "Next" or by the clock, whichever comes first
      // (the ref guards a same-batch race and stale closures; the saved flag guards remounts).
      var fluEndedRef = React.useRef(null);
      function fluRoundKey(f) { return f && f.id ? f.id : 'legacy'; }
      function fluEnded(f) { return !f || f.phase !== 'play' || f.counted === true || fluEndedRef.current === fluRoundKey(f); }
      function fluFinish(f, timeUp) {
        if (fluEnded(f)) return;
        fluEndedRef.current = fluRoundKey(f);
        var played = (f.results || []).filter(function(r) { return !r.again; });
        var firsts = played.filter(function(r) { return r.first; }).length;
        var counts = played.length > 0; // a clock that runs out before any answer is not a finished round
        setLabToolData(function(prev) {
          var ext = prev._multExt || {}, cur = ext.flu;
          if (!cur) return prev;
          var tmr = cur.timer ? Object.assign({}, cur.timer, timeUp ? { active: false, timeLeft: 0 } : { active: false }) : null;
          var patch = { flu: Object.assign({}, cur, { phase: 'done', resolved: false, timeUp: !!timeUp, counted: counts, timer: tmr }) };
          if (counts) { patch.fluencyRounds = (Number(ext.fluencyRounds) || 0) + 1; patch.fluencyBest = Math.max(Number(ext.fluencyBest) || 0, firsts); }
          return Object.assign({}, prev, { _multExt: Object.assign({}, ext, patch) });
        });
        stopRhythm();
        var doneMsg = fmt(t('stem.multtable.flu_done', 'Round finished: {k} of {n} facts right on the first try.'), { k: firsts, n: played.length });
        if (timeUp) announceToSR(t('stem.multtable.flu_time_up', 'Time is up. That is fine: unanswered facts do not count as wrong.') + (counts ? ' ' + doneMsg : ''));
        else announceToSR(doneMsg);
        if (counts) checkBadges({ fluencyClimber: true });
        // On time-up the answer box goes away: move focus only if it was in this panel.
        var ae = document.activeElement;
        if (!timeUp || (ae && ae.closest && ae.closest('[data-mt-fluency]'))) focusSoon('[data-mt-flu-start]');
      }
      function fluItemCh(it) { return { a: it.a, b: it.b, mode: it.mode, divisor: it.divisor, source: 'tool', id: 'flu' }; }
      function fluRhythmFor(it) { return it.mode === 'div' ? 12 : it.a; }
      function fluRhythmText(it) {
        if (it.mode === 'div') return fmt(t('stem.multtable.flu_rhythm_div', 'Plays 12 beats. Count by {d}s on each beat, and stop when you reach {p}.'), { d: it.divisor, p: it.a * it.b });
        return fmt(t('stem.multtable.flu_rhythm_mult', 'Plays {a} beats, one for each group of {b}. Count by {b}s on each beat.'), { a: it.a, b: it.b });
      }
      function fluStart() {
        var round = makeFluencyRound(factPool(preset.smartPool), factScores, Math.random, 10, band === 'extend');
        var timer = fluLimit ? { active: true, paused: false, endTime: Date.now() + fluLimit * 1000, timeLeft: fluLimit, limit: fluLimit } : null;
        var nf = { id: newChallengeId(), round: round, i: 0, results: [], tries: 0, lastWrong: null, mistake: null, phase: 'play', resolved: false, comeBack: [], timer: timer, timeUp: false };
        fluRef.current = nf;
        extUpd({ flu: nf });
        setL({ fluAns: '' });
        if (fluRhythmOn && round[0]) playRhythm(fluRhythmFor(round[0]));
        announceToSR(fmt(t('stem.multtable.flu_started', 'Round started: {n} facts. Take your time.'), { n: round.length }) + (round[0] ? ' ' + questionText(fluItemCh(round[0])) : ''));
        focusSoon('#mt-flu-input');
      }
      function fluCheck() {
        if (!flu || flu.phase !== 'play' || flu.resolved || fluEnded(flu)) return;
        var it = flu.round[flu.i]; if (!it) return;
        var ch = fluItemCh(it), given = parseWholeAnswer(local.fluAns);
        if (given === null) { announceToSR(t('stem.multtable.whole_number_needed', 'Type a whole number, then check.')); return; }
        var ok = given === factAnswer(ch), tries = (flu.tries || 0) + 1, m = ok ? null : diagnoseMistake(ch, given);
        var tally = bumpTally(visit.tally, m && m.kind !== 'other' ? m.kind : null);
        setL({ fluAns: '' });
        // Same rule as Practice: tries up to the teacher's limit, "Show me" after two.
        if (!ok && tries < maxTries) {
          playSound('wrong');
          extUpd({ flu: Object.assign({}, flu, { tries: tries, lastWrong: given, mistake: m }), visit: visitPatch({ tally: tally }) });
          announceToSR(mistakeText(m, ch) + ' ' + t('stem.multtable.try_again_hint', 'Try again. A strategy hint is below.'));
          focusSoon('#mt-flu-input');
          return;
        }
        fluResolve(it, ch, ok, tries, given, m, tally);
      }
      // "Show me the answer": the fact closes unanswered and comes back later, with no credit.
      function fluReveal() {
        if (!flu || flu.phase !== 'play' || flu.resolved || fluEnded(flu)) return;
        var it = flu.round[flu.i]; if (!it) return;
        fluResolve(it, fluItemCh(it), false, Math.max(1, flu.tries || 0), flu.lastWrong, flu.mistake, visit.tally);
      }
      function fluResolve(it, ch, ok, tries, given, m, tally) {
        playSound(ok ? 'correct' : 'wrong');
        stopRhythm();
        var firstTry = ok && tries === 1, fk = tkey(it.a, it.b), xid = factIdentity(ch);
        var scores = Object.assign({}, factScores);
        var prev = scores[fk] || { attempts: 0, correct: 0 };
        scores[fk] = { attempts: (Number(prev.attempts) || 0) + 1, correct: (Number(prev.correct) || 0) + (firstTry ? 1 : 0) };
        var revealedMap = Object.assign({}, visit.revealed);
        var xp = visit.xp;
        if (ok && !revealedMap[fk] && !it.again) xp = xpOnce(visit.xp, xid, firstTry ? 5 : 2, firstTry ? 'multiplication fact' : 'multiplication fact, second try');
        if (!ok) revealedMap[fk] = true;
        var entry = { a: it.a, b: it.b, answer: factAnswer(ch), mode: it.mode, divisor: it.mode === 'div' ? it.divisor : null, known: null };
        var visitMissed = (visit.missed || []).slice();
        if (!firstTry && !visitMissed.some(function(x) { return missedFactIdentity(x) === missedFactIdentity(entry); })) visitMissed.push(entry);
        var comeBack = (flu.comeBack || []).slice();
        if (!ok && !it.again) comeBack.push(Object.assign({}, it, { again: true }));
        var results = (flu.results || []).concat([{ a: it.a, b: it.b, mode: it.mode, divisor: it.divisor, first: firstTry, ok: ok, again: !!it.again }]);
        var patch = {
          factScores: scores,
          flu: Object.assign({}, flu, { tries: tries, resolved: true, ok: ok, firstTry: firstTry, lastWrong: ok ? flu.lastWrong : given, mistake: ok ? flu.mistake : m, results: results, comeBack: comeBack }),
          visit: visitPatch({ tally: tally, xp: xp, revealed: revealedMap, missed: visitMissed })
        };
        if (ok) patch.totalCorrect = (_ext.totalCorrect || 0) + 1;
        fluRef.current = patch.flu;
        extUpd(patch);
        announceToSR(ok ? (firstTry ? t('stem.multtable.sr_correct', 'Correct!') : t('stem.multtable.sr_correct_retry', 'Correct on this try. Well reasoned!')) + ' ' + solvedText(ch)
          : fmt(t('stem.multtable.flu_come_back', 'The answer is {eq}. This fact will come back at the end of the round.'), { eq: solvedText(ch) }));
        focusSoon('[data-mt-flu-next]'); // the input is now disabled
      }
      function fluNext() {
        if (!flu || !flu.resolved || fluEnded(flu)) return;
        var round = flu.round.slice(), i = flu.i + 1;
        if (i >= round.length && (flu.comeBack || []).length) { round = round.concat(flu.comeBack); }
        var comeBack = i >= flu.round.length ? [] : flu.comeBack;
        if (i >= round.length) { fluFinish(flu, false); return; }
        var nextFlu = Object.assign({}, flu, { round: round, i: i, comeBack: comeBack, tries: 0, lastWrong: null, mistake: null, resolved: false });
        fluRef.current = nextFlu;
        extUpd({ flu: nextFlu });
        setL({ fluAns: '' });
        if (fluRhythmOn) playRhythm(fluRhythmFor(round[i]));
        announceToSR(questionText(fluItemCh(round[i])));
        setTimeout(function() { var inp = document.getElementById('mt-flu-input'); if (inp) inp.focus(); }, 30);
      }
      function fluPauseToggle() {
        if (!flu || !flu.timer) return;
        var tm = flu.timer;
        if (tm.paused) { extUpd({ flu: Object.assign({}, flu, { timer: Object.assign({}, tm, { paused: false, endTime: Date.now() + Math.max(0, tm.timeLeft) * 1000 }) }) }); announceToSR(t('stem.multtable.flu_resumed', 'Clock running again.')); }
        else { var rem = Math.max(0, Math.round((tm.endTime - Date.now()) / 1000)); extUpd({ flu: Object.assign({}, flu, { timer: Object.assign({}, tm, { paused: true, timeLeft: Number.isFinite(rem) ? rem : tm.timeLeft }) }) }); announceToSR(t('stem.multtable.flu_paused', 'Clock paused. Take all the time you need.')); }
      }
      function renderFluency() {
        var played = flu ? (flu.results || []).filter(function(r) { return !r.again; }) : [];
        var climbed = played.filter(function(r) { return r.first; }).length;
        var total = flu ? flu.round.filter(function(r) { return !r.again; }).length : 10;
        var it = flu && flu.phase === 'play' ? flu.round[flu.i] : null;
        var ch = it ? fluItemCh(it) : null;
        var timeLine = fluLimit ? fmt(t('stem.multtable.flu_timer_on', 'Your teacher turned on a {m}-minute clock. You can pause it at any time.'), { m: Math.round(fluLimit / 6) / 10 }) : t('stem.multtable.flu_no_timer', 'There is no clock. Accuracy and good strategies matter here, not speed.');
        var tm = flu && flu.timer;
        var hcPrimary = mtTheme === 'hc' ? Object.assign({}, BTN, { background: '#ffff00', color: '#000000', borderColor: '#ffff00' }) : BTN;
        return h('section', { className: 'bg-white rounded-xl border-2 border-pink-200 p-3 space-y-3', 'aria-labelledby': 'mt-flu-h', 'data-mt-fluency': flu ? flu.phase : 'idle', 'data-mt-theme': mtTheme, style: panelStyle() },
          h('h3', { id: 'mt-flu-h', className: 'text-sm font-black text-pink-900', style: ink('head') }, t('stem.multtable.flu_title', 'Fluency climb')),
          h('p', { className: 'text-xs text-slate-800', style: ink('soft') }, t('stem.multtable.flu_intro', 'Ten facts at your own pace. Each fact right on the first try climbs one step. A missed fact comes back at the end of the round.')),
          h('p', { className: 'text-xs font-bold text-slate-900', 'data-mt-flu-timer-note': 'true', style: ink('text') }, timeLine),
          h('label', { className: 'text-xs font-bold text-slate-900 flex items-center gap-2', style: Object.assign({ minHeight: 32 }, ink('text') || {}) },
            h('input', { type: 'checkbox', checked: fluRhythmOn, style: { width: 20, height: 20 }, onChange: function() { extUpd({ fluRhythm: !fluRhythmOn }); if (fluRhythmOn) stopRhythm(); } }),
            t('stem.multtable.flu_rhythm_toggle', 'Play the skip-count rhythm with each fact')),
          tm && flu.phase === 'play' && h('div', { className: 'flex flex-wrap items-center gap-2', 'data-mt-flu-clock': 'true' },
            h('span', { role: 'timer', 'aria-live': 'off', className: 'text-sm font-bold text-slate-900', style: ink('text') },
              fmt(t('stem.multtable.flu_clock', 'Clock: {m}:{s}'), { m: Math.floor((tm.timeLeft || 0) / 60), s: String((tm.timeLeft || 0) % 60).padStart(2, '0') }) + (tm.paused ? ' ' + t('stem.multtable.paused', '(paused)') : '')),
            h('button', { type: 'button', onClick: fluPauseToggle, className: 'px-3 rounded-lg text-xs font-bold bg-white text-slate-900 border border-slate-500', style: chipInk(CHIP) }, tm.paused ? t('stem.multtable.flu_resume', 'Resume the clock') : t('stem.multtable.flu_pause', 'Pause the clock'))),
          (!flu || flu.phase === 'done') && h('button', { type: 'button', onClick: fluStart, 'data-mt-flu-start': 'true', className: 'px-4 rounded-lg bg-pink-700 text-white font-bold text-sm', style: hcPrimary }, flu ? t('stem.multtable.flu_again', 'Play another round') : t('stem.multtable.flu_start', 'Start a round')),
          flu && h('div', { className: 'space-y-2' },
            h('ol', { className: 'flex gap-1', 'aria-label': fmt(t('stem.multtable.flu_steps', 'Steps climbed: {k} of {n}'), { k: climbed, n: total }), 'data-mt-flu-steps': climbed },
              Array.from({ length: total }, function(_, i) {
                var up = i < climbed;
                return h('li', { key: i, 'aria-hidden': 'true', 'data-mt-climb-step': up ? 'up' : 'down', style: { width: 22, height: 10 + i * 4, alignSelf: 'flex-end', background: up ? CLIMB_INK.up : CLIMB_INK.down, border: '2px solid ' + CLIMB_INK.bd, borderRadius: 3 } });
              })),
            h('p', { className: 'text-xs font-bold text-pink-900', style: ink('head') }, fmt(t('stem.multtable.flu_steps', 'Steps climbed: {k} of {n}'), { k: climbed, n: total }))),
          it && h('div', { className: 'rounded-lg border border-pink-200 bg-pink-50 p-3 space-y-2', 'data-mt-flu-play': 'true', style: cardStyle() },
            h('p', { className: 'text-xs font-bold text-pink-900', style: cardInk('head') }, it.again ? t('stem.multtable.flu_again_fact', 'Coming back to a fact you missed') : fmt(t('stem.multtable.flu_fact_n', 'Fact {i} of {n}'), { i: flu.i + 1, n: total })),
            h('p', { id: 'mt-flu-q', className: 'text-2xl font-bold text-pink-900 text-center', 'data-mt-flu-q': 'true', style: cardInk('text') }, questionText(ch)),
            h('div', { className: 'flex flex-wrap gap-2 items-center justify-center' },
              h('input', { id: 'mt-flu-input', type: 'number', inputMode: 'numeric', value: local.fluAns || '', disabled: flu.resolved,
                'aria-label': t('stem.multtable.flu_answer', 'Fluency answer'), 'aria-describedby': 'mt-flu-q',
                onChange: function(e) { setL({ fluAns: e.target.value }); },
                onKeyDown: function(e) { if (e.key === 'Enter') fluCheck(); },
                className: 'w-24 px-3 py-2 text-center text-lg font-bold border-2 border-pink-700 rounded-lg bg-white text-slate-900' }),
              h('button', { type: 'button', onClick: fluCheck, disabled: flu.resolved || !String(local.fluAns || '').trim(), className: 'px-4 rounded-lg bg-pink-700 text-white font-bold disabled:opacity-50', style: hcPrimary }, t('stem.multtable.check_2', '✔ Check')),
              h('button', { type: 'button', onClick: function() { var okA = playRhythm(fluRhythmFor(it)); announceToSR(okA ? fluRhythmText(it) : t('stem.multtable.flu_rhythm_off', 'Sound is off or not available. Tap the beats yourself: count by the group size on each tap.')); },
                className: 'px-3 rounded-lg text-xs font-bold bg-white text-pink-900 border border-pink-700', style: chipInk(BTN), 'aria-describedby': 'mt-flu-rhythm-desc' }, '🥁 ' + t('stem.multtable.flu_rhythm', 'Hear the skip-count rhythm'))),
            h('p', { id: 'mt-flu-rhythm-desc', className: 'text-xs text-slate-800 text-center', style: cardInk('text') }, fluRhythmText(it)),
            h('div', { role: 'status', 'aria-live': 'polite', 'data-mt-flu-feedback': 'true' },
              !flu.resolved && (flu.tries || 0) > 0 && hintLadder({ tries: flu.tries, said: saidText(flu.lastWrong),
                mistake: flu.mistake && flu.mistake.kind !== 'other' ? mistakeText(flu.mistake, ch) : null, mistakeAttrs: flu.mistake ? { 'data-mt-flu-mistake': flu.mistake.kind } : null,
                hint: strategyText(ch), rung2: factRung2(ch), showTries: true, onReveal: fluReveal }),
              flu.resolved && h('p', { className: 'text-sm font-bold text-center ' + (flu.ok ? 'text-green-800' : 'text-red-800'), style: cardInk('text') },
                flu.ok ? '✅ ' + solvedText(ch) : '❌ ' + fmt(t('stem.multtable.flu_come_back', 'The answer is {eq}. This fact will come back at the end of the round.'), { eq: solvedText(ch) }))),
            flu.resolved && h('div', { className: 'text-center' },
              h('button', { type: 'button', onClick: fluNext, 'data-mt-flu-next': 'true', className: 'px-4 rounded-lg bg-white text-pink-900 border-2 border-pink-700 font-bold text-sm', style: chipInk(BTN) }, t('stem.multtable.next_when_ready', 'Next question')))),
          flu && flu.phase === 'done' && h('div', { className: 'rounded-lg border-2 border-emerald-600 bg-emerald-50 p-3 space-y-2', 'data-mt-flu-done': 'true', style: cardStyle() },
            flu.timeUp && h('p', { className: 'text-sm font-bold text-slate-900', style: cardInk('text') }, t('stem.multtable.flu_time_up', 'Time is up. That is fine: unanswered facts do not count as wrong.')),
            played.length > 0 && h('p', { className: 'text-sm font-bold text-emerald-900', style: cardInk('head') }, fmt(t('stem.multtable.flu_done', 'Round finished: {k} of {n} facts right on the first try.'), { k: climbed, n: played.length })),
            played.length > 0 && (function() {
              var miss = getUniqueMissed(played.filter(function(r) { return !r.first; }).map(function(r) { return { a: r.a, b: r.b, mode: r.mode, divisor: r.divisor, answer: r.mode === 'div' ? (r.divisor === r.a ? r.b : r.a) : r.a * r.b }; }));
              if (!miss.length) return h('p', { className: 'text-sm text-slate-900', style: cardInk('text') }, t('stem.multtable.flu_all_first', 'Every fact was right on the first try. Try a harder fact set next time.'));
              return h('div', null,
                h('p', { className: 'text-sm text-slate-900', style: cardInk('text') }, t('stem.multtable.flu_keep', 'Facts to keep practising:')),
                h('ul', { className: 'flex flex-wrap gap-1.5' }, miss.map(function(m, i) { return h('li', { key: i, className: 'px-2 py-1 rounded border border-red-200 bg-white text-xs font-bold text-red-800', style: chipInk(null) }, formatMissedFact(m)); })),
                h('button', { type: 'button', onClick: function() { startDrill(miss); }, className: 'mt-2 px-4 rounded-lg bg-red-700 text-white font-bold text-xs', style: hcPrimary }, t('stem.multtable.practice_these_2', '🎯 Practice these')));
            })())
        );
      }

      function openTool(id) {
        try { if (typeof window.__alloEnsureStemPluginLoaded === 'function') window.__alloEnsureStemPluginLoaded(id); } catch (e) { /* loader optional */ }
        setStemLabTool(id);
      }

      // ═══════════════════════════════
      // ═══ RENDER ═══
      // ═══════════════════════════════
      var mtTabDefs = {
        practice: { id: 'practice', icon: '🎯', label: t('stem.multtable.practice', 'Practice') },
        visual:   { id: 'visual',   icon: '🟩', label: t('stem.multtable.nav_arrays_groups', 'Arrays & groups') },
        patterns: { id: 'patterns', icon: '🔍', label: t('stem.multtable.patterns', 'Patterns') },
        factors:  { id: 'factors',  icon: '🧮', label: t('stem.multtable.nav_factors', 'Factors & primes') },
        words:    { id: 'words',    icon: '📖', label: t('stem.multtable.nav_words', 'Word problems') },
        fluency:  { id: 'fluency',  icon: '🧗', label: t('stem.multtable.nav_fluency', 'Fluency game') }
      };
      var multTabLabel = mtTabDefs[mtTab].label;

      // ── "Start here": 4 ordered activities for the band, ticked from saved progress ──
      function pathStepTitle(id) {
        switch (id) {
          case 'arrays': return t('stem.multtable.path_arrays', 'Build 3 facts as arrays');
          case 'skipPatterns': return t('stem.multtable.path_skip_patterns', 'Spot the 2s, 5s and 10s patterns');
          case 'foundations': return t('stem.multtable.path_foundations', 'Get 10 facts with 2s, 5s and 10s right first time');
          case 'strategies': return t('stem.multtable.path_strategies', 'Use a fact you know: solve 5 strategy questions');
          case 'allFacts': return t('stem.multtable.path_all_facts', 'Get 20 different facts to 10 right first time');
          case 'words': return t('stem.multtable.path_words', 'Solve 5 word problems');
          case 'division': return t('stem.multtable.path_division', 'Answer 10 division facts');
          case 'missing': return t('stem.multtable.path_missing', 'Find 8 missing numbers in × and ÷ facts');
          case 'primes': return t('stem.multtable.path_primes', 'Get 5 number detective questions right first time');
          case 'sieve': return t('stem.multtable.path_sieve', 'Finish the sieve of Eratosthenes');
          default: return t('stem.multtable.path_climb', 'Finish a round of the fluency climb');
        }
      }
      function openPathStep(step, i) {
        var patch = { mtTab: step.tab };
        // A running Speed Run keeps its direction and range.
        if (step.setup && !_mt.active) {
          if (!modeLock) patch.quizMode = step.setup.quizMode;
          if (!bandLock || step.setup.difficulty === preset.difficulty) patch.difficulty = step.setup.difficulty;
        }
        // This fact is already built: open the next one, so the step has something to do.
        if (step.id === 'arrays' && !step.done) {
          var builtSet = _ext.visualExplored || {};
          var nextFact = builtSet[tkey(visualA, visualB)] ? VIS_CHIPS.filter(function(p) { return !builtSet[tkey(p[0], p[1])]; })[0] : null;
          if (nextFact) { patch.visualA = nextFact[0]; patch.visualB = nextFact[1]; patch.visualPred = null; }
        }
        extUpd(patch);
        announceToSR(fmt(t('stem.multtable.path_opened', 'Step {i}: {title}. It is open below.'), { i: i + 1, title: pathStepTitle(step.id) }));
        // Launch the step's first question (or keep one already open for it), then scroll to it and focus it.
        var targets = [];
        if (step.tab === 'practice') {
          var wantMode = patch.quizMode || quizMode;
          var cur = multTableChallenge, curFb = multTableFeedback;
          var curOpen = !!(cur && !(curFb && curFb.resolved) && !inputDisabled);
          // Keep an open question only if answering it can move this step: a picked or practice-set fact, or a fact outside the step's set, cannot.
          var inStepSet = !(step.id === 'foundations' || step.id === 'allFacts') || factPool(step.setup.difficulty).indexOf(tkey(Number(cur && cur.a), Number(cur && cur.b))) !== -1;
          var fits = curOpen && cur.source === 'tool' && inStepSet && (wantMode === 'mixed' || cur.mode === wantMode || (wantMode === 'equations' && (cur.mode === 'missing' || cur.mode === 'divmiss')));
          if (!_mt.active && !drillActive && !fits) nextProblem({ mode: wantMode, difficulty: patch.difficulty || exploreDifficulty });
          targets = ['#multtable-input', '[data-mt-next]'];
        } else if (step.tab === 'words') {
          if (!wp || wp.phase === 'done') wpNew();
          targets = ['[data-mt-wp-op]:not([disabled])', '[data-mt-wp-input]', '[data-mt-wp-next]'];
        } else if (step.tab === 'fluency') {
          // A finished step keeps the results of the round on screen.
          if ((!flu || (flu.phase === 'done' && !step.done)) && !fluLimit) fluStart();
          targets = ['#mt-flu-input', '[data-mt-flu-start]'];
        } else if (step.tab === 'factors') {
          if (step.id === 'primes') { if (!det || det.resolved) detNew(); targets = ['[data-mt-det-choice]:not([disabled])', '[data-mt-det-next]']; }
          else targets = ['[data-mt-sv-phase] + div button:not([disabled])', '[data-mt-sieve-grid] [tabindex="0"]'];
        } else if (step.tab === 'patterns') {
          var pe = _ext.patternsExplored || {};
          var firstPat = ['doubles', 'fives', 'tens'].filter(function(id) { return !pe[id]; })[0] || 'doubles';
          targets = ['[data-mt-pattern="' + firstPat + '"]', '[data-mt-pattern]'];
        } else if (step.tab === 'visual') {
          targets = ['[data-mt-predict-input]', '[data-mt-skiprow][tabindex="0"]'];
        }
        focusAndShow(targets, step.tab);
      }
      // Focus the first target that exists (else the tab panel) and bring it to the middle of the screen.
      // An instant jump (no smooth scroll): nothing can interrupt it, and it is calm under reduced motion.
      function focusAndShow(targets, tab) {
        setTimeout(function() {
          var rootEl = document.querySelector('[data-multtable-root]');
          var el = null;
          for (var k = 0; rootEl && k < targets.length && !el; k++) { var c = rootEl.querySelector(targets[k]); if (c && !c.disabled) el = c; }
          if (!el) el = document.getElementById('multtable-panel-' + tab);
          if (!el || typeof el.focus !== 'function') return;
          if (typeof el.scrollIntoView === 'function') { try { el.scrollIntoView({ block: el.getAttribute('role') === 'tabpanel' ? 'start' : 'center', behavior: 'auto' }); } catch (e2) { /* old browsers */ } }
          try { el.focus({ preventScroll: true }); } catch (e3) { el.focus(); }
        }, 40);
      }
      function renderPath() {
        if (teach.hidePath === true) return null;
        var lp = learningPath(band, _ext);
        // Compact by default (one "next step" button) so the tabs stay near the top; the full list opens on request.
        var open = _ext.pathOpen === true;
        var doneCount = lp.steps.filter(function(s) { return s.done; }).length;
        var hc = mtTheme === 'hc';
        var nextStep = lp.next >= 0 ? lp.steps[lp.next] : null;
        return h('section', { className: 'rounded-xl border-2 border-pink-300 bg-white px-3 py-2', 'aria-labelledby': 'mt-path-h', 'data-mt-path': band, style: cardStyle() },
          h('div', { className: 'flex flex-wrap items-center gap-x-3 gap-y-1' },
            h('h3', { id: 'mt-path-h', className: 'text-sm font-black text-pink-900', style: cardInk('head') }, t('stem.multtable.path_heading', 'Start here')),
            h('span', { className: 'text-xs font-bold text-slate-800', 'data-mt-path-count': doneCount, style: cardInk('text') },
              fmt(t('stem.multtable.path_count', '{k} of {n} steps done'), { k: doneCount, n: lp.steps.length })),
            h('button', { type: 'button', 'aria-expanded': open, 'aria-controls': open ? 'mt-path-list' : undefined, onClick: function() { extUpd({ pathOpen: !open }); },
              className: 'ml-auto px-3 rounded-lg text-xs font-bold bg-white text-pink-900 border border-pink-700', style: chipInk(CHIP) },
              open ? t('stem.multtable.path_hide', 'Hide the steps') : t('stem.multtable.path_show', 'Show all steps'))),
          !open && nextStep && h('button', { type: 'button', onClick: function() { openPathStep(nextStep, lp.next); }, 'data-mt-path-next': nextStep.id,
            className: 'mt-1 w-full text-left rounded-lg border-2 px-3 py-1 text-sm font-bold bg-pink-50 border-pink-700 text-pink-900',
            style: hc ? { minHeight: 44, background: '#000000', color: '#ffff00', borderColor: '#ffff00' } : { minHeight: 44 } },
            fmt(t('stem.multtable.path_next_btn', 'Next, step {i}: {title} ({k} of {n})'), { i: lp.next + 1, title: pathStepTitle(nextStep.id), k: nextStep.have, n: nextStep.need })),
          !open && !nextStep && h('p', { className: 'mt-1 text-sm font-bold text-emerald-900', style: cardInk('text') }, t('stem.multtable.path_all_done', 'You finished every step. Try another fact set, or keep going in any tab.')),
          open && h('p', { className: 'mt-1 text-xs text-slate-800', style: cardInk('text') }, fmt(t('stem.multtable.path_for_band', 'Steps for: {band}.'), { band: bandName(band) })),
          open && h('ol', { id: 'mt-path-list', className: 'mt-2 grid gap-2 sm:grid-cols-2' },
            lp.steps.map(function(s, i) {
              var isNext = i === lp.next, isHere = mtTab === s.tab;
              return h('li', { key: s.id },
                h('button', { type: 'button', onClick: function() { openPathStep(s, i); }, 'data-mt-path-step': s.id, 'data-done': s.done ? 'true' : 'false',
                  'aria-current': isNext ? 'step' : undefined,
                  className: 'w-full text-left rounded-lg border-2 px-3 py-2 flex items-start gap-2 ' + (s.done ? 'bg-emerald-50 border-emerald-700 text-emerald-900' : isNext ? 'bg-pink-50 border-pink-700 text-pink-900' : 'bg-white border-slate-400 text-slate-900'),
                  style: hc ? { minHeight: 44, background: '#000000', color: s.done || isNext ? '#ffff00' : '#ffffff', borderColor: s.done || isNext ? '#ffff00' : '#ffffff', borderStyle: isNext ? 'double' : 'solid', borderWidth: isNext ? 4 : 2 } : { minHeight: 44 } },
                  h('span', { 'aria-hidden': 'true', className: 'shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black ' + (s.done ? 'bg-emerald-700 text-white' : 'bg-pink-800 text-white') }, s.done ? '✓' : String(i + 1)),
                  h('span', { className: 'min-w-0' },
                    h('span', { className: 'sr-only' }, fmt(t('stem.multtable.path_step_n', 'Step {i}:'), { i: i + 1 }) + ' '),
                    h('span', { className: 'block text-sm font-bold' }, pathStepTitle(s.id)),
                    h('span', { className: 'block text-xs' },
                      (s.done ? t('stem.multtable.path_done', 'Done.') : fmt(t('stem.multtable.path_progress', '{k} of {n} so far.'), { k: s.have, n: s.need }))
                      + (isNext ? ' ' + t('stem.multtable.path_next', 'Next step.') : '')
                      + (isHere ? ' ' + fmt(t('stem.multtable.path_in_tab', 'In the {tab} tab, open now.'), { tab: mtTabDefs[s.tab].label }) : ' ' + fmt(t('stem.multtable.path_tab', 'In the {tab} tab.'), { tab: mtTabDefs[s.tab].label }))))));
            })),
          open && lp.next === -1 && h('p', { className: 'mt-2 text-sm font-bold text-emerald-900', style: cardInk('text') }, t('stem.multtable.path_all_done', 'You finished every step. Try another fact set, or keep going in any tab.')));
      }
      var multNext = mtTab === 'visual'
        ? t('stem.multtable.next_visual', 'Predict the total, build the array, then turn it to see its twin.')
        : mtTab === 'factors'
          ? t('stem.multtable.next_factors', 'Build every rectangle a number can make, then decide: prime or composite?')
        : mtTab === 'words'
          ? t('stem.multtable.next_words', 'Read the story, choose the operation, then solve.')
        : mtTab === 'fluency'
          ? t('stem.multtable.next_fluency', 'Answer at your own pace. Use a strategy or the rhythm when you need one.')
        : mtTab === 'patterns'
          ? t('stem.multtable.next_patterns', 'Highlight a pattern, then test a claim with real facts.')
          : (_ext.totalCorrect || 0) === 0
            ? t('stem.multtable.next_first', 'Pick a fact set, answer a question, and use the hint if you get stuck.')
            : t('stem.multtable.next_more', 'Use an easy fact to work out a harder neighbouring fact.');

      function multTableTabKeyDown(e, index) {
        var ids = tabOrder;
        var nextIndex = index;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIndex = (index + 1) % ids.length;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nextIndex = (index - 1 + ids.length) % ids.length;
        else if (e.key === 'Home') nextIndex = 0;
        else if (e.key === 'End') nextIndex = ids.length - 1;
        else return;
        e.preventDefault();
        var tabButtons = e.currentTarget.parentNode.querySelectorAll('[role="tab"]');
        if (tabButtons[nextIndex]) {
          tabButtons[nextIndex].focus();
          tabButtons[nextIndex].click();
        }
      }

      var diffModes = [
        { id: 'foundations', label: t('stem.multtable.diff_foundations', '2s, 5s, 10s'), range: t('stem.multtable.range_foundations', '×2 ×5 ×10') },
        { id: 'tens',     label: t('stem.multtable.diff_tens', 'All to 10'), range: '2-10' },
        { id: 'easy',     label: t('stem.multtable.easy', 'Easy'),     range: '2-5' },
        { id: 'medium',   label: t('stem.multtable.medium', 'Medium'),   range: '2-9' },
        { id: 'hard',     label: t('stem.multtable.hard', 'Hard'),     range: '2-12' },
        { id: 'adaptive', label: t('stem.multtable.smart_practice', 'Smart practice'), range: t('stem.multtable.range_smart', 'adapts to you') },
        { id: 'tricky',   label: t('stem.multtable.tricky_15', 'Tricky 15'), range: t('stem.multtable.range_tricky', 'hard facts') }
      ];
      function diffLabel(id) { var dm = diffModes.filter(function(d) { return d.id === id; })[0]; return dm ? dm.label + ' (' + dm.range + ')' : id; }
      var setupOpen = local.setupOpen === true;
      var BAND_IDS = ['early', 'core', 'extend'];
      function chooseBand(id) {
        if (id === band) return;
        var p = BAND_PRESETS[id];
        extUpd({ band: id, mtTab: mtTab, difficulty: p.difficulty, quizMode: modeLock ? _ext.quizMode : p.quizMode });
        announceToSR(fmt(t('stem.multtable.band_chosen', 'Fact set: {name}.'), { name: bandName(id) }));
      }
      // Radio group: arrow keys move to the next fact set that is not locked and choose it.
      function bandKeyDown(e, index) {
        var step = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? -1 : 0;
        if (!step) return;
        e.preventDefault();
        for (var n = 1; n <= BAND_IDS.length; n++) {
          var id = BAND_IDS[(index + step * n + BAND_IDS.length * n) % BAND_IDS.length];
          if (bandLock && bandLock !== id) continue;
          var el = document.getElementById('mt-band-' + id);
          if (el) el.focus();
          if (id !== band) chooseBand(id);
          return;
        }
      }
      var drillActive = !!(_mt.drill && _mt.drill.active);
      var visitMissedCount = getUniqueMissed(visit.missed).length;

      return h('div', { className: 'space-y-4 max-w-5xl mx-auto animate-in fade-in duration-200', 'data-multtable-root': 'true', 'data-mt-hc': mtTheme === 'hc' ? 'true' : undefined },

        // ── Header ──
        h('section', { 'data-multtable-command': 'true', className: 'overflow-hidden rounded-2xl border border-pink-300/40 bg-gradient-to-br from-slate-950 via-pink-950 to-violet-950 text-white shadow-xl' },
          h('div', { className: 'p-4 sm:p-5' },
            h('div', { className: 'flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between' },
              h('div', { className: 'min-w-0' },
                h('div', { className: 'flex items-center gap-2' },
                  h('button', { type: 'button', onClick: function() { stopRunQuietly(); setStemLabTool(null); }, className: 'shrink-0 rounded-lg border border-white/20 bg-white/10 p-2 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-pink-300', style: { minWidth: 44, minHeight: 44 }, 'aria-label': t('stem.multtable.back_to_tools', 'Back to tools') }, h(ArrowLeft, { size: 18 })),
                  h('span', { className: 'rounded-full bg-pink-300/15 px-2.5 py-1 text-[0.625rem] font-black uppercase tracking-[0.18em] text-pink-100 ring-1 ring-pink-200/30' }, t('stem.multtable.studio_tag', 'Fact strategy studio'))
                ),
                h('h3', { className: 'mt-3 text-xl font-black tracking-tight sm:text-2xl' }, t('stem.multtable.multiplication_table', '🔢 Multiplication Table')),
                h('p', { className: 'mt-1 max-w-2xl text-sm leading-6 text-pink-100' }, t('stem.multtable.subtitle', 'Use arrays, patterns, and fact families to reason toward fluent multiplication and division.')),
                h('p', { className: 'mt-2 text-sm text-white' }, multNext)
              ),
              h('div', { className: 'hidden sm:grid grid-cols-3 gap-2 lg:w-[22rem]' },
                [
                  { k: 'focus', label: t('stem.multtable.metric_focus', 'Focus'), value: multTabLabel },
                  { k: 'correct', label: t('stem.multtable.metric_correct', 'Correct'), value: String(_ext.totalCorrect || 0) },
                  { k: 'streak', label: t('stem.multtable.metric_streak', 'Streak'), value: String(_mt.streak || 0) }
                ].map(function(metric) {
                  return h('div', { key: metric.k, className: 'min-w-0 rounded-xl border border-white/15 bg-white/10 px-2 py-3 text-center' },
                    h('div', { className: 'truncate text-sm font-black text-white', title: metric.value }, metric.value),
                    h('div', { className: 'mt-1 text-[0.625rem] font-bold uppercase tracking-wider text-pink-200' }, metric.label)
                  );
                })
              )
            ),
            h('details', { className: 'mt-3 text-white' }, h('summary', { style: { color: ctx.isContrast ? '#ffffff' : undefined, minHeight: 32 }, className: 'cursor-pointer text-sm font-bold' }, t('stem.multtable.learning_steps', 'Learning steps')), h('ol', { className: 'mt-4 grid gap-2 text-xs sm:grid-cols-3', 'aria-label': t('stem.multtable.multiplication_reasoning_pathway','Multiplication reasoning pathway') },
              [
                { n: '1', title: t('stem.multtable.step_observe', 'Observe'), detail: t('stem.multtable.step_observe_detail', 'See the fact as an array or pattern.') },
                { n: '2', title: t('stem.multtable.step_predict', 'Predict'), detail: t('stem.multtable.step_predict_detail', 'Use a fact you know to predict.') },
                { n: '3', title: t('stem.multtable.step_explain', 'Explain'), detail: t('stem.multtable.step_explain_detail', 'Connect the strategy to an equation.') }
              ].map(function(step) {
                return h('li', { key: step.n, className: 'flex items-center gap-2 rounded-xl border border-white/10 bg-black/10 p-2.5' },
                  h('span', { className: 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pink-300 font-black text-slate-950' }, step.n),
                  h('span', null, h('strong', { className: 'block text-white' }, step.title), h('span', { className: 'text-pink-200' }, step.detail))
                );
              })
            ))
          )
        ),
        h('div', { className: 'flex flex-wrap items-center gap-2 rounded-xl border border-pink-100 bg-white/80 p-2' },
            h('button', { 'aria-pressed': multTableHidden, type: 'button',
              onClick: function() { setMultTableHidden(!multTableHidden); setMultTableRevealed(new Set()); },
              className: 'text-[0.6875rem] font-bold px-3 rounded-full border transition-all ' +
                (multTableHidden ? 'bg-pink-700 text-white border-pink-500 shadow-sm' : 'text-slate-700 bg-slate-100 border-slate-300 hover:bg-slate-200'),
              style: CHIP
            }, multTableHidden ? t('stem.multtable.table_answers_hidden', 'Table answers hidden') : t('stem.multtable.table_answers_visible', 'Table answers visible')),
            h('div', { className: 'text-xs font-bold text-emerald-800', style: { color: ctx.isContrast ? '#000000' : undefined }, 'aria-label': fmt(t('stem.multtable.score_aria', 'Score: {c} of {n}'), { c: exploreScore.correct, n: exploreScore.total }) }, exploreScore.correct + '/' + exploreScore.total),
            (_mt.streak || 0) >= 2 && h('div', {
              className: 'text-xs font-bold text-orange-800 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full'
            }, '🔥 ' + fmt(t('stem.multtable.streak_n', '{n} in a row!'), { n: _mt.streak })),
            earnedCount > 0 && h('button', { type: 'button', 'aria-label': fmt(t('stem.multtable.view_badges_n', 'View badges: {n} of {total} earned'), { n: earnedCount, total: BADGES.length }),
              'aria-expanded': !!_ext.showBadges,
              onClick: function() { extUpd({ showBadges: !_ext.showBadges }); },
              className: 'text-[0.6875rem] font-bold px-3 rounded-full bg-amber-50 border border-amber-700 text-amber-800 hover:bg-amber-100 transition-all', style: CHIP
            }, '🏅 ' + earnedCount + '/' + BADGES.length),
            h('button', { type: 'button', onClick: function() { extUpd({ showCoach: !coachOpen, showAI: false }); }, 'aria-expanded': coachOpen,
              className: 'text-[0.6875rem] font-bold px-3 rounded-full border border-purple-700 text-purple-800 bg-white hover:bg-purple-50 transition-all', style: CHIP
            }, '🧭 ' + t('stem.multtable.coach_button', 'Strategy coach')),
            h('button', { type: 'button',
              onClick: function() {
                var next = !muted;
                extUpd({ muted: next });
                window._multTableMuted = next;
                if (next) stopRhythm();
                if (!next) { setTimeout(function() { playSound('default'); }, 0); }
                announceToSR(next ? t('stem.multtable.sound_muted', 'Sound muted') : t('stem.multtable.sound_on', 'Sound on'));
              },
              'aria-label': muted ? t('stem.multtable.unmute', 'Unmute sound effects') : t('stem.multtable.mute', 'Mute sound effects'),
              'aria-pressed': muted,
              className: 'text-base px-2 rounded-full hover:bg-slate-100 transition-colors ' + (muted ? 'text-slate-700' : 'text-pink-800'), style: { minHeight: 36, minWidth: 36 }
            }, muted ? '🔇' : '🔊'),
            h('button', { type: 'button',
              onClick: function() {
                setMultTableChallenge(null); setMultTableAnswer(''); setMultTableFeedback(null);
                setMultTableHover(null); setMultTableRevealed(new Set());
                setHighlightCell(null); setInputDisabled(false); setSelCell(null);
                stopRunQuietly();
                extUpd({ patternId: null, mtTab: 'practice', visualA: VIS_DEFAULT[0], visualB: VIS_DEFAULT[1], visualPred: null });
                announceToSR(t('stem.multtable.reset_done', 'Multiplication table reset'));
              },
              'aria-label': t('stem.multtable.reset_all', 'Reset all'),
              className: 'text-[0.6875rem] font-bold px-3 rounded-full text-rose-800 bg-white border border-rose-300 hover:bg-rose-50 transition-all', style: CHIP
            }, t('stem.multtable.reset_2', '↺ Reset'))
        ),

        renderPath(),

        // Tab bar
        h('div', { className: 'grid grid-cols-3 gap-1 bg-pink-50 rounded-xl p-1 border border-pink-200', role: 'tablist', 'aria-label': t('stem.multtable.multiplication_table_sections', 'Multiplication Table sections') },
          [mtTabDefs[tabOrder[0]], mtTabDefs[tabOrder[1]], mtTabDefs[tabOrder[2]], mtTabDefs[tabOrder[3]], mtTabDefs[tabOrder[4]], mtTabDefs[tabOrder[5]]].map(function(tb, tabIndex) {
            var active = mtTab === tb.id;
            return h('button', { key: 'mtt-' + tb.id, type: 'button',
              id: 'multtable-tab-' + tb.id,
              'aria-controls': 'multtable-panel-' + tb.id,
              onClick: function() { playSound('default'); extUpd({ mtTab: tb.id }); },
              onKeyDown: function(e) { multTableTabKeyDown(e, tabIndex); },
              role: 'tab', 'aria-selected': active,
              tabIndex: active ? 0 : -1,
              style: { minHeight: 44, minWidth: 0, whiteSpace: 'normal', overflowWrap: 'anywhere' }, className: 'py-2 px-3 rounded-lg text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-pink-400 ' +
                (active ? 'bg-white text-pink-800 shadow-sm' : 'text-pink-800 hover:text-pink-900')
            }, tb.icon + ' ' + tb.label);
          })
        ),
        h('div', {
          role: 'tabpanel',
          id: 'multtable-panel-' + mtTab,
          'aria-labelledby': 'multtable-tab-' + mtTab,
          tabIndex: 0
        },

        mtTab === 'visual' && h('div', { className: 'allo-mt-bg-visual' }, renderVisual()),
        mtTab === 'patterns' && h('div', { className: 'allo-mt-bg-patterns' }, renderPatterns()),
        mtTab === 'factors' && h('div', { className: 'allo-mt-bg-patterns space-y-4' }, renderFactors()),
        mtTab === 'words' && h('div', { className: 'allo-mt-bg-visual space-y-4' }, renderWords()),
        mtTab === 'fluency' && h('div', { className: 'allo-mt-bg-practice space-y-4' }, renderFluency()),

        mtTab === 'practice' && h('div', { className: 'space-y-4 allo-mt-bg-practice' },

        // ── Badge panel ──
        _ext.showBadges && h('section', { className: 'bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-3 border-2 border-amber-200', 'aria-labelledby': 'mt-badges-h' },
          h('div', { className: 'flex items-center justify-between mb-2' },
            h('h3', { id: 'mt-badges-h', className: 'text-sm font-bold text-amber-900' }, '🏅 ' + fmt(t('stem.multtable.badges_title', 'Badges ({n} of {total})'), { n: earnedCount, total: BADGES.length })),
            h('button', { type: 'button', onClick: function() { extUpd({ showBadges: false }); }, 'aria-label': t('stem.multtable.close_badges', 'Close badges'),
              className: 'text-sm text-slate-700 hover:text-slate-900 rounded', style: { minWidth: 36, minHeight: 36 }
            }, '✕')
          ),
          h('ul', { className: 'grid grid-cols-3 sm:grid-cols-4 gap-2' },
            BADGES.map(function(badge) {
              var earned = !!_ext.badges[badge.id];
              var bt = badgeText(badge.id);
              return h('li', { key: badge.id,
                className: 'text-center p-2 rounded-lg border ' + (earned ? 'bg-white border-amber-300 shadow-sm' : 'bg-slate-50 border-slate-300'),
                'aria-label': fmt(earned ? t('stem.multtable.badge_earned_label', '{name}, earned: {desc}') : t('stem.multtable.badge_locked_label', '{name}, not earned yet: {desc}'), { name: bt.label, desc: bt.desc })
              },
                h('div', { className: 'text-xl', 'aria-hidden': 'true' }, earned ? badge.icon : '🔒'),
                h('div', { className: 'text-[0.6875rem] font-bold mt-0.5 ' + (earned ? 'text-amber-900' : 'text-slate-700') }, bt.label),
                h('div', { className: 'text-[0.625rem] text-slate-700' }, bt.desc)
              );
            })
          )
        ),

        renderCoach(),

        // ── Fact set (grade band): one choice, preselected for the grade. Direction and range wait under "Change practice". ──
        h('div', { className: 'flex items-center gap-2 flex-wrap' },
          h('span', { id: 'mt-band-label', className: 'text-[0.6875rem] font-bold text-slate-800' }, t('stem.multtable.fact_set', 'Fact set')),
          h('div', { role: 'radiogroup', 'aria-labelledby': 'mt-band-label', className: 'flex items-center gap-2 flex-wrap', 'data-mt-band': band },
            BAND_IDS.map(function(id, bi) {
              var active = band === id;
              var suggested = gradeBandId === id;
              return h('button', { key: id, id: 'mt-band-' + id, type: 'button', role: 'radio', 'aria-checked': active, tabIndex: active ? 0 : -1, disabled: !!bandLock && bandLock !== id,
                onClick: function() { chooseBand(id); },
                onKeyDown: function(e) { bandKeyDown(e, bi); },
                className: 'px-3 rounded-lg text-[0.6875rem] font-bold transition-all disabled:opacity-50 ' + (active ? 'bg-pink-800 text-white shadow-sm' : 'bg-white text-pink-900 border border-pink-500 hover:bg-pink-50'), style: CHIP
              }, bandName(id) + (suggested ? ' ★' : ''));
            })),
          h('span', { className: 'text-[0.625rem] text-slate-700' }, '★ ' + t('stem.multtable.suggested_for_grade', 'suggested for your grade')),
          bandLock && h('span', { className: 'text-[0.625rem] font-bold text-indigo-900' }, '🔒 ' + t('stem.multtable.teacher_locked_band', 'Your teacher chose this fact set.')),
          h('button', { type: 'button', 'aria-expanded': setupOpen, 'aria-controls': setupOpen ? 'mt-practice-setup' : undefined, 'aria-describedby': 'mt-practice-now', 'data-mt-setup-toggle': 'true',
            onClick: function() { setL({ setupOpen: !setupOpen }); },
            className: 'px-3 rounded-lg text-[0.6875rem] font-bold bg-white text-slate-900 border border-slate-500 hover:bg-slate-50', style: chipInk(CHIP) },
            setupOpen ? t('stem.multtable.hide_practice_choices', 'Hide practice choices') : t('stem.multtable.change_practice', 'Change practice')),
          h('span', { id: 'mt-practice-now', className: 'text-[0.6875rem] text-slate-800', 'data-mt-practice-now': quizMode + ':' + exploreDifficulty },
            fmt(t('stem.multtable.practice_now', 'Now: {dir}, {range}.'), { dir: modeName(quizMode), range: diffLabel(exploreDifficulty) }))
        ),
        band === 'early' && h('p', { className: 'text-xs text-slate-800' },
          t('stem.multtable.early_tip', 'Start with arrays: build a fact in the Arrays & groups tab, then come back and practise it.'), ' ',
          h('button', { type: 'button', onClick: function() { openArrays({}); }, className: 'underline font-bold text-pink-800 px-1', style: { minHeight: 32 } }, t('stem.multtable.open_arrays', 'Open Arrays & groups'))),

        setupOpen && h('div', { id: 'mt-practice-setup', className: 'space-y-2 rounded-lg border border-slate-300 bg-white p-2', 'data-mt-practice-setup': 'true' },
        // ── Direction ──
        h('div', { role: 'group', 'aria-label': t('stem.multtable.direction', 'Direction'), className: 'flex items-center gap-2 flex-wrap' },
          h('span', { className: 'text-[0.6875rem] font-bold text-slate-800' }, t('stem.multtable.direction', 'Direction')),
          QUIZ_MODE_IDS.map(function(id) {
            var active = quizMode === id;
            var color = { mult: 'bg-pink-700', div: 'bg-cyan-800', missing: 'bg-teal-800', equations: 'bg-emerald-800', derive: 'bg-indigo-700', mixed: 'bg-violet-700' }[id];
            return h('button', { key: 'qm-' + id, type: 'button', disabled: !!modeLock && modeLock !== id,
              onClick: function() { playSound('default'); extUpd({ quizMode: id }); },
              'aria-pressed': active,
              className: 'px-3 rounded-lg text-[0.6875rem] font-bold transition-all disabled:opacity-50 ' +
                (active ? color + ' text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-400'), style: CHIP
            }, modeName(id));
          }),
          modeLock && h('span', { className: 'text-[0.625rem] font-bold text-indigo-900' }, '🔒 ' + t('stem.multtable.teacher_locked_mode', 'Your teacher chose this direction.'))
        ),

        // ── Range ──
        h('div', { role: 'group', 'aria-label': t('stem.multtable.range_label', 'Which facts'), className: 'flex gap-1 flex-wrap' },
          diffModes.map(function(dm) {
            var active = exploreDifficulty === dm.id;
            var locked = !!bandLock && dm.id !== preset.difficulty && dm.id !== 'adaptive';
            return h('button', { key: dm.id, type: 'button', 'aria-pressed': active, disabled: locked,
              onClick: function() { extUpd({ difficulty: dm.id }); },
              className: 'px-3 rounded-lg text-[0.6875rem] font-bold transition-all disabled:opacity-50 ' +
                (active
                  ? dm.id === 'easy' || dm.id === 'foundations' ? 'bg-green-700 text-white shadow-sm'
                    : dm.id === 'medium' || dm.id === 'tens' ? 'bg-blue-700 text-white shadow-sm'
                    : dm.id === 'hard' ? 'bg-red-700 text-white shadow-sm'
                    : dm.id === 'tricky' ? 'bg-fuchsia-700 text-white shadow-sm'
                    : 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-400'), style: CHIP
            }, dm.label + ' (' + dm.range + ')');
          })
        )),

        // ── Action buttons ──
        h('div', { className: 'flex gap-2 flex-wrap' },
          h('button', { 'aria-label': t('stem.multtable.quick_quiz', 'Quick Quiz'), type: 'button',
            onClick: function() { nextProblem(); focusInputSoon(); },
            className: 'flex-1 py-2 bg-gradient-to-r from-pink-600 to-rose-600 text-white font-bold rounded-lg text-sm hover:from-pink-600 hover:to-rose-600 transition-all shadow-md', style: BTN
          }, t('stem.multtable.quick_quiz_2', '🎯 Quick Quiz')),
          speedAllowed && h('button', { 'aria-label': t('stem.multtable.speed_run_2min', 'Speed Run (2min)'), type: 'button',
            onClick: function() { startSpeedRun(); },
            disabled: _mt.active,
            className: 'flex-1 py-2 bg-gradient-to-r from-amber-700 to-orange-700 text-white font-bold rounded-lg text-sm hover:from-amber-700 hover:to-orange-700 transition-all shadow-md disabled:opacity-50', style: BTN
          }, t('stem.multtable.speed_run_2min_2', '⏱️ Speed Run (2min)')),
          visitMissedCount > 0 && !drillActive && !_mt.active && h('button', { type: 'button',
            onClick: function() { startDrill(visit.missed); },
            className: 'flex-1 py-2 bg-white text-red-900 border-2 border-red-700 font-bold rounded-lg text-sm hover:bg-red-50', style: BTN
          }, '🎯 ' + fmt(t('stem.multtable.practise_missed', 'Practise my missed facts ({n})'), { n: visitMissedCount })),
          h('button', { 'aria-label': t('stem.multtable.clear_question', 'Clear question'), type: 'button',
            onClick: function() {
              setMultTableChallenge(null);
              setMultTableAnswer('');
              setMultTableFeedback(null);
              setMultTableRevealed(new Set());
              setHighlightCell(null);
              setInputDisabled(false);
              stopRunQuietly();
            },
            className: 'px-4 py-2 bg-slate-200 text-slate-800 font-bold rounded-lg text-sm hover:bg-slate-300 transition-all', style: BTN
          }, t('stem.multtable.reset_4', '↺ Reset'))
        ),

        // ── Speed Run timer banner ──
        _mt.active && h('div', { className: 'bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-3 border-2 border-amber-400 flex items-center gap-3 flex-wrap', 'data-mt-speed': 'true' },
          h('span', { className: 'text-2xl', 'aria-hidden': 'true' }, '⏱️'),
          h('div', { className: 'flex-1', style: { minWidth: 160 } },
            h('div', { className: 'flex items-center justify-between' },
              h('span', { className: 'text-sm font-bold text-amber-900', role: 'timer', 'aria-live': 'off' },
                fmt(t('stem.multtable.speed_clock', 'Speed Run: {m}:{s}'), { m: Math.floor((_mt.timeLeft || 0) / 60), s: String((_mt.timeLeft || 0) % 60).padStart(2, '0') }) + (_mt.paused ? ' ' + t('stem.multtable.paused', '(paused)') : '')),
              h('span', { className: 'text-xs font-bold text-emerald-800' }, '✅ ' + _mt.score + '/' + _mt.total)
            ),
            h('div', { className: 'w-full h-2 bg-amber-200 rounded-full mt-1 overflow-hidden', 'aria-hidden': 'true' },
              h('div', { className: 'h-full rounded-full', style: {
                width: Math.round(((_mt.timeLeft || 0) / 120) * 100) + '%',
                background: _mt.timeLeft > 30 ? 'linear-gradient(90deg, #b45309, #c2410c)' : 'linear-gradient(90deg, #b91c1c, #dc2626)'
              }})
            )
          ),
          h('button', { 'aria-label': _mt.paused ? t('stem.multtable.resume_speed_run', 'Resume Speed Run') : t('stem.multtable.pause_speed_run', 'Pause Speed Run'), type: 'button',
            onClick: function() {
              if (_mt.paused) {
                _mtUpd({ paused: false, endTime: Date.now() + Math.max(0, _mt.timeLeft) * 1000 });
                announceToSR(t('stem.multtable.run_resumed', 'Speed Run resumed'));
              } else {
                var remaining = Math.max(0, Math.round((_mt.endTime - Date.now()) / 1000));
                _mtUpd({ paused: true, timeLeft: Number.isFinite(remaining) ? remaining : _mt.timeLeft });
                announceToSR(t('stem.multtable.speed_paused_note', 'Speed Run is paused. Choose Resume to keep answering.'));
              }
            },
            className: 'px-3 bg-amber-800 text-white font-bold rounded-lg text-xs hover:bg-amber-900 transition-all', style: BTN
          }, _mt.paused ? t('stem.multtable.resume', '▶ Resume') : t('stem.multtable.pause', '⏸ Pause')),
          h('button', { 'aria-label': t('stem.multtable.stop', 'Stop'), type: 'button',
            onClick: function() { finishRun(true); },
            className: 'px-3 bg-red-700 text-white font-bold rounded-lg text-xs hover:bg-red-800 transition-all', style: BTN
          }, t('stem.multtable.stop_2', 'Stop'))
        ),

        renderDrillBanner(),
        renderChallenge(),
        renderResults(),

        // ── Explore one fact ──
        h('section', { className: 'rounded-xl border border-pink-200 bg-white p-4 space-y-3' },
          h('h3', { className: 'text-base font-bold text-pink-900' }, t('stem.multtable.focus_one_fact', 'Explore one fact')),
          h('p', { className: 'text-sm text-slate-700' }, t('stem.multtable.focus_fact_prompt', 'Choose two factors, then build an array and connect the related facts.')),
          h('div', { className: 'flex flex-wrap gap-3 items-end' },
            [['visualA', visualA, t('stem.multtable.factor_one', 'First factor')], ['visualB', visualB, t('stem.multtable.factor_two', 'Second factor')]].map(function(item) {
              return h('label', { key: item[0], className: 'text-sm font-bold text-slate-700' }, item[2], h('select', { value: item[1], className: 'block rounded-lg border border-pink-700 bg-white p-2 text-lg text-pink-900', style: { minHeight: 44 }, onChange: function(e) { var patch = {}; patch[item[0]] = Number(e.target.value); extUpd(patch); } }, Array.from({ length: 12 }, function(_, i) { return h('option', { key: i, value: i + 1 }, i + 1); }))); }),
            h('button', { type: 'button', className: 'rounded-lg bg-pink-700 text-white px-4 py-3 font-bold', style: BTN, onClick: function() { openArrays({}); } }, t('stem.multtable.build_fact', 'Build this fact')))),
        renderFullTable(),
        renderHeatmap(),

        // ── Related tools ──
        h('nav', { 'aria-label': t('stem.multtable.related_tools', 'Related tools'), className: 'flex flex-wrap items-center gap-2' },
          h('span', { className: 'text-[0.6875rem] font-bold text-slate-800' }, t('stem.multtable.related_tools', 'Related tools')),
          h('button', { type: 'button', onClick: function() { openTool('areamodel'); }, className: 'px-3 rounded-lg text-xs font-bold bg-white text-slate-800 border border-slate-400', style: CHIP }, t('stem.multtable.link_area_model', 'Area Model: split big facts')),
          h('button', { type: 'button', onClick: function() { openTool('arithmeticStudio'); }, className: 'px-3 rounded-lg text-xs font-bold bg-white text-slate-800 border border-slate-400', style: CHIP }, t('stem.multtable.link_arithmetic', 'Arithmetic Strategy Studio'))
        ),

        // ── Keyboard shortcuts legend ──
        h('p', { className: 'text-[0.6875rem] text-slate-700 text-center' },
          t('stem.multtable.shortcuts_legend', 'Shortcuts work when this practice panel itself has focus (not a button): Q quiz, S speed run, H hide answers, B badges, C strategy coach.'))
        )  // end of Practice tab wrapper
        ),
        // One teacher panel for every tab (teachers only).
        renderTeacherPanel()
      );
    }
  });
})();
