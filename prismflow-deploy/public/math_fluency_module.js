// ═══════════════════════════════════════════════════════════════
// math_fluency_module.js — Math Fluency CBM Probe Module v1.0.0
// Standalone CDN module for AlloFlow (Curriculum-Based Measurement)
// ═══════════════════════════════════════════════════════════════
(function () {
  'use strict';

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
    var g = String(grade || '3').replace(/\D/g, '') || '3';
    if (g === '0') g = 'K';
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
            h('div', { style: {
              height: '100%', borderRadius: '9999px', transition: 'width 1s linear',
              background: isLowTime ? 'linear-gradient(to right, #ef4444, #dc2626)' : 'linear-gradient(to right, #f59e0b, #f97316)',
              width: timerPct + '%'
            } })
          )
        ),
        // Problem card
        h('div', {
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
                borderBottom: '4px solid #f59e0b', background: 'transparent', outline: 'none',
                padding: '8px 0', margin: '0 auto', display: 'block', borderTop: 'none', borderLeft: 'none', borderRight: 'none'
              }
            }),
            h('div', { style: { display: 'flex', gap: '12px', marginTop: '1.5rem', justifyContent: 'center' } },
              h('button', {
                type: 'submit',
                style: {
                  padding: '12px 32px', background: 'linear-gradient(to right, #10b981, #22c55e)',
                  color: '#fff', fontWeight: 800, borderRadius: '12px', fontSize: '1.1rem',
                  border: 'none', cursor: 'pointer', boxShadow: '0 4px 15px rgba(16,185,129,0.3)'
                }
              }, 'Enter \u21b5'),
              h('button', {
                type: 'button', onClick: function () { submitAnswer(true); },
                style: {
                  padding: '12px 24px', background: '#e2e8f0', color: '#64748b',
                  fontWeight: 800, borderRadius: '12px', fontSize: '1.1rem',
                  border: 'none', cursor: 'pointer'
                }
              }, 'Skip \u2192')
            )
          ),
          h('div', { style: { marginTop: '12px', fontSize: '11px', color: '#94a3b8' } },
            'Tab = Skip \u2022 Esc = End Early' + (autoAdvance ? ' \u2022 Auto-advance ON' : ''))
        ),
        // End early button
        h('button', {
          onClick: function () { if (timerRef.current) clearInterval(timerRef.current); finishProbe(); },
          style: { marginTop: '1.5rem', fontSize: '14px', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }
        }, 'End probe early')
      );
    }

    // ── Results display ──
    if (results && !active) {
      var bm = results.benchmarkResult;
      var ea = results.errorAnalysis;
      var maxDcpm = Math.max.apply(null, history.map(function (x) { return x.dcpm; }).concat([1]));

      return h('div', {
        style: {
          background: 'linear-gradient(135deg, #fffbeb, #fff7ed)', borderRadius: '16px',
          border: '2px solid #fde68a', padding: '24px', marginBottom: '24px',
          animation: 'fadeIn 0.3s ease-out'
        }
      },
        // Header
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' } },
          h('h3', { style: { fontSize: '18px', fontWeight: 900, color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 } },
            '\ud83d\udcca Fluency Probe Results'),
          h('button', {
            onClick: function () { setResults(null); },
            style: { color: '#94a3b8', cursor: 'pointer', background: 'none', border: 'none', padding: '4px' }
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
              m.sub ? h('div', { style: { fontSize: '10px', color: '#94a3b8' } }, m.sub) : null
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
              return h('div', { key: i, style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' } },
                h('span', { style: { fontSize: '9px', fontWeight: 700, color: '#d97706' } }, hItem.dcpm),
                h('div', { style: {
                  width: '100%', background: 'linear-gradient(to top, #f59e0b, #fdba74)',
                  borderRadius: '4px 4px 0 0', height: Math.max(4, pct) + '%', minHeight: '4px'
                } })
              );
            })
          )
        ) : null,

        // Actions
        h('div', { style: { display: 'flex', gap: '8px', marginTop: '16px' } },
          h('button', {
            onClick: startProbe,
            style: {
              flex: 1, padding: '10px', background: 'linear-gradient(to right, #f59e0b, #f97316)',
              color: '#fff', fontWeight: 800, borderRadius: '12px', fontSize: '14px',
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: '0 4px 12px rgba(245,158,11,0.3)'
            }
          }, h(RefreshCw, { size: 14 }), ' Run Again'),
          history.length > 0 ? h('button', {
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
    return h('div', {
      style: {
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
        h('div', { style: { display: 'flex', gap: '6px' } },
          h('button', {
            onClick: function () { setSoundEnabled(!soundEnabled); },
            title: soundEnabled ? 'Mute sounds' : 'Enable sounds',
            'aria-label': soundEnabled ? 'Mute sound effects' : 'Enable sound effects',
            style: { padding: '4px 8px', borderRadius: '8px', border: '1px solid #fde68a', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }
          }, soundEnabled ? h(Volume2, { size: 14 }) : h(VolumeX, { size: 14 })),
          h('button', {
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
            style: { width: '100%', fontSize: '12px', padding: '6px 8px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none' }
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
            style: { width: '100%', fontSize: '12px', padding: '6px 8px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none' }
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
            style: { width: '100%', fontSize: '12px', padding: '6px 8px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none' }
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
            style: { width: '100%', fontSize: '12px', padding: '6px 8px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none' }
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
        return h('div', {
          style: { background: '#fff', borderRadius: '8px', padding: '8px 12px', marginBottom: '12px',
            border: '1px solid #fef3c7', fontSize: '12px', color: '#64748b' }
        },
          h('span', { style: { fontWeight: 700 } }, '\ud83c\udfaf Grade ' + bm.grade + ' ' + bm.season + ' target: '),
          h('span', { style: { fontWeight: 800, color: '#d97706' } }, bm.target + ' DCPM'),
          h('span', { style: { marginLeft: '8px', fontSize: '11px' } },
            '(\ud83d\udfe2\u2265' + bm.target + ' \ud83d\udfe1\u2265' + bm.strategic + ' \ud83d\udd34<' + bm.strategic + ')')
        );
      })(),

      // Start button
      h('button', {
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

  // ── Register module ──
  window.AlloModules = window.AlloModules || {};
  window.AlloModules.MathFluency = MathFluencyPanel;
  console.log('[CDN] MathFluency module registered');
})();
