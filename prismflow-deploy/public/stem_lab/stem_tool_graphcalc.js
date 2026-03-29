// ═══════════════════════════════════════════════
// stem_tool_graphcalc.js — Graphing Calculator (ES5)
// Extracted from stem_tool_science.js monolith and enhanced with:
//   Sound effects, 12 badges, AI tutor, TTS, grade-band content,
//   snapshot support, challenge completion, canvas rendering
// ═══════════════════════════════════════════════

(function() {
  'use strict';

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
    if (callTTS) {
      try { callTTS(text); return; } catch (e) { /* fallback */ }
    }
    if (window.speechSynthesis) {
      var utter = new SpeechSynthesisUtterance(text);
      utter.rate = 0.9;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    }
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
    render: function(ctx) {
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

      return (function() {
        var d = labToolData.graphCalc || {};

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
          { label: '( )', insert: '()', tier: 'explorer' },
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
            { icon: '\uD83D\uDCA1', title: 'Entering Functions', text: 'Type y = mx + b where m is the slope and b is the y-intercept. Try: 2x + 3' },
            { icon: '\uD83D\uDD0D', title: 'Zoom & Window', text: 'Use zoom presets to change how much of the graph you see.' },
            { icon: '\uD83D\uDCCA', title: 'Reading the Table', text: 'The table shows exact y-values for each x.' },
            { icon: '\uD83C\uDFAF', title: 'Multiple Functions', text: 'Enter different equations to compare them. Where lines cross is an intersection!' }
          ],
          analyst: [
            { icon: '\uD83D\uDCC8', title: 'Linear vs Quadratic', text: 'y = 2x + 1 is a line. y = x^2 is a parabola. The exponent determines the shape!' },
            { icon: '\uD83E\uDDEE', title: 'Finding Zeros', text: 'Where the graph crosses the x-axis, y = 0. These are zeros or x-intercepts.' },
            { icon: '\u26A1', title: 'Transformations', text: 'y = (x-3)^2 shifts right by 3. y = x^2 + 5 shifts up by 5.' }
          ],
          engineer: [
            { icon: '\uD83E\uDDE9', title: 'Trig Functions', text: 'sin(x), cos(x), tan(x) create waves. Period of sin(x) is 2\u03C0.' },
            { icon: '\uD83D\uDD22', title: 'Logarithms', text: 'log(x) is the inverse of 10^x. ln(x) is the natural log.' },
            { icon: '\u221E', title: 'Asymptotes', text: 'y = 1/x approaches x=0 and y=0 but never touches them.' }
          ]
        };

        var currentTips = (COACH_TIPS.explorer || []).concat(
          tier !== 'explorer' ? (COACH_TIPS.analyst || []) : []
        ).concat(
          tier === 'engineer' || tier === 'researcher' ? (COACH_TIPS.engineer || []) : []
        );

        /* ── Zoom presets ── */
        var ZOOM_PRESETS = [
          { name: 'Standard', xmin: -10, xmax: 10, ymin: -10, ymax: 10 },
          { name: 'Trig', xmin: -6.28, xmax: 6.28, ymin: -2, ymax: 2 },
          { name: 'Quadratic', xmin: -5, xmax: 5, ymin: -5, ymax: 25 },
          { name: 'Wide', xmin: -50, xmax: 50, ymin: -50, ymax: 50 },
          { name: 'Positive', xmin: 0, xmax: 20, ymin: 0, ymax: 20 }
        ];

        /* ── Challenges ── */
        var PREMADE_CHALLENGES = [
          { tier: 'explorer', topic: 'Linear Functions', prompt: 'Graph y = 3x - 2. What is the y-intercept?', hint: 'The y-intercept is where the line crosses the y-axis (x=0).' },
          { tier: 'explorer', topic: 'Linear Functions', prompt: 'Graph y = -x + 5 and y = x - 1. Where do they intersect?', hint: 'The intersection is where both equations give the same y for the same x.' },
          { tier: 'explorer', topic: 'Tables', prompt: 'Enter y = x^2. Look at the table. What pattern do you see?', hint: 'The differences between consecutive y-values increase by 2 each time!' },
          { tier: 'analyst', topic: 'Quadratics', prompt: 'Graph y = x^2 - 4. Where are the zeros?', hint: 'Set y = 0: x^2 = 4, so x = +/-2.' },
          { tier: 'analyst', topic: 'Transformations', prompt: 'Graph y = x^2, y = (x-3)^2, y = (x+2)^2. What changes?', hint: '(x-h) shifts RIGHT by h. (x+h) shifts LEFT.' },
          { tier: 'analyst', topic: 'Slope', prompt: 'Graph y = 0.5x, y = x, y = 2x, y = 5x. What happens?', hint: 'Bigger slope = steeper line.' },
          { tier: 'engineer', topic: 'Trigonometry', prompt: 'Graph sin(x) and cos(x) with Trig preset. How are they related?', hint: 'cos(x) is sin(x) shifted left by pi/2.' },
          { tier: 'engineer', topic: 'Exponential', prompt: 'Graph y = 2^x and y = log(x)/log(2). What do you notice?', hint: 'Inverse functions are mirrors across y = x.' },
          { tier: 'engineer', topic: 'Asymptotes', prompt: 'Graph y = 1/x. What happens near x = 0?', hint: 'The graph approaches but never touches the axes.' }
        ];

        var availableChallenges = PREMADE_CHALLENGES.filter(function(c) {
          if (tier === 'researcher') return true;
          if (tier === 'engineer') return c.tier !== 'researcher';
          if (tier === 'analyst') return c.tier === 'explorer' || c.tier === 'analyst';
          return c.tier === 'explorer';
        });

        var TIER_INFO = {
          explorer: { icon: '\uD83D\uDFE2', name: 'Explorer', desc: 'Linear functions', color: '#34d399' },
          analyst: { icon: '\uD83D\uDFE1', name: 'Analyst', desc: 'Quadratics, transforms', color: '#fbbf24' },
          engineer: { icon: '\uD83D\uDD35', name: 'Engineer', desc: 'Trig, logs, exponentials', color: '#60a5fa' },
          researcher: { icon: '\uD83D\uDFE3', name: 'Researcher', desc: 'Full access', color: '#a78bfa' }
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
                tableRows.push({ x: tx, y: typeof ty === 'number' && isFinite(ty) ? Number(ty.toFixed(4)) : '---' });
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
              if (awardStemXP) awardStemXP(b.xp);
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
            updMulti({ aiMessages: msgs.concat([{ role: 'ai', text: 'Sorry, I could not get an answer right now.' }]), aiLoading: false });
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

          function toPixelX(mx) { return (mx - win.xmin) / (win.xmax - win.xmin) * W; }
          function toPixelY(my) { return H - (my - win.ymin) / (win.ymax - win.ymin) * H; }
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
            if (Math.abs(gx) > xStep * 0.01) { c.fillStyle = '#475569'; c.font = '9px system-ui'; c.textAlign = 'center'; c.fillText(Number(gx.toPrecision(6)), gpx, toPixelY(0) + 12); }
          }
          for (var gy = Math.ceil(win.ymin / yStep) * yStep; gy <= win.ymax; gy += yStep) {
            var gpy = toPixelY(gy); c.beginPath(); c.moveTo(0, gpy); c.lineTo(W, gpy); c.stroke();
            if (Math.abs(gy) > yStep * 0.01) { c.fillStyle = '#475569'; c.font = '9px system-ui'; c.textAlign = 'right'; c.fillText(Number(gy.toPrecision(6)), toPixelX(0) - 4, gpy + 3); }
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
              c.strokeStyle = fn.color; c.lineWidth = 2.5; c.beginPath();
              var started = false; var plotStep = xRange / W;
              for (var mx = win.xmin; mx <= win.xmax; mx += plotStep) {
                try {
                  var my = compiled.evaluate(Object.assign({ x: mx }, sA));
                  if (typeof my === 'number' && isFinite(my) && my >= win.ymin - yRange && my <= win.ymax + yRange) {
                    var ppx = toPixelX(mx); var ppy = toPixelY(my);
                    if (!started) { c.moveTo(ppx, ppy); started = true; } else c.lineTo(ppx, ppy);
                  } else started = false;
                } catch (e) { started = false; }
              }
              c.stroke(); graphCount++;
              c.fillStyle = fn.color; c.font = 'bold 11px system-ui'; c.textAlign = 'left';
              c.fillText('y' + (fi + 1) + ' = ' + fn.expr, 8, 16 + fi * 16);
            } catch (e) { /* invalid */ }
          });

          // Zeros & intersections markers
          if (d._zeros) d._zeros.forEach(function(z) {
            var zx = toPixelX(z.x); var zy = toPixelY(0);
            c.beginPath(); c.arc(zx, zy, 5, 0, Math.PI * 2); c.fillStyle = '#34d399'; c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.stroke();
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

        /* ═══════════════════════════════════════════════════
           UI RENDER
           ═══════════════════════════════════════════════════ */
        return h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%', background: '#0f172a', color: '#e2e8f0', fontFamily: '"Inter", system-ui, sans-serif', overflow: 'hidden' } },

          // Header
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', background: 'linear-gradient(135deg, #1e1b4b, #312e81)', borderBottom: '1px solid rgba(99,102,241,0.2)' } },
            h('button', { onClick: function() { setStemLabTool(null); }, style: { background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', padding: '6px 12px', color: '#c7d2fe', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' } }, '\u2190 Back'),
            h('div', { style: { fontWeight: 'bold', fontSize: '16px', color: '#c7d2fe' } }, '\uD83D\uDCC8 Graphing Calculator'),
            h('span', { style: { fontSize: '10px', color: '#818cf8', maxWidth: '300px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' } }, gradeIntros[band] || ''),
            h('div', { style: { marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' } },
              h('span', { style: { background: tierInfo.color + '22', color: tierInfo.color, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', border: '1px solid ' + tierInfo.color + '44' } }, tierInfo.icon + ' ' + tierInfo.name),
              h('select', { value: tier, onChange: function(e) { SOUNDS.tierChange(); upd('tier', e.target.value); }, style: { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '6px', padding: '3px 8px', color: '#c7d2fe', fontSize: '10px', cursor: 'pointer' } },
                h('option', { value: 'explorer' }, '\uD83D\uDFE2 Explorer'), h('option', { value: 'analyst' }, '\uD83D\uDFE1 Analyst'),
                h('option', { value: 'engineer' }, '\uD83D\uDD35 Engineer'), h('option', { value: 'researcher' }, '\uD83D\uDFE3 Researcher')
              ),
              h('button', { onClick: takeSnapshot, style: { background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '6px', padding: '3px 8px', color: '#fbbf24', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' } }, '\uD83D\uDCF8'),
              badges.length > 0 ? h('span', { style: { background: 'rgba(167,139,250,0.15)', color: '#a78bfa', padding: '3px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold' } }, '\uD83C\uDFC5 ' + badges.length) : null
            )
          ),

          // 3-column layout
          h('div', { style: { display: 'flex', flex: 1, overflow: 'hidden' } },

            // Left sidebar
            h('div', { style: { width: '220px', borderRight: '1px solid rgba(99,102,241,0.15)', display: 'flex', flexDirection: 'column', background: 'rgba(15,23,42,0.8)' } },
              h('div', { style: { padding: '10px 12px', borderBottom: '1px solid rgba(99,102,241,0.1)', fontSize: '11px', fontWeight: 'bold', color: '#818cf8', letterSpacing: '1px' } }, '\uD83D\uDCDD FUNCTIONS'),
              h('div', { style: { flex: 1, overflowY: 'auto', padding: '8px' } },
                funcs.map(function(fn, i) {
                  return h('div', { key: 'f' + i, style: { marginBottom: '8px' } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' } },
                      h('div', { style: { width: '10px', height: '10px', borderRadius: '50%', background: fn.color } }),
                      h('span', { style: { fontSize: '10px', color: '#94a3b8' } }, 'y' + (i + 1) + ' =')
                    ),
                    h('input', { type: 'text', value: fn.expr || '', placeholder: i === 0 ? '2x + 3' : i === 1 ? 'x^2 - 4' : 'sin(x)',
                      onChange: function(e) { var nf = funcs.slice(); nf[i] = Object.assign({}, nf[i], { expr: e.target.value }); upd('funcs', nf); },
                      onFocus: function() { upd('focusedInput', i); },
                      style: { width: '100%', padding: '6px 8px', borderRadius: '8px', border: '1px solid ' + fn.color + '44', background: fn.color + '11', color: '#e2e8f0', fontFamily: 'monospace', fontSize: '12px', outline: 'none' } })
                  );
                })
              ),
              // Math Pad toggle
              h('div', { style: { padding: '4px 12px', borderTop: '1px solid rgba(99,102,241,0.1)' } },
                h('button', { onClick: function() { upd('showMathPad', !showMathPad); }, style: { width: '100%', padding: '4px', borderRadius: '6px', background: showMathPad ? '#818cf833' : 'rgba(255,255,255,0.05)', color: showMathPad ? '#a5b4fc' : '#64748b', border: showMathPad ? '1px solid #818cf844' : '1px solid transparent', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' } }, '\u2328 Math Pad'),
                showMathPad ? h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '3px', paddingBottom: '4px', paddingTop: '4px' } },
                  visibleSymbols.map(function(sym) {
                    return h('button', { key: sym.label, onClick: function() { insertSymbol(sym.insert); }, style: { padding: '3px 7px', borderRadius: '5px', background: 'rgba(99,102,241,0.12)', color: '#c7d2fe', border: '1px solid rgba(99,102,241,0.2)', fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold', cursor: 'pointer' } }, sym.label);
                  })
                ) : null
              ),
              // Tool buttons
              h('div', { style: { padding: '8px 12px', borderTop: '1px solid rgba(99,102,241,0.1)', display: 'flex', flexWrap: 'wrap', gap: '4px' } },
                h('button', { onClick: function() { upd('showTable', !showTable); if (!showTable) upd('_usedTable', true); }, style: { flex: '1 0 45%', padding: '5px', borderRadius: '6px', background: showTable ? '#818cf833' : 'rgba(255,255,255,0.05)', color: showTable ? '#a5b4fc' : '#94a3b8', border: showTable ? '1px solid #818cf844' : '1px solid transparent', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' } }, '\uD83D\uDCCA Table'),
                h('button', { onClick: function() { upd('showWindow', !showWindow); }, style: { flex: '1 0 45%', padding: '5px', borderRadius: '6px', background: showWindow ? '#818cf833' : 'rgba(255,255,255,0.05)', color: showWindow ? '#a5b4fc' : '#94a3b8', border: showWindow ? '1px solid #818cf844' : '1px solid transparent', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' } }, '\u2699\uFE0F Window'),
                h('button', { onClick: function() { SOUNDS.challengeOpen(); upd('showChallenge', !showChallenge); }, style: { flex: '1 0 45%', padding: '5px', borderRadius: '6px', background: showChallenge ? '#a78bfa33' : 'rgba(255,255,255,0.05)', color: showChallenge ? '#c4b5fd' : '#94a3b8', border: showChallenge ? '1px solid #a78bfa44' : '1px solid transparent', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' } }, '\uD83C\uDFAF Challenge'),
                h('button', { onClick: function() { SOUNDS.clearAll(); upd('funcs', funcs.map(function(f) { return Object.assign({}, f, { expr: '' }); })); }, style: { flex: '1 0 45%', padding: '5px', borderRadius: '6px', background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' } }, '\uD83D\uDDD1 Clear'),
                h('button', { onClick: function() { SOUNDS.traceOn(); upd('traceMode', !d.traceMode); }, style: { flex: '1 0 45%', padding: '5px', borderRadius: '6px', background: d.traceMode ? '#fbbf2433' : 'rgba(255,255,255,0.05)', color: d.traceMode ? '#fbbf24' : '#94a3b8', border: d.traceMode ? '1px solid #fbbf2444' : '1px solid transparent', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' } }, '\uD83D\uDD0D Trace'),
                h('button', { onClick: runAnalysis, style: { flex: '1 0 45%', padding: '5px', borderRadius: '6px', background: d.showAnalysis ? '#34d39933' : 'rgba(255,255,255,0.05)', color: d.showAnalysis ? '#34d399' : '#94a3b8', border: d.showAnalysis ? '1px solid #34d39944' : '1px solid transparent', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' } }, '\u26A1 Analyze'),
                h('button', { onClick: function() { upd('showDeriv', !d.showDeriv); if (!d.showDeriv) { upd('_usedDeriv', true); if (d.derivX == null) upd('derivX', 0); } }, style: { flex: '1 0 45%', padding: '5px', borderRadius: '6px', background: d.showDeriv ? '#fb923c33' : 'rgba(255,255,255,0.05)', color: d.showDeriv ? '#fb923c' : '#94a3b8', border: d.showDeriv ? '1px solid #fb923c44' : '1px solid transparent', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' } }, "\u2202 f'(x)"),
                h('button', { onClick: function() { upd('showSliders', !showSliders); if (!showSliders) { upd('_usedSliders', true); if (d.sliderA == null) upd('sliderA', 1); if (d.sliderB == null) upd('sliderB', 0); if (d.sliderC == null) upd('sliderC', 0); } }, style: { flex: '1 0 45%', padding: '5px', borderRadius: '6px', background: showSliders ? '#a78bfa33' : 'rgba(255,255,255,0.05)', color: showSliders ? '#a78bfa' : '#94a3b8', border: showSliders ? '1px solid #a78bfa44' : '1px solid transparent', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' } }, '\uD83C\uDFA8 Sliders')
              ),
              // Zoom presets
              h('div', { style: { padding: '6px 12px 10px', borderTop: '1px solid rgba(99,102,241,0.1)' } },
                h('div', { style: { fontSize: '9px', color: '#64748b', marginBottom: '4px', fontWeight: 'bold' } }, 'ZOOM PRESETS'),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '3px' } },
                  ZOOM_PRESETS.map(function(z) {
                    return h('button', { key: z.name, onClick: function() { SOUNDS.zoomPreset(); upd('window', { xmin: z.xmin, xmax: z.xmax, ymin: z.ymin, ymax: z.ymax }); }, style: { padding: '3px 7px', borderRadius: '4px', background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)', fontSize: '9px', cursor: 'pointer' } }, z.name);
                  })
                )
              ),
              // Sliders
              showSliders ? h('div', { style: { padding: '8px 12px', borderTop: '1px solid rgba(99,102,241,0.1)', background: 'rgba(167,139,250,0.06)' } },
                h('div', { style: { fontSize: '9px', color: '#a78bfa', fontWeight: 'bold', marginBottom: '6px' } }, '\uD83C\uDFA8 SLIDERS \u2014 Use a, b, c'),
                ['a', 'b', 'c'].map(function(p) {
                  var key = 'slider' + p.toUpperCase(); var val = d[key] != null ? d[key] : (p === 'a' ? 1 : 0);
                  return h('div', { key: p, style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' } },
                    h('span', { style: { fontFamily: 'monospace', fontWeight: 'bold', color: '#c4b5fd', fontSize: '12px', width: '16px' } }, p),
                    h('input', { type: 'range', min: -10, max: 10, step: 0.1, value: val, onChange: function(e) { upd(key, parseFloat(e.target.value)); }, style: { flex: 1, accentColor: '#a78bfa' } }),
                    h('span', { style: { fontFamily: 'monospace', fontSize: '11px', color: '#e2e8f0', minWidth: '36px', textAlign: 'right', fontWeight: 'bold' } }, Number(val.toFixed(1)))
                  );
                })
              ) : null,
              // Derivative slider
              d.showDeriv ? h('div', { style: { padding: '8px 12px', borderTop: '1px solid rgba(99,102,241,0.1)', background: 'rgba(251,146,60,0.06)' } },
                h('div', { style: { fontSize: '9px', color: '#fb923c', fontWeight: 'bold', marginBottom: '4px' } }, '\u2202 TANGENT to y\u2081'),
                h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
                  h('span', { style: { fontSize: '10px', color: '#94a3b8' } }, 'x='),
                  h('input', { type: 'range', min: win.xmin, max: win.xmax, step: (win.xmax - win.xmin) / 200, value: d.derivX != null ? d.derivX : 0, onChange: function(e) { upd('derivX', parseFloat(e.target.value)); }, style: { flex: 1, accentColor: '#fb923c' } }),
                  h('span', { style: { fontFamily: 'monospace', fontSize: '11px', color: '#fb923c', fontWeight: 'bold' } }, d.derivX != null ? Number(d.derivX.toPrecision(4)) : '0')
                )
              ) : null,
              // Analysis results
              d.showAnalysis ? h('div', { style: { padding: '8px 12px', borderTop: '1px solid rgba(99,102,241,0.1)', background: 'rgba(52,211,153,0.06)' } },
                h('div', { style: { fontSize: '9px', color: '#34d399', fontWeight: 'bold', marginBottom: '4px' } }, '\u26A1 ANALYSIS'),
                h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
                  h('div', { style: { flex: 1 } },
                    h('div', { style: { fontSize: '9px', color: '#34d399', fontWeight: 'bold' } }, 'Zeros'),
                    (d._zeros && d._zeros.length > 0) ? d._zeros.map(function(z, zi) { return h('div', { key: zi, style: { fontSize: '10px', fontFamily: 'monospace', color: '#a7f3d0' } }, 'x=' + Number(z.x.toPrecision(5))); }) : h('div', { style: { fontSize: '10px', color: '#64748b' } }, 'None')
                  ),
                  h('div', { style: { flex: 1 } },
                    h('div', { style: { fontSize: '9px', color: '#f472b6', fontWeight: 'bold' } }, 'Intersections'),
                    (d._intersections && d._intersections.length > 0) ? d._intersections.map(function(pt, pi) { return h('div', { key: pi, style: { fontSize: '10px', fontFamily: 'monospace', color: '#f9a8d4' } }, '(' + Number(pt.x.toPrecision(4)) + ',' + Number(pt.y.toPrecision(4)) + ')'); }) : h('div', { style: { fontSize: '10px', color: '#64748b' } }, 'Need 2+ funcs')
                  )
                )
              ) : null
            ),

            // Center — Canvas
            h('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' } },
              h('canvas', { ref: canvasRef, style: { width: '100%', flex: 1, background: '#0f172a', cursor: d.traceMode ? 'crosshair' : 'default' },
                onMouseMove: function(e) { if (!d.traceMode) return; var rect = e.currentTarget.getBoundingClientRect(); var px = (e.clientX - rect.left) / rect.width * (e.currentTarget.width / (window.devicePixelRatio || 1)); if (e.currentTarget._toMathX) upd('traceX', e.currentTarget._toMathX(px)); },
                onMouseLeave: function() { if (d.traceMode) upd('traceX', null); } }),
              showWindow ? h('div', { style: { padding: '8px 12px', background: 'rgba(30,27,75,0.9)', borderTop: '1px solid rgba(99,102,241,0.2)', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } },
                h('span', { style: { fontSize: '10px', color: '#818cf8', fontWeight: 'bold' } }, 'WINDOW:'),
                ['xmin', 'xmax', 'ymin', 'ymax'].map(function(k) {
                  return h('label', { key: k, style: { display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: '#94a3b8' } }, k + ':', h('input', { type: 'number', value: win[k], onChange: function(e) { var nw = Object.assign({}, win); nw[k] = parseFloat(e.target.value) || 0; upd('window', nw); }, style: { width: '50px', padding: '2px 4px', borderRadius: '4px', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.1)', color: '#e2e8f0', fontFamily: 'monospace', fontSize: '10px' } }));
                })
              ) : null,
              showTable ? h('div', { style: { maxHeight: '150px', overflowY: 'auto', borderTop: '1px solid rgba(99,102,241,0.2)', background: 'rgba(15,23,42,0.95)' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderBottom: '1px solid rgba(99,102,241,0.1)' } },
                  h('span', { style: { fontSize: '10px', fontWeight: 'bold', color: '#818cf8' } }, '\uD83D\uDCCA TABLE'),
                  h('label', { style: { fontSize: '9px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '3px' } }, 'Start:', h('input', { type: 'number', value: tableX, onChange: function(e) { upd('tableX', parseFloat(e.target.value) || 0); }, style: { width: '40px', padding: '1px 3px', borderRadius: '3px', border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(99,102,241,0.1)', color: '#e2e8f0', fontFamily: 'monospace', fontSize: '9px' } })),
                  h('label', { style: { fontSize: '9px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '3px' } }, 'Step:', h('input', { type: 'number', value: tableStep, onChange: function(e) { upd('tableStep', parseFloat(e.target.value) || 1); }, style: { width: '40px', padding: '1px 3px', borderRadius: '3px', border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(99,102,241,0.1)', color: '#e2e8f0', fontFamily: 'monospace', fontSize: '9px' } }))
                ),
                h('table', { style: { width: '100%', fontSize: '11px', fontFamily: 'monospace', borderCollapse: 'collapse' } },
                  h('thead', null, h('tr', null, h('th', { style: { padding: '3px 10px', textAlign: 'right', color: '#818cf8', fontWeight: 'bold', borderBottom: '1px solid rgba(99,102,241,0.15)' } }, 'x'), h('th', { style: { padding: '3px 10px', textAlign: 'right', color: funcs[0] ? funcs[0].color : '#38bdf8', fontWeight: 'bold', borderBottom: '1px solid rgba(99,102,241,0.15)' } }, 'y\u2081'))),
                  h('tbody', null, tableRows.map(function(r, ri) { return h('tr', { key: ri, style: { background: ri % 2 === 0 ? 'transparent' : 'rgba(99,102,241,0.04)' } }, h('td', { style: { padding: '2px 10px', textAlign: 'right', color: '#94a3b8' } }, r.x), h('td', { style: { padding: '2px 10px', textAlign: 'right', color: '#e2e8f0' } }, r.y)); }))
                )
              ) : null
            ),

            // Right sidebar
            h('div', { style: { width: '230px', borderLeft: '1px solid rgba(99,102,241,0.15)', display: 'flex', flexDirection: 'column', background: 'rgba(15,23,42,0.8)' } },
              h('div', { style: { display: 'flex', borderBottom: '1px solid rgba(99,102,241,0.1)' } },
                [{ id: 'coach', label: '\uD83D\uDCA1 Coach' }, { id: 'challenge', label: '\uD83C\uDFAF Tasks' }, { id: 'ai', label: '\uD83E\uDD16 AI' }, { id: 'badges', label: '\uD83C\uDFC5' }].map(function(st) {
                  var active = (d._sideTab || 'coach') === st.id;
                  return h('button', { key: st.id, onClick: function() { upd('_sideTab', st.id); }, style: { flex: 1, padding: '8px 4px', fontSize: '9px', fontWeight: 'bold', color: active ? '#a5b4fc' : '#64748b', background: active ? 'rgba(99,102,241,0.1)' : 'transparent', border: 'none', borderBottom: active ? '2px solid #818cf8' : '2px solid transparent', cursor: 'pointer' } }, st.label);
                })
              ),
              // Coach
              (d._sideTab || 'coach') === 'coach' ? h('div', { style: { flex: 1, overflowY: 'auto', padding: '8px' } },
                currentTips.map(function(tip, i) {
                  return h('div', { key: i, style: { padding: '10px', marginBottom: '6px', borderRadius: '10px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.12)' } },
                    h('div', { style: { fontWeight: 'bold', fontSize: '12px', marginBottom: '4px', color: '#a5b4fc' } }, tip.icon + ' ' + tip.title),
                    h('div', { style: { fontSize: '11px', lineHeight: '1.5', color: '#cbd5e1' } }, tip.text),
                    h('button', { onClick: function() { speakText(tip.text, callTTS); }, style: { marginTop: '4px', background: 'none', border: 'none', color: '#818cf8', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold' } }, '\uD83D\uDD0A Read aloud')
                  );
                })
              ) : null,
              // Challenges
              (d._sideTab || 'coach') === 'challenge' ? h('div', { style: { flex: 1, overflowY: 'auto', padding: '8px' } },
                availableChallenges.map(function(ch, ci) {
                  var isActive = d.activeChallenge === ci;
                  return h('div', { key: ci, onClick: function() { upd('activeChallenge', isActive ? -1 : ci); }, style: { padding: '10px', marginBottom: '6px', borderRadius: '10px', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.15)', cursor: 'pointer' } },
                    h('div', { style: { fontSize: '9px', color: '#a78bfa', fontWeight: 'bold', marginBottom: '3px' } }, ch.topic),
                    h('div', { style: { fontSize: '11px', lineHeight: '1.5', color: '#e2e8f0', marginBottom: '4px' } }, ch.prompt),
                    isActive ? h('div', null,
                      h('div', { style: { fontSize: '10px', color: '#fbbf24', background: 'rgba(251,191,36,0.1)', padding: '6px 8px', borderRadius: '6px', marginTop: '4px' } }, '\uD83D\uDCA1 ' + ch.hint),
                      h('button', { onClick: function(e) { e.stopPropagation(); SOUNDS.quizCorrect(); updMulti({ _challengesCompleted: (d._challengesCompleted || 0) + 1, activeChallenge: -1 }); if (addToast) addToast('\u2705 Challenge done! +5 XP'); if (awardStemXP) awardStemXP(5); }, style: { marginTop: '6px', padding: '4px 12px', borderRadius: '6px', background: '#22c55e', color: '#fff', border: 'none', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' } }, '\u2705 Complete')
                    ) : null
                  );
                })
              ) : null,
              // AI
              (d._sideTab || 'coach') === 'ai' ? h('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', padding: '8px' } },
                h('div', { style: { flex: 1, overflowY: 'auto', marginBottom: '8px' } },
                  aiMessages.length === 0 ? h('div', { style: { textAlign: 'center', padding: '20px 0' } }, h('div', { style: { fontSize: '24px', marginBottom: '8px' } }, '\uD83E\uDD16'), h('p', { style: { fontSize: '11px', color: '#64748b' } }, 'Ask about graphing or math!')) : null,
                  aiMessages.map(function(msg, i) {
                    return h('div', { key: i, style: { display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: '6px' } },
                      h('div', { style: { maxWidth: '85%', padding: '6px 10px', borderRadius: '10px', fontSize: '11px', lineHeight: '1.5', background: msg.role === 'user' ? '#6366f1' : 'rgba(99,102,241,0.1)', color: msg.role === 'user' ? '#fff' : '#cbd5e1' } },
                        msg.text,
                        msg.role !== 'user' ? h('button', { onClick: function() { speakText(msg.text, callTTS); }, style: { marginLeft: '6px', background: 'none', border: 'none', color: '#818cf8', fontSize: '10px', cursor: 'pointer' } }, '\uD83D\uDD0A') : null
                      ));
                  }),
                  aiLoading ? h('div', { style: { fontSize: '11px', color: '#64748b', fontStyle: 'italic' } }, 'Thinking...') : null
                ),
                h('div', { style: { display: 'flex', gap: '4px' } },
                  h('input', { type: 'text', value: aiInput, onChange: function(e) { upd('aiInput', e.target.value); }, onKeyDown: function(e) { if (e.key === 'Enter' && aiInput.trim()) handleAiQuestion(aiInput.trim()); }, placeholder: 'Ask about math...', style: { flex: 1, padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.08)', color: '#e2e8f0', fontSize: '11px', outline: 'none' } }),
                  h('button', { onClick: function() { if (aiInput.trim()) handleAiQuestion(aiInput.trim()); }, style: { padding: '6px 10px', borderRadius: '6px', background: '#6366f1', color: '#fff', border: 'none', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' } }, '\u2191')
                )
              ) : null,
              // Badges
              (d._sideTab || 'coach') === 'badges' ? h('div', { style: { flex: 1, overflowY: 'auto', padding: '8px' } },
                h('div', { style: { fontSize: '10px', color: '#818cf8', fontWeight: 'bold', marginBottom: '8px' } }, '\uD83C\uDFC5 ' + badges.length + '/' + BADGES.length + ' Earned'),
                BADGES.map(function(b) {
                  var earned = badges.indexOf(b.id) >= 0;
                  return h('div', { key: b.id, style: { padding: '8px', marginBottom: '4px', borderRadius: '8px', background: earned ? 'rgba(167,139,250,0.12)' : 'rgba(255,255,255,0.03)', border: earned ? '1px solid rgba(167,139,250,0.3)' : '1px solid rgba(99,102,241,0.08)', opacity: earned ? 1 : 0.5 } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                      h('span', { style: { fontSize: '16px' } }, earned ? b.icon : '\uD83D\uDD12'),
                      h('div', null, h('div', { style: { fontSize: '11px', fontWeight: 'bold', color: earned ? '#c4b5fd' : '#64748b' } }, b.label), h('div', { style: { fontSize: '9px', color: '#64748b' } }, b.desc)),
                      earned ? h('span', { style: { marginLeft: 'auto', fontSize: '9px', color: '#a78bfa', fontWeight: 'bold' } }, '+' + b.xp + ' XP') : null
                    ));
                })
              ) : null
            )
          )
        );
      })();
    }
  });

})();
