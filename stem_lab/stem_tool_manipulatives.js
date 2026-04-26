// ═══════════════════════════════════════════════════════════════
// stem_tool_manipulatives.js — Math Manipulatives (Enhanced v2)
// Base-10 Blocks (with addition, expanded form, decimals),
// Abacus (speed challenge, culture cards), Slide Rule (practice),
// Place Value Quiz, badges, sounds, AI tutor, keyboard shortcuts.
// Registered tool ID: "base10"
// ═══════════════════════════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; } }
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
    if (document.getElementById('allo-live-manipulatives')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-manipulatives';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();


  // ══════════════════════════════════════════════════════════════
  // ── Sound Effects ──
  // ══════════════════════════════════════════════════════════════
  var _audioCtx = null;
  function getAC() { if (!_audioCtx) try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} return _audioCtx; }
  function playTone(f, dur, type, vol) {
    var ac = getAC(); if (!ac) return;
    try { var o = ac.createOscillator(), g = ac.createGain(); o.type = type || 'sine'; o.frequency.value = f; g.gain.setValueAtTime(vol || 0.08, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (dur || 0.12)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + (dur || 0.12)); } catch(e) {}
  }
  function sfxClick() { playTone(600, 0.04, 'sine', 0.05); }
  function sfxCorrect() { playTone(523, 0.08, 'sine', 0.08); setTimeout(function() { playTone(659, 0.08, 'sine', 0.08); }, 70); setTimeout(function() { playTone(784, 0.12, 'sine', 0.1); }, 140); }
  function sfxWrong() { playTone(330, 0.12, 'sawtooth', 0.05); setTimeout(function() { playTone(262, 0.15, 'sawtooth', 0.04); }, 80); }
  function sfxBadge() { playTone(523, 0.1, 'sine', 0.1); setTimeout(function() { playTone(784, 0.1, 'sine', 0.1); }, 100); setTimeout(function() { playTone(1047, 0.18, 'sine', 0.12); }, 250); }
  function sfxRegroup() { playTone(440, 0.06, 'triangle', 0.06); setTimeout(function() { playTone(660, 0.06, 'triangle', 0.06); }, 60); }
  function sfxBead() { playTone(800, 0.03, 'sine', 0.04); }
  function sfxTick() { playTone(1000, 0.02, 'sine', 0.03); }

  // ══════════════════════════════════════════════════════════════
  // ── Badge Definitions (14) ──
  // ══════════════════════════════════════════════════════════════
  var badgeDefs = [
    { id: 'first_build', icon: '\uD83E\uDDF1', name: 'First Build', desc: 'Build your first number with blocks' },
    { id: 'regroup_5', icon: '\u21C4', name: 'Regrouper', desc: 'Regroup 5 times' },
    { id: 'blocks_10', icon: '\uD83C\uDFC6', name: 'Block Master', desc: 'Solve 10 block challenges' },
    { id: 'abacus_5', icon: '\uD83E\uDDEE', name: 'Abacus Ace', desc: 'Solve 5 abacus challenges' },
    { id: 'speed_10s', icon: '\u23F1\uFE0F', name: 'Speed Demon', desc: 'Abacus speed < 10 seconds' },
    { id: 'speed_5s', icon: '\u26A1', name: 'Lightning', desc: 'Abacus speed < 5 seconds' },
    { id: 'slide_5', icon: '\uD83D\uDCCF', name: 'Slide Ruler', desc: 'Solve 5 slide rule problems' },
    { id: 'quiz_10', icon: '\uD83E\uDDE0', name: 'Quiz Whiz', desc: 'Answer 10 quiz questions' },
    { id: 'streak_5', icon: '\uD83D\uDD25', name: 'On Fire', desc: '5 correct in a row' },
    { id: 'streak_10', icon: '\uD83C\uDF1F', name: 'Unstoppable', desc: '10 correct in a row' },
    { id: 'all_modes', icon: '\uD83C\uDFA8', name: 'Explorer', desc: 'Try all 4 modes' },
    { id: 'thousand', icon: '\uD83D\uDCAF', name: 'Big Number', desc: 'Build a number \u2265 1000' },
    { id: 'ai_tutor', icon: '\uD83E\uDD16', name: 'AI Student', desc: 'Ask the AI tutor' },
    { id: 'addition', icon: '\u2795', name: 'Adder', desc: 'Complete an addition problem' }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Place Value Quiz Questions ──
  // ══════════════════════════════════════════════════════════════
  function generatePVQuiz() {
    var types = ['digit_place', 'expanded_to_standard', 'standard_to_expanded', 'compare', 'round'];
    var type = types[Math.floor(Math.random() * types.length)];
    var num = 10 + Math.floor(Math.random() * 9990);
    var digits = { thousands: Math.floor(num / 1000) % 10, hundreds: Math.floor(num / 100) % 10, tens: Math.floor(num / 10) % 10, ones: num % 10 };
    var places = ['ones', 'tens', 'hundreds', 'thousands'];
    var place = places[Math.floor(Math.random() * places.length)];

    if (type === 'digit_place') {
      return { type: type, q: 'What digit is in the ' + place + ' place of ' + num.toLocaleString() + '?', answer: digits[place].toString(), opts: [digits[place].toString(), Math.floor(Math.random()*10).toString(), Math.floor(Math.random()*10).toString(), Math.floor(Math.random()*10).toString()].filter(function(v, i, a) { return a.indexOf(v) === i; }).slice(0, 4).sort(function() { return Math.random() - 0.5; }) };
    } else if (type === 'expanded_to_standard') {
      var exp = '';
      if (digits.thousands > 0) exp += digits.thousands + ',000';
      if (digits.hundreds > 0) exp += (exp ? ' + ' : '') + digits.hundreds + '00';
      if (digits.tens > 0) exp += (exp ? ' + ' : '') + digits.tens + '0';
      if (digits.ones > 0) exp += (exp ? ' + ' : '') + digits.ones;
      if (!exp) exp = '0';
      var fakes = [num + 100, num - 10, num + 1000, Math.floor(Math.random() * 9999)].map(function(n) { return Math.max(0, n).toString(); });
      return { type: type, q: 'What number is ' + exp + '?', answer: num.toString(), opts: [num.toString()].concat(fakes).filter(function(v, i, a) { return a.indexOf(v) === i; }).slice(0, 4).sort(function() { return Math.random() - 0.5; }) };
    } else if (type === 'standard_to_expanded') {
      var parts = [];
      if (digits.thousands > 0) parts.push(digits.thousands + ' \u00D7 1000');
      if (digits.hundreds > 0) parts.push(digits.hundreds + ' \u00D7 100');
      if (digits.tens > 0) parts.push(digits.tens + ' \u00D7 10');
      if (digits.ones > 0) parts.push(digits.ones + ' \u00D7 1');
      var correct = parts.join(' + ');
      // Generate wrong options by swapping place values
      var wrong1 = [digits.ones + ' \u00D7 1000', digits.thousands + ' \u00D7 1'].filter(function(s) { return s.charAt(0) !== '0'; }).join(' + ') || '0';
      var wrong2 = (digits.hundreds || 1) + ' \u00D7 1000 + ' + (digits.thousands || 1) + ' \u00D7 100';
      return { type: type, q: 'Write ' + num.toLocaleString() + ' in expanded form:', answer: correct, opts: [correct, wrong1, wrong2].filter(function(v, i, a) { return a.indexOf(v) === i; }).slice(0, 4).sort(function() { return Math.random() - 0.5; }) };
    } else if (type === 'compare') {
      var num2 = 10 + Math.floor(Math.random() * 9990);
      while (num2 === num) num2 = 10 + Math.floor(Math.random() * 9990);
      var ans = num > num2 ? '>' : num < num2 ? '<' : '=';
      return { type: type, q: num.toLocaleString() + ' ___ ' + num2.toLocaleString(), answer: ans, opts: ['>', '<', '='].sort(function() { return Math.random() - 0.5; }) };
    } else {
      // Rounding
      var roundTo = [10, 100, 1000][Math.floor(Math.random() * 3)];
      var rounded = Math.round(num / roundTo) * roundTo;
      var fakes2 = [rounded + roundTo, rounded - roundTo, Math.round(num / (roundTo / 10)) * (roundTo / 10)].map(function(n) { return Math.max(0, Math.round(n)).toString(); });
      return { type: type, q: 'Round ' + num.toLocaleString() + ' to the nearest ' + roundTo.toLocaleString() + ':', answer: rounded.toString(), opts: [rounded.toString()].concat(fakes2).filter(function(v, i, a) { return a.indexOf(v) === i; }).slice(0, 4).sort(function() { return Math.random() - 0.5; }) };
    }
  }

  // ══════════════════════════════════════════════════════════════
  // ── Slide Rule Practice Problems ──
  // ══════════════════════════════════════════════════════════════
  var srProblems = [
    { a: 2, b: 3, answer: 6 }, { a: 2, b: 4, answer: 8 }, { a: 3, b: 3, answer: 9 },
    { a: 2.5, b: 4, answer: 10 }, { a: 1.5, b: 6, answer: 9 }, { a: 4, b: 5, answer: 20 },
    { a: 3, b: 7, answer: 21 }, { a: 2, b: 8, answer: 16 }, { a: 5, b: 5, answer: 25 },
    { a: 1.2, b: 3, answer: 3.6 }, { a: 6, b: 3, answer: 18 }, { a: 7, b: 4, answer: 28 }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Abacus Culture Facts ──
  // ══════════════════════════════════════════════════════════════
  var abacusFacts = [
    { emoji: '\uD83C\uDDEF\uD83C\uDDF5', name: 'Soroban (Japan)', desc: '1 heaven bead (5) + 4 earth beads (1). Used in schools today. Speed competitions are popular!' },
    { emoji: '\uD83C\uDDE8\uD83C\uDDF3', name: 'Suanpan (China)', desc: '2 heaven beads (5) + 5 earth beads (1). Invented over 2,000 years ago during the Han Dynasty.' },
    { emoji: '\uD83C\uDDF7\uD83C\uDDFA', name: 'Schoty (Russia)', desc: '10 beads per rod, no divider bar. Used in Russian shops until the 1990s!' },
    { emoji: '\uD83C\uDDF2\uD83C\uDDFD', name: 'Nepohualtzintzin (Aztec)', desc: 'Base-20 abacus using corn kernels on strings. Used for astronomy calculations!' }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── REGISTER TOOL ──
  // ══════════════════════════════════════════════════════════════
  window.StemLab.registerTool('base10', {
    icon: '\uD83E\uDDEE', label: 'Math Manipulatives',
    desc: 'Base-10 blocks, abacus, slide rule & place value quiz.',
    color: 'orange', category: 'math',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var setStemLabTool = ctx.setStemLabTool;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;
      var announceToSR = ctx.announceToSR;
      var a11yClick = ctx.a11yClick;
      var celebrate = ctx.celebrate;
      var callGemini = ctx.callGemini || window.callGemini;

      // ── State ──
      var ld = ctx.toolData || {};
      var _m = ld._manipulatives || {};
      var upd = function(obj) {
        if (typeof ctx.setToolData === 'function') {
          ctx.setToolData(function(prev) {
            var mn = Object.assign({}, (prev && prev._manipulatives) || {}, obj);
            return Object.assign({}, prev, { _manipulatives: mn });
          });
        }
      };

      var manipMode = _m.mode || 'blocks';
      var score = _m.score || { correct: 0, total: 0 };
      var soundEnabled = _m.soundEnabled != null ? _m.soundEnabled : true;
      var earnedBadges = _m.earnedBadges || {};
      var showBadgesPanel = _m.showBadgesPanel || false;
      var streak = _m.streak || 0;
      var modesVisited = _m.modesVisited || {};
      var regroupCount = _m.regroupCount || 0;
      var blocksSolved = _m.blocksSolved || 0;
      var abacusSolved = _m.abacusSolved || 0;
      var slideSolved = _m.slideSolved || 0;
      var quizSolved = _m.quizSolved || 0;
      var aiInsight = _m.aiInsight || '';
      var aiLoading = _m.aiLoading || false;

      // ═══ BASE-10 BLOCKS STATE ═══
      var b10 = _m.b10 || { ones: 0, tens: 0, hundreds: 0, thousands: 0 };
      var b10Challenge = _m.b10Challenge || null;
      var b10Feedback = _m.b10Feedback || null;
      var regroupFlash = _m.regroupFlash || null;
      var totalValue = b10.ones + b10.tens * 10 + b10.hundreds * 100 + b10.thousands * 1000;
      var diffLevel = _m.diffLevel || 'any';
      var showExpanded = _m.showExpanded != null ? _m.showExpanded : true;
      var b10AddMode = _m.b10AddMode || false;
      var b10Addends = _m.b10Addends || null;

      // ═══ ABACUS STATE ═══
      var abacus = _m.abacus || { rods: [0, 0, 0, 0, 0] };
      var abacusChallenge = _m.abacusChallenge || null;
      var abacusFeedback = _m.abacusFeedback || null;
      var rods = abacus.rods || [0, 0, 0, 0, 0];
      var placeNames = ['Ones', 'Tens', 'Hundreds', 'Thousands', 'Ten-Thousands'];
      var placeMultipliers = [1, 10, 100, 1000, 10000];
      var abacusTotal = rods.reduce(function(sum, v, i) { return sum + v * placeMultipliers[i]; }, 0);
      var speedChallenge = _m.speedChallenge || null;
      var speedBest = _m.speedBest || null;
      var showCulture = _m.showCulture || false;

      // ═══ SLIDE RULE STATE ═══
      var sr = _m.slideRule || { cOffset: 0, cursorPos: 0.301 };
      var dVal = Math.pow(10, sr.cursorPos || 0.301);
      var cVal = Math.pow(10, (sr.cursorPos || 0.301) - (sr.cOffset || 0));
      var product = dVal * Math.pow(10, sr.cOffset || 0);
      var srProblem = _m.srProblem || null;
      var srFeedback = _m.srFeedback || null;

      // ═══ QUIZ STATE ═══
      var pvQuiz = _m.pvQuiz || null;
      var pvFeedback = _m.pvFeedback || null;

      // ══════════════════════════════════════════════════════════════
      // ── Badge Checker ──
      // ══════════════════════════════════════════════════════════════
      var checkBadges = function(updates) {
        var newB = Object.assign({}, earnedBadges);
        var awarded = [];
        var chk = function(id, cond) { if (!newB[id] && cond) { newB[id] = Date.now(); awarded.push(id); } };
        var s = updates || {};
        chk('first_build', totalValue > 0 || (s.totalValue || 0) > 0);
        chk('regroup_5', (s.regroupCount || regroupCount) >= 5);
        chk('blocks_10', (s.blocksSolved || blocksSolved) >= 10);
        chk('abacus_5', (s.abacusSolved || abacusSolved) >= 5);
        chk('speed_10s', !!s.speedUnder10);
        chk('speed_5s', !!s.speedUnder5);
        chk('slide_5', (s.slideSolved || slideSolved) >= 5);
        chk('quiz_10', (s.quizSolved || quizSolved) >= 10);
        chk('streak_5', (s.streak || streak) >= 5);
        chk('streak_10', (s.streak || streak) >= 10);
        chk('all_modes', Object.keys(s.modesVisited || modesVisited).length >= 4);
        chk('thousand', totalValue >= 1000 || (s.totalValue || 0) >= 1000);
        chk('ai_tutor', !!s.aiUsed);
        chk('addition', !!s.additionDone);
        if (awarded.length > 0) {
          upd({ earnedBadges: newB });
          awarded.forEach(function(bid) {
            var badge = badgeDefs.find(function(b) { return b.id === bid; });
            if (badge && addToast) addToast('\uD83C\uDFC5 ' + badge.icon + ' ' + badge.name + '!', 'success');
            if (awardXP) awardXP('base10_badge_' + bid, 5, 'Badge: ' + (badge ? badge.name : bid));
          });
          if (soundEnabled) sfxBadge();
          if (celebrate) celebrate();
        }
      };

      // ══════════════════════════════════════════════════════════════
      // ── Mode Switch ──
      // ══════════════════════════════════════════════════════════════
      var switchMode = function(mode) {
        var visited = Object.assign({}, modesVisited);
        visited[mode] = true;
        upd({ mode: mode, modesVisited: visited });
        checkBadges({ modesVisited: visited });
      };

      // ══════════════════════════════════════════════════════════════
      // ── Regrouping ──
      // ══════════════════════════════════════════════════════════════
      var doRegroup = function(fromPlace, toPlace) {
        if (b10[fromPlace] < 10 || b10[toPlace] >= 9) return;
        var newB10 = Object.assign({}, b10);
        newB10[fromPlace] = b10[fromPlace] - 10;
        newB10[toPlace] = b10[toPlace] + 1;
        var newRC = regroupCount + 1;
        upd({ b10: newB10, regroupFlash: toPlace, regroupCount: newRC });
        setTimeout(function() { upd({ regroupFlash: null }); }, 700);
        if (soundEnabled) sfxRegroup();
        checkBadges({ regroupCount: newRC });
      };
      var doUngroup = function(fromPlace, toPlace) {
        if (b10[fromPlace] < 1) return;
        var newB10 = Object.assign({}, b10);
        newB10[fromPlace] = b10[fromPlace] - 1;
        newB10[toPlace] = b10[toPlace] + 10;
        var newRC = regroupCount + 1;
        upd({ b10: newB10, regroupFlash: toPlace, regroupCount: newRC });
        setTimeout(function() { upd({ regroupFlash: null }); }, 700);
        if (soundEnabled) sfxRegroup();
        checkBadges({ regroupCount: newRC });
      };

      // ══════════════════════════════════════════════════════════════
      // ── Challenge Generators ──
      // ══════════════════════════════════════════════════════════════
      var genBlockChallenge = function() {
        var target;
        if (diffLevel === 'ones') target = 1 + Math.floor(Math.random() * 9);
        else if (diffLevel === 'tens') target = 10 + Math.floor(Math.random() * 90);
        else if (diffLevel === 'hundreds') target = 100 + Math.floor(Math.random() * 900);
        else if (diffLevel === 'thousands') target = 1000 + Math.floor(Math.random() * 9000);
        else target = 10 + Math.floor(Math.random() * 9990);
        upd({ b10Challenge: { target: target, type: 'build' }, b10: { ones: 0, tens: 0, hundreds: 0, thousands: 0 }, b10Feedback: null, b10AddMode: false });
      };

      var genAdditionProblem = function() {
        var maxVal = diffLevel === 'ones' ? 9 : diffLevel === 'tens' ? 99 : diffLevel === 'hundreds' ? 999 : 4999;
        var a = 1 + Math.floor(Math.random() * maxVal);
        var b = 1 + Math.floor(Math.random() * Math.min(maxVal, 9999 - a));
        var sum = a + b;
        upd({
          b10AddMode: true,
          b10Addends: { a: a, b: b, sum: sum },
          b10Challenge: { target: sum, type: 'addition' },
          b10: { ones: 0, tens: 0, hundreds: 0, thousands: 0 },
          b10Feedback: null
        });
      };

      // ══════════════════════════════════════════════════════════════
      // ── Challenge Checks ──
      // ══════════════════════════════════════════════════════════════
      var checkBase10 = function() {
        if (!b10Challenge) return;
        var ok = totalValue === b10Challenge.target;
        if (announceToSR) announceToSR(ok ? 'Correct!' : 'Incorrect');
        var newStreak = ok ? streak + 1 : 0;
        var newBS = blocksSolved + (ok ? 1 : 0);
        var isAddition = b10Challenge.type === 'addition';
        upd({
          b10Feedback: ok
            ? { correct: true, msg: '\u2705 Correct! ' + b10Challenge.target.toLocaleString() + (b10.thousands > 0 ? ' = ' + b10.thousands + ' thousands + ' + b10.hundreds + ' hundreds + ' + b10.tens + ' tens + ' + b10.ones + ' ones' : '') }
            : { correct: false, msg: '\u274C Your blocks show ' + totalValue.toLocaleString() + ', target is ' + b10Challenge.target.toLocaleString() },
          score: { correct: score.correct + (ok ? 1 : 0), total: score.total + 1 },
          streak: newStreak,
          blocksSolved: newBS
        });
        if (ok) {
          if (awardXP) awardXP('base10', 5, 'base-10 blocks');
          if (soundEnabled) sfxCorrect();
          checkBadges({ streak: newStreak, blocksSolved: newBS, totalValue: totalValue, additionDone: isAddition || undefined });
        } else {
          if (soundEnabled) sfxWrong();
          upd({ streak: 0 });
        }
      };

      var checkAbacus = function() {
        if (!abacusChallenge) return;
        var ok = abacusTotal === abacusChallenge.target;
        var newStreak = ok ? streak + 1 : 0;
        var newAS = abacusSolved + (ok ? 1 : 0);
        upd({
          abacusFeedback: ok
            ? { correct: true, msg: '\u2705 Correct! ' + abacusChallenge.target.toLocaleString() }
            : { correct: false, msg: '\u274C Shows ' + abacusTotal.toLocaleString() + ', target is ' + abacusChallenge.target.toLocaleString() },
          score: { correct: score.correct + (ok ? 1 : 0), total: score.total + 1 },
          streak: newStreak,
          abacusSolved: newAS
        });
        if (ok) {
          if (awardXP) awardXP('base10', 5, 'abacus');
          if (soundEnabled) sfxCorrect();
          checkBadges({ streak: newStreak, abacusSolved: newAS });
        } else {
          if (soundEnabled) sfxWrong();
          upd({ streak: 0 });
        }
      };

      var checkSpeed = function() {
        if (!speedChallenge) return;
        if (abacusTotal !== speedChallenge.target) {
          if (addToast) addToast('\u274C Shows ' + abacusTotal.toLocaleString() + ', need ' + speedChallenge.target.toLocaleString(), 'error');
          if (soundEnabled) sfxWrong();
          return;
        }
        var elapsed = ((Date.now() - speedChallenge.startTime) / 1000);
        var best = speedBest ? Math.min(elapsed, speedBest) : elapsed;
        var isNewBest = !speedBest || elapsed < speedBest;
        upd({ speedBest: best, speedChallenge: null, score: { correct: score.correct + 1, total: score.total + 1 } });
        if (addToast) addToast('\u23F1\uFE0F ' + elapsed.toFixed(1) + 's!' + (isNewBest ? ' \uD83C\uDFC6 New best!' : ' Best: ' + best.toFixed(1) + 's'), 'success');
        if (soundEnabled) sfxCorrect();
        if (awardXP) awardXP('base10', 8, 'speed challenge');
        checkBadges({ speedUnder10: elapsed < 10, speedUnder5: elapsed < 5 });
      };

      var checkSR = function() {
        if (!srProblem) return;
        var tolerance = srProblem.answer * 0.15;
        var ok = Math.abs(product - srProblem.answer) <= tolerance;
        var newStreak = ok ? streak + 1 : 0;
        var newSS = slideSolved + (ok ? 1 : 0);
        upd({
          srFeedback: ok
            ? { correct: true, msg: '\u2705 Close enough! ' + srProblem.a + ' \u00D7 ' + srProblem.b + ' = ' + srProblem.answer + ' (you got \u2248' + product.toFixed(1) + ')' }
            : { correct: false, msg: '\u274C Need \u2248' + srProblem.answer + ', your slide rule reads \u2248' + product.toFixed(1) },
          score: { correct: score.correct + (ok ? 1 : 0), total: score.total + 1 },
          streak: newStreak,
          slideSolved: newSS
        });
        if (ok) {
          if (awardXP) awardXP('base10', 5, 'slide rule');
          if (soundEnabled) sfxCorrect();
          checkBadges({ streak: newStreak, slideSolved: newSS });
        } else {
          if (soundEnabled) sfxWrong();
          upd({ streak: 0 });
        }
      };

      var answerPVQuiz = function(opt) {
        if (!pvQuiz || pvFeedback) return;
        var ok = opt === pvQuiz.answer;
        var newStreak = ok ? streak + 1 : 0;
        var newQS = quizSolved + (ok ? 1 : 0);
        upd({
          pvFeedback: ok ? { correct: true, msg: '\u2705 Correct!' } : { correct: false, msg: '\u274C Answer: ' + pvQuiz.answer },
          score: { correct: score.correct + (ok ? 1 : 0), total: score.total + 1 },
          streak: newStreak,
          quizSolved: newQS
        });
        if (ok) {
          if (awardXP) awardXP('base10', 5, 'place value quiz');
          if (soundEnabled) sfxCorrect();
          checkBadges({ streak: newStreak, quizSolved: newQS });
        } else {
          if (soundEnabled) sfxWrong();
          upd({ streak: 0 });
        }
      };

      // ── AI Tutor ──
      var askAI = function() {
        if (!callGemini || aiLoading) return;
        upd({ aiLoading: true });
        var context = manipMode === 'blocks' ? 'Base-10 blocks showing ' + totalValue.toLocaleString() + '. ' + (b10Challenge ? 'Challenge: build ' + b10Challenge.target.toLocaleString() : 'Free play.')
          : manipMode === 'abacus' ? 'Abacus showing ' + abacusTotal.toLocaleString() + '.'
          : manipMode === 'slideRule' ? 'Slide rule: C=' + cVal.toFixed(2) + ', D=' + dVal.toFixed(2) + ', product\u2248' + product.toFixed(2)
          : 'Place value quiz.';
        var prompt = 'You are a fun math tutor for kids ages 8-14 in a math manipulatives tool. Mode: ' + manipMode + '. ' + context + ' Score: ' + score.correct + '/' + score.total + '. Streak: ' + streak + '. Give 2-3 SHORT tips or fun facts about the current activity. Use emoji. Return JSON: {"tips":["...","..."],"funFact":"..."}';
        callGemini(prompt, true, false, 0.8).then(function(resp) {
          try {
            var parsed = typeof resp === 'string' ? JSON.parse(resp.replace(/```json\s*/g,'').replace(/```/g,'').trim()) : resp;
            var text = '';
            if (parsed.tips) parsed.tips.forEach(function(t, i) { text += (i > 0 ? '\n' : '') + t; });
            if (parsed.funFact) text += '\n\n\uD83D\uDCA1 ' + parsed.funFact;
            upd({ aiInsight: text, aiLoading: false });
          } catch(e) { upd({ aiInsight: typeof resp === 'string' ? resp : 'Keep practicing!', aiLoading: false }); }
        }).catch(function() { upd({ aiInsight: '\u26A0\uFE0F Could not reach AI.', aiLoading: false }); });
        checkBadges({ aiUsed: true });
      };

      // ══════════════════════════════════════════════════════════════
      // ── 3D Block Renderer ──
      // ══════════════════════════════════════════════════════════════
      var renderBlock3D = function(color, lightColor, w, ht, count, gridCols, gridRows) {
        return Array.from({ length: count }).map(function(_, i) {
          return h('div', {
            key: i,
            style: {
              width: w + 'px', height: ht + 'px',
              background: 'linear-gradient(135deg, ' + lightColor + ' 0%, ' + color + ' 60%, ' + color + ' 100%)',
              border: '1px solid rgba(0,0,0,0.2)', borderRadius: '3px',
              boxShadow: '1px 2px 4px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.4)',
              backgroundImage: gridCols > 1 || gridRows > 1
                ? 'repeating-linear-gradient(90deg, transparent, transparent ' + (100/gridCols) + '%, rgba(0,0,0,0.08) ' + (100/gridCols) + '%, rgba(0,0,0,0.08) calc(' + (100/gridCols) + '% + 1px)), repeating-linear-gradient(0deg, transparent, transparent ' + (100/gridRows) + '%, rgba(0,0,0,0.08) ' + (100/gridRows) + '%, rgba(0,0,0,0.08) calc(' + (100/gridRows) + '% + 1px))'
                : 'none',
              transition: 'transform 0.2s ease', flexShrink: 0
            }
          });
        });
      };

      // ── Abacus Rod Setter ──
      var setRod = function(idx, val) {
        var nr = rods.slice();
        nr[idx] = Math.max(0, Math.min(9, val));
        upd({ abacus: { rods: nr } });
        if (soundEnabled) sfxBead();
      };

      // ── Place Value Column ──
      var placeCol = function(label, symbol, place, color, lightColor, bw, bh, gridC, gridR) {
        return h('div', { 
          className: 'bg-white rounded-xl p-3 border-2 text-center shadow-sm',
          style: Object.assign({ borderColor: lightColor }, regroupFlash === place ? { animation: 'b10regroup 0.7s ease' } : {})
        },
          h('div', { className: 'text-xs font-bold uppercase mb-1', style: { color: color } }, symbol + ' ' + label),
          h('div', { className: 'flex justify-center gap-1 mb-2 min-h-[58px] flex-wrap items-center' }, renderBlock3D(color, lightColor, bw, bh, b10[place], gridC, gridR)),
          h('div', { className: 'flex items-center justify-center gap-2' },
            h('button', { onClick: function() { var n = Object.assign({}, b10); n[place] = Math.max(0, n[place] - 1); upd({ b10: n }); if (soundEnabled) sfxClick(); },
              className: 'w-8 h-8 rounded-full font-bold text-lg hover:opacity-80 transition-all flex items-center justify-center',
              style: { background: lightColor + '33', color: color }
            }, '\u2212'),
            h('span', { className: 'text-2xl font-bold w-8 text-center', style: { color: color } }, b10[place]),
            h('button', { 'aria-label': 'Add',
              onClick: function() {
                var n = Object.assign({}, b10); n[place] = Math.min(20, n[place] + 1); upd({ b10: n }); if (soundEnabled) sfxClick();
                if (n[place] + n.tens * 10 + n.hundreds * 100 + n.thousands * 1000 + (place === 'ones' ? n[place] : b10.ones) >= 0) checkBadges({ totalValue: n.ones + n.tens * 10 + n.hundreds * 100 + n.thousands * 1000 });
              },
              className: 'w-8 h-8 rounded-full font-bold text-lg hover:opacity-80 transition-all flex items-center justify-center',
              style: { background: lightColor + '33', color: color }
            }, '+')
          ),
          h('div', { className: 'text-xs mt-1', style: { color: color } }, '\u00D7' + { thousands: 1000, hundreds: 100, tens: 10, ones: 1 }[place] + ' = ' + b10[place] * { thousands: 1000, hundreds: 100, tens: 10, ones: 1 }[place])
        );
      };

      // ── Regroup Button ──
      var regroupBtn = function(label, from, to, enabled, colorFrom, colorTo) {
        return h('button', { onClick: function() { if (label.indexOf('\u2192') > 0 && label.indexOf('10') === 0) doRegroup(from, to); else doUngroup(from, to); },
          disabled: !enabled,
          className: 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all ' + (enabled ? 'text-white shadow hover:shadow-md hover:scale-105' : 'bg-slate-100 text-slate-600 cursor-not-allowed'),
          style: enabled ? { background: 'linear-gradient(90deg, ' + colorFrom + ', ' + colorTo + ')' } : {}
        }, label);
      };

      // ── Expanded Form ──
      var expandedForm = function(val) {
        if (val === 0) return '0';
        var parts = [];
        var th = Math.floor(val / 1000); if (th > 0) parts.push(th + ' \u00D7 1,000');
        var hu = Math.floor((val % 1000) / 100); if (hu > 0) parts.push(hu + ' \u00D7 100');
        var te = Math.floor((val % 100) / 10); if (te > 0) parts.push(te + ' \u00D7 10');
        var on = val % 10; if (on > 0) parts.push(on + ' \u00D7 1');
        return parts.join(' + ');
      };

      // ── Number Words ──
      var numberWords = function(val) {
        if (val === 0) return 'zero';
        var ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
        var tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
        var parts = [];
        if (val >= 1000) { parts.push(ones[Math.floor(val / 1000)] + ' thousand'); val %= 1000; }
        if (val >= 100) { parts.push(ones[Math.floor(val / 100)] + ' hundred'); val %= 100; }
        if (val >= 20) { parts.push(tens[Math.floor(val / 10)] + (val % 10 > 0 ? '-' + ones[val % 10] : '')); }
        else if (val > 0) { parts.push(ones[val]); }
        return parts.join(' ');
      };

      // ══════════════════════════════════════════════════════════════
      // ── HEADER ──
      // ══════════════════════════════════════════════════════════════
      var headerEl = h('div', { className: 'space-y-3 mb-4' },
        h('div', { className: 'flex items-center gap-3 flex-wrap' },
          h('button', { onClick: function() { setStemLabTool(null); }, className: 'p-1.5 hover:bg-slate-100 rounded-lg', 'aria-label': 'Back' },
            h(ArrowLeft, { size: 18, className: 'text-slate-600' })),
          h('h3', { className: 'text-lg font-bold text-orange-800' }, '\uD83E\uDDEE Math Manipulatives'),
          streak >= 3 && h('span', { className: 'text-xs font-bold text-orange-500' }, '\uD83D\uDD25 ' + streak),
          h('div', { className: 'ml-auto flex gap-1.5' },
            h('span', { className: 'text-xs font-bold text-emerald-600 self-center' }, score.correct + '/' + score.total),
            h('button', { 'aria-label': 'Badges', onClick: function() { upd({ showBadgesPanel: !showBadgesPanel }); }, className: 'text-[11px] font-bold px-2 py-0.5 rounded-full border transition-all ' + (showBadgesPanel ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-slate-100 border-slate-200 text-slate-600') }, '\uD83C\uDFC5 ' + Object.keys(earnedBadges).length + '/' + badgeDefs.length),
            h('button', { onClick: function() { upd({ soundEnabled: !soundEnabled }); }, 'aria-label': soundEnabled ? 'Mute sound' : 'Enable sound', className: 'text-sm px-1' }, soundEnabled ? '\uD83D\uDD0A' : '\uD83D\uDD07'),
            callGemini && h('button', { 'aria-label': 'Badges', onClick: askAI, disabled: aiLoading, className: 'text-[11px] font-bold px-2 py-0.5 rounded-full border transition-all ' + (aiLoading ? 'bg-pink-100 border-pink-200 text-pink-400' : 'bg-pink-50 border-pink-200 text-pink-600 hover:bg-pink-100') }, aiLoading ? '\u23F3' : '\uD83E\uDD16 Tutor')
          )
        ),

        // Badges panel
        showBadgesPanel && h('div', { className: 'bg-amber-50 rounded-xl p-3 border border-amber-200' },
          h('div', { className: 'text-xs font-bold text-amber-700 uppercase mb-2' }, '\uD83C\uDFC5 Badges'),
          h('div', { className: 'grid grid-cols-3 sm:grid-cols-4 gap-2' },
            badgeDefs.map(function(badge) {
              var earned = !!earnedBadges[badge.id];
              return h('div', { key: badge.id, className: 'flex items-center gap-2 p-1.5 rounded-lg ' + (earned ? 'bg-amber-100 border border-amber-300' : 'bg-white border border-slate-200 opacity-40') },
                h('span', { className: 'text-base', style: earned ? {} : { filter: 'grayscale(1)' } }, badge.icon),
                h('div', null,
                  h('div', { className: 'text-[11px] font-bold ' + (earned ? 'text-amber-800' : 'text-slate-600') }, badge.name),
                  h('div', { className: 'text-[11px] ' + (earned ? 'text-amber-600' : 'text-slate-600') }, badge.desc)
                )
              );
            })
          )
        ),

        // AI insight
        aiInsight && h('div', { className: 'bg-pink-50 rounded-lg p-3 border border-pink-200 text-xs text-slate-700 whitespace-pre-line' },
          h('span', { className: 'font-bold text-pink-600' }, '\uD83E\uDD16 AI Tutor: '),
          aiInsight
        ),

        // Mode tabs (4 modes now)
        h('div', { className: 'flex gap-1 bg-slate-100 rounded-xl p-1' },
          [{ id: 'blocks', icon: '\uD83E\uDDF1', label: 'Base-10 Blocks' },
           { id: 'abacus', icon: '\uD83E\uDDEE', label: 'Abacus' },
           { id: 'slideRule', icon: '\uD83D\uDCCF', label: 'Slide Rule' },
           { id: 'quiz', icon: '\uD83E\uDDE0', label: 'Quiz' }
          ].map(function(m) {
            return h('button', { 'aria-label': 'Switch Mode',
              key: m.id, onClick: function() { switchMode(m.id); },
              className: 'flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all ' +
                (manipMode === m.id ? 'bg-white text-orange-800 shadow-sm' : 'text-slate-600 hover:text-slate-700 hover:bg-slate-50')
            }, m.icon + ' ' + m.label);
          })
        )
      );

      // ═══════════════════════════════════════════════════════════════
      // ── BASE-10 BLOCKS MODE ──
      // ═══════════════════════════════════════════════════════════════
      if (manipMode === 'blocks') {
        return h('div', { className: 'space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200' },
          headerEl,
          h('style', null, '@keyframes b10regroup { 0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(168,85,247,0.5); } 40% { transform: scale(1.15); box-shadow: 0 0 20px 8px rgba(168,85,247,0.4); } 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(168,85,247,0); } }'),

          h('div', { className: 'bg-gradient-to-b from-orange-50 to-amber-50 rounded-xl border-2 border-orange-200 p-6' },
            // Total display with expanded form + number words
            h('div', { className: 'text-center mb-4' },
              h('span', { className: 'text-4xl font-bold text-orange-800 font-mono' }, totalValue.toLocaleString()),
              showExpanded && totalValue > 0 && h('div', { className: 'text-xs text-orange-500 font-mono mt-1' }, expandedForm(totalValue)),
              showExpanded && totalValue > 0 && totalValue < 10000 && h('div', { className: 'text-[11px] text-orange-400 italic mt-0.5' }, '"' + numberWords(totalValue) + '"'),
              h('span', { className: 'text-2xl text-slate-600 mx-3' }, '='),
              h('div', { className: 'flex items-end gap-2 flex-wrap justify-center', style: { minHeight: '60px' } },
                renderBlock3D('#db2777', '#f472b6', 56, 56, b10.thousands, 10, 10),
                b10.thousands > 0 && b10.hundreds > 0 && h('span', { className: 'w-px h-8 bg-slate-200 mx-0.5' }),
                renderBlock3D('#2563eb', '#60a5fa', 48, 14, b10.hundreds, 10, 1),
                (b10.thousands > 0 || b10.hundreds > 0) && b10.tens > 0 && h('span', { className: 'w-px h-8 bg-slate-200 mx-0.5' }),
                renderBlock3D('#059669', '#34d399', 10, 48, b10.tens, 1, 10),
                (b10.thousands > 0 || b10.hundreds > 0 || b10.tens > 0) && b10.ones > 0 && h('span', { className: 'w-px h-8 bg-slate-200 mx-0.5' }),
                renderBlock3D('#ea580c', '#fb923c', 10, 10, b10.ones, 1, 1),
                totalValue === 0 && h('span', { className: 'text-sm text-slate-600 italic' }, 'no blocks')
              )
            ),
            h('div', { className: 'flex items-center justify-center gap-4 mb-3 text-[11px] font-bold text-slate-600' },
              h('span', null, '\u25A0 Cube = 1000'), h('span', null, '\u25AC Flat = 100'), h('span', null, '\u2503 Rod = 10'), h('span', null, '\u25AA Unit = 1')
            ),
            // Place value columns
            h('div', { className: 'grid grid-cols-4 gap-3' },
              placeCol('Thousands', '\u25A0', 'thousands', '#db2777', '#f472b6', 56, 56, 10, 10),
              placeCol('Hundreds', '\u25AC', 'hundreds', '#2563eb', '#60a5fa', 48, 14, 10, 1),
              placeCol('Tens', '\u2503', 'tens', '#059669', '#34d399', 10, 48, 1, 10),
              placeCol('Ones', '\u25AA', 'ones', '#ea580c', '#fb923c', 10, 10, 1, 1)
            ),
            // Regrouping
            h('div', { className: 'bg-gradient-to-r from-violet-50 to-fuchsia-50 rounded-xl border border-violet-200 p-3 mt-1' },
              h('p', { className: 'text-[11px] font-bold text-violet-700 uppercase tracking-wider mb-2 text-center' }, '\u21C4 Regroup / Ungroup'),
              h('div', { className: 'flex flex-wrap gap-2 justify-center' },
                regroupBtn('10 \u25AA \u2192 1 \u2503', 'ones', 'tens', b10.ones >= 10 && b10.tens < 9, '#ea580c', '#059669'),
                regroupBtn('1 \u2503 \u2192 10 \u25AA', 'tens', 'ones', b10.tens >= 1, '#059669', '#ea580c'),
                h('span', { className: 'w-px h-6 bg-violet-200 mx-1 self-center' }),
                regroupBtn('10 \u2503 \u2192 1 \u25AC', 'tens', 'hundreds', b10.tens >= 10 && b10.hundreds < 9, '#059669', '#2563eb'),
                regroupBtn('1 \u25AC \u2192 10 \u2503', 'hundreds', 'tens', b10.hundreds >= 1, '#2563eb', '#059669'),
                h('span', { className: 'w-px h-6 bg-violet-200 mx-1 self-center' }),
                regroupBtn('10 \u25AC \u2192 1 \u25A0', 'hundreds', 'thousands', b10.hundreds >= 10 && b10.thousands < 9, '#2563eb', '#db2777'),
                regroupBtn('1 \u25A0 \u2192 10 \u25AC', 'thousands', 'hundreds', b10.thousands >= 1, '#db2777', '#2563eb')
              ),
              h('p', { className: 'text-[11px] text-violet-400 text-center mt-1.5 italic' }, '\uD83D\uDCA1 10 of one place value always equals 1 of the next!')
            )
          ),

          // Difficulty selector
          h('div', { className: 'flex gap-1.5 items-center flex-wrap' },
            h('span', { className: 'text-[11px] font-bold text-slate-600' }, 'Difficulty:'),
            [{ id: 'ones', label: '1\u20139', color: '#ea580c' }, { id: 'tens', label: '10\u201399', color: '#059669' }, { id: 'hundreds', label: '100\u2013999', color: '#2563eb' }, { id: 'thousands', label: '1K\u20139K', color: '#db2777' }, { id: 'any', label: 'Any', color: '#94a3b8' }].map(function(dl) {
              return h('button', { 'aria-label': 'Expanded Form', key: dl.id, onClick: function() { upd({ diffLevel: dl.id }); },
                className: 'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ' + (diffLevel === dl.id ? 'text-white shadow' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'),
                style: diffLevel === dl.id ? { backgroundColor: dl.color } : {}
              }, dl.label);
            }),
            h('label', { className: 'flex items-center gap-1 text-[11px] font-bold text-orange-600 cursor-pointer ml-auto' },
              h('input', { type: 'checkbox', checked: showExpanded, onChange: function() { upd({ showExpanded: !showExpanded }); }, className: 'accent-orange-600' }), 'Expanded Form')
          ),

          // Action buttons
          h('div', { className: 'flex gap-2 flex-wrap' },
            h('button', { onClick: genBlockChallenge, className: 'flex-1 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-lg text-sm hover:from-orange-600 hover:to-amber-600 transition-all shadow-md' }, '\uD83C\uDFB2 Build Number'),
            h('button', { 'aria-label': 'Addition', onClick: genAdditionProblem, className: 'flex-1 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-lg text-sm hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md' }, '\u2795 Addition'),
            h('button', { 'aria-label': 'Reset', onClick: function() { upd({ b10: { ones: 0, tens: 0, hundreds: 0, thousands: 0 }, b10Challenge: null, b10Feedback: null, b10AddMode: false, b10Addends: null }); }, className: 'px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300 transition-all' }, '\u21BA Reset')
          ),

          // Addition problem display
          b10AddMode && b10Addends && h('div', { className: 'bg-emerald-50 rounded-xl p-4 border border-emerald-200' },
            h('div', { className: 'text-center' },
              h('div', { className: 'text-sm font-bold text-emerald-800 mb-2' }, '\u2795 Addition with Regrouping'),
              h('div', { className: 'flex items-center justify-center gap-3 text-2xl font-bold font-mono' },
                h('span', { className: 'text-emerald-700' }, b10Addends.a.toLocaleString()),
                h('span', { className: 'text-emerald-500' }, '+'),
                h('span', { className: 'text-emerald-700' }, b10Addends.b.toLocaleString()),
                h('span', { className: 'text-emerald-500' }, '='),
                h('span', { className: 'text-emerald-400' }, '?')
              ),
              h('p', { className: 'text-xs text-emerald-600 mt-2' }, 'Use the blocks above to show the sum. Add blocks for each number, then regroup if needed!')
            )
          ),

          // Challenge display
          b10Challenge && !b10AddMode && h('div', { className: 'bg-orange-50 rounded-lg p-3 border border-orange-200' },
            h('p', { className: 'text-sm font-bold text-orange-800 mb-2' }, '\uD83C\uDFAF Show ' + b10Challenge.target.toLocaleString() + ' using base-10 blocks'),
            h('div', { className: 'flex gap-2 items-center' },
              h('span', { className: 'text-xs text-orange-600' }, 'Your value: ', h('span', { className: 'font-bold text-orange-900' }, totalValue.toLocaleString())),
              h('button', { 'aria-label': 'Check', onClick: checkBase10, className: 'ml-auto px-4 py-1.5 bg-orange-700 text-white font-bold rounded-lg text-sm hover:bg-orange-600 transition-all' }, '\u2714 Check')
            ),
            b10Feedback && h('p', { className: 'text-sm font-bold mt-2 ' + (b10Feedback.correct ? 'text-green-600' : 'text-red-600') }, b10Feedback.msg)
          ),

          // Addition challenge check
          b10AddMode && b10Challenge && h('div', { className: 'bg-orange-50 rounded-lg p-3 border border-orange-200' },
            h('div', { className: 'flex gap-2 items-center' },
              h('span', { className: 'text-xs text-orange-600' }, 'Your value: ', h('span', { className: 'font-bold text-orange-900' }, totalValue.toLocaleString()), ' (need ' + b10Challenge.target.toLocaleString() + ')'),
              h('button', { 'aria-label': 'Check Sum', onClick: checkBase10, className: 'ml-auto px-4 py-1.5 bg-emerald-700 text-white font-bold rounded-lg text-sm hover:bg-emerald-600 transition-all' }, '\u2714 Check Sum')
            ),
            b10Feedback && h('p', { className: 'text-sm font-bold mt-2 ' + (b10Feedback.correct ? 'text-green-600' : 'text-red-600') }, b10Feedback.msg)
          )
        );
      }

      // ═══════════════════════════════════════════════════════════════
      // ── ABACUS MODE ──
      // ═══════════════════════════════════════════════════════════════
      if (manipMode === 'abacus') {
        var ROD_COLORS = ['#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];
        var BEAD_SIZE = 28;
        return h('div', { className: 'space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200' },
          headerEl,
          // Total + speed timer
          h('div', { className: 'text-center' },
            h('span', { className: 'text-4xl font-bold font-mono text-amber-800' }, abacusTotal.toLocaleString()),
            speedChallenge && h('div', { className: 'text-xs font-bold text-rose-500 mt-1' }, '\u23F1\uFE0F Target: ' + speedChallenge.target.toLocaleString() + ' \u2014 GO!'),
            speedBest && h('span', { className: 'text-[11px] text-amber-500 ml-2' }, '\uD83C\uDFC6 Best: ' + speedBest.toFixed(1) + 's')
          ),
          // Abacus frame
          h('div', {
            className: 'rounded-xl border-2 border-amber-300 p-4 shadow-inner relative overflow-hidden',
            style: { background: 'linear-gradient(180deg, #fef3c7 0%, #fde68a 30%, #fef3c7 100%)' }
          },
            h('div', { style: { position: 'absolute', left: 0, right: 0, top: '36%', height: '4px', background: 'linear-gradient(90deg, #92400e, #b45309, #92400e)', zIndex: 5, boxShadow: '0 1px 3px rgba(0,0,0,0.3)' } }),
            h('div', { className: 'flex justify-center gap-6' },
              rods.slice().reverse().map(function(val, ri) {
                var rodIdx = rods.length - 1 - ri;
                var heavenlyVal = Math.floor(val / 5);
                var earthlyVal = val % 5;
                var rodColor = ROD_COLORS[rodIdx];
                return h('div', { key: rodIdx, className: 'flex flex-col items-center', style: { width: '48px' } },
                  h('div', { className: 'flex flex-col items-center gap-1 mb-1', style: { minHeight: '60px', justifyContent: 'flex-end' } },
                    h('div', { style: { position: 'absolute', width: '3px', height: '100%', background: 'linear-gradient(180deg, #92400e 0%, #b45309 100%)', borderRadius: '2px', zIndex: 0 } }),
                    h('button', { 'aria-label': 'Set Rod',
                      onClick: function() { setRod(rodIdx, heavenlyVal ? val - 5 : val + 5); },
                      className: 'relative z-10 transition-all duration-200',
                      style: {
                        width: BEAD_SIZE + 8 + 'px', height: BEAD_SIZE - 4 + 'px', borderRadius: '50%',
                        background: heavenlyVal ? 'linear-gradient(135deg, ' + rodColor + ' 0%, ' + rodColor + 'cc 100%)' : 'linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%)',
                        border: '2px solid ' + (heavenlyVal ? rodColor : '#9ca3af'),
                        boxShadow: heavenlyVal ? '0 3px 8px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.5)' : '0 2px 4px rgba(0,0,0,0.15)',
                        transform: heavenlyVal ? 'translateY(12px)' : 'translateY(-2px)', cursor: 'pointer'
                      }
                    })
                  ),
                  h('div', { className: 'flex flex-col items-center gap-0.5 mt-2', style: { minHeight: '130px' } },
                    Array.from({ length: 5 }).map(function(_, bi) {
                      var isActive = bi < earthlyVal;
                      return h('button', { key: bi,
                        onClick: function() {
                          var newE = isActive && bi === earthlyVal - 1 ? earthlyVal - 1 : !isActive && bi === earthlyVal ? earthlyVal + 1 : bi < earthlyVal ? bi : bi + 1;
                          setRod(rodIdx, heavenlyVal * 5 + Math.max(0, Math.min(5, newE)));
                        },
                        className: 'relative z-10 transition-all duration-200',
                        style: {
                          width: BEAD_SIZE + 8 + 'px', height: BEAD_SIZE - 6 + 'px', borderRadius: '50%',
                          background: isActive ? 'linear-gradient(135deg, ' + rodColor + ' 0%, ' + rodColor + 'cc 100%)' : 'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)',
                          border: '2px solid ' + (isActive ? rodColor : '#d1d5db'),
                          boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.25), inset 0 1px 2px rgba(255,255,255,0.4)' : '0 1px 3px rgba(0,0,0,0.1)',
                          transform: isActive ? 'translateY(-' + (5 - earthlyVal) * 2 + 'px)' : 'translateY(' + (bi - earthlyVal) * 2 + 'px)',
                          cursor: 'pointer'
                        }
                      });
                    })
                  ),
                  h('div', { className: 'text-[11px] font-bold mt-1', style: { color: rodColor } }, placeNames[rodIdx]),
                  h('div', { className: 'text-xs font-mono font-bold text-amber-900' }, val)
                );
              })
            )
          ),

          // Controls
          h('div', { className: 'flex gap-2 flex-wrap' },
            h('button', { 'aria-label': 'Challenge', onClick: function() {
              var target = 1 + Math.floor(Math.random() * 99999);
              upd({ abacusChallenge: { target: target }, abacusFeedback: null, abacus: { rods: [0, 0, 0, 0, 0] }, speedChallenge: null });
            }, className: 'flex-1 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-lg text-sm hover:from-amber-600 hover:to-orange-600 transition-all shadow-md' }, '\uD83C\uDFB2 Challenge'),
            h('button', { 'aria-label': 'Speed', onClick: function() {
              var target = 1 + Math.floor(Math.random() * 99999);
              upd({ speedChallenge: { target: target, startTime: Date.now() }, abacusChallenge: null, abacusFeedback: null, abacus: { rods: [0, 0, 0, 0, 0] } });
            }, className: 'flex-1 py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold rounded-lg text-sm hover:from-rose-600 hover:to-pink-600 transition-all shadow-md' }, '\u23F1\uFE0F Speed'),
            h('button', { 'aria-label': 'Reset', onClick: function() { upd({ abacus: { rods: [0, 0, 0, 0, 0] }, abacusChallenge: null, abacusFeedback: null, speedChallenge: null }); }, className: 'px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300 transition-all' }, '\u21BA Reset')
          ),

          // Challenge / Speed display
          abacusChallenge && h('div', { className: 'bg-amber-50 rounded-lg p-3 border border-amber-200' },
            h('p', { className: 'text-sm font-bold text-amber-800 mb-2' }, '\uD83C\uDFAF Show ' + abacusChallenge.target.toLocaleString() + ' on the abacus'),
            h('div', { className: 'flex gap-2 items-center' },
              h('span', { className: 'text-xs text-amber-600' }, 'Your value: ', h('span', { className: 'font-bold text-amber-900' }, abacusTotal.toLocaleString())),
              h('button', { 'aria-label': 'Check', onClick: checkAbacus, className: 'ml-auto px-4 py-1.5 bg-amber-700 text-white font-bold rounded-lg text-sm hover:bg-amber-600 transition-all' }, '\u2714 Check')
            ),
            abacusFeedback && h('p', { className: 'text-sm font-bold mt-2 ' + (abacusFeedback.correct ? 'text-green-600' : 'text-red-600') }, abacusFeedback.msg)
          ),
          speedChallenge && h('div', { className: 'bg-rose-50 rounded-lg p-3 border border-rose-200' },
            h('p', { className: 'text-sm font-bold text-rose-800 mb-2' }, '\u23F1\uFE0F Speed: Show ' + speedChallenge.target.toLocaleString() + ' as fast as you can!'),
            h('div', { className: 'flex gap-2 items-center' },
              h('span', { className: 'text-xs text-rose-600' }, 'Your value: ', h('span', { className: 'font-bold text-rose-900' }, abacusTotal.toLocaleString())),
              h('button', { 'aria-label': 'Done!', onClick: checkSpeed, className: 'ml-auto px-4 py-1.5 bg-rose-700 text-white font-bold rounded-lg text-sm hover:bg-rose-600 transition-all' }, '\u2714 Done!')
            )
          ),

          // Culture cards
          h('div', null,
            h('button', { 'aria-label': 'Toggle cultural context panel', onClick: function() { upd({ showCulture: !showCulture }); }, className: 'text-[11px] font-bold ' + (showCulture ? 'text-amber-600' : 'text-slate-600') + ' hover:text-amber-600' }, (showCulture ? '\u25B2' : '\u25BC') + ' \uD83C\uDF0F Abacus Around the World'),
            showCulture && h('div', { className: 'grid grid-cols-2 gap-2 mt-2' },
              abacusFacts.map(function(fact) {
                return h('div', { key: fact.name, className: 'bg-amber-50 rounded-lg p-3 border border-amber-200' },
                  h('div', { className: 'text-sm font-bold text-amber-800 mb-1' }, fact.emoji + ' ' + fact.name),
                  h('div', { className: 'text-xs text-amber-700' }, fact.desc)
                );
              })
            )
          )
        );
      }

      // ═══════════════════════════════════════════════════════════════
      // ── SLIDE RULE MODE ──
      // ═══════════════════════════════════════════════════════════════
      if (manipMode === 'slideRule') {
        var PAD = 40, RULER_W = 520, SW = 600, SH = 180;
        var log10 = function(x) { return Math.log(x) / Math.LN10; };

        var renderScale = function(yBase, color, label, offset) {
          var ticks = [];
          for (var sn = 1; sn <= 10; sn++) {
            var x = PAD + (log10(sn) + (offset || 0)) * RULER_W;
            if (x < PAD || x > PAD + RULER_W) continue;
            ticks.push(h('line', { key: label + sn, x1: x, y1: yBase - 12, x2: x, y2: yBase + 12, stroke: color, strokeWidth: sn === 1 || sn === 10 ? 2 : 1 }));
            ticks.push(h('text', { key: label + 't' + sn, x: x, y: yBase + 24, textAnchor: 'middle', fill: color, style: { fontSize: '10px', fontWeight: 'bold' } }, sn));
          }
          for (var sm = 1; sm < 10; sm++) {
            for (var ss = 1; ss <= 9; ss++) {
              var val2 = sm + ss * 0.1;
              var xv = PAD + (log10(val2) + (offset || 0)) * RULER_W;
              if (xv >= PAD && xv <= PAD + RULER_W) {
                ticks.push(h('line', { key: label + 's' + sm + ss, x1: xv, y1: yBase - (ss === 5 ? 8 : 4), x2: xv, y2: yBase + (ss === 5 ? 8 : 4), stroke: color, strokeWidth: 0.5 }));
              }
            }
          }
          ticks.push(h('text', { key: label + 'lbl', x: PAD - 20, y: yBase + 4, textAnchor: 'middle', fill: color, style: { fontSize: '12px', fontWeight: 'bold' } }, label));
          return ticks;
        };

        var cursorX = PAD + (sr.cursorPos || 0.301) * RULER_W;

        return h('div', { className: 'space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200' },
          headerEl,
          h('div', { className: 'relative' },
            h('svg', {
              viewBox: '0 0 ' + SW + ' ' + SH, className: 'w-full rounded-xl border-2 border-amber-300 cursor-crosshair shadow-md',
              style: { maxWidth: '600px', background: '#fffbeb' },
              onClick: function(e) {
                var rect = e.currentTarget.getBoundingClientRect();
                var svgX = (e.clientX - rect.left) * (SW / rect.width);
                var svgY = (e.clientY - rect.top) * (SH / rect.height);
                var normX = (svgX - PAD) / RULER_W;
                if (normX < 0 || normX > 1) return;
                if (svgY < SH / 2) {
                  upd({ slideRule: Object.assign({}, sr, { cOffset: Math.max(-0.5, Math.min(0.5, normX - (sr.cursorPos || 0.301))) }) });
                } else {
                  upd({ slideRule: Object.assign({}, sr, { cursorPos: Math.max(0, Math.min(1, normX)) }) });
                }
                if (soundEnabled) sfxTick();
              }
            },
              h('rect', { x: 0, y: 0, width: SW, height: SH * 0.45, fill: '#f0fdf4', rx: 4 }),
              h('rect', { x: 0, y: SH * 0.45, width: SW, height: SH * 0.55, fill: '#fffbeb', rx: 4 }),
              renderScale(SH * 0.3, '#16a34a', 'C', sr.cOffset || 0),
              renderScale(SH * 0.7, '#d97706', 'D', 0),
              h('line', { x1: cursorX, y1: 0, x2: cursorX, y2: SH, stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '4 2' }),
              h('circle', { cx: cursorX, cy: SH * 0.3, r: 4, fill: '#ef4444' }),
              h('circle', { cx: cursorX, cy: SH * 0.7, r: 4, fill: '#ef4444' })
            )
          ),
          // Readout
          h('div', { className: 'bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200 p-4' },
            h('div', { className: 'grid grid-cols-3 gap-4 text-center' },
              h('div', null, h('div', { className: 'text-xs font-bold text-green-700 uppercase mb-1' }, 'C Scale'), h('div', { className: 'text-2xl font-bold font-mono text-green-800' }, cVal.toFixed(2))),
              h('div', null, h('div', { className: 'text-xs font-bold text-slate-600 uppercase mb-1' }, '\u00D7'), h('div', { className: 'text-2xl font-bold text-slate-600' }, '\u00D7')),
              h('div', null, h('div', { className: 'text-xs font-bold text-amber-700 uppercase mb-1' }, 'D Scale'), h('div', { className: 'text-2xl font-bold font-mono text-amber-800' }, dVal.toFixed(2)))
            ),
            h('div', { className: 'text-center mt-3 pt-3 border-t border-amber-200' },
              h('div', { className: 'text-xs font-bold text-slate-600 uppercase mb-1' }, 'Result'),
              h('div', { className: 'text-3xl font-bold font-mono text-orange-800' }, '\u2248 ' + product.toFixed(2))
            )
          ),

          // Controls + practice problems
          h('div', { className: 'flex gap-2 flex-wrap' },
            h('button', { 'aria-label': 'Practice Problem', onClick: function() {
              var p = srProblems[Math.floor(Math.random() * srProblems.length)];
              upd({ srProblem: p, srFeedback: null, slideRule: { cOffset: 0, cursorPos: 0.301 } });
            }, className: 'flex-1 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-lg text-sm hover:from-amber-600 hover:to-orange-600 transition-all shadow-md' }, '\uD83C\uDFAF Practice Problem'),
            h('button', { 'aria-label': 'Reset', onClick: function() { upd({ slideRule: { cOffset: 0, cursorPos: 0.301 }, srProblem: null, srFeedback: null }); }, className: 'px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300 transition-all' }, '\u21BA Reset')
          ),

          // Practice problem display
          srProblem && h('div', { className: 'bg-amber-50 rounded-lg p-3 border border-amber-200' },
            h('p', { className: 'text-sm font-bold text-amber-800 mb-2' }, '\uD83C\uDFAF Use the slide rule to multiply: ' + srProblem.a + ' \u00D7 ' + srProblem.b + ' = ?'),
            h('p', { className: 'text-xs text-amber-600 mb-2' }, '\uD83D\uDCA1 Set C-scale "1" to line up with ' + srProblem.a + ' on D, then find ' + srProblem.b + ' on C. Read D under it!'),
            h('div', { className: 'flex gap-2 items-center' },
              h('span', { className: 'text-xs text-amber-600' }, 'Your result: ', h('span', { className: 'font-bold text-amber-900' }, '\u2248 ' + product.toFixed(1))),
              h('button', { 'aria-label': 'Check', onClick: checkSR, className: 'ml-auto px-4 py-1.5 bg-amber-700 text-white font-bold rounded-lg text-sm hover:bg-amber-600 transition-all' }, '\u2714 Check')
            ),
            srFeedback && h('p', { className: 'text-sm font-bold mt-2 ' + (srFeedback.correct ? 'text-green-600' : 'text-red-600') }, srFeedback.msg)
          ),

          // Tutorial
          h('div', { className: 'bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-xs text-yellow-800 space-y-2' },
            h('p', { className: 'font-bold text-sm text-amber-800' }, '\uD83D\uDCCF How to Use the Slide Rule'),
            h('div', { className: 'space-y-1.5' },
              h('p', null, '1\uFE0F\u20E3 The slide rule multiplies using ', h('strong', null, 'logarithmic scales'), ' \u2014 sliding turns multiplication into addition.'),
              h('p', null, '2\uFE0F\u20E3 ', h('strong', null, 'Click the top (C) area'), ' to shift the C scale relative to D.'),
              h('p', null, '3\uFE0F\u20E3 ', h('strong', null, 'Click the bottom (D) area'), ' to move the red cursor.'),
              h('p', null, '4\uFE0F\u20E3 Read where the ', h('strong', null, 'cursor crosses both scales'), '. The readout shows exact values.')
            ),
            h('p', { className: 'text-[11px] text-amber-600 italic mt-1' }, '\uD83D\uDE80 NASA engineers used slide rules for Apollo moon mission trajectories!')
          )
        );
      }

      // ═══════════════════════════════════════════════════════════════
      // ── QUIZ MODE ──
      // ═══════════════════════════════════════════════════════════════
      if (manipMode === 'quiz') {
        return h('div', { className: 'space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200' },
          headerEl,
          h('div', { className: 'text-center' },
            h('h4', { className: 'text-lg font-bold text-orange-800' }, '\uD83E\uDDE0 Place Value Quiz'),
            h('p', { className: 'text-xs text-slate-600' }, 'Test your understanding of place value, expanded form, and number comparison')
          ),

          h('button', { 'aria-label': 'Generate new place value quiz', onClick: function() { upd({ pvQuiz: generatePVQuiz(), pvFeedback: null }); },
            className: 'w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-xl text-sm hover:from-orange-600 hover:to-amber-600 transition-all shadow-md'
          }, pvQuiz ? '\uD83D\uDD04 Next Question' : '\uD83C\uDFAF Start Quiz'),

          pvQuiz && h('div', { className: 'bg-white rounded-xl p-5 border-2 border-orange-200 shadow-sm' },
            h('div', { className: 'flex items-center gap-2 mb-3' },
              h('span', { className: 'text-[11px] font-bold uppercase px-2 py-0.5 rounded-full ' + (
                pvQuiz.type === 'digit_place' ? 'bg-blue-100 text-blue-700' :
                pvQuiz.type === 'expanded_to_standard' ? 'bg-green-100 text-green-700' :
                pvQuiz.type === 'standard_to_expanded' ? 'bg-purple-100 text-purple-700' :
                pvQuiz.type === 'compare' ? 'bg-amber-100 text-amber-700' :
                'bg-rose-100 text-rose-700'
              ) },
                pvQuiz.type === 'digit_place' ? 'Digit in Place' :
                pvQuiz.type === 'expanded_to_standard' ? 'Expanded \u2192 Standard' :
                pvQuiz.type === 'standard_to_expanded' ? 'Standard \u2192 Expanded' :
                pvQuiz.type === 'compare' ? 'Compare' : 'Rounding'
              )
            ),
            h('p', { className: 'text-lg font-bold text-slate-800 mb-4' }, pvQuiz.q),
            !pvFeedback && h('div', { className: 'grid grid-cols-2 gap-3' },
              pvQuiz.opts.map(function(opt) {
                return h('button', { 'aria-label': 'Next', key: opt, onClick: function() { answerPVQuiz(opt); },
                  className: 'px-4 py-3 rounded-xl text-sm font-bold border-2 bg-white text-slate-700 border-slate-200 hover:border-orange-400 hover:bg-orange-50 transition-all cursor-pointer'
                }, opt);
              })
            ),
            pvFeedback && h('div', { className: 'p-3 rounded-xl text-sm font-bold ' + (pvFeedback.correct ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200') },
              pvFeedback.msg,
              h('button', { 'aria-label': 'Next', onClick: function() { upd({ pvQuiz: generatePVQuiz(), pvFeedback: null }); }, className: 'ml-3 text-xs font-bold underline' }, '\u27A1 Next')
            )
          ),

          !pvQuiz && h('div', { className: 'text-center text-sm text-slate-600 py-8' }, 'Click "Start Quiz" to test your place value skills!'),

          // Quiz categories info
          h('div', { className: 'grid grid-cols-2 sm:grid-cols-3 gap-2' },
            [
              { icon: '\uD83D\uDD22', name: 'Digit in Place', desc: 'Find a specific digit' },
              { icon: '\uD83D\uDCC4', name: 'Expanded Form', desc: 'Break numbers apart' },
              { icon: '\u2696\uFE0F', name: 'Compare', desc: 'Greater/less than' },
              { icon: '\uD83C\uDFAF', name: 'Rounding', desc: 'Round to nearest 10/100/1000' },
              { icon: '\u21C4', name: 'Convert', desc: 'Between standard & expanded' },
              { icon: '\uD83E\uDDE0', name: 'Place Value', desc: 'What is each digit worth?' }
            ].map(function(cat) {
              return h('div', { key: cat.name, className: 'bg-orange-50 rounded-lg p-2 border border-orange-200 text-center' },
                h('div', { className: 'text-base mb-0.5' }, cat.icon),
                h('div', { className: 'text-[11px] font-bold text-orange-800' }, cat.name),
                h('div', { className: 'text-[11px] text-orange-500' }, cat.desc)
              );
            })
          ),

          // Coach tip
          h('div', { className: 'bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-3 border border-orange-100 text-xs text-orange-700' },
            streak >= 5 ? '\uD83D\uDD25 ' + streak + ' in a row! You\'re on fire! Keep going!'
            : score.total > 0 && score.correct === score.total ? '\u2B50 Perfect score so far! Try all the quiz types!'
            : '\uD83D\uDCA1 Place value is the foundation of our number system. Each position is 10\u00D7 the one to its right!'
          )
        );
      }

      // Default fallback
      return h('div', { className: 'space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200' },
        headerEl,
        h('p', { className: 'text-sm text-slate-600 text-center' }, 'Select a tool above to get started.')
      );
    }
  });
})();
