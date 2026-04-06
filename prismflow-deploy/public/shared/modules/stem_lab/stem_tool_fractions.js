// ═══════════════════════════════════════════
// stem_tool_fractions.js — Fraction Lab Plugin (Enhanced v2)
// Consolidated from fractionViz + fractions
// 6 tabs: Practice, Compare, Operations, Equivalents, Converter, Fraction Wall
// + sound effects, 14 badges, AI tutor, streak tracking,
//   7 challenge types, keyboard shortcuts, benchmark fractions
// ═══════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

(function() {
  'use strict';

  // Register both IDs → same render function
  var fracPlugin = {
    icon: '\uD83C\uDF55', label: 'Fraction Lab',
    desc: 'Interactive fraction visualizer with pie/bar models, operations, equivalents, converter, fraction wall, and challenge mode.',
    color: 'rose', category: 'math',
    render: renderFractionLab
  };
  window.StemLab.registerTool('fractionViz', fracPlugin);
  window.StemLab.registerTool('fractions', fracPlugin);

  function renderFractionLab(ctx) {
    var React = ctx.React;
    var h = React.createElement;
    var ArrowLeft = ctx.icons.ArrowLeft;
    var setStemLabTool = ctx.setStemLabTool;
    var addToast = ctx.addToast;
    var awardXP = ctx.awardXP;
    var announceToSR = ctx.announceToSR;
    var a11yClick = ctx.a11yClick;
    var t = ctx.t;

    // ── State via labToolData._fractions ──
    var ld = ctx.toolData || {};
    var _f = ld._fractions || {};
    var upd = function(obj) {
      if (typeof ctx.setToolData === 'function') {
        ctx.setToolData(function(prev) {
          var fr = Object.assign({}, (prev && prev._fractions) || {}, obj);
          return Object.assign({}, prev, { _fractions: fr });
        });
      }
    };

    // ═══ SOUND EFFECTS ENGINE ═══
    var _audioCtx = null;
    var getAudio = function() {
      if (!_audioCtx) { try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) { /* silent */ } }
      return _audioCtx;
    };
    var playTone = function(freq, dur, type, vol) {
      var ac = getAudio(); if (!ac) return;
      try {
        var osc = ac.createOscillator();
        var gain = ac.createGain();
        osc.type = type || 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(vol || 0.12, ac.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (dur || 0.15));
        osc.connect(gain); gain.connect(ac.destination);
        osc.start(); osc.stop(ac.currentTime + (dur || 0.15));
      } catch(e) { /* silent */ }
    };
    var sfxCorrect = function() { playTone(523, 0.1, 'sine', 0.12); setTimeout(function() { playTone(659, 0.1, 'sine', 0.12); }, 80); setTimeout(function() { playTone(784, 0.15, 'sine', 0.14); }, 160); };
    var sfxWrong = function() { playTone(220, 0.25, 'sawtooth', 0.08); };
    var sfxBadge = function() { playTone(523, 0.08, 'sine', 0.1); setTimeout(function() { playTone(659, 0.08, 'sine', 0.1); }, 70); setTimeout(function() { playTone(784, 0.08, 'sine', 0.1); }, 140); setTimeout(function() { playTone(1047, 0.2, 'sine', 0.14); }, 210); };
    var sfxClick = function() { playTone(880, 0.05, 'sine', 0.06); };
    var sfxStreak = function() { playTone(440, 0.06, 'sine', 0.1); setTimeout(function() { playTone(554, 0.06, 'sine', 0.1); }, 50); setTimeout(function() { playTone(659, 0.08, 'sine', 0.1); }, 100); setTimeout(function() { playTone(880, 0.15, 'sine', 0.12); }, 150); };
    var sfxNewChallenge = function() { playTone(392, 0.08, 'triangle', 0.08); setTimeout(function() { playTone(523, 0.12, 'triangle', 0.1); }, 80); };
    var sfxComplete = function() { playTone(523, 0.1, 'sine', 0.1); setTimeout(function() { playTone(659, 0.1, 'sine', 0.1); }, 100); setTimeout(function() { playTone(784, 0.1, 'sine', 0.1); }, 200); setTimeout(function() { playTone(1047, 0.25, 'sine', 0.15); }, 300); };

    // ── State defaults ──
    var tab = _f.tab || 'practice';
    var mode = _f.mode || 'pie';
    var difficulty = _f.difficulty || 'medium';
    var score = _f.score || { correct: 0, total: 0 };
    var streak = _f.streak || 0;
    var bestStreak = _f.bestStreak || 0;
    var badges = _f.badges || {};

    // Practice state
    var pieces = _f.pieces || { numerator: 3, denominator: 8 };

    // Compare state
    var num1 = _f.num1 != null ? _f.num1 : 1;
    var den1 = _f.den1 != null ? _f.den1 : 2;
    var num2 = _f.num2 != null ? _f.num2 : 2;
    var den2 = _f.den2 != null ? _f.den2 : 4;
    var opMode = _f.opMode || 'add';

    // Challenge state
    var challenge = _f.challenge || null;
    var answer = _f.answer || '';
    var feedback = _f.feedback || null;

    // Quiz state (compare quiz)
    var quiz = _f.quiz || null;
    var quizScore = _f.quizScore || 0;
    var quizStreak = _f.quizStreak || 0;

    // Converter state
    var convNum = _f.convNum != null ? _f.convNum : 3;
    var convDen = _f.convDen != null ? _f.convDen : 4;
    var convDecInput = _f.convDecInput || '';
    var convDirection = _f.convDirection || 'fracToDec';

    // Fraction Wall state
    var wallHighlight = _f.wallHighlight || null;
    var wallCompareA = _f.wallCompareA || null;
    var wallCompareB = _f.wallCompareB || null;

    // AI Tutor state
    var showAITutor = _f.showAITutor || false;
    var aiResponse = _f.aiResponse || '';
    var aiLoading = _f.aiLoading || false;
    var aiQuestion = _f.aiQuestion || '';

    // Benchmark visibility
    var showBenchmarks = _f.showBenchmarks || false;

    // Challenge types used tracking
    var challengeTypesUsed = _f.challengeTypesUsed || {};

    // Per-tab scores
    var tabScores = _f.tabScores || { practice: 0, compare: 0, operations: 0, equivalents: 0, converter: 0, wall: 0 };

    // ── Math helpers ──
    var gcd = function(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var tmp = b; b = a % tmp; a = tmp; } return a; };
    var lcm = function(a, b) { return a * b / gcd(a, b); };
    var simplify = function(n, d) { if (d === 0) return [n, 1]; var g = gcd(Math.abs(n), Math.abs(d)); return [n / g, d / g]; };
    var val1 = den1 > 0 ? num1 / den1 : 0;
    var val2 = den2 > 0 ? num2 / den2 : 0;
    var s1 = simplify(num1, den1);
    var s2 = simplify(num2, den2);

    var toMixed = function(n, d) {
      if (d === 0) return '0';
      var whole = Math.floor(Math.abs(n) / d);
      var rem = Math.abs(n) % d;
      var sign = n < 0 ? '-' : '';
      if (whole > 0 && rem > 0) return sign + whole + ' ' + rem + '/' + d;
      if (whole > 0) return sign + '' + whole;
      return sign + Math.abs(n) + '/' + d;
    };

    var fromMixed = function(whole, num, den) {
      return whole * den + num;
    };

    // Fraction to decimal string with repeating detection
    var fracToDecimal = function(num, den) {
      if (den === 0) return 'undefined';
      var result = num / den;
      // Check if terminating: reduce, then check if denominator only has factors of 2 and 5
      var s = simplify(Math.abs(num), Math.abs(den));
      var d = s[1];
      while (d % 2 === 0) d /= 2;
      while (d % 5 === 0) d /= 5;
      if (d === 1) return result.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
      return result.toFixed(8).replace(/0+$/, '').replace(/\.$/, '') + '...';
    };

    // Decimal to fraction approximation
    var decToFrac = function(dec) {
      if (isNaN(dec)) return [0, 1];
      var sign = dec < 0 ? -1 : 1;
      dec = Math.abs(dec);
      var tolerance = 1e-8;
      var h1 = 1, h2 = 0, k1 = 0, k2 = 1;
      var b = dec;
      for (var i = 0; i < 20; i++) {
        var a = Math.floor(b);
        var aux = h1; h1 = a * h1 + h2; h2 = aux;
        aux = k1; k1 = a * k1 + k2; k2 = aux;
        if (Math.abs(dec - h1 / k1) < tolerance) break;
        if (b - a < tolerance) break;
        b = 1 / (b - a);
      }
      return [sign * h1, k1];
    };

    // ── Difficulty pools ──
    var dpool = difficulty === 'easy' ? [2, 3, 4] : difficulty === 'hard' ? [3, 4, 5, 6, 8, 10, 12, 15, 16, 20] : [2, 3, 4, 5, 6, 8, 10, 12];
    var pick = function(arr) { return arr[Math.floor(Math.random() * arr.length)]; };
    var randInt = function(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; };

    // ═══ BADGE SYSTEM ═══
    var BADGES = [
      { id: 'firstSlice', icon: '\uD83C\uDF55', name: 'First Slice', desc: 'Answer your first challenge correctly', check: function(u) { return u.correct >= 1; } },
      { id: 'streak3', icon: '\uD83D\uDD25', name: 'On a Roll', desc: 'Get a streak of 3', check: function(u) { return u.streak >= 3; } },
      { id: 'streak5', icon: '\u26A1', name: 'Lightning Streak', desc: 'Get a streak of 5', check: function(u) { return u.streak >= 5; } },
      { id: 'streak10', icon: '\uD83C\uDF1F', name: 'Fraction Master', desc: 'Get a streak of 10', check: function(u) { return u.streak >= 10; } },
      { id: 'score10', icon: '\uD83C\uDFC5', name: 'Fraction Pro', desc: 'Score 10 correct answers', check: function(u) { return u.correct >= 10; } },
      { id: 'score25', icon: '\uD83C\uDFC6', name: 'Quarter Century', desc: 'Score 25 correct answers', check: function(u) { return u.correct >= 25; } },
      { id: 'allTypes', icon: '\uD83C\uDF08', name: 'Well Rounded', desc: 'Try all 7 challenge types', check: function(u) { return u.typesUsed >= 7; } },
      { id: 'equivalent', icon: '\uD83D\uDD17', name: 'Chain Builder', desc: 'Solve 3 equivalent fraction challenges', check: function(u) { return u.equivSolved >= 3; } },
      { id: 'simplifier', icon: '\u2702\uFE0F', name: 'Simplifier', desc: 'Simplify 5 fractions correctly', check: function(u) { return u.simplifySolved >= 5; } },
      { id: 'converter', icon: '\uD83D\uDD04', name: 'Converter', desc: 'Convert 5 fractions to decimals', check: function(u) { return u.convertCount >= 5; } },
      { id: 'wallExplorer', icon: '\uD83E\uDDF1', name: 'Wall Explorer', desc: 'Find 3 equivalent pairs on the fraction wall', check: function(u) { return u.wallPairsFound >= 3; } },
      { id: 'operations5', icon: '\u2795', name: 'Operator', desc: 'Complete 5 operation challenges', check: function(u) { return u.opsSolved >= 5; } },
      { id: 'tabExplorer', icon: '\uD83D\uDDFA\uFE0F', name: 'Explorer', desc: 'Visit all 6 tabs', check: function(u) { return u.tabsVisited >= 6; } },
      { id: 'aiLearner', icon: '\uD83E\uDD16', name: 'AI Learner', desc: 'Ask the AI tutor a question', check: function(u) { return u.aiAsked >= 1; } }
    ];

    var checkBadges = function(updates) {
      var newBadges = Object.assign({}, badges);
      var awarded = false;
      BADGES.forEach(function(b) {
        if (!newBadges[b.id] && b.check(updates)) {
          newBadges[b.id] = true;
          awarded = true;
          sfxBadge();
          addToast(b.icon + ' Badge: ' + b.name + ' — ' + b.desc, 'success');
          awardXP('fractionBadge', 15, b.name);
        }
      });
      if (awarded) upd({ badges: newBadges });
    };

    // Track tab visits
    var tabsVisited = _f.tabsVisited || {};
    var trackTab = function(tabId) {
      if (!tabsVisited[tabId]) {
        var newVisited = Object.assign({}, tabsVisited);
        newVisited[tabId] = true;
        upd({ tabsVisited: newVisited });
        var count = Object.keys(newVisited).length;
        checkBadges({
          correct: score.correct, streak: streak, typesUsed: Object.keys(challengeTypesUsed).length,
          equivSolved: _f.equivSolved || 0, simplifySolved: _f.simplifySolved || 0,
          convertCount: _f.convertCount || 0, wallPairsFound: _f.wallPairsFound || 0,
          opsSolved: _f.opsSolved || 0, tabsVisited: count, aiAsked: _f.aiAsked || 0
        });
      }
    };

    // ═══ DRAWING HELPERS ═══
    var drawPie = function(num, den, size, color) {
      if (den <= 0) den = 1;
      var slices = [];
      for (var i = 0; i < den; i++) {
        var startAngle = (i / den) * 2 * Math.PI - Math.PI / 2;
        var endAngle = ((i + 1) / den) * 2 * Math.PI - Math.PI / 2;
        var x1 = (size / 2) + (size / 2 - 2) * Math.cos(startAngle);
        var y1 = (size / 2) + (size / 2 - 2) * Math.sin(startAngle);
        var x2 = (size / 2) + (size / 2 - 2) * Math.cos(endAngle);
        var y2 = (size / 2) + (size / 2 - 2) * Math.sin(endAngle);
        var largeArc = (endAngle - startAngle) > Math.PI ? 1 : 0;
        var filled = i < num;
        slices.push(h('path', {
          key: i,
          d: 'M ' + (size / 2) + ' ' + (size / 2) + ' L ' + x1 + ' ' + y1 + ' A ' + (size / 2 - 2) + ' ' + (size / 2 - 2) + ' 0 ' + largeArc + ' 1 ' + x2 + ' ' + y2 + ' Z',
          fill: filled ? (color || 'hsl(' + (340 + i * 8) + ', 70%, ' + (60 + i * 2) + '%)') : '#fecdd3',
          stroke: '#e11d48', strokeWidth: 1.5,
          className: 'cursor-pointer hover:opacity-80 transition-opacity'
        }));
      }
      return h('svg', { viewBox: '0 0 ' + size + ' ' + size, width: size, height: size },
        slices,
        h('circle', { cx: size / 2, cy: size / 2, r: 3, fill: '#e11d48' })
      );
    };

    var drawBar = function(num, den, color) {
      if (den <= 0) den = 1;
      var segs = [];
      for (var i = 0; i < den; i++) {
        segs.push(h('div', {
          key: i,
          style: { flex: 1, backgroundColor: i < num ? (color || '#f43f5e') : '#e2e8f0', transition: 'background-color 0.3s' },
          className: 'border-r border-white/50'
        }));
      }
      return h('div', {
        className: 'flex h-10 rounded-lg overflow-hidden border-2',
        style: { borderColor: color || '#f43f5e' }
      }, segs);
    };

    // ═══ OPERATIONS ═══
    var computeOp = function() {
      if (opMode === 'add') { var cd = lcm(den1, den2); return [num1 * (cd / den1) + num2 * (cd / den2), cd]; }
      if (opMode === 'sub') { var cd2 = lcm(den1, den2); return [num1 * (cd2 / den1) - num2 * (cd2 / den2), cd2]; }
      if (opMode === 'mul') { return [num1 * num2, den1 * den2]; }
      if (opMode === 'div') { return [num1 * den2, den1 * num2]; }
      return [0, 1];
    };
    var opResult = computeOp();
    var opSimplified = simplify(opResult[0], opResult[1]);
    var opSymbols = { add: '+', sub: '\u2212', mul: '\u00D7', div: '\u00F7' };

    // ═══ EQUIVALENT CHAINS ═══
    var equivChain = function(n, d, count) {
      var s = simplify(n, d);
      var result = [];
      for (var m = 1; m <= count; m++) { result.push([s[0] * m, s[1] * m]); }
      return result;
    };

    // ═══ BENCHMARK FRACTIONS ═══
    var benchmarks = [
      { frac: '1/2', dec: '0.5', pct: '50%' },
      { frac: '1/4', dec: '0.25', pct: '25%' },
      { frac: '3/4', dec: '0.75', pct: '75%' },
      { frac: '1/3', dec: '0.333...', pct: '33.3%' },
      { frac: '2/3', dec: '0.666...', pct: '66.7%' },
      { frac: '1/5', dec: '0.2', pct: '20%' },
      { frac: '2/5', dec: '0.4', pct: '40%' },
      { frac: '3/5', dec: '0.6', pct: '60%' },
      { frac: '4/5', dec: '0.8', pct: '80%' },
      { frac: '1/8', dec: '0.125', pct: '12.5%' },
      { frac: '3/8', dec: '0.375', pct: '37.5%' },
      { frac: '5/8', dec: '0.625', pct: '62.5%' },
      { frac: '7/8', dec: '0.875', pct: '87.5%' },
      { frac: '1/10', dec: '0.1', pct: '10%' },
      { frac: '1/6', dec: '0.166...', pct: '16.7%' },
      { frac: '5/6', dec: '0.833...', pct: '83.3%' }
    ];

    // ═══ CHALLENGE GENERATION (7 types) ═══
    var generateChallenge = function() {
      var types = ['identify', 'equivalent', 'compare', 'simplify', 'ordering', 'toDecimal', 'mixedNumber'];
      var type = types[Math.floor(Math.random() * types.length)];
      var ch;

      if (type === 'identify') {
        var d2 = pick(dpool);
        var n = randInt(1, d2);
        upd({ pieces: { numerator: n, denominator: d2 } });
        ch = { type: type, question: 'Look at the shaded pieces. How many pieces are filled?', answer: n };

      } else if (type === 'equivalent') {
        var d3 = pick([2, 3, 4, 5, 6]);
        var n2 = randInt(1, d3 - 1);
        var mult = randInt(2, 4);
        ch = { type: type, question: n2 + '/' + d3 + ' = ?/' + (d3 * mult) + '  \u2014 What is the missing numerator?', answer: n2 * mult };

      } else if (type === 'compare') {
        var da = pick([2, 3, 4, 6, 8]);
        var na = randInt(1, da);
        var db = pick([2, 3, 4, 6, 8]);
        var nb = randInt(1, db);
        var va = na / da, vb = nb / db;
        while (Math.abs(va - vb) < 0.001) { nb = randInt(1, db); vb = nb / db; }
        ch = { type: type, question: 'Which is larger: ' + na + '/' + da + ' or ' + nb + '/' + db + '? Enter the numerator of the larger fraction.', answer: va >= vb ? na : nb };

      } else if (type === 'simplify') {
        var base_d = pick([2, 3, 4, 5, 6]);
        var base_n = randInt(1, base_d - 1);
        var mult2 = randInt(2, 5);
        var bigN = base_n * mult2;
        var bigD = base_d * mult2;
        ch = { type: type, question: 'Simplify ' + bigN + '/' + bigD + '. What is the simplified numerator?', answer: base_n, hint: 'GCD(' + bigN + ', ' + bigD + ') = ' + (mult2) };

      } else if (type === 'ordering') {
        var fracs = [];
        for (var fi = 0; fi < 3; fi++) {
          var fd = pick([2, 3, 4, 5, 6, 8]);
          var fn = randInt(1, fd);
          fracs.push({ n: fn, d: fd, val: fn / fd });
        }
        fracs.sort(function(a, b) { return a.val - b.val; });
        var shuffled = fracs.slice().sort(function() { return Math.random() - 0.5; });
        var smallest = fracs[0];
        ch = {
          type: type,
          question: 'Which is the smallest: ' + shuffled.map(function(f) { return f.n + '/' + f.d; }).join(', ') + '? Enter its numerator.',
          answer: smallest.n,
          hint: 'Convert to decimals: ' + shuffled.map(function(f) { return f.n + '/' + f.d + '=' + f.val.toFixed(3); }).join(', ')
        };

      } else if (type === 'toDecimal') {
        var td = pick([2, 4, 5, 8, 10, 20, 25]);
        var tn = randInt(1, td - 1);
        var decVal = tn / td;
        var decStr = decVal.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
        // Ask for percentage as integer
        var pctAnswer = Math.round(decVal * 100);
        ch = { type: type, question: 'What is ' + tn + '/' + td + ' as a percentage? (whole number)', answer: pctAnswer, hint: tn + '/' + td + ' = ' + decStr };

      } else if (type === 'mixedNumber') {
        var md = pick([2, 3, 4, 5, 6, 8]);
        var whole = randInt(1, 4);
        var mr = randInt(1, md - 1);
        var improper = whole * md + mr;
        ch = { type: type, question: 'Convert ' + improper + '/' + md + ' to a mixed number. What is the whole number part?', answer: whole, hint: improper + ' \u00F7 ' + md + ' = ' + whole + ' remainder ' + mr };
      }

      // Track type usage
      var newTypes = Object.assign({}, challengeTypesUsed);
      newTypes[type] = true;

      sfxNewChallenge();
      upd({ challenge: ch, answer: '', feedback: null, challengeTypesUsed: newTypes });
    };

    var checkChallenge = function() {
      if (!challenge) return;
      var ans = parseInt(answer);
      var ok = ans === challenge.answer;
      var newStreak = ok ? streak + 1 : 0;
      var newBest = Math.max(bestStreak, newStreak);
      var newCorrect = score.correct + (ok ? 1 : 0);
      var newTotal = score.total + 1;

      // Track per-type counters
      var newEquivSolved = (_f.equivSolved || 0) + (ok && challenge.type === 'equivalent' ? 1 : 0);
      var newSimplifySolved = (_f.simplifySolved || 0) + (ok && challenge.type === 'simplify' ? 1 : 0);
      var newOpsSolved = (_f.opsSolved || 0) + (ok && challenge.type === 'ordering' ? 1 : 0);

      if (ok) {
        sfxCorrect();
        if (newStreak === 3 || newStreak === 5 || newStreak === 10) sfxStreak();
        announceToSR('Correct!');
      } else {
        sfxWrong();
        announceToSR('Incorrect');
      }

      upd({
        feedback: ok
          ? { correct: true, msg: '\u2705 Correct!' + (challenge.hint ? '' : '') }
          : { correct: false, msg: '\u274C The answer was ' + challenge.answer + (challenge.hint ? ' (' + challenge.hint + ')' : '') },
        score: { correct: newCorrect, total: newTotal },
        streak: newStreak,
        bestStreak: newBest,
        equivSolved: newEquivSolved,
        simplifySolved: newSimplifySolved,
        opsSolved: newOpsSolved
      });
      if (ok) awardXP('fractionChallenge', 10, 'fraction challenge');

      checkBadges({
        correct: newCorrect, streak: newStreak,
        typesUsed: Object.keys(challengeTypesUsed).length,
        equivSolved: newEquivSolved, simplifySolved: newSimplifySolved,
        convertCount: _f.convertCount || 0, wallPairsFound: _f.wallPairsFound || 0,
        opsSolved: newOpsSolved, tabsVisited: Object.keys(tabsVisited).length,
        aiAsked: _f.aiAsked || 0
      });
    };

    // ═══ COMPARE QUIZ ═══
    var makeQuiz = function() {
      var n1q = randInt(1, 9), d1q = randInt(2, 10);
      var n2q = randInt(1, 9), d2q = randInt(2, 10);
      while (Math.abs(n1q / d1q - n2q / d2q) < 0.01) { n2q = randInt(1, 9); d2q = randInt(2, 10); }
      var ans = n1q / d1q > n2q / d2q ? n1q + '/' + d1q : n2q + '/' + d2q;
      sfxNewChallenge();
      upd({
        quiz: { n1: n1q, d1: d1q, n2: n2q, d2: d2q, answer: ans, opts: [n1q + '/' + d1q, n2q + '/' + d2q, 'They are equal'], answered: false },
        num1: n1q, den1: d1q, num2: n2q, den2: d2q
      });
    };

    // ═══ AI TUTOR ═══
    var askAITutor = function() {
      if (!aiQuestion.trim()) return;
      upd({ aiLoading: true, aiResponse: '' });
      var prompt = 'You are a friendly math tutor helping a student learn about fractions. ' +
        'The student is currently on the "' + tab + '" tab of the Fraction Lab. ' +
        'They are working with fractions like ' + num1 + '/' + den1 + ' and ' + num2 + '/' + den2 + '. ' +
        'Their question: "' + aiQuestion + '"\n\n' +
        'Give a clear, encouraging explanation appropriate for a student. Use examples. Keep it under 150 words.';
      ctx.callGemini(prompt, false, false, 0.7).then(function(resp) {
        upd({ aiResponse: resp, aiLoading: false, aiAsked: (_f.aiAsked || 0) + 1 });
        checkBadges({
          correct: score.correct, streak: streak,
          typesUsed: Object.keys(challengeTypesUsed).length,
          equivSolved: _f.equivSolved || 0, simplifySolved: _f.simplifySolved || 0,
          convertCount: _f.convertCount || 0, wallPairsFound: _f.wallPairsFound || 0,
          opsSolved: _f.opsSolved || 0, tabsVisited: Object.keys(tabsVisited).length,
          aiAsked: (_f.aiAsked || 0) + 1
        });
      }).catch(function() {
        upd({ aiResponse: 'Sorry, I could not connect to the AI tutor right now. Try again later!', aiLoading: false });
      });
    };

    // ═══ KEYBOARD SHORTCUTS (managed without useEffect) ═══
    if (window._fracKbHandler) window.removeEventListener('keydown', window._fracKbHandler);
    window._fracKbHandler = function(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      var key = e.key;
      if (key === '1') { upd({ tab: 'practice' }); trackTab('practice'); }
      else if (key === '2') { upd({ tab: 'compare' }); trackTab('compare'); }
      else if (key === '3') { upd({ tab: 'operations' }); trackTab('operations'); }
      else if (key === '4') { upd({ tab: 'equivalents' }); trackTab('equivalents'); }
      else if (key === '5') { upd({ tab: 'converter' }); trackTab('converter'); }
      else if (key === '6') { upd({ tab: 'wall' }); trackTab('wall'); }
      else if (key === 'n' || key === 'N') { if (tab === 'practice') generateChallenge(); }
      else if (key === 'b' || key === 'B') { upd({ showBenchmarks: !showBenchmarks }); }
      else if (key === 'p' || key === 'P') { upd({ mode: mode === 'pie' ? 'bar' : 'pie' }); }
      else if (key === '?' || key === '/') { upd({ showAITutor: !showAITutor }); }
    };
    window.addEventListener('keydown', window._fracKbHandler);

    // Track initial tab visit
    if (!window.__fracTabTracked) { window.__fracTabTracked = true; setTimeout(function() { trackTab(tab); }, 0); }

    // ═══ TAB: PRACTICE ═══
    var renderPractice = function() {
      var pn = pieces.numerator;
      var pd = pieces.denominator;
      var pSimp = simplify(pn, pd);
      var isSimplified = (pSimp[0] === pn && pSimp[1] === pd);
      return h('div', { className: 'space-y-4' },
        // Sliders
        h('div', { className: 'grid grid-cols-2 gap-3' },
          h('div', { className: 'bg-rose-50 rounded-lg p-3 border border-rose-100' },
            h('label', { className: 'block text-xs text-rose-700 mb-1 font-bold' }, 'Denominator (parts)'),
            h('input', {
              type: 'range', min: '2', max: '20', value: pd,
              onChange: function(e) { var v = parseInt(e.target.value); sfxClick(); upd({ pieces: { denominator: v, numerator: Math.min(pn, v) } }); },
              className: 'w-full accent-rose-600'
            }),
            h('div', { className: 'text-center text-lg font-bold text-rose-700' }, pd)
          ),
          h('div', { className: 'bg-rose-50 rounded-lg p-3 border border-rose-100' },
            h('label', { className: 'block text-xs text-rose-700 mb-1 font-bold' }, 'Numerator (selected)'),
            h('input', {
              type: 'range', min: '0', max: String(pd), value: pn,
              onChange: function(e) { sfxClick(); upd({ pieces: { denominator: pd, numerator: parseInt(e.target.value) } }); },
              className: 'w-full accent-rose-600'
            }),
            h('div', { className: 'text-center text-lg font-bold text-rose-700' }, pn)
          )
        ),
        // Pie + bar
        h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'bg-white rounded-xl border-2 border-rose-200 p-6 flex justify-center' },
          mode === 'pie'
            ? drawPie(pn, pd, 240, null)
            : h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'w-full max-w-md' }, drawBar(pn, pd, null))
        ),
        // Clickable bar
        h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'bg-white rounded-xl border-2 border-rose-200 p-4' },
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-[2px] h-12 rounded-lg overflow-hidden' },
            Array.from({ length: pd }, function(_, i) {
              return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },
                key: i,
                onClick: function() { sfxClick(); upd({ pieces: { denominator: pd, numerator: i < pn ? i : i + 1 } }); },
                className: 'flex-1 cursor-pointer transition-all ' + (i < pn ? 'bg-rose-500 hover:bg-rose-600' : 'bg-rose-100 hover:bg-rose-200'),
                title: (i + 1) + '/' + pd
              });
            })
          )
        ),
        // Value display
        h('div', { className: 'bg-white rounded-xl p-4 border border-rose-100 text-center' },
          h('div', { className: 'inline-flex flex-col items-center' },
            h('span', { className: 'text-3xl font-bold text-rose-700 border-b-4 border-rose-400 px-4 pb-1' }, pn),
            h('span', { className: 'text-3xl font-bold text-rose-700 px-4 pt-1' }, pd)
          ),
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-sm text-rose-600 mt-2 space-x-3' },
            h('span', null, '= ' + (pd > 0 ? (pn / pd * 100).toFixed(0) : 0) + '%'),
            pn > 0 && h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-slate-500' }, '\u2248 ' + (pd > 0 ? (pn / pd).toFixed(3) : 0)),
            !isSimplified && h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-violet-600 font-bold' }, '\u2192 ' + pSimp[0] + '/' + pSimp[1])
          ),
          pn > pd && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-sm font-bold text-orange-600 mt-1' }, '\uD83D\uDCE6 Mixed: ' + toMixed(pn, pd)),
          pn === pd && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-sm font-bold text-green-600 mt-1' }, '= 1 whole! \uD83C\uDF89')
        ),
        // Toggle mode
        h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex justify-center gap-2' },
          ['pie', 'bar'].map(function(m) {
            return h('button', { 'aria-label': 'Sfx Click',
              key: m,
              onClick: function() { sfxClick(); upd({ mode: m }); },
              className: 'px-3 py-1.5 rounded-lg text-xs font-bold capitalize ' + (mode === m ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-rose-50')
            }, m === 'bar' ? '\u2588 Bar' : '\u25CF Pie');
          })
        ),
        // Preset buttons
        h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex flex-wrap gap-2' },
          [{ n: 1, d: 2, l: '\u00BD' }, { n: 1, d: 3, l: '\u2153' }, { n: 1, d: 4, l: '\u00BC' }, { n: 2, d: 3, l: '\u2154' },
           { n: 3, d: 4, l: '\u00BE' }, { n: 3, d: 8, l: '\u215C' }, { n: 5, d: 6, l: '\u215A' }, { n: 7, d: 12, l: '7/12' },
           { n: 11, d: 16, l: '11/16' }, { n: 13, d: 20, l: '13/20' }
          ].map(function(p) {
            return h('button', { 'aria-label': 'Sfx Click',
              key: p.l,
              onClick: function() { sfxClick(); upd({ pieces: { numerator: p.n, denominator: p.d } }); },
              className: 'px-3 py-1.5 text-sm font-bold bg-rose-50 text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-100 transition-all'
            }, p.l);
          })
        )
      );
    };

    // ═══ TAB: COMPARE ═══
    var renderCompare = function() {
      var nlMax = Math.max(Math.ceil(val1), Math.ceil(val2), 2);
      return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'space-y-3' },
        // Quick presets
        h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex flex-wrap gap-1.5' },
          h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-[10px] font-bold text-slate-500 self-center' }, 'Presets:'),
          [[1,2,1,3],[2,5,3,8],[3,4,5,6],[1,4,2,8],[7,10,3,5],[5,12,1,3]].map(function(pr) {
            return h('button', { 'aria-label': 'Sfx Click',
              key: pr.join('-'),
              onClick: function() { sfxClick(); upd({ num1: pr[0], den1: pr[1], num2: pr[2], den2: pr[3] }); },
              className: 'px-2 py-1 rounded-lg text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition-all'
            }, pr[0] + '/' + pr[1] + ' vs ' + pr[2] + '/' + pr[3]);
          })
        ),
        // Two fraction inputs
        h('div', { className: 'grid grid-cols-2 gap-4' },
          [{ label: 'Fraction A', n: num1, d: den1, nk: 'num1', dk: 'den1', color: '#3b82f6', sn: s1[0], sd: s1[1], val: val1 },
           { label: 'Fraction B', n: num2, d: den2, nk: 'num2', dk: 'den2', color: '#ef4444', sn: s2[0], sd: s2[1], val: val2 }
          ].map(function(frac) {
            return h('div', { key: frac.label, className: 'bg-white rounded-xl border p-4' },
              h('h4', { className: 'text-sm font-bold text-slate-600 mb-2' }, frac.label),
              h('div', { className: 'flex items-center justify-center gap-2 mb-3' },
                h('div', { className: 'text-center' },
                  h('input', {
                    type: 'number', min: 0, max: 20, value: frac.n,
                    'aria-label': frac.label + ' numerator',
                    onChange: function(e) { var o = {}; o[frac.nk] = Math.max(0, parseInt(e.target.value) || 0); upd(o); },
                    className: 'w-14 text-center text-xl font-bold border-b-2 outline-none focus:ring-2 focus:ring-blue-400', style: { borderColor: frac.color }
                  }),
                  h('div', { className: 'w-14 h-0.5 my-1', style: { backgroundColor: frac.color } }),
                  h('input', {
                    type: 'number', min: 1, max: 20, value: frac.d,
                    'aria-label': frac.label + ' denominator',
                    onChange: function(e) { var o = {}; o[frac.dk] = Math.max(1, parseInt(e.target.value) || 1); upd(o); },
                    className: 'w-14 text-center text-xl font-bold outline-none focus:ring-2 focus:ring-blue-400'
                  })
                ),
                h('div', { className: 'text-left ml-2' },
                  h('p', { className: 'text-lg font-bold text-slate-500' }, '= ' + (frac.val * 100).toFixed(0) + '%'),
                  h('p', { className: 'text-xs text-slate-500' }, '\u2248 ' + frac.val.toFixed(3)),
                  (frac.sn !== frac.n || frac.sd !== frac.d) && h('p', { className: 'text-xs text-slate-500' }, '\u2192 ' + frac.sn + '/' + frac.sd),
                  frac.n > frac.d && h('p', { className: 'text-xs font-bold text-orange-500' }, '\uD83D\uDCE6 ' + toMixed(frac.n, frac.d))
                )
              ),
              mode === 'bar' ? drawBar(frac.n, frac.d, frac.color) : h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex justify-center' }, drawPie(frac.n, frac.d, 100, frac.color))
            );
          })
        ),
        // View mode toggle
        h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex justify-end gap-1' },
          ['bar', 'pie'].map(function(m) {
            return h('button', { 'aria-label': 'Number Line',
              key: m,
              onClick: function() { sfxClick(); upd({ mode: m }); },
              className: 'px-3 py-1 rounded-lg text-xs font-bold capitalize ' + (mode === m ? 'bg-orange-700 text-white' : 'bg-slate-100 text-slate-600')
            }, m === 'bar' ? '\u2588 Bar' : '\u25CF Pie');
          })
        ),
        // Number line
        h('div', { className: 'bg-white rounded-xl border p-3' },
          h('p', { className: 'text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2' }, '\uD83D\uDCCF Number Line'),
          h('svg', { viewBox: '0 0 400 50', className: 'w-full', style: { maxHeight: '60px' } },
            h('line', { x1: 20, y1: 30, x2: 380, y2: 30, stroke: '#94a3b8', strokeWidth: 2 }),
            Array.from({ length: nlMax + 1 }, function(_, i) {
              var x = 20 + i * (360 / nlMax);
              return h('g', { key: 't' + i },
                h('line', { x1: x, y1: 24, x2: x, y2: 36, stroke: '#64748b', strokeWidth: 2 }),
                h('text', { x: x, y: 46, textAnchor: 'middle', style: { fontSize: '11px', fontWeight: 'bold' }, fill: '#475569' }, i)
              );
            }),
            h('circle', { cx: 20 + val1 * (360 / nlMax), cy: 30, r: 6, fill: '#3b82f6', stroke: 'white', strokeWidth: 2 }),
            h('text', { x: 20 + val1 * (360 / nlMax), y: 18, textAnchor: 'middle', style: { fontSize: '8px', fontWeight: 'bold' }, fill: '#3b82f6' }, num1 + '/' + den1),
            h('circle', { cx: 20 + val2 * (360 / nlMax), cy: 30, r: 6, fill: '#ef4444', stroke: 'white', strokeWidth: 2 }),
            h('text', { x: 20 + val2 * (360 / nlMax), y: 18, textAnchor: 'middle', style: { fontSize: '8px', fontWeight: 'bold' }, fill: '#ef4444' }, num2 + '/' + den2),
            Math.abs(val1 - val2) > 0.001 && h('line', { x1: 20 + Math.min(val1, val2) * (360 / nlMax), y1: 38, x2: 20 + Math.max(val1, val2) * (360 / nlMax), y2: 38, stroke: '#a855f7', strokeWidth: 1.5, strokeDasharray: '3 2' })
          )
        ),
        // Cross-multiplication explanation
        h('div', { className: 'bg-violet-50 rounded-xl p-3 border border-violet-200' },
          h('p', { className: 'text-[10px] font-bold text-violet-600 uppercase tracking-wider mb-1' }, '\uD83D\uDCA1 Cross-Multiply Method'),
          h('p', { className: 'text-xs text-violet-800' },
            num1 + ' \u00D7 ' + den2 + ' = ' + (num1 * den2) + '  vs  ' + num2 + ' \u00D7 ' + den1 + ' = ' + (num2 * den1) +
            '  \u2192  ' + (num1 * den2 > num2 * den1 ? num1 + '/' + den1 + ' is larger' : num1 * den2 < num2 * den1 ? num2 + '/' + den2 + ' is larger' : 'They are equal')
          )
        ),
        // Comparison result (hidden during quiz)
        !(quiz && !quiz.answered) && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },
          className: 'p-3 rounded-xl text-center font-bold text-lg ' +
            (Math.abs(val1 - val2) < 0.001 ? 'bg-green-50 text-green-700 border border-green-200' :
             val1 > val2 ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-red-50 text-red-700 border border-red-200')
        }, Math.abs(val1 - val2) < 0.001
            ? num1 + '/' + den1 + ' = ' + num2 + '/' + den2 + ' \u2705 Equal!'
            : val1 > val2
              ? num1 + '/' + den1 + ' > ' + num2 + '/' + den2 + '  (by ' + Math.abs(val1 - val2).toFixed(3) + ')'
              : num1 + '/' + den1 + ' < ' + num2 + '/' + den2 + '  (by ' + Math.abs(val1 - val2).toFixed(3) + ')'
        ),
        // Which is Larger? Quiz
        h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'border-t border-slate-200 pt-3' },
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex items-center gap-2 mb-2' },
            h('button', { 'aria-label': 'Which fraction is larger?',
              onClick: makeQuiz,
              className: 'px-3 py-1.5 rounded-lg text-xs font-bold ' + (quiz ? 'bg-orange-100 text-orange-700' : 'bg-orange-700 text-white') + ' hover:opacity-90 transition-all'
            }, quiz ? '\uD83D\uDD04 Next Round' : '\u26A1 Which is Larger?'),
            quizScore > 0 && h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xs font-bold text-emerald-600' }, '\u2B50 ' + quizScore + ' | \uD83D\uDD25 ' + quizStreak)
          ),
          quiz && !quiz.answered && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'bg-orange-50 rounded-xl p-3 border border-orange-200' },
            h('p', { className: 'text-sm font-bold text-orange-800 mb-2' }, 'Which fraction is larger?'),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-2 justify-center' },
              quiz.opts.map(function(opt) {
                return h('button', { 'aria-label': 'Select option',
                  key: opt,
                  onClick: function() {
                    var correct = opt === quiz.answer;
                    if (correct) { sfxCorrect(); } else { sfxWrong(); }
                    upd({
                      quiz: Object.assign({}, quiz, { answered: true, chosen: opt }),
                      quizScore: quizScore + (correct ? 1 : 0),
                      quizStreak: correct ? quizStreak + 1 : 0
                    });
                    if (correct) { addToast('\u2705 Correct! ' + quiz.answer + ' is larger', 'success'); awardXP('fractionViz', 5, 'fraction quiz'); }
                    else addToast('\u274C ' + quiz.answer + ' is larger', 'error');
                  },
                  className: 'px-4 py-2 rounded-lg text-sm font-bold border-2 bg-white text-slate-700 border-slate-200 hover:border-orange-400 hover:bg-orange-50 transition-all'
                }, opt);
              })
            )
          ),
          quiz && quiz.answered && h('div', {
            className: 'p-3 rounded-xl text-sm font-bold text-center ' + (quiz.chosen === quiz.answer ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200')
          }, quiz.chosen === quiz.answer ? '\u2705 Correct! ' + quiz.answer + ' is larger' : '\u274C ' + quiz.answer + ' is larger')
        )
      );
    };

    // ═══ TAB: OPERATIONS ═══
    var renderOperations = function() {
      // Area model for multiplication
      var renderAreaModel = function() {
        if (opMode !== 'mul') return null;
        var cellW = 28, cellH = 28;
        var totalW = den2 * cellW + 2;
        var totalH = den1 * cellH + 2;
        var cells = [];
        for (var r = 0; r < den1; r++) {
          for (var c = 0; c < den2; c++) {
            var inA = r < num1;
            var inB = c < num2;
            var fill = inA && inB ? '#22c55e' : inA ? '#93c5fd' : inB ? '#fca5a5' : '#f1f5f9';
            cells.push(h('rect', {
              key: r + '-' + c, x: 1 + c * cellW, y: 1 + r * cellH,
              width: cellW, height: cellH,
              fill: fill, stroke: '#94a3b8', strokeWidth: 0.5
            }));
          }
        }
        return h('div', { className: 'bg-white rounded-xl border p-3 text-center' },
          h('p', { className: 'text-[10px] font-bold text-green-600 uppercase tracking-wider mb-2' }, '\uD83D\uDFE9 Area Model'),
          h('svg', { viewBox: '0 0 ' + totalW + ' ' + totalH, width: Math.min(totalW * 1.2, 300), height: Math.min(totalH * 1.2, 200) }, cells),
          h('p', { className: 'text-xs text-slate-500 mt-1' },
            'Green = ' + num1 + '\u00D7' + num2 + ' = ' + (num1 * num2) + ' out of ' + (den1 * den2) + ' total cells'
          )
        );
      };

      return h('div', { className: 'space-y-3' },
        // Fraction inputs (compact)
        h('div', { className: 'grid grid-cols-2 gap-4' },
          [{ label: 'A', n: num1, d: den1, nk: 'num1', dk: 'den1', color: '#3b82f6' },
           { label: 'B', n: num2, d: den2, nk: 'num2', dk: 'den2', color: '#ef4444' }
          ].map(function(frac) {
            return h('div', { key: frac.label, className: 'bg-white rounded-xl border p-3 text-center' },
              h('span', { className: 'text-xs font-bold text-slate-500' }, 'Fraction ' + frac.label),
              h('div', { className: 'flex items-center justify-center gap-1 mt-1' },
                h('input', {
                  type: 'number', min: 0, max: 20, value: frac.n,
                  'aria-label': 'Fraction ' + frac.label + ' numerator',
                  onChange: function(e) { var o = {}; o[frac.nk] = Math.max(0, parseInt(e.target.value) || 0); upd(o); },
                  className: 'w-12 text-center text-lg font-bold border-b-2 outline-none focus:ring-2 focus:ring-blue-400', style: { borderColor: frac.color }
                }),
                h('span', { className: 'text-xl font-bold text-slate-500 mx-1' }, '/'),
                h('input', {
                  type: 'number', min: 1, max: 20, value: frac.d,
                  'aria-label': 'Fraction ' + frac.label + ' denominator',
                  onChange: function(e) { var o = {}; o[frac.dk] = Math.max(1, parseInt(e.target.value) || 1); upd(o); },
                  className: 'w-12 text-center text-lg font-bold outline-none focus:ring-2 focus:ring-blue-400'
                })
              )
            );
          })
        ),
        // Operation buttons
        h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-2 justify-center' },
          [['add', '+'], ['sub', '\u2212'], ['mul', '\u00D7'], ['div', '\u00F7']].map(function(op) {
            return h('button', { 'aria-label': 'Sfx Click',
              key: op[0],
              onClick: function() { sfxClick(); upd({ opMode: op[0] }); },
              className: 'w-12 h-12 rounded-lg text-xl font-black transition-all ' +
                (opMode === op[0] ? 'bg-orange-700 text-white shadow-md scale-110' : 'bg-slate-100 text-slate-600 hover:bg-orange-50')
            }, op[1]);
          })
        ),
        // Result
        h('div', { className: 'bg-white rounded-xl border-2 border-orange-200 p-4 text-center' },
          h('div', { className: 'text-2xl font-bold text-slate-800 mb-3' },
            h('span', { className: 'text-blue-600' }, num1 + '/' + den1),
            h('span', { className: 'mx-3 text-orange-500' }, opSymbols[opMode]),
            h('span', { className: 'text-red-600' }, num2 + '/' + den2),
            h('span', { className: 'mx-3 text-slate-500' }, '='),
            h('span', { className: 'text-emerald-600' }, opSimplified[0] + '/' + opSimplified[1])
          ),
          // Mixed number result
          (Math.abs(opSimplified[0]) > opSimplified[1]) && h('p', { className: 'text-sm font-bold text-orange-600 mb-2' },
            '\uD83D\uDCE6 Mixed: ' + toMixed(opSimplified[0], opSimplified[1])
          ),
          // Decimal result
          h('p', { className: 'text-xs text-slate-500 mb-3' },
            '\u2248 ' + (opSimplified[1] !== 0 ? (opSimplified[0] / opSimplified[1]).toFixed(4) : 'undefined')
          ),
          // Step-by-step
          h('div', { className: 'bg-orange-50 rounded-lg p-3 text-xs text-orange-800 space-y-1 text-left' },
            h('p', { className: 'font-bold' }, '\uD83D\uDCA1 Step by step:'),
            (opMode === 'add' || opMode === 'sub')
              ? h(React.Fragment, null,
                  h('p', null, '1. Find common denominator: LCD(' + den1 + ', ' + den2 + ') = ' + lcm(den1, den2)),
                  h('p', null, '2. Convert: ' + num1 + '/' + den1 + ' = ' + (num1 * (lcm(den1, den2) / den1)) + '/' + lcm(den1, den2) + ' and ' + num2 + '/' + den2 + ' = ' + (num2 * (lcm(den1, den2) / den2)) + '/' + lcm(den1, den2)),
                  h('p', null, '3. ' + (opMode === 'add' ? 'Add' : 'Subtract') + ' numerators: ' + opResult[0] + '/' + opResult[1]),
                  (opResult[0] !== opSimplified[0] || opResult[1] !== opSimplified[1]) && h('p', null, '4. Simplify: ' + opSimplified[0] + '/' + opSimplified[1])
                )
              : h(React.Fragment, null,
                  opMode === 'mul'
                    ? h('p', null, 'Multiply straight across: (' + num1 + '\u00D7' + num2 + ')/(' + den1 + '\u00D7' + den2 + ') = ' + opResult[0] + '/' + opResult[1])
                    : h('p', null, 'Flip and multiply: ' + num1 + '/' + den1 + ' \u00D7 ' + den2 + '/' + num2 + ' = ' + opResult[0] + '/' + opResult[1]),
                  (opResult[0] !== opSimplified[0] || opResult[1] !== opSimplified[1]) && h('p', null, 'Simplify: ' + opSimplified[0] + '/' + opSimplified[1])
                )
          ),
          // Result bar
          h('div', { className: 'mt-3 flex justify-center' },
            drawBar(Math.min(Math.abs(opSimplified[0]), opSimplified[1] * 2), opSimplified[1], '#22c55e')
          )
        ),
        // Area model (multiplication only)
        renderAreaModel()
      );
    };

    // ═══ TAB: EQUIVALENTS ═══
    var renderEquivalents = function() {
      return h('div', { className: 'space-y-3' },
        // Fraction inputs (compact)
        h('div', { className: 'grid grid-cols-2 gap-4' },
          [{ label: 'Fraction A', n: num1, d: den1, nk: 'num1', dk: 'den1', color: '#3b82f6' },
           { label: 'Fraction B', n: num2, d: den2, nk: 'num2', dk: 'den2', color: '#ef4444' }
          ].map(function(frac) {
            return h('div', { key: frac.label, className: 'bg-white rounded-xl border p-3 text-center' },
              h('span', { className: 'text-xs font-bold text-slate-500' }, frac.label),
              h('div', { className: 'flex items-center justify-center gap-1 mt-1' },
                h('input', {
                  type: 'number', min: 0, max: 20, value: frac.n,
                  'aria-label': frac.label + ' numerator',
                  onChange: function(e) { var o = {}; o[frac.nk] = Math.max(0, parseInt(e.target.value) || 0); upd(o); },
                  className: 'w-12 text-center text-lg font-bold border-b-2 outline-none focus:ring-2 focus:ring-blue-400', style: { borderColor: frac.color }
                }),
                h('span', { className: 'text-xl font-bold text-slate-500 mx-1' }, '/'),
                h('input', {
                  type: 'number', min: 1, max: 20, value: frac.d,
                  'aria-label': frac.label + ' denominator',
                  onChange: function(e) { var o = {}; o[frac.dk] = Math.max(1, parseInt(e.target.value) || 1); upd(o); },
                  className: 'w-12 text-center text-lg font-bold outline-none focus:ring-2 focus:ring-blue-400'
                })
              )
            );
          })
        ),
        // Equiv chains
        h('div', { className: 'bg-white rounded-xl border-2 border-orange-200 p-4' },
          h('p', { className: 'text-[10px] font-bold text-orange-600 uppercase tracking-wider mb-2' }, '\uD83D\uDD17 Equivalent Fractions for ' + s1[0] + '/' + s1[1]),
          h('div', { className: 'flex flex-wrap gap-2 mb-3' },
            equivChain(num1, den1, 8).map(function(eq, i) {
              return h('div', {
                key: 'a' + i,
                className: 'px-3 py-2 rounded-lg border text-center transition-all ' + (i === 0 ? 'bg-blue-100 border-blue-300 shadow-sm' : 'bg-slate-50 border-slate-200 hover:bg-blue-50')
              },
                h('span', { className: 'text-sm font-bold ' + (i === 0 ? 'text-blue-700' : 'text-slate-700') }, eq[0] + '/' + eq[1]),
                h('span', { className: 'text-[10px] text-slate-500 block' }, '\u00D7' + (i + 1))
              );
            })
          ),
          h('p', { className: 'text-[10px] font-bold text-orange-600 uppercase tracking-wider mb-2 mt-3' }, '\uD83D\uDD17 Equivalent Fractions for ' + s2[0] + '/' + s2[1]),
          h('div', { className: 'flex flex-wrap gap-2' },
            equivChain(num2, den2, 8).map(function(eq, i) {
              return h('div', {
                key: 'b' + i,
                className: 'px-3 py-2 rounded-lg border text-center transition-all ' + (i === 0 ? 'bg-red-100 border-red-300 shadow-sm' : 'bg-slate-50 border-slate-200 hover:bg-red-50')
              },
                h('span', { className: 'text-sm font-bold ' + (i === 0 ? 'text-red-700' : 'text-slate-700') }, eq[0] + '/' + eq[1]),
                h('span', { className: 'text-[10px] text-slate-500 block' }, '\u00D7' + (i + 1))
              );
            })
          ),
          // Common denominator
          h('div', { className: 'mt-3 p-2 bg-violet-50 rounded-lg border border-violet-200 text-center' },
            h('p', { className: 'text-xs font-bold text-violet-700' }, '\uD83C\uDFAF Common denominator: ' + lcm(den1, den2)),
            h('p', { className: 'text-sm font-bold text-violet-800 mt-1' },
              (num1 * (lcm(den1, den2) / den1)) + '/' + lcm(den1, den2) + ' and ' + (num2 * (lcm(den1, den2) / den2)) + '/' + lcm(den1, den2)
            )
          )
        ),
        // Are they equivalent?
        h('div', {
          className: 'p-3 rounded-xl text-center font-bold ' +
            (s1[0] === s2[0] && s1[1] === s2[1]
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200')
        },
          s1[0] === s2[0] && s1[1] === s2[1]
            ? '\u2705 ' + num1 + '/' + den1 + ' and ' + num2 + '/' + den2 + ' are equivalent! Both simplify to ' + s1[0] + '/' + s1[1]
            : '\u2716 ' + num1 + '/' + den1 + ' (' + s1[0] + '/' + s1[1] + ') and ' + num2 + '/' + den2 + ' (' + s2[0] + '/' + s2[1] + ') are NOT equivalent'
        )
      );
    };

    // ═══ TAB: CONVERTER ═══
    var renderConverter = function() {
      var cSimp = simplify(convNum, convDen);
      var cDec = convDen > 0 ? convNum / convDen : 0;
      var cPct = cDec * 100;
      var cDecStr = fracToDecimal(convNum, convDen);
      var cMixed = convNum > convDen ? toMixed(convNum, convDen) : null;

      // Decimal to fraction conversion
      var parsedDec = parseFloat(convDecInput);
      var decFrac = !isNaN(parsedDec) ? decToFrac(parsedDec) : null;

      return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'space-y-4' },
        // Direction toggle
        h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-2 justify-center' },
          h('button', { 'aria-label': 'Fraction to Decimal',
            onClick: function() { sfxClick(); upd({ convDirection: 'fracToDec' }); },
            className: 'px-4 py-2 rounded-lg text-xs font-bold ' + (convDirection === 'fracToDec' ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-teal-50')
          }, '\uD83C\uDF55 \u2192 Fraction to Decimal'),
          h('button', { 'aria-label': '0.5 Decimal to Fraction',
            onClick: function() { sfxClick(); upd({ convDirection: 'decToFrac' }); },
            className: 'px-4 py-2 rounded-lg text-xs font-bold ' + (convDirection === 'decToFrac' ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-teal-50')
          }, '0.5 \u2192 Decimal to Fraction')
        ),

        convDirection === 'fracToDec' ? h(React.Fragment, null,
          // Fraction input
          h('div', { className: 'bg-white rounded-xl border-2 border-teal-200 p-4 text-center' },
            h('div', { className: 'flex items-center justify-center gap-2' },
              h('input', {
                type: 'number', min: 0, max: 99, value: convNum,
                'aria-label': 'Converter numerator',
                onChange: function(e) { upd({ convNum: Math.max(0, parseInt(e.target.value) || 0) }); },
                className: 'w-16 text-center text-2xl font-bold border-b-3 border-teal-500 outline-none focus:ring-2 focus:ring-teal-400'
              }),
              h('span', { className: 'text-3xl font-bold text-slate-500 mx-2' }, '/'),
              h('input', {
                type: 'number', min: 1, max: 99, value: convDen,
                'aria-label': 'Converter denominator',
                onChange: function(e) { upd({ convDen: Math.max(1, parseInt(e.target.value) || 1) }); },
                className: 'w-16 text-center text-2xl font-bold outline-none focus:ring-2 focus:ring-teal-400'
              })
            )
          ),
          // Results card
          h('div', { className: 'bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl border-2 border-teal-200 p-4 space-y-3' },
            // Simplified
            (cSimp[0] !== convNum || cSimp[1] !== convDen) && h('div', { className: 'flex items-center gap-3 p-2 bg-white rounded-lg' },
              h('span', { className: 'text-xs font-bold text-teal-600 w-24' }, '\u2702\uFE0F Simplified'),
              h('span', { className: 'text-lg font-bold text-teal-800' }, cSimp[0] + '/' + cSimp[1])
            ),
            // Mixed number
            cMixed && h('div', { className: 'flex items-center gap-3 p-2 bg-white rounded-lg' },
              h('span', { className: 'text-xs font-bold text-orange-600 w-24' }, '\uD83D\uDCE6 Mixed'),
              h('span', { className: 'text-lg font-bold text-orange-800' }, cMixed)
            ),
            // Decimal
            h('div', { className: 'flex items-center gap-3 p-2 bg-white rounded-lg' },
              h('span', { className: 'text-xs font-bold text-blue-600 w-24' }, '\uD83D\uDCCA Decimal'),
              h('span', { className: 'text-lg font-bold text-blue-800' }, cDecStr)
            ),
            // Percentage
            h('div', { className: 'flex items-center gap-3 p-2 bg-white rounded-lg' },
              h('span', { className: 'text-xs font-bold text-purple-600 w-24' }, '\uD83D\uDCCA Percent'),
              h('span', { className: 'text-lg font-bold text-purple-800' }, cPct.toFixed(2) + '%')
            ),
            // Visual bar
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'p-2 bg-white rounded-lg' },
              h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xs font-bold text-slate-500 block mb-1' }, 'Visual'),
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'h-6 bg-slate-200 rounded-full overflow-hidden' },
                h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },
                  style: { width: Math.min(cPct, 100) + '%', backgroundColor: '#14b8a6', transition: 'width 0.3s' },
                  className: 'h-full rounded-full flex items-center justify-center'
                },
                  cPct >= 15 && h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-[10px] font-bold text-white' }, cPct.toFixed(0) + '%')
                )
              )
            )
          ),
          // Track conversions for badge
          h('button', { 'aria-label': 'Log This Conversion',
            onClick: function() {
              sfxComplete();
              var newCount = (_f.convertCount || 0) + 1;
              upd({ convertCount: newCount });
              addToast('\uD83D\uDD04 Converted: ' + convNum + '/' + convDen + ' = ' + cDecStr, 'success');
              checkBadges({
                correct: score.correct, streak: streak,
                typesUsed: Object.keys(challengeTypesUsed).length,
                equivSolved: _f.equivSolved || 0, simplifySolved: _f.simplifySolved || 0,
                convertCount: newCount, wallPairsFound: _f.wallPairsFound || 0,
                opsSolved: _f.opsSolved || 0, tabsVisited: Object.keys(tabsVisited).length,
                aiAsked: _f.aiAsked || 0
              });
            },
            className: 'w-full py-2 bg-teal-700 text-white font-bold rounded-lg text-sm hover:bg-teal-700 transition-all'
          }, '\u2705 Log This Conversion')
        ) : h(React.Fragment, null,
          // Decimal to fraction
          h('div', { className: 'bg-white rounded-xl border-2 border-teal-200 p-4 text-center' },
            h('label', { className: 'text-xs font-bold text-teal-600 block mb-2' }, 'Enter a decimal number:'),
            h('input', {
              type: 'text', value: convDecInput,
              'aria-label': 'Decimal number to convert',
              onChange: function(e) { upd({ convDecInput: e.target.value }); },
              placeholder: '0.75',
              className: 'w-32 text-center text-2xl font-bold border-b-3 border-teal-500 outline-none focus:ring-2 focus:ring-teal-400'
            })
          ),
          decFrac && h('div', { className: 'bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl border-2 border-teal-200 p-4 space-y-3' },
            h('div', { className: 'flex items-center gap-3 p-2 bg-white rounded-lg' },
              h('span', { className: 'text-xs font-bold text-teal-600 w-24' }, '\uD83C\uDF55 Fraction'),
              h('span', { className: 'text-lg font-bold text-teal-800' }, decFrac[0] + '/' + decFrac[1])
            ),
            h('div', { className: 'flex items-center gap-3 p-2 bg-white rounded-lg' },
              h('span', { className: 'text-xs font-bold text-purple-600 w-24' }, '\uD83D\uDCCA Percent'),
              h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-lg font-bold text-purple-800' }, (parsedDec * 100).toFixed(2) + '%')
            ),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'p-2 bg-white rounded-lg' },
              h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xs font-bold text-slate-500 block mb-1' }, 'Visual'),
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex justify-center' },
                drawPie(Math.min(decFrac[0], decFrac[1]), decFrac[1], 120, '#14b8a6')
              )
            )
          )
        ),

        // Benchmark fractions
        h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'border-t border-slate-200 pt-3' },
          h('button', { 'aria-label': 'Fraction',
            onClick: function() { sfxClick(); upd({ showBenchmarks: !showBenchmarks }); },
            className: 'text-xs font-bold text-teal-600 hover:text-teal-800 transition-colors'
          }, (showBenchmarks ? '\u25BC' : '\u25B6') + ' Benchmark Fractions Reference'),
          showBenchmarks && h('div', { className: 'mt-2 bg-white rounded-xl border p-3' },
            h('div', { className: 'grid grid-cols-3 gap-1 text-[10px] font-bold mb-1' },
              h('span', { className: 'text-slate-500' }, 'Fraction'),
              h('span', { className: 'text-slate-500' }, 'Decimal'),
              h('span', { className: 'text-slate-500' }, 'Percent')
            ),
            benchmarks.map(function(bm) {
              return h('div', { key: bm.frac, className: 'grid grid-cols-3 gap-1 text-xs py-0.5 border-t border-slate-100' },
                h('span', { className: 'font-bold text-teal-700' }, bm.frac),
                h('span', { className: 'text-blue-600' }, bm.dec),
                h('span', { className: 'text-purple-600' }, bm.pct)
              );
            })
          )
        )
      );
    };

    // ═══ TAB: FRACTION WALL ═══
    var renderFractionWall = function() {
      var wallDenoms = [1, 2, 3, 4, 5, 6, 8, 10, 12];
      var stripH = 32;
      var wallW = 400;
      var colors = ['#6366f1', '#3b82f6', '#06b6d4', '#14b8a6', '#22c55e', '#eab308', '#f97316', '#ef4444', '#ec4899'];

      var handleWallClick = function(num, den) {
        sfxClick();
        if (!wallCompareA) {
          upd({ wallCompareA: { n: num, d: den }, wallCompareB: null, wallHighlight: { n: num, d: den } });
        } else if (!wallCompareB) {
          var a = wallCompareA;
          upd({ wallCompareB: { n: num, d: den } });
          // Check if equivalent
          var sA = simplify(a.n, a.d);
          var sB = simplify(num, den);
          if (sA[0] === sB[0] && sA[1] === sB[1] && (a.n !== num || a.d !== den)) {
            sfxCorrect();
            var newPairs = (_f.wallPairsFound || 0) + 1;
            upd({ wallPairsFound: newPairs });
            addToast('\u2705 ' + a.n + '/' + a.d + ' = ' + num + '/' + den + ' — Equivalent!', 'success');
            awardXP('fractionWall', 10, 'equivalent pair');
            checkBadges({
              correct: score.correct, streak: streak,
              typesUsed: Object.keys(challengeTypesUsed).length,
              equivSolved: _f.equivSolved || 0, simplifySolved: _f.simplifySolved || 0,
              convertCount: _f.convertCount || 0, wallPairsFound: newPairs,
              opsSolved: _f.opsSolved || 0, tabsVisited: Object.keys(tabsVisited).length,
              aiAsked: _f.aiAsked || 0
            });
          } else if (a.n !== num || a.d !== den) {
            addToast(a.n + '/' + a.d + ' and ' + num + '/' + den + ' are not equivalent', 'info');
          }
          // Reset after a moment
          setTimeout(function() { upd({ wallCompareA: null, wallCompareB: null, wallHighlight: null }); }, 1500);
        } else {
          upd({ wallCompareA: { n: num, d: den }, wallCompareB: null, wallHighlight: { n: num, d: den } });
        }
      };

      var isHighlighted = function(num, den) {
        if (!wallHighlight) return false;
        var sH = simplify(wallHighlight.n, wallHighlight.d);
        var sC = simplify(num, den);
        return sH[0] === sC[0] && sH[1] === sC[1];
      };

      return h('div', { className: 'space-y-4' },
        h('div', { className: 'bg-indigo-50 rounded-xl p-3 border border-indigo-200' },
          h('p', { className: 'text-xs font-bold text-indigo-700' }, '\uD83E\uDDF1 Click any piece to highlight equivalent fractions. Click two pieces to check if they are equivalent!'),
          (_f.wallPairsFound || 0) > 0 && h('p', { className: 'text-xs text-indigo-600 mt-1' }, '\u2705 Equivalent pairs found: ' + (_f.wallPairsFound || 0))
        ),
        // The wall
        h('div', { className: 'bg-white rounded-xl border-2 border-indigo-200 p-3 overflow-x-auto' },
          h('svg', { viewBox: '0 0 ' + wallW + ' ' + (wallDenoms.length * (stripH + 2) + 10), width: '100%' },
            wallDenoms.map(function(den, rowIdx) {
              var pieces2 = [];
              var segW = (wallW - 40) / den;
              for (var i = 0; i < den; i++) {
                var num = i + 1;
                var hl = isHighlighted(num, den);
                var isSelected = (wallCompareA && wallCompareA.n === num && wallCompareA.d === den) ||
                                 (wallCompareB && wallCompareB.n === num && wallCompareB.d === den);
                pieces2.push(h('g', { key: rowIdx + '-' + i },
                  h('rect', {
                    x: 30 + i * segW, y: 5 + rowIdx * (stripH + 2),
                    width: segW - 1, height: stripH,
                    fill: hl ? '#fbbf24' : isSelected ? '#c084fc' : colors[rowIdx % colors.length],
                    stroke: hl ? '#d97706' : '#475569', strokeWidth: hl ? 2 : 0.5,
                    rx: 3,
                    className: 'cursor-pointer',
                    style: { opacity: hl ? 1 : 0.75, transition: 'all 0.2s' },
                    onClick: function() { handleWallClick(num, den); }
                  }),
                  segW > 25 && h('text', {
                    x: 30 + i * segW + segW / 2, y: 5 + rowIdx * (stripH + 2) + stripH / 2 + 4,
                    textAnchor: 'middle', fill: 'white',
                    style: { fontSize: Math.min(12, segW * 0.35) + 'px', fontWeight: 'bold', pointerEvents: 'none' }
                  }, num + '/' + den)
                ));
              }
              // Row label
              pieces2.push(h('text', {
                key: 'label-' + rowIdx, x: 14, y: 5 + rowIdx * (stripH + 2) + stripH / 2 + 4,
                textAnchor: 'middle', fill: '#64748b',
                style: { fontSize: '11px', fontWeight: 'bold' }
              }, '/' + den));
              return h('g', { key: 'row' + rowIdx }, pieces2);
            })
          )
        ),
        // Quick equivalent finder
        h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'bg-white rounded-xl border p-3' },
          h('p', { className: 'text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-2' }, '\uD83D\uDD0D Find Equivalents'),
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-2 flex-wrap' },
            [
              { n: 1, d: 2, l: '1/2' }, { n: 1, d: 3, l: '1/3' }, { n: 1, d: 4, l: '1/4' },
              { n: 2, d: 3, l: '2/3' }, { n: 3, d: 4, l: '3/4' }, { n: 1, d: 5, l: '1/5' },
              { n: 1, d: 6, l: '1/6' }, { n: 5, d: 6, l: '5/6' }
            ].map(function(f) {
              return h('button', { 'aria-label': 'Sfx Click',
                key: f.l,
                onClick: function() { sfxClick(); upd({ wallHighlight: { n: f.n, d: f.d }, wallCompareA: null, wallCompareB: null }); },
                className: 'px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-all'
              }, f.l);
            })
          ),
          wallHighlight && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'mt-2 text-xs text-indigo-600' },
            'Highlighted: all fractions equivalent to ' + wallHighlight.n + '/' + wallHighlight.d + ' (' + simplify(wallHighlight.n, wallHighlight.d).join('/') + ')'
          )
        ),
        // Reset
        h('button', { 'aria-label': 'Clear Highlights',
          onClick: function() { upd({ wallHighlight: null, wallCompareA: null, wallCompareB: null }); },
          className: 'text-xs font-bold text-slate-500 hover:text-slate-600 transition-colors'
        }, '\uD83D\uDD04 Clear Highlights')
      );
    };

    // ═══ AI TUTOR PANEL ═══
    var renderAITutor = function() {
      if (!showAITutor) return null;
      return h('div', { className: 'bg-gradient-to-br from-sky-50 to-blue-50 rounded-xl border-2 border-sky-200 p-4 space-y-3' },
        h('div', { className: 'flex items-center justify-between' },
          h('h4', { className: 'text-sm font-bold text-sky-800' }, '\uD83E\uDD16 AI Fraction Tutor'),
          h('button', { 'aria-label': 'Update setting',
            onClick: function() { upd({ showAITutor: false }); },
            className: 'text-sky-400 hover:text-sky-600 text-lg font-bold'
          }, '\u00D7')
        ),
        h('div', { className: 'flex gap-2' },
          h('input', {
            type: 'text', value: aiQuestion,
            onChange: function(e) { upd({ aiQuestion: e.target.value }); },
            onKeyDown: function(e) { if (e.key === 'Enter' && aiQuestion.trim()) askAITutor(); },
            placeholder: 'Ask me about fractions...',
            className: 'flex-1 px-3 py-2 border border-sky-300 rounded-lg text-sm'
          }),
          h('button', { 'aria-label': 'Ask A I Tutor',
            onClick: askAITutor,
            disabled: aiLoading || !aiQuestion.trim(),
            className: 'px-4 py-2 bg-sky-600 text-white font-bold rounded-lg text-sm hover:bg-sky-700 disabled:opacity-50 transition-all'
          }, aiLoading ? '\u23F3' : 'Ask')
        ),
        // Quick questions
        h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex flex-wrap gap-1.5' },
          ['How do I add fractions?', 'What are equivalent fractions?', 'How do I simplify?', 'What is a mixed number?'].map(function(q) {
            return h('button', { 'aria-label': 'Ask question',
              key: q,
              onClick: function() { upd({ aiQuestion: q }); },
              className: 'px-2 py-1 text-[10px] font-bold bg-sky-100 text-sky-700 rounded-full hover:bg-sky-200 transition-all'
            }, q);
          })
        ),
        aiResponse && h('div', { className: 'bg-white rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap border border-sky-100' }, aiResponse)
      );
    };

    // ═══ BADGES PANEL ═══
    var renderBadges = function() {
      var earned = Object.keys(badges).length;
      if (earned === 0) return null;
      return h('div', { className: 'bg-amber-50 rounded-xl border border-amber-200 p-3' },
        h('p', { className: 'text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-2' },
          '\uD83C\uDFC5 Badges (' + earned + '/' + BADGES.length + ')'
        ),
        h('div', { className: 'flex flex-wrap gap-1.5' },
          BADGES.map(function(b) {
            var has = badges[b.id];
            return h('div', {
              key: b.id,
              title: b.name + ': ' + b.desc,
              className: 'w-8 h-8 rounded-lg flex items-center justify-center text-base ' +
                (has ? 'bg-amber-200 shadow-sm' : 'bg-slate-100 opacity-30'),
              style: { filter: has ? 'none' : 'grayscale(1)' }
            }, b.icon);
          })
        )
      );
    };

    // ══════════ MAIN RENDER ══════════
    var tabs = [
      { id: 'practice', icon: '\uD83C\uDF55', label: 'Practice' },
      { id: 'compare', icon: '\uD83D\uDD0D', label: 'Compare' },
      { id: 'operations', icon: '\u2795', label: 'Operations' },
      { id: 'equivalents', icon: '\uD83D\uDD17', label: 'Equivalents' },
      { id: 'converter', icon: '\uD83D\uDD04', label: 'Converter' },
      { id: 'wall', icon: '\uD83E\uDDF1', label: 'Wall' }
    ];

    return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200' },
      // Header
      h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex items-center gap-3 mb-2' },
        h('button', { onClick: function() { setStemLabTool(null); }, className: 'p-1.5 hover:bg-slate-100 rounded-lg', 'aria-label': 'Back' },
          h(ArrowLeft, { size: 18, className: 'text-slate-500' })),
        h('h3', { className: 'text-lg font-bold text-rose-800' }, '\uD83C\uDF55 Fraction Lab'),
        // Stats
        h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'ml-auto flex items-center gap-3' },
          streak > 0 && h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xs font-bold text-orange-600' }, '\uD83D\uDD25 ' + streak),
          bestStreak > 0 && h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-[10px] text-slate-500' }, 'Best: ' + bestStreak),
          h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xs font-bold text-rose-600' }, score.correct + '/' + score.total)
        )
      ),

      // Tab bar
      h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-1 bg-rose-50 rounded-xl p-1 border border-rose-200', role: 'tablist', 'aria-label': 'Fraction Lab sections' },
        tabs.map(function(t2) {
          return h('button', { 'aria-label': 'Sfx Click',
            key: t2.id,
            onClick: function() { sfxClick(); upd({ tab: t2.id }); trackTab(t2.id); },
            role: 'tab', 'aria-selected': tab === t2.id,
            className: 'flex-1 py-2 px-1 rounded-lg text-[10px] sm:text-xs font-bold transition-all ' +
              (tab === t2.id ? 'bg-white text-rose-800 shadow-sm' : 'text-rose-500 hover:text-rose-700')
          }, t2.icon + ' ' + t2.label);
        })
      ),

      // Active tab content
      tab === 'practice' && renderPractice(),
      tab === 'compare' && renderCompare(),
      tab === 'operations' && renderOperations(),
      tab === 'equivalents' && renderEquivalents(),
      tab === 'converter' && renderConverter(),
      tab === 'wall' && renderFractionWall(),

      // Challenge section (visible in practice tab)
      tab === 'practice' && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'bg-rose-50 rounded-xl p-4 border border-rose-200 space-y-3' },
        h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex items-center justify-between' },
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex items-center gap-2' },
            h('h4', { className: 'text-sm font-bold text-rose-800' }, '\uD83C\uDFAF Fraction Challenge'),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-0.5 ml-2' },
              ['easy', 'medium', 'hard'].map(function(d) {
                return h('button', { 'aria-label': 'Sfx Click',
                  key: d,
                  onClick: function() { sfxClick(); upd({ difficulty: d }); },
                  className: 'text-[11px] font-bold px-1.5 py-0.5 rounded-full transition-all ' +
                    (difficulty === d
                      ? (d === 'easy' ? 'bg-green-700 text-white' : d === 'hard' ? 'bg-red-700 text-white' : 'bg-rose-700 text-white')
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200')
                }, d);
              })
            )
          ),
          // Challenge type counter
          h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-[11px] text-slate-500' }, Object.keys(challengeTypesUsed).length + '/7 types')
        ),
        !challenge
          ? h('button', { 'aria-label': 'Generate Challenge',
              onClick: generateChallenge,
              className: 'w-full py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold rounded-xl text-sm hover:from-rose-600 hover:to-pink-600 transition-all shadow-md'
            }, '\uD83C\uDFB2 Generate Challenge')
          : h('div', { className: 'space-y-2' },
              h('div', { className: 'flex items-center gap-2' },
                h('span', { className: 'text-[11px] font-bold uppercase text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full' }, challenge.type),
                streak > 0 && h('span', { className: 'text-[11px] font-bold text-orange-500' }, '\uD83D\uDD25 ' + streak)
              ),
              h('p', { className: 'text-sm font-bold text-rose-800' }, challenge.question),
              h('div', { className: 'flex gap-2' },
                h('input', {
                  type: 'number', value: answer,
                  onChange: function(e) { upd({ answer: e.target.value }); },
                  onKeyDown: function(e) { if (e.key === 'Enter' && answer) checkChallenge(); },
                  placeholder: 'Your answer...',
                  className: 'flex-1 px-3 py-2 border border-rose-300 rounded-lg text-sm font-mono'
                }),
                h('button', { 'aria-label': 'Check',
                  onClick: checkChallenge,
                  className: 'px-4 py-2 bg-rose-600 text-white font-bold rounded-lg text-sm hover:bg-rose-700'
                }, 'Check')
              ),
              feedback && h('p', { className: 'text-sm font-bold ' + (feedback.correct ? 'text-green-600' : 'text-red-600') }, feedback.msg),
              feedback && h('button', { 'aria-label': 'Next Challenge',
                onClick: generateChallenge,
                className: 'text-xs text-rose-600 font-bold hover:underline'
              }, '\u27A1\uFE0F Next Challenge')
            )
      ),

      // Badges
      renderBadges(),

      // AI Tutor toggle + panel
      h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-2' },
        !showAITutor && h('button', { 'aria-label': 'AI Tutor',
          onClick: function() { sfxClick(); upd({ showAITutor: true }); },
          className: 'px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition-all'
        }, '\uD83E\uDD16 AI Tutor'),
        h('button', { 'aria-label': 'Benchmarks',
          onClick: function() { sfxClick(); upd({ showBenchmarks: !showBenchmarks }); },
          className: 'px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 transition-all'
        }, '\uD83D\uDCCB Benchmarks')
      ),
      renderAITutor(),

      // Benchmarks panel (when not on converter tab where it's inline)
      showBenchmarks && tab !== 'converter' && h('div', { className: 'bg-white rounded-xl border p-3' },
        h('p', { className: 'text-[10px] font-bold text-teal-600 uppercase tracking-wider mb-2' }, '\uD83D\uDCCB Benchmark Fractions'),
        h('div', { className: 'grid grid-cols-4 gap-1 text-[10px] font-bold mb-1' },
          h('span', { className: 'text-slate-500' }, 'Fraction'),
          h('span', { className: 'text-slate-500' }, 'Decimal'),
          h('span', { className: 'text-slate-500' }, 'Percent'),
          h('span', { className: 'text-slate-500' }, 'Visual')
        ),
        benchmarks.slice(0, 10).map(function(bm) {
          var parts = bm.frac.split('/');
          var pctVal = parseInt(parts[0]) / parseInt(parts[1]) * 100;
          return h('div', { key: bm.frac, className: 'grid grid-cols-4 gap-1 text-xs py-0.5 border-t border-slate-100 items-center' },
            h('span', { className: 'font-bold text-teal-700' }, bm.frac),
            h('span', { className: 'text-blue-600' }, bm.dec),
            h('span', { className: 'text-purple-600' }, bm.pct),
            h('div', { className: 'h-2 bg-slate-200 rounded-full overflow-hidden' },
              h('div', { style: { width: Math.min(pctVal, 100) + '%', backgroundColor: '#14b8a6' }, className: 'h-full rounded-full' })
            )
          );
        })
      ),

      // Keyboard shortcuts hint
      h('div', { className: 'text-center text-[11px] text-slate-500 mt-2' },
        '\u2328\uFE0F 1-6: tabs | N: new challenge | B: benchmarks | P: pie/bar | ?: AI tutor'
      )
    );
  }
})();
