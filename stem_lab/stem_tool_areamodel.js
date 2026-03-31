// ═══════════════════════════════════════════
// stem_tool_areamodel.js — Area Model Plugin (Enhanced v2)
// 3 tabs: Basic Grid, Distributive, Partial Products
// + sound effects, 12 badges, AI tutor, streak tracking,
//   more challenge types, commutative toggle, keyboard shortcuts
// ═══════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

(function() {
  'use strict';

  window.StemLab.registerTool('areamodel', {
    icon: '\uD83D\uDFE7', label: 'Area Model',
    desc: 'Visual multiplication with area model grids, distributive property, partial products, sound effects, and badges.',
    color: 'amber', category: 'math',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var setStemLabTool = ctx.setStemLabTool;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;
      var announceToSR = ctx.announceToSR;
      var a11yClick = ctx.a11yClick;
      var t = ctx.t;

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
      var difficulty = _a.difficulty || 'easy';
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
        { id: 'firstArea', icon: '\uD83D\uDFE7', name: 'First Area', desc: 'Solve your first challenge', check: function(u) { return u.correct >= 1; } },
        { id: 'streak3', icon: '\uD83D\uDD25', name: 'Hot Streak', desc: 'Get a streak of 3', check: function(u) { return u.streak >= 3; } },
        { id: 'streak5', icon: '\u26A1', name: 'Lightning', desc: 'Get a streak of 5', check: function(u) { return u.streak >= 5; } },
        { id: 'streak10', icon: '\uD83C\uDF1F', name: 'Area Master', desc: 'Get a streak of 10', check: function(u) { return u.streak >= 10; } },
        { id: 'score10', icon: '\uD83C\uDFC5', name: 'Solid Ten', desc: 'Score 10 correct', check: function(u) { return u.correct >= 10; } },
        { id: 'score25', icon: '\uD83C\uDFC6', name: 'Twenty-Five', desc: 'Score 25 correct', check: function(u) { return u.correct >= 25; } },
        { id: 'basicPro', icon: '\uD83D\uDFE9', name: 'Grid Pro', desc: 'Solve 5 basic grid challenges', check: function(u) { return u.basicSolved >= 5; } },
        { id: 'distPro', icon: '\u2702\uFE0F', name: 'Distributor', desc: 'Solve 5 distributive challenges', check: function(u) { return u.distSolved >= 5; } },
        { id: 'multiPro', icon: '\uD83D\uDCCA', name: 'Partial Pro', desc: 'Solve 5 multi-digit challenges', check: function(u) { return u.multiSolved >= 5; } },
        { id: 'allModes', icon: '\uD83C\uDF08', name: 'Well Rounded', desc: 'Solve challenges in all 3 modes', check: function(u) { return u.typesUsed >= 3; } },
        { id: 'commutative', icon: '\u21C4', name: 'Commuter', desc: 'Use the commutative toggle', check: function(u) { return u.usedCommutative; } },
        { id: 'aiLearner', icon: '\uD83E\uDD16', name: 'AI Learner', desc: 'Ask the AI tutor a question', check: function(u) { return u.aiAsked >= 1; } },
        { id: 'wordPro', icon: '\uD83D\uDCDD', name: 'Word Wizard', desc: 'Solve 5 word problems', check: function(u) { return u.wordSolved >= 5; } },
        { id: 'fracPro', icon: '\uD83C\uDF55', name: 'Fraction Fan', desc: 'Solve 3 fraction challenges', check: function(u) { return u.fracSolved >= 3; } }
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
            ? { correct: true, msg: '\u2705 Correct! ' + challenge.a + ' \u00d7 ' + challenge.b + ' = ' + challenge.answer }
            : { correct: false, msg: '\u274C Try again. ' + challenge.a + ' \u00d7 ' + challenge.b + ' = ' + challenge.answer },
          score: { correct: newCorrect, total: score.total + 1 },
          streak: newStreak, bestStreak: newBest,
          basicSolved: newBasic, distSolved: newDist, multiSolved: newMulti
        });
        if (ok) awardXP('areamodel', 5, 'area model');

        checkBadges({
          correct: newCorrect, streak: newStreak,
          typesUsed: Object.keys(challengeTypesUsed).length,
          basicSolved: newBasic, distSolved: newDist, multiSolved: newMulti,
          usedCommutative: _a.usedCommutative || false,
          aiAsked: _a.aiAsked || 0
        });
      };

      // ═══ AI TUTOR ═══
      var askAITutor = function() {
        if (!aiQuestion.trim()) return;
        upd({ aiLoading: true, aiResponse: '' });
        var prompt = 'You are a friendly math tutor helping a student learn multiplication using area models. ' +
          'They are on the "' + viewMode + '" tab working with ' + rows + ' rows and ' + cols + ' columns. ' +
          'Their question: "' + aiQuestion + '"\n\n' +
          'Explain clearly with examples. Keep it under 150 words.';
        ctx.callGemini(prompt, false, false, 0.7).then(function(resp) {
          upd({ aiResponse: resp, aiLoading: false, aiAsked: (_a.aiAsked || 0) + 1 });
          checkBadges(Object.assign(getBadgeUpdates(), { aiAsked: (_a.aiAsked || 0) + 1 }));
        }).catch(function() {
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
            cells.push(h('div', {
              key: i,
              onClick: function() { sfxClick(); upd({ highlight: { rows: ri + 1, cols: ci + 1 } }); },
              className: 'aspect-square rounded-sm border cursor-pointer transition-all hover:scale-110 ' +
                (isHigh ? 'bg-amber-400 border-amber-500 shadow-sm' : 'bg-amber-100 border-amber-200 hover:bg-amber-200')
            }));
          })(r, c);
        }
        return h('div', { className: 'bg-white rounded-xl border-2 border-amber-200 p-4' },
          h('div', {
            className: 'grid gap-1 mx-auto',
            style: {
              gridTemplateColumns: 'repeat(' + cols + ', minmax(0, 1fr))',
              maxWidth: (cols <= 6 ? Math.min(cols * 52, 340) : cols <= 9 ? cols * 38 : cols * 32) + 'px'
            }
          }, cells)
        );
      };

      // ═══ VIEW: DISTRIBUTIVE ═══
      var renderDistributive = function() {
        var leftCols = Math.min(splitAt, cols);
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
            h('span', { className: 'text-xs font-bold text-violet-700' }, 'Split at column:'),
            h('input', {
              type: 'range', min: '1', max: String(cols - 1), value: leftCols,
              onChange: function(e) { upd({ splitAt: parseInt(e.target.value) }); },
              'aria-label': 'Split at column position',
              className: 'flex-1 accent-violet-600'
            }),
            h('span', { className: 'text-xs font-mono text-violet-600' }, leftCols + ' | ' + rightCols)
          ),
          h('div', { className: 'bg-white rounded-xl border-2 border-amber-200 p-4' },
            h('div', { className: 'flex gap-2 sm:gap-4 justify-center items-start w-full max-w-full mx-auto' },
              h('div', { className: 'text-center', style: { flex: leftCols, minWidth: 0 } },
                h('div', { className: 'text-xs font-bold text-blue-700 mb-1' }, rows + ' \u00d7 ' + leftCols),
                h('div', { className: 'grid gap-1 sm:gap-2', style: { gridTemplateColumns: 'repeat(' + leftCols + ', minmax(0, 1fr))' } }, leftCells),
                h('div', { className: 'text-sm font-bold text-blue-600 mt-1' }, '= ' + leftProduct)
              ),
              h('div', { className: 'flex flex-col items-center justify-center self-stretch w-4 sm:w-8' },
                h('div', { className: 'w-px flex-1 bg-violet-300' }),
                h('span', { className: 'text-violet-500 font-bold text-lg py-1' }, '+'),
                h('div', { className: 'w-px flex-1 bg-violet-300' })
              ),
              rightCols > 0 && h('div', { className: 'text-center', style: { flex: rightCols, minWidth: 0 } },
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
              '\uD83D\uDCA1 Distributive Property: a \u00d7 (b + c) = a\u00d7b + a\u00d7c')
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
              h('label', { className: 'block text-xs text-indigo-700 mb-1 font-bold' }, 'Factor A'),
              h('input', {
                type: 'number', min: '10', max: '99', value: a,
                onChange: function(e) { upd({ multiDims: { a: Math.max(10, Math.min(99, parseInt(e.target.value) || 10)), b: b } }); },
                className: 'w-full px-3 py-1.5 text-sm border border-indigo-200 rounded-lg text-center font-bold text-lg'
              })
            ),
            h('div', { className: 'bg-indigo-50 rounded-lg p-3 border border-indigo-100' },
              h('label', { className: 'block text-xs text-indigo-700 mb-1 font-bold' }, 'Factor B'),
              h('input', {
                type: 'number', min: '10', max: '99', value: b,
                onChange: function(e) { upd({ multiDims: { a: a, b: Math.max(10, Math.min(99, parseInt(e.target.value) || 10)) } }); },
                className: 'w-full px-3 py-1.5 text-sm border border-indigo-200 rounded-lg text-center font-bold text-lg'
              })
            )
          ),
          h('div', { className: 'bg-white rounded-xl border-2 border-indigo-200 p-4 overflow-x-auto' },
            h('table', { className: 'mx-auto border-collapse' },
              h('thead', null,
                h('tr', null,
                  h('th', { className: 'p-2 text-sm font-bold text-slate-500' }, '\u00d7'),
                  h('th', { className: 'p-2 text-sm font-bold text-indigo-700 bg-indigo-50 rounded-tl-lg border border-indigo-200', style: { minWidth: '120px' } }, bTens),
                  h('th', { className: 'p-2 text-sm font-bold text-indigo-700 bg-indigo-50 rounded-tr-lg border border-indigo-200', style: { minWidth: '80px' } }, bOnes)
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
                  i > 0 && h('span', { className: 'text-slate-400' }, '+'),
                  h('span', { className: p.text + ' bg-white px-2 py-0.5 rounded-lg border shadow-sm' }, p.value)
                );
              }),
              h('span', { className: 'text-slate-400' }, '='),
              h('span', { className: 'text-2xl text-indigo-900 bg-indigo-100 px-3 py-0.5 rounded-lg border border-indigo-300 shadow-sm' }, total)
            ),
            h('p', { className: 'text-xs text-indigo-500 mt-2 italic' },
              '\uD83D\uDCA1 Break multi-digit numbers into tens and ones, multiply each pair, then add!')
          )
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
            h('h4', { className: 'text-sm font-bold text-sky-800' }, '\uD83E\uDD16 AI Area Model Tutor'),
            h('button', { onClick: function() { upd({ showAITutor: false }); }, className: 'text-sky-400 hover:text-sky-600 text-lg font-bold' }, '\u00D7')
          ),
          h('div', { className: 'flex gap-2' },
            h('input', {
              type: 'text', value: aiQuestion,
              onChange: function(e) { upd({ aiQuestion: e.target.value }); },
              onKeyDown: function(e) { if (e.key === 'Enter' && aiQuestion.trim()) askAITutor(); },
              placeholder: 'Ask about area models...',
              'aria-label': 'Ask the area model tutor',
              className: 'flex-1 px-3 py-2 border border-sky-300 rounded-lg text-sm'
            }),
            h('button', {
              onClick: askAITutor, disabled: aiLoading || !aiQuestion.trim(),
              className: 'px-4 py-2 bg-sky-600 text-white font-bold rounded-lg text-sm hover:bg-sky-700 disabled:opacity-50'
            }, aiLoading ? '\u23F3' : 'Ask')
          ),
          h('div', { className: 'flex flex-wrap gap-1.5' },
            ['What is an area model?', 'How does distributive property work?', 'How to multiply 2-digit numbers?'].map(function(q) {
              return h('button', {
                key: q, onClick: function() { upd({ aiQuestion: q }); },
                className: 'px-2 py-1 text-[10px] font-bold bg-sky-100 text-sky-700 rounded-full hover:bg-sky-200 transition-all'
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
          h('button', { onClick: function() { setStemLabTool(null); }, className: 'p-1.5 hover:bg-slate-100 rounded-lg', 'aria-label': 'Back' },
            h(ArrowLeft, { size: 18, className: 'text-slate-500' })),
          h('h3', { className: 'text-lg font-bold text-amber-800' }, '\uD83D\uDFE7 Area Model'),
          h('div', { className: 'ml-auto flex items-center gap-3' },
            streak > 0 && h('span', { className: 'text-xs font-bold text-orange-600' }, '\uD83D\uDD25 ' + streak),
            bestStreak > 0 && h('span', { className: 'text-[10px] text-slate-500' }, 'Best: ' + bestStreak),
            h('span', { className: 'text-xs font-bold text-amber-600' }, score.correct + '/' + score.total)
          )
        ),

        // Mode tabs
        h('div', { className: 'flex gap-1 bg-amber-50 rounded-xl p-1 border border-amber-200' },
          [
            { id: 'basic', icon: '\uD83D\uDFE7', label: 'Basic Grid' },
            { id: 'distributive', icon: '\u2702\uFE0F', label: 'Distributive' },
            { id: 'multidigit', icon: '\uD83D\uDCCA', label: 'Partial Products' }
          ].map(function(m) {
            return h('button', {
              key: m.id,
              onClick: function() { sfxClick(); upd({ viewMode: m.id }); },
              className: 'flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all ' +
                (viewMode === m.id ? 'bg-white text-amber-800 shadow-sm' : 'text-amber-500 hover:text-amber-700')
            }, m.icon + ' ' + m.label);
          })
        ),

        // Sliders (basic + distributive modes)
        (viewMode === 'basic' || viewMode === 'distributive') && h('div', { className: 'grid grid-cols-2 gap-3' },
          h('div', { className: 'bg-amber-50 rounded-lg p-3 border border-amber-100' },
            h('label', { className: 'block text-xs text-amber-700 mb-1 font-bold' }, 'Rows (Factor 1)'),
            h('input', {
              type: 'range', min: '1', max: '12', value: dims.rows,
              onChange: function(e) { upd({ dims: { rows: parseInt(e.target.value), cols: dims.cols }, highlight: { rows: 0, cols: 0 } }); },
              'aria-label': 'Number of rows',
              className: 'w-full accent-amber-600'
            }),
            h('div', { className: 'text-center text-lg font-bold text-amber-700' }, dims.rows)
          ),
          h('div', { className: 'bg-amber-50 rounded-lg p-3 border border-amber-100' },
            h('label', { className: 'block text-xs text-amber-700 mb-1 font-bold' }, 'Columns (Factor 2)'),
            h('input', {
              type: 'range', min: '1', max: '12', value: dims.cols,
              onChange: function(e) { upd({ dims: { rows: dims.rows, cols: parseInt(e.target.value) }, highlight: { rows: 0, cols: 0 } }); },
              'aria-label': 'Number of columns',
              className: 'w-full accent-amber-600'
            }),
            h('div', { className: 'text-center text-lg font-bold text-amber-700' }, dims.cols)
          )
        ),

        // Grid / Visualization
        viewMode === 'basic' && renderBasicGrid(),
        viewMode === 'distributive' && renderDistributive(),
        viewMode === 'multidigit' && renderMultiDigit(),

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
          h('button', {
            onClick: function() { upd({ highlight: { rows: 0, cols: 0 } }); },
            className: 'text-xs text-slate-400 hover:text-amber-600'
          }, 'Clear highlight'),
          h('button', {
            onClick: function() {
              sfxClick();
              upd({ swapped: !swapped, usedCommutative: true });
              checkBadges(Object.assign(getBadgeUpdates(), { usedCommutative: true }));
            },
            className: 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ' +
              (swapped ? 'bg-violet-100 text-violet-700 border border-violet-300' : 'bg-slate-100 text-slate-600 hover:bg-violet-50 border border-slate-200')
          },
            '\u21C4 Commutative: ' + rows + ' \u00d7 ' + cols + (swapped ? ' (swapped!)' : '')
          ),
          swapped && h('span', { className: 'text-xs text-violet-500 italic' }, '\uD83D\uDCA1 Same product! a\u00d7b = b\u00d7a')
        ),

        // Challenge section
        h('div', { className: 'bg-amber-50 rounded-xl p-4 border border-amber-200 space-y-3' },
          h('div', { className: 'flex items-center justify-between' },
            h('div', { className: 'flex items-center gap-2' },
              h('h4', { className: 'text-sm font-bold text-amber-800' }, '\uD83C\uDFAF Multiplication Challenge'),
              h('div', { className: 'flex gap-0.5 ml-2' },
                ['easy', 'medium', 'hard'].map(function(d) {
                  return h('button', {
                    key: d, onClick: function() { sfxClick(); upd({ difficulty: d }); },
                    className: 'text-[11px] font-bold px-1.5 py-0.5 rounded-full transition-all ' +
                      (difficulty === d ? (d === 'easy' ? 'bg-green-500 text-white' : d === 'hard' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white') : 'bg-slate-100 text-slate-500 hover:bg-slate-200')
                  }, d);
                })
              )
            ),
            h('span', { className: 'text-[11px] text-slate-500' }, Object.keys(challengeTypesUsed).length + '/3 modes')
          ),

          !challenge
            ? h('div', { className: 'flex gap-2' },
                h('button', {
                  onClick: function() { genChallenge('basic'); },
                  className: 'flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl text-sm hover:from-amber-600 hover:to-orange-600 transition-all shadow-md'
                }, '\uD83D\uDFE7 Grid Challenge'),
                h('button', {
                  onClick: function() { genChallenge('distributive'); },
                  className: 'flex-1 py-2.5 bg-gradient-to-r from-violet-500 to-purple-500 text-white font-bold rounded-xl text-sm hover:from-violet-600 hover:to-purple-600 transition-all shadow-md'
                }, '\u2702\uFE0F Distributive'),
                h('button', {
                  onClick: function() { genChallenge('multidigit'); },
                  className: 'flex-1 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-bold rounded-xl text-sm hover:from-indigo-600 hover:to-blue-600 transition-all shadow-md'
                }, '\uD83D\uDCCA Partial')
              )
            : h('div', { className: 'space-y-2' },
                h('div', { className: 'flex items-center gap-2' },
                  h('span', { className: 'text-[11px] font-bold uppercase text-amber-400 bg-amber-100 px-2 py-0.5 rounded-full' }, challenge.mode || viewMode),
                  streak > 0 && h('span', { className: 'text-[11px] font-bold text-orange-500' }, '\uD83D\uDD25 ' + streak)
                ),
                h('p', { className: 'text-sm font-bold text-amber-800' }, challenge.question),
                h('div', { className: 'flex gap-2' },
                  h('input', {
                    type: 'number', value: answer,
                    onChange: function(e) { upd({ answer: e.target.value }); },
                    onKeyDown: function(e) { if (e.key === 'Enter' && answer) checkChallenge(); },
                    placeholder: 'Product = ?',
                    'aria-label': 'Challenge answer',
                    className: 'flex-1 px-3 py-2 border border-amber-300 rounded-lg text-sm font-mono'
                  }),
                  h('button', {
                    onClick: checkChallenge,
                    className: 'px-4 py-2 bg-amber-600 text-white font-bold rounded-lg text-sm hover:bg-amber-700'
                  }, 'Check')
                ),
                feedback && h('p', { className: 'text-sm font-bold ' + (feedback.correct ? 'text-green-600' : 'text-red-600') }, feedback.msg),
                feedback && h('button', {
                  onClick: function() { genChallenge(challenge.mode || viewMode); },
                  className: 'text-xs text-amber-600 font-bold hover:underline'
                }, '\u27A1\uFE0F Next Challenge')
              )
        ),

        // Badges
        renderBadges(),

        // AI Tutor toggle + panel
        h('div', { className: 'flex gap-2' },
          !showAITutor && h('button', {
            onClick: function() { sfxClick(); upd({ showAITutor: true }); },
            className: 'px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition-all'
          }, '\uD83E\uDD16 AI Tutor')
        ),
        renderAITutor(),

        // Keyboard hints
        h('div', { className: 'text-center text-[11px] text-slate-300 mt-2' },
          '\u2328\uFE0F B/D/P: switch mode | N: new challenge | C: commutative | ?: AI tutor'
        )
      );
    }
  });
})();
