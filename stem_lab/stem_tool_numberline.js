// ═══════════════════════════════════════════
// stem_tool_numberline.js — Number Line Plugin (Enhanced v3)
// 4 tabs: Explore, Challenges, Skip Count, Fractions↔Decimals
// + sound effects, 12 badges, AI tutor, 6 challenge types,
//   fraction/decimal/percent equivalence with 4 simultaneous viz
//   (length bar, pie/area, hundred grid, dot set), drag-the-marker,
//   famous-fraction landmarks, repeating-decimal indicator,
//   skip counting, rounding, fractions, keyboard shortcuts
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
    if (document.getElementById('allo-live-numberline')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-numberline';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  // Fractions ↔ Decimals tab: visual juice (CSS keyframes + transition classes)
  (function() {
    if (document.getElementById('allo-numberline-fd-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-numberline-fd-css';
    st.textContent = [
      '@keyframes allo-fd-marker-pulse { 0% { filter: drop-shadow(0 0 0 rgba(220,38,38,0.6)); } 50% { filter: drop-shadow(0 0 6px rgba(220,38,38,0.65)); } 100% { filter: drop-shadow(0 0 0 rgba(220,38,38,0.6)); } }',
      '@keyframes allo-fd-landmark-pop { 0% { transform: scale(1); } 30% { transform: scale(1.18); } 60% { transform: scale(0.96); } 100% { transform: scale(1); } }',
      '@keyframes allo-fd-repeat-shimmer { 0%,100% { opacity: 0.55; } 50% { opacity: 0.95; } }',
      '.allo-fd-marker { filter: drop-shadow(0 1px 2px rgba(220,38,38,0.45)); animation: allo-fd-marker-pulse 2.6s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }',
      '.allo-fd-marker-slide { transition: transform 0.42s cubic-bezier(0.22, 1, 0.36, 1); }',
      '.allo-fd-marker-celebrate { animation: allo-fd-landmark-pop 0.6s ease-out; transform-box: fill-box; transform-origin: center; }',
      'svg[role="slider"]:focus { outline: 3px solid rgba(14, 116, 144, 0.55); outline-offset: 2px; border-radius: 4px; }',
      'svg[role="slider"]:focus-visible { outline: 3px solid rgba(14, 116, 144, 0.55); outline-offset: 2px; border-radius: 4px; }',
      '.allo-fd-fill { transition: fill 0.28s ease, opacity 0.28s ease, width 0.28s ease, transform 0.28s ease; }',
      '.allo-fd-repeat-dot { animation: allo-fd-repeat-shimmer 1.8s ease-in-out infinite; }',
      '.allo-fd-bg { background: radial-gradient(ellipse 1100px 480px at 50% -10%, rgba(14,116,144,0.10) 0%, rgba(14,116,144,0.04) 35%, rgba(255,255,255,0) 70%), linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); border-radius: 16px; padding: 10px; }',
      '.allo-nl-bg-explore { background: radial-gradient(ellipse 1100px 480px at 50% -10%, rgba(37,99,235,0.10) 0%, rgba(37,99,235,0.04) 35%, rgba(255,255,255,0) 70%), linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); border-radius: 16px; padding: 10px; }',
      '.allo-nl-bg-challenges { background: radial-gradient(ellipse 1100px 480px at 50% -10%, rgba(217,119,6,0.10) 0%, rgba(217,119,6,0.04) 35%, rgba(255,255,255,0) 70%), linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); border-radius: 16px; padding: 10px; }',
      '.allo-nl-bg-skipcount { background: radial-gradient(ellipse 1100px 480px at 50% -10%, rgba(147,51,234,0.10) 0%, rgba(147,51,234,0.04) 35%, rgba(255,255,255,0) 70%), linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); border-radius: 16px; padding: 10px; }',
      '.allo-fd-card-pulse { animation: allo-fd-landmark-pop 0.6s ease-out; }',
      '@media (prefers-reduced-motion: reduce) { .allo-fd-marker, .allo-fd-marker-celebrate, .allo-fd-card-pulse, .allo-fd-repeat-dot { animation: none !important; } .allo-fd-fill, .allo-fd-marker-slide { transition: none !important; } }'
    ].join('\n');
    document.head.appendChild(st);
  })();


  window.StemLab.registerTool('numberline', {
    icon: '\uD83D\uDCCF', label: 'Number Line',
    desc: 'Interactive number line with markers, 6 challenge types, skip counting, and AI tutor.',
    color: 'blue', category: 'math',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;

      if (!this._NumberLineComponent) {
        this._NumberLineComponent = function(props) {
          var ctx = props.ctx;
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
          var _n = ld._numberline || {};
          var upd = function(obj) {
            if (typeof ctx.setToolData === 'function') {
              ctx.setToolData(function(prev) {
                var nl = Object.assign({}, (prev && prev._numberline) || {}, obj);
                return Object.assign({}, prev, { _numberline: nl });
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
            if (muted) return;
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
          var tab = _n.tab || 'explore';
          var range = _n.range || { min: 0, max: 20 };
          var markers = _n.markers || [];
          var challenge = _n.challenge || null;
          var answer = _n.answer || '';
          var feedback = _n.feedback || null;
          var difficulty = _n.difficulty || 'easy';
          var score = _n.score || { correct: 0, total: 0 };
          var streak = _n.streak || 0;
          var bestStreak = _n.bestStreak || 0;
          var badges = _n.badges || {};

          // Skip count state
          var skipBy = _n.skipBy || 2;
          var skipFrom = _n.skipFrom || 0;
          var skipCount = _n.skipCount || 8;
          var showSkipMarkers = _n.showSkipMarkers != null ? _n.showSkipMarkers : true;

          // AI Tutor state
          var showAITutor = _n.showAITutor || false;
          var aiResponse = _n.aiResponse || '';
          var aiLoading = _n.aiLoading || false;
          var aiQuestion = _n.aiQuestion || '';

          // Challenge type tracking
          var challengeTypesUsed = _n.challengeTypesUsed || {};
          var roundingSolved = _n.roundingSolved || 0;
          var fractionSolved = _n.fractionSolved || 0;
          var negativeSolved = _n.negativeSolved || 0;
          var placeSolved = _n.placeSolved || 0;

          // Hover value for interactive line
          var hoverVal = _n.hoverVal || null;

          // Global mute (affects ALL sounds across all tabs)
          var muted = _n.muted || false;

          // Recent-positions trail (most-recent prev values from arithmetic; only on fracdec)
          var fdTrail = Array.isArray(_n.fdTrail) ? _n.fdTrail : [];

          // ── Fractions ↔ Decimals tab state ──
          var fdValue = _n.fdValue != null ? _n.fdValue : 0.5;
          var fdDen = _n.fdDen || 4;
          var fdMin = _n.fdMin != null ? _n.fdMin : 0;
          var fdMax = _n.fdMax != null ? _n.fdMax : 1;
          var fdShowBar = _n.fdShowBar !== false;       // default ON (length model)
          var fdShowReps = _n.fdShowReps !== false;     // default ON (pie + grid + dots)
          var fdShowMoney = _n.fdShowMoney || false;
          var fdShowExpansion = _n.fdShowExpansion || false;
          var fdSnap = _n.fdSnap !== false;             // default ON (snap clicks to denominator)
          var fdCompareOn = _n.fdCompareOn || false;
          var fdCompareValue = _n.fdCompareValue != null ? _n.fdCompareValue : 0.75;
          var fdLastLandmark = _n.fdLastLandmark != null ? _n.fdLastLandmark : null;
          var fdCelebrate = _n.fdCelebrate || false;    // brief pulse flag after landmark hit

          // Fraction-arithmetic + common-denominator hunter state
          var fdLastOpText = _n.fdLastOpText || '';
          var fdCDN1 = _n.fdCDN1 != null ? _n.fdCDN1 : 1;
          var fdCDD1 = _n.fdCDD1 != null ? _n.fdCDD1 : 2;
          var fdCDN2 = _n.fdCDN2 != null ? _n.fdCDN2 : 1;
          var fdCDD2 = _n.fdCDD2 != null ? _n.fdCDD2 : 3;

          var randInt = function(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; };
          var pick = function(arr) { return arr[Math.floor(Math.random() * arr.length)]; };

          // ═══ BADGE SYSTEM ═══
          var BADGES = [
            { id: 'firstMark', icon: '\uD83D\uDCCD', name: 'First Mark', desc: 'Answer your first challenge correctly', check: function(u) { return u.correct >= 1; } },
            { id: 'streak3', icon: '\uD83D\uDD25', name: 'Hot Streak', desc: 'Get a streak of 3', check: function(u) { return u.streak >= 3; } },
            { id: 'streak5', icon: '\u26A1', name: 'Lightning', desc: 'Get a streak of 5', check: function(u) { return u.streak >= 5; } },
            { id: 'streak10', icon: '\uD83C\uDF1F', name: 'Number Master', desc: 'Get a streak of 10', check: function(u) { return u.streak >= 10; } },
            { id: 'score10', icon: '\uD83C\uDFC5', name: 'Solid Ten', desc: 'Score 10 correct', check: function(u) { return u.correct >= 10; } },
            { id: 'score25', icon: '\uD83C\uDFC6', name: 'Quarter Hundred', desc: 'Score 25 correct', check: function(u) { return u.correct >= 25; } },
            { id: 'allTypes', icon: '\uD83C\uDF08', name: 'Well Rounded', desc: 'Try all 6 challenge types', check: function(u) { return u.typesUsed >= 6; } },
            { id: 'rounder', icon: '\uD83C\uDFAF', name: 'Rounder', desc: 'Solve 5 rounding challenges', check: function(u) { return u.roundingSolved >= 5; } },
            { id: 'fractionFinder', icon: '\uD83C\uDF55', name: 'Fraction Finder', desc: 'Solve 3 fraction challenges', check: function(u) { return u.fractionSolved >= 3; } },
            { id: 'negative', icon: '\u2796', name: 'Below Zero', desc: 'Solve 3 negative number challenges', check: function(u) { return u.negativeSolved >= 3; } },
            { id: 'placer', icon: '\uD83D\uDCCD', name: 'Precise Placer', desc: 'Place 5 markers correctly', check: function(u) { return u.placeSolved >= 5; } },
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
                addToast(b.icon + ' Badge: ' + b.name + ' \u2014 ' + b.desc, 'success');
                awardXP('numberlineBadge', 15, b.name);
              }
            });
            if (awarded) upd({ badges: newBadges });
          };

          var getBadgeUpdates = function(extraStreak, extraCorrect) {
            return {
              correct: score.correct + (extraCorrect || 0),
              streak: extraStreak != null ? extraStreak : streak,
              typesUsed: Object.keys(challengeTypesUsed).length,
              roundingSolved: roundingSolved,
              fractionSolved: fractionSolved,
              negativeSolved: negativeSolved,
              placeSolved: placeSolved,
              aiAsked: _n.aiAsked || 0
            };
          };

          // ═══ CHALLENGE GENERATION (6 types) ═══
          var genChallenge = function() {
            var rMin = difficulty === 'hard' ? -20 : difficulty === 'medium' ? -5 : 0;
            var rMax = difficulty === 'easy' ? 10 : 20;
            upd({ range: { min: rMin, max: rMax } });

            var types = ['identify', 'estimate', 'place', 'rounding', 'between', 'fraction'];
            if (difficulty === 'easy') types = ['identify', 'estimate', 'place', 'rounding', 'between'];
            var type = pick(types);
            var ch;

            if (type === 'identify') {
              var val = randInt(rMin, rMax);
              ch = { type: 'identify', _arrowValue: val, answer: val, question: 'What number does the arrow point to?' };

            } else if (type === 'estimate') {
              var val2 = rMin + Math.random() * (rMax - rMin);
              val2 = Math.round(val2 * 10) / 10;
              ch = { type: 'estimate', _arrowValue: val2, answer: Math.round(val2), question: 'Estimate the value the arrow points to (nearest whole number).' };

            } else if (type === 'place') {
              var val3 = randInt(rMin, rMax);
              ch = { type: 'place', targetValue: val3, answer: val3, question: 'Click the number line to place a marker at ' + val3 + '.' };

            } else if (type === 'rounding') {
              var bases = difficulty === 'easy' ? [10] : difficulty === 'hard' ? [10, 100, 1000] : [10, 100];
              var base = pick(bases);
              var raw = randInt(base === 10 ? 1 : base === 100 ? 10 : 100, base === 10 ? 99 : base === 100 ? 999 : 9999);
              var rounded = Math.round(raw / base) * base;
              ch = { type: 'rounding', question: 'Round ' + raw + ' to the nearest ' + base + '.', answer: rounded, hint: raw + ' is between ' + (Math.floor(raw / base) * base) + ' and ' + ((Math.floor(raw / base) + 1) * base) };
              upd({ range: { min: Math.floor(raw / base) * base - base, max: (Math.floor(raw / base) + 2) * base } });

            } else if (type === 'between') {
              var a = randInt(rMin, rMax - 2);
              var b = a + randInt(2, 4);
              ch = { type: 'between', question: 'Name a whole number between ' + a + ' and ' + b + '.', low: a, high: b, answer: a + 1 };
              // Accept any integer strictly between a and b
              ch._checkFn = function(ans) { return ans > a && ans < b && ans === Math.floor(ans); };

            } else if (type === 'fraction') {
              var den = pick([2, 3, 4, 5, 8, 10]);
              var num = randInt(1, den * 2);
              var fracVal = num / den;
              var displayFrac = num + '/' + den;
              var arrowPos = fracVal;
              ch = { type: 'fraction', _arrowValue: arrowPos, question: 'The arrow points to ' + displayFrac + '. What is this as a decimal? (1 decimal place)', answer: Math.round(fracVal * 10) / 10 };
              ch._checkFn = function(ans) { return Math.abs(ans - fracVal) < 0.06; };
              upd({ range: { min: Math.floor(fracVal) - 1, max: Math.ceil(fracVal) + 1 } });
            }

            // Track type
            var newTypes = Object.assign({}, challengeTypesUsed);
            newTypes[type] = true;

            sfxNewChallenge();
            upd({ challenge: ch, answer: '', feedback: null, challengeTypesUsed: newTypes, markers: [] });
          };

          // ═══ CHECK ANSWER ═══
          var rLen = range.max - range.min;
          var checkAnswer = function() {
            if (!challenge) return;
            var ans = parseFloat(answer);
            if (isNaN(ans)) return;

            var ok;
            if (challenge._checkFn) {
              ok = challenge._checkFn(ans);
            } else if (challenge.type === 'estimate') {
              ok = Math.abs(ans - challenge.answer) <= Math.max(1, rLen * 0.05);
            } else if (challenge.type === 'place') {
              ok = Math.abs(ans - challenge.answer) <= Math.max(1, rLen * 0.02);
            } else {
              ok = ans === challenge.answer;
            }

            var newStreak = ok ? streak + 1 : 0;
            var newBest = Math.max(bestStreak, newStreak);
            var newCorrect = score.correct + (ok ? 1 : 0);
            var newTotal = score.total + 1;

            // Per-type counters
            var newRounding = roundingSolved + (ok && challenge.type === 'rounding' ? 1 : 0);
            var newFraction = fractionSolved + (ok && challenge.type === 'fraction' ? 1 : 0);
            var newNegative = negativeSolved + (ok && challenge.type === 'identify' && challenge.answer < 0 ? 1 : 0);
            var newPlace = placeSolved + (ok && challenge.type === 'place' ? 1 : 0);

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
                : { correct: false, msg: '\u274C ' + (challenge.type === 'estimate' ? 'The value is approximately ' + challenge.answer + '.' : 'The correct answer is ' + challenge.answer + '.') + (challenge.hint ? ' (' + challenge.hint + ')' : '') },
              score: { correct: newCorrect, total: newTotal },
              streak: newStreak,
              bestStreak: newBest,
              roundingSolved: newRounding,
              fractionSolved: newFraction,
              negativeSolved: newNegative,
              placeSolved: newPlace
            });
            if (ok) awardXP('numberline', 5, 'number line');

            checkBadges({
              correct: newCorrect, streak: newStreak,
              typesUsed: Object.keys(challengeTypesUsed).length,
              roundingSolved: newRounding, fractionSolved: newFraction,
              negativeSolved: newNegative, placeSolved: newPlace,
              aiAsked: _n.aiAsked || 0
            });
          };

          // ═══ AI TUTOR ═══
          var askAITutor = function() {
            if (!aiQuestion.trim()) return;
            upd({ aiLoading: true, aiResponse: '' });
            var prompt = 'You are a friendly math tutor helping a student learn about number lines. ' +
              'They are working on the "' + tab + '" tab with range [' + range.min + ', ' + range.max + ']. ' +
              'Their question: "' + aiQuestion + '"\n\n' +
              'Give a clear, encouraging explanation appropriate for a student. Use number line examples. Keep it under 150 words.';
            ctx.callGemini(prompt, false, false, 0.7).then(function(resp) {
              upd({ aiResponse: resp, aiLoading: false, aiAsked: (_n.aiAsked || 0) + 1 });
              checkBadges(Object.assign(getBadgeUpdates(), { aiAsked: (_n.aiAsked || 0) + 1 }));
            }).catch(function() {
              upd({ aiResponse: 'Sorry, I could not connect to the AI tutor right now.', aiLoading: false });
            });
          };

          // ═══ KEYBOARD SHORTCUTS ═══
          React.useEffect(function() {
            var handler = function(e) {
              if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
              var key = e.key;
              if (key === '1') { sfxClick(); upd({ tab: 'explore' }); }
              else if (key === '2') { sfxClick(); upd({ tab: 'challenges' }); }
              else if (key === '3') { sfxClick(); upd({ tab: 'skipcount' }); }
              else if (key === '4') { sfxClick(); upd({ tab: 'fracdec' }); }
              else if (key === 'n' || key === 'N') { if (tab === 'challenges') genChallenge(); }
              else if (key === '?' || key === '/') { upd({ showAITutor: !showAITutor }); }
            };
            window.addEventListener('keydown', handler);
            return function() { window.removeEventListener('keydown', handler); };
          }, [tab, showAITutor]);

          // ═══ FRACTIONS↔DECIMALS LANDMARK DETECTION ═══
          // When the marker lands on a famous fraction (1/2, 1/4, 1/3…), brief
          // celebration: sound + toast + pulse animation. Encodes a real
          // mathematical observation (these decimals/fractions are the foundation
          // of fluency) as a discoverable moment instead of a worksheet.
          React.useEffect(function() {
            if (tab !== 'fracdec') return;
            var landmarks = [
              { v: 0,       name: 'Zero',                        dec: '0',    emoji: '⭐' },
              { v: 0.1,     name: 'One tenth',                   dec: '1/10', emoji: '⭐' },
              { v: 0.125,   name: 'One eighth',                  dec: '1/8',  emoji: '⭐' },
              { v: 0.2,     name: 'One fifth',                   dec: '1/5',  emoji: '⭐' },
              { v: 0.25,    name: 'One quarter',                 dec: '1/4',  emoji: '¼' },
              { v: 1/3,     name: 'One third (repeats forever)', dec: '1/3',  emoji: '🔁' },
              { v: 0.375,   name: 'Three eighths',               dec: '3/8',  emoji: '⭐' },
              { v: 0.4,     name: 'Two fifths',                  dec: '2/5',  emoji: '⭐' },
              { v: 0.5,     name: 'One half',                    dec: '1/2',  emoji: '½' },
              { v: 0.6,     name: 'Three fifths',                dec: '3/5',  emoji: '⭐' },
              { v: 0.625,   name: 'Five eighths',                dec: '5/8',  emoji: '⭐' },
              { v: 2/3,     name: 'Two thirds (repeats forever)',dec: '2/3',  emoji: '🔁' },
              { v: 0.75,    name: 'Three quarters',              dec: '3/4',  emoji: '¾' },
              { v: 0.8,     name: 'Four fifths',                 dec: '4/5',  emoji: '⭐' },
              { v: 0.875,   name: 'Seven eighths',               dec: '7/8',  emoji: '⭐' },
              { v: 1,       name: 'One whole',                   dec: '1',    emoji: '⭐' }
            ];
            var hit = null;
            for (var i = 0; i < landmarks.length; i++) {
              if (Math.abs(fdValue - landmarks[i].v) < 0.004) { hit = landmarks[i]; break; }
            }
            var lastKey = fdLastLandmark != null ? fdLastLandmark : 'none';
            var thisKey = hit ? hit.dec : 'none';
            if (thisKey !== lastKey) {
              if (hit) {
                upd({ fdLastLandmark: thisKey, fdCelebrate: true });
                sfxStreak();
                addToast(hit.emoji + ' Landmark: ' + hit.name + ' = ' + hit.dec, 'success');
                if (typeof awardXP === 'function') awardXP('numberlineLandmark', 3, 'landmark');
                setTimeout(function() { upd({ fdCelebrate: false }); }, 700);
              } else {
                upd({ fdLastLandmark: thisKey });
              }
            }
          }, [fdValue, tab]);

          // ═══ SVG NUMBER LINE RENDERER ═══
          var W = 700, H = 120, PAD = 40;

          var renderNumberLine = function(rangeObj, arrowValue, skipMarkersList) {
            var rMin = rangeObj.min;
            var rMax = rangeObj.max;
            var rL = rMax - rMin;
            if (rL <= 0) rL = 1;

            var steps = 20;
            var minorSteps = 0;
            if (rL <= 20) { steps = rL; minorSteps = 0; }
            else if (rL <= 50) { steps = 10; minorSteps = 5; }
            else if (rL <= 100) { steps = 10; minorSteps = 10; }
            else if (rL <= 1000) { steps = 10; minorSteps = 10; }
            else { steps = 10; minorSteps = 5; }

            if (steps <= 0) steps = 1;
            var ticks = [];

            for (var i = 0; i <= steps; i++) {
              var rawVal = rMin + (i * rL / steps);
              var val = Math.round(rawVal * 100) / 100;
              var x = PAD + i / steps * (W - 2 * PAD);
              var valStr = val.toLocaleString();
              var transformAttr = (valStr.length > 4) ? ('rotate(-40 ' + x + ' 98)') : '';

              ticks.push(h('g', { key: 'major-' + i },
                h('line', { x1: x, y1: 38, x2: x, y2: 82, stroke: '#1e40af', strokeWidth: 2.5 }),
                h('text', {
                  x: x, y: 102, textAnchor: valStr.length > 4 ? 'end' : 'middle',
                  transform: transformAttr,
                  fill: '#1e3a8a', fontSize: valStr.length > 4 ? '11' : '13',
                  fontWeight: 'bold', fontFamily: 'monospace'
                }, valStr)
              ));

              if (i < steps && minorSteps > 0) {
                for (var j = 1; j < minorSteps; j++) {
                  var minorX = x + (j / minorSteps) * ((W - 2 * PAD) / steps);
                  var isMid = minorSteps % 2 === 0 && j === minorSteps / 2;
                  ticks.push(h('line', {
                    key: 'minor-' + i + '-' + j,
                    x1: minorX, y1: isMid ? 45 : 52, x2: minorX, y2: isMid ? 75 : 68,
                    stroke: '#60a5fa', strokeWidth: isMid ? 2 : 1.5
                  }));
                }
              }
            }

            // Arrow element
            var arrowEl = null;
            if (arrowValue != null) {
              var arrowX = PAD + (arrowValue - rMin) / rL * (W - 2 * PAD);
              arrowEl = h('g', { key: 'arrow' },
                h('line', { x1: arrowX, y1: 8, x2: arrowX, y2: 38, stroke: '#ef4444', strokeWidth: 2.5 }),
                h('polygon', { points: (arrowX - 6) + ',38 ' + (arrowX + 6) + ',38 ' + arrowX + ',48', fill: '#ef4444' }),
                h('text', { x: arrowX, y: 7, textAnchor: 'middle', fill: '#ef4444', fontSize: '11', fontWeight: 'bold' }, '\u25BC')
              );
            }

            // Marker dots
            var markerEls = (markers || []).map(function(m, i) {
              var mx = PAD + (m.value - rMin) / rL * (W - 2 * PAD);
              return h('g', { key: 'marker-' + i },
                h('circle', { cx: mx, cy: 60, r: 10, fill: m.color || '#ef4444', stroke: '#fff', strokeWidth: 2 }),
                h('text', { x: mx, y: 30, textAnchor: 'middle', fill: m.color || '#ef4444', fontSize: '12', fontWeight: 'bold' }, m.label || m.value)
              );
            });

            // Skip count markers + arc-shaped hops (visual repeated addition)
            var skipEls = [];
            if (skipMarkersList && skipMarkersList.length > 0) {
              skipMarkersList.forEach(function(sm, i) {
                var sx = PAD + (sm - rMin) / rL * (W - 2 * PAD);
                if (sx >= PAD && sx <= W - PAD) {
                  skipEls.push(h('g', { key: 'skip-' + i },
                    h('circle', { cx: sx, cy: 60, r: 7, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 1.5, opacity: 0.85 }),
                    h('text', { x: sx, y: 22, textAnchor: 'middle', fill: '#7c3aed', fontSize: '10', fontWeight: 'bold' }, sm)
                  ));
                  if (i > 0) {
                    var prevSx = PAD + (skipMarkersList[i - 1] - rMin) / rL * (W - 2 * PAD);
                    var midX = (prevSx + sx) / 2;
                    var hopWidth = Math.abs(sx - prevSx);
                    var arcHeight = Math.min(30, Math.max(14, hopWidth * 0.38));
                    var peakY = 56 - arcHeight;
                    skipEls.push(h('path', {
                      key: 'skip-arc-' + i,
                      d: 'M ' + prevSx + ' 56 Q ' + midX + ' ' + peakY + ' ' + sx + ' 56',
                      fill: 'none',
                      stroke: '#a78bfa',
                      strokeWidth: 2,
                      strokeLinecap: 'round',
                      opacity: 0.8
                    }));
                    // Small downward triangle at landing — "hop ends here"
                    skipEls.push(h('polygon', {
                      key: 'skip-arrow-' + i,
                      points: (sx - 3) + ',52 ' + sx + ',58 ' + (sx + 3) + ',52',
                      fill: '#8b5cf6',
                      opacity: 0.9
                    }));
                    // Small "+by" label at the arc peak
                    if (hopWidth > 30) {
                      var stepVal = sm - skipMarkersList[i - 1];
                      var hopLabel = (stepVal >= 0 ? '+' : '') + stepVal;
                      skipEls.push(h('text', {
                        key: 'skip-step-' + i,
                        x: midX, y: peakY - 2,
                        textAnchor: 'middle',
                        fill: '#7c3aed', fontSize: 9, fontWeight: 'bold', fontFamily: 'monospace'
                      }, hopLabel));
                    }
                  }
                }
              });
            }

            return h('svg', {
              width: '100%', height: H, viewBox: '0 0 ' + W + ' ' + H, className: 'max-w-full',
              style: { cursor: (challenge && challenge.type === 'place') ? 'crosshair' : 'default' },
              onClick: function(e) {
                if (!challenge || challenge.type !== 'place') return;
                var rect = e.currentTarget.getBoundingClientRect();
                var scaleX = W / rect.width;
                var clickX = (e.clientX - rect.left) * scaleX;
                var fraction = (clickX - PAD) / (W - 2 * PAD);
                var valObj = rMin + fraction * rL;
                var step = rL > 50 ? Math.max(1, Math.round(rL / 50)) : 1;
                var valSnapped = Math.round(valObj / step) * step;
                if (valSnapped < rMin) valSnapped = rMin;
                if (valSnapped > rMax) valSnapped = rMax;
                sfxClick();
                upd({
                  answer: String(valSnapped),
                  markers: [{ value: valSnapped, color: '#f59e0b', label: '?' }]
                });
              }
            },
              h('line', { x1: PAD, y1: 60, x2: W - PAD, y2: 60, stroke: '#3b82f6', strokeWidth: 3, strokeLinecap: 'round' }),
              ticks,
              arrowEl,
              markerEls,
              skipEls,
              h('polygon', { points: (W - PAD) + ',53 ' + (W - PAD + 10) + ',60 ' + (W - PAD) + ',67', fill: '#3b82f6' }),
              h('polygon', { points: PAD + ',53 ' + (PAD - 10) + ',60 ' + PAD + ',67', fill: '#3b82f6' })
            );
          };

          // ═══ TAB: EXPLORE ═══
          var renderExplore = function() {
            return h('div', { className: 'space-y-4 allo-nl-bg-explore' },
              // Range controls
              h('div', { className: 'grid grid-cols-2 gap-3' },
                h('div', { className: 'bg-blue-50 rounded-lg p-3 border border-blue-100' },
                  h('label', { className: 'block text-xs text-blue-700 mb-1 font-bold' }, 'Min Value'),
                  h('input', {
                    type: 'number', value: range.min,
                    onChange: function(e) { upd({ range: { min: parseInt(e.target.value) || 0, max: range.max } }); },
                    className: 'w-full px-3 py-1.5 text-sm border border-blue-600 rounded-lg'
                  })
                ),
                h('div', { className: 'bg-blue-50 rounded-lg p-3 border border-blue-100' },
                  h('label', { className: 'block text-xs text-blue-700 mb-1 font-bold' }, 'Max Value'),
                  h('input', {
                    type: 'number', value: range.max,
                    onChange: function(e) { upd({ range: { min: range.min, max: parseInt(e.target.value) || 20 } }); },
                    className: 'w-full px-3 py-1.5 text-sm border border-blue-600 rounded-lg'
                  })
                )
              ),
              // Quick range presets
              h('div', { className: 'flex flex-wrap gap-1.5' },
                h('span', { className: 'text-[11px] font-bold text-slate-600 self-center' }, 'Presets:'),
                [[0, 10], [0, 20], [0, 100], [-10, 10], [-20, 20], [0, 1000]].map(function(pr) {
                  return h('button', { key: pr.join('-'),
                    onClick: function() { sfxClick(); upd({ range: { min: pr[0], max: pr[1] } }); },
                    className: 'px-2 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-600 hover:bg-blue-100 transition-all'
                  }, pr[0] + ' to ' + pr[1]);
                })
              ),
              // Number line
              h('div', { className: 'bg-white rounded-xl border-2 border-blue-200 p-6 flex flex-col items-center' },
                renderNumberLine(range, null, null)
              ),
              // Add marker
              h('div', { className: 'flex gap-2 items-center' },
                h('input', {
                  type: 'number', id: 'nlMarkerVal', min: range.min, max: range.max,
                  placeholder: 'Value',
                  'aria-label': 'Marker value',
                  className: 'w-24 px-3 py-1.5 text-sm border border-blue-600 rounded-lg'
                }),
                h('input', {
                  type: 'text', id: 'nlMarkerLabel', placeholder: 'Label (optional)',
                  'aria-label': 'Marker label',
                  className: 'flex-1 px-3 py-1.5 text-sm border border-blue-600 rounded-lg'
                }),
                h('input', { type: 'color', id: 'nlMarkerColor', defaultValue: '#ef4444', className: 'w-8 h-8 rounded cursor-pointer' }),
                h('button', { 'aria-label': '+ Add',
                  onClick: function() {
                    var valEl = document.getElementById('nlMarkerVal');
                    var labelEl = document.getElementById('nlMarkerLabel');
                    var colorEl = document.getElementById('nlMarkerColor');
                    if (!valEl || !valEl.value) return;
                    var v = parseFloat(valEl.value);
                    if (isNaN(v)) return;
                    sfxClick();
                    upd({ markers: markers.concat([{ value: v, label: labelEl ? labelEl.value : '', color: colorEl ? colorEl.value : '#ef4444' }]) });
                    if (valEl) valEl.value = '';
                    if (labelEl) labelEl.value = '';
                  },
                  className: 'px-4 py-1.5 bg-blue-700 text-white font-bold rounded-lg text-sm hover:bg-blue-600'
                }, '+ Add'),
                markers.length > 0 && h('button', { 'aria-label': 'Clear',
                  onClick: function() { upd({ markers: [] }); },
                  className: 'px-3 py-1.5 bg-slate-200 text-slate-600 font-bold rounded-lg text-sm hover:bg-slate-300'
                }, 'Clear')
              )
            );
          };

          // ═══ TAB: CHALLENGES ═══
          var renderChallenges = function() {
            return h('div', { className: 'space-y-4 allo-nl-bg-challenges' },
              // Number line (with challenge arrow)
              h('div', { className: 'bg-white rounded-xl border-2 border-blue-200 p-6 flex flex-col items-center' },
                renderNumberLine(range, challenge ? challenge._arrowValue : null, null)
              ),
              // Challenge section
              h('div', { className: 'bg-blue-50 rounded-xl p-4 border border-blue-200 space-y-3' },
                h('div', { className: 'flex items-center justify-between' },
                  h('div', { className: 'flex items-center gap-2' },
                    h('h4', { className: 'text-sm font-bold text-blue-800' }, '\uD83C\uDFAF Number Line Challenge'),
                    h('div', { className: 'flex gap-0.5 ml-2' },
                      ['easy', 'medium', 'hard'].map(function(d) {
                        return h('button', { key: d, onClick: function() { sfxClick(); upd({ difficulty: d }); },
                          className: 'text-[11px] font-bold px-1.5 py-0.5 rounded-full transition-all ' +
                            (difficulty === d ? (d === 'easy' ? 'bg-green-700 text-white' : d === 'hard' ? 'bg-red-700 text-white' : 'bg-blue-700 text-white') : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                        }, d);
                      })
                    )
                  ),
                  h('span', { className: 'text-[11px] text-slate-600' }, Object.keys(challengeTypesUsed).length + '/6 types')
                ),

                !challenge
                  ? h('button', { 'aria-label': 'Generate Challenge',
                      onClick: genChallenge,
                      className: 'w-full py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold rounded-xl text-sm hover:from-blue-600 hover:to-indigo-600 transition-all shadow-md'
                    }, '\uD83C\uDFB2 Generate Challenge')
                  : h('div', { className: 'space-y-2' },
                      h('div', { className: 'flex items-center gap-2' },
                        h('span', { className: 'text-[11px] font-bold uppercase text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full' }, challenge.type),
                        streak > 0 && h('span', { className: 'text-[11px] font-bold text-orange-500' }, '\uD83D\uDD25 ' + streak)
                      ),
                      h('p', { className: 'text-sm font-bold text-blue-800' }, challenge.question),
                      h('div', { className: 'flex gap-2 items-center' },
                        challenge.type !== 'place' ? h('input', {
                          type: 'number', value: answer, step: challenge.type === 'fraction' ? '0.1' : '1',
                          onChange: function(e) { upd({ answer: e.target.value }); },
                          onKeyDown: function(e) { if (e.key === 'Enter' && answer) checkAnswer(); },
                          placeholder: 'Your answer',
                          'aria-label': 'Challenge answer',
                          className: 'flex-1 px-3 py-2 border border-blue-600 rounded-lg text-sm font-mono'
                        }) : h('div', { className: 'flex-1 text-sm font-bold text-amber-600 px-2' }, 'Click the number line above to place a marker.'),
                        h('button', { 'aria-label': 'Check Answer',
                          onClick: checkAnswer,
                          disabled: challenge.type === 'place' && !answer,
                          className: 'px-4 py-2 bg-blue-600 text-white font-bold rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-all'
                        }, challenge.type === 'place' ? 'Check Placement' : 'Check')
                      ),
                      feedback && h('p', { className: 'text-sm font-bold ' + (feedback.correct ? 'text-green-600' : 'text-red-600') }, feedback.msg),
                      feedback && h('button', { 'aria-label': 'Next Challenge',
                        onClick: genChallenge,
                        className: 'text-xs text-blue-600 font-bold hover:underline'
                      }, '\u27A1\uFE0F Next Challenge')
                    )
              )
            );
          };

          // ═══ TAB: SKIP COUNT ═══
          var renderSkipCount = function() {
            var skipMarkersList = [];
            if (showSkipMarkers) {
              for (var i = 0; i < skipCount; i++) {
                skipMarkersList.push(skipFrom + i * skipBy);
              }
            }
            var skipMin = skipFrom - skipBy;
            var skipMax = skipFrom + skipCount * skipBy + skipBy;

            return h('div', { className: 'space-y-4 allo-nl-bg-skipcount' },
              // Controls
              h('div', { className: 'grid grid-cols-3 gap-3' },
                h('div', { className: 'bg-violet-50 rounded-lg p-3 border border-violet-100' },
                  h('label', { className: 'block text-xs text-violet-700 mb-1 font-bold' }, 'Skip By'),
                  h('input', {
                    type: 'number', min: 1, max: 100, value: skipBy,
                    onChange: function(e) { upd({ skipBy: Math.max(1, parseInt(e.target.value) || 1) }); },
                    className: 'w-full px-3 py-1.5 text-sm border border-violet-600 rounded-lg text-center font-bold'
                  })
                ),
                h('div', { className: 'bg-violet-50 rounded-lg p-3 border border-violet-100' },
                  h('label', { className: 'block text-xs text-violet-700 mb-1 font-bold' }, 'Start From'),
                  h('input', {
                    type: 'number', value: skipFrom,
                    onChange: function(e) { upd({ skipFrom: parseInt(e.target.value) || 0 }); },
                    className: 'w-full px-3 py-1.5 text-sm border border-violet-600 rounded-lg text-center font-bold'
                  })
                ),
                h('div', { className: 'bg-violet-50 rounded-lg p-3 border border-violet-100' },
                  h('label', { className: 'block text-xs text-violet-700 mb-1 font-bold' }, 'How Many'),
                  h('input', {
                    type: 'number', min: 2, max: 20, value: skipCount,
                    onChange: function(e) { upd({ skipCount: Math.max(2, Math.min(20, parseInt(e.target.value) || 8)) }); },
                    className: 'w-full px-3 py-1.5 text-sm border border-violet-600 rounded-lg text-center font-bold'
                  })
                )
              ),
              // Quick skip presets
              h('div', { className: 'flex flex-wrap gap-1.5' },
                h('span', { className: 'text-[11px] font-bold text-slate-600 self-center' }, 'Count by:'),
                [2, 3, 5, 10, 25, 100].map(function(s) {
                  return h('button', { key: s,
                    onClick: function() { sfxClick(); upd({ skipBy: s, skipFrom: 0, skipCount: 8 }); },
                    className: 'px-3 py-1 rounded-lg text-xs font-bold ' +
                      (skipBy === s ? 'bg-violet-600 text-white' : 'bg-violet-50 text-violet-700 border border-violet-600 hover:bg-violet-100') + ' transition-all'
                  }, '' + s + 's');
                })
              ),
              // Number line with skip markers
              h('div', { className: 'bg-white rounded-xl border-2 border-violet-200 p-6 flex flex-col items-center' },
                renderNumberLine({ min: skipMin, max: skipMax }, null, showSkipMarkers ? skipMarkersList : null)
              ),
              // Sequence display
              h('div', { className: 'bg-violet-50 rounded-xl p-4 border border-violet-200' },
                h('p', { className: 'text-xs font-bold text-violet-700 uppercase tracking-wider mb-2' }, '\uD83D\uDD22 Skip Counting Sequence'),
                h('div', { className: 'flex flex-wrap gap-2' },
                  skipMarkersList.map(function(val, i) {
                    return h('div', {
                      key: i,
                      className: 'px-3 py-2 rounded-lg border text-center transition-all ' +
                        (i === 0 ? 'bg-violet-200 border-violet-400 shadow-sm' : 'bg-white border-violet-200 hover:bg-violet-50')
                    },
                      h('span', { className: 'text-sm font-bold ' + (i === 0 ? 'text-violet-800' : 'text-violet-700') }, val),
                      h('span', { className: 'text-[11px] text-violet-400 block' }, i === 0 ? 'start' : '+' + skipBy)
                    );
                  })
                ),
                h('p', { className: 'text-xs text-violet-500 mt-2' },
                  '\uD83D\uDCA1 Pattern: ' + skipFrom + ', ' + (skipFrom + skipBy) + ', ' + (skipFrom + 2 * skipBy) + ', ... (adding ' + skipBy + ' each time)')
              ),
              // Toggle
              h('button', { onClick: function() { sfxClick(); upd({ showSkipMarkers: !showSkipMarkers }); },
                className: 'text-xs font-bold ' + (showSkipMarkers ? 'text-violet-600' : 'text-slate-600') + ' hover:text-violet-800 transition-colors'
              }, showSkipMarkers ? '\uD83D\uDC41 Hide markers on line' : '\uD83D\uDC41 Show markers on line')
            );
          };

          // ═══ TAB: FRACTIONS ↔ DECIMALS ═══
          // Pedagogical goal: make fraction-decimal-percent equivalence VISIBLE.
          // Same point on the line, three names. Four simultaneous visualizations
          // (length bar, pie/area, hundred grid, dot set) showing the SAME quantity
          // so students see conservation across representations.
          var renderFracDec = function() {
            var fdLen = fdMax - fdMin;
            if (fdLen <= 0) fdLen = 1;

            var gcdFn = function(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = b; b = a % b; a = t; } return a || 1; };

            var snapValue = function(v) {
              if (!fdSnap) return v;
              var step = 1 / fdDen;
              return Math.round((v - fdMin) / step) * step + fdMin;
            };

            // Current value as fraction at fdDen
            var nearestNum = Math.round(fdValue * fdDen);
            var isExactFrac = Math.abs(fdValue * fdDen - nearestNum) < 0.005;
            var g = gcdFn(nearestNum, fdDen);
            var simpNum = nearestNum / g;
            var simpDen = fdDen / g;
            var decimal = Math.round(fdValue * 10000) / 10000;
            var percent = Math.round(fdValue * 10000) / 100;

            // Repeating-decimal detection: terminates iff simplified denominator
            // factors into only 2s and 5s. 1/4 = 0.25 (terminates), 1/3 = 0.333… (repeats).
            var isRepeatingDecimal = (function() {
              if (!isExactFrac || simpNum === 0) return false;
              var d = simpDen;
              while (d % 2 === 0) d /= 2;
              while (d % 5 === 0) d /= 5;
              return d !== 1;
            })();

            var moneyStr = '$' + (fdValue < 0 ? '-' : '') + Math.abs(fdValue).toFixed(2);

            // Place-value expansion: 0.625 = 6/10 + 2/100 + 5/1000
            var expansion = (function() {
              var parts = [];
              var sign = fdValue < 0 ? '-' : '';
              var abs = Math.abs(fdValue);
              var intPart = Math.floor(abs);
              if (intPart !== 0) parts.push(sign + intPart);
              var frac = abs - intPart;
              var divisors = [10, 100, 1000, 10000];
              for (var p = 0; p < 4 && frac > 0.00001; p++) {
                frac *= 10;
                var digit = Math.floor(frac + 0.0000001);
                frac -= digit;
                if (digit !== 0) parts.push((p === 0 && sign ? sign : '') + digit + '/' + divisors[p]);
              }
              return parts.join(' + ') || '0';
            })();

            // Mixed-number form for values ≥ 1 (improper → mixed)
            // 3/2 = 1 1/2. The bridge between abstract improper notation and
            // the "amount more than one whole" intuition.
            var mixedNumber = (function() {
              if (!isExactFrac || Math.abs(fdValue) < 1) return null;
              var sign = fdValue < 0 ? '-' : '';
              var abs = Math.abs(fdValue);
              var wholePart = Math.floor(abs);
              var remainingFrac = abs - wholePart;
              if (remainingFrac < 0.005) return { whole: wholePart, num: 0, den: 1, sign: sign };
              var rNum = Math.round(remainingFrac * fdDen);
              var rG = gcdFn(rNum, fdDen);
              return { whole: wholePart, num: rNum / rG, den: fdDen / rG, sign: sign };
            })();

            // Equivalent fractions — the same value with proportionally larger denominators.
            // 1/2 = 2/4 = 3/6 = 4/8 = 5/10. Makes the "infinite names, same point" point.
            var equivalentFractions = (function() {
              if (!isExactFrac || simpNum === 0 || simpDen === 0) return [];
              var equivs = [];
              for (var k = 1; k <= 6; k++) {
                var n = simpNum * k;
                var d = simpDen * k;
                if (d > 100) break;
                equivs.push({ n: n, d: d, k: k });
              }
              return equivs;
            })();

            // Plain-English fraction reading
            var fracInWords = (function() {
              if (!isExactFrac) return '';
              if (simpNum === 0) return 'zero';
              var denWord = { 2: 'half', 3: 'third', 4: 'quarter', 5: 'fifth', 6: 'sixth', 8: 'eighth', 10: 'tenth', 12: 'twelfth', 16: 'sixteenth', 20: 'twentieth' }[simpDen] || ('over ' + simpDen);
              if (simpDen === 2 && simpNum === 1) return 'one half';
              var plural = simpNum > 1 && denWord.indexOf('over') === -1 ? denWord + 's' : denWord;
              var numWord = { 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten' }[simpNum] || simpNum;
              return numWord + ' ' + plural;
            })();

            // Drag-the-marker (pointer events). Tap places; drag glides without snap;
            // release snaps to denominator if snap is on.
            var startPointer = function(e) {
              if (e.cancelable) e.preventDefault();
              var svgEl = e.currentTarget;
              var rect = svgEl.getBoundingClientRect();
              var W_ = 700, PAD_ = 50;
              var clampMove = function(clientX) {
                var scaleX = W_ / rect.width;
                var x = (clientX - rect.left) * scaleX;
                var frac = (x - PAD_) / (W_ - 2 * PAD_);
                var v = fdMin + frac * fdLen;
                if (v < fdMin) v = fdMin;
                if (v > fdMax) v = fdMax;
                return v;
              };
              var v0 = clampMove(e.clientX);
              upd({ fdValue: v0 });
              var move = function(ev) {
                var v = clampMove(ev.clientX);
                upd({ fdValue: v });
              };
              var up = function() {
                window.removeEventListener('pointermove', move);
                window.removeEventListener('pointerup', up);
                window.removeEventListener('pointercancel', up);
                if (fdSnap && typeof ctx.setToolData === 'function') {
                  ctx.setToolData(function(prev) {
                    var nl = (prev && prev._numberline) || {};
                    var curVal = nl.fdValue != null ? nl.fdValue : 0.5;
                    var step = 1 / (nl.fdDen || fdDen);
                    var mn = nl.fdMin != null ? nl.fdMin : fdMin;
                    var snapped = Math.round((curVal - mn) / step) * step + mn;
                    return Object.assign({}, prev, { _numberline: Object.assign({}, nl, { fdValue: snapped }) });
                  });
                }
              };
              window.addEventListener('pointermove', move);
              window.addEventListener('pointerup', up);
              window.addEventListener('pointercancel', up);
            };

            // ── Fraction arithmetic on the line ──
            // Adding 1/4 to 1/4 makes the marker SLIDE to 1/2 — visible motion,
            // not magic. Auto-extends the line if you drift past the edge.
            var applyArith = function(op, n, d) {
              if (!d || d === 0) return;
              var delta = n / d;
              var prev = fdValue;
              var next = op === '+' ? prev + delta : prev - delta;
              var newMin = fdMin, newMax = fdMax;
              if (next > newMax) newMax = Math.ceil(next * 2) / 2 + 0.0001 > Math.ceil(next) ? Math.ceil(next) : Math.ceil(next * 2) / 2;
              if (next < newMin) newMin = Math.floor(next * 2) / 2;
              var prevR = Math.round(prev * 1000) / 1000;
              var nextR = Math.round(next * 1000) / 1000;
              var eqText = prevR + ' ' + op + ' ' + n + '/' + d + ' = ' + nextR;
              // Push prev into the ghost trail (cap at 5 entries, oldest first)
              var newTrail = (fdTrail || []).concat([prev]);
              if (newTrail.length > 5) newTrail = newTrail.slice(-5);
              sfxClick();
              upd({ fdValue: next, fdMin: newMin, fdMax: newMax, fdLastOpText: eqText, fdTrail: newTrail });
              announceToSR(eqText);
            };

            // ── Common-denominator hunter (LCM-based) ──
            // To add 1/2 and 1/3, you need a shared denominator. LCM(2,3)=6 works.
            // 1/2 = 3/6, 1/3 = 2/6, sum = 5/6. Shows the whole renaming step explicitly.
            var lcmCalc = function(a, b) {
              if (a <= 0 || b <= 0) return 1;
              return Math.abs(a * b) / gcdFn(a, b);
            };
            var lcmOfDen = lcmCalc(fdCDD1 || 1, fdCDD2 || 1);
            var cd1Mult = lcmOfDen / (fdCDD1 || 1);
            var cd2Mult = lcmOfDen / (fdCDD2 || 1);
            var cd1ScaledN = fdCDN1 * cd1Mult;
            var cd2ScaledN = fdCDN2 * cd2Mult;
            var cdSumN = cd1ScaledN + cd2ScaledN;
            var cdSumD = lcmOfDen;
            var cdSumG = gcdFn(cdSumN, cdSumD);
            var cdSumSimpN = cdSumN / cdSumG;
            var cdSumSimpD = cdSumD / cdSumG;
            var cdSumValue = cdSumN / cdSumD;

            // Keyboard navigation: nudge marker by 1/fdDen, jump by 5 with Shift,
            // Home/End to endpoints, PageUp/PageDown by 5 steps. Marker must be focusable.
            var stepBy = function(steps) {
              var step = 1 / fdDen;
              var next = fdValue + steps * step;
              if (next < fdMin) next = fdMin;
              if (next > fdMax) next = fdMax;
              upd({ fdValue: next });
              announceToSR((Math.round(next * 1000) / 1000) + '');
            };
            var handleLineKey = function(e) {
              var key = e.key;
              var handled = true;
              if (key === 'ArrowLeft' || key === 'ArrowDown') stepBy(e.shiftKey ? -5 : -1);
              else if (key === 'ArrowRight' || key === 'ArrowUp') stepBy(e.shiftKey ? 5 : 1);
              else if (key === 'Home') { upd({ fdValue: fdMin }); announceToSR(fdMin + ''); }
              else if (key === 'End') { upd({ fdValue: fdMax }); announceToSR(fdMax + ''); }
              else if (key === 'PageDown') stepBy(-5);
              else if (key === 'PageUp') stepBy(5);
              else handled = false;
              if (handled) { e.preventDefault(); sfxClick(); }
            };

            // Custom number line for this tab
            var renderFdLine = function() {
              var W = 700, H = 170, PAD = 50;
              // Rotate labels at high denominators to prevent overlap
              var rotate = fdDen >= 12;
              var rotateAngle = fdDen >= 16 ? -45 : -30;
              var fracFontSize = fdDen >= 16 ? 10 : 12;
              var ticks = [];
              for (var i = 0; i <= fdDen; i++) {
                var tickFrac = fdMin + i * fdLen / fdDen;
                var x = PAD + (i / fdDen) * (W - 2 * PAD);
                var fracLabel = (i === 0) ? '0' : (i === fdDen && fdMax === 1 ? '1' : (i + '/' + fdDen));
                var decLabel = '' + (Math.round(tickFrac * 1000) / 1000);
                var fracTextProps = {
                  x: x, y: rotate ? 56 : 60, textAnchor: rotate ? 'end' : 'middle',
                  fill: '#155e75', fontSize: fracFontSize, fontWeight: 'bold', fontFamily: 'monospace'
                };
                if (rotate) fracTextProps.transform = 'rotate(' + rotateAngle + ' ' + x + ' ' + 56 + ')';
                var decTextProps = {
                  x: x, y: rotate ? 122 : 118, textAnchor: rotate ? 'start' : 'middle',
                  fill: '#475569', fontSize: 10, fontFamily: 'monospace'
                };
                if (rotate) decTextProps.transform = 'rotate(' + rotateAngle + ' ' + x + ' ' + 122 + ')';
                ticks.push(h('g', { key: 'fdt-' + i },
                  h('line', { x1: x, y1: 70, x2: x, y2: 100, stroke: '#0e7490', strokeWidth: 2 }),
                  h('text', fracTextProps, fracLabel),
                  h('text', decTextProps, decLabel)
                ));
              }
              var mx = PAD + ((fdValue - fdMin) / fdLen) * (W - 2 * PAD);
              var markerCls = 'allo-fd-marker allo-fd-marker-slide' + (fdCelebrate ? ' allo-fd-marker-celebrate' : '');
              // Render the marker at x=0 in its inner geometry, then translate the
              // whole group to mx with a CSS transition — smooth slide on value change.
              var markerEl = h('g', { key: 'fd-marker', className: markerCls,
                style: { transform: 'translate(' + mx + 'px, 0px)' }
              },
                h('line', { x1: 0, y1: 30, x2: 0, y2: 85, stroke: '#dc2626', strokeWidth: 2.5 }),
                h('circle', { cx: 0, cy: 85, r: 9, fill: '#dc2626', stroke: '#fff', strokeWidth: 2 }),
                h('polygon', { points: '-6,30 6,30 0,40', fill: '#dc2626' }),
                h('text', { x: 0, y: 24, textAnchor: 'middle', fill: '#dc2626', fontSize: 11, fontWeight: 'bold' }, decimal)
              );

              // Ghost trail: prior arithmetic positions, fading by age
              var trailEls = [];
              if (fdTrail && fdTrail.length >= 1) {
                fdTrail.forEach(function(tv, ti) {
                  if (tv < fdMin || tv > fdMax) return;
                  var tx = PAD + ((tv - fdMin) / fdLen) * (W - 2 * PAD);
                  var age = fdTrail.length - 1 - ti;   // 0 = most recent, larger = older
                  var op = Math.max(0.12, 0.45 - age * 0.08);
                  trailEls.push(h('g', { key: 'fd-trail-' + ti, opacity: op },
                    h('circle', { cx: tx, cy: 85, r: 6, fill: 'none', stroke: '#dc2626', strokeWidth: 1.5, strokeDasharray: '2 2' }),
                    h('text', { x: tx, y: 76, textAnchor: 'middle', fill: '#94a3b8', fontSize: 9, fontFamily: 'monospace' }, Math.round(tv * 100) / 100)
                  ));
                });
              }
              var compareEl = null;
              if (fdCompareOn) {
                var cmx = PAD + ((fdCompareValue - fdMin) / fdLen) * (W - 2 * PAD);
                compareEl = h('g', { key: 'fd-cmp' },
                  h('line', { x1: cmx, y1: 85, x2: cmx, y2: 140, stroke: '#0891b2', strokeWidth: 2.5, strokeDasharray: '4 2', className: 'allo-fd-fill' }),
                  h('circle', { cx: cmx, cy: 140, r: 7, fill: '#0891b2', stroke: '#fff', strokeWidth: 2, className: 'allo-fd-fill' }),
                  h('text', { x: cmx, y: 156, textAnchor: 'middle', fill: '#0e7490', fontSize: 11, fontWeight: 'bold' }, (Math.round(fdCompareValue * 1000) / 1000))
                );
              }
              var svgH = rotate ? 190 : H;
              return h('svg', {
                width: '100%', height: svgH, viewBox: '0 0 ' + W + ' ' + svgH, className: 'max-w-full',
                style: { cursor: 'grab', touchAction: 'none', userSelect: 'none', outline: 'none' },
                role: 'slider',
                tabIndex: 0,
                'aria-valuemin': fdMin,
                'aria-valuemax': fdMax,
                'aria-valuenow': Math.round(fdValue * 1000) / 1000,
                'aria-valuetext': decimal + ', which is ' + simpNum + ' over ' + simpDen + (isRepeatingDecimal ? ', repeating decimal' : ''),
                'aria-label': 'Number line marker. Use arrow keys to move, Home/End for endpoints, Shift for larger steps.',
                onPointerDown: startPointer,
                onKeyDown: handleLineKey
              },
                h('line', { x1: PAD, y1: 85, x2: W - PAD, y2: 85, stroke: '#0e7490', strokeWidth: 3, strokeLinecap: 'round' }),
                ticks,
                trailEls,
                markerEl,
                compareEl,
                h('polygon', { points: (W - PAD) + ',78 ' + (W - PAD + 10) + ',85 ' + (W - PAD) + ',92', fill: '#0e7490' }),
                h('polygon', { points: PAD + ',78 ' + (PAD - 10) + ',85 ' + PAD + ',92', fill: '#0e7490' })
              );
            };

            // Fraction bar (length model)
            var renderFracBar = function() {
              var W = 700, H = 70, PAD = 50;
              var barH = 40, barY = 12;
              var segW = (W - 2 * PAD) / fdDen;
              var segs = [];
              for (var i = 0; i < fdDen; i++) {
                var x = PAD + i * segW;
                var fillFrac = 0;
                var scaledVal = fdValue * fdDen;
                if (scaledVal >= i + 1) fillFrac = 1;
                else if (scaledVal > i) fillFrac = scaledVal - i;
                segs.push(h('g', { key: 'bar-' + i },
                  h('rect', { x: x, y: barY, width: segW, height: barH, fill: '#ecfeff', stroke: '#0e7490', strokeWidth: 1.5 }),
                  fillFrac > 0 && h('rect', { x: x, y: barY, width: segW * fillFrac, height: barH, fill: '#06b6d4', opacity: 0.85, className: 'allo-fd-fill' })
                ));
                if (segW > 30) {
                  segs.push(h('text', { key: 'bar-lbl-' + i,
                    x: x + segW / 2, y: barY + barH + 14,
                    textAnchor: 'middle', fill: '#155e75', fontSize: 10, fontFamily: 'monospace'
                  }, (i + 1) + '/' + fdDen));
                }
              }
              return h('svg', {
                width: '100%', height: H, viewBox: '0 0 ' + W + ' ' + H, className: 'max-w-full',
                role: 'img',
                'aria-label': 'Fraction bar showing approximately ' + simpNum + ' out of ' + simpDen + ' parts filled'
              }, segs);
            };

            // Pie / circle (area model)
            var renderFracPie = function() {
              var W = 180, H = 180, cx = 90, cy = 90, r = 72;
              var slices = [];
              var scaled = fdValue * fdDen;
              var fullCount = Math.floor(scaled + 0.0000001);
              var partial = scaled - fullCount;
              if (partial < 0.001) partial = 0;
              if (fullCount > fdDen) { fullCount = fdDen; partial = 0; }
              var wedgePath = function(startFrac, endFrac) {
                var a1 = startFrac * 2 * Math.PI - Math.PI / 2;
                var a2 = endFrac * 2 * Math.PI - Math.PI / 2;
                var x1 = cx + r * Math.cos(a1);
                var y1 = cy + r * Math.sin(a1);
                var x2 = cx + r * Math.cos(a2);
                var y2 = cy + r * Math.sin(a2);
                var large = (a2 - a1) > Math.PI ? 1 : 0;
                return 'M ' + cx + ' ' + cy + ' L ' + x1 + ' ' + y1 + ' A ' + r + ' ' + r + ' 0 ' + large + ' 1 ' + x2 + ' ' + y2 + ' Z';
              };
              for (var i = 0; i < fdDen; i++) {
                slices.push(h('path', { key: 'pie-bg-' + i, d: wedgePath(i / fdDen, (i + 1) / fdDen), fill: '#ecfeff', stroke: '#0e7490', strokeWidth: 1.5 }));
              }
              for (var j = 0; j < fullCount; j++) {
                slices.push(h('path', { key: 'pie-f-' + j, d: wedgePath(j / fdDen, (j + 1) / fdDen), fill: '#06b6d4', opacity: 0.88, stroke: '#0e7490', strokeWidth: 1.5, className: 'allo-fd-fill' }));
              }
              if (partial > 0 && fullCount < fdDen) {
                slices.push(h('path', { key: 'pie-partial', d: wedgePath(fullCount / fdDen, (fullCount + partial) / fdDen), fill: '#67e8f9', opacity: 0.65, stroke: '#0e7490', strokeWidth: 1.5, className: 'allo-fd-fill' }));
              }
              return h('svg', { width: '100%', height: H, viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Circle in ' + fdDen + ' wedges, ' + (isExactFrac ? simpNum + ' of ' + simpDen : 'about ' + nearestNum + '/' + fdDen) + ' filled' }, slices);
            };

            // Hundred-grid (10×10, bridge to percent)
            var renderFracGrid = function() {
              var W = 180, H = 180, PAD = 4;
              var cellSize = (W - 2 * PAD) / 10;
              var fillCount = Math.round(fdValue * 100);
              if (fillCount < 0) fillCount = 0;
              if (fillCount > 100) fillCount = 100;
              var cells = [];
              for (var rr = 0; rr < 10; rr++) {
                for (var cc = 0; cc < 10; cc++) {
                  var idx = rr * 10 + cc;
                  var filled = idx < fillCount;
                  cells.push(h('rect', {
                    key: 'g-' + idx,
                    x: PAD + cc * cellSize, y: PAD + rr * cellSize,
                    width: cellSize - 0.5, height: cellSize - 0.5,
                    fill: filled ? '#06b6d4' : '#ecfeff',
                    stroke: '#0e7490', strokeWidth: 0.5,
                    opacity: filled ? 0.88 : 1,
                    className: filled ? 'allo-fd-fill' : null
                  }));
                }
              }
              cells.push(h('line', { key: 'mid-v', x1: PAD + 5 * cellSize, y1: PAD, x2: PAD + 5 * cellSize, y2: PAD + 10 * cellSize, stroke: '#0e7490', strokeWidth: 1.2, opacity: 0.5 }));
              cells.push(h('line', { key: 'mid-h', x1: PAD, y1: PAD + 5 * cellSize, x2: PAD + 10 * cellSize, y2: PAD + 5 * cellSize, stroke: '#0e7490', strokeWidth: 1.2, opacity: 0.5 }));
              return h('svg', { width: '100%', height: H, viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': fillCount + ' of 100 squares filled, which is ' + percent + ' percent' }, cells);
            };

            // Dot-set (discrete / NCTM set model)
            var renderFracDots = function() {
              var W = 180, H = 180, PAD = 12;
              var cols = fdDen <= 5 ? fdDen : (fdDen <= 10 ? 5 : (fdDen <= 12 ? 4 : (fdDen <= 16 ? 4 : 5)));
              var rows = Math.ceil(fdDen / cols);
              var scaled = fdValue * fdDen;
              var fullCount = Math.floor(scaled + 0.0000001);
              var partial = scaled - fullCount;
              if (partial < 0.001) partial = 0;
              if (fullCount > fdDen) { fullCount = fdDen; partial = 0; }
              var spacingX = (W - 2 * PAD) / cols;
              var spacingY = (H - 2 * PAD) / rows;
              var dotR = Math.min(spacingX, spacingY) * 0.36;
              var dots = [];
              for (var i = 0; i < fdDen; i++) {
                var c = i % cols;
                var rIdx = Math.floor(i / cols);
                var dcx = PAD + spacingX * (c + 0.5);
                var dcy = PAD + spacingY * (rIdx + 0.5);
                var isFull = i < fullCount;
                var isPartial = i === fullCount && partial > 0;
                dots.push(h('circle', {
                  key: 'd-' + i,
                  cx: dcx, cy: dcy, r: dotR,
                  fill: isFull ? '#06b6d4' : (isPartial ? '#67e8f9' : '#ecfeff'),
                  stroke: '#0e7490', strokeWidth: 1.5,
                  opacity: isFull ? 0.9 : (isPartial ? 0.65 : 1),
                  className: (isFull || isPartial) ? 'allo-fd-fill' : null
                }));
              }
              return h('svg', { width: '100%', height: H, viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': fullCount + ' of ' + fdDen + ' dots filled' + (partial > 0 ? ', plus a partial one' : '') }, dots);
            };

            var presetFracs = [
              { n: 1, d: 2, dec: '0.5' },
              { n: 1, d: 3, dec: '0.333…' }, { n: 2, d: 3, dec: '0.667…' },
              { n: 1, d: 4, dec: '0.25' }, { n: 3, d: 4, dec: '0.75' },
              { n: 1, d: 5, dec: '0.2' }, { n: 2, d: 5, dec: '0.4' }, { n: 3, d: 5, dec: '0.6' }, { n: 4, d: 5, dec: '0.8' },
              { n: 1, d: 8, dec: '0.125' }, { n: 3, d: 8, dec: '0.375' }, { n: 5, d: 8, dec: '0.625' }, { n: 7, d: 8, dec: '0.875' },
              { n: 1, d: 10, dec: '0.1' }, { n: 1, d: 100, dec: '0.01' }
            ];

            return h('div', { className: 'space-y-4 allo-fd-bg' },
              h('div', { className: 'bg-cyan-50 rounded-lg p-3 border border-cyan-200' },
                h('div', { className: 'flex flex-wrap items-center gap-2 mb-2' },
                  h('span', { className: 'text-xs font-bold text-cyan-800' }, 'Divide the line into:'),
                  [2, 3, 4, 5, 6, 8, 10, 12, 16, 20].map(function(d) {
                    return h('button', {
                      key: d,
                      'aria-pressed': fdDen === d,
                      onClick: function() { sfxClick(); upd({ fdDen: d }); },
                      className: 'px-2.5 py-1 rounded-lg text-xs font-bold transition-all ' +
                        (fdDen === d ? 'bg-cyan-700 text-white shadow-sm' : 'bg-white text-cyan-700 border border-cyan-300 hover:bg-cyan-100')
                    }, d + ' parts');
                  })
                ),
                h('div', { className: 'flex flex-wrap items-center gap-3 text-[11px]' },
                  h('label', { className: 'font-bold text-cyan-700 flex items-center gap-1 cursor-pointer' },
                    h('input', { type: 'checkbox', checked: fdSnap, onChange: function() { upd({ fdSnap: !fdSnap }); } }),
                    'Snap to fractions of ' + fdDen
                  ),
                  h('label', { className: 'font-bold text-cyan-700 flex items-center gap-1 cursor-pointer' },
                    h('input', { type: 'checkbox', checked: fdShowBar, onChange: function() { upd({ fdShowBar: !fdShowBar }); } }),
                    'Bar'
                  ),
                  h('label', { className: 'font-bold text-cyan-700 flex items-center gap-1 cursor-pointer' },
                    h('input', { type: 'checkbox', checked: fdShowReps, onChange: function() { upd({ fdShowReps: !fdShowReps }); } }),
                    'Pie + grid + dots'
                  )
                )
              ),

              fdShowBar && h('div', { className: 'bg-white rounded-xl border-2 border-cyan-200 p-3' },
                h('p', { className: 'text-[11px] font-bold text-cyan-700 mb-1' }, '▒ Fraction bar — length model (' + fdDen + ' equal parts)'),
                renderFracBar()
              ),

              h('div', { className: 'bg-white rounded-xl border-2 border-cyan-200 p-3' },
                h('div', { className: 'flex items-center justify-between mb-1' },
                  h('p', { className: 'text-[11px] font-bold text-cyan-700' }, '📏 Number line — fractions above, decimals below'),
                  h('span', { className: 'text-[11px] text-slate-600 italic' }, 'Tap or drag the marker')
                ),
                renderFdLine()
              ),

              fdShowReps && h('div', { className: 'bg-white rounded-xl border-2 border-cyan-200 p-3' + (fdCelebrate ? ' allo-fd-card-pulse' : '') },
                h('p', { className: 'text-[11px] font-bold text-cyan-700 mb-2' },
                  '🔄 Same amount, three more visuals. Quantity is conserved across every representation.'
                ),
                h('div', { className: 'grid grid-cols-1 sm:grid-cols-3 gap-3' },
                  h('div', { className: 'flex flex-col items-center bg-cyan-50/40 rounded-lg p-2 border border-cyan-100' },
                    h('p', { className: 'text-[10px] font-bold text-cyan-800 mb-1 uppercase tracking-wider' }, '◐ Pie (area)'),
                    renderFracPie(),
                    h('p', { className: 'text-[10px] text-slate-700 italic mt-1 text-center' },
                      isExactFrac ? (simpNum + ' of ' + simpDen + ' wedges') : ('~' + nearestNum + '/' + fdDen + ' wedges')
                    )
                  ),
                  h('div', { className: 'flex flex-col items-center bg-cyan-50/40 rounded-lg p-2 border border-cyan-100' },
                    h('p', { className: 'text-[10px] font-bold text-cyan-800 mb-1 uppercase tracking-wider' }, '⊞ Hundred grid'),
                    renderFracGrid(),
                    h('p', { className: 'text-[10px] text-slate-700 italic mt-1 text-center' },
                      Math.round(fdValue * 100) + ' of 100 squares = ' + percent + '%'
                    )
                  ),
                  h('div', { className: 'flex flex-col items-center bg-cyan-50/40 rounded-lg p-2 border border-cyan-100' },
                    h('p', { className: 'text-[10px] font-bold text-cyan-800 mb-1 uppercase tracking-wider' }, '● Dots (set)'),
                    renderFracDots(),
                    h('p', { className: 'text-[10px] text-slate-700 italic mt-1 text-center' },
                      Math.floor(fdValue * fdDen) + ' of ' + fdDen + ' dots filled'
                    )
                  )
                ),
                h('p', { className: 'text-[10px] text-slate-600 italic mt-2 text-center' },
                  'Length, area, base-10 area, discrete count. Four ways to see ' + (isExactFrac ? simpNum + '/' + simpDen : decimal) + '.'
                )
              ),

              h('div', { className: 'grid grid-cols-3 gap-2' },
                h('div', { className: 'bg-cyan-50 rounded-xl p-3 border-2 border-cyan-300 text-center' + (fdCelebrate ? ' allo-fd-card-pulse' : '') },
                  h('p', { className: 'text-[10px] font-bold text-cyan-700 uppercase tracking-wider mb-1' }, 'Fraction'),
                  h('p', { className: 'text-2xl font-bold text-cyan-900 font-mono' },
                    isExactFrac ? (simpNum + '/' + simpDen) : ('≈ ' + nearestNum + '/' + fdDen)
                  ),
                  mixedNumber && mixedNumber.whole > 0 && h('p', { className: 'text-sm font-bold text-cyan-700 font-mono mt-0.5' },
                    mixedNumber.sign + mixedNumber.whole + (mixedNumber.num > 0 ? ' ' + mixedNumber.num + '/' + mixedNumber.den : '') + ' (mixed)'
                  ),
                  isExactFrac
                    ? h('p', { className: 'text-[10px] text-cyan-700 italic mt-1' }, fracInWords)
                    : h('p', { className: 'text-[10px] text-slate-500 italic mt-1' }, 'not exact at ' + fdDen + 'ths')
                ),
                h('div', { className: 'bg-amber-50 rounded-xl p-3 border-2 border-amber-300 text-center' + (fdCelebrate ? ' allo-fd-card-pulse' : '') },
                  h('p', { className: 'text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1' },
                    'Decimal',
                    isRepeatingDecimal && h('span', { className: 'allo-fd-repeat-dot ml-1', title: 'This decimal repeats forever' }, ' ↻')
                  ),
                  h('p', { className: 'text-2xl font-bold text-amber-900 font-mono' }, decimal + (isRepeatingDecimal ? '…' : '')),
                  isRepeatingDecimal
                    ? h('p', { className: 'text-[10px] text-amber-700 italic mt-1' }, simpNum + ' ÷ ' + simpDen + ' = repeats forever')
                    : h('p', { className: 'text-[10px] text-amber-700 italic mt-1' }, simpNum + ' ÷ ' + simpDen + ' = ' + decimal)
                ),
                h('div', { className: 'bg-emerald-50 rounded-xl p-3 border-2 border-emerald-300 text-center' + (fdCelebrate ? ' allo-fd-card-pulse' : '') },
                  h('p', { className: 'text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1' }, 'Percent'),
                  h('p', { className: 'text-2xl font-bold text-emerald-900 font-mono' }, percent + '%'),
                  h('p', { className: 'text-[10px] text-emerald-700 italic mt-1' }, 'per hundred')
                )
              ),

              // ── Fraction arithmetic on the line (slide the marker) ──
              h('div', { className: 'bg-fuchsia-50 rounded-xl p-3 border border-fuchsia-200' },
                h('p', { className: 'text-[11px] font-bold text-fuchsia-800 mb-1' },
                  '➕➖ Move the marker by a fraction — fraction arithmetic on the line'
                ),
                h('p', { className: 'text-[10px] text-fuchsia-700 italic mb-2' },
                  'Click a chip below. The marker slides; all four visuals update. The line auto-extends if you drift past the edge.'
                ),
                h('div', { className: 'space-y-1.5' },
                  ['+', '−'].map(function(op) {
                    return h('div', { key: 'arith-row-' + op, className: 'flex flex-wrap items-center gap-1.5' },
                      h('span', { className: 'text-base font-bold text-fuchsia-700 w-5 text-center', 'aria-hidden': 'true' }, op),
                      [[1,2], [1,3], [1,4], [1,5], [1,6], [1,8], [1,10], [2,3], [3,4], [1,1]].map(function(pair) {
                        return h('button', {
                          key: op + '-' + pair[0] + '-' + pair[1],
                          onClick: function() { applyArith(op, pair[0], pair[1]); },
                          'aria-label': op + ' ' + pair[0] + ' over ' + pair[1],
                          className: 'px-2 py-1 rounded-lg text-[11px] font-bold font-mono transition-all ' +
                            'bg-white text-fuchsia-700 border border-fuchsia-300 hover:bg-fuchsia-100 hover:shadow-sm'
                        }, op + pair[0] + '/' + pair[1]);
                      })
                    );
                  })
                ),
                fdLastOpText && h('p', {
                  className: 'text-xs font-bold text-fuchsia-900 font-mono mt-2 bg-white rounded px-2 py-1 inline-block border border-fuchsia-200',
                  'aria-live': 'polite'
                }, '🧮 ' + fdLastOpText)
              ),

              // ── Common-denominator hunter (LCM-based fraction addition) ──
              h('div', { className: 'bg-rose-50 rounded-xl p-3 border border-rose-200' },
                h('p', { className: 'text-[11px] font-bold text-rose-800 mb-1' },
                  '🤝 Common-denominator hunter — how to add fractions with different denominators'
                ),
                h('p', { className: 'text-[10px] text-rose-700 italic mb-2' },
                  'You cannot add 1/2 + 1/3 directly. First find a shared denominator (the LCM works), rename each fraction, then add the numerators.'
                ),
                h('div', { className: 'flex flex-wrap items-center gap-1 mb-2 text-sm font-mono' },
                  h('input', { type: 'number', value: fdCDN1, min: 0, max: 100, step: 1,
                    onChange: function(e) { var v = parseInt(e.target.value, 10); if (!isNaN(v) && v >= 0) upd({ fdCDN1: v }); },
                    'aria-label': 'First fraction numerator',
                    className: 'w-12 px-1 py-0.5 border border-rose-300 rounded text-center' }),
                  h('span', { className: 'text-rose-700 font-bold' }, '/'),
                  h('input', { type: 'number', value: fdCDD1, min: 1, max: 100, step: 1,
                    onChange: function(e) { var v = parseInt(e.target.value, 10); if (!isNaN(v) && v > 0) upd({ fdCDD1: v }); },
                    'aria-label': 'First fraction denominator',
                    className: 'w-12 px-1 py-0.5 border border-rose-300 rounded text-center' }),
                  h('span', { className: 'mx-2 text-rose-700 font-bold text-base' }, '+'),
                  h('input', { type: 'number', value: fdCDN2, min: 0, max: 100, step: 1,
                    onChange: function(e) { var v = parseInt(e.target.value, 10); if (!isNaN(v) && v >= 0) upd({ fdCDN2: v }); },
                    'aria-label': 'Second fraction numerator',
                    className: 'w-12 px-1 py-0.5 border border-rose-300 rounded text-center' }),
                  h('span', { className: 'text-rose-700 font-bold' }, '/'),
                  h('input', { type: 'number', value: fdCDD2, min: 1, max: 100, step: 1,
                    onChange: function(e) { var v = parseInt(e.target.value, 10); if (!isNaN(v) && v > 0) upd({ fdCDD2: v }); },
                    'aria-label': 'Second fraction denominator',
                    className: 'w-12 px-1 py-0.5 border border-rose-300 rounded text-center' }),
                  h('span', { className: 'ml-2 text-rose-700 font-bold' }, '= ?')
                ),
                h('div', { className: 'text-xs space-y-1 text-rose-900 mb-2 bg-white/60 rounded p-2 border border-rose-100' },
                  h('p', {}, 'Smallest common denominator: ',
                    h('b', { className: 'font-mono text-base text-rose-900' }, 'LCM(' + fdCDD1 + ', ' + fdCDD2 + ') = ' + lcmOfDen)
                  ),
                  h('p', { className: 'font-mono' },
                    '  ' + fdCDN1 + '/' + fdCDD1 + ' → ' + cd1ScaledN + '/' + lcmOfDen,
                    h('span', { className: 'text-[10px] text-rose-600 ml-2' }, '(× ' + cd1Mult + '/' + cd1Mult + ' top and bottom)')
                  ),
                  h('p', { className: 'font-mono' },
                    '  ' + fdCDN2 + '/' + fdCDD2 + ' → ' + cd2ScaledN + '/' + lcmOfDen,
                    h('span', { className: 'text-[10px] text-rose-600 ml-2' }, '(× ' + cd2Mult + '/' + cd2Mult + ' top and bottom)')
                  ),
                  h('p', { className: 'font-mono font-bold' },
                    '  Sum: ' + cd1ScaledN + '/' + lcmOfDen + ' + ' + cd2ScaledN + '/' + lcmOfDen + ' = ' + cdSumN + '/' + lcmOfDen +
                    (cdSumSimpD !== cdSumD ? ' = ' + cdSumSimpN + '/' + cdSumSimpD : '') +
                    ' ≈ ' + (Math.round(cdSumValue * 1000) / 1000)
                  )
                ),
                h('button', {
                  onClick: function() {
                    var newMax = fdMax;
                    if (cdSumValue > newMax) newMax = Math.ceil(cdSumValue);
                    sfxClick();
                    upd({
                      fdValue: cdSumValue, fdDen: cdSumD, fdMax: newMax,
                      fdLastOpText: fdCDN1 + '/' + fdCDD1 + ' + ' + fdCDN2 + '/' + fdCDD2 + ' = ' + cdSumSimpN + '/' + cdSumSimpD
                    });
                    announceToSR('Sum plotted: ' + cdSumSimpN + ' over ' + cdSumSimpD);
                  },
                  className: 'px-3 py-1.5 bg-rose-700 text-white text-xs font-bold rounded hover:bg-rose-800 transition-all'
                }, '→ Plot the sum on the line'),
                h('div', { className: 'flex flex-wrap gap-1 mt-2' },
                  h('span', { className: 'text-[10px] font-bold text-rose-700 self-center mr-1' }, 'Try:'),
                  [[1,2,1,3], [1,4,1,3], [2,3,1,6], [3,4,1,8], [1,5,2,5], [1,2,1,4]].map(function(q, idx) {
                    return h('button', {
                      key: 'cdq-' + idx,
                      onClick: function() { sfxClick(); upd({ fdCDN1: q[0], fdCDD1: q[1], fdCDN2: q[2], fdCDD2: q[3] }); },
                      className: 'px-2 py-0.5 rounded text-[10px] font-mono bg-white text-rose-700 border border-rose-300 hover:bg-rose-100'
                    }, q[0] + '/' + q[1] + ' + ' + q[2] + '/' + q[3]);
                  })
                )
              ),

              // ── Equivalent fractions ribbon (same point, many names) ──
              equivalentFractions.length > 1 && h('div', { className: 'bg-teal-50 rounded-xl p-3 border border-teal-200' },
                h('p', { className: 'text-[11px] font-bold text-teal-800 mb-2' },
                  '∞ Equivalent fractions — same point, many names. Click to re-divide the line.'
                ),
                h('div', { className: 'flex flex-wrap items-center gap-1.5' },
                  equivalentFractions.map(function(eq, idx) {
                    var active = eq.d === fdDen;
                    return h(React.Fragment, { key: 'eq-' + eq.d },
                      idx > 0 && h('span', { className: 'text-teal-500 font-bold text-xs' }, '='),
                      h('button', {
                        'aria-label': eq.n + ' over ' + eq.d + (active ? ' (current)' : ''),
                        'aria-pressed': active,
                        onClick: function() {
                          sfxClick();
                          upd({ fdDen: eq.d });
                          announceToSR(eq.n + ' over ' + eq.d);
                        },
                        className: 'px-2 py-1 rounded-lg text-xs font-bold font-mono transition-all ' +
                          (active ? 'bg-teal-700 text-white shadow-sm' : 'bg-white text-teal-700 border border-teal-300 hover:bg-teal-100')
                      }, eq.n + '/' + eq.d)
                    );
                  })
                ),
                h('p', { className: 'text-[10px] text-teal-700 italic mt-2' },
                  'Multiply (or divide) the top AND bottom by the same number → same value, different name. The marker does not move.'
                )
              ),

              h('div', { className: 'bg-slate-50 rounded-xl p-3 border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-3' },
                h('div', {},
                  h('label', { className: 'block text-[11px] font-bold text-slate-700 mb-1' }, 'Type a fraction, plot it:'),
                  h('div', { className: 'flex items-center gap-1' },
                    h('input', { type: 'number', placeholder: 'n', min: 0, id: 'fdNum',
                      'aria-label': 'Fraction numerator',
                      className: 'w-14 px-2 py-1 text-sm border border-slate-300 rounded text-center font-mono' }),
                    h('span', { className: 'text-xl font-bold text-slate-600' }, '/'),
                    h('input', { type: 'number', placeholder: 'd', min: 1, id: 'fdDenInput',
                      'aria-label': 'Fraction denominator',
                      className: 'w-14 px-2 py-1 text-sm border border-slate-300 rounded text-center font-mono' }),
                    h('button', { 'aria-label': 'Plot fraction',
                      onClick: function() {
                        var nEl = document.getElementById('fdNum');
                        var dEl = document.getElementById('fdDenInput');
                        if (!nEl || !dEl) return;
                        var nv = parseFloat(nEl.value), dv = parseFloat(dEl.value);
                        if (isNaN(nv) || isNaN(dv) || dv === 0) { addToast('Enter a numerator and non-zero denominator.', 'warning'); return; }
                        var v = nv / dv;
                        var newMin = fdMin, newMax = fdMax;
                        if (v > newMax) newMax = Math.ceil(v);
                        if (v < newMin) newMin = Math.floor(v);
                        sfxClick();
                        upd({ fdValue: v, fdDen: dv, fdMin: newMin, fdMax: newMax });
                        announceToSR(nv + ' over ' + dv + ' equals ' + (Math.round(v * 1000) / 1000));
                      },
                      className: 'px-2.5 py-1 bg-cyan-700 text-white text-xs font-bold rounded hover:bg-cyan-800 transition-all'
                    }, '→ Plot')
                  )
                ),
                h('div', {},
                  h('label', { className: 'block text-[11px] font-bold text-slate-700 mb-1' }, 'Type a decimal, plot it:'),
                  h('div', { className: 'flex items-center gap-1' },
                    h('input', { type: 'number', step: 0.01, placeholder: '0.00', id: 'fdDec',
                      'aria-label': 'Decimal value',
                      className: 'flex-1 px-2 py-1 text-sm border border-slate-300 rounded font-mono' }),
                    h('button', { 'aria-label': 'Plot decimal',
                      onClick: function() {
                        var dEl = document.getElementById('fdDec');
                        if (!dEl) return;
                        var v = parseFloat(dEl.value);
                        if (isNaN(v)) { addToast('Enter a decimal.', 'warning'); return; }
                        var newMin = fdMin, newMax = fdMax;
                        if (v > newMax) newMax = Math.ceil(v);
                        if (v < newMin) newMin = Math.floor(v);
                        sfxClick();
                        upd({ fdValue: v, fdMin: newMin, fdMax: newMax });
                        announceToSR(v + ' on the line');
                      },
                      className: 'px-2.5 py-1 bg-amber-700 text-white text-xs font-bold rounded hover:bg-amber-800 transition-all'
                    }, '→ Plot')
                  )
                )
              ),

              h('div', { className: 'bg-indigo-50 rounded-xl p-3 border border-indigo-200' },
                h('p', { className: 'text-[11px] font-bold text-indigo-700 mb-2' }, '📌 Quick conversions (click to plot):'),
                h('div', { className: 'flex flex-wrap gap-1.5' },
                  presetFracs.map(function(pf) {
                    var v = pf.n / pf.d;
                    var active = Math.abs(v - fdValue) < 0.001 && fdDen === pf.d;
                    return h('button', {
                      key: pf.n + '_' + pf.d,
                      'aria-label': pf.n + ' over ' + pf.d + ' equals ' + pf.dec,
                      onClick: function() {
                        sfxClick();
                        var nextMax = fdMax;
                        if (v > fdMax) nextMax = Math.ceil(v);
                        upd({ fdValue: v, fdDen: pf.d, fdMax: nextMax });
                        announceToSR(pf.n + ' over ' + pf.d + ' equals ' + pf.dec);
                      },
                      className: 'px-2 py-1 rounded-lg text-[11px] font-bold transition-all font-mono ' +
                        (active ? 'bg-indigo-700 text-white shadow-sm' : 'bg-white text-indigo-700 border border-indigo-300 hover:bg-indigo-100')
                    }, pf.n + '/' + pf.d + ' = ' + pf.dec);
                  })
                )
              ),

              h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2' },
                h('div', { className: 'bg-emerald-50 rounded-lg p-3 border border-emerald-200' },
                  h('div', { className: 'flex items-center justify-between mb-1' },
                    h('p', { className: 'text-[11px] font-bold text-emerald-800' }, '💵 Money view'),
                    h('button', {
                      onClick: function() { upd({ fdShowMoney: !fdShowMoney }); },
                      'aria-expanded': fdShowMoney,
                      className: 'text-[10px] font-bold text-emerald-700 hover:underline'
                    }, fdShowMoney ? 'hide' : 'show')
                  ),
                  fdShowMoney && h('div', {},
                    h('p', { className: 'text-lg font-bold text-emerald-900 font-mono' }, moneyStr + ' of $1.00'),
                    h('p', { className: 'text-[11px] text-emerald-700 mt-1' },
                      'A quarter is $0.25 = 1/4 of a dollar. A dime is $0.10 = 1/10. Coins are decimal-fraction practice.'
                    )
                  )
                ),
                h('div', { className: 'bg-sky-50 rounded-lg p-3 border border-sky-200' },
                  h('div', { className: 'flex items-center justify-between mb-1' },
                    h('p', { className: 'text-[11px] font-bold text-sky-800' }, '🔍 Place-value expansion'),
                    h('button', {
                      onClick: function() { upd({ fdShowExpansion: !fdShowExpansion }); },
                      'aria-expanded': fdShowExpansion,
                      className: 'text-[10px] font-bold text-sky-700 hover:underline'
                    }, fdShowExpansion ? 'hide' : 'show')
                  ),
                  fdShowExpansion && h('div', {},
                    h('p', { className: 'text-base font-bold text-sky-900 font-mono' }, decimal + ' = ' + expansion),
                    h('p', { className: 'text-[11px] text-sky-700 mt-1 italic' },
                      'Every decimal place IS a fraction. 1st place: tenths, 2nd: hundredths, 3rd: thousandths.'
                    )
                  )
                )
              ),

              h('div', { className: 'bg-purple-50 rounded-xl p-3 border border-purple-200' },
                h('div', { className: 'flex items-center justify-between mb-2' },
                  h('p', { className: 'text-[11px] font-bold text-purple-800' }, '↔ Compare two values'),
                  h('label', { className: 'text-[11px] font-bold text-purple-700 flex items-center gap-1 cursor-pointer' },
                    h('input', { type: 'checkbox', checked: fdCompareOn, onChange: function() { upd({ fdCompareOn: !fdCompareOn }); } }),
                    'enabled'
                  )
                ),
                fdCompareOn && h('div', {},
                  h('div', { className: 'flex flex-wrap items-center gap-2 mb-1' },
                    h('span', { className: 'text-xs font-bold text-purple-700' }, 'Second value:'),
                    h('input', { type: 'number', value: fdCompareValue, step: 0.01, min: fdMin, max: fdMax,
                      onChange: function(e) { var v = parseFloat(e.target.value); if (!isNaN(v)) upd({ fdCompareValue: v }); },
                      'aria-label': 'Second value',
                      className: 'w-24 px-2 py-1 text-sm border border-purple-300 rounded font-mono'
                    }),
                    h('span', { className: 'text-xs font-mono text-purple-700' }, '≈ ' + Math.round(fdCompareValue * fdDen) + '/' + fdDen)
                  ),
                  h('p', { className: 'text-[11px] text-purple-800' },
                    (function() {
                      var a = fdValue, b = fdCompareValue;
                      var aR = Math.round(a * 1000) / 1000, bR = Math.round(b * 1000) / 1000;
                      if (Math.abs(a - b) < 0.001) return '= Equal: both are ' + aR + '.';
                      if (a > b) return aR + ' > ' + bR + ' (red marker is to the right).';
                      return aR + ' < ' + bR + ' (red marker is to the left).';
                    })()
                  )
                )
              ),

              h('div', { className: 'flex flex-wrap items-center gap-2 text-[11px]' },
                h('span', { className: 'font-bold text-slate-600' }, 'Line range:'),
                h('label', { className: 'flex items-center gap-1' }, 'min',
                  h('input', { type: 'number', value: fdMin, step: 1,
                    onChange: function(e) { var v = parseFloat(e.target.value); if (!isNaN(v) && v < fdMax) upd({ fdMin: v }); },
                    'aria-label': 'Line minimum',
                    className: 'w-16 px-2 py-0.5 border border-slate-300 rounded font-mono'
                  })
                ),
                h('label', { className: 'flex items-center gap-1' }, 'max',
                  h('input', { type: 'number', value: fdMax, step: 1,
                    onChange: function(e) { var v = parseFloat(e.target.value); if (!isNaN(v) && v > fdMin) upd({ fdMax: v }); },
                    'aria-label': 'Line maximum',
                    className: 'w-16 px-2 py-0.5 border border-slate-300 rounded font-mono'
                  })
                ),
                h('button', { onClick: function() { sfxClick(); upd({ fdMin: 0, fdMax: 1 }); },
                  className: 'px-2 py-0.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold' }, '0 to 1'),
                h('button', { onClick: function() { sfxClick(); upd({ fdMin: 0, fdMax: 2 }); },
                  className: 'px-2 py-0.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold' }, '0 to 2'),
                h('button', { onClick: function() { sfxClick(); upd({ fdMin: -1, fdMax: 1 }); },
                  className: 'px-2 py-0.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold' }, '-1 to 1'),
                h('button', {
                  onClick: function() {
                    sfxClick();
                    upd({
                      fdValue: 0.5, fdDen: 4, fdMin: 0, fdMax: 1,
                      fdShowBar: true, fdShowReps: true, fdSnap: true,
                      fdShowMoney: false, fdShowExpansion: false,
                      fdCompareOn: false, fdCompareValue: 0.75,
                      fdLastLandmark: null, fdCelebrate: false,
                      fdLastOpText: '', fdTrail: [],
                      fdCDN1: 1, fdCDD1: 2, fdCDN2: 1, fdCDD2: 3
                    });
                    announceToSR('Frac Dec reset to defaults');
                  },
                  'aria-label': 'Reset Frac Dec tab to defaults',
                  className: 'ml-auto px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-bold'
                }, '↺ Reset Frac↔Dec')
              ),

              h('details', { className: 'bg-white rounded-xl border border-cyan-200 p-3' },
                h('summary', { className: 'text-xs font-bold text-cyan-700 cursor-pointer' }, '💡 Why fractions and decimals are the same thing'),
                h('div', { className: 'mt-2 space-y-2 text-xs text-slate-700' },
                  h('p', {}, h('b', {}, 'A fraction IS a division problem. '), '3/4 means "3 divided by 4." Type 3 ÷ 4 into any calculator: 0.75. The slash and ÷ mean the same thing.'),
                  h('p', {}, h('b', {}, 'A decimal IS a fraction with a hidden denominator. '), '0.6 means "6 tenths," 6/10. 0.25 means "25 hundredths," 25/100, which simplifies to 1/4.'),
                  h('p', {}, h('b', {}, 'The number line proves it. '), 'The point at 1/4 is the same point as the point at 0.25. Same spot, two names.'),
                  h('p', {}, h('b', {}, 'Some terminate, some repeat. '), '1/2 = 0.5 (stops). 1/4 = 0.25 (stops). 1/3 = 0.333… (repeats forever). The denominator decides: if it factors into only 2s and 5s, it terminates. Otherwise it repeats. Watch the ↻ symbol on the decimal card.')
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

          // ═══ AI TUTOR PANEL ═══
          var renderAITutor = function() {
            if (!showAITutor) return null;
            return h('div', { className: 'bg-gradient-to-br from-sky-50 to-blue-50 rounded-xl border-2 border-sky-200 p-4 space-y-3' },
              h('div', { className: 'flex items-center justify-between' },
                h('h4', { className: 'text-sm font-bold text-sky-800' }, '\uD83E\uDD16 AI Number Line Tutor'),
                h('button', { 'aria-label': 'Toggle number line option',
                  onClick: function() { upd({ showAITutor: false }); },
                  className: 'text-sky-400 hover:text-sky-600 text-lg font-bold'
                }, '\u00D7')
              ),
              h('div', { className: 'flex gap-2' },
                h('input', {
                  type: 'text', value: aiQuestion,
                  onChange: function(e) { upd({ aiQuestion: e.target.value }); },
                  onKeyDown: function(e) { if (e.key === 'Enter' && aiQuestion.trim()) askAITutor(); },
                  placeholder: 'Ask about number lines...',
                  className: 'flex-1 px-3 py-2 border border-sky-600 rounded-lg text-sm'
                }),
                h('button', { onClick: askAITutor,
                  disabled: aiLoading || !aiQuestion.trim(),
                  className: 'px-4 py-2 bg-sky-600 text-white font-bold rounded-lg text-sm hover:bg-sky-700 disabled:opacity-50'
                }, aiLoading ? '\u23F3' : 'Ask')
              ),
              h('div', { className: 'flex flex-wrap gap-1.5' },
                ['What is a number line?', 'How do I round numbers?', 'What is skip counting?', 'How do negative numbers work?'].map(function(q) {
                  return h('button', { 'aria-label': 'Ask question',
                    key: q,
                    onClick: function() { upd({ aiQuestion: q }); },
                    className: 'px-2 py-1 text-[11px] font-bold bg-sky-100 text-sky-700 rounded-full hover:bg-sky-200 transition-all'
                  }, q);
                })
              ),
              aiResponse && h('div', { className: 'bg-white rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap border border-sky-100' }, aiResponse)
            );
          };

          // ══════════ MAIN RENDER ══════════
          var tabs = [
            { id: 'explore', icon: '\uD83D\uDCCF', label: 'Explore' },
            { id: 'challenges', icon: '\uD83C\uDFAF', label: 'Challenges' },
            { id: 'skipcount', icon: '\uD83D\uDD22', label: 'Skip Count' },
            { id: 'fracdec', icon: '\u00BD', label: 'Frac \u2194 Dec' }
          ];

          return h('div', { className: 'space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200' },
            // Header
            h('div', { className: 'flex items-center gap-3 mb-2' },
              h('button', { onClick: function() { setStemLabTool(null); }, className: 'p-1.5 hover:bg-slate-100 rounded-lg', 'aria-label': 'Back' },
                h(ArrowLeft, { size: 18, className: 'text-slate-600' })),
              h('h3', { className: 'text-lg font-bold text-blue-800' }, '\uD83D\uDCCF Number Line'),
              h('div', { className: 'ml-auto flex items-center gap-3' },
                streak > 0 && h('span', { className: 'text-xs font-bold text-orange-600' }, '\uD83D\uDD25 ' + streak),
                bestStreak > 0 && h('span', { className: 'text-[11px] text-slate-600' }, 'Best: ' + bestStreak),
                h('span', { className: 'text-xs font-bold text-blue-600' }, score.correct + '/' + score.total),
                h('button', {
                  onClick: function() {
                    var next = !muted;
                    upd({ muted: next });
                    if (!next) { /* unmuting: chirp once so user knows it's on */ setTimeout(function() { playTone(660, 0.08, 'sine', 0.08); }, 0); }
                    announceToSR(next ? 'Sound muted' : 'Sound on');
                  },
                  'aria-label': muted ? 'Unmute sound effects' : 'Mute sound effects',
                  'aria-pressed': muted,
                  title: muted ? 'Unmute (sounds are off)' : 'Mute (sounds are on)',
                  className: 'p-1 rounded-md text-base hover:bg-slate-100 transition-colors ' +
                    (muted ? 'text-slate-400' : 'text-blue-600')
                }, muted ? '\uD83D\uDD07' : '\uD83D\uDD0A')
              )
            ),

            // Tab bar
            h('div', { className: 'flex gap-1 bg-blue-50 rounded-xl p-1 border border-blue-200', role: 'tablist', 'aria-label': 'Number Line sections' },
              tabs.map(function(t2) {
                return h('button', { key: t2.id,
                  onClick: function() { sfxClick(); upd({ tab: t2.id }); },
                  role: 'tab', 'aria-selected': tab === t2.id,
                  className: 'flex-1 py-2 px-2 rounded-lg text-xs font-bold transition-all ' +
                    (tab === t2.id ? 'bg-white text-blue-800 shadow-sm' : 'text-blue-500 hover:text-blue-700')
                }, t2.icon + ' ' + t2.label);
              })
            ),

            // ── Topic-accent hero band per tab ──
            (function() {
              var TAB_META = {
                explore:    { accent: '#2563eb', soft: 'rgba(37,99,235,0.10)', icon: '\uD83D\uDCCF', title: 'Explore \u2014 the visual home for number sense',  hint: 'Numbers as positions on a line, not just symbols. Negatives mirror across zero. Fractions sit BETWEEN integers; decimals are the same idea finer-grained. Common Core 2.MD.6, 3.NF.2, 6.NS.6.' },
                challenges: { accent: '#d97706', soft: 'rgba(217,119,6,0.10)', icon: '\uD83C\uDFAF', title: 'Challenges \u2014 estimate, locate, compare',          hint: 'Where does 7/8 sit? What about \u22122.4? Estimation builds magnitude sense. Studies (Siegler 2009) show number-line precision predicts later math success better than rote facts.' },
                skipcount:  { accent: '#9333ea', soft: 'rgba(147,51,234,0.10)', icon: '\uD83D\uDD22', title: 'Skip Count \u2014 the bridge to multiplication',     hint: '2, 4, 6, 8\u2026 = the 2 times table walking. Skip counting by 5s and 10s pre-builds money and time. Counting backward by 3s pre-builds subtraction and division. The line shows the rhythm.' },
                fracdec:    { accent: '#0e7490', soft: 'rgba(14,116,144,0.10)', icon: '\u00BD', title: 'Fractions \u2194 Decimals, same point, two names', hint: 'A fraction is a division problem. A decimal is a fraction with a hidden denominator of 10, 100, 1000\u2026 1/4 and 0.25 are the SAME spot on the line. Common Core 4.NF.6, 4.NF.7, 5.NBT.3.' }
              };
              var meta = TAB_META[tab] || TAB_META.explore;
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
                  h('p', { style: { margin: '3px 0 0', color: '#475569', fontSize: 11, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
                )
              );
            })(),

            // Active tab
            tab === 'explore' && renderExplore(),
            tab === 'challenges' && renderChallenges(),
            tab === 'skipcount' && renderSkipCount(),
            tab === 'fracdec' && renderFracDec(),

            // Badges
            renderBadges(),

            // AI Tutor toggle + panel
            h('div', { className: 'flex gap-2' },
              !showAITutor && h('button', { 'aria-label': 'AI Tutor',
                onClick: function() { sfxClick(); upd({ showAITutor: true }); },
                className: 'px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-50 text-sky-700 border border-sky-600 hover:bg-sky-100 transition-all'
              }, '\uD83E\uDD16 AI Tutor')
            ),
            renderAITutor(),

            // Keyboard hints
            h('div', { className: 'text-center text-[11px] text-slate-600 mt-2' },
              '\u2328\uFE0F 1-4: tabs | N: new challenge | ?: AI tutor | \u2190 \u2192 on marker: nudge | Home/End: ends'
            )
          );
        }; // End of _NumberLineComponent
      }
      return React.createElement(this._NumberLineComponent, { ctx: ctx });
    }
  });
})();
