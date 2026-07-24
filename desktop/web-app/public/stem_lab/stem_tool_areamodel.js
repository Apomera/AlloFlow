// ═══════════════════════════════════════════
// stem_tool_areamodel.js — Area Model Plugin (Enhanced v3)
// 4 tabs: Basic Grid, Distributive, Partial Products, Word Problems
// + sound effects (mutable), 14 badges, AI tutor, streak tracking,
//   commutative toggle, skip-count overlay (mult as repeated addition),
//   word-problem mode using real-world contexts (garden, parking lot, etc.),
//   atmospheric backgrounds, smooth cell transitions, reset button,
//   keyboard shortcuts
// ═══════════════════════════════════════════

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
    if (document.getElementById('allo-live-areamodel')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-areamodel';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  // Area-model v3: atmospheric backgrounds + smooth cell transitions
  (function() {
    if (document.getElementById('allo-areamodel-v3-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-areamodel-v3-css';
    st.textContent = [
      '@keyframes allo-am-cell-pulse { 0% { transform: scale(0.92); opacity: 0.5; } 100% { transform: scale(1); opacity: 1; } }',
      '@keyframes allo-am-pop { 0% { transform: scale(1); } 30% { transform: scale(1.1); } 100% { transform: scale(1); } }',
      '.allo-am-cell { transition: background-color 0.22s ease, border-color 0.22s ease, transform 0.18s ease; }',
      '.allo-am-cell-fill { animation: allo-am-cell-pulse 0.32s ease-out; }',
      '.allo-am-bg-basic        { background: radial-gradient(ellipse 1100px 480px at 50% -10%, rgba(217,119,6,0.10) 0%, rgba(217,119,6,0.04) 35%, rgba(255,255,255,0) 70%), linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); border-radius: 16px; padding: 10px; }',
      '.allo-am-bg-distributive { background: radial-gradient(ellipse 1100px 480px at 50% -10%, rgba(147,51,234,0.10) 0%, rgba(147,51,234,0.04) 35%, rgba(255,255,255,0) 70%), linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); border-radius: 16px; padding: 10px; }',
      '.allo-am-bg-multidigit   { background: radial-gradient(ellipse 1100px 480px at 50% -10%, rgba(8,145,178,0.10) 0%, rgba(8,145,178,0.04) 35%, rgba(255,255,255,0) 70%), linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); border-radius: 16px; padding: 10px; }',
      '.allo-am-bg-word         { background: radial-gradient(ellipse 1100px 480px at 50% -10%, rgba(16,185,129,0.10) 0%, rgba(16,185,129,0.04) 35%, rgba(255,255,255,0) 70%), linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); border-radius: 16px; padding: 10px; }',
      '@media (prefers-reduced-motion: reduce) { .allo-am-cell, .allo-am-cell-fill { transition: none !important; animation: none !important; } }'
    ].join('\n');
    document.head.appendChild(st);
  })();


  window.StemLab.registerTool('areamodel', {
    icon: '\uD83D\uDFE7', label: 'Area Model',
    desc: 'Visual multiplication with area model grids, distributive property, partial products, sound effects, and badges.',
    color: 'amber', category: 'math',
    questHooks: [
      { id: 'solve_5', label: 'Solve 5 area challenges', icon: '🟧', check: function(d) { return ((d.score && d.score.correct) || 0) >= 5; }, progress: function(d) { return ((d.score && d.score.correct) || 0) + '/5 solved'; } },
      { id: 'all_modes', label: 'Try challenges in all 4 modes', icon: '🌈', check: function(d) { return Object.keys(d.challengeTypesUsed || {}).length >= 4; }, progress: function(d) { return Object.keys(d.challengeTypesUsed || {}).length + '/4 modes'; } },
      { id: 'streak_5', label: 'Reach a streak of 5', icon: '🔥', check: function(d) { return (d.bestStreak || 0) >= 5; }, progress: function(d) { return 'best ' + (d.bestStreak || 0) + '/5'; } },
      { id: 'word_3', label: 'Solve 3 word problems', icon: '📝', check: function(d) { return (d.wordSolved || 0) >= 3; }, progress: function(d) { return (d.wordSolved || 0) + '/3 word problems'; } }
    ],
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var setStemLabTool = ctx.setStemLabTool;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;
      var announceToSR = ctx.announceToSR;
      var a11yClick = ctx.a11yClick;
      // honor the 2nd-arg English fallback (ctx.t is single-arg & ignores it; see dev-tools/check_i18n_fallback.cjs)
      var t = function (k, fb) { var v; try { v = (typeof ctx.t === 'function') ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      var isContrast = !!ctx.isContrast;
      var isDark = !!ctx.isDark || isContrast;

      // ── State via labToolData ──
      var ld = ctx.toolData || {};
      var _a = ld._areamodel || {};
      var upd = function(obj) {
        if (typeof ctx.setToolData === 'function') {
          ctx.setToolData(function(prev) {
            var am = Object.assign({}, (prev && prev._areamodel) || {}, obj);
            return Object.assign({}, prev, { _areamodel: am });
          });
        }
      };

      // ═══ SOUND EFFECTS ═══
      var _audioCtx = null;
      var getAudio = function() {
        if (!_audioCtx) { try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} }
        return _audioCtx;
      };
      var playTone = function(freq, dur, type, vol) {
        if (_a.muted) return;
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
        } catch(e) {}
      };
      var sfxCorrect = function() { playTone(523, 0.1, 'sine', 0.12); setTimeout(function() { playTone(659, 0.1, 'sine', 0.12); }, 80); setTimeout(function() { playTone(784, 0.15, 'sine', 0.14); }, 160); };
      var sfxWrong = function() { playTone(220, 0.25, 'sawtooth', 0.08); };
      var sfxBadge = function() { playTone(523, 0.08, 'sine', 0.1); setTimeout(function() { playTone(659, 0.08, 'sine', 0.1); }, 70); setTimeout(function() { playTone(784, 0.08, 'sine', 0.1); }, 140); setTimeout(function() { playTone(1047, 0.2, 'sine', 0.14); }, 210); };
      var sfxClick = function() { playTone(880, 0.05, 'sine', 0.06); };
      var sfxStreak = function() { playTone(440, 0.06, 'sine', 0.1); setTimeout(function() { playTone(554, 0.06, 'sine', 0.1); }, 50); setTimeout(function() { playTone(659, 0.08, 'sine', 0.1); }, 100); setTimeout(function() { playTone(880, 0.15, 'sine', 0.12); }, 150); };
      var sfxNewChallenge = function() { playTone(392, 0.08, 'triangle', 0.08); setTimeout(function() { playTone(523, 0.12, 'triangle', 0.1); }, 80); };

      // ── State defaults ──
      var dims = _a.dims || { rows: 4, cols: 6 };
      var highlight = _a.highlight || { rows: 0, cols: 0 };
      var challenge = _a.challenge || null;
      var answer = _a.answer || '';
      var feedback = _a.feedback || null;
      // Grade-aware default difficulty (explicit user choice always wins):
      // K-2 easy, 3-5 medium, 6-8+ hard; unknown grade keeps the gentle default.
      var _gl = (ctx.gradeLevel || '').toLowerCase();
      var _gradeDefaultDiff = /6th|7th|8th|9th|10|11|12|high/.test(_gl) ? 'hard' : /3rd|4th|5th/.test(_gl) ? 'medium' : 'easy';
      var difficulty = _a.difficulty || _gradeDefaultDiff;
      var score = _a.score || { correct: 0, total: 0 };
      var streak = _a.streak || 0;
      var bestStreak = _a.bestStreak || 0;
      var badges = _a.badges || {};
      var viewMode = _a.viewMode || 'basic';
      var swapped = _a.swapped || false;
      var splitAt = _a.splitAt || Math.min(5, Math.floor(dims.cols / 2));
      var multiDims = _a.multiDims || { a: 23, b: 14 };

      // AI Tutor state
      var showAITutor = _a.showAITutor || false;
      var aiResponse = _a.aiResponse || '';
      var aiLoading = _a.aiLoading || false;
      var aiQuestion = _a.aiQuestion || '';

      // Challenge tracking
      var challengeTypesUsed = _a.challengeTypesUsed || {};
      var basicSolved = _a.basicSolved || 0;
      var distSolved = _a.distSolved || 0;
      var multiSolved = _a.multiSolved || 0;
      var wordSolved = _a.wordSolved || 0;
      var fracSolved = _a.fracSolved || 0;
      var fracNums = _a.fracNums || { an: 1, ad: 2, bn: 1, bd: 3 };

      // v3 additions
      var muted = _a.muted || false;                                    // global mute (read by playTone)
      var showSkipCount = _a.showSkipCount !== false;                   // skip-count overlay on basic grid (default ON)
      var wordCtxIdx = _a.wordCtxIdx != null ? _a.wordCtxIdx : 0;       // word problem context index
      var wordDims = _a.wordDims || { a: 4, b: 6 };                     // word problem factors

      // Effective dims
      var rows = swapped ? dims.cols : dims.rows;
      var cols = swapped ? dims.rows : dims.cols;

      var randInt = function(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; };
      var pick = function(arr) { return arr[Math.floor(Math.random() * arr.length)]; };
      var gcd = function(a, b) { return b === 0 ? a : gcd(b, a % b); };

      // ═══ WORD PROBLEM CONTEXTS ═══
      var WORD_CONTEXTS = [
        'A garden has {a} rows with {b} plants in each row. How many plants total?',
        'A parking lot has {a} rows with {b} cars in each row. How many cars?',
        'A classroom has {a} rows of desks with {b} desks in each row. How many desks?',
        'A baker made {a} trays with {b} cookies on each tray. How many cookies?',
        'A wall has {a} rows of tiles with {b} tiles across. How many tiles?',
        'A farmer plants {b} seeds in each of {a} rows. How many seeds?',
        'An orchard has {a} rows of {b} trees. How many trees?',
        'A bookstore displays {b} books on each of {a} shelves. How many books?',
        'A theater has {a} rows with {b} seats in each row. How many seats?',
        'A chocolate box has {a} rows with {b} chocolates each. How many chocolates?'
      ];

      // ═══ BADGE SYSTEM ═══
      var BADGES = [
        { id: 'firstArea', icon: '\uD83D\uDFE7', name: t('stem.areamodel.first_area', 'First Area'), desc: t('stem.areamodel.solve_your_first_challenge', 'Solve your first challenge'), check: function(u) { return u.correct >= 1; } },
        { id: 'streak3', icon: '\uD83D\uDD25', name: t('stem.areamodel.hot_streak', 'Hot Streak'), desc: t('stem.areamodel.get_a_streak_of_3', 'Get a streak of 3'), check: function(u) { return u.streak >= 3; } },
        { id: 'streak5', icon: '\u26A1', name: t('stem.areamodel.lightning', 'Lightning'), desc: t('stem.areamodel.get_a_streak_of_5', 'Get a streak of 5'), check: function(u) { return u.streak >= 5; } },
        { id: 'streak10', icon: '\uD83C\uDF1F', name: t('stem.areamodel.area_master', 'Area Master'), desc: t('stem.areamodel.get_a_streak_of_10', 'Get a streak of 10'), check: function(u) { return u.streak >= 10; } },
        { id: 'score10', icon: '\uD83C\uDFC5', name: t('stem.areamodel.solid_ten', 'Solid Ten'), desc: t('stem.areamodel.score_10_correct', 'Score 10 correct'), check: function(u) { return u.correct >= 10; } },
        { id: 'score25', icon: '\uD83C\uDFC6', name: 'Twenty-Five', desc: t('stem.areamodel.score_25_correct', 'Score 25 correct'), check: function(u) { return u.correct >= 25; } },
        { id: 'basicPro', icon: '\uD83D\uDFE9', name: t('stem.areamodel.grid_pro', 'Grid Pro'), desc: t('stem.areamodel.solve_5_basic_grid_challenges', 'Solve 5 basic grid challenges'), check: function(u) { return u.basicSolved >= 5; } },
        { id: 'distPro', icon: '\u2702\uFE0F', name: t('stem.areamodel.distributor', 'Distributor'), desc: t('stem.areamodel.solve_5_distributive_challenges', 'Solve 5 distributive challenges'), check: function(u) { return u.distSolved >= 5; } },
        { id: 'multiPro', icon: '\uD83D\uDCCA', name: t('stem.areamodel.partial_pro', 'Partial Pro'), desc: t('stem.areamodel.solve_5_multi_digit_challenges', 'Solve 5 multi-digit challenges'), check: function(u) { return u.multiSolved >= 5; } },
        { id: 'allModes', icon: '\uD83C\uDF08', name: t('stem.areamodel.well_rounded', 'Well Rounded'), desc: t('stem.areamodel.solve_challenges_in_all_4_modes', 'Solve challenges in all 4 modes'), check: function(u) { return u.typesUsed >= 4; } },
        { id: 'commutative', icon: '\u21C4', name: t('stem.areamodel.commuter', 'Commuter'), desc: t('stem.areamodel.use_the_commutative_toggle', 'Use the commutative toggle'), check: function(u) { return u.usedCommutative; } },
        { id: 'aiLearner', icon: '\uD83E\uDD16', name: t('stem.areamodel.ai_learner', 'AI Learner'), desc: t('stem.areamodel.ask_the_ai_tutor_a_question', 'Ask the AI tutor a question'), check: function(u) { return u.aiAsked >= 1; } },
        { id: 'wordPro', icon: '\uD83D\uDCDD', name: t('stem.areamodel.word_wizard', 'Word Wizard'), desc: t('stem.areamodel.solve_5_word_problems', 'Solve 5 word problems'), check: function(u) { return u.wordSolved >= 5; } },
        { id: 'fracPro', icon: '\uD83C\uDF55', name: t('stem.areamodel.fraction_fan', 'Fraction Fan'), desc: t('stem.areamodel.solve_3_fraction_challenges', 'Solve 3 fraction challenges'), check: function(u) { return u.fracSolved >= 3; } }
      ];

      var checkBadges = function(updates) {
        var newBadges = Object.assign({}, badges);
        var awarded = false;
        BADGES.forEach(function(b) {
          if (!newBadges[b.id] && b.check(updates)) {
            newBadges[b.id] = true;
            awarded = true;
            sfxBadge();
            addToast(b.icon + ' Badge: ' + b.name + ' \u2014 ' + b.desc, 'success');
            awardXP('areamodelBadge', 15, b.name);
          }
        });
        if (awarded) upd({ badges: newBadges });
      };

      var getBadgeUpdates = function(extraStreak, extraCorrect) {
        return {
          correct: score.correct + (extraCorrect || 0),
          streak: extraStreak != null ? extraStreak : streak,
          typesUsed: Object.keys(challengeTypesUsed).length,
          basicSolved: basicSolved, distSolved: distSolved, multiSolved: multiSolved,
          usedCommutative: _a.usedCommutative || false,
          aiAsked: _a.aiAsked || 0
        };
      };

      // ═══ GENERATE CHALLENGE ═══
      var genChallenge = function(mode) {
        mode = mode || viewMode;
        sfxNewChallenge();
        var newTypes = Object.assign({}, challengeTypesUsed);
        newTypes[mode] = true;

        if (mode === 'basic') {
          var max = difficulty === 'easy' ? 5 : difficulty === 'hard' ? 12 : 9;
          var a = randInt(2, max);
          var b = randInt(2, max);
          upd({
            viewMode: 'basic', dims: { rows: a, cols: b },
            highlight: { rows: 0, cols: 0 },
            challenge: { a: a, b: b, answer: a * b, question: 'What is ' + a + ' \u00d7 ' + b + '? Count the squares!', mode: 'basic' },
            answer: '', feedback: null, challengeTypesUsed: newTypes
          });
        } else if (mode === 'distributive') {
          var max2 = difficulty === 'easy' ? 8 : difficulty === 'hard' ? 12 : 10;
          var r = randInt(2, max2);
          var c = randInt(4, max2);
          var split = randInt(1, c - 1);
          upd({
            viewMode: 'distributive', dims: { rows: r, cols: c }, splitAt: split,
            challenge: { a: r, b: c, split: split, answer: r * c, question: 'Use distributive property: ' + r + ' \u00d7 ' + c + ' = ' + r + ' \u00d7 ' + split + ' + ' + r + ' \u00d7 ' + (c - split) + ' = ?', mode: 'distributive' },
            answer: '', feedback: null, challengeTypesUsed: newTypes
          });
        } else if (mode === 'multidigit') {
          var a2 = randInt(11, difficulty === 'hard' ? 99 : 49);
          var b2 = randInt(11, difficulty === 'hard' ? 99 : 49);
          upd({
            viewMode: 'multidigit', multiDims: { a: a2, b: b2 },
            challenge: { a: a2, b: b2, answer: a2 * b2, question: 'Use partial products to find ' + a2 + ' \u00d7 ' + b2 + ' = ?', mode: 'multidigit' },
            answer: '', feedback: null, challengeTypesUsed: newTypes
          });
        }
      };

      // ═══ MISCONCEPTION-AWARE FEEDBACK ═══
      // A wrong answer usually reveals WHICH mix-up happened (added instead of
      // multiplied, found the perimeter, took only one piece of the split,
      // skipped the cross partial-products, off by one row...). Name that exact
      // mistake instead of just revealing the product — the error becomes the lesson.
      var diagnoseAreaError = function(ch, ans) {
        var a = ch.a, b = ch.b;
        if (isNaN(ans)) return 'Type your answer as a number first — count the squares in the model.';
        if (ans === a + b) return 'You ADDED ' + a + ' + ' + b + ' = ' + (a + b) + '. But the model shows ' + a + ' rows with ' + b + ' squares in EACH row. Multiplication counts them all: ' + a + ' × ' + b + ' = ' + ch.answer + '.';
        if (ans === 2 * (a + b)) return 'That is the PERIMETER — the fence around the rectangle. Area counts the squares INSIDE it: ' + a + ' rows × ' + b + ' columns = ' + ch.answer + '.';
        if (ch.mode === 'distributive' && ch.split != null && (ans === a * ch.split || ans === a * (b - ch.split))) return 'That is only ONE piece of the split! The rectangle was cut into ' + a + '×' + ch.split + ' and ' + a + '×' + (b - ch.split) + '. Add both pieces: ' + (a * ch.split) + ' + ' + (a * (b - ch.split)) + ' = ' + ch.answer + '.';
        if (ch.mode === 'multidigit') {
          var tA = Math.floor(a / 10) * 10, oA = a % 10, tB = Math.floor(b / 10) * 10, oB = b % 10;
          if (ans === tA * tB + oA * oB && oA && oB) return 'You multiplied tens×tens (' + (tA * tB) + ') and ones×ones (' + (oA * oB) + ') but skipped the two CROSS pieces: ' + tA + '×' + oB + ' = ' + (tA * oB) + ' and ' + oA + '×' + tB + ' = ' + (oA * tB) + '. All four boxes together make ' + ch.answer + '.';
          if (ans === tA * tB) return 'That is just the biggest box (tens × tens). The area model has FOUR boxes — add the other three partial products to reach ' + ch.answer + '.';
        }
        if (ans === a * (b - 1) || ans === (a - 1) * b) return 'So close — that is exactly one row or column SHORT. Recount: ' + a + ' rows, each with ' + b + ' squares → ' + ch.answer + '.';
        if (ans === a * (b + 1) || ans === (a + 1) * b) return 'So close — that is one EXTRA row or column. The model has exactly ' + a + ' rows of ' + b + ' → ' + ch.answer + '.';
        return 'Think of it as repeated addition: one row has ' + b + ' squares, and there are ' + a + ' rows — that is ' + b + ' added ' + a + ' times = ' + ch.answer + '.';
      };

      // ═══ CHECK CHALLENGE ═══
      var checkChallenge = function() {
        if (!challenge) return;
        var ans = parseInt(answer);
        var ok = ans === challenge.answer;
        var newStreak = ok ? streak + 1 : 0;
        var newBest = Math.max(bestStreak, newStreak);
        var newCorrect = score.correct + (ok ? 1 : 0);
        var newBasic = basicSolved + (ok && challenge.mode === 'basic' ? 1 : 0);
        var newDist = distSolved + (ok && challenge.mode === 'distributive' ? 1 : 0);
        var newMulti = multiSolved + (ok && challenge.mode === 'multidigit' ? 1 : 0);
        var newWord = wordSolved + (ok && challenge.mode === 'word' ? 1 : 0);

        if (ok) {
          sfxCorrect();
          if (newStreak === 3 || newStreak === 5 || newStreak === 10) sfxStreak();
          announceToSR('Correct!');
        } else {
          sfxWrong();
          announceToSR('Incorrect. ' + diagnoseAreaError(challenge, ans));
        }

        upd({
          feedback: ok
            ? { correct: true, msg: '\u2705 Correct! ' + challenge.a + ' \u00d7 ' + challenge.b + ' = ' + challenge.answer }
            : { correct: false, msg: '\u274C ' + diagnoseAreaError(challenge, ans) },
          score: { correct: newCorrect, total: score.total + 1 },
          streak: newStreak, bestStreak: newBest,
          basicSolved: newBasic, distSolved: newDist, multiSolved: newMulti, wordSolved: newWord
        });
        if (ok) awardXP('areamodel', 5, 'area model');

        checkBadges({
          correct: newCorrect, streak: newStreak,
          typesUsed: Object.keys(challengeTypesUsed).length,
          basicSolved: newBasic, distSolved: newDist, multiSolved: newMulti, wordSolved: newWord,
          usedCommutative: _a.usedCommutative || false,
          aiAsked: _a.aiAsked || 0
        });
      };

      // ═══ AI TUTOR ═══
      // Request-ID guard: prevents stale tutor responses from overwriting
      // newer context if the student switches tab / dimensions / question
      // while a fetch is mid-flight.
      var askAITutor = function() {
        if (!aiQuestion.trim()) return;
        window.__areamodelAiReqId = (window.__areamodelAiReqId || 0) + 1;
        var thisReqId = window.__areamodelAiReqId;
        upd({ aiLoading: true, aiResponse: '' });
        var prompt = 'You are a friendly math tutor helping a student learn multiplication using area models. ' +
          'They are on the "' + viewMode + '" tab working with ' + rows + ' rows and ' + cols + ' columns. ' +
          'Their question: "' + aiQuestion + '"\n\n' +
          'Explain clearly with examples. Keep it under 150 words.';
        ctx.callGemini(prompt, false, false, 0.7).then(function(resp) {
          if (thisReqId !== window.__areamodelAiReqId) return;
          upd({ aiResponse: resp, aiLoading: false, aiAsked: (_a.aiAsked || 0) + 1 });
          checkBadges(Object.assign(getBadgeUpdates(), { aiAsked: (_a.aiAsked || 0) + 1 }));
        }).catch(function() {
          if (thisReqId !== window.__areamodelAiReqId) return;
          upd({ aiResponse: 'Sorry, I could not connect to the AI tutor right now.', aiLoading: false });
        });
      };

      // ═══ KEYBOARD SHORTCUTS (non-hook: setTimeout to avoid conditional hook) ═══
      if (!window._areaModelKbHandler) window._areaModelKbHandler = null;
      setTimeout(function() {
        if (window._areaModelKbHandler) {
          window.removeEventListener('keydown', window._areaModelKbHandler);
        }
        window._areaModelKbHandler = function(e) {
          if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
          if (e.key === 'b' || e.key === 'B') { sfxClick(); upd({ viewMode: 'basic' }); }
          else if (e.key === 'd' || e.key === 'D') { sfxClick(); upd({ viewMode: 'distributive' }); }
          else if (e.key === 'p' || e.key === 'P') { sfxClick(); upd({ viewMode: 'multidigit' }); }
          else if (e.key === 'w' || e.key === 'W') { sfxClick(); upd({ viewMode: 'word' }); }
          else if (e.key === 'n' || e.key === 'N') { genChallenge(viewMode); }
          else if (e.key === 'c' || e.key === 'C') {
            sfxClick();
            upd({ swapped: !swapped, usedCommutative: true });
            checkBadges(Object.assign(getBadgeUpdates(), { usedCommutative: true }));
          }
          else if (e.key === '?' || e.key === '/') { upd({ showAITutor: !showAITutor }); }
        };
        window.addEventListener('keydown', window._areaModelKbHandler);
      }, 0);

      // ═══ VIEW: BASIC ═══
      var renderBasicGrid = function() {
        var cells = [];
        for (var i = 0; i < rows * cols; i++) {
          var r = Math.floor(i / cols);
          var c = i % cols;
          var isHigh = r < highlight.rows && c < highlight.cols;
          (function(ri, ci) {
            var selectCell = function() {
              sfxClick();
              upd({ highlight: { rows: ri + 1, cols: ci + 1 } });
            };
            cells.push(h('div', {
              key: i,
              role: 'button',
              tabIndex: 0,
              'aria-label': 'Highlight ' + (ri + 1) + ' rows by ' + (ci + 1) + ' columns',
              onClick: selectCell,
              onKeyDown: function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  selectCell();
                }
              },
              className: 'allo-am-cell aspect-square rounded-sm border cursor-pointer hover:scale-110 ' +
                (isHigh ? 'bg-amber-400 border-amber-500 shadow-sm allo-am-cell-fill' : (isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-600' : 'bg-amber-100 border-amber-200 hover:bg-amber-200'))
            }));
          })(r, c);
        }
        return h('div', { className: 'bg-white rounded-xl border-2 border-amber-200 p-4' },
          // Skip-count overlay header (column scale + toggle)
          h('div', { className: 'flex flex-wrap items-center gap-2 mb-2' },
            h('label', { className: 'text-[11px] font-bold text-amber-800 flex items-center gap-1 cursor-pointer' },
              h('input', { type: 'checkbox', checked: showSkipCount,
                onChange: function() { sfxClick(); upd({ showSkipCount: !showSkipCount }); }
              }),
              t('stem.areamodel.skip_count_overlay_multiplication_as_r', '🔢 Skip-count overlay (multiplication as repeated addition)')
            )
          ),

          // Side-by-side: row-totals column + grid
          h('div', { className: 'flex items-start gap-2 justify-center' },
            // Row-total column (cumulative skip count down the rows)
            showSkipCount && h('div', {
              className: 'flex flex-col gap-1',
              'aria-hidden': 'false',
              style: { fontVariantNumeric: 'tabular-nums' }
            },
              h('div', { className: 'text-[11px] font-bold text-amber-700 text-right pr-1 py-0.5' }, 'total'),
              Array.from({ length: rows }, function(_, ri) {
                var runningTotal = (ri + 1) * cols;
                var stepLabel = '+' + cols;
                var isInHL = ri < highlight.rows;
                return h('div', {
                  key: 'rt-' + ri,
                  className: 'rounded text-xs font-bold flex flex-col items-center justify-center px-2 ' +
                    (isInHL ? 'bg-orange-100 text-orange-800 border border-orange-300' : 'bg-amber-50 text-amber-700 border border-amber-100'),
                  style: { minWidth: 48, height: ((cols <= 6 ? Math.min(cols * 52, 340) : cols <= 9 ? cols * 38 : cols * 32) - (cols - 1) * 4) / cols }
                },
                  h('span', { className: 'text-[10px] text-amber-500 leading-none' }, ri === 0 ? cols : stepLabel),
                  h('span', { className: 'text-base leading-tight' }, runningTotal)
                );
              })
            ),
            // Row labels (1..rows) — paired with grid rows
            h('div', { className: 'flex flex-col gap-1 self-stretch', 'aria-hidden': 'true' },
              h('div', { className: 'text-[11px] font-bold text-amber-600 py-0.5 text-center', style: { width: 18 } }, 'r'),
              Array.from({ length: rows }, function(_, ri) {
                var isInHL = ri < highlight.rows;
                return h('div', {
                  key: 'rl-' + ri,
                  className: 'rounded flex items-center justify-center text-xs font-bold ' +
                    (isInHL ? 'bg-amber-200 text-amber-900' : 'bg-amber-50 text-amber-500'),
                  style: { width: 18, height: ((cols <= 6 ? Math.min(cols * 52, 340) : cols <= 9 ? cols * 38 : cols * 32) - (cols - 1) * 4) / cols }
                }, ri + 1);
              })
            ),
            // Grid with column-label header
            h('div', { className: 'flex flex-col gap-1 flex-shrink-0' },
              // Column labels (1..cols)
              h('div', {
                className: 'grid gap-1',
                'aria-hidden': 'true',
                style: (function() {
                  var w = (cols <= 6 ? Math.min(cols * 52, 340) : cols <= 9 ? cols * 38 : cols * 32);
                  return { gridTemplateColumns: 'repeat(' + cols + ', minmax(0, 1fr))', width: w + 'px', maxWidth: '100%' };
                })()
              },
                Array.from({ length: cols }, function(_, ci) {
                  var isInHL = ci < highlight.cols;
                  return h('div', {
                    key: 'cl-' + ci,
                    className: 'text-center text-[11px] font-bold py-0.5 rounded ' +
                      (isInHL ? 'bg-amber-200 text-amber-900' : 'text-amber-500')
                  }, ci + 1);
                })
              ),
              h('div', {
                className: 'grid gap-1',
                style: (function() {
                  var w = (cols <= 6 ? Math.min(cols * 52, 340) : cols <= 9 ? cols * 38 : cols * 32);
                  return {
                    gridTemplateColumns: 'repeat(' + cols + ', minmax(0, 1fr))',
                    width: w + 'px',
                    maxWidth: '100%'
                  };
                })()
              }, cells),
              // Highlight dimension caption shown when student has selected a sub-region
              (highlight.rows > 0 && highlight.cols > 0) && h('div', {
                className: 'text-center text-[11px] font-bold text-amber-700 mt-1'
              },
                'Highlighted: ', h('span', { className: 'text-amber-900' }, highlight.rows + ' × ' + highlight.cols),
                ' = ',
                h('span', { className: 'text-amber-900 text-base' }, highlight.rows * highlight.cols)
              )
            )
          ),
          showSkipCount && h('p', { className: 'text-[11px] text-amber-700 italic mt-2 text-center' },
            'Each row adds ' + cols + '. ' + cols + ' + ' + cols + ' + ... (' + rows + ' times) = ' + cols + ' × ' + rows + ' = ' + (rows * cols)
          )
        );
      };

      // ═══ VIEW: DISTRIBUTIVE ═══
      var renderDistributive = function() {
        var leftCols = Math.max(1, Math.min(splitAt, cols - 1)); // keep ≥1 column on each side (stale splitAt could exceed cols after shrinking)
        var rightCols = cols - leftCols;
        var leftCells = [];
        for (var i = 0; i < rows * leftCols; i++) {
          leftCells.push(h('div', { key: 'L' + i, className: 'aspect-square rounded-sm border bg-blue-400 border-blue-500' }));
        }
        var rightCells = [];
        for (var j = 0; j < rows * rightCols; j++) {
          rightCells.push(h('div', { key: 'R' + j, className: 'aspect-square rounded-sm border bg-emerald-400 border-emerald-500' }));
        }
        var leftProduct = rows * leftCols;
        var rightProduct = rows * rightCols;

        return h('div', { className: 'space-y-3' },
          h('div', { className: 'flex items-center gap-2 bg-violet-50 rounded-lg p-2 border border-violet-200' },
            h('span', { className: 'text-xs font-bold text-violet-700' }, t('stem.areamodel.split_at_column', 'Split at column:')),
            h('input', {
              type: 'range', 'aria-label': t('stem.areamodel.left_cols', 'left cols'), min: '1', max: String(cols - 1), value: leftCols,
              onChange: function(e) { upd({ splitAt: parseInt(e.target.value) }); },
              'aria-label': t('stem.areamodel.split_at_column_position', 'Split at column position'),
              className: 'flex-1 accent-violet-600'
            }),
            h('span', { className: 'text-xs font-mono text-violet-600' }, leftCols + ' | ' + rightCols)
          ),
          h('div', { className: 'bg-white rounded-xl border-2 border-amber-200 p-4' },
            h('div', { className: 'flex gap-2 sm:gap-4 justify-center items-start w-full max-w-full mx-auto' },
              h('div', { className: 'text-center', style: { flex: leftCols, minWidth: 0, transition: 'flex-grow 0.3s ease' } },
                h('div', { className: 'text-xs font-bold text-blue-700 mb-1' }, rows + ' \u00d7 ' + leftCols),
                h('div', { className: 'grid gap-1 sm:gap-2', style: { gridTemplateColumns: 'repeat(' + leftCols + ', minmax(0, 1fr))' } }, leftCells),
                h('div', { className: 'text-sm font-bold text-blue-600 mt-1' }, '= ' + leftProduct)
              ),
              rightCols > 0 && h('div', { className: 'flex flex-col items-center justify-center self-stretch w-4 sm:w-8' },
                h('div', { className: 'w-px flex-1 bg-violet-300' }),
                h('span', { className: 'text-violet-500 font-bold text-lg py-1' }, '+'),
                h('div', { className: 'w-px flex-1 bg-violet-300' })
              ),
              rightCols > 0 && h('div', { className: 'text-center', style: { flex: rightCols, minWidth: 0, transition: 'flex-grow 0.3s ease' } },
                h('div', { className: 'text-xs font-bold text-emerald-700 mb-1' }, rows + ' \u00d7 ' + rightCols),
                h('div', { className: 'grid gap-1 sm:gap-2', style: { gridTemplateColumns: 'repeat(' + rightCols + ', minmax(0, 1fr))' } }, rightCells),
                h('div', { className: 'text-sm font-bold text-emerald-600 mt-1' }, '= ' + rightProduct)
              )
            )
          ),
          h('div', { className: 'bg-gradient-to-r from-blue-50 via-violet-50 to-emerald-50 rounded-xl p-4 border border-violet-200 text-center' },
            h('div', { className: 'text-lg font-bold text-violet-800' },
              rows + ' \u00d7 ' + cols + ' = ' + rows + ' \u00d7 ',
              h('span', { className: 'text-blue-600' }, leftCols),
              ' + ' + rows + ' \u00d7 ',
              h('span', { className: 'text-emerald-600' }, rightCols)
            ),
            h('div', { className: 'text-xl font-bold text-violet-700 mt-1' },
              rows * cols + ' = ',
              h('span', { className: 'text-blue-600' }, leftProduct),
              ' + ',
              h('span', { className: 'text-emerald-600' }, rightProduct),
              ' = ',
              h('span', { className: 'text-2xl text-violet-900' }, leftProduct + rightProduct)
            ),
            h('p', { className: 'text-xs text-violet-500 mt-2 italic' },
              t('stem.areamodel.distributive_property_a_b_c_a_b_a_c', '\uD83D\uDCA1 Distributive Property: a \u00d7 (b + c) = a\u00d7b + a\u00d7c'))
          )
        );
      };

      // ═══ VIEW: MULTI-DIGIT ═══
      var renderMultiDigit = function() {
        var a = multiDims.a;
        var b = multiDims.b;
        var aTens = Math.floor(a / 10) * 10;
        var aOnes = a % 10;
        var bTens = Math.floor(b / 10) * 10;
        var bOnes = b % 10;
        var pp = [
          { label: aTens + '\u00d7' + bTens, value: aTens * bTens, color: 'bg-blue-400', text: 'text-blue-700' },
          { label: aTens + '\u00d7' + bOnes, value: aTens * bOnes, color: 'bg-sky-300', text: 'text-sky-700' },
          { label: aOnes + '\u00d7' + bTens, value: aOnes * bTens, color: 'bg-emerald-300', text: 'text-emerald-700' },
          { label: aOnes + '\u00d7' + bOnes, value: aOnes * bOnes, color: 'bg-amber-300', text: 'text-amber-700' }
        ];
        var total = a * b;

        return h('div', { className: 'space-y-3' },
          h('div', { className: 'grid grid-cols-2 gap-3' },
            h('div', { className: 'bg-indigo-50 rounded-lg p-3 border border-indigo-100' },
              h('label', { className: 'block text-xs text-indigo-700 mb-1 font-bold' }, t('stem.areamodel.factor_a', 'Factor A')),
              h('input', {
                type: 'number', min: '10', max: '99', value: a,
                onChange: function(e) { upd({ multiDims: { a: Math.max(10, Math.min(99, parseInt(e.target.value) || 10)), b: b } }); },
                className: 'w-full px-3 py-1.5 text-sm border border-indigo-200 rounded-lg text-center font-bold text-lg'
              })
            ),
            h('div', { className: 'bg-indigo-50 rounded-lg p-3 border border-indigo-100' },
              h('label', { className: 'block text-xs text-indigo-700 mb-1 font-bold' }, t('stem.areamodel.factor_b', 'Factor B')),
              h('input', {
                type: 'number', min: '10', max: '99', value: b,
                onChange: function(e) { upd({ multiDims: { a: a, b: Math.max(10, Math.min(99, parseInt(e.target.value) || 10)) } }); },
                className: 'w-full px-3 py-1.5 text-sm border border-indigo-200 rounded-lg text-center font-bold text-lg'
              })
            )
          ),
          h('div', { className: 'bg-white rounded-xl border-2 border-indigo-200 p-4 overflow-x-auto' },
            h('table', { className: 'mx-auto border-collapse' },
              h('caption', { className: 'sr-only' }, t('stem.areamodel.areamodel_data_table', 'areamodel data table')), h('thead', null,
                h('tr', null,
                  h('th', { scope: 'col', className: 'p-2 text-sm font-bold text-slate-600' }, '\u00d7'),
                  h('th', { scope: 'col', className: 'p-2 text-sm font-bold text-indigo-700 bg-indigo-50 rounded-tl-lg border border-indigo-200', style: { minWidth: '120px' } }, bTens),
                  h('th', { scope: 'col', className: 'p-2 text-sm font-bold text-indigo-700 bg-indigo-50 rounded-tr-lg border border-indigo-200', style: { minWidth: '80px' } }, bOnes)
                )
              ),
              h('tbody', null,
                h('tr', null,
                  h('td', { className: 'p-2 text-sm font-bold text-indigo-700 bg-indigo-50 border border-indigo-200' }, aTens),
                  h('td', { className: 'p-3 text-center border border-indigo-200 ' + pp[0].color + ' bg-opacity-60' },
                    h('div', { className: 'text-xs font-bold text-slate-600' }, pp[0].label),
                    h('div', { className: 'text-xl font-bold ' + pp[0].text }, (challenge && !feedback) ? '?' : pp[0].value)
                  ),
                  h('td', { className: 'p-3 text-center border border-indigo-200 ' + pp[1].color + ' bg-opacity-60' },
                    h('div', { className: 'text-xs font-bold text-slate-600' }, pp[1].label),
                    h('div', { className: 'text-xl font-bold ' + pp[1].text }, (challenge && !feedback) ? '?' : pp[1].value)
                  )
                ),
                h('tr', null,
                  h('td', { className: 'p-2 text-sm font-bold text-indigo-700 bg-indigo-50 border border-indigo-200' }, aOnes),
                  h('td', { className: 'p-3 text-center border border-indigo-200 ' + pp[2].color + ' bg-opacity-60' },
                    h('div', { className: 'text-xs font-bold text-slate-600' }, pp[2].label),
                    h('div', { className: 'text-xl font-bold ' + pp[2].text }, (challenge && !feedback) ? '?' : pp[2].value)
                  ),
                  h('td', { className: 'p-3 text-center border border-indigo-200 ' + pp[3].color + ' bg-opacity-60' },
                    h('div', { className: 'text-xs font-bold text-slate-600' }, pp[3].label),
                    h('div', { className: 'text-xl font-bold ' + pp[3].text }, (challenge && !feedback) ? '?' : pp[3].value)
                  )
                )
              )
            )
          ),
          !(challenge && !feedback) && h('div', { className: 'bg-gradient-to-r from-blue-50 via-indigo-50 to-amber-50 rounded-xl p-4 border border-indigo-200 text-center' },
            h('div', { className: 'text-sm font-bold text-slate-600 mb-1' }, a + ' \u00d7 ' + b + ' = partial products:'),
            h('div', { className: 'flex items-center justify-center gap-2 flex-wrap text-lg font-bold' },
              pp.map(function(p, i) {
                return h(React.Fragment, { key: i },
                  i > 0 && h('span', { className: 'text-slate-600' }, '+'),
                  h('span', { className: p.text + ' bg-white px-2 py-0.5 rounded-lg border shadow-sm' }, p.value)
                );
              }),
              h('span', { className: 'text-slate-600' }, '='),
              h('span', { className: 'text-2xl text-indigo-900 bg-indigo-100 px-3 py-0.5 rounded-lg border border-indigo-300 shadow-sm' }, total)
            ),
            h('p', { className: 'text-xs text-indigo-500 mt-2 italic' },
              t('stem.areamodel.break_multi_digit_numbers_into_tens_an', '\uD83D\uDCA1 Break multi-digit numbers into tens and ones, multiply each pair, then add!'))
          )
        );
      };

      // ═══ VIEW: WORD PROBLEMS ═══
      // Real-world contexts make multiplication stick. Each prompt renders as a story
      // PLUS the visual grid that matches it, so students see the rows-and-columns
      // underneath the language. UDL: multiple means of representation, on the same
      // mathematical fact.
      var renderWordProblem = function() {
        var wpA = wordDims.a, wpB = wordDims.b;
        var ctx = WORD_CONTEXTS[wordCtxIdx % WORD_CONTEXTS.length] || WORD_CONTEXTS[0];
        var story = ctx.replace(/\{a\}/g, wpA).replace(/\{b\}/g, wpB);
        var product = wpA * wpB;

        // Build the matching grid (a rows × b cols, small cells)
        var cells = [];
        for (var i = 0; i < wpA * wpB; i++) {
          cells.push(h('div', { key: 'wp-' + i,
            className: 'allo-am-cell aspect-square rounded-sm border bg-emerald-300 border-emerald-500'
          }));
        }

        return h('div', { className: 'space-y-3' },
          // Context picker + dims
          h('div', { className: 'bg-emerald-50 rounded-lg p-3 border border-emerald-200 space-y-2' },
            h('div', { className: 'flex flex-wrap items-center gap-2' },
              h('span', { className: 'text-xs font-bold text-emerald-800' }, 'Story:'),
              h('select', {
                value: wordCtxIdx,
                onChange: function(e) { sfxClick(); upd({ wordCtxIdx: parseInt(e.target.value, 10) }); },
                'aria-label': t('stem.areamodel.word_problem_context', 'Word problem context'),
                className: 'flex-1 px-2 py-1 text-xs border border-emerald-300 rounded bg-white'
              },
                WORD_CONTEXTS.map(function(t, i) {
                  return h('option', { key: 'wpc-' + i, value: i }, t.replace(/\{a\}/g, 'A').replace(/\{b\}/g, 'B').slice(0, 60) + (t.length > 60 ? '…' : ''));
                })
              ),
              h('button', {
                onClick: function() { sfxClick(); upd({ wordCtxIdx: (wordCtxIdx + 1) % WORD_CONTEXTS.length }); },
                'aria-label': t('stem.areamodel.next_story_context', 'Next story context'),
                className: 'px-2 py-1 text-[11px] font-bold bg-emerald-600 text-white rounded hover:bg-emerald-700'
              }, t('stem.areamodel.next', '🔀 Next'))
            ),
            h('div', { className: 'grid grid-cols-2 gap-2' },
              h('div', {},
                h('label', { className: 'block text-[10px] font-bold text-emerald-700 mb-0.5' }, t('stem.areamodel.a_rows_groups', 'A (rows / groups)')),
                h('input', { type: 'range', min: '2', max: '12', value: wpA,
                  onChange: function(e) { upd({ wordDims: { a: parseInt(e.target.value, 10), b: wpB } }); },
                  'aria-label': t('stem.areamodel.a_factor', 'A factor'),
                  className: 'w-full accent-emerald-600'
                }),
                h('div', { className: 'text-center text-base font-bold text-emerald-800' }, wpA)
              ),
              h('div', {},
                h('label', { className: 'block text-[10px] font-bold text-emerald-700 mb-0.5' }, t('stem.areamodel.b_per_row_per_group', 'B (per row / per group)')),
                h('input', { type: 'range', min: '2', max: '12', value: wpB,
                  onChange: function(e) { upd({ wordDims: { a: wpA, b: parseInt(e.target.value, 10) } }); },
                  'aria-label': t('stem.areamodel.b_factor', 'B factor'),
                  className: 'w-full accent-emerald-600'
                }),
                h('div', { className: 'text-center text-base font-bold text-emerald-800' }, wpB)
              )
            )
          ),

          // The story prompt itself
          h('div', { className: 'bg-white rounded-xl border-2 border-emerald-200 p-4' },
            h('p', { className: 'text-sm font-bold text-emerald-900 leading-relaxed mb-3' }, '📖 ' + story),
            h('div', { className: 'flex flex-col items-center gap-2' },
              h('div', { className: 'text-[10px] font-bold text-emerald-700 uppercase tracking-wider' }, t('stem.areamodel.what_the_picture_shows', 'What the picture shows:')),
              h('div', {
                className: 'grid gap-0.5',
                style: {
                  gridTemplateColumns: 'repeat(' + wpB + ', minmax(0, 1fr))',
                  maxWidth: (wpB <= 6 ? wpB * 36 : wpB * 28) + 'px'
                }
              }, cells)
            ),
            h('div', { className: 'mt-3 text-center bg-emerald-50 rounded-lg p-2 border border-emerald-100' },
              h('p', { className: 'text-xs text-emerald-700' },
                wpA + ' groups of ' + wpB + ' = ',
                h('span', { className: 'font-mono font-bold' }, wpA + ' × ' + wpB),
                ' = ',
                h('span', { className: 'text-2xl font-bold text-emerald-900' }, product)
              ),
              h('p', { className: 'text-[10px] text-emerald-600 italic mt-1' }, t('stem.areamodel.the_grid_is_the_picture_multiplication', 'The grid is the picture. Multiplication is the math.'))
            )
          ),

          // Word-problem challenge: pose a random story with hidden answer
          h('div', { className: 'bg-emerald-50 rounded-xl p-3 border border-emerald-200' },
            h('div', { className: 'flex items-center justify-between mb-2' },
              h('p', { className: 'text-[11px] font-bold text-emerald-800' }, t('stem.areamodel.word_problem_challenge', '🎯 Word problem challenge')),
              h('button', {
                onClick: function() {
                  // Generate a random challenge: pick a context, factors, and ask for the product
                  sfxNewChallenge();
                  var max = difficulty === 'easy' ? 6 : difficulty === 'hard' ? 12 : 9;
                  var a2 = randInt(2, max);
                  var b2 = randInt(2, max);
                  var ctxIdx = Math.floor(Math.random() * WORD_CONTEXTS.length);
                  var ctxStr = WORD_CONTEXTS[ctxIdx].replace(/\{a\}/g, a2).replace(/\{b\}/g, b2);
                  var newTypes = Object.assign({}, challengeTypesUsed);
                  newTypes.word = true;
                  upd({
                    viewMode: 'word',
                    wordCtxIdx: ctxIdx,
                    wordDims: { a: a2, b: b2 },
                    challenge: { a: a2, b: b2, answer: a2 * b2, question: ctxStr, mode: 'word' },
                    answer: '', feedback: null, challengeTypesUsed: newTypes
                  });
                },
                'aria-label': t('stem.areamodel.new_word_problem', 'New word problem'),
                className: 'px-3 py-1 bg-emerald-700 text-white text-xs font-bold rounded hover:bg-emerald-800'
              }, t('stem.areamodel.new_word_problem_2', '▶ New word problem'))
            ),
            h('p', { className: 'text-[11px] text-emerald-700 italic' },
              t('stem.areamodel.pick_a_story_look_at_the_matching_grid', 'Pick a story. Look at the matching grid. Multiplication is the count of things in a rectangle. 5 solved earns the 📝 Word Wizard badge.')
            )
          )
        );
      };

      // ═══ BADGES PANEL ═══
      var renderBadges = function() {
        var earned = Object.keys(badges).length;
        if (earned === 0) return null;
        return h('div', { className: 'bg-amber-50 rounded-xl border border-amber-200 p-3' },
          h('p', { className: 'text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-2' },
            '\uD83C\uDFC5 Badges (' + earned + '/' + BADGES.length + ')'
          ),
          h('div', { className: 'flex flex-wrap gap-1.5' },
            BADGES.map(function(b) {
              var has = badges[b.id];
              return h('div', {
                key: b.id, title: b.name + ': ' + b.desc,
                className: 'w-8 h-8 rounded-lg flex items-center justify-center text-base ' +
                  (has ? 'bg-amber-200 shadow-sm' : 'bg-slate-100 opacity-30'),
                style: { filter: has ? 'none' : 'grayscale(1)' }
              }, b.icon);
            })
          )
        );
      };

      // ═══ AI TUTOR PANEL ═══
      var renderAITutor = function() {
        if (!showAITutor) return null;
        return h('div', { className: 'bg-gradient-to-br from-sky-50 to-blue-50 rounded-xl border-2 border-sky-200 p-4 space-y-3' },
          h('div', { className: 'flex items-center justify-between' },
            h('h4', { className: 'text-sm font-bold text-sky-800' }, t('stem.areamodel.ai_area_model_tutor', '\uD83E\uDD16 AI Area Model Tutor')),
            h('button', { 'aria-label': t('stem.areamodel.close_ai_tutor_panel', 'Close AI tutor panel'), onClick: function() { upd({ showAITutor: false }); }, className: 'text-sky-400 hover:text-sky-600 text-lg font-bold' }, '\u00D7')
          ),
          h('div', { className: 'flex gap-2' },
            h('input', {
              type: 'text', value: aiQuestion,
              onChange: function(e) { upd({ aiQuestion: e.target.value }); },
              onKeyDown: function(e) { if (e.key === 'Enter' && aiQuestion.trim()) askAITutor(); },
              placeholder: t('stem.areamodel.ask_about_area_models', 'Ask about area models...'),
              'aria-label': t('stem.areamodel.ask_the_area_model_tutor', 'Ask the area model tutor'),
              className: 'flex-1 px-3 py-2 border border-sky-600 rounded-lg text-sm'
            }),
            h('button', { onClick: askAITutor, disabled: aiLoading || !aiQuestion.trim(),
              className: 'px-4 py-2 bg-sky-600 text-white font-bold rounded-lg text-sm hover:bg-sky-700 disabled:opacity-50'
            }, aiLoading ? '\u23F3' : 'Ask')
          ),
          h('div', { className: 'flex flex-wrap gap-1.5' },
            ['What is an area model?', 'How does distributive property work?', 'How to multiply 2-digit numbers?'].map(function(q) {
              return h('button', { 'aria-label': t('stem.areamodel.ask_question', 'Ask question'),
                key: q, onClick: function() { upd({ aiQuestion: q }); },
                className: 'px-2 py-1 text-[11px] font-bold bg-sky-100 text-sky-700 rounded-full hover:bg-sky-200 transition-all'
              }, q);
            })
          ),
          aiResponse && h('div', { className: 'bg-white rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap border border-sky-100' }, aiResponse)
        );
      };

      // ══════════ RENDER ══════════
      return h('div', { className: 'space-y-4 w-full px-2 sm:px-4 max-w-7xl mx-auto animate-in fade-in duration-200' },
        // Header
        h('div', { className: 'flex items-center gap-3 mb-2' },
          h('button', { onClick: function() { setStemLabTool(null); }, className: 'p-1.5 hover:bg-slate-100 rounded-lg', 'aria-label': t('stem.areamodel.back', 'Back') },
            h(ArrowLeft, { size: 18, className: 'text-slate-600' })),
          h('h3', { className: 'text-lg font-bold text-amber-800' }, t('stem.areamodel.area_model', '\uD83D\uDFE7 Area Model')),
          h('div', { className: 'ml-auto flex items-center gap-3' },
            streak > 0 && h('span', { className: 'text-xs font-bold text-orange-600' }, '\uD83D\uDD25 ' + streak),
            bestStreak > 0 && h('span', { className: 'text-[11px] text-slate-600' }, 'Best: ' + bestStreak),
            h('span', { className: 'text-xs font-bold text-amber-600' }, score.correct + '/' + score.total),
            h('button', {
              onClick: function() {
                var next = !muted;
                upd({ muted: next });
                if (!next) { setTimeout(function() { playTone(660, 0.08, 'sine', 0.08); }, 0); }
                announceToSR(next ? 'Sound muted' : 'Sound on');
              },
              'aria-label': muted ? 'Unmute sound effects' : 'Mute sound effects',
              'aria-pressed': muted,
              title: muted ? 'Unmute (sounds are off)' : 'Mute (sounds are on)',
              className: 'p-1 rounded-md text-base hover:bg-slate-100 transition-colors ' + (muted ? 'text-slate-400' : 'text-amber-700')
            }, muted ? '\uD83D\uDD07' : '\uD83D\uDD0A'),
            h('button', {
              onClick: function() {
                sfxClick();
                upd({
                  dims: { rows: 4, cols: 6 },
                  highlight: { rows: 0, cols: 0 },
                  challenge: null, answer: '', feedback: null,
                  swapped: false, splitAt: 3,
                  multiDims: { a: 23, b: 14 },
                  wordCtxIdx: 0, wordDims: { a: 4, b: 6 },
                  streak: 0, viewMode: 'basic'
                });
                announceToSR('Area model reset to defaults');
              },
              'aria-label': t('stem.areamodel.reset_everything', 'Reset everything'),
              title: t('stem.areamodel.reset_all_dimensions_and_challenges', 'Reset all dimensions and challenges'),
              className: 'px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-all'
            }, t('stem.areamodel.reset', '\u21BA Reset'))
          )
        ),

        // Mode tabs
        h('div', { className: 'flex gap-1 bg-amber-50 rounded-xl p-1 border border-amber-200', role: 'tablist', 'aria-label': t('stem.areamodel.area_model_modes', 'Area Model modes') },
          [
            { id: 'basic', icon: '\uD83D\uDFE7', label: t('stem.areamodel.basic_grid', 'Basic Grid') },
            { id: 'distributive', icon: '\u2702\uFE0F', label: t('stem.areamodel.distributive', 'Distributive') },
            { id: 'multidigit', icon: '\uD83D\uDCCA', label: t('stem.areamodel.partial_products', 'Partial Products') },
            { id: 'word', icon: '\uD83D\uDCDD', label: t('stem.areamodel.word_problems', 'Word Problems') }
          ].map(function(m) {
            return h('button', { key: m.id,
              onClick: function() { sfxClick(); upd({ viewMode: m.id }); },
              className: 'flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all ' +
                (viewMode === m.id ? 'bg-white text-amber-800 shadow-sm' : 'text-amber-500 hover:text-amber-700')
            }, m.icon + ' ' + m.label);
          })
        ),

        // ── Topic-accent hero band per mode ──
        h('section', {
          'data-areamodel-focus': 'true',
          className: 'rounded-2xl border border-amber-200 bg-white p-4 shadow-sm',
          style: { background: 'linear-gradient(135deg, #fffbeb 0%, #fff7ed 48%, #f8fafc 100%)' }
        },
          h('div', { className: 'grid lg:grid-cols-[1.15fr_0.85fr] gap-4 items-stretch' },
            h('div', null,
              h('p', { className: 'text-xs font-black uppercase tracking-wide text-amber-700 mb-1' }, t('stem.areamodel.multiplication_workshop', 'Multiplication workshop')),
              h('h3', { className: 'text-xl font-black text-slate-900 leading-tight mb-2' }, rows + ' \u00d7 ' + cols + ' = ' + (rows * cols)),
              h('p', { className: 'text-sm text-slate-700 leading-relaxed mb-3' },
                t('stem.areamodel.focus_intro', 'Build the rectangle first, then connect the picture to facts, place value, and real-world word problems.')
              ),
              h('div', { className: 'grid grid-cols-3 gap-2' },
                [
                  { label: t('stem.areamodel.mode', 'Mode'), value: viewMode === 'multidigit' ? 'partials' : viewMode },
                  { label: t('stem.areamodel.cells', 'Cells'), value: rows * cols },
                  { label: t('stem.areamodel.streak', 'Streak'), value: streak || 0 }
                ].map(function(stat) {
                  return h('div', { key: stat.label, className: 'rounded-xl bg-white/85 border border-white p-2 shadow-sm' },
                    h('div', { className: 'text-lg font-black text-slate-900 leading-none' }, stat.value),
                    h('div', { className: 'text-xs font-bold text-slate-600 mt-1' }, stat.label)
                  );
                })
              )
            ),
            h('div', {
              role: 'img',
              'aria-label': t('stem.areamodel.focus_visual_label', 'Area model rectangle showing rows times columns as total cells'),
              className: 'rounded-2xl border border-amber-200 bg-slate-950 p-3 overflow-hidden'
            },
              h('div', { className: 'grid gap-1 h-full min-h-[130px]', style: { gridTemplateColumns: 'repeat(' + Math.min(cols, 8) + ', minmax(0, 1fr))' } },
                Array.from({ length: Math.min(rows, 5) * Math.min(cols, 8) }, function(_, idx) {
                  var rr = Math.floor(idx / Math.min(cols, 8));
                  var cc = idx % Math.min(cols, 8);
                  var inHighlight = highlight.rows > 0 && rr < Math.min(highlight.rows, 5) && cc < Math.min(highlight.cols, 8);
                  return h('span', {
                    key: 'focus-cell-' + idx,
                    'aria-hidden': 'true',
                    className: 'rounded-md border',
                    style: {
                      minHeight: 18,
                      background: inHighlight ? '#f59e0b' : 'rgba(251, 191, 36, 0.22)',
                      borderColor: inHighlight ? '#fde68a' : 'rgba(251, 191, 36, 0.34)'
                    }
                  });
                })
              ),
              h('div', { className: 'mt-2 text-xs font-bold text-amber-100 text-center' },
                rows + ' rows by ' + cols + ' columns'
              )
            )
          )
        ),

        (function() {
          var MODE_META = {
            basic:        { accent: '#d97706', soft: 'rgba(217,119,6,0.10)',  icon: '\uD83D\uDFE7', title: t('stem.areamodel.basic_grid_multiplication_as_area', 'Basic Grid \u2014 multiplication as area'),                hint: t('stem.areamodel.a_b_is_the_area_of_an_a_by_b_rectangle', 'a \u00d7 b is the area of an a-by-b rectangle. This is THE bridge from skip-counting to multiplication. Common Core 3.MD.7: relate area to multiplication and addition.') },
            distributive: { accent: '#9333ea', soft: 'rgba(147,51,234,0.10)', icon: '\u2702',         title: t('stem.areamodel.distributive_split_the_rectangle_keep_', 'Distributive \u2014 split the rectangle, keep the area'), hint: t('stem.areamodel.a_b_c_ab_ac_cut_a_4_7_grid_into_a_4_5_', 'a(b+c) = ab + ac. Cut a 4\u00d77 grid into a 4\u00d75 + 4\u00d72; same total. The distributive property is the algebraic backbone of every later expansion. Common Core 3.OA.5.') },
            multidigit:   { accent: '#0891b2', soft: 'rgba(8,145,178,0.10)',  icon: '\uD83D\uDCCA', title: t('stem.areamodel.partial_products_23_47_made_visible', 'Partial Products \u2014 23 \u00d7 47 made visible'),       hint: t('stem.areamodel.break_factors_by_place_value_23_47_20_', 'Break factors by place value: 23\u00d747 = (20+3)(40+7) = 800 + 140 + 120 + 21 = 1081. Bridge to the lattice method, then standard algorithm. Common Core 4.NBT.5.') },
            word:         { accent: '#059669', soft: 'rgba(5,150,105,0.10)',  icon: '\uD83D\uDCDD', title: t('stem.areamodel.word_problems_multiplication_in_the_wo', 'Word Problems \u2014 multiplication in the world'),   hint: t('stem.areamodel.a_garden_with_4_rows_of_6_plants_a_the', 'A garden with 4 rows of 6 plants. A theater with 8 rows of 12 seats. Every multiplication fact lives inside a real-world rectangle. Common Core 3.OA.3, 4.OA.2.') }
          };
          var meta = MODE_META[viewMode] || MODE_META.basic;
          return h('div', {
            style: {
              margin: '12px 0 0',
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

        // Sliders (basic + distributive modes)
        (viewMode === 'basic' || viewMode === 'distributive') && h('div', { className: 'grid grid-cols-2 gap-3' },
          h('div', { className: 'bg-amber-50 rounded-lg p-3 border border-amber-100' },
            h('label', { className: 'block text-xs text-amber-700 mb-1 font-bold' }, t('stem.areamodel.rows_factor_1', 'Rows (Factor 1)')),
            h('input', {
              type: 'range', 'aria-label': 'dims', min: '1', max: '12', value: dims.rows,
              onChange: function(e) { upd({ dims: { rows: parseInt(e.target.value), cols: dims.cols }, highlight: { rows: 0, cols: 0 } }); },
              'aria-label': t('stem.areamodel.number_of_rows', 'Number of rows'),
              className: 'w-full accent-amber-600'
            }),
            h('div', { className: 'text-center text-lg font-bold text-amber-700' }, dims.rows)
          ),
          h('div', { className: 'bg-amber-50 rounded-lg p-3 border border-amber-100' },
            h('label', { className: 'block text-xs text-amber-700 mb-1 font-bold' }, t('stem.areamodel.columns_factor_2', 'Columns (Factor 2)')),
            h('input', {
              type: 'range', 'aria-label': 'dims', min: '1', max: '12', value: dims.cols,
              onChange: function(e) { upd({ dims: { rows: dims.rows, cols: parseInt(e.target.value) }, highlight: { rows: 0, cols: 0 } }); },
              'aria-label': t('stem.areamodel.number_of_columns', 'Number of columns'),
              className: 'w-full accent-amber-600'
            }),
            h('div', { className: 'text-center text-lg font-bold text-amber-700' }, dims.cols)
          )
        ),

        // Grid / Visualization (wrapped in mode-specific atmospheric background)
        viewMode === 'basic' && h('div', { className: 'allo-am-bg-basic' }, renderBasicGrid()),
        viewMode === 'distributive' && h('div', { className: 'allo-am-bg-distributive' }, renderDistributive()),
        viewMode === 'multidigit' && h('div', { className: 'allo-am-bg-multidigit' }, renderMultiDigit()),
        viewMode === 'word' && h('div', { className: 'allo-am-bg-word' }, renderWordProblem()),

        // Product display (basic mode, no active challenge)
        viewMode === 'basic' && !(challenge && !feedback) && h('div', { className: 'bg-white rounded-xl p-4 border border-amber-100 text-center' },
          h('div', { className: 'text-xl font-bold text-amber-800' },
            rows + ' \u00d7 ' + cols + ' = ',
            h('span', { className: 'text-3xl text-amber-600' }, rows * cols)
          ),
          highlight.rows > 0 && highlight.cols > 0 && h('div', { className: 'text-sm text-amber-600 mt-1' },
            'Selected: ' + highlight.rows + ' \u00d7 ' + highlight.cols + ' = ' + (highlight.rows * highlight.cols) + ' (click squares to highlight)')
        ),

        // Commutative toggle (basic mode)
        viewMode === 'basic' && h('div', { className: 'flex items-center gap-3' },
          h('button', { 'aria-label': t('stem.areamodel.clear_highlight', 'Clear highlight'),
            onClick: function() { upd({ highlight: { rows: 0, cols: 0 } }); },
            className: 'text-xs text-slate-600 hover:text-amber-600'
          }, t('stem.areamodel.clear_highlight_2', 'Clear highlight')),
          h('button', { 'aria-label': 'Commutative:',
            onClick: function() {
              sfxClick();
              upd({ swapped: !swapped, usedCommutative: true });
              checkBadges(Object.assign(getBadgeUpdates(), { usedCommutative: true }));
            },
            className: 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ' +
              (swapped ? 'bg-violet-100 text-violet-700 border border-violet-600' : 'bg-slate-100 text-slate-600 hover:bg-violet-50 border border-slate-400')
          },
            '\u21C4 Commutative: ' + rows + ' \u00d7 ' + cols + (swapped ? ' (swapped!)' : '')
          ),
          swapped && h('span', { className: 'text-xs text-violet-500 italic' }, t('stem.areamodel.same_product_a_b_b_a', '\uD83D\uDCA1 Same product! a\u00d7b = b\u00d7a'))
        ),

        // Challenge section
        h('div', { className: 'bg-amber-50 rounded-xl p-4 border border-amber-200 space-y-3' },
          h('div', { className: 'flex items-center justify-between' },
            h('div', { className: 'flex items-center gap-2' },
              h('h4', { className: 'text-sm font-bold text-amber-800' }, t('stem.areamodel.multiplication_challenge', '\uD83C\uDFAF Multiplication Challenge')),
              h('div', { className: 'flex gap-0.5 ml-2' },
                ['easy', 'medium', 'hard'].map(function(d) {
                  return h('button', { key: d, onClick: function() { sfxClick(); upd({ difficulty: d }); },
                    className: 'text-[11px] font-bold px-1.5 py-0.5 rounded-full transition-all ' +
                      (difficulty === d ? (d === 'easy' ? 'bg-green-700 text-white' : d === 'hard' ? 'bg-red-700 text-white' : 'bg-amber-700 text-white') : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                  }, d);
                })
              )
            ),
            h('span', { className: 'text-[11px] text-slate-600' }, Object.keys(challengeTypesUsed).length + '/4 modes')
          ),

          !challenge
            ? h('div', { className: 'flex gap-2 flex-wrap' },
                h('button', { 'aria-label': t('stem.areamodel.grid_challenge', 'Grid Challenge'),
                  onClick: function() { genChallenge('basic'); },
                  className: 'flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl text-sm hover:from-amber-600 hover:to-orange-600 transition-all shadow-md min-w-[140px]'
                }, t('stem.areamodel.grid_challenge_2', '\uD83D\uDFE7 Grid Challenge')),
                h('button', { 'aria-label': t('stem.areamodel.distributive_2', 'Distributive'),
                  onClick: function() { genChallenge('distributive'); },
                  className: 'flex-1 py-2.5 bg-gradient-to-r from-violet-500 to-purple-500 text-white font-bold rounded-xl text-sm hover:from-violet-600 hover:to-purple-600 transition-all shadow-md min-w-[140px]'
                }, t('stem.areamodel.distributive_3', '\u2702\uFE0F Distributive')),
                h('button', { 'aria-label': t('stem.areamodel.partial', 'Partial'),
                  onClick: function() { genChallenge('multidigit'); },
                  className: 'flex-1 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-bold rounded-xl text-sm hover:from-indigo-600 hover:to-blue-600 transition-all shadow-md min-w-[140px]'
                }, t('stem.areamodel.partial_2', '\uD83D\uDCCA Partial')),
                h('button', { 'aria-label': t('stem.areamodel.word_problem', 'Word Problem'),
                  onClick: function() {
                    sfxNewChallenge();
                    var max = difficulty === 'easy' ? 6 : difficulty === 'hard' ? 12 : 9;
                    var a2 = randInt(2, max);
                    var b2 = randInt(2, max);
                    var ctxIdx = Math.floor(Math.random() * WORD_CONTEXTS.length);
                    var ctxStr = WORD_CONTEXTS[ctxIdx].replace(/\{a\}/g, a2).replace(/\{b\}/g, b2);
                    var newTypes = Object.assign({}, challengeTypesUsed); newTypes.word = true;
                    upd({
                      viewMode: 'word', wordCtxIdx: ctxIdx, wordDims: { a: a2, b: b2 },
                      challenge: { a: a2, b: b2, answer: a2 * b2, question: ctxStr, mode: 'word' },
                      answer: '', feedback: null, challengeTypesUsed: newTypes
                    });
                  },
                  className: 'flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold rounded-xl text-sm hover:from-emerald-600 hover:to-green-600 transition-all shadow-md min-w-[140px]'
                }, t('stem.areamodel.word_problem_2', '\uD83D\uDCDD Word Problem'))
              )
            : h('div', { className: 'space-y-2' },
                h('div', { className: 'flex items-center gap-2' },
                  h('span', { className: 'text-[11px] font-bold uppercase text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full' }, challenge.mode || viewMode),
                  streak > 0 && h('span', { className: 'text-[11px] font-bold text-orange-500' }, '\uD83D\uDD25 ' + streak)
                ),
                h('p', { className: 'text-sm font-bold text-amber-800' }, challenge.question),
                h('div', { className: 'flex gap-2' },
                  h('input', {
                    type: 'number', value: answer,
                    onChange: function(e) { upd({ answer: e.target.value }); },
                    onKeyDown: function(e) { if (e.key === 'Enter' && answer) checkChallenge(); },
                    placeholder: t('stem.areamodel.product', 'Product = ?'),
                    'aria-label': t('stem.areamodel.challenge_answer', 'Challenge answer'),
                    className: 'flex-1 px-3 py-2 border border-amber-600 rounded-lg text-sm font-mono'
                  }),
                  h('button', { 'aria-label': t('stem.areamodel.check', 'Check'),
                    onClick: checkChallenge,
                    className: 'px-4 py-2 bg-amber-700 text-white font-bold rounded-lg text-sm hover:bg-amber-700'
                  }, t('stem.areamodel.check_2', 'Check'))
                ),
                feedback && h('p', { className: 'text-sm font-bold ' + (feedback.correct ? 'text-green-600' : 'text-red-600') }, feedback.msg),
                feedback && h('button', { 'aria-label': t('stem.areamodel.next_challenge', 'Next Challenge'),
                  onClick: function() { genChallenge(challenge.mode || viewMode); },
                  className: 'text-xs text-amber-600 font-bold hover:underline'
                }, t('stem.areamodel.next_challenge_2', '\u27A1\uFE0F Next Challenge'))
              )
        ),

        // Badges
        renderBadges(),

        // AI Tutor toggle + panel
        h('div', { className: 'flex gap-2' },
          !showAITutor && h('button', { 'aria-label': t('stem.areamodel.ai_tutor', 'AI Tutor'),
            onClick: function() { sfxClick(); upd({ showAITutor: true }); },
            className: 'px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition-all'
          }, t('stem.areamodel.ai_tutor_2', '\uD83E\uDD16 AI Tutor'))
        ),
        renderAITutor(),

        // Keyboard hints
        h('div', { className: 'text-center text-[11px] text-slate-600 mt-2' },
          t('stem.areamodel.b_d_p_w_switch_mode_n_new_challenge_c_', '\u2328\uFE0F B/D/P/W: switch mode | N: new challenge | C: commutative | ?: AI tutor')
        ),

        h('div', { className: 'flex justify-center' },
          h('button', {
            onClick: function() { sfxClick(); upd({ showAreaPatterns: !_a.showAreaPatterns }); },
            'aria-expanded': !!_a.showAreaPatterns,
            className: 'px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ' +
              (_a.showAreaPatterns ? 'bg-blue-700 text-white border-blue-700 shadow-sm' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50')
          }, _a.showAreaPatterns ? t('stem.areamodel.hide_pattern_lab', 'Hide pattern lab') : t('stem.areamodel.show_pattern_lab', 'Show pattern lab'))
        ),

        // \u2550\u2550\u2550 DISTRIBUTIVE PROPERTY \u2550\u2550\u2550
        _a.showAreaPatterns && h('div', { className: 'space-y-3' },
        h('div', { className: 'mt-2 rounded-2xl border border-blue-300 bg-white p-3 shadow-sm' },
          h('h4', { className: 'text-sm font-bold text-blue-700 mb-2' }, t('stem.areamodel.distributive_property_a_b_c_ab_ac', '\uD83D\uDD22 Distributive Property \u2014 a(b+c) = ab + ac')),
          h('div', { className: 'rounded-xl overflow-hidden border border-blue-200', style: { background: '#0f172a', aspectRatio: '16/5' } },
            h('canvas', {
              role: 'img',
              tabIndex: 0,
              'aria-label': t('stem.areamodel.distributive_property_canvas', 'Animated distributive property diagram showing 3 times 4 plus 3 times 2'),
              ref: function(cvEl) {
                if (!cvEl) return;
                if (cvEl._dpAnim) return;
                var c2 = cvEl.getContext('2d');
                var W = cvEl.offsetWidth || 600;
                var H = cvEl.offsetHeight || 180;
                cvEl.width = W * 2; cvEl.height = H * 2;
                c2.scale(2, 2);
                var start = performance.now();
                function drawDp() {
                  if (!cvEl.isConnected) { cancelAnimationFrame(cvEl._dpAnim); if (cvEl._dpRO) cvEl._dpRO.disconnect(); return; }
                  var t = (performance.now() - start) / 1000;
                  c2.fillStyle = '#0f172a';
                  c2.fillRect(0, 0, W, H);
                  // 3 \u00D7 (4 + 2) = 3\u00D74 + 3\u00D72 = 12 + 6 = 18
                  var unit = 16;
                  var ox = W * 0.1, oy = H * 0.3;
                  // Big rectangle 3 \u00D7 6
                  c2.strokeStyle = '#fbbf24';
                  c2.lineWidth = 2;
                  c2.strokeRect(ox, oy, 6 * unit, 3 * unit);
                  // Left side (3 \u00D7 4) = 12
                  var phase = (t * 0.4) % 2;
                  c2.fillStyle = phase < 1 ? 'rgba(34,211,238,0.5)' : '#22d3ee';
                  c2.fillRect(ox, oy, 4 * unit, 3 * unit);
                  // Right side (3 \u00D7 2) = 6
                  c2.fillStyle = phase < 1 ? 'rgba(251,113,133,0.5)' : '#fb7185';
                  c2.fillRect(ox + 4 * unit, oy, 2 * unit, 3 * unit);
                  // Glossy top-light sheen across the area tiles (depth, not a value change)
                  var amSheen = c2.createLinearGradient(0, oy, 0, oy + 3 * unit);
                  amSheen.addColorStop(0, 'rgba(255,255,255,0.18)');
                  amSheen.addColorStop(0.5, 'rgba(255,255,255,0)');
                  c2.fillStyle = amSheen;
                  c2.fillRect(ox, oy, 6 * unit, 3 * unit);
                  // Grid
                  c2.strokeStyle = 'rgba(255,255,255,0.3)';
                  c2.lineWidth = 0.5;
                  for (var i = 1; i < 6; i++) {
                    c2.beginPath();
                    c2.moveTo(ox + i * unit, oy);
                    c2.lineTo(ox + i * unit, oy + 3 * unit);
                    c2.stroke();
                  }
                  for (var j = 1; j < 3; j++) {
                    c2.beginPath();
                    c2.moveTo(ox, oy + j * unit);
                    c2.lineTo(ox + 6 * unit, oy + j * unit);
                    c2.stroke();
                  }
                  // Divider — glowing so the split between the two products pops
                  c2.save();
                  c2.shadowColor = 'rgba(253,224,71,0.9)'; c2.shadowBlur = 8;
                  c2.strokeStyle = '#fde047';
                  c2.lineWidth = 3;
                  c2.beginPath();
                  c2.moveTo(ox + 4 * unit, oy);
                  c2.lineTo(ox + 4 * unit, oy + 3 * unit);
                  c2.stroke();
                  c2.restore();
                  // Labels
                  c2.fillStyle = '#22d3ee';
                  c2.font = 'bold 14px serif';
                  c2.textAlign = 'center';
                  c2.fillText('3 \u00D7 4', ox + 2 * unit, oy - 6);
                  c2.fillStyle = '#fb7185';
                  c2.fillText('3 \u00D7 2', ox + 5 * unit, oy - 6);
                  c2.fillStyle = '#fbbf24';
                  c2.font = '12px sans-serif';
                  c2.fillText('3', ox - 14, oy + 1.5 * unit + 5);
                  c2.fillText('6', ox + 3 * unit, oy + 3 * unit + 14);
                  // Equation
                  c2.fillStyle = '#fde047';
                  c2.font = 'bold 18px serif';
                  c2.textAlign = 'left';
                  c2.fillText('3 \u00D7 (4 + 2) =', W * 0.55, H * 0.4);
                  c2.fillStyle = '#22d3ee';
                  c2.fillText('3\u00D74', W * 0.78, H * 0.4);
                  c2.fillStyle = '#fde047';
                  c2.fillText('+', W * 0.86, H * 0.4);
                  c2.fillStyle = '#fb7185';
                  c2.fillText('3\u00D72', W * 0.89, H * 0.4);
                  c2.fillStyle = '#fde047';
                  c2.font = 'bold 14px serif';
                  c2.fillText('= 12 + 6 = 18', W * 0.55, H * 0.6);
                  c2.fillStyle = 'rgba(0,0,0,0.85)';
                  c2.fillRect(8, H - 14, W - 16, 12);
                  c2.font = 'bold 10px sans-serif'; c2.fillStyle = '#67e8f9'; c2.textAlign = 'center';
                  c2.fillText('Distribution lets you break big problems into easy ones. Foundation of algebra.', W / 2, H - 5);
                  cvEl._dpAnim = requestAnimationFrame(drawDp);
                }
                drawDp();
                var ro = new ResizeObserver(function() {
                  W = cvEl.offsetWidth; H = cvEl.offsetHeight;
                  cvEl.width = W * 2; cvEl.height = H * 2;
                  c2.setTransform(1, 0, 0, 1, 0, 0); c2.scale(2, 2); // reset first — scale() is cumulative
                });
                cvEl._dpRO = ro; // stored so the rAF teardown can disconnect it (was leaking on unmount)
                ro.observe(cvEl);
              },
              style: { width: '100%', height: '100%', display: 'block' }
            })
          )
        ),
        // === H7b'' inquiry widget: area discovery ===
        (function() {
          var iq = _a._areaHunt || { rows: 4, cols: 5, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
          function setIQ(patch) { upd({ _areaHunt: Object.assign({}, iq, patch) }); }
          var area = iq.rows * iq.cols;
          var state;
          if (area === iq.rows + iq.cols) state = 'special';
          else if (iq.rows === iq.cols) state = 'square';
          else if (area > 50) state = 'large';
          else state = 'rectangle';
          var sm = {
            special:   { label: t('stem.areamodel.special_case_area_perimeter_sum', '✨ Special case (area = perimeter sum)'), color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd' },
            square:    { label: t('stem.areamodel.square_rows_cols', '🟦 Square (rows = cols)'), color: '#0891b2', bg: '#ecfeff', border: '#67e8f9' },
            large:     { label: t('stem.areamodel.large_rectangle_area_50', '🟧 Large rectangle (area > 50)'), color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
            rectangle: { label: t('stem.areamodel.standard_rectangle', '🟩 Standard rectangle'), color: '#059669', bg: '#ecfdf5', border: '#86efac' }
          }[state];
          return h('div', { className: 'mt-3 p-3 rounded-xl bg-white border border-emerald-300 space-y-2' },
            h('h3', { className: 'text-sm font-black text-emerald-700' }, t('stem.areamodel.area_discovery', '📐 Area discovery')),
            h('p', { className: 'text-[11px] text-slate-700' }, t('stem.areamodel.sliders_for_rows_cols_discrete_4_state', 'Sliders for rows × cols. Discrete 4-state classification. No score, no reveal.')),
            h('div', { className: 'p-2 rounded text-center', style: { background: sm.bg, border: '1px solid ' + sm.border } },
              h('div', { className: 'text-sm font-black', style: { color: sm.color } }, sm.label),
              h('div', { className: 'text-[10px] text-slate-700 font-mono mt-1' }, iq.rows + ' × ' + iq.cols + ' = ' + area + ' sq units')
            ),
            h('div', { className: 'grid grid-cols-2 gap-2' },
              [{ k: 'rows', l: 'rows' }, { k: 'cols', l: 'cols' }].map(function(s) {
                return h('div', { key: s.k },
                  h('label', { htmlFor: 'ar-' + s.k, className: 'block text-[10px] font-bold text-slate-700' }, s.l + ': ', h('span', { className: 'font-mono text-emerald-700' }, iq[s.k])),
                  h('input', { id: 'ar-' + s.k, type: 'range', min: 1, max: 12, step: 1, value: iq[s.k],
                    onChange: function(e) { var p = {}; p[s.k] = parseInt(e.target.value, 10); setIQ(p); },
                    className: 'w-full', 'aria-label': s.l }));
              })
            ),
            h('div', { className: 'flex gap-2 items-center flex-wrap' },
              h('button', { onClick: function() { setIQ({ log: (iq.log || []).concat([{ r: iq.rows, c: iq.cols, a: area, st: state }]).slice(-8) }); }, className: 'px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-700 border border-slate-300' }, t('stem.areamodel.log', '📋 Log')),
              h('button', { onClick: function() { setIQ({ rows: 4, cols: 5, log: [], hypothesis: '', stuckRevealed: false, understood: false, explanation: '' }); }, className: 'px-2 py-0.5 rounded bg-white text-[10px] font-semibold text-slate-600 border border-slate-300' }, t('stem.areamodel.reset_2', '↺ Reset'))
            ),
            h('textarea', { value: iq.hypothesis || '', onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, placeholder: t('stem.areamodel.hypothesis_when_does_area_rows_cols', 'Hypothesis: When does area = rows + cols?'),
              className: 'w-full text-[11px] border border-slate-300 rounded p-1 font-mono leading-snug', rows: 2 }),
            !iq.stuckRevealed && h('button', { onClick: function() { setIQ({ stuckRevealed: true }); }, className: 'px-2 py-0.5 rounded bg-amber-50 text-[10px] font-bold text-amber-800 border border-amber-300' }, t('stem.areamodel.stuck_show_open_prompts', '🤔 Stuck — show open prompts')),
            iq.stuckRevealed && h('div', { className: 'p-2 rounded bg-amber-50 border border-amber-200 text-[10px] text-slate-700' },
              h('ul', { className: 'list-disc pl-4 space-y-0.5' },
                h('li', null, t('stem.areamodel.find_sizes_where_area_perimeter_rare_i', 'Find sizes where area = perimeter (rare integers).')),
                h('li', null, t('stem.areamodel.when_does_swapping_rows_cols_change_an', 'When does swapping rows/cols change anything?')))),
            h('label', { className: 'flex items-center gap-1 text-[10px] font-bold text-emerald-800 cursor-pointer' },
              h('input', { type: 'checkbox', checked: !!iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); }, className: 'w-3 h-3' }),
              t('stem.areamodel.i_understand_explain_in_own_words', 'I understand — explain in own words')),
            iq.understood && h('textarea', { value: iq.explanation || '', onChange: function(e) { setIQ({ explanation: e.target.value }); }, placeholder: t('stem.areamodel.explain_commutative_property_area_leng', 'Explain commutative property + area = length × width.'),
              className: 'w-full text-[11px] border border-emerald-300 rounded p-1 font-mono leading-snug mt-1', rows: 3 }),
            h('div', { className: 'text-[10px] italic text-slate-500' }, t('stem.areamodel.design_note_discrete_4_state_classific', 'Design note: discrete 4-state classification; no area-test score; no reveal — by design.'))
          );
        })()
        )
      );
    }
  });
})();
