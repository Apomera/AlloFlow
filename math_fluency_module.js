// ═══════════════════════════════════════════════════════════════
// math_fluency_module.js — Math Fluency CBM Probe Module v1.0.0
// Standalone CDN module for AlloFlow (Curriculum-Based Measurement)
// ═══════════════════════════════════════════════════════════════
(function () {
  'use strict';
  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-math-fluency')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-math-fluency';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();


  // WCAG 2.1 AA: Accessibility CSS injection
  if (!document.getElementById('mf-a11y-css')) {
    var mfA11yStyle = document.createElement('style');
    mfA11yStyle.id = 'mf-a11y-css';
    mfA11yStyle.textContent = [
      '@media (prefers-reduced-motion: reduce) { .fixed.inset-0 *, .fixed.inset-0 *::before, .fixed.inset-0 *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } }',
      '.fixed.inset-0 button:focus-visible, .fixed.inset-0 input:focus-visible, .fixed.inset-0 [tabindex]:focus-visible { outline: 2px solid #6366f1 !important; outline-offset: 2px !important; border-radius: 4px; }',
      '.fixed.inset-0 :focus:not(:focus-visible) { outline: none !important; }',
      '.fixed.inset-0 .text-slate-400 { color: #64748b !important; }',
    ].join('\n');
    document.head.appendChild(mfA11yStyle);
  }

  // ── Grade-Normed DCPM Benchmarks (Research-Based) ──
  // Sources: AIMSweb, NWEA, Fuchs & Fuchs (2004)
  // Format: { [grade]: { [operation]: { fall, winter, spring } } }
  var BENCHMARKS = {
    'K':  { add: { fall: 5,  winter: 10, spring: 15 }, sub: { fall: 3,  winter: 8,  spring: 12 } },
    '1':  { add: { fall: 10, winter: 20, spring: 30 }, sub: { fall: 8,  winter: 15, spring: 25 }, mul: { fall: 0, winter: 0, spring: 5 },  div: { fall: 0, winter: 0, spring: 3 } },
    '2':  { add: { fall: 20, winter: 30, spring: 40 }, sub: { fall: 15, winter: 25, spring: 35 }, mul: { fall: 5,  winter: 10, spring: 20 }, div: { fall: 3, winter: 8,  spring: 15 } },
    '3':  { add: { fall: 30, winter: 40, spring: 50 }, sub: { fall: 25, winter: 35, spring: 45 }, mul: { fall: 15, winter: 25, spring: 35 }, div: { fall: 10, winter: 18, spring: 25 } },
    '4':  { add: { fall: 40, winter: 50, spring: 60 }, sub: { fall: 35, winter: 45, spring: 55 }, mul: { fall: 25, winter: 35, spring: 45 }, div: { fall: 18, winter: 25, spring: 35 } },
    '5':  { add: { fall: 50, winter: 55, spring: 65 }, sub: { fall: 45, winter: 50, spring: 60 }, mul: { fall: 35, winter: 45, spring: 55 }, div: { fall: 25, winter: 35, spring: 45 } },
    '6':  { add: { fall: 55, winter: 60, spring: 70 }, sub: { fall: 50, winter: 55, spring: 65 }, mul: { fall: 40, winter: 50, spring: 60 }, div: { fall: 30, winter: 40, spring: 50 } },
    '7':  { add: { fall: 60, winter: 65, spring: 70 }, sub: { fall: 55, winter: 60, spring: 65 }, mul: { fall: 45, winter: 55, spring: 65 }, div: { fall: 35, winter: 45, spring: 55 } },
    '8':  { add: { fall: 65, winter: 70, spring: 75 }, sub: { fall: 60, winter: 65, spring: 70 }, mul: { fall: 50, winter: 60, spring: 70 }, div: { fall: 40, winter: 50, spring: 60 } }
  };

  function getSeason() {
    var m = new Date().getMonth();
    if (m >= 7 && m <= 10) return 'fall';
    if (m >= 11 || m <= 2) return 'winter';
    return 'spring';
  }

  function getBenchmark(grade, operation) {
    var raw = String(grade || '3').trim();
    if (raw.toUpperCase() === 'K') { var g = 'K'; }
    else { var g = raw.replace(/\D/g, '') || '3'; if (g === '0') g = 'K'; }
    var gradeData = BENCHMARKS[g] || BENCHMARKS['3'];
    var op = operation === 'mixed' ? 'add' : operation;
    var opData = gradeData[op] || gradeData.add || { fall: 30, winter: 40, spring: 50 };
    var season = getSeason();
    return {
      target: opData[season],
      season: season,
      grade: g,
      frustration: Math.round(opData[season] * 0.5),
      strategic: Math.round(opData[season] * 0.75)
    };
  }

  function getBenchmarkLabel(dcpm, benchmark) {
    if (dcpm >= benchmark.target) return { label: 'At/Above Benchmark', color: '#16a34a', emoji: '🟢', tier: 'benchmark' };
    if (dcpm >= benchmark.strategic) return { label: 'Strategic (Approaching)', color: '#d97706', emoji: '🟡', tier: 'strategic' };
    return { label: 'Intensive (Below)', color: '#dc2626', emoji: '🔴', tier: 'intensive' };
  }

  // ── Error Analysis ──
  function analyzeErrors(problems) {
    var errors = problems.filter(function (p) { return p.studentAnswer !== null && p.studentAnswer !== 'SKIP' && !p.correct; });
    var skips = problems.filter(function (p) { return p.studentAnswer === 'SKIP'; });
    var opErrors = {};
    var factErrors = [];

    errors.forEach(function (p) {
      var opName = p.op === 'add' ? 'Addition' : p.op === 'sub' ? 'Subtraction' : p.op === 'mul' ? 'Multiplication' : 'Division';
      if (!opErrors[opName]) opErrors[opName] = 0;
      opErrors[opName]++;
      factErrors.push(p.a + ' ' + p.symbol + ' ' + p.b + ' = ' + p.answer + ' (answered ' + p.studentAnswer + ')');
    });

    var patterns = [];
    // Detect operation weakness
    var sortedOps = Object.entries(opErrors).sort(function (a, b) { return b[1] - a[1]; });
    if (sortedOps.length > 0) {
      patterns.push('Most errors in ' + sortedOps[0][0] + ' (' + sortedOps[0][1] + ' errors)');
    }
    // Detect specific hard facts
    if (factErrors.length > 0 && factErrors.length <= 8) {
      patterns.push('Specific facts to practice: ' + factErrors.slice(0, 5).join(', '));
    } else if (factErrors.length > 8) {
      patterns.push(factErrors.length + ' errors total — consider reducing difficulty level');
    }
    if (skips.length > 3) {
      patterns.push(skips.length + ' problems skipped — may indicate frustration or uncertainty');
    }

    return { errors: errors.length, skips: skips.length, patterns: patterns, factErrors: factErrors, opErrors: opErrors };
  }

  // ── Sound Effects (Web Audio API — no external files) ──
  var _audioCtx = null;
  function getAudioCtx() {
    if (!_audioCtx) {
      try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* silent */ }
    }
    return _audioCtx;
  }

  function playTone(freq, duration, type, vol) {
    var ctx = getAudioCtx();
    if (!ctx) return;
    try {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.value = vol || 0.15;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (duration || 0.15));
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + (duration || 0.15));
    } catch (e) { /* silent */ }
  }

  function playCorrect() { playTone(880, 0.1, 'sine', 0.12); setTimeout(function () { playTone(1320, 0.12, 'sine', 0.1); }, 80); }
  function playIncorrect() { playTone(220, 0.2, 'triangle', 0.1); }
  function playTick() { playTone(1000, 0.05, 'sine', 0.06); }
  function playTimeWarning() { playTone(660, 0.15, 'square', 0.08); }

  // ── Problem Generator ──
  function generateProblems(operation, difficulty, count) {
    var problems = [];
    var used = {};
    var maxOp = difficulty === 'single' ? 12 : (difficulty === 'double' ? 99 : 12);
    var minOp = difficulty === 'double' ? 10 : 0;
    for (var attempt = 0; attempt < 500 && problems.length < count; attempt++) {
      var ops = operation === 'mixed' ? ['add', 'sub', 'mul', 'div'] : [operation];
      var op = ops[Math.floor(Math.random() * ops.length)];
      var a, b, answer;
      if (op === 'add') {
        a = Math.floor(Math.random() * (maxOp - minOp + 1)) + minOp;
        b = Math.floor(Math.random() * (maxOp - minOp + 1)) + minOp;
        answer = a + b;
      } else if (op === 'sub') {
        a = Math.floor(Math.random() * (maxOp - minOp + 1)) + minOp;
        b = Math.floor(Math.random() * (a + 1));
        answer = a - b;
      } else if (op === 'mul') {
        var mulMax = difficulty === 'double' ? 15 : 12;
        a = Math.floor(Math.random() * (mulMax + 1));
        b = Math.floor(Math.random() * 13);
        answer = a * b;
      } else {
        b = Math.floor(Math.random() * 12) + 1;
        answer = Math.floor(Math.random() * 13);
        a = b * answer;
      }
      var key = a + '_' + op + '_' + b;
      if (!used[key]) {
        used[key] = true;
        var symbol = op === 'add' ? '+' : op === 'sub' ? '\u2212' : op === 'mul' ? '\u00d7' : '\u00f7';
        problems.push({ a: a, b: b, op: op, symbol: symbol, answer: answer, studentAnswer: null, correct: null });
      }
    }
    return problems;
  }

  function countDigits(n) { return Math.max(1, String(Math.abs(n)).length); }

  // ── React Component ──
  function MathFluencyPanel(props) {
    var React = window.React;
    var h = React.createElement;
    var useState = React.useState;
    var useEffect = React.useEffect;
    var useRef = React.useRef;
    var useCallback = React.useCallback;

    // Props from parent
    var gradeLevel = props.gradeLevel || '3';
    var t = props.t || function (k) { return k; };
    var addToast = props.addToast || function () { };
    var onProbeComplete = props.onProbeComplete || function () { };
    var storageDB = props.storageDB;
    var handleScoreUpdate = props.handleScoreUpdate || function () { };

    // State
    var _a = useState(false), active = _a[0], setActive = _a[1];
    var _b = useState('add'), operation = _b[0], setOperation = _b[1];
    var _c = useState('single'), difficulty = _c[0], setDifficulty = _c[1];
    var _d = useState(120), timeLimit = _d[0], setTimeLimit = _d[1];
    var _e = useState(120), problemCount = _e[0], setProblemCount = _e[1];
    var _f = useState([]), problems = _f[0], setProblems = _f[1];
    var _g = useState(0), currentIndex = _g[0], setCurrentIndex = _g[1];
    var _h = useState(0), timer = _h[0], setTimer = _h[1];
    var _i = useState(null), results = _i[0], setResults = _i[1];
    var _j = useState([]), history = _j[0], setHistory = _j[1];
    var _k = useState(''), studentInput = _k[0], setStudentInput = _k[1];
    var _l = useState(true), soundEnabled = _l[0], setSoundEnabled = _l[1];
    var _m = useState(false), autoAdvance = _m[0], setAutoAdvance = _m[1];
    var _n = useState(null), lastFeedback = _n[0], setLastFeedback = _n[1];

    var inputRef = useRef(null);
    var timerRef = useRef(null);
    var timerValueRef = useRef(timer);
    timerValueRef.current = timer;

    // Load history from storage
    useEffect(function () {
      if (!storageDB) return;
      storageDB.get('allo_fluency_history').then(function (saved) {
        if (saved && Array.isArray(saved)) setHistory(saved);
      }).catch(function () { });
    }, []);

    // Save history to storage
    useEffect(function () {
      if (!storageDB || history.length === 0) return;
      storageDB.set('allo_fluency_history', history).catch(function () { });
    }, [history]);

    // ── Finish probe ──
    var finishProbe = useCallback(function () {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      setActive(false);
      setProblems(function (prev) {
        var attempted = prev.filter(function (p) { return p.studentAnswer !== null; });
        var correct = attempted.filter(function (p) { return p.correct; });
        var totalDigitsCorrect = correct.reduce(function (s, p) { return s + countDigits(p.answer); }, 0);
        var elapsedSeconds = timeLimit - timerValueRef.current;
        var elapsedMinutes = Math.max(0.1, elapsedSeconds / 60);
        var dcpm = Math.round(totalDigitsCorrect / elapsedMinutes);
        var accuracy = attempted.length > 0 ? Math.round((correct.length / attempted.length) * 100) : 0;
        var benchmark = getBenchmark(gradeLevel, operation);
        var benchmarkResult = getBenchmarkLabel(dcpm, benchmark);
        var errorAnalysis = analyzeErrors(prev);

        var result = {
          date: new Date().toISOString(),
          operation: operation,
          difficulty: difficulty,
          dcpm: dcpm,
          accuracy: accuracy,
          totalCorrect: correct.length,
          totalAttempted: attempted.length,
          totalDigitsCorrect: totalDigitsCorrect,
          timeLimit: timeLimit,
          elapsedSeconds: elapsedSeconds,
          benchmark: benchmark,
          benchmarkResult: benchmarkResult,
          errorAnalysis: errorAnalysis
        };
        setResults(result);
        setHistory(function (h) { return h.concat([result]); });

        // Notify parent for main history
        onProbeComplete({
          id: 'fluency-probe-' + Date.now(),
          type: 'math-fluency-probe',
          title: 'Math Fluency Probe \u2014 ' + operation + ' (' + difficulty + ')',
          timestamp: Date.now(),
          data: result
        });

        // Award XP based on performance
        var xp = Math.round(dcpm / 10);
        if (xp > 0) handleScoreUpdate(xp, 'Math Fluency', 'fluency-probe');

        return prev;
      });
    }, [timeLimit, operation, difficulty, gradeLevel, onProbeComplete, handleScoreUpdate]);

    // ── Start probe ──
    var startProbe = useCallback(function () {
      var p;
      var tl = timeLimit;
      if (window.MATH_PROBE_BANKS) {
        var bank = (window.MATH_PROBE_BANKS[gradeLevel || '1'] || {})[('A')];
        if (bank && bank.problems) {
          p = bank.problems.map(function (prob) { return Object.assign({}, prob, { studentAnswer: null, correct: null }); });
          if (bank.timeLimit) tl = bank.timeLimit;
        }
      }
      if (!p) p = generateProblems(operation, difficulty, problemCount);

      setProblems(p);
      setCurrentIndex(0);
      setResults(null);
      setStudentInput('');
      setTimer(tl);
      setLastFeedback(null);
      setActive(true);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(function () {
        setTimer(function (prev) {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            timerRef.current = null;
            setTimeout(finishProbe, 0);
            return 0;
          }
          // Warning sound at 10 seconds
          if (prev === 11 && soundEnabled) playTimeWarning();
          return prev - 1;
        });
      }, 1000);

      setTimeout(function () { if (inputRef.current) inputRef.current.focus(); }, 100);
    }, [timeLimit, operation, difficulty, problemCount, gradeLevel, finishProbe, soundEnabled]);

    // ── Submit answer ──
    var submitAnswer = useCallback(function (skip) {
      var isSkip = skip === true;
      var currentAnswer = studentInput;

      setProblems(function (prev) {
        var updated = prev.slice();
        var idx = currentIndex;
        if (idx < updated.length) {
          var studentVal = isSkip ? null : parseInt(currentAnswer);
          var isCorrect = !isSkip && (studentVal === updated[idx].answer);
          updated[idx] = Object.assign({}, updated[idx], {
            studentAnswer: isSkip ? 'SKIP' : studentVal,
            correct: isSkip ? false : isCorrect
          });

          // Sound effects
          if (soundEnabled && !isSkip) {
            if (isCorrect) playCorrect(); else playIncorrect();
          }

          // Visual feedback
          setLastFeedback(isSkip ? 'skip' : (isCorrect ? 'correct' : 'wrong'));
          setTimeout(function () { setLastFeedback(null); }, 400);
        }
        return updated;
      });

      setStudentInput('');
      setCurrentIndex(function (prev) {
        var next = prev + 1;
        if (next >= problems.length) {
          setTimeout(finishProbe, 50);
        }
        return next;
      });
      setTimeout(function () { if (inputRef.current) inputRef.current.focus(); }, 50);
    }, [currentIndex, studentInput, problems.length, soundEnabled, finishProbe]);

    // Auto-advance on correct
    useEffect(function () {
      if (!autoAdvance || !active || studentInput === '') return;
      var currentProblem = problems[currentIndex];
      if (!currentProblem) return;
      var val = parseInt(studentInput);
      if (!isNaN(val) && val === currentProblem.answer) {
        setTimeout(function () { submitAnswer(false); }, 150);
      }
    }, [studentInput, autoAdvance, active, currentIndex]);

    // Keyboard shortcuts
    useEffect(function () {
      if (!active) return;
      function handleKey(e) {
        if (e.key === 'Escape') {
          e.preventDefault();
          if (timerRef.current) clearInterval(timerRef.current);
          finishProbe();
        } else if (e.key === 'Tab') {
          e.preventDefault();
          submitAnswer(true);
        }
      }
      window.addEventListener('keydown', handleKey);
      return function () { window.removeEventListener('keydown', handleKey); };
    }, [active, finishProbe, submitAnswer]);

    // Cleanup timer on unmount
    useEffect(function () {
      return function () {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      };
    }, []);

    // ── Icons ──
    var Play = window.Play || function () { return h('span', null, '\u25b6'); };
    var RefreshCw = window.RefreshCw || function () { return h('span', null, '\u21bb'); };
    var X = window.X || function () { return h('span', null, '\u2715'); };
    var Volume2 = window.Volume2 || function () { return h('span', null, '\ud83d\udd0a'); };
    var VolumeX = window.VolumeX || function () { return h('span', null, '\ud83d\udd07'); };
    var TrendingUp = window.TrendingUp || function () { return h('span', null, '\ud83d\udcc8'); };
    var Zap = window.Zap || function () { return h('span', null, '\u26a1'); };

    // ── Active probe overlay ──
    if (active && problems.length > 0 && currentIndex < problems.length) {
      var prob = problems[currentIndex];
      var correctCount = problems.filter(function (p) { return p.correct; }).length;
      var timerPct = (timer / timeLimit) * 100;
      var isLowTime = timer <= 10;

      var feedbackBg = lastFeedback === 'correct' ? 'rgba(34,197,94,0.15)'
        : lastFeedback === 'wrong' ? 'rgba(239,68,68,0.1)'
        : lastFeedback === 'skip' ? 'rgba(100,116,139,0.08)' : 'transparent';

      return h('div', {
        style: {
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'linear-gradient(135deg, #fffbeb 0%, #ffffff 50%, #fff7ed 100%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '16px', transition: 'background 0.3s', backgroundColor: feedbackBg
        }
      },
        // Timer bar
        h('div', { style: { width: '100%', maxWidth: '28rem', marginBottom: '2rem' } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' } },
            h('span', { style: { fontSize: '14px', fontWeight: 800, color: isLowTime ? '#dc2626' : '#b45309', animation: isLowTime ? 'pulse 1s infinite' : 'none' } },
              '\u23f1\ufe0f ' + Math.floor(timer / 60) + ':' + String(timer % 60).padStart(2, '0')),
            h('span', { style: { fontSize: '14px', fontWeight: 800, color: '#475569' } },
              '#' + (currentIndex + 1) + ' \u2022 \u2705 ' + correctCount)
          ),
          h('div', { style: { height: '12px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' } },
            h('div', { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', style: {
              height: '100%', borderRadius: '9999px', transition: 'width 1s linear',
              background: isLowTime ? 'linear-gradient(to right, #ef4444, #dc2626)' : 'linear-gradient(to right, #f59e0b, #f97316)',
              width: timerPct + '%'
            } })
          )
        ),
        // Problem card
        h('div', { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100',
          style: {
            background: '#fff', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.1)', border: '2px solid #fde68a',
            padding: '2rem 3rem', width: '100%', maxWidth: '28rem', textAlign: 'center'
          }
        },
          h('div', { style: { fontSize: 'clamp(2.5rem, 8vw, 3.5rem)', fontWeight: 900, color: '#1e293b', letterSpacing: '-1px', marginBottom: '2rem', fontFamily: 'ui-monospace, monospace' } },
            prob.a + ' ' + prob.symbol + ' ' + prob.b + ' = ?'),
          h('form', { onSubmit: function (e) { e.preventDefault(); submitAnswer(false); } },
            h('input', {
              ref: inputRef, type: 'number', inputMode: 'numeric', value: studentInput,
              onChange: function (e) { setStudentInput(e.target.value); },
              autoFocus: true, 'aria-label': 'Your answer',
              style: {
                width: '140px', textAlign: 'center', fontSize: '2rem', fontWeight: 800,
                borderBottom: '4px solid #f59e0b', background: 'transparent',
                padding: '8px 0', margin: '0 auto', display: 'block', borderTop: 'none', borderLeft: 'none', borderRight: 'none'
              }
            }),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { display: 'flex', gap: '12px', marginTop: '1.5rem', justifyContent: 'center' } },
              h('button', { "aria-label": "Enter",
                type: 'submit',
                style: {
                  padding: '12px 32px', background: 'linear-gradient(to right, #10b981, #22c55e)',
                  color: '#fff', fontWeight: 800, borderRadius: '12px', fontSize: '1.1rem',
                  border: 'none', cursor: 'pointer', boxShadow: '0 4px 15px rgba(16,185,129,0.3)'
                }
              }, 'Enter \u21b5'),
              h('button', { "aria-label": "Skip",
                type: 'button', onClick: function () { submitAnswer(true); },
                style: {
                  padding: '12px 24px', background: '#e2e8f0', color: '#64748b',
                  fontWeight: 800, borderRadius: '12px', fontSize: '1.1rem',
                  border: 'none', cursor: 'pointer'
                }
              }, 'Skip \u2192')
            )
          ),
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { marginTop: '12px', fontSize: '11px', color: '#64748b' } },
            'Tab = Skip \u2022 Esc = End Early' + (autoAdvance ? ' \u2022 Auto-advance ON' : ''))
        ),
        // End early button
        h('button', { "aria-label": "End probe early",
          onClick: function () { if (timerRef.current) clearInterval(timerRef.current); finishProbe(); },
          style: { marginTop: '1.5rem', fontSize: '14px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }
        }, 'End probe early')
      );
    }

    // ── Results display ──
    if (results && !active) {
      var bm = results.benchmarkResult;
      var ea = results.errorAnalysis;
      var maxDcpm = Math.max.apply(null, history.map(function (x) { return x.dcpm; }).concat([1]));

      return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },
        style: {
          background: 'linear-gradient(135deg, #fffbeb, #fff7ed)', borderRadius: '16px',
          border: '2px solid #fde68a', padding: '24px', marginBottom: '24px',
          animation: 'fadeIn 0.3s ease-out'
        }
      },
        // Header
        h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' } },
          h('h3', { style: { fontSize: '18px', fontWeight: 900, color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 } },
            '\ud83d\udcca Fluency Probe Results'),
          h('button', { "aria-label": "math_fluency action",
            onClick: function () { setResults(null); },
            style: { color: '#64748b', cursor: 'pointer', background: 'none', border: 'none', padding: '4px' }
          }, h(X, { size: 18 }))
        ),

        // Benchmark banner
        h('div', {
          style: {
            background: bm.color + '10', border: '2px solid ' + bm.color + '40',
            borderRadius: '12px', padding: '12px 16px', marginBottom: '16px',
            display: 'flex', alignItems: 'center', gap: '12px'
          }
        },
          h('span', { style: { fontSize: '24px' } }, bm.emoji),
          h('div', null,
            h('div', { style: { fontWeight: 800, color: bm.color, fontSize: '14px' } }, bm.label),
            h('div', { style: { fontSize: '12px', color: '#64748b' } },
              'Grade ' + results.benchmark.grade + ' ' + results.benchmark.season + ' target: ' + results.benchmark.target + ' DCPM')
          )
        ),

        // Metrics grid
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' } },
          [
            { val: results.dcpm, label: 'DCPM', sub: 'Digits Correct/Min', color: '#d97706' },
            { val: results.accuracy + '%', label: 'Accuracy', sub: '', color: '#16a34a' },
            { val: results.totalCorrect + '/' + results.totalAttempted, label: 'Correct', sub: '', color: '#2563eb' },
            { val: results.totalDigitsCorrect, label: 'Total Digits', sub: '', color: '#9333ea' }
          ].map(function (m, i) {
            return h('div', {
              key: i,
              style: { background: '#fff', borderRadius: '12px', padding: '16px', textAlign: 'center', border: '1px solid #fef3c7', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }
            },
              h('div', { style: { fontSize: '1.8rem', fontWeight: 900, color: m.color } }, m.val),
              h('div', { style: { fontSize: '12px', fontWeight: 700, color: '#64748b', marginTop: '4px' } }, m.label),
              m.sub ? h('div', { style: { fontSize: '10px', color: '#64748b' } }, m.sub) : null
            );
          })
        ),

        // Error Analysis
        ea.patterns.length > 0 ? h('div', {
          style: { background: '#fff', borderRadius: '12px', padding: '12px 16px', border: '1px solid #fef3c7', marginBottom: '16px' }
        },
          h('div', { style: { fontSize: '12px', fontWeight: 800, color: '#64748b', marginBottom: '8px' } },
            '\ud83d\udd0d Error Analysis'),
          ea.patterns.map(function (p, i) {
            return h('div', { key: i, style: { fontSize: '13px', color: '#475569', padding: '4px 0', borderBottom: i < ea.patterns.length - 1 ? '1px solid #f1f5f9' : 'none' } },
              '\u2022 ' + p);
          })
        ) : null,

        // DCPM Trend
        history.length >= 2 ? h('div', {
          style: { background: '#fff', borderRadius: '12px', padding: '12px', border: '1px solid #fef3c7', marginBottom: '16px' }
        },
          h('div', { style: { fontSize: '12px', fontWeight: 800, color: '#64748b', marginBottom: '8px' } },
            '\ud83d\udcc8 DCPM Trend (' + history.length + ' sessions)'),
          h('div', { style: { display: 'flex', alignItems: 'flex-end', gap: '4px', height: '64px' } },
            history.map(function (hItem, i) {
              var pct = (hItem.dcpm / maxDcpm) * 100;
              return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, key: i, style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' } },
                h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: '9px', fontWeight: 700, color: '#d97706' } }, hItem.dcpm),
                h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: {
                  width: '100%', background: 'linear-gradient(to top, #f59e0b, #fdba74)',
                  borderRadius: '4px 4px 0 0', height: Math.max(4, pct) + '%', minHeight: '4px'
                } })
              );
            })
          )
        ) : null,

        // Actions
        h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { display: 'flex', gap: '8px', marginTop: '16px' } },
          h('button', { "aria-label": "Clear History",
            onClick: startProbe,
            style: {
              flex: 1, padding: '10px', background: 'linear-gradient(to right, #f59e0b, #f97316)',
              color: '#fff', fontWeight: 800, borderRadius: '12px', fontSize: '14px',
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: '0 4px 12px rgba(245,158,11,0.3)'
            }
          }, h(RefreshCw, { size: 14 }), ' Run Again'),
          history.length > 0 ? h('button', { "aria-label": "Clear History",
            onClick: function () { setHistory([]); if (storageDB) storageDB.set('allo_fluency_history', []); addToast('Probe history cleared', 'info'); },
            style: {
              padding: '10px 16px', background: '#f1f5f9', color: '#64748b',
              fontWeight: 700, borderRadius: '12px', fontSize: '14px',
              border: 'none', cursor: 'pointer'
            }
          }, 'Clear History') : null
        )
      );
    }

    // ── Config UI (default state) ──
    return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },
      style: {
        padding: '16px', background: 'linear-gradient(135deg, #fffbeb, #fff7ed)',
        borderRadius: '12px', border: '1px solid #fde68a'
      }
    },
      // Header
      h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' } },
        h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { display: 'flex', alignItems: 'center', gap: '8px' } },
          h(Zap, { size: 16 }),
          h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontWeight: 800, fontSize: '14px', color: '#92400e' } }, '\u26a1 Math Fluency Probe')
        ),
        h('div', { 'aria-expanded': String(soundEnabled), role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { display: 'flex', gap: '6px' } },
          h('button', { 'aria-expanded': String(soundEnabled),
            onClick: function () { setSoundEnabled(!soundEnabled); },
            title: soundEnabled ? 'Mute sounds' : 'Enable sounds',
            'aria-label': soundEnabled ? 'Mute sound effects' : 'Enable sound effects',
            style: { padding: '4px 8px', borderRadius: '8px', border: '1px solid #fde68a', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }
          }, soundEnabled ? h(Volume2, { size: 14 }) : h(VolumeX, { size: 14 })),
          h('button', { 'aria-expanded': String(autoAdvance),
            onClick: function () { setAutoAdvance(!autoAdvance); },
            title: autoAdvance ? 'Disable auto-advance' : 'Enable auto-advance (moves to next on correct answer)',
            'aria-label': autoAdvance ? 'Disable auto-advance' : 'Enable auto-advance',
            style: {
              padding: '4px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
              border: '1px solid ' + (autoAdvance ? '#16a34a' : '#fde68a'),
              background: autoAdvance ? '#dcfce7' : '#fff',
              color: autoAdvance ? '#16a34a' : '#92400e'
            }
          }, '\u26a1 Auto')
        )
      ),

      // Config grid
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '12px' } },
        // Operation
        h('div', null,
          h('label', { style: { display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px', fontWeight: 600 } }, 'Operation'),
          h('select', {
            value: operation, onChange: function (e) { setOperation(e.target.value); },
            'aria-label': 'Math operation',
            style: { width: '100%', fontSize: '12px', padding: '6px 8px', borderRadius: '8px', border: '1px solid #d1d5db' }
          },
            h('option', { value: 'add' }, '\u2795 Addition'),
            h('option', { value: 'sub' }, '\u2796 Subtraction'),
            h('option', { value: 'mul' }, '\u2716\ufe0f Multiplication'),
            h('option', { value: 'div' }, '\u2797 Division'),
            h('option', { value: 'mixed' }, '\ud83d\udd00 Mixed')
          )
        ),
        // Difficulty
        h('div', null,
          h('label', { style: { display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px', fontWeight: 600 } }, 'Difficulty'),
          h('select', {
            value: difficulty, onChange: function (e) { setDifficulty(e.target.value); },
            'aria-label': 'Difficulty level',
            style: { width: '100%', fontSize: '12px', padding: '6px 8px', borderRadius: '8px', border: '1px solid #d1d5db' }
          },
            h('option', { value: 'single' }, 'Single Digit (0\u201312)'),
            h('option', { value: 'double' }, 'Double Digit (10\u201399)'),
            h('option', { value: 'mixed' }, 'Mixed')
          )
        ),
        // Timer
        h('div', null,
          h('label', { style: { display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px', fontWeight: 600 } }, 'Timer'),
          h('select', {
            value: timeLimit, onChange: function (e) { setTimeLimit(parseInt(e.target.value)); },
            'aria-label': 'Time limit',
            style: { width: '100%', fontSize: '12px', padding: '6px 8px', borderRadius: '8px', border: '1px solid #d1d5db' }
          },
            h('option', { value: 60 }, '60 seconds'),
            h('option', { value: 120 }, '120 seconds'),
            h('option', { value: 180 }, '180 seconds')
          )
        ),
        // Problem count
        h('div', null,
          h('label', { style: { display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px', fontWeight: 600 } }, '# of Problems'),
          h('select', {
            value: problemCount, onChange: function (e) { setProblemCount(parseInt(e.target.value)); },
            'aria-label': 'Number of problems',
            style: { width: '100%', fontSize: '12px', padding: '6px 8px', borderRadius: '8px', border: '1px solid #d1d5db' }
          },
            h('option', { value: 20 }, '20 (Quick Check)'),
            h('option', { value: 40 }, '40 (Short)'),
            h('option', { value: 60 }, '60 (Standard)'),
            h('option', { value: 80 }, '80 (Extended)'),
            h('option', { value: 120 }, '120 (Full CBM)'),
            h('option', { value: 150 }, '150 (Mastery)')
          )
        )
      ),

      // Grade benchmark preview
      (function () {
        var bm = getBenchmark(gradeLevel, operation);
        return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },
          style: { background: '#fff', borderRadius: '8px', padding: '8px 12px', marginBottom: '12px',
            border: '1px solid #fef3c7', fontSize: '12px', color: '#64748b' }
        },
          h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontWeight: 700 } }, '\ud83c\udfaf Grade ' + bm.grade + ' ' + bm.season + ' target: '),
          h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontWeight: 800, color: '#d97706' } }, bm.target + ' DCPM'),
          h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { marginLeft: '8px', fontSize: '11px' } },
            '(\ud83d\udfe2\u2265' + bm.target + ' \ud83d\udfe1\u2265' + bm.strategic + ' \ud83d\udd34<' + bm.strategic + ')')
        );
      })(),

      // Start button
      h('button', { "aria-label": "Start Probe",
        onClick: startProbe,
        style: {
          width: '100%', padding: '10px', background: 'linear-gradient(to right, #f59e0b, #f97316)',
          color: '#fff', fontWeight: 800, borderRadius: '12px', fontSize: '14px',
          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          boxShadow: '0 4px 15px rgba(245,158,11,0.3)'
        }
      }, h(Play, { size: 16 }), ' Start Fluency Probe'),
      h('p', { style: { fontSize: '11px', color: 'rgba(146,64,14,0.6)', textAlign: 'center', marginTop: '8px', margin: '8px 0 0' } },
        'Timed math fact drill \u2014 measures Digits Correct Per Minute (DCPM)')
    );
  }

  // ═══════════════════════════════════════════════════════════
  // ── FLUENCY MAZE MODE — Navigate a maze by solving math facts ──
  // Inspired by Aaron Pomeranz's dissertation research on fluency
  // maze assessment (USM, 2024)
  // ═══════════════════════════════════════════════════════════

  var CELL_SIZE = 52;
  var MAZE_SIZES = { small: { cols: 5, rows: 5, label: 'Small (5\u00d75)' }, medium: { cols: 7, rows: 7, label: 'Medium (7\u00d77)' }, large: { cols: 9, rows: 9, label: 'Large (9\u00d79)' } };

  function generateMaze(rows, cols) {
    // Simple recursive backtracker maze generator
    var grid = [];
    for (var r = 0; r < rows; r++) {
      grid[r] = [];
      for (var c = 0; c < cols; c++) {
        grid[r][c] = { r: r, c: c, walls: { top: true, right: true, bottom: true, left: true }, visited: false };
      }
    }
    var stack = [];
    var current = grid[0][0];
    current.visited = true;
    function neighbors(cell) {
      var ns = [];
      if (cell.r > 0 && !grid[cell.r - 1][cell.c].visited) ns.push(grid[cell.r - 1][cell.c]);
      if (cell.r < rows - 1 && !grid[cell.r + 1][cell.c].visited) ns.push(grid[cell.r + 1][cell.c]);
      if (cell.c > 0 && !grid[cell.r][cell.c - 1].visited) ns.push(grid[cell.r][cell.c - 1]);
      if (cell.c < cols - 1 && !grid[cell.r][cell.c + 1].visited) ns.push(grid[cell.r][cell.c + 1]);
      return ns;
    }
    function removeWall(a, b) {
      if (a.r === b.r) {
        if (a.c < b.c) { a.walls.right = false; b.walls.left = false; }
        else { a.walls.left = false; b.walls.right = false; }
      } else {
        if (a.r < b.r) { a.walls.bottom = false; b.walls.top = false; }
        else { a.walls.top = false; b.walls.bottom = false; }
      }
    }
    while (true) {
      var ns = neighbors(current);
      if (ns.length > 0) {
        var next = ns[Math.floor(Math.random() * ns.length)];
        stack.push(current);
        removeWall(current, next);
        next.visited = true;
        current = next;
      } else if (stack.length > 0) {
        current = stack.pop();
      } else { break; }
    }
    return grid;
  }

  function FluencyMazePanel(props) {
    var React = props.React || window.React;
    var h = React.createElement;
    var useState = React.useState;
    var useRef = React.useRef;
    var useEffect = React.useEffect;
    var gradeLevel = props.gradeLevel || '3';
    var addToast = props.addToast;
    var handleScoreUpdate = props.handleScoreUpdate;
    var t = props.t || function(k) { return k; };

    var _s = useState;
    var mode = _s('setup')[0], setMode = _s[1]; // actually use individual calls
    // Re-declare properly
    var modeState = useState('setup');
    var mode = modeState[0], setMode = modeState[1];
    var opState = useState('mul');
    var operation = opState[0], setOperation = opState[1];
    var diffState = useState('single');
    var difficulty = diffState[0], setDifficulty = diffState[1];
    var chaseState = useState(false);
    var chaseMode = chaseState[0], setChaseMode = chaseState[1];
    var mazeSizeState = useState('medium');
    var mazeSize = mazeSizeState[0], setMazeSize = mazeSizeState[1];
    var mazeState = useState(null);
    var maze = mazeState[0], setMaze = mazeState[1];
    var posState = useState({ r: 0, c: 0 });
    var playerPos = posState[0], setPlayerPos = posState[1];
    var problemState = useState(null);
    var currentProblem = problemState[0], setCurrentProblem = problemState[1];
    var inputState = useState('');
    var userInput = inputState[0], setUserInput = inputState[1];
    var scoreState = useState(0);
    var score = scoreState[0], setScore = scoreState[1];
    var correctState = useState(0);
    var correct = correctState[0], setCorrect = correctState[1];
    var wrongState = useState(0);
    var wrong = wrongState[0], setWrong = wrongState[1];
    var moveCountState = useState(0);
    var moveCount = moveCountState[0], setMoveCount = moveCountState[1];
    var timerState = useState(0);
    var elapsed = timerState[0], setElapsed = timerState[1];
    var monsterState = useState({ r: 0, c: 0 });
    var monsterPos = monsterState[0], setMonsterPos = monsterState[1];
    var gameOverState = useState(false);
    var gameOver = gameOverState[0], setGameOver = gameOverState[1];
    var wonState = useState(false);
    var won = wonState[0], setWon = wonState[1];
    var feedbackState = useState('');
    var feedback = feedbackState[0], setFeedback = feedbackState[1];
    var canvasRef = useRef(null);
    var playerPosRef = useRef({ r: 0, c: 0 });
    var timerRef = useRef(null);
    var monsterTimerRef = useRef(null);
    var inputRef = useRef(null);

    function makeProblem() {
      var a, b, op = operation === 'mixed' ? ['add','sub','mul','div'][Math.floor(Math.random() * 4)] : operation;
      var maxN = difficulty === 'single' ? 12 : 20;
      if (op === 'add') { a = Math.floor(Math.random() * maxN) + 1; b = Math.floor(Math.random() * maxN) + 1; return { text: a + ' + ' + b, answer: a + b, op: op }; }
      if (op === 'sub') { a = Math.floor(Math.random() * maxN) + 1; b = Math.floor(Math.random() * a) + 1; return { text: a + ' − ' + b, answer: a - b, op: op }; }
      if (op === 'mul') { a = Math.floor(Math.random() * 12) + 1; b = Math.floor(Math.random() * 12) + 1; return { text: a + ' × ' + b, answer: a * b, op: op }; }
      if (op === 'div') { b = Math.floor(Math.random() * 11) + 2; var ans = Math.floor(Math.random() * 12) + 1; a = b * ans; return { text: a + ' ÷ ' + b, answer: ans, op: op }; }
      return { text: '1 + 1', answer: 2, op: 'add' };
    }

    function getMazeSize() { var s = MAZE_SIZES[mazeSize] || MAZE_SIZES.medium; return { cols: s.cols, rows: s.rows }; }
    var MAZE_COLS = getMazeSize().cols;
    var MAZE_ROWS = getMazeSize().rows;

    function startMaze() {
      var sz = getMazeSize();
      var newMaze = generateMaze(sz.rows, sz.cols);
      setMaze(newMaze);
      setPlayerPos({ r: 0, c: 0 }); playerPosRef.current = { r: 0, c: 0 };
      setMonsterPos({ r: 0, c: 0 });
      setCurrentProblem(null);
      setScore(0); setCorrect(0); setWrong(0); setMoveCount(0); setElapsed(0);
      setGameOver(false); setWon(false); setFeedback('');
      setMode('playing');
      // Timer
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(function() { setElapsed(function(p) { return p + 1; }); }, 1000);
      // Monster chase timer (moves every 4 seconds)
      if (monsterTimerRef.current) clearInterval(monsterTimerRef.current);
      if (chaseMode) {
        monsterTimerRef.current = setInterval(function() {
          setMonsterPos(function(mp) {
            // BFS toward player — simple chase AI
            // Just move one step closer (Manhattan distance)
            var pr = playerPosRef.current.r, pc = playerPosRef.current.c;
            var mr = mp.r, mc = mp.c;
            if (mr < pr) return { r: mr + 1, c: mc };
            if (mr > pr) return { r: mr - 1, c: mc };
            if (mc < pc) return { r: mr, c: mc + 1 };
            if (mc > pc) return { r: mr, c: mc - 1 };
            return mp;
          });
        }, 4000);
      }
    }

    function tryMove(dir) {
      if (gameOver || won) return;
      var cell = maze[playerPos.r][playerPos.c];
      var canMove = false;
      var newR = playerPos.r, newC = playerPos.c;
      if (dir === 'up' && !cell.walls.top) { newR--; canMove = true; }
      if (dir === 'down' && !cell.walls.bottom) { newR++; canMove = true; }
      if (dir === 'left' && !cell.walls.left) { newC--; canMove = true; }
      if (dir === 'right' && !cell.walls.right) { newC++; canMove = true; }
      if (!canMove) { setFeedback('wall'); setTimeout(function() { setFeedback(''); }, 300); return; }
      // Show a problem to solve before moving
      setCurrentProblem({ dir: dir, targetR: newR, targetC: newC, problem: makeProblem() });
      setUserInput('');
      setTimeout(function() { if (inputRef.current) inputRef.current.focus(); }, 50);
    }

    function submitAnswer() {
      if (!currentProblem) return;
      var ans = parseInt(userInput);
      if (ans === currentProblem.problem.answer) {
        // Correct — move to new cell
        var newPos = { r: currentProblem.targetR, c: currentProblem.targetC };
        setPlayerPos(newPos); playerPosRef.current = newPos;
        setCorrect(function(p) { return p + 1; });
        setScore(function(p) { return p + 10; });
        setMoveCount(function(p) { return p + 1; });
        setFeedback('correct');
        playTone(880, 0.05, 'sine', 0.06);
        setTimeout(function() { playTone(1320, 0.05, 'sine', 0.05); }, 50);
        // 3D feedback: green ambient flash
        var eng3d = maze3dEngRef.current;
        if (eng3d) { eng3d._feedbackFlash = 1; eng3d.scene.children.forEach(function(c) { if (c.isAmbientLight) c.color.setHex(0x22aa44); c.intensity = 0.8; }); }
        // Check win
        if (currentProblem.targetR === MAZE_ROWS - 1 && currentProblem.targetC === MAZE_COLS - 1) {
          setWon(true); setMode('results');
          if (timerRef.current) clearInterval(timerRef.current);
          if (monsterTimerRef.current) clearInterval(monsterTimerRef.current);
          var finalScore = score + 10;
          if (addToast) addToast('\uD83C\uDFC6 Maze complete! ' + (correct + 1) + ' correct in ' + elapsed + 's', 'success');
          if (handleScoreUpdate) handleScoreUpdate(Math.round((correct + 1) / Math.max(1, elapsed) * 60), 'Fluency Maze Complete', 'fluency-maze');
          // Save high score
          try {
            var hs = JSON.parse(localStorage.getItem('fluency_maze_best') || '{}');
            if (!hs.score || finalScore > hs.score) {
              localStorage.setItem('fluency_maze_best', JSON.stringify({ score: finalScore, correct: correct + 1, wrong: wrong, time: elapsed, op: operation, size: mazeSize }));
            }
          } catch(e) {}
          // 3D completion particles
          var eng3dC = maze3dEngRef.current;
          if (eng3dC && window.THREE) {
            var THREE = window.THREE;
            var confColors = [0xfbbf24, 0x22c55e, 0x7c3aed, 0xef4444, 0x3b82f6];
            for (var ci = 0; ci < 20; ci++) {
              var cGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
              var cMat = new THREE.MeshBasicMaterial({ color: confColors[ci % confColors.length], transparent: true, opacity: 1 });
              var cMesh = new THREE.Mesh(cGeo, cMat);
              cMesh.position.copy(eng3dC.camera.position);
              cMesh.userData._age = 0; cMesh.userData._life = 2 + Math.random();
              cMesh.userData._vel = { x: (Math.random() - 0.5) * 5, y: 3 + Math.random() * 3, z: (Math.random() - 0.5) * 5 };
              eng3dC.scene.add(cMesh);
              if (!eng3dC._particles) eng3dC._particles = [];
              eng3dC._particles.push(cMesh);
            }
          }
        }
      } else {
        // Wrong — don't move, penalty
        setWrong(function(p) { return p + 1; });
        setScore(function(p) { return Math.max(0, p - 3); });
        setFeedback('wrong');
        playTone(220, 0.1, 'triangle', 0.04);
        // 3D feedback: red ambient flash
        var eng3dW = maze3dEngRef.current;
        if (eng3dW) { eng3dW._feedbackFlash = 1; eng3dW.scene.children.forEach(function(c) { if (c.isAmbientLight) c.color.setHex(0xaa2222); c.intensity = 0.8; }); }
      }
      setCurrentProblem(null);
      setTimeout(function() { setFeedback(''); }, 400);
    }

    // Check monster catch
    useEffect(function() {
      if (chaseMode && mode === 'playing' && monsterPos.r === playerPos.r && monsterPos.c === playerPos.c && moveCount > 0) {
        setGameOver(true); setMode('results');
        if (timerRef.current) clearInterval(timerRef.current);
        if (monsterTimerRef.current) clearInterval(monsterTimerRef.current);
        if (addToast) addToast('\uD83D\uDC7E The monster caught you! Score: ' + score, 'error');
      }
    });

    // Keyboard navigation
    useEffect(function() {
      function handleKey(e) {
        if (mode !== 'playing') return;
        if (currentProblem) {
          if (e.key === 'Enter') { e.preventDefault(); submitAnswer(); }
          return;
        }
        if (e.key === 'ArrowUp' || e.key === 'w') tryMove('up');
        if (e.key === 'ArrowDown' || e.key === 's') tryMove('down');
        if (e.key === 'ArrowLeft' || e.key === 'a') tryMove('left');
        if (e.key === 'ArrowRight' || e.key === 'd') tryMove('right');
      }
      document.addEventListener('keydown', handleKey);
      return function() { document.removeEventListener('keydown', handleKey); };
    });

    // Draw maze on canvas
    useEffect(function() {
      if (!maze || !canvasRef.current) return;
      var cv = canvasRef.current;
      var ctx = cv.getContext('2d');
      var W = MAZE_COLS * CELL_SIZE;
      var H = MAZE_ROWS * CELL_SIZE;
      cv.width = W; cv.height = H;

      // Background
      ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);

      // Draw cells
      for (var r = 0; r < MAZE_ROWS; r++) {
        for (var c = 0; c < MAZE_COLS; c++) {
          var cell = maze[r][c];
          var x = c * CELL_SIZE, y = r * CELL_SIZE;
          // Cell floor
          if (r === 0 && c === 0) { ctx.fillStyle = 'rgba(34,197,94,0.15)'; ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE); } // start
          else if (r === MAZE_ROWS - 1 && c === MAZE_COLS - 1) { ctx.fillStyle = 'rgba(251,191,36,0.2)'; ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE); } // exit
          // Walls
          ctx.strokeStyle = '#475569'; ctx.lineWidth = 2;
          if (cell.walls.top) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + CELL_SIZE, y); ctx.stroke(); }
          if (cell.walls.right) { ctx.beginPath(); ctx.moveTo(x + CELL_SIZE, y); ctx.lineTo(x + CELL_SIZE, y + CELL_SIZE); ctx.stroke(); }
          if (cell.walls.bottom) { ctx.beginPath(); ctx.moveTo(x, y + CELL_SIZE); ctx.lineTo(x + CELL_SIZE, y + CELL_SIZE); ctx.stroke(); }
          if (cell.walls.left) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + CELL_SIZE); ctx.stroke(); }
        }
      }

      // Start label
      ctx.fillStyle = '#22c55e'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('START', CELL_SIZE / 2, CELL_SIZE / 2 + 14);
      // Exit label
      ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 10px sans-serif';
      ctx.fillText('EXIT', (MAZE_COLS - 0.5) * CELL_SIZE, (MAZE_ROWS - 0.5) * CELL_SIZE + 14);
      // Exit star
      ctx.font = '18px sans-serif';
      ctx.fillText('\u2B50', (MAZE_COLS - 0.5) * CELL_SIZE, (MAZE_ROWS - 0.5) * CELL_SIZE);

      // Monster (chase mode)
      if (chaseMode && mode === 'playing' && !gameOver) {
        ctx.font = '22px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('\uD83D\uDC7E', (monsterPos.c + 0.5) * CELL_SIZE, (monsterPos.r + 0.5) * CELL_SIZE + 6);
      }

      // Player
      ctx.font = '22px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('\uD83D\uDC31', (playerPos.c + 0.5) * CELL_SIZE, (playerPos.r + 0.5) * CELL_SIZE + 6);

      // Feedback flash
      if (feedback === 'correct') { ctx.fillStyle = 'rgba(34,197,94,0.2)'; ctx.fillRect(playerPos.c * CELL_SIZE, playerPos.r * CELL_SIZE, CELL_SIZE, CELL_SIZE); }
      if (feedback === 'wrong') { ctx.fillStyle = 'rgba(239,68,68,0.2)'; ctx.fillRect(playerPos.c * CELL_SIZE, playerPos.r * CELL_SIZE, CELL_SIZE, CELL_SIZE); }
      if (feedback === 'wall') { ctx.fillStyle = 'rgba(148,163,184,0.15)'; ctx.fillRect(playerPos.c * CELL_SIZE, playerPos.r * CELL_SIZE, CELL_SIZE, CELL_SIZE); }
    });

    // Cleanup timers
    useEffect(function() {
      return function() {
        if (timerRef.current) clearInterval(timerRef.current);
        if (monsterTimerRef.current) clearInterval(monsterTimerRef.current);
      };
    }, []);

    // ── Render ──
    if (mode === 'setup') {
      return h('div', { style: { maxWidth: 420, margin: '0 auto', padding: '20px', textAlign: 'center' } },
        h('div', { style: { fontSize: '36px', marginBottom: '8px' } }, '\uD83C\uDFAF'),
        h('h2', { style: { fontSize: '20px', fontWeight: 800, color: '#1e293b', marginBottom: '4px' } }, 'Fluency Maze'),
        h('p', { style: { fontSize: '12px', color: '#64748b', marginBottom: '16px' } }, 'Solve math problems to navigate through the maze. Reach the exit!'),
        // Operation selector
        h('div', { style: { display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '12px', flexWrap: 'wrap' } },
          ['add', 'sub', 'mul', 'div', 'mixed'].map(function(op) {
            var labels = { add: '➕ Add', sub: '➖ Sub', mul: '✖️ Mul', div: '➗ Div', mixed: '🔀 Mixed' };
            return h('button', { key: op, onClick: function() { setOperation(op); },
              style: { padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                background: operation === op ? '#7c3aed' : '#f1f5f9', color: operation === op ? '#fff' : '#475569',
                border: operation === op ? '2px solid #7c3aed' : '2px solid #e2e8f0' }
            }, labels[op]);
          })
        ),
        // Difficulty
        h('div', { style: { display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '12px' } },
          ['single', 'double'].map(function(d) {
            return h('button', { key: d, onClick: function() { setDifficulty(d); },
              style: { padding: '6px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                background: difficulty === d ? '#f59e0b' : '#f1f5f9', color: difficulty === d ? '#fff' : '#475569',
                border: difficulty === d ? '2px solid #f59e0b' : '2px solid #e2e8f0' }
            }, d === 'single' ? 'Single Digit (0-12)' : 'Double Digit (0-20)');
          })
        ),
        // Maze size selector
        h('div', { style: { display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '12px' } },
          ['small', 'medium', 'large'].map(function(sz) {
            return h('button', { key: sz, onClick: function() { setMazeSize(sz); },
              style: { padding: '6px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                background: mazeSize === sz ? '#6366f1' : '#f1f5f9', color: mazeSize === sz ? '#fff' : '#475569',
                border: mazeSize === sz ? '2px solid #6366f1' : '2px solid #e2e8f0' }
            }, MAZE_SIZES[sz].label);
          })
        ),
        // Chase mode toggle
        h('label', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px', fontSize: '12px', color: '#475569', cursor: 'pointer' } },
          h('input', { type: 'checkbox', checked: chaseMode, onChange: function() { setChaseMode(!chaseMode); } }),
          '\uD83D\uDC7E Chase Mode', h('span', { style: { fontSize: '10px', color: '#94a3b8' } }, '(monster pursues you!)')
        ),
        // Start button
        h('button', { onClick: startMaze,
          style: { padding: '12px 32px', background: 'linear-gradient(135deg, #7c3aed, #6366f1)', color: '#fff',
            border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 800, cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(124,58,237,0.3)' }
        }, '\u25B6\uFE0F Start Maze')
      );
    }

    if (mode === 'results') {
      var dcpm = elapsed > 0 ? Math.round(correct / (elapsed / 60)) : 0;
      return h('div', { style: { maxWidth: 420, margin: '0 auto', padding: '20px', textAlign: 'center' } },
        h('div', { style: { fontSize: '48px', marginBottom: '8px' } }, won ? '\uD83C\uDFC6' : '\uD83D\uDC7E'),
        h('h2', { style: { fontSize: '20px', fontWeight: 800, color: won ? '#22c55e' : '#ef4444', marginBottom: '12px' } },
          won ? 'Maze Complete!' : (gameOver ? 'Caught by the monster!' : 'Game Over')),
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' } },
          h('div', { style: { background: '#f0fdf4', borderRadius: '10px', padding: '10px' } },
            h('div', { style: { fontSize: '24px', fontWeight: 800, color: '#22c55e' } }, String(correct)),
            h('div', { style: { fontSize: '10px', color: '#64748b' } }, 'Correct')),
          h('div', { style: { background: '#fef2f2', borderRadius: '10px', padding: '10px' } },
            h('div', { style: { fontSize: '24px', fontWeight: 800, color: '#ef4444' } }, String(wrong)),
            h('div', { style: { fontSize: '10px', color: '#64748b' } }, 'Wrong')),
          h('div', { style: { background: '#f5f3ff', borderRadius: '10px', padding: '10px' } },
            h('div', { style: { fontSize: '24px', fontWeight: 800, color: '#7c3aed' } }, String(dcpm)),
            h('div', { style: { fontSize: '10px', color: '#64748b' } }, 'Facts/Min')),
          h('div', { style: { background: '#fffbeb', borderRadius: '10px', padding: '10px' } },
            h('div', { style: { fontSize: '24px', fontWeight: 800, color: '#f59e0b' } }, elapsed + 's'),
            h('div', { style: { fontSize: '10px', color: '#64748b' } }, 'Time'))
        ),
        h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'center' } },
          h('button', { onClick: startMaze, style: { padding: '10px 24px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' } }, '\uD83D\uDD04 Play Again'),
          h('button', { onClick: function() { setMode('setup'); }, style: { padding: '10px 20px', background: '#f1f5f9', color: '#475569', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '12px', cursor: 'pointer' } }, 'Settings')
        )
      );
    }

    // ── 3D Maze Rendering (Three.js) ──
    var maze3dRef = useRef(null);
    var maze3dEngRef = useRef(null);
    var maze3dAnimRef = useRef(0);

    useEffect(function() {
      if (mode !== 'playing' || !maze) return;
      var container = maze3dRef.current;
      var THREE = window.THREE;
      if (!container || !THREE) return;
      if (maze3dEngRef.current) return; // already initialized

      var eng = {};
      maze3dEngRef.current = eng;

      // Scene
      eng.scene = new THREE.Scene();
      eng.scene.background = new THREE.Color(0x0a0a1a);
      eng.scene.fog = new THREE.Fog(0x0a0a1a, 1, 15);

      // Camera
      eng.camera = new THREE.PerspectiveCamera(80, container.clientWidth / Math.max(1, container.clientHeight), 0.1, 50);
      eng.camera.position.set(0.5, 1.2, 0.5);

      // Renderer
      var cnv = document.createElement('canvas');
      cnv.style.width = '100%'; cnv.style.height = '100%'; cnv.style.display = 'block'; cnv.style.borderRadius = '10px';
      container.appendChild(cnv);
      eng.renderer = new THREE.WebGLRenderer({ canvas: cnv, antialias: true });
      eng.renderer.setSize(container.clientWidth, container.clientHeight);
      eng.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

      // Lighting
      eng.scene.add(new THREE.AmbientLight(0x222244, 0.3));
      var torchLight = new THREE.PointLight(0xffaa44, 1.2, 8);
      torchLight.position.set(0, 2, 0);
      eng.camera.add(torchLight); // torch follows camera
      eng.scene.add(eng.camera);

      // Floor
      var floorMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.9 });
      var floor = new THREE.Mesh(new THREE.PlaneGeometry(MAZE_COLS * 2, MAZE_ROWS * 2), floorMat);
      floor.rotation.x = -Math.PI / 2; floor.position.set(MAZE_COLS, 0, MAZE_ROWS);
      eng.scene.add(floor);

      // Ceiling
      var ceil = new THREE.Mesh(new THREE.PlaneGeometry(MAZE_COLS * 2, MAZE_ROWS * 2), new THREE.MeshStandardMaterial({ color: 0x0a0a18, roughness: 0.9 }));
      ceil.rotation.x = Math.PI / 2; ceil.position.set(MAZE_COLS, 2.5, MAZE_ROWS);
      eng.scene.add(ceil);

      // Build walls from maze grid
      var wallMat = new THREE.MeshStandardMaterial({ color: 0x2a2a4a, roughness: 0.8 });
      for (var r = 0; r < MAZE_ROWS; r++) {
        for (var c = 0; c < MAZE_COLS; c++) {
          var cell = maze[r][c];
          var cx = c * 2 + 1, cz = r * 2 + 1;
          if (cell.walls.top) {
            var w = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.5, 0.15), wallMat);
            w.position.set(cx, 1.25, cz - 1); eng.scene.add(w);
          }
          if (cell.walls.bottom) {
            var w2 = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.5, 0.15), wallMat);
            w2.position.set(cx, 1.25, cz + 1); eng.scene.add(w2);
          }
          if (cell.walls.left) {
            var w3 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.5, 2.1), wallMat);
            w3.position.set(cx - 1, 1.25, cz); eng.scene.add(w3);
          }
          if (cell.walls.right) {
            var w4 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.5, 2.1), wallMat);
            w4.position.set(cx + 1, 1.25, cz); eng.scene.add(w4);
          }
        }
      }

      // Exit marker (golden glow at bottom-right)
      var exitLight = new THREE.PointLight(0xfbbf24, 1.5, 6);
      exitLight.position.set((MAZE_COLS - 1) * 2 + 1, 1.5, (MAZE_ROWS - 1) * 2 + 1);
      eng.scene.add(exitLight);
      var exitGeo = new THREE.SphereGeometry(0.3, 8, 8);
      var exitMesh = new THREE.Mesh(exitGeo, new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.6 }));
      exitMesh.position.copy(exitLight.position); exitMesh.position.y = 0.5;
      eng.scene.add(exitMesh);

      // Monster mesh (chase mode)
      if (chaseMode) {
        var monMat = new THREE.MeshStandardMaterial({ color: 0xff3333, emissive: 0x880000, emissiveIntensity: 0.5 });
        eng.monsterMesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 0.6), monMat);
        eng.monsterMesh.position.set(1, 0.6, 1);
        eng.scene.add(eng.monsterMesh);
        var monLight = new THREE.PointLight(0xff3333, 0.8, 4);
        monLight.position.set(1, 1.5, 1);
        eng.monsterMesh.add(monLight);
      }

      eng.clock = new THREE.Clock();
      eng.facing = 0; // 0=down(+z), 1=right(+x), 2=up(-z), 3=left(-x)

      function animate() {
        maze3dAnimRef.current = requestAnimationFrame(animate);
        var t2 = eng.clock.getElapsedTime();
        // Position camera at player cell
        var pr = playerPosRef.current;
        var targetX = pr.c * 2 + 1, targetZ = pr.r * 2 + 1;
        eng.camera.position.x += (targetX - eng.camera.position.x) * 0.1;
        eng.camera.position.z += (targetZ - eng.camera.position.z) * 0.1;
        eng.camera.position.y = 1.2 + Math.sin(t2 * 3) * 0.03; // subtle bob

        // Exit glow pulse
        exitMesh.material.opacity = 0.4 + Math.sin(t2 * 3) * 0.2;
        exitMesh.scale.setScalar(1 + Math.sin(t2 * 2) * 0.15);

        // Monster position
        if (eng.monsterMesh) {
          var mp = monsterPos;
          var mtx = mp.c * 2 + 1, mtz = mp.r * 2 + 1;
          eng.monsterMesh.position.x += (mtx - eng.monsterMesh.position.x) * 0.08;
          eng.monsterMesh.position.z += (mtz - eng.monsterMesh.position.z) * 0.08;
          eng.monsterMesh.position.y = 0.6 + Math.sin(t2 * 5) * 0.1;
          eng.monsterMesh.rotation.y += 0.02;
        }

        // ── 3D Feedback: green/red ambient flash on correct/wrong ──
        if (eng._feedbackFlash) {
          eng._feedbackFlash -= 0.03;
          if (eng._feedbackFlash <= 0) {
            eng._feedbackFlash = 0;
            eng.scene.children.forEach(function(c) { if (c.isAmbientLight) c.color.setHex(0x222244); });
          }
        }

        // ── Monster warning sound (when within 2 cells) ──
        if (eng.monsterMesh && !gameOver) {
          var mDist = Math.abs(monsterPos.r - playerPosRef.current.r) + Math.abs(monsterPos.c - playerPosRef.current.c);
          if (mDist <= 2 && (!eng._lastWarnTime || t2 - eng._lastWarnTime > 2)) {
            eng._lastWarnTime = t2;
            playTone(180, 0.15, 'sawtooth', 0.03);
          }
          // Red tint intensifies as monster gets closer
          if (mDist <= 3) {
            var dangerAlpha = (3 - mDist) / 3;
            eng.scene.fog.color.setRGB(0.08 * dangerAlpha + 0.04, 0.04 * (1 - dangerAlpha), 0.1 * (1 - dangerAlpha));
          } else {
            eng.scene.fog.color.setHex(0x0a0a1a);
          }
        }

        // ── Footstep tick while camera is moving ──
        var camMoveDist = Math.abs(eng.camera.position.x - (playerPosRef.current.c * 2 + 1)) + Math.abs(eng.camera.position.z - (playerPosRef.current.r * 2 + 1));
        if (camMoveDist > 0.1) {
          if (!eng._stepTimer) eng._stepTimer = 0;
          eng._stepTimer += 0.016;
          if (eng._stepTimer > 0.3) {
            eng._stepTimer = 0;
            playTone(200 + Math.random() * 100, 0.02, 'sine', 0.01);
          }
        }

        eng.renderer.render(eng.scene, eng.camera);
      }
      animate();

      return function() {
        cancelAnimationFrame(maze3dAnimRef.current);
        if (cnv.parentNode) cnv.parentNode.removeChild(cnv);
        maze3dEngRef.current = null;
      };
    }, [mode === 'playing', maze]);

    // Camera facing: update on each move
    useEffect(function() {
      var eng = maze3dEngRef.current;
      if (!eng || !eng.camera) return;
      // Look in the direction of last move
      var pr = playerPosRef.current;
      var lookX = pr.c * 2 + 1, lookZ = pr.r * 2 + 1 + 2; // default: look forward (+z)
      eng.camera.lookAt(lookX, 1.2, lookZ);
    }, [playerPos]);

    var has3D = !!window.THREE;

    // Playing mode
    return h('div', { style: { maxWidth: 500, margin: '0 auto', position: 'relative' } },
      // HUD
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: '#f1f5f9', borderRadius: '10px', marginBottom: '6px', fontSize: '11px' } },
        h('span', { style: { color: '#22c55e', fontWeight: 700 } }, '\u2705 ' + correct),
        h('span', { style: { color: '#ef4444', fontWeight: 700 } }, '\u274C ' + wrong),
        h('span', { style: { color: '#7c3aed', fontWeight: 700 } }, '\uD83C\uDFAF ' + score),
        h('span', { style: { color: '#64748b' } }, '\u23F1 ' + elapsed + 's'),
        chaseMode && h('span', { style: { color: '#f59e0b', fontWeight: 700 } }, '\uD83D\uDC7E CHASE!')
      ),
      // 3D View (or 2D fallback)
      has3D ? h('div', { ref: maze3dRef, style: { width: '100%', height: '320px', borderRadius: '10px', overflow: 'hidden', border: '2px solid #7c3aed', position: 'relative', background: '#0a0a1a' } }) :
      h('canvas', { ref: canvasRef, style: { width: '100%', height: 'auto', borderRadius: '10px', border: '2px solid #e2e8f0', display: 'block' } }),
      // 2D minimap overlay (top-right of 3D view)
      has3D && maze && h('canvas', { ref: canvasRef, style: { position: 'absolute', top: '44px', right: '4px', width: '100px', height: '100px', borderRadius: '8px', border: '1px solid rgba(100,116,139,0.3)', opacity: 0.8 } }),
      // Problem overlay (when at junction)
      currentProblem && h('div', { style: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(8px)', borderRadius: '16px', padding: '20px 28px', textAlign: 'center', border: '2px solid #7c3aed', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', zIndex: 10 } },
        h('div', { style: { fontSize: '28px', fontWeight: 800, color: '#e2e8f0', marginBottom: '12px', fontFamily: 'monospace' } }, currentProblem.problem.text + ' = ?'),
        h('input', { ref: inputRef, type: 'number', value: userInput, onChange: function(e) { setUserInput(e.target.value); },
          onKeyDown: function(e) { if (e.key === 'Enter') submitAnswer(); },
          style: { width: '120px', padding: '8px 12px', fontSize: '24px', fontWeight: 800, textAlign: 'center', borderRadius: '10px', border: '2px solid #7c3aed', background: '#1e293b', color: '#fff', fontFamily: 'monospace', outline: 'none' },
          inputMode: 'numeric', autoFocus: true
        }),
        h('div', { style: { marginTop: '8px' } },
          h('button', { onClick: submitAnswer, style: { padding: '8px 20px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' } }, '\u2705 Submit')
        )
      ),
      // Arrow buttons (mobile friendly)
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', maxWidth: '160px', margin: '8px auto 0' } },
        h('div'),
        h('button', { onClick: function() { tryMove('up'); }, style: { padding: '10px', borderRadius: '8px', background: '#e2e8f0', border: 'none', fontSize: '18px', cursor: 'pointer' } }, '\u25B2'),
        h('div'),
        h('button', { onClick: function() { tryMove('left'); }, style: { padding: '10px', borderRadius: '8px', background: '#e2e8f0', border: 'none', fontSize: '18px', cursor: 'pointer' } }, '\u25C0'),
        h('button', { onClick: function() { tryMove('down'); }, style: { padding: '10px', borderRadius: '8px', background: '#e2e8f0', border: 'none', fontSize: '18px', cursor: 'pointer' } }, '\u25BC'),
        h('button', { onClick: function() { tryMove('right'); }, style: { padding: '10px', borderRadius: '8px', background: '#e2e8f0', border: 'none', fontSize: '18px', cursor: 'pointer' } }, '\u25B6')
      ),
      h('p', { style: { fontSize: '10px', color: '#94a3b8', textAlign: 'center', marginTop: '6px' } }, 'Arrow keys or WASD to move \u2022 Solve each problem to advance')
    );
  }

  // ── Register modules ──
  window.AlloModules = window.AlloModules || {};
  window.AlloModules.MathFluency = MathFluencyPanel;
  window.AlloModules.FluencyMaze = FluencyMazePanel;
  console.log('[CDN] MathFluency + FluencyMaze modules registered');
})();
