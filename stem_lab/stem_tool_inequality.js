// ═══════════════════════════════════════════
// stem_tool_inequality.js — Inequality Grapher Plugin
// Interactive number-line visualiser with notation, quiz, test-a-value,
// step-by-step solver, sound effects, badges, AI tutor & keyboard shortcuts
// ═══════════════════════════════════════════

// Inject fadeIn keyframe if not already present
(function() {
  if (document.getElementById('ineq-keyframes')) return;
  var style = document.createElement('style');
  style.id = 'ineq-keyframes';
  style.textContent = '@keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}';
  document.head.appendChild(style);
})();

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

// STEM_GRADING_CORE_BEGIN v1 (copied verbatim into each tool that grades; tests/stem_grading_core.test.js keeps the copies identical)
(function () {
  var MINUS = String.fromCharCode(0x2212);
  // A typed answer as a number: "-3", "2.5", "1,000", "3/4", "1 1/2" and the typographic minus.
  // Anything else (units, words, "1/0") is NaN, so a caller can tell "not a number" from "wrong".
  function toNumber(value) {
    if (typeof value === 'number') return isFinite(value) ? value : NaN;
    if (typeof value !== 'string') return NaN;
    var s = value.split(MINUS).join('-').replace(/\s+/g, ' ').trim();
    if (!s) return NaN;
    if (/^[+-]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '');
    var m = s.match(/^([+-]?)(\d+) (\d+)\/(\d+)$/);
    if (m) {
      var den = +m[4];
      if (!den) return NaN;
      var mixed = +m[2] + (+m[3]) / den;
      return m[1] === '-' ? -mixed : mixed;
    }
    m = s.match(/^([+-]?(?:\d+\.?\d*|\.\d+)) ?\/ ?([+-]?(?:\d+\.?\d*|\.\d+))$/);
    if (m) {
      var d = parseFloat(m[2]);
      return d ? parseFloat(m[1]) / d : NaN;
    }
    return /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(s) ? parseFloat(s) : NaN;
  }
  // Equal within an absolute tolerance, a relative one, or float noise, whichever is largest.
  function sameNumber(a, b, opts) {
    var x = toNumber(a), y = toNumber(b);
    if (!isFinite(x) || !isFinite(y)) return false;
    var o = opts || {};
    var tol = Math.max(+o.tolerance || 0, (+o.relative || 0) * Math.abs(y), 1e-9 * Math.max(1, Math.abs(y)));
    return Math.abs(x - y) <= tol;
  }
  // Credit an item once: returns whether `key` is new and the next seen-map to store.
  // The map is never mutated, so it can live in tool state.
  function creditOnce(seen, key) {
    var map = seen && typeof seen === 'object' && !Array.isArray(seen) ? seen : {};
    var k = String(key);
    if (Object.prototype.hasOwnProperty.call(map, k)) return { isNew: false, seen: map };
    var next = {};
    for (var p in map) if (Object.prototype.hasOwnProperty.call(map, p)) next[p] = map[p];
    next[k] = true;
    return { isNew: true, seen: next };
  }
  var api = { version: 1, toNumber: toNumber, sameNumber: sameNumber, creditOnce: creditOnce };
  var current = window.StemLab.grading;
  if (!current || !(current.version >= api.version)) window.StemLab.grading = api;
})();
// STEM_GRADING_CORE_END

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
    if (document.getElementById('allo-live-inequality')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-inequality';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();


  // ── Sound effects ──
  var _audioCtx = null;
  function getAudioCtx() {
    if (!_audioCtx) _audioCtx = (window.StemLab && window.StemLab.audioContext ? window.StemLab.audioContext() : new (window.AudioContext || window.webkitAudioContext)());
    return _audioCtx;
  }
  function playSound(type) {
    try {
      var ac = getAudioCtx();
      var o = ac.createOscillator();
      var g = ac.createGain();
      o.connect(g); g.connect(ac.destination);
      g.gain.value = 0.12;
      switch (type) {
        case 'correct':
          o.frequency.value = 523; o.type = 'sine';
          g.gain.setValueAtTime(0.12, ac.currentTime);
          g.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.25);
          o.start(); o.stop(ac.currentTime + 0.25);
          var o2 = ac.createOscillator(); var g2 = ac.createGain();
          o2.connect(g2); g2.connect(ac.destination);
          o2.frequency.value = 659; o2.type = 'sine';
          g2.gain.setValueAtTime(0.1, ac.currentTime + 0.1);
          g2.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.35);
          o2.start(ac.currentTime + 0.1); o2.stop(ac.currentTime + 0.35);
          break;
        case 'wrong':
          o.frequency.value = 200; o.type = 'sawtooth';
          g.gain.setValueAtTime(0.08, ac.currentTime);
          g.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.3);
          o.start(); o.stop(ac.currentTime + 0.3);
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
        case 'streak':
          o.frequency.value = 587; o.type = 'triangle';
          g.gain.setValueAtTime(0.1, ac.currentTime);
          g.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.15);
          o.start(); o.stop(ac.currentTime + 0.15);
          var o3 = ac.createOscillator(); var g3 = ac.createGain();
          o3.connect(g3); g3.connect(ac.destination);
          o3.frequency.value = 784; o3.type = 'triangle';
          g3.gain.setValueAtTime(0.1, ac.currentTime + 0.12);
          g3.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.35);
          o3.start(ac.currentTime + 0.12); o3.stop(ac.currentTime + 0.35);
          break;
        default:
          o.frequency.value = 440; o.type = 'sine';
          g.gain.setValueAtTime(0.08, ac.currentTime);
          g.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.12);
          o.start(); o.stop(ac.currentTime + 0.12);
      }
    } catch (e) { /* audio not available */ }
  }

  // ── Badge definitions ──
  var BADGES = [
    { id: 'firstSolve',   icon: '\u2B50',       label: 'First Solve',      desc: 'Answer your first quiz correctly' },
    { id: 'streak5',      icon: '\uD83D\uDD25', label: 'On Fire',          desc: '5 quiz answers in a row' },
    { id: 'streak10',     icon: '\u26A1',       label: 'Lightning',         desc: '10 quiz answers in a row' },
    { id: 'allTiers',     icon: '\uD83C\uDF1F', label: 'All Levels',       desc: 'Solve quizzes in Easy, Medium & Hard' },
    { id: 'solverPro',    icon: '\uD83E\uDDE0', label: 'Solver Pro',       desc: 'Use the step-by-step solver 5 times' },
    { id: 'testMaster',   icon: '\uD83E\uDDEA', label: 'Test Master',      desc: 'Test 10 different values' },
    { id: 'absValue',     icon: '\uD83D\uDD0D', label: 'Abs Value',        desc: 'Graph an absolute value inequality' },
    { id: 'compound',     icon: '\uD83D\uDD17', label: 'Compound',         desc: 'Graph a compound inequality' },
    { id: 'graphBoth',    icon: '\uD83D\uDCCA', label: 'Dual Grapher',     desc: 'Use both 1D and 2D graph modes' },
    { id: 'quizChamp',    icon: '\uD83C\uDFC6', label: 'Quiz Champ',       desc: 'Get 20 total quiz answers correct' }
  ];

  // WCAG 1.4.3 high contrast: flatten the gradient Snapshot button under HC green ink.
  (function() {
    if (typeof document === 'undefined' || !document.head || document.getElementById('allo-inequality-hc-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-inequality-hc-css';
    st.textContent = ".theme-contrast [data-stem-tool-shell=\"inequality\"] .from-indigo-600.to-purple-600{background-image:none!important;background-color:#000!important}";
    document.head.appendChild(st);
  })();
  window.StemLab.registerTool('inequality', {
    icon: '\u2265', label: 'Inequality Grapher',
    desc: 'Visualize inequalities on a number line with notation, quiz, solver, badges & AI tutor.',
    color: 'fuchsia', category: 'math',
    questHooks: [
      // A graph the student BUILT (dot, open/closed, shading) also counts.
      { id: 'graph_first', label: 'Graph any inequality', icon: '\uD83C\uDFA8', check: function(d) { return !!((d.expr && d.studentGraphed) || d.builtGraph); }, progress: function(d) { return (d.expr && d.studentGraphed) || d.builtGraph ? 'Done' : 'Pick a preset or type one'; } },
      { id: 'quiz_5_correct', label: 'Answer 5 challenges correctly', icon: '\uD83E\uDDE0', check: function(d) { return (d.quizCorrectTotal || 0) >= 5; }, progress: function(d) { return (d.quizCorrectTotal || 0) + '/5 correct'; } },
      { id: 'both_modes', label: 'Graph in both 1D and 2D modes', icon: '\uD83D\uDCCA', check: function(d) { var m = d.modesUsed || {}; return !!(m['1d'] && m['2d']); }, progress: function(d) { var m = d.modesUsed || {}; return ((m['1d'] ? 1 : 0) + (m['2d'] ? 1 : 0)) + '/2 modes'; } },
      { id: 'solver_3', label: 'Solve 3 inequalities step-by-step', icon: '\uD83E\uDDEA', check: function(d) { return (d.solverCount || 0) >= 3; }, progress: function(d) { return (d.solverCount || 0) + '/3 solved'; } }
    ],
    render: function(ctx) {
      // The hint line, the range readout, the tips toggle and the shortcut
      // legend sit on the HOST surface - white in light and dark, pure BLACK
      // in the contrast theme, where they ran 2.8-3.0:1.
      var isContrast = !!ctx.isContrast;
      var onHostInk = isContrast ? ' text-white' : '';
      var React = ctx.React;
      var h = React.createElement;
      // i18n: __alloT(key, englishFallback) → ctx.t if available, else the English string.
      // Keys are stem.inequality.<snake_case>; harvested by dev-tools/i18n/extract_stem_tool_en.cjs.
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      // i18n phase-2: BADGES is defined at module scope (before render) so its label/desc
      // strings can't reach __alloT directly. This render-scope map holds literal keys (so
      // extract_stem_tool_en.cjs harvests them) keyed by the English text, and _bt(en) looks
      // up the translation at each render-scope display site (badge panel below). The badge
      // TOAST at module scope (checkBadges) is a deeper refactor — left for phase-2b.
      var _badgeT = {
        'First Solve': __alloT('stem.inequality.badge_first_solve_label', 'First Solve'),
        'Answer your first quiz correctly': __alloT('stem.inequality.badge_first_solve_desc', 'Answer your first quiz correctly'),
        'On Fire': __alloT('stem.inequality.badge_on_fire_label', 'On Fire'),
        '5 quiz answers in a row': __alloT('stem.inequality.badge_on_fire_desc', '5 quiz answers in a row'),
        'Lightning': __alloT('stem.inequality.badge_lightning_label', 'Lightning'),
        '10 quiz answers in a row': __alloT('stem.inequality.badge_lightning_desc', '10 quiz answers in a row'),
        'All Levels': __alloT('stem.inequality.badge_all_levels_label', 'All Levels'),
        'Solve quizzes in Easy, Medium & Hard': __alloT('stem.inequality.badge_all_levels_desc', 'Solve quizzes in Easy, Medium & Hard'),
        'Solver Pro': __alloT('stem.inequality.badge_solver_pro_label', 'Solver Pro'),
        'Use the step-by-step solver 5 times': __alloT('stem.inequality.badge_solver_pro_desc', 'Use the step-by-step solver 5 times'),
        'Test Master': __alloT('stem.inequality.badge_test_master_label', 'Test Master'),
        'Test 10 different values': __alloT('stem.inequality.badge_test_master_desc', 'Test 10 different values'),
        'Abs Value': __alloT('stem.inequality.badge_abs_value_label', 'Abs Value'),
        'Graph an absolute value inequality': __alloT('stem.inequality.badge_abs_value_desc', 'Graph an absolute value inequality'),
        'Compound': __alloT('stem.inequality.badge_compound_label', 'Compound'),
        'Graph a compound inequality': __alloT('stem.inequality.badge_compound_desc', 'Graph a compound inequality'),
        'Dual Grapher': __alloT('stem.inequality.badge_dual_grapher_label', 'Dual Grapher'),
        'Use both 1D and 2D graph modes': __alloT('stem.inequality.badge_dual_grapher_desc', 'Use both 1D and 2D graph modes'),
        'Quiz Champ': __alloT('stem.inequality.badge_quiz_champ_label', 'Quiz Champ'),
        'Get 20 total quiz answers correct': __alloT('stem.inequality.badge_quiz_champ_desc', 'Get 20 total quiz answers correct')
      };
      var _bt = function (s) { return _badgeT.hasOwnProperty(s) ? _badgeT[s] : s; };
      var ArrowLeft = ctx.icons.ArrowLeft;
      var setStemLabTool = ctx.setStemLabTool;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;
      var setToolSnapshots = ctx.setToolSnapshots;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var callGemini = ctx.callGemini;
      var announceToSR = ctx.announceToSR;
      var a11yClick = ctx.a11yClick;

      // ── State ──
      var d = labToolData.inequality || {};
      var isContrast = !!ctx.isContrast;
      var isDark = !!ctx.isDark || isContrast;
      var upd = function(key, val) {
        setLabToolData(function(prev) {
          return Object.assign({}, prev, {
            inequality: Object.assign({}, prev.inequality || {}, typeof key === 'object' ? key : (function() { var o = {}; o[key] = val; return o; })())
          });
        });
      };

      // Badges this mounted instance already awarded. The host defers state writes made
      // during render, so a second render before they land saw no badge and awarded again.
      var badgeGuardRef = React.useRef({});
      // In-flight AI request. A persisted aiLoading (tool closed mid-request) must not
      // block the tutor or spin forever after a remount.
      var aiBusyRef = React.useRef(false);
      // Screen-reader announcements: the host's channel when it has one, else this
      // tool's own live region (allo-live-inequality).
      var iqAnnounce = function(msg) {
        if (!msg) return;
        if (typeof announceToSR === 'function') { try { announceToSR(msg); return; } catch (e) { /* fall through */ } }
        var lr = document.getElementById('allo-live-inequality');
        if (lr) { lr.textContent = ''; setTimeout(function() { lr.textContent = msg; }, 40); }
      };
      // Read-aloud: the browser's own speech first (works offline), else the host TTS.
      var hasSpeech = typeof window !== 'undefined' && !!window.speechSynthesis && typeof window.SpeechSynthesisUtterance === 'function';
      var canSpeak = hasSpeech || typeof ctx.callTTS === 'function';
      var speakText = function(text) {
        if (!text) return;
        try {
          if (hasSpeech) {
            var u = new window.SpeechSynthesisUtterance(text);
            u.rate = 0.95;
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(u);
          } else if (typeof ctx.callTTS === 'function') {
            Promise.resolve(ctx.callTTS(String(text), null, null, { force: true })).catch(function() {});
          }
        } catch (e) { /* speech unavailable */ }
      };
      var reduceMotion = false;
      try { reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { reduceMotion = false; }

      var W = 420, H = 140, pad = 35;
      var range = d.range || { min: -10, max: 10 };
      var toSX = function(x) { return pad + ((x - range.min) / (range.max - range.min)) * (W - 2 * pad); };

      var graphMode = d.graphMode || '1d';

      // Extended state
      var badges = d.badges || {};
      var showBadges = d.showBadges || false;
      var showAI = d.showAI || false;
      var aiResponse = d.aiResponse || '';
      var aiLoading = d.aiLoading || false;
      var solverCount = d.solverCount || 0;
      var testCount = d.testCount || 0;
      var tiersUsed = d.tiersUsed || {};
      var modesUsed = d.modesUsed || {};
      var quizCorrectTotal = d.quizCorrectTotal || 0;

      // ── Badge checker ──
      function checkBadges(updates) {
        var changed = {};
        var newBadges = Object.assign({}, badges);
        Object.keys(updates).forEach(function(key) {
          if (updates[key] && !newBadges[key] && !badgeGuardRef.current[key]) {
            changed[key] = true;
            newBadges[key] = true;
            badgeGuardRef.current[key] = true;
          }
        });
        if (Object.keys(changed).length > 0) {
          // Merge into the latest badges: two checks in one tick overwrote each other.
          setLabToolData(function(prev) {
            var cur = prev.inequality || {};
            return Object.assign({}, prev, { inequality: Object.assign({}, cur, { badges: Object.assign({}, cur.badges || {}, changed) }) });
          });
          Object.keys(changed).forEach(function(bid) {
            var badge = BADGES.find(function(b) { return b.id === bid; });
            if (badge) {
              playSound('badge');
              addToast(badge.icon + ' Badge: ' + badge.label + '!', 'success');
              if (typeof awardXP === 'function') awardXP('inequality', 15, 'badge');
            }
          });
        }
      }

      // Track graph mode for badge
      function trackMode(m) {
        var nm = Object.assign({}, modesUsed);
        nm[m] = true;
        upd('modesUsed', nm);
        if (nm['1d'] && nm['2d']) checkBadges({ graphBoth: true });
      }

      // ── History / Undo ──
      var exprHistory = Array.isArray(d.exprHistory) ? d.exprHistory : [];
      var addToHistory = function(expr) {
        if (!expr) return;
        var h2 = exprHistory.filter(function(e) { return e !== expr; });
        h2.unshift(expr);
        if (h2.length > 10) h2 = h2.slice(0, 10);
        upd('exprHistory', h2);
      };

      // ════ ENGINE ════
      // Pure functions. Tests slice parse2D, parseIneq and solveInequality out of this
      // source and run them alone, so nothing from here to `var ineq = parseIneq(d.expr)`
      // may read render state while it is defined. Engine text is translated through an
      // __alloT argument, which is the identity when a test runs the slice.

      // ── 2D Parser ── any linear inequality in x and y: y > 2x + 1, 2x + 3y <= 6, x >= -2.
      // Keeps a·x + b·y rel c (exact), plus the solved form: slope/intercept, or vertical x = k.
      var parse2D = function(expr) {
        var sp = iqSplitCompare(expr);
        if (!sp || sp.ops.length !== 1 || sp.ops[0] === '!=') return null;
        var L = iqLinear(sp.parts[0], 'xy'), R = iqLinear(sp.parts[1], 'xy');
        if (!L || !R) return null;
        var qa = qSub(iqCoef(L, 'x'), iqCoef(R, 'x')), qb = qSub(iqCoef(L, 'y'), iqCoef(R, 'y')), qc = qSub(R.k, L.k);
        if (!qa || !qb || !qc || (!qa.n && !qb.n)) return null;
        var rel = sp.ops[0];
        var out = { rel: rel, a: qVal(qa), b: qVal(qb), c: qVal(qc), qa: qa, qb: qb, qc: qc, lhs: L, rhs: R };
        if (qb.n) {
          // Solved for y: dividing by a negative y-coefficient flips the sign.
          out.qm = qDiv(qNeg(qa), qb); out.qk = qDiv(qc, qb);
          if (!out.qm || !out.qk) return null;
          out.slope = qVal(out.qm); out.intercept = qVal(out.qk); out.op = qb.n < 0 ? iqFlipOp(rel) : rel;
        } else {
          out.vertical = true; out.qx = qDiv(qc, qa);
          if (!out.qx) return null;
          out.xk = qVal(out.qx); out.op = qa.n < 0 ? iqFlipOp(rel) : rel;
        }
        return out;
      };

      // ── PARSER ── 1D solution sets: x > 3, 3 < x, -2 < x <= 5, |2x - 1| < 5,
      // x < -2 or x > 4, x != 3. A coefficient on a bare x (2x > 3) is the solver's job.
      var parseIneq = function(expr) {
        if (!expr) return null;
        var s = iqNormalize(expr);
        var NUM = '([+-]?(?:\\d+\\.?\\d*|\\.\\d+)(?:\\s*\\/\\s*(?:\\d+\\.?\\d*|\\.\\d+))?)', OP = '(<=|>=|<|>)';
        var joined = s.split(/\s+(or|and)\s+/);
        if (joined.length === 3) {
          var pa = parseIneq(joined[0]), pb = parseIneq(joined[2]);
          var ia = iqIntervals(pa), ib = iqIntervals(pb);
          if (!ia || !ib || pa.v !== pb.v) return null;
          var res = iqFromIntervals(joined[1] === 'or' ? iqUnion(ia.concat(ib)) : iqIntersect(ia, ib), pa.v);
          if (!res) return null;
          res.join = joined[1];
          if (joined[1] === 'or' && res.allReals) res.reason = 'or_all';
          if (joined[1] === 'and' && res.empty) res.reason = 'and_empty';
          return res;
        }
        if (joined.length !== 1) return null;
        // |a·x + b| op c, or c op |a·x + b|
        var absM = new RegExp('^\\|(.+)\\|\\s*' + OP + '\\s*' + NUM + '$').exec(s), absInner, absOp, absNum;
        if (absM) { absInner = absM[1]; absOp = absM[2]; absNum = absM[3]; }
        else if ((absM = new RegExp('^' + NUM + '\\s*' + OP + '\\s*\\|(.+)\\|$').exec(s))) { absInner = absM[3]; absOp = iqFlipOp(absM[2]); absNum = absM[1]; }
        if (absM) {
          var letters = iqLetters(absInner);
          if (letters.length !== 1) return null;
          var av = letters[0], inner = iqLinear(absInner, av), bound = qParse(absNum);
          if (!inner || !bound || !iqCoef(inner, av).n) return null;
          var ca = iqCoef(inner, av), cb = inner.k, sgn = bound.n < 0 ? -1 : bound.n > 0 ? 1 : 0;
          var base = { v: av, absSource: String(expr).trim(), boundText: qText(bound) };
          // An absolute value is a distance: never negative.
          if (sgn < 0) return Object.assign(base, absOp.charAt(0) === '<' ? { compound: false, empty: true, emptySet: true, reason: 'abs_negative_less' } : { compound: false, allReals: true, reason: 'abs_negative_greater' });
          if (sgn === 0 && absOp === '<') return Object.assign(base, { compound: false, empty: true, emptySet: true, reason: 'abs_zero_less' });
          if (sgn === 0 && absOp === '>=') return Object.assign(base, { compound: false, allReals: true, reason: 'abs_zero_at_least' });
          // -c <= a·x + b <= c: the boundaries are (-c - b)/a and (c - b)/a.
          var p1 = qDiv(qSub(qNeg(bound), cb), ca), p2 = qDiv(qSub(bound, cb), ca);
          if (!p1 || !p2) return null;
          var lo = qCmp(p1, p2) <= 0 ? p1 : p2, hi = lo === p1 ? p2 : p1;
          if (absOp.charAt(0) === '<') return Object.assign(base, { compound: true, lo: qVal(lo), op1: absOp, op2: absOp, hi: qVal(hi), loText: qText(lo), hiText: qText(hi) });
          return Object.assign(base, { compound: false, op: absOp === '>' ? '<' : '<=', val: qVal(lo), valText: qText(lo), ne: qCmp(lo, hi) === 0,
            absRight: { v: av, op: absOp, val: qVal(hi), valText: qText(hi) } });
        }
        var cm = new RegExp('^' + NUM + '\\s*' + OP + '\\s*([a-z])\\s*' + OP + '\\s*' + NUM + '$').exec(s);
        if (cm) {
          var q1 = qParse(cm[1]), q2 = qParse(cm[5]);
          if (!q1 || !q2) return null;
          var op1 = cm[2], op2 = cm[4], t1 = iqNumText(cm[1], q1), t2 = iqNumText(cm[5], q2);
          // "5 > x > 1" is a valid descending compound meaning 1 < x < 5, but
          // the notation, test-a-value, and graph all assume ascending order —
          // untreated it rendered the backwards interval (5, 1) and reported
          // every tested value as "not a solution". Normalize by swapping the
          // bounds and flipping both operators. Mixed directions ("3 < x > 2")
          // describe no interval at all and are rejected rather than drawn.
          var dir1 = op1.charAt(0), dir2 = op2.charAt(0);
          if (dir1 !== dir2) return null;
          if (dir1 === '>') {
            return {
              compound: true, lo: qVal(q2), hi: qVal(q1), v: cm[3], loText: t2, hiText: t1,
              op1: op2.replace('>', '<'), op2: op1.replace('>', '<')
            };
          }
          return { compound: true, lo: qVal(q1), op1: op1, v: cm[3], op2: op2, hi: qVal(q2), loText: t1, hiText: t2 };
        }
        // x op n, n op x (read from the other side), x != n. A fraction boundary
        // ("x < 1/3", what the solver's Graph It sends) stays exact.
        var sm = new RegExp('^([a-z])\\s*(<=|>=|!=|<|>)\\s*' + NUM + '$').exec(s), sv;
        if (sm) sv = { v: sm[1], op: sm[2], num: sm[3] };
        else if ((sm = new RegExp('^' + NUM + '\\s*' + OP + '\\s*([a-z])$').exec(s))) sv = { v: sm[3], op: iqFlipOp(sm[2]), num: sm[1] };
        if (!sv) return null;
        var qv = qParse(sv.num);
        if (!qv) return null;
        var simple = { compound: false, v: sv.v, op: sv.op, val: qVal(qv) };
        if (/\//.test(sv.num)) simple.valText = qText(qv, true);
        if (sv.op === '!=') {
          simple.op = '<'; simple.ne = true;
          simple.absRight = { v: sv.v, op: '>', val: simple.val, valText: simple.valText };
        }
        return simple;
      };

      // ── STEP-BY-STEP SOLVER ── linear inequalities in one variable: -2x > 6, 5 > 2x + 1,
      // 2x + 1 < x + 5, 2(x + 3) < 10, x/2 > 3, and chains such as -3 < 2x + 1 <= 7.
      var solveInequality = function(raw) {
        return iqSolve(raw, typeof __alloT === 'function' ? __alloT : null);
      };

      // ── Exact rationals {n, d}: a boundary such as 1/3 stays exact through every step
      // (rounding it to 0.33 made Graph It test 0.332 as outside x < 1/3).
      var qGcd = function(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var r = a % b; a = b; b = r; } return a || 1; };
      var qMake = function(n, den) {
        if (den === undefined) den = 1;
        if (!den || !Number.isSafeInteger(n) || !Number.isSafeInteger(den)) return null;
        if (den < 0) { n = -n; den = -den; }
        var g = qGcd(n, den);
        return { n: n / g || 0, d: den / g };
      };
      var qAdd = function(a, b) { return a && b ? qMake(a.n * b.d + b.n * a.d, a.d * b.d) : null; };
      var qNeg = function(a) { return a ? qMake(-a.n, a.d) : null; };
      var qSub = function(a, b) { return qAdd(a, qNeg(b)); };
      var qMul = function(a, b) { return a && b ? qMake(a.n * b.n, a.d * b.d) : null; };
      var qDiv = function(a, b) { return a && b && b.n ? qMake(a.n * b.d, a.d * b.n) : null; };
      var qAbs = function(a) { return a && a.n < 0 ? qNeg(a) : a; };
      var qCmp = function(a, b) { var x = a.n * b.d - b.n * a.d; return x < 0 ? -1 : x > 0 ? 1 : 0; };
      var qVal = function(a) { return a.n / a.d; };
      // "-3", "2.5", ".5", "3/4"; null for "1/0" and anything else.
      var qParse = function(str) {
        var m = /^([+-]?)(\d+\.?\d*|\.\d+)(?:\/(\d+\.?\d*|\.\d+))?$/.exec(String(str).replace(/\s+/g, ''));
        if (!m) return null;
        var dec = function(t) {
          var p = t.indexOf('.'), places = p < 0 ? 0 : t.length - p - 1, digits = t.replace('.', '');
          if (digits.length > 15) return null;
          return qMake(parseInt(digits, 10) || 0, Math.pow(10, places));
        };
        var q = dec(m[2]);
        if (q && m[1] === '-') q = qNeg(q);
        if (q && m[3] !== undefined) q = qDiv(q, dec(m[3]));
        return q;
      };
      // Terminating values print as decimals; others (or keepFraction) as n/d.
      var qText = function(q, keepFraction) {
        if (!q) return '';
        if (q.d === 1) return String(q.n);
        var rest = q.d;
        while (rest % 2 === 0) rest /= 2;
        while (rest % 5 === 0) rest /= 5;
        if (rest === 1 && !keepFraction) return String(Number((q.n / q.d).toPrecision(12)));
        return q.n + '/' + q.d;
      };
      var iqNumText = function(raw, q) { return qText(q, /\//.test(raw)); };
      var iqNumFmt = function(x) { return String(Number(Number(x).toPrecision(12))); };
      var iqFill = function(str, map) { return String(str).replace(/\{(\w+)\}/g, function(m, k) { return map && map[k] != null ? String(map[k]) : m; }); };
      var iqFlipOp = function(op) { return { '<': '>', '>': '<', '<=': '>=', '>=': '<=' }[op] || op; };
      var iqOpText = function(op) { return { '<=': '≤', '>=': '≥', '!=': '≠' }[op] || op; };
      var iqHolds = function(cmp, op) { return op === '<' ? cmp < 0 : op === '<=' ? cmp <= 0 : op === '>' ? cmp > 0 : op === '>=' ? cmp >= 0 : op === '!=' ? cmp !== 0 : cmp === 0; };
      var iqNormalize = function(expr) {
        return String(expr == null ? '' : expr).replace(/[−–]/g, '-').replace(/≤|=</g, '<=').replace(/≥|=>/g, '>=')
          .replace(/≠|!=|=\/=|<>/g, '!=').replace(/[×·]/g, '*').replace(/÷/g, '/').toLowerCase().trim();
      };
      var iqLetters = function(s) { return (String(s).match(/[a-z]/g) || []).filter(function(ch, i, all) { return all.indexOf(ch) === i; }); };
      // Split at comparison signs: "1 < 2x <= 5" -> parts [1, 2x, 5], ops [<, <=].
      var iqSplitCompare = function(expr) {
        var s = iqNormalize(expr);
        if (!s) return null;
        var parts = [], ops = [], re = /(<=|>=|!=|<|>)/g, last = 0, m;
        while ((m = re.exec(s))) { parts.push(s.slice(last, m.index).trim()); ops.push(m[1]); last = m.index + m[1].length; }
        parts.push(s.slice(last).trim());
        for (var i = 0; i < parts.length; i++) if (!parts[i]) return null;
        return ops.length ? { parts: parts, ops: ops } : null;
      };
      var iqCoef = function(L, v) { return (L && L.c[v]) || qMake(0); };
      // One side as an exact linear form { k, c: {var: coef} } over the allowed letters.
      // Accepts 2x + 3, 3 - 2x, x/2, 2(x + 3), -(x - 1), 0.5x; rejects x^2, x*x, 1/x.
      // `messy` marks a side that needs distributing or combining first.
      var iqLinear = function(src, vars) {
        var s = String(src).replace(/\s+/g, ''), toks = [], i = 0, m;
        if (!s) return null;
        while (i < s.length) {
          var rest = s.slice(i);
          if ((m = /^(\d+\.?\d*|\.\d+)/.exec(rest))) { toks.push({ t: 'n', v: m[1] }); i += m[1].length; }
          else if (/^[a-z]/.test(rest)) { if (vars.indexOf(rest.charAt(0)) < 0) return null; toks.push({ t: 'v', v: rest.charAt(0) }); i++; }
          else if ('+-*/()'.indexOf(rest.charAt(0)) >= 0) { toks.push({ t: rest.charAt(0) }); i++; }
          else return null;
        }
        var pos = 0, paren = false, varTerms = 0, constTerms = 0, depth = 0;
        var peek = function() { return toks[pos] ? toks[pos].t : null; };
        var isConst = function(A) { for (var key in A.c) if (A.c[key].n) return false; return true; };
        var scale = function(A, q) {
          if (!A || !q) return null;
          var out = { k: qMul(A.k, q), c: {} };
          if (!out.k) return null;
          for (var key in A.c) { out.c[key] = qMul(A.c[key], q); if (!out.c[key]) return null; }
          return out;
        };
        var plus = function(A, B) {
          var out = { k: qAdd(A.k, B.k), c: {} }, key;
          if (!out.k) return null;
          for (key in A.c) out.c[key] = A.c[key];
          for (key in B.c) { out.c[key] = out.c[key] ? qAdd(out.c[key], B.c[key]) : B.c[key]; if (!out.c[key]) return null; }
          return out;
        };
        var times = function(A, B) { return !A || !B ? null : isConst(A) ? scale(B, A.k) : isConst(B) ? scale(A, B.k) : null; };
        var over = function(A, B) { return !A || !B || !isConst(B) || !B.k.n ? null : scale(A, qDiv(qMake(1), B.k)); };
        var sum;
        var primary = function() {
          var tk = toks[pos];
          if (!tk) return null;
          if (tk.t === 'n') { pos++; var q = qParse(tk.v); return q ? { k: q, c: {} } : null; }
          if (tk.t === 'v') { pos++; var c = {}; c[tk.v] = qMake(1); return { k: qMake(0), c: c }; }
          if (tk.t === '(') {
            pos++; paren = true; depth++;
            var inner = sum();
            depth--;
            if (!inner || peek() !== ')') return null;
            pos++;
            return inner;
          }
          return null;
        };
        var factor = function() {
          if (peek() === '-') { pos++; return scale(factor(), qMake(-1)); }
          if (peek() === '+') { pos++; return factor(); }
          return primary();
        };
        var term = function() {
          var a = factor();
          while (a) {
            var p = peek();
            if (p === '*' || p === '/') { pos++; a = p === '*' ? times(a, factor()) : over(a, factor()); }
            else if (p === 'v' || p === '(') a = times(a, primary());
            else break;
          }
          return a;
        };
        sum = function() {
          var count = function(A) { if (depth === 0 && A) { if (isConst(A)) constTerms++; else varTerms++; } };
          var a = term();
          count(a);
          while (a && (peek() === '+' || peek() === '-')) {
            var sign = toks[pos++].t, b = term();
            count(b);
            a = b ? plus(a, sign === '-' ? scale(b, qMake(-1)) : b) : null;
          }
          return a;
        };
        var out = sum();
        if (!out || pos !== toks.length) return null;
        out.messy = paren || varTerms > 1 || constTerms > 1;
        return out;
      };
      var iqLinEval = function(L, pt) {
        var total = L.k;
        for (var key in L.c) total = qAdd(total, qMul(L.c[key], pt[key] || qMake(0)));
        return total;
      };
      // Coefficient times variable: 2x, -x, 0.5x, or x/2 and 3x/4 when the student wrote fractions.
      var iqFmtTerm = function(q, v, fracStyle) {
        if (q.d === 1) return (q.n === 1 ? '' : q.n === -1 ? '-' : String(q.n)) + v;
        var t = qText(q, fracStyle);
        if (t.indexOf('/') < 0) return t + v;
        return (q.n === 1 ? '' : q.n === -1 ? '-' : String(q.n)) + v + '/' + q.d;
      };
      var iqFmtLin = function(a, k, v, fracStyle) {
        var s = a && a.n ? iqFmtTerm(a, v, fracStyle) : '';
        if (k && k.n) s += s ? (k.n < 0 ? ' - ' : ' + ') + qText(qAbs(k), fracStyle) : qText(k, fracStyle);
        return s || '0';
      };

      var iqSolve = function(raw, __alloT) {
        if (typeof __alloT !== 'function') __alloT = function(k, fb) { return fb; };
        if (!raw) return null;
        var sp = iqSplitCompare(raw);
        if (!sp || sp.ops.length > 2 || sp.ops.indexOf('!=') !== -1) return null;
        var letters = iqLetters(sp.parts.join(' '));
        if (letters.length !== 1) return null;
        var v = letters[0];
        var sides = sp.parts.map(function(p) { return iqLinear(p, v); });
        for (var si = 0; si < sides.length; si++) if (!sides[si]) return null;
        var fracStyle = /\//.test(raw);
        var fmt = function(a, k) { return iqFmtLin(a, k, v, fracStyle); };
        var num = function(q) { return qText(q, fracStyle); };
        var paren = function(t) { return t.charAt(0) === '-' ? '(' + t + ')' : t; };
        var rel = function(l, o, r) { return l + ' ' + iqOpText(o) + ' ' + r; };
        var T_SUB = __alloT('stem.inequality.solver_move_sub', 'Subtract {n} from both sides');
        var T_ADD = __alloT('stem.inequality.solver_move_add', 'Add {n} to both sides');
        var T_DIV = __alloT('stem.inequality.solver_move_div', 'Divide both sides by {n}');
        var T_MUL = __alloT('stem.inequality.solver_move_mul', 'Multiply both sides by {n}');
        var T_SUB_ONE = __alloT('stem.inequality.solver_move_sub_one', 'Subtract {n} from one side only');
        var T_ADD_ONE = __alloT('stem.inequality.solver_move_add_one', 'Add {n} to one side only');
        var steps = [];
        var add = function(o) { steps.push(o); };
        var finish = function(solution) {
          add({ text: '✅ ' + __alloT('stem.inequality.solver_step_done', 'Solution found!'), final: true });
          steps.solution = solution;
          return steps;
        };
        add({ text: iqFill(__alloT('stem.inequality.solver_step_start', 'Start: {expr}'), { expr: String(raw).trim() }) });

        if (sp.ops.length === 1) {
          var op = sp.ops[0], L = sides[0], R = sides[1];
          var aL = iqCoef(L, v), aR = iqCoef(R, v), kL = L.k, kR = R.k;
          var identity = function(left, right) {
            var holds = iqHolds(qCmp(left, right), op);
            add({ text: iqFill(holds
              ? __alloT('stem.inequality.solver_identity_true', 'The variable is gone and {stmt} is always true, so every real number is a solution.')
              : __alloT('stem.inequality.solver_identity_false', 'The variable is gone and {stmt} is never true, so there is no solution.'), { stmt: rel(num(left), op, num(right)) }), final: true });
            steps.solution = null; steps.identity = holds ? 'all' : 'none';
            return steps;
          };
          if (L.messy || R.messy) {
            add({ text: __alloT('stem.inequality.solver_step_simplify', 'Simplify each side (distribute and combine like terms):'), move: { kind: 'simplify' } });
            add({ text: rel(fmt(aL, kL), op, fmt(aR, kR)), highlight: true });
          }
          if (!aL.n && !aR.n) return identity(kL, kR);
          if (aL.n && aR.n) {
            // Gather the variable on the left.
            var tv = fmt(qAbs(aR), null), subV = aR.n > 0, tailV = (subV ? ' - ' : ' + ') + tv;
            var lblV = iqFill(subV ? T_SUB : T_ADD, { n: tv });
            add({ text: lblV + ':', work: rel(fmt(aL, kL) + tailV, op, fmt(aR, kR) + tailV),
              move: { kind: 'term', label: lblV, alts: [iqFill(subV ? T_ADD : T_SUB, { n: tv }), iqFill(subV ? T_SUB_ONE : T_ADD_ONE, { n: tv })] } });
            aL = qSub(aL, aR); aR = qMake(0);
            if (!aL) return null;
            if (!aL.n) return identity(kL, kR);
            add({ text: rel(fmt(aL, kL), op, fmt(aR, kR)), highlight: true });
          }
          var left = !!aL.n;
          var a = left ? aL : aR, kV = left ? kL : kR, kO = left ? kR : kL;
          var show = function(lhs, rhs) { return left ? rel(lhs, op, rhs) : rel(rhs, op, lhs); };
          if (kV.n) {
            var nt = num(qAbs(kV)), sub = kV.n > 0, tail = (sub ? ' - ' : ' + ') + nt;
            var lblK = iqFill(sub ? T_SUB : T_ADD, { n: nt });
            add({ text: lblK + ':', work: show(fmt(a, kV) + tail, fmt(null, kO) + tail),
              move: { kind: 'term', label: lblK, alts: [iqFill(sub ? T_ADD : T_SUB, { n: nt }), iqFill(sub ? T_SUB_ONE : T_ADD_ONE, { n: nt })] } });
            kO = qSub(kO, kV); kV = qMake(0);
            if (!kO) return null;
            add({ text: show(fmt(a, kV), fmt(null, kO)), highlight: true });
          }
          var res = kO;
          if (!(a.n === 1 && a.d === 1)) {
            // x/2 and -x/3 are undone by MULTIPLYING by 2 or -3; anything else by dividing.
            var neg = a.n < 0, useMul = Math.abs(a.n) === 1 && a.d > 1;
            var by = useMul ? qMake(neg ? -a.d : a.d) : a, byText = num(by);
            res = useMul ? qMul(kO, by) : qDiv(kO, a);
            if (!res) return null;
            var lblD = iqFill(useMul ? T_MUL : T_DIV, { n: byText });
            var opAfter = neg ? iqFlipOp(op) : op, sym = useMul ? ' × ' : ' ÷ ';
            var workV = paren(fmt(a, null)) + sym + paren(byText), workK = paren(num(kO)) + sym + paren(byText);
            add({ text: neg ? iqFill(useMul
                ? __alloT('stem.inequality.solver_step_mul_flip', 'Multiply both sides by {n}. It is negative, so FLIP the inequality sign!')
                : __alloT('stem.inequality.solver_step_div_flip', 'Divide both sides by {n} — FLIP the inequality sign!'), { n: byText }) : lblD + ':',
              warning: neg, work: left ? rel(workV, opAfter, workK) : rel(workK, opAfter, workV),
              move: { kind: useMul ? 'mul' : 'div', label: lblD, muldiv: true, flip: neg, by: byText, alts: useMul
                ? [iqFill(T_DIV, { n: num(qAbs(by)) }), iqFill(T_ADD, { n: num(qAbs(by)) })]
                : [iqFill(T_SUB, { n: byText }), iqFill(T_DIV, { n: num(qNeg(a)) })] } });
            op = opAfter;
            var approx = qText(res).indexOf('/') >= 0 ? ' (≈ ' + qVal(res).toFixed(2) + ')' : '';
            add({ text: show(v, qText(res)) + approx, highlight: true });
          }
          if (!left) {
            var mirrored = iqFlipOp(op);
            add({ text: iqFill(__alloT('stem.inequality.solver_step_swap', 'Read it with {v} first: {a} says the same thing as {b}. The symbol still opens toward the larger side.'), { v: v, a: rel(qText(res), op, v), b: rel(v, mirrored, qText(res)) }), move: { kind: 'swap' } });
            op = mirrored;
            add({ text: rel(v, op, qText(res)), highlight: true });
          }
          return finish(v + ' ' + op + ' ' + qText(res));
        }

        // Chains: lo < a·x + b < hi. Whatever is done to the middle is done to all three parts.
        var o1 = sp.ops[0], o2 = sp.ops[1], A = sides[0], M = sides[1], C = sides[2];
        if (o1.charAt(0) !== o2.charAt(0) || iqCoef(A, v).n || iqCoef(C, v).n || !iqCoef(M, v).n) return null;
        var lo = A.k, hi = C.k, ca = iqCoef(M, v), kM = M.k;
        var rel3 = function(l, p, mid, q, r) { return l + ' ' + iqOpText(p) + ' ' + mid + ' ' + iqOpText(q) + ' ' + r; };
        var T3_SUB = __alloT('stem.inequality.solver_move3_sub', 'Subtract {n} from all three parts');
        var T3_ADD = __alloT('stem.inequality.solver_move3_add', 'Add {n} to all three parts');
        var T3_DIV = __alloT('stem.inequality.solver_move3_div', 'Divide all three parts by {n}');
        var T3_MUL = __alloT('stem.inequality.solver_move3_mul', 'Multiply all three parts by {n}');
        var reorder = function() {
          var t = lo; lo = hi; hi = t;
          var to = iqFlipOp(o2); o2 = iqFlipOp(o1); o1 = to;
        };
        if (o1.charAt(0) === '>') {
          reorder();
          add({ text: iqFill(__alloT('stem.inequality.solver_step_reorder', 'Rewrite it in increasing order: {expr}'), { expr: rel3(num(lo), o1, fmt(ca, kM), o2, num(hi)) }), move: { kind: 'swap' } });
        }
        if (M.messy) {
          add({ text: __alloT('stem.inequality.solver_step_simplify', 'Simplify each side (distribute and combine like terms):'), move: { kind: 'simplify' } });
          add({ text: rel3(num(lo), o1, fmt(ca, kM), o2, num(hi)), highlight: true });
        }
        if (kM.n) {
          var n3 = num(qAbs(kM)), sub3 = kM.n > 0, tail3 = (sub3 ? ' - ' : ' + ') + n3;
          var lbl3 = iqFill(sub3 ? T3_SUB : T3_ADD, { n: n3 });
          add({ text: lbl3 + ':', work: rel3(num(lo) + tail3, o1, fmt(ca, kM) + tail3, o2, num(hi) + tail3),
            move: { kind: 'term', label: lbl3, alts: [iqFill(sub3 ? T3_ADD : T3_SUB, { n: n3 }), iqFill(__alloT('stem.inequality.solver_move3_middle', 'Change only the middle part by {n}'), { n: n3 })] } });
          lo = qSub(lo, kM); hi = qSub(hi, kM); kM = qMake(0);
          if (!lo || !hi) return null;
          add({ text: rel3(num(lo), o1, fmt(ca, null), o2, num(hi)), highlight: true });
        }
        if (!(ca.n === 1 && ca.d === 1)) {
          var neg3 = ca.n < 0, mul3 = Math.abs(ca.n) === 1 && ca.d > 1;
          var by3 = mul3 ? qMake(neg3 ? -ca.d : ca.d) : ca, by3Text = num(by3);
          lo = mul3 ? qMul(lo, by3) : qDiv(lo, ca); hi = mul3 ? qMul(hi, by3) : qDiv(hi, ca);
          if (!lo || !hi) return null;
          if (neg3) { o1 = iqFlipOp(o1); o2 = iqFlipOp(o2); }
          var lblD3 = iqFill(mul3 ? T3_MUL : T3_DIV, { n: by3Text });
          add({ text: neg3 ? iqFill(__alloT('stem.inequality.solver_step3_flip', '{move} — it is negative, so FLIP both inequality signs!'), { move: lblD3 }) : lblD3 + ':',
            warning: neg3, move: { kind: mul3 ? 'mul' : 'div', label: lblD3, muldiv: true, flip: neg3, by: by3Text,
              alts: [iqFill(T3_SUB, { n: num(qAbs(by3)) }), iqFill(__alloT('stem.inequality.solver_move3_middle_only', 'Divide only the middle part by {n}'), { n: by3Text })] } });
          add({ text: rel3(qText(lo), o1, v, o2, qText(hi)), highlight: true });
          if (neg3) {
            reorder();
            add({ text: iqFill(__alloT('stem.inequality.solver_step_reorder', 'Rewrite it in increasing order: {expr}'), { expr: rel3(qText(lo), o1, v, o2, qText(hi)) }), move: { kind: 'swap' } });
          }
        }
        return finish(qText(lo) + ' ' + o1 + ' ' + v + ' ' + o2 + ' ' + qText(hi));
      };

      // ── Solution sets as interval lists: [{ lo, loInc, hi, hiInc, loText, hiText }] ──
      var iqIntervals = function(p) {
        if (!p) return null;
        if (p.empty) return [];
        if (p.allReals) return [{ lo: -Infinity, loInc: false, hi: Infinity, hiInc: false }];
        if (p.compound) {
          var li = p.op1 === '<=', hiI = p.op2 === '<=';
          if (p.lo > p.hi || (p.lo === p.hi && !(li && hiI))) return [];
          return [{ lo: p.lo, loInc: li, hi: p.hi, hiInc: hiI, loText: p.loText, hiText: p.hiText }];
        }
        if (!p.op) return null;
        var first = p.op.charAt(0) === '>'
          ? { lo: p.val, loInc: p.op === '>=', hi: Infinity, hiInc: false, loText: p.valText }
          : { lo: -Infinity, loInc: false, hi: p.val, hiInc: p.op === '<=', hiText: p.valText };
        if (!p.absRight) return [first];
        return [first, { lo: p.absRight.val, loInc: p.absRight.op === '>=', hi: Infinity, hiInc: false, loText: p.absRight.valText }];
      };
      var iqUnion = function(list) {
        var sorted = list.slice().sort(function(p, q) { return p.lo < q.lo ? -1 : p.lo > q.lo ? 1 : (q.loInc ? 1 : 0) - (p.loInc ? 1 : 0); });
        var out = [];
        sorted.forEach(function(r) {
          var last = out[out.length - 1];
          if (last && (r.lo < last.hi || (r.lo === last.hi && (r.loInc || last.hiInc)))) {
            if (r.hi > last.hi) { last.hi = r.hi; last.hiInc = r.hiInc; last.hiText = r.hiText; }
            else if (r.hi === last.hi) last.hiInc = last.hiInc || r.hiInc;
          } else out.push(Object.assign({}, r));
        });
        return out;
      };
      var iqIntersect = function(A, B) {
        var out = [];
        A.forEach(function(a) {
          B.forEach(function(b) {
            var r = {};
            if (a.lo > b.lo) { r.lo = a.lo; r.loInc = a.loInc; r.loText = a.loText; }
            else if (b.lo > a.lo) { r.lo = b.lo; r.loInc = b.loInc; r.loText = b.loText; }
            else { r.lo = a.lo; r.loInc = a.loInc && b.loInc; r.loText = a.loText; }
            if (a.hi < b.hi) { r.hi = a.hi; r.hiInc = a.hiInc; r.hiText = a.hiText; }
            else if (b.hi < a.hi) { r.hi = b.hi; r.hiInc = b.hiInc; r.hiText = b.hiText; }
            else { r.hi = a.hi; r.hiInc = a.hiInc && b.hiInc; r.hiText = a.hiText; }
            if (r.lo < r.hi || (r.lo === r.hi && r.loInc && r.hiInc)) out.push(r);
          });
        });
        return iqUnion(out);
      };
      // Back to the parser's shapes (ray, band, two rays, all reals, empty); null for others.
      var iqFromIntervals = function(list, v) {
        if (!list) return null;
        if (!list.length) return { compound: false, v: v, empty: true, emptySet: true };
        var A = list[0], B = list[1];
        if (list.length === 1) {
          if (A.lo === -Infinity && A.hi === Infinity) return { compound: false, v: v, allReals: true };
          if (A.lo === -Infinity) return { compound: false, v: v, op: A.hiInc ? '<=' : '<', val: A.hi, valText: A.hiText };
          if (A.hi === Infinity) return { compound: false, v: v, op: A.loInc ? '>=' : '>', val: A.lo, valText: A.loText };
          return { compound: true, v: v, lo: A.lo, hi: A.hi, op1: A.loInc ? '<=' : '<', op2: A.hiInc ? '<=' : '<', loText: A.loText, hiText: A.hiText };
        }
        if (list.length === 2 && A.lo === -Infinity && B.hi === Infinity) {
          return { compound: false, v: v, op: A.hiInc ? '<=' : '<', val: A.hi, valText: A.hiText, ne: A.hi === B.lo,
            absRight: { v: v, op: B.loInc ? '>=' : '>', val: B.lo, valText: B.loText } };
        }
        return null;
      };
      var iqSameSet = function(A, B) {
        if (!A || !B || A.length !== B.length) return false;
        for (var i = 0; i < A.length; i++) {
          var a = A[i], b = B[i];
          if (a.lo !== b.lo && !(Math.abs(a.lo - b.lo) <= 1e-9)) return false;
          if (a.hi !== b.hi && !(Math.abs(a.hi - b.hi) <= 1e-9)) return false;
          if (isFinite(a.lo) && a.loInc !== b.loInc) return false;
          if (isFinite(a.hi) && a.hiInc !== b.hiInc) return false;
        }
        return true;
      };
      var iqContains = function(list, x) {
        for (var i = 0; i < list.length; i++) {
          var r = list[i];
          if ((x > r.lo || (x === r.lo && r.loInc)) && (x < r.hi || (x === r.hi && r.hiInc))) return true;
        }
        return false;
      };
      // A view that shows every boundary: unchanged when they already fit, the default
      // [-10, 10] when that is enough, else a window around them (keeping 0 when near).
      var iqFitRange = function(p, cur) {
        var def = { min: -10, max: 10 }, c = cur || def, pts = [];
        (iqIntervals(p) || []).forEach(function(r) { if (isFinite(r.lo)) pts.push(r.lo); if (isFinite(r.hi)) pts.push(r.hi); });
        if (!pts.length) return c;
        var lo = Math.min.apply(null, pts), hi = Math.max.apply(null, pts), edge = (c.max - c.min) * 0.05;
        if (lo >= c.min + edge && hi <= c.max - edge) return c;
        if (lo >= -9 && hi <= 9) return def;
        if (Math.max(Math.abs(lo), Math.abs(hi)) <= 100) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
        var margin = Math.max(2, Math.ceil((hi - lo) * 0.15));
        return { min: Math.floor(lo - margin), max: Math.ceil(hi + margin) };
      };

      // ── Feasible regions ── a box clipped by each half-plane a·x + b·y rel c (Sutherland-Hodgman).
      var iqClipHalf = function(poly, k) {
        var sgn = k.rel.charAt(0) === '<' ? 1 : -1, out = [];
        var f = function(p) { return sgn * (k.a * p[0] + k.b * p[1] - k.c); };
        for (var i = 0; i < poly.length; i++) {
          var P = poly[i], Q = poly[(i + 1) % poly.length], fp = f(P), fq = f(Q);
          if (fp <= 1e-9) out.push(P);
          if ((fp < -1e-9 && fq > 1e-9) || (fp > 1e-9 && fq < -1e-9)) { var t = fp / (fp - fq); out.push([P[0] + t * (Q[0] - P[0]), P[1] + t * (Q[1] - P[1])]); }
        }
        return out;
      };
      var iqRegion = function(cons, box) {
        var poly = [[box.xMin, box.yMin], [box.xMax, box.yMin], [box.xMax, box.yMax], [box.xMin, box.yMax]];
        for (var i = 0; i < cons.length && poly.length; i++) poly = iqClipHalf(poly, cons[i]);
        return poly;
      };
      // The part of a boundary line inside the box, or null.
      var iqSegment = function(k, box) {
        var pts = [], push = function(x, y) {
          if (x < box.xMin - 1e-9 || x > box.xMax + 1e-9 || y < box.yMin - 1e-9 || y > box.yMax + 1e-9) return;
          for (var i = 0; i < pts.length; i++) if (Math.abs(pts[i][0] - x) < 1e-9 && Math.abs(pts[i][1] - y) < 1e-9) return;
          pts.push([x, y]);
        };
        if (k.b) { push(box.xMin, (k.c - k.a * box.xMin) / k.b); push(box.xMax, (k.c - k.a * box.xMax) / k.b); }
        if (k.a) { push((k.c - k.b * box.yMin) / k.a, box.yMin); push((k.c - k.b * box.yMax) / k.a, box.yMax); }
        return pts.length >= 2 ? [pts[0], pts[pts.length - 1]] : null;
      };
      // Exact corners: where two boundary lines meet and every constraint allows it.
      // A corner on a dashed (strict) boundary is a limit of the region, not in it.
      var iqCorners = function(cons) {
        var out = [];
        for (var i = 0; i < cons.length; i++) {
          for (var j = i + 1; j < cons.length; j++) {
            var P = cons[i], Q = cons[j];
            var det = qSub(qMul(P.qa, Q.qb), qMul(Q.qa, P.qb));
            if (!det || !det.n) continue;
            var x = qDiv(qSub(qMul(P.qc, Q.qb), qMul(Q.qc, P.qb)), det), y = qDiv(qSub(qMul(P.qa, Q.qc), qMul(Q.qa, P.qc)), det);
            if (!x || !y) continue;
            var ok = true, strict = false;
            for (var m = 0; m < cons.length; m++) {
              var K = cons[m], cmp = qCmp(qAdd(qMul(K.qa, x), qMul(K.qb, y)), K.qc);
              if (!iqHolds(cmp, K.rel)) { if (cmp === 0) strict = true; else ok = false; }
            }
            if (!ok) continue;
            var dup = out.some(function(c) { return qCmp(c.qx, x) === 0 && qCmp(c.qy, y) === 0; });
            if (!dup) out.push({ qx: x, qy: y, x: qVal(x), y: qVal(y), strict: strict });
          }
        }
        out.sort(function(p, q) { return p.x - q.x || p.y - q.y; });
        return out;
      };
      var iqUnbounded = function(cons) {
        var big = 1e4, poly = iqRegion(cons, { xMin: -big, xMax: big, yMin: -big, yMax: big });
        return poly.some(function(p) { return Math.abs(p[0]) > big * 0.999 || Math.abs(p[1]) > big * 0.999; });
      };
      // "P = 3x + 2y" or "3x + 2y" -> { name, form }.
      var iqObjective = function(src) {
        var s = iqNormalize(src), m = /^([a-z])\s*=\s*(.+)$/.exec(s), name = 'P';
        if (m && m[1] !== 'x' && m[1] !== 'y') { name = m[1].toUpperCase(); s = m[2]; }
        var form = s ? iqLinear(s, 'xy') : null;
        return form ? { name: name, form: form } : null;
      };
      // ── Flip Lab arithmetic, exact ──
      var iqApply = function(q, op, k) { return op === 'add' ? qAdd(q, k) : op === 'sub' ? qSub(q, k) : op === 'mul' ? qMul(q, k) : op === 'div' ? qDiv(q, k) : null; };
      var iqRelOf = function(a, b) { var c = qCmp(a, b); return c < 0 ? '<' : c > 0 ? '>' : '='; };

      var zoomRange = function(factor) {
        var mid = (range.min + range.max) / 2;
        var half = Math.round((range.max - range.min) * factor / 2);
        if (half < 2) half = 2;
        if (half > 100) half = 100;
        upd('range', { min: Math.round(mid - half), max: Math.round(mid + half) });
      };

      var W2 = 400, H2 = 400, pad2 = 40;
      var gRange = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
      var toGX = function(x) { return pad2 + ((x - gRange.xMin) / (gRange.xMax - gRange.xMin)) * (W2 - 2 * pad2); };
      var toGY = function(y) { return H2 - pad2 - ((y - gRange.yMin) / (gRange.yMax - gRange.yMin)) * (H2 - 2 * pad2); };

      var ineq = parseIneq(d.expr);
      if(ineq&&ineq.compound)ineq.empty=ineq.lo>ineq.hi||(ineq.lo===ineq.hi&&(!ineq.op1.includes('=')||!ineq.op2.includes('=')));

      // Check expression-based badges
      if (ineq) {
        if ((ineq.absSource && !badges.absValue) || (ineq.compound && !badges.compound)) checkBadges({ absValue: !!ineq.absSource, compound: !!ineq.compound });
      }

      // ── NOTATION ──
      var intervalStr = '';
      var setBuilderStr = '';
      if (ineq && ineq.allReals) {
        intervalStr = '(-\u221e, \u221e)';
        setBuilderStr = '{ ' + ineq.v + ' | ' + ineq.v + ' \u2208 \u211d }';
      } else if (ineq && !ineq.emptySet) {
        if (ineq.compound) {
          var lb = ineq.op1.includes('=') ? '[' : '(';
          var rb = ineq.op2.includes('=') ? ']' : ')';
          var loT = ineq.loText || ineq.lo, hiT = ineq.hiText || ineq.hi;
          intervalStr = lb + loT + ', ' + hiT + rb;
          var leftCmp = ineq.op1.includes('=') ? '\u2264' : '<';
          var rightCmp = ineq.op2.includes('=') ? '\u2264' : '<';
          setBuilderStr = '{ ' + ineq.v + ' | ' + loT + ' ' + leftCmp + ' ' + ineq.v + ' ' + rightCmp + ' ' + hiT + ' }';
        } else {
          var bText = ineq.valText || ineq.val;
          if (ineq.op.includes('>')) {
            intervalStr = (ineq.op.includes('=') ? '[' : '(') + bText + ', \u221E)';
          } else {
            intervalStr = '(-\u221E, ' + bText + (ineq.op.includes('=') ? ']' : ')');
          }
          var dispOp = ineq.op.replace('<=', '\u2264').replace('>=', '\u2265');
          setBuilderStr = '{ ' + ineq.v + ' | ' + ineq.v + ' ' + dispOp + ' ' + bText + ' }';
          // |x - c| > b solutions are a UNION of two rays; without this the
          // notation showed only the left piece and silently dropped half the
          // solution set.
          if (ineq.absRight) {
            var rOp = ineq.absRight.op;
            var rText = ineq.absRight.valText || ineq.absRight.val;
            intervalStr += ' \u222A ' + (rOp.includes('=') ? '[' : '(') + rText + ', \u221E)';
            var rDispOp = rOp.replace('<=', '\u2264').replace('>=', '\u2265');
            setBuilderStr = '{ ' + ineq.v + ' | ' + ineq.v + ' ' + dispOp + ' ' + bText + ' or ' + ineq.v + ' ' + rDispOp + ' ' + rText + ' }';
            if (ineq.ne) setBuilderStr = '{ ' + ineq.v + ' | ' + ineq.v + ' \u2260 ' + bText + ' }';
          }
        }
      }

      if(ineq&&ineq.empty){intervalStr='∅';setBuilderStr='∅';}

      // ── Describing a graph in words: SVG labels, "Read the graph", read-aloud ──
      var WORD_OPEN = __alloT('stem.inequality.word_open_circle', 'an open circle');
      var WORD_CLOSED = __alloT('stem.inequality.word_closed_circle', 'a closed circle');
      var endText = function(x, t) { return t != null ? String(t) : iqNumFmt(x); };
      var describeSet = function(p) {
        var iv = iqIntervals(p);
        if (!iv) return '';
        if (!iv.length) return __alloT('stem.inequality.read_empty', 'Nothing is shaded: no number is a solution (the empty set).');
        var A = iv[0], B = iv[1];
        if (iv.length === 1) {
          if (A.lo === -Infinity && A.hi === Infinity) return __alloT('stem.inequality.read_all', 'The whole number line is shaded: every real number is a solution.');
          if (A.lo === -Infinity) return iqFill(A.hiInc
            ? __alloT('stem.inequality.read_left_closed', 'Closed circle at {b}, shaded to the left: {b} and every number less than {b}.')
            : __alloT('stem.inequality.read_left_open', 'Open circle at {b}, shaded to the left: every number less than {b}, but not {b} itself.'), { b: endText(A.hi, A.hiText) });
          if (A.hi === Infinity) return iqFill(A.loInc
            ? __alloT('stem.inequality.read_right_closed', 'Closed circle at {b}, shaded to the right: {b} and every number greater than {b}.')
            : __alloT('stem.inequality.read_right_open', 'Open circle at {b}, shaded to the right: every number greater than {b}, but not {b} itself.'), { b: endText(A.lo, A.loText) });
          if (A.lo === A.hi) return iqFill(__alloT('stem.inequality.read_point', 'A single closed circle at {b}: only {b} is a solution.'), { b: endText(A.lo, A.loText) });
          return iqFill(__alloT('stem.inequality.read_between', 'Shaded between {lo} and {hi}, with {loDot} at {lo} and {hiDot} at {hi}.'),
            { lo: endText(A.lo, A.loText), hi: endText(A.hi, A.hiText), loDot: A.loInc ? WORD_CLOSED : WORD_OPEN, hiDot: A.hiInc ? WORD_CLOSED : WORD_OPEN });
        }
        if (A.hi === B.lo) return iqFill(__alloT('stem.inequality.read_except', 'The whole line is shaded except an open circle at {b}: every number except {b}.'), { b: endText(A.hi, A.hiText) });
        return iqFill(__alloT('stem.inequality.read_two_rays', 'Two pieces: shaded to the left of {a} ({aDot}) and to the right of {b} ({bDot}).'),
          { a: endText(A.hi, A.hiText), b: endText(B.lo, B.loText), aDot: A.hiInc ? WORD_CLOSED : WORD_OPEN, bDot: B.loInc ? WORD_CLOSED : WORD_OPEN });
      };
      // B2: boundaries outside the visible range are drawn as edge markers and named here.
      var offscreen = [];
      (iqIntervals(ineq) || []).forEach(function(r) {
        if (isFinite(r.lo) && (r.lo < range.min || r.lo > range.max)) offscreen.push(endText(r.lo, r.loText));
        if (isFinite(r.hi) && r.hi !== r.lo && (r.hi < range.min || r.hi > range.max)) offscreen.push(endText(r.hi, r.hiText));
      });
      var offscreenText = offscreen.length ? iqFill(__alloT('stem.inequality.read_offscreen', 'Part of the graph is off screen: the boundary at {b} is outside the visible range. Use Fit view to see it.'), { b: offscreen.join(', ') }) : '';
      var readSentence = ineq ? describeSet(ineq) + (offscreenText ? ' ' + offscreenText : '') : '';
      var REASON_TEXT = {
        abs_negative_less: __alloT('stem.inequality.reason_abs_negative_less', 'An absolute value is a distance from 0, so it is never negative. It can never be less than a negative number: no solution, the empty set (∅).'),
        abs_negative_greater: __alloT('stem.inequality.reason_abs_negative_greater', 'An absolute value is a distance from 0, so it is never negative. It is always greater than a negative number: every real number is a solution.'),
        abs_zero_less: __alloT('stem.inequality.reason_abs_zero_less', 'An absolute value is never less than 0: no solution, the empty set (∅).'),
        abs_zero_at_least: __alloT('stem.inequality.reason_abs_zero_at_least', 'An absolute value is always at least 0: every real number is a solution.'),
        or_all: __alloT('stem.inequality.reason_or_all', 'Together the two pieces cover the whole number line, so every real number is a solution.'),
        and_empty: __alloT('stem.inequality.reason_and_empty', 'No number makes both parts true at once, so the solution set is empty (∅).')
      };
      var reasonText = ineq && ineq.reason ? REASON_TEXT[ineq.reason] || '' : '';
      // Every way an expression arrives (typing, presets, history, Graph It, a built graph)
      // re-fits the number line so its boundary is on screen. A Hard quiz range such as
      // [40, 56] used to stay and draw the preset x > 3 off the axis.
      var setExpr = function(expr, extra) {
        var patch = Object.assign({ expr: expr, studentGraphed: true }, extra || {});
        var fit = iqFitRange(parseIneq(expr), range);
        if (fit.min !== range.min || fit.max !== range.max) patch.range = fit;
        upd(patch);
      };

      // ── 2D descriptions ──
      var pt2 = function(x, y) { return '(' + x + ', ' + y + ')'; };
      var lineText2D = function(k) { return k.vertical ? 'x = ' + qText(k.qx) : 'y = ' + iqFmtLin(k.qm, k.qk, 'x', false); };
      var sideText2D = function(k) {
        var up = k.op.charAt(0) === '>';
        if (k.vertical) return up ? __alloT('stem.inequality.side_right', 'to the right of the line') : __alloT('stem.inequality.side_left', 'to the left of the line');
        return up ? __alloT('stem.inequality.side_above', 'above the line') : __alloT('stem.inequality.side_below', 'below the line');
      };
      var describeLine2D = function(k) {
        return iqFill(k.op.indexOf('=') >= 0
          ? __alloT('stem.inequality.read2d_solid', 'Solid boundary line {eq} (points on the line are included), shaded {side}.')
          : __alloT('stem.inequality.read2d_dashed', 'Dashed boundary line {eq} (points on the line are not included), shaded {side}.'), { eq: lineText2D(k), side: sideText2D(k) });
      };
      // B3: a test point ON the boundary line says nothing about a side, so (0, 0) is
      // replaced by the first nearby point off the line.
      var pickTestPoint = function(k) {
        var cands = [[0, 0], [1, 0], [0, 1], [1, 1], [-1, 0], [0, -1], [2, 0], [0, 2]];
        for (var i = 0; i < cands.length; i++) {
          var qx = qMake(cands[i][0]), qy = qMake(cands[i][1]);
          if (qCmp(qAdd(qMul(k.qa, qx), qMul(k.qb, qy)), k.qc) !== 0) return { x: cands[i][0], y: cands[i][1], qx: qx, qy: qy, skippedOrigin: i > 0 };
        }
        return null;
      };
      var describeTest2D = function(k, tp) {
        var at = { x: tp.qx, y: tp.qy }, lhs = iqLinEval(k.lhs, at), rhs = iqLinEval(k.rhs, at);
        var holds = iqHolds(qCmp(lhs, rhs), k.rel);
        var s = iqFill(holds
          ? __alloT('stem.inequality.read2d_test_true', 'Test point {pt}: {lhs} {op} {rhs} is true, so the shaded side is the side that contains {pt}.')
          : __alloT('stem.inequality.read2d_test_false', 'Test point {pt}: {lhs} {op} {rhs} is false, so the shaded side is the side without {pt}.'),
          { pt: pt2(tp.x, tp.y), lhs: qText(lhs), op: iqOpText(k.rel), rhs: qText(rhs) });
        if (tp.skippedOrigin) s = iqFill(__alloT('stem.inequality.read2d_origin_on_line', '(0, 0) lies on the boundary line, so it cannot show which side to shade; this uses {pt} instead.'), { pt: pt2(tp.x, tp.y) }) + ' ' + s;
        return { holds: holds, text: s };
      };

      // ── TEST-A-VALUE ──
      var testVal = d.testVal != null ? d.testVal : '';
      var testResult = null;
      // Counted when entered (Enter or leaving the box), once per inequality and value:
      // counting keystrokes made typing "12" two tests.
      var commitTest = function(e) {
        if (testResult === null) return;
        var r = window.StemLab.grading.creditOnce(d.testsRun, String(d.expr).replace(/\s+/g, '') + '|' + parseFloat(testVal));
        // Enter always reads the result back; leaving the box only does when it is new.
        if (r.isNew || (e && e.type === 'keydown')) iqAnnounce(testResult ? testVal + __alloT('stem.inequality.is_in_solution_set', ' IS in the solution set') : testVal + __alloT('stem.inequality.is_not_in_solution_set', ' is NOT in the solution set'));
        if (!r.isNew) return;
        upd({ testsRun: r.seen, testCount: testCount + 1 });
        if (testCount + 1 >= 10) checkBadges({ testMaster: true });
      };
      if (ineq && testVal !== '' && !isNaN(parseFloat(testVal))) {
        var tv = parseFloat(testVal);
        if (ineq.emptySet || ineq.allReals) {
          testResult = !!ineq.allReals;
        } else if (ineq.compound) {
          var loOk = ineq.op1.includes('=') ? tv >= ineq.lo : tv > ineq.lo;
          var hiOk = ineq.op2.includes('=') ? tv <= ineq.hi : tv < ineq.hi;
          testResult = loOk && hiOk;
        } else {
          if (ineq.op === '>') testResult = tv > ineq.val;
          else if (ineq.op === '>=') testResult = tv >= ineq.val;
          else if (ineq.op === '<') testResult = tv < ineq.val;
          else if (ineq.op === '<=') testResult = tv <= ineq.val;
          // Union case (|x - c| > b): a value on the RIGHT ray is also a
          // solution — without this, testing x = 10 against |x - 3| > 5
          // wrongly reported "not a solution".
          if (!testResult && ineq.absRight) {
            var rv = ineq.absRight;
            if (rv.op === '>') testResult = tv > rv.val;
            else if (rv.op === '>=') testResult = tv >= rv.val;
          }
        }
      }

      // ── PRESETS ──
      var PRESETS_1D = [
        { label: 'x > 3', expr: 'x > 3' },
        { label: 'x < -2', expr: 'x < -2' },
        { label: 'x \u2265 0', expr: 'x >= 0' },
        { label: 'x \u2264 5', expr: 'x <= 5' },
        { label: '-3 < x \u2264 4', expr: '-3 < x <= 4' },
        { label: '1 \u2264 x < 7', expr: '1 <= x < 7' },
        { label: '-5 \u2264 x \u2264 5', expr: '-5 <= x <= 5' },
        { label: '0 < x < 10', expr: '0 < x < 10' },
        { label: '|x - 3| < 5', expr: '|x - 3| < 5' },
        { label: '|x + 2| \u2264 4', expr: '|x + 2| <= 4' },
      ];
      var PRESETS_2D = [
        { label: 'y > x + 1', expr: 'y > x + 1' },
        { label: 'y < -x + 3', expr: 'y < -x + 3' },
        { label: 'y \u2265 2x - 1', expr: 'y >= 2x - 1' },
        { label: 'y \u2264 -0.5x + 4', expr: 'y <= -0.5x + 4' },
        { label: 'y > 3', expr: 'y > 3' },
        { label: 'y < x', expr: 'y < x' },
      ];
      var PRESETS = graphMode === '2d' ? PRESETS_2D : PRESETS_1D;

      // ── Corrective feedback: diagnose WHICH part of the inequality was mis-read ──
      // Quiz distractors differ from the answer in direction (< vs >), boundary
      // (with/without =), or endpoint inclusion — so we can name the exact mix-up
      // instead of just revealing the answer.
      function diagnoseQuizError(chosenRaw, answerRaw) {
        var norm = function(s) { return s.replace(/\s+/g, '').replace(/≤/g, '<=').replace(/≥/g, '>='); };
        var pretty = function(s) { return s.replace(/>=/g, '≥').replace(/<=/g, '≤'); };
        var c = norm(chosenRaw), a = norm(answerRaw);
        // Compound form: lo op x op hi
        var am = a.match(/^(-?[\d.]+)(<=?)([a-z])(<=?)(-?[\d.]+)$/);
        var cm = c.match(/^(-?[\d.]+)(<=?)([a-z])(<=?)(-?[\d.]+)$/);
        if (am && cm) {
          var msgs = [];
          if (cm[2] !== am[2]) msgs.push('the LEFT endpoint ' + am[1] + ' should be ' + (am[2] === '<=' ? 'INCLUDED (● closed dot, ≤)' : 'EXCLUDED (○ open dot, <)'));
          if (cm[4] !== am[4]) msgs.push('the RIGHT endpoint ' + am[5] + ' should be ' + (am[4] === '<=' ? 'INCLUDED (● closed dot, ≤)' : 'EXCLUDED (○ open dot, <)'));
          if (msgs.length) return 'Check each endpoint on its own: ' + msgs.join(', and ') + '. Words like "inclusive" and "at least/at most" close a dot; "strictly" and "between (not including)" leave it open.';
        }
        // Simple form: x op val
        var as = a.match(/^([a-z])(<=|>=|<|>)(-?[\d.]+)$/);
        var cs = c.match(/^([a-z])(<=|>=|<|>)(-?[\d.]+)$/);
        if (as && cs && as[3] === cs[3]) {
          var aDir = as[2][0], cDir = cs[2][0];
          var aInc = as[2].length === 2, cInc = cs[2].length === 2;
          if (aDir !== cDir && aInc === cInc) {
            return 'Direction mix-up: "' + (aDir === '>' ? 'greater than' : 'less than') + '" shades to the ' + (aDir === '>' ? 'RIGHT' : 'LEFT') + ' of ' + as[3] + '. Re-read which side of the boundary the question wants.';
          }
          if (aDir === cDir && aInc !== cInc) {
            return 'Boundary mix-up: everything hinges on whether ' + as[3] + ' itself counts. ' + (aInc
              ? 'Phrases like "at least", "at most", "no more than", and "inclusive" INCLUDE the boundary — closed dot ● and ' + (aDir === '>' ? '≥' : '≤') + '.'
              : 'Phrases like "more than", "less than", "under", and "strictly" EXCLUDE the boundary — open dot ○ and ' + aDir + '.');
          }
          return 'Both the direction AND the boundary are off: the solution shades ' + (aDir === '>' ? 'RIGHT' : 'LEFT') + ' of ' + as[3] + ' with ' + (aInc ? 'a closed dot ● (' + as[3] + ' counts)' : 'an open dot ○ (' + as[3] + ' does not count)') + '.';
        }
        return 'The answer is ' + pretty(answerRaw) + '. Compare it with your pick symbol by symbol: direction first (< vs >), then boundary (with or without the = bar).';
      }

      // ── QUIZ ──
      var QUIZ_EASY = [
        { q: 'Shade: all x greater than 2', a: 'x > 2', opts: ['x > 2', 'x < 2', 'x >= 2', 'x <= 2'] },
        { q: 'Shade: all x less than or equal to -1', a: 'x <= -1', opts: ['x < -1', 'x <= -1', 'x > -1', 'x >= -1'] },
        { q: 'Shade: all x at least 5', a: 'x >= 5', opts: ['x > 5', 'x >= 5', 'x < 5', 'x <= 5'] },
        { q: 'Shade: all x less than 0', a: 'x < 0', opts: ['x < 0', 'x <= 0', 'x > 0', 'x >= 0'] },
        { q: 'Shade: all x no more than 3', a: 'x <= 3', opts: ['x < 3', 'x <= 3', 'x > 3', 'x >= 3'] },
      ];
      var QUIZ_MEDIUM = [
        { q: 'Shade: x between -3 and 4 (inclusive)', a: '-3 <= x <= 4', opts: ['-3 <= x <= 4', '-3 < x < 4', '-3 < x <= 4', '-3 <= x < 4'] },
        { q: 'Shade: x strictly between 0 and 6', a: '0 < x < 6', opts: ['0 < x < 6', '0 <= x <= 6', '0 < x <= 6', '0 <= x < 6'] },
        { q: 'Shade: x from -5 to 2, including both endpoints', a: '-5 <= x <= 2', opts: ['-5 <= x <= 2', '-5 < x < 2', '-5 <= x < 2', '-5 < x <= 2'] },
        { q: 'Shade: x between 1 and 8, including 1 but not 8', a: '1 <= x < 8', opts: ['1 <= x < 8', '1 < x <= 8', '1 < x < 8', '1 <= x <= 8'] },
      ];
      var QUIZ_HARD = [
        { q: 'A roller coaster requires riders to be at least 48 inches tall. Write the inequality for height x.', a: 'x >= 48', opts: ['x >= 48', 'x > 48', 'x <= 48', 'x < 48'], range: { min: 40, max: 56 } },
        { q: 'The speed limit is under 65 mph. Write the inequality for speed x.', a: 'x < 65', opts: ['x < 65', 'x <= 65', 'x > 65', 'x >= 65'], range: { min: 55, max: 75 } },
        { q: 'A pH between 6 and 8 (inclusive) is safe for swimming. Write the inequality.', a: '6 <= x <= 8', opts: ['6 <= x <= 8', '6 < x < 8', '6 <= x < 8', '6 < x <= 8'], range: { min: 0, max: 14 } },
        { q: 'Water is liquid strictly between 0\u00B0C and 100\u00B0C. Write the inequality.', a: '0 < x < 100', opts: ['0 < x < 100', '0 <= x <= 100', '0 < x <= 100', '0 <= x < 100'], range: { min: -10, max: 110 } },
        { q: 'A student needs more than 70 points to pass. Write the inequality for score x.', a: 'x > 70', opts: ['x > 70', 'x >= 70', 'x < 70', 'x <= 70'], range: { min: 60, max: 80 } },
        { q: 'Temperature must stay at most -2\u00B0C for ice. Write the inequality.', a: 'x <= -2', opts: ['x <= -2', 'x < -2', 'x >= -2', 'x > -2'] },
        { q: 'A child ticket is for ages under 12. Write the inequality for age x.', a: 'x < 12', opts: ['x < 12', 'x <= 12', 'x > 12', 'x >= 12'], range: { min: 0, max: 20 } },
      ];

      var quizTier = d.quizTier || 'all';
      var getQuizPool = function() {
        if (quizTier === 'easy') return QUIZ_EASY;
        if (quizTier === 'medium') return QUIZ_MEDIUM;
        if (quizTier === 'hard') return QUIZ_HARD;
        return QUIZ_EASY.concat(QUIZ_MEDIUM).concat(QUIZ_HARD);
      };

      // B1: the 1.5 s auto-advance timer runs this from the render that handled the
      // click, whose `d` still held the old score and streak, so every auto-advance reset
      // them to 0. Score, streak and levels are now read from the latest state.
      var iqStartQuiz = function(fromQuizId) {
        var pool = getQuizPool();
        var q = pool[Math.floor(Math.random() * pool.length)];
        // Fisher-Yates: the old random-comparator .sort() is statistically
        // biased (some orderings come up measurably more often). The question
        // is drawn once into state, so a true shuffle here is stable for the
        // life of the question; grading compares option TEXT to q.a.
        var shuffled = q.opts.slice();
        for (var fy = shuffled.length - 1; fy > 0; fy--) {
          var fj = Math.floor(Math.random() * (fy + 1));
          var ft = shuffled[fy]; shuffled[fy] = shuffled[fj]; shuffled[fj] = ft;
        }
        // The question's own level, for All Levels (a question drawn in "All" still has one).
        var qTier = QUIZ_EASY.indexOf(q) !== -1 ? 'easy' : QUIZ_MEDIUM.indexOf(q) !== -1 ? 'medium' : 'hard';
        var tierKey = quizTier === 'all' ? 'mixed' : quizTier;
        var newId = 'iq' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
        setLabToolData(function(prev) {
          var cur = prev.inequality || {};
          // The timer only moves on from the answered question it was queued for, so a
          // manual "Next Challenge" in the meantime is not skipped past.
          if (typeof fromQuizId === 'string' && (!cur.quiz || !cur.quiz.answered || (cur.quiz.id || '') !== fromQuizId)) return prev;
          var nt = Object.assign({}, cur.tiersUsed || {});
          nt[tierKey] = true;
          return Object.assign({}, prev, { inequality: Object.assign({}, cur, {
            quiz: { id: newId, q: q.q, a: q.a, opts: shuffled, answered: false, score: (cur.quiz && cur.quiz.score) || 0, streak: (cur.quiz && cur.quiz.streak) || 0, tier: qTier },
            range: q.range || { min: -10, max: 10 },
            tiersUsed: nt
          }) });
        });
      };

      // ── COACH TIPS ──
      var showCoach = d.showCoach || false;
      var COACH_TIPS = [
        { icon: '\u25CB', tip: __alloT('stem.inequality.coach_tip_open_dot', 'Open dot (\u25CB) means the boundary value is NOT part of the solution  \u2014  used with < and >') },
        { icon: '\u25CF', tip: __alloT('stem.inequality.coach_tip_closed_dot', 'Closed dot (\u25CF) means the boundary value IS part of the solution  \u2014  used with \u2264 and \u2265') },
        { icon: '( )', tip: __alloT('stem.inequality.coach_tip_interval_notation', 'Interval notation uses ( ) for open boundaries and [ ] for closed boundaries') },
        { icon: '\u221E', tip: __alloT('stem.inequality.coach_tip_infinity', 'Infinity (\u221E) always uses ( ) because infinity is not a reachable value') },
      ];

      // ── RANGE CONTROLS ──
      var shiftRange = function(delta) {
        upd('range', { min: range.min + delta, max: range.max + delta });
      };

      // ── AI Tutor ──
      // B4: the quiz's Explain passes 'quiz'. Answering set expr to the correct answer, so
      // the graph branch always ran and the tutor never heard the question or the pick.
      // B10: no callGemini, or one that throws at once, used to leave the spinner forever.
      function askAI(source) {
        if (aiBusyRef.current) return;
        var wrongQuiz = d.quiz && d.quiz.answered && !d.quiz.correct;
        var fromQuiz = source === 'quiz' && wrongQuiz;
        var offline = function() {
          var hint = fromQuiz ? (d.quiz.fb || '') : ineq ? readSentence : COACH_TIPS[0].tip;
          aiBusyRef.current = false;
          upd({ showAI: true, aiLoading: false, aiResponse: __alloT('stem.inequality.ai_offline_hint', 'The AI tutor is not available here, so here is a built-in hint:') + ' ' + hint });
        };
        if (typeof callGemini !== 'function') { offline(); return; }
        aiBusyRef.current = true;
        upd({ showAI: true, aiLoading: true, aiResponse: '' });
        var prompt = 'You are a friendly math tutor helping a student learn about inequalities and number line graphs. ';
        if (fromQuiz) {
          prompt += 'They answered a quiz question wrong. Question: "' + d.quiz.q + '". They chose: ' + d.quiz.chosen + '. Correct answer: ' + d.quiz.a + '. ';
          if (d.quiz.fb) prompt += 'What went wrong: ' + d.quiz.fb + ' ';
          prompt += 'Explain the difference between their choice and the correct answer, and why the correct answer fits the words. ';
        } else if (ineq) {
          prompt += 'They are graphing: ' + (d.expr || '') + '. ';
          if (ineq.compound) {
            prompt += 'This is a compound inequality. Explain what the interval notation ' + intervalStr + ' means in plain language. ';
          } else if (ineq.absSource) {
            prompt += 'This involves absolute value. Explain how ' + ineq.absSource + ' decomposes into simpler inequalities. ';
          } else {
            prompt += 'Explain what this inequality means, when the dot is open vs closed, and give a real-world example. ';
          }
        } else if (wrongQuiz) {
          prompt += 'They got a quiz question wrong: "' + d.quiz.q + '". They chose: ' + d.quiz.chosen + '. Correct answer: ' + d.quiz.a + '. ';
          prompt += 'Explain the difference between the options and why the correct answer is right. ';
        } else {
          prompt += 'Give a helpful tip about reading or writing inequalities, or about interval notation. Include a real-world example. ';
        }
        prompt += 'Keep it to 2-3 sentences, encouraging and clear.';
        var req;
        try { req = callGemini(prompt, false, false, 0.7); } catch (e) { req = null; }
        if (!req || typeof req.then !== 'function') { offline(); return; }
        req.then(function(resp) {
          aiBusyRef.current = false;
          upd({ aiResponse: resp || 'No response received.', aiLoading: false });
        }, function() {
          aiBusyRef.current = false;
          upd({ aiResponse: 'AI tutor is unavailable right now. Try again later!', aiLoading: false });
        });
      }

      // ── Keyboard shortcuts ──
      React.useEffect(function() {
        function handleKey(e) {
          // WCAG 2.1.4: single-key shortcuts act only while focus is inside this tool.
          var iqRoot = document.querySelector('[data-inequality-root]');
          if (!iqRoot || !e.target || !iqRoot.contains(e.target)) return;
          if (e.ctrlKey || e.metaKey || e.altKey) return;
          if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
          var key = e.key.toLowerCase();
          if (key === '1') { e.preventDefault(); upd('graphMode', '1d'); trackMode('1d'); }
          if (key === '2') { e.preventDefault(); upd('graphMode', '2d'); trackMode('2d'); }
          if (key === 'q') { e.preventDefault(); iqStartQuiz(); }
          if (key === '?' || (e.shiftKey && e.key === '/')) { e.preventDefault(); askAI(); }
          if (key === 'b') { e.preventDefault(); upd('showBadges', !showBadges); }
          if (key === 'c') { e.preventDefault(); upd('showCoach', !showCoach); }
        }
        window.addEventListener('keydown', handleKey);
        return function() { window.removeEventListener('keydown', handleKey); };
      });

      // ── Earned badges ──
      var earnedBadges = BADGES.filter(function(b) { return badges[b.id]; });
      var earnedCount = earnedBadges.length;

      // ════════════════════════════════
      // ═══ RENDER ═══
      // ════════════════════════════════
      var inequalityModeLabel = graphMode === '2d' ? '2D region' : 'Number line';
      var inequalityNext = !d.expr
        ? 'Choose or enter an inequality, then predict the boundary and shading before graphing.'
        : testCount === 0
          ? 'Test one value inside and one value outside the proposed solution set.'
          : solverCount === 0
            ? 'Solve symbolically and compare each algebra step with the graph.'
            : 'Justify the boundary style and shading direction in words.';
      var inequalityTabKeyDown = function(e, index) {
        var nextIndex = -1;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIndex = (index + 1) % 2;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nextIndex = (index - 1 + 2) % 2;
        else if (e.key === 'Home') nextIndex = 0;
        else if (e.key === 'End') nextIndex = 1;
        if (nextIndex < 0) return;
        e.preventDefault();
        var tabs = e.currentTarget.parentNode.querySelectorAll('[role="tab"]');
        var nextTab = tabs[nextIndex];
        if (nextTab) { nextTab.focus(); nextTab.click(); }
      };

      var solverExpr = d.solverExpr || '';
      var // Read as solverSteps.slice().map AND solverSteps.solution: it is an
      // ARRAY that also carries a property, so Array.isArray is the test.
      solverSteps = Array.isArray(d.solverSteps) ? d.solverSteps : null;
      var solverRevealIdx = d.solverRevealIdx || 0;
      // A persisted array loses its .solution property, so the solution is kept beside it.
      var solverSolution = solverSteps ? (solverSteps.solution || d.solverSolution || null) : null;
      var oneDMode = ['explore', 'build', 'read'].indexOf(d.oneDMode) >= 0 ? d.oneDMode : 'explore';
      var twoDMode = d.twoDMode === 'system' ? 'system' : 'single';
      var exploring = graphMode === '2d' ? twoDMode === 'single' : oneDMode === 'explore';
      var mergeIneq = function(patchFn) {
        setLabToolData(function(prev) {
          var cur = prev.inequality || {};
          return Object.assign({}, prev, { inequality: Object.assign({}, cur, patchFn(cur)) });
        });
      };
      var pressCls = function(on) { return 'px-2.5 py-1 rounded-lg text-xs font-bold border-2 transition-all focus:outline-none focus:ring-2 focus:ring-fuchsia-400 ' + (on ? 'bg-fuchsia-700 text-white border-fuchsia-700' : 'bg-white text-fuchsia-800 border-fuchsia-700 hover:bg-fuchsia-50'); };
      var fieldStyle = { background: 'var(--allo-stem-panel,#fff)', color: 'var(--allo-stem-text,#0f172a)' };
      var okInk = isDark ? '#34d399' : '#047857', badInk = isDark ? '#f87171' : '#b91c1c';
      // HTML text sits on the host's light card (dark theme too); the contrast theme supplies its own ink.
      var okText = isContrast ? 'var(--allo-stem-text,#ffff00)' : '#047857', badText = isContrast ? 'var(--allo-stem-text,#ffff00)' : '#b91c1c';

      // ── Activity switch inside each tab (Explore / Build / Read; One inequality / System) ──
      var subModeBar = function() {
        var opts = graphMode === '2d'
          ? [['single', __alloT('stem.inequality.mode2d_single', 'One inequality')], ['system', __alloT('stem.inequality.mode2d_system', 'System: feasible region')]]
          : [['explore', __alloT('stem.inequality.mode1d_explore', 'Explore')], ['build', __alloT('stem.inequality.mode1d_build', 'Build the graph')], ['read', __alloT('stem.inequality.mode1d_read', 'Read a graph')]];
        var cur = graphMode === '2d' ? twoDMode : oneDMode;
        return h('div', { role: 'group', 'aria-label': __alloT('stem.inequality.activity_group', 'Activity'), className: 'flex flex-wrap gap-1.5 mb-3', 'data-inequality-activities': graphMode },
          opts.map(function(op) {
            return h('button', { key: op[0], type: 'button', 'aria-pressed': cur === op[0], style: { minHeight: 36 }, className: pressCls(cur === op[0]),
              onClick: function() { upd(graphMode === '2d' ? 'twoDMode' : 'oneDMode', op[0]); } }, op[1]);
          }));
      };

      // ── "Read the graph" sentence, with read-aloud when speech is available ──
      var readBlock = function(text, id) {
        if (!text) return null;
        return h('div', { className: 'mt-2 flex flex-wrap items-start gap-2 rounded-lg border border-fuchsia-300 bg-fuchsia-50 p-2', 'data-inequality-read': id },
          h('p', { className: 'text-xs leading-relaxed text-fuchsia-900', style: { flex: '1 1 12rem', minWidth: 0 } },
            h('strong', null, __alloT('stem.inequality.read_the_graph', 'Read the graph:') + ' '), text),
          canSpeak && h('button', { type: 'button', onClick: function() { speakText(text); },
            className: 'px-2 py-1 rounded text-[0.6875rem] font-bold bg-white text-fuchsia-800 border border-fuchsia-700',
            'aria-label': __alloT('stem.inequality.read_aloud_aria', 'Read the graph description aloud') }, '🔊 ' + __alloT('stem.inequality.read_aloud', 'Read aloud')));
      };

      // ── Number line drawing, shared by Explore, Build and Read ──
      // B2: a boundary outside R is drawn as a marker at the edge it lies beyond and the
      // shading is clamped to the axis, so nothing is drawn off the line or backwards.
      var renderNumberLine = function(ineq, R, o) {
        o = o || {};
        var sx = function(x) { return pad + ((x - R.min) / (R.max - R.min)) * (W - 2 * pad); };
        var vis = function(x) { return x >= R.min && x <= R.max; };
        var csx = function(x) { return sx(Math.max(R.min, Math.min(R.max, x))); };
        var ink = isDark ? '#f0abfc' : '#a21caf', mark = '#d946ef', hollow = isDark ? '#0f172a' : '#ffffff';
        var tickInk = isDark ? '#94a3b8' : '#64748b', axisInk = isDark ? '#e2e8f0' : '#1e293b';
        var span = R.max - R.min, tickStep = Math.max(1, Math.ceil(span / 40));
        var lblStep = Math.max(tickStep, Math.ceil(span / 20 / tickStep) * tickStep);
        var kids = [], v = (ineq && ineq.v) || 'x';
        var band = function(key, x0, x1) {
          var a = csx(x0), b = csx(x1);
          if (b - a > 0.5) kids.push(h('rect', { key: key, x: a, y: 25, width: b - a, height: 50, fill: 'rgba(217,70,239,0.14)', rx: 4 }));
        };
        var seg = function(key, x0, x1, gapL, gapR) {
          var a = csx(x0) + (gapL && vis(x0) ? 8 : 0), b = csx(x1) - (gapR && vis(x1) ? 8 : 0);
          if (b - a > 0.5) kids.push(h('line', { key: key, x1: a, y1: 50, x2: b, y2: 50, stroke: mark, strokeWidth: 3.5 }));
        };
        var arrow = function(key, right) {
          var e = right ? W - pad : pad, s = right ? -10 : 10;
          kids.push(h('polygon', { key: key, points: e + ',50 ' + (e + s) + ',43 ' + (e + s) + ',57', fill: mark }));
        };
        var dot = function(key, x, closed, text, labelY) {
          var y = labelY || 20, sym = closed ? '● ' : '○ ';
          if (vis(x)) {
            kids.push(h('circle', { key: key, cx: sx(x), cy: 50, r: 6, fill: closed ? mark : hollow, stroke: mark, strokeWidth: 2.5, strokeDasharray: o.dashedDot ? '3,2' : undefined }));
            if (text) kids.push(h('text', { key: key + 't', x: sx(x), y: y, textAnchor: 'middle', fill: ink, style: { fontSize: '10px', fontWeight: 'bold' } }, sym + text));
            return;
          }
          // Off-screen boundary: a chevron at the edge it lies beyond, with its value.
          var right = x > R.max, ex = right ? W - pad : pad, dx = right ? -1 : 1;
          kids.push(h('path', { key: key, 'data-inequality-offscreen-marker': 'true', d: 'M' + (ex + dx * 14) + ',12 L' + (ex + dx * 4) + ',19 L' + (ex + dx * 14) + ',26', fill: 'none', stroke: mark, strokeWidth: 2.5 }));
          if (text) kids.push(h('text', { key: key + 't', x: ex + dx * 18, y: 23, textAnchor: right ? 'end' : 'start', fill: ink, style: { fontSize: '10px', fontWeight: 'bold' } }, right ? sym + text + ' →' : '← ' + sym + text));
        };
        var ray = function(key, b, right, closed, text, labelY) {
          if (right && b < R.max) { band(key + 'b', b, R.max); seg(key + 's', b, R.max, true, false); arrow(key + 'a', true); }
          if (!right && b > R.min) { band(key + 'b', R.min, b); seg(key + 's', R.min, b, false, true); arrow(key + 'a', false); }
          dot(key + 'd', b, closed, text, labelY);
        };
        var bt = function(x, t) { return v + ' = ' + endText(x, t); };
        kids.push(h('line', { key: 'axis', x1: pad, y1: 50, x2: W - pad, y2: 50, stroke: '#94a3b8', strokeWidth: 2 }));
        for (var n = Math.ceil(R.min / tickStep) * tickStep; n <= R.max; n += tickStep) {
          var isOrigin = n === 0, showLbl = isOrigin || n % lblStep === 0;
          kids.push(h('g', { key: 'tk' + n },
            h('line', { x1: sx(n), y1: isOrigin ? 38 : 43, x2: sx(n), y2: isOrigin ? 62 : 57, stroke: isOrigin ? axisInk : '#94a3b8', strokeWidth: isOrigin ? 2 : 1, opacity: showLbl ? 1 : 0.45 }),
            showLbl && h('text', { x: sx(n), y: 85, textAnchor: 'middle', fill: isOrigin ? axisInk : tickInk, style: { fontSize: isOrigin ? '11px' : '9px', fontWeight: isOrigin ? 'bold' : 'normal' } }, n)));
        }
        kids.push(h('polygon', { key: 'axr', points: (W - pad) + ',50 ' + (W - pad - 8) + ',45 ' + (W - pad - 8) + ',55', fill: '#94a3b8' }));
        kids.push(h('polygon', { key: 'axl', points: pad + ',50 ' + (pad + 8) + ',45 ' + (pad + 8) + ',55', fill: '#94a3b8' }));
        if (ineq && ineq.allReals) {
          band('all', R.min, R.max); seg('alls', R.min, R.max); arrow('alla', true); arrow('allb', false);
        } else if (ineq && ineq.compound && !ineq.empty) {
          band('cb', ineq.lo, ineq.hi);
          if (ineq.hi >= R.min && ineq.lo <= R.max) seg('cs', ineq.lo, ineq.hi, true, true);
          var close = vis(ineq.lo) && vis(ineq.hi) && sx(ineq.hi) - sx(ineq.lo) < 56;
          dot('clo', ineq.lo, ineq.op1.includes('='), bt(ineq.lo, ineq.loText));
          if (ineq.hi !== ineq.lo) dot('chi', ineq.hi, ineq.op2.includes('='), bt(ineq.hi, ineq.hiText), close ? 10 : 20);
        } else if (ineq && !ineq.compound && !ineq.emptySet && ineq.op) {
          ray('r1', ineq.val, ineq.op.includes('>'), ineq.op.includes('='), bt(ineq.val, ineq.valText));
          // Union case (|x - c| > b, "or", x != n): draw the RIGHT ray too.
          ineq.absRight && (function() {
            var near = vis(ineq.val) && vis(ineq.absRight.val) && sx(ineq.absRight.val) - sx(ineq.val) < 56;
            ray('r2', ineq.absRight.val, true, ineq.absRight.op.includes('='), ineq.ne ? '' : bt(ineq.absRight.val, ineq.absRight.valText), near ? 10 : 20);
          })();
        }
        if (o.dotOnly && isFinite(o.dotOnly.x)) dot('only', o.dotOnly.x, !!o.dotOnly.closed, v + ' = ' + iqNumFmt(o.dotOnly.x));
        if (o.testVal != null && isFinite(o.testVal) && vis(o.testVal)) {
          var tx = sx(o.testVal), tcol = o.testOk ? okInk : badInk;
          kids.push(h('g', { key: 'tv' },
            h('line', { x1: tx, y1: 25, x2: tx, y2: 75, stroke: tcol, strokeWidth: 2, strokeDasharray: '4,2' }),
            h('text', { x: tx, y: 118, textAnchor: 'middle', fill: tcol, style: { fontSize: '10px', fontWeight: 'bold' } }, (o.testOk ? '✅ ' : '❌ ') + o.testVal)));
        }
        var pick = o.onPick ? function(e) {
          var box = e.currentTarget.getBoundingClientRect();
          if (!box || !box.width) return;
          var x = R.min + (((e.clientX - box.left) / box.width) * W - pad) / (W - 2 * pad) * (R.max - R.min);
          o.onPick(Math.max(R.min, Math.min(R.max, Math.round(x))));
        } : undefined;
        return h('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': o.label, 'data-inequality-graph': o.id || 'main', onClick: pick, style: pick ? { cursor: 'crosshair' } : undefined,
          className: 'w-full rounded-xl border-2 shadow-sm ' + (isDark ? 'bg-slate-900 border-fuchsia-800' : 'bg-white border-fuchsia-200') }, kids);
      };

      // ── Coordinate plane drawing, shared by one inequality and systems ──
      // B7: shading is the plot box clipped by each half-plane and boundary lines are
      // clipped to the box, so nothing spills into the axis margin or self-intersects.
      var PLANE_COLORS = ['#d946ef', '#0284c7', '#b45309'];
      var CIRCLED = ['①', '②', '③'];
      var render2DPlane = function(cons, o) {
        o = o || {};
        var kids = [], tickInk = isDark ? '#94a3b8' : '#64748b', ink = isDark ? '#e2e8f0' : '#1e293b';
        for (var gi = gRange.xMin; gi <= gRange.xMax; gi++) {
          kids.push(h('line', { key: 'gx' + gi, x1: toGX(gi), y1: pad2, x2: toGX(gi), y2: H2 - pad2, stroke: gi === 0 ? (isDark ? '#94a3b8' : '#475569') : (isDark ? '#1e293b' : '#e2e8f0'), strokeWidth: gi === 0 ? 2 : 0.5 }));
          kids.push(h('line', { key: 'gy' + gi, x1: pad2, y1: toGY(gi), x2: W2 - pad2, y2: toGY(gi), stroke: gi === 0 ? (isDark ? '#94a3b8' : '#475569') : (isDark ? '#1e293b' : '#e2e8f0'), strokeWidth: gi === 0 ? 2 : 0.5 }));
          if (gi !== 0 && gi % 2 === 0) {
            kids.push(h('text', { key: 'xl' + gi, x: toGX(gi), y: toGY(0) + 14, textAnchor: 'middle', fill: tickInk, style: { fontSize: '8px' } }, gi));
            kids.push(h('text', { key: 'yl' + gi, x: toGX(0) - 10, y: toGY(gi) + 3, textAnchor: 'end', fill: tickInk, style: { fontSize: '8px' } }, gi));
          }
        }
        var region = cons.length ? iqRegion(cons, gRange) : [];
        if (region.length >= 3) kids.push(h('polygon', { key: 'region', 'data-inequality-region': 'true', points: region.map(function(p) { return toGX(p[0]) + ',' + toGY(p[1]); }).join(' '), fill: 'rgba(217,70,239,0.16)' }));
        cons.forEach(function(k, i) {
          var sg = iqSegment(k, gRange);
          if (!sg) return;
          var col = cons.length > 1 ? PLANE_COLORS[i % 3] : '#d946ef';
          kids.push(h('line', { key: 'bl' + i, 'data-inequality-boundary': 'true', x1: toGX(sg[0][0]), y1: toGY(sg[0][1]), x2: toGX(sg[1][0]), y2: toGY(sg[1][1]), stroke: col, strokeWidth: 2.5, strokeDasharray: k.rel.indexOf('=') >= 0 ? 'none' : '6,4' }));
          if (cons.length > 1) {
            var ex = toGX(sg[1][0]), ey = toGY(sg[1][1]), sx0 = toGX(sg[0][0]), sy0 = toGY(sg[0][1]), len = Math.sqrt((ex - sx0) * (ex - sx0) + (ey - sy0) * (ey - sy0)) || 1;
            kids.push(h('text', { key: 'bn' + i, x: ex + (sx0 - ex) * 14 / len + 6, y: ey + (sy0 - ey) * 14 / len, fill: col, style: { fontSize: '13px', fontWeight: 'bold' } }, o.labels ? o.labels[i] : CIRCLED[i % 3]));
          }
        });
        (o.corners || []).forEach(function(c, i) {
          if (c.x < gRange.xMin || c.x > gRange.xMax || c.y < gRange.yMin || c.y > gRange.yMax) return;
          kids.push(h('circle', { key: 'cn' + i, cx: toGX(c.x), cy: toGY(c.y), r: 4, fill: c.strict ? (isDark ? '#0f172a' : '#ffffff') : ink, stroke: ink, strokeWidth: 1.5 }));
          kids.push(h('text', { key: 'cl' + i, x: toGX(c.x) + 6, y: toGY(c.y) - 6, fill: ink, style: { fontSize: '11px', fontWeight: 'bold' } }, String.fromCharCode(65 + i)));
        });
        (o.points || []).forEach(function(p, i) {
          var px = toGX(p.x), py = toGY(p.y), col = p.ok ? okInk : badInk;
          if (p.x < gRange.xMin || p.x > gRange.xMax || p.y < gRange.yMin || p.y > gRange.yMax) return;
          // Shape as well as colour: a filled dot inside, a cross outside.
          kids.push(p.ok
            ? h('circle', { key: 'tp' + i, cx: px, cy: py, r: 5, fill: col, stroke: isDark ? '#0f172a' : '#ffffff', strokeWidth: 1.5 })
            : h('path', { key: 'tp' + i, d: 'M' + (px - 5) + ',' + (py - 5) + ' L' + (px + 5) + ',' + (py + 5) + ' M' + (px - 5) + ',' + (py + 5) + ' L' + (px + 5) + ',' + (py - 5), stroke: col, strokeWidth: 2.5 }));
          if (p.label) kids.push(h('text', { key: 'tpl' + i, x: px + 8, y: py - 6, fill: col, style: { fontSize: '9px', fontWeight: 'bold' } }, p.label));
        });
        kids.push(h('text', { key: 'axx', x: W2 - pad2 + 5, y: toGY(0) + 4, fill: isDark ? '#94a3b8' : '#475569', style: { fontSize: '11px', fontWeight: 'bold' } }, 'x'));
        kids.push(h('text', { key: 'axy', x: toGX(0) + 5, y: pad2 - 5, fill: isDark ? '#94a3b8' : '#475569', style: { fontSize: '11px', fontWeight: 'bold' } }, 'y'));
        if (!cons.length) kids.push(h('text', { key: 'empty', x: W2 / 2, y: H2 / 2, textAnchor: 'middle', fill: tickInk, style: { fontSize: '12px' } }, __alloT('stem.inequality.plane_enter_prompt', 'Enter an inequality such as y > 2x + 1 or 2x + 3y ≤ 6')));
        var pick = o.onPick ? function(e) {
          var box = e.currentTarget.getBoundingClientRect();
          if (!box || !box.width || !box.height) return;
          var px = (e.clientX - box.left) / box.width * W2, py = (e.clientY - box.top) / box.height * H2;
          if (px < pad2 || px > W2 - pad2 || py < pad2 || py > H2 - pad2) return;
          o.onPick(Math.round(gRange.xMin + (px - pad2) / (W2 - 2 * pad2) * (gRange.xMax - gRange.xMin)), Math.round(gRange.yMax - (py - pad2) / (H2 - 2 * pad2) * (gRange.yMax - gRange.yMin)));
        } : undefined;
        return h('svg', { viewBox: '0 0 ' + W2 + ' ' + H2, role: 'img', 'aria-label': o.label, 'data-inequality-plane': o.id || 'single', onClick: pick, style: { maxWidth: 420, cursor: pick ? 'crosshair' : undefined },
          className: 'w-full rounded-xl border-2 shadow-sm ' + (isDark ? 'bg-slate-900 border-fuchsia-800' : 'bg-white border-fuchsia-200') }, kids);
      };

      // ── Explore, 1D ──
      var mainNumberLine = function() {
        var label = ineq
          ? iqFill(__alloT('stem.inequality.aria_number_line_described', 'Number line graph of {expr}. {desc}'), { expr: d.expr, desc: readSentence })
          : __alloT('stem.inequality.aria_number_line_graph', 'Number line inequality graph');
        var tvNum = testResult !== null ? parseFloat(testVal) : null;
        return h('div', null,
          renderNumberLine(ineq, range, { label: label, id: 'main', testVal: tvNum, testOk: testResult }),
          readBlock(readSentence, 'main'));
      };

      // ── Build the graph (keyboard: the number box, the step buttons and the toggles) ──
      var randomSimple = function(avoid) {
        var ops = ['<', '<=', '>', '>='], t;
        do { t = 'x ' + ops[Math.floor(Math.random() * 4)] + ' ' + (Math.floor(Math.random() * 17) - 8); } while (t === avoid);
        return t;
      };
      var buildPanel = function() {
        var b = d.build || {};
        var target = b.target && parseIneq(b.target) ? b.target : 'x >= -3', tp = parseIneq(target);
        var R = { min: -10, max: 10 };
        var ptQ = b.pt === '' || b.pt == null ? null : qParse(String(b.pt));
        var ptVal = ptQ ? qVal(ptQ) : null;
        var setB = function(patch) {
          mergeIneq(function(cur) { return { build: Object.assign({}, cur.build || {}, { target: target, checked: false }, patch) }; });
        };
        var wantRight = tp.op.charAt(0) === '>', wantClosed = tp.op.indexOf('=') >= 0, sym = iqOpText(tp.op), bTxt = endText(tp.val, tp.valText);
        var tPretty = tp.v + ' ' + sym + ' ' + bTxt;
        var okPt = ptQ != null && Math.abs(ptVal - tp.val) < 1e-9, okDot = b.closed === wantClosed, okDir = b.dir === (wantRight ? 'right' : 'left');
        var pseudo = ptVal != null && b.dir ? { compound: false, v: 'x', op: (b.dir === 'right' ? '>' : '<') + (b.closed ? '=' : ''), val: ptVal } : null;
        var yourDesc = pseudo ? describeSet(pseudo) : ptVal != null ? iqFill(__alloT('stem.inequality.build_desc_point', 'A point at {p}, no shading yet.'), { p: iqNumFmt(ptVal) }) : __alloT('stem.inequality.build_desc_empty', 'Nothing placed yet.');
        var rows = [
          okPt ? [true, iqFill(__alloT('stem.inequality.build_pt_ok', 'The boundary point is at {b}.'), { b: bTxt })]
            : ptQ == null ? [null, __alloT('stem.inequality.build_pt_missing', 'Place the boundary point: type it, use the arrow keys in the box, or click the number line.')]
            : [false, iqFill(__alloT('stem.inequality.build_pt_wrong', 'You placed the point at {p}. The boundary is the number that {v} is compared with in {t}.'), { p: iqNumFmt(ptVal), v: tp.v, t: tPretty })],
          b.closed == null ? [null, __alloT('stem.inequality.build_dot_missing', 'Choose an open or a closed circle.')]
            : okDot ? [true, iqFill(wantClosed ? __alloT('stem.inequality.build_dot_closed_ok', '{sym} includes {b} itself, so the circle is closed.') : __alloT('stem.inequality.build_dot_open_ok', '{sym} leaves {b} itself out, so the circle is open.'), { sym: sym, b: bTxt })]
            : [false, iqFill(wantClosed ? __alloT('stem.inequality.build_dot_closed_wrong', 'The "or equal to" bar in {sym} means {b} itself is a solution: use a closed circle.') : __alloT('stem.inequality.build_dot_open_wrong', 'With {sym}, {b} itself is not a solution: use an open circle.'), { sym: sym, b: bTxt })],
          b.dir == null ? [null, __alloT('stem.inequality.build_dir_missing', 'Choose which way to shade.')]
            : [okDir, iqFill(wantRight ? __alloT('stem.inequality.build_dir_right', '{t} means numbers greater than {b}, and greater numbers lie to the right.') : __alloT('stem.inequality.build_dir_left', '{t} means numbers less than {b}, and smaller numbers lie to the left.'), { t: tPretty, b: bTxt })]
        ];
        var allOk = okPt && okDot && okDir;
        var check = function() {
          var credit = window.StemLab.grading.creditOnce(d.builtSeen, target);
          mergeIneq(function(cur) {
            var next = { build: Object.assign({}, cur.build || {}, { target: target, checked: true }) };
            if (allOk) {
              next.builtGraph = true; next.studentGraphed = true; next.expr = target; next.builtSeen = credit.seen;
              next.range = iqFitRange(tp, cur.range || { min: -10, max: 10 });
            }
            return next;
          });
          if (allOk && credit.isNew && typeof awardXP === 'function') awardXP('inequality', 5, 'Built an inequality graph');
          iqAnnounce(allOk ? iqFill(__alloT('stem.inequality.build_done', 'You built the graph of {t}. It now shows in Explore too.'), { t: tPretty })
            : rows.filter(function(r) { return r[0] !== true; }).map(function(r) { return r[1]; }).join(' '));
        };
        var nudge = function(delta) { setB({ pt: iqNumFmt(Math.max(R.min, Math.min(R.max, (ptVal == null ? 0 : ptVal) + delta))) }); };
        return h('div', { className: 'mb-3 rounded-xl border border-fuchsia-300 bg-white p-3 space-y-2', 'data-inequality-build': 'true' },
          h('p', { className: 'text-sm font-bold text-fuchsia-800' }, __alloT('stem.inequality.build_title', 'Build the graph of:') + ' ', h('span', { className: 'font-mono' }, tPretty)),
          renderNumberLine(pseudo, R, { id: 'build', dashedDot: b.closed == null, dotOnly: !pseudo && ptVal != null ? { x: ptVal, closed: b.closed } : null,
            label: iqFill(__alloT('stem.inequality.build_svg_label', 'Your graph so far: {desc}'), { desc: yourDesc }),
            onPick: function(x) { setB({ pt: String(x) }); } }),
          h('div', { className: 'flex flex-wrap items-end gap-3' },
            h('div', null,
              h('label', { htmlFor: 'iq-build-pt', className: 'block text-[0.6875rem] font-bold text-slate-700' }, __alloT('stem.inequality.build_point_label', 'Boundary point')),
              h('div', { className: 'flex items-center gap-1' },
                h('button', { type: 'button', onClick: function() { nudge(-1); }, className: pressCls(false), 'aria-label': __alloT('stem.inequality.build_left_aria', 'Move the point 1 to the left') }, '◀'),
                h('input', { id: 'iq-build-pt', type: 'number', step: 0.5, min: R.min, max: R.max, value: b.pt == null ? '' : b.pt, style: fieldStyle,
                  onChange: function(e) { setB({ pt: e.target.value }); },
                  className: 'w-20 px-2 py-1 border-2 border-fuchsia-600 rounded-lg font-mono text-sm text-center' }),
                h('button', { type: 'button', onClick: function() { nudge(1); }, className: pressCls(false), 'aria-label': __alloT('stem.inequality.build_right_aria', 'Move the point 1 to the right') }, '▶'))),
            h('div', { role: 'group', 'aria-label': __alloT('stem.inequality.build_circle_group', 'Circle') },
              h('p', { className: 'text-[0.6875rem] font-bold text-slate-700', 'aria-hidden': 'true' }, __alloT('stem.inequality.build_circle_group', 'Circle')),
              h('div', { className: 'flex gap-1' },
                h('button', { type: 'button', 'aria-pressed': b.closed === false, className: pressCls(b.closed === false), onClick: function() { setB({ closed: false }); } }, '○ ' + __alloT('stem.inequality.build_open', 'Open')),
                h('button', { type: 'button', 'aria-pressed': b.closed === true, className: pressCls(b.closed === true), onClick: function() { setB({ closed: true }); } }, '● ' + __alloT('stem.inequality.build_closed', 'Closed')))),
            h('div', { role: 'group', 'aria-label': __alloT('stem.inequality.build_shade_group', 'Shade') },
              h('p', { className: 'text-[0.6875rem] font-bold text-slate-700', 'aria-hidden': 'true' }, __alloT('stem.inequality.build_shade_group', 'Shade')),
              h('div', { className: 'flex gap-1' },
                h('button', { type: 'button', 'aria-pressed': b.dir === 'left', className: pressCls(b.dir === 'left'), onClick: function() { setB({ dir: 'left' }); } }, '◀ ' + __alloT('stem.inequality.build_shade_left', 'Left')),
                h('button', { type: 'button', 'aria-pressed': b.dir === 'right', className: pressCls(b.dir === 'right'), onClick: function() { setB({ dir: 'right' }); } }, __alloT('stem.inequality.build_shade_right', 'Right') + ' ▶')))),
          h('div', { className: 'flex flex-wrap gap-2' },
            h('button', { type: 'button', onClick: check, className: 'px-3 py-1.5 rounded-lg text-xs font-bold bg-fuchsia-700 text-white' }, '✔ ' + __alloT('stem.inequality.build_check', 'Check my graph')),
            h('button', { type: 'button', onClick: function() { upd('build', { target: randomSimple(target) }); }, className: pressCls(false) }, '🎲 ' + __alloT('stem.inequality.build_new', 'New target'))),
          b.checked && h('div', { role: 'status' }, h('ul', { className: 'space-y-1 text-xs', 'data-inequality-build-feedback': 'true' },
            rows.map(function(r, i) {
              return h('li', { key: i, style: { color: r[0] === true ? okText : r[0] === false ? badText : undefined }, className: r[0] == null ? 'text-slate-700' : 'font-semibold' },
                (r[0] === true ? '✓ ' : r[0] === false ? '✗ ' : '• ') + r[1]);
            }),
            allOk && h('li', { className: 'font-bold', style: { color: okText } }, '🎉 ' + iqFill(__alloT('stem.inequality.build_done', 'You built the graph of {t}. It now shows in Explore too.'), { t: tPretty })))));
      };

      // ── Read a graph: graph to symbols ──
      var makeReadItem = function(avoid) {
        var item;
        do {
          if (Math.random() < 0.6) {
            var n = Math.floor(Math.random() * 17) - 8, dir = Math.random() < 0.5 ? '<' : '>';
            var opts = [dir, dir + '=', iqFlipOp(dir), iqFlipOp(dir) + '='].map(function(op) { return 'x ' + op + ' ' + n; });
            item = { target: opts[Math.floor(Math.random() * 2)], opts: opts };
          } else {
            var lo = Math.floor(Math.random() * 11) - 8, hi = lo + 2 + Math.floor(Math.random() * 5);
            var combos = [['<', '<'], ['<=', '<='], ['<', '<='], ['<=', '<']].map(function(c) { return lo + ' ' + c[0] + ' x ' + c[1] + ' ' + hi; });
            item = { target: combos[Math.floor(Math.random() * 4)], opts: combos };
          }
        } while (avoid && item.target === avoid);
        var shuffled = item.opts.slice();
        for (var i = shuffled.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = t; }
        return { target: item.target, opts: shuffled, answered: false, typed: '' };
      };
      var prettyOp = function(s) { return String(s).replace(/>=/g, '≥').replace(/<=/g, '≤'); };
      var readPanel = function() {
        var rg = d.readG && d.readG.target && parseIneq(d.readG.target) ? d.readG : { target: 'x < 2', opts: ['x < 2', 'x <= 2', 'x > 2', 'x >= 2'], answered: false, typed: '' };
        var tp = parseIneq(rg.target), R = iqFitRange(tp, { min: -10, max: 10 });
        var grade = function(answer, typed) {
          var parsed = parseIneq(answer);
          var correct = !!parsed && iqSameSet(iqIntervals(parsed), iqIntervals(tp));
          var fb = correct ? '' : !parsed ? __alloT('stem.inequality.read_type_hint', 'Type an inequality such as x > 3 or -2 < x ≤ 5.')
            : iqFill(__alloT('stem.inequality.read_yours_shows', 'Your inequality would show: {desc}'), { desc: describeSet(parsed) }) + ' ' + diagnoseQuizError(String(answer), rg.target);
          var credit = correct ? window.StemLab.grading.creditOnce(d.readSeen, rg.target) : null;
          mergeIneq(function(cur) {
            var next = { readG: Object.assign({}, rg, { answered: true, chosen: answer, correct: correct, fb: fb, typed: typed ? answer : (rg.typed || '') }) };
            if (credit && credit.isNew) { next.readSeen = credit.seen; next.readCorrect = (cur.readCorrect || 0) + 1; }
            return next;
          });
          if (credit && credit.isNew && typeof awardXP === 'function') awardXP('inequality', 3, 'Read an inequality graph');
          playSound(correct ? 'correct' : 'wrong');
          iqAnnounce(correct ? __alloT('stem.inequality.correct_excl', 'Correct!') : __alloT('stem.inequality.read_not_quite', 'Not quite.') + ' ' + fb);
        };
        return h('div', { className: 'mb-3 rounded-xl border border-fuchsia-300 bg-white p-3 space-y-2', 'data-inequality-readgraph': 'true' },
          h('p', { className: 'text-sm font-bold text-fuchsia-800' }, __alloT('stem.inequality.read_question', 'Which inequality does this graph show?')),
          renderNumberLine(tp, R, { id: 'read', label: iqFill(__alloT('stem.inequality.read_svg_label', 'Graph to read: {desc}'), { desc: describeSet(tp) }) }),
          h('div', { className: 'grid grid-cols-2 gap-2' },
            rg.opts.map(function(opt) {
              var chosen = rg.answered && rg.chosen === opt;
              return h('button', { key: opt, type: 'button', disabled: !!(rg.answered && rg.correct), onClick: function() { grade(opt, false); },
                'aria-pressed': chosen,
                className: 'px-3 py-2 rounded-lg text-xs font-bold font-mono border-2 bg-white text-slate-700 border-fuchsia-600 hover:bg-fuchsia-50' }, prettyOp(opt));
            })),
          h('div', { className: 'flex flex-wrap items-center gap-2' },
            h('label', { htmlFor: 'iq-read-typed', className: 'text-[0.6875rem] font-bold text-slate-700' }, __alloT('stem.inequality.read_or_type', 'Or type it:')),
            h('input', { id: 'iq-read-typed', type: 'text', value: rg.typed || '', style: fieldStyle, placeholder: 'x ≤ 4',
              onChange: function(e) { var val = e.target.value; mergeIneq(function(cur) { return { readG: Object.assign({}, cur.readG && cur.readG.target ? cur.readG : rg, { typed: val }) }; }); },
              onKeyDown: function(e) { if (e.key === 'Enter' && String(rg.typed || '').trim()) grade(String(rg.typed).trim(), true); },
              className: 'w-36 px-2 py-1 border-2 border-fuchsia-600 rounded-lg font-mono text-sm text-center' }),
            h('button', { type: 'button', onClick: function() { if (String(rg.typed || '').trim()) grade(String(rg.typed).trim(), true); }, className: pressCls(false) }, __alloT('stem.inequality.read_check', 'Check')),
            h('button', { type: 'button', onClick: function() { upd('readG', makeReadItem(rg.target)); }, className: pressCls(false) }, '🎲 ' + __alloT('stem.inequality.read_new', 'New graph'))),
          rg.answered && h('div', { role: 'status', className: 'text-xs rounded-lg p-2 border', style: { borderColor: rg.correct ? okText : badText, color: rg.correct ? okText : badText } },
            rg.correct
              ? '✅ ' + __alloT('stem.inequality.correct_excl', 'Correct!') + ' ' + prettyOp(rg.chosen)
              : '❌ ' + __alloT('stem.inequality.read_not_quite', 'Not quite.') + ' ' + rg.fb));
      };

      // ── Explore, 2D: one inequality ──
      var ineq2d = graphMode === '2d' ? parse2D(d.expr) : null;
      var tp2d = ineq2d ? pickTestPoint(ineq2d) : null;
      var test2d = ineq2d && tp2d ? describeTest2D(ineq2d, tp2d) : null;
      var read2D = ineq2d ? describeLine2D(ineq2d) + (test2d ? ' ' + test2d.text : '') : '';
      var singlePlane = function() {
        return h('div', null,
          render2DPlane(ineq2d ? [ineq2d] : [], {
            id: 'single',
            label: ineq2d ? iqFill(__alloT('stem.inequality.aria_plane_described', 'Coordinate plane graph of {expr}. {desc}'), { expr: d.expr, desc: read2D }) : __alloT('stem.inequality.a11y_2d_inequality_graph', '2D inequality graph'),
            points: test2d ? [{ x: tp2d.x, y: tp2d.y, ok: test2d.holds, label: pt2(tp2d.x, tp2d.y) + (test2d.holds ? ' ✓' : ' ✗') }] : []
          }),
          readBlock(read2D, 'plane'));
      };

      // ── Systems: feasible region, corners, objective, point tests ──
      var SYS_DEFAULT = ['2x + y <= 8', 'x >= 0', 'y >= 1'];
      var systemPanel = function() {
        var sys = d.sys || {};
        var srcs = (Array.isArray(sys.cons) ? sys.cons : SYS_DEFAULT).slice(0, 3).map(function(s) { return s == null ? '' : String(s); });
        while (srcs.length < 3) srcs.push('');
        var parsed = srcs.map(function(s) { return s.trim() ? parse2D(s) : null; });
        var cons = [], labels = [];
        parsed.forEach(function(k, i) { if (k) { cons.push(k); labels.push(CIRCLED[i]); } });
        var objSrc = sys.obj != null ? String(sys.obj) : 'P = 3x + 2y';
        var obj = objSrc.trim() ? iqObjective(objSrc) : null;
        var corners = cons.length >= 2 ? iqCorners(cons) : [];
        var BIG = { xMin: -1e4, xMax: 1e4, yMin: -1e4, yMax: 1e4 };
        var emptyRegion = cons.length > 0 && iqRegion(cons, BIG).length < 3;
        var unbounded = cons.length > 0 && !emptyRegion && iqUnbounded(cons);
        var setSys = function(patch) { mergeIneq(function(cur) { return { sys: Object.assign({ cons: SYS_DEFAULT.slice(), obj: 'P = 3x + 2y' }, cur.sys || {}, patch) }; }); };
        var cornerName = function(c, i) { return String.fromCharCode(65 + i) + ' ' + pt2(qText(c.qx), qText(c.qy)); };
        // One tested point against every constraint, exactly.
        var evalPoint = function(xs, ys) {
          var qx = qParse(xs), qy = qParse(ys);
          if (!qx || !qy) return null;
          var at = { x: qx, y: qy }, fails = [];
          var lines = cons.map(function(k, i) {
            var l = iqLinEval(k.lhs, at), r = iqLinEval(k.rhs, at), ok = iqHolds(qCmp(l, r), k.rel);
            if (!ok) fails.push(labels[i]);
            return labels[i] + ' ' + qText(l) + ' ' + iqOpText(k.rel) + ' ' + qText(r) + (ok ? ' ✓' : ' ✗');
          });
          return { x: qVal(qx), y: qVal(qy), name: pt2(qText(qx), qText(qy)), ok: cons.length > 0 && !fails.length, lines: lines, fails: fails };
        };
        var tested = (Array.isArray(sys.pts) ? sys.pts : []).map(function(p) { return p && evalPoint(String(p.x), String(p.y)); }).filter(Boolean);
        var resultText = function(r) {
          return r.name + ': ' + r.lines.join(', ') + ' → ' + (r.ok ? __alloT('stem.inequality.sys_point_inside', 'inside the feasible region')
            : iqFill(__alloT('stem.inequality.sys_point_outside', 'outside: it breaks {list}'), { list: r.fails.join(' ') }));
        };
        var testPoint = function(xs, ys) {
          var r = cons.length ? evalPoint(String(xs).trim(), String(ys).trim()) : null;
          if (!r) { iqAnnounce(__alloT('stem.inequality.sys_point_invalid', 'Enter two numbers for x and y, such as 2 and 3.')); setSys({ ptError: true }); return; }
          setSys({ ptError: false, pts: [{ x: String(xs).trim(), y: String(ys).trim() }].concat((Array.isArray(sys.pts) ? sys.pts : []).filter(function(p) { return !(p && String(p.x) === String(xs).trim() && String(p.y) === String(ys).trim()); })).slice(0, 6) });
          iqAnnounce(resultText(r));
        };
        var regionText = !cons.length ? __alloT('stem.inequality.sys_need_constraint', 'Enter at least one constraint.')
          : emptyRegion ? __alloT('stem.inequality.sys_region_empty', 'No point satisfies every constraint: the feasible region is empty.')
          : unbounded ? __alloT('stem.inequality.sys_region_unbounded', 'The feasible region is shaded. It is unbounded: it keeps going past the edge of the graph.')
          : __alloT('stem.inequality.sys_region_bounded', 'The feasible region is shaded. It is bounded: a closed shape with corners.');
        var cornerLines = corners.map(function(c, i) {
          var off = c.x < gRange.xMin || c.x > gRange.xMax || c.y < gRange.yMin || c.y > gRange.yMax;
          return cornerName(c, i) + (c.strict ? ' — ' + __alloT('stem.inequality.sys_corner_strict', 'on a dashed boundary, so it is a limit of the region, not inside it') : '') + (off ? ' (' + __alloT('stem.inequality.sys_corner_off', 'off the graph') + ')' : '');
        });
        var objRows = [], best = null, worst = null;
        if (obj && corners.length) {
          corners.forEach(function(c, i) {
            var val = iqLinEval(obj.form, { x: c.qx, y: c.qy });
            objRows.push({ i: i, c: c, q: val });
            if (!c.strict) {
              if (!best || qCmp(val, best.q) > 0) best = { i: i, c: c, q: val };
              if (!worst || qCmp(val, worst.q) < 0) worst = { i: i, c: c, q: val };
            }
          });
        }
        var svgLabel = iqFill(__alloT('stem.inequality.sys_svg_label', 'Coordinate plane with {n} constraints. {region}'), { n: cons.length, region: regionText })
          + (cornerLines.length ? ' ' + __alloT('stem.inequality.sys_corners', 'Corner points') + ': ' + cornerLines.join('; ') + '.' : '');
        var px = sys.px == null ? '' : String(sys.px), py = sys.py == null ? '' : String(sys.py);
        return h('div', { className: 'mb-3 space-y-2', 'data-inequality-system': 'true' },
          h('p', { className: 'text-xs text-slate-700' }, __alloT('stem.inequality.sys_intro', 'Enter 2 or 3 constraints. Standard form (2x + y ≤ 8) and vertical lines (x ≥ 0) both work. The region where every constraint is true is shaded.')),
          h('div', { className: 'grid gap-2 sm:grid-cols-3' },
            srcs.map(function(s, i) {
              var bad = s.trim() && !parsed[i];
              return h('div', { key: i },
                h('label', { htmlFor: 'iq-sys-' + i, className: 'block text-[0.6875rem] font-bold', style: { color: isContrast ? 'var(--allo-stem-text,#ffff00)' : i === 0 ? '#a21caf' : i === 1 ? '#0369a1' : '#92400e' } },
                  CIRCLED[i] + ' ' + (i === 2 ? __alloT('stem.inequality.sys_constraint_optional', 'Constraint 3 (optional)') : iqFill(__alloT('stem.inequality.sys_constraint_n', 'Constraint {n}'), { n: i + 1 }))),
                h('input', { id: 'iq-sys-' + i, type: 'text', value: s, style: fieldStyle, 'aria-invalid': bad ? 'true' : undefined, 'aria-describedby': bad ? 'iq-sys-err-' + i : undefined,
                  onChange: function(e) { var next = srcs.slice(); next[i] = e.target.value; setSys({ cons: next }); },
                  className: 'w-full px-2 py-1 border-2 border-fuchsia-600 rounded-lg font-mono text-sm' }),
                bad && h('p', { id: 'iq-sys-err-' + i, className: 'text-[0.6875rem] font-semibold', style: { color: badText } }, __alloT('stem.inequality.sys_constraint_bad', 'Not a linear inequality in x and y.')));
            })),
          h('div', null,
            h('label', { htmlFor: 'iq-sys-obj', className: 'block text-[0.6875rem] font-bold text-slate-700' }, __alloT('stem.inequality.sys_objective_label', 'Objective (optional), such as P = 3x + 2y')),
            h('input', { id: 'iq-sys-obj', type: 'text', value: objSrc, style: fieldStyle, onChange: function(e) { setSys({ obj: e.target.value }); },
              className: 'w-full max-w-xs px-2 py-1 border-2 border-fuchsia-600 rounded-lg font-mono text-sm' })),
          render2DPlane(cons, { id: 'system', label: svgLabel, labels: labels, corners: corners,
            points: tested.map(function(r) { return { x: r.x, y: r.y, ok: r.ok }; }),
            onPick: function(x, y) { testPoint(String(x), String(y)); } }),
          h('div', { className: 'flex flex-wrap items-end gap-2' },
            h('div', null,
              h('label', { htmlFor: 'iq-sys-px', className: 'block text-[0.6875rem] font-bold text-slate-700' }, 'x'),
              h('input', { id: 'iq-sys-px', type: 'text', inputMode: 'decimal', value: px, style: fieldStyle, onChange: function(e) { setSys({ px: e.target.value }); },
                onKeyDown: function(e) { if (e.key === 'Enter') testPoint(px, py); }, className: 'w-20 px-2 py-1 border-2 border-fuchsia-600 rounded-lg font-mono text-sm text-center' })),
            h('div', null,
              h('label', { htmlFor: 'iq-sys-py', className: 'block text-[0.6875rem] font-bold text-slate-700' }, 'y'),
              h('input', { id: 'iq-sys-py', type: 'text', inputMode: 'decimal', value: py, style: fieldStyle, onChange: function(e) { setSys({ py: e.target.value }); },
                onKeyDown: function(e) { if (e.key === 'Enter') testPoint(px, py); }, className: 'w-20 px-2 py-1 border-2 border-fuchsia-600 rounded-lg font-mono text-sm text-center' })),
            h('button', { type: 'button', onClick: function() { testPoint(px, py); }, className: 'px-3 py-1.5 rounded-lg text-xs font-bold bg-fuchsia-700 text-white' }, __alloT('stem.inequality.sys_test_point', 'Test this point')),
            tested.length > 0 && h('button', { type: 'button', onClick: function() { setSys({ pts: [] }); }, className: pressCls(false) }, __alloT('stem.inequality.sys_clear_points', 'Clear tested points'))),
          h('p', { className: 'text-[0.6875rem] italic text-slate-600' }, __alloT('stem.inequality.sys_click_hint', 'Or click a point on the graph to test it.')),
          sys.ptError && h('p', { className: 'text-xs font-semibold', style: { color: badText } }, __alloT('stem.inequality.sys_point_invalid', 'Enter two numbers for x and y, such as 2 and 3.')),
          h('div', { className: 'rounded-lg border border-fuchsia-300 bg-fuchsia-50 p-2 text-xs text-fuchsia-900 space-y-1.5', 'data-inequality-system-text': 'true' },
            h('p', { className: 'font-bold' }, __alloT('stem.inequality.sys_constraints', 'Constraints')),
            cons.length ? h('ul', { className: 'list-none space-y-0.5' }, cons.map(function(k, i) { return h('li', { key: i }, labels[i] + ' ' + prettyOp(srcs[parsed.indexOf(k)]) + ': ' + describeLine2D(k)); })) : null,
            h('p', null, regionText),
            cons.length >= 2 && h('p', { className: 'font-bold' }, __alloT('stem.inequality.sys_corners', 'Corner points')),
            cons.length >= 2 && (cornerLines.length ? h('ul', { className: 'list-none space-y-0.5 font-mono' }, cornerLines.map(function(t, i) { return h('li', { key: i }, t); }))
              : h('p', null, __alloT('stem.inequality.sys_no_corners', 'No corner points: the boundary lines do not meet inside the region.'))),
            cons.length < 2 && h('p', null, __alloT('stem.inequality.sys_add_second', 'Add a second constraint to see corner points.')),
            objSrc.trim() && !obj && h('p', { style: { color: badText } }, __alloT('stem.inequality.sys_objective_bad', 'The objective must be linear in x and y, such as P = 3x + 2y.')),
            obj && objRows.length > 0 && h('div', null,
              h('p', { className: 'font-bold' }, iqFill(__alloT('stem.inequality.sys_objective_values', '{name} at each corner'), { name: obj.name })),
              h('ul', { className: 'list-none space-y-0.5 font-mono' }, objRows.map(function(r) {
                return h('li', { key: r.i }, cornerName(r.c, r.i) + ': ' + obj.name + ' = ' + qText(r.q) + (r.c.strict ? ' *' : ''));
              })),
              best && h('p', { 'data-inequality-objective-max': qText(best.q) }, iqFill(__alloT('stem.inequality.sys_objective_max', 'Largest: {name} = {v} at {pt}.'), { name: obj.name, v: qText(best.q), pt: cornerName(best.c, best.i) })),
              worst && h('p', { 'data-inequality-objective-min': qText(worst.q) }, iqFill(__alloT('stem.inequality.sys_objective_min', 'Smallest: {name} = {v} at {pt}.'), { name: obj.name, v: qText(worst.q), pt: cornerName(worst.c, worst.i) })),
              unbounded && h('p', { className: 'italic' }, iqFill(__alloT('stem.inequality.sys_objective_unbounded', 'The region is unbounded, so {name} may have no largest or smallest value; the corner values are listed anyway.'), { name: obj.name })),
              objRows.some(function(r) { return r.c.strict; }) && h('p', { className: 'italic' }, '* ' + __alloT('stem.inequality.sys_objective_strict', 'A corner on a dashed boundary is not in the region, so it is left out of largest and smallest.'))),
            tested.length > 0 && h('p', { className: 'font-bold' }, __alloT('stem.inequality.sys_tested', 'Tested points')),
            tested.length > 0 && h('ul', { className: 'list-none space-y-0.5 font-mono', 'data-inequality-tested': 'true' }, tested.map(function(r, i) {
              return h('li', { key: i, style: { color: r.ok ? okText : badText } }, (r.ok ? '✓ ' : '✗ ') + resultText(r));
            }))));
      };

      // ── Flip Lab: predict, then check ──
      // Replaces the coef·x < bound sliders, which could never show a flip. Keeps the
      // _ineqHunt state key and its hypothesis / explanation notebook.
      var flipLab = function() {
        var iq = d._ineqHunt || {};
        var numOr = function(x, dflt) { return typeof x === 'number' && isFinite(x) ? x : dflt; };
        var mode = iq.mode === 'set' ? 'set' : 'numbers';
        var fa = numOr(iq.a, 2), fb = numOr(iq.b, 5), k = numOr(iq.k, -2);
        var op = ['add', 'sub', 'mul', 'div'].indexOf(iq.op) >= 0 ? iq.op : 'mul';
        var setOp = ['<', '<=', '>', '>='].indexOf(iq.setOp) >= 0 ? iq.setOp : '>', setV = numOr(iq.setV, 2);
        var pred = iq.pred === 'stays' || iq.pred === 'flips' ? iq.pred : null, checked = !!iq.checked && !!pred;
        // Changing the experiment clears the prediction; notebook fields keep everything.
        var setIQ = function(patch, keep) {
          mergeIneq(function(cur) { return { _ineqHunt: Object.assign({}, cur._ineqHunt || {}, keep ? {} : { pred: null, checked: false }, patch) }; });
        };
        var qk = qMake(k), OPS = { add: '+', sub: '−', mul: '×', div: '÷' };
        var kTxt = k < 0 ? '(' + k + ')' : String(k), act = OPS[op] + ' ' + kTxt;
        var zeroCase = k === 0 && (op === 'mul' || op === 'div');
        var before = [], after = [], stmt0, stmt1 = '', actual = null, tooSame = false;
        if (mode === 'numbers') {
          var qa = qMake(fa), qb = qMake(fb), r0 = iqRelOf(qa, qb);
          tooSame = r0 === '=';
          stmt0 = fa + ' ' + r0 + ' ' + fb;
          var a2 = iqApply(qa, op, qk), b2 = iqApply(qb, op, qk);
          before = [{ v: fa, t: String(fa) }, { v: fb, t: String(fb) }];
          if (a2 && b2) {
            after = [{ v: qVal(a2), t: qText(a2) }, { v: qVal(b2), t: qText(b2) }];
            var r1 = iqRelOf(a2, b2);
            stmt1 = qText(a2) + ' ' + r1 + ' ' + qText(b2);
            actual = tooSame ? null : r1 === '=' ? 'neither' : r1 === r0 ? 'stays' : 'flips';
          }
        } else {
          var qv = qMake(setV), up = setOp.charAt(0) === '>', step = up ? 1 : -1;
          var samples = setOp.indexOf('=') >= 0 ? [setV, setV + step, setV + 2 * step] : [setV + step, setV + 2 * step, setV + 3 * step];
          stmt0 = 'x ' + iqOpText(setOp) + ' ' + setV;
          before = [{ v: setV, t: String(setV), boundary: true }].concat(samples.filter(function(s) { return s !== setV; }).map(function(s) { return { v: s, t: String(s) }; }));
          var bv2 = iqApply(qv, op, qk), s2 = iqApply(qMake(setV + step), op, qk);
          if (bv2 && s2) {
            after = before.map(function(p) { var q = iqApply(qMake(p.v), op, qk); return { v: qVal(q), t: qText(q), boundary: p.boundary }; });
            var rs = iqRelOf(s2, bv2);
            actual = rs === '=' ? 'neither' : (rs === '>') === up ? 'stays' : 'flips';
            var exprT = op === 'add' ? 'x + ' + kTxt : op === 'sub' ? 'x − ' + kTxt : op === 'mul' ? (k === 1 ? 'x' : k === -1 ? '-x' : k + 'x') : 'x ÷ ' + kTxt;
            stmt1 = actual === 'neither' ? '0 = 0' : exprT + ' ' + iqOpText(actual === 'stays' ? setOp : iqFlipOp(setOp)) + ' ' + qText(bv2);
          }
        }
        var log = Array.isArray(iq.log) ? iq.log.filter(function(e) { return e && typeof e === 'object' && e.actual; }) : [];
        var hits = log.filter(function(e) { return e.pred === e.actual; }).length;
        var check = function() {
          if (!pred || !actual || actual === 'neither') return;
          var entry = { mode: mode, op: op, k: k, pred: pred, actual: actual };
          setIQ({ checked: true, pred: pred, log: log.concat([entry]).slice(-8) }, true);
          playSound(pred === actual ? 'correct' : 'wrong');
          iqAnnounce(iqFill(__alloT('stem.inequality.flip_result', '{s0} became {s1}: the sign {did}.'), { s0: stmt0, s1: stmt1, did: actual === 'stays' ? __alloT('stem.inequality.flip_did_stay', 'stayed the same') : __alloT('stem.inequality.flip_did_flip', 'flipped') })
            + ' ' + (pred === actual ? __alloT('stem.inequality.flip_pred_right', 'Your prediction matched.') : __alloT('stem.inequality.flip_pred_wrong', 'Your prediction did not match.')));
        };
        // Number line: before row on top, after row below; after points slide to their new places.
        var all = before.concat(after).map(function(p) { return p.v; }).concat([0]);
        var lo = Math.floor(Math.min.apply(null, all)) - 1, hi = Math.ceil(Math.max.apply(null, all)) + 1;
        if (hi - lo < 10) { var grow = Math.ceil((10 - (hi - lo)) / 2); lo -= grow; hi += grow; }
        var FW = 420, FH = 130, fp = 35, fsx = function(x) { return fp + (x - lo) / (hi - lo) * (FW - 2 * fp); };
        var tStep = Math.max(1, Math.ceil((hi - lo) / 20)), fk = [];
        var lineInk = isDark ? '#94a3b8' : '#64748b', txtInk = isDark ? '#e2e8f0' : '#1e293b';
        [40, 95].forEach(function(y, row) {
          fk.push(h('line', { key: 'ax' + row, x1: fp, y1: y, x2: FW - fp, y2: y, stroke: '#94a3b8', strokeWidth: 1.5 }));
          for (var t = Math.ceil(lo / tStep) * tStep; t <= hi; t += tStep) fk.push(h('line', { key: 'tk' + row + '_' + t, x1: fsx(t), y1: y - 4, x2: fsx(t), y2: y + 4, stroke: t === 0 ? txtInk : '#94a3b8', strokeWidth: t === 0 ? 2 : 1 }));
          fk.push(h('text', { key: 'rl' + row, x: 4, y: y - 8, fill: txtInk, style: { fontSize: '9px', fontWeight: 'bold' } }, row ? __alloT('stem.inequality.flip_after', 'After') : __alloT('stem.inequality.flip_before', 'Before')));
        });
        for (var t0 = Math.ceil(lo / tStep) * tStep; t0 <= hi; t0 += tStep) if (t0 % (tStep * 2) === 0 || t0 === 0) fk.push(h('text', { key: 'tn' + t0, x: fsx(t0), y: 122, textAnchor: 'middle', fill: lineInk, style: { fontSize: '9px' } }, t0));
        var mirror = checked && (op === 'mul' || op === 'div') && k < 0;
        if (mirror) {
          fk.push(h('line', { key: 'mirror', x1: fsx(0), y1: 22, x2: fsx(0), y2: 108, stroke: '#0284c7', strokeWidth: 1.5, strokeDasharray: '4,3' }));
          fk.push(h('text', { key: 'mirrorT', x: fsx(0) + 4, y: 70, fill: isDark ? '#7dd3fc' : '#0369a1', style: { fontSize: '9px', fontWeight: 'bold' } }, __alloT('stem.inequality.flip_mirror', 'mirror at 0')));
        }
        before.forEach(function(p, i) {
          fk.push(h('circle', { key: 'b' + i, cx: fsx(p.v), cy: 40, r: p.boundary ? 6 : 5, fill: p.boundary && setOp.indexOf('=') < 0 ? (isDark ? '#0f172a' : '#ffffff') : '#d946ef', stroke: '#d946ef', strokeWidth: 2 }));
          fk.push(h('text', { key: 'bt' + i, x: fsx(p.v), y: 28, textAnchor: 'middle', fill: isDark ? '#f0abfc' : '#a21caf', style: { fontSize: '9px', fontWeight: 'bold' } }, p.t));
        });
        after.forEach(function(p, i) {
          var from = before[i] ? fsx(before[i].v) : fsx(p.v), dx = checked ? fsx(p.v) - from : 0;
          fk.push(h('g', { key: 'a' + i, style: { transform: 'translate(' + dx + 'px, 0px)', transition: reduceMotion ? 'none' : 'transform 0.6s ease', opacity: checked ? 1 : 0.35 } },
            h('circle', { cx: from, cy: 95, r: p.boundary ? 6 : 5, fill: p.boundary && setOp.indexOf('=') < 0 ? (isDark ? '#0f172a' : '#ffffff') : '#0284c7', stroke: '#0284c7', strokeWidth: 2 }),
            checked && h('text', { x: from, y: 112, textAnchor: 'middle', fill: isDark ? '#7dd3fc' : '#0369a1', style: { fontSize: '9px', fontWeight: 'bold' } }, p.t)));
        });
        var flipLabel = iqFill(__alloT('stem.inequality.flip_svg_label', 'Before: {s0}. After {act}: {s1}.'), { s0: stmt0, act: act, s1: checked ? stmt1 : __alloT('stem.inequality.flip_hidden', 'hidden until you check') });
        var sliders = mode === 'numbers'
          ? [{ id: 'a', l: __alloT('stem.inequality.flip_left_number', 'Left number'), v: fa, min: -10, max: 10 }, { id: 'b', l: __alloT('stem.inequality.flip_right_number', 'Right number'), v: fb, min: -10, max: 10 }, { id: 'k', l: 'k', v: k, min: -5, max: 5 }]
          : [{ id: 'setV', l: __alloT('stem.inequality.flip_boundary', 'Boundary'), v: setV, min: -6, max: 6 }, { id: 'k', l: 'k', v: k, min: -5, max: 5 }];
        var did = actual === 'stays' ? __alloT('stem.inequality.flip_did_stay', 'stayed the same') : __alloT('stem.inequality.flip_did_flip', 'flipped');
        return h('div', { className: 'mt-3 p-3 rounded-xl bg-white border border-fuchsia-300 space-y-2', 'data-inequality-fliplab': 'true' },
          h('h3', { className: 'text-sm font-black text-fuchsia-700' }, '🔁 ' + __alloT('stem.inequality.flip_title', 'Flip Lab: predict, then check')),
          h('p', { className: 'text-[0.6875rem] text-slate-700' }, __alloT('stem.inequality.flip_intro', 'Start with a true inequality. Do the same thing to both sides, predict whether the inequality sign stays or flips, then check on the number line.')),
          h('div', { role: 'group', 'aria-label': __alloT('stem.inequality.flip_start_with', 'Start with'), className: 'flex flex-wrap gap-1.5' },
            [['numbers', __alloT('stem.inequality.flip_mode_numbers', 'Two numbers')], ['set', __alloT('stem.inequality.flip_mode_set', 'A solution set')]].map(function(m) {
              return h('button', { key: m[0], type: 'button', 'aria-pressed': mode === m[0], className: pressCls(mode === m[0]), onClick: function() { setIQ({ mode: m[0] }); } }, m[1]);
            })),
          mode === 'set' && h('div', { role: 'group', 'aria-label': __alloT('stem.inequality.flip_set_sign', 'Sign of the solution set'), className: 'flex flex-wrap gap-1.5' },
            ['<', '<=', '>', '>='].map(function(s) {
              return h('button', { key: s, type: 'button', 'aria-pressed': setOp === s, 'aria-label': 'x ' + iqOpText(s), className: pressCls(setOp === s) + ' font-mono', onClick: function() { setIQ({ setOp: s }); } }, 'x ' + iqOpText(s));
            })),
          h('div', { className: 'grid grid-cols-2 gap-2 sm:grid-cols-3' },
            sliders.map(function(s) {
              return h('div', { key: s.id },
                h('label', { htmlFor: 'iq-flip-' + s.id, className: 'block text-[0.625rem] font-bold text-slate-700' }, s.l + ': ', h('span', { className: 'font-mono text-fuchsia-700' }, s.v)),
                h('input', { id: 'iq-flip-' + s.id, type: 'range', min: s.min, max: s.max, step: 1, value: s.v, className: 'w-full',
                  onChange: function(e) { var p = {}; p[s.id] = parseInt(e.target.value, 10); setIQ(p); } }));
            })),
          h('div', { role: 'group', 'aria-label': __alloT('stem.inequality.flip_operation', 'Do this to both sides'), className: 'flex flex-wrap gap-1.5' },
            ['add', 'sub', 'mul', 'div'].map(function(o2) {
              return h('button', { key: o2, type: 'button', 'aria-pressed': op === o2, className: pressCls(op === o2) + ' font-mono', onClick: function() { setIQ({ op: o2 }); } }, OPS[o2] + ' ' + kTxt);
            })),
          h('p', { className: 'text-sm font-bold font-mono text-slate-800' }, stmt0 + '   →   ' + __alloT('stem.inequality.flip_both_sides', 'both sides') + ' ' + act),
          tooSame && h('p', { className: 'text-xs font-semibold', style: { color: badText } }, __alloT('stem.inequality.flip_pick_different', 'Pick two different numbers so there is an inequality to test.')),
          zeroCase && h('div', { className: 'p-2 rounded border border-amber-300 bg-amber-50 text-xs text-amber-900', role: 'note', 'data-inequality-flip-zero': 'true' },
            op === 'mul'
              ? iqFill(__alloT('stem.inequality.flip_zero_mul', 'Multiplying by 0 turns both sides into 0, so the statement becomes {s1}. Neither "stays" nor "flips" fits: there is no inequality left. Talk it over: why do the rules for multiplying an inequality only talk about positive and negative numbers?'), { s1: mode === 'numbers' ? '0 ' + (stmt0.split(' ')[1] || '<') + ' 0' : '0 ' + iqOpText(setOp) + ' 0' })
              : __alloT('stem.inequality.flip_zero_div', 'Dividing by 0 is undefined, so there is no new statement to compare. Talk it over: why can a rule about dividing never include 0?')),
          !zeroCase && !tooSame && h('div', { className: 'flex flex-wrap items-center gap-1.5' },
            h('span', { className: 'text-xs font-bold text-slate-700', id: 'iq-flip-predict' }, __alloT('stem.inequality.flip_predict', 'Predict: the inequality sign will')),
            h('div', { role: 'group', 'aria-labelledby': 'iq-flip-predict', className: 'flex gap-1.5' },
              h('button', { type: 'button', 'aria-pressed': pred === 'stays', className: pressCls(pred === 'stays'), onClick: function() { setIQ({ pred: 'stays', checked: false }, true); } }, __alloT('stem.inequality.flip_pred_stays', 'stay the same')),
              h('button', { type: 'button', 'aria-pressed': pred === 'flips', className: pressCls(pred === 'flips'), onClick: function() { setIQ({ pred: 'flips', checked: false }, true); } }, __alloT('stem.inequality.flip_pred_flips', 'flip'))),
            h('button', { type: 'button', onClick: check, disabled: !pred, 'aria-disabled': !pred, className: 'px-3 py-1 rounded-lg text-xs font-bold ' + (pred ? 'bg-fuchsia-700 text-white' : 'bg-slate-200 text-slate-700') }, '✔ ' + __alloT('stem.inequality.flip_check', 'Check'))),
          h('svg', { viewBox: '0 0 ' + FW + ' ' + FH, role: 'img', 'aria-label': flipLabel, 'data-inequality-flip-line': 'true', className: 'w-full rounded-lg border ' + (isDark ? 'bg-slate-900 border-fuchsia-800' : 'bg-white border-fuchsia-200') }, fk),
          checked && actual && h('div', { role: 'status', className: 'p-2 rounded border text-xs', style: { borderColor: pred === actual ? okText : badText } },
            h('p', { className: 'font-bold font-mono text-slate-800', style: isContrast ? { color: 'var(--allo-stem-text,#ffff00)' } : undefined }, iqFill(__alloT('stem.inequality.flip_result', '{s0} became {s1}: the sign {did}.'), { s0: stmt0, s1: stmt1, did: did })),
            h('p', { style: { color: pred === actual ? okText : badText }, className: 'font-semibold' },
              pred === actual ? '✓ ' + __alloT('stem.inequality.flip_pred_right', 'Your prediction matched.') : '✗ ' + __alloT('stem.inequality.flip_pred_wrong', 'Your prediction did not match.'))),
          log.length > 0 && h('div', { className: 'text-[0.6875rem] text-slate-700' },
            h('p', { className: 'font-bold' }, iqFill(__alloT('stem.inequality.flip_evidence', 'Your trials ({hits} of {n} predictions matched)'), { hits: hits, n: log.length })),
            h('ul', { className: 'font-mono space-y-0.5' }, log.slice().reverse().map(function(e, i) {
              return h('li', { key: i }, (e.pred === e.actual ? '✓ ' : '✗ ') + OPS[e.op] + ' ' + (e.k < 0 ? '(' + e.k + ')' : e.k) + ': ' + (e.actual === 'stays' ? __alloT('stem.inequality.flip_did_stay', 'stayed the same') : __alloT('stem.inequality.flip_did_flip', 'flipped')));
            }))),
          h('textarea', { style: fieldStyle, value: iq.hypothesis || '', onChange: function(e) { setIQ({ hypothesis: e.target.value }, true); }, placeholder: __alloT('stem.inequality.hypothesis_placeholder', 'Hypothesis: When does a negative coefficient flip the inequality?'),
            'aria-label': __alloT('stem.inequality.hypothesis', 'Inequality relationship hypothesis'),
            className: 'w-full text-[0.6875rem] border border-slate-500 rounded p-1 font-mono leading-snug', rows: 2 }),
          !iq.stuckRevealed && h('button', { type: 'button', onClick: function() { setIQ({ stuckRevealed: true }, true); }, className: 'px-2 py-0.5 rounded bg-amber-50 text-[0.625rem] font-bold text-amber-800 border border-amber-300' }, '🤔 ' + __alloT('stem.inequality.stuck_show_prompts', 'Stuck — show open prompts')),
          iq.stuckRevealed && h('div', { className: 'p-2 rounded bg-amber-50 border border-amber-200 text-[0.625rem] text-slate-700' },
            h('ul', { className: 'list-disc pl-4 space-y-0.5' },
              h('li', null, __alloT('stem.inequality.flip_prompt_ops', 'Try the same k with + and with ×. Which operations ever change the sign?')),
              h('li', null, __alloT('stem.inequality.flip_prompt_sign', 'Try × 2 and then × (-2). What happens to the order of the points on the line?')),
              h('li', null, __alloT('stem.inequality.flip_prompt_mirror', 'Why would a mirror at 0 swap which point is on the left?')))),
          h('label', { className: 'flex items-center gap-1 text-[0.625rem] font-bold text-emerald-800 cursor-pointer' },
            h('input', { type: 'checkbox', checked: !!iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }, true); }, className: 'w-3 h-3' }),
            __alloT('stem.inequality.understand_explain', 'I understand — explain in own words')),
          iq.understood && h('textarea', { style: fieldStyle, value: iq.explanation || '', onChange: function(e) { setIQ({ explanation: e.target.value }, true); }, placeholder: __alloT('stem.inequality.explain_placeholder', 'Explain inequality test logic.'),
            'aria-label': __alloT('stem.inequality.explanation', 'Explain inequality test logic'),
            className: 'w-full text-[0.6875rem] border border-emerald-700 rounded p-1 font-mono leading-snug mt-1', rows: 3 }));
      };

      // ── Solver practice: the student picks each move, and says whether the sign flips ──
      var solverPractice = !!d.solverPractice;
      var orderMoves = function(list) {
        var score = function(s) { var x = 7; for (var i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) % 9973; return x; };
        return list.slice().sort(function(p, q) { return score(p) - score(q); });
      };
      var revealTo = function(idx) {
        var steps = solverSteps || [];
        var to = Math.min(steps.length, idx);
        upd({ solverRevealIdx: to, solverPick: null });
        iqAnnounce(steps.slice(solverRevealIdx, to).map(function(s) { return s.text + (s.work ? ' (' + s.work + ')' : ''); }).join('. '));
      };
      var practicePanel = function() {
        var steps = solverSteps || [], idx = solverRevealIdx, step = steps[idx];
        if (!solverPractice || !step || !step.move || !step.move.alts) return null;
        var mv = step.move;
        var pick = d.solverPick && d.solverPick.idx === idx ? d.solverPick : { idx: idx, tried: [], ok: false, flip: null };
        var tried = Array.isArray(pick.tried) ? pick.tried : [];
        var setPick = function(p) { upd('solverPick', Object.assign({}, pick, p)); };
        var expr = steps[idx - 1] ? steps[idx - 1].text : '';
        var flipMsg = function(choice) {
          return (choice === 'yes') === !!mv.flip
            ? iqFill(mv.flip ? __alloT('stem.inequality.solver_flip_right_neg', 'Right. {n} is negative, and multiplying or dividing by a negative number reverses the order of the two sides, so the sign flips.') : __alloT('stem.inequality.solver_flip_right_pos', 'Right. {n} is positive, so the order of the two sides stays the same.'), { n: mv.by })
            : iqFill(mv.flip ? __alloT('stem.inequality.solver_flip_wrong_neg', 'Not quite. {n} is negative. Check with numbers: 2 < 3, but 2 × (-1) = -2 and 3 × (-1) = -3, and -2 > -3. The sign flips.') : __alloT('stem.inequality.solver_flip_wrong_pos', 'Not quite. Only multiplying or dividing by a NEGATIVE number flips the sign. {n} is positive, so the sign stays.'), { n: mv.by });
        };
        var answerFlip = function(choice) { setPick({ flip: choice }); iqAnnounce(flipMsg(choice)); };
        var flipRight = pick.flip != null && (pick.flip === 'yes') === !!mv.flip;
        var flipText = pick.flip == null ? '' : flipMsg(pick.flip);
        return h('div', { className: 'mt-2 p-2 rounded-lg border border-teal-300 bg-white space-y-2', 'data-inequality-solver-practice': 'true' },
          !pick.ok && h('div', null,
            h('p', { className: 'text-xs font-bold text-teal-900', id: 'iq-move-q' }, iqFill(__alloT('stem.inequality.solver_pick_move', 'What is the next move for {expr}?'), { expr: expr })),
            h('div', { role: 'group', 'aria-labelledby': 'iq-move-q', className: 'mt-1 flex flex-col gap-1' },
              orderMoves([mv.label].concat(mv.alts)).map(function(lbl) {
                var wrong = tried.indexOf(lbl) >= 0;
                return h('button', { key: lbl, type: 'button', disabled: wrong, 'aria-disabled': wrong,
                  onClick: function() {
                    if (lbl === mv.label) {
                      if (mv.muldiv) { setPick({ ok: true }); iqAnnounce(__alloT('stem.inequality.solver_pick_right', 'Yes, that move works.')); }
                      else revealTo(idx + 2);
                    } else {
                      setPick({ tried: tried.concat([lbl]) });
                      iqAnnounce(__alloT('stem.inequality.solver_pick_wrong', 'Not that one. Look at what is still attached to the variable and undo it, the same way on both sides.'));
                    }
                  },
                  className: 'text-left px-2 py-1 rounded text-xs font-semibold border ' + (wrong ? 'bg-slate-100 text-slate-700 border-slate-400 line-through' : 'bg-teal-50 text-teal-900 border-teal-700 hover:bg-teal-100') }, (wrong ? '✗ ' : '') + lbl);
              })),
            tried.length > 0 && h('p', { className: 'mt-1 text-xs', style: { color: badText } }, __alloT('stem.inequality.solver_pick_wrong', 'Not that one. Look at what is still attached to the variable and undo it, the same way on both sides.'))),
          pick.ok && mv.muldiv && h('div', null,
            h('p', { className: 'text-xs font-bold text-teal-900', id: 'iq-flip-q' }, iqFill(__alloT('stem.inequality.solver_flip_question', 'Before you do it ({move}): will the inequality sign flip?'), { move: mv.label })),
            h('div', { role: 'group', 'aria-labelledby': 'iq-flip-q', className: 'mt-1 flex gap-1.5' },
              h('button', { type: 'button', 'aria-pressed': pick.flip === 'yes', disabled: pick.flip != null, className: pressCls(pick.flip === 'yes'), onClick: function() { answerFlip('yes'); } }, __alloT('stem.inequality.solver_flip_yes', 'Yes, it flips')),
              h('button', { type: 'button', 'aria-pressed': pick.flip === 'no', disabled: pick.flip != null, className: pressCls(pick.flip === 'no'), onClick: function() { answerFlip('no'); } }, __alloT('stem.inequality.solver_flip_no', 'No, it stays'))),
            pick.flip != null && h('p', { role: 'status', className: 'mt-1 text-xs font-semibold', style: { color: flipRight ? okText : badText } }, (flipRight ? '✓ ' : '✗ ') + flipText),
            pick.flip != null && h('button', { type: 'button', onClick: function() { revealTo(idx + 2); }, className: 'mt-1 px-3 py-1 text-[0.6875rem] font-bold bg-teal-700 text-white rounded' }, '▶ ' + __alloT('stem.inequality.solver_show_step', 'Show the step'))));
      };

      return h('div', { className: 'max-w-5xl mx-auto animate-in fade-in duration-200', 'data-inequality-root': 'true' },

        // ── Header ──
        h('section', { 'data-inequality-command': 'true', className: 'mb-4 overflow-hidden rounded-2xl border border-fuchsia-300/40 bg-gradient-to-br from-slate-950 via-fuchsia-950 to-purple-950 text-white shadow-xl' },
          h('div', { className: 'p-4 sm:p-5' },
            h('div', { className: 'flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between' },
              h('div', { className: 'min-w-0' },
                h('div', { className: 'flex flex-wrap items-center gap-2' },
                  h('button', { onClick: function() { setStemLabTool(null); }, className: 'shrink-0 rounded-lg border border-white/20 bg-white/10 p-2 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-fuchsia-300', 'aria-label': __alloT('stem.inequality.back_to_tools', 'Back to tools') }, h(ArrowLeft, { size: 18 })),
                  h('span', { className: 'rounded-full bg-fuchsia-300/15 px-2.5 py-1 text-[0.625rem] font-black uppercase tracking-[0.18em] text-fuchsia-100 ring-1 ring-fuchsia-200/30' }, __alloT('stem.inequality.solution_set_studio', 'Solution-set studio')),
                  earnedCount > 0 && h('button', { onClick: function() { upd('showBadges', !showBadges); }, className: 'rounded-full border border-amber-300/40 bg-amber-300/15 px-2.5 py-1 text-[0.625rem] font-bold text-amber-100' }, '\uD83C\uDFC5 ' + earnedCount + '/' + BADGES.length),
                  h('button', { onClick: askAI, className: 'rounded-full border border-violet-300/40 bg-violet-300/15 px-2.5 py-1 text-[0.625rem] font-bold text-violet-100' }, '\uD83E\uDDE0 AI')
                ),
                h('h3', { className: 'mt-3 text-xl font-black tracking-tight sm:text-2xl' }, '\uD83C\uDFA8 ' + __alloT('stem.inequality.inequality_grapher', 'Inequality Grapher')),
                h('p', { className: 'mt-1 max-w-2xl text-sm leading-6 text-fuchsia-100' }, __alloT('stem.inequality.tool_intro_blurb', 'Test values, represent solution sets, and justify boundaries with algebraic and graphical evidence.')),
                h('div', { className: 'mt-3 rounded-xl border border-white/15 bg-white/10 p-3' },
                  h('p', { className: 'text-[0.625rem] font-black uppercase tracking-[0.16em] text-fuchsia-200' }, __alloT('stem.inequality.recommended_next_move', 'Recommended next move')),
                  h('p', { className: 'mt-1 text-sm font-semibold text-white' }, inequalityNext)
                )
              ),
              h('div', { className: 'grid grid-cols-3 gap-2 lg:w-[22rem]' },
                [
                  { label: __alloT('stem.inequality.metric_view', 'View'), value: inequalityModeLabel },
                  { label: __alloT('stem.inequality.metric_tests', 'Tests'), value: String(testCount) },
                  { label: __alloT('stem.inequality.metric_solved', 'Solved'), value: String(solverCount) }
                ].map(function(metric) {
                  return h('div', { key: metric.label, className: 'min-w-0 rounded-xl border border-white/15 bg-white/10 px-2 py-3 text-center' },
                    h('div', { className: 'truncate text-sm font-black text-white', title: metric.value }, metric.value),
                    h('div', { className: 'mt-1 text-[0.625rem] font-bold uppercase tracking-wider text-fuchsia-200' }, metric.label)
                  );
                })
              )
            ),
            h('ol', { className: 'mt-4 grid gap-2 text-xs sm:grid-cols-3', 'aria-label': __alloT('stem.inequality.a11y_inequality_reasoning_pathway', 'Inequality reasoning pathway') },
              [
                { n: '1', title: 'Test', detail: 'Check values against the statement.' },
                { n: '2', title: 'Represent', detail: 'Graph boundary and solution region.' },
                { n: '3', title: 'Justify', detail: 'Explain inclusion and direction.' }
              ].map(function(step) {
                return h('li', { key: step.n, className: 'flex items-center gap-2 rounded-xl border border-white/10 bg-black/10 p-2.5' },
                  h('span', { className: 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-fuchsia-300 font-black text-slate-950' }, step.n),
                  h('span', null, h('strong', { className: 'block text-white' }, step.title), h('span', { className: 'text-fuchsia-200' }, step.detail))
                );
              })
            )
          )
        ),

        // ── Badge panel ──
        showBadges && h('div', { className: 'bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-3 border-2 border-amber-200 mb-3' },
          h('div', { className: 'flex items-center justify-between mb-2' },
            h('p', { className: 'text-sm font-bold text-amber-800' }, '\uD83C\uDFC5 ' + __alloT('stem.inequality.badges', 'Badges') + ' (' + earnedCount + '/' + BADGES.length + ')'),
            h('button', { onClick: function() { upd('showBadges', false); }, className: 'text-xs text-slate-600 hover:text-slate-800' }, '\u2715')
          ),
          h('div', { className: 'grid grid-cols-3 sm:grid-cols-5 gap-2' },
            BADGES.map(function(badge) {
              var earned = !!badges[badge.id];
              return h('div', {
                key: badge.id,
                className: 'text-center p-2 rounded-lg border transition-all ' +
                  (earned ? 'bg-white border-amber-300 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-50'),
                title: _bt(badge.desc)
              },
                h('div', { className: 'text-xl' }, earned ? badge.icon : '\uD83D\uDD12'),
                h('div', { className: 'text-[0.6875rem] font-bold mt-0.5 ' + (earned ? 'text-amber-800' : 'text-slate-600') }, _bt(badge.label))
              );
            })
          )
        ),

        // ── AI Tutor panel ──
        showAI && h('div', { className: 'bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-3 border-2 border-purple-200 mb-3' },
          h('div', { className: 'flex items-center justify-between mb-2' },
            h('p', { className: 'text-sm font-bold text-purple-800' }, '\uD83E\uDDE0 ' + __alloT('stem.inequality.ai_inequality_tutor', 'AI Inequality Tutor')),
            h('button', { onClick: function() { upd('showAI', false); }, className: 'text-xs text-slate-600 hover:text-slate-800' }, '\u2715')
          ),
          aiLoading && aiBusyRef.current
            ? h('div', { className: 'flex items-center gap-2' },
                h('div', { className: 'w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full motion-reduce:animate-none animate-spin' }),
                h('span', { className: 'text-xs text-purple-600' }, __alloT('stem.inequality.thinking', 'Thinking...'))
              )
            : h('p', { className: 'text-sm text-purple-700 whitespace-pre-wrap leading-relaxed' }, aiResponse),
          !(aiLoading && aiBusyRef.current) && h('button', { 'aria-label': __alloT('stem.inequality.ask_again', 'Ask Again'),
            onClick: askAI,
            className: 'mt-2 text-[0.6875rem] font-bold px-3 py-1 rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-700 transition-all'
          }, '\uD83D\uDD04 ' + __alloT('stem.inequality.ask_again', 'Ask Again'))
        ),

        h('p', { className: 'text-xs text-slate-600 italic -mt-1 mb-3' + onHostInk },
          graphMode === '2d'
            ? __alloT('stem.inequality.hint_type_2d', 'Type a two-variable inequality like y > 2x + 1 to graph on the Cartesian plane.')
            : __alloT('stem.inequality.hint_type_1d', 'Type an inequality like x > 3 or a compound like -2 < x \u2264 5 to visualize it on a number line.')),

        // ── Mode tabs: 1D / 2D ──
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }, className: 'gap-1 mb-3', role: 'tablist', 'aria-label': __alloT('stem.inequality.graph_views', 'Inequality graph views'), },
          ['1d', '2d'].map(function(m, tabIndex) {
            var labels = { '1d': '\uD83D\uDCCF ' + __alloT('stem.inequality.mode_number_line', 'Number Line'), '2d': '\uD83D\uDCC8 ' + __alloT('stem.inequality.mode_coordinate_plane', 'Coordinate plane') };
            return h('button', { key: m, role: 'tab', 'aria-selected': graphMode === m,
              id: 'stem-inequality-tab-' + m,
              'aria-controls': 'stem-inequality-panel-' + m,
              tabIndex: graphMode === m ? 0 : -1,
              onKeyDown: function(e) { inequalityTabKeyDown(e, tabIndex); },
              onClick: function() { upd('graphMode', m); trackMode(m); },
              style: { minHeight: 44, whiteSpace: 'normal', overflowWrap: 'anywhere' }, className: 'px-3 py-2 text-xs font-bold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-fuchsia-400 ' +
                (graphMode === m ? 'bg-fuchsia-700 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'),
              title: m === '1d' ? __alloT('stem.inequality.shortcut_1_key', '1 key') : __alloT('stem.inequality.shortcut_2_key', '2 key')
            }, labels[m]);
          })
        ),

        // ── Topic-accent hero band per mode ──
        (function() {
          var MODE_META = {
            '1d': { accent: '#a21caf', soft: 'rgba(192,38,211,0.10)', icon: '\uD83D\uDCCF', title: __alloT('stem.inequality.hero_1d_title', 'Number Line \u2014 1D inequalities'),                  hint: __alloT('stem.inequality.hero_1d_hint', 'Open circle for < and >, closed for \u2264 and \u2265. Compound inequalities (-2 < x \u2264 5) shade the band BETWEEN the two endpoints. Common Core 6.EE.8, 7.EE.4.') },
            '2d': { accent: '#7e22ce', soft: 'rgba(168,85,247,0.10)', icon: '\uD83D\uDCC8', title: __alloT('stem.inequality.hero_2d_title', '2D Graph \u2014 inequality regions'),                hint: __alloT('stem.inequality.hero_2d_hint_test_point', 'Solid line for \u2264/\u2265, dashed for </>. A test point that is NOT on the line tells you which side to shade: (0,0) works unless the line passes through it. In System mode several constraints overlap into a feasible region \u2014 the foundation of linear programming.') }
          };
          var meta = MODE_META[graphMode] || MODE_META['1d'];
          return h('div', {
            role: 'tabpanel', id: 'stem-inequality-panel-' + graphMode,
            'aria-labelledby': 'stem-inequality-tab-' + graphMode, tabIndex: 0,
            style: {
              margin: '0 0 12px',
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
              h('p', { style: { margin: '3px 0 0', color: '#475569', fontSize: 11, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
            )
          );
        })(),

        subModeBar(),

        // ── Input + presets (Explore) ──
        exploring && h('div', { className: 'flex items-center gap-2 mb-3' },
          h('input', {style:{background:'var(--allo-stem-panel,#fff)',color:'var(--allo-stem-text,#0f172a)'},
            type: 'text', value: d.expr || '',
            placeholder: graphMode === '2d' ? 'y > 2x + 1' : 'x > 3 or -2 < x ≤ 5',
            // studentGraphed feeds graph_first: the host's starter state already holds
            // expr 'x > 3', so a bare expr check completed the quest on first open.
            onChange: function(e) { setExpr(e.target.value); },
            onKeyDown: function(e) { if (e.key === 'Enter') addToHistory(d.expr); },
            className: 'px-4 py-2 border-2 border-fuchsia-600 rounded-lg font-mono text-lg text-center w-52 max-w-full focus:ring-2 focus:ring-fuchsia-400 outline-none',
            'aria-label': __alloT('stem.inequality.aria_expression_input', 'Inequality expression input')
          })
        ),
        graphMode==='1d'&&exploring&&(!ineq||ineq.empty||reasonText)&&h('p',{'data-inequality-notice':true,role:'status',className:'text-sm rounded-lg p-3 mb-3',style:{background:'var(--allo-stem-panel,#fff)',color:'var(--allo-stem-text,#0f172a)',border:'1px solid var(--allo-stem-text-soft,#475569)'}},reasonText||(ineq?__alloT('stem.inequality.empty_solution','No real number meets both conditions. The solution set is empty (∅).'):__alloT('stem.inequality.supported_expression_v2','Enter a complete supported form such as x > 3, 3 < x, -2 < x ≤ 5, |2x - 1| < 5, x < -2 or x > 4, or x ≠ 3. Use the step-by-step solver below for forms such as 2x + 1 > 5.'))),
        exploring && h('div', { className: 'flex flex-wrap gap-1.5 mb-3' },
          PRESETS.map(function(ex) {
            return h('button', { key: ex.label,
              onClick: function() { setExpr(ex.expr); },
              className: 'px-2 py-1 text-[0.6875rem] font-bold bg-fuchsia-50 text-fuchsia-700 rounded border border-fuchsia-700 hover:bg-fuchsia-100 transition-all'
            }, ex.label);
          })
        ),

        // ── 1D: explore, build, read ──
        graphMode === '1d' && oneDMode === 'explore' && mainNumberLine(),
        graphMode === '1d' && oneDMode === 'build' && buildPanel(),
        graphMode === '1d' && oneDMode === 'read' && readPanel(),

        // ── 2D: one inequality, or a system ──
        graphMode === '2d' && twoDMode === 'single' && singlePlane(),
        graphMode === '2d' && twoDMode === 'system' && systemPanel(),

        // ── Legend ──
        h('div', { className: 'flex flex-wrap items-center justify-center gap-x-6 gap-y-1 mt-2 text-xs' },
          h('span', { className: 'flex items-center gap-1.5 text-fuchsia-700 font-bold' },
            h('span', { style: { display: 'inline-block', width: 10, height: 10, borderRadius: '50%', backgroundColor: '#d946ef' } }),
            __alloT('stem.inequality.legend_closed', 'Closed (≤ ≥) includes the value')),
          h('span', { className: 'flex items-center gap-1.5 text-fuchsia-700 font-bold' },
            h('span', { style: { display: 'inline-block', width: 10, height: 10, borderRadius: '50%', backgroundColor: 'white', border: '2px solid #d946ef' } }),
            __alloT('stem.inequality.legend_open', 'Open (< >) excludes the value'))
        ),

        // ── Range controls (number line) ──
        graphMode === '1d' && oneDMode === 'explore' && h('div', { className: 'flex flex-wrap items-center justify-center gap-2 mt-2' },
          h('button', { onClick: function() { shiftRange(-5); }, className: 'px-2 py-0.5 text-[0.6875rem] font-bold bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-all', title: __alloT('stem.inequality.shift_range_left', 'Shift range left') }, '◀ -5'),
          h('button', { onClick: function() { zoomRange(1.5); }, className: 'px-2 py-0.5 text-[0.6875rem] font-bold bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-all', title: __alloT('stem.inequality.zoom_out', 'Zoom out') }, '− ' + __alloT('stem.inequality.zoom', 'Zoom')),
          h('span', { className: 'text-[0.6875rem] text-slate-600 font-mono' + onHostInk }, '[' + range.min + ', ' + range.max + ']'),
          h('button', { onClick: function() { zoomRange(0.67); }, className: 'px-2 py-0.5 text-[0.6875rem] font-bold bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-all', title: __alloT('stem.inequality.zoom_in', 'Zoom in') }, '+ ' + __alloT('stem.inequality.zoom', 'Zoom')),
          h('button', { 'aria-label': '+5', onClick: function() { shiftRange(5); }, className: 'px-2 py-0.5 text-[0.6875rem] font-bold bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-all', title: __alloT('stem.inequality.shift_range_right', 'Shift range right') }, '+5 ▶'),
          h('button', { 'aria-label': __alloT('stem.inequality.reset_range', 'Reset range'), onClick: function() { upd('range', { min: -10, max: 10 }); }, className: 'px-2 py-0.5 text-[0.6875rem] font-bold bg-fuchsia-50 text-fuchsia-700 rounded hover:bg-fuchsia-100 transition-all', title: __alloT('stem.inequality.reset_range', 'Reset range') }, '↺'),
          offscreen.length > 0 && h('button', { 'data-inequality-fit': 'true', onClick: function() { upd('range', iqFitRange(ineq, range)); }, className: 'px-2 py-0.5 text-[0.6875rem] font-bold bg-fuchsia-700 text-white rounded' }, '⤢ ' + __alloT('stem.inequality.fit_view', 'Fit view'))
        ),

        // === Flip Lab (H7b'' inquiry widget): predict, then check ===
        flipLab(),

        // ── Notation display ──
        ineq && exploring && h('div', { className: 'mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3' },
          h('div', { className: 'bg-fuchsia-50 rounded-lg p-3 border border-fuchsia-200 text-center' },
            h('p', { className: 'text-[0.6875rem] font-bold text-fuchsia-700 uppercase tracking-wider mb-1' }, __alloT('stem.inequality.interval_notation', 'Interval Notation')),
            h('p', { className: 'text-lg font-bold text-fuchsia-800 font-mono', style: { overflowWrap: 'anywhere' } }, intervalStr)),
          h('div', { className: 'bg-violet-50 rounded-lg p-3 border border-violet-200 text-center' },
            h('p', { className: 'text-[0.6875rem] font-bold text-violet-700 uppercase tracking-wider mb-1' }, __alloT('stem.inequality.set_builder_notation', 'Set-Builder Notation')),
            h('p', { className: 'text-sm font-bold text-violet-800 font-mono', style: { overflowWrap: 'anywhere' } }, setBuilderStr))
        ),

        // ── Test-a-Value panel ──
        exploring && h('div', { className: 'mt-3 bg-sky-50 rounded-lg p-3 border border-sky-200' },
          h('p', { className: 'text-[0.6875rem] font-bold text-sky-700 uppercase tracking-wider mb-2' }, '\uD83E\uDDEA ' + __alloT('stem.inequality.test_a_value', 'Test a Value')),
          h('div', { className: 'flex flex-wrap items-center gap-2' },
            h('input', {style:{background:'var(--allo-stem-panel,#fff)',color:'var(--allo-stem-text,#0f172a)'},
              type: 'number', step: 'any', value: testVal, placeholder: __alloT('stem.inequality.enter_a_number', 'Enter a number\u2026'),
              'aria-label': __alloT('stem.inequality.aria_test_a_value', 'Test a value against the inequality'),
              onChange: function(e) { upd('testVal', e.target.value); },
              onKeyDown: function(e) { if (e.key === 'Enter') commitTest(e); },
              onBlur: commitTest,
              className: 'px-3 py-1.5 border-2 border-sky-600 rounded-lg font-mono text-sm w-36 text-center focus:ring-2 focus:ring-sky-400 outline-none'
            }),
            testResult !== null && h('span', { className: 'text-sm font-bold ' + (testResult ? 'text-emerald-600' : 'text-red-600') },
              testResult
                ? '\u2705 ' + testVal + __alloT('stem.inequality.is_in_solution_set', ' IS in the solution set')
                : '\u274C ' + testVal + __alloT('stem.inequality.is_not_in_solution_set', ' is NOT in the solution set')),
            testResult === null && ineq && testVal !== '' && h('span', { className: 'text-xs text-slate-600 italic' }, __alloT('stem.inequality.enter_a_valid_number', 'Enter a valid number'))
          )
        ),

        // ── Coach tips ──
        h('div', { className: 'mt-3' },
          h('button', { 'aria-label': __alloT('stem.inequality.toggle_tips', 'Toggle tips (C)'),
            onClick: function() { upd('showCoach', !showCoach); },
            className: 'text-[0.6875rem] font-bold text-amber-800 hover:text-amber-900 transition-all' + onHostInk,
            title: __alloT('stem.inequality.toggle_tips', 'Toggle tips (C)')
          }, (showCoach ? '\u25BC' : '\u25B6') + ' \uD83D\uDCA1 ' + __alloT('stem.inequality.learning_tips', 'Learning Tips')),
          showCoach && h('div', { className: 'mt-2 bg-amber-50 rounded-lg p-3 border border-amber-200 space-y-2' },
            COACH_TIPS.map(function(ct, i) {
              return h('div', { key: i, className: 'flex items-start gap-2' },
                h('span', { className: 'text-sm font-bold text-amber-800 w-5 text-center flex-shrink-0' }, ct.icon),
                h('p', { className: 'text-xs text-amber-800' }, ct.tip));
            })
          )
        ),

        // ── Quiz Mode ──
        h('div', { className: 'mt-3 border-t border-slate-200 pt-3' },
          h('div', { className: 'flex items-center gap-1.5 mb-2' },
            ['easy', 'medium', 'hard', 'all'].map(function(tier) {
              var labels = { easy: '\uD83D\uDFE2 ' + __alloT('stem.inequality.tier_easy', 'Easy'), medium: '\uD83D\uDFE1 ' + __alloT('stem.inequality.tier_medium', 'Medium'), hard: '\uD83D\uDD34 ' + __alloT('stem.inequality.tier_hard', 'Hard'), all: '\uD83C\uDF1F ' + __alloT('stem.inequality.tier_all', 'All') };
              var isActive = quizTier === tier;
              return h('button', { key: tier,
                'aria-pressed': isActive,
                onClick: function() {
                  upd('quizTier', tier);
                  var nt = Object.assign({}, tiersUsed);
                  nt[tier] = true;
                  upd('tiersUsed', nt);
                },
                className: 'px-2 py-0.5 rounded text-[0.6875rem] font-bold transition-all ' +
                  (isActive ? 'bg-fuchsia-700 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
              }, labels[tier]);
            })
          ),
          h('div', { className: 'flex items-center gap-2 mb-2' },
            // B5: no aria-label, so the accessible name is the visible "Challenge Mode" /
            // "Next Challenge" (an "Iq Start Quiz" label overrode it, WCAG 2.5.3).
            h('button', { type: 'button',
              onClick: function() { iqStartQuiz(); },
              className: 'px-3 py-1.5 rounded-lg text-xs font-bold ' + (d.quiz ? 'bg-fuchsia-100 text-fuchsia-700' : 'bg-fuchsia-700 text-white') + ' transition-all',
              title: __alloT('stem.inequality.quiz_q', 'Quiz (Q)')
            }, d.quiz ? '\uD83D\uDD04 ' + __alloT('stem.inequality.next_challenge', 'Next Challenge') : '\uD83E\uDDE0 ' + __alloT('stem.inequality.challenge_mode', 'Challenge Mode')),
            d.quiz && d.quiz.score > 0 && h('span', { className: 'text-xs font-bold text-emerald-600' }, '\u2B50 ' + d.quiz.score + __alloT('stem.inequality.correct_suffix', ' correct')),
            d.quiz && d.quiz.streak > 1 && h('span', { className: 'text-xs font-bold text-orange-600' }, '\uD83D\uDD25 ' + d.quiz.streak + __alloT('stem.inequality.streak_suffix', ' streak'))
          ),
          d.quiz && !d.quiz.answered && h('div', { className: 'bg-fuchsia-50 rounded-xl p-3 border border-fuchsia-200' },
            h('p', { className: 'text-sm font-bold text-fuchsia-800 mb-3' }, d.quiz.q),
            h('div', { className: 'grid grid-cols-2 gap-2' },
              (d.quiz.opts || []).map(function(opt) {
                var dispOpt = opt.replace(/</g, '\u003c').replace(/>=/g, '\u2265').replace(/<=/g, '\u2264');
                return h('button', { key: opt,
                  onClick: function() {
                    var norm = function(s) { return s.replace(/\s+/g, '').replace(/\u2264/g, '<=').replace(/\u2265/g, '>='); };
                    var correct = norm(opt) === norm(d.quiz.a);
                    var newScore = d.quiz.score + (correct ? 1 : 0);
                    var newStreak = correct ? (d.quiz.streak || 0) + 1 : 0;
                    var newQTotal = quizCorrectTotal + (correct ? 1 : 0);

                    playSound(correct ? 'correct' : 'wrong');
                    if (correct && newStreak >= 3 && newStreak % 5 === 0) playSound('streak');

                    var fb = correct ? '' : diagnoseQuizError(opt, d.quiz.a);

                    var solvedTiers = Object.assign({}, d.tiersSolved && typeof d.tiersSolved === 'object' ? d.tiersSolved : {});
                    if (correct && d.quiz.tier) solvedTiers[d.quiz.tier] = true;
                    upd({
                      quiz: Object.assign({}, d.quiz, { answered: true, chosen: opt, correct: correct, score: newScore, streak: newStreak, fb: fb }),
                      expr: d.quiz.a,
                      quizCorrectTotal: newQTotal,
                      tiersSolved: solvedTiers
                    });
                    if (correct) {
                      addToast('\u2705 Correct!' + (newStreak >= 3 ? ' \uD83D\uDD25 ' + newStreak + ' streak!' : ''), 'success');
                      if (typeof awardXP === 'function') awardXP('inequality', 10, 'Inequality Challenge');
                      checkBadges({
                        firstSolve: true,
                        streak5: newStreak >= 5,
                        streak10: newStreak >= 10,
                        quizChamp: newQTotal >= 20,
                        allTiers: !!(solvedTiers.easy && solvedTiers.medium && solvedTiers.hard)
                      });
                      iqAnnounce(__alloT('stem.inequality.correct_excl', 'Correct!'));
                      var answeredId = d.quiz.id || '';
                      setTimeout(function() { iqStartQuiz(answeredId); }, 1500);
                    } else {
                      if (typeof announceToSR === 'function') announceToSR('Not quite. ' + fb);
                      addToast('\u274C Not quite \u2014 see why below', 'error');
                    }
                  },
                  className: 'px-3 py-2 rounded-lg text-xs font-bold font-mono border-2 bg-white text-slate-700 border-fuchsia-600 hover:border-fuchsia-400 hover:bg-fuchsia-50 transition-all'
                }, dispOpt);
              })
            )
          ),
          d.quiz && d.quiz.answered && h('div', { className: 'p-3 rounded-xl ' + (d.quiz.correct ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'), role: 'status' },
            h('p', { className: 'text-sm font-bold ' + (d.quiz.correct ? 'text-emerald-700' : 'text-red-700') },
              d.quiz.correct ? '\u2705 ' + __alloT('stem.inequality.correct_excl', 'Correct!') : '\u274C ' + __alloT('stem.inequality.not_quite_answer_is', 'Not quite \u2014 the answer is ') + d.quiz.a.replace(/</g, '\u003c').replace(/>=/g, '\u2265').replace(/<=/g, '\u2264'),
              d.quiz.streak > 2 && d.quiz.correct && h('span', { className: 'ml-2 text-xs text-amber-800' }, '\uD83D\uDD25 ' + d.quiz.streak + __alloT('stem.inequality.in_a_row_suffix', ' in a row!')),
              !d.quiz.correct && h('button', { 'aria-label': __alloT('stem.inequality.explain', 'Explain'),
                onClick: function() { askAI('quiz'); },
                className: 'ml-2 text-xs font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700 hover:bg-purple-200'
              }, '\uD83E\uDDE0 ' + __alloT('stem.inequality.explain', 'Explain'))),
            !d.quiz.correct && d.quiz.fb && h('p', { className: 'text-xs leading-relaxed text-red-800 mt-1' }, d.quiz.fb))
        ),

        // ── Absolute Value Decomposition ──
        ineq && ineq.absSource && exploring && h('div', { className: 'mt-3 bg-purple-50 rounded-lg p-3 border border-purple-200' },
          h('p', { className: 'text-[0.6875rem] font-bold text-purple-600 uppercase tracking-wider mb-2' }, '\uD83D\uDD0D ' + __alloT('stem.inequality.abs_value_decomposition', 'Absolute Value Decomposition')),
          (ineq.emptySet || ineq.allReals)
            ? h('p', { className: 'text-xs text-purple-900' }, ineq.absSource + ': ' + reasonText)
            : h('p', { className: 'text-xs text-purple-800' }, ineq.absSource + __alloT('stem.inequality.decomposes_to', ' decomposes to:')),
          (ineq.emptySet || ineq.allReals) ? null : ineq.compound
            ? h('p', { className: 'text-sm font-bold text-purple-900 font-mono mt-1' },
                (ineq.loText || ineq.lo) + ' ' + (ineq.op1.includes('=') ? '\u2264' : '<') + ' ' + ineq.v + ' ' + (ineq.op2.includes('=') ? '\u2264' : '<') + ' ' + (ineq.hiText || ineq.hi))
            : h('p', { className: 'text-sm font-bold text-purple-900 font-mono mt-1' },
                ineq.v + ' ' + iqOpText(ineq.op) + ' ' + (ineq.valText || ineq.val) + '  OR  ' + ineq.absRight.v + ' ' + iqOpText(ineq.absRight.op) + ' ' + (ineq.absRight.valText || ineq.absRight.val))
        ),

        // ── Step-by-Step Solver ──
        h('div', { className: 'mt-3 bg-teal-50 rounded-lg p-3 border border-teal-200', 'data-inequality-solver': 'true' },
          h('p', { className: 'text-[0.6875rem] font-bold text-teal-800 uppercase tracking-wider mb-2' }, '🧠 ' + __alloT('stem.inequality.step_by_step_solver', 'Step-by-Step Solver')),
          h('p', { className: 'text-[0.6875rem] text-teal-800 italic mb-2' }, __alloT('stem.inequality.solver_hint_wide', 'Enter an inequality such as 3x - 7 ≥ 5, 5 > 2x + 1, 2(x + 3) < x + 10, x/2 ≤ 4 or -3 < 2x + 1 ≤ 7.')),
          h('div', { className: 'flex flex-wrap items-center gap-2 mb-2' },
            h('input', {style:{background:'var(--allo-stem-panel,#fff)',color:'var(--allo-stem-text,#0f172a)'},
              type: 'text', value: solverExpr, placeholder: '3x - 7 ≥ 5',
              onChange: function(e) { upd('solverExpr', e.target.value); },
              'aria-label': __alloT('stem.inequality.aria_solver_input', 'Step-by-step solver inequality input'),
              className: 'px-3 py-1.5 border-2 border-teal-600 rounded-lg font-mono text-sm w-48 max-w-full text-center focus:ring-2 focus:ring-teal-400 outline-none'
            }),
            h('button', { 'aria-label': __alloT('stem.inequality.solve', 'Solve'),
              onClick: function() {
                var steps = solveInequality(solverExpr);
                if (steps) {
                  // Count each inequality once: re-clicking Solve completed the solver_3 quest.
                  var solvedKey = solverExpr.replace(/\s+/g, ''), solvedList = Array.isArray(d.solverSolved) ? d.solverSolved : [];
                  var isNewSolve = solvedList.indexOf(solvedKey) === -1;
                  var newSC = solverCount + (isNewSolve ? 1 : 0);
                  upd({ solverSteps: steps, solverSolution: steps.solution || null, solverRevealIdx: 1, solverPick: null, solverCount: newSC, solverSolved: isNewSolve ? solvedList.concat([solvedKey]).slice(-50) : solvedList });
                  if (newSC >= 5) checkBadges({ solverPro: true });
                  iqAnnounce(steps[0].text);
                } else {
                  var bad = __alloT('stem.inequality.solver_parse_error', 'Could not read that. Use one variable and numbers, such as 3x - 7 ≥ 5 or -3 < 2x + 1 ≤ 7.');
                  addToast(bad, 'error');
                  iqAnnounce(bad);
                }
              },
              className: 'px-3 py-1.5 text-xs font-bold bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition-all'
            }, '🔍 ' + __alloT('stem.inequality.solve', 'Solve')),
            solverSteps && solverSolution && h('button', { 'aria-label': __alloT('stem.inequality.graph_it', 'Graph It'),
              onClick: function() {
                setExpr(solverSolution, { graphMode: '1d', oneDMode: 'explore' });
                addToHistory(solverSolution);
                addToast('📈 Graphed the solution!', 'success');
              },
              className: 'px-3 py-1.5 text-[0.6875rem] font-bold bg-fuchsia-100 text-fuchsia-700 rounded-lg hover:bg-fuchsia-200 transition-all'
            }, '📈 ' + __alloT('stem.inequality.graph_it', 'Graph It')),
            solverSteps && h('button', { 'aria-label': __alloT('stem.inequality.reset', 'Reset'),
              onClick: function() { upd({ solverSteps: null, solverSolution: null, solverRevealIdx: 0, solverPick: null }); },
              className: 'px-2 py-1 text-[0.6875rem] font-bold text-teal-800 hover:text-teal-900'
            }, '↺ ' + __alloT('stem.inequality.reset', 'Reset'))
          ),
          h('label', { className: 'flex items-center gap-1.5 text-[0.6875rem] font-bold text-teal-900 mb-2 cursor-pointer' },
            h('input', { type: 'checkbox', checked: solverPractice, onChange: function(e) { upd({ solverPractice: e.target.checked, solverPick: null }); }, className: 'w-3.5 h-3.5' }),
            __alloT('stem.inequality.solver_practice_toggle', 'Practice: I choose each move and say whether the sign flips')),
          solverSteps && h('div', { className: 'space-y-1.5' },
            solverSteps.slice(0, solverRevealIdx).map(function(step, i) {
              var cls = 'text-xs px-2 py-1 rounded ';
              if (step.warning) cls += 'bg-amber-100 text-amber-800 font-bold border border-amber-300';
              else if (step.highlight) cls += 'bg-teal-100 text-teal-800 font-mono font-bold';
              else if (step.final) cls += 'bg-emerald-100 text-emerald-700 font-bold';
              else cls += 'text-teal-700';
              return h('div', { key: i, className: cls, style: { animation: reduceMotion ? 'none' : 'fadeIn 0.3s ease', overflowWrap: 'anywhere' } }, step.text,
                step.work && h('span', { className: 'block font-mono font-normal' }, step.work));
            }),
            practicePanel(),
            solverRevealIdx < solverSteps.length && !(solverPractice && solverSteps[solverRevealIdx] && solverSteps[solverRevealIdx].move && solverSteps[solverRevealIdx].move.alts) && h('button', { 'aria-label': __alloT('stem.inequality.aria_reveal_next_step', 'Reveal next solver step'),
              onClick: function() { revealTo(solverRevealIdx + 1); },
              className: 'px-3 py-1 text-[0.6875rem] font-bold bg-teal-100 text-teal-800 rounded hover:bg-teal-200 transition-all mt-1'
            }, '▶ ' + __alloT('stem.inequality.next_step', 'Next Step') + ' (' + solverRevealIdx + '/' + (solverSteps.length - 1) + ')')
          )
        ),

        // ── History ──
        exprHistory.length > 0 && h('div', { className: 'mt-3 bg-slate-50 rounded-lg p-3 border border-slate-400' },
          h('div', { className: 'flex items-center justify-between mb-2' },
            h('p', { className: 'text-[0.6875rem] font-bold text-slate-600 uppercase tracking-wider' }, '\uD83D\uDD53 ' + __alloT('stem.inequality.recent_expressions', 'Recent Expressions')),
            h('button', { 'aria-label': __alloT('stem.inequality.clear', 'Clear'), onClick: function() { upd('exprHistory', []); }, className: 'text-[0.6875rem] text-slate-600 hover:text-slate-800' + onHostInk }, __alloT('stem.inequality.clear', 'Clear'))
          ),
          h('div', { className: 'flex flex-wrap gap-1.5' },
            exprHistory.map(function(ex, i) {
              return h('button', { key: i,
                onClick: function() { setExpr(ex); },
                className: 'px-2 py-1 text-[0.6875rem] font-mono font-bold bg-white text-slate-600 rounded border border-slate-400 hover:bg-fuchsia-50 hover:border-fuchsia-600 transition-all'
              }, ex);
            })
          )
        ),

        // ── Keyboard shortcuts legend ──
        h('div', { className: 'text-[0.6875rem] text-slate-600 text-center mt-3 space-x-3' + onHostInk },
          h('span', null, '1 ' + __alloT('stem.inequality.mode_number_line', 'Number Line')),
          h('span', null, '2 ' + __alloT('stem.inequality.mode_coordinate_plane', 'Coordinate plane')),
          h('span', null, 'Q ' + __alloT('stem.inequality.legend_quiz', 'Quiz')),
          h('span', null, 'C ' + __alloT('stem.inequality.legend_tips', 'Tips')),
          h('span', null, 'B ' + __alloT('stem.inequality.badges', 'Badges')),
          h('span', null, '? AI')
        ),

        // ── Snapshot button ──
        h('button', { 'aria-label': __alloT('stem.inequality.snapshot', 'Snapshot'),
          onClick: function() {
            setToolSnapshots(function(prev) {
              return prev.concat([{ id: 'iq-' + Date.now(), tool: 'inequality', label: d.expr || 'inequality', data: Object.assign({}, d), timestamp: Date.now() }]);
            });
            addToast('\uD83D\uDCF8 Snapshot saved!', 'success');
          },
          className: 'mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all'
        }, '\uD83D\uDCF8 ' + __alloT('stem.inequality.snapshot', 'Snapshot'))
      );
    }
  });
})();
