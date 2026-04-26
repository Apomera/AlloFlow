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
      // Gate feedback animations — wrong-answer shake + correct-answer
      // open-flash. The transform combines the centered translate (so the
      // gate stays anchored to the maze midpoint) with the keyframe shake.
      '@keyframes alloGateShake { 0%,100% { transform: translate(-50%,-50%); } 15% { transform: translate(calc(-50% - 8px), -50%); } 30% { transform: translate(calc(-50% + 8px), -50%); } 45% { transform: translate(calc(-50% - 6px), -50%); } 60% { transform: translate(calc(-50% + 6px), -50%); } 75% { transform: translate(calc(-50% - 3px), -50%); } 90% { transform: translate(calc(-50% + 3px), -50%); } }',
      '.allo-gate-shake { animation: alloGateShake 480ms cubic-bezier(.36,.07,.19,.97) both; }',
      '@keyframes alloGateOpen { 0% { transform: translate(-50%,-50%) scale(1); filter: brightness(1); } 35% { transform: translate(-50%,-50%) scale(1.06); filter: brightness(1.4); } 100% { transform: translate(-50%,-50%) scale(1.04); filter: brightness(1.2); } }',
      '.allo-gate-open { animation: alloGateOpen 220ms ease-out forwards; }',
      '@keyframes alloStreakPulse { 0% { transform: translateX(-50%) scale(0.8); opacity: 0; } 18% { transform: translateX(-50%) scale(1.08); opacity: 1; } 35% { transform: translateX(-50%) scale(1); opacity: 1; } 80% { transform: translateX(-50%) scale(1); opacity: 1; } 100% { transform: translateX(-50%) scale(0.94); opacity: 0; } }',
      '@media (prefers-reduced-motion: reduce) { .allo-gate-shake, .allo-gate-open { animation: none !important; } [style*="alloStreakPulse"] { animation-duration: 0.01ms !important; } }',
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
      // Live DCPM — digits-correct-per-minute, the gold-standard fluency
      // measure. We compute it from the same formula that finishProbe uses,
      // so the live number matches what the results will show. Shown to the
      // student during the probe as light real-time feedback.
      var liveDigitsCorrect = problems.filter(function (p) { return p.correct; })
        .reduce(function (s, p) { return s + countDigits(p.answer); }, 0);
      var liveElapsed = timeLimit - timer;
      var liveDcpm = liveElapsed > 0 ? Math.round(liveDigitsCorrect / Math.max(0.1, liveElapsed / 60)) : 0;

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
        // Timer bar + live DCPM ticker
        h('div', { style: { width: '100%', maxWidth: '28rem', marginBottom: '2rem' } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '8px', flexWrap: 'wrap' } },
            h('span', { style: { fontSize: '14px', fontWeight: 800, color: isLowTime ? '#dc2626' : '#b45309', animation: isLowTime ? 'pulse 1s infinite' : 'none' } },
              '\u23f1\ufe0f ' + Math.floor(timer / 60) + ':' + String(timer % 60).padStart(2, '0')),
            // Live DCPM pill — updates every second as the timer ticks. Low
            // opacity until at least 10s have elapsed so the number isn't
            // noisy at the start of the probe when the sample is tiny.
            h('span', {
              style: {
                fontSize: '13px', fontWeight: 800,
                padding: '3px 10px', borderRadius: '999px',
                background: 'linear-gradient(90deg,#ede9fe,#e9d5ff)',
                color: '#6d28d9',
                border: '1px solid #c4b5fd',
                opacity: liveElapsed >= 10 ? 1 : 0.45,
                transition: 'opacity 0.4s'
              },
              title: 'Digits-correct per minute — the fluency benchmark metric, updating live.'
            }, '\uD83D\uDCC8 ' + liveDcpm + ' dcpm'),
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
            h('div', { style: { display: 'flex', gap: '12px', marginTop: '1.5rem', justifyContent: 'center' } },
              h('button', {  type: 'submit',
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
          h('div', { style: { marginTop: '12px', fontSize: '11px', color: '#64748b' } },
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

      return h('div', { style: {
          background: 'linear-gradient(135deg, #fffbeb, #fff7ed)', borderRadius: '16px',
          border: '2px solid #fde68a', padding: '24px', marginBottom: '24px',
          animation: 'fadeIn 0.3s ease-out'
        }
      },
        // Header
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' } },
          h('h3', { style: { fontSize: '18px', fontWeight: 900, color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 } },
            h('span', { 'aria-hidden': 'true' }, '\ud83d\udcca '), 'Fluency Probe Results'),
          h('button', { onClick: function () { setResults(null); },
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

        // DCPM Trend — bar chart per session with a trend delta and personal-best
        // marker so the student immediately sees "am I improving?" instead of
        // having to eyeball raw bars.
        history.length >= 2 ? (function () {
          var prevDcpm = history[history.length - 2].dcpm;
          var curDcpm = history[history.length - 1].dcpm;
          var delta = curDcpm - prevDcpm;
          var avgDcpm = Math.round(history.reduce(function (s, x) { return s + x.dcpm; }, 0) / history.length);
          var personalBest = Math.max.apply(null, history.map(function (x) { return x.dcpm; }));
          var avgPct = (avgDcpm / maxDcpm) * 100;
          return h('div', {
            style: { background: '#fff', borderRadius: '12px', padding: '12px', border: '1px solid #fef3c7', marginBottom: '16px' }
          },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' } },
              h('div', { style: { fontSize: '12px', fontWeight: 800, color: '#64748b' } },
                '\ud83d\udcc8 DCPM Trend (' + history.length + ' sessions)'),
              // Trend delta — green/red arrow + number. Grey when flat.
              h('span', {
                style: {
                  fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '999px',
                  background: delta > 0 ? '#d1fae5' : delta < 0 ? '#fee2e2' : '#f1f5f9',
                  color: delta > 0 ? '#047857' : delta < 0 ? '#b91c1c' : '#64748b'
                }
              }, (delta > 0 ? '\u25B2 +' : delta < 0 ? '\u25BC ' : '\u25AC ') + delta + ' vs last'),
              h('span', { style: { fontSize: '10px', color: '#64748b' } },
                'avg ' + avgDcpm + ' \u2022 best ' + personalBest)
            ),
            h('div', { style: { position: 'relative', height: '64px' } },
              // Average reference line — subtle dashed horizontal overlay so
              // students can see which sessions beat their average.
              h('div', {
                style: {
                  position: 'absolute', left: 0, right: 0,
                  bottom: avgPct + '%',
                  height: '1px',
                  borderTop: '1.5px dashed #94a3b8',
                  opacity: 0.55,
                  pointerEvents: 'none',
                  zIndex: 2
                },
                title: 'Average: ' + avgDcpm + ' DCPM'
              }),
              h('div', { style: { display: 'flex', alignItems: 'flex-end', gap: '4px', height: '64px', position: 'relative' } },
                history.map(function (hItem, i) {
                  var pct = (hItem.dcpm / maxDcpm) * 100;
                  var isBest = hItem.dcpm === personalBest;
                  var isLatest = i === history.length - 1;
                  return h('div', { key: i, style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' } },
                    h('span', { style: { fontSize: '9px', fontWeight: 700, color: isBest ? '#d97706' : '#94a3b8' } }, isBest ? '\u2B50 ' + hItem.dcpm : hItem.dcpm),
                    h('div', { title: hItem.dcpm + ' DCPM' + (isBest ? ' (personal best)' : '') + (isLatest ? ' (this session)' : ''), style: {
                      width: '100%',
                      background: isBest
                        ? 'linear-gradient(to top,#d97706,#fbbf24)'
                        : isLatest
                          ? 'linear-gradient(to top,#f59e0b,#fed7aa)'
                          : 'linear-gradient(to top, #fcd34d, #fde68a)',
                      borderRadius: '4px 4px 0 0',
                      height: Math.max(4, pct) + '%',
                      minHeight: '4px',
                      boxShadow: isLatest ? '0 0 6px rgba(245,158,11,0.5)' : 'none'
                    } })
                  );
                })
              )
            )
          );
        })() : null,

        // Actions
        h('div', { style: { display: 'flex', gap: '8px', marginTop: '16px' } },
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
    return h('div', { style: {
        padding: '16px', background: 'linear-gradient(135deg, #fffbeb, #fff7ed)',
        borderRadius: '12px', border: '1px solid #fde68a'
      }
    },
      // Header
      h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
          h(Zap, { size: 16 }),
          h('span', { style: { fontWeight: 800, fontSize: '14px', color: '#92400e' } }, '\u26a1 Math Fluency Probe')
        ),
        h('div', { 'aria-expanded': String(soundEnabled), style: { display: 'flex', gap: '6px' } },
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
        return h('div', { style: { background: '#fff', borderRadius: '8px', padding: '8px 12px', marginBottom: '12px',
            border: '1px solid #fef3c7', fontSize: '12px', color: '#64748b' }
        },
          h('span', { style: { fontWeight: 700 } }, '\ud83c\udfaf Grade ' + bm.grade + ' ' + bm.season + ' target: '),
          h('span', { style: { fontWeight: 800, color: '#d97706' } }, bm.target + ' DCPM'),
          h('span', { style: { marginLeft: '8px', fontSize: '11px' } },
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
  var MAZE_SIZES = { small: { cols: 5, rows: 5, label: 'Small (5\u00d75)' }, medium: { cols: 7, rows: 7, label: 'Medium (7\u00d77)' }, large: { cols: 9, rows: 9, label: 'Large (9\u00d99)' } };

  // ── Procedural stone/dungeon textures (no external assets) ──
  // Builds a CanvasTexture that reads as stone/brick via layered noise + cracks.
  // Called once per maze init, cached on the engine object to avoid per-wall
  // GPU uploads. Returns a THREE.CanvasTexture so callers can set wrap modes
  // and repeat counts.
  function buildStoneTexture(THREE, hue) {
    var sz = 128;
    var cnv = document.createElement('canvas');
    cnv.width = sz; cnv.height = sz;
    var ctx = cnv.getContext('2d');
    var base = hue || 'rgb(42,42,74)';
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, sz, sz);
    // Value noise — hand-rolled (no perlin lib). Small blotches of lighter/darker
    // regions give the stone its mottled look.
    for (var i = 0; i < 1600; i++) {
      var x = Math.random() * sz, y = Math.random() * sz;
      var rad = 0.5 + Math.random() * 1.8;
      var light = Math.random();
      ctx.fillStyle = light > 0.5
        ? 'rgba(255,255,255,' + (0.02 + Math.random() * 0.08) + ')'
        : 'rgba(0,0,0,' + (0.03 + Math.random() * 0.14) + ')';
      ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
    }
    // Horizontal brick seams (mortar lines) at irregular intervals
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 1;
    for (var sy = 0; sy < sz; sy += 22 + Math.floor(Math.random() * 6)) {
      ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(sz, sy); ctx.stroke();
    }
    // Vertical brick seams — offset every other row to break a repeating grid
    for (var row = 0; row < 6; row++) {
      var rowY = row * 22;
      var offset = (row % 2) * 32;
      for (var sx = offset; sx < sz; sx += 64) {
        ctx.beginPath(); ctx.moveTo(sx, rowY); ctx.lineTo(sx, rowY + 22); ctx.stroke();
      }
    }
    // A few hairline cracks for character
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    for (var cr = 0; cr < 5; cr++) {
      ctx.beginPath();
      var sxc = Math.random() * sz, syc = Math.random() * sz;
      ctx.moveTo(sxc, syc);
      for (var seg = 0; seg < 5; seg++) {
        sxc += (Math.random() - 0.5) * 18;
        syc += (Math.random() - 0.5) * 18;
        ctx.lineTo(sxc, syc);
      }
      ctx.stroke();
    }
    var tex = new THREE.CanvasTexture(cnv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 4;
    return tex;
  }

  // Soft radial-gradient sprite texture — used as a glow card behind point
  // lights so "bloom" reads visually without requiring EffectComposer.
  function buildGlowSpriteTexture(THREE, hexColor) {
    var sz = 128;
    var cnv = document.createElement('canvas');
    cnv.width = sz; cnv.height = sz;
    var ctx = cnv.getContext('2d');
    var g = ctx.createRadialGradient(sz / 2, sz / 2, 0, sz / 2, sz / 2, sz / 2);
    var r = (hexColor >> 16) & 0xff, gg = (hexColor >> 8) & 0xff, b = hexColor & 0xff;
    g.addColorStop(0, 'rgba(' + r + ',' + gg + ',' + b + ',0.9)');
    g.addColorStop(0.3, 'rgba(' + r + ',' + gg + ',' + b + ',0.45)');
    g.addColorStop(1, 'rgba(' + r + ',' + gg + ',' + b + ',0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, sz, sz);
    return new THREE.CanvasTexture(cnv);
  }

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

  // Aria-live announcer — pipes maze state to the global polite live
  // region (allo-live-math-fluency, created at module init) so screen-
  // reader users hear "Gate opens", "Wrong combination", "Key collected",
  // "Maze complete" without having to watch the canvas.
  function _mfAnnounce(msg) {
    try {
      var lr = document.getElementById('allo-live-math-fluency');
      if (lr) { lr.textContent = ''; setTimeout(function() { lr.textContent = msg; }, 30); }
    } catch (e) { /* live region is optional polish */ }
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
    // Small tick counter used only to drive the "you are here" pulse on the
    // minimap. Incremented by a RAF loop while mode==='playing'. Kept separate
    // from game state so game re-renders aren't batched with animation ticks.
    var minimapTickState = useState(0);
    var feedback = feedbackState[0], setFeedback = feedbackState[1];
    // Consecutive correct answers. Resets to 0 on a wrong answer. Drives the
    // HUD combo meter and triggers a milestone celebration at every third
    // correct answer — meaningful reinforcement for fluency gains.
    var streakState = useState(0);
    var streak = streakState[0], setStreak = streakState[1];
    // Direction hint shown briefly on the minimap after the user presses H
    // or taps the Hint button. Cleared by setTimeout. Cost: -5 score.
    var hintDirState = useState(null);
    var hintDir = hintDirState[0], setHintDir = hintDirState[1];
    // Key-and-lock: a rotating golden key is placed at a random non-start,
    // non-exit cell. The exit portal stays locked (no win trigger) until the
    // player walks onto the key cell. Adds a meaningful side-objective vs
    // "just head to the bottom-right."
    var keyCollectedState = useState(false);
    var keyCollected = keyCollectedState[0], setKeyCollected = keyCollectedState[1];
    // keyPos is a ref (not state) so the animate loop and submitAnswer both
    // read the current position without stale-closure surprises.
    var keyPosRef = useRef(null);
    // Time medal awarded on win — 'gold' | 'silver' | 'bronze' | null. Thresholds
    // scale with maze size. Surfaces on the results screen.
    var medalState = useState(null);
    var medal = medalState[0], setMedal = medalState[1];
    var canvasRef = useRef(null);
    var playerPosRef = useRef({ r: 0, c: 0 });
    var timerRef = useRef(null);
    var monsterTimerRef = useRef(null);
    var inputRef = useRef(null);
    // 3D maze refs — hoisted above the early returns so the hook order is
    // stable across renders. Previously these sat after `if (mode === 'setup')
    // return ...`, which meant they were only called once the user started the
    // maze — crashing React with "Rendered more hooks than during the previous
    // render." (Rules of Hooks: every hook must be called on every render, in
    // the same order.)
    var maze3dRef = useRef(null);
    var maze3dEngRef = useRef(null);
    var maze3dAnimRef = useRef(0);
    // Cells the player has physically stood on. Drives the minimap breadcrumb
    // trail and fog-of-war, so we want this as a ref (mutated synchronously in
    // the move handler) rather than state (would trigger extra renders and
    // race with the correct-answer -> move sequence).
    var visitedCellsRef = useRef({ '0,0': true });
    // Animation-time tick used only to nudge the minimap redraw when the
    // you-are-here pulse / breadcrumb trail needs a frame-accurate update.
    var minimapTickRef = useRef(0);
    // Bump when we want the "wrong answer" screen shake to fire.
    var shakeRef = useRef(0);
    // Per-gate wrong-attempt counter — surfaces "Attempt 2" / "Attempt 3"
    // on the gate so retries feel acknowledged. Resets to 0 in tryMove
    // when a new problem appears.
    var attemptCountState = useState(0);
    var attemptCount = attemptCountState[0], setAttemptCount = attemptCountState[1];
    // First-run tutorial overlay — shown once per browser per device.
    // Dismissed on first move or by clicking the overlay. Persistent
    // localStorage flag prevents repeat exposure for returning students.
    var tutorialSeenState = useState(function() {
      try { return localStorage.getItem('fluency_maze_tutorial_seen') === '1'; }
      catch (e) { return true; /* if localStorage blocked, skip tutorial */ }
    });
    var tutorialSeen = tutorialSeenState[0], setTutorialSeen = tutorialSeenState[1];
    function _dismissTutorial() {
      try { localStorage.setItem('fluency_maze_tutorial_seen', '1'); } catch (e) {}
      setTutorialSeen(true);
    }
    // Streak milestone banner — text shown briefly when streak hits a
    // multiple of 3 (3, 6, 9...). Cleared by setTimeout so it doesn't
    // linger. Lives in maze view, not the gate, so it survives gate
    // dismissal on correct.
    var streakBannerState = useState('');
    var streakBanner = streakBannerState[0], setStreakBanner = streakBannerState[1];

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

    // BFS from player cell to exit cell respecting wall openings. Returns
    // the direction ('up'|'down'|'left'|'right') of the first step along
    // the shortest path, or null if no path exists (shouldn't happen for a
    // valid maze).
    function findHintDir() {
      if (!maze) return null;
      var start = playerPosRef.current;
      if (start.r === MAZE_ROWS - 1 && start.c === MAZE_COLS - 1) return null;
      var visited = {};
      visited[start.r + ',' + start.c] = null; // predecessor marker
      var queue = [start];
      var head = 0;
      while (head < queue.length) {
        var cur = queue[head++];
        if (cur.r === MAZE_ROWS - 1 && cur.c === MAZE_COLS - 1) {
          // Walk back to start-1 to find the first move direction.
          var node = cur;
          while (visited[node.r + ',' + node.c]) {
            var prev = visited[node.r + ',' + node.c];
            if (prev.r === start.r && prev.c === start.c) {
              if (node.r < prev.r) return 'up';
              if (node.r > prev.r) return 'down';
              if (node.c < prev.c) return 'left';
              if (node.c > prev.c) return 'right';
            }
            node = prev;
          }
          return null;
        }
        var cellH = maze[cur.r][cur.c];
        var neighbors = [];
        if (!cellH.walls.top && cur.r > 0) neighbors.push({ r: cur.r - 1, c: cur.c });
        if (!cellH.walls.bottom && cur.r < MAZE_ROWS - 1) neighbors.push({ r: cur.r + 1, c: cur.c });
        if (!cellH.walls.left && cur.c > 0) neighbors.push({ r: cur.r, c: cur.c - 1 });
        if (!cellH.walls.right && cur.c < MAZE_COLS - 1) neighbors.push({ r: cur.r, c: cur.c + 1 });
        for (var ni = 0; ni < neighbors.length; ni++) {
          var n = neighbors[ni];
          var key = n.r + ',' + n.c;
          if (!(key in visited)) {
            visited[key] = cur;
            queue.push(n);
          }
        }
      }
      return null;
    }

    function requestHint() {
      if (mode !== 'playing' || gameOver || won) return;
      var dir = findHintDir();
      if (!dir) return;
      setHintDir(dir);
      setScore(function(p) { return Math.max(0, p - 5); });
      setStreak(0); // using a hint resets combo — keeps it honest
      playTone(660, 0.08, 'sine', 0.04);
      setTimeout(function() { setHintDir(null); }, 2200);
    }

    function startMaze() {
      var sz = getMazeSize();
      var newMaze = generateMaze(sz.rows, sz.cols);
      setMaze(newMaze);
      setPlayerPos({ r: 0, c: 0 }); playerPosRef.current = { r: 0, c: 0 };
      // Reset breadcrumb trail — each new maze starts with only the origin lit.
      visitedCellsRef.current = { '0,0': true };
      setMonsterPos({ r: 0, c: 0 });
      setCurrentProblem(null);
      setScore(0); setCorrect(0); setWrong(0); setMoveCount(0); setElapsed(0);
      setGameOver(false); setWon(false); setFeedback('');
      setStreak(0); setHintDir(null);
      setKeyCollected(false);
      setMedal(null);
      // Pick a random cell for the key that isn't the start OR the exit, and
      // prefer cells at least 1/3 of the way from origin so the key detour
      // feels meaningful rather than incidental.
      var minDist = Math.floor((sz.rows + sz.cols) / 3);
      var candidates = [];
      for (var kr = 0; kr < sz.rows; kr++) {
        for (var kc = 0; kc < sz.cols; kc++) {
          if (kr === 0 && kc === 0) continue;
          if (kr === sz.rows - 1 && kc === sz.cols - 1) continue;
          if ((kr + kc) >= minDist) candidates.push({ r: kr, c: kc });
        }
      }
      if (candidates.length === 0) {
        // Tiny 2x2-ish fallback — just drop it in the middle.
        keyPosRef.current = { r: Math.floor(sz.rows / 2), c: Math.floor(sz.cols / 2) };
      } else {
        keyPosRef.current = candidates[Math.floor(Math.random() * candidates.length)];
      }
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
      if (!canMove) { setFeedback('wall'); playTone(140, 0.08, 'triangle', 0.06); setTimeout(function() { setFeedback(''); }, 300); return; }
      // Show a problem to solve before moving
      setCurrentProblem({ dir: dir, targetR: newR, targetC: newC, problem: makeProblem() });
      setUserInput('');
      setAttemptCount(0);
      setTimeout(function() { if (inputRef.current) inputRef.current.focus(); }, 50);
    }

    function submitAnswer() {
      if (!currentProblem) return;
      var ans = parseInt(userInput);
      if (ans === currentProblem.problem.answer) {
        // Correct — move to new cell
        var newPos = { r: currentProblem.targetR, c: currentProblem.targetC };
        setPlayerPos(newPos); playerPosRef.current = newPos;
        // Mark the cell we just left AND the new one as visited so both show
        // on the breadcrumb/fog-of-war minimap. Using a ref (not state) so
        // there's no extra re-render and no race with the playerPos update.
        visitedCellsRef.current[playerPos.r + ',' + playerPos.c] = true;
        visitedCellsRef.current[newPos.r + ',' + newPos.c] = true;
        if (!tutorialSeen) _dismissTutorial();
        // Streak bump. Every 3 in a row = bonus score + a little fanfare,
        // reinforcing sustained fluency rather than just isolated correct
        // answers. Captured here synchronously so the milestone check fires
        // on the same tick as the increment.
        var nextStreak = streak + 1;
        setStreak(nextStreak);
        var streakBonus = 0;
        if (nextStreak > 0 && nextStreak % 3 === 0) {
          streakBonus = 5 + nextStreak; // 8 @3, 11 @6, 14 @9, …
          setStreakBanner('\uD83D\uDD25 STREAK x' + nextStreak + '! +' + streakBonus + ' bonus');
          setTimeout(function() { setStreakBanner(''); }, 1500);
          if (addToast) addToast('\uD83D\uDD25 Streak x' + nextStreak + '! +' + streakBonus + ' bonus', 'success');
          // Quick ascending chime for the milestone
          playTone(880, 0.06, 'sine', 0.05);
          setTimeout(function() { playTone(1175, 0.06, 'sine', 0.05); }, 70);
          setTimeout(function() { playTone(1568, 0.08, 'sine', 0.05); }, 140);
        }
        setCorrect(function(p) { return p + 1; });
        setScore(function(p) { return p + 10 + streakBonus; });
        setMoveCount(function(p) { return p + 1; });
        setFeedback('correct');
        _mfAnnounce('Gate opens. ' + currentProblem.problem.text + ' equals ' + currentProblem.problem.answer + '.');
        // Clear any active hint — reward for solving without it
        setHintDir(null);
        playTone(880, 0.05, 'sine', 0.06);
        setTimeout(function() { playTone(1320, 0.05, 'sine', 0.05); }, 50);
        // 3D feedback: green ambient flash + gem drop at the cell we just left
        var eng3d = maze3dEngRef.current;
        if (eng3d) {
          eng3d._feedbackFlash = 1;
          eng3d.scene.children.forEach(function(c) { if (c.isAmbientLight) c.color.setHex(0x22aa44); c.intensity = 0.8; });
          if (window.THREE && eng3d.gems) {
            // Gem colors cycle through a pleasant spread so solves read as
            // distinct rewards rather than "green dots."
            var gemColors = [0x22c55e, 0x3b82f6, 0xa855f7, 0xec4899, 0xfbbf24, 0x06b6d4];
            var gemColor = gemColors[eng3d.gems.length % gemColors.length];
            var gemMat = new window.THREE.MeshStandardMaterial({ color: gemColor, emissive: gemColor, emissiveIntensity: 0.8, transparent: true, opacity: 0.9, metalness: 0.3, roughness: 0.2 });
            // Octahedron geometry reads as a faceted crystal/gem.
            var gem = new window.THREE.Mesh(new window.THREE.OctahedronGeometry(0.14, 0), gemMat);
            var gcx = playerPos.c * 2 + 1, gcz = playerPos.r * 2 + 1;
            gem.position.set(gcx, 0.7, gcz);
            gem.userData._baseY = 0.7;
            eng3d.scene.add(gem);
            eng3d.gems.push(gem);
            // Gem-burst — 10 small sparks fly outward from the gem spawn
            // point. Gravity pulls them down; they fade and self-reap in the
            // animate() particle loop.
            if (!eng3d._particles) eng3d._particles = [];
            for (var burstI = 0; burstI < 10; burstI++) {
              var sparkMat = new window.THREE.MeshBasicMaterial({ color: gemColor, transparent: true, opacity: 1 });
              var spark = new window.THREE.Mesh(new window.THREE.BoxGeometry(0.05, 0.05, 0.05), sparkMat);
              spark.position.set(gcx, 0.7, gcz);
              spark.userData._age = 0;
              spark.userData._life = 0.9;
              spark.userData._gravity = 8;
              var ang = Math.random() * Math.PI * 2;
              var spd = 1.5 + Math.random() * 1.5;
              spark.userData._vel = { x: Math.cos(ang) * spd, y: 2 + Math.random() * 1.5, z: Math.sin(ang) * spd };
              eng3d.scene.add(spark);
              eng3d._particles.push(spark);
            }
          }
        }
        // Key pickup — if the new cell is the key cell, collect the key and
        // unlock the exit. Triggers a bright gold burst + chime.
        var kp = keyPosRef.current;
        if (!keyCollected && kp && newPos.r === kp.r && newPos.c === kp.c) {
          setKeyCollected(true);
          _mfAnnounce('Golden key collected. The exit is now unlocked.');
          if (addToast) addToast('\uD83D\uDDDD\uFE0F Key collected! Portal unlocked', 'success');
          playTone(1175, 0.08, 'sine', 0.06);
          setTimeout(function() { playTone(1568, 0.1, 'sine', 0.05); }, 80);
          setTimeout(function() { playTone(1976, 0.12, 'sine', 0.05); }, 160);
          if (eng3d && window.THREE) {
            // Remove the 3D key mesh
            if (eng3d.keyMesh) {
              eng3d.scene.remove(eng3d.keyMesh);
              if (eng3d.keyMesh.geometry) eng3d.keyMesh.geometry.dispose();
              if (eng3d.keyMesh.material) eng3d.keyMesh.material.dispose();
              eng3d.keyMesh = null;
            }
            // Gold celebratory sparks
            if (!eng3d._particles) eng3d._particles = [];
            for (var kb = 0; kb < 20; kb++) {
              var goldMat = new window.THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 1 });
              var goldSpark = new window.THREE.Mesh(new window.THREE.OctahedronGeometry(0.06, 0), goldMat);
              var kgx = kp.c * 2 + 1, kgz = kp.r * 2 + 1;
              goldSpark.position.set(kgx, 1.0, kgz);
              goldSpark.userData._age = 0;
              goldSpark.userData._life = 1.3;
              goldSpark.userData._gravity = 4;
              var kang = Math.random() * Math.PI * 2;
              var kspd = 1.8 + Math.random() * 2;
              goldSpark.userData._vel = { x: Math.cos(kang) * kspd, y: 2 + Math.random() * 2, z: Math.sin(kang) * kspd };
              eng3d.scene.add(goldSpark);
              eng3d._particles.push(goldSpark);
            }
          }
        }
        // Check win — only triggers when the key is collected AND the player
        // reached the exit cell. Exit-without-key plays a locked chime.
        var atExit = currentProblem.targetR === MAZE_ROWS - 1 && currentProblem.targetC === MAZE_COLS - 1;
        if (atExit && !keyCollected && !(kp && newPos.r === kp.r && newPos.c === kp.c)) {
          // Player reached the exit but hasn't grabbed the key yet — lock
          // rattle sound + toast. They can keep moving freely; it just means
          // they have to backtrack through the key.
          if (addToast) addToast('\uD83D\uDD12 Portal is locked — find the key first', 'error');
          playTone(180, 0.12, 'sawtooth', 0.03);
          setTimeout(function() { playTone(160, 0.15, 'sawtooth', 0.03); }, 100);
        }
        if (atExit && (keyCollected || (kp && newPos.r === kp.r && newPos.c === kp.c))) {
          setWon(true); setMode('results');
          if (timerRef.current) clearInterval(timerRef.current);
          if (monsterTimerRef.current) clearInterval(monsterTimerRef.current);
          // Medal thresholds scale with maze size — baseline is 2 seconds per
          // cell, which is a sprinter's pace. Gold = 60% of that, silver =
          // 100%, bronze = 180%. Beyond that, no medal (still a valid win).
          var baseSec = MAZE_ROWS * MAZE_COLS * 2;
          var medalKind = null;
          var medalBonus = 0;
          if (elapsed <= baseSec * 0.6) { medalKind = 'gold'; medalBonus = 20; }
          else if (elapsed <= baseSec) { medalKind = 'silver'; medalBonus = 10; }
          else if (elapsed <= baseSec * 1.8) { medalKind = 'bronze'; medalBonus = 5; }
          setMedal(medalKind);
          var finalScore = score + 10 + medalBonus;
          if (medalKind && addToast) {
            var medalEmoji = { gold: '\uD83E\uDD47', silver: '\uD83E\uDD48', bronze: '\uD83E\uDD49' }[medalKind];
            addToast(medalEmoji + ' ' + medalKind.toUpperCase() + ' TIME! +' + medalBonus + ' bonus', 'success');
          }
          _mfAnnounce('Maze complete! ' + (correct + 1) + ' gates unlocked in ' + elapsed + ' seconds.');
          if (addToast) addToast('\uD83C\uDFC6 Maze complete! ' + (correct + 1) + ' correct in ' + elapsed + 's', 'success');
          if (handleScoreUpdate) handleScoreUpdate(Math.round((correct + 1) / Math.max(1, elapsed) * 60) + medalBonus, 'Fluency Maze Complete', 'fluency-maze');
          // Save high score — keyed per (operation, size, difficulty) so
          // distinct practice modes don't overwrite each other's bests.
          // Legacy 'fluency_maze_best' (single global) is preserved as a
          // fallback so existing students don't lose their prior best.
          try {
            var bestKey = operation + '|' + mazeSize + '|' + difficulty;
            var bestStore = JSON.parse(localStorage.getItem('fluency_maze_bests') || '{}');
            var prior = bestStore[bestKey];
            if (!prior || finalScore > prior.score) {
              bestStore[bestKey] = { score: finalScore, correct: correct + 1, wrong: wrong, time: elapsed, op: operation, size: mazeSize, difficulty: difficulty, savedAt: Date.now() };
              localStorage.setItem('fluency_maze_bests', JSON.stringify(bestStore));
              if (prior) _mfAnnounce('New personal best for this mode: ' + finalScore + ' points.');
            }
            // Keep legacy global record in sync so the old key still works
            var legacy = JSON.parse(localStorage.getItem('fluency_maze_best') || '{}');
            if (!legacy.score || finalScore > legacy.score) {
              localStorage.setItem('fluency_maze_best', JSON.stringify({ score: finalScore, correct: correct + 1, wrong: wrong, time: elapsed, op: operation, size: mazeSize }));
            }
          } catch(e) {}
          // 3D completion celebration — denser confetti + bigger spread +
          // a floating "MAZE COMPLETE" banner sprite in front of the camera.
          var eng3dC = maze3dEngRef.current;
          if (eng3dC && window.THREE) {
            var THREE = window.THREE;
            var confColors = [0xfbbf24, 0x22c55e, 0x7c3aed, 0xef4444, 0x3b82f6, 0xec4899, 0x06b6d4, 0xf97316];
            if (!eng3dC._particles) eng3dC._particles = [];
            // 70 confetti bits (was 20) — mix of cubes and thin ribbons for
            // visual variety.
            for (var ci = 0; ci < 70; ci++) {
              var isRibbon = ci % 3 === 0;
              var cGeo = isRibbon
                ? new THREE.BoxGeometry(0.14, 0.02, 0.02)
                : new THREE.BoxGeometry(0.08, 0.08, 0.08);
              var cMat = new THREE.MeshBasicMaterial({ color: confColors[ci % confColors.length], transparent: true, opacity: 1 });
              var cMesh = new THREE.Mesh(cGeo, cMat);
              cMesh.position.copy(eng3dC.camera.position);
              cMesh.userData._age = 0; cMesh.userData._life = 2.5 + Math.random() * 1.5;
              cMesh.userData._gravity = 5;
              cMesh.userData._vel = {
                x: (Math.random() - 0.5) * 7,
                y: 4 + Math.random() * 4,
                z: (Math.random() - 0.5) * 7
              };
              eng3dC.scene.add(cMesh);
              eng3dC._particles.push(cMesh);
            }
            // Floating banner — Canvas-rendered "MAZE COMPLETE" sprite placed
            // ahead of the camera at the time of winning. Fades via the same
            // particle-aging pipeline so it disappears with the confetti.
            try {
              var bannerCnv = document.createElement('canvas');
              bannerCnv.width = 512; bannerCnv.height = 128;
              var bctx = bannerCnv.getContext('2d');
              bctx.fillStyle = 'rgba(15,23,42,0.85)';
              bctx.fillRect(0, 0, 512, 128);
              bctx.strokeStyle = '#fbbf24'; bctx.lineWidth = 4;
              bctx.strokeRect(6, 6, 500, 116);
              bctx.font = 'bold 56px Georgia, serif';
              bctx.textAlign = 'center'; bctx.textBaseline = 'middle';
              bctx.fillStyle = '#fde047';
              bctx.shadowColor = '#f59e0b'; bctx.shadowBlur = 20;
              bctx.fillText('\uD83C\uDFC6 MAZE COMPLETE', 256, 64);
              var bannerTex = new THREE.CanvasTexture(bannerCnv);
              var banner = new THREE.Sprite(new THREE.SpriteMaterial({ map: bannerTex, transparent: true, opacity: 1 }));
              banner.scale.set(4, 1, 1);
              // Position ~2 units in front of the current camera facing.
              var camDir = new THREE.Vector3();
              eng3dC.camera.getWorldDirection(camDir);
              var bp = eng3dC.camera.position.clone().addScaledVector(camDir, 2.5);
              banner.position.copy(bp);
              banner.userData._age = 0;
              banner.userData._life = 4;
              banner.userData._gravity = 0; // floats, doesn't fall
              banner.userData._vel = { x: 0, y: 0.2, z: 0 };
              eng3dC.scene.add(banner);
              eng3dC._particles.push(banner);
            } catch (bErr) { /* banner is optional polish; swallow */ }
          }
        }
      } else {
        // Wrong — don't move, penalty, streak broken. KEEP the gate open
        // so the student can retry the same fact (was: dismiss + force
        // re-navigation). Just clear the input, shake the gate visually,
        // and re-focus the hidden input for keyboard users.
        setWrong(function(p) { return p + 1; });
        setScore(function(p) { return Math.max(0, p - 3); });
        setStreak(0);
        setFeedback('wrong');
        _mfAnnounce('Wrong combination. The gate stays locked. Try again.');
        setAttemptCount(function(p) { return p + 1; });
        playTone(220, 0.1, 'triangle', 0.04);
        // Lower harmonic clang so the wrong-answer audio reads as a locked
        // gate rejecting the wrong combination.
        setTimeout(function() { playTone(165, 0.18, 'triangle', 0.05); }, 80);
        shakeRef.current = 1;
        var eng3dW = maze3dEngRef.current;
        if (eng3dW) { eng3dW._feedbackFlash = 1; eng3dW.scene.children.forEach(function(c) { if (c.isAmbientLight) c.color.setHex(0xaa2222); c.intensity = 0.8; }); }
        setUserInput('');
        setTimeout(function() { if (inputRef.current) inputRef.current.focus(); }, 50);
        setTimeout(function() { setFeedback(''); }, 600);
        return;  // skip the dismiss-gate path below
      }
      // Correct path: dismiss the gate after a brief beat so the green
      // flash + key-turn audio register before the overlay disappears.
      setTimeout(function() {
        setCurrentProblem(null);
        setFeedback('');
      }, 220);
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
        if (e.key === 'h' || e.key === 'H') requestHint();
      }
      document.addEventListener('keydown', handleKey);
      return function() { document.removeEventListener('keydown', handleKey); };
    });

    // Draw maze on canvas — minimap + 2D fallback. Features:
    //   · fog of war: unseen cells are dim (still drawn so the shape is legible)
    //   · breadcrumb trail: visited cells tinted indigo
    //   · you-are-here pulse: animated ring around current cell
    // The draw runs on every render (no dep array) and a small RAF-driven
    // tick (minimapTickRef) keeps the pulse smooth.
    useEffect(function() {
      if (!maze || !canvasRef.current) return;
      var cv = canvasRef.current;
      var ctx = cv.getContext('2d');
      var W = MAZE_COLS * CELL_SIZE;
      var H = MAZE_ROWS * CELL_SIZE;
      cv.width = W; cv.height = H;
      var visited = visitedCellsRef.current || { '0,0': true };
      var pulse = Math.sin(minimapTickRef.current * 0.12) * 0.5 + 0.5; // 0..1
      // Wrong-answer screen shake — shakeRef is set to 1 in submitAnswer's
      // wrong path and decayed here each frame. Applies a small random
      // offset to the entire canvas so the maze visibly jolts when the
      // gate rejects a bad answer. Decay rate keeps it under ~600ms.
      var shake = shakeRef.current || 0;
      if (shake > 0.02) {
        ctx.save();
        ctx.translate((Math.random() - 0.5) * shake * 12, (Math.random() - 0.5) * shake * 12);
        shakeRef.current = shake * 0.86;
      } else {
        shakeRef.current = 0;
      }

      // A cell is "seen" if visited OR any 4-neighbor is visited — gives the
      // player a little peek-ahead so corridors aren't completely opaque.
      function seen(r, c) {
        if (visited[r + ',' + c]) return true;
        return !!(visited[(r - 1) + ',' + c] || visited[(r + 1) + ',' + c] || visited[r + ',' + (c - 1)] || visited[r + ',' + (c + 1)]);
      }

      // Background — warm parchment-stone tone instead of slate-900, so
      // the dungeon reads like a torchlit corridor rather than a void.
      ctx.fillStyle = '#3a2e26'; ctx.fillRect(0, 0, W, H);

      // Soft amber base wash to evoke torchlight
      var grad = ctx.createRadialGradient(W * 0.5, H * 0.5, 10, W * 0.5, H * 0.5, Math.max(W, H) * 0.7);
      grad.addColorStop(0, 'rgba(251,191,36,0.05)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

      // Draw cells
      for (var r = 0; r < MAZE_ROWS; r++) {
        for (var c = 0; c < MAZE_COLS; c++) {
          var cell = maze[r][c];
          var x = c * CELL_SIZE, y = r * CELL_SIZE;
          var isVisited = !!visited[r + ',' + c];
          var isSeen = seen(r, c);
          // Floor tint — warm tan for visible corridor floor (was near-black).
          if (isSeen) {
            ctx.fillStyle = 'rgba(217,180,140,0.18)';
            ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
          }
          // Fog-of-war: lighter warm-brown overlay (was rgba(2,6,20,0.85),
          // a near-opaque black). Keeps the unexplored region distinct
          // without making it feel oppressive.
          if (!isSeen) {
            ctx.fillStyle = 'rgba(58,46,38,0.55)';
            ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
          }
          // Cell floor
          if (r === 0 && c === 0) { ctx.fillStyle = 'rgba(34,197,94,0.28)'; ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE); } // start
          else if (r === MAZE_ROWS - 1 && c === MAZE_COLS - 1) { ctx.fillStyle = 'rgba(251,191,36,0.32)'; ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE); } // exit
          // Breadcrumb tint for visited non-special cells — warm amber so it
          // reads like dwindling torchlight rather than a cold blue trail.
          else if (isVisited) {
            ctx.fillStyle = 'rgba(251,191,36,0.10)';
            ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
          }
          // Walls — warmer stone tone, brighter for seen cells.
          ctx.strokeStyle = isSeen ? '#a8957d' : '#5b4d3f';
          ctx.lineWidth = 2;
          if (cell.walls.top) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + CELL_SIZE, y); ctx.stroke(); }
          if (cell.walls.right) { ctx.beginPath(); ctx.moveTo(x + CELL_SIZE, y); ctx.lineTo(x + CELL_SIZE, y + CELL_SIZE); ctx.stroke(); }
          if (cell.walls.bottom) { ctx.beginPath(); ctx.moveTo(x, y + CELL_SIZE); ctx.lineTo(x + CELL_SIZE, y + CELL_SIZE); ctx.stroke(); }
          if (cell.walls.left) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + CELL_SIZE); ctx.stroke(); }
        }
      }

      // ── Torches ────────────────────────────────────────────────────────
      // Place a flickering torch every ~4 cells along the corridor walls so
      // the dungeon reads as lit, not abandoned. Position is deterministic
      // by cell coords so torches don't dance around between renders, but
      // each torch's intensity flickers using minimapTickRef + a phase
      // offset derived from the cell so neighboring torches aren't in sync.
      ctx.save();
      for (var tr = 0; tr < MAZE_ROWS; tr++) {
        for (var tc = 0; tc < MAZE_COLS; tc++) {
          // Sparse placement — every 4th cell along a stable hash, only
          // where the cell is seen (don't reveal unexplored corridors).
          if ((tr * 5 + tc * 3) % 4 !== 0) continue;
          if (!seen(tr, tc)) continue;
          var tcx = (tc + 0.5) * CELL_SIZE;
          var tcy = (tr + 0.5) * CELL_SIZE;
          var phase = (tr * 17 + tc * 31) * 0.05;
          var flicker = 0.7 + 0.3 * Math.sin(minimapTickRef.current * 0.18 + phase);
          // Halo
          var torchGrad = ctx.createRadialGradient(tcx, tcy, 1, tcx, tcy, CELL_SIZE * 1.1);
          torchGrad.addColorStop(0, 'rgba(255,200,80,' + (0.40 * flicker) + ')');
          torchGrad.addColorStop(0.5, 'rgba(255,140,40,' + (0.18 * flicker) + ')');
          torchGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = torchGrad;
          ctx.fillRect(tcx - CELL_SIZE * 1.1, tcy - CELL_SIZE * 1.1, CELL_SIZE * 2.2, CELL_SIZE * 2.2);
          // Flame core
          ctx.fillStyle = 'rgba(255,220,120,' + (0.85 * flicker) + ')';
          ctx.beginPath();
          ctx.arc(tcx, tcy, 3 + flicker * 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      // Breadcrumb dots on each visited cell (excluding current position, which
      // gets its own cat emoji below) — reinforces the trail even when many
      // cells share the same indigo tint.
      ctx.fillStyle = 'rgba(199,210,254,0.65)';
      for (var vk in visited) {
        if (!Object.prototype.hasOwnProperty.call(visited, vk)) continue;
        var parts = vk.split(',');
        var vr = parseInt(parts[0]), vc = parseInt(parts[1]);
        if (vr === playerPos.r && vc === playerPos.c) continue;
        ctx.beginPath(); ctx.arc(vc * CELL_SIZE + CELL_SIZE / 2, vr * CELL_SIZE + CELL_SIZE / 2, 2.5, 0, Math.PI * 2); ctx.fill();
      }

      // Start label
      ctx.fillStyle = '#22c55e'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('START', CELL_SIZE / 2, CELL_SIZE / 2 + 14);
      // Key icon — visible even in unseen cells, dim when unseen so the
      // player has a faint sense of where to head but still discovers the
      // exact route through exploration.
      var kMini = keyPosRef.current;
      if (kMini && !keyCollected) {
        var keySeen = seen(kMini.r, kMini.c);
        ctx.globalAlpha = keySeen ? 1 : 0.45;
        ctx.font = '18px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('\uD83D\uDDDD\uFE0F', (kMini.c + 0.5) * CELL_SIZE, (kMini.r + 0.5) * CELL_SIZE + 6);
        ctx.globalAlpha = 1;
      }
      // Exit label (only if seen — keeps the goal mysterious until you're near).
      // Locked version (no key yet) gets a lock glyph; unlocked gets the star.
      var exitSeen = seen(MAZE_ROWS - 1, MAZE_COLS - 1);
      if (exitSeen) {
        ctx.fillStyle = keyCollected ? '#fbbf24' : '#94a3b8';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(keyCollected ? 'EXIT' : 'LOCKED', (MAZE_COLS - 0.5) * CELL_SIZE, (MAZE_ROWS - 0.5) * CELL_SIZE + 14);
        ctx.font = '18px sans-serif';
        ctx.fillText(keyCollected ? '\u2B50' : '\uD83D\uDD12', (MAZE_COLS - 0.5) * CELL_SIZE, (MAZE_ROWS - 0.5) * CELL_SIZE);
      }

      // Monster (chase mode) — only draw if its cell is seen, so unseen
      // monster location doesn't leak map info.
      if (chaseMode && mode === 'playing' && !gameOver && seen(monsterPos.r, monsterPos.c)) {
        ctx.font = '22px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('\uD83D\uDC7E', (monsterPos.c + 0.5) * CELL_SIZE, (monsterPos.r + 0.5) * CELL_SIZE + 6);
      }

      // Player-carried lantern light — soft amber radial glow centered on
      // the player's cell. Sits over fog/breadcrumbs but under the player
      // marker so the player feels like they're carrying their own light
      // source through the dungeon. Pulse-coupled with the existing player
      // ring so the lantern subtly breathes with each draw.
      var pcx = (playerPos.c + 0.5) * CELL_SIZE;
      var pcy = (playerPos.r + 0.5) * CELL_SIZE;
      ctx.save();
      var lanternRadius = CELL_SIZE * (1.7 + pulse * 0.25);
      var lanternGrad = ctx.createRadialGradient(pcx, pcy, 4, pcx, pcy, lanternRadius);
      lanternGrad.addColorStop(0, 'rgba(255,235,170,0.55)');
      lanternGrad.addColorStop(0.45, 'rgba(255,180,80,0.25)');
      lanternGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalCompositeOperation = 'lighter'; // additive blend → reads as light
      ctx.fillStyle = lanternGrad;
      ctx.fillRect(pcx - lanternRadius, pcy - lanternRadius, lanternRadius * 2, lanternRadius * 2);
      ctx.restore();
      // Player — animated "you are here" ring first, then the cat on top.
      ctx.strokeStyle = 'rgba(99,102,241,' + (0.35 + pulse * 0.45) + ')';
      ctx.lineWidth = 2 + pulse * 2;
      ctx.beginPath(); ctx.arc(pcx, pcy, CELL_SIZE * 0.32 + pulse * 4, 0, Math.PI * 2); ctx.stroke();
      // Hint arrow — pulses toward the next-step direction the BFS picked.
      if (hintDir) {
        var arrowGlyph = { up: '\u2B06', down: '\u2B07', left: '\u2B05', right: '\u27A1' }[hintDir] || '';
        if (arrowGlyph) {
          ctx.save();
          ctx.font = 'bold 26px sans-serif';
          ctx.textAlign = 'center';
          ctx.shadowColor = '#fde047';
          ctx.shadowBlur = 10 + pulse * 8;
          ctx.fillStyle = '#fde047';
          ctx.fillText(arrowGlyph, pcx, pcy + 10);
          ctx.restore();
        }
      }
      ctx.font = '22px sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText('\uD83D\uDC31', pcx, pcy + 6);

      // Feedback flash
      if (feedback === 'correct') { ctx.fillStyle = 'rgba(34,197,94,0.2)'; ctx.fillRect(playerPos.c * CELL_SIZE, playerPos.r * CELL_SIZE, CELL_SIZE, CELL_SIZE); }
      if (feedback === 'wrong') { ctx.fillStyle = 'rgba(239,68,68,0.2)'; ctx.fillRect(playerPos.c * CELL_SIZE, playerPos.r * CELL_SIZE, CELL_SIZE, CELL_SIZE); }
      if (feedback === 'wall') { ctx.fillStyle = 'rgba(148,163,184,0.15)'; ctx.fillRect(playerPos.c * CELL_SIZE, playerPos.r * CELL_SIZE, CELL_SIZE, CELL_SIZE); }
      // Pair the conditional ctx.save() at the top of this draw — only
      // call restore() if we actually pushed the shake transform.
      if (shake > 0.02) ctx.restore();
    });

    // Minimap pulse RAF — bumps minimapTickState on a throttled cadence
    // (every 3 frames ~= 20 Hz) so the you-are-here ring animates smoothly
    // without swamping React with 60 re-renders/sec. Only runs during play.
    var setMinimapTick = minimapTickState[1];
    useEffect(function() {
      if (mode !== 'playing') return;
      var rafId = 0;
      var frame = 0;
      var tick = function() {
        frame++;
        if (frame % 3 === 0) {
          minimapTickRef.current = frame;
          setMinimapTick(frame); // triggers minimap redraw via the render cycle
        }
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
      return function() { cancelAnimationFrame(rafId); };
    }, [mode, setMinimapTick]);

    // Cleanup timers
    useEffect(function() {
      return function() {
        if (timerRef.current) clearInterval(timerRef.current);
        if (monsterTimerRef.current) clearInterval(monsterTimerRef.current);
      };
    }, []);

    // 3D maze init — hoisted above the early returns for stable hook order.
    // The internal `if (mode !== 'playing' || !maze) return;` guard makes this
    // a no-op until the user actually starts a maze, so the effect body only
    // runs at the right time.
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

      // Lighting — torch sprite adds a soft glow card so the flame reads as
      // bright even without a post-processing bloom pass.
      eng.scene.add(new THREE.AmbientLight(0x222244, 0.3));
      var torchLight = new THREE.PointLight(0xffaa44, 1.2, 8);
      torchLight.position.set(0, 2, 0);
      eng.camera.add(torchLight);
      var torchGlowTex = buildGlowSpriteTexture(THREE, 0xffaa44);
      var torchGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: torchGlowTex, color: 0xffaa44, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
      torchGlow.scale.set(1.2, 1.2, 1);
      torchGlow.position.set(0, 2, 0.1);
      eng.camera.add(torchGlow);
      eng.scene.add(eng.camera);

      // Textures — built once, reused across all walls/floor/ceiling.
      var wallTex = buildStoneTexture(THREE, 'rgb(46,42,66)');
      wallTex.repeat.set(1.5, 1.2);
      var floorTex = buildStoneTexture(THREE, 'rgb(28,26,42)');
      floorTex.repeat.set(MAZE_COLS * 0.8, MAZE_ROWS * 0.8);
      var ceilTex = buildStoneTexture(THREE, 'rgb(16,14,28)');
      ceilTex.repeat.set(MAZE_COLS * 0.8, MAZE_ROWS * 0.8);
      eng._textures = [wallTex, floorTex, ceilTex];

      // Floor
      var floorMat = new THREE.MeshStandardMaterial({ map: floorTex, color: 0xffffff, roughness: 0.95 });
      var floor = new THREE.Mesh(new THREE.PlaneGeometry(MAZE_COLS * 2, MAZE_ROWS * 2), floorMat);
      floor.rotation.x = -Math.PI / 2; floor.position.set(MAZE_COLS, 0, MAZE_ROWS);
      eng.scene.add(floor);

      // Ceiling
      var ceil = new THREE.Mesh(new THREE.PlaneGeometry(MAZE_COLS * 2, MAZE_ROWS * 2), new THREE.MeshStandardMaterial({ map: ceilTex, color: 0xffffff, roughness: 0.95 }));
      ceil.rotation.x = Math.PI / 2; ceil.position.set(MAZE_COLS, 2.5, MAZE_ROWS);
      eng.scene.add(ceil);

      // Build walls from maze grid
      var wallMat = new THREE.MeshStandardMaterial({ map: wallTex, color: 0xffffff, roughness: 0.85 });
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

      // Dust motes — ~200 floating particles drifting slowly through the
      // whole maze volume. Each mote also carries a per-particle phase so the
      // cloud doesn't drift in lockstep.
      var dustGeo = new THREE.BufferGeometry();
      var dustCount = 220;
      var dustPositions = new Float32Array(dustCount * 3);
      var dustPhases = new Float32Array(dustCount);
      for (var di = 0; di < dustCount; di++) {
        dustPositions[di * 3 + 0] = Math.random() * MAZE_COLS * 2;
        dustPositions[di * 3 + 1] = 0.3 + Math.random() * 2.0;
        dustPositions[di * 3 + 2] = Math.random() * MAZE_ROWS * 2;
        dustPhases[di] = Math.random() * Math.PI * 2;
      }
      dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
      var dustMat = new THREE.PointsMaterial({
        color: 0xffd9a0,
        size: 0.05,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      eng.dust = new THREE.Points(dustGeo, dustMat);
      eng.dust.userData.phases = dustPhases;
      eng.scene.add(eng.dust);

      // Wall torches — pick ~1/3 of interior wall segments and mount a small
      // wooden sconce with a flickering flame sprite + point light. Keeps the
      // count modest so WebGL stays smooth on classroom devices.
      eng.torches = [];
      var flameTex = buildGlowSpriteTexture(THREE, 0xff9944);
      var sconceMat = new THREE.MeshStandardMaterial({ color: 0x3a2815, roughness: 1 });
      var torchTargetCount = Math.round((MAZE_COLS + MAZE_ROWS) * 1.2);
      var torchCandidates = [];
      for (var tr = 0; tr < MAZE_ROWS; tr++) {
        for (var tc = 0; tc < MAZE_COLS; tc++) {
          var cellT = maze[tr][tc];
          // Favor outer walls (visible more often) but include some interior.
          if (cellT.walls.top && tr > 0) torchCandidates.push({ r: tr, c: tc, side: 'top' });
          if (cellT.walls.left && tc > 0) torchCandidates.push({ r: tr, c: tc, side: 'left' });
        }
      }
      // Fisher-Yates shuffle so the torch locations are varied each run
      for (var shI = torchCandidates.length - 1; shI > 0; shI--) {
        var shJ = Math.floor(Math.random() * (shI + 1));
        var tmp = torchCandidates[shI]; torchCandidates[shI] = torchCandidates[shJ]; torchCandidates[shJ] = tmp;
      }
      var torchN = Math.min(torchTargetCount, torchCandidates.length);
      for (var tt = 0; tt < torchN; tt++) {
        var cand = torchCandidates[tt];
        var tcx = cand.c * 2 + 1, tcz = cand.r * 2 + 1;
        var tOff = cand.side === 'top' ? { x: 0, z: -0.95 } : { x: -0.95, z: 0 };
        var torchGroup = new THREE.Group();
        torchGroup.position.set(tcx + tOff.x, 1.7, tcz + tOff.z);
        // Sconce (small wooden bracket)
        var sconce = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.08), sconceMat);
        sconce.position.y = -0.05; torchGroup.add(sconce);
        // Flame sprite
        var flameSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, color: 0xffb066, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
        flameSprite.scale.set(0.55, 0.7, 1);
        flameSprite.position.y = 0.2;
        torchGroup.add(flameSprite);
        // Point light — low-intensity so many torches don't blow out the scene
        var tLight = new THREE.PointLight(0xff8844, 0.7, 3.2);
        tLight.position.y = 0.15;
        torchGroup.add(tLight);
        eng.scene.add(torchGroup);
        torchGroup.userData.phase = Math.random() * Math.PI * 2;
        torchGroup.flame = flameSprite;
        torchGroup.light = tLight;
        eng.torches.push(torchGroup);
      }

      // Exit portal — rotating torus + particle ring + pulsing light. A step
      // up from the old static sphere; reads clearly as a goal.
      var exitLight = new THREE.PointLight(0xfbbf24, 1.8, 7);
      exitLight.position.set((MAZE_COLS - 1) * 2 + 1, 1.5, (MAZE_ROWS - 1) * 2 + 1);
      eng.scene.add(exitLight);
      eng.exitLight = exitLight;
      var portalGroup = new THREE.Group();
      portalGroup.position.copy(exitLight.position); portalGroup.position.y = 1.0;
      eng.scene.add(portalGroup);
      eng.exitPortal = portalGroup;
      // Outer ring
      var ringGeo = new THREE.TorusGeometry(0.55, 0.06, 12, 28);
      var ringMat = new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.9 });
      eng.exitRing = new THREE.Mesh(ringGeo, ringMat);
      portalGroup.add(eng.exitRing);
      // Inner swirl — smaller ring rotating in the opposite axis for a vortex feel
      var swirlMat = new THREE.MeshBasicMaterial({ color: 0xfb923c, transparent: true, opacity: 0.6 });
      eng.exitSwirl = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.04, 10, 24), swirlMat);
      eng.exitSwirl.rotation.x = Math.PI / 2;
      portalGroup.add(eng.exitSwirl);
      // Glow card behind the portal so it pops against the dark wall
      var portalGlowTex = buildGlowSpriteTexture(THREE, 0xfbbf24);
      var portalGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: portalGlowTex, color: 0xfde047, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
      portalGlow.scale.set(2.4, 2.4, 1);
      portalGroup.add(portalGlow);
      eng.exitGlow = portalGlow;
      // Particle swirl — 40 small points orbiting the portal
      var portalPCount = 40;
      var portalPGeo = new THREE.BufferGeometry();
      var portalPPos = new Float32Array(portalPCount * 3);
      var portalPPhases = new Float32Array(portalPCount);
      for (var pp = 0; pp < portalPCount; pp++) {
        portalPPhases[pp] = (pp / portalPCount) * Math.PI * 2;
        portalPPos[pp * 3 + 0] = Math.cos(portalPPhases[pp]) * 0.6;
        portalPPos[pp * 3 + 1] = Math.sin(portalPPhases[pp] * 3) * 0.15;
        portalPPos[pp * 3 + 2] = Math.sin(portalPPhases[pp]) * 0.6;
      }
      portalPGeo.setAttribute('position', new THREE.BufferAttribute(portalPPos, 3));
      var portalPMat = new THREE.PointsMaterial({ color: 0xfde047, size: 0.09, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
      eng.exitParticles = new THREE.Points(portalPGeo, portalPMat);
      eng.exitParticles.userData.phases = portalPPhases;
      portalGroup.add(eng.exitParticles);

      // Gems array for correct-answer breadcrumbs (populated by submitAnswer)
      eng.gems = [];

      // Key mesh — golden cross-shaped key (torus "bow" + shaft + teeth).
      // Rotates and bobs via the animate() loop. Picked up by submitAnswer
      // when the player walks onto keyPosRef.current's cell.
      if (keyPosRef.current && !keyCollected) {
        var keyGroup = new THREE.Group();
        var kpc = keyPosRef.current;
        keyGroup.position.set(kpc.c * 2 + 1, 1.1, kpc.r * 2 + 1);
        eng.scene.add(keyGroup);
        eng.keyMesh = keyGroup;
        eng.keyMesh.userData._baseY = 1.1;
        var goldMatKey = new THREE.MeshStandardMaterial({ color: 0xfde047, emissive: 0xfbbf24, emissiveIntensity: 0.7, metalness: 0.8, roughness: 0.25 });
        // Bow (round part of the key)
        var bow = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 10, 20), goldMatKey);
        bow.rotation.x = Math.PI / 2;
        bow.position.set(0, 0.1, 0);
        keyGroup.add(bow);
        // Shaft
        var shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.28, 8), goldMatKey);
        shaft.rotation.x = Math.PI / 2;
        shaft.position.set(0, 0.1, 0.17);
        keyGroup.add(shaft);
        // Teeth (two small perpendicular ridges)
        var tooth1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.03), goldMatKey);
        tooth1.position.set(0.04, 0.1, 0.27);
        keyGroup.add(tooth1);
        var tooth2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.03), goldMatKey);
        tooth2.position.set(0.03, 0.1, 0.22);
        keyGroup.add(tooth2);
        // Glow sprite behind the key
        var keyGlowTex = buildGlowSpriteTexture(THREE, 0xfde047);
        var keyGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: keyGlowTex, color: 0xfde047, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
        keyGlow.scale.set(1.2, 1.2, 1);
        keyGroup.add(keyGlow);
        eng.keyGlow = keyGlow;
      }

      // Monster — ghostly glowing orb with trailing wisps instead of a red box.
      // Emissive sphere gives it presence; a sprite glow gives it threatening
      // halo; point light lights the walls around it.
      if (chaseMode) {
        var monsterGroup = new THREE.Group();
        monsterGroup.position.set(1, 0.9, 1);
        eng.scene.add(monsterGroup);
        eng.monsterMesh = monsterGroup;
        var orbMat = new THREE.MeshStandardMaterial({ color: 0xff4444, emissive: 0xaa0000, emissiveIntensity: 0.9, transparent: true, opacity: 0.85 });
        var orb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), orbMat);
        monsterGroup.add(orb);
        eng.monsterOrb = orb;
        // Outer wisp sphere — larger, wobbling, semi-transparent
        var wispMat = new THREE.MeshBasicMaterial({ color: 0xff2222, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false });
        var wispMesh = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 16), wispMat);
        monsterGroup.add(wispMesh);
        eng.monsterWisp = wispMesh;
        // Glow halo sprite
        var monGlowTex = buildGlowSpriteTexture(THREE, 0xff2222);
        var monGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: monGlowTex, color: 0xff3333, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
        monGlow.scale.set(1.8, 1.8, 1);
        monsterGroup.add(monGlow);
        eng.monsterGlow = monGlow;
        var monLight = new THREE.PointLight(0xff3333, 0.9, 4);
        monLight.position.set(0, 0, 0);
        monsterGroup.add(monLight);
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
        // Screen shake — decays over ~0.4s after a wrong answer. Applied as
        // a small additive offset on top of the smoothed camera position.
        if (shakeRef.current > 0) {
          var s = shakeRef.current;
          eng.camera.position.x += (Math.random() - 0.5) * 0.12 * s;
          eng.camera.position.y += (Math.random() - 0.5) * 0.12 * s;
          shakeRef.current = Math.max(0, s - 0.04);
        }

        // Exit portal — ring spins one axis, swirl spins the other, glow pulses.
        if (eng.exitPortal) {
          eng.exitPortal.rotation.z += 0.012;
          if (eng.exitRing) eng.exitRing.rotation.x = Math.sin(t2 * 0.7) * 0.4;
          if (eng.exitSwirl) { eng.exitSwirl.rotation.y += 0.05; eng.exitSwirl.rotation.z -= 0.03; }
          if (eng.exitGlow) {
            var pulse = 1 + Math.sin(t2 * 2.2) * 0.2;
            eng.exitGlow.scale.set(2.4 * pulse, 2.4 * pulse, 1);
            eng.exitGlow.material.opacity = 0.55 + Math.sin(t2 * 2.2) * 0.15;
          }
          if (eng.exitLight) eng.exitLight.intensity = 1.4 + Math.sin(t2 * 3) * 0.5;
          // Orbit the particle ring — reads each point along a slightly
          // wobbling circle so the swirl looks alive.
          if (eng.exitParticles) {
            var pos = eng.exitParticles.geometry.attributes.position;
            var phases = eng.exitParticles.userData.phases;
            for (var ei = 0; ei < phases.length; ei++) {
              var ph = phases[ei] + t2 * 1.4;
              pos.array[ei * 3 + 0] = Math.cos(ph) * (0.55 + Math.sin(t2 + ei) * 0.04);
              pos.array[ei * 3 + 1] = Math.sin(ph * 3 + t2 * 2) * 0.2;
              pos.array[ei * 3 + 2] = Math.sin(ph) * (0.55 + Math.cos(t2 + ei) * 0.04);
            }
            pos.needsUpdate = true;
          }
        }

        // Dust motes — slow drift on X/Z, tiny sin-bob on Y. Loop when a mote
        // drifts past the maze bounds so we keep the cloud stable forever.
        if (eng.dust) {
          var dpos = eng.dust.geometry.attributes.position;
          var dphases = eng.dust.userData.phases;
          var dn = dphases.length;
          for (var idu = 0; idu < dn; idu++) {
            var ph2 = dphases[idu];
            dpos.array[idu * 3 + 0] += Math.sin(t2 * 0.25 + ph2) * 0.004;
            dpos.array[idu * 3 + 1] += Math.sin(t2 * 0.4 + ph2 * 1.3) * 0.003;
            dpos.array[idu * 3 + 2] += Math.cos(t2 * 0.2 + ph2 * 0.7) * 0.004;
            // wrap on Y so motes don't sink or rise forever
            if (dpos.array[idu * 3 + 1] > 2.4) dpos.array[idu * 3 + 1] = 0.3;
            if (dpos.array[idu * 3 + 1] < 0.2) dpos.array[idu * 3 + 1] = 2.3;
          }
          dpos.needsUpdate = true;
        }

        // Gems drop on correct answers; float + pulse + slow rotate so they
        // read as "collected XP" without being distracting.
        if (eng.gems && eng.gems.length) {
          for (var gi = 0; gi < eng.gems.length; gi++) {
            var gem = eng.gems[gi];
            gem.rotation.y += 0.03;
            gem.position.y = gem.userData._baseY + Math.sin(t2 * 2 + gi) * 0.08;
            if (gem.material && gem.material.emissiveIntensity != null) {
              gem.material.emissiveIntensity = 0.6 + Math.sin(t2 * 3 + gi) * 0.3;
            }
          }
        }

        // Key mesh — rotate, bob, pulse glow
        if (eng.keyMesh) {
          eng.keyMesh.rotation.y += 0.04;
          eng.keyMesh.position.y = eng.keyMesh.userData._baseY + Math.sin(t2 * 1.8) * 0.12;
          if (eng.keyGlow) {
            var kPulse = 1 + Math.sin(t2 * 2.5) * 0.22;
            eng.keyGlow.scale.set(1.2 * kPulse, 1.2 * kPulse, 1);
            eng.keyGlow.material.opacity = 0.5 + Math.sin(t2 * 2.5) * 0.2;
          }
        }

        // Portal locked state — desaturate and dim until the key is picked
        // up, so the goal reads as "not active yet."
        if (eng.exitRing && eng.exitSwirl) {
          if (keyCollected) {
            eng.exitRing.material.color.setHex(0xfde047);
            eng.exitSwirl.material.color.setHex(0xfb923c);
            eng.exitRing.material.opacity = 0.9;
            eng.exitSwirl.material.opacity = 0.6;
          } else {
            // locked: cool grey tones, low opacity, pulsing between lit and unlit
            var lockPulse = 0.25 + Math.abs(Math.sin(t2 * 0.9)) * 0.15;
            eng.exitRing.material.color.setHex(0x64748b);
            eng.exitSwirl.material.color.setHex(0x475569);
            eng.exitRing.material.opacity = lockPulse + 0.2;
            eng.exitSwirl.material.opacity = lockPulse;
          }
        }

        // Monster — smooth follow + pulsing wisps + breathing glow
        if (eng.monsterMesh) {
          var mp = monsterPos;
          var mtx = mp.c * 2 + 1, mtz = mp.r * 2 + 1;
          eng.monsterMesh.position.x += (mtx - eng.monsterMesh.position.x) * 0.08;
          eng.monsterMesh.position.z += (mtz - eng.monsterMesh.position.z) * 0.08;
          eng.monsterMesh.position.y = 0.9 + Math.sin(t2 * 3) * 0.18; // hovers + bobs
          if (eng.monsterOrb) eng.monsterOrb.rotation.y += 0.015;
          if (eng.monsterWisp) {
            eng.monsterWisp.scale.setScalar(1 + Math.sin(t2 * 4) * 0.15);
            eng.monsterWisp.material.opacity = 0.18 + Math.sin(t2 * 5) * 0.12;
          }
          if (eng.monsterGlow) {
            var mg = 1.6 + Math.sin(t2 * 3) * 0.25;
            eng.monsterGlow.scale.set(mg, mg, 1);
          }
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

        // ── Transient particles (gem bursts + win confetti) ──
        // Each particle has userData: _age, _life, _vel, _gravity (optional).
        // Advanced here, reaped when age > life. Previously these piled up in
        // the scene without ever being removed — now they animate and clean
        // themselves up.
        if (eng._particles && eng._particles.length) {
          var dt = 0.016; // approx since RAF is ~60fps; good enough for fx
          for (var pi = eng._particles.length - 1; pi >= 0; pi--) {
            var pt = eng._particles[pi];
            pt.userData._age += dt;
            var age = pt.userData._age;
            var life = pt.userData._life;
            var v = pt.userData._vel;
            var grav = pt.userData._gravity != null ? pt.userData._gravity : 6;
            v.y -= grav * dt; // gravity
            pt.position.x += v.x * dt;
            pt.position.y += v.y * dt;
            pt.position.z += v.z * dt;
            pt.rotation.x += dt * 5;
            pt.rotation.y += dt * 7;
            if (pt.material && pt.material.opacity != null) {
              pt.material.opacity = Math.max(0, 1 - age / life);
            }
            if (age >= life) {
              eng.scene.remove(pt);
              if (pt.geometry) pt.geometry.dispose();
              if (pt.material) pt.material.dispose();
              eng._particles.splice(pi, 1);
            }
          }
        }

        // ── Wall-torch flame flicker ──
        if (eng.torches) {
          for (var ti = 0; ti < eng.torches.length; ti++) {
            var tr = eng.torches[ti];
            var phase = tr.userData.phase || 0;
            var flick = 0.8 + Math.sin(t2 * 8 + phase) * 0.15 + Math.random() * 0.1;
            if (tr.flame) tr.flame.scale.set(flick, flick * 1.2, 1);
            if (tr.light) tr.light.intensity = 0.7 * flick;
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

    // ── Render ──
    if (mode === 'setup') {
      // Parchment-card aesthetic — sits inside the outer amber gradient
      // wrapper from AlloFlowContent and reads like an unrolled scroll on
      // a torchlit table. Replaces the previous slate/violet palette which
      // clashed with the warm dungeon visuals on the canvas.
      // Read prior personal-best for this exact (op, size, difficulty).
      // Falls back to the legacy global record so students see something
      // even before they've completed a run in the new keyed-store era.
      var bestRecord = null;
      try {
        var bestKey = operation + '|' + mazeSize + '|' + difficulty;
        var keyed = JSON.parse(localStorage.getItem('fluency_maze_bests') || '{}');
        bestRecord = keyed[bestKey] || JSON.parse(localStorage.getItem('fluency_maze_best') || 'null');
      } catch (e) { bestRecord = null; }
      return h('div', { style: { maxWidth: 460, margin: '0 auto', padding: '20px 24px', textAlign: 'center', background: 'linear-gradient(180deg, #fef3c7 0%, #fed7aa 100%)', borderRadius: '14px', border: '2px solid #d97706', boxShadow: '0 8px 24px rgba(146,64,14,0.15), inset 0 0 32px rgba(217,119,6,0.08)' } },
        h('div', { style: { fontSize: '36px', marginBottom: '8px' } }, '\uD83C\uDFAF'),
        h('h2', { style: { fontSize: '22px', fontWeight: 900, color: '#78350f', marginBottom: '2px', letterSpacing: '0.04em' } }, 'Fluency Maze'),
        h('p', { style: { fontSize: '12px', color: '#92400e', marginBottom: '12px', fontStyle: 'italic' } }, 'Each gate is locked by a math fact. Solve it to pass. Find the golden key to unlock the exit.'),
        bestRecord && bestRecord.score && h('div', {
          style: {
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
            color: '#7c2d12', fontSize: '11px', fontWeight: 800,
            padding: '4px 10px', borderRadius: '999px',
            marginBottom: '14px', border: '1px solid #b45309',
            boxShadow: '0 2px 6px rgba(180,83,9,0.25)'
          },
          'aria-label': 'Personal best: ' + bestRecord.score + ' points in ' + bestRecord.time + ' seconds'
        }, '\uD83C\uDFC6 Best (this mode): ' + bestRecord.score + ' pts ' + (bestRecord.time ? '(' + bestRecord.time + 's)' : '')),
        // Operation selector
        h('div', { style: { display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '12px', flexWrap: 'wrap' } },
          ['add', 'sub', 'mul', 'div', 'mixed'].map(function(op) {
            var labels = { add: '➕ Add', sub: '➖ Sub', mul: '✖️ Mul', div: '➗ Div', mixed: '🔀 Mixed' };
            var opSel = operation === op;
            return h('button', { key: op, onClick: function() { setOperation(op); },
              'aria-pressed': opSel,
              style: { padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                background: opSel ? 'linear-gradient(135deg, #d97706, #b45309)' : '#fef3c7',
                color: opSel ? '#fff' : '#78350f',
                border: opSel ? '2px solid #92400e' : '2px solid #fcd34d' }
            }, labels[op]);
          })
        ),
        // Difficulty
        h('div', { style: { display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '12px' } },
          ['single', 'double'].map(function(d) {
            var diffSel = difficulty === d;
            return h('button', { key: d, onClick: function() { setDifficulty(d); },
              'aria-pressed': diffSel,
              style: { padding: '6px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                background: diffSel ? 'linear-gradient(135deg, #ea580c, #c2410c)' : '#fef3c7',
                color: diffSel ? '#fff' : '#78350f',
                border: diffSel ? '2px solid #9a3412' : '2px solid #fcd34d' }
            }, d === 'single' ? 'Single Digit (0-12)' : 'Double Digit (0-20)');
          })
        ),
        // Maze size selector
        h('div', { style: { display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '12px' } },
          ['small', 'medium', 'large'].map(function(sz) {
            var szSel = mazeSize === sz;
            return h('button', { key: sz, onClick: function() { setMazeSize(sz); },
              'aria-pressed': szSel,
              style: { padding: '6px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                background: szSel ? 'linear-gradient(135deg, #b45309, #92400e)' : '#fef3c7',
                color: szSel ? '#fff' : '#78350f',
                border: szSel ? '2px solid #78350f' : '2px solid #fcd34d' }
            }, MAZE_SIZES[sz].label);
          })
        ),
        // Chase mode toggle
        h('label', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px', fontSize: '12px', color: '#78350f', fontWeight: 600, cursor: 'pointer' } },
          h('input', { type: 'checkbox', checked: chaseMode, onChange: function() { setChaseMode(!chaseMode); }, style: { accentColor: '#b45309' } }),
          '\uD83D\uDC7E Chase Mode', h('span', { style: { fontSize: '10px', color: '#94a3b8' } }, '(monster pursues you!)')
        ),
        // Start button
        h('button', { onClick: startMaze,
          style: { padding: '12px 32px', background: 'linear-gradient(135deg, #b45309, #7c2d12)', color: '#fef3c7',
            border: '2px solid #78350f', borderRadius: '12px', fontSize: '16px', fontWeight: 800, cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(120,53,15,0.4), inset 0 1px 0 rgba(255,235,170,0.3)', letterSpacing: '0.04em' }
        }, '\uD83D\uDD25 Light the Torches')
      );
    }

    if (mode === 'results') {
      var dcpm = elapsed > 0 ? Math.round(correct / (elapsed / 60)) : 0;
      var medalInfo = medal ? {
        gold:   { emoji: '\uD83E\uDD47', label: 'Gold Time',   color: '#d97706', bg: 'linear-gradient(135deg,#fef3c7,#fde68a)', border: '#f59e0b' },
        silver: { emoji: '\uD83E\uDD48', label: 'Silver Time', color: '#64748b', bg: 'linear-gradient(135deg,#f8fafc,#e2e8f0)', border: '#94a3b8' },
        bronze: { emoji: '\uD83E\uDD49', label: 'Bronze Time', color: '#92400e', bg: 'linear-gradient(135deg,#fed7aa,#fdba74)', border: '#c2410c' }
      }[medal] : null;
      return h('div', { style: { maxWidth: 460, margin: '0 auto', padding: '24px 24px 20px', textAlign: 'center', background: won ? 'linear-gradient(180deg, #fef3c7 0%, #fed7aa 100%)' : 'linear-gradient(180deg, #fee2e2 0%, #fecaca 100%)', borderRadius: '14px', border: '2px solid ' + (won ? '#d97706' : '#b91c1c'), boxShadow: '0 8px 24px rgba(146,64,14,0.18), inset 0 0 32px rgba(217,119,6,0.08)' } },
        h('div', { style: { fontSize: '54px', marginBottom: '4px', filter: 'drop-shadow(0 3px 6px rgba(146,64,14,0.4))' } }, won ? '\uD83C\uDFC6' : '\uD83D\uDC7E'),
        h('h2', { style: { fontSize: '24px', fontWeight: 900, color: won ? '#78350f' : '#7f1d1d', marginBottom: '12px', letterSpacing: '0.04em' } },
          won ? 'You Escaped the Maze!' : (gameOver ? 'A Shadow Caught You' : 'Game Over')),
        // Medal banner — only on wins that beat one of the three time thresholds.
        won && medalInfo && h('div', {
          style: {
            background: medalInfo.bg,
            border: '2px solid ' + medalInfo.border,
            borderRadius: '12px',
            padding: '10px 14px',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
          }
        },
          h('span', { style: { fontSize: '32px' } }, medalInfo.emoji),
          h('div', { style: { textAlign: 'left' } },
            h('div', { style: { fontSize: '16px', fontWeight: 900, color: medalInfo.color } }, medalInfo.label),
            h('div', { style: { fontSize: '10px', color: '#475569', opacity: 0.8 } },
              'Finished in ' + elapsed + 's \u2022 target ' + Math.round(MAZE_ROWS * MAZE_COLS * 2 * (medal === 'gold' ? 0.6 : medal === 'silver' ? 1 : 1.8)) + 's')
          )
        ),
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' } },
          h('div', { style: { background: 'rgba(254,243,199,0.7)', borderRadius: '10px', padding: '10px', border: '1px solid #fcd34d' } },
            h('div', { style: { fontSize: '26px', fontWeight: 900, color: '#15803d' } }, String(correct)),
            h('div', { style: { fontSize: '10px', color: '#92400e', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' } }, 'Gates Unlocked')),
          h('div', { style: { background: 'rgba(254,243,199,0.7)', borderRadius: '10px', padding: '10px', border: '1px solid #fcd34d' } },
            h('div', { style: { fontSize: '26px', fontWeight: 900, color: '#b91c1c' } }, String(wrong)),
            h('div', { style: { fontSize: '10px', color: '#92400e', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' } }, 'Wrong Tries')),
          h('div', { style: { background: 'rgba(254,243,199,0.7)', borderRadius: '10px', padding: '10px', border: '1px solid #fcd34d' } },
            h('div', { style: { fontSize: '26px', fontWeight: 900, color: '#7c2d12' } }, String(dcpm)),
            h('div', { style: { fontSize: '10px', color: '#92400e', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' } }, 'Facts/Min')),
          h('div', { style: { background: 'rgba(254,243,199,0.7)', borderRadius: '10px', padding: '10px', border: '1px solid #fcd34d' } },
            h('div', { style: { fontSize: '26px', fontWeight: 900, color: '#a16207' } }, elapsed + 's'),
            h('div', { style: { fontSize: '10px', color: '#92400e', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' } }, 'Time'))
        ),
        h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'center' } },
          h('button', { onClick: startMaze, style: { padding: '10px 24px', background: 'linear-gradient(135deg, #b45309, #7c2d12)', color: '#fef3c7', border: '2px solid #78350f', borderRadius: '10px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(120,53,15,0.35)' } }, '\uD83D\uDD04 Play Again'),
          h('button', { onClick: function() { setMode('setup'); }, style: { padding: '10px 20px', background: '#fef3c7', color: '#78350f', border: '2px solid #fcd34d', borderRadius: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' } }, '\u2699 Settings')
        )
      );
    }

    var has3D = !!window.THREE;

    // Playing mode
    return h('div', { style: { maxWidth: 560, margin: '0 auto', position: 'relative' } },
      // HUD — scores + streak combo meter + hint button. Warm leather/stone
      // band so the HUD reads as part of the dungeon, not a separate cool-
      // slate strip floating above it.
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', background: 'linear-gradient(180deg, #5b4d3f 0%, #3a2e26 100%)', borderRadius: '10px', marginBottom: '6px', fontSize: '11px', flexWrap: 'wrap', gap: '8px', border: '1px solid #78350f', boxShadow: 'inset 0 1px 0 rgba(255,235,170,0.15), 0 2px 6px rgba(58,46,38,0.3)' } },
        h('span', { style: { color: '#86efac', fontWeight: 700 } }, '\u2705 ' + correct),
        h('span', { style: { color: '#fca5a5', fontWeight: 700 } }, '\u274C ' + wrong),
        h('span', { style: { color: '#fde68a', fontWeight: 700 } }, '\uD83C\uDFAF ' + score),
        // Streak pill — grows / glows at milestones so fluency runs feel earned.
        streak > 0 && h('span', {
          style: {
            color: streak >= 3 ? '#fff' : '#f97316',
            background: streak >= 3 ? 'linear-gradient(90deg,#f97316,#ef4444)' : 'rgba(249,115,22,0.12)',
            fontWeight: 800,
            padding: '2px 8px',
            borderRadius: '999px',
            border: streak >= 3 ? '1px solid #fbbf24' : '1px solid rgba(249,115,22,0.3)',
            boxShadow: streak >= 3 ? '0 0 8px rgba(251,191,36,0.5)' : 'none',
            transition: 'all 0.2s'
          }
        }, '\uD83D\uDD25 x' + streak),
        h('span', { style: { color: '#fde68a' } }, '\u23F1 ' + elapsed + 's'),
        chaseMode && h('span', { style: { color: '#f59e0b', fontWeight: 700 } }, '\uD83D\uDC7E CHASE!'),
        // Hint button — costs 5 points, resets streak. Uses BFS to find the
        // direction of the next step along the shortest path to the exit.
        h('button', {
          onClick: requestHint,
          disabled: !!hintDir,
          title: 'Show direction toward exit (H key) — costs 5 points, resets streak',
          style: {
            marginLeft: 'auto', padding: '4px 10px', fontSize: '11px', fontWeight: 700,
            background: hintDir ? '#fbbf24' : 'linear-gradient(135deg, #b45309, #7c2d12)', color: '#fff',
            border: 'none', borderRadius: '999px', cursor: hintDir ? 'default' : 'pointer',
            opacity: hintDir ? 0.8 : 1
          }
        }, '\uD83D\uDCA1 Hint (-5)')
      ),
      // 3D View (or 2D fallback)
      has3D ? h('div', { ref: maze3dRef, style: { width: '100%', height: '320px', borderRadius: '10px', overflow: 'hidden', border: '2px solid #7c3aed', position: 'relative', background: '#0a0a1a' } }) :
      h('canvas', { ref: canvasRef, style: { width: '100%', height: 'auto', borderRadius: '10px', border: '3px solid #78350f', display: 'block', boxShadow: '0 4px 16px rgba(58,46,38,0.4)' } }),
      // Streak milestone banner — center-top of the maze area, fades in
      // and out via opacity transition. Pointer-events:none so it never
      // blocks the gate or arrow buttons underneath.
      streakBanner && h('div', {
        role: 'status', 'aria-live': 'polite',
        style: {
          position: 'absolute', top: '52px', left: '50%', transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #f59e0b, #b91c1c)', color: '#fef3c7',
          padding: '8px 18px', borderRadius: '999px', fontWeight: 900, fontSize: '13px',
          letterSpacing: '0.08em', textTransform: 'uppercase',
          border: '2px solid #fbbf24',
          boxShadow: '0 0 28px rgba(251,191,36,0.6), inset 0 1px 0 rgba(255,255,255,0.25)',
          pointerEvents: 'none', zIndex: 12,
          animation: 'alloStreakPulse 1500ms ease-out forwards'
        }
      }, streakBanner),
      // First-time tutorial overlay — shown on the very first run only.
      // Dismissed by click anywhere on the overlay or auto-dismissed when
      // the student successfully solves their first gate.
      !tutorialSeen && h('div', {
        onClick: _dismissTutorial,
        role: 'button', tabIndex: 0,
        onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); _dismissTutorial(); } },
        'aria-label': 'Tutorial. Press Enter or click to dismiss.',
        style: {
          position: 'absolute', inset: 0, zIndex: 14,
          background: 'rgba(58,46,38,0.78)', backdropFilter: 'blur(2px)',
          borderRadius: '10px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', padding: '20px'
        }
      },
        h('div', {
          style: {
            background: 'linear-gradient(180deg, #fef3c7 0%, #fed7aa 100%)',
            border: '2px solid #d97706', borderRadius: '12px',
            padding: '18px 22px', maxWidth: '340px', textAlign: 'center',
            boxShadow: '0 12px 40px rgba(58,46,38,0.5), inset 0 0 24px rgba(217,119,6,0.12)'
          }
        },
          h('div', { style: { fontSize: '36px', marginBottom: '4px' } }, '\uD83D\uDDDD\uFE0F'),
          h('h3', { style: { fontSize: '16px', fontWeight: 900, color: '#78350f', margin: '0 0 10px', letterSpacing: '0.04em' } }, 'Welcome, Adventurer'),
          h('p', { style: { fontSize: '12px', color: '#92400e', lineHeight: '1.5', margin: '0 0 8px' } },
            'Use ',
            h('kbd', { style: { background: '#fef3c7', border: '1px solid #d97706', borderRadius: '4px', padding: '0 4px', fontFamily: 'monospace', fontWeight: 700 } }, '\u2190 \u2191 \u2192 \u2193'),
            ' or ',
            h('kbd', { style: { background: '#fef3c7', border: '1px solid #d97706', borderRadius: '4px', padding: '0 4px', fontFamily: 'monospace', fontWeight: 700 } }, 'WASD'),
            ' to explore.'
          ),
          h('p', { style: { fontSize: '12px', color: '#92400e', lineHeight: '1.5', margin: '0 0 8px' } },
            'Each gate is locked by a math fact. Solve it to pass.'
          ),
          h('p', { style: { fontSize: '12px', color: '#92400e', lineHeight: '1.5', margin: '0 0 12px' } },
            'Find the \uD83D\uDDDD\uFE0F key to unlock the \u2B50 exit.'
          ),
          h('div', {
            style: { fontSize: '11px', fontWeight: 800, color: '#fef3c7', background: 'linear-gradient(135deg, #b45309, #7c2d12)', border: '2px solid #78350f', borderRadius: '8px', padding: '6px 14px', display: 'inline-block', letterSpacing: '0.06em' }
          }, 'Tap anywhere to begin')
        )
      ),
      // 2D minimap overlay (top-right of 3D view)
      has3D && maze && h('canvas', { ref: canvasRef, style: { position: 'absolute', top: '44px', right: '4px', width: '100px', height: '100px', borderRadius: '8px', border: '1px solid rgba(100,116,139,0.3)', opacity: 0.8 } }),
      // Gate overlay (when at junction). Styled as a stone-gate with a
      // lock and a 3x4 number pad \u2014 the math problem is the gate's
      // combination, the pad is how you enter it. Border + glow shift
      // by feedback state: red shake on wrong, green flash on correct.
      currentProblem && h('div', {
        key: 'gate-' + (currentProblem.problem.text), // remount when problem changes so animations replay
        className: feedback === 'wrong' ? 'allo-gate-shake' : (feedback === 'correct' ? 'allo-gate-open' : ''),
        style: {
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          background: feedback === 'correct'
            ? 'linear-gradient(180deg, #14532d 0%, #052e16 100%)'
            : 'linear-gradient(180deg, #3a2e26 0%, #2a221c 100%)',
          backdropFilter: 'blur(8px)',
          borderRadius: '14px',
          padding: '18px 22px 14px',
          textAlign: 'center',
          border: feedback === 'wrong'
            ? '3px solid #ef4444'
            : (feedback === 'correct' ? '3px solid #22c55e' : '3px solid #a8957d'),
          boxShadow: feedback === 'correct'
            ? '0 0 32px rgba(34,197,94,0.7), inset 0 0 32px rgba(34,197,94,0.25)'
            : feedback === 'wrong'
              ? '0 0 24px rgba(239,68,68,0.55), inset 0 0 16px rgba(239,68,68,0.2)'
              : '0 0 0 2px rgba(58,46,38,0.6), 0 12px 40px rgba(0,0,0,0.6), inset 0 0 24px rgba(255,180,80,0.10)',
          zIndex: 10,
          width: 'min(320px, calc(100vw - 24px))', maxWidth: '90vw',
          transition: 'background 200ms, border-color 200ms, box-shadow 200ms'
        }
      },
        // Header row: "GATE" label + lock glyph (changes to unlocked on correct)
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '10px', color: feedback === 'correct' ? '#bbf7d0' : '#fbbf24', fontSize: '11px', fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase' } },
          h('span', { style: { fontSize: '18px' } }, feedback === 'correct' ? '\ud83d\udd13' : '\ud83d\udd12'),
          h('span', null, feedback === 'correct' ? 'Gate Opens!' : (feedback === 'wrong' ? 'Wrong Combination \u2014 Try Again' : 'Locked Gate')),
          h('span', { style: { fontSize: '18px' } }, feedback === 'correct' ? '\ud83d\udd13' : '\ud83d\udd12')
        ),
        // The "combination" \u2014 math problem
        h('div', { style: { fontSize: '30px', fontWeight: 800, color: '#fef3c7', marginBottom: '10px', fontFamily: 'monospace', textShadow: '0 0 12px rgba(251,191,36,0.45)' } }, currentProblem.problem.text + ' = ?'),
        // Answer display (read-only echo of userInput so taps on numpad show)
        h('div', {
          style: {
            display: 'inline-block', minWidth: '120px', padding: '8px 12px', marginBottom: '10px',
            fontSize: '26px', fontWeight: 800, fontFamily: 'monospace', textAlign: 'center',
            color: '#fff', background: '#2a221c', border: '2px solid #a8957d', borderRadius: '8px',
            letterSpacing: '0.08em'
          }
        }, userInput || '\u2014'),
        // Hidden input still present for keyboard users + autofocus + Enter handling
        h('input', { ref: inputRef, type: 'number', value: userInput, onChange: function(e) { setUserInput(e.target.value); },
          'aria-label': 'Type your answer to ' + currentProblem.problem.text,
          onKeyDown: function(e) { if (e.key === 'Enter') submitAnswer(); else if (e.key === 'Escape') setUserInput(''); },
          style: { position: 'absolute', opacity: 0, pointerEvents: 'none', width: '1px', height: '1px' },
          inputMode: 'numeric', autoFocus: true
        }),
        // \u2500\u2500 Number pad (3 cols x 4 rows) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', maxWidth: '220px', margin: '0 auto' } },
          ['1','2','3','4','5','6','7','8','9'].map(function(d) {
            return h('button', {
              key: 'pad-' + d,
              onClick: function() { setUserInput(function(prev) { return (prev || '') + d; }); if (inputRef.current) inputRef.current.focus(); },
              'aria-label': 'Enter digit ' + d,
              style: {
                padding: '12px 0', fontSize: '20px', fontWeight: 700, fontFamily: 'monospace',
                background: '#5b4d3f', color: '#fef3c7', border: '2px solid #a8957d',
                borderRadius: '8px', cursor: 'pointer', minHeight: '44px',
                boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.3)'
              }
            }, d);
          }),
          // Bottom row: Clear, 0, Submit
          h('button', {
            key: 'pad-clear',
            onClick: function() { setUserInput(''); if (inputRef.current) inputRef.current.focus(); },
            'aria-label': 'Clear answer',
            style: {
              padding: '12px 0', fontSize: '13px', fontWeight: 700,
              background: '#7c2d12', color: '#fef3c7', border: '2px solid #a8957d',
              borderRadius: '8px', cursor: 'pointer', minHeight: '44px'
            }
          }, '\u2716 Clear'),
          h('button', {
            key: 'pad-0',
            onClick: function() { setUserInput(function(prev) { return (prev || '') + '0'; }); if (inputRef.current) inputRef.current.focus(); },
            'aria-label': 'Enter digit 0',
            style: {
              padding: '12px 0', fontSize: '20px', fontWeight: 700, fontFamily: 'monospace',
              background: '#5b4d3f', color: '#fef3c7', border: '2px solid #a8957d',
              borderRadius: '8px', cursor: 'pointer', minHeight: '44px',
              boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.3)'
            }
          }, '0'),
          h('button', {
            key: 'pad-submit',
            onClick: submitAnswer,
            'aria-label': 'Submit answer to unlock the gate',
            style: {
              padding: '12px 0', fontSize: '13px', fontWeight: 800,
              background: '#15803d', color: '#fff', border: '2px solid #22c55e',
              borderRadius: '8px', cursor: 'pointer', minHeight: '44px',
              boxShadow: '0 0 8px rgba(34,197,94,0.4)'
            }
          }, '\ud83d\udd11 Unlock')
        ),
        attemptCount > 0 && h('div', { style: { marginTop: '8px', fontSize: '11px', fontWeight: 700, color: '#fbbf24', letterSpacing: '0.06em', textTransform: 'uppercase' }, 'aria-live': 'off' }, 'Attempt ' + (attemptCount + 1)),
        h('p', { style: { fontSize: '10px', color: '#a8957d', marginTop: attemptCount > 0 ? '4px' : '10px', marginBottom: 0 } }, 'Tap pad or use keyboard \u2022 Enter to submit \u2022 Esc to clear')
      ),
      // Arrow buttons (mobile friendly)
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', maxWidth: '160px', margin: '8px auto 0' } },
        h('div'),
        h('button', { onClick: function() { tryMove('up'); }, style: { padding: '12px', borderRadius: '8px', background: 'linear-gradient(180deg, #a8957d 0%, #78350f 100%)', color: '#fef3c7', border: '2px solid #78350f', fontSize: '20px', fontWeight: 700, cursor: 'pointer', boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.25)', minHeight: '44px' } }, '\u25B2'),
        h('div'),
        h('button', { onClick: function() { tryMove('left'); }, style: { padding: '12px', borderRadius: '8px', background: 'linear-gradient(180deg, #a8957d 0%, #78350f 100%)', color: '#fef3c7', border: '2px solid #78350f', fontSize: '20px', fontWeight: 700, cursor: 'pointer', boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.25)', minHeight: '44px' } }, '\u25C0'),
        h('button', { onClick: function() { tryMove('down'); }, style: { padding: '12px', borderRadius: '8px', background: 'linear-gradient(180deg, #a8957d 0%, #78350f 100%)', color: '#fef3c7', border: '2px solid #78350f', fontSize: '20px', fontWeight: 700, cursor: 'pointer', boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.25)', minHeight: '44px' } }, '\u25BC'),
        h('button', { onClick: function() { tryMove('right'); }, style: { padding: '12px', borderRadius: '8px', background: 'linear-gradient(180deg, #a8957d 0%, #78350f 100%)', color: '#fef3c7', border: '2px solid #78350f', fontSize: '20px', fontWeight: 700, cursor: 'pointer', boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.25)', minHeight: '44px' } }, '\u25B6')
      ),
      h('p', { style: { fontSize: '10px', color: '#92400e', textAlign: 'center', marginTop: '8px', fontStyle: 'italic' } }, 'Arrow keys or WASD to move \u2022 H for hint \u2022 Each gate needs the correct math answer \u2022 3-in-a-row for bonus')
    );
  }

  // ── Register modules ──
  window.AlloModules = window.AlloModules || {};
  window.AlloModules.MathFluency = MathFluencyPanel;
  window.AlloModules.FluencyMaze = FluencyMazePanel;
  console.log('[CDN] MathFluency + FluencyMaze modules registered');
})();
