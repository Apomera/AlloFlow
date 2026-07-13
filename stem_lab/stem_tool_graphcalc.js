// ═══════════════════════════════════════════════
// stem_tool_graphcalc.js — Graphing Calculator (ES5)
// Extracted from stem_tool_science.js monolith and enhanced with:
//   Sound effects, 12 badges, AI tutor, TTS, grade-band content,
//   snapshot support, challenge completion, canvas rendering
// ═══════════════════════════════════════════════

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

  // ── Accessibility live region (WCAG 4.1.3) ──
  (function() {
    if (document.getElementById('allo-live-graphcalc')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-graphcalc';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();

  // Local contrast tokens for the graphing calculator side panels.
  (function() {
    if (document.getElementById('allo-graphcalc-contrast-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-graphcalc-contrast-css';
    st.textContent = [
      '.graphcalc-shell{--gc-panel:var(--allo-stem-panel,#f8fafc);--gc-deeper:var(--allo-stem-deeper,#e2e8f0);--gc-card:#eef2ff;--gc-card-strong:#e0e7ff;--gc-text:var(--allo-stem-text,#0f172a);--gc-muted:#475569;--gc-border:var(--allo-stem-border,#cbd5e1);--gc-accent:#4338ca;--gc-accent-soft:#e0e7ff;--gc-accent-border:#818cf8;--gc-button-bg:#eef2ff;--gc-button-text:#3730a3;--gc-danger:#b91c1c;}',
      '.theme-dark .graphcalc-shell{--gc-card:rgba(99,102,241,.16);--gc-card-strong:rgba(99,102,241,.24);--gc-muted:#cbd5e1;--gc-accent:#c7d2fe;--gc-accent-soft:rgba(99,102,241,.22);--gc-accent-border:#818cf8;--gc-button-bg:rgba(99,102,241,.18);--gc-button-text:#c7d2fe;--gc-danger:#fca5a5;}',
      '.theme-contrast .graphcalc-shell{--gc-card:var(--allo-stem-panel,#fff);--gc-card-strong:var(--allo-stem-panel,#fff);--gc-muted:var(--allo-stem-text,#000);--gc-accent:var(--allo-stem-text,#000);--gc-accent-soft:var(--allo-stem-button-bg,#fff);--gc-accent-border:var(--allo-stem-border,#000);--gc-button-bg:var(--allo-stem-button-bg,#fff);--gc-button-text:var(--allo-stem-button-text,#000);--gc-danger:var(--allo-stem-text,#000);}'
    ].join('');
    document.head.appendChild(st);
  })();


  /* ── StemLab plugin guard ───────────────────────────────── */
  if (!window.StemLab) {
    window.StemLab = {
      tools: {},
      registerTool: function(id, def) { window.StemLab.tools[id] = def; }
    };
  }
  if (!window.StemLab.registerTool) {
    window.StemLab.registerTool = function(id, def) {
      window.StemLab.tools[id] = def;
    };
  }

  /* ═══════════════════════════════════════════════════════════
     Sound Engine (Web Audio API)
     ═══════════════════════════════════════════════════════════ */
  var _audioCtx = null;
  function getAudioCtx() {
    if (!_audioCtx) {
      try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { /* silent */ }
    }
    return _audioCtx;
  }

  function playTone(freq, dur, type, vol) {
    var ac = getAudioCtx();
    if (!ac) return;
    try {
      var osc = ac.createOscillator();
      var gain = ac.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol || 0.12, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      osc.connect(gain); gain.connect(ac.destination);
      osc.start(); osc.stop(ac.currentTime + dur);
    } catch (e) { /* silent */ }
  }

  var SOUNDS = {
    graphDraw: function() {
      playTone(440, 0.06, 'sine', 0.06);
      setTimeout(function() { playTone(554, 0.08, 'sine', 0.06); }, 50);
    },
    tierChange: function() {
      playTone(392, 0.1, 'triangle', 0.08);
      setTimeout(function() { playTone(523, 0.1, 'triangle', 0.08); }, 80);
    },
    zoomPreset: function() { playTone(523, 0.06, 'sine', 0.06); },
    analyzeComplete: function() {
      playTone(660, 0.08, 'sine', 0.08);
      setTimeout(function() { playTone(880, 0.1, 'sine', 0.10); }, 70);
    },
    challengeOpen: function() {
      playTone(494, 0.06, 'triangle', 0.06);
      setTimeout(function() { playTone(587, 0.06, 'triangle', 0.06); }, 50);
    },
    quizCorrect: function() {
      playTone(523, 0.1, 'sine', 0.1);
      setTimeout(function() { playTone(659, 0.1, 'sine', 0.1); }, 100);
      setTimeout(function() { playTone(784, 0.15, 'sine', 0.12); }, 200);
    },
    badge: function() {
      playTone(784, 0.1, 'sine', 0.1);
      setTimeout(function() { playTone(988, 0.1, 'sine', 0.12); }, 120);
      setTimeout(function() { playTone(1175, 0.2, 'sine', 0.14); }, 240);
      setTimeout(function() { playTone(1568, 0.3, 'sine', 0.1); }, 380);
    },
    snapshot: function() {
      playTone(1200, 0.06, 'square', 0.06);
      setTimeout(function() { playTone(1600, 0.08, 'sine', 0.08); }, 70);
    },
    aiTutor: function() {
      playTone(392, 0.12, 'sine', 0.08);
      setTimeout(function() { playTone(523, 0.12, 'sine', 0.1); }, 120);
    },
    tts: function() { playTone(330, 0.06, 'sine', 0.06); },
    clearAll: function() { playTone(220, 0.15, 'sawtooth', 0.06); },
    traceOn: function() {
      playTone(660, 0.04, 'sine', 0.05);
      setTimeout(function() { playTone(880, 0.06, 'sine', 0.05); }, 40);
    }
  };

  /* ═══════════════════════════════════════════════════════════
     Grade-Band Helper
     ═══════════════════════════════════════════════════════════ */
  function getGradeBand(ctx) {
    var g = ctx.gradeLevel || 5;
    if (g <= 2) return 'k2';
    if (g <= 5) return 'g35';
    if (g <= 8) return 'g68';
    return 'g912';
  }

  /* ═══════════════════════════════════════════════════════════
     Badge Definitions
     ═══════════════════════════════════════════════════════════ */
  var BADGES = [
    { id: 'firstGraph', icon: '\uD83D\uDCC8', label: 'First Graph', desc: 'Graph your first function', xp: 10,
      check: function(d) { return d._graphsDrawn >= 1; } },
    { id: 'fiveGraphs', icon: '\uD83C\uDFA8', label: 'Graph Artist', desc: 'Graph 5 different functions', xp: 15,
      check: function(d) { return d._graphsDrawn >= 5; } },
    { id: 'multiGraph', icon: '\uD83C\uDF08', label: 'Rainbow Grapher', desc: 'Graph 3+ functions at once', xp: 15,
      check: function(d) { return d._multiGraphCount >= 3; } },
    { id: 'analyzer', icon: '\u26A1', label: 'Analyzer', desc: 'Use the Analyze feature', xp: 10,
      check: function(d) { return d._analyzed; } },
    { id: 'zeroFinder', icon: '\uD83C\uDFAF', label: 'Zero Finder', desc: 'Find a zero (x-intercept)', xp: 15,
      check: function(d) { return d._foundZero; } },
    { id: 'intersector', icon: '\u2716', label: 'Intersector', desc: 'Find an intersection point', xp: 20,
      check: function(d) { return d._foundIntersection; } },
    { id: 'trigExplorer', icon: '\uD83C\uDF0A', label: 'Wave Rider', desc: 'Graph a trig function', xp: 15,
      check: function(d) { return d._usedTrig; } },
    { id: 'tableUser', icon: '\uD83D\uDCCA', label: 'Table Reader', desc: 'View the value table', xp: 10,
      check: function(d) { return d._usedTable; } },
    { id: 'challenger', icon: '\uD83C\uDFC6', label: 'Challenger', desc: 'Complete 3 challenges', xp: 25,
      check: function(d) { return (d._challengesCompleted || 0) >= 3; } },
    { id: 'sliderMaster', icon: '\uD83C\uDFA8', label: 'Slider Master', desc: 'Use parameter sliders', xp: 10,
      check: function(d) { return d._usedSliders; } },
    { id: 'derivCalc', icon: '\u2202', label: 'Calculus Start', desc: 'Calculate a derivative', xp: 15,
      check: function(d) { return d._usedDeriv; } },
    { id: 'aiCurious', icon: '\uD83E\uDD16', label: 'Curious Mind', desc: 'Ask the AI tutor 3 questions', xp: 15,
      check: function(d) { return (d.aiQuestions || 0) >= 3; } }
  ];

  /* ═══════════════════════════════════════════════════════════
     TTS Helper
     ═══════════════════════════════════════════════════════════ */
  function speakText(text, callTTS) {
    SOUNDS.tts();
    if (callTTS) { try { callTTS(text); return; } catch (e) {} }
    if (window._kokoroTTS && window._kokoroTTS.speak) {
      window._kokoroTTS.speak(String(text),'af_heart',1).then(function(url){if(url){var a=new Audio(url);a.playbackRate=0.95;a.play();}}).catch(function(){});
      return;
    }
    if (window.speechSynthesis) { var utter=new SpeechSynthesisUtterance(text); utter.rate=0.9; window.speechSynthesis.cancel(); window.speechSynthesis.speak(utter); }
  }

  /* ═══════════════════════════════════════════════════════════
     Register Tool
     ═══════════════════════════════════════════════════════════ */
  window.StemLab.registerTool('graphCalc', {
    icon: '\uD83D\uDCC8',
    label: 'graphCalc',
    desc: 'Graph functions, analyze zeros and intersections, explore transformations',
    color: 'indigo',
    category: 'math',
    questHooks: [
      { id: 'graph_3_functions', label: 'Graph 3 different functions', icon: '\uD83D\uDCC8', check: function(d) { return (d.funcs || []).filter(function(f) { return f && f.expr && String(f.expr).trim(); }).length >= 3; }, progress: function(d) { return (d.funcs || []).filter(function(f) { return f && f.expr && String(f.expr).trim(); }).length + '/3 functions'; } },
      { id: 'complete_3_challenges', label: 'Complete 3 graphing challenges', icon: '\uD83C\uDFC6', check: function(d) { return (d._challengesCompleted || 0) >= 3; }, progress: function(d) { return (d._challengesCompleted || 0) + '/3'; } },
      { id: 'ask_ai_3', label: 'Ask the AI tutor 3 questions', icon: '\uD83E\uDD16', check: function(d) { return (d.aiQuestions || 0) >= 3; }, progress: function(d) { return (d.aiQuestions || 0) + '/3 questions'; } }
    ],
    render: function(ctx) {
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var setToolSnapshots = ctx.setToolSnapshots;
      var addToast = ctx.addToast;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var X = ctx.icons.X;
      var awardStemXP = ctx.awardXP;
      var getStemXP = ctx.getXP;
      var stemCelebrate = ctx.celebrate;
      var callGemini = ctx.callGemini;
      var callTTS = ctx.callTTS;
      var gradeLevel = ctx.gradeLevel;
      var announceToSR = ctx.announceToSR;
      var a11yClick = ctx.a11yClick;
      var canvasNarrate = ctx.canvasNarrate;

      return (function() {
        var d = labToolData.graphCalc || {};

          // ── Canvas narration: init ──
          if (typeof canvasNarrate === 'function') {
            canvasNarrate('graphCalc', 'init', {
              first: 'Graphing Calculator loaded. Plot equations, find intersections, and explore mathematical relationships visually.',
              repeat: 'Graphing Calculator active.',
              terse: 'Graph Calc.'
            }, { debounce: 800 });
          }

        var upd = function(key, val) {
          setLabToolData(function(prev) {
            var next = Object.assign({}, prev);
            next.graphCalc = Object.assign({}, prev.graphCalc);
            next.graphCalc[key] = val;
            return next;
          });
        };

        var updMulti = function(obj) {
          setLabToolData(function(prev) {
            return Object.assign({}, prev, { graphCalc: Object.assign({}, prev.graphCalc, obj) });
          });
        };

        var band = getGradeBand(ctx);
        var gradeIntros = {
          k2: 'Type simple equations like y = 2x + 1 and watch the line appear!',
          g35: 'Explore linear functions! Change the slope and y-intercept to see the line move.',
          g68: 'Graph quadratics, find zeros, and discover how transformations change shapes.',
          g912: 'Analyze with derivatives, find intersections, use parameter sliders, explore trig and logs.'
        };

        /* ── State ── */
        var tier = d.tier || 'explorer';
        var funcs = d.funcs || [
          { expr: '', color: '#38bdf8' }, { expr: '', color: '#f472b6' },
          { expr: '', color: '#34d399' }, { expr: '', color: '#fbbf24' },
          { expr: '', color: '#a78bfa' }, { expr: '', color: '#fb923c' }
        ];
        var win = d.window || { xmin: -10, xmax: 10, ymin: -10, ymax: 10 };
        var showTable = d.showTable || false;
        var showWindow = d.showWindow || false;
        var showChallenge = d.showChallenge || false;
        var showMathPad = d.showMathPad || false;
        var showArith = d.showArith || false;
        var arithExpr = d.arithExpr || '';
        var arithResult = d.arithResult || '';
        var showSliders = d.showSliders || false;
        var focusedInput = d.focusedInput || 0;
        var tableX = d.tableX != null ? d.tableX : -5;
        var tableStep = d.tableStep || 1;
        var badges = d.badges || [];
        var aiMessages = d.aiMessages || [];
        var aiInput = d.aiInput || '';
        var aiLoading = d.aiLoading || false;

        /* ── Math Pad symbols ── */
        var MATH_SYMBOLS = [
          { label: 'x', insert: 'x', tier: 'explorer' },
          { label: '^', insert: '^', tier: 'explorer' },
          { label: __alloT('stem.graphcalc.str', '( )'), insert: '()', tier: 'explorer' },
          { label: '\u03C0', insert: 'pi', tier: 'explorer' },
          { label: '\u221A', insert: 'sqrt(', tier: 'explorer' },
          { label: '|x|', insert: 'abs(', tier: 'explorer' },
          { label: 'x\u00B2', insert: '^2', tier: 'analyst' },
          { label: 'x\u00B3', insert: '^3', tier: 'analyst' },
          { label: '\u00B1', insert: '-', tier: 'analyst' },
          { label: '1/x', insert: '1/', tier: 'analyst' },
          { label: 'sin', insert: 'sin(', tier: 'engineer' },
          { label: 'cos', insert: 'cos(', tier: 'engineer' },
          { label: 'tan', insert: 'tan(', tier: 'engineer' },
          { label: 'log', insert: 'log(', tier: 'engineer' },
          { label: 'ln', insert: 'ln(', tier: 'engineer' },
          { label: 'e', insert: 'e', tier: 'engineer' }
        ];

        var visibleSymbols = MATH_SYMBOLS.filter(function(s) {
          if (tier === 'researcher') return true;
          if (tier === 'engineer') return s.tier !== 'researcher';
          if (tier === 'analyst') return s.tier === 'explorer' || s.tier === 'analyst';
          return s.tier === 'explorer';
        });

        function insertSymbol(text) {
          var nf = funcs.slice();
          var idx = focusedInput;
          nf[idx] = Object.assign({}, nf[idx], { expr: (nf[idx].expr || '') + text });
          upd('funcs', nf);
        }

        /* ── Coach tips ── */
        var COACH_TIPS = {
          explorer: [
            { icon: '\uD83D\uDCA1', title: __alloT('stem.graphcalc.entering_functions', 'Entering Functions'), text: __alloT('stem.graphcalc.type_y_mx_b_where_m_is_the_slope_and_b', 'Type y = mx + b where m is the slope and b is the y-intercept. Try: 2x + 3') },
            { icon: '\uD83D\uDD0D', title: __alloT('stem.graphcalc.zoom_window', 'Zoom & Window'), text: __alloT('stem.graphcalc.use_zoom_presets_to_change_how_much_of', 'Use zoom presets to change how much of the graph you see.') },
            { icon: '\uD83D\uDCCA', title: __alloT('stem.graphcalc.reading_the_table', 'Reading the Table'), text: __alloT('stem.graphcalc.the_table_shows_exact_y_values_for_eac', 'The table shows exact y-values for each x.') },
            { icon: '\uD83C\uDFAF', title: __alloT('stem.graphcalc.multiple_functions', 'Multiple Functions'), text: __alloT('stem.graphcalc.enter_different_equations_to_compare_t', 'Enter different equations to compare them. Where lines cross is an intersection!') }
          ],
          analyst: [
            { icon: '\uD83D\uDCC8', title: __alloT('stem.graphcalc.linear_vs_quadratic', 'Linear vs Quadratic'), text: __alloT('stem.graphcalc.y_2x_1_is_a_line_y_x_2_is_a_parabola_t', 'y = 2x + 1 is a line. y = x^2 is a parabola. The exponent determines the shape!') },
            { icon: '\uD83E\uDDEE', title: __alloT('stem.graphcalc.finding_zeros', 'Finding Zeros'), text: __alloT('stem.graphcalc.where_the_graph_crosses_the_x_axis_y_0', 'Where the graph crosses the x-axis, y = 0. These are zeros or x-intercepts.') },
            { icon: '\u26A1', title: __alloT('stem.graphcalc.transformations', 'Transformations'), text: __alloT('stem.graphcalc.y_x_3_2_shifts_right_by_3_y_x_2_5_shif', 'y = (x-3)^2 shifts right by 3. y = x^2 + 5 shifts up by 5.') }
          ],
          engineer: [
            { icon: '\uD83E\uDDE9', title: __alloT('stem.graphcalc.trig_functions', 'Trig Functions'), text: __alloT('stem.graphcalc.sin_x_cos_x_tan_x_create_waves_period_', 'sin(x), cos(x), tan(x) create waves. Period of sin(x) is 2\u03C0.') },
            { icon: '\uD83D\uDD22', title: __alloT('stem.graphcalc.logarithms', 'Logarithms'), text: __alloT('stem.graphcalc.log_x_is_the_inverse_of_10_x_ln_x_is_t', 'log(x) is the inverse of 10^x. ln(x) is the natural log.') },
            { icon: '\u221E', title: __alloT('stem.graphcalc.asymptotes', 'Asymptotes'), text: __alloT('stem.graphcalc.y_1_x_approaches_x_0_and_y_0_but_never', 'y = 1/x approaches x=0 and y=0 but never touches them.') }
          ]
        };

        var currentTips = (COACH_TIPS.explorer || []).concat(
          tier !== 'explorer' ? (COACH_TIPS.analyst || []) : []
        ).concat(
          tier === 'engineer' || tier === 'researcher' ? (COACH_TIPS.engineer || []) : []
        );

        /* ── Zoom presets ── */
        var ZOOM_PRESETS = [
          { name: __alloT('stem.graphcalc.standard', 'Standard'), xmin: -10, xmax: 10, ymin: -10, ymax: 10 },
          { name: __alloT('stem.graphcalc.trig', 'Trig'), xmin: -6.28, xmax: 6.28, ymin: -2, ymax: 2 },
          { name: __alloT('stem.graphcalc.quadratic', 'Quadratic'), xmin: -5, xmax: 5, ymin: -5, ymax: 25 },
          { name: __alloT('stem.graphcalc.wide', 'Wide'), xmin: -50, xmax: 50, ymin: -50, ymax: 50 },
          { name: __alloT('stem.graphcalc.positive', 'Positive'), xmin: 0, xmax: 20, ymin: 0, ymax: 20 }
        ];

        /* ── Challenges ── */
        var PREMADE_CHALLENGES = [
          { tier: 'explorer', topic: 'Linear Functions', prompt: __alloT('stem.graphcalc.graph_y_3x_2_what_is_the_y_intercept', 'Graph y = 3x - 2. What is the y-intercept?'), hint: __alloT('stem.graphcalc.the_y_intercept_is_where_the_line_cros', 'The y-intercept is where the line crosses the y-axis (x=0).') },
          { tier: 'explorer', topic: 'Linear Functions', prompt: __alloT('stem.graphcalc.graph_y_x_5_and_y_x_1_where_do_they_in', 'Graph y = -x + 5 and y = x - 1. Where do they intersect?'), hint: __alloT('stem.graphcalc.the_intersection_is_where_both_equatio', 'The intersection is where both equations give the same y for the same x.') },
          { tier: 'explorer', topic: 'Tables', prompt: __alloT('stem.graphcalc.enter_y_x_2_look_at_the_table_what_pat', 'Enter y = x^2. Look at the table. What pattern do you see?'), hint: __alloT('stem.graphcalc.the_differences_between_consecutive_y_', 'The differences between consecutive y-values increase by 2 each time!') },
          { tier: 'analyst', topic: 'Quadratics', prompt: __alloT('stem.graphcalc.graph_y_x_2_4_where_are_the_zeros', 'Graph y = x^2 - 4. Where are the zeros?'), hint: __alloT('stem.graphcalc.set_y_0_x_2_4_so_x_2', 'Set y = 0: x^2 = 4, so x = +/-2.') },
          { tier: 'analyst', topic: 'Transformations', prompt: __alloT('stem.graphcalc.graph_y_x_2_y_x_3_2_y_x_2_2_what_chang', 'Graph y = x^2, y = (x-3)^2, y = (x+2)^2. What changes?'), hint: __alloT('stem.graphcalc.x_h_shifts_right_by_h_x_h_shifts_left', '(x-h) shifts RIGHT by h. (x+h) shifts LEFT.') },
          { tier: 'analyst', topic: 'Slope', prompt: __alloT('stem.graphcalc.graph_y_0_5x_y_x_y_2x_y_5x_what_happen', 'Graph y = 0.5x, y = x, y = 2x, y = 5x. What happens?'), hint: __alloT('stem.graphcalc.bigger_slope_steeper_line', 'Bigger slope = steeper line.') },
          { tier: 'engineer', topic: 'Trigonometry', prompt: __alloT('stem.graphcalc.graph_sin_x_and_cos_x_with_trig_preset', 'Graph sin(x) and cos(x) with Trig preset. How are they related?'), hint: __alloT('stem.graphcalc.cos_x_is_sin_x_shifted_left_by_pi_2', 'cos(x) is sin(x) shifted left by pi/2.') },
          { tier: 'engineer', topic: 'Exponential', prompt: __alloT('stem.graphcalc.graph_y_2_x_and_y_log_x_log_2_what_do_', 'Graph y = 2^x and y = log(x)/log(2). What do you notice?'), hint: __alloT('stem.graphcalc.inverse_functions_are_mirrors_across_y', 'Inverse functions are mirrors across y = x.') },
          { tier: 'engineer', topic: 'Asymptotes', prompt: __alloT('stem.graphcalc.graph_y_1_x_what_happens_near_x_0', 'Graph y = 1/x. What happens near x = 0?'), hint: __alloT('stem.graphcalc.the_graph_approaches_but_never_touches', 'The graph approaches but never touches the axes.') }
        ];

        var availableChallenges = PREMADE_CHALLENGES.filter(function(c) {
          if (tier === 'researcher') return true;
          if (tier === 'engineer') return c.tier !== 'researcher';
          if (tier === 'analyst') return c.tier === 'explorer' || c.tier === 'analyst';
          return c.tier === 'explorer';
        });

        var TIER_INFO = {
          explorer: { icon: '\uD83D\uDFE2', name: __alloT('stem.graphcalc.explorer', 'Explorer'), desc: __alloT('stem.graphcalc.linear_functions', 'Linear functions'), color: '#34d399' },
          analyst: { icon: '\uD83D\uDFE1', name: __alloT('stem.graphcalc.analyst', 'Analyst'), desc: __alloT('stem.graphcalc.quadratics_transforms', 'Quadratics, transforms'), color: '#fbbf24' },
          engineer: { icon: '\uD83D\uDD35', name: __alloT('stem.graphcalc.engineer', 'Engineer'), desc: __alloT('stem.graphcalc.trig_logs_exponentials', 'Trig, logs, exponentials'), color: '#60a5fa' },
          researcher: { icon: '\uD83D\uDFE3', name: __alloT('stem.graphcalc.researcher', 'Researcher'), desc: __alloT('stem.graphcalc.full_access', 'Full access'), color: '#a78bfa' }
        };
        var tierInfo = TIER_INFO[tier] || TIER_INFO.explorer;

        /* ── Table computation ── */
        var tableRows = [];
        if (showTable && funcs[0] && funcs[0].expr && window.math) {
          try {
            var tExpr = funcs[0].expr.replace(/^y\s*=\s*/i, '').replace(/^f\s*\(x\)\s*=\s*/i, '');
            tExpr = tExpr.replace(/(\d)([x])/gi, '$1*$2').replace(/([x])(\d)/gi, '$1*$2');
            var tCompiled = math.compile(tExpr);
            for (var tx = tableX; tx <= tableX + 10 * tableStep; tx += tableStep) {
              try {
                var _tScope = { x: tx };
                if (d.sliderA != null) _tScope.a = d.sliderA;
                if (d.sliderB != null) _tScope.b = d.sliderB;
                if (d.sliderC != null) _tScope.c = d.sliderC;
                var ty = tCompiled.evaluate(_tScope);
                tableRows.push({ x: Number(tx.toFixed(4)), y: typeof ty === 'number' && isFinite(ty) ? Number(ty.toFixed(4)) : '---' });
              } catch (e) { tableRows.push({ x: tx, y: 'ERR' }); }
            }
          } catch (e) { tableRows = [{ x: 0, y: 'Invalid expression' }]; }
        }

        /* ── Badge Checker ── */
        function checkBadges(stateOverride) {
          var state = Object.assign({}, d, stateOverride || {});
          var earned = state.badges || [];
          var newBadges = [];
          BADGES.forEach(function(b) {
            if (earned.indexOf(b.id) < 0 && b.check(state)) newBadges.push(b);
          });
          if (newBadges.length > 0) {
            var ids = earned.slice();
            newBadges.forEach(function(b) {
              ids.push(b.id);
              if (addToast) addToast(b.icon + ' Badge: ' + b.label + ' (+' + b.xp + ' XP)', 'success');
              if (awardStemXP) awardStemXP('graphCalc', b.xp, 'Badge: ' + b.label);
            });
            SOUNDS.badge();
            if (stemCelebrate) stemCelebrate();
            upd('badges', ids);
          }
        }

        // Check badges inline (no useEffect)
        checkBadges();

        /* ── Analyze ── */
        function runAnalysis() {
          if (!window.math) return;
          SOUNDS.analyzeComplete();
          var zeros = []; var inters = [];
          try {
            var f1 = funcs[0];
            if (f1 && f1.expr && f1.expr.trim()) {
              var e1 = f1.expr.replace(/^y\s*=\s*/i, '').replace(/^f\s*\(x\)\s*=\s*/i, '');
              e1 = e1.replace(/(\d)([x])/gi, '$1*$2').replace(/([x])(\d)/gi, '$1*$2');
              var c1 = math.compile(e1);
              var sA = {};
              if (d.sliderA != null) sA.a = d.sliderA; if (d.sliderB != null) sA.b = d.sliderB; if (d.sliderC != null) sA.c = d.sliderC;
              var step = (win.xmax - win.xmin) / 500;
              var prevY = null; var prevX = null;
              for (var sx = win.xmin; sx <= win.xmax; sx += step) {
                try {
                  var sy = c1.evaluate(Object.assign({ x: sx }, sA));
                  if (prevY != null && typeof sy === 'number' && isFinite(sy) && typeof prevY === 'number' && prevY * sy < 0) {
                    var lo = prevX, hi = sx;
                    for (var bi = 0; bi < 30; bi++) { var mid = (lo + hi) / 2; var mval = c1.evaluate(Object.assign({ x: mid }, sA)); if (c1.evaluate(Object.assign({ x: lo }, sA)) * mval < 0) hi = mid; else lo = mid; }
                    var root = (lo + hi) / 2;
                    if (zeros.length === 0 || Math.abs(zeros[zeros.length - 1].x - root) > step * 2) zeros.push({ x: root });
                  }
                  prevY = sy; prevX = sx;
                } catch (e) { prevY = null; }
              }
              for (var fi2 = 1; fi2 < funcs.length; fi2++) {
                var f2 = funcs[fi2]; if (!f2 || !f2.expr || !f2.expr.trim()) continue;
                try {
                  var e2 = f2.expr.replace(/^y\s*=\s*/i, '').replace(/^f\s*\(x\)\s*=\s*/i, '');
                  e2 = e2.replace(/(\d)([x])/gi, '$1*$2').replace(/([x])(\d)/gi, '$1*$2');
                  var c2 = math.compile(e2);
                  var pDiff = null; var pXd = null;
                  for (var ix = win.xmin; ix <= win.xmax; ix += step) {
                    try {
                      var iy1 = c1.evaluate(Object.assign({ x: ix }, sA));
                      var iy2 = c2.evaluate(Object.assign({ x: ix }, sA));
                      var diff2 = iy1 - iy2;
                      if (pDiff != null && typeof diff2 === 'number' && isFinite(diff2) && pDiff * diff2 < 0) {
                        var ilo = pXd, ihi = ix;
                        for (var ibi = 0; ibi < 30; ibi++) { var imid = (ilo + ihi) / 2; var dd = c1.evaluate(Object.assign({ x: imid }, sA)) - c2.evaluate(Object.assign({ x: imid }, sA)); if ((c1.evaluate(Object.assign({ x: ilo }, sA)) - c2.evaluate(Object.assign({ x: ilo }, sA))) * dd < 0) ihi = imid; else ilo = imid; }
                        var iroot = (ilo + ihi) / 2;
                        inters.push({ x: iroot, y: c1.evaluate(Object.assign({ x: iroot }, sA)), f2: fi2 });
                      }
                      pDiff = diff2; pXd = ix;
                    } catch (e) { pDiff = null; }
                  }
                } catch (e) { /* skip */ }
              }
            }
          } catch (e) { /* skip */ }
          var updates = { showAnalysis: true, _zeros: zeros, _intersections: inters, _analyzed: true };
          if (zeros.length > 0) updates._foundZero = true;
          if (inters.length > 0) updates._foundIntersection = true;
          updMulti(updates);
        }

        /* ── AI Tutor ── */
        function handleAiQuestion(question) {
          if (!question || !callGemini) return;
          SOUNDS.aiTutor();
          var msgs = aiMessages.concat([{ role: 'user', text: question }]);
          updMulti({ aiMessages: msgs, aiInput: '', aiLoading: true });
          var funcList = funcs.filter(function(f) { return f.expr && f.expr.trim(); }).map(function(f, i) { return 'y' + (i + 1) + '=' + f.expr; }).join(', ');
          var prompt = 'You are a friendly math tutor for grade ' + (gradeLevel || 8) + '. '
            + 'They are using a graphing calculator (' + tier + ' tier). '
            + (funcList ? 'Graphed: ' + funcList + '. ' : '')
            + 'Answer in 2-3 sentences. Question: ' + question;
          callGemini(prompt, true, false, 0.8).then(function(reply) {
            updMulti({ aiMessages: msgs.concat([{ role: 'ai', text: reply }]), aiLoading: false, aiQuestions: (d.aiQuestions || 0) + 1 });
          }).catch(function() {
            updMulti({ aiMessages: msgs.concat([{ role: 'ai', text: __alloT('stem.graphcalc.sorry_i_could_not_get_an_answer_right_', 'Sorry, I could not get an answer right now.') }]), aiLoading: false });
          });
        }

        /* ── Canvas (callback ref, no useEffect) ── */
        var canvasRef = function(canvas) {
          if (!canvas || !window.math) return;
          var c = canvas.getContext('2d');
          var dpr = window.devicePixelRatio || 1;
          var W = canvas.offsetWidth || 600;
          var H = canvas.offsetHeight || 420;
          canvas.width = W * dpr; canvas.height = H * dpr; c.scale(dpr, dpr);

          function toPixelX(mx) { return (mx - win.xmin) / ((win.xmax - win.xmin) || 1) * W; }
          function toPixelY(my) { return H - (my - win.ymin) / ((win.ymax - win.ymin) || 1) * H; }
          function toMathX(px) { return win.xmin + px / W * (win.xmax - win.xmin); }
          canvas._toMathX = toMathX;

          c.fillStyle = '#0f172a'; c.fillRect(0, 0, W, H);

          // Grid
          var xRange = win.xmax - win.xmin; var yRange = win.ymax - win.ymin;
          var xStep = Math.pow(10, Math.floor(Math.log10(xRange / 5)));
          var yStep = Math.pow(10, Math.floor(Math.log10(yRange / 5)));
          c.strokeStyle = 'rgba(99,102,241,0.08)'; c.lineWidth = 1;
          for (var gx = Math.ceil(win.xmin / xStep) * xStep; gx <= win.xmax; gx += xStep) {
            var gpx = toPixelX(gx); c.beginPath(); c.moveTo(gpx, 0); c.lineTo(gpx, H); c.stroke();
            if (Math.abs(gx) > xStep * 0.01) { c.fillStyle = '#94a3b8'; c.font = '9px system-ui'; c.textAlign = 'center'; c.fillText(Number(gx.toPrecision(6)), gpx, Math.min(Math.max(toPixelY(0) + 12, 10), H - 4)); }
          }
          for (var gy = Math.ceil(win.ymin / yStep) * yStep; gy <= win.ymax; gy += yStep) {
            var gpy = toPixelY(gy); c.beginPath(); c.moveTo(0, gpy); c.lineTo(W, gpy); c.stroke();
            if (Math.abs(gy) > yStep * 0.01) { c.fillStyle = '#94a3b8'; c.font = '9px system-ui'; c.textAlign = 'right'; c.fillText(Number(gy.toPrecision(6)), Math.min(Math.max(toPixelX(0) - 4, 30), W - 4), gpy + 3); }
          }

          // Axes
          c.strokeStyle = 'rgba(148,163,184,0.5)'; c.lineWidth = 1.5;
          var ax = toPixelY(0); if (ax >= 0 && ax <= H) { c.beginPath(); c.moveTo(0, ax); c.lineTo(W, ax); c.stroke(); }
          var ay = toPixelX(0); if (ay >= 0 && ay <= W) { c.beginPath(); c.moveTo(ay, 0); c.lineTo(ay, H); c.stroke(); }

          // Graph functions
          var graphCount = 0; var usedTrig = false;
          var sA = {};
          if (d.sliderA != null) sA.a = d.sliderA; if (d.sliderB != null) sA.b = d.sliderB; if (d.sliderC != null) sA.c = d.sliderC;
          funcs.forEach(function(fn, fi) {
            if (!fn.expr || !fn.expr.trim()) return;
            try {
              var expr = fn.expr.replace(/^y\s*=\s*/i, '').replace(/^f\s*\(x\)\s*=\s*/i, '');
              expr = expr.replace(/(\d)([x])/gi, '$1*$2').replace(/([x])(\d)/gi, '$1*$2');
              if (/sin|cos|tan/.test(expr)) usedTrig = true;
              var compiled = math.compile(expr);
              c.strokeStyle = fn.color; c.lineWidth = 2.5; c.shadowColor = fn.color; c.shadowBlur = 8; c.beginPath();
              var started = false; var plotStep = xRange / W; var prevPpy = null;
              for (var mx = win.xmin; mx <= win.xmax; mx += plotStep) {
                try {
                  var my = compiled.evaluate(Object.assign({ x: mx }, sA));
                  if (typeof my === 'number' && isFinite(my) && my >= win.ymin - yRange && my <= win.ymax + yRange) {
                    var ppx = toPixelX(mx); var ppy = toPixelY(my);
                    // Lift the pen at a discontinuity: a >1-canvas-height jump between samples is an
                    // asymptote (tan x, 1/x) — drawing a lineTo across it produced a spurious vertical line.
                    if (!started || (prevPpy !== null && Math.abs(ppy - prevPpy) > H)) { c.moveTo(ppx, ppy); started = true; } else c.lineTo(ppx, ppy);
                    prevPpy = ppy;
                  } else { started = false; prevPpy = null; }
                } catch (e) { started = false; prevPpy = null; }
              }
              c.stroke(); c.shadowBlur = 0; graphCount++;
              c.fillStyle = fn.color; c.font = 'bold 11px system-ui'; c.textAlign = 'left';
              c.fillText('y' + (fi + 1) + ' = ' + fn.expr, 8, 16 + fi * 16);
            } catch (e) { /* invalid */ }
          });

          // Zeros & intersections markers
          if (d._zeros) d._zeros.forEach(function(z) {
            var zx = toPixelX(z.x); var zy = toPixelY(0);
            c.save(); c.shadowColor = '#34d399'; c.shadowBlur = 8; c.beginPath(); c.arc(zx, zy, 5, 0, Math.PI * 2); c.fillStyle = '#34d399'; c.fill(); c.restore(); c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.stroke();
            c.fillStyle = '#34d399'; c.font = 'bold 9px system-ui'; c.textAlign = 'center'; c.fillText('x=' + Number(z.x.toPrecision(4)), zx, zy - 10);
          });
          if (d._intersections) d._intersections.forEach(function(pt) {
            var ipx = toPixelX(pt.x); var ipy = toPixelY(pt.y);
            c.beginPath(); c.arc(ipx, ipy, 5, 0, Math.PI * 2); c.fillStyle = '#f472b6'; c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.stroke();
            c.fillStyle = '#f472b6'; c.font = 'bold 9px system-ui'; c.textAlign = 'center'; c.fillText('(' + Number(pt.x.toPrecision(3)) + ',' + Number(pt.y.toPrecision(3)) + ')', ipx, ipy - 10);
          });

          // Derivative tangent
          if (d.showDeriv && funcs[0] && funcs[0].expr) {
            try {
              var de = funcs[0].expr.replace(/^y\s*=\s*/i, '').replace(/^f\s*\(x\)\s*=\s*/i, '');
              de = de.replace(/(\d)([x])/gi, '$1*$2').replace(/([x])(\d)/gi, '$1*$2');
              var dc = math.compile(de); var dx = d.derivX != null ? d.derivX : 0;
              var dsc = Object.assign({ x: dx }, sA);
              var slope = (dc.evaluate(Object.assign({}, dsc, { x: dx + 0.0001 })) - dc.evaluate(Object.assign({}, dsc, { x: dx - 0.0001 }))) / 0.0002;
              var yAtX = dc.evaluate(dsc);
              if (typeof slope === 'number' && isFinite(slope)) {
                c.strokeStyle = '#fb923c'; c.lineWidth = 1.5; c.setLineDash([6, 3]); c.beginPath();
                c.moveTo(toPixelX(win.xmin), toPixelY(yAtX + slope * (win.xmin - dx)));
                c.lineTo(toPixelX(win.xmax), toPixelY(yAtX + slope * (win.xmax - dx)));
                c.stroke(); c.setLineDash([]);
                c.beginPath(); c.arc(toPixelX(dx), toPixelY(yAtX), 5, 0, Math.PI * 2);
                c.fillStyle = '#fb923c'; c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.stroke();
              }
            } catch (e) { /* skip */ }
          }

          // Trace crosshair
          if (d.traceMode && d.traceX != null) {
            var trX = toPixelX(d.traceX);
            c.strokeStyle = 'rgba(251,191,36,0.5)'; c.lineWidth = 1; c.setLineDash([3, 3]);
            c.beginPath(); c.moveTo(trX, 0); c.lineTo(trX, H); c.stroke(); c.setLineDash([]);
            c.font = 'bold 10px monospace';
            funcs.forEach(function(fn) {
              if (!fn.expr || !fn.expr.trim()) return;
              try {
                var trE = fn.expr.replace(/^y\s*=\s*/i, '').replace(/^f\s*\(x\)\s*=\s*/i, '');
                trE = trE.replace(/(\d)([x])/gi, '$1*$2').replace(/([x])(\d)/gi, '$1*$2');
                var trY = math.compile(trE).evaluate(Object.assign({ x: d.traceX }, sA));
                if (typeof trY === 'number' && isFinite(trY)) {
                  c.beginPath(); c.arc(trX, toPixelY(trY), 4, 0, Math.PI * 2); c.fillStyle = fn.color; c.fill();
                  c.fillStyle = '#fbbf24'; c.textAlign = 'left';
                  c.fillText('(' + Number(d.traceX.toPrecision(4)) + ', ' + Number(trY.toPrecision(4)) + ')', trX + 8, toPixelY(trY) - 6);
                }
              } catch (e) { /* skip */ }
            });
          }

          // Window info
          c.fillStyle = 'rgba(100,116,139,0.4)'; c.font = '8px system-ui'; c.textAlign = 'right';
          c.fillText('[' + win.xmin + ', ' + win.xmax + '] x [' + win.ymin + ', ' + win.ymax + ']', W - 4, H - 4);

          // Track state
          if (graphCount > 0) {
            var trk = {};
            if ((d._graphsDrawn || 0) < graphCount) trk._graphsDrawn = graphCount;
            if (graphCount >= 3) trk._multiGraphCount = graphCount;
            if (usedTrig) trk._usedTrig = true;
            if (Object.keys(trk).length > 0) updMulti(trk);
          }
        };

        /* ── Snapshot ── */
        function takeSnapshot() {
          SOUNDS.snapshot();
          var fl = funcs.filter(function(f) { return f.expr; }).map(function(f) { return f.expr; }).join(', ');
          if (setToolSnapshots) setToolSnapshots(function(prev) { return prev.concat([{ id: 'gc-' + Date.now(), tool: 'graphCalc', label: fl || 'Empty', data: Object.assign({}, d), timestamp: Date.now() }]); });
          if (addToast) addToast('\uD83D\uDCF8 Snapshot saved!', 'success');
        }

        var gcText = 'var(--gc-text)';
        var gcMuted = 'var(--gc-muted)';
        var gcPanel = 'var(--gc-panel)';
        var gcDeeper = 'var(--gc-deeper)';
        var gcCard = 'var(--gc-card)';
        var gcCardStrong = 'var(--gc-card-strong)';
        var gcBorder = 'var(--gc-border)';
        var gcAccent = 'var(--gc-accent)';
        var gcAccentSoft = 'var(--gc-accent-soft)';
        var gcAccentBorder = 'var(--gc-accent-border)';
        var gcButtonBg = 'var(--gc-button-bg)';
        var gcButtonText = 'var(--gc-button-text)';
        var gcDanger = 'var(--gc-danger)';
        function gcButtonStyle(active, accent) {
          return {
            background: active ? gcAccentSoft : gcButtonBg,
            color: active ? (accent || gcAccent) : gcButtonText,
            border: '1px solid ' + (active ? (accent || gcAccentBorder) : gcBorder)
          };
        }

        /* ═══════════════════════════════════════════════════
           UI RENDER
           ═══════════════════════════════════════════════════ */
        return h('div', { className: 'graphcalc-shell', style: { display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--allo-stem-canvas, #0f172a)', color: gcText, fontFamily: '"Inter", system-ui, sans-serif', overflow: 'hidden' } },
          h('div', { 'aria-live': 'polite', 'aria-atomic': 'true', style: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' } }, d._srMsg || ''),

          // Header
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', background: 'linear-gradient(135deg, #1e1b4b, #312e81)', borderBottom: '1px solid rgba(99,102,241,0.2)' } },
            h('button', { 'aria-label': __alloT('stem.graphcalc.back', 'Back'), onClick: function() { setStemLabTool(null); }, style: { background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', padding: '6px 12px', color: '#c7d2fe', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' } }, __alloT('stem.graphcalc.back_2', '\u2190 Back')),
            h('div', { style: { fontWeight: 'bold', fontSize: '16px', color: '#c7d2fe' } }, __alloT('stem.graphcalc.graphing_calculator', '\uD83D\uDCC8 Graphing Calculator')),
            h('span', { style: { fontSize: '10px', color: '#818cf8', maxWidth: '300px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' } }, gradeIntros[band] || ''),
            h('div', { style: { marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' } },
              h('span', { style: { background: tierInfo.color + '22', color: tierInfo.color, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', border: '1px solid ' + tierInfo.color + '44' } }, tierInfo.icon + ' ' + tierInfo.name),
              h('select', { value: tier, onChange: function(e) { SOUNDS.tierChange(); upd('tier', e.target.value); }, 'aria-label': __alloT('stem.graphcalc.difficulty_tier', 'Difficulty tier'), style: { background: 'rgba(255,255,255,0.1)', border: '1px solid #818cf8', borderRadius: '6px', padding: '3px 8px', color: '#c7d2fe', fontSize: '10px', cursor: 'pointer' } },
                h('option', { value: 'explorer' }, __alloT('stem.graphcalc.explorer_2', '\uD83D\uDFE2 Explorer')), h('option', { value: 'analyst' }, __alloT('stem.graphcalc.analyst_2', '\uD83D\uDFE1 Analyst')),
                h('option', { value: 'engineer' }, __alloT('stem.graphcalc.engineer_2', '\uD83D\uDD35 Engineer')), h('option', { value: 'researcher' }, __alloT('stem.graphcalc.researcher_2', '\uD83D\uDFE3 Researcher'))
              ),
              h('button', { onClick: takeSnapshot, 'aria-label': __alloT('stem.graphcalc.take_snapshot', 'Take snapshot'), style: { background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '6px', padding: '3px 8px', color: '#fbbf24', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' } }, '\uD83D\uDCF8'),
              badges.length > 0 ? h('span', { style: { background: 'rgba(167,139,250,0.15)', color: '#a78bfa', padding: '3px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold' } }, '\uD83C\uDFC5 ' + badges.length) : null
            )
          ),

          // 3-column layout
          h('div', { style: { display: 'flex', flex: 1, overflow: 'hidden' } },

            // Left sidebar
            h('div', { style: { width: '220px', borderRight: '1px solid ' + gcBorder, display: 'flex', flexDirection: 'column', background: gcDeeper } },
              h('div', { style: { padding: '10px 12px', borderBottom: '1px solid ' + gcBorder, fontSize: '11px', fontWeight: 'bold', color: gcAccent, letterSpacing: '1px' } }, __alloT('stem.graphcalc.functions', '\uD83D\uDCDD FUNCTIONS')),
              h('div', { style: { flex: 1, overflowY: 'auto', padding: '8px' } },
                funcs.map(function(fn, i) {
                  return h('div', { key: 'f' + i, style: { marginBottom: '8px' } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' } },
                      h('div', { style: { width: '10px', height: '10px', borderRadius: '50%', background: fn.color } }),
                      h('span', { style: { fontSize: '10px', color: gcMuted, fontWeight: 700 } }, 'y' + (i + 1) + ' =')
                    ),
                    h('input', { type: 'text', value: fn.expr || '', placeholder: i === 0 ? '2x + 3' : i === 1 ? 'x^2 - 4' : 'sin(x)',
                      onChange: function(e) { var nf = funcs.slice(); nf[i] = Object.assign({}, nf[i], { expr: e.target.value }); upd('funcs', nf); },
                      onFocus: function() { upd('focusedInput', i); },
                      'aria-label': 'Function y' + (i + 1) + ' expression',
                      className: 'focus:ring-2 focus:ring-indigo-500',
                      style: { width: '100%', padding: '6px 8px', borderRadius: '8px', border: '1px solid ' + fn.color, background: gcPanel, color: gcText, fontFamily: 'monospace', fontSize: '12px', fontWeight: 700 } })
                  );
                })
              ),
              // Math Pad toggle
              h('div', { style: { padding: '4px 12px', borderTop: '1px solid ' + gcBorder } },
                h('button', { onClick: function() { upd('showMathPad', !showMathPad); }, 'aria-pressed': !!showMathPad, style: Object.assign({ width: '100%', padding: '4px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }, gcButtonStyle(showMathPad)) }, __alloT('stem.graphcalc.math_pad', '\u2328 Math Pad')),
                showMathPad ? h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '3px', paddingBottom: '4px', paddingTop: '4px' } },
                  visibleSymbols.map(function(sym) {
                    return h('button', { 'aria-label': 'Insert ' + sym.label, key: sym.label, onClick: function() { insertSymbol(sym.insert); }, style: { padding: '3px 7px', borderRadius: '5px', background: gcButtonBg, color: gcButtonText, border: '1px solid ' + gcBorder, fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold', cursor: 'pointer' } }, sym.label);
                  })
                ) : null
              ),
              // Tool buttons
              h('div', { style: { padding: '8px 12px', borderTop: '1px solid ' + gcBorder, display: 'flex', flexWrap: 'wrap', gap: '4px' } },
                h('button', { onClick: function() { upd('showTable', !showTable); if (!showTable) upd('_usedTable', true); }, style: Object.assign({ flex: '1 0 45%', padding: '5px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }, gcButtonStyle(showTable)) }, __alloT('stem.graphcalc.table', '\uD83D\uDCCA Table')),
                h('button', { onClick: function() { try { var _cs = [].slice.call(document.querySelectorAll('canvas')); if (!_cs.length) return; var _c = _cs.sort(function(a,b){ return (b.width*b.height)-(a.width*a.height); })[0]; var _a = document.createElement('a'); _a.href = _c.toDataURL('image/png'); _a.download = 'graphcalc_' + Date.now() + '.png'; _a.click(); if (typeof addToast === 'function') addToast('\uD83D\uDCF8 PNG saved!', 'success'); } catch (e) {} }, style: Object.assign({ flex: '1 0 45%', padding: '5px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }, gcButtonStyle(true, '#0369a1')) }, __alloT('stem.graphcalc.png', '\uD83D\uDCF8 PNG')),
                h('button', { onClick: function() { upd('showWindow', !showWindow); }, style: Object.assign({ flex: '1 0 45%', padding: '5px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }, gcButtonStyle(showWindow)) }, __alloT('stem.graphcalc.window', '\u2699\uFE0F Window')),
                h('button', { 'aria-label': __alloT('stem.graphcalc.challenge', 'Challenge'), onClick: function() { SOUNDS.challengeOpen(); upd('showChallenge', !showChallenge); }, style: Object.assign({ flex: '1 0 45%', padding: '5px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }, gcButtonStyle(showChallenge)) }, __alloT('stem.graphcalc.challenge_2', '\uD83C\uDFAF Challenge')),
                h('button', { 'aria-label': __alloT('stem.graphcalc.clear', 'Clear'), onClick: function() { SOUNDS.clearAll(); upd('funcs', funcs.map(function(f) { return Object.assign({}, f, { expr: '' }); })); }, style: { flex: '1 0 45%', padding: '5px', borderRadius: '6px', background: 'rgba(239,68,68,0.14)', color: gcDanger, border: '1px solid rgba(239,68,68,0.45)', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' } }, __alloT('stem.graphcalc.clear_2', '\uD83D\uDDD1 Clear')),
                h('button', { onClick: function() { SOUNDS.traceOn(); upd('traceMode', !d.traceMode); }, style: Object.assign({ flex: '1 0 45%', padding: '5px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }, gcButtonStyle(!!d.traceMode, '#92400e')) }, __alloT('stem.graphcalc.trace', '\uD83D\uDD0D Trace')),
                h('button', { onClick: runAnalysis, style: Object.assign({ flex: '1 0 45%', padding: '5px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }, gcButtonStyle(!!d.showAnalysis, '#065f46')) }, __alloT('stem.graphcalc.analyze', '\u26A1 Analyze')),
                h('button', { onClick: function() { upd('showDeriv', !d.showDeriv); if (!d.showDeriv) { upd('_usedDeriv', true); if (d.derivX == null) upd('derivX', 0); } }, style: Object.assign({ flex: '1 0 45%', padding: '5px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }, gcButtonStyle(!!d.showDeriv, '#9a3412')) }, __alloT('stem.graphcalc.f_x', "\u2202 f'(x)")),
                h('button', { 'aria-label': __alloT('stem.graphcalc.sliders', 'Sliders'), onClick: function() { upd('showSliders', !showSliders); if (!showSliders) { upd('_usedSliders', true); if (d.sliderA == null) upd('sliderA', 1); if (d.sliderB == null) upd('sliderB', 0); if (d.sliderC == null) upd('sliderC', 0); } }, style: Object.assign({ flex: '1 0 45%', padding: '5px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }, gcButtonStyle(showSliders)) }, __alloT('stem.graphcalc.sliders_2', '\uD83C\uDFA8 Sliders'))
              ),
              // Zoom presets
              h('div', { style: { padding: '6px 12px 10px', borderTop: '1px solid ' + gcBorder } },
                h('div', { style: { fontSize: '11px', color: gcText, marginBottom: '4px', fontWeight: 'bold' } }, __alloT('stem.graphcalc.zoom_presets', 'ZOOM PRESETS')),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '3px' } },
                  ZOOM_PRESETS.map(function(z) {
                    return h('button', { 'aria-label': z.name + ' zoom preset', key: z.name, onClick: function() { SOUNDS.zoomPreset(); upd('window', { xmin: z.xmin, xmax: z.xmax, ymin: z.ymin, ymax: z.ymax }); }, style: { padding: '3px 7px', borderRadius: '4px', background: gcButtonBg, color: gcButtonText, border: '1px solid ' + gcBorder, fontSize: '11px', fontWeight: 700, cursor: 'pointer' } }, z.name);
                  })
                )
              ),
              // Sliders
              showSliders ? h('div', { style: { padding: '8px 12px', borderTop: '1px solid ' + gcBorder, background: gcCard } },
                h('div', { style: { fontSize: '11px', color: gcAccent, fontWeight: 'bold', marginBottom: '6px' } }, __alloT('stem.graphcalc.sliders_use_a_b_c', '\uD83C\uDFA8 SLIDERS \u2014 Use a, b, c')),
                ['a', 'b', 'c'].map(function(p) {
                  var key = 'slider' + p.toUpperCase(); var val = d[key] != null ? d[key] : (p === 'a' ? 1 : 0);
                  return h('div', { key: p, style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' } },
                    h('span', { style: { fontFamily: 'monospace', fontWeight: 'bold', color: gcAccent, fontSize: '12px', width: '16px' } }, p),
                    h('input', { type: 'range', min: -10, max: 10, step: 0.1, value: val, 'aria-label': 'Parameter ' + p + ': ' + Number(val.toFixed(1)), onChange: function(e) { upd(key, parseFloat(e.target.value)); }, style: { flex: 1, accentColor: gcAccent } }),
                    h('span', { style: { fontFamily: 'monospace', fontSize: '11px', color: gcText, minWidth: '36px', textAlign: 'right', fontWeight: 'bold' } }, Number(val.toFixed(1)))
                  );
                })
              ) : null,
              // Derivative slider
              d.showDeriv ? h('div', { style: { padding: '8px 12px', borderTop: '1px solid ' + gcBorder, background: gcCard } },
                h('div', { style: { fontSize: '11px', color: gcAccent, fontWeight: 'bold', marginBottom: '4px' } }, __alloT('stem.graphcalc.tangent_to_y', '\u2202 TANGENT to y\u2081')),
                h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
                  h('span', { style: { fontSize: '10px', color: gcText } }, 'x='),
                  h('input', { type: 'range', min: win.xmin, max: win.xmax, step: (win.xmax - win.xmin) / 200, value: d.derivX != null ? d.derivX : 0, 'aria-label': 'Tangent x position: ' + (d.derivX != null ? Number(d.derivX.toPrecision(4)) : '0'), onChange: function(e) { upd('derivX', parseFloat(e.target.value)); }, style: { flex: 1, accentColor: gcAccent } }),
                  h('span', { style: { fontFamily: 'monospace', fontSize: '11px', color: gcAccent, fontWeight: 'bold' } }, d.derivX != null ? Number(d.derivX.toPrecision(4)) : '0')
                )
              ) : null,
              // Analysis results
              d.showAnalysis ? h('div', { style: { padding: '8px 12px', borderTop: '1px solid ' + gcBorder, background: gcCard } },
                h('div', { style: { fontSize: '11px', color: gcAccent, fontWeight: 'bold', marginBottom: '4px' } }, __alloT('stem.graphcalc.analysis', '\u26A1 ANALYSIS')),
                h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
                  h('div', { style: { flex: 1 } },
                    h('div', { style: { fontSize: '11px', color: gcAccent, fontWeight: 'bold' } }, __alloT('stem.graphcalc.zeros', 'Zeros')),
                    (d._zeros && d._zeros.length > 0) ? d._zeros.map(function(z, zi) { return h('div', { key: zi, style: { fontSize: '10px', fontFamily: 'monospace', color: gcText } }, 'x=' + Number(z.x.toPrecision(5))); }) : h('div', { style: { fontSize: '10px', color: gcMuted } }, __alloT('stem.graphcalc.none', 'None'))
                  ),
                  h('div', { style: { flex: 1 } },
                    h('div', { style: { fontSize: '11px', color: gcAccent, fontWeight: 'bold' } }, __alloT('stem.graphcalc.intersections', 'Intersections')),
                    (d._intersections && d._intersections.length > 0) ? d._intersections.map(function(pt, pi) { return h('div', { key: pi, style: { fontSize: '10px', fontFamily: 'monospace', color: gcText } }, '(' + Number(pt.x.toPrecision(4)) + ',' + Number(pt.y.toPrecision(4)) + ')'); }) : h('div', { style: { fontSize: '10px', color: gcMuted } }, __alloT('stem.graphcalc.need_2_funcs', 'Need 2+ funcs'))
                  )
                )
              ) : null
            ),

            // Center — Canvas
            h('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' } },
              h('canvas', { ref: canvasRef, role: 'img', 'aria-label': __alloT('stem.graphcalc.interactive_graphing_calculator_visual', 'Interactive graphing calculator visualization'), tabIndex: 0, style: { width: '100%', flex: 1, background: 'var(--allo-stem-canvas, #0f172a)', cursor: d.traceMode ? 'crosshair' : 'default' },
                onMouseMove: function(e) { if (!d.traceMode) return; var rect = e.currentTarget.getBoundingClientRect(); var px = (e.clientX - rect.left) / rect.width * (e.currentTarget.width / (window.devicePixelRatio || 1)); if (e.currentTarget._toMathX) upd('traceX', e.currentTarget._toMathX(px)); },
                onMouseLeave: function() { if (d.traceMode) upd('traceX', null); } }),
              showWindow ? h('div', { style: { padding: '8px 12px', background: gcPanel, borderTop: '1px solid ' + gcBorder, display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } },
                h('span', { style: { fontSize: '10px', color: gcAccent, fontWeight: 'bold' } }, 'WINDOW:'),
                ['xmin', 'xmax', 'ymin', 'ymax'].map(function(k) {
                  return h('label', { key: k, style: { display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: gcText, fontWeight: 700 } }, k + ':', h('input', { type: 'number', value: win[k], onChange: function(e) { var nw = Object.assign({}, win); nw[k] = parseFloat(e.target.value) || 0; upd('window', nw); }, style: { width: '50px', padding: '2px 4px', borderRadius: '4px', border: '1px solid ' + gcBorder, background: gcPanel, color: gcText, fontFamily: 'monospace', fontSize: '10px' } }));
                })
              ) : null,
              showTable ? h('div', { style: { maxHeight: '150px', overflowY: 'auto', borderTop: '1px solid ' + gcBorder, background: gcPanel } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderBottom: '1px solid ' + gcBorder } },
                  h('span', { style: { fontSize: '10px', fontWeight: 'bold', color: gcAccent } }, __alloT('stem.graphcalc.table_2', '\uD83D\uDCCA TABLE')),
                  h('label', { style: { fontSize: '11px', color: gcText, display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 700 } }, 'Start:', h('input', { type: 'number', value: tableX, onChange: function(e) { upd('tableX', parseFloat(e.target.value) || 0); }, style: { width: '40px', padding: '1px 3px', borderRadius: '3px', border: '1px solid ' + gcBorder, background: gcPanel, color: gcText, fontFamily: 'monospace', fontSize: '11px' } })),
                  h('label', { style: { fontSize: '11px', color: gcText, display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 700 } }, 'Step:', h('input', { type: 'number', value: tableStep, onChange: function(e) { upd('tableStep', parseFloat(e.target.value) || 1); }, style: { width: '40px', padding: '1px 3px', borderRadius: '3px', border: '1px solid ' + gcBorder, background: gcPanel, color: gcText, fontFamily: 'monospace', fontSize: '11px' } }))
                ),
                h('table', { style: { width: '100%', fontSize: '11px', fontFamily: 'monospace', borderCollapse: 'collapse' } },
                  h('caption', { className: 'sr-only' }, __alloT('stem.graphcalc.graphcalc_data_table', 'graphcalc data table')), h('thead', null, h('tr', null, h('th', { scope: 'col', style: { padding: '3px 10px', textAlign: 'right', color: gcAccent, fontWeight: 'bold', borderBottom: '1px solid ' + gcBorder } }, 'x'), h('th', { style: { padding: '3px 10px', textAlign: 'right', color: funcs[0] ? funcs[0].color : gcAccent, fontWeight: 'bold', borderBottom: '1px solid ' + gcBorder } }, 'y\u2081'))),
                  h('tbody', null, tableRows.map(function(r, ri) { return h('tr', { key: ri, style: { background: ri % 2 === 0 ? 'transparent' : gcCard } }, h('td', { style: { padding: '2px 10px', textAlign: 'right', color: gcMuted } }, r.x), h('td', { style: { padding: '2px 10px', textAlign: 'right', color: gcText } }, r.y)); }))
                )
              ) : null
            ),

            // Right sidebar
            h('div', { style: { width: '230px', borderLeft: '1px solid ' + gcBorder, display: 'flex', flexDirection: 'column', background: gcDeeper } },
              h('div', { style: { display: 'flex', borderBottom: '1px solid ' + gcBorder } },
                [{ id: 'coach', label: __alloT('stem.graphcalc.coach', '\uD83D\uDCA1 Coach') }, { id: 'challenge', label: __alloT('stem.graphcalc.tasks', '\uD83C\uDFAF Tasks') }, { id: 'ai', label: __alloT('stem.graphcalc.ai', '\uD83E\uDD16 AI') }, { id: 'badges', label: '\uD83C\uDFC5', ariaLabel: __alloT('stem.graphcalc.badges', 'Badges') }, { id: 'inquiry', label: __alloT('stem.graphcalc.inquiry', '\u2754 Inquiry') }].map(function(st) {
                  var active = (d._sideTab || 'coach') === st.id;
                  return h('button', { 'aria-label': st.ariaLabel || st.label, key: st.id, onClick: function() { upd('_sideTab', st.id); }, style: { flex: 1, padding: '8px 4px', fontSize: '11px', fontWeight: 'bold', color: active ? gcAccent : gcMuted, background: active ? gcAccentSoft : 'transparent', borderTop: 'none', borderRight: 'none', borderLeft: 'none', borderBottom: active ? '2px solid ' + gcAccentBorder : '2px solid transparent', cursor: 'pointer' } }, st.label);
                })
              ),
              // Coach
              (d._sideTab || 'coach') === 'coach' ? h('div', { style: { flex: 1, overflowY: 'auto', padding: '8px' } },
                currentTips.map(function(tip, i) {
                  return h('div', { key: i, style: { padding: '10px', marginBottom: '8px', borderRadius: '10px', background: gcCard, border: '1px solid ' + gcBorder } },
                    h('div', { style: { fontWeight: 'bold', fontSize: '12px', marginBottom: '4px', color: gcAccent } }, tip.icon + ' ' + tip.title),
                    h('div', { style: { fontSize: '11px', lineHeight: '1.5', color: gcText } }, tip.text),
                    h('button', { 'aria-label': __alloT('stem.graphcalc.read_aloud', 'Read aloud'), onClick: function() { speakText(tip.text, callTTS); }, style: { marginTop: '4px', background: 'none', border: 'none', color: gcAccent, fontSize: '10px', cursor: 'pointer', fontWeight: 'bold' } }, __alloT('stem.graphcalc.read_aloud_2', '\uD83D\uDD0A Read aloud'))
                  );
                })
              ) : null,
              // Challenges
              (d._sideTab || 'coach') === 'challenge' ? h('div', { style: { flex: 1, overflowY: 'auto', padding: '8px' } },
                availableChallenges.map(function(ch, ci) {
                  var isActive = d.activeChallenge === ci;
                  return h('div', { key: ci, role: 'button', tabIndex: 0, 'aria-expanded': isActive, 'aria-label': ch.topic + (isActive ? ' (expanded)' : ' (collapsed)'), onClick: function() { upd('activeChallenge', isActive ? -1 : ci); }, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }, style: { padding: '10px', marginBottom: '6px', borderRadius: '10px', background: gcCard, border: '1px solid ' + (isActive ? gcAccentBorder : gcBorder), cursor: 'pointer' } },
                    h('div', { style: { fontSize: '11px', color: gcAccent, fontWeight: 'bold', marginBottom: '3px' } }, ch.topic),
                    h('div', { style: { fontSize: '11px', lineHeight: '1.5', color: gcText, marginBottom: '4px' } }, ch.prompt),
                    isActive ? h('div', null,
                      h('div', { style: { fontSize: '10px', color: '#92400e', background: 'rgba(251,191,36,0.16)', padding: '6px 8px', borderRadius: '6px', marginTop: '4px', border: '1px solid rgba(251,191,36,0.35)' } }, '\uD83D\uDCA1 ' + ch.hint),
                      h('button', { 'aria-label': __alloT('stem.graphcalc.complete', 'Complete'), onClick: function(e) { e.stopPropagation(); SOUNDS.quizCorrect(); updMulti({ _challengesCompleted: (d._challengesCompleted || 0) + 1, activeChallenge: -1 }); if (addToast) addToast('\u2705 Challenge done! +5 XP'); if (awardStemXP) awardStemXP('graphCalc', 5, 'Graphing challenge'); }, style: { marginTop: '6px', padding: '4px 12px', borderRadius: '6px', background: '#22c55e', color: '#fff', border: 'none', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' } }, __alloT('stem.graphcalc.complete_2', '\u2705 Complete'))
                    ) : null
                  );
                })
              ) : null,
              // AI
              (d._sideTab || 'coach') === 'ai' ? h('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', padding: '8px' } },
                h('div', { style: { flex: 1, overflowY: 'auto', marginBottom: '8px' } },
                  aiMessages.length === 0 ? h('div', { style: { textAlign: 'center', padding: '20px 0' } }, h('div', { style: { fontSize: '24px', marginBottom: '8px' } }, '\uD83E\uDD16'), h('p', { style: { fontSize: '11px', color: gcMuted } }, __alloT('stem.graphcalc.ask_about_graphing_or_math', 'Ask about graphing or math!'))) : null,
                  aiMessages.map(function(msg, i) {
                    return h('div', { key: i, style: { display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: '6px' } },
                      h('div', { style: { maxWidth: '85%', padding: '6px 10px', borderRadius: '10px', fontSize: '11px', lineHeight: '1.5', background: msg.role === 'user' ? '#4338ca' : gcCard, color: msg.role === 'user' ? '#fff' : gcText, border: msg.role === 'user' ? '1px solid #4338ca' : '1px solid ' + gcBorder } },
                        msg.text,
                        msg.role !== 'user' ? h('button', { 'aria-label': __alloT('stem.graphcalc.speak_text', 'Speak Text'), onClick: function() { speakText(msg.text, callTTS); }, style: { marginLeft: '6px', background: 'none', border: 'none', color: gcAccent, fontSize: '10px', cursor: 'pointer' } }, '\uD83D\uDD0A') : null
                      ));
                  }),
                  aiLoading ? h('div', { style: { fontSize: '11px', color: gcMuted, fontStyle: 'italic' } }, 'Thinking...') : null
                ),
                h('div', { style: { display: 'flex', gap: '4px' } },
                  h('input', { type: 'text', value: aiInput, onChange: function(e) { upd('aiInput', e.target.value); }, onKeyDown: function(e) { if (e.key === 'Enter' && aiInput.trim()) handleAiQuestion(aiInput.trim()); }, placeholder: __alloT('stem.graphcalc.ask_about_math', 'Ask about math...'), 'aria-label': __alloT('stem.graphcalc.ask_the_math_tutor', 'Ask the math tutor'), className: 'focus:ring-2 focus:ring-indigo-500', style: { flex: 1, padding: '6px 8px', borderRadius: '6px', border: '1px solid ' + gcBorder, background: gcPanel, color: gcText, fontSize: '11px' } }),
                  h('button', { onClick: function() { if (aiInput.trim()) handleAiQuestion(aiInput.trim()); }, 'aria-label': __alloT('stem.graphcalc.send_question_to_ai_math_tutor', 'Send question to AI math tutor'), style: { padding: '6px 10px', borderRadius: '6px', background: '#6366f1', color: '#fff', border: 'none', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' } }, '\u2191')
                )
              ) : null,
              // Badges
              (d._sideTab || 'coach') === 'badges' ? h('div', { style: { flex: 1, overflowY: 'auto', padding: '8px' } },
                h('div', { style: { fontSize: '10px', color: gcAccent, fontWeight: 'bold', marginBottom: '8px' } }, '\uD83C\uDFC5 ' + badges.length + '/' + BADGES.length + ' Earned'),
                BADGES.map(function(b) {
                  var earned = badges.indexOf(b.id) >= 0;
                  return h('div', { key: b.id, style: { padding: '8px', marginBottom: '4px', borderRadius: '8px', background: earned ? gcCardStrong : gcCard, border: '1px solid ' + gcBorder, opacity: earned ? 1 : 0.72 } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                      h('span', { style: { fontSize: '16px' } }, earned ? b.icon : '\uD83D\uDD12'),
                      h('div', null, h('div', { style: { fontSize: '11px', fontWeight: 'bold', color: earned ? gcAccent : gcMuted } }, b.label), h('div', { style: { fontSize: '11px', color: gcMuted } }, __alloT('stem.graphcalc.' + (b.id) + '_desc', b.desc))),
                      earned ? h('span', { style: { marginLeft: 'auto', fontSize: '11px', color: gcAccent, fontWeight: 'bold' } }, '+' + b.xp + ' XP') : null
                    ));
                })
              ) : null,
              // === H7b'' inquiry widget: quadratic discovery ===
              (d._sideTab || 'coach') === 'inquiry' ? (function() {
                var iq = d.quadHunt || { a: 1, hVertex: 0, kVertex: 0, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
                function setIQ(patch) { upd('quadHunt', Object.assign({}, iq, patch)); }
                var state = Math.abs(iq.a) < 0.1 ? 'degenerate' : (iq.a > 0 ? 'up' : 'down');
                var stateMeta = {
                  up:         { label: __alloT('stem.graphcalc.opens_up_min_at_vertex', '🙂 Opens UP (min at vertex)'),   color: '#059669', bg: 'rgba(16,185,129,0.10)', border: '#10b981' },
                  down:       { label: __alloT('stem.graphcalc.opens_down_max_at_vertex', '🙁 Opens DOWN (max at vertex)'), color: '#dc2626', bg: 'rgba(220,38,38,0.10)', border: '#ef4444' },
                  degenerate: { label: __alloT('stem.graphcalc.nearly_a_line', '➖ Nearly a line'),               color: '#64748b', bg: 'rgba(100,116,139,0.10)', border: '#94a3b8' }
                }[state];
                function logObs() {
                  setIQ({ log: (iq.log || []).concat([{ a: iq.a, h: iq.hVertex, k: iq.kVertex, st: state }]).slice(-8) });
                }
                return h('div', { style: { flex: 1, overflowY: 'auto', padding: '8px', color: gcText } },
                  h('div', { style: { fontSize: '12px', fontWeight: 'bold', color: gcAccent, marginBottom: '6px' } }, __alloT('stem.graphcalc.quadratic_discovery', '❔ Quadratic discovery')),
                  h('p', { style: { fontSize: '10px', color: gcMuted, lineHeight: 1.4, marginBottom: '8px' } },
                    __alloT('stem.graphcalc.sliders_for_vertex_h_k_and_stretch_a_d', 'Sliders for vertex (h, k) and stretch a. Discrete 3-state outcome shows the parabola direction. No score, no reveal — sweep and notice.')),
                  h('div', { style: { marginBottom: '8px', padding: '8px', borderRadius: '6px', textAlign: 'center', background: stateMeta.bg, border: '1px solid ' + stateMeta.border } },
                    h('div', { style: { fontSize: '11px', fontWeight: 'bold', color: stateMeta.color } }, stateMeta.label),
                    h('div', { style: { fontSize: '10px', color: gcText, marginTop: '3px', fontFamily: 'monospace' } },
                      'y = ' + iq.a.toFixed(2) + '(x − ' + iq.hVertex + ')² + ' + iq.kVertex)
                  ),
                  [
                    { key: 'a',       label: __alloT('stem.graphcalc.stretch_a', 'stretch a'),  val: iq.a,       min: -3,  max: 3,   step: 0.1 },
                    { key: 'hVertex', label: __alloT('stem.graphcalc.vertex_h', 'vertex h'),   val: iq.hVertex, min: -10, max: 10,  step: 1 },
                    { key: 'kVertex', label: __alloT('stem.graphcalc.vertex_k', 'vertex k'),   val: iq.kVertex, min: -10, max: 10,  step: 1 }
                  ].map(function(s) {
                    return h('div', { key: s.key, style: { marginBottom: '6px' } },
                      h('label', { htmlFor: 'qh-' + s.key, style: { display: 'block', fontSize: '10px', fontWeight: 'bold', color: gcText, marginBottom: '2px' } },
                        s.label + ': ', h('span', { style: { color: gcAccent, fontFamily: 'monospace' } }, s.val)),
                      h('input', { id: 'qh-' + s.key, type: 'range', min: s.min, max: s.max, step: s.step, value: s.val,
                        onChange: function(e) { var p = {}; p[s.key] = parseFloat(e.target.value); setIQ(p); },
                        style: { width: '100%' }, 'aria-label': s.label }));
                  }),
                  h('div', { style: { display: 'flex', gap: '4px', marginBottom: '6px', flexWrap: 'wrap' } },
                    h('button', { onClick: logObs, style: { padding: '3px 8px', fontSize: '10px', fontWeight: 'bold', background: gcButtonBg, color: gcButtonText, border: '1px solid ' + gcBorder, borderRadius: '4px', cursor: 'pointer' } }, __alloT('stem.graphcalc.log', '📋 Log')),
                    h('button', { onClick: function() { setIQ({ a: 1, hVertex: 0, kVertex: 0, log: [], hypothesis: '', stuckRevealed: false, understood: false, explanation: '' }); },
                      style: { padding: '3px 8px', fontSize: '10px', fontWeight: 600, background: 'transparent', color: gcMuted, border: '1px solid ' + gcBorder, borderRadius: '4px', cursor: 'pointer' } }, __alloT('stem.graphcalc.reset', '↺ Reset'))
                  ),
                  (iq.log || []).length > 0 && h('table', { style: { fontSize: '9px', width: '100%', borderCollapse: 'collapse', color: '#cbd5e1', marginBottom: '8px' } },
                    h('thead', null, h('tr', { style: { background: gcCard } },
                      ['a', 'h', 'k', 'state'].map(function(c, i) { return h('th', { key: 'h' + i, style: { padding: '3px', borderBottom: '1px solid rgba(99,102,241,0.2)', textAlign: 'left' } }, c); }))),
                    h('tbody', null, iq.log.map(function(o, idx) {
                      return h('tr', { key: 'lr' + idx },
                        h('td', { style: { padding: '3px', fontFamily: 'monospace' } }, o.a.toFixed(2)),
                        h('td', { style: { padding: '3px', fontFamily: 'monospace' } }, o.h),
                        h('td', { style: { padding: '3px', fontFamily: 'monospace' } }, o.k),
                        h('td', { style: { padding: '3px' } }, o.st));
                    }))
                  ),
                  h('div', { style: { marginBottom: '8px' } },
                    h('label', { htmlFor: 'qh-hypo', style: { display: 'block', fontSize: '10px', fontWeight: 'bold', color: gcText, marginBottom: '2px' } }, __alloT('stem.graphcalc.hypothesis_free_text', 'Hypothesis (free text):')),
                    h('textarea', { id: 'qh-hypo', value: iq.hypothesis || '',
                      onChange: function(e) { setIQ({ hypothesis: e.target.value }); },
                      placeholder: __alloT('stem.graphcalc.what_does_a_control_what_about_h_and_k', 'What does a control? What about h and k?'),
                      style: { width: '100%', minHeight: '40px', padding: '4px', background: gcPanel, color: gcText, border: '1px solid ' + gcBorder, borderRadius: '4px', fontSize: '10px', fontFamily: 'monospace' }, rows: 3 })
                  ),
                  h('div', { style: { marginBottom: '8px' } },
                    !iq.stuckRevealed && h('button', { onClick: function() { setIQ({ stuckRevealed: true }); },
                      style: { padding: '3px 8px', fontSize: '10px', fontWeight: 'bold', background: 'rgba(251,191,36,0.16)', color: '#92400e', border: '1px solid rgba(251,191,36,0.45)', borderRadius: '4px', cursor: 'pointer' } },
                      __alloT('stem.graphcalc.stuck_show_open_prompts', '🤔 Stuck — show open prompts')),
                    iq.stuckRevealed && h('div', { style: { padding: '6px', fontSize: '10px', color: gcText, background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.35)', borderRadius: '4px' } },
                      h('ul', { style: { margin: 0, paddingLeft: '14px' } },
                        h('li', null, __alloT('stem.graphcalc.hold_two_sliders_steady_move_one_watch', 'Hold two sliders steady. Move one. Watch what happens.')),
                        h('li', null, __alloT('stem.graphcalc.log_observations_of_each_state_what_pa', 'Log observations of each state. What patterns emerge?')),
                        h('li', null, __alloT('stem.graphcalc.what_slider_value_makes_the_parabola_d', 'What slider value makes the parabola degenerate?')),
                        h('li', null, __alloT('stem.graphcalc.can_you_get_the_same_shape_with_two_di', 'Can you get the same shape with two different settings?'))))
                  ),
                  h('div', { style: { padding: '6px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '4px' } },
                    h('label', { style: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 'bold', color: '#047857', cursor: 'pointer' } },
                      h('input', { type: 'checkbox', checked: !!iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); } }),
                      __alloT('stem.graphcalc.i_understand_explain_in_my_own_words', 'I understand — explain in my own words')),
                    iq.understood && h('textarea', { value: iq.explanation || '', onChange: function(e) { setIQ({ explanation: e.target.value }); },
                      placeholder: __alloT('stem.graphcalc.explain_in_your_own_words_what_does_ea', 'Explain in your own words: what does each slider control?'),
                      style: { width: '100%', marginTop: '4px', minHeight: '50px', padding: '4px', background: gcPanel, color: gcText, border: '1px solid rgba(16,185,129,0.45)', borderRadius: '4px', fontSize: '10px', fontFamily: 'monospace' }, rows: 4 })
                  ),
                  h('div', { style: { marginTop: '6px', padding: '6px', fontSize: '9px', fontStyle: 'italic', color: gcMuted, background: gcCard, borderRadius: '4px' } },
                    __alloT('stem.graphcalc.design_note_discrete_3_state_marker_no', 'Design note: discrete 3-state marker; no score, no reveal — by design.'))
                );
              })() : null
            )
          )
        );
      })();
    }
  });

})();
