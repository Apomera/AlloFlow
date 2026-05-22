// ═══════════════════════════════════════════
// stem_tool_multtable.js — Multiplication Table Plugin (Enhanced v3)
// 3 tabs: Practice, Visual (area-model bridge), Patterns (discovery)
// + sound effects (mutable), 12 badges, AI tutor, Quick Quiz, Speed Run,
//   streaks, adaptive difficulty, wrong-answer review, hidden mode,
//   dot-array visualization with skip-count overlay + commutativity twin,
//   interactive pattern explorer (5s, 9s, squares, doubles, distributive),
//   atmospheric backgrounds per tab, keyboard shortcuts
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

  // MultTable v3: atmospheric backgrounds + dot-array animations
  (function() {
    if (document.getElementById('allo-multtable-v3-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-multtable-v3-css';
    st.textContent = [
      '@keyframes allo-mt-dot-in { 0% { transform: scale(0); opacity: 0; } 60% { transform: scale(1.15); } 100% { transform: scale(1); opacity: 1; } }',
      '@keyframes allo-mt-cell-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(236,72,153,0.55); } 50% { box-shadow: 0 0 0 6px rgba(236,72,153,0); } }',
      '.allo-mt-dot { animation: allo-mt-dot-in 0.22s ease-out backwards; }',
      '.allo-mt-pattern-cell { animation: allo-mt-cell-pulse 1.6s ease-in-out 2; }',
      '.allo-mt-bg-practice { background: radial-gradient(ellipse 1100px 480px at 50% -10%, rgba(236,72,153,0.10) 0%, rgba(236,72,153,0.04) 35%, rgba(255,255,255,0) 70%), linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); border-radius: 16px; padding: 10px; }',
      '.allo-mt-bg-visual   { background: radial-gradient(ellipse 1100px 480px at 50% -10%, rgba(217,119,6,0.10)  0%, rgba(217,119,6,0.04)  35%, rgba(255,255,255,0) 70%), linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); border-radius: 16px; padding: 10px; }',
      '.allo-mt-bg-patterns { background: radial-gradient(ellipse 1100px 480px at 50% -10%, rgba(99,102,241,0.10)  0%, rgba(99,102,241,0.04) 35%, rgba(255,255,255,0) 70%), linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); border-radius: 16px; padding: 10px; }',
      '@media (prefers-reduced-motion: reduce) { .allo-mt-dot, .allo-mt-pattern-cell { animation: none !important; } }'
    ].join('\n');
    document.head.appendChild(st);
  })();


  // ── Difficulty presets ──
  var DIFFICULTY = {
    easy:   { min: 2, max: 5,  label: 'Easy' },
    medium: { min: 2, max: 9,  label: 'Medium' },
    hard:   { min: 2, max: 12, label: 'Hard' }
  };

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
    '6x11': { trick: '6×11 = 66. For 11 × 1-9, the answer is just the digit doubled.', icon: '1️⃣1️⃣' },
    '7x11': { trick: '7×11 = 77. Digit-doubling trick for 11 × 1-9.', icon: '1️⃣1️⃣' },
    '8x11': { trick: '8×11 = 88. Digit-doubling trick for 11 × 1-9.', icon: '1️⃣1️⃣' },
    '6x12': { trick: '6×12 = 72. Split: 6×12 = 6×10 + 6×2 = 60 + 12 = 72.', icon: '✂️' },
    '7x12': { trick: '7×12 = 84. Split: 7×12 = 7×10 + 7×2 = 70 + 14 = 84.', icon: '✂️' },
    '8x12': { trick: '8×12 = 96. Split: 8×12 = 8×10 + 8×2 = 80 + 16 = 96.', icon: '✂️' },
    '9x11': { trick: '9×11 = 99. 9s digits sum to 9 AND 11s repeat the digit.', icon: '🎯' },
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

  // ── Sound effects ──
  var _audioCtx = null;
  function getAudioCtx() {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return _audioCtx;
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
    { id: 'mathlete',      icon: '\uD83C\uDFC6', label: 'Mathlete',    desc: '50 correct in one session' },
    { id: 'trickyMaster',  icon: '\uD83E\uDDE9', label: 'Tricky Master', desc: '10 correct on Tricky 15 facts' },
    { id: 'patternFinder', icon: '\uD83D\uDD0D', label: 'Pattern Finder', desc: 'Explore 5+ patterns in the Patterns tab' },
    { id: 'visualLearner', icon: '\uD83D\uDFE9', label: 'Visual Learner', desc: 'Explore 10 facts in the Visual tab' }
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

      // ── v3: tab + visual + patterns state (all in _multExt for persistence) ──
      var mtTab = _ext.mtTab || 'practice';       // practice | visual | patterns
      var muted = _ext.muted || false;
      window._multTableMuted = muted;             // synced flag read by playSound (module-scope fn)
      var visualA = _ext.visualA || 7;            // current visual-mode factor a (rows)
      var visualB = _ext.visualB || 8;            // current visual-mode factor b (cols)
      var visualSkipOn = _ext.visualSkipOn !== false;  // default ON (skip-count overlay)
      var patternId = _ext.patternId || null;     // selected pattern in Patterns tab

      // Round-2 additions
      var quizMode = _ext.quizMode || 'mult';     // 'mult' | 'div' | 'mixed'
      var factScores = _ext.factScores || {};     // { tkey: { attempts, correct } } persistent
      var showHeatmap = _ext.showHeatmap || false;

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
        // Decide presentation mode based on quizMode
        var mode = 'mult';
        if (quizMode === 'div') mode = 'div';
        else if (quizMode === 'mixed') mode = (Math.random() < 0.5 ? 'mult' : 'div');
        // For division, randomize which factor is the divisor
        var divisor = (mode === 'div') ? (Math.random() < 0.5 ? factors.a : factors.b) : null;
        setMultTableChallenge({ a: factors.a, b: factors.b, mode: mode, divisor: divisor });
        setMultTableAnswer('');
        setMultTableFeedback(null);
        setHighlightCell(null);
        setInputDisabled(false);
      }

      // ── Check answer ──
      function checkMult() {
        if (!multTableChallenge || inputDisabled) return;
        // Compute the correct answer based on mode (mult or div)
        var correct;
        if (multTableChallenge.mode === 'div') {
          // For division: answer is the non-divisor factor
          correct = (multTableChallenge.divisor === multTableChallenge.a) ? multTableChallenge.b : multTableChallenge.a;
        } else {
          correct = multTableChallenge.a * multTableChallenge.b;
        }
        var ok = parseInt(multTableAnswer) === correct;
        announceToSR(ok ? 'Correct!' : 'Incorrect, try again');

        // Per-fact mastery tracking (persistent across sessions)
        var fkey = tkey(multTableChallenge.a, multTableChallenge.b);
        var prevScore = factScores[fkey] || { attempts: 0, correct: 0 };
        var newScore = { attempts: prevScore.attempts + 1, correct: prevScore.correct + (ok ? 1 : 0) };
        var newFactScores = Object.assign({}, factScores);
        newFactScores[fkey] = newScore;

        // Sound
        playSound(ok ? 'correct' : 'wrong');

        // Update adaptive history
        var newHistory = (_mt.adaptiveHistory || []).concat([{ correct: ok }]);
        if (newHistory.length > 20) newHistory = newHistory.slice(-20);

        var newStreak = ok ? (_mt.streak || 0) + 1 : 0;

        // Streak sound
        if (ok && newStreak >= 3 && newStreak % 5 === 0) playSound('streak');

        // Build fact family AND mode-appropriate feedback text.
        // The fact family is the same regardless of presentation mode \u2014 same numbers, four faces.
        var product = multTableChallenge.a * multTableChallenge.b;
        var factFamily = null;
        if (ok && multTableChallenge.a !== multTableChallenge.b) {
          factFamily = multTableChallenge.a + ' \u00D7 ' + multTableChallenge.b + ' = ' + product +
            ',  ' + multTableChallenge.b + ' \u00D7 ' + multTableChallenge.a + ' = ' + product +
            ',  ' + product + ' \u00F7 ' + multTableChallenge.a + ' = ' + multTableChallenge.b +
            ',  ' + product + ' \u00F7 ' + multTableChallenge.b + ' = ' + multTableChallenge.a;
        } else if (ok) {
          factFamily = multTableChallenge.a + ' \u00D7 ' + multTableChallenge.a + ' = ' + product +
            ',  ' + product + ' \u00F7 ' + multTableChallenge.a + ' = ' + multTableChallenge.a;
        }

        // Equation string for the current presentation mode
        var eqStr;
        if (multTableChallenge.mode === 'div') {
          eqStr = product + ' \u00F7 ' + multTableChallenge.divisor + ' = ' + correct;
        } else {
          eqStr = multTableChallenge.a + ' \u00D7 ' + multTableChallenge.b + ' = ' + correct;
        }

        setMultTableFeedback(ok ? {
          correct: true,
          msg: '\u2705 Correct! ' + eqStr + (newStreak >= 3 ? '  \uD83D\uDD25 ' + newStreak + ' streak!' : ''),
          factFamily: factFamily,
          isTricky: isTrickyFact(multTableChallenge.a, multTableChallenge.b)
        } : {
          correct: false,
          msg: '\u274C Not quite. You said ' + multTableAnswer + ' \u2014 ' + eqStr,
          isTricky: isTrickyFact(multTableChallenge.a, multTableChallenge.b),
          trickKey: tkey(multTableChallenge.a, multTableChallenge.b)
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
          // Persist factScores on wrong answers too (the if(ok) branch handles correct path)
          extUpd({ factScores: newFactScores });
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
          var newTricky = (_ext.trickySolved || 0) + (isTrickyFact(multTableChallenge.a, multTableChallenge.b) ? 1 : 0);

          extUpd({ totalCorrect: newTotal, sessionCorrect: newSession, hiddenCorrect: newHidden, squaresAnswered: newSquares, rowsAnswered: newRows, trickySolved: newTricky, factScores: newFactScores });

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
            mathlete: newSession >= 50,
            trickyMaster: newTricky >= 10,
            patternFinder: Object.keys(_ext.patternsExplored || {}).length >= 5,
            visualLearner: Object.keys(_ext.visualExplored || {}).length >= 10
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
        { id: 'adaptive', label: 'Adaptive', range: 'Auto' },
        { id: 'tricky',   label: 'Tricky 15', range: 'Hard facts' }
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

      // ═══ VISUAL TAB: dot-array bridge for multiplication facts ═══
      // For dyscalculic kids: memorization comes AFTER understanding. Showing 7×8
      // as a 7-row-by-8-col dot grid, with skip-count totals down the side, lets
      // them count to find the answer. Then the commutativity twin (8×7) shows
      // "learn one, know two."
      var renderVisual = function() {
        var a = Math.max(1, Math.min(12, visualA));
        var b = Math.max(1, Math.min(12, visualB));
        var product = a * b;
        var trickyHere = isTrickyFact(a, b);
        var trickHere = trickyHere ? MEMORY_TRICKS[tkey(a, b)] : null;
        // Track exploration for the Visual Learner badge (dedupe by fact key)
        // Fire-and-forget; only updates when the fact key changes.
        var visExplored = _ext.visualExplored || {};
        var curKey = tkey(a, b);
        if (!visExplored[curKey]) {
          setTimeout(function() {
            var explored = Object.assign({}, _ext.visualExplored || {});
            explored[curKey] = true;
            extUpd({ visualExplored: explored });
            if (Object.keys(explored).length >= 10 && !_ext.badges.visualLearner) {
              checkBadges({
                firstCorrect: !!_ext.badges.firstCorrect, streak5: !!_ext.badges.streak5,
                streak10: !!_ext.badges.streak10, streak20: !!_ext.badges.streak20,
                squareMaster: !!_ext.badges.squareMaster, hiddenHero: !!_ext.badges.hiddenHero,
                adaptiveAce: !!_ext.badges.adaptiveAce, centurion: !!_ext.badges.centurion,
                mathlete: !!_ext.badges.mathlete, trickyMaster: !!_ext.badges.trickyMaster,
                patternFinder: !!_ext.badges.patternFinder,
                visualLearner: Object.keys(explored).length >= 10
              });
            }
          }, 0);
        }
        // Color the rows so each row of 8 dots is visually one "skip"
        var rowColors = ['#dc2626', '#ea580c', '#d97706', '#16a34a', '#0891b2', '#2563eb', '#7c3aed', '#db2777', '#65a30d', '#0f766e', '#9333ea', '#be185d'];
        var dotSize = b <= 8 ? 18 : (b <= 10 ? 15 : 13);
        var dotGap = b <= 8 ? 6 : 4;

        var rows = [];
        for (var ri = 0; ri < a; ri++) {
          var dots = [];
          for (var ci = 0; ci < b; ci++) {
            dots.push(h('div', {
              key: 'dot-' + ri + '-' + ci,
              className: 'allo-mt-dot rounded-full',
              style: {
                width: dotSize, height: dotSize,
                backgroundColor: rowColors[ri % rowColors.length],
                animationDelay: (ri * 0.04 + ci * 0.015) + 's'
              }
            }));
          }
          var runningTotal = (ri + 1) * b;
          rows.push(h('div', { key: 'vrow-' + ri, className: 'flex items-center gap-2' },
            visualSkipOn && h('div', { className: 'text-xs font-bold text-amber-700 font-mono w-12 text-right pr-1', style: { fontVariantNumeric: 'tabular-nums' } },
              (ri === 0 ? b : '+' + b),
              h('span', { className: 'block text-[10px] text-amber-500' }, '=' + runningTotal)
            ),
            h('div', { className: 'flex', style: { gap: dotGap } }, dots)
          ));
        }

        return h('div', { className: 'space-y-3' },
          // Factor selectors
          h('div', { className: 'bg-amber-50 rounded-lg p-3 border border-amber-200' },
            h('div', { className: 'grid grid-cols-2 gap-3' },
              h('div', {},
                h('label', { className: 'block text-xs font-bold text-amber-800 mb-1' }, 'Rows (a)'),
                h('input', { type: 'range', min: '1', max: '12', value: a,
                  onChange: function(e) { extUpd({ visualA: parseInt(e.target.value, 10) }); },
                  'aria-label': 'Factor a (rows)',
                  className: 'w-full accent-amber-600'
                }),
                h('div', { className: 'text-center text-xl font-bold text-amber-800' }, a)
              ),
              h('div', {},
                h('label', { className: 'block text-xs font-bold text-amber-800 mb-1' }, 'Columns (b)'),
                h('input', { type: 'range', min: '1', max: '12', value: b,
                  onChange: function(e) { extUpd({ visualB: parseInt(e.target.value, 10) }); },
                  'aria-label': 'Factor b (columns)',
                  className: 'w-full accent-amber-600'
                }),
                h('div', { className: 'text-center text-xl font-bold text-amber-800' }, b)
              )
            ),
            h('div', { className: 'flex flex-wrap items-center gap-3 mt-2 text-[11px]' },
              h('label', { className: 'font-bold text-amber-700 flex items-center gap-1 cursor-pointer' },
                h('input', { type: 'checkbox', checked: visualSkipOn,
                  onChange: function() { playSound('default'); extUpd({ visualSkipOn: !visualSkipOn }); }
                }),
                'Skip-count overlay (column of running totals)'
              ),
              h('button', {
                onClick: function() { extUpd({ visualA: visualB, visualB: visualA }); announceToSR('Swapped to ' + visualB + ' by ' + visualA); },
                'aria-label': 'Swap factors (commutativity)',
                className: 'ml-auto px-2 py-1 rounded bg-violet-100 text-violet-700 border border-violet-300 font-bold hover:bg-violet-200'
              }, '⇄ Swap (commutativity)')
            )
          ),

          // The big visualization
          h('div', { className: 'bg-white rounded-xl border-2 border-amber-200 p-4 overflow-x-auto' },
            h('div', { className: 'text-center mb-3' },
              h('p', { className: 'text-2xl font-bold text-amber-900 font-mono' },
                a + ' × ' + b + ' = ',
                h('span', { className: 'text-3xl text-amber-700 ml-2' }, product)
              ),
              h('p', { className: 'text-[11px] text-amber-700 italic mt-1' },
                a + ' rows of ' + b + ' = ' + a + ' groups of ' + b + ' = ' + b + ' added ' + a + ' times'
              )
            ),
            h('div', { className: 'flex flex-col gap-2 items-center justify-center' }, rows)
          ),

          // Repeated-addition row + commutativity twin
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2' },
            h('div', { className: 'bg-amber-50 rounded-lg p-3 border border-amber-200' },
              h('p', { className: 'text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1' }, '➕ Repeated addition'),
              h('p', { className: 'text-sm font-mono font-bold text-amber-900' },
                Array.from({ length: a }, function() { return b; }).join(' + ') + ' = ' + product
              )
            ),
            h('div', { className: 'bg-violet-50 rounded-lg p-3 border border-violet-200' },
              h('p', { className: 'text-[10px] font-bold text-violet-700 uppercase tracking-wider mb-1' }, '⇄ Commutativity twin'),
              h('p', { className: 'text-sm font-mono font-bold text-violet-900' },
                a + ' × ' + b + ' = ' + b + ' × ' + a + ' = ' + product
              ),
              h('p', { className: 'text-[10px] text-violet-700 italic mt-0.5' },
                'Same dots, just turned sideways. Learn one fact, know two.'
              )
            )
          ),

          // Memory trick (when this fact is in TRICKY_15)
          trickHere && h('div', { className: 'bg-fuchsia-50 rounded-xl p-3 border-2 border-fuchsia-300' },
            h('p', { className: 'text-[11px] font-bold text-fuchsia-800 uppercase tracking-wider mb-1' },
              trickHere.icon + ' Memory trick for ' + a + ' × ' + b
            ),
            h('p', { className: 'text-sm text-fuchsia-900 leading-relaxed' }, trickHere.trick),
            h('p', { className: 'text-[10px] text-fuchsia-700 italic mt-1' },
              'This is one of the Tricky 15 facts — the small set that needs real recall. Switch to Practice → "Tricky 15" mode to drill it.'
            )
          ),

          // Fact family (multiplication ↔ division bridge)
          h('div', { className: 'bg-emerald-50 rounded-lg p-3 border border-emerald-200' },
            h('p', { className: 'text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1' }, '👨‍👩‍👧 Fact family — multiplication ↔ division'),
            h('p', { className: 'text-xs font-mono font-bold text-emerald-900' },
              a + ' × ' + b + ' = ' + product +
              (a === b ? '' : ',  ' + b + ' × ' + a + ' = ' + product) +
              ',  ' + product + ' ÷ ' + a + ' = ' + b +
              (a === b ? '' : ',  ' + product + ' ÷ ' + b + ' = ' + a)
            ),
            h('p', { className: 'text-[10px] text-emerald-700 italic mt-1' },
              'Same numbers, four faces. Knowing one fact gives you the others.'
            )
          ),

          // Quick presets focusing on hard facts (the "tricky middle" of the table)
          h('div', { className: 'flex flex-wrap items-center gap-1.5' },
            h('span', { className: 'text-[11px] font-bold text-amber-700 self-center mr-1' }, 'Tricky facts to visualize:'),
            [[6,7],[6,8],[6,9],[7,7],[7,8],[7,9],[8,8],[8,9],[9,9],[11,12],[12,12]].map(function(pair) {
              return h('button', { key: 'vp-' + pair[0] + '-' + pair[1],
                onClick: function() { extUpd({ visualA: pair[0], visualB: pair[1] }); },
                className: 'px-2 py-0.5 rounded text-[11px] font-mono bg-white text-amber-700 border border-amber-300 hover:bg-amber-100'
              }, pair[0] + '×' + pair[1]);
            })
          )
        );
      };

      // ═══ PATTERNS TAB: discover the structure of the times table ═══
      // Click a pattern chip → cells light up on the table + an explanation appears.
      // Builds number-sense ("WHY 9s digits add to 9") not just rote recall.
      var PATTERNS = [
        {
          id: 'fives', label: '5s end in 0 or 5', icon: '5️⃣', accent: '#0891b2',
          cellMatches: function(r, c) { return (r + 1) === 5 || (c + 1) === 5; },
          explain: 'Every multiple of 5 ends in either 0 or 5. Look: 5×1=5, 5×2=10, 5×3=15, 5×4=20… alternating. This is the easiest column to memorize first.'
        },
        {
          id: 'nines', label: '9s digits sum to 9', icon: '9️⃣', accent: '#dc2626',
          cellMatches: function(r, c) { return (r + 1) === 9 || (c + 1) === 9; },
          explain: 'For 9 × 1-10: the two digits of the answer always add to 9. 9×3=27 (2+7=9). 9×7=63 (6+3=9). Also: the tens digit is one less than what you multiplied by (9×7 → tens is 6, one less than 7).'
        },
        {
          id: 'squares', label: 'Perfect squares', icon: '⬛', accent: '#7c3aed',
          cellMatches: function(r, c) { return r === c; },
          explain: 'The diagonal: n × n. 1, 4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144. Memorize these and you cut a quarter of the table in half — every fact off the diagonal has a twin (commutativity).'
        },
        {
          id: 'doubles', label: 'Doubles (×2)', icon: '🔁', accent: '#16a34a',
          cellMatches: function(r, c) { return (r + 1) === 2 || (c + 1) === 2; },
          explain: '×2 is just doubling — adding the number to itself. 7×2 = 7+7 = 14. If you know your doubles, you also know ×4 (double again) and ×8 (double once more).'
        },
        {
          id: 'tens', label: '×10 adds a zero', icon: '🔟', accent: '#0f766e',
          cellMatches: function(r, c) { return (r + 1) === 10 || (c + 1) === 10; },
          explain: '×10 is the easiest: just put a 0 at the end. 7×10 = 70. This works because our number system is base 10. ×100 puts two zeros, ×1000 puts three, etc.'
        },
        {
          id: 'elevens', label: '11s repeat the digit (×1-9)', icon: '1️⃣1️⃣', accent: '#9333ea',
          cellMatches: function(r, c) { return (r + 1) === 11 || (c + 1) === 11; },
          explain: 'For 11 × 1 through 11 × 9: the answer is just that digit doubled. 11×3=33, 11×7=77. (11×10 breaks the pattern: 110. 11×11=121, 11×12=132.)'
        },
        {
          id: 'distributive', label: '7s = 5s + 2s (distributive)', icon: '✂️', accent: '#d97706',
          cellMatches: function(r, c) { return (r + 1) === 7 || (c + 1) === 7; },
          explain: 'Forgot 7×8? Split: 7×8 = (5+2)×8 = 5×8 + 2×8 = 40 + 16 = 56. Any "hard" fact can be split into two "easy" facts using the distributive property.'
        }
      ];

      var renderPatterns = function() {
        var selectedPattern = patternId ? PATTERNS.find(function(p) { return p.id === patternId; }) : null;

        // Build the 12×12 table with pattern highlighting
        var headerRow = [h('th', { key: 'corner', scope: 'col', className: 'w-8 h-8 text-[11px] font-bold text-indigo-400' }, '×')];
        for (var hc = 0; hc < maxNum; hc++) {
          var isColHighlight = selectedPattern && (selectedPattern.cellMatches(-1, hc) || selectedPattern.cellMatches(hc, hc));
          // Actually simpler: header is highlighted if the column has any highlighted cells
          var colHasMatch = false;
          if (selectedPattern) {
            for (var rr = 0; rr < maxNum; rr++) { if (selectedPattern.cellMatches(rr, hc)) { colHasMatch = true; break; } }
          }
          headerRow.push(h('th', { key: 'h' + hc, scope: 'col',
            className: 'w-8 h-8 text-xs font-bold ' + (colHasMatch ? 'text-white' : 'text-indigo-500'),
            style: colHasMatch ? { backgroundColor: selectedPattern.accent } : null
          }, hc + 1));
        }
        var bodyRows = [];
        for (var br = 0; br < maxNum; br++) {
          var rowHasMatch = false;
          if (selectedPattern) {
            for (var cc = 0; cc < maxNum; cc++) { if (selectedPattern.cellMatches(br, cc)) { rowHasMatch = true; break; } }
          }
          var cells = [h('td', { key: 'rh-' + br,
            className: 'w-8 h-8 text-xs font-bold ' + (rowHasMatch ? 'text-white' : 'text-indigo-500'),
            style: rowHasMatch ? { backgroundColor: selectedPattern.accent } : null
          }, br + 1)];
          for (var bc = 0; bc < maxNum; bc++) {
            var val = (br + 1) * (bc + 1);
            var isMatch = selectedPattern && selectedPattern.cellMatches(br, bc);
            cells.push(h('td', {
              key: 'pc-' + br + '-' + bc,
              className: 'w-8 h-8 text-[11px] font-mono border border-slate-100 transition-all ' +
                (isMatch ? 'font-bold text-white allo-mt-pattern-cell' : 'text-slate-600'),
              style: isMatch ? { backgroundColor: selectedPattern.accent, opacity: 0.92 } : null
            }, val));
          }
          bodyRows.push(h('tr', { key: 'br-' + br }, cells));
        }

        return h('div', { className: 'space-y-3' },
          // Pattern chip selector
          h('div', { className: 'bg-indigo-50 rounded-xl p-3 border border-indigo-200' },
            h('p', { className: 'text-[11px] font-bold text-indigo-800 mb-2' },
              '🔍 Pick a pattern to highlight. The table is full of structure — once you see it, half the facts become predictable.'
            ),
            h('div', { className: 'flex flex-wrap gap-1.5' },
              PATTERNS.map(function(p) {
                var active = patternId === p.id;
                return h('button', {
                  key: 'pat-' + p.id,
                  onClick: function() {
                    playSound('default');
                    // Track pattern exploration for the Pattern Finder badge
                    var explored = Object.assign({}, _ext.patternsExplored || {});
                    explored[p.id] = true;
                    extUpd({ patternId: active ? null : p.id, patternsExplored: explored });
                    if (!active && Object.keys(explored).length >= 5 && !_ext.badges.patternFinder) {
                      checkBadges({
                        firstCorrect: !!_ext.badges.firstCorrect, streak5: !!_ext.badges.streak5,
                        streak10: !!_ext.badges.streak10, streak20: !!_ext.badges.streak20,
                        squareMaster: !!_ext.badges.squareMaster, hiddenHero: !!_ext.badges.hiddenHero,
                        adaptiveAce: !!_ext.badges.adaptiveAce, centurion: !!_ext.badges.centurion,
                        mathlete: !!_ext.badges.mathlete, trickyMaster: !!_ext.badges.trickyMaster,
                        visualLearner: !!_ext.badges.visualLearner,
                        patternFinder: Object.keys(explored).length >= 5
                      });
                    }
                    announceToSR(active ? 'Pattern off' : 'Pattern: ' + p.label);
                  },
                  'aria-pressed': active,
                  className: 'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ' +
                    (active ? 'text-white shadow-sm' : 'bg-white text-indigo-700 border border-indigo-300 hover:bg-indigo-100'),
                  style: active ? { backgroundColor: p.accent, borderColor: p.accent } : null
                }, p.icon + ' ' + p.label);
              })
            )
          ),

          // The table with highlighting
          h('div', { className: 'bg-white rounded-xl border-2 border-indigo-200 p-3 overflow-x-auto' },
            h('table', { className: 'border-collapse w-full text-center', 'aria-label': 'Multiplication table with pattern highlighting' },
              h('caption', { className: 'sr-only' }, selectedPattern ? 'Showing pattern: ' + selectedPattern.label : 'Multiplication table'),
              h('thead', null, h('tr', null, headerRow)),
              h('tbody', null, bodyRows)
            )
          ),

          // Explanation for the selected pattern
          selectedPattern && h('div', { className: 'bg-white rounded-xl border-2 p-3', style: { borderColor: selectedPattern.accent + '88' } },
            h('p', { className: 'text-sm font-bold mb-1', style: { color: selectedPattern.accent } }, selectedPattern.icon + ' ' + selectedPattern.label),
            h('p', { className: 'text-xs text-slate-700 leading-relaxed' }, selectedPattern.explain)
          ),

          !selectedPattern && h('p', { className: 'text-xs text-indigo-700 italic text-center' },
            '👆 Click any pattern above to light up the cells and read the rule. Multiple patterns may overlap (e.g., 5×5 is both a "5s multiple" and a "perfect square").'
          ),

          // Pedagogy note
          h('details', { className: 'bg-white rounded-xl border border-indigo-200 p-3' },
            h('summary', { className: 'text-xs font-bold text-indigo-700 cursor-pointer' }, '💡 Why patterns beat brute memorization'),
            h('div', { className: 'mt-2 space-y-2 text-xs text-slate-700' },
              h('p', {}, h('b', {}, 'You only need to memorize about a third of the table. '),
                'Anything in the 1s, 2s, 5s, 10s, 11s columns has an easy rule. The squares are a small set (12 facts). What remains is the "tricky middle" — about 15 facts — that needs real recall: 6×7, 6×8, 6×9, 7×8, 7×9, 8×9 and their twins.'
              ),
              h('p', {}, h('b', {}, 'Distributive shortcut for the tricky middle. '),
                'Forget 7×8? 7×8 = 5×8 + 2×8 = 40 + 16 = 56. Build the hard fact from two easy ones. After enough repetitions, the answer becomes automatic.'
              ),
              h('p', {}, h('b', {}, 'For dyscalculia specifically: '),
                'Visualizing each fact as an area-model rectangle (Visual tab) or a pattern (this tab) gives you a path to the answer that does not require automatic recall. Recall builds eventually, but not from drilling alone.'
              )
            )
          )
        );
      };

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
          }, h(ArrowLeft, { size: 18, className: 'text-slate-600' })),
          h('h3', { className: 'text-lg font-bold text-pink-800' }, '\uD83D\uDD22 Multiplication Table'),
          h('div', { role: 'tablist', 'aria-expanded': String(multTableHidden), className: 'flex items-center gap-2 ml-2' },
            h('button', { 'aria-expanded': String(multTableHidden), 'aria-label': 'Toggle hidden mode (H)',
              onClick: function() { setMultTableHidden(!multTableHidden); setMultTableRevealed(new Set()); },
              className: 'text-[11px] font-bold px-2.5 py-0.5 rounded-full border transition-all ' +
                (multTableHidden ? 'bg-pink-700 text-white border-pink-500 shadow-sm' : 'text-slate-600 bg-slate-100 border-slate-200 hover:bg-slate-200'),
              title: 'Toggle hidden mode (H)'
            }, multTableHidden ? '\uD83D\uDE48 Hidden' : '\uD83D\uDC41 Visible'),
            h('div', { className: 'text-xs font-bold text-emerald-600' }, exploreScore.correct + '/' + exploreScore.total),
            // Streak badge
            (_mt.streak || 0) >= 2 && h('div', { 
              className: 'text-xs font-bold text-orange-800 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full animate-pulse'
            }, '\uD83D\uDD25 ' + _mt.streak + ' streak!'),
            // Badge count
            earnedCount > 0 && h('button', { 'aria-label': 'View badges (B)',
              onClick: function() { extUpd({ showBadges: !_ext.showBadges }); },
              className: 'text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 border border-amber-600 text-amber-700 hover:bg-amber-100 transition-all',
              title: 'View badges (B)'
            }, '\uD83C\uDFC5 ' + earnedCount + '/' + BADGES.length),
            // AI tutor button
            h('button', { onClick: askAI,
              className: 'text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-50 border border-purple-600 text-purple-600 hover:bg-purple-100 transition-all',
              title: 'AI Tutor (?)'
            }, '\uD83E\uDDE0 AI'),
            // Mute toggle (v3)
            h('button', {
              onClick: function() {
                var next = !muted;
                extUpd({ muted: next });
                window._multTableMuted = next;
                if (!next) { setTimeout(function() { playSound('default'); }, 0); }
                announceToSR(next ? 'Sound muted' : 'Sound on');
              },
              'aria-label': muted ? 'Unmute sound effects' : 'Mute sound effects',
              'aria-pressed': muted,
              title: muted ? 'Unmute (sounds are off)' : 'Mute (sounds are on)',
              className: 'text-base px-1.5 py-0.5 rounded-full hover:bg-slate-100 transition-colors ' + (muted ? 'text-slate-400' : 'text-pink-700')
            }, muted ? '\uD83D\uDD07' : '\uD83D\uDD0A'),
            // Reset (v3)
            h('button', {
              onClick: function() {
                setMultTableChallenge(null); setMultTableAnswer(''); setMultTableFeedback(null);
                setMultTableHover(null); setMultTableRevealed(new Set());
                setHighlightCell(null); setInputDisabled(false);
                if (_mt.active) { _mtUpd({ active: false }); if (labToolData._multTimerInterval) clearInterval(labToolData._multTimerInterval); }
                extUpd({ patternId: null, mtTab: 'practice', visualA: 7, visualB: 8 });
                announceToSR('Multiplication table reset');
              },
              'aria-label': 'Reset',
              title: 'Reset all',
              className: 'text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-all'
            }, '\u21BA Reset')
          )
        ),

        // Tab bar (v3)
        h('div', { className: 'flex gap-1 bg-pink-50 rounded-xl p-1 border border-pink-200', role: 'tablist', 'aria-label': 'Multiplication Table sections' },
          [
            { id: 'practice', icon: '\uD83C\uDFAF', label: 'Practice' },
            { id: 'visual',   icon: '\uD83D\uDFE9', label: 'Visual' },
            { id: 'patterns', icon: '\uD83D\uDD0D', label: 'Patterns' }
          ].map(function(tb) {
            var active = mtTab === tb.id;
            return h('button', { key: 'mtt-' + tb.id,
              onClick: function() { playSound('default'); extUpd({ mtTab: tb.id }); },
              role: 'tab', 'aria-selected': active,
              className: 'flex-1 py-2 px-2 rounded-lg text-xs font-bold transition-all ' +
                (active ? 'bg-white text-pink-800 shadow-sm' : 'text-pink-600 hover:text-pink-800')
            }, tb.icon + ' ' + tb.label);
          })
        ),

        // VISUAL TAB content
        mtTab === 'visual' && h('div', { className: 'allo-mt-bg-visual' }, renderVisual()),

        // PATTERNS TAB content
        mtTab === 'patterns' && h('div', { className: 'allo-mt-bg-patterns' }, renderPatterns()),

        // PRACTICE TAB content (existing body, wrapped)
        mtTab === 'practice' && h('div', { className: 'space-y-4 allo-mt-bg-practice' },

        // ── Badge panel ──
        _ext.showBadges && h('div', { className: 'bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-3 border-2 border-amber-200' },
          h('div', { className: 'flex items-center justify-between mb-2' },
            h('p', { className: 'text-sm font-bold text-amber-800' }, '\uD83C\uDFC5 Badges (' + earnedCount + '/' + BADGES.length + ')'),
            h('button', { onClick: function() { extUpd({ showBadges: false }); },
              className: 'text-xs text-slate-600 hover:text-slate-600'
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
                h('div', { className: 'text-[11px] font-bold mt-0.5 ' + (earned ? 'text-amber-800' : 'text-slate-600') }, badge.label)
              );
            })
          )
        ),

        // ── AI Tutor panel ──
        _ext.showAI && h('div', { className: 'bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-3 border-2 border-purple-200' },
          h('div', { className: 'flex items-center justify-between mb-2' },
            h('p', { className: 'text-sm font-bold text-purple-800' }, '\uD83E\uDDE0 AI Math Tutor'),
            h('button', { onClick: function() { extUpd({ showAI: false }); },
              className: 'text-xs text-slate-600 hover:text-slate-600'
            }, '\u2715')
          ),
          _ext.aiLoading
            ? h('div', { className: 'flex items-center gap-2' },
                h('div', { className: 'w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin' }),
                h('span', { className: 'text-xs text-purple-600' }, 'Thinking...')
              )
            : h('p', { className: 'text-sm text-purple-700 whitespace-pre-wrap leading-relaxed' }, _ext.aiResponse),
          !_ext.aiLoading && h('button', { 'aria-label': 'Ask Again',
            onClick: askAI,
            className: 'mt-2 text-[11px] font-bold px-3 py-1 rounded-full bg-purple-100 text-purple-600 hover:bg-purple-200 border border-purple-600 transition-all'
          }, '\uD83D\uDD04 Ask Again')
        ),

        // ── Quiz-mode toggle (Mult / Div / Mixed) ──
        h('div', { className: 'flex items-center gap-2 flex-wrap' },
          h('span', { className: 'text-[11px] font-bold text-slate-700' }, 'Direction:'),
          [
            { id: 'mult',  label: 'Multiplication', color: 'bg-pink-700' },
            { id: 'div',   label: 'Division',       color: 'bg-cyan-700' },
            { id: 'mixed', label: 'Mixed',          color: 'bg-violet-700' }
          ].map(function(qm) {
            var active = quizMode === qm.id;
            return h('button', { key: 'qm-' + qm.id,
              onClick: function() { playSound('default'); extUpd({ quizMode: qm.id }); },
              'aria-pressed': active,
              className: 'px-3 py-1 rounded-lg text-[11px] font-bold transition-all ' +
                (active ? qm.color + ' text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-400')
            }, qm.label);
          })
        ),

        // ── Difficulty selector ──
        h('div', { className: 'flex gap-1 flex-wrap' },
          diffModes.map(function(dm) {
            var active = exploreDifficulty === dm.id;
            return h('button', { key: dm.id,
              onClick: function() { setExploreDifficulty(dm.id); },
              className: 'px-3 py-1 rounded-lg text-[11px] font-bold transition-all ' +
                (active
                  ? dm.id === 'easy' ? 'bg-green-700 text-white shadow-sm'
                    : dm.id === 'medium' ? 'bg-blue-700 text-white shadow-sm'
                    : dm.id === 'hard' ? 'bg-red-700 text-white shadow-sm'
                    : dm.id === 'tricky' ? 'bg-fuchsia-700 text-white shadow-sm'
                    : 'bg-purple-500 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-400')
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
          h('button', { 'aria-label': 'Stop',
            onClick: function() {
              _mtUpd({ active: false });
              if (labToolData._multTimerInterval) clearInterval(labToolData._multTimerInterval);
              playSound('speedEnd');
              addToast('\u23F1\uFE0F Speed Run ended! ' + _mt.score + '/' + _mt.total + ' correct', 'info');
            },
            className: 'px-3 py-1.5 bg-red-700 text-white font-bold rounded-lg text-xs hover:bg-red-600 transition-all'
          }, 'Stop')
        ),

        // ── Speed Run results (when just ended) ──
        !_mt.active && _mt.total > 0 && _mt.timeLeft === 0 && (function() {
          var pct = Math.round((_mt.score / _mt.total) * 100);
          var tier = _mt.score === _mt.total && _mt.total >= 10 ? 'perfect'
                     : pct >= 90 ? 'fluent'
                     : pct >= 75 ? 'strong'
                     : pct >= 50 ? 'building'
                     : 'practice';
          var tierColor = tier === 'perfect' ? '#fbbf24'
                          : tier === 'fluent' ? '#10b981'
                          : tier === 'strong' ? '#16a34a'
                          : tier === 'building' ? '#f59e0b'
                          : '#dc2626';
          var tierIcon = tier === 'perfect' ? '\uD83C\uDFC6' : tier === 'fluent' ? '\u26A1' : tier === 'strong' ? '\uD83C\uDFAF' : tier === 'building' ? '\uD83D\uDCDA' : '\uD83D\uDD01';
          var tierTitle = tier === 'perfect' ? 'Perfect run'
                          : tier === 'fluent' ? 'Fact fluency'
                          : tier === 'strong' ? 'Strong recall'
                          : tier === 'building' ? 'Building recall'
                          : 'Keep practicing';
          var tierMsg = tier === 'perfect'
                        ? _mt.total + ' for ' + _mt.total + ' under timer pressure. Math-fact recall is automatic for you now \u2014 that frees working memory for harder problems.'
                        : tier === 'fluent'
                          ? 'Near-automatic recall. The 10% you missed are usually the same family (7s and 8s for most kids). Hit "Practice These" to lock them in.'
                          : tier === 'strong'
                            ? 'Strong recall under time pressure. Use the missed-list below to target weak spots \u2014 short focused practice beats long random drills.'
                            : tier === 'building'
                              ? 'Building real recall \u2014 the missed list is your roadmap. Practice 5 facts at a time, not the whole table.'
                              : 'Recall is still slow under pressure. That is normal. Use the table without timer for a few sessions before retrying Speed Run.';
          var rad = 38, circ = 2 * Math.PI * rad;
          var dashOff = circ - (pct / 100) * circ;
          return h('div', { className: 'rounded-xl overflow-hidden border-2', style: { borderColor: tierColor + 'aa', background: 'linear-gradient(135deg, ' + tierColor + '15, #ecfdf5)' } },
            h('div', { className: 'p-4 flex flex-wrap items-center gap-4' },
              h('div', { className: 'relative flex-shrink-0', style: { width: 92, height: 92 } },
                h('svg', { viewBox: '0 0 100 100', width: 92, height: 92,
                  'aria-label': 'Score: ' + _mt.score + ' out of ' + _mt.total
                },
                  h('circle', { cx: 50, cy: 50, r: rad, fill: 'none', stroke: 'rgba(148,163,184,0.25)', strokeWidth: 9 }),
                  h('circle', { cx: 50, cy: 50, r: rad, fill: 'none', stroke: tierColor, strokeWidth: 9, strokeLinecap: 'round',
                    strokeDasharray: circ, strokeDashoffset: dashOff, transform: 'rotate(-90 50 50)' })
                ),
                h('div', { style: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } },
                  h('div', { style: { fontSize: 20, fontWeight: 900, color: tierColor, lineHeight: 1 } }, pct + '%'),
                  h('div', { style: { fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748b' } }, _mt.score + ' / ' + _mt.total)
                )
              ),
              h('div', { className: 'flex-1', style: { minWidth: 200 } },
                h('div', { style: { fontSize: 26, marginBottom: 2 }, 'aria-hidden': 'true' }, tierIcon),
                h('h3', { style: { margin: '0 0 4px', fontSize: 16, color: tierColor, fontWeight: 900, lineHeight: 1.15 } }, tierTitle),
                h('p', { style: { margin: 0, color: '#1e293b', fontSize: 12, lineHeight: 1.5 } }, tierMsg)
              )
            ),
            // Wrong-answer review (kept)
            _mt.missed && _mt.missed.length > 0 && h('div', { className: 'mx-4 mb-3 bg-white rounded-lg p-3 border border-red-200' },
              h('p', { className: 'text-xs font-bold text-red-700 mb-2' }, '\uD83D\uDCDD Review mistakes (' + getUniqueMissed(_mt.missed).length + ')'),
              h('div', { className: 'flex flex-wrap gap-1.5' },
                getUniqueMissed(_mt.missed).map(function(m, i) {
                  return h('span', { key: i, className: 'inline-flex items-center gap-1 px-2 py-1 bg-red-50 border border-red-200 rounded-lg text-xs font-bold text-red-700' },
                    m.a + ' \u00D7 ' + m.b + ' = ' + m.answer
                  );
                })
              ),
              h('button', { 'aria-label': 'Practice These',
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
                className: 'mt-2 px-4 py-1.5 bg-red-700 text-white font-bold rounded-lg text-xs hover:bg-red-600 transition-all'
              }, '\uD83C\uDFAF Practice these')
            ),
            h('div', { className: 'px-4 pb-4' },
              h('button', { 'aria-label': 'Try Again',
                onClick: function() { _mtUpd({ score: 0, total: 0, timeLeft: 120, missed: [], streak: 0 }); },
                className: 'px-4 py-1.5 bg-emerald-700 text-white font-bold rounded-lg text-xs hover:bg-emerald-600 transition-all'
              }, '\uD83D\uDD04 Try again')
            )
          );
        })(),

        // ── Mastery heatmap (per-fact tracking, persistent) ──
        (function() {
          var totalTracked = Object.keys(factScores).length;
          var masteryRow = h('div', { className: 'flex flex-wrap items-center gap-2 mb-2' },
            h('label', { className: 'text-[11px] font-bold text-emerald-800 flex items-center gap-1 cursor-pointer' },
              h('input', { type: 'checkbox', checked: showHeatmap,
                onChange: function() { playSound('default'); extUpd({ showHeatmap: !showHeatmap }); }
              }),
              '📊 Mastery heatmap (' + totalTracked + ' facts tracked)'
            ),
            showHeatmap && totalTracked > 0 && h('button', {
              onClick: function() {
                if (confirm('Clear all mastery tracking? This resets per-fact stats but keeps badges and totals.')) {
                  extUpd({ factScores: {} });
                  announceToSR('Mastery tracking cleared');
                }
              },
              className: 'ml-auto text-[10px] font-bold text-rose-600 hover:text-rose-800 underline'
            }, 'Clear mastery data')
          );
          if (!showHeatmap) return masteryRow;
          // Build the 12×12 mastery heatmap
          var rows = [];
          var headerCells = [h('th', { key: 'mh-corner', scope: 'col', className: 'w-7 h-7 text-[10px] font-bold text-emerald-400' }, '×')];
          for (var hc = 0; hc < maxNum; hc++) {
            headerCells.push(h('th', { key: 'mh-' + hc, scope: 'col', className: 'w-7 h-7 text-[10px] font-bold text-emerald-500' }, hc + 1));
          }
          for (var hr = 0; hr < maxNum; hr++) {
            var cells = [h('td', { key: 'mhr-' + hr, className: 'w-7 h-7 text-[10px] font-bold text-emerald-500' }, hr + 1)];
            for (var hcc = 0; hcc < maxNum; hcc++) {
              var key = tkey(hr + 1, hcc + 1);
              var score = factScores[key];
              var bgColor, textColor, content;
              if (!score || score.attempts === 0) {
                bgColor = '#f1f5f9'; textColor = '#94a3b8'; content = (hr + 1) * (hcc + 1);
              } else {
                var pct = score.correct / score.attempts;
                if (pct >= 0.85 && score.attempts >= 2) { bgColor = '#86efac'; textColor = '#14532d'; }
                else if (pct >= 0.6) { bgColor = '#fcd34d'; textColor = '#78350f'; }
                else { bgColor = '#fca5a5'; textColor = '#7f1d1d'; }
                content = (hr + 1) * (hcc + 1);
              }
              cells.push(h('td', {
                key: 'mh-' + hr + '-' + hcc,
                title: score ? (score.correct + '/' + score.attempts + ' correct (' + Math.round(((score.correct/score.attempts)||0) * 100) + '%)') : 'Not yet attempted',
                onClick: function(r, c) {
                  return function() {
                    setMultTableChallenge({ a: r + 1, b: c + 1, mode: quizMode === 'div' ? 'div' : 'mult', divisor: quizMode === 'div' ? (Math.random() < 0.5 ? r+1 : c+1) : null });
                    setMultTableAnswer(''); setMultTableFeedback(null);
                    setHighlightCell(null); setInputDisabled(false);
                    var _inp = document.getElementById('multtable-input'); if (_inp) _inp.focus();
                  };
                }(hr, hcc),
                style: { backgroundColor: bgColor, color: textColor, cursor: 'pointer' },
                className: 'w-7 h-7 text-[10px] font-mono border border-slate-200 transition-all hover:scale-110'
              }, content));
            }
            rows.push(h('tr', { key: 'mhrow-' + hr }, cells));
          }
          return h('div', { className: 'bg-white rounded-xl border-2 border-emerald-200 p-3' },
            masteryRow,
            h('p', { className: 'text-[10px] text-emerald-700 italic mb-2' },
              'Each cell = a multiplication fact. Color = your mastery so far. Click any cell to drill that exact fact.'
            ),
            h('div', { className: 'overflow-x-auto' },
              h('table', { className: 'border-collapse mx-auto text-center', 'aria-label': 'Mastery heatmap' },
                h('thead', null, h('tr', null, headerCells)),
                h('tbody', null, rows)
              )
            ),
            h('div', { className: 'flex items-center justify-center gap-3 mt-2 text-[10px]' },
              h('span', { className: 'inline-flex items-center gap-1' },
                h('span', { className: 'inline-block w-3 h-3 rounded', style: { backgroundColor: '#f1f5f9' } }), 'untried'),
              h('span', { className: 'inline-flex items-center gap-1' },
                h('span', { className: 'inline-block w-3 h-3 rounded', style: { backgroundColor: '#fca5a5' } }), '<60%'),
              h('span', { className: 'inline-flex items-center gap-1' },
                h('span', { className: 'inline-block w-3 h-3 rounded', style: { backgroundColor: '#fcd34d' } }), '60-84%'),
              h('span', { className: 'inline-flex items-center gap-1' },
                h('span', { className: 'inline-block w-3 h-3 rounded', style: { backgroundColor: '#86efac' } }), '≥85%')
            )
          );
        })(),

        // ── 12×12 Grid ──
        h('div', { className: 'bg-white rounded-xl border-2 border-pink-200 p-3 overflow-x-auto' },
          h('table', { className: 'border-collapse w-full text-center' },
            h('caption', { className: 'sr-only' }, 'Try Again'), h('thead', null,
              h('tr', null,
                h('th', { scope: 'col', className: 'w-8 h-8 text-[11px] font-bold text-pink-400' }, '\u00D7'),
                Array.from({ length: maxNum }).map(function(_, c) {
                  var isColHL = multTableHover && multTableHover.c === c + 1;
                  return h('th', { scope: 'col', key: c, className: 'w-8 h-8 text-xs font-bold ' + (isColHL ? 'text-pink-700 bg-pink-100' : 'text-pink-500') }, c + 1);
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
                            ? 'bg-pink-700 text-white font-bold scale-110 shadow-lg rounded'
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
          h('button', { 'aria-label': 'Quick Quiz',
            onClick: function() { nextProblem(); },
            className: 'flex-1 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-lg text-sm hover:from-pink-600 hover:to-rose-600 transition-all shadow-md',
            title: 'Quick Quiz (Q)'
          }, '\uD83C\uDFAF Quick Quiz'),
          h('button', { 'aria-label': 'Speed Run (2min)',
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
          h('button', { 'aria-label': 'Reset',
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
            multTableChallenge.mode === 'div'
              ? ((multTableChallenge.a * multTableChallenge.b) + ' \u00F7 ' + multTableChallenge.divisor + ' = ?')
              : (multTableChallenge.a + ' \u00D7 ' + multTableChallenge.b + ' = ?')),
          h('div', { className: 'flex gap-2 items-center justify-center' },
            h('input', {
              type: 'number',
              value: multTableAnswer,
              onChange: function(e) { if (!inputDisabled) setMultTableAnswer(e.target.value); },
              onKeyDown: function(e) { if (e.key === 'Enter' && multTableAnswer && !inputDisabled) checkMult(); },
              className: 'w-20 px-3 py-2 text-center text-lg font-bold border-2 rounded-lg transition-all ' +
                (inputDisabled
                  ? 'border-slate-200 bg-slate-50 text-slate-600 cursor-not-allowed'
                  : 'border-pink-600 focus:border-pink-500'),
              placeholder: '?',
              autoFocus: true,
              disabled: inputDisabled,
              id: 'multtable-input'
            }),
            h('button', { 'aria-label': 'Check',
              onClick: checkMult,
              disabled: !multTableAnswer || inputDisabled,
              className: 'px-4 py-2 bg-pink-700 text-white font-bold rounded-lg hover:bg-pink-600 transition-all disabled:opacity-40'
            }, '\u2714 Check'),
            // AI hint button during challenge
            h('button', { onClick: askAI,
              className: 'px-3 py-2 bg-purple-100 text-purple-600 font-bold rounded-lg hover:bg-purple-200 transition-all text-sm',
              title: 'Get a hint from AI'
            }, '\uD83E\uDDE0')
          ),
          // Feedback
          multTableFeedback && h('p', {
            className: 'text-sm font-bold mt-2 text-center ' + (multTableFeedback.correct ? 'text-green-600' : 'text-red-600')
          }, multTableFeedback.msg),

          // Fact family (correct answer + bridge to division)
          multTableFeedback && multTableFeedback.correct && multTableFeedback.factFamily && h('div', {
            className: 'mt-2 mx-auto bg-pink-50 rounded-lg px-3 py-2 border border-pink-200 max-w-md text-center'
          },
            h('p', { className: 'text-[10px] font-bold text-pink-700 uppercase tracking-wider mb-1' }, '👨‍👩‍👧 Fact family — same numbers, four faces'),
            h('p', { className: 'text-[11px] font-mono text-pink-900' }, multTableFeedback.factFamily)
          ),

          // Memory trick (when wrong AND the fact is in TRICKY_15)
          multTableFeedback && !multTableFeedback.correct && multTableFeedback.isTricky && MEMORY_TRICKS[multTableFeedback.trickKey] && h('div', {
            className: 'mt-2 mx-auto bg-amber-50 rounded-lg px-3 py-2 border border-amber-200 max-w-md'
          },
            h('p', { className: 'text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1' },
              MEMORY_TRICKS[multTableFeedback.trickKey].icon + ' Memory trick'
            ),
            h('p', { className: 'text-[12px] text-amber-900 leading-relaxed' }, MEMORY_TRICKS[multTableFeedback.trickKey].trick)
          ),
          // Auto-advance indicator + Skip button
          multTableFeedback && inputDisabled && h('div', { className: 'flex items-center justify-center gap-2 mt-1' },
            h('p', { className: 'text-[11px] text-slate-600 animate-pulse' }, 'Next question coming...'),
            h('button', { 'aria-label': 'Skip Next',
              onClick: function() {
                if (labToolData._multAdvanceTimer) clearTimeout(labToolData._multAdvanceTimer);
                nextProblem();
                setTimeout(function() { var _inp = document.getElementById('multtable-input'); if (_inp) _inp.focus(); }, 50);
              },
              className: 'text-[11px] font-bold px-2 py-0.5 rounded-full bg-pink-100 text-pink-600 hover:bg-pink-200 border border-pink-600 transition-all'
            }, 'Skip \u2192 Next')
          )
        ),

        // ── Keyboard shortcuts legend ──
        h('div', { className: 'text-[11px] text-slate-600 text-center space-x-3' },
          h('span', null, 'Q Quiz'),
          h('span', null, 'S Speed'),
          h('span', null, 'H Hidden'),
          h('span', null, 'B Badges'),
          h('span', null, '? AI Tutor')
        ),

        // ── Legend ──
        h('div', { className: 'text-[11px] text-slate-600 text-center' },
          h('span', { className: 'inline-block w-3 h-3 bg-indigo-50 border border-indigo-200 rounded mr-1' }), ' Perfect squares',
          h('span', { className: 'ml-3 inline-block w-3 h-3 bg-pink-50 border border-pink-200 rounded mr-1' }), ' Hover cross',
          h('span', { className: 'ml-3 inline-block w-3 h-3 bg-pink-500 rounded mr-1' }), ' Selected',
          h('span', { className: 'ml-3 inline-block w-3 h-3 bg-amber-400 border border-amber-500 rounded mr-1' }), ' Correct answer'
        )
        )  // end of Practice tab wrapper
      );
    }
  });
})();
