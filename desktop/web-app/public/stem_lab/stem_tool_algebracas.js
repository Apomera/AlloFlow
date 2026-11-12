// =============================================
// stem_tool_algebraCAS.js - Algebra CAS (standalone CDN module)
// Computer Algebra System: solver, equation builder, balance scale, AI tutor
// =============================================

function __alloOneWord(s) { if (String(s).indexOf('1 ') < 0) return s; var irr = { inches: 'inch', boxes: 'box', copies: 'copy', batches: 'batch', categories: 'category', entries: 'entry', halves: 'half', shelves: 'shelf', tries: 'try', classes: 'class', guesses: 'guess', quizzes: 'quiz', feet: 'foot', people: 'person', children: 'child', volcanoes: 'volcano' }; return String(s).replace(/(^|[^\d.,\-−\/:])([Tt]here are )?1 ((?:square|cubic|unit|equal|full|whole|live|alive|dying|new|more|fewer|extra|small|real|complete|separate|shaded|missed|remaining|plotted|turning|significant|decimal|wrong|required|sample|spaceship|part|path|trail|walking|cool|factor|zero|loose|trading|question|bottom|planned|residual|imperial|different|two-way|best-fit) )?((?:dot|row|column|square|tile|unit|piece|part|group|hop|jump|step|cup|stack|point|value|cell|face|block|marker|answer|question|problem|cube|counter|item|round|badge|generation|meter|metre|kilometer|kilometre|centimeter|centimetre|millimeter|millimetre|liter|litre|gram|kilogram|gallon|yard|mile|hectare|acre|teaspoon|tablespoon|ounce|pound|cent|dollar|coin|degree|space|place|side|second|minute|hour|day|week|month|year|apple|sticker|pencil|chair|student|bag|muffin|trial|rule|sector|shot|hundredth|tenth|thousandth|third|fourth|fifth|sixth|eighth|twelfth|quarter|whole|table|plant|marble|card|seat|ball|book|sample|ticket|tick|check|number|crayon|pack|grape|attempt|page|seed|bead|cookie|ribbon|caterpillar|feather|tray|egg|edge|mission|serving|member|dig|field|angle|birth|death|tone|parcel|prime|player|bucket|beat|pet|line|bar|slice|bin|record|response|pair|outlier|orange|crate|disk|mark|length|car|desk|tree|chocolate|challenge|section|hit|spot|landmark|pool|bee|carrot|textbook|elephant|bottle|tub|sneeze|screen|room|pin|ray|diagonal|corner|polygon|survivor|neighbour|neighbor|neighbourhood|observation|pattern|period|change|edit|stop|plan|home|wedge|figure|estimate|layer|wave|word|image|note|lesson|star|color|colour|photo|airport|event|earthquake|quake|eruption|droplet|stage|input|design|topic|case|cycle|pole|location|objective|character|credit|plate|pick|result|sound)s|inches|boxes|copies|batches|categories|entries|halves|shelves|tries|classes|guesses|quizzes|feet|people|children|volcanoes)\b( are| were| have| make| fit| remain| get| meet| need)?/g, function (m, pre, there, mod, noun, verb, at, all) { if (/(?:\b(?:Grade|Row|Column|Group|Team|Player|Level|Round|Step|Set|Part|Page|Table|Type|Day|Week|Stage|Trial|Test|Sample|Question|Problem|Card|Box|Line|Side|Figure|Item|Number|Chapter|Section|Area|Zone|Class|Tier|Unit|Lesson|Module|Generation)|[×÷+*]) $/i.test(all.slice(0, at + pre.length))) return m; if (/^(?:square|cube|round|point|change|group)s$/.test(noun) && /^ (?:to|up|down|into)\b/.test(all.slice(at + m.length))) return m; return pre + (there ? there.replace('are', 'is') : '') + '1 ' + (mod || '') + (irr[noun] || noun.slice(0, -1)) + (verb === ' are' ? ' is' : verb === ' were' ? ' was' : verb === ' have' ? ' has' : verb ? verb + 's' : ''); }).replace(/\b1 (row|group) of (\d+) make\b/g, '1 $1 of $2 makes'); }
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

  /* ============ Sound Engine (Web Audio API) ============ */
  var _audioCtx = null;
  function getAudioCtx() {
    if (!_audioCtx) { try { _audioCtx = (window.StemLab && window.StemLab.audioContext ? window.StemLab.audioContext() : new (window.AudioContext || window.webkitAudioContext)()); } catch(e) {} }
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
    // needsAI: no local factor/simplify/expand engine, so these cannot be earned offline (shown honestly).
    { id: 'factorPro', needsAI: true, icon: '\uD83E\uDDE9', label: 'Factor Pro', desc: 'Factor 3 expressions', xp: 15, check: function(d) { return (d._factorCount || 0) >= 3; } },
    { id: 'builderUsed', icon: '\uD83E\uDDF1', label: 'Builder', desc: 'Build an equation with the builder', xp: 10, check: function(d) { return d._builderUsed; } },
    { id: 'scaleSolver', icon: '\u2696', label: 'Scale Solver', desc: 'Solve an equation on the balance scale', xp: 15, check: function(d) { return (d._scaleSolves || 0) >= 1; } },
    { id: 'practiceStreak3', icon: '\uD83D\uDD25', label: 'Streak!', desc: '3 correct answers in a row', xp: 20, check: function(d) { return (d._maxStreak || 0) >= 3; } },
    { id: 'allModes', needsAI: true, icon: '\uD83C\uDF1F', label: 'All Modes', desc: 'Use all 4 CAS modes', xp: 15, check: function(d) { var m = d._modesUsed || {}; return m.solve && m.factor && m.simplify && m.expand; } },
    { id: 'difficultyUp', icon: '\uD83D\uDE80', label: 'Aiming High', desc: 'Try Advanced difficulty', xp: 10, check: function(d) { return d._triedAdvanced; } },
    { id: 'aiCurious', needsAI: true, icon: '\uD83E\uDD16', label: 'Curious Mind', desc: 'Ask AI tutor 3 questions', xp: 15, check: function(d) { return (d._aiQuestions || 0) >= 3; } },
    { id: 'historyBuff', icon: '\uD83D\uDCDC', label: 'History Buff', desc: 'Build up 10 history entries', xp: 15, check: function(d) { return (d.history || []).length >= 10; } },
    { id: 'balanceMaster', icon: '\uD83C\uDFC5', label: 'Balance Master', desc: 'Solve 3 equations on balance scale', xp: 25, check: function(d) { return (d._scaleSolves || 0) >= 3; } },
    { id: 'algebraChampion', needsAI: true, icon: '\uD83C\uDFC6', label: 'Algebra Champion', desc: 'Earn 10 other badges', xp: 50, check: function(d) { return (d._badgesEarned || []).length >= 10; } }
  ];

  /* ============ Grade-Band Helper ============ */
  function getGradeBand(ctx) {
    var g = ctx.gradeLevel || 5;
    // The live ctx sends a STRING ('5th Grade'); numeric compares on it are all
    // false, which put every student in g912. Same rule as graphCalc.
    if (typeof g !== 'number') {
      var gl = String(g).toLowerCase();
      if (/k|1st|2nd|pre/.test(gl)) return 'k2';
      if (/3rd|4th|5th/.test(gl)) return 'g35';
      if (/6th|7th|8th/.test(gl)) return 'g68';
      if (/9th|10|11|12|high/.test(gl)) return 'g912';
      return 'g35';
    }
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
    // "4 1/2" is a mixed number: stripping the space read it as 41/2. Two numbers with
    // only a space between them ("2 3x") have no operator, so '?' makes them unparseable.
    var MIXED = /(^|[^\d.\/])(\d+)\s+(\d+)\s*\/\s*(\d+)(?![\d.])/g;
    function normalize(s) {
      if (s == null) return '';
      return String(s)
        .replace(/²/g, '^2').replace(/³/g, '^3')
        .replace(/×/g, '*').replace(/÷/g, '/')
        .replace(/√/g, 'sqrt').replace(/−/g, '-')
        .replace(MIXED, '$1($2+$3/$4)')
        .replace(/([\d.])\s+(?=[\d.])/g, '$1?')
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
          if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(num)) return null;
          toks.push({ t: 'num', v: parseFloat(num), raw: num });
        } else if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')) {
          var id = '';
          while (i < s.length && ((s[i] >= 'a' && s[i] <= 'z') || (s[i] >= 'A' && s[i] <= 'Z'))) { id += s[i]; i++; }
          var low = id.toLowerCase();
          // Only sqrt/abs and one-letter variables are understood. Any other word
          // (sin, pi, "apples") used to evaluate AS x, so sin(x) graded equal to x^2.
          if (FUNCS[low]) toks.push({ t: 'func', v: low }); else if (low.length === 1) toks.push({ t: 'var', v: low }); else return null;
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
      function pTerm() { var v = pUnary(); while (peek() && peek().t === 'op' && (peek().v === '*' || peek().v === '/')) { var op = next().v; var r = pUnary(); v = op === '*' ? v * r : v / r; } return v; }
      function pUnary() { if(peek() && peek().t==='op' && (peek().v==='-' || peek().v==='+')) { var sign=next().v;var value=pUnary();return sign==='-'?-value:value; } return pFactor(); }
      function pFactor() { var v = pBase(); if (peek() && peek().t === 'op' && peek().v === '^') { next(); var r = pUnary(); v = Math.pow(v, r); } return v; }
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
    function _varNames(toks) { var seen = []; for (var k = 0; k < toks.length; k++) if (toks[k].t === 'var' && seen.indexOf(toks[k].v) < 0) seen.push(toks[k].v); return seen.sort(); }
    function evalAt(exprStr, xval) {
      // One unknown only: y = 2x + 1 with y read as x is a different equation.
      try { var toks = tokenize(normalize(exprStr)); if (!toks || !toks.length || _varNames(toks).length > 1) return NaN; var v = evalTokens(toks, xval); return (typeof v === 'number' && isFinite(v)) ? v : NaN; } catch (e) { return NaN; }
    }
    function parseEquation(str) { var s = normalize(str); var parts = s.split('='); if (parts.length === 1) return { lhs: parts[0], rhs: '0' }; if (parts.length === 2) return { lhs: parts[0], rhs: parts[1] }; return null; }
    function _constValue(p) { var a = evalAt(p, 0), b = evalAt(p, 1.7); if (isNaN(a)) return NaN; if (Math.abs(a - b) < 1e-9) return a; return NaN; }
    // "1,000" is one number: splitting on every comma read it as the roots 1 and 0.
    var THOUSANDS = /(^|[^\d.,])(\d{1,3}(?:,\d{3})+)(?!\d|,\d)/g;
    function _unthousand(s) { return s == null ? s : String(s).replace(THOUSANDS, function (m, pre, num) { return pre + num.replace(/,/g, ''); }); }
    // Each listed value with the letter it was assigned to ('y' in "y = 3"), or null.
    function _namedRoots(answerStr, plainCommas) {
      if (answerStr == null) return [];
      var parts = (plainCommas ? String(answerStr) : _unthousand(answerStr)).split(/,|;|\bor\b|\band\b/i), roots = [];
      var G = window.StemLab && window.StemLab.grading;
      for (var i = 0; i < parts.length; i++) {
        var named = /([a-zA-Z])\s*=\s*/.exec(parts[i]);
        var p = parts[i].replace(/[a-zA-Z]\s*=\s*/, '').replace(/[{}\[\]]/g, '').trim();
        if (!p) continue;
        // A plain number goes through the shared reader ("3 1/2" was read as 31/2).
        var v = G ? G.toNumber(p) : NaN;
        if (!isFinite(v)) v = _constValue(p);
        if (!isNaN(v)) roots.push({ name: named ? named[1].toLowerCase() : null, value: v, text: p });
      }
      return roots;
    }
    function extractRoots(answerStr) { return _namedRoots(answerStr).map(function (r) { return r.value; }); }
    // Solutions are a SET: a double root listed twice ("x = 3, x = 3") is the same answer.
    function _distinct(a) { var x = a.slice().sort(function (p, q) { return p - q; }), out = []; for (var i = 0; i < x.length; i++) if (!out.length || Math.abs(x[i] - out[out.length - 1]) > 1e-6 * Math.max(1, Math.abs(x[i]))) out.push(x[i]); return out; }
    function _sameValues(a, b) { var x = _distinct(a), y = _distinct(b); if (x.length !== y.length) return false; for (var i = 0; i < x.length; i++) if (Math.abs(x[i] - y[i]) > 1e-6 * Math.max(1, Math.abs(x[i]))) return false; return true; }
    // Typed decimals that are the exact answer ROUNDED to the places typed (0.333 for 1/3).
    function _roundedMatch(nS, rC) {
      var s = nS.slice().sort(function (p, q) { return p.value - q.value; }).filter(function (r, i, arr) { return !i || Math.abs(r.value - arr[i - 1].value) > 1e-6 * Math.max(1, Math.abs(r.value)); });
      var c = _distinct(rC), rounded = false;
      if (s.length !== c.length) return false;
      for (var i = 0; i < s.length; i++) {
        var gap = Math.abs(s[i].value - c[i]);
        if (gap <= 1e-6 * Math.max(1, Math.abs(c[i]))) continue;
        var dm = /^\D?\d*\.(\d+)$/.exec(s[i].text.replace(/\s+/g, ''));
        if (!dm || gap > 0.5 * Math.pow(10, -dm[1].length) + 1e-12) return false;
        rounded = true;
      }
      return rounded;
    }
    function _fmt(n) { var r = Math.round(n * 1e6) / 1e6; return String(r); }
    function verifySolution(exprOrEq, answerStr) {
      var eq = parseEquation(exprOrEq), roots = extractRoots(answerStr);
      if (!eq || !roots.length) return { decidable: false, verified: null, roots: [], residuals: [], detail: 'Not auto-verifiable' };
      var lT = tokenize(eq.lhs), rT = tokenize(eq.rhs);
      if (lT && rT && _varNames(lT.concat(rT)).length > 1) return { decidable: false, verified: null, roots: roots, residuals: [], detail: 'Not auto-verifiable' };
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
    function _gradeAnswer(studentStr, correctStr, plainCommas) {
      var nS = _namedRoots(studentStr, plainCommas), nC = _namedRoots(correctStr);
      var rS = nS.map(function (r) { return r.value; }), rC = nC.map(function (r) { return r.value; });
      var names = []; nC.forEach(function (r) { if (r.name && names.indexOf(r.name) < 0) names.push(r.name); });
      if (rS.length && rC.length && names.length > 1) {
        // A system (x = 2, y = 3): compare per variable. Pooling the values let the
        // swapped answer x = 3, y = 2 grade correct.
        if (nS.concat(nC).some(function (r) { return !r.name; })) return { decidable: false, correct: false, method: 'na', detail: 'Could not auto-check' };
        names.sort();
        var sNames = []; nS.forEach(function (r) { if (sNames.indexOf(r.name) < 0) sNames.push(r.name); });
        var pick = function (list, name) { return list.filter(function (r) { return r.name === name; }).map(function (r) { return r.value; }); };
        var okSys = sNames.sort().join() === names.join() && names.every(function (n) { return _sameValues(pick(nS, n), pick(nC, n)); });
        return { decidable: true, correct: okSys, method: 'roots', detail: okSys ? 'Both give ' + names.map(function (n) { return n + ' = ' + pick(nC, n).map(_fmt).join(', '); }).join('; ') : 'Values differ for at least one variable' };
      }
      if (rS.length && rC.length) {
        var ok = _sameValues(rS, rC);
        if (!ok && _roundedMatch(nS, rC)) return { decidable: true, correct: false, rounded: true, method: 'roots', detail: 'A rounded value of the exact answer' };
        return { decidable: true, correct: ok, method: 'roots', detail: ok ? 'Both give x = ' + _distinct(rC).map(_fmt).join(', ') : 'Roots differ' };
      }
      var sN = normalize(studentStr), cN = normalize(correctStr);
      if (!sN || !cN) return { decidable: false, correct: false, method: 'na', detail: 'Could not auto-check' };
      // Different letters (y^2 against x^2) are not the same expression; leave it to the reviewer.
      var sT = tokenize(sN), cT = tokenize(cN), sV = sT ? _varNames(sT) : [], cV = cT ? _varNames(cT) : [];
      if (sV.length && cV.length && sV.join() !== cV.join()) return { decidable: false, correct: false, method: 'na', detail: 'Could not auto-check' };
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
    function gradeAnswer(studentStr, correctStr) {
      var r = _gradeAnswer(studentStr, correctStr, false);
      // "10,100" may be the roots 10 and 100 typed without a space: accept that reading too.
      if (!r.correct && /\d,\d{3}/.test(String(studentStr))) { var plain = _gradeAnswer(studentStr, correctStr, true); if (plain.correct) return plain; }
      return r;
    }
    // Keep balance steps exact: decimal inputs become rational coefficients, so
    // dividing by 3 and multiplying back never changes the equation through rounding.
    function rational(n, d) {
      if (d === 0n) throw 0;
      if (d < 0n) { n = -n; d = -d; }
      var a = n < 0n ? -n : n, b = d;
      while (b) { var remainder = a % b; a = b; b = remainder; }
      return { n: n / a, d: d / a };
    }
    function rationalNumber(raw) {
      var text = String(raw).trim();
      if (text.length > 128 || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) throw 0;
      var decimals = (text.split('.')[1] || '').length;
      return rational(BigInt(text.replace('.', '')), 10n ** BigInt(decimals));
    }
    function rAdd(a, b) { return rational(a.n * b.d + b.n * a.d, a.d * b.d); }
    function rNeg(a) { return { n: -a.n, d: a.d }; }
    function rMul(a, b) { return rational(a.n * b.n, a.d * b.d); }
    function rDiv(a, b) { return rational(a.n * b.d, a.d * b.n); }
    function rEqual(a, b) { return a.n === b.n && a.d === b.d; }
    function rText(a) { return String(a.n) + (a.d === 1n ? '' : '/' + a.d); }
    function rCmp(a, b) { var g = a.n * b.d - b.n * a.d; return g < 0n ? -1 : g > 0n ? 1 : 0; }
    // Worked steps keep a student's decimals as decimals when the value is a terminating one.
    function decText(a) {
      var d = a.d, two = 0, five = 0;
      while (d % 2n === 0n) { d /= 2n; two++; }
      while (d % 5n === 0n) { d /= 5n; five++; }
      var places = Math.max(two, five);
      if (d !== 1n || !places) return rText(a);
      var scaled = a.n * (10n ** BigInt(places)) / a.d, neg = scaled < 0n, s = String(neg ? -scaled : scaled);
      while (s.length <= places) s = '0' + s;
      return (neg ? '-' : '') + s.slice(0, s.length - places) + '.' + s.slice(s.length - places);
    }
    function numText(a, dec) { return dec ? decText(a) : rText(a); }
    // One term as written: never "1x", "-1x" or the ambiguous "2/3x".
    function termText(t, dec) {
      if (!t.a.n) return numText(t.b, dec);
      if (t.a.n === t.a.d) return 'x';
      if (t.a.n === -t.a.d) return '-x';
      var c = numText(t.a, dec);
      return (c.indexOf('/') < 0 ? c : '(' + c + ')') + 'x';
    }
    function termsText(terms, dec) {
      var out = '';
      terms.forEach(function (t) {
        if (!t.a.n && !t.b.n) return;
        var neg = t.a.n ? t.a.n < 0n : t.b.n < 0n;
        var body = termText(neg ? { a: rNeg(t.a), b: rNeg(t.b) } : t, dec);
        out += out ? (neg ? ' - ' : ' + ') + body : (neg ? '-' : '') + body;
      });
      return out || '0';
    }
    function linearSide(expression) {
      if (String(expression).length > 4096) return null;
      var tokens = tokenize(normalize(expression)), pos = 0;
      if (!tokens) return null;
      var zero = rational(0n, 1n), one = rational(1n, 1n);
      function peek(value) { return tokens[pos] && tokens[pos].v === value; }
      function constant(value) { return { a: zero, b: value }; }
      function add(left, right, subtract) {
        return { a: rAdd(left.a, subtract ? rNeg(right.a) : right.a), b: rAdd(left.b, subtract ? rNeg(right.b) : right.b) };
      }
      function expr() {
        var value = term();
        while (peek('+') || peek('-')) { var op = tokens[pos++].v; value = add(value, term(), op === '-'); }
        return value;
      }
      function term() {
        var value = unary();
        while (peek('*') || peek('/')) {
          var op = tokens[pos++].v, right = unary();
          if (op === '/') {
            if (right.a.n || !right.b.n) throw 0;
            value = { a: rDiv(value.a, right.b), b: rDiv(value.b, right.b) };
          } else {
            if (value.a.n && right.a.n) throw 0;
            value = { a: rAdd(rMul(value.a, right.b), rMul(right.a, value.b)), b: rMul(value.b, right.b) };
          }
        }
        return value;
      }
      function unary() {
        if (peek('+')) { pos++; return unary(); }
        if (peek('-')) { pos++; var value = unary(); return { a: rNeg(value.a), b: rNeg(value.b) }; }
        return power();
      }
      function power() {
        var value = atom();
        if (peek('^')) {
          pos++; var exponent = unary();
          if (exponent.a.n || exponent.b.d !== 1n || exponent.b.n > 100n || exponent.b.n < -100n) throw 0;
          if (value.a.n) { if (!rEqual(exponent.b, one)) throw 0; }
          else {
            var n = exponent.b.n, negative = n < 0n;
            if (!value.b.n && n <= 0n) throw 0;
            if (negative) n = -n;
            value = constant(negative ? rational(value.b.d ** n, value.b.n ** n) : rational(value.b.n ** n, value.b.d ** n));
          }
        }
        return value;
      }
      function atom() {
        var token = tokens[pos++];
        if (!token) throw 0;
        if (token.t === 'num') return constant(rationalNumber(token.raw));
        if (token.t === 'var' && token.v === 'x') return { a: one, b: zero };
        if (token.v === '(') { var value = expr(); if (!peek(')')) throw 0; pos++; return value; }
        throw 0;
      }
      try { var value = expr(); return pos === tokens.length ? value : null; } catch (e) { return null; }
    }
    var R0 = rational(0n, 1n), R1 = rational(1n, 1n);
    function sideForm(side) { return [{ a: side.a, b: R0 }, { a: R0, b: side.b }]; }
    function formText(side, dec) { return termsText(sideForm(side), dec); }
    // The same grammar as linearSide, kept as a tree: worked steps show distribution
    // before like terms are combined, and common slips can be rebuilt from the terms.
    function sideTree(expression) {
      if (String(expression).length > 4096) return null;
      var tokens = tokenize(normalize(expression)), pos = 0;
      if (!tokens) return null;
      function peek(v) { return tokens[pos] && tokens[pos].v === v; }
      function expr() { var items = [{ sign: 1, node: term() }]; while (peek('+') || peek('-')) { var op = tokens[pos++].v; items.push({ sign: op === '-' ? -1 : 1, node: term() }); } return { k: 'sum', items: items }; }
      function term() { var node = unary(); while (peek('*') || peek('/')) { var op = tokens[pos++].v; node = { k: op === '*' ? 'mul' : 'div', l: node, r: unary() }; } return node; }
      function unary() { if (peek('+')) { pos++; return unary(); } if (peek('-')) { pos++; return { k: 'neg', c: unary() }; } return power(); }
      function power() { var node = atom(); if (peek('^')) { pos++; node = { k: 'pow', l: node, r: unary() }; } return node; }
      function atom() {
        var tk = tokens[pos++];
        if (!tk) throw 0;
        if (tk.t === 'num') return { k: 'num', v: rationalNumber(tk.raw) };
        if (tk.t === 'var' && tk.v === 'x') return { k: 'x' };
        if (tk.v === '(') { var inner = expr(); if (!peek(')')) throw 0; pos++; return { k: 'group', c: inner }; }
        throw 0;
      }
      try { var tree = expr(); return pos === tokens.length ? tree : null; } catch (e) { return null; }
    }
    function formOf(node) {
      if (node.f) return node.f;
      var f, l, r;
      if (node.k === 'num') f = { a: R0, b: node.v };
      else if (node.k === 'x') f = { a: R1, b: R0 };
      else if (node.k === 'neg') { l = formOf(node.c); f = { a: rNeg(l.a), b: rNeg(l.b) }; }
      else if (node.k === 'group') f = formOf(node.c);
      else if (node.k === 'sum') {
        f = { a: R0, b: R0 };
        node.items.forEach(function (it) { var g = formOf(it.node); f = { a: rAdd(f.a, it.sign < 0 ? rNeg(g.a) : g.a), b: rAdd(f.b, it.sign < 0 ? rNeg(g.b) : g.b) }; });
      } else if (node.k === 'mul') {
        l = formOf(node.l); r = formOf(node.r);
        if (l.a.n && r.a.n) throw 0;
        f = { a: rAdd(rMul(l.a, r.b), rMul(r.a, l.b)), b: rMul(l.b, r.b) };
      } else if (node.k === 'div') {
        r = formOf(node.r);
        if (r.a.n || !r.b.n) throw 0;
        l = formOf(node.l); f = { a: rDiv(l.a, r.b), b: rDiv(l.b, r.b) };
      } else if (node.k === 'pow') {
        l = formOf(node.l); r = formOf(node.r);
        if (r.a.n || r.b.d !== 1n || r.b.n > 100n || r.b.n < -100n) throw 0;
        if (l.a.n) { if (!rEqual(r.b, R1)) throw 0; f = l; }
        else {
          var n = r.b.n, negative = n < 0n;
          if (!l.b.n && n <= 0n) throw 0;
          if (negative) n = -n;
          f = { a: R0, b: negative ? rational(l.b.d ** n, l.b.n ** n) : rational(l.b.n ** n, l.b.d ** n) };
        }
      } else throw 0;
      node.f = f;
      return f;
    }
    // Multiply every bracket out, term by term. `slip` rebuilds one error inside the
    // bracket numbered slip.at: 'first' multiplies only its first term; 'sign' gives the
    // later terms the size of a negative multiplier without its sign.
    function flatten(node, mult, slip, out) {
      if (node.k === 'num') { out.push({ a: R0, b: rMul(mult, node.v) }); return; }
      if (node.k === 'x') { out.push({ a: mult, b: R0 }); return; }
      if (node.k === 'neg') { flatten(node.c, rNeg(mult), slip, out); return; }
      if (node.k === 'sum') { node.items.forEach(function (it) { flatten(it.node, it.sign < 0 ? rNeg(mult) : mult, slip, out); }); return; }
      if (node.k === 'group') {
        var items = node.c.items, gf = formOf(node);
        // A bracket of numbers only (a mixed number "4 1/2" arrives as (4+1/2)) is one number.
        if (!gf.a.n) { out.push({ a: R0, b: rMul(mult, gf.b) }); return; }
        if (!rEqual(mult, R1) && items.length > 1) {
          slip.distributed = true;
          var id = slip.count++;
          var wrong = slip.at === id && ((slip.kind === 'first' && !rEqual(mult, R1) && !rEqual(mult, rNeg(R1))) || (slip.kind === 'sign' && mult.n < 0n));
          if (wrong) {
            slip.used = true;
            var later = slip.kind === 'first' ? R1 : rNeg(mult);
            items.forEach(function (it, i) { var m = i === 0 ? mult : later; flatten(it.node, it.sign < 0 ? rNeg(m) : m, slip, out); });
            return;
          }
        }
        flatten(node.c, mult, slip, out);
        return;
      }
      if (node.k === 'mul') {
        var lf = formOf(node.l);
        if (!lf.a.n) flatten(node.r, rMul(mult, lf.b), slip, out);
        else flatten(node.l, rMul(mult, formOf(node.r).b), slip, out);
        return;
      }
      if (node.k === 'div') { flatten(node.l, rDiv(mult, formOf(node.r).b), slip, out); return; }
      if (node.k === 'pow') {
        var pf = formOf(node);
        if (pf.a.n) flatten(node.l, mult, slip, out); else out.push({ a: R0, b: rMul(mult, pf.b) });
        return;
      }
      throw 0;
    }
    function sumTerms(terms) { var f = { a: R0, b: R0 }; terms.forEach(function (t) { f = { a: rAdd(f.a, t.a), b: rAdd(f.b, t.b) }; }); return f; }
    function sameForm(p, q) { return rEqual(p.a, q.a) && rEqual(p.b, q.b); }
    // Terms of one side with every bracket multiplied out, or null.
    function sideTerms(expression, slip) {
      var tree = sideTree(expression), state = slip || { at: -1 }, out = [];
      state.count = 0; state.distributed = false; state.used = false;
      if (!tree) return null;
      try { formOf(tree); flatten(tree, R1, state, out); } catch (e) { return null; }
      return { terms: out, distributed: state.distributed, used: state.used, groups: state.count };
    }
    function equationForms(equation) {
      var parts = normalize(equation).split('=');
      if (parts.length !== 2) return null;
      var left = linearSide(parts[0]), right = linearSide(parts[1]);
      return left && right ? { left: left, right: right, parts: parts } : null;
    }
    function solvedFormOf(f) {
      function isolated(side, other) { return side.a.n === side.a.d && !side.b.n && !other.a.n; }
      return !!f && (isolated(f.left, f.right) || isolated(f.right, f.left));
    }
    // Solved means x alone on EITHER side: "4 = x" is as solved as "x = 4".
    function solvedForm(equation) { return solvedFormOf(equationForms(equation)); }
    var RULE_TEXT = { distribute: 'Distribute', combine: 'Combine like terms', subtract: 'Subtract {v} from both sides', add: 'Add {v} to both sides',
      divide: 'Divide both sides by {v}', multiply: 'Multiply both sides by {v}', swap: 'Swap the sides so x is on the left', isolated: 'x is already alone on one side', compare: 'Compare the two sides' };
    // Exact worked steps: distribute, combine like terms, collect x, isolate, divide.
    function linearSteps(equation) {
      var f = equationForms(equation);
      if (!f) return { ok: false };
      var dec = /\d\.|\.\d/.test(String(equation));
      var lt = sideTerms(f.parts[0]), rt = sideTerms(f.parts[1]);
      // The term view must agree with the exact forms, or it is not shown.
      if (lt && rt && !(sameForm(sumTerms(lt.terms), f.left) && sameForm(sumTerms(rt.terms), f.right))) lt = rt = null;
      var steps = [], L = f.left, R = f.right;
      function push(rule, value, left, right, text) { steps.push({ rule: rule, value: value || '', equation: text || formText(left, dec) + ' = ' + formText(right, dec) }); }
      function crowded(terms) { var xs = 0, cs = 0; terms.forEach(function (t) { if (t.a.n) xs++; else if (t.b.n) cs++; }); return xs > 1 || cs > 1; }
      if (lt && rt && (lt.distributed || rt.distributed)) push('distribute', '', null, null, termsText(lt.terms, dec) + ' = ' + termsText(rt.terms, dec));
      if (lt && rt && (crowded(lt.terms) || crowded(rt.terms))) push('combine', '', L, R);
      var xLeft = true;
      if (L.a.n && R.a.n) {
        var keepLeft = rCmp(L.a, R.a) >= 0, move = keepLeft ? R.a : L.a;
        xLeft = keepLeft;
        L = { a: rAdd(L.a, rNeg(move)), b: L.b }; R = { a: rAdd(R.a, rNeg(move)), b: R.b };
        push(move.n > 0n ? 'subtract' : 'add', termText({ a: move.n > 0n ? move : rNeg(move), b: R0 }, dec), L, R);
      } else if (!L.a.n && R.a.n) xLeft = false;
      var kind = (L.a.n || R.a.n) ? 'unique' : rEqual(L.b, R.b) ? 'identity' : 'contradiction';
      if (kind !== 'unique') {
        if (!steps.length) push('compare', '', L, R);
        return { ok: true, kind: kind, answer: kind === 'identity' ? 'All real numbers' : 'No solution', steps: steps, dec: dec };
      }
      var X = xLeft ? L : R, O = xLeft ? R : L;
      function emit(rule, value) { push(rule, value, xLeft ? X : O, xLeft ? O : X); }
      if (X.b.n) {
        var k = X.b;
        X = { a: X.a, b: R0 }; O = { a: R0, b: rAdd(O.b, rNeg(k)) };
        emit(k.n > 0n ? 'subtract' : 'add', numText(k.n > 0n ? k : rNeg(k), dec));
      }
      if (!rEqual(X.a, R1)) {
        var c = X.a;
        X = { a: R1, b: R0 }; O = { a: R0, b: rDiv(O.b, c) };
        // A fractional coefficient is undone with its reciprocal: (2/3)x needs 3/2, not "divide by 2/3".
        if (c.d === 1n || (dec && decText(rDiv(R1, c)).indexOf('/') >= 0)) emit('divide', numText(c, dec));
        else emit('multiply', numText(rDiv(R1, c), dec));
      }
      if (!xLeft) { xLeft = true; emit('swap', ''); }
      if (!steps.length) push('isolated', '', X, O);
      return { ok: true, kind: 'unique', answer: rText(O.b), steps: steps, dec: dec };
    }
    // E4: algebra-tile counts for each pan. `whole` when every count is an integer from
    // -20 to 20, so it can be drawn; otherwise only the words describe it. Plain numbers.
    function tileCounts(equation) {
      var f = equationForms(equation);
      if (!f) return { ok: false };
      function small(r) { return r.d === 1n && r.n <= 20n && r.n >= -20n; }
      function side(s) { return { x: Number(s.a.n) / Number(s.a.d), one: Number(s.b.n) / Number(s.b.d), text: formText(s, false) }; }
      return { ok: true, whole: small(f.left.a) && small(f.left.b) && small(f.right.a) && small(f.right.b), left: side(f.left), right: side(f.right) };
    }
    // What one balance operation does to the tiles: Add/Subtract put the same tiles in both
    // pans, and each positive tile meeting a negative one of the same kind is a zero pair.
    function tileStep(equation, operation, rawValue) {
      var f = equationForms(equation), operand = linearSide(rawValue);
      if (!f || !operand) return null;
      if (operation === 'Add' || operation === 'Subtract') {
        if (operand.a.d !== 1n || operand.b.d !== 1n) return { kind: 'addsub', whole: false };
        var sign = operation === 'Add' ? 1 : -1, ax = sign * Number(operand.a.n) || 0, a1 = sign * Number(operand.b.n) || 0; // no -0
        var pairs = function (before, added) { return before * added < 0 ? Math.min(Math.abs(before), Math.abs(added)) : 0; };
        var num = function (r) { return Number(r.n) / Number(r.d); };
        return { kind: 'addsub', whole: true, added: { x: ax, one: a1 },
          pairs: { left: { x: pairs(num(f.left.a), ax), one: pairs(num(f.left.b), a1) }, right: { x: pairs(num(f.right.a), ax), one: pairs(num(f.right.b), a1) } } };
      }
      return { kind: operation === 'Multiply' ? 'multiply' : 'divide', value: rText(operand.b), whole: operand.b.d === 1n && operand.b.n > 0n };
    }
    function ruleText(step) { return (RULE_TEXT[step.rule] || '').replace('{v}', step.value); }
    function balanceOperation(equation, operation, rawValue) {
      var operand = linearSide(rawValue);
      if (!operand) return { ok: false, reason: 'value' };
      if ((operation === 'Multiply' || operation === 'Divide') && operand.a.n) return { ok: false, reason: 'scalar' };
      var value = operand.b;
      if ((operation === 'Multiply' || operation === 'Divide') && !value.n) return { ok: false, reason: 'zero' };
      var parts = normalize(equation).split('=');
      if (parts.length !== 2) return { ok: false, reason: 'linear' };
      var left = linearSide(parts[0]), right = linearSide(parts[1]);
      if (!left || !right) return { ok: false, reason: 'linear' };
      function apply(side) {
        if (operation === 'Add' || operation === 'Subtract') return { a: rAdd(side.a, operation === 'Add' ? operand.a : rNeg(operand.a)), b: rAdd(side.b, operation === 'Add' ? value : rNeg(value)) };
        if (operation === 'Multiply') return { a: rMul(side.a, value), b: rMul(side.b, value) };
        if (operation === 'Divide') return { a: rDiv(side.a, value), b: rDiv(side.b, value) };
        throw 0;
      }
      try { left = apply(left); right = apply(right); } catch (e) { return { ok: false, reason: 'value' }; }
      function text(side) {
        if (!side.a.n) return rText(side.b);
        var coefficient = side.a.n === side.a.d ? '' : side.a.n === -side.a.d ? '-' : side.a.d === 1n ? rText(side.a) : '(' + rText(side.a) + ')';
        return coefficient + 'x' + (side.b.n ? ' ' + (side.b.n < 0n ? '-' : '+') + ' ' + rText(side.b.n < 0n ? rNeg(side.b) : side.b) : '');
      }
      return { ok: true, equation: text(left) + ' = ' + text(right),
        solved: solvedFormOf({ left: left, right: right }),
        identity: rEqual(left.a, right.a) && rEqual(left.b, right.b),
        impossible: rEqual(left.a, right.a) && !rEqual(left.b, right.b) };
    }

    // A substitution check uses the same exact coefficients as balance operations.
    // Only the diagram converts to floating point; equality never uses a tolerance.
    function balanceTrial(equation, rawValue) {
      var value, mixed = /^\s*([+-]?)(\d{1,60})\s+(\d{1,60})\s*\/\s*(\d{1,60})\s*$/.exec(String(rawValue == null ? '' : rawValue).replace(/−/g, '-'));
      if (mixed) {
        // "4 1/2" is four and a half, not 41/2.
        if (mixed[4] === '0' || /^0+$/.test(mixed[4])) return { ok: false, reason: 'value' };
        value = rAdd(rational(BigInt(mixed[2]), 1n), rational(BigInt(mixed[3]), BigInt(mixed[4])));
        if (mixed[1] === '-') value = rNeg(value);
      } else {
        var valueText = normalize(rawValue);
        if (valueText.length > 128 || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:\/[+-]?(?:\d+(?:\.\d*)?|\.\d+))?$/.test(valueText)) return { ok: false, reason: 'value' };
        try {
          var fraction = valueText.split('/');
          value = rationalNumber(fraction[0]);
          if (fraction.length === 2) value = rDiv(value, rationalNumber(fraction[1]));
        } catch (_err) { return { ok: false, reason: 'value' }; }
      }
      var parts = normalize(equation).split('=');
      if (parts.length !== 2) return { ok: false, reason: 'equation' };
      var left = linearSide(parts[0]), right = linearSide(parts[1]);
      if (!left || !right) return { ok: false, reason: 'equation' };
      var leftValue = rAdd(rMul(left.a, value), left.b);
      var rightValue = rAdd(rMul(right.a, value), right.b);
      var difference = rAdd(leftValue, rNeg(rightValue));
      var sameCoefficient = rEqual(left.a, right.a);
      return {
        ok: true, x: rText(value), left: rText(leftValue), right: rText(rightValue), difference: rText(difference),
        relation: difference.n < 0n ? '<' : difference.n > 0n ? '>' : '=',
        kind: sameCoefficient ? (rEqual(left.b, right.b) ? 'identity' : 'contradiction') : 'conditional',
        leftSubstitution: parts[0].replace(/x/gi, '(' + rText(value) + ')'),
        rightSubstitution: parts[1].replace(/x/gi, '(' + rText(value) + ')'),
        leftNumber: Number(leftValue.n) / Number(leftValue.d), rightNumber: Number(rightValue.n) / Number(rightValue.d),
        previousX: rText(rAdd(value, rational(-1n, 1n))), nextX: rText(rAdd(value, rational(1n, 1n)))
      };
    }



    function solveLinear(equation) {
      var parts = normalize(equation).split('=');
      if (parts.length !== 2) return { ok: false };
      var left = linearSide(parts[0]), right = linearSide(parts[1]);
      if (!left || !right) return { ok: false };
      var coefficient = rAdd(left.a, rNeg(right.a)), constant = rAdd(right.b, rNeg(left.b));
      var kind = coefficient.n ? 'unique' : constant.n ? 'contradiction' : 'identity';
      var answer = kind === 'unique' ? rText(rDiv(constant, coefficient)) : kind === 'identity' ? 'All real numbers' : 'No solution';
      // The old two lines jumped from 3(x-2) = 15 to 3x = 21 and printed "1x" and "Divide both sides by 1".
      var worked = linearSteps(equation);
      var steps = (worked.ok ? worked.steps : []).map(function (s, i) { return 'STEP ' + (i + 1) + ': ' + s.equation + ' [' + ruleText(s) + ']'; });
      var trial = kind === 'unique' ? balanceTrial(equation, answer) : null;
      return { ok: true, kind: kind, answer: answer, text: steps.join('\n') + '\nANSWER: ' + answer,
        verify: { decidable: true, verified: true, exact: true, detail: trial && trial.ok ? 'x=' + answer + ': LHS=' + trial.left + ', RHS=' + trial.right : 'Exact comparison of the linear coefficients and constants.' } };
    }
    function checkLinearStep(before, after) {
      var a = solveLinear(before), b = solveLinear(after);
      if (!a.ok || !b.ok) return { ok: false, detail: 'Use two complete linear equations in x, with constant nonzero denominators.' };
      var equivalent = a.kind === b.kind && (a.kind !== 'unique' || a.answer === b.answer);
      var slip = equivalent ? null : diagnoseStep(before, after);
      return { ok: true, equivalent: equivalent, error: slip ? slip.code : null, value: slip ? slip.value : '', detail: equivalent ? 'These equations have exactly the same solution set.' : 'This step changes the solution set. Check that the operation preserves both sides.' };
    }
    function _solutionKey(f) {
      var c = rAdd(f.left.a, rNeg(f.right.a)), k = rAdd(f.right.b, rNeg(f.left.b));
      return c.n ? rText(rDiv(k, c)) : k.n ? 'none' : 'all';
    }
    // E2: rebuild the equation each common slip would give from the exact forms of
    // `before`, and name a slip only when exactly one kind of slip gives the student's line.
    function diagnoseStep(before, after) {
      var b = equationForms(before), got = equationForms(after);
      if (!b || !got) return null;
      var dec = /\d\.|\.\d/.test(String(before)), forms = [b.left, b.right], cands = [];
      function add(code, value, side, mine, other) { cands.push({ code: code, value: value, left: side === 0 ? mine : other, right: side === 0 ? other : mine }); }
      for (var s = 0; s < 2; s++) {
        var mine = forms[s], other = forms[1 - s], base = sideTerms(b.parts[s]);
        // Distribution: only the first term of a bracket multiplied, or a negative multiplier's
        // sign given to the first term only. One bracket at a time.
        for (var g = 0; base && g < base.groups; g++) {
          ['first', 'sign'].forEach(function (kind) {
            var slipped = sideTerms(b.parts[s], { at: g, kind: kind });
            if (slipped && slipped.used) add(kind === 'first' ? 'distribute_first' : 'distribute_sign', '', s, sumTerms(slipped.terms), other);
          });
        }
        if (base) base.terms.forEach(function (t) {
          if (!t.a.n && !t.b.n) return;
          // A term carried to the other side with its sign unchanged.
          add('move_sign', termText(t, dec), s, { a: rAdd(mine.a, rNeg(t.a)), b: rAdd(mine.b, rNeg(t.b)) }, { a: rAdd(other.a, t.a), b: rAdd(other.b, t.b) });
        });
        if (base && base.terms.some(function (t) { return t.a.n; }) && base.terms.some(function (t) { return !t.a.n && t.b.n; }))
          add('combine_unlike', '', s, { a: rAdd(mine.a, mine.b), b: R0 }, other);
        if (mine.a.n && !rEqual(mine.a, R1)) {
          var c = mine.a, alone = { a: R1, b: mine.b };
          // Only the x-term divided: with the other side divided, or with nothing else divided.
          if (mine.b.n) add('divide_one', numText(c, dec), s, alone, { a: rDiv(other.a, c), b: rDiv(other.b, c) });
          add('divide_one', numText(c, dec), s, alone, other);
          // The coefficient taken away as if it were added: 3x -> x, and 3 subtracted from the other side.
          if (c.d === 1n) add('coefficient_addend', numText(c, dec), s, alone, { a: other.a, b: rAdd(other.b, rNeg(c)) });
        }
      }
      var right = _solutionKey(b), codes = [], first = null;
      cands.forEach(function (cand) {
        if (_solutionKey(cand) === right) return; // that "slip" changes nothing here
        var match = (sameForm(got.left, cand.left) && sameForm(got.right, cand.right)) || (sameForm(got.left, cand.right) && sameForm(got.right, cand.left));
        if (!match) return;
        if (codes.indexOf(cand.code) < 0) codes.push(cand.code);
        if (!first) first = cand;
      });
      return codes.length === 1 ? { code: first.code, value: first.value } : null;
    }
    // A blank in a faded worked example: the typed line must be what THIS step gives
    // (same exact sides, either way round). An equivalent line from another route is
    // true but not this step; anything else goes through the step checker.
    function checkWorkedLine(previous, expected, typed, ordered) {
      var got = equationForms(typed), want = equationForms(expected);
      if (!got || !want) return { status: 'invalid' };
      // `ordered`: a "swap the sides" step is only done when the sides are swapped.
      if ((sameForm(got.left, want.left) && sameForm(got.right, want.right)) || (!ordered && sameForm(got.left, want.right) && sameForm(got.right, want.left))) return { status: 'match' };
      var step = checkLinearStep(previous, typed);
      if (!step.ok) return { status: 'invalid' };
      if (step.equivalent) return { status: 'equivalent' };
      return { status: 'wrong', error: step.error || null, value: step.value || '' };
    }
    function linearPractice(level, index) {
      var i = Math.abs(Math.floor(Number(index) || 0)) % 36, a = 2 + i % 7, b = i % 9 - 4, x = i % 11 - 5;
      var problem = level === 'advanced' ? '(' + a + 'x + ' + b + ')/3 = ' + (a*x+b) + '/3' :
        level === 'middle' ? a + '(x + ' + b + ') = ' + (a*x+a*b-x) + ' + x' : a + 'x + ' + b + ' = ' + (a*x+b);
      problem = problem.replace(/\+ -/g, '- ');
      var solution = solveLinear(problem);
      return { problem: problem, answer: solution.answer, solution: solution.text, source: 'local-linear', hint: 'Apply the same reversible operation to both sides; collect x terms before dividing.' };
    }
    function gradeLinear(equation, answer) {
      var solved = solveLinear(equation);
      if (!solved.ok) return { decidable: false };
      var candidate = normalize(_unthousand(answer)).replace(/^x=/i, '');
      if (solved.kind !== 'unique') return { decidable: true, correct: candidate.toLowerCase() === normalize(solved.answer).toLowerCase(), detail: 'Compare whether the equation is an identity or a contradiction.' };
      var value = linearSide(candidate);
      if (!value || value.a.n) return { decidable: false, detail: 'Enter one number or fraction, optionally starting with x =.' };
      var correct = rText(value.b) === solved.answer;
      // 0.333 for 1/3 is the exact answer rounded, not a wrong method: say so instead of a flat "wrong".
      var places = /^[+-]?\d*\.(\d+)$/.exec(candidate);
      if (!correct && places) {
        var exact = linearSide(solved.answer).b, gap = Math.abs(Number(value.b.n) / Number(value.b.d) - Number(exact.n) / Number(exact.d));
        if (gap <= 0.5 * Math.pow(10, -places[1].length) + 1e-12) return { decidable: true, correct: false, rounded: true, detail: 'A rounded value of the exact answer' };
      }
      return { decidable: true, correct: correct, detail: 'Checked against the exact linear solution.' };
    }
    // The math inside an AI problem statement: "Solve for x: 2x + 3 = 11" -> "2x + 3 = 11".
    // Null when anything but math remains (word problems, extra sentences).
    function problemMath(text) {
      var s = String(text == null ? '' : text);
      if (s.length > 500) return null;
      var colon = s.lastIndexOf(':');
      if (colon >= 0) s = s.slice(colon + 1);
      s = s.replace(/\bfor\s+[a-z]\b[,]?/gi, ' ').replace(/^(?:\s*(?!sqrt\b|abs\b)[A-Za-z]{2,}\b[,]?)+/, '').replace(/[.\s]+$/, '').trim();
      if (!s) return null;
      var parts = normalize(s).split('=');
      if (parts.length > 2) return null;
      for (var i = 0; i < parts.length; i++) { var tk = tokenize(parts[i]); if (!tk || !tk.length) return null; }
      return s;
    }
    // Degree of (left - right) when it is a polynomial of degree 1-6 (finite differences
    // at x = -3..5 vanish), else null.
    function _polyDegree(equation) {
      var eq = parseEquation(equation), vals = [];
      if (!eq) return null;
      for (var x = -3; x <= 5; x++) { var v = evalAt(eq.lhs, x) - evalAt(eq.rhs, x); if (!isFinite(v)) return null; vals.push(v); }
      var scale = Math.max.apply(null, vals.map(Math.abs).concat([1]));
      for (var k = 1; k <= 7; k++) {
        var next = [];
        for (var i = 1; i < vals.length; i++) next.push(vals[i] - vals[i - 1]);
        vals = next;
        if (vals.every(function (d) { return Math.abs(d) <= 1e-9 * scale * Math.pow(2, k); })) return k - 1 >= 1 ? k - 1 : null;
      }
      return null;
    }
    function _within(v, list) { for (var i = 0; i < list.length; i++) if (Math.abs(v - list[i]) <= 1e-6 * Math.max(1, Math.abs(v))) return true; return false; }
    // E1: an AI answer key is a claim, not ground truth. Decide the student's answer from
    // the PROBLEM whenever the engine can, and report whether the key itself holds up.
    // key: 'ok' | 'wrong' | 'incomplete' | 'unknown'. code says why, for the render layer.
    function gradeFromProblem(problemText, keyText, studentText) {
      var math = problemMath(problemText), student = String(studentText == null ? '' : studentText).trim(), key = String(keyText == null ? '' : keyText).trim();
      if (!math || !student) return { decidable: false, key: 'unknown', code: 'unparsed' };
      var linear = solveLinear(math);
      if (linear.ok) {
        var gs = gradeLinear(math, student), gk = key ? gradeLinear(math, key) : { decidable: false };
        var linKey = gk.decidable ? (gk.correct ? 'ok' : 'wrong') : 'unknown';
        if (!gs.decidable) return { decidable: false, key: linKey, code: 'unparsed', exactAnswer: linear.answer };
        if (gs.rounded) return { decidable: false, rounded: true, key: linKey, code: 'rounded', exactAnswer: linear.answer };
        return { decidable: true, correct: gs.correct, method: 'linear', key: linKey, code: gs.correct ? 'linear_ok' : 'linear_wrong', exactAnswer: linear.answer };
      }
      if (math.indexOf('=') >= 0) {
        var sv = verifySolution(math, student), kv = key ? verifySolution(math, key) : { decidable: false };
        var eqKey = kv.decidable ? (kv.verified ? 'ok' : 'wrong') : 'unknown';
        if (!sv.decidable) return { decidable: false, key: eqKey, code: 'unparsed' };
        if (eqKey === 'ok') { var near = gradeAnswer(student, key); if (near.rounded) return { decidable: false, rounded: true, key: 'ok', code: 'rounded' }; }
        if (!sv.verified) return { decidable: true, correct: false, method: 'substitution', key: eqKey, code: 'fails_substitution' };
        if (eqKey === 'ok') {
          var sRoots = _distinct(sv.roots), kRoots = _distinct(kv.roots);
          var missing = kRoots.filter(function (r) { return !_within(r, sRoots); }).length;
          if (missing) return { decidable: true, correct: false, method: 'substitution', key: 'ok', code: 'missing_roots', missing: missing };
          var extra = sRoots.filter(function (r) { return !_within(r, kRoots); }).length;
          return { decidable: true, correct: true, method: 'substitution', key: extra ? 'incomplete' : 'ok', code: 'roots_ok' };
        }
        // Every value satisfies the equation, but the key cannot be trusted to say none are missing.
        // A polynomial of degree n has at most n roots: n distinct working values is complete.
        var deg = _polyDegree(math);
        if (deg !== null && _distinct(sv.roots).length >= deg) return { decidable: true, correct: true, method: 'substitution', key: eqKey, code: 'roots_complete' };
        return { decidable: false, satisfies: true, key: eqKey, code: 'satisfies_only' };
      }
      // An expression to factor, expand or simplify: equal at sample points to the original.
      var se = gradeAnswer(student, math), ke = key ? gradeAnswer(key, math) : { decidable: false };
      var exKey = ke.decidable ? (ke.correct ? 'ok' : 'wrong') : 'unknown';
      if (!se.decidable) return { decidable: false, key: exKey, code: 'unparsed' };
      if (!se.correct) return { decidable: true, correct: false, method: 'sample', key: exKey, code: 'not_equivalent' };
      if (normalize(student) === normalize(math)) return { decidable: true, correct: false, method: 'sample', key: exKey, code: 'unchanged' };
      // Equal in value; whether it is in the requested FORM is checked only where that is clear.
      var task = /\bfactor/i.test(problemText) ? 'factor' : /\bexpand|\bmultiply out|\bdistribute/i.test(problemText) ? 'expand' : 'other';
      var formOk = task === 'factor' ? /\(/.test(student) : task === 'expand' ? !/\(/.test(student) : null;
      if (formOk === null && exKey === 'ok') formOk = normalize(student).length <= normalize(key).length ? true : null;
      if (formOk === true) return { decidable: true, correct: true, method: 'sample', key: exKey, code: 'equivalent' };
      if (formOk === false) return { decidable: true, correct: false, method: 'sample', key: exKey, code: task === 'factor' ? 'not_factored' : 'not_expanded' };
      return { decidable: false, key: exKey, code: 'equivalent_form_unknown' };
    }
    // The AI result on the Solve tab, checked the same way: roots by substitution,
    // factor/simplify/expand by sample-point equivalence with the expression entered.
    function checkAiResult(expression, mode, answer) {
      if (!answer) return { decidable: false, verified: null, detail: 'Not auto-verifiable' };
      if (mode === 'solve') return verifySolution(expression, answer);
      var g = gradeAnswer(answer, expression);
      if (!g.decidable || g.method !== 'sample') return { decidable: false, verified: null, method: 'sample', detail: 'Not auto-verifiable' };
      var points = /(\d+) test points/.exec(g.detail || '');
      return { decidable: true, verified: g.correct, method: 'sample', points: points ? +points[1] : 0, detail: g.detail };
    }

    return { linearSteps:linearSteps, ruleText:ruleText, solvedForm:solvedForm, checkWorkedLine:checkWorkedLine, diagnoseStep:diagnoseStep, tileCounts:tileCounts, tileStep:tileStep, gradeFromProblem:gradeFromProblem, checkAiResult:checkAiResult, problemMath:problemMath, solveLinear:solveLinear, checkLinearStep:checkLinearStep, linearPractice:linearPractice, gradeLinear:gradeLinear, balanceTrial:balanceTrial, linearSide:linearSide, balanceOperation:balanceOperation, normalize: normalize, evalAt: evalAt, parseEquation: parseEquation, extractRoots: extractRoots, verifySolution: verifySolution, gradeAnswer: gradeAnswer };
  })();
  try { window.__alloCASPure = __alloCASPure; } catch (_e) {}

  /* ============ TTS Helper (Kokoro-first) ============ */
  // A speak button: the host voice with force (the header narration switch gates only automatic
  // narration). The host plays the clip itself and never throws. It resolves null while the app is
  // muted (stay silent), when student AI is off (it already used the device voice) or when no voice
  // came back: only that last case calls onNone.
  function raHostSpeak(callTTS, text, onNone) {
    var req = null;
    try { req = callTTS(text, undefined, undefined, { force: true }); } catch (e) {}
    function quiet() { try { if (typeof window.__alloIsGlobalMuted === 'function' && window.__alloIsGlobalMuted()) return true; } catch (e) {} return !!window._alloGlobalMute || window.__alloStudentAiDisabled === true; }
    Promise.resolve(req).then(function (url) { if (!url && !quiet() && onNone) onNone(); }, function () { if (!quiet() && onNone) onNone(); });
  }
  function speakText(text, callTTS, fallingBack) {
    if (!fallingBack) SOUNDS.tts();
    if (callTTS) { raHostSpeak(callTTS, text, function () { speakText(text, null, true); }); return; }
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
    icon: '\uD83D\uDD23',
    label: 'Algebra Solver',
    desc: 'Interactive algebra with equation builder, balance scale, and step-by-step AI solving',
    color: 'amber',
    category: 'math',
    questHooks: [
      { id: 'solve_5', label: 'Solve 5 equations', icon: '\uD83D\uDD22', check: function(d) { return (d._solveCount || 0) >= 5; }, progress: function(d) { return (d._solveCount || 0) + '/5'; } },
      { id: 'factor_3', label: 'Factor 3 expressions (needs the AI provider)', icon: '\uD83E\uDDE9', check: function(d) { return (d._factorCount || 0) >= 3; }, progress: function(d) { return (d._factorCount || 0) + '/3'; } },
      { id: 'scale_solve', label: 'Solve an equation on the balance scale', icon: '\u2696\uFE0F', check: function(d) { return (d._scaleSolves || 0) >= 1; }, progress: function(d) { return (d._scaleSolves || 0) >= 1 ? 'Done!' : 'Not yet'; } },
      { id: 'streak_3', label: 'Get a 3-answer correct streak', icon: '\uD83D\uDD25', check: function(d) { return (d._maxStreak || 0) >= 3; }, progress: function(d) { return (d._maxStreak || 0) + '/3 streak'; } },
      { id: 'all_modes', label: 'Use all 4 CAS modes (solve, factor, simplify, expand; needs the AI provider)', icon: '\uD83C\uDF1F', check: function(d) { var m = d._modesUsed || {}; return !!(m.solve && m.factor && m.simplify && m.expand); }, progress: function(d) { var m = d._modesUsed || {}; return Object.keys(m).length + '/4 modes'; } }
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

      // MathLive is an accessible input adapter only. AlgebraCAS remains the
      // authoritative solver and grader through window.__alloCASPure.
      var openAccessibleMathInput = function(currentValue, onValue, title) {
        var ensureInput = window.AlloMathInput
          ? Promise.resolve(window.AlloMathInput)
          : (typeof window.__alloLoadPlugin === 'function'
            ? window.__alloLoadPlugin('mathlive_loader.js').then(function() { return window.AlloMathInput; })
            : Promise.reject(new Error('Math input loader is unavailable')));
        ensureInput.then(function(mathInput) {
          if (!mathInput || typeof mathInput.promptEquation !== 'function') throw new Error('Accessible math input did not initialize');
          return mathInput.promptEquation({
            title: title || 'Enter an equation',
            initialLatex: currentValue || '',
            insertLabel: 'Use equation',
onSpeak: function(formats) {
              var spoken = (formats && (formats.spoken || formats.plainText || formats.latex)) || currentValue || '';
              if (!spoken) return;
              // The host plays its own clip (playing the URL here too was a second copy).
              if (callTTS) { raHostSpeak(callTTS, spoken, function() { speakText(spoken, null); }); return; }
              speakText(spoken, null);
            }
          });
        }).then(function(result) {
          if (!result) return;
          var value = result.engineText || (window.AlloMathInput && window.AlloMathInput.toEngineText
            ? window.AlloMathInput.toEngineText(result)
            : '') || result.asciiMath || result.plainText || result.latex || '';
          if (value) onValue(value);
        }).catch(function(err) {
          if (typeof addToast === 'function') addToast('Accessible math input is unavailable: ' + (err && err.message ? err.message : 'unknown error'), 'error');
        });
      };
      var mathInputButton = function(currentValue, onValue, title) {
        return h('button', {
          type: 'button',
          'data-math-input-launch': 'algebraCAS',
          'aria-label': 'Open accessible math keyboard',
          title: 'Open accessible math keyboard',
          onClick: function() { openAccessibleMathInput(currentValue, onValue, title); },
          style: { maxWidth: '100%', padding: '8px 11px', borderRadius: '10px', background: 'transparent', border: '1px solid currentColor', color: (ctx.isDark || ctx.isContrast) ? '#a78bfa' : '#6d28d9', fontWeight: '700', fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap' }
        }, '\u2328 Math keyboard');
      };

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
        // One polite announcement per result: the host's announcer, else this tool's own live region.
        var announce = function(msg) {
          if (!msg) return;
          if (typeof announceToSR === 'function') { try { announceToSR(String(msg)); return; } catch (e) {} }
          var live = document.getElementById('allo-live-algebraCAS');
          if (live) { live.textContent = ''; setTimeout(function() { live.textContent = String(msg); }, 50); }
        };

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
        // `tab` is PERSISTED state and every view is a `tab === '<id>'` branch, so an
        // id this build does not know matched NONE of them: the tool rendered its
        // header and tab strip over an empty body -- a dead end that looks functional.
        // `|| 'solve'` only catches null/empty. Allow-list the ids that actually have a
        // branch. Declared here, at the READ site, because any existing tab-id array
        // is assigned further down and `var` hoists the declaration, not the value.
        var TAB_IDS = ['builder', 'practice', 'scale', 'solve', 'tutor'];
        var tab = TAB_IDS.indexOf(d.tab) !== -1 ? d.tab : 'solve';
        // No usable AI (ctx hands callGemini as null): the tutor tab is hidden, so a saved 'tutor' falls back.
        if (tab === 'tutor' && !callGemini) tab = 'solve';
        // Saved state is INPUT: `||` is a NULL guard, not a TYPE guard.
        var expression = typeof d.expression === 'string' ? d.expression : '';
        // All four MODES ids: allow-listing only two made Simplify/Expand dead buttons
        // and the all_modes quest unreachable.
        var mode = (d.mode === 'solve' || d.mode === 'factor' || d.mode === 'simplify' || d.mode === 'expand') ? d.mode : 'solve';
        var result = d.result || null;
        var verify = d.verify || null;
        var isLoading = d.isLoading || false;
        var history = Array.isArray(d.history) ? d.history : [];
        var difficulty = d.difficulty || 'elementary';
        var practiceQ = d.practiceQ || null;
        var practiceAnswer = d.practiceAnswer || '';
        var practiceFeedback = d.practiceFeedback || null;
        var practiceType = d.practiceType || 'random';
        var practiceScore = d.practiceScore || 0;
        var practiceStreak = d.practiceStreak || 0;
        var showSolution = d.showSolution || false;
        var builderTiles = Array.isArray(d.builderTiles) ? d.builderTiles : [];
        var scaleEq = d.scaleEq || '';
        var scaleSteps = d.scaleSteps || [];
        var scaleSolved = d.scaleSolved || false;
        var tutorChat = Array.isArray(d.tutorChat) ? d.tutorChat : [];
        var tutorInput = typeof d.tutorInput === 'string' ? d.tutorInput : '';

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
        var MODE_VERBS = { solve: t('stem.algebraCAS.verb_solve', 'Solve'), factor: t('stem.algebraCAS.verb_factor', 'Factor'), simplify: t('stem.algebraCAS.verb_simplify', 'Simplify'), expand: t('stem.algebraCAS.verb_expand', 'Expand') };
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
        // Darker tile colors preserve white-label contrast; the separate legend
        // palette adapts to the surrounding light/dark surface.
        var TILE_COLORS = { num: '#1d4ed8', 'var': '#6d28d9', op: '#92400e', spc: '#047857' };
        var LEGEND_COLORS = (isDark || isContrast)
          ? { num: '#93c5fd', 'var': '#c4b5fd', op: '#fcd34d', spc: '#6ee7b7' }
          : TILE_COLORS;

        /* -- Grade-band intros -- */
        // The 6-8 and 9-12 lines promised quadratics, systems and a "full CAS"; only linear
        // equations are solved locally, so the claim now says what needs the AI provider.
        var GRADE_INTROS = {
          k2: t('stem.algebraCAS.intro_k2', 'Solve simple puzzles like 2 + x = 5!'),
          g35: t('stem.algebraCAS.intro_g35', 'Solve linear equations step-by-step.'),
          g68: t('stem.algebraCAS.intro_g68_local', 'Solve and check linear equations step by step, with a balance and algebra tiles. Factoring, quadratics and systems need the AI provider.'),
          g912: t('stem.algebraCAS.intro_g912_local', 'Exact linear solving with checked steps. Factoring, quadratics and other polynomials need the AI provider; the engine checks its answers where it can.')
        };

        /* ============ HANDLERS ============ */
        var handleSolve = function() {
          if (!expression.trim() || isLoading) return;
          // A result on screen means this exact expression and mode were already
          // solved (edits and mode changes clear it): re-clicking must not re-count.
          var repeat = !!result;
          var local = mode === 'solve' ? __alloCASPure.solveLinear(expression) : { ok: false };
          if (local.ok) {
            var localHistory = repeat ? history : history.slice(-9).concat([{ expr: expression, mode: mode, result: local.text, verify: local.verify, ts: Date.now() }]);
            var localModes=Object.assign({},d._modesUsed||{},{solve:true}),localCount=(d._solveCount||0)+(repeat?0:1);
            updMulti({ result: local.text, verify: local.verify, history: localHistory, isLoading: false, _solveCount:localCount, _modesUsed:localModes });
            if(awardStemXP&&!repeat)awardStemXP('algebraCAS',5,'Exact local solve');
            announce(t('stem.algebraCAS.sr_answer', 'Answer:') + ' ' + (local.kind === 'unique' ? 'x = ' + local.answer : local.answer));
            checkBadges(Object.assign({},d,{_solveCount:localCount,_modesUsed:localModes,history:localHistory}));
            return;
          }
          if (!callGemini) { updMulti({ result: 'Local solving supports linear equations in x, including fractions and parentheses. Use the Balance tab or enter a linear equation. This expression or mode needs the AI provider.', verify: { unavailable: true } }); return; }
          updMulti({ isLoading: true, result: null, verify: null });
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
              // Solve: substitute the roots back. Factor/simplify/expand: sample-point equivalence.
              var _chk = (_aM && _aM[1].trim()) ? __alloCASPure.checkAiResult(expression, mode, _aM[1].trim()) : { decidable: false };
              var newH = repeat ? history : history.slice(-9);
              if (!repeat) newH.push({ expr: expression, mode: mode, result: res, verify: _chk, ts: Date.now() });
              var sc = (d._solveCount || 0) + (repeat ? 0 : 1);
              var fc = (d._factorCount || 0) + (mode === 'factor' && !repeat ? 1 : 0);
              var mu = Object.assign({}, d._modesUsed || {}); mu[mode] = true;
              updMulti({ isLoading: false, result: res, verify: _chk, history: newH, _solveCount: sc, _factorCount: fc, _modesUsed: mu });
              if (awardStemXP && !repeat) awardStemXP('algebraCAS', 5, 'CAS solve');
              checkBadges(Object.assign({}, d, { _solveCount: sc, _factorCount: fc, _modesUsed: mu, history: newH }));
            } else { upd('isLoading', false); }
          }).catch(function(e) {
            updMulti({ isLoading: false, result: 'Error: ' + (e.message || 'Failed') });
          });
        };

        // Offline, three problem types have exact local items: Linear (one/two-step),
        // Multi-step (brackets, x on both sides) and Fractions. Others need the AI provider.
        var LOCAL_TYPE_LEVEL = { linear: 'elementary', 'multi-step': 'middle', fractions: 'advanced' };
        function startLocalPractice() {
          var index = (d.localPracticeIndex || 0) + 1;
          updMulti({ practiceQ: __alloCASPure.linearPractice(LOCAL_TYPE_LEVEL[practiceType] || difficulty, index), localPracticeIndex: index, practiceFeedback: null, practiceAnswer: '', practiceNotice: '', showSolution: false, isLoading: false });
        }
        var handlePracticeGen = function() {
          if (isLoading) return;
          if (!callGemini || (practiceQ && practiceQ.source === 'local-linear')) { startLocalPractice(); return; }
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
              var genProblem = pM ? pM[1].trim() : res, genAnswer = aM ? aM[1].trim() : '';
              // Check the AI's key against its own problem before any student answers.
              var keyStatus = genAnswer ? __alloCASPure.gradeFromProblem(genProblem, genAnswer, genAnswer).key : 'unknown';
              upd('practiceQ', { problem: genProblem, answer: genAnswer, hint: hM ? hM[1].trim() : 'Think step by step!', keyStatus: keyStatus });
            }
          }).catch(function() { upd('isLoading', false); });
        };

        var handlePracticeCheck = function() {
          if (!practiceQ || !practiceAnswer.trim() || practiceFeedback || isLoading) return;
          if (practiceQ.source === 'local-linear') {
            var localGrade = __alloCASPure.gradeLinear(practiceQ.problem, practiceAnswer);
            if (!localGrade.decidable) { upd('practiceNotice', localGrade.detail); return; }
            if (localGrade.rounded) { upd('practiceNotice', t('stem.algebraCAS.rounded_write_exact', 'Close! That looks like a rounded decimal. Write the exact value, for example as a fraction.')); return; }
            var streak = localGrade.correct ? practiceStreak + 1 : 0;
            updMulti({ practiceNotice: '', practiceFeedback: { correct: localGrade.correct, text: 'FEEDBACK: ' + (localGrade.correct ? 'Your value satisfies the equation.' : 'Your value does not satisfy the equation. Compare the reversible steps below.') + '\nSOLUTION:\n' + practiceQ.solution, gradeSource: 'verified', gradeDetail: localGrade.detail }, practiceScore: practiceScore + (localGrade.correct ? 1 : 0), practiceStreak: streak, _maxStreak: Math.max(d._maxStreak || 0, streak), showSolution: !localGrade.correct });
            if (localGrade.correct && awardStemXP) awardStemXP('algebraCAS', 10, 'Exact linear practice');
            announce((localGrade.correct ? t('stem.algebraCAS.sr_correct', 'Correct.') : t('stem.algebraCAS.sr_not_correct', 'Not correct yet.')) + ' ' + practiceQ.problem);
            checkBadges(Object.assign({},d,{_maxStreak:Math.max(d._maxStreak||0,streak)}));
            return;
          }
          // E1: grade against the PROBLEM. The AI key used to be trusted, so a wrong key marked a
          // right answer wrong "checked by the math engine".
          var student = practiceAnswer.trim();
          var asksRounding = /\bround|\bnearest\b|decimal place|\bapproximat|\u2248/i.test(practiceQ.problem + ' ' + practiceQ.answer);
          var verdict = __alloCASPure.gradeFromProblem(practiceQ.problem, practiceQ.answer, student);
          var _det = { decidable: false, correct: false, source: 'ai', code: verdict.code, key: verdict.key };
          if (verdict.decidable) _det = { decidable: true, correct: verdict.correct, source: 'verified', code: verdict.code, key: verdict.key, detail: '' };
          else if (verdict.key !== 'wrong' && !verdict.rounded) {
            // The engine cannot read the problem (a word problem, a system): fall back to the key,
            // and say whether the key itself was checked.
            var byKey = __alloCASPure.gradeAnswer(student, practiceQ.answer);
            if (byKey.rounded) verdict = { rounded: true, key: verdict.key };
            else if (byKey.decidable) _det = { decidable: true, correct: byKey.correct, source: verdict.key === 'ok' ? 'verified' : 'key', code: verdict.key === 'ok' ? 'key_checked' : 'key_unchecked', key: verdict.key, detail: byKey.detail };
          }
          // A rounded decimal (0.333 for 1/3) is not exactly right: ask for the exact value
          // instead of a flat "wrong". If the problem asks for rounding, the reviewer decides.
          if (verdict.rounded) {
            if (!asksRounding) { upd('practiceNotice', t('stem.algebraCAS.rounded_write_exact', 'Close! That looks like a rounded decimal. Write the exact value, for example as a fraction.')); return; }
            _det = { decidable: false, correct: false, source: 'ai', key: verdict.key };
          }
          var finish = function(isRight, text) {
            var newStreak = isRight ? practiceStreak + 1 : 0;
            var maxSt = Math.max(d._maxStreak || 0, newStreak);
            if (isRight) { SOUNDS.correct(); if (awardStemXP) awardStemXP('algebraCAS', 10, 'Practice correct'); }
            else { SOUNDS.wrong(); }
            if (isRight && stemCelebrate && newStreak % 3 === 0) stemCelebrate();
            updMulti({ practiceNotice: '', practiceFeedback: { correct: isRight, text: text, gradeSource: _det.decidable ? _det.source : 'ai', gradeDetail: _det.decidable ? (_det.detail || '') : '', gradeCode: _det.code || '', keyStatus: _det.key || 'unknown' }, practiceScore: practiceScore + (isRight ? 1 : 0), practiceStreak: newStreak, _maxStreak: maxSt, showSolution: !isRight });
            announce((isRight ? t('stem.algebraCAS.sr_correct', 'Correct.') : t('stem.algebraCAS.sr_not_correct', 'Not correct yet.')) + ' ' + practiceQ.problem);
            checkBadges(Object.assign({}, d, { _maxStreak: maxSt }));
          };
          if (!callGemini) {
            // No provider left to write feedback, but the engine can still decide from the problem.
            if (_det.decidable && _det.source === 'verified') { finish(_det.correct, 'FEEDBACK: '); return; }
            upd('practiceNotice', 'This generated problem needs the AI provider. Start local linear practice to continue.'); return;
          }
          upd('isLoading', true);
          var engineNote = _det.decidable && _det.source === 'verified' ? '\nENGINE VERDICT (checked against the problem itself): the student\'s answer is ' + (_det.correct ? 'CORRECT' : 'NOT correct') + '. Your FEEDBACK must agree with this verdict.' : '';
          if (_det.key === 'wrong') engineNote += '\nWARNING: the CORRECT line above fails the math engine\'s check against the problem. Do not rely on it; work from the problem.';
          if (verdict.satisfies) engineNote += '\nENGINE NOTE: every value the student gave satisfies the equation. Decide only whether any solution is missing.';
          var prompt = 'Student solving:\nPROBLEM: ' + practiceQ.problem + '\nCORRECT: ' + practiceQ.answer +
            '\nSTUDENT: ' + student + engineNote + '\n\nRespond EXACTLY:\nCORRECT: yes/no\nFEEDBACK: (1-2 sentences)\n' +
            'SOLUTION:\nSTEP 1: (work) [Rule]\n...\nANSWER: (result)\nAlways include full step-by-step SOLUTION.';
          callGemini(prompt).then(function(res) {
            upd('isLoading', false);
            if (res) finish(_det.decidable ? _det.correct : /CORRECT:\s*yes/i.test(res), res);
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
          if (eq) { updMulti({ expression: eq, tab: 'solve', result: null, verify: null, stepCheck: null }); }
        };

        /* -- Scale helpers -- */
        var scaleOperationPending=false;
        var handleScaleOp = function(op, val) {
          if (!scaleEq || scaleSolved || scaleOperationPending) return;
          var result=__alloCASPure.balanceOperation(scaleEq,op,val);
          if(!result.ok){upd('scaleNotice',result.reason==='zero'?t('stem.algebraCAS.balance_nonzero','Choose a nonzero value. Dividing by zero is undefined; multiplying by zero loses information about the solution.'):result.reason==='scalar'?t('stem.algebraCAS.balance_scalar_operation','Multiply or divide by a nonzero constant. To move an x-term, add or subtract that term on both sides.'):result.reason==='linear'?t('stem.algebraCAS.balance_linear_scope','Use a linear equation in x here. The Solve tab handles other equation types.'):t('stem.algebraCAS.balance_term_value','Enter a number, fraction, or linear term such as 2x for this operation.'));return;}
          // E7: with predictions on, an operation waits for "stays level" or "tips".
          var predicting=!!d.scalePredictOn, opChoice=d.scaleOpChoice==='stays'||d.scaleOpChoice==='tips'?d.scaleOpChoice:null;
          if(predicting&&!opChoice){upd('scaleNotice',t('stem.algebraCAS.predict_first','Choose a prediction first.'));return;}
          scaleOperationPending=true;
          SOUNDS.scaleOp();
          var tileInfo=__alloCASPure.tileStep(scaleEq,op,val), stepNo=scaleSteps.length+1;
          var description=op+' '+val+' '+t('stem.algebraCAS.on_both_sides','on both sides')+' → '+result.equation;
          // Credit only real progress: "Add 0" on a loaded x = 5 used to count as a solve, every time.
          var origin=scaleSteps.length&&typeof d.scaleOrigin==='string'?d.scaleOrigin:scaleEq;
          var solved=result.solved, credited=solved&&!__alloCASPure.solvedForm(origin), count=(d._scaleSolves||0)+(credited?1:0);
          var notice=result.identity?t('stem.algebraCAS.balance_identity','Both sides are identical: every real x is a solution.'):result.impossible?t('stem.algebraCAS.balance_impossible','The variable terms match but the constants differ: there is no solution.'):t('stem.algebraCAS.balance_preserved','The same reversible operation was applied to both sides; the solution set stays the same.');
          if(solved&&!credited)notice=t('stem.algebraCAS.balance_already_solved','x was already alone when this equation was loaded, so this does not count as a new solve.');
          var opFeedback=predicting?(opChoice==='stays'?t('stem.algebraCAS.op_predict_right','Prediction confirmed: the same operation on both sides keeps the two sides equal, so the scale stays level.'):t('stem.algebraCAS.op_predict_wrong','The scale stayed level. Doing the same thing to both sides keeps them equal, which is why every step keeps the same solution.')):'';
          updMulti({scalePreviousEq:scaleEq,scaleOrigin:origin,scaleEq:result.equation,scaleSteps:scaleSteps.concat([description]),scaleSolved:solved,_scaleSolves:count,scaleNotice:notice,
            scaleTileStep:tileInfo?Object.assign({},tileInfo,{step:stepNo,op:op,val:val}):null,scaleOpChoice:null,scaleOpResult:predicting?{choice:opChoice,step:stepNo}:null});
          announce(result.equation+'. '+(opFeedback?opFeedback+' ':'')+notice);
          if(credited){if(awardStemXP)awardStemXP('algebraCAS',15,'Balance scale solved');if(stemCelebrate)stemCelebrate();checkBadges(Object.assign({},d,{_scaleSolves:count}));}
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
          // The tab promises the tutor sees the active problem and recent attempts: send them.
          var context = '';
          if (expression.trim()) context += 'Problem on the Solve tab (' + mode + '): ' + expression.trim().slice(0, 200) + '\n';
          if (practiceQ && practiceQ.problem) context += 'Current practice problem: ' + String(practiceQ.problem).slice(0, 200) + (practiceAnswer.trim() ? '; the student answered: ' + practiceAnswer.trim().slice(0, 80) : '') + (practiceFeedback ? (practiceFeedback.correct ? ' (graded correct)' : ' (graded not correct)') : '') + '\n';
          var recent = history.slice(-3).map(function(hi) { return hi.mode + ': ' + String(hi.expr).slice(0, 80); });
          if (recent.length) context += 'Recent attempts: ' + recent.join('; ') + '\n';
          var prompt = 'You are a friendly algebra tutor for a grade ' + (gradeLevel || 5) + ' student.\n' + context +
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
            if (isStep) return h('div', { key: i, style: { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: '6px', padding: '4px 0', animation: 'casStepIn 240ms ease-out both', animationDelay: Math.min(i * 40, 280) + 'ms' } },
              h('span', { style: { flex: '1 1 160px', minWidth: 0, overflowWrap: 'anywhere' } }, ruleM ? line.replace(ruleM[0], '').trim() : trimmed),
              ruleM ? h('span', { style: { padding: '2px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: '700', background: 'rgba(99,102,241,0.15)', color: ACCENT, border: '1px solid rgba(99,102,241,0.35)', whiteSpace: 'normal', maxWidth: '100%', overflowWrap: 'anywhere' } }, ruleM[1]) : null
            );
            if (/^SOLUTION:/i.test(trimmed)) return null;
            return h('div', { key: i, style: { padding: '2px 0' } }, trimmed);
          });
        };

        /* -- Exact worked steps (local linear equations) -- */
        var RULE_T = {
          distribute: t('stem.algebraCAS.rule_distribute', 'Distribute'),
          combine: t('stem.algebraCAS.rule_combine', 'Combine like terms'),
          subtract: t('stem.algebraCAS.rule_subtract', 'Subtract {v} from both sides'),
          add: t('stem.algebraCAS.rule_add', 'Add {v} to both sides'),
          divide: t('stem.algebraCAS.rule_divide', 'Divide both sides by {v}'),
          multiply: t('stem.algebraCAS.rule_multiply', 'Multiply both sides by {v}'),
          swap: t('stem.algebraCAS.rule_swap', 'Swap the sides so x is on the left'),
          isolated: t('stem.algebraCAS.rule_isolated', 'x is already alone on one side'),
          compare: t('stem.algebraCAS.rule_compare', 'Compare the two sides')
        };
        var ruleLabel = function(step) { return (RULE_T[step.rule] || '').split('{v}').join(step.value); };
        // E2: a named slip, only when exactly one common error rebuilds the student's line.
        var stepErrorText = function(code, value) {
          var M = {
            distribute_first: t('stem.algebraCAS.err_distribute_first', 'It looks like only the first term in the brackets was multiplied. Multiply every term inside the brackets by the number outside.'),
            distribute_sign: t('stem.algebraCAS.err_distribute_sign', 'It looks like the negative was applied only to the first term in the brackets. A negative outside the brackets changes the sign of every term inside.'),
            move_sign: t('stem.algebraCAS.err_move_sign', 'It looks like {v} moved to the other side without changing its sign. Moving a term means subtracting it from both sides, so its sign changes.'),
            divide_one: t('stem.algebraCAS.err_divide_one', 'It looks like only one term was divided by {v}. Divide every term on both sides by {v}.'),
            combine_unlike: t('stem.algebraCAS.err_combine_unlike', 'It looks like an x-term and a number were combined. Only like terms combine: x-terms with x-terms, numbers with numbers.'),
            coefficient_addend: t('stem.algebraCAS.err_coefficient_addend', 'It looks like {v} was subtracted instead of divided. In {v}x, the {v} multiplies x, so divide both sides by {v} to undo it.')
          };
          // Saved state is input: only an own key of the table names a slip.
          return typeof code === 'string' && Object.prototype.hasOwnProperty.call(M, code) ? M[code].split('{v}').join(String(value || '')) : '';
        };
        var verdictText = function(code) { return typeof code === 'string' && Object.prototype.hasOwnProperty.call(VERDICT_TEXT, code) ? VERDICT_TEXT[code] : ''; };
        // E1: why the engine decided, from the problem itself (codes from gradeFromProblem).
        var VERDICT_TEXT = {
          linear_ok: t('stem.algebraCAS.verdict_linear_ok', 'your value is the exact solution of the problem.'),
          linear_wrong: t('stem.algebraCAS.verdict_linear_wrong', 'your value is not the exact solution of the problem.'),
          fails_substitution: t('stem.algebraCAS.verdict_fails_substitution', 'substituting your value into the problem does not make both sides equal.'),
          missing_roots: t('stem.algebraCAS.verdict_missing_roots', 'your values work, but the equation has another solution that you have not listed.'),
          roots_ok: t('stem.algebraCAS.verdict_roots_ok', 'every value you gave makes the equation true, and none is missing.'),
          roots_complete: t('stem.algebraCAS.verdict_roots_complete', 'every value you gave makes the equation true, and an equation of this degree has no more solutions.'),
          not_equivalent: t('stem.algebraCAS.verdict_not_equivalent', 'your expression is not equal to the original one.'),
          unchanged: t('stem.algebraCAS.verdict_unchanged', 'this is the expression you started with, rewritten no further.'),
          equivalent: t('stem.algebraCAS.verdict_equivalent', 'your expression equals the original at every test point.'),
          not_factored: t('stem.algebraCAS.verdict_not_factored', 'your expression equals the original, but it is not written as a product of factors.'),
          not_expanded: t('stem.algebraCAS.verdict_not_expanded', 'your expression equals the original, but it still has brackets to multiply out.')
        };
        var answerText = function(work) {
          return work.kind === 'unique' ? 'x = ' + work.answer : work.kind === 'identity' ? t('stem.algebraCAS.answer_all_reals', 'All real numbers') : t('stem.algebraCAS.answer_none', 'No solution');
        };
        var conclusionText = function(work) {
          return work.kind === 'identity' ? t('stem.algebraCAS.steps_identity', 'The x-terms cancel and both sides are equal, so every real number is a solution.') :
            work.kind === 'contradiction' ? t('stem.algebraCAS.steps_contradiction', 'The x-terms cancel and the two numbers are different, so no value of x works.') : '';
        };
        var ruleChipStyle = { padding: '2px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', background: 'rgba(99,102,241,0.15)', color: ACCENT, border: '1px solid ' + BORDER, whiteSpace: 'normal', maxWidth: '100%', overflowWrap: 'anywhere' };
        var renderLinearList = function(equation) {
          var work = __alloCASPure.linearSteps(equation);
          if (!work.ok) return null;
          return h('ol', { 'data-cas-steps': 'exact', style: { listStyle: 'none', margin: 0, padding: 0 } },
            work.steps.map(function(s, i) {
              return h('li', { key: i, style: { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: '6px', padding: '4px 0' } },
                h('span', { style: { flex: '1 1 160px', minWidth: 0, overflowWrap: 'anywhere', fontFamily: 'monospace' } }, t('stem.algebraCAS.step_n', 'Step {n}:').replace('{n}', i + 1) + ' ' + s.equation),
                h('span', { style: ruleChipStyle }, ruleLabel(s)));
            }),
            conclusionText(work) ? h('li', { style: { padding: '4px 0' } }, conclusionText(work)) : null,
            h('li', { style: { marginTop: '8px', padding: '8px', borderRadius: '8px', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.45)', fontWeight: '700' } }, '✅ ' + t('stem.algebraCAS.answer_label', 'Answer:') + ' ' + answerText(work)));
        };
        // Read-aloud: the equation in words, through the same speech path as the math keyboard.
        var sayMath = function(eq) {
          return String(eq).replace(/\s+-\s+/g, ' ' + t('stem.algebraCAS.say_minus', 'minus') + ' ')
            .replace(/(^|[\s(])-/g, '$1' + t('stem.algebraCAS.say_negative', 'negative') + ' ')
            .replace(/\s*=\s*/g, ' ' + t('stem.algebraCAS.say_equals', 'equals') + ' ')
            .replace(/\s*\+\s*/g, ' ' + t('stem.algebraCAS.say_plus', 'plus') + ' ')
            .replace(/\//g, ' ' + t('stem.algebraCAS.say_over', 'over') + ' ');
        };
        var canSpeak = !!(callTTS || window.speechSynthesis || (window._kokoroTTS && window._kokoroTTS.speak));
        var speakAloud = function(text) {
          // The host plays its own clip (playing the URL here too was a second copy).
          if (callTTS) { raHostSpeak(callTTS, text, function() { speakText(text, null); }); return; }
          speakText(text, null);
        };
        var withKey = function(obj, k, v) { var o = Object.assign({}, obj); o[k] = v; return o; };
        var creditWorked = function(key, points, reason) {
          var G = window.StemLab && window.StemLab.grading, once = G ? G.creditOnce(d._workedCredit, key) : { isNew: true, seen: d._workedCredit || {} };
          if (!once.isNew) return;
          upd('_workedCredit', once.seen);
          if (awardStemXP) awardStemXP('algebraCAS', points, reason);
        };
        /* -- E3: worked example that fades from full, to partly blank, to the student's own lines -- */
        var renderWorked = function(equation) {
          var work = __alloCASPure.linearSteps(equation);
          // Nothing to work through when x is already alone, or the equation has no x.
          if (!work.ok || !work.steps.length || (work.steps.length === 1 && (work.steps[0].rule === 'isolated' || work.steps[0].rule === 'compare'))) return null;
          var same = d.workedEq === equation;
          var level = d.workedLevel === 'faded' || d.workedLevel === 'independent' ? d.workedLevel : 'full';
          var inputs = same && d.workedInputs && typeof d.workedInputs === 'object' ? d.workedInputs : {};
          var checks = same && d.workedChecks && typeof d.workedChecks === 'object' ? d.workedChecks : {};
          var lines = same && Array.isArray(d.workedLines) ? d.workedLines.filter(function(s) { return typeof s === 'string'; }) : [];
          var n = work.steps.length, firstBlank = level === 'faded' ? n - Math.ceil(n / 2) : n;
          var setWorked = function(patch) { updMulti(Object.assign({ workedEq: equation }, same ? {} : { workedInputs: {}, workedChecks: {}, workedLines: [], workedLineInput: '', workedLineFeedback: null }, patch)); };
          var inputStyle = { flex: '1 1 150px', minWidth: 0, minHeight: 40, padding: '6px 10px', borderRadius: '8px', background: CARD, border: '1px solid ' + BORDER, color: TEXT, fontFamily: 'monospace', fontSize: '14px' };
          var smallBtn = Object.assign({}, btnStyle(false), { minHeight: 40 });
          var levels = [['full', t('stem.algebraCAS.worked_full', 'Full worked example')], ['faded', t('stem.algebraCAS.worked_faded', 'Some steps blank')], ['independent', t('stem.algebraCAS.worked_independent', 'Your turn: write each line')]];
          var lineMessage = function(check, step) {
            if (!check) return '';
            if (check.status === 'match') return '✓ ' + t('stem.algebraCAS.worked_line_ok', 'Correct: that is what this step gives.');
            if (check.status === 'equivalent') return t('stem.algebraCAS.worked_line_equivalent', 'That equation is true, but it is not what this step gives. Apply only this step: {rule}.').replace('{rule}', ruleLabel(step));
            if (check.status === 'invalid') return t('stem.algebraCAS.worked_line_invalid', 'Write one complete linear equation in x, with one equals sign.');
            return stepErrorText(check.error, check.value) || t('stem.algebraCAS.worked_line_wrong', 'That line changes the solution. Check this step: {rule}.').replace('{rule}', ruleLabel(step));
          };
          var checkBlank = function(i) {
            var s = work.steps[i], prev = i === 0 ? equation : work.steps[i - 1].equation;
            var r = __alloCASPure.checkWorkedLine(prev, s.equation, String(inputs[i] || ''), s.rule === 'swap');
            var next = withKey(checks, i, { status: r.status, error: r.error || '', value: r.value || '' });
            setWorked({ workedInputs: inputs, workedChecks: next });
            var all = true;
            for (var j = firstBlank; j < n; j++) if (!next[j] || next[j].status !== 'match') all = false;
            announce(lineMessage(next[i], s) + (all ? ' ' + t('stem.algebraCAS.worked_all_done', 'Every blank is filled in correctly.') : ''));
            if (all) creditWorked('faded:' + equation, 5, 'Faded worked example');
          };
          var current = lines.length ? lines[lines.length - 1] : equation;
          var done = lines.length > 0 && (work.kind === 'unique' ? __alloCASPure.solvedForm(current) : !/x/i.test(current));
          var fb = same && d.workedLineFeedback && typeof d.workedLineFeedback === 'object' ? d.workedLineFeedback : null;
          var checkOwnLine = function() {
            var typed = String(d.workedLineInput || '').trim();
            if (!typed || done) return;
            var step = __alloCASPure.checkLinearStep(current, typed), feedback;
            if (!step.ok) feedback = { kind: 'invalid' };
            else if (!step.equivalent) feedback = { kind: 'wrong', code: step.error || '', value: step.value || '' };
            else {
              var finished = work.kind === 'unique' ? __alloCASPure.solvedForm(typed) : !/x/i.test(typed);
              feedback = { kind: finished ? 'solved' : 'ok' };
              setWorked({ workedLines: lines.concat([typed]), workedLineInput: '', workedLineFeedback: feedback });
              if (finished) creditWorked('own:' + equation, 10, 'Solved a worked example on your own');
              announce(feedbackText(feedback));
              return;
            }
            setWorked({ workedLines: lines, workedLineFeedback: feedback });
            announce(feedbackText(feedback));
          };
          var feedbackText = function(f) {
            if (!f) return '';
            if (f.kind === 'ok') return '✓ ' + t('stem.algebraCAS.own_line_ok', 'That line keeps the same solution. Keep going.');
            if (f.kind === 'solved') return '✅ ' + (work.kind === 'unique' ? t('stem.algebraCAS.own_line_solved', 'Solved: x is alone and the value is right.') : conclusionText(work));
            if (f.kind === 'invalid') return t('stem.algebraCAS.worked_line_invalid', 'Write one complete linear equation in x, with one equals sign.');
            if (f.kind === 'hint') return t('stem.algebraCAS.own_line_hint', 'Next step: {rule}.').replace('{rule}', typeof f.rule === 'string' ? f.rule : '');
            return stepErrorText(f.code, f.value) || t('stem.algebraCAS.own_line_wrong', 'That line changes the solution. Do the same thing to both sides, one step at a time.');
          };
          var showHint = function() {
            var nextWork = __alloCASPure.linearSteps(current);
            var nextStep = nextWork.ok && nextWork.steps[0] && nextWork.steps[0].rule !== 'isolated' && nextWork.steps[0].rule !== 'compare' ? nextWork.steps[0] : null;
            setWorked({ workedLines: lines, workedLineFeedback: { kind: 'hint', rule: nextStep ? ruleLabel(nextStep) : t('stem.algebraCAS.own_line_compare', 'compare the two sides') } });
          };
          var spoken = function() {
            return [t('stem.algebraCAS.say_start', 'Start') + ': ' + sayMath(equation)].concat(work.steps.map(function(s, i) {
              return t('stem.algebraCAS.step_n', 'Step {n}:').replace('{n}', i + 1) + ' ' + ruleLabel(s) + '. ' + sayMath(s.equation);
            })).concat([t('stem.algebraCAS.answer_label', 'Answer:') + ' ' + sayMath(answerText(work))]).join('. ');
          };
          return h('section', { 'data-worked-example': level, style: Object.assign({}, cardStyle, { marginBottom: '10px' }) },
            h('h4', { style: { margin: '0 0 6px', fontSize: '13px', color: ACCENT } }, t('stem.algebraCAS.worked_title', 'Worked example')),
            h('div', { role: 'group', 'aria-label': t('stem.algebraCAS.worked_level_label', 'How much of the example to show'), style: { display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' } },
              levels.map(function(lv) { return h('button', { key: lv[0], type: 'button', 'aria-pressed': level === lv[0], onClick: function() { setWorked({ workedLevel: lv[0], workedInputs: inputs, workedChecks: checks, workedLines: lines }); }, style: Object.assign({}, btnStyle(level === lv[0]), { minHeight: 40 }) }, lv[1]); })),
            level !== 'independent' && canSpeak ? h('button', { type: 'button', onClick: function() { speakAloud(spoken()); }, style: Object.assign({}, smallBtn, { marginBottom: '6px' }) }, '🔊 ' + t('stem.algebraCAS.read_steps_aloud', 'Read the steps aloud')) : null,
            h('ol', { style: { listStyle: 'none', margin: 0, padding: 0 } },
              h('li', { style: { padding: '4px 0', fontFamily: 'monospace' } }, t('stem.algebraCAS.start_label', 'Start:') + ' ' + equation),
              level === 'independent' ? lines.map(function(line, i) { return h('li', { key: 'own' + i, style: { padding: '4px 0', fontFamily: 'monospace' } }, '✓ ' + line); }) :
              work.steps.map(function(s, i) {
                var id = 'cas-worked-' + i;
                if (i < firstBlank) return h('li', { key: i, style: { display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '4px 0', alignItems: 'flex-start' } },
                  h('span', { style: { flex: '1 1 150px', minWidth: 0, overflowWrap: 'anywhere', fontFamily: 'monospace' } }, t('stem.algebraCAS.step_n', 'Step {n}:').replace('{n}', i + 1) + ' ' + s.equation),
                  h('span', { style: ruleChipStyle }, ruleLabel(s)));
                var ok = checks[i] && checks[i].status === 'match';
                return h('li', { key: i, style: { padding: '6px 0', borderTop: '1px dashed ' + BORDER } },
                  h('label', { htmlFor: id, style: { display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: 4 } }, t('stem.algebraCAS.step_n', 'Step {n}:').replace('{n}', i + 1) + ' ' + ruleLabel(s)),
                  h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px' } },
                    h('input', { id: id, type: 'text', value: String(inputs[i] || ''), maxLength: 200, readOnly: ok, 'aria-describedby': checks[i] ? id + '-fb' : undefined, 'aria-invalid': checks[i] && !ok ? 'true' : undefined,
                      onChange: function(e) { setWorked({ workedInputs: withKey(inputs, i, e.target.value), workedChecks: withKey(checks, i, null) }); },
                      onKeyDown: function(e) { if (e.key === 'Enter') { e.preventDefault(); checkBlank(i); } }, style: inputStyle }),
                    ok ? null : h('button', { type: 'button', onClick: function() { checkBlank(i); }, disabled: !String(inputs[i] || '').trim(), style: smallBtn }, t('stem.algebraCAS.check_line', 'Check line'))),
                  checks[i] ? h('p', { id: id + '-fb', style: { fontSize: '12px', margin: '4px 0 0', color: TEXT } }, lineMessage(checks[i], s)) : null);
              })),
            // The answer is shown in full mode, and in faded mode once every blank is right.
            (level === 'full' || (level === 'faded' && work.steps.every(function(s, i) { return i < firstBlank || (checks[i] && checks[i].status === 'match'); }))) ?
              h('p', { style: { margin: '6px 0 0', fontWeight: 700 } }, (conclusionText(work) ? conclusionText(work) + ' ' : '') + '✅ ' + t('stem.algebraCAS.answer_label', 'Answer:') + ' ' + answerText(work)) : null,
            level === 'independent' ? h('div', { style: { marginTop: '6px' } },
              done ? null : h('label', { htmlFor: 'cas-own-line', style: { display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: 4 } }, t('stem.algebraCAS.own_line_label', 'Your next line (one step at a time)')),
              done ? null : h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px' } },
                h('input', { id: 'cas-own-line', type: 'text', value: same ? String(d.workedLineInput || '') : '', maxLength: 200, 'aria-describedby': fb ? 'cas-own-line-fb' : undefined,
                  onChange: function(e) { setWorked({ workedLines: lines, workedLineInput: e.target.value, workedLineFeedback: null }); },
                  onKeyDown: function(e) { if (e.key === 'Enter') { e.preventDefault(); checkOwnLine(); } }, style: inputStyle }),
                h('button', { type: 'button', onClick: checkOwnLine, disabled: !(same && String(d.workedLineInput || '').trim()), style: smallBtn }, t('stem.algebraCAS.check_line', 'Check line')),
                h('button', { type: 'button', onClick: showHint, style: smallBtn }, t('stem.algebraCAS.show_next_step', 'Hint: next step'))),
              fb ? h('p', { id: 'cas-own-line-fb', style: { fontSize: '12px', margin: '6px 0 0', color: TEXT, fontWeight: fb.kind === 'solved' ? 700 : 400 } }, feedbackText(fb)) : null) : null
          );
        };

        /* ============ TAB BAR ============ */
        var TABS = [
          { id: 'solve', label: t('stem.algebraCAS.solve_2', '\uD83D\uDD0D Solve') },
          { id: 'practice', label: t('stem.algebraCAS.practice', '\uD83C\uDFAF Practice') },
          { id: 'builder', label: t('stem.algebraCAS.tab_equation_builder', 'Equation builder') },
          { id: 'scale', label: t('stem.algebraCAS.tab_balance_equations', 'Balance equations') },
          { id: 'tutor', label: t('stem.algebraCAS.tab_ai_tutor', 'AI tutor') }
        ].filter(function(tb) { return tb.id !== 'tutor' || !!callGemini; });

        var tabBar = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '4px', marginBottom: '12px' }, role: 'tablist', 'aria-label': t('stem.algebraCAS.algebra_cas_sections', 'Algebra CAS sections') },
          TABS.map(function(t, tabIndex) {
            return h('button', { key: t.id, id: 'stem-algebracas-tab-' + t.id,
              onClick: function() { upd('tab', t.id); },
              onKeyDown: function(e) {
                var next = tabIndex;
                if (e.key === 'ArrowRight') next = (tabIndex + 1) % TABS.length;
                else if (e.key === 'ArrowLeft') next = (tabIndex - 1 + TABS.length) % TABS.length;
                else if (e.key === 'Home') next = 0;
                else if (e.key === 'End') next = TABS.length - 1;
                else return;
                e.preventDefault();
                var tabs = e.currentTarget.parentNode.querySelectorAll('[role="tab"]');
                if (tabs[next]) tabs[next].focus();
                upd('tab', TABS[next].id);
              },
              role: 'tab', 'aria-selected': tab === t.id,
              'aria-controls': 'stem-algebracas-panel-' + t.id,
              tabIndex: tab === t.id ? 0 : -1,
              style: Object.assign({}, btnStyle(tab === t.id), { minHeight: 44, whiteSpace: 'normal', overflowWrap: 'anywhere' })
            }, t.label);
          })
        );

        /* ============ TAB: SOLVE ============ */
        var renderSolve = function() {
          return h('div', null,
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '6px', marginBottom: '10px' } },
              MODES.map(function(m) {
                return h('button', { key: m.id, onClick: function() { updMulti({ mode: m.id, result: null, verify: null }); }, title: m.desc, 'aria-pressed': mode === m.id, style: btnStyle(mode === m.id) }, m.label);
              })
            ),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' } },
              h('input', { type: 'text', value: expression, onChange: function(e) { updMulti({ expression: e.target.value, result: null, verify: null, stepCheck: null }); },
                onKeyDown: function(e) { if (e.key === 'Enter') handleSolve(); },
                placeholder: 'e.g. ' + ((EXAMPLES[mode] || [])[0] || '2x + 5 = 13'),
                'aria-label': t('stem.algebraCAS.algebra_expression_input', 'Algebra expression input'),
                style: { flex: '1 1 160px', minWidth: 0, padding: '8px 12px', borderRadius: '10px', background: CARD, border: '1px solid ' + BORDER, color: TEXT, outline: 'none', fontFamily: 'monospace', fontSize: '13px' },
                onFocus: function(e) { e.target.style.boxShadow = '0 0 0 2px #7c3aed'; }, onBlur: function(e) { e.target.style.boxShadow = 'none'; } }),
              mathInputButton(expression, function(value) { updMulti({ expression: value, result: null, verify: null, stepCheck: null }); }, 'Enter an algebra expression'),
              // The accessible name is the visible label: it used to be "TRY:".
              h('button', { type: 'button', onClick: handleSolve, disabled: isLoading || !expression.trim(), 'aria-busy': isLoading ? 'true' : undefined,
                style: { padding: '8px 16px', borderRadius: '10px', background: BTN_FLAT, color: BTN_TEXT, fontWeight: '700', fontSize: '12px', cursor: 'pointer', opacity: (isLoading || !expression.trim()) ? 0.5 : 1, border: 'none' }
              }, isLoading ? '\u23F3 ' + t('stem.algebraCAS.working', 'Working\u2026') : '\u25B6 ' + MODE_VERBS[mode])
            ),
            h('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' } },
              h('span', { style: { fontSize: '10px', fontWeight: '700', color: MUTED } }, 'TRY:'),
              (EXAMPLES[mode] || []).map(function(ex, i) {
                return h('button', { key: i, onClick: function() { updMulti({ expression: ex, result: null, verify: null, stepCheck: null }); },
                  style: { padding: '3px 8px', borderRadius: '8px', fontSize: '10px', fontFamily: 'monospace', background: CARD, border: '1px solid ' + BORDER, color: ACCENT, cursor: 'pointer' } }, ex);
              })
            ),
            result ? h('div', { style: Object.assign({}, cardStyle, { marginBottom: '10px' }) },
              h('div', { style: { fontSize: '11px', fontWeight: '700', color: ACCENT, marginBottom: '8px' } }, t('stem.algebraCAS.step_by_step_solution_2', '\uD83D\uDCCB Step-by-Step Solution')),
              h('div', { style: { fontSize: '12px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', lineHeight: '1.6' } },
                (verify && verify.exact && renderLinearList(expression)) || renderSteps(typeof result === 'string' ? result : '')),
              h('p', { role: 'status', 'data-cas-verification': verify && verify.exact ? 'exact' : 'ai', style: { color: TEXT, fontSize: 12, lineHeight: 1.6 } },
                verify && verify.unavailable ? 'No AI provider is connected. The local linear solver and local practice are available.' : verify && verify.exact ? 'Exact local solution and algebraic steps. ' + verify.detail :
                  'AI explanation: steps are not independently checked. ' + (verify && verify.method === 'sample' ? (verify.decidable ? (verify.verified ? t('stem.algebraCAS.ai_result_equivalent', 'The engine checked the final result: it equals your expression at {n} test points. This checks the value, not whether the form is the one asked for.').replace('{n}', verify.points || 0) : t('stem.algebraCAS.ai_result_not_equivalent', 'The engine checked the final result and it is NOT equal to your expression, so the AI made a mistake. Do not copy this answer.')) : 'The answer could not be checked locally.') :
                  verify && verify.decidable ? (verify.verified ? 'Listed roots pass a numerical substitution check; this does not prove all roots were found. ' : 'The proposed answer fails substitution. ') + (verify.detail || '') : 'The answer could not be checked locally.'))
            ) : null,
            verify && verify.exact ? renderWorked(expression) : null,
            h('details', { style: cardStyle, 'data-linear-step-checker': true },
              h('summary', { style: { cursor: 'pointer', fontWeight: 700 } }, 'Check my next algebra step'),
              h('p', null, 'Compare the equation above with your next line. This checks the solution set of linear equations in x.'),
              h('label', { htmlFor: 'cas-next-step' }, 'My next equation'),
              h('input', { id: 'cas-next-step', value: d.nextEquation || '', maxLength: 500, onChange: function(e) { updMulti({ nextEquation: e.target.value, stepCheck: null }); }, style: { display: 'block', width: '100%', boxSizing: 'border-box', padding: 10, background: CARD, color: TEXT, border: '1px solid ' + BORDER } }),
              h('button', { type: 'button', style: btnStyle(false), onClick: function() { upd('stepCheck', __alloCASPure.checkLinearStep(expression, d.nextEquation || '')); } }, 'Check this step'),
              d.stepCheck ? h('p', { role: 'status' }, (d.stepCheck.error && stepErrorText(d.stepCheck.error, d.stepCheck.value)) || d.stepCheck.detail) : null),
            history.length > 0 ? h('div', null,
              h('div', { style: { fontSize: '10px', fontWeight: '700', color: MUTED, marginBottom: '6px' } }, '\uD83D\uDCDC Recent (' + history.length + ')'),
              h('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap' } },
                history.slice().reverse().slice(0, 5).map(function(hi, i) {
                  return h('button', { key: i, onClick: function() { updMulti({ expression: hi.expr, mode: hi.mode, result: hi.result, verify: hi.verify || null, stepCheck: null }); },
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
            h('p', { style: { color: MUTED, fontSize: 12 } }, 'Local practice uses exact linear equations: one-step, brackets, or fractions at the selected level.'),
            h('button', { type: 'button', style: btnStyle(false), disabled: isLoading, onClick: startLocalPractice }, 'Start local linear practice'),
            typeof d.practiceNotice === 'string' && d.practiceNotice ? h('p', { role: 'status' }, d.practiceNotice) : null,
            (practiceScore > 0 || practiceStreak > 0) ? h('div', { style: { display: 'flex', gap: '10px', marginBottom: '8px' } },
              practiceScore > 0 ? h('span', { style: { fontSize: '11px', fontWeight: '700', color: 'rgba(34,197,94,0.9)' } }, '\u2B50 ' + practiceScore + ' correct') : null,
              practiceStreak > 1 ? h('span', { style: { fontSize: '11px', fontWeight: '700', color: '#f97316' } }, '\uD83D\uDD25 ' + practiceStreak + ' streak') : null
            ) : null,
            h('div', { style: { marginBottom: '8px' } },
              h('div', { style: { fontSize: '10px', fontWeight: '700', color: MUTED, textTransform: 'uppercase', marginBottom: '4px' } }, t('stem.algebraCAS.difficulty', 'Difficulty')),
              h('div', { style: { display: 'flex', gap: '4px' } },
                DIFFICULTIES.map(function(df) {
                  return h('button', { type: 'button', key: df.id, onClick: function() { updMulti({ difficulty: df.id, practiceQ: null, practiceFeedback: null }); if (df.id === 'advanced') upd('_triedAdvanced', true); }, 'aria-pressed': difficulty === df.id, style: btnStyle(difficulty === df.id) }, df.label);
                })
              )
            ),
            h('div', { style: { marginBottom: '10px' } },
              h('div', { style: { fontSize: '10px', fontWeight: '700', color: MUTED, textTransform: 'uppercase', marginBottom: '4px' } }, t('stem.algebraCAS.problem_type_2', 'Problem Type')),
              h('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap' } },
                PROBLEM_TYPES.filter(function(pt) { return !!callGemini || pt.id === 'random' || !!LOCAL_TYPE_LEVEL[pt.id]; }).map(function(pt) {
                  // Without usable AI, types with no local items are hidden (filter above).
                  var needsAI = !callGemini && pt.id !== 'random' && !LOCAL_TYPE_LEVEL[pt.id];
                  return h('button', { type: 'button', key: pt.id, disabled: needsAI, 'aria-describedby': needsAI ? 'cas-practice-type-note' : undefined, onClick: function() { updMulti({ practiceType: pt.id, practiceQ: null, practiceFeedback: null }); }, 'aria-pressed': practiceType === pt.id, style: Object.assign({}, btnStyle(practiceType === pt.id), needsAI ? { opacity: 0.55, cursor: 'not-allowed' } : {}) }, pt.label);
                })
              ),
              (callGemini || !ctx.isTeacherMode) ? null : h('p', { id: 'cas-practice-type-note', style: { fontSize: 12, color: TEXT, margin: '6px 0 0' } },
                t('stem.algebraCAS.practice_types_offline', 'Without an AI provider: Linear, Multi-Step and Fractions use exact local problems (Random uses the difficulty above). Quadratic, Word Problem and Systems need the AI provider.'))
            ),
            !practiceQ ? h('div', { style: { textAlign: 'center', padding: '24px', borderRadius: '12px', background: CARD, border: '1px solid ' + BORDER } },
              h('p', { style: { fontSize: '12px', color: MUTED, marginBottom: '8px' } }, 'Generate a problem at ' + difficulty + ' level'),
              h('button', { type: 'button', onClick: handlePracticeGen, disabled: isLoading,
                style: { padding: '10px 20px', borderRadius: '10px', background: BTN_FLAT, color: BTN_TEXT, fontWeight: '700', fontSize: '13px', cursor: 'pointer', opacity: isLoading ? 0.5 : 1, border: 'none' }
              }, isLoading ? '\u23F3 Generating...' : '\uD83C\uDFB2 Generate Problem')
            ) : h('div', null,
              h('div', { style: Object.assign({}, cardStyle, { border: '2px solid ' + ACCENT, marginBottom: '8px' }) },
                h('div', { style: { fontSize: '11px', fontWeight: '700', color: ACCENT, marginBottom: '6px' } }, t('stem.algebraCAS.problem', '\uD83D\uDCCB PROBLEM')),
                h('div', { style: { fontSize: '18px', fontFamily: 'monospace', fontWeight: '700', textAlign: 'center', padding: '10px 0' } }, practiceQ.problem),
                h('p', { style: { fontSize: '11px', textAlign: 'center', color: MUTED } }, '\uD83D\uDCA1 Hint: ' + practiceQ.hint),
                !practiceFeedback && practiceQ.keyStatus === 'wrong' ? h('p', { 'data-ai-key-status': 'wrong', style: { fontSize: '12px', fontWeight: 700, color: TEXT, textAlign: 'center', margin: '6px 0 0' } },
                  t('stem.algebraCAS.key_wrong_before', 'The math engine found that the AI\'s answer key for this problem is wrong. Your answer will be checked against the problem itself.')) : null
              ),
              !practiceFeedback ? h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' } },
                h('input', { type: 'text', value: practiceAnswer,
                  onChange: function(e) { upd('practiceAnswer', e.target.value); },
                  onKeyDown: function(e) { if (e.key === 'Enter') handlePracticeCheck(); },
                  placeholder: t('stem.algebraCAS.your_answer', 'Your answer...'),
                  'aria-label': t('stem.algebraCAS.practice_answer_input', 'Practice answer input'),
                  style: { flex: '1 1 160px', minWidth: 0, padding: '8px 12px', borderRadius: '10px', background: CARD, border: '1px solid ' + BORDER, color: TEXT, outline: 'none', fontFamily: 'monospace', fontSize: '13px' },
                  onFocus: function(e) { e.target.style.boxShadow = '0 0 0 2px #7c3aed'; }, onBlur: function(e) { e.target.style.boxShadow = 'none'; } }),
                mathInputButton(practiceAnswer, function(value) { upd('practiceAnswer', value); }, 'Enter your practice answer'),
                h('button', { onClick: handlePracticeCheck, disabled: isLoading || !practiceAnswer.trim(),
                  style: { padding: '8px 16px', borderRadius: '10px', background: BTN_FLAT, color: BTN_TEXT, fontWeight: '700', cursor: 'pointer', opacity: (isLoading || !practiceAnswer.trim()) ? 0.5 : 1, border: 'none' }
                }, isLoading ? '\u23F3' : '\u2705 Check')
              ) : null,
              practiceFeedback ? h('div', { style: { padding: '10px', borderRadius: '12px', background: practiceFeedback.correct ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: '1px solid ' + (practiceFeedback.correct ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'), marginBottom: '8px' } },
                // The verdict is a status message: it changes after Check without moving focus.
                h('div', { role: 'status', 'aria-atomic': 'true', 'data-practice-verdict': practiceFeedback.correct ? 'correct' : 'incorrect' },
                  h('div', { style: { fontSize: '13px', fontWeight: '700', marginBottom: '6px' } }, practiceFeedback.correct ? '\uD83C\uDF89 Correct!' : '\u274C Not quite...'),
                  practiceFeedback.gradeSource === 'verified' ? h('div', { style: { fontSize: '11px', fontWeight: '700', color: isContrast ? '#ffffff' : (isDark ? '#34d399' : '#047857'), marginBottom: '6px' } }, '\u2713 ' + t('stem.algebraCAS.checked_by_engine', 'Checked by the math engine') + ((verdictText(practiceFeedback.gradeCode) || practiceFeedback.gradeDetail) ? ' \u2014 ' + (verdictText(practiceFeedback.gradeCode) || practiceFeedback.gradeDetail) : '')) : null,
                  practiceFeedback.gradeSource === 'key' ? h('div', { style: { fontSize: '11px', fontWeight: '700', color: TEXT, marginBottom: '6px' } }, t('stem.algebraCAS.compared_with_ai_key', 'Compared with the AI\'s answer key. The engine could not check that key against the problem.')) : null,
                  h('div', { style: { fontSize: '11px', marginBottom: '6px' } }, (function() { var fb = practiceFeedback.text.match(/FEEDBACK:\s*(.+)/i); return fb ? fb[1].trim() : ''; })())),
                practiceFeedback.keyStatus === 'wrong' || practiceFeedback.keyStatus === 'incomplete' ? h('p', { 'data-ai-key-status': practiceFeedback.keyStatus, style: { fontSize: '12px', fontWeight: 700, color: TEXT, margin: '0 0 6px' } },
                  (practiceFeedback.keyStatus === 'wrong' ? t('stem.algebraCAS.key_wrong_note', 'The AI\'s answer key ({key}) does not fit the problem, so the key was wrong. Your answer was checked against the problem itself. The AI\'s worked solution below may repeat the same mistake.') :
                    t('stem.algebraCAS.key_incomplete_note', 'The AI\'s answer key ({key}) left out a solution that you found.')).replace('{key}', String(practiceQ.answer || ''))) : null,
                h('button', { type: 'button', 'aria-expanded': !!showSolution, onClick: function() { upd('showSolution', !showSolution); },
                  style: { fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '8px', background: showSolution ? 'rgba(99,102,241,0.15)' : CARD, color: showSolution ? '#a5b4fc' : MUTED, border: '1px solid ' + BORDER, cursor: 'pointer', marginBottom: '6px' }
                }, (showSolution ? '\u25BC' : '\u25B6') + ' Step-by-Step Solution'),
                showSolution ? h('div', { style: { marginTop: '6px', padding: '8px', borderRadius: '10px', fontSize: '11px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', lineHeight: '1.5', background: 'rgba(15,23,42,0.5)', border: '1px solid ' + BORDER } },
                  (function() { if (practiceQ.source === 'local-linear') { var exactList = renderLinearList(practiceQ.problem); if (exactList) return exactList; } var sol = practiceFeedback.text.match(/SOLUTION:[\s\S]*/i); return sol ? renderSteps(sol[0]) : h('span', { style: { color: MUTED } }, t('stem.algebraCAS.no_solution_available_2', 'No solution available.')); })()
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
              h('span', { style: { color: LEGEND_COLORS.num } }, t('stem.algebraCAS.numbers', '\u25CF Numbers ')),
              h('span', { style: { color: LEGEND_COLORS['var'] } }, t('stem.algebraCAS.variables', '\u25CF Variables ')),
              h('span', { style: { color: LEGEND_COLORS.op } }, t('stem.algebraCAS.operators', '\u25CF Operators ')),
              h('span', { style: { color: LEGEND_COLORS.spc } }, t('stem.algebraCAS.special', '\u25CF Special'))
            )
          );
        };

        /* ============ TAB: SCALE (Canvas-based balance) ============ */
        var renderScale = function() {
          // E7: with predictions on, a checked value is revealed only once a prediction was
          // recorded for that value on this equation.
          var predictOn = !!d.scalePredictOn;
          var trialDraft = d.scaleTrialValue == null ? '0' : String(d.scaleTrialValue);
          var trialPrediction = d.scaleTrialPrediction && typeof d.scaleTrialPrediction === 'object' && d.scaleTrialPrediction.value === trialDraft && d.scaleTrialPrediction.eq === scaleEq &&
            ['equal', 'left', 'right'].indexOf(d.scaleTrialPrediction.choice) >= 0 ? d.scaleTrialPrediction.choice : null;
          var trialRevealed = d.scaleTrialChecked != null && String(d.scaleTrialChecked) === trialDraft && (!predictOn || !!trialPrediction);
          var shownTrial = trialRevealed && d.scaleTrialOpen ? __alloCASPure.balanceTrial(scaleEq, trialDraft) : null;
          if (shownTrial && !shownTrial.ok) shownTrial = null;
          // E4: the beam tips toward the greater side while a revealed trial makes the sides differ.
          var beamTarget = shownTrial ? (shownTrial.relation === '>' ? -0.16 : shownTrial.relation === '<' ? 0.16 : 0) : 0;
          var drawScale = function(canvas, tilt) {
            if (!canvas) return;
            // PL7 batch 3: HiDPI — scale internal buffer by dpr, keep CSS at logical.
            var _acDpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
            var w = canvas.parentNode.offsetWidth || 400;
            // 220 is the right height in the page. In fullscreen the stage is as
            // tall as the screen, and a 220px beam stranded in a tall black field
            // is not a bigger picture - so take the stage's height when it is
            // filling the frame, leaving room for the button and the readings.
            var _acFs = canvas.parentNode.hasAttribute && canvas.parentNode.hasAttribute('data-allo-fullscreen-active');
            var _acMat = canvas.parentNode.querySelector && canvas.parentNode.querySelector('[data-tile-mat]');
            var ht = _acFs ? Math.max(220, (canvas.parentNode.offsetHeight || 220) - 16 - (_acMat ? _acMat.offsetHeight : 0)) : 220;
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

            // Level while no trial is shown: a level beam stands for "these sides are equal for
            // the solution". A revealed trial whose sides differ tips it toward the greater side.
            tilt = tilt || 0;

            var cx = w / 2;
            var baseY = ht - 20;

            // Base triangle
            c.fillStyle = '#475569';
            c.beginPath(); c.moveTo(cx - 30, baseY); c.lineTo(cx + 30, baseY); c.lineTo(cx, baseY - 40); c.closePath(); c.fill();

            // Raise the beam so both pans and their equation labels fit on phones.
            c.strokeStyle = '#94a3b8'; c.lineWidth = 4;
            c.beginPath(); c.moveTo(cx, baseY - 40); c.lineTo(cx, baseY - 100); c.stroke();
            // Beam
            c.save();
            c.translate(cx, baseY - 100);
            c.rotate(tilt);
            var beamCol = scaleSolved ? '#22c55e' : '#6366f1';
            c.save();
            c.shadowColor = beamCol; c.shadowBlur = scaleSolved ? 16 : 8;
            c.strokeStyle = beamCol;
            c.lineWidth = 4;
            c.beginPath(); c.moveTo(-w * 0.35, 0); c.lineTo(w * 0.35, 0); c.stroke();
            c.restore();
            c.restore();

            // Pans hang straight down from the beam ends, wherever the beam points.
            var panW = Math.min(90, w * 0.26);
            var drawPan = function(end, fill, stroke, label) {
              var px = cx + end * Math.cos(tilt), py = baseY - 100 + end * Math.sin(tilt);
              c.save();
              c.translate(px, py);
              c.fillStyle = fill; c.strokeStyle = stroke; c.lineWidth = 2;
              c.beginPath(); c.moveTo(0, 0); c.lineTo(-panW / 2, 50); c.moveTo(0, 0); c.lineTo(panW / 2, 50); c.stroke();
              c.beginPath(); c.moveTo(-panW / 2, 50); c.lineTo(panW / 2, 50); c.lineTo(panW / 2 - 5, 65); c.lineTo(-panW / 2 + 5, 65); c.closePath(); c.fill(); c.stroke();
              c.fillStyle = '#e2e8f0';
              c.font = 'bold 13px monospace';
              c.textAlign = 'center';
              c.fillText(label.length > 12 ? label.substring(0, 12) + '..' : label, 0, 82);
              c.restore();
            };
            drawPan(-w * 0.35, 'rgba(99,102,241,0.15)', '#6366f1', leftText);
            drawPan(w * 0.35, 'rgba(168,85,247,0.15)', '#a855f7', rightText);

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

          var scaleObserver = null, scaleFrame = null;
          var scaleCanvasRef = function(canvas) {
            if (scaleObserver) { scaleObserver.disconnect(); scaleObserver = null; }
            if (scaleFrame !== null) { window.cancelAnimationFrame(scaleFrame); scaleFrame = null; }
            if (!canvas) return;
            // The beam eases toward its target tilt. Reduced motion is read on EVERY frame, so
            // turning it on mid-swing jumps straight to the end position.
            var frame = function() {
              scaleFrame = null;
              var current = typeof canvas._casTilt === 'number' ? canvas._casTilt : 0;
              var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
              current = reduce || Math.abs(beamTarget - current) < 0.003 ? beamTarget : current + (beamTarget - current) * 0.18;
              canvas._casTilt = current;
              drawScale(canvas, current);
              if (current !== beamTarget) scaleFrame = window.requestAnimationFrame(frame);
            };
            var scheduleScaleDraw = function() {
              if (scaleFrame !== null) window.cancelAnimationFrame(scaleFrame);
              scaleFrame = window.requestAnimationFrame(frame);
            };
            scheduleScaleDraw();
            if (typeof ResizeObserver !== 'undefined') { scaleObserver = new ResizeObserver(scheduleScaleDraw); scaleObserver.observe(canvas.parentNode); }
          };
          var opBtnStyle = { minHeight:44, padding: '6px 10px', borderRadius: '8px', background: CARD, border: '1px solid ' + BORDER, color: TEXT, fontWeight: '700', fontSize: '11px', cursor: 'pointer' };
          var renderTrial = function() {
            var open = !!d.scaleTrialOpen;
            var draft = d.scaleTrialValue == null ? '0' : String(d.scaleTrialValue);
            var checked = trialRevealed;
            var trial = checked ? __alloCASPure.balanceTrial(scaleEq, draft) : null;
            var previous = trial && trial.ok && d.scalePreviousEq ? __alloCASPure.balanceTrial(d.scalePreviousEq, draft) : null;
            var trialValid = !!(trial && trial.ok);
            var inkLeft = ACCENT, inkRight = isContrast ? '#fff' : isDark ? '#67e8f9' : '#0e7490';
            var choice = d.scaleTrialChoice === 'equal' || d.scaleTrialChoice === 'left' || d.scaleTrialChoice === 'right' ? d.scaleTrialChoice : null;
            // With predictions on, the x - 1 / x + 1 buttons only load the next value: the student predicts again first.
            var submit = function(value, stepping) {
              if (!predictOn) { updMulti({scaleTrialValue:value, scaleTrialChecked:value}); return; }
              if (stepping) { updMulti({scaleTrialValue:value, scaleTrialChecked:null, scaleTrialChoice:null}); return; }
              if (!choice) return;
              updMulti({scaleTrialValue:value, scaleTrialChecked:value, scaleTrialPrediction:{value:value, choice:choice, eq:scaleEq}, scaleTrialChoice:null});
            };
            var buttonStyle = Object.assign({}, opBtnStyle, {fontSize:13});
            var PREDICT_CHOICES = [['equal', t('stem.algebraCAS.predict_equal', 'Both sides equal: the beam stays level')], ['left', t('stem.algebraCAS.predict_left', 'Left side greater: the beam tips left')], ['right', t('stem.algebraCAS.predict_right', 'Right side greater: the beam tips right')]];
            var outcome = trialValid ? (trial.relation === '=' ? 'equal' : trial.relation === '>' ? 'left' : 'right') : null;
            var predictionText = predictOn && trialValid && trialPrediction ? ' ' + t('stem.algebraCAS.trial_you_predicted', 'You predicted: {choice}.').replace('{choice}', PREDICT_CHOICES.filter(function(p) { return p[0] === trialPrediction; })[0][1]) + ' ' +
              (trialPrediction === outcome ? t('stem.algebraCAS.trial_predict_right', 'Your prediction matched.') : t('stem.algebraCAS.trial_predict_wrong', 'Your prediction did not match. Compare the two sides below.')) : '';
            var status = trialValid ? 'x = ' + trial.x + ': ' + trial.left + ' ' + trial.relation + ' ' + trial.right + '. ' +
              (trial.relation === '=' ? t('stem.algebraCAS.trial_is_solution', 'This value is a solution of the current equation.') : t('stem.algebraCAS.trial_not_solution', 'This value is not a solution of the current equation.')) + predictionText : '';
            var diagram = null;
            if (trialValid && Number.isFinite(trial.leftNumber) && Number.isFinite(trial.rightNumber)) {
              var extent = Math.max(1, Math.abs(trial.leftNumber), Math.abs(trial.rightNumber));
              var point = function(value) { return 28 + (value / extent + 1) * 242; };
              var tickText = function(value) { return Number(value.toPrecision(4)).toString(); };
              diagram = h('figure', {style:{margin:'12px 0 0'}, 'data-balance-trial-plot':true},
                h('figcaption', {style:{fontSize:13, color:TEXT}}, t('stem.algebraCAS.trial_plot_legend', 'Square: left side. Circle: right side. Both rows use the same number scale.')),
                h('svg', {viewBox:'0 0 540 100', 'aria-hidden':'true', focusable:'false', style:{display:'block',width:'100%',height:'auto',marginTop:4}},
                  h('line', {x1:270,y1:8,x2:270,y2:92,stroke:MUTED,strokeWidth:1,strokeDasharray:'4 4'}),
                  [30,74].map(function(y) { return h('g', {key:y},
                    h('line', {x1:28,y1:y,x2:512,y2:y,stroke:MUTED,strokeWidth:2}),
                    [28,270,512].map(function(x) { return h('line', {key:x,x1:x,y1:y-5,x2:x,y2:y+5,stroke:MUTED,strokeWidth:2}); })
                  ); }),
                  h('line', {x1:point(trial.leftNumber),y1:30,x2:point(trial.rightNumber),y2:74,stroke:MUTED,strokeWidth:1,strokeDasharray:'3 4'}),
                  h('rect', {'data-trial-left-point':true,x:point(trial.leftNumber)-7,y:23,width:14,height:14,fill:inkLeft,stroke:TEXT,strokeWidth:1}),
                  h('circle', {'data-trial-right-point':true,cx:point(trial.rightNumber),cy:74,r:7,fill:inkRight,stroke:TEXT,strokeWidth:1})
                ),
                h('div', {'aria-hidden':'true',style:{display:'flex',justifyContent:'space-between',gap:8,fontSize:12,color:TEXT,margin:'0 5%'}},h('span',null,tickText(-extent)),h('span',null,'0'),h('span',null,tickText(extent))),
                h('p', {style:{fontSize:12,color:MUTED,marginTop:6}}, t('stem.algebraCAS.trial_plot_scale', 'The scale fits these values and may change after an operation. Positions are approximate; the calculations above are exact.'))
              );
            }
            return h('section', {'data-balance-trial':true,style:Object.assign({},cardStyle,{margin:'12px 0',color:TEXT,overflowWrap:'anywhere'})},
              h('h3', {style:{margin:0,fontSize:15}}, h('button', {type:'button','aria-expanded':open,'aria-controls':'balance-trial-content',onClick:function(){upd('scaleTrialOpen',!open);},style:{display:'flex',alignItems:'center',gap:8,textAlign:'left',width:'100%',minHeight:44,padding:'4px 0',border:'none',background:'transparent',color:TEXT,fontWeight:700,cursor:'pointer'}},
                h('span', {'aria-hidden':'true'},open?'▾':'▸'),t('stem.algebraCAS.trial_title','Test a value for x'))),
              h('div', {id:'balance-trial-content',hidden:!open,style:{display:open?'block':'none'}},
                h('p', {id:'balance-trial-help',style:{fontSize:13,margin:'4px 0 10px',color:TEXT}},t('stem.algebraCAS.trial_prompt','Predict whether the sides will match, then substitute the same value for every x. You can enter an integer, decimal, or fraction such as -1/2.')),
                h('div', {style:{display:'flex',flexWrap:'wrap',alignItems:'end',gap:8}},
                  h('div', {style:{flex:'1 1 130px',minWidth:0}},
                    h('label', {htmlFor:'balance-trial-x',style:{display:'block',fontSize:13,fontWeight:700,marginBottom:4}},t('stem.algebraCAS.trial_value_label','Value of x')),
                    h('input', {id:'balance-trial-x',type:'text',value:draft,maxLength:128,'aria-describedby':'balance-trial-help','aria-invalid':trial && !trial.ok && trial.reason==='value'?true:undefined,onChange:function(e){updMulti({scaleTrialValue:e.target.value,scaleTrialChecked:null});},onKeyDown:function(e){if(e.key==='Enter'){e.preventDefault();submit(draft);}},style:{width:'100%',minHeight:44,boxSizing:'border-box',padding:8,borderRadius:8,border:'1px solid '+MUTED,background:BG,color:TEXT,fontSize:16}})
                  ),
                  h('button', {type:'button',onClick:function(){submit(draft);},disabled:predictOn&&!choice,'aria-describedby':predictOn&&!choice?'balance-trial-predict-first':undefined,style:Object.assign({},buttonStyle,{background:BTN_FLAT,color:BTN_TEXT,opacity:predictOn&&!choice?0.55:1})},t('stem.algebraCAS.trial_check','Check value'))
                ),
                predictOn && !checked ? h('fieldset', {'data-trial-predict':true,style:{border:'1px solid '+BORDER,borderRadius:8,padding:'6px 10px',margin:'10px 0 0'}},
                  h('legend', {style:{fontSize:13,fontWeight:700,padding:'0 4px'}}, t('stem.algebraCAS.trial_predict_question', 'Before you check: what will this value of x do to the scale?')),
                  PREDICT_CHOICES.map(function(p) { return h('label', {key:p[0],style:{display:'flex',alignItems:'center',gap:8,minHeight:40,fontSize:13}},
                    h('input', {type:'radio',name:'balance-trial-predict',value:p[0],checked:choice===p[0],onChange:function(){upd('scaleTrialChoice',p[0]);},style:{width:20,height:20,flexShrink:0}}), p[1]); }),
                  choice ? null : h('p', {id:'balance-trial-predict-first',style:{fontSize:12,margin:'4px 0 0'}}, t('stem.algebraCAS.predict_first', 'Choose a prediction first.'))) : null,
                h('div', {role:'status','aria-live':'polite','aria-atomic':true,'data-balance-trial-status':true,style:{fontSize:14,fontWeight:700,marginTop:10}},trial && !trial.ok ?
                  (trial.reason==='value'?t('stem.algebraCAS.trial_invalid_value','Enter a number or fraction with a nonzero denominator, such as 3, -0.5, or 1/3.'):t('stem.algebraCAS.trial_invalid_equation','This check supports linear equations in x. Enter one equation with an equals sign; use Solve for other equation types.')) : status),
                trialValid && h('div', {'data-balance-trial-result':trial.relation},
                  h('div', {style:{display:'flex',flexWrap:'wrap',gap:10,marginTop:10}},
                    [['left',t('stem.algebraCAS.trial_left','Left side'),trial.leftSubstitution,trial.left,inkLeft,'■'],['right',t('stem.algebraCAS.trial_right','Right side'),trial.rightSubstitution,trial.right,inkRight,'●']].map(function(side){return h('div',{key:side[0],style:{flex:'1 1 190px',minWidth:0,padding:10,border:'1px solid '+BORDER,borderRadius:8}},
                      h('div',{style:{fontWeight:700,color:side[4],fontSize:13}},h('span',{'aria-hidden':'true'},side[5]+' '),side[1]),
                      h('div',{'data-trial-substitution':side[0],style:{fontFamily:'monospace',fontSize:15,marginTop:6}},side[2]+' = '+side[3])
                    );})
                  ),
                  h('p', {style:{fontSize:13,marginTop:10}},t('stem.algebraCAS.trial_difference','Left side − right side: '),h('strong',{'data-trial-difference':true},trial.difference),'. ',t('stem.algebraCAS.trial_zero_difference','A difference of zero means the two sides match.')),
                  diagram || h('p',{style:{fontSize:13}},t('stem.algebraCAS.trial_plot_unavailable','These exact values are outside the diagram’s numerical range. Compare the calculations above.')),
                  trial.kind==='identity' ? h('p',{'data-trial-generalization':true,style:{fontSize:13,fontWeight:700}},t('stem.algebraCAS.trial_identity','The expressions simplify to the same x-term and constant. Every real x is a solution; this one check is an example.')) : trial.kind==='contradiction' ? h('p',{'data-trial-generalization':true,style:{fontSize:13,fontWeight:700}},t('stem.algebraCAS.trial_contradiction','Both expressions have the same x-term but different constants. No value of x can make them equal.')) : null,
                  previous && previous.ok && h('div', {'data-trial-operation-comparison':true,style:{borderTop:'1px solid '+BORDER,paddingTop:10,marginTop:10,fontSize:13}},
                    h('strong',null,t('stem.algebraCAS.trial_keep_x','Same x, before and after the last operation')),
                    h('p',{style:{margin:'6px 0',fontFamily:'monospace'}},d.scalePreviousEq),
                    h('p',{style:{margin:'6px 0'}},t('stem.algebraCAS.trial_before','Before: '),previous.left+' '+previous.relation+' '+previous.right),
                    h('p',{style:{margin:'6px 0'}},t('stem.algebraCAS.trial_after','After: '),trial.left+' '+trial.relation+' '+trial.right),
                    h('p',{style:{margin:'6px 0'}},trial.relation==='=' && previous.relation==='=' ? t('stem.algebraCAS.trial_stays_solution','This x makes both equations true. The reversible operation preserved equality.') : trial.relation!=='=' && previous.relation!=='=' ? t('stem.algebraCAS.trial_stays_outside','This x makes neither equation true. A reversible operation does not turn a non-solution into a solution.') : t('stem.algebraCAS.trial_compare_check','Compare whether this x makes each equation true.')),
                    previous.relation!==trial.relation && previous.relation!=='=' && trial.relation!=='=' && h('p',{style:{margin:'6px 0'}},t('stem.algebraCAS.trial_reversed','The side with the larger value switched. Multiplying or dividing by a negative constant reverses this order, while preserving whether the sides are equal.'))
                  ),
                  h('div',{style:{display:'flex',flexWrap:'wrap',gap:8,marginTop:12}},
                    h('button',{type:'button',onClick:function(){submit(trial.previousX,true);},style:buttonStyle},t('stem.algebraCAS.trial_decrease','Test x − 1')),
                    h('button',{type:'button',onClick:function(){submit(trial.nextX,true);},style:buttonStyle},t('stem.algebraCAS.trial_increase','Test x + 1'))
                  )
                )
              )
            );
          };

          /* -- E4: algebra-tile equation mat, mirroring the current exact equation -- */
          // Read per render (every operation), not once at load.
          var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
          var renderTileMat = function() {
            var counts = scaleEq ? __alloCASPure.tileCounts(scaleEq) : { ok: false };
            if (!counts.ok) return null;
            if (!document.getElementById('allo-cas-tile-css')) {
              var tileCss = document.createElement('style');
              tileCss.id = 'allo-cas-tile-css';
              tileCss.textContent = '@keyframes casZeroPairs{0%,55%{opacity:1;max-height:120px}100%{opacity:0;max-height:0}}';
              document.head.appendChild(tileCss);
            }
            // Same conventions as the Manipulatives tiles: solid = positive, dashed light = negative,
            // long tile = x, small square = 1. On the dark stage the colours are lightened.
            var ink = isContrast ? '#ffffff' : '#e2e8f0';
            var TILE = {
              pos: isContrast ? { background: '#fbbf24', border: '2px solid #ffffff', color: '#000000' } : { background: '#2563eb', border: '2px solid #93c5fd', color: '#ffffff' },
              neg: isContrast ? { background: '#000000', border: '2px dashed #fbbf24', color: '#ffffff' } : { background: '#fef2f2', border: '2px dashed #f87171', color: '#7f1d1d' }
            };
            var tile = function(kind, negative, key) {
              return h('span', { key: key, 'data-tile': (negative ? '-' : '+') + kind, style: Object.assign({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', width: kind === 'x' ? 36 : 18, height: 18, margin: 1, borderRadius: 3, fontSize: 9, fontWeight: 800, lineHeight: 1, fontFamily: 'monospace', verticalAlign: 'middle' }, negative ? TILE.neg : TILE.pos) },
                (negative ? '−' : '') + (kind === 'x' ? 'x' : '1'));
            };
            var tiles = function(n, kind, prefix) { var out = []; for (var i = 0; i < Math.abs(n); i++) out.push(tile(kind, n < 0, prefix + kind + i)); return out; };
            var last = d.scaleTileStep && typeof d.scaleTileStep === 'object' && d.scaleTileStep.step === scaleSteps.length ? d.scaleTileStep : null;
            // Saved counts are clamped: a hostile "1e9" must not become a billion tiles.
            var small = function(n) { n = Math.floor(Math.abs(+n || 0)); return n > 20 ? 20 : n; };
            if (last && last.kind === 'addsub' && last.whole && !(last.added && typeof last.added === 'object' && last.pairs && typeof last.pairs === 'object')) last = null;
            var pairsOn = function(side) { var p = last && last.kind === 'addsub' && last.whole && last.pairs[side] && typeof last.pairs[side] === 'object' ? last.pairs[side] : {}; return { x: small(p.x), one: small(p.one) }; };
            var pan = function(side, name) {
              var s = counts[side], p = pairsOn(side), pairTiles = [];
              ['x', 'one'].forEach(function(kind) {
                for (var i = 0; i < p[kind]; i++) pairTiles.push(h('span', { key: 'p' + kind + i, style: { display: 'inline-flex', border: '1px dotted ' + ink, borderRadius: 4, margin: 1 } }, tile(kind, false, 'a'), tile(kind, true, 'b')));
              });
              return h('div', { key: side, 'data-tile-pan': side, style: { border: '1px solid ' + (isContrast ? '#fbbf24' : 'rgba(148,163,184,0.55)'), borderRadius: 8, padding: 6, minHeight: 44, background: isContrast ? '#000000' : 'rgba(15,23,42,0.6)' } },
                h('div', { style: { fontSize: 11, fontWeight: 700, marginBottom: 2 } }, name),
                h('div', null, tiles(s.x, 'x', side), tiles(s.one, 'one', side), !s.x && !s.one ? h('span', { style: { fontSize: 11 } }, '0') : null),
                // The zero pairs that just cancelled fade out; with reduced motion they are not drawn.
                pairTiles.length && !reduceMotion ? h('div', { key: 'zp' + last.step, 'data-zero-pairs': side, style: { overflow: 'hidden', animation: 'casZeroPairs 1.6s ease-in forwards', marginTop: 2 } }, pairTiles) : null);
            };
            var count = function(n) { return n < 0 ? t('stem.algebraCAS.tile_negative_count', '{n} negative').replace('{n}', String(-n)) : String(n); };
            var sideLine = function(side, name) {
              var s = counts[side];
              return counts.whole ? t('stem.algebraCAS.tile_side_readout', '{side}: x-tiles {x}, one-tiles {one}, which is {expr}.').replace('{side}', name).replace('{x}', count(s.x)).replace('{one}', count(s.one)).replace('{expr}', s.text) :
                t('stem.algebraCAS.tile_side_text', '{side}: {expr}.').replace('{side}', name).replace('{expr}', s.text);
            };
            var leftName = t('stem.algebraCAS.tile_left_pan', 'Left pan'), rightName = t('stem.algebraCAS.tile_right_pan', 'Right pan');
            var opLine = '';
            if (last && last.kind === 'addsub' && last.whole) {
              var added = [];
              if (small(last.added.x)) added.push((last.added.x > 0 ? t('stem.algebraCAS.tile_added_x', '{n} x-tiles') : t('stem.algebraCAS.tile_added_x_neg', '{n} negative x-tiles')).replace('{n}', String(small(last.added.x))));
              if (small(last.added.one)) added.push((last.added.one > 0 ? t('stem.algebraCAS.tile_added_one', '{n} one-tiles') : t('stem.algebraCAS.tile_added_one_neg', '{n} negative one-tiles')).replace('{n}', String(small(last.added.one))));
              var pl = pairsOn('left').x + pairsOn('left').one, pr = pairsOn('right').x + pairsOn('right').one;
              opLine = added.length ? __alloOneWord(t('stem.algebraCAS.tile_addsub_readout', 'Last step: each pan received {added}. A positive and a negative tile of the same kind make a zero pair, worth 0: {left} zero pairs came off the left pan and {right} off the right pan.').replace('{added}', added.join(', ')).replace('{left}', String(pl)).replace('{right}', String(pr))) :
                t('stem.algebraCAS.tile_nothing_added', 'Last step: nothing was added, so the pans did not change.');
            } else if (last && last.kind === 'divide') {
              opLine = (last.whole ? t('stem.algebraCAS.tile_divide_groups', 'Last step: each pan was split into {n} equal groups, and one group was kept.') : t('stem.algebraCAS.tile_divide_any', 'Last step: every tile count on both pans was divided by {n}.')).replace('{n}', String(last.value));
            } else if (last && last.kind === 'multiply') {
              opLine = t('stem.algebraCAS.tile_multiply', 'Last step: every tile count on both pans was multiplied by {n}. Multiplying by a negative number turns each tile into its opposite.').replace('{n}', String(last.value));
            } else if (last) {
              opLine = t('stem.algebraCAS.tile_same_change', 'Last step: the same change was made to both pans, so they stay equal.');
            }
            var trialLine = !shownTrial ? '' : (shownTrial.relation === '=' ? t('stem.algebraCAS.tile_trial_equal', 'Testing x = {x}: both sides equal {left}, so the beam is level.') :
              shownTrial.relation === '>' ? t('stem.algebraCAS.tile_trial_left', 'Testing x = {x}: the left side ({left}) is greater than the right side ({right}), so the beam tips down on the left.') :
              t('stem.algebraCAS.tile_trial_right', 'Testing x = {x}: the right side ({right}) is greater than the left side ({left}), so the beam tips down on the right.')).replace('{x}', shownTrial.x).replace('{left}', shownTrial.left).replace('{right}', shownTrial.right);
            return h('div', { 'data-tile-mat': true, style: { padding: '8px', borderTop: '1px solid ' + BORDER, color: ink } },
              h('div', { style: { fontSize: 12, fontWeight: 700, marginBottom: 4 } }, t('stem.algebraCAS.tile_mat_title', 'Algebra tiles on each pan')),
              counts.whole ? h('div', { 'aria-hidden': 'true', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '6px' } }, pan('left', leftName), pan('right', rightName)) : null,
              counts.whole ? h('p', { style: { fontSize: 11, margin: '4px 0 0' } }, t('stem.algebraCAS.tile_legend', 'Long tile: x. Small square: 1. Solid: positive. Dashed with a minus sign: negative.')) :
                h('p', { style: { fontSize: 12, margin: '4px 0 0' } }, t('stem.algebraCAS.tiles_not_whole', 'Tiles are drawn for whole-number equations with at most 20 of each tile. This equation is described in words only.')),
              h('div', { id: 'cas-tile-readout', 'data-tile-readout': true, style: { fontSize: 12, lineHeight: 1.5, marginTop: 4 } },
                h('p', { style: { margin: '2px 0' } }, sideLine('left', leftName) + ' ' + sideLine('right', rightName)),
                opLine ? h('p', { style: { margin: '2px 0' } }, opLine) : null,
                trialLine ? h('p', { 'data-tile-trial': shownTrial.relation, style: { margin: '2px 0', fontWeight: 700 } }, trialLine) : null));
          };
          var opChoice = d.scaleOpChoice === 'stays' || d.scaleOpChoice === 'tips' ? d.scaleOpChoice : null;
          var opResult = d.scaleOpResult && typeof d.scaleOpResult === 'object' && d.scaleOpResult.step === scaleSteps.length ? d.scaleOpResult : null;

          return h('div', null,
            h('div', { style: { marginBottom: '8px' } },
              h('div', { style: { fontSize: '11px', fontWeight: '700', color: MUTED, textTransform: 'uppercase', marginBottom: '4px' } }, t('stem.algebraCAS.enter_equation', 'Enter Equation')),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px' } },
                h('input', { type: 'text', value: scaleEq, onChange: function(e) { updMulti({scaleEq:e.target.value,scaleSteps:[],scaleSolved:false,scaleNotice:'',scaleTrialChecked:null,scalePreviousEq:'',scaleTileStep:null,scaleOpResult:null}); },
                  onKeyDown: function(e) { if (e.key === 'Enter') updMulti({ scaleSteps: [], scaleSolved: false, scaleNotice: '', scaleTrialChecked: null, scalePreviousEq: '', scaleTileStep: null, scaleOpResult: null }); },
                  placeholder: t('stem.algebraCAS.e_g_3x_5_14', 'e.g. 3x + 5 = 14'),
                  'aria-label': t('stem.algebraCAS.balance_scale_equation_input', 'Balance scale equation input'),
                  style: { flex: '1 1 160px', minWidth: 0, padding: '8px 12px', borderRadius: '10px', background: CARD, border: '1px solid ' + BORDER, color: TEXT, outline: 'none', fontFamily: 'monospace', fontSize: '13px' },
                  onFocus: function(e) { e.target.style.boxShadow = '0 0 0 2px #7c3aed'; }, onBlur: function(e) { e.target.style.boxShadow = 'none'; } }),
                mathInputButton(scaleEq, function(value) { updMulti({scaleEq:value,scaleSteps:[],scaleSolved:false,scaleNotice:'',scaleTrialChecked:null,scalePreviousEq:'',scaleTileStep:null,scaleOpResult:null}); }, 'Enter a balance-scale equation'),
                h('button', { 'aria-label': t('stem.algebraCAS.load', 'Load'), onClick: function() { updMulti({ scaleSteps: [], scaleSolved: false, scaleNotice: '', scaleTrialChecked: null, scalePreviousEq: '', scaleTileStep: null, scaleOpResult: null }); },
                  style: { padding: '8px 14px', borderRadius: '10px', background: BTN_FLAT, color: BTN_TEXT, fontWeight: '700', fontSize: '12px', cursor: 'pointer', border: 'none' } }, t('stem.algebraCAS.load_2', 'Load'))
              )
            ),
            // Fullscreen stage: the beam plus the sentences under it. The picture
            // alone does not say what "balanced" means, so the reading travels with it.
            h('div', { 'data-allo-fs-stage': 'true', ref: function (node) { if (node && typeof window.__alloStemFsBind === 'function') window.__alloStemFsBind(node.querySelector('[data-allo-fs-btn]'), node); },
              style: { position: 'relative', borderRadius: '12px', border: '1px solid ' + BORDER, overflow: 'hidden', marginBottom: '8px', background: ctx.isContrast ? '#000' : '#0f172a' } },
              h('button', {
                type: 'button',
                'data-allo-fs-btn': 'true',
                'aria-pressed': 'false',
                'aria-label': t('stem.algebraCAS.enter_fullscreen', 'View the balance scale fullscreen'),
                'data-fs-out': t('stem.algebraCAS.enter_fullscreen', 'View the balance scale fullscreen'),
                'data-fs-in': t('stem.algebraCAS.exit_fullscreen', 'Exit fullscreen balance scale (Escape)'),
                style: { position: 'absolute', top: 8, right: 8, zIndex: 20, width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.88)', border: '1px solid ' + BORDER, color: '#e2e8f0', fontSize: 16, fontWeight: 700, cursor: 'pointer' }
              }, h('span', { 'aria-hidden': 'true' }, '\u26F6')),
              h('canvas', { ref: scaleCanvasRef, role: 'img', 'aria-label': t('stem.algebraCAS.interactive_algebra_balance_scale_visu', 'Interactive algebra balance scale visualization') + ': ' + scaleEq, style: { width: '100%', display: 'block' } }),
              renderTileMat()
            ),
            h('p',{style:{fontSize:13,color:TEXT,marginBottom:6}},t('stem.algebraCAS.trial_beam_meaning','The level beam shows the goal: equal sides. Open Test a value for x to check whether a particular value makes them equal.')),
            h('p',{style:{fontSize:12,color:TEXT,marginBottom:10}},t('stem.algebraCAS.balance_model_meaning','A solution makes both sides equal. Add or subtract a term such as 2x, or multiply or divide by a nonzero constant. Fractions stay exact.')),
            typeof d.scaleNotice === 'string' && d.scaleNotice && h('p',{role:'status','aria-live':'polite',style:{fontSize:13,color:TEXT,marginBottom:10}},d.scaleNotice),
            scaleEq ? h('div', null,
              // E7: predict-then-check, off by default (as in Fractions).
              h('label', { style: { display: 'flex', alignItems: 'center', gap: 8, minHeight: 44, fontSize: 13, fontWeight: 700, color: TEXT } },
                h('input', { type: 'checkbox', 'data-scale-predict-toggle': true, checked: predictOn, onChange: function(e) { updMulti({ scalePredictOn: e.target.checked, scaleOpChoice: null, scaleTrialChoice: null, scaleOpResult: null }); }, style: { width: 22, height: 22, flexShrink: 0 } }),
                t('stem.algebraCAS.predict_toggle', 'Predict before each check or step')),
              predictOn && !scaleSolved ? h('fieldset', { 'data-op-predict': true, style: { border: '1px solid ' + BORDER, borderRadius: 8, padding: '6px 10px', margin: '0 0 8px', color: TEXT } },
                h('legend', { style: { fontSize: 13, fontWeight: 700, padding: '0 4px' } }, t('stem.algebraCAS.op_predict_question', 'Before you apply a step: after doing the same thing to both sides, will the scale stay level?')),
                [['stays', t('stem.algebraCAS.op_predict_stays', 'It stays level')], ['tips', t('stem.algebraCAS.op_predict_tips', 'It tips')]].map(function(p) {
                  return h('label', { key: p[0], style: { display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 40, marginRight: 16, fontSize: 13 } },
                    h('input', { type: 'radio', name: 'balance-op-predict', value: p[0], checked: opChoice === p[0], onChange: function() { upd('scaleOpChoice', p[0]); }, style: { width: 20, height: 20, flexShrink: 0 } }), p[1]);
                }),
                opChoice ? null : h('p', { id: 'balance-op-predict-first', style: { fontSize: 12, margin: '4px 0 0' } }, t('stem.algebraCAS.predict_first', 'Choose a prediction first.'))) : null,
              opResult ? h('p', { 'data-op-predict-result': opResult.choice === 'stays' ? 'matched' : 'missed', style: { fontSize: 13, fontWeight: 700, color: TEXT, margin: '0 0 8px' } },
                opResult.choice === 'stays' ? t('stem.algebraCAS.op_predict_right', 'Prediction confirmed: the same operation on both sides keeps the two sides equal, so the scale stays level.') : t('stem.algebraCAS.op_predict_wrong', 'The scale stayed level. Doing the same thing to both sides keeps them equal, which is why every step keeps the same solution.')) : null,
              !scaleSolved && h('div', { style: { fontSize: '10px', fontWeight: '700', color: MUTED, textTransform: 'uppercase', marginBottom: '4px' } }, t('stem.algebraCAS.apply_to_both_sides', 'Apply to Both Sides')),
              !scaleSolved && h('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px', alignItems: 'center' } },
                // Inline numeric input instead of window.prompt() \u2014 prompt() is blocked in the
                // sandboxed Gemini Canvas iframe (the primary surface), which silently dead-ended
                // every balance operation. The op buttons read this value.
                h('input', { type: 'text', 'aria-label': t('stem.algebraCAS.value_to_apply_to_both_sides', 'Value to apply to both sides'), value: d.scaleOpVal != null ? d.scaleOpVal : '', placeholder: '3 or 2x',
                  onChange: function(e) { upd('scaleOpVal', e.target.value); },
                  style: { width: '74px', padding: '8px', borderRadius: '8px', border: '1px solid ' + BORDER, background: BG, color: TEXT, fontSize: '13px' } }),
                [['Add', '+'], ['Subtract', '-'], ['Multiply', '\u00D7'], ['Divide', '\u00F7']].map(function(pair) {
                  var waiting = predictOn && !opChoice;
                  return h('button', { 'aria-label': pair[0] + ' the entered value on both sides', key: pair[0], disabled: waiting, 'aria-describedby': waiting ? 'balance-op-predict-first' : undefined, onClick: function() {
                    var val = d.scaleOpVal;
                    handleScaleOp(pair[0], val == null ? '' : String(val).trim());
                  }, style: Object.assign({}, opBtnStyle, waiting ? { opacity: 0.55, cursor: 'not-allowed' } : {}) }, pair[1] + ' ' + pair[0]);
                })
              ),
              renderTrial(),
              scaleSteps.length > 0 ? h('div', { style: Object.assign({}, cardStyle, { fontSize: '11px' }) },
                h('div', { style: { fontWeight: '700', color: ACCENT, marginBottom: '4px' } }, t('stem.algebraCAS.steps_applied', 'Steps Applied:')),
                scaleSteps.map(function(s, i) { return h('div', { key: i, style: { color: MUTED } }, (i + 1) + '. ' + s); })
              ) : null
            ) : null,
            scaleSolved ? h('button', { 'aria-label': t('stem.algebraCAS.new_equation', 'New Equation'), onClick: function() { updMulti({ scaleEq: '', scaleSteps: [], scaleSolved: false, scaleNotice: '', scaleTrialChecked: null, scalePreviousEq: '', scaleTileStep: null, scaleOpResult: null }); },
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
              // Without a provider Send did nothing at all; it is now disabled and says why.
              h('button', { type: 'button', onClick: handleTutorSend, disabled: !callGemini || isLoading || !tutorInput.trim(), 'aria-describedby': callGemini ? undefined : 'cas-tutor-offline',
                style: { padding: '8px 14px', borderRadius: '10px', background: BTN_FLAT, color: BTN_TEXT, fontWeight: '700', cursor: 'pointer', opacity: (!callGemini || isLoading || !tutorInput.trim()) ? 0.5 : 1, border: 'none' }
              }, isLoading ? '\u23F3 ' + t('stem.algebraCAS.working', 'Working\u2026') : t('stem.algebraCAS.send', 'Send'))
            ),
            callGemini ? null : h('p', { id: 'cas-tutor-offline', role: 'note', style: { fontSize: 12, color: TEXT, margin: '0 0 8px' } },
              t('stem.algebraCAS.tutor_needs_ai', 'The tutor needs an AI provider, and none is connected. You can still solve linear equations, practise, use the balance and check your steps without it.')),
            h('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap' } },
              h('span', { style: { fontSize: '10px', fontWeight: '700', color: MUTED } }, 'Try:'),
              SUGGESTED.map(function(q, i) {
                return h('button', { type: 'button', key: i, onClick: function() { upd('tutorInput', q); },
                  style: { padding: '3px 8px', borderRadius: '8px', fontSize: '10px', background: CARD, border: '1px solid ' + BORDER, color: ACCENT, cursor: 'pointer' } }, q);
              })
            )
          );
        };

        /* ============ BADGE BAR ============ */
        var earned = Array.isArray(d._badgesEarned) ? d._badgesEarned : [];
        // Each badge has a name for screen readers (it had only a title), and the ones that
        // cannot be earned without an AI provider say so instead of looking reachable.
        var badgeBar = h('div', { style: { padding: '6px 0' } },
          h('div', { role: 'list', 'aria-label': t('stem.algebraCAS.badges_label', 'Badges'), style: { display: 'flex', gap: '3px', flexWrap: 'wrap' } },
            BADGES.map(function(b) {
              var has = earned.indexOf(b.id) !== -1, locked = !has && b.needsAI && !callGemini;
              var name = b.label + ': ' + b.desc + '. ' + (has ? t('stem.algebraCAS.badge_earned', 'Earned.') : locked ? t('stem.algebraCAS.badge_needs_ai', 'Needs the AI provider.') : t('stem.algebraCAS.badge_not_yet', 'Not earned yet.'));
              return h('span', { key: b.id, role: 'listitem', style: { display: 'inline-flex', alignItems: 'flex-start' } },
                h('span', { role: 'img', 'aria-label': name, title: name,
                  style: { fontSize: '14px', opacity: has ? 1 : 0.35, cursor: 'default', filter: has ? 'none' : 'grayscale(1)' } }, b.icon),
                locked ? h('span', { 'aria-hidden': 'true', style: { fontSize: '8px', fontWeight: 800, color: TEXT, marginLeft: '1px' } }, 'AI') : null);
            })),
          callGemini ? null : h('p', { style: { fontSize: '10px', color: MUTED, margin: '2px 0 0' } }, t('stem.algebraCAS.badges_ai_note', 'Badges marked AI need the AI provider: there is no local factoring, simplifying or tutor.'))
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
              solve:    { accent: '#7c3aed', ink: isDark ? '#c4b5fd' : '#7c3aed', soft: 'rgba(124,58,237,0.10)', icon: '🔍', title: t('stem.algebraCAS.solve_algebra_step_by_step', 'Solve — algebra step-by-step'),         hint: t('stem.algebraCAS.solve_hint_local', 'Linear equations in x are solved exactly here, every step named, with a worked example you can fade into your own work. Factor, simplify, expand and quadratics need the AI provider; the engine checks the AI\'s answer whenever it can.') },
              practice: { accent: '#0ea5e9', ink: isDark ? '#0ea5e9' : '#0369a1', soft: 'rgba(14,165,233,0.10)', icon: '🎯', title: t('stem.algebraCAS.practice_graded_drills', 'Practice — graded drills'),             hint: t('stem.algebraCAS.practice_hint_local', 'Exact linear practice at three levels, checked by the math engine, with the worked solution. With an AI provider you can also try other problem types; the engine still checks your answer against the problem whenever it can.') },
              builder:  { accent: '#22c55e', ink: isDark ? '#22c55e' : '#166534', soft: 'rgba(34,197,94,0.10)',  icon: '🧱', title: t('stem.algebraCAS.builder_design_your_own_equation', 'Builder — design your own equation'),   hint: t('stem.algebraCAS.builder_hint_local', 'Tap tiles to build an equation, then send it to the Solve tab. The builder does not check your equation; Solve tells you whether it can be solved exactly.') },
              scale:    { accent: '#f59e0b', ink: isDark ? '#f59e0b' : '#92400e', soft: 'rgba(245,158,11,0.10)', icon: '⚖️', title: t('stem.algebraCAS.scale_visual_algebra_balance', 'Scale — visual algebra balance'),       hint: t('stem.algebraCAS.scale_operation_hint','Choose an operation to transform both sides. Follow equivalent equations until x is isolated, and use the worked steps to explain why the solution stays the same.') },
              tutor:    { accent: '#ec4899', ink: isDark ? '#ec4899' : '#be185d', soft: 'rgba(236,72,153,0.10)', icon: '🤖', title: t('stem.algebraCAS.tutor_ask_ai_for_help', 'Tutor — ask AI for help'),              hint: t('stem.algebraCAS.tutor_hint_local', 'Ask the AI tutor about an algebra idea or a step you are stuck on. It is sent your grade level, the problem on the Solve tab, your current practice problem and your last few solves. Needs an AI provider.') }
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
                h('h3', { style: { color: meta.ink, fontSize: 15, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, meta.title),
                h('p', { style: { margin: '3px 0 0', color: MUTED || '#64748b', fontSize: 11, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
              )
            );
          })(),
          h('div', { id: 'stem-algebracas-panel-' + tab, role: 'tabpanel',
            'aria-labelledby': 'stem-algebracas-tab-' + tab, tabIndex: 0 },
            tab === 'solve' ? renderSolve() : null,
            tab === 'practice' ? renderPractice() : null,
            tab === 'builder' ? renderBuilder() : null,
            tab === 'scale' ? renderScale() : null,
            tab === 'tutor' ? renderTutor() : null
          )
        );
      })();
    }
  });
})();
