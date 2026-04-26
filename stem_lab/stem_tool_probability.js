// ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEM Lab tools ──
(function() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('allo-stem-motion-reduce-css')) return;
  var st = document.createElement('style');
  st.id = 'allo-stem-motion-reduce-css';
  st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
  if (document.head) document.head.appendChild(st);
})();

// ═══════════════════════════════════════════
// stem_tool_probability.js — Probability Lab
// Extracted from stem_tool_math.js
// Enhancements:
//   • Fixed icon/label/desc/color metadata
//   • Fixed isDark/isContrast theme detection (was always undefined)
//   • AI Explain Results (callGemini + gradeLevel)
//   • TTS narrate button
//   • Two-Event Compound Probability Tree mode
// ═══════════════════════════════════════════

// ═══ Defensive StemLab guard ═══
window.StemLab = window.StemLab || {
  _registry: {},
  _order: [],
  registerTool: function(id, config) {
    config.id = id;
    config.ready = config.ready !== false;
    this._registry[id] = config;
    if (this._order.indexOf(id) === -1) this._order.push(id);
    console.log('[StemLab] Registered tool: ' + id);
  },
  getRegisteredTools: function() {
    var self = this;
    return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean);
  },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) {
    var tool = this._registry[id];
    if (!tool || !tool.render) return null;
    try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; }
  }
};
// ═══ End Guard ═══

(function() {
  'use strict';

  // ── Audio + WCAG (auto-injected) ──
  var _probAC = null;
  function getProbAC() { if (!_probAC) { try { _probAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_probAC && _probAC.state==="suspended") { try { _probAC.resume(); } catch(e) {} } return _probAC; }
  function probTone(f,d,tp,v) { var ac=getProbAC(); if(!ac) return; try { var o=ac.createOscillator(); var g=ac.createGain(); o.type=tp||"sine"; o.frequency.value=f; g.gain.setValueAtTime(v||0.07,ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxProbClick() { probTone(600,0.03,"sine",0.04); }
  function sfxProbSuccess() { probTone(523,0.08,"sine",0.07); setTimeout(function(){probTone(659,0.08,"sine",0.07);},70); setTimeout(function(){probTone(784,0.1,"sine",0.08);},140); }
  if(!document.getElementById("prob-a11y")){var _s=document.createElement("style");_s.id="prob-a11y";_s.textContent="@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:0.01ms!important;animation-iteration-count:1!important;transition-duration:0.01ms!important}}.text-slate-600{color:#64748b!important}";document.head.appendChild(_s);}

  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-probability')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-probability';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();


  // Module-level: persists across React renders without causing re-render
  var _autoRun = { interval: null };

  window.StemLab.registerTool('probability', {
    icon: '\uD83C\uDFB2',
    label: 'Probability Lab',
    desc: 'Coin flips, dice, spinners, real sports stats & custom experiments.',
    color: 'violet',
    category: 'math',
    questHooks: [
      { id: 'run_100_trials', label: 'Run 100+ probability trials', icon: '\uD83C\uDFB2', check: function(d) { return (d.totalTrials || 0) >= 100; }, progress: function(d) { return (d.totalTrials || 0) + '/100 trials'; } },
      { id: 'try_3_experiments', label: 'Try 3 different experiment types', icon: '\uD83E\uDDEA', check: function(d) { return Object.keys(d.experimentsUsed || {}).length >= 3; }, progress: function(d) { return Object.keys(d.experimentsUsed || {}).length + '/3 types'; } },
      { id: 'monte_carlo', label: 'Run a Monte Carlo simulation', icon: '\uD83D\uDCCA', check: function(d) { return (d._piPoints || []).length > 0; }, progress: function(d) { return (d._piPoints || []).length > 0 ? 'Done!' : 'Not yet'; } }
    ],
    render: function(ctx) {
      // Aliases â€” maps ctx properties to original variable names
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var setStemLabTab = ctx.setStemLabTab;
      var stemLabTab = ctx.stemLabTab || 'explore';
      var stemLabTool = ctx.stemLabTool;
      var toolSnapshots = ctx.toolSnapshots;
      var setToolSnapshots = ctx.setToolSnapshots;
      var addToast = ctx.addToast;
      var t = ctx.t;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var Calculator = ctx.icons.Calculator;
      var Sparkles = ctx.icons.Sparkles;
      var X = ctx.icons.X;
      var GripVertical = ctx.icons.GripVertical;
      var announceToSR = ctx.announceToSR;
      var awardStemXP = ctx.awardXP;
      var getStemXP = ctx.getXP;
      var stemCelebrate = ctx.celebrate;
      var stemBeep = ctx.beep;
      var callGemini = ctx.callGemini;
      var callTTS = ctx.callTTS;
      var callImagen = ctx.callImagen;
      var callGeminiVision = ctx.callGeminiVision;
      var gradeLevel = ctx.gradeLevel;
      var srOnly = ctx.srOnly;
      var a11yClick = ctx.a11yClick;
      var canvasA11yDesc = ctx.canvasA11yDesc;
      var props = ctx.props;
      var canvasNarrate = ctx.canvasNarrate;

      // ── Theme detection (fixes pre-existing undefined isDark/isContrast bug) ──
      var isDark = false, isContrast = false;
      try {
        isDark = !!document.querySelector('.theme-dark');
        isContrast = !!document.querySelector('.theme-contrast');
      } catch(e) {}

      // ── Tool body (probability) ──
      return (function() {
var d = (labToolData.probability) || {};

          // ── Canvas narration: init ──
          if (typeof canvasNarrate === 'function') {
            canvasNarrate('probability', 'init', {
              first: 'Probability Lab loaded. Simulate dice rolls, coin flips, and card draws. Visualize probability distributions with interactive experiments.',
              repeat: 'Probability Lab active.',
              terse: 'Probability.'
            }, { debounce: 800 });
          }

          var upd = function(key, val) { setLabToolData(function(prev) { return Object.assign({}, prev, { probability: Object.assign({}, prev.probability, (function() { var o = {}; o[key] = val; return o; })()) }); }); };



          // â”€â”€ Sports Scenarios â”€â”€

          var SPORTS = [

            { id: 'freethrow', label: '\uD83C\uDFC0 Free Throws', icon: '\uD83C\uDFC0', desc: 'NBA average free throw percentage is ~77%', outcomes: ['Make', 'Miss'], probs: [0.77, 0.23], colors: ['#22c55e', '#ef4444'], emoji: ['\uD83C\uDFC0', '\u274C'] },

            { id: 'threepoint', label: '\uD83C\uDFC0 3-Pointers', icon: '\uD83C\uDFC0', desc: 'NBA average 3-point percentage is ~36%', outcomes: ['Swish', 'Miss'], probs: [0.36, 0.64], colors: ['#3b82f6', '#ef4444'], emoji: ['\uD83D\uDCAB', '\u274C'] },

            { id: 'penalty', label: '\u26BD Penalty Kicks', icon: '\u26BD', desc: 'Soccer penalty kick conversion rate is ~76%', outcomes: ['Goal', 'Save'], probs: [0.76, 0.24], colors: ['#22c55e', '#f59e0b'], emoji: ['\u26BD', '\uD83E\uDDE4'] },

            { id: 'batting', label: '\u26BE Batting Average', icon: '\u26BE', desc: 'MLB average batting average is ~.250 (hit 1 in 4)', outcomes: ['Hit', 'Out'], probs: [0.250, 0.750], colors: ['#8b5cf6', '#94a3b8'], emoji: ['\uD83D\uDCA5', '\u2796'] },

            { id: 'fieldgoal', label: '\uD83C\uDFC8 Field Goals', icon: '\uD83C\uDFC8', desc: 'NFL field goal success rate is ~84%', outcomes: ['Good', 'No Good'], probs: [0.84, 0.16], colors: ['#22c55e', '#ef4444'], emoji: ['\uD83C\uDFC8', '\u274C'] },

            { id: 'tennis', label: '\uD83C\uDFBE First Serves', icon: '\uD83C\uDFBE', desc: 'Pro tennis first serve success rate is ~62%', outcomes: ['In', 'Fault'], probs: [0.62, 0.38], colors: ['#06b6d4', '#f97316'], emoji: ['\uD83C\uDFBE', '\u2716'] },

            { id: 'hockey', label: '\uD83C\uDFD2 Shots on Goal', icon: '\uD83C\uDFD2', desc: 'NHL average shooting percentage is ~10%', outcomes: ['Goal', 'Save'], probs: [0.10, 0.90], colors: ['#ef4444', '#94a3b8'], emoji: ['\uD83D\uDEA8', '\uD83E\uDDE4'] }

          ];

          var activeSport = SPORTS.find(function (s) { return s.id === (d.sportType || 'freethrow'); }) || SPORTS[0];



          // â”€â”€ Custom mode outcomes â”€â”€

          var customOutcomes = d.customOutcomes || [{ label: 'Red', prob: 0.5, color: '#ef4444', numerator: 1, denominator: 2, count: 5 }, { label: 'Blue', prob: 0.5, color: '#3b82f6', numerator: 1, denominator: 2, count: 5 }];

          var customSubMode = d.customSubMode || 'fraction';

          if (d.mode === 'custom') {

            if (customSubMode === 'fraction') { customOutcomes = customOutcomes.map(function (o) { var den = o.denominator || 20; return Object.assign({}, o, { prob: den > 0 ? (o.numerator != null ? o.numerator : 1) / den : 0 }); }); }

            else if (customSubMode === 'marbleBag') { var _totalM = customOutcomes.reduce(function (s, o) { return s + (o.count || 1); }, 0); if (_totalM > 0) { customOutcomes = customOutcomes.map(function (o) { return Object.assign({}, o, { prob: (o.count || 1) / _totalM }); }); } }

          }

          // â”€â”€ Marble bag mode: compute probs from counts â”€â”€

          if (d.mode === 'marbleBag') {

            var _mbTotal = customOutcomes.reduce(function (s, o) { return s + (o.count || 1); }, 0);

            if (_mbTotal > 0) { customOutcomes = customOutcomes.map(function (o) { return Object.assign({}, o, { prob: (o.count || 1) / _mbTotal }); }); }

          }



          // â”€â”€ Run trials â”€â”€

          var runTrial = function(n) {

            const results = [...d.results];

            var newPiPoints = [];

            for (let i = 0; i < n; i++) {

              if (d.mode === 'coin') results.push(Math.random() < 0.5 ? 'H' : 'T');

              else if (d.mode === 'dice') results.push(Math.floor(Math.random() * 6) + 1);

              else if (d.mode === 'spinner') results.push(['Red', 'Blue', 'Green', 'Yellow'][Math.floor(Math.random() * 4)]);

              else if (d.mode === 'sports') {

                var r = Math.random(), cumulative = 0;

                for (var si = 0; si < activeSport.outcomes.length; si++) {

                  cumulative += activeSport.probs[si];

                  if (r < cumulative) { results.push(activeSport.outcomes[si]); break; }

                }

                if (results.length === d.results.length + i) results.push(activeSport.outcomes[activeSport.outcomes.length - 1]);

              }

              else if (d.mode === 'custom') {

                var cr = Math.random(), ccum = 0;

                for (var ci = 0; ci < customOutcomes.length; ci++) {

                  ccum += customOutcomes[ci].prob;

                  if (cr < ccum) { results.push(customOutcomes[ci].label); break; }

                }

                if (results.length === d.results.length + i) results.push(customOutcomes[customOutcomes.length - 1].label);

              }

              else if (d.mode === 'marbleBag') {

                var mbWithoutRepl = d.mbWithoutReplacement || false;

                if (mbWithoutRepl) {

                  // Without replacement: use remaining pool

                  var mbRemaining = d._mbRemaining || null;

                  if (!mbRemaining || mbRemaining.length === 0) {

                    // Rebuild pool from marble counts

                    mbRemaining = [];

                    customOutcomes.forEach(function (o) { for (var _mi = 0; _mi < (o.count || 1); _mi++) mbRemaining.push(o.label); });

                  }

                  if (mbRemaining.length > 0) {

                    var mbIdx = Math.floor(Math.random() * mbRemaining.length);

                    results.push(mbRemaining[mbIdx]);

                    mbRemaining = mbRemaining.slice(0, mbIdx).concat(mbRemaining.slice(mbIdx + 1));

                    upd('_mbRemaining', mbRemaining);

                  } else {

                    results.push(customOutcomes[0].label);

                  }

                } else {

                  // With replacement â€” same as custom

                  var mbr = Math.random(), mbcum = 0;

                  for (var mbi = 0; mbi < customOutcomes.length; mbi++) {

                    mbcum += customOutcomes[mbi].prob;

                    if (mbr < mbcum) { results.push(customOutcomes[mbi].label); break; }

                  }

                  if (results.length === d.results.length + i) results.push(customOutcomes[customOutcomes.length - 1].label);

                }

              } else if (d.mode === 'pi') {

                var _piX = Math.random(), _piY = Math.random();

                var _piInside = (_piX * _piX + _piY * _piY) <= 1;

                results.push(_piInside ? 'inside' : 'outside');

                newPiPoints.push({ x: _piX, y: _piY, inside: _piInside });

              }

            }

            // Pi: flush accumulated scatter points after all n trials
            if (d.mode === 'pi' && newPiPoints.length > 0) {

              var _allPiPts = (d._piPoints || []).concat(newPiPoints);

              if (_allPiPts.length > 1000) _allPiPts = _allPiPts.slice(-1000);

              upd('_piPoints', _allPiPts);

            }

            upd('results', results);

            upd('trials', results.length);

            var hist = d.convergenceHistory || [];

            var total = results.length;

            if (total > 0) {

              var firstKey = d.mode === 'coin' ? 'H' : d.mode === 'dice' ? 1 : d.mode === 'spinner' ? 'Red' : d.mode === 'sports' ? activeSport.outcomes[0] : d.mode === 'pi' ? 'inside' : customOutcomes[0] ? customOutcomes[0].label : 'Red';

              var cnt = results.filter(function (r) { return r === firstKey; }).length;

              hist = hist.concat([{ t: total, pct: cnt / total * 100 }]);

              if (hist.length > 50) hist = hist.slice(-50);

              upd('convergenceHistory', hist);

            }

            upd('lastResult', results[results.length - 1]);

            upd('animTick', (d.animTick || 0) + 1);

            if (d.mode === 'marbleBag') { upd('_mbShaking', true); setTimeout(function () { upd('_mbShaking', false); }, 600); }

            // ── Streak detection ──
            if (results.length >= 2 && n === 1) {

              var _lastR = results[results.length - 1];

              var _streak = 1;

              for (var _si = results.length - 2; _si >= 0; _si--) { if (results[_si] === _lastR) _streak++; else break; }

              var _prevBest = d._bestStreak || 0;

              if (_streak > _prevBest) upd('_bestStreak', _streak);

              if ([5, 10, 15, 20].indexOf(_streak) >= 0 && _streak > _prevBest) {

                if (stemCelebrate) stemCelebrate();

                if (stemBeep) stemBeep(_streak >= 10 ? 880 : 660, 150);

                if (addToast) addToast('🔥 ' + _streak + ' in a row!', 'success');

              }

              // Per-trial sound (musical note per outcome)
              if (stemBeep) {

                var _noteMap = { 'H': 523, 'T': 392, 1: 261, 2: 294, 3: 330, 4: 349, 5: 392, 6: 440, 'Red': 523, 'Blue': 587, 'Green': 659, 'Yellow': 698, 'inside': 784, 'outside': 330 };

                stemBeep(_noteMap[_lastR] || 440, 80);

              }

            }

            // ── Milestone XP ──
            var _mTotal = results.length;

            if ([10, 50, 100, 500, 1000].indexOf(_mTotal) >= 0) {

              if (stemCelebrate) stemCelebrate();

              if (awardStemXP) awardStemXP('probability', 5);

              if (addToast) addToast('🎉 ' + _mTotal + ' trials! +5 XP', 'success');

            }

          };

          // ── Functional trial runner for Auto-Run ──
          // Uses setLabToolData(prev=>) to always read fresh state (no stale closure)
          var runTrialAuto = function() {

            setLabToolData(function(prev) {

              var _pd = prev.probability || {};

              if (!_pd._autoRunning) return prev;

              var _res = (_pd.results || []).slice();

              var _asp2 = SPORTS.find(function(s) { return s.id === (_pd.sportType || 'freethrow'); }) || SPORTS[0];

              var _cos3 = _pd.customOutcomes || [{ label: 'Red', prob: 0.5, color: '#ef4444' }, { label: 'Blue', prob: 0.5, color: '#3b82f6' }];

              var _newPiPts3 = null;

              if (_pd.mode === 'coin') {

                _res.push(Math.random() < 0.5 ? 'H' : 'T');

              } else if (_pd.mode === 'dice') {

                _res.push(Math.floor(Math.random() * 6) + 1);

              } else if (_pd.mode === 'spinner') {

                _res.push(['Red', 'Blue', 'Green', 'Yellow'][Math.floor(Math.random() * 4)]);

              } else if (_pd.mode === 'sports') {

                var _rr3 = Math.random(), _cum3 = 0;

                for (var _ai3 = 0; _ai3 < _asp2.outcomes.length; _ai3++) { _cum3 += _asp2.probs[_ai3]; if (_rr3 < _cum3) { _res.push(_asp2.outcomes[_ai3]); break; } }

                if (_res.length === (_pd.results || []).length) _res.push(_asp2.outcomes[_asp2.outcomes.length - 1]);

              } else if (_pd.mode === 'pi') {

                var _pX3 = Math.random(), _pY3 = Math.random();

                var _pIn3 = (_pX3 * _pX3 + _pY3 * _pY3) <= 1;

                _res.push(_pIn3 ? 'inside' : 'outside');

                _newPiPts3 = (_pd._piPoints || []).concat([{ x: _pX3, y: _pY3, inside: _pIn3 }]);

                if (_newPiPts3.length > 1000) _newPiPts3 = _newPiPts3.slice(-1000);

              } else {

                var _cr3 = Math.random(), _cc3 = 0;

                for (var _ci4 = 0; _ci4 < _cos3.length; _ci4++) { _cc3 += _cos3[_ci4].prob; if (_cr3 < _cc3) { _res.push(_cos3[_ci4].label); break; } }

                if (_res.length === (_pd.results || []).length) _res.push(_cos3[_cos3.length - 1].label);

              }

              var _nlast3 = _res[_res.length - 1];

              var _ntick3 = (_pd.animTick || 0) + 1;

              var _cHist3 = (_pd.convergenceHistory || []).slice();

              if (_res.length > 0) {

                var _fk3 = _pd.mode === 'coin' ? 'H' : _pd.mode === 'dice' ? 1 : _pd.mode === 'spinner' ? 'Red' : _pd.mode === 'sports' ? _asp2.outcomes[0] : _pd.mode === 'pi' ? 'inside' : (_cos3[0] ? _cos3[0].label : 'Red');

                var _cnt4 = _res.filter(function(r) { return r === _fk3; }).length;

                _cHist3 = _cHist3.concat([{ t: _res.length, pct: _cnt4 / _res.length * 100 }]);

                if (_cHist3.length > 50) _cHist3 = _cHist3.slice(-50);

              }

              var _newPd3 = Object.assign({}, _pd, { results: _res, trials: _res.length, lastResult: _nlast3, animTick: _ntick3, convergenceHistory: _cHist3 });

              if (_newPiPts3) _newPd3._piPoints = _newPiPts3;

              return Object.assign({}, prev, { probability: _newPd3 });

            });

          };



          // â”€â”€ Compute expected & counts â”€â”€

          const counts = {};

          d.results.forEach(r => { counts[r] = (counts[r] || 0) + 1; });

          var expected;

          if (d.mode === 'coin') expected = { H: 0.5, T: 0.5 };

          else if (d.mode === 'dice') expected = { 1: 1 / 6, 2: 1 / 6, 3: 1 / 6, 4: 1 / 6, 5: 1 / 6, 6: 1 / 6 };

          else if (d.mode === 'spinner') expected = { Red: 0.25, Blue: 0.25, Green: 0.25, Yellow: 0.25 };

          else if (d.mode === 'sports') {

            expected = {};

            activeSport.outcomes.forEach(function (o, i) { expected[o] = activeSport.probs[i]; });

          } else if (d.mode === 'marbleBag') {

            expected = {};

            customOutcomes.forEach(function (o) { expected[o.label] = o.prob; });

          } else if (d.mode === 'pi') {

            expected = { inside: Math.PI / 4, outside: 1 - Math.PI / 4 };

          } else if (d.mode === 'birthday') {

            expected = {};

          } else {

            expected = {};

            customOutcomes.forEach(function (o) { expected[o.label] = o.prob; });

          }

          const maxCount = Math.max(...Object.values(counts), 1);

          var barColors = { H: '#3b82f6', T: '#ef4444', 1: '#ef4444', 2: '#f97316', 3: '#eab308', 4: '#22c55e', 5: '#3b82f6', 6: '#8b5cf6', Red: '#ef4444', Blue: '#3b82f6', Green: '#22c55e', Yellow: '#eab308', inside: '#22c55e', outside: '#ef4444' };

          if (d.mode === 'sports') { activeSport.outcomes.forEach(function (o, i) { barColors[o] = activeSport.colors[i]; }); }

          if (d.mode === 'custom') { customOutcomes.forEach(function (o) { barColors[o.label] = o.color; }); }

          if (d.mode === 'marbleBag') { customOutcomes.forEach(function (o) { barColors[o.label] = o.color; }); }



          // Chi-squared

          var chiSq = 0;

          if (d.trials > 0) {

            Object.keys(expected).forEach(function (k) {

              var obs = counts[k] || 0;

              var exp = expected[k] * d.trials;

              if (exp > 0) chiSq += Math.pow(obs - exp, 2) / exp;

            });

          }

          var df = Object.keys(expected).length - 1;

          var chiCritical = df === 1 ? 3.84 : df === 3 ? 7.81 : df === 5 ? 11.07 : df === 2 ? 5.99 : df === 6 ? 12.59 : 11.07;

          var chiPass = chiSq < chiCritical;



          var convHist = d.convergenceHistory || [];

          var convExpected = d.mode === 'coin' ? 50 : d.mode === 'dice' ? 16.67 : d.mode === 'spinner' ? 25 : d.mode === 'sports' ? activeSport.probs[0] * 100 : d.mode === 'pi' ? Math.PI / 4 * 100 : customOutcomes[0] ? customOutcomes[0].prob * 100 : 50;



          // Dice face SVG

          var diceFace = function (val, size) {

            var s = size || 60;

            var dotPositions = {

              1: [[s / 2, s / 2]],

              2: [[s * 0.3, s * 0.3], [s * 0.7, s * 0.7]],

              3: [[s * 0.3, s * 0.3], [s / 2, s / 2], [s * 0.7, s * 0.7]],

              4: [[s * 0.3, s * 0.3], [s * 0.7, s * 0.3], [s * 0.3, s * 0.7], [s * 0.7, s * 0.7]],

              5: [[s * 0.3, s * 0.3], [s * 0.7, s * 0.3], [s / 2, s / 2], [s * 0.3, s * 0.7], [s * 0.7, s * 0.7]],

              6: [[s * 0.3, s * 0.25], [s * 0.7, s * 0.25], [s * 0.3, s / 2], [s * 0.7, s / 2], [s * 0.3, s * 0.75], [s * 0.7, s * 0.75]]

            };

            var dots = dotPositions[val] || [];

            return React.createElement("svg", { viewBox: "0 0 " + s + " " + s, width: s, height: s },

              React.createElement("rect", { x: 2, y: 2, width: s - 4, height: s - 4, rx: 8, fill: "white", stroke: "#94a3b8", strokeWidth: 2 }),

              dots.map(function (pos, i) {

                return React.createElement("circle", { key: i, cx: pos[0], cy: pos[1], r: s * 0.08, fill: "#1e293b" });

              })

            );

          };



          // Spinner SVG

          var spinnerSvg = function (result, tick) {

            var colors = { Red: '#ef4444', Blue: '#3b82f6', Green: '#22c55e', Yellow: '#eab308' };

            var keys = ['Red', 'Blue', 'Green', 'Yellow'];

            var size = 100; var r = 42;

            var arrowAngle = result ? (keys.indexOf(result) * 90 + 45) : 0;

            return React.createElement("svg", { viewBox: "0 0 " + size + " " + size, width: size, height: size },

              keys.map(function (k, i) {

                var startA = (i * 90 - 90) * Math.PI / 180;

                var endA = ((i + 1) * 90 - 90) * Math.PI / 180;

                var x1 = 50 + r * Math.cos(startA), y1 = 50 + r * Math.sin(startA);

                var x2 = 50 + r * Math.cos(endA), y2 = 50 + r * Math.sin(endA);

                return React.createElement("path", { key: k, d: "M 50 50 L " + x1 + " " + y1 + " A " + r + " " + r + " 0 0 1 " + x2 + " " + y2 + " Z", fill: colors[k], stroke: 'white', strokeWidth: 1.5, opacity: result === k ? 1 : 0.6 });

              }),

              React.createElement("g", { transform: "rotate(" + arrowAngle + ", 50, 50)" },

                React.createElement("polygon", { points: "50,12 47,50 53,50", fill: "#1e293b", stroke: "white", strokeWidth: 1 })

              ),

              React.createElement("circle", { cx: 50, cy: 50, r: 6, fill: "#1e293b", stroke: "white", strokeWidth: 1.5 })

            );

          };



          // Coin SVG

          var coinSvg = function (result) {

            var isH = result === 'H';

            return React.createElement("svg", { viewBox: "0 0 80 80", width: 80, height: 80 },

              React.createElement("circle", { cx: 40, cy: 40, r: 36, fill: isH ? '#fbbf24' : '#94a3b8', stroke: isH ? '#92400e' : '#94a3b8', strokeWidth: 3 }),

              React.createElement("text", { x: 40, y: 46, textAnchor: "middle", style: { fontSize: '22px', fontWeight: 'bold' }, fill: isH ? '#92400e' : '#f8fafc' }, isH ? 'H' : 'T'),

              isH && React.createElement("text", { x: 40, y: 26, textAnchor: "middle", style: { fontSize: '10px' }, fill: '#92400e' }, '\uD83E\uDE99')

            );

          };



          // Sports result visual

          var sportVisual = function (result) {

            var idx = activeSport.outcomes.indexOf(result);

            var emoji = idx >= 0 ? activeSport.emoji[idx] : '\u2753';

            var color = idx >= 0 ? activeSport.colors[idx] : '#94a3b8';

            return React.createElement("div", { className: "flex flex-col items-center gap-1" },

              React.createElement("span", { style: { fontSize: '48px', filter: idx === 0 ? 'none' : 'grayscale(50%)' } }, emoji),

              React.createElement("span", { className: "text-xs font-bold", style: { color: color } }, result || '?')

            );

          };



          // â”€â”€ Dark mode / high-contrast theme variables â”€â”€

          var _bg = isDark || isContrast ? '#1e1b4b' : '#fff';

          var _text = isDark || isContrast ? '#e0e7ff' : '#1e293b';

          var _card = isDark || isContrast ? 'rgba(139,92,246,0.08)' : 'rgba(139,92,246,0.04)';

          var _border = isDark || isContrast ? 'rgba(139,92,246,0.25)' : 'rgba(139,92,246,0.15)';

          var _accent = isDark || isContrast ? '#c4b5fd' : '#7c3aed';

          var _muted = isDark || isContrast ? '#94a3b8' : '#94a3b8';

          var _btnBg = isDark || isContrast ? '#7c3aed' : '#8b5cf6';

          var _btnText = '#fff';

          var _cardBg = isDark || isContrast ? 'rgba(139,92,246,0.06)' : 'rgba(255,255,255,1)';

          var _statBg = isDark || isContrast ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.04)';



          return React.createElement("div", { className: "max-w-3xl mx-auto animate-in fade-in duration-200", style: { color: _text } },

            React.createElement("style", null, '@keyframes coinFlip{0%{transform:scaleX(1)}25%{transform:scaleX(0.05) translateY(-10px)}60%{transform:scaleX(1.08) translateY(-4px)}100%{transform:scaleX(1) translateY(0)}} @keyframes diceRoll{0%{transform:rotate(0deg)scale(1)}25%{transform:rotate(-24deg)scale(1.12)}55%{transform:rotate(19deg)scale(1.08)}80%{transform:rotate(-8deg)scale(1.04)}100%{transform:rotate(0deg)scale(1)}} @keyframes resultPop{0%{transform:scale(0.78);opacity:0.35}55%{transform:scale(1.09);opacity:1}100%{transform:scale(1);opacity:1}} @keyframes sportBounce{0%{transform:translateY(0)scale(1)}40%{transform:translateY(-20px)scale(1.12)}70%{transform:translateY(-6px)scale(1.06)}100%{transform:translateY(0)scale(1)}}'),

            React.createElement("div", { className: "flex items-center gap-3 mb-3" },

              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 rounded-lg transition-colors", style: { color: _muted }, 'aria-label': 'Back to tools' }, React.createElement(ArrowLeft, { size: 18 })),

              React.createElement("h3", { className: "text-lg font-bold", style: { color: _text } }, "\uD83C\uDFB2 Probability Lab"),

              d.trials > 0 && React.createElement("span", { className: "ml-2 px-2 py-0.5 text-xs font-bold rounded-full", style: { background: isDark || isContrast ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.1)', color: _accent } }, d.trials + " trials"),

              (d._bestStreak || 0) >= 3 && React.createElement("span", { className: "ml-1 px-2 py-0.5 text-xs font-bold rounded-full", style: { background: isDark || isContrast ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.08)', color: '#ef4444' } }, '🔥 Best: ' + (d._bestStreak || 0))

            ),

            React.createElement("p", { className: "text-xs italic -mt-1 mb-3", style: { color: _muted } }, "Explore probability through experiments. Run trials and watch observed frequencies converge to expected values."),

            // Mode selector

            React.createElement("div", { className: "flex flex-wrap gap-2 mb-3" },

              [['coin', '\uD83E\uDE99 Coin'], ['dice', '\uD83C\uDFB2 Dice'], ['spinner', '\uD83C\uDFA1 Spinner'], ['sports', '\uD83C\uDFC6 Sports'], ['marbleBag', '\uD83C\uDFB1 Marble Bag'], ['custom', '\u2699\uFE0F Custom'], ['tree', '\uD83C\uDF33 Tree'], ['pi', '\uD83E\uDD67 Pi'], ['birthday', '\uD83C\uDF82 Birthday']].map(([m, label]) =>

                React.createElement("button", { "aria-label": "Select mode: " + label, key: m, onClick: () => { if (_autoRun.interval) { clearInterval(_autoRun.interval); _autoRun.interval = null; } upd('mode', m); upd('results', []); upd('trials', 0); upd('convergenceHistory', []); upd('lastResult', null); upd('_mbRemaining', null); upd('_piPoints', null); upd('_autoRunning', false); }, className: "px-4 py-2 rounded-lg text-sm font-bold transition-all", style: { background: d.mode === m ? _btnBg : (isDark || isContrast ? 'rgba(139,92,246,0.1)' : '#f1f5f9'), color: d.mode === m ? _btnText : (isDark || isContrast ? '#c4b5fd' : '#475569'), boxShadow: d.mode === m ? '0 4px 6px -1px rgba(139,92,246,0.3)' : 'none' } }, label)

              )

            ),



            // â”€â”€ Marble Bag mode config â”€â”€

            d.mode === 'marbleBag' && React.createElement("div", { className: "mb-4 rounded-xl p-4", style: { background: isDark || isContrast ? 'rgba(139,92,246,0.08)' : 'linear-gradient(135deg, #fdf4ff, #faf5ff, #f5f3ff)', border: '2px solid ' + (isDark || isContrast ? 'rgba(168,85,247,0.3)' : '#c4b5fd') } },

              React.createElement("div", { className: "flex items-center justify-between mb-3" },

                React.createElement("p", { className: "text-sm font-black", style: { color: isDark || isContrast ? '#c4b5fd' : '#7c3aed' } }, "\uD83C\uDFB1 Marble Bag Setup"),

                // Without-replacement toggle

                React.createElement("label", { className: "flex items-center gap-2 cursor-pointer select-none" },

                  React.createElement("span", { className: "text-[11px] font-bold", style: { color: isDark || isContrast ? '#a5b4fc' : '#6d28d9' } }, d.mbWithoutReplacement ? '\uD83D\uDD04 Without Replacement' : '\u267B\uFE0F With Replacement'),

                  React.createElement("div", { 

                    onClick: function () { upd('mbWithoutReplacement', !d.mbWithoutReplacement); upd('results', []); upd('trials', 0); upd('convergenceHistory', []); upd('lastResult', null); upd('_mbRemaining', null); },

                    className: "relative w-10 h-5 rounded-full transition-colors cursor-pointer",

                    style: { background: d.mbWithoutReplacement ? '#7c3aed' : '#cbd5e1' }

                  },

                    React.createElement("div", { className: "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform", style: { left: d.mbWithoutReplacement ? '22px' : '2px' } })

                  )

                )

              ),

              d.mbWithoutReplacement && React.createElement("div", { className: "mb-3 px-3 py-2 rounded-lg text-[11px] font-bold", style: { background: 'rgba(139,92,246,0.1)', color: isDark || isContrast ? '#c4b5fd' : '#6d28d9', border: '1px dashed rgba(139,92,246,0.3)' } },

                "\uD83D\uDCA1 Without replacement: Each marble drawn is removed from the bag. Probabilities change after each draw! Bag refills when empty.",

                (d._mbRemaining && d._mbRemaining.length >= 0) ? ' \u2014 ' + d._mbRemaining.length + ' marbles remaining' : ''

              ),

              // Marble color rows

              React.createElement("div", { className: "space-y-2 mb-3" },

                customOutcomes.map(function (o, i) {

                  var count = o.count || 1;

                  return React.createElement("div", { key: i, className: "flex items-center gap-2 rounded-lg p-2", style: { background: isDark || isContrast ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)', border: '1px solid ' + (isDark || isContrast ? 'rgba(139,92,246,0.15)' : '#e9d5ff') } },

                    React.createElement("input", { type: "color", value: o.color, 'aria-label': 'Color for outcome ' + (o.label || (i + 1)), onChange: function (e) { var co = (d.customOutcomes || customOutcomes).slice(); co[i] = Object.assign({}, co[i], { color: e.target.value }); upd('customOutcomes', co); }, className: "w-7 h-7 rounded-full border-0 cursor-pointer flex-shrink-0", style: { borderRadius: '50%' } }),

                    React.createElement("input", { type: "text", value: o.label, placeholder: "Color " + (i + 1), 'aria-label': 'Name for color ' + (i + 1), onChange: function (e) { var co = (d.customOutcomes || customOutcomes).slice(); co[i] = Object.assign({}, co[i], { label: e.target.value }); upd('customOutcomes', co); }, className: "w-20 px-2 py-1 rounded-lg text-sm font-bold flex-shrink-0", style: { border: '1px solid ' + (isDark || isContrast ? 'rgba(139,92,246,0.2)' : '#ddd6fe'), background: isDark || isContrast ? 'rgba(255,255,255,0.05)' : '#fff', color: _text } }),

                    React.createElement("button", { "aria-label": "Decrease marble count for " + (o.label || 'color ' + (i + 1)), onClick: function () { if (count <= 1) return; var co = (d.customOutcomes || customOutcomes).slice(); co[i] = Object.assign({}, co[i], { count: count - 1 }); upd('customOutcomes', co); upd('results', []); upd('trials', 0); upd('convergenceHistory', []); upd('_mbRemaining', null); }, className: "w-7 h-7 rounded-full font-bold text-sm flex-shrink-0 flex items-center justify-center transition-all hover:scale-110", style: { background: '#fecaca', color: '#dc2626' } }, "\u2212"),

                    React.createElement("span", { className: "w-8 text-center text-sm font-black", style: { color: _text } }, count),

                    React.createElement("button", { "aria-label": "Increase marble count for " + (o.label || 'color ' + (i + 1)), onClick: function () { var co = (d.customOutcomes || customOutcomes).slice(); co[i] = Object.assign({}, co[i], { count: count + 1 }); upd('customOutcomes', co); upd('results', []); upd('trials', 0); upd('convergenceHistory', []); upd('_mbRemaining', null); }, className: "w-7 h-7 rounded-full font-bold text-sm flex-shrink-0 flex items-center justify-center transition-all hover:scale-110", style: { background: '#bbf7d0', color: '#16a34a' } }, "+"),

                    React.createElement("span", { className: "ml-auto text-[11px] font-mono", style: { color: isDark || isContrast ? '#a5b4fc' : '#7c3aed' } }, count + '/' + customOutcomes.reduce(function (s, c) { return s + (c.count || 1); }, 0) + ' = ' + ((o.prob || 0) * 100).toFixed(1) + '%'),

                    customOutcomes.length > 2 && React.createElement("button", { "aria-label": "Remove marble color " + (o.label || (i + 1)), onClick: function () { var co = (d.customOutcomes || customOutcomes).filter(function (_, j) { return j !== i; }); upd('customOutcomes', co); upd('results', []); upd('trials', 0); upd('convergenceHistory', []); upd('_mbRemaining', null); }, className: "text-sm font-bold px-1 flex-shrink-0 transition-colors", style: { color: '#f87171' } }, "\u2715")

                  );

                })

              ),

              customOutcomes.length < 8 && React.createElement("button", { "aria-label": "+ Add Color", onClick: function () { var co = (d.customOutcomes || customOutcomes).concat([{ label: ['Green', 'Yellow', 'Purple', 'Orange', 'Pink', 'Teal'][Math.min(customOutcomes.length - 2, 5)] || String.fromCharCode(65 + customOutcomes.length), numerator: 1, denominator: 20, prob: 0, count: 3, color: ['#22c55e', '#eab308', '#8b5cf6', '#f97316', '#ec4899', '#06b6d4', '#14b8a6', '#f43f5e'][customOutcomes.length % 8] }]); upd('customOutcomes', co); upd('results', []); upd('trials', 0); upd('convergenceHistory', []); upd('_mbRemaining', null); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105", style: { background: isDark || isContrast ? 'rgba(139,92,246,0.2)' : '#ede9fe', color: isDark || isContrast ? '#c4b5fd' : '#7c3aed' } }, "+ Add Color"),

              // â”€â”€ SVG Bag Visualization â”€â”€

              React.createElement("div", { className: "mt-4 flex justify-center" },

                React.createElement("div", { style: { position: 'relative', display: 'inline-block', animation: d._mbShaking ? 'mbShake 0.5s ease-in-out' : 'none' } },

                  React.createElement("svg", { viewBox: "0 0 180 200", width: 180, height: 200, style: { filter: 'drop-shadow(0 4px 12px rgba(139,92,246,0.2))' } },

                    // Bag body

                    React.createElement("path", { d: "M30 60 Q20 60 15 80 L10 170 Q10 195 40 195 L140 195 Q170 195 170 170 L165 80 Q160 60 150 60", fill: isDark || isContrast ? '#2d1b69' : '#ddd6fe', stroke: isDark || isContrast ? '#7c3aed' : '#a78bfa', strokeWidth: 2.5 }),

                    // Bag opening / drawstring

                    React.createElement("path", { d: "M30 60 Q55 45 90 45 Q125 45 150 60", fill: "none", stroke: isDark || isContrast ? '#a78bfa' : '#7c3aed', strokeWidth: 2, strokeDasharray: "4 3" }),

                    // Drawstring knot

                    React.createElement("ellipse", { cx: 90, cy: 48, rx: 8, ry: 5, fill: isDark || isContrast ? '#a78bfa' : '#7c3aed' }),

                    // Bag label

                    React.createElement("text", { x: 90, y: 32, textAnchor: "middle", style: { fontSize: '10px', fontWeight: 'bold', fill: isDark || isContrast ? '#c4b5fd' : '#6d28d9' } }, customOutcomes.reduce(function (s, o) { return s + (o.count || 1); }, 0) + ' marbles'),

                    // Marbles inside bag

                    (function () {

                      var allMarbles = []; customOutcomes.forEach(function (o) { for (var _mj = 0; _mj < Math.min(o.count || 1, 15); _mj++) allMarbles.push(o.color); });

                      // Deterministic positioning for marbles

                      var positions = [];

                      var cols = Math.ceil(Math.sqrt(allMarbles.length));

                      for (var _mk = 0; _mk < Math.min(allMarbles.length, 50); _mk++) {

                        var row = Math.floor(_mk / cols), col = _mk % cols;

                        var px = 40 + col * 20 + (row % 2 ? 10 : 0) + (Math.sin(_mk * 7.3) * 4);

                        var py = 90 + row * 20 + (Math.cos(_mk * 5.1) * 3);

                        if (px > 150) px = 40 + (px % 110); if (py > 185) py = 90 + (py % 95);

                        positions.push({ x: px, y: py, color: allMarbles[_mk] });

                      }

                      return positions.map(function (p, idx) {

                        return React.createElement("g", { key: idx },

                          React.createElement("circle", { cx: p.x, cy: p.y, r: 8, fill: p.color, stroke: 'rgba(0,0,0,0.15)', strokeWidth: 0.5 }),

                          React.createElement("circle", { cx: p.x - 2, cy: p.y - 2, r: 3, fill: 'rgba(255,255,255,0.4)' })

                        );

                      });

                    })()

                  ),

                  // CSS animation style

                  React.createElement("style", null, '@keyframes mbShake { 0%,100% { transform: rotate(0deg); } 15% { transform: rotate(-8deg); } 30% { transform: rotate(8deg); } 45% { transform: rotate(-5deg); } 60% { transform: rotate(5deg); } 75% { transform: rotate(-2deg); } }')

                )

              )

            ),



            // â”€â”€ Sports scenario selector â”€â”€

            d.mode === 'sports' && React.createElement("div", { className: "mb-4 rounded-xl p-3", style: { background: isDark || isContrast ? 'rgba(34,197,94,0.06)' : 'linear-gradient(to right, #ecfdf5, #f0f9ff)', border: '1px solid ' + (isDark || isContrast ? 'rgba(34,197,94,0.2)' : '#a7f3d0') } },

              React.createElement("p", { className: "text-xs font-bold text-emerald-700 mb-2" }, "\uD83C\uDFC6 Choose a Sport"),

              React.createElement("div", { className: "flex flex-wrap gap-2" },

                SPORTS.map(function (s) {

                  return React.createElement("button", { "aria-label": "Select sport scenario: " + s.label,

                    key: s.id,

                    onClick: function () { upd('sportType', s.id); upd('results', []); upd('trials', 0); upd('convergenceHistory', []); upd('lastResult', null); },

                    className: "px-3 py-2 rounded-lg text-xs font-bold transition-all " + ((d.sportType || 'freethrow') === s.id ? 'bg-white shadow-md border-2 border-emerald-400 text-emerald-700' : 'bg-white/50 text-slate-600 hover:bg-white border border-slate-200')

                  }, s.icon + ' ' + s.label.replace(/^.*? /, ''));

                })

              ),

              React.createElement("p", { className: "text-xs text-slate-600 mt-2 italic" }, activeSport.desc + ' \u2014 P(' + activeSport.outcomes[0] + ') = ' + (activeSport.probs[0] * 100).toFixed(0) + '%')

            ),



            // â”€â”€ Custom mode config â”€â”€ (3 sub-modes: Fraction, Marble Bag, Slider)

            d.mode === 'custom' && React.createElement("div", { className: "mb-4 rounded-xl p-3", style: { background: isDark || isContrast ? 'rgba(245,158,11,0.06)' : 'linear-gradient(to right, #fffbeb, #fff7ed)', border: '1px solid ' + (isDark || isContrast ? 'rgba(245,158,11,0.2)' : '#fcd34d') } },

              React.createElement("div", { className: "flex gap-1 mb-3 bg-amber-100/50 rounded-lg p-1" },

                [['fraction', '\uD83C\uDFAF Fraction'], ['marbleBag', '\uD83C\uDFB1 Marble Bag'], ['slider', '\uD83C\uDFA8 Slider']].map(function (pair) { var sm = pair[0], label = pair[1]; return React.createElement("button", { "aria-label": "Select " + label + " input mode", key: sm, onClick: function () { upd('customSubMode', sm); }, className: "flex-1 px-3 py-1.5 rounded-md text-xs font-bold transition-all " + (customSubMode === sm ? 'bg-white text-amber-700 shadow-sm' : 'text-amber-600/60 hover:text-amber-700') }, label); })

              ),



              // â”€â”€ FRACTION SUB-MODE â”€â”€

              customSubMode === 'fraction' && React.createElement("div", null,

                React.createElement("p", { className: "text-xs text-amber-600 mb-2 italic" }, "\uD83C\uDFAF Define each event as a fraction \u2014 e.g., \"1 out of 20 times\""),

                React.createElement("div", { className: "space-y-2" },

                  customOutcomes.map(function (o, i) {

                    return React.createElement("div", { key: i, className: "flex items-center gap-2 bg-white/60 rounded-lg p-2" },

                      React.createElement("input", { type: "color", value: o.color, 'aria-label': 'Color for outcome ' + (o.label || (i + 1)), onChange: function (e) { var co = (d.customOutcomes || customOutcomes).slice(); co[i] = Object.assign({}, co[i], { color: e.target.value }); upd('customOutcomes', co); }, className: "w-7 h-7 rounded border-0 cursor-pointer flex-shrink-0" }),

                      React.createElement("input", { type: "text", value: o.label, placeholder: "Event " + (i + 1), 'aria-label': 'Name for event ' + (i + 1), onChange: function (e) { var co = (d.customOutcomes || customOutcomes).slice(); co[i] = Object.assign({}, co[i], { label: e.target.value }); upd('customOutcomes', co); }, className: "w-20 px-2 py-1 rounded-lg border border-amber-200 text-sm font-bold flex-shrink-0" }),

                      React.createElement("input", { type: "number", min: 0, max: 999, value: o.numerator != null ? o.numerator : 1, 'aria-label': 'Numerator for event ' + (o.label || (i + 1)), onChange: function (e) { var num = Math.max(0, parseInt(e.target.value) || 0); var co = (d.customOutcomes || customOutcomes).slice(); co[i] = Object.assign({}, co[i], { numerator: num, prob: (o.denominator || 20) > 0 ? num / (o.denominator || 20) : 0 }); upd('customOutcomes', co); }, className: "w-14 px-1 py-1 rounded-lg border border-amber-200 text-sm text-center font-mono" }),

                      React.createElement("span", { className: "text-xs font-bold text-amber-600 flex-shrink-0" }, "out of"),

                      React.createElement("input", { type: "number", min: 1, max: 10000, value: o.denominator != null ? o.denominator : 20, 'aria-label': 'Denominator for event ' + (o.label || (i + 1)), onChange: function (e) { var den = Math.max(1, parseInt(e.target.value) || 1); var co = (d.customOutcomes || customOutcomes).slice(); co[i] = Object.assign({}, co[i], { denominator: den, prob: den > 0 ? (o.numerator != null ? o.numerator : 1) / den : 0 }); upd('customOutcomes', co); }, className: "w-14 px-1 py-1 rounded-lg border border-amber-200 text-sm text-center font-mono" }),

                      React.createElement("span", { className: "ml-1 px-2 py-0.5 rounded-full text-[11px] font-bold " + (o.prob <= 0.1 ? 'bg-violet-100 text-violet-700' : o.prob <= 0.5 ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700') }, (o.prob * 100).toFixed(1) + '%'),

                      customOutcomes.length > 2 && React.createElement("button", { "aria-label": "Remove event " + (o.label || (i + 1)), onClick: function () { var co = (d.customOutcomes || customOutcomes).filter(function (_, j) { return j !== i; }); upd('customOutcomes', co); upd('results', []); upd('trials', 0); upd('convergenceHistory', []); }, className: "text-red-400 hover:text-red-600 text-sm font-bold px-1 flex-shrink-0" }, "\u2715")

                    );

                  })

                ),

                customOutcomes.length < 8 && React.createElement("button", { "aria-label": "+ Add Event", onClick: function () { var co = (d.customOutcomes || customOutcomes).concat([{ label: String.fromCharCode(65 + customOutcomes.length), numerator: 1, denominator: 20, prob: 0.05, count: 1, color: ['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#8b5cf6', '#f97316', '#06b6d4', '#ec4899'][customOutcomes.length % 8] }]); upd('customOutcomes', co); upd('results', []); upd('trials', 0); upd('convergenceHistory', []); }, className: "mt-2 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-200 transition-colors" }, "+ Add Event"),

                React.createElement("p", { className: "text-[11px] mt-1.5 " + (Math.abs(customOutcomes.reduce(function (s, o) { return s + o.prob; }, 0) - 1) < 0.05 ? 'text-emerald-500' : 'text-red-500') }, "\uD83D\uDCA1 Total: " + (customOutcomes.reduce(function (s, o) { return s + o.prob; }, 0) * 100).toFixed(1) + "%" + (Math.abs(customOutcomes.reduce(function (s, o) { return s + o.prob; }, 0) - 1) > 0.05 ? ' \u2014 fractions should add to 100%' : ' \u2713'))

              ),



              // â”€â”€ MARBLE BAG SUB-MODE â”€â”€

              customSubMode === 'marbleBag' && React.createElement("div", null,

                React.createElement("p", { className: "text-xs text-amber-600 mb-2 italic" }, "\uD83C\uDFB1 Add colored marbles to a bag. Probability = your marble count \u00F7 total marbles."),

                React.createElement("div", { className: "space-y-2" },

                  customOutcomes.map(function (o, i) {

                    var count = o.count || 1;

                    return React.createElement("div", { key: i, className: "flex items-center gap-2 bg-white/60 rounded-lg p-2" },

                      React.createElement("input", { type: "color", value: o.color, 'aria-label': 'Color for outcome ' + (o.label || (i + 1)), onChange: function (e) { var co = (d.customOutcomes || customOutcomes).slice(); co[i] = Object.assign({}, co[i], { color: e.target.value }); upd('customOutcomes', co); }, className: "w-7 h-7 rounded border-0 cursor-pointer flex-shrink-0" }),

                      React.createElement("input", { type: "text", value: o.label, placeholder: "Color " + (i + 1), 'aria-label': 'Name for marble color ' + (i + 1), onChange: function (e) { var co = (d.customOutcomes || customOutcomes).slice(); co[i] = Object.assign({}, co[i], { label: e.target.value }); upd('customOutcomes', co); }, className: "w-20 px-2 py-1 rounded-lg border border-amber-200 text-sm font-bold flex-shrink-0" }),

                      React.createElement("button", { "aria-label": "Decrease marble count for " + (o.label || 'color ' + (i + 1)), onClick: function () { if (count <= 1) return; var co = (d.customOutcomes || customOutcomes).slice(); co[i] = Object.assign({}, co[i], { count: count - 1 }); upd('customOutcomes', co); upd('results', []); upd('trials', 0); upd('convergenceHistory', []); }, className: "w-7 h-7 rounded-full bg-red-100 text-red-600 font-bold text-sm hover:bg-red-200 transition-colors flex-shrink-0 flex items-center justify-center" }, "\u2212"),

                      React.createElement("span", { className: "w-8 text-center text-sm font-black text-slate-700" }, count),

                      React.createElement("button", { "aria-label": "Increase marble count for " + (o.label || 'color ' + (i + 1)), onClick: function () { var co = (d.customOutcomes || customOutcomes).slice(); co[i] = Object.assign({}, co[i], { count: count + 1 }); upd('customOutcomes', co); upd('results', []); upd('trials', 0); upd('convergenceHistory', []); }, className: "w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 font-bold text-sm hover:bg-emerald-200 transition-colors flex-shrink-0 flex items-center justify-center" }, "+"),

                      React.createElement("span", { className: "ml-1 text-[11px] font-mono text-amber-600" }, count + '/' + customOutcomes.reduce(function (s, c) { return s + (c.count || 1); }, 0) + ' = ' + (o.prob * 100).toFixed(1) + '%'),

                      customOutcomes.length > 2 && React.createElement("button", { "aria-label": "Remove marble color " + (o.label || (i + 1)), onClick: function () { var co = (d.customOutcomes || customOutcomes).filter(function (_, j) { return j !== i; }); upd('customOutcomes', co); upd('results', []); upd('trials', 0); upd('convergenceHistory', []); }, className: "text-red-400 hover:text-red-600 text-sm font-bold px-1 flex-shrink-0" }, "\u2715")

                    );

                  })

                ),

                React.createElement("div", { className: "mt-3 bg-white/80 rounded-xl p-3 border border-amber-200" },

                  React.createElement("div", { className: "flex flex-wrap gap-1 justify-center" },

                    customOutcomes.reduce(function (acc, o) { for (var m = 0; m < Math.min(o.count || 1, 50); m++) acc.push({ color: o.color, label: o.label }); return acc; }, []).slice(0, 100).map(function (marble, idx) {

                      return React.createElement("div", { key: idx, style: { width: 14, height: 14, borderRadius: '50%', background: marble.color, border: '1px solid rgba(0,0,0,0.15)', boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.2), inset 0 1px 2px rgba(255,255,255,0.4)' }, title: marble.label });

                    })

                  ),

                  customOutcomes.reduce(function (s, o) { return s + (o.count || 1); }, 0) > 100 && React.createElement("p", { className: "text-[11px] text-slate-600 text-center mt-1" }, "(showing first 100 of " + customOutcomes.reduce(function (s, o) { return s + (o.count || 1); }, 0) + " marbles)"),

                  React.createElement("p", { className: "text-xs text-center font-bold text-amber-700 mt-2" }, "\uD83C\uDFB1 " + customOutcomes.reduce(function (s, o) { return s + (o.count || 1); }, 0) + " marbles in bag")

                ),

                customOutcomes.length < 8 && React.createElement("button", { "aria-label": "+ Add Color", onClick: function () { var co = (d.customOutcomes || customOutcomes).concat([{ label: String.fromCharCode(65 + customOutcomes.length), numerator: 1, denominator: 20, prob: 0, count: 1, color: ['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#8b5cf6', '#f97316', '#06b6d4', '#ec4899'][customOutcomes.length % 8] }]); upd('customOutcomes', co); upd('results', []); upd('trials', 0); upd('convergenceHistory', []); }, className: "mt-2 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-200 transition-colors" }, "+ Add Color")

              ),



              // â”€â”€ SLIDER SUB-MODE (original) â”€â”€

              customSubMode === 'slider' && React.createElement("div", null,

                React.createElement("p", { className: "text-xs text-amber-600 mb-2 italic" }, "\uD83C\uDFA8 Drag sliders to set exact probability percentages for each outcome."),

                React.createElement("div", { className: "space-y-2" },

                  customOutcomes.map(function (o, i) {

                    return React.createElement("div", { key: i, className: "flex items-center gap-2" },

                      React.createElement("input", { type: "color", value: o.color, 'aria-label': 'Color for outcome ' + (o.label || (i + 1)), onChange: function (e) { var co = (d.customOutcomes || customOutcomes).slice(); co[i] = Object.assign({}, co[i], { color: e.target.value }); upd('customOutcomes', co); }, className: "w-8 h-8 rounded border-0 cursor-pointer" }),

                      React.createElement("input", { type: "text", value: o.label, placeholder: "Outcome " + (i + 1), 'aria-label': 'Name for outcome ' + (i + 1), onChange: function (e) { var co = (d.customOutcomes || customOutcomes).slice(); co[i] = Object.assign({}, co[i], { label: e.target.value }); upd('customOutcomes', co); }, className: "flex-1 px-2 py-1.5 rounded-lg border border-amber-200 text-sm font-bold" }),

                      React.createElement("div", { className: "flex items-center gap-1" },

                        React.createElement("input", { type: "range", min: 1, max: 99, value: Math.round(o.prob * 100), 'aria-label': 'Probability for outcome ' + (o.label || (i + 1)), onChange: function (e) { var newProb = parseInt(e.target.value) / 100; var co = (d.customOutcomes || customOutcomes).slice(); co[i] = Object.assign({}, co[i], { prob: newProb }); var remaining = 1 - newProb; var otherTotal = co.reduce(function (s, c, j) { return j === i ? s : s + c.prob; }, 0); if (otherTotal > 0) { co.forEach(function (c, j) { if (j !== i) co[j] = Object.assign({}, c, { prob: c.prob / otherTotal * remaining }); }); } upd('customOutcomes', co); }, className: "w-20 accent-amber-600" }),

                        React.createElement("span", { className: "w-10 text-xs font-mono text-amber-700 text-right" }, Math.round(o.prob * 100) + '%')

                      ),

                      customOutcomes.length > 2 && React.createElement("button", { "aria-label": "Remove outcome " + (o.label || (i + 1)), onClick: function () { var co = (d.customOutcomes || customOutcomes).filter(function (_, j) { return j !== i; }); var total = co.reduce(function (s, c) { return s + c.prob; }, 0); co = co.map(function (c) { return Object.assign({}, c, { prob: c.prob / total }); }); upd('customOutcomes', co); upd('results', []); upd('trials', 0); upd('convergenceHistory', []); }, className: "text-red-400 hover:text-red-600 text-sm font-bold px-1" }, "\u2715")

                    );

                  })

                ),

                customOutcomes.length < 8 && React.createElement("button", { "aria-label": "+ Add Outcome", onClick: function () { var newOuts = (d.customOutcomes || customOutcomes).concat([{ label: String.fromCharCode(65 + customOutcomes.length), prob: 0, count: 1, numerator: 0, denominator: 20, color: ['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#8b5cf6', '#f97316', '#06b6d4', '#ec4899'][customOutcomes.length % 8] }]); var prob = 1 / newOuts.length; newOuts = newOuts.map(function (o) { return Object.assign({}, o, { prob: prob }); }); upd('customOutcomes', newOuts); upd('results', []); upd('trials', 0); upd('convergenceHistory', []); }, className: "mt-2 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-200 transition-colors" }, "+ Add Outcome"),

                React.createElement("p", { className: "text-[11px] text-amber-500 mt-1" }, "\uD83D\uDCA1 Total: " + Math.round(customOutcomes.reduce(function (s, o) { return s + o.prob; }, 0) * 100) + "% (should be 100%)")

              )

            ),



            // ── Birthday Problem Calculator ──
            d.mode === 'birthday' && (function() {

              var _bn = d.birthdayN || 23;

              var _bprob = (function(n) {

                var p = 1;

                for (var _bi = 0; _bi < n && _bi < 365; _bi++) p *= (365 - _bi) / 365;

                return 1 - p;

              })(_bn);

              var _bpct = (_bprob * 100).toFixed(1);

              var _bColor = parseFloat(_bpct) >= 50 ? '#16a34a' : '#b45309';

              var _bTable = [2, 5, 10, 15, 20, 23, 30, 40, 50, 57].map(function(nb) {

                var pb = 1;

                for (var _bj = 0; _bj < nb && _bj < 365; _bj++) pb *= (365 - _bj) / 365;

                return { n: nb, pct: ((1 - pb) * 100).toFixed(1), over50: (1 - pb) >= 0.5 };

              });

              return React.createElement("div", { className: "mb-4 rounded-xl p-4", style: { background: isDark||isContrast?'rgba(251,191,36,0.06)':'linear-gradient(135deg,#fffbeb,#fff7ed)', border: '2px solid '+(isDark||isContrast?'rgba(251,191,36,0.3)':'#fde68a') } },

                React.createElement("p", { className: "text-sm font-black mb-1", style: { color: isDark||isContrast?'#fbbf24':'#b45309' } }, '🎂 The Birthday Paradox'),

                React.createElement("p", { className: "text-xs italic mb-3", style: { color: isDark||isContrast?'#fde68a':'#92400e' } }, 'In a room of just 23 people, there’s a >50% chance two share a birthday. Drag the slider to explore!'),

                React.createElement("div", { className: "flex items-center gap-3 mb-3" },

                  React.createElement("span", { className: "text-xs font-bold w-24 flex-shrink-0", style: { color: isDark||isContrast?'#fbbf24':'#b45309' } }, '👥 ' + _bn + ' people'),

                  React.createElement("input", { type: "range", min: 2, max: 70, value: _bn, 'aria-label': 'Number of people in room', onChange: function(e) { upd('birthdayN', parseInt(e.target.value)); }, className: "flex-1", style: { accentColor: '#f59e0b' } })

                ),

                React.createElement("div", { className: "flex flex-col items-center mb-4 py-3 rounded-xl", style: { background: isDark||isContrast?'rgba(251,191,36,0.1)':'rgba(251,191,36,0.12)', transition:'background 0.3s' } },

                  React.createElement("span", { className: "text-5xl font-black", style: { color: _bColor, transition:'color 0.3s' } }, _bpct + '%'),

                  React.createElement("span", { className: "text-xs mt-1", style: { color: _muted } }, 'P(≥2 share a birthday among ' + _bn + ' people)'),

                  React.createElement("div", { className: "w-full mt-2 px-4" },

                    React.createElement("div", { className: "h-3 rounded-full overflow-hidden relative", style: { background: isDark||isContrast?'rgba(255,255,255,0.1)':'#fef3c7' } },

                      React.createElement("div", { style: { width: Math.min(parseFloat(_bpct), 100) + '%', height: '100%', background: parseFloat(_bpct) >= 50 ? 'linear-gradient(to right, #f59e0b, #22c55e)' : '#f59e0b', borderRadius: '9999px', transition: 'width 0.4s ease' } }),

                      React.createElement("div", { style: { position: 'absolute', left: '50%', top: 0, bottom: 0, width: '2px', background: 'rgba(220,38,38,0.5)' }, title: '50% threshold' })

                    )

                  )

                ),

                React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-3 justify-center" },

                  [10, 23, 30, 50, 57].map(function(mn) {

                    var mpb = 1;

                    for (var _mk = 0; _mk < mn && _mk < 365; _mk++) mpb *= (365 - _mk) / 365;

                    return React.createElement("button", { "aria-label": "Set group size to " + mn + " people", key: mn, onClick: function() { upd('birthdayN', mn); }, className: "px-2 py-1 rounded-lg text-[11px] font-bold transition-all", style: { background: _bn === mn ? '#f59e0b' : (isDark||isContrast?'rgba(251,191,36,0.1)':'#fef9c3'), color: _bn === mn ? '#fff' : (isDark||isContrast?'#fbbf24':'#92400e'), border: '1px solid '+(isDark||isContrast?'rgba(251,191,36,0.2)':'#fde68a'), boxShadow: _bn === mn ? '0 2px 8px rgba(245,158,11,0.3)' : 'none' } }, 'n=' + mn + ' → ' + ((1 - mpb) * 100).toFixed(0) + '%');

                  })

                ),

                React.createElement("div", { className: "rounded-lg overflow-hidden mb-3", style: { border: '1px solid '+(isDark||isContrast?'rgba(251,191,36,0.2)':'#fde68a') } },

                  React.createElement("table", { className: "w-full text-[11px]" },

                    React.createElement("caption", { className: "sr-only" }, "probability data table"), React.createElement("thead", null, React.createElement("tr", { style: { background: isDark||isContrast?'rgba(251,191,36,0.15)':'#fef9c3' } },

                      React.createElement("th", { scope: "col", className: "px-3 py-1.5 text-left font-bold", style:{color:isDark||isContrast?'#fbbf24':'#b45309'} }, 'People (n)'),

                      React.createElement("th", { scope: "col", className: "px-3 py-1.5 text-right font-bold", style:{color:isDark||isContrast?'#fbbf24':'#b45309'} }, 'P(shared birthday)')

                    )),

                    React.createElement("tbody", null,

                      _bTable.map(function(row, ri) {

                        return React.createElement("tr", { key: row.n, style: { background: _bn === row.n ? (isDark||isContrast?'rgba(251,191,36,0.12)':'rgba(251,191,36,0.1)') : (ri%2===0?(isDark||isContrast?'rgba(255,255,255,0.02)':'#fffbeb'):'transparent') } },

                          React.createElement("td", { className: "px-3 py-1 font-bold font-mono", style:{color:_bn===row.n?'#b45309':_text} }, row.n + (_bn===row.n?' ◄':'')),

                          React.createElement("td", { className: "px-3 py-1 text-right font-bold font-mono", style:{color:row.over50?'#16a34a':'#b45309'} }, row.pct + '%')

                        );

                      })

                    )

                  )

                ),

                React.createElement("p", { className: "text-[11px] italic p-2 rounded-lg", style: { background: isDark||isContrast?'rgba(251,191,36,0.05)':'rgba(251,191,36,0.07)', color: isDark||isContrast?'#fde68a':'#92400e' } },

                  '📚 P = 1 − (365 × 364 × … × (366−n)) ÷ 365ⁿ — ' + _bn + ' people = ' + Math.round(_bn*(_bn-1)/2) + ' unique pairs. More pairs = more chances!'

                )

              );

            })(),

            // Visual result display (hidden in tree mode)

            d.mode !== 'tree' && d.mode !== 'birthday' && d.mode !== 'pi' && React.createElement("div", { key: 'result-' + (d.animTick || 0), className: "flex items-center justify-center gap-6 mb-4 py-4 rounded-xl", style: { background: isDark || isContrast ? 'rgba(139,92,246,0.08)' : 'linear-gradient(to bottom, #f5f3ff, #fff)', border: '2px solid ' + (isDark || isContrast ? 'rgba(139,92,246,0.25)' : '#ddd6fe'), animation: (d.animTick || 0) > 0 ? 'resultPop 0.35s ease-out' : 'none' } },

              d.mode === 'coin' && React.createElement("div", { style: { animation: (d.animTick||0)>0?'coinFlip 0.42s cubic-bezier(0.25,0.46,0.45,0.94)':'none', transformOrigin:'center' } }, coinSvg(d.lastResult || 'H')),

              d.mode === 'dice' && React.createElement("div", { style: { animation: (d.animTick||0)>0?'diceRoll 0.38s cubic-bezier(0.34,1.3,0.64,1)':'none', transformOrigin:'center' } }, diceFace(d.lastResult || 1, 80)),

              d.mode === 'spinner' && spinnerSvg(d.lastResult, d.animTick),

              d.mode === 'sports' && React.createElement("div", { style: { animation: (d.animTick||0)>0?'sportBounce 0.4s ease-out':'none' } }, sportVisual(d.lastResult)),

              d.mode === 'custom' && React.createElement("div", { className: "flex flex-col items-center gap-1" },

                React.createElement("div", { style: { width: 48, height: 48, borderRadius: '50%', background: barColors[d.lastResult] || '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' } },

                  React.createElement("span", { style: { fontSize: '20px', fontWeight: 'bold', color: '#fff' } }, d.lastResult ? d.lastResult[0] : '?')

                ),

                React.createElement("span", { className: "text-xs font-bold text-slate-600" }, d.lastResult || '?')

              ),

              d.mode === 'marbleBag' && React.createElement("div", { className: "flex flex-col items-center gap-2" },

                // Drawn marble with glow animation

                React.createElement("div", { style: { width: 56, height: 56, borderRadius: '50%', background: barColors[d.lastResult] || '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px ' + (barColors[d.lastResult] || '#e2e8f0') + '80, inset 0 -4px 8px rgba(0,0,0,0.2), inset 0 2px 4px rgba(255,255,255,0.4)', transition: 'all 0.3s ease', transform: d._mbShaking ? 'scale(1.2)' : 'scale(1)' } },

                  React.createElement("span", { style: { fontSize: '18px', fontWeight: 'bold', color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.3)' } }, d.lastResult || '?')

                ),

                React.createElement("span", { className: "text-xs font-bold", style: { color: barColors[d.lastResult] || _muted } }, d.lastResult ? '\uD83C\uDFB1 Drew: ' + d.lastResult : 'Shake the bag!'),

                d.mbWithoutReplacement && d._mbRemaining && React.createElement("span", { className: "text-[11px] font-bold", style: { color: _accent } }, d._mbRemaining.length + ' left in bag')

              ),

              React.createElement("div", { className: "text-center" },

                React.createElement("p", { className: "text-3xl font-black text-violet-700 mb-1" }, d.lastResult != null ? String(d.lastResult) : '?'),

                React.createElement("p", { className: "text-xs text-slate-600" }, d.lastResult != null ? 'Last result' : 'Click to start!')

              )

            ),

            // ── Two-Event Tree Diagram ──
            d.mode === 'tree' && (function() {
              var _treeMode = d.treeEventMode || 'coin';
              var _treeModes = [['coin','\uD83E\uDE99 Coin'],['dice','\uD83C\uDFB2 Dice (1-6)'],['sports','\uD83C\uDFC6 Sports'],['custom','\u2699\uFE0F Custom']];
              var _treeOutcomes;
              if (_treeMode === 'coin') { _treeOutcomes = [{label:'H',prob:0.5,color:'#fbbf24'},{label:'T',prob:0.5,color:'#94a3b8'}]; }
              else if (_treeMode === 'dice') { _treeOutcomes = [1,2,3,4,5,6].map(function(n,i){ return {label:String(n),prob:1/6,color:['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6'][i]}; }); }
              else if (_treeMode === 'sports') { _treeOutcomes = activeSport.outcomes.map(function(o,i){ return {label:o,prob:activeSport.probs[i],color:activeSport.colors[i]}; }); }
              else { _treeOutcomes = customOutcomes.slice(0, 4).map(function(o){ return {label:o.label,prob:o.prob,color:o.color}; }); }
              var _showFull = _treeOutcomes.length <= 3;
              var _pairs = [];
              _treeOutcomes.forEach(function(a){ _treeOutcomes.forEach(function(b){ _pairs.push({a:a,b:b,joint:a.prob*b.prob}); }); });
              return React.createElement("div", { className: "mb-4 rounded-xl p-4", style: { background: isDark || isContrast ? 'rgba(139,92,246,0.06)' : '#faf5ff', border: '1px solid ' + (isDark || isContrast ? 'rgba(139,92,246,0.25)' : '#ddd6fe') } },
                React.createElement("p", { className: "text-xs font-bold uppercase tracking-wider mb-3", style: { color: isDark || isContrast ? '#c4b5fd' : '#7c3aed' } }, '\uD83C\uDF33 Two-Event Compound Probability Tree'),
                React.createElement("div", { className: "flex flex-wrap gap-1 mb-3" },
                  _treeModes.map(function(pair){ return React.createElement("button", { "aria-label": "Change tree event mode", key: pair[0], onClick: function(){ upd('treeEventMode', pair[0]); }, className: "px-3 py-1 rounded-lg text-xs font-bold transition-all", style: { background: _treeMode===pair[0] ? (isDark||isContrast?'#7c3aed':'#8b5cf6') : (isDark||isContrast?'rgba(139,92,246,0.1)':'#ede9fe'), color: _treeMode===pair[0] ? '#fff' : (isDark||isContrast?'#c4b5fd':'#6d28d9') } }, pair[1]); })
                ),
                _treeMode === 'sports' && React.createElement("p", { className: "text-[11px] italic mb-2", style: { color: isDark||isContrast?'#a5b4fc':'#6d28d9' } }, '\uD83C\uDFC6 Using: ' + activeSport.label + ' \u2014 ' + activeSport.desc),
                React.createElement("div", { className: "overflow-x-auto" },
                  React.createElement("div", { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' } },
                    _treeOutcomes.map(function(a) {
                      return React.createElement("div", { key: a.label, style: { display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' } },
                        React.createElement("div", { style: { background: a.color, color: '#fff', borderRadius: '8px', padding: '6px 10px', fontSize: '11px', fontWeight: 700, textAlign: 'center', minWidth: '60px', boxShadow: '0 2px 6px ' + a.color + '60' } },
                          a.label + '\n' + (a.prob*100).toFixed(1) + '%'
                        ),
                        React.createElement("div", { style: { display: 'flex', gap: '3px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '280px' } },
                          _treeOutcomes.map(function(b) {
                            var joint = a.prob * b.prob;
                            return React.createElement("div", { key: b.label, style: { background: isDark||isContrast?'rgba(255,255,255,0.05)':'#fff', border: '2px solid ' + b.color, borderRadius: '6px', padding: '4px 6px', fontSize: '10px', fontWeight: 700, textAlign: 'center', minWidth: '52px' } },
                              React.createElement("span", { style: { color: b.color } }, b.label),
                              React.createElement("br"),
                              React.createElement("span", { style: { color: isDark||isContrast?'#e2e8f0':'#1e293b', fontFamily: 'monospace' } }, (joint*100).toFixed(1) + '%')
                            );
                          })
                        )
                      );
                    })
                  )
                ),
                React.createElement("div", { className: "mt-3 p-3 rounded-lg", style: { background: isDark||isContrast?'rgba(255,255,255,0.04)':'rgba(139,92,246,0.04)', border: '1px solid ' + (isDark||isContrast?'rgba(139,92,246,0.15)':'#ddd6fe') } },
                  React.createElement("p", { className: "text-[11px] font-bold mb-2", style: { color: isDark||isContrast?'#c4b5fd':'#7c3aed' } }, '\uD83D\uDCCA All ' + _pairs.length + ' joint outcomes:'),
                  React.createElement("div", { style: { display: 'flex', flexWrap: 'wrap', gap: '4px' } },
                    _pairs.sort(function(a,b){ return b.joint-a.joint; }).map(function(p,i) {
                      return React.createElement("span", { key: i, style: { background: isDark||isContrast?'rgba(139,92,246,0.12)':'rgba(139,92,246,0.06)', border: '1px solid ' + (isDark||isContrast?'rgba(139,92,246,0.2)':'#ddd6fe'), borderRadius: '6px', padding: '2px 6px', fontSize: '10px', fontFamily: 'monospace', color: isDark||isContrast?'#e2e8f0':'#374151' } },
                        'P(' + p.a.label + '\u2229' + p.b.label + ')=' + (p.joint*100).toFixed(1) + '%'
                      );
                    })
                  ),
                  React.createElement("p", { className: "text-[11px] mt-2 italic", style: { color: isDark||isContrast?'#94a3b8':'#94a3b8' } },
                    '\uD83D\uDCA1 Multiply the two probabilities to get the joint probability. These events are independent, so P(A\u2229B) = P(A) \u00D7 P(B).'
                  )
                )
              );
            })(),

            // ── Auto-Run Controls ──
            d.mode !== 'tree' && d.mode !== 'birthday' && React.createElement("div", { className: "flex flex-wrap gap-2 mb-3 justify-center items-center" },

              React.createElement("button", { "aria-label": "Toggle auto-run simulation",

                onClick: function() {

                  if (_autoRun.interval) {

                    clearInterval(_autoRun.interval);

                    _autoRun.interval = null;

                    upd('_autoRunning', false);

                  } else {

                    upd('_autoRunning', true);

                    _autoRun.interval = setInterval(runTrialAuto, d._autoSpeed || 250);

                  }

                },

                className: "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",

                style: { background: d._autoRunning ? '#ef4444' : _btnBg, color: '#fff', boxShadow: d._autoRunning ? '0 0 10px rgba(239,68,68,0.35)' : 'none' }

              }, d._autoRunning ? '⏹ Stop' : '▶ Auto-Run'),

              [['Slow', 600], ['Normal', 250], ['Fast', 80], ['Turbo', 20]].map(function(pair) {

                return React.createElement("button", { "aria-label": "Set simulation speed to " + pair[0], key: pair[0], onClick: function() {

                  upd('_autoSpeed', pair[1]);

                  if (_autoRun.interval) {

                    clearInterval(_autoRun.interval);

                    _autoRun.interval = setInterval(runTrialAuto, pair[1]);

                  }

                }, className: "px-2.5 py-1 rounded text-[11px] font-bold transition-all", style: { background: (d._autoSpeed||250) === pair[1] ? _btnBg : (isDark||isContrast?'rgba(139,92,246,0.1)':'#f1f5f9'), color: (d._autoSpeed||250) === pair[1] ? '#fff' : _muted } }, pair[0]);

              }),

              d._autoRunning && React.createElement("span", { className: "text-[11px] font-mono font-bold animate-pulse", style:{color:'#22c55e'} }, '● Running — ' + d.trials + ' trials')

            ),

            // Trial buttons (hidden in tree mode)

            d.mode !== 'tree' && d.mode !== 'birthday' && React.createElement("div", { className: "flex gap-2 mb-4 justify-center flex-wrap" },

              [1, 10, 50, 100, 500].map(n => React.createElement("button", { "aria-label": "Run " + n + " trials", key: n, onClick: () => runTrial(n), className: "px-4 py-2 bg-violet-100 text-violet-700 font-bold rounded-lg hover:bg-violet-200 transition-colors text-sm" }, "+" + n)),

              React.createElement("button", { "aria-label": "Reset all trials", onClick: () => { upd('results', []); upd('trials', 0); upd('convergenceHistory', []); upd('lastResult', null); }, className: "px-4 py-2 bg-red-50 text-red-500 font-bold rounded-lg hover:bg-red-100 text-sm" }, "\uD83D\uDD04 Reset")

            ),

            // Frequency bars

            d.trials > 0 && React.createElement("div", { className: "rounded-xl p-4 mb-3", style: { background: _cardBg, border: '1px solid ' + _border } },

              React.createElement("p", { className: "text-[11px] font-bold uppercase tracking-wider mb-2", style: { color: _accent } }, "\uD83D\uDCCA Observed vs Expected Frequencies"),

              React.createElement("div", { className: "space-y-2" },

                Object.keys(expected).map(k => {

                  const count = counts[k] || 0;

                  const pct = d.trials > 0 ? (count / d.trials * 100) : 0;

                  const expPct = expected[k] * 100;

                  return React.createElement("div", { key: k, className: "flex items-center gap-2" },

                    React.createElement("span", { className: "w-14 text-right text-sm font-bold", style: { color: barColors[k] || '#6366f1' } },

                      d.mode === 'coin' ? (k === 'H' ? '\uD83E\uDE99 H' : '\uD83E\uDE99 T') :

                        d.mode === 'dice' ? '\u2680 ' + k :

                          d.mode === 'sports' ? (activeSport.emoji[activeSport.outcomes.indexOf(k)] || '') + ' ' + k :

                            '\u25CF ' + k

                    ),

                    React.createElement("div", { className: "flex-1 bg-slate-100 rounded-full h-7 overflow-hidden relative" },

                      React.createElement("div", { style: { width: (count / maxCount * 100) + '%', backgroundColor: barColors[k] || '#6366f1', height: '100%', borderRadius: '9999px', transition: 'width 0.3s' } }),

                      React.createElement("div", { style: { position: 'absolute', left: Math.min(expPct / (expected[k] > 0 ? expected[k] : 0.01) / Object.keys(expected).length, 100) + '%', top: 0, bottom: 0, width: '2px', backgroundColor: '#1e293b80' }, title: 'Expected: ' + expPct.toFixed(1) + '%' })

                    ),

                    React.createElement("span", { className: "w-24 text-xs font-mono text-slate-600 text-right" }, count + " (" + pct.toFixed(1) + "%)"),

                    React.createElement("span", { className: "w-16 text-[11px] font-bold " + (Math.abs(pct - expPct) < 3 ? 'text-emerald-500' : Math.abs(pct - expPct) < 8 ? 'text-amber-500' : 'text-red-500') }, (pct > expPct ? '+' : '') + (pct - expPct).toFixed(1) + '%')

                  );

                })

              )

            ),

            // Convergence chart

            convHist.length > 1 && React.createElement("div", { className: "rounded-xl p-3 mb-3", style: { background: _cardBg, border: '1px solid ' + _border } },

              React.createElement("p", { className: "text-[11px] font-bold uppercase tracking-wider mb-2", style: { color: _accent } },

                "\uD83D\uDCC8 Convergence to Expected (" + (d.mode === 'coin' ? 'P(H)=50%' : d.mode === 'dice' ? 'P(1)=16.7%' : d.mode === 'sports' ? 'P(' + activeSport.outcomes[0] + ')=' + (activeSport.probs[0] * 100).toFixed(0) + '%' : (d.mode === 'custom' || d.mode === 'marbleBag') && customOutcomes[0] ? 'P(' + customOutcomes[0].label + ')=' + (customOutcomes[0].prob * 100).toFixed(0) + '%' : 'P(Red)=25%') + ")"

              ),

              React.createElement("svg", { viewBox: "0 0 400 100", className: "w-full", style: { maxHeight: '120px' } },

                React.createElement("line", { x1: 0, y1: 100 - convExpected, x2: 400, y2: 100 - convExpected, stroke: "#22c55e", strokeWidth: 1, strokeDasharray: "4 2" }),

                React.createElement("text", { x: 2, y: 100 - convExpected - 3, fill: "#22c55e", style: { fontSize: '7px', fontWeight: 'bold' } }, convExpected.toFixed(0) + '% expected'),

                React.createElement("polyline", {

                  fill: "none", stroke: "#8b5cf6", strokeWidth: 2,

                  points: convHist.map(function (h, i) {

                    var x = (i / Math.max(convHist.length - 1, 1)) * 400;

                    var y = 100 - Math.min(h.pct, 100);

                    return x + ',' + y;

                  }).join(' ')

                }),

                convHist.slice(-5).map(function (h, i) {

                  var idx = convHist.length - 5 + i;

                  if (idx < 0) return null;

                  var x = (idx / Math.max(convHist.length - 1, 1)) * 400;

                  var y = 100 - Math.min(h.pct, 100);

                  return React.createElement("circle", { key: i, cx: x, cy: y, r: 2.5, fill: "#8b5cf6" });

                }),

                React.createElement("line", { x1: 0, y1: 100, x2: 400, y2: 100, stroke: "#e2e8f0", strokeWidth: 1 }),

                React.createElement("text", { x: 380, y: 97, fill: "#94a3b8", style: { fontSize: '7px' }, textAnchor: "end" }, d.trials + ' trials')

              )

            ),

            // Statistical analysis

            d.trials >= 10 && d.mode !== 'birthday' && React.createElement("div", { className: "rounded-xl p-3 mb-3", style: { background: _statBg, border: '1px solid ' + _border } },

              React.createElement("p", { className: "text-[11px] font-bold uppercase tracking-wider mb-2", style: { color: _accent } }, "\uD83D\uDCCA Statistical Analysis"),

              React.createElement("div", { className: "grid grid-cols-4 gap-2 text-center" },

                React.createElement("div", { className: "p-1.5 bg-white rounded-lg border" },

                  React.createElement("p", { className: "text-[11px] font-bold text-violet-500" }, "Total Trials"),

                  React.createElement("p", { className: "text-lg font-black text-violet-800" }, d.trials)

                ),

                React.createElement("div", { className: "p-1.5 bg-white rounded-lg border" },

                  React.createElement("p", { className: "text-[11px] font-bold text-violet-500" }, "Max Deviation"),

                  React.createElement("p", { className: "text-lg font-black text-violet-800" }, (function () {

                    var maxDev = 0;

                    Object.keys(expected).forEach(function (k) {

                      var observed = (counts[k] || 0) / d.trials;

                      var dev = Math.abs(observed - expected[k]);

                      if (dev > maxDev) maxDev = dev;

                    });

                    return (maxDev * 100).toFixed(1) + '%';

                  })())

                ),

                React.createElement("div", { className: "p-1.5 bg-white rounded-lg border" },

                  React.createElement("p", { className: "text-[11px] font-bold text-violet-500" }, "\u03C7\u00B2 Statistic"),

                  React.createElement("p", { className: "text-lg font-black " + (chiPass ? 'text-emerald-600' : 'text-red-600') }, chiSq.toFixed(2))

                ),

                React.createElement("div", { className: "p-1.5 bg-white rounded-lg border" },

                  React.createElement("p", { className: "text-[11px] font-bold text-violet-500" }, "Fairness (\u03B1=0.05)"),

                  React.createElement("p", { className: "text-lg font-black " + (chiPass ? 'text-emerald-600' : 'text-red-600') }, chiPass ? '\u2705 Fair' : '\u274C Biased')

                )

              ),

              React.createElement("p", { className: "mt-2 text-xs italic", style: { color: isDark || isContrast ? '#a5b4fc' : '#6d28d9' } },

                d.trials < 30 ? '\uD83D\uDCA1 Need more trials! With only ' + d.trials + ' trials, randomness dominates. Try 100+ for reliable patterns.'

                  : d.trials < 100 ? '\uD83D\uDCA1 Getting better! At ' + d.trials + ' trials, patterns are emerging. Watch the convergence chart.'

                    : '\uD83D\uDCA1 Great sample size! At ' + d.trials + ' trials, the Law of Large Numbers is clearly visible. \u03C7\u00B2(' + df + ')=' + chiSq.toFixed(2) + ' vs critical ' + chiCritical.toFixed(2) + ' \u2192 ' + (chiPass ? 'fail to reject H\u2080 (fair)' : 'reject H\u2080 (potentially biased)')

              )

            ),

            // â”€â”€ Did You Know? â€” Pedagogical Insights â”€â”€

            d.trials >= 10 && d.mode !== 'birthday' && React.createElement("div", { className: "rounded-xl p-3 mb-3", style: { background: isDark || isContrast ? 'rgba(251,191,36,0.06)' : '#fffbeb', border: '1px solid ' + (isDark || isContrast ? 'rgba(251,191,36,0.2)' : '#fde68a') } },

              React.createElement("p", { className: "text-xs font-bold mb-1", style: { color: isDark || isContrast ? '#fbbf24' : '#b45309' } }, "\uD83D\uDCA1 Did You Know?"),

              React.createElement("p", { className: "text-xs leading-relaxed", style: { color: isDark || isContrast ? '#fde68a' : '#92400e' } },

                d.trials < 30 ? 'The Law of Large Numbers says observed frequencies get closer to expected probabilities as you run more trials. Try 100+ to see it in action!'

                  : d.trials < 100 ? 'Jakob Bernoulli proved the Law of Large Numbers in 1713. He showed that with enough coin flips, the proportion of heads will always converge to 50%. You\'re seeing this happen right now!'

                    : d.trials < 200 ? 'The Gambler\'s Fallacy is the mistaken belief that past results affect future outcomes. Each ' + (d.mode === 'coin' ? 'coin flip' : d.mode === 'dice' ? 'dice roll' : 'trial') + ' is independent \u2014 the coin has no memory! Just because you got 5 heads in a row doesn\'t make tails more likely next.'

                      : d.trials < 500 ? 'At ' + d.trials + ' trials, you\'re witnessing the Central Limit Theorem in action! The sampling distribution of the mean approaches a normal (bell) curve shape, regardless of the underlying distribution. This is why statisticians love large samples.'

                        : 'With ' + d.trials + '+ trials, you can calculate confidence intervals! The 95% confidence interval for the true probability is approximately observed% \u00B1 ' + (1.96 * Math.sqrt(0.25 / d.trials) * 100).toFixed(1) + '%. This is how pollsters predict elections and scientists validate hypotheses.'

              )

            ),

            // â”€â”€ Marble Bag: Theoretical vs Observed Comparison Histogram â”€â”€

            d.mode === 'marbleBag' && d.trials >= 5 && React.createElement("div", { className: "rounded-xl p-4 mb-3", style: { background: _cardBg, border: '1px solid ' + _border } },

              React.createElement("p", { className: "text-[11px] font-bold uppercase tracking-wider mb-3", style: { color: _accent } }, "\uD83D\uDCCA Theoretical vs Observed Comparison"),

              React.createElement("div", { className: "flex gap-3" },

                // Theoretical column

                React.createElement("div", { className: "flex-1" },

                  React.createElement("p", { className: "text-[11px] font-bold text-center mb-2", style: { color: isDark || isContrast ? '#a5b4fc' : '#6d28d9' } }, "\uD83C\uDFAF Theoretical"),

                  React.createElement("div", { className: "space-y-1.5" },

                    Object.keys(expected).map(function (k) {

                      var expPct = expected[k] * 100;

                      return React.createElement("div", { key: 'theo-' + k, className: "flex items-center gap-1" },

                        React.createElement("div", { style: { width: 10, height: 10, borderRadius: '50%', background: barColors[k] || '#8b5cf6', flexShrink: 0 } }),

                        React.createElement("span", { className: "text-[11px] font-bold w-12 truncate", style: { color: _text } }, k),

                        React.createElement("div", { className: "flex-1 rounded-full overflow-hidden", style: { height: '10px', background: isDark || isContrast ? 'rgba(255,255,255,0.08)' : '#f1f5f9' } },

                          React.createElement("div", { style: { width: expPct + '%', height: '100%', background: (barColors[k] || '#8b5cf6') + '60', borderRadius: '9999px' } })

                        ),

                        React.createElement("span", { className: "text-[11px] font-mono w-10 text-right", style: { color: _muted } }, expPct.toFixed(1) + '%')

                      );

                    })

                  )

                ),

                // Divider

                React.createElement("div", { style: { width: '1px', background: isDark || isContrast ? 'rgba(139,92,246,0.2)' : '#e2e8f0', margin: '0 4px' } }),

                // Observed column

                React.createElement("div", { className: "flex-1" },

                  React.createElement("p", { className: "text-[11px] font-bold text-center mb-2", style: { color: isDark || isContrast ? '#86efac' : '#16a34a' } }, "\uD83D\uDD2C Observed (" + d.trials + " draws)"),

                  React.createElement("div", { className: "space-y-1.5" },

                    Object.keys(expected).map(function (k) {

                      var obsPct = d.trials > 0 ? ((counts[k] || 0) / d.trials * 100) : 0;

                      var expPct2 = expected[k] * 100;

                      var diff = obsPct - expPct2;

                      return React.createElement("div", { key: 'obs-' + k, className: "flex items-center gap-1" },

                        React.createElement("div", { style: { width: 10, height: 10, borderRadius: '50%', background: barColors[k] || '#8b5cf6', flexShrink: 0 } }),

                        React.createElement("span", { className: "text-[11px] font-bold w-12 truncate", style: { color: _text } }, k),

                        React.createElement("div", { className: "flex-1 rounded-full overflow-hidden", style: { height: '10px', background: isDark || isContrast ? 'rgba(255,255,255,0.08)' : '#f1f5f9' } },

                          React.createElement("div", { style: { width: Math.min(obsPct, 100) + '%', height: '100%', background: barColors[k] || '#8b5cf6', borderRadius: '9999px', transition: 'width 0.3s' } })

                        ),

                        React.createElement("span", { className: "text-[11px] font-mono w-10 text-right font-bold", style: { color: Math.abs(diff) < 3 ? (isDark || isContrast ? '#86efac' : '#16a34a') : Math.abs(diff) < 8 ? '#f59e0b' : '#ef4444' } }, obsPct.toFixed(1) + '%')

                      );

                    })

                  )

                )

              ),

              d.trials >= 20 && React.createElement("p", { className: "text-[11px] mt-2 italic text-center", style: { color: _muted } },

                '\uD83D\uDCA1 As you run more trials, the observed bars should get closer to the theoretical bars \u2014 that\'s the Law of Large Numbers in action!'

              )

            ),

            // ── Monte Carlo Pi Scatter ──
            d.mode === 'pi' && d.trials > 0 && (function() {

              var _piPtsV = d._piPoints || [];

              var _piInV = _piPtsV.filter(function(p) { return p.inside; }).length;

              var _piTotV = _piPtsV.length;

              var _piEstV = _piTotV > 0 ? (4 * _piInV / _piTotV) : 0;

              var _piErrV = Math.abs(_piEstV - Math.PI);

              var _piErrCol = _piErrV < 0.02 ? '#16a34a' : _piErrV < 0.1 ? '#f59e0b' : '#ef4444';

              return React.createElement("div", { className: "rounded-xl p-3 mb-3", style: { background: _cardBg, border: '1px solid ' + _border } },

                React.createElement("p", { className: "text-[11px] font-bold uppercase tracking-wider mb-2", style:{color:_accent} }, '🥧 Monte Carlo π Scatter Plot'),

                React.createElement("div", { className: "flex gap-3 items-start flex-wrap" },

                  React.createElement("svg", { viewBox: "0 0 200 200", width: 180, height: 180, style: { border: '1px solid '+_border, borderRadius: 8, flexShrink: 0, background: isDark||isContrast?'#1e1b4b':'#f8fafc' } },

                    React.createElement("path", { d:"M 0 200 A 200 200 0 0 1 200 0", fill: isDark||isContrast?'rgba(34,197,94,0.12)':'rgba(34,197,94,0.08)', stroke:'#22c55e', strokeWidth:1.5, strokeDasharray:'5 3' }),

                    _piPtsV.slice(-400).map(function(pt, pidx) {

                      return React.createElement("circle", { key: pidx, cx: pt.x*200, cy: (1-pt.y)*200, r: _piTotV>300?1.5:2.5, fill: pt.inside?'#22c55e':'#ef4444', opacity: 0.7 });

                    }),

                    React.createElement("text", { x:4, y:12, style:{fontSize:'7px'}, fill:'#94a3b8' }, '(0,1)'),

                    React.createElement("text", { x:4, y:197, style:{fontSize:'7px'}, fill:'#94a3b8' }, '(0,0)'),

                    React.createElement("text", { x:155, y:197, style:{fontSize:'7px'}, fill:'#94a3b8' }, '(1,0)')

                  ),

                  React.createElement("div", { className: "flex flex-col gap-2 flex-1 min-w-28" },

                    React.createElement("div", { className: "text-center p-2 rounded-lg", style:{background:isDark||isContrast?'rgba(139,92,246,0.1)':'rgba(139,92,246,0.06)',border:'1px solid '+_border} },

                      React.createElement("p", { className:"text-[11px] font-bold", style:{color:_accent} }, 'π Estimate'),

                      React.createElement("p", { className:"text-2xl font-black font-mono", style:{color:_piErrCol} }, _piEstV.toFixed(4)),

                      React.createElement("p", { className:"text-[11px]", style:{color:_muted} }, 'True π = 3.14159…')

                    ),

                    React.createElement("div", { className:"grid grid-cols-2 gap-1 text-center text-[11px]" },

                      React.createElement("div", { className:"p-1 rounded", style:{background:'#22c55e20'} },

                        React.createElement("p", { className:"font-bold text-emerald-600" }, '🟢 Inside'),

                        React.createElement("p", { className:"font-mono font-bold text-emerald-700" }, _piInV)

                      ),

                      React.createElement("div", { className:"p-1 rounded", style:{background:'#ef444420'} },

                        React.createElement("p", { className:"font-bold text-red-500" }, '🔴 Outside'),

                        React.createElement("p", { className:"font-mono font-bold text-red-600" }, _piTotV - _piInV)

                      )

                    ),

                    React.createElement("div", { className:"p-1.5 rounded-lg text-center", style:{background:isDark||isContrast?'rgba(139,92,246,0.06)':'#faf5ff'} },

                      React.createElement("p", { className:"text-[11px] font-bold", style:{color:_accent} }, 'Error from π'),

                      React.createElement("p", { className:"text-base font-black font-mono", style:{color:_piErrCol} }, '±' + _piErrV.toFixed(5)),

                      React.createElement("p", { className:"text-[11px] italic mt-0.5", style:{color:_muted} }, '4 × ' + _piInV + ' / ' + _piTotV)

                    ),

                    React.createElement("p", { className:"text-[11px] italic leading-relaxed text-center", style:{color:_muted} }, '~10k points needed for 2 decimal places of π')

                  )

                )

              );

            })(),

            // Last 10 results

            d.trials > 0 && React.createElement("div", { className: "text-center" },

              d.mode === 'marbleBag' && React.createElement("div", { className: "mb-3 bg-white rounded-lg p-3 border shadow-sm mx-auto", style: { maxWidth: 500 } },

                React.createElement("p", { className: "text-[11px] font-bold uppercase tracking-wider mb-2", style: { color: _accent } }, "\uD83C\uDFB1 Draw History Breakdown"),

                React.createElement("div", { className: "flex flex-wrap gap-2 justify-center" },

                  Object.keys(expected).map(function (k) {

                    var count = counts[k] || 0;

                    var pct = d.trials > 0 ? (count / d.trials * 100) : 0;

                    return React.createElement("div", { key: k, className: "flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-md border" },

                      React.createElement("div", { style: { width: 8, height: 8, borderRadius: '50%', background: barColors[k] || '#8b5cf6' } }),

                      React.createElement("span", { className: "text-[11px] font-bold text-slate-700" }, k + ":"),

                      React.createElement("span", { className: "text-[11px] font-mono text-slate-900" }, count),

                      React.createElement("span", { className: "text-[11px] text-slate-600" }, "(" + pct.toFixed(1) + "%)")

                    );

                  })

                )

              ),

              React.createElement("div", { className: "mt-2" },

                React.createElement("p", { className: "text-[11px] font-bold uppercase tracking-wider mb-1.5 text-center", style:{color:_accent} }, 'Last 30 Results'),

                React.createElement("div", { className: "flex flex-wrap gap-0.5 justify-center" },

                  d.results.slice(-30).map(function(r, ri) {

                    var _rc = barColors[r] || '#94a3b8';

                    var _isLast = ri === Math.min(d.results.length, 30) - 1;

                    return React.createElement("div", { key: ri, title: String(r), style: { width: 18, height: 18, borderRadius: 4, background: _rc, border: _isLast ? '2px solid rgba(255,255,255,0.7)' : '1px solid rgba(0,0,0,0.1)', boxShadow: _isLast ? '0 0 6px ' + _rc + '90' : 'none', opacity: 0.55 + 0.45 * (ri / Math.min(d.results.length, 30)) } });

                  })

                ),

                d.results.length > 30 && React.createElement("p", { className:"text-[11px] text-center mt-1", style:{color:_muted} }, '(showing last 30 of ' + d.results.length + ')')

              )

            ),

            // ── Challenge Mode ──
            (function() {

              var _cc = d._completedChallenges || [];

              var _maxDevC = (function() {

                var mx = 0;

                Object.keys(expected).forEach(function(k) { var dv = Math.abs(((counts[k]||0)/Math.max(d.trials,1))-(expected[k]||0)); if(dv>mx)mx=dv; });

                return mx;

              })();

              var _piPtsC = d._piPoints || [];

              var _piErrC = _piPtsC.length >= 1000 ? Math.abs(4*_piPtsC.filter(function(p){return p.inside;}).length/_piPtsC.length - Math.PI) : 999;

              var _chals = [

                { id:'streak5', icon:'🔥', name:'Streak Surge', desc:'Get 5+ results in a row (any mode)', xp:25, check:function(){return (d._bestStreak||0)>=5;} },

                { id:'diceBalance', icon:'⚖️', name:'Balance Master', desc:'60+ dice rolls, all within 10% of expected', xp:50, check:function(){return d.mode==='dice'&&d.trials>=60&&_maxDevC<=0.10;} },

                { id:'law1000', icon:'📈', name:'Law Witness', desc:'1000 coin trials with max deviation < 3%', xp:100, check:function(){return d.mode==='coin'&&d.trials>=1000&&_maxDevC<0.03;} },

                { id:'piHunter', icon:'🥧', name:'Pi Hunter', desc:'1000+ Monte Carlo Pi trials, error < 0.05', xp:75, check:function(){return d.mode==='pi'&&_piPtsC.length>=1000&&_piErrC<0.05;} },

                { id:'birthday23', icon:'🎂', name:'Birthday Breaker', desc:'Set n=23 in Birthday mode to see the paradox', xp:30, check:function(){return d.mode==='birthday'&&(d.birthdayN||23)===23;} }

              ];

              return React.createElement("div", { className:"mt-3 mb-3 rounded-xl p-3", style:{background:isDark||isContrast?'rgba(139,92,246,0.06)':'#faf5ff',border:'1px solid '+(isDark||isContrast?'rgba(139,92,246,0.2)':'#ddd6fe')} },

                React.createElement("p", { className:"text-[11px] font-bold uppercase tracking-wider mb-2", style:{color:_accent} }, '🏆 Challenges'),

                React.createElement("div", { className:"space-y-1.5" },

                  _chals.map(function(ch) {

                    var _done = _cc.indexOf(ch.id) >= 0;

                    var _ok = !_done && ch.check();

                    return React.createElement("div", { key:ch.id, className:"flex items-center gap-2 p-2 rounded-lg", style:{background:_done?(isDark||isContrast?'rgba(34,197,94,0.08)':'rgba(34,197,94,0.06)'):(isDark||isContrast?'rgba(255,255,255,0.03)':'#fff'),border:'1px solid '+(_done?(isDark||isContrast?'rgba(34,197,94,0.2)':'#bbf7d0'):(isDark||isContrast?'rgba(139,92,246,0.1)':'#e9d5ff')),opacity:_done?0.7:1} },

                      React.createElement("span", { style:{fontSize:16,lineHeight:1,flexShrink:0} }, ch.icon),

                      React.createElement("div", { className:"flex-1 min-w-0" },

                        React.createElement("p", { className:"text-[11px] font-bold truncate", style:{color:_text} }, ch.name + ' — ' + ch.xp + ' XP'),

                        React.createElement("p", { className:"text-[11px] truncate", style:{color:_muted} }, ch.desc)

                      ),

                      _done ? React.createElement("span", { className:"text-[11px] font-bold text-emerald-500 flex-shrink-0" }, '✅ Done!')

                        : _ok ? React.createElement("button", { "aria-label": "Claim", onClick:function() {

                            if(_cc.indexOf(ch.id)>=0) return;

                            if(awardStemXP) awardStemXP('probability', ch.xp);

                            upd('_completedChallenges', _cc.concat([ch.id]));

                            if(stemCelebrate) stemCelebrate();

                            if(addToast) addToast('🎉 Challenge complete! +' + ch.xp + ' XP', 'success');

                          }, className:"px-2 py-0.5 rounded text-[11px] font-bold flex-shrink-0", style:{background:_btnBg,color:'#fff'} }, 'Claim ' + ch.xp + ' XP')

                        : React.createElement("span", { className:"text-[11px] flex-shrink-0", style:{color:_muted} }, '🔒 In progress')

                    );

                  })

                )

              );

            })(),

            React.createElement("button", { "aria-label": "Snapshot", onClick: () => { setToolSnapshots(prev => [...prev, { id: 'pr-' + Date.now(), tool: 'probability', label: d.mode + ' ' + d.trials + ' trials', data: Object.assign({}, d), timestamp: Date.now() }]); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "\uD83D\uDCF8 Snapshot"),

            // ── AI Explain Results + TTS Narrate ──
            React.createElement("div", { className: "mt-4 pt-4", style: { borderTop: '1px solid ' + (isDark||isContrast?'rgba(139,92,246,0.15)':'#ede9fe') } },
              React.createElement("div", { className: "flex gap-2 flex-wrap mb-2" },
                React.createElement("button", { "aria-label": "Explain results with AI",
                  disabled: !callGemini || (d.trials === 0 && d.mode !== 'tree') || d._aiLoading,
                  onClick: function() {
                    if (!callGemini) return;
                    upd('_aiLoading', true);
                    upd('_aiExplanation', null);
                    var summary;
                    if (d.mode === 'tree') {
                      var tm = d.treeEventMode || 'coin';
                      summary = 'Two-event compound probability tree for ' + tm + ' experiments. Joint probabilities shown for all outcome pairs.';
                    } else {
                      var topOutcome = Object.keys(counts).sort(function(a,b){ return (counts[b]||0)-(counts[a]||0); })[0];
                      var topPct = topOutcome && d.trials > 0 ? ((counts[topOutcome]||0)/d.trials*100).toFixed(1) : '0';
                      summary = 'Mode: ' + d.mode + '. Total trials: ' + d.trials + '. ' +
                        'Most frequent outcome: ' + (topOutcome||'none') + ' (' + topPct + '%). ' +
                        'Chi-square: ' + chiSq.toFixed(2) + ' (critical ' + chiCritical + '). ' +
                        'Fairness test: ' + (chiPass ? 'PASS (fair)' : 'FAIL (biased)') + '. ' +
                        'Max deviation from expected: ' + (function(){ var mx=0; Object.keys(expected).forEach(function(k){ var d2=Math.abs((counts[k]||0)/Math.max(d.trials,1)-expected[k]); if(d2>mx)mx=d2; }); return (mx*100).toFixed(1); })() + '%.';
                    }
                    callGemini(
                      'You are explaining probability to a ' + (gradeLevel||'5th Grade') + ' student. In 3 sentences max, explain what these results show and what concept they illustrate:\n\n' + summary + '\n\nBe concrete, friendly, and use the actual numbers.',
                      false, false, 0.4
                    ).then(function(resp){ upd('_aiExplanation', resp); upd('_aiLoading', false); })
                     .catch(function(){ upd('_aiLoading', false); addToast('AI explain failed', 'error'); });
                  },
                  className: "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  style: { background: isDark||isContrast?'rgba(139,92,246,0.15)':'#ede9fe', color: isDark||isContrast?'#c4b5fd':'#7c3aed', opacity: (!callGemini||(d.trials===0&&d.mode!=='tree')||d._aiLoading)?0.5:1, cursor: (!callGemini||(d.trials===0&&d.mode!=='tree')||d._aiLoading)?'not-allowed':'pointer' }
                }, d._aiLoading ? '\u23F3 Thinking...' : '\uD83E\uDD16 Explain My Results'),
                d.trials > 0 && callTTS && React.createElement("button", { "aria-label": "Narrate Results",
                  onClick: function() {
                    var topOutcome = Object.keys(counts).sort(function(a,b){ return (counts[b]||0)-(counts[a]||0); })[0];
                    var narration = 'Probability Lab results. Mode: ' + d.mode + '. ' + d.trials + ' trials run. ' +
                      'Most frequent: ' + (topOutcome||'unknown') + ' at ' + (topOutcome&&d.trials>0?((counts[topOutcome]||0)/d.trials*100).toFixed(0):'0') + ' percent. ' +
                      'Chi-square test: ' + (chiPass?'fair':'potentially biased') + '.';
                    callTTS(narration, null);
                  },
                  className: "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  style: { background: isDark||isContrast?'rgba(34,197,94,0.1)':'#f0fdf4', color: isDark||isContrast?'#86efac':'#16a34a' }
                }, '\uD83D\uDD0A Narrate Results')
              ),
              d._aiExplanation && React.createElement("div", { className: "rounded-xl p-3", style: { background: isDark||isContrast?'rgba(139,92,246,0.08)':'rgba(139,92,246,0.04)', border: '1px solid ' + (isDark||isContrast?'rgba(139,92,246,0.2)':'#ddd6fe') } },
                React.createElement("p", { className: "text-[11px] font-bold uppercase tracking-wider mb-1", style: { color: isDark||isContrast?'#c4b5fd':'#7c3aed' } }, '\uD83E\uDD16 AI Explanation (' + (gradeLevel||'5th Grade') + ')'),
                React.createElement("p", { className: "text-xs leading-relaxed", style: { color: isDark||isContrast?'#e2e8f0':'#374151' } }, d._aiExplanation)
              )
            )

          );
      })();
    }
  });

})();