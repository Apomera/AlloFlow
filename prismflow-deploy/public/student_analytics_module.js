// ═══════════════════════════════════════════════════════════════
// student_analytics_module.js — StudentAnalyticsPanel v1.0.0
// Assessment Center / RTI Probes / Research Dashboard
// Extracted from AlloFlowANTI.txt for modular CDN loading
// ═══════════════════════════════════════════════════════════════
(function () {
  'use strict';

  // WCAG 2.1 AA: Accessibility CSS injection
  if (!document.getElementById('sa-a11y-css')) {
    var saA11yStyle = document.createElement('style');
    saA11yStyle.id = 'sa-a11y-css';
    saA11yStyle.textContent = [
      '@media (prefers-reduced-motion: reduce) { .fixed.inset-0 *, .fixed.inset-0 *::before, .fixed.inset-0 *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } }',
      '.fixed.inset-0 button:focus-visible, .fixed.inset-0 input:focus-visible, .fixed.inset-0 select:focus-visible, .fixed.inset-0 textarea:focus-visible, .fixed.inset-0 [tabindex]:focus-visible { outline: 2px solid #6366f1 !important; outline-offset: 2px !important; border-radius: 4px; }',
      '.fixed.inset-0 :focus:not(:focus-visible) { outline: none !important; }',
      '.fixed.inset-0 .text-slate-600 { color: #64748b !important; }',
      '.fixed.inset-0 .text-gray-400 { color: #6b7280 !important; }',
    ].join('\n');
    document.head.appendChild(saA11yStyle);
  }

  // WCAG 4.1.3: Live region for screen reader announcements
  if (!document.getElementById('allo-live-analytics')) {
    var saLive = document.createElement('div');
    saLive.id = 'allo-live-analytics';
    saLive.setAttribute('aria-live', 'polite');
    saLive.setAttribute('aria-atomic', 'true');
    saLive.setAttribute('role', 'status');
    saLive.className = 'sr-only';
    saLive.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(saLive);
  }

  // Ensure React and ReactDOM are available
  var React = window.React;
  var ReactDOM = window.ReactDOM;
  if (!React || !ReactDOM) {
    console.error('[StudentAnalytics] React/ReactDOM not found on window');
    return;
  }

  // Re-export React hooks for use in the component
  var useState = React.useState;
  var useEffect = React.useEffect;
  var useRef = React.useRef;

  // Fluency analysis functions — defined in monolith, exposed via window.__alloUtils.
  // Lazy-resolve at call time (module may load before monolith populates window).
  function calculateRunningRecordMetrics(wordData, insertionsArr) {
    var fn = window.__alloUtils && window.__alloUtils.calculateRunningRecordMetrics;
    return typeof fn === 'function' ? fn(wordData, insertionsArr) : null;
  }
  function getBenchmarkComparison(wcpm, grade, season, customNorms) {
    var fn = window.__alloUtils && window.__alloUtils.getBenchmarkComparison;
    return typeof fn === 'function' ? fn(wcpm, grade, season, customNorms) : null;
  }
  // WCAG 2.4.3: Focus management — save/restore focus on modal open/close
  var _alloFocusTrigger = null;
  function alloSaveFocus() { _alloFocusTrigger = document.activeElement; }
  function alloRestoreFocus() { if (_alloFocusTrigger && typeof _alloFocusTrigger.focus === 'function') { try { _alloFocusTrigger.focus(); } catch(e) {} _alloFocusTrigger = null; } }

  var useCallback = React.useCallback;
  var useMemo = React.useMemo;
  var memo = React.memo;

  // ── External dependency shims ──────────────────────────────────
  // Utility functions from App.jsx
  var safeGetItem = window.safeGetItem || function(key) {
    try { return localStorage.getItem(key); } catch(e) { return null; }
  };
  var safeSetItem = window.safeSetItem || function(key, val) {
    try { localStorage.setItem(key, val); } catch(e) {}
  };
  var warnLog = window.warnLog || function() {
    console.warn.apply(console, arguments);
  };

  // Bot reference (used for alloBotRef.current.speak())
  var alloBotRef = window.alloBotRef || { current: null };

  // Safety content checker
  var SafetyContentChecker = window.SafetyContentChecker || {
    check: function() { return []; },
    categoryLabel: function(cat) { return cat || 'Unknown'; }
  };

  // Grade-subtest batteries constant
  var GRADE_SUBTEST_BATTERIES = window.GRADE_SUBTEST_BATTERIES || {
    'K':   ['segmentation', 'blending', 'isolation'],
    '1':   ['segmentation', 'blending', 'isolation', 'spelling', 'orf'],
    '2':   ['segmentation', 'blending', 'rhyming', 'spelling', 'orf'],
    '3-5': ['segmentation', 'rhyming', 'spelling', 'orf']
  };

  // Lucide icons (loaded globally via CDN)
  var lucide = window.lucide || {};
  var AlertCircle = lucide.AlertCircle || function() { return null; };
  var BarChart2 = lucide.BarChart2 || function() { return null; };
  var BarChart3 = lucide.BarChart3 || function() { return null; };
  var ChevronLeft = lucide.ChevronLeft || function() { return null; };
  var ClipboardList = lucide.ClipboardList || function() { return null; };
  var Cloud = lucide.Cloud || function() { return null; };
  var Download = lucide.Download || function() { return null; };
  var Printer = lucide.Printer || function() { return null; };
  var Settings = lucide.Settings || function() { return null; };
  var ShieldCheck = lucide.ShieldCheck || function() { return null; };
  var Trash2 = lucide.Trash2 || function() { return null; };
  var Upload = lucide.Upload || function() { return null; };
  var Users = lucide.Users || function() { return null; };
  var Wifi = lucide.Wifi || function() { return null; };
  // ── End dependency shims ───────────────────────────────────────

  // ── Full-Screen Probe Overlay Component ────────────────────────
  // Renders active probes in a focused full-screen overlay with countdown,
  // keyboard shortcuts, and large touch targets for rapid teacher scoring.
  var ProbeOverlay = function ProbeOverlay(props) {
    var h = React.createElement;
    var isActive = props.isActive;
    var probeType = props.probeType || 'Probe';
    var timer = props.timer;
    var timerTotal = props.timerTotal || 60;
    var currentIndex = props.currentIndex || 0;
    var totalItems = props.totalItems || 0;
    var correctCount = props.correctCount || 0;
    var incorrectCount = props.incorrectCount || 0;
    var onCorrect = props.onCorrect;
    var onIncorrect = props.onIncorrect;
    var onSkip = props.onSkip;
    var onEndEarly = props.onEndEarly;
    var children = props.children;
    var showScoreButtons = props.showScoreButtons !== false;
    var instruction = props.instruction || '';

    var _countdown = React.useState(isActive ? 3 : 0);
    var countdown = _countdown[0];
    var setCountdown = _countdown[1];
    var _started = React.useState(false);
    var started = _started[0];
    var setStarted = _started[1];
    var prevActiveRef = React.useRef(false);

    // Countdown logic: when probe becomes active, show 3-2-1 countdown
    React.useEffect(function () {
      if (isActive && !prevActiveRef.current) {
        setCountdown(3);
        setStarted(false);
      }
      if (!isActive) {
        setStarted(false);
        setCountdown(0);
      }
      prevActiveRef.current = isActive;
    }, [isActive]);

    React.useEffect(function () {
      if (countdown <= 0) {
        if (isActive && !started) {
          setStarted(true);
          if (typeof props.onCountdownDone === 'function') props.onCountdownDone();
        }
        return;
      }
      var tid = setTimeout(function () { setCountdown(countdown - 1); }, 1000);
      return function () { clearTimeout(tid); };
    }, [countdown, isActive, started]);

    // Keyboard shortcuts
    React.useEffect(function () {
      if (!isActive || !started || !showScoreButtons) return;
      function handleKey(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        var key = e.key.toLowerCase();
        if ((key === '1' || key === 'c' || key === 'arrowright') && onCorrect) {
          e.preventDefault(); onCorrect();
        } else if ((key === '2' || key === 'x' || key === 'arrowleft') && onIncorrect) {
          e.preventDefault(); onIncorrect();
        } else if ((key === ' ' || key === 's') && onSkip) {
          e.preventDefault(); onSkip();
        } else if (key === 'escape' && onEndEarly) {
          e.preventDefault(); onEndEarly();
        }
      }
      window.addEventListener('keydown', handleKey);
      return function () { window.removeEventListener('keydown', handleKey); };
    }, [isActive, started, showScoreButtons, onCorrect, onIncorrect, onSkip, onEndEarly]);

    if (!isActive) return null;

    var timerPct = timerTotal > 0 ? Math.max(0, timer / timerTotal * 100) : 0;
    var timerMin = Math.floor((timer || 0) / 60);
    var timerSec = String((timer || 0) % 60).padStart(2, '0');
    var isTimeLow = timer !== undefined && timer <= 10;
    var progressPct = totalItems > 0 ? Math.round(currentIndex / totalItems * 100) : 0;

    // Countdown overlay
    if (countdown > 0) {
      return ReactDOM.createPortal(
        h('div', { role: 'dialog', 'aria-modal': 'true',
          className: 'fixed inset-0 z-[250] bg-slate-900/95 flex items-center justify-center',
          style: { backdropFilter: 'blur(8px)' }
        },
          h('div', { className: 'text-center' },
            h('div', {
              className: 'text-[10rem] font-black text-white animate-pulse',
              style: { textShadow: '0 0 60px rgba(99,102,241,0.5)' }
            }, countdown),
            h('div', { className: 'text-2xl text-white/60 font-bold mt-4' }, probeType + ' — Get Ready'),
            instruction && h('div', { className: 'text-lg text-white/40 mt-2 max-w-md mx-auto' }, instruction)
          )
        ), document.body
      );
    }

    // Active probe overlay
    return ReactDOM.createPortal(
      h('div', { role: 'dialog', 'aria-modal': 'true',
        className: 'fixed inset-0 z-[250] bg-white flex flex-col',
        style: { minHeight: '100vh' }
      },
        // Top bar: probe type, timer, progress, end early
        h('div', {
          className: 'flex items-center justify-between px-6 py-3 bg-slate-50 border-b border-slate-200 shrink-0'
        },
          h('div', { className: 'flex items-center gap-4' },
            h('span', {
              className: 'px-3 py-1 rounded-full text-sm font-black uppercase tracking-wider bg-indigo-100 text-indigo-700'
            }, probeType),
            h('span', { className: 'text-sm font-medium text-slate-600' },
              'Item ' + (currentIndex + 1) + ' of ' + totalItems)
          ),
          h('div', { className: 'flex items-center gap-4' },
            // Score tally
            h('div', { className: 'flex items-center gap-3 text-sm font-bold' },
              h('span', { className: 'text-green-600' }, '\u2705 ' + correctCount),
              h('span', { className: 'text-red-500' }, '\u274C ' + incorrectCount)
            ),
            // Timer
            timer !== undefined && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },
              className: 'flex items-center gap-2 px-4 py-2 rounded-xl text-lg font-black tabular-nums ' +
                (isTimeLow ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-slate-100 text-slate-700'),
              'aria-live': 'polite'
            }, '\u23F1 ' + timerMin + ':' + timerSec),
            h('button', { "aria-label": "End Early",
              onClick: onEndEarly,
              className: 'px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors'
            }, '\u23F9 End Early')
          )
        ),
        // Timer progress bar
        timer !== undefined && h('div', { className: 'w-full bg-slate-100 h-1.5 shrink-0' },
          h('div', { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100',
            className: 'h-full transition-all duration-1000 rounded-r ' + (isTimeLow ? 'bg-red-500' : 'bg-indigo-500'),
            style: { width: timerPct + '%' }
          })
        ),
        // Progress bar
        h('div', { className: 'w-full bg-slate-100 h-1 shrink-0' },
          h('div', { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100',
            className: 'h-full bg-emerald-400 transition-all',
            style: { width: progressPct + '%' }
          })
        ),
        // Instruction
        instruction && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },
          className: 'text-center py-2 text-xs text-slate-600 font-semibold uppercase tracking-wider bg-slate-50/50 shrink-0'
        }, instruction),
        // Main content area (probe-specific content)
        h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex-1 flex items-center justify-center p-8 overflow-auto' },
          children
        ),
        // Bottom scoring bar (for teacher-scored probes)
        showScoreButtons && h('div', { className: 'flex items-center justify-center gap-6 px-6 py-5 bg-slate-50 border-t border-slate-200 shrink-0'
        },
          h('button', { "aria-label": "Correct",
            onClick: onCorrect,
            className: 'flex items-center gap-3 px-12 py-5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl font-black text-xl hover:from-green-600 hover:to-emerald-600 transition-all shadow-xl shadow-green-200 active:scale-95'
          }, '\u2705 Correct', h('kbd', { className: 'ml-2 text-sm opacity-60 bg-white/20 px-2 py-0.5 rounded' }, '1')),
          h('button', { "aria-label": "Incorrect",
            onClick: onIncorrect,
            className: 'flex items-center gap-3 px-12 py-5 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-2xl font-black text-xl hover:from-red-600 hover:to-rose-600 transition-all shadow-xl shadow-red-200 active:scale-95'
          }, '\u274C Incorrect', h('kbd', { className: 'ml-2 text-sm opacity-60 bg-white/20 px-2 py-0.5 rounded' }, '2')),
          onSkip && h('button', { "aria-label": "Skip",
            onClick: onSkip,
            className: 'flex items-center gap-2 px-8 py-5 bg-slate-200 text-slate-600 rounded-2xl font-bold text-lg hover:bg-slate-300 transition-all active:scale-95'
          }, 'Skip \u2192', h('kbd', { className: 'ml-2 text-sm opacity-60 bg-white/30 px-2 py-0.5 rounded' }, 'Space'))
        ),
        // Keyboard hint
        showScoreButtons && h('div', {
          className: 'text-center py-1.5 text-[11px] text-slate-600 bg-slate-50 shrink-0'
        }, 'Keyboard: 1/\u2192/C = Correct \u00B7 2/\u2190/X = Incorrect \u00B7 Space/S = Skip \u00B7 Esc = End Early')
      ), document.body
    );
  };
  // ── End Probe Overlay ──────────────────────────────────────────

  // @section STUDENT_ANALYTICS — RTI probes and student analytics
  const StudentAnalyticsPanel = React.memo(({
    isOpen,
    onClose,
    t,
    rosterKey,
    setRosterKey,
    latestProbeResult,
    setLatestProbeResult,
    rosterQueue,
    setRosterQueue,
    screenerSession,
    setScreenerSession,
    onLaunchORF,
    probeHistory,
    interventionLogs,
    addToast,
    probeGradeLevel,
    setProbeGradeLevel,
    probeActivity,
    setProbeActivity,
    probeForm,
    setProbeForm,
    isProbeMode,
    setIsProbeMode,
    probeTargetStudent,
    setProbeTargetStudent,
    saveProbeResult,
    setWsPreloadedWords,
    setWordSoundsActivity,
    setIsWordSoundsMode,
    setActiveView,
    setGeneratedContent,
    setIsFluencyMode,
    setFluencyStatus,
    setFluencyResult,
    isIndependentMode = false,
    globalPoints = 0,
    globalLevel = 1,
    history = [],
    wordSoundsHistory = [],
    phonemeMastery = {},
    wordSoundsBadges = {},
    gameCompletions = [],
    mathFluencyOperation,
    setMathFluencyOperation,
    mathFluencyDifficulty,
    setMathFluencyDifficulty,
    mathFluencyTimeLimit,
    setMathFluencyTimeLimit,
    setMathFluencyProblems,
    setMathFluencyCurrentIndex,
    setMathFluencyResults,
    setMathFluencyStudentInput,
    setMathFluencyTimer,
    setMathFluencyActive,
    mathFluencyTimerRef,
    mathFluencyInputRef,
    finishMathFluencyProbe,
    loadPsychometricProbes
  }) => {
    const [importedStudents, setImportedStudents] = React.useState([]);
    const [selectedStudent, setSelectedStudent] = React.useState(null);
    const [isProcessing, setIsProcessing] = React.useState(false);
    const [isMinimized, setIsMinimized] = React.useState(false);
    const [assessmentCenterTab, setAssessmentCenterTab] = React.useState("assessments");
    const [researchStudent, setResearchStudent] = React.useState(null);
    const [showCBMImport, setShowCBMImport] = React.useState(false);
    const [showSurveyModal, setShowSurveyModal] = React.useState(false);
    const [showResearchSetup, setShowResearchSetup] = React.useState(false);
    const [researchFirstVisit, setResearchFirstVisit] = React.useState(true);
    const [showAssessmentGuide, setShowAssessmentGuide] = React.useState(false);
    React.useEffect(() => {
      if (typeof loadPsychometricProbes === 'function') {
        loadPsychometricProbes();
      }
    }, []);
    const [importProgress, setImportProgress] = React.useState({
      current: 0,
      total: 0
    });
    const [sortColumn, setSortColumn] = React.useState(null);
    const [sortDirection, setSortDirection] = React.useState('asc');
    const [searchQuery, setSearchQuery] = React.useState('');
    const [showRTISettings, setShowRTISettings] = React.useState(false);
    const [mathProbeGrade, setMathProbeGrade] = React.useState("1");
    // Independent grade/form state per probe type (decoupled from mathProbeGrade/mathProbeForm)
    const [nwfGrade, setNwfGrade] = React.useState("K");
    const [nwfForm, setNwfForm] = React.useState("A");
    const [lnfForm, setLnfForm] = React.useState("A");
    const [ranGrade, setRanGrade] = React.useState("K");
    const [ranForm, setRanForm] = React.useState("A");
    const [mnGrade, setMnGrade] = React.useState("1");
    const [mnForm, setMnForm] = React.useState("A");
    const [qdGrade, setQdGrade] = React.useState("K");
    const [qdForm, setQdForm] = React.useState("A");
    // Probe overlay: track whether countdown is done and timer should start
    const [probeTimerPending, setProbeTimerPending] = React.useState(null); // null or {type, ...params}
    const [mathProbeForm, setMathProbeForm] = React.useState("A");
    const [mathProbeStudent, setMathProbeStudent] = React.useState(null);
    // Unified active student for all probes
    const [activeStudent, setActiveStudent] = React.useState(null);
    // Screening queue state
    const [screeningQueue, setScreeningQueue] = React.useState([]);
    const [screeningQueueActive, setScreeningQueueActive] = React.useState(false);
    const [mnProbeActive, setMnProbeActive] = React.useState(false);
    const [mnProbeProblems, setMnProbeProblems] = React.useState([]);
    const [mnProbeIndex, setMnProbeIndex] = React.useState(0);
    const [mnProbeAnswer, setMnProbeAnswer] = React.useState("");
    const [mnProbeResults, setMnProbeResults] = React.useState(null);
    const [mnProbeTimer, setMnProbeTimer] = React.useState(0);
    const mnProbeTimerRef = React.useRef(null);
    const mnProbeInputRef = React.useRef(null);
    React.useEffect(() => {
      if (mnProbeActive && mnProbeTimer === 0 && mnProbeTimerRef.current === null && mnProbeProblems.length > 0 && !mnProbeResults) {
        const answered = mnProbeProblems.filter(p => p.studentAnswer !== null);
        const correct = answered.filter(p => p.correct).length;
        setMnProbeResults({
          correct,
          total: answered.length,
          problems: mnProbeProblems,
          type: 'missing_number'
        });
        setMnProbeActive(false);
      }
    }, [mnProbeTimer, mnProbeActive, mnProbeProblems, mnProbeResults]);
    const [qdProbeActive, setQdProbeActive] = React.useState(false);
    const [qdProbeProblems, setQdProbeProblems] = React.useState([]);
    const [qdProbeIndex, setQdProbeIndex] = React.useState(0);
    const [qdProbeResults, setQdProbeResults] = React.useState(null);
    const [qdProbeTimer, setQdProbeTimer] = React.useState(0);
    const qdProbeTimerRef = React.useRef(null);
    React.useEffect(() => {
      if (qdProbeActive && qdProbeTimer === 0 && qdProbeTimerRef.current === null && qdProbeProblems.length > 0 && !qdProbeResults) {
        const answered = qdProbeProblems.filter(p => p.studentAnswer !== null);
        const correct = answered.filter(p => p.correct).length;
        setQdProbeResults({
          correct,
          total: answered.length,
          problems: qdProbeProblems,
          type: 'quantity_discrimination'
        });
        setQdProbeActive(false);
      }
    }, [qdProbeTimer, qdProbeActive, qdProbeProblems, qdProbeResults]);
    const [nwfProbeActive, setNwfProbeActive] = React.useState(false);
    const [nwfProbeWords, setNwfProbeWords] = React.useState([]);
    const [nwfProbeIndex, setNwfProbeIndex] = React.useState(0);
    const [nwfProbeResults, setNwfProbeResults] = React.useState(null);
    const [nwfProbeTimer, setNwfProbeTimer] = React.useState(60);
    const [nwfProbeGrade, setNwfProbeGrade] = React.useState('K');
    const nwfProbeTimerRef = React.useRef(null);
    React.useEffect(() => {
      if (nwfProbeActive && nwfProbeTimer === 0 && nwfProbeTimerRef.current === null && nwfProbeWords.length > 0 && !nwfProbeResults) {
        const scored = nwfProbeWords.filter(w => w.scored);
        const correct = scored.filter(w => w.correct).length;
        const cls = scored.reduce((sum, w) => sum + (w.correct ? w.word.length : 0), 0);
        setNwfProbeResults({
          correctWords: correct,
          totalScored: scored.length,
          cls,
          totalWords: nwfProbeWords.length,
          type: 'nwf',
          grade: nwfProbeGrade
        });
        setNwfProbeActive(false);
      }
    }, [nwfProbeTimer, nwfProbeActive, nwfProbeWords, nwfProbeResults]);
    const [lnfProbeActive, setLnfProbeActive] = React.useState(false);
    const [lnfProbeLetters, setLnfProbeLetters] = React.useState([]);
    const [lnfProbeIndex, setLnfProbeIndex] = React.useState(0);
    const [lnfProbeResults, setLnfProbeResults] = React.useState(null);
    const [lnfProbeTimer, setLnfProbeTimer] = React.useState(60);
    const lnfProbeTimerRef = React.useRef(null);
    React.useEffect(() => {
      if (lnfProbeActive && lnfProbeTimer === 0 && lnfProbeTimerRef.current === null && lnfProbeLetters.length > 0 && !lnfProbeResults) {
        const scored = lnfProbeLetters.filter(l => l.scored);
        const correct = scored.filter(l => l.correct).length;
        setLnfProbeResults({
          correct,
          totalScored: scored.length,
          totalLetters: lnfProbeLetters.length,
          lpm: correct,
          type: 'lnf'
        });
        setLnfProbeActive(false);
      }
    }, [lnfProbeTimer, lnfProbeActive, lnfProbeLetters, lnfProbeResults]);
    const [ranProbeActive, setRanProbeActive] = React.useState(false);
    const [ranProbeItems, setRanProbeItems] = React.useState([]);
    const [ranProbeIndex, setRanProbeIndex] = React.useState(0);
    const [ranProbeResults, setRanProbeResults] = React.useState(null);
    const [ranProbeElapsed, setRanProbeElapsed] = React.useState(0);
    const [ranProbeType, setRanProbeType] = React.useState('colors');
    const [ranProbeGrade, setRanProbeGrade] = React.useState('K');
    const ranProbeTimerRef = React.useRef(null);
    const ranProbeStartRef = React.useRef(null);
    const [orfProbeActive, setOrfProbeActive] = React.useState(false);
    const [orfProbeWords, setOrfProbeWords] = React.useState([]);
    const [orfProbeTitle, setOrfProbeTitle] = React.useState('');
    const [orfProbeResults, setOrfProbeResults] = React.useState(null);
    const [orfProbeTimer, setOrfProbeTimer] = React.useState(60);
    const [orfProbeGrade, setOrfProbeGrade] = React.useState('1');
    const [orfProbeLastWord, setOrfProbeLastWord] = React.useState(-1);
    const orfProbeTimerRef = React.useRef(null);
    React.useEffect(() => {
      if (orfProbeActive && orfProbeTimer === 0 && orfProbeTimerRef.current === null && orfProbeWords.length > 0 && !orfProbeResults) {
        if (orfProbeLastWord < 0 || orfProbeLastWord >= orfProbeWords.length) return;
        const wordsAttempted = orfProbeWords.slice(0, orfProbeLastWord + 1);
        const errors = wordsAttempted.filter(w => w.error).length;
        const wcpm = wordsAttempted.length - errors;
        setOrfProbeResults({
          wcpm,
          wordsAttempted: wordsAttempted.length,
          errors,
          totalWords: orfProbeWords.length,
          type: 'orf',
          grade: orfProbeGrade,
          title: orfProbeTitle
        });
        setOrfProbeActive(false);
      }
    }, [orfProbeTimer, orfProbeActive, orfProbeWords, orfProbeResults, orfProbeLastWord]);
    // Cleanup all probe timers on unmount to prevent memory leaks
    React.useEffect(() => {
      return () => {
        if (mnProbeTimerRef.current) clearInterval(mnProbeTimerRef.current);
        if (qdProbeTimerRef.current) clearInterval(qdProbeTimerRef.current);
        if (nwfProbeTimerRef.current) clearInterval(nwfProbeTimerRef.current);
        if (lnfProbeTimerRef.current) clearInterval(lnfProbeTimerRef.current);
        if (ranProbeTimerRef.current) clearInterval(ranProbeTimerRef.current);
        if (orfProbeTimerRef.current) clearInterval(orfProbeTimerRef.current);
        if (mathFluencyTimerRef && mathFluencyTimerRef.current) clearInterval(mathFluencyTimerRef.current);
      };
    }, []);
    // Start probe timer after ProbeOverlay countdown completes
    const startProbeTimer = React.useCallback(() => {
      if (!probeTimerPending) return;
      var tp = probeTimerPending;
      setProbeTimerPending(null);
      if (tp.type === 'nwf') {
        if (nwfProbeTimerRef.current) clearInterval(nwfProbeTimerRef.current);
        nwfProbeTimerRef.current = setInterval(() => {
          setNwfProbeTimer(prev => {
            if (prev <= 1) { clearInterval(nwfProbeTimerRef.current); nwfProbeTimerRef.current = null; return 0; }
            return prev - 1;
          });
        }, 1000);
      } else if (tp.type === 'lnf') {
        if (lnfProbeTimerRef.current) clearInterval(lnfProbeTimerRef.current);
        lnfProbeTimerRef.current = setInterval(() => {
          setLnfProbeTimer(prev => {
            if (prev <= 1) { clearInterval(lnfProbeTimerRef.current); lnfProbeTimerRef.current = null; return 0; }
            return prev - 1;
          });
        }, 1000);
      } else if (tp.type === 'ran') {
        ranProbeStartRef.current = Date.now();
        if (ranProbeTimerRef.current) clearInterval(ranProbeTimerRef.current);
        ranProbeTimerRef.current = setInterval(() => {
          setRanProbeElapsed(Math.floor((Date.now() - ranProbeStartRef.current) / 1000));
        }, 250);
      }
    }, [probeTimerPending]);
    const [reportStartDate, setReportStartDate] = React.useState('');
    const [reportEndDate, setReportEndDate] = React.useState('');
    const [safetyFlaggingVisible, setSafetyFlaggingVisible] = React.useState(() => {
      try {
        return safeGetItem('alloflow_safety_visible') !== 'false';
      } catch (e) {
        return true;
      }
    });
    React.useEffect(() => {
      try {
        safeSetItem('alloflow_safety_visible', String(safetyFlaggingVisible));
      } catch (e) {}
    }, [safetyFlaggingVisible]);
    React.useEffect(() => {
      if (!latestProbeResult) return;
      const targetName = latestProbeResult.student;
      if (!targetName) {
        setLatestProbeResult(null);
        return;
      }
      setImportedStudents(prev => prev.map(s => {
        if ((s.nickname || s.name) !== targetName) return s;
        const history = s.screeningHistory || [];
        return {
          ...s,
          screeningHistory: [...history, latestProbeResult]
        };
      }));
      setLatestProbeResult(null);
    }, [latestProbeResult]);
    const [liveProgressData, setLiveProgressData] = React.useState({});
    const [isLiveListening, setIsLiveListening] = React.useState(false);
    const [liveSyncCode, setLiveSyncCode] = React.useState('');
    const [showLiveSyncInput, setShowLiveSyncInput] = React.useState(false);
    const [rtiThresholds, setRtiThresholds] = React.useState(() => {
      try {
        const saved = safeGetItem('alloflow_rti_thresholds');
        if (saved) return JSON.parse(saved);
      } catch (e) {/* localStorage unavailable */}
      return {
        quizTier3: 50,
        quizTier2: 80,
        wsTier3: 50,
        wsTier2: 75,
        engagementMin: 2,
        fluencyMin: 60,
        labelChallengeMin: 50
      };
    });
    React.useEffect(() => {
      try {
        safeSetItem('alloflow_rti_thresholds', JSON.stringify(rtiThresholds));
      } catch (e) {/* ignore */}
    }, [rtiThresholds]);
    const quizChartRef = React.useRef(null);
    const quizChartInstance = React.useRef(null);
    const flagsChartRef = React.useRef(null);
    const flagsChartInstance = React.useRef(null);
    const trendChartRef = React.useRef(null);
    const trendChartInstance = React.useRef(null);
    React.useEffect(() => {
      if (typeof Chart !== 'undefined') return;
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js';
      script.async = true;
      document.head.appendChild(script);
      return () => {/* keep script loaded */};
    }, []);
    const handleSort = column => {
      if (sortColumn === column) {
        setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
      } else {
        setSortColumn(column);
        setSortDirection('asc');
      }
    };
    const sortedAndFiltered = React.useMemo(() => {
      let list = [...importedStudents];
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        list = list.filter(s => s.name.toLowerCase().includes(q));
      }
      if (sortColumn) {
        list.sort((a, b) => {
          let valA, valB;
          if (sortColumn === 'name') {
            valA = a.name.toLowerCase();
            valB = b.name.toLowerCase();
          } else if (sortColumn === 'flags') {
            valA = a.safetyFlags.length;
            valB = b.safetyFlags.length;
          } else if (sortColumn === 'rtiTier') {
            valA = classifyRTITier(a.stats).tier;
            valB = classifyRTITier(b.stats).tier;
          } else {
            valA = a.stats[sortColumn] || 0;
            valB = b.stats[sortColumn] || 0;
          }
          if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
          if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
          return 0;
        });
      }
      return list;
    }, [importedStudents, sortColumn, sortDirection, searchQuery]);
    const handleFileImport = async e => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;
      setIsProcessing(true);
      setImportProgress({
        current: 0,
        total: files.length
      });
      const CHUNK_SIZE = 10;
      let processedCount = 0;
      let allNewStudents = [];
      for (let i = 0; i < files.length; i += CHUNK_SIZE) {
        const chunk = files.slice(i, i + CHUNK_SIZE);
        const chunkStudents = [];
        for (const file of chunk) {
          try {
            const text = await file.text();
            const data = JSON.parse(text);
            const studentName = data.studentNickname || data.profile?.name || file.name.replace('.json', '').replace(/_/g, ' ');
            const stats = calculateStudentStats(data);
            chunkStudents.push({
              id: `student-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              name: studentName,
              filename: file.name,
              data: data,
              stats: stats,
              safetyFlags: extractSafetyFlags(data),
              lastSession: data.lastSaved || new Date().toISOString()
            });
          } catch (err) {
            warnLog(`Failed to parse ${file.name}:`, err);
          }
        }
        allNewStudents = [...allNewStudents, ...chunkStudents];
        processedCount += chunk.length;
        setImportProgress({
          current: Math.min(processedCount, files.length),
          total: files.length
        });
        setImportedStudents(prev => [...prev, ...chunkStudents]);
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      if (rosterKey && rosterKey.students && Object.keys(rosterKey.students).length > 0) {
        let appendedCount = 0;
        setRosterKey(function (prev) {
          var history = Object.assign({}, prev.progressHistory || {});
          allNewStudents.forEach(function (student) {
            var codename = student.name;
            if (prev.students && prev.students[codename] !== undefined) {
              var snapshot = {
                date: new Date().toISOString().split('T')[0],
                quizAvg: student.stats.quizAvg || 0,
                wsAccuracy: student.stats.wsAccuracy || 0,
                wsBestStreak: student.stats.wsBestStreak || 0,
                fluencyWCPM: student.stats.fluencyWCPM || 0,
                adventureXP: student.stats.adventureXP || 0,
                gamesPlayed: student.stats.gamesPlayed || 0,
                totalActivities: student.stats.totalActivities || 0,
                focusRatio: student.stats.focusRatio || null,
                importedFrom: student.filename
              };
              var existing = history[codename] || [];
              var filtered = existing.filter(function (s) {
                return s.date !== snapshot.date;
              });
              filtered.push(snapshot);
              filtered.sort(function (a, b) {
                return a.date.localeCompare(b.date);
              });
              history[codename] = filtered;
              appendedCount++;
            }
          });
          return Object.assign({}, prev, {
            progressHistory: history
          });
        });
        if (appendedCount > 0 && alloBotRef.current) {
          alloBotRef.current.speak("Progress snapshots saved for " + appendedCount + " student" + (appendedCount > 1 ? "s" : "") + " in your roster.");
        }
      } else if (!rosterKey || !rosterKey.students || Object.keys(rosterKey.students).length === 0) {
        if (alloBotRef.current) {
          alloBotRef.current.speak("Tip: Create a Class Roster to track student progress over time.");
        }
      }
      setIsProcessing(false);
      setImportProgress({
        current: 0,
        total: 0
      });
      if (alloBotRef.current) {
        const totalFlags = allNewStudents.reduce((acc, s) => acc + (s.safetyFlags ? s.safetyFlags.length : 0), 0);
        if (totalFlags > 0) {
          alloBotRef.current.speak(t('bot_events.feedback_safety_flagged'));
        } else {
          alloBotRef.current.speak(t('bot_events.feedback_safety_clean'));
        }
      }
    };
    const calculateStudentStats = data => {
      const stats = {
        quizAvg: 0,
        adventureXP: 0,
        escapeCompletion: 0,
        fluencyWCPM: 0,
        interviewXP: 0,
        totalActivities: 0,
        wsWordsCompleted: 0,
        wsAccuracy: 0,
        wsBestStreak: 0,
        socraticMessageCount: 0,
        gamesPlayed: 0,
        memoryGame: null,
        matchingGame: null,
        syntaxScramble: null,
        crosswordGame: null,
        timelineGame: null,
        conceptSortGame: null,
        vennDiagram: null,
        bingo: null,
        wordScramble: null,
        labelChallengeAvg: 0,
        labelChallengeAttempts: 0,
        labelChallengeBest: 0
      };
      if (data.responses && Object.keys(data.responses).length > 0) {
        const quizScores = Object.values(data.responses).map(r => r.score || 0);
        stats.quizAvg = quizScores.length > 0 ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length) : 0;
        stats.totalActivities += quizScores.length;
      }
      if (data.adventureState) {
        stats.adventureXP = data.adventureState.xp || data.adventureState.totalXP || 0;
        if (stats.adventureXP > 0) stats.totalActivities++;
      }
      if (data.escapeRoomStats) {
        const er = data.escapeRoomStats;
        if (er.totalPuzzles > 0) {
          stats.escapeCompletion = Math.round(er.puzzlesSolved / er.totalPuzzles * 100);
        }
        if (er.puzzlesSolved > 0) stats.totalActivities++;
      }
      if (data.fluencyAssessments && data.fluencyAssessments.length > 0) {
        const latest = data.fluencyAssessments[data.fluencyAssessments.length - 1];
        stats.fluencyWCPM = latest.wcpm || 0;
        stats.totalActivities += data.fluencyAssessments.length;
      }
      if (data.personaState) {
        stats.interviewXP = data.personaState.accumulatedXP || data.personaState.totalXP || 0;
        if (data.personaState.chatHistory?.length > 0) stats.totalActivities++;
      }
      if (data.wordSoundsState) {
        const ws = data.wordSoundsState;
        stats.wsWordsCompleted = ws.history?.length || 0;
        if (ws.sessionScore) {
          stats.wsAccuracy = ws.sessionScore.total > 0 ? Math.round(ws.sessionScore.correct / ws.sessionScore.total * 100) : 0;
          stats.wsBestStreak = ws.sessionScore.streak || 0;
        }
        if (ws.dailyProgress) {
          stats.totalActivities += Object.keys(ws.dailyProgress).length;
        }
      }
      if (data.gameCompletions) {
        const typeMap = {
          memory: 'memoryGame',
          matching: 'matchingGame',
          syntaxScramble: 'syntaxScramble',
          crossword: 'crosswordGame',
          timelineGame: 'timelineGame',
          conceptSortGame: 'conceptSortGame',
          vennDiagram: 'vennDiagram',
          bingo: 'bingo',
          wordScramble: 'wordScramble'
        };
        for (const [rawType, statKey] of Object.entries(typeMap)) {
          const entries = data.gameCompletions[rawType] || [];
          if (entries.length > 0) {
            const scores = entries.map(e => e.score ?? e.accuracy ?? 0);
            stats[statKey] = {
              initial: scores[0],
              attempts: entries.length,
              best: Math.max(...scores)
            };
            stats.gamesPlayed += entries.length;
            stats.totalActivities += entries.length;
          }
        }
      }
      if (data.socraticChatHistory?.messageCount > 0) {
        stats.socraticMessageCount = data.socraticChatHistory.messageCount;
        stats.totalActivities++;
      }
      if (data.labelChallengeResults?.length > 0) {
        const scores = data.labelChallengeResults.map(r => r.score || 0);
        stats.labelChallengeAvg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        stats.labelChallengeAttempts = scores.length;
        stats.labelChallengeBest = Math.max(...scores);
        stats.totalActivities += scores.length;
      }
      return stats;
    };
    const computeAnomalyFlags = student => {
      const flags = [];
      const history = rosterKey?.progressHistory?.[student.name] || [];
      if (history.length >= 5) {
        const quizScores = history.map(h => h.quizAvg || 0).filter(s => s > 0);
        if (quizScores.length >= 5) {
          const mean = quizScores.reduce((a, b) => a + b, 0) / quizScores.length;
          const variance = quizScores.reduce((a, b) => a + (b - mean) ** 2, 0) / quizScores.length;
          const stdDev = Math.sqrt(variance);
          if (stdDev > 0) {
            const latest = quizScores[quizScores.length - 1];
            const zScore = (latest - mean) / stdDev;
            if (zScore > 2.0) {
              flags.push({
                type: 'score_spike',
                icon: '⚡',
                label: 'Score spike',
                detail: `Latest ${latest}% vs avg ${Math.round(mean)}% (z=${zScore.toFixed(1)})`,
                severity: 'info'
              });
            }
            if (zScore < -2.0) {
              flags.push({
                type: 'score_drop',
                icon: '📉',
                label: 'Score drop',
                detail: `Latest ${latest}% vs avg ${Math.round(mean)}% (z=${zScore.toFixed(1)})`,
                severity: 'warning'
              });
            }
          }
        }
      }
      if (student.stats.quizAvg >= 90 && student.stats.wsWordsCompleted === 0 && student.stats.gamesPlayed === 0) {
        flags.push({
          type: 'no_practice',
          icon: '🔍',
          label: 'High quiz, no practice',
          detail: `${student.stats.quizAvg}% quiz avg with 0 practice activities`,
          severity: 'info'
        });
      }
      const pasteCount = student.pasteEventCount || student.stats?.pasteEventCount || 0;
      if (pasteCount > 5) {
        flags.push({
          type: 'paste_activity',
          icon: '📋',
          label: pasteCount + ' pastes',
          detail: `${pasteCount} paste events detected this session`,
          severity: 'info'
        });
      }
      return flags;
    };
    const classifyRTITier = (stats, thresholds) => {
      const t3 = thresholds || rtiThresholds || {
        quizTier3: 50,
        quizTier2: 80,
        wsTier3: 50,
        wsTier2: 75,
        engagementMin: 2,
        fluencyMin: 60,
        labelChallengeMin: 50
      };
      const reasons = [];
      const recs = [];
      let tier = 1;
      if (stats.quizAvg < t3.quizTier3) {
        tier = Math.max(tier, 3);
        reasons.push(`Quiz average below ${t3.quizTier3}%`);
        recs.push('Increase scaffolding on quiz activities; consider breaking content into smaller chunks');
      } else if (stats.quizAvg < t3.quizTier2) {
        tier = Math.max(tier, 2);
        reasons.push(`Quiz average in instructional range (${t3.quizTier3}-${t3.quizTier2 - 1}%)`);
        recs.push('Provide targeted review on missed concepts before advancing');
      }
      if (stats.wsAccuracy > 0) {
        if (stats.wsAccuracy < t3.wsTier3) {
          tier = Math.max(tier, 3);
          reasons.push(`Word Sounds accuracy below ${t3.wsTier3}%`);
          recs.push('Focus on phonemic awareness with simpler CVC patterns; increase TTS scaffolding');
        } else if (stats.wsAccuracy < t3.wsTier2) {
          tier = Math.max(tier, 2);
          reasons.push('Word Sounds accuracy in developing range');
          recs.push('Practice with word families; use the fill-in-blank label mode for vocabulary building');
        }
      }
      if (stats.totalActivities < t3.engagementMin) {
        tier = Math.max(tier, 2);
        reasons.push(`Very low engagement (fewer than ${t3.engagementMin} activities)`);
        recs.push('Check for access barriers; consider student interest inventory to personalize content');
      }
      if (stats.fluencyWCPM > 0 && stats.fluencyWCPM < t3.fluencyMin) {
        tier = Math.max(tier, 2);
        reasons.push(`Fluency below ${t3.fluencyMin} WCPM`);
        recs.push('Implement repeated reading with the fluency assessment tool; track WCPM trend weekly');
      }
      if (stats.labelChallengeAvg > 0 && stats.labelChallengeAvg < t3.labelChallengeMin) {
        tier = Math.max(tier, 2);
        reasons.push(`Label Challenge average below ${t3.labelChallengeMin}%`);
        recs.push('Use fill-in-blank mode to build vocabulary before attempting from-scratch labeling');
      }
      if (stats.mathDCPM > 0 && stats.mathDCPM < (t3.mathDCPMTier3 || 20)) {
        tier = Math.max(tier, 3);
        reasons.push(`Math fluency critically below ${t3.mathDCPMTier3 || 20} DCPM`);
        recs.push("Implement daily math fact practice with timed drills; focus on single-operation mastery");
      } else if (stats.mathDCPM > 0 && stats.mathDCPM < (t3.mathDCPMTier2 || 40)) {
        tier = Math.max(tier, 2);
        reasons.push(`Math fluency developing (below ${t3.mathDCPMTier2 || 40} DCPM)`);
        recs.push("Use Fluency Probes 2-3x/week to build automaticity; gradually increase operation complexity");
      }
      if (tier === 1) {
        if (stats.quizAvg >= t3.quizTier2) reasons.push('Strong quiz performance');
        if (stats.wsAccuracy >= t3.wsTier2) reasons.push('Solid phonemic accuracy');
        if (stats.totalActivities >= 5) reasons.push('Good engagement level');
        if (stats.fluencyWCPM >= 100) reasons.push('Strong fluency');
        recs.push('Ready for increased challenge, reduced scaffolding, or peer tutoring roles');
      }
      const tierLabels = {
        1: {
          label: 'Tier 1 — On Track',
          color: '#16a34a',
          bg: '#dcfce7',
          border: '#86efac',
          emoji: '🟢'
        },
        2: {
          label: 'Tier 2 — Strategic',
          color: '#d97706',
          bg: '#fef9c3',
          border: '#fcd34d',
          emoji: '🟡'
        },
        3: {
          label: 'Tier 3 — Intensive',
          color: '#dc2626',
          bg: '#fee2e2',
          border: '#fca5a5',
          emoji: '🔴'
        }
      };
      return {
        tier,
        ...tierLabels[tier],
        reasons,
        recommendations: recs
      };
    };
    // ── CBM Benchmark Norms (Hasbrouck & Tindal 2017, DIBELS 8th Ed) ──
    var CBM_NORMS = {
      orf: { '1': { fall: 0, winter: 23, spring: 53 }, '2': { fall: 51, winter: 72, spring: 89 }, '3': { fall: 71, winter: 92, spring: 107 }, '4': { fall: 94, winter: 112, spring: 123 }, '5': { fall: 110, winter: 127, spring: 139 }, '6': { fall: 127, winter: 140, spring: 150 } },
      nwf_cls: { 'K': { fall: 0, winter: 17, spring: 35 }, '1': { fall: 35, winter: 55, spring: 65 } },
      lnf: { 'K': { fall: 7, winter: 30, spring: 47 } },
      math_dcpm: { '1': { fall: 8, winter: 15, spring: 25 }, '2': { fall: 15, winter: 25, spring: 35 }, '3': { fall: 25, winter: 35, spring: 45 }, '4': { fall: 30, winter: 40, spring: 50 }, '5': { fall: 35, winter: 45, spring: 55 }, '6': { fall: 40, winter: 50, spring: 60 } }
    };
    var getSeason = function() { var m = new Date().getMonth(); if (m >= 7 && m <= 10) return 'fall'; if (m >= 11 || m <= 1) return 'winter'; return 'spring'; };

    var interpretProbeResult = function(probeType, score, grade, season) {
      season = season || getSeason(); grade = String(grade || '1');
      var norms = CBM_NORMS[probeType]; if (!norms || !norms[grade]) return { tier: 0, status: 'No norms available', statusColor: '#64748b', benchmark50: null, pctOfBenchmark: null, interpretation: '', recommendations: [] };
      var benchmark = norms[grade][season]; if (benchmark === undefined || benchmark === null) return { tier: 0, status: 'No norms for this season', statusColor: '#64748b', benchmark50: null, pctOfBenchmark: null, interpretation: '', recommendations: [] };
      var pct = benchmark > 0 ? Math.round((score / benchmark) * 100) : (score > 0 ? 200 : 0);
      var tier, status, statusColor, interpretation, recs = [];
      if (pct >= 100) { tier = 1; status = 'At or Above Benchmark'; statusColor = '#16a34a'; interpretation = score + ' is at or above the 50th percentile (' + benchmark + ') for ' + season + ' grade ' + grade + '.'; recs = ['Continue current instruction.', 'Re-assess at next screening window.']; }
      else if (pct >= 75) { tier = 1; status = 'Approaching Benchmark'; statusColor = '#65a30d'; interpretation = score + ' is approaching the 50th percentile (' + benchmark + ') for ' + season + ' grade ' + grade + '.'; recs = ['Monitor informally.', 'Additional practice within Tier 1.']; }
      else if (pct >= 50) { tier = 2; status = 'Below Benchmark'; statusColor = '#d97706'; interpretation = score + ' is below the 50th percentile (' + benchmark + ') for ' + season + ' grade ' + grade + '. Strategic intervention recommended.'; recs = ['Begin Tier 2 intervention.', 'Monitor bi-weekly.', 'Aim for 8+ data points.']; }
      else { tier = 3; status = 'Well Below Benchmark'; statusColor = '#dc2626'; interpretation = score + ' is well below the 50th percentile (' + benchmark + ') for ' + season + ' grade ' + grade + '. Intensive intervention needed.'; recs = ['Begin Tier 3 intensive intervention.', 'Monitor weekly.', 'Consider referral if insufficient growth after 6-8 weeks.']; }
      if (probeType === 'orf' && tier >= 2) recs.push('Implement repeated reading with corrective feedback.');
      if (probeType === 'nwf_cls' && tier >= 2) recs.push('Focus on phonics: CVC blending, sound-symbol correspondence.');
      if (probeType === 'lnf' && tier >= 2) recs.push('Increase letter exposure through multisensory activities.');
      if (probeType === 'math_dcpm' && tier >= 2) recs.push('Short daily fact fluency sessions (5-10 min).');
      return { tier: tier, status: status, statusColor: statusColor, benchmark50: benchmark, pctOfBenchmark: pct, interpretation: interpretation, recommendations: recs, season: season, grade: grade };
    };

    var renderProbeInterpretation = function(probeType, score, grade, season) {
      var result = interpretProbeResult(probeType, score, grade, season);
      if (result.tier === 0) return null;
      return React.createElement("div", { className: "mt-3 rounded-lg border p-3", style: { borderColor: result.statusColor + '40', background: result.statusColor + '08' } },
        React.createElement("div", { className: "flex items-center gap-2 mb-2" },
          React.createElement("div", { className: "w-3 h-3 rounded-full", style: { background: result.statusColor } }),
          React.createElement("span", { className: "text-xs font-bold", style: { color: result.statusColor } }, result.status),
          React.createElement("span", { className: "text-[11px] text-slate-600 ml-auto" }, result.pctOfBenchmark + "% of " + result.season + " benchmark (" + result.benchmark50 + ")")
        ),
        React.createElement("p", { className: "text-xs text-slate-600 mb-2" }, result.interpretation),
        result.recommendations.length > 0 ? React.createElement("div", { className: "space-y-1" },
          React.createElement("span", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "Recommendations:"),
          result.recommendations.map(function(rec, i) { return React.createElement("p", { key: i, className: "text-[11px] text-slate-600 pl-3 border-l-2", style: { borderColor: result.statusColor + '60' } }, rec); })
        ) : null
      );
    };

    // ── RTI Meeting Summary ──
    var printMeetingSummary = function(studentName) {
      var dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      var season = getSeason(); var seasonLabel = season.charAt(0).toUpperCase() + season.slice(1);
      var student = importedStudents.find(function(s) { return (s.nickname || s.name) === studentName; });
      var stats = student ? student.stats || {} : {};
      var tierResult = classifyRTITier(stats);
      var probes = (probeHistory && probeHistory[studentName]) || [];
      var interventions = (interventionLogs && interventionLogs[studentName]) || [];
      var probesByType = {}; probes.forEach(function(p) { var t = p.type || p.activity || 'unknown'; if (!probesByType[t] || new Date(p.date) > new Date(probesByType[t].date)) probesByType[t] = p; });
      var benchRows = Object.keys(probesByType).map(function(type) {
        var p = probesByType[type]; var score = p.wcpm||p.cls||p.correct||p.dcpm||p.itemsPerMin||0;
        var nt = (type==='orf'||type==='fluency')?'orf':type==='nwf'?'nwf_cls':type==='lnf'?'lnf':'math_dcpm';
        var interp = interpretProbeResult(nt, score, p.grade||'1', season);
        var tl = {orf:'ORF',nwf:'NWF',lnf:'LNF',math:'Math',fluency:'ORF',missing_number:'MN',quantity_discrimination:'QD'};
        return '<tr><td style="padding:6px 10px;border:1px solid #e2e8f0;font-size:12px;font-weight:600">'+(tl[type]||type)+'</td><td style="padding:6px 10px;border:1px solid #e2e8f0;text-align:center;font-weight:700;color:'+interp.statusColor+'">'+score+'</td><td style="padding:6px 10px;border:1px solid #e2e8f0;text-align:center">'+(interp.benchmark50!==null?interp.benchmark50:'--')+'</td><td style="padding:6px 10px;border:1px solid #e2e8f0;text-align:center">'+(interp.pctOfBenchmark||'--')+'%</td><td style="padding:6px 10px;border:1px solid #e2e8f0;font-size:12px;color:'+interp.statusColor+';font-weight:700">'+interp.status+'</td></tr>';
      }).join('');
      var intvRows = interventions.map(function(iv) { return '<tr><td style="padding:5px 10px;border:1px solid #e2e8f0;font-size:12px;font-weight:600">'+(iv.program||'--')+'</td><td style="padding:5px 10px;border:1px solid #e2e8f0;font-size:12px">'+(iv.frequency||'--')+'</td><td style="padding:5px 10px;border:1px solid #e2e8f0;font-size:12px;text-align:center">'+(iv.minutes||'--')+' min</td><td style="padding:5px 10px;border:1px solid #e2e8f0;font-size:12px">'+(iv.startDate||'--')+'</td></tr>'; }).join('');
      var rec = tierResult.tier === 1 ? '<span style="color:#16a34a;font-weight:700">Continue Tier 1.</span> Student is on track.' : tierResult.tier === 2 ? '<span style="color:#d97706;font-weight:700">Tier 2 strategic support.</span> ' + tierResult.recommendations.slice(0,2).join(' ') : '<span style="color:#dc2626;font-weight:700">Tier 3 intensive.</span> ' + tierResult.recommendations.slice(0,2).join(' ');
      var html = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>RTI Meeting Summary</title><style>body{font-family:system-ui,sans-serif;max-width:750px;margin:0 auto;padding:1.5rem;color:#1e293b;font-size:12px;line-height:1.5}h1{font-size:16px;color:#1e3a5f;border-bottom:3px solid #2563eb;padding-bottom:6px;margin:0 0 4px}h2{font-size:13px;color:#1e3a5f;margin:14px 0 6px;border-left:4px solid #2563eb;padding-left:8px}table{width:100%;border-collapse:collapse;margin:6px 0}th{background:#f1f5f9;padding:5px 10px;border:1px solid #e2e8f0;font-size:10px;text-transform:uppercase;color:#64748b;text-align:left}.footer{margin-top:16px;padding-top:8px;border-top:2px solid #e2e8f0;font-size:9px;color:#94a3b8;text-align:center}@media print{body{padding:0.4in;font-size:11px}}</style></head><body>' +
        '<h1>RTI Data Team Meeting Summary</h1>' +
        '<div style="color:#64748b;font-size:11px;margin-bottom:12px"><strong>Student:</strong> '+studentName+' &bull; <strong>Date:</strong> '+dateStr+' &bull; <strong>Season:</strong> '+seasonLabel+'</div>' +
        '<div style="margin:8px 0 12px"><span style="display:inline-block;padding:4px 14px;border-radius:20px;font-weight:800;font-size:13px;background:'+(tierResult.bg||'#f1f5f9')+';color:'+(tierResult.color||'#334155')+';border:2px solid '+(tierResult.border||'#cbd5e1')+'">'+(tierResult.emoji||'')+' '+(tierResult.label||'Not Classified')+'</span></div>' +
        (benchRows ? '<h2>Benchmark Status</h2><table><thead><tr><th>Measure</th><th style="text-align:center">Score</th><th style="text-align:center">50th %ile</th><th style="text-align:center">% of Benchmark</th><th>Status</th></tr></thead><tbody>'+benchRows+'</tbody></table>' : '') +
        (intvRows ? '<h2>Intervention History</h2><table><thead><tr><th>Program</th><th>Frequency</th><th>Duration</th><th>Start</th></tr></thead><tbody>'+intvRows+'</tbody></table>' : '<h2>Intervention History</h2><p style="color:#94a3b8;font-style:italic">No interventions logged.</p>') +
        '<h2>Recommendation</h2><div style="padding:10px 14px;border-radius:8px;background:'+(tierResult.bg||'#f1f5f9')+';border-left:4px solid '+(tierResult.color||'#64748b')+';font-size:12px">'+rec+'</div>' +
        '<h2>Team Decision</h2><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px"><div style="font-size:10px;text-transform:uppercase;color:#64748b;margin:0 0 4px;font-weight:700">Decision</div><label style="font-size:11px;display:block;margin:3px 0"><input type="checkbox" style="margin-right:4px">Continue current</label><label style="font-size:11px;display:block;margin:3px 0"><input type="checkbox" style="margin-right:4px">Modify intervention</label><label style="font-size:11px;display:block;margin:3px 0"><input type="checkbox" style="margin-right:4px">Move to higher tier</label><label style="font-size:11px;display:block;margin:3px 0"><input type="checkbox" style="margin-right:4px">Refer for evaluation</label></div><div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px"><div style="font-size:10px;text-transform:uppercase;color:#64748b;margin:0 0 4px;font-weight:700">Next Steps</div><div style="margin:4px 0"><span style="font-size:10px;color:#64748b">New Intervention:</span><div style="border-bottom:1px solid #e2e8f0;min-height:14px"></div></div><div style="margin:4px 0"><span style="font-size:10px;color:#64748b">Next Review:</span><div style="border-bottom:1px solid #e2e8f0;min-height:14px"></div></div></div></div>' +
        '<div style="display:flex;gap:20px;margin-top:16px"><div style="flex:1;border-top:1px solid #cbd5e1;padding-top:3px;font-size:10px;color:#64748b">Team Members</div><div style="flex:1;border-top:1px solid #cbd5e1;padding-top:3px;font-size:10px;color:#64748b">Date</div></div>' +
        '<div class="footer"><p>AlloFlow Assessment Center &bull; '+dateStr+'</p></div></body></html>';
      var w = window.open('', '_blank'); if (w) { w.document.write(html); w.document.close(); }
    };

    // ── Class Screening Report ──
    var printClassScreeningReport = function() {
      var dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      var season = getSeason(); var seasonLabel = season.charAt(0).toUpperCase() + season.slice(1);
      var studentData = importedStudents.map(function(s) {
        var name = s.nickname || s.name; var stats = s.stats || {}; var tier = classifyRTITier(stats);
        var sp = (probeHistory && probeHistory[name]) || []; var latest = {};
        sp.forEach(function(p) { var t = p.type||p.activity||'unknown'; if (!latest[t] || new Date(p.date) > new Date(latest[t].date)) latest[t] = p; });
        var scores = {};
        ['orf','nwf','lnf','math','fluency','missing_number','quantity_discrimination'].forEach(function(type) {
          var p = latest[type]; if (!p) return; var score = p.wcpm||p.cls||p.correct||p.dcpm||p.itemsPerMin||0;
          var nt = (type==='orf'||type==='fluency')?'orf':type==='nwf'?'nwf_cls':type==='lnf'?'lnf':'math_dcpm';
          scores[type] = { score: score, interp: interpretProbeResult(nt, score, p.grade||'1', season) };
        });
        return { name: name, tier: tier, scores: scores };
      });
      studentData.sort(function(a,b) { return b.tier.tier !== a.tier.tier ? b.tier.tier - a.tier.tier : a.name.localeCompare(b.name); });
      var t3=studentData.filter(function(s){return s.tier.tier===3;}), t2=studentData.filter(function(s){return s.tier.tier===2;}), t1=studentData.filter(function(s){return s.tier.tier===1;});
      var n = studentData.length;
      var rows = studentData.map(function(s) {
        var cells = ['orf','fluency','nwf','lnf','math','missing_number','quantity_discrimination'].map(function(t) { var d=s.scores[t]; return d ? '<td style="padding:4px 8px;border:1px solid #e2e8f0;text-align:center;font-weight:700;font-size:12px;color:'+d.interp.statusColor+'">'+d.score+'</td>' : '<td style="padding:4px 8px;border:1px solid #e2e8f0;text-align:center;color:#cbd5e1">\u2014</td>'; }).join('');
        return '<tr><td style="padding:4px 8px;border:1px solid #e2e8f0;font-size:12px;font-weight:600">'+s.name+'</td><td style="padding:4px 8px;border:1px solid #e2e8f0;text-align:center"><span style="padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;background:'+s.tier.bg+';color:'+s.tier.color+'">T'+s.tier.tier+'</span></td>'+cells+'</tr>';
      }).join('');
      var html = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Class Screening</title><style>body{font-family:system-ui,sans-serif;max-width:900px;margin:0 auto;padding:1.5rem;color:#1e293b;font-size:12px}h1{font-size:16px;color:#1e3a5f;border-bottom:3px solid #2563eb;padding-bottom:6px}h2{font-size:13px;color:#1e3a5f;margin:14px 0 6px;border-left:4px solid #2563eb;padding-left:8px}table{width:100%;border-collapse:collapse;margin:6px 0}th{background:#f1f5f9;padding:5px 8px;border:1px solid #e2e8f0;font-size:9px;text-transform:uppercase;color:#64748b;text-align:center}th:first-child{text-align:left}@media print{body{padding:0.3in}}</style></head><body>' +
        '<h1>\uD83C\uDFEB Class Screening \u2014 '+seasonLabel+'</h1><div style="color:#64748b;font-size:11px;margin-bottom:12px">'+dateStr+' &bull; '+n+' students</div>' +
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:8px 0">' +
          '<div style="text-align:center;padding:12px;border-radius:10px;border:2px solid #86efac;background:#dcfce7"><div style="font-size:28px;font-weight:900;color:#16a34a">'+t1.length+'</div><div style="font-size:11px;font-weight:700;color:#16a34a">Tier 1</div><div style="font-size:10px;color:#166534">'+(n?Math.round(t1.length/n*100):0)+'%</div></div>' +
          '<div style="text-align:center;padding:12px;border-radius:10px;border:2px solid #fcd34d;background:#fef9c3"><div style="font-size:28px;font-weight:900;color:#d97706">'+t2.length+'</div><div style="font-size:11px;font-weight:700;color:#d97706">Tier 2</div><div style="font-size:10px;color:#92400e">'+(n?Math.round(t2.length/n*100):0)+'%</div></div>' +
          '<div style="text-align:center;padding:12px;border-radius:10px;border:2px solid #fca5a5;background:#fee2e2"><div style="font-size:28px;font-weight:900;color:#dc2626">'+t3.length+'</div><div style="font-size:11px;font-weight:700;color:#dc2626">Tier 3</div><div style="font-size:10px;color:#991b1b">'+(n?Math.round(t3.length/n*100):0)+'%</div></div>' +
        '</div>' +
        '<h2>Scores by Measure</h2><table><thead><tr><th style="min-width:100px">Student</th><th>Tier</th><th>ORF</th><th>NWF</th><th>LNF</th><th>Math</th><th>MN</th><th>QD</th></tr></thead><tbody>'+rows+'</tbody></table>' +
        (t3.length > 0 ? '<h2>Priority (Tier 3)</h2>' + t3.map(function(s) { return '<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:8px 12px;margin:4px 0"><strong style="color:#991b1b">'+s.name+'</strong> <span style="font-size:10px;color:#7f1d1d">'+ s.tier.reasons.slice(0,3).join('; ')+'</span></div>'; }).join('') : '') +
        '<h2>Notes</h2><div style="border:1px solid #e2e8f0;border-radius:8px;min-height:60px;padding:8px"></div>' +
        '<div style="margin-top:16px;padding-top:8px;border-top:2px solid #e2e8f0;font-size:9px;color:#94a3b8;text-align:center">AlloFlow Assessment Center &bull; '+dateStr+'</div></body></html>';
      var w = window.open('', '_blank'); if (w) { w.document.write(html); w.document.close(); }
    };

    // ═══════════════════════════════════════════════════════════════
    // ASSESSMENT CENTER CLINICAL INTELLIGENCE (Instance #5)
    // CBM norms, probe interpretation, progress monitoring,
    // clinical reports, meeting summaries, screening reports
    // ═══════════════════════════════════════════════════════════════

    // ── CBM Benchmark Norms ──
    // Hasbrouck & Tindal (2017) for ORF, DIBELS 8th Ed for NWF/LNF, research consensus for math.
    var CBM_NORMS = {
      orf: { '1': { fall: 0, winter: 23, spring: 53 }, '2': { fall: 51, winter: 72, spring: 89 }, '3': { fall: 71, winter: 92, spring: 107 }, '4': { fall: 94, winter: 112, spring: 123 }, '5': { fall: 110, winter: 127, spring: 139 }, '6': { fall: 127, winter: 140, spring: 150 } },
      nwf_cls: { 'K': { fall: 0, winter: 17, spring: 35 }, '1': { fall: 35, winter: 55, spring: 65 } },
      lnf: { 'K': { fall: 7, winter: 30, spring: 47 } },
      math_dcpm: { '1': { fall: 8, winter: 15, spring: 25 }, '2': { fall: 15, winter: 25, spring: 35 }, '3': { fall: 25, winter: 35, spring: 45 }, '4': { fall: 30, winter: 40, spring: 50 }, '5': { fall: 35, winter: 45, spring: 55 }, '6': { fall: 40, winter: 50, spring: 60 } }
    };
    var getSeason = function() { var m = new Date().getMonth(); if (m >= 7 && m <= 10) return 'fall'; if (m >= 11 || m <= 1) return 'winter'; return 'spring'; };

    // ── Probe Interpretation Engine ──
    var interpretProbeResult = function(probeType, score, grade, season) {
      season = season || getSeason(); grade = String(grade || '1');
      var norms = CBM_NORMS[probeType]; if (!norms || !norms[grade]) return { tier: 0, status: 'No norms available', statusColor: '#64748b', benchmark50: null, pctOfBenchmark: null, interpretation: '', recommendations: [] };
      var benchmark = norms[grade][season]; if (benchmark === undefined || benchmark === null) return { tier: 0, status: 'No norms for this season', statusColor: '#64748b', benchmark50: null, pctOfBenchmark: null, interpretation: '', recommendations: [] };
      var pct = benchmark > 0 ? Math.round((score / benchmark) * 100) : (score > 0 ? 200 : 0);
      var tier, status, statusColor, interpretation, recommendations;
      if (pct >= 100) { tier = 1; status = 'At or Above Benchmark'; statusColor = '#16a34a'; interpretation = score + ' is at or above the 50th percentile (' + benchmark + ') for ' + season + ' of grade ' + grade + '.'; recommendations = ['Continue current instruction.', 'Consider enrichment or increased challenge.', 'Re-assess at next screening window.']; }
      else if (pct >= 75) { tier = 1; status = 'Approaching Benchmark'; statusColor = '#65a30d'; interpretation = score + ' is approaching the 50th percentile (' + benchmark + ') for ' + season + ' of grade ' + grade + '.'; recommendations = ['Monitor informally.', 'Provide additional practice within Tier 1.']; }
      else if (pct >= 50) { tier = 2; status = 'Below Benchmark'; statusColor = '#d97706'; interpretation = score + ' is below the 50th percentile (' + benchmark + ') for ' + season + ' of grade ' + grade + '. Strategic intervention recommended.'; recommendations = ['Begin Tier 2 intervention.', 'Monitor progress bi-weekly.', 'Aim for 8+ data points before evaluating effectiveness.']; }
      else { tier = 3; status = 'Well Below Benchmark'; statusColor = '#dc2626'; interpretation = score + ' is well below the 50th percentile (' + benchmark + ') for ' + season + ' of grade ' + grade + '. Intensive intervention needed.'; recommendations = ['Begin Tier 3 intensive intervention immediately.', 'Monitor progress weekly.', 'Consider referral for comprehensive evaluation if insufficient growth after 6-8 weeks.']; }
      if (probeType === 'orf' && tier >= 2) { recommendations.push('Implement repeated reading with corrective feedback.'); if (tier === 3) recommendations.push('Check decoding with NWF — if < 90% accuracy, fluency deficit may be driven by decoding problem.'); }
      if (probeType === 'nwf_cls' && tier >= 2) { recommendations.push('Focus on phonics: CVC blending, vowel sounds, sound-symbol correspondence.'); if (tier === 3) recommendations.push('Assess letter-sound knowledge with LNF.'); }
      if (probeType === 'lnf' && tier >= 2) { recommendations.push('Increase letter exposure through multisensory activities.'); if (tier === 3) recommendations.push('Prioritize high-frequency letters. Consider vision screening.'); }
      if (probeType === 'math_dcpm' && tier >= 2) { recommendations.push('Short daily fact fluency practice (5-10 min) with corrective feedback.'); if (tier === 3) recommendations.push('Check conceptual understanding vs. automaticity.'); }
      return { tier: tier, status: status, statusColor: statusColor, benchmark50: benchmark, pctOfBenchmark: pct, interpretation: interpretation, recommendations: recommendations, season: season, grade: grade };
    };

    // ── Render Probe Interpretation UI ──
    var renderProbeInterpretation = function(probeType, score, grade, season) {
      var result = interpretProbeResult(probeType, score, grade, season);
      if (result.tier === 0) return null;
      return React.createElement("div", { className: "mt-3 rounded-lg border p-3", style: { borderColor: result.statusColor + '40', background: result.statusColor + '08' } },
        React.createElement("div", { className: "flex items-center gap-2 mb-2" },
          React.createElement("div", { className: "w-3 h-3 rounded-full", style: { background: result.statusColor } }),
          React.createElement("span", { className: "text-xs font-bold", style: { color: result.statusColor } }, result.status),
          React.createElement("span", { className: "text-[11px] text-slate-600 ml-auto" }, result.pctOfBenchmark + "% of " + result.season + " benchmark (" + result.benchmark50 + ")")
        ),
        React.createElement("p", { className: "text-xs text-slate-600 mb-2" }, result.interpretation),
        result.recommendations.length > 0 ? React.createElement("div", { className: "space-y-1" },
          React.createElement("span", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "Recommendations:"),
          ...result.recommendations.map(function(rec, i) { return React.createElement("p", { key: i, className: "text-[11px] text-slate-600 pl-3 border-l-2", style: { borderColor: result.statusColor + '60' } }, rec); })
        ) : null
      );
    };

    // ── Clinical Probe Report Generator ──
    var printClinicalProbeReport = function(probeType, results, grade, form, studentName) {
      var season = getSeason(); var seasonLabel = season.charAt(0).toUpperCase() + season.slice(1);
      var dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      var typeLabels = { nwf: 'Nonsense Word Fluency (NWF)', lnf: 'Letter Naming Fluency (LNF)', orf: 'Oral Reading Fluency (ORF)', math: 'Math Computation Fluency', missing_number: 'Missing Number Fluency', quantity_discrimination: 'Quantity Discrimination' };
      var probeLabel = typeLabels[probeType] || probeType;
      var formLabel = form === 'A' ? 'Fall' : form === 'B' ? 'Winter' : form === 'C' ? 'Spring' : (form || '');
      var primaryScore, primaryLabel, secondaryRows = '';
      if (probeType === 'nwf') { primaryScore = results.cls; primaryLabel = 'Correct Letter Sounds (CLS)'; secondaryRows = '<tr><td style="padding:6px 12px;border:1px solid #e2e8f0;font-size:13px">Words Correct</td><td style="padding:6px 12px;border:1px solid #e2e8f0;font-size:13px;font-weight:700;text-align:center">' + results.correctWords + '</td></tr><tr><td style="padding:6px 12px;border:1px solid #e2e8f0;font-size:13px">Accuracy</td><td style="padding:6px 12px;border:1px solid #e2e8f0;font-size:13px;font-weight:700;text-align:center">' + (results.totalScored > 0 ? Math.round(results.correctWords / results.totalScored * 100) : 0) + '%</td></tr>'; }
      else if (probeType === 'lnf') { primaryScore = results.correct; primaryLabel = 'Letters Named Correctly'; secondaryRows = '<tr><td style="padding:6px 12px;border:1px solid #e2e8f0;font-size:13px">Accuracy</td><td style="padding:6px 12px;border:1px solid #e2e8f0;font-size:13px;font-weight:700;text-align:center">' + (results.totalScored > 0 ? Math.round(results.correct / results.totalScored * 100) : 0) + '%</td></tr>'; }
      else if (probeType === 'orf') { primaryScore = results.wcpm; primaryLabel = 'Words Correct Per Minute (WCPM)'; secondaryRows = '<tr><td style="padding:6px 12px;border:1px solid #e2e8f0;font-size:13px">Words Attempted</td><td style="padding:6px 12px;border:1px solid #e2e8f0;font-size:13px;font-weight:700;text-align:center">' + results.wordsAttempted + '</td></tr><tr><td style="padding:6px 12px;border:1px solid #e2e8f0;font-size:13px">Errors</td><td style="padding:6px 12px;border:1px solid #e2e8f0;font-size:13px;font-weight:700;text-align:center">' + results.errors + '</td></tr>'; }
      else { primaryScore = results.correct || 0; primaryLabel = 'Items Correct'; secondaryRows = '<tr><td style="padding:6px 12px;border:1px solid #e2e8f0;font-size:13px">Attempted</td><td style="padding:6px 12px;border:1px solid #e2e8f0;font-size:13px;font-weight:700;text-align:center">' + (results.total || 0) + '</td></tr>'; }
      var normType = probeType === 'orf' ? 'orf' : probeType === 'nwf' ? 'nwf_cls' : probeType === 'lnf' ? 'lnf' : 'math_dcpm';
      var interp = interpretProbeResult(normType, primaryScore, grade, season);
      var recsHtml = interp.recommendations.length > 0 ? '<h3 style="font-size:14px;font-weight:700;color:#1e3a5f;margin:20px 0 8px;border-left:4px solid ' + interp.statusColor + ';padding-left:8px">Recommendations</h3><ul style="margin:0;padding-left:20px">' + interp.recommendations.map(function(r) { return '<li style="font-size:12px;color:#334155;margin:4px 0;line-height:1.5">' + r + '</li>'; }).join('') + '</ul>' : '';
      var html = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Probe Report - ' + probeLabel + '</title><style>body{font-family:system-ui,sans-serif;max-width:700px;margin:0 auto;padding:2rem;color:#1e293b;line-height:1.6}h1{font-size:1.25rem;color:#1e3a5f;border-bottom:3px solid #2563eb;padding-bottom:0.5rem;margin:0 0 4px}h2{font-size:1rem;color:#334155;margin:16px 0 8px}.meta{color:#64748b;font-size:12px;margin-bottom:16px}.score-box{text-align:center;padding:20px;border-radius:12px;margin:16px 0}.score-num{font-size:3rem;font-weight:900}.status-badge{display:inline-block;padding:4px 14px;border-radius:20px;font-weight:700;font-size:12px;margin-top:8px}table{width:100%;border-collapse:collapse;margin:8px 0}th{background:#f1f5f9;padding:6px 12px;border:1px solid #e2e8f0;font-size:11px;text-transform:uppercase;color:#64748b;text-align:left}.sig-line{margin-top:24px;display:flex;gap:24px}.sig-line div{flex:1;border-top:1px solid #cbd5e1;padding-top:4px;font-size:11px;color:#64748b}.footer{margin-top:24px;padding-top:12px;border-top:2px solid #e2e8f0;font-size:10px;color:#94a3b8;text-align:center}@media print{body{padding:0.5in}}</style></head><body>' +
        '<h1>' + probeLabel + ' \u2014 Probe Report</h1>' +
        '<div class="meta"><strong>Student:</strong> ' + (studentName || '________________') + ' &bull; <strong>Date:</strong> ' + dateStr + ' &bull; <strong>Grade:</strong> ' + (grade || '___') + ' &bull; <strong>Form:</strong> ' + (formLabel || '___') + ' &bull; <strong>Season:</strong> ' + seasonLabel + '</div>' +
        '<div class="score-box" style="background:' + interp.statusColor + '10"><div class="score-num" style="color:' + interp.statusColor + '">' + primaryScore + '</div><div style="font-size:13px;color:#475569;margin-top:4px">' + primaryLabel + '</div><div class="status-badge" style="background:' + interp.statusColor + '20;color:' + interp.statusColor + '">' + interp.status + '</div>' + (interp.benchmark50 !== null ? '<div style="font-size:11px;color:#64748b;margin-top:8px">' + interp.pctOfBenchmark + '% of ' + seasonLabel + ' benchmark (50th %ile: ' + interp.benchmark50 + ')</div>' : '') + '</div>' +
        '<h2>Score Details</h2><table><thead><tr><th>Metric</th><th style="text-align:center;width:120px">Value</th></tr></thead><tbody><tr><td style="padding:6px 12px;border:1px solid #e2e8f0;font-size:13px;font-weight:700;color:#1e3a5f">' + primaryLabel + '</td><td style="padding:6px 12px;border:1px solid #e2e8f0;font-size:13px;font-weight:700;text-align:center;color:' + interp.statusColor + '">' + primaryScore + '</td></tr>' + secondaryRows + '</tbody></table>' +
        '<h2>Interpretation</h2><p style="font-size:12px;color:#334155;background:' + interp.statusColor + '08;padding:10px 14px;border-radius:8px;border-left:4px solid ' + interp.statusColor + '">' + interp.interpretation + '</p>' + recsHtml +
        '<div class="sig-line"><div>Examiner Signature</div><div>Date</div><div>Title</div></div>' +
        '<div class="footer"><p>Generated by AlloFlow Assessment Center \u2022 ' + dateStr + '</p><p>Norms: Hasbrouck & Tindal (2017), DIBELS 8th Ed. This is a screening tool, not a comprehensive evaluation.</p></div></body></html>';
      var w = window.open('', '_blank');
      if (w) { w.document.write(html); w.document.close(); w.print(); }
    };

    // ── Progress Monitoring Summary ──
    var renderProbeProgressSummary = function(studentName) {
      var probes = (probeHistory && probeHistory[studentName]) || [];
      if (probes.length < 2) return null;
      var byType = {}; probes.forEach(function(p) { var type = p.type || p.activity || 'unknown'; if (!byType[type]) byType[type] = []; byType[type].push(p); });
      var expectedRates = { orf: 1.5, nwf: 1.0, lnf: 0.8, math: 0.5, fluency: 1.5, missing_number: 0.5, quantity_discrimination: 0.5 };
      var typeLabels = { orf: 'Oral Reading Fluency', nwf: 'Nonsense Word Fluency', lnf: 'Letter Naming Fluency', math: 'Math Computation', fluency: 'Reading Fluency', missing_number: 'Missing Number', quantity_discrimination: 'Quantity Discrimination' };
      var getScore = function(item) { return item.wcpm || item.cls || item.correct || item.dcpm || item.itemsPerMin || item.score || 0; };
      var sections = [];
      Object.keys(byType).forEach(function(type) {
        var items = byType[type].sort(function(a, b) { return new Date(a.date) - new Date(b.date); });
        if (items.length < 2) return;
        var first = items[0], last = items[items.length - 1];
        var firstScore = getScore(first), lastScore = getScore(last), change = lastScore - firstScore;
        var weeks = Math.max(1, Math.round((new Date(last.date) - new Date(first.date)) / (7 * 24 * 60 * 60 * 1000)));
        var weeklyGrowth = change / weeks;
        var expectedRate = expectedRates[type] || 1.0;
        var adequacy = weeklyGrowth >= expectedRate * 1.5 ? 'strong' : weeklyGrowth >= expectedRate * 0.75 ? 'adequate' : weeklyGrowth >= 0 ? 'insufficient' : 'declining';
        var growthColor = { strong: '#16a34a', adequate: '#65a30d', insufficient: '#d97706', declining: '#dc2626' };
        var growthLabel = { strong: 'Strong Growth', adequate: 'Adequate Growth', insufficient: 'Insufficient Growth', declining: 'Declining' };
        sections.push(React.createElement("div", { key: type, className: "bg-white rounded-lg border border-slate-400 p-3" },
          React.createElement("div", { className: "flex items-center justify-between mb-2" },
            React.createElement("h5", { className: "text-xs font-bold text-slate-700" }, typeLabels[type] || type),
            React.createElement("span", { className: "text-[11px] px-2 py-0.5 rounded-full font-bold", style: { background: growthColor[adequacy] + '15', color: growthColor[adequacy] } }, growthLabel[adequacy])
          ),
          React.createElement("div", { className: "grid grid-cols-4 gap-2 text-center mb-2" },
            React.createElement("div", { className: "bg-slate-50 rounded-lg p-2" }, React.createElement("div", { className: "text-sm font-bold text-slate-700" }, firstScore), React.createElement("div", { className: "text-[11px] text-slate-600" }, "Baseline")),
            React.createElement("div", { className: "bg-slate-50 rounded-lg p-2" }, React.createElement("div", { className: "text-sm font-bold", style: { color: growthColor[adequacy] } }, lastScore), React.createElement("div", { className: "text-[11px] text-slate-600" }, "Latest")),
            React.createElement("div", { className: "bg-slate-50 rounded-lg p-2" }, React.createElement("div", { className: "text-sm font-bold", style: { color: change >= 0 ? '#16a34a' : '#dc2626' } }, (change >= 0 ? '+' : '') + Math.round(change * 10) / 10), React.createElement("div", { className: "text-[11px] text-slate-600" }, "Change")),
            React.createElement("div", { className: "bg-slate-50 rounded-lg p-2" }, React.createElement("div", { className: "text-sm font-bold text-indigo-600" }, '+' + (Math.round(weeklyGrowth * 10) / 10) + '/wk'), React.createElement("div", { className: "text-[11px] text-slate-600" }, "Growth Rate"))
          ),
          React.createElement("div", { className: "flex justify-between text-[11px] text-slate-600" },
            React.createElement("span", null, items.length + " probes over " + Math.round(weeks) + " weeks"),
            React.createElement("span", null, "Expected: +" + expectedRate + "/wk")
          ),
          (adequacy === 'insufficient' || adequacy === 'declining') ? React.createElement("div", { className: "mt-2 text-[11px] px-2 py-1 rounded bg-amber-50", style: { borderLeft: '3px solid #d97706', color: '#92400e' } }, adequacy === 'declining' ? 'Performance declining. Consider changing intervention or diagnostic assessment.' : 'Growth rate below expected. Consider increasing intensity or changing approach.') : null
        ));
      });
      if (sections.length === 0) return null;
      return React.createElement("div", { className: "bg-white rounded-xl border border-slate-400 p-4 mt-4" },
        React.createElement("h5", { className: "text-xs font-bold text-slate-600 uppercase mb-3" }, "\uD83D\uDCC8 Progress Monitoring Summary"),
        React.createElement("div", { className: "space-y-3" }, ...sections)
      );
    };

    // ── RTI Meeting Summary Generator ──
    var printMeetingSummary = function(studentName) {
      var insights = generateStudentInsights(studentName);
      var probes = (probeHistory && probeHistory[studentName]) || [];
      var interventions = (interventionLogs && interventionLogs[studentName]) || [];
      var dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      var season = getSeason(); var seasonLabel = season.charAt(0).toUpperCase() + season.slice(1);
      var student = importedStudents.find(function(s) { return (s.nickname || s.name) === studentName; });
      var stats = student ? student.stats || {} : {};
      var tierResult = classifyRTITier(stats);
      var benchmarkRows = '', growthRows = '', interventionRows = '';
      var probesByType = {}; probes.forEach(function(p) { var t = p.type || p.activity || 'unknown'; if (!probesByType[t] || new Date(p.date) > new Date(probesByType[t].date)) probesByType[t] = p; });
      var typeLabels = { orf: 'ORF (WCPM)', nwf: 'NWF (CLS)', lnf: 'LNF', math: 'Math (DCPM)', fluency: 'ORF (WCPM)', missing_number: 'Missing Number', quantity_discrimination: 'Quantity Disc.' };
      Object.keys(probesByType).forEach(function(type) { var p = probesByType[type]; var score = p.wcpm||p.cls||p.correct||p.dcpm||p.itemsPerMin||0; var normType = (type==='orf'||type==='fluency')?'orf':type==='nwf'?'nwf_cls':type==='lnf'?'lnf':'math_dcpm'; var interp = interpretProbeResult(normType, score, p.grade||'1', season); benchmarkRows += '<tr><td style="padding:5px 10px;border:1px solid #e2e8f0;font-size:12px;font-weight:600">'+(typeLabels[type]||type)+'</td><td style="padding:5px 10px;border:1px solid #e2e8f0;font-size:12px;text-align:center;font-weight:700;color:'+interp.statusColor+'">'+score+'</td><td style="padding:5px 10px;border:1px solid #e2e8f0;font-size:12px;text-align:center">'+(interp.benchmark50!==null?interp.benchmark50:'--')+'</td><td style="padding:5px 10px;border:1px solid #e2e8f0;font-size:12px"><span style="color:'+interp.statusColor+';font-weight:700">'+interp.status+'</span></td></tr>'; });
      interventions.forEach(function(intv) { interventionRows += '<tr><td style="padding:5px 10px;border:1px solid #e2e8f0;font-size:12px;font-weight:600">'+(intv.program||'--')+'</td><td style="padding:5px 10px;border:1px solid #e2e8f0;font-size:12px">'+(intv.frequency||'--')+'</td><td style="padding:5px 10px;border:1px solid #e2e8f0;font-size:12px;text-align:center">'+(intv.minutes||'--')+' min</td><td style="padding:5px 10px;border:1px solid #e2e8f0;font-size:12px">'+(intv.startDate||'--')+'</td></tr>'; });
      var recommendation = tierResult.tier === 1 ? '<span style="color:#16a34a;font-weight:700">Continue Tier 1.</span> Reassess at next screening window.' : tierResult.tier === 2 ? '<span style="color:#d97706;font-weight:700">Tier 2 intervention needed.</span> Begin evidence-based program, monitor bi-weekly.' : '<span style="color:#dc2626;font-weight:700">Tier 3 intensive intervention.</span> Monitor weekly. Consider evaluation referral if insufficient growth.';
      var html = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>RTI Meeting Summary - ' + studentName + '</title><style>body{font-family:system-ui,sans-serif;max-width:750px;margin:0 auto;padding:1.5rem;color:#1e293b;line-height:1.5;font-size:12px}h1{font-size:16px;color:#1e3a5f;border-bottom:3px solid #2563eb;padding-bottom:6px;margin:0 0 4px}h2{font-size:13px;color:#1e3a5f;margin:14px 0 6px;border-left:4px solid #2563eb;padding-left:8px}.tier-badge{display:inline-block;padding:4px 14px;border-radius:20px;font-weight:800;font-size:13px}table{width:100%;border-collapse:collapse;margin:6px 0}th{background:#f1f5f9;padding:5px 10px;border:1px solid #e2e8f0;font-size:10px;text-transform:uppercase;color:#64748b;text-align:left}.rec-box{padding:10px 14px;border-radius:8px;margin:10px 0;font-size:12px}.sig-line{display:flex;gap:20px;margin-top:16px}.sig-line div{flex:1;border-top:1px solid #cbd5e1;padding-top:3px;font-size:10px;color:#64748b}.footer{margin-top:16px;padding-top:8px;border-top:2px solid #e2e8f0;font-size:9px;color:#94a3b8;text-align:center}@media print{body{padding:0.4in}}</style></head><body>' +
        '<h1>RTI Data Team Meeting Summary</h1><div style="color:#64748b;font-size:11px;margin-bottom:8px"><strong>Student:</strong> ' + studentName + ' &bull; <strong>Date:</strong> ' + dateStr + ' &bull; <strong>Season:</strong> ' + seasonLabel + '</div>' +
        '<div style="margin:8px 0 12px"><span class="tier-badge" style="background:' + (tierResult.bg||'#f1f5f9') + ';color:' + (tierResult.color||'#334155') + ';border:2px solid ' + (tierResult.border||'#cbd5e1') + '">' + (tierResult.emoji||'') + ' ' + (tierResult.label||'Not Classified') + '</span></div>' +
        (benchmarkRows ? '<h2>Current Benchmark Status</h2><table><thead><tr><th>Measure</th><th>Score</th><th>50th %ile</th><th>Status</th></tr></thead><tbody>' + benchmarkRows + '</tbody></table>' : '') +
        (interventionRows ? '<h2>Intervention History</h2><table><thead><tr><th>Program</th><th>Frequency</th><th>Duration</th><th>Start Date</th></tr></thead><tbody>' + interventionRows + '</tbody></table>' : '<h2>Intervention History</h2><p style="color:#94a3b8;font-style:italic">No interventions logged.</p>') +
        '<h2>Recommendation</h2><div class="rec-box" style="background:' + (tierResult.bg||'#f1f5f9') + ';border-left:4px solid ' + (tierResult.color||'#64748b') + '">' + recommendation + '</div>' +
        '<h2>Team Decision</h2><div style="font-size:11px;line-height:2"><label><input type="checkbox" style="margin-right:4px"> Continue current intervention</label><br><label><input type="checkbox" style="margin-right:4px"> Modify intervention</label><br><label><input type="checkbox" style="margin-right:4px"> Move to higher tier</label><br><label><input type="checkbox" style="margin-right:4px"> Refer for comprehensive evaluation</label><br><label><input type="checkbox" style="margin-right:4px"> Other: _______________</label></div>' +
        '<div class="sig-line"><div>Team Members Present</div><div>Date</div></div><div style="border-bottom:1px solid #e2e8f0;min-height:20px;margin-top:4px"></div>' +
        '<div class="footer"><p>AlloFlow Assessment Center &bull; ' + dateStr + '</p><p>Norms: Hasbrouck & Tindal (2017), DIBELS 8th Ed. Not a comprehensive evaluation.</p></div></body></html>';
      var w = window.open('', '_blank'); if (w) { w.document.write(html); w.document.close(); w.print(); }
    };

    // ── Class Screening Report Generator ──
    var printClassScreeningReport = function() {
      if (importedStudents.length === 0) { addToast && addToast('No students imported', 'info'); return; }
      var dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      var season = getSeason(); var seasonLabel = season.charAt(0).toUpperCase() + season.slice(1);
      var studentData = importedStudents.map(function(s) {
        var name = s.nickname || s.name; var stats = s.stats || {}; var tier = classifyRTITier(stats);
        var studentProbes = (probeHistory && probeHistory[name]) || []; var latestByType = {};
        studentProbes.forEach(function(p) { var type = p.type || p.activity || 'unknown'; if (!latestByType[type] || new Date(p.date) > new Date(latestByType[type].date)) latestByType[type] = p; });
        var scores = {}; ['orf','nwf','lnf','math','fluency','missing_number','quantity_discrimination'].forEach(function(type) { var p = latestByType[type]; if (!p) return; var score = p.wcpm||p.cls||p.correct||p.dcpm||p.itemsPerMin||0; var normType = (type==='orf'||type==='fluency')?'orf':type==='nwf'?'nwf_cls':type==='lnf'?'lnf':'math_dcpm'; scores[type] = { score: score, interp: interpretProbeResult(normType, score, p.grade||'1', season) }; });
        return { name: name, tier: tier, scores: scores };
      });
      studentData.sort(function(a,b) { return b.tier.tier !== a.tier.tier ? b.tier.tier - a.tier.tier : a.name.localeCompare(b.name); });
      var tier3=studentData.filter(function(s){return s.tier.tier===3;}), tier2=studentData.filter(function(s){return s.tier.tier===2;}), tier1=studentData.filter(function(s){return s.tier.tier===1;}), n=studentData.length;
      var allRows = studentData.map(function(s) {
        var cells=['orf','fluency','nwf','lnf','math','missing_number','quantity_discrimination'].map(function(t){var d=s.scores[t];if(!d)return'<td style="padding:4px 8px;border:1px solid #e2e8f0;text-align:center;color:#cbd5e1;font-size:11px">\u2014</td>';return'<td style="padding:4px 8px;border:1px solid #e2e8f0;text-align:center;font-weight:700;font-size:12px;color:'+d.interp.statusColor+'">'+d.score+'</td>';}).join('');
        return'<tr><td style="padding:4px 8px;border:1px solid #e2e8f0;font-size:12px;font-weight:600">'+s.name+'</td><td style="padding:4px 8px;border:1px solid #e2e8f0;text-align:center"><span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;background:'+s.tier.bg+';color:'+s.tier.color+'">'+s.tier.emoji+' T'+s.tier.tier+'</span></td>'+cells+'</tr>';
      }).join('');
      var html='<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Class Screening Report</title><style>body{font-family:system-ui,sans-serif;max-width:900px;margin:0 auto;padding:1.5rem;color:#1e293b;line-height:1.5;font-size:12px}h1{font-size:16px;color:#1e3a5f;border-bottom:3px solid #2563eb;padding-bottom:6px;margin:0 0 4px}h2{font-size:13px;color:#1e3a5f;margin:14px 0 6px;border-left:4px solid #2563eb;padding-left:8px}table{width:100%;border-collapse:collapse;margin:6px 0}th{background:#f1f5f9;padding:5px 8px;border:1px solid #e2e8f0;font-size:9px;text-transform:uppercase;color:#64748b;text-align:center}th:first-child{text-align:left}.footer{margin-top:16px;padding-top:8px;border-top:2px solid #e2e8f0;font-size:9px;color:#94a3b8;text-align:center}@media print{body{padding:0.3in;font-size:10px}}</style></head><body>'+
        '<h1>\uD83C\uDFEB Class Screening Report \u2014 '+seasonLabel+'</h1>'+
        '<div style="color:#64748b;font-size:11px;margin-bottom:12px"><strong>Date:</strong> '+dateStr+' &bull; <strong>Students:</strong> '+n+'</div>'+
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:8px 0">'+
          '<div style="text-align:center;padding:12px;border-radius:10px;border:2px solid #86efac;background:#dcfce7"><div style="font-size:28px;font-weight:900;color:#16a34a">'+tier1.length+'</div><div style="font-size:10px;font-weight:700;color:#16a34a">\uD83D\uDFE2 Tier 1 ('+(n?Math.round(tier1.length/n*100):0)+'%)</div></div>'+
          '<div style="text-align:center;padding:12px;border-radius:10px;border:2px solid #fcd34d;background:#fef9c3"><div style="font-size:28px;font-weight:900;color:#d97706">'+tier2.length+'</div><div style="font-size:10px;font-weight:700;color:#d97706">\uD83D\uDFE1 Tier 2 ('+(n?Math.round(tier2.length/n*100):0)+'%)</div></div>'+
          '<div style="text-align:center;padding:12px;border-radius:10px;border:2px solid #fca5a5;background:#fee2e2"><div style="font-size:28px;font-weight:900;color:#dc2626">'+tier3.length+'</div><div style="font-size:10px;font-weight:700;color:#dc2626">\uD83D\uDD34 Tier 3 ('+(n?Math.round(tier3.length/n*100):0)+'%)</div></div>'+
        '</div>'+
        '<h2>All Students by Measure</h2><table><thead><tr><th style="min-width:100px">Student</th><th>Tier</th><th>ORF</th><th>NWF</th><th>LNF</th><th>Math</th><th>MN</th><th>QD</th></tr></thead><tbody>'+allRows+'</tbody></table>'+
        '<div style="margin-top:4px;font-size:9px;color:#94a3b8">Color: <span style="color:#16a34a;font-weight:700">green</span>=at/above, <span style="color:#d97706;font-weight:700">amber</span>=below, <span style="color:#dc2626;font-weight:700">red</span>=well below benchmark</div>'+
        (tier3.length>0?'<h2>\uD83D\uDD34 Priority Students (Tier 3)</h2>'+tier3.map(function(s){return'<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:8px 12px;margin:4px 0"><strong style="color:#991b1b">'+s.name+'</strong><span style="font-size:10px;color:#7f1d1d;margin-left:8px">'+s.tier.reasons.slice(0,2).join('; ')+'</span></div>';}).join(''):'')+
        '<h2>Notes</h2><div style="border:1px solid #e2e8f0;border-radius:8px;min-height:60px;padding:8px"></div>'+
        '<div class="footer"><p>AlloFlow Assessment Center &bull; '+dateStr+'</p><p>Norms: Hasbrouck & Tindal (2017), DIBELS 8th Ed.</p></div></body></html>';
      var w=window.open('','_blank'); if(w){w.document.write(html);w.document.close();w.print();}
    };

    const classifyScreeningRisk = results => {
      if (!results || results.length === 0) return {
        tier: 0,
        label: 'No Data',
        color: '#94a3b8',
        bg: '#f1f5f9',
        border: '#e2e8f0',
        emoji: '⚪',
        avgAccuracy: 0,
        reasons: []
      };
      const avgAccuracy = Math.round(results.reduce((s, r) => s + (r.accuracy || 0), 0) / results.length);
      const reasons = [];
      let tier = 1;
      if (avgAccuracy < 60) {
        tier = 3;
        reasons.push('Composite accuracy ' + avgAccuracy + '% — intensive support needed');
      } else if (avgAccuracy < 80) {
        tier = 2;
        reasons.push('Composite accuracy ' + avgAccuracy + '% — strategic support recommended');
      } else {
        reasons.push('Composite accuracy ' + avgAccuracy + '% — on track');
      }
      results.forEach(r => {
        if (r.accuracy < 50) {
          tier = Math.max(tier, 3);
          reasons.push((r.activity || 'Subtest') + ' critically low (' + r.accuracy + '%)');
        }
      });
      const labels = {
        1: {
          label: 'Low Risk',
          color: '#16a34a',
          bg: '#dcfce7',
          border: '#86efac',
          emoji: '🟢'
        },
        2: {
          label: 'Some Risk',
          color: '#d97706',
          bg: '#fef9c3',
          border: '#fcd34d',
          emoji: '🟡'
        },
        3: {
          label: 'At Risk',
          color: '#dc2626',
          bg: '#fee2e2',
          border: '#fca5a5',
          emoji: '🔴'
        }
      };
      return {
        tier,
        avgAccuracy,
        reasons,
        ...labels[tier]
      };
    };
    const exportScreeningCSV = () => {
      const rows = [['Student', 'Grade', 'Form', 'Date', 'Subtest', 'Correct', 'Total', 'Accuracy%', 'Items/min', 'Risk Level']];
      importedStudents.forEach(s => {
        (s.screeningHistory || []).forEach(h => {
          const risk = h.accuracy >= 80 ? 'Low' : h.accuracy >= 60 ? 'Some' : 'At Risk';
          rows.push([s.nickname || s.name, h.grade || '', h.form || '', h.timestamp ? new Date(h.timestamp).toLocaleDateString() : '', h.activity || '', h.correct || 0, h.total || 0, h.accuracy || 0, h.itemsPerMin || 0, risk]);
        });
      });
      const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
      const blob = new Blob([csv], {
        type: 'text/csv'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'screening_results_' + new Date().toISOString().slice(0, 10) + '.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast('Screening CSV exported', 'success');
    };
    const generateRTICSV = () => {
      if (!importedStudents || importedStudents.length === 0) return;
      const headers = ['Student', 'Date', 'RTI Tier', 'Quiz Avg', 'WS Accuracy', 'WS Words', 'Fluency WCPM', 'Games Played', 'Total Activities', 'Label Challenge Avg', 'Time on Task (min)', 'Recommendations'];
      const rows = importedStudents.map(s => {
        const rti = classifyRTITier(s.stats);
        const tot = s.data?.timeOnTask?.totalSessionMinutes || 0;
        return [s.name, new Date().toLocaleDateString(), 'Tier ' + rti.tier, s.stats.quizAvg + '%', s.stats.wsAccuracy + '%', s.stats.wsWordsCompleted, s.stats.fluencyWCPM, s.stats.gamesPlayed, s.stats.totalActivities, s.stats.labelChallengeAvg + '%', Math.round(tot), '"' + rti.recommendations.join('; ').replace(/"/g, "'") + '"'].join(',');
      });
      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], {
        type: 'text/csv;charset=utf-8;'
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `RTI_Report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    };
    const exportFluencyCSV = () => {
      const fluencyRecords = history.filter(h => h.type === 'fluency-record' && h.data?.metrics);
      if (fluencyRecords.length === 0) {
        addToast('No fluency assessments to export', 'warning');
        return;
      }
      const headers = ['Date', 'Passage', 'WCPM', 'Accuracy %', 'Total Words', 'Duration (s)', 'Substitutions', 'Omissions', 'Insertions', 'Self-Corrections', 'Error Rate', 'Reading Level'];
      const rows = fluencyRecords.map(r => {
        const m = r.data.metrics;
        const rrm = r.data.wordData ? (calculateRunningRecordMetrics(r.data.wordData, r.data.fullAnalysis?.insertions || []) || {
          substitutions: 0,
          omissions: 0,
          insertions: 0,
          selfCorrections: 0,
          errorRate: 0,
          readingLevel: 'unknown'
        }) : { substitutions: 0, omissions: 0, insertions: 0, selfCorrections: 0, errorRate: 0, readingLevel: 'unknown' };
        const passageTitle = (r.data.sourceText || '').substring(0, 40).replace(/[\n\r,]/g, ' ').trim() || 'Untitled';
        return [new Date(r.timestamp).toLocaleDateString(), '"' + passageTitle + '"', m.wcpm || 0, m.accuracy || 0, m.totalWords || 0, Math.round(m.durationSeconds || 0), rrm.substitutions || 0, rrm.omissions || 0, rrm.insertions || 0, rrm.selfCorrections || 0, '1:' + (rrm.errorRate || 0), rrm.readingLevel || 'unknown'].join(',');
      });
      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], {
        type: 'text/csv;charset=utf-8;'
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'Fluency_Assessments_' + new Date().toISOString().split('T')[0] + '.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    };
    const renderInsightsPanel = studentName => {
      const insights = generateStudentInsights(studentName);
      if (insights.insufficient) {
        return React.createElement('div', {
          className: 'mt-4 p-4 bg-slate-50 rounded-xl border border-slate-400 text-center'
        }, React.createElement('p', {
          className: 'text-sm text-slate-600'
        }, '\u{1F4CA} Need at least 2 progress snapshots to generate insights. Currently: ' + insights.snapshots + ' snapshot(s), ' + insights.probes + ' probe(s).'), React.createElement('p', {
          className: 'text-xs text-slate-600 mt-1'
        }, 'Import student data at different time points to build a longitudinal profile.'));
      }
      const strengthColor = {
        strong: 'text-emerald-600',
        moderate: 'text-amber-600',
        weak: 'text-red-500'
      };
      const domainColors = {
        phonologicalAwareness: 'bg-blue-500',
        comprehension: 'bg-purple-500',
        fluency: 'bg-emerald-500'
      };
      const maxVal = Math.max(...Object.values(insights.profile), 1);
      return React.createElement('div', {
        className: 'mt-4 space-y-4'
      }, React.createElement('div', {
        className: 'flex items-center gap-2 mb-2'
      }, React.createElement('span', {
        className: 'text-lg'
      }, '\u{1F4CA}'), React.createElement('h4', {
        className: 'text-sm font-bold text-slate-700 uppercase tracking-wider'
      }, 'Practice-to-Outcome Insights'), React.createElement('span', {
        className: 'text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-medium'
      }, insights.snapshots + ' snapshots')), React.createElement('div', {
        className: 'bg-white rounded-xl border border-slate-400 p-4'
      }, React.createElement('h5', {
        className: 'text-xs font-bold text-slate-600 uppercase mb-3'
      }, 'Domain Profile'), React.createElement('div', {
        className: 'space-y-2'
      }, ...Object.entries(insights.profile).map(([domain, value]) => React.createElement('div', {
        key: domain,
        className: 'flex items-center gap-2'
      }, React.createElement('span', {
        className: 'text-xs text-slate-600 w-36 shrink-0 font-medium'
      }, DOMAIN_LABELS[domain] || domain), React.createElement('div', {
        className: 'flex-1 bg-slate-100 rounded-full h-5 overflow-hidden'
      }, React.createElement('div', {
        className: (domainColors[domain] || 'bg-slate-400') + ' h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2',
        style: {
          width: Math.max(8, value / Math.max(maxVal, 100) * 100) + '%'
        }
      }, React.createElement('span', {
        className: 'text-[11px] font-bold text-white'
      }, Math.round(value)))), domain === insights.strength ? React.createElement('span', {
        className: 'text-xs text-emerald-600 font-bold'
      }, '⭐') : null, domain === insights.weakness ? React.createElement('span', {
        className: 'text-xs text-amber-500 font-bold'
      }, '⚠️') : null))), insights.strength && insights.weakness ? React.createElement('div', {
        className: 'mt-3 flex gap-4 text-xs'
      }, React.createElement('span', {
        className: 'text-emerald-600'
      }, '⭐ Strength: ' + (DOMAIN_LABELS[insights.strength] || insights.strength)), React.createElement('span', {
        className: 'text-amber-600'
      }, '⚠️ Watch: ' + (DOMAIN_LABELS[insights.weakness] || insights.weakness))) : null), React.createElement('div', {
        className: 'bg-white rounded-xl border border-slate-400 p-4'
      }, React.createElement('h5', {
        className: 'text-xs font-bold text-slate-600 uppercase mb-3'
      }, 'Growth Since First Snapshot'), React.createElement('div', {
        className: 'grid grid-cols-3 gap-3'
      }, ...[['Word Sounds', insights.growth.wsAccuracy, '%'], ['Comprehension', insights.growth.quizAvg, '%'], ['Fluency', insights.growth.fluencyWCPM, ' WCPM']].map(([label, val, unit]) => React.createElement('div', {
        key: label,
        className: 'text-center p-2 rounded-lg ' + (val > 0 ? 'bg-emerald-50' : val < 0 ? 'bg-red-50' : 'bg-slate-50')
      }, React.createElement('div', {
        className: 'text-lg font-black ' + (val > 0 ? 'text-emerald-600' : val < 0 ? 'text-red-500' : 'text-slate-600')
      }, (val > 0 ? '+' : '') + Math.round(val) + unit), React.createElement('div', {
        className: 'text-[11px] text-slate-600 mt-0.5'
      }, label))))), insights.correlations.practiceToQuiz && !insights.correlations.practiceToQuiz.insufficient ? React.createElement('div', {
        className: 'bg-white rounded-xl border border-slate-400 p-4'
      }, React.createElement('h5', {
        className: 'text-xs font-bold text-slate-600 uppercase mb-2'
      }, 'Practice ↔ Outcome Correlation'), React.createElement('div', {
        className: 'flex items-center gap-3'
      }, React.createElement('div', {
        className: 'text-2xl font-black ' + (strengthColor[insights.correlations.practiceToQuiz.strength] || 'text-slate-600')
      }, 'r = ' + insights.correlations.practiceToQuiz.r), React.createElement('div', null, React.createElement('div', {
        className: 'text-xs font-bold ' + (strengthColor[insights.correlations.practiceToQuiz.strength] || '')
      }, insights.correlations.practiceToQuiz.strength.charAt(0).toUpperCase() + insights.correlations.practiceToQuiz.strength.slice(1) + ' correlation'), React.createElement('div', {
        className: 'text-[11px] text-slate-600'
      }, 'Based on ' + insights.correlations.practiceToQuiz.n + ' data points (Word Sounds accuracy ↔ Quiz performance)')))) : null, insights.growthTrajectory.length > 1 ? React.createElement('div', {
        className: 'bg-white rounded-xl border border-slate-400 p-4'
      }, React.createElement('h5', {
        className: 'text-xs font-bold text-slate-600 uppercase mb-2'
      }, 'Growth Trajectory'), React.createElement('div', {
        className: 'overflow-x-auto'
      }, React.createElement('table', {
        className: 'w-full text-xs'
      }, React.createElement('thead', null, React.createElement('tr', {
        className: 'border-b border-slate-200'
      }, React.createElement('th', {
        className: 'text-left py-1.5 text-slate-600 font-medium'
      }, 'Date'), React.createElement('th', {
        className: 'text-right py-1.5 text-blue-600 font-medium'
      }, 'Word Sounds'), React.createElement('th', {
        className: 'text-right py-1.5 text-purple-600 font-medium'
      }, 'Quiz Avg'), React.createElement('th', {
        className: 'text-right py-1.5 text-emerald-600 font-medium'
      }, 'Fluency'))), React.createElement('tbody', null, ...insights.growthTrajectory.map((row, idx) => React.createElement('tr', {
        key: idx,
        className: idx % 2 === 0 ? 'bg-slate-50/50' : ''
      }, React.createElement('td', {
        className: 'py-1.5 text-slate-600'
      }, row.date), React.createElement('td', {
        className: 'py-1.5 text-right font-medium text-blue-700'
      }, Math.round(row.wsAccuracy) + '%'), React.createElement('td', {
        className: 'py-1.5 text-right font-medium text-purple-700'
      }, Math.round(row.quizAvg) + '%'), React.createElement('td', {
        className: 'py-1.5 text-right font-medium text-emerald-700'
      }, Math.round(row.fluencyWCPM)))))))) : null, insights.dosage.totalInterventions > 0 ? React.createElement('div', {
        className: 'bg-white rounded-xl border border-slate-400 p-4'
      }, React.createElement('h5', {
        className: 'text-xs font-bold text-slate-600 uppercase mb-2'
      }, 'Intervention Dosage'), React.createElement('div', {
        className: 'grid grid-cols-3 gap-3 text-center'
      }, React.createElement('div', null, React.createElement('div', {
        className: 'text-lg font-black text-indigo-600'
      }, insights.dosage.totalInterventions), React.createElement('div', {
        className: 'text-[11px] text-slate-600'
      }, 'Interventions')), React.createElement('div', null, React.createElement('div', {
        className: 'text-lg font-black text-indigo-600'
      }, insights.dosage.avgFrequency + 'x/wk'), React.createElement('div', {
        className: 'text-[11px] text-slate-600'
      }, 'Avg Frequency')), React.createElement('div', null, React.createElement('div', {
        className: 'text-lg font-black text-indigo-600'
      }, insights.dosage.avgMinutes + ' min'), React.createElement('div', {
        className: 'text-[11px] text-slate-600'
      }, 'Avg Duration')))) : null);
    };
    const renderClassInsights = () => {
      const classData = generateClassInsights();
      if (!classData) return React.createElement('div', {
        className: 'mt-4 p-4 bg-slate-50 rounded-xl border border-slate-400 text-center'
      }, React.createElement('p', {
        className: 'text-sm text-slate-600'
      }, '\u{1F4CA} Import student data with multiple snapshots to see class-wide insights.'));
      return React.createElement('div', {
        className: 'mt-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-4'
      }, React.createElement('div', {
        className: 'flex items-center gap-2 mb-3'
      }, React.createElement('span', {
        className: 'text-lg'
      }, '\u{1F3EB}'), React.createElement('h4', {
        className: 'text-sm font-bold text-indigo-800 uppercase tracking-wider'
      }, 'Class-Wide Analysis'), React.createElement('span', {
        className: 'text-xs bg-indigo-200 text-indigo-700 px-2 py-0.5 rounded-full font-medium'
      }, classData.studentCount + ' students')), React.createElement('div', {
        className: 'grid grid-cols-2 gap-3'
      }, classData.avgCorrelation !== null ? React.createElement('div', {
        className: 'bg-white rounded-lg p-3 text-center'
      }, React.createElement('div', {
        className: 'text-xl font-black text-indigo-600'
      }, 'r = ' + classData.avgCorrelation), React.createElement('div', {
        className: 'text-[11px] text-slate-600'
      }, 'Avg Practice↔Outcome Correlation')) : null, classData.commonWeakness ? React.createElement('div', {
        className: 'bg-white rounded-lg p-3 text-center'
      }, React.createElement('div', {
        className: 'text-xl font-black text-amber-600'
      }, DOMAIN_LABELS[classData.commonWeakness] || classData.commonWeakness), React.createElement('div', {
        className: 'text-[11px] text-slate-600'
      }, 'Most Common Area to Watch (' + classData.commonWeaknessCount + ' students)')) : null));
    };
    const exportResearchCSV = () => {
      const students = importedStudents.map(s => {
        const insights = generateStudentInsights(s.name);
        const probes = probeHistory?.[s.name] || [];
        const interventions = interventionLogs?.[s.name] || [];
        const snapshots = rosterKey?.progressHistory?.[s.name] || [];
        return {
          name: s.name,
          insights,
          probes,
          interventions,
          snapshots,
          stats: s.stats
        };
      });
      const headers = ['Student', 'Snapshots', 'Probes', 'Latest_WS_Accuracy', 'Latest_Quiz_Avg', 'Latest_Fluency_WCPM', 'Growth_WS_Accuracy', 'Growth_Quiz', 'Growth_Fluency', 'Strength', 'Weakness', 'Correlation_r', 'Correlation_Strength', 'Correlation_N', 'Intervention_Count', 'Avg_Frequency_PerWeek', 'Avg_Minutes', 'Total_Activities', 'Games_Played', 'Adventure_XP', 'Probe_1_Activity', 'Probe_1_Accuracy', 'Probe_1_ItemsPerMin', 'Probe_1_Date', 'Probe_2_Activity', 'Probe_2_Accuracy', 'Probe_2_ItemsPerMin', 'Probe_2_Date', 'Probe_3_Activity', 'Probe_3_Accuracy', 'Probe_3_ItemsPerMin', 'Probe_3_Date', 'External_CBM_Source', 'External_CBM_Score', 'External_CBM_Date'];
      const rows = students.map(s => {
        const ins = s.insights;
        const ext = (externalCBMScores?.[s.name] || [])[0] || {};
        const p1 = s.probes[0] || {},
          p2 = s.probes[1] || {},
          p3 = s.probes[2] || {};
        return [s.name, ins.snapshots || 0, ins.probes || 0, ins.profile?.phonologicalAwareness || 0, ins.profile?.comprehension || 0, ins.profile?.fluency || 0, ins.growth?.wsAccuracy || 0, ins.growth?.quizAvg || 0, ins.growth?.fluencyWCPM || 0, ins.strength || '', ins.weakness || '', ins.correlations?.practiceToQuiz?.r ?? '', ins.correlations?.practiceToQuiz?.strength || '', ins.correlations?.practiceToQuiz?.n || '', ins.dosage?.totalInterventions || 0, ins.dosage?.avgFrequency || 0, ins.dosage?.avgMinutes || 0, s.stats?.totalActivities || 0, s.stats?.gamesPlayed || 0, s.stats?.adventureXP || 0, p1.activity || '', p1.accuracy || '', p1.itemsPerMin || '', p1.date || '', p2.activity || '', p2.accuracy || '', p2.itemsPerMin || '', p2.date || '', p3.activity || '', p3.accuracy || '', p3.itemsPerMin || '', p3.date || '', ext.source || '', ext.score || '', ext.date || ''].map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',');
      });
      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], {
        type: 'text/csv'
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'AlloFlow_Research_Export_' + new Date().toISOString().split('T')[0] + '.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      addToast && addToast('Research CSV exported with ' + students.length + ' students', 'success');
    };
    // ── Session-level CSV export (fidelity log data) ──
    const exportSessionLogCSV = () => {
      var log;
      try { log = JSON.parse(localStorage.getItem('alloflow_fidelity_log') || '[]'); } catch { log = []; }
      if (!log.length) { addToast && addToast('No session log data to export', 'info'); return; }
      var headers = ['Date', 'Weekday', 'Student', 'Activity', 'Duration_Minutes', 'Study_Name'];
      var rows = log.map(function(s) {
        var d = s.date ? new Date(s.date) : new Date();
        var weekday = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getDay()] || '';
        return [
          s.date || d.toISOString(),
          weekday,
          '"' + String(s.student || '').replace(/"/g, '""') + '"',
          '"' + String(s.activity || '').replace(/"/g, '""') + '"',
          s.duration || '',
          '"' + String(s.researchStudy || '').replace(/"/g, '""') + '"'
        ].join(',');
      });
      var csv = [headers.join(',')].concat(rows).join('\n');
      var blob = new Blob([csv], { type: 'text/csv' });
      var link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'AlloFlow_Session_Log_' + new Date().toISOString().split('T')[0] + '.csv';
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      addToast && addToast('Session log exported (' + log.length + ' sessions)', 'success');
    };

    // ── Survey responses CSV export (with timepoints) ──
    const exportSurveyCSV = () => {
      var allResponses = [];
      Object.keys(surveyResponses).forEach(function(key) {
        var entries = surveyResponses[key] || [];
        entries.forEach(function(entry) {
          allResponses.push(entry);
        });
      });
      if (!allResponses.length) { addToast && addToast('No survey responses to export', 'info'); return; }
      var headers = ['Timestamp', 'Type', 'Respondent', 'Timepoint', 'Study_Name'];
      var questionIds = new Set();
      allResponses.forEach(function(r) {
        Object.keys(r).forEach(function(k) {
          if (!['timestamp','type','respondent','timepoint','studyName'].includes(k)) questionIds.add(k);
        });
      });
      var qids = Array.from(questionIds).sort();
      headers = headers.concat(qids);
      var rows = allResponses.map(function(r) {
        var base = [
          r.timestamp || '',
          r.type || '',
          '"' + String(r.respondent || '').replace(/"/g, '""') + '"',
          r.timepoint || 'unspecified',
          '"' + String(r.studyName || '').replace(/"/g, '""') + '"'
        ];
        var answers = qids.map(function(q) { return r[q] !== undefined ? r[q] : ''; });
        return base.concat(answers).join(',');
      });
      var csv = [headers.join(',')].concat(rows).join('\n');
      var blob = new Blob([csv], { type: 'text/csv' });
      var link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'AlloFlow_Survey_Responses_' + new Date().toISOString().split('T')[0] + '.csv';
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      addToast && addToast('Survey responses exported (' + allResponses.length + ' responses)', 'success');
    };

    const [externalCBMScores, setExternalCBMScores] = React.useState(() => {
      try {
        return JSON.parse(localStorage.getItem('alloflow_external_cbm') || '{}');
      } catch {
        return {};
      }
    });
    const saveExternalCBM = (studentName, entry) => {
      const existing = externalCBMScores[studentName] || [];
      const updated = {
        ...externalCBMScores,
        [studentName]: [...existing, {
          ...entry,
          id: Date.now()
        }]
      };
      setExternalCBMScores(updated);
      try {
        localStorage.setItem('alloflow_external_cbm', JSON.stringify(updated));
      } catch {}
    };
    const [showCBMModal, setShowCBMModal] = React.useState(false);
    const [cbmForm, setCBMForm] = React.useState({
      student: '',
      source: 'DIBELS',
      measure: '',
      score: '',
      date: '',
      percentile: '',
      benchmark: ''
    });
    const renderCBMImportModal = () => {
      if (!showCBMModal) return null;
      const sources = ['DIBELS', 'AIMSweb', 'easyCBM', 'STAR', 'MAP', 'Other'];
      const measures = {
        DIBELS: ['ORF', 'NWF-CLS', 'NWF-WWR', 'PSF', 'LNF', 'Composite'],
        AIMSweb: ['R-CBM', 'MAZE', 'TEL', 'NWF'],
        easyCBM: ['Passage Reading Fluency', 'Word Reading', 'Letter Names'],
        STAR: ['Scaled Score', 'Percentile Rank'],
        MAP: ['RIT Score', 'Percentile'],
        Other: ['Custom']
      };
      return React.createElement('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },
        className: 'fixed inset-0 z-[300] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200'
      }, React.createElement('div', {
        className: 'bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full border-2 border-indigo-200',
        onClick: e => e.stopPropagation()
      }, React.createElement('h3', {
        className: 'text-lg font-black text-slate-800 mb-4 flex items-center gap-2'
      }, React.createElement('span', null, '\u{1F4CB}'), 'Import External CBM Score'), React.createElement('div', {
        className: 'space-y-3'
      }, React.createElement('div', null, React.createElement('label', {
        className: 'text-xs font-bold text-slate-600 uppercase'
      }, 'Student'), React.createElement('select', {
        'aria-label': 'Select student',
        className: 'w-full mt-1 px-3 py-2 border border-slate-400 rounded-lg text-sm',
        value: cbmForm.student,
        onChange: e => setCBMForm(p => ({
          ...p,
          student: e.target.value
        }))
      }, React.createElement('option', {
        value: ''
      }, '-- Select Student --'), ...importedStudents.map(s => React.createElement('option', {
        key: s.id,
        value: s.name
      }, s.name)))), React.createElement('div', null, React.createElement('label', {
        className: 'text-xs font-bold text-slate-600 uppercase'
      }, 'CBM Source'), React.createElement('select', {
        'aria-label': 'CBM source',
        className: 'w-full mt-1 px-3 py-2 border border-slate-400 rounded-lg text-sm',
        value: cbmForm.source,
        onChange: e => setCBMForm(p => ({
          ...p,
          source: e.target.value,
          measure: ''
        }))
      }, ...sources.map(s => React.createElement('option', {
        key: s,
        value: s
      }, s)))), React.createElement('div', null, React.createElement('label', {
        className: 'text-xs font-bold text-slate-600 uppercase'
      }, 'Measure'), React.createElement('select', {
        'aria-label': 'CBM measure',
        className: 'w-full mt-1 px-3 py-2 border border-slate-400 rounded-lg text-sm',
        value: cbmForm.measure,
        onChange: e => setCBMForm(p => ({
          ...p,
          measure: e.target.value
        }))
      }, React.createElement('option', {
        value: ''
      }, '-- Select Measure --'), ...(measures[cbmForm.source] || []).map(m => React.createElement('option', {
        key: m,
        value: m
      }, m)))), React.createElement('div', {
        className: 'grid grid-cols-2 gap-3'
      }, React.createElement('div', null, React.createElement('label', {
        className: 'text-xs font-bold text-slate-600 uppercase'
      }, 'Score'), React.createElement('input', {
        'aria-label': 'CBM score',
        type: 'number',
        className: 'w-full mt-1 px-3 py-2 border border-slate-400 rounded-lg text-sm',
        value: cbmForm.score,
        onChange: e => setCBMForm(p => ({
          ...p,
          score: e.target.value
        })),
        placeholder: 'e.g. 72'
      })), React.createElement('div', null, React.createElement('label', {
        className: 'text-xs font-bold text-slate-600 uppercase'
      }, 'Date'), React.createElement('input', {
        'aria-label': 'CBM date',
        type: 'date',
        className: 'w-full mt-1 px-3 py-2 border border-slate-400 rounded-lg text-sm',
        value: cbmForm.date,
        onChange: e => setCBMForm(p => ({
          ...p,
          date: e.target.value
        }))
      }))), React.createElement('div', {
        className: 'grid grid-cols-2 gap-3'
      }, React.createElement('div', null, React.createElement('label', {
        className: 'text-xs font-bold text-slate-600 uppercase'
      }, 'Percentile (optional)'), React.createElement('input', {
        'aria-label': 'CBM percentile',
        type: 'number',
        className: 'w-full mt-1 px-3 py-2 border border-slate-400 rounded-lg text-sm',
        value: cbmForm.percentile,
        onChange: e => setCBMForm(p => ({
          ...p,
          percentile: e.target.value
        })),
        placeholder: 'e.g. 45'
      })), React.createElement('div', null, React.createElement('label', {
        className: 'text-xs font-bold text-slate-600 uppercase'
      }, 'Benchmark Status'), React.createElement('select', {
        'aria-label': 'Benchmark status',
        className: 'w-full mt-1 px-3 py-2 border border-slate-400 rounded-lg text-sm',
        value: cbmForm.benchmark,
        onChange: e => setCBMForm(p => ({
          ...p,
          benchmark: e.target.value
        }))
      }, React.createElement('option', {
        value: ''
      }, '-- Optional --'), React.createElement('option', {
        value: 'Above'
      }, 'Above Benchmark'), React.createElement('option', {
        value: 'At'
      }, 'At Benchmark'), React.createElement('option', {
        value: 'Below'
      }, 'Below Benchmark'), React.createElement('option', {
        value: 'Well Below'
      }, 'Well Below Benchmark'))))), React.createElement('div', {
        className: 'flex justify-end gap-2 mt-5'
      }, React.createElement('button', {
        className: 'px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors',
        onClick: () => {
          setShowCBMModal(false);
          setCBMForm({
            student: '',
            source: 'DIBELS',
            measure: '',
            score: '',
            date: '',
            percentile: '',
            benchmark: ''
          });
        }
      }, 'Cancel'), React.createElement('button', {
        className: 'px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-bold',
        disabled: !cbmForm.student || !cbmForm.score || !cbmForm.date,
        onClick: () => {
          saveExternalCBM(cbmForm.student, {
            source: cbmForm.source,
            measure: cbmForm.measure,
            score: parseFloat(cbmForm.score),
            date: cbmForm.date,
            percentile: cbmForm.percentile ? parseInt(cbmForm.percentile) : null,
            benchmark: cbmForm.benchmark || null
          });
          setShowCBMModal(false);
          setCBMForm({
            student: '',
            source: 'DIBELS',
            measure: '',
            score: '',
            date: '',
            percentile: '',
            benchmark: ''
          });
        }
      }, 'Save Score'))));
    };
    const [surveyResponses, setSurveyResponses] = React.useState(() => {
      try {
        return JSON.parse(localStorage.getItem('alloflow_survey_responses') || '{}');
      } catch {
        return {};
      }
    });
    const saveSurveyResponse = (type, respondent, responses) => {
      const key = type + '_' + respondent;
      const existing = surveyResponses[key] || [];
      const updated = {
        ...surveyResponses,
        [key]: [...existing, {
          ...responses,
          timestamp: new Date().toISOString(),
          type,
          respondent,
          timepoint: surveyTimepoint || 'unspecified',
          studyName: (researchMode && researchMode.studyName) || 'No active study'
        }]
      };
      setSurveyResponses(updated);
      try {
        localStorage.setItem('alloflow_survey_responses', JSON.stringify(updated));
      } catch {}
    };
    const [surveyAnswers, setSurveyAnswers] = React.useState({});
    const [surveyRespondent, setSurveyRespondent] = React.useState('');
    const [surveyTimepoint, setSurveyTimepoint] = React.useState('pre');
    const SURVEY_QUESTIONS = {
      student: [{
        id: 'engagement',
        text: 'How fun was this activity?',
        labels: ['\u{1F61E}', '\u{1F610}', '\u{1F642}', '\u{1F604}', '\u{1F929}']
      }, {
        id: 'difficulty',
        text: 'How hard was this for you?',
        labels: ['Too Easy', 'Easy', 'Just Right', 'Hard', 'Too Hard']
      }, {
        id: 'improvement',
        text: 'Do you feel like you are getting better at reading?',
        labels: ['Not at all', 'A little', 'Some', 'A lot', 'Definitely!']
      }, {
        id: 'confidence',
        text: 'How confident do you feel about reading new words?',
        labels: ['\u{1F61F}', '\u{1F914}', '\u{1F642}', '\u{1F60A}', '\u{1F4AA}']
      }, {
        id: 'helpfulness',
        text: 'Did the app help you learn something new today?',
        labels: ['No', 'A little', 'Maybe', 'Yes', 'A lot!']
      }, {
        id: 'perceived_usefulness',
        text: 'AlloFlow helps me get better at reading and math',
        labels: ['No way', 'Not really', 'Maybe', 'Yes', 'Definitely!']
      }, {
        id: 'ease_of_use',
        text: 'AlloFlow is easy to use',
        labels: ['Very Hard', 'Hard', 'OK', 'Easy', 'Very Easy']
      }, {
        id: 'intention',
        text: 'I want to keep using AlloFlow',
        labels: ['No', 'Probably not', 'Maybe', 'Yes', 'Definitely!']
      }],
      teacher: [{
        id: 'alignment',
        text: 'How well does this student\'s AlloFlow performance match your classroom observations?',
        labels: ['Not at all', 'Slightly', 'Moderately', 'Well', 'Very well']
      }, {
        id: 'dataUsefulness',
        text: 'How useful is the progress monitoring data for instructional decisions?',
        labels: ['Not useful', 'Slightly', 'Moderately', 'Very', 'Extremely']
      }, {
        id: 'recommendation',
        text: 'Has the intervention data changed your instructional approach?',
        labels: ['No change', 'Slightly', 'Somewhat', 'Significantly', 'Completely']
      }, {
        id: 'efficiency',
        text: 'How much time does AlloFlow save compared to traditional assessment?',
        labels: ['None', 'A little', 'Some', 'A lot', 'Significant']
      }, {
        id: 'satisfaction',
        text: 'Overall, how satisfied are you with AlloFlow as an RTI tool?',
        labels: ['Very dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very satisfied']
      }, {
        id: 'perceived_usefulness',
        text: 'AlloFlow meaningfully improves student literacy outcomes',
        labels: ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree']
      }, {
        id: 'ease_of_use',
        text: 'AlloFlow integrates easily into my existing workflow',
        labels: ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree']
      }, {
        id: 'intention',
        text: 'I plan to continue using AlloFlow next school year',
        labels: ['Definitely not', 'Unlikely', 'Unsure', 'Likely', 'Definitely']
      }],
      parent: [{
        id: 'attitude',
        text: 'Has your child\'s attitude toward reading changed?',
        labels: ['Much worse', 'Worse', 'Same', 'Better', 'Much better']
      }, {
        id: 'homeUse',
        text: 'Does your child practice reading strategies at home?',
        labels: ['Never', 'Rarely', 'Sometimes', 'Often', 'Daily']
      }, {
        id: 'understanding',
        text: 'How well do you understand your child\'s reading progress?',
        labels: ['Not at all', 'A little', 'Somewhat', 'Well', 'Very well']
      }, {
        id: 'communication',
        text: 'Do you feel informed about your child\'s intervention plan?',
        labels: ['Not at all', 'Slightly', 'Moderately', 'Well', 'Very well']
      }, {
        id: 'satisfaction',
        text: 'How satisfied are you with the support your child is receiving?',
        labels: ['Very dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very satisfied']
      }, {
        id: 'perceived_usefulness',
        text: 'AlloFlow has been helpful for my child\'s learning',
        labels: ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree']
      }, {
        id: 'intention',
        text: 'I would recommend AlloFlow to other parents',
        labels: ['Definitely not', 'Unlikely', 'Unsure', 'Likely', 'Definitely']
      }]
    };
    const renderSurveyModal = () => {
      if (!showSurveyModal) return null;
      const questions = SURVEY_QUESTIONS[showSurveyModal] || [];
      const typeLabel = showSurveyModal.charAt(0).toUpperCase() + showSurveyModal.slice(1);
      const allAnswered = questions.every(q => surveyAnswers[q.id] !== undefined);
      return React.createElement('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },
        className: 'fixed inset-0 z-[300] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200'
      }, React.createElement('div', {
        className: 'bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full border-2 border-purple-200 max-h-[85vh] overflow-y-auto',
        onClick: e => e.stopPropagation()
      }, React.createElement('h3', {
        className: 'text-lg font-black text-slate-800 mb-1 flex items-center gap-2'
      }, React.createElement('span', null, '\u{1F4DD}'), typeLabel + ' Survey'), React.createElement('p', {
        className: 'text-xs text-slate-600 mb-4'
      }, 'Rate each item on a scale of 1-5. Your responses help us improve.'), React.createElement('div', {
        className: 'mb-4'
      }, React.createElement('label', {
        className: 'text-xs font-bold text-slate-600 uppercase'
      }, showSurveyModal === 'student' ? 'Student Name' : showSurveyModal === 'teacher' ? 'Teacher Name' : 'Parent/Guardian Name'), React.createElement('input', {
        'aria-label': 'Survey respondent name',
        type: 'text',
        className: 'w-full mt-1 px-3 py-2 border border-slate-400 rounded-lg text-sm',
        value: surveyRespondent,
        onChange: e => setSurveyRespondent(e.target.value),
        placeholder: 'Enter name...'
      })), React.createElement('div', {
        className: 'mb-4'
      }, React.createElement('label', {
        className: 'text-xs font-bold text-slate-600 uppercase'
      }, 'Survey Timepoint'), React.createElement('div', {
        className: 'flex gap-2 mt-1'
      }, ...['pre', 'mid', 'post'].map(tp => React.createElement('button', {
        key: tp,
        className: 'flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ' + (surveyTimepoint === tp ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border border-slate-400 text-slate-600 hover:bg-indigo-50'),
        onClick: () => setSurveyTimepoint(tp)
      }, tp === 'pre' ? 'Pre-Study' : tp === 'mid' ? 'Mid-Study' : 'Post-Study')))), React.createElement('div', {
        className: 'space-y-4'
      }, ...questions.map(q => React.createElement('div', {
        key: q.id,
        className: 'bg-slate-50 rounded-xl p-3'
      }, React.createElement('p', {
        className: 'text-sm font-medium text-slate-700 mb-2'
      }, q.text), React.createElement('div', {
        className: 'flex gap-1'
      }, ...q.labels.map((label, idx) => React.createElement('button', {
        key: idx,
        className: 'flex-1 py-2 px-1 rounded-lg text-xs font-medium transition-all ' + (surveyAnswers[q.id] === idx + 1 ? 'bg-purple-600 text-white shadow-md scale-105' : 'bg-white border border-slate-400 text-slate-600 hover:bg-purple-50 hover:border-purple-300'),
        onClick: () => setSurveyAnswers(p => ({
          ...p,
          [q.id]: idx + 1
        }))
      }, label)))))), React.createElement('div', {
        className: 'flex justify-end gap-2 mt-5'
      }, React.createElement('button', {
        className: 'px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors',
        onClick: () => {
          setShowSurveyModal(null);
          setSurveyAnswers({});
          setSurveyRespondent('');
        }
      }, 'Cancel'), React.createElement('button', {
        className: 'px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-bold disabled:opacity-50',
        disabled: !allAnswered || !surveyRespondent.trim(),
        onClick: () => {
          saveSurveyResponse(showSurveyModal, surveyRespondent.trim(), surveyAnswers);
          setShowSurveyModal(null);
          setSurveyAnswers({});
          setSurveyRespondent('');
          addToast && addToast(typeLabel + ' survey saved!', 'success');
        }
      }, 'Submit Survey'))));
    };
    const renderScatterPlot = studentName => {
      const snapshots = (rosterKey?.progressHistory?.[studentName] || []).filter(s => (s.wsAccuracy || 0) > 0 && (s.quizAvg || 0) > 0);
      if (snapshots.length < 2) return null;
      const W = 280,
        H = 180,
        PAD = 35;
      const xVals = snapshots.map(s => s.wsAccuracy || 0);
      const yVals = snapshots.map(s => s.quizAvg || 0);
      const xMin = Math.min(...xVals) - 5,
        xMax = Math.max(...xVals) + 5;
      const yMin = Math.min(...yVals) - 5,
        yMax = Math.max(...yVals) + 5;
      const xScale = v => PAD + (v - xMin) / (xMax - xMin || 1) * (W - PAD * 2);
      const yScale = v => H - PAD - (v - yMin) / (yMax - yMin || 1) * (H - PAD * 2);
      const n = xVals.length;
      const mx = xVals.reduce((s, v) => s + v, 0) / n;
      const my = yVals.reduce((s, v) => s + v, 0) / n;
      let num = 0,
        den = 0;
      for (let i = 0; i < n; i++) {
        num += (xVals[i] - mx) * (yVals[i] - my);
        den += (xVals[i] - mx) * (xVals[i] - mx);
      }
      const slope = den !== 0 ? num / den : 0;
      const intercept = my - slope * mx;
      const trendY1 = slope * xMin + intercept,
        trendY2 = slope * xMax + intercept;
      return React.createElement('div', {
        className: 'bg-white rounded-xl border border-slate-400 p-4 mt-4'
      }, React.createElement('h5', {
        className: 'text-xs font-bold text-slate-600 uppercase mb-2'
      }, 'Practice vs Outcome Scatter Plot'), React.createElement('svg', {
        viewBox: '0 0 ' + W + ' ' + H,
        className: 'w-full max-w-xs mx-auto',
        style: {
          overflow: 'visible'
        }
      }, ...[0, 25, 50, 75, 100].filter(v => v >= yMin && v <= yMax).map(v => React.createElement('line', {
        key: 'gy' + v,
        x1: PAD,
        x2: W - PAD,
        y1: yScale(v),
        y2: yScale(v),
        stroke: '#e2e8f0',
        strokeWidth: 0.5
      })), React.createElement('line', {
        x1: PAD,
        x2: W - PAD,
        y1: H - PAD,
        y2: H - PAD,
        stroke: '#94a3b8',
        strokeWidth: 1
      }), React.createElement('line', {
        x1: PAD,
        x2: PAD,
        y1: PAD,
        y2: H - PAD,
        stroke: '#94a3b8',
        strokeWidth: 1
      }), React.createElement('text', {
        x: W / 2,
        y: H - 5,
        textAnchor: 'middle',
        fontSize: 9,
        fill: '#64748b'
      }, 'Word Sounds Accuracy (%)'), React.createElement('text', {
        x: 8,
        y: H / 2,
        textAnchor: 'middle',
        fontSize: 9,
        fill: '#64748b',
        transform: 'rotate(-90, 8, ' + H / 2 + ')'
      }, 'Quiz Avg (%)'), React.createElement('line', {
        x1: xScale(xMin),
        y1: yScale(trendY1),
        x2: xScale(xMax),
        y2: yScale(trendY2),
        stroke: '#818cf8',
        strokeWidth: 1.5,
        strokeDasharray: '4 3',
        opacity: 0.7
      }), ...snapshots.map((s, idx) => React.createElement('circle', {
        key: idx,
        cx: xScale(s.wsAccuracy),
        cy: yScale(s.quizAvg),
        r: 5,
        fill: '#6366f1',
        stroke: '#fff',
        strokeWidth: 1.5,
        opacity: 0.85
      })), React.createElement('text', {
        x: PAD,
        y: H - PAD + 12,
        fontSize: 8,
        fill: '#94a3b8',
        textAnchor: 'middle'
      }, Math.round(xMin)), React.createElement('text', {
        x: W - PAD,
        y: H - PAD + 12,
        fontSize: 8,
        fill: '#94a3b8',
        textAnchor: 'middle'
      }, Math.round(xMax)), React.createElement('text', {
        x: PAD - 5,
        y: H - PAD,
        fontSize: 8,
        fill: '#94a3b8',
        textAnchor: 'end'
      }, Math.round(yMin)), React.createElement('text', {
        x: PAD - 5,
        y: PAD + 4,
        fontSize: 8,
        fill: '#94a3b8',
        textAnchor: 'end'
      }, Math.round(yMax))), React.createElement('p', {
        className: 'text-[11px] text-slate-600 text-center mt-1'
      }, 'Dashed line = trend (' + (slope > 0 ? 'positive' : slope < 0 ? 'negative' : 'flat') + '). ' + snapshots.length + ' data points.'));
    };
    const renderResearchToolbar = () => {
      const surveyCount = Object.values(surveyResponses).reduce((s, arr) => s + (Array.isArray(arr) ? arr.length : 0), 0);
      const cbmCount = Object.values(externalCBMScores).reduce((s, arr) => s + (Array.isArray(arr) ? arr.length : 0), 0);
      return React.createElement('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },
        className: 'mt-4 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-xl border border-indigo-200 p-3'
      }, React.createElement('div', {
        className: 'flex items-center gap-2 mb-2'
      }, React.createElement('span', {
        className: 'text-sm'
      }, '\u{1F52C}'), React.createElement('span', {
        className: 'text-xs font-bold text-indigo-800 uppercase tracking-wider'
      }, 'Research Tools')), React.createElement('div', {
        className: 'flex items-center justify-between mb-2 bg-white/60 rounded-lg px-3 py-1.5'
      }, React.createElement('div', {
        className: 'flex items-center gap-2'
      }, React.createElement('span', {
        className: 'text-xs font-medium text-slate-600'
      }, 'Research Mode'), researchMode && researchMode.active ? React.createElement('span', {
        className: 'flex items-center gap-1 bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full text-[11px] font-bold'
      }, React.createElement('span', {
        className: 'w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse'
      }), 'Active') : null), React.createElement('button', {
        className: 'px-3 py-1 rounded-lg text-xs font-bold transition-all ' + (researchMode && researchMode.active ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'),
        onClick: () => researchMode && researchMode.active ? toggleResearchMode(null) : setShowResearchSetup(true)
      }, researchMode && researchMode.active ? '\u{23F9} End Study' : '\u{1F52C} Start Study')), React.createElement('div', {
        className: 'grid grid-cols-2 gap-2'
      }, React.createElement('button', {
        className: 'flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-400 hover:border-indigo-400 hover:bg-indigo-50 transition-all text-xs font-medium text-slate-700',
        onClick: exportResearchCSV
      }, React.createElement('span', null, '\u{1F4C4}'), 'Export Research CSV'), React.createElement('button', {
        className: 'flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-400 hover:border-blue-400 hover:bg-blue-50 transition-all text-xs font-medium text-slate-700',
        onClick: exportSessionLogCSV
      }, React.createElement('span', null, '\u{1F4C5}'), 'Session Log CSV'), React.createElement('button', {
        className: 'flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-400 hover:border-violet-400 hover:bg-violet-50 transition-all text-xs font-medium text-slate-700',
        onClick: exportSurveyCSV
      }, React.createElement('span', null, '\u{1F4DD}'), 'Survey CSV'), React.createElement('button', {
        className: 'flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-400 hover:border-emerald-400 hover:bg-emerald-50 transition-all text-xs font-medium text-slate-700',
        onClick: () => setShowCBMModal(true)
      }, React.createElement('span', null, '\u{1F4CB}'), 'Import CBM Score', cbmCount > 0 ? React.createElement('span', {
        className: 'bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full text-[11px] font-bold'
      }, cbmCount) : null), React.createElement('button', {
        className: 'flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-400 hover:border-purple-400 hover:bg-purple-50 transition-all text-xs font-medium text-slate-700',
        onClick: () => setShowSurveyModal('student')
      }, React.createElement('span', null, '\u{1F9D2}'), 'Student Survey'), React.createElement('button', {
        className: 'flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-400 hover:border-blue-400 hover:bg-blue-50 transition-all text-xs font-medium text-slate-700',
        onClick: () => setShowSurveyModal('teacher')
      }, React.createElement('span', null, '\u{1F468}\u{200D}\u{1F3EB}'), 'Teacher Survey'), React.createElement('button', {
        className: 'col-span-2 flex items-center justify-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-400 hover:border-pink-400 hover:bg-pink-50 transition-all text-xs font-medium text-slate-700',
        onClick: () => setShowSurveyModal('parent')
      }, React.createElement('span', null, '\u{1F46A}'), 'Parent/Guardian Survey', surveyCount > 0 ? React.createElement('span', {
        className: 'bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full text-[11px] font-bold'
      }, surveyCount + ' responses') : null)));
    };
    const [researchMode, setResearchMode] = React.useState(() => {
      try {
        return JSON.parse(localStorage.getItem('alloflow_research_mode') || 'null');
      } catch {
        return null;
      }
    });
    const toggleResearchMode = settings => {
      const mode = settings || null;
      setResearchMode(mode);
      try {
        localStorage.setItem('alloflow_research_mode', JSON.stringify(mode));
      } catch {}
    };
    const [fidelityLog, setFidelityLog] = React.useState(() => {
      try {
        return JSON.parse(localStorage.getItem('alloflow_fidelity_log') || '[]');
      } catch {
        return [];
      }
    });
    const logSession = React.useCallback((studentName, activityType, durationMinutes) => {
      if (!researchMode || !researchMode.active) return;
      const entry = {
        id: Date.now(),
        student: studentName || 'Unknown',
        activity: activityType || 'general',
        duration: durationMinutes || 0,
        date: new Date().toISOString(),
        weekday: new Date().toLocaleDateString('en-US', {
          weekday: 'short'
        }),
        researchStudy: researchMode.studyName || 'Untitled Study'
      };
      setFidelityLog(prev => {
        const updated = [...prev, entry];
        try {
          localStorage.setItem('alloflow_fidelity_log', JSON.stringify(updated));
        } catch {}
        return updated;
      });
    }, [researchMode]);
    const [sessionCounter, setSessionCounter] = React.useState(() => {
      try {
        return parseInt(localStorage.getItem('alloflow_session_counter') || '0');
      } catch {
        return 0;
      }
    });
    const [showAutoSurveyPrompt, setShowAutoSurveyPrompt] = React.useState(false);
    const incrementSessionAndCheckSurvey = React.useCallback(() => {
      if (!researchMode || !researchMode.active) return;
      const newCount = sessionCounter + 1;
      setSessionCounter(newCount);
      try {
        localStorage.setItem('alloflow_session_counter', String(newCount));
      } catch {}
      const freq = parseInt(researchMode.surveyFrequency) || 5;
      if (newCount % freq === 0) {
        setShowAutoSurveyPrompt(true);
      }
    }, [researchMode, sessionCounter]);
    const [researchSetupForm, setResearchSetupForm] = React.useState({
      studyName: '',
      surveyFrequency: '5',
      irb: '',
      notes: ''
    });
    const renderResearchSetupModal = () => {
      if (!showResearchSetup) return null;
      return React.createElement('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },
        className: 'fixed inset-0 z-[300] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200'
      }, React.createElement('div', {
        className: 'bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full border-2 border-emerald-200',
        onClick: e => e.stopPropagation()
      }, React.createElement('h3', {
        className: 'text-lg font-black text-slate-800 mb-1 flex items-center gap-2'
      }, React.createElement('span', null, '\u{1F52C}'), 'Research Mode Setup'), React.createElement('p', {
        className: 'text-xs text-slate-600 mb-4'
      }, 'Configure research data collection. This enables auto-surveys, session fidelity logging, and study tracking.'), React.createElement('div', {
        className: 'space-y-3'
      }, React.createElement('div', null, React.createElement('label', {
        className: 'text-xs font-bold text-slate-600 uppercase'
      }, 'Study Name'), React.createElement('input', {
        'aria-label': 'Study name',
        type: 'text',
        className: 'w-full mt-1 px-3 py-2 border border-slate-400 rounded-lg text-sm',
        value: researchSetupForm.studyName,
        onChange: e => setResearchSetupForm(p => ({
          ...p,
          studyName: e.target.value
        })),
        placeholder: 'e.g. AlloFlow Pilot Study Spring 2026'
      })), React.createElement('div', null, React.createElement('label', {
        className: 'text-xs font-bold text-slate-600 uppercase'
      }, 'Auto-Survey Frequency'), React.createElement('select', {
        'aria-label': 'Auto-survey frequency',
        className: 'w-full mt-1 px-3 py-2 border border-slate-400 rounded-lg text-sm',
        value: researchSetupForm.surveyFrequency,
        onChange: e => setResearchSetupForm(p => ({
          ...p,
          surveyFrequency: e.target.value
        }))
      }, React.createElement('option', {
        value: '3'
      }, 'Every 3 sessions'), React.createElement('option', {
        value: '5'
      }, 'Every 5 sessions'), React.createElement('option', {
        value: '10'
      }, 'Every 10 sessions'), React.createElement('option', {
        value: '15'
      }, 'Every 15 sessions'), React.createElement('option', {
        value: '0'
      }, 'Never (manual only)'))), React.createElement('div', null, React.createElement('label', {
        className: 'text-xs font-bold text-slate-600 uppercase'
      }, 'IRB Number (optional)'), React.createElement('input', {
        'aria-label': 'IRB number',
        type: 'text',
        className: 'w-full mt-1 px-3 py-2 border border-slate-400 rounded-lg text-sm',
        value: researchSetupForm.irb,
        onChange: e => setResearchSetupForm(p => ({
          ...p,
          irb: e.target.value
        })),
        placeholder: 'e.g. IRB-2026-0042'
      })), React.createElement('div', null, React.createElement('label', {
        className: 'text-xs font-bold text-slate-600 uppercase'
      }, 'Notes'), React.createElement('textarea', {
        'aria-label': 'Research notes',
        className: 'w-full mt-1 px-3 py-2 border border-slate-400 rounded-lg text-sm resize-none',
        rows: 2,
        value: researchSetupForm.notes,
        onChange: e => setResearchSetupForm(p => ({
          ...p,
          notes: e.target.value
        })),
        placeholder: 'Any additional study notes...'
      }))), React.createElement('div', {
        className: 'flex justify-end gap-2 mt-5'
      }, React.createElement('button', {
        className: 'px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg',
        onClick: () => setShowResearchSetup(false)
      }, 'Cancel'), React.createElement('button', {
        className: 'px-4 py-2 text-sm bg-emerald-700 text-white rounded-lg hover:bg-emerald-700 font-bold',
        onClick: () => {
          toggleResearchMode({
            active: true,
            startDate: new Date().toISOString(),
            studyName: researchSetupForm.studyName || 'Untitled Study',
            surveyFrequency: researchSetupForm.surveyFrequency,
            irb: researchSetupForm.irb,
            notes: researchSetupForm.notes
          });
          setShowResearchSetup(false);
          setSessionCounter(0);
          try {
            localStorage.setItem('alloflow_session_counter', '0');
          } catch {}
          addToast && addToast('Research Mode activated!', 'success');
        }
      }, '\u{1F52C} Activate Research Mode'))));
    };
    const renderAutoSurveyPrompt = () => {
      if (!showAutoSurveyPrompt) return null;
      return React.createElement('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },
        className: 'fixed inset-0 z-[300] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200'
      }, React.createElement('div', {
        className: 'bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border-2 border-purple-200 text-center'
      }, React.createElement('div', {
        className: 'w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3'
      }, React.createElement('span', {
        className: 'text-3xl'
      }, '\u{1F4DD}')), React.createElement('h3', {
        className: 'text-lg font-black text-slate-800 mb-2'
      }, 'Quick Feedback Time!'), React.createElement('p', {
        className: 'text-sm text-slate-600 mb-4'
      }, 'You\'ve completed ' + sessionCounter + ' sessions. Would you like to share your feedback?'), React.createElement('div', {
        className: 'flex gap-2 justify-center'
      }, React.createElement('button', {
        className: 'px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg',
        onClick: () => setShowAutoSurveyPrompt(false)
      }, 'Skip'), React.createElement('button', {
        className: 'px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-bold',
        onClick: () => {
          setShowAutoSurveyPrompt(false);
          setShowSurveyModal('student');
        }
      }, '\u{1F4DD} Take Survey'))));
    };
    const renderResearchDashboard = () => {
      if (!researchMode || !researchMode.active) return null;
      const surveyCount = Object.values(surveyResponses).reduce((s, arr) => s + (Array.isArray(arr) ? arr.length : 0), 0);
      const cbmCount = Object.values(externalCBMScores).reduce((s, arr) => s + (Array.isArray(arr) ? arr.length : 0), 0);
      const totalProbes = Object.values(probeHistory).reduce((s, arr) => s + (Array.isArray(arr) ? arr.length : 0), 0);
      const studyStartDate = researchMode.startDate ? new Date(researchMode.startDate) : new Date();
      const daysSinceStart = Math.max(1, Math.round((Date.now() - studyStartDate) / (24 * 60 * 60 * 1000)));
      const weeksSinceStart = Math.max(1, Math.round(daysSinceStart / 7));
      const totalSessions = fidelityLog.length;
      const totalMinutes = fidelityLog.reduce((s, e) => s + (e.duration || 0), 0);
      const uniqueStudents = new Set(fidelityLog.map(e => e.student)).size;
      const sessionsPerWeek = totalSessions > 0 ? Math.round(totalSessions / weeksSinceStart * 10) / 10 : 0;
      const activityCounts = {};
      fidelityLog.forEach(e => {
        activityCounts[e.activity] = (activityCounts[e.activity] || 0) + 1;
      });
      const topActivity = Object.entries(activityCounts).sort((a, b) => b[1] - a[1])[0];
      const expectedSurveys = researchMode.surveyFrequency && researchMode.surveyFrequency !== '0' ? Math.floor(sessionCounter / parseInt(researchMode.surveyFrequency)) : 0;
      const studentSurveys = Object.entries(surveyResponses).filter(([k]) => k.startsWith('student_')).reduce((s, [, arr]) => s + arr.length, 0);
      const responseRate = expectedSurveys > 0 ? Math.round(studentSurveys / expectedSurveys * 100) : null;
      return React.createElement('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },
        className: 'mt-4 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 rounded-xl border-2 border-emerald-300 p-4'
      }, React.createElement('div', {
        className: 'flex items-center justify-between mb-3'
      }, React.createElement('div', {
        className: 'flex items-center gap-2'
      }, React.createElement('span', {
        className: 'text-lg'
      }, '\u{1F52C}'), React.createElement('h4', {
        className: 'text-sm font-bold text-emerald-800 uppercase tracking-wider'
      }, 'Research Dashboard'), React.createElement('span', {
        className: 'flex items-center gap-1 bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full text-[11px] font-bold animate-pulse'
      }, React.createElement('span', {
        className: 'w-1.5 h-1.5 bg-emerald-600 rounded-full'
      }), 'ACTIVE')), React.createElement('button', {
        className: 'text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors',
        onClick: () => {
          toggleResearchMode(null);
          addToast && addToast('Research Mode deactivated', 'info');
        }
      }, '\u{23F9} End Study')), React.createElement('div', {
        className: 'bg-white/70 rounded-lg p-3 mb-3'
      }, React.createElement('div', {
        className: 'text-sm font-bold text-slate-800'
      }, researchMode.studyName), React.createElement('div', {
        className: 'flex gap-4 text-[11px] text-slate-600 mt-1'
      }, React.createElement('span', null, '\u{1F4C5} Started: ' + studyStartDate.toLocaleDateString()), React.createElement('span', null, '\u{23F1} Day ' + daysSinceStart + ' (Week ' + weeksSinceStart + ')'), researchMode.irb ? React.createElement('span', null, '\u{1F4CB} IRB: ' + researchMode.irb) : null)), React.createElement('div', {
        className: 'grid grid-cols-4 gap-2 mb-3'
      }, ...[['\u{1F4CA}', totalSessions, 'Sessions Logged', 'bg-blue-50 text-blue-700'], ['\u{23F1}', Math.round(totalMinutes), 'Total Minutes', 'bg-purple-50 text-purple-700'], ['\u{1F9D1}', uniqueStudents, 'Students', 'bg-amber-50 text-amber-700'], ['\u{1F4C8}', sessionsPerWeek + '/wk', 'Frequency', 'bg-emerald-50 text-emerald-700']].map(([icon, value, label, cls]) => React.createElement('div', {
        key: label,
        className: 'text-center p-2 rounded-lg ' + cls
      }, React.createElement('div', {
        className: 'text-[11px]'
      }, icon), React.createElement('div', {
        className: 'text-lg font-black'
      }, value), React.createElement('div', {
        className: 'text-[11px] opacity-70'
      }, label)))), React.createElement('div', {
        className: 'grid grid-cols-3 gap-2 mb-3'
      }, ...[[surveyCount, 'Survey Responses', 'bg-purple-100 text-purple-700'], [totalProbes, 'Probe Results', 'bg-indigo-100 text-indigo-700'], [cbmCount, 'External CBM Scores', 'bg-teal-100 text-teal-700']].map(([val, label, cls]) => React.createElement('div', {
        key: label,
        className: 'text-center p-2 rounded-lg ' + cls
      }, React.createElement('div', {
        className: 'text-lg font-black'
      }, val), React.createElement('div', {
        className: 'text-[11px] opacity-70'
      }, label)))), React.createElement('div', {
        className: 'grid grid-cols-2 gap-2'
      }, responseRate !== null ? React.createElement('div', {
        className: 'bg-white/70 rounded-lg p-2 text-center'
      }, React.createElement('div', {
        className: 'text-lg font-black ' + (responseRate >= 80 ? 'text-emerald-600' : responseRate >= 50 ? 'text-amber-600' : 'text-red-500')
      }, responseRate + '%'), React.createElement('div', {
        className: 'text-[11px] text-slate-600'
      }, 'Survey Response Rate'), React.createElement('div', {
        className: 'text-[11px] text-slate-600'
      }, studentSurveys + '/' + expectedSurveys + ' expected')) : React.createElement('div', {
        className: 'bg-white/70 rounded-lg p-2 text-center'
      }, React.createElement('div', {
        className: 'text-sm text-slate-600'
      }, 'No auto-surveys yet'), React.createElement('div', {
        className: 'text-[11px] text-slate-600'
      }, sessionCounter + ' sessions completed')), topActivity ? React.createElement('div', {
        className: 'bg-white/70 rounded-lg p-2 text-center'
      }, React.createElement('div', {
        className: 'text-sm font-bold text-slate-700'
      }, topActivity[0]), React.createElement('div', {
        className: 'text-[11px] text-slate-600'
      }, 'Most Used Activity (' + topActivity[1] + 'x)')) : React.createElement('div', {
        className: 'bg-white/70 rounded-lg p-2 text-center'
      }, React.createElement('div', {
        className: 'text-sm text-slate-600'
      }, 'No sessions logged'), React.createElement('div', {
        className: 'text-[11px] text-slate-600'
      }, 'Activities will appear here'))), fidelityLog.length > 0 ? React.createElement('div', {
        className: 'mt-3 bg-white/70 rounded-lg p-3'
      }, React.createElement('h5', {
        className: 'text-[11px] font-bold text-slate-600 uppercase mb-2'
      }, 'Recent Session Log'), React.createElement('div', {
        className: 'space-y-1 max-h-32 overflow-y-auto'
      }, ...fidelityLog.slice(-10).reverse().map(entry => React.createElement('div', {
        key: entry.id,
        className: 'flex items-center justify-between text-[11px] py-0.5 border-b border-slate-100'
      }, React.createElement('span', {
        className: 'text-slate-600'
      }, entry.student), React.createElement('span', {
        className: 'text-slate-600'
      }, entry.activity), React.createElement('span', {
        className: 'text-slate-600'
      }, entry.duration + ' min'), React.createElement('span', {
        className: 'text-slate-600'
      }, entry.weekday + ' ' + new Date(entry.date).toLocaleDateString()))))) : null, React.createElement('div', {
        className: 'mt-3 flex gap-2'
      }, React.createElement('button', {
        className: 'flex-1 text-xs px-3 py-1.5 bg-white rounded-lg border border-slate-400 hover:bg-emerald-50 hover:border-emerald-300 font-medium text-slate-600 transition-colors',
        onClick: () => {
          const headers = ['Date', 'Weekday', 'Student', 'Activity', 'Duration_Min', 'Study'];
          const rows = fidelityLog.map(e => [e.date, e.weekday, e.student, e.activity, e.duration, e.researchStudy].map(v => '"' + String(v).replace(/"/g, '""') + '"').join(','));
          const csv = [headers.join(','), ...rows].join('\n');
          const blob = new Blob([csv], {
            type: 'text/csv'
          });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = 'Fidelity_Log_' + new Date().toISOString().split('T')[0] + '.csv';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
        }
      }, '\u{1F4C4} Export Fidelity Log'), React.createElement('button', {
        className: 'flex-1 text-xs px-3 py-1.5 bg-white rounded-lg border border-slate-400 hover:bg-purple-50 hover:border-purple-300 font-medium text-slate-600 transition-colors',
        onClick: () => {
          const allResponses = [];
          Object.entries(surveyResponses).forEach(([key, arr]) => {
            if (Array.isArray(arr)) arr.forEach(r => allResponses.push({
              key,
              ...r
            }));
          });
          const headers = ['Key', 'Type', 'Respondent', 'Timestamp', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5'];
          const rows = allResponses.map(r => {
            const questions = SURVEY_QUESTIONS[r.type] || [];
            const scores = questions.map(q => r[q.id] || '');
            return [r.key, r.type, r.respondent, r.timestamp, ...scores].map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',');
          });
          const csv = [headers.join(','), ...rows].join('\n');
          const blob = new Blob([csv], {
            type: 'text/csv'
          });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = 'Survey_Responses_' + new Date().toISOString().split('T')[0] + '.csv';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
        }
      }, '\u{1F4DD} Export Survey Data')));
    };
    const saveRtiGoal = (studentName, goal) => {
      const updated = {
        ...rtiGoals,
        [studentName]: {
          ...goal,
          updatedAt: new Date().toISOString()
        }
      };
      setRtiGoals(updated);
      try {
        localStorage.setItem('alloflow_rti_goals', JSON.stringify(updated));
      } catch {}
    };
    const calculateAimline = (goal, dataPoints) => {
      if (!goal || !goal.baseline || !goal.target || !goal.targetDate) return null;
      const baseDate = new Date(goal.baselineDate || Date.now());
      const targetDate = new Date(goal.targetDate);
      const totalWeeks = Math.max(1, Math.round((targetDate - baseDate) / (7 * 24 * 60 * 60 * 1000)));
      const slope = (goal.target - goal.baseline) / totalWeeks;
      const aimlinePoints = [];
      for (let w = 0; w <= totalWeeks; w++) {
        aimlinePoints.push({
          week: w,
          expected: Math.round(goal.baseline + slope * w)
        });
      }
      let consecutiveBelow = 0;
      if (dataPoints && dataPoints.length > 0) {
        const recent = dataPoints.slice(-6);
        for (const dp of recent) {
          const weeksSinceBase = Math.max(0, Math.round((new Date(dp.date || Date.now()) - baseDate) / (7 * 24 * 60 * 60 * 1000)));
          const expected = goal.baseline + slope * weeksSinceBase;
          if (dp.value < expected) consecutiveBelow++;else consecutiveBelow = 0;
        }
      }
      return {
        aimlinePoints,
        slope,
        totalWeeks,
        consecutiveBelow,
        alert: consecutiveBelow >= 6 ? 'critical' : consecutiveBelow >= 4 ? 'warning' : 'ok'
      };
    };
    const computeCorrelation = (xValues, yValues) => {
      const n = Math.min(xValues.length, yValues.length);
      if (n < 3) return {
        r: null,
        n,
        insufficient: true
      };
      const x = xValues.slice(0, n),
        y = yValues.slice(0, n);
      const meanX = x.reduce((s, v) => s + v, 0) / n;
      const meanY = y.reduce((s, v) => s + v, 0) / n;
      let num = 0,
        denX = 0,
        denY = 0;
      for (let i = 0; i < n; i++) {
        const dx = x[i] - meanX,
          dy = y[i] - meanY;
        num += dx * dy;
        denX += dx * dx;
        denY += dy * dy;
      }
      const den = Math.sqrt(denX * denY);
      const r = den === 0 ? 0 : num / den;
      const rounded = Math.round(r * 100) / 100;
      return {
        r: rounded,
        n,
        strength: Math.abs(rounded) >= 0.7 ? 'strong' : Math.abs(rounded) >= 0.4 ? 'moderate' : 'weak'
      };
    };
    const DOMAIN_LABELS = {
      phonologicalAwareness: 'Phonological Awareness',
      comprehension: 'Comprehension',
      fluency: 'Fluency (WCPM)'
    };
    const generateStudentInsights = studentName => {
      const snapshots = (rosterKey?.progressHistory?.[studentName] || []).sort((a, b) => new Date(a.date) - new Date(b.date));
      const probes = (probeHistory?.[studentName] || []).sort((a, b) => new Date(a.date) - new Date(b.date));
      const interventions = interventionLogs?.[studentName] || [];
      if (snapshots.length < 2) return {
        insufficient: true,
        snapshots: snapshots.length,
        probes: probes.length
      };
      const practiceAccuracy = snapshots.map(s => s.wsAccuracy || 0);
      const quizScores = snapshots.map(s => s.quizAvg || 0);
      const latest = snapshots[snapshots.length - 1];
      const first = snapshots[0];
      const profile = {
        phonologicalAwareness: latest.wsAccuracy || 0,
        comprehension: latest.quizAvg || 0,
        fluency: latest.fluencyWCPM || 0
      };
      const domains = Object.entries(profile).filter(([, v]) => v > 0);
      const strength = domains.length > 0 ? domains.reduce((a, b) => a[1] > b[1] ? a : b)[0] : null;
      const weakness = domains.length > 0 ? domains.reduce((a, b) => a[1] < b[1] ? a : b)[0] : null;
      const growth = {
        wsAccuracy: (latest.wsAccuracy || 0) - (first.wsAccuracy || 0),
        quizAvg: (latest.quizAvg || 0) - (first.quizAvg || 0),
        fluencyWCPM: (latest.fluencyWCPM || 0) - (first.fluencyWCPM || 0)
      };
      return {
        insufficient: false,
        snapshots: snapshots.length,
        probes: probes.length,
        interventions: interventions.length,
        profile,
        strength,
        weakness,
        growth,
        correlations: {
          practiceToQuiz: computeCorrelation(practiceAccuracy, quizScores)
        },
        growthTrajectory: snapshots.map(s => ({
          date: s.date,
          wsAccuracy: s.wsAccuracy || 0,
          quizAvg: s.quizAvg || 0,
          fluencyWCPM: s.fluencyWCPM || 0
        })),
        dosage: {
          totalInterventions: interventions.length,
          avgFrequency: interventions.length > 0 ? Math.round(interventions.reduce((s, i) => s + (parseInt(i.frequency) || 0), 0) / interventions.length) : 0,
          avgMinutes: interventions.length > 0 ? Math.round(interventions.reduce((s, i) => s + (parseInt(i.minutes) || 0), 0) / interventions.length) : 0
        }
      };
    };
    const generateClassInsights = () => {
      const all = importedStudents.map(s => ({
        name: s.name,
        insights: generateStudentInsights(s.name)
      })).filter(s => !s.insights.insufficient);
      if (all.length === 0) return null;
      const correlations = all.map(s => s.insights.correlations.practiceToQuiz.r).filter(r => r !== null);
      const avgCorrelation = correlations.length > 0 ? Math.round(correlations.reduce((s, v) => s + v, 0) / correlations.length * 100) / 100 : null;
      const weaknessCounts = {};
      all.forEach(s => {
        if (s.insights.weakness) weaknessCounts[s.insights.weakness] = (weaknessCounts[s.insights.weakness] || 0) + 1;
      });
      const commonWeakness = Object.entries(weaknessCounts).sort((a, b) => b[1] - a[1])[0];
      return {
        studentCount: all.length,
        avgCorrelation,
        commonWeakness: commonWeakness?.[0],
        commonWeaknessCount: commonWeakness?.[1],
        byStudent: all
      };
    };
    const handleLaunchORF = (grade, form) => {
      const g = grade || mathProbeGrade || '1';
      const f = form || mathProbeForm || 'A';
      if (!window.ORF_SCREENING_PASSAGES || !window.ORF_SCREENING_PASSAGES[g] || !window.ORF_SCREENING_PASSAGES[g][f]) {
        addToast('ORF passages not loaded yet — loading now', 'error');
        loadPsychometricProbes();
        return;
      }
      const passages = window.ORF_SCREENING_PASSAGES[g][f];
      const passage = passages[0];
      if (!passage || !passage.text) {
        addToast('No ORF passage found for Grade ' + g + ' Form ' + f, 'error');
        return;
      }
      const words = passage.text.split(/\s+/).map((w, i) => ({
        word: w,
        index: i,
        error: false
      }));
      setOrfProbeWords(words);
      setOrfProbeTitle(passage.title || 'ORF Passage');
      setOrfProbeLastWord(-1);
      setOrfProbeResults(null);
      setOrfProbeTimer(60);
      setOrfProbeGrade(g);
      setOrfProbeActive(true);
      if (orfProbeTimerRef.current) clearInterval(orfProbeTimerRef.current);
      orfProbeTimerRef.current = setInterval(() => {
        setOrfProbeTimer(prev => {
          if (prev <= 1) {
            clearInterval(orfProbeTimerRef.current);
            orfProbeTimerRef.current = null;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      addToast('ORF Probe: ' + passage.title + ' — 60 seconds', 'info');
    };
    const launchBenchmarkProbe = (grade, activity, form = 'A') => {
      const gradeBank = BENCHMARK_PROBE_BANKS && BENCHMARK_PROBE_BANKS[grade];
      const bank = gradeBank ? gradeBank[form] : null;
      if (activity === 'orf') {
        if (typeof onLaunchORF === 'function') {
          onLaunchORF(grade, form);
        }
        return;
      }
      if (!bank || !bank[activity]) {
        addToast('No probe words available for ' + grade + ' / ' + activity, 'warning');
        return;
      }
      const rawWords = bank[activity];
      const probeWords = rawWords.map((w, idx) => {
        if (typeof w === 'string') {
          return {
            word: w,
            targetWord: w,
            displayWord: w,
            definition: '',
            image: null,
            probeIndex: idx
          };
        } else if (w.word && w.phonemes) {
          var segIsoEntry = {
            word: w.word,
            targetWord: w.word,
            displayWord: w.word,
            definition: '',
            image: null,
            probeIndex: idx,
            phonemes: w.phonemes
          };
          if (w.isolationOptions) segIsoEntry.isolationOptions = w.isolationOptions;
          if (w.segmentationOptions) segIsoEntry.segmentationOptions = w.segmentationOptions;
          return segIsoEntry;
        } else if (w.display && w.answer) {
          var probeEntry = {
            word: w.answer,
            targetWord: w.answer,
            displayWord: w.display,
            definition: '',
            image: null,
            probeIndex: idx,
            blendingDisplay: w.display
          };
          if (w.phonemes) probeEntry.phonemes = w.phonemes;
          if (w.distractors) probeEntry.blendingDistractors = w.distractors;
          return probeEntry;
        } else if (w.target && w.options) {
          return {
            word: w.target,
            targetWord: w.target,
            displayWord: w.target,
            definition: '',
            image: null,
            probeIndex: idx,
            rhymeOptions: w.options
          };
        }
        return {
          word: String(w),
          targetWord: String(w),
          displayWord: String(w),
          definition: '',
          image: null,
          probeIndex: idx
        };
      });
      setIsProbeMode(true);
      setProbeGradeLevel(grade);
      setProbeActivity(activity);
      if (typeof setShowClassAnalytics === 'function') setShowClassAnalytics(false);
      const activityMap = {
        spelling: 'spelling_bee'
      };
      const wsActivity = activityMap[activity] || activity;
      setWsPreloadedWords(probeWords);
      setWordSoundsActivity(wsActivity);
      setIsWordSoundsMode(true);
      setActiveView('word-sounds');
    };
    const launchScreeningSession = (grade, form, student) => {
      const subtests = GRADE_SUBTEST_BATTERIES[grade];
      if (!subtests || subtests.length === 0) {
        addToast('No subtests available for grade ' + grade, 'warning');
        return;
      }
      if (!student) {
        addToast('Please select a student first', 'warning');
        return;
      }
      const session = {
        grade,
        form,
        student,
        subtests,
        currentIndex: 0,
        results: [],
        status: 'running'
      };
      setScreenerSession(session);
      setProbeTargetStudent(student);
      launchBenchmarkProbe(grade, subtests[0], form);
    };
    const advanceRoster = () => {
      if (rosterQueue.length === 0) return;
      const [nextStudent, ...rest] = rosterQueue;
      setRosterQueue(rest);
      setScreenerSession(null);
      setTimeout(() => {
        launchScreeningSession(probeGradeLevel, mathProbeForm, nextStudent);
      }, 500);
    };
    const generateFluencyScoreSheet = (result, sourceText) => {
      if (!result || !result.wordData) return;
      const rrm = calculateRunningRecordMetrics(result.wordData, result.insertions || []) || {
        substitutions: 0,
        omissions: 0,
        insertions: 0,
        selfCorrections: 0,
        errorRate: 0,
        scRate: 0,
        accuracy: 0,
        totalErrors: 0,
        readingLevel: 'unknown'
      };
      const readingLevelLabel = rrm.accuracy >= 95 ? 'Independent' : rrm.accuracy >= 90 ? 'Instructional' : 'Frustrational';
      const wordMarkup = result.wordData.map(w => {
        const sym = w.status === 'correct' ? '✓' : w.status === 'missed' ? '—' : w.status === 'self_corrected' ? 'SC' : '✗';
        const color = w.status === 'correct' ? '#16a34a' : w.status === 'missed' ? '#dc2626' : w.status === 'self_corrected' ? '#2563eb' : '#ea580c';
        const said = w.said ? `<br/><span style="font-size:9px;color:#94a3b8;">${w.said}</span>` : '';
        return `<span style="display:inline-block;text-align:center;margin:4px 3px;padding:4px 6px;border-radius:6px;border:1px solid ${color}20;background:${color}08;"><span style="font-size:16px;color:#1e293b;">${w.word}</span><br/><span style="font-size:11px;font-weight:800;color:${color};">${sym}</span>${said}</span>`;
      }).join('');
      const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${t('print.oral_fluency_title')}</title>
<style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Inter',sans-serif;color:#1e293b;padding:24px;line-height:1.4}@media print{body{padding:12px}}.sheet{max-width:750px;margin:0 auto;border:2px solid #e2e8f0;border-radius:12px;overflow:hidden}.hdr{background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;padding:20px 24px;display:flex;justify-content:space-between;align-items:center}.hdr h1{font-size:18px;font-weight:800}.fields{padding:16px 24px;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}.field{font-size:12px}.field label{font-weight:700;color:#64748b;display:block;margin-bottom:2px}.field .val{font-weight:600;color:#1e293b;padding:4px 0;border-bottom:1px dashed #cbd5e1;min-height:24px}.words{padding:20px 24px;line-height:2.2}.metrics{padding:16px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;display:grid;grid-template-columns:1fr 1fr;gap:16px}.mcol{padding:12px;background:white;border-radius:8px;border:1px solid #e2e8f0}.mcol h3{font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px}.mrow{display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px}.mrow .lbl{color:#475569}.mrow .vl{font-weight:700}.override{padding:16px 24px;border-top:1px solid #e2e8f0}.override h3{font-size:12px;font-weight:800;color:#4338ca;margin-bottom:8px}.ofields{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}.ofield{font-size:11px}.ofield label{font-weight:700;color:#64748b;display:block;margin-bottom:2px}.ofield input{width:100%;border:1px solid #cbd5e1;border-radius:6px;padding:6px 8px;font-size:13px;font-weight:600}.notes{padding:16px 24px;border-top:1px solid #e2e8f0}.notes textarea{width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:8px;font-size:12px;min-height:60px;resize:vertical}.sig{padding:16px 24px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;gap:24px}.sig .sigf{flex:1}.sig .sigf label{font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px}.sig .sigf .line{border-bottom:1px solid #1e293b;min-height:28px}.legend{padding:12px 24px;background:#faf5ff;border-top:1px solid #e2e8f0;display:flex;gap:16px;flex-wrap:wrap;font-size:10px;font-weight:600;color:#475569}@media print{.no-print{display:none!important}}</style></head><body>
<div class="sheet"><div class="hdr"><div><h1>📊 ${t('print.oral_fluency_title')}</h1><p>${t('print.assessment_record')}</p></div><div style="text-align:right;font-size:11px;"><div>Generated: ${new Date().toLocaleDateString()}</div></div></div>
<div class="fields"><div class="field"><label>${t('print.student')}</label><div class="val">${studentNickname || '________________'}</div></div><div class="field"><label>${t('print.date')}</label><div class="val">${new Date().toLocaleDateString()}</div></div><div class="field"><label>${t('print.grade_benchmark')}</label><div class="val">${fluencyBenchmarkGrade} / ${fluencyBenchmarkSeason}</div></div></div>
<div class="words">${wordMarkup}</div>
<div class="legend"><span>✓ = ${t('print.correct_legend')}</span><span>✗ = ${t('print.substitution_legend')}</span><span>— = ${t('print.omission_legend')}</span><span>SC = ${t('print.self_corrected_legend')}</span></div>
<div class="metrics"><div class="mcol"><h3>${t('common.ai_calculated_metrics')}</h3><div class="mrow"><span class="lbl">${t('print.wcpm')}</span><span class="vl">${result.wcpm || 0}</span></div><div class="mrow"><span class="lbl">${t('print.accuracy')}</span><span class="vl">${result.accuracy || 0}%</span></div><div class="mrow"><span class="lbl">${t('print.substitutions')}</span><span class="vl">${rrm.substitutions || 0}</span></div><div class="mrow"><span class="lbl">${t('print.omissions')}</span><span class="vl">${rrm.omissions || 0}</span></div><div class="mrow"><span class="lbl">${t('print.insertions')}</span><span class="vl">${rrm.insertions || 0}</span></div><div class="mrow"><span class="lbl">${t('print.self_corrections')}</span><span class="vl">${rrm.selfCorrections || 0}</span></div><div class="mrow"><span class="lbl">${t('print.error_rate')}</span><span class="vl">1:${rrm.errorRate || 0}</span></div><div class="mrow"><span class="lbl">${t('print.reading_level')}</span><span class="vl">${readingLevelLabel}</span></div></div>
<div class="mcol"><h3>${t('common.error_analysis')}</h3><div class="mrow"><span class="lbl">${t('print.total_errors')}</span><span class="vl">${rrm.totalErrors || 0}</span></div><div class="mrow"><span class="lbl">${t('print.sc_rate')}</span><span class="vl">${rrm.scRate || 0}%</span></div><div class="mrow"><span class="lbl">${t('print.total_words')}</span><span class="vl">${result.wordData?.length || 0}</span></div></div></div>
<div class="override"><h3>✏️ Teacher Verification (Override AI if needed)</h3><div class="ofields"><div class="ofield"><label>${t('print.verified_wcpm')}</label><input type="number" placeholder="${result.wcpm || ''}"/></div><div class="ofield"><label>${t('print.verified_accuracy')}</label><input type="number" placeholder="${result.accuracy || ''}"/></div><div class="ofield"><label>${t('print.verified_reading_level')}</label><input type="text" placeholder="${readingLevelLabel}"/></div></div></div>
<div class="notes"><label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">${t('print.teacher_notes')}</label><textarea placeholder=${t('common.placeholder_observations_patterns_next_steps')}></textarea></div>
<div class="sig"><div class="sigf"><label>${t('print.teacher_signature')}</label><div class="line"></div></div><div class="sigf"><label>${t('print.date')}</label><div class="line"></div></div></div></div>
<div class="no-print" style="text-align:center;margin-top:16px;"><button onclick="window.print()" style="background:#4f46e5;color:white;border:none;padding:10px 24px;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer;">🖨️ Print Score Sheet</button></div></body></html>`;
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
      }
    };
    const generateStudentProgressReport = student => {
      if (!student) return;
      const rti = classifyRTITier(student.stats);
      const s = student.stats;
      const date = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const tierColors = {
        1: {
          bg: '#dcfce7',
          color: '#16a34a',
          border: '#86efac',
          label: 'On Track'
        },
        2: {
          bg: '#fef9c3',
          color: '#d97706',
          border: '#fcd34d',
          label: 'Strategic Support'
        },
        3: {
          bg: '#fee2e2',
          color: '#dc2626',
          border: '#fca5a5',
          label: 'Intensive Support'
        }
      };
      const tc = tierColors[rti.tier] || tierColors[1];
      const metricBar = (label, value, max, unit, icon) => {
        const pct = max > 0 ? Math.min(100, Math.round(value / max * 100)) : 0;
        const barColor = pct >= 80 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626';
        return `
                <div style="margin-bottom: 14px;">
                    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
                        <span style="font-size: 13px; font-weight: 600; color: #334155;">${icon} ${label}</span>
                        <span style="font-size: 14px; font-weight: 800; color: ${barColor};">${value}${unit}</span>
                    </div>
                    <div style="background: #f1f5f9; border-radius: 6px; height: 10px; overflow: hidden;">
                        <div style="background: ${barColor}; height: 100%; border-radius: 6px; width: ${pct}%; transition: width 0.3s;"></div>
                    </div>
                </div>`;
      };
      let runningRecordHtml = '';
      const fluencyAssessments = student.data?.fluencyAssessments;
      if (fluencyAssessments?.length > 0) {
        const latest = fluencyAssessments[fluencyAssessments.length - 1];
        if (latest?.wordData) {
          const rr = calculateRunningRecordMetrics(latest.wordData, latest.insertions || []);
          if (rr) {
            const accColor = rr.accuracy >= 95 ? '#16a34a' : rr.accuracy >= 90 ? '#d97706' : '#dc2626';
            const accLabel = rr.accuracy >= 95 ? 'Independent' : rr.accuracy >= 90 ? 'Instructional' : 'Frustrational';
            runningRecordHtml = `
                        <div style="margin-top: 24px; padding: 16px; background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 10px;">
                            <h3 style="font-size: 15px; font-weight: 800; color: #4338ca; margin: 0 0 12px 0;">📖 Oral Reading Fluency</h3>
                            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px;">
                                <div style="text-align: center; background: white; padding: 8px; border-radius: 8px; border: 1px solid #e0e7ff;">
                                    <div style="font-size: 20px; font-weight: 800; color: #dc2626;">${rr.substitutions}</div>
                                    <div style="font-size: 10px; color: #64748b; font-weight: 600;">Substitutions</div>
                                </div>
                                <div style="text-align: center; background: white; padding: 8px; border-radius: 8px; border: 1px solid #e0e7ff;">
                                    <div style="font-size: 20px; font-weight: 800; color: #ea580c;">${rr.omissions}</div>
                                    <div style="font-size: 10px; color: #64748b; font-weight: 600;">Omissions</div>
                                </div>
                                <div style="text-align: center; background: white; padding: 8px; border-radius: 8px; border: 1px solid #e0e7ff;">
                                    <div style="font-size: 20px; font-weight: 800; color: #7c3aed;">${rr.insertions}</div>
                                    <div style="font-size: 10px; color: #64748b; font-weight: 600;">Insertions</div>
                                </div>
                                <div style="text-align: center; background: white; padding: 8px; border-radius: 8px; border: 1px solid #e0e7ff;">
                                    <div style="font-size: 20px; font-weight: 800; color: #2563eb;">${rr.selfCorrections}</div>
                                    <div style="font-size: 10px; color: #64748b; font-weight: 600;">Self-Corrections</div>
                                </div>
                            </div>
                            <div style="display: flex; gap: 16px; font-size: 12px; color: #475569; align-items: center; flex-wrap: wrap;">
                                <span><strong>Error Rate:</strong> 1:${rr.errorRate}</span>
                                <span><strong>SC Rate:</strong> ${rr.scRate}</span>
                                <span style="padding: 2px 10px; border-radius: 12px; font-weight: 700; background: ${accColor}20; color: ${accColor}; border: 1px solid ${accColor}40;">${accLabel} (${rr.accuracy}%)</span>
                            </div>
                        </div>`;
          }
        }
        if (latest?.wcpm) {
          runningRecordHtml += `
                    <div style="margin-top: 8px; padding: 10px 16px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 13px; color: #166534; font-weight: 600;">Latest Fluency:</span>
                        <span style="font-size: 18px; font-weight: 800; color: #16a34a;">${latest.wcpm} WCPM</span>
                    </div>`;
        }
      }
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Progress Report — ${student.name}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; background: #f8fafc; padding: 32px; line-height: 1.5; }
        .report { max-width: 700px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); overflow: hidden; }
        .header { padding: 28px 32px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; }
        .header h1 { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
        .header p { font-size: 13px; opacity: 0.85; }
        .content { padding: 28px 32px; }
        .tier-badge { display: inline-flex; align-items: center; gap: 10px; padding: 10px 20px; border-radius: 12px; margin-bottom: 20px; }
        .section-title { font-size: 15px; font-weight: 800; color: #334155; margin: 20px 0 12px 0; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0; }
        .recommendations { padding-left: 20px; }
        .recommendations li { font-size: 13px; color: #475569; margin-bottom: 8px; line-height: 1.6; }
        .footer { padding: 16px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }
        .print-btn { display: block; margin: 16px auto; padding: 10px 28px; background: #4f46e5; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit; }
        .print-btn:hover { background: #4338ca; }
        @media print {
            body { padding: 0; background: white; }
            .report { box-shadow: none; border-radius: 0; }
            .print-btn { display: none !important; }
            .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .tier-badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
    </style>
</head>
<body>
    <div class="report">
        <div class="header">
            <h1>' + t('print.student_progress_report') + '</h1>
            <p>${student.name} &bull; ${date}</p>
        </div>
        <div class="content">
            <div class="tier-badge" style="background: ${tc.bg}; border: 2px solid ${tc.border};">
                <span style="font-size: 28px;">${rti.emoji}</span>
                <div>
                    <div style="font-size: 16px; font-weight: 800; color: ${tc.color};">Tier ${rti.tier} — ${tc.label}</div>
                    <div style="font-size: 11px; color: #64748b;">RTI Classification</div>
                </div>
            </div>
            <div class="section-title">📊 Performance Summary</div>
            ${metricBar('Quiz Average', s.quizAvg, 100, '%', '📝')}
            ${metricBar('Word Sounds Accuracy', s.wsAccuracy, 100, '%', '🔊')}
            ${metricBar('Fluency', s.fluencyWCPM, 150, ' WCPM', '📖')}
            ${metricBar('Label Challenge', s.labelChallengeAvg, 100, '%', '🏷️')}
            ${metricBar('Total Activities', s.totalActivities, 20, '', '📊')}
            ${metricBar('Games Played', s.gamesPlayed, 10, '', '🎮')}
            <div class="section-title">📋 Assessment Basis</div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px;">
                ${rti.reasons.map(r => `<span style="font-size: 12px; padding: 4px 10px; border-radius: 20px; background: ${tc.bg}; color: ${tc.color}; font-weight: 600; border: 1px solid ${tc.border};">${r}</span>`).join('')}
            </div>
            <div class="section-title">💡 Recommendations for Home</div>
            <ul class="recommendations">
                ${rti.recommendations.map(r => `<li>${r}</li>`).join('')}
            </ul>
            ${runningRecordHtml}
        </div>
        <div class="footer">
            Generated ${date} &bull; Created with AlloFlow &bull; RTI Progress Monitoring System
        </div>
    </div>
    <button class="print-btn" onclick="window.print()">🖨️ Print This Report</button>
</body>
</html>`;
      const reportWindow = window.open('', '_blank');
      if (reportWindow) {
        reportWindow.document.write(html);
        reportWindow.document.close();
      }
    };
    const extractSafetyFlags = data => {
      const flags = [];
      if (data.personaState?.chatHistory) {
        data.personaState.chatHistory.forEach((msg, idx) => {
          if (msg.role === 'user' || msg.sender === 'student') {
            const text = msg.content || msg.text || '';
            const msgFlags = SafetyContentChecker.check(text);
            msgFlags.forEach(flag => {
              flags.push({
                ...flag,
                messageIndex: idx,
                context: text.substring(0, 100)
              });
            });
          }
        });
      }
      if (data.adventureState?.history) {
        data.adventureState.history.forEach((entry, idx) => {
          if (entry.type === 'choice' && entry.choiceSource === 'custom') {
            const msgFlags = SafetyContentChecker.check(entry.text || '');
            msgFlags.forEach(flag => {
              flags.push({
                ...flag,
                messageIndex: idx,
                source: 'adventure',
                context: (entry.text || '').substring(0, 100)
              });
            });
          }
        });
      }
      if (data.socraticChatHistory?.messages) {
        data.socraticChatHistory.messages.forEach((msg, idx) => {
          if (msg.role === 'user') {
            const msgFlags = SafetyContentChecker.check(msg.text || msg.content || '');
            msgFlags.forEach(flag => {
              flags.push({
                ...flag,
                source: 'socratic',
                messageIndex: idx,
                context: (msg.text || msg.content || '').substring(0, 100)
              });
            });
          }
        });
      }
      if (data.responses) {
        Object.entries(data.responses).forEach(([quizId, resp]) => {
          if (resp.timestamps && resp.timestamps.length > 1) {
            const times = resp.timestamps;
            let totalGap = 0;
            for (let i = 1; i < times.length; i++) {
              totalGap += new Date(times[i]) - new Date(times[i - 1]);
            }
            const avgMs = totalGap / (times.length - 1);
            if (avgMs < 3000 && times.length > 2) {
              flags.push({
                category: 'behavioral_rushing',
                match: `Avg ${Math.round(avgMs / 1000)}s/question`,
                severity: 'medium',
                source: 'quiz',
                context: `Quiz ${quizId}: ${Math.round(avgMs / 1000)}s avg response time`,
                timestamp: new Date().toISOString()
              });
            }
          }
          if (resp.answers && resp.answers.length > 4) {
            const answerCounts = {};
            resp.answers.forEach(a => {
              answerCounts[a] = (answerCounts[a] || 0) + 1;
            });
            const maxCount = Math.max(...Object.values(answerCounts));
            if (maxCount / resp.answers.length > 0.7) {
              const repeatedAnswer = Object.entries(answerCounts).find(([_, c]) => c === maxCount)?.[0];
              flags.push({
                category: 'behavioral_repetitive',
                match: `Same answer ${maxCount}/${resp.answers.length} times`,
                severity: 'low',
                source: 'quiz',
                context: `Quiz ${quizId}: "${repeatedAnswer}" selected ${Math.round(maxCount / resp.answers.length * 100)}% of the time`,
                timestamp: new Date().toISOString()
              });
            }
          }
        });
      }
      if (data.timeOnTask?.totalSessionMinutes && data.timeOnTask.totalSessionMinutes > 30) {
        const totalActs = Object.keys(data.responses || {}).length + (data.wordSoundsState?.history?.length || 0) + (data.gameCompletions ? Object.values(data.gameCompletions).flat().length : 0);
        const minutesPerActivity = totalActs > 0 ? data.timeOnTask.totalSessionMinutes / totalActs : data.timeOnTask.totalSessionMinutes;
        if (minutesPerActivity > 20 && totalActs < 3) {
          flags.push({
            category: 'behavioral_idle',
            match: `${Math.round(minutesPerActivity)}min/activity`,
            severity: 'low',
            source: 'behavioral',
            context: `${data.timeOnTask.totalSessionMinutes}min session with only ${totalActs} activities completed`,
            timestamp: new Date().toISOString()
          });
        }
      }
      return flags;
    };
    const handleExportCSV = () => {
      if (importedStudents.length === 0) return;
      const headers = [t('class_analytics.student_name'), t('class_analytics.quiz_avg'), t('class_analytics.adventure_xp'), t('class_analytics.escape_completion'), t('class_analytics.fluency_wcpm'), t('class_analytics.interview_xp'), 'Word Sounds %', 'Games Played', 'Socratic Msgs', 'Label Challenge %', t('class_analytics.safety_flags'), t('class_analytics.total_activities'), t('class_analytics.last_session')].join(',');
      const rows = importedStudents.map(student => [`"${student.name}"`, student.stats.quizAvg, student.stats.adventureXP, `${student.stats.escapeCompletion}%`, student.stats.fluencyWCPM, student.stats.interviewXP, student.stats.wsAccuracy ? `${student.stats.wsAccuracy}%` : 'N/A', student.stats.gamesPlayed || 0, student.stats.socraticMessageCount || 0, student.stats.labelChallengeAvg ? `${student.stats.labelChallengeAvg}%` : 'N/A', student.safetyFlags.length, student.stats.totalActivities, new Date(student.lastSession).toLocaleDateString()].join(','));
      const csv = [headers, ...rows].join('\n');
      const blob = new Blob([csv], {
        type: 'text/csv;charset=utf-8;'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `class_analytics_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };
    const classSummary = React.useMemo(() => {
      if (importedStudents.length === 0) return null;
      const totalQuizScores = importedStudents.map(s => s.stats.quizAvg).filter(s => s > 0);
      return {
        totalStudents: importedStudents.length,
        avgQuizScore: totalQuizScores.length > 0 ? Math.round(totalQuizScores.reduce((a, b) => a + b, 0) / totalQuizScores.length) : 0,
        studentsWithFlags: importedStudents.filter(s => s.safetyFlags.length > 0).length,
        totalFlags: importedStudents.reduce((acc, s) => acc + s.safetyFlags.length, 0),
        totalActivities: importedStudents.reduce((acc, s) => acc + s.stats.totalActivities, 0),
        flagBreakdown: (() => {
          const bd = {};
          importedStudents.forEach(s => s.safetyFlags.forEach(f => {
            bd[f.category] = (bd[f.category] || 0) + 1;
          }));
          return bd;
        })(),
        rtiDistribution: (() => {
          const dist = {
            1: [],
            2: [],
            3: []
          };
          importedStudents.forEach(s => {
            const rti = classifyRTITier(s.stats);
            dist[rti.tier].push(s.name);
          });
          return dist;
        })()
      };
    }, [importedStudents]);
    React.useEffect(() => {
      if (!quizChartRef.current || importedStudents.length === 0 || typeof Chart === 'undefined') return;
      if (quizChartInstance.current) quizChartInstance.current.destroy();
      const students = importedStudents.filter(s => s.stats.quizAvg > 0);
      if (students.length === 0) return;
      const colors = students.map(s => s.stats.quizAvg >= 80 ? '#10b981' : s.stats.quizAvg >= 60 ? '#f59e0b' : '#ef4444');
      quizChartInstance.current = new Chart(quizChartRef.current, {
        type: 'bar',
        data: {
          labels: students.map(s => s.name.length > 12 ? s.name.slice(0, 12) + '…' : s.name),
          datasets: [{
            label: t('class_analytics.quiz_avg'),
            data: students.map(s => s.stats.quizAvg),
            backgroundColor: colors,
            borderRadius: 6,
            maxBarThickness: 40
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            title: {
              display: true,
              text: t('class_analytics.quiz_distribution'),
              font: {
                size: 14,
                weight: 'bold'
              }
            }
          },
          scales: {
            x: {
              max: 100,
              grid: {
                display: false
              }
            },
            y: {
              grid: {
                display: false
              }
            }
          }
        }
      });
      return () => {
        if (quizChartInstance.current) quizChartInstance.current.destroy();
      };
    }, [importedStudents, t]);
    React.useEffect(() => {
      if (!flagsChartRef.current || !classSummary?.totalFlags || typeof Chart === 'undefined') return;
      if (flagsChartInstance.current) flagsChartInstance.current.destroy();
      const bd = classSummary.flagBreakdown;
      const cats = Object.keys(bd);
      if (cats.length === 0) return;
      const colorMap = {
        self_harm: '#dc2626',
        harm_to_others: '#b91c1c',
        bullying: '#ea580c',
        inappropriate_language: '#d97706',
        concerning_content: '#64748b'
      };
      flagsChartInstance.current = new Chart(flagsChartRef.current, {
        type: 'doughnut',
        data: {
          labels: cats.map(c => t(`class_analytics.flag_${c === 'harm_to_others' ? 'harm_others' : c}`)),
          datasets: [{
            data: cats.map(c => bd[c]),
            backgroundColor: cats.map(c => colorMap[c] || '#94a3b8')
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: {
                boxWidth: 12,
                font: {
                  size: 11
                }
              }
            },
            title: {
              display: true,
              text: t('class_analytics.flag_breakdown'),
              font: {
                size: 14,
                weight: 'bold'
              }
            }
          }
        }
      });
      return () => {
        if (flagsChartInstance.current) flagsChartInstance.current.destroy();
      };
    }, [classSummary, t]);
    React.useEffect(() => {
      if (!trendChartRef.current || !selectedStudent || typeof Chart === 'undefined') return;
      if (trendChartInstance.current) trendChartInstance.current.destroy();
      const assessments = selectedStudent.data?.fluencyAssessments;
      if (!assessments || assessments.length < 2) return;
      const labels = assessments.map((a, i) => a.date ? new Date(a.date).toLocaleDateString() : `#${i + 1}`);
      const wcpmData = assessments.map(a => a.wcpm || 0);
      trendChartInstance.current = new Chart(trendChartRef.current, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: t('class_analytics.fluency_wcpm'),
            data: wcpmData,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99,102,241,0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 5,
            pointBackgroundColor: '#6366f1'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            title: {
              display: true,
              text: t('class_analytics.fluency_trend'),
              font: {
                size: 14,
                weight: 'bold'
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'WCPM'
              }
            }
          }
        }
      });
      return () => {
        if (trendChartInstance.current) trendChartInstance.current.destroy();
      };
    }, [selectedStudent, t]);
    const generateStudentFriendlyReport = sessionData => {
      const date = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const totalActivities = (sessionData?.history || []).length;
      const quizzes = (sessionData?.history || []).filter(h => h.type === 'quiz');
      const avgQuizScore = quizzes.length > 0 ? Math.round(quizzes.reduce((sum, q) => sum + (q.score || 0), 0) / quizzes.length) : null;
      const wsHistory = sessionData?.wordSoundsHistory || [];
      const wsCorrect = wsHistory.filter(h => h.correct).length;
      const wsAccuracy = wsHistory.length > 0 ? Math.round(wsCorrect / wsHistory.length * 100) : null;
      const xp = sessionData?.globalPoints || 0;
      const level = sessionData?.globalLevel || 1;
      const badges = sessionData?.wordSoundsBadges || {};
      const badgeCount = Object.keys(badges).length;
      const masteredPhonemes = Object.entries(sessionData?.phonemeMastery || {}).filter(([_, v]) => v.accuracy >= 80);
      const allSnapshots = sessionData?.progressSnapshots || [];
      const dateRange = sessionData?.dateRange || {};
      const snapshots = allSnapshots.filter(s => {
        if (dateRange.start && s.date < dateRange.start) return false;
        if (dateRange.end && s.date > dateRange.end) return false;
        return true;
      });
      const dateRangeLabel = dateRange.start || dateRange.end ? ' (' + (dateRange.start || 'start') + ' to ' + (dateRange.end || 'now') + ')' : '';
      const hasHistory = snapshots.length > 1;
      const first = hasHistory ? snapshots[0] : null;
      const latest = hasHistory ? snapshots[snapshots.length - 1] : null;
      const growthCard = (label, startVal, endVal, unit) => {
        const diff = Math.round(endVal - startVal);
        const color = diff > 0 ? '#16a34a' : diff < 0 ? '#dc2626' : '#64748b';
        const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '→';
        return '<div style="background:white;border-radius:12px;padding:14px;text-align:center;border:2px solid ' + color + '20"><div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px">' + label + '</div><div style="font-size:24px;font-weight:800;color:' + color + '">' + arrow + ' ' + (diff > 0 ? '+' : '') + diff + unit + '</div><div style="font-size:10px;color:#94a3b8;margin-top:4px">' + Math.round(startVal) + unit + ' → ' + Math.round(endVal) + unit + '</div></div>';
      };
      const sessionRow = (snap, idx) => {
        return '<tr style="border-bottom:1px solid #f1f5f9"><td style="padding:8px 12px;font-size:12px;color:#64748b">' + (idx + 1) + '</td><td style="padding:8px 12px;font-size:12px;font-weight:600;color:#334155">' + snap.date + '</td><td style="padding:8px 12px;font-size:12px;color:#6366f1;font-weight:700">' + Math.round(snap.wsAccuracy || 0) + '%</td><td style="padding:8px 12px;font-size:12px;color:#16a34a;font-weight:700">' + Math.round(snap.quizAvg || 0) + '%</td><td style="padding:8px 12px;font-size:12px;color:#0891b2;font-weight:700">' + (snap.totalActivities || 0) + '</td></tr>';
      };
      const getEncouragement = score => {
        if (score >= 90) return {
          emoji: '\u{1F31F}',
          msg: 'Amazing work! You are a superstar!'
        };
        if (score >= 70) return {
          emoji: '\u{1F4AA}',
          msg: 'Great progress! Keep it up!'
        };
        if (score >= 50) return {
          emoji: '\u{1F331}',
          msg: 'You are growing! Every practice session helps!'
        };
        return {
          emoji: '\u{1F680}',
          msg: 'Keep practicing — you are on your way!'
        };
      };
      const statCard = (icon, label, value, color) => '<div style="background:white;border-radius:16px;padding:20px;text-align:center;border:2px solid ' + color + '20;box-shadow:0 2px 8px rgba(0,0,0,0.04)"><div style="font-size:32px;margin-bottom:8px">' + icon + '</div><div style="font-size:28px;font-weight:800;color:' + color + '">' + value + '</div><div style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.05em">' + label + '</div></div>';
      const quizEnc = avgQuizScore !== null ? getEncouragement(avgQuizScore) : {
        emoji: '\u{1F4DD}',
        msg: 'Try a quiz to see your score!'
      };
      const badgeHtml = badgeCount > 0 ? '<div style="margin-top:24px;padding:20px;background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:16px;border:2px solid #f59e0b40"><h3 style="font-size:18px;font-weight:800;color:#92400e;margin:0 0 12px">\u{1F3C5} My Badges (' + badgeCount + ')</h3><div style="display:flex;flex-wrap:wrap;gap:8px">' + Object.entries(badges).map(([name]) => '<span style="background:white;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:700;color:#92400e;border:1px solid #f59e0b60">\u{1F396}\u{FE0F} ' + name + '</span>').join('') + '</div></div>' : '';
      const strengthsHtml = masteredPhonemes.length > 0 ? '<div style="margin-top:20px;padding:20px;background:#f0fdf4;border-radius:16px;border:2px solid #86efac"><h3 style="font-size:18px;font-weight:800;color:#166534;margin:0 0 12px">\u{1F4AA} My Strengths</h3><div style="display:flex;flex-wrap:wrap;gap:8px">' + masteredPhonemes.slice(0, 12).map(([phoneme]) => '<span style="background:white;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:700;color:#166534;border:1px solid #86efac">✅ ' + phoneme + '</span>').join('') + '</div></div>' : '';
      const growthHtml = hasHistory ? '<div style="margin-top:24px"><h3 style="font-size:18px;font-weight:800;color:#334155;margin:0 0 16px">\u{1F4C8} My Growth Journey (' + snapshots.length + ' sessions)</h3><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">' + growthCard('Word Sounds', first.wsAccuracy || 0, latest.wsAccuracy || 0, '%') + growthCard('Quiz Average', first.quizAvg || 0, latest.quizAvg || 0, '%') + growthCard('Activities', first.totalActivities || 0, latest.totalActivities || 0, '') + '</div><p style="font-size:12px;color:#64748b;text-align:center;font-style:italic">From ' + first.date + ' to ' + latest.date + '</p></div>' : '';
      const historyHtml = snapshots.length > 0 ? '<div style="margin-top:24px"><h3 style="font-size:18px;font-weight:800;color:#334155;margin:0 0 12px">\u{1F4CB} Session History</h3><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;background:white;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0"><thead><tr style="background:#f8fafc"><th style="padding:8px 12px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;text-align:left">#</th><th style="padding:8px 12px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;text-align:left">Date</th><th style="padding:8px 12px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;text-align:left">' + t('learner.word_sounds') + '</th><th style="padding:8px 12px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;text-align:left">' + t('learner.quiz_avg') + '</th><th style="padding:8px 12px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;text-align:left">' + t('learner.activities') + '</th></tr></thead><tbody>' + snapshots.map((s, i) => sessionRow(s, i)).join('') + '</tbody></table></div></div>' : '';
      const html = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>' + t('learner.my_learning_journey') + '</title><style>@import url(https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap);*{box-sizing:border-box;margin:0;padding:0}body{font-family:Inter,sans-serif;background:linear-gradient(180deg,#dbeafe 0%,#ede9fe 50%,#fce7f3 100%);min-height:100vh;padding:32px}@media print{body{background:white;padding:16px}}</style></head><body><div style="max-width:700px;margin:0 auto"><div style="text-align:center;margin-bottom:32px"><div style="font-size:48px;margin-bottom:8px">\u{1F31F}</div><h1 style="font-size:32px;font-weight:800;color:#1e293b;margin-bottom:4px">' + t('learner.my_learning_journey') + '</h1><p style="color:#64748b;font-size:14px">' + date + (hasHistory ? ' • ' + snapshots.length + ' sessions tracked' + dateRangeLabel : '') + '</p></div><div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;border-radius:20px;padding:24px;text-align:center;margin-bottom:24px;box-shadow:0 8px 32px rgba(99,102,241,0.3)"><div style="font-size:14px;text-transform:uppercase;letter-spacing:0.1em;opacity:0.8;margin-bottom:8px">Level</div><div style="font-size:48px;font-weight:800">' + level + '</div><div style="font-size:16px;font-weight:600;margin-top:4px">' + xp + ' XP earned ' + quizEnc.emoji + '</div><div style="margin-top:12px;font-size:14px;opacity:0.9">' + quizEnc.msg + '</div></div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px">' + statCard('\u{1F4DA}', 'Activities', totalActivities, '#6366f1') + statCard('✅', 'Quiz Avg', avgQuizScore !== null ? avgQuizScore + '%' : '—', '#16a34a') + statCard('\u{1F524}', 'Word Accuracy', wsAccuracy !== null ? wsAccuracy + '%' : '—', '#0891b2') + '</div>' + growthHtml + historyHtml + badgeHtml + strengthsHtml + '<div style="margin-top:32px;text-align:center;color:#94a3b8;font-size:12px">Generated ' + date + ' • Created with AlloFlow • Keep learning! \u{1F680}</div></div></body></html>';
      const blob = new Blob([html], {
        type: 'text/html'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'my_learning_journey_' + new Date().toISOString().split('T')[0] + '.html';
      a.click();
      URL.revokeObjectURL(url);
      if (addToast) addToast('\u{1F4CA} Your progress report has been downloaded!', 'success');
    };
    if (!isOpen) return null;
    return ReactDOM.createPortal(/*#__PURE__*/React.createElement("div", { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },
      className: "fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 animate-in fade-in"
    }, /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
    }, /*#__PURE__*/React.createElement("div", {
      className: "p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: isIndependentMode ? "bg-amber-100 p-2 rounded-xl" : "bg-violet-100 p-2 rounded-xl"
    }, isIndependentMode ? /*#__PURE__*/React.createElement(BarChart3, {
      size: 24,
      className: "text-amber-600"
    }) : /*#__PURE__*/React.createElement(ClipboardList, {
      size: 24,
      className: "text-violet-600"
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
      className: "text-xl font-bold text-slate-800"
    }, isIndependentMode ? '\u{1F4CA} My Learning Journey' : '🎯 Assessment Center'), importedStudents.length > 0 && /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-slate-600"
    }, t('class_analytics.students_loaded', {
      count: importedStudents.length
    })))), /*#__PURE__*/React.createElement("button", {
      "aria-label": t('common.text_field'),
      onClick: onClose,
      className: "p-2 hover:bg-slate-200 rounded-lg transition-colors"
    }, /*#__PURE__*/React.createElement(X, {
      size: 20,
      className: "text-slate-600"
    }))), !isIndependentMode && /*#__PURE__*/React.createElement("div", {
      className: "flex border-b border-slate-200 bg-slate-50/50 px-4 shrink-0"
    }, [{
      id: 'assessments',
      label: '🎯 Administer',
      desc: 'Run probes'
    }, {
      id: 'students',
      label: '📋 Student Data',
      desc: 'Import & review'
    }, {
      id: 'research',
      label: '📊 Research',
      desc: 'Insights & growth'
    }].map(tab => /*#__PURE__*/React.createElement("button", {
      key: tab.id,
      onClick: () => {
        setAssessmentCenterTab(tab.id);
        if (tab.id === 'research' && researchFirstVisit) {
          setResearchFirstVisit(false);
          if (typeof renderResearchSetupModal === 'function') setShowResearchSetup(true);
        }
      },
      className: `flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-all ${assessmentCenterTab === tab.id ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-slate-600 hover:text-slate-700 hover:bg-slate-100'}`
    }, /*#__PURE__*/React.createElement("span", null, tab.label), /*#__PURE__*/React.createElement("span", {
      className: `text-[11px] font-normal ${assessmentCenterTab === tab.id ? 'text-indigo-400' : 'text-slate-600'}`
    }, tab.desc)))), /*#__PURE__*/React.createElement("div", {
      className: "flex-1 overflow-y-auto p-4",
      style: {
        display: !isIndependentMode && (assessmentCenterTab === 'research' || assessmentCenterTab === 'students') ? 'none' : undefined
      }
    },
    // ── Unified Student Selector + Screening Queue (Administer tab top bar) ──
    !isIndependentMode && assessmentCenterTab === 'assessments' && React.createElement("div", {
      className: "mb-4 bg-gradient-to-r from-indigo-50 to-violet-50 rounded-xl border border-indigo-200 p-3"
    },
      React.createElement("div", { className: "flex items-center gap-3 flex-wrap" },
        React.createElement("div", { className: "flex items-center gap-2" },
          React.createElement("span", { className: "text-sm font-black text-indigo-700" }, '\uD83C\uDFAF Active Student:'),
          React.createElement("select", {
            "aria-label": "Select active student for all probes",
            value: activeStudent || '',
            onChange: function(e) {
              var val = e.target.value || null;
              setActiveStudent(val);
              setProbeTargetStudent(val);
              setMathProbeStudent(val);
            },
            className: "text-sm font-bold border-2 border-indigo-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 min-w-[200px]"
          },
            React.createElement("option", { value: "" }, '\uD83C\uDFAF Practice Mode (No Student)'),
            importedStudents.map(function(s) {
              return React.createElement("option", { key: s.id || s.name, value: s.nickname || s.name }, s.nickname || s.name);
            }),
            // Also show roster students if no imports
            rosterKey && rosterKey.students && Object.keys(rosterKey.students).map(function(name) {
              if (importedStudents.some(function(s) { return (s.nickname || s.name) === name; })) return null;
              return React.createElement("option", { key: 'roster-' + name, value: name }, name);
            })
          )
        ),
        // Screening Queue controls
        React.createElement("div", { className: "flex items-center gap-2 ml-auto" },
          screeningQueueActive && screeningQueue.length > 0 && React.createElement("div", {
            className: "flex items-center gap-1 bg-white/80 px-3 py-1.5 rounded-lg border border-indigo-200"
          },
            React.createElement("span", { className: "text-xs font-bold text-indigo-600" }, 'Queue:'),
            screeningQueue.map(function(name, idx) {
              return React.createElement("span", {
                key: idx,
                className: 'text-xs px-1.5 py-0.5 rounded-full font-medium ' + (name === activeStudent ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600')
              }, name);
            }),
            React.createElement("button", {
              onClick: function() {
                if (screeningQueue.length > 0) {
                  var next = screeningQueue[0];
                  var rest = screeningQueue.slice(1);
                  setScreeningQueue(rest);
                  setActiveStudent(next);
                  setProbeTargetStudent(next);
                  setMathProbeStudent(next);
                  if (rest.length === 0) setScreeningQueueActive(false);
                  addToast('Now assessing: ' + next, 'info');
                }
              },
              className: "text-xs px-2 py-1 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors ml-1"
            }, 'Next \u2192')
          ),
          !screeningQueueActive && importedStudents.length > 1 && React.createElement("button", {
            onClick: function() {
              var names = importedStudents.map(function(s) { return s.nickname || s.name; });
              setScreeningQueue(names.slice(1));
              setActiveStudent(names[0]);
              setProbeTargetStudent(names[0]);
              setMathProbeStudent(names[0]);
              setScreeningQueueActive(true);
              addToast('Screening queue started with ' + names.length + ' students', 'info');
            },
            className: "text-xs px-3 py-2 bg-white border border-indigo-300 text-indigo-700 rounded-lg font-bold hover:bg-indigo-50 transition-colors flex items-center gap-1"
          }, '\uD83D\uDCCB Start Screening Queue')
        )
      ),
      activeStudent && React.createElement("div", { className: "mt-2 text-xs text-indigo-500 font-medium" },
        'All probes below will record results for: ' + activeStudent
      )
    ), isIndependentMode && /*#__PURE__*/React.createElement("div", {
      className: "mb-6 space-y-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 p-6 rounded-2xl border border-indigo-100"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-center mb-4"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-4xl"
    }, "\uD83C\uDF1F"), /*#__PURE__*/React.createElement("h3", {
      className: "text-lg font-bold text-slate-800 mt-2"
    }, "Welcome to Your Learning Journey!"), /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-slate-600 mt-1"
    }, "Track your progress and celebrate your growth")), /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-3 gap-3 mb-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-xl p-3 text-center border border-indigo-100"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-2xl font-bold text-indigo-600"
    }, globalLevel), /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-slate-600 font-semibold"
    }, "Level")), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-xl p-3 text-center border border-purple-100"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-2xl font-bold text-purple-600"
    }, globalPoints), /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-slate-600 font-semibold"
    }, "XP")), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-xl p-3 text-center border border-pink-100"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-2xl font-bold text-pink-600"
    }, history.length), /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-slate-600 font-semibold"
    }, "Activities"))), /*#__PURE__*/React.createElement("div", {
      className: "mt-4 p-3 bg-white/80 rounded-xl border border-slate-400"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-xs font-bold text-slate-600 uppercase mb-2"
    }, "\uD83D\uDCC5 Report Date Range (optional)"), /*#__PURE__*/React.createElement("div", {
      className: "flex gap-2 items-center"
    }, /*#__PURE__*/React.createElement("input", {
      type: "date",
      value: reportStartDate,
      onChange: e => setReportStartDate(e.target.value),
      className: "flex-1 text-xs px-2 py-1.5 rounded-lg border border-slate-400 bg-white text-slate-700",
      placeholder: "Start",
      "aria-label": "Report start date"
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-xs text-slate-600"
    }, "to"), /*#__PURE__*/React.createElement("input", {
      type: "date",
      value: reportEndDate,
      onChange: e => setReportEndDate(e.target.value),
      className: "flex-1 text-xs px-2 py-1.5 rounded-lg border border-slate-400 bg-white text-slate-700",
      placeholder: "End",
      "aria-label": "Report end date"
    }), (reportStartDate || reportEndDate) && /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setReportStartDate('');
        setReportEndDate('');
      },
      className: "text-xs text-slate-600 hover:text-red-500 px-1",
      title: "Clear dates"
    }, "\u2716")), /*#__PURE__*/React.createElement("p", {
      className: "text-[11px] text-slate-600 mt-1"
    }, t('learner.leave_empty_all_sessions'))), /*#__PURE__*/React.createElement("button", {
      onClick: () => generateStudentFriendlyReport({
        history,
        wordSoundsHistory,
        phonemeMastery,
        wordSoundsBadges,
        gameCompletions,
        globalPoints,
        globalLevel,
        progressSnapshots: rosterKey?.progressHistory && Object.values(rosterKey.progressHistory)[0] || [],
        dateRange: {
          start: reportStartDate,
          end: reportEndDate
        }
      }),
      className: "w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-200"
    }, /*#__PURE__*/React.createElement(Download, {
      size: 18
    }), " ", t('learner.download_progress_report')))), !isIndependentMode && /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap gap-3 mb-4"
    }, /*#__PURE__*/React.createElement("label", {
      className: "cursor-pointer"
    }, /*#__PURE__*/React.createElement("input", {
      "aria-label": t('common.upload_json_file'),
      type: "file",
      accept: ".json",
      multiple: true,
      onChange: handleFileImport,
      className: "hidden"
    }), /*#__PURE__*/React.createElement("div", {
      "data-help-key": "dashboard_import_btn",
      className: "bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
    }, /*#__PURE__*/React.createElement(Upload, {
      size: 16
    }), t('class_analytics.import_button'))), importedStudents.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
      "aria-label": t('common.download'),
      "data-help-key": "dashboard_export_csv",
      onClick: handleExportCSV,
      className: "bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
    }, /*#__PURE__*/React.createElement(Download, {
      size: 16
    }), t('class_analytics.export_csv')), showLiveSyncInput && !isLiveListening ? /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1 animate-in fade-in"
    }, /*#__PURE__*/React.createElement(Cloud, {
      size: 14,
      className: "text-blue-500 shrink-0"
    }), /*#__PURE__*/React.createElement("input", {
      type: "text",
      placeholder: t('common.placeholder_session_code'),
      value: liveSyncCode,
      onChange: e => setLiveSyncCode(e.target.value),
      onKeyDown: e => {
        if (e.key === 'Enter' && liveSyncCode.trim()) {
          setIsLiveListening(true);
          setShowLiveSyncInput(false);
          const progressCollRef = collection(db, 'artifacts', appId, 'public', 'data', 'sessions', liveSyncCode.trim(), 'studentProgress');
          const unsubscribe = onSnapshot(progressCollRef, snapshot => {
            const data = {};
            snapshot.forEach(docSnap => {
              data[docSnap.id] = docSnap.data();
            });
            setLiveProgressData(data);
            const liveStudents = Object.entries(data).map(([id, d]) => ({
              id: `live-${id}`,
              name: d.studentNickname || id,
              filename: `live:${id}`,
              data: d,
              stats: d.stats || {},
              safetyFlags: [],
              lastSession: d.lastSynced || new Date().toISOString(),
              isLive: true
            }));
            setImportedStudents(prev => [...prev.filter(s => !s.isLive), ...liveStudents]);
          }, err => {
            warnLog('[LiveSync] Error:', err);
            setIsLiveListening(false);
          });
          window._progressUnsub = unsubscribe;
        }
        if (e.key === 'Escape') {
          setShowLiveSyncInput(false);
          setLiveSyncCode('');
        }
      },
      className: "w-28 px-2 py-1 text-xs border-none bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-300 rounded placeholder-blue-300",
      autoFocus: true,
      "aria-label": t('common.session_code_for_live_sync')
    }), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setShowLiveSyncInput(false);
        setLiveSyncCode('');
      },
      className: "text-blue-400 hover:text-blue-600 p-0.5",
      "aria-label": t('common.cancel')
    }, /*#__PURE__*/React.createElement(X, {
      size: 12
    }))) : /*#__PURE__*/React.createElement("button", {
      "aria-label": t('common.live_sync'),
      "data-help-key": "dashboard_live_sync",
      onClick: () => {
        if (isLiveListening) {
          if (window._progressUnsub) window._progressUnsub();
          setIsLiveListening(false);
          setLiveProgressData({});
          return;
        }
        setShowLiveSyncInput(true);
      },
      className: `${isLiveListening ? 'bg-green-600 hover:bg-green-700 ring-2 ring-green-300' : 'bg-blue-600 hover:bg-blue-700'} text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors`
    }, isLiveListening ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Wifi, {
      size: 16,
      className: "animate-pulse"
    }), " Live (", Object.keys(liveProgressData).length, ")") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Cloud, {
      size: 16
    }), " ", t('class_analytics.live_sync'))), /*#__PURE__*/React.createElement("button", {
      "aria-label": t('common.toggle_safety_flags'),
      "data-help-key": "dashboard_safety_toggle",
      onClick: () => setSafetyFlaggingVisible(prev => !prev),
      className: `${safetyFlaggingVisible ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-400 hover:bg-slate-500'} text-white px-3 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors text-sm`,
      title: safetyFlaggingVisible ? 'Safety flags visible — click to hide' : 'Safety flags hidden — click to show'
    }, /*#__PURE__*/React.createElement(ShieldCheck, {
      size: 16
    }), " ", safetyFlaggingVisible ? '🛡️ Safety On' : '🛡️ Off'), /*#__PURE__*/React.createElement("button", {
      "aria-label": t('common.delete'),
      "data-help-key": "dashboard_clear_btn",
      onClick: () => {
        setImportedStudents([]);
        if (window._progressUnsub) {
          window._progressUnsub();
          setIsLiveListening(false);
        }
      },
      className: "bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
    }, /*#__PURE__*/React.createElement(Trash2, {
      size: 16
    }), t('class_analytics.clear_data'))), isProcessing && importProgress.total > 0 && /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg animate-pulse border border-indigo-200 ml-auto"
    }, /*#__PURE__*/React.createElement("div", {
      className: "animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent"
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-sm font-medium"
    }, "Processing: ", importProgress.current, "/", importProgress.total))), classSummary && /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-2 md:grid-cols-4 gap-3 mb-4"
    }, /*#__PURE__*/React.createElement("div", {
      "data-help-key": "dashboard_stat_students",
      className: "bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-center"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-2xl font-bold text-indigo-600"
    }, classSummary.totalStudents), /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-slate-600"
    }, t('class_analytics.total_students'))), /*#__PURE__*/React.createElement("div", {
      "data-help-key": "dashboard_stat_quiz",
      className: "bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-2xl font-bold text-emerald-600"
    }, classSummary.avgQuizScore, "%"), /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-slate-600"
    }, t('class_analytics.avg_quiz_score'))), /*#__PURE__*/React.createElement("div", {
      "data-help-key": "dashboard_stat_flags",
      className: `${classSummary.studentsWithFlags > 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'} border rounded-xl p-3 text-center`
    }, /*#__PURE__*/React.createElement("div", {
      className: `text-2xl font-bold ${classSummary.studentsWithFlags > 0 ? 'text-rose-600' : 'text-slate-600'}`
    }, classSummary.studentsWithFlags), /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-slate-600"
    }, t('class_analytics.students_with_flags'))), /*#__PURE__*/React.createElement("div", {
      "data-help-key": "dashboard_stat_activities",
      className: "bg-purple-50 border border-purple-200 rounded-xl p-3 text-center"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-2xl font-bold text-purple-600"
    }, importedStudents.reduce((acc, s) => acc + s.stats.totalActivities, 0)), /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-slate-600"
    }, t('class_analytics.total_activities')))), classSummary?.rtiDistribution && /*#__PURE__*/React.createElement("div", {
      "data-help-key": "dashboard_rti_summary",
      className: "mb-4 p-4 bg-gradient-to-r from-slate-50 to-indigo-50 border border-indigo-200 rounded-xl"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between mb-3"
    }, /*#__PURE__*/React.createElement("h3", {
      className: "font-bold text-slate-700 flex items-center gap-2"
    }, "\uD83C\uDFAF RTI Tier Distribution"), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-xs text-slate-600"
    }, classSummary.totalStudents, " students"), /*#__PURE__*/React.createElement("button", {
      "aria-label": t('common.configure_rti_thresholds'),
      onClick: () => setShowRTISettings(true),
      className: "p-1.5 rounded-lg hover:bg-white/80 text-slate-600 hover:text-indigo-600 transition-all border border-transparent hover:border-indigo-600",
      title: t('common.configure_rti_thresholds')
    }, /*#__PURE__*/React.createElement(Settings, {
      size: 14
    })))), /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-3 gap-3 mb-3"
    }, [{
      tier: 1,
      label: 'Tier 1 — On Track',
      emoji: '🟢',
      color: '#16a34a',
      bg: '#dcfce7',
      border: '#86efac'
    }, {
      tier: 2,
      label: 'Tier 2 — Strategic',
      emoji: '🟡',
      color: '#d97706',
      bg: '#fef9c3',
      border: '#fcd34d'
    }, {
      tier: 3,
      label: 'Tier 3 — Intensive',
      emoji: '🔴',
      color: '#dc2626',
      bg: '#fee2e2',
      border: '#fca5a5'
    }].map(t => {
      const students = classSummary.rtiDistribution[t.tier] || [];
      const pct = classSummary.totalStudents > 0 ? Math.round(students.length / classSummary.totalStudents * 100) : 0;
      return /*#__PURE__*/React.createElement("div", {
        key: t.tier,
        className: "rounded-xl p-3 text-center border-2 transition-all hover:shadow-md",
        style: {
          background: t.bg,
          borderColor: t.border
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: '24px'
        }
      }, t.emoji), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: '28px',
          fontWeight: 800,
          color: t.color
        }
      }, students.length), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: '11px',
          fontWeight: 700,
          color: t.color
        }
      }, t.label), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: '10px',
          color: '#64748b',
          marginTop: '2px'
        }
      }, pct, "% of class"));
    })), /*#__PURE__*/React.createElement("div", {
      className: "flex rounded-full overflow-hidden h-3 bg-slate-200",
      role: "img",
      "aria-label": t('common.rti_tier_distribution_bar')
    }, [{
      tier: 1,
      color: '#16a34a'
    }, {
      tier: 2,
      color: '#d97706'
    }, {
      tier: 3,
      color: '#dc2626'
    }].map(t => {
      const count = (classSummary.rtiDistribution[t.tier] || []).length;
      const pct = classSummary.totalStudents > 0 ? count / classSummary.totalStudents * 100 : 0;
      if (pct === 0) return null;
      return /*#__PURE__*/React.createElement("div", {
        key: t.tier,
        style: {
          width: pct + '%',
          backgroundColor: t.color,
          transition: 'width 0.5s ease'
        }
      });
    })), ((classSummary.rtiDistribution[2] || []).length > 0 || (classSummary.rtiDistribution[3] || []).length > 0) && /*#__PURE__*/React.createElement("div", {
      className: "mt-3 grid grid-cols-2 gap-2"
    }, (classSummary.rtiDistribution[3] || []).length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-lg p-2 border border-rose-100"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '10px',
        fontWeight: 700,
        color: '#dc2626',
        marginBottom: '4px'
      }
    }, "\uD83D\uDD34 Intensive"), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap gap-1"
    }, classSummary.rtiDistribution[3].map((name, i) => /*#__PURE__*/React.createElement("span", {
      key: i,
      className: "text-xs px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-medium border border-rose-200"
    }, name)))), (classSummary.rtiDistribution[2] || []).length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-lg p-2 border border-amber-100"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '10px',
        fontWeight: 700,
        color: '#d97706',
        marginBottom: '4px'
      }
    }, "\uD83D\uDFE1 Strategic"), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap gap-1"
    }, classSummary.rtiDistribution[2].map((name, i) => /*#__PURE__*/React.createElement("span", {
      key: i,
      className: "text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium border border-amber-200"
    }, name)))))), showRTISettings && /*#__PURE__*/React.createElement("div", { role: "button", tabIndex: 0, onKeyDown: function(e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.target.click(); } }, 
      className: "fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in",
      onClick: () => setShowRTISettings(false)
    }, /*#__PURE__*/React.createElement("div", { role: "button", tabIndex: 0, onKeyDown: function(e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.target.click(); } }, 
      className: "bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg border-2 border-indigo-100 transform transition-all animate-in zoom-in-95",
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between mb-4"
    }, /*#__PURE__*/React.createElement("h3", {
      className: "text-lg font-bold text-slate-800 flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "bg-indigo-100 p-2 rounded-full text-indigo-600"
    }, /*#__PURE__*/React.createElement(Settings, {
      size: 18
    })), "RTI Threshold Configuration"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setShowRTISettings(false),
      className: "p-2 rounded-full hover:bg-slate-100 text-slate-600",
      "aria-label": t('common.close')
    }, /*#__PURE__*/React.createElement(X, {
      size: 18
    }))), /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-slate-600 mb-4"
    }, "Adjust classification cutoffs to match your grade level, district benchmarks, or screening tool norms. Changes apply immediately to all student classifications."), /*#__PURE__*/React.createElement("div", {
      className: "space-y-4"
    }, [{
      key: 'quizTier3',
      label: '🔴 Quiz — Tier 3 cutoff',
      desc: 'Below this → Intensive',
      unit: '%',
      min: 10,
      max: 80,
      step: 5
    }, {
      key: 'quizTier2',
      label: '🟡 Quiz — Tier 2 cutoff',
      desc: 'Below this → Strategic',
      unit: '%',
      min: 40,
      max: 100,
      step: 5
    }, {
      key: 'wsTier3',
      label: '🔴 Word Sounds — Tier 3 cutoff',
      desc: 'Below this → Intensive',
      unit: '%',
      min: 10,
      max: 80,
      step: 5
    }, {
      key: 'wsTier2',
      label: '🟡 Word Sounds — Tier 2 cutoff',
      desc: 'Below this → Strategic',
      unit: '%',
      min: 30,
      max: 100,
      step: 5
    }, {
      key: 'engagementMin',
      label: '🟡 Minimum Activities',
      desc: 'Fewer than this → Strategic',
      unit: '',
      min: 1,
      max: 20,
      step: 1
    }, {
      key: 'fluencyMin',
      label: '🟡 Fluency WCPM Floor',
      desc: 'Below this → Strategic',
      unit: ' WCPM',
      min: 20,
      max: 200,
      step: 10
    }, {
      key: 'labelChallengeMin',
      label: '🟡 Label Challenge Floor',
      desc: 'Below this → Strategic',
      unit: '%',
      min: 10,
      max: 80,
      step: 5
    }].map(item => /*#__PURE__*/React.createElement("div", {
      key: item.key,
      className: "flex items-center gap-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex-1 min-w-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-sm font-semibold text-slate-700"
    }, item.label), /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-slate-600"
    }, item.desc)), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("input", {
      type: "range",
      min: item.min,
      max: item.max,
      step: item.step,
      value: rtiThresholds[item.key],
      onChange: e => setRtiThresholds(prev => ({
        ...prev,
        [item.key]: Number(e.target.value)
      })),
      className: "w-24 accent-indigo-600",
      "aria-label": item.label
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-sm font-bold text-indigo-600 w-16 text-right"
    }, rtiThresholds[item.key], item.unit))))), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between mt-5 pt-4 border-t border-slate-100"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setRtiThresholds({
        quizTier3: 50,
        quizTier2: 80,
        wsTier3: 50,
        wsTier2: 75,
        engagementMin: 2,
        fluencyMin: 60,
        labelChallengeMin: 50
      }),
      className: "text-xs text-slate-600 hover:text-indigo-600 font-medium transition-colors"
    }, "\u21BA Reset to Defaults"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setShowRTISettings(false),
      className: "px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-md text-sm"
    }, "Done")))), importedStudents.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-1 md:grid-cols-2 gap-4 mb-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "bg-white border border-slate-400 rounded-xl p-4",
      style: {
        minHeight: '200px'
      }
    }, /*#__PURE__*/React.createElement("canvas", {
      ref: quizChartRef
    })), classSummary?.totalFlags > 0 && /*#__PURE__*/React.createElement("div", {
      className: "bg-white border border-slate-400 rounded-xl p-4",
      style: {
        minHeight: '200px'
      }
    }, /*#__PURE__*/React.createElement("canvas", {
      ref: flagsChartRef
    }))),
    /* ── Assessment Workflow Guide ── */
    React.createElement("div", { className: "mb-4 bg-gradient-to-br from-slate-50 to-indigo-50/50 rounded-xl border border-slate-400 overflow-hidden" },
      React.createElement("button", { onClick: function() { setShowAssessmentGuide(function(p) { return !p; }); }, className: "w-full px-4 py-3 flex items-center justify-between hover:bg-white/50 transition-colors", "aria-expanded": showAssessmentGuide ? "true" : "false" },
        React.createElement("div", { className: "flex items-center gap-2" },
          React.createElement("span", { className: "text-base" }, "\uD83E\uDDED"),
          React.createElement("span", { className: "text-sm font-bold text-slate-700" }, "Assessment Workflow Guide"),
          React.createElement("span", { className: "text-[11px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold" }, "Which probe should I use?")
        ),
        React.createElement("span", { className: "text-slate-600 text-xs" }, showAssessmentGuide ? "\u25B2 Hide" : "\u25BC Show")
      ),
      showAssessmentGuide ? React.createElement("div", { className: "px-4 pb-4 space-y-3 animate-in fade-in duration-200" },
        React.createElement("div", { className: "bg-white rounded-lg p-3 border border-emerald-200" },
          React.createElement("div", { className: "flex items-center gap-2 mb-2" },
            React.createElement("span", { className: "w-2 h-2 rounded-full bg-emerald-500" }),
            React.createElement("h4", { className: "text-xs font-bold text-emerald-800 uppercase tracking-wide" }, "Universal Screening (Fall / Winter / Spring)")
          ),
          React.createElement("p", { className: "text-xs text-slate-600 mb-2" }, "Administer to ALL students 3x per year to identify who needs intervention. ~15 min per student."),
          React.createElement("div", { className: "flex flex-wrap gap-1" },
            React.createElement("span", { className: "text-[11px] bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md font-semibold border border-emerald-200" }, "K-1: LNF + NWF + ORF"),
            React.createElement("span", { className: "text-[11px] bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md font-semibold border border-emerald-200" }, "2-3: ORF + Math Fluency"),
            React.createElement("span", { className: "text-[11px] bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md font-semibold border border-emerald-200" }, "4+: ORF + Math Fluency")
          ),
          React.createElement("p", { className: "text-[11px] text-slate-600 mt-1.5 italic" }, "Use Form A (Fall), Form B (Winter), Form C (Spring) to avoid practice effects.")
        ),
        React.createElement("div", { className: "bg-white rounded-lg p-3 border border-amber-200" },
          React.createElement("div", { className: "flex items-center gap-2 mb-2" },
            React.createElement("span", { className: "w-2 h-2 rounded-full bg-amber-500" }),
            React.createElement("h4", { className: "text-xs font-bold text-amber-800 uppercase tracking-wide" }, "Progress Monitoring (Bi-Weekly or Weekly)")
          ),
          React.createElement("p", { className: "text-xs text-slate-600 mb-2" }, "For Tier 2/3 students. Track growth to evaluate whether the intervention is working."),
          React.createElement("div", { className: "flex flex-wrap gap-1" },
            React.createElement("span", { className: "text-[11px] bg-amber-50 text-amber-700 px-2 py-1 rounded-md font-semibold border border-amber-200" }, "Reading: ORF (same grade-level passages)"),
            React.createElement("span", { className: "text-[11px] bg-amber-50 text-amber-700 px-2 py-1 rounded-md font-semibold border border-amber-200" }, "Math: DCPM (same operation type)")
          ),
          React.createElement("p", { className: "text-[11px] text-slate-600 mt-1.5 italic" }, "Aim for 8+ data points before making instructional decisions.")
        ),
        React.createElement("div", { className: "bg-white rounded-lg p-3 border border-violet-200" },
          React.createElement("div", { className: "flex items-center gap-2 mb-2" },
            React.createElement("span", { className: "w-2 h-2 rounded-full bg-violet-500" }),
            React.createElement("h4", { className: "text-xs font-bold text-violet-800 uppercase tracking-wide" }, "Diagnostic Deep-Dive")
          ),
          React.createElement("p", { className: "text-xs text-slate-600 mb-2" }, "When screening identifies a concern \u2014 pinpoint the specific skill deficit."),
          React.createElement("div", { className: "flex flex-wrap gap-1" },
            React.createElement("span", { className: "text-[11px] bg-violet-50 text-violet-700 px-2 py-1 rounded-md font-semibold border border-violet-200" }, "Decoding: NWF"),
            React.createElement("span", { className: "text-[11px] bg-violet-50 text-violet-700 px-2 py-1 rounded-md font-semibold border border-violet-200" }, "Letter knowledge: LNF"),
            React.createElement("span", { className: "text-[11px] bg-violet-50 text-violet-700 px-2 py-1 rounded-md font-semibold border border-violet-200" }, "Naming speed: RAN"),
            React.createElement("span", { className: "text-[11px] bg-violet-50 text-violet-700 px-2 py-1 rounded-md font-semibold border border-violet-200" }, "Full battery: Benchmark Battery")
          ),
          React.createElement("p", { className: "text-[11px] text-slate-600 mt-1.5 italic" }, "Low ORF + adequate NWF = fluency deficit (practice). Low ORF + low NWF = decoding deficit (phonics).")
        ),
        React.createElement("div", { className: "bg-slate-100 rounded-lg p-3" },
          React.createElement("h4", { className: "text-xs font-bold text-slate-700 mb-2" }, "\uD83D\uDCCA Quick Interpretation"),
          React.createElement("div", { className: "grid grid-cols-3 gap-2 text-center" },
            React.createElement("div", { className: "bg-emerald-50 rounded-lg p-2 border border-emerald-200" }, React.createElement("div", { className: "text-[11px] font-bold text-emerald-700" }, "\u2265 40th %ile"), React.createElement("div", { className: "text-[11px] text-emerald-600" }, "Tier 1: On Track")),
            React.createElement("div", { className: "bg-amber-50 rounded-lg p-2 border border-amber-200" }, React.createElement("div", { className: "text-[11px] font-bold text-amber-700" }, "15th-39th %ile"), React.createElement("div", { className: "text-[11px] text-amber-600" }, "Tier 2: Strategic")),
            React.createElement("div", { className: "bg-red-50 rounded-lg p-2 border border-red-200" }, React.createElement("div", { className: "text-[11px] font-bold text-red-700" }, "< 15th %ile"), React.createElement("div", { className: "text-[11px] text-red-600" }, "Tier 3: Intensive"))
          ),
          React.createElement("p", { className: "text-[11px] text-slate-600 mt-2 italic" }, "General guidelines. Use RTI Settings to customize for your district norms.")
        )
      ) : null
    ),
    /*#__PURE__*/React.createElement("div", {
      className: "mb-4 p-4 bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-xl",
      "data-help-key": "assessment_probe_launcher"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 mb-3"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-base"
    }, "\uD83D\uDCCB"), /*#__PURE__*/React.createElement("h3", {
      className: "text-sm font-bold text-slate-700"
    }, t('probes.benchmark_battery')), /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] font-bold text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full uppercase tracking-wider"
    }, "Standardized")), /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-slate-600 mb-3"
    }, "Curated word lists with fixed activity order per grade. No gamification \u2014 designed for formal assessment."), /*#__PURE__*/React.createElement("div", {
      className: "flex gap-2 items-center flex-wrap"
    }, /*#__PURE__*/React.createElement("select", {
      "aria-label": t('common.probe_grade'),
      value: probeGradeLevel,
      onChange: e => {
        const g = e.target.value;
        setProbeGradeLevel(g);
        const batteries = {
          K: 'segmentation',
          '1': 'segmentation',
          '2': 'segmentation',
          '3-5': 'segmentation'
        };
        setProbeActivity(batteries[g] || 'segmentation');
      },
      className: "text-xs font-bold border border-violet-600 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-300"
    }, /*#__PURE__*/React.createElement("option", {
      value: "K"
    }, t('probes.grade_k')), /*#__PURE__*/React.createElement("option", {
      value: "1"
    }, "Grade 1"), /*#__PURE__*/React.createElement("option", {
      value: "2"
    }, "Grade 2"), /*#__PURE__*/React.createElement("option", {
      value: "3-5"
    }, "Grade 3-5")), /*#__PURE__*/React.createElement("select", {
      "aria-label": t('common.probe_form'),
      value: mathProbeForm,
      onChange: e => setMathProbeForm(e.target.value),
      className: "text-xs font-bold border border-violet-600 rounded-lg px-3 py-2 bg-violet-50 text-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-300"
    }, /*#__PURE__*/React.createElement("option", {
      value: "A"
    }, "Form A (Fall)"), /*#__PURE__*/React.createElement("option", {
      value: "B"
    }, "Form B (Winter)"), /*#__PURE__*/React.createElement("option", {
      value: "C"
    }, "Form C (Spring)")), /*#__PURE__*/React.createElement("select", {
      "aria-label": t('common.probe_student'),
      value: probeTargetStudent || '',
      onChange: e => setProbeTargetStudent(e.target.value || null),
      className: "text-xs font-bold border border-slate-400 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-300"
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "\uD83C\uDFAF Practice Mode (No Student)"), importedStudents.map(s => /*#__PURE__*/React.createElement("option", {
      key: s.id || s.nickname,
      value: s.nickname || s.name
    }, s.nickname || s.name))), /*#__PURE__*/React.createElement("button", {
      onClick: () => launchBenchmarkProbe(probeGradeLevel, probeActivity, mathProbeForm),
      "aria-label": t('common.run_benchmark_probe'),
      className: "flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-lg font-bold text-sm hover:from-violet-600 hover:to-purple-600 transition-all shadow-md"
    }, "\u25B6 Start Battery")), /*#__PURE__*/React.createElement("div", {
      className: "mt-2 flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] text-slate-600 font-semibold"
    }, "Battery order:"), (GRADE_SUBTEST_BATTERIES[probeGradeLevel] || []).map((act, i, arr) => /*#__PURE__*/React.createElement("span", {
      key: act,
      className: "text-[11px] font-bold text-violet-600"
    }, act.charAt(0).toUpperCase() + act.slice(1), i < arr.length - 1 ? ' →' : '')))), /*#__PURE__*/React.createElement("div", {
      className: "bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-4 mb-4 border border-orange-200"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 mb-3"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-base"
    }, "\uD83D\uDD22"), /*#__PURE__*/React.createElement("h3", {
      className: "text-sm font-bold text-slate-700"
    }, t('probes.math_fluency')), /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] font-bold text-orange-800 bg-orange-100 px-2 py-0.5 rounded-full uppercase tracking-wider"
    }, "Standardized")), /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-slate-600 mb-3"
    }, "Fixed problem sets with DCPM scoring. 25 problems, 2-minute timer. Forms A/B/C for progress monitoring."), /*#__PURE__*/React.createElement("div", {
      className: "flex gap-2 items-center flex-wrap"
    }, /*#__PURE__*/React.createElement("select", {
      "aria-label": "Math probe grade",
      value: mathProbeGrade || "1",
      onChange: e => setMathProbeGrade(e.target.value),
      className: "text-xs font-bold border border-orange-600 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-300"
    }, /*#__PURE__*/React.createElement("option", {
      value: "K"
    }, t('probes.grade_k')), /*#__PURE__*/React.createElement("option", {
      value: "1"
    }, "Grade 1"), /*#__PURE__*/React.createElement("option", {
      value: "2"
    }, "Grade 2"), /*#__PURE__*/React.createElement("option", {
      value: "3"
    }, "Grade 3"), /*#__PURE__*/React.createElement("option", {
      value: "4"
    }, "Grade 4"), /*#__PURE__*/React.createElement("option", {
      value: "5"
    }, "Grade 5")), /*#__PURE__*/React.createElement("select", {
      "aria-label": "Math probe form",
      value: mathProbeForm || "A",
      onChange: e => setMathProbeForm(e.target.value),
      className: "text-xs font-bold border border-orange-600 rounded-lg px-3 py-2 bg-orange-50 text-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-300"
    }, /*#__PURE__*/React.createElement("option", {
      value: "A"
    }, "Form A (Fall)"), /*#__PURE__*/React.createElement("option", {
      value: "B"
    }, "Form B (Winter)"), /*#__PURE__*/React.createElement("option", {
      value: "C"
    }, "Form C (Spring)")), /*#__PURE__*/React.createElement("select", {
      "aria-label": "Math probe student",
      value: mathProbeStudent || "",
      onChange: e => setMathProbeStudent(e.target.value || null),
      className: "text-xs font-bold border border-slate-400 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-300"
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "\uD83C\uDFAF Practice Mode (No Student)"), importedStudents.map(s => /*#__PURE__*/React.createElement("option", {
      key: s.id || s.nickname,
      value: s.nickname || s.name
    }, s.nickname || s.name))), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        const grade = mathProbeGrade || "1";
        const form = mathProbeForm || "A";
        if (!window.MATH_PROBE_BANKS || !window.MATH_PROBE_BANKS[grade] || !window.MATH_PROBE_BANKS[grade][form]) {
          addToast("Math probes not loaded yet — please wait and try again", "error");
          loadPsychometricProbes();
          return;
        }
        const probeData = window.MATH_PROBE_BANKS[grade][form];
        const problems = probeData.problems.map(p => ({
          ...p,
          studentAnswer: null,
          correct: null
        }));
        setMathFluencyOperation(probeData.operation);
        setMathFluencyDifficulty(probeData.difficulty);
        setMathFluencyTimeLimit(probeData.timeLimit);
        setMathFluencyProblems(problems);
        setMathFluencyCurrentIndex(0);
        setMathFluencyResults(null);
        setMathFluencyStudentInput("");
        setMathFluencyTimer(probeData.timeLimit);
        setMathFluencyActive(true);
        if (mathFluencyTimerRef.current) clearInterval(mathFluencyTimerRef.current);
        mathFluencyTimerRef.current = setInterval(() => {
          setMathFluencyTimer(prev => {
            if (prev <= 1) {
              clearInterval(mathFluencyTimerRef.current);
              mathFluencyTimerRef.current = null;
              setTimeout(() => finishMathFluencyProbe(), 0);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        setTimeout(() => mathFluencyInputRef.current?.focus(), 100);
      },
      "aria-label": "Start math probe",
      className: "flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg font-bold text-sm hover:from-orange-600 hover:to-amber-600 transition-all shadow-md"
    }, "\u25B6 Start Math Probe")), /*#__PURE__*/React.createElement("div", {
      className: "mt-2 text-[11px] text-slate-600 font-semibold"
    }, window.MATH_PROBE_BANKS && window.MATH_PROBE_BANKS[mathProbeGrade || "1"] && window.MATH_PROBE_BANKS[mathProbeGrade || "1"][mathProbeForm || "A"] ? `✅ ${window.MATH_PROBE_BANKS[mathProbeGrade || "1"][mathProbeForm || "A"].problems.length} problems · ${window.MATH_PROBE_BANKS[mathProbeGrade || "1"][mathProbeForm || "A"].operation} · ${window.MATH_PROBE_BANKS[mathProbeGrade || "1"][mathProbeForm || "A"].difficulty}` : "⏳ Loading math probes...")), /*#__PURE__*/React.createElement("div", {
      className: "bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-4 mb-4 border border-emerald-200"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 mb-3"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-base"
    }, "\uD83D\uDCD6"), /*#__PURE__*/React.createElement("h3", {
      className: "text-sm font-bold text-slate-700"
    }, t('probes.literacy_fluency')), /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider"
    }, "Standardized")), /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-slate-600 mb-3"
    }, "Nonsense Word Fluency (NWF), Letter Naming Fluency (LNF), and Rapid Automatized Naming (RAN) assessments."), /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-1 sm:grid-cols-3 gap-2"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        const grade = nwfGrade || 'K';
        const form = nwfForm || 'A';
        if (!window.NWF_PROBE_BANKS || !window.NWF_PROBE_BANKS[grade] || !window.NWF_PROBE_BANKS[grade][form]) {
          addToast('NWF probes not loaded yet — loading now', 'error');
          loadPsychometricProbes();
          return;
        }
        const data = window.NWF_PROBE_BANKS[grade][form];
        setNwfProbeWords(data.words.map((w, i) => ({
          word: w,
          index: i,
          scored: false,
          correct: false
        })));
        setNwfProbeIndex(0);
        setNwfProbeResults(null);
        setNwfProbeTimer(data.timeLimit || 60);
        setNwfProbeGrade(grade);
        setNwfProbeActive(true);
        // Timer starts after ProbeOverlay countdown completes (via onCountdownDone)
        setProbeTimerPending({ type: 'nwf', timeLimit: data.timeLimit || 60 });
      },
      className: "flex items-center gap-2 px-3 py-2.5 bg-white border-2 border-emerald-600 text-slate-700 rounded-lg font-bold text-xs hover:bg-emerald-50 hover:border-emerald-400 transition-all"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-base"
    }, "\uD83D\uDD24"), /*#__PURE__*/React.createElement("div", {
      className: "text-left"
    }, /*#__PURE__*/React.createElement("div", {
      className: "font-bold"
    }, "NWF"), /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] text-slate-600 font-normal"
    }, t('probes.nwf')))), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        const grade = 'K';
        const form = lnfForm || 'A';
        if (!window.LNF_PROBE_BANKS || !window.LNF_PROBE_BANKS[grade] || !window.LNF_PROBE_BANKS[grade][form]) {
          addToast('LNF probes not loaded yet — loading now', 'error');
          loadPsychometricProbes();
          return;
        }
        const data = window.LNF_PROBE_BANKS[grade][form];
        setLnfProbeLetters(data.letters.map((l, i) => ({
          letter: l,
          index: i,
          scored: false,
          correct: false
        })));
        setLnfProbeIndex(0);
        setLnfProbeResults(null);
        setLnfProbeTimer(data.timeLimit || 60);
        setLnfProbeActive(true);
        setProbeTimerPending({ type: 'lnf', timeLimit: data.timeLimit || 60 });
      },
      className: "flex items-center gap-2 px-3 py-2.5 bg-white border-2 border-emerald-600 text-slate-700 rounded-lg font-bold text-xs hover:bg-emerald-50 hover:border-emerald-400 transition-all"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-base"
    }, "\uD83C\uDD70\uFE0F"), /*#__PURE__*/React.createElement("div", {
      className: "text-left"
    }, /*#__PURE__*/React.createElement("div", {
      className: "font-bold"
    }, "LNF"), /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] text-slate-600 font-normal"
    }, t('probes.lnf')))), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        const grade = ranGrade || 'K';
        const form = ranForm || 'A';
        if (!window.RAN_PROBE_BANKS || !window.RAN_PROBE_BANKS[grade] || !window.RAN_PROBE_BANKS[grade][form]) {
          addToast('RAN probes not loaded yet — loading now', 'error');
          loadPsychometricProbes();
          return;
        }
        const data = window.RAN_PROBE_BANKS[grade][form];
        setRanProbeItems(data.items.map((item, i) => ({
          item: String(item),
          index: i,
          scored: false,
          correct: false
        })));
        setRanProbeIndex(0);
        setRanProbeResults(null);
        setRanProbeElapsed(0);
        setRanProbeType(data.type || 'colors');
        setRanProbeGrade(grade);
        setRanProbeActive(true);
        setProbeTimerPending({ type: 'ran' });
      },
      className: "flex items-center gap-2 px-3 py-2.5 bg-white border-2 border-emerald-600 text-slate-700 rounded-lg font-bold text-xs hover:bg-emerald-50 hover:border-emerald-400 transition-all"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-base"
    }, "\u26A1"), /*#__PURE__*/React.createElement("div", {
      className: "text-left"
    }, /*#__PURE__*/React.createElement("div", {
      className: "font-bold"
    }, "RAN"), /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] text-slate-600 font-normal"
    }, t('probes.ran')))))), nwfProbeActive && /*#__PURE__*/React.createElement("div", {
      className: "mt-4 bg-white rounded-xl border-2 border-emerald-300 p-6 shadow-lg animate-in fade-in slide-in-from-top-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between mb-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-3"
    }, /*#__PURE__*/React.createElement("span", {
      className: "bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold"
    }, "\uD83D\uDD24 NWF PROBE"), /*#__PURE__*/React.createElement("span", {
      className: "text-sm font-medium text-slate-600"
    }, "Word ", nwfProbeIndex + 1, " of ", nwfProbeWords.length)), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-3"
    }, /*#__PURE__*/React.createElement("span", {
      className: `tabular-nums px-3 py-1 rounded-full text-sm font-bold ${nwfProbeTimer <= 10 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-slate-100 text-slate-700'}`
    }, "\u23F1 ", Math.floor(nwfProbeTimer / 60), ":", String(nwfProbeTimer % 60).padStart(2, '0')), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        if (window.confirm("End NWF probe early?")) {
          clearInterval(nwfProbeTimerRef.current);
          nwfProbeTimerRef.current = null;
          const scored = nwfProbeWords.filter(w => w.scored);
          const correct = scored.filter(w => w.correct).length;
          const cls = scored.reduce((sum, w) => sum + (w.correct ? w.word.length : 0), 0);
          setNwfProbeResults({
            correctWords: correct,
            totalScored: scored.length,
            cls,
            totalWords: nwfProbeWords.length,
            type: 'nwf',
            grade: nwfProbeGrade
          });
          setNwfProbeActive(false);
        }
      },
      className: "text-xs text-red-500 hover:text-red-700 font-bold"
    }, "\u23F9 End Early"))), /*#__PURE__*/React.createElement("div", {
      className: "w-full bg-slate-100 rounded-full h-2 mb-6"
    }, /*#__PURE__*/React.createElement("div", { role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100",
      className: "bg-emerald-500 h-2 rounded-full transition-all",
      style: {
        width: `${nwfProbeIndex / nwfProbeWords.length * 100}%`
      }
    })), /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-slate-600 mb-3 font-semibold uppercase tracking-wider text-center"
    }, "Say: \u201CLook at this word. Tell me the sounds.\u201D \u2014 Score each sound"), nwfProbeTimer > 0 && nwfProbeIndex < nwfProbeWords.length ? (() => {
      const currentWord = nwfProbeWords[nwfProbeIndex];
      const markWord = isCorrect => {
        const updated = [...nwfProbeWords];
        updated[nwfProbeIndex] = {
          ...updated[nwfProbeIndex],
          scored: true,
          correct: isCorrect
        };
        setNwfProbeWords(updated);
        if (nwfProbeIndex + 1 < nwfProbeWords.length) {
          setNwfProbeIndex(nwfProbeIndex + 1);
        } else {
          clearInterval(nwfProbeTimerRef.current);
          nwfProbeTimerRef.current = null;
          const scored = updated.filter(w => w.scored);
          const correct = scored.filter(w => w.correct).length;
          const cls = scored.reduce((sum, w) => sum + (w.correct ? w.word.length : 0), 0);
          setNwfProbeResults({
            correctWords: correct,
            totalScored: scored.length,
            cls,
            totalWords: updated.length,
            type: 'nwf',
            grade: nwfProbeGrade
          });
          setNwfProbeActive(false);
        }
      };
      return /*#__PURE__*/React.createElement("div", { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },
        className: "text-center"
      }, /*#__PURE__*/React.createElement("p", {
        className: "text-xs text-slate-600 mb-2 font-semibold uppercase tracking-wider"
      }, "Student reads aloud \u2014 Teacher scores"), /*#__PURE__*/React.createElement("div", {
        className: "bg-gradient-to-br from-slate-50 to-emerald-50 rounded-2xl p-8 mb-6 border border-emerald-100"
      }, /*#__PURE__*/React.createElement("div", {
        className: "text-6xl font-bold text-slate-800 tracking-[0.15em] font-mono select-none"
      }, currentWord.word)), /*#__PURE__*/React.createElement("div", {
        className: "flex items-center justify-center gap-4"
      }, /*#__PURE__*/React.createElement("button", {
        onClick: () => markWord(true),
        className: "flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold text-lg hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg shadow-green-200 active:scale-95"
      }, "\u2705 Correct"), /*#__PURE__*/React.createElement("button", {
        onClick: () => markWord(false),
        className: "flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl font-bold text-lg hover:from-red-600 hover:to-rose-600 transition-all shadow-lg shadow-red-200 active:scale-95"
      }, "\u274C Incorrect"), /*#__PURE__*/React.createElement("button", {
        onClick: () => {
          if (nwfProbeIndex + 1 < nwfProbeWords.length) {
            setNwfProbeIndex(nwfProbeIndex + 1);
          } else {
            clearInterval(nwfProbeTimerRef.current);
            nwfProbeTimerRef.current = null;
            const scored = nwfProbeWords.filter(w => w.scored);
            const correct = scored.filter(w => w.correct).length;
            const cls = scored.reduce((sum, w) => sum + (w.correct ? w.word.length : 0), 0);
            setNwfProbeResults({
              correctWords: correct,
              totalScored: scored.length,
              cls,
              totalWords: nwfProbeWords.length,
              type: 'nwf',
              grade: nwfProbeGrade
            });
            setNwfProbeActive(false);
          }
        },
        className: "text-sm text-slate-600 hover:text-slate-600 font-bold px-4 py-2"
      }, "Skip \u2192")), /*#__PURE__*/React.createElement("div", {
        className: "mt-4 flex items-center justify-center gap-2 text-xs text-slate-600"
      }, /*#__PURE__*/React.createElement("span", {
        className: "text-green-500 font-bold"
      }, nwfProbeWords.filter(w => w.scored && w.correct).length, " correct"), /*#__PURE__*/React.createElement("span", null, "\xB7"), /*#__PURE__*/React.createElement("span", {
        className: "text-red-500 font-bold"
      }, nwfProbeWords.filter(w => w.scored && !w.correct).length, " incorrect")));
    })() : /*#__PURE__*/React.createElement("div", {
      className: "text-center py-4"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-lg font-bold text-red-600"
    }, "\u23F0 Time's Up!"))), nwfProbeResults && /*#__PURE__*/React.createElement("div", {
      className: "mt-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-4",
      "data-probe-results": "nwf"
    }, /*#__PURE__*/React.createElement("h4", {
      className: "font-bold text-slate-700 mb-2"
    }, "\uD83D\uDD24 NWF Probe Results"), /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-4 gap-3 text-center mb-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-lg p-3 shadow-sm"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-2xl font-bold text-emerald-600"
    }, nwfProbeResults.cls), /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-slate-600"
    }, "CLS"), /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] text-slate-600"
    }, "Correct Letter Sounds")), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-lg p-3 shadow-sm"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-2xl font-bold text-green-600"
    }, nwfProbeResults.correctWords), /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-slate-600"
    }, "Words Correct")), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-lg p-3 shadow-sm"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-2xl font-bold text-slate-700"
    }, nwfProbeResults.totalScored), /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-slate-600"
    }, "Words Scored")), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-lg p-3 shadow-sm"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-2xl font-bold text-indigo-600"
    }, nwfProbeResults.totalScored > 0 ? Math.round(nwfProbeResults.correctWords / nwfProbeResults.totalScored * 100) : 0, "%"), /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-slate-600"
    }, "Accuracy"))), mathProbeStudent && /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setLatestProbeResult({
          student: mathProbeStudent,
          type: 'nwf',
          date: new Date().toISOString(),
          cls: nwfProbeResults.cls,
          correctWords: nwfProbeResults.correctWords,
          totalScored: nwfProbeResults.totalScored,
          accuracy: nwfProbeResults.totalScored > 0 ? Math.round(nwfProbeResults.correctWords / nwfProbeResults.totalScored * 100) : 0,
          grade: nwfProbeGrade,
          form: nwfForm
        });
        addToast('NWF results saved for ' + mathProbeStudent, 'success');
      },
      className: "w-full mt-2 px-4 py-2 bg-emerald-700 text-white rounded-lg font-bold text-sm hover:bg-emerald-600 transition-colors"
    }, "\uD83D\uDCBE Save to Student Record"),
    renderProbeInterpretation('nwf_cls', nwfProbeResults.cls, nwfProbeGrade),
    /*#__PURE__*/React.createElement("button", {
      onClick: () => printClinicalProbeReport('nwf', nwfProbeResults, nwfProbeGrade, nwfForm, mathProbeStudent),
      className: "w-full mt-1 px-4 py-1.5 bg-slate-50 text-slate-600 rounded-lg font-bold text-xs hover:bg-slate-100 transition-colors"
    }, "\uD83D\uDDA8\uFE0F Print Clinical Report"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setNwfProbeResults(null),
      className: "w-full mt-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-200 transition-colors"
    }, "Dismiss Results")), lnfProbeActive && /*#__PURE__*/React.createElement("div", {
      className: "mt-4 bg-white rounded-xl border-2 border-blue-300 p-6 shadow-lg animate-in fade-in slide-in-from-top-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between mb-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-3"
    }, /*#__PURE__*/React.createElement("span", {
      className: "bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold"
    }, "\uD83C\uDD70\uFE0F LNF PROBE"), /*#__PURE__*/React.createElement("span", {
      className: "text-sm font-medium text-slate-600"
    }, "Letter ", lnfProbeIndex + 1, " of ", lnfProbeLetters.length)), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-3"
    }, /*#__PURE__*/React.createElement("span", {
      className: `tabular-nums px-3 py-1 rounded-full text-sm font-bold ${lnfProbeTimer <= 10 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-slate-100 text-slate-700'}`
    }, "\u23F1 ", Math.floor(lnfProbeTimer / 60), ":", String(lnfProbeTimer % 60).padStart(2, '0')), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        if (window.confirm("End LNF probe early?")) {
          clearInterval(lnfProbeTimerRef.current);
          lnfProbeTimerRef.current = null;
          const scored = lnfProbeLetters.filter(l => l.scored);
          const correct = scored.filter(l => l.correct).length;
          setLnfProbeResults({
            correct,
            totalScored: scored.length,
            totalLetters: lnfProbeLetters.length,
            lpm: correct,
            type: 'lnf'
          });
          setLnfProbeActive(false);
        }
      },
      className: "text-xs text-red-500 hover:text-red-700 font-bold"
    }, "\u23F9 End Early"))), /*#__PURE__*/React.createElement("div", {
      className: "w-full bg-slate-100 rounded-full h-2 mb-4"
    }, /*#__PURE__*/React.createElement("div", { role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100",
      className: "bg-blue-500 h-2 rounded-full transition-all",
      style: {
        width: `${lnfProbeIndex / lnfProbeLetters.length * 100}%`
      }
    })), lnfProbeTimer > 0 && lnfProbeIndex < lnfProbeLetters.length ? (() => {
      const markLetter = isCorrect => {
        const updated = [...lnfProbeLetters];
        updated[lnfProbeIndex] = {
          ...updated[lnfProbeIndex],
          scored: true,
          correct: isCorrect
        };
        setLnfProbeLetters(updated);
        if (lnfProbeIndex + 1 < lnfProbeLetters.length) {
          setLnfProbeIndex(lnfProbeIndex + 1);
        } else {
          clearInterval(lnfProbeTimerRef.current);
          lnfProbeTimerRef.current = null;
          const scored = updated.filter(l => l.scored);
          const correct = scored.filter(l => l.correct).length;
          setLnfProbeResults({
            correct,
            totalScored: scored.length,
            totalLetters: updated.length,
            lpm: correct,
            type: 'lnf'
          });
          setLnfProbeActive(false);
        }
      };
      return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
        className: "text-xs text-slate-600 mb-3 font-semibold uppercase tracking-wider text-center"
      }, "Student names each letter \u2014 Teacher scores"), /*#__PURE__*/React.createElement("p", {
        className: "text-xs text-slate-600 mb-3 font-semibold uppercase tracking-wider text-center"
      }, "Say: \u201CPoint to each letter and tell me its name.\u201D Start timing on first response"), /*#__PURE__*/React.createElement("div", {
        className: "grid grid-cols-10 gap-1 mb-6"
      }, lnfProbeLetters.map((item, idx) => /*#__PURE__*/React.createElement("div", {
        key: idx,
        className: `flex items-center justify-center w-9 h-9 rounded-lg text-lg font-bold transition-all cursor-default ${idx === lnfProbeIndex ? 'bg-blue-700 text-white ring-2 ring-blue-300 ring-offset-1 scale-110 shadow-lg' : idx < lnfProbeIndex && item.scored ? item.correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700 line-through' : idx < lnfProbeIndex ? 'bg-slate-100 text-slate-600' : 'bg-slate-50 text-slate-600'}`
      }, item.letter))), /*#__PURE__*/React.createElement("div", {
        className: "flex items-center justify-center gap-4"
      }, /*#__PURE__*/React.createElement("button", {
        onClick: () => markLetter(true),
        className: "flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold text-lg hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg shadow-green-200 active:scale-95"
      }, "\u2705 Correct"), /*#__PURE__*/React.createElement("button", {
        onClick: () => markLetter(false),
        className: "flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl font-bold text-lg hover:from-red-600 hover:to-rose-600 transition-all shadow-lg shadow-red-200 active:scale-95"
      }, "\u274C Incorrect"), /*#__PURE__*/React.createElement("button", {
        onClick: () => {
          if (lnfProbeIndex + 1 < lnfProbeLetters.length) {
            setLnfProbeIndex(lnfProbeIndex + 1);
          } else {
            clearInterval(lnfProbeTimerRef.current);
            lnfProbeTimerRef.current = null;
            const scored = lnfProbeLetters.filter(l => l.scored);
            const correct = scored.filter(l => l.correct).length;
            setLnfProbeResults({
              correct,
              totalScored: scored.length,
              totalLetters: lnfProbeLetters.length,
              lpm: correct,
              type: 'lnf'
            });
            setLnfProbeActive(false);
          }
        },
        className: "text-sm text-slate-600 hover:text-slate-600 font-bold px-4 py-2"
      }, "Skip \u2192")), /*#__PURE__*/React.createElement("div", {
        className: "mt-4 flex items-center justify-center gap-2 text-xs text-slate-600"
      }, /*#__PURE__*/React.createElement("span", {
        className: "text-green-500 font-bold"
      }, lnfProbeLetters.filter(l => l.scored && l.correct).length, " correct"), /*#__PURE__*/React.createElement("span", null, "\xB7"), /*#__PURE__*/React.createElement("span", {
        className: "text-red-500 font-bold"
      }, lnfProbeLetters.filter(l => l.scored && !l.correct).length, " incorrect")));
    })() : /*#__PURE__*/React.createElement("div", {
      className: "text-center py-4"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-lg font-bold text-red-600"
    }, "\u23F0 Time's Up!"))), lnfProbeResults && /*#__PURE__*/React.createElement("div", {
      className: "mt-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4",
      "data-probe-results": "lnf"
    }, /*#__PURE__*/React.createElement("h4", {
      className: "font-bold text-slate-700 mb-2"
    }, "\uD83C\uDD70\uFE0F LNF Probe Results"), /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-3 gap-3 text-center mb-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-lg p-3 shadow-sm"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-2xl font-bold text-blue-600"
    }, lnfProbeResults.lpm), /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-slate-600"
    }, "LPM"), /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] text-slate-600"
    }, "Letters Per Minute")), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-lg p-3 shadow-sm"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-2xl font-bold text-slate-700"
    }, lnfProbeResults.totalScored), /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-slate-600"
    }, "Letters Scored")), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-lg p-3 shadow-sm"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-2xl font-bold text-indigo-600"
    }, lnfProbeResults.totalScored > 0 ? Math.round(lnfProbeResults.correct / lnfProbeResults.totalScored * 100) : 0, "%"), /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-slate-600"
    }, "Accuracy"))), mathProbeStudent && /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setLatestProbeResult({
          student: mathProbeStudent,
          type: 'lnf',
          date: new Date().toISOString(),
          lpm: lnfProbeResults.lpm,
          correct: lnfProbeResults.correct,
          totalScored: lnfProbeResults.totalScored,
          accuracy: lnfProbeResults.totalScored > 0 ? Math.round(lnfProbeResults.correct / lnfProbeResults.totalScored * 100) : 0,
          grade: 'K',
          form: lnfForm
        });
        addToast('LNF results saved for ' + mathProbeStudent, 'success');
      },
      className: "w-full mt-2 px-4 py-2 bg-blue-700 text-white rounded-lg font-bold text-sm hover:bg-blue-600 transition-colors"
    }, "\uD83D\uDCBE Save to Student Record"),
    renderProbeInterpretation('lnf', lnfProbeResults.correct, 'K'),
    /*#__PURE__*/React.createElement("button", {
      onClick: () => printClinicalProbeReport('lnf', lnfProbeResults, 'K', lnfForm, mathProbeStudent),
      className: "w-full mt-1 px-4 py-1.5 bg-slate-50 text-slate-600 rounded-lg font-bold text-xs hover:bg-slate-100 transition-colors"
    }, "\uD83D\uDDA8\uFE0F Print Clinical Report"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setLnfProbeResults(null),
      className: "w-full mt-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-200 transition-colors"
    }, "Dismiss Results")), ranProbeActive && /*#__PURE__*/React.createElement("div", {
      className: "mt-4 bg-white rounded-xl border-2 border-amber-300 p-6 shadow-lg animate-in fade-in slide-in-from-top-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between mb-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-3"
    }, /*#__PURE__*/React.createElement("span", {
      className: "bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold"
    }, "\u26A1 RAN PROBE"), /*#__PURE__*/React.createElement("span", {
      className: "text-sm font-medium text-slate-600"
    }, "Item ", ranProbeIndex + 1, " of ", ranProbeItems.length), /*#__PURE__*/React.createElement("span", {
      className: "text-xs text-slate-600 capitalize"
    }, ranProbeType)), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-3"
    }, /*#__PURE__*/React.createElement("span", {
      className: "tabular-nums px-3 py-1 rounded-full text-sm font-bold bg-amber-100 text-amber-700"
    }, "\u23F1 ", Math.floor(ranProbeElapsed / 60), ":", String(ranProbeElapsed % 60).padStart(2, '0')), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        if (window.confirm("End RAN probe early?")) {
          clearInterval(ranProbeTimerRef.current);
          ranProbeTimerRef.current = null;
          const scored = ranProbeItems.filter(it => it.scored);
          const correct = scored.filter(it => it.correct).length;
          const elapsed = Math.round((Date.now() - ranProbeStartRef.current) / 1000);
          setRanProbeResults({
            correct,
            totalScored: scored.length,
            totalItems: ranProbeItems.length,
            elapsedSeconds: elapsed,
            type: 'ran',
            subType: ranProbeType,
            grade: ranProbeGrade
          });
          setRanProbeActive(false);
        }
      },
      className: "text-xs text-red-500 hover:text-red-700 font-bold"
    }, "\u23F9 End Early"))), /*#__PURE__*/React.createElement("div", {
      className: "w-full bg-slate-100 rounded-full h-2 mb-4"
    }, /*#__PURE__*/React.createElement("div", { role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100",
      className: "bg-amber-500 h-2 rounded-full transition-all",
      style: {
        width: `${ranProbeIndex / ranProbeItems.length * 100}%`
      }
    })), ranProbeIndex < ranProbeItems.length ? (() => {
      const colorMap = {
        red: '#EF4444',
        blue: '#3B82F6',
        green: '#22C55E',
        yellow: '#EAB308',
        black: '#1E293B'
      };
      const markItem = isCorrect => {
        const updated = [...ranProbeItems];
        updated[ranProbeIndex] = {
          ...updated[ranProbeIndex],
          scored: true,
          correct: isCorrect
        };
        setRanProbeItems(updated);
        if (ranProbeIndex + 1 < ranProbeItems.length) {
          setRanProbeIndex(ranProbeIndex + 1);
        } else {
          clearInterval(ranProbeTimerRef.current);
          ranProbeTimerRef.current = null;
          const elapsed = Math.round((Date.now() - ranProbeStartRef.current) / 1000);
          const scored = updated.filter(it => it.scored);
          const correct = scored.filter(it => it.correct).length;
          setRanProbeResults({
            correct,
            totalScored: scored.length,
            totalItems: updated.length,
            elapsedSeconds: elapsed,
            type: 'ran',
            subType: ranProbeType,
            grade: ranProbeGrade
          });
          setRanProbeActive(false);
        }
      };
      return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
        className: "text-xs text-slate-600 mb-3 font-semibold uppercase tracking-wider text-center"
      }, "Student names each item as fast as possible \u2014 Teacher scores"), /*#__PURE__*/React.createElement("div", {
        className: "grid grid-cols-10 gap-1.5 mb-6"
      }, ranProbeItems.map((entry, idx) => {
        const isColor = ranProbeType === 'colors';
        const bgColor = isColor && colorMap[entry.item] ? colorMap[entry.item] : undefined;
        const isCurrent = idx === ranProbeIndex;
        const isPast = idx < ranProbeIndex;
        return /*#__PURE__*/React.createElement("div", {
          key: idx,
          className: `flex items-center justify-center rounded-lg text-sm font-bold transition-all cursor-default ${isCurrent ? 'ring-2 ring-amber-400 ring-offset-1 scale-110 shadow-lg' : ''} ${isPast && entry.scored ? entry.correct ? 'opacity-40' : 'opacity-20 line-through' : ''} ${!isPast && !isCurrent ? 'opacity-60' : ''}`,
          style: {
            width: '2.25rem',
            height: '2.25rem',
            backgroundColor: isColor ? bgColor || '#94A3B8' : isCurrent ? '#F59E0B' : isPast ? entry.correct ? '#D1FAE5' : '#FEE2E2' : '#F1F5F9',
            color: isColor ? 'white' : isCurrent ? 'white' : '#334155',
            textShadow: isColor ? '0 1px 2px rgba(0,0,0,0.3)' : 'none'
          }
        }, isColor ? '' : entry.item);
      })), /*#__PURE__*/React.createElement("div", {
        className: "flex items-center justify-center gap-4"
      }, /*#__PURE__*/React.createElement("button", {
        onClick: () => markItem(true),
        className: "flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold text-lg hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg shadow-green-200 active:scale-95"
      }, "\u2705 Correct"), /*#__PURE__*/React.createElement("button", {
        onClick: () => markItem(false),
        className: "flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl font-bold text-lg hover:from-red-600 hover:to-rose-600 transition-all shadow-lg shadow-red-200 active:scale-95"
      }, "\u274C Incorrect"), /*#__PURE__*/React.createElement("button", {
        onClick: () => {
          if (ranProbeIndex + 1 < ranProbeItems.length) {
            setRanProbeIndex(ranProbeIndex + 1);
          } else {
            clearInterval(ranProbeTimerRef.current);
            ranProbeTimerRef.current = null;
            const elapsed = Math.round((Date.now() - ranProbeStartRef.current) / 1000);
            const scored = ranProbeItems.filter(it => it.scored);
            const correct = scored.filter(it => it.correct).length;
            setRanProbeResults({
              correct,
              totalScored: scored.length,
              totalItems: ranProbeItems.length,
              elapsedSeconds: elapsed,
              type: 'ran',
              subType: ranProbeType,
              grade: ranProbeGrade
            });
            setRanProbeActive(false);
          }
        },
        className: "text-sm text-slate-600 hover:text-slate-600 font-bold px-4 py-2"
      }, "Skip \u2192")), /*#__PURE__*/React.createElement("div", {
        className: "mt-4 flex items-center justify-center gap-2 text-xs text-slate-600"
      }, /*#__PURE__*/React.createElement("span", {
        className: "text-green-500 font-bold"
      }, ranProbeItems.filter(it => it.scored && it.correct).length, " correct"), /*#__PURE__*/React.createElement("span", null, "\xB7"), /*#__PURE__*/React.createElement("span", {
        className: "text-red-500 font-bold"
      }, ranProbeItems.filter(it => it.scored && !it.correct).length, " incorrect")));
    })() : null), ranProbeResults && /*#__PURE__*/React.createElement("div", {
      className: "mt-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200 p-4",
      "data-probe-results": "ran"
    }, /*#__PURE__*/React.createElement("h4", {
      className: "font-bold text-slate-700 mb-2"
    }, "\u26A1 RAN Probe Results"), /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-4 gap-3 text-center mb-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-lg p-3 shadow-sm"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-2xl font-bold text-amber-600"
    }, ranProbeResults.elapsedSeconds, "s"), /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-slate-600"
    }, "Completion Time")), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-lg p-3 shadow-sm"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-2xl font-bold text-green-600"
    }, ranProbeResults.correct), /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-slate-600"
    }, "Correct")), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-lg p-3 shadow-sm"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-2xl font-bold text-slate-700"
    }, ranProbeResults.totalScored), /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-slate-600"
    }, "Items Scored")), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-lg p-3 shadow-sm"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-2xl font-bold text-indigo-600"
    }, ranProbeResults.totalScored > 0 ? Math.round(ranProbeResults.correct / ranProbeResults.totalScored * 100) : 0, "%"), /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-slate-600"
    }, "Accuracy"))), /*#__PURE__*/React.createElement("div", {
      className: "text-center text-xs text-slate-600 mb-2"
    }, "Type: ", /*#__PURE__*/React.createElement("span", {
      className: "font-bold capitalize"
    }, ranProbeResults.subType), " \xB7 Grade ", ranProbeResults.grade), mathProbeStudent && /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setLatestProbeResult({
          student: mathProbeStudent,
          type: 'ran',
          subType: ranProbeResults.subType,
          date: new Date().toISOString(),
          elapsedSeconds: ranProbeResults.elapsedSeconds,
          correct: ranProbeResults.correct,
          totalScored: ranProbeResults.totalScored,
          accuracy: ranProbeResults.totalScored > 0 ? Math.round(ranProbeResults.correct / ranProbeResults.totalScored * 100) : 0,
          grade: ranProbeResults.grade,
          form: ranForm
        });
        addToast('RAN results saved for ' + mathProbeStudent, 'success');
      },
      className: "w-full mt-2 px-4 py-2 bg-amber-700 text-white rounded-lg font-bold text-sm hover:bg-amber-600 transition-colors"
    }, "\uD83D\uDCBE Save to Student Record"), /*#__PURE__*/React.createElement("button", {
      onClick: () => printClinicalProbeReport('ran', ranProbeResults, ranProbeGrade, ranForm, mathProbeStudent),
      className: "w-full mt-1 px-4 py-1.5 bg-slate-50 text-slate-600 rounded-lg font-bold text-xs hover:bg-slate-100 transition-colors"
    }, "\uD83D\uDDA8\uFE0F Print Clinical Report"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setRanProbeResults(null),
      className: "w-full mt-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-200 transition-colors"
    }, "Dismiss Results")), orfProbeActive && /*#__PURE__*/React.createElement("div", {
      className: "mt-4 bg-white rounded-xl border-2 border-rose-300 p-6 shadow-lg animate-in fade-in slide-in-from-top-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between mb-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-3"
    }, /*#__PURE__*/React.createElement("span", {
      className: "bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-xs font-bold"
    }, "\uD83D\uDCD6 ORF PROBE"), /*#__PURE__*/React.createElement("span", {
      className: "text-sm font-medium text-slate-600"
    }, orfProbeTitle)), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-3"
    }, /*#__PURE__*/React.createElement("span", {
      className: `tabular-nums px-3 py-1 rounded-full text-sm font-bold ${orfProbeTimer <= 10 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-slate-100 text-slate-700'}`
    }, "\u23F1 ", Math.floor(orfProbeTimer / 60), ":", String(orfProbeTimer % 60).padStart(2, '0')), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        if (window.confirm("End ORF probe early?")) {
          clearInterval(orfProbeTimerRef.current);
          orfProbeTimerRef.current = null;
          setOrfProbeTimer(0);
        }
      },
      className: "text-xs text-red-500 hover:text-red-700 font-bold"
    }, "\u23F9 End Early"))), /*#__PURE__*/React.createElement("div", {
      className: "w-full bg-slate-100 rounded-full h-2 mb-4"
    }, /*#__PURE__*/React.createElement("div", { role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100",
      className: "bg-rose-500 h-2 rounded-full transition-all",
      style: {
        width: `${orfProbeTimer > 0 ? (60 - orfProbeTimer) / 60 * 100 : 100}%`
      }
    })), orfProbeTimer > 0 ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-slate-600 mb-3 font-semibold uppercase tracking-wider text-center"
    }, "Say: \u201CStart here. Read this story aloud. Do your best reading.\u201D Tap words read INCORRECTLY"), /*#__PURE__*/React.createElement("div", {
      className: "bg-gradient-to-br from-slate-50 to-rose-50 rounded-2xl p-6 mb-4 border border-rose-100 leading-relaxed"
    }, orfProbeWords.map((item, idx) => /*#__PURE__*/React.createElement("span", { role: "button", tabIndex: 0, onKeyDown: function(e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.target.click(); } }, 
      key: idx,
      onClick: () => {
        const updated = [...orfProbeWords];
        updated[idx] = {
          ...updated[idx],
          error: !updated[idx].error
        };
        setOrfProbeWords(updated);
      },
      className: `inline-block cursor-pointer px-1 py-0.5 mx-0.5 my-0.5 rounded text-lg transition-all select-none ${item.error ? 'bg-red-200 text-red-700 line-through font-bold' : 'hover:bg-rose-100 text-slate-800'}`
    }, item.word))), /*#__PURE__*/React.createElement("div", {
      className: "text-center text-xs text-slate-600"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-red-500 font-bold"
    }, orfProbeWords.filter(w => w.error).length, " errors marked"), /*#__PURE__*/React.createElement("span", {
      className: "mx-2"
    }, "\xB7"), /*#__PURE__*/React.createElement("span", null, "Tap a word to toggle error"))) : orfProbeLastWord < 0 ? /*#__PURE__*/React.createElement("div", {
      className: "text-center py-4"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-lg font-bold text-amber-600 mb-3"
    }, "\u23F0 Time's Up! Tap the LAST word the student read:"), /*#__PURE__*/React.createElement("div", {
      className: "bg-gradient-to-br from-slate-50 to-amber-50 rounded-2xl p-6 border border-amber-200 leading-relaxed"
    }, orfProbeWords.map((item, idx) => /*#__PURE__*/React.createElement("span", { role: "button", tabIndex: 0, onKeyDown: function(e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.target.click(); } }, 
      key: idx,
      onClick: () => {
        setOrfProbeLastWord(idx);
        const wordsAttempted = orfProbeWords.slice(0, Math.min(idx + 1, orfProbeWords.length));
        const errors = wordsAttempted.filter(w => w.error).length;
        const wcpm = wordsAttempted.length - errors;
        setOrfProbeResults({
          wcpm,
          wordsAttempted: wordsAttempted.length,
          errors,
          totalWords: orfProbeWords.length,
          type: 'orf',
          grade: orfProbeGrade,
          title: orfProbeTitle
        });
        setOrfProbeActive(false);
      },
      className: `inline-block cursor-pointer px-1 py-0.5 mx-0.5 my-0.5 rounded text-lg transition-all select-none hover:bg-amber-200 hover:ring-2 hover:ring-amber-400 ${item.error ? 'bg-red-200 text-red-700 line-through' : 'text-slate-800'}`
    }, item.word)))) : null), orfProbeResults && /*#__PURE__*/React.createElement("div", {
      className: "mt-4 bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl border border-rose-200 p-4",
      "data-probe-results": "orf"
    }, /*#__PURE__*/React.createElement("h4", {
      className: "font-bold text-slate-700 mb-2"
    }, "\uD83D\uDCD6 ORF Probe Results \u2014 ", orfProbeResults.title), /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-3 gap-3 text-center mb-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-lg p-3 shadow-sm"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-3xl font-bold text-rose-600"
    }, orfProbeResults.wcpm), /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-slate-600 font-bold"
    }, "WCPM"), /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] text-slate-600"
    }, "Words Correct Per Min")), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-lg p-3 shadow-sm"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-2xl font-bold text-red-500"
    }, orfProbeResults.errors), /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-slate-600"
    }, "Errors")), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-lg p-3 shadow-sm"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-2xl font-bold text-indigo-600"
    }, orfProbeResults.wordsAttempted > 0 ? Math.round((orfProbeResults.wordsAttempted - orfProbeResults.errors) / orfProbeResults.wordsAttempted * 100) : 0, "%"), /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-slate-600"
    }, "Accuracy"))), mathProbeStudent && /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setLatestProbeResult({
          student: mathProbeStudent,
          type: 'orf',
          date: new Date().toISOString(),
          wcpm: orfProbeResults.wcpm,
          errors: orfProbeResults.errors,
          wordsAttempted: orfProbeResults.wordsAttempted,
          accuracy: orfProbeResults.wordsAttempted > 0 ? Math.round((orfProbeResults.wordsAttempted - orfProbeResults.errors) / orfProbeResults.wordsAttempted * 100) : 0,
          grade: orfProbeGrade,
          form: mathProbeForm,
          title: orfProbeResults.title
        });
        addToast('ORF results saved for ' + mathProbeStudent, 'success');
      },
      className: "w-full mt-2 px-4 py-2 bg-rose-700 text-white rounded-lg font-bold text-sm hover:bg-rose-600 transition-colors"
    }, "\uD83D\uDCBE Save to Student Record"), (() => {
      const g = orfProbeGrade || '1';
      const fm = mathProbeForm || 'A';
      const passages = window.ORF_SCREENING_PASSAGES && window.ORF_SCREENING_PASSAGES[g] && window.ORF_SCREENING_PASSAGES[g][fm];
      const passage = passages && passages[0];
      if (!passage || !passage.questions || passage.questions.length === 0) return null;
      return /*#__PURE__*/React.createElement("div", {
        className: "mt-3 bg-white rounded-lg border border-rose-100 p-3"
      }, /*#__PURE__*/React.createElement("h5", {
        className: "text-xs font-bold text-rose-600 mb-2 uppercase tracking-wider"
      }, "\uD83D\uDCAC Comprehension Check (", passage.questions.length, " questions)"), passage.questions.map((q, qi) => /*#__PURE__*/React.createElement("div", {
        key: qi,
        className: "mb-2 last:mb-0"
      }, /*#__PURE__*/React.createElement("p", {
        className: "text-xs font-semibold text-slate-700 mb-1"
      }, qi + 1, ". ", q.question), /*#__PURE__*/React.createElement("div", {
        className: "flex flex-wrap gap-1"
      }, q.options.map((opt, oi) => /*#__PURE__*/React.createElement("span", {
        key: oi,
        className: `text-xs px-2 py-1 rounded-full cursor-default ${opt === q.answer ? 'bg-green-100 text-green-700 font-bold ring-1 ring-green-300' : 'bg-slate-100 text-slate-600'}`
      }, opt, " ", opt === q.answer ? '✅' : ''))))), /*#__PURE__*/React.createElement("p", {
        className: "text-[11px] text-slate-600 mt-2 italic"
      }, "Ask each question orally. Correct answers highlighted."));
    })(),
    renderProbeInterpretation('orf', orfProbeResults.wcpm, orfProbeGrade),
    /*#__PURE__*/React.createElement("button", {
      onClick: () => printClinicalProbeReport('orf', orfProbeResults, orfProbeGrade, mathProbeForm, mathProbeStudent),
      className: "w-full mt-1 px-4 py-1.5 bg-slate-50 text-slate-600 rounded-lg font-bold text-xs hover:bg-slate-100 transition-colors"
    }, "\uD83D\uDDA8\uFE0F Print Clinical Report"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setOrfProbeResults(null),
      className: "w-full mt-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-200 transition-colors"
    }, "Dismiss Results")), /*#__PURE__*/React.createElement("div", {
      className: "bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-4 mb-4 border border-purple-200"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 mb-3"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-base"
    }, "\u2753"), /*#__PURE__*/React.createElement("h3", {
      className: "text-sm font-bold text-slate-700"
    }, t('probes.missing_number')), /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full uppercase tracking-wider"
    }, "K-2")), /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-slate-600 mb-3"
    }, "Find the missing number: \"3 + __ = 7\". Measures algebraic thinking and number relationships."), importedStudents.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "mb-3 flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-xs text-slate-600"
    }, "\uD83D\uDCCB Student:"), /*#__PURE__*/React.createElement("select", {
      "aria-label": "Assign probe to student",
      value: mathProbeStudent || "",
      onChange: e => setMathProbeStudent(e.target.value),
      className: "text-xs font-bold border border-purple-600 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-300"
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "Select Student..."), importedStudents.map(s => /*#__PURE__*/React.createElement("option", {
      key: s.id || s.name,
      value: s.nickname || s.name
    }, s.nickname || s.name)))), /*#__PURE__*/React.createElement("div", {
      className: "flex gap-2 items-center flex-wrap"
    }, /*#__PURE__*/React.createElement("select", {
      "aria-label": "Missing number probe grade",
      value: mnGrade || "1",
      onChange: e => setMnGrade(e.target.value),
      className: "text-xs font-bold border border-purple-600 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-300"
    }, /*#__PURE__*/React.createElement("option", {
      value: "K"
    }, t('probes.grade_k')), /*#__PURE__*/React.createElement("option", {
      value: "1"
    }, "Grade 1"), /*#__PURE__*/React.createElement("option", {
      value: "2"
    }, "Grade 2")), /*#__PURE__*/React.createElement("select", {
      "aria-label": "Missing number form",
      value: mnForm || "A",
      onChange: e => setMnForm(e.target.value),
      className: "text-xs font-bold border border-purple-600 rounded-lg px-3 py-2 bg-purple-50 text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-300"
    }, /*#__PURE__*/React.createElement("option", {
      value: "A"
    }, "Form A (Fall)"), /*#__PURE__*/React.createElement("option", {
      value: "B"
    }, "Form B (Winter)"), /*#__PURE__*/React.createElement("option", {
      value: "C"
    }, "Form C (Spring)")), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        const grade = mnGrade || "1";
        const form = mnForm || "A";
        const bank = window.MISSING_NUMBER_PROBES;
        if (!bank || !bank[grade] || !bank[grade][form]) {
          addToast("Missing Number probes not loaded yet", "error");
          loadPsychometricProbes();
          return;
        }
        const data = bank[grade][form];
        setMnProbeProblems(data.problems.map(p => ({
          ...p,
          studentAnswer: null,
          correct: null
        })));
        setMnProbeIndex(0);
        setMnProbeAnswer("");
        setMnProbeResults(null);
        setMnProbeTimer(data.timeLimit);
        setMnProbeActive(true);
        if (mnProbeTimerRef.current) clearInterval(mnProbeTimerRef.current);
        mnProbeTimerRef.current = setInterval(() => {
          setMnProbeTimer(prev => {
            if (prev <= 1) {
              clearInterval(mnProbeTimerRef.current);
              mnProbeTimerRef.current = null;
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        setTimeout(() => mnProbeInputRef.current?.focus(), 100);
      },
      className: "flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg font-bold text-sm hover:from-purple-600 hover:to-indigo-600 transition-all shadow-md"
    }, "\u25B6 Start Missing Number")), mnProbeActive && /*#__PURE__*/React.createElement("div", {
      className: "mt-4 bg-white rounded-xl border-2 border-purple-300 p-6 shadow-lg animate-in fade-in slide-in-from-top-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between mb-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-3"
    }, /*#__PURE__*/React.createElement("span", {
      className: "bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold"
    }, "\uD83D\uDCCA PROBE ACTIVE"), /*#__PURE__*/React.createElement("span", {
      className: "text-sm font-medium text-slate-600"
    }, "Problem ", mnProbeIndex + 1, " of ", mnProbeProblems.length)), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-3"
    }, /*#__PURE__*/React.createElement("span", {
      className: `tabular-nums px-3 py-1 rounded-full text-sm font-bold ${mnProbeTimer <= 10 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-slate-100 text-slate-700'}`
    }, "\u23F1 ", Math.floor(mnProbeTimer / 60), ":", String(mnProbeTimer % 60).padStart(2, '0')), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        if (window.confirm("End probe early? Progress will be saved.")) {
          clearInterval(mnProbeTimerRef.current);
          mnProbeTimerRef.current = null;
          const answered = mnProbeProblems.filter(p => p.studentAnswer !== null);
          const correct = answered.filter(p => p.correct).length;
          setMnProbeResults({
            correct,
            total: answered.length,
            problems: mnProbeProblems,
            type: 'missing_number'
          });
          setMnProbeActive(false);
        }
      },
      className: "text-xs text-red-500 hover:text-red-700 font-bold"
    }, "\u23F9 End Early"))), /*#__PURE__*/React.createElement("div", {
      className: "w-full bg-slate-100 rounded-full h-2 mb-4"
    }, /*#__PURE__*/React.createElement("div", { role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100",
      className: "bg-purple-500 h-2 rounded-full transition-all",
      style: {
        width: `${mnProbeIndex / mnProbeProblems.length * 100}%`
      }
    })), mnProbeTimer > 0 && mnProbeIndex < mnProbeProblems.length ? (() => {
      const problem = mnProbeProblems[mnProbeIndex];
      return /*#__PURE__*/React.createElement("div", {
        className: "text-center"
      }, /*#__PURE__*/React.createElement("div", {
        className: "text-3xl font-bold text-slate-800 mb-6 tracking-wider"
      }, problem.sequence.map((item, i) => /*#__PURE__*/React.createElement("span", {
        key: i,
        className: `mx-1 ${item === '___' ? 'inline-block w-16 border-b-4 border-purple-400 text-purple-600' : ''}`
      }, item === '___' ? mnProbeAnswer || '?' : item))), /*#__PURE__*/React.createElement("div", {
        className: "flex items-center justify-center gap-3"
      }, /*#__PURE__*/React.createElement("input", {
        ref: mnProbeInputRef,
        type: "number",
        "aria-label": "Math probe answer",
        value: mnProbeAnswer,
        onChange: e => setMnProbeAnswer(e.target.value),
        onKeyDown: e => {
          if (e.key === 'Enter' && mnProbeAnswer !== '') {
            const ans = parseInt(mnProbeAnswer, 10);
            const isCorrect = ans === problem.answer;
            const updated = [...mnProbeProblems];
            updated[mnProbeIndex] = {
              ...updated[mnProbeIndex],
              studentAnswer: ans,
              correct: isCorrect
            };
            setMnProbeProblems(updated);
            setMnProbeAnswer('');
            if (mnProbeIndex + 1 < mnProbeProblems.length) {
              setMnProbeIndex(mnProbeIndex + 1);
              setTimeout(() => mnProbeInputRef.current?.focus(), 50);
            } else {
              clearInterval(mnProbeTimerRef.current);
              mnProbeTimerRef.current = null;
              const correct = updated.filter(p => p.correct).length;
              setMnProbeResults({
                correct,
                total: updated.length,
                problems: updated,
                type: 'missing_number'
              });
              setMnProbeActive(false);
            }
          }
        },
        className: "w-24 text-center text-2xl font-bold border-2 border-purple-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400",
        placeholder: "?",
        autoFocus: true
      }), /*#__PURE__*/React.createElement("button", {
        onClick: () => {
          // Skip button
          const updated = [...mnProbeProblems];
          updated[mnProbeIndex] = {
            ...updated[mnProbeIndex],
            studentAnswer: null,
            correct: false
          };
          setMnProbeProblems(updated);
          setMnProbeAnswer('');
          if (mnProbeIndex + 1 < mnProbeProblems.length) {
            setMnProbeIndex(mnProbeIndex + 1);
            setTimeout(() => mnProbeInputRef.current?.focus(), 50);
          } else {
            clearInterval(mnProbeTimerRef.current);
            mnProbeTimerRef.current = null;
            const correct = updated.filter(p => p.correct).length;
            setMnProbeResults({
              correct,
              total: updated.length,
              problems: updated,
              type: 'missing_number'
            });
            setMnProbeActive(false);
          }
        },
        className: "text-sm text-slate-600 hover:text-slate-600 font-bold"
      }, "Skip \u2192")));
    })() : /*#__PURE__*/React.createElement("div", {
      className: "text-center py-4"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-lg font-bold text-red-600"
    }, "\u23F0 Time's Up!"), (() => {
      const answered = mnProbeProblems.filter(p => p.studentAnswer !== null);
      const correct = answered.filter(p => p.correct).length;
      if (!mnProbeResults) {
        setMnProbeResults({
          correct,
          total: answered.length,
          problems: mnProbeProblems,
          type: 'missing_number'
        });
        setMnProbeActive(false);
      }
      return null;
    })())), mnProbeResults && /*#__PURE__*/React.createElement("div", {
      className: "mt-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200 p-4"
    }, /*#__PURE__*/React.createElement("h4", {
      className: "font-bold text-slate-700 mb-2"
    }, "\uD83D\uDCCA Missing Number Probe Results"), /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-3 gap-3 text-center mb-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-lg p-3 shadow-sm"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-2xl font-bold text-green-600"
    }, mnProbeResults.correct), /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-slate-600"
    }, "Correct")), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-lg p-3 shadow-sm"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-2xl font-bold text-slate-700"
    }, mnProbeResults.total), /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-slate-600"
    }, "Attempted")), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-lg p-3 shadow-sm"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-2xl font-bold text-indigo-600"
    }, mnProbeResults.total > 0 ? Math.round(mnProbeResults.correct / mnProbeResults.total * 100) : 0, "%"), /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-slate-600"
    }, "Accuracy"))), mathProbeStudent && /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setLatestProbeResult({
          student: mathProbeStudent,
          type: 'missing_number',
          date: new Date().toISOString(),
          correct: mnProbeResults.correct,
          total: mnProbeResults.total,
          accuracy: mnProbeResults.total > 0 ? Math.round(mnProbeResults.correct / mnProbeResults.total * 100) : 0,
          grade: mnGrade,
          form: mnForm
        });
        addToast(`Probe results saved for ${mathProbeStudent}`, 'success');
      },
      className: "w-full mt-2 px-4 py-2 bg-purple-700 text-white rounded-lg font-bold text-sm hover:bg-purple-600 transition-colors"
    }, "\uD83D\uDCBE Save to Student Record"))), /*#__PURE__*/React.createElement("div", {
      className: "bg-gradient-to-r from-cyan-50 to-sky-50 rounded-2xl p-4 mb-4 border border-cyan-200"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 mb-3"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-base"
    }, "\u2696\uFE0F"), /*#__PURE__*/React.createElement("h3", {
      className: "text-sm font-bold text-slate-700"
    }, t('probes.qd')), /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] font-bold text-cyan-800 bg-cyan-100 px-2 py-0.5 rounded-full uppercase tracking-wider"
    }, "K-1")), /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-slate-600 mb-3"
    }, "Circle the bigger number. 1-minute timed. Measures number magnitude understanding."), /*#__PURE__*/React.createElement("div", {
      className: "flex gap-2 items-center flex-wrap"
    }, /*#__PURE__*/React.createElement("select", {
      "aria-label": "QD probe grade",
      value: qdGrade || "K",
      onChange: e => setQdGrade(e.target.value),
      className: "text-xs font-bold border border-cyan-600 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-300"
    }, /*#__PURE__*/React.createElement("option", {
      value: "K"
    }, t('probes.grade_k')), /*#__PURE__*/React.createElement("option", {
      value: "1"
    }, "Grade 1")), /*#__PURE__*/React.createElement("select", {
      "aria-label": "QD form",
      value: qdForm || "A",
      onChange: e => setQdForm(e.target.value),
      className: "text-xs font-bold border border-cyan-600 rounded-lg px-3 py-2 bg-cyan-50 text-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-300"
    }, /*#__PURE__*/React.createElement("option", {
      value: "A"
    }, "Form A (Fall)"), /*#__PURE__*/React.createElement("option", {
      value: "B"
    }, "Form B (Winter)"), /*#__PURE__*/React.createElement("option", {
      value: "C"
    }, "Form C (Spring)")), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        const grade = qdGrade || "K";
        const form = qdForm || "A";
        const bank = window.QUANTITY_DISCRIMINATION_PROBES;
        if (!bank || !bank[grade] || !bank[grade][form]) {
          addToast("Quantity Discrimination probes not loaded yet", "error");
          loadPsychometricProbes();
          return;
        }
        const data = bank[grade][form];
        setQdProbeProblems(data.problems.map(p => ({
          ...p,
          studentAnswer: null,
          correct: null
        })));
        setQdProbeIndex(0);
        setQdProbeResults(null);
        setQdProbeTimer(data.timeLimit);
        setQdProbeActive(true);
        if (qdProbeTimerRef.current) clearInterval(qdProbeTimerRef.current);
        qdProbeTimerRef.current = setInterval(() => {
          setQdProbeTimer(prev => {
            if (prev <= 1) {
              clearInterval(qdProbeTimerRef.current);
              qdProbeTimerRef.current = null;
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      },
      className: "flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-sky-500 text-white rounded-lg font-bold text-sm hover:from-cyan-600 hover:to-sky-600 transition-all shadow-md"
    }, "\u25B6 Start QD Probe")), qdProbeActive && /*#__PURE__*/React.createElement("div", {
      className: "mt-4 bg-white rounded-xl border-2 border-cyan-300 p-6 shadow-lg animate-in fade-in slide-in-from-top-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between mb-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-3"
    }, /*#__PURE__*/React.createElement("span", {
      className: "bg-cyan-100 text-cyan-700 px-3 py-1 rounded-full text-xs font-bold"
    }, "\u2696\uFE0F QD PROBE"), /*#__PURE__*/React.createElement("span", {
      className: "text-sm font-medium text-slate-600"
    }, "Item ", qdProbeIndex + 1, " of ", qdProbeProblems.length)), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-3"
    }, /*#__PURE__*/React.createElement("span", {
      className: `tabular-nums px-3 py-1 rounded-full text-sm font-bold ${qdProbeTimer <= 10 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-slate-100 text-slate-700'}`
    }, "\u23F1 ", Math.floor(qdProbeTimer / 60), ":", String(qdProbeTimer % 60).padStart(2, '0')), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        if (window.confirm("End probe early?")) {
          clearInterval(qdProbeTimerRef.current);
          qdProbeTimerRef.current = null;
          const answered = qdProbeProblems.filter(p => p.studentAnswer !== null);
          const correct = answered.filter(p => p.correct).length;
          setQdProbeResults({
            correct,
            total: answered.length,
            problems: qdProbeProblems,
            type: 'quantity_discrimination'
          });
          setQdProbeActive(false);
        }
      },
      className: "text-xs text-red-500 hover:text-red-700 font-bold"
    }, "\u23F9 End Early"))), /*#__PURE__*/React.createElement("div", {
      className: "w-full bg-slate-100 rounded-full h-2 mb-4"
    }, /*#__PURE__*/React.createElement("div", { role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100",
      className: "bg-cyan-500 h-2 rounded-full transition-all",
      style: {
        width: `${qdProbeIndex / qdProbeProblems.length * 100}%`
      }
    })), qdProbeTimer > 0 && qdProbeIndex < qdProbeProblems.length ? (() => {
      const problem = qdProbeProblems[qdProbeIndex];
      return /*#__PURE__*/React.createElement("div", { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },
        className: "text-center"
      }, /*#__PURE__*/React.createElement("p", {
        className: "text-sm text-slate-600 mb-4 font-medium"
      }, "Which number is bigger?"), /*#__PURE__*/React.createElement("div", {
        className: "flex items-center justify-center gap-8"
      }, [problem.a, problem.b].map((num, i) => /*#__PURE__*/React.createElement("button", {
        key: i,
        onClick: () => {
          const chosen = num;
          const isCorrect = chosen === problem.answer;
          const updated = [...qdProbeProblems];
          updated[qdProbeIndex] = {
            ...updated[qdProbeIndex],
            studentAnswer: chosen,
            correct: isCorrect
          };
          setQdProbeProblems(updated);
          if (qdProbeIndex + 1 < qdProbeProblems.length) {
            setQdProbeIndex(qdProbeIndex + 1);
          } else {
            clearInterval(qdProbeTimerRef.current);
            qdProbeTimerRef.current = null;
            const correct = updated.filter(p => p.correct).length;
            setQdProbeResults({
              correct,
              total: updated.length,
              problems: updated,
              type: 'quantity_discrimination'
            });
            setQdProbeActive(false);
          }
        },
        className: "w-28 h-28 text-4xl font-bold rounded-2xl border-4 border-cyan-600 bg-white hover:border-cyan-500 hover:bg-cyan-50 hover:scale-110 transition-all shadow-lg cursor-pointer"
      }, num))));
    })() : /*#__PURE__*/React.createElement("div", {
      className: "text-center py-4"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-lg font-bold text-red-600"
    }, "\u23F0 Time's Up!"), (() => {
      const answered = qdProbeProblems.filter(p => p.studentAnswer !== null);
      const correct = answered.filter(p => p.correct).length;
      if (!qdProbeResults) {
        setQdProbeResults({
          correct,
          total: answered.length,
          problems: qdProbeProblems,
          type: 'quantity_discrimination'
        });
        setQdProbeActive(false);
      }
      return null;
    })())), qdProbeResults && /*#__PURE__*/React.createElement("div", {
      className: "mt-4 bg-gradient-to-r from-cyan-50 to-sky-50 rounded-xl border border-cyan-200 p-4"
    }, /*#__PURE__*/React.createElement("h4", {
      className: "font-bold text-slate-700 mb-2"
    }, "\u2696\uFE0F Quantity Discrimination Results"), /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-3 gap-3 text-center mb-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-lg p-3 shadow-sm"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-2xl font-bold text-green-600"
    }, qdProbeResults.correct), /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-slate-600"
    }, "Correct")), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-lg p-3 shadow-sm"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-2xl font-bold text-slate-700"
    }, qdProbeResults.total), /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-slate-600"
    }, "Attempted")), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-lg p-3 shadow-sm"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-2xl font-bold text-cyan-600"
    }, qdProbeResults.total > 0 ? Math.round(qdProbeResults.correct / qdProbeResults.total * 100) : 0, "%"), /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-slate-600"
    }, "Accuracy"))), mathProbeStudent && /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setLatestProbeResult({
          student: mathProbeStudent,
          type: 'quantity_discrimination',
          date: new Date().toISOString(),
          correct: qdProbeResults.correct,
          total: qdProbeResults.total,
          accuracy: qdProbeResults.total > 0 ? Math.round(qdProbeResults.correct / qdProbeResults.total * 100) : 0,
          grade: qdGrade,
          form: qdForm
        });
        addToast(`QD results saved for ${mathProbeStudent}`, 'success');
      },
      className: "w-full mt-2 px-4 py-2 bg-cyan-700 text-white rounded-lg font-bold text-sm hover:bg-cyan-600 transition-colors"
    }, "\uD83D\uDCBE Save to Student Record"))), /*#__PURE__*/React.createElement("div", {
      className: "bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-4 mb-4 border border-emerald-200"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 mb-3"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-base"
    }, "\uD83D\uDD24"), /*#__PURE__*/React.createElement("h3", {
      className: "text-sm font-bold text-slate-700"
    }, "Nonsense Word Fluency (NWF)"), /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider"
    }, "K-1")), /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-slate-600 mb-3"
    }, "Student reads CVC pseudowords aloud (e.g., \"sig\", \"bim\", \"tob\"). Scored as Correct Letter Sounds (CLS) per minute. Tests phonetic decoding."), /*#__PURE__*/React.createElement("div", {
      className: "flex gap-2 items-center flex-wrap"
    }, /*#__PURE__*/React.createElement("select", {
      "aria-label": "NWF grade",
      value: nwfGrade || "K",
      onChange: e => setNwfGrade(e.target.value),
      className: "text-xs font-bold border border-emerald-600 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-300"
    }, /*#__PURE__*/React.createElement("option", {
      value: "K"
    }, t('probes.grade_k')), /*#__PURE__*/React.createElement("option", {
      value: "1"
    }, "Grade 1")), /*#__PURE__*/React.createElement("select", {
      "aria-label": "NWF form",
      value: nwfForm || "A",
      onChange: e => setNwfForm(e.target.value),
      className: "text-xs font-bold border border-emerald-600 rounded-lg px-3 py-2 bg-emerald-50 text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-300"
    }, /*#__PURE__*/React.createElement("option", {
      value: "A"
    }, "Form A (Fall)"), /*#__PURE__*/React.createElement("option", {
      value: "B"
    }, "Form B (Winter)"), /*#__PURE__*/React.createElement("option", {
      value: "C"
    }, "Form C (Spring)")), /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-emerald-600 font-medium"
    }, window.NWF_PROBE_BANKS ? `✅ ${window.NWF_PROBE_BANKS[nwfGrade || "K"]?.[nwfForm || "A"]?.words?.length || 0} words loaded` : "⏳ Loading..."))), /*#__PURE__*/React.createElement("div", {
      className: "bg-gradient-to-r from-rose-50 to-pink-50 rounded-2xl p-4 mb-4 border border-rose-200"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 mb-3"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-base"
    }, "\uD83C\uDD70\uFE0F"), /*#__PURE__*/React.createElement("h3", {
      className: "text-sm font-bold text-slate-700"
    }, "Letter Naming Fluency (LNF)"), /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full uppercase tracking-wider"
    }, "K")), /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-slate-600 mb-3"
    }, "Student names randomly arranged uppercase and lowercase letters. Scored as letters per minute. Tests basic letter recognition."), /*#__PURE__*/React.createElement("div", {
      className: "flex gap-2 items-center flex-wrap"
    }, /*#__PURE__*/React.createElement("select", {
      "aria-label": "LNF form",
      value: lnfForm || "A",
      onChange: e => setLnfForm(e.target.value),
      className: "text-xs font-bold border border-rose-600 rounded-lg px-3 py-2 bg-rose-50 text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-300"
    }, /*#__PURE__*/React.createElement("option", {
      value: "A"
    }, "Form A (Fall)"), /*#__PURE__*/React.createElement("option", {
      value: "B"
    }, "Form B (Winter)"), /*#__PURE__*/React.createElement("option", {
      value: "C"
    }, "Form C (Spring)")), /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-rose-600 font-medium"
    }, window.LNF_PROBE_BANKS ? `✅ ${window.LNF_PROBE_BANKS["K"]?.[lnfForm || "A"]?.letters?.length || 0} letters loaded` : "⏳ Loading..."))), /*#__PURE__*/React.createElement("div", {
      className: "bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl p-4 mb-4 border border-amber-200"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 mb-3"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-base"
    }, "\u26A1"), /*#__PURE__*/React.createElement("h3", {
      className: "text-sm font-bold text-slate-700"
    }, "Rapid Automatized Naming (RAN)"), /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full uppercase tracking-wider"
    }, "K-2")), /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-slate-600 mb-3"
    }, "Student names colors (K), letters (1), or numbers (2) as fast as possible. Measures processing speed \u2014 a key predictor of reading fluency."), /*#__PURE__*/React.createElement("div", {
      className: "flex gap-2 items-center flex-wrap"
    }, /*#__PURE__*/React.createElement("select", {
      "aria-label": "RAN grade",
      value: ranGrade || "K",
      onChange: e => setRanGrade(e.target.value),
      className: "text-xs font-bold border border-amber-600 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-300"
    }, /*#__PURE__*/React.createElement("option", {
      value: "K"
    }, "Grade K (Colors)"), /*#__PURE__*/React.createElement("option", {
      value: "1"
    }, "Grade 1 (Letters)"), /*#__PURE__*/React.createElement("option", {
      value: "2"
    }, "Grade 2 (Numbers)")), /*#__PURE__*/React.createElement("select", {
      "aria-label": "RAN form",
      value: ranForm || "A",
      onChange: e => setRanForm(e.target.value),
      className: "text-xs font-bold border border-amber-600 rounded-lg px-3 py-2 bg-amber-50 text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-300"
    }, /*#__PURE__*/React.createElement("option", {
      value: "A"
    }, "Form A (Fall)"), /*#__PURE__*/React.createElement("option", {
      value: "B"
    }, "Form B (Winter)"), /*#__PURE__*/React.createElement("option", {
      value: "C"
    }, "Form C (Spring)")), /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-amber-600 font-medium"
    }, window.RAN_PROBE_BANKS && window.RAN_PROBE_BANKS[ranGrade || "K"]?.[ranForm || "A"] ? `✅ ${window.RAN_PROBE_BANKS[ranGrade || "K"][ranForm || "A"].type} · ${window.RAN_PROBE_BANKS[ranGrade || "K"][ranForm || "A"].items.length} items` : "⏳ Loading..."))), importedStudents.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "flex gap-2 mb-3 items-center"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: generateRTICSV,
      "aria-label": t('common.export_rti_progress_report_as_csv'),
      className: "flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-bold text-sm hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md"
    }, "\uD83D\uDCCA Export RTI Report"), /*#__PURE__*/React.createElement("span", {
      className: "text-xs text-slate-600"
    }, "Download CSV with tier classifications, metrics, and recommendations")), importedStudents.length === 0 ? /*#__PURE__*/React.createElement("div", {
      className: "text-center py-12 text-slate-600"
    }, /*#__PURE__*/React.createElement(Users, {
      size: 48,
      className: "mx-auto mb-3 opacity-30"
    }), /*#__PURE__*/React.createElement("p", null, t('class_analytics.no_data')), /*#__PURE__*/React.createElement("p", {
      className: "text-sm mt-1"
    }, t('class_analytics.import_hint'))) : /*#__PURE__*/React.createElement("div", {
      className: "overflow-x-auto",
      "data-help-key": "dashboard_student_table"
    }, /*#__PURE__*/React.createElement("table", {
      className: "w-full text-sm"
    }, /*#__PURE__*/React.createElement("caption", { className: "sr-only" }, "student analytics module data table"), React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
      className: "bg-slate-100 text-left"
    }, [{
      key: 'name',
      label: t('class_analytics.student_name'),
      align: 'left',
      round: 'rounded-l-lg'
    }, {
      key: 'rtiTier',
      label: 'RTI'
    }, {
      key: 'quizAvg',
      label: t('class_analytics.quiz_avg')
    }, {
      key: 'adventureXP',
      label: t('class_analytics.adventure_xp')
    }, {
      key: 'escapeCompletion',
      label: t('class_analytics.escape_completion')
    }, {
      key: 'fluencyWCPM',
      label: t('class_analytics.fluency_wcpm')
    }, {
      key: 'interviewXP',
      label: t('class_analytics.interview_xp')
    }, ...(safetyFlaggingVisible ? [{
      key: 'flags',
      label: t('class_analytics.safety_flags')
    }] : []), {
      key: 'focusRatio',
      label: '🔥 Focus'
    }, {
      key: 'totalActivities',
      label: t('class_analytics.total_activities'),
      round: 'rounded-r-lg'
    }].map(col => /*#__PURE__*/React.createElement("th", { scope: "col",
      key: col.key,
      onClick: () => handleSort(col.key),
      className: `p-2 ${col.align !== 'left' ? 'text-center' : ''} ${col.round || ''} cursor-pointer hover:bg-slate-200 select-none transition-colors`
    }, col.label, " ", sortColumn === col.key ? sortDirection === 'asc' ? ' ▲' : ' ▼' : '')))), /*#__PURE__*/React.createElement("tbody", null, sortedAndFiltered.map(student => /*#__PURE__*/React.createElement("tr", {
      key: student.id,
      "data-help-key": "dashboard_student_row",
      className: "border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors",
      onClick: () => setSelectedStudent(student)
    }, /*#__PURE__*/React.createElement("td", {
      className: "p-2 font-medium"
    }, student.isLive && /*#__PURE__*/React.createElement("span", {
      title: t('common.live_sync'),
      style: {
        fontSize: '10px',
        marginRight: '4px',
        verticalAlign: 'middle'
      }
    }, "\uD83D\uDCE1"), student.name), /*#__PURE__*/React.createElement("td", {
      className: "p-2 text-center"
    }, (() => {
      const rti = classifyRTITier(student.stats);
      return /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: '11px',
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: '12px',
          background: rti.bg,
          color: rti.color,
          border: `1px solid ${rti.border}`
        }
      }, rti.emoji, " ", rti.tier);
    })()), /*#__PURE__*/React.createElement("td", {
      className: "p-2 text-center"
    }, student.stats.quizAvg, "%"), /*#__PURE__*/React.createElement("td", {
      className: "p-2 text-center"
    }, student.stats.adventureXP), /*#__PURE__*/React.createElement("td", {
      className: "p-2 text-center"
    }, student.stats.escapeCompletion, "%"), /*#__PURE__*/React.createElement("td", {
      className: "p-2 text-center"
    }, student.stats.fluencyWCPM), /*#__PURE__*/React.createElement("td", {
      className: "p-2 text-center"
    }, student.stats.interviewXP), /*#__PURE__*/React.createElement("td", {
      className: "p-2 text-center"
    }, student.stats.focusRatio != null ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '11px',
        fontWeight: 700,
        padding: '2px 8px',
        borderRadius: '12px',
        background: student.stats.focusRatio >= 80 ? '#dcfce7' : student.stats.focusRatio >= 50 ? '#fef9c3' : '#fee2e2',
        color: student.stats.focusRatio >= 80 ? '#166534' : student.stats.focusRatio >= 50 ? '#854d0e' : '#991b1b'
      }
    }, student.stats.focusRatio, "%") : /*#__PURE__*/React.createElement("span", {
      className: "text-slate-600"
    }, "\u2014")), safetyFlaggingVisible && /*#__PURE__*/React.createElement("td", {
      className: "p-2 text-center"
    }, (() => {
      const flagCount = student.safetyFlags?.length || 0;
      const liveFlagCount = student.data?.flagSummary?.total || 0;
      const totalFlags = flagCount + liveFlagCount;
      const hasCritical = student.safetyFlags?.some(f => f.severity === 'critical') || student.data?.flagSummary?.hasCritical;
      if (totalFlags > 0) {
        return /*#__PURE__*/React.createElement("span", {
          className: `${hasCritical ? 'bg-red-200 text-red-800 ring-2 ring-red-300' : 'bg-rose-100 text-rose-700'} px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 justify-center`,
          title: student.isLive && student.data?.flagSummary ? `Live flags: ${Object.entries(student.data.flagSummary.categories || {}).map(([k, v]) => `${k}: ${v}`).join(', ')}` : ''
        }, hasCritical ? '🚨' : /*#__PURE__*/React.createElement(AlertCircle, {
          size: 12
        }), " ", totalFlags);
      }
      return /*#__PURE__*/React.createElement("span", {
        className: "text-slate-600"
      }, "\u2014");
    })()), /*#__PURE__*/React.createElement("td", {
      className: "p-2 text-center"
    }, student.stats.totalActivities), /*#__PURE__*/React.createElement("td", {
      className: "p-2 text-center"
    }, (() => {
      const af = computeAnomalyFlags(student);
      if (af.length === 0) return /*#__PURE__*/React.createElement("span", {
        className: "text-slate-600"
      }, "\u2014");
      return /*#__PURE__*/React.createElement("div", {
        className: "flex flex-wrap gap-0.5 justify-center"
      }, af.map((f, i) => /*#__PURE__*/React.createElement("span", {
        key: i,
        title: f.detail,
        className: `inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${f.severity === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-600'}`
      }, f.icon, " ", f.label)));
    })()))))))), selectedStudent && /*#__PURE__*/React.createElement("div", {
      className: "absolute inset-0 bg-white flex flex-col"
    }, /*#__PURE__*/React.createElement("div", {
      className: "p-4 border-b border-slate-200 flex items-center justify-between shrink-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("button", {
      "aria-label": t('common.previous'),
      "data-help-key": "dashboard_detail_back",
      onClick: () => setSelectedStudent(null),
      className: "p-1 hover:bg-slate-100 rounded"
    }, /*#__PURE__*/React.createElement(ChevronLeft, {
      size: 20
    })), /*#__PURE__*/React.createElement("h3", {
      className: "font-bold text-lg"
    }, selectedStudent.name)), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => generateStudentProgressReport(selectedStudent),
      className: "flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg font-bold text-sm hover:from-indigo-600 hover:to-purple-600 transition-all shadow-md",
      "data-help-key": "dashboard_print_parent_report",
      "aria-label": t('common.print_parent_friendly_progress_report')
    }, /*#__PURE__*/React.createElement(Printer, {
      size: 14
    }), " Print Parent Report"), /*#__PURE__*/React.createElement("button", {
      onClick: () => generateStudentFriendlyReport({
        history: selectedStudent.history || [],
        wordSoundsHistory: selectedStudent.wordSoundsHistory || [],
        phonemeMastery: selectedStudent.phonemeMastery || {},
        wordSoundsBadges: selectedStudent.wordSoundsBadges || {},
        gameCompletions: selectedStudent.gameCompletions || [],
        globalPoints: selectedStudent.stats?.adventureXP || 0,
        globalLevel: selectedStudent.stats?.level || 1,
        progressSnapshots: rosterKey?.progressHistory?.[selectedStudent.name] || [],
        dateRange: {
          start: reportStartDate,
          end: reportEndDate
        },
        studentName: selectedStudent.name
      }),
      className: "flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-bold text-sm hover:from-amber-600 hover:to-orange-600 transition-all shadow-md",
      title: "Download a growth-focused report suitable for sharing with the student"
    }, /*#__PURE__*/React.createElement(Download, {
      size: 14
    }), " Student Report"))), /*#__PURE__*/React.createElement("div", {
      className: "flex-1 overflow-y-auto p-4"
    }, (() => {
      const rti = classifyRTITier(selectedStudent.stats);
      const s = selectedStudent.stats;
      const metrics = [{
        label: 'Quiz Average',
        value: s.quizAvg + '%',
        color: s.quizAvg >= 80 ? '#16a34a' : s.quizAvg >= 50 ? '#d97706' : '#dc2626',
        icon: '📝'
      }, {
        label: 'WS Accuracy',
        value: s.wsAccuracy + '%',
        color: s.wsAccuracy >= 75 ? '#16a34a' : s.wsAccuracy >= 50 ? '#d97706' : '#dc2626',
        icon: '🔊'
      }, {
        label: 'Fluency',
        value: s.fluencyWCPM + ' WCPM',
        color: s.fluencyWCPM >= 100 ? '#16a34a' : s.fluencyWCPM >= 60 ? '#d97706' : '#dc2626',
        icon: '📖'
      }, {
        label: 'Games',
        value: s.gamesPlayed,
        color: s.gamesPlayed >= 5 ? '#16a34a' : s.gamesPlayed >= 2 ? '#d97706' : '#dc2626',
        icon: '🎮'
      }, {
        label: 'Activities',
        value: s.totalActivities,
        color: s.totalActivities >= 5 ? '#16a34a' : s.totalActivities >= 2 ? '#d97706' : '#dc2626',
        icon: '📊'
      }, {
        label: 'Label Challenge',
        value: s.labelChallengeAvg + '%',
        color: s.labelChallengeAvg >= 80 ? '#16a34a' : s.labelChallengeAvg >= 50 ? '#d97706' : '#dc2626',
        icon: '🏷️'
      }];
      const fluencyData = selectedStudent.data?.fluencyAssessments?.map(a => a.wcpm || 0) || [];
      const gameScores = selectedStudent.data?.gameCompletions ? Object.values(selectedStudent.data.gameCompletions).flat().map(e => e.score ?? e.accuracy ?? 0) : [];
      const renderSparkline = (data, color, aimlineData) => {
        if (data.length < 2) return null;
        const allValues = [...data];
        if (aimlineData) {
          allValues.push(aimlineData.baseline, aimlineData.target);
        }
        const max = Math.max(...allValues, 1);
        const min = Math.min(...allValues, 0);
        const range = max - min || 1;
        const w = 100,
          h = 30;
        const points = data.map((v, i) => `${i / (data.length - 1) * w},${h - (v - min) / range * (h - 4) - 2}`).join(' ');
        const trend = data[data.length - 1] >= data[0] ? '↑' : '↓';
        let aimlineCoords = null;
        if (aimlineData && aimlineData.baseline != null && aimlineData.target != null) {
          const y1 = h - (aimlineData.baseline - min) / range * (h - 4) - 2;
          const y2 = h - (aimlineData.target - min) / range * (h - 4) - 2;
          aimlineCoords = {
            x1: 0,
            y1,
            x2: w,
            y2
          };
        }
        return /*#__PURE__*/React.createElement("div", {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }
        }, /*#__PURE__*/React.createElement("svg", {
          width: w,
          height: h,
          viewBox: `0 0 ${w} ${h}`,
          "aria-hidden": "true"
        }, aimlineCoords && /*#__PURE__*/React.createElement("line", {
          x1: aimlineCoords.x1,
          y1: aimlineCoords.y1,
          x2: aimlineCoords.x2,
          y2: aimlineCoords.y2,
          stroke: "#f59e0b",
          strokeWidth: "1.5",
          strokeDasharray: "4 3",
          opacity: "0.7"
        }), /*#__PURE__*/React.createElement("polyline", {
          points: points,
          fill: "none",
          stroke: color,
          strokeWidth: "2",
          strokeLinecap: "round",
          strokeLinejoin: "round"
        }), data.map((v, i) => /*#__PURE__*/React.createElement("circle", {
          key: i,
          cx: i / (data.length - 1) * w,
          cy: h - (v - min) / range * (h - 4) - 2,
          r: "2.5",
          fill: color
        }))), /*#__PURE__*/React.createElement("span", {
          style: {
            fontSize: '14px',
            fontWeight: 700,
            color: trend === '↑' ? '#16a34a' : '#dc2626'
          }
        }, trend), aimlineCoords && /*#__PURE__*/React.createElement("span", {
          style: {
            fontSize: '9px',
            fontWeight: 600,
            color: '#f59e0b'
          }
        }, "\u23AF\u23AF"));
      };
      return /*#__PURE__*/React.createElement("div", {
        "data-help-key": "dashboard_rti_monitor",
        className: "mb-4 p-4 rounded-xl border-2",
        style: {
          background: `linear-gradient(135deg, ${rti.bg} 0%, white 100%)`,
          borderColor: rti.border
        }
      }, /*#__PURE__*/React.createElement("div", {
        className: "flex items-center justify-between mb-3"
      }, /*#__PURE__*/React.createElement("div", {
        className: "flex items-center gap-3"
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: '28px'
        }
      }, rti.emoji), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: '16px',
          fontWeight: 800,
          color: rti.color
        }
      }, rti.label), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: '11px',
          color: '#64748b',
          fontWeight: 600
        }
      }, t('rti.progress_monitor')))), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: '11px',
          color: '#94a3b8'
        }
      }, new Date().toLocaleDateString())), /*#__PURE__*/React.createElement("div", {
        className: "grid grid-cols-3 gap-2 mb-3"
      }, metrics.map((m, i) => /*#__PURE__*/React.createElement("div", {
        key: i,
        className: "bg-white rounded-lg p-2 text-center border",
        style: {
          borderColor: m.color + '33'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: '10px',
          marginBottom: '2px'
        }
      }, m.icon), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: '16px',
          fontWeight: 800,
          color: m.color
        }
      }, m.value), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: '10px',
          color: '#64748b',
          fontWeight: 600
        }
      }, m.label)))), (fluencyData.length >= 2 || gameScores.length >= 2) && /*#__PURE__*/React.createElement("div", {
        className: "grid grid-cols-2 gap-2 mb-3"
      }, fluencyData.length >= 2 && /*#__PURE__*/React.createElement("div", {
        className: "bg-white rounded-lg p-2 border border-slate-100"
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: '10px',
          fontWeight: 700,
          color: '#64748b',
          marginBottom: '4px'
        }
      }, "\uD83D\uDCD6 Fluency Trend"), renderSparkline(fluencyData, '#6366f1', rtiGoals[selectedStudent.name] ? {
        baseline: rtiGoals[selectedStudent.name].baseline,
        target: rtiGoals[selectedStudent.name].target
      } : null)), gameScores.length >= 2 && /*#__PURE__*/React.createElement("div", {
        className: "bg-white rounded-lg p-2 border border-slate-100"
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: '10px',
          fontWeight: 700,
          color: '#64748b',
          marginBottom: '4px'
        }
      }, "\uD83C\uDFAE Game Scores Trend"), renderSparkline(gameScores, '#8b5cf6')), mathFluencyHistory.length >= 2 && /*#__PURE__*/React.createElement("div", {
        className: "bg-white rounded-lg p-2 border border-slate-100"
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: "10px",
          fontWeight: 700,
          color: "#64748b",
          marginBottom: "4px"
        }
      }, "\uD83D\uDD22 Math DCPM Trend"), renderSparkline(mathFluencyHistory.map(h => h.dcpm), "#f59e0b"))), (() => {
        var codename = selectedStudent.name;
        var longData = rosterKey && rosterKey.progressHistory && rosterKey.progressHistory[codename];
        if (!longData || longData.length < 2) return null;
        var quizTrend = longData.map(function (s) {
          return s.quizAvg;
        }).filter(function (v) {
          return v > 0;
        });
        var wsTrend = longData.map(function (s) {
          return s.wsAccuracy;
        }).filter(function (v) {
          return v > 0;
        });
        var fluencyTrend = longData.map(function (s) {
          return s.fluencyWCPM;
        }).filter(function (v) {
          return v > 0;
        });
        var hasAny = quizTrend.length >= 2 || wsTrend.length >= 2 || fluencyTrend.length >= 2;
        if (!hasAny) return null;
        return React.createElement("div", {
          className: "mb-4 p-3 rounded-xl border-2 border-purple-200",
          style: {
            background: "linear-gradient(135deg, #faf5ff 0%, white 100%)"
          }
        }, React.createElement("div", {
          style: {
            fontSize: "11px",
            fontWeight: 800,
            color: "#7c3aed",
            marginBottom: "8px",
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }
        }, "📈 Longitudinal Progress (" + longData.length + " sessions)"), React.createElement("div", {
          className: "grid grid-cols-3 gap-2"
        }, quizTrend.length >= 2 ? React.createElement("div", {
          className: "bg-white rounded-lg p-2 border border-purple-100"
        }, React.createElement("div", {
          style: {
            fontSize: "10px",
            fontWeight: 700,
            color: "#64748b",
            marginBottom: "4px"
          }
        }, "📝 Quiz Avg"), renderSparkline(quizTrend, "#8b5cf6")) : null, wsTrend.length >= 2 ? React.createElement("div", {
          className: "bg-white rounded-lg p-2 border border-purple-100"
        }, React.createElement("div", {
          style: {
            fontSize: "10px",
            fontWeight: 700,
            color: "#64748b",
            marginBottom: "4px"
          }
        }, "🔊 WS Accuracy"), renderSparkline(wsTrend, "#6366f1")) : null, fluencyTrend.length >= 2 ? React.createElement("div", {
          className: "bg-white rounded-lg p-2 border border-purple-100"
        }, React.createElement("div", {
          style: {
            fontSize: "10px",
            fontWeight: 700,
            color: "#64748b",
            marginBottom: "4px"
          }
        }, "📖 Fluency WCPM"), renderSparkline(fluencyTrend, "#0ea5e9", rtiGoals[codename] ? {
          baseline: rtiGoals[codename].baseline,
          target: rtiGoals[codename].target
        } : null)) : null), React.createElement("div", {
          style: {
            fontSize: "9px",
            color: "#94a3b8",
            marginTop: "6px",
            textAlign: "right"
          }
        }, "First: " + longData[0].date + " → Latest: " + longData[longData.length - 1].date));
      })(), /*#__PURE__*/React.createElement("div", {
        className: "mb-2"
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: '11px',
          fontWeight: 700,
          color: '#475569',
          marginBottom: '4px'
        }
      }, "Assessment Basis:"), /*#__PURE__*/React.createElement("div", {
        className: "flex flex-wrap gap-1"
      }, rti.reasons.map((r, i) => /*#__PURE__*/React.createElement("span", {
        key: i,
        className: "text-xs px-2 py-0.5 rounded-full",
        style: {
          background: rti.bg,
          color: rti.color,
          fontWeight: 600,
          border: `1px solid ${rti.border}`
        }
      }, r)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: '11px',
          fontWeight: 700,
          color: '#475569',
          marginBottom: '4px'
        }
      }, "\uD83D\uDCA1 Recommendations:"), /*#__PURE__*/React.createElement("ul", {
        style: {
          fontSize: '12px',
          color: '#334155',
          margin: 0,
          paddingLeft: '16px',
          lineHeight: 1.6
        }
      }, rti.recommendations.map((r, i) => /*#__PURE__*/React.createElement("li", {
        key: i
      }, r)))), /*#__PURE__*/React.createElement("div", {
        className: "mt-3 p-3 bg-white rounded-lg border border-slate-400"
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: '11px',
          fontWeight: 700,
          color: '#4338ca',
          marginBottom: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }
      }, "\uD83C\uDFAF WCPM Goal Setting"), (() => {
        const studentGoal = rtiGoals[selectedStudent.name];
        const fluencyData = selectedStudent.data?.fluencyAssessments?.map(a => ({
          value: a.wcpm || 0,
          date: a.timestamp || a.date
        })) || [];
        const latestWCPM = fluencyData.length > 0 ? fluencyData[fluencyData.length - 1].value : 0;
        const aimline = studentGoal ? calculateAimline(studentGoal, fluencyData) : null;
        return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
          style: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '6px',
            marginBottom: '8px'
          }
        }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
          style: {
            fontSize: '10px',
            fontWeight: 700,
            color: '#64748b',
            display: 'block',
            marginBottom: '2px'
          }
        }, "Baseline"), /*#__PURE__*/React.createElement("input", {
          type: "number",
          placeholder: latestWCPM || '—',
          "aria-label": "Baseline score",
          defaultValue: studentGoal?.baseline || '',
          id: `rti-baseline-${selectedStudent.name}`,
          style: {
            width: '100%',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '4px 8px',
            fontSize: '13px',
            fontWeight: 600
          }
        })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
          style: {
            fontSize: '10px',
            fontWeight: 700,
            color: '#64748b',
            display: 'block',
            marginBottom: '2px'
          }
        }, t('probes.target_wcpm')), /*#__PURE__*/React.createElement("input", {
          type: "number",
          placeholder: "e.g. 72",
          "aria-label": "Target WCPM",
          defaultValue: studentGoal?.target || '',
          id: `rti-target-${selectedStudent.name}`,
          style: {
            width: '100%',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '4px 8px',
            fontSize: '13px',
            fontWeight: 600
          }
        })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
          style: {
            fontSize: '10px',
            fontWeight: 700,
            color: '#64748b',
            display: 'block',
            marginBottom: '2px'
          }
        }, t('probes.target_date')), /*#__PURE__*/React.createElement("input", {
          type: "date",
          "aria-label": "Target date",
          defaultValue: studentGoal?.targetDate || '',
          id: `rti-date-${selectedStudent.name}`,
          style: {
            width: '100%',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '4px 8px',
            fontSize: '12px',
            fontWeight: 600
          }
        }))), /*#__PURE__*/React.createElement("button", {
          onClick: () => {
            const b = document.getElementById(`rti-baseline-${selectedStudent.name}`)?.value;
            const t2 = document.getElementById(`rti-target-${selectedStudent.name}`)?.value;
            const d = document.getElementById(`rti-date-${selectedStudent.name}`)?.value;
            if (b && t2 && d) {
              saveRtiGoal(selectedStudent.name, {
                baseline: parseInt(b),
                target: parseInt(t2),
                targetDate: d,
                metric: 'wcpm',
                baselineDate: new Date().toISOString()
              });
              addToast('RTI goal saved for ' + selectedStudent.name, 'success');
            } else {
              addToast('Please fill in all three fields', 'warning');
            }
          },
          style: {
            fontSize: '11px',
            fontWeight: 700,
            color: 'white',
            background: '#4f46e5',
            border: 'none',
            borderRadius: '6px',
            padding: '5px 12px',
            cursor: 'pointer',
            marginBottom: '6px'
          }
        }, "Save Goal"), aimline && /*#__PURE__*/React.createElement("div", {
          style: {
            marginTop: '6px'
          }
        }, /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: '10px',
            fontWeight: 700,
            color: '#475569',
            marginBottom: '4px'
          }
        }, "\uD83D\uDCC8 Aimline: ", studentGoal.baseline, " \u2192 ", studentGoal.target, " WCPM over ", aimline.totalWeeks, " weeks", aimline.slope > 0 && /*#__PURE__*/React.createElement("span", {
          style: {
            color: '#16a34a'
          }
        }, " (+", aimline.slope.toFixed(1), "/wk)")), aimline.alert === 'critical' && /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: '11px',
            fontWeight: 700,
            color: '#dc2626',
            background: '#fee2e2',
            padding: '6px 10px',
            borderRadius: '6px',
            border: '1px solid #fca5a5'
          }
        }, "\uD83D\uDD34 6+ data points below aimline \u2014 Tier change recommended"), aimline.alert === 'warning' && /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: '11px',
            fontWeight: 700,
            color: '#d97706',
            background: '#fef9c3',
            padding: '6px 10px',
            borderRadius: '6px',
            border: '1px solid #fcd34d'
          }
        }, "\uD83D\uDFE1 4+ data points below aimline \u2014 Consider adjusting intervention"), aimline.alert === 'ok' && studentGoal && /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: '11px',
            fontWeight: 700,
            color: '#16a34a',
            background: '#dcfce7',
            padding: '6px 10px',
            borderRadius: '6px',
            border: '1px solid #86efac'
          }
        }, "\uD83D\uDFE2 On track toward goal")));
      })()), /*#__PURE__*/React.createElement("div", {
        className: "mt-3 p-3 bg-white rounded-lg border border-slate-400"
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: "11px",
          fontWeight: 700,
          color: "#7c3aed",
          marginBottom: "6px",
          display: "flex",
          alignItems: "center",
          gap: "4px"
        }
      }, "\u2699\uFE0F Decision Rule Settings"), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          gap: "8px",
          alignItems: "center",
          flexWrap: "wrap"
        }
      }, /*#__PURE__*/React.createElement("select", {
        "aria-label": t('common.decision_rule_method'),
        value: rtiDecisionRuleMethod,
        onChange: e => setRtiDecisionRuleMethod(e.target.value),
        style: {
          fontSize: "10px",
          padding: "3px 6px",
          borderRadius: "6px",
          border: "1px solid #e2e8f0",
          fontWeight: 600
        }
      }, /*#__PURE__*/React.createElement("option", {
        value: "four_point"
      }, "Four-Point Analysis"), /*#__PURE__*/React.createElement("option", {
        value: "trend_line"
      }, t('rti.trend_line_comparison')), /*#__PURE__*/React.createElement("option", {
        value: "median_3"
      }, "Median of Last 3")), rtiDecisionRuleMethod === "four_point" && /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: "4px"
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: "10px",
          color: "#64748b",
          fontWeight: 600
        }
      }, "Threshold:"), /*#__PURE__*/React.createElement("select", {
        "aria-label": t('common.decision_threshold'),
        value: rtiDecisionRuleThreshold,
        onChange: e => setRtiDecisionRuleThreshold(parseInt(e.target.value)),
        style: {
          fontSize: "10px",
          padding: "2px 4px",
          borderRadius: "4px",
          border: "1px solid #e2e8f0",
          fontWeight: 600
        }
      }, /*#__PURE__*/React.createElement("option", {
        value: 3
      }, "3 points"), /*#__PURE__*/React.createElement("option", {
        value: 4
      }, "4 points"), /*#__PURE__*/React.createElement("option", {
        value: 5
      }, "5 points"), /*#__PURE__*/React.createElement("option", {
        value: 6
      }, "6 points"))), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: "9px",
          color: "#94a3b8",
          fontStyle: "italic"
        }
      }, t('rti.ncii_recommended')))), /*#__PURE__*/React.createElement("div", {
        className: "mt-3 p-3 bg-white rounded-lg border border-slate-400"
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: '11px',
          fontWeight: 700,
          color: '#0e7490',
          marginBottom: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }
      }, "\uD83D\uDCDD Intervention Log"), (interventionLogs[selectedStudent.name] || []).length > 0 && /*#__PURE__*/React.createElement("div", {
        style: {
          marginBottom: '8px'
        }
      }, (interventionLogs[selectedStudent.name] || []).map(log => /*#__PURE__*/React.createElement("div", {
        key: log.id,
        style: {
          fontSize: '11px',
          background: '#f0fdfa',
          border: '1px solid #99f6e4',
          borderRadius: '8px',
          padding: '8px',
          marginBottom: '4px',
          position: 'relative'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'start'
        }
      }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
        style: {
          fontWeight: 700,
          color: '#0e7490'
        }
      }, log.program), /*#__PURE__*/React.createElement("span", {
        style: {
          color: '#64748b',
          marginLeft: '8px'
        }
      }, log.frequency, ", ", log.minutes, " min, group of ", log.groupSize)), /*#__PURE__*/React.createElement("button", {
        onClick: () => deleteInterventionLog(selectedStudent.name, log.id),
        style: {
          fontSize: '10px',
          color: '#94a3b8',
          cursor: 'pointer',
          background: 'none',
          border: 'none',
          padding: '2px'
        },
        "aria-label": t('common.delete_log')
      }, "\u2715")), log.notes && /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: '10px',
          color: '#64748b',
          marginTop: '4px',
          fontStyle: 'italic'
        }
      }, "\"", log.notes, "\""), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: '9px',
          color: '#94a3b8',
          marginTop: '2px'
        }
      }, "Started: ", log.startDate, " \u2022 Logged: ", new Date(log.createdAt).toLocaleDateString())))), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '6px',
          marginBottom: '6px'
        }
      }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
        style: {
          fontSize: '10px',
          fontWeight: 700,
          color: '#64748b',
          display: 'block',
          marginBottom: '2px'
        }
      }, "Program/Curriculum"), /*#__PURE__*/React.createElement("input", {
        type: "text",
        placeholder: "e.g. Wilson Reading",
        "aria-label": "Program or curriculum",
        id: `intv-program-${selectedStudent.name}`,
        style: {
          width: '100%',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          padding: '4px 8px',
          fontSize: '12px'
        }
      })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
        style: {
          fontSize: '10px',
          fontWeight: 700,
          color: '#64748b',
          display: 'block',
          marginBottom: '2px'
        }
      }, "Frequency"), /*#__PURE__*/React.createElement("select", {
        "aria-label": "Intervention frequency",
        id: `intv-freq-${selectedStudent.name}`,
        style: {
          width: '100%',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          padding: '4px 8px',
          fontSize: '12px'
        }
      }, /*#__PURE__*/React.createElement("option", {
        value: "daily"
      }, "Daily"), /*#__PURE__*/React.createElement("option", {
        value: "3x/week"
      }, "3x/week"), /*#__PURE__*/React.createElement("option", {
        value: "2x/week"
      }, "2x/week"), /*#__PURE__*/React.createElement("option", {
        value: "weekly"
      }, "Weekly"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
        style: {
          fontSize: '10px',
          fontWeight: 700,
          color: '#64748b',
          display: 'block',
          marginBottom: '2px'
        }
      }, "Minutes/Session"), /*#__PURE__*/React.createElement("input", {
        type: "number",
        placeholder: "30",
        "aria-label": "Minutes per session",
        id: `intv-min-${selectedStudent.name}`,
        style: {
          width: '100%',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          padding: '4px 8px',
          fontSize: '12px'
        }
      })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
        style: {
          fontSize: '10px',
          fontWeight: 700,
          color: '#64748b',
          display: 'block',
          marginBottom: '2px'
        }
      }, t('probes.group_size')), /*#__PURE__*/React.createElement("input", {
        type: "number",
        placeholder: "4",
        "aria-label": "Group size",
        id: `intv-group-${selectedStudent.name}`,
        style: {
          width: '100%',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          padding: '4px 8px',
          fontSize: '12px'
        }
      }))), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '6px',
          marginBottom: '6px'
        }
      }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
        style: {
          fontSize: '10px',
          fontWeight: 700,
          color: '#64748b',
          display: 'block',
          marginBottom: '2px'
        }
      }, t('probes.start_date')), /*#__PURE__*/React.createElement("input", {
        type: "date",
        "aria-label": "Intervention start date",
        id: `intv-date-${selectedStudent.name}`,
        style: {
          width: '100%',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          padding: '4px 8px',
          fontSize: '12px'
        }
      })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
        style: {
          fontSize: '10px',
          fontWeight: 700,
          color: '#64748b',
          display: 'block',
          marginBottom: '2px'
        }
      }, "Notes"), /*#__PURE__*/React.createElement("input", {
        type: "text",
        placeholder: t('common.placeholder_optional_notes'),
        "aria-label": "Intervention notes",
        id: `intv-notes-${selectedStudent.name}`,
        style: {
          width: '100%',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          padding: '4px 8px',
          fontSize: '12px'
        }
      }))), /*#__PURE__*/React.createElement("button", {
        onClick: () => {
          const program = document.getElementById(`intv-program-${selectedStudent.name}`)?.value;
          const frequency = document.getElementById(`intv-freq-${selectedStudent.name}`)?.value;
          const minutes = document.getElementById(`intv-min-${selectedStudent.name}`)?.value;
          const groupSize = document.getElementById(`intv-group-${selectedStudent.name}`)?.value;
          const startDate = document.getElementById(`intv-date-${selectedStudent.name}`)?.value;
          const notes = document.getElementById(`intv-notes-${selectedStudent.name}`)?.value;
          if (program && frequency) {
            saveInterventionLog(selectedStudent.name, {
              program,
              frequency,
              minutes: minutes || '30',
              groupSize: groupSize || '1',
              startDate: startDate || new Date().toISOString().split('T')[0],
              notes
            });
            addToast('Intervention logged for ' + selectedStudent.name, 'success');
            ['program', 'freq', 'min', 'group', 'date', 'notes'].forEach(f => {
              const el = document.getElementById(`intv-${f}-${selectedStudent.name}`);
              if (el) el.value = '';
            });
          } else {
            addToast('Program name and frequency are required', 'warning');
          }
        },
        style: {
          fontSize: '11px',
          fontWeight: 700,
          color: 'white',
          background: '#0e7490',
          border: 'none',
          borderRadius: '6px',
          padding: '5px 12px',
          cursor: 'pointer'
        }
      }, "Log Intervention")));
    })(), selectedStudent.safetyFlags.length > 0 && /*#__PURE__*/React.createElement("div", {
      "data-help-key": "dashboard_detail_safety",
      className: "mb-4 p-4 bg-rose-50 border border-rose-200 rounded-xl"
    }, /*#__PURE__*/React.createElement("h4", {
      className: "font-bold text-rose-700 mb-2 flex items-center gap-2"
    }, /*#__PURE__*/React.createElement(AlertCircle, {
      size: 16
    }), t('class_analytics.flags_detected', {
      count: selectedStudent.safetyFlags.length
    })), /*#__PURE__*/React.createElement("div", {
      className: "space-y-2"
    }, (selectedStudent?.safetyFlags || []).map((flag, idx) => /*#__PURE__*/React.createElement("div", {
      key: idx,
      className: "bg-white p-2 rounded-lg border border-rose-100 text-sm"
    }, /*#__PURE__*/React.createElement("div", {
      className: "font-medium text-rose-600"
    }, SafetyContentChecker.getCategoryLabel(flag.category, t)), /*#__PURE__*/React.createElement("div", {
      className: "text-slate-600 text-xs mt-1 italic"
    }, "\"", flag.context, "...\""))))), selectedStudent.data?.fluencyAssessments?.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "mb-4 space-y-3"
    }, (() => {
      const latest = selectedStudent.data.fluencyAssessments[selectedStudent.data.fluencyAssessments.length - 1];
      if (!latest?.wordData) return null;
      const rr = calculateRunningRecordMetrics(latest.wordData, latest.insertions || []);
      if (!rr) return null;
      return /*#__PURE__*/React.createElement("div", {
        "data-help-key": "dashboard_detail_running_record",
        className: "p-4 bg-indigo-50 border border-indigo-200 rounded-xl"
      }, /*#__PURE__*/React.createElement("h4", {
        className: "font-bold text-indigo-700 mb-3 flex items-center gap-2"
      }, /*#__PURE__*/React.createElement(BarChart2, {
        size: 16
      }), t('class_analytics.running_record') || 'Running Record'), /*#__PURE__*/React.createElement("div", {
        className: "grid grid-cols-2 md:grid-cols-4 gap-2"
      }, /*#__PURE__*/React.createElement("div", {
        className: "bg-white rounded-lg p-2 text-center border border-indigo-100"
      }, /*#__PURE__*/React.createElement("div", {
        className: "text-lg font-bold text-rose-600"
      }, rr.substitutions), /*#__PURE__*/React.createElement("div", {
        className: "text-xs text-slate-600"
      }, t('fluency.substitutions') || 'Substitutions')), /*#__PURE__*/React.createElement("div", {
        className: "bg-white rounded-lg p-2 text-center border border-indigo-100"
      }, /*#__PURE__*/React.createElement("div", {
        className: "text-lg font-bold text-orange-600"
      }, rr.omissions), /*#__PURE__*/React.createElement("div", {
        className: "text-xs text-slate-600"
      }, t('fluency.omissions') || 'Omissions')), /*#__PURE__*/React.createElement("div", {
        className: "bg-white rounded-lg p-2 text-center border border-indigo-100"
      }, /*#__PURE__*/React.createElement("div", {
        className: "text-lg font-bold text-purple-600"
      }, rr.insertions), /*#__PURE__*/React.createElement("div", {
        className: "text-xs text-slate-600"
      }, t('fluency.insertions_label') || 'Insertions')), /*#__PURE__*/React.createElement("div", {
        className: "bg-white rounded-lg p-2 text-center border border-indigo-100"
      }, /*#__PURE__*/React.createElement("div", {
        className: "text-lg font-bold text-blue-600"
      }, rr.selfCorrections), /*#__PURE__*/React.createElement("div", {
        className: "text-xs text-slate-600"
      }, t('fluency.self_corrections') || 'Self-Corrections'))), /*#__PURE__*/React.createElement("div", {
        className: "mt-2 flex flex-wrap gap-3 text-xs text-slate-600"
      }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("strong", null, t('fluency.error_rate') || 'Error Rate', ":"), " 1:", rr.errorRate), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("strong", null, t('fluency.sc_rate') || 'SC Rate', ":"), " ", rr.scRate), /*#__PURE__*/React.createElement("span", {
        className: `px-2 py-0.5 rounded-full font-medium ${rr.accuracy >= 95 ? 'bg-emerald-100 text-emerald-700' : rr.accuracy >= 90 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`
      }, rr.accuracy >= 95 ? t('fluency.independent') || 'Independent' : rr.accuracy >= 90 ? t('fluency.instructional') || 'Instructional' : t('fluency.frustrational') || 'Frustrational', " (", rr.accuracy, "%)")));
    })(), selectedStudent.data.fluencyAssessments.length >= 2 && /*#__PURE__*/React.createElement("div", {
      className: "bg-white border border-slate-400 rounded-xl p-4",
      style: {
        height: '220px'
      }
    }, /*#__PURE__*/React.createElement("canvas", {
      ref: trendChartRef,
      role: "img",
      "aria-label": "Reading fluency trend chart for selected student showing words per minute over time"
    })), (() => {
      const latest = selectedStudent.data.fluencyAssessments[selectedStudent.data.fluencyAssessments.length - 1];
      if (!latest?.wcpm) return null;
      const result = getBenchmarkComparison(latest.wcpm, '2', 'winter');
      if (!result) return null;
      const levelColors = {
        above: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        at: 'bg-green-100 text-green-700 border-green-200',
        approaching: 'bg-amber-100 text-amber-700 border-amber-200',
        below: 'bg-rose-100 text-rose-700 border-rose-200'
      };
      return /*#__PURE__*/React.createElement("div", {
        className: `flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium ${levelColors[result.level] || 'bg-slate-100 text-slate-600 border-slate-200'}`
      }, /*#__PURE__*/React.createElement("span", null, t('class_analytics.benchmark_vs') || 'vs. Benchmark', ":"), /*#__PURE__*/React.createElement("span", {
        className: "font-bold"
      }, latest.wcpm, " WCPM"));
    })()), selectedStudent.data?.wordSoundsState && (selectedStudent.data.wordSoundsState.history?.length > 0 || selectedStudent.data.wordSoundsState.sessionScore) && /*#__PURE__*/React.createElement("div", {
      "data-help-key": "dashboard_detail_word_sounds",
      className: "mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl"
    }, /*#__PURE__*/React.createElement("h4", {
      className: "font-bold text-emerald-700 mb-3 flex items-center gap-2"
    }, "\uD83D\uDD24 Word Sounds Performance"), /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-2 md:grid-cols-4 gap-2"
    }, selectedStudent.stats?.wsAccuracy > 0 && /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-lg p-2 text-center border border-emerald-100"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-lg font-bold text-emerald-600"
    }, selectedStudent.stats.wsAccuracy, "%"), /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-slate-600"
    }, "Accuracy")), selectedStudent.stats?.wsWordsCompleted > 0 && /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-lg p-2 text-center border border-emerald-100"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-lg font-bold text-teal-600"
    }, selectedStudent.stats.wsWordsCompleted), /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-slate-600"
    }, t('class_analytics.words_completed'))), selectedStudent.stats?.wsBestStreak > 0 && /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-lg p-2 text-center border border-emerald-100"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-lg font-bold text-amber-600"
    }, selectedStudent.stats.wsBestStreak, "\uD83D\uDD25"), /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-slate-600"
    }, t('class_analytics.best_streak'))), selectedStudent.data.wordSoundsState.phonemeMastery && Object.keys(selectedStudent.data.wordSoundsState.phonemeMastery).length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-lg p-2 text-center border border-emerald-100"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-lg font-bold text-purple-600"
    }, Object.keys(selectedStudent.data.wordSoundsState.phonemeMastery).length), /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-slate-600"
    }, t('class_analytics.phonemes_practiced')))), selectedStudent.data.wordSoundsState.badges?.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "mt-2 flex flex-wrap gap-1"
    }, selectedStudent.data.wordSoundsState.badges.map((badge, bi) => /*#__PURE__*/React.createElement("span", {
      key: bi,
      className: "px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-medium"
    }, typeof badge === 'string' ? badge : badge.name || '🏆')))), selectedStudent.stats?.gamesPlayed > 0 && /*#__PURE__*/React.createElement("div", {
      "data-help-key": "dashboard_detail_games",
      className: "mb-4 p-4 bg-violet-50 border border-violet-200 rounded-xl"
    }, /*#__PURE__*/React.createElement("h4", {
      className: "font-bold text-violet-700 mb-3 flex items-center gap-2"
    }, "\uD83C\uDFAE Game Performance (", selectedStudent.stats.gamesPlayed, " total plays)"), /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2"
    }, [{
      key: 'memoryGame',
      label: 'Memory',
      icon: '🧠'
    }, {
      key: 'matchingGame',
      label: 'Matching',
      icon: '🔗'
    }, {
      key: 'syntaxScramble',
      label: 'Syntax Scramble',
      icon: '📝'
    }, {
      key: 'crosswordGame',
      label: 'Crossword',
      icon: '✏️'
    }, {
      key: 'timelineGame',
      label: 'Timeline',
      icon: '📅'
    }, {
      key: 'conceptSortGame',
      label: 'Concept Sort',
      icon: '🗂️'
    }, {
      key: 'vennDiagram',
      label: 'Venn Diagram',
      icon: '⭕'
    }, {
      key: 'bingo',
      label: 'Bingo',
      icon: '🎯'
    }, {
      key: 'wordScramble',
      label: 'Word Scramble',
      icon: '🔤'
    }].filter(g => selectedStudent.stats[g.key]).map(game => {
      const s = selectedStudent.stats[game.key];
      return /*#__PURE__*/React.createElement("div", {
        key: game.key,
        className: "bg-white rounded-lg p-3 border border-violet-100"
      }, /*#__PURE__*/React.createElement("div", {
        className: "flex items-center justify-between mb-1"
      }, /*#__PURE__*/React.createElement("span", {
        className: "font-medium text-sm text-slate-700"
      }, game.icon, " ", game.label), /*#__PURE__*/React.createElement("span", {
        className: "text-xs text-slate-600"
      }, s.attempts, " play", s.attempts !== 1 ? 's' : '')), /*#__PURE__*/React.createElement("div", {
        className: "flex items-center gap-3"
      }, /*#__PURE__*/React.createElement("div", {
        className: "text-center"
      }, /*#__PURE__*/React.createElement("div", {
        className: "text-lg font-bold text-violet-600"
      }, Math.round(s.best), "%"), /*#__PURE__*/React.createElement("div", {
        className: "text-[11px] text-slate-600 uppercase"
      }, "Best")), /*#__PURE__*/React.createElement("div", {
        className: "flex-1 h-2 bg-slate-100 rounded-full overflow-hidden"
      }, /*#__PURE__*/React.createElement("div", {
        className: "h-full rounded-full transition-all",
        style: {
          width: `${Math.min(100, Math.round(s.best))}%`,
          background: s.best >= 80 ? '#10b981' : s.best >= 50 ? '#f59e0b' : '#ef4444'
        }
      })), s.attempts > 1 && /*#__PURE__*/React.createElement("div", {
        className: "text-center"
      }, /*#__PURE__*/React.createElement("div", {
        className: `text-xs font-bold ${s.best > s.initial ? 'text-emerald-600' : 'text-slate-600'}`
      }, s.best > s.initial ? `+${Math.round(s.best - s.initial)}%` : '—'), /*#__PURE__*/React.createElement("div", {
        className: "text-[11px] text-slate-600 uppercase"
      }, "Growth"))));
    }))), selectedStudent.data?.labelChallengeResults?.length > 0 && /*#__PURE__*/React.createElement("div", {
      "data-help-key": "dashboard_detail_label_challenge",
      className: "mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl"
    }, /*#__PURE__*/React.createElement("h4", {
      className: "font-bold text-blue-700 mb-3 flex items-center gap-2"
    }, "\uD83C\uDFC6 Label Challenge (", selectedStudent.stats.labelChallengeAttempts, " attempt", selectedStudent.stats.labelChallengeAttempts !== 1 ? 's' : '', ")"), /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-3 gap-2 mb-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-lg p-2 text-center border border-blue-100"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-lg font-bold text-blue-600"
    }, selectedStudent.stats.labelChallengeAvg, "%"), /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-slate-600"
    }, "Average")), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-lg p-2 text-center border border-blue-100"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-lg font-bold text-emerald-600"
    }, selectedStudent.stats.labelChallengeBest, "%"), /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-slate-600"
    }, t('class_analytics.best_score'))), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-lg p-2 text-center border border-blue-100"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-lg font-bold text-violet-600"
    }, selectedStudent.stats.labelChallengeAttempts), /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-slate-600"
    }, "Attempts"))), /*#__PURE__*/React.createElement("div", {
      className: "space-y-2 max-h-48 overflow-y-auto"
    }, selectedStudent.data.labelChallengeResults.map((result, ri) => /*#__PURE__*/React.createElement("div", {
      key: ri,
      className: "bg-white p-2 rounded-lg border border-blue-100 text-sm"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex justify-between items-center"
    }, /*#__PURE__*/React.createElement("span", {
      className: `font-bold ${result.score >= 80 ? 'text-emerald-600' : result.score >= 50 ? 'text-amber-600' : 'text-rose-600'}`
    }, result.score, "% \u2014 ", result.totalCorrect, "/", result.totalExpected, " correct"), /*#__PURE__*/React.createElement("span", {
      className: "text-xs text-slate-600"
    }, result.timestamp ? new Date(result.timestamp).toLocaleDateString() : '')), result.feedback && /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-slate-600 mt-1 italic"
    }, result.feedback))))), selectedStudent.data?.socraticChatHistory?.messages?.length > 0 && /*#__PURE__*/React.createElement("div", {
      "data-help-key": "dashboard_detail_socratic",
      className: "mb-4 border border-teal-200 rounded-xl overflow-hidden"
    }, /*#__PURE__*/React.createElement("div", {
      className: "bg-teal-100 p-3 font-bold text-teal-700 flex items-center gap-2"
    }, "\uD83D\uDCAC Socratic Chatbot (", selectedStudent.data.socraticChatHistory.messageCount, " messages)"), /*#__PURE__*/React.createElement("div", {
      className: "max-h-96 overflow-y-auto p-3 space-y-2"
    }, selectedStudent.data.socraticChatHistory.messages.map((msg, idx) => /*#__PURE__*/React.createElement("div", {
      key: idx,
      className: `p-2 rounded-lg text-sm ${msg.role === 'user' ? 'bg-teal-100 ml-8' : 'bg-slate-100 mr-8'}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "font-medium text-xs text-slate-600 mb-1"
    }, msg.role === 'user' ? 'Student' : 'Socratic Tutor'), msg.content || msg.text)))), selectedStudent.data.personaState?.chatHistory?.length > 0 ? /*#__PURE__*/React.createElement("div", {
      "data-help-key": "dashboard_detail_transcript",
      className: "border border-slate-400 rounded-xl overflow-hidden"
    }, /*#__PURE__*/React.createElement("div", {
      className: "bg-slate-100 p-3 font-bold text-slate-700"
    }, t('class_analytics.view_transcript')), /*#__PURE__*/React.createElement("div", {
      className: "max-h-96 overflow-y-auto p-3 space-y-2"
    }, (selectedStudent?.data?.personaState?.chatHistory || []).map((msg, idx) => /*#__PURE__*/React.createElement("div", {
      key: idx,
      className: `p-2 rounded-lg text-sm ${msg.role === 'user' || msg.sender === 'student' ? 'bg-indigo-100 ml-8' : 'bg-slate-100 mr-8'}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "font-medium text-xs text-slate-600 mb-1"
    }, msg.role === 'user' || msg.sender === 'student' ? 'Student' : 'Character'), msg.content || msg.text)))) : /*#__PURE__*/React.createElement("div", {
      className: "text-center py-8 text-slate-600"
    }, t('class_analytics.no_transcript'),
    // ── Student Data Tab ──
    !isIndependentMode && assessmentCenterTab === 'students' && React.createElement("div", {
      className: "flex-1 overflow-y-auto p-4 animate-in fade-in duration-200"
    },
      // Import toolbar
      React.createElement("div", { className: "flex flex-wrap gap-3 mb-4" },
        React.createElement("label", { className: "cursor-pointer" },
          React.createElement("input", {
            "aria-label": t('common.upload_json_file'),
            type: "file", accept: ".json", multiple: true,
            onChange: handleFileImport, className: "hidden"
          }),
          React.createElement("div", {
            className: "bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
          }, React.createElement(Upload, { size: 16 }), t('class_analytics.import_button'))
        ),
        importedStudents.length > 0 && React.createElement(React.Fragment, null,
          React.createElement("button", {
            onClick: handleExportCSV,
            className: "bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
          }, React.createElement(Download, { size: 16 }), t('class_analytics.export_csv')),
          React.createElement("button", {
            onClick: exportScreeningCSV,
            className: "bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
          }, React.createElement(Download, { size: 16 }), "Screening CSV"),
          React.createElement("button", {
            onClick: generateRTICSV,
            className: "bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
          }, React.createElement(Download, { size: 16 }), "RTI Report"),
          React.createElement("button", {
            onClick: () => { setImportedStudents([]); },
            className: "bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
          }, React.createElement(Trash2, { size: 16 }), t('class_analytics.clear_data'))
        )
      ),
      // Summary + student search
      importedStudents.length > 0 && React.createElement("div", { className: "mb-3" },
        React.createElement("input", {
          type: "text", placeholder: t('class_analytics.search_placeholder') || 'Search students...',
          "aria-label": "Search students", value: searchQuery,
          onChange: e => setSearchQuery(e.target.value),
          className: "w-full px-4 py-2 border border-slate-400 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 focus:outline-none transition-all text-sm"
        })
      ),
      // Summary cards
      classSummary && React.createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3 mb-4" },
        React.createElement("div", { className: "bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-center" },
          React.createElement("div", { className: "text-2xl font-bold text-indigo-600" }, classSummary.totalStudents),
          React.createElement("div", { className: "text-xs text-slate-600" }, t('class_analytics.total_students'))
        ),
        React.createElement("div", { className: "bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center" },
          React.createElement("div", { className: "text-2xl font-bold text-emerald-600" }, classSummary.avgQuizScore + '%'),
          React.createElement("div", { className: "text-xs text-slate-600" }, t('class_analytics.avg_quiz_score'))
        ),
        React.createElement("div", { className: (classSummary.studentsWithFlags > 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200') + ' border rounded-xl p-3 text-center' },
          React.createElement("div", { className: 'text-2xl font-bold ' + (classSummary.studentsWithFlags > 0 ? 'text-rose-600' : 'text-slate-600') }, classSummary.studentsWithFlags),
          React.createElement("div", { className: "text-xs text-slate-600" }, t('class_analytics.students_with_flags'))
        ),
        React.createElement("div", { className: "bg-purple-50 border border-purple-200 rounded-xl p-3 text-center" },
          React.createElement("div", { className: "text-2xl font-bold text-purple-600" }, importedStudents.reduce(function(acc, s) { return acc + s.stats.totalActivities; }, 0)),
          React.createElement("div", { className: "text-xs text-slate-600" }, t('class_analytics.total_activities'))
        )
      ),
      // RTI tier distribution summary
      classSummary && classSummary.rtiDistribution && React.createElement("div", {
        className: "mb-4 p-4 bg-gradient-to-r from-slate-50 to-indigo-50 border border-indigo-200 rounded-xl"
      },
        React.createElement("h3", { className: "font-bold text-slate-700 flex items-center gap-2 mb-3" }, '\uD83C\uDFAF RTI Tier Distribution'),
        React.createElement("div", { className: "grid grid-cols-3 gap-3" },
          [{ tier: 1, label: 'Tier 1', emoji: '\uD83D\uDFE2', color: '#16a34a', bg: '#dcfce7', border: '#86efac' },
           { tier: 2, label: 'Tier 2', emoji: '\uD83D\uDFE1', color: '#d97706', bg: '#fef9c3', border: '#fcd34d' },
           { tier: 3, label: 'Tier 3', emoji: '\uD83D\uDD34', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' }
          ].map(function(t) {
            var students = classSummary.rtiDistribution[t.tier] || [];
            return React.createElement("div", {
              key: t.tier, className: "rounded-xl p-3 text-center border-2",
              style: { background: t.bg, borderColor: t.border }
            },
              React.createElement("div", { style: { fontSize: '20px' } }, t.emoji),
              React.createElement("div", { style: { fontSize: '24px', fontWeight: 800, color: t.color } }, students.length),
              React.createElement("div", { style: { fontSize: '11px', fontWeight: 700, color: t.color } }, t.label),
              React.createElement("div", { className: "flex flex-wrap gap-1 mt-1 justify-center" },
                students.slice(0, 5).map(function(name, i) {
                  return React.createElement("span", { key: i, className: "text-[11px] px-1.5 py-0.5 rounded-full bg-white/70 font-medium", style: { color: t.color } }, name);
                }),
                students.length > 5 && React.createElement("span", { className: "text-[11px] text-slate-600" }, '+' + (students.length - 5) + ' more')
              )
            );
          })
        )
      ),
      // Charts
      importedStudents.length > 0 && React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 mb-4" },
        React.createElement("div", { className: "bg-white border border-slate-400 rounded-xl p-4", style: { minHeight: '200px' } },
          React.createElement("canvas", { ref: quizChartRef, role: "img", "aria-label": "Quiz performance chart showing class average and student trends" })
        ),
        classSummary && classSummary.totalFlags > 0 && React.createElement("div", { className: "bg-white border border-slate-400 rounded-xl p-4", style: { minHeight: '200px' } },
          React.createElement("canvas", { ref: flagsChartRef, role: "img", "aria-label": "Flagged students chart showing distribution of student-flag categories" })
        )
      ),
      // Student table
      sortedAndFiltered.length > 0 && React.createElement("div", { className: "bg-white rounded-xl border border-slate-400 overflow-hidden" },
        React.createElement("div", { className: "px-4 py-3 bg-slate-50 border-b border-slate-200 text-sm font-bold text-slate-600" },
          '\uD83D\uDCCB ' + sortedAndFiltered.length + ' Student' + (sortedAndFiltered.length !== 1 ? 's' : '') + ' Loaded'
        ),
        React.createElement("div", { className: "p-2 text-xs text-slate-600 text-center" },
          'Click a student name in the Assessments tab to view their full detail profile.'
        )
      ),
      // Empty state
      importedStudents.length === 0 && React.createElement("div", {
        className: "bg-slate-50 rounded-xl p-8 text-center border border-slate-400"
      },
        React.createElement("div", { className: "text-4xl mb-3" }, '\uD83D\uDCCB'),
        React.createElement("h3", { className: "text-lg font-bold text-slate-700 mb-2" }, 'Import Student Data'),
        React.createElement("p", { className: "text-sm text-slate-600 mb-4" }, 'Upload exported student JSON files to view analytics, RTI classification, and progress data.'),
        React.createElement("label", { className: "cursor-pointer inline-block" },
          React.createElement("input", { type: "file", accept: ".json", multiple: true, onChange: handleFileImport, className: "hidden", "aria-label": "Upload student JSON files" }),
          React.createElement("div", { className: "bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors" },
            React.createElement(Upload, { size: 18 }), 'Import Student Files'
          )
        )
      )
    ),
    !isIndependentMode && assessmentCenterTab === 'research' && /*#__PURE__*/React.createElement("div", {
      className: "flex-1 overflow-y-auto p-4 animate-in fade-in duration-200"
    }, /*#__PURE__*/React.createElement("div", {
      className: "space-y-6"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
      className: "text-lg font-bold text-slate-800"
    }, "\uD83D\uDCCA Research & Insights"), /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-slate-600"
    }, "Longitudinal analytics, growth tracking, and practice-to-outcome correlations")), importedStudents.length > 0 && /*#__PURE__*/React.createElement("select", {
      value: researchStudent || '',
      onChange: e => setResearchStudent(e.target.value || null),
      className: "px-3 py-1.5 text-sm border border-slate-400 rounded-lg",
      "aria-label": "Select student"
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "All students (class view)"), importedStudents.map(s => /*#__PURE__*/React.createElement("option", {
      key: s.name || s,
      value: s.name || s
    }, s.name || s)))), typeof renderResearchToolbar === 'function' && /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-xl border border-slate-400 p-3"
    }, renderResearchToolbar()), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap gap-2"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setShowCBMImport(true),
      className: "px-3 py-1.5 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-600 rounded-lg hover:bg-emerald-100 transition-all flex items-center gap-1"
    }, "\uD83D\uDCC2 Import CBM Data"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setShowSurveyModal(true),
      className: "px-3 py-1.5 text-xs font-bold bg-violet-50 text-violet-700 border border-violet-600 rounded-lg hover:bg-violet-100 transition-all flex items-center gap-1"
    }, "\uD83D\uDCDD Teacher Survey"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setShowResearchSetup(true),
      className: "px-3 py-1.5 text-xs font-bold bg-slate-50 text-slate-600 border border-slate-400 rounded-lg hover:bg-slate-100 transition-all flex items-center gap-1"
    }, "\u2699\uFE0F Settings")), typeof renderAutoSurveyPrompt === 'function' && renderAutoSurveyPrompt(), importedStudents.length === 0 ? React.createElement("div", { className: "space-y-4" },
      React.createElement("div", { className: "bg-gradient-to-br from-indigo-50 via-violet-50 to-purple-50 rounded-xl p-6 border border-indigo-200" },
        React.createElement("div", { className: "flex items-start gap-4" },
          React.createElement("div", { className: "text-4xl shrink-0" }, "\uD83D\uDD2C"),
          React.createElement("div", null,
            React.createElement("h4", { className: "text-lg font-bold text-slate-800 mb-1" }, "Embedded Research Suite"),
            React.createElement("p", { className: "text-sm text-slate-600 leading-relaxed" }, "AlloFlow includes complete research infrastructure for pilot studies, RTI progress monitoring, and program evaluation \u2014 all with zero PII and local-only data storage.")
          )
        )
      ),
      React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3" },
        React.createElement("div", { className: "bg-white rounded-xl p-4 border border-slate-400 shadow-sm" },
          React.createElement("div", { className: "flex items-center gap-2 mb-2" }, React.createElement("span", { className: "text-lg" }, "\uD83D\uDCCA"), React.createElement("h5", { className: "text-sm font-bold text-slate-700" }, "Research Mode")),
          React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed" }, "Start a named study with auto-session logging, configurable survey prompts, and IRB tracking.")
        ),
        React.createElement("div", { className: "bg-white rounded-xl p-4 border border-slate-400 shadow-sm" },
          React.createElement("div", { className: "flex items-center gap-2 mb-2" }, React.createElement("span", { className: "text-lg" }, "\uD83D\uDCDD"), React.createElement("h5", { className: "text-sm font-bold text-slate-700" }, "Built-In Surveys")),
          React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed" }, "Student, teacher, and parent surveys with pre/mid/post timepoints. Responses export as CSV for analysis.")
        ),
        React.createElement("div", { className: "bg-white rounded-xl p-4 border border-slate-400 shadow-sm" },
          React.createElement("div", { className: "flex items-center gap-2 mb-2" }, React.createElement("span", { className: "text-lg" }, "\uD83D\uDCC8"), React.createElement("h5", { className: "text-sm font-bold text-slate-700" }, "Growth Tracking & Insights")),
          React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed" }, "Import student data to unlock longitudinal growth, practice-to-outcome correlations, and RTI tier recommendations.")
        ),
        React.createElement("div", { className: "bg-white rounded-xl p-4 border border-slate-400 shadow-sm" },
          React.createElement("div", { className: "flex items-center gap-2 mb-2" }, React.createElement("span", { className: "text-lg" }, "\uD83D\uDCC4"), React.createElement("h5", { className: "text-sm font-bold text-slate-700" }, "Data Export")),
          React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed" }, "Three CSV exports: student-level research data, session-level fidelity log, and survey responses with timepoints. Plus CBM import.")
        )
      ),
      React.createElement("div", { className: "bg-white rounded-xl p-4 border border-slate-400" },
        React.createElement("h5", { className: "text-sm font-bold text-slate-700 mb-3" }, "\uD83D\uDE80 Getting Started"),
        React.createElement("div", { className: "space-y-2" },
          React.createElement("div", { className: "flex items-start gap-3" }, React.createElement("span", { className: "flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold" }, "1"), React.createElement("p", { className: "text-xs text-slate-600" }, React.createElement("strong", null, "Start Research Mode"), " above to begin tracking sessions automatically.")),
          React.createElement("div", { className: "flex items-start gap-3" }, React.createElement("span", { className: "flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold" }, "2"), React.createElement("p", { className: "text-xs text-slate-600" }, React.createElement("strong", null, "Run probes"), " from the Administer tab to collect baseline data.")),
          React.createElement("div", { className: "flex items-start gap-3" }, React.createElement("span", { className: "flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold" }, "3"), React.createElement("p", { className: "text-xs text-slate-600" }, React.createElement("strong", null, "Import student files"), " from the Student Data tab to unlock growth tracking.")),
          React.createElement("div", { className: "flex items-start gap-3" }, React.createElement("span", { className: "flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold" }, "4"), React.createElement("p", { className: "text-xs text-slate-600" }, React.createElement("strong", null, "Administer surveys"), " at pre/mid/post timepoints to collect stakeholder perspectives."))
        )
      ),
      React.createElement("div", { className: "flex flex-wrap gap-2 justify-center" },
        React.createElement("button", { onClick: function() { if (!(researchMode && researchMode.active)) setShowResearchSetup(true); }, className: "px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg text-sm hover:bg-indigo-700 transition-all" }, researchMode && researchMode.active ? '\u2705 Research Mode Active' : '\uD83D\uDD2C Start Research Mode'),
        React.createElement("button", { onClick: function() { setAssessmentCenterTab('assessments'); }, className: "px-4 py-2 bg-white text-indigo-700 font-bold rounded-lg text-sm border border-indigo-600 hover:bg-indigo-50 transition-all" }, "\uD83C\uDFAF Run Probes"),
        React.createElement("button", { onClick: function() { setAssessmentCenterTab('students'); }, className: "px-4 py-2 bg-white text-indigo-700 font-bold rounded-lg text-sm border border-indigo-600 hover:bg-indigo-50 transition-all" }, "\uD83D\uDCCB Import Student Data")
      )
    ) : /*#__PURE__*/React.createElement("div", {
      className: "space-y-4"
    }, researchStudent ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 mb-4"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setResearchStudent(null),
      className: "text-sm text-indigo-600 hover:text-indigo-800 font-bold"
    }, "\u2190 Back to class"), /*#__PURE__*/React.createElement("span", {
      className: "text-sm text-slate-600"
    }, "|"), /*#__PURE__*/React.createElement("span", {
      className: "text-sm font-bold text-slate-700"
    }, researchStudent),
    React.createElement("button", { onClick: function() { printMeetingSummary(researchStudent); }, className: "ml-auto px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg text-xs font-bold hover:from-indigo-700 hover:to-violet-700 transition-all shadow-sm flex items-center gap-1" }, "\uD83D\uDCCB Meeting Summary")),
    renderInsightsPanel(researchStudent), renderProbeProgressSummary(researchStudent), typeof renderScatterPlot === 'function' && /*#__PURE__*/React.createElement("div", {
      className: "mt-4 bg-white rounded-xl border border-slate-400 p-4"
    }, /*#__PURE__*/React.createElement("h5", {
      className: "text-xs font-bold text-slate-600 uppercase mb-3"
    }, "\uD83D\uDCC8 Practice vs Outcome"), renderScatterPlot())) : /*#__PURE__*/React.createElement("div", null,
    importedStudents.length > 0 && React.createElement("div", { className: "mb-3 flex justify-end" }, React.createElement("button", { onClick: printClassScreeningReport, className: "px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg text-xs font-bold hover:from-indigo-700 hover:to-violet-700 transition-all shadow-sm flex items-center gap-2" }, "\uD83C\uDFEB Print Class Screening Report")),
    typeof renderClassInsights === 'function' && renderClassInsights(), /*#__PURE__*/React.createElement("div", {
      className: "mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
    }, importedStudents.map(s => {
      const name = s.name || s;
      const anomalyFlags = typeof computeAnomalyFlags === 'function' && s.stats ? computeAnomalyFlags(s) : [];
      return /*#__PURE__*/React.createElement("button", {
        key: name,
        onClick: () => setResearchStudent(name),
        className: "p-3 bg-white rounded-xl border border-slate-400 hover:border-indigo-300 hover:shadow-md transition-all text-left group"
      }, /*#__PURE__*/React.createElement("div", {
        className: "font-bold text-sm text-slate-700 group-hover:text-indigo-700"
      }, name), anomalyFlags.length > 0 && /*#__PURE__*/React.createElement("div", {
        className: "flex flex-wrap gap-1 mt-1"
      }, anomalyFlags.map((f, i) => /*#__PURE__*/React.createElement("span", {
        key: i,
        title: f.detail,
        className: `inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-bold ${f.severity === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-600'}`
      }, f.icon, " ", f.label))), /*#__PURE__*/React.createElement("div", {
        className: "text-xs text-slate-600 mt-1"
      }, "View insights \u2192"));
    }))), typeof renderResearchDashboard === 'function' && /*#__PURE__*/React.createElement("div", {
      className: "mt-6 bg-slate-50 rounded-xl p-4 border border-slate-400"
    }, /*#__PURE__*/React.createElement("h4", {
      className: "text-sm font-bold text-slate-600 mb-3"
    }, "\uD83D\uDCC8 Research Dashboard"), renderResearchDashboard()), showCBMImport && typeof renderCBMImportModal === 'function' && renderCBMImportModal(), showSurveyModal && typeof renderSurveyModal === 'function' && renderSurveyModal(), showResearchSetup && typeof renderResearchSetupModal === 'function' && renderResearchSetupModal(),
    // ── Probe Focus Overlays (full-screen with countdown + keyboard shortcuts) ──
    React.createElement(ProbeOverlay, {
      isActive: nwfProbeActive && !nwfProbeResults,
      probeType: '\uD83D\uDD24 NWF Probe',
      timer: nwfProbeTimer,
      timerTotal: 60,
      currentIndex: nwfProbeIndex,
      totalItems: nwfProbeWords.length,
      correctCount: nwfProbeWords.filter(function(w) { return w.scored && w.correct; }).length,
      incorrectCount: nwfProbeWords.filter(function(w) { return w.scored && !w.correct; }).length,
      instruction: 'Say: \u201CLook at this word. Tell me the sounds.\u201D \u2014 Score each sound',
      onCountdownDone: startProbeTimer,
      onCorrect: function() {
        if (nwfProbeIndex >= nwfProbeWords.length) return;
        var updated = nwfProbeWords.slice();
        updated[nwfProbeIndex] = Object.assign({}, updated[nwfProbeIndex], { scored: true, correct: true });
        setNwfProbeWords(updated);
        if (nwfProbeIndex + 1 < nwfProbeWords.length) { setNwfProbeIndex(nwfProbeIndex + 1); }
        else { clearInterval(nwfProbeTimerRef.current); nwfProbeTimerRef.current = null; var sc = updated.filter(function(w){return w.scored;}); var co = sc.filter(function(w){return w.correct;}).length; var cls = sc.reduce(function(s,w){return s+(w.correct?w.word.length:0);},0); setNwfProbeResults({correctWords:co,totalScored:sc.length,cls:cls,totalWords:updated.length,type:'nwf',grade:nwfProbeGrade}); setNwfProbeActive(false); }
      },
      onIncorrect: function() {
        if (nwfProbeIndex >= nwfProbeWords.length) return;
        var updated = nwfProbeWords.slice();
        updated[nwfProbeIndex] = Object.assign({}, updated[nwfProbeIndex], { scored: true, correct: false });
        setNwfProbeWords(updated);
        if (nwfProbeIndex + 1 < nwfProbeWords.length) { setNwfProbeIndex(nwfProbeIndex + 1); }
        else { clearInterval(nwfProbeTimerRef.current); nwfProbeTimerRef.current = null; var sc = updated.filter(function(w){return w.scored;}); var co = sc.filter(function(w){return w.correct;}).length; var cls = sc.reduce(function(s,w){return s+(w.correct?w.word.length:0);},0); setNwfProbeResults({correctWords:co,totalScored:sc.length,cls:cls,totalWords:updated.length,type:'nwf',grade:nwfProbeGrade}); setNwfProbeActive(false); }
      },
      onSkip: function() {
        if (nwfProbeIndex + 1 < nwfProbeWords.length) { setNwfProbeIndex(nwfProbeIndex + 1); }
        else { clearInterval(nwfProbeTimerRef.current); nwfProbeTimerRef.current = null; var sc = nwfProbeWords.filter(function(w){return w.scored;}); var co = sc.filter(function(w){return w.correct;}).length; var cls = sc.reduce(function(s,w){return s+(w.correct?w.word.length:0);},0); setNwfProbeResults({correctWords:co,totalScored:sc.length,cls:cls,totalWords:nwfProbeWords.length,type:'nwf',grade:nwfProbeGrade}); setNwfProbeActive(false); }
      },
      onEndEarly: function() {
        if (window.confirm('End NWF probe early?')) {
          clearInterval(nwfProbeTimerRef.current); nwfProbeTimerRef.current = null;
          var sc = nwfProbeWords.filter(function(w){return w.scored;}); var co = sc.filter(function(w){return w.correct;}).length; var cls = sc.reduce(function(s,w){return s+(w.correct?w.word.length:0);},0);
          setNwfProbeResults({correctWords:co,totalScored:sc.length,cls:cls,totalWords:nwfProbeWords.length,type:'nwf',grade:nwfProbeGrade}); setNwfProbeActive(false);
        }
      }
    },
      // Content: current word displayed large
      nwfProbeIndex < nwfProbeWords.length && React.createElement('div', { className: 'text-center' },
        React.createElement('div', {
          className: 'bg-gradient-to-br from-slate-50 to-emerald-50 rounded-3xl p-12 border border-emerald-100 shadow-inner'
        }, React.createElement('div', {
          className: 'text-8xl font-bold text-slate-800 tracking-[0.2em] font-mono select-none'
        }, nwfProbeWords[nwfProbeIndex].word))
      )
    ),
    React.createElement(ProbeOverlay, {
      isActive: lnfProbeActive && !lnfProbeResults,
      probeType: '\uD83C\uDD70\uFE0F LNF Probe',
      timer: lnfProbeTimer,
      timerTotal: 60,
      currentIndex: lnfProbeIndex,
      totalItems: lnfProbeLetters.length,
      correctCount: lnfProbeLetters.filter(function(l) { return l.scored && l.correct; }).length,
      incorrectCount: lnfProbeLetters.filter(function(l) { return l.scored && !l.correct; }).length,
      instruction: 'Say: \u201CPoint to each letter and tell me its name.\u201D Start timing on first response',
      onCountdownDone: startProbeTimer,
      onCorrect: function() {
        if (lnfProbeIndex >= lnfProbeLetters.length) return;
        var updated = lnfProbeLetters.slice();
        updated[lnfProbeIndex] = Object.assign({}, updated[lnfProbeIndex], { scored: true, correct: true });
        setLnfProbeLetters(updated);
        if (lnfProbeIndex + 1 < lnfProbeLetters.length) { setLnfProbeIndex(lnfProbeIndex + 1); }
        else { clearInterval(lnfProbeTimerRef.current); lnfProbeTimerRef.current = null; var sc = updated.filter(function(l){return l.scored;}); var co = sc.filter(function(l){return l.correct;}).length; setLnfProbeResults({correct:co,totalScored:sc.length,totalLetters:updated.length,lpm:co,type:'lnf'}); setLnfProbeActive(false); }
      },
      onIncorrect: function() {
        if (lnfProbeIndex >= lnfProbeLetters.length) return;
        var updated = lnfProbeLetters.slice();
        updated[lnfProbeIndex] = Object.assign({}, updated[lnfProbeIndex], { scored: true, correct: false });
        setLnfProbeLetters(updated);
        if (lnfProbeIndex + 1 < lnfProbeLetters.length) { setLnfProbeIndex(lnfProbeIndex + 1); }
        else { clearInterval(lnfProbeTimerRef.current); lnfProbeTimerRef.current = null; var sc = updated.filter(function(l){return l.scored;}); var co = sc.filter(function(l){return l.correct;}).length; setLnfProbeResults({correct:co,totalScored:sc.length,totalLetters:updated.length,lpm:co,type:'lnf'}); setLnfProbeActive(false); }
      },
      onSkip: function() {
        if (lnfProbeIndex + 1 < lnfProbeLetters.length) { setLnfProbeIndex(lnfProbeIndex + 1); }
        else { clearInterval(lnfProbeTimerRef.current); lnfProbeTimerRef.current = null; var sc = lnfProbeLetters.filter(function(l){return l.scored;}); var co = sc.filter(function(l){return l.correct;}).length; setLnfProbeResults({correct:co,totalScored:sc.length,totalLetters:lnfProbeLetters.length,lpm:co,type:'lnf'}); setLnfProbeActive(false); }
      },
      onEndEarly: function() {
        if (window.confirm('End LNF probe early?')) {
          clearInterval(lnfProbeTimerRef.current); lnfProbeTimerRef.current = null;
          var sc = lnfProbeLetters.filter(function(l){return l.scored;}); var co = sc.filter(function(l){return l.correct;}).length;
          setLnfProbeResults({correct:co,totalScored:sc.length,totalLetters:lnfProbeLetters.length,lpm:co,type:'lnf'}); setLnfProbeActive(false);
        }
      }
    },
      // Content: current letter displayed large + letter grid
      lnfProbeIndex < lnfProbeLetters.length && React.createElement('div', { className: 'text-center' },
        React.createElement('div', {
          className: 'bg-gradient-to-br from-slate-50 to-blue-50 rounded-3xl p-12 border border-blue-100 shadow-inner mb-6'
        }, React.createElement('div', {
          className: 'text-[10rem] font-bold text-slate-800 font-mono select-none leading-none'
        }, lnfProbeLetters[lnfProbeIndex].letter)),
        React.createElement('div', { className: 'grid grid-cols-13 gap-1 max-w-lg mx-auto' },
          lnfProbeLetters.map(function(item, idx) {
            return React.createElement('div', {
              key: idx,
              className: 'flex items-center justify-center w-8 h-8 rounded text-sm font-bold transition-all ' +
                (idx === lnfProbeIndex ? 'bg-blue-700 text-white ring-2 ring-blue-300 scale-110 shadow-lg' :
                 idx < lnfProbeIndex && item.scored ? (item.correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700 line-through') :
                 idx < lnfProbeIndex ? 'bg-slate-100 text-slate-600' : 'bg-slate-50 text-slate-600')
            }, item.letter);
          })
        )
      )
    ),
    React.createElement(ProbeOverlay, {
      isActive: ranProbeActive && !ranProbeResults,
      probeType: '\u26A1 RAN Probe',
      timer: undefined, // RAN uses a stopwatch, not countdown
      currentIndex: ranProbeIndex,
      totalItems: ranProbeItems.length,
      correctCount: ranProbeItems.filter(function(i) { return i.scored && i.correct; }).length,
      incorrectCount: ranProbeItems.filter(function(i) { return i.scored && !i.correct; }).length,
      instruction: 'Say: \u201CName each one as fast as you can.\u201D \u2014 Stopwatch: ' + ranProbeElapsed + 's',
      onCountdownDone: startProbeTimer,
      onCorrect: function() {
        if (ranProbeIndex >= ranProbeItems.length) return;
        var updated = ranProbeItems.slice();
        updated[ranProbeIndex] = Object.assign({}, updated[ranProbeIndex], { scored: true, correct: true });
        setRanProbeItems(updated);
        if (ranProbeIndex + 1 < ranProbeItems.length) { setRanProbeIndex(ranProbeIndex + 1); }
        else { clearInterval(ranProbeTimerRef.current); ranProbeTimerRef.current = null; var elapsed = Math.round((Date.now()-ranProbeStartRef.current)/1000); var sc = updated.filter(function(i){return i.scored;}); var co = sc.filter(function(i){return i.correct;}).length; setRanProbeResults({correct:co,totalScored:sc.length,totalItems:updated.length,elapsed:elapsed,type:'ran',grade:ranProbeGrade,ranType:ranProbeType}); setRanProbeActive(false); }
      },
      onIncorrect: function() {
        if (ranProbeIndex >= ranProbeItems.length) return;
        var updated = ranProbeItems.slice();
        updated[ranProbeIndex] = Object.assign({}, updated[ranProbeIndex], { scored: true, correct: false });
        setRanProbeItems(updated);
        if (ranProbeIndex + 1 < ranProbeItems.length) { setRanProbeIndex(ranProbeIndex + 1); }
        else { clearInterval(ranProbeTimerRef.current); ranProbeTimerRef.current = null; var elapsed = Math.round((Date.now()-ranProbeStartRef.current)/1000); var sc = updated.filter(function(i){return i.scored;}); var co = sc.filter(function(i){return i.correct;}).length; setRanProbeResults({correct:co,totalScored:sc.length,totalItems:updated.length,elapsed:elapsed,type:'ran',grade:ranProbeGrade,ranType:ranProbeType}); setRanProbeActive(false); }
      },
      onSkip: function() {
        if (ranProbeIndex + 1 < ranProbeItems.length) { setRanProbeIndex(ranProbeIndex + 1); }
        else { clearInterval(ranProbeTimerRef.current); ranProbeTimerRef.current = null; var elapsed = Math.round((Date.now()-ranProbeStartRef.current)/1000); var sc = ranProbeItems.filter(function(i){return i.scored;}); var co = sc.filter(function(i){return i.correct;}).length; setRanProbeResults({correct:co,totalScored:sc.length,totalItems:ranProbeItems.length,elapsed:elapsed,type:'ran',grade:ranProbeGrade,ranType:ranProbeType}); setRanProbeActive(false); }
      },
      onEndEarly: function() {
        if (window.confirm('End RAN probe early?')) {
          clearInterval(ranProbeTimerRef.current); ranProbeTimerRef.current = null;
          var elapsed = Math.round((Date.now()-ranProbeStartRef.current)/1000); var sc = ranProbeItems.filter(function(i){return i.scored;}); var co = sc.filter(function(i){return i.correct;}).length;
          setRanProbeResults({correct:co,totalScored:sc.length,totalItems:ranProbeItems.length,elapsed:elapsed,type:'ran',grade:ranProbeGrade,ranType:ranProbeType}); setRanProbeActive(false);
        }
      }
    },
      // Content: current item displayed large
      ranProbeIndex < ranProbeItems.length && React.createElement('div', { className: 'text-center' },
        React.createElement('div', {
          className: 'bg-gradient-to-br from-slate-50 to-amber-50 rounded-3xl p-12 border border-amber-100 shadow-inner mb-4'
        }, React.createElement('div', {
          className: 'text-8xl font-bold text-slate-800 select-none'
        }, ranProbeItems[ranProbeIndex].item)),
        React.createElement('div', { className: 'text-3xl font-black text-amber-600 tabular-nums' }, '\u23F1 ' + ranProbeElapsed + 's')
      )
    )
    )))))))), document.body);
  });

  // Register module
  window.AlloModules = window.AlloModules || {};
  window.AlloModules.StudentAnalytics = StudentAnalyticsPanel;
  console.log('[CDN] StudentAnalytics module registered');
})();
