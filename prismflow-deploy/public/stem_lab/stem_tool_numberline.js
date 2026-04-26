// ═══════════════════════════════════════════
// stem_tool_numberline.js — Number Line Plugin (Enhanced v2)
// 3 tabs: Explore, Challenges, Skip Count
// + sound effects, 12 badges, AI tutor, 6 challenge types,
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
              else if (key === 'n' || key === 'N') { if (tab === 'challenges') genChallenge(); }
              else if (key === '?' || key === '/') { upd({ showAITutor: !showAITutor }); }
            };
            window.addEventListener('keydown', handler);
            return function() { window.removeEventListener('keydown', handler); };
          }, [tab, showAITutor]);

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

            // Skip count markers
            var skipEls = [];
            if (skipMarkersList && skipMarkersList.length > 0) {
              skipMarkersList.forEach(function(sm, i) {
                var sx = PAD + (sm - rMin) / rL * (W - 2 * PAD);
                if (sx >= PAD && sx <= W - PAD) {
                  skipEls.push(h('g', { key: 'skip-' + i },
                    h('circle', { cx: sx, cy: 60, r: 7, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 1.5, opacity: 0.8 }),
                    h('text', { x: sx, y: 22, textAnchor: 'middle', fill: '#7c3aed', fontSize: '10', fontWeight: 'bold' }, sm)
                  ));
                  if (i > 0) {
                    var prevSx = PAD + (skipMarkersList[i - 1] - rMin) / rL * (W - 2 * PAD);
                    skipEls.push(h('line', {
                      key: 'skip-line-' + i,
                      x1: prevSx, y1: 55, x2: sx, y2: 55,
                      stroke: '#a78bfa', strokeWidth: 1.5, strokeDasharray: '4 2', opacity: 0.6
                    }));
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
            return h('div', { className: 'space-y-4' },
              // Range controls
              h('div', { className: 'grid grid-cols-2 gap-3' },
                h('div', { className: 'bg-blue-50 rounded-lg p-3 border border-blue-100' },
                  h('label', { className: 'block text-xs text-blue-700 mb-1 font-bold' }, 'Min Value'),
                  h('input', {
                    type: 'number', value: range.min,
                    onChange: function(e) { upd({ range: { min: parseInt(e.target.value) || 0, max: range.max } }); },
                    className: 'w-full px-3 py-1.5 text-sm border border-blue-200 rounded-lg'
                  })
                ),
                h('div', { className: 'bg-blue-50 rounded-lg p-3 border border-blue-100' },
                  h('label', { className: 'block text-xs text-blue-700 mb-1 font-bold' }, 'Max Value'),
                  h('input', {
                    type: 'number', value: range.max,
                    onChange: function(e) { upd({ range: { min: range.min, max: parseInt(e.target.value) || 20 } }); },
                    className: 'w-full px-3 py-1.5 text-sm border border-blue-200 rounded-lg'
                  })
                )
              ),
              // Quick range presets
              h('div', { className: 'flex flex-wrap gap-1.5' },
                h('span', { className: 'text-[11px] font-bold text-slate-600 self-center' }, 'Presets:'),
                [[0, 10], [0, 20], [0, 100], [-10, 10], [-20, 20], [0, 1000]].map(function(pr) {
                  return h('button', { 'aria-label': 'Sfx Click',
                    key: pr.join('-'),
                    onClick: function() { sfxClick(); upd({ range: { min: pr[0], max: pr[1] } }); },
                    className: 'px-2 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-all'
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
                  className: 'w-24 px-3 py-1.5 text-sm border border-blue-200 rounded-lg'
                }),
                h('input', {
                  type: 'text', id: 'nlMarkerLabel', placeholder: 'Label (optional)',
                  'aria-label': 'Marker label',
                  className: 'flex-1 px-3 py-1.5 text-sm border border-blue-200 rounded-lg'
                }),
                h('input', { type: 'color', id: 'nlMarkerColor', defaultValue: '#ef4444', 'aria-label': 'Marker color', className: 'w-8 h-8 rounded cursor-pointer' }),
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
            return h('div', { className: 'space-y-4' },
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
                        return h('button', { 'aria-label': 'Sfx Click',
                          key: d, onClick: function() { sfxClick(); upd({ difficulty: d }); },
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
                          className: 'flex-1 px-3 py-2 border border-blue-300 rounded-lg text-sm font-mono'
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

            return h('div', { className: 'space-y-4' },
              // Controls
              h('div', { className: 'grid grid-cols-3 gap-3' },
                h('div', { className: 'bg-violet-50 rounded-lg p-3 border border-violet-100' },
                  h('label', { className: 'block text-xs text-violet-700 mb-1 font-bold' }, 'Skip By'),
                  h('input', {
                    type: 'number', min: 1, max: 100, value: skipBy,
                    onChange: function(e) { upd({ skipBy: Math.max(1, parseInt(e.target.value) || 1) }); },
                    className: 'w-full px-3 py-1.5 text-sm border border-violet-200 rounded-lg text-center font-bold'
                  })
                ),
                h('div', { className: 'bg-violet-50 rounded-lg p-3 border border-violet-100' },
                  h('label', { className: 'block text-xs text-violet-700 mb-1 font-bold' }, 'Start From'),
                  h('input', {
                    type: 'number', value: skipFrom,
                    onChange: function(e) { upd({ skipFrom: parseInt(e.target.value) || 0 }); },
                    className: 'w-full px-3 py-1.5 text-sm border border-violet-200 rounded-lg text-center font-bold'
                  })
                ),
                h('div', { className: 'bg-violet-50 rounded-lg p-3 border border-violet-100' },
                  h('label', { className: 'block text-xs text-violet-700 mb-1 font-bold' }, 'How Many'),
                  h('input', {
                    type: 'number', min: 2, max: 20, value: skipCount,
                    onChange: function(e) { upd({ skipCount: Math.max(2, Math.min(20, parseInt(e.target.value) || 8)) }); },
                    className: 'w-full px-3 py-1.5 text-sm border border-violet-200 rounded-lg text-center font-bold'
                  })
                )
              ),
              // Quick skip presets
              h('div', { className: 'flex flex-wrap gap-1.5' },
                h('span', { className: 'text-[11px] font-bold text-slate-600 self-center' }, 'Count by:'),
                [2, 3, 5, 10, 25, 100].map(function(s) {
                  return h('button', { 'aria-label': 'Sfx Click',
                    key: s,
                    onClick: function() { sfxClick(); upd({ skipBy: s, skipFrom: 0, skipCount: 8 }); },
                    className: 'px-3 py-1 rounded-lg text-xs font-bold ' +
                      (skipBy === s ? 'bg-violet-600 text-white' : 'bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100') + ' transition-all'
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
              h('button', { 'aria-label': 'Sfx Click',
                onClick: function() { sfxClick(); upd({ showSkipMarkers: !showSkipMarkers }); },
                className: 'text-xs font-bold ' + (showSkipMarkers ? 'text-violet-600' : 'text-slate-600') + ' hover:text-violet-800 transition-colors'
              }, showSkipMarkers ? '\uD83D\uDC41 Hide markers on line' : '\uD83D\uDC41 Show markers on line')
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
                  className: 'flex-1 px-3 py-2 border border-sky-300 rounded-lg text-sm'
                }),
                h('button', { 'aria-label': 'Ask A I Tutor',
                  onClick: askAITutor,
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
            { id: 'skipcount', icon: '\uD83D\uDD22', label: 'Skip Count' }
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
                h('span', { className: 'text-xs font-bold text-blue-600' }, score.correct + '/' + score.total)
              )
            ),

            // Tab bar
            h('div', { className: 'flex gap-1 bg-blue-50 rounded-xl p-1 border border-blue-200', role: 'tablist', 'aria-label': 'Number Line sections' },
              tabs.map(function(t2) {
                return h('button', { 'aria-label': 'Sfx Click',
                  key: t2.id,
                  onClick: function() { sfxClick(); upd({ tab: t2.id }); },
                  role: 'tab', 'aria-selected': tab === t2.id,
                  className: 'flex-1 py-2 px-2 rounded-lg text-xs font-bold transition-all ' +
                    (tab === t2.id ? 'bg-white text-blue-800 shadow-sm' : 'text-blue-500 hover:text-blue-700')
                }, t2.icon + ' ' + t2.label);
              })
            ),

            // Active tab
            tab === 'explore' && renderExplore(),
            tab === 'challenges' && renderChallenges(),
            tab === 'skipcount' && renderSkipCount(),

            // Badges
            renderBadges(),

            // AI Tutor toggle + panel
            h('div', { className: 'flex gap-2' },
              !showAITutor && h('button', { 'aria-label': 'AI Tutor',
                onClick: function() { sfxClick(); upd({ showAITutor: true }); },
                className: 'px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition-all'
              }, '\uD83E\uDD16 AI Tutor')
            ),
            renderAITutor(),

            // Keyboard hints
            h('div', { className: 'text-center text-[11px] text-slate-600 mt-2' },
              '\u2328\uFE0F 1-3: tabs | N: new challenge | ?: AI tutor'
            )
          );
        }; // End of _NumberLineComponent
      }
      return React.createElement(this._NumberLineComponent, { ctx: ctx });
    }
  });
})();
