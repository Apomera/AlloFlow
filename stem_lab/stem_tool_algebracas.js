// =============================================
// stem_tool_algebraCAS.js - Algebra CAS (standalone CDN module)
// Computer Algebra System: solver, equation builder, balance scale, AI tutor
// =============================================

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
    if (document.getElementById('allo-live-algebraCAS')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-algebraCAS';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();


  /* -- StemLab plugin guard -- */
  if (!window.StemLab) {
    window.StemLab = {
      tools: {},
      _registry: {},
      _order: [],
      registerTool: function(id, cfg) {
        cfg.id = id; cfg.ready = cfg.ready !== false;
        this._registry[id] = cfg;
        if (this._order.indexOf(id) === -1) this._order.push(id);
        console.log('[StemLab] Registered tool: ' + id);
      },
      getRegisteredTools: function() {
        var s = this; return this._order.map(function(id) { return s._registry[id]; }).filter(Boolean);
      },
      isRegistered: function(id) { return !!this._registry[id]; },
      renderTool: function(id, ctx) {
        var t = this._registry[id];
        if (!t || !t.render) return null;
        try { return t.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; }
      }
    };
  }
  if (!window.StemLab.registerTool) {
    window.StemLab.registerTool = function(id, cfg) { window.StemLab.tools[id] = cfg; };
  }

  /* ============ Sound Engine (Web Audio API) ============ */
  var _audioCtx = null;
  function getAudioCtx() {
    if (!_audioCtx) { try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} }
    return _audioCtx;
  }
  function playTone(freq, dur, type, vol) {
    var ac = getAudioCtx(); if (!ac) return;
    try {
      var osc = ac.createOscillator(); var g = ac.createGain();
      osc.type = type || 'sine'; osc.frequency.value = freq;
      g.gain.setValueAtTime(vol || 0.12, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      osc.connect(g); g.connect(ac.destination); osc.start(); osc.stop(ac.currentTime + dur);
    } catch(e) {}
  }
  var SOUNDS = {
    solve: function() { playTone(523, 0.08, 'sine', 0.08); setTimeout(function() { playTone(659, 0.1, 'sine', 0.1); }, 80); },
    factor: function() { playTone(440, 0.08, 'triangle', 0.08); setTimeout(function() { playTone(554, 0.1, 'triangle', 0.1); }, 80); },
    simplify: function() { playTone(392, 0.08, 'sine', 0.07); setTimeout(function() { playTone(494, 0.1, 'sine', 0.09); }, 80); },
    expand: function() { playTone(330, 0.08, 'triangle', 0.07); setTimeout(function() { playTone(440, 0.1, 'triangle', 0.09); }, 80); },
    tilePlace: function() { playTone(880, 0.04, 'sine', 0.06); },
    tileRemove: function() { playTone(440, 0.04, 'sine', 0.04); },
    scaleBalance: function() { playTone(660, 0.1, 'sine', 0.08); setTimeout(function() { playTone(880, 0.15, 'sine', 0.1); }, 100); setTimeout(function() { playTone(1047, 0.2, 'sine', 0.12); }, 220); },
    scaleOp: function() { playTone(494, 0.06, 'triangle', 0.06); setTimeout(function() { playTone(587, 0.06, 'triangle', 0.06); }, 50); },
    correct: function() { playTone(523, 0.1, 'sine', 0.1); setTimeout(function() { playTone(659, 0.1, 'sine', 0.1); }, 100); setTimeout(function() { playTone(784, 0.15, 'sine', 0.12); }, 200); },
    wrong: function() { playTone(220, 0.15, 'sawtooth', 0.06); setTimeout(function() { playTone(196, 0.2, 'sawtooth', 0.05); }, 120); },
    badge: function() { playTone(784, 0.1, 'sine', 0.1); setTimeout(function() { playTone(988, 0.1, 'sine', 0.12); }, 120); setTimeout(function() { playTone(1175, 0.2, 'sine', 0.14); }, 240); },
    snapshot: function() { playTone(1200, 0.06, 'square', 0.06); setTimeout(function() { playTone(1600, 0.08, 'sine', 0.08); }, 70); },
    aiTutor: function() { playTone(392, 0.12, 'sine', 0.08); setTimeout(function() { playTone(523, 0.12, 'sine', 0.1); }, 120); },
    tts: function() { playTone(330, 0.06, 'sine', 0.06); }
  };

  /* ============ Badge Definitions (12) ============ */
  var BADGES = [
    { id: 'firstSolve', icon: '\uD83D\uDD22', label: 'First Solve', desc: 'Solve your first equation', xp: 10, check: function(d) { return (d._solveCount || 0) >= 1; } },
    { id: 'fiveSolves', icon: '\uD83C\uDFA8', label: 'Equation Artist', desc: 'Solve 5 equations', xp: 15, check: function(d) { return (d._solveCount || 0) >= 5; } },
    { id: 'factorPro', icon: '\uD83E\uDDE9', label: 'Factor Pro', desc: 'Factor 3 expressions', xp: 15, check: function(d) { return (d._factorCount || 0) >= 3; } },
    { id: 'builderUsed', icon: '\uD83E\uDDF1', label: 'Builder', desc: 'Build an equation with the builder', xp: 10, check: function(d) { return d._builderUsed; } },
    { id: 'scaleSolver', icon: '\u2696', label: 'Scale Solver', desc: 'Solve an equation on the balance scale', xp: 15, check: function(d) { return (d._scaleSolves || 0) >= 1; } },
    { id: 'practiceStreak3', icon: '\uD83D\uDD25', label: 'Streak!', desc: '3 correct answers in a row', xp: 20, check: function(d) { return (d._maxStreak || 0) >= 3; } },
    { id: 'allModes', icon: '\uD83C\uDF1F', label: 'All Modes', desc: 'Use all 4 CAS modes', xp: 15, check: function(d) { var m = d._modesUsed || {}; return m.solve && m.factor && m.simplify && m.expand; } },
    { id: 'difficultyUp', icon: '\uD83D\uDE80', label: 'Aiming High', desc: 'Try Advanced difficulty', xp: 10, check: function(d) { return d._triedAdvanced; } },
    { id: 'aiCurious', icon: '\uD83E\uDD16', label: 'Curious Mind', desc: 'Ask AI tutor 3 questions', xp: 15, check: function(d) { return (d._aiQuestions || 0) >= 3; } },
    { id: 'historyBuff', icon: '\uD83D\uDCDC', label: 'History Buff', desc: 'Build up 10 history entries', xp: 15, check: function(d) { return (d.history || []).length >= 10; } },
    { id: 'balanceMaster', icon: '\uD83C\uDFC5', label: 'Balance Master', desc: 'Solve 3 equations on balance scale', xp: 25, check: function(d) { return (d._scaleSolves || 0) >= 3; } },
    { id: 'algebraChampion', icon: '\uD83C\uDFC6', label: 'Algebra Champion', desc: 'Earn 10 other badges', xp: 50, check: function(d) { return (d._badgesEarned || []).length >= 10; } }
  ];

  /* ============ Grade-Band Helper ============ */
  function getGradeBand(ctx) {
    var g = ctx.gradeLevel || 5;
    if (g <= 2) return 'k2';
    if (g <= 5) return 'g35';
    if (g <= 8) return 'g68';
    return 'g912';
  }


  /* ============ Deterministic CAS engine (ground-truth math; NEVER the LLM) ============ */
  // CSP-safe: a tiny tokenizer + recursive-descent evaluator over + - * / ^, parens, unary
  // minus, sqrt/abs and a single variable x. NO eval()/Function. gradeAnswer is the
  // AUTHORITATIVE practice grader (root-multiset match, else sample-point equivalence);
  // verifySolution substitutes a proposed root back into the equation. Exposed on
  // window.__alloCASPure for unit tests.
  var __alloCASPure = (function () {
    var TOL = 1e-6;
    function normalize(s) {
      if (s == null) return '';
      return String(s)
        .replace(/²/g, '^2').replace(/³/g, '^3')
        .replace(/×/g, '*').replace(/÷/g, '/')
        .replace(/√/g, 'sqrt').replace(/−/g, '-')
        .replace(/\s+/g, '');
    }
    var FUNCS = { sqrt: 1, abs: 1 };
    function tokenize(s) {
      var toks = [], i = 0;
      while (i < s.length) {
        var c = s[i];
        if ((c >= '0' && c <= '9') || c === '.') {
          var num = '';
          while (i < s.length && ((s[i] >= '0' && s[i] <= '9') || s[i] === '.')) { num += s[i]; i++; }
          toks.push({ t: 'num', v: parseFloat(num) });
        } else if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')) {
          var id = '';
          while (i < s.length && ((s[i] >= 'a' && s[i] <= 'z') || (s[i] >= 'A' && s[i] <= 'Z'))) { id += s[i]; i++; }
          var low = id.toLowerCase();
          if (FUNCS[low]) toks.push({ t: 'func', v: low }); else toks.push({ t: 'var', v: low });
        } else if ('+-*/^()'.indexOf(c) >= 0) { toks.push({ t: 'op', v: c }); i++; }
        else return null;
      }
      var out = [];
      for (var k = 0; k < toks.length; k++) {
        if (k > 0) {
          var p = toks[k - 1], q = toks[k];
          var pEnd = (p.t === 'num' || p.t === 'var' || (p.t === 'op' && p.v === ')'));
          var qStart = (q.t === 'num' || q.t === 'var' || q.t === 'func' || (q.t === 'op' && q.v === '('));
          if (pEnd && qStart) out.push({ t: 'op', v: '*' });
        }
        out.push(toks[k]);
      }
      return out;
    }
    function evalTokens(toks, xval) {
      var pos = 0;
      function peek() { return toks[pos]; }
      function next() { return toks[pos++]; }
      function pExpr() { var v = pTerm(); while (peek() && peek().t === 'op' && (peek().v === '+' || peek().v === '-')) { var op = next().v; var r = pTerm(); v = op === '+' ? v + r : v - r; } return v; }
      function pTerm() { var v = pFactor(); while (peek() && peek().t === 'op' && (peek().v === '*' || peek().v === '/')) { var op = next().v; var r = pFactor(); v = op === '*' ? v * r : v / r; } return v; }
      function pFactor() { var v = pBase(); if (peek() && peek().t === 'op' && peek().v === '^') { next(); var r = pFactor(); v = Math.pow(v, r); } return v; }
      function pBase() {
        var tk = peek();
        if (!tk) throw 0;
        if (tk.t === 'op' && tk.v === '-') { next(); return -pBase(); }
        if (tk.t === 'op' && tk.v === '+') { next(); return pBase(); }
        if (tk.t === 'num') { next(); return tk.v; }
        if (tk.t === 'var') { next(); return xval; }
        if (tk.t === 'func') { next(); if (!peek() || peek().v !== '(') throw 0; next(); var a = pExpr(); if (!peek() || peek().v !== ')') throw 0; next(); return tk.v === 'sqrt' ? Math.sqrt(a) : Math.abs(a); }
        if (tk.t === 'op' && tk.v === '(') { next(); var e = pExpr(); if (!peek() || peek().v !== ')') throw 0; next(); return e; }
        throw 0;
      }
      var result = pExpr();
      if (pos !== toks.length) throw 0;
      return result;
    }
    function evalAt(exprStr, xval) {
      try { var toks = tokenize(normalize(exprStr)); if (!toks || !toks.length) return NaN; var v = evalTokens(toks, xval); return (typeof v === 'number' && isFinite(v)) ? v : NaN; } catch (e) { return NaN; }
    }
    function parseEquation(str) { var s = normalize(str); var parts = s.split('='); if (parts.length === 1) return { lhs: parts[0], rhs: '0' }; if (parts.length === 2) return { lhs: parts[0], rhs: parts[1] }; return null; }
    function _constValue(p) { var a = evalAt(p, 0), b = evalAt(p, 1.7); if (isNaN(a)) return NaN; if (Math.abs(a - b) < 1e-9) return a; return NaN; }
    function extractRoots(answerStr) {
      if (answerStr == null) return [];
      var parts = String(answerStr).split(/,|;|\bor\b|\band\b/i), roots = [];
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i].replace(/[a-zA-Z]\s*=\s*/, '').replace(/[{}\[\]]/g, '').trim();
        if (!p) continue;
        var v = _constValue(p);
        if (!isNaN(v)) roots.push(v);
      }
      return roots;
    }
    function _sameMultiset(a, b) { if (a.length !== b.length) return false; var x = a.slice().sort(function (p, q) { return p - q; }), y = b.slice().sort(function (p, q) { return p - q; }); for (var i = 0; i < x.length; i++) if (Math.abs(x[i] - y[i]) > 1e-6 * Math.max(1, Math.abs(x[i]))) return false; return true; }
    function _fmt(n) { var r = Math.round(n * 1e6) / 1e6; return String(r); }
    function verifySolution(exprOrEq, answerStr) {
      var eq = parseEquation(exprOrEq), roots = extractRoots(answerStr);
      if (!eq || !roots.length) return { decidable: false, verified: null, roots: [], residuals: [], detail: 'Not auto-verifiable' };
      var residuals = [], allOk = true, details = [];
      for (var i = 0; i < roots.length; i++) {
        var L = evalAt(eq.lhs, roots[i]), R = evalAt(eq.rhs, roots[i]);
        if (isNaN(L) || isNaN(R)) return { decidable: false, verified: null, roots: roots, residuals: [], detail: 'Not auto-verifiable' };
        var res = L - R; residuals.push(res);
        var tol = TOL * Math.max(1, Math.abs(L), Math.abs(R));
        if (Math.abs(res) > tol) allOk = false;
        details.push('x=' + _fmt(roots[i]) + ': LHS=' + _fmt(L) + ', RHS=' + _fmt(R));
      }
      return { decidable: true, verified: allOk, roots: roots, residuals: residuals, detail: details.join('; ') };
    }
    function gradeAnswer(studentStr, correctStr) {
      var rS = extractRoots(studentStr), rC = extractRoots(correctStr);
      if (rS.length && rC.length) { var ok = _sameMultiset(rS, rC); return { decidable: true, correct: ok, method: 'roots', detail: ok ? 'Both give x = ' + rC.map(_fmt).join(', ') : 'Roots differ' }; }
      var sN = normalize(studentStr), cN = normalize(correctStr);
      if (!sN || !cN) return { decidable: false, correct: false, method: 'na', detail: 'Could not auto-check' };
      var samples = [-3, -2, -1, 0.5, 2, 3, 5], valid = 0, allEq = true;
      for (var i = 0; i < samples.length; i++) {
        var a = evalAt(sN, samples[i]), b = evalAt(cN, samples[i]);
        if (isNaN(a) || isNaN(b)) continue;
        valid++;
        if (Math.abs(a - b) > TOL * Math.max(1, Math.abs(a), Math.abs(b))) allEq = false;
      }
      if (valid >= 3) return { decidable: true, correct: allEq, method: 'sample', detail: allEq ? 'Equivalent at ' + valid + ' test points' : 'Not equivalent' };
      return { decidable: false, correct: false, method: 'na', detail: 'Could not auto-check' };
    }
    return { normalize: normalize, evalAt: evalAt, parseEquation: parseEquation, extractRoots: extractRoots, verifySolution: verifySolution, gradeAnswer: gradeAnswer };
  })();
  try { window.__alloCASPure = __alloCASPure; } catch (_e) {}

  /* ============ TTS Helper (Kokoro-first) ============ */
  function speakText(text, callTTS) {
    SOUNDS.tts();
    if (callTTS) { try { callTTS(text); return; } catch(e) {} }
    if (window._kokoroTTS && window._kokoroTTS.speak) {
      window._kokoroTTS.speak(String(text),'af_heart',1).then(function(url){if(url){var a=new Audio(url);a.playbackRate=0.95;a.play();}}).catch(function(){});
      return;
    }
    if (window.speechSynthesis) {
      var u = new SpeechSynthesisUtterance(text); u.rate = 0.9;
      window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
    }
  }

  /* ============ Register Tool ============ */
  window.StemLab.registerTool('algebraCAS', {
    icon: '\uD83E\uDDEE',
    label: 'Algebra Solver',
    desc: 'Interactive algebra with equation builder, balance scale, and step-by-step AI solving',
    color: 'amber',
    category: 'math',
    questHooks: [
      { id: 'solve_5', label: 'Solve 5 equations', icon: '\uD83D\uDD22', check: function(d) { return (d._solveCount || 0) >= 5; }, progress: function(d) { return (d._solveCount || 0) + '/5'; } },
      { id: 'factor_3', label: 'Factor 3 expressions', icon: '\uD83E\uDDE9', check: function(d) { return (d._factorCount || 0) >= 3; }, progress: function(d) { return (d._factorCount || 0) + '/3'; } },
      { id: 'scale_solve', label: 'Solve an equation on the balance scale', icon: '\u2696\uFE0F', check: function(d) { return (d._scaleSolves || 0) >= 1; }, progress: function(d) { return (d._scaleSolves || 0) >= 1 ? 'Done!' : 'Not yet'; } },
      { id: 'streak_3', label: 'Get a 3-answer correct streak', icon: '\uD83D\uDD25', check: function(d) { return (d._maxStreak || 0) >= 3; }, progress: function(d) { return (d._maxStreak || 0) + '/3 streak'; } },
      { id: 'all_modes', label: 'Use all 4 CAS modes (solve, factor, simplify, expand)', icon: '\uD83C\uDF1F', check: function(d) { var m = d._modesUsed || {}; return !!(m.solve && m.factor && m.simplify && m.expand); }, progress: function(d) { var m = d._modesUsed || {}; return Object.keys(m).length + '/4 modes'; } }
    ],
    render: function(ctx) {
      // honor the 2nd-arg English fallback (ctx.t is single-arg & ignores it; see dev-tools/check_i18n_fallback.cjs)
      var t = function (k, fb) { var v; try { v = (typeof ctx.t === 'function') ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var addToast = ctx.addToast;
      var awardStemXP = ctx.awardXP;
      var stemCelebrate = ctx.celebrate;
      var callGemini = ctx.callGemini;
      var callTTS = ctx.callTTS;
      var gradeLevel = ctx.gradeLevel;
      var announceToSR = ctx.announceToSR;
      var a11yClick = ctx.a11yClick;

      return (function() {
        labToolData = labToolData || {};
        var d = labToolData.algebraCAS || {};

        var upd = function(key, val) {
          setLabToolData(function(prev) {
            prev = prev || {};
            var next = Object.assign({}, prev);
            next.algebraCAS = Object.assign({}, prev.algebraCAS || {});
            next.algebraCAS[key] = val;
            return next;
          });
        };
        var updMulti = function(obj) {
          setLabToolData(function(prev) {
            prev = prev || {};
            return Object.assign({}, prev, { algebraCAS: Object.assign({}, prev.algebraCAS || {}, obj) });
          });
        };

        var band = getGradeBand(ctx);

        /* -- Badge checker -- */
        var checkBadges = function(data) {
          var earned = (data._badgesEarned || []).slice();
          var newBadge = null;
          BADGES.forEach(function(b) {
            if (earned.indexOf(b.id) === -1 && b.check(data)) {
              earned.push(b.id);
              newBadge = b;
              if (awardStemXP) awardStemXP('algebraCAS', b.xp, 'Badge: ' + b.label);
            }
          });
          if (newBadge) {
            SOUNDS.badge();
            if (stemCelebrate) stemCelebrate();
            if (addToast) addToast(newBadge.icon + ' Badge: ' + newBadge.label);
            upd('_badgesEarned', earned);
          }
        };

        /* -- State aliases -- */
        var tab = d.tab || 'solve';
        var expression = d.expression || '';
        var mode = d.mode || 'solve';
        var result = d.result || null;
        var verify = d.verify || null;
        var isLoading = d.isLoading || false;
        var history = d.history || [];
        var difficulty = d.difficulty || 'elementary';
        var practiceQ = d.practiceQ || null;
        var practiceAnswer = d.practiceAnswer || '';
        var practiceFeedback = d.practiceFeedback || null;
        var practiceType = d.practiceType || 'random';
        var practiceScore = d.practiceScore || 0;
        var practiceStreak = d.practiceStreak || 0;
        var showSolution = d.showSolution || false;
        var builderTiles = d.builderTiles || [];
        var scaleEq = d.scaleEq || '';
        var scaleSteps = d.scaleSteps || [];
        var scaleSolved = d.scaleSolved || false;
        var tutorChat = d.tutorChat || [];
        var tutorInput = d.tutorInput || '';

        /* -- Theme-responsive style constants -- */
        var isContrast = !!ctx.isContrast;
        var isDark = !!ctx.isDark;
        var BG = isContrast ? '#000000' : (isDark ? '#0f172a' : '#f8fafc');
        var TEXT = isContrast ? '#ffffff' : (isDark ? '#e2e8f0' : '#0f172a');
        var CARD = isContrast ? '#000000' : (isDark ? 'rgba(99,102,241,0.08)' : '#ffffff');
        var BORDER = isContrast ? '#fbbf24' : (isDark ? 'rgba(129,140,248,0.45)' : '#94a3b8');
        var ACCENT = isContrast ? '#fbbf24' : (isDark ? '#a5b4fc' : '#4338ca');
        var MUTED = isContrast ? '#ffffff' : (isDark ? '#94a3b8' : '#475569');
        var BTN_BG = isContrast ? '#fbbf24' : (isDark ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : 'linear-gradient(135deg,#4338ca,#6d28d9)');
        var BTN_FLAT = isContrast ? '#fbbf24' : (isDark ? '#4f46e5' : '#4338ca');
        var BTN_TEXT = isContrast ? '#000000' : '#ffffff';

        var cardStyle = { background: CARD, border: '1px solid ' + BORDER, borderRadius: '12px', padding: '12px' };
        var btnStyle = function(active) {
          return { background: active ? BTN_FLAT : CARD, color: active ? BTN_TEXT : TEXT,
            border: '1px solid ' + (active ? ACCENT : BORDER), borderRadius: '10px',
            padding: '6px 12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' };
        };

        /* ============ DATA ============ */
        var MODES = [
          { id: 'solve', label: t('stem.algebraCAS.solve', '\uD83D\uDD0D Solve'), desc: t('stem.algebraCAS.find_the_value_of_x', 'Find the value of x') },
          { id: 'factor', label: t('stem.algebraCAS.factor', '\uD83E\uDDE9 Factor'), desc: t('stem.algebraCAS.factor_an_expression', 'Factor an expression') },
          { id: 'simplify', label: t('stem.algebraCAS.simplify', '\u2728 Simplify'), desc: t('stem.algebraCAS.simplify_an_expression', 'Simplify an expression') },
          { id: 'expand', label: t('stem.algebraCAS.expand', '\uD83D\uDD0E Expand'), desc: t('stem.algebraCAS.expand_distribute', 'Expand & distribute') }
        ];
        var DIFFICULTIES = [
          { id: 'elementary', label: t('stem.algebraCAS.elementary', 'Elementary') },
          { id: 'middle', label: t('stem.algebraCAS.middle_school', 'Middle School') },
          { id: 'advanced', label: t('stem.algebraCAS.advanced', 'Advanced') }
        ];
        var PROBLEM_TYPES = [
          { id: 'linear', label: t('stem.algebraCAS.linear', '\uD83D\uDD22 Linear') },
          { id: 'quadratic', label: t('stem.algebraCAS.quadratic', '\uD83D\uDCC8 Quadratic') },
          { id: 'multi-step', label: t('stem.algebraCAS.multi_step', '\uD83D\uDD23 Multi-Step') },
          { id: 'fractions', label: t('stem.algebraCAS.fractions', '\uD83C\uDF55 Fractions') },
          { id: 'word-problem', label: t('stem.algebraCAS.word_problem', '\uD83D\uDCD6 Word Problem') },
          { id: 'systems', label: t('stem.algebraCAS.systems', '\u2696 Systems') },
          { id: 'random', label: t('stem.algebraCAS.random', '\uD83C\uDFB2 Random') }
        ];
        var EXAMPLES = {
          solve: ['2x + 5 = 13', 'x\u00B2 - 4x + 3 = 0', '3(x - 2) = 15'],
          factor: ['x\u00B2 - 9', 'x\u00B2 + 5x + 6', '2x\u00B2 - 8'],
          simplify: ['(3x\u00B2 + 6x) / 3x', '2(x + 3) - (x - 1)'],
          expand: ['(x + 3)(x - 2)', '(2x + 1)\u00B2', '3(x\u00B2 - 4x + 1)']
        };

        var BUILDER_PALETTE = [
          { v: '1', cat: 'num' }, { v: '2', cat: 'num' }, { v: '3', cat: 'num' },
          { v: '4', cat: 'num' }, { v: '5', cat: 'num' }, { v: '6', cat: 'num' },
          { v: '7', cat: 'num' }, { v: '8', cat: 'num' }, { v: '9', cat: 'num' },
          { v: 'x', cat: 'var' }, { v: 'y', cat: 'var' },
          { v: '+', cat: 'op' }, { v: '-', cat: 'op' }, { v: '\u00D7', cat: 'op' }, { v: '\u00F7', cat: 'op' },
          { v: 'x\u00B2', cat: 'spc' }, { v: 'x\u00B3', cat: 'spc' }, { v: '\u221A', cat: 'spc' },
          { v: '(', cat: 'spc' }, { v: ')', cat: 'spc' }, { v: '=', cat: 'op' }
        ];
        var TILE_COLORS = { num: '#3b82f6', 'var': '#8b5cf6', op: '#f59e0b', spc: '#10b981' };

        /* -- Grade-band intros -- */
        var GRADE_INTROS = {
          k2: 'Solve simple puzzles like 2 + x = 5!',
          g35: 'Solve linear equations step-by-step.',
          g68: 'Tackle quadratics, systems, and factoring.',
          g912: 'Full CAS: polynomials, radicals, and more.'
        };

        /* ============ HANDLERS ============ */
        var handleSolve = function() {
          if (!expression.trim() || !callGemini || isLoading) return;
          upd('isLoading', true); upd('result', null);
          if (SOUNDS[mode]) SOUNDS[mode]();
          var modeLabel = mode.charAt(0).toUpperCase() + mode.slice(1);
          var prompt = 'You are a math CAS tutor for a grade ' + (gradeLevel || 5) + ' student.\n' +
            'MODE: ' + modeLabel + '\nEXPRESSION: ' + expression.trim() + '\n\n' +
            'Instructions:\n1. ' + modeLabel + ' this expression step by step.\n' +
            '2. For EACH step, show work AND label the algebraic rule in [brackets].\n' +
            '3. Format:\n   STEP 1: (work) [Rule]\n   STEP 2: (work) [Rule]\n   ...\n   ANSWER: (result)\n' +
            'Be rigorous. Show every step. Keep explanations concise but educational.';
          callGemini(prompt).then(function(res) {
            if (res) {
              var _aM = res.match(/ANSWER:\s*(.+)/i);
              var _chk = (_aM && _aM[1].trim()) ? __alloCASPure.verifySolution(expression, _aM[1].trim()) : { decidable: false };
              var newH = history.slice(-9);
              newH.push({ expr: expression, mode: mode, result: res, ts: Date.now() });
              var sc = (d._solveCount || 0) + 1;
              var fc = (d._factorCount || 0) + (mode === 'factor' ? 1 : 0);
              var mu = Object.assign({}, d._modesUsed || {}); mu[mode] = true;
              updMulti({ isLoading: false, result: res, verify: _chk, history: newH, _solveCount: sc, _factorCount: fc, _modesUsed: mu });
              if (awardStemXP) awardStemXP('algebraCAS', 5, 'CAS solve');
              checkBadges(Object.assign({}, d, { _solveCount: sc, _factorCount: fc, _modesUsed: mu, history: newH }));
            } else { upd('isLoading', false); }
          }).catch(function(e) {
            updMulti({ isLoading: false, result: 'Error: ' + (e.message || 'Failed') });
          });
        };

        var handlePracticeGen = function() {
          if (!callGemini || isLoading) return;
          updMulti({ isLoading: true, practiceFeedback: null, practiceAnswer: '', showSolution: false });
          if (difficulty === 'advanced') upd('_triedAdvanced', true);
          var diffDesc = difficulty === 'elementary' ? 'single-variable linear (e.g. 3x + 7 = 22)' :
            difficulty === 'middle' ? 'quadratic or two-step (e.g. x\u00B2 + 3x - 10 = 0)' : 'polynomial, rational, or radical';
          var typeHint = practiceType !== 'random' ? '\nType: ' + practiceType + '\n' : '';
          var prompt = 'Generate ONE algebra practice problem at ' + difficulty + ' level.\nDifficulty: ' + diffDesc + typeHint +
            'Format EXACTLY:\nPROBLEM: (equation)\nANSWER: (answer)\nHINT: (one-sentence hint)\nNo other text.';
          callGemini(prompt).then(function(res) {
            upd('isLoading', false);
            if (res) {
              var pM = res.match(/PROBLEM:\s*(.+)/i);
              var aM = res.match(/ANSWER:\s*(.+)/i);
              var hM = res.match(/HINT:\s*(.+)/i);
              upd('practiceQ', { problem: pM ? pM[1].trim() : res, answer: aM ? aM[1].trim() : '', hint: hM ? hM[1].trim() : 'Think step by step!' });
            }
          }).catch(function() { upd('isLoading', false); });
        };

        var handlePracticeCheck = function() {
          if (!practiceQ || !practiceAnswer.trim() || !callGemini) return;
          upd('isLoading', true);
          var prompt = 'Student solving:\nPROBLEM: ' + practiceQ.problem + '\nCORRECT: ' + practiceQ.answer +
            '\nSTUDENT: ' + practiceAnswer.trim() + '\n\nRespond EXACTLY:\nCORRECT: yes/no\nFEEDBACK: (1-2 sentences)\n' +
            'SOLUTION:\nSTEP 1: (work) [Rule]\n...\nANSWER: (result)\nAlways include full step-by-step SOLUTION.';
          callGemini(prompt).then(function(res) {
            upd('isLoading', false);
            if (res) {
              var _det = __alloCASPure.gradeAnswer(practiceAnswer.trim(), practiceQ.answer);
              var isRight = _det.decidable ? _det.correct : /CORRECT:\s*yes/i.test(res);
              var newStreak = isRight ? practiceStreak + 1 : 0;
              var maxSt = Math.max(d._maxStreak || 0, newStreak);
              if (isRight) { SOUNDS.correct(); if (awardStemXP) awardStemXP('algebraCAS', 10, 'Practice correct'); }
              else { SOUNDS.wrong(); }
              if (isRight && stemCelebrate && newStreak % 3 === 0) stemCelebrate();
              updMulti({ practiceFeedback: { correct: isRight, text: res, gradeSource: _det.decidable ? 'verified' : 'ai', gradeDetail: _det.decidable ? _det.detail : '' }, practiceScore: practiceScore + (isRight ? 1 : 0), practiceStreak: newStreak, _maxStreak: maxSt, showSolution: !isRight });
              checkBadges(Object.assign({}, d, { _maxStreak: maxSt }));
            }
          }).catch(function() { upd('isLoading', false); });
        };

        /* -- Builder helpers -- */
        var addTile = function(tile) {
          SOUNDS.tilePlace();
          var nt = builderTiles.concat([tile]);
          updMulti({ builderTiles: nt, _builderUsed: true });
          checkBadges(Object.assign({}, d, { _builderUsed: true }));
        };
        var removeTile = function(idx) {
          SOUNDS.tileRemove();
          var nt = builderTiles.filter(function(_, i) { return i !== idx; });
          upd('builderTiles', nt);
        };
        var builderToString = function() {
          return builderTiles.map(function(t) { return t.v; }).join(' ');
        };
        var sendBuilderToSolver = function() {
          var eq = builderToString();
          if (eq) { updMulti({ expression: eq, tab: 'solve' }); }
        };

        /* -- Scale helpers -- */
        var handleScaleOp = function(op, val) {
          if (!scaleEq || scaleSolved || !callGemini) return;
          SOUNDS.scaleOp();
          upd('isLoading', true);
          var steps = scaleSteps.slice();
          var desc = op + ' ' + val + ' to both sides';
          steps.push(desc);
          var prompt = 'Given equation: ' + scaleEq + '\nOperations applied in order:\n' +
            steps.map(function(s, i) { return (i + 1) + '. ' + s; }).join('\n') +
            '\n\nAfter applying ALL operations, what is the resulting equation? If it simplifies to x = (number), say SOLVED.\n' +
            'Respond EXACTLY:\nEQUATION: (result)\nSTATUS: solving/SOLVED';
          callGemini(prompt).then(function(res) {
            upd('isLoading', false);
            if (res) {
              var eqM = res.match(/EQUATION:\s*(.+)/i);
              var solved = /STATUS:\s*SOLVED/i.test(res);
              var newEq = eqM ? eqM[1].trim() : scaleEq;
              var sc = d._scaleSolves || 0;
              if (solved) {
                sc = sc + 1;
                SOUNDS.scaleBalance();
                if (awardStemXP) awardStemXP('algebraCAS', 15, 'Balance scale solved');
                if (stemCelebrate) stemCelebrate();
              }
              updMulti({ scaleEq: newEq, scaleSteps: steps, scaleSolved: solved, _scaleSolves: sc });
              if (solved) checkBadges(Object.assign({}, d, { _scaleSolves: sc }));
            }
          }).catch(function() { upd('isLoading', false); });
        };

        /* -- AI Tutor -- */
        var handleTutorSend = function() {
          if (!tutorInput.trim() || !callGemini || isLoading) return;
          SOUNDS.aiTutor();
          var question = tutorInput.trim();
          var msgs = tutorChat.concat([{ role: 'user', text: question }]);
          updMulti({ tutorChat: msgs, tutorInput: '', isLoading: true });
          var aq = (d._aiQuestions || 0) + 1;
          upd('_aiQuestions', aq);
          var prompt = 'You are a friendly algebra tutor for a grade ' + (gradeLevel || 5) + ' student.\n' +
            'Student asks: ' + question + '\nGive a clear, encouraging explanation. Use examples. Keep it concise (2-4 sentences).';
          callGemini(prompt).then(function(res) {
            var updated = msgs.concat([{ role: 'ai', text: res || 'I could not generate a response.' }]);
            updMulti({ tutorChat: updated, isLoading: false });
            checkBadges(Object.assign({}, d, { _aiQuestions: aq }));
          }).catch(function() {
            var updated = msgs.concat([{ role: 'ai', text: t('stem.algebraCAS.sorry_something_went_wrong_try_again', 'Sorry, something went wrong. Try again!') }]);
            updMulti({ tutorChat: updated, isLoading: false });
          });
        };

        /* ============ RENDER HELPERS ============ */
        var renderSteps = function(text) {
          if (!document.getElementById('allo-cas-step-css')) {
            var stepCss = document.createElement('style');
            stepCss.id = 'allo-cas-step-css';
            stepCss.textContent = '@keyframes casStepIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}';
            document.head.appendChild(stepCss);
          }
          return text.split('\n').map(function(line, i) {
            var trimmed = line.trim();
            if (!trimmed) return null;
            var isStep = /^STEP\s+\d+/i.test(trimmed);
            var isAns = /^ANSWER:/i.test(trimmed);
            var ruleM = line.match(/\[([^\]]+)\]/);
            if (isAns) return h('div', { key: i, style: { marginTop: '8px', padding: '8px', borderRadius: '8px', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', fontWeight: '700', animation: 'casStepIn 300ms ease-out both', animationDelay: Math.min(i * 40, 320) + 'ms' } }, '\u2705 ' + trimmed);
            if (isStep) return h('div', { key: i, style: { display: 'flex', alignItems: 'flex-start', gap: '6px', padding: '4px 0', animation: 'casStepIn 240ms ease-out both', animationDelay: Math.min(i * 40, 280) + 'ms' } },
              h('span', { style: { flex: '1' } }, ruleM ? line.replace(ruleM[0], '').trim() : trimmed),
              ruleM ? h('span', { style: { padding: '2px 6px', borderRadius: '99px', fontSize: '10px', fontWeight: '700', background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)', whiteSpace: 'nowrap' } }, ruleM[1]) : null
            );
            if (/^SOLUTION:/i.test(trimmed)) return null;
            return h('div', { key: i, style: { padding: '2px 0' } }, trimmed);
          });
        };

        /* ============ TAB BAR ============ */
        var TABS = [
          { id: 'solve', label: t('stem.algebraCAS.solve_2', '\uD83D\uDD0D Solve') },
          { id: 'practice', label: t('stem.algebraCAS.practice', '\uD83C\uDFAF Practice') },
          { id: 'builder', label: t('stem.algebraCAS.builder', '\uD83E\uDDF1 Builder') },
          { id: 'scale', label: t('stem.algebraCAS.scale', '\u2696 Scale') },
          { id: 'tutor', label: t('stem.algebraCAS.tutor', '\uD83E\uDD16 Tutor') }
        ];

        var tabBar = h('div', { style: { display: 'flex', gap: '4px', marginBottom: '12px', flexWrap: 'wrap' }, role: 'tablist', 'aria-label': t('stem.algebraCAS.algebra_cas_sections', 'Algebra CAS sections') },
          TABS.map(function(t) {
            return h('button', { key: t.id, onClick: function() { upd('tab', t.id); },
              role: 'tab', 'aria-selected': tab === t.id,
              style: btnStyle(tab === t.id)
            }, t.label);
          })
        );

        /* ============ TAB: SOLVE ============ */
        var renderSolve = function() {
          return h('div', null,
            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px', marginBottom: '10px' } },
              MODES.map(function(m) {
                return h('button', { key: m.id, onClick: function() { updMulti({ mode: m.id, result: null }); }, title: m.desc, style: btnStyle(mode === m.id) }, m.label);
              })
            ),
            h('div', { style: { display: 'flex', gap: '6px', marginBottom: '8px' } },
              h('input', { type: 'text', value: expression, onChange: function(e) { upd('expression', e.target.value); },
                onKeyDown: function(e) { if (e.key === 'Enter') handleSolve(); },
                placeholder: 'e.g. ' + ((EXAMPLES[mode] || [])[0] || '2x + 5 = 13'),
                'aria-label': t('stem.algebraCAS.algebra_expression_input', 'Algebra expression input'),
                style: { flex: '1', padding: '8px 12px', borderRadius: '10px', background: CARD, border: '1px solid ' + BORDER, color: TEXT, outline: 'none', fontFamily: 'monospace', fontSize: '13px' },
                onFocus: function(e) { e.target.style.boxShadow = '0 0 0 2px #7c3aed'; }, onBlur: function(e) { e.target.style.boxShadow = 'none'; } }),
              h('button', { 'aria-label': 'TRY:', onClick: handleSolve, disabled: isLoading || !expression.trim(),
                style: { padding: '8px 16px', borderRadius: '10px', background: BTN_FLAT, color: BTN_TEXT, fontWeight: '700', fontSize: '12px', cursor: 'pointer', opacity: (isLoading || !expression.trim()) ? 0.5 : 1, border: 'none' }
              }, isLoading ? '\u23F3 ...' : '\u25B6 ' + (mode.charAt(0).toUpperCase() + mode.slice(1)))
            ),
            h('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' } },
              h('span', { style: { fontSize: '10px', fontWeight: '700', color: MUTED } }, 'TRY:'),
              (EXAMPLES[mode] || []).map(function(ex, i) {
                return h('button', { 'aria-label': t('stem.algebraCAS.step_by_step_solution', 'Step-by-Step Solution'), key: i, onClick: function() { upd('expression', ex); },
                  style: { padding: '3px 8px', borderRadius: '8px', fontSize: '10px', fontFamily: 'monospace', background: CARD, border: '1px solid ' + BORDER, color: ACCENT, cursor: 'pointer' } }, ex);
              })
            ),
            result ? h('div', { style: Object.assign({}, cardStyle, { marginBottom: '10px' }) },
              h('div', { style: { fontSize: '11px', fontWeight: '700', color: ACCENT, marginBottom: '8px' } }, t('stem.algebraCAS.step_by_step_solution_2', '\uD83D\uDCCB Step-by-Step Solution')),
              h('div', { style: { fontSize: '12px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', lineHeight: '1.6' } }, renderSteps(typeof result === 'string' ? result : '')),
              verify && verify.decidable ? h('div', { style: { marginTop: '8px', padding: '6px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', background: verify.verified ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)', color: verify.verified ? '#34d399' : '#f59e0b', border: '1px solid ' + (verify.verified ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)') } }, verify.verified ? ('✓ ' + t('stem.algebraCAS.verified_check', 'Verified by the math engine') + (verify.detail ? ' — ' + verify.detail : '')) : ('⚠ ' + t('stem.algebraCAS.verify_warning', 'This answer does not check out') + (verify.detail ? ' — ' + verify.detail : ''))) : null
            ) : null,
            history.length > 0 ? h('div', null,
              h('div', { style: { fontSize: '10px', fontWeight: '700', color: MUTED, marginBottom: '6px' } }, '\uD83D\uDCDC Recent (' + history.length + ')'),
              h('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap' } },
                history.slice().reverse().slice(0, 5).map(function(hi, i) {
                  return h('button', { key: i, onClick: function() { updMulti({ expression: hi.expr, mode: hi.mode, result: hi.result }); },
                    style: { padding: '3px 8px', borderRadius: '8px', fontSize: '10px', fontFamily: 'monospace', background: CARD, border: '1px solid ' + BORDER, color: TEXT, cursor: 'pointer' } },
                    hi.mode + ': ' + hi.expr.substring(0, 20));
                })
              )
            ) : null
          );
        };

        /* ============ TAB: PRACTICE ============ */
        var renderPractice = function() {
          return h('div', null,
            (practiceScore > 0 || practiceStreak > 0) ? h('div', { style: { display: 'flex', gap: '10px', marginBottom: '8px' } },
              practiceScore > 0 ? h('span', { style: { fontSize: '11px', fontWeight: '700', color: 'rgba(34,197,94,0.9)' } }, '\u2B50 ' + practiceScore + ' correct') : null,
              practiceStreak > 1 ? h('span', { style: { fontSize: '11px', fontWeight: '700', color: '#f97316' } }, '\uD83D\uDD25 ' + practiceStreak + ' streak') : null
            ) : null,
            h('div', { style: { marginBottom: '8px' } },
              h('div', { style: { fontSize: '10px', fontWeight: '700', color: MUTED, textTransform: 'uppercase', marginBottom: '4px' } }, t('stem.algebraCAS.difficulty', 'Difficulty')),
              h('div', { style: { display: 'flex', gap: '4px' } },
                DIFFICULTIES.map(function(df) {
                  return h('button', { 'aria-label': t('stem.algebraCAS.problem_type', 'Problem Type'), key: df.id, onClick: function() { updMulti({ difficulty: df.id, practiceQ: null, practiceFeedback: null }); if (df.id === 'advanced') upd('_triedAdvanced', true); }, style: btnStyle(difficulty === df.id) }, df.label);
                })
              )
            ),
            h('div', { style: { marginBottom: '10px' } },
              h('div', { style: { fontSize: '10px', fontWeight: '700', color: MUTED, textTransform: 'uppercase', marginBottom: '4px' } }, t('stem.algebraCAS.problem_type_2', 'Problem Type')),
              h('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap' } },
                PROBLEM_TYPES.map(function(pt) {
                  return h('button', { key: pt.id, onClick: function() { updMulti({ practiceType: pt.id, practiceQ: null, practiceFeedback: null }); }, style: btnStyle(practiceType === pt.id) }, pt.label);
                })
              )
            ),
            !practiceQ ? h('div', { style: { textAlign: 'center', padding: '24px', borderRadius: '12px', background: CARD, border: '1px solid ' + BORDER } },
              h('p', { style: { fontSize: '12px', color: MUTED, marginBottom: '8px' } }, 'Generate a problem at ' + difficulty + ' level'),
              h('button', { 'aria-label': 'PROBLEM', onClick: handlePracticeGen, disabled: isLoading,
                style: { padding: '10px 20px', borderRadius: '10px', background: BTN_FLAT, color: BTN_TEXT, fontWeight: '700', fontSize: '13px', cursor: 'pointer', opacity: isLoading ? 0.5 : 1, border: 'none' }
              }, isLoading ? '\u23F3 Generating...' : '\uD83C\uDFB2 Generate Problem')
            ) : h('div', null,
              h('div', { style: Object.assign({}, cardStyle, { border: '2px solid ' + ACCENT, marginBottom: '8px' }) },
                h('div', { style: { fontSize: '11px', fontWeight: '700', color: ACCENT, marginBottom: '6px' } }, t('stem.algebraCAS.problem', '\uD83D\uDCCB PROBLEM')),
                h('div', { style: { fontSize: '18px', fontFamily: 'monospace', fontWeight: '700', textAlign: 'center', padding: '10px 0' } }, practiceQ.problem),
                h('p', { style: { fontSize: '11px', textAlign: 'center', color: MUTED } }, '\uD83D\uDCA1 Hint: ' + practiceQ.hint)
              ),
              !practiceFeedback ? h('div', { style: { display: 'flex', gap: '6px', marginBottom: '8px' } },
                h('input', { type: 'text', value: practiceAnswer,
                  onChange: function(e) { upd('practiceAnswer', e.target.value); },
                  onKeyDown: function(e) { if (e.key === 'Enter') handlePracticeCheck(); },
                  placeholder: t('stem.algebraCAS.your_answer', 'Your answer...'),
                  'aria-label': t('stem.algebraCAS.practice_answer_input', 'Practice answer input'),
                  style: { flex: '1', padding: '8px 12px', borderRadius: '10px', background: CARD, border: '1px solid ' + BORDER, color: TEXT, outline: 'none', fontFamily: 'monospace', fontSize: '13px' },
                  onFocus: function(e) { e.target.style.boxShadow = '0 0 0 2px #7c3aed'; }, onBlur: function(e) { e.target.style.boxShadow = 'none'; } }),
                h('button', { onClick: handlePracticeCheck, disabled: isLoading || !practiceAnswer.trim(),
                  style: { padding: '8px 16px', borderRadius: '10px', background: BTN_FLAT, color: BTN_TEXT, fontWeight: '700', cursor: 'pointer', opacity: (isLoading || !practiceAnswer.trim()) ? 0.5 : 1, border: 'none' }
                }, isLoading ? '\u23F3' : '\u2705 Check')
              ) : null,
              practiceFeedback ? h('div', { style: { padding: '10px', borderRadius: '12px', background: practiceFeedback.correct ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: '1px solid ' + (practiceFeedback.correct ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'), marginBottom: '8px' } },
                h('div', { style: { fontSize: '13px', fontWeight: '700', marginBottom: '6px' } }, practiceFeedback.correct ? '\uD83C\uDF89 Correct!' : '\u274C Not quite...'),
                practiceFeedback.gradeSource === 'verified' ? h('div', { style: { fontSize: '10px', fontWeight: '700', color: '#34d399', marginBottom: '6px' } }, '\u2713 ' + t('stem.algebraCAS.checked_by_engine', 'Checked by the math engine') + (practiceFeedback.gradeDetail ? ' \u2014 ' + practiceFeedback.gradeDetail : '')) : null,
                h('div', { style: { fontSize: '11px', marginBottom: '6px' } }, (function() { var fb = practiceFeedback.text.match(/FEEDBACK:\s*(.+)/i); return fb ? fb[1].trim() : ''; })()),
                h('button', { 'aria-label': t('stem.algebraCAS.no_solution_available', 'No solution available.'), onClick: function() { upd('showSolution', !showSolution); },
                  style: { fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '8px', background: showSolution ? 'rgba(99,102,241,0.15)' : CARD, color: showSolution ? '#a5b4fc' : MUTED, border: '1px solid ' + BORDER, cursor: 'pointer', marginBottom: '6px' }
                }, (showSolution ? '\u25BC' : '\u25B6') + ' Step-by-Step Solution'),
                showSolution ? h('div', { style: { marginTop: '6px', padding: '8px', borderRadius: '10px', fontSize: '11px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', lineHeight: '1.5', background: 'rgba(15,23,42,0.5)', border: '1px solid ' + BORDER } },
                  (function() { var sol = practiceFeedback.text.match(/SOLUTION:[\s\S]*/i); return sol ? renderSteps(sol[0]) : h('span', { style: { color: MUTED } }, t('stem.algebraCAS.no_solution_available_2', 'No solution available.')); })()
                ) : null
              ) : null,
              h('button', { 'aria-label': t('stem.algebraCAS.new_problem', 'New Problem'), onClick: function() { updMulti({ practiceQ: null, practiceFeedback: null, practiceAnswer: '', showSolution: false }); handlePracticeGen(); },
                style: { width: '100%', padding: '8px', borderRadius: '10px', background: CARD, border: '1px solid ' + BORDER, color: TEXT, fontWeight: '700', fontSize: '11px', cursor: 'pointer' }
              }, t('stem.algebraCAS.new_problem_2', '\uD83D\uDD04 New Problem'))
            )
          );
        };

        /* ============ TAB: BUILDER ============ */
        var renderBuilder = function() {
          var tileBtnStyle = function(cat) {
            return { padding: '8px 12px', borderRadius: '8px', fontSize: '14px', fontWeight: '700',
              background: TILE_COLORS[cat] || '#6366f1', color: '#fff', cursor: 'pointer',
              border: '2px solid rgba(255,255,255,0.2)', minWidth: '36px', textAlign: 'center' };
          };
          return h('div', null,
            h('div', { style: { fontSize: '11px', fontWeight: '700', color: MUTED, textTransform: 'uppercase', marginBottom: '6px' } }, t('stem.algebraCAS.tile_palette', 'Tile Palette')),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' } },
              BUILDER_PALETTE.map(function(tile, i) {
                return h('button', { 'aria-label': 'Add tile ' + tile.v, key: i, onClick: function() { addTile(tile); }, style: tileBtnStyle(tile.cat) }, tile.v);
              })
            ),
            h('div', { style: { fontSize: '11px', fontWeight: '700', color: MUTED, textTransform: 'uppercase', marginBottom: '6px' } }, t('stem.algebraCAS.your_equation_click_tile_to_remove', 'Your Equation (click tile to remove)')),
            h('div', { style: { minHeight: '48px', padding: '10px', borderRadius: '12px', background: CARD, border: '2px dashed ' + BORDER, display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center', marginBottom: '10px' } },
              builderTiles.length === 0 ? h('span', { style: { color: MUTED, fontSize: '12px' } }, t('stem.algebraCAS.click_tiles_above_to_build_an_equation', 'Click tiles above to build an equation...')) :
              builderTiles.map(function(tile, i) {
                return h('button', { 'aria-label': 'Remove tile ' + tile.v, key: i, onClick: function() { removeTile(i); },
                  style: { padding: '6px 10px', borderRadius: '6px', fontSize: '14px', fontWeight: '700', background: TILE_COLORS[tile.cat] || '#6366f1', color: '#fff', cursor: 'pointer', border: 'none' } }, tile.v);
              })
            ),
            builderTiles.length > 0 ? h('div', { style: { display: 'flex', gap: '6px', marginBottom: '8px' } },
              h('div', { style: { flex: '1', padding: '8px', borderRadius: '10px', background: 'rgba(99,102,241,0.05)', border: '1px solid ' + BORDER, fontFamily: 'monospace', fontSize: '14px', fontWeight: '700', textAlign: 'center' } }, builderToString()),
              h('button', { onClick: sendBuilderToSolver,
                style: { padding: '8px 16px', borderRadius: '10px', background: BTN_FLAT, color: BTN_TEXT, fontWeight: '700', fontSize: '12px', cursor: 'pointer', border: 'none' } }, t('stem.algebraCAS.solve_it', '\uD83D\uDD0D Solve It')),
              h('button', { 'aria-label': t('stem.algebraCAS.clear', 'Clear'), onClick: function() { upd('builderTiles', []); },
                style: { padding: '8px 12px', borderRadius: '10px', background: CARD, color: TEXT, fontWeight: '700', fontSize: '12px', cursor: 'pointer', border: '1px solid ' + BORDER } }, t('stem.algebraCAS.clear_2', '\uD83D\uDDD1 Clear'))
            ) : null,
            h('div', { style: { fontSize: '10px', color: MUTED, marginTop: '6px' } },
              h('span', { style: { fontWeight: '700' } }, 'Legend: '),
              h('span', { style: { color: '#3b82f6' } }, t('stem.algebraCAS.numbers', '\u25CF Numbers ')),
              h('span', { style: { color: '#8b5cf6' } }, t('stem.algebraCAS.variables', '\u25CF Variables ')),
              h('span', { style: { color: '#f59e0b' } }, t('stem.algebraCAS.operators', '\u25CF Operators ')),
              h('span', { style: { color: '#10b981' } }, t('stem.algebraCAS.special', '\u25CF Special'))
            )
          );
        };

        /* ============ TAB: SCALE (Canvas-based balance) ============ */
        var renderScale = function() {
          var drawScale = function(canvas) {
            if (!canvas) return;
            // PL7 batch 3: HiDPI — scale internal buffer by dpr, keep CSS at logical.
            var _acDpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
            var w = canvas.parentNode.offsetWidth || 400;
            var ht = 220;
            canvas.width = Math.round(w * _acDpr);
            canvas.height = Math.round(ht * _acDpr);
            canvas.style.width = w + 'px';
            canvas.style.height = ht + 'px';
            var c = canvas.getContext('2d');
            c.setTransform(_acDpr, 0, 0, _acDpr, 0, 0);
            c.clearRect(0, 0, w, ht);

            // Parse sides
            var sides = (scaleEq || '').split('=');
            var leftText = sides[0] ? sides[0].trim() : '?';
            var rightText = sides[1] ? sides[1].trim() : '?';

            // An equation's two sides are equal by definition, so the balance stays LEVEL —
            // which is the whole point ("equations balance"). The old tilt was derived from each
            // side's CHARACTER COUNT (e.g. "2x"=2 chars vs "100"=3), implying a fake imbalance
            // that actively taught a misconception.
            var tilt = 0;

            var cx = w / 2;
            var baseY = ht - 20;

            // Base triangle
            c.fillStyle = '#475569';
            c.beginPath(); c.moveTo(cx - 30, baseY); c.lineTo(cx + 30, baseY); c.lineTo(cx, baseY - 40); c.closePath(); c.fill();

            // Beam
            c.save();
            c.translate(cx, baseY - 40);
            c.rotate(tilt);
            var beamCol = scaleSolved ? '#22c55e' : '#6366f1';
            c.save();
            c.shadowColor = beamCol; c.shadowBlur = scaleSolved ? 16 : 8;
            c.strokeStyle = beamCol;
            c.lineWidth = 4;
            c.beginPath(); c.moveTo(-w * 0.35, 0); c.lineTo(w * 0.35, 0); c.stroke();
            c.restore();

            // Left pan
            var panW = 90;
            var lx = -w * 0.35;
            c.fillStyle = 'rgba(99,102,241,0.15)';
            c.strokeStyle = '#6366f1';
            c.lineWidth = 2;
            // Strings
            c.beginPath(); c.moveTo(lx, 0); c.lineTo(lx - panW / 2, 50); c.moveTo(lx, 0); c.lineTo(lx + panW / 2, 50); c.stroke();
            // Pan
            c.beginPath(); c.moveTo(lx - panW / 2, 50); c.lineTo(lx + panW / 2, 50); c.lineTo(lx + panW / 2 - 5, 65); c.lineTo(lx - panW / 2 + 5, 65); c.closePath(); c.fill(); c.stroke();
            // Left label
            c.fillStyle = '#e2e8f0';
            c.font = 'bold 13px monospace';
            c.textAlign = 'center';
            c.fillText(leftText.length > 12 ? leftText.substring(0, 12) + '..' : leftText, lx, 82);

            // Right pan
            var rx = w * 0.35;
            c.fillStyle = 'rgba(168,85,247,0.15)';
            c.strokeStyle = '#a855f7';
            c.lineWidth = 2;
            c.beginPath(); c.moveTo(rx, 0); c.lineTo(rx - panW / 2, 50); c.moveTo(rx, 0); c.lineTo(rx + panW / 2, 50); c.stroke();
            c.beginPath(); c.moveTo(rx - panW / 2, 50); c.lineTo(rx + panW / 2, 50); c.lineTo(rx + panW / 2 - 5, 65); c.lineTo(rx - panW / 2 + 5, 65); c.closePath(); c.fill(); c.stroke();
            c.fillStyle = '#e2e8f0';
            c.fillText(rightText.length > 12 ? rightText.substring(0, 12) + '..' : rightText, rx, 82);

            c.restore();

            // Solved banner
            if (scaleSolved) {
              c.fillStyle = 'rgba(34,197,94,0.2)';
              c.fillRect(0, 0, w, 28);
              c.save();
              c.shadowColor = 'rgba(34,197,94,0.9)'; c.shadowBlur = 10;
              c.fillStyle = '#22c55e';
              c.font = 'bold 14px sans-serif';
              c.textAlign = 'center';
              c.fillText('\u2705 Balanced! Equation solved!', cx, 19);
              c.restore();
            }
          };

          var opBtnStyle = { padding: '6px 10px', borderRadius: '8px', background: CARD, border: '1px solid ' + BORDER, color: TEXT, fontWeight: '700', fontSize: '11px', cursor: 'pointer' };
          return h('div', null,
            h('div', { style: { marginBottom: '8px' } },
              h('div', { style: { fontSize: '11px', fontWeight: '700', color: MUTED, textTransform: 'uppercase', marginBottom: '4px' } }, t('stem.algebraCAS.enter_equation', 'Enter Equation')),
              h('div', { style: { display: 'flex', gap: '6px' } },
                h('input', { type: 'text', value: scaleEq, onChange: function(e) { upd('scaleEq', e.target.value); },
                  onKeyDown: function(e) { if (e.key === 'Enter') updMulti({ scaleSteps: [], scaleSolved: false }); },
                  placeholder: t('stem.algebraCAS.e_g_3x_5_14', 'e.g. 3x + 5 = 14'),
                  'aria-label': t('stem.algebraCAS.balance_scale_equation_input', 'Balance scale equation input'),
                  style: { flex: '1', padding: '8px 12px', borderRadius: '10px', background: CARD, border: '1px solid ' + BORDER, color: TEXT, outline: 'none', fontFamily: 'monospace', fontSize: '13px' },
                  onFocus: function(e) { e.target.style.boxShadow = '0 0 0 2px #7c3aed'; }, onBlur: function(e) { e.target.style.boxShadow = 'none'; } }),
                h('button', { 'aria-label': t('stem.algebraCAS.load', 'Load'), onClick: function() { updMulti({ scaleSteps: [], scaleSolved: false }); },
                  style: { padding: '8px 14px', borderRadius: '10px', background: BTN_FLAT, color: BTN_TEXT, fontWeight: '700', fontSize: '12px', cursor: 'pointer', border: 'none' } }, t('stem.algebraCAS.load_2', 'Load'))
              )
            ),
            h('div', { style: { borderRadius: '12px', border: '1px solid ' + BORDER, overflow: 'hidden', marginBottom: '8px', background: 'rgba(15,23,42,0.5)' } },
              h('canvas', { ref: function(canvas) { if (canvas) setTimeout(function() { drawScale(canvas); }, 0); }, 'aria-label': t('stem.algebraCAS.interactive_algebra_balance_scale_visu', 'Interactive algebra balance scale visualization'), tabIndex: 0, style: { width: '100%', display: 'block' } })
            ),
            scaleEq && !scaleSolved ? h('div', null,
              h('div', { style: { fontSize: '10px', fontWeight: '700', color: MUTED, textTransform: 'uppercase', marginBottom: '4px' } }, t('stem.algebraCAS.apply_to_both_sides', 'Apply to Both Sides')),
              h('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px', alignItems: 'center' } },
                // Inline numeric input instead of window.prompt() \u2014 prompt() is blocked in the
                // sandboxed Gemini Canvas iframe (the primary surface), which silently dead-ended
                // every balance operation. The op buttons read this value.
                h('input', { type: 'number', 'aria-label': t('stem.algebraCAS.value_to_apply_to_both_sides', 'Value to apply to both sides'), value: d.scaleOpVal != null ? d.scaleOpVal : '', placeholder: 'value',
                  onChange: function(e) { upd('scaleOpVal', e.target.value); },
                  style: { width: '74px', padding: '8px', borderRadius: '8px', border: '1px solid ' + BORDER, background: BG, color: TEXT, fontSize: '13px' } }),
                [['Add', '+'], ['Subtract', '-'], ['Multiply', '\u00D7'], ['Divide', '\u00F7']].map(function(pair) {
                  return h('button', { 'aria-label': pair[0] + ' the entered value on both sides', key: pair[0], onClick: function() {
                    var val = d.scaleOpVal;
                    if (val != null && String(val).trim() !== '') handleScaleOp(pair[0], String(val).trim());
                  }, style: opBtnStyle }, pair[1] + ' ' + pair[0]);
                })
              ),
              scaleSteps.length > 0 ? h('div', { style: Object.assign({}, cardStyle, { fontSize: '11px' }) },
                h('div', { style: { fontWeight: '700', color: ACCENT, marginBottom: '4px' } }, t('stem.algebraCAS.steps_applied', 'Steps Applied:')),
                scaleSteps.map(function(s, i) { return h('div', { key: i, style: { color: MUTED } }, (i + 1) + '. ' + s); })
              ) : null
            ) : null,
            scaleSolved ? h('button', { 'aria-label': t('stem.algebraCAS.new_equation', 'New Equation'), onClick: function() { updMulti({ scaleEq: '', scaleSteps: [], scaleSolved: false }); },
              style: { width: '100%', padding: '8px', borderRadius: '10px', background: CARD, border: '1px solid ' + BORDER, color: TEXT, fontWeight: '700', fontSize: '12px', cursor: 'pointer' } }, t('stem.algebraCAS.new_equation_2', '\uD83D\uDD04 New Equation')) : null
          );
        };

        /* ============ TAB: TUTOR ============ */
        var renderTutor = function() {
          var SUGGESTED = ['What is a variable?', 'How do I solve for x?', 'Explain factoring', 'What is PEMDAS?'];
          return h('div', null,
            h('div', { style: { maxHeight: '260px', overflowY: 'auto', marginBottom: '8px', padding: '8px', borderRadius: '12px', background: CARD, border: '1px solid ' + BORDER } },
              tutorChat.length === 0 ? h('p', { style: { fontSize: '12px', color: MUTED, textAlign: 'center', padding: '20px 0' } }, t('stem.algebraCAS.ask_the_ai_tutor_anything_about_algebr', 'Ask the AI tutor anything about algebra!')) :
              tutorChat.map(function(msg, i) {
                var isUser = msg.role === 'user';
                return h('div', { key: i, style: { marginBottom: '6px', textAlign: isUser ? 'right' : 'left' } },
                  h('div', { style: { display: 'inline-block', padding: '6px 10px', borderRadius: '10px', maxWidth: '80%', fontSize: '12px', lineHeight: '1.5',
                    background: isUser ? 'rgba(99,102,241,0.2)' : 'rgba(168,85,247,0.1)',
                    border: '1px solid ' + (isUser ? 'rgba(99,102,241,0.3)' : 'rgba(168,85,247,0.2)') } },
                    isUser ? msg.text : h('div', null,
                      h('span', { style: { fontSize: '10px', fontWeight: '700', color: '#a855f7' } }, t('stem.algebraCAS.tutor_2', '\uD83E\uDD16 Tutor')),
                      h('div', { style: { marginTop: '2px' } }, msg.text),
                      callTTS ? h('button', { 'aria-label': t('stem.algebraCAS.listen', 'Listen'), onClick: function() { speakText(msg.text, callTTS); },
                        style: { marginTop: '4px', fontSize: '10px', color: ACCENT, background: 'none', border: 'none', cursor: 'pointer', fontWeight: '700' } }, t('stem.algebraCAS.listen_2', '\uD83D\uDD0A Listen')) : null
                    )
                  )
                );
              })
            ),
            h('div', { style: { display: 'flex', gap: '6px', marginBottom: '8px' } },
              h('input', { type: 'text', value: tutorInput, onChange: function(e) { upd('tutorInput', e.target.value); },
                onKeyDown: function(e) { if (e.key === 'Enter') handleTutorSend(); },
                placeholder: t('stem.algebraCAS.ask_about_algebra', 'Ask about algebra...'),
                'aria-label': t('stem.algebraCAS.ask_the_algebra_tutor', 'Ask the algebra tutor'),
                style: { flex: '1', padding: '8px 12px', borderRadius: '10px', background: CARD, border: '1px solid ' + BORDER, color: TEXT, outline: 'none', fontSize: '12px' },
                onFocus: function(e) { e.target.style.boxShadow = '0 0 0 2px #7c3aed'; }, onBlur: function(e) { e.target.style.boxShadow = 'none'; } }),
              h('button', { 'aria-label': 'Try:', onClick: handleTutorSend, disabled: isLoading || !tutorInput.trim(),
                style: { padding: '8px 14px', borderRadius: '10px', background: BTN_FLAT, color: BTN_TEXT, fontWeight: '700', cursor: 'pointer', opacity: (isLoading || !tutorInput.trim()) ? 0.5 : 1, border: 'none' }
              }, isLoading ? '\u23F3' : 'Send')
            ),
            h('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap' } },
              h('span', { style: { fontSize: '10px', fontWeight: '700', color: MUTED } }, 'Try:'),
              SUGGESTED.map(function(q, i) {
                return h('button', { 'aria-label': t('stem.algebraCAS.ask_question', 'Ask question'), key: i, onClick: function() { upd('tutorInput', q); },
                  style: { padding: '3px 8px', borderRadius: '8px', fontSize: '10px', background: CARD, border: '1px solid ' + BORDER, color: ACCENT, cursor: 'pointer' } }, q);
              })
            )
          );
        };

        /* ============ BADGE BAR ============ */
        var earned = d._badgesEarned || [];
        var badgeBar = h('div', { style: { display: 'flex', gap: '3px', flexWrap: 'wrap', padding: '6px 0' } },
          BADGES.map(function(b) {
            var has = earned.indexOf(b.id) !== -1;
            return h('span', { key: b.id, title: b.label + ': ' + b.desc,
              style: { fontSize: '14px', opacity: has ? 1 : 0.25, cursor: 'default', filter: has ? 'none' : 'grayscale(1)' } }, b.icon);
          })
        );

        /* ============ MAIN RENDER ============ */
        return h('div', { 'data-algebra-theme': isContrast ? 'contrast' : (isDark ? 'dark' : 'light'), style: { padding: '14px', color: TEXT, background: BG, border: '1px solid ' + BORDER, borderRadius: '16px', minHeight: '400px' } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' } },
            h('div', null,
              h('h3', { style: { fontSize: '16px', fontWeight: '700', margin: 0 } }, t('stem.algebraCAS.algebra_cas', '\uD83E\uDDEE Algebra CAS')),
              h('p', { style: { fontSize: '10px', color: MUTED, margin: '2px 0 0 0' } }, GRADE_INTROS[band] || 'Step-by-step symbolic math powered by AI')
            ),
            h('button', { 'aria-label': t('stem.algebraCAS.back', 'Back'), onClick: function() { setStemLabTool(null); },
              style: { padding: '6px 12px', borderRadius: '10px', background: CARD, border: '1px solid ' + BORDER, color: TEXT, fontWeight: '700', fontSize: '11px', cursor: 'pointer' } }, t('stem.algebraCAS.back_2', '\u2190 Back'))
          ),
          badgeBar,
          tabBar,
          (function() {
            var TAB_META = {
              solve:    { accent: '#7c3aed', soft: 'rgba(124,58,237,0.10)', icon: '🔍', title: t('stem.algebraCAS.solve_algebra_step_by_step', 'Solve — algebra step-by-step'),         hint: t('stem.algebraCAS.linear_quadratic_factoring_system_simp', 'Linear, quadratic, factoring, system, simplify. AI shows every step + names the property used (distributive, combining like terms, FOIL). Common AP / SAT / Algebra-1 problems all reduce to ~8 transformations.') },
              practice: { accent: '#0ea5e9', soft: 'rgba(14,165,233,0.10)', icon: '🎯', title: t('stem.algebraCAS.practice_graded_drills', 'Practice — graded drills'),             hint: t('stem.algebraCAS.multi_difficulty_problem_sets_the_ai_c', 'Multi-difficulty problem sets. The AI checks your answer and walks through the full worked solution so you can see exactly where your steps diverged. Builds the habit of writing math, not just guessing.') },
              builder:  { accent: '#22c55e', soft: 'rgba(34,197,94,0.10)',  icon: '🧱', title: t('stem.algebraCAS.builder_design_your_own_equation', 'Builder — design your own equation'),   hint: t('stem.algebraCAS.pick_variables_operations_target_value', 'Pick variables + operations + target value; system generates an algebra problem matching your design. Useful for teachers building worksheets and for students reverse-engineering "what makes a problem hard."') },
              scale:    { accent: '#f59e0b', soft: 'rgba(245,158,11,0.10)', icon: '⚖️', title: t('stem.algebraCAS.scale_visual_algebra_balance', 'Scale — visual algebra balance'),       hint: t('stem.algebraCAS.drag_weights_onto_a_balance_to_model_x', 'Drag weights onto a balance to model x + 3 = 7 visually. The single most useful intuition for early algebra — equations are scales, not blanks to fill in. Whatever you do to one side, do to the other.') },
              tutor:    { accent: '#ec4899', soft: 'rgba(236,72,153,0.10)', icon: '🤖', title: t('stem.algebraCAS.tutor_ask_ai_for_help', 'Tutor — ask AI for help'),              hint: t('stem.algebraCAS.ask_the_tutor_about_any_algebra_concep', 'Ask the tutor about any algebra concept or stuck-step. Tutor knows your grade band, recent attempts, and the active problem. Best for "why didn\'t my approach work?" questions.') }
            };
            var meta = TAB_META[tab] || TAB_META.solve;
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
                h('p', { style: { margin: '3px 0 0', color: MUTED || '#64748b', fontSize: 11, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
              )
            );
          })(),
          tab === 'solve' ? renderSolve() : null,
          tab === 'practice' ? renderPractice() : null,
          tab === 'builder' ? renderBuilder() : null,
          tab === 'scale' ? renderScale() : null,
          tab === 'tutor' ? renderTutor() : null
        );
      })();
    }
  });
})();
