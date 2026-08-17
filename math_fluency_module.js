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
      '[data-math-maze-canvas]:focus-visible { outline: 3px solid #a5b4fc !important; outline-offset: -4px !important; }',
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
      '@keyframes alloVolumeRotate { from { transform: rotateX(-22deg) rotateY(-32deg); } to { transform: rotateX(-22deg) rotateY(328deg); } }',
      '.allo-volume-rotate { animation: alloVolumeRotate 12s linear infinite; }',
      '@media (prefers-reduced-motion: reduce) { .allo-volume-rotate { animation: none !important; } }',
      '@media (prefers-reduced-motion: reduce) { .allo-gate-shake, .allo-gate-open { animation: none !important; } [style*="alloStreakPulse"] { animation-duration: 0.01ms !important; } }',
      // Confetti burst on the win screen — pieces fall from above the
      // viewport with random hue/duration/delay. Pointer-events:none so
      // they never block the Play Again button. Hidden under reduced-motion.
      '@keyframes alloConfettiFall { 0% { transform: translateY(-20vh) rotate(0deg); opacity: 0; } 8% { opacity: 1; } 92% { opacity: 0.9; } 100% { transform: translateY(115vh) rotate(720deg); opacity: 0; } }',
      '.allo-confetti-piece { position: absolute; top: 0; border-radius: 2px; animation-name: alloConfettiFall; animation-timing-function: cubic-bezier(.55,.05,.45,.99); animation-fill-mode: forwards; pointer-events: none; }',
      '@media (prefers-reduced-motion: reduce) { .allo-confetti-piece { display: none !important; } }',
      '.mf-maze-action-button { min-height: 32px; }',
      '.mf-fluency-setup select { min-height: 40px; background-color: #fff; transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease; }',
      '.mf-fluency-setup select:hover:not(:disabled) { border-color: #f59e0b !important; }',
      '.mf-fluency-setup select:focus-visible { border-color: #d97706 !important; box-shadow: 0 0 0 3px rgba(245,158,11,0.2); outline: none; }',
      '.mf-fluency-setup details > summary { list-style-position: outside; }',
      '.mf-fluency-setup details > summary::marker { color: #d97706; }',
      '.mf-equation-number { display: inline-block; min-width: 0.7em; }',
      '.mf-equation-operator { display: inline-block; padding: 0 0.12em; }',
      '.mf-problem-card input[type=number]::placeholder { color: #94a3b8; }',
      '.mf-accuracy-ring { position: relative; isolation: isolate; }',
      '.mf-accuracy-ring::after { content: ""; position: absolute; inset: 7px; border-radius: 50%; background: #fff; z-index: -1; }',
      '.mf-metric-card { transition: transform 160ms ease, box-shadow 160ms ease; }',
      '.mf-metric-card:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(15,23,42,0.1) !important; }',
      '.mf-maze-hud-stat { display: inline-flex; align-items: center; gap: 7px; min-width: 70px; padding: 6px 9px; border: 1px solid rgba(255,255,255,0.16); border-radius: 10px; background: rgba(255,255,255,0.08); color: #fff; }',
      '.mf-maze-hud-stat > span:first-child { font-size: 16px; line-height: 1; }',
      '.mf-maze-hud-stat strong { display: block; color: #fff; font-size: 14px; line-height: 1; }',
      '.mf-maze-hud-stat small { display: block; margin-top: 3px; color: #ddd6fe; font-size: 9px; font-weight: 800; letter-spacing: .08em; line-height: 1; text-transform: uppercase; }',
      '.mf-maze-hud-stat[data-tone=success] { border-color: rgba(134,239,172,.38); background: rgba(22,163,74,.18); }',
      '.mf-maze-hud-stat[data-tone=warning] { border-color: rgba(253,186,116,.38); background: rgba(194,65,12,.18); }',
      '.mf-maze-hud-stat[data-tone=score] { border-color: rgba(253,230,138,.42); background: rgba(217,119,6,.16); }',
      '.mf-maze-quest-step { min-height: 48px; padding: 5px 7px; border-radius: 10px; }',
      '.mf-maze-quest-step[aria-current=step] { background: rgba(255,255,255,.72); box-shadow: 0 3px 12px rgba(76,29,149,.1); }',
      '.mf-maze-quest-connector { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,.76); border: 1px solid currentColor; }',
      '.mf-maze-action-button, .mf-maze-move-button, .mf-maze-gate-key { touch-action: manipulation; }',
      '.mf-maze-action-button:hover:not(:disabled), .mf-maze-gate-key:hover:not(:disabled) { filter: brightness(1.14); transform: translateY(-1px); }',
      '.mf-maze-action-button:focus-visible, .mf-maze-move-button:focus-visible, .mf-maze-gate-key:focus-visible { outline: 3px solid #fde68a; outline-offset: 2px; }',
      '.mf-maze-minimap-shell::after { content: ""; position: absolute; inset: 4px; border: 1px solid rgba(255,255,255,.18); border-radius: 9px; pointer-events: none; z-index: 2; }',
      '.mf-maze-gate { scrollbar-width: thin; scrollbar-color: #a78bfa #1e1b4b; }',
      '.mf-maze-gate-key { transition: transform 120ms ease, filter 120ms ease, box-shadow 120ms ease; }',
      '.mf-maze-comfort-toggle { min-height: 46px; padding: 8px 10px; border: 1px solid #e7d7c7; border-radius: 10px; background: rgba(255,255,255,.68); cursor: pointer; }',
      '.mf-maze-comfort-toggle:has(input:checked) { border-color: #d97706; background: #fffbeb; box-shadow: 0 0 0 2px rgba(245,158,11,.12); }',
      '.mf-maze-comfort-toggle input { width: 18px; height: 18px; accent-color: #b45309; flex: 0 0 auto; }',
      '.mf-maze-view-control { min-height: 58px; padding: 9px 10px; border: 1px solid #e7d7c7; border-radius: 10px; background: rgba(255,255,255,.68); }',
      '.mf-maze-chase-radar[data-danger-level=danger], .mf-maze-chase-radar[data-danger-level=caught] { box-shadow: 0 0 0 2px rgba(248,113,113,0.18), 0 0 12px rgba(239,68,68,0.32); }',
      '@media (max-width: 640px) { .mf-maze-hud { grid-template-columns: 1fr !important; } .mf-maze-hud-stats { display: grid !important; grid-template-columns: repeat(2,minmax(0,1fr)); } .mf-maze-hud-stat { min-width: 0; } .mf-maze-hud-actions { display: grid !important; grid-template-columns: repeat(5, minmax(44px, 1fr)); width: 100%; } .mf-maze-action-button { min-width: 44px; min-height: 44px; padding: 6px !important; font-size: 15px !important; } .mf-maze-action-label { display: none; } .mf-maze-quest { grid-template-columns: minmax(0,1fr) auto minmax(0,1fr) !important; } .mf-maze-distance { grid-column: 1 / -1; justify-self: stretch !important; text-align: center; } .mf-maze-move-button { min-width: 52px; min-height: 52px !important; } .mf-maze-chase-radar { width: 100%; justify-content: center; } .mf-maze-legend { justify-content: flex-start !important; overflow-x: auto; flex-wrap: nowrap !important; } .mf-maze-comfort-grid, .mf-maze-view-grid { grid-template-columns: 1fr !important; } .mf-maze-gate { width: min(360px,calc(100vw - 20px)) !important; padding: 16px 14px 14px !important; } }',
      '@media (max-width: 640px), (max-height: 700px) { .mf-active-probe { justify-content: flex-start !important; overflow-y: auto !important; padding: 10px !important; } .mf-probe-progress { margin-bottom: 12px !important; } .mf-problem-card { padding: 20px 14px !important; } .mf-problem-card > div:first-child { margin-bottom: 12px !important; } .mf-results-panel { padding: 14px !important; } .mf-results-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 8px !important; } .mf-config-grid { grid-template-columns: 1fr !important; } .mf-fluency-hero { align-items: flex-start !important; } .mf-fluency-hero-controls { width: 100%; justify-content: flex-end; } .mf-results-summary { align-items: flex-start !important; } .mf-accuracy-ring { width: 70px !important; height: 70px !important; flex-basis: 70px !important; } }',
      '@media (max-width: 360px) { .mf-results-metrics { grid-template-columns: 1fr !important; } .mf-problem-card { padding-left: 10px !important; padding-right: 10px !important; } }',
      '.mf-reduce-motion *, .mf-reduce-motion *::before, .mf-reduce-motion *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; }',
      '.mf-high-contrast { background: #fff !important; color: #000 !important; } .mf-high-contrast .mf-problem-card, .mf-high-contrast button, .mf-high-contrast input { border-color: #000 !important; box-shadow: none !important; } .mf-high-contrast :focus-visible { outline: 4px solid #000 !important; outline-offset: 3px !important; } .mf-high-contrast .mf-maze-hud, .mf-high-contrast .mf-maze-quest, .mf-high-contrast .mf-maze-gate { background: #000 !important; color: #fff !important; border: 3px solid #fff !important; box-shadow: 0 0 0 2px #000 !important; } .mf-high-contrast .mf-maze-hud-stat, .mf-high-contrast .mf-maze-quest-step, .mf-high-contrast .mf-maze-quest-connector { background: #000 !important; border-color: #fff !important; color: #fff !important; } .mf-high-contrast .mf-maze-hud-stat small { color: #fff !important; } .mf-high-contrast .mf-maze-minimap-shell { border-color: #fff !important; box-shadow: 0 0 0 2px #000 !important; }',
      '@supports (height: 100dvh) { .mf-active-probe { min-height: 100dvh; } }',
    ].join('\n');
    document.head.appendChild(mfA11yStyle);
  }

  // -- Instructional DCPM references --
  // These targets are descriptive classroom references, not vendor norms or
  // validated diagnostic cut scores. The UI deliberately calls them
  // "instructional references" so practice is not presented as screening.
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

  function normalizeGrade(grade) {
    var raw = String(grade == null ? '' : grade).trim();
    var lower = raw.toLowerCase();
    if (/^(k|kinder|kindergarten|grade\s*k|k\s*grade|0|0th\s*grade)$/.test(lower)) return 'K';
    var match = lower.match(/(?:^|\D)(\d{1,2})(?:st|nd|rd|th)?(?:\s*grade)?(?:$|\D)/);
    if (!match) return null;
    var n = parseInt(match[1], 10);
    return n >= 1 && n <= 12 ? String(n) : null;
  }

  function getBenchmark(grade, operation) {
    var g = normalizeGrade(grade);
    var gradeData = g ? BENCHMARKS[g] : null;
    var season = getSeason();
    var opData = gradeData && operation !== 'mixed' ? gradeData[operation] : null;
    var target = opData ? opData[season] : null;
    if (!opData || !Number.isFinite(target) || target <= 0) {
      return {
        target: null, season: season, grade: g || String(grade || 'Unknown'),
        frustration: null, strategic: null, available: false,
        referenceOnly: true,
        reason: !g || !gradeData ? 'unsupported-grade' : (!opData ? 'unsupported-operation' : 'no-season-reference')
      };
    }
    return {
      target: target,
      season: season,
      grade: g,
      frustration: Math.round(opData[season] * 0.5),
      strategic: Math.round(opData[season] * 0.75),
      available: true,
      referenceOnly: true
    };
  }

  function getBenchmarkLabel(dcpm, benchmark) {
    if (!benchmark || !benchmark.available || !Number.isFinite(benchmark.target)) {
      return { label: tt('math_fluency.descriptive_score', 'Descriptive score - no validated reference available'), color: '#475569', emoji: '📋', tier: 'descriptive' };
    }
    if (dcpm >= benchmark.target) return { label: tt('math_fluency.meets_instructional_reference', 'Meets Instructional Reference'), color: '#15803d', emoji: '🟢', tier: 'reference-met' };
    if (dcpm >= benchmark.strategic) return { label: tt('math_fluency.approaching_instructional_reference', 'Approaching Instructional Reference'), color: '#b45309', emoji: '🟡', tier: 'reference-approaching' };
    return { label: tt('math_fluency.below_instructional_reference', 'Below Instructional Reference'), color: '#b91c1c', emoji: '🔴', tier: 'reference-below' };
  }

  // -- Error Analysis --
  function analyzeErrors(problems) {
    var errors = problems.filter(function (p) { return p.studentAnswer !== null && p.studentAnswer !== 'SKIP' && !p.correct; });
    var skips = problems.filter(function (p) { return p.studentAnswer === 'SKIP'; });
    var opErrors = {};
    var factErrors = [];

    errors.forEach(function (p) {
      var opName = p.op === 'add' ? tt('math_fluency.addition', 'Addition') : p.op === 'sub' ? tt('math_fluency.subtraction', 'Subtraction') : p.op === 'mul' ? tt('math_fluency.multiplication', 'Multiplication') : tt('math_fluency.division', 'Division');
      if (!opErrors[opName]) opErrors[opName] = 0;
      opErrors[opName]++;
      factErrors.push(p.a + ' ' + p.symbol + ' ' + p.b + ' = ' + p.answer + ' (answered ' + p.studentAnswer + ')');
    });

    var patterns = [];
    // Detect operation weakness
    var sortedOps = Object.entries(opErrors).sort(function (a, b) { return b[1] - a[1]; });
    if (sortedOps.length > 0) {
      patterns.push(tt('math_fluency.most_errors_in', 'Most errors in ') + sortedOps[0][0] + ' (' + sortedOps[0][1] + ' errors)');
    }
    // Detect specific hard facts
    if (factErrors.length > 0 && factErrors.length <= 8) {
      patterns.push(tt('math_fluency.specific_facts_to_practice', 'Specific facts to practice: ') + factErrors.slice(0, 5).join(', '));
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

  // Module-level mute flag. UI toggles set both this in-memory cell
  // and the localStorage record so cross-tab reloads stay consistent.
  var _mfMuted = false;
  try { _mfMuted = localStorage.getItem('fluency_maze_muted') === '1'; } catch (e) {}
  function _mfSetMuted(v) {
    _mfMuted = !!v;
    try { localStorage.setItem('fluency_maze_muted', _mfMuted ? '1' : '0'); } catch (e) {}
  }

  function playTone(freq, duration, type, vol) {
    if (_mfMuted) return;
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
    for (var attempt = 0; attempt < 1200 && problems.length < count; attempt++) {
      var ops = operation === 'mixed' ? ['add', 'sub', 'mul', 'div'] : [operation];
      var op = ops[Math.floor(Math.random() * ops.length)];
      var level = difficulty === 'mixed' ? (Math.random() < 0.5 ? 'single' : 'double') : difficulty;
      var maxOp = level === 'double' ? 99 : 12;
      var minOp = level === 'double' ? 10 : 0;
      var a, b, answer;
      if (op === 'add') {
        a = Math.floor(Math.random() * (maxOp - minOp + 1)) + minOp;
        b = Math.floor(Math.random() * (maxOp - minOp + 1)) + minOp;
        answer = a + b;
      } else if (op === 'sub') {
        a = Math.floor(Math.random() * (maxOp - minOp + 1)) + minOp;
        b = Math.floor(Math.random() * (maxOp - minOp + 1)) + minOp;
        if (b > a) { var swap = a; a = b; b = swap; }
        answer = a - b;
      } else if (op === 'mul') {
        var mulMin = level === 'double' ? 10 : 0;
        var mulMax = level === 'double' ? 20 : 12;
        a = Math.floor(Math.random() * (mulMax - mulMin + 1)) + mulMin;
        b = Math.floor(Math.random() * 13);
        answer = a * b;
      } else {
        var divMax = level === 'double' ? 15 : 12;
        var quotientMax = level === 'double' ? 20 : 12;
        b = Math.floor(Math.random() * divMax) + 1;
        answer = Math.floor(Math.random() * (quotientMax + 1));
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


  var MF_FACT_MASTERY_KEY = 'allo_fluency_fact_mastery_v1';
  var MF_ACCURACY_DRAFT_KEY = 'allo_fluency_accuracy_draft_v1';
  var MF_ACCURACY_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
  var MF_SUPPORT_PREFS_KEY = 'allo_fluency_support_prefs_v1';

  function loadFluencySupportPrefs() {
    var defaults = { reducedMotion: false, highContrast: false, touchKeypad: false, adaptivePractice: true, readAloud: false, calmDisplay: false };
    try {
      if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) defaults.reducedMotion = true;
      var saved = JSON.parse(localStorage.getItem(MF_SUPPORT_PREFS_KEY) || 'null');
      return saved && typeof saved === 'object' && !Array.isArray(saved) ? Object.assign(defaults, saved) : defaults;
    } catch (e) { return defaults; }
  }

  function saveFluencySupportPrefs(value) {
    try { localStorage.setItem(MF_SUPPORT_PREFS_KEY, JSON.stringify(value)); } catch (e) {}
  }

  function formatProblemSpeech(problem) {
    if (!problem || !Number.isFinite(Number(problem.a)) || !Number.isFinite(Number(problem.b))) return '';
    var operationWords = { add: 'plus', sub: 'minus', mul: 'times', div: 'divided by' };
    var operationWord = operationWords[problem.op];
    if (!operationWord) return '';
    return String(problem.a) + ' ' + operationWord + ' ' + String(problem.b) + '. What is the answer?';
  }

  function getAdaptivePracticeLevel(stats) {
    stats = stats || {};
    if ((stats.coachedOrMissed || 0) >= 2) return 'support';
    if ((stats.firstTryStreak || 0) >= 3) return 'stretch';
    return 'steady';
  }

  function buildStudentSessionReview(result) {
    result = result || {};
    var insights = Array.isArray(result.factInsights) ? result.factInsights : [];
    var strengthened = insights.filter(function(item) { return item.attempts > 0 && item.correct === item.attempts; }).slice(0, 5).map(function(item) { return item.problem; });
    var revisit = Array.isArray(result.focusFacts) ? result.focusFacts.slice(0, 5) : [];
    var nextAction = revisit.length ? 'practice-missed' : (result.accuracy >= 90 ? 'smart-review' : 'run-again');
    return {
      strengthened: strengthened, revisit: revisit, nextAction: nextAction,
      nextLabel: nextAction === 'practice-missed' ? 'Practice missed facts' : nextAction === 'smart-review' ? 'Start Smart Review' : 'Run this practice again'
    };
  }

  function sanitizeAccuracyDraft(value, nowValue) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== 1) return null;
    var now = nowValue instanceof Date ? nowValue.getTime() : Number(nowValue);
    if (!Number.isFinite(now)) now = Date.now();
    var savedAt = Number(value.savedAt);
    if (!Number.isFinite(savedAt) || savedAt > now + 5 * 60 * 1000 || now - savedAt > MF_ACCURACY_DRAFT_TTL_MS) return null;
    var config = value.config;
    if (!config || config.mode !== 'practice' || config.untimed !== true || Number(config.timeLimit) !== 0 || config.strategyCoach !== true) return null;
    var allowedOps = { add: true, sub: true, mul: true, div: true };
    if (!allowedOps[config.operation] && config.operation !== 'mixed') return null;
    if (!Array.isArray(value.problems) || value.problems.length < 1 || value.problems.length > 200) return null;
    var cleanProblems = [];
    for (var i = 0; i < value.problems.length; i++) {
      var problem = value.problems[i];
      if (!problem || !allowedOps[problem.op]) return null;
      var a = Number(problem.a), b = Number(problem.b), answer = Number(problem.answer);
      if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b) || !Number.isSafeInteger(answer)) return null;
      var studentAnswer = problem.studentAnswer;
      if (studentAnswer !== null && studentAnswer !== 'SKIP' && !Number.isSafeInteger(Number(studentAnswer))) return null;
      if (studentAnswer !== null && studentAnswer !== 'SKIP') studentAnswer = Number(studentAnswer);
      var attemptLog = [];
      if (Array.isArray(problem.attemptLog)) {
        if (problem.attemptLog.length > 20) return null;
        for (var j = 0; j < problem.attemptLog.length; j++) {
          var attempt = problem.attemptLog[j] || {};
          var attemptAnswer = Number(attempt.studentAnswer), attemptMs = Number(attempt.responseMs);
          if (!Number.isSafeInteger(attemptAnswer) || !Number.isFinite(attemptMs) || attemptMs < 0) return null;
          attemptLog.push({ studentAnswer: attemptAnswer, correct: false, responseMs: Math.round(attemptMs) });
        }
      }
      var responseMs = problem.responseMs == null ? null : Number(problem.responseMs);
      if (responseMs !== null && (!Number.isFinite(responseMs) || responseMs < 0)) return null;
      cleanProblems.push({
        a: a, b: b, op: problem.op, symbol: typeof problem.symbol === 'string' && problem.symbol.length <= 4 ? problem.symbol : _practiceSymbol(problem.op), answer: answer,
        studentAnswer: studentAnswer, correct: studentAnswer === null ? null : problem.correct === true,
        firstTryCorrect: problem.firstTryCorrect === true, responseMs: responseMs === null ? null : Math.round(responseMs), attemptLog: attemptLog
      });
    }
    var currentIndex = Number(value.currentIndex);
    if (!Number.isInteger(currentIndex) || currentIndex < 0 || currentIndex >= cleanProblems.length) return null;
    for (var completedIndex = 0; completedIndex < currentIndex; completedIndex++) {
      if (cleanProblems[completedIndex].studentAnswer === null) return null;
    }
    if (cleanProblems[currentIndex].studentAnswer !== null) return null;
    var elapsedMs = Number(value.elapsedMs);
    if (!Number.isFinite(elapsedMs) || elapsedMs < 0 || elapsedMs > MF_ACCURACY_DRAFT_TTL_MS) return null;
    var pauseStats = value.pauseStats || {};
    var pauseCount = Math.max(0, Math.min(1000, Math.floor(Number(pauseStats.count) || 0)));
    var pauseSeconds = Math.max(0, Math.min(MF_ACCURACY_DRAFT_TTL_MS / 1000, Number(pauseStats.seconds) || 0));
    var rawGoal = config.goal;
    var goalTarget = rawGoal ? Number(rawGoal.target) : NaN;
    var goal = rawGoal && rawGoal.metric === 'accuracy' && Number.isFinite(goalTarget) && goalTarget > 0 && goalTarget <= 100
      ? { id: String(rawGoal.id || 'accuracy-90').slice(0, 32), metric: 'accuracy', target: goalTarget, available: true, label: String(rawGoal.label || (goalTarget + '% accuracy')).slice(0, 64) }
      : null;
    return {
      version: 1, savedAt: savedAt, currentIndex: currentIndex, elapsedMs: elapsedMs,
      pauseStats: { count: pauseCount, seconds: pauseSeconds }, problems: cleanProblems,
      config: {
        mode: 'practice', form: null, grade: String(config.grade || 'Unknown').slice(0, 32),
        operation: config.operation, difficulty: String(config.difficulty || 'focus').slice(0, 48), practiceSet: String(config.practiceSet || config.difficulty || 'focus').slice(0, 48),
        timeLimit: 0, untimed: true, strategyCoach: true, problemCount: cleanProblems.length,
        focusedPractice: config.focusedPractice === true, smartReview: config.smartReview === true,
        adaptivePractice: config.adaptivePractice === true, touchKeypad: config.touchKeypad === true,
        reducedMotion: config.reducedMotion === true, highContrast: config.highContrast === true,
        readAloud: config.readAloud === true, calmDisplay: config.calmDisplay === true, goal: goal
      }
    };
  }

  function loadAccuracyDraft() {
    try {
      if (typeof localStorage === 'undefined') return null;
      return sanitizeAccuracyDraft(JSON.parse(localStorage.getItem(MF_ACCURACY_DRAFT_KEY) || 'null'), new Date());
    } catch (e) { return null; }
  }

  function saveAccuracyDraft(value) {
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(MF_ACCURACY_DRAFT_KEY, JSON.stringify(value)); } catch (e) {}
  }

  function clearAccuracyDraft() {
    try { if (typeof localStorage !== 'undefined') localStorage.removeItem(MF_ACCURACY_DRAFT_KEY); } catch (e) {}
  }

  function _practiceSymbol(op) {
    return op === 'add' ? '+' : op === 'sub' ? '\u2212' : op === 'mul' ? '\u00d7' : '\u00f7';
  }

  function getRecommendedPracticeSet(grade, operation) {
    var normalized = normalizeGrade(grade);
    var gradeNumber = normalized === 'K' ? 0 : parseInt(normalized || '3', 10);
    if (operation === 'add' || operation === 'sub') {
      if (gradeNumber <= 1) return 'within10';
      if (gradeNumber === 2) return 'within20';
      return 'within100';
    }
    if (operation === 'mul' || operation === 'div') {
      if (gradeNumber <= 2) return 'facts5';
      if (gradeNumber === 3) return 'facts10';
      return 'facts12';
    }
    return 'recommended';
  }

  function getPracticeSetOptions(operation, grade) {
    var normalized = normalizeGrade(grade) || String(grade || '3');
    var gradeLabel = normalized === 'K' ? 'Kindergarten' : 'Grade ' + normalized;
    var options = [{ value: 'recommended', label: gradeLabel + ' Recommended' }];
    if (operation === 'add' || operation === 'sub') {
      options.push(
        { value: 'within10', label: 'Within 10' },
        { value: 'within20', label: 'Within 20' },
        { value: 'within100', label: 'Within 100' },
        { value: 'extended', label: 'Extended Facts' },
        { value: 'mixed', label: 'Mixed Levels' }
      );
    } else if (operation === 'mul' || operation === 'div') {
      options.push(
        { value: 'facts5', label: 'Facts through 5' },
        { value: 'facts10', label: 'Facts through 10' },
        { value: 'facts12', label: 'Facts through 12' },
        { value: 'extended', label: 'Extended Facts' },
        { value: 'mixed', label: 'Mixed Levels' }
      );
    } else {
      options.push(
        { value: 'basic', label: 'Basic Facts' },
        { value: 'extended', label: 'Extended Facts' },
        { value: 'mixed', label: 'Mixed Levels' }
      );
    }
    return options;
  }

  function describePracticeSet(grade, operation, practiceSet) {
    var normalized = normalizeGrade(grade) || String(grade || '3');
    if (practiceSet === 'recommended') {
      if (operation === 'mixed') {
        var gradeNumber = normalized === 'K' ? 0 : parseInt(normalized, 10);
        var opText = gradeNumber <= 2 ? 'addition and subtraction' : 'all four operations';
        var addSet = getRecommendedPracticeSet(normalized, 'add');
        var factSet = getRecommendedPracticeSet(normalized, 'mul');
        var addLabel = { within10: 'within 10', within20: 'within 20', within100: 'within 100' }[addSet] || addSet;
        var factLabel = { facts5: 'facts through 5', facts10: 'facts through 10', facts12: 'facts through 12' }[factSet] || factSet;
        return 'Grade ' + normalized + ' recommended practice: ' + opText + ', ' + addLabel + (gradeNumber <= 2 ? '.' : ' and ' + factLabel + '.');
      }
      return 'Grade ' + normalized + ' recommended practice: ' + ({
        within10: 'facts within 10', within20: 'facts within 20', within100: 'facts within 100',
        facts5: 'facts through 5', facts10: 'facts through 10', facts12: 'facts through 12'
      }[getRecommendedPracticeSet(normalized, operation)] || 'grade-aligned facts') + '.';
    }
    return ({
      within10: 'Practice facts with answers within 10.',
      within20: 'Practice facts with answers within 20.',
      within100: 'Practice facts with answers within 100.',
      facts5: 'Practice multiplication or division facts through 5.',
      facts10: 'Practice multiplication or division facts through 10.',
      facts12: 'Practice multiplication or division facts through 12.',
      basic: 'Practice basic facts.', extended: 'Practice extended facts.', mixed: 'Practice a mix of basic and extended facts.'
    })[practiceSet] || 'Custom math-fact practice.';
  }

  function generatePracticeProblems(operation, practiceSet, grade, count) {
    var requested = Math.max(1, Number(count) || 20);
    if (practiceSet === 'basic') return generateProblems(operation, 'single', requested);
    if (practiceSet === 'extended') return generateProblems(operation, 'double', requested);
    if (practiceSet === 'mixed') return generateProblems(operation, 'mixed', requested);
    var normalized = normalizeGrade(grade);
    var gradeNumber = normalized === 'K' ? 0 : parseInt(normalized || '3', 10);
    var allowedOps = operation === 'mixed'
      ? (practiceSet === 'recommended' && gradeNumber <= 2 ? ['add', 'sub'] : ['add', 'sub', 'mul', 'div'])
      : [operation];
    var problems = [], used = {};
    function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
    for (var attempt = 0; attempt < 5000 && problems.length < requested; attempt++) {
      var op = allowedOps[Math.floor(Math.random() * allowedOps.length)];
      var resolved = practiceSet === 'recommended' ? getRecommendedPracticeSet(normalized, op) : practiceSet;
      var a, b, answer;
      if (op === 'add' || op === 'sub') {
        var limit = resolved === 'within10' ? 10 : resolved === 'within20' ? 20 : resolved === 'within100' ? 100 : 12;
        if (op === 'add') { a = rand(0, limit); b = rand(0, limit - a); answer = a + b; }
        else { a = rand(0, limit); b = rand(0, a); answer = a - b; }
      } else if (op === 'mul' || op === 'div') {
        var factMax = resolved === 'facts5' ? 5 : resolved === 'facts10' ? 10 : 12;
        if (op === 'mul') { a = rand(0, factMax); b = rand(0, factMax); answer = a * b; }
        else { b = rand(1, Math.max(1, factMax)); answer = rand(0, factMax); a = b * answer; }
      } else {
        continue;
      }
      var key = a + '_' + op + '_' + b;
      var allowRepeat = attempt > Math.max(300, requested * 12);
      if (!used[key] || allowRepeat) {
        used[key] = true;
        problems.push({ a: a, b: b, op: op, symbol: _practiceSymbol(op), answer: answer, studentAnswer: null, correct: null, responseMs: null });
      }
    }
    return problems;
  }

  function getFactKey(problem) {
    if (!problem) return '';
    var a = Number(problem.a), b = Number(problem.b), op = problem.op;
    if ((op === 'add' || op === 'mul') && b < a) { var swap = a; a = b; b = swap; }
    return op + '|' + a + '|' + b;
  }

  function summarizeFactResults(problems) {
    var grouped = {};
    function registerAttempt(problem, attempt) {
      var key = getFactKey(problem);
      if (!key) return;
      if (!grouped[key]) grouped[key] = {
        key: key, attempts: 0, correct: 0, responseMsTotal: 0, timedAttempts: 0,
        problem: { a: problem.a, b: problem.b, op: problem.op, symbol: problem.symbol || _practiceSymbol(problem.op), answer: problem.answer }
      };
      var item = grouped[key];
      item.attempts += 1;
      if (attempt.correct) item.correct += 1;
      if (Number.isFinite(attempt.responseMs)) { item.responseMsTotal += attempt.responseMs; item.timedAttempts += 1; }
    }
    (problems || []).forEach(function (problem) {
      if (!problem) return;
      (problem.attemptLog || []).forEach(function (attempt) { registerAttempt(problem, attempt); });
      if (problem.studentAnswer !== null) registerAttempt(problem, problem);
    });
    return Object.keys(grouped).map(function (key) {
      var item = grouped[key];
      item.accuracy = Math.round((item.correct / Math.max(1, item.attempts)) * 100);
      item.avgResponseMs = item.timedAttempts ? Math.round(item.responseMsTotal / item.timedAttempts) : null;
      return item;
    }).sort(function (a, b) {
      var aMiss = a.attempts - a.correct, bMiss = b.attempts - b.correct;
      if (bMiss !== aMiss) return bMiss - aMiss;
      return (b.avgResponseMs || 0) - (a.avgResponseMs || 0);
    });
  }

  function updateFactMastery(current, problems, timestamp) {
    var next = Object.assign({}, current || {});
    var when = timestamp || new Date().toISOString();
    summarizeFactResults(problems).forEach(function (summary) {
      var previous = next[summary.key] || {};
      next[summary.key] = {
        key: summary.key,
        a: summary.problem.a, b: summary.problem.b, op: summary.problem.op,
        symbol: summary.problem.symbol, answer: summary.problem.answer,
        attempts: (previous.attempts || 0) + summary.attempts,
        correct: (previous.correct || 0) + summary.correct,
        responseMsTotal: (previous.responseMsTotal || 0) + summary.responseMsTotal,
        timedAttempts: (previous.timedAttempts || 0) + summary.timedAttempts,
        lastSeen: when
      };
    });
    var keys = Object.keys(next).sort(function (a, b) {
      return String(next[b].lastSeen || '').localeCompare(String(next[a].lastSeen || ''));
    });
    if (keys.length > 300) keys.slice(300).forEach(function (key) { delete next[key]; });
    return next;
  }

  function getMasteryFocusFacts(mastery, limit) {
    return Object.keys(mastery || {}).map(function (key) {
      var item = mastery[key];
      var attempts = Math.max(1, item.attempts || 0);
      var accuracy = (item.correct || 0) / attempts;
      var avgMs = item.timedAttempts ? (item.responseMsTotal || 0) / item.timedAttempts : 0;
      return { item: item, priority: (1 - accuracy) * 100 + Math.min(20, avgMs / 500), accuracy: accuracy, avgMs: avgMs };
    }).filter(function (row) {
      return row.accuracy < 0.85 || (row.item.timedAttempts || 0) >= 2 && row.avgMs > 6000;
    }).sort(function (a, b) { return b.priority - a.priority; }).slice(0, limit || 12).map(function (row) {
      return { a: row.item.a, b: row.item.b, op: row.item.op, symbol: row.item.symbol || _practiceSymbol(row.item.op), answer: row.item.answer };
    });
  }

  function getStrategyHint(problem, attemptNumber) {
    if (!problem) return null;
    var a = Number(problem.a), b = Number(problem.b), op = problem.op;
    var attempt = Math.max(1, Number(attemptNumber) || 1);
    if (attempt >= 3) {
      return {
        stage: 'reveal', title: 'Check and try it',
        message: 'The answer is ' + problem.answer + '. Type it once to complete the fact.',
        reveal: true, model: { type: 'equation', left: a + ' ' + (problem.symbol || _practiceSymbol(op)) + ' ' + b, right: problem.answer }
      };
    }
    if (op === 'add') {
      var larger = Math.max(a, b), smaller = Math.min(a, b), difference = larger - smaller;
      if (attempt === 1 && difference <= 2) return {
        stage: 'strategy', title: 'Use a nearby double',
        message: 'Start with ' + smaller + ' + ' + smaller + ', then adjust by ' + difference + '.',
        model: { type: 'number-line', start: smaller, change: smaller, direction: 'right' }
      };
      var nextTen = Math.ceil(larger / 10) * 10;
      if (nextTen === larger) nextTen += 10;
      var move = nextTen - larger;
      if (attempt === 1 && move > 0 && smaller > move) return {
        stage: 'strategy', title: 'Make the next ten',
        message: 'Move ' + move + ' from ' + smaller + ' to ' + larger + '. Think ' + nextTen + ' plus what remains.',
        model: { type: 'number-line', start: larger, change: move, direction: 'right' }
      };
      return {
        stage: 'model', title: 'Build the addition',
        message: 'Start with ' + larger + ' and count on ' + smaller + ' more.',
        model: { type: 'number-line', start: larger, change: smaller, direction: 'right' }
      };
    }
    if (op === 'sub') {
      if (attempt === 1) return {
        stage: 'strategy', title: 'Use the related addition fact',
        message: 'Think: ' + b + ' plus what number equals ' + a + '?',
        model: { type: 'number-line', start: b, change: a - b, direction: 'right' }
      };
      var toTen = a % 10;
      return {
        stage: 'model', title: 'Break apart the subtraction',
        message: toTen > 0 && b > toTen
          ? 'Subtract ' + toTen + ' to reach ' + (a - toTen) + ', then subtract the remaining ' + (b - toTen) + '.'
          : 'Count back ' + b + ' steps from ' + a + '.',
        model: { type: 'number-line', start: a, change: b, direction: 'left' }
      };
    }
    if (op === 'mul') {
      var split = b > 5 ? 5 : Math.max(1, Math.floor(b / 2));
      return attempt === 1 ? {
        stage: 'strategy', title: 'Break one factor apart',
        message: 'Think ' + a + ' \u00d7 ' + split + ' plus ' + a + ' \u00d7 ' + (b - split) + '.',
        model: { type: 'groups', groups: Math.min(a, 8), perGroup: Math.min(b, 12) }
      } : {
        stage: 'model', title: 'Build equal groups',
        message: 'Picture ' + a + ' equal groups with ' + b + ' in each group.',
        model: { type: 'groups', groups: Math.min(a, 8), perGroup: Math.min(b, 12) }
      };
    }
    if (op === 'div') {
      return attempt === 1 ? {
        stage: 'strategy', title: 'Use the related multiplication fact',
        message: 'Think: ' + b + ' \u00d7 what number equals ' + a + '?',
        model: { type: 'groups', groups: Math.min(b, 8), total: a }
      } : {
        stage: 'model', title: 'Share into equal groups',
        message: 'Share ' + a + ' into ' + b + ' equal groups, then count one group.',
        model: { type: 'groups', groups: Math.min(b, 8), total: a }
      };
    }
    return { stage: 'strategy', title: 'Try a smaller step', message: 'Use a related fact you already know.', model: { type: 'equation', left: a + ' ? ' + b, right: '?' } };
  }

  function buildFactMasteryDashboard(mastery) {
    var categoryOrder = ['secure', 'developing', 'slow', 'focus'];
    var categories = {
      secure: { id: 'secure', label: 'Secure', facts: [] },
      developing: { id: 'developing', label: 'Developing', facts: [] },
      slow: { id: 'slow', label: 'Accurate but Slow', facts: [] },
      focus: { id: 'focus', label: 'Needs Focus', facts: [] }
    };
    var operations = { add: { total: 0, secure: 0 }, sub: { total: 0, secure: 0 }, mul: { total: 0, secure: 0 }, div: { total: 0, secure: 0 } };
    var totalAttempts = 0, totalCorrect = 0;
    Object.keys(mastery || {}).forEach(function (key) {
      var item = mastery[key];
      if (!item || !operations[item.op]) return;
      var attempts = Math.max(1, item.attempts || 0);
      var accuracy = (item.correct || 0) / attempts;
      var avgMs = item.timedAttempts ? (item.responseMsTotal || 0) / item.timedAttempts : null;
      var status = accuracy < 0.7 ? 'focus'
        : attempts < 3 || accuracy < 0.9 ? 'developing'
        : avgMs != null && avgMs > 6000 ? 'slow'
        : 'secure';
      var fact = {
        key: key, a: item.a, b: item.b, op: item.op, symbol: item.symbol || _practiceSymbol(item.op), answer: item.answer,
        attempts: attempts, correct: item.correct || 0, accuracy: Math.round(accuracy * 100), avgResponseMs: avgMs == null ? null : Math.round(avgMs), status: status
      };
      categories[status].facts.push(fact);
      operations[item.op].total += 1;
      if (status === 'secure') operations[item.op].secure += 1;
      totalAttempts += attempts;
      totalCorrect += item.correct || 0;
    });
    categoryOrder.forEach(function (id) {
      categories[id].facts.sort(function (a, b) {
        if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
        return (b.avgResponseMs || 0) - (a.avgResponseMs || 0);
      });
      categories[id].count = categories[id].facts.length;
    });
    return {
      totalFacts: categoryOrder.reduce(function (sum, id) { return sum + categories[id].count; }, 0),
      overallAccuracy: totalAttempts ? Math.round((totalCorrect / totalAttempts) * 100) : 0,
      categories: categories, categoryOrder: categoryOrder, operations: operations
    };
  }

  function buildReviewSchedule(mastery, nowValue) {
    var dashboard = buildFactMasteryDashboard(mastery);
    var now = nowValue instanceof Date ? nowValue : new Date(nowValue || Date.now());
    if (!Number.isFinite(now.getTime())) now = new Date();
    var dayMs = 24 * 60 * 60 * 1000;
    var intervals = { focus: 0, developing: 1, slow: 2, secure: 7 };
    var rank = { focus: 0, developing: 1, slow: 2, secure: 3 };
    var dueFacts = [], byStatus = { focus: 0, developing: 0, slow: 0, secure: 0 };
    var nextDueDays = null;
    dashboard.categoryOrder.forEach(function (status) {
      dashboard.categories[status].facts.forEach(function (fact) {
        var stored = mastery && mastery[fact.key] || {};
        var seen = new Date(stored.lastSeen || '');
        var validSeen = Number.isFinite(seen.getTime());
        var ageDays = validSeen ? Math.max(0, (now.getTime() - seen.getTime()) / dayMs) : Infinity;
        var interval = intervals[status];
        var due = !validSeen || ageDays >= interval;
        if (due) {
          byStatus[status] += 1;
          dueFacts.push(Object.assign({}, fact, {
            reviewStatus: status,
            lastSeen: validSeen ? seen.toISOString() : null,
            daysSince: validSeen ? Math.floor(ageDays) : null,
            overdueDays: validSeen ? Math.max(0, Math.floor(ageDays - interval)) : null
          }));
        } else {
          var remaining = Math.max(1, Math.ceil(interval - ageDays));
          nextDueDays = nextDueDays == null ? remaining : Math.min(nextDueDays, remaining);
        }
      });
    });
    dueFacts.sort(function (a, b) {
      if (rank[a.reviewStatus] !== rank[b.reviewStatus]) return rank[a.reviewStatus] - rank[b.reviewStatus];
      if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
      return (b.overdueDays || 0) - (a.overdueDays || 0);
    });
    return { dueFacts: dueFacts, dueCount: dueFacts.length, nextDueDays: nextDueDays, byStatus: byStatus, intervals: intervals };
  }

  function buildSmartReviewProblems(mastery, count, nowValue) {
    var dashboard = buildFactMasteryDashboard(mastery);
    if (!dashboard.totalFacts) return [];
    var schedule = buildReviewSchedule(mastery, nowValue);
    var dueSecure = schedule.dueFacts.filter(function (fact) { return fact.reviewStatus === 'secure'; });
    var pools = {
      needs: dashboard.categories.focus.facts.slice(),
      developing: dashboard.categories.developing.facts.concat(dashboard.categories.slow.facts),
      review: dueSecure.length ? dueSecure : dashboard.categories.secure.facts.slice()
    };
    var requested = Math.max(1, Number(count) || 20);
    var targets = { needs: Math.floor(requested * 0.6), developing: Math.floor(requested * 0.25) };
    targets.review = requested - targets.needs - targets.developing;
    var allFacts = pools.needs.concat(pools.developing, pools.review);
    var plan = [];
    ['needs', 'developing', 'review'].forEach(function (band) {
      var pool = pools[band];
      if (!pool.length) return;
      for (var i = 0; i < targets[band]; i++) plan.push({ fact: pool[i % pool.length], reviewBand: band });
    });
    var fallbackBands = ['needs', 'developing', 'review'].filter(function (band) { return pools[band].length; });
    var fillIndex = 0;
    while (plan.length < requested && fallbackBands.length) {
      var fillBand = fallbackBands[fillIndex % fallbackBands.length];
      var fillPool = pools[fillBand];
      plan.push({ fact: fillPool[Math.floor(fillIndex / fallbackBands.length) % fillPool.length], reviewBand: fillBand });
      fillIndex += 1;
    }
    for (var p = 1; p < plan.length; p++) {
      if (plan[p].fact.key !== plan[p - 1].fact.key) continue;
      for (var swap = p + 1; swap < plan.length; swap++) {
        if (plan[swap].fact.key !== plan[p - 1].fact.key) {
          var temp = plan[p]; plan[p] = plan[swap]; plan[swap] = temp;
          break;
        }
      }
    }
    return plan.map(function (row) {
      return {
        a: Number(row.fact.a), b: Number(row.fact.b), op: row.fact.op,
        symbol: row.fact.symbol || _practiceSymbol(row.fact.op), answer: Number(row.fact.answer),
        studentAnswer: null, correct: null, responseMs: null, reviewBand: row.reviewBand
      };
    });
  }

  function buildTeacherReport(history, mastery, filters, grade, mazeLifetime, nowValue) {
    var options = filters || {};
    var now = nowValue instanceof Date ? nowValue : new Date(nowValue || Date.now());
    if (!Number.isFinite(now.getTime())) now = new Date();
    var days = options.days === 'all' ? 'all' : Math.max(1, Number(options.days) || 30);
    var cutoff = days === 'all' ? null : now.getTime() - days * 24 * 60 * 60 * 1000;
    function sessionMode(item) {
      if (item.mode === 'benchmark') return 'benchmark';
      return item.untimed ? 'accuracy-focus' : 'timed-practice';
    }
    var sessions = (Array.isArray(history) ? history : []).filter(function (item) {
      if (!item) return false;
      var when = new Date(item.date || 0).getTime();
      if (cutoff != null && (!Number.isFinite(when) || when < cutoff)) return false;
      if (options.mode && options.mode !== 'all' && sessionMode(item) !== options.mode) return false;
      if (options.operation && options.operation !== 'all' && item.operation !== options.operation) return false;
      return true;
    }).slice().sort(function (a, b) { return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime(); });
    var attempted = sessions.reduce(function (sum, item) { return sum + (Number(item.totalAttempted) || 0); }, 0);
    var correct = sessions.reduce(function (sum, item) { return sum + (Number(item.totalCorrect) || 0); }, 0);
    var accuracyItems = sessions.filter(function (item) { return item.accuracy != null && Number.isFinite(Number(item.accuracy)); });
    var avgAccuracy = accuracyItems.length ? Math.round(accuracyItems.reduce(function (sum, item) { return sum + Number(item.accuracy); }, 0) / accuracyItems.length) : null;
    var comparable = sessions.filter(function (item) { return item.validForComparison && item.dcpm != null && Number.isFinite(Number(item.dcpm)); });
    var goalSessions = sessions.filter(function (item) { return item.goalResult && (item.goalResult.status === 'met' || item.goalResult.status === 'building'); });
    var goalsMet = goalSessions.filter(function (item) { return item.goalResult.met; }).length;
    var dashboard = buildFactMasteryDashboard(mastery);
    var schedule = buildReviewSchedule(mastery, now);
    var suggestedTargets = dashboard.categories.focus.facts.concat(dashboard.categories.slow.facts, dashboard.categories.developing.facts)
      .filter(function (fact, index, list) { return list.findIndex(function (candidate) { return candidate.key === fact.key; }) === index; }).slice(0, 8);
    return {
      generatedAt: now.toISOString(), grade: grade || 'Unknown', filters: { days: days, mode: options.mode || 'all', operation: options.operation || 'all' },
      sessions: sessions, sessionCount: sessions.length, avgAccuracy: avgAccuracy,
      latestDcpm: comparable.length ? Number(comparable[0].dcpm) : null,
      totalCorrect: correct, totalAttempted: attempted, goalsMet: goalsMet, goalSessions: goalSessions.length,
      goalRate: goalSessions.length ? Math.round((goalsMet / goalSessions.length) * 100) : null,
      dashboard: dashboard, reviewSchedule: schedule, suggestedTargets: suggestedTargets,
      operationGrowth: buildOperationGrowth(sessions, mastery, now),
      mazeLifetime: mazeLifetime && typeof mazeLifetime === 'object' ? mazeLifetime : {}
    };
  }

  function buildOperationGrowth(history, mastery, nowValue) {
    var dashboard = buildFactMasteryDashboard(mastery);
    var schedule = buildReviewSchedule(mastery, nowValue);
    var now = nowValue instanceof Date ? nowValue : new Date(nowValue || Date.now());
    if (!Number.isFinite(now.getTime())) now = new Date();
    var cutoff = now.getTime() - 30 * 24 * 60 * 60 * 1000;
    var labels = { add: 'Addition', sub: 'Subtraction', mul: 'Multiplication', div: 'Division' };
    var statuses = ['secure', 'developing', 'slow', 'focus'];
    return ['add', 'sub', 'mul', 'div'].map(function (op) {
      var facts = [];
      var counts = { secure: 0, developing: 0, slow: 0, focus: 0 };
      statuses.forEach(function (status) {
        dashboard.categories[status].facts.forEach(function (fact) {
          if (fact.op !== op) return;
          facts.push(fact);
          counts[status] += 1;
        });
      });
      var dueFacts = schedule.dueFacts.filter(function (fact) { return fact.op === op; });
      var sessions = (Array.isArray(history) ? history : []).filter(function (item) {
        if (!item || item.operation !== op) return false;
        var when = new Date(item.date || 0).getTime();
        var complete = item.completionStatus == null || item.completionStatus === 'complete';
        return complete && Number.isFinite(when) && when >= cutoff;
      }).slice().sort(function (a, b) { return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime(); });
      var accuracySessions = sessions.filter(function (item) { return item.accuracy != null && Number.isFinite(Number(item.accuracy)); });
      var recentAccuracy = accuracySessions.length
        ? Math.round(accuracySessions.reduce(function (sum, item) { return sum + Number(item.accuracy); }, 0) / accuracySessions.length)
        : null;
      var comparable = sessions.filter(function (item) { return item.validForComparison && item.dcpm != null && Number.isFinite(Number(item.dcpm)); });
      var latestDcpm = comparable.length ? Number(comparable[0].dcpm) : null;
      var trendDelta = null;
      if (comparable.length >= 2) {
        var latestKey = comparable[0].comparisonKey;
        var sameSeries = latestKey ? comparable.filter(function (item) { return item.comparisonKey === latestKey; }) : comparable;
        if (sameSeries.length >= 2) trendDelta = Number(sameSeries[0].dcpm) - Number(sameSeries[1].dcpm);
      }
      var recommendation = counts.focus ? 'Build accuracy'
        : counts.slow ? 'Build efficient recall'
        : counts.developing ? 'Strengthen developing facts'
        : dueFacts.length ? 'Complete retrieval review'
        : facts.length ? 'Maintain mastery'
        : 'Gather a baseline';
      var targetFacts = dashboard.categories.focus.facts.concat(dashboard.categories.slow.facts, dashboard.categories.developing.facts)
        .filter(function (fact) { return fact.op === op; });
      var priority = counts.focus * 5 + counts.slow * 3 + counts.developing * 2 + dueFacts.length;
      if (!facts.length) priority = -1;
      return {
        op: op, label: labels[op], totalFacts: facts.length, secureFacts: counts.secure,
        developingFacts: counts.developing, slowFacts: counts.slow, focusFacts: counts.focus,
        dueFacts: dueFacts.length, recentSessions: sessions.length, recentAccuracy: recentAccuracy,
        latestDcpm: latestDcpm, trendDelta: trendDelta, recommendation: recommendation,
        priority: priority, targetFacts: targetFacts.slice(0, 12), allFacts: facts.slice(0, 12)
      };
    });
  }

  function buildNextPracticeRecommendation(mastery, history, nowValue) {
    var rows = buildOperationGrowth(history, mastery, nowValue).filter(function (row) { return row.totalFacts > 0; });
    if (!rows.length) return null;
    rows.sort(function (a, b) {
      if (b.priority !== a.priority) return b.priority - a.priority;
      if (b.dueFacts !== a.dueFacts) return b.dueFacts - a.dueFacts;
      return (a.recentAccuracy == null ? 101 : a.recentAccuracy) - (b.recentAccuracy == null ? 101 : b.recentAccuracy);
    });
    var row = rows[0];
    var rationale = row.focusFacts ? row.focusFacts + ' facts need accuracy support.'
      : row.slowFacts ? row.slowFacts + ' accurate facts need more efficient recall.'
      : row.developingFacts ? row.developingFacts + ' facts are still developing.'
      : row.dueFacts ? row.dueFacts + ' facts are due for retrieval review.'
      : row.secureFacts + ' of ' + row.totalFacts + ' tracked facts are secure; brief retrieval keeps them strong.';
    return {
      op: row.op, label: row.label, title: row.label + ': ' + row.recommendation,
      rationale: rationale, action: row.targetFacts.length ? 'focus' : (row.dueFacts ? 'smart-review' : 'maintain'),
      facts: row.targetFacts.length ? row.targetFacts : row.allFacts.slice(0, 8), row: row
    };
  }

  function buildSessionGoal(selection, history, config) {
    var id = selection || 'accuracy-90';
    if (id === 'none') return null;
    var accuracyMatch = /^accuracy-(80|90|100)$/.exec(id);
    if (accuracyMatch) {
      var accuracyTarget = Number(accuracyMatch[1]);
      return { id: id, metric: 'accuracy', target: accuracyTarget, available: true, label: accuracyTarget + '% accuracy' };
    }
    if (id === 'personal-best') {
      var comparable = (Array.isArray(history) ? history : []).filter(function (item) {
        return item && item.comparisonKey === config.comparisonKey && item.validForComparison
          && item.dcpm != null && Number.isFinite(Number(item.dcpm));
      });
      if (!comparable.length) return { id: id, metric: 'dcpm', target: null, available: false, label: 'Set a comparable DCPM baseline' };
      var best = Math.max.apply(null, comparable.map(function (item) { return Number(item.dcpm); }));
      return { id: id, metric: 'dcpm', target: best + 1, previousBest: best, available: !config.untimed, label: 'Beat personal best (' + best + ' DCPM)' };
    }
    if (id === 'instructional-reference') {
      var reference = getBenchmark(config.grade, config.operation);
      return reference.available
        ? { id: id, metric: 'dcpm', target: reference.target, available: !config.untimed, label: 'Reach instructional reference (' + reference.target + ' DCPM)', reference: reference }
        : { id: id, metric: 'dcpm', target: null, available: false, label: 'Instructional reference unavailable', reference: reference };
    }
    return null;
  }

  function evaluateSessionGoal(goal, result) {
    if (!goal) return null;
    var value = goal.metric === 'accuracy' ? Number(result.accuracy) : (result.dcpm == null ? null : Number(result.dcpm));
    if (result.completionStatus !== 'complete') {
      return { goal: goal, met: false, status: 'incomplete', value: value, progress: 0, message: 'Complete the session to evaluate this goal.' };
    }
    if (goal.metric === 'dcpm' && !result.validForComparison) {
      return { goal: goal, met: false, status: 'not-comparable', value: null, progress: 0, message: 'Speed goals require a complete timed session.' };
    }
    if (!goal.available || goal.target == null) {
      var baselineCaptured = goal.id === 'personal-best' && result.validForComparison && value != null;
      return { goal: goal, met: false, status: baselineCaptured ? 'baseline' : 'unavailable', value: value, progress: baselineCaptured ? 100 : 0, message: baselineCaptured ? 'Comparable baseline captured. The next matching session can target improvement.' : 'This goal is unavailable for the selected settings.' };
    }
    var safeValue = Number.isFinite(value) ? value : 0;
    var met = safeValue >= goal.target;
    var gap = Math.max(0, goal.target - safeValue);
    return {
      goal: goal, met: met, status: met ? 'met' : 'building', value: safeValue,
      progress: goal.target > 0 ? Math.min(100, Math.round((safeValue / goal.target) * 100)) : 0,
      gap: gap, message: met ? 'Goal met.' : (goal.metric === 'accuracy' ? gap + ' percentage points to go.' : gap + ' DCPM to go.')
    };
  }

  function buildTeacherReportCsv(report) {
    var headers = ['Date', 'Mode', 'Operation', 'Practice Set', 'Timing', 'Accuracy', 'DCPM', 'Correct', 'Attempted', 'Completion', 'Goal', 'Goal Result'];
    function quote(value) {
      var text = value == null ? '' : String(value);
      return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
    }
    var rows = (report && report.sessions || []).map(function (item) {
      var mode = item.mode === 'benchmark' ? 'Benchmark' : (item.untimed ? 'Accuracy Focus' : 'Timed Practice');
      return [
        item.date || '', mode, item.operation || '', item.practiceSet || item.difficulty || '',
        item.untimed ? 'Untimed' : ((item.timeLimit || '') + (item.timeLimit ? ' seconds' : '')),
        item.accuracy != null && Number.isFinite(Number(item.accuracy)) ? Number(item.accuracy) + '%' : '',
        item.dcpm != null && Number.isFinite(Number(item.dcpm)) ? item.dcpm : '', item.totalCorrect == null ? '' : item.totalCorrect,
        item.totalAttempted == null ? '' : item.totalAttempted, item.completionStatus || '',
        item.goal && item.goal.label || '', item.goalResult ? (item.goalResult.met ? 'Met' : item.goalResult.status) : ''
      ].map(quote).join(',');
    });
    return [headers.join(',')].concat(rows).join('\r\n');
  }

  function buildFocusedProblems(facts, count) {
    var unique = [], seen = {};
    (facts || []).forEach(function (fact) {
      var key = getFactKey(fact);
      if (!key || seen[key] || !Number.isFinite(Number(fact.answer))) return;
      seen[key] = true;
      unique.push({ a: Number(fact.a), b: Number(fact.b), op: fact.op, symbol: fact.symbol || _practiceSymbol(fact.op), answer: Number(fact.answer) });
    });
    if (!unique.length) return [];
    var requested = Math.max(unique.length, Number(count) || 10), result = [];
    for (var i = 0; i < requested; i++) {
      var base = unique[i % unique.length];
      var reverse = i >= unique.length && (base.op === 'add' || base.op === 'mul') && Math.floor(i / unique.length) % 2 === 1;
      result.push({
        a: reverse ? base.b : base.a, b: reverse ? base.a : base.b,
        op: base.op, symbol: base.symbol, answer: base.answer,
        studentAnswer: null, correct: null, responseMs: null
      });
    }
    return result;
  }

  function loadFactMastery() {
    try { var raw = JSON.parse(localStorage.getItem(MF_FACT_MASTERY_KEY) || '{}'); return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}; }
    catch (e) { return {}; }
  }

  function saveFactMastery(value) {
    try { localStorage.setItem(MF_FACT_MASTERY_KEY, JSON.stringify(value || {})); } catch (e) {}
  }

  function mergeFactMastery(localValue, storedValue) {
    var merged = Object.assign({}, localValue || {});
    Object.keys(storedValue || {}).forEach(function (key) {
      var incoming = storedValue[key];
      if (!merged[key] || String(incoming.lastSeen || '') >= String(merged[key].lastSeen || '')) merged[key] = incoming;
    });
    return merged;
  }

  function countDigits(n) { return Math.max(1, String(Math.abs(n)).length); }

  function countCorrectDigits(expected, actual) {
    if (!Number.isFinite(Number(expected)) || !Number.isFinite(Number(actual))) return 0;
    var expectedDigits = String(Math.abs(Math.trunc(Number(expected))));
    var actualDigits = String(Math.abs(Math.trunc(Number(actual))));
    var len = Math.max(expectedDigits.length, actualDigits.length);
    expectedDigits = expectedDigits.padStart(len, ' ');
    actualDigits = actualDigits.padStart(len, ' ');
    var correct = 0;
    for (var i = 0; i < len; i++) {
      if (expectedDigits[i] !== ' ' && expectedDigits[i] === actualDigits[i]) correct++;
    }
    return correct;
  }

  function parseStudentAnswer(raw) {
    var text = String(raw == null ? '' : raw).trim();
    if (!/^-?\d+$/.test(text)) return { valid: false, value: null };
    var value = Number(text);
    if (!Number.isSafeInteger(value)) return { valid: false, value: null };
    return { valid: true, value: value };
  }

  // -- Self-contained UI localization --
  var MF_I18N_KEY = 'allo_mathfluency_ui_i18n_v1';
  var LANG_CTX = (typeof window !== 'undefined' && window.AlloLanguageContext) || (typeof window !== 'undefined' && window.React ? window.React.createContext(null) : null);
  var STR_REG = {};
  var LL_CUR = { lang: 'English', cache: {}, t: null };
  function llLoad() { try { return JSON.parse(localStorage.getItem(MF_I18N_KEY)) || {}; } catch (e) { return {}; } }
  function llStore(v) { try { localStorage.setItem(MF_I18N_KEY, JSON.stringify(v)); } catch (e) {} }
  function llInterp(s, params) { if (s == null || !params) return s; Object.keys(params).forEach(function (k) { s = s.split('{' + k + '}').join(String(params[k])); }); return s; }
  function tr(en, params) { if (en && typeof en === 'string') STR_REG[en] = true; var p = LL_CUR.cache[LL_CUR.lang]; return llInterp((p && p[en] != null) ? p[en] : en, params); }
  // tt(key, en): hand-translated pack (via the app's t prop → ui_strings.math_fluency + lang packs)
  // wins; on a miss, fall back to the runtime-AI tr() so uncovered languages still localize.
  function tt(key, en, params) { var v = null; try { v = LL_CUR.t ? LL_CUR.t(key) : null; } catch (e) { v = null; } if (v != null && v !== '' && v !== key) return llInterp(v, params); return tr(en, params); }
  function llCleanJson(raw) { var s = String(raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, ''); var f = s.indexOf('{'), l = s.lastIndexOf('}'); return f >= 0 && l > f ? s.slice(f, l + 1) : s; }
  function llSanitize(obj, wanted) { if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null; var out = {}, n = 0; wanted.forEach(function (k) { var v = obj[k]; if (typeof v === 'string') { v = v.trim().slice(0, 400); if (v) { out[k] = v; n++; } } }); return n ? out : null; }
  function llPrompt(langName, list) { return ['Translate these user-interface labels for a classroom math-fluency practice app into natural, concise ' + langName + ' (buttons, tabs, headings — keep them short).', 'Keep any {tokens}, numbers, math symbols (+ - × ÷ =) and any emoji EXACTLY as written. No commentary.', 'Return ONLY a JSON object mapping each ENGLISH string (used verbatim as the key) to its ' + langName + ' translation.', JSON.stringify(list)].join(String.fromCharCode(10)); }

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

    // ── UI localization (student's interface language, runtime-translated) ──
    var langCtx = React.useContext(LANG_CTX);
    var uiLang = (langCtx && langCtx.currentUiLanguage) || (typeof window !== 'undefined' && window.__alloTextLanguage) || 'English';
    var llCacheRef = useRef(llLoad());
    var llReqRef = useRef(0);
    var llAttemptedRef = useRef({});
    var setLlTick = useState(0)[1];
    LL_CUR.lang = uiLang; LL_CUR.cache = llCacheRef.current; LL_CUR.t = t; // publish snapshot for module-scope tr()/tt()
    function llTranslateBatch(list) {
      var cg = (typeof window !== 'undefined') && window.callGemini;
      if (typeof cg !== 'function' || !list.length) return;
      var reqId = ++llReqRef.current, lang = uiLang;
      var att = llAttemptedRef.current[lang] || (llAttemptedRef.current[lang] = {});
      list.forEach(function (k) { att[k] = true; });
      Promise.resolve().then(function () { return cg(llPrompt(lang, list)); }).then(function (raw) {
        if (reqId !== llReqRef.current) return;
        var pack = null; try { pack = llSanitize(JSON.parse(llCleanJson(raw)), list); } catch (_) {}
        if (pack) {
          var next = Object.assign({}, llCacheRef.current);
          next[lang] = Object.assign({}, next[lang] || {}, pack);
          llCacheRef.current = next; llStore(next);
          setLlTick(function (n) { return n + 1; });
        }
      }).catch(function () {});
    }
    useEffect(function () {
      if (uiLang === 'English' || typeof window === 'undefined' || typeof window.callGemini !== 'function') return;
      var cache = llCacheRef.current[uiLang] || {}, attempted = llAttemptedRef.current[uiLang] || {};
      var missing = Object.keys(STR_REG).filter(function (k) { return !cache[k] && !attempted[k]; });
      if (!missing.length) return;
      var to = setTimeout(function () { llTranslateBatch(missing); }, 500);
      return function () { clearTimeout(to); };
    });

    // State
    var _a = useState(false), active = _a[0], setActive = _a[1];
    var _b = useState('add'), operation = _b[0], setOperation = _b[1];
    var _c = useState('recommended'), difficulty = _c[0], setDifficulty = _c[1];
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
    var _o = useState('practice'), probeMode = _o[0], setProbeMode = _o[1];
    var _p = useState('A'), probeForm = _p[0], setProbeForm = _p[1];
    // Grade for a handed-off standardized administration. The app-wide
    // gradeLevel prop follows whoever is signed in; a benchmark probe is
    // administered at the grade the assessor chose, which can differ.
    var _pg = useState(null), probeGradeOverride = _pg[0], setProbeGradeOverride = _pg[1];
    // The learner a standardized administration is recorded against. null means
    // practice, which is recorded against nobody.
    var _ps = useState(null), probeStudent = _ps[0], setProbeStudent = _ps[1];

    // ── Handoff from a producer that configures this panel ───────────────────
    // Two producers park a config in window.__alloFluencyPendingConfig and then
    // open this panel:
    //   Math Studio       the assessment-plan blocks a teacher composed carry a
    //                     problem quantity that used to be silently discarded
    //                     at this seam (docs/math_create_migration_plan.md).
    //   Assessment Center a standardized benchmark administration: grade, fixed
    //                     form, and the student it is recorded for. Its own
    //                     launcher used to drive a host engine whose UI had been
    //                     migrated away, so the probe never rendered at all.
    // Every field is validated independently, so a producer that sends only
    // some of them configures only those. Nothing is parsed out of free text.
    // Placed after the probe state above because it assigns to those setters.
    React.useEffect(function () {
      function consumePending() {
        var pending = null;
        try {
          pending = window.__alloFluencyPendingConfig;
          delete window.__alloFluencyPendingConfig;
        } catch (_) { return; }
        if (!pending || typeof pending !== 'object') return;
        // A forgotten slot from an abandoned handoff must not configure a
        // panel opened minutes later by hand.
        if (!Number.isFinite(Number(pending.at)) || Date.now() - Number(pending.at) > 120000) return;
        var applied = [];
        var ops = { add: 1, sub: 1, mul: 1, div: 1, mixed: 1 };
        if (ops[pending.operation]) { setOperation(pending.operation); applied.push('operation'); }
        var wanted = Math.floor(Number(pending.problemCount));
        if (wanted >= 1) {
          var options = [20, 40, 60, 80, 120, 150];
          var snapped = options.reduce(function (best, opt) {
            return Math.abs(opt - wanted) < Math.abs(best - wanted) ? opt : best;
          }, options[0]);
          setProblemCount(snapped);
          applied.push('problemCount');
        }
        // Standardized administration. A handoff may only ever set mode TO
        // benchmark; it must not silently drop a teacher out of one.
        var isBenchmark = pending.mode === 'benchmark';
        if (isBenchmark) { setProbeMode('benchmark'); applied.push('mode'); }
        if (/^[ABC]$/.test(String(pending.form || ''))) { setProbeForm(String(pending.form)); applied.push('form'); }
        var handoffGrade = normalizeGrade(pending.grade);
        if (handoffGrade) { setProbeGradeOverride(handoffGrade); applied.push('grade'); }
        // Set unconditionally: a later practice handoff must clear the student
        // a previous benchmark handoff assigned, or the next practice run would
        // be written into that student's record.
        var student = typeof pending.student === 'string' ? pending.student.trim() : '';
        setProbeStudent(isBenchmark && student ? student : null);
        if (!applied.length) return;
        if (typeof addToast === 'function') {
          addToast(isBenchmark
            ? tt('math_fluency.probe_handoff_applied', 'Fixed-form probe set up. Review the settings, then press Start.')
            : tt('math_fluency.builder_handoff_applied', 'Settings from your assessment plan were applied. Review and press Start.'), 'info');
        }
      }
      consumePending();
      // The event covers the already-mounted case: if the teacher is ALREADY
      // in Fluency Probes mode when a producer hands off, no remount happens
      // and a mount-only consume would let the slot expire unused.
      window.addEventListener('alloflow:fluency-pending-config', consumePending);
      return function () { window.removeEventListener('alloflow:fluency-pending-config', consumePending); };
    }, []);
    var _q = useState(''), inputError = _q[0], setInputError = _q[1];
    var _r = useState(0), interruptionCount = _r[0], setInterruptionCount = _r[1];
    var _s = useState(loadFactMastery()), factMastery = _s[0], setFactMastery = _s[1];
    var _t = useState(0), coachAttempts = _t[0], setCoachAttempts = _t[1];
    var _u = useState(false), showTeacherReport = _u[0], setShowTeacherReport = _u[1];
    var _v = useState(30), reportDays = _v[0], setReportDays = _v[1];
    var _w = useState('all'), reportMode = _w[0], setReportMode = _w[1];
    var _x = useState('all'), reportOperation = _x[0], setReportOperation = _x[1];
    var _y = useState('accuracy-90'), sessionGoal = _y[0], setSessionGoal = _y[1];
    var _endEarly = useState(false), confirmEndEarly = _endEarly[0], setConfirmEndEarly = _endEarly[1];
    var _clearHistory = useState(false), confirmClearHistory = _clearHistory[0], setConfirmClearHistory = _clearHistory[1];
    var _practicePause = useState(false), practicePaused = _practicePause[0], setPracticePaused = _practicePause[1];
    var _accuracyDraft = useState(loadAccuracyDraft()), accuracyDraft = _accuracyDraft[0], setAccuracyDraft = _accuracyDraft[1];
    var _supportPrefs = loadFluencySupportPrefs();
    var _reducedMotion = useState(!!_supportPrefs.reducedMotion), reducedMotion = _reducedMotion[0], setReducedMotionState = _reducedMotion[1];
    var _highContrast = useState(!!_supportPrefs.highContrast), highContrast = _highContrast[0], setHighContrastState = _highContrast[1];
    var _touchKeypad = useState(!!_supportPrefs.touchKeypad), touchKeypad = _touchKeypad[0], setTouchKeypadState = _touchKeypad[1];
    var _adaptivePractice = useState(_supportPrefs.adaptivePractice !== false), adaptivePractice = _adaptivePractice[0], setAdaptivePracticeState = _adaptivePractice[1];
    var _readAloud = useState(!!_supportPrefs.readAloud), readAloud = _readAloud[0], setReadAloudState = _readAloud[1];
    var _calmDisplay = useState(!!_supportPrefs.calmDisplay), calmDisplay = _calmDisplay[0], setCalmDisplayState = _calmDisplay[1];
    var _adaptiveLevel = useState('steady'), adaptiveLevel = _adaptiveLevel[0], setAdaptiveLevel = _adaptiveLevel[1];

    useEffect(function () {
      if (timeLimit === 0 && (sessionGoal === 'personal-best' || sessionGoal === 'instructional-reference')) setSessionGoal('accuracy-90');
    }, [timeLimit, sessionGoal]);

    var inputRef = useRef(null);
    var overlayRef = useRef(null);
    var timerRef = useRef(null);
    var timerValueRef = useRef(timer);
    var problemsRef = useRef(problems);
    var currentIndexRef = useRef(currentIndex);
    var runConfigRef = useRef(null);
    var finishedRef = useRef(false);
    var autoAdvanceTimerRef = useRef(null);
    var deadlineRef = useRef(0);
    var runTimingRef = useRef({ startedAt: 0, pausedMs: 0, resumedMs: 0 });
    var visibilityPauseRef = useRef(null);
    var manualPracticePauseRef = useRef(null);
    var practicePauseStatsRef = useRef({ count: 0, seconds: 0 });
    var adaptiveStatsRef = useRef({ firstTryStreak: 0, coachedOrMissed: 0, adjustments: 0, level: 'steady' });
    var pauseResumeRef = useRef(null);
    var interruptionStatsRef = useRef({ count: 0, seconds: 0 });
    var warningPlayedRef = useRef(false);
    var itemStartedAtRef = useRef(0);
    var itemPausedMsRef = useRef(0);
    var factMasteryRef = useRef(factMastery);
    factMasteryRef.current = factMastery;
    timerValueRef.current = timer;
    problemsRef.current = problems;
    currentIndexRef.current = currentIndex;

    function nowMs() {
      return typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
    }

    var speechAvailable = typeof window !== 'undefined' && window.speechSynthesis
      && typeof window.speechSynthesis.cancel === 'function' && typeof window.speechSynthesis.speak === 'function'
      && typeof window.SpeechSynthesisUtterance === 'function';

    function cancelProblemSpeech() {
      if (!speechAvailable) return;
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }

    function speakProblem(problem) {
      if (!speechAvailable) return false;
      var spokenText = formatProblemSpeech(problem);
      if (!spokenText) return false;
      try {
        cancelProblemSpeech();
        var utterance = new window.SpeechSynthesisUtterance(spokenText);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        window.speechSynthesis.speak(utterance);
        return true;
      } catch (e) { return false; }
    }

    function updateSupportPreference(key, value) {
      var next = { reducedMotion: reducedMotion, highContrast: highContrast, touchKeypad: touchKeypad, adaptivePractice: adaptivePractice, readAloud: readAloud, calmDisplay: calmDisplay };
      next[key] = value;
      saveFluencySupportPrefs(next);
      if (key === 'reducedMotion') setReducedMotionState(value);
      if (key === 'highContrast') setHighContrastState(value);
      if (key === 'touchKeypad') setTouchKeypadState(value);
      if (key === 'adaptivePractice') setAdaptivePracticeState(value);
      if (key === 'readAloud') setReadAloudState(value);
      if (key === 'calmDisplay') setCalmDisplayState(value);
    }

    function buildComparisonKey(config) {
      return [config.grade || 'unknown', config.mode, config.form || '-', config.operation, config.difficulty, config.timeLimit].join('|');
    }

    // Load history from storage
    useEffect(function () {
      if (!storageDB) return;
      storageDB.get('allo_fluency_history').then(function (saved) {
        if (saved && Array.isArray(saved)) setHistory(saved.slice(-100));
      }).catch(function () { });
    }, []);

    // Load fact mastery from shared storage when available, while keeping a
    // localStorage fallback for standalone and offline use.
    useEffect(function () {
      if (!storageDB) return;
      storageDB.get(MF_FACT_MASTERY_KEY).then(function (saved) {
        if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return;
        var merged = mergeFactMastery(factMasteryRef.current, saved);
        factMasteryRef.current = merged;
        setFactMastery(merged);
        saveFactMastery(merged);
      }).catch(function () {});
    }, []);

    // Save history to storage
    useEffect(function () {
      if (!storageDB || history.length === 0) return;
      storageDB.set('allo_fluency_history', history.slice(-100)).catch(function () { });
    }, [history]);

    // Accuracy Focus is the only resumable session type. A checkpoint is
    // written immediately after every problem-state change and every five
    // seconds, while timed practice and benchmarks never create drafts.
    useEffect(function () {
      var config = runConfigRef.current;
      if (!active || !config || !config.untimed || config.mode !== 'practice') return;
      function checkpointAccuracyDraft() {
        var index = currentIndexRef.current;
        var snapshot = problemsRef.current;
        if (!snapshot.length || index < 0 || index >= snapshot.length) return;
        var effectiveNow = nowMs();
        if (manualPracticePauseRef.current !== null) effectiveNow = Math.min(effectiveNow, manualPracticePauseRef.current);
        if (visibilityPauseRef.current !== null) effectiveNow = Math.min(effectiveNow, visibilityPauseRef.current);
        var elapsedMs = Math.max(0, (runTimingRef.current.resumedMs || 0) + effectiveNow - runTimingRef.current.startedAt - runTimingRef.current.pausedMs);
        saveAccuracyDraft({
          version: 1, savedAt: Date.now(), currentIndex: index, elapsedMs: elapsedMs,
          pauseStats: practicePauseStatsRef.current,
          config: config, problems: snapshot
        });
      }
      checkpointAccuracyDraft();
      var checkpointTimer = setInterval(checkpointAccuracyDraft, 5000);
      return function () { clearInterval(checkpointTimer); };
    }, [active, problems, currentIndex, practicePaused]);

    var finishProbe = useCallback(function (reason) {
      if (finishedRef.current) return;
      finishedRef.current = true;
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      if (autoAdvanceTimerRef.current) { clearTimeout(autoAdvanceTimerRef.current); autoAdvanceTimerRef.current = null; }
      cancelProblemSpeech();
      setConfirmEndEarly(false);
      clearAccuracyDraft();
      setAccuracyDraft(null);
      setActive(false);

      var snapshot = problemsRef.current.slice();
      var attempted = snapshot.filter(function (p) { return p.studentAnswer !== null; });
      var correct = attempted.filter(function (p) { return p.correct; });
      var totalDigitsCorrect = attempted.reduce(function (sum, p) {
        return sum + (p.studentAnswer === 'SKIP' ? 0 : countCorrectDigits(p.answer, p.studentAnswer));
      }, 0);
      var config = runConfigRef.current || {
        mode: 'practice', form: null, grade: normalizeGrade(gradeLevel) || String(gradeLevel || 'Unknown'),
        operation: operation, difficulty: difficulty, timeLimit: timeLimit, problemCount: snapshot.length
      };
      var finishTime = nowMs();
      if (manualPracticePauseRef.current !== null) {
        var pendingManualPauseMs = Math.max(0, finishTime - manualPracticePauseRef.current);
        runTimingRef.current.pausedMs += pendingManualPauseMs;
        itemPausedMsRef.current += pendingManualPauseMs;
        practicePauseStatsRef.current.seconds += pendingManualPauseMs / 1000;
        manualPracticePauseRef.current = null;
        setPracticePaused(false);
      }
      if (visibilityPauseRef.current !== null) {
        var pendingPauseMs = Math.max(0, finishTime - visibilityPauseRef.current);
        runTimingRef.current.pausedMs += pendingPauseMs;
        interruptionStatsRef.current.seconds += pendingPauseMs / 1000;
        visibilityPauseRef.current = null;
      }
      var rawElapsedSeconds = Math.max(0, ((runTimingRef.current.resumedMs || 0) + finishTime - runTimingRef.current.startedAt - runTimingRef.current.pausedMs) / 1000);
      var isUntimed = !!config.untimed;
      var elapsedSeconds = isUntimed ? rawElapsedSeconds : Math.min(config.timeLimit, rawElapsedSeconds);
      var finishReason = reason || 'early';
      var wasInterrupted = config.mode === 'benchmark' && interruptionStatsRef.current.count > 0;
      var completionStatus = finishReason === 'early' ? 'incomplete' : (wasInterrupted ? 'interrupted' : 'complete');
      var validForComparison = completionStatus === 'complete' && !isUntimed;
      var elapsedMinutes = Math.max(1 / 60, elapsedSeconds / 60);
      var calculatedDcpm = Math.round(totalDigitsCorrect / elapsedMinutes);
      var dcpm = validForComparison ? calculatedDcpm : null;
      var strategyCoach = !!config.strategyCoach;
      var firstTryCorrect = attempted.filter(function (problem) { return problem.correct && (!problem.attemptLog || problem.attemptLog.length === 0); });
      var accuracyCorrect = strategyCoach ? firstTryCorrect.length : correct.length;
      var accuracy = attempted.length > 0 ? Math.round((accuracyCorrect / attempted.length) * 100) : 0;
      var reference = getBenchmark(config.grade, config.operation);
      var referenceResult = isUntimed && completionStatus === 'complete'
        ? { label: tt('math_fluency.accuracy_focus_practice', 'Accuracy Focus Practice'), color: '#6d28d9', emoji: '\uD83C\uDFAF', tier: 'accuracy-focus' }
        : validForComparison
          ? getBenchmarkLabel(dcpm, reference)
          : {
              label: completionStatus === 'interrupted' ? 'Interrupted run' : 'Incomplete run',
              color: '#64748b',
              emoji: completionStatus === 'interrupted' ? '\u26a0\ufe0f' : '\u23f9\ufe0f'
            };
      var errorAnalysis = analyzeErrors(snapshot);
      var factInsights = summarizeFactResults(snapshot);
      var focusFacts = factInsights.filter(function (item) { return item.correct < item.attempts; }).slice(0, 12).map(function (item) { return item.problem; });
      var nextMastery = updateFactMastery(factMasteryRef.current, snapshot);
      factMasteryRef.current = nextMastery;
      setFactMastery(nextMastery);
      saveFactMastery(nextMastery);
      if (storageDB) storageDB.set(MF_FACT_MASTERY_KEY, nextMastery).catch(function () {});
      var comparisonKey = config.comparisonKey || buildComparisonKey(config);

      var result = {
        date: new Date().toISOString(),
        mode: config.mode,
        form: config.form,
        grade: config.grade,
        // Present only on a handed-off standardized administration; the host
        // writes the record to this learner's probe history on completion.
        student: config.student || null,
        operation: config.operation,
        difficulty: config.difficulty,
        dcpm: dcpm,
        accuracy: accuracy,
        totalCorrect: correct.length,
        firstTryCorrect: firstTryCorrect.length,
        totalAttempted: attempted.length,
        totalDigitsCorrect: totalDigitsCorrect,
        timeLimit: config.timeLimit,
        untimed: isUntimed,
        strategyCoach: strategyCoach,
        totalPracticeAttempts: factInsights.reduce(function (sum, item) { return sum + item.attempts; }, 0),
        elapsedSeconds: elapsedSeconds,
        problemCount: config.problemCount,
        finishReason: finishReason,
        completionStatus: completionStatus,
        validForComparison: validForComparison,
        interruptionCount: interruptionStatsRef.current.count,
        interruptedSeconds: Math.round(interruptionStatsRef.current.seconds * 10) / 10,
        practicePauseCount: practicePauseStatsRef.current.count,
        practicePausedSeconds: Math.round(practicePauseStatsRef.current.seconds * 10) / 10,
        resumedFromDraft: config.resumedFromDraft === true,
        adaptivePractice: config.adaptivePractice === true,
        adaptiveAdjustments: adaptiveStatsRef.current.adjustments,
        adaptiveFinalLevel: adaptiveStatsRef.current.level || 'steady',
        touchKeypad: config.touchKeypad === true,
        reducedMotion: config.reducedMotion === true,
        highContrast: config.highContrast === true,
        readAloud: config.readAloud === true,
        calmDisplay: config.calmDisplay === true,
        comparisonKey: comparisonKey,
        benchmark: reference,
        benchmarkResult: referenceResult,
        errorAnalysis: errorAnalysis,
        factInsights: factInsights,
        focusFacts: focusFacts,
        goal: config.goal || null
      };
      result.goalResult = evaluateSessionGoal(result.goal, result);
      setResults(result);
      setHistory(function (items) { return items.concat([result]).slice(-100); });

      onProbeComplete({
        id: 'fluency-probe-' + Date.now(),
        type: 'math-fluency-probe',
        title: tt('math_fluency.math_fluency_probe', 'Math Fluency Probe - ') + config.operation + ' (' + config.difficulty + ')',
        timestamp: Date.now(),
        data: result
      });

      var xp = validForComparison ? Math.round(dcpm / 10) : (isUntimed && completionStatus === 'complete' ? Math.max(1, Math.round(correct.length / 5)) : 0);
      if (xp > 0) handleScoreUpdate(xp, tt('math_fluency.math_fluency', 'Math Fluency'), 'fluency-probe');
    }, [timeLimit, operation, difficulty, gradeLevel, onProbeComplete, handleScoreUpdate, storageDB]);

    var beginProbe = useCallback(function (nextProblems, config, resumeDraft) {
      var restoredDraft = config && config.untimed ? sanitizeAccuracyDraft(resumeDraft, new Date()) : null;
      if (resumeDraft && !restoredDraft) {
        clearAccuracyDraft();
        setAccuracyDraft(null);
        addToast(tt('math_fluency.saved_session_unavailable', 'That saved Accuracy Focus session is no longer available.'), 'warning');
        return;
      }
      if (restoredDraft) {
        nextProblems = restoredDraft.problems;
        config = restoredDraft.config;
      }
      if (!nextProblems || !nextProblems.length) {
        addToast(tt('math_fluency.no_problems_generated', 'No problems could be generated for these settings.'), 'warning');
        return;
      }
      config = Object.assign({}, config);
      if (config.mode === 'benchmark') config.readAloud = false;
      cancelProblemSpeech();
      config.comparisonKey = buildComparisonKey(config);
      config.goal = restoredDraft && config.goal ? config.goal : buildSessionGoal(sessionGoal, history, config);
      config.resumedFromDraft = !!restoredDraft;
      finishedRef.current = false;
      runConfigRef.current = config;
      var startTime = nowMs();
      var resumeIndex = restoredDraft ? restoredDraft.currentIndex : 0;
      deadlineRef.current = config.untimed ? 0 : startTime + config.timeLimit * 1000;
      runTimingRef.current = { startedAt: startTime, pausedMs: 0, resumedMs: restoredDraft ? restoredDraft.elapsedMs : 0 };
      itemStartedAtRef.current = startTime;
      itemPausedMsRef.current = 0;
      visibilityPauseRef.current = null;
      manualPracticePauseRef.current = null;
      practicePauseStatsRef.current = restoredDraft ? restoredDraft.pauseStats : { count: 0, seconds: 0 };
      adaptiveStatsRef.current = { firstTryStreak: 0, coachedOrMissed: 0, adjustments: 0, level: 'steady' };
      setAdaptiveLevel('steady');
      interruptionStatsRef.current = { count: 0, seconds: 0 };
      warningPlayedRef.current = false;
      setInterruptionCount(0);
      clearAccuracyDraft();
      setAccuracyDraft(null);
      problemsRef.current = nextProblems;
      currentIndexRef.current = resumeIndex;
      timerValueRef.current = config.untimed ? 0 : config.timeLimit;
      setProblems(nextProblems);
      setCurrentIndex(resumeIndex);
      setResults(null);
      setStudentInput('');
      setInputError('');
      setTimer(config.untimed ? 0 : config.timeLimit);
      setLastFeedback(null);
      setCoachAttempts(restoredDraft && nextProblems[resumeIndex] && Array.isArray(nextProblems[resumeIndex].attemptLog) ? nextProblems[resumeIndex].attemptLog.length : 0);
      setConfirmEndEarly(false);
      setPracticePaused(false);
      setActive(true);

      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      if (!config.untimed) {
        timerRef.current = setInterval(function () {
          if (visibilityPauseRef.current !== null) return;
          var next = Math.max(0, Math.ceil((deadlineRef.current - nowMs()) / 1000));
          timerValueRef.current = next;
          setTimer(next);
          if (next === 0) {
            clearInterval(timerRef.current);
            timerRef.current = null;
            setTimeout(function () { finishProbe('time'); }, 0);
          } else if (next <= 10 && !warningPlayedRef.current && soundEnabled && config.mode !== 'benchmark' && !config.calmDisplay) {
            warningPlayedRef.current = true;
            playTimeWarning();
          }
        }, 250);
      }

      setTimeout(function () { if (inputRef.current) inputRef.current.focus(); }, 100);
    }, [finishProbe, soundEnabled, addToast, sessionGoal, history]);

    var startProbe = useCallback(function () {
      // A handed-off administration carries its own grade; otherwise follow the
      // app-wide grade level as before.
      var normalizedGrade = probeGradeOverride || normalizeGrade(gradeLevel);
      var config;
      var nextProblems;
      if (probeMode === 'benchmark') {
        var gradeBanks = normalizedGrade && window.MATH_PROBE_BANKS ? window.MATH_PROBE_BANKS[normalizedGrade] : null;
        var bank = gradeBanks ? gradeBanks[probeForm] : null;
        if (!bank || !Array.isArray(bank.problems) || bank.problems.length === 0) {
          addToast(tt('math_fluency.fixed_form_unavailable', 'A fixed comparable form is unavailable for this grade. Choose Practice mode.'), 'warning');
          return;
        }
        nextProblems = bank.problems.map(function (prob) { return Object.assign({}, prob, { studentAnswer: null, correct: null, responseMs: null }); });
        config = {
          mode: 'benchmark', form: probeForm, grade: normalizedGrade,
          // Carried into the result so a completed benchmark can be written to
          // this learner's probe history. Practice runs leave it null.
          student: probeStudent || null,
          operation: bank.operation || 'mixed', difficulty: bank.difficulty || 'fixed-form',
          timeLimit: Number(bank.timeLimit) || 120, problemCount: nextProblems.length, adaptivePractice: false, touchKeypad: touchKeypad,
          reducedMotion: reducedMotion, highContrast: highContrast, readAloud: false, calmDisplay: calmDisplay
        };
      } else {
        nextProblems = generatePracticeProblems(operation, difficulty, normalizedGrade || gradeLevel, problemCount);
        config = {
          mode: 'practice', form: null, grade: normalizedGrade || String(gradeLevel || 'Unknown'),
          operation: operation, difficulty: difficulty, practiceSet: difficulty,
          timeLimit: timeLimit, untimed: timeLimit === 0, strategyCoach: timeLimit === 0, problemCount: nextProblems.length,
          adaptivePractice: adaptivePractice, touchKeypad: touchKeypad,
          reducedMotion: reducedMotion, highContrast: highContrast, readAloud: readAloud && speechAvailable, calmDisplay: calmDisplay
        };
      }
      beginProbe(nextProblems, config);
    }, [timeLimit, operation, difficulty, problemCount, gradeLevel, probeMode, probeForm, probeGradeOverride, probeStudent, beginProbe, addToast, adaptivePractice, touchKeypad, reducedMotion, highContrast, readAloud, calmDisplay, speechAvailable]);

    var resumeSavedAccuracyFocus = useCallback(function () {
      var restored = sanitizeAccuracyDraft(accuracyDraft, new Date());
      if (!restored) {
        clearAccuracyDraft();
        setAccuracyDraft(null);
        addToast(tt('math_fluency.saved_session_unavailable', 'That saved Accuracy Focus session is no longer available.'), 'warning');
        return;
      }
      beginProbe(restored.problems, restored.config, restored);
      addToast(tt('math_fluency.saved_session_resumed', 'Accuracy Focus session resumed'), 'success');
    }, [accuracyDraft, beginProbe, addToast]);

    var discardSavedAccuracyFocus = useCallback(function () {
      clearAccuracyDraft();
      setAccuracyDraft(null);
      addToast(tt('math_fluency.saved_session_discarded', 'Saved Accuracy Focus session discarded'), 'info');
    }, [addToast]);

    function startFocusedPractice(facts) {
      setProbeMode('practice');
      var focusedCount = Math.min(20, Math.max(10, (facts || []).length * 3));
      var nextProblems = buildFocusedProblems(facts, focusedCount);
      var ops = {};
      nextProblems.forEach(function (problem) { ops[problem.op] = true; });
      var opKeys = Object.keys(ops);
      beginProbe(nextProblems, {
        mode: 'practice', form: null, grade: normalizeGrade(gradeLevel) || String(gradeLevel || 'Unknown'),
        operation: opKeys.length === 1 ? opKeys[0] : 'mixed', difficulty: 'focus', practiceSet: 'focus',
        timeLimit: timeLimit, untimed: timeLimit === 0, strategyCoach: timeLimit === 0, problemCount: nextProblems.length, focusedPractice: true,
        adaptivePractice: adaptivePractice, touchKeypad: touchKeypad, reducedMotion: reducedMotion, highContrast: highContrast,
        readAloud: readAloud && speechAvailable, calmDisplay: calmDisplay
      });
    }

    function startSmartReview() {
      var nextProblems = buildSmartReviewProblems(factMasteryRef.current, 20, new Date());
      if (!nextProblems.length) {
        addToast(tt('math_fluency.no_smart_review_facts', 'Complete a few practice facts first to build your Smart Review.'), 'info');
        return;
      }
      setProbeMode('practice');
      var ops = {};
      nextProblems.forEach(function (problem) { ops[problem.op] = true; });
      var opKeys = Object.keys(ops);
      beginProbe(nextProblems, {
        mode: 'practice', form: null, grade: normalizeGrade(gradeLevel) || String(gradeLevel || 'Unknown'),
        operation: opKeys.length === 1 ? opKeys[0] : 'mixed', difficulty: 'smart-review', practiceSet: 'smart-review',
        timeLimit: timeLimit, untimed: timeLimit === 0, strategyCoach: timeLimit === 0,
        problemCount: nextProblems.length, smartReview: true, adaptivePractice: adaptivePractice, touchKeypad: touchKeypad,
        reducedMotion: reducedMotion, highContrast: highContrast, readAloud: readAloud && speechAvailable, calmDisplay: calmDisplay
      });
    }

    function readMazeLifetime() {
      try {
        var value = JSON.parse(localStorage.getItem('fluency_maze_lifetime') || '{}');
        return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
      } catch (e) { return {}; }
    }

    function getTeacherReport() {
      return buildTeacherReport(history, factMastery, {
        days: reportDays, mode: reportMode, operation: reportOperation
      }, normalizeGrade(gradeLevel) || String(gradeLevel || 'Unknown'), readMazeLifetime(), new Date());
    }

    function exportTeacherReport() {
      try {
        var report = getTeacherReport();
        var blob = new Blob([buildTeacherReportCsv(report)], { type: 'text/csv;charset=utf-8' });
        var url = window.URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = 'math-fluency-report-' + new Date().toISOString().slice(0, 10) + '.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        addToast(tt('math_fluency.report_exported', 'Teacher report exported'), 'success');
      } catch (e) {
        addToast(tt('math_fluency.report_export_failed', 'The teacher report could not be exported.'), 'warning');
      }
    }

    var pauseAccuracyPractice = useCallback(function () {
      var config = runConfigRef.current || {};
      if (!active || !config.untimed || manualPracticePauseRef.current !== null) return;
      manualPracticePauseRef.current = nowMs();
      practicePauseStatsRef.current.count += 1;
      if (autoAdvanceTimerRef.current) { clearTimeout(autoAdvanceTimerRef.current); autoAdvanceTimerRef.current = null; }
      setPracticePaused(true);
      _mfAnnounce(tt('math_fluency.accuracy_focus_paused', 'Accuracy Focus paused. Press P or choose Resume when you are ready.'));
      setTimeout(function () { if (pauseResumeRef.current) pauseResumeRef.current.focus(); }, 0);
    }, [active]);

    var resumeAccuracyPractice = useCallback(function () {
      if (manualPracticePauseRef.current === null) return;
      var pausedMs = Math.max(0, nowMs() - manualPracticePauseRef.current);
      runTimingRef.current.pausedMs += pausedMs;
      itemPausedMsRef.current += pausedMs;
      practicePauseStatsRef.current.seconds += pausedMs / 1000;
      manualPracticePauseRef.current = null;
      setPracticePaused(false);
      _mfAnnounce(tt('math_fluency.accuracy_focus_resumed', 'Accuracy Focus resumed.'));
      setTimeout(function () { if (inputRef.current) inputRef.current.focus(); }, 0);
    }, []);

    var submitAnswer = useCallback(function (skip) {
      if (manualPracticePauseRef.current !== null) return;
      var isSkip = skip === true;
      var parsed = isSkip ? { valid: true, value: null } : parseStudentAnswer(studentInput);
      if (!parsed.valid) {
        var message = tt('math_fluency.enter_whole_number', 'Enter a whole-number answer, or choose Skip.');
        setInputError(message);
        _mfAnnounce(message);
        if (inputRef.current) inputRef.current.focus();
        return;
      }

      var idx = currentIndexRef.current;
      var updated = problemsRef.current.slice();
      if (idx >= updated.length) return;
      var problem = updated[idx];
      var isCorrect = !isSkip && parsed.value === problem.answer;
      var responseMs = Math.max(0, nowMs() - itemStartedAtRef.current - itemPausedMsRef.current);
      var configNow = runConfigRef.current || {};
      var isFixedRun = configNow.mode === 'benchmark';
      var coachActive = !isFixedRun && !!configNow.strategyCoach;

      if (coachActive && !isSkip && !isCorrect) {
        var attemptLog = (problem.attemptLog || []).concat([{
          studentAnswer: parsed.value, correct: false, responseMs: Math.round(responseMs)
        }]);
        updated[idx] = Object.assign({}, problem, { attemptLog: attemptLog });
        problemsRef.current = updated;
        setProblems(updated);
        setCoachAttempts(attemptLog.length);
        if (soundEnabled) playIncorrect();
        setLastFeedback('wrong');
        setTimeout(function () { setLastFeedback(null); }, 400);
        setStudentInput('');
        setInputError('');
        itemStartedAtRef.current = nowMs();
        itemPausedMsRef.current = 0;
        var coaching = getStrategyHint(problem, attemptLog.length);
        if (coaching) _mfAnnounce(coaching.title + '. ' + coaching.message);
        setTimeout(function () { if (inputRef.current) inputRef.current.focus(); }, 50);
        return;
      }

      updated[idx] = Object.assign({}, problem, {
        studentAnswer: isSkip ? 'SKIP' : parsed.value,
        correct: isSkip ? false : isCorrect,
        firstTryCorrect: isCorrect && (!problem.attemptLog || problem.attemptLog.length === 0),
        responseMs: Math.round(responseMs)
      });
      if (!isFixedRun && configNow.adaptivePractice && !configNow.focusedPractice && !configNow.smartReview && idx + 1 < updated.length) {
        var adaptiveStats = adaptiveStatsRef.current;
        var firstTry = isCorrect && !isSkip && (!problem.attemptLog || problem.attemptLog.length === 0);
        adaptiveStats.firstTryStreak = firstTry ? adaptiveStats.firstTryStreak + 1 : 0;
        adaptiveStats.coachedOrMissed = firstTry ? Math.max(0, adaptiveStats.coachedOrMissed - 1) : adaptiveStats.coachedOrMissed + 1;
        var nextAdaptiveLevel = getAdaptivePracticeLevel(adaptiveStats);
        if (nextAdaptiveLevel !== adaptiveLevel) {
          adaptiveStats.adjustments += 1;
          adaptiveStats.level = nextAdaptiveLevel;
          setAdaptiveLevel(nextAdaptiveLevel);
          var adaptiveSet = nextAdaptiveLevel === 'stretch' ? 'extended' : nextAdaptiveLevel === 'support' ? 'recommended' : (configNow.practiceSet || configNow.difficulty);
          var replacement = generatePracticeProblems(problem.op, adaptiveSet, configNow.grade, 1)[0];
          if (replacement) updated[idx + 1] = replacement;
          _mfAnnounce(nextAdaptiveLevel === 'stretch' ? tt('math_fluency.adaptive_stretch', 'Adaptive practice: ready for a stretch fact.') : nextAdaptiveLevel === 'support' ? tt('math_fluency.adaptive_support', 'Adaptive practice: returning to a support fact.') : tt('math_fluency.adaptive_steady', 'Adaptive practice: steady level.'));
        }
      }
      problemsRef.current = updated;
      setProblems(updated);

      if (!isFixedRun && soundEnabled && !isSkip) {
        if (isCorrect) playCorrect(); else playIncorrect();
      }
      if (!isFixedRun) {
        setLastFeedback(isSkip ? 'skip' : (isCorrect ? 'correct' : 'wrong'));
        setTimeout(function () { setLastFeedback(null); }, 400);
      }
      setStudentInput('');
      setInputError('');
      setCoachAttempts(0);

      var next = idx + 1;
      currentIndexRef.current = next;
      itemStartedAtRef.current = nowMs();
      itemPausedMsRef.current = 0;
      setCurrentIndex(next);
      if (next >= updated.length) setTimeout(function () { finishProbe('complete'); }, 50);
      else setTimeout(function () { if (inputRef.current) inputRef.current.focus(); }, 50);
    }, [studentInput, soundEnabled, finishProbe, adaptiveLevel]);

    // Auto-advance on a strictly valid correct answer. Cleanup prevents a
    // stale timeout from submitting after the student edits the value.
    useEffect(function () {
      if (autoAdvanceTimerRef.current) { clearTimeout(autoAdvanceTimerRef.current); autoAdvanceTimerRef.current = null; }
      if (!autoAdvance || !active || practicePaused || studentInput === '' || (runConfigRef.current && runConfigRef.current.mode === 'benchmark')) return;
      var currentProblem = problems[currentIndex];
      var parsed = parseStudentAnswer(studentInput);
      if (currentProblem && parsed.valid && parsed.value === currentProblem.answer) {
        autoAdvanceTimerRef.current = setTimeout(function () { submitAnswer(false); }, 150);
      }
      return function () {
        if (autoAdvanceTimerRef.current) { clearTimeout(autoAdvanceTimerRef.current); autoAdvanceTimerRef.current = null; }
      };
    }, [studentInput, autoAdvance, active, practicePaused, currentIndex, submitAnswer]);

    // Practice-only spoken facts follow the active problem. Cancellation on
    // every transition prevents overlapping utterances; paused and fixed-form
    // sessions stay silent so administration and response timing remain neutral.
    useEffect(function () {
      var config = runConfigRef.current;
      if (!active || practicePaused || !config || config.mode === 'benchmark' || !config.readAloud) {
        cancelProblemSpeech();
        return;
      }
      var problem = problems[currentIndex];
      if (!problem) return;
      speakProblem(problem);
      return cancelProblemSpeech;
    }, [active, currentIndex, practicePaused]);

    // Escape opens the end-session safeguard first (or cancels it when open).
    // Tab and Shift+Tab retain their standard meaning and cycle through the
    // controls within the modal probe surface.
    useEffect(function () {
      if (!active) return;
      function handleKey(e) {
        if ((e.key === 'p' || e.key === 'P') && runConfigRef.current && runConfigRef.current.untimed && !confirmEndEarly) {
          e.preventDefault();
          if (manualPracticePauseRef.current !== null) resumeAccuracyPractice();
          else pauseAccuracyPractice();
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          if (confirmEndEarly) {
            setConfirmEndEarly(false);
            setTimeout(function () { if (inputRef.current) inputRef.current.focus(); }, 0);
          } else {
            setConfirmEndEarly(true);
          }
          return;
        }
        if (e.key !== 'Tab' || !overlayRef.current) return;
        var focusable = Array.prototype.slice.call(overlayRef.current.querySelectorAll('input:not([disabled]), button:not([disabled]), select:not([disabled]), [tabindex="0"]'));
        if (!focusable.length) return;
        var first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      window.addEventListener('keydown', handleKey);
      return function () { window.removeEventListener('keydown', handleKey); };
    }, [active, confirmEndEarly, pauseAccuracyPractice, resumeAccuracyPractice]);

    // Browser reloads and tab/window closes can otherwise discard an active
    // session before its attempted facts and incomplete status are saved.
    useEffect(function () {
      if (!active || typeof window === 'undefined') return;
      function guardActiveSession(e) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
      window.addEventListener('beforeunload', guardActiveSession);
      return function () { window.removeEventListener('beforeunload', guardActiveSession); };
    }, [active]);

    // Pause elapsed time while the page is hidden. Fixed comparable forms are
    // also marked as interrupted so their scores cannot enter trend data.
    useEffect(function () {
      if (!active || typeof document === 'undefined') return;
      function handleVisibilityChange() {
        var currentTime = nowMs();
        if (document.hidden) {
          if (manualPracticePauseRef.current !== null) return;
          if (visibilityPauseRef.current === null) {
            visibilityPauseRef.current = currentTime;
            if (runConfigRef.current && runConfigRef.current.mode === 'benchmark') {
              interruptionStatsRef.current.count += 1;
              setInterruptionCount(interruptionStatsRef.current.count);
            }
          }
          return;
        }
        if (visibilityPauseRef.current !== null) {
          var pausedMs = Math.max(0, currentTime - visibilityPauseRef.current);
          deadlineRef.current += pausedMs;
          runTimingRef.current.pausedMs += pausedMs;
          interruptionStatsRef.current.seconds += pausedMs / 1000;
          itemPausedMsRef.current += pausedMs;
          visibilityPauseRef.current = null;
        }
      }
      document.addEventListener('visibilitychange', handleVisibilityChange);
      handleVisibilityChange();
      return function () { document.removeEventListener('visibilitychange', handleVisibilityChange); };
    }, [active]);

    useEffect(function () {
      return function () {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        if (autoAdvanceTimerRef.current) { clearTimeout(autoAdvanceTimerRef.current); autoAdvanceTimerRef.current = null; }
        cancelProblemSpeech();
      };
    }, []);

    // -- Icons --
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
      var isFixedRun = runConfigRef.current && runConfigRef.current.mode === 'benchmark';
      var isUntimedRun = !!(runConfigRef.current && runConfigRef.current.untimed);
      var calmDisplayRun = !!(runConfigRef.current && runConfigRef.current.calmDisplay);
      var readAloudRun = !!(runConfigRef.current && runConfigRef.current.readAloud && !isFixedRun && speechAvailable);
      var correctCount = problems.filter(function (p) { return p.correct; }).length;
      var activeTimeLimit = (runConfigRef.current && runConfigRef.current.timeLimit) || timeLimit;
      var timerPct = isUntimedRun
        ? Math.max(0, Math.min(100, (currentIndex / Math.max(1, problems.length)) * 100))
        : Math.max(0, Math.min(100, (timer / Math.max(1, activeTimeLimit)) * 100));
      var isLowTime = !isUntimedRun && timer <= 10;
      var exactTimeLabel = tt('math_fluency.time_remaining', 'Time remaining: ') + timer + tt('math_fluency.seconds', ' seconds');
      var calmTimeLabel = isLowTime ? tt('math_fluency.almost_done', 'Almost done') : tt('math_fluency.time_is_running', 'Time is running');
      var operationPalette = {
        add: { accent: '#2563eb', strong: '#1d4ed8', soft: '#eff6ff', border: '#93c5fd', label: tt('math_fluency.addition', 'Addition') },
        sub: { accent: '#7c3aed', strong: '#6d28d9', soft: '#f5f3ff', border: '#c4b5fd', label: tt('math_fluency.subtraction', 'Subtraction') },
        mul: { accent: '#0f766e', strong: '#115e59', soft: '#f0fdfa', border: '#99f6e4', label: tt('math_fluency.multiplication', 'Multiplication') },
        div: { accent: '#d97706', strong: '#b45309', soft: '#fffbeb', border: '#fcd34d', label: tt('math_fluency.division', 'Division') }
      }[prob.op] || { accent: '#475569', strong: '#334155', soft: '#f8fafc', border: '#cbd5e1', label: tt('math_fluency.mixed', 'Mixed') };
      var strategyHint = isUntimedRun && coachAttempts > 0 ? getStrategyHint(prob, coachAttempts) : null;
      // Live DCPM — digits-correct-per-minute, the gold-standard fluency
      // measure. We compute it from the same formula that finishProbe uses,
      // so the live number matches what the results will show. Shown to the
      // student during the probe as light real-time feedback.
      var liveDigitsCorrect = problems.reduce(function (sum, p) {
        return sum + (p.studentAnswer == null || p.studentAnswer === 'SKIP' ? 0 : countCorrectDigits(p.answer, p.studentAnswer));
      }, 0);
      var liveElapsed = activeTimeLimit - timer;
      var liveDcpm = liveElapsed > 0 ? Math.round(liveDigitsCorrect / Math.max(0.1, liveElapsed / 60)) : 0;

      var feedbackBg = isFixedRun || calmDisplayRun ? 'transparent' : (lastFeedback === 'correct' ? 'rgba(34,197,94,0.15)'
        : lastFeedback === 'wrong' ? 'rgba(239,68,68,0.1)'
        : lastFeedback === 'skip' ? 'rgba(100,116,139,0.08)' : 'transparent');

      return h('div', {
        ref: overlayRef,
        className: 'mf-active-probe fixed inset-0' + (reducedMotion ? ' mf-reduce-motion' : '') + (highContrast ? ' mf-high-contrast' : '') + (calmDisplayRun ? ' mf-calm-display' : ''),
        'data-calm-display': calmDisplayRun ? 'true' : 'false',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': tt('math_fluency.active_probe', 'Active math fluency probe'),
        style: {
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'radial-gradient(circle at 12% 8%, ' + operationPalette.soft + ' 0, transparent 34%), radial-gradient(circle at 88% 92%, #fff7ed 0, transparent 32%), linear-gradient(145deg, #f8fafc 0%, #ffffff 50%, #fffaf0 100%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '16px', transition: 'background 0.3s', backgroundColor: feedbackBg
        }
      },
        // Timer bar + live DCPM ticker
        h('div', { className: 'mf-probe-progress', style: { width: '100%', maxWidth: '28rem', marginBottom: '1.25rem', flexShrink: 0, padding: '11px 12px', borderRadius: '14px', border: '1px solid ' + operationPalette.border, background: 'rgba(255,255,255,0.9)', boxShadow: '0 10px 28px rgba(15,23,42,0.08)', backdropFilter: 'blur(8px)' } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '8px', flexWrap: 'wrap' } },
            h('span', {
              'aria-label': isUntimedRun ? undefined : exactTimeLabel,
              style: { fontSize: '14px', fontWeight: 800, color: isUntimedRun ? '#6d28d9' : (calmDisplayRun ? (isLowTime ? '#b45309' : '#6d28d9') : (isLowTime ? '#dc2626' : '#b45309')), animation: isLowTime && !reducedMotion && !calmDisplayRun ? 'pulse 1s infinite' : 'none' }
            },
              isUntimedRun ? '\uD83C\uDFAF ' + tt('math_fluency.accuracy_focus', 'Accuracy Focus') : (calmDisplayRun ? '\uD83C\uDF3F ' + calmTimeLabel : '\u23f1\ufe0f ' + Math.floor(timer / 60) + ':' + String(timer % 60).padStart(2, '0'))),
            // Live DCPM pill — updates every second as the timer ticks. Low
            // opacity until at least 10s have elapsed so the number isn't
            // noisy at the start of the probe when the sample is tiny.
            isUntimedRun && !practicePaused ? h('button', {
              type: 'button',
              'aria-label': tt('math_fluency.pause_accuracy_focus', 'Pause Accuracy Focus'),
              onClick: pauseAccuracyPractice,
              style: { padding: '4px 9px', borderRadius: '999px', border: '1px solid #c4b5fd', background: '#f5f3ff', color: '#6d28d9', fontSize: '12px', fontWeight: 850, cursor: 'pointer' }
            }, '⏸ ' + tt('math_fluency.pause', 'Pause')) : null,
            !isFixedRun && !isUntimedRun && !calmDisplayRun ? h('span', {
              style: {
                fontSize: '13px', fontWeight: 800,
                padding: '3px 10px', borderRadius: '999px',
                background: 'linear-gradient(90deg,#ede9fe,#e9d5ff)',
                color: '#6d28d9',
                border: '1px solid #c4b5fd',
                opacity: liveElapsed >= 10 ? 1 : 0.45,
                transition: 'opacity 0.4s'
              },
              title: tt('math_fluency.live_dcpm_help', 'Digits-correct per minute, updating live.')
            }, '\uD83D\uDCC8 ' + liveDcpm + ' dcpm') : null,
            !isFixedRun && !calmDisplayRun && runConfigRef.current && runConfigRef.current.adaptivePractice ? h('span', { className: 'mf-adaptive-level', role: 'status', style: { fontSize: '11px', fontWeight: 850, padding: '3px 8px', borderRadius: '999px', background: adaptiveLevel === 'stretch' ? '#dcfce7' : adaptiveLevel === 'support' ? '#fef3c7' : '#eff6ff', color: adaptiveLevel === 'stretch' ? '#166534' : adaptiveLevel === 'support' ? '#92400e' : '#1d4ed8' } }, tt('math_fluency.adaptive_label', 'Adaptive') + ': ' + adaptiveLevel) : null,
            h('span', { style: { fontSize: '14px', fontWeight: 800, color: '#475569' } },
              isFixedRun || calmDisplayRun
                ? '#' + (currentIndex + 1) + ' / ' + problems.length
                : '#' + (currentIndex + 1) + ' \u2022 \u2705 ' + correctCount)
          ),
          h('div', { style: { height: '12px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' } },
            h('div', { role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100,
              'aria-valuenow': Math.round(timerPct),
              'aria-label': isUntimedRun
                ? tt('math_fluency.problem_progress', 'Problem progress: {current} of {total}', { current: currentIndex, total: problems.length })
                : exactTimeLabel, style: {
              height: '100%', borderRadius: '9999px', transition: 'width 1s linear',
              background: isUntimedRun || calmDisplayRun ? 'linear-gradient(to right, #7c3aed, #a78bfa)' : (isLowTime ? 'linear-gradient(to right, #ef4444, #dc2626)' : 'linear-gradient(to right, #f59e0b, #f97316)'),
              width: timerPct + '%'
            } })
          )
        ),
        practicePaused ? h('div', {
          className: 'mf-problem-card mf-practice-pause-card',
          role: 'group',
          'aria-labelledby': 'mf-practice-pause-title',
          'aria-describedby': 'mf-practice-pause-description',
          style: { background: 'linear-gradient(135deg,#f5f3ff,#fff)', borderRadius: '16px', boxShadow: '0 20px 60px rgba(91,33,182,0.14)', border: '2px solid #c4b5fd', padding: '2rem', width: '100%', maxWidth: '28rem', textAlign: 'center' }
        },
          h('div', { 'aria-hidden': 'true', style: { fontSize: '2.5rem', marginBottom: '8px' } }, '⏸'),
          h('div', { id: 'mf-practice-pause-title', style: { color: '#5b21b6', fontWeight: 900, fontSize: '20px' } },
            tt('math_fluency.accuracy_focus_paused_title', 'Accuracy Focus paused')),
          h('p', { id: 'mf-practice-pause-description', style: { color: '#6b21a8', fontSize: '13px', lineHeight: 1.5, margin: '8px auto 16px', maxWidth: '22rem' } },
            tt('math_fluency.pause_mastery_explanation', 'Take the time you need. Paused time will not affect response-time mastery.')),
          h('button', {
            ref: pauseResumeRef,
            type: 'button',
            'aria-label': tt('math_fluency.resume_accuracy_focus', 'Resume Accuracy Focus'),
            onClick: resumeAccuracyPractice,
            style: { padding: '11px 24px', borderRadius: '11px', border: 'none', background: 'linear-gradient(90deg,#7c3aed,#6d28d9)', color: '#fff', fontWeight: 900, fontSize: '15px', cursor: 'pointer', boxShadow: '0 5px 14px rgba(109,40,217,0.25)' }
          }, '▶ ' + tt('math_fluency.resume', 'Resume')),
          h('div', { style: { marginTop: '10px', color: '#7c3aed', fontSize: '11px', fontWeight: 700 } },
            tt('math_fluency.pause_shortcut', 'Keyboard shortcut: P'))
        ) :
        // Problem card
        h('div', { className: 'mf-problem-card', role: 'group', 'data-operation': prob.op,
          'aria-label': tt('math_fluency.problem_of', 'Problem {current} of {total}', { current: currentIndex + 1, total: problems.length }),
          style: {
            background: 'linear-gradient(180deg, #ffffff 0%, ' + operationPalette.soft + ' 180%)', borderRadius: '20px', boxShadow: '0 24px 70px rgba(15,23,42,0.14)', border: '1px solid ' + operationPalette.border, borderTop: '6px solid ' + operationPalette.accent,
            padding: '1.6rem 3rem 2rem', width: '100%', maxWidth: '28rem', textAlign: 'center'
          }
        },
          h('div', { className: 'mf-operation-eyebrow', style: { display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '12px', padding: '5px 10px', borderRadius: '999px', background: operationPalette.soft, border: '1px solid ' + operationPalette.border, color: operationPalette.strong, fontSize: '10px', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase' } },
            h('span', { 'aria-hidden': 'true', style: { width: '7px', height: '7px', borderRadius: '999px', background: operationPalette.accent, boxShadow: '0 0 0 3px ' + operationPalette.soft } }),
            operationPalette.label
          ),
          h('div', { className: 'mf-equation', style: { fontSize: 'clamp(2.7rem, 8vw, 3.7rem)', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: readAloudRun ? '0.75rem' : '1.75rem', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' } },
            h('span', { className: 'mf-equation-number' }, String(prob.a)),
            h('span', { className: 'mf-equation-operator', style: { color: operationPalette.accent } }, ' ' + prob.symbol + ' '),
            h('span', { className: 'mf-equation-number' }, String(prob.b)),
            h('span', { style: { color: '#64748b' } }, ' = ?')
          ),
          readAloudRun ? h('button', {
            type: 'button', className: 'mf-replay-fact',
            'aria-label': tt('math_fluency.replay_spoken_fact', 'Replay spoken math fact'),
            onClick: function () { speakProblem(prob); if (inputRef.current) inputRef.current.focus(); },
            style: { margin: '0 auto 1.25rem', padding: '7px 12px', borderRadius: '999px', border: '1px solid #c4b5fd', background: '#f5f3ff', color: '#5b21b6', fontSize: '12px', fontWeight: 850, cursor: 'pointer' }
          }, '\ud83d\udd0a ' + tt('math_fluency.replay_fact', 'Replay fact')) : null,
          strategyHint ? h('div', {
            className: 'mf-strategy-coach', role: 'status', 'aria-live': 'polite',
            style: { margin: '-8px 0 18px', padding: '12px 14px', borderRadius: '12px', background: strategyHint.reveal ? '#fef2f2' : '#f5f3ff', border: '1px solid ' + (strategyHint.reveal ? '#fca5a5' : '#c4b5fd'), color: strategyHint.reveal ? '#991b1b' : '#5b21b6', textAlign: 'left' }
          },
            h('div', { style: { fontSize: '12px', fontWeight: 900, marginBottom: '4px' } }, '\uD83E\uDDE0 ' + tt('math_fluency.strategy_coach', 'Strategy Coach') + ' \u2022 ' + tr(strategyHint.title)),
            h('div', { style: { fontSize: '13px', lineHeight: 1.45, fontWeight: 650 } }, tr(strategyHint.message)),
            strategyHint.model ? (strategyHint.model.type === 'groups'
              ? h('div', { 'aria-hidden': 'true', style: { display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '9px' } },
                  Array.from({ length: Math.max(1, strategyHint.model.groups || 1) }).map(function (_, i) {
                    return h('span', { key: i, style: { minWidth: '30px', padding: '4px 6px', borderRadius: '7px', background: '#fff', border: '1px solid #c4b5fd', textAlign: 'center', fontSize: '11px', fontWeight: 800 } }, strategyHint.model.perGroup != null ? strategyHint.model.perGroup : '\u25cf');
                  }))
              : h('div', { 'aria-hidden': 'true', style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '9px', fontFamily: 'ui-monospace, monospace', fontWeight: 900 } },
                  h('span', { style: { padding: '4px 8px', background: '#fff', borderRadius: '7px' } }, strategyHint.model.left || strategyHint.model.start),
                  h('span', null, strategyHint.model.direction === 'left' ? '\u2190 ' + strategyHint.model.change : strategyHint.model.direction === 'right' ? '+' + strategyHint.model.change + ' \u2192' : '='),
                  h('span', { style: { padding: '4px 8px', background: '#fff', borderRadius: '7px' } }, strategyHint.model.right != null ? strategyHint.model.right : '?')))
              : null
          ) : null,
          h('form', { noValidate: true, onSubmit: function (e) { e.preventDefault(); submitAnswer(false); } },
            h('input', {
              ref: inputRef, type: 'number', inputMode: 'numeric', step: 1, value: studentInput,
              onChange: function (e) { setStudentInput(e.target.value); if (inputError) setInputError(''); },
              autoFocus: true, 'aria-label': tt('math_fluency.your_answer', 'Your answer'),
              'aria-invalid': inputError ? 'true' : 'false',
              'aria-describedby': inputError ? 'mf-answer-error' : undefined,
              style: {
                width: '156px', textAlign: 'center', fontSize: '2rem', fontWeight: 850, color: '#0f172a',
                border: '2px solid ' + operationPalette.border, borderBottom: '4px solid ' + operationPalette.accent, background: '#fff',
                padding: '10px 12px', margin: '0 auto', display: 'block', borderRadius: '12px', boxShadow: 'inset 0 1px 2px rgba(15,23,42,0.06), 0 6px 18px rgba(15,23,42,0.06)'
              }
            }),
            touchKeypad ? h('div', { className: 'mf-touch-keypad', role: 'group', 'aria-label': tt('math_fluency.answer_keypad', 'Answer keypad'), style: { display: 'grid', gridTemplateColumns: 'repeat(4,minmax(52px,1fr))', gap: '7px', marginTop: '14px' } },
              ['1','2','3','4','5','6','7','8','9','-','0','backspace'].map(function(key) {
                var label = key === 'backspace' ? tt('math_fluency.delete_digit', 'Delete digit') : key === '-' ? tt('math_fluency.toggle_negative', 'Toggle negative') : tt('math_fluency.number_key', 'Number {number}', { number: key });
                return h('button', { key: key, type: 'button', 'aria-label': label,
                  onMouseDown: function(e) { e.preventDefault(); },
                  onClick: function() {
                    if (key === 'backspace') setStudentInput(function(value) { return String(value).slice(0, -1); });
                    else if (key === '-') setStudentInput(function(value) { value = String(value); return value.charAt(0) === '-' ? value.slice(1) : '-' + value; });
                    else setStudentInput(function(value) { return (String(value) + key).slice(0, 8); });
                    setInputError('');
                  },
                  style: { minHeight: '48px', borderRadius: '10px', border: '1px solid ' + (highContrast ? '#000' : '#cbd5e1'), background: highContrast ? '#fff' : '#f8fafc', color: '#0f172a', fontSize: '18px', fontWeight: 900, cursor: 'pointer' }
                }, key === 'backspace' ? '⌫' : key);
              })
            ) : null,
            inputError ? h('div', { id: 'mf-answer-error', role: 'alert', style: { color: '#b91c1c', fontSize: '12px', fontWeight: 700, marginTop: '8px' } }, inputError) : null,
            h('div', { style: { display: 'flex', gap: '12px', marginTop: '1.5rem', justifyContent: 'center' } },
              h('button', {  type: 'submit',
                style: {
                  padding: '12px 32px', background: 'linear-gradient(135deg, ' + operationPalette.accent + ', ' + operationPalette.strong + ')',
                  color: '#fff', fontWeight: 850, borderRadius: '12px', fontSize: '1.05rem',
                  border: 'none', cursor: 'pointer', boxShadow: '0 7px 18px ' + operationPalette.border
                }
              }, tt('math_fluency.enter', 'Enter \u21b5')),
              h('button', { 'aria-label': tt('math_fluency.skip_problem', 'Skip problem'),
                type: 'button', onClick: function () { submitAnswer(true); },
                style: {
                  padding: '12px 24px', background: '#e2e8f0', color: '#64748b',
                  fontWeight: 800, borderRadius: '12px', fontSize: '1.1rem',
                  border: 'none', cursor: 'pointer'
                }
              }, tt('math_fluency.skip_2', 'Skip \u2192'))
            )
          ),
          h('div', { style: { marginTop: '12px', fontSize: '11px', color: '#64748b' } },
            tt('math_fluency.tab_controls_esc_end_early', 'Tab = Next Control \u2022 Esc = End Early') + (isUntimedRun ? ' \u2022 P = Pause' : '') + (!isFixedRun && autoAdvance ? ' \u2022 Auto-advance ON' : '')),
          isFixedRun && interruptionCount > 0 ? h('div', { role: 'status', style: { marginTop: '10px', color: '#b45309', fontSize: '12px', fontWeight: 700 } },
            tt('math_fluency.interrupted_run_notice', 'Interrupted - this run will be saved but excluded from comparable trends.')) : null
        ),
        // End-early safeguard: one accidental click or Escape cannot discard
        // the active flow. The confirmation explains how the partial run is used.
        confirmEndEarly ? h('div', {
          role: 'alertdialog',
          'aria-labelledby': 'mf-end-early-title',
          'aria-describedby': 'mf-end-early-description',
          style: { width: '100%', maxWidth: '28rem', marginTop: '1.25rem', padding: '14px', borderRadius: '14px', background: '#fff7ed', border: '2px solid #fdba74', boxShadow: '0 10px 25px rgba(154,52,18,0.12)' }
        },
          h('div', { id: 'mf-end-early-title', style: { color: '#9a3412', fontWeight: 900, fontSize: '15px' } },
            tt('math_fluency.end_session_question', 'End this session?')),
          h('div', { id: 'mf-end-early-description', style: { color: '#7c2d12', fontSize: '12px', lineHeight: 1.45, marginTop: '4px' } },
            isFixedRun
              ? tt('math_fluency.end_benchmark_explanation', 'Your answered facts will be saved, but this benchmark will be marked incomplete and excluded from progress comparisons.')
              : tt('math_fluency.end_practice_explanation', 'Your answered facts will be saved as an incomplete practice session.')),
          h('div', { style: { display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' } },
            h('button', {
              type: 'button',
              autoFocus: true,
              onClick: function () {
                setConfirmEndEarly(false);
                setTimeout(function () { if (inputRef.current) inputRef.current.focus(); }, 0);
              },
              style: { flex: '1 1 130px', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', color: '#334155', fontWeight: 800, cursor: 'pointer' }
            }, tt('math_fluency.keep_practicing', 'Keep practicing')),
            h('button', {
              type: 'button',
              onClick: function () { finishProbe('early'); },
              style: { flex: '1 1 130px', padding: '9px 12px', borderRadius: '10px', border: '1px solid #c2410c', background: '#c2410c', color: '#fff', fontWeight: 800, cursor: 'pointer' }
            }, tt('math_fluency.end_and_save', 'End & save'))
          )
        ) : h('button', { 'aria-label': tt('math_fluency.end_probe_early', 'End probe early'),
          type: 'button', onClick: function () { setConfirmEndEarly(true); },
          style: { marginTop: '1.5rem', fontSize: '14px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }
        }, tt('math_fluency.end_probe_early', 'End probe early'))
      );
    }

    // ── Results display ──
    if (results && !active) {
      var bm = results.benchmarkResult;
      var ea = results.errorAnalysis;
      var studentReview = buildStudentSessionReview(results);
      var comparisonHistory = history.filter(function (item) {
        return item.comparisonKey && item.comparisonKey === results.comparisonKey
          && item.validForComparison !== false && Number.isFinite(item.dcpm);
      });
      var maxDcpm = Math.max.apply(null, comparisonHistory.map(function (x) { return x.dcpm; }).concat([1]));
      var resultAccuracy = Math.max(0, Math.min(100, Number(results.accuracy) || 0));
      var resultPalette = {
        add: { accent: '#2563eb', strong: '#1d4ed8', soft: '#eff6ff', border: '#93c5fd' },
        sub: { accent: '#7c3aed', strong: '#6d28d9', soft: '#f5f3ff', border: '#c4b5fd' },
        mul: { accent: '#0f766e', strong: '#115e59', soft: '#f0fdfa', border: '#99f6e4' },
        div: { accent: '#d97706', strong: '#b45309', soft: '#fffbeb', border: '#fcd34d' }
      }[results.operation] || { accent: '#475569', strong: '#334155', soft: '#f8fafc', border: '#cbd5e1' };
      var resultModeLabel = results.mode === 'benchmark'
        ? tt('math_fluency.fixed_form_named', 'Fixed Form {form}', { form: results.form || '-' })
        : results.untimed ? tt('math_fluency.accuracy_focus', 'Accuracy Focus') : tt('math_fluency.timed_practice', 'Timed practice');

      return h('div', { className: 'mf-results-panel' + (reducedMotion ? ' mf-reduce-motion' : '') + (highContrast ? ' mf-high-contrast' : ''), role: 'region', 'aria-label': tt('math_fluency.fluency_probe_results', 'Fluency Probe Results'), style: {
          background: highContrast ? '#fff' : 'radial-gradient(circle at 0% 0%, ' + resultPalette.soft + ' 0, transparent 34%), linear-gradient(145deg, #fff, #fffaf0)', borderRadius: '20px',
          border: '1px solid ' + (highContrast ? '#000' : resultPalette.border), borderTop: '6px solid ' + (highContrast ? '#000' : resultPalette.accent), padding: '24px', marginBottom: '24px',
          boxShadow: highContrast ? 'none' : '0 20px 50px rgba(15,23,42,0.1)', animation: 'fadeIn 0.3s ease-out'
        }
      },
        // Header
        h('header', { className: 'mf-results-header', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px' } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 } },
            h('span', { 'aria-hidden': 'true', style: { width: '36px', height: '36px', display: 'grid', placeItems: 'center', flex: '0 0 36px', borderRadius: '11px', background: resultPalette.soft, border: '1px solid ' + resultPalette.border, fontSize: '18px' } }, '\ud83d\udcca'),
            h('div', { style: { minWidth: 0 } },
              h('h3', { style: { fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: 0 } }, tt('math_fluency.fluency_probe_results', 'Fluency Probe Results')),
              h('span', { style: { display: 'inline-flex', marginTop: '4px', padding: '3px 7px', borderRadius: '999px', background: resultPalette.soft, border: '1px solid ' + resultPalette.border, color: resultPalette.strong, fontSize: '9px', fontWeight: 900, letterSpacing: '0.05em', textTransform: 'uppercase' } }, resultModeLabel)
            )
          ),
          h('button', { onClick: function () { setResults(null); }, 'aria-label': tt('math_fluency.close_results', 'Close results'),
            style: { width: '34px', height: '34px', display: 'grid', placeItems: 'center', color: '#475569', cursor: 'pointer', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: 0 }
          }, h(X, { size: 18 }))
        ),

        // Benchmark banner
        h('div', { className: 'mf-results-summary',
          style: {
            background: 'linear-gradient(135deg, ' + bm.color + '10, #fff)', border: '1px solid ' + bm.color + '45',
            borderRadius: '16px', padding: '14px 16px', marginBottom: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap', boxShadow: '0 8px 22px rgba(15,23,42,0.06)'
          }
        },
          h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: '12px', flex: '1 1 230px', minWidth: 0 } },
            h('span', { 'aria-hidden': 'true', style: { width: '42px', height: '42px', display: 'grid', placeItems: 'center', flex: '0 0 42px', borderRadius: '13px', background: '#fff', border: '1px solid ' + bm.color + '35', fontSize: '24px', boxShadow: '0 5px 14px rgba(15,23,42,0.07)' } }, bm.emoji),
            h('div', { style: { minWidth: 0 } },
            h('div', { style: { fontWeight: 800, color: bm.color, fontSize: '14px' } }, bm.label),
            h('div', { style: { fontSize: '12px', color: '#64748b' } },
              !results.validForComparison
                ? (results.untimed && results.completionStatus === 'complete'
                  ? tt('math_fluency.accuracy_focus_result_detail', 'Completed without a countdown or speed score. Accuracy and fact practice are still recorded.')
                  : results.completionStatus === 'interrupted'
                    ? tt('math_fluency.interrupted_result_detail', 'The page was left during this fixed form, so the run is not comparable.')
                    : tt('math_fluency.incomplete_result_detail', 'The probe ended early, so the run is incomplete.'))
                : (results.benchmark.available
                  ? tt('math_fluency.instructional_reference_detail', 'Grade {grade} {season} instructional reference: {target} DCPM', { grade: results.benchmark.grade, season: results.benchmark.season, target: results.benchmark.target })
                  : (results.mode === 'benchmark'
                    ? tt('math_fluency.fixed_form_detail', 'Fixed Form {form} completed for Grade {grade}', { form: results.form || '-', grade: results.grade })
                    : tt('math_fluency.practice_result_detail', 'Practice result for Grade {grade}', { grade: results.grade })))),
            h('div', { style: { fontSize: '10px', color: '#64748b', marginTop: '3px' } },
              results.validForComparison
                ? tt('math_fluency.reference_disclaimer', 'Instructional reference only - not a diagnostic or standardized classification.')
                : results.untimed && results.completionStatus === 'complete'
                  ? tt('math_fluency.accuracy_focus_excluded_detail', 'Accuracy Focus is saved for practice review and excluded from speed trends and instructional references.')
                  : tt('math_fluency.excluded_result_detail', 'Saved for review, but excluded from trends, instructional references, and XP.'))
            )
          ),
          h('div', {
            className: 'mf-accuracy-ring', role: 'img', 'data-accuracy': resultAccuracy,
            'aria-label': tt('math_fluency.accuracy_visual_label', 'Accuracy: {accuracy} percent', { accuracy: resultAccuracy }),
            style: { width: '82px', height: '82px', flex: '0 0 82px', display: 'grid', placeItems: 'center', borderRadius: '50%', background: 'conic-gradient(' + resultPalette.accent + ' ' + resultAccuracy + '%, #e2e8f0 0)', boxShadow: '0 8px 20px rgba(15,23,42,0.12)' }
          },
            h('div', { style: { width: '64px', height: '64px', display: 'grid', placeItems: 'center', borderRadius: '50%', background: '#fff', color: resultPalette.strong, fontSize: '17px', fontWeight: 950, lineHeight: 1 } }, resultAccuracy + '%')
          )
        ),

        // Metrics grid
        h('div', { className: 'mf-results-metrics', style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' } },
          [
            { id: 'speed', icon: '\u26a1', val: results.dcpm == null ? '\u2014' : results.dcpm, label: results.untimed ? tt('math_fluency.speed', 'Speed') : 'DCPM', sub: results.untimed ? tt('math_fluency.not_scored_accuracy_focus', 'Not scored in Accuracy Focus') : tt('math_fluency.digits_correct_min', 'Digits Correct/Min'), color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
            { id: 'accuracy', icon: '\u2713', val: results.accuracy + '%', label: results.strategyCoach ? tt('math_fluency.first_try_accuracy', 'First-Try Accuracy') : tt('math_fluency.accuracy', 'Accuracy'), sub: results.strategyCoach ? tt('math_fluency.attempts_recorded', '{count} attempts recorded', { count: results.totalPracticeAttempts }) : '', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
            { id: 'correct', icon: '#', val: results.totalCorrect + '/' + results.totalAttempted, label: tt('math_fluency.correct', 'Correct'), sub: '', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
            { id: 'digits', icon: '123', val: results.totalDigitsCorrect, label: tt('math_fluency.total_digits', 'Total Digits'), sub: '', color: '#7e22ce', bg: '#faf5ff', border: '#e9d5ff' }
          ].map(function (m, i) {
            return h('div', {
              key: m.id, className: 'mf-metric-card', 'data-metric': m.id,
              style: { position: 'relative', overflow: 'hidden', background: m.bg, borderRadius: '14px', padding: '15px 12px', textAlign: 'center', border: '1px solid ' + m.border, boxShadow: '0 5px 14px rgba(15,23,42,0.05)' }
            },
              h('span', { 'aria-hidden': 'true', style: { position: 'absolute', top: '7px', right: '8px', color: m.color, opacity: 0.2, fontSize: m.id === 'digits' ? '10px' : '15px', fontWeight: 950 } }, m.icon),
              h('div', { style: { fontSize: '1.8rem', fontWeight: 900, color: m.color } }, m.val),
              h('div', { style: { fontSize: '12px', fontWeight: 700, color: '#64748b', marginTop: '4px' } }, m.label),
              m.sub ? h('div', { style: { fontSize: '10px', color: '#64748b' } }, m.sub) : null
            );
          })
        ),

        results.practicePauseCount > 0 ? h('div', {
          className: 'mf-pause-result', role: 'status',
          style: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', padding: '10px 12px', marginBottom: '16px', borderRadius: '11px', border: '1px solid #c4b5fd', background: '#f5f3ff', color: '#5b21b6' }
        },
          h('span', { 'aria-hidden': 'true', style: { fontSize: '18px' } }, '⏸'),
          h('div', { style: { flex: '1 1 180px' } },
            h('strong', { style: { display: 'block', fontSize: '12px' } }, tt('math_fluency.pause_accommodation_used', 'Pause accommodation used')),
            h('span', { style: { display: 'block', marginTop: '2px', fontSize: '10px', lineHeight: 1.4 } },
              tt('math_fluency.pause_result_detail', 'Paused time was excluded from response-time mastery.'))
          ),
          h('span', { style: { padding: '3px 8px', borderRadius: '999px', background: '#fff', border: '1px solid #ddd6fe', fontSize: '10px', fontWeight: 850 } },
            results.practicePauseCount + ' ' + (results.practicePauseCount === 1 ? tt('math_fluency.pause_count_one', 'pause') : tt('math_fluency.pause_count_many', 'pauses')))
        ) : null,

        (results.readAloud || results.calmDisplay || results.touchKeypad || results.reducedMotion || results.highContrast) ? h('div', {
          className: 'mf-supports-used', role: 'status',
          style: { padding: '9px 12px', marginBottom: '16px', borderRadius: '10px', border: '1px solid #bae6fd', background: '#f0f9ff', color: '#075985', fontSize: '11px', lineHeight: 1.45 }
        },
          h('strong', null, tt('math_fluency.learning_supports_used', 'Learning supports used') + ': '),
          [
            results.readAloud ? tt('math_fluency.spoken_facts', 'spoken facts') : null,
            results.calmDisplay ? tt('math_fluency.calm_display', 'calm display') : null,
            results.touchKeypad ? tt('math_fluency.large_touch_keypad', 'large touch keypad') : null,
            results.reducedMotion ? tt('math_fluency.reduced_motion', 'reduced motion') : null,
            results.highContrast ? tt('math_fluency.high_contrast', 'high contrast') : null
          ].filter(Boolean).join(', ')
        ) : null,

        results.resumedFromDraft ? h('div', {
          className: 'mf-recovery-result', role: 'status',
          style: { padding: '9px 12px', marginBottom: '16px', borderRadius: '10px', border: '1px solid #99f6e4', background: '#f0fdfa', color: '#0f766e', fontSize: '11px', fontWeight: 750 }
        }, '↻ ' + tt('math_fluency.recovered_session_completed', 'Recovered session completed. Earlier answers and coached attempts were included.')) : null,

        results.goalResult ? (function () {
          var outcome = results.goalResult;
          var isMet = outcome.status === 'met';
          var isBaseline = outcome.status === 'baseline';
          var palette = isMet ? { bg: '#ecfdf5', border: '#86efac', color: '#166534' }
            : isBaseline ? { bg: '#eff6ff', border: '#93c5fd', color: '#1d4ed8' }
            : outcome.status === 'building' ? { bg: '#fffbeb', border: '#fcd34d', color: '#92400e' }
            : { bg: '#f8fafc', border: '#cbd5e1', color: '#475569' };
          var heading = isMet ? tt('math_fluency.goal_met', 'Goal Met') : isBaseline ? tt('math_fluency.baseline_captured', 'Baseline Captured') : outcome.status === 'building' ? tt('math_fluency.keep_building', 'Keep Building') : tt('math_fluency.goal_not_evaluated', 'Goal Not Evaluated');
          return h('div', { className: 'mf-goal-result', role: 'status', style: { background: palette.bg, border: '1px solid ' + palette.border, borderRadius: '12px', padding: '11px 13px', marginBottom: '16px', color: palette.color } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' } },
              h('strong', { style: { fontSize: '13px' } }, heading),
              h('span', { style: { fontSize: '10px', fontWeight: 800 } }, outcome.goal.label)
            ),
            h('div', { style: { fontSize: '10px', marginTop: '4px' } }, outcome.message),
            outcome.goal.target != null && (outcome.status === 'met' || outcome.status === 'building')
              ? h('div', { role: 'progressbar', 'aria-label': 'Session goal progress', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': outcome.progress, style: { height: '7px', marginTop: '7px', background: '#fff', borderRadius: '999px', overflow: 'hidden' } },
                  h('span', { style: { display: 'block', width: outcome.progress + '%', height: '100%', borderRadius: '999px', background: palette.color } }))
              : null
          );
        })() : null,

        // Error Analysis
        ea.patterns.length > 0 ? h('div', {
          style: { background: '#fff', borderRadius: '12px', padding: '12px 16px', border: '1px solid #fef3c7', marginBottom: '16px' }
        },
          h('div', { style: { fontSize: '12px', fontWeight: 800, color: '#64748b', marginBottom: '8px' } },
            '\ud83d\udd0d ' + tt('math_fluency.error_analysis', 'Error Analysis')),
          ea.patterns.map(function (p, i) {
            return h('div', { key: i, style: { fontSize: '13px', color: '#475569', padding: '4px 0', borderBottom: i < ea.patterns.length - 1 ? '1px solid #f1f5f9' : 'none' } },
              '\u2022 ' + p);
          })
        ) : null,

        // Personalized fact insight turns this result into the next practice step.
        results.factInsights && results.factInsights.length ? (function () {
          var focusRows = results.factInsights.filter(function (item) { return item.correct < item.attempts || item.avgResponseMs > 6000; }).slice(0, 5);
          if (!focusRows.length) return null;
          return h('div', {
            style: { background: '#f5f3ff', borderRadius: '12px', padding: '12px 16px', border: '1px solid #ddd6fe', marginBottom: '16px' },
            'aria-label': tt('math_fluency.next_practice_focus', 'Next practice focus')
          },
            h('div', { style: { fontSize: '12px', fontWeight: 800, color: '#6d28d9', marginBottom: '8px' } }, '\uD83C\uDFAF ' + tt('math_fluency.next_practice_focus', 'Next Practice Focus')),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px' } },
              focusRows.map(function (item) {
                var problem = item.problem;
                var detail = item.correct + '/' + item.attempts + ' correct' + (item.avgResponseMs != null ? ' \u2022 ' + (item.avgResponseMs / 1000).toFixed(1) + 's avg' : '');
                return h('span', { key: item.key, title: detail, style: { padding: '5px 9px', background: '#fff', border: '1px solid #c4b5fd', borderRadius: '8px', color: '#5b21b6', fontSize: '12px', fontWeight: 800, fontFamily: 'ui-monospace, monospace' } }, problem.a + ' ' + problem.symbol + ' ' + problem.b);
              })
            )
          );
        })() : null,

        // DCPM Trend — bar chart per session with a trend delta and personal-best
        // marker so the student immediately sees "am I improving?" instead of
        // having to eyeball raw bars.
        comparisonHistory.length >= 2 ? (function () {
          var prevDcpm = comparisonHistory[comparisonHistory.length - 2].dcpm;
          var curDcpm = comparisonHistory[comparisonHistory.length - 1].dcpm;
          var delta = curDcpm - prevDcpm;
          var avgDcpm = Math.round(comparisonHistory.reduce(function (sum, item) { return sum + item.dcpm; }, 0) / comparisonHistory.length);
          var personalBest = Math.max.apply(null, comparisonHistory.map(function (item) { return item.dcpm; }));
          var avgPct = (avgDcpm / maxDcpm) * 100;
          return h('div', {
            style: { background: '#fff', borderRadius: '12px', padding: '12px', border: '1px solid #fef3c7', marginBottom: '16px' }
          },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' } },
              h('div', { style: { fontSize: '12px', fontWeight: 800, color: '#64748b' } },
                '\ud83d\udcc8 ' + tt('math_fluency.comparable_dcpm_trend', 'Comparable DCPM Trend') + ' (' + comparisonHistory.length + ' ' + tt('math_fluency.sessions', 'sessions') + ')'),
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
                title: tt('math_fluency.average', 'Average: ') + avgDcpm + ' DCPM'
              }),
              h('div', { style: { display: 'flex', alignItems: 'flex-end', gap: '4px', height: '64px', position: 'relative' } },
                comparisonHistory.map(function (hItem, i) {
                  var pct = (hItem.dcpm / maxDcpm) * 100;
                  var isBest = hItem.dcpm === personalBest;
                  var isLatest = i === comparisonHistory.length - 1;
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

        h('section', { className: 'mf-student-review', 'aria-labelledby': 'mf-student-review-title', style: { padding: '12px', marginTop: '4px', borderRadius: '12px', border: '1px solid #bae6fd', background: '#f0f9ff', color: '#0c4a6e' } },
          h('div', { id: 'mf-student-review-title', style: { fontWeight: 900, fontSize: '13px' } }, tt('math_fluency.session_review', 'Your Session Review')),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '8px', marginTop: '8px', fontSize: '10px' } },
            h('div', null, h('strong', null, tt('math_fluency.facts_strengthened', 'Facts strengthened')), h('div', { style: { marginTop: '3px' } }, studentReview.strengthened.length ? studentReview.strengthened.map(function(f) { return f.a + ' ' + f.symbol + ' ' + f.b; }).join(', ') : tt('math_fluency.keep_practicing_to_build', 'Keep practicing to build this list.'))),
            h('div', null, h('strong', null, tt('math_fluency.facts_to_revisit', 'Facts to revisit')), h('div', { style: { marginTop: '3px' } }, studentReview.revisit.length ? studentReview.revisit.map(function(f) { return f.a + ' ' + f.symbol + ' ' + f.b; }).join(', ') : tt('math_fluency.no_priority_facts', 'No priority facts this session.')))
          ),
          h('div', { className: 'mf-recommended-action', style: { marginTop: '9px', paddingTop: '8px', borderTop: '1px solid #bae6fd', fontWeight: 850, fontSize: '11px' } }, tt('math_fluency.recommended_next', 'Recommended next: ') + studentReview.nextLabel)
        ),

        // Actions
        h('div', { style: { display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' } },
          results.focusFacts && results.focusFacts.length ? h('button', {
            'aria-label': tt('math_fluency.practice_missed_facts', 'Practice missed facts'),
            onClick: function () { startFocusedPractice(results.focusFacts); },
            style: { flex: '1 1 180px', padding: '10px', background: 'linear-gradient(to right, #7c3aed, #6d28d9)', color: '#fff', fontWeight: 800, borderRadius: '12px', fontSize: '14px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(109,40,217,0.25)' }
          }, '\uD83C\uDFAF ' + tt('math_fluency.practice_missed_facts', 'Practice Missed Facts') + ' (' + results.focusFacts.length + ')') : null,
          studentReview.nextAction === 'smart-review' ? h('button', {
            type: 'button', 'aria-label': tt('math_fluency.start_smart_review', 'Start Smart Review'), onClick: startSmartReview,
            style: { flex: '1 1 160px', padding: '10px', background: '#0f766e', color: '#fff', fontWeight: 800, borderRadius: '12px', fontSize: '14px', border: 'none', cursor: 'pointer' }
          }, '\uD83E\uDDE0 ' + tt('math_fluency.start_smart_review', 'Start Smart Review')) : null,
          h('button', { 'aria-label': tt('math_fluency.run_again', 'Run again'),
            onClick: startProbe,
            style: {
              flex: 1, padding: '10px', background: 'linear-gradient(to right, #f59e0b, #f97316)',
              color: '#fff', fontWeight: 800, borderRadius: '12px', fontSize: '14px',
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: '0 4px 12px rgba(245,158,11,0.3)'
            }
          }, h(RefreshCw, { size: 14 }), tt('math_fluency.run_again', ' Run Again')),
          history.length > 0 ? (confirmClearHistory ? h('div', {
            role: 'alertdialog',
            'aria-labelledby': 'mf-clear-history-title',
            'aria-describedby': 'mf-clear-history-description',
            style: { flex: '1 0 100%', padding: '12px', borderRadius: '12px', border: '2px solid #fecaca', background: '#fef2f2' }
          },
            h('div', { id: 'mf-clear-history-title', style: { color: '#991b1b', fontWeight: 900 } },
              tt('math_fluency.clear_history_question', 'Clear all session history?')),
            h('div', { id: 'mf-clear-history-description', style: { color: '#7f1d1d', fontSize: '12px', marginTop: '3px' } },
              tt('math_fluency.clear_history_explanation', 'This permanently removes saved session trends. Fact mastery progress is kept.')),
            h('div', { style: { display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' } },
              h('button', {
                type: 'button', autoFocus: true, onClick: function () { setConfirmClearHistory(false); },
                style: { flex: '1 1 120px', padding: '9px', borderRadius: '9px', border: '1px solid #cbd5e1', background: '#fff', color: '#334155', fontWeight: 800, cursor: 'pointer' }
              }, tt('math_fluency.cancel', 'Cancel')),
              h('button', {
                type: 'button',
                onClick: function () {
                  setHistory([]);
                  setConfirmClearHistory(false);
                  if (storageDB) storageDB.set('allo_fluency_history', []).catch(function () {});
                  addToast(tt('math_fluency.probe_history_cleared', 'Probe history cleared'), 'info');
                },
                style: { flex: '1 1 120px', padding: '9px', borderRadius: '9px', border: '1px solid #b91c1c', background: '#b91c1c', color: '#fff', fontWeight: 850, cursor: 'pointer' }
              }, tt('math_fluency.clear_history_confirm', 'Yes, clear history'))
            )
          ) : h('button', { 'aria-label': tt('math_fluency.clear_history', 'Clear History'),
            type: 'button', onClick: function () { setConfirmClearHistory(true); },
            style: {
              padding: '10px 16px', background: '#f1f5f9', color: '#64748b',
              fontWeight: 700, borderRadius: '12px', fontSize: '14px',
              border: 'none', cursor: 'pointer'
            }
          }, tt('math_fluency.clear_history', 'Clear History'))) : null
        )
      );
    }

    // ── Config UI (default state) ──
    // Must match startProbe's resolution, or the readiness check below would
    // green-light a bank the run then fails to find.
    var setupNormalizedGrade = probeGradeOverride || normalizeGrade(gradeLevel);
    var setupGradeBanks = setupNormalizedGrade && window.MATH_PROBE_BANKS ? window.MATH_PROBE_BANKS[setupNormalizedGrade] : null;
    var setupBank = setupGradeBanks ? setupGradeBanks[probeForm] : null;
    var setupBenchmarkReady = probeMode !== 'benchmark' || !!(setupBank && Array.isArray(setupBank.problems) && setupBank.problems.length);
    var setupSupportCount = (reducedMotion ? 1 : 0) + (highContrast ? 1 : 0) + (touchKeypad ? 1 : 0)
      + (calmDisplay ? 1 : 0) + (adaptivePractice && probeMode === 'practice' ? 1 : 0)
      + (readAloud && speechAvailable && probeMode === 'practice' ? 1 : 0);

    function renderSessionReadiness() {
      var operationKey = probeMode === 'benchmark' && setupBank ? (setupBank.operation || 'mixed') : operation;
      var operationLabels = { add: tt('math_fluency.addition', 'Addition'), sub: tt('math_fluency.subtraction', 'Subtraction'), mul: tt('math_fluency.multiplication', 'Multiplication'), div: tt('math_fluency.division', 'Division'), mixed: tt('math_fluency.mixed', 'Mixed') };
      var effectiveCount = probeMode === 'benchmark' && setupBank ? setupBank.problems.length : problemCount;
      var effectiveSeconds = probeMode === 'benchmark' && setupBank ? (Number(setupBank.timeLimit) || 120) : timeLimit;
      var modeLabel = probeMode === 'benchmark'
        ? (setupBenchmarkReady ? tt('math_fluency.fixed_form_named', 'Fixed Form {form}', { form: probeForm }) : tt('math_fluency.fixed_form_unavailable_short', 'Fixed form unavailable'))
        : effectiveSeconds === 0 ? tt('math_fluency.accuracy_focus', 'Accuracy Focus') : tt('math_fluency.timed_practice', 'Timed practice');
      var timeLabel = effectiveSeconds === 0 ? tt('math_fluency.no_countdown', 'No countdown') : effectiveSeconds + ' ' + tt('math_fluency.seconds', 'seconds');
      var countLabel = effectiveCount + ' ' + (effectiveCount === 1 ? tt('math_fluency.fact', 'fact') : tt('math_fluency.facts', 'facts'));
      var supportLabels = [];
      if (calmDisplay) supportLabels.push(tt('math_fluency.calm_display', 'Calm display'));
      if (readAloud && speechAvailable && probeMode === 'practice') supportLabels.push(tt('math_fluency.spoken_facts', 'Spoken facts'));
      if (touchKeypad) supportLabels.push(tt('math_fluency.large_touch_keypad', 'Large touch keypad'));
      if (reducedMotion) supportLabels.push(tt('math_fluency.reduced_motion', 'Reduced motion'));
      if (highContrast) supportLabels.push(tt('math_fluency.high_contrast', 'High contrast'));
      if (adaptivePractice && probeMode === 'practice') supportLabels.push(tt('math_fluency.adaptive_practice', 'Adaptive practice'));
      return h('div', { className: 'mf-session-launch', style: { marginBottom: '14px' } },
        h('section', {
          id: 'mf-session-preview', className: 'mf-session-preview', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true',
          style: { marginBottom: '9px', padding: '11px 12px', borderRadius: '11px', border: '1px solid ' + (setupBenchmarkReady ? '#fdba74' : '#fca5a5'), background: setupBenchmarkReady ? '#fff7ed' : '#fef2f2', color: setupBenchmarkReady ? '#9a3412' : '#991b1b' }
        },
          h('strong', { style: { display: 'block', fontSize: '12px', marginBottom: '7px' } }, setupBenchmarkReady ? tt('math_fluency.ready_to_start', 'Ready to start') : tt('math_fluency.choose_available_form', 'Choose an available form')),
          h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '5px' } },
            [modeLabel, operationLabels[operationKey] || operationKey, countLabel, timeLabel].map(function (label, index) {
              return h('span', { key: index, style: { padding: '4px 7px', borderRadius: '999px', border: '1px solid ' + (setupBenchmarkReady ? '#fed7aa' : '#fecaca'), background: '#fff', fontSize: '10px', fontWeight: 800 } }, label);
            })
          ),
          // A handed-off administration is recorded against a named learner, so
          // the assessor has to be able to see WHO and at WHAT grade before
          // starting. Getting either wrong writes a score to the wrong record.
          probeStudent ? h('div', {
            style: { marginTop: '7px', padding: '5px 8px', borderRadius: '8px', background: '#fff', border: '1px solid #fed7aa', fontSize: '10px', fontWeight: 800, color: '#9a3412' }
          }, tt('math_fluency.recording_for', 'Recording for {student} at grade {grade}', {
            student: probeStudent,
            grade: setupNormalizedGrade || tt('math_fluency.grade_unknown', 'unknown')
          })) : null,
          h('div', { style: { marginTop: '7px', color: '#64748b', fontSize: '10px', lineHeight: 1.4 } },
            supportLabels.length
              ? tt('math_fluency.supports_on', 'Supports on') + ': ' + supportLabels.join(', ')
              : tt('math_fluency.standard_display_and_controls', 'Standard display and controls'))
        ),
        h('button', {
          'aria-label': probeMode === 'benchmark' ? tt('math_fluency.start_fixed_form', 'Start fixed form') : tt('math_fluency.start_practice', 'Start practice'),
          'aria-describedby': 'mf-session-preview', disabled: !setupBenchmarkReady, onClick: startProbe,
          style: {
            width: '100%', padding: '10px', background: setupBenchmarkReady ? 'linear-gradient(to right, #f59e0b, #f97316)' : '#cbd5e1',
            color: setupBenchmarkReady ? '#fff' : '#475569', fontWeight: 800, borderRadius: '12px', fontSize: '14px',
            border: 'none', cursor: setupBenchmarkReady ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            boxShadow: setupBenchmarkReady ? '0 4px 15px rgba(245,158,11,0.3)' : 'none'
          }
        }, h(Play, { size: 16 }), !setupBenchmarkReady
          ? tt('math_fluency.fixed_form_unavailable_short', 'Fixed Form Unavailable')
          : probeMode === 'benchmark'
            ? tt('math_fluency.start_fixed_form_named', 'Start Fixed Form {form}', { form: probeForm })
            : timeLimit === 0
              ? tt('math_fluency.start_accuracy_focus', 'Start Accuracy Focus')
              : tt('math_fluency.start_timed_practice', 'Start {seconds}-Second Practice', { seconds: timeLimit })),
        h('p', { style: { fontSize: '11px', color: 'rgba(146,64,14,0.72)', textAlign: 'center', margin: '8px 0 0' } },
          probeMode === 'benchmark'
            ? tt('math_fluency.fixed_forms_comparable', 'Fixed forms preserve timing and problem order for comparable repeated checks.')
            : timeLimit === 0
              ? tt('math_fluency.accuracy_focus_launch_detail', 'Accuracy Focus records first-try accuracy without a speed score.')
              : tt('math_fluency.timed_practice_launch_detail', 'Timed practice records accuracy and Digits Correct Per Minute (DCPM).'))
      );
    }

    return h('div', { className: 'mf-fluency-setup ' + (reducedMotion ? 'mf-reduce-motion ' : '') + (highContrast ? 'mf-high-contrast' : ''), style: {
        padding: '16px', background: highContrast ? '#fff' : 'radial-gradient(circle at 0% 0%, #fff7ed 0, transparent 34%), linear-gradient(145deg, #fffbeb, #fff 58%, #fef3c7)',
        borderRadius: '18px', border: '1px solid ' + (highContrast ? '#000' : '#fed7aa'), boxShadow: highContrast ? 'none' : '0 16px 40px rgba(146,64,14,0.09)'
      }
    },
      h('style', null, '.mf-teacher-report{background:#fff;border:1px solid #93c5fd;border-top:0;border-radius:0 0 10px 10px;padding:12px;margin-bottom:8px}.mf-teacher-report-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}.mf-teacher-report-actions{display:flex;gap:5px}.mf-teacher-report-actions button,.mf-teacher-report-chips button{border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;border-radius:7px;padding:5px 7px;font-size:10px;font-weight:750;cursor:pointer}.mf-teacher-report-filters{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:10px}.mf-teacher-report-metrics{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;margin-top:10px}.mf-teacher-report-metrics>div{background:#eff6ff;border-radius:8px;padding:8px;text-align:center}.mf-teacher-report-metrics strong{display:block;color:#1e3a8a;font-size:16px}.mf-teacher-report-metrics span{display:block;color:#64748b;font-size:9px}.mf-next-best-step{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px;padding:10px 12px;border:1px solid #99f6e4;border-radius:10px;background:linear-gradient(135deg,#f0fdfa,#ecfeff)}.mf-next-best-step button{flex:0 0 auto;border:1px solid #14b8a6;background:#0f766e;color:#fff;border-radius:8px;padding:7px 9px;font-size:10px;font-weight:850;cursor:pointer}.mf-operation-growth-wrap{margin-top:12px}.mf-operation-growth-table th[scope=row]{color:#1e3a8a}.mf-teacher-report-targets{margin-top:10px;color:#334155;font-size:10px}.mf-teacher-report-targets p{margin:5px 0 0;color:#64748b}.mf-teacher-report-chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}.mf-teacher-report-maze{display:flex;flex-wrap:wrap;gap:10px;margin-top:10px;padding:7px;border-radius:8px;background:#fffbeb;color:#92400e;font-size:10px;font-weight:750}.mf-teacher-report-table-wrap{overflow-x:auto;margin-top:10px}.mf-teacher-report-table{width:100%;border-collapse:collapse;font-size:10px}.mf-teacher-report-table caption{text-align:left;font-weight:800;color:#334155;padding:0 0 5px}.mf-teacher-report-table th,.mf-teacher-report-table td{text-align:left;padding:5px;border-bottom:1px solid #e2e8f0;white-space:nowrap}.mf-teacher-report-table th{color:#475569}.mf-teacher-report-table td{color:#334155}@media(max-width:520px){.mf-session-goal-picker{grid-template-columns:1fr!important}.mf-next-best-step{display:grid}.mf-next-best-step button{width:100%}.mf-teacher-report-heading{display:grid}.mf-teacher-report-filters{grid-template-columns:1fr}.mf-teacher-report-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}@media print{body *{visibility:hidden!important}.mf-teacher-report,.mf-teacher-report *{visibility:visible!important}.mf-teacher-report{position:absolute;left:0;top:0;width:100%;border:0}.mf-teacher-report-actions{display:none!important}}'),
      // Header
      h('header', { className: 'mf-fluency-hero', style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '14px', padding: '14px', borderRadius: '14px', background: highContrast ? '#fff' : 'linear-gradient(135deg,#7c2d12 0%,#b45309 54%,#d97706 100%)', border: '1px solid ' + (highContrast ? '#000' : '#f59e0b'), color: highContrast ? '#000' : '#fff', boxShadow: highContrast ? 'none' : '0 10px 24px rgba(146,64,14,0.2)' } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '11px', minWidth: 0 } },
          h('div', { 'aria-hidden': 'true', style: { width: '38px', height: '38px', flex: '0 0 38px', display: 'grid', placeItems: 'center', borderRadius: '11px', background: highContrast ? '#fff' : 'rgba(255,255,255,0.16)', border: '1px solid ' + (highContrast ? '#000' : 'rgba(255,255,255,0.3)') } }, h(Zap, { size: 19 })),
          h('div', { style: { minWidth: 0 } },
            h('h2', { style: { margin: 0, fontWeight: 900, fontSize: '16px', lineHeight: 1.2, color: 'inherit' } }, tt('math_fluency.math_fluency_probe_2', 'Math Fluency Probe')),
            h('p', { style: { margin: '3px 0 0', fontSize: '10px', lineHeight: 1.35, color: highContrast ? '#000' : 'rgba(255,255,255,0.82)' } }, tt('math_fluency.fluency_hero_subtitle', 'Build accuracy, confidence, and efficient recall - one fact at a time.'))
          )
        ),
        h('div', { className: 'mf-fluency-hero-controls', 'aria-expanded': String(soundEnabled), style: { display: 'flex', gap: '6px' } },
          h('button', { 'aria-expanded': String(soundEnabled),
            onClick: function () { setSoundEnabled(!soundEnabled); },
            title: soundEnabled ? tt('math_fluency.mute_sounds', 'Mute sounds') : tt('math_fluency.enable_sounds', 'Enable sounds'),
            'aria-label': soundEnabled ? tt('math_fluency.mute_sound_effects', 'Mute sound effects') : tt('math_fluency.enable_sound_effects', 'Enable sound effects'),
            style: { minWidth: '38px', minHeight: '34px', padding: '5px 9px', borderRadius: '9px', border: '1px solid ' + (highContrast ? '#000' : 'rgba(255,255,255,0.4)'), background: highContrast ? '#fff' : 'rgba(255,255,255,0.14)', color: highContrast ? '#000' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
          }, soundEnabled ? h(Volume2, { size: 14 }) : h(VolumeX, { size: 14 })),
          h('button', { 'aria-expanded': String(autoAdvance && probeMode !== 'benchmark'),
            disabled: probeMode === 'benchmark',
            'aria-disabled': probeMode === 'benchmark' ? 'true' : 'false',
            onClick: function () { if (probeMode !== 'benchmark') setAutoAdvance(!autoAdvance); },
            title: probeMode === 'benchmark'
              ? tt('math_fluency.auto_advance_unavailable_fixed', 'Auto-advance is unavailable for fixed comparable forms.')
              : (autoAdvance ? tt('math_fluency.disable_auto_advance', 'Disable auto-advance') : tt('math_fluency.enable_auto_advance_moves_to_next_on_cor', 'Enable auto-advance (moves to next on correct answer)')),
            'aria-label': probeMode === 'benchmark'
              ? tt('math_fluency.auto_advance_unavailable_fixed', 'Auto-advance is unavailable for fixed comparable forms.')
              : (autoAdvance ? tt('math_fluency.disable_auto_advance', 'Disable auto-advance') : tt('math_fluency.enable_auto_advance', 'Enable auto-advance')),
            style: {
              padding: '4px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: probeMode === 'benchmark' ? 'not-allowed' : 'pointer',
              border: '1px solid ' + (highContrast ? '#000' : (autoAdvance && probeMode !== 'benchmark' ? '#bbf7d0' : 'rgba(255,255,255,0.4)')),
              background: highContrast ? '#fff' : (autoAdvance && probeMode !== 'benchmark' ? 'rgba(220,252,231,0.95)' : 'rgba(255,255,255,0.14)'),
              color: highContrast ? '#000' : (autoAdvance && probeMode !== 'benchmark' ? '#166534' : '#fff'),
              opacity: probeMode === 'benchmark' ? 0.55 : 1
            }
          }, '\u26a1 Auto')
        )
      ),

      accuracyDraft ? h('section', {
        className: 'mf-resume-session-card', role: 'region',
        'aria-labelledby': 'mf-resume-session-title',
        style: { marginBottom: '12px', padding: '12px', borderRadius: '12px', border: '2px solid #a78bfa', background: 'linear-gradient(135deg,#f5f3ff,#faf5ff)', color: '#5b21b6' }
      },
        h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: '9px' } },
          h('span', { 'aria-hidden': 'true', style: { fontSize: '20px' } }, '↻'),
          h('div', { style: { flex: 1 } },
            h('div', { id: 'mf-resume-session-title', style: { fontSize: '13px', fontWeight: 900 } }, tt('math_fluency.continue_accuracy_focus', 'Continue Accuracy Focus?')),
            h('div', { style: { marginTop: '3px', color: '#6b21a8', fontSize: '11px', lineHeight: 1.4 } },
              tt('math_fluency.saved_progress_summary', '{completed} of {total} completed. Your answered facts and coached attempts are saved.', { completed: accuracyDraft.currentIndex, total: accuracyDraft.problems.length })),
            h('div', { style: { marginTop: '3px', color: '#7c3aed', fontSize: '10px' } },
              tt('math_fluency.new_session_replaces_draft', 'Starting another session replaces this saved draft.'))
          )
        ),
        h('div', { style: { display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' } },
          h('button', {
            type: 'button', 'aria-label': tt('math_fluency.resume_saved_accuracy_focus', 'Resume saved Accuracy Focus'), onClick: resumeSavedAccuracyFocus,
            style: { flex: '1 1 150px', padding: '9px 12px', border: 'none', borderRadius: '9px', background: '#7c3aed', color: '#fff', fontWeight: 850, cursor: 'pointer' }
          }, '▶ ' + tt('math_fluency.resume_session', 'Resume Session')),
          h('button', {
            type: 'button', 'aria-label': tt('math_fluency.discard_saved_session', 'Discard saved session'), onClick: discardSavedAccuracyFocus,
            style: { flex: '1 1 120px', padding: '9px 12px', border: '1px solid #c4b5fd', borderRadius: '9px', background: '#fff', color: '#6d28d9', fontWeight: 800, cursor: 'pointer' }
          }, tt('math_fluency.discard', 'Discard'))
        )
      ) : null,

      h('details', { className: 'mf-learning-supports', 'data-active-count': setupSupportCount, style: { marginBottom: '12px', padding: '9px 10px', borderRadius: '10px', border: '1px solid #cbd5e1', background: highContrast ? '#fff' : '#f8fafc' } },
        h('summary', { style: { cursor: 'pointer', fontSize: '11px', fontWeight: 900, color: '#334155' } },
          tt('math_fluency.learning_supports', 'Learning Supports') + ' \u2022 ' + setupSupportCount + ' ' + tt('math_fluency.on', 'on')),
        h('p', { style: { margin: '7px 0', color: '#64748b', fontSize: '10px', lineHeight: 1.4 } },
          tt('math_fluency.supports_persist', 'These preferences stay on for future Math Fluency sessions.')),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '6px' } },
          [
            { key: 'reducedMotion', value: reducedMotion, label: tt('math_fluency.reduced_motion', 'Reduced motion') },
            { key: 'highContrast', value: highContrast, label: tt('math_fluency.high_contrast', 'High contrast') },
            { key: 'touchKeypad', value: touchKeypad, label: tt('math_fluency.large_touch_keypad', 'Large touch keypad') },
            { key: 'adaptivePractice', value: adaptivePractice, label: tt('math_fluency.adaptive_practice', 'Adaptive practice'), disabled: probeMode === 'benchmark' },
            { key: 'readAloud', value: readAloud, label: tt('math_fluency.read_facts_aloud', 'Read facts aloud'), disabled: probeMode === 'benchmark' || !speechAvailable, title: probeMode === 'benchmark' ? tt('math_fluency.read_aloud_practice_only', 'Read-aloud is available in practice only.') : (!speechAvailable ? tt('math_fluency.speech_unavailable', 'Spoken facts are unavailable in this browser.') : undefined) },
            { key: 'calmDisplay', value: calmDisplay, label: tt('math_fluency.calm_display', 'Calm display') }
          ].map(function(item) { return h('label', { key: item.key, title: item.title, style: { display: 'flex', alignItems: 'center', gap: '6px', padding: '6px', borderRadius: '7px', background: '#fff', color: '#334155', fontSize: '10px', fontWeight: 750, opacity: item.disabled ? 0.55 : 1 } },
            h('input', { type: 'checkbox', checked: item.value, disabled: item.disabled, 'aria-label': item.label, onChange: function() { updateSupportPreference(item.key, !item.value); } }), item.label);
          })
        )
      ),

      // Config grid
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', margin: '2px 0 8px', color: '#9a3412' } },
        h('span', { 'aria-hidden': 'true', style: { width: '22px', height: '22px', display: 'grid', placeItems: 'center', borderRadius: '999px', background: '#ffedd5', border: '1px solid #fdba74', fontSize: '10px', fontWeight: 900 } }, '1'),
        h('strong', { style: { fontSize: '12px' } }, tt('math_fluency.choose_your_session', 'Choose your session'))
      ),
      h('div', { className: 'mf-config-grid', style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '12px', padding: '12px', borderRadius: '13px', border: '1px solid #fed7aa', background: 'rgba(255,255,255,0.9)', boxShadow: '0 8px 20px rgba(146,64,14,0.06)' } },
        h('div', null,
          h('label', { style: { display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px', fontWeight: 600 } }, tt('math_fluency.probe_mode', 'Probe Mode')),
          h('select', {
            value: probeMode, onChange: function (e) { setProbeMode(e.target.value); },
            'aria-label': tt('math_fluency.probe_mode', 'Probe Mode'),
            style: { width: '100%', fontSize: '12px', padding: '6px 8px', borderRadius: '8px', border: '1px solid #d1d5db' }
          },
            h('option', { value: 'practice' }, tt('math_fluency.practice_mode', 'Practice - Custom Settings')),
            h('option', { value: 'benchmark' }, tt('math_fluency.fixed_form_mode', 'Fixed Comparable Form'))
          )
        ),
        h('div', null,
          h('label', { style: { display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px', fontWeight: 600 } }, tt('math_fluency.form', 'Form')),
          h('select', {
            value: probeForm, onChange: function (e) { setProbeForm(e.target.value); }, disabled: probeMode !== 'benchmark',
            'aria-label': tt('math_fluency.fixed_probe_form', 'Fixed probe form'),
            style: { width: '100%', fontSize: '12px', padding: '6px 8px', borderRadius: '8px', border: '1px solid #d1d5db', opacity: probeMode === 'benchmark' ? 1 : 0.55 }
          },
            h('option', { value: 'A' }, 'Form A'), h('option', { value: 'B' }, 'Form B'), h('option', { value: 'C' }, 'Form C')
          )
        ),
        // Operation
        h('div', null,
          h('label', { style: { display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px', fontWeight: 600 } }, tt('math_fluency.operation', 'Operation')),
          h('select', {
            value: operation, onChange: function (e) { setOperation(e.target.value); setDifficulty('recommended'); }, disabled: probeMode === 'benchmark',
            'aria-label': tt('math_fluency.math_operation', 'Math operation'),
            style: { width: '100%', fontSize: '12px', padding: '6px 8px', borderRadius: '8px', border: '1px solid #d1d5db' }
          },
            h('option', { value: 'add' }, tt('math_fluency.addition_2', '\u2795 Addition')),
            h('option', { value: 'sub' }, tt('math_fluency.subtraction_2', '\u2796 Subtraction')),
            h('option', { value: 'mul' }, tt('math_fluency.multiplication_2', '\u2716\ufe0f Multiplication')),
            h('option', { value: 'div' }, tt('math_fluency.division_2', '\u2797 Division')),
            h('option', { value: 'mixed' }, tt('math_fluency.mixed', '\ud83d\udd00 Mixed'))
          )
        ),
        // Grade-aligned practice set. Fixed benchmark forms keep their bank metadata.
        h('div', null,
          h('label', { style: { display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px', fontWeight: 600 } }, tt('math_fluency.practice_set', 'Practice Set')),
          h('select', {
            value: difficulty, onChange: function (e) { setDifficulty(e.target.value); }, disabled: probeMode === 'benchmark',
            'aria-label': tt('math_fluency.practice_set', 'Practice Set'),
            style: { width: '100%', fontSize: '12px', padding: '6px 8px', borderRadius: '8px', border: '1px solid #d1d5db' }
          },
            getPracticeSetOptions(operation, gradeLevel).map(function (option) {
              return h('option', { key: option.value, value: option.value }, tr(option.label));
            })
          )
        ),
        // Timer
        h('div', null,
          h('label', { style: { display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px', fontWeight: 600 } }, tt('math_fluency.timer', 'Timer')),
          h('select', {
            value: timeLimit, onChange: function (e) { setTimeLimit(parseInt(e.target.value)); }, disabled: probeMode === 'benchmark',
            'aria-label': tt('math_fluency.time_limit', 'Time limit'),
            style: { width: '100%', fontSize: '12px', padding: '6px 8px', borderRadius: '8px', border: '1px solid #d1d5db' }
          },
            h('option', { value: 0 }, tt('math_fluency.untimed_accuracy_focus', 'Untimed (Accuracy Focus)')),
            h('option', { value: 60 }, tt('math_fluency.60_seconds', '60 seconds')),
            h('option', { value: 120 }, tt('math_fluency.120_seconds', '120 seconds')),
            h('option', { value: 180 }, tt('math_fluency.180_seconds', '180 seconds'))
          )
        ),
        // Problem count
        h('div', null,
          h('label', { style: { display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px', fontWeight: 600 } }, tt('math_fluency.of_problems', '# of Problems')),
          h('select', {
            value: problemCount, onChange: function (e) { setProblemCount(parseInt(e.target.value)); }, disabled: probeMode === 'benchmark',
            'aria-label': tt('math_fluency.number_of_problems', 'Number of problems'),
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

      // Mode summary and instructional reference preview
      (function () {
        var normalized = setupNormalizedGrade;
        var bank = setupBank;
        var reference = getBenchmark(gradeLevel, operation);
        var text;
        if (probeMode === 'benchmark') {
          text = bank
            ? tt('math_fluency.fixed_form_summary', 'Fixed Form {form}: {count} grade-aligned problems, {seconds} seconds. Settings are locked for comparability.', { form: probeForm, count: bank.problems.length, seconds: bank.timeLimit || 120 })
            : tt('math_fluency.fixed_form_unavailable_summary', 'No fixed form is available for this grade. Choose Practice mode.');
        } else if (timeLimit === 0) {
          text = tr(describePracticeSet(gradeLevel, operation, difficulty)) + ' ' + tt('math_fluency.accuracy_focus_summary', 'Accuracy Focus removes the countdown and speed score, adds graduated Strategy Coach support after errors, and preserves personalized fact practice.');
        } else if (reference.available) {
          text = tr(describePracticeSet(gradeLevel, operation, difficulty)) + ' ' + tt('math_fluency.instructional_reference_summary', 'Grade {grade} {season} instructional reference: {target} DCPM. Descriptive only - not diagnostic.', { grade: reference.grade, season: reference.season, target: reference.target });
        } else {
          text = tr(describePracticeSet(gradeLevel, operation, difficulty)) + ' ' + tt('math_fluency.no_reference_summary', 'Practice score only. No instructional reference is available for this grade or operation.');
        }
        return h('div', { role: 'note', style: { background: '#fff', borderRadius: '8px', padding: '8px 12px', marginBottom: '12px', border: '1px solid #fef3c7', fontSize: '12px', color: '#64748b' } }, text);
      })(),

      (function () {
        var speedDisabled = timeLimit === 0;
        var goalReference = getBenchmark(gradeLevel, operation);
        var goalDescription = sessionGoal === 'accuracy-80' ? 'Aim for at least 80% correct.'
          : sessionGoal === 'accuracy-90' ? 'Aim for at least 90% correct.'
          : sessionGoal === 'accuracy-100' ? 'Aim for every attempted fact correct.'
          : sessionGoal === 'personal-best' ? 'Beat the best score from matching comparable settings.'
          : sessionGoal === 'instructional-reference' ? 'Use the descriptive grade-and-season reference as a target.'
          : 'Practice without a session goal.';
        return h('div', { className: 'mf-session-goal-picker', style: { display: 'grid', gridTemplateColumns: 'minmax(110px, 0.45fr) minmax(0, 1fr)', gap: '9px', alignItems: 'center', background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '10px', padding: '9px 10px', marginBottom: '12px' } },
          h('label', { style: { display: 'grid', gap: '3px', color: '#0f766e', fontSize: '10px', fontWeight: 850 } },
            tt('math_fluency.session_goal', 'Session Goal'),
            h('select', { value: sessionGoal, onChange: function (e) { setSessionGoal(e.target.value); }, 'aria-label': tt('math_fluency.session_goal', 'Session goal'), style: { width: '100%', minWidth: 0, border: '1px solid #5eead4', borderRadius: '7px', background: '#fff', padding: '6px', color: '#134e4a', fontSize: '11px' } },
              h('option', { value: 'accuracy-80' }, '80% accuracy'),
              h('option', { value: 'accuracy-90' }, '90% accuracy'),
              h('option', { value: 'accuracy-100' }, '100% accuracy'),
              h('option', { value: 'personal-best', disabled: speedDisabled }, 'Beat comparable personal best'),
              h('option', { value: 'instructional-reference', disabled: speedDisabled || !goalReference.available }, 'Reach instructional reference'),
              h('option', { value: 'none' }, 'No goal')
            )
          ),
          h('div', { role: 'note', style: { color: '#475569', fontSize: '10px', lineHeight: 1.35 } }, goalDescription,
            speedDisabled ? h('span', { style: { display: 'block', marginTop: '3px', color: '#7c3aed', fontWeight: 750 } }, 'Accuracy Focus supports accuracy goals only.') : null)
        );
      })(),

      renderSessionReadiness(),

      h('div', { role: 'separator', 'aria-label': tt('math_fluency.personalized_insights', 'Personalized insights'), style: { display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0 10px', color: '#64748b', fontSize: '10px', fontWeight: 850, textTransform: 'uppercase', letterSpacing: '0.06em' } },
        h('span', { style: { height: '1px', flex: 1, background: '#fed7aa' } }),
        tt('math_fluency.personalized_insights', 'Personalized insights'),
        h('span', { style: { height: '1px', flex: 1, background: '#fed7aa' } })
      ),

      // Visual mastery dashboard: persistent categories are clickable practice sets.
      (function () {
        var dashboard = buildFactMasteryDashboard(factMastery);
        var reviewSchedule = buildReviewSchedule(factMastery, new Date());
        if (probeMode !== 'practice' || !dashboard.totalFacts) return null;
        var colors = {
          secure: { bg: '#dcfce7', border: '#86efac', color: '#166534', icon: '\u2705' },
          developing: { bg: '#fef3c7', border: '#fcd34d', color: '#92400e', icon: '\uD83C\uDF31' },
          slow: { bg: '#e0f2fe', border: '#7dd3fc', color: '#075985', icon: '\u23F1\uFE0F' },
          focus: { bg: '#fee2e2', border: '#fca5a5', color: '#991b1b', icon: '\uD83C\uDFAF' }
        };
        var opLabels = { add: tt('math_fluency.addition', 'Addition'), sub: tt('math_fluency.subtraction', 'Subtraction'), mul: tt('math_fluency.multiplication', 'Multiplication'), div: tt('math_fluency.division', 'Division') };
        return h('details', { className: 'mf-mastery-map', style: { background: '#fff', border: '1px solid #ddd6fe', borderRadius: '12px', padding: '10px 12px', marginBottom: '12px' } },
          h('summary', { style: { cursor: 'pointer', color: '#5b21b6', fontSize: '12px', fontWeight: 900 } }, '\uD83D\uDDFA\uFE0F ' + tt('math_fluency.fact_mastery_map', 'Fact Mastery Map') + ' \u2022 ' + dashboard.totalFacts + ' facts \u2022 ' + dashboard.overallAccuracy + '%'),
          reviewSchedule.dueCount
            ? h('button', {
                type: 'button', onClick: startSmartReview,
                'aria-label': tt('math_fluency.start_smart_review', 'Start Smart Review') + ': ' + reviewSchedule.dueCount + ' facts due',
                style: { width: '100%', padding: '10px 12px', marginTop: '10px', borderRadius: '10px', border: '1px solid #8b5cf6', background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)', color: '#5b21b6', cursor: 'pointer', textAlign: 'left' }
              },
                h('strong', { style: { display: 'block', fontSize: '13px' } }, 'Smart Review - ' + reviewSchedule.dueCount + ' ' + tt('math_fluency.due', 'due')),
                h('span', { style: { display: 'block', marginTop: '3px', fontSize: '10px', color: '#6d28d9' } }, '60% needs practice | 25% developing | 15% retrieval refresh')
              )
            : h('div', { role: 'status', style: { marginTop: '10px', padding: '8px 10px', borderRadius: '9px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', fontSize: '11px', fontWeight: 750 } },
                'All caught up' + (reviewSchedule.nextDueDays ? ' - next refresh in ' + reviewSchedule.nextDueDays + ' day' + (reviewSchedule.nextDueDays === 1 ? '' : 's') : '')),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '7px', marginTop: '10px' } },
            dashboard.categoryOrder.map(function (id) {
              var category = dashboard.categories[id], palette = colors[id];
              return h('button', {
                key: id, type: 'button', disabled: !category.count,
                onClick: function () { if (category.count) startFocusedPractice(category.facts.slice(0, 12)); },
                'aria-label': tr(category.label) + ': ' + category.count + ' facts. Start focused practice.',
                style: { padding: '9px 8px', borderRadius: '9px', background: palette.bg, border: '1px solid ' + palette.border, color: palette.color, cursor: category.count ? 'pointer' : 'default', opacity: category.count ? 1 : 0.5, textAlign: 'left' }
              },
                h('span', { 'aria-hidden': 'true', style: { marginRight: '5px' } }, palette.icon),
                h('span', { style: { fontSize: '11px', fontWeight: 850 } }, tr(category.label)),
                h('strong', { style: { float: 'right', fontSize: '14px' } }, String(category.count))
              );
            })
          ),
          h('div', { style: { display: 'grid', gap: '5px', marginTop: '10px' } },
            Object.keys(dashboard.operations).map(function (op) {
              var row = dashboard.operations[op];
              if (!row.total) return null;
              var pct = Math.round((row.secure / row.total) * 100);
              return h('div', { key: op, style: { display: 'grid', gridTemplateColumns: '82px 1fr 48px', gap: '7px', alignItems: 'center', fontSize: '10px', color: '#64748b' } },
                h('span', { style: { fontWeight: 750 } }, opLabels[op]),
                h('span', { style: { height: '7px', borderRadius: '999px', background: '#ede9fe', overflow: 'hidden' } }, h('span', { style: { display: 'block', height: '100%', width: pct + '%', background: '#22c55e' } })),
                h('span', null, row.secure + '/' + row.total)
              );
            })
          )
        );
      })(),

      (function () {
        if (probeMode !== 'practice') return null;
        var recommendation = buildNextPracticeRecommendation(factMastery, history, new Date());
        if (!recommendation) return null;
        return h('div', { className: 'mf-next-best-step', role: 'region', 'aria-label': tt('math_fluency.next_best_step', 'Next Best Step') },
          h('div', null,
            h('span', { style: { display: 'block', color: '#0f766e', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em' } }, tt('math_fluency.next_best_step', 'Next Best Step')),
            h('strong', { style: { display: 'block', color: '#134e4a', fontSize: '13px', marginTop: '2px' } }, recommendation.title),
            h('span', { style: { display: 'block', color: '#475569', fontSize: '10px', marginTop: '3px' } }, recommendation.rationale)
          ),
          h('button', {
            type: 'button',
            onClick: function () { recommendation.action === 'smart-review' ? startSmartReview() : startFocusedPractice(recommendation.facts); },
            'aria-label': 'Start recommended ' + recommendation.label + ' practice'
          }, recommendation.action === 'smart-review' ? 'Start Smart Review' : 'Practice ' + recommendation.label)
        );
      })(),

      h('button', {
        type: 'button', onClick: function () { setShowTeacherReport(!showTeacherReport); },
        'aria-expanded': showTeacherReport, 'aria-controls': 'mf-teacher-report',
        style: { width: '100%', padding: '9px', marginBottom: showTeacherReport ? '0' : '8px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #93c5fd', borderRadius: showTeacherReport ? '10px 10px 0 0' : '10px', fontSize: '12px', fontWeight: 850, cursor: 'pointer' }
      }, 'Teacher Report - ' + (showTeacherReport ? 'Hide' : 'Show')),
      showTeacherReport && (function () {
        var report = getTeacherReport();
        var metricCards = [
          { label: 'Sessions', value: report.sessionCount },
          { label: 'Avg Accuracy', value: report.avgAccuracy == null ? 'N/A' : report.avgAccuracy + '%' },
          { label: 'Latest DCPM', value: report.latestDcpm == null ? 'N/A' : report.latestDcpm },
          { label: 'Facts Due', value: report.reviewSchedule.dueCount },
          { label: 'Goals Met', value: report.goalRate == null ? 'N/A' : report.goalRate + '%' }
        ];
        function filterSelect(label, value, onChange, options) {
          return h('label', { style: { display: 'grid', gap: '3px', fontSize: '10px', color: '#475569', fontWeight: 750 } },
            label,
            h('select', { value: value, onChange: onChange, style: { minWidth: 0, width: '100%', padding: '6px', borderRadius: '7px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '11px' } },
              options.map(function (option) { return h('option', { key: option.value, value: option.value }, option.label); })
            )
          );
        }
        return h('section', { id: 'mf-teacher-report', className: 'mf-teacher-report', role: 'region', 'aria-label': tt('math_fluency.teacher_report_center', 'Teacher Report Center') },
          h('div', { className: 'mf-teacher-report-heading' },
            h('div', null,
              h('strong', { style: { display: 'block', color: '#1e3a8a', fontSize: '13px' } }, tt('math_fluency.teacher_report_center', 'Teacher Report Center')),
              h('span', { style: { color: '#64748b', fontSize: '10px' } }, 'Grade ' + report.grade + ' - benchmark, timed practice, and Accuracy Focus stay separate')
            ),
            h('div', { className: 'mf-teacher-report-actions' },
              h('button', { type: 'button', onClick: exportTeacherReport }, 'CSV'),
              h('button', { type: 'button', onClick: function () { window.print(); } }, 'Print')
            )
          ),
          h('div', { className: 'mf-teacher-report-filters', 'aria-label': 'Report filters' },
            filterSelect('Date range', reportDays, function (e) { setReportDays(e.target.value === 'all' ? 'all' : Number(e.target.value)); }, [
              { value: 7, label: 'Last 7 days' }, { value: 30, label: 'Last 30 days' }, { value: 90, label: 'Last 90 days' }, { value: 'all', label: 'All time' }
            ]),
            filterSelect('Session type', reportMode, function (e) { setReportMode(e.target.value); }, [
              { value: 'all', label: 'All session types' }, { value: 'benchmark', label: 'Benchmark' }, { value: 'timed-practice', label: 'Timed practice' }, { value: 'accuracy-focus', label: 'Accuracy Focus' }
            ]),
            filterSelect('Operation', reportOperation, function (e) { setReportOperation(e.target.value); }, [
              { value: 'all', label: 'All operations' }, { value: 'add', label: 'Addition' }, { value: 'sub', label: 'Subtraction' }, { value: 'mul', label: 'Multiplication' }, { value: 'div', label: 'Division' }, { value: 'mixed', label: 'Mixed' }
            ])
          ),
          h('div', { className: 'mf-teacher-report-metrics' }, metricCards.map(function (card) {
            return h('div', { key: card.label }, h('strong', null, String(card.value)), h('span', null, card.label));
          })),
          h('div', { className: 'mf-teacher-report-table-wrap mf-operation-growth-wrap' },
            h('table', { className: 'mf-teacher-report-table mf-operation-growth-table' },
              h('caption', null, tt('math_fluency.operation_growth', 'Operation Growth and Next Steps')),
              h('thead', null, h('tr', null,
                h('th', { scope: 'col' }, 'Operation'), h('th', { scope: 'col' }, 'Mastery'), h('th', { scope: 'col' }, 'Due'),
                h('th', { scope: 'col' }, 'Recent accuracy'), h('th', { scope: 'col' }, 'Latest DCPM'), h('th', { scope: 'col' }, 'Next step')
              )),
              h('tbody', null, report.operationGrowth.map(function (row) {
                var trend = row.trendDelta == null ? '' : (row.trendDelta > 0 ? ' (+' + row.trendDelta + ')' : row.trendDelta < 0 ? ' (' + row.trendDelta + ')' : ' (flat)');
                return h('tr', { key: row.op },
                  h('th', { scope: 'row' }, row.label),
                  h('td', null, row.totalFacts ? row.secureFacts + '/' + row.totalFacts + ' secure' : 'Not tracked'),
                  h('td', null, String(row.dueFacts)),
                  h('td', null, row.recentAccuracy == null ? 'N/A' : row.recentAccuracy + '%'),
                  h('td', null, row.latestDcpm == null ? 'N/A' : row.latestDcpm + trend),
                  h('td', null, row.recommendation)
                );
              }))
            )
          ),
          h('div', { className: 'mf-teacher-report-targets' },
            h('strong', null, tt('math_fluency.suggested_targets', 'Suggested practice targets')),
            report.suggestedTargets.length
              ? h('div', { className: 'mf-teacher-report-chips' }, report.suggestedTargets.map(function (fact) {
                  return h('button', { key: fact.key, type: 'button', onClick: function () { startFocusedPractice([fact]); }, title: 'Start focused practice for this fact' }, fact.a + ' ' + fact.symbol + ' ' + fact.b);
                }))
              : h('p', null, 'No focus facts yet. Complete practice to generate targets.')
          ),
          report.mazeLifetime.gatesUnlocked ? h('div', { className: 'mf-teacher-report-maze', 'aria-label': 'Maze lifetime progress' },
            h('span', null, (report.mazeLifetime.gatesUnlocked || 0) + ' gates'),
            h('span', null, (report.mazeLifetime.mazesCompleted || 0) + ' mazes'),
            h('span', null, 'x' + (report.mazeLifetime.longestStreak || 0) + ' streak'),
            h('span', null, Math.floor((report.mazeLifetime.totalSeconds || 0) / 60) + 'm')
          ) : null,
          h('div', { className: 'mf-teacher-report-table-wrap' },
            h('table', { className: 'mf-teacher-report-table' },
              h('caption', null, 'Recent filtered sessions'),
              h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Date'), h('th', { scope: 'col' }, 'Type'), h('th', { scope: 'col' }, 'Operation'), h('th', { scope: 'col' }, 'Accuracy'), h('th', { scope: 'col' }, 'DCPM'))),
              h('tbody', null, report.sessions.length ? report.sessions.slice(0, 8).map(function (item, index) {
                var type = item.mode === 'benchmark' ? 'Benchmark' : (item.untimed ? 'Accuracy Focus' : 'Timed Practice');
                return h('tr', { key: (item.date || '') + '-' + index },
                  h('td', null, item.date ? new Date(item.date).toLocaleDateString() : 'N/A'), h('td', null, type), h('td', null, item.operation || 'N/A'),
                  h('td', null, item.accuracy != null && Number.isFinite(Number(item.accuracy)) ? item.accuracy + '%' : 'N/A'), h('td', null, item.dcpm != null && Number.isFinite(Number(item.dcpm)) ? item.dcpm : 'N/A'));
              }) : h('tr', null, h('td', { colSpan: 5 }, 'No sessions match these filters.')))
            )
          )
        );
      })(),

      // Persistent focus practice remains available when the student returns.
      (function () {
        var savedFocus = getMasteryFocusFacts(factMastery, 12);
        if (probeMode !== 'practice' || !savedFocus.length) return null;
        return h('button', {
          type: 'button', onClick: function () { startFocusedPractice(savedFocus); },
          'aria-label': tt('math_fluency.practice_my_focus_facts', 'Practice my focus facts'),
          style: { width: '100%', padding: '9px', marginBottom: '8px', background: '#ede9fe', color: '#6d28d9', border: '1px solid #c4b5fd', borderRadius: '10px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }
        }, '\uD83C\uDFAF ' + tt('math_fluency.practice_my_focus_facts', 'Practice My Focus Facts') + ' (' + savedFocus.length + ')');
      })()
    );
  }

  // ═══════════════════════════════════════════════════════════
  // ── FLUENCY MAZE MODE — Navigate a maze by solving math facts ──
  // Inspired by Aaron Pomeranz's dissertation research on fluency
  // maze assessment (USM, 2024)
  // ═══════════════════════════════════════════════════════════

  var CELL_SIZE = 52;
  var MAZE_SIZES = { small: { cols: 5, rows: 5, label: tt('math_fluency.small_5_5', 'Small (5\u00d75)') }, medium: { cols: 7, rows: 7, label: tt('math_fluency.medium_7_7', 'Medium (7\u00d77)') }, large: { cols: 9, rows: 9, label: tt('math_fluency.large_9_9', 'Large (9×9)') } };

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

  // Pure maze helpers shared by hints, chase movement, scoring keys, and tests.
  function findMazePathStep(maze, start, target) {
    if (!Array.isArray(maze) || !maze.length || !Array.isArray(maze[0]) || !start || !target) return null;
    var rows = maze.length, cols = maze[0].length;
    if (start.r === target.r && start.c === target.c) return null;
    if (start.r < 0 || start.c < 0 || start.r >= rows || start.c >= cols || target.r < 0 || target.c < 0 || target.r >= rows || target.c >= cols) return null;
    var queue = [{ r: start.r, c: start.c, firstDirection: null }], visited = {}, head = 0;
    visited[start.r + ',' + start.c] = true;
    while (head < queue.length) {
      var cur = queue[head++], cell = maze[cur.r] && maze[cur.r][cur.c];
      if (!cell || !cell.walls) continue;
      var candidates = [];
      if (!cell.walls.top && cur.r > 0) candidates.push({ r: cur.r - 1, c: cur.c, direction: 'up' });
      if (!cell.walls.right && cur.c < cols - 1) candidates.push({ r: cur.r, c: cur.c + 1, direction: 'right' });
      if (!cell.walls.bottom && cur.r < rows - 1) candidates.push({ r: cur.r + 1, c: cur.c, direction: 'down' });
      if (!cell.walls.left && cur.c > 0) candidates.push({ r: cur.r, c: cur.c - 1, direction: 'left' });
      for (var i = 0; i < candidates.length; i++) {
        var next = candidates[i], key = next.r + ',' + next.c;
        if (visited[key]) continue;
        visited[key] = true;
        var firstDirection = cur.firstDirection || next.direction;
        if (next.r === target.r && next.c === target.c) {
          var delta = { up: [-1, 0], right: [0, 1], down: [1, 0], left: [0, -1] }[firstDirection];
          return { direction: firstDirection, r: start.r + delta[0], c: start.c + delta[1] };
        }
        queue.push({ r: next.r, c: next.c, firstDirection: firstDirection });
      }
    }
    return null;
  }
  function findMazePathDistance(maze, start, target) {
    if (!Array.isArray(maze) || !maze.length || !Array.isArray(maze[0]) || !start || !target) return null;
    var rows = maze.length, cols = maze[0].length;
    if (start.r < 0 || start.c < 0 || start.r >= rows || start.c >= cols || target.r < 0 || target.c < 0 || target.r >= rows || target.c >= cols) return null;
    if (start.r === target.r && start.c === target.c) return 0;
    var queue = [{ r: start.r, c: start.c, distance: 0 }], visited = {}, head = 0;
    visited[start.r + ',' + start.c] = true;
    while (head < queue.length) {
      var cur = queue[head++], cell = maze[cur.r] && maze[cur.r][cur.c];
      if (!cell || !cell.walls) continue;
      var candidates = [];
      if (!cell.walls.top && cur.r > 0) candidates.push({ r: cur.r - 1, c: cur.c });
      if (!cell.walls.right && cur.c < cols - 1) candidates.push({ r: cur.r, c: cur.c + 1 });
      if (!cell.walls.bottom && cur.r < rows - 1) candidates.push({ r: cur.r + 1, c: cur.c });
      if (!cell.walls.left && cur.c > 0) candidates.push({ r: cur.r, c: cur.c - 1 });
      for (var i = 0; i < candidates.length; i++) {
        var next = candidates[i], key = next.r + ',' + next.c;
        if (visited[key]) continue;
        var distance = cur.distance + 1;
        if (next.r === target.r && next.c === target.c) return distance;
        visited[key] = true;
        queue.push({ r: next.r, c: next.c, distance: distance });
      }
    }
    return null;
  }

  function buildChaseRadar(maze, player, monster) {
    var distance = findMazePathDistance(maze, player, monster);
    if (distance == null) return null;
    var dr = monster.r - player.r, dc = monster.c - player.c;
    var bearing = null;
    if (dr !== 0 || dc !== 0) {
      var deg = (Math.atan2(dr, dc) * 180 / Math.PI + 360) % 360;
      bearing = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'][Math.round(deg / 45) % 8];
    }
    var level = distance === 0 ? 'caught' : distance <= 2 ? 'danger' : distance <= 4 ? 'near' : distance <= 7 ? 'watch' : 'distant';
    var labels = { caught: 'Caught', danger: 'Danger', near: 'Monster nearby', watch: 'Stay alert', distant: 'Monster distant' };
    var strength = { caught: 4, danger: 4, near: 3, watch: 2, distant: 1 }[level];
    return {
      distance: distance, bearing: distance <= 7 ? bearing : null, level: level,
      label: labels[level], strength: strength,
      message: labels[level] + '. ' + distance + ' gate' + (distance === 1 ? '' : 's') + ' away' + (distance <= 7 && bearing ? ' to the ' + bearing : '') + '.'
    };
  }

  function buildMazeBestKey(operation, mazeSize, difficulty, controlMode, chaseMode) {
    return [operation, mazeSize, difficulty, controlMode || 'classic', chaseMode ? 'chase' : 'standard'].join('|');
  }
  function generateMazeProblem(operation, difficulty) {
    var a, b, op = operation === 'mixed' ? ['add','sub','mul','div'][Math.floor(Math.random() * 4)] : operation;
    var extended = difficulty === 'double', minN = extended ? 10 : 1, maxN = extended ? 99 : 12;
    function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
    if (op === 'add') { a=rand(minN,maxN); b=rand(minN,maxN); return { text:a+' + '+b, answer:a+b, op:op }; }
    if (op === 'sub') { a=rand(minN,maxN); b=rand(minN,a); return { text:a+' \u2212 '+b, answer:a-b, op:op }; }
    if (op === 'mul') { a=rand(extended?10:1,extended?20:12); b=rand(extended?10:1,extended?20:12); return { text:a+' \u00d7 '+b, answer:a*b, op:op }; }
    if (op === 'div') { b=rand(extended?10:2,extended?15:12); var ans=rand(extended?10:1,extended?20:12); a=b*ans; return { text:a+' \u00f7 '+b, answer:ans, op:op }; }
    if (op === 'volume') { var maxAxis=extended?8:6,L=rand(2,maxAxis),W=rand(2,maxAxis),HH=rand(2,maxAxis),asL=L>=3&&W>=3&&HH>=3&&Math.random()<0.25; if(asL){var nL=Math.max(1,Math.floor(L/3)),nW=Math.max(1,Math.floor(W/3)),nH=Math.max(1,Math.floor(HH/3));return {text:'V = ?',answer:(L*W*HH)-(nL*nW*nH),op:'volume',type:'visual',shape:'lblock',dims:{l:L,w:W,h:HH},notch:{l:nL,w:nW,h:nH}};} return {text:'V = ?',answer:L*W*HH,op:'volume',type:'visual',shape:'rect',dims:{l:L,w:W,h:HH}}; }
    return { text:'1 + 1', answer:2, op:'add' };
  }

  // Daily streak — counts consecutive calendar days the maze was
  // played. Stored as { lastPlayedDate: 'YYYY-MM-DD', current: N,
  // longest: N }. Computed lazily so the streak record updates on
  // first render, not on first move.
  function _mfDailyStreak() {
    try {
      var today = new Date().toISOString().slice(0, 10);
      var rec = JSON.parse(localStorage.getItem('fluency_maze_daily') || '{}');
      if (rec.lastPlayedDate === today) return rec; // already counted today
      var yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      var newCurrent = rec.lastPlayedDate === yesterday ? (rec.current || 0) + 1 : 1;
      var next = {
        lastPlayedDate: today,
        current: newCurrent,
        longest: Math.max(rec.longest || 0, newCurrent),
      };
      localStorage.setItem('fluency_maze_daily', JSON.stringify(next));
      return next;
    } catch (e) { return { current: 0, longest: 0 }; }
  }
  // Mastery counts — gates unlocked per operation (add / sub / mul /
  // div). Used to award bronze / silver / gold badges per fact family
  // so students see steady progress in each op even when total score
  // is dominated by mixed-mode runs.
  function _mfBumpOpCount(opLabel) {
    try {
      var cur = JSON.parse(localStorage.getItem('fluency_maze_op_counts') || '{}');
      cur[opLabel] = (cur[opLabel] || 0) + 1;
      localStorage.setItem('fluency_maze_op_counts', JSON.stringify(cur));
    } catch (e) {}
  }
  function _mfMasteryTier(n) {
    if (n >= 500) return { tier: 'gold',   emoji: '\uD83E\uDD47', label: tt('math_fluency.gold', 'Gold') };
    if (n >= 200) return { tier: 'silver', emoji: '\uD83E\uDD48', label: tt('math_fluency.silver', 'Silver') };
    if (n >= 50)  return { tier: 'bronze', emoji: '\uD83E\uDD49', label: tt('math_fluency.bronze', 'Bronze') };
    return null;
  }
  // Lifetime stats — accumulates across all sessions, persisted via
  // localStorage. Used to render the "since you started playing" stats
  // strip on the setup screen so students see their long-term progress.
  function _mfBumpLifetime(patch) {
    try {
      var cur = JSON.parse(localStorage.getItem('fluency_maze_lifetime') || '{}');
      var next = {
        gatesUnlocked: (cur.gatesUnlocked || 0) + (patch.gatesUnlocked || 0),
        mazesCompleted: (cur.mazesCompleted || 0) + (patch.mazesCompleted || 0),
        longestStreak: Math.max(cur.longestStreak || 0, patch.longestStreak || 0),
        totalSeconds: (cur.totalSeconds || 0) + (patch.totalSeconds || 0),
      };
      localStorage.setItem('fluency_maze_lifetime', JSON.stringify(next));
    } catch (e) {}
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

    // Settings persistence — restore last-used prefs so returning
    // students don't have to re-pick. Falls back to current defaults
    // if no record (or storage blocked).
    function _loadPrefs() {
      try {
        var raw = localStorage.getItem('fluency_maze_prefs');
        if (raw) return JSON.parse(raw);
      } catch (e) {}
      return null;
    }
    function _savePrefs(patch) {
      try {
        var cur = _loadPrefs() || {};
        localStorage.setItem('fluency_maze_prefs', JSON.stringify(Object.assign({}, cur, patch)));
      } catch (e) {}
    }
    var _prefs = _loadPrefs() || {};
    var modeState = useState('setup');
    var mode = modeState[0], setMode = modeState[1];
    var opState = useState(_prefs.operation || 'mul');
    var operation = opState[0];
    var setOperation = function(v) { opState[1](v); _savePrefs({ operation: v }); };
    var diffState = useState(_prefs.difficulty || 'single');
    var difficulty = diffState[0];
    var setDifficulty = function(v) { diffState[1](v); _savePrefs({ difficulty: v }); };
    var chaseState = useState(!!_prefs.chaseMode);
    var chaseMode = chaseState[0];
    var setChaseMode = function(v) { chaseState[1](v); _savePrefs({ chaseMode: v }); };
    var mazeSizeState = useState(_prefs.mazeSize || 'medium');
    var mazeSize = mazeSizeState[0];
    var setMazeSize = function(v) { mazeSizeState[1](v); _savePrefs({ mazeSize: v }); };
    var performance2DState = useState(!!_prefs.performance2D);
    var performance2D = performance2DState[0];
    var setPerformance2D = function(v) { performance2DState[1](v); _savePrefs({ performance2D: v }); };
    var mazeReducedState = useState(_prefs.reducedMotion != null ? !!_prefs.reducedMotion : !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches));
    var mazeReducedMotion = mazeReducedState[0];
    var setMazeReducedMotion = function(v) { mazeReducedState[1](v); _savePrefs({ reducedMotion: !!v }); };
    var mazeContrastState = useState(!!_prefs.highContrast);
    var mazeHighContrast = mazeContrastState[0];
    var setMazeHighContrast = function(v) { mazeContrastState[1](v); _savePrefs({ highContrast: !!v }); };
    var effectsState = useState(_prefs.visualEffects !== false);
    var visualEffects = effectsState[0];
    var setVisualEffects = function(v) { effectsState[1](v); _savePrefs({ visualEffects: !!v }); };
    var simpleMapState = useState(!!_prefs.simplifiedMinimap);
    var simplifiedMinimap = simpleMapState[0];
    var setSimplifiedMinimap = function(v) { simpleMapState[1](v); _savePrefs({ simplifiedMinimap: !!v }); };
    var sensitivityState = useState(Math.max(0.5, Math.min(2, Number(_prefs.cameraSensitivity) || 1)));
    var cameraSensitivity = sensitivityState[0];
    var setCameraSensitivity = function(v) { v = Math.max(0.5, Math.min(2, Number(v) || 1)); sensitivityState[1](v); _savePrefs({ cameraSensitivity: v }); };
    var fovState = useState([65,80,95].indexOf(Number(_prefs.cameraFov)) >= 0 ? Number(_prefs.cameraFov) : 80);
    var cameraFov = fovState[0];
    var setCameraFov = function(v) { v = Number(v); fovState[1](v); _savePrefs({ cameraFov: v }); };
    var brightnessState = useState(Math.max(0.8, Math.min(1.3, Number(_prefs.brightness) || 1)));
    var mazeBrightness = brightnessState[0];
    var setMazeBrightness = function(v) { v = Math.max(0.8, Math.min(1.3, Number(v) || 1)); brightnessState[1](v); _savePrefs({ brightness: v }); };
    // Player avatar — emoji rendered on the 2D minimap / fallback. Persists
    // to _prefs so each student keeps their chosen character across runs.
    // Stored as the literal emoji string (canvas fillText draws it).
    var avatarState = useState(_prefs.playerAvatar || '🐱'); // default cat
    var playerAvatar = avatarState[0];
    var setPlayerAvatar = function(v) { avatarState[1](v); _savePrefs({ playerAvatar: v }); };
    // Control mode — 'classic' (every step is a new gate, fluency drill)
    // or 'explorer' (each wall-passage gates once, then opens both ways +
    // free-look 3D camera + stricter minimap fog). Toggle on setup screen.
    var controlModeState = useState(_prefs.controlMode || 'classic');
    var controlMode = controlModeState[0];
    var setControlMode = function(v) { controlModeState[1](v); _savePrefs({ controlMode: v }); };
    var isExplorer = controlMode === 'explorer';
    // Fullscreen toggle — when true the playing-mode wrapper switches to
    // position:fixed inset:0 so the maze fills the viewport. Toggle button
    // sits in the HUD; F key bound below. Persisted to _prefs so a teacher
    // who runs every drill in fullscreen doesn't have to re-toggle each run.
    var fullscreenState = useState(!!_prefs.fullscreen);
    var isFullscreen = fullscreenState[0];
    var setFullscreen = function(v) {
      var next = typeof v === 'function' ? v(fullscreenState[0]) : v;
      fullscreenState[1](next);
      _savePrefs({ fullscreen: !!next });
    };
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
    // Snapshot of the prior personal-best for the current (op, size,
    // difficulty) at the moment the player wins. Captured once in the
    // win handler so the results screen can render an honest "X seconds
    // faster than your previous best" pill (the bestStore has already
    // been mutated by the time results renders, so reading it back
    // there would always show the current run as the best).
    var priorBestState = useState(null);
    var priorBestSnapshot = priorBestState[0], setPriorBestSnapshot = priorBestState[1];
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
    // Explorer Mode — paths (wall-passages between two cells) that have been
    // solved this run. Once a path is in here, walking it again skips the
    // gate. Keyed by canonical "minRC|maxRC" so direction-of-travel is
    // irrelevant (solving R→L opens L→R too). Reset in startMaze.
    var solvedPathsRef = useRef({});
    // Camera yaw offset (radians) for Explorer Mode free-look. 0 = facing the
    // last-move direction (Classic behavior). Mutated by mouse/touch drag
    // listeners attached in init3D; read in the camera lookAt loop.
    var lookYawRef = useRef(0);
    // Target yaw the camera is easing toward. Q/E keyboard rotate sets this
    // and lets the per-frame lerp animate to it; mouse/touch drag sets BOTH
    // refs so the camera tracks the cursor 1:1 without lerp lag.
    var lookYawTargetRef = useRef(0);
    // Snapshot of the maze grid + key position from the last startMaze call,
    // used by the "Same Maze" replay button on results so a student can
    // retry the same layout to beat their time.
    var lastRunRef = useRef(null);
    // Per-fact accuracy log for THIS run only — keyed by problem.text
    // (e.g. "7 × 8"), value is { correct, wrong }. Reset in startMaze.
    // Surfaced on results as a "Facts to Practice" panel so the student
    // (or teacher) sees which facts caused stumbles. Visual-volume gates
    // skipped because their .text isn't a clean fact key.
    var factStatsRef = useRef({});
    // Mirror of `isExplorer` so listeners attached once in init3D always see
    // the current value without a stale closure.
    var isExplorerRef = useRef(isExplorer);
    isExplorerRef.current = isExplorer;
    var cameraSensitivityRef = useRef(cameraSensitivity); cameraSensitivityRef.current = cameraSensitivity;
    var mazeReducedRef = useRef(mazeReducedMotion); mazeReducedRef.current = mazeReducedMotion;
    var visualEffectsRef = useRef(visualEffects); visualEffectsRef.current = visualEffects;
    // Animation-time tick used only to nudge the minimap redraw when the
    // you-are-here pulse / breadcrumb trail needs a frame-accurate update.
    var minimapTickRef = useRef(0);
    // Bump when we want the "wrong answer" screen shake to fire.
    var shakeRef = useRef(0);
    // Dust-particle queue — radial puffs spawned in submitAnswer's
    // correct path at the cell the player just left, decayed per
    // draw frame in the canvas useEffect. Kept as a ref because
    // particles are pure visual fluff and shouldn't trigger renders.
    var dustParticlesRef = useRef([]);
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
    // Paused state — toggled by P key or pause button. While paused,
    // the elapsed timer is held, tryMove/submitAnswer no-op, and a
    // dim overlay covers the maze. Useful for interruptions.
    var pausedState = useState(false);
    var paused = pausedState[0], setPaused = pausedState[1];
    // Keyboard help overlay — toggled by ? key. Local state, doesn't
    // persist. Shows all the keyboard shortcuts in a parchment card.
    var helpOpenState = useState(false);
    var helpOpen = helpOpenState[0], setHelpOpen = helpOpenState[1];
    // Mute state — local mirror of the module-level _mfMuted so the HUD
    // button re-renders on toggle. Initialized from the module flag (which
    // already read from localStorage at module load).
    var mutedLocalState = useState(_mfMuted);
    var mutedLocal = mutedLocalState[0], setMutedLocal = mutedLocalState[1];
    var customSettingsState = useState(false);
    var showCustomSettings = customSettingsState[0], setShowCustomSettings = customSettingsState[1];
    function _toggleMute() {
      var next = !mutedLocal;
      _mfSetMuted(next);
      setMutedLocal(next);
      _mfAnnounce(next ? tt('math_fluency.sound_off', 'Sound off') : tt('math_fluency.sound_on', 'Sound on'));
    }
    // Mirror paused into a ref so the timer interval (closed over the
    // initial state value) reads the current pause status without
    // needing to be torn down + recreated on every toggle.
    var pausedRef = useRef(false);
    var monsterBlockedRef = useRef(false);
    var timerBlockedRef = useRef(false);
    pausedRef.current = paused;
    timerBlockedRef.current = paused || helpOpen || !tutorialSeen;
    monsterBlockedRef.current = timerBlockedRef.current || !!currentProblem;

    function makeProblem() {
      return generateMazeProblem(operation, difficulty);
    }

    function getMazeSize() { var s = MAZE_SIZES[mazeSize] || MAZE_SIZES.medium; return { cols: s.cols, rows: s.rows }; }
    var MAZE_COLS = getMazeSize().cols;
    var MAZE_ROWS = getMazeSize().rows;

    // Hints follow the current objective: reach the key first, then the exit.
    function findHintDir() {
      if (!maze) return null;
      var target = !keyCollected && keyPosRef.current ? { r: keyPosRef.current.r, c: keyPosRef.current.c } : { r: MAZE_ROWS - 1, c: MAZE_COLS - 1 };
      var step = findMazePathStep(maze, playerPosRef.current, target);
      return step ? step.direction : null;
    }

    function requestHint() {
      if (mode !== 'playing' || gameOver || won) return;
      var dir = findHintDir();
      if (!dir) return;
      setHintDir(dir);
      var objectiveName = !keyCollected ? tt('math_fluency.golden_key', 'golden key') : tt('math_fluency.exit_2', 'exit');
      _mfAnnounce(tt('math_fluency.maze_hint_announcement', 'Hint toward the {objective}: move {direction}.', { objective: objectiveName, direction: dir }));
      setScore(function(p) { return Math.max(0, p - 5); });
      setStreak(0); // using a hint resets combo — keeps it honest
      playTone(660, 0.08, 'sine', 0.04);
      setTimeout(function() { setHintDir(null); }, 2200);
    }

    function startMaze(replay) {
      var newMaze, keyPos, sz;
      // Replay branch — reuse the previous run's grid + key cell so a
      // student can retry the same layout. Falls back to a fresh maze if
      // there's no last-run cached (e.g., first session).
      if (replay && lastRunRef.current && lastRunRef.current.maze) {
        newMaze = lastRunRef.current.maze;
        keyPos = lastRunRef.current.keyPos;
        sz = { rows: newMaze.length, cols: newMaze[0].length };
      } else {
        sz = getMazeSize();
        newMaze = generateMaze(sz.rows, sz.cols);
      }
      setMaze(newMaze);
      setPlayerPos({ r: 0, c: 0 }); playerPosRef.current = { r: 0, c: 0 };
      // Reset breadcrumb trail — each new maze starts with only the origin lit.
      visitedCellsRef.current = { '0,0': true };
      // Reset Explorer-mode state. solvedPathsRef accumulates over a run; a
      // fresh maze means no paths solved yet. lookYawRef + lookYawTargetRef
      // keep the camera aimed at the start orientation rather than wherever
      // the previous maze ended.
      solvedPathsRef.current = {};
      lookYawRef.current = 0;
      lookYawTargetRef.current = 0;
      // Per-fact accuracy log resets every run so the "Facts to Practice"
      // panel reflects only the current attempt, not lifetime stumbles.
      factStatsRef.current = {};
      setMonsterPos({ r: 0, c: 0 });
      setCurrentProblem(null);
      setScore(0); setCorrect(0); setWrong(0); setMoveCount(0); setElapsed(0);
      setGameOver(false); setWon(false); setFeedback('');
      setPaused(false); setHelpOpen(false);
      setStreak(0); setHintDir(null);
      setKeyCollected(false);
      setMedal(null);
      if (keyPos) {
        keyPosRef.current = keyPos;
      } else {
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
      }
      // Stash the layout for the "Same Maze" replay button on results.
      lastRunRef.current = { maze: newMaze, keyPos: keyPosRef.current };
      setMode('playing');
      // Timer
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(function() { if (!timerBlockedRef.current && !(typeof document !== 'undefined' && document.hidden)) setElapsed(function(p) { return p + 1; }); }, 1000);
      // Monster chase timer (moves every 4 seconds)
      if (monsterTimerRef.current) clearInterval(monsterTimerRef.current);
      if (chaseMode) {
        monsterTimerRef.current = setInterval(function() {
          if (monsterBlockedRef.current || (typeof document !== 'undefined' && document.hidden)) return;
          setMonsterPos(function(mp) {
            var step = findMazePathStep(newMaze, mp, playerPosRef.current);
            return step ? { r: step.r, c: step.c } : mp;
          });
        }, 4000);
      }
    }

    // Canonical key for the wall-passage between two grid cells. Sorted by
    // (row,col) so traversal direction is irrelevant — solving R→L opens
    // the same key as L→R. Used by Explorer Mode's once-per-path gating.
    function _pathKey(r1, c1, r2, c2) {
      var a = r1 * 1000 + c1, b = r2 * 1000 + c2;
      return (a < b) ? (a + '|' + b) : (b + '|' + a);
    }

    function tryMove(dir) {
      if (gameOver || won || paused) return;
      var cell = maze[playerPos.r][playerPos.c];
      var canMove = false;
      var newR = playerPos.r, newC = playerPos.c;
      if (dir === 'up' && !cell.walls.top) { newR--; canMove = true; }
      if (dir === 'down' && !cell.walls.bottom) { newR++; canMove = true; }
      if (dir === 'left' && !cell.walls.left) { newC--; canMove = true; }
      if (dir === 'right' && !cell.walls.right) { newC++; canMove = true; }
      if (!canMove) { setFeedback('wall'); playTone(140, 0.08, 'triangle', 0.06); setTimeout(function() { setFeedback(''); }, 300); return; }
      // Explorer Mode: if this path-passage was already solved this run,
      // walk through silently — no gate. Mirrors the correct-path side of
      // submitAnswer so the player still gets the visited / camera updates.
      if (isExplorer) {
        var pk = _pathKey(playerPos.r, playerPos.c, newR, newC);
        if (solvedPathsRef.current[pk]) {
          var newPos = { r: newR, c: newC };
          playerPosRef.current = newPos;
          visitedCellsRef.current[newR + ',' + newC] = true;
          setPlayerPos(newPos);
          setMoveCount(function(p) { return p + 1; });
          // Step tone — soft footstep so the move still has audio feedback.
          playTone(420, 0.04, 'sine', 0.025);
          // Key pickup still triggers if walking onto the key cell.
          var kpE = keyPosRef.current;
          if (!keyCollected && kpE && newR === kpE.r && newC === kpE.c) {
            setKeyCollected(true);
            _mfAnnounce(tt('math_fluency.you_picked_up_the_golden_key_the_exit_po', 'You picked up the golden key. The exit portal is now unlocked.'));
            if (addToast) addToast('🗝️ Golden key collected! The exit is unlocked.', 'success');
            playTone(880, 0.08, 'sine', 0.06);
            setTimeout(function() { playTone(1175, 0.08, 'sine', 0.06); }, 90);
            setTimeout(function() { playTone(1568, 0.12, 'sine', 0.06); }, 180);
          }
          return;
        }
      }
      // Show a problem to solve before moving
      var _prob = makeProblem();
      setCurrentProblem({ dir: dir, targetR: newR, targetC: newC, problem: _prob });
      setUserInput('');
      setAttemptCount(0);
      if (_prob.type === 'visual') {
        var d = _prob.dims;
        var msg = (_prob.shape === 'lblock')
          ? 'L block prism gate. Base ' + d.l + ' by ' + d.w + ' by ' + d.h + ', with a ' + _prob.notch.l + ' by ' + _prob.notch.w + ' by ' + _prob.notch.h + ' corner removed. Solve for total cubes.'
          : tt('math_fluency.volume_gate', 'Volume gate. ') + d.l + ' by ' + d.w + ' by ' + d.h + '. Solve for total cubes.';
        _mfAnnounce(msg);
      }
      setTimeout(function() { if (inputRef.current) inputRef.current.focus(); }, 50);
    }

    function submitAnswer() {
      if (!currentProblem) return;
      var ans = parseInt(userInput);
      if (ans === currentProblem.problem.answer) {
        // Correct — move to new cell
        var newPos = { r: currentProblem.targetR, c: currentProblem.targetC };
        setPlayerPos(newPos); playerPosRef.current = newPos;
        // Per-fact accuracy log: count this as a correct attempt for the
        // current fact text. Skip visual gates (no clean fact key).
        if (currentProblem.problem.type !== 'visual') {
          var _ftxt = currentProblem.problem.text;
          var _fs = factStatsRef.current[_ftxt] || { correct: 0, wrong: 0 };
          _fs.correct++;
          factStatsRef.current[_ftxt] = _fs;
        }
        // Explorer Mode: record this path-passage as solved so re-walking
        // it (or returning through it) skips the gate for the rest of the
        // run. Direction-agnostic via canonical _pathKey.
        if (isExplorer) {
          solvedPathsRef.current[_pathKey(playerPos.r, playerPos.c, newPos.r, newPos.c)] = true;
        }
        // Mark the cell we just left AND the new one as visited so both show
        // on the breadcrumb/fog-of-war minimap. Using a ref (not state) so
        // there's no extra re-render and no race with the playerPos update.
        visitedCellsRef.current[playerPos.r + ',' + playerPos.c] = true;
        visitedCellsRef.current[newPos.r + ',' + newPos.c] = true;
        if (!tutorialSeen) _dismissTutorial();
        // Spawn dust puff at the cell we just left so movement feels
        // physical. Particles fade over ~0.6s in the draw loop.
        try {
          var dustList = dustParticlesRef.current;
          dustList.push({ r: playerPos.r, c: playerPos.c, age: 0, life: 0.6 });
          if (dustList.length > 12) dustList.shift();
        } catch (e) {}
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
        _mfBumpLifetime({ gatesUnlocked: 1, longestStreak: nextStreak });
        (function() {
          var ptxt = (currentProblem.problem.text || '');
          var opK = currentProblem.problem.type === 'visual' ? 'volume'
            : ptxt.indexOf('\u00D7') >= 0 || ptxt.indexOf('x') >= 0 || ptxt.indexOf('*') >= 0 ? 'mul'
            : ptxt.indexOf('\u00F7') >= 0 || ptxt.indexOf('/') >= 0 ? 'div'
            : ptxt.indexOf('+') >= 0 ? 'add'
            : (ptxt.indexOf('\u2212') >= 0 || ptxt.indexOf('-') >= 0) ? 'sub'
            : null;
          if (opK) {
            // Detect tier crossing — read pre-bump value, compute the
            // tier of (n) and (n+1); if they differ, fire celebration.
            try {
              var preCounts = JSON.parse(localStorage.getItem('fluency_maze_op_counts') || '{}');
              var pre = preCounts[opK] || 0;
              var preTier = _mfMasteryTier(pre);
              var postTier = _mfMasteryTier(pre + 1);
              if (postTier && (!preTier || postTier.tier !== preTier.tier)) {
                var opNice = { add: tt('math_fluency.addition', 'Addition'), sub: tt('math_fluency.subtraction', 'Subtraction'), mul: tt('math_fluency.multiplication', 'Multiplication'), div: tt('math_fluency.division', 'Division'), volume: tt('math_fluency.volume', 'Volume') }[opK] || opK;
                if (addToast) addToast(postTier.emoji + ' ' + postTier.label + ' ' + opNice + ' Mastery unlocked!', 'success');
                _mfAnnounce(postTier.label + ' ' + opNice + ' mastery earned. ' + (pre + 1) + ' gates.');
                // Triple-tone fanfare layered on top of the existing
                // streak chime — distinct enough to register as a
                // separate event.
                playTone(660, 0.08, 'sine', 0.05);
                setTimeout(function() { playTone(990, 0.08, 'sine', 0.05); }, 90);
                setTimeout(function() { playTone(1320, 0.12, 'sine', 0.05); }, 180);
              }
            } catch (e) {}
            _mfBumpOpCount(opK);
          }
        })();
        setFeedback('correct');
        _mfAnnounce(tt('math_fluency.gate_opens', 'Gate opens. ') + currentProblem.problem.text + ' equals ' + currentProblem.problem.answer + '.');
        // Clear any active hint — reward for solving without it
        setHintDir(null);
        playTone(880, 0.05, 'sine', 0.06);
        setTimeout(function() { playTone(1320, 0.05, 'sine', 0.05); }, 50);
        // Soft stone-footfall layered under the correct chime
        setTimeout(function() { playTone(180, 0.06, 'triangle', 0.035); }, 110);
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
          _mfAnnounce(tt('math_fluency.golden_key_collected_the_exit_is_now_unl', 'Golden key collected. The exit is now unlocked.'));
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
          // Win fanfare — rising C major arpeggio + sustained C-E-G chord.
          // Layered with the existing maze-complete tones in the surrounding
          // path so the celebration is distinctly bigger than a gate-unlock.
          playTone(523, 0.14, 'sine', 0.08);
          setTimeout(function() { playTone(659, 0.14, 'sine', 0.08); }, 110);
          setTimeout(function() { playTone(784, 0.14, 'sine', 0.08); }, 220);
          setTimeout(function() { playTone(1047, 0.22, 'sine', 0.09); }, 330);
          setTimeout(function() {
            playTone(1047, 0.45, 'sine', 0.06);
            playTone(1319, 0.45, 'sine', 0.05);
            playTone(1568, 0.45, 'sine', 0.05);
          }, 600);
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
          _mfAnnounce(tt('math_fluency.maze_complete', 'Maze complete! ') + (correct + 1) + ' gates unlocked in ' + elapsed + ' seconds.');
          if (addToast) addToast('\uD83C\uDFC6 Maze complete! ' + (correct + 1) + ' correct in ' + elapsed + 's', 'success');
          if (handleScoreUpdate) handleScoreUpdate(Math.round((correct + 1) / Math.max(1, elapsed) * 60) + medalBonus, tt('math_fluency.fluency_maze_complete', 'Fluency Maze Complete'), 'fluency-maze');
          _mfBumpLifetime({ mazesCompleted: 1, totalSeconds: elapsed });
          // Save high score — keyed per (operation, size, difficulty) so
          // distinct practice modes don't overwrite each other's bests.
          // Legacy 'fluency_maze_best' (single global) is preserved as a
          // fallback so existing students don't lose their prior best.
          try {
            var bestKey = buildMazeBestKey(operation, mazeSize, difficulty, controlMode, chaseMode);
            var bestStore = JSON.parse(localStorage.getItem('fluency_maze_bests') || '{}');
            var prior = bestStore[bestKey];
            // Stash a frozen copy so the results screen can compare against
            // the pre-win record. Stored as a plain object so a stale
            // closure can't see further mutations of bestStore.
            setPriorBestSnapshot(prior ? { score: prior.score, time: prior.time, correct: prior.correct, wrong: prior.wrong } : null);
            if (!prior || finalScore > prior.score) {
              bestStore[bestKey] = { score: finalScore, correct: correct + 1, wrong: wrong, time: elapsed, op: operation, size: mazeSize, difficulty: difficulty, controlMode: controlMode, chaseMode: chaseMode, savedAt: Date.now() };
              localStorage.setItem('fluency_maze_bests', JSON.stringify(bestStore));
              if (prior) _mfAnnounce(tt('math_fluency.new_personal_best_for_this_mode', 'New personal best for this mode: ') + finalScore + ' points.');
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
        // Per-fact accuracy log: count this as a wrong attempt for the
        // current fact text. Used by the results "Facts to Practice"
        // panel; visual gates are skipped (no clean fact key).
        if (currentProblem.problem.type !== 'visual') {
          var _wtxt = currentProblem.problem.text;
          var _ws = factStatsRef.current[_wtxt] || { correct: 0, wrong: 0 };
          _ws.wrong++;
          factStatsRef.current[_wtxt] = _ws;
        }
        setFeedback('wrong');
        _mfAnnounce(tt('math_fluency.wrong_combination_the_gate_stays_locked', 'Wrong combination. The gate stays locked. Try again.'));
        setAttemptCount(function(p) { return p + 1; });
        playTone(220, 0.1, 'triangle', 0.04);
        // Lower harmonic clang so the wrong-answer audio reads as a locked
        // gate rejecting the wrong combination.
        setTimeout(function() { playTone(165, 0.18, 'triangle', 0.05); }, 80);
        shakeRef.current = 1;
        var eng3dW = maze3dEngRef.current;
        if (eng3dW) { eng3dW._feedbackFlash = 1; eng3dW.scene.children.forEach(function(c) { if (c.isAmbientLight) c.color.setHex(0xaa2222); c.intensity = 0.8; }); }
        // Keep the wrong answer visible during the shake so the student
        // sees what they typed — clears with the feedback flag at 600ms.
        setTimeout(function() { if (inputRef.current) inputRef.current.focus(); }, 50);
        setTimeout(function() { setFeedback(''); setUserInput(''); }, 600);
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
        if (paused) {
          if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { e.preventDefault(); setPaused(false); }
          return;
        }
        if (currentProblem) {
          if (e.key === 'Enter') { e.preventDefault(); submitAnswer(); }
          return;
        }
        // WCAG 2.1.4 — character-key shortcuts (P/M/F/H/?/WASD) must not
        // fire when focus is in any editable element on the host page.
        // The maze's own answer input only mounts inside currentProblem
        // (handled above), so here we can safely skip on any editable.
        var ae = (typeof document !== 'undefined') ? document.activeElement : null;
        if (ae && ae !== document.body && ae.matches && ae.matches('input, textarea, select, [contenteditable="true"]')) return;
        if (e.key === 'p' || e.key === 'P') { setPaused(function(v) { return !v; }); return; }
        if (e.key === '?' || (e.shiftKey && e.key === '/')) { setHelpOpen(function(v) { return !v; }); return; }
        if (e.key === 'm' || e.key === 'M') { _toggleMute(); return; }
        if (e.key === 'f' || e.key === 'F') { setFullscreen(function(v) { return !v; }); return; }
        if (paused) return;
        // Explorer Mode keyboard rotate — Q/E nudge the look-yaw target
        // 30° per press; the animate loop lerps the actual camera yaw
        // toward it so the rotation feels smooth instead of snapping.
        // Classic ignores these keys (yaw stays at 0 there anyway).
        if (isExplorer && (e.key === 'q' || e.key === 'Q')) { lookYawTargetRef.current -= Math.PI / 6; return; }
        if (isExplorer && (e.key === 'e' || e.key === 'E')) { lookYawTargetRef.current += Math.PI / 6; return; }
        // R restarts the SAME maze layout (reuses lastRunRef) so a
        // student can retry mid-run without trekking back to results.
        // Only fires when there's a cached layout to reuse.
        if ((e.key === 'r' || e.key === 'R') && lastRunRef.current) { startMaze(true); return; }
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
      if (!ctx) return;
      var W = MAZE_COLS * CELL_SIZE;
      var H = MAZE_ROWS * CELL_SIZE;
      // High-DPI scaling — internal resolution is bumped so the canvas
      // stays crisp when CSS-stretched into the wider container. Higher
      // multiplier in fullscreen since the canvas displays larger.
      // Setting cv.width/height resets ctx state per spec, so apply the
      // scale via setTransform BEFORE any save/translate calls below.
      var DRAW_SCALE = isFullscreen ? 3 : 2;
      cv.width = W * DRAW_SCALE; cv.height = H * DRAW_SCALE;
      ctx.setTransform(DRAW_SCALE, 0, 0, DRAW_SCALE, 0, 0);
      var visited = visitedCellsRef.current || { '0,0': true };
      var pulse = mazeReducedMotion ? 0.5 : Math.sin(minimapTickRef.current * 0.12) * 0.5 + 0.5; // 0..1
      // Wrong-answer screen shake — shakeRef is set to 1 in submitAnswer's
      // wrong path and decayed here each frame. Applies a small random
      // offset to the entire canvas so the maze visibly jolts when the
      // gate rejects a bad answer. Decay rate keeps it under ~600ms.
      var shake = mazeReducedMotion || !visualEffects ? 0 : (shakeRef.current || 0);
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
      ctx.fillStyle = mazeHighContrast ? '#000000' : '#3a2e26'; ctx.fillRect(0, 0, W, H);

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
          // Explorer Mode — stricter fog of war: unseen cells render as
          // solid black with NO walls drawn, so the player has to actually
          // explore to learn the maze layout. Seen-but-not-visited cells
          // (4-neighbor of visited) still render normally as a peek-ahead.
          if (isExplorer && !isSeen) {
            ctx.fillStyle = '#000';
            ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
            continue;
          }
          // Floor tint — warm tan for visible corridor floor (was near-black).
          if (isSeen) {
            ctx.fillStyle = 'rgba(217,180,140,0.18)';
            ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
          }
          // Fog-of-war (Classic): lighter warm-brown overlay. Keeps the
          // unexplored region distinct without making it feel oppressive.
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
          // Explorer Mode — highlight solved passages with a small gold
          // dot at the midpoint of each opened doorway. Builds a visible
          // trail of "doors I've already unlocked" without revealing
          // unexplored layout. Only checks the right/bottom passages so
          // each shared passage is drawn exactly once.
          if (isExplorer) {
            var solved = solvedPathsRef.current;
            if (!cell.walls.right && c < MAZE_COLS - 1) {
              if (solved[_pathKey(r, c, r, c + 1)]) {
                ctx.fillStyle = 'rgba(251,191,36,0.85)';
                ctx.beginPath();
                ctx.arc(x + CELL_SIZE, y + CELL_SIZE / 2, 3, 0, Math.PI * 2);
                ctx.fill();
              }
            }
            if (!cell.walls.bottom && r < MAZE_ROWS - 1) {
              if (solved[_pathKey(r, c, r + 1, c)]) {
                ctx.fillStyle = 'rgba(251,191,36,0.85)';
                ctx.beginPath();
                ctx.arc(x + CELL_SIZE / 2, y + CELL_SIZE, 3, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          }
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
      ctx.fillText(tt('math_fluency.start', 'START'), CELL_SIZE / 2, CELL_SIZE / 2 + 14);
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
        ctx.fillText(keyCollected ? tt('math_fluency.exit', 'EXIT') : tt('math_fluency.locked', 'LOCKED'), (MAZE_COLS - 0.5) * CELL_SIZE, (MAZE_ROWS - 0.5) * CELL_SIZE + 14);
        ctx.font = '18px sans-serif';
        ctx.fillText(keyCollected ? '\u2B50' : '\uD83D\uDD12', (MAZE_COLS - 0.5) * CELL_SIZE, (MAZE_ROWS - 0.5) * CELL_SIZE);
      }

      // Monster (chase mode) — only draw if its cell is seen, so unseen
      // monster location doesn't leak map info.
      if (chaseMode && mode === 'playing' && !gameOver && seen(monsterPos.r, monsterPos.c)) {
        ctx.font = '22px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('\uD83D\uDC7E', (monsterPos.c + 0.5) * CELL_SIZE, (monsterPos.r + 0.5) * CELL_SIZE + 6);
      }

      // Drifting dust puffs — particles spawned at cells we just left
      // on each successful move. Render before the lantern so they sit
      // on the corridor floor; decay age each draw frame and reap.
      var _dustList = dustParticlesRef.current;
      for (var dpi = _dustList.length - 1; dpi >= 0; dpi--) {
        var pp = _dustList[dpi];
        pp.age += 0.05;
        if (pp.age >= pp.life) { _dustList.splice(dpi, 1); continue; }
        var dprog = pp.age / pp.life;       // 0..1
        var dpcx = (pp.c + 0.5) * CELL_SIZE;
        var dpcy = (pp.r + 0.5) * CELL_SIZE;
        var dpr = 4 + dprog * 14;            // grows
        var dpalpha = (1 - dprog) * 0.45;
        var dustGrad = ctx.createRadialGradient(dpcx, dpcy, 1, dpcx, dpcy, dpr);
        dustGrad.addColorStop(0, 'rgba(252,232,205,' + dpalpha + ')');
        dustGrad.addColorStop(1, 'rgba(252,232,205,0)');
        ctx.fillStyle = dustGrad;
        ctx.beginPath(); ctx.arc(dpcx, dpcy, dpr, 0, Math.PI * 2); ctx.fill();
      }
      // Player-carried lantern light — soft amber radial glow centered on
      // the player's cell. Sits over fog/breadcrumbs but under the player
      // marker so the player feels like they're carrying their own light
      // source through the dungeon. Pulse-coupled with the existing player
      // ring so the lantern subtly breathes with each draw.
      var pcx = (playerPos.c + 0.5) * CELL_SIZE;
      var pcy = (playerPos.r + 0.5) * CELL_SIZE;
      ctx.save();
      // Golden aura — appears once the key is collected. Slightly larger
      // than the lantern, pulses on a different phase so the two layers
      // create a visible double-glow that rewards key pickup for the
      // remainder of the run.
      if (keyCollected) {
        var auraRadius = CELL_SIZE * (2.4 + pulse * 0.4);
        var auraPulse = 0.6 + 0.4 * Math.sin(minimapTickRef.current * 0.18 + 1.5);
        var auraGrad = ctx.createRadialGradient(pcx, pcy, 6, pcx, pcy, auraRadius);
        auraGrad.addColorStop(0, 'rgba(253,224,71,' + (0.55 * auraPulse) + ')');
        auraGrad.addColorStop(0.4, 'rgba(251,191,36,' + (0.30 * auraPulse) + ')');
        auraGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = auraGrad;
        ctx.fillRect(pcx - auraRadius, pcy - auraRadius, auraRadius * 2, auraRadius * 2);
        ctx.globalCompositeOperation = 'source-over';
      }
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
      ctx.fillText(playerAvatar || '\uD83D\uDC31', pcx, pcy + 6);

      // Explorer Mode - draw a small yaw indicator (filled triangle)
      // pointing in the direction the camera is currently facing, so the
      // player can ground their orientation against the minimap. Yaw is
      // read from lookYawRef; 0 = facing +z (down on the map).
      if (isExplorer) {
        var yawA = lookYawRef.current;
        var triR = CELL_SIZE * 0.42;
        var tipX = pcx + Math.sin(yawA) * triR;
        var tipY = pcy + Math.cos(yawA) * triR;
        var baseR = triR * 0.55;
        var spread = 0.45;
        var leftX = pcx + Math.sin(yawA + Math.PI - spread) * baseR;
        var leftY = pcy + Math.cos(yawA + Math.PI - spread) * baseR;
        var rightX = pcx + Math.sin(yawA + Math.PI + spread) * baseR;
        var rightY = pcy + Math.cos(yawA + Math.PI + spread) * baseR;
        ctx.fillStyle = 'rgba(167,139,250,0.92)';
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(leftX, leftY);
        ctx.lineTo(rightX, rightY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

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
        if (frame % 10 === 0 && !pausedRef.current && !(typeof document !== 'undefined' && document.hidden)) {
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
      eng.camera = new THREE.PerspectiveCamera(cameraFov, container.clientWidth / Math.max(1, container.clientHeight), 0.1, 50);
      eng.camera.position.set(0.5, 1.2, 0.5);

      // Renderer
      var cnv = document.createElement('canvas');
      cnv.style.width = '100%'; cnv.style.height = '100%'; cnv.style.display = 'block'; cnv.style.borderRadius = '10px';
      cnv.tabIndex = 0;
      cnv.setAttribute('data-math-maze-canvas', 'true');
      cnv.setAttribute('role', 'application');
      cnv.setAttribute('aria-roledescription', tt('math_fluency.maze_canvas_role', 'Interactive 3D math maze'));
      cnv.setAttribute('aria-label', tt('math_fluency.maze_canvas_label', '3D math maze. Arrow keys or W A S D move. Q and E turn in Explorer mode. Nearby movement buttons provide an alternative.'));
      cnv.setAttribute('aria-keyshortcuts', 'ArrowUp ArrowDown ArrowLeft ArrowRight W A S D Q E P M F H');
      container.appendChild(cnv);
      eng.renderer = new THREE.WebGLRenderer({ canvas: cnv, antialias: true });
      eng.renderer.setSize(container.clientWidth, container.clientHeight);
      eng.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

      // Explorer Mode free-look listeners. Mouse/touch drag on the 3D
      // container rotates lookYawRef (radians); the camera-update loop
      // below adds it to the base look-direction. Listeners are attached
      // once here; staleness avoided via isExplorerRef. mousemove sits on
      // window so a drag started on the container can follow the cursor
      // outside the box, but it's gated by `dragging` set on container
      // mousedown so we never grab pointer events without the user's
      // explicit intent. Cleanup on unmount removes everything.
      var dragging = false, lastX = 0;
      function _onMouseDown(e) { try { cnv.focus(); } catch (_) {} if (!isExplorerRef.current) return; dragging = true; lastX = e.clientX; }
      function _onMouseMove(e) {
        if (!dragging || !isExplorerRef.current) return;
        var delta = (e.clientX - lastX) * 0.005 * cameraSensitivityRef.current;
        // Drag is direct: set both refs so the camera tracks 1:1 without
        // the lerp lag. Q/E only sets target so its motion is animated.
        lookYawRef.current -= delta;
        lookYawTargetRef.current -= delta;
        lastX = e.clientX;
      }
      function _onMouseUp() { dragging = false; }
      var touchActive = false, lastTouchX = 0;
      function _onTouchStart(e) {
        try { cnv.focus(); } catch (_) {}
        if (!isExplorerRef.current || !e.touches || e.touches.length !== 1) return;
        touchActive = true; lastTouchX = e.touches[0].clientX;
      }
      function _onTouchMove(e) {
        if (!touchActive || !isExplorerRef.current || !e.touches || e.touches.length !== 1) return;
        var x = e.touches[0].clientX;
        var d = (x - lastTouchX) * 0.005 * cameraSensitivityRef.current;
        lookYawRef.current -= d;
        lookYawTargetRef.current -= d;
        lastTouchX = x;
        // preventDefault keeps the page from scrolling under a 1-finger drag
        // on the maze, but only when we're actually using it for look.
        if (e.cancelable) { try { e.preventDefault(); } catch (_) {} }
      }
      function _onTouchEnd() { touchActive = false; }
      container.addEventListener('mousedown', _onMouseDown);
      window.addEventListener('mousemove', _onMouseMove);
      window.addEventListener('mouseup', _onMouseUp);
      container.addEventListener('touchstart', _onTouchStart, { passive: true });
      container.addEventListener('touchmove', _onTouchMove, { passive: false });
      container.addEventListener('touchend', _onTouchEnd);
      container.addEventListener('touchcancel', _onTouchEnd);
      eng._lookCleanup = function() {
        container.removeEventListener('mousedown', _onMouseDown);
        window.removeEventListener('mousemove', _onMouseMove);
        window.removeEventListener('mouseup', _onMouseUp);
        container.removeEventListener('touchstart', _onTouchStart);
        container.removeEventListener('touchmove', _onTouchMove);
        container.removeEventListener('touchend', _onTouchEnd);
        container.removeEventListener('touchcancel', _onTouchEnd);
      };

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
        eng.camera.position.y = 1.2 + (mazeReducedRef.current ? 0 : Math.sin(t2 * 3) * 0.03); // subtle bob
        // Screen shake — decays over ~0.4s after a wrong answer. Applied as
        // a small additive offset on top of the smoothed camera position.
        if (!mazeReducedRef.current && visualEffectsRef.current && shakeRef.current > 0) {
          var s = shakeRef.current;
          eng.camera.position.x += (Math.random() - 0.5) * 0.12 * s;
          eng.camera.position.y += (Math.random() - 0.5) * 0.12 * s;
          shakeRef.current = Math.max(0, s - 0.04);
        }
        // Explorer Mode free-look: lookAt is recomputed every frame from
        // camera position + a forward unit vector rotated by lookYawRef.
        // Classic Mode keeps the per-move lookAt set in the useEffect
        // below, so we only override here when Explorer is active.
        if (isExplorerRef.current) {
          // Lerp the actual yaw toward target so Q/E rotates feel smooth.
          // Drag sets both refs so this is a no-op for direct mouse input.
          var _diff = lookYawTargetRef.current - lookYawRef.current;
          if (Math.abs(_diff) > 0.0005) {
            lookYawRef.current += _diff * 0.18;
          } else {
            lookYawRef.current = lookYawTargetRef.current;
          }
          var _ya = lookYawRef.current;
          eng.camera.lookAt(
            eng.camera.position.x + Math.sin(_ya),
            eng.camera.position.y,
            eng.camera.position.z + Math.cos(_ya)
          );
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
        if (!visualEffectsRef.current && eng._particles && eng._particles.length) {
          eng._particles.forEach(function(pt) { eng.scene.remove(pt); if (pt.geometry) pt.geometry.dispose(); if (pt.material) pt.material.dispose(); });
          eng._particles = [];
        }
        if (visualEffectsRef.current && eng._particles && eng._particles.length) {
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

      // Resize observer — keeps WebGL canvas matching container size when
      // fullscreen toggles or the viewport reflows. Without this the maze
      // renders at the original 320px-height and stretches blurry.
      var ro = null;
      try {
        if (typeof ResizeObserver !== 'undefined') {
          ro = new ResizeObserver(function() {
            if (!container || !eng.renderer || !eng.camera) return;
            var w = container.clientWidth, hpx = container.clientHeight;
            if (w > 0 && hpx > 0) {
              eng.renderer.setSize(w, hpx, false);
              eng.camera.aspect = w / hpx;
              eng.camera.updateProjectionMatrix();
            }
          });
          ro.observe(container);
        }
      } catch (e) {}

      return function() {
        cancelAnimationFrame(maze3dAnimRef.current);
        try { if (ro) ro.disconnect(); } catch (e) {}
        try { if (eng._lookCleanup) eng._lookCleanup(); } catch (e) {}
        try { if (eng.scene) eng.scene.traverse(function(obj) { if (obj.geometry && obj.geometry.dispose) obj.geometry.dispose(); if (obj.material) { var mats = Array.isArray(obj.material) ? obj.material : [obj.material]; mats.forEach(function(mat) { if (mat.map && mat.map.dispose) mat.map.dispose(); if (mat.dispose) mat.dispose(); }); } }); } catch (e) {}
        try { if (eng.renderer && eng.renderer.dispose) eng.renderer.dispose(); } catch (e) {}
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

    // Native browser Fullscreen API — sync our isFullscreen state with
    // document.fullscreenElement so the OS chrome hides too. Best-effort:
    // failures (iframe without allowfullscreen, user permission denial)
    // are swallowed since the in-page wrapper still covers the viewport.
    // Also auto-exits when mode leaves 'playing' so the results screen
    // isn't trapped in a small box on a black native-fullscreen page.
    useEffect(function() {
      var shouldBeFs = isFullscreen && mode === 'playing';
      try {
        if (shouldBeFs && !document.fullscreenElement && !document.webkitFullscreenElement) {
          var docEl = document.documentElement;
          var req = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.msRequestFullscreen;
          if (req) {
            var p = req.call(docEl);
            if (p && p.catch) p.catch(function() {});
          }
        } else if (!shouldBeFs && (document.fullscreenElement || document.webkitFullscreenElement)) {
          var ex = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
          if (ex) {
            var px = ex.call(document);
            if (px && px.catch) px.catch(function() {});
          }
        }
      } catch (e) {}
    }, [isFullscreen, mode]);

    // Listen for native fullscreenchange (Esc key, browser button) so our
    // state syncs back when the user exits via the browser instead of the
    // in-app toggle.
    useEffect(function() {
      function onFsChange() {
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
          setFullscreen(false);
        }
      }
      document.addEventListener('fullscreenchange', onFsChange);
      document.addEventListener('webkitfullscreenchange', onFsChange);
      return function() {
        document.removeEventListener('fullscreenchange', onFsChange);
        document.removeEventListener('webkitfullscreenchange', onFsChange);
      };
    }, []);

    // Auto-pause when the window loses focus or the tab goes hidden, so
    // the timer + monster don't tick while the student is in another
    // window / talking to a teacher / on a screen-share. They resume
    // explicitly via P key, click, or the Pause chip.
    useEffect(function() {
      if (mode !== 'playing') return;
      function pauseIfPlaying() {
        setPaused(true);
      }
      function onVisChange() { if (document.hidden) pauseIfPlaying(); }
      window.addEventListener('blur', pauseIfPlaying);
      document.addEventListener('visibilitychange', onVisChange);
      return function() {
        window.removeEventListener('blur', pauseIfPlaying);
        document.removeEventListener('visibilitychange', onVisChange);
      };
    }, [mode]);

    // ── Render ──
    if (mode === 'setup') {
      // Parchment-card aesthetic — sits inside the outer amber gradient
      // wrapper from AlloFlowContent and reads like an unrolled scroll on
      // a torchlit table. Replaces the previous slate/violet palette which
      // clashed with the warm dungeon visuals on the canvas.
      // Read the prior personal best for these exact gameplay settings.
      var bestRecord = null;
      try {
        var bestKey = buildMazeBestKey(operation, mazeSize, difficulty, controlMode, chaseMode);
        var keyed = JSON.parse(localStorage.getItem('fluency_maze_bests') || '{}');
        bestRecord = keyed[bestKey] || null;
      } catch (e) { bestRecord = null; }
      return h('div', { style: { maxWidth: 460, margin: '0 auto', padding: '20px 24px', textAlign: 'center', background: 'linear-gradient(180deg, #fef3c7 0%, #fed7aa 100%)', borderRadius: '14px', border: '2px solid #d97706', boxShadow: '0 8px 24px rgba(146,64,14,0.15), inset 0 0 32px rgba(217,119,6,0.08)' } },
        h('div', { style: { fontSize: '36px', marginBottom: '8px' } }, '\uD83C\uDFAF'),
        h('h2', { style: { fontSize: '22px', fontWeight: 900, color: '#78350f', marginBottom: '2px', letterSpacing: '0.04em' } }, tt('math_fluency.fluency_maze', 'Fluency Maze')),
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
          'aria-label': tt('math_fluency.personal_best', 'Personal best: ') + bestRecord.score + ' points in ' + bestRecord.time + ' seconds'
        }, '\uD83C\uDFC6 Best (this mode): ' + bestRecord.score + ' pts ' + (bestRecord.time ? '(' + bestRecord.time + 's)' : '')),
        h('button', {
          onClick: function() { setShowCustomSettings(!showCustomSettings); },
          'aria-expanded': showCustomSettings,
          'aria-controls': 'fluency-maze-custom-settings',
          style: { width: '100%', padding: '8px 14px', marginBottom: '12px', borderRadius: '9px', border: '1px solid #d97706', background: 'rgba(254,243,199,0.8)', color: '#78350f', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }
        }, (showCustomSettings ? '\u25B2 Hide Custom Settings' : '\u25BC Customize Maze') + '  \u00b7  ' + operation + ' / ' + difficulty + ' / ' + mazeSize + (performance2D ? ' / 2D' : ' / 3D Auto')),
        showCustomSettings && (function() {
          var lt = null;
          try { lt = JSON.parse(localStorage.getItem('fluency_maze_lifetime') || 'null'); } catch (e) {}
          if (!lt || !lt.gatesUnlocked) return null;
          var mins = Math.floor((lt.totalSeconds || 0) / 60);
          return h('div', {
            style: {
              display: 'flex', justifyContent: 'center', gap: '14px',
              fontSize: '10px', fontWeight: 700, color: '#92400e',
              marginBottom: '14px', letterSpacing: '0.04em',
              background: 'rgba(254,243,199,0.6)',
              border: '1px solid #fcd34d',
              borderRadius: '8px',
              padding: '6px 10px'
            },
            'aria-label': tt('math_fluency.lifetime_stats', 'Lifetime stats: ') + (lt.gatesUnlocked || 0) + ' gates, ' + (lt.mazesCompleted || 0) + ' mazes, longest streak ' + (lt.longestStreak || 0) + ', ' + mins + ' minutes total'
          },
            h('span', null, '\uD83D\uDDDD ' + (lt.gatesUnlocked || 0) + ' gates'),
            h('span', null, '\uD83C\uDFC1 ' + (lt.mazesCompleted || 0) + ' mazes'),
            h('span', null, '\uD83D\uDD25 x' + (lt.longestStreak || 0)),
            h('span', null, '\u23F1 ' + mins + 'm')
          );
        })(),
        // Daily-streak pill — drives habit formation. Shown only when
        // current streak > 0 (i.e., student has played today).
        (function() {
          var dr = _mfDailyStreak();
          if (!dr.current) return null;
          return h('div', {
            style: {
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'linear-gradient(135deg, #fb923c, #b91c1c)',
              color: '#fef3c7', fontSize: '11px', fontWeight: 800,
              padding: '4px 12px', borderRadius: '999px',
              marginBottom: '12px', border: '1px solid #7c2d12',
              boxShadow: '0 2px 8px rgba(124,45,18,0.3), inset 0 1px 0 rgba(255,235,170,0.25)',
              letterSpacing: '0.04em'
            },
            'aria-label': tt('math_fluency.daily_streak', 'Daily streak: ') + dr.current + ' consecutive days. Longest: ' + (dr.longest || dr.current) + ' days.'
          }, '\uD83D\uDD25 Day ' + dr.current + (dr.longest > dr.current ? ' (best: ' + dr.longest + ')' : ''));
        })(),
        // Mastery badges per operation — bronze (50+), silver (200+),
        // gold (500+) per fact family. Renders only operations the
        // student has earned at least bronze in.
        showCustomSettings && (function() {
          var counts = null;
          try { counts = JSON.parse(localStorage.getItem('fluency_maze_op_counts') || '{}'); } catch (e) { counts = {}; }
          var opNames = { add: 'Add', sub: 'Sub', mul: 'Mul', div: 'Div', volume: tt('math_fluency.volume', 'Volume') };
          var tiered = ['add', 'sub', 'mul', 'div', 'volume'].map(function(k) {
            var n = counts[k] || 0;
            var t = _mfMasteryTier(n);
            return t ? { op: k, name: opNames[k], n: n, t: t } : null;
          }).filter(Boolean);
          if (!tiered.length) return null;
          return h('div', {
            style: {
              display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px',
              marginBottom: '14px'
            },
            'aria-label': tt('math_fluency.mastery_badges_earned', 'Mastery badges earned: ') + tiered.map(function(x) { return x.t.label + ' in ' + x.name + ' (' + x.n + ')'; }).join(', ')
          }, tiered.map(function(x) {
            return h('span', {
              key: x.op,
              style: {
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                background: x.t.tier === 'gold' ? 'linear-gradient(135deg,#fef3c7,#fde68a)'
                          : x.t.tier === 'silver' ? 'linear-gradient(135deg,#f8fafc,#e2e8f0)'
                          : 'linear-gradient(135deg,#fed7aa,#fdba74)',
                color: x.t.tier === 'gold' ? '#78350f' : x.t.tier === 'silver' ? '#475569' : '#9a3412',
                border: '1px solid ' + (x.t.tier === 'gold' ? '#f59e0b' : x.t.tier === 'silver' ? '#94a3b8' : '#c2410c'),
                fontSize: '10px', fontWeight: 800, padding: '3px 9px', borderRadius: '999px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
                letterSpacing: '0.04em'
              },
              title: x.t.label + ' ' + x.name + ': ' + x.n + ' gates'
            }, x.t.emoji + ' ' + x.name);
          }));
        })(),
        // Avatar picker — small row of emoji buttons. The chosen one
        // renders as the player on the 2D minimap / fallback canvas.
        // Persisted via _savePrefs so each student keeps their pick.
        showCustomSettings && (function() {
          var avatars = ['🐱', '🐶', '🦊', '🐉', '🤖', '👻', '🦁', '🐼'];
          return h('div', {
            style: { display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center', marginBottom: '12px' },
            'aria-label': tt('math_fluency.choose_your_character', 'Choose your character')
          }, avatars.map(function(av) {
            var sel = playerAvatar === av;
            return h('button', {
              key: 'av-' + av,
              onClick: function() { setPlayerAvatar(av); },
              'aria-pressed': sel,
              'aria-label': 'Character ' + av,
              style: {
                width: '36px', height: '36px', fontSize: '20px',
                borderRadius: '8px', cursor: 'pointer',
                background: sel ? 'linear-gradient(135deg,#fbbf24,#f59e0b)' : 'rgba(254,243,199,0.85)',
                border: '2px solid ' + (sel ? '#b45309' : '#fcd34d'),
                boxShadow: sel ? '0 0 8px rgba(245,158,11,0.5)' : 'none',
                transition: 'transform 120ms',
                transform: sel ? 'scale(1.08)' : 'scale(1)'
              }
            }, av);
          }));
        })(),
        // Control mode — Classic (every step is a question, fluency drill)
        // vs Explorer (each path is a question, free-look 3D camera, fog of
        // war on minimap). Toggle persisted via _prefs.controlMode.
        showCustomSettings && (function() {
          var modes = [
            { id: 'classic',  label: '🎯 Classic',  hint: tt('math_fluency.every_step_is_a_question_fluency_drill', 'Every step is a question — fluency drill') },
            { id: 'explorer', label: '🎮 Explorer', hint: tt('math_fluency.each_path_is_a_question_adventure_with_f', 'Each path is a question — adventure with free look + fog of war') }
          ];
          return h('div', {
            style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', marginBottom: '14px' },
            'aria-label': tt('math_fluency.control_mode', 'Control mode')
          },
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' } },
              modes.map(function(m) {
                var sel = controlMode === m.id;
                return h('button', {
                  key: 'cm-' + m.id,
                  onClick: function() { setControlMode(m.id); },
                  'aria-pressed': sel,
                  title: m.hint,
                  style: {
                    padding: '6px 14px', borderRadius: '999px', fontSize: '11px', fontWeight: 800, cursor: 'pointer',
                    background: sel ? 'linear-gradient(135deg, #7c3aed, #5b21b6)' : 'rgba(254,243,199,0.85)',
                    color: sel ? '#fff' : '#78350f',
                    border: '1px solid ' + (sel ? '#6d28d9' : '#fcd34d'),
                    boxShadow: sel ? '0 0 8px rgba(124,58,237,0.45)' : 'none',
                    letterSpacing: '0.04em'
                  }
                }, m.label);
              })
            ),
            h('div', { style: { fontSize: '10px', color: '#92400e', fontStyle: 'italic', marginTop: '2px' } },
              isExplorer
                ? tt('math_fluency.each_path_requires_one_math_fact_drag_to', 'Each path requires one math fact. Drag to look around.')
                : tt('math_fluency.every_step_requires_a_math_fact_classic', 'Every step requires a math fact. Classic fluency drill.')
            )
          );
        })(),
        // Quick-Start presets — one-tap setup for the most common modes.
        // Each preset writes all three dimensions (op + difficulty + size)
        // so a younger student doesn't have to click through every selector
        // before they can start. Highlighted when current settings match.
        (function() {
          var presets = [
            { id: 'easy',   label: '🌱 Easy',   op: 'add',   diff: 'single', size: 'small'  },
            { id: 'medium', label: '🪜 Medium', op: 'mul',   diff: 'single', size: 'medium' },
            { id: 'hard',   label: '🔥 Hard',   op: 'mul',   diff: 'double', size: 'large'  },
            { id: 'mixed',  label: '🎲 Mixed',  op: 'mixed', diff: 'single', size: 'medium' }
          ];
          return h('div', {
            style: { display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', marginBottom: '14px' },
            'aria-label': tt('math_fluency.quick_start_presets', 'Quick-start presets')
          }, presets.map(function(p) {
            var match = operation === p.op && difficulty === p.diff && mazeSize === p.size;
            return h('button', {
              key: p.id,
              onClick: function() { setOperation(p.op); setDifficulty(p.diff); setMazeSize(p.size); },
              'aria-pressed': match,
              title: p.op + ' / ' + p.diff + ' / ' + p.size,
              style: {
                padding: '5px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: 800, cursor: 'pointer',
                background: match ? 'linear-gradient(135deg, #15803d, #166534)' : 'rgba(254,243,199,0.85)',
                color: match ? '#fff' : '#78350f',
                border: '1px solid ' + (match ? '#22c55e' : '#fcd34d'),
                boxShadow: match ? '0 0 8px rgba(34,197,94,0.35)' : 'none',
                letterSpacing: '0.04em'
              }
            }, p.label);
          }));
        })(),
        h('div', { id: 'fluency-maze-custom-settings', hidden: !showCustomSettings },
        // Operation selector
        h('div', { style: { display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '12px', flexWrap: 'wrap' } },
          ['add', 'sub', 'mul', 'div', 'mixed', 'volume'].map(function(op) {
            var labels = { add: '➕ Add', sub: '➖ Sub', mul: '✖️ Mul', div: '➗ Div', mixed: '🔀 Mixed', volume: '🧊 Volume' };
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
            }, d === 'single' ? tt('math_fluency.single_digit_0_12_2', 'Single Digit (0-12)') : tt('math_fluency.extended_numbers', 'Extended (10-99; facts 10-20)'));
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
        h('label', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '10px', fontSize: '12px', color: '#78350f', fontWeight: 600, cursor: 'pointer' } },
          h('input', { type: 'checkbox', checked: chaseMode, onChange: function() { setChaseMode(!chaseMode); }, style: { accentColor: '#b45309' } }),
          '\uD83D\uDC7E Chase Mode', h('span', { style: { fontSize: '10px', color: '#475569' } }, '(monster pursues you!)')
        ),
        h('label', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '10px', fontSize: '12px', color: '#78350f', fontWeight: 600, cursor: 'pointer' } },
          h('input', { type: 'checkbox', checked: performance2D, onChange: function() { setPerformance2D(!performance2D); }, style: { accentColor: '#15803d' } }),
          tt('math_fluency.performance_2d_mode', '2D Performance Mode'), h('span', { style: { fontSize: '10px', color: '#475569' } }, tt('math_fluency.performance_2d_detail', '(for older or shared devices)'))
        ),
        h('fieldset', { className: 'mf-maze-comfort-settings', style: { border: '2px solid #f0d3ad', borderRadius: '14px', padding: '12px', margin: '0 0 14px', background: 'rgba(255,251,235,0.62)', textAlign: 'left' } },
          h('legend', { style: { padding: '0 7px', color: '#78350f', fontSize: '13px', fontWeight: 900 } }, tt('math_fluency.maze_comfort', 'Maze Comfort')),
          h('p', { style: { margin: '-2px 0 10px', color: '#64748b', fontSize: '11px', lineHeight: 1.45 } }, 'Adjust motion, contrast, and the map without changing the math challenge.'),
          h('div', { style: { color: '#92400e', fontSize: '10px', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' } }, 'Display and motion'),
          h('div', { className: 'mf-maze-comfort-grid', style: { display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '8px', marginBottom: '12px' } },
            [
              { label: tt('math_fluency.reduced_motion', 'Reduced motion'), detail: 'Limits animated effects', value: mazeReducedMotion, set: setMazeReducedMotion },
              { label: tt('math_fluency.high_contrast', 'High contrast'), detail: 'Strengthens edges and labels', value: mazeHighContrast, set: setMazeHighContrast },
              { label: tt('math_fluency.visual_effects', 'Visual effects'), detail: 'Glow, particles, and celebrations', value: visualEffects, set: setVisualEffects },
              { label: tt('math_fluency.simplified_minimap', 'Simplified minimap'), detail: 'Shows only essential markers', value: simplifiedMinimap, set: setSimplifiedMinimap }
            ].map(function(item) { return h('label', { key: item.label, className: 'mf-maze-comfort-toggle', style: { display: 'flex', gap: '8px', alignItems: 'flex-start', color: '#78350f' } }, h('input', { type: 'checkbox', checked: item.value, onChange: function() { item.set(!item.value); } }), h('span', null, h('strong', { style: { display: 'block', fontSize: '11px', lineHeight: 1.25 } }, item.label), h('small', { style: { display: 'block', marginTop: '3px', color: '#64748b', fontSize: '9px', lineHeight: 1.3 } }, item.detail))); })
          ),
          h('div', { style: { color: '#92400e', fontSize: '10px', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' } }, 'View controls'),
          h('div', { className: 'mf-maze-view-grid', style: { display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '8px' } },
            h('label', { className: 'mf-maze-view-control', style: { display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '6px', color: '#78350f', fontSize: '11px', fontWeight: 800 } }, tt('math_fluency.camera_sensitivity', 'Camera sensitivity'), h('span', { style: { padding: '2px 6px', borderRadius: '999px', background: '#fff7ed', color: '#9a3412' } }, cameraSensitivity.toFixed(1) + 'x'), h('input', { type: 'range', min: 0.5, max: 2, step: 0.1, value: cameraSensitivity, onChange: function(e) { setCameraSensitivity(e.target.value); }, style: { gridColumn: '1 / -1', width: '100%' } })),
            h('label', { className: 'mf-maze-view-control', style: { display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '6px', color: '#78350f', fontSize: '11px', fontWeight: 800 } }, tt('math_fluency.field_of_view', 'Field of view'), h('select', { value: cameraFov, onChange: function(e) { setCameraFov(e.target.value); }, 'aria-label': tt('math_fluency.field_of_view', 'Field of view'), style: { minHeight: '36px', borderRadius: '8px', border: '1px solid #d97706', color: '#78350f', background: '#fff' } }, h('option', { value: 65 }, 'Narrow'), h('option', { value: 80 }, 'Standard'), h('option', { value: 95 }, 'Wide'))),
            h('label', { className: 'mf-maze-view-control', style: { display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '6px', color: '#78350f', fontSize: '11px', fontWeight: 800, gridColumn: '1 / -1' } }, tt('math_fluency.brightness', 'Brightness'), h('span', { style: { padding: '2px 6px', borderRadius: '999px', background: '#fff7ed', color: '#9a3412' } }, Math.round(mazeBrightness * 100) + '%'), h('input', { type: 'range', min: 0.8, max: 1.3, step: 0.1, value: mazeBrightness, onChange: function(e) { setMazeBrightness(e.target.value); }, style: { gridColumn: '1 / -1', width: '100%' } }))
          )
        ),
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
        gold:   { emoji: '\uD83E\uDD47', label: tt('math_fluency.gold_time', 'Gold Time'),   color: '#d97706', bg: 'linear-gradient(135deg,#fef3c7,#fde68a)', border: '#f59e0b' },
        silver: { emoji: '\uD83E\uDD48', label: tt('math_fluency.silver_time', 'Silver Time'), color: '#64748b', bg: 'linear-gradient(135deg,#f8fafc,#e2e8f0)', border: '#94a3b8' },
        bronze: { emoji: '\uD83E\uDD49', label: tt('math_fluency.bronze_time', 'Bronze Time'), color: '#92400e', bg: 'linear-gradient(135deg,#fed7aa,#fdba74)', border: '#c2410c' }
      }[medal] : null;
      return h('div', { style: { maxWidth: 460, margin: '0 auto', padding: '24px 24px 20px', textAlign: 'center', background: won ? 'linear-gradient(180deg, #fef3c7 0%, #fed7aa 100%)' : 'linear-gradient(180deg, #fee2e2 0%, #fecaca 100%)', borderRadius: '14px', border: '2px solid ' + (won ? '#d97706' : '#b91c1c'), boxShadow: '0 8px 24px rgba(146,64,14,0.18), inset 0 0 32px rgba(217,119,6,0.08)', position: 'relative' } },
        won && visualEffects && !mazeReducedMotion && h('div', { style: { position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 9999 }, 'aria-hidden': 'true' },
          (function() {
            var pieces = [];
            for (var i = 0; i < 36; i++) {
              var hue = (i * 47) % 360;
              var startX = (i * 2.78 + Math.random() * 6) % 100;
              var dur = 1.7 + Math.random() * 1.6;
              var delay = Math.random() * 0.4;
              var w = 8 + Math.floor(Math.random() * 7);
              var hh = 10 + Math.floor(Math.random() * 9);
              pieces.push(h('div', {
                key: 'cf-' + i,
                className: 'allo-confetti-piece',
                style: {
                  left: startX + '%',
                  width: w + 'px',
                  height: hh + 'px',
                  background: 'hsl(' + hue + ', 78%, 58%)',
                  animationDuration: dur.toFixed(2) + 's',
                  animationDelay: delay.toFixed(2) + 's',
                  boxShadow: '0 0 6px hsla(' + hue + ',70%,55%,0.55)'
                }
              }));
            }
            return pieces;
          })()
        ),
        h('div', { style: { fontSize: '54px', marginBottom: '4px', filter: 'drop-shadow(0 3px 6px rgba(146,64,14,0.4))' } }, won ? '\uD83C\uDFC6' : '\uD83D\uDC7E'),
        h('h2', { style: { fontSize: '24px', fontWeight: 900, color: won ? '#78350f' : '#7f1d1d', marginBottom: '12px', letterSpacing: '0.04em' } },
          won ? tt('math_fluency.you_escaped_the_maze', 'You Escaped the Maze!') : (gameOver ? 'A Shadow Caught You' : tt('math_fluency.game_over', 'Game Over'))),
        // Personal-best comparison for THIS exact mode (op|size|difficulty).
        // Renders only on wins where a prior best for the same settings
        // existed pre-run. Diff is signed so we phrase it correctly when
        // the student matched or fell short of their last attempt.
        won && priorBestSnapshot && (function() {
          var prior = priorBestSnapshot;
          if (!prior.time) return null;
          var diff = prior.time - elapsed;
          var medalBonusNow = medal === 'gold' ? 20 : medal === 'silver' ? 10 : medal === 'bronze' ? 5 : 0;
          var newBest = (typeof prior.score === 'number') && (score + 10 + medalBonusNow) > prior.score;
          var faster = diff > 0;
          var msg = newBest
            ? tt('math_fluency.new_personal_best', 'New personal best! ') + (faster ? diff + 's faster than your previous (' + prior.time + 's)' : tt('math_fluency.beat_your_prior_score_of', 'Beat your prior score of ') + prior.score)
            : (faster
                ? diff + 's faster than your prior best (' + prior.time + 's), same score range'
                : diff === 0
                  ? tt('math_fluency.matched_your_prior_time', 'Matched your prior time (') + prior.time + 's)'
                  : (-diff) + 's slower than your prior best of ' + prior.time + 's');
          return h('div', {
            style: {
              fontSize: '11px', fontWeight: 800,
              color: newBest ? '#fff' : (faster ? '#14532d' : '#7c2d12'),
              background: newBest ? 'linear-gradient(135deg, #f59e0b, #b45309)' : (faster ? 'rgba(220,252,231,0.7)' : 'rgba(254,243,199,0.7)'),
              border: '1px solid ' + (newBest ? '#fbbf24' : faster ? '#86efac' : '#fcd34d'),
              boxShadow: newBest ? '0 0 12px rgba(251,191,36,0.5)' : 'none',
              borderRadius: '999px', padding: '4px 14px',
              marginBottom: '12px', display: 'inline-block'
            },
            'aria-label': msg
          }, (newBest ? '🏅 ' : faster ? '⚡ ' : '⏱ ') + msg);
        })(),
        // Lifetime-average comparison — visible for wins after at least
        // one prior completed maze. Computes avg = totalSeconds /
        // mazesCompleted (excluding this run, since the lifetime bump
        // happens before render). Phrasing depends on direction.
        won && (function() {
          try {
            var lt = JSON.parse(localStorage.getItem('fluency_maze_lifetime') || '{}');
            var prior = (lt.mazesCompleted || 0) - 1;
            if (prior < 1) return null;
            var avg = Math.round(((lt.totalSeconds || 0) - elapsed) / prior);
            if (avg <= 0) return null;
            var diff = avg - elapsed;
            var faster = diff > 0;
            var msg = faster
              ? tt('math_fluency.faster_than_your_average_by', 'Faster than your average by ') + diff + 's (avg: ' + avg + 's)'
              : diff === 0
                ? tt('math_fluency.right_on_your_average_pace', 'Right on your average pace (') + avg + 's)'
                : (-diff) + 's slower than your average (avg: ' + avg + 's)';
            return h('div', {
              style: {
                fontSize: '11px', fontWeight: 700,
                color: faster ? '#15803d' : (diff === 0 ? '#92400e' : '#a16207'),
                background: faster ? 'rgba(220,252,231,0.7)' : 'rgba(254,243,199,0.7)',
                border: '1px solid ' + (faster ? '#86efac' : '#fcd34d'),
                borderRadius: '999px',
                padding: '4px 12px',
                marginBottom: '12px',
                display: 'inline-block'
              },
              'aria-label': msg
            }, (faster ? '\u26A1 ' : '\u23F1 ') + msg);
          } catch (e) { return null; }
        })(),
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
              tt('math_fluency.finished_in', 'Finished in ') + elapsed + 's \u2022 target ' + Math.round(MAZE_ROWS * MAZE_COLS * 2 * (medal === 'gold' ? 0.6 : medal === 'silver' ? 1 : 1.8)) + 's')
          )
        ),
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' } },
          h('div', { style: { background: 'rgba(254,243,199,0.7)', borderRadius: '10px', padding: '10px', border: '1px solid #fcd34d' } },
            h('div', { style: { fontSize: '26px', fontWeight: 900, color: '#15803d' } }, String(correct)),
            h('div', { style: { fontSize: '10px', color: '#92400e', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' } }, tt('math_fluency.gates_unlocked', 'Gates Unlocked'))),
          h('div', { style: { background: 'rgba(254,243,199,0.7)', borderRadius: '10px', padding: '10px', border: '1px solid #fcd34d' } },
            h('div', { style: { fontSize: '26px', fontWeight: 900, color: '#b91c1c' } }, String(wrong)),
            h('div', { style: { fontSize: '10px', color: '#92400e', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' } }, tt('math_fluency.wrong_tries', 'Wrong Tries'))),
          h('div', { style: { background: 'rgba(254,243,199,0.7)', borderRadius: '10px', padding: '10px', border: '1px solid #fcd34d' } },
            h('div', { style: { fontSize: '26px', fontWeight: 900, color: '#7c2d12' } }, String(dcpm)),
            h('div', { style: { fontSize: '10px', color: '#92400e', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' } }, tt('math_fluency.facts_min', 'Facts/Min'))),
          h('div', { style: { background: 'rgba(254,243,199,0.7)', borderRadius: '10px', padding: '10px', border: '1px solid #fcd34d' } },
            h('div', { style: { fontSize: '26px', fontWeight: 900, color: '#a16207' } }, elapsed + 's'),
            h('div', { style: { fontSize: '10px', color: '#92400e', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' } }, tt('math_fluency.time', 'Time')))
        ),
        // Facts to Practice — surfaces the top 3 facts the student got
        // wrong this run, sorted by wrong count then by wrong rate.
        // Pedagogical signal: the run wasn't just "X correct / Y wrong",
        // it was "you stumbled on these specific facts." Hidden if
        // there were no wrong answers (the student crushed it).
        (function() {
          var stats = factStatsRef.current || {};
          var rows = [];
          for (var k in stats) if (stats.hasOwnProperty(k)) {
            var s = stats[k];
            if (s.wrong > 0) rows.push({ text: k, wrong: s.wrong, correct: s.correct });
          }
          if (rows.length === 0) return null;
          rows.sort(function(a, b) {
            if (b.wrong !== a.wrong) return b.wrong - a.wrong;
            return (b.wrong / Math.max(1, b.wrong + b.correct)) - (a.wrong / Math.max(1, a.wrong + a.correct));
          });
          rows = rows.slice(0, 3);
          return h('div', {
            style: { background: 'rgba(254,226,226,0.55)', border: '1px dashed #f87171', borderRadius: '10px', padding: '10px 12px', marginBottom: '14px' },
            'aria-label': tt('math_fluency.facts_to_practice', 'Facts to practice: ') + rows.map(function(r) { return r.text + ' missed ' + r.wrong + ' time' + (r.wrong > 1 ? 's' : ''); }).join(', ')
          },
            h('div', { style: { fontSize: '10px', fontWeight: 800, color: '#7f1d1d', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' } }, '📚 Facts to Practice'),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' } },
              rows.map(function(rw, i) {
                return h('span', {
                  key: i,
                  style: { fontSize: '12px', fontWeight: 700, fontFamily: 'monospace', color: '#7f1d1d', background: '#fff', border: '1px solid #fca5a5', padding: '3px 10px', borderRadius: '6px' }
                }, rw.text + (rw.wrong > 1 ? ' (×' + rw.wrong + ')' : ''));
              })
            )
          );
        })(),
        h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' } },
          h('button', { onClick: function() { startMaze(false); }, style: { padding: '10px 24px', background: 'linear-gradient(135deg, #b45309, #7c2d12)', color: '#fef3c7', border: '2px solid #78350f', borderRadius: '10px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(120,53,15,0.35)' } }, '\uD83D\uDD04 Play Again'),
          // Same-Maze replay - reuses the cached layout + key cell so the
          // student can retry the exact run to beat their time.
          lastRunRef.current && h('button', { onClick: function() { startMaze(true); }, title: tt('math_fluency.replay_the_same_maze_layout', 'Replay the same maze layout'), style: { padding: '10px 18px', background: '#fef3c7', color: '#78350f', border: '2px solid #fcd34d', borderRadius: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' } }, '\u21A9 Same Maze'),
          h('button', { onClick: function() {
            try {
              var opLabel = { add: tt('math_fluency.addition', 'Addition'), sub: tt('math_fluency.subtraction', 'Subtraction'), mul: tt('math_fluency.multiplication', 'Multiplication'), div: tt('math_fluency.division', 'Division'), mixed: 'Mixed', volume: tt('math_fluency.volume', 'Volume') }[operation] || operation;
              var sizeLabel = (MAZE_SIZES[mazeSize] && MAZE_SIZES[mazeSize].label) || mazeSize;
              var medalIcon = medal === 'gold' ? '\uD83E\uDD47' : medal === 'silver' ? '\uD83E\uDD48' : medal === 'bronze' ? '\uD83E\uDD49' : '';
              var card = (won ? '\uD83C\uDFC6 Math Fluency Maze' : '\uD83D\uDC7E Math Fluency Maze') + '\n'
                + '\u2705 ' + correct + ' gates  ·  \u274C ' + wrong + ' wrong\n'
                + '\u23F1 ' + elapsed + 's  ·  \uD83C\uDFAF ' + score + ' pts' + (medalIcon ? '  ·  ' + medalIcon + ' ' + medal.toUpperCase() : '') + '\n'
                + 'Mode: ' + opLabel + ' / ' + (difficulty === 'single' ? tt('math_fluency.single_digit', 'Single-digit') : tt('math_fluency.double_digit', 'Double-digit')) + ' / ' + sizeLabel;
              if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(card).then(function() {
                  if (addToast) addToast('\uD83D\uDCCB Result copied to clipboard', 'success');
                  else _mfAnnounce(tt('math_fluency.result_copied_to_clipboard', 'Result copied to clipboard.'));
                }, function() {
                  if (addToast) addToast(tt('math_fluency.could_not_copy_try_selecting_ctrl_c', 'Could not copy — try selecting + Ctrl+C'), 'error');
                });
              } else if (addToast) {
                addToast(tt('math_fluency.clipboard_not_available_in_this_browser', 'Clipboard not available in this browser'), 'error');
              }
            } catch (e) { if (addToast) addToast(tt('math_fluency.copy_failed', 'Copy failed: ') + e.message, 'error'); }
          }, style: { padding: '10px 18px', background: '#fef3c7', color: '#78350f', border: '2px solid #fcd34d', borderRadius: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' } }, '\uD83D\uDCCB Copy Result'),
          h('button', { onClick: function() { setMode('setup'); }, style: { padding: '10px 20px', background: '#fef3c7', color: '#78350f', border: '2px solid #fcd34d', borderRadius: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' } }, '\u2699 Settings')
        )
      );
    }

    var has3D = !!window.THREE && !performance2D;
    var objectiveText = keyCollected ? tt('math_fluency.objective_reach_exit', 'Exit unlocked - reach the star portal') : tt('math_fluency.objective_find_key', 'Objective: find the golden key');
    var objectiveIcon = keyCollected ? '\u2B50' : '\uD83D\uDDDD\uFE0F';
    var objectiveTarget = !keyCollected && keyPosRef.current
      ? { r: keyPosRef.current.r, c: keyPosRef.current.c }
      : { r: MAZE_ROWS - 1, c: MAZE_COLS - 1 };
    var objectiveDistance = maze ? findMazePathDistance(maze, playerPos, objectiveTarget) : null;
    var objectiveDistanceLabel = objectiveDistance == null ? '' : objectiveDistance === 0 ? 'Here' : objectiveDistance + ' gate' + (objectiveDistance === 1 ? '' : 's') + ' away';
    var chaseRadar = chaseMode && moveCount > 0 ? buildChaseRadar(maze, playerPos, monsterPos) : null;
    var chaseStatus = !chaseMode ? null : moveCount === 0
      ? { level: 'armed', label: 'Chase armed', distance: null, bearing: null, strength: 1, message: 'Chase begins after your first move.' }
      : chaseRadar;
    function mazeDirectionAvailable(dir) {
      if (!maze || !maze[playerPos.r] || !maze[playerPos.r][playerPos.c] || currentProblem || paused || helpOpen || !tutorialSeen) return false;
      var walls = maze[playerPos.r][playerPos.c].walls;
      return dir === 'up' ? !walls.top : dir === 'right' ? !walls.right : dir === 'down' ? !walls.bottom : !walls.left;
    }
    function movementButtonStyle(dir) {
      var enabled = mazeDirectionAvailable(dir);
      var hinted = enabled && hintDir === dir;
      return { display: 'grid', placeItems: 'center', gap: '1px', padding: isFullscreen ? '18px' : '12px', borderRadius: '8px', background: hinted ? 'linear-gradient(180deg, #fde68a 0%, #f59e0b 100%)' : (enabled ? 'linear-gradient(180deg, #a8957d 0%, #78350f 100%)' : '#3a2e26'), color: hinted ? '#78350f' : (enabled ? '#fef3c7' : '#78716c'), border: '2px solid ' + (hinted ? '#fef3c7' : (enabled ? '#78350f' : '#57534e')), fontSize: isFullscreen ? '28px' : '20px', fontWeight: 700, cursor: enabled ? 'pointer' : 'not-allowed', boxShadow: hinted ? '0 0 18px rgba(251,191,36,0.9)' : (enabled ? 'inset 0 -2px 0 rgba(0,0,0,0.25)' : 'none'), minHeight: isFullscreen ? '64px' : '44px', opacity: enabled ? 1 : 0.5, transform: hinted ? 'scale(1.08)' : 'scale(1)', transition: 'transform 160ms, box-shadow 160ms, background 160ms' };

    }

    // Playing mode
    return h('div', {
      className: 'mf-maze-playing' + (mazeReducedMotion ? ' mf-reduce-motion' : '') + (mazeHighContrast ? ' mf-high-contrast' : ''),
      'data-effects': visualEffects ? 'on' : 'off',
      style: Object.assign({ filter: 'brightness(' + mazeBrightness + ')' }, isFullscreen
        ? { position: 'fixed', inset: 0, zIndex: 9999, padding: '14px clamp(14px, 4vw, 48px)', background: 'linear-gradient(180deg, #1a0e08 0%, #2a1810 60%, #1a0e08 100%)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }
        : { maxWidth: 720, margin: '0 auto', position: 'relative' })
    },
      // Responsive HUD: gameplay evidence stays grouped separately from utility controls.
      h('div', { className: 'mf-maze-hud', style: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', padding: isFullscreen ? '12px 14px' : '10px', background: 'linear-gradient(135deg, #312e81 0%, #1e1b4b 58%, #422006 140%)', borderRadius: '14px', marginBottom: '8px', fontSize: isFullscreen ? '13px' : '11px', gap: isFullscreen ? '12px' : '9px', border: '2px solid rgba(167,139,250,0.58)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 8px 24px rgba(49,46,129,0.22)' } },
        h('div', { className: 'mf-maze-hud-main', style: { display: 'grid', gap: '5px', minWidth: 0 } },
          h('div', { className: 'mf-maze-hud-stats', style: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: isFullscreen ? '12px' : '9px' } },
            h('span', { className: 'mf-maze-hud-stat', 'data-tone': 'success', 'aria-label': correct + ' correct answers' }, h('span', { 'aria-hidden': 'true' }, '\u2705'), h('span', null, h('strong', null, String(correct)), h('small', null, 'Correct'))),
            h('span', { className: 'mf-maze-hud-stat', 'data-tone': 'warning', 'aria-label': wrong + ' missed answers' }, h('span', { 'aria-hidden': 'true' }, '\u274C'), h('span', null, h('strong', null, String(wrong)), h('small', null, 'Missed'))),
            h('span', { className: 'mf-maze-hud-stat', 'data-tone': 'score', 'aria-label': score + ' points' }, h('span', { 'aria-hidden': 'true' }, '\uD83C\uDFAF'), h('span', null, h('strong', null, String(score)), h('small', null, 'Points'))),
            streak > 0 && h('span', { style: { color: streak >= 3 ? '#fff' : '#fdba74', background: streak >= 3 ? 'linear-gradient(90deg,#f97316,#ef4444)' : 'rgba(249,115,22,0.12)', fontWeight: 850, padding: '2px 8px', borderRadius: '999px', border: streak >= 3 ? '1px solid #fbbf24' : '1px solid rgba(249,115,22,0.3)', boxShadow: streak >= 3 ? '0 0 8px rgba(251,191,36,0.5)' : 'none' } }, '\uD83D\uDD25 x' + streak),
            h('span', { className: 'mf-maze-hud-stat', 'aria-label': elapsed + ' seconds elapsed' }, h('span', { 'aria-hidden': 'true' }, '\u23F1'), h('span', null, h('strong', null, elapsed + 's'), h('small', null, 'Time')))
          ),
          h('div', { className: 'mf-maze-hud-context', style: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '5px' } },
            (function() {
              var goal = !keyCollected && keyPosRef.current
                ? { r: keyPosRef.current.r, c: keyPosRef.current.c, label: 'Key', icon: '\uD83D\uDDDD' }
                : { r: MAZE_ROWS - 1, c: MAZE_COLS - 1, label: tt('math_fluency.exit_2', 'Exit'), icon: '\u2B50' };
              var dr = goal.r - playerPos.r, dc = goal.c - playerPos.c;
              if (dr === 0 && dc === 0) return null;
              var deg = (Math.atan2(dr, dc) * 180 / Math.PI + 360) % 360;
              var dirsByDeg = ['E','SE','S','SW','W','NW','N','NE'];
              var label = dirsByDeg[Math.round(deg / 45) % 8];
              return h('span', { className: 'mf-maze-bearing', style: { color: '#fde68a', fontWeight: 800, fontSize: '10px', background: 'rgba(254,243,199,0.12)', border: '1px solid rgba(254,243,199,0.28)', padding: '2px 7px', borderRadius: '999px', letterSpacing: '0.04em' }, 'aria-label': goal.label + ' is to the ' + label + (objectiveDistanceLabel ? ', ' + objectiveDistanceLabel : '') }, goal.icon + ' ' + label + (objectiveDistanceLabel ? ' - ' + objectiveDistanceLabel : ''));
            })(),
            chaseStatus && (function() {
              var radarPalette = chaseStatus.level === 'caught' || chaseStatus.level === 'danger'
                ? { bg: 'rgba(127,29,29,0.72)', border: '#f87171', color: '#fee2e2' }
                : chaseStatus.level === 'near'
                  ? { bg: 'rgba(154,52,18,0.64)', border: '#fb923c', color: '#ffedd5' }
                  : chaseStatus.level === 'watch'
                    ? { bg: 'rgba(161,98,7,0.48)', border: '#facc15', color: '#fef9c3' }
                    : { bg: 'rgba(30,41,59,0.5)', border: '#94a3b8', color: '#e2e8f0' };
              var detail = chaseStatus.distance == null ? 'after first move' : chaseStatus.distance + ' gate' + (chaseStatus.distance === 1 ? '' : 's') + (chaseStatus.bearing ? ' - ' + chaseStatus.bearing : '');
              return h('span', { className: 'mf-maze-chase-radar', role: 'status', 'aria-live': 'polite', 'data-danger-level': chaseStatus.level, 'aria-label': chaseStatus.message, style: { display: 'inline-flex', alignItems: 'center', gap: '5px', color: radarPalette.color, fontWeight: 850, fontSize: '10px', background: radarPalette.bg, border: '1px solid ' + radarPalette.border, padding: '3px 7px', borderRadius: '8px' } },
                h('span', { 'aria-hidden': 'true' }, '\uD83D\uDC7E'),
                h('span', null, chaseStatus.label),
                h('span', { style: { opacity: 0.82, fontWeight: 700 } }, detail),
                h('span', { className: 'mf-maze-radar-pips', 'aria-hidden': 'true', style: { display: 'inline-flex', gap: '2px', marginLeft: '2px' } }, [1,2,3,4].map(function(level) {
                  return h('i', { key: level, style: { display: 'block', width: '4px', height: '10px', borderRadius: '2px', background: level <= chaseStatus.strength ? radarPalette.border : 'rgba(255,255,255,0.2)' } });
                }))
              );
            })(),
            isExplorer && h('span', { style: { color: '#ddd6fe', fontWeight: 750, background: 'rgba(124,58,237,0.25)', border: '1px solid rgba(167,139,250,0.45)', padding: '2px 7px', borderRadius: '999px' }, 'aria-label': tt('math_fluency.explorer_mode_active', 'Explorer mode active') }, '\uD83C\uDFAE Explorer')
          )
        ),
        h('div', { className: 'mf-maze-hud-actions', style: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', gap: '5px' } },
          h('button', { className: 'mf-maze-action-button', onClick: function() { setHelpOpen(true); }, 'aria-label': tt('math_fluency.keyboard_shortcuts', 'Keyboard shortcuts'), title: tt('math_fluency.keyboard_shortcuts_key', 'Keyboard shortcuts (? key)'), style: { padding: '5px 8px', fontSize: '11px', fontWeight: 750, background: 'rgba(254,243,199,0.18)', color: '#fef3c7', border: '1px solid rgba(254,243,199,0.35)', borderRadius: '8px', cursor: 'pointer' } }, h('span', { 'aria-hidden': 'true' }, '?'), h('span', { className: 'mf-maze-action-label' }, ' Help')),
          h('button', { className: 'mf-maze-action-button', onClick: _toggleMute, 'aria-pressed': mutedLocal, 'aria-label': mutedLocal ? tt('math_fluency.sound_off_press_to_unmute', 'Sound off. Press to unmute.') : tt('math_fluency.sound_on_press_to_mute', 'Sound on. Press to mute.'), title: tt('math_fluency.mute_unmute_m_key', 'Mute / unmute (M key)'), style: { padding: '5px 8px', fontSize: '11px', fontWeight: 750, background: mutedLocal ? '#fbbf24' : 'rgba(254,243,199,0.18)', color: mutedLocal ? '#7c2d12' : '#fef3c7', border: '1px solid ' + (mutedLocal ? '#fbbf24' : 'rgba(254,243,199,0.35)'), borderRadius: '8px', cursor: 'pointer' } }, h('span', { 'aria-hidden': 'true' }, mutedLocal ? '\uD83D\uDD07' : '\uD83D\uDD0A'), h('span', { className: 'mf-maze-action-label' }, mutedLocal ? ' Unmute' : ' Sound')),
          h('button', { className: 'mf-maze-action-button', onClick: function() { setPaused(function(v) { return !v; }); }, 'aria-label': paused ? tt('math_fluency.resume_game', 'Resume game') : tt('math_fluency.pause_game', 'Pause game'), 'aria-pressed': paused, title: tt('math_fluency.pause_resume_p_key', 'Pause / resume (P key)'), style: { padding: '5px 8px', fontSize: '11px', fontWeight: 750, background: paused ? '#fbbf24' : 'rgba(254,243,199,0.18)', color: paused ? '#7c2d12' : '#fef3c7', border: '1px solid ' + (paused ? '#fbbf24' : 'rgba(254,243,199,0.35)'), borderRadius: '8px', cursor: 'pointer' } }, h('span', { 'aria-hidden': 'true' }, paused ? '\u25B6' : '\u23F8'), h('span', { className: 'mf-maze-action-label' }, paused ? ' Resume' : ' Pause')),
          h('button', { className: 'mf-maze-action-button', onClick: function() { setFullscreen(function(v) { return !v; }); }, 'aria-label': isFullscreen ? tt('math_fluency.exit_fullscreen', 'Exit fullscreen') : tt('math_fluency.enter_fullscreen', 'Enter fullscreen'), 'aria-pressed': isFullscreen, title: tt('math_fluency.fullscreen_f_key', 'Fullscreen (F key)'), style: { padding: '5px 8px', fontSize: '11px', fontWeight: 750, background: isFullscreen ? '#fbbf24' : 'rgba(254,243,199,0.18)', color: isFullscreen ? '#7c2d12' : '#fef3c7', border: '1px solid ' + (isFullscreen ? '#fbbf24' : 'rgba(254,243,199,0.35)'), borderRadius: '8px', cursor: 'pointer' } }, h('span', { 'aria-hidden': 'true' }, isFullscreen ? '\u2922' : '\u26F6'), h('span', { className: 'mf-maze-action-label' }, isFullscreen ? ' Exit' : ' Fullscreen')),
          h('button', { className: 'mf-maze-action-button mf-maze-hint-button', onClick: requestHint, disabled: !!hintDir, 'aria-label': tt('math_fluency.show_direction_toward_objective', 'Show direction toward the current objective') + '. Costs 5 points and resets streak.', title: tt('math_fluency.show_direction_toward_objective', 'Show direction toward the current objective (H key) - costs 5 points, resets streak'), style: { padding: '5px 8px', fontSize: '11px', fontWeight: 800, background: hintDir ? '#fbbf24' : 'linear-gradient(135deg, #b45309, #7c2d12)', color: hintDir ? '#7c2d12' : '#fff', border: '1px solid #f59e0b', borderRadius: '8px', cursor: hintDir ? 'default' : 'pointer', opacity: hintDir ? 0.85 : 1 } }, h('span', { 'aria-hidden': 'true' }, '\uD83D\uDCA1'), h('span', { className: 'mf-maze-action-label' }, hintDir ? ' Showing' : ' Hint -5'))
        )
      ),
      h('div', { className: 'mf-maze-quest', 'data-stage': keyCollected ? 'portal' : 'key', role: 'status', 'aria-live': 'polite', 'aria-label': objectiveText + (objectiveDistanceLabel ? '. ' + objectiveDistanceLabel : ''), style: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr) auto', alignItems: 'center', gap: '8px', padding: isFullscreen ? '10px 12px' : '9px 10px', marginBottom: '8px', borderRadius: '14px', background: keyCollected ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' : 'linear-gradient(135deg, #faf5ff 0%, #ede9fe 100%)', border: '2px solid ' + (keyCollected ? '#f59e0b' : '#8b5cf6'), color: '#3f2b1d', boxShadow: '0 5px 18px ' + (keyCollected ? 'rgba(217,119,6,0.14)' : 'rgba(109,40,217,0.12)') } },
        h('div', { className: 'mf-maze-quest-step', 'aria-current': !keyCollected ? 'step' : undefined, style: { display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0, opacity: keyCollected ? 0.78 : 1 } },
          h('span', { 'aria-hidden': 'true', style: { display: 'grid', placeItems: 'center', flex: '0 0 34px', width: '34px', height: '34px', borderRadius: '11px', background: keyCollected ? '#15803d' : '#6d28d9', color: '#fff', fontSize: '17px', boxShadow: !keyCollected ? '0 0 0 4px rgba(124,58,237,0.12)' : 'none' } }, keyCollected ? '\u2713' : '\uD83D\uDDDD\uFE0F'),
          h('span', { style: { minWidth: 0 } }, h('small', { style: { display: 'block', marginBottom: '3px', fontSize: '9px', fontWeight: 900, letterSpacing: '0.1em', opacity: 0.72, textTransform: 'uppercase' } }, keyCollected ? 'Complete' : 'Current quest'), h('strong', { style: { display: 'block', fontSize: isFullscreen ? '14px' : '12px', lineHeight: 1.25 } }, keyCollected ? 'Golden key found' : 'Find the golden key'))
        ),
        h('span', { className: 'mf-maze-quest-connector', 'aria-hidden': 'true', style: { color: keyCollected ? '#d97706' : '#7c3aed', fontWeight: 950 } }, '\u2192'),
        h('div', { className: 'mf-maze-quest-step', 'aria-current': keyCollected ? 'step' : undefined, style: { display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0, opacity: keyCollected ? 1 : 0.58 } },
          h('span', { 'aria-hidden': 'true', style: { display: 'grid', placeItems: 'center', flex: '0 0 34px', width: '34px', height: '34px', borderRadius: '11px', background: keyCollected ? '#d97706' : '#64748b', color: '#fff', fontSize: '17px', boxShadow: keyCollected ? '0 0 0 4px rgba(245,158,11,0.15)' : 'none' } }, keyCollected ? '\u2B50' : '\uD83D\uDD12'),
          h('span', { style: { minWidth: 0 } }, h('small', { style: { display: 'block', marginBottom: '3px', fontSize: '9px', fontWeight: 900, letterSpacing: '0.1em', opacity: 0.72, textTransform: 'uppercase' } }, keyCollected ? 'Current quest' : 'Up next'), h('strong', { style: { display: 'block', fontSize: isFullscreen ? '14px' : '12px', lineHeight: 1.25 } }, keyCollected ? 'Reach the star portal' : 'Exit locked'))
        ),
        h('span', { className: 'mf-maze-distance', style: { justifySelf: 'end', whiteSpace: 'nowrap', padding: '6px 10px', borderRadius: '999px', background: keyCollected ? '#fff7d6' : '#fff', border: '1px solid ' + (keyCollected ? '#f59e0b' : '#c4b5fd'), color: keyCollected ? '#92400e' : '#5b21b6', fontSize: '11px', fontWeight: 900, boxShadow: '0 2px 8px rgba(15,23,42,0.08)' } }, objectiveDistanceLabel || 'Mapping route')
      ),
      // Exploration progress bar - visited cells / total cells. Visual
      // gauge of how much of the maze the student has uncovered. Does not
      // reveal direction info, just progress. Label flips to tt('math_fluency.key_in_hand', 'Key in hand')
      // once collected so the student knows the exit is now unlocked.
      (function() {
        var visited = visitedCellsRef.current || {};
        var visitedCount = 0;
        for (var k in visited) if (visited.hasOwnProperty(k)) visitedCount++;
        var totalCells = MAZE_COLS * MAZE_ROWS;
        var pct = Math.min(100, Math.round((visitedCount / totalCells) * 100));
        var label = keyCollected
          ? '\uD83D\uDDDD\uFE0F Key in hand · ' + pct + '% explored'
          : '\uD83D\uDDFA · ' + pct + '% explored · find the \uD83D\uDDDD\uFE0F';
        return h('div', {
          role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': pct, 'aria-label': label,
          style: {
            position: 'relative', height: isFullscreen ? '20px' : '18px',
            background: 'rgba(58,46,38,0.55)', border: '1px solid #78350f',
            borderRadius: '999px', marginBottom: '6px', overflow: 'hidden',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4)'
          }
        },
          h('div', {
            style: {
              width: pct + '%', height: '100%',
              background: keyCollected
                ? 'linear-gradient(90deg, #f59e0b 0%, #fde68a 50%, #f59e0b 100%)'
                : 'linear-gradient(90deg, #7c3aed 0%, #a855f7 50%, #7c3aed 100%)',
              transition: 'width 240ms cubic-bezier(.5,.05,.5,.95)',
              boxShadow: keyCollected ? '0 0 8px rgba(251,191,36,0.55)' : '0 0 6px rgba(168,85,247,0.45)'
            }
          }),
          h('div', {
            style: {
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: isFullscreen ? '12px' : '10px', fontWeight: 850,
              color: '#fef3c7', letterSpacing: '0.04em',
              textShadow: '0 1px 2px rgba(0,0,0,0.7)',
              pointerEvents: 'none'
            }
          }, label)
        );
      })(),
      !simplifiedMinimap && h('div', { className: 'mf-maze-legend', role: 'note', 'aria-label': 'Minimap legend: you, visited trail, golden key, exit portal' + (chaseMode ? ', and monster when nearby' : ''), style: { display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: isFullscreen ? '12px' : '8px', padding: '5px 8px', marginBottom: '6px', borderRadius: '8px', background: 'rgba(58,46,38,0.08)', border: '1px solid rgba(120,53,15,0.18)', color: isFullscreen ? '#fde68a' : '#78350f', fontSize: '11px', fontWeight: 750 } },
        h('span', null, playerAvatar + ' You'),
        h('span', null, '\u2022 Trail'),
        h('span', null, '\uD83D\uDDDD Key'),
        h('span', null, (keyCollected ? '\u2B50 Exit' : '\uD83D\uDD12 Locked exit')),
        chaseMode ? h('span', null, '\uD83D\uDC7E Monster when nearby') : null
      ),      // 3D View (or 2D fallback). Heights bumped for clarity; in fullscreen
      // the 3D view fills nearly the whole viewport. The ResizeObserver in
      // the init effect keeps the WebGL canvas matched to the container.
      has3D ? h('div', { ref: maze3dRef, className: 'mf-maze-viewport', style: { width: '100%', height: isFullscreen ? 'min(78vh, 900px)' : '440px', borderRadius: '10px', overflow: 'hidden', border: '2px solid ' + (keyCollected ? '#f59e0b' : '#7c3aed'), position: 'relative', background: '#0a0a1a', flex: isFullscreen ? '1 1 auto' : 'none', boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 6px 20px ' + (keyCollected ? 'rgba(245,158,11,0.24)' : 'rgba(124,58,237,0.22)'), transition: 'border-color 220ms, box-shadow 220ms' } }) :
      h('canvas', { ref: canvasRef, className: 'mf-maze-viewport', role: 'application', tabIndex: 0, 'aria-keyshortcuts': 'ArrowUp ArrowDown ArrowLeft ArrowRight W A S D H P F', 'aria-label': 'Interactive 2D fluency maze. ' + objectiveText + (objectiveDistanceLabel ? '. ' + objectiveDistanceLabel : ''), style: { width: '100%', height: 'auto', maxHeight: isFullscreen ? '78vh' : 'none', borderRadius: '10px', border: '3px solid ' + (keyCollected ? '#f59e0b' : '#7c3aed'), display: 'block', boxShadow: '0 6px 20px ' + (keyCollected ? 'rgba(245,158,11,0.28)' : 'rgba(124,58,237,0.24)'), objectFit: 'contain', transition: 'border-color 220ms, box-shadow 220ms' } }),
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
      // Pause overlay — shown while paused, covers the maze with a
      // dim parchment card. Clicking or pressing P/Escape resumes.
      paused && h('div', {
        onClick: function() { setPaused(false); },
        role: 'button', tabIndex: 0,
        onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ' || e.key === 'p' || e.key === 'P' || e.key === 'Escape') { e.preventDefault(); setPaused(false); } },
        'aria-label': tt('math_fluency.game_paused_press_enter_or_click_to_resu', 'Game paused. Press Enter or click to resume.'),
        style: {
          position: 'absolute', inset: 0, zIndex: 13,
          background: 'rgba(58,46,38,0.78)', backdropFilter: 'blur(2px)',
          borderRadius: '10px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer'
        }
      },
        h('div', {
          style: {
            background: 'linear-gradient(180deg, #fef3c7 0%, #fed7aa 100%)',
            border: '2px solid #d97706', borderRadius: '12px',
            padding: '20px 28px', textAlign: 'center',
            boxShadow: '0 12px 40px rgba(58,46,38,0.5)'
          }
        },
          h('div', { style: { fontSize: '40px', marginBottom: '6px' } }, '\u23F8\uFE0F'),
          h('div', { style: { fontSize: '16px', fontWeight: 900, color: '#78350f', marginBottom: '8px', letterSpacing: '0.04em' } }, tt('math_fluency.paused', 'Paused')),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '10px', minWidth: '260px' } },
            h('div', { style: { background: 'rgba(255,255,255,0.55)', borderRadius: '8px', padding: '6px 4px', border: '1px solid #fcd34d' } },
              h('div', { style: { fontSize: '20px', fontWeight: 900, color: '#15803d' } }, String(correct)),
              h('div', { style: { fontSize: '9px', color: '#92400e', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' } }, 'Correct')),
            h('div', { style: { background: 'rgba(255,255,255,0.55)', borderRadius: '8px', padding: '6px 4px', border: '1px solid #fcd34d' } },
              h('div', { style: { fontSize: '20px', fontWeight: 900, color: '#b91c1c' } }, String(wrong)),
              h('div', { style: { fontSize: '9px', color: '#92400e', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' } }, tt('math_fluency.wrong', 'Wrong'))),
            h('div', { style: { background: 'rgba(255,255,255,0.55)', borderRadius: '8px', padding: '6px 4px', border: '1px solid #fcd34d' } },
              h('div', { style: { fontSize: '20px', fontWeight: 900, color: '#c2410c' } }, '\uD83D\uDD25' + streak),
              h('div', { style: { fontSize: '9px', color: '#92400e', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' } }, tt('math_fluency.streak', 'Streak'))),
            h('div', { style: { background: 'rgba(255,255,255,0.55)', borderRadius: '8px', padding: '6px 4px', border: '1px solid #fcd34d' } },
              h('div', { style: { fontSize: '20px', fontWeight: 900, color: '#a16207' } }, elapsed + 's'),
              h('div', { style: { fontSize: '9px', color: '#92400e', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' } }, tt('math_fluency.time', 'Time')))
          ),
          h('div', { style: { fontSize: '11px', color: '#92400e', fontStyle: 'italic' } }, tt('math_fluency.tap_press_p_or_escape_to_resume', 'Tap, press P, or Escape to resume'))
        )
      ),
      // Keyboard-shortcut help overlay — toggled by ? key. Click,
      // Enter/Space, ?, or Escape dismisses.
      helpOpen && h('div', {
        onClick: function() { setHelpOpen(false); },
        role: 'button', tabIndex: 0,
        onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ' || e.key === '?' || e.key === 'Escape') { e.preventDefault(); setHelpOpen(false); } },
        'aria-label': tt('math_fluency.keyboard_shortcuts_press_escape_or_click', 'Keyboard shortcuts. Press Escape or click to dismiss.'),
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
            padding: '20px 22px', maxWidth: '320px', textAlign: 'left',
            boxShadow: '0 12px 40px rgba(58,46,38,0.5)'
          }
        },
          h('h3', { style: { fontSize: '14px', fontWeight: 900, color: '#78350f', margin: '0 0 10px', letterSpacing: '0.04em', textAlign: 'center' } }, '\u2328\uFE0F Keyboard Shortcuts'),
          h('div', { style: { fontSize: '12px', color: '#92400e', lineHeight: '1.7' } },
            [tt('math_fluency.move_arrow_keys_or_wasd', 'Move: Arrow Keys or WASD'),
             tt('math_fluency.submit_answer_enter', 'Submit answer: Enter'),
             tt('math_fluency.clear_answer_escape_in_gate', 'Clear answer: Escape (in gate)'),
             tt('math_fluency.hint_direction_h', 'Hint (direction): H'),
             tt('math_fluency.pause_resume_p', 'Pause / Resume: P'),
             tt('math_fluency.mute_unmute_m', 'Mute / unmute: M'),
             tt('math_fluency.fullscreen_f', 'Fullscreen: F'),
             tt('math_fluency.look_around_explorer_drag', 'Look around (Explorer): Drag'),
             tt('math_fluency.rotate_camera_explorer_q_e', 'Rotate camera (Explorer): Q / E'),
             tt('math_fluency.restart_same_maze_r', 'Restart same maze: R'),
             tt('math_fluency.this_help', 'This help: ?')].map(function(line, i) {
              var parts = line.split(': ');
              return h('div', { key: i, style: { display: 'flex', justifyContent: 'space-between', gap: '12px', borderBottom: i < 10 ? '1px dashed rgba(217,119,6,0.3)' : 'none', padding: '3px 0' } },
                h('span', { style: { fontWeight: 700 } }, parts[0]),
                h('span', { style: { fontFamily: 'monospace', color: '#78350f' } }, parts[1])
              );
            })
          ),
          h('div', { style: { textAlign: 'center', fontSize: '10px', color: '#a16207', fontStyle: 'italic', marginTop: '10px' } }, tt('math_fluency.click_anywhere_or_press_esc_to_close', 'Click anywhere or press Esc to close'))
        )
      ),
      // First-time tutorial overlay — shown on the very first run only.
      // Dismissed by click anywhere on the overlay or auto-dismissed when
      // the student successfully solves their first gate.
      !tutorialSeen && h('div', {
        onClick: _dismissTutorial,
        role: 'button', tabIndex: 0,
        onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); _dismissTutorial(); } },
        'aria-label': tt('math_fluency.tutorial_press_enter_or_click_to_dismiss', 'Tutorial. Press Enter or click to dismiss.'),
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
          h('h3', { style: { fontSize: '16px', fontWeight: 900, color: '#78350f', margin: '0 0 10px', letterSpacing: '0.04em' } }, tt('math_fluency.welcome_adventurer', 'Welcome, Adventurer')),
          h('p', { style: { fontSize: '12px', color: '#92400e', lineHeight: '1.5', margin: '0 0 8px' } },
            'Use ',
            h('kbd', { style: { background: '#fef3c7', border: '1px solid #d97706', borderRadius: '4px', padding: '0 4px', fontFamily: 'monospace', fontWeight: 700 } }, '\u2190 \u2191 \u2192 \u2193'),
            ' or ',
            h('kbd', { style: { background: '#fef3c7', border: '1px solid #d97706', borderRadius: '4px', padding: '0 4px', fontFamily: 'monospace', fontWeight: 700 } }, 'WASD'),
            ' to explore.'
          ),
          h('p', { style: { fontSize: '12px', color: '#92400e', lineHeight: '1.5', margin: '0 0 8px' } },
            tt('math_fluency.each_gate_is_locked_by_a_math_fact_solve', 'Each gate is locked by a math fact. Solve it to pass.')
          ),
          h('p', { style: { fontSize: '12px', color: '#92400e', lineHeight: '1.5', margin: '0 0 12px' } },
            tt('math_fluency.find_the_key_to_unlock_the_exit', 'Find the \uD83D\uDDDD\uFE0F key to unlock the \u2B50 exit.')
          ),
          h('div', {
            style: { fontSize: '11px', fontWeight: 800, color: '#fef3c7', background: 'linear-gradient(135deg, #b45309, #7c2d12)', border: '2px solid #78350f', borderRadius: '8px', padding: '6px 14px', display: 'inline-block', letterSpacing: '0.06em' }
          }, tt('math_fluency.tap_anywhere_to_begin', 'Tap anywhere to begin'))
        )
      ),
      // 2D minimap overlay (top-right of 3D view)
      has3D && maze && h('div', { className: 'mf-maze-minimap-shell', 'data-objective': keyCollected ? 'portal' : 'key', style: { position: 'absolute', top: isFullscreen ? '72px' : '52px', right: isFullscreen ? '24px' : '10px', width: isFullscreen ? '176px' : '124px', height: isFullscreen ? '176px' : '124px', padding: '5px', borderRadius: '14px', border: (mazeHighContrast ? '4px solid #fff' : '3px solid ' + (keyCollected ? '#f59e0b' : '#a78bfa')), background: 'rgba(15,23,42,0.94)', boxShadow: '0 10px 28px rgba(0,0,0,0.55)', zIndex: 5, transition: 'border-color 220ms, box-shadow 220ms' } },
        h('span', { 'aria-hidden': 'true', style: { position: 'absolute', top: '7px', left: '50%', transform: 'translateX(-50%)', zIndex: 3, padding: '2px 7px', borderRadius: '999px', background: 'rgba(15,23,42,0.88)', border: '1px solid rgba(255,255,255,0.32)', color: '#fff', fontSize: '9px', fontWeight: 900, letterSpacing: '0.11em', whiteSpace: 'nowrap' } }, keyCollected ? 'MAP \u00b7 PORTAL' : 'MAP \u00b7 KEY'),
        h('canvas', { ref: canvasRef, className: 'mf-maze-minimap' + (simplifiedMinimap ? ' mf-maze-minimap-simple' : ''), role: 'img', 'data-simplified': simplifiedMinimap ? 'true' : 'false', 'aria-label': 'Maze minimap. ' + objectiveText + (objectiveDistanceLabel ? '. ' + objectiveDistanceLabel : ''), style: { display: 'block', width: '100%', height: '100%', borderRadius: '10px', opacity: simplifiedMinimap ? 1 : 0.98, background: '#2a221c' } })
      ),
      // Gate overlay (when at junction). Styled as a stone-gate with a
      // lock and a 3x4 number pad \u2014 the math problem is the gate's
      // combination, the pad is how you enter it. Border + glow shift
      // by feedback state: red shake on wrong, green flash on correct.
      currentProblem && h('div', {
        key: 'gate-' + (currentProblem.problem.text), // remount when problem changes so animations replay
        className: 'mf-maze-gate ' + (feedback === 'wrong' ? 'allo-gate-shake' : (feedback === 'correct' ? 'allo-gate-open' : '')),
        role: 'dialog', 'aria-labelledby': 'mf-maze-gate-title',
        'data-feedback': feedback || 'ready',
        style: {
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          background: feedback === 'correct'
            ? 'linear-gradient(180deg, #14532d 0%, #052e16 100%)'
            : 'linear-gradient(160deg, #312e81 0%, #1e1b4b 58%, #172554 100%)',
          backdropFilter: 'blur(8px)',
          borderRadius: '18px',
          padding: '20px 22px 16px',
          textAlign: 'center',
          border: feedback === 'wrong'
            ? '3px solid #ef4444'
            : (feedback === 'correct' ? '3px solid #22c55e' : '3px solid #a78bfa'),
          boxShadow: feedback === 'correct'
            ? '0 0 32px rgba(34,197,94,0.7), inset 0 0 32px rgba(34,197,94,0.25)'
            : feedback === 'wrong'
              ? '0 0 24px rgba(239,68,68,0.55), inset 0 0 16px rgba(239,68,68,0.2)'
              : '0 0 0 2px rgba(30,27,75,0.72), 0 18px 54px rgba(15,23,42,0.72), inset 0 1px 0 rgba(255,255,255,0.10)',
          zIndex: 10,
          width: isFullscreen ? 'min(480px, calc(100vw - 48px))' : 'min(360px, calc(100vw - 24px))',
          maxWidth: '92vw', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto',
          transition: 'background 200ms, border-color 200ms, box-shadow 200ms'
        }
      },
        // Header row: "GATE" label + lock glyph (changes to unlocked on correct)
        h('div', { id: 'mf-maze-gate-title', style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px', marginBottom: '11px', color: feedback === 'correct' ? '#bbf7d0' : '#fde68a', fontSize: '12px', fontWeight: 900, letterSpacing: '0.16em', textTransform: 'uppercase' } },
          h('span', { style: { fontSize: '18px' } }, feedback === 'correct' ? '\ud83d\udd13' : '\ud83d\udd12'),
          h('span', null, feedback === 'correct' ? tt('math_fluency.gate_opens_2', 'Gate Opens!') : (feedback === 'wrong' ? tt('math_fluency.wrong_combination_try_again', 'Wrong Combination \u2014 Try Again') : tt('math_fluency.locked_gate', 'Locked Gate'))),
          h('span', { style: { fontSize: '18px' } }, feedback === 'correct' ? '\ud83d\udd13' : '\ud83d\udd12')
        ),
        // Operation tag — small pill showing which fact family this gate
        // tests (e.g. "MULTIPLICATION" / "DIVISION"). Detected from the
        // operator characters in the problem text so it stays accurate
        // even when operation === 'mixed'.
        (function() {
          var ptxt = (currentProblem.problem.text || '');
          var opLabel = currentProblem.problem.type === 'visual'
              ? (currentProblem.problem.shape === 'lblock' ? 'L-Block' : tt('math_fluency.volume', 'Volume'))
            : ptxt.indexOf('\u00D7') >= 0 || ptxt.indexOf('x') >= 0 || ptxt.indexOf('*') >= 0 ? tt('math_fluency.multiplication', 'Multiplication')
            : ptxt.indexOf('\u00F7') >= 0 || ptxt.indexOf('/') >= 0 ? tt('math_fluency.division', 'Division')
            : ptxt.indexOf('+') >= 0 ? tt('math_fluency.addition', 'Addition')
            : (ptxt.indexOf('\u2212') >= 0 || ptxt.indexOf('-') >= 0) ? tt('math_fluency.subtraction', 'Subtraction')
            : 'Math';
          return h('div', {
            style: {
              display: 'inline-block', fontSize: '10px', fontWeight: 850,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              color: '#ede9fe', background: 'rgba(139,92,246,0.18)',
              border: '1px solid rgba(196,181,253,0.52)',
              padding: '2px 8px', borderRadius: '999px', marginBottom: '6px'
            }
          }, opLabel + ' Gate');
        })(),
        // The "combination" \u2014 math problem
        // Visual-volume prism (CSS-3D unit-cube grid) OR text equation.
        // Renders a small rotating prism made of individual unit cubes
        // when the gate problem is a visual one, so the math fact is
        // literally a structure to count. Falls back to the original
        // text math display for arithmetic gates.
        currentProblem.problem.type === 'visual'
          ? (function() {
              var d = currentProblem.problem.dims;
              var notch = currentProblem.problem.notch;
              var isLBlock = currentProblem.problem.shape === 'lblock';
              // Cube edge sized so the longest axis fits in ~140px.
              var maxAx = Math.max(d.l, d.w, d.h);
              var unit = Math.max(14, Math.min(28, 140 / maxAx));
              var cubes = [];
              for (var z = 0; z < d.h; z++) {
                for (var y = 0; y < d.w; y++) {
                  for (var x = 0; x < d.l; x++) {
                    if (isLBlock && x < notch.l && y < notch.w && z < notch.h) continue;
                    var hue = 38 + z * 7;
                    var face = 'hsl(' + hue + ', 78%, 58%)';
                    var faceDim = 'hsl(' + hue + ', 60%, 38%)';
                    cubes.push(h('div', {
                      key: x + ',' + y + ',' + z,
                      style: {
                        position: 'absolute',
                        width: unit + 'px', height: unit + 'px',
                        transform: 'translate3d(' + (x * unit) + 'px, ' + (-z * unit) + 'px, ' + (y * unit) + 'px)',
                        transformStyle: 'preserve-3d'
                      }
                    },
                      // 6 cube faces, positioned via translateZ + rotate
                      h('div', { style: { position: 'absolute', inset: 0, background: face, border: '1px solid #b45309', transform: 'translateZ(' + (unit/2) + 'px)' } }),
                      h('div', { style: { position: 'absolute', inset: 0, background: faceDim, border: '1px solid #78350f', transform: 'rotateY(180deg) translateZ(' + (unit/2) + 'px)' } }),
                      h('div', { style: { position: 'absolute', inset: 0, background: face, border: '1px solid #b45309', transform: 'rotateY(90deg) translateZ(' + (unit/2) + 'px)' } }),
                      h('div', { style: { position: 'absolute', inset: 0, background: faceDim, border: '1px solid #78350f', transform: 'rotateY(-90deg) translateZ(' + (unit/2) + 'px)' } }),
                      h('div', { style: { position: 'absolute', inset: 0, background: 'hsl(' + hue + ', 80%, 70%)', border: '1px solid #b45309', transform: 'rotateX(90deg) translateZ(' + (unit/2) + 'px)' } }),
                      h('div', { style: { position: 'absolute', inset: 0, background: 'hsl(' + hue + ', 50%, 30%)', border: '1px solid #78350f', transform: 'rotateX(-90deg) translateZ(' + (unit/2) + 'px)' } })
                    ));
                  }
                }
              }
              var totalW = d.l * unit;
              var totalD = d.w * unit;
              var totalH = d.h * unit;
              return h('div', {
                'aria-label': isLBlock
                  ? ('L-block prism, base ' + d.l + ' by ' + d.w + ' by ' + d.h + ' with ' + notch.l + ' by ' + notch.w + ' by ' + notch.h + ' corner removed')
                  : ('Rectangular prism, ' + d.l + ' by ' + d.w + ' by ' + d.h),
                style: { perspective: '600px', height: '180px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible' }
              },
                h('div', {
                  className: 'allo-volume-rotate',
                  style: {
                    position: 'relative', width: totalW + 'px', height: totalH + 'px',
                    transformStyle: 'preserve-3d',
                    transform: 'translateZ(' + (-totalD / 2) + 'px) rotateX(-22deg) rotateY(-32deg)',
                    transformOrigin: 'center'
                  }
                }, cubes),
                // Dimension caption — small text above so the visual
                // problem still has a label that matches the aria.
                h('div', {
                  style: { position: 'absolute', bottom: '-2px', left: '50%', transform: 'translateX(-50%)', fontSize: '11px', color: '#b45309', fontWeight: 700, letterSpacing: '0.08em', fontFamily: 'monospace', whiteSpace: 'nowrap' }
                }, isLBlock ? (d.l + '×' + d.w + '×' + d.h + '  −  ' + notch.l + '×' + notch.w + '×' + notch.h) : (d.l + ' × ' + d.w + ' × ' + d.h))
              );
            })()
          : h('div', { style: { fontSize: isFullscreen ? '44px' : '34px', fontWeight: 900, color: '#fff', margin: '2px 0 12px', fontFamily: 'monospace', letterSpacing: '0.02em', textShadow: '0 0 16px rgba(196,181,253,0.48)' } }, currentProblem.problem.text + ' = ?'),
        // Visible answer input supports keyboard, touch keyboard, and the on-screen number pad.
        h('input', {
          ref: inputRef, type: 'text', value: userInput,
          onChange: function(e) { if (/^-?\d*$/.test(e.target.value)) setUserInput(e.target.value); },
          onKeyDown: function(e) { if (e.key === 'Enter') submitAnswer(); else if (e.key === 'Escape') setUserInput(''); },
          'aria-label': tt('math_fluency.type_your_answer_to', 'Type your answer to ') + currentProblem.problem.text,
          inputMode: 'numeric', enterKeyHint: 'done', autoComplete: 'off', autoFocus: true,
          style: { display: 'block', width: isFullscreen ? '180px' : '140px', padding: isFullscreen ? '10px 16px' : '8px 12px', margin: '0 auto 10px', fontSize: isFullscreen ? '36px' : '26px', fontWeight: 800, fontFamily: 'monospace', textAlign: 'center', color: feedback === 'wrong' ? '#fee2e2' : (feedback === 'correct' ? '#bbf7d0' : '#fff'), background: feedback === 'wrong' ? '#7f1d1d' : (feedback === 'correct' ? '#14532d' : '#0f172a'), border: '3px solid ' + (feedback === 'wrong' ? '#f87171' : (feedback === 'correct' ? '#4ade80' : '#a78bfa')), borderRadius: '8px', letterSpacing: '0.08em', outlineOffset: '3px' }
        }),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: isFullscreen ? '8px' : '6px', maxWidth: isFullscreen ? '320px' : '220px', margin: '0 auto' } },
          ['1','2','3','4','5','6','7','8','9'].map(function(d) {
            return h('button', { key: 'pad-' + d, className: 'mf-maze-gate-key', onClick: function() { setUserInput(function(prev) { return (prev || '') + d; }); if (inputRef.current) inputRef.current.focus(); }, 'aria-label': tt('math_fluency.enter_digit', 'Enter digit ') + d, style: { padding: isFullscreen ? '16px 0' : '12px 0', fontSize: isFullscreen ? '26px' : '20px', fontWeight: 700, fontFamily: 'monospace', background: 'linear-gradient(180deg,#4338ca,#312e81)', color: '#fff', border: '2px solid #818cf8', borderRadius: '8px', cursor: 'pointer', minHeight: '44px', boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.3)' } }, d);
          }),
        // Bottom row: Clear, 0, Submit
          h('button', {
            key: 'pad-clear', className: 'mf-maze-gate-key',
            onClick: function() { setUserInput(''); if (inputRef.current) inputRef.current.focus(); },
            'aria-label': tt('math_fluency.clear_answer', 'Clear answer'),
            style: {
              padding: '12px 0', fontSize: '13px', fontWeight: 700,
              background: '#7f1d1d', color: '#fff', border: '2px solid #f87171',
              borderRadius: '8px', cursor: 'pointer', minHeight: '44px'
            }
          }, '\u2716 Clear'),
          h('button', {
            key: 'pad-0', className: 'mf-maze-gate-key',
            onClick: function() { setUserInput(function(prev) { return (prev || '') + '0'; }); if (inputRef.current) inputRef.current.focus(); },
            'aria-label': tt('math_fluency.enter_digit_0', 'Enter digit 0'),
            style: {
              padding: '12px 0', fontSize: '20px', fontWeight: 700, fontFamily: 'monospace',
              background: 'linear-gradient(180deg,#4338ca,#312e81)', color: '#fff', border: '2px solid #818cf8',
              borderRadius: '8px', cursor: 'pointer', minHeight: '44px',
              boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.3)'
            }
          }, '0'),
          h('button', {
            key: 'pad-submit', className: 'mf-maze-gate-key',
            onClick: submitAnswer,
            'aria-label': tt('math_fluency.submit_answer_to_unlock_the_gate', 'Submit answer to unlock the gate'),
            style: {
              padding: '12px 0', fontSize: '13px', fontWeight: 800,
              background: 'linear-gradient(180deg,#16a34a,#15803d)', color: '#fff', border: '2px solid #4ade80',
              borderRadius: '8px', cursor: 'pointer', minHeight: '44px',
              boxShadow: '0 0 8px rgba(34,197,94,0.4)'
            }
          }, '\ud83d\udd11 Unlock')
        ),
        attemptCount > 0 && h('div', { style: { marginTop: '8px', fontSize: '11px', fontWeight: 700, color: '#b45309', letterSpacing: '0.06em', textTransform: 'uppercase' }, 'aria-live': 'off' }, 'Attempt ' + (attemptCount + 1)),
        // Adaptive answer reveal \u2014 after 3 wrong attempts on the same
        // gate, surface the correct answer so a stuck student isn't
        // trapped. They still have to type it to advance so the muscle-
        // memory drill stays intact. Skipped for visual-volume gates
        // (those already display the prism \u2014 students count cubes).
        attemptCount >= 3 && currentProblem.problem.type !== 'visual' && h('div', {
          'aria-live': 'polite',
          style: {
            marginTop: '10px', padding: '6px 12px', display: 'inline-block',
            fontSize: '12px', fontWeight: 800,
            color: '#bbf7d0', background: 'rgba(20,83,45,0.55)',
            border: '1px dashed #22c55e', borderRadius: '8px',
            letterSpacing: '0.04em'
          }
        }, '\ud83d\udca1 Answer: ' + currentProblem.problem.answer + ' \u2014 type it to continue'),
        h('p', { style: { fontSize: '11px', color: '#c4b5fd', marginTop: attemptCount > 0 ? '4px' : '10px', marginBottom: 0 } }, tt('math_fluency.tap_pad_or_use_keyboard_enter_to_submit', 'Tap pad or use keyboard \u2022 Enter to submit \u2022 Esc to clear'))
      ),
      // Arrow buttons (mobile friendly)
      h('div', { 'aria-label': tt('math_fluency.available_maze_directions', 'Available maze directions'), style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: isFullscreen ? '8px' : '4px', maxWidth: isFullscreen ? '240px' : '160px', margin: isFullscreen ? '14px auto 0' : '8px auto 0' } },
        h('div'),
        h('button', { className: 'mf-maze-move-button', disabled: !mazeDirectionAvailable('up'), 'aria-current': hintDir === 'up' ? 'step' : undefined, onClick: function() { tryMove('up'); }, 'aria-label': tt('math_fluency.move_up', 'Move up'), title: tt('math_fluency.move_up_up_arrow_or_w_key', 'Move up (up arrow or W key)'), style: movementButtonStyle('up') }, h('span', { 'aria-hidden': 'true' }, '\u25B2'), h('small', { 'aria-hidden': 'true', style: { fontSize: '9px', lineHeight: 1, opacity: 0.8 } }, 'W')),
        h('div'),
        h('button', { className: 'mf-maze-move-button', disabled: !mazeDirectionAvailable('left'), 'aria-current': hintDir === 'left' ? 'step' : undefined, onClick: function() { tryMove('left'); }, 'aria-label': tt('math_fluency.move_left', 'Move left'), title: tt('math_fluency.move_left_left_arrow_or_a_key', 'Move left (left arrow or A key)'), style: movementButtonStyle('left') }, h('span', { 'aria-hidden': 'true' }, '\u25C0'), h('small', { 'aria-hidden': 'true', style: { fontSize: '9px', lineHeight: 1, opacity: 0.8 } }, 'A')),
        h('button', { className: 'mf-maze-move-button', disabled: !mazeDirectionAvailable('down'), 'aria-current': hintDir === 'down' ? 'step' : undefined, onClick: function() { tryMove('down'); }, 'aria-label': tt('math_fluency.move_down', 'Move down'), title: tt('math_fluency.move_down_down_arrow_or_s_key', 'Move down (down arrow or S key)'), style: movementButtonStyle('down') }, h('span', { 'aria-hidden': 'true' }, '\u25BC'), h('small', { 'aria-hidden': 'true', style: { fontSize: '9px', lineHeight: 1, opacity: 0.8 } }, 'S')),
        h('button', { className: 'mf-maze-move-button', disabled: !mazeDirectionAvailable('right'), 'aria-current': hintDir === 'right' ? 'step' : undefined, onClick: function() { tryMove('right'); }, 'aria-label': tt('math_fluency.move_right', 'Move right'), title: tt('math_fluency.move_right_right_arrow_or_d_key', 'Move right (right arrow or D key)'), style: movementButtonStyle('right') }, h('span', { 'aria-hidden': 'true' }, '\u25B6'), h('small', { 'aria-hidden': 'true', style: { fontSize: '9px', lineHeight: 1, opacity: 0.8 } }, 'D'))
      ),
      h('p', { style: { fontSize: isFullscreen ? '13px' : '10px', color: isFullscreen ? '#fbbf24' : '#92400e', textAlign: 'center', marginTop: isFullscreen ? '12px' : '8px', fontStyle: 'italic' } }, 'Arrow keys or WASD to move \u2022 H for hint \u2022 F for fullscreen \u2022 3-in-a-row for bonus')
    );
  }

  // ── Register modules ──
  window.AlloModules = window.AlloModules || {};
  window.AlloModules.MathFluency = MathFluencyPanel;
  window.AlloModules.FluencyMaze = FluencyMazePanel;
  // Test-only seam: expose the pure CBM-scoring internals for characterization
  // tests (tests/math_fluency.test.js). Read-only pure fns + the benchmark table;
  // zero behavior change (mirrors the symbol_studio initialTab seam pattern).
  window.AlloModules.MathFluencyInternals = {
    getBenchmark: getBenchmark, getBenchmarkLabel: getBenchmarkLabel,
    analyzeErrors: analyzeErrors, getSeason: getSeason, BENCHMARKS: BENCHMARKS,
    normalizeGrade: normalizeGrade, generateProblems: generateProblems,
    getRecommendedPracticeSet: getRecommendedPracticeSet, getPracticeSetOptions: getPracticeSetOptions,
    describePracticeSet: describePracticeSet, generatePracticeProblems: generatePracticeProblems,
    getFactKey: getFactKey, summarizeFactResults: summarizeFactResults, updateFactMastery: updateFactMastery,
    getStrategyHint: getStrategyHint, buildFactMasteryDashboard: buildFactMasteryDashboard,
    buildReviewSchedule: buildReviewSchedule, buildSmartReviewProblems: buildSmartReviewProblems,
    buildTeacherReport: buildTeacherReport, buildTeacherReportCsv: buildTeacherReportCsv,
    buildOperationGrowth: buildOperationGrowth, buildNextPracticeRecommendation: buildNextPracticeRecommendation,
    buildSessionGoal: buildSessionGoal, evaluateSessionGoal: evaluateSessionGoal,
    getAdaptivePracticeLevel: getAdaptivePracticeLevel, buildStudentSessionReview: buildStudentSessionReview, formatProblemSpeech: formatProblemSpeech,
    getMasteryFocusFacts: getMasteryFocusFacts, buildFocusedProblems: buildFocusedProblems,
    sanitizeAccuracyDraft: sanitizeAccuracyDraft,
    parseStudentAnswer: parseStudentAnswer, countCorrectDigits: countCorrectDigits,
    findMazePathStep: findMazePathStep, findMazePathDistance: findMazePathDistance, buildChaseRadar: buildChaseRadar, buildMazeBestKey: buildMazeBestKey,
    generateMazeProblem: generateMazeProblem,
  };
  console.log('[CDN] MathFluency + FluencyMaze modules registered');
})();
