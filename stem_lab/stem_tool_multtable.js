// ═══════════════════════════════════════════
// stem_tool_multtable.js — Multiplication Table Plugin
// Interactive 12×12 grid with Quick Quiz, Speed Run,
// streaks, adaptive difficulty, wrong-answer review,
// sound effects, badges, AI tutor & keyboard shortcuts
// ═══════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

(function() {
  'use strict';

  // ── Difficulty presets ──
  var DIFFICULTY = {
    easy:   { min: 2, max: 5,  label: 'Easy' },
    medium: { min: 2, max: 9,  label: 'Medium' },
    hard:   { min: 2, max: 12, label: 'Hard' }
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
      g.gain.value = 0.13;
      switch (type) {
        case 'correct':
          o.frequency.value = 523; o.type = 'sine';
          g.gain.setValueAtTime(0.13, ac.currentTime);
          g.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.25);
          o.start(); o.stop(ac.currentTime + 0.25);
          // second tone for chime
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

  // ── Badge definitions ──
  var BADGES = [
    { id: 'firstCorrect',  icon: '\u2B50', label: 'First Star',        desc: 'Answer your first problem correctly' },
    { id: 'streak5',       icon: '\uD83D\uDD25', label: 'On Fire',     desc: '5 correct answers in a row' },
    { id: 'streak10',      icon: '\u26A1', label: 'Lightning',          desc: '10 correct answers in a row' },
    { id: 'streak20',      icon: '\uD83C\uDF1F', label: 'Unstoppable', desc: '20 correct answers in a row' },
    { id: 'speedRunner',   icon: '\u23F1\uFE0F', label: 'Speed Runner', desc: 'Complete a Speed Run' },
    { id: 'speedDemon',    icon: '\uD83D\uDE08', label: 'Speed Demon', desc: '20+ correct in a Speed Run' },
    { id: 'perfectRun',    icon: '\uD83D\uDCAF', label: 'Perfect Run', desc: '100% accuracy in Speed Run (10+ Qs)' },
    { id: 'squareMaster',  icon: '\uD83D\uDFE6', label: 'Square Master', desc: 'Answer all 12 perfect squares' },
    { id: 'hiddenHero',    icon: '\uD83D\uDE48', label: 'Hidden Hero', desc: '10 correct in Hidden mode' },
    { id: 'adaptiveAce',   icon: '\uD83C\uDFAF', label: 'Adaptive Ace', desc: 'Reach Hard difficulty in Adaptive' },
    { id: 'centurion',     icon: '\uD83C\uDFC5', label: 'Centurion',   desc: '100 total correct answers' },
    { id: 'mathlete',      icon: '\uD83C\uDFC6', label: 'Mathlete',    desc: '50 correct in one session' }
  ];

  window.StemLab.registerTool('multtable', {
    icon: '\uD83D\uDD22', label: 'Multiplication Table',
    desc: 'Interactive 12\u00D712 grid with quiz modes, speed runs, streaks, badges & AI tutor.',
    color: 'pink', category: 'math',
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
      var callGemini = ctx.callGemini;

      // ── State from ctx ──
      var multTableAnswer = ctx.multTableAnswer || '';
      var setMultTableAnswer = ctx.setMultTableAnswer;
      var multTableChallenge = ctx.multTableChallenge || null;
      var setMultTableChallenge = ctx.setMultTableChallenge;
      var multTableFeedback = ctx.multTableFeedback || null;
      var setMultTableFeedback = ctx.setMultTableFeedback;
      var multTableHidden = ctx.multTableHidden || false;
      var setMultTableHidden = ctx.setMultTableHidden;
      var multTableHover = ctx.multTableHover || null;
      var setMultTableHover = ctx.setMultTableHover;
      var multTableRevealed = ctx.multTableRevealed || new Set();
      var setMultTableRevealed = ctx.setMultTableRevealed;
      var labToolData = ctx.labToolData || {};
      var setLabToolData = ctx.setLabToolData;
      var exploreScore = ctx.exploreScore || { correct: 0, total: 0 };
      var setExploreScore = ctx.setExploreScore;
      var exploreDifficulty = ctx.exploreDifficulty || 'hard';
      var setExploreDifficulty = ctx.setExploreDifficulty;

      var maxNum = 12;

      // ── Speed Run timer state ──
      var _mt = labToolData._multTimer || { active: false, endTime: 0, score: 0, total: 0, timeLeft: 120, streak: 0, missed: [], adaptiveHistory: [] };
      var _mtUpd = function(obj) {
        setLabToolData(function(prev) {
          return Object.assign({}, prev, { _multTimer: Object.assign({}, prev._multTimer || _mt, obj) });
        });
      };

      // ── Extended state for badges & AI ──
      var _ext = labToolData._multExt || { badges: {}, totalCorrect: 0, sessionCorrect: 0, hiddenCorrect: 0, squaresAnswered: {}, rowsAnswered: {}, showAI: false, aiResponse: '', aiLoading: false, showBadges: false };
      var extUpd = function(obj) {
        setLabToolData(function(prev) {
          return Object.assign({}, prev, { _multExt: Object.assign({}, prev._multExt || _ext, obj) });
        });
      };

      // Timer tick — ref-based interval
      if (_mt.active && !labToolData._multTimerInterval) {
        var _ivl = setInterval(function() {
          setLabToolData(function(prev) {
            var tm = prev._multTimer || _mt;
            if (!tm.active) { clearInterval(_ivl); return Object.assign({}, prev, { _multTimerInterval: null }); }
            var left = Math.max(0, Math.round((tm.endTime - Date.now()) / 1000));
            if (left <= 0) {
              clearInterval(_ivl);
              playSound('speedEnd');
              addToast('\u23F1\uFE0F Time\'s up! You got ' + tm.score + '/' + tm.total + ' correct!', 'info');
              // Check speed run badges
              var ext2 = prev._multExt || _ext;
              var bUp = {};
              if (!ext2.badges.speedRunner) bUp.speedRunner = true;
              if (tm.score >= 20 && !ext2.badges.speedDemon) bUp.speedDemon = true;
              if (tm.total >= 10 && tm.score === tm.total && !ext2.badges.perfectRun) bUp.perfectRun = true;
              if (Object.keys(bUp).length > 0) {
                var newBadges = Object.assign({}, ext2.badges, bUp);
                Object.keys(bUp).forEach(function(bid) {
                  var badge = BADGES.find(function(b) { return b.id === bid; });
                  if (badge) { playSound('badge'); addToast(badge.icon + ' Badge: ' + badge.label + '!', 'success'); if (typeof awardXP === 'function') awardXP('multtable', 15, 'badge'); }
                });
                return Object.assign({}, prev, { _multTimer: Object.assign({}, tm, { active: false, timeLeft: 0 }), _multTimerInterval: null, _multExt: Object.assign({}, ext2, { badges: newBadges }) });
              }
              return Object.assign({}, prev, { _multTimer: Object.assign({}, tm, { active: false, timeLeft: 0 }), _multTimerInterval: null });
            }
            return Object.assign({}, prev, { _multTimer: Object.assign({}, tm, { timeLeft: left }) });
          });
        }, 500);
        labToolData._multTimerInterval = _ivl;
      }

      // ── Highlight cell state ──
      var highlightCell = labToolData._multHighlight || null;
      var setHighlightCell = function(cell) {
        setLabToolData(function(prev) { return Object.assign({}, prev, { _multHighlight: cell }); });
      };

      // ── Input disabled state ──
      var inputDisabled = labToolData._multInputDisabled || false;
      var setInputDisabled = function(val) {
        setLabToolData(function(prev) { return Object.assign({}, prev, { _multInputDisabled: val }); });
      };

      // ── Badge checker ──
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
              addToast(badge.icon + ' Badge: ' + badge.label + '!', 'success');
              if (typeof awardXP === 'function') awardXP('multtable', 15, 'badge');
            }
          });
        }
      }

      // ── Generate next problem ──
      function nextProblem() {
        var factors = pickFactors(exploreDifficulty, (_mt.adaptiveHistory || []));
        setMultTableChallenge({ a: factors.a, b: factors.b });
        setMultTableAnswer('');
        setMultTableFeedback(null);
        setHighlightCell(null);
        setInputDisabled(false);
      }

      // ── Check answer ──
      function checkMult() {
        if (!multTableChallenge || inputDisabled) return;
        var correct = multTableChallenge.a * multTableChallenge.b;
        var ok = parseInt(multTableAnswer) === correct;
        announceToSR(ok ? 'Correct!' : 'Incorrect, try again');

        // Sound
        playSound(ok ? 'correct' : 'wrong');

        // Update adaptive history
        var newHistory = (_mt.adaptiveHistory || []).concat([{ correct: ok }]);
        if (newHistory.length > 20) newHistory = newHistory.slice(-20);

        var newStreak = ok ? (_mt.streak || 0) + 1 : 0;

        // Streak sound
        if (ok && newStreak >= 3 && newStreak % 5 === 0) playSound('streak');

        setMultTableFeedback(ok ? {
          correct: true,
          msg: '\u2705 Correct! ' + multTableChallenge.a + ' \u00D7 ' + multTableChallenge.b + ' = ' + correct + (newStreak >= 3 ? '  \uD83D\uDD25 ' + newStreak + ' streak!' : '')
        } : {
          correct: false,
          msg: '\u274C Not quite. You said ' + multTableAnswer + ' \u2014 ' + multTableChallenge.a + ' \u00D7 ' + multTableChallenge.b + ' = ' + correct
        });

        setExploreScore(function(prev) {
          return { correct: prev.correct + (ok ? 1 : 0), total: prev.total + 1 };
        });

        if (ok && typeof awardXP === 'function') awardXP('multtable', 5, 'multiplication');

        // Speed Run tracking
        var missedUpdate = _mt.missed || [];
        if (_mt.active) {
          if (!ok) missedUpdate = missedUpdate.concat([{ a: multTableChallenge.a, b: multTableChallenge.b, answer: correct }]);
          _mtUpd({ score: _mt.score + (ok ? 1 : 0), total: _mt.total + 1, streak: newStreak, missed: missedUpdate, adaptiveHistory: newHistory });
        } else {
          _mtUpd({ streak: newStreak, adaptiveHistory: newHistory });
        }

        // Highlight correct cell on wrong answer
        if (!ok) {
          setHighlightCell({ r: multTableChallenge.a, c: multTableChallenge.b });
          if (multTableHidden) {
            setMultTableRevealed(function(prev) {
              var ns = new Set(prev);
              ns.add((multTableChallenge.a - 1) + '-' + (multTableChallenge.b - 1));
              return ns;
            });
          }
        }

        // Badge checks
        if (ok) {
          var newTotal = (_ext.totalCorrect || 0) + 1;
          var newSession = (_ext.sessionCorrect || 0) + 1;
          var newHidden = multTableHidden ? (_ext.hiddenCorrect || 0) + 1 : (_ext.hiddenCorrect || 0);
          var newSquares = Object.assign({}, _ext.squaresAnswered || {});
          if (multTableChallenge.a === multTableChallenge.b) newSquares[multTableChallenge.a] = true;
          var newRows = Object.assign({}, _ext.rowsAnswered || {});
          newRows[multTableChallenge.a] = true;
          newRows[multTableChallenge.b] = true;

          extUpd({ totalCorrect: newTotal, sessionCorrect: newSession, hiddenCorrect: newHidden, squaresAnswered: newSquares, rowsAnswered: newRows });

          // Check adaptive reaching hard
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
            mathlete: newSession >= 50
          });
        }

        // Disable input and auto-advance
        setInputDisabled(true);
        var delay = ok ? 1200 : (_mt.active ? 1500 : 2000);
        var _advanceTimer = setTimeout(function() {
          nextProblem();
          var _inp = document.getElementById('multtable-input');
          if (_inp) _inp.focus();
        }, delay);
        setLabToolData(function(prev) { return Object.assign({}, prev, { _multAdvanceTimer: _advanceTimer }); });
      }

      // ── AI Tutor ──
      function askAI() {
        if (_ext.aiLoading) return;
        extUpd({ showAI: true, aiLoading: true, aiResponse: '' });
        var prompt = 'You are a friendly math tutor helping a student practice multiplication. ';
        if (multTableChallenge) {
          prompt += 'They are working on ' + multTableChallenge.a + ' \u00D7 ' + multTableChallenge.b + '. ';
          if (multTableFeedback && !multTableFeedback.correct) {
            prompt += 'They answered incorrectly (said ' + multTableAnswer + ', correct is ' + (multTableChallenge.a * multTableChallenge.b) + '). ';
            prompt += 'Give a short, encouraging tip or trick to remember this multiplication fact. Use a memory trick, pattern, or visual strategy. Keep it to 2-3 sentences.';
          } else {
            prompt += 'Give a fun math fact or pattern about this multiplication. Keep it to 2-3 sentences.';
          }
        } else {
          var weakFactors = [];
          var missed = _mt.missed || [];
          if (missed.length > 0) {
            var counts = {};
            missed.forEach(function(m) { var k = m.a + 'x' + m.b; counts[k] = (counts[k] || 0) + 1; });
            var sorted = Object.keys(counts).sort(function(a, b) { return counts[b] - counts[a]; });
            weakFactors = sorted.slice(0, 3);
          }
          if (weakFactors.length > 0) {
            prompt += 'The student struggles with these facts: ' + weakFactors.join(', ').replace(/x/g, '\u00D7') + '. ';
            prompt += 'Give specific memory tricks or strategies for these facts. Keep it concise (3-4 sentences).';
          } else {
            prompt += 'Give a general multiplication tip, trick, or fun pattern (like the 9s finger trick or how to use doubles). Keep it to 2-3 sentences.';
          }
        }
        callGemini(prompt, false, false, 0.7).then(function(resp) {
          extUpd({ aiResponse: resp || 'No response received.', aiLoading: false });
        }).catch(function() {
          extUpd({ aiResponse: 'AI tutor is unavailable right now. Try again later!', aiLoading: false });
        });
      }

      // ── Keyboard shortcuts (managed without useEffect) ──
      if (window._multTableKbHandler) window.removeEventListener('keydown', window._multTableKbHandler);
      window._multTableKbHandler = function(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        var key = e.key.toLowerCase();
        if (key === 'q') { e.preventDefault(); nextProblem(); }
        if (key === 's' && !_mt.active) {
          e.preventDefault();
          nextProblem();
          _mtUpd({ active: true, endTime: Date.now() + 120000, score: 0, total: 0, timeLeft: 120, streak: 0, missed: [], adaptiveHistory: [] });
          if (labToolData._multTimerInterval) clearInterval(labToolData._multTimerInterval);
          labToolData._multTimerInterval = null;
          playSound('speedStart');
          addToast('\u23F1\uFE0F Speed Run started! 2 minutes on the clock!', 'success');
        }
        if (key === 'h') { e.preventDefault(); setMultTableHidden(!multTableHidden); setMultTableRevealed(new Set()); }
        if (key === '?' || (e.shiftKey && key === '/')) { e.preventDefault(); askAI(); }
        if (key === 'b') { e.preventDefault(); extUpd({ showBadges: !_ext.showBadges }); }
      };
      window.addEventListener('keydown', window._multTableKbHandler);

      // ── Difficulty button row ──
      var diffModes = [
        { id: 'easy',     label: 'Easy',     range: '2-5' },
        { id: 'medium',   label: 'Medium',   range: '2-9' },
        { id: 'hard',     label: 'Hard',     range: '2-12' },
        { id: 'adaptive', label: 'Adaptive', range: 'Auto' }
      ];

      // ── Build missed-problems deduped list ──
      function getUniqueMissed(missed) {
        var seen = {};
        return (missed || []).filter(function(m) {
          var key = m.a + 'x' + m.b;
          if (seen[key]) return false;
          seen[key] = true;
          return true;
        });
      }

      // ── Count earned badges ──
      var earnedBadges = BADGES.filter(function(b) { return _ext.badges[b.id]; });
      var earnedCount = earnedBadges.length;

      // ═══════════════════════════════
      // ═══ RENDER ═══
      // ═══════════════════════════════

      return h('div', { className: 'space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200' },

        // ── Header ──
        h('div', { className: 'flex items-center gap-3 mb-2' },
          h('button', {
            onClick: function() {
              setStemLabTool(null);
              if (_mt.active) { _mtUpd({ active: false }); if (labToolData._multTimerInterval) clearInterval(labToolData._multTimerInterval); }
            },
            className: 'p-1.5 hover:bg-slate-100 rounded-lg transition-colors',
            'aria-label': 'Back to tools'
          }, h(ArrowLeft, { size: 18, className: 'text-slate-500' })),
          h('h3', { className: 'text-lg font-bold text-pink-800' }, '\uD83D\uDD22 Multiplication Table'),
          h('div', { className: 'flex items-center gap-2 ml-2' },
            h('button', {
              onClick: function() { setMultTableHidden(!multTableHidden); setMultTableRevealed(new Set()); },
              className: 'text-[10px] font-bold px-2.5 py-0.5 rounded-full border transition-all ' +
                (multTableHidden ? 'bg-pink-500 text-white border-pink-500 shadow-sm' : 'text-slate-500 bg-slate-100 border-slate-200 hover:bg-slate-200'),
              title: 'Toggle hidden mode (H)'
            }, multTableHidden ? '\uD83D\uDE48 Hidden' : '\uD83D\uDC41 Visible'),
            h('div', { className: 'text-xs font-bold text-emerald-600' }, exploreScore.correct + '/' + exploreScore.total),
            // Streak badge
            (_mt.streak || 0) >= 2 && h('div', {
              className: 'text-xs font-bold text-orange-500 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full animate-pulse'
            }, '\uD83D\uDD25 ' + _mt.streak + ' streak!'),
            // Badge count
            earnedCount > 0 && h('button', {
              onClick: function() { extUpd({ showBadges: !_ext.showBadges }); },
              className: 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-all',
              title: 'View badges (B)'
            }, '\uD83C\uDFC5 ' + earnedCount + '/' + BADGES.length),
            // AI tutor button
            h('button', {
              onClick: askAI,
              className: 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-600 hover:bg-purple-100 transition-all',
              title: 'AI Tutor (?)'
            }, '\uD83E\uDDE0 AI')
          )
        ),

        // ── Badge panel ──
        _ext.showBadges && h('div', { className: 'bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-3 border-2 border-amber-200' },
          h('div', { className: 'flex items-center justify-between mb-2' },
            h('p', { className: 'text-sm font-bold text-amber-800' }, '\uD83C\uDFC5 Badges (' + earnedCount + '/' + BADGES.length + ')'),
            h('button', {
              onClick: function() { extUpd({ showBadges: false }); },
              className: 'text-xs text-slate-400 hover:text-slate-600'
            }, '\u2715')
          ),
          h('div', { className: 'grid grid-cols-3 sm:grid-cols-4 gap-2' },
            BADGES.map(function(badge) {
              var earned = !!_ext.badges[badge.id];
              return h('div', {
                key: badge.id,
                className: 'text-center p-2 rounded-lg border transition-all ' +
                  (earned ? 'bg-white border-amber-300 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-50'),
                title: badge.desc
              },
                h('div', { className: 'text-xl' }, earned ? badge.icon : '\uD83D\uDD12'),
                h('div', { className: 'text-[9px] font-bold mt-0.5 ' + (earned ? 'text-amber-800' : 'text-slate-400') }, badge.label)
              );
            })
          )
        ),

        // ── AI Tutor panel ──
        _ext.showAI && h('div', { className: 'bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-3 border-2 border-purple-200' },
          h('div', { className: 'flex items-center justify-between mb-2' },
            h('p', { className: 'text-sm font-bold text-purple-800' }, '\uD83E\uDDE0 AI Math Tutor'),
            h('button', {
              onClick: function() { extUpd({ showAI: false }); },
              className: 'text-xs text-slate-400 hover:text-slate-600'
            }, '\u2715')
          ),
          _ext.aiLoading
            ? h('div', { className: 'flex items-center gap-2' },
                h('div', { className: 'w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin' }),
                h('span', { className: 'text-xs text-purple-600' }, 'Thinking...')
              )
            : h('p', { className: 'text-sm text-purple-700 whitespace-pre-wrap leading-relaxed' }, _ext.aiResponse),
          !_ext.aiLoading && h('button', {
            onClick: askAI,
            className: 'mt-2 text-[10px] font-bold px-3 py-1 rounded-full bg-purple-100 text-purple-600 hover:bg-purple-200 border border-purple-200 transition-all'
          }, '\uD83D\uDD04 Ask Again')
        ),

        // ── Difficulty selector ──
        h('div', { className: 'flex gap-1 flex-wrap' },
          diffModes.map(function(dm) {
            var active = exploreDifficulty === dm.id;
            return h('button', {
              key: dm.id,
              onClick: function() { setExploreDifficulty(dm.id); },
              className: 'px-3 py-1 rounded-lg text-[10px] font-bold transition-all ' +
                (active
                  ? dm.id === 'easy' ? 'bg-green-500 text-white shadow-sm'
                    : dm.id === 'medium' ? 'bg-blue-500 text-white shadow-sm'
                    : dm.id === 'hard' ? 'bg-red-500 text-white shadow-sm'
                    : 'bg-purple-500 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200')
            }, dm.label + ' (' + dm.range + ')');
          })
        ),

        // ── Speed Run timer banner ──
        _mt.active && h('div', { className: 'bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-3 border-2 border-amber-300 flex items-center gap-3 animate-pulse' },
          h('span', { className: 'text-2xl' }, '\u23F1\uFE0F'),
          h('div', { className: 'flex-1' },
            h('div', { className: 'flex items-center justify-between' },
              h('span', { className: 'text-sm font-bold text-amber-800' },
                'Speed Run \u2014 ' + Math.floor(_mt.timeLeft / 60) + ':' + String(_mt.timeLeft % 60).padStart(2, '0')),
              h('span', { className: 'text-xs font-bold text-emerald-600' },
                '\u2705 ' + _mt.score + '/' + _mt.total)
            ),
            h('div', { className: 'w-full h-2 bg-amber-200 rounded-full mt-1 overflow-hidden' },
              h('div', { className: 'h-full rounded-full transition-all duration-500', style: {
                width: Math.round((_mt.timeLeft / 120) * 100) + '%',
                background: _mt.timeLeft > 30 ? 'linear-gradient(90deg, #f59e0b, #fb923c)' : 'linear-gradient(90deg, #ef4444, #f87171)'
              }})
            )
          ),
          h('button', {
            onClick: function() {
              _mtUpd({ active: false });
              if (labToolData._multTimerInterval) clearInterval(labToolData._multTimerInterval);
              playSound('speedEnd');
              addToast('\u23F1\uFE0F Speed Run ended! ' + _mt.score + '/' + _mt.total + ' correct', 'info');
            },
            className: 'px-3 py-1.5 bg-red-500 text-white font-bold rounded-lg text-xs hover:bg-red-600 transition-all'
          }, 'Stop')
        ),

        // ── Speed Run results (when just ended) ──
        !_mt.active && _mt.total > 0 && _mt.timeLeft === 0 && h('div', { className: 'bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border-2 border-emerald-300' },
          h('div', { className: 'text-center' },
            h('p', { className: 'text-lg font-bold text-emerald-800' }, '\uD83C\uDFC6 Speed Run Complete!'),
            h('p', { className: 'text-2xl font-bold text-emerald-600 mt-1' }, _mt.score + ' / ' + _mt.total),
            h('p', { className: 'text-xs text-emerald-500 mt-1' },
              _mt.total > 0 ? Math.round((_mt.score / _mt.total) * 100) + '% accuracy' : '')
          ),
          // Wrong-answer review
          _mt.missed && _mt.missed.length > 0 && h('div', { className: 'mt-3 bg-white rounded-lg p-3 border border-red-200' },
            h('p', { className: 'text-xs font-bold text-red-700 mb-2' }, '\uD83D\uDCDD Review Mistakes (' + getUniqueMissed(_mt.missed).length + ')'),
            h('div', { className: 'flex flex-wrap gap-1.5' },
              getUniqueMissed(_mt.missed).map(function(m, i) {
                return h('span', { key: i, className: 'inline-flex items-center gap-1 px-2 py-1 bg-red-50 border border-red-200 rounded-lg text-xs font-bold text-red-700' },
                  m.a + ' \u00D7 ' + m.b + ' = ' + m.answer
                );
              })
            ),
            h('button', {
              onClick: function() {
                var missed = getUniqueMissed(_mt.missed);
                var pick = missed[Math.floor(Math.random() * missed.length)];
                setMultTableChallenge({ a: pick.a, b: pick.b });
                setMultTableAnswer('');
                setMultTableFeedback(null);
                setHighlightCell(null);
                setInputDisabled(false);
                _mtUpd({ score: 0, total: 0, timeLeft: 120, missed: _mt.missed });
              },
              className: 'mt-2 px-4 py-1.5 bg-red-500 text-white font-bold rounded-lg text-xs hover:bg-red-600 transition-all'
            }, '\uD83C\uDFAF Practice These')
          ),
          h('button', {
            onClick: function() { _mtUpd({ score: 0, total: 0, timeLeft: 120, missed: [], streak: 0 }); },
            className: 'mt-2 px-4 py-1.5 bg-emerald-500 text-white font-bold rounded-lg text-xs hover:bg-emerald-600 transition-all'
          }, '\uD83D\uDD04 Try Again')
        ),

        // ── 12×12 Grid ──
        h('div', { className: 'bg-white rounded-xl border-2 border-pink-200 p-3 overflow-x-auto' },
          h('table', { className: 'border-collapse w-full text-center' },
            h('thead', null,
              h('tr', null,
                h('th', { className: 'w-8 h-8 text-[10px] font-bold text-pink-400' }, '\u00D7'),
                Array.from({ length: maxNum }).map(function(_, c) {
                  var isColHL = multTableHover && multTableHover.c === c + 1;
                  return h('th', { key: c, className: 'w-8 h-8 text-xs font-bold ' + (isColHL ? 'text-pink-700 bg-pink-100' : 'text-pink-500') }, c + 1);
                })
              )
            ),
            h('tbody', null,
              Array.from({ length: maxNum }).map(function(_, r) {
                var isRowHL = multTableHover && multTableHover.r === r + 1;
                return h('tr', { key: r },
                  h('td', { className: 'w-8 h-8 text-xs font-bold ' + (isRowHL ? 'text-pink-700 bg-pink-100' : 'text-pink-500') }, r + 1),
                  Array.from({ length: maxNum }).map(function(_, c) {
                    var val = (r + 1) * (c + 1);
                    var isHovered = multTableHover && (multTableHover.r === r + 1 || multTableHover.c === c + 1);
                    var isExact = multTableHover && multTableHover.r === r + 1 && multTableHover.c === c + 1;
                    var isPerfectSquare = r === c;
                    var isHighlighted = highlightCell && highlightCell.r === r + 1 && highlightCell.c === c + 1;

                    return h('td', {
                      key: c,
                      onMouseEnter: function() { setMultTableHover({ r: r + 1, c: c + 1 }); },
                      onMouseLeave: function() { setMultTableHover(null); },
                      onClick: function() {
                        setMultTableChallenge({ a: r + 1, b: c + 1 });
                        setMultTableAnswer('');
                        setMultTableFeedback(null);
                        setHighlightCell(null);
                        setInputDisabled(false);
                      },
                      className: 'w-8 h-8 text-[11px] font-mono cursor-pointer transition-all border border-slate-100 ' +
                        (isHighlighted
                          ? 'bg-amber-400 text-amber-900 font-bold ring-2 ring-amber-500 ring-offset-1 rounded scale-110 shadow-lg animate-pulse'
                          : isExact
                            ? 'bg-pink-500 text-white font-bold scale-110 shadow-lg rounded'
                            : isHovered
                              ? 'bg-pink-50 text-pink-800 font-semibold'
                              : isPerfectSquare
                                ? 'bg-indigo-50 text-indigo-700 font-semibold'
                                : 'text-slate-600 hover:bg-slate-50')
                    }, multTableHidden && !isExact && !isHighlighted && !(multTableRevealed instanceof Set && multTableRevealed.has(r + '-' + c)) ? '?' : val);
                  })
                );
              })
            )
          )
        ),

        // ── Action buttons ──
        h('div', { className: 'flex gap-2 flex-wrap' },
          h('button', {
            onClick: function() { nextProblem(); },
            className: 'flex-1 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-lg text-sm hover:from-pink-600 hover:to-rose-600 transition-all shadow-md',
            title: 'Quick Quiz (Q)'
          }, '\uD83C\uDFAF Quick Quiz'),
          h('button', {
            onClick: function() {
              nextProblem();
              _mtUpd({ active: true, endTime: Date.now() + 120000, score: 0, total: 0, timeLeft: 120, streak: 0, missed: [], adaptiveHistory: [] });
              if (labToolData._multTimerInterval) clearInterval(labToolData._multTimerInterval);
              labToolData._multTimerInterval = null;
              playSound('speedStart');
              addToast('\u23F1\uFE0F Speed Run started! 2 minutes on the clock!', 'success');
            },
            className: 'flex-1 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-lg text-sm hover:from-amber-600 hover:to-orange-600 transition-all shadow-md',
            title: 'Speed Run (S)'
          }, '\u23F1\uFE0F Speed Run (2min)'),
          h('button', {
            onClick: function() {
              setMultTableChallenge(null);
              setMultTableAnswer('');
              setMultTableFeedback(null);
              setMultTableHover(null);
              setMultTableRevealed(new Set());
              setHighlightCell(null);
              setInputDisabled(false);
              if (_mt.active) { _mtUpd({ active: false }); if (labToolData._multTimerInterval) clearInterval(labToolData._multTimerInterval); }
            },
            className: 'px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300 transition-all'
          }, '\u21BA Reset')
        ),

        // ── Challenge area ──
        multTableChallenge && h('div', { className: 'bg-pink-50 rounded-lg p-3 border border-pink-200' },
          h('p', { className: 'text-lg font-bold text-pink-800 mb-2 text-center' },
            multTableChallenge.a + ' \u00D7 ' + multTableChallenge.b + ' = ?'),
          h('div', { className: 'flex gap-2 items-center justify-center' },
            h('input', {
              type: 'number',
              value: multTableAnswer,
              onChange: function(e) { if (!inputDisabled) setMultTableAnswer(e.target.value); },
              onKeyDown: function(e) { if (e.key === 'Enter' && multTableAnswer && !inputDisabled) checkMult(); },
              className: 'w-20 px-3 py-2 text-center text-lg font-bold border-2 rounded-lg outline-none transition-all ' +
                (inputDisabled
                  ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                  : 'border-pink-300 focus:border-pink-500'),
              placeholder: '?',
              autoFocus: true,
              disabled: inputDisabled,
              id: 'multtable-input'
            }),
            h('button', {
              onClick: checkMult,
              disabled: !multTableAnswer || inputDisabled,
              className: 'px-4 py-2 bg-pink-500 text-white font-bold rounded-lg hover:bg-pink-600 transition-all disabled:opacity-40'
            }, '\u2714 Check'),
            // AI hint button during challenge
            h('button', {
              onClick: askAI,
              className: 'px-3 py-2 bg-purple-100 text-purple-600 font-bold rounded-lg hover:bg-purple-200 transition-all text-sm',
              title: 'Get a hint from AI'
            }, '\uD83E\uDDE0')
          ),
          // Feedback
          multTableFeedback && h('p', {
            className: 'text-sm font-bold mt-2 text-center ' + (multTableFeedback.correct ? 'text-green-600' : 'text-red-600')
          }, multTableFeedback.msg),
          // Auto-advance indicator + Skip button
          multTableFeedback && inputDisabled && h('div', { className: 'flex items-center justify-center gap-2 mt-1' },
            h('p', { className: 'text-[10px] text-slate-400 animate-pulse' }, 'Next question coming...'),
            h('button', {
              onClick: function() {
                if (labToolData._multAdvanceTimer) clearTimeout(labToolData._multAdvanceTimer);
                nextProblem();
                setTimeout(function() { var _inp = document.getElementById('multtable-input'); if (_inp) _inp.focus(); }, 50);
              },
              className: 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-100 text-pink-600 hover:bg-pink-200 border border-pink-200 transition-all'
            }, 'Skip \u2192 Next')
          )
        ),

        // ── Keyboard shortcuts legend ──
        h('div', { className: 'text-[10px] text-slate-400 text-center space-x-3' },
          h('span', null, 'Q Quiz'),
          h('span', null, 'S Speed'),
          h('span', null, 'H Hidden'),
          h('span', null, 'B Badges'),
          h('span', null, '? AI Tutor')
        ),

        // ── Legend ──
        h('div', { className: 'text-[10px] text-slate-400 text-center' },
          h('span', { className: 'inline-block w-3 h-3 bg-indigo-50 border border-indigo-200 rounded mr-1' }), ' Perfect squares',
          h('span', { className: 'ml-3 inline-block w-3 h-3 bg-pink-50 border border-pink-200 rounded mr-1' }), ' Hover cross',
          h('span', { className: 'ml-3 inline-block w-3 h-3 bg-pink-500 rounded mr-1' }), ' Selected',
          h('span', { className: 'ml-3 inline-block w-3 h-3 bg-amber-400 border border-amber-500 rounded mr-1' }), ' Correct answer'
        )
      );
    }
  });
})();
