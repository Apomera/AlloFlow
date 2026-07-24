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
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
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

  window.StemLab.registerTool('inequality', {
    icon: '\uD83C\uDFA8', label: 'Inequality Grapher',
    desc: 'Visualize inequalities on a number line with notation, quiz, solver, badges & AI tutor.',
    color: 'fuchsia', category: 'math',
    questHooks: [
      { id: 'graph_first', label: 'Graph any inequality', icon: '\uD83C\uDFA8', check: function(d) { return !!d.expr; }, progress: function(d) { return d.expr ? 'Done' : 'Pick a preset or type one'; } },
      { id: 'quiz_5_correct', label: 'Answer 5 challenges correctly', icon: '\uD83E\uDDE0', check: function(d) { return (d.quizCorrectTotal || 0) >= 5; }, progress: function(d) { return (d.quizCorrectTotal || 0) + '/5 correct'; } },
      { id: 'both_modes', label: 'Graph in both 1D and 2D modes', icon: '\uD83D\uDCCA', check: function(d) { var m = d.modesUsed || {}; return !!(m['1d'] && m['2d']); }, progress: function(d) { var m = d.modesUsed || {}; return ((m['1d'] ? 1 : 0) + (m['2d'] ? 1 : 0)) + '/2 modes'; } },
      { id: 'solver_3', label: 'Solve 3 inequalities step-by-step', icon: '\uD83E\uDDEA', check: function(d) { return (d.solverCount || 0) >= 3; }, progress: function(d) { return (d.solverCount || 0) + '/3 solved'; } }
    ],
    render: function(ctx) {
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
          if (updates[key] && !newBadges[key]) {
            changed[key] = true;
            newBadges[key] = true;
          }
        });
        if (Object.keys(changed).length > 0) {
          upd('badges', newBadges);
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
      var exprHistory = d.exprHistory || [];
      var addToHistory = function(expr) {
        if (!expr) return;
        var h2 = exprHistory.filter(function(e) { return e !== expr; });
        h2.unshift(expr);
        if (h2.length > 10) h2 = h2.slice(0, 10);
        upd('exprHistory', h2);
      };

      // ── 2D Parser ──
      var parse2D = function(expr) {
        if (!expr) return null;
        var m = expr.match(/y\s*([<>]=?|[\u2264\u2265])\s*(-?\d*\.?\d*)\s*\*?\s*x\s*([+-]\s*\d+\.?\d*)?/);
        if (m) {
          var op = m[1].replace('\u2264', '<=').replace('\u2265', '>=');
          var slopeStr = m[2];
          var slope = (slopeStr === '' || slopeStr === '+') ? 1 : slopeStr === '-' ? -1 : parseFloat(slopeStr);
          var intercept = m[3] ? parseFloat(m[3].replace(/\s/g, '')) : 0;
          return { slope: slope, intercept: intercept, op: op };
        }
        var m2 = expr.match(/y\s*([<>]=?|[\u2264\u2265])\s*(-?\d+\.?\d*)\s*$/);
        if (m2) {
          return { slope: 0, intercept: parseFloat(m2[2]), op: m2[1].replace('\u2264', '<=').replace('\u2265', '>=') };
        }
        return null;
      };

      var W2 = 400, H2 = 400, pad2 = 40;
      var gRange = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
      var toGX = function(x) { return pad2 + ((x - gRange.xMin) / (gRange.xMax - gRange.xMin)) * (W2 - 2 * pad2); };
      var toGY = function(y) { return H2 - pad2 - ((y - gRange.yMin) / (gRange.yMax - gRange.yMin)) * (H2 - 2 * pad2); };

      // ── PARSER ──
      var parseIneq = function(expr) {
        if (!expr) return null;
        var cm = expr.match(/(-?\d+\.?\d*)\s*([<>]=?|[\u2264\u2265])\s*([a-z])\s*([<>]=?|[\u2264\u2265])\s*(-?\d+\.?\d*)/);
        if (cm) {
          var op1 = cm[2].replace('\u2264', '<=').replace('\u2265', '>=');
          var op2 = cm[4].replace('\u2264', '<=').replace('\u2265', '>=');
          return { compound: true, lo: parseFloat(cm[1]), op1: op1, v: cm[3], op2: op2, hi: parseFloat(cm[5]) };
        }
        var absM = expr.match(/\|([a-z])\s*([+-])\s*(\d+\.?\d*)\|\s*([<>]=?|[\u2264\u2265])\s*(\d+\.?\d*)/);
        if (absM) {
          var av = absM[1], sign = absM[2], offset = parseFloat(absM[3]), absOp = absM[4].replace('\u2264', '<=').replace('\u2265', '>='), bound = parseFloat(absM[5]);
          var center = sign === '-' ? offset : -offset;
          if (absOp === '<' || absOp === '<=') {
            return { compound: true, lo: center - bound, op1: absOp, v: av, op2: absOp, hi: center + bound, absSource: expr };
          } else {
            var leftOp = absOp === '>' ? '<' : '<=';
            var rightOp = absOp;
            return { compound: false, v: av, op: leftOp, val: center - bound, absSource: expr, absRight: { v: av, op: rightOp, val: center + bound } };
          }
        }
        var sm = expr.match(/([a-z])\s*([<>]=?|[\u2264\u2265])\s*(-?\d+\.?\d*)/);
        if (sm) {
          var opS = sm[2].replace('\u2264', '<=').replace('\u2265', '>=');
          return { compound: false, v: sm[1], op: opS, val: parseFloat(sm[3]) };
        }
        return null;
      };

      var ineq = parseIneq(d.expr);

      // Check expression-based badges
      if (ineq) {
        if (ineq.absSource && !badges.absValue) checkBadges({ absValue: true });
        if (ineq.compound && !badges.compound) checkBadges({ compound: true });
      }

      // ── NOTATION ──
      var intervalStr = '';
      var setBuilderStr = '';
      if (ineq) {
        if (ineq.compound) {
          var lb = ineq.op1.includes('=') ? '[' : '(';
          var rb = ineq.op2.includes('=') ? ']' : ')';
          intervalStr = lb + ineq.lo + ', ' + ineq.hi + rb;
          var leftCmp = ineq.op1.includes('=') ? '\u2264' : '<';
          var rightCmp = ineq.op2.includes('=') ? '\u2264' : '<';
          setBuilderStr = '{ ' + ineq.v + ' | ' + ineq.lo + ' ' + leftCmp + ' ' + ineq.v + ' ' + rightCmp + ' ' + ineq.hi + ' }';
        } else {
          if (ineq.op.includes('>')) {
            intervalStr = (ineq.op.includes('=') ? '[' : '(') + ineq.val + ', \u221E)';
          } else {
            intervalStr = '(-\u221E, ' + ineq.val + (ineq.op.includes('=') ? ']' : ')');
          }
          var dispOp = ineq.op.replace('<=', '\u2264').replace('>=', '\u2265');
          setBuilderStr = '{ ' + ineq.v + ' | ' + ineq.v + ' ' + dispOp + ' ' + ineq.val + ' }';
        }
      }

      // ── TEST-A-VALUE ──
      var testVal = d.testVal != null ? d.testVal : '';
      var testResult = null;
      if (ineq && testVal !== '' && !isNaN(parseFloat(testVal))) {
        var tv = parseFloat(testVal);
        if (ineq.compound) {
          var loOk = ineq.op1.includes('=') ? tv >= ineq.lo : tv > ineq.lo;
          var hiOk = ineq.op2.includes('=') ? tv <= ineq.hi : tv < ineq.hi;
          testResult = loOk && hiOk;
        } else {
          if (ineq.op === '>') testResult = tv > ineq.val;
          else if (ineq.op === '>=') testResult = tv >= ineq.val;
          else if (ineq.op === '<') testResult = tv < ineq.val;
          else if (ineq.op === '<=') testResult = tv <= ineq.val;
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
        { q: 'A roller coaster requires riders to be at least 48 inches tall. Write the inequality for height h.', a: 'x >= 48', opts: ['x >= 48', 'x > 48', 'x <= 48', 'x < 48'], range: { min: 40, max: 56 } },
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

      var iqStartQuiz = function() {
        var pool = getQuizPool();
        var q = pool[Math.floor(Math.random() * pool.length)];
        var shuffled = q.opts.slice().sort(function() { return Math.random() - 0.5; });
        upd({
          quiz: { q: q.q, a: q.a, opts: shuffled, answered: false, score: (d.quiz && d.quiz.score) || 0, streak: (d.quiz && d.quiz.streak) || 0 },
          range: q.range || { min: -10, max: 10 }
        });
        // Track tier
        var nt = Object.assign({}, tiersUsed);
        nt[quizTier === 'all' ? 'mixed' : quizTier] = true;
        upd('tiersUsed', nt);
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

      // ── STEP-BY-STEP SOLVER ──
      var solverExpr = d.solverExpr || '';
      var solverSteps = d.solverSteps || null;
      var solverRevealIdx = d.solverRevealIdx || 0;

      var solveInequality = function(raw) {
        if (!raw) return null;
        var steps = [];
        var s = raw.replace(/\s+/g, '');
        var m = s.match(/(-?\d*)([a-z])([+-]\d+\.?\d*)([<>]=?|[\u2264\u2265])(-?\d+\.?\d*)/);
        if (!m) return null;
        var aStr = m[1], v = m[2], bStr = m[3], opRaw = m[4], cStr = m[5];
        var a = aStr === '' || aStr === '+' ? 1 : aStr === '-' ? -1 : parseFloat(aStr);
        var b = parseFloat(bStr);
        var c = parseFloat(cStr);
        var op = opRaw.replace('\u2264', '<=').replace('\u2265', '>=');
        steps.push({ text: 'Start: ' + raw, highlight: false });
        var rhs1 = c - b;
        steps.push({ text: (b < 0 ? 'Add ' + (-b) + ' to both sides:' : 'Subtract ' + b + ' from both sides:'), highlight: false });
        steps.push({ text: (a === 1 ? '' : a === -1 ? '-' : a) + v + ' ' + op + ' ' + rhs1, highlight: true });
        if (a !== 1) {
          var flipOp = op;
          if (a < 0) {
            flipOp = op.replace('<', 'TEMP').replace('>', '<').replace('TEMP', '>');
            steps.push({ text: 'Divide both sides by ' + a + ' \u2014 FLIP the inequality sign!', highlight: false, warning: true });
          } else {
            steps.push({ text: 'Divide both sides by ' + a + ':', highlight: false });
          }
          var result = rhs1 / a;
          var resultStr = Number.isInteger(result) ? String(result) : result.toFixed(2);
          steps.push({ text: v + ' ' + flipOp + ' ' + resultStr, highlight: true });
        }
        steps.push({ text: '\u2705 Solution found!', highlight: false, final: true });
        var finalOp2 = a < 0 ? op.replace('<', 'TEMP').replace('>', '<').replace('TEMP', '>') : op;
        var finalResult = rhs1 / a;
        var finalResultStr = Number.isInteger(finalResult) ? String(finalResult) : finalResult.toFixed(2);
        steps.solution = v + ' ' + finalOp2 + ' ' + finalResultStr;
        return steps;
      };

      var zoomRange = function(factor) {
        var mid = (range.min + range.max) / 2;
        var half = Math.round((range.max - range.min) * factor / 2);
        if (half < 2) half = 2;
        if (half > 100) half = 100;
        upd('range', { min: Math.round(mid - half), max: Math.round(mid + half) });
      };

      // ── AI Tutor ──
      function askAI() {
        if (aiLoading) return;
        upd({ showAI: true, aiLoading: true, aiResponse: '' });
        var prompt = 'You are a friendly math tutor helping a student learn about inequalities and number line graphs. ';
        if (ineq) {
          prompt += 'They are graphing: ' + (d.expr || '') + '. ';
          if (ineq.compound) {
            prompt += 'This is a compound inequality. Explain what the interval notation ' + intervalStr + ' means in plain language. ';
          } else if (ineq.absSource) {
            prompt += 'This involves absolute value. Explain how ' + ineq.absSource + ' decomposes into simpler inequalities. ';
          } else {
            prompt += 'Explain what this inequality means, when the dot is open vs closed, and give a real-world example. ';
          }
        } else if (d.quiz && d.quiz.answered && !d.quiz.correct) {
          prompt += 'They got a quiz question wrong: "' + d.quiz.q + '". Correct answer: ' + d.quiz.a + '. ';
          prompt += 'Explain the difference between the options and why the correct answer is right. ';
        } else {
          prompt += 'Give a helpful tip about reading or writing inequalities, or about interval notation. Include a real-world example. ';
        }
        prompt += 'Keep it to 2-3 sentences, encouraging and clear.';
        callGemini(prompt, false, false, 0.7).then(function(resp) {
          upd({ aiResponse: resp || 'No response received.', aiLoading: false });
        }).catch(function() {
          upd({ aiResponse: 'AI tutor is unavailable right now. Try again later!', aiLoading: false });
        });
      }

      // ── Keyboard shortcuts ──
      React.useEffect(function() {
        function handleKey(e) {
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

      return h('div', { className: 'max-w-5xl mx-auto animate-in fade-in duration-200' },

        // ── Header ──
        h('section', { 'data-inequality-command': 'true', className: 'mb-4 overflow-hidden rounded-2xl border border-fuchsia-300/40 bg-gradient-to-br from-slate-950 via-fuchsia-950 to-purple-950 text-white shadow-xl' },
          h('div', { className: 'p-4 sm:p-5' },
            h('div', { className: 'flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between' },
              h('div', { className: 'min-w-0' },
                h('div', { className: 'flex flex-wrap items-center gap-2' },
                  h('button', { onClick: function() { setStemLabTool(null); }, className: 'shrink-0 rounded-lg border border-white/20 bg-white/10 p-2 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-fuchsia-300', 'aria-label': __alloT('stem.inequality.back_to_tools', 'Back to tools') }, h(ArrowLeft, { size: 18 })),
                  h('span', { className: 'rounded-full bg-fuchsia-300/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-100 ring-1 ring-fuchsia-200/30' }, __alloT('stem.inequality.solution_set_studio', 'Solution-set studio')),
                  earnedCount > 0 && h('button', { onClick: function() { upd('showBadges', !showBadges); }, className: 'rounded-full border border-amber-300/40 bg-amber-300/15 px-2.5 py-1 text-[10px] font-bold text-amber-100' }, '\uD83C\uDFC5 ' + earnedCount + '/' + BADGES.length),
                  h('button', { onClick: askAI, className: 'rounded-full border border-violet-300/40 bg-violet-300/15 px-2.5 py-1 text-[10px] font-bold text-violet-100' }, '\uD83E\uDDE0 AI')
                ),
                h('h3', { className: 'mt-3 text-xl font-black tracking-tight sm:text-2xl' }, '\uD83C\uDFA8 ' + __alloT('stem.inequality.inequality_grapher', 'Inequality Grapher')),
                h('p', { className: 'mt-1 max-w-2xl text-sm leading-6 text-fuchsia-100' }, __alloT('stem.inequality.tool_intro_blurb', 'Test values, represent solution sets, and justify boundaries with algebraic and graphical evidence.')),
                h('div', { className: 'mt-3 rounded-xl border border-white/15 bg-white/10 p-3' },
                  h('p', { className: 'text-[10px] font-black uppercase tracking-[0.16em] text-fuchsia-200' }, __alloT('stem.inequality.recommended_next_move', 'Recommended next move')),
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
                    h('div', { className: 'mt-1 text-[10px] font-bold uppercase tracking-wider text-fuchsia-200' }, metric.label)
                  );
                })
              )
            ),
            h('ol', { className: 'mt-4 grid gap-2 text-xs sm:grid-cols-3', 'aria-label': 'Inequality reasoning pathway' },
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
                h('div', { className: 'text-[11px] font-bold mt-0.5 ' + (earned ? 'text-amber-800' : 'text-slate-600') }, _bt(badge.label))
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
          aiLoading
            ? h('div', { className: 'flex items-center gap-2' },
                h('div', { className: 'w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin' }),
                h('span', { className: 'text-xs text-purple-600' }, __alloT('stem.inequality.thinking', 'Thinking...'))
              )
            : h('p', { className: 'text-sm text-purple-700 whitespace-pre-wrap leading-relaxed' }, aiResponse),
          !aiLoading && h('button', { 'aria-label': __alloT('stem.inequality.ask_again', 'Ask Again'),
            onClick: askAI,
            className: 'mt-2 text-[11px] font-bold px-3 py-1 rounded-full bg-purple-100 text-purple-600 hover:bg-purple-200 border border-purple-600 transition-all'
          }, '\uD83D\uDD04 ' + __alloT('stem.inequality.ask_again', 'Ask Again'))
        ),

        h('p', { className: 'text-xs text-slate-600 italic -mt-1 mb-3' },
          graphMode === '2d'
            ? __alloT('stem.inequality.hint_type_2d', 'Type a two-variable inequality like y > 2x + 1 to graph on the Cartesian plane.')
            : __alloT('stem.inequality.hint_type_1d', 'Type an inequality like x > 3 or a compound like -2 < x \u2264 5 to visualize it on a number line.')),

        // ── Mode tabs: 1D / 2D ──
        h('div', { className: 'flex gap-1 mb-3', role: 'tablist', },
          ['1d', '2d'].map(function(m) {
            var labels = { '1d': '\uD83D\uDCCF ' + __alloT('stem.inequality.mode_number_line', 'Number Line'), '2d': '\uD83D\uDCC8 ' + __alloT('stem.inequality.mode_2d_graph', '2D Graph') };
            return h('button', { key: m, role: 'tab', 'aria-selected': graphMode === m,
              onClick: function() { upd('graphMode', m); trackMode(m); },
              className: 'min-h-[2.5rem] whitespace-nowrap px-3 py-2 text-xs font-bold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-fuchsia-400 ' +
                (graphMode === m ? 'bg-fuchsia-600 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'),
              title: m === '1d' ? __alloT('stem.inequality.shortcut_1_key', '1 key') : __alloT('stem.inequality.shortcut_2_key', '2 key')
            }, labels[m]);
          })
        ),

        // ── Topic-accent hero band per mode ──
        (function() {
          var MODE_META = {
            '1d': { accent: '#c026d3', soft: 'rgba(192,38,211,0.10)', icon: '\uD83D\uDCCF', title: __alloT('stem.inequality.hero_1d_title', 'Number Line \u2014 1D inequalities'),                  hint: __alloT('stem.inequality.hero_1d_hint', 'Open circle for < and >, closed for \u2264 and \u2265. Compound inequalities (-2 < x \u2264 5) shade the band BETWEEN the two endpoints. Common Core 6.EE.8, 7.EE.4.') },
            '2d': { accent: '#a855f7', soft: 'rgba(168,85,247,0.10)', icon: '\uD83D\uDCC8', title: __alloT('stem.inequality.hero_2d_title', '2D Graph \u2014 inequality regions'),                hint: __alloT('stem.inequality.hero_2d_hint', 'Solid line for \u2264/\u2265, dashed for </>. Test point (0,0) tells you which side to shade. Multiple constraints overlap into a feasible region \u2014 the foundation of linear programming.') }
          };
          var meta = MODE_META[graphMode] || MODE_META['1d'];
          return h('div', {
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
              h('p', { style: { margin: '3px 0 0', color: 'var(--allo-stem-text-soft, #475569)', fontSize: 11, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
            )
          );
        })(),

        // ── Input + presets ──
        h('div', { className: 'flex items-center gap-2 mb-3' },
          h('input', {
            type: 'text', value: d.expr || '',
            placeholder: graphMode === '2d' ? 'y > 2x + 1' : 'x > 3 or -2 < x \u2264 5',
            onChange: function(e) { upd('expr', e.target.value); },
            onKeyDown: function(e) { if (e.key === 'Enter') addToHistory(d.expr); },
            className: 'px-4 py-2 border-2 border-fuchsia-600 rounded-lg font-mono text-lg text-center w-52 focus:ring-2 focus:ring-fuchsia-400 outline-none',
            'aria-label': __alloT('stem.inequality.aria_expression_input', 'Inequality expression input')
          })
        ),
        h('div', { className: 'flex flex-wrap gap-1.5 mb-3' },
          PRESETS.map(function(ex) {
            return h('button', { key: ex.label,
              onClick: function() { upd('expr', ex.expr); },
              className: 'px-2 py-1 text-[11px] font-bold bg-fuchsia-50 text-fuchsia-600 rounded border border-fuchsia-600 hover:bg-fuchsia-100 transition-all'
            }, ex.label);
          })
        ),

        // ── SVG Number line (1D mode) ──
        graphMode === '1d' && h('svg', { viewBox: '0 0 ' + W + ' ' + H, className: 'w-full rounded-xl border-2 shadow-sm ' + (isDark ? 'bg-slate-900 border-fuchsia-800' : 'bg-white border-fuchsia-200'), role: 'img', 'aria-label': __alloT('stem.inequality.aria_number_line_graph', 'Number line inequality graph') },
          ineq && !ineq.compound && (function() {
            var sxVal = toSX(ineq.val);
            if (ineq.op.includes('>')) {
              return h('g', null,
                h('defs', null, h('linearGradient', { id: 'ineqGrad', x1: '0', y1: '0', x2: '1', y2: '0' },
                  h('stop', { offset: '0%', stopColor: '#d946ef', stopOpacity: '0.05' }),
                  h('stop', { offset: '15%', stopColor: '#d946ef', stopOpacity: '0.15' }),
                  h('stop', { offset: '100%', stopColor: '#d946ef', stopOpacity: '0.15' }))),
                h('rect', { x: sxVal, y: 25, width: W - pad - sxVal, height: 50, fill: 'url(#ineqGrad)', rx: 4 }));
            } else {
              return h('g', null,
                h('defs', null, h('linearGradient', { id: 'ineqGrad', x1: '1', y1: '0', x2: '0', y2: '0' },
                  h('stop', { offset: '0%', stopColor: '#d946ef', stopOpacity: '0.05' }),
                  h('stop', { offset: '15%', stopColor: '#d946ef', stopOpacity: '0.15' }),
                  h('stop', { offset: '100%', stopColor: '#d946ef', stopOpacity: '0.15' }))),
                h('rect', { x: pad, y: 25, width: sxVal - pad, height: 50, fill: 'url(#ineqGrad)', rx: 4 }));
            }
          })(),
          ineq && ineq.compound && h('rect', { x: toSX(ineq.lo), y: 25, width: toSX(ineq.hi) - toSX(ineq.lo), height: 50, fill: 'rgba(217,70,239,0.12)', rx: 4 }),
          h('line', { x1: pad, y1: 50, x2: W - pad, y2: 50, stroke: '#94a3b8', strokeWidth: 2 }),
          (function() {
            var lblStep = Math.max(1, Math.ceil((range.max - range.min) / 20));
            return Array.from({ length: range.max - range.min + 1 }, function(_, i) { return range.min + i; }).map(function(n) {
              var isOrigin = n === 0;
              var showLbl = isOrigin || n % lblStep === 0;
              return h('g', { key: n },
                h('line', { x1: toSX(n), y1: isOrigin ? 38 : 43, x2: toSX(n), y2: isOrigin ? 62 : 57, stroke: isOrigin ? (isDark ? '#e2e8f0' : '#1e293b') : '#94a3b8', strokeWidth: isOrigin ? 2 : 1, opacity: showLbl ? 1 : 0.45 }),
                showLbl && h('text', { x: toSX(n), y: 85, textAnchor: 'middle', fill: isOrigin ? (isDark ? '#e2e8f0' : '#1e293b') : '#94a3b8', style: { fontSize: isOrigin ? '11px' : '9px', fontWeight: isOrigin ? 'bold' : 'normal' } }, n));
            });
          })(),
          ineq && !ineq.compound && (function() {
            var sxVal = toSX(ineq.val);
            var endX = ineq.op.includes('>') ? W - pad : pad;
            var isClosed = ineq.op.includes('=');
            var endpointLbl = (isClosed ? '● included' : '○ excluded') + ' (x = ' + ineq.val + ')';
            return h('g', null,
              h('line', { x1: sxVal + (ineq.op.includes('>') ? 8 : -8), y1: 50, x2: endX, y2: 50, stroke: '#d946ef', strokeWidth: 3.5, style: { filter: 'drop-shadow(0 0 3px rgba(217,70,239,0.55))' } }),
              h('circle', { cx: sxVal, cy: 50, r: 6, fill: isClosed ? '#d946ef' : 'white', stroke: '#d946ef', strokeWidth: 2.5 }),
              h('text', { x: sxVal, y: 18, textAnchor: 'middle', fill: '#a21caf', style: { fontSize: '10px', fontWeight: 'bold' } }, ineq.v + ' = ' + ineq.val),
              h('text', { x: sxVal, y: 26, textAnchor: 'middle', fill: '#a21caf', style: { fontSize: '9px', fontWeight: 'bold' } }, endpointLbl),
              ineq.op.includes('>') && h('polygon', { points: (W - pad) + ',50 ' + (W - pad - 10) + ',43 ' + (W - pad - 10) + ',57', fill: '#d946ef' }),
              ineq.op.includes('<') && h('polygon', { points: pad + ',50 ' + (pad + 10) + ',43 ' + (pad + 10) + ',57', fill: '#d946ef' }));
          })(),
          ineq && ineq.compound && h('g', null,
            h('line', { x1: toSX(ineq.lo), y1: 50, x2: toSX(ineq.hi), y2: 50, stroke: '#d946ef', strokeWidth: 3.5, style: { filter: 'drop-shadow(0 0 3px rgba(217,70,239,0.55))' } }),
            h('circle', { cx: toSX(ineq.lo), cy: 50, r: 6, fill: ineq.op1.includes('=') ? '#d946ef' : 'white', stroke: '#d946ef', strokeWidth: 2.5 }),
            h('circle', { cx: toSX(ineq.hi), cy: 50, r: 6, fill: ineq.op2.includes('=') ? '#d946ef' : 'white', stroke: '#d946ef', strokeWidth: 2.5 }),
            h('text', { x: toSX(ineq.lo), y: 26, textAnchor: 'middle', fill: '#a21caf', style: { fontSize: '9px', fontWeight: 'bold' } },
              (ineq.op1.includes('=') ? '● x = ' : '○ x = ') + ineq.lo),
            h('text', { x: toSX(ineq.hi), y: 26, textAnchor: 'middle', fill: '#a21caf', style: { fontSize: '9px', fontWeight: 'bold' } },
              (ineq.op2.includes('=') ? '● x = ' : '○ x = ') + ineq.hi)),
          h('polygon', { points: (W - pad) + ',50 ' + (W - pad - 8) + ',45 ' + (W - pad - 8) + ',55', fill: '#94a3b8' }),
          h('polygon', { points: pad + ',50 ' + (pad + 8) + ',45 ' + (pad + 8) + ',55', fill: '#94a3b8' }),
          testResult !== null && (function() {
            var tvp = parseFloat(testVal);
            if (tvp >= range.min && tvp <= range.max) {
              var tx = toSX(tvp);
              return h('g', null,
                h('line', { x1: tx, y1: 25, x2: tx, y2: 75, stroke: testResult ? '#10b981' : '#ef4444', strokeWidth: 2, strokeDasharray: '4,2' }),
                h('text', { x: tx, y: 118, textAnchor: 'middle', fill: testResult ? '#10b981' : '#ef4444', style: { fontSize: '10px', fontWeight: 'bold' } },
                  (testResult ? '\u2705 ' : '\u274C ') + tvp));
            }
            return null;
          })()
        ),

        // ── 2D Cartesian Graph ──
        graphMode === '2d' && (function() {
          var ineq2d = parse2D(d.expr);
          var gridLines = [];
          for (var gi = gRange.xMin; gi <= gRange.xMax; gi++) {
            gridLines.push(h('line', { key: 'gx' + gi, x1: toGX(gi), y1: pad2, x2: toGX(gi), y2: H2 - pad2, stroke: gi === 0 ? (isDark ? '#94a3b8' : '#475569') : (isDark ? '#1e293b' : '#e2e8f0'), strokeWidth: gi === 0 ? 2 : 0.5 }));
          }
          for (var gj = gRange.yMin; gj <= gRange.yMax; gj++) {
            gridLines.push(h('line', { key: 'gy' + gj, x1: pad2, y1: toGY(gj), x2: W2 - pad2, y2: toGY(gj), stroke: gj === 0 ? (isDark ? '#94a3b8' : '#475569') : (isDark ? '#1e293b' : '#e2e8f0'), strokeWidth: gj === 0 ? 2 : 0.5 }));
          }
          var axLabels = [];
          for (var al = gRange.xMin; al <= gRange.xMax; al += 2) {
            if (al !== 0) axLabels.push(h('text', { key: 'xl' + al, x: toGX(al), y: toGY(0) + 14, textAnchor: 'middle', fill: '#94a3b8', style: { fontSize: '8px' } }, al));
          }
          for (var bl = gRange.yMin; bl <= gRange.yMax; bl += 2) {
            if (bl !== 0) axLabels.push(h('text', { key: 'yl' + bl, x: toGX(0) - 10, y: toGY(bl) + 3, textAnchor: 'end', fill: '#94a3b8', style: { fontSize: '8px' } }, bl));
          }
          var boundaryEls = [];
          if (ineq2d) {
            var sl = ineq2d.slope, ic = ineq2d.intercept, op2d = ineq2d.op;
            var isDashed = !op2d.includes('=');
            var clipPts = [];
            var above = op2d.includes('>');
            var lx1 = gRange.xMin, ly1 = sl * lx1 + ic, lx2 = gRange.xMax, ly2 = sl * lx2 + ic;
            if (above) {
              clipPts = [toGX(lx1)+','+toGY(ly1), toGX(lx2)+','+toGY(ly2), toGX(lx2)+','+pad2, toGX(lx1)+','+pad2];
            } else {
              clipPts = [toGX(lx1)+','+toGY(ly1), toGX(lx2)+','+toGY(ly2), toGX(lx2)+','+(H2-pad2), toGX(lx1)+','+(H2-pad2)];
            }
            boundaryEls.push(h('polygon', { key: 'shade', points: clipPts.join(' '), fill: 'rgba(217,70,239,0.12)' }));
            boundaryEls.push(h('line', { key: 'bline', x1: toGX(lx1), y1: toGY(ly1), x2: toGX(lx2), y2: toGY(ly2), stroke: '#d946ef', strokeWidth: 2.5, strokeDasharray: isDashed ? '6,4' : 'none' }));
            // (0,0) test point — the side it lands on tells you which region to shade (at x=0 the line is y=ic)
            var inc2d = op2d.includes('=');
            var originSat = above ? (inc2d ? 0 >= ic : 0 > ic) : (inc2d ? 0 <= ic : 0 < ic);
            boundaryEls.push(h('circle', { key: 'testpt', cx: toGX(0), cy: toGY(0), r: 5, fill: originSat ? '#22c55e' : '#ef4444', stroke: '#fff', strokeWidth: 1.5 }));
            boundaryEls.push(h('text', { key: 'testlbl', x: toGX(0) + 8, y: toGY(0) - 6, fill: originSat ? '#16a34a' : '#dc2626', style: { fontSize: '9px', fontWeight: 'bold' } }, originSat ? '(0,0) ✓' : '(0,0) ✗'));
          }
          return h('svg', { viewBox: '0 0 ' + W2 + ' ' + H2, className: 'w-full rounded-xl border-2 shadow-sm ' + (isDark ? 'bg-slate-900 border-fuchsia-800' : 'bg-white border-fuchsia-200'), style: { maxWidth: 420 }, role: 'img', 'aria-label': '2D inequality graph' },
            gridLines, axLabels, boundaryEls,
            h('text', { x: W2 - pad2 + 5, y: toGY(0) + 4, fill: isDark ? '#94a3b8' : '#475569', style: { fontSize: '11px', fontWeight: 'bold' } }, 'x'),
            h('text', { x: toGX(0) + 5, y: pad2 - 5, fill: isDark ? '#94a3b8' : '#475569', style: { fontSize: '11px', fontWeight: 'bold' } }, 'y'),
            !ineq2d && h('text', { x: W2 / 2, y: H2 / 2, textAnchor: 'middle', fill: '#94a3b8', style: { fontSize: '13px' } }, 'Enter y > mx + b to plot')
          );
        })(),

        // ── Legend ──
        h('div', { className: 'flex items-center justify-center gap-6 mt-2 text-xs' },
          h('span', { className: 'flex items-center gap-1.5 text-fuchsia-700 font-bold' },
            h('span', { style: { display: 'inline-block', width: 10, height: 10, borderRadius: '50%', backgroundColor: '#d946ef' } }),
            __alloT('stem.inequality.legend_closed', 'Closed (\u2264 \u2265) includes the value')),
          h('span', { className: 'flex items-center gap-1.5 text-fuchsia-700 font-bold' },
            h('span', { style: { display: 'inline-block', width: 10, height: 10, borderRadius: '50%', backgroundColor: 'white', border: '2px solid #d946ef' } }),
            __alloT('stem.inequality.legend_open', 'Open (< >) excludes the value'))
        ),

        // ── Range controls ──
        h('div', { className: 'flex items-center justify-center gap-2 mt-2' },
          h('button', { onClick: function() { shiftRange(-5); }, className: 'px-2 py-0.5 text-[11px] font-bold bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-all', title: __alloT('stem.inequality.shift_range_left', 'Shift range left') }, '\u25C0 -5'),
          h('button', { onClick: function() { zoomRange(1.5); }, className: 'px-2 py-0.5 text-[11px] font-bold bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-all', title: __alloT('stem.inequality.zoom_out', 'Zoom out') }, '\u2212 ' + __alloT('stem.inequality.zoom', 'Zoom')),
          h('span', { className: 'text-[11px] text-slate-600 font-mono' }, '[' + range.min + ', ' + range.max + ']'),
          h('button', { onClick: function() { zoomRange(0.67); }, className: 'px-2 py-0.5 text-[11px] font-bold bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-all', title: __alloT('stem.inequality.zoom_in', 'Zoom in') }, '+ ' + __alloT('stem.inequality.zoom', 'Zoom')),
          h('button', { 'aria-label': '+5', onClick: function() { shiftRange(5); }, className: 'px-2 py-0.5 text-[11px] font-bold bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-all', title: __alloT('stem.inequality.shift_range_right', 'Shift range right') }, '+5 \u25B6'),
          h('button', { 'aria-label': __alloT('stem.inequality.reset_range', 'Reset range'), onClick: function() { upd('range', { min: -10, max: 10 }); }, className: 'px-2 py-0.5 text-[11px] font-bold bg-fuchsia-50 text-fuchsia-500 rounded hover:bg-fuchsia-100 transition-all', title: __alloT('stem.inequality.reset_range', 'Reset range') }, '\u21BA')
        ),

        // === H7b'' inquiry widget: inequality test ===
        (function() {
          var iq = d._ineqHunt || { xVal: 0, coef: 1, bound: 5, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
          function setIQ(patch) { upd('_ineqHunt', Object.assign({}, iq, patch)); }
          var lhs = iq.coef * iq.xVal;
          var state;
          if (Math.abs(lhs - iq.bound) < 0.5) state = 'boundary';
          else if (lhs < iq.bound) state = 'included';
          else state = 'excluded';
          var sm = {
            included: { label: '✅ ' + __alloT('stem.inequality.test_included', 'x INCLUDED in solution (coef·x < bound)'), color: '#059669', bg: '#ecfdf5', border: '#86efac' },
            excluded: { label: '❌ ' + __alloT('stem.inequality.test_excluded', 'x EXCLUDED (coef·x > bound)'), color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
            boundary: { label: '⚖️ ' + __alloT('stem.inequality.test_boundary', 'AT boundary (coef·x ≈ bound)'), color: '#d97706', bg: '#fffbeb', border: '#fcd34d' }
          }[state];
          return h('div', { className: 'mt-3 p-3 rounded-xl bg-white border border-fuchsia-300 space-y-2' },
            h('h3', { className: 'text-sm font-black text-fuchsia-700' }, '🎚️ ' + __alloT('stem.inequality.test_discovery_title', 'Inequality test discovery')),
            h('p', { className: 'text-[11px] text-slate-700' }, __alloT('stem.inequality.test_discovery_desc', 'Sliders for x, coefficient, bound. Test whether coef·x < bound. 3 discrete states. No score, no reveal.')),
            h('div', { className: 'p-2 rounded text-center', style: { background: sm.bg, border: '1px solid ' + sm.border } },
              h('div', { className: 'text-sm font-black', style: { color: sm.color } }, sm.label),
              h('div', { className: 'text-[10px] text-slate-700 font-mono mt-1' }, iq.coef + ' × ' + iq.xVal + ' = ' + lhs + '   ?  ' + iq.bound)
            ),
            h('div', { className: 'grid grid-cols-3 gap-2' },
              [{ k: 'xVal', l: 'x' }, { k: 'coef', l: 'coef' }, { k: 'bound', l: 'bound' }].map(function(s) {
                return h('div', { key: s.k },
                  h('label', { htmlFor: 'ih-' + s.k, className: 'block text-[10px] font-bold text-slate-700' }, s.l + ': ', h('span', { className: 'font-mono text-fuchsia-700' }, iq[s.k])),
                  h('input', { id: 'ih-' + s.k, type: 'range', min: -10, max: 10, step: 1, value: iq[s.k],
                    onChange: function(e) { var p = {}; p[s.k] = parseInt(e.target.value, 10); setIQ(p); },
                    className: 'w-full', 'aria-label': s.l }));
              })
            ),
            h('div', { className: 'flex gap-2 items-center flex-wrap' },
              h('button', { onClick: function() { setIQ({ log: (iq.log || []).concat([{ x: iq.xVal, c: iq.coef, b: iq.bound, st: state }]).slice(-8) }); }, className: 'px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-700 border border-slate-300' }, '📋 ' + __alloT('stem.inequality.log', 'Log')),
              h('button', { onClick: function() { setIQ({ xVal: 0, coef: 1, bound: 5, log: [], hypothesis: '', stuckRevealed: false, understood: false, explanation: '' }); }, className: 'px-2 py-0.5 rounded bg-white text-[10px] font-semibold text-slate-600 border border-slate-300' }, '↺ ' + __alloT('stem.inequality.reset', 'Reset'))
            ),
            h('textarea', { value: iq.hypothesis || '', onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, placeholder: __alloT('stem.inequality.hypothesis_placeholder', 'Hypothesis: When does a negative coefficient flip the inequality?'),
              className: 'w-full text-[11px] border border-slate-300 rounded p-1 font-mono leading-snug', rows: 2 }),
            !iq.stuckRevealed && h('button', { onClick: function() { setIQ({ stuckRevealed: true }); }, className: 'px-2 py-0.5 rounded bg-amber-50 text-[10px] font-bold text-amber-800 border border-amber-300' }, '🤔 ' + __alloT('stem.inequality.stuck_show_prompts', 'Stuck — show open prompts')),
            iq.stuckRevealed && h('div', { className: 'p-2 rounded bg-amber-50 border border-amber-200 text-[10px] text-slate-700' },
              h('ul', { className: 'list-disc pl-4 space-y-0.5' },
                h('li', null, __alloT('stem.inequality.prompt_test_x5', 'Test x = 5 with coef = -2 and bound = 5. What happens?')),
                h('li', null, __alloT('stem.inequality.prompt_why_flip', 'Why does multiplying by negative flip < to >?')))),
            h('label', { className: 'flex items-center gap-1 text-[10px] font-bold text-emerald-800 cursor-pointer' },
              h('input', { type: 'checkbox', checked: !!iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); }, className: 'w-3 h-3' }),
              __alloT('stem.inequality.understand_explain', 'I understand — explain in own words')),
            iq.understood && h('textarea', { value: iq.explanation || '', onChange: function(e) { setIQ({ explanation: e.target.value }); }, placeholder: __alloT('stem.inequality.explain_placeholder', 'Explain inequality test logic.'),
              className: 'w-full text-[11px] border border-emerald-300 rounded p-1 font-mono leading-snug mt-1', rows: 3 }),
            h('div', { className: 'text-[10px] italic text-slate-500' }, __alloT('stem.inequality.design_note_test', 'Design note: discrete 3-state test marker; no answer reveal — by design.'))
          );
        })(),

        // ── Notation display ──
        ineq && h('div', { className: 'mt-3 grid grid-cols-2 gap-3' },
          h('div', { className: 'bg-fuchsia-50 rounded-lg p-3 border border-fuchsia-200 text-center' },
            h('p', { className: 'text-[11px] font-bold text-fuchsia-500 uppercase tracking-wider mb-1' }, __alloT('stem.inequality.interval_notation', 'Interval Notation')),
            h('p', { className: 'text-lg font-bold text-fuchsia-800 font-mono' }, intervalStr)),
          h('div', { className: 'bg-violet-50 rounded-lg p-3 border border-violet-200 text-center' },
            h('p', { className: 'text-[11px] font-bold text-violet-500 uppercase tracking-wider mb-1' }, __alloT('stem.inequality.set_builder_notation', 'Set-Builder Notation')),
            h('p', { className: 'text-sm font-bold text-violet-800 font-mono' }, setBuilderStr))
        ),

        // ── Test-a-Value panel ──
        h('div', { className: 'mt-3 bg-sky-50 rounded-lg p-3 border border-sky-200' },
          h('p', { className: 'text-[11px] font-bold text-sky-600 uppercase tracking-wider mb-2' }, '\uD83E\uDDEA ' + __alloT('stem.inequality.test_a_value', 'Test a Value')),
          h('div', { className: 'flex items-center gap-2' },
            h('input', {
              type: 'number', step: 'any', value: testVal, placeholder: __alloT('stem.inequality.enter_a_number', 'Enter a number\u2026'),
              onChange: function(e) {
                upd('testVal', e.target.value);
                if (e.target.value !== '') {
                  var newTC = testCount + 1;
                  upd('testCount', newTC);
                  if (newTC >= 10) checkBadges({ testMaster: true });
                }
              },
              'aria-label': __alloT('stem.inequality.aria_test_a_value', 'Test a value against the inequality'),
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
            className: 'text-[11px] font-bold text-amber-600 hover:text-amber-700 transition-all',
            title: __alloT('stem.inequality.toggle_tips', 'Toggle tips (C)')
          }, (showCoach ? '\u25BC' : '\u25B6') + ' \uD83D\uDCA1 ' + __alloT('stem.inequality.learning_tips', 'Learning Tips')),
          showCoach && h('div', { className: 'mt-2 bg-amber-50 rounded-lg p-3 border border-amber-200 space-y-2' },
            COACH_TIPS.map(function(ct, i) {
              return h('div', { key: i, className: 'flex items-start gap-2' },
                h('span', { className: 'text-sm font-bold text-amber-600 w-5 text-center flex-shrink-0' }, ct.icon),
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
                onClick: function() {
                  upd('quizTier', tier);
                  var nt = Object.assign({}, tiersUsed);
                  nt[tier] = true;
                  upd('tiersUsed', nt);
                  if (nt.easy && nt.medium && nt.hard) checkBadges({ allTiers: true });
                },
                className: 'px-2 py-0.5 rounded text-[11px] font-bold transition-all ' +
                  (isActive ? 'bg-fuchsia-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
              }, labels[tier]);
            })
          ),
          h('div', { className: 'flex items-center gap-2 mb-2' },
            h('button', { 'aria-label': __alloT('stem.inequality.aria_iq_start_quiz', 'Iq Start Quiz'),
              onClick: iqStartQuiz,
              className: 'px-3 py-1.5 rounded-lg text-xs font-bold ' + (d.quiz ? 'bg-fuchsia-100 text-fuchsia-700' : 'bg-fuchsia-600 text-white') + ' transition-all',
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

                    upd({
                      quiz: Object.assign({}, d.quiz, { answered: true, chosen: opt, correct: correct, score: newScore, streak: newStreak, fb: fb }),
                      expr: d.quiz.a,
                      quizCorrectTotal: newQTotal
                    });
                    if (correct) {
                      addToast('\u2705 Correct!' + (newStreak >= 3 ? ' \uD83D\uDD25 ' + newStreak + ' streak!' : ''), 'success');
                      if (typeof awardXP === 'function') awardXP('inequality', 10, 'Inequality Challenge');
                      checkBadges({
                        firstSolve: true,
                        streak5: newStreak >= 5,
                        streak10: newStreak >= 10,
                        quizChamp: newQTotal >= 20
                      });
                      setTimeout(function() { iqStartQuiz(); }, 1500);
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
              d.quiz.streak > 2 && d.quiz.correct && h('span', { className: 'ml-2 text-xs text-amber-600' }, '\uD83D\uDD25 ' + d.quiz.streak + __alloT('stem.inequality.in_a_row_suffix', ' in a row!')),
              !d.quiz.correct && h('button', { 'aria-label': __alloT('stem.inequality.explain', 'Explain'),
                onClick: askAI,
                className: 'ml-2 text-xs font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-600 hover:bg-purple-200'
              }, '\uD83E\uDDE0 ' + __alloT('stem.inequality.explain', 'Explain'))),
            !d.quiz.correct && d.quiz.fb && h('p', { className: 'text-xs leading-relaxed text-red-800 mt-1' }, d.quiz.fb))
        ),

        // ── Absolute Value Decomposition ──
        ineq && ineq.absSource && h('div', { className: 'mt-3 bg-purple-50 rounded-lg p-3 border border-purple-200' },
          h('p', { className: 'text-[11px] font-bold text-purple-600 uppercase tracking-wider mb-2' }, '\uD83D\uDD0D ' + __alloT('stem.inequality.abs_value_decomposition', 'Absolute Value Decomposition')),
          h('p', { className: 'text-xs text-purple-800' }, ineq.absSource + __alloT('stem.inequality.decomposes_to', ' decomposes to:')),
          ineq.compound
            ? h('p', { className: 'text-sm font-bold text-purple-900 font-mono mt-1' },
                ineq.lo + ' ' + (ineq.op1.includes('=') ? '\u2264' : '<') + ' ' + ineq.v + ' ' + (ineq.op2.includes('=') ? '\u2264' : '<') + ' ' + ineq.hi)
            : h('p', { className: 'text-sm font-bold text-purple-900 font-mono mt-1' },
                ineq.v + ' ' + ineq.op + ' ' + ineq.val + '  OR  ' + ineq.absRight.v + ' ' + ineq.absRight.op + ' ' + ineq.absRight.val)
        ),

        // ── Step-by-Step Solver ──
        h('div', { className: 'mt-3 bg-teal-50 rounded-lg p-3 border border-teal-200' },
          h('p', { className: 'text-[11px] font-bold text-teal-600 uppercase tracking-wider mb-2' }, '\uD83E\uDDE0 ' + __alloT('stem.inequality.step_by_step_solver', 'Step-by-Step Solver')),
          h('p', { className: 'text-[11px] text-teal-500 italic mb-2' }, __alloT('stem.inequality.solver_hint_example', 'Enter an inequality like 3x - 7 \u2265 5 or -2x + 4 < 10')),
          h('div', { className: 'flex items-center gap-2 mb-2' },
            h('input', {
              type: 'text', value: solverExpr, placeholder: '3x - 7 \u2265 5',
              onChange: function(e) { upd('solverExpr', e.target.value); },
              'aria-label': __alloT('stem.inequality.aria_solver_input', 'Step-by-step solver inequality input'),
              className: 'px-3 py-1.5 border-2 border-teal-600 rounded-lg font-mono text-sm w-48 text-center focus:ring-2 focus:ring-teal-400 outline-none'
            }),
            h('button', { 'aria-label': __alloT('stem.inequality.solve', 'Solve'),
              onClick: function() {
                var steps = solveInequality(solverExpr);
                if (steps) {
                  var newSC = solverCount + 1;
                  upd({ solverSteps: steps, solverRevealIdx: 1, solverCount: newSC });
                  if (newSC >= 5) checkBadges({ solverPro: true });
                } else {
                  addToast('Could not parse. Try format: 3x - 7 \u2265 5', 'error');
                }
              },
              className: 'px-3 py-1.5 text-xs font-bold bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition-all'
            }, '\uD83D\uDD0D ' + __alloT('stem.inequality.solve', 'Solve')),
            solverSteps && solverSteps.solution && h('button', { 'aria-label': __alloT('stem.inequality.graph_it', 'Graph It'),
              onClick: function() {
                upd({ expr: solverSteps.solution, graphMode: '1d' });
                addToHistory(solverSteps.solution);
                addToast('\uD83D\uDCC8 Graphed the solution!', 'success');
              },
              className: 'px-3 py-1.5 text-[11px] font-bold bg-fuchsia-100 text-fuchsia-700 rounded-lg hover:bg-fuchsia-200 transition-all'
            }, '\uD83D\uDCC8 ' + __alloT('stem.inequality.graph_it', 'Graph It')),
            solverSteps && h('button', { 'aria-label': __alloT('stem.inequality.reset', 'Reset'),
              onClick: function() { upd({ solverSteps: null, solverRevealIdx: 0 }); },
              className: 'px-2 py-1 text-[11px] font-bold text-teal-500 hover:text-teal-700'
            }, '\u21BA ' + __alloT('stem.inequality.reset', 'Reset'))
          ),
          solverSteps && h('div', { className: 'space-y-1.5' },
            solverSteps.slice(0, solverRevealIdx).map(function(step, i) {
              var cls = 'text-xs px-2 py-1 rounded ';
              if (step.warning) cls += 'bg-amber-100 text-amber-800 font-bold border border-amber-300';
              else if (step.highlight) cls += 'bg-teal-100 text-teal-800 font-mono font-bold';
              else if (step.final) cls += 'bg-emerald-100 text-emerald-700 font-bold';
              else cls += 'text-teal-700';
              return h('div', { key: i, className: cls, style: { animation: 'fadeIn 0.3s ease' } }, step.text);
            }),
            solverRevealIdx < solverSteps.length && h('button', { 'aria-label': __alloT('stem.inequality.aria_reveal_next_step', 'Reveal next solver step'),
              onClick: function() { upd('solverRevealIdx', solverRevealIdx + 1); },
              className: 'px-3 py-1 text-[11px] font-bold bg-teal-100 text-teal-700 rounded hover:bg-teal-200 transition-all mt-1'
            }, '\u25B6 ' + __alloT('stem.inequality.next_step', 'Next Step') + ' (' + solverRevealIdx + '/' + (solverSteps.length - 1) + ')')
          )
        ),

        // ── History ──
        exprHistory.length > 0 && h('div', { className: 'mt-3 bg-slate-50 rounded-lg p-3 border border-slate-400' },
          h('div', { className: 'flex items-center justify-between mb-2' },
            h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase tracking-wider' }, '\uD83D\uDD53 ' + __alloT('stem.inequality.recent_expressions', 'Recent Expressions')),
            h('button', { 'aria-label': __alloT('stem.inequality.clear', 'Clear'), onClick: function() { upd('exprHistory', []); }, className: 'text-[11px] text-slate-600 hover:text-slate-800' }, __alloT('stem.inequality.clear', 'Clear'))
          ),
          h('div', { className: 'flex flex-wrap gap-1.5' },
            exprHistory.map(function(ex, i) {
              return h('button', { key: i,
                onClick: function() { upd('expr', ex); },
                className: 'px-2 py-1 text-[11px] font-mono font-bold bg-white text-slate-600 rounded border border-slate-400 hover:bg-fuchsia-50 hover:border-fuchsia-600 transition-all'
              }, ex);
            })
          )
        ),

        // ── Keyboard shortcuts legend ──
        h('div', { className: 'text-[11px] text-slate-600 text-center mt-3 space-x-3' },
          h('span', null, '1 ' + __alloT('stem.inequality.mode_number_line', 'Number Line')),
          h('span', null, '2 ' + __alloT('stem.inequality.mode_2d_graph', '2D Graph')),
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
          className: 'mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all'
        }, '\uD83D\uDCF8 ' + __alloT('stem.inequality.snapshot', 'Snapshot'))
      );
    }
  });
})();
