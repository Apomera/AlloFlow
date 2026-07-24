// ═══════════════════════════════════════════════
// stem_tool_anatomy.js — Human Anatomy Explorer
// Enhanced standalone module with layered anatomical visualization,
// 10 body systems, 129 structures, quiz mode, badge system,
// AI tutor, TTS, grade-band content, sound effects & snapshots.
// Extracted & enhanced from monolith stem_tool_science.js L5362-7429
// ═══════════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('anatomy'))) {
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
    if (document.getElementById('allo-live-anatomy')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-anatomy';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  (function() {
    if (document.getElementById('allo-anatomy-refinement-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-anatomy-refinement-css';
    st.textContent = [
      '.anatomy-tool-shell{--anatomy-accent:#be185d;--anatomy-soft:#fce7f3;color:#0f172a;}',
      '.anatomy-topbar{padding:4px 0;}',
      '.anatomy-mission{position:relative;overflow:hidden;border-radius:12px;border:1px solid rgba(15,23,42,.10);background:linear-gradient(135deg,#fff 0%,#f8fafc 58%,var(--anatomy-soft) 160%);box-shadow:0 8px 22px rgba(15,23,42,.06);}',
      '.anatomy-mission:before{content:"";position:absolute;inset:0 0 auto;height:4px;background:linear-gradient(90deg,var(--anatomy-accent),#0f766e,#f59e0b);}',
      '.anatomy-mission-inner{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(330px,1fr);gap:16px;padding:14px 16px 13px;}',
      '.anatomy-kicker{font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#64748b;}',
      '.anatomy-mission-title{font-size:19px;line-height:1.12;font-weight:950;color:#0f172a;margin:2px 0 5px;}',
      '.anatomy-mission-text{font-size:12px;line-height:1.55;color:#475569;max-width:760px;}',
      '.anatomy-mission-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;}',
      '.anatomy-mission-actions button{border-radius:8px;}',
      '.anatomy-metric-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;}',
      '.anatomy-metric{border-radius:8px;border:1px solid rgba(15,23,42,.08);background:rgba(255,255,255,.72);padding:7px 8px;}',
      '.anatomy-metric strong{display:block;font-size:16px;line-height:1;font-weight:950;color:#0f172a;}',
      '.anatomy-metric span{display:block;margin-top:4px;font-size:10px;font-weight:800;text-transform:uppercase;color:#64748b;}',
      '.anatomy-coach{margin-top:7px;border-radius:8px;border:1px solid rgba(124,58,237,.18);background:rgba(245,243,255,.72);padding:8px 9px;}',
      '.anatomy-coach strong{display:block;font-size:12px;color:#4c1d95;}',
      '.anatomy-coach p{margin:3px 0 8px;font-size:10px;line-height:1.45;color:#475569;}',
      '.anatomy-confidence{border-radius:8px;border:1px solid #e2e8f0;background:#f8fafc;padding:9px;}',
      '.anatomy-confidence-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;}',
      '.anatomy-confidence-actions button{min-height:34px;border-radius:8px;}',
      '.anatomy-study-filters{display:flex;flex-wrap:wrap;gap:5px;margin:8px 0;}',
      '.anatomy-study-filters button{min-height:34px;border-radius:8px;}',

      '.anatomy-challenge-strip{display:flex;gap:5px;flex-wrap:wrap;margin-top:6px;}',
      '.anatomy-challenge-chip{height:22px;min-width:22px;display:inline-flex;align-items:center;justify-content:center;border-radius:6px;border:1px solid rgba(245,158,11,.26);background:#fff7ed;font-size:12px;}',
      '.anatomy-challenge-chip[data-done="false"]{opacity:.32;filter:grayscale(1);background:#f8fafc;border-color:#e2e8f0;}',
      '.anatomy-tab-strip,.anatomy-system-rail,.anatomy-layer-bar,.anatomy-controls-bar{border-radius:8px;border:1px solid rgba(15,23,42,.12);background:rgba(248,250,252,.86);padding:8px;}',
      '.anatomy-tab-strip{position:sticky;top:0;z-index:3;box-shadow:0 10px 22px rgba(15,23,42,.06);}',
      '.anatomy-tab-strip button,.anatomy-system-rail button,.anatomy-layer-bar button,.anatomy-controls-bar button{border-radius:8px;}',
      '.anatomy-tab-strip button,.anatomy-system-rail button,.anatomy-layer-bar button,.anatomy-controls-bar button,.anatomy-structure-list button{min-height:36px;}',
      '.anatomy-tool-shell button:focus-visible,.anatomy-tool-shell input:focus-visible,.anatomy-tool-shell canvas:focus-visible{outline:3px solid #7c3aed;outline-offset:2px;}',
      '.anatomy-system-rail{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;}',
      '.anatomy-mode-card{border-radius:8px!important;box-shadow:none!important;padding:8px 10px!important;margin-bottom:8px!important;}',
      '.anatomy-system-button{position:relative;overflow:hidden;text-align:left;padding-bottom:9px!important;}',
      '.anatomy-system-label{display:flex;align-items:center;justify-content:space-between;gap:6px;width:100%;}',
      '.anatomy-system-label>span:first-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.anatomy-system-count{font-size:9px;font-weight:900;opacity:.78;white-space:nowrap;}',
      '.anatomy-system-meter{position:absolute;left:7px;right:7px;bottom:4px;height:2px;border-radius:999px;background:rgba(100,116,139,.18);overflow:hidden;}',
      '.anatomy-system-meter>span{display:block;height:100%;border-radius:inherit;background:var(--system-accent);transition:width .25s ease;}',
      '.anatomy-system-button[aria-pressed="true"] .anatomy-system-meter{background:rgba(255,255,255,.28);}',
      '.anatomy-system-button[aria-pressed="true"] .anatomy-system-meter>span{background:#fff;}',
      '.anatomy-mode-card .anatomy-mode-icon{font-size:20px!important;}',
      '.anatomy-progress-row{border-radius:8px;border:1px solid rgba(15,23,42,.09);background:#fff;padding:8px 10px;}',
      '.anatomy-workspace{display:grid;grid-template-columns:minmax(310px,392px) minmax(0,1fr);gap:18px;align-items:start;}',
      '.anatomy-body-shell{position:sticky;top:58px;border-radius:14px;border:1px solid #cbd5e1;border-top:4px solid var(--anatomy-accent);background:linear-gradient(180deg,#ffffff 0%,#f8fafc 100%);padding:10px 12px 12px;box-shadow:0 16px 36px rgba(15,23,42,.11);}',
      '.anatomy-body-header{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;}',
      '.anatomy-body-header strong{font-size:12px;font-weight:950;color:#0f172a;}',
      '.anatomy-body-title span{display:block;margin-top:2px;font-size:9px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.06em;}',
      '.anatomy-body-badges{display:flex;align-items:flex-end;gap:4px;flex-direction:column;}',
      '.anatomy-body-badges span{font-size:10px;font-weight:850;color:var(--anatomy-accent);background:var(--anatomy-soft);border-radius:999px;padding:3px 7px;white-space:nowrap;}',
      '.anatomy-orientation-key{color:#334155!important;background:#e2e8f0!important;}',
      '.anatomy-canvas-toolbar{display:flex;align-items:center;justify-content:space-between;gap:6px;width:min(360px,100%);margin:0 auto 7px;}',
      '.anatomy-canvas-toolbar>span{font-size:10px;font-weight:850;color:#475569;white-space:nowrap;}',
      '.anatomy-canvas-toolbar-group{display:flex;align-items:center;gap:3px;flex-wrap:wrap;justify-content:flex-end;}',
      '.anatomy-canvas-toolbar button{min-width:32px;min-height:32px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;color:#334155;font-size:11px;font-weight:900;}',
      '.anatomy-canvas-toolbar button:disabled{opacity:.42;cursor:not-allowed;}',
      '.anatomy-canvas-frame{position:relative;width:min(360px,100%);aspect-ratio:360/520;margin:0 auto;overflow:hidden;border-radius:10px;}',
      '.anatomy-3d-canvas{display:block;width:100%!important;height:100%!important;border-radius:10px;background:radial-gradient(circle at 50% 28%,#172554 0%,#07111f 62%,#020617 100%);touch-action:none;cursor:grab;}',
      '.anatomy-3d-canvas:active{cursor:grabbing;}',
      '.anatomy-3d-status{max-width:360px;margin:6px auto 0;padding:7px 9px;border-radius:8px;border:1px solid #c7d2fe;background:#eef2ff;color:#312e81;font-size:10px;line-height:1.45;}',
      '.anatomy-view-toggle{display:inline-flex;align-items:center;gap:3px;padding:2px;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;}',
      '.anatomy-view-toggle button{min-height:28px;padding:4px 7px;border-radius:6px;font-size:10px;font-weight:900;color:#475569;}',
      '.anatomy-view-toggle button[aria-pressed="true"]{background:var(--anatomy-accent);color:#fff;}',
      '.anatomy-scale-journey{max-width:360px;margin:8px auto 0;padding:9px;border:1px solid #c7d2fe;border-radius:10px;background:linear-gradient(135deg,#eef2ff,#f5f3ff);}',
      '.anatomy-scale-journey-buttons{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin-top:6px;}',
      '.anatomy-scale-journey button{min-height:34px;border:1px solid #c7d2fe;border-radius:7px;background:#fff;color:#3730a3;font-size:9px;font-weight:900;padding:5px;}',
      '.anatomy-canvas{display:block;margin:0;width:100%!important;height:auto!important;border-radius:10px!important;touch-action:manipulation;transform-origin:center center;transition:transform .18s ease;}',
      '.anatomy-canvas.is-zoomed{touch-action:none;cursor:grab;}',
      '.anatomy-minimap{position:absolute;right:8px;bottom:8px;width:54px;height:78px;border:1px solid rgba(15,23,42,.3);border-radius:8px;background:rgba(255,255,255,.9);box-shadow:0 4px 12px rgba(15,23,42,.16);pointer-events:none;z-index:2;}',
      '.anatomy-minimap-body{position:absolute;left:18px;top:7px;width:18px;height:64px;border-radius:45% 45% 38% 38%;background:var(--anatomy-soft);border:1px solid var(--anatomy-accent);opacity:.7;}',
      '.anatomy-minimap-viewport{position:absolute;border:2px solid var(--anatomy-accent);border-radius:4px;background:rgba(255,255,255,.24);box-sizing:border-box;}',
      '.anatomy-minimap-selected{position:absolute;width:6px;height:6px;margin:-3px 0 0 -3px;border-radius:999px;background:var(--anatomy-accent);box-shadow:0 0 0 2px #fff;}',
      '.anatomy-minimap-label{position:absolute;left:0;right:0;top:1px;text-align:center;font-size:7px;font-weight:900;color:#475569;letter-spacing:.04em;}',
      '.anatomy-canvas-help{margin:7px auto 0;max-width:360px;padding:4px 2px 0;font-size:10px;line-height:1.45;color:#64748b;}',
      '.anatomy-marker-legend{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;max-width:360px;margin:7px auto 0;font-size:9px;font-weight:800;color:#475569;}',
      '.anatomy-marker-legend-title{font-weight:950;color:#334155;}',
      '.anatomy-marker-legend-item{display:inline-flex;align-items:center;gap:3px;white-space:nowrap;}',
      '.anatomy-marker-legend-symbol{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:999px;background:var(--anatomy-accent);color:#fff;font-size:10px;font-weight:950;line-height:1;}',
      '.anatomy-marker-legend-symbol[data-status="unrated"]{background:#64748b;}',
      '.anatomy-side-panel{min-width:0;}',
      '.anatomy-structure-panel{border-radius:8px;border:1px solid rgba(15,23,42,.12);background:#fff;padding:12px;box-shadow:0 10px 22px rgba(15,23,42,.06);}',
      '.anatomy-structure-list{max-height:520px;overflow-y:auto;padding-right:4px;}',
      '.anatomy-structure-list button{border-radius:8px;}',
      '.anatomy-atlas{border-radius:12px;border:1px solid #fecdd3;background:linear-gradient(145deg,#fff 0%,#fff7f7 100%);padding:12px;}',
      '.anatomy-atlas-header{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:8px;}',
      '.anatomy-atlas-header h5{font-size:13px;font-weight:950;color:#881337;margin:0;}',
      '.anatomy-atlas-header p{font-size:10px;line-height:1.45;color:#64748b;margin:2px 0 0;max-width:500px;}',
      '.anatomy-atlas-stage{border-radius:10px;border:1px solid #e2e8f0;background:#fff;overflow:hidden;}',
      '.anatomy-atlas-stage svg{display:block;width:100%;height:auto;min-height:250px;}',
      '.anatomy-atlas-route{fill:none;stroke-width:7;stroke-linecap:round;stroke-linejoin:round;opacity:.18;transition:opacity .2s ease,stroke-width .2s ease;}',
      '.anatomy-atlas-route.is-active{opacity:1;stroke-width:9;stroke-dasharray:12 9;animation:anatomy-atlas-flow 1.15s linear infinite;}',
      '.anatomy-atlas.is-paused .anatomy-atlas-route.is-active{animation-play-state:paused;}',
      '.anatomy-atlas-steps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-top:8px;}',
      '.anatomy-atlas-steps button{min-height:44px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;color:#334155;padding:6px;text-align:left;font-size:10px;font-weight:850;line-height:1.25;}',
      '.anatomy-atlas-steps button[aria-pressed="true"]{border-color:#be123c;background:#fff1f2;color:#881337;box-shadow:inset 0 0 0 1px #be123c;}',
      '.anatomy-atlas-step-detail{display:flex;align-items:flex-start;gap:8px;margin-top:8px;border-left:4px solid #be123c;background:#fff1f2;padding:8px 10px;color:#4c0519;}',
      '.anatomy-atlas-step-detail strong{font-size:11px;white-space:nowrap;}',
      '.anatomy-atlas-step-detail span{font-size:11px;line-height:1.45;}',
      '@keyframes anatomy-atlas-flow{to{stroke-dashoffset:-42}}',
      '.anatomy-atlas[data-anatomy-atlas="kidneys"]{border-color:#a7f3d0;background:linear-gradient(145deg,#fff 0%,#f0fdf4 100%);}',
      '.anatomy-atlas[data-anatomy-atlas="kidneys"] .anatomy-atlas-header h5{color:#065f46;}',
      '.anatomy-atlas[data-anatomy-atlas="kidneys"] .anatomy-atlas-steps button[aria-pressed="true"]{border-color:#059669;background:#ecfdf5;color:#065f46;box-shadow:inset 0 0 0 1px #059669;}',
      '.anatomy-atlas[data-anatomy-atlas="kidneys"] .anatomy-atlas-step-detail{border-left-color:#059669;background:#ecfdf5;color:#064e3b;}',
      '.anatomy-atlas[data-anatomy-atlas="alveoli"]{border-color:#bae6fd;background:linear-gradient(145deg,#fff 0%,#f0f9ff 100%);}',
      '.anatomy-atlas[data-anatomy-atlas="alveoli"] .anatomy-atlas-header h5{color:#075985;}',
      '.anatomy-atlas[data-anatomy-atlas="alveoli"] .anatomy-atlas-steps button[aria-pressed="true"]{border-color:#0284c7;background:#f0f9ff;color:#075985;box-shadow:inset 0 0 0 1px #0284c7;}',
      '.anatomy-atlas[data-anatomy-atlas="alveoli"] .anatomy-atlas-step-detail{border-left-color:#0284c7;background:#f0f9ff;color:#0c4a6e;}',
      '.anatomy-atlas[data-anatomy-atlas="patella"]{border-color:#fde68a;background:linear-gradient(145deg,#fff 0%,#fffbeb 100%);}',
      '.anatomy-atlas[data-anatomy-atlas="patella"] .anatomy-atlas-header h5{color:#92400e;}',
      '.anatomy-atlas[data-anatomy-atlas="patella"] .anatomy-atlas-steps button[aria-pressed="true"]{border-color:#d97706;background:#fffbeb;color:#92400e;box-shadow:inset 0 0 0 1px #d97706;}',
      '.anatomy-atlas[data-anatomy-atlas="patella"] .anatomy-atlas-step-detail{border-left-color:#d97706;background:#fffbeb;color:#78350f;}',
      '.anatomy-atlas[data-anatomy-atlas="biceps"]{border-color:#fbcfe8;background:linear-gradient(145deg,#fff 0%,#fdf2f8 100%);}',
      '.anatomy-atlas[data-anatomy-atlas="biceps"] .anatomy-atlas-header h5{color:#9d174d;}',
      '.anatomy-atlas[data-anatomy-atlas="biceps"] .anatomy-atlas-steps button[aria-pressed="true"]{border-color:#db2777;background:#fdf2f8;color:#9d174d;box-shadow:inset 0 0 0 1px #db2777;}',
      '.anatomy-atlas[data-anatomy-atlas="biceps"] .anatomy-atlas-step-detail{border-left-color:#db2777;background:#fdf2f8;color:#831843;}',
      '.anatomy-badge-panel,.anatomy-stats-panel{border-radius:8px!important;}',
      '@media (max-width:900px){.anatomy-mission-inner{grid-template-columns:1fr}.anatomy-workspace{grid-template-columns:1fr}.anatomy-body-shell{position:relative;top:auto}.anatomy-tab-strip{position:relative}}',
      '@media (max-width:720px){.anatomy-system-rail{grid-template-columns:repeat(3,minmax(0,1fr))}.anatomy-tab-strip{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))}.anatomy-tab-strip>button{width:100%;padding-left:8px;padding-right:8px}.anatomy-tab-strip>span{grid-column:1/-1;margin-left:0!important;text-align:right}}',
      '@media (forced-colors:active){.anatomy-canvas,.anatomy-minimap,.anatomy-canvas-toolbar button,.anatomy-marker-legend-symbol{forced-color-adjust:auto;border:1px solid CanvasText!important}.anatomy-minimap-viewport{border-color:Highlight!important}.anatomy-minimap-selected{background:Highlight!important;box-shadow:0 0 0 2px Canvas!important}}',
      '@media (max-width:560px){.anatomy-mission-inner{padding:12px}.anatomy-mission-title{font-size:18px}.anatomy-metric-grid{grid-template-columns:1fr 1fr}.anatomy-mode-card p{display:none}.anatomy-system-rail{grid-template-columns:1fr 1fr}.anatomy-tab-strip{grid-template-columns:1fr 1fr}.anatomy-body-header{align-items:flex-start}.anatomy-body-badges{align-items:flex-end}.anatomy-canvas-toolbar{align-items:stretch;flex-direction:column}.anatomy-canvas-toolbar>span{white-space:normal;max-width:none}.anatomy-canvas-toolbar-group{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));width:100%;gap:5px}.anatomy-canvas-toolbar button{width:100%;min-width:0;min-height:44px}.anatomy-minimap{right:6px;bottom:6px}.anatomy-tab-strip button,.anatomy-system-rail button,.anatomy-layer-bar button,.anatomy-controls-bar button,.anatomy-structure-list button{min-height:44px}}'
      ,
      '@media (prefers-reduced-motion:reduce){.anatomy-atlas-route.is-active{animation:none}.anatomy-atlas-route{transition:none}}',
      '@media (max-width:560px){.anatomy-atlas-steps{grid-template-columns:1fr 1fr}.anatomy-atlas-stage svg{min-height:210px}.anatomy-atlas-step-detail{display:block}.anatomy-atlas-step-detail strong{display:block;margin-bottom:3px}}',
    ].join('');
    document.head.appendChild(st);
  })();


  // ── Grade band helpers ──
  var getGradeBand = function(ctx) {
    var g = parseInt(ctx.gradeLevel, 10);
    if (isNaN(g) || g <= 2) return 'k2';
    if (g <= 5) return 'g35';
    if (g <= 8) return 'g68';
    return 'g912';
  };

  var getGradeIntro = function(band) {
    if (band === 'k2') return 'Welcome! Look at the human body and tap on the glowing dots to learn about your bones, muscles, and organs.';
    if (band === 'g35') return 'Explore the human body! Select different systems to see how bones, muscles, and organs work together to keep you alive.';
    if (band === 'g68') return 'Investigate human anatomy across 10 body systems. Toggle layers to see how skeletal, muscular, and organ systems overlap. Use the quiz to test your knowledge.';
    return 'Analyze detailed clinical anatomy across 10 systems with 129 structures. Study origin/insertion, clinical significance, and pathology. Explore brain waves and sleep architecture.';
  };

  // ── Sound engine (Web Audio API) ──
  var _audioCtx = null;
  function getAudioCtx() {
    if (!_audioCtx) {
      try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* audio not available */ }
    }
    return _audioCtx;
  }

  function playTone(freq, dur, type, vol) {
    var ac = getAudioCtx(); if (!ac) return;
    try {
      var osc = ac.createOscillator();
      var gain = ac.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol || 0.12, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (dur || 0.15));
      osc.connect(gain); gain.connect(ac.destination);
      osc.start(); osc.stop(ac.currentTime + (dur || 0.15));
    } catch (e) { /* audio not available */ }
  }

  function playSound(type) {
    try {
      switch (type) {
        case 'systemSelect':
          playTone(440, 0.08, 'sine', 0.08);
          setTimeout(function() { playTone(554, 0.1, 'sine', 0.08); }, 60);
          break;
        case 'structureClick':
          playTone(660, 0.06, 'sine', 0.07);
          break;
        case 'layerToggle':
          playTone(330, 0.08, 'triangle', 0.06);
          setTimeout(function() { playTone(440, 0.08, 'triangle', 0.06); }, 50);
          break;
        case 'viewSwitch':
          playTone(392, 0.1, 'sine', 0.06);
          setTimeout(function() { playTone(523, 0.1, 'sine', 0.06); }, 80);
          break;
        case 'quizCorrect':
          playTone(523, 0.1, 'sine', 0.12);
          setTimeout(function() { playTone(659, 0.1, 'sine', 0.12); }, 80);
          setTimeout(function() { playTone(784, 0.15, 'sine', 0.14); }, 160);
          break;
        case 'quizWrong':
          playTone(220, 0.25, 'sawtooth', 0.08);
          break;
        case 'badge':
          playTone(523, 0.08, 'sine', 0.1);
          setTimeout(function() { playTone(659, 0.08, 'sine', 0.1); }, 70);
          setTimeout(function() { playTone(784, 0.08, 'sine', 0.1); }, 140);
          setTimeout(function() { playTone(1047, 0.2, 'sine', 0.14); }, 210);
          break;
        case 'snapshot':
          playTone(1200, 0.04, 'sine', 0.08);
          setTimeout(function() { playTone(800, 0.06, 'sine', 0.06); }, 50);
          break;
        case 'aiTutor':
          playTone(698, 0.06, 'sine', 0.06);
          setTimeout(function() { playTone(880, 0.08, 'sine', 0.06); }, 50);
          break;
        case 'tts':
          playTone(550, 0.05, 'triangle', 0.05);
          break;
        case 'guidedStep':
          playTone(440, 0.08, 'sine', 0.07);
          setTimeout(function() { playTone(523, 0.1, 'sine', 0.07); }, 60);
          break;
        case 'connectionView':
          playTone(350, 0.1, 'triangle', 0.06);
          setTimeout(function() { playTone(525, 0.1, 'triangle', 0.06); }, 80);
          break;
        case 'spotterCorrect':
          playTone(587, 0.06, 'sine', 0.10);
          setTimeout(function() { playTone(784, 0.08, 'sine', 0.12); }, 50);
          setTimeout(function() { playTone(1047, 0.12, 'sine', 0.14); }, 110);
          break;
        case 'spotterWrong':
          playTone(294, 0.15, 'sawtooth', 0.07);
          setTimeout(function() { playTone(220, 0.2, 'sawtooth', 0.06); }, 100);
          break;
        case 'pathwayStep':
          playTone(494, 0.06, 'triangle', 0.06);
          setTimeout(function() { playTone(587, 0.06, 'triangle', 0.06); }, 50);
          break;
        case 'compareView':
          playTone(440, 0.06, 'sine', 0.06);
          setTimeout(function() { playTone(554, 0.06, 'sine', 0.06); }, 40);
          setTimeout(function() { playTone(440, 0.06, 'sine', 0.06); }, 80);
          break;
        case 'mnemonicReveal':
          playTone(392, 0.08, 'triangle', 0.07);
          setTimeout(function() { playTone(494, 0.1, 'triangle', 0.07); }, 60);
          break;
      }
    } catch (e) { /* audio not available */ }
  }

  // ── Badge definitions ──
  var BADGE_DEFS = [
    { id: 'firstStructure', name: 'First Discovery', desc: 'Select your first structure', icon: '\uD83D\uDD2C', xp: 10 },
    { id: 'systemExplorer5', name: 'System Explorer', desc: 'Explore 5 body systems', icon: '\uD83E\uDDED', xp: 15 },
    { id: 'allSystems', name: 'Body Master', desc: 'Explore all 10 systems', icon: '\uD83C\uDFC6', xp: 30 },
    { id: 'layerMaster', name: 'Layer Master', desc: 'Toggle all 7 layers', icon: '\uD83C\uDF9A', xp: 15 },
    { id: 'quizAce5', name: 'Quiz Ace', desc: '5 quiz questions correct', icon: '\u2B50', xp: 20 },
    { id: 'quizAce15', name: 'Quiz Champion', desc: '15 quiz questions correct', icon: '\uD83C\uDF1F', xp: 40 },
    { id: 'streak3', name: 'Hot Streak', desc: '3-question streak', icon: '\uD83D\uDD25', xp: 15 },
    { id: 'viewToggler', name: 'Both Sides', desc: 'View both anterior and posterior', icon: '\uD83D\uDD04', xp: 10 },
    { id: 'searchPro', name: 'Search Pro', desc: 'Use search to find 3 structures', icon: '\uD83D\uDD0D', xp: 10 },
    { id: 'aiCurious', name: 'Curious Mind', desc: 'Ask AI tutor 3 questions', icon: '\uD83E\uDD16', xp: 15 },
    { id: 'structureScholar', name: 'Structure Scholar', desc: 'View 50 different structures', icon: '\uD83D\uDCDA', xp: 25 },
    { id: 'tourComplete', name: 'Tour Guide', desc: 'Complete a guided tour', icon: '\uD83D\uDEB6', xp: 20 },
    { id: 'connectionExplorer', name: 'Systems Thinker', desc: 'Explore 5 system connections', icon: '\uD83D\uDD17', xp: 20 },
    { id: 'clinicalExpert', name: 'Clinical Reviewer', desc: 'Review 3 clinical cases', icon: '\uD83E\uDE7A', xp: 25 },
    { id: 'mnemonicLearner', name: 'Memory Master', desc: 'View 5 mnemonics', icon: '\uD83E\uDDE0', xp: 15 },
    { id: 'pathwayTracer', name: 'Pathway Tracer', desc: 'Complete 2 pathways', icon: '\uD83D\uDEE4', xp: 20 },
    { id: 'spotterPro', name: 'Spotter Pro', desc: 'Identify 5 in spotter test', icon: '\uD83C\uDFAF', xp: 25 },
    { id: 'compareMaster', name: 'Comparator', desc: 'Compare 5 structure pairs', icon: '\u2696', xp: 15 },
    { id: 'speedDemon', name: 'Speed Demon', desc: 'Identify a structure in under 3 seconds', icon: '\u26A1', xp: 20 },
    { id: 'anatomyChampion', name: 'Anatomy Champion', desc: 'Earn 12 other badges', icon: '\uD83D\uDC51', xp: 50 }
  ];

  // ── TTS helper (Kokoro-first) ──
  function speakText(text, callTTS) {
    playSound('tts');
    if (callTTS) { try { callTTS(text); return; } catch (e) {} }
    if (window._kokoroTTS && window._kokoroTTS.speak) {
      window._kokoroTTS.speak(String(text),'af_heart',1).then(function(url){if(url){var a=new Audio(url);a.playbackRate=0.95;a.play();}}).catch(function(){});
      return;
    }
    if (window.speechSynthesis) { var utter=new SpeechSynthesisUtterance(text); utter.rate=0.9; window.speechSynthesis.cancel(); window.speechSynthesis.speak(utter); }
  }

  // ═══ Register tool ═══
  var ANATOMY_SYSTEM_IDS = ['skeletal', 'muscular', 'circulatory', 'nervous', 'organs', 'respiratory', 'endocrine', 'lymphatic', 'integumentary', 'reproductive'];
  var ANATOMY_LAYER_IDS = ['skin', 'skeletal', 'muscular', 'organs', 'circulatory', 'nervous', 'lymphatic'];
  function countStoredTrueFlags(value, allowedIds) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return 0;
    return allowedIds.filter(function(id) { return value[id] === true; }).length;
  }

  function drawAnatomyImagingSlice(cx, W, H, state) {
    state = state || {};
    var modality = state.modality === 'MRI' ? 'MRI' : 'CT';
    var region = ['head', 'chest', 'abdomen'].indexOf(state.region) >= 0 ? state.region : 'chest';
    var plane = ['axial', 'coronal', 'sagittal'].indexOf(state.plane) >= 0 ? state.plane : 'axial';
    var rawSlice = Number(state.slice);
    var slice = Math.max(0, Math.min(100, Number.isFinite(rawSlice) ? rawSlice : 50));
    var windowWidth = Math.max(50, Math.min(2500, Number(state.windowWidth) || (modality === 'CT' ? 400 : 900)));
    var rawWindowLevel = Number(state.windowLevel);
    var windowLevel = Math.max(-1000, Math.min(1200, Number.isFinite(rawWindowLevel) ? rawWindowLevel : (modality === 'CT' ? 40 : 450)));
    var showLabels = state.showLabels !== false;
    var showCrosshair = state.showCrosshair !== false;
    var annotations = Array.isArray(state.annotations) ? state.annotations.slice(-12) : [];
    function gray(value) { var g = Math.round(Math.max(0, Math.min(1, (value - (windowLevel - windowWidth / 2)) / windowWidth)) * 255); return 'rgb(' + g + ',' + g + ',' + g + ')'; }
    function ellipse(x, y, rx, ry, value, label, stroke) { cx.beginPath(); cx.ellipse(x, y, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2); cx.fillStyle = gray(value); cx.fill(); if (stroke) { cx.strokeStyle = stroke; cx.lineWidth = 1.5; cx.stroke(); } if (showLabels && label) labels.push({ x: x, y: y, text: label }); }
    function rect(x, y, w, h, value, label) { cx.fillStyle = gray(value); cx.fillRect(x, y, w, h); if (showLabels && label) labels.push({ x: x + w / 2, y: y + h / 2, text: label }); }
    function line(x1, y1, x2, y2, color, width) { cx.beginPath(); cx.moveTo(x1, y1); cx.lineTo(x2, y2); cx.strokeStyle = color; cx.lineWidth = width || 1; cx.stroke(); }
    var labels = [];
    var signal = modality === 'CT'
      ? { air: -950, lung: -760, fat: -90, soft: 45, blood: 65, liver: 70, fluid: 10, bone: 900, white: 1200 }
      : { air: 30, lung: 70, fat: 720, soft: 470, blood: 330, liver: 520, fluid: state.sequence === 'T2' ? 850 : 180, bone: 55, white: 760 };
    cx.save(); cx.clearRect(0, 0, W, H); cx.fillStyle = '#020617'; cx.fillRect(0, 0, W, H);
    var scanX = 44, scanY = 28, scanW = W - 88, scanH = H - 72;
    cx.fillStyle = '#000'; cx.fillRect(scanX, scanY, scanW, scanH);
    var midX = W / 2, midY = scanY + scanH / 2, phase = slice / 100;
    if (region === 'head') {
      if (plane === 'axial') {
        var headRx = scanW * (0.27 + Math.sin(phase * Math.PI) * 0.08), headRy = scanH * (0.31 + Math.sin(phase * Math.PI) * 0.07);
        ellipse(midX, midY, headRx + 9, headRy + 9, signal.bone, 'Skull'); ellipse(midX, midY, headRx, headRy, signal.soft, 'Brain');
        ellipse(midX - headRx * 0.34, midY - 4, headRx * 0.28, headRy * 0.72, signal.white, 'Right hemisphere'); ellipse(midX + headRx * 0.34, midY - 4, headRx * 0.28, headRy * 0.72, signal.white, 'Left hemisphere');
        ellipse(midX - 18, midY, 8, 4 + phase * 4, signal.fluid, 'Ventricle'); ellipse(midX + 18, midY, 8, 4 + phase * 4, signal.fluid, null);
        if (phase < 0.36) { ellipse(midX - 48, midY + 58, 16, 11, signal.fluid, 'Orbit'); ellipse(midX + 48, midY + 58, 16, 11, signal.fluid, null); }
      } else if (plane === 'coronal') {
        ellipse(midX, midY, scanW * 0.27, scanH * 0.40, signal.bone, 'Skull'); ellipse(midX, midY - 2, scanW * 0.245, scanH * 0.37, signal.soft, 'Brain');
        ellipse(midX - 64, midY - 22, 47, 112, signal.white, 'Right hemisphere'); ellipse(midX + 64, midY - 22, 47, 112, signal.white, 'Left hemisphere');
        ellipse(midX - 13, midY - 10, 7, 23, signal.fluid, 'Lateral ventricles'); ellipse(midX + 13, midY - 10, 7, 23, signal.fluid, null);
      } else {
        ellipse(midX + 10, midY - 12, scanW * 0.25, scanH * 0.36, signal.bone, 'Skull'); ellipse(midX + 4, midY - 20, scanW * 0.22, scanH * 0.32, signal.soft, 'Brain');
        ellipse(midX - 56, midY + 75, 38, 31, signal.white, 'Cerebellum'); ellipse(midX + 6, midY + 5, 10, 28, signal.fluid, 'Ventricle');
      }
    } else if (region === 'chest') {
      if (plane === 'axial') {
        ellipse(midX, midY, scanW * 0.39, scanH * 0.34, signal.soft, 'Chest wall'); ellipse(midX, midY, scanW * 0.35, scanH * 0.30, signal.fat, null);
        ellipse(midX - 91, midY - 8, 73, 116 - phase * 22, signal.lung, 'Right lung'); ellipse(midX + 91, midY - 8, 68, 116 - phase * 22, signal.lung, 'Left lung');
        ellipse(midX + 20, midY + 34, 48, 58, signal.blood, 'Heart'); ellipse(midX, midY + 112, 17, 17, signal.bone, 'Vertebra'); ellipse(midX, midY + 97, 5, 5, signal.fluid, 'Spinal canal');
        ellipse(midX - 26, midY - 25, 8, 8, signal.air, 'Trachea');
      } else if (plane === 'coronal') {
        ellipse(midX, midY, scanW * 0.34, scanH * 0.46, signal.soft, 'Torso'); ellipse(midX - 83, midY - 25, 67, 145, signal.lung, 'Right lung'); ellipse(midX + 83, midY - 25, 67, 145, signal.lung, 'Left lung');
        ellipse(midX + 20, midY + 55, 54, 70, signal.blood, 'Heart'); rect(midX - 8, midY - 154, 16, 310, signal.bone, 'Spine'); line(midX - 156, midY + 130, midX + 156, midY + 130, gray(signal.soft), 5); labels.push({ x: midX, y: midY + 124, text: 'Diaphragm' });
      } else {
        ellipse(midX, midY, scanW * 0.25, scanH * 0.46, signal.soft, 'Torso'); ellipse(midX - 12, midY - 26, 96, 145, signal.lung, 'Lung'); ellipse(midX + 32, midY + 57, 43, 59, signal.blood, 'Heart'); rect(midX + 104, midY - 155, 16, 315, signal.bone, 'Spine');
      }
    } else {
      if (plane === 'axial') {
        ellipse(midX, midY, scanW * 0.39, scanH * 0.34, signal.soft, 'Abdominal wall'); ellipse(midX, midY, scanW * 0.35, scanH * 0.30, signal.fat, null);
        ellipse(midX - 83, midY - 48, 94, 63, signal.liver, 'Liver'); ellipse(midX - 95, midY + 54, 34, 47, signal.soft, 'Right kidney'); ellipse(midX + 95, midY + 54, 34, 47, signal.soft, 'Left kidney'); ellipse(midX, midY + 102, 18, 18, signal.bone, 'Vertebra');
        for (var bi = 0; bi < 6; bi++) ellipse(midX - 58 + (bi % 3) * 58, midY + (bi < 3 ? 3 : 42), 18, 12, signal.air, bi === 0 ? 'Bowel gas' : null);
      } else if (plane === 'coronal') {
        ellipse(midX, midY, scanW * 0.34, scanH * 0.46, signal.soft, 'Torso'); ellipse(midX - 84, midY - 76, 93, 58, signal.liver, 'Liver'); ellipse(midX - 85, midY + 36, 32, 54, signal.soft, 'Right kidney'); ellipse(midX + 85, midY + 36, 32, 54, signal.soft, 'Left kidney'); rect(midX - 8, midY - 155, 16, 310, signal.bone, 'Spine'); ellipse(midX, midY + 120, 52, 36, signal.fluid, 'Bladder');
      } else {
        ellipse(midX, midY, scanW * 0.25, scanH * 0.46, signal.soft, 'Torso'); ellipse(midX - 35, midY - 70, 83, 62, signal.liver, 'Liver'); ellipse(midX + 14, midY + 25, 30, 53, signal.soft, 'Kidney'); rect(midX + 104, midY - 155, 16, 315, signal.bone, 'Spine'); ellipse(midX - 15, midY + 125, 42, 28, signal.fluid, 'Bladder');
      }
    }
    if (showCrosshair) { cx.setLineDash([5, 5]); line(midX, scanY, midX, scanY + scanH, 'rgba(34,211,238,.55)'); line(scanX, midY, scanX + scanW, midY, 'rgba(34,211,238,.55)'); cx.setLineDash([]); }
    cx.font = 'bold 11px Inter, system-ui, sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    labels.forEach(function(label) { cx.fillStyle = 'rgba(2,6,23,.78)'; var tw = cx.measureText(label.text).width + 10; cx.fillRect(label.x - tw / 2, label.y - 9, tw, 18); cx.fillStyle = '#e0f2fe'; cx.fillText(label.text, label.x, label.y); });
    annotations.forEach(function(note, index) { var ax = scanX + Math.max(0, Math.min(1, Number(note.x) || 0)) * scanW, ay = scanY + Math.max(0, Math.min(1, Number(note.y) || 0)) * scanH; cx.fillStyle = '#facc15'; cx.beginPath(); cx.arc(ax, ay, 7, 0, Math.PI * 2); cx.fill(); cx.fillStyle = '#111827'; cx.font = 'bold 9px sans-serif'; cx.fillText(String(index + 1), ax, ay + 0.5); if (note.x2 != null && note.y2 != null) { var bx = scanX + note.x2 * scanW, by = scanY + note.y2 * scanH; line(ax, ay, bx, by, '#facc15', 2); cx.beginPath(); cx.arc(bx, by, 4, 0, Math.PI * 2); cx.fillStyle = '#facc15'; cx.fill(); } });
    cx.font = 'bold 12px Inter, system-ui, sans-serif'; cx.textAlign = 'left'; cx.fillStyle = '#f8fafc'; cx.fillText(modality + ' · ' + region.toUpperCase() + ' · ' + plane.toUpperCase() + ' · slice ' + Math.round(slice), scanX, 15);
    cx.textAlign = 'right'; cx.fillStyle = '#94a3b8'; cx.fillText(modality === 'CT' ? ('W ' + Math.round(windowWidth) + ' / L ' + Math.round(windowLevel)) : ((state.sequence || 'T1') + ' display window'), scanX + scanW, 15);
    cx.textAlign = 'center'; cx.fillStyle = '#f8fafc'; cx.fillText(plane === 'sagittal' ? 'A' : 'R', scanX + 12, midY); cx.fillText(plane === 'sagittal' ? 'P' : 'L', scanX + scanW - 12, midY); cx.fillText('S', midX, scanY + 12); cx.fillText('I', midX, scanY + scanH - 12);
    line(scanX + 16, scanY + scanH - 18, scanX + 86, scanY + scanH - 18, '#fff', 3); cx.textAlign = 'left'; cx.fillText('50 mm', scanX + 92, scanY + scanH - 18); cx.restore();
    return { modality: modality, region: region, plane: plane, slice: slice, windowWidth: windowWidth, windowLevel: windowLevel, labelCount: labels.length, annotationCount: annotations.length };
  }
  try { window.__alloAnatomyImagingPure = { drawAnatomyImagingSlice: drawAnatomyImagingSlice }; } catch (e) {}
  function normalizeAnatomyProcedureStroke(value) {
    var source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    var points = Array.isArray(source.points) ? source.points : [];
    return {
      id: typeof source.id === 'string' ? source.id.slice(0, 80) : '',
      tool: ['scalpel', 'retractor', 'suction', 'cautery', 'forceps'].indexOf(source.tool) >= 0 ? source.tool : 'scalpel',
      input: ['mouse', 'pen', 'touch', 'keyboard'].indexOf(source.input) >= 0 ? source.input : 'mouse',
      points: points.filter(function(point) { return point && typeof point === 'object'; }).slice(-96).map(function(point, index) {
        var x = Number(point.x), y = Number(point.y), pressure = Number(point.pressure), time = Number(point.time);
        return {
          x: Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : 0.5,
          y: Number.isFinite(y) ? Math.max(0, Math.min(1, y)) : 0.1,
          pressure: Number.isFinite(pressure) ? Math.max(0, Math.min(1, pressure)) : 0.4,
          time: Number.isFinite(time) ? Math.max(0, time) : index * 16
        };
      }),
      before: source.before && typeof source.before === 'object' && !Array.isArray(source.before) ? source.before : null,
      metrics: source.metrics && typeof source.metrics === 'object' && !Array.isArray(source.metrics) ? source.metrics : null
    };
  }
  function normalizeAnatomyProcedureState(value) {
    var source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    function bounded(number, min, max, fallback) {
      var parsed = Number(number);
      return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
    }
    var allowedTools = ['scalpel', 'retractor', 'suction', 'cautery', 'forceps'];
    var stage = Math.round(bounded(source.stage, 0, 6, 0));
    var actionLog = Array.isArray(source.actionLog) ? source.actionLog.filter(function(item) {
      return item && typeof item === 'object' && !Array.isArray(item) && typeof item.label === 'string';
    }).slice(-14) : [];
    var strokes = Array.isArray(source.strokes) ? source.strokes.map(normalizeAnatomyProcedureStroke).filter(function(stroke) { return stroke.points.length > 0; }).slice(-12) : [];
    return {
      stage: stage,
      planSlice: bounded(source.planSlice, 0, 100, 50),
      planLocked: source.planLocked === true,
      timeoutConfirmed: source.timeoutConfirmed === true,
      sterilePrep: source.sterilePrep === true,
      eyeProtection: source.eyeProtection === true,
      tool: allowedTools.indexOf(source.tool) >= 0 ? source.tool : 'scalpel',
      pressure: bounded(source.pressure, 1, 10, 4),
      angle: bounded(source.angle, 15, 90, 45),
      incisionDepth: bounded(source.incisionDepth, 0, 100, 0),
      exposure: bounded(source.exposure, 0, 100, 0),
      bleeding: bounded(source.bleeding, 0, 100, 0),
      tissueDamage: bounded(source.tissueDamage, 0, 100, 0),
      sampleIntegrity: bounded(source.sampleIntegrity, 0, 100, 100),
      actions: Math.round(bounded(source.actions, 0, 999, 0)),
      specimenCollected: source.specimenCollected === true,
      microscopyStarted: source.microscopyStarted === true,
      microscopyComplete: source.microscopyComplete === true,
      specimenId: typeof source.specimenId === 'string' ? source.specimenId.slice(0, 80) : '',
      evidenceId: typeof source.evidenceId === 'string' ? source.evidenceId.slice(0, 80) : '',
      strokes: strokes,
      showReplay: source.showReplay === true,
      reducedVisuals: source.reducedVisuals === true,
      feedback: typeof source.feedback === 'string' ? source.feedback.slice(0, 240) : 'Review the synthetic scan and lock a safe target slice.',
      actionLog: actionLog
    };
  }
  function analyzeAnatomyProcedureStroke(value) {
    var stroke = normalizeAnatomyProcedureStroke(value);
    var points = stroke.points;
    if (points.length === 0) return { pointCount: 0, length: 0, durationMs: 0, meanPressure: 0, pressureVariation: 0, speed: 0, straightness: 0, steadiness: 0, precision: 0, control: 0, quality: 0, maxDepth: 0, horizontalTravel: 0, verticalTravel: 0, targetDistance: 1, recommendation: 'Draw a deliberate instrument path inside the tissue field.' };
    var length = 0, pressureSum = 0, pressureSquareSum = 0, maxY = points[0].y, deviationSum = 0;
    for (var i = 0; i < points.length; i++) {
      pressureSum += points[i].pressure;
      pressureSquareSum += points[i].pressure * points[i].pressure;
      maxY = Math.max(maxY, points[i].y);
      deviationSum += Math.abs(points[i].x - 0.5);
      if (i > 0) length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    }
    var first = points[0], last = points[points.length - 1];
    var direct = Math.hypot(last.x - first.x, last.y - first.y);
    var durationMs = Math.max(16, last.time - first.time);
    var meanPressure = pressureSum / points.length;
    var pressureVariation = Math.sqrt(Math.max(0, pressureSquareSum / points.length - meanPressure * meanPressure));
    var straightness = length > 0 ? Math.min(1, direct / length) : 1;
    var deviation = deviationSum / points.length;
    var speed = length / (durationMs / 1000);
    var pathAngle = Math.atan2(Math.abs(last.y - first.y), Math.abs(last.x - first.x)) * 180 / Math.PI;
    var targetDistance = Math.hypot(last.x - 0.57, last.y - 0.78);
    var steadiness = stroke.tool === 'scalpel' ? Math.max(0, Math.min(100, 100 - deviation * 420 - (1 - straightness) * 55)) : Math.max(0, Math.min(100, straightness * 100 - pressureVariation * 80));
    var precision = stroke.tool === 'scalpel' ? Math.max(0, Math.min(100, 100 - deviation * 500 - (1 - straightness) * 35)) : stroke.tool === 'forceps' ? Math.max(0, Math.min(100, 100 - targetDistance * 320 - (1 - straightness) * 25)) : Math.max(0, Math.min(100, straightness * 100 - pressureVariation * 120));
    var control = Math.max(0, Math.min(100, 100 - Math.max(0, speed - 0.9) * 28 - pressureVariation * 180));
    var quality = Math.round((steadiness + precision + control) / 3);
    var recommendation = stroke.tool === 'forceps' && targetDistance > 0.18 ? 'Finish the forceps gesture closer to the highlighted target.' : stroke.tool === 'scalpel' && precision < 60 ? 'Stay closer to the planned centerline.' : control < 60 ? 'Slow down and keep pressure more consistent.' : meanPressure > 0.75 ? 'Use lighter pressure to reduce tissue impact.' : 'Controlled path. Preserve this pace and alignment.';
    return {
      pointCount: points.length,
      length: Math.round(length * 1000) / 1000,
      durationMs: durationMs,
      meanPressure: Math.round(meanPressure * 100) / 100,
      pressureVariation: Math.round(pressureVariation * 100) / 100,
      speed: Math.round(speed * 100) / 100,
      pathAngle: Math.round(pathAngle),
      straightness: Math.round(straightness * 100) / 100,
      steadiness: Math.round(steadiness),
      precision: Math.round(precision),
      control: Math.round(control),
      quality: quality,
      maxDepth: Math.round(Math.max(0, Math.min(100, (maxY - 0.114) / 0.795 * 100))),
      horizontalTravel: Math.round(Math.abs(last.x - first.x) * 100) / 100,
      verticalTravel: Math.round(Math.abs(last.y - first.y) * 100) / 100,
      targetDistance: Math.round(targetDistance * 100) / 100,
      recommendation: recommendation
    };
  }
  function applyAnatomyProcedureStroke(value, strokeValue) {
    var state = normalizeAnatomyProcedureState(value);
    var stroke = normalizeAnatomyProcedureStroke(strokeValue);
    var metrics = analyzeAnatomyProcedureStroke(stroke);
    if (stroke.points.length < 2) return Object.assign({}, state, { feedback: 'Draw a longer instrument path before releasing.' });
    var before = { stage: state.stage, incisionDepth: state.incisionDepth, exposure: state.exposure, bleeding: state.bleeding, tissueDamage: state.tissueDamage, sampleIntegrity: state.sampleIntegrity, specimenCollected: state.specimenCollected, specimenId: state.specimenId };
    var stage = state.stage, depth = state.incisionDepth, exposure = state.exposure, bleeding = state.bleeding, damage = state.tissueDamage, integrity = state.sampleIntegrity, collected = state.specimenCollected, specimenId = state.specimenId;
    var feedback = metrics.recommendation;
    if (stroke.tool === 'scalpel') {
      if (depth >= 76) feedback = 'The target bed is already reached. Choose a field-control instrument.';
      else {
        depth = Math.max(depth, Math.min(76, metrics.maxDepth));
        bleeding = Math.min(100, bleeding + metrics.meanPressure * 10 + metrics.verticalTravel * 5);
        damage = Math.min(100, damage + (100 - metrics.precision) * 0.045 + Math.max(0, metrics.meanPressure - 0.65) * 12 + Math.max(0, metrics.speed - 1.2) * 2 + (state.angle < 30 || state.angle > 65 ? 3 : 0));
        stage = depth >= 60 ? 3 : 2;
        feedback = 'Scalpel stroke: ' + metrics.precision + '% precision, ' + metrics.steadiness + '% steadiness, path angle ' + metrics.pathAngle + ' degrees. ' + metrics.recommendation;
      }
    } else if (stroke.tool === 'retractor') {
      if (depth < 50) feedback = 'More controlled access is needed before retraction.';
      else {
        exposure = Math.min(100, exposure + metrics.horizontalTravel * 90 + metrics.length * 12);
        damage = Math.min(100, damage + Math.max(0, metrics.meanPressure - 0.65) * 9);
        feedback = 'Retraction increased exposure to ' + Math.round(exposure) + '%. ' + metrics.recommendation;
      }
    } else if (stroke.tool === 'suction') {
      bleeding = Math.max(0, bleeding - metrics.length * 34 - metrics.meanPressure * 10);
      feedback = 'Suction cleared the simulated field to ' + Math.round(bleeding) + '% bleeding. It improves visibility but does not seal a source.';
    } else if (stroke.tool === 'cautery') {
      bleeding = Math.max(0, bleeding - metrics.length * 28 - metrics.meanPressure * 16);
      damage = Math.min(100, damage + metrics.length * 5 + metrics.meanPressure * 5);
      integrity = Math.max(0, integrity - metrics.meanPressure * 2.5);
      feedback = 'Cautery reduced bleeding with a thermal tissue cost. ' + metrics.recommendation;
    } else if (stroke.tool === 'forceps') {
      if (depth < 66 || exposure < 50 || bleeding > 35) feedback = 'The target is not ready. Reach the target bed, increase exposure above 50%, and reduce bleeding below 35.';
      else if (metrics.targetDistance > 0.18) feedback = 'Forceps missed the target. Finish the gesture closer to the highlighted specimen.';
      else {
        integrity = Math.max(0, 100 - damage * 0.65 - bleeding * 0.25 - (100 - metrics.precision) * 0.08);
        collected = true;
        specimenId = typeof strokeValue.id === 'string' && strokeValue.id ? 'synthetic-specimen-' + strokeValue.id : 'synthetic-specimen-' + (state.actions + 1);
        stage = 5;
        feedback = 'Specimen preserved with ' + Math.round(integrity) + '% integrity. Continue to cell microdissection.';
      }
    }
    if (!collected && depth >= 66 && exposure >= 50 && bleeding <= 35) stage = 4;
    stroke.id = stroke.id || ('stroke-' + (state.actions + 1));
    stroke.before = before;
    stroke.metrics = metrics;
    var label = stroke.tool.charAt(0).toUpperCase() + stroke.tool.slice(1) + ' gesture · ' + metrics.quality + '% control';
    return Object.assign({}, state, {
      stage: stage,
      incisionDepth: depth,
      exposure: exposure,
      bleeding: bleeding,
      tissueDamage: damage,
      sampleIntegrity: integrity,
      specimenCollected: collected,
      specimenId: specimenId,
      actions: state.actions + 1,
      strokes: state.strokes.concat([stroke]).slice(-12),
      actionLog: state.actionLog.concat([{ id: stroke.id, label: label, tool: stroke.tool, depth: Math.round(depth), at: Number(strokeValue.endedAt) || 0 }]).slice(-14),
      feedback: feedback
    });
  }
  function undoAnatomyProcedureStroke(value) {
    var state = normalizeAnatomyProcedureState(value);
    var last = state.strokes[state.strokes.length - 1];
    if (!last || !last.before) return Object.assign({}, state, { feedback: 'No direct gesture is available to undo.' });
    return Object.assign({}, state, last.before, { actions: Math.max(0, state.actions - 1), strokes: state.strokes.slice(0, -1), actionLog: state.actionLog.slice(0, -1), feedback: 'Last direct gesture undone.' });
  }
  function evaluateAnatomyProcedure(value) {
    var state = normalizeAnatomyProcedureState(value);
    var planning = state.planLocked ? Math.max(0, 20 - Math.abs(state.planSlice - 58) * 1.25) : 0;
    var preparation = (state.timeoutConfirmed ? 5 : 0) + (state.sterilePrep ? 5 : 0) + (state.eyeProtection ? 5 : 0);
    var safety = Math.max(0, 25 - state.tissueDamage * 0.45 - state.bleeding * 0.18);
    var specimen = state.specimenCollected ? Math.max(0, 15 * state.sampleIntegrity / 100) : 0;
    var efficiency = Math.max(0, 15 - Math.max(0, state.actions - 8) * 1.5);
    var microscopy = state.microscopyComplete ? 10 : 0;
    var total = Math.round(Math.max(0, Math.min(100, planning + preparation + safety + specimen + efficiency + microscopy)));
    return {
      total: total,
      planning: Math.round(planning),
      preparation: Math.round(preparation),
      safety: Math.round(safety),
      specimen: Math.round(specimen),
      efficiency: Math.round(efficiency),
      microscopy: microscopy,
      label: total >= 85 ? 'Ready to extend' : total >= 65 ? 'Developing control' : 'Practice recommended'
    };
  }
  function drawAnatomyProcedureField(cx, W, H, value) {
    var state = normalizeAnatomyProcedureState(value);
    var pad = 34, fieldX = pad, fieldY = 50, fieldW = W - pad * 2, fieldH = H - 90;
    var layers = [
      { name: 'Skin', start: 0, end: 10, color: '#f0b59a' },
      { name: 'Adipose', start: 10, end: 30, color: '#facc6b' },
      { name: 'Fascia', start: 30, end: 38, color: '#e2e8f0' },
      { name: 'Muscle', start: 38, end: 66, color: '#b85c65' },
      { name: 'Target bed', start: 66, end: 100, color: '#7f1d3f' }
    ];
    cx.save();
    cx.clearRect(0, 0, W, H);
    cx.fillStyle = '#07111f'; cx.fillRect(0, 0, W, H);
    cx.fillStyle = '#e2e8f0'; cx.font = 'bold 14px system-ui, sans-serif'; cx.textAlign = 'left';
    cx.fillText('Synthetic layered tissue field', fieldX, 25);
    cx.font = '11px system-ui, sans-serif'; cx.fillStyle = '#94a3b8'; cx.textAlign = 'right';
    cx.fillText('Depth ' + Math.round(state.incisionDepth) + '% · exposure ' + Math.round(state.exposure) + '%', W - fieldX, 25);
    layers.forEach(function(layer) {
      var y = fieldY + fieldH * layer.start / 100;
      var height = fieldH * (layer.end - layer.start) / 100;
      cx.fillStyle = layer.color; cx.fillRect(fieldX, y, fieldW, height + 1);
      cx.fillStyle = layer.start >= 66 ? '#fff' : '#1f2937'; cx.textAlign = 'left'; cx.font = 'bold 11px system-ui, sans-serif';
      cx.fillText(layer.name, fieldX + 10, y + Math.max(13, height / 2 + 4));
    });
    var targetX = fieldX + fieldW * 0.57, targetY = fieldY + fieldH * 0.78;
    cx.beginPath(); cx.ellipse(targetX, targetY, fieldW * 0.075, fieldH * 0.075, 0, 0, Math.PI * 2);
    cx.fillStyle = state.specimenCollected ? '#475569' : '#f472b6'; cx.fill();
    cx.lineWidth = 3; cx.strokeStyle = '#fce7f3'; cx.stroke();
    cx.fillStyle = '#fff'; cx.textAlign = 'center'; cx.font = 'bold 10px system-ui, sans-serif';
    cx.fillText(state.specimenCollected ? 'sample removed' : 'synthetic target', targetX, targetY + 4);
    cx.save();
    if (cx.setLineDash) cx.setLineDash([7, 6]);
    cx.beginPath(); cx.moveTo(fieldX + fieldW * 0.5, fieldY); cx.lineTo(targetX, targetY);
    cx.strokeStyle = '#67e8f9'; cx.lineWidth = 2; cx.stroke();
    if (cx.setLineDash) cx.setLineDash([]);
    cx.restore();
    var displayStrokes = state.strokes.slice();
    if (value && Array.isArray(value.activeStroke) && value.activeStroke.length) displayStrokes.push(normalizeAnatomyProcedureStroke({ tool: state.tool, input: 'mouse', points: value.activeStroke }));
    var strokeColors = { scalpel: '#fff1f2', retractor: '#cbd5e1', suction: '#7dd3fc', cautery: '#fb923c', forceps: '#d8b4fe' };
    displayStrokes.forEach(function(stroke, strokeIndex) {
      if (!stroke.points || stroke.points.length < 2) return;
      cx.save();
      cx.beginPath();
      stroke.points.forEach(function(point, pointIndex) { if (pointIndex === 0) cx.moveTo(point.x * W, point.y * H); else cx.lineTo(point.x * W, point.y * H); });
      var impact = stroke.metrics && Number(stroke.metrics.quality);
      cx.strokeStyle = state.showReplay && Number.isFinite(impact) && impact < 60 ? '#fb7185' : strokeColors[stroke.tool] || '#fff';
      cx.lineWidth = state.showReplay ? 7 : Math.max(2, state.pressure * 0.45);
      cx.globalAlpha = state.showReplay ? 0.72 : (strokeIndex === displayStrokes.length - 1 ? 0.95 : 0.45);
      cx.stroke();
      cx.restore();
    });    var cutX = fieldX + fieldW * 0.5;
    var cutEnd = fieldY + fieldH * state.incisionDepth / 100;
    cx.beginPath(); cx.moveTo(cutX, fieldY); cx.lineTo(cutX, cutEnd);
    cx.strokeStyle = '#fee2e2'; cx.lineWidth = Math.max(2, state.pressure * 0.7); cx.stroke();
    if (state.exposure > 20) {
      var spread = 8 + state.exposure * 0.12;
      cx.beginPath(); cx.moveTo(cutX - spread, cutEnd - 28); cx.lineTo(cutX - spread - 22, cutEnd - 12);
      cx.moveTo(cutX + spread, cutEnd - 28); cx.lineTo(cutX + spread + 22, cutEnd - 12);
      cx.strokeStyle = '#cbd5e1'; cx.lineWidth = 4; cx.stroke();
    }
    var bleedCount = state.reducedVisuals ? 0 : Math.min(8, Math.ceil(state.bleeding / 10));
    for (var i = 0; i < bleedCount; i++) {
      cx.beginPath(); cx.arc(cutX + ((i % 2) ? 1 : -1) * (8 + i * 3), Math.min(cutEnd + i * 4, fieldY + fieldH - 8), 3 + (i % 3), 0, Math.PI * 2);
      cx.fillStyle = '#be123c'; cx.fill();
    }
    cx.strokeStyle = '#64748b'; cx.lineWidth = 1;
    for (var tick = 0; tick <= 100; tick += 10) {
      var ty = fieldY + fieldH * tick / 100;
      cx.beginPath(); cx.moveTo(fieldX + fieldW + 3, ty); cx.lineTo(fieldX + fieldW + (tick % 20 === 0 ? 14 : 8), ty); cx.stroke();
      if (tick % 20 === 0) { cx.fillStyle = '#cbd5e1'; cx.textAlign = 'left'; cx.font = '10px system-ui, sans-serif'; cx.fillText(tick + '%', fieldX + fieldW + 17, ty + 3); }
    }
    cx.fillStyle = '#e2e8f0'; cx.textAlign = 'left'; cx.font = 'bold 11px system-ui, sans-serif';
    cx.fillText('Active instrument: ' + state.tool, fieldX, H - 16);
    cx.fillStyle = state.bleeding > 35 ? '#fda4af' : '#86efac'; cx.textAlign = 'right';
    cx.fillText('Bleeding ' + Math.round(state.bleeding) + ' · tissue impact ' + Math.round(state.tissueDamage), W - fieldX, H - 16);
    cx.restore();
    return { stage: state.stage, tool: state.tool, incisionDepth: state.incisionDepth, exposure: state.exposure, bleeding: state.bleeding, tissueDamage: state.tissueDamage, specimenCollected: state.specimenCollected, strokeCount: state.strokes.length, replay: state.showReplay };
  }
  try { window.__alloAnatomyProcedurePure = { normalizeStroke: normalizeAnatomyProcedureStroke, analyzeStroke: analyzeAnatomyProcedureStroke, applyStroke: applyAnatomyProcedureStroke, undoStroke: undoAnatomyProcedureStroke, normalize: normalizeAnatomyProcedureState, evaluate: evaluateAnatomyProcedure, draw: drawAnatomyProcedureField }; } catch (e) {}
  window.StemLab.registerTool('anatomy', {
    icon: '\uD83E\uDEC0',
    label: "Human Anatomy Explorer",
    desc: 'Explore 10 body systems with layered anatomical visualization',
    color: 'slate',
    category: 'science',
    questHooks: [
      { id: 'explore_3_systems', label: 'Explore 3 different body systems', icon: '\uD83E\uDEC0', check: function(d) { return countStoredTrueFlags(d._systemsExplored, ANATOMY_SYSTEM_IDS) >= 3; }, progress: function(d) { return countStoredTrueFlags(d._systemsExplored, ANATOMY_SYSTEM_IDS) + '/3 systems'; } },
      { id: 'explore_all_systems', label: 'Explore all body systems', icon: '\uD83C\uDFC6', check: function(d) { return countStoredTrueFlags(d._systemsExplored, ANATOMY_SYSTEM_IDS) >= ANATOMY_SYSTEM_IDS.length; }, progress: function(d) { return countStoredTrueFlags(d._systemsExplored, ANATOMY_SYSTEM_IDS) + '/' + ANATOMY_SYSTEM_IDS.length + ' systems'; } },
      { id: 'complete_tour', label: 'Complete a guided anatomy tour', icon: '\uD83D\uDCDA', check: function(d) { return d._tourCompleted === true; }, progress: function(d) { return d._tourCompleted === true ? 'Done!' : 'Not yet'; } },
      { id: 'toggle_layers', label: 'Use the layer toggle to reveal internal structures', icon: '\uD83D\uDD2C', check: function(d) { return countStoredTrueFlags(d.visibleLayers, ANATOMY_LAYER_IDS.slice(1)) >= 1; }, progress: function(d) { return countStoredTrueFlags(d.visibleLayers, ANATOMY_LAYER_IDS.slice(1)) >= 1 ? 'Explored!' : 'Toggle layers'; } }
    ],
    render: function(ctx) {
      // honor the 2nd-arg English fallback (ctx.t is single-arg & ignores it; see dev-tools/check_i18n_fallback.cjs)
      var t = function (k, fb) { var v; try { v = (typeof ctx.t === 'function') ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
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

      // ── Tool body (anatomy) ──
      return (function() {
        var d = labToolData.anatomy || {};

          // ── Canvas narration: init ──
          if (typeof canvasNarrate === 'function') {
            canvasNarrate('anatomy', 'init', {
              first: 'Human Anatomy Explorer loaded. Explore body systems including skeletal, muscular, circulatory, and nervous systems with interactive diagrams.',
              repeat: 'Anatomy Explorer active.',
              terse: 'Anatomy.'
            }, { debounce: 800 });
          }
        var upd = function(k, v) {
          setLabToolData(function(p) {
            return Object.assign({}, p, { anatomy: Object.assign({}, p.anatomy, (function() { var o = {}; o[k] = v; return o; })()) });
          });
        };
        var updMulti = function(obj) {
          setLabToolData(function(p) {
            return Object.assign({}, p, { anatomy: Object.assign({}, p.anatomy, obj) });
          });
        };
        function safeNonNegativeNumber(value, fallback, integer) {
          var number = Number(value);
          return Number.isFinite(number) && number >= 0 ? (integer ? Math.floor(number) : number) : fallback;
        }
        function safeFlagMap(value, allowedIds) {
          var result = {};
          if (!value || typeof value !== 'object' || Array.isArray(value)) return result;
          Object.keys(value).forEach(function(key) {
            if (value[key] && allowedIds.indexOf(key) !== -1) result[key] = true;
          });
          return result;
        }
        function safeBooleanMap(value, allowedIds) {
          var result = {};
          if (!value || typeof value !== 'object' || Array.isArray(value)) return result;
          Object.keys(value).forEach(function(key) {
            if (typeof value[key] === 'boolean' && allowedIds.indexOf(key) !== -1) result[key] = value[key];
          });
          return result;
        }
        function safeEnumMap(value, allowedIds, allowedValues) {
          var result = {};
          if (!value || typeof value !== 'object' || Array.isArray(value)) return result;
          Object.keys(value).forEach(function(key) {
            if (allowedIds.indexOf(key) !== -1 && allowedValues.indexOf(value[key]) !== -1) result[key] = value[key];
          });
          return result;
        }

        // ── Grade band ──
        var gradeBand = getGradeBand(ctx);
        var gradeIntro = getGradeIntro(gradeBand);

        // ── Active tab ──
        var anatomyTabOrder = ['explore', 'imaging', 'procedure', 'tour', 'connections', 'aiTutor', 'spotter', 'pathways', 'flashcards', 'homeoHunt'];
        var activeTab = anatomyTabOrder.indexOf(d._activeTab) !== -1 ? d._activeTab : 'explore';
        var focusedAnatomyWorkspace = activeTab === 'imaging' || activeTab === 'procedure';
        function activateAnatomyTab(tab) {
          if (tab === 'tour') {
            var nextTourIndex = tourActive ? tourStepIdx : 0;
            var tabTourStep = tourSteps && tourSteps[nextTourIndex];
            var tourPatch = { _activeTab: tab, _tourActive: true, _tourStepIdx: nextTourIndex };
            if (tabTourStep) {
              updMulti(structureFocusPatch(tabTourStep.structureId, tourPatch));
              announceStructure(tabTourStep.structureId);
            } else updMulti(tourPatch);
            return;
          }
          if (tab === 'pathways' && activePathway && activePathway.steps[pathwayStepIdx]) {
            var tabPathwayStep = activePathway.steps[pathwayStepIdx];
            updMulti(structureFocusPatch(tabPathwayStep.structure, { _activeTab: tab, _pathwayStep: pathwayStepIdx }));
            announceStructure(tabPathwayStep.structure);
            return;
          }
          if (tab === 'flashcards' && flashcardPool && flashcardPool.length > 0) {
            var tabFlashcard = flashcardPool[flashcardIdx];
            updMulti(structureFocusPatch(tabFlashcard.id, { _activeTab: tab }));
            announceStructure(tabFlashcard.id);
            return;
          }
          upd('_activeTab', tab);
        }
        function handleAnatomyTabKey(event) {
          if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].indexOf(event.key) === -1) return;
          event.preventDefault();
          var current = Math.max(0, anatomyTabOrder.indexOf(activeTab));
          var next = event.key === 'Home' ? 0 : event.key === 'End' ? anatomyTabOrder.length - 1 :
            (current + (event.key === 'ArrowRight' ? 1 : -1) + anatomyTabOrder.length) % anatomyTabOrder.length;
          activateAnatomyTab(anatomyTabOrder[next]);
          var tabButtons = event.currentTarget.querySelectorAll('[role="tab"]');
          if (tabButtons[next]) setTimeout(function() { tabButtons[next].focus(); }, 0);
        }

        var ANAT_CHALLENGES = [
          { id: 'explore_systems', name: t('stem.anatomy.system_explorer', 'System Explorer'), desc: t('stem.anatomy.explore_3_different_body_systems', 'Explore 3 different body systems'), icon: '🫁', rp: 15, check: function() { return Object.keys(systemsExplored).length >= 3; } },
          { id: 'spotter_3', name: t('stem.anatomy.spotter_pro', 'Spotter Pro'), desc: t('stem.anatomy.identify_3_structures_in_the_spotter_t', 'Identify 3 structures in the Spotter Test'), icon: '🎯', rp: 20, check: function() { return spotterScore >= 3; } },
          { id: 'cases_solved', name: t('stem.anatomy.clinical_intern', 'Clinical Reviewer'), desc: t('stem.anatomy.solve_2_clinical_cases', 'Review 2 clinical cases'), icon: '🥼', rp: 25, check: function() { return clinicalSolved >= 2; } },
          { id: 'pathways_traced', name: t('stem.anatomy.pathway_explorer', 'Pathway Explorer'), desc: t('stem.anatomy.complete_2_physiological_pathways', 'Complete 2 physiological pathways'), icon: '🛣️', rp: 20, check: function() { return Object.keys(pathwaysCompleted).length >= 2; } },
          { id: 'mnemonics_viewed', name: t('stem.anatomy.memory_master', 'Memory Master'), desc: t('stem.anatomy.unlock_3_anatomical_mnemonics', 'Unlock 3 anatomical mnemonics'), icon: '🧠', rp: 15, check: function() { return Object.keys(mnemonicsViewed).length >= 3; } },
          { id: 'compare_structures', name: t('stem.anatomy.comparative_anatomist', 'Comparative Anatomist'), desc: t('stem.anatomy.compare_3_pairs_of_structures', 'Compare 3 pairs of structures'), icon: '⚖️', rp: 15, check: function() { return comparisons >= 3; } }
        ];

        var ANAT_VOCAB = {
          'Cranium': 'The skeleton of the head, protecting the brain and supporting facial structures.',
          'Hyoid': 'A U-shaped bone in the neck that supports the tongue and throat muscles.',
          'Aorta': 'The main and largest artery in the body, carrying oxygenated blood from the heart to the systemic circulation.',
          'Cerebellum': 'The part of the brain at the back of the skull, coordinating muscle activity and balance.',
          'Circle of Willis': 'A circulatory anastomosis that supplies blood to the brain and provides collateral circulation.',
          'Deltoid': 'A large triangular muscle covering the shoulder joint, responsible for arm abduction.',
          'Psoas Major': 'A long muscle in the loin region that flexes the hip joint and stabilizes the spine.',
          'Alveoli': 'Tiny air sacs in the lungs where rapid gaseous exchange of oxygen and carbon dioxide takes place.',
          'Nephron': 'The functional unit of the kidney, filtering blood and forming urine.',
          'Villi': 'Small, finger-like projections on the walls of the small intestine that increase surface area for absorption.'
        };
        var challengeIds = ANAT_CHALLENGES.map(function(challenge) { return challenge.id; });
        var completedChallenges = Array.isArray(d.completedChallenges) ? d.completedChallenges.filter(function(id, index, list) {
          return typeof id === 'string' && challengeIds.indexOf(id) !== -1 && list.indexOf(id) === index;
        }) : [];
        var researchPoints = safeNonNegativeNumber(d.researchPoints, 0, true);
        var totalRP = safeNonNegativeNumber(d.totalRP, 0, true);
        var vocabIds = Object.keys(ANAT_VOCAB);
        var vocabLookedUp = Array.isArray(d.vocabLookedUp) ? d.vocabLookedUp.filter(function(id, index, list) {
          return typeof id === 'string' && vocabIds.indexOf(id) !== -1 && list.indexOf(id) === index;
        }) : [];

        var checkAnatomyChallenges = function() {
          var completed = completedChallenges;
          var newlyCompleted = [];
          var pointsEarned = 0;

          for (var i = 0; i < ANAT_CHALLENGES.length; i++) {
            var ch = ANAT_CHALLENGES[i];
            if (completed.indexOf(ch.id) === -1) {
              if (ch.check()) {
                newlyCompleted.push(ch.id);
                pointsEarned += ch.rp;
              }
            }
          }

          if (newlyCompleted.length > 0) {
            var updatedCompleted = completed.concat(newlyCompleted);
            var newRP = researchPoints + pointsEarned;
            var newTotal = totalRP + pointsEarned;
            updMulti({
              completedChallenges: updatedCompleted,
              researchPoints: newRP,
              totalRP: newTotal
            });
            playSound('badge');
            if (typeof addToast === 'function') {
              for (var j = 0; j < newlyCompleted.length; j++) {
                var finishedId = newlyCompleted[j];
                // findById is null-safe (window.StemLab.findById); falls back to
                // a placeholder so a renamed/missing challenge id can't crash the toast.
                var anatCh = window.StemLab && window.StemLab.findById ? window.StemLab.findById(ANAT_CHALLENGES, finishedId) : null;
                var name = anatCh ? anatCh.name : 'a challenge';
                addToast({
                  type: 'success',
                  title: t('stem.anatomy.challenge_complete', 'Challenge Complete!'),
                  message: 'Unlocked: ' + name + ' (+' + (anatCh ? anatCh.rp : 0) + ' RP)'
                });
              }
            }
            if (typeof announceToSR === 'function') {
              announceToSR('Challenges updated. You have completed ' + updatedCompleted.length + ' of ' + ANAT_CHALLENGES.length + ' challenges. Research points: ' + newRP);
            }
          }
        };

        // ══════════════════════════════════════
        // DATA — ALL 10 BODY SYSTEMS
        // ══════════════════════════════════════

        var SYSTEMS = {

          skeletal: {
            name: t('stem.anatomy.skeletal', 'Skeletal'), icon: '\uD83E\uDDB4', color: '#fef3c7', accent: '#b45309',
            desc: t('stem.anatomy.206_bones_support_protection_movement_', '206 bones \u2014 support, protection, movement, mineral storage, hematopoiesis.'),
            structures: [
              { id: 'skull', name: t('stem.anatomy.skull_cranium', 'Skull (Cranium)'), x: 0.50, y: 0.06, v: 'b', fn: 'Protects the brain. 22 bones form the cranial vault (frontal, parietal\u00D72, temporal\u00D72, occipital, sphenoid, ethmoid) and facial skeleton (14 bones).', clinical: 'Fractures may cause epidural or subdural hematoma. Open fontanelles in infants allow brain growth and molding during birth.', clinicalKid: 'Your skull is a strong helmet of bone that wraps around your brain and keeps it safe. It is made of many bones that grow together as you get bigger. Wearing a helmet when you bike or skate helps protect your skull, and a doctor can check it to make sure it is healthy.', detail: t('stem.anatomy.houses_meninges_brain_and_cranial_nerv', 'Houses meninges, brain, and cranial nerve foramina. Fontanelles close during infancy and early childhood; major cranial sutures normally remain into adulthood and fuse much later, if at all.') },
              { id: 'mandible', name: t('stem.anatomy.mandible', 'Mandible'), x: 0.50, y: 0.10, v: 'a', fn: 'Only moveable skull bone. Enables mastication, speech, and facial expression. Houses lower teeth.', clinical: 'TMJ dysfunction causes jaw pain and clicking. Mandibular fractures are the second most common facial fracture.' },
              { id: 'clavicle', name: t('stem.anatomy.clavicle', 'Clavicle'), x: 0.40, y: 0.155, v: 'a', fn: 'Horizontal strut connecting scapula to sternum. Transmits forces from upper limb to axial skeleton.', clinical: 'Most frequently fractured bone (fall on outstretched hand). Middle third fractures most common.' },
              { id: 'sternum', name: t('stem.anatomy.sternum', 'Sternum'), x: 0.50, y: 0.22, v: 'a', fn: 'Flat bone protecting heart and great vessels. Manubrium, body, and xiphoid process. Site for bone marrow biopsy in adults.', clinical: 'Sternal fractures from blunt chest trauma (steering wheel). CPR may cause xiphoid fractures.' },
              { id: 'ribs', name: t('stem.anatomy.ribs_1_12', 'Ribs (1-12)'), x: 0.58, y: 0.25, v: 'b', fn: '12 pairs: 7 true (1\u20137), 3 false (8\u201310), 2 floating (11\u201312). Protect thoracic organs and assist ventilation.', clinical: 'Flail chest: 3+ adjacent ribs fractured in 2+ places. Rib fractures 9\u201311 may lacerate spleen or liver.', clinicalKid: 'Your ribs are curved bones that make a strong cage around your chest to keep your heart and lungs safe. They also move a little to help you breathe in and out. Drinking milk, eating healthy food, and staying active help your bones grow strong.' },
              { id: 'scapula', name: t('stem.anatomy.scapula', 'Scapula'), x: 0.38, y: 0.22, v: 'p', fn: 'Triangular flat bone on posterior thorax. Attachment for 17 muscles. Acromion and coracoid processes are key landmarks.', clinical: 'Winged scapula from long thoracic nerve (C5\u2013C7) palsy \u2014 serratus anterior paralysis.' },
              { id: 'humerus', name: t('stem.anatomy.humerus', 'Humerus'), x: 0.26, y: 0.27, v: 'a', fn: 'Upper arm bone. Articulates with scapula (shoulder) and radius/ulna (elbow). Greater/lesser tubercles for rotator cuff.', clinical: 'Midshaft fracture \u2192 radial nerve palsy (wrist drop). Surgical neck fracture \u2192 axillary nerve injury.', clinicalKid: 'Your humerus is the long bone in your upper arm that connects your shoulder to your elbow. It helps you reach, throw, and lift things every day. Drinking milk, eating healthy food, and staying active help your bones grow strong, and a doctor can check them with an X-ray.' },
              { id: 'radius', name: t('stem.anatomy.radius', 'Radius'), x: 0.21, y: 0.36, v: 'a', fn: 'Lateral forearm bone. Pivots around ulna for pronation/supination. Radial head at elbow, styloid process at wrist.', clinical: 'Colles fracture: distal radius fracture from FOOSH (fall on outstretched hand). "Dinner fork" deformity.' },
              { id: 'ulna', name: t('stem.anatomy.ulna', 'Ulna'), x: 0.24, y: 0.36, v: 'a', fn: 'Medial forearm bone. Olecranon forms elbow point. Trochlear notch articulates with humerus for hinge motion.', clinical: 'Olecranon fractures from direct trauma. Monteggia fracture: proximal ulna + radial head dislocation.' },
              { id: 'carpals', name: t('stem.anatomy.carpals', 'Carpals'), x: 0.17, y: 0.44, v: 'a', fn: '8 small bones in 2 rows: scaphoid, lunate, triquetrum, pisiform (proximal); trapezium, trapezoid, capitate, hamate (distal).', clinical: 'Scaphoid fracture: anatomical snuffbox tenderness. Avascular necrosis risk due to retrograde blood supply.' },
              { id: 'vertebral', name: t('stem.anatomy.vertebral_column', 'Vertebral Column'), x: 0.50, y: 0.30, v: 'p', fn: '33 vertebrae: 7 cervical, 12 thoracic, 5 lumbar, 5 sacral (fused), 4 coccygeal (fused). Protects spinal cord. Four curves provide spring-like shock absorption.', clinical: 'Herniated disc (L4\u2013L5, L5\u2013S1 most common). Scoliosis, kyphosis, lordosis. Spinal stenosis.', clinicalKid: 'Your spine is a stack of small bones that holds you up straight and lets you bend and twist. Its gentle curves work like a spring so it can soak up bumps when you run and jump, and it keeps the bundle of nerves inside it safe. Sitting up tall, staying active, and lifting heavy things with care help keep it strong.' },
              { id: 'pelvis', name: t('stem.anatomy.pelvis', 'Pelvis'), x: 0.50, y: 0.42, v: 'b', fn: 'Ilium, ischium, pubis fused at acetabulum. Transfers weight from spine to lower limbs. Male pelvis narrower; female pelvis wider for childbirth.', clinical: 'Pelvic fractures \u2192 life-threatening hemorrhage from internal iliac vessels. Acetabular fractures require surgical fixation.', clinicalKid: 'Your pelvis is a strong bowl of bones at the bottom of your spine that holds your body up and connects to your legs. It helps you stand, walk, run, and sit down. Eating healthy foods and staying active help keep your bones strong.' },
              { id: 'femur', name: t('stem.anatomy.femur', 'Femur'), x: 0.42, y: 0.57, v: 'a', fn: 'Longest, strongest bone. Head fits into acetabulum. Neck angled 125\u00B0. Supports 2\u20133\u00D7 body weight during walking.', clinical: 'Hip fractures in elderly have 20\u201330% one-year mortality. Femoral neck fractures may disrupt blood supply \u2192 avascular necrosis.', clinicalKid: 'Your femur is the longest and strongest bone in your body, and it sits in your thigh between your hip and your knee. It is so strong that it can hold up your whole body when you walk, run, and jump. Drinking milk, eating healthy food, and playing outside help keep your bones strong.' },
              { id: 'patella', name: t('stem.anatomy.patella', 'Patella'), x: 0.43, y: 0.66, v: 'a', fn: 'Largest sesamoid bone. Embedded in quadriceps tendon. Increases mechanical advantage of quadriceps by 30%.', clinical: 'Patellar fracture from direct trauma or forceful quad contraction. Patellofemoral syndrome ("runner\'s knee").' },
              { id: 'tibia', name: t('stem.anatomy.tibia', 'Tibia'), x: 0.42, y: 0.76, v: 'a', fn: 'Main weight-bearing bone of the leg. Medial malleolus forms inner ankle. Tibial plateau articulates with femoral condyles.', clinical: 'Tibial plateau fractures from axial loading. Open fractures common (subcutaneous anterior surface). Compartment syndrome risk.' },
              { id: 'fibula', name: t('stem.anatomy.fibula', 'Fibula'), x: 0.46, y: 0.76, v: 'a', fn: 'Non-weight-bearing lateral leg bone. Lateral malleolus forms outer ankle. Attachment for interosseous membrane and lateral compartment muscles.', clinical: 'Lateral malleolus fractures in ankle sprains. Maisonneuve fracture: proximal fibula + medial ankle injury.' },
              { id: 'tarsals', name: t('stem.anatomy.tarsals', 'Tarsals'), x: 0.42, y: 0.89, v: 'a', fn: '7 bones: talus, calcaneus, navicular, cuboid, 3 cuneiforms. Form longitudinal and transverse foot arches for shock absorption.', clinical: 'Calcaneal fractures from axial loading (falls from height). Talus fractures risk avascular necrosis.' },
              { id: 'sacrum', name: t('stem.anatomy.sacrum_coccyx', 'Sacrum & Coccyx'), x: 0.50, y: 0.44, v: 'p', fn: 'Sacrum: 5 fused vertebrae forming posterior pelvis. Sacral canal contains cauda equina. Coccyx: vestigial tail bone.', clinical: 'Sacral fractures in high-energy trauma. Coccydynia (tailbone pain) from falls or prolonged sitting.' },
              { id: 'hyoid', name: t('stem.anatomy.hyoid_bone', 'Hyoid Bone'), x: 0.50, y: 0.12, v: 'a', fn: 'U-shaped bone at C3 level. Only bone not articulating with another bone \u2014 suspended by muscles and ligaments. Anchors tongue and aids swallowing and speech. Greater and lesser horns (cornua).', clinical: 'Hyoid fracture strongly associated with strangulation (forensic significance). Important in swallowing disorders (dysphagia evaluation). Attachment for suprahyoid and infrahyoid muscles.' },
              { id: 'atlas_axis', name: t('stem.anatomy.atlas_c1_axis_c2', 'Atlas (C1) & Axis (C2)'), x: 0.50, y: 0.08, v: 'p', fn: 'Atlas (C1): ring-shaped, no body or spinous process. Supports skull, allows nodding (yes). Axis (C2): has odontoid process (dens) that acts as pivot. Atlas rotates around dens for head rotation (no). Transverse ligament holds dens against atlas.', clinical: 'Jefferson fracture (C1 burst from axial loading). Hangman fracture (C2 pedicle bilateral fracture). Atlantoaxial subluxation in rheumatoid arthritis and Down syndrome. Odontoid fractures in elderly falls.' },
              { id: 'metatarsals', name: t('stem.anatomy.metatarsals_phalanges_foot', 'Metatarsals & Phalanges (Foot)'), x: 0.44, y: 0.94, v: 'a', fn: '5 metatarsals form forefoot, 14 phalanges (great toe has 2, others have 3). First metatarsal bears most weight during push-off. Metatarsal heads form "ball of foot." Sesamoid bones under 1st metatarsal head.', clinical: 'Jones fracture (5th metatarsal base): poor healing due to watershed blood supply. Stress fractures in runners (2nd/3rd metatarsal). Morton neuroma: interdigital nerve compression. Hallux valgus (bunion).' },
              { id: 'metacarpals', name: t('stem.anatomy.metacarpals_phalanges_hand', 'Metacarpals & Phalanges (Hand)'), x: 0.15, y: 0.48, v: 'a', fn: '5 metacarpals and 14 phalanges. Thumb (1st metacarpal) has saddle joint at CMC for opposition \u2014 unique to primates. Each finger has 3 phalanges (proximal, middle, distal) except thumb (2). Extensor mechanism on dorsum.', clinical: 'Boxer fracture (5th metacarpal neck). Bennett fracture (1st metacarpal base). Mallet finger (extensor tendon avulsion at DIP). Jersey finger (FDP avulsion). Dupuytren contracture: palmar fascia thickening.' },
              { id: 'scaphoid_bone', name: t('stem.anatomy.scaphoid_bone', 'Scaphoid Bone'), x: 0.18, y: 0.45, v: 'a', fn: 'Largest carpal bone in proximal row. Crosses both carpal rows, making it vulnerable to fracture. Blood supply enters distally (retrograde) \u2014 fractures may disrupt blood flow to proximal pole. Palpable in anatomical snuffbox.', clinical: 'Most commonly fractured carpal bone (FOOSH mechanism). Anatomical snuffbox tenderness is key exam finding. Risk of avascular necrosis of proximal pole (retrograde blood supply). Often missed on initial X-ray \u2014 requires repeat imaging or MRI.' }
            ]
          },

          muscular: {
            name: t('stem.anatomy.muscular', 'Muscular'), icon: '\uD83D\uDCAA', color: '#fce7f3', accent: '#be185d',
            desc: t('stem.anatomy.600_muscles_movement_posture_heat_prod', '600+ muscles \u2014 movement, posture, heat production, joint stabilization.'),
            structures: [
              { id: 'deltoid', name: t('stem.anatomy.deltoid', 'Deltoid'), x: 0.30, y: 0.18, v: 'a', fn: 'Primary shoulder abductor (middle fibers). Anterior fibers flex/medially rotate; posterior fibers extend/laterally rotate the arm.', origin: 'Lateral third of clavicle, acromion, scapular spine', insertion: 'Deltoid tuberosity of humerus', clinical: 'Atrophy from axillary nerve injury (C5\u2013C6). IM injection site (avoid in children < 3 yrs).', clinicalKid: 'Your deltoid is the rounded muscle that caps the top of your shoulder and helps you lift your arm up and out to the side. Playing, swimming, and reaching for things keep it strong. This is also a spot where doctors sometimes give you a shot.' },
              { id: 'pectoralis', name: t('stem.anatomy.pectoralis_major', 'Pectoralis Major'), x: 0.42, y: 0.22, v: 'a', fn: 'Powerful arm adductor, flexor, and medial rotator. Clavicular head flexes; sternocostal head adducts and extends from flexed position.', origin: 'Clavicle, sternum, ribs 1\u20136, external oblique aponeurosis', insertion: 'Lateral lip of bicipital groove (humerus)', clinical: 'Rupture during bench press \u2014 "dropped pec" sign. Poland syndrome: congenital absence.' },
              { id: 'biceps', name: t('stem.anatomy.biceps_brachii', 'Biceps Brachii'), x: 0.24, y: 0.29, v: 'a', fn: 'Powerful forearm supinator and elbow flexor. Long head stabilizes shoulder joint. Short head assists shoulder flexion.', origin: 'Short head: coracoid process; Long head: supraglenoid tubercle', insertion: 'Radial tuberosity and bicipital aponeurosis', clinical: 'Long head tendon rupture \u2192 "Popeye deformity." Biceps reflex tests C5\u2013C6 nerve roots.', clinicalKid: 'Your biceps is the muscle in the front of your upper arm that bends your elbow so you can lift and carry things, and it helps you turn your wrist too. Moving, climbing, and playing keep it strong. Eating good food and resting after hard play help it grow.' },
              { id: 'triceps', name: t('stem.anatomy.triceps_brachii', 'Triceps Brachii'), x: 0.73, y: 0.29, v: 'p', fn: 'Only elbow extensor. Three heads: long (crosses shoulder), lateral, and medial. Essential for pushing movements.', origin: 'Long: infraglenoid tubercle; Lateral/medial: posterior humerus', insertion: 'Olecranon process of ulna', clinical: 'Weakness in radial nerve palsy (C7 root). Triceps reflex tests C7\u2013C8 nerve roots.' },
              { id: 'rectus_ab', name: t('stem.anatomy.rectus_abdominis', 'Rectus Abdominis'), x: 0.50, y: 0.34, v: 'a', fn: 'Flexes trunk (sit-ups/crunches). Compresses abdominal contents. Assists forced expiration and stabilizes pelvis during walking.', origin: 'Pubic crest and symphysis', insertion: 'Xiphoid process, costal cartilages 5\u20137', clinical: 'Diastasis recti: midline separation (common in pregnancy). "Six-pack" \u2014 tendinous intersections create segmented appearance.' },
              { id: 'obliques', name: t('stem.anatomy.external_obliques', 'External Obliques'), x: 0.58, y: 0.34, v: 'a', fn: 'Trunk rotation (contralateral), lateral flexion, and abdominal compression. Largest and most superficial abdominal muscle.', origin: 'External surfaces of ribs 5\u201312', insertion: 'Linea alba, pubic tubercle, iliac crest', clinical: 'Strains from twisting sports. Inguinal ligament (lower border) is key landmark for hernia surgery.' },
              { id: 'quads', name: t('stem.anatomy.quadriceps_femoris', 'Quadriceps Femoris'), x: 0.42, y: 0.55, v: 'a', fn: 'Four muscles (rectus femoris, vastus lateralis/medialis/intermedius). Primary knee extensor. Rectus femoris also flexes hip.', origin: 'Rectus femoris: AIIS; Vasti: femoral shaft', insertion: 'Tibial tuberosity via patellar tendon', clinical: 'Quadriceps tendon/patellar tendon rupture. VMO weakness \u2192 patellofemoral tracking issues.', clinicalKid: 'Your quadriceps are four strong muscles on the front of your thigh that straighten your knee and help lift your leg. They power you when you run, jump, climb stairs, and stand up. Moving your body, stretching, and resting your legs keep them strong.' },
              { id: 'hamstrings', name: t('stem.anatomy.hamstrings', 'Hamstrings'), x: 0.58, y: 0.58, v: 'p', fn: 'Three muscles (biceps femoris, semitendinosus, semimembranosus). Flex knee and extend hip. Critical for deceleration in running.', origin: 'Ischial tuberosity (all three); biceps femoris short head: linea aspera', insertion: 'Biceps: fibular head; Semi-T: pes anserinus; Semi-M: posterior medial tibial condyle', clinical: '"Pulled hamstring" \u2014 most common muscle strain in athletes. Proximal avulsion in sprinters.', clinicalKid: 'Your hamstrings are the strong muscles on the back of your legs that help you bend your knees and run, jump, and slow down. Warming up before you play and stretching gently keep them loose and healthy. Drinking water and resting after exercise help them feel good too.' },
              { id: 'gastrocnemius', name: t('stem.anatomy.gastrocnemius', 'Gastrocnemius'), x: 0.58, y: 0.74, v: 'p', fn: 'Superficial calf muscle. Powerful plantar flexor (push-off in gait) and weak knee flexor. Two heads span the knee joint.', origin: 'Medial and lateral femoral condyles', insertion: 'Calcaneus via Achilles tendon', clinical: 'Achilles tendon rupture (positive Thompson test). "Tennis leg" \u2014 medial head tear.', clinicalKid: 'Your gastrocnemius is the big calf muscle on the back of your lower leg, and it helps you push off the ground when you walk, run, and jump. It also lets you stand up on your tiptoes. Moving around, stretching, and warming up before you play keep it strong and ready.' },
              { id: 'trapezius', name: t('stem.anatomy.trapezius', 'Trapezius'), x: 0.50, y: 0.20, v: 'p', fn: 'Large diamond-shaped muscle. Upper fibers elevate scapula (shrug); middle fibers retract; lower fibers depress and rotate scapula upward.', origin: 'External occipital protuberance, nuchal ligament, C7\u2013T12 spinous processes', insertion: 'Lateral third of clavicle, acromion, scapular spine', clinical: 'Spinal accessory nerve (CN XI) palsy \u2192 inability to shrug shoulder. Shoulder droop.' },
              { id: 'lats', name: t('stem.anatomy.latissimus_dorsi', 'Latissimus Dorsi'), x: 0.62, y: 0.32, v: 'p', fn: 'Broadest back muscle. Powerful arm extensor, adductor, and medial rotator. Key muscle in swimming, climbing, and pull-ups.', origin: 'T6\u2013T12 spinous processes, thoracolumbar fascia, iliac crest, ribs 9\u201312', insertion: 'Floor of bicipital (intertubercular) groove', clinical: 'Used in reconstructive surgery (myocutaneous flaps). Thoracodorsal nerve (C6\u2013C8) innervation.' },
              { id: 'glutes', name: t('stem.anatomy.gluteus_maximus', 'Gluteus Maximus'), x: 0.50, y: 0.44, v: 'p', fn: 'Largest muscle in the body. Powerful hip extensor and lateral rotator. Essential for standing from seated position, climbing stairs, running.', origin: 'Posterior ilium, sacrum, coccyx, sacrotuberous ligament', insertion: 'IT band and gluteal tuberosity of femur', clinical: 'Weakness \u2192 Trendelenburg gait (compensatory trunk lean). Inferior gluteal nerve (L5\u2013S2).' },
              { id: 'sartorius', name: t('stem.anatomy.sartorius', 'Sartorius'), x: 0.38, y: 0.52, v: 'a', fn: 'Longest muscle in the body. Crosses hip and knee. Produces the "tailor\'s position" (cross-legged sitting): hip flexion, abduction, lateral rotation + knee flexion.', origin: 'Anterior superior iliac spine (ASIS)', insertion: 'Pes anserinus (medial proximal tibia)', clinical: 'Pes anserinus bursitis causes medial knee pain. Landmark for femoral triangle.' },
              { id: 'tibialis', name: t('stem.anatomy.tibialis_anterior', 'Tibialis Anterior'), x: 0.40, y: 0.76, v: 'a', fn: 'Primary ankle dorsiflexor and foot inverter. Prevents foot slap during heel strike. Supports medial longitudinal arch.', origin: 'Lateral tibial condyle, upper 2/3 of lateral tibial surface', insertion: 'Medial cuneiform, base of 1st metatarsal', clinical: 'Foot drop from deep peroneal nerve injury. Shin splints (medial tibial stress syndrome).' },
              { id: 'soleus', name: t('stem.anatomy.soleus', 'Soleus'), x: 0.58, y: 0.78, v: 'p', fn: 'Deep calf muscle beneath gastrocnemius. Plantar flexion (postural muscle \u2014 prevents forward falling while standing). Does not cross knee.', origin: 'Soleal line and posterior proximal fibula', insertion: 'Calcaneus via Achilles tendon', clinical: 'Soleus muscle pump aids venous return. DVT risk when immobile (long flights). Soleus strain in runners.' },
              { id: 'rotator_cuff', name: t('stem.anatomy.rotator_cuff_sits', 'Rotator Cuff (SITS)'), x: 0.34, y: 0.20, v: 'p', fn: 'Four muscles: Supraspinatus (initiates abduction, most commonly torn), Infraspinatus (lateral rotation), Teres minor (lateral rotation), Subscapularis (medial rotation). Stabilize glenohumeral joint and keep humeral head in glenoid fossa.', origin: 'Scapula (various fossae)', insertion: 'Greater and lesser tubercles of humerus', clinical: 'Rotator cuff tears: most common shoulder pathology (especially supraspinatus). Impingement syndrome: supraspinatus compressed under acromion during abduction. Positive empty can test, drop arm test.' },
              { id: 'iliopsoas', name: t('stem.anatomy.iliopsoas', 'Iliopsoas'), x: 0.44, y: 0.44, v: 'a', fn: 'Compound muscle: iliacus + psoas major. Most powerful hip flexor. Psoas major originates from T12\u2013L5 vertebral bodies (only muscle connecting spine to lower limb). Critical for walking, running, and maintaining upright posture.', origin: 'Psoas: T12\u2013L5 vertebrae. Iliacus: iliac fossa', insertion: 'Lesser trochanter of femur', clinical: 'Psoas abscess from spinal TB or Crohn disease. Psoas sign: pain on hip extension (suggests appendicitis/abscess). Hip flexion contracture in elderly/wheelchair-bound. Thomas test for hip flexion contracture.' },
              { id: 'intercostals', name: t('stem.anatomy.intercostal_muscles', 'Intercostal Muscles'), x: 0.56, y: 0.24, v: 'a', fn: 'Three layers between ribs. External intercostals: elevate ribs for inspiration. Internal intercostals: depress ribs for forced expiration. Innermost intercostals: similar to internal. Intercostal neurovascular bundle runs in costal groove (vein, artery, nerve \u2014 VAN, superior to inferior).', origin: 'Inferior border of rib above', insertion: 'Superior border of rib below', clinical: 'Intercostal nerve block for rib fracture pain. Chest tube insertion above rib to avoid neurovascular bundle. Intercostal neuralgia: chronic chest wall pain. Herpes zoster (shingles) follows intercostal dermatome.' },
              { id: 'pelvic_floor', name: t('stem.anatomy.pelvic_floor_levator_ani', 'Pelvic Floor (Levator Ani)'), x: 0.50, y: 0.46, v: 'p', fn: 'Muscular "hammock" supporting pelvic organs: pubococcygeus, puborectalis, iliococcygeus. Supports bladder, uterus/prostate, rectum. Puborectalis maintains fecal continence (anorectal angle). Contracts during Kegel exercises.', origin: 'Pubis, obturator fascia (arcus tendineus), ischial spine', insertion: 'Coccyx, anococcygeal raphe, perineal body', clinical: 'Pelvic floor weakness: urinary incontinence, pelvic organ prolapse (cystocele, rectocele, uterine prolapse). Common after vaginal delivery. Kegel exercises for strengthening. Pelvic floor dysfunction: chronic pelvic pain, dyspareunia.' },
              { id: 'diaphragm_m', name: t('stem.anatomy.diaphragm_muscle', 'Diaphragm (Muscle)'), x: 0.50, y: 0.27, v: 'b', fn: 'Primary muscle of respiration (responsible for 70% of quiet breathing). Dome-shaped musculotendinous partition between thorax and abdomen. Central tendon + peripheral muscle fibers from xiphoid, ribs 7\u201312, L1\u2013L3 vertebrae (crura). Right crus larger, encircles esophagus.', origin: 'Xiphoid process, costal cartilages 7\u201312, L1\u2013L3 crura', insertion: 'Central tendon', clinical: 'Hiccups: involuntary diaphragm spasm. Phrenic nerve (C3\u2013C5): "C3, 4, 5 keeps the diaphragm alive." Diaphragmatic hernia: abdominal contents in thorax. Congenital diaphragmatic hernia (Bochdalek): left-sided, neonatal respiratory distress.' }
            ]
          },

          circulatory: {
            name: t('stem.anatomy.circulatory', 'Circulatory'), icon: '\u2764\uFE0F', color: '#fee2e2', accent: '#dc2626',
            desc: t('stem.anatomy.heart_60_000_miles_of_vessels_5l_of_bl', 'Heart, 60,000 miles of vessels, 5L of blood \u2014 delivers O\u2082, nutrients, hormones; removes waste.'),
            structures: [
              { id: 'heart', name: t('stem.anatomy.heart', 'Heart'), x: 0.48, y: 0.24, v: 'a', fn: 'Muscular pump. 4 chambers: RA/RV (pulmonary circuit), LA/LV (systemic circuit). Beats ~100,000\u00D7/day, pumps ~5L/min at rest.', clinical: 'MI (heart attack): coronary artery occlusion. Heart failure, arrhythmias, valvular disease. Leading cause of death worldwide.', clinicalKid: 'Your heart is a strong muscle about the size of your fist that pumps blood all day and night. Running, playing, and eating fruits and vegetables keep it strong. A doctor can listen to it beat with a stethoscope.' },
              { id: 'aorta', name: t('stem.anatomy.aorta', 'Aorta'), x: 0.52, y: 0.22, v: 'a', fn: 'Largest artery. Ascending aorta \u2192 aortic arch (brachiocephalic, left common carotid, left subclavian) \u2192 descending thoracic \u2192 abdominal aorta.', clinical: 'Aortic aneurysm (abdominal > 5.5cm \u2192 surgical repair). Aortic dissection: tearing chest pain, emergency.', clinicalKid: 'Your aorta is the biggest blood tube in your body, and it carries fresh blood away from your heart to the rest of you. It starts at the heart, makes a big curve at the top, and then heads down to send blood to your belly and legs. Running, playing, and eating fruits and vegetables help keep it strong and healthy.' },
              { id: 'sup_vena', name: t('stem.anatomy.superior_vena_cava', 'Superior Vena Cava'), x: 0.54, y: 0.20, v: 'a', fn: 'Returns deoxygenated blood from head, neck, upper limbs, and thorax to the right atrium. Formed by union of brachiocephalic veins.', clinical: 'SVC syndrome: obstruction (often by lung cancer/lymphoma) causes facial swelling, dyspnea, distended neck veins.' },
              { id: 'inf_vena', name: t('stem.anatomy.inferior_vena_cava', 'Inferior Vena Cava'), x: 0.52, y: 0.36, v: 'a', fn: 'Largest vein. Returns blood from lower body to right atrium. Formed at L5 by union of common iliac veins. Passes through diaphragm at T8.', clinical: 'IVC filter placement for recurrent PE. IVC compression during pregnancy (supine hypotension syndrome).' },
              { id: 'pulm_art', name: t('stem.anatomy.pulmonary_arteries', 'Pulmonary Arteries'), x: 0.46, y: 0.22, v: 'a', fn: 'Carry deoxygenated blood from the right ventricle to the lungs. They are the adult circulation exception to the usual oxygen-rich artery pattern; fetal umbilical arteries also carry relatively deoxygenated blood. The pulmonary trunk divides into right and left pulmonary arteries.', clinical: 'Pulmonary embolism (PE): a clot, often from a DVT, lodges in the pulmonary arteries. A large saddle PE can be life-threatening.' },
              { id: 'carotid', name: t('stem.anatomy.carotid_arteries', 'Carotid Arteries'), x: 0.44, y: 0.12, v: 'a', fn: 'Common carotid bifurcates at C4 into internal (brain) and external (face/scalp). Internal carotid supplies anterior 2/3 of brain.', clinical: 'Carotid stenosis causes stroke/TIA. Carotid endarterectomy for >70% stenosis. Carotid body senses O\u2082/CO\u2082/pH.', clinicalKid: 'Your carotid arteries are two big tubes in your neck that carry fresh blood up to your brain and your face. You can feel them gently beating on the sides of your neck, and a doctor can check that beat too. Moving your body, drinking water, and eating fruits and vegetables help keep your blood flowing strong.' },
              { id: 'jugular', name: t('stem.anatomy.jugular_veins', 'Jugular Veins'), x: 0.56, y: 0.12, v: 'a', fn: 'Internal jugular drains brain and face (runs with carotid in carotid sheath). External jugular visible on neck surface.', clinical: 'JVD (jugular venous distension) \u2192 sign of right heart failure, cardiac tamponade, tension pneumothorax.' },
              { id: 'coronary', name: t('stem.anatomy.coronary_arteries', 'Coronary Arteries'), x: 0.46, y: 0.25, v: 'a', fn: 'LAD (left anterior descending) supplies anterior LV wall and septum ("widow maker"). LCx supplies lateral LV. RCA supplies RV and inferior LV.', clinical: 'LAD occlusion: anterior STEMI (most dangerous). RCA occlusion: inferior MI with possible heart block.' },
              { id: 'femoral_a', name: t('stem.anatomy.femoral_artery', 'Femoral Artery'), x: 0.44, y: 0.48, v: 'a', fn: 'Main blood supply to lower limb. Palpable at mid-inguinal point (midway ASIS to pubic symphysis). Becomes popliteal artery behind knee.', clinical: 'Femoral artery catheterization for angiography. Femoral artery laceration \u2192 rapid exsanguination.' },
              { id: 'brachial', name: t('stem.anatomy.brachial_artery', 'Brachial Artery'), x: 0.28, y: 0.30, v: 'a', fn: 'Continuation of axillary artery. Runs medially in arm. Blood pressure measured here (antecubital fossa). Bifurcates into radial and ulnar arteries.', clinical: 'BP cuff occludes brachial artery (Korotkoff sounds). Supracondylar fracture may damage brachial artery \u2192 Volkmann contracture.' },
              { id: 'portal', name: t('stem.anatomy.hepatic_portal_vein', 'Hepatic Portal Vein'), x: 0.52, y: 0.32, v: 'a', fn: 'Carries nutrient-rich blood from the GI tract and spleen to the liver for processing. Usually formed by the superior mesenteric and splenic veins.', clinical: 'Portal hypertension can cause esophageal or gastric varices, abdominal-wall collaterals, rectal varices, ascites, and splenomegaly. Rectal varices are distinct from hemorrhoids.' },
              { id: 'circle_willis', name: t('stem.anatomy.circle_of_willis', 'Circle of Willis'), x: 0.50, y: 0.08, v: 'a', fn: 'Arterial anastomotic ring at base of brain. Formed by: anterior communicating artery connecting ACA\u2013ACA, posterior communicating arteries connecting ICA\u2013PCA, plus segments of ACA, ICA, and PCA. Provides collateral blood flow if one vessel is occluded. Complete circle in only ~25% of people.', clinical: 'Berry (saccular) aneurysms: most common at anterior communicating artery junction. Rupture \u2192 subarachnoid hemorrhage ("thunderclap headache"). Congenital variants may limit collateral flow \u2192 increased stroke risk.' },
              { id: 'saphenous', name: t('stem.anatomy.great_saphenous_vein', 'Great Saphenous Vein'), x: 0.40, y: 0.70, v: 'a', fn: 'Longest vein in body. Runs from dorsum of foot, anterior to medial malleolus, up medial leg and thigh, drains into femoral vein at saphenous opening (saphenofemoral junction). Superficial position makes it accessible for cannulation and grafting.', clinical: 'Varicose veins from incompetent valves (superficial venous insufficiency). Used as conduit for CABG (coronary artery bypass graft surgery). Saphenous nerve runs alongside \u2014 may be injured during vein stripping. DVT risk in varicosities.' },
              { id: 'lymph_circ', name: t('stem.anatomy.lymphatic_vessels', 'Lymphatic Vessels'), x: 0.36, y: 0.50, v: 'a', fn: 'One-way drainage system parallel to venous system. Begins as blind-ended lymph capillaries in tissues, drains through lymph nodes, collecting vessels, trunks, and ducts. Right lymphatic duct drains right upper body; thoracic duct drains everything else. Lymph propelled by skeletal muscle contraction and one-way valves.', clinical: 'Lymphedema: impaired drainage \u2192 chronic swelling (post-surgical, filariasis in tropics). Lymphangitis: red streaking from infected lymph vessel. Sentinel lymph node biopsy for cancer staging. Chylothorax from thoracic duct injury.' }
            ]
          },

          nervous: {
            name: t('stem.anatomy.nervous', 'Nervous'), icon: '\u26A1', color: '#ede9fe', accent: '#7c3aed',
            desc: t('stem.anatomy.cns_brain_spinal_cord_and_pns_31_spina', 'CNS (brain + spinal cord) and PNS (31 spinal nerve pairs, 12 cranial nerve pairs, autonomic NS).'),
            structures: [
              { id: 'brain', name: t('stem.anatomy.brain', 'Brain'), x: 0.50, y: 0.05, v: 'b', fn: '~86 billion neurons. Cerebrum (cognition, sensation, motor), cerebellum (coordination), brainstem (vital functions). Weighs ~1.4 kg, uses 20% of O\u2082. Protected by meninges (dura, arachnoid, pia mater) and cerebrospinal fluid (CSF). Four lobes per hemisphere: frontal, parietal, temporal, occipital.', clinical: 'Stroke (ischemic/hemorrhagic), TBI, neurodegenerative diseases (Alzheimer, Parkinson), brain tumors, epilepsy. EEG measures brain waves for diagnosis of seizures, sleep disorders, and brain death.', clinicalKid: 'Your brain is the control center for your whole body, helping you think, move, learn, and feel. Sleep, healthy food, and learning new things help it grow strong, and wearing a helmet keeps it safe.',
                brainWaves: [
                  { type: 'Delta (\u03b4)', freq: '0.5\u20134 Hz', amplitude: 'Highest', state: 'Deep dreamless sleep (N3)', color: '#6366f1', emoji: '\uD83D\uDE34', characteristics: 'Dominant in deep NREM sleep (stage N3). Associated with growth hormone release, tissue repair, and immune system strengthening. Excessive delta in waking = brain injury or encephalopathy.', clinical: 'Abnormal waking delta waves indicate brain lesions, metabolic encephalopathy, or diffuse cortical damage. Used to assess depth of anesthesia and coma.' },
                  { type: 'Theta (\u03b8)', freq: '4\u20138 Hz', amplitude: 'Medium\u2013High', state: 'Drowsiness, light sleep, meditation', color: '#8b5cf6', emoji: '\uD83E\uDDD8', characteristics: 'Prominent in light sleep (N1), deep meditation, and creative insight. Hippocampal theta rhythms are critical for memory encoding and spatial navigation.', clinical: 'Excessive theta in waking = ADHD, cognitive impairment, or drowsiness. Theta bursts during memory tasks reflect hippocampal-cortical dialogue for memory consolidation.' },
                  { type: 'Alpha (\u03b1)', freq: '8\u201313 Hz', amplitude: 'Medium', state: 'Relaxed wakefulness, eyes closed', color: '#06b6d4', emoji: '\uD83C\uDF3F', characteristics: 'First brain wave discovered (Hans Berger, 1929). Dominant when relaxed with eyes closed. Blocked by eye opening or mental effort ("alpha blocking"). Generated primarily in the occipital cortex.', clinical: 'Reduced alpha = anxiety, insomnia. Asymmetric alpha = cortical lesion or stroke. Neurofeedback alpha training is studied for anxiety and ADHD, but blinded-trial evidence is mixed and contested, and "peak performance" uses are largely unproven.' },
                  { type: 'Beta (\u03b2)', freq: '13\u201330 Hz', amplitude: 'Low', state: 'Active thinking, focus, alertness', color: '#f59e0b', emoji: '\u26A1', characteristics: 'Dominant during active cognition, problem-solving, conversation, and decision-making. Sub-bands: low beta (13\u201315 Hz, relaxed focus), mid beta (15\u201320 Hz, active thinking), high beta (20\u201330 Hz, anxiety/excitement).', clinical: 'Excessive high beta = anxiety, stress, insomnia. Medications like benzodiazepines increase beta. Beta activity used in BCI (brain-computer interfaces) for motor imagery.' },
                  { type: 'Gamma (\u03b3)', freq: '30\u2013100+ Hz', amplitude: 'Lowest', state: 'Higher cognition, binding, consciousness', color: '#ef4444', emoji: '\uD83E\uDDE0', characteristics: 'Associated with sensory binding (combining sight, sound, touch into unified percepts), peak concentration, expanded consciousness, and compassion meditation. Highest frequency, lowest amplitude. Generated by fast-spiking interneurons.', clinical: 'Reduced gamma = schizophrenia, Alzheimer disease. Gamma entrainment via 40 Hz light/sound stimulation is being researched for Alzheimer treatment. Experienced meditators show elevated gamma.' }
                ],
                sleepStages: [
                  { stage: 'N1 (NREM Stage 1)', pct: '2\u20135%', duration: '1\u20137 min', waves: 'Theta (4\u20138 Hz)', emoji: '\uD83D\uDE0C', desc: t('stem.anatomy.lightest_sleep_transition_from_wakeful', 'Lightest sleep \u2014 transition from wakefulness. Slow rolling eye movements, muscle tone decreasing. Hypnic jerks (myoclonic twitches) common. Easily aroused. Vertex sharp waves appear on EEG.'), clinical: 'Excessive N1 = sleep fragmentation (sleep apnea, restless legs). Hypnic hallucinations may occur. Sleep onset latency measured here for narcolepsy diagnosis (MSLT test).' },
                  { stage: 'N2 (NREM Stage 2)', pct: '45\u201355%', duration: '10\u201325 min', waves: 'Theta + Sleep spindles (12\u201314 Hz) + K-complexes', emoji: '\uD83D\uDCA4', desc: t('stem.anatomy.true_sleep_begins_core_body_temperatur', 'True sleep begins. Core body temperature drops, heart rate slows. Sleep spindles (thalamocortical bursts) protect sleep and consolidate motor memory. K-complexes are large waveforms responding to external stimuli.'), clinical: 'Sleep spindles correlate with IQ and learning ability. Reduced spindles in schizophrenia and aging. K-complexes are the brain\'s "sentry" \u2014 evaluating stimuli without waking.' },
                  { stage: 'N3 (NREM Stage 3)', pct: '15\u201325%', duration: '20\u201340 min', waves: 'Delta (0.5\u20132 Hz), >20% of epoch', emoji: '\uD83C\uDF19', desc: t('stem.anatomy.deep_slow_wave_sleep_sws_most_restorat', 'Deep/slow-wave sleep (SWS). Most restorative stage. Growth hormone secretion peaks. Glymphatic system clears brain waste (amyloid-\u03b2). Declarative memory consolidation occurs. Hardest to awaken from; sleep inertia if aroused.'), clinical: 'Reduced N3 in aging, Alzheimer (amyloid accumulation). Sleepwalking, night terrors, and bedwetting occur during N3 arousal. Critical for immune function \u2014 sleep deprivation impairs T-cell function.' },
                  { stage: 'REM (Rapid Eye Movement)', pct: '20\u201325%', duration: '10\u201360 min (increases across night)', waves: 'Beta/Gamma (desynchronized, "paradoxical" \u2014 looks like waking EEG)', emoji: '\uD83C\uDF1F', desc: t('stem.anatomy.dreaming_stage_brain_is_highly_active_', 'Dreaming stage. Brain is highly active (similar to waking) but body is paralyzed (atonia via brainstem inhibition of motor neurons). Rapid conjugate eye movements. Emotional memory processing and creative problem-solving. Cycles lengthen through the night.'), clinical: 'REM behavior disorder (RBD): loss of atonia \u2192 acting out dreams \u2014 strong predictor of Parkinson/Lewy body dementia. Narcolepsy: premature REM onset (SOREMPs). Nightmares occur in REM. SSRIs suppress REM sleep.' }
                ]
              },
              { id: 'cerebral_cortex', name: t('stem.anatomy.cerebral_cortex_4_lobes', 'Cerebral Cortex (4 Lobes)'), x: 0.50, y: 0.04, v: 'a', fn: 'Thin (2\u20134mm) outer layer of gray matter with ~16 billion neurons. 6 layers of cortical columns. Divided into 4 lobes: Frontal (executive function, motor, Broca area), Parietal (somatosensory, spatial), Temporal (auditory, Wernicke area, memory), Occipital (vision). Comprises 80% of brain mass.', clinical: 'Frontal lobe damage: personality change (Phineas Gage case), impaired judgment. Parietal lesions: hemispatial neglect. Temporal lobe epilepsy: most common focal seizure type. Occipital stroke: cortical blindness.', clinicalKid: 'Your cerebral cortex is the wrinkly outer layer of your brain, and it is the part that helps you think, move, see, hear, and remember. It has four areas called lobes, and each one has its own job, like seeing in the back and planning in the front. Sleep, healthy food, learning new things, and wearing a helmet keep it strong and safe.', detail: t('stem.anatomy.brodmann_areas_map_52_cytoarchitectura', 'Brodmann areas map 52 cytoarchitectural regions. Primary motor cortex (area 4), primary somatosensory (areas 3,1,2), primary visual (area 17), primary auditory (areas 41,42). Prefrontal cortex is last to myelinate (age ~25).') },
              { id: 'cerebellum', name: t('stem.anatomy.cerebellum', 'Cerebellum'), x: 0.52, y: 0.07, v: 'p', fn: '10% of brain volume but contains ~80% of all neurons (~69 billion). "Little brain" at posterior fossa. Three functional divisions: vestibulocerebellum (balance), spinocerebellum (limb coordination), cerebrocerebellum (motor planning, cognition). Compares intended vs actual movement for error correction.', clinical: 'Cerebellar lesions: ataxia (uncoordinated gait), intention tremor, dysarthria (scanning speech), nystagmus, past-pointing. Cerebellar stroke: acute vertigo and ataxia may be misdiagnosed as inner ear problems. Fetal alcohol syndrome damages cerebellum.', clinicalKid: 'Your cerebellum is a small part at the back of your brain that helps you balance and move smoothly. It helps you walk, run, ride a bike, and catch a ball without falling over. Playing, practicing new moves, and getting good sleep help it work well.', detail: t('stem.anatomy.purkinje_cells_are_among_the_largest_n', 'Purkinje cells are among the largest neurons, each receiving ~200,000 synaptic inputs. Cerebellar cortex has 3 layers: molecular, Purkinje, granular. Emerging research shows roles in cognition, emotion, and language.') },
              { id: 'brainstem', name: t('stem.anatomy.brainstem_midbrain_pons_medulla', 'Brainstem (Midbrain, Pons, Medulla)'), x: 0.50, y: 0.08, v: 'p', fn: 'Connects cerebrum to spinal cord. Three parts: Midbrain (visual/auditory reflexes, substantia nigra for dopamine), Pons (relay between cortex and cerebellum, respiratory rhythm), Medulla oblongata (cardiovascular center, respiratory center, vomiting, swallowing). Reticular formation spans all three \u2014 controls arousal and consciousness.', clinical: 'Brainstem death = legal death in many jurisdictions (irreversible loss of consciousness and vital reflexes). Locked-in syndrome (ventral pons lesion): conscious but unable to move except eyes. Central sleep apnea from medullary dysfunction.', clinicalKid: 'Your brainstem sits at the bottom of your brain, where it connects to your spinal cord. It quietly takes care of jobs you do not have to think about, like breathing, your heartbeat, and swallowing. Good sleep, healthy food, and wearing a helmet help keep it safe and working well.', detail: t('stem.anatomy.contains_nuclei_for_cranial_nerves_iii', 'Contains nuclei for cranial nerves III\u2013XII. Reticular activating system (RAS) is the brain\'s "on switch" \u2014 damage causes coma. Decussation of pyramids in medulla: motor crossover explains contralateral motor control.') },
              { id: 'hippocampus', name: t('stem.anatomy.hippocampus', 'Hippocampus'), x: 0.48, y: 0.06, v: 'a', fn: 'Seahorse-shaped structure in medial temporal lobe. Critical for converting short-term memory to long-term memory (consolidation). Contains place cells for spatial navigation (Nobel Prize 2014, O\'Keefe). One of two brain regions with adult neurogenesis (new neuron formation). Theta rhythms during memory encoding.', clinical: 'Alzheimer disease begins here \u2014 hippocampal atrophy on MRI is an early diagnostic marker. Bilateral hippocampal damage (e.g., Patient H.M.) causes severe anterograde amnesia. Chronic stress and cortisol shrink the hippocampus. PTSD associated with reduced hippocampal volume.', detail: t('stem.anatomy.memory_replay_during_sleep_hippocampal', 'Memory replay during sleep: hippocampal neurons "replay" daytime experiences during N3 sleep, transferring memories to neocortex. Grid cells in entorhinal cortex provide spatial coordinates to hippocampal place cells.') },
              { id: 'amygdala', name: t('stem.anatomy.amygdala', 'Amygdala'), x: 0.46, y: 0.06, v: 'a', fn: 'Almond-shaped nuclei in anterior temporal lobe. Key hub for processing fear, threat detection, and emotional memory. Receives fast "low road" input from thalamus for rapid danger response (before conscious awareness). Modulates memory storage based on emotional arousal (why emotional events are remembered better).', clinical: 'Hyperactive amygdala in anxiety disorders, PTSD, and phobias. Bilateral amygdala damage (Urbach-Wiethe disease): inability to recognize fear in faces, impaired fear conditioning. Amygdala involved in autism spectrum disorder (social threat processing).', detail: t('stem.anatomy.fear_conditioning_pathway_auditory_cor', 'Fear conditioning pathway: auditory cortex \u2192 lateral amygdala \u2192 central amygdala \u2192 hypothalamus (stress response) + PAG (freezing). Amygdala-prefrontal interactions allow emotional regulation \u2014 basis of CBT therapy.') },
              { id: 'thalamus', name: t('stem.anatomy.thalamus', 'Thalamus'), x: 0.50, y: 0.06, v: 'b', fn: 'Paired egg-shaped structures forming 80% of diencephalon. "Gateway to consciousness" \u2014 relays and filters ALL sensory information to cortex (except olfaction). Contains ~60 nuclei organized into functional groups. Generates sleep spindles during N2 sleep. Thalamocortical oscillations underlie consciousness itself.', clinical: 'Thalamic stroke: contralateral sensory loss + thalamic pain syndrome (Dejerine-Roussy: severe, burning pain). Fatal familial insomnia: prion disease destroying thalamus \u2192 complete inability to sleep \u2192 death. Deep brain stimulation of thalamus for essential tremor.', detail: t('stem.anatomy.key_nuclei_vpl_vpm_somatosensory_relay', 'Key nuclei: VPL/VPM (somatosensory relay), LGN (visual relay to V1), MGN (auditory relay to A1), pulvinar (attention), anterior nuclear group (memory, Papez circuit).') },
              { id: 'hypothalamus', name: t('stem.anatomy.hypothalamus', 'Hypothalamus'), x: 0.50, y: 0.07, v: 'a', fn: 'Small (4g, ~1% of brain) but controls: body temperature, hunger/thirst, circadian rhythm (SCN = master clock), autonomic nervous system, pituitary gland (via hypothalamic-hypophyseal portal system). Suprachiasmatic nucleus (SCN) receives light input from retina and entrains 24-hr circadian cycle.', clinical: 'Hypothalamic dysfunction: diabetes insipidus (no ADH), obesity (ventromedial lesion = hyperphagia), anorexia (lateral lesion = aphagia). Circadian disruption linked to depression, metabolic syndrome, cancer. Jet lag = SCN resynchronizing.', detail: t('stem.anatomy.thermostat_analogy_anterior_hypothalam', 'Thermostat analogy: anterior hypothalamus triggers cooling (vasodilation, sweating); posterior hypothalamus triggers warming (shivering, vasoconstriction). Fever = elevated set point by prostaglandins from infection.') },
              { id: 'corpus_callosum', name: t('stem.anatomy.corpus_callosum', 'Corpus Callosum'), x: 0.50, y: 0.05, v: 'b', fn: 'Largest white matter structure in brain. ~200 million axons connecting left and right hemispheres. Enables interhemispheric communication and integration. Develops throughout childhood; fully myelinated by age ~12. Four regions: rostrum, genu, body, splenium.', clinical: 'Split-brain patients (callosotomy for epilepsy): each hemisphere operates independently \u2014 left hand "doesn\'t know" what right hand is doing (Roger Sperry, Nobel 1981). Agenesis of corpus callosum: congenital absence, often incidental finding. Callosal lesions in MS.', detail: t('stem.anatomy.split_brain_experiments_revealed_hemis', 'Split-brain experiments revealed hemispheric specialization: left hemisphere = language, logic; right hemisphere = spatial, holistic processing. Information presented to one visual field is processed by contralateral hemisphere.') },
              { id: 'basal_ganglia', name: t('stem.anatomy.basal_ganglia', 'Basal Ganglia'), x: 0.48, y: 0.05, v: 'a', fn: 'Deep gray matter nuclei: caudate, putamen (together = striatum), globus pallidus. With substantia nigra and subthalamic nucleus, form circuits for motor initiation/inhibition, habit formation, reward learning, and procedural memory. Direct pathway facilitates movement; indirect pathway inhibits movement.', clinical: 'Parkinson disease: dopamine depletion in substantia nigra \u2192 bradykinesia, rigidity, resting tremor, postural instability. Huntington disease: caudate/putamen degeneration \u2192 chorea (involuntary dance-like movements). OCD linked to caudate hyperactivity. Deep brain stimulation of subthalamic nucleus for Parkinson.', detail: t('stem.anatomy.dopamine_from_substantia_nigra_modulat', 'Dopamine from substantia nigra modulates the direct (D1, excitatory) and indirect (D2, inhibitory) pathways. Loss of this modulation in Parkinson creates the characteristic difficulty initiating movement.') },
              { id: 'spinal_cord', name: t('stem.anatomy.spinal_cord', 'Spinal Cord'), x: 0.50, y: 0.30, v: 'p', fn: 'Extends from foramen magnum to L1\u2013L2 (conus medullaris). Conducts sensory/motor signals. 31 segments, each with dorsal (sensory) and ventral (motor) roots.', clinical: 'Spinal cord injury: above C4 \u2192 quadriplegia + ventilator. Complete transection \u2192 loss of motor/sensory below level.', clinicalKid: 'Your spinal cord is a thick bundle of nerves that runs down your back inside your spine. It carries messages between your brain and the rest of your body so you can feel and move. Wearing a helmet and a seatbelt and sitting up tall help keep it safe and strong.' },
              { id: 'vagus', name: t('stem.anatomy.vagus_nerve_cn_x', 'Vagus Nerve (CN X)'), x: 0.44, y: 0.14, v: 'a', fn: 'Longest cranial nerve. Parasympathetic innervation to thoracic and abdominal viscera. Slows heart rate, increases GI motility, controls laryngeal muscles.', clinical: 'Vagal stimulation: carotid sinus massage, Valsalva maneuver for SVT. Vagus nerve stimulator for epilepsy/depression. Recurrent laryngeal nerve injury \u2192 hoarseness.' },
              { id: 'sciatic', name: t('stem.anatomy.sciatic_nerve', 'Sciatic Nerve'), x: 0.55, y: 0.50, v: 'p', fn: 'Largest/longest nerve in body. L4\u2013S3 roots. Exits pelvis through greater sciatic foramen below piriformis. Divides into tibial and common peroneal nerves above knee.', clinical: 'Sciatica: radiculopathy from herniated disc (L4\u2013S1). Piriformis syndrome mimics sciatica. IM injection site avoidance.', clinicalKid: 'Your sciatic nerve is the longest, biggest nerve in your whole body, running from your lower back all the way down each leg. It carries messages between your brain and your legs so you can feel things and move, walk, and run. Stretching, moving around, and sitting up tall help your back and legs feel good.' },
              { id: 'brachial_plexus', name: t('stem.anatomy.brachial_plexus', 'Brachial Plexus'), x: 0.34, y: 0.16, v: 'a', fn: 'C5\u2013T1 nerve roots form trunks, divisions, cords, branches. Innervates entire upper limb. "Robert Taylor Drinks Cold Beer" (roots, trunks, divisions, cords, branches).', clinical: 'Erb-Duchenne palsy (C5\u2013C6): "waiter\'s tip" position. Klumpke palsy (C8\u2013T1): claw hand. Birth injuries, motorcycle accidents.' },
              { id: 'median', name: t('stem.anatomy.median_nerve', 'Median Nerve'), x: 0.22, y: 0.38, v: 'a', fn: 'C5\u2013T1 via lateral and medial cords. Motor: forearm pronators, wrist/finger flexors, thenar muscles. Sensory: palmar lateral 3.5 digits.', clinical: 'Carpal tunnel syndrome: median nerve compression under flexor retinaculum. Hand of benediction (can\'t flex index/middle fingers).' },
              { id: 'ulnar_n', name: t('stem.anatomy.ulnar_nerve', 'Ulnar Nerve'), x: 0.78, y: 0.34, v: 'a', fn: 'C8\u2013T1 via medial cord. Motor: intrinsic hand muscles (interossei, hypothenar), FCU, medial FDP. Sensory: medial 1.5 digits.', clinical: '"Funny bone" \u2014 vulnerable at medial epicondyle. Cubital tunnel syndrome. Claw hand deformity. Froment sign.' },
              { id: 'femoral_n', name: t('stem.anatomy.femoral_nerve', 'Femoral Nerve'), x: 0.40, y: 0.48, v: 'a', fn: 'L2\u2013L4 via lumbar plexus. Motor: quadriceps (knee extension), iliacus, sartorius. Sensory: anterior thigh, medial leg (saphenous branch).', clinical: 'Femoral neuropathy: difficulty climbing stairs, absent knee jerk. L4 radiculopathy mimics. Femoral nerve block for hip surgery.' },
              { id: 'sympathetic', name: t('stem.anatomy.sympathetic_chain', 'Sympathetic Chain'), x: 0.54, y: 0.30, v: 'p', fn: 'Paired paravertebral ganglia from C1 to coccyx. "Fight or flight": increases HR, dilates pupils, bronchodilation, vasoconstriction, inhibits GI.', clinical: 'Horner syndrome (sympathetic disruption): miosis, ptosis, anhidrosis. Sympathectomy for hyperhidrosis.' },
              { id: 'cranial_n', name: t('stem.anatomy.cranial_nerves_i_xii', 'Cranial Nerves (I-XII)'), x: 0.50, y: 0.08, v: 'a', fn: '12 pairs: olfactory, optic, oculomotor, trochlear, trigeminal, abducens, facial, vestibulocochlear, glossopharyngeal, vagus, spinal accessory, hypoglossal.', clinical: 'CN III palsy: "down and out" eye, ptosis, dilated pupil. CN VII (Bell palsy): facial droop. CN XII: tongue deviates toward lesion.' }
            ]
          },

          lymphatic: {
            name: t('stem.anatomy.lymphatic', 'Lymphatic'), icon: '\uD83D\uDFE2', color: '#dcfce7', accent: '#16a34a',
            desc: t('stem.anatomy.returns_interstitial_fluid_absorbs_die', 'Returns interstitial fluid, absorbs dietary fat, immune surveillance \u2014 600\u2013700 lymph nodes, thymus, spleen.'),
            structures: [
              { id: 'thymus', name: t('stem.anatomy.thymus', 'Thymus'), x: 0.50, y: 0.19, v: 'a', fn: 'Primary lymphoid organ in anterior mediastinum. T-cell maturation and positive/negative selection. Largest in childhood, involutes after puberty (replaced by fat).', clinical: 'Thymoma: associated with myasthenia gravis (anti-AChR antibodies). DiGeorge syndrome: thymic aplasia \u2192 T-cell deficiency.', clinicalKid: 'Your thymus is a small organ in the middle of your chest that helps train the germ fighting cells in your body so they know how to keep you well. It does its biggest job while you are a kid, so sleep, healthy food, and exercise help your whole defense team stay strong.' },
              { id: 'spleen', name: t('stem.anatomy.spleen', 'Spleen'), x: 0.58, y: 0.30, v: 'a', fn: 'Largest lymphoid organ. Filters blood: removes old RBCs (red pulp), mounts immune responses to blood-borne antigens (white pulp). Stores 1/3 of platelets.', clinical: 'Splenomegaly in mono, malaria, leukemia. Splenic rupture from trauma \u2192 emergency splenectomy. Post-splenectomy: encapsulated bacteria risk.', clinicalKid: 'Your spleen is a soft organ on the left side of your belly that cleans your blood and takes out old, worn out blood cells. It also helps your body fight germs and keeps blood ready for when you need it. Healthy food, exercise, and washing your hands help your spleen do its job.' },
              { id: 'tonsils', name: t('stem.anatomy.tonsils_waldeyer_ring', 'Tonsils (Waldeyer Ring)'), x: 0.50, y: 0.11, v: 'a', fn: 'Pharyngeal (adenoids), palatine, tubal, and lingual tonsils form a lymphoid ring at the oropharyngeal entrance. First line of defense against inhaled/ingested pathogens.', clinical: 'Tonsillitis, peritonsillar abscess ("quinsy"). Adenoid hypertrophy \u2192 mouth breathing, sleep apnea in children.' },
              { id: 'cervical_ln', name: t('stem.anatomy.cervical_lymph_nodes', 'Cervical Lymph Nodes'), x: 0.56, y: 0.13, v: 'a', fn: 'Drain head and neck including scalp, face, oral cavity, pharynx. Deep cervical chain runs along IJV. Virchow node (left supraclavicular) drains thoracic duct.', clinical: 'Enlarged: infection, lymphoma, metastatic cancer. Virchow node enlargement \u2192 suspect GI malignancy (Troisier sign).' },
              { id: 'axillary_ln', name: t('stem.anatomy.axillary_lymph_nodes', 'Axillary Lymph Nodes'), x: 0.32, y: 0.22, v: 'a', fn: '5 groups draining upper limb, breast, chest wall. Sentinel lymph node biopsy in breast cancer staging.', clinical: 'Breast cancer staging depends on axillary LN involvement. Axillary dissection may cause lymphedema of arm.' },
              { id: 'inguinal_ln', name: t('stem.anatomy.inguinal_lymph_nodes', 'Inguinal Lymph Nodes'), x: 0.44, y: 0.44, v: 'a', fn: 'Superficial group drains lower limb, perineum, lower abdominal wall, external genitalia. Deep group drains along femoral vein.', clinical: 'Lymphadenopathy in STIs, lower limb infections, lymphoma. Buboes in lymphogranuloma venereum, plague.' },
              { id: 'thoracic_duct', name: t('stem.anatomy.thoracic_duct', 'Thoracic Duct'), x: 0.48, y: 0.26, v: 'p', fn: 'Main lymphatic channel (40 cm). Drains \u00BE of body (everything except right upper quadrant). Empties into left subclavian/internal jugular junction (left venous angle).', clinical: 'Chylothorax from thoracic duct injury (trauma, surgery). Milky pleural effusion with high triglycerides.' },
              { id: 'bone_marrow', name: t('stem.anatomy.bone_marrow', 'Bone Marrow'), x: 0.42, y: 0.57, v: 'a', fn: 'Primary lymphoid organ. Red marrow produces all blood cells (hematopoiesis) including lymphocyte precursors. Adults: mainly in axial skeleton, proximal femur/humerus.', clinical: 'Leukemia (malignant WBC proliferation). Aplastic anemia. Bone marrow biopsy from posterior iliac crest. Bone marrow transplant.' }
            ]
          },

          organs: {
            name: t('stem.anatomy.organ_systems', 'Organ Systems'), icon: '\uD83C\uDFE5', color: '#e0f2fe', accent: '#0284c7',
            desc: t('stem.anatomy.major_visceral_organs_respiration_dige', 'Major visceral organs \u2014 respiration, digestion, filtration, endocrine regulation.'),
            structures: [
              { id: 'lungs', name: t('stem.anatomy.lungs', 'Lungs'), x: 0.42, y: 0.24, v: 'a', fn: 'Right lung: 3 lobes (superior, middle, inferior). Left lung: 2 lobes + lingula (cardiac notch). ~300 million alveoli provide ~70 m\u00B2 surface area for gas exchange.', clinical: 'Pneumonia, COPD, asthma, lung cancer (#1 cancer killer). Pneumothorax. Right bronchus more vertical \u2192 foreign body aspiration.', clinicalKid: 'Your lungs fill up with air like two balloons when you breathe in, then push the air back out. Fresh air and exercise keep them healthy, and staying away from smoke keeps them clean.' },
              { id: 'liver', name: t('stem.anatomy.liver', 'Liver'), x: 0.56, y: 0.30, v: 'a', fn: 'Largest internal organ (1.5 kg). 2 anatomical lobes (right larger). Functions: bile production, detoxification, protein synthesis (albumin, clotting factors), glycogen storage, drug metabolism.', clinical: 'Hepatitis (viral A/B/C), cirrhosis, hepatocellular carcinoma. Liver failure: jaundice, coagulopathy, encephalopathy. Transplantation.', clinicalKid: 'Your liver is the biggest organ inside your body, and it works like a cleaning crew that filters your blood and keeps it fresh. It also helps you break down food and stores energy for later. Drinking water and eating fruits and vegetables help your liver do its job.' },
              { id: 'stomach', name: t('stem.anatomy.stomach', 'Stomach'), x: 0.55, y: 0.33, v: 'a', fn: 'J-shaped muscular sac. Regions: cardia, fundus, body, antrum, pylorus. Produces HCl (pH 1\u20132), pepsin, intrinsic factor (B12 absorption). Capacity ~1L.', clinical: 'Peptic ulcer disease (H. pylori, NSAIDs). Gastric cancer. GERD. Gastrectomy may cause dumping syndrome, B12 deficiency.', clinicalKid: 'Your stomach is a stretchy bag that mixes up the food you eat and starts breaking it down. Eating slowly, chewing well, and drinking water help it do its job.' },
              { id: 'kidneys', name: t('stem.anatomy.kidneys', 'Kidneys'), x: 0.58, y: 0.36, v: 'p', fn: 'Bean-shaped, retroperitoneal at T12\u2013L3. Each has ~1 million nephrons. Filter 180L/day, produce 1\u20132L urine. Regulate fluid balance, electrolytes, acid-base, blood pressure (RAAS).', clinical: 'CKD, nephrotic/nephritic syndrome, kidney stones, renal cell carcinoma. Right kidney lower due to liver. Dialysis when GFR <15.', clinicalKid: 'Your kidneys are two bean shaped helpers that clean your blood and turn the waste into pee so your body can get rid of it. Drinking water and eating fruits and vegetables help them do their job. A doctor can check them to make sure they are working well.' },
              { id: 'sm_intestine', name: t('stem.anatomy.small_intestine', 'Small Intestine'), x: 0.50, y: 0.38, v: 'a', fn: '6m long: duodenum (25cm, C-shaped), jejunum (2.5m), ileum (3.5m). Primary site of nutrient absorption. Villi and microvilli increase surface area to ~200 m\u00B2.', clinical: 'Celiac disease (gluten sensitivity), Crohn disease (often terminal ileum), SBO (adhesions #1 cause), duodenal ulcers.' },
              { id: 'lg_intestine', name: t('stem.anatomy.large_intestine', 'Large Intestine'), x: 0.50, y: 0.40, v: 'a', fn: '1.5m: cecum, ascending, transverse, descending, sigmoid colon, rectum. Absorbs water and electrolytes. Houses gut microbiome (~100 trillion bacteria). Forms and stores feces.', clinical: 'Colorectal cancer (3rd most common cancer). Diverticulosis/diverticulitis. Ulcerative colitis. Appendicitis (McBurney point).' },
              { id: 'pancreas', name: t('stem.anatomy.pancreas', 'Pancreas'), x: 0.52, y: 0.34, v: 'a', fn: 'Retroperitoneal organ. Exocrine (98%): digestive enzymes (lipase, amylase, trypsinogen) and bicarbonate. Endocrine (2%): islets of Langerhans \u2014 insulin (\u03B2), glucagon (\u03B1).', clinical: 'Acute pancreatitis (gallstones, alcohol). Pancreatic cancer (poor prognosis, 5-yr survival <10%). Type 1 diabetes (autoimmune \u03B2-cell destruction).' },
              { id: 'gallbladder', name: t('stem.anatomy.gallbladder', 'Gallbladder'), x: 0.55, y: 0.31, v: 'a', fn: 'Pear-shaped sac on inferior liver surface. Stores and concentrates bile (5\u201310\u00D7). Contracts in response to CCK after fatty meals to release bile into duodenum.', clinical: 'Cholelithiasis (gallstones, 10\u201315% of adults). Cholecystitis. Murphy sign. Cholecystectomy is one of most common surgeries.' },
              { id: 'bladder', name: t('stem.anatomy.urinary_bladder', 'Urinary Bladder'), x: 0.50, y: 0.44, v: 'a', fn: 'Distensible muscular sac. Stores 400\u2013600mL urine. Detrusor muscle contracts for micturition. Internal sphincter (involuntary), external sphincter (voluntary, pudendal nerve).', clinical: 'UTIs (more common in females due to short urethra). Bladder cancer (painless hematuria). Neurogenic bladder in spinal cord injury.' },
              { id: 'diaphragm', name: t('stem.anatomy.diaphragm', 'Diaphragm'), x: 0.50, y: 0.27, v: 'a', fn: 'Primary muscle of respiration. Dome-shaped, separates thorax from abdomen. Contracts and flattens during inspiration \u2192 negative intrathoracic pressure. Three openings: T8 (IVC), T10 (esophagus), T12 (aorta).', clinical: 'Hiatal hernia (stomach through esophageal hiatus). Diaphragmatic paralysis from phrenic nerve injury (C3\u2013C5). "C3, 4, 5 keeps the diaphragm alive."', clinicalKid: 'Your diaphragm is a big dome-shaped muscle under your lungs that helps you breathe. When it tightens and flattens, it pulls air into your lungs, and when it relaxes, the air goes back out. Taking slow deep breaths and getting plenty of exercise help this strong muscle do its job.' },
              { id: 'thyroid', name: t('stem.anatomy.thyroid_gland', 'Thyroid Gland'), x: 0.50, y: 0.135, v: 'a', fn: 'Butterfly-shaped, anterior neck at C5\u2013T1. Produces T3/T4 (metabolism, growth, development) and calcitonin (lowers blood calcium). Requires iodine.', clinical: 'Hypothyroidism (Hashimoto): fatigue, weight gain, cold intolerance. Hyperthyroidism (Graves): weight loss, tremor, exophthalmos. Thyroid nodules/cancer.' },
              { id: 'adrenals', name: t('stem.anatomy.adrenal_glands', 'Adrenal Glands'), x: 0.56, y: 0.34, v: 'p', fn: 'Suprarenal glands. Cortex (3 zones): zona glomerulosa (aldosterone), zona fasciculata (cortisol), zona reticularis (androgens). Medulla: epinephrine/norepinephrine.', clinical: 'Addison disease (cortical insufficiency): hypotension, hyperpigmentation. Cushing syndrome (cortisol excess). Pheochromocytoma (medullary tumor \u2192 episodic HTN).' }
            ]
          },

          integumentary: {
            name: t('stem.anatomy.integumentary', 'Integumentary'), icon: '\uD83E\uDDF4', color: '#fef9c3', accent: '#a16207',
            desc: t('stem.anatomy.skin_largest_organ_2m_hair_nails_gland', 'Skin (largest organ, ~2m\u00B2), hair, nails, glands \u2014 barrier, thermoregulation, sensation, vitamin D synthesis.'),
            structures: [
              { id: 'epidermis', name: t('stem.anatomy.epidermis', 'Epidermis'), x: 0.50, y: 0.15, v: 'a', fn: 'Outermost skin layer. 5 strata (thick skin): basale, spinosum, granulosum, lucidum, corneum. Keratinocytes (90%), melanocytes (8%), Langerhans cells (immune), Merkel cells (touch). Avascular \u2014 nutrients diffuse from dermis. Turnover every 28\u201330 days.', clinical: 'Psoriasis: hyperproliferation (turnover 3\u20134 days). Melanoma from melanocyte mutation. Eczema (atopic dermatitis). Burns classified by depth of epidermal/dermal involvement.', clinicalKid: 'Your epidermis is the thin top layer of your skin that covers your whole body like a shield and keeps germs and water out. It makes brand new cells all the time and pushes the old ones off, so your skin is always fresh. Washing with soap and water and putting on sunscreen help keep it healthy and strong.' },
              { id: 'dermis', name: t('stem.anatomy.dermis', 'Dermis'), x: 0.50, y: 0.20, v: 'a', fn: 'Connective tissue layer beneath epidermis. Papillary dermis (loose CT, dermal papillae for fingerprints) and reticular dermis (dense irregular CT, collagen/elastin for strength/elasticity). Contains blood vessels, nerves, hair follicles, glands.', clinical: 'Stretch marks (striae): torn collagen fibers. Cellulitis: bacterial infection of dermis. Dermal injection site for TB test (Mantoux). Keloid scarring from excess collagen.', clinicalKid: 'Your dermis is the strong, stretchy layer of skin just under the surface. It is packed with tiny blood vessels, nerves, and the roots that hold your hair, and it helps your skin bend and bounce back. Drinking water and eating fruits and vegetables help keep your skin healthy and strong.' },
              { id: 'hypodermis', name: t('stem.anatomy.hypodermis_subcutaneous', 'Hypodermis (Subcutaneous)'), x: 0.50, y: 0.25, v: 'a', fn: 'Deep to dermis (not technically skin). Adipose tissue for insulation, energy storage, and mechanical cushioning. Contains large blood vessels and nerves. Subcutaneous injection site.', clinical: 'Lipomas (benign fat tumors). Subcutaneous emphysema (air under skin, crepitus). Insulin and heparin injected subcutaneously. Obesity increases this layer.' },
              { id: 'hair_follicle', name: t('stem.anatomy.hair_follicles', 'Hair Follicles'), x: 0.50, y: 0.06, v: 'a', fn: '~5 million follicles (100,000 on scalp). Hair shaft: medulla, cortex, cuticle. Arrector pili muscle causes goosebumps. Hair growth cycle: anagen (growth, 2\u20136 yrs), catagen (regression), telogen (rest/shedding). Stem cells in bulge region.', clinical: 'Alopecia areata (autoimmune hair loss). Folliculitis (infected follicle). Male pattern baldness (androgenetic alopecia, DHT-mediated). Hirsutism from excess androgens.' },
              { id: 'sweat_glands', name: t('stem.anatomy.sweat_glands', 'Sweat Glands'), x: 0.30, y: 0.30, v: 'a', fn: 'Eccrine glands (~3 million): watery sweat for thermoregulation, open directly to skin surface, densest on palms/soles. Apocrine glands: thicker secretion into hair follicles in axillae/groin, active after puberty, bacterial breakdown causes body odor.', clinical: 'Hyperhidrosis (excessive sweating). Anhidrosis in Horner syndrome. Heat stroke when sweating fails. Cystic fibrosis: elevated sweat chloride (diagnostic sweat test).' },
              { id: 'sebaceous', name: t('stem.anatomy.sebaceous_glands', 'Sebaceous Glands'), x: 0.45, y: 0.10, v: 'a', fn: 'Holocrine glands associated with hair follicles (except palms/soles). Produce sebum (lipid mixture) that waterproofs skin and hair, prevents drying, has bactericidal properties. Activity increases at puberty (androgens).', clinical: 'Acne vulgaris: sebaceous gland hyperactivity + P. acnes bacteria + follicular plugging. Sebaceous cysts. Isotretinoin (Accutane) shrinks sebaceous glands for severe acne.' },
              { id: 'nails', name: t('stem.anatomy.nails', 'Nails'), x: 0.16, y: 0.44, v: 'a', fn: 'Keratinized epidermal derivatives. Nail plate grows from nail matrix (under proximal fold) at ~3mm/month (fingernails) or ~1mm/month (toenails). Lunula: visible part of matrix. Nail bed highly vascular (pink color).', clinical: 'Clubbing: sign of chronic hypoxia (lung/heart disease). Koilonychia (spoon nails): iron deficiency. Onychomycosis (fungal infection). Splinter hemorrhages: endocarditis. Beau lines: illness/stress.' },
              { id: 'melanocytes', name: t('stem.anatomy.melanocytes_pigmentation', 'Melanocytes & Pigmentation'), x: 0.50, y: 0.35, v: 'a', fn: 'Neural crest-derived cells in stratum basale. Produce melanin (eumelanin=brown/black, pheomelanin=red/yellow) in melanosomes, transferred to surrounding keratinocytes via dendrites. UV radiation increases melanin production (tanning). Same number in all races; differences are in melanin amount/type.', clinical: 'Vitiligo: autoimmune melanocyte destruction (depigmented patches). Albinism: defective melanin synthesis. Melanoma: deadliest skin cancer, arises from melanocytes, ABCDE criteria for detection.' }
            ]
          },

          respiratory: {
            name: t('stem.anatomy.respiratory', 'Respiratory'), icon: '\uD83E\uDEC1', color: '#e0f2fe', accent: '#0369a1',
            desc: t('stem.anatomy.oxygen_delivery_and_co_removal_12_20_b', 'Oxygen delivery and CO\u2082 removal \u2014 ~12\u201320 breaths/min, ~6L air/min, 300 million alveoli.'),
            structures: [
              { id: 'nasal_cavity', name: t('stem.anatomy.nasal_cavity_sinuses', 'Nasal Cavity & Sinuses'), x: 0.50, y: 0.06, v: 'a', fn: 'Warms, humidifies, and filters inspired air. Nasal conchae (turbinates) increase surface area. Rich vascular plexus (Kiesselbach plexus) on septum. Paranasal sinuses (frontal, maxillary, ethmoid, sphenoid) lighten skull, add resonance to voice.', clinical: 'Epistaxis (nosebleed): 90% anterior from Kiesselbach plexus. Sinusitis. Deviated septum. Nasal polyps in chronic rhinitis/asthma/CF. Anosmia from COVID-19.' },
              { id: 'pharynx', name: t('stem.anatomy.pharynx', 'Pharynx'), x: 0.50, y: 0.10, v: 'a', fn: 'Muscular tube from skull base to C6. Three regions: nasopharynx (adenoids, Eustachian tube), oropharynx (palatine tonsils), laryngopharynx (diverges into esophagus and larynx). Shared airway and food passage.', clinical: 'Pharyngitis (sore throat): viral most common, Group A Strep requires antibiotics (prevent rheumatic fever). Obstructive sleep apnea from pharyngeal collapse. Pharyngeal cancer (HPV-related rising).' },
              { id: 'larynx', name: t('stem.anatomy.larynx_voice_box', 'Larynx (Voice Box)'), x: 0.50, y: 0.13, v: 'a', fn: 'Cartilaginous framework at C3\u2013C6. Thyroid cartilage (Adam\'s apple), cricoid (complete ring), arytenoids (move vocal cords). True vocal cords (folds) vibrate for phonation. Epiglottis closes during swallowing to protect airway.', clinical: 'Laryngitis (hoarseness). Recurrent laryngeal nerve injury (thyroid surgery) \u2192 vocal cord paralysis. Croup in children (barking cough). Laryngeal cancer from smoking. Emergency cricothyrotomy through cricothyroid membrane.' },
              { id: 'trachea', name: t('stem.anatomy.trachea', 'Trachea'), x: 0.50, y: 0.17, v: 'a', fn: '10\u201312 cm tube from C6 to T4\u2013T5 (carina). 16\u201320 C-shaped cartilage rings (open posteriorly to allow esophageal expansion). Pseudostratified ciliated columnar epithelium with goblet cells \u2014 mucociliary escalator traps and clears particles.', clinical: 'Tracheostomy for prolonged ventilation. Tracheomalacia (softened cartilage, floppy airway). Foreign body aspiration: right main bronchus more vertical. Tracheal intubation for general anesthesia.', clinicalKid: 'Your windpipe is a stretchy tube in your throat that carries air down to your lungs every time you breathe. Stiff rings hold it open so air can flow, and tiny hairs inside sweep out dust to keep it clean. Fresh air and staying away from smoke help it stay healthy.' },
              { id: 'bronchi', name: t('stem.anatomy.bronchial_tree', 'Bronchial Tree'), x: 0.46, y: 0.22, v: 'a', fn: 'Trachea \u2192 R/L main bronchi \u2192 lobar bronchi (3R, 2L) \u2192 segmental \u2192 terminal bronchioles \u2192 respiratory bronchioles. Progressive loss of cartilage, increase in smooth muscle. ~23 generations of branching. Total cross-section increases enormously.', clinical: 'Asthma: bronchospasm + inflammation of bronchi/bronchioles. Bronchitis: inflammation of bronchial mucosa. Bronchiectasis: permanent dilation from chronic infection. Bronchoscopy for diagnosis/biopsy.' },
              { id: 'alveoli', name: t('stem.anatomy.alveoli', 'Alveoli'), x: 0.54, y: 0.26, v: 'a', fn: '~300 million alveoli provide ~70m\u00B2 gas exchange surface. Type I pneumocytes (95% surface, gas exchange). Type II pneumocytes (surfactant production, reduces surface tension). Alveolar macrophages (dust cells) phagocytose particles. Blood-air barrier: 0.5\u03BCm thick.', clinical: 'Pneumonia: alveolar infection/inflammation. ARDS: diffuse alveolar damage, pulmonary edema. Emphysema: alveolar wall destruction (COPD). Neonatal RDS: surfactant deficiency in premature infants.', clinicalKid: 'Your alveoli are millions of tiny air pockets at the end of your lungs, and they look like little bunches of grapes. They let fresh oxygen move from the air you breathe into your blood so your whole body can use it. Breathing fresh air, exercising, and staying away from smoke help keep them clean and healthy.' },
              { id: 'pleura', name: t('stem.anatomy.pleura', 'Pleura'), x: 0.58, y: 0.24, v: 'a', fn: 'Visceral pleura (covers lungs) and parietal pleura (lines chest wall) create pleural cavity containing ~5mL serous fluid. Surface tension keeps lungs expanded. Negative intrapleural pressure (\u22124 cmH\u2082O) prevents lung collapse.', clinical: 'Pneumothorax: air in pleural space \u2192 lung collapse. Tension pneumothorax: life-threatening, mediastinal shift. Pleural effusion: fluid collection (transudate vs exudate). Mesothelioma: asbestos-related pleural cancer.' },
              { id: 'resp_muscles', name: t('stem.anatomy.respiratory_muscles', 'Respiratory Muscles'), x: 0.42, y: 0.28, v: 'a', fn: 'Inspiration: diaphragm (70% of quiet breathing, C3\u2013C5 phrenic nerve) + external intercostals. Forced inspiration adds: SCM, scalenes, pectoralis minor. Expiration: passive in quiet breathing (elastic recoil). Forced expiration: internal intercostals + abdominals.', clinical: 'Phrenic nerve palsy \u2192 hemidiaphragm paralysis. C3\u2013C5 spinal cord injury \u2192 respiratory failure. Myasthenia gravis: respiratory muscle weakness (myasthenic crisis). Flail chest impairs breathing mechanics.' }
            ]
          },

          endocrine: {
            name: t('stem.anatomy.endocrine', 'Endocrine'), icon: '\u2697\uFE0F', color: '#fae8ff', accent: '#a21caf',
            desc: t('stem.anatomy.hormone_producing_glands_regulate_meta', 'Hormone-producing glands \u2014 regulate metabolism, growth, reproduction, stress, homeostasis via chemical messengers.'),
            structures: [
              { id: 'pituitary', name: t('stem.anatomy.pituitary_gland_hypophysis', 'Pituitary Gland (Hypophysis)'), x: 0.50, y: 0.07, v: 'a', fn: 'Pea-sized "master gland" in sella turcica. Anterior (adenohypophysis): GH, ACTH, TSH, FSH, LH, prolactin. Posterior (neurohypophysis): stores/releases oxytocin and ADH (made in hypothalamus). Regulated by hypothalamic releasing/inhibiting hormones.', clinical: 'Pituitary adenoma: visual field defect (bitemporal hemianopia from chiasm compression). Acromegaly (excess GH in adults). Hyperprolactinemia \u2192 galactorrhea, amenorrhea. Panhypopituitarism.', clinicalKid: 'Your pituitary gland is tiny, about the size of a pea, but it is called the master gland because it sends out helpers called hormones that tell your body how to grow and feel. Good sleep, healthy food, and lots of moving and playing help it do its job. A doctor can measure how tall you are growing to check that it is working well.' },
              { id: 'pineal', name: t('stem.anatomy.pineal_gland', 'Pineal Gland'), x: 0.50, y: 0.05, v: 'p', fn: 'Small endocrine gland in epithalamus. Produces melatonin (from serotonin, regulated by light/dark cycle via SCN). Melatonin regulates circadian rhythm and has antioxidant properties. Calcifies with age (visible on X-ray as a midline marker).', clinical: 'Pineal tumors may cause obstructive hydrocephalus (compresses cerebral aqueduct). Parinaud syndrome: upgaze palsy. Jet lag and shift-work disorder related to melatonin disruption. Exogenous melatonin used as sleep aid.' },
              { id: 'parathyroid', name: t('stem.anatomy.parathyroid_glands', 'Parathyroid Glands'), x: 0.52, y: 0.14, v: 'p', fn: '4 small glands on posterior thyroid surface. Produce PTH (parathyroid hormone): raises blood calcium by increasing bone resorption, renal Ca\u00B2\u207A reabsorption, and activating vitamin D. PTH and calcitonin are antagonists.', clinical: 'Hyperparathyroidism: "bones, stones, groans, and psychiatric moans" (osteoporosis, kidney stones, abdominal pain, depression). Hypoparathyroidism: hypocalcemia \u2192 tetany, Chvostek/Trousseau signs. Accidental removal during thyroidectomy.' },
              { id: 'islets', name: t('stem.anatomy.islets_of_langerhans', 'Islets of Langerhans'), x: 0.52, y: 0.34, v: 'a', fn: 'Endocrine clusters within pancreas (~1\u20132 million islets). \u03B2-cells (70%): insulin (lowers glucose). \u03B1-cells (20%): glucagon (raises glucose). \u03B4-cells: somatostatin (inhibits both). PP-cells: pancreatic polypeptide. Islets are highly vascularized.', clinical: 'Type 1 diabetes: autoimmune \u03B2-cell destruction (insulin-dependent). Type 2 diabetes: insulin resistance + \u03B2-cell dysfunction. Insulinoma: insulin-secreting tumor \u2192 hypoglycemia. Islet transplantation research.' },
              { id: 'ovaries_endo', name: t('stem.anatomy.ovaries_endocrine', 'Ovaries (Endocrine)'), x: 0.46, y: 0.44, v: 'a', fn: 'Produce estrogen (follicular cells) and progesterone (corpus luteum). Estrogen: secondary sex characteristics, bone density, endometrial proliferation. Progesterone: maintains pregnancy, endometrial secretion. Also produce inhibin and small amounts of testosterone.', clinical: 'PCOS: hyperandrogenism, anovulation, polycystic ovaries. Premature ovarian failure. Menopause: estrogen decline \u2192 hot flashes, osteoporosis, cardiovascular risk. HRT replaces declining hormones.' },
              { id: 'testes_endo', name: t('stem.anatomy.testes_endocrine', 'Testes (Endocrine)'), x: 0.50, y: 0.48, v: 'a', fn: 'Leydig cells (interstitial) produce testosterone under LH stimulation. Testosterone: male secondary sex characteristics, spermatogenesis (with FSH), muscle mass, bone density, libido. Also converted to DHT (5\u03B1-reductase) and estradiol (aromatase).', clinical: 'Hypogonadism: low testosterone \u2192 infertility, decreased libido, osteoporosis. Testosterone replacement therapy. Anabolic steroid abuse: testicular atrophy, cardiovascular risk. Klinefelter syndrome (47,XXY).' },
              { id: 'hypothal_endo', name: t('stem.anatomy.hypothalamic_pituitary_axis', 'Hypothalamic-Pituitary Axis'), x: 0.50, y: 0.04, v: 'a', fn: 'Master regulatory cascade. Hypothalamus releases hormones into hypophyseal portal system \u2192 anterior pituitary. Key axes: HPA (stress/cortisol), HPT (thyroid/T3/T4), HPG (gonadal/sex hormones). Negative feedback loops maintain homeostasis.', clinical: 'HPA axis dysregulation in chronic stress, depression, PTSD. Central hypothyroidism (TSH deficiency). Kallmann syndrome: GnRH deficiency \u2192 hypogonadism + anosmia. Sheehan syndrome: pituitary necrosis postpartum.' },
              { id: 'adrenal_endo', name: t('stem.anatomy.adrenal_cortex_zones', 'Adrenal Cortex Zones'), x: 0.58, y: 0.34, v: 'a', fn: 'Three zones ("GFR = salt, sugar, sex"): Glomerulosa \u2192 aldosterone (mineralocorticoid, Na\u207A/K\u207A balance, RAAS). Fasciculata \u2192 cortisol (glucocorticoid, stress, anti-inflammatory). Reticularis \u2192 DHEA/androgens (weak androgens).', clinical: 'Conn syndrome: aldosterone-secreting adenoma \u2192 hypertension, hypokalemia. Cushing syndrome: cortisol excess (moon face, buffalo hump, striae). Congenital adrenal hyperplasia (21-hydroxylase deficiency): ambiguous genitalia.' }
            ]
          },

          reproductive: {
            name: t('stem.anatomy.reproductive', 'Reproductive'), icon: '\uD83D\uDC76', color: '#fce7f3', accent: '#db2777',
            desc: t('stem.anatomy.male_and_female_reproductive_organs_ga', 'Male and female reproductive organs \u2014 gamete production, fertilization, fetal development, hormonal regulation.'),
            structures: [
              { id: 'testes_repro', name: t('stem.anatomy.testes', 'Testes'), x: 0.50, y: 0.52, v: 'a', fn: 'Paired oval organs in scrotum (2\u20133\u00B0C below body temperature for spermatogenesis). Each contains ~250 lobules with seminiferous tubules (sperm production, 64\u201372 day cycle). Sertoli cells provide nutritive/structural support. ~200 million sperm produced daily.', clinical: 'Cryptorchidism (undescended testis): infertility and cancer risk if uncorrected. Testicular torsion: surgical emergency (6hr window). Testicular cancer: most common solid tumor in men 15\u201335.' },
              { id: 'epididymis', name: t('stem.anatomy.epididymis', 'Epididymis'), x: 0.52, y: 0.50, v: 'p', fn: 'Coiled tube (~6m uncoiled) on posterior testis. Three regions: head (receives sperm from efferent ductules), body, tail (stores mature sperm). Sperm undergo maturation during 12-day transit \u2014 gain motility and fertilizing capacity.', clinical: 'Epididymitis: infection (STI in young men, UTI organisms in older men) \u2192 scrotal pain/swelling. Positive Prehn sign (pain relief with elevation) distinguishes from torsion. Epididymal cyst (spermatocele).' },
              { id: 'prostate', name: t('stem.anatomy.prostate_gland', 'Prostate Gland'), x: 0.50, y: 0.46, v: 'a', fn: 'Walnut-sized gland surrounding prostatic urethra below bladder. Produces ~30% of seminal fluid (citric acid, PSA, zinc, proteolytic enzymes). Five lobes; peripheral zone largest and most common site of cancer. Grows throughout life under DHT influence.', clinical: 'BPH (benign prostatic hyperplasia): urinary obstruction in elderly men. Prostate cancer: most common male cancer, detected by PSA and DRE. Prostatitis. TURP (transurethral resection) for BPH.' },
              { id: 'uterus', name: t('stem.anatomy.uterus', 'Uterus'), x: 0.50, y: 0.42, v: 'a', fn: 'Pear-shaped muscular organ. Regions: fundus, body, cervix. Three layers: endometrium (cyclically shed in menstruation), myometrium (smooth muscle, contractions during labor), perimetrium (serosa). Normally anteverted and anteflexed. Capacity expands 500\u00D7 in pregnancy.', clinical: 'Uterine fibroids (leiomyomas): most common pelvic tumor in women. Endometriosis: endometrial tissue outside uterus. Endometrial cancer (most common GYN malignancy). C-section incision through all layers.' },
              { id: 'ovaries_repro', name: t('stem.anatomy.ovaries', 'Ovaries'), x: 0.42, y: 0.44, v: 'a', fn: 'Paired, almond-sized organs lateral to uterus. Contain ~1\u20132 million oocytes at birth (depleted to ~400,000 by puberty, ~400 ovulated in lifetime). Follicular development: primordial \u2192 primary \u2192 secondary \u2192 Graafian follicle \u2192 ovulation \u2192 corpus luteum.', clinical: 'Ovarian cysts (functional most common). Ovarian cancer: "silent killer" (often diagnosed late). PCOS. Ovarian torsion: surgical emergency. Ectopic pregnancy if fertilized egg implants in tube instead of uterus.' },
              { id: 'fallopian', name: t('stem.anatomy.fallopian_tubes_oviducts', 'Fallopian Tubes (Oviducts)'), x: 0.38, y: 0.41, v: 'a', fn: '~10cm tubes connecting ovaries to uterus. Regions: infundibulum (fimbriae catch ovulated oocyte), ampulla (usual site of fertilization), isthmus (narrow, connects to uterus). Ciliated epithelium and peristalsis transport ovum/embryo toward uterus over 3\u20134 days.', clinical: 'Ectopic pregnancy (95% in fallopian tube): life-threatening rupture risk. PID (pelvic inflammatory disease, often from Chlamydia/Gonorrhea): scarring \u2192 infertility. Tubal ligation for permanent contraception. Salpingectomy.' },
              { id: 'mammary', name: t('stem.anatomy.mammary_glands', 'Mammary Glands'), x: 0.42, y: 0.24, v: 'a', fn: 'Modified apocrine sweat glands. 15\u201320 lobes of glandular tissue, each with lactiferous duct opening at nipple. Development: estrogen (ductal growth), progesterone (lobular growth), prolactin (milk production), oxytocin (milk ejection/let-down reflex).', clinical: 'Breast cancer: most common cancer in women. BRCA1/2 gene mutations increase risk. Fibrocystic changes (benign, cyclical tenderness). Mastitis: infection during lactation. Mammography screening from age 40\u201350.' },
              { id: 'placenta', name: t('stem.anatomy.placenta', 'Placenta'), x: 0.50, y: 0.38, v: 'a', fn: 'Temporary organ during pregnancy (develops from trophoblast). Maternal-fetal exchange: O\u2082, nutrients (maternal \u2192 fetal), CO\u2082, waste (fetal \u2192 maternal). Produces hCG, progesterone, estrogen, hPL. Barrier to most pathogens (not all: TORCH infections cross). Weighs ~500g at term.', clinical: 'Placenta previa: placenta covers cervical os \u2192 painless bleeding. Placental abruption: premature separation \u2192 painful bleeding, emergency. Pre-eclampsia: abnormal placentation \u2192 HTN, proteinuria. hCG is the basis of pregnancy tests.' }
            ]
          }

        };

        var knownStructureIds = [];
        Object.keys(SYSTEMS).forEach(function(systemId) {
          SYSTEMS[systemId].structures.forEach(function(structure) {
            if (knownStructureIds.indexOf(structure.id) === -1) knownStructureIds.push(structure.id);
          });
        });

        // ══════════════════════════════════════
        // FUN FACTS
        // ══════════════════════════════════════
        var FUN_FACTS = {
          skeletal: [
            'Babies are born with about 270 bones, but adults only have 206 because many fuse together as you grow!',
            'The smallest bone in your body is the stirrup (stapes) in your ear \u2014 it is only about 3mm long!',
            'Bone is stronger than steel by weight \u2014 a cubic inch of bone can withstand forces of up to 19,000 pounds!'
          ],
          muscular: [
            'You use about 200 muscles just to take a single step when walking!',
            'The heart is the hardest-working muscle \u2014 it beats about 100,000 times a day without ever resting.',
            'The gluteus maximus is the largest muscle in your body, and the stapedius in your ear is the smallest!'
          ],
          circulatory: [
            'Your blood vessels, if stretched end to end, would wrap around the Earth about 2.5 times \u2014 that is over 60,000 miles!',
            'Your heart pumps about 2,000 gallons of blood every single day without you thinking about it.',
            'Red blood cells live for only about 120 days, and your bone marrow makes about 2 million new ones every second!'
          ],
          nervous: [
            'Your brain has about 86 billion neurons, and each one can connect to up to 10,000 others \u2014 making over 100 trillion connections!',
            'Nerve impulses travel at speeds up to 268 mph \u2014 that is faster than a Formula 1 race car!',
            'The human brain generates about 20 watts of power \u2014 enough to light a small LED bulb!'
          ],
          lymphatic: [
            'Your body has about 600 to 700 lymph nodes \u2014 tiny filters that help trap germs and cancer cells!',
            'The spleen can store up to a cup of blood as an emergency reserve for when you need it most.',
            'Your lymphatic system moves about 3 liters of fluid back into your bloodstream every single day!'
          ],
          organs: [
            'Your liver performs over 500 different jobs, including making bile, filtering toxins, and storing vitamins!',
            'The small intestine, unfolded, would be about 20 feet long \u2014 longer than most rooms!',
            'Your kidneys filter your entire blood supply about 40 times every day \u2014 that is 180 liters of fluid!'
          ],
          integumentary: [
            'Your skin is your largest organ \u2014 it covers about 2 square meters and makes up about 16% of your total body weight!',
            'You shed about 30,000 to 40,000 dead skin cells every hour \u2014 a whole new outer layer every 2 to 4 weeks!',
            'Skin can stretch up to 3 times its original size, which is why it accommodates both growth and injury so well!'
          ],
          respiratory: [
            'You breathe about 22,000 times a day, moving around 11,000 liters of air through your lungs!',
            'If you unfolded all 300 million alveoli in your lungs, the surface area would be about the size of a tennis court!',
            'The lungs are the only organs that float on water because they are full of tiny air-filled sacs called alveoli!'
          ],
          endocrine: [
            'Your pituitary gland is only the size of a pea, but it controls nearly every other hormone-producing gland in your body!',
            'Adrenaline can be released in under a second during a stressful event, instantly boosting your heart rate and strength!',
            'The pancreas releases insulin within just minutes of you eating \u2014 it is constantly monitoring your blood sugar 24/7!'
          ],
          reproductive: [
            'A single human egg is the largest cell in the body and is just barely visible to the naked eye \u2014 about 0.1mm wide!',
            'Sperm are among the smallest cells in the body \u2014 they are 10 times smaller than a red blood cell!',
            'During pregnancy, a woman\'s heart grows larger and pumps about 50% more blood to support the growing baby!'
          ]
        };

        // ══════════════════════════════════════
        // CONNECTIONS DATA
        // ══════════════════════════════════════
        var CONNECTIONS = [
          { id: 'conn_1', systems: ['circulatory', 'respiratory'], title: t('stem.anatomy.gas_exchange', 'Gas Exchange'), desc: t('stem.anatomy.the_circulatory_system_delivers_deoxyg', 'The circulatory system delivers deoxygenated blood to the lungs, where the respiratory system loads it with oxygen and offloads carbon dioxide across the thin alveolar-capillary membrane.'), example: 'Every breath you take replenishes the oxygen that your red blood cells carry to every organ in your body.', icon: '\uD83D\uDCA8' },
          { id: 'conn_2', systems: ['nervous', 'muscular'], title: t('stem.anatomy.neuromuscular_junction', 'Neuromuscular Junction'), desc: t('stem.anatomy.motor_neurons_from_the_nervous_system_', 'Motor neurons from the nervous system release acetylcholine at the neuromuscular junction, triggering muscle fiber contraction. Without neural signals, muscles cannot move.'), example: 'When you decide to kick a soccer ball, your motor cortex sends signals down the spinal cord to fire the quadriceps muscles.', icon: '\u26A1' },
          { id: 'conn_3', systems: ['skeletal', 'muscular'], title: t('stem.anatomy.lever_system_for_movement', 'Lever System for Movement'), desc: t('stem.anatomy.muscles_attach_to_bones_via_tendons_an', 'Muscles attach to bones via tendons and pull across joints, creating lever systems. The skeleton provides rigid levers; muscles provide the pulling force.'), example: 'Your biceps pulls on the radius bone to flex your elbow \u2014 a classic third-class lever that trades force for range of motion.', icon: '\uD83E\uDDB4' },
          { id: 'conn_4', systems: ['endocrine', 'reproductive'], title: t('stem.anatomy.hormonal_regulation_of_reproduction', 'Hormonal Regulation of Reproduction'), desc: t('stem.anatomy.the_hypothalamus_pituitary_axis_releas', 'The hypothalamus-pituitary axis releases FSH and LH that regulate the gonads. Estrogen, progesterone, and testosterone from reproductive organs feedback to the endocrine system.'), example: 'During puberty, rising levels of LH and FSH trigger the ovaries and testes to mature and begin producing sex hormones.', icon: '\u2697\uFE0F' },
          { id: 'conn_5', systems: ['circulatory', 'lymphatic'], title: t('stem.anatomy.immune_defense_and_fluid_balance', 'Immune Defense and Fluid Balance'), desc: t('stem.anatomy.the_lymphatic_system_returns_interstit', 'The lymphatic system returns interstitial fluid to the bloodstream and deploys immune cells made in lymphoid organs. Both systems maintain fluid homeostasis and fight infection.'), example: 'When you get a cut, lymph nodes near the wound swell as they activate immune cells, while the circulatory system sends white blood cells to the site.', icon: '\uD83D\uDFE2' },
          { id: 'conn_6', systems: ['nervous', 'endocrine'], title: t('stem.anatomy.hypothalamic_pituitary_axis_2', 'Hypothalamic-Pituitary Axis'), desc: t('stem.anatomy.the_hypothalamus_bridges_the_nervous_a', 'The hypothalamus bridges the nervous and endocrine systems \u2014 it integrates neural signals and translates them into hormonal commands that control the pituitary gland and all downstream hormone cascades.'), example: 'When you are stressed, your hypothalamus signals the pituitary to release ACTH, which tells the adrenal glands to make cortisol.', icon: '\uD83E\uDDE0' },
          { id: 'conn_7', systems: ['respiratory', 'muscular'], title: t('stem.anatomy.breathing_mechanics', 'Breathing Mechanics'), desc: t('stem.anatomy.the_diaphragm_and_intercostal_muscles_', 'The diaphragm and intercostal muscles physically expand and compress the thoracic cavity to move air. Lungs have no muscle themselves and rely entirely on surrounding muscles.'), example: 'During a deep breath, your diaphragm contracts downward and your external intercostals lift your ribs outward, creating negative pressure that pulls air in.', icon: '\uD83E\uDEC1' },
          { id: 'conn_8', systems: ['integumentary', 'nervous'], title: t('stem.anatomy.sensory_receptors_in_skin', 'Sensory Receptors in Skin'), desc: t('stem.anatomy.the_skin_contains_millions_of_speciali', 'The skin contains millions of specialized nerve endings and encapsulated receptors that detect touch, pressure, temperature, and pain, feeding constant sensory data to the nervous system.'), example: 'Meissner\'s corpuscles in your fingertips allow you to feel light touch with incredible precision, which is why you can read Braille.', icon: '\uD83E\uDDF4' },
          { id: 'conn_9', systems: ['organs', 'circulatory'], title: t('stem.anatomy.portal_circulation_and_nutrient_proces', 'Portal Circulation and Nutrient Processing'), desc: t('stem.anatomy.blood_from_the_gi_tract_drains_through', 'Blood from the GI tract drains through the hepatic portal vein directly to the liver before entering general circulation, allowing the liver to process nutrients and detoxify substances first.'), example: 'After you eat, glucose absorbed from the small intestine travels straight to the liver, which stores excess glucose as glycogen to prevent a blood sugar spike.', icon: '\uD83C\uDFE5' },
          { id: 'conn_10', systems: ['skeletal', 'circulatory'], title: t('stem.anatomy.bone_marrow_blood_cell_production', 'Bone Marrow Blood Cell Production'), desc: t('stem.anatomy.red_bone_marrow_inside_the_skeleton_is', 'Red bone marrow inside the skeleton is the birthplace of all blood cells. Red blood cells, white blood cells, and platelets are all produced here through hematopoiesis.'), example: 'The marrow in your sternum and pelvis produces about 2 million red blood cells per second to replace the ones that wear out after 120 days.', icon: '\uD83E\uDDB4' }
        ];

        // ══════════════════════════════════════
        // GUIDED TOURS DATA
        // ══════════════════════════════════════
        var GUIDED_TOURS = {
          skeletal: [
            { structureId: 'skull', title: t('stem.anatomy.the_skull', 'The Skull'), narration: 'Your skull is like a super-strong helmet made of 22 fused bones. It protects your brain, houses your eyes and ears, and gives your face its shape.' },
            { structureId: 'vertebral', title: t('stem.anatomy.the_vertebral_column', 'The Vertebral Column'), narration: 'Your spine is a stack of 33 vertebrae that protects your spinal cord. It holds you upright and lets you bend and twist. The S-curve acts like a spring to absorb shocks.' },
            { structureId: 'ribs', title: t('stem.anatomy.the_rib_cage', 'The Rib Cage'), narration: 'Your 12 pairs of ribs form a protective cage around your heart and lungs. They flex slightly with each breath to let your lungs expand and contract.' },
            { structureId: 'femur', title: t('stem.anatomy.the_femur', 'The Femur'), narration: 'The femur is your thigh bone and the longest, strongest bone in your body. It can bear loads of 2 to 3 times your body weight during walking.' },
            { structureId: 'pelvis', title: t('stem.anatomy.the_pelvis', 'The Pelvis'), narration: 'The pelvis is a ring of bones that transfers your body weight from your spine down to your legs. It also protects your bladder and reproductive organs.' }
          ],
          muscular: [
            { structureId: 'diaphragm_m', title: t('stem.anatomy.the_diaphragm', 'The Diaphragm'), narration: 'The diaphragm is your main breathing muscle \u2014 a dome-shaped sheet separating your chest from your abdomen. When it contracts and flattens, it creates room for your lungs to expand.' },
            { structureId: 'deltoid', title: t('stem.anatomy.the_deltoid', 'The Deltoid'), narration: 'The deltoid wraps around your shoulder. Its three sections let you raise your arm to the side, swing it forward, and pull it back. Every throw, wave, and reach uses this muscle.' },
            { structureId: 'rectus_ab', title: t('stem.anatomy.rectus_abdominis_2', 'Rectus Abdominis'), narration: 'The rectus abdominis creates the six-pack appearance. It flexes your trunk forward and helps stabilize your pelvis when you walk and run.' },
            { structureId: 'quads', title: t('stem.anatomy.the_quadriceps', 'The Quadriceps'), narration: 'Your quadriceps are four powerful muscles on the front of your thigh. They straighten your knee and are critical for walking, climbing stairs, and running.' },
            { structureId: 'gastrocnemius', title: t('stem.anatomy.the_gastrocnemius', 'The Gastrocnemius'), narration: 'The gastrocnemius is the big calf muscle on the back of the lower leg. It points your foot down for push-off when walking, connecting to the heel via the Achilles tendon.' }
          ],
          circulatory: [
            { structureId: 'heart', title: t('stem.anatomy.the_heart', 'The Heart'), narration: 'Your heart is a fist-sized pump that beats about 100,000 times every day. The right side sends blood to the lungs; the left pumps oxygen-rich blood to the whole body.' },
            { structureId: 'aorta', title: t('stem.anatomy.the_aorta', 'The Aorta'), narration: 'The aorta is the biggest artery in your body. It carries oxygen-rich blood from the left ventricle, arches over your heart, then descends to supply every organ.' },
            { structureId: 'coronary', title: t('stem.anatomy.coronary_arteries_2', 'Coronary Arteries'), narration: 'The coronary arteries are the heart\'s own blood supply. When one gets blocked by a clot, that part of the heart is starved of oxygen \u2014 that is a heart attack.' },
            { structureId: 'carotid', title: t('stem.anatomy.the_carotid_arteries', 'The Carotid Arteries'), narration: 'You have two carotid arteries, one on each side of your neck. They are the main highways carrying blood to your brain. You can feel them pulsing in your neck.' }
          ],
          nervous: [
            { structureId: 'brain', title: t('stem.anatomy.the_brain', 'The Brain'), narration: 'Your brain is command central for your entire body, with about 86 billion neurons. The outer cortex handles thinking and senses. The cerebellum coordinates balance and movement.' },
            { structureId: 'cerebral_cortex', title: t('stem.anatomy.the_cerebral_cortex', 'The Cerebral Cortex'), narration: 'The cortex is the wrinkled outer layer of your brain. The front plans and controls movement. The back processes vision. The sides handle sound and memory.' },
            { structureId: 'spinal_cord', title: t('stem.anatomy.the_spinal_cord', 'The Spinal Cord'), narration: 'The spinal cord is the main highway of your nervous system, running inside the vertebral column. Messages travel up and down it thousands of times every second.' },
            { structureId: 'vagus', title: t('stem.anatomy.the_vagus_nerve', 'The Vagus Nerve'), narration: 'The vagus nerve wanders from your brain stem all the way to your abdomen. It controls heart rate, digestion, and breathing as part of your rest-and-digest response.' }
          ],
          lymphatic: [
            { structureId: 'thymus', title: t('stem.anatomy.the_thymus', 'The Thymus'), narration: 'The thymus is where immature T-cells learn to tell the difference between your own cells and foreign invaders. It is most active during childhood and shrinks after puberty.' },
            { structureId: 'spleen', title: t('stem.anatomy.the_spleen', 'The Spleen'), narration: 'The spleen filters old and damaged red blood cells out of your blood and helps your immune system respond to blood-borne bacteria and viruses.' },
            { structureId: 'cervical_ln', title: t('stem.anatomy.cervical_lymph_nodes_2', 'Cervical Lymph Nodes'), narration: 'Lymph nodes along your neck filter lymph fluid and trap germs draining from your head and throat. They swell and become tender when you have a sore throat.' },
            { structureId: 'bone_marrow', title: t('stem.anatomy.bone_marrow_2', 'Bone Marrow'), narration: 'Deep inside your larger bones is red bone marrow, a factory that produces all your blood cells \u2014 billions of red blood cells, white blood cells, and platelets every hour.' }
          ],
          organs: [
            { structureId: 'lungs', title: t('stem.anatomy.the_lungs', 'The Lungs'), narration: 'Your two lungs fill most of your chest cavity. Inside are about 300 million tiny alveoli where oxygen enters your blood and carbon dioxide leaves.' },
            { structureId: 'liver', title: t('stem.anatomy.the_liver', 'The Liver'), narration: 'The liver performs over 500 functions: making bile to digest fat, filtering toxins, storing sugar as glycogen, and producing essential proteins.' },
            { structureId: 'stomach', title: t('stem.anatomy.the_stomach', 'The Stomach'), narration: 'Your stomach is a muscular J-shaped bag that churns food with acid and digestive enzymes, breaking it into a paste that slowly enters the small intestine.' },
            { structureId: 'kidneys', title: t('stem.anatomy.the_kidneys', 'The Kidneys'), narration: 'Your two kidneys each contain about a million tiny filters called nephrons. Together they filter all your blood about 40 times a day, removing waste and regulating fluid balance.' }
          ],
          integumentary: [
            { structureId: 'epidermis', title: t('stem.anatomy.the_epidermis', 'The Epidermis'), narration: 'The epidermis is the outermost layer of your skin \u2014 a waterproof barrier you can see and touch. It renews itself completely about every 28 days.' },
            { structureId: 'dermis', title: t('stem.anatomy.the_dermis', 'The Dermis'), narration: 'Just below the epidermis is the dermis, packed with collagen fibers, blood vessels, nerves, sweat glands, and hair follicles. It gives skin its strength and elasticity.' },
            { structureId: 'hair_follicle', title: t('stem.anatomy.hair_follicles_2', 'Hair Follicles'), narration: 'Each hair grows from a follicle deep in your skin. A tiny muscle attached to the follicle causes hair to stand up when you are cold or scared, creating goosebumps.' },
            { structureId: 'melanocytes', title: t('stem.anatomy.melanocytes', 'Melanocytes'), narration: 'Melanocytes produce melanin, the pigment that gives skin and hair their color. UV light triggers them to make more melanin to protect your DNA \u2014 that is what a tan actually is.' }
          ],
          respiratory: [
            { structureId: 'nasal_cavity', title: t('stem.anatomy.nasal_cavity', 'Nasal Cavity'), narration: 'Your nose warms, humidifies, and filters the air before it reaches your lungs. Inside, turbinate bones create turbulence that maximizes contact with mucous membranes.' },
            { structureId: 'larynx', title: t('stem.anatomy.the_larynx', 'The Larynx'), narration: 'The larynx, or voice box, sits at the top of your trachea. Two vocal cords inside vibrate as air passes over them to create sound.' },
            { structureId: 'bronchi', title: t('stem.anatomy.the_bronchial_tree', 'The Bronchial Tree'), narration: 'The trachea splits into bronchi, which branch again and again like a tree into smaller tubes. By the time air reaches the alveoli, it has traveled through about 23 generations of branching.' },
            { structureId: 'alveoli', title: t('stem.anatomy.the_alveoli', 'The Alveoli'), narration: 'The alveoli are 300 million tiny balloon-like sacs at the end of the bronchial tree. Oxygen crosses into the blood and carbon dioxide crosses out in less than a second.' }
          ],
          endocrine: [
            { structureId: 'pituitary', title: t('stem.anatomy.the_pituitary_gland', 'The Pituitary Gland'), narration: 'The pituitary is a pea-sized gland at the base of your brain. It is called the master gland because it sends hormonal commands to your thyroid, adrenals, gonads, and other glands.' },
            { structureId: 'thyroid', title: t('stem.anatomy.the_thyroid', 'The Thyroid'), narration: 'The thyroid gland wraps around the front of your trachea in a butterfly shape. It produces hormones that control your metabolic rate \u2014 how fast your cells burn energy.' },
            { structureId: 'adrenal_endo', title: t('stem.anatomy.adrenal_cortex', 'Adrenal Cortex'), narration: 'Sitting on top of each kidney, the adrenal glands produce steroid hormones. The cortex makes cortisol for stress and aldosterone for salt balance. The medulla releases adrenaline in emergencies.' },
            { structureId: 'islets', title: t('stem.anatomy.islets_of_langerhans_2', 'Islets of Langerhans'), narration: 'Scattered in the pancreas, beta cells make insulin to lower blood sugar and alpha cells make glucagon to raise it. Together they keep your blood glucose in a narrow safe range.' }
          ],
          reproductive: [
            { structureId: 'testes_repro', title: t('stem.anatomy.the_testes', 'The Testes'), narration: 'The testes are located in the scrotum where the temperature is 2 to 3 degrees cooler than the body, essential for sperm production. Each day they produce about 200 million sperm.' },
            { structureId: 'uterus', title: t('stem.anatomy.the_uterus', 'The Uterus'), narration: 'The uterus is a muscular pear-shaped organ where a fertilized egg implants and grows into a baby. Its inner lining thickens each month and sheds during menstruation if no egg implants.' },
            { structureId: 'ovaries_repro', title: t('stem.anatomy.the_ovaries', 'The Ovaries'), narration: 'The two ovaries contain all the eggs a female will ever have. Each month, one egg matures and is released at ovulation, ready to be fertilized in the fallopian tube.' },
            { structureId: 'placenta', title: t('stem.anatomy.the_placenta', 'The Placenta'), narration: 'The placenta develops during pregnancy, connecting mother and baby without their blood mixing. It transfers oxygen and nutrients to the baby while removing carbon dioxide and waste.' }
          ]
        };

        // ══════════════════════════════════════
        // CLINICAL CASES DATA
        // ══════════════════════════════════════
        var CLINICAL_CASES = [
          { id: 'case_1', title: t('stem.anatomy.the_runner_s_knee', 'The Runner\'s Knee'), system: 'skeletal', presentation: 'A 16-year-old cross-country runner has dull aching pain around the front of the knee that worsens going down stairs and after long runs. No swelling or locking. Pain improves with rest.', question: t('stem.anatomy.which_structure_is_most_likely_affecte', 'Which structure is most likely affected?'), answer: t('stem.anatomy.patella_patellofemoral_joint', 'Patella / patellofemoral joint'), explanation: t('stem.anatomy.patellofemoral_pain_syndrome_occurs_wh', 'Patellofemoral pain syndrome occurs when the patella does not track smoothly in its groove on the femur. Repeated stress from running causes cartilage irritation. Treatment includes quad strengthening, hip stabilization, and activity modification.'), difficulty: 'intermediate' },
          { id: 'case_2', title: t('stem.anatomy.the_shoulder_that_won_t_lift', 'The Shoulder That Won\'t Lift'), system: 'muscular', presentation: 'A 45-year-old painter has gradual onset right shoulder pain for 3 months. He cannot lift his arm above 90 degrees without pain. He wakes up at night with shoulder pain and a grinding sensation.', question: t('stem.anatomy.which_structure_is_most_likely_torn', 'Which structure is most likely torn?'), answer: t('stem.anatomy.supraspinatus_tendon_rotator_cuff', 'Supraspinatus tendon (rotator cuff)'), explanation: t('stem.anatomy.the_supraspinatus_is_the_most_commonly', 'The supraspinatus is the most commonly torn rotator cuff muscle. It runs under the acromion where it is susceptible to impingement and tears. Overhead work like painting increases this risk significantly.'), difficulty: 'intermediate' },
          { id: 'case_3', title: t('stem.anatomy.racing_heart_after_exercise', 'Racing Heart After Exercise'), system: 'circulatory', presentation: 'A 14-year-old athlete notices her heart racing and skipping beats for a few seconds after sprinting. She feels fine otherwise, with no chest pain or fainting. Physical exam is normal.', question: t('stem.anatomy.which_structure_controls_the_normal_he', 'Which structure controls the normal heart rhythm?'), answer: t('stem.anatomy.sinoatrial_sa_node', 'Sinoatrial (SA) node'), explanation: t('stem.anatomy.the_sa_node_in_the_right_atrium_is_the', 'The SA node in the right atrium is the heart\'s natural pacemaker. During intense exercise, adrenaline can cause benign palpitations as the heart rate adjusts. Persistent arrhythmias should be evaluated to rule out structural heart disease.'), difficulty: 'beginner' },
          { id: 'case_4', title: t('stem.anatomy.the_numb_hand', 'The Numb Hand'), system: 'nervous', presentation: 'A 35-year-old office worker has progressive tingling and numbness in her thumb, index, and middle fingers for 2 months, worse at night. She shakes her hand to relieve it. She types 8 hours a day.', question: t('stem.anatomy.which_nerve_is_being_compressed', 'Which nerve is being compressed?'), answer: t('stem.anatomy.median_nerve_carpal_tunnel_syndrome', 'Median nerve (carpal tunnel syndrome)'), explanation: t('stem.anatomy.carpal_tunnel_syndrome_is_compression_', 'Carpal tunnel syndrome is compression of the median nerve under the flexor retinaculum at the wrist. The median nerve supplies sensation to the thumb and first 3.5 fingers. Repetitive wrist use is a major risk factor.'), difficulty: 'intermediate' },
          { id: 'case_5', title: t('stem.anatomy.the_swollen_neck_node', 'The Swollen Neck Node'), system: 'lymphatic', presentation: 'A 17-year-old presents with a 3 cm painless, rubbery lymph node in the left neck for 6 weeks. He has had night sweats and lost 5 kg without trying. No fever or sore throat.', question: t('stem.anatomy.what_diagnosis_must_be_urgently_ruled_', 'What diagnosis must be urgently ruled out?'), answer: t('stem.anatomy.lymphoma_hodgkin_lymphoma', 'Lymphoma (Hodgkin lymphoma)'), explanation: t('stem.anatomy.painless_lymphadenopathy_with_b_sympto', 'Painless lymphadenopathy with B-symptoms (night sweats, weight loss, fever) is the classic presentation of Hodgkin lymphoma in young adults. Biopsy showing Reed-Sternberg cells confirms the diagnosis.'), difficulty: 'advanced' },
          { id: 'case_6', title: t('stem.anatomy.the_diabetic_emergency', 'The Diabetic Emergency'), system: 'endocrine', presentation: 'A 16-year-old with known Type 1 diabetes is found confused at home, breathing deeply and rapidly. His breath smells fruity. Blood glucose is 480 mg/dL. He missed his insulin doses for 2 days.', question: t('stem.anatomy.which_cells_failed_and_what_is_the_eme', 'Which cells failed, and what is the emergency condition?'), answer: t('stem.anatomy.beta_cells_of_islets_of_langerhans_dia', 'Beta cells of the pancreatic islets; diabetic ketoacidosis (DKA)'), explanation: t('stem.anatomy.without_insulin_from_beta_cells_glucos', 'With too little insulin, many tissues cannot use glucose normally and the liver increases ketone production from fat. Ketones accumulate and acidify the blood; deep Kussmaul breathing helps lower carbon dioxide. DKA is a medical emergency treated with fluids, insulin, electrolyte monitoring, and correction of the trigger.'), difficulty: 'advanced' },
          { id: 'case_7', title: t('stem.anatomy.the_broken_collarbone', 'The Broken Collarbone'), system: 'skeletal', presentation: 'An 11-year-old falls off his bicycle and lands on his outstretched right hand. He has immediate pain and deformity at the middle third of his right clavicle. He holds his arm close to his side.', question: t('stem.anatomy.why_is_the_middle_third_of_the_clavicl', 'Why is the middle third of the clavicle the most common fracture site?'), answer: t('stem.anatomy.the_middle_third_is_thinnest_and_has_n', 'The middle third is thinnest and has no muscular reinforcement'), explanation: t('stem.anatomy.the_clavicle_is_the_most_frequently_fr', 'The clavicle is the most frequently fractured bone. Its middle third is thinnest and lacks muscular protection. Force from a fall on an outstretched hand concentrates at this weak point. Most heal with sling immobilization.'), difficulty: 'beginner' },
          { id: 'case_8', title: t('stem.anatomy.breathless_at_high_altitude', 'Breathless at High Altitude'), system: 'respiratory', presentation: 'A healthy 15-year-old hikes to 12,000 feet and develops headache, shortness of breath at rest, and a dry cough. Her oxygen saturation is 84%. At sea level it was 99%.', question: t('stem.anatomy.why_does_altitude_cause_these_symptoms', 'Why does altitude cause these symptoms, and which structure is most stressed?'), answer: t('stem.anatomy.the_alveoli_and_respiratory_muscles_re', 'The alveoli and respiratory muscles; reduced atmospheric oxygen causes hypoxia'), explanation: t('stem.anatomy.at_high_altitude_atmospheric_pressure_', 'At high altitude, atmospheric pressure drops, reducing the partial pressure of oxygen. Less oxygen crosses the alveolar membrane. The body compensates by breathing faster and deeper, increasing respiratory muscle work.'), difficulty: 'intermediate' }
        ];

        // ══════════════════════════════════════
        // MNEMONICS — Memory aids for anatomy study
        // ══════════════════════════════════════
        var MNEMONICS = {
          skeletal: [
            { id: 'mn_carpals', title: t('stem.anatomy.carpal_bones_proximal_to_distal', 'Carpal Bones (Proximal to Distal)'), phrase: 'Some Lovers Try Positions That They Can\'t Handle', meaning: 'Scaphoid, Lunate, Triquetrum, Pisiform, Trapezium, Trapezoid, Capitate, Hamate', structures: ['carpals'] },
            { id: 'mn_cranial', title: t('stem.anatomy.cranial_bones', 'Cranial Bones'), phrase: 'Old People From Texas Eat Spiders', meaning: 'Occipital, Parietal, Frontal, Temporal, Ethmoid, Sphenoid', structures: ['skull'] },
            { id: 'mn_vertebrae', title: t('stem.anatomy.vertebral_count', 'Vertebral Count'), phrase: 'Breakfast at 7, Lunch at 12, Dinner at 5', meaning: '7 cervical, 12 thoracic, 5 lumbar vertebrae', structures: ['vertebral'] }
          ],
          muscular: [
            { id: 'mn_rotator', title: t('stem.anatomy.rotator_cuff_muscles', 'Rotator Cuff Muscles'), phrase: 'SITS', meaning: 'Supraspinatus, Infraspinatus, Teres minor, Subscapularis', structures: ['rotator_cuff'] },
            { id: 'mn_erector', title: t('stem.anatomy.erector_spinae_lateral_to_medial', 'Erector Spinae (Lateral to Medial)'), phrase: 'I Love Standing', meaning: 'Iliocostalis, Longissimus, Spinalis', structures: ['trapezius'] },
            { id: 'mn_quad', title: t('stem.anatomy.quadriceps_muscles', 'Quadriceps Muscles'), phrase: 'Real Vast Legs, Very Important Muscles', meaning: 'Rectus femoris, Vastus lateralis, Vastus intermedius, Vastus medialis', structures: ['quads'] }
          ],
          circulatory: [
            { id: 'mn_heartvalves', title: t('stem.anatomy.heart_valve_order_flow', 'Heart Valve Order (Flow)'), phrase: 'Try Pulling My Aorta', meaning: 'Tricuspid, Pulmonary, Mitral, Aortic (blood flow path)', structures: ['heart'] },
            { id: 'mn_aorta', title: t('stem.anatomy.aortic_arch_branches', 'Aortic Arch Branches'), phrase: 'BLC (Big Lefty Club)', meaning: 'Brachiocephalic, Left common carotid, Left subclavian', structures: ['aorta'] }
          ],
          nervous: [
            { id: 'mn_cranialn', title: t('stem.anatomy.12_cranial_nerves', '12 Cranial Nerves'), phrase: 'Oh Oh Oh To Touch And Feel Very Green Vegetables AH!', meaning: 'Olfactory, Optic, Oculomotor, Trochlear, Trigeminal, Abducens, Facial, Vestibulocochlear, Glossopharyngeal, Vagus, Accessory, Hypoglossal', structures: ['cranial_n', 'vagus'] },
            { id: 'mn_brachial', title: t('stem.anatomy.brachial_plexus_2', 'Brachial Plexus'), phrase: 'Real Texans Drink Cold Beer', meaning: 'Roots, Trunks, Divisions, Cords, Branches', structures: ['brachial_plexus'] }
          ],
          lymphatic: [
            { id: 'mn_immune', title: t('stem.anatomy.immune_cell_types', 'Immune Cell Types'), phrase: 'Never Let Monkeys Eat Bananas', meaning: 'Neutrophils, Lymphocytes, Monocytes, Eosinophils, Basophils (in order of abundance)', structures: ['bone_marrow'] }
          ],
          organs: [
            { id: 'mn_liver', title: t('stem.anatomy.liver_segments', 'Liver Segments'), phrase: 'The liver has 8 Couinaud segments supplied by portal triads', meaning: 'Each segment has its own portal pedicle (portal vein, hepatic artery, bile duct) enabling surgical resection', structures: ['liver'] },
            { id: 'mn_intestine', title: t('stem.anatomy.layers_of_gi_wall', 'Layers of GI Wall'), phrase: 'Mary\'s Silly Monkey Made Smelly Sounds', meaning: 'Mucosa, Submucosa, Muscularis (circular + longitudinal), Serosa', structures: ['sm_intestine', 'stomach'] }
          ],
          integumentary: [
            { id: 'mn_skin', title: t('stem.anatomy.epidermis_layers_superficial_to_deep', 'Epidermis Layers (Superficial to Deep)'), phrase: 'Come, Let\'s Get Sun Burned', meaning: 'Corneum (stratum), Lucidum, Granulosum, Spinosum, Basale', structures: ['epidermis'] }
          ],
          respiratory: [
            { id: 'mn_resp', title: t('stem.anatomy.structures_air_passes_through', 'Structures Air Passes Through'), phrase: 'Nice People Like Talking But All Are Late', meaning: 'Nose, Pharynx, Larynx, Trachea, Bronchi, Alveoli', structures: ['nasal_cavity', 'larynx', 'bronchi', 'alveoli'] }
          ],
          endocrine: [
            { id: 'mn_pituitary', title: t('stem.anatomy.anterior_pituitary_hormones', 'Anterior Pituitary Hormones'), phrase: 'FLAT PeG', meaning: 'FSH, LH, ACTH, TSH, Prolactin, GH (Growth Hormone)', structures: ['pituitary'] }
          ],
          reproductive: [
            { id: 'mn_repro', title: t('stem.anatomy.stages_of_meiosis_i', 'Stages of Meiosis I'), phrase: 'PMAT with crossing over', meaning: 'Prophase I (crossing over), Metaphase I, Anaphase I, Telophase I', structures: ['testes_repro', 'ovaries_repro'] }
          ]
        };

        // ══════════════════════════════════════
        // PATHWAYS — Physiological process tracing
        // ══════════════════════════════════════
        var PATHWAYS = [
          {
            id: 'path_blood', title: t('stem.anatomy.path_of_blood', 'Path of Blood'), icon: '\u2764\uFE0F', color: '#ef4444',
            desc: t('stem.anatomy.follow_a_red_blood_cell_through_the_en', 'Follow a red blood cell through the entire circulatory system.'),
            steps: [
              { label: t('stem.anatomy.right_atrium', 'Right Atrium'), detail: t('stem.anatomy.deoxygenated_blood_from_the_body_enter', 'Deoxygenated blood from the body enters the right atrium via the superior and inferior vena cava.'), structure: 'sup_vena' },
              { label: t('stem.anatomy.right_ventricle', 'Right Ventricle'), detail: t('stem.anatomy.blood_passes_through_the_tricuspid_val', 'Blood passes through the tricuspid valve into the right ventricle, which pumps it toward the lungs.'), structure: 'heart' },
              { label: t('stem.anatomy.pulmonary_arteries_2', 'Pulmonary Arteries'), detail: t('stem.anatomy.the_right_ventricle_ejects_blood_throu', 'The right ventricle ejects blood through the pulmonary valve into the pulmonary arteries toward both lungs.'), structure: 'pulm_art' },
              { label: t('stem.anatomy.lung_capillaries', 'Lung Capillaries'), detail: t('stem.anatomy.in_the_alveolar_capillaries_co2_is_rel', 'In the alveolar capillaries, CO2 is released and O2 is picked up through the thin alveolar membrane.'), structure: 'alveoli' },
              { label: t('stem.anatomy.pulmonary_veins', 'Pulmonary Veins'), detail: t('stem.anatomy.freshly_oxygenated_blood_returns_to_th', 'Freshly oxygenated blood returns to the heart via the four pulmonary veins.'), structure: 'lungs' },
              { label: t('stem.anatomy.left_atrium', 'Left Atrium'), detail: t('stem.anatomy.the_four_pulmonary_veins_empty_oxygena', 'The four pulmonary veins empty oxygenated blood into the left atrium, which fills and then pushes it through the mitral valve.'), structure: 'heart' },
              { label: t('stem.anatomy.left_ventricle', 'Left Ventricle'), detail: t('stem.anatomy.blood_passes_through_the_mitral_valve_', 'Blood passes through the mitral valve into the muscular left ventricle, the strongest heart chamber.'), structure: 'heart' },
              { label: t('stem.anatomy.aorta_2', 'Aorta'), detail: t('stem.anatomy.the_left_ventricle_powerfully_ejects_b', 'The left ventricle powerfully ejects blood through the aortic valve into the aorta, the body\'s main highway.'), structure: 'aorta' },
              { label: t('stem.anatomy.body_tissues', 'Body Tissues'), detail: t('stem.anatomy.arteries_branch_into_arterioles_and_ca', 'Arteries branch into arterioles and capillaries where O2 and nutrients are delivered and CO2/waste collected.'), structure: 'femoral_a' },
              { label: t('stem.anatomy.venous_return', 'Venous Return'), detail: t('stem.anatomy.deoxygenated_blood_returns_through_ven', 'Deoxygenated blood returns through venules and veins, assisted by muscle pumps and valves, back to the right atrium.'), structure: 'inf_vena' }
            ]
          },
          {
            id: 'path_air', title: t('stem.anatomy.path_of_air', 'Path of Air'), icon: '\uD83D\uDCA8', color: '#3b82f6',
            desc: t('stem.anatomy.trace_the_journey_of_a_breath_of_air_f', 'Trace the journey of a breath of air from nose to alveoli and back.'),
            steps: [
              { label: t('stem.anatomy.nasal_cavity_2', 'Nasal Cavity'), detail: t('stem.anatomy.air_enters_through_the_nostrils_and_is', 'Air enters through the nostrils and is warmed, humidified, and filtered by mucous membranes and turbinates.'), structure: 'nasal_cavity' },
              { label: t('stem.anatomy.pharynx_2', 'Pharynx'), detail: t('stem.anatomy.air_passes_through_the_nasopharynx_and', 'Air passes through the nasopharynx and oropharynx, a shared passage with the digestive tract.'), structure: 'pharynx' },
              { label: t('stem.anatomy.larynx', 'Larynx'), detail: t('stem.anatomy.air_crosses_the_vocal_cords_in_the_voi', 'Air crosses the vocal cords in the voice box. The epiglottis guards against food entering the airway.'), structure: 'larynx' },
              { label: t('stem.anatomy.trachea_2', 'Trachea'), detail: t('stem.anatomy.the_trachea_windpipe_is_reinforced_by_', 'The trachea (windpipe) is reinforced by C-shaped cartilage rings. Cilia move mucus upward to trap debris.'), structure: 'trachea' },
              { label: t('stem.anatomy.bronchi', 'Bronchi'), detail: t('stem.anatomy.the_trachea_splits_into_left_and_right', 'The trachea splits into left and right main bronchi, each entering a lung. They branch into smaller bronchioles.'), structure: 'bronchi' },
              { label: t('stem.anatomy.alveoli_2', 'Alveoli'), detail: t('stem.anatomy.300_million_grape_like_sacs_where_gas_', '300 million grape-like sacs where gas exchange occurs. O2 diffuses into blood; CO2 diffuses out. Surface area equals a tennis court.'), structure: 'alveoli' },
              { label: t('stem.anatomy.exhalation', 'Exhalation'), detail: t('stem.anatomy.the_diaphragm_relaxes_and_rises_reduci', 'The diaphragm relaxes and rises, reducing lung volume. CO2-rich air is pushed out through the same pathway in reverse.'), structure: 'diaphragm_m' }
            ]
          },
          {
            id: 'path_food', title: t('stem.anatomy.path_of_food', 'Path of Food'), icon: '\uD83C\uDF54', color: '#16a34a',
            desc: t('stem.anatomy.follow_a_meal_from_mouth_through_the_e', 'Follow a meal from mouth through the entire digestive system.'),
            steps: [
              { label: t('stem.anatomy.mouth', 'Mouth'), detail: t('stem.anatomy.teeth_mechanically_break_food_down_sal', 'Teeth mechanically break food down. Salivary amylase begins starch digestion. The tongue shapes food into a bolus.'), structure: 'mandible' },
              { label: t('stem.anatomy.pharynx_esophagus', 'Pharynx & Esophagus'), detail: t('stem.anatomy.swallowing_pushes_the_bolus_past_the_e', 'Swallowing pushes the bolus past the epiglottis. Peristaltic waves move it down the 25cm esophagus in about 8 seconds.'), structure: 'pharynx' },
              { label: t('stem.anatomy.stomach_2', 'Stomach'), detail: t('stem.anatomy.gastric_acid_ph_1_5_3_5_and_pepsin_bre', 'Gastric acid (pH 1.5-3.5) and pepsin break down proteins. Churning produces chyme over 2-4 hours.'), structure: 'stomach' },
              { label: t('stem.anatomy.duodenum', 'Duodenum'), detail: t('stem.anatomy.the_first_25cm_of_the_small_intestine_', 'The first 25cm of the small intestine receives bile from the liver/gallbladder and enzymes from the pancreas.'), structure: 'sm_intestine' },
              { label: t('stem.anatomy.jejunum_ileum', 'Jejunum & Ileum'), detail: t('stem.anatomy.most_nutrient_absorption_occurs_here_v', 'Most nutrient absorption occurs here via villi and microvilli, increasing surface area 600-fold. 6-7 meters long.'), structure: 'sm_intestine' },
              { label: t('stem.anatomy.large_intestine_2', 'Large Intestine'), detail: t('stem.anatomy.water_and_electrolytes_are_reabsorbed_', 'Water and electrolytes are reabsorbed. Gut bacteria ferment remaining fiber, producing vitamins K and B12.'), structure: 'lg_intestine' },
              { label: t('stem.anatomy.rectum_excretion', 'Rectum & Excretion'), detail: t('stem.anatomy.waste_is_compacted_and_stored_in_the_r', 'Waste is compacted and stored in the rectum until defecation. The entire journey takes 24-72 hours.'), structure: 'bladder' }
            ]
          },
          {
            id: 'path_nerve', title: t('stem.anatomy.path_of_a_nerve_signal', 'Path of a Nerve Signal'), icon: '\u26A1', color: '#eab308',
            desc: t('stem.anatomy.trace_a_reflex_arc_from_stimulus_to_re', 'Trace a reflex arc from stimulus to response.'),
            steps: [
              { label: t('stem.anatomy.receptor', 'Receptor'), detail: t('stem.anatomy.a_sensory_receptor_in_the_skin_detects', 'A sensory receptor in the skin detects a painful stimulus (like touching a hot surface) and generates an electrical signal.'), structure: 'epidermis' },
              { label: t('stem.anatomy.sensory_neuron', 'Sensory Neuron'), detail: t('stem.anatomy.the_signal_travels_along_a_sensory_aff', 'The signal travels along a sensory (afferent) neuron toward the spinal cord at up to 120 m/s via saltatory conduction.'), structure: 'sciatic' },
              { label: t('stem.anatomy.spinal_cord_2', 'Spinal Cord'), detail: t('stem.anatomy.in_the_dorsal_horn_the_sensory_neuron_', 'In the dorsal horn, the sensory neuron synapses with an interneuron. For reflexes, the signal does not need to reach the brain.'), structure: 'spinal_cord' },
              { label: t('stem.anatomy.interneuron', 'Interneuron'), detail: t('stem.anatomy.the_interneuron_in_the_spinal_gray_mat', 'The interneuron in the spinal gray matter integrates the signal and relays it to a motor neuron.'), structure: 'spinal_cord' },
              { label: t('stem.anatomy.motor_neuron', 'Motor Neuron'), detail: t('stem.anatomy.the_motor_efferent_neuron_carries_the_', 'The motor (efferent) neuron carries the command signal from the ventral horn down to the target muscle.'), structure: 'femoral_n' },
              { label: t('stem.anatomy.effector_muscle', 'Effector (Muscle)'), detail: t('stem.anatomy.acetylcholine_released_at_the_neuromus', 'Acetylcholine released at the neuromuscular junction causes muscle contraction. You pull your hand away before feeling pain.'), structure: 'biceps' },
              { label: t('stem.anatomy.brain_awareness', 'Brain Awareness'), detail: t('stem.anatomy.meanwhile_a_copy_of_the_signal_ascends', 'Meanwhile, a copy of the signal ascends to the somatosensory cortex. You consciously feel pain about 0.5 seconds after the reflex.'), structure: 'brain' }
            ]
          }
        ];

        // ══════════════════════════════════════
        // SIMPLE DESCRIPTIONS — Grade-band differentiated content
        // ══════════════════════════════════════
        var SIMPLE_DESC = {
          skull: { k2: 'Your skull is like a helmet that protects your brain!', g35: 'The skull is made of 22 bones fused together. It protects the brain and gives your face its shape.' },
          heart: { k2: 'Your heart is a pump that pushes blood all around your body!', g35: 'The heart has 4 rooms (chambers) and beats about 100,000 times every day to move blood through your body.' },
          brain: { k2: 'Your brain is the boss of your whole body! It helps you think, feel, and move.', g35: 'The brain has billions of tiny cells called neurons that send messages to control everything you do.' },
          lungs: { k2: 'Your lungs help you breathe! Air goes in and out like balloons.', g35: 'Your two lungs take oxygen from the air you breathe in and get rid of carbon dioxide when you breathe out.' },
          femur: { k2: 'The femur is your thigh bone. It is the biggest bone in your body!', g35: 'The femur (thigh bone) is the longest and strongest bone. It helps you walk, run, and jump.' },
          stomach: { k2: 'Your stomach is like a mixer that squishes food into mush!', g35: 'The stomach uses acid and muscles to break food into a paste. Food stays there for 2-4 hours.' },
          ribs: { k2: 'Your ribs are like a cage that protects your heart and lungs!', g35: 'You have 12 pairs of ribs that form a protective cage around your chest organs. They move when you breathe.' },
          biceps: { k2: 'Your biceps is the muscle that helps you bend your arm!', g35: 'The biceps brachii bends your elbow and turns your palm up. You use it every time you pick something up.' },
          kidneys: { k2: 'Your kidneys are like filters that clean your blood!', g35: 'Your two kidneys filter waste from your blood and make urine. They process all your blood about 40 times a day.' },
          liver: { k2: 'Your liver is a helper that cleans your blood and helps digest food!', g35: 'The liver does over 500 jobs including making bile, cleaning toxins from blood, and storing energy.' },
          epidermis: { k2: 'Your skin keeps germs out and keeps water in. It is your biggest organ!', g35: 'The epidermis is the outer layer of skin. New skin cells grow at the bottom and push old ones to the surface.' },
          spinal_cord: { k2: 'Your spinal cord is like a message highway inside your backbone!', g35: 'The spinal cord carries messages between your brain and body. It runs inside your vertebral column for protection.' },
          diaphragm_m: { k2: 'Your diaphragm is the muscle that helps you breathe in and out!', g35: 'The diaphragm is a dome-shaped muscle below your lungs. When it tightens, your lungs expand and air rushes in.' },
          aorta: { k2: 'The aorta is the biggest tube that carries blood from your heart!', g35: 'The aorta is your body\'s largest artery. It carries oxygen-rich blood from the heart to the rest of your body.' }
        };

        // ══════════════════════════════════════
        // PRONUNCIATION GUIDE — Phonetic spelling for complex terms
        // ══════════════════════════════════════
        var PRONUNCIATION = {
          skull: null, mandible: 'MAN-dih-bul', clavicle: 'KLAV-ih-kul', sternum: 'STUR-num',
          scapula: 'SKAP-yoo-lah', humerus: 'HYOO-meh-rus', radius: 'RAY-dee-us', ulna: 'UL-nah',
          carpals: 'KAR-pulz', vertebral: 'VER-teh-brul', pelvis: 'PEL-vis', femur: 'FEE-mur',
          patella: 'pah-TEL-ah', tibia: 'TIB-ee-ah', fibula: 'FIB-yoo-lah', sacrum: 'SAY-krum',
          tarsals: 'TAR-sulz', metacarpals: 'met-ah-KAR-pulz', metatarsals: 'met-ah-TAR-sulz',
          scaphoid_bone: 'SKAF-oyd', pectoralis: 'pek-toh-RAL-is', deltoid: 'DEL-toyd',
          biceps: 'BY-seps', triceps: 'TRY-seps', rectus_ab: 'REK-tus ab-DOM-ih-nis',
          obliques: 'oh-BLEEKS', trapezius: 'trah-PEE-zee-us', lats: 'lah-TIS-ih-mus DOR-sy',
          glutes: 'GLOO-tee-us MAX-ih-mus', quads: 'KWOD-rih-seps', hamstrings: 'HAM-strings',
          gastrocnemius: 'gas-trok-NEE-mee-us', sartorius: 'sar-TOR-ee-us', soleus: 'SO-lee-us',
          tibialis: 'tib-ee-AL-is', diaphragm_m: 'DY-ah-fram', iliopsoas: 'il-ee-oh-SO-as',
          intercostals: 'in-ter-KOS-tulz', rotator_cuff: 'ROH-tay-ter kuf',
          heart: null, aorta: 'ay-OR-tah', coronary: 'KOR-oh-nair-ee', carotid: 'kah-ROT-id',
          jugular: 'JUG-yoo-lar', femoral_a: 'FEM-or-al', brachial: 'BRAY-kee-al',
          saphenous: 'SAF-eh-nus', portal: 'POR-tal', pulm_art: 'PUL-moh-nair-ee',
          brain: null, cerebral_cortex: 'seh-REE-bral KOR-teks', cerebellum: 'sair-eh-BEL-um',
          brainstem: null, hippocampus: 'hip-oh-KAM-pus', amygdala: 'ah-MIG-dah-lah',
          thalamus: 'THAL-ah-mus', hypothalamus: 'hy-poh-THAL-ah-mus',
          corpus_callosum: 'KOR-pus kah-LO-sum', basal_ganglia: 'BAY-zal GANG-lee-ah',
          vagus: 'VAY-gus', sciatic: 'sy-AT-ik', median: 'MEE-dee-an',
          brachial_plexus: 'BRAY-kee-al PLEK-sus', cranial_n: 'KRAY-nee-al',
          sympathetic: 'sim-pah-THET-ik', spinal_cord: null,
          thymus: 'THY-mus', spleen: null, thoracic_duct: 'thoh-RAS-ik',
          cervical_ln: 'SUR-vih-kal', axillary_ln: 'AK-sih-lair-ee', inguinal_ln: 'ING-gwih-nal',
          epidermis: 'ep-ih-DUR-mis', dermis: 'DUR-mis', hypodermis: 'hy-poh-DUR-mis',
          melanocytes: 'MEL-an-oh-syts', sebaceous: 'seh-BAY-shus',
          larynx: 'LAIR-inks', pharynx: 'FAIR-inks', trachea: 'TRAY-kee-ah',
          bronchi: 'BRONG-ky', alveoli: 'al-VEE-oh-ly', pleura: 'PLOOR-ah',
          pituitary: 'pih-TOO-ih-tair-ee', thyroid: 'THY-royd', parathyroid: 'pair-ah-THY-royd',
          adrenal_endo: 'ah-DREE-nal', islets: 'EYE-lets of LANG-er-hanz',
          pineal: 'PIN-ee-al', hypothal_endo: 'hy-poh-THAL-ah-mus',
          testes_repro: 'TES-teez', epididymis: 'ep-ih-DID-ih-mis', prostate: 'PROS-tayt',
          uterus: 'YOO-teh-rus', ovaries_repro: 'OH-vah-reez', fallopian: 'fah-LO-pee-an',
          placenta: 'plah-SEN-tah', mammary: 'MAM-ah-ree'
        };

        // ══════════════════════════════════════
        // Regional deep-dive atlas. Additional organs can reuse this focused-diagram contract.
        var REGIONAL_ATLASES = {
          heart: {
            title: t('stem.anatomy.heart_deep_dive', 'Heart deep dive'),
            subtitle: t('stem.anatomy.trace_double_circulation', 'Trace double circulation through chambers, valves, lungs, and the body.'),
            steps: [
              { id: 'venous_return', label: '1. Venous return', short: 'Body to right atrium', detail: 'Oxygen-poor blood returns from the body through the superior and inferior venae cavae and enters the right atrium.', color: '#2563eb' },
              { id: 'pulmonary_outflow', label: '2. To the lungs', short: 'Right ventricle to lungs', detail: 'Blood crosses the tricuspid valve into the right ventricle, then passes through the pulmonary valve and pulmonary arteries to the lungs.', color: '#2563eb' },
              { id: 'pulmonary_return', label: '3. Oxygenated return', short: 'Lungs to left atrium', detail: 'After gas exchange, oxygen-rich blood returns through the pulmonary veins and enters the left atrium.', color: '#dc2626' },
              { id: 'systemic_outflow', label: '4. To the body', short: 'Left ventricle to aorta', detail: 'Blood crosses the mitral valve into the left ventricle, then passes through the aortic valve and aorta to supply the body.', color: '#dc2626' }
            ]
          }
          , kidneys: {
            title: t('stem.anatomy.kidney_deep_dive', 'Kidney and nephron deep dive'),
            subtitle: t('stem.anatomy.trace_nephron_processing', 'Follow a drop of plasma as the nephron filters blood, recovers useful material, secretes wastes, and forms urine.'),
            steps: [
              { id: 'glomerular_filtration', label: '1. Filtration', short: 'Blood to Bowman capsule', detail: 'Blood pressure pushes water and small solutes across the glomerular filtration barrier into Bowman capsule. Blood cells and most proteins remain in the circulation.', color: '#7c3aed' },
              { id: 'tubular_reabsorption', label: '2. Reabsorption', short: 'Tubule to blood', detail: 'The proximal tubule returns most filtered water and sodium, plus nearly all glucose and amino acids, to nearby peritubular capillaries.', color: '#059669' },
              { id: 'tubular_secretion', label: '3. Secretion', short: 'Blood to tubule', detail: 'Tubule cells move selected ions, medications, and metabolic wastes from the capillary blood into the tubular fluid, helping regulate pH and composition.', color: '#d97706' },
              { id: 'urine_concentration', label: '4. Urine formation', short: 'Collecting duct to ureter', detail: 'The loop of Henle builds a medullary concentration gradient. The distal tubule and collecting duct make final hormone-guided adjustments before urine enters the renal pelvis and ureter.', color: '#0284c7' }
            ]
          }
          , alveoli: {
            title: t('stem.anatomy.alveolus_deep_dive', 'Alveolus and gas-exchange deep dive'),
            subtitle: t('stem.anatomy.trace_alveolar_exchange', 'Trace ventilation, diffusion across the thin air-blood barrier, and capillary transport.'),
            steps: [
              { id: 'alveolar_ventilation', label: '1. Ventilation', short: 'Fresh air enters alveolus', detail: 'Inhalation refreshes alveolar air. Oxygen partial pressure becomes higher in the alveolus than in the arriving pulmonary capillary blood.', color: '#0ea5e9' },
              { id: 'oxygen_diffusion', label: '2. Oxygen diffusion', short: 'Alveolus to blood', detail: 'Oxygen diffuses down its partial-pressure gradient across the type I alveolar epithelium, thin interstitial layer, and capillary endothelium, then binds to hemoglobin.', color: '#dc2626' },
              { id: 'carbon_dioxide_diffusion', label: '3. Carbon dioxide', short: 'Blood to alveolus', detail: 'Carbon dioxide diffuses in the opposite direction, from arriving venous blood across the air-blood barrier into the alveolar air.', color: '#2563eb' },
              { id: 'gas_transport', label: '4. Transport onward', short: 'Blood leaves; gas exhales', detail: 'Oxygenated blood continues toward the pulmonary veins and left heart. Carbon dioxide is removed from the alveolus during exhalation; efficient exchange requires matched ventilation and perfusion.', color: '#7c3aed' }
            ]
          }
          , patella: {
            title: t('stem.anatomy.knee_deep_dive', 'Knee joint and movement deep dive'),
            subtitle: t('stem.anatomy.trace_knee_mechanics', 'Explore the lateral knee cutaway, movement forces, and structures that stabilize the joint.'),
            steps: [
              { id: 'knee_architecture', label: '1. Joint architecture', short: 'Bones, cartilage, menisci', detail: 'The femur meets the tibia across articular cartilage and two menisci that improve fit, distribute load, and absorb shock. The patella glides in the femoral trochlea.', color: '#64748b' },
              { id: 'knee_extension', label: '2. Extension', short: 'Quadriceps straightens knee', detail: 'Quadriceps force travels through the quadriceps tendon, patella, and patellar tendon to the tibial tuberosity. The patella increases the extensor lever arm.', color: '#dc2626' },
              { id: 'knee_flexion', label: '3. Flexion', short: 'Hamstrings bend knee', detail: 'Hamstrings pull the tibia posteriorly to flex the knee. Joint surfaces roll and glide while the cruciate ligaments guide motion.', color: '#7c3aed' },
              { id: 'knee_stability', label: '4. Stability', short: 'Ligaments limit translation', detail: 'The ACL limits anterior tibial translation and rotation; the PCL limits posterior translation. Collateral ligaments resist side-to-side stress, while menisci share compressive load.', color: '#059669' }
            ]
          }
          , biceps: {
            title: t('stem.anatomy.neuromuscular_deep_dive', 'Neuromuscular junction and contraction deep dive'),
            subtitle: t('stem.anatomy.trace_muscle_activation', 'Follow a motor-neuron signal from the axon terminal to calcium release and sarcomere shortening.'),
            steps: [
              { id: 'motor_terminal', label: '1. Nerve signal', short: 'Action potential reaches terminal', detail: 'A motor-neuron action potential reaches the axon terminal and opens voltage-gated calcium channels. Calcium entry triggers synaptic vesicles to fuse with the membrane.', color: '#7c3aed' },
              { id: 'end_plate', label: '2. Motor end plate', short: 'Acetylcholine activates fiber', detail: 'Acetylcholine crosses the synaptic cleft and binds nicotinic receptors on the motor end plate. Sodium entry produces an end-plate potential that initiates a muscle action potential.', color: '#d97706' },
              { id: 'calcium_release', label: '3. Calcium release', short: 'T-tubule signal reaches SR', detail: 'The action potential travels along the sarcolemma and down T-tubules. Voltage sensors activate ryanodine receptors in the sarcoplasmic reticulum, releasing calcium that binds troponin.', color: '#0284c7' },
              { id: 'cross_bridge_cycle', label: '4. Sarcomere shortens', short: 'Actin slides past myosin', detail: 'Calcium moves tropomyosin away from actin binding sites. ATP-powered myosin cross-bridge cycles pull thin filaments toward the sarcomere center; calcium reuptake and acetylcholine breakdown allow relaxation.', color: '#dc2626' }
            ]
          }
        };

        // DERIVED STATE
        // ══════════════════════════════════════

        var sysKey = SYSTEMS[d.system] ? d.system : 'skeletal';
        var sys = SYSTEMS[sysKey];
        var view = d.view === 'posterior' ? 'posterior' : 'anterior';
        var bodyView3d = d._bodyView3d === true;
        var searchValue = typeof d.search === 'string' ? d.search.slice(0, 200) : '';
        var searchTerm = searchValue.trim().toLowerCase();
        var lastSearchFind = typeof d._lastSearchFind === 'string' ? d._lastSearchFind : null;
        var rawComplexity = Number(d.complexity);
        var complexity = [1, 2, 3].indexOf(rawComplexity) !== -1 ? rawComplexity : 3;

        // ── Layer Transparency System ──
        var LAYER_DEFS = [
          { id: 'skin', icon: '\uD83E\uDDB4', name: t('stem.anatomy.skin', 'Skin'), color: '#f5e6d3', accent: '#c4aa94' },
          { id: 'skeletal', icon: '\uD83E\uDDB4', name: t('stem.anatomy.skeletal_2', 'Skeletal'), color: 'var(--allo-stem-text, #e2e8f0)', accent: '#94a3b8', systems: ['skeletal'] },
          { id: 'muscular', icon: '\uD83D\uDCAA', name: t('stem.anatomy.muscular_2', 'Muscular'), color: '#fecaca', accent: '#dc2626', systems: ['muscular'] },
          { id: 'organs', icon: '\uD83E\uDEC1', name: t('stem.anatomy.organs', 'Organs'), color: '#d1fae5', accent: '#16a34a', systems: ['digestive', 'respiratory', 'endocrine', 'reproductive'] },
          { id: 'circulatory', icon: '\u2764\uFE0F', name: t('stem.anatomy.circulatory_2', 'Circulatory'), color: '#fee2e2', accent: '#ef4444', systems: ['circulatory'] },
          { id: 'nervous', icon: '\u26A1', name: t('stem.anatomy.nervous_2', 'Nervous'), color: '#fef9c3', accent: '#eab308', systems: ['nervous'] },
          { id: 'lymphatic', icon: '\uD83D\uDFE2', name: t('stem.anatomy.lymphatic_2', 'Lymphatic'), color: '#d1fae5', accent: '#22c55e', systems: ['lymphatic', 'integumentary'] }
        ];

        // Auto-activate layer matching current system
        var autoLayerId = null;
        LAYER_DEFS.forEach(function(ld) {
          if (ld.systems && ld.systems.indexOf(sysKey) !== -1) autoLayerId = ld.id;
        });
        var hasLayerState = !!d.visibleLayers && typeof d.visibleLayers === 'object' && !Array.isArray(d.visibleLayers);
        var layers = hasLayerState ? safeBooleanMap(d.visibleLayers, ANATOMY_LAYER_IDS) : { skin: true };
        // The current system starts visible, but an explicit false must win so the matching
        // layer can actually be hidden. Previously the UI said "Hide" while autoLayerId
        // forced the layer back on during every render.
        function isLayerVisible(lid) {
          if (Object.prototype.hasOwnProperty.call(layers, lid)) return !!layers[lid];
          return lid === autoLayerId;
        }
        var toggleLayer = function(lid) {
          var newLayers = Object.assign({}, layers);
          newLayers[lid] = !isLayerVisible(lid);
          var newLayersToggled = Object.assign({}, layersToggled);
          newLayersToggled[lid] = true;
          updMulti({ visibleLayers: newLayers, _layersToggled: newLayersToggled });
          playSound('layerToggle');
        };
        var anyDeepLayer = LAYER_DEFS.some(function(ld) { return ld.id !== 'skin' && isLayerVisible(ld.id); });
        var skinOpacity = anyDeepLayer ? 0.20 : 1.0;

        // ── Complexity level lookup ──
        var ELEMENTARY_IDS = ['skull', 'ribs', 'femur', 'humerus', 'vertebral', 'pelvis', 'biceps', 'quads', 'heart', 'brain', 'lungs', 'stomach', 'kidneys', 'spinal_cord', 'deltoid', 'hamstrings', 'gastrocnemius', 'aorta', 'carotid', 'sciatic', 'liver', 'diaphragm', 'spleen', 'thymus', 'epidermis', 'dermis', 'trachea', 'alveoli', 'pituitary', 'uterus', 'testes_repro', 'mammary', 'cerebral_cortex', 'cerebellum', 'brainstem'];
        var MIDDLE_IDS = ELEMENTARY_IDS.concat(['mandible', 'clavicle', 'sternum', 'scapula', 'radius', 'ulna', 'tibia', 'fibula', 'patella', 'tarsals', 'carpals', 'sacrum', 'pectoralis', 'triceps', 'rectus_ab', 'obliques', 'trapezius', 'lats', 'glutes', 'tibialis', 'soleus', 'sartorius', 'sup_vena', 'inf_vena', 'pulm_art', 'jugular', 'coronary', 'femoral_a', 'brachial', 'portal', 'vagus', 'brachial_plexus', 'median', 'ulnar_n', 'femoral_n', 'cranial_n', 'sympathetic', 'sm_intestine', 'lg_intestine', 'pancreas', 'gallbladder', 'bladder', 'thyroid', 'adrenals', 'cervical_ln', 'axillary_ln', 'inguinal_ln', 'thoracic_duct', 'bone_marrow', 'hyoid', 'atlas_axis', 'metatarsals', 'metacarpals', 'scaphoid_bone', 'rotator_cuff', 'iliopsoas', 'intercostals', 'pelvic_floor', 'diaphragm_m', 'circle_willis', 'saphenous', 'lymph_circ', 'hypodermis', 'hair_follicle', 'sweat_glands', 'sebaceous', 'nails', 'melanocytes', 'nasal_cavity', 'pharynx', 'larynx', 'bronchi', 'pleura', 'resp_muscles', 'pineal', 'parathyroid', 'islets', 'ovaries_endo', 'testes_endo', 'hypothal_endo', 'adrenal_endo', 'epididymis', 'prostate', 'ovaries_repro', 'fallopian', 'placenta', 'hippocampus', 'amygdala', 'thalamus', 'hypothalamus', 'corpus_callosum', 'basal_ganglia']);

        function passesComplexity(st) {
          if (complexity >= 3) return true;
          if (complexity === 1) return ELEMENTARY_IDS.indexOf(st.id) !== -1;
          return MIDDLE_IDS.indexOf(st.id) !== -1;
        }

        var allStructures = sys.structures;
        var viewFiltered = allStructures.filter(function(s) { return (s.v === 'b' || s.v === (view === 'anterior' ? 'a' : 'p')) && passesComplexity(s); });
        var filtered = searchTerm ? viewFiltered.filter(function(s) { return s.name.toLowerCase().indexOf(searchTerm) >= 0 || s.fn.toLowerCase().indexOf(searchTerm) >= 0; }) : viewFiltered;
        // Deterministically separate dense marker clusters while preserving each marker's
        // anatomical anchor. The short leader line drawn below keeps displaced pins honest.
        var markerLayout = {};
        var placedMarkers = [];
        filtered.forEach(function(structure, markerIndex) {
          var baseX = structure.x * 360;
          var baseY = structure.y * 520;
          var markerX = baseX;
          var markerY = baseY;
          for (var markerAttempt = 0; markerAttempt < 8; markerAttempt++) {
            var overlapsMarker = placedMarkers.some(function(placed) {
              var dx = placed.x - markerX, dy = placed.y - markerY;
              return Math.sqrt(dx * dx + dy * dy) < 18;
            });
            if (!overlapsMarker) break;
            var markerAngle = ((markerIndex * 137.5) + (markerAttempt * 52)) * Math.PI / 180;
            var markerDistance = 10 + markerAttempt * 3;
            markerX = Math.max(12, Math.min(348, baseX + Math.cos(markerAngle) * markerDistance));
            markerY = Math.max(12, Math.min(508, baseY + Math.sin(markerAngle) * markerDistance));
          }
          markerLayout[structure.id] = {
            x: markerX / 360,
            y: markerY / 520,
            baseX: structure.x,
            baseY: structure.y,
            displaced: Math.abs(markerX - baseX) > 3 || Math.abs(markerY - baseY) > 3
          };
          placedMarkers.push({ x: markerX, y: markerY });
        });
        function markerPosition(structure) {
          return markerLayout[structure.id] || { x: structure.x, y: structure.y, baseX: structure.x, baseY: structure.y, displaced: false };
        }
        var selectedStructureId = typeof d.selectedStructure === 'string' ? d.selectedStructure : null;
        var sel = selectedStructureId ? viewFiltered.find(function(s) { return s.id === selectedStructureId; }) : null;

        var regionalAtlas = sel && REGIONAL_ATLASES[sel.id] ? REGIONAL_ATLASES[sel.id] : null;
        var regionalAtlasOpen = !!regionalAtlas && d._regionalAtlasOpen === sel.id;
        var rawAtlasStep = Number(d._regionalAtlasStep);
        var regionalAtlasStep = regionalAtlas && Number.isFinite(rawAtlasStep)
          ? Math.max(0, Math.min(Math.floor(rawAtlasStep), regionalAtlas.steps.length - 1)) : 0;
        var regionalAtlasPlaying = d._regionalAtlasPlaying !== false;
        function findStructureContext(structureId, preferredSystemId) {
          var orderedSystems = ANATOMY_SYSTEM_IDS.slice();
          var preferredIndex = orderedSystems.indexOf(preferredSystemId);
          if (preferredIndex > 0) orderedSystems.unshift(orderedSystems.splice(preferredIndex, 1)[0]);
          for (var contextIndex = 0; contextIndex < orderedSystems.length; contextIndex++) {
            var contextSystemId = orderedSystems[contextIndex];
            var contextStructure = SYSTEMS[contextSystemId].structures.find(function(structure) { return structure.id === structureId; });
            if (contextStructure) return { systemId: contextSystemId, structure: contextStructure };
          }
          return null;
        }
        function structureFocusPatch(structureId, extraPatch) {
          var patch = Object.assign({}, extraPatch || {}, { selectedStructure: structureId, search: '' });
          var context = findStructureContext(structureId, sysKey);
          if (!context) return comparisonTrackingPatch(structureId, patch, null);
          patch.system = context.systemId;
          if (context.structure.v === 'a') patch.view = 'anterior';
          else if (context.structure.v === 'p') patch.view = 'posterior';
          if (patch.system !== sysKey || (patch.view && patch.view !== view)) {
            patch.quizMode = false; patch.quizIdx = 0; patch.quizScore = 0; patch.quizFeedback = null; patch._quizAttempts = 0;
          }
          return comparisonTrackingPatch(structureId, patch, context.systemId);
        }

        // ── Fun fact state ──
        var sysFacts = FUN_FACTS[sysKey] || [];
        var rawFactIdx = Number(d._factIdx);
        var factIdx = sysFacts.length > 0 && Number.isFinite(rawFactIdx)
          ? ((Math.floor(rawFactIdx) % sysFacts.length) + sysFacts.length) % sysFacts.length
          : 0;
        var currentFact = sysFacts.length > 0 ? sysFacts[factIdx] : null;

        // ── Tour state ──
        var tourSteps = GUIDED_TOURS[sysKey] || [];
        var rawTourStepIdx = Number(d._tourStepIdx);
        var tourStepIdx = Number.isFinite(rawTourStepIdx) ? Math.max(0, Math.min(Math.floor(rawTourStepIdx), Math.max(0, tourSteps.length - 1))) : 0;
        var tourActive = d._tourActive === true;
        var tourCompleted = d._tourCompleted === true;
        var currentTourStep = tourActive && tourSteps.length > 0 ? tourSteps[tourStepIdx] : null;
        var tourStepContext = currentTourStep ? findStructureContext(currentTourStep.structureId, sysKey) : null;
        var tourStepViewMatches = !tourStepContext || tourStepContext.structure.v === 'b' || (tourStepContext.structure.v === 'a' ? view === 'anterior' : view === 'posterior');
        var diagramMatchesTourStep = !!currentTourStep && !!tourStepContext && tourStepContext.systemId === sysKey && tourStepViewMatches && selectedStructureId === currentTourStep.structureId;

        function systemSelectionPatch(systemId) {
          return { system: systemId, selectedStructure: null, quizMode: false, quizIdx: 0, quizScore: 0, quizFeedback: null, _quizAttempts: 0, search: '', _flashcardIdx: 0, _flashcardFlipped: false };
        }
        function showAnatomySystem(systemId, contextLabel) {
          if (!SYSTEMS[systemId]) return;
          updMulti(systemSelectionPatch(systemId));
          playSound('systemSelect');
          if (contextLabel && typeof announceToSR === 'function') announceToSR('Showing ' + SYSTEMS[systemId].name + ' diagram for ' + contextLabel + '.');
        }

        // ── Connections state ──
        var connectionIds = CONNECTIONS.map(function(connection) { return connection.id; });
        var connectionsViewed = safeFlagMap(d._connectionsViewed, connectionIds);
        var expandedConnectionId = typeof d._expandedConn === 'string' && connectionIds.indexOf(d._expandedConn) !== -1 ? d._expandedConn : null;

        // ── Clinical cases state ──
        var clinicalCaseIds = CLINICAL_CASES.map(function(caseItem) { return caseItem.id; });
        var hasClinicalIdState = !!d._clinicalSolvedIds && typeof d._clinicalSolvedIds === 'object' && !Array.isArray(d._clinicalSolvedIds);
        var clinicalSolvedIds = safeFlagMap(d._clinicalSolvedIds, clinicalCaseIds);
        var restoredClinicalSolved = safeNonNegativeNumber(d._clinicalSolved, 0, true);
        var clinicalSolved = hasClinicalIdState
          ? Object.keys(clinicalSolvedIds).length
          : Math.min(CLINICAL_CASES.length, restoredClinicalSolved);
        var activeCaseId = typeof d._activeCaseId === 'string' && clinicalCaseIds.indexOf(d._activeCaseId) !== -1 ? d._activeCaseId : null;
        var activeCaseFeedback = activeCaseId && d._activeCaseFeedback === 'reveal' ? 'reveal' : null;

        // ── Spotter test state ──
        var spotterActive = d._spotterActive === true;
        var spotterScore = safeNonNegativeNumber(d._spotterScore, 0, true);
        var spotterTotal = Math.max(spotterScore, safeNonNegativeNumber(d._spotterTotal, 0, true));
        var spotterTarget = typeof d._spotterTarget === 'string' ? d._spotterTarget : null;
        var spotterStartTime = safeNonNegativeNumber(d._spotterStartTime, 0, false);
        var spotterBestTime = safeNonNegativeNumber(d._spotterBestTime, 999, false);
        if (spotterBestTime <= 0) spotterBestTime = 999;
        var seenSpotterOptions = {};
        var spotterOptions = Array.isArray(d._spotterOpts) ? d._spotterOpts.reduce(function(valid, option) {
          var optionId = option && typeof option.id === 'string' ? option.id : null;
          var canonical = optionId ? allStructures.find(function(structure) { return structure.id === optionId; }) : null;
          if (canonical && !seenSpotterOptions[canonical.id]) { seenSpotterOptions[canonical.id] = true; valid.push(canonical); }
          return valid;
        }, []) : [];
        // Spotter accessibility: a coarse positional region cue (viewer perspective) so SR / non-visual
        // and keyboard users can identify the marked structure without seeing the canvas crosshair.
        // Deliberately coarse (5 vertical x 3 horizontal zones) so it never names or uniquely reveals
        // the answer; it narrows the figure region so the multiple-choice options become answerable.
        function spotterRegionCue(st) {
          if (!st) return '';
          var vert = st.y < 0.16 ? 'near the top, around the head and neck'
            : st.y < 0.30 ? 'in the upper body, around the shoulders and chest'
            : st.y < 0.45 ? 'in the chest and upper belly area'
            : st.y < 0.62 ? 'in the lower belly and hip area'
            : 'in the lower body, around the legs';
          var horiz = st.x < 0.42 ? 'on the left side of the figure'
            : st.x > 0.58 ? 'on the right side of the figure'
            : 'near the center of the figure';
          return 'The marker is ' + horiz + ', ' + vert + '.';
        }
        var spotterTargetStruct = spotterTarget ? (allStructures.find(function(s) { return s.id === spotterTarget; }) || null) : null;
        var spotterCueText = spotterRegionCue(spotterTargetStruct);
        // Elapsed time frozen at answer time (do NOT recompute Date.now() at render — the panel
        // re-renders on every mouse-move, which would inflate the "Correct! (x.xs)" reading).
        var spotterElapsed = safeNonNegativeNumber(d._spotterElapsed, 0, false);
        var restoredSpotterFeedback = typeof d._spotterFeedback === 'string' ? d._spotterFeedback : null;
        var spotterFeedback = spotterOptions.some(function(option) { return option.id === restoredSpotterFeedback; }) ? restoredSpotterFeedback : null;
        var spotterRoundReady = !!spotterTargetStruct && spotterOptions.length === 4 &&
          spotterOptions.some(function(option) { return option.id === spotterTarget; }) && (spotterStartTime > 0 || spotterFeedback !== null);
        // Is the currently-marked structure actually visible under the active systems/layers?
        var spotterTargetVisible = !!spotterTargetStruct && filtered.some(function(s) { return s.id === spotterTarget; });
        // Pick a fresh Spotter round from the CURRENTLY VISIBLE structures. Returns false (with a
        // toast) if fewer than 4 labeled structures are in view, so Start / Next can never silently
        // no-op or leave the student stuck on an unanswerable question.
        var pickSpotterRound = function(isStart) {
          var pool = filtered.filter(function(s) { return s.fn; });
          if (pool.length < 4) {
            if (typeof addToast === 'function') addToast('🔎 The Spotter Test needs at least 4 labeled structures in view. Turn on more systems or layers.');
            return false;
          }
          var target = pool[Math.floor(Math.random() * pool.length)];
          var wrong = pool.filter(function(s) { return s.id !== target.id; }).sort(function() { return Math.random() - 0.5; }).slice(0, 3);
          var opts = wrong.concat([target]).sort(function() { return Math.random() - 0.5; });
          var payload = { _spotterTarget: target.id, _spotterFeedback: null, _spotterOpts: opts, _spotterStartTime: Date.now(), _spotterElapsed: 0 };
          if (isStart) payload._spotterActive = true;
          updMulti(payload);
          if (typeof announceToSR === 'function') announceToSR((isStart ? 'Spotter test started. ' : 'Next structure. ') + spotterRegionCue(target) + ' Choose which structure is marked from the buttons below.');
          return true;
        };
        // Centralized SR announcement for organ selection (the #allo-live-anatomy region was dead).
        // Grade-aware: mirrors the panel (simplified desc for k2/g35, full fn otherwise).
        function announceStructure(id) {
          if (typeof announceToSR !== 'function' || !id) return;
          var st = null;
          for (var asi = 0; asi < allStructures.length; asi++) { if (allStructures[asi].id === id) { st = allStructures[asi]; break; } }
          if (!st) return;
          var simple = (gradeBand === 'k2' || gradeBand === 'g35') && SIMPLE_DESC[st.id] && SIMPLE_DESC[st.id][gradeBand];
          var desc = simple || st.fn || '';
          announceToSR(st.name + (desc ? '. ' + desc : ''));
        }

        // ── Compare mode state ──
        var compareStructureId = typeof d._compareStructure === 'string' ? d._compareStructure : null;
        var compareSel = compareStructureId ? allStructures.find(function(s) { return s.id === compareStructureId; }) : null;
        function comparisonPairKey(firstId, secondId) {
          return [firstId, secondId].sort().join('::');
        }
        var comparisonPairs = Array.isArray(d._comparisonPairs) ? d._comparisonPairs.reduce(function(validPairs, rawPair) {
          if (typeof rawPair !== 'string') return validPairs;
          var pairParts = rawPair.split('::');
          if (pairParts.length !== 2 || pairParts[0] === pairParts[1]) return validPairs;
          if (!findStructureContext(pairParts[0], sysKey) || !findStructureContext(pairParts[1], sysKey)) return validPairs;
          var canonicalPair = comparisonPairKey(pairParts[0], pairParts[1]);
          if (validPairs.indexOf(canonicalPair) === -1) validPairs.push(canonicalPair);
          return validPairs;
        }, []) : [];
        var comparisons = Math.max(safeNonNegativeNumber(d._comparisons, 0, true), comparisonPairs.length);
        function comparisonTrackingPatch(structureId, basePatch, contextSystemId) {
          var patch = Object.assign({}, basePatch || {});
          if (!compareSel || compareSel.id === structureId || contextSystemId !== sysKey) return patch;
          if (!allStructures.some(function(structure) { return structure.id === structureId; })) return patch;
          var pairKey = comparisonPairKey(compareSel.id, structureId);
          if (comparisonPairs.indexOf(pairKey) !== -1) return patch;
          var newComparisonPairs = comparisonPairs.concat([pairKey]);
          patch._comparisonPairs = newComparisonPairs;
          patch._comparisons = Math.max(comparisons + 1, newComparisonPairs.length);
          return patch;
        }
        function selectionPatch(structureId, extraPatch) {
          return comparisonTrackingPatch(structureId, Object.assign({}, extraPatch || {}, { selectedStructure: structureId }), sysKey);
        }
        var activeComparisonPairKey = compareSel && sel && compareSel.id !== sel.id ? comparisonPairKey(compareSel.id, sel.id) : null;
        var activeComparisonRecorded = !!activeComparisonPairKey && comparisonPairs.indexOf(activeComparisonPairKey) !== -1;

        // ── Pathway state ──
        var activePathwayId = typeof d._activePathway === 'string' ? d._activePathway : null;
        var activePathway = activePathwayId ? PATHWAYS.find(function(pathway) { return pathway.id === activePathwayId; }) : null;
        if (!activePathway) activePathwayId = null;
        var rawPathwayStepIdx = Number(d._pathwayStep);
        var pathwayStepIdx = activePathway && Number.isFinite(rawPathwayStepIdx)
          ? Math.max(0, Math.min(Math.floor(rawPathwayStepIdx), Math.max(0, activePathway.steps.length - 1)))
          : 0;
        var pathwayIds = PATHWAYS.map(function(pathway) { return pathway.id; });
        var pathwaysCompleted = safeFlagMap(d._pathwaysCompleted, pathwayIds);

        // ── Mnemonics viewed state ──
        var mnemonicIds = [];
        Object.keys(MNEMONICS).forEach(function(systemId) {
          MNEMONICS[systemId].forEach(function(mnemonic) { mnemonicIds.push(mnemonic.id); });
        });
        var mnemonicsViewed = safeFlagMap(d._mnemonicsViewed, mnemonicIds);
        var showMnemonics = d._showMnemonics === true;
        var showClinical = d._showClinical === true;

        // ── X-ray mode ──
        var xrayMode = d._xrayMode === true;

        // ── Skin tone diversity (cultural representation) ──
        var SKIN_TONES = [
          { id: 'light', label: t('stem.anatomy.light', 'Light'), base: '#f5e6d3', mid: '#f0ddd0', shadow: '#ebd5c6', deep: '#e8cfc0', outline: '#c4aa94', hairline: '#a08060' },
          { id: 'medium', label: t('stem.anatomy.medium', 'Medium'), base: '#d4a574', mid: '#c9956a', shadow: '#c08a60', deep: '#b57f56', outline: '#8a6540', hairline: '#5a3a20' },
          { id: 'olive', label: t('stem.anatomy.olive', 'Olive'), base: '#c4a882', mid: '#b89a76', shadow: '#ac8e6c', deep: '#a08264', outline: '#7a6244', hairline: '#4a3420' },
          { id: 'brown', label: t('stem.anatomy.brown', 'Brown'), base: '#8d5e3c', mid: '#7d5234', shadow: '#6e482e', deep: '#5f3e28', outline: '#4a2e1c', hairline: '#2a1a10' },
          { id: 'deep', label: t('stem.anatomy.deep', 'Deep'), base: '#4a3228', mid: '#3e2a22', shadow: '#34241e', deep: '#2c1e18', outline: '#1e1410', hairline: '#0e0a06' }
        ];
        var requestedSkinToneId = typeof d._skinTone === 'string' ? d._skinTone : 'olive';
        var skinTone = SKIN_TONES.find(function(tone) { return tone.id === requestedSkinToneId; }) || SKIN_TONES[2];
        var skinToneId = skinTone.id;

        // ── Flashcard state ──
        var flashcardFlipped = d._flashcardFlipped === true;
        var flashcardPool = allStructures.filter(function(s) { return s.fn && passesComplexity(s); });
        var rawFlashcardIdx = Number(d._flashcardIdx);
        var flashcardIdx = flashcardPool.length > 0 && Number.isFinite(rawFlashcardIdx)
          ? ((Math.floor(rawFlashcardIdx) % flashcardPool.length) + flashcardPool.length) % flashcardPool.length
          : 0;

        // ── Confetti state ──
        var confettiNow = Date.now();
        var confettiParticles = Array.isArray(d._confettiParticles) ? d._confettiParticles.filter(function(particle) {
          if (!particle || typeof particle !== 'object') return false;
          var numericFields = ['x', 'y', 'vx', 'vy', 'rot', 'spin', 'ci', 'born'];
          if (!numericFields.every(function(field) { return Number.isFinite(Number(particle[field])); })) return false;
          var ageMs = confettiNow - Number(particle.born);
          return ageMs >= 0 && ageMs <= 5000;
        }).slice(0, 100) : [];

        // ── Stats tracking ──
        var totalTimeSpent = safeNonNegativeNumber(d._totalTimeSpent, 0, false);
        var quizAttempts = safeNonNegativeNumber(d._quizAttempts, 0, true);
        var quizScore = safeNonNegativeNumber(d.quizScore, 0, true);

        // ── Enhanced Quiz logic ──
        var quizPool = viewFiltered.filter(function(s) { return s.fn; });
        var quizMode = d.quizMode === true;
        var rawQuizRoundIdx = Number(d.quizIdx);
        var quizRoundIdx = Number.isFinite(rawQuizRoundIdx) && rawQuizRoundIdx >= 0 ? Math.floor(rawQuizRoundIdx) : 0;
        var quizTypeCount = 4;
        var quizQ = quizMode && quizPool.length > 0 ? quizPool[quizRoundIdx % quizPool.length] : null;
        var quizType = quizMode ? (quizRoundIdx % quizTypeCount) : 0;
        // True/False (type 1): the statement used to ALWAYS claim the current system → answer was always
        // "True" and trivially gameable. Alternate True/False deterministically by quizIdx; when it should
        // be False, claim a system that does NOT actually contain this structure (handles multi-system
        // organs like the pancreas/lungs that legitimately belong to more than one bucket).
        var tfTrue = true, tfClaimSys = sys;
        if (quizType === 1 && quizQ) {
          // True/False appears once every four questions, so parity of quizIdx alone is
          // always odd. Alternate by the True/False round number instead.
          tfTrue = (Math.floor(quizRoundIdx / quizTypeCount) % 2) === 0;
          if (!tfTrue) {
            var _tfWrong = Object.keys(SYSTEMS).filter(function(k) {
              return k !== sysKey && !SYSTEMS[k].structures.some(function(s) { return s.id === quizQ.id; });
            });
            if (_tfWrong.length) tfClaimSys = SYSTEMS[_tfWrong[quizRoundIdx % _tfWrong.length]];
            else tfTrue = true;
          }
        }
        function quizSeed(text) {
          var seed = 2166136261;
          for (var qsi = 0; qsi < text.length; qsi++) {
            seed ^= text.charCodeAt(qsi);
            seed = Math.imul(seed, 16777619);
          }
          return seed >>> 0;
        }
        function stableQuizShuffle(items, seedText) {
          var result = items.slice();
          var seed = quizSeed(seedText);
          for (var qi = result.length - 1; qi > 0; qi--) {
            seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
            var qj = seed % (qi + 1);
            var swap = result[qi]; result[qi] = result[qj]; result[qj] = swap;
          }
          return result;
        }
        var quizOptions = [];
        if (quizQ) {
          var quizKey = sysKey + '|' + quizRoundIdx + '|' + quizType;
          var wrong = quizPool.filter(function(s) { return s.id !== quizQ.id; });
          var shuffled = stableQuizShuffle(wrong, quizKey + '|structures').slice(0, 3);
          if (quizType === 0 || quizType === 3) {
            quizOptions = stableQuizShuffle(shuffled.concat([quizQ]), quizKey + '|answers');
          } else if (quizType === 1) {
            quizOptions = [{ id: 'true', name: t('stem.anatomy.true', 'True') }, { id: 'false', name: t('stem.anatomy.false', 'False') }];
          } else if (quizType === 2) {
            var sysKeys = Object.keys(SYSTEMS);
            var validSys = sysKeys.filter(function(k) {
              return SYSTEMS[k].structures.some(function(s) { return s.id === quizQ.id; });
            });
            var wrongSys = stableQuizShuffle(sysKeys.filter(function(k) { return validSys.indexOf(k) === -1; }), quizKey + '|systems').slice(0, 3);
            quizOptions = stableQuizShuffle(wrongSys.concat([sysKey]), quizKey + '|system-answers').map(function(k) { return { id: k, name: SYSTEMS[k].name }; });
          }
        }

        var quizCorrectId = quizQ ? (quizType === 1 ? (tfTrue ? 'true' : 'false') : (quizType === 2 ? sysKey : quizQ.id)) : null;
        var savedQuizFeedback = d.quizFeedback && typeof d.quizFeedback === 'object' && !Array.isArray(d.quizFeedback) ? d.quizFeedback : null;
        var quizFeedback = savedQuizFeedback && typeof savedQuizFeedback.chosen === 'string' && quizOptions.some(function(option) { return option.id === savedQuizFeedback.chosen; })
          ? { chosen: savedQuizFeedback.chosen, correct: savedQuizFeedback.chosen === quizCorrectId }
          : null;
        var quizAnswerLabel = quizQ ? (quizType === 1 ? (tfTrue ? t('stem.anatomy.true', 'True') : t('stem.anatomy.false', 'False')) : (quizType === 2 ? sys.name : quizQ.name)) : '';

        // ── Hover state ──
        var hoverStructure = typeof d._hoverStructure === 'string' ? d._hoverStructure : null;
        var CANVAS_ZOOM_LEVELS = [1, 1.25, 1.5, 2];
        var requestedCanvasZoom = Number(d._canvasZoom);
        var canvasZoom = CANVAS_ZOOM_LEVELS.indexOf(requestedCanvasZoom) >= 0 ? requestedCanvasZoom : 1;
        var requestedCanvasPanX = Number(d._canvasPanX);
        var requestedCanvasPanY = Number(d._canvasPanY);
        function canvasPanLimitForZoom(zoom, axis) {
          if (zoom <= 1) return 0;
          return Math.round((axis === 'y' ? 520 : 360) * (zoom - 1) / 2);
        }
        function clampCanvasPan(value, zoom, axis) {
          var limit = canvasPanLimitForZoom(zoom, axis);
          var numericValue = Number(value) || 0;
          return Math.max(-limit, Math.min(limit, numericValue));
        }
        var canvasPanX = Number.isFinite(requestedCanvasPanX) ? clampCanvasPan(requestedCanvasPanX, canvasZoom, 'x') : 0;
        var canvasPanY = Number.isFinite(requestedCanvasPanY) ? clampCanvasPan(requestedCanvasPanY, canvasZoom, 'y') : 0;
        var canvasZoomIndex = CANVAS_ZOOM_LEVELS.indexOf(canvasZoom);
        var canvasViewStatusParts = ['Zoom ' + Math.round(canvasZoom * 100) + ' percent'];
        if (canvasPanX !== 0) canvasViewStatusParts.push('diagram moved ' + Math.abs(canvasPanX) + ' pixels ' + (canvasPanX > 0 ? 'right' : 'left'));
        if (canvasPanY !== 0) canvasViewStatusParts.push('diagram moved ' + Math.abs(canvasPanY) + ' pixels ' + (canvasPanY > 0 ? 'down' : 'up'));
        var canvasViewStatus = canvasViewStatusParts.join(', ');
        function setCanvasView(nextZoom, nextPanX, nextPanY) {
          var safeZoom = CANVAS_ZOOM_LEVELS.indexOf(nextZoom) >= 0 ? nextZoom : 1;
          updMulti({
            _canvasZoom: safeZoom,
            _canvasPanX: clampCanvasPan(nextPanX, safeZoom, 'x'),
            _canvasPanY: clampCanvasPan(nextPanY, safeZoom, 'y')
          });
        }
        function focusSelectedStructure() {
          if (!sel) return;
          var focusZoom = canvasZoom > 1 ? canvasZoom : 1.5;
          var focusMarker = markerPosition(sel);
          var focusPanX = (0.5 - focusMarker.x) * 360 * focusZoom;
          var focusPanY = (0.5 - focusMarker.y) * 520 * focusZoom;
          setCanvasView(focusZoom, focusPanX, focusPanY);
        }
        var minimapViewportWidth = 100 / canvasZoom;
        var minimapViewportHeight = 100 / canvasZoom;
        var minimapCenterX = 50 - (canvasPanX / (360 * canvasZoom)) * 100;
        var minimapCenterY = 50 - (canvasPanY / (520 * canvasZoom)) * 100;
        var minimapViewportLeft = Math.max(0, Math.min(100 - minimapViewportWidth, minimapCenterX - minimapViewportWidth / 2));
        var minimapViewportTop = Math.max(0, Math.min(100 - minimapViewportHeight, minimapCenterY - minimapViewportHeight / 2));
        var minimapSelectedMarker = sel ? markerPosition(sel) : null;

        // ══════════════════════════════════════
        // BADGE SYSTEM
        // ══════════════════════════════════════

        var badges = safeFlagMap(d._badges, BADGE_DEFS.map(function(badge) { return badge.id; }));
        var totalCorrect = safeNonNegativeNumber(d._totalCorrect, 0, true);
        var streak = safeNonNegativeNumber(d._streak, 0, true);
        var systemsExplored = safeFlagMap(d._systemsExplored, ANATOMY_SYSTEM_IDS);
        var structuresViewed = safeFlagMap(d._structuresViewed, knownStructureIds);
        var CONFIDENCE_LEVELS = ['practice', 'learning', 'mastered'];
        var structureConfidence = safeEnumMap(d._structureConfidence, knownStructureIds, CONFIDENCE_LEVELS);
        var studyFilter = ['all', 'unseen', 'review', 'mastered'].indexOf(d._studyFilter) !== -1 ? d._studyFilter : 'all';
        var studyFiltered = filtered.filter(function(structure) {
          if (studyFilter === 'unseen') return !structuresViewed[structure.id];
          if (studyFilter === 'review') return structureConfidence[structure.id] === 'practice' || structureConfidence[structure.id] === 'learning';
          if (studyFilter === 'mastered') return structureConfidence[structure.id] === 'mastered';
          return true;
        });
        var currentSystemMasteredCount = viewFiltered.filter(function(structure) { return structureConfidence[structure.id] === 'mastered'; }).length;
        var currentSystemReviewCount = viewFiltered.filter(function(structure) {
          return structureConfidence[structure.id] === 'practice' || structureConfidence[structure.id] === 'learning';
        }).length;
        function setStructureConfidence(structureId, level) {
          if (knownStructureIds.indexOf(structureId) === -1 || CONFIDENCE_LEVELS.indexOf(level) === -1) return;
          var nextConfidence = Object.assign({}, structureConfidence);
          nextConfidence[structureId] = level;
          upd('_structureConfidence', nextConfidence);
          if (typeof announceToSR === 'function') {
            var confidenceStructure = findStructureContext(structureId, sysKey);
            var confidenceLabel = level === 'practice' ? 'needs practice' : level === 'learning' ? 'is still being learned' : 'is marked got it';
            announceToSR((confidenceStructure ? confidenceStructure.structure.name : 'Structure') + ' ' + confidenceLabel + '.');
          }
        }
        var layersToggled = safeFlagMap(d._layersToggled, ANATOMY_LAYER_IDS);
        var viewsUsed = safeFlagMap(d._viewsUsed, ['anterior', 'posterior']);
        var searchFinds = safeNonNegativeNumber(d._searchFinds, 0, true);
        var aiQuestions = safeNonNegativeNumber(d._aiQuestions, 0, true);

        function spawnConfetti() {
          var particles = [];
          for (var ci = 0; ci < 30; ci++) {
            particles.push({
              x: 0.3 + Math.random() * 0.4,
              y: 0.1 + Math.random() * 0.2,
              vx: (Math.random() - 0.5) * 2,
              vy: -1 - Math.random() * 2,
              rot: Math.random() * Math.PI * 2,
              spin: (Math.random() - 0.5) * 6,
              ci: ci,
              born: Date.now()
            });
          }
          upd('_confettiParticles', particles);
        }

        function awardBadge(id) {
          if (badges[id]) return;
          var def = null;
          for (var bi = 0; bi < BADGE_DEFS.length; bi++) {
            if (BADGE_DEFS[bi].id === id) { def = BADGE_DEFS[bi]; break; }
          }
          if (!def) return;
          var newBadges = Object.assign({}, badges);
          newBadges[id] = true;
          upd('_badges', newBadges);
          playSound('badge');
          spawnConfetti();
          if (awardStemXP) awardStemXP(def.xp);
          if (stemCelebrate) stemCelebrate();
          if (addToast) addToast(def.icon + ' Badge: ' + def.name + ' (+' + def.xp + ' XP)');
          // Check anatomy champion
          var earnedCount = Object.keys(newBadges).length;
          if (earnedCount >= 12 && !newBadges.anatomyChampion) {
            var champBadges = Object.assign({}, newBadges);
            champBadges.anatomyChampion = true;
            upd('_badges', champBadges);
            spawnConfetti();
            if (awardStemXP) awardStemXP(50);
            if (addToast) addToast('\uD83D\uDC51 Badge: Anatomy Champion (+50 XP)');
          }
        }

        function checkBadges() {
          if (sel && !badges.firstStructure) awardBadge('firstStructure');
          if (Object.keys(systemsExplored).length >= 5 && !badges.systemExplorer5) awardBadge('systemExplorer5');
          if (Object.keys(systemsExplored).length >= 10 && !badges.allSystems) awardBadge('allSystems');
          if (Object.keys(layersToggled).length >= 7 && !badges.layerMaster) awardBadge('layerMaster');
          if (totalCorrect >= 5 && !badges.quizAce5) awardBadge('quizAce5');
          if (totalCorrect >= 15 && !badges.quizAce15) awardBadge('quizAce15');
          if (streak >= 3 && !badges.streak3) awardBadge('streak3');
          if (viewsUsed.anterior && viewsUsed.posterior && !badges.viewToggler) awardBadge('viewToggler');
          if (searchFinds >= 3 && !badges.searchPro) awardBadge('searchPro');
          if (aiQuestions >= 3 && !badges.aiCurious) awardBadge('aiCurious');
          if (Object.keys(structuresViewed).length >= 50 && !badges.structureScholar) awardBadge('structureScholar');
          if (tourCompleted && !badges.tourComplete) awardBadge('tourComplete');
          if (Object.keys(connectionsViewed).length >= 5 && !badges.connectionExplorer) awardBadge('connectionExplorer');
          if (clinicalSolved >= 3 && !badges.clinicalExpert) awardBadge('clinicalExpert');
          if (Object.keys(mnemonicsViewed).length >= 5 && !badges.mnemonicLearner) awardBadge('mnemonicLearner');
          if (Object.keys(pathwaysCompleted).length >= 2 && !badges.pathwayTracer) awardBadge('pathwayTracer');
          if (spotterScore >= 5 && !badges.spotterPro) awardBadge('spotterPro');
          if (comparisons >= 5 && !badges.compareMaster) awardBadge('compareMaster');
          if (spotterBestTime < 3 && !badges.speedDemon) awardBadge('speedDemon');
        }

        // Consolidate derived progress tracking into one deferred state update. The old
        // implementation issued up to three setState calls synchronously during render.
        var progressTrackingPatch = {};
        if (!systemsExplored[sysKey]) {
          var newSE = Object.assign({}, systemsExplored); newSE[sysKey] = true;
          progressTrackingPatch._systemsExplored = newSE;
        }
        if (!viewsUsed[view]) {
          var newVU = Object.assign({}, viewsUsed); newVU[view] = true;
          progressTrackingPatch._viewsUsed = newVU;
        }
        if (sel && !structuresViewed[sel.id]) {
          var newSV = Object.assign({}, structuresViewed); newSV[sel.id] = true;
          progressTrackingPatch._structuresViewed = newSV;
        }
        var progressTrackingKeys = Object.keys(progressTrackingPatch);
        if (progressTrackingKeys.length > 0) {
          var progressTrackingFingerprint = sysKey + '|' + view + '|' + (sel ? sel.id : '') + '|' + progressTrackingKeys.join(',');
          if (window.__alloAnatomyTrackingPending !== progressTrackingFingerprint) {
            window.__alloAnatomyTrackingPending = progressTrackingFingerprint;
            var commitProgressTracking = function() {
              if (window.__alloAnatomyTrackingPending === progressTrackingFingerprint) window.__alloAnatomyTrackingPending = null;
              updMulti(progressTrackingPatch);
            };
            if (typeof setTimeout === 'function') setTimeout(commitProgressTracking, 0);
            else commitProgressTracking();
          }
        }

        // Defer badge/challenge side effects out of render, but only when progress-relevant
        // state changes. Hover, search typing, and canvas animation renders should not enqueue
        // another zero-delay task.
        var progressFingerprint = [
          sel ? sel.id : '', Object.keys(badges).sort().join(','), Object.keys(systemsExplored).sort().join(','),
          Object.keys(layersToggled).sort().join(','), totalCorrect, streak, Object.keys(viewsUsed).sort().join(','),
          searchFinds, aiQuestions, Object.keys(structuresViewed).sort().join(','), tourCompleted ? 1 : 0,
          Object.keys(connectionsViewed).sort().join(','), clinicalSolved, Object.keys(mnemonicsViewed).sort().join(','),
          Object.keys(pathwaysCompleted).sort().join(','), spotterScore, comparisons, spotterBestTime,
          completedChallenges.slice().sort().join(',')
        ].join('|');
        if (window.__alloAnatomyProgressFingerprint !== progressFingerprint) {
          window.__alloAnatomyProgressFingerprint = progressFingerprint;
          if (typeof setTimeout === 'function') setTimeout(function() { checkBadges(); checkAnatomyChallenges(); }, 0);
          else { checkBadges(); checkAnatomyChallenges(); }
        }

        // ══════════════════════════════════════
        // CANVAS — Animated anatomical figure
        // ══════════════════════════════════════

        var canvasRef = function(canvas) {
          if (!canvas) {
            try { if (window.__alloAnatomyCanvasCleanup) window.__alloAnatomyCanvasCleanup(); } catch (e) {}
            return;
          }
          if (canvas._anatomyCleanup) canvas._anatomyCleanup();
          else if (canvas._anatomyAnim) { cancelAnimationFrame(canvas._anatomyAnim); canvas._anatomyAnim = null; }
          canvas._anatomyHoverId = hoverStructure || null;
          try { if (window.__alloAnatomyCanvasCleanup && window.__alloAnatomyCanvasCleanup !== canvas._anatomyCleanup) window.__alloAnatomyCanvasCleanup(); } catch (e) {}
          // ── HiDPI / Retina scaling: render at native pixel density for crisp anatomical lines ──
          var dpr = window.devicePixelRatio || 1;
          var CSS_W = 360, CSS_H = 520;
          canvas.width = CSS_W * dpr;
          canvas.height = CSS_H * dpr;
          canvas.style.width = CSS_W + 'px';
          canvas.style.height = CSS_H + 'px';
          var cCtx = canvas.getContext('2d'); if (cCtx && !cCtx.roundRect) { cCtx.roundRect = function (rx, ry, rw, rh, rr) { if (typeof rr === 'number') rr = [rr, rr, rr, rr]; if (!rr || rr.length < 4) rr = [0, 0, 0, 0]; this.moveTo(rx + rr[0], ry); this.arcTo(rx + rw, ry, rx + rw, ry + rh, rr[1]); this.arcTo(rx + rw, ry + rh, rx, ry + rh, rr[2]); this.arcTo(rx, ry + rh, rx, ry, rr[3]); this.arcTo(rx, ry, rx + rw, ry, rr[0]); this.closePath(); return this; }; }
          cCtx.scale(dpr, dpr);
          // W and H stay at CSS dimensions — all drawing code uses these logical coordinates
          var W = CSS_W, H = CSS_H;
          canvas._dpr = dpr; // store for click/hover coordinate conversion
          var anatTick = 0;
          var anatomyAlive = true;
          var anatomyMotionReduced = false;
          var anatomyMotionQuery = null;
          try {
            anatomyMotionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
            anatomyMotionReduced = !!(anatomyMotionQuery && anatomyMotionQuery.matches);
          } catch (e) {}

          function isAnatomyHidden() {
            return typeof document !== 'undefined' && !!document.hidden;
          }

          function cancelAnatomyFrame() {
            if (canvas._anatomyAnim && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(canvas._anatomyAnim);
            canvas._anatomyAnim = null;
          }

          function scheduleAnatomyFrame() {
            if (!anatomyAlive || anatomyMotionReduced || canvas._anatomyAnim || isAnatomyHidden()) return;
            if (typeof requestAnimationFrame !== 'function') return;
            canvas._anatomyAnim = requestAnimationFrame(drawAnatomyFrame);
          }

          function cleanupAnatomyCanvas() {
            anatomyAlive = false;
            cancelAnatomyFrame();
            if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onAnatomyVisibilityChange);
            if (anatomyMotionQuery) {
              if (typeof anatomyMotionQuery.removeEventListener === 'function') anatomyMotionQuery.removeEventListener('change', onAnatomyMotionPreferenceChange);
              else if (typeof anatomyMotionQuery.removeListener === 'function') anatomyMotionQuery.removeListener(onAnatomyMotionPreferenceChange);
            }
            if (window.__alloAnatomyCanvasCleanup === canvas._anatomyCleanup) window.__alloAnatomyCanvasCleanup = null;
            canvas._anatomyCleanup = null;
          }

          function onAnatomyVisibilityChange() {
            if (!anatomyAlive) return;
            if (!canvas.isConnected) { cleanupAnatomyCanvas(); return; }
            if (isAnatomyHidden()) cancelAnatomyFrame();
            else { cancelAnatomyFrame(); drawAnatomyFrame(); }
          }
          function onAnatomyMotionPreferenceChange(event) {
            anatomyMotionReduced = !!(event && event.matches);
            cancelAnatomyFrame();
            if (anatomyAlive && canvas.isConnected && !isAnatomyHidden()) drawAnatomyFrame();
          }

          canvas._anatomyCleanup = cleanupAnatomyCanvas;
          try { window.__alloAnatomyCanvasCleanup = canvas._anatomyCleanup; } catch (e) {}
          if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onAnatomyVisibilityChange);
          if (anatomyMotionQuery) {
            if (typeof anatomyMotionQuery.addEventListener === 'function') anatomyMotionQuery.addEventListener('change', onAnatomyMotionPreferenceChange);
            else if (typeof anatomyMotionQuery.addListener === 'function') anatomyMotionQuery.addListener(onAnatomyMotionPreferenceChange);
          }

          function drawAnatomyFrame() {
            if (!anatomyAlive) return;
            canvas._anatomyAnim = null;
            // Stop the rAF chain once the canvas leaves the DOM (the user
            // switched to a different tool, or the SEL/STEM modal closed).
            // Without this check, the loop kept firing forever — drawing to
            // a detached canvas, consuming CPU, and pinning a closure that
            // prevented GC of the canvas + cCtx + every variable in scope.
            // Multiple open/close cycles compounded into multiple zombie
            // loops running in parallel. canvas.isConnected returns false
            // once the element is removed from any document.
            if (!canvas.isConnected) {
              cleanupAnatomyCanvas();
              return;
            }
            if (isAnatomyHidden()) {
              cancelAnatomyFrame();
              return;
            }
            if (!anatomyMotionReduced) anatTick++;
            cCtx.clearRect(0, 0, W, H);

            // ── X-ray mode background (enhanced with film effects) ──
            if (xrayMode) {
              cCtx.fillStyle = '#0a0a12';
              cCtx.fillRect(0, 0, W, H);
              // Subtle vignette (stronger for film look)
              var vigGrad = cCtx.createRadialGradient(W * 0.5, H * 0.45, H * 0.12, W * 0.5, H * 0.45, H * 0.68);
              vigGrad.addColorStop(0, 'rgba(20,25,40,0)');
              vigGrad.addColorStop(0.7, 'rgba(5,5,15,0.3)');
              vigGrad.addColorStop(1, 'rgba(0,0,0,0.6)');
              cCtx.fillStyle = vigGrad; cCtx.fillRect(0, 0, W, H);
              // Film border frame
              cCtx.save(); cCtx.globalAlpha = 0.35;
              cCtx.strokeStyle = '#334155'; cCtx.lineWidth = 2;
              cCtx.strokeRect(8, 8, W - 16, H - 16);
              cCtx.strokeStyle = '#1e293b'; cCtx.lineWidth = 4;
              cCtx.strokeRect(2, 2, W - 4, H - 4);
              cCtx.restore();
              // Scan-line overlay (subtle horizontal lines for CRT/X-ray film feel)
              cCtx.save(); cCtx.globalAlpha = 0.04;
              for (var sli = 0; sli < H; sli += 3) {
                cCtx.beginPath(); cCtx.moveTo(0, sli); cCtx.lineTo(W, sli);
                cCtx.strokeStyle = '#e2e8f0'; cCtx.lineWidth = 0.5; cCtx.stroke();
              }
              cCtx.restore();
              // L / R orientation markers (standard radiology convention)
              cCtx.save(); cCtx.globalAlpha = 0.5;
              cCtx.font = 'bold 14px monospace'; cCtx.fillStyle = '#a0c4ff';
              cCtx.textAlign = 'left'; cCtx.fillText('R', 14, 24);
              cCtx.textAlign = 'right'; cCtx.fillText('L', W - 14, 24);
              // DICOM-style footer info
              cCtx.font = '7px monospace'; cCtx.fillStyle = '#94a3b8';
              cCtx.textAlign = 'left';
              cCtx.fillText('ALLOFLOW ANATOMY', 14, H - 28);
              cCtx.fillText(view === 'anterior' ? 'AP VIEW' : 'PA VIEW', 14, H - 18);
              cCtx.textAlign = 'right';
              cCtx.fillText('EDUCATIONAL', W - 14, H - 28);
              cCtx.fillText('WCAG 2.1 AA', W - 14, H - 18);
              cCtx.restore();
            } else {
              // ── System-specific background gradient ──
              var bgGrad = cCtx.createRadialGradient(W * 0.5, H * 0.4, H * 0.1, W * 0.5, H * 0.4, H * 0.6);
              bgGrad.addColorStop(0, sys.accent + '06');
              bgGrad.addColorStop(1, '#fafaf900');
              cCtx.fillStyle = bgGrad;
              cCtx.fillRect(0, 0, W, H);
            }

            // ── Enhanced Anatomical Figure ──
            cCtx.save();
            cCtx.globalAlpha = xrayMode ? 0.12 : skinOpacity;
            cCtx.lineJoin = 'round';
            cCtx.lineCap = 'round';

            // Skin gradient (adapts to X-ray mode)
            var skinGrad = cCtx.createLinearGradient(W * 0.3, 0, W * 0.7, H);
            if (xrayMode) {
              skinGrad.addColorStop(0, '#2a2a3a');
              skinGrad.addColorStop(0.5, '#222233');
              skinGrad.addColorStop(1, '#1a1a2a');
            } else {
              skinGrad.addColorStop(0, skinTone.base);
              skinGrad.addColorStop(0.3, skinTone.mid);
              skinGrad.addColorStop(0.6, skinTone.shadow);
              skinGrad.addColorStop(1, skinTone.deep);
            }

            // Skin-tone adaptive colors for contour lines
            var skinOutline = xrayMode ? '#1a1a2a' : skinTone.outline;
            var skinDetail = xrayMode ? '#2a2a3a' : skinTone.shadow;
            var hairColor = xrayMode ? '#1a1a2a' : skinTone.hairline;

            // Helper: draw body part with enhanced shading
            function drawBodyPart(pathFn, opts) {
              cCtx.save();
              cCtx.shadowColor = 'rgba(120,100,80,0.18)';
              cCtx.shadowBlur = 8;
              cCtx.beginPath(); pathFn(cCtx);
              cCtx.fillStyle = skinGrad; cCtx.fill();
              cCtx.shadowBlur = 0;
              // Edge darkening for 3D depth — adapts to skin tone
              cCtx.strokeStyle = skinOutline;
              cCtx.lineWidth = 1.4; cCtx.stroke();
              // Inner highlight for roundness
              if (!xrayMode) {
                cCtx.globalAlpha *= 0.2;
                cCtx.beginPath(); pathFn(cCtx);
                cCtx.strokeStyle = skinTone.base;
                cCtx.lineWidth = 0.5; cCtx.stroke();
              }
              cCtx.restore();
            }

            // Head
            drawBodyPart(function(c) { c.ellipse(W * 0.5, H * 0.06, W * 0.058, H * 0.046, 0, 0, Math.PI * 2); });
            // Jaw hint
            cCtx.beginPath(); cCtx.moveTo(W * 0.46, H * 0.085); cCtx.quadraticCurveTo(W * 0.50, H * 0.11, W * 0.54, H * 0.085);
            cCtx.strokeStyle = skinDetail; cCtx.lineWidth = 0.7; cCtx.stroke();
            // Ears (anatomical auricle with helix, tragus, lobule)
            function drawEar(ex, ey, flip) {
              var s = flip ? -1 : 1;
              cCtx.save();
              // Helix (outer rim — C-shaped curve)
              cCtx.beginPath();
              cCtx.moveTo(ex + s * W * 0.004, ey - H * 0.016);
              cCtx.quadraticCurveTo(ex + s * W * 0.010, ey - H * 0.014, ex + s * W * 0.011, ey - H * 0.004);
              cCtx.quadraticCurveTo(ex + s * W * 0.011, ey + H * 0.008, ex + s * W * 0.008, ey + H * 0.014);
              cCtx.quadraticCurveTo(ex + s * W * 0.004, ey + H * 0.018, ex + s * W * 0.001, ey + H * 0.019);
              cCtx.strokeStyle = skinOutline; cCtx.lineWidth = 0.8; cCtx.stroke();
              // Antihelix (inner ridge)
              cCtx.beginPath();
              cCtx.moveTo(ex + s * W * 0.003, ey - H * 0.012);
              cCtx.quadraticCurveTo(ex + s * W * 0.007, ey - H * 0.006, ex + s * W * 0.007, ey + H * 0.004);
              cCtx.quadraticCurveTo(ex + s * W * 0.005, ey + H * 0.010, ex + s * W * 0.002, ey + H * 0.013);
              cCtx.strokeStyle = skinDetail; cCtx.lineWidth = 0.4; cCtx.stroke();
              // Tragus (small bump at ear canal opening)
              cCtx.beginPath();
              cCtx.ellipse(ex + s * W * 0.003, ey + H * 0.002, W * 0.002, H * 0.003, 0, 0, Math.PI * 2);
              cCtx.strokeStyle = skinDetail; cCtx.lineWidth = 0.4; cCtx.stroke();
              // Lobule (earlobe — small rounded shape at bottom)
              cCtx.beginPath();
              cCtx.ellipse(ex + s * W * 0.002, ey + H * 0.017, W * 0.003, H * 0.004, 0, 0, Math.PI * 2);
              cCtx.fillStyle = skinGrad; cCtx.fill();
              cCtx.strokeStyle = skinDetail; cCtx.lineWidth = 0.3; cCtx.stroke();
              cCtx.restore();
            }
            drawEar(W * 0.44, H * 0.06, false);  // left ear
            drawEar(W * 0.56, H * 0.06, true);   // right ear

            // ── Facial features (anterior view) ──
            if (view === 'anterior') {
              cCtx.save(); cCtx.globalAlpha = Math.min(skinOpacity, 0.85);
              // Hair volume silhouette (subtle mass above hairline)
              cCtx.save(); cCtx.globalAlpha *= 0.15;
              cCtx.beginPath();
              cCtx.moveTo(W * 0.45, H * 0.035);
              cCtx.quadraticCurveTo(W * 0.46, H * 0.012, W * 0.50, H * 0.008);
              cCtx.quadraticCurveTo(W * 0.54, H * 0.012, W * 0.55, H * 0.035);
              cCtx.fillStyle = hairColor; cCtx.fill();
              cCtx.restore();
              // Hairline arc
              cCtx.beginPath(); cCtx.ellipse(W * 0.5, H * 0.025, W * 0.052, H * 0.028, 0, Math.PI * 0.85, Math.PI * 0.15, true);
              cCtx.strokeStyle = hairColor; cCtx.lineWidth = 2.5; cCtx.stroke();
              // Eyebrows (tapered — wider center, narrower at ends)
              function drawEyebrow(x1, y1, cpx, cpy, x2, y2) {
                // Upper edge
                cCtx.beginPath(); cCtx.moveTo(x1, y1);
                cCtx.quadraticCurveTo(cpx, cpy - H * 0.002, x2, y2 + H * 0.001);
                cCtx.strokeStyle = hairColor; cCtx.lineWidth = 0.6; cCtx.stroke();
                // Lower edge (thicker in middle)
                cCtx.beginPath(); cCtx.moveTo(x1, y1 + H * 0.001);
                cCtx.quadraticCurveTo(cpx, cpy + H * 0.001, x2, y2 + H * 0.002);
                cCtx.strokeStyle = hairColor; cCtx.lineWidth = 0.5; cCtx.stroke();
                // Fill between (tapered shape)
                cCtx.beginPath(); cCtx.moveTo(x1, y1);
                cCtx.quadraticCurveTo(cpx, cpy - H * 0.002, x2, y2 + H * 0.001);
                cCtx.quadraticCurveTo(cpx, cpy + H * 0.002, x1, y1 + H * 0.002);
                cCtx.closePath();
                cCtx.fillStyle = hairColor; cCtx.globalAlpha *= 0.5; cCtx.fill(); cCtx.globalAlpha /= 0.5;
              }
              drawEyebrow(W * 0.465, H * 0.046, W * 0.475, H * 0.042, W * 0.49, H * 0.044);
              drawEyebrow(W * 0.535, H * 0.046, W * 0.525, H * 0.042, W * 0.51, H * 0.044);
              // Eyes (enhanced with eyelids, lashes, scleral highlight)
              function drawEye(ex, ey) {
                // Upper eyelid crease
                cCtx.beginPath(); cCtx.ellipse(ex, ey - H * 0.002, W * 0.013, H * 0.004, 0, Math.PI * 0.9, Math.PI * 0.1, true);
                cCtx.strokeStyle = skinOutline; cCtx.lineWidth = 0.4; cCtx.stroke();
                // Sclera (white of eye)
                cCtx.beginPath(); cCtx.ellipse(ex, ey, W * 0.012, H * 0.005, 0, 0, Math.PI * 2);
                cCtx.fillStyle = '#fff'; cCtx.fill(); cCtx.strokeStyle = '#8a7060'; cCtx.lineWidth = 0.7; cCtx.stroke();
                // Iris (with gradient for depth)
                var irisGrad = cCtx.createRadialGradient(ex, ey, W * 0.001, ex, ey, W * 0.005);
                irisGrad.addColorStop(0, '#3a2818'); irisGrad.addColorStop(0.6, '#5a4030'); irisGrad.addColorStop(1, '#6a5040');
                cCtx.beginPath(); cCtx.arc(ex, ey, W * 0.005, 0, Math.PI * 2);
                cCtx.fillStyle = irisGrad; cCtx.fill();
                // Pupil
                cCtx.beginPath(); cCtx.arc(ex, ey - H * 0.001, W * 0.002, 0, Math.PI * 2);
                cCtx.fillStyle = '#0a0a0a'; cCtx.fill();
                // Scleral highlight (light reflection — key for "alive" look)
                cCtx.beginPath(); cCtx.arc(ex + W * 0.002, ey - H * 0.002, W * 0.0015, 0, Math.PI * 2);
                cCtx.fillStyle = 'rgba(255,255,255,0.8)'; cCtx.fill();
                // Upper eyelid (partially covers top of eye)
                cCtx.beginPath(); cCtx.ellipse(ex, ey - H * 0.001, W * 0.013, H * 0.003, 0, Math.PI * 0.85, Math.PI * 0.15, true);
                cCtx.strokeStyle = skinOutline; cCtx.lineWidth = 0.8; cCtx.stroke();
                // Eyelash hints (3 tiny strokes from upper lid)
                cCtx.save(); cCtx.globalAlpha = 0.4;
                for (var eli = 0; eli < 3; eli++) {
                  var elAngle = Math.PI * (0.3 + eli * 0.2);
                  var elx = ex + Math.cos(elAngle) * W * 0.012;
                  var ely = ey - H * 0.001 + Math.sin(elAngle) * H * 0.003;
                  cCtx.beginPath(); cCtx.moveTo(elx, ely); cCtx.lineTo(elx + Math.cos(elAngle) * 2, ely + Math.sin(elAngle) * 1.5);
                  cCtx.strokeStyle = hairColor; cCtx.lineWidth = 0.4; cCtx.stroke();
                }
                cCtx.restore();
              }
              drawEye(W * 0.478, H * 0.053);
              drawEye(W * 0.522, H * 0.053);
              // Nose (enhanced with nasal bridge, alar cartilage wings)
              // Nasal bridge (midline definition)
              cCtx.beginPath(); cCtx.moveTo(W * 0.50, H * 0.043);
              cCtx.quadraticCurveTo(W * 0.499, H * 0.055, W * 0.498, H * 0.068);
              cCtx.strokeStyle = skinDetail; cCtx.lineWidth = 0.4; cCtx.stroke();
              // Nasal sidewalls
              cCtx.beginPath(); cCtx.moveTo(W * 0.496, H * 0.050); cCtx.lineTo(W * 0.493, H * 0.068);
              cCtx.quadraticCurveTo(W * 0.488, H * 0.073, W * 0.491, H * 0.074);
              cCtx.moveTo(W * 0.504, H * 0.050); cCtx.lineTo(W * 0.507, H * 0.068);
              cCtx.quadraticCurveTo(W * 0.512, H * 0.073, W * 0.509, H * 0.074);
              cCtx.strokeStyle = skinOutline; cCtx.lineWidth = 0.6; cCtx.stroke();
              // Alar cartilage wings (the rounded flares of the nostrils)
              cCtx.beginPath();
              cCtx.moveTo(W * 0.491, H * 0.074);
              cCtx.quadraticCurveTo(W * 0.485, H * 0.076, W * 0.486, H * 0.073);
              cCtx.quadraticCurveTo(W * 0.488, H * 0.070, W * 0.493, H * 0.070);
              cCtx.strokeStyle = skinOutline; cCtx.lineWidth = 0.5; cCtx.stroke();
              cCtx.beginPath();
              cCtx.moveTo(W * 0.509, H * 0.074);
              cCtx.quadraticCurveTo(W * 0.515, H * 0.076, W * 0.514, H * 0.073);
              cCtx.quadraticCurveTo(W * 0.512, H * 0.070, W * 0.507, H * 0.070);
              cCtx.strokeStyle = skinOutline; cCtx.lineWidth = 0.5; cCtx.stroke();
              // Nasal tip highlight
              cCtx.save(); cCtx.globalAlpha *= 0.3;
              cCtx.beginPath(); cCtx.arc(W * 0.50, H * 0.070, W * 0.003, 0, Math.PI * 2);
              cCtx.fillStyle = skinTone.base; cCtx.fill();
              cCtx.restore();
              // Nostrils (deeper shadow for 3D)
              cCtx.beginPath(); cCtx.ellipse(W * 0.494, H * 0.074, W * 0.004, H * 0.002, 0.2, 0, Math.PI * 2);
              cCtx.fillStyle = skinOutline + '40'; cCtx.fill();
              cCtx.strokeStyle = skinOutline; cCtx.lineWidth = 0.4; cCtx.stroke();
              cCtx.beginPath(); cCtx.ellipse(W * 0.506, H * 0.074, W * 0.004, H * 0.002, -0.2, 0, Math.PI * 2);
              cCtx.fillStyle = skinOutline + '40'; cCtx.fill(); cCtx.stroke();
              // Philtrum (vertical groove from nose to upper lip)
              cCtx.beginPath(); cCtx.moveTo(W * 0.499, H * 0.076); cCtx.lineTo(W * 0.499, H * 0.081);
              cCtx.moveTo(W * 0.501, H * 0.076); cCtx.lineTo(W * 0.501, H * 0.081);
              cCtx.strokeStyle = skinDetail; cCtx.lineWidth = 0.3; cCtx.stroke();
              // Lip color fill (lips are distinctly colored from surrounding skin)
              // Upper lip fill
              cCtx.beginPath();
              cCtx.moveTo(W * 0.487, H * 0.082);
              cCtx.quadraticCurveTo(W * 0.494, H * 0.080, W * 0.50, H * 0.081);
              cCtx.quadraticCurveTo(W * 0.506, H * 0.080, W * 0.513, H * 0.082);
              cCtx.quadraticCurveTo(W * 0.506, H * 0.083, W * 0.50, H * 0.0835);
              cCtx.quadraticCurveTo(W * 0.494, H * 0.083, W * 0.487, H * 0.082);
              cCtx.closePath();
              cCtx.fillStyle = skinTone.id === 'deep' ? '#6b3a3a' : skinTone.id === 'brown' ? '#9b5555' : '#d4807a';
              cCtx.globalAlpha *= 0.6; cCtx.fill(); cCtx.globalAlpha /= 0.6;
              cCtx.strokeStyle = skinTone.id === 'deep' ? '#4a2a2a' : '#c09080'; cCtx.lineWidth = 0.4; cCtx.stroke();
              // Lower lip fill (slightly fuller)
              cCtx.beginPath();
              cCtx.moveTo(W * 0.487, H * 0.082);
              cCtx.quadraticCurveTo(W * 0.50, H * 0.086, W * 0.515, H * 0.082);
              cCtx.quadraticCurveTo(W * 0.505, H * 0.088, W * 0.50, H * 0.0885);
              cCtx.quadraticCurveTo(W * 0.495, H * 0.088, W * 0.487, H * 0.082);
              cCtx.closePath();
              cCtx.fillStyle = skinTone.id === 'deep' ? '#7a4040' : skinTone.id === 'brown' ? '#a86060' : '#d98a84';
              cCtx.globalAlpha *= 0.5; cCtx.fill(); cCtx.globalAlpha /= 0.5;
              cCtx.strokeStyle = skinTone.id === 'deep' ? '#4a2a2a' : '#c09080'; cCtx.lineWidth = 0.5; cCtx.stroke();
              // Lip highlight (light reflection on lower lip center)
              cCtx.beginPath(); cCtx.arc(W * 0.50, H * 0.085, W * 0.002, 0, Math.PI * 2);
              cCtx.fillStyle = 'rgba(255,255,255,0.15)'; cCtx.fill();
              // Teeth (visible between lips — subtle white line)
              if (layerOn('skeletal') || sysKey === 'skeletal') {
                cCtx.save(); cCtx.globalAlpha = 0.4;
                // Upper teeth row
                for (var uti = 0; uti < 6; uti++) {
                  var utx = W * (0.490 + uti * 0.004);
                  cCtx.beginPath(); cCtx.roundRect(utx, H * 0.0825, 1.2, 1.5, 0.3);
                  cCtx.fillStyle = '#f8f8f0'; cCtx.fill(); cCtx.strokeStyle = '#d4d0c8'; cCtx.lineWidth = 0.2; cCtx.stroke();
                }
                // Lower teeth row
                for (var lti = 0; lti < 6; lti++) {
                  var ltx = W * (0.490 + lti * 0.004);
                  cCtx.beginPath(); cCtx.roundRect(ltx, H * 0.0842, 1.2, 1.3, 0.3);
                  cCtx.fillStyle = '#f0f0e8'; cCtx.fill(); cCtx.strokeStyle = '#d4d0c8'; cCtx.lineWidth = 0.2; cCtx.stroke();
                }
                cCtx.restore();
              }
              // Chin dimple hint
              cCtx.beginPath(); cCtx.arc(W * 0.50, H * 0.095, W * 0.003, 0.2, Math.PI - 0.2);
              cCtx.strokeStyle = skinDetail; cCtx.lineWidth = 0.4; cCtx.stroke();
              cCtx.restore();
            }

            // Neck
            drawBodyPart(function(c) {
              c.moveTo(W * 0.465, H * 0.10); c.quadraticCurveTo(W * 0.46, H * 0.115, W * 0.44, H * 0.135);
              c.lineTo(W * 0.56, H * 0.135); c.quadraticCurveTo(W * 0.54, H * 0.115, W * 0.535, H * 0.10); c.closePath();
            });
            // Sternocleidomastoid (SCM) muscle contours — diagonal bands from mastoid to sternum
            cCtx.save(); cCtx.globalAlpha = skinOpacity * 0.15;
            // Left SCM
            cCtx.beginPath(); cCtx.moveTo(W * 0.46, H * 0.085);
            cCtx.quadraticCurveTo(W * 0.465, H * 0.11, W * 0.475, H * 0.132);
            cCtx.strokeStyle = skinOutline; cCtx.lineWidth = 1.5; cCtx.stroke();
            // Right SCM
            cCtx.beginPath(); cCtx.moveTo(W * 0.54, H * 0.085);
            cCtx.quadraticCurveTo(W * 0.535, H * 0.11, W * 0.525, H * 0.132); cCtx.stroke();
            cCtx.restore();
            // Laryngeal prominence (Adam's apple — thyroid cartilage V-shape)
            if (view === 'anterior') {
              cCtx.save(); cCtx.globalAlpha = skinOpacity * 0.2;
              cCtx.beginPath();
              cCtx.moveTo(W * 0.496, H * 0.112); cCtx.lineTo(W * 0.50, H * 0.108); cCtx.lineTo(W * 0.504, H * 0.112);
              cCtx.strokeStyle = skinOutline; cCtx.lineWidth = 0.7; cCtx.stroke();
              // Cricoid cartilage ring (below Adam's apple)
              cCtx.beginPath(); cCtx.moveTo(W * 0.495, H * 0.116); cCtx.lineTo(W * 0.505, H * 0.116);
              cCtx.strokeStyle = skinOutline; cCtx.lineWidth = 0.4; cCtx.stroke();
              cCtx.restore();
            }
            // Lateral neck contour lines
            cCtx.beginPath(); cCtx.moveTo(W * 0.47, H * 0.105); cCtx.quadraticCurveTo(W * 0.45, H * 0.12, W * 0.45, H * 0.135);
            cCtx.strokeStyle = skinDetail; cCtx.lineWidth = 0.5; cCtx.stroke();
            cCtx.beginPath(); cCtx.moveTo(W * 0.53, H * 0.105); cCtx.quadraticCurveTo(W * 0.55, H * 0.12, W * 0.55, H * 0.135); cCtx.stroke();

            // Torso
            drawBodyPart(function(c) {
              c.moveTo(W * 0.34, H * 0.135); c.quadraticCurveTo(W * 0.38, H * 0.13, W * 0.50, H * 0.132);
              c.quadraticCurveTo(W * 0.62, H * 0.13, W * 0.66, H * 0.135);
              c.quadraticCurveTo(W * 0.69, H * 0.16, W * 0.68, H * 0.20);
              c.quadraticCurveTo(W * 0.67, H * 0.28, W * 0.64, H * 0.34);
              c.quadraticCurveTo(W * 0.61, H * 0.38, W * 0.58, H * 0.40);
              c.quadraticCurveTo(W * 0.55, H * 0.425, W * 0.50, H * 0.43);
              c.quadraticCurveTo(W * 0.45, H * 0.425, W * 0.42, H * 0.40);
              c.quadraticCurveTo(W * 0.39, H * 0.38, W * 0.36, H * 0.34);
              c.quadraticCurveTo(W * 0.33, H * 0.28, W * 0.32, H * 0.20);
              c.quadraticCurveTo(W * 0.31, H * 0.16, W * 0.34, H * 0.135);
            });
            // Torso musculature contours
            cCtx.globalAlpha = 0.3;
            cCtx.beginPath();
            cCtx.moveTo(W * 0.36, H * 0.155); cCtx.quadraticCurveTo(W * 0.42, H * 0.19, W * 0.50, H * 0.19);
            cCtx.quadraticCurveTo(W * 0.58, H * 0.19, W * 0.64, H * 0.155);
            cCtx.strokeStyle = skinOutline; cCtx.lineWidth = 0.6; cCtx.stroke();
            cCtx.beginPath(); cCtx.moveTo(W * 0.50, H * 0.15); cCtx.lineTo(W * 0.50, H * 0.42);
            cCtx.strokeStyle = skinOutline; cCtx.lineWidth = 0.5; cCtx.stroke();
            for (var ri = 0; ri < 4; ri++) {
              var ry = H * (0.19 + ri * 0.032);
              cCtx.beginPath(); cCtx.moveTo(W * 0.42, ry); cCtx.quadraticCurveTo(W * 0.46, ry + H * 0.008, W * 0.50, ry + H * 0.003);
              cCtx.strokeStyle = '#d0b89e'; cCtx.lineWidth = 0.4; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.58, ry); cCtx.quadraticCurveTo(W * 0.54, ry + H * 0.008, W * 0.50, ry + H * 0.003); cCtx.stroke();
            }
            for (var ai = 0; ai < 3; ai++) {
              var ay = H * (0.30 + ai * 0.035);
              cCtx.beginPath(); cCtx.moveTo(W * 0.44, ay); cCtx.lineTo(W * 0.56, ay);
              cCtx.strokeStyle = '#d0b89e'; cCtx.lineWidth = 0.4; cCtx.stroke();
            }
            cCtx.beginPath(); cCtx.arc(W * 0.50, H * 0.36, 2.5, 0, Math.PI * 2);
            cCtx.strokeStyle = skinOutline; cCtx.lineWidth = 0.5; cCtx.stroke();
            // ── Anterior torso surface landmarks ──
            if (view === 'anterior') {
              // Suprasternal (jugular) notch — V-shaped dip between collarbones
              cCtx.beginPath();
              cCtx.moveTo(W * 0.475, H * 0.135); cCtx.quadraticCurveTo(W * 0.50, H * 0.138, W * 0.525, H * 0.135);
              cCtx.strokeStyle = skinOutline; cCtx.lineWidth = 0.5; cCtx.stroke();
              // Xiphoid process (cartilage tip at bottom of sternum)
              cCtx.beginPath(); cCtx.moveTo(W * 0.498, H * 0.315); cCtx.lineTo(W * 0.50, H * 0.325); cCtx.lineTo(W * 0.502, H * 0.315);
              cCtx.strokeStyle = skinOutline; cCtx.lineWidth = 0.4; cCtx.stroke();
              // Costal margin (lower rib arch — V-shaped border of ribcage)
              cCtx.beginPath();
              cCtx.moveTo(W * 0.50, H * 0.32);
              cCtx.quadraticCurveTo(W * 0.46, H * 0.33, W * 0.40, H * 0.30);
              cCtx.strokeStyle = skinOutline; cCtx.lineWidth = 0.3; cCtx.stroke();
              cCtx.beginPath();
              cCtx.moveTo(W * 0.50, H * 0.32);
              cCtx.quadraticCurveTo(W * 0.54, H * 0.33, W * 0.60, H * 0.30); cCtx.stroke();
            }
            // ── Clavicle subcutaneous contour (visible through skin on all people) ──
            if (view === 'anterior' && !xrayMode) {
              cCtx.save(); cCtx.globalAlpha = skinOpacity * 0.12;
              // Left clavicle — curved line across upper chest
              cCtx.beginPath(); cCtx.moveTo(W * 0.475, H * 0.134);
              cCtx.quadraticCurveTo(W * 0.42, H * 0.128, W * 0.34, H * 0.138);
              cCtx.strokeStyle = skinOutline; cCtx.lineWidth = 1.8; cCtx.stroke();
              // Right clavicle
              cCtx.beginPath(); cCtx.moveTo(W * 0.525, H * 0.134);
              cCtx.quadraticCurveTo(W * 0.58, H * 0.128, W * 0.66, H * 0.138); cCtx.stroke();
              cCtx.restore();
            }
            // ── Nipple/areola landmarks (4th intercostal space clinical reference) ──
            if (view === 'anterior' && !xrayMode) {
              cCtx.save(); cCtx.globalAlpha = skinOpacity * 0.2;
              // Left
              cCtx.beginPath(); cCtx.arc(W * 0.42, H * 0.21, 2.5, 0, Math.PI * 2);
              cCtx.fillStyle = skinTone.id === 'deep' ? '#3a2020' : skinTone.id === 'brown' ? '#6a4040' : '#c09080';
              cCtx.fill();
              cCtx.beginPath(); cCtx.arc(W * 0.42, H * 0.21, 1, 0, Math.PI * 2);
              cCtx.fillStyle = skinTone.id === 'deep' ? '#2a1515' : skinTone.id === 'brown' ? '#5a3030' : '#a07060';
              cCtx.fill();
              // Right
              cCtx.beginPath(); cCtx.arc(W * 0.58, H * 0.21, 2.5, 0, Math.PI * 2);
              cCtx.fillStyle = skinTone.id === 'deep' ? '#3a2020' : skinTone.id === 'brown' ? '#6a4040' : '#c09080';
              cCtx.fill();
              cCtx.beginPath(); cCtx.arc(W * 0.58, H * 0.21, 1, 0, Math.PI * 2);
              cCtx.fillStyle = skinTone.id === 'deep' ? '#2a1515' : skinTone.id === 'brown' ? '#5a3030' : '#a07060';
              cCtx.fill();
              cCtx.restore();
            }
            cCtx.globalAlpha = 1.0;

            // Shoulders
            drawBodyPart(function(c) {
              c.moveTo(W * 0.34, H * 0.135); c.quadraticCurveTo(W * 0.28, H * 0.125, W * 0.25, H * 0.145);
              c.quadraticCurveTo(W * 0.24, H * 0.165, W * 0.27, H * 0.185);
              c.quadraticCurveTo(W * 0.30, H * 0.17, W * 0.34, H * 0.155); c.closePath();
            });
            drawBodyPart(function(c) {
              c.moveTo(W * 0.66, H * 0.135); c.quadraticCurveTo(W * 0.72, H * 0.125, W * 0.75, H * 0.145);
              c.quadraticCurveTo(W * 0.76, H * 0.165, W * 0.73, H * 0.185);
              c.quadraticCurveTo(W * 0.70, H * 0.17, W * 0.66, H * 0.155); c.closePath();
            });

            // Left arm
            drawBodyPart(function(c) {
              c.moveTo(W * 0.27, H * 0.185); c.quadraticCurveTo(W * 0.22, H * 0.22, W * 0.20, H * 0.28);
              c.quadraticCurveTo(W * 0.185, H * 0.33, W * 0.175, H * 0.36);
              c.quadraticCurveTo(W * 0.17, H * 0.39, W * 0.155, H * 0.44);
              c.lineTo(W * 0.13, H * 0.46); c.lineTo(W * 0.17, H * 0.47);
              c.quadraticCurveTo(W * 0.19, H * 0.42, W * 0.195, H * 0.38);
              c.quadraticCurveTo(W * 0.21, H * 0.33, W * 0.22, H * 0.29);
              c.quadraticCurveTo(W * 0.25, H * 0.22, W * 0.30, H * 0.185); c.closePath();
            });
            cCtx.globalAlpha = 0.25;
            cCtx.beginPath(); cCtx.moveTo(W * 0.24, H * 0.22); cCtx.quadraticCurveTo(W * 0.215, H * 0.27, W * 0.20, H * 0.30);
            cCtx.strokeStyle = skinOutline; cCtx.lineWidth = 0.5; cCtx.stroke();
            cCtx.globalAlpha = 1.0;

            // Right arm
            drawBodyPart(function(c) {
              c.moveTo(W * 0.73, H * 0.185); c.quadraticCurveTo(W * 0.78, H * 0.22, W * 0.80, H * 0.28);
              c.quadraticCurveTo(W * 0.815, H * 0.33, W * 0.825, H * 0.36);
              c.quadraticCurveTo(W * 0.83, H * 0.39, W * 0.845, H * 0.44);
              c.lineTo(W * 0.87, H * 0.46); c.lineTo(W * 0.83, H * 0.47);
              c.quadraticCurveTo(W * 0.81, H * 0.42, W * 0.805, H * 0.38);
              c.quadraticCurveTo(W * 0.79, H * 0.33, W * 0.78, H * 0.29);
              c.quadraticCurveTo(W * 0.75, H * 0.22, W * 0.70, H * 0.185); c.closePath();
            });
            cCtx.globalAlpha = 0.25;
            cCtx.beginPath(); cCtx.moveTo(W * 0.76, H * 0.22); cCtx.quadraticCurveTo(W * 0.785, H * 0.27, W * 0.80, H * 0.30);
            cCtx.strokeStyle = skinOutline; cCtx.lineWidth = 0.5; cCtx.stroke();
            cCtx.globalAlpha = 1.0;

            // Hands (palm)
            drawBodyPart(function(c) { c.ellipse(W * 0.15, H * 0.468, W * 0.022, H * 0.014, -0.2, 0, Math.PI * 2); });
            drawBodyPart(function(c) { c.ellipse(W * 0.85, H * 0.468, W * 0.022, H * 0.014, 0.2, 0, Math.PI * 2); });
            // Finger details — left hand
            cCtx.save(); cCtx.globalAlpha = skinOpacity * 0.9;
            var lFingerBase = [[0.135, 0.457], [0.14, 0.454], [0.148, 0.454], [0.155, 0.457]];
            var lFingerTip =  [[0.125, 0.448], [0.133, 0.443], [0.144, 0.443], [0.154, 0.448]];
            for (var fi = 0; fi < 4; fi++) {
              cCtx.beginPath();
              cCtx.moveTo(W * lFingerBase[fi][0], H * lFingerBase[fi][1]);
              cCtx.lineTo(W * lFingerTip[fi][0], H * lFingerTip[fi][1]);
              cCtx.strokeStyle = skinDetail; cCtx.lineWidth = 2.2; cCtx.lineCap = 'round'; cCtx.stroke();
            }
            // Thumb — left
            cCtx.beginPath(); cCtx.moveTo(W * 0.130, H * 0.465); cCtx.quadraticCurveTo(W * 0.122, H * 0.462, W * 0.118, H * 0.458);
            cCtx.strokeStyle = skinDetail; cCtx.lineWidth = 2.5; cCtx.stroke();
            // Finger details — right hand
            var rFingerBase = [[0.865, 0.457], [0.86, 0.454], [0.852, 0.454], [0.845, 0.457]];
            var rFingerTip =  [[0.875, 0.448], [0.867, 0.443], [0.856, 0.443], [0.846, 0.448]];
            for (var fi2 = 0; fi2 < 4; fi2++) {
              cCtx.beginPath();
              cCtx.moveTo(W * rFingerBase[fi2][0], H * rFingerBase[fi2][1]);
              cCtx.lineTo(W * rFingerTip[fi2][0], H * rFingerTip[fi2][1]);
              cCtx.strokeStyle = skinDetail; cCtx.lineWidth = 2.2; cCtx.lineCap = 'round'; cCtx.stroke();
            }
            // Thumb — right
            cCtx.beginPath(); cCtx.moveTo(W * 0.870, H * 0.465); cCtx.quadraticCurveTo(W * 0.878, H * 0.462, W * 0.882, H * 0.458);
            cCtx.strokeStyle = skinDetail; cCtx.lineWidth = 2.5; cCtx.stroke();
            // Palm lines (visible when integumentary system selected)
            if (sysKey === 'integumentary' && !xrayMode) {
              cCtx.save(); cCtx.globalAlpha = skinOpacity * 0.2;
              // Left hand — heart line (curved across upper palm)
              cCtx.beginPath(); cCtx.moveTo(W * 0.165, H * 0.462); cCtx.quadraticCurveTo(W * 0.155, H * 0.458, W * 0.14, H * 0.46);
              cCtx.strokeStyle = skinOutline; cCtx.lineWidth = 0.4; cCtx.stroke();
              // Head line (horizontal across middle palm)
              cCtx.beginPath(); cCtx.moveTo(W * 0.163, H * 0.467); cCtx.quadraticCurveTo(W * 0.15, H * 0.465, W * 0.138, H * 0.466);
              cCtx.stroke();
              // Life line (arc from thumb to wrist)
              cCtx.beginPath(); cCtx.moveTo(W * 0.158, H * 0.46); cCtx.quadraticCurveTo(W * 0.16, H * 0.472, W * 0.155, H * 0.478);
              cCtx.stroke();
              // Right hand — mirror
              cCtx.beginPath(); cCtx.moveTo(W * 0.835, H * 0.462); cCtx.quadraticCurveTo(W * 0.845, H * 0.458, W * 0.86, H * 0.46); cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.837, H * 0.467); cCtx.quadraticCurveTo(W * 0.85, H * 0.465, W * 0.862, H * 0.466); cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.842, H * 0.46); cCtx.quadraticCurveTo(W * 0.84, H * 0.472, W * 0.845, H * 0.478); cCtx.stroke();
              cCtx.restore();
            }
            cCtx.restore();

            // Left leg
            drawBodyPart(function(c) {
              c.moveTo(W * 0.42, H * 0.425); c.quadraticCurveTo(W * 0.39, H * 0.46, W * 0.375, H * 0.52);
              c.quadraticCurveTo(W * 0.365, H * 0.58, W * 0.355, H * 0.63);
              c.quadraticCurveTo(W * 0.35, H * 0.66, W * 0.36, H * 0.70);
              c.quadraticCurveTo(W * 0.355, H * 0.74, W * 0.345, H * 0.80);
              c.quadraticCurveTo(W * 0.34, H * 0.86, W * 0.335, H * 0.90);
              c.lineTo(W * 0.30, H * 0.935); c.lineTo(W * 0.39, H * 0.935); c.lineTo(W * 0.40, H * 0.90);
              c.quadraticCurveTo(W * 0.405, H * 0.86, W * 0.41, H * 0.80);
              c.quadraticCurveTo(W * 0.42, H * 0.74, W * 0.425, H * 0.70);
              c.quadraticCurveTo(W * 0.43, H * 0.66, W * 0.435, H * 0.63);
              c.quadraticCurveTo(W * 0.44, H * 0.58, W * 0.45, H * 0.52);
              c.quadraticCurveTo(W * 0.46, H * 0.46, W * 0.49, H * 0.425); c.closePath();
            });
            cCtx.globalAlpha = 0.22;
            cCtx.beginPath(); cCtx.moveTo(W * 0.40, H * 0.46); cCtx.quadraticCurveTo(W * 0.39, H * 0.54, W * 0.38, H * 0.62);
            cCtx.strokeStyle = skinOutline; cCtx.lineWidth = 0.5; cCtx.stroke();
            cCtx.beginPath(); cCtx.arc(W * 0.395, H * 0.68, 4, 0, Math.PI * 2);
            cCtx.strokeStyle = skinOutline; cCtx.lineWidth = 0.5; cCtx.stroke();
            cCtx.beginPath(); cCtx.moveTo(W * 0.37, H * 0.73); cCtx.quadraticCurveTo(W * 0.36, H * 0.77, W * 0.36, H * 0.80); cCtx.stroke();
            cCtx.globalAlpha = 1.0;

            // Right leg
            drawBodyPart(function(c) {
              c.moveTo(W * 0.58, H * 0.425); c.quadraticCurveTo(W * 0.61, H * 0.46, W * 0.625, H * 0.52);
              c.quadraticCurveTo(W * 0.635, H * 0.58, W * 0.645, H * 0.63);
              c.quadraticCurveTo(W * 0.65, H * 0.66, W * 0.64, H * 0.70);
              c.quadraticCurveTo(W * 0.645, H * 0.74, W * 0.655, H * 0.80);
              c.quadraticCurveTo(W * 0.66, H * 0.86, W * 0.665, H * 0.90);
              c.lineTo(W * 0.70, H * 0.935); c.lineTo(W * 0.61, H * 0.935); c.lineTo(W * 0.60, H * 0.90);
              c.quadraticCurveTo(W * 0.595, H * 0.86, W * 0.59, H * 0.80);
              c.quadraticCurveTo(W * 0.58, H * 0.74, W * 0.575, H * 0.70);
              c.quadraticCurveTo(W * 0.57, H * 0.66, W * 0.565, H * 0.63);
              c.quadraticCurveTo(W * 0.56, H * 0.58, W * 0.55, H * 0.52);
              c.quadraticCurveTo(W * 0.54, H * 0.46, W * 0.51, H * 0.425); c.closePath();
            });
            cCtx.globalAlpha = 0.22;
            cCtx.beginPath(); cCtx.moveTo(W * 0.60, H * 0.46); cCtx.quadraticCurveTo(W * 0.61, H * 0.54, W * 0.62, H * 0.62);
            cCtx.strokeStyle = skinOutline; cCtx.lineWidth = 0.5; cCtx.stroke();
            cCtx.beginPath(); cCtx.arc(W * 0.605, H * 0.68, 4, 0, Math.PI * 2);
            cCtx.strokeStyle = skinOutline; cCtx.lineWidth = 0.5; cCtx.stroke();
            cCtx.beginPath(); cCtx.moveTo(W * 0.63, H * 0.73); cCtx.quadraticCurveTo(W * 0.64, H * 0.77, W * 0.64, H * 0.80); cCtx.stroke();
            cCtx.globalAlpha = 1.0;

            // Feet
            drawBodyPart(function(c) {
              c.moveTo(W * 0.30, H * 0.935); c.lineTo(W * 0.28, H * 0.955); c.quadraticCurveTo(W * 0.30, H * 0.965, W * 0.38, H * 0.96); c.lineTo(W * 0.39, H * 0.935); c.closePath();
            });
            drawBodyPart(function(c) {
              c.moveTo(W * 0.70, H * 0.935); c.lineTo(W * 0.72, H * 0.955); c.quadraticCurveTo(W * 0.70, H * 0.965, W * 0.62, H * 0.96); c.lineTo(W * 0.61, H * 0.935); c.closePath();
            });
            // Toe hints — left foot
            cCtx.save(); cCtx.globalAlpha = skinOpacity * 0.5;
            for (var ti = 0; ti < 5; ti++) {
              cCtx.beginPath();
              cCtx.arc(W * (0.30 + ti * 0.018), H * 0.958, 1.5 - ti * 0.15, 0, Math.PI * 2);
              cCtx.strokeStyle = skinOutline; cCtx.lineWidth = 0.5; cCtx.stroke();
            }
            // Toe hints — right foot
            for (var ti2 = 0; ti2 < 5; ti2++) {
              cCtx.beginPath();
              cCtx.arc(W * (0.70 - ti2 * 0.018), H * 0.958, 1.5 - ti2 * 0.15, 0, Math.PI * 2);
              cCtx.strokeStyle = skinOutline; cCtx.lineWidth = 0.5; cCtx.stroke();
            }
            // Ankle bone bumps (malleoli)
            cCtx.beginPath(); cCtx.arc(W * 0.345, H * 0.925, 2.5, 0, Math.PI * 2);
            cCtx.strokeStyle = skinOutline; cCtx.lineWidth = 0.6; cCtx.stroke();
            cCtx.beginPath(); cCtx.arc(W * 0.385, H * 0.925, 2.5, 0, Math.PI * 2); cCtx.stroke();
            cCtx.beginPath(); cCtx.arc(W * 0.655, H * 0.925, 2.5, 0, Math.PI * 2); cCtx.stroke();
            cCtx.beginPath(); cCtx.arc(W * 0.615, H * 0.925, 2.5, 0, Math.PI * 2); cCtx.stroke();
            // Achilles tendon (prominent posterior ankle)
            cCtx.beginPath(); cCtx.moveTo(W * 0.375, H * 0.88); cCtx.lineTo(W * 0.36, H * 0.935);
            cCtx.strokeStyle = skinOutline; cCtx.lineWidth = 0.5; cCtx.stroke();
            cCtx.beginPath(); cCtx.moveTo(W * 0.625, H * 0.88); cCtx.lineTo(W * 0.64, H * 0.935); cCtx.stroke();
            // Foot arch contour (medial longitudinal arch)
            cCtx.beginPath(); cCtx.moveTo(W * 0.32, H * 0.955);
            cCtx.quadraticCurveTo(W * 0.34, H * 0.948, W * 0.37, H * 0.940);
            cCtx.strokeStyle = skinDetail; cCtx.lineWidth = 0.4; cCtx.stroke();
            cCtx.beginPath(); cCtx.moveTo(W * 0.68, H * 0.955);
            cCtx.quadraticCurveTo(W * 0.66, H * 0.948, W * 0.63, H * 0.940); cCtx.stroke();
            // Toenail beds
            for (var tni = 0; tni < 5; tni++) {
              cCtx.beginPath(); cCtx.ellipse(W * (0.30 + tni * 0.018), H * 0.955, 1.2, 0.8, 0, 0, Math.PI * 2);
              cCtx.fillStyle = '#fce4ec60'; cCtx.fill(); cCtx.strokeStyle = skinDetail; cCtx.lineWidth = 0.2; cCtx.stroke();
              cCtx.beginPath(); cCtx.ellipse(W * (0.70 - tni * 0.018), H * 0.955, 1.2, 0.8, 0, 0, Math.PI * 2);
              cCtx.fillStyle = '#fce4ec60'; cCtx.fill(); cCtx.stroke();
            }
            // Wrist creases (2 transverse lines per wrist)
            cCtx.beginPath(); cCtx.moveTo(W * 0.155, H * 0.453); cCtx.lineTo(W * 0.175, H * 0.455);
            cCtx.moveTo(W * 0.157, H * 0.457); cCtx.lineTo(W * 0.173, H * 0.459);
            cCtx.strokeStyle = skinDetail; cCtx.lineWidth = 0.3; cCtx.stroke();
            cCtx.beginPath(); cCtx.moveTo(W * 0.845, H * 0.453); cCtx.lineTo(W * 0.825, H * 0.455);
            cCtx.moveTo(W * 0.843, H * 0.457); cCtx.lineTo(W * 0.827, H * 0.459); cCtx.stroke();
            // Olecranon (elbow tip — posterior bony prominence)
            cCtx.beginPath(); cCtx.arc(W * 0.22, H * 0.345, 2, 0, Math.PI * 2);
            cCtx.strokeStyle = skinOutline; cCtx.lineWidth = 0.5; cCtx.stroke();
            cCtx.beginPath(); cCtx.arc(W * 0.78, H * 0.345, 2, 0, Math.PI * 2); cCtx.stroke();
            cCtx.restore();

            // ── Navel (enhanced umbilicus with depression effect) ──
            if (!xrayMode) {
              cCtx.save(); cCtx.globalAlpha = skinOpacity * 0.35;
              // Outer rim
              cCtx.beginPath(); cCtx.ellipse(W * 0.50, H * 0.36, 3, 2.5, 0, 0, Math.PI * 2);
              cCtx.strokeStyle = skinOutline; cCtx.lineWidth = 0.6; cCtx.stroke();
              // Inner shadow (depression)
              var navelGrad = cCtx.createRadialGradient(W * 0.50, H * 0.359, 0.5, W * 0.50, H * 0.36, 2.5);
              navelGrad.addColorStop(0, skinOutline); navelGrad.addColorStop(1, skinOutline + '00');
              cCtx.beginPath(); cCtx.ellipse(W * 0.50, H * 0.36, 2, 1.5, 0, 0, Math.PI * 2);
              cCtx.fillStyle = navelGrad; cCtx.fill();
              // Light reflection at bottom (concavity indicator)
              cCtx.beginPath(); cCtx.arc(W * 0.50, H * 0.361, 0.8, 0, Math.PI * 2);
              cCtx.fillStyle = skinTone.base + '40'; cCtx.fill();
              cCtx.restore();
            }

            // ── Limb muscle definition contours (visible through skin for anatomical clarity) ──
            if (!xrayMode && view === 'anterior') {
              cCtx.save(); cCtx.globalAlpha = 0.12;
              // Deltoid cap — curved contour around shoulder
              cCtx.beginPath(); cCtx.moveTo(W * 0.34, H * 0.155); cCtx.quadraticCurveTo(W * 0.29, H * 0.14, W * 0.27, H * 0.17);
              cCtx.strokeStyle = skinOutline; cCtx.lineWidth = 0.6; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.66, H * 0.155); cCtx.quadraticCurveTo(W * 0.71, H * 0.14, W * 0.73, H * 0.17); cCtx.stroke();
              // Bicep/tricep separation on upper arms
              cCtx.beginPath(); cCtx.moveTo(W * 0.27, H * 0.20); cCtx.quadraticCurveTo(W * 0.245, H * 0.26, W * 0.225, H * 0.33);
              cCtx.strokeStyle = skinOutline; cCtx.lineWidth = 0.5; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.73, H * 0.20); cCtx.quadraticCurveTo(W * 0.755, H * 0.26, W * 0.775, H * 0.33); cCtx.stroke();
              // Bicep bulge hint
              cCtx.beginPath(); cCtx.ellipse(W * 0.255, H * 0.27, W * 0.012, H * 0.025, 0.4, Math.PI * 0.5, Math.PI * 1.5);
              cCtx.stroke();
              cCtx.beginPath(); cCtx.ellipse(W * 0.745, H * 0.27, W * 0.012, H * 0.025, -0.4, Math.PI * 1.5, Math.PI * 0.5); cCtx.stroke();
              // Quadriceps division (4 heads visible on anterior thigh)
              // Rectus femoris (center line down thigh)
              cCtx.beginPath(); cCtx.moveTo(W * 0.44, H * 0.46); cCtx.quadraticCurveTo(W * 0.425, H * 0.55, W * 0.41, H * 0.65);
              cCtx.strokeStyle = skinOutline; cCtx.lineWidth = 0.4; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.56, H * 0.46); cCtx.quadraticCurveTo(W * 0.575, H * 0.55, W * 0.59, H * 0.65); cCtx.stroke();
              // Vastus lateralis/medialis hints
              cCtx.beginPath(); cCtx.moveTo(W * 0.455, H * 0.48); cCtx.quadraticCurveTo(W * 0.44, H * 0.55, W * 0.42, H * 0.64); cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.545, H * 0.48); cCtx.quadraticCurveTo(W * 0.56, H * 0.55, W * 0.58, H * 0.64); cCtx.stroke();
              // Calf muscle (gastrocnemius) bulge
              cCtx.beginPath(); cCtx.ellipse(W * 0.39, H * 0.76, W * 0.015, H * 0.035, 0.05, Math.PI * 0.3, Math.PI * 1.7);
              cCtx.strokeStyle = skinOutline; cCtx.lineWidth = 0.4; cCtx.stroke();
              cCtx.beginPath(); cCtx.ellipse(W * 0.61, H * 0.76, W * 0.015, H * 0.035, -0.05, Math.PI * 1.3, Math.PI * 0.7); cCtx.stroke();
              // Tibialis anterior line (shin)
              cCtx.beginPath(); cCtx.moveTo(W * 0.385, H * 0.70); cCtx.lineTo(W * 0.37, H * 0.88);
              cCtx.strokeStyle = skinOutline; cCtx.lineWidth = 0.3; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.615, H * 0.70); cCtx.lineTo(W * 0.63, H * 0.88); cCtx.stroke();
              cCtx.restore();
            }

            // ── Joint indicators (enhanced with capsule shapes + cartilage crescents) ──
            cCtx.save(); cCtx.globalAlpha = 0.18;
            // type: 'b' = ball-and-socket, 'h' = hinge, 'p' = pivot/condyloid
            var joints = [
              [0.30, 0.155, 5, 'b'],    // left shoulder (ball-and-socket)
              [0.70, 0.155, 5, 'b'],    // right shoulder
              [0.22, 0.34, 4, 'h'],     // left elbow (hinge)
              [0.78, 0.34, 4, 'h'],     // right elbow
              [0.17, 0.455, 3, 'p'],    // left wrist (condyloid)
              [0.83, 0.455, 3, 'p'],    // right wrist
              [0.44, 0.43, 5.5, 'b'],   // left hip (ball-and-socket)
              [0.56, 0.43, 5.5, 'b'],   // right hip
              [0.395, 0.68, 4.5, 'h'],  // left knee (hinge)
              [0.605, 0.68, 4.5, 'h'],  // right knee
              [0.365, 0.925, 3.5, 'h'], // left ankle (hinge)
              [0.635, 0.925, 3.5, 'h']  // right ankle
            ];
            for (var ji = 0; ji < joints.length; ji++) {
              var jx = W * joints[ji][0], jy = H * joints[ji][1], jr = joints[ji][2], jType = joints[ji][3];
              // Synovial capsule (outer ellipse, slightly larger)
              cCtx.beginPath();
              if (jType === 'b') {
                // Ball-and-socket: rounder capsule
                cCtx.arc(jx, jy, jr + 1.5, 0, Math.PI * 2);
              } else if (jType === 'h') {
                // Hinge: wider horizontal, narrower vertical
                cCtx.ellipse(jx, jy, jr + 2, jr * 0.8, 0, 0, Math.PI * 2);
              } else {
                // Condyloid: small oval
                cCtx.ellipse(jx, jy, jr + 1, jr, 0, 0, Math.PI * 2);
              }
              cCtx.strokeStyle = '#94a3b8'; cCtx.lineWidth = 0.6; cCtx.setLineDash([2, 2]); cCtx.stroke(); cCtx.setLineDash([]);
              // Joint surface (inner circle)
              cCtx.beginPath(); cCtx.arc(jx, jy, jr, 0, Math.PI * 2);
              cCtx.strokeStyle = '#94a3b8'; cCtx.lineWidth = 1.2; cCtx.stroke();
              // Cartilage crescents (articular cartilage — blue arcs)
              if (jType === 'h' || jType === 'b') {
                cCtx.beginPath(); cCtx.arc(jx, jy, jr - 1, -0.4, 0.4);
                cCtx.strokeStyle = '#60a5fa'; cCtx.lineWidth = 1.5; cCtx.stroke();
                cCtx.beginPath(); cCtx.arc(jx, jy, jr - 1, Math.PI - 0.4, Math.PI + 0.4);
                cCtx.strokeStyle = '#60a5fa'; cCtx.lineWidth = 1.5; cCtx.stroke();
              }
              // Meniscus wedges for knee joints
              if (jType === 'h' && jr > 4) {
                cCtx.beginPath(); cCtx.arc(jx - 2, jy, 2, 0.5, Math.PI - 0.5);
                cCtx.strokeStyle = '#60a5fa80'; cCtx.lineWidth = 1; cCtx.stroke();
                cCtx.beginPath(); cCtx.arc(jx + 2, jy, 2, Math.PI + 0.5, -0.5);
                cCtx.strokeStyle = '#60a5fa80'; cCtx.lineWidth = 1; cCtx.stroke();
              }
            }
            cCtx.restore();

            // ── Anatomical shadow lines for 3D depth ──
            if (!xrayMode) {
              cCtx.save(); cCtx.globalAlpha = skinOpacity * 0.15;
              // Under-chin shadow
              cCtx.beginPath(); cCtx.moveTo(W * 0.465, H * 0.098); cCtx.quadraticCurveTo(W * 0.50, H * 0.105, W * 0.535, H * 0.098);
              cCtx.strokeStyle = '#6d4c41'; cCtx.lineWidth = 1.5; cCtx.stroke();
              // Clavicle shadow (suprasternal notch area)
              cCtx.beginPath(); cCtx.moveTo(W * 0.44, H * 0.135); cCtx.quadraticCurveTo(W * 0.50, H * 0.14, W * 0.56, H * 0.135);
              cCtx.strokeStyle = '#8d6e63'; cCtx.lineWidth = 0.8; cCtx.stroke();
              // Axillary fold shadows (armpit creases)
              cCtx.beginPath(); cCtx.moveTo(W * 0.34, H * 0.155); cCtx.quadraticCurveTo(W * 0.33, H * 0.17, W * 0.34, H * 0.18);
              cCtx.strokeStyle = '#8d6e63'; cCtx.lineWidth = 1; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.66, H * 0.155); cCtx.quadraticCurveTo(W * 0.67, H * 0.17, W * 0.66, H * 0.18); cCtx.stroke();
              // Inguinal fold shadows (hip creases)
              cCtx.beginPath(); cCtx.moveTo(W * 0.43, H * 0.40); cCtx.quadraticCurveTo(W * 0.44, H * 0.42, W * 0.46, H * 0.43);
              cCtx.strokeStyle = '#8d6e63'; cCtx.lineWidth = 0.8; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.57, H * 0.40); cCtx.quadraticCurveTo(W * 0.56, H * 0.42, W * 0.54, H * 0.43); cCtx.stroke();
              cCtx.restore();
            }

            // ── Restore skin opacity ──
            cCtx.restore();
            cCtx.globalAlpha = 1.0;

            // Layer visibility helper
            function layerOn(lid) { return isLayerVisible(lid); }

            // ── POSTERIOR VIEW ENHANCEMENTS ──
            if (view === 'posterior') {
              cCtx.save(); cCtx.globalAlpha = 0.25;
              // Spine prominence
              cCtx.beginPath(); cCtx.moveTo(W * 0.50, H * 0.10);
              for (var spi = 0; spi < 22; spi++) { cCtx.lineTo(W * (0.50 + Math.sin(spi * 0.3) * 0.004), H * (0.105 + spi * 0.016)); }
              cCtx.strokeStyle = '#b0a090'; cCtx.lineWidth = 2.5; cCtx.stroke();
              for (var sp2 = 0; sp2 < 22; sp2++) {
                var spy = H * (0.105 + sp2 * 0.016);
                cCtx.beginPath(); cCtx.arc(W * 0.50, spy, 1.5, 0, Math.PI * 2);
                cCtx.fillStyle = '#b0a090'; cCtx.fill();
              }
              // Scapulae
              cCtx.beginPath();
              cCtx.moveTo(W * 0.40, H * 0.16); cCtx.quadraticCurveTo(W * 0.36, H * 0.18, W * 0.37, H * 0.24);
              cCtx.quadraticCurveTo(W * 0.39, H * 0.27, W * 0.44, H * 0.26); cCtx.quadraticCurveTo(W * 0.46, H * 0.22, W * 0.44, H * 0.16);
              cCtx.strokeStyle = skinOutline; cCtx.lineWidth = 0.8; cCtx.stroke();
              cCtx.beginPath();
              cCtx.moveTo(W * 0.60, H * 0.16); cCtx.quadraticCurveTo(W * 0.64, H * 0.18, W * 0.63, H * 0.24);
              cCtx.quadraticCurveTo(W * 0.61, H * 0.27, W * 0.56, H * 0.26); cCtx.quadraticCurveTo(W * 0.54, H * 0.22, W * 0.56, H * 0.16);
              cCtx.strokeStyle = skinOutline; cCtx.lineWidth = 0.8; cCtx.stroke();
              // Trapezius outline
              cCtx.beginPath();
              cCtx.moveTo(W * 0.50, H * 0.10); cCtx.quadraticCurveTo(W * 0.42, H * 0.12, W * 0.34, H * 0.14);
              cCtx.strokeStyle = '#d0b89e'; cCtx.lineWidth = 0.6; cCtx.stroke();
              cCtx.beginPath();
              cCtx.moveTo(W * 0.50, H * 0.10); cCtx.quadraticCurveTo(W * 0.58, H * 0.12, W * 0.66, H * 0.14); cCtx.stroke();
              // Lats hints
              cCtx.beginPath();
              cCtx.moveTo(W * 0.44, H * 0.20); cCtx.quadraticCurveTo(W * 0.38, H * 0.28, W * 0.40, H * 0.35);
              cCtx.strokeStyle = '#d0b89e'; cCtx.lineWidth = 0.5; cCtx.stroke();
              cCtx.beginPath();
              cCtx.moveTo(W * 0.56, H * 0.20); cCtx.quadraticCurveTo(W * 0.62, H * 0.28, W * 0.60, H * 0.35); cCtx.stroke();
              // Gluteal contour
              cCtx.beginPath();
              cCtx.moveTo(W * 0.42, H * 0.42); cCtx.quadraticCurveTo(W * 0.38, H * 0.44, W * 0.39, H * 0.47);
              cCtx.strokeStyle = '#d0b89e'; cCtx.lineWidth = 0.5; cCtx.stroke();
              cCtx.beginPath();
              cCtx.moveTo(W * 0.58, H * 0.42); cCtx.quadraticCurveTo(W * 0.62, H * 0.44, W * 0.61, H * 0.47); cCtx.stroke();
              // ── Posterior surface landmarks ──
              // Vertebral prominens (C7 — most palpable spinous process at base of neck)
              cCtx.beginPath(); cCtx.arc(W * 0.50, H * 0.105, 2.5, 0, Math.PI * 2);
              cCtx.fillStyle = skinOutline + '30'; cCtx.fill();
              cCtx.strokeStyle = skinOutline; cCtx.lineWidth = 0.6; cCtx.stroke();
              // Iliac crest outline (visible pelvic bony edge)
              cCtx.beginPath();
              cCtx.moveTo(W * 0.38, H * 0.39); cCtx.quadraticCurveTo(W * 0.36, H * 0.40, W * 0.37, H * 0.42);
              cCtx.strokeStyle = skinOutline; cCtx.lineWidth = 0.6; cCtx.stroke();
              cCtx.beginPath();
              cCtx.moveTo(W * 0.62, H * 0.39); cCtx.quadraticCurveTo(W * 0.64, H * 0.40, W * 0.63, H * 0.42); cCtx.stroke();
              // Sacral dimples (dimples of Venus — over sacroiliac joints)
              cCtx.beginPath(); cCtx.arc(W * 0.47, H * 0.42, 1.5, 0, Math.PI * 2);
              cCtx.fillStyle = skinOutline + '25'; cCtx.fill();
              cCtx.beginPath(); cCtx.arc(W * 0.53, H * 0.42, 1.5, 0, Math.PI * 2);
              cCtx.fillStyle = skinOutline + '25'; cCtx.fill();
              // Median sacral crest
              cCtx.beginPath(); cCtx.moveTo(W * 0.50, H * 0.42); cCtx.lineTo(W * 0.50, H * 0.46);
              cCtx.strokeStyle = skinOutline; cCtx.lineWidth = 0.4; cCtx.stroke();
              // ── Posterior kidney silhouettes (visible through back) ──
              cCtx.globalAlpha = 0.18;
              // Left kidney (right side of canvas in posterior)
              cCtx.beginPath(); cCtx.ellipse(W * 0.57, H * 0.32, W * 0.018, H * 0.028, -0.1, 0, Math.PI * 2);
              var pkGrad = cCtx.createRadialGradient(W * 0.57, H * 0.32, 1, W * 0.57, H * 0.32, W * 0.018);
              pkGrad.addColorStop(0, '#ef9a9a'); pkGrad.addColorStop(1, '#ef9a9a40');
              cCtx.fillStyle = pkGrad; cCtx.fill(); cCtx.strokeStyle = '#c62828'; cCtx.lineWidth = 0.6; cCtx.stroke();
              // Right kidney
              cCtx.beginPath(); cCtx.ellipse(W * 0.43, H * 0.33, W * 0.018, H * 0.028, 0.1, 0, Math.PI * 2);
              cCtx.fillStyle = pkGrad; cCtx.fill(); cCtx.strokeStyle = '#c62828'; cCtx.lineWidth = 0.6; cCtx.stroke();
              // Adrenal glands (small caps above kidneys)
              cCtx.beginPath(); cCtx.ellipse(W * 0.57, H * 0.295, W * 0.008, H * 0.005, 0, 0, Math.PI * 2);
              cCtx.fillStyle = '#fbbf2440'; cCtx.fill(); cCtx.strokeStyle = '#f59e0b'; cCtx.lineWidth = 0.4; cCtx.stroke();
              cCtx.beginPath(); cCtx.ellipse(W * 0.43, H * 0.305, W * 0.008, H * 0.005, 0, 0, Math.PI * 2);
              cCtx.fillStyle = '#fbbf2440'; cCtx.fill(); cCtx.stroke();
              cCtx.restore();
            }

            // ── SKELETAL LAYER ── (Enhanced anatomical bones with tapered shapes, fills, and detail)
            if (layerOn('skeletal') || xrayMode) {
              cCtx.save();
              cCtx.globalAlpha = xrayMode ? 0.85 : 0.50;
              if (xrayMode) { cCtx.shadowColor = '#e0f0ff'; cCtx.shadowBlur = 8; }
              var boneColor = xrayMode ? '#d0e8ff' : '#94a3b8';
              var boneFill = xrayMode ? '#1a2a3a' : '#f5f0e8';
              var boneStroke = xrayMode ? '#c0d8f0' : '#8895a0';
              var boneHighlight = xrayMode ? '#e8f4ff' : '#e8e0d0';

              // Helper: draw a tapered bone (wider at epiphyses, narrower at diaphysis)
              function drawBone(x1, y1, x2, y2, w1, w2, wMid) {
                if (wMid === undefined) wMid = Math.min(w1, w2) * 0.6;
                var dx = x2 - x1, dy = y2 - y1;
                var len = Math.sqrt(dx * dx + dy * dy);
                var nx = -dy / len, ny = dx / len; // normal
                var mx = (x1 + x2) * 0.5, my = (y1 + y2) * 0.5;
                cCtx.beginPath();
                cCtx.moveTo(x1 + nx * w1, y1 + ny * w1);
                cCtx.quadraticCurveTo(mx + nx * wMid, my + ny * wMid, x2 + nx * w2, y2 + ny * w2);
                cCtx.lineTo(x2 - nx * w2, y2 - ny * w2);
                cCtx.quadraticCurveTo(mx - nx * wMid, my - ny * wMid, x1 - nx * w1, y1 - ny * w1);
                cCtx.closePath();
                var bGrad = cCtx.createLinearGradient(x1 + nx * w1, y1, x1 - nx * w1, y2);
                bGrad.addColorStop(0, boneHighlight); bGrad.addColorStop(0.5, boneFill); bGrad.addColorStop(1, boneHighlight);
                cCtx.fillStyle = bGrad; cCtx.fill();
                cCtx.strokeStyle = boneStroke; cCtx.lineWidth = 0.8; cCtx.stroke();
              }

              // ── Skull (cranium with mandible) ──
              cCtx.beginPath(); cCtx.arc(W * 0.50, H * 0.055, W * 0.046, 0, Math.PI * 2);
              var skullGrad = cCtx.createRadialGradient(W * 0.49, H * 0.048, W * 0.01, W * 0.50, H * 0.055, W * 0.046);
              skullGrad.addColorStop(0, boneHighlight); skullGrad.addColorStop(1, boneFill);
              cCtx.fillStyle = skullGrad; cCtx.fill();
              cCtx.strokeStyle = boneStroke; cCtx.lineWidth = 1.5; cCtx.stroke();
              // Eye sockets
              cCtx.beginPath(); cCtx.ellipse(W * 0.48, H * 0.053, W * 0.008, H * 0.006, 0, 0, Math.PI * 2);
              cCtx.strokeStyle = boneStroke; cCtx.lineWidth = 0.8; cCtx.stroke();
              cCtx.beginPath(); cCtx.ellipse(W * 0.52, H * 0.053, W * 0.008, H * 0.006, 0, 0, Math.PI * 2); cCtx.stroke();
              // Nasal aperture
              cCtx.beginPath(); cCtx.moveTo(W * 0.498, H * 0.063); cCtx.lineTo(W * 0.494, H * 0.072); cCtx.lineTo(W * 0.506, H * 0.072); cCtx.closePath();
              cCtx.strokeStyle = boneStroke; cCtx.lineWidth = 0.6; cCtx.stroke();
              // Mandible (jawbone)
              cCtx.beginPath(); cCtx.moveTo(W * 0.455, H * 0.08);
              cCtx.quadraticCurveTo(W * 0.46, H * 0.10, W * 0.475, H * 0.098);
              cCtx.lineTo(W * 0.525, H * 0.098);
              cCtx.quadraticCurveTo(W * 0.54, H * 0.10, W * 0.545, H * 0.08);
              cCtx.strokeStyle = boneStroke; cCtx.lineWidth = 1.2; cCtx.stroke();
              // Zygomatic arches (cheekbones)
              cCtx.beginPath(); cCtx.moveTo(W * 0.455, H * 0.06); cCtx.quadraticCurveTo(W * 0.44, H * 0.065, W * 0.45, H * 0.075);
              cCtx.strokeStyle = boneStroke; cCtx.lineWidth = 0.7; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.545, H * 0.06); cCtx.quadraticCurveTo(W * 0.56, H * 0.065, W * 0.55, H * 0.075); cCtx.stroke();
              // ── Skull suture lines (cranial joint lines) ──
              cCtx.save(); cCtx.globalAlpha = xrayMode ? 0.4 : 0.2;
              cCtx.setLineDash([1.5, 1.5]);
              // Coronal suture (ear to ear, across top — separates frontal from parietal)
              cCtx.beginPath();
              cCtx.moveTo(W * 0.455, H * 0.045);
              cCtx.quadraticCurveTo(W * 0.48, H * 0.022, W * 0.50, H * 0.018);
              cCtx.quadraticCurveTo(W * 0.52, H * 0.022, W * 0.545, H * 0.045);
              cCtx.strokeStyle = xrayMode ? '#a0c4ff' : boneStroke; cCtx.lineWidth = 0.5; cCtx.stroke();
              // Sagittal suture (midline from coronal to back — separates L/R parietal)
              cCtx.beginPath();
              cCtx.moveTo(W * 0.50, H * 0.018); cCtx.lineTo(W * 0.50, H * 0.035);
              cCtx.stroke();
              // Lambdoid suture (at back of skull — separates parietal from occipital)
              if (view === 'posterior') {
                cCtx.beginPath();
                cCtx.moveTo(W * 0.455, H * 0.065);
                cCtx.quadraticCurveTo(W * 0.48, H * 0.078, W * 0.50, H * 0.080);
                cCtx.quadraticCurveTo(W * 0.52, H * 0.078, W * 0.545, H * 0.065);
                cCtx.stroke();
              }
              // Squamous suture (temporal — side of skull)
              cCtx.beginPath();
              cCtx.moveTo(W * 0.455, H * 0.045); cCtx.quadraticCurveTo(W * 0.45, H * 0.055, W * 0.455, H * 0.065);
              cCtx.stroke();
              cCtx.beginPath();
              cCtx.moveTo(W * 0.545, H * 0.045); cCtx.quadraticCurveTo(W * 0.55, H * 0.055, W * 0.545, H * 0.065);
              cCtx.stroke();
              cCtx.setLineDash([]); cCtx.restore();

              // ── Clavicles (collarbones — new!) ──
              cCtx.beginPath(); cCtx.moveTo(W * 0.47, H * 0.132);
              cCtx.quadraticCurveTo(W * 0.42, H * 0.126, W * 0.34, H * 0.138);
              cCtx.strokeStyle = boneStroke; cCtx.lineWidth = 2.2;
              var clavGrad = cCtx.createLinearGradient(W * 0.47, H * 0.132, W * 0.34, H * 0.138);
              clavGrad.addColorStop(0, boneHighlight); clavGrad.addColorStop(1, boneFill);
              cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.53, H * 0.132);
              cCtx.quadraticCurveTo(W * 0.58, H * 0.126, W * 0.66, H * 0.138);
              cCtx.stroke();

              // ── Spine (vertebral bodies + intervertebral discs) ──
              for (var si = 0; si < 24; si++) {
                var vy = H * (0.11 + si * 0.014);
                var vSize = si < 7 ? 3.0 : si < 19 ? 3.5 : 2.8; // cervical < thoracic/lumbar < sacral
                // Intervertebral disc (between vertebrae — cartilaginous cushion)
                if (si > 0) {
                  var discY = vy - H * 0.007;
                  cCtx.beginPath(); cCtx.roundRect(W * 0.50 - vSize * 0.9, discY, vSize * 1.8, 2, 1);
                  cCtx.fillStyle = xrayMode ? '#1a2a3a80' : '#d4c5b960'; cCtx.fill();
                  cCtx.strokeStyle = xrayMode ? '#4a6080' : '#b8a89860'; cCtx.lineWidth = 0.3; cCtx.stroke();
                }
                // Vertebral body (rounded rect)
                cCtx.beginPath();
                cCtx.roundRect(W * 0.50 - vSize, vy - 2, vSize * 2, 4, 1.5);
                cCtx.fillStyle = boneFill; cCtx.fill();
                cCtx.strokeStyle = boneStroke; cCtx.lineWidth = 0.6; cCtx.stroke();
                // Spinous process (enhanced — small bump in posterior view)
                if (view === 'posterior') {
                  cCtx.beginPath(); cCtx.arc(W * 0.50, vy + 3.5, 1.2, 0, Math.PI * 2);
                  cCtx.fillStyle = boneHighlight; cCtx.fill(); cCtx.strokeStyle = boneStroke; cCtx.lineWidth = 0.3; cCtx.stroke();
                } else {
                  cCtx.beginPath(); cCtx.moveTo(W * 0.50, vy); cCtx.lineTo(W * 0.50, vy + 3);
                  cCtx.strokeStyle = boneStroke; cCtx.lineWidth = 0.5; cCtx.stroke();
                }
              }
              // Sacrum
              cCtx.beginPath();
              cCtx.moveTo(W * 0.485, H * 0.44); cCtx.lineTo(W * 0.515, H * 0.44);
              cCtx.lineTo(W * 0.51, H * 0.46); cCtx.lineTo(W * 0.49, H * 0.46); cCtx.closePath();
              cCtx.fillStyle = boneFill; cCtx.fill(); cCtx.strokeStyle = boneStroke; cCtx.lineWidth = 0.7; cCtx.stroke();

              // ── Vertebral region labels (C/T/L/S brackets) ──
              cCtx.save(); cCtx.globalAlpha = xrayMode ? 0.5 : 0.2;
              cCtx.font = 'bold 5px monospace'; cCtx.textAlign = 'right';
              cCtx.fillStyle = xrayMode ? '#a0c4ff' : '#94a3b8';
              var regLabelX = W * 0.44;
              // Cervical (C1-C7): vertebrae 0-6
              cCtx.fillText('C', regLabelX, H * (0.11 + 3 * 0.014) + 2);
              cCtx.beginPath(); cCtx.moveTo(regLabelX + 2, H * 0.11); cCtx.lineTo(regLabelX + 2, H * (0.11 + 6 * 0.014));
              cCtx.strokeStyle = cCtx.fillStyle; cCtx.lineWidth = 0.3; cCtx.stroke();
              // Thoracic (T1-T12): vertebrae 7-18
              cCtx.fillText('T', regLabelX, H * (0.11 + 12 * 0.014) + 2);
              cCtx.beginPath(); cCtx.moveTo(regLabelX + 2, H * (0.11 + 7 * 0.014)); cCtx.lineTo(regLabelX + 2, H * (0.11 + 18 * 0.014));
              cCtx.stroke();
              // Lumbar (L1-L5): vertebrae 19-23
              cCtx.fillText('L', regLabelX, H * (0.11 + 21 * 0.014) + 2);
              cCtx.beginPath(); cCtx.moveTo(regLabelX + 2, H * (0.11 + 19 * 0.014)); cCtx.lineTo(regLabelX + 2, H * (0.11 + 23 * 0.014));
              cCtx.stroke();
              // Sacral
              cCtx.fillText('S', regLabelX, H * 0.45);
              cCtx.restore();

              // ── Ribs (curved, with costal cartilage) ──
              for (var ri2 = 0; ri2 < 12; ri2++) {
                var ry2 = H * (0.155 + ri2 * 0.018);
                var ribWidth = ri2 < 7 ? 1.2 : 0.8; // true ribs wider, false ribs thinner
                var ribExtent = ri2 < 7 ? 0.16 : ri2 < 10 ? 0.14 : 0.08; // floating ribs shorter
                // Left rib
                cCtx.beginPath(); cCtx.moveTo(W * 0.48, ry2);
                cCtx.quadraticCurveTo(W * (0.48 - ribExtent * 0.6), ry2 + H * 0.008, W * (0.48 - ribExtent), ry2 + H * 0.003);
                cCtx.strokeStyle = boneColor; cCtx.lineWidth = ribWidth; cCtx.stroke();
                // Right rib
                cCtx.beginPath(); cCtx.moveTo(W * 0.52, ry2);
                cCtx.quadraticCurveTo(W * (0.52 + ribExtent * 0.6), ry2 + H * 0.008, W * (0.52 + ribExtent), ry2 + H * 0.003);
                cCtx.stroke();
                // Costal cartilage (dashed, connecting ribs 1-7 to sternum)
                if (ri2 < 7) {
                  cCtx.save(); cCtx.setLineDash([2, 2]);
                  cCtx.beginPath(); cCtx.moveTo(W * 0.48, ry2); cCtx.lineTo(W * 0.49, ry2 + H * 0.005);
                  cCtx.strokeStyle = '#b0bec580'; cCtx.lineWidth = 0.5; cCtx.stroke();
                  cCtx.beginPath(); cCtx.moveTo(W * 0.52, ry2); cCtx.lineTo(W * 0.51, ry2 + H * 0.005); cCtx.stroke();
                  cCtx.restore();
                }
              }
              // Sternum (manubrium + body + xiphoid process)
              drawBone(W * 0.50, H * 0.14, W * 0.50, H * 0.30, 3.5, 2.5, 2);
              // Sternal angle (Angle of Louis — junction of manubrium and sternal body, at 2nd rib level)
              cCtx.beginPath(); cCtx.moveTo(W * 0.495, H * 0.173); cCtx.lineTo(W * 0.505, H * 0.173);
              cCtx.strokeStyle = xrayMode ? '#a0c4ff' : '#78909c'; cCtx.lineWidth = 1; cCtx.stroke();
              // Rib count labels (tiny numbers 1-12)
              cCtx.save(); cCtx.globalAlpha = xrayMode ? 0.5 : 0.25;
              cCtx.font = 'bold 4px monospace'; cCtx.textAlign = 'right';
              cCtx.fillStyle = boneColor;
              for (var rcl = 0; rcl < 12; rcl++) {
                var rclY = H * (0.155 + rcl * 0.018) + H * 0.004;
                var rclExtent = rcl < 7 ? 0.16 : rcl < 10 ? 0.14 : 0.08;
                cCtx.fillText(String(rcl + 1), W * (0.48 - rclExtent) - 2, rclY);
              }
              cCtx.restore();

              // ── Pelvis (iliac crests, pubic symphysis) ──
              cCtx.beginPath();
              cCtx.moveTo(W * 0.40, H * 0.39);
              cCtx.quadraticCurveTo(W * 0.36, H * 0.41, W * 0.37, H * 0.44);
              cCtx.quadraticCurveTo(W * 0.40, H * 0.46, W * 0.46, H * 0.455);
              cCtx.lineTo(W * 0.50, H * 0.46);
              cCtx.lineTo(W * 0.54, H * 0.455);
              cCtx.quadraticCurveTo(W * 0.60, H * 0.46, W * 0.63, H * 0.44);
              cCtx.quadraticCurveTo(W * 0.64, H * 0.41, W * 0.60, H * 0.39);
              var pelvisGrad = cCtx.createLinearGradient(W * 0.36, H * 0.39, W * 0.64, H * 0.46);
              pelvisGrad.addColorStop(0, boneHighlight); pelvisGrad.addColorStop(0.5, boneFill); pelvisGrad.addColorStop(1, boneHighlight);
              cCtx.fillStyle = pelvisGrad; cCtx.fill();
              cCtx.strokeStyle = boneStroke; cCtx.lineWidth = 1.8; cCtx.stroke();
              // Obturator foramina
              cCtx.beginPath(); cCtx.ellipse(W * 0.44, H * 0.445, W * 0.015, H * 0.01, 0, 0, Math.PI * 2);
              cCtx.strokeStyle = boneStroke; cCtx.lineWidth = 0.6; cCtx.stroke();
              cCtx.beginPath(); cCtx.ellipse(W * 0.56, H * 0.445, W * 0.015, H * 0.01, 0, 0, Math.PI * 2); cCtx.stroke();

              // ── Scapulae (shoulder blades — visible in both views) ──
              cCtx.beginPath(); cCtx.moveTo(W * 0.42, H * 0.138);
              cCtx.quadraticCurveTo(W * 0.36, H * 0.132, W * 0.30, H * 0.145);
              cCtx.strokeStyle = boneStroke; cCtx.lineWidth = 1.5; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.58, H * 0.138);
              cCtx.quadraticCurveTo(W * 0.64, H * 0.132, W * 0.70, H * 0.145); cCtx.stroke();

              // ── Long bones: tapered with joint bulges ──
              // Femurs (thigh) — widest bones
              drawBone(W * 0.44, H * 0.46, W * 0.40, H * 0.66, 5, 4.5, 3);
              drawBone(W * 0.56, H * 0.46, W * 0.60, H * 0.66, 5, 4.5, 3);
              // Patellae (kneecaps — new!)
              cCtx.beginPath(); cCtx.ellipse(W * 0.395, H * 0.675, 4, 5, 0, 0, Math.PI * 2);
              cCtx.fillStyle = boneFill; cCtx.fill(); cCtx.strokeStyle = boneStroke; cCtx.lineWidth = 0.8; cCtx.stroke();
              cCtx.beginPath(); cCtx.ellipse(W * 0.605, H * 0.675, 4, 5, 0, 0, Math.PI * 2);
              cCtx.fillStyle = boneFill; cCtx.fill(); cCtx.strokeStyle = boneStroke; cCtx.lineWidth = 0.8; cCtx.stroke();
              // Tibia + Fibula (lower leg — two parallel bones)
              drawBone(W * 0.40, H * 0.69, W * 0.37, H * 0.90, 4, 3, 2.2);
              drawBone(W * 0.41, H * 0.69, W * 0.39, H * 0.90, 2, 1.5, 1);
              drawBone(W * 0.60, H * 0.69, W * 0.63, H * 0.90, 4, 3, 2.2);
              drawBone(W * 0.59, H * 0.69, W * 0.61, H * 0.90, 2, 1.5, 1);
              // Humerus (upper arm)
              drawBone(W * 0.30, H * 0.16, W * 0.22, H * 0.34, 4, 3.5, 2.5);
              drawBone(W * 0.70, H * 0.16, W * 0.78, H * 0.34, 4, 3.5, 2.5);
              // Radius + Ulna (forearm — two parallel bones)
              drawBone(W * 0.22, H * 0.35, W * 0.17, H * 0.46, 3, 2.5, 1.5);
              drawBone(W * 0.23, H * 0.35, W * 0.18, H * 0.46, 2, 1.5, 1);
              drawBone(W * 0.78, H * 0.35, W * 0.83, H * 0.46, 3, 2.5, 1.5);
              drawBone(W * 0.77, H * 0.35, W * 0.82, H * 0.46, 2, 1.5, 1);

              // ── Hand bones (metacarpals + phalanges) ──
              // Left hand — 5 metacarpals radiating from wrist
              var lhBase = [[0.165, 0.46], [0.16, 0.46], [0.155, 0.46], [0.15, 0.46], [0.145, 0.46]]; // wrist
              var lhMeta = [[0.14, 0.455], [0.145, 0.452], [0.152, 0.452], [0.158, 0.455], [0.135, 0.462]]; // metacarpal tips
              var lhTip =  [[0.128, 0.448], [0.136, 0.443], [0.147, 0.443], [0.157, 0.448], [0.122, 0.458]]; // fingertips
              for (var mci = 0; mci < 5; mci++) {
                // Metacarpal
                cCtx.beginPath(); cCtx.moveTo(W * lhBase[mci][0], H * lhBase[mci][1]);
                cCtx.lineTo(W * lhMeta[mci][0], H * lhMeta[mci][1]);
                cCtx.strokeStyle = boneColor; cCtx.lineWidth = mci === 4 ? 1.2 : 0.8; cCtx.stroke();
                // Phalanges
                cCtx.beginPath(); cCtx.moveTo(W * lhMeta[mci][0], H * lhMeta[mci][1]);
                cCtx.lineTo(W * lhTip[mci][0], H * lhTip[mci][1]);
                cCtx.strokeStyle = boneColor; cCtx.lineWidth = 0.5; cCtx.stroke();
                // Knuckle joint dot
                cCtx.beginPath(); cCtx.arc(W * lhMeta[mci][0], H * lhMeta[mci][1], 1, 0, Math.PI * 2);
                cCtx.fillStyle = boneColor; cCtx.fill();
              }
              // Right hand (mirror)
              var rhBase = [[0.835, 0.46], [0.84, 0.46], [0.845, 0.46], [0.85, 0.46], [0.855, 0.46]];
              var rhMeta = [[0.86, 0.455], [0.855, 0.452], [0.848, 0.452], [0.842, 0.455], [0.865, 0.462]];
              var rhTip =  [[0.872, 0.448], [0.864, 0.443], [0.853, 0.443], [0.843, 0.448], [0.878, 0.458]];
              for (var mci2 = 0; mci2 < 5; mci2++) {
                cCtx.beginPath(); cCtx.moveTo(W * rhBase[mci2][0], H * rhBase[mci2][1]);
                cCtx.lineTo(W * rhMeta[mci2][0], H * rhMeta[mci2][1]);
                cCtx.strokeStyle = boneColor; cCtx.lineWidth = mci2 === 4 ? 1.2 : 0.8; cCtx.stroke();
                cCtx.beginPath(); cCtx.moveTo(W * rhMeta[mci2][0], H * rhMeta[mci2][1]);
                cCtx.lineTo(W * rhTip[mci2][0], H * rhTip[mci2][1]);
                cCtx.strokeStyle = boneColor; cCtx.lineWidth = 0.5; cCtx.stroke();
                cCtx.beginPath(); cCtx.arc(W * rhMeta[mci2][0], H * rhMeta[mci2][1], 1, 0, Math.PI * 2);
                cCtx.fillStyle = boneColor; cCtx.fill();
              }
              // ── Foot bones (tarsals + metatarsals + phalanges) ──
              // Left foot — tarsal block + 5 metatarsals
              cCtx.beginPath(); cCtx.roundRect(W * 0.34, H * 0.925, W * 0.04, H * 0.015, 2);
              cCtx.fillStyle = boneFill; cCtx.fill(); cCtx.strokeStyle = boneStroke; cCtx.lineWidth = 0.5; cCtx.stroke();
              var lfMetaX = [0.30, 0.32, 0.34, 0.36, 0.38];
              for (var ftm = 0; ftm < 5; ftm++) {
                cCtx.beginPath(); cCtx.moveTo(W * (0.34 + ftm * 0.008), H * 0.938);
                cCtx.lineTo(W * lfMetaX[ftm], H * 0.955);
                cCtx.strokeStyle = boneColor; cCtx.lineWidth = 0.6; cCtx.stroke();
                // Toe phalanx
                cCtx.beginPath(); cCtx.moveTo(W * lfMetaX[ftm], H * 0.955);
                cCtx.lineTo(W * lfMetaX[ftm], H * 0.96);
                cCtx.strokeStyle = boneColor; cCtx.lineWidth = 0.4; cCtx.stroke();
              }
              // Right foot (mirror)
              cCtx.beginPath(); cCtx.roundRect(W * 0.62, H * 0.925, W * 0.04, H * 0.015, 2);
              cCtx.fillStyle = boneFill; cCtx.fill(); cCtx.strokeStyle = boneStroke; cCtx.lineWidth = 0.5; cCtx.stroke();
              var rfMetaX = [0.70, 0.68, 0.66, 0.64, 0.62];
              for (var ftm2 = 0; ftm2 < 5; ftm2++) {
                cCtx.beginPath(); cCtx.moveTo(W * (0.66 - ftm2 * 0.008), H * 0.938);
                cCtx.lineTo(W * rfMetaX[ftm2], H * 0.955);
                cCtx.strokeStyle = boneColor; cCtx.lineWidth = 0.6; cCtx.stroke();
                cCtx.beginPath(); cCtx.moveTo(W * rfMetaX[ftm2], H * 0.955);
                cCtx.lineTo(W * rfMetaX[ftm2], H * 0.96);
                cCtx.strokeStyle = boneColor; cCtx.lineWidth = 0.4; cCtx.stroke();
              }

              // ── Posterior view extras ──
              if (view === 'posterior') {
                // Scapulae (triangle shape — more prominent from back)
                cCtx.beginPath(); cCtx.moveTo(W * 0.40, H * 0.16); cCtx.lineTo(W * 0.37, H * 0.24); cCtx.lineTo(W * 0.44, H * 0.26); cCtx.closePath();
                cCtx.fillStyle = boneFill; cCtx.fill();
                cCtx.strokeStyle = boneStroke; cCtx.lineWidth = 1.2; cCtx.stroke();
                // Scapular spine
                cCtx.beginPath(); cCtx.moveTo(W * 0.40, H * 0.175); cCtx.lineTo(W * 0.44, H * 0.20);
                cCtx.strokeStyle = boneStroke; cCtx.lineWidth = 0.8; cCtx.stroke();
                cCtx.beginPath(); cCtx.moveTo(W * 0.60, H * 0.16); cCtx.lineTo(W * 0.63, H * 0.24); cCtx.lineTo(W * 0.56, H * 0.26); cCtx.closePath();
                cCtx.fillStyle = boneFill; cCtx.fill();
                cCtx.strokeStyle = boneStroke; cCtx.lineWidth = 1.2; cCtx.stroke();
                cCtx.beginPath(); cCtx.moveTo(W * 0.60, H * 0.175); cCtx.lineTo(W * 0.56, H * 0.20); cCtx.stroke();
              }
              cCtx.restore();
            }

            // ── MUSCULAR LAYER (with fiber texturing) ──
            // Helper: draw muscle fiber lines inside a muscle shape (must call after filling the muscle path)
            function drawFibers(cx, cy, rx, ry, angle, count) {
              cCtx.save(); cCtx.globalAlpha = 0.15;
              cCtx.translate(cx, cy); cCtx.rotate(angle || 0);
              for (var fi = 0; fi < (count || 4); fi++) {
                var offset = (fi - (count || 4) / 2 + 0.5) * (rx * 0.35);
                cCtx.beginPath(); cCtx.moveTo(offset, -ry * 0.8); cCtx.lineTo(offset, ry * 0.8);
                cCtx.strokeStyle = '#991b1b'; cCtx.lineWidth = 0.5; cCtx.stroke();
              }
              cCtx.restore();
            }
            if (layerOn('muscular')) {
              cCtx.save(); cCtx.globalAlpha = 0.40;
              if (view === 'posterior') {
                // Trapezius
                cCtx.beginPath(); cCtx.moveTo(W * 0.50, H * 0.10);
                cCtx.quadraticCurveTo(W * 0.40, H * 0.13, W * 0.34, H * 0.15);
                cCtx.quadraticCurveTo(W * 0.38, H * 0.20, W * 0.46, H * 0.24);
                cCtx.lineTo(W * 0.54, H * 0.24);
                cCtx.quadraticCurveTo(W * 0.62, H * 0.20, W * 0.66, H * 0.15);
                cCtx.quadraticCurveTo(W * 0.60, H * 0.13, W * 0.50, H * 0.10);
                cCtx.fillStyle = '#fecaca'; cCtx.fill(); cCtx.strokeStyle = '#dc2626'; cCtx.lineWidth = 0.8; cCtx.stroke();
                // Lats
                cCtx.beginPath(); cCtx.moveTo(W * 0.44, H * 0.22); cCtx.quadraticCurveTo(W * 0.36, H * 0.28, W * 0.38, H * 0.38);
                cCtx.quadraticCurveTo(W * 0.42, H * 0.40, W * 0.48, H * 0.36);
                cCtx.fillStyle = '#fecaca'; cCtx.fill(); cCtx.strokeStyle = '#dc2626'; cCtx.lineWidth = 0.7; cCtx.stroke();
                cCtx.beginPath(); cCtx.moveTo(W * 0.56, H * 0.22); cCtx.quadraticCurveTo(W * 0.64, H * 0.28, W * 0.62, H * 0.38);
                cCtx.quadraticCurveTo(W * 0.58, H * 0.40, W * 0.52, H * 0.36);
                cCtx.fillStyle = '#fecaca'; cCtx.fill(); cCtx.strokeStyle = '#dc2626'; cCtx.lineWidth = 0.7; cCtx.stroke();
                // Glutes
                cCtx.beginPath(); cCtx.ellipse(W * 0.43, H * 0.44, W * 0.04, H * 0.03, 0, 0, Math.PI * 2);
                cCtx.fillStyle = '#fecaca'; cCtx.fill(); cCtx.strokeStyle = '#dc2626'; cCtx.lineWidth = 0.8; cCtx.stroke();
                cCtx.beginPath(); cCtx.ellipse(W * 0.57, H * 0.44, W * 0.04, H * 0.03, 0, 0, Math.PI * 2);
                cCtx.fillStyle = '#fecaca'; cCtx.fill(); cCtx.strokeStyle = '#dc2626'; cCtx.lineWidth = 0.8; cCtx.stroke();
                // Hamstrings
                cCtx.beginPath(); cCtx.ellipse(W * 0.41, H * 0.56, W * 0.025, H * 0.06, 0.05, 0, Math.PI * 2); cCtx.fillStyle = '#fecaca'; cCtx.fill(); cCtx.strokeStyle = '#dc2626'; cCtx.lineWidth = 0.7; cCtx.stroke();
                cCtx.beginPath(); cCtx.ellipse(W * 0.59, H * 0.56, W * 0.025, H * 0.06, -0.05, 0, Math.PI * 2); cCtx.fillStyle = '#fecaca'; cCtx.fill(); cCtx.stroke();
                // ── Enhanced posterior muscles ──
                // Erector spinae (paraspinal columns — 3 columns each side)
                for (var esi = 0; esi < 3; esi++) {
                  var esOff = (esi - 1) * W * 0.012;
                  cCtx.beginPath(); cCtx.moveTo(W * 0.48 + esOff, H * 0.14); cCtx.lineTo(W * 0.48 + esOff, H * 0.42);
                  cCtx.strokeStyle = '#fca5a5'; cCtx.lineWidth = 2.5; cCtx.stroke();
                  cCtx.beginPath(); cCtx.moveTo(W * 0.52 - esOff, H * 0.14); cCtx.lineTo(W * 0.52 - esOff, H * 0.42); cCtx.stroke();
                }
                // Rhomboids (between scapulae and spine)
                cCtx.beginPath();
                cCtx.moveTo(W * 0.48, H * 0.18); cCtx.lineTo(W * 0.42, H * 0.20);
                cCtx.lineTo(W * 0.42, H * 0.26); cCtx.lineTo(W * 0.47, H * 0.24); cCtx.closePath();
                cCtx.fillStyle = '#fecaca80'; cCtx.fill(); cCtx.strokeStyle = '#dc2626'; cCtx.lineWidth = 0.6; cCtx.stroke();
                cCtx.beginPath();
                cCtx.moveTo(W * 0.52, H * 0.18); cCtx.lineTo(W * 0.58, H * 0.20);
                cCtx.lineTo(W * 0.58, H * 0.26); cCtx.lineTo(W * 0.53, H * 0.24); cCtx.closePath();
                cCtx.fillStyle = '#fecaca80'; cCtx.fill(); cCtx.strokeStyle = '#dc2626'; cCtx.lineWidth = 0.6; cCtx.stroke();
                // Infraspinatus (rotator cuff — on scapula below spine)
                cCtx.beginPath(); cCtx.ellipse(W * 0.40, H * 0.23, W * 0.02, H * 0.018, -0.2, 0, Math.PI * 2);
                cCtx.fillStyle = '#fed7aa60'; cCtx.fill(); cCtx.strokeStyle = '#ea580c'; cCtx.lineWidth = 0.5; cCtx.stroke();
                cCtx.beginPath(); cCtx.ellipse(W * 0.60, H * 0.23, W * 0.02, H * 0.018, 0.2, 0, Math.PI * 2);
                cCtx.fillStyle = '#fed7aa60'; cCtx.fill(); cCtx.strokeStyle = '#ea580c'; cCtx.lineWidth = 0.5; cCtx.stroke();
                // Gluteus medius (lateral hip — fan shape above glutes)
                cCtx.beginPath(); cCtx.moveTo(W * 0.40, H * 0.41);
                cCtx.quadraticCurveTo(W * 0.37, H * 0.42, W * 0.38, H * 0.44);
                cCtx.quadraticCurveTo(W * 0.40, H * 0.45, W * 0.43, H * 0.43); cCtx.closePath();
                cCtx.fillStyle = '#fecaca60'; cCtx.fill(); cCtx.strokeStyle = '#dc2626'; cCtx.lineWidth = 0.5; cCtx.stroke();
                cCtx.beginPath(); cCtx.moveTo(W * 0.60, H * 0.41);
                cCtx.quadraticCurveTo(W * 0.63, H * 0.42, W * 0.62, H * 0.44);
                cCtx.quadraticCurveTo(W * 0.60, H * 0.45, W * 0.57, H * 0.43); cCtx.closePath();
                cCtx.fillStyle = '#fecaca60'; cCtx.fill(); cCtx.strokeStyle = '#dc2626'; cCtx.lineWidth = 0.5; cCtx.stroke();
                // Posterior deltoid (rounded cap on back of shoulder)
                cCtx.beginPath(); cCtx.ellipse(W * 0.33, H * 0.16, W * 0.022, H * 0.015, -0.3, 0, Math.PI * 2);
                cCtx.fillStyle = '#fecaca80'; cCtx.fill(); cCtx.strokeStyle = '#dc2626'; cCtx.lineWidth = 0.5; cCtx.stroke();
                cCtx.beginPath(); cCtx.ellipse(W * 0.67, H * 0.16, W * 0.022, H * 0.015, 0.3, 0, Math.PI * 2);
                cCtx.fillStyle = '#fecaca80'; cCtx.fill(); cCtx.stroke();
                // Triceps (posterior upper arm)
                cCtx.beginPath(); cCtx.ellipse(W * 0.27, H * 0.27, W * 0.015, H * 0.035, 0.4, 0, Math.PI * 2);
                cCtx.fillStyle = '#fecaca'; cCtx.fill(); cCtx.strokeStyle = '#dc2626'; cCtx.lineWidth = 0.7; cCtx.stroke();
                cCtx.beginPath(); cCtx.ellipse(W * 0.73, H * 0.27, W * 0.015, H * 0.035, -0.4, 0, Math.PI * 2);
                cCtx.fillStyle = '#fecaca'; cCtx.fill(); cCtx.stroke();
              } else {
                cCtx.beginPath(); cCtx.moveTo(W * 0.37, H * 0.14); cCtx.quadraticCurveTo(W * 0.42, H * 0.20, W * 0.49, H * 0.20); cCtx.quadraticCurveTo(W * 0.46, H * 0.17, W * 0.37, H * 0.14);
                cCtx.fillStyle = '#fca5a5'; cCtx.fill(); cCtx.strokeStyle = '#dc2626'; cCtx.lineWidth = 1.2; cCtx.stroke();
                cCtx.beginPath(); cCtx.moveTo(W * 0.63, H * 0.14); cCtx.quadraticCurveTo(W * 0.58, H * 0.20, W * 0.51, H * 0.20); cCtx.quadraticCurveTo(W * 0.54, H * 0.17, W * 0.63, H * 0.14);
                cCtx.fillStyle = '#fca5a5'; cCtx.fill(); cCtx.strokeStyle = '#dc2626'; cCtx.lineWidth = 1.2; cCtx.stroke();
                cCtx.beginPath(); cCtx.ellipse(W * 0.30, H * 0.16, W * 0.04, H * 0.022, -0.3, 0, Math.PI * 2);
                cCtx.fillStyle = '#fecaca'; cCtx.fill(); cCtx.strokeStyle = '#dc2626'; cCtx.lineWidth = 0.8; cCtx.stroke();
                cCtx.beginPath(); cCtx.ellipse(W * 0.70, H * 0.16, W * 0.04, H * 0.022, 0.3, 0, Math.PI * 2);
                cCtx.fillStyle = '#fecaca'; cCtx.fill(); cCtx.strokeStyle = '#dc2626'; cCtx.lineWidth = 0.8; cCtx.stroke();
                for (var mi = 0; mi < 4; mi++) { var my = H * (0.28 + mi * 0.03); cCtx.beginPath(); cCtx.moveTo(W * 0.45, my); cCtx.lineTo(W * 0.55, my); cCtx.strokeStyle = '#dc2626'; cCtx.lineWidth = 1; cCtx.stroke(); }
                cCtx.beginPath(); cCtx.moveTo(W * 0.50, H * 0.22); cCtx.lineTo(W * 0.50, H * 0.40); cCtx.strokeStyle = '#dc2626'; cCtx.lineWidth = 0.8; cCtx.stroke();
                cCtx.beginPath(); cCtx.ellipse(W * 0.41, H * 0.54, W * 0.028, H * 0.07, 0.08, 0, Math.PI * 2); cCtx.fillStyle = '#fecaca'; cCtx.fill(); cCtx.strokeStyle = '#dc2626'; cCtx.lineWidth = 0.8; cCtx.stroke();
                cCtx.beginPath(); cCtx.ellipse(W * 0.59, H * 0.54, W * 0.028, H * 0.07, -0.08, 0, Math.PI * 2); cCtx.fillStyle = '#fecaca'; cCtx.fill(); cCtx.strokeStyle = '#dc2626'; cCtx.lineWidth = 0.8; cCtx.stroke();
                cCtx.beginPath(); cCtx.ellipse(W * 0.25, H * 0.27, W * 0.016, H * 0.035, 0.5, 0, Math.PI * 2); cCtx.fillStyle = '#fecaca'; cCtx.fill(); cCtx.strokeStyle = '#dc2626'; cCtx.lineWidth = 0.8; cCtx.stroke();
                cCtx.beginPath(); cCtx.ellipse(W * 0.75, H * 0.27, W * 0.016, H * 0.035, -0.5, 0, Math.PI * 2); cCtx.fillStyle = '#fecaca'; cCtx.fill(); cCtx.strokeStyle = '#dc2626'; cCtx.lineWidth = 0.8; cCtx.stroke();
              }
              cCtx.beginPath(); cCtx.ellipse(W * 0.38, H * 0.77, W * 0.018, H * 0.04, 0.05, 0, Math.PI * 2); cCtx.fillStyle = '#fecaca'; cCtx.fill(); cCtx.strokeStyle = '#dc2626'; cCtx.lineWidth = 0.8; cCtx.stroke();
              cCtx.beginPath(); cCtx.ellipse(W * 0.62, H * 0.77, W * 0.018, H * 0.04, -0.05, 0, Math.PI * 2); cCtx.fillStyle = '#fecaca'; cCtx.fill(); cCtx.strokeStyle = '#dc2626'; cCtx.lineWidth = 0.8; cCtx.stroke();
              // ── Muscle fiber textures (directional striations) ──
              if (view !== 'posterior') {
                // Pectorals — diagonal fibers
                drawFibers(W * 0.43, H * 0.17, W * 0.06, H * 0.03, -0.3, 5);
                drawFibers(W * 0.57, H * 0.17, W * 0.06, H * 0.03, 0.3, 5);
                // Deltoids — vertical fibers
                drawFibers(W * 0.30, H * 0.16, W * 0.02, H * 0.025, -0.3, 3);
                drawFibers(W * 0.70, H * 0.16, W * 0.02, H * 0.025, 0.3, 3);
                // Quadriceps — vertical fibers
                drawFibers(W * 0.41, H * 0.54, W * 0.028, H * 0.07, 0.08, 5);
                drawFibers(W * 0.59, H * 0.54, W * 0.028, H * 0.07, -0.08, 5);
                // Biceps — vertical fibers along arm angle
                drawFibers(W * 0.25, H * 0.27, W * 0.016, H * 0.035, 0.5, 3);
                drawFibers(W * 0.75, H * 0.27, W * 0.016, H * 0.035, -0.5, 3);
              }
              // Calves — vertical fibers
              drawFibers(W * 0.38, H * 0.77, W * 0.018, H * 0.04, 0.05, 3);
              drawFibers(W * 0.62, H * 0.77, W * 0.018, H * 0.04, -0.05, 3);
              // ── Tendon attachments (white/cream lines at muscle ends) ──
              cCtx.save(); cCtx.globalAlpha = 0.25;
              // Patellar tendon (quads → tibia via patella)
              cCtx.beginPath(); cCtx.moveTo(W * 0.41, H * 0.61); cCtx.lineTo(W * 0.40, H * 0.66);
              cCtx.strokeStyle = '#f5f0e0'; cCtx.lineWidth = 1.5; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.59, H * 0.61); cCtx.lineTo(W * 0.60, H * 0.66); cCtx.stroke();
              // Achilles tendon (calf → calcaneus)
              cCtx.beginPath(); cCtx.moveTo(W * 0.38, H * 0.81); cCtx.lineTo(W * 0.37, H * 0.92);
              cCtx.strokeStyle = '#f5f0e0'; cCtx.lineWidth = 1.2; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.62, H * 0.81); cCtx.lineTo(W * 0.63, H * 0.92); cCtx.stroke();
              // Biceps tendon (bicep → radius)
              if (view !== 'posterior') {
                cCtx.beginPath(); cCtx.moveTo(W * 0.25, H * 0.305); cCtx.lineTo(W * 0.23, H * 0.34);
                cCtx.strokeStyle = '#f5f0e0'; cCtx.lineWidth = 1; cCtx.stroke();
                cCtx.beginPath(); cCtx.moveTo(W * 0.75, H * 0.305); cCtx.lineTo(W * 0.77, H * 0.34); cCtx.stroke();
                // Deltoid insertion (deltoid → deltoid tuberosity of humerus)
                cCtx.beginPath(); cCtx.moveTo(W * 0.30, H * 0.18); cCtx.lineTo(W * 0.28, H * 0.21);
                cCtx.strokeStyle = '#f5f0e0'; cCtx.lineWidth = 0.8; cCtx.stroke();
                cCtx.beginPath(); cCtx.moveTo(W * 0.70, H * 0.18); cCtx.lineTo(W * 0.72, H * 0.21); cCtx.stroke();
              }
              cCtx.restore();
              cCtx.restore();
            }

            // ── ORGAN LAYER (with breathing animation + enhanced anatomical detail) ──
            if (layerOn('organs')) {
              cCtx.save(); cCtx.globalAlpha = 0.55;
              var breathCycle = 1.0 + Math.sin(anatTick * 0.03) * 0.06;

              // ── Lungs (anatomical shape: wider base, narrower apex, medial cardiac notch) ──
              function drawLung(cx, cy, flipX) {
                var s = flipX ? -1 : 1;
                cCtx.save(); cCtx.translate(cx, cy); cCtx.scale(breathCycle, breathCycle);
                cCtx.beginPath();
                cCtx.moveTo(0, -H * 0.04); // apex
                cCtx.quadraticCurveTo(s * W * 0.06, -H * 0.035, s * W * 0.065, H * 0.01); // lateral wall
                cCtx.quadraticCurveTo(s * W * 0.06, H * 0.05, s * W * 0.01, H * 0.055); // base
                cCtx.quadraticCurveTo(0, H * 0.04, 0, H * 0.01); // medial wall (cardiac notch on left)
                cCtx.closePath();
                var lungGrad = cCtx.createRadialGradient(s * W * 0.02, 0, W * 0.01, s * W * 0.02, 0, W * 0.07);
                lungGrad.addColorStop(0, '#dbeafe'); lungGrad.addColorStop(1, '#93c5fd40');
                cCtx.fillStyle = lungGrad; cCtx.fill();
                cCtx.strokeStyle = '#3b82f6'; cCtx.lineWidth = 1; cCtx.stroke();
                // Bronchial branches inside lung
                cCtx.globalAlpha = 0.3;
                cCtx.beginPath(); cCtx.moveTo(0, -H * 0.01); cCtx.lineTo(s * W * 0.03, H * 0.02);
                cCtx.moveTo(s * W * 0.015, H * 0.005); cCtx.lineTo(s * W * 0.04, -H * 0.01);
                cCtx.moveTo(s * W * 0.015, H * 0.005); cCtx.lineTo(s * W * 0.045, H * 0.035);
                cCtx.moveTo(s * W * 0.03, H * 0.02); cCtx.lineTo(s * W * 0.05, H * 0.01);
                cCtx.strokeStyle = '#60a5fa'; cCtx.lineWidth = 0.6; cCtx.stroke();
                cCtx.globalAlpha = 0.55;
                // Lobe fissures
                cCtx.beginPath(); cCtx.moveTo(0, H * 0.005);
                cCtx.quadraticCurveTo(s * W * 0.03, H * 0.01, s * W * 0.06, H * 0.02);
                cCtx.strokeStyle = '#3b82f660'; cCtx.lineWidth = 0.5; cCtx.stroke();
                cCtx.restore();
              }
              drawLung(W * 0.42, H * 0.22, false); // left lung
              drawLung(W * 0.58, H * 0.22, true);  // right lung

              // ── Heart (with chamber detail) ──
              var hx = W * 0.50, hy = H * 0.24;
              cCtx.beginPath();
              cCtx.moveTo(hx, hy + 6); cCtx.bezierCurveTo(hx - 8, hy - 4, hx - 14, hy, hx - 14, hy + 6); cCtx.bezierCurveTo(hx - 14, hy + 12, hx - 4, hy + 18, hx, hy + 22); cCtx.bezierCurveTo(hx + 4, hy + 18, hx + 14, hy + 12, hx + 14, hy + 6); cCtx.bezierCurveTo(hx + 14, hy, hx + 8, hy - 4, hx, hy + 6);
              var heartGrad = cCtx.createRadialGradient(hx - 2, hy + 8, 2, hx, hy + 10, 16);
              heartGrad.addColorStop(0, '#fca5a5'); heartGrad.addColorStop(1, '#ef444480');
              cCtx.fillStyle = heartGrad; cCtx.fill(); cCtx.strokeStyle = '#ef4444'; cCtx.lineWidth = 1; cCtx.stroke();
              // Interventricular septum
              cCtx.beginPath(); cCtx.moveTo(hx, hy + 4); cCtx.lineTo(hx + 1, hy + 20);
              cCtx.strokeStyle = '#dc262660'; cCtx.lineWidth = 0.8; cCtx.stroke();
              // Aortic arch
              cCtx.beginPath(); cCtx.moveTo(hx + 2, hy + 3);
              cCtx.quadraticCurveTo(hx + 6, hy - 6, hx + 14, hy - 4);
              cCtx.quadraticCurveTo(hx + 18, hy - 2, hx + 16, hy + 6);
              cCtx.strokeStyle = '#ef4444'; cCtx.lineWidth = 2; cCtx.stroke();

              // ── Liver (right lobe larger, left lobe smaller, falciform ligament) ──
              cCtx.beginPath();
              cCtx.moveTo(W * 0.52, H * 0.295); // midline
              cCtx.quadraticCurveTo(W * 0.58, H * 0.29, W * 0.62, H * 0.30);
              cCtx.quadraticCurveTo(W * 0.63, H * 0.32, W * 0.58, H * 0.33);
              cCtx.quadraticCurveTo(W * 0.54, H * 0.335, W * 0.52, H * 0.325);
              cCtx.closePath();
              cCtx.fillStyle = '#a1887f'; cCtx.fill(); cCtx.strokeStyle = '#795548'; cCtx.lineWidth = 0.8; cCtx.stroke();
              // Left lobe (smaller)
              cCtx.beginPath();
              cCtx.moveTo(W * 0.52, H * 0.295);
              cCtx.quadraticCurveTo(W * 0.48, H * 0.29, W * 0.46, H * 0.305);
              cCtx.quadraticCurveTo(W * 0.48, H * 0.32, W * 0.52, H * 0.325);
              cCtx.closePath();
              cCtx.fillStyle = '#8d6e63'; cCtx.fill(); cCtx.strokeStyle = '#795548'; cCtx.lineWidth = 0.6; cCtx.stroke();
              // Falciform ligament
              cCtx.beginPath(); cCtx.moveTo(W * 0.52, H * 0.295); cCtx.lineTo(W * 0.52, H * 0.325);
              cCtx.strokeStyle = '#5d4037'; cCtx.lineWidth = 0.5; cCtx.stroke();

              // ── Stomach (with rugae folds + greater/lesser curvature) ──
              cCtx.beginPath();
              cCtx.moveTo(W * 0.48, H * 0.30); // cardia
              cCtx.quadraticCurveTo(W * 0.44, H * 0.305, W * 0.425, H * 0.33); // greater curvature
              cCtx.quadraticCurveTo(W * 0.43, H * 0.355, W * 0.46, H * 0.36); // pylorus
              cCtx.quadraticCurveTo(W * 0.48, H * 0.35, W * 0.48, H * 0.33); // lesser curvature
              cCtx.quadraticCurveTo(W * 0.48, H * 0.31, W * 0.48, H * 0.30);
              var stomGrad = cCtx.createLinearGradient(W * 0.42, H * 0.30, W * 0.48, H * 0.36);
              stomGrad.addColorStop(0, '#c8e6c9'); stomGrad.addColorStop(1, '#a5d6a780');
              cCtx.fillStyle = stomGrad; cCtx.fill(); cCtx.strokeStyle = '#43a047'; cCtx.lineWidth = 0.8; cCtx.stroke();
              // Rugae folds (wavy internal lines)
              cCtx.save(); cCtx.globalAlpha = 0.25;
              for (var rgi = 0; rgi < 3; rgi++) {
                var rgY = H * (0.315 + rgi * 0.012);
                cCtx.beginPath(); cCtx.moveTo(W * 0.44, rgY);
                cCtx.quadraticCurveTo(W * 0.45, rgY - H * 0.003, W * 0.46, rgY);
                cCtx.quadraticCurveTo(W * 0.47, rgY + H * 0.003, W * 0.48, rgY);
                cCtx.strokeStyle = '#388e3c'; cCtx.lineWidth = 0.4; cCtx.stroke();
              }
              cCtx.restore();

              // ── Kidneys (with cortex/medulla/pelvis internal structure) ──
              function drawKidney(kx, ky, flipX) {
                var s = flipX ? -1 : 1;
                // Outer kidney shape (cortex — darker outer zone)
                cCtx.beginPath(); cCtx.ellipse(kx, ky, W * 0.015, H * 0.022, 0, 0, Math.PI * 2);
                var kGradOuter = cCtx.createRadialGradient(kx, ky, W * 0.005, kx, ky, W * 0.015);
                kGradOuter.addColorStop(0, '#ef9a9a'); kGradOuter.addColorStop(1, '#c6282880');
                cCtx.fillStyle = kGradOuter; cCtx.fill(); cCtx.strokeStyle = '#c62828'; cCtx.lineWidth = 0.7; cCtx.stroke();
                // Medulla (inner lighter zone — medullary pyramids)
                cCtx.beginPath(); cCtx.ellipse(kx, ky, W * 0.009, H * 0.014, 0, 0, Math.PI * 2);
                cCtx.fillStyle = '#ffcdd280'; cCtx.fill(); cCtx.strokeStyle = '#e5737350'; cCtx.lineWidth = 0.3; cCtx.stroke();
                // Renal pyramids (triangular shapes in medulla, pointing toward pelvis)
                cCtx.save(); cCtx.globalAlpha *= 0.3;
                for (var pyr = 0; pyr < 3; pyr++) {
                  var pyrAngle = (pyr - 1) * 0.6;
                  var pyrTipX = kx + s * W * 0.005;
                  var pyrTipY = ky + Math.sin(pyrAngle) * H * 0.008;
                  cCtx.beginPath();
                  cCtx.moveTo(pyrTipX, pyrTipY);
                  cCtx.lineTo(kx - s * W * 0.005 + Math.cos(pyrAngle + 0.3) * W * 0.008, ky + Math.sin(pyrAngle + 0.3) * H * 0.01);
                  cCtx.lineTo(kx - s * W * 0.005 + Math.cos(pyrAngle - 0.3) * W * 0.008, ky + Math.sin(pyrAngle - 0.3) * H * 0.01);
                  cCtx.closePath();
                  cCtx.fillStyle = '#e57373'; cCtx.fill();
                }
                cCtx.restore();
                // Renal pelvis (funnel-shaped collection area at hilum)
                cCtx.beginPath(); cCtx.ellipse(kx + s * W * 0.007, ky, W * 0.004, H * 0.008, 0, 0, Math.PI * 2);
                cCtx.fillStyle = '#fff9c440'; cCtx.fill(); cCtx.strokeStyle = '#ffa000'; cCtx.lineWidth = 0.3; cCtx.stroke();
                // Hilum notch
                cCtx.beginPath(); cCtx.arc(kx + s * W * 0.01, ky, 2, (flipX ? Math.PI : 0) - 0.5, (flipX ? Math.PI : 0) + 0.5);
                cCtx.strokeStyle = '#b71c1c'; cCtx.lineWidth = 0.5; cCtx.stroke();
                // Ureter (tube descending from pelvis)
                cCtx.beginPath(); cCtx.moveTo(kx + s * W * 0.007, ky + H * 0.008);
                cCtx.quadraticCurveTo(kx + s * W * 0.005, ky + H * 0.03, kx, ky + H * 0.05);
                cCtx.strokeStyle = '#ffa000'; cCtx.lineWidth = 0.5; cCtx.setLineDash([2, 2]); cCtx.stroke(); cCtx.setLineDash([]);
              }
              drawKidney(W * 0.43, H * 0.35, false); // left kidney
              drawKidney(W * 0.57, H * 0.35, true);  // right kidney

              // ── Small intestine (more coils) ──
              cCtx.beginPath(); cCtx.moveTo(W * 0.44, H * 0.36);
              for (var ii = 0; ii < 10; ii++) { cCtx.lineTo(W * (0.44 + (ii % 2 === 0 ? 0.07 : 0.01)), H * (0.365 + ii * 0.007)); }
              cCtx.strokeStyle = '#66bb6a'; cCtx.lineWidth = 1.5; cCtx.stroke();

              // ── Bladder ──
              cCtx.beginPath(); cCtx.ellipse(W * 0.50, H * 0.43, W * 0.02, H * 0.015, 0, 0, Math.PI * 2);
              var bladGrad = cCtx.createRadialGradient(W * 0.50, H * 0.428, 1, W * 0.50, H * 0.43, W * 0.02);
              bladGrad.addColorStop(0, '#fff9c4'); bladGrad.addColorStop(1, '#ffe08280');
              cCtx.fillStyle = bladGrad; cCtx.fill(); cCtx.strokeStyle = '#ffa000'; cCtx.lineWidth = 0.7; cCtx.stroke();
              cCtx.restore();
            }

            // ── CIRCULATORY LAYER (enhanced with organ arteries, capillary beds, coronaries) ──
            if (layerOn('circulatory')) {
              cCtx.save(); cCtx.globalAlpha = 0.45;
              var heartPulse = 1.0 + Math.sin(anatTick * 0.08) * 0.08;
              // ── Heart with coronary arteries ──
              cCtx.save(); cCtx.translate(W * 0.50, H * 0.23); cCtx.scale(heartPulse, heartPulse);
              cCtx.beginPath(); cCtx.moveTo(0, 4); cCtx.bezierCurveTo(-10, -5, -18, -1, -18, 6); cCtx.bezierCurveTo(-18, 14, -4, 20, 0, 28); cCtx.bezierCurveTo(4, 20, 18, 14, 18, 6); cCtx.bezierCurveTo(18, -1, 10, -5, 0, 4);
              cCtx.fillStyle = '#ef4444'; cCtx.fill(); cCtx.strokeStyle = '#dc2626'; cCtx.lineWidth = 1.5; cCtx.stroke();
              // Coronary arteries (LAD + RCA)
              cCtx.beginPath(); cCtx.moveTo(-2, 4); cCtx.quadraticCurveTo(-6, 10, -10, 18); // LAD
              cCtx.strokeStyle = '#fbbf24'; cCtx.lineWidth = 0.8; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(2, 4); cCtx.quadraticCurveTo(8, 8, 12, 16); // RCA
              cCtx.strokeStyle = '#fbbf24'; cCtx.lineWidth = 0.7; cCtx.stroke();
              // Heart chamber labels (RA/RV/LA/LV)
              cCtx.font = 'bold 4px monospace';
              cCtx.textAlign = 'center'; cCtx.globalAlpha = 0.6;
              cCtx.fillStyle = '#fff';
              // Positioned within heart quadrants (from patient's perspective)
              cCtx.fillText('RA', -6, 8);   // Right atrium (patient's right = viewer's left)
              cCtx.fillText('RV', -4, 18);  // Right ventricle
              cCtx.fillText('LA', 6, 8);    // Left atrium
              cCtx.fillText('LV', 4, 18);   // Left ventricle
              cCtx.globalAlpha = 0.45;
              cCtx.restore();

              // ── Ascending aorta + aortic arch ──
              cCtx.beginPath(); cCtx.moveTo(W * 0.50, H * 0.20);
              cCtx.quadraticCurveTo(W * 0.52, H * 0.17, W * 0.54, H * 0.15);
              cCtx.quadraticCurveTo(W * 0.53, H * 0.13, W * 0.50, H * 0.10);
              cCtx.strokeStyle = '#ef4444'; cCtx.lineWidth = 3; cCtx.stroke();
              // ── Descending aorta ──
              cCtx.beginPath(); cCtx.moveTo(W * 0.50, H * 0.23); cCtx.lineTo(W * 0.50, H * 0.44);
              cCtx.strokeStyle = '#ef4444'; cCtx.lineWidth = 2.5; cCtx.stroke();

              // ── Carotid arteries (to head) ──
              cCtx.beginPath(); cCtx.moveTo(W * 0.48, H * 0.10); cCtx.quadraticCurveTo(W * 0.47, H * 0.08, W * 0.47, H * 0.06);
              cCtx.strokeStyle = '#ef4444'; cCtx.lineWidth = 1.5; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.52, H * 0.10); cCtx.quadraticCurveTo(W * 0.53, H * 0.08, W * 0.53, H * 0.06); cCtx.stroke();
              // Cerebral arteries (branching in head)
              cCtx.beginPath(); cCtx.moveTo(W * 0.47, H * 0.06); cCtx.quadraticCurveTo(W * 0.46, H * 0.04, W * 0.48, H * 0.03);
              cCtx.strokeStyle = '#ef4444'; cCtx.lineWidth = 0.7; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.53, H * 0.06); cCtx.quadraticCurveTo(W * 0.54, H * 0.04, W * 0.52, H * 0.03); cCtx.stroke();

              // ── Organ arteries (celiac trunk, superior mesenteric, renal) ──
              // Celiac trunk (stomach, liver, spleen)
              cCtx.beginPath(); cCtx.moveTo(W * 0.50, H * 0.29); cCtx.lineTo(W * 0.45, H * 0.305);
              cCtx.moveTo(W * 0.50, H * 0.29); cCtx.lineTo(W * 0.55, H * 0.30);
              cCtx.strokeStyle = '#ef4444'; cCtx.lineWidth = 0.9; cCtx.stroke();
              // Superior mesenteric (intestines)
              cCtx.beginPath(); cCtx.moveTo(W * 0.50, H * 0.33); cCtx.quadraticCurveTo(W * 0.47, H * 0.36, W * 0.48, H * 0.39);
              cCtx.strokeStyle = '#ef4444'; cCtx.lineWidth = 0.8; cCtx.stroke();
              // Renal arteries (to kidneys)
              cCtx.beginPath(); cCtx.moveTo(W * 0.50, H * 0.35); cCtx.lineTo(W * 0.44, H * 0.35);
              cCtx.moveTo(W * 0.50, H * 0.35); cCtx.lineTo(W * 0.56, H * 0.35);
              cCtx.strokeStyle = '#ef4444'; cCtx.lineWidth = 1; cCtx.stroke();

              // ── Femoral arteries (thigh — split from iliac) ──
              cCtx.beginPath(); cCtx.moveTo(W * 0.47, H * 0.44); cCtx.quadraticCurveTo(W * 0.44, H * 0.56, W * 0.41, H * 0.68);
              cCtx.strokeStyle = '#ef4444'; cCtx.lineWidth = 1.8; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.53, H * 0.44); cCtx.quadraticCurveTo(W * 0.56, H * 0.56, W * 0.59, H * 0.68); cCtx.stroke();
              // Popliteal → tibial arteries (lower leg)
              cCtx.beginPath(); cCtx.moveTo(W * 0.41, H * 0.69); cCtx.lineTo(W * 0.38, H * 0.90);
              cCtx.strokeStyle = '#ef4444'; cCtx.lineWidth = 1.2; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.59, H * 0.69); cCtx.lineTo(W * 0.62, H * 0.90); cCtx.stroke();
              // Peroneal (fibular) arteries — parallel
              cCtx.beginPath(); cCtx.moveTo(W * 0.40, H * 0.72); cCtx.lineTo(W * 0.39, H * 0.88);
              cCtx.strokeStyle = '#ef4444'; cCtx.lineWidth = 0.6; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.60, H * 0.72); cCtx.lineTo(W * 0.61, H * 0.88); cCtx.stroke();

              // ── Subclavian → brachial → radial/ulnar arteries (arms) ──
              cCtx.beginPath(); cCtx.moveTo(W * 0.34, H * 0.16); cCtx.quadraticCurveTo(W * 0.28, H * 0.25, W * 0.22, H * 0.34);
              cCtx.strokeStyle = '#ef4444'; cCtx.lineWidth = 1.4; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.66, H * 0.16); cCtx.quadraticCurveTo(W * 0.72, H * 0.25, W * 0.78, H * 0.34); cCtx.stroke();
              // Radial artery (thumb side)
              cCtx.beginPath(); cCtx.moveTo(W * 0.22, H * 0.34); cCtx.lineTo(W * 0.16, H * 0.46);
              cCtx.strokeStyle = '#ef4444'; cCtx.lineWidth = 0.9; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.78, H * 0.34); cCtx.lineTo(W * 0.84, H * 0.46); cCtx.stroke();
              // Ulnar artery (pinky side)
              cCtx.beginPath(); cCtx.moveTo(W * 0.22, H * 0.34); cCtx.lineTo(W * 0.18, H * 0.46);
              cCtx.strokeStyle = '#ef4444'; cCtx.lineWidth = 0.6; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.78, H * 0.34); cCtx.lineTo(W * 0.82, H * 0.46); cCtx.stroke();

              // ── Superficial forearm veins (critical clinical anatomy for IV access) ──
              cCtx.save(); cCtx.globalAlpha = 0.25;
              // Left arm — cephalic vein (lateral/thumb side)
              cCtx.beginPath(); cCtx.moveTo(W * 0.16, H * 0.46);
              cCtx.quadraticCurveTo(W * 0.19, H * 0.40, W * 0.21, H * 0.35);
              cCtx.quadraticCurveTo(W * 0.23, H * 0.28, W * 0.26, H * 0.20);
              cCtx.strokeStyle = '#818cf8'; cCtx.lineWidth = 0.7; cCtx.stroke();
              // Left arm — basilic vein (medial/pinky side)
              cCtx.beginPath(); cCtx.moveTo(W * 0.17, H * 0.46);
              cCtx.quadraticCurveTo(W * 0.20, H * 0.41, W * 0.225, H * 0.35);
              cCtx.quadraticCurveTo(W * 0.24, H * 0.30, W * 0.28, H * 0.22);
              cCtx.strokeStyle = '#818cf8'; cCtx.lineWidth = 0.5; cCtx.stroke();
              // Median cubital vein (connecting cephalic to basilic at elbow — THE IV access vein)
              cCtx.beginPath(); cCtx.moveTo(W * 0.21, H * 0.35); cCtx.quadraticCurveTo(W * 0.22, H * 0.34, W * 0.225, H * 0.35);
              cCtx.strokeStyle = '#818cf8'; cCtx.lineWidth = 0.8; cCtx.stroke();
              // Right arm (mirror)
              cCtx.beginPath(); cCtx.moveTo(W * 0.84, H * 0.46);
              cCtx.quadraticCurveTo(W * 0.81, H * 0.40, W * 0.79, H * 0.35);
              cCtx.quadraticCurveTo(W * 0.77, H * 0.28, W * 0.74, H * 0.20);
              cCtx.strokeStyle = '#818cf8'; cCtx.lineWidth = 0.7; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.83, H * 0.46);
              cCtx.quadraticCurveTo(W * 0.80, H * 0.41, W * 0.775, H * 0.35);
              cCtx.quadraticCurveTo(W * 0.76, H * 0.30, W * 0.72, H * 0.22);
              cCtx.strokeStyle = '#818cf8'; cCtx.lineWidth = 0.5; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.79, H * 0.35); cCtx.quadraticCurveTo(W * 0.78, H * 0.34, W * 0.775, H * 0.35);
              cCtx.strokeStyle = '#818cf8'; cCtx.lineWidth = 0.8; cCtx.stroke();
              cCtx.restore();

              // ── Capillary beds (hands and feet — tiny branching) ──
              function drawCapillaryBed(cx, cy, spread) {
                cCtx.save(); cCtx.globalAlpha = 0.25;
                for (var ci = 0; ci < 6; ci++) {
                  var angle = (ci / 6) * Math.PI * 2;
                  var ex = cx + Math.cos(angle) * spread;
                  var ey = cy + Math.sin(angle) * spread * 0.7;
                  cCtx.beginPath(); cCtx.moveTo(cx, cy); cCtx.lineTo(ex, ey);
                  cCtx.strokeStyle = ci % 2 === 0 ? '#ef4444' : '#3b82f6'; cCtx.lineWidth = 0.4; cCtx.stroke();
                }
                cCtx.restore();
              }
              drawCapillaryBed(W * 0.15, H * 0.465, 8); // left hand
              drawCapillaryBed(W * 0.85, H * 0.465, 8); // right hand
              drawCapillaryBed(W * 0.34, H * 0.95, 7);  // left foot
              drawCapillaryBed(W * 0.66, H * 0.95, 7);  // right foot

              // ── Venous return (blue — IVC + major veins) ──
              cCtx.beginPath(); cCtx.moveTo(W * 0.52, H * 0.22); cCtx.lineTo(W * 0.52, H * 0.15);
              cCtx.strokeStyle = '#3b82f6'; cCtx.lineWidth = 2; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.52, H * 0.28); cCtx.lineTo(W * 0.52, H * 0.44);
              cCtx.strokeStyle = '#3b82f6'; cCtx.lineWidth = 2; cCtx.stroke();
              // Femoral veins
              cCtx.beginPath(); cCtx.moveTo(W * 0.49, H * 0.44); cCtx.quadraticCurveTo(W * 0.46, H * 0.56, W * 0.43, H * 0.68);
              cCtx.strokeStyle = '#3b82f6'; cCtx.lineWidth = 1.2; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.51, H * 0.44); cCtx.quadraticCurveTo(W * 0.54, H * 0.56, W * 0.57, H * 0.68); cCtx.stroke();
              // Jugular veins (neck)
              cCtx.beginPath(); cCtx.moveTo(W * 0.46, H * 0.06); cCtx.lineTo(W * 0.47, H * 0.12);
              cCtx.strokeStyle = '#3b82f6'; cCtx.lineWidth = 1; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.54, H * 0.06); cCtx.lineTo(W * 0.53, H * 0.12); cCtx.stroke();

              // ── Pulmonary circulation (heart → lungs → heart) ──
              cCtx.save(); cCtx.globalAlpha = 0.3;
              // Pulmonary trunk (deoxygenated — blue)
              cCtx.beginPath(); cCtx.moveTo(W * 0.49, H * 0.22);
              cCtx.quadraticCurveTo(W * 0.45, H * 0.21, W * 0.42, H * 0.22);
              cCtx.strokeStyle = '#3b82f6'; cCtx.lineWidth = 1.5; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.49, H * 0.22);
              cCtx.quadraticCurveTo(W * 0.53, H * 0.21, W * 0.58, H * 0.22); cCtx.stroke();
              // Pulmonary veins (oxygenated — red)
              cCtx.beginPath(); cCtx.moveTo(W * 0.42, H * 0.24);
              cCtx.quadraticCurveTo(W * 0.45, H * 0.245, W * 0.48, H * 0.24);
              cCtx.strokeStyle = '#ef4444'; cCtx.lineWidth = 1; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.58, H * 0.24);
              cCtx.quadraticCurveTo(W * 0.55, H * 0.245, W * 0.52, H * 0.24); cCtx.stroke();
              cCtx.restore();

              // ── Animated blood flow particles (more, with direction) ──
              for (var bfi = 0; bfi < 10; bfi++) {
                var bfT = ((anatTick * 0.012 + bfi * 0.1) % 1.0);
                var bfX, bfY, bfColor;
                if (bfi < 3) { bfX = W * 0.50; bfY = H * (0.23 + bfT * 0.21); bfColor = '#ef4444'; }
                else if (bfi < 5) { bfX = W * (0.47 - bfT * 0.06); bfY = H * (0.44 + bfT * 0.24); bfColor = '#ef4444'; }
                else if (bfi < 7) { bfX = W * (0.53 + bfT * 0.06); bfY = H * (0.44 + bfT * 0.24); bfColor = '#ef4444'; }
                else { bfX = W * (0.52); bfY = H * (0.44 - bfT * 0.22); bfColor = '#3b82f6'; } // venous return
                cCtx.beginPath(); cCtx.arc(bfX, bfY, 2, 0, Math.PI * 2);
                cCtx.fillStyle = bfColor; cCtx.globalAlpha = 0.7; cCtx.fill(); cCtx.globalAlpha = 0.45;
              }
              // ── ECG waveform animation ──
              cCtx.save(); cCtx.globalAlpha = 0.55;
              var ecgX0 = W * 0.02, ecgY0 = H * 0.96, ecgW = W * 0.25, ecgH = H * 0.03;
              cCtx.beginPath(); cCtx.roundRect(ecgX0 - 2, ecgY0 - ecgH - 4, ecgW + 6, ecgH * 2 + 8, 3);
              cCtx.fillStyle = 'rgba(0,0,0,0.5)'; cCtx.fill();
              cCtx.beginPath();
              var ecgPhase = (anatTick * 2) % Math.floor(ecgW);
              for (var ei = 0; ei < ecgW; ei++) {
                var ePos = (ei + ecgPhase) % ecgW;
                var eNorm = ePos / ecgW;
                var eVal = 0;
                if (eNorm > 0.10 && eNorm < 0.15) eVal = (eNorm - 0.10) * 6;
                else if (eNorm >= 0.15 && eNorm < 0.20) eVal = (0.20 - eNorm) * 6;
                else if (eNorm >= 0.30 && eNorm < 0.33) eVal = -(eNorm - 0.30) * 12;
                else if (eNorm >= 0.33 && eNorm < 0.36) eVal = -0.36 + (eNorm - 0.33) * 40;
                else if (eNorm >= 0.36 && eNorm < 0.40) eVal = 0.84 - (eNorm - 0.36) * 28;
                else if (eNorm >= 0.40 && eNorm < 0.43) eVal = -(eNorm - 0.40) * 8;
                else if (eNorm >= 0.43 && eNorm < 0.48) eVal = -0.24 + (eNorm - 0.43) * 4.8;
                else if (eNorm >= 0.60 && eNorm < 0.70) eVal = Math.sin((eNorm - 0.60) * Math.PI / 0.10) * 0.3;
                if (ei === 0) cCtx.moveTo(ecgX0 + ei, ecgY0 - eVal * ecgH);
                else cCtx.lineTo(ecgX0 + ei, ecgY0 - eVal * ecgH);
              }
              cCtx.strokeStyle = '#22c55e'; cCtx.lineWidth = 1.5; cCtx.stroke();
              cCtx.font = 'bold 7px monospace'; cCtx.fillStyle = '#22c55e'; cCtx.textAlign = 'left';
              cCtx.fillText('ECG', ecgX0 + 2, ecgY0 - ecgH - 1);
              var heartRateDisplay = 60 + Math.floor(Math.sin(anatTick * 0.01) * 12);
              cCtx.fillText(heartRateDisplay + ' BPM', ecgX0 + ecgW - 30, ecgY0 - ecgH - 1);
              cCtx.restore();
              cCtx.restore();
            }

            // ── NERVOUS LAYER (enhanced with brain detail, plexuses, peripheral branches) ──
            if (layerOn('nervous')) {
              cCtx.save(); cCtx.globalAlpha = 0.45;
              var nerveFlashActive = (anatTick % 60) < 5;
              var nerveFlashBranch = Math.floor(anatTick / 60) % 16;

              // ── Brain (cerebral hemispheres + cerebellum) ──
              var brGlow = cCtx.createRadialGradient(W * 0.50, H * 0.050, 4, W * 0.50, H * 0.050, W * 0.055);
              brGlow.addColorStop(0, '#fef08a'); brGlow.addColorStop(1, '#fef08a00');
              cCtx.beginPath(); cCtx.arc(W * 0.50, H * 0.050, W * 0.055, 0, Math.PI * 2); cCtx.fillStyle = brGlow; cCtx.fill();
              // Cerebral hemisphere outline
              cCtx.beginPath(); cCtx.arc(W * 0.50, H * 0.050, W * 0.046, 0, Math.PI * 2);
              cCtx.strokeStyle = '#eab308'; cCtx.lineWidth = 1.5; cCtx.stroke();
              // Central fissure (divides hemispheres)
              cCtx.beginPath(); cCtx.moveTo(W * 0.50, H * 0.015); cCtx.lineTo(W * 0.50, H * 0.075);
              cCtx.strokeStyle = '#eab30860'; cCtx.lineWidth = 0.7; cCtx.stroke();
              // Sulci (brain wrinkles — 3 curved lines per hemisphere)
              cCtx.save(); cCtx.globalAlpha = 0.25;
              // Left hemisphere sulci
              cCtx.beginPath(); cCtx.moveTo(W * 0.465, H * 0.03); cCtx.quadraticCurveTo(W * 0.46, H * 0.05, W * 0.47, H * 0.07);
              cCtx.strokeStyle = '#ca8a04'; cCtx.lineWidth = 0.5; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.47, H * 0.035); cCtx.quadraticCurveTo(W * 0.455, H * 0.045, W * 0.46, H * 0.06); cCtx.stroke();
              // Right hemisphere sulci
              cCtx.beginPath(); cCtx.moveTo(W * 0.535, H * 0.03); cCtx.quadraticCurveTo(W * 0.54, H * 0.05, W * 0.53, H * 0.07); cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.53, H * 0.035); cCtx.quadraticCurveTo(W * 0.545, H * 0.045, W * 0.54, H * 0.06); cCtx.stroke();
              cCtx.restore();
              // Cerebellum (smaller, below cerebrum)
              cCtx.beginPath(); cCtx.ellipse(W * 0.50, H * 0.082, W * 0.022, H * 0.008, 0, 0, Math.PI * 2);
              cCtx.strokeStyle = '#eab308'; cCtx.lineWidth = 1; cCtx.stroke();
              // Cerebellum folia (horizontal striations)
              cCtx.save(); cCtx.globalAlpha = 0.2;
              for (var cbf = 0; cbf < 3; cbf++) {
                cCtx.beginPath(); cCtx.moveTo(W * (0.482 + cbf * 0.003), H * (0.078 + cbf * 0.003));
                cCtx.lineTo(W * (0.518 - cbf * 0.003), H * (0.078 + cbf * 0.003));
                cCtx.strokeStyle = '#ca8a04'; cCtx.lineWidth = 0.3; cCtx.stroke();
              }
              cCtx.restore();
              // Brainstem
              cCtx.beginPath(); cCtx.moveTo(W * 0.50, H * 0.082); cCtx.lineTo(W * 0.50, H * 0.105);
              cCtx.strokeStyle = '#eab308'; cCtx.lineWidth = 2.5; cCtx.stroke();

              // ── Spinal cord ──
              cCtx.beginPath(); cCtx.moveTo(W * 0.50, H * 0.105); cCtx.lineTo(W * 0.50, H * 0.44);
              cCtx.strokeStyle = '#eab308'; cCtx.lineWidth = 3; cCtx.stroke();

              // ── Nerve branches (expanded with plexuses and peripheral detail) ──
              var nervePts = [
                // Brachial plexus (C5-T1: shoulder/arm nerves)
                [0.50, 0.14, 0.34, 0.16, 1.5],  // to shoulder
                [0.34, 0.16, 0.30, 0.22, 1.2],   // axillary
                [0.30, 0.22, 0.24, 0.34, 1.0],   // musculocutaneous → radial
                [0.24, 0.34, 0.19, 0.44, 0.8],   // median/ulnar to hand
                [0.19, 0.44, 0.15, 0.46, 0.5],   // digital nerves (fingertips)
                // Right arm (mirror)
                [0.50, 0.14, 0.66, 0.16, 1.5],
                [0.66, 0.16, 0.70, 0.22, 1.2],
                [0.70, 0.22, 0.76, 0.34, 1.0],
                [0.76, 0.34, 0.81, 0.44, 0.8],
                [0.81, 0.44, 0.85, 0.46, 0.5],
                // Intercostal nerves (rib-level branches, 3 representative)
                [0.50, 0.18, 0.40, 0.20, 0.5],
                [0.50, 0.22, 0.42, 0.24, 0.5],
                [0.50, 0.26, 0.43, 0.28, 0.5],
                // Lumbosacral plexus (L1-S3: leg nerves)
                [0.50, 0.40, 0.46, 0.44, 1.5],   // femoral
                [0.46, 0.44, 0.41, 0.58, 1.2],    // down thigh
                [0.41, 0.58, 0.39, 0.72, 1.0],    // to knee (sciatic)
                [0.39, 0.72, 0.37, 0.84, 0.8],    // tibial
                [0.37, 0.84, 0.35, 0.93, 0.5],    // to foot
                // Right leg (mirror)
                [0.50, 0.40, 0.54, 0.44, 1.5],
                [0.54, 0.44, 0.59, 0.58, 1.2],
                [0.59, 0.58, 0.61, 0.72, 1.0],
                [0.61, 0.72, 0.63, 0.84, 0.8],
                [0.63, 0.84, 0.65, 0.93, 0.5]
              ];
              nervePts.forEach(function(np, npIdx) {
                cCtx.beginPath();
                cCtx.moveTo(W * np[0], H * np[1]);
                cCtx.quadraticCurveTo(W * (np[0] + np[2]) * 0.5, H * (np[1] + np[3]) * 0.5, W * np[2], H * np[3]);
                cCtx.strokeStyle = '#eab308';
                var isFlashing = nerveFlashActive && (npIdx % 10) === (nerveFlashBranch % 10);
                cCtx.lineWidth = isFlashing ? np[4] + 2 : np[4];
                if (isFlashing) { cCtx.globalAlpha = 0.85; }
                cCtx.stroke();
                if (isFlashing) { cCtx.globalAlpha = 0.45; }
              });

              // ── Spinal nerve ganglia (dorsal root ganglia nodes along spine) ──
              var gangliaY = [0.13, 0.17, 0.21, 0.25, 0.29, 0.33, 0.37, 0.41];
              gangliaY.forEach(function(gy) {
                cCtx.beginPath(); cCtx.arc(W * 0.50, H * gy, 2, 0, Math.PI * 2);
                cCtx.fillStyle = '#eab308'; cCtx.fill();
              });

              // ── Animated nerve impulse ──
              if (nerveFlashActive) {
                var flashT = ((anatTick % 60) / 5); // 0-1 over flash duration
                var activeNerve = nervePts[nerveFlashBranch % nervePts.length];
                if (activeNerve) {
                  var impX = W * (activeNerve[0] + (activeNerve[2] - activeNerve[0]) * flashT);
                  var impY = H * (activeNerve[1] + (activeNerve[3] - activeNerve[1]) * flashT);
                  cCtx.save();
                  var impGlow = cCtx.createRadialGradient(impX, impY, 0, impX, impY, 8);
                  impGlow.addColorStop(0, '#fef08a'); impGlow.addColorStop(1, '#fef08a00');
                  cCtx.fillStyle = impGlow; cCtx.beginPath(); cCtx.arc(impX, impY, 8, 0, Math.PI * 2); cCtx.fill();
                  cCtx.beginPath(); cCtx.arc(impX, impY, 3, 0, Math.PI * 2);
                  cCtx.fillStyle = '#fbbf24'; cCtx.fill();
                  cCtx.restore();
                }
              }
              cCtx.restore();
            }

            // ── LYMPHATIC LAYER (enhanced with vessel branching, tonsils, thoracic duct) ──
            if (layerOn('lymphatic')) {
              cCtx.save(); cCtx.globalAlpha = 0.40;
              var lymphColor = '#22c55e'; var lymphFill = '#86efac';

              // Thoracic duct (main lymph channel — left side, drains into left subclavian vein)
              cCtx.beginPath(); cCtx.moveTo(W * 0.48, H * 0.13);
              cCtx.quadraticCurveTo(W * 0.47, H * 0.20, W * 0.48, H * 0.30);
              cCtx.quadraticCurveTo(W * 0.49, H * 0.38, W * 0.49, H * 0.44);
              cCtx.strokeStyle = lymphColor; cCtx.lineWidth = 2; cCtx.setLineDash([4, 3]); cCtx.stroke(); cCtx.setLineDash([]);
              // Right lymphatic duct (shorter, right side upper body)
              cCtx.beginPath(); cCtx.moveTo(W * 0.52, H * 0.13);
              cCtx.quadraticCurveTo(W * 0.53, H * 0.17, W * 0.52, H * 0.20);
              cCtx.strokeStyle = lymphColor; cCtx.lineWidth = 1.5; cCtx.setLineDash([3, 3]); cCtx.stroke(); cCtx.setLineDash([]);

              // Lymph vessel branches (superficial network)
              var lymphVessels = [
                // Axillary branches (armpits)
                [0.46, 0.14, 0.36, 0.18], [0.54, 0.14, 0.64, 0.18],
                // Arm vessels
                [0.36, 0.18, 0.28, 0.30], [0.64, 0.18, 0.72, 0.30],
                [0.28, 0.30, 0.20, 0.42], [0.72, 0.30, 0.80, 0.42],
                // Inguinal branches (groin)
                [0.49, 0.44, 0.44, 0.48], [0.51, 0.44, 0.56, 0.48],
                // Leg vessels
                [0.44, 0.48, 0.41, 0.62], [0.56, 0.48, 0.59, 0.62],
                [0.41, 0.62, 0.39, 0.80], [0.59, 0.62, 0.61, 0.80]
              ];
              lymphVessels.forEach(function(lv) {
                cCtx.beginPath(); cCtx.moveTo(W * lv[0], H * lv[1]);
                cCtx.lineTo(W * lv[2], H * lv[3]);
                cCtx.strokeStyle = lymphColor + '50'; cCtx.lineWidth = 0.6; cCtx.setLineDash([2, 3]); cCtx.stroke(); cCtx.setLineDash([]);
              });

              // Lymph node clusters (expanded from 10 to 18)
              var lnPts = [
                // Cervical (neck)
                [0.46, 0.11, 3], [0.54, 0.11, 3],
                // Axillary (armpit)
                [0.36, 0.18, 4.5], [0.64, 0.18, 4.5],
                // Supraclavicular
                [0.42, 0.135, 2.5], [0.58, 0.135, 2.5],
                // Mediastinal (chest)
                [0.48, 0.20, 3], [0.52, 0.20, 3],
                // Mesenteric (abdominal)
                [0.47, 0.32, 3.5], [0.53, 0.32, 3.5],
                // Para-aortic
                [0.48, 0.38, 3],
                // Inguinal (groin)
                [0.44, 0.44, 4.5], [0.56, 0.44, 4.5],
                // Popliteal (behind knee)
                [0.40, 0.68, 3], [0.60, 0.68, 3],
                // Cubital (elbow)
                [0.24, 0.34, 2.5], [0.76, 0.34, 2.5],
                // Iliac
                [0.46, 0.42, 3]
              ];
              lnPts.forEach(function(ln) {
                cCtx.beginPath(); cCtx.arc(W * ln[0], H * ln[1], ln[2], 0, Math.PI * 2);
                cCtx.fillStyle = lymphFill; cCtx.fill(); cCtx.strokeStyle = lymphColor; cCtx.lineWidth = 0.8; cCtx.stroke();
              });

              // Tonsils (Waldeyer's ring — palatine + pharyngeal)
              cCtx.beginPath(); cCtx.ellipse(W * 0.485, H * 0.092, W * 0.005, H * 0.004, 0, 0, Math.PI * 2);
              cCtx.fillStyle = lymphFill + '80'; cCtx.fill(); cCtx.strokeStyle = lymphColor; cCtx.lineWidth = 0.5; cCtx.stroke();
              cCtx.beginPath(); cCtx.ellipse(W * 0.515, H * 0.092, W * 0.005, H * 0.004, 0, 0, Math.PI * 2);
              cCtx.fillStyle = lymphFill + '80'; cCtx.fill(); cCtx.stroke();

              // Spleen (left upper abdomen — enhanced shape)
              cCtx.beginPath();
              cCtx.moveTo(W * 0.60, H * 0.30); cCtx.quadraticCurveTo(W * 0.62, H * 0.29, W * 0.63, H * 0.31);
              cCtx.quadraticCurveTo(W * 0.63, H * 0.34, W * 0.60, H * 0.35);
              cCtx.quadraticCurveTo(W * 0.58, H * 0.34, W * 0.58, H * 0.32);
              cCtx.closePath();
              cCtx.fillStyle = lymphFill + '60'; cCtx.fill(); cCtx.strokeStyle = lymphColor; cCtx.lineWidth = 1; cCtx.stroke();

              // Thymus (upper chest — immune organ)
              cCtx.beginPath(); cCtx.ellipse(W * 0.50, H * 0.17, W * 0.018, H * 0.014, 0, 0, Math.PI * 2);
              cCtx.fillStyle = lymphFill + '50'; cCtx.fill(); cCtx.strokeStyle = lymphColor; cCtx.lineWidth = 0.8; cCtx.stroke();

              // Peyer's patches (small intestine immune tissue — small dots)
              cCtx.save(); cCtx.globalAlpha = 0.25;
              for (var ppi = 0; ppi < 4; ppi++) {
                cCtx.beginPath(); cCtx.arc(W * (0.46 + ppi * 0.02), H * (0.38 + ppi * 0.005), 1.5, 0, Math.PI * 2);
                cCtx.fillStyle = lymphFill; cCtx.fill();
              }
              cCtx.restore();
              cCtx.restore();
            }

            // ── RESPIRATORY TREE (when respiratory system selected) ──
            if (sysKey === 'respiratory') {
              cCtx.save(); cCtx.globalAlpha = 0.40;
              // Trachea
              cCtx.beginPath(); cCtx.moveTo(W * 0.498, H * 0.115); cCtx.lineTo(W * 0.498, H * 0.19);
              cCtx.moveTo(W * 0.502, H * 0.115); cCtx.lineTo(W * 0.502, H * 0.19);
              cCtx.strokeStyle = '#60a5fa'; cCtx.lineWidth = 2.5; cCtx.stroke();
              // Cartilage rings
              for (var cr = 0; cr < 6; cr++) {
                var crY = H * (0.125 + cr * 0.012);
                cCtx.beginPath(); cCtx.moveTo(W * 0.49, crY); cCtx.lineTo(W * 0.51, crY);
                cCtx.strokeStyle = '#93c5fd'; cCtx.lineWidth = 1.5; cCtx.stroke();
              }
              // Main bronchi
              cCtx.beginPath(); cCtx.moveTo(W * 0.50, H * 0.19);
              cCtx.quadraticCurveTo(W * 0.46, H * 0.20, W * 0.43, H * 0.22);
              cCtx.strokeStyle = '#60a5fa'; cCtx.lineWidth = 2; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.50, H * 0.19);
              cCtx.quadraticCurveTo(W * 0.54, H * 0.20, W * 0.57, H * 0.22);
              cCtx.strokeStyle = '#60a5fa'; cCtx.lineWidth = 2; cCtx.stroke();
              // Secondary bronchi (left)
              cCtx.beginPath(); cCtx.moveTo(W * 0.43, H * 0.22); cCtx.quadraticCurveTo(W * 0.40, H * 0.23, W * 0.39, H * 0.25); cCtx.strokeStyle = '#93c5fd'; cCtx.lineWidth = 1.2; cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.43, H * 0.22); cCtx.quadraticCurveTo(W * 0.42, H * 0.24, W * 0.44, H * 0.26); cCtx.stroke();
              // Secondary bronchi (right)
              cCtx.beginPath(); cCtx.moveTo(W * 0.57, H * 0.22); cCtx.quadraticCurveTo(W * 0.60, H * 0.23, W * 0.61, H * 0.25); cCtx.stroke();
              cCtx.beginPath(); cCtx.moveTo(W * 0.57, H * 0.22); cCtx.quadraticCurveTo(W * 0.58, H * 0.24, W * 0.56, H * 0.26); cCtx.stroke();
              // Tertiary bronchioles (tiny branches)
              var bronchioles = [
                [0.39, 0.25, 0.37, 0.27], [0.39, 0.25, 0.41, 0.27],
                [0.44, 0.26, 0.42, 0.28], [0.44, 0.26, 0.46, 0.28],
                [0.61, 0.25, 0.63, 0.27], [0.61, 0.25, 0.59, 0.27],
                [0.56, 0.26, 0.58, 0.28], [0.56, 0.26, 0.54, 0.28]
              ];
              bronchioles.forEach(function(b) {
                cCtx.beginPath(); cCtx.moveTo(W * b[0], H * b[1]); cCtx.lineTo(W * b[2], H * b[3]);
                cCtx.strokeStyle = '#bfdbfe'; cCtx.lineWidth = 0.8; cCtx.stroke();
              });
              // Alveoli clusters
              var alveoliPts = [[0.37, 0.275], [0.41, 0.275], [0.42, 0.285], [0.46, 0.285], [0.63, 0.275], [0.59, 0.275], [0.58, 0.285], [0.54, 0.285]];
              alveoliPts.forEach(function(a) {
                cCtx.beginPath(); cCtx.arc(W * a[0], H * a[1], 2, 0, Math.PI * 2);
                cCtx.fillStyle = '#dbeafe'; cCtx.fill(); cCtx.strokeStyle = '#93c5fd'; cCtx.lineWidth = 0.5; cCtx.stroke();
              });
              cCtx.restore();
            }

            // ── DIGESTIVE TRACT PATH (enhanced with peristalsis animation + haustra) ──
            if (sysKey === 'organs') {
              cCtx.save(); cCtx.globalAlpha = 0.30;
              // Esophagus with peristalsis wave
              var periPhase = anatTick * 0.04; // slow peristaltic wave
              cCtx.beginPath(); cCtx.moveTo(W * 0.50, H * 0.115);
              for (var epi = 0; epi < 12; epi++) {
                var epY = H * (0.12 + epi * 0.014);
                var epWave = Math.sin(periPhase - epi * 0.6) * W * 0.003;
                cCtx.lineTo(W * 0.49 + epWave, epY);
              }
              cCtx.strokeStyle = '#f97316'; cCtx.lineWidth = 2; cCtx.stroke();
              // Pyloric sphincter valve
              cCtx.beginPath(); cCtx.arc(W * 0.48, H * 0.35, 2.5, 0, Math.PI * 2);
              cCtx.strokeStyle = '#ea580c'; cCtx.lineWidth = 1; cCtx.stroke();
              // Stomach outline
              cCtx.beginPath();
              cCtx.moveTo(W * 0.48, H * 0.28); cCtx.quadraticCurveTo(W * 0.44, H * 0.29, W * 0.43, H * 0.32);
              cCtx.quadraticCurveTo(W * 0.44, H * 0.35, W * 0.48, H * 0.35);
              cCtx.strokeStyle = '#f97316'; cCtx.lineWidth = 1.5; cCtx.stroke();
              // Duodenum curve
              cCtx.beginPath(); cCtx.moveTo(W * 0.48, H * 0.35);
              cCtx.quadraticCurveTo(W * 0.52, H * 0.355, W * 0.52, H * 0.37);
              cCtx.quadraticCurveTo(W * 0.52, H * 0.385, W * 0.48, H * 0.39);
              cCtx.strokeStyle = '#fb923c'; cCtx.lineWidth = 1.2; cCtx.stroke();
              // Small intestine coils with peristalsis wave
              var siY = H * 0.39;
              for (var sci = 0; sci < 6; sci++) {
                var sWave = Math.sin(periPhase * 0.5 - sci * 0.8) * H * 0.002;
                cCtx.beginPath();
                cCtx.moveTo(W * 0.44, siY + sci * H * 0.011 + sWave);
                cCtx.quadraticCurveTo(W * 0.50, siY + sci * H * 0.011 + H * 0.006 - sWave, W * 0.56, siY + sci * H * 0.011 + sWave);
                cCtx.strokeStyle = '#fb923c'; cCtx.lineWidth = 0.8 + Math.abs(sWave) * 40; cCtx.stroke();
              }
              // Ileocecal valve
              cCtx.beginPath(); cCtx.arc(W * 0.56, H * 0.39, 2, 0, Math.PI * 2);
              cCtx.strokeStyle = '#ea580c'; cCtx.lineWidth = 0.8; cCtx.stroke();
              // Large intestine with haustra (scalloped edge)
              cCtx.beginPath();
              // Ascending colon (right side)
              cCtx.moveTo(W * 0.56, H * 0.39);
              for (var hau = 0; hau < 4; hau++) {
                var hauY = H * (0.39 - hau * 0.023);
                cCtx.quadraticCurveTo(W * 0.59, hauY - H * 0.008, W * 0.58, hauY - H * 0.02);
              }
              // Transverse colon (across top)
              cCtx.quadraticCurveTo(W * 0.55, H * 0.295, W * 0.50, H * 0.30);
              cCtx.quadraticCurveTo(W * 0.45, H * 0.295, W * 0.42, H * 0.30);
              // Descending colon (left side)
              for (var hau2 = 0; hau2 < 4; hau2++) {
                var hauY2 = H * (0.30 + hau2 * 0.023);
                cCtx.quadraticCurveTo(W * 0.41, hauY2 + H * 0.008, W * 0.42, hauY2 + H * 0.02);
              }
              cCtx.strokeStyle = '#92400e'; cCtx.lineWidth = 2; cCtx.stroke();
              // Appendix (small projection from cecum)
              cCtx.beginPath(); cCtx.moveTo(W * 0.57, H * 0.40);
              cCtx.quadraticCurveTo(W * 0.58, H * 0.415, W * 0.565, H * 0.42);
              cCtx.strokeStyle = '#92400e'; cCtx.lineWidth = 0.8; cCtx.stroke();
              // Animated food bolus particle
              var bolusT = (anatTick * 0.008) % 1.0;
              var bolusX, bolusY;
              if (bolusT < 0.3) { bolusX = W * 0.49; bolusY = H * (0.12 + bolusT * 0.7); }
              else if (bolusT < 0.5) { bolusX = W * (0.49 - (bolusT - 0.3) * 0.15); bolusY = H * (0.33 + (bolusT - 0.3) * 0.3); }
              else { bolusX = W * (0.44 + (bolusT - 0.5) * 0.24); bolusY = H * (0.39 + Math.sin((bolusT - 0.5) * 20) * 0.015); }
              cCtx.beginPath(); cCtx.arc(bolusX, bolusY, 3, 0, Math.PI * 2);
              cCtx.fillStyle = '#f9731680'; cCtx.fill();
              // ── Digestive organ labels ──
              cCtx.globalAlpha = 0.35;
              cCtx.font = 'bold 5px Inter, system-ui, sans-serif'; cCtx.textAlign = 'right';
              cCtx.fillStyle = '#92400e';
              cCtx.fillText('Esophagus', W * 0.48, H * 0.20);
              cCtx.fillText('Stomach', W * 0.42, H * 0.33);
              cCtx.textAlign = 'left';
              cCtx.fillText('Duodenum', W * 0.53, H * 0.37);
              cCtx.fillText('S. Intestine', W * 0.57, H * 0.41);
              cCtx.fillStyle = '#78350f';
              cCtx.fillText('Ascending', W * 0.59, H * 0.365);
              cCtx.textAlign = 'right';
              cCtx.fillText('Descending', W * 0.41, H * 0.365);
              cCtx.textAlign = 'center';
              cCtx.fillText('Transverse colon', W * 0.50, H * 0.295);
              cCtx.fillText('Appendix', W * 0.575, H * 0.435);
              cCtx.restore();
            }

            // ── DIAPHRAGM DOME (animated with breathing cycle) ──
            if (sysKey === 'respiratory' || sysKey === 'organs' || layerOn('organs')) {
              cCtx.save(); cCtx.globalAlpha = 0.35;
              // Sync with breathing: diaphragm flattens on inhale, domes up on exhale
              var diaphBreath = Math.sin(anatTick * 0.03) * 0.008; // same freq as lung breathCycle
              var diaphY = 0.28 + diaphBreath; // moves down on inhale (diaphragm contracts/flattens)
              cCtx.beginPath();
              cCtx.moveTo(W * 0.34, H * (diaphY + 0.01));
              cCtx.quadraticCurveTo(W * 0.42, H * (diaphY - 0.005 + diaphBreath), W * 0.50, H * diaphY);
              cCtx.quadraticCurveTo(W * 0.58, H * (diaphY - 0.005 + diaphBreath), W * 0.66, H * (diaphY + 0.01));
              cCtx.strokeStyle = '#f472b6'; cCtx.lineWidth = 1.8; cCtx.setLineDash([4, 3]); cCtx.stroke(); cCtx.setLineDash([]);
              // Diaphragm muscle fibers (radial lines)
              cCtx.globalAlpha = 0.12;
              for (var dfi = 0; dfi < 5; dfi++) {
                var dfx = W * (0.38 + dfi * 0.06);
                cCtx.beginPath(); cCtx.moveTo(dfx, H * (diaphY + 0.008));
                cCtx.lineTo(dfx, H * (diaphY - 0.005));
                cCtx.strokeStyle = '#f472b6'; cCtx.lineWidth = 0.4; cCtx.setLineDash([]); cCtx.stroke();
              }
              cCtx.setLineDash([]);
              cCtx.globalAlpha = 0.35;
              cCtx.font = 'bold 7px Inter, system-ui, sans-serif';
              cCtx.fillStyle = '#f472b6'; cCtx.textAlign = 'right';
              cCtx.fillText('diaphragm', W * 0.34 - 4, H * (diaphY + 0.013));
              cCtx.restore();
            }

            // ── ENDOCRINE GLAND SHAPES (enhanced with hypothalamus, parathyroids, thymus, ovary/testis detail) ──
            if (sysKey === 'endocrine') {
              cCtx.save(); cCtx.globalAlpha = 0.40;
              var endoColor = '#c084fc';
              var endoStroke = '#9333ea';

              // Hypothalamus (above pituitary, in brain)
              cCtx.beginPath(); cCtx.ellipse(W * 0.50, H * 0.065, W * 0.01, H * 0.006, 0, 0, Math.PI * 2);
              var hypoGrad = cCtx.createRadialGradient(W * 0.50, H * 0.065, 0, W * 0.50, H * 0.065, W * 0.01);
              hypoGrad.addColorStop(0, '#e879f9'); hypoGrad.addColorStop(1, '#c084fc40');
              cCtx.fillStyle = hypoGrad; cCtx.fill(); cCtx.strokeStyle = endoStroke; cCtx.lineWidth = 0.7; cCtx.stroke();
              // Connection line: hypothalamus → pituitary
              cCtx.beginPath(); cCtx.moveTo(W * 0.50, H * 0.071); cCtx.lineTo(W * 0.50, H * 0.073);
              cCtx.strokeStyle = endoStroke; cCtx.lineWidth = 0.5; cCtx.setLineDash([1, 1]); cCtx.stroke(); cCtx.setLineDash([]);

              // Pituitary (master gland — slightly larger, with anterior/posterior distinction)
              cCtx.beginPath(); cCtx.ellipse(W * 0.498, H * 0.075, W * 0.005, H * 0.004, 0, 0, Math.PI * 2);
              cCtx.fillStyle = '#e879f9'; cCtx.fill(); // anterior
              cCtx.beginPath(); cCtx.ellipse(W * 0.504, H * 0.075, W * 0.004, H * 0.004, 0, 0, Math.PI * 2);
              cCtx.fillStyle = '#d946ef'; cCtx.fill(); // posterior
              cCtx.beginPath(); cCtx.ellipse(W * 0.50, H * 0.075, W * 0.007, H * 0.005, 0, 0, Math.PI * 2);
              cCtx.strokeStyle = endoStroke; cCtx.lineWidth = 0.8; cCtx.stroke();

              // Pineal gland (in center of brain)
              cCtx.beginPath(); cCtx.arc(W * 0.50, H * 0.048, 2.5, 0, Math.PI * 2);
              var pinealGrad = cCtx.createRadialGradient(W * 0.50, H * 0.047, 0.5, W * 0.50, H * 0.048, 2.5);
              pinealGrad.addColorStop(0, '#f0abfc'); pinealGrad.addColorStop(1, endoColor);
              cCtx.fillStyle = pinealGrad; cCtx.fill(); cCtx.strokeStyle = endoStroke; cCtx.lineWidth = 0.5; cCtx.stroke();

              // Thyroid butterfly (enhanced with isthmus connecting lobes)
              cCtx.beginPath(); cCtx.ellipse(W * 0.475, H * 0.12, W * 0.014, H * 0.01, 0.2, 0, Math.PI * 2);
              cCtx.fillStyle = endoColor + '50'; cCtx.fill(); cCtx.strokeStyle = endoStroke; cCtx.lineWidth = 0.7; cCtx.stroke();
              cCtx.beginPath(); cCtx.ellipse(W * 0.525, H * 0.12, W * 0.014, H * 0.01, -0.2, 0, Math.PI * 2);
              cCtx.fillStyle = endoColor + '50'; cCtx.fill(); cCtx.strokeStyle = endoStroke; cCtx.lineWidth = 0.7; cCtx.stroke();
              // Thyroid isthmus (bridge)
              cCtx.beginPath(); cCtx.moveTo(W * 0.488, H * 0.12); cCtx.lineTo(W * 0.512, H * 0.12);
              cCtx.strokeStyle = endoStroke; cCtx.lineWidth = 1.5; cCtx.stroke();
              // Parathyroids (4 tiny glands on posterior thyroid)
              [[0.468, 0.116], [0.468, 0.124], [0.532, 0.116], [0.532, 0.124]].forEach(function(pt) {
                cCtx.beginPath(); cCtx.arc(W * pt[0], H * pt[1], 1.5, 0, Math.PI * 2);
                cCtx.fillStyle = '#f472b6'; cCtx.fill(); cCtx.strokeStyle = '#be185d'; cCtx.lineWidth = 0.4; cCtx.stroke();
              });

              // Thymus (in upper chest, prominent in children)
              cCtx.beginPath(); cCtx.moveTo(W * 0.48, H * 0.155);
              cCtx.quadraticCurveTo(W * 0.47, H * 0.165, W * 0.48, H * 0.18);
              cCtx.quadraticCurveTo(W * 0.50, H * 0.19, W * 0.52, H * 0.18);
              cCtx.quadraticCurveTo(W * 0.53, H * 0.165, W * 0.52, H * 0.155);
              cCtx.closePath();
              cCtx.fillStyle = endoColor + '30'; cCtx.fill(); cCtx.strokeStyle = endoStroke; cCtx.lineWidth = 0.6; cCtx.stroke();

              // Adrenals (on kidneys — enhanced with cortex/medulla zones)
              [[0.435, 0.33], [0.565, 0.33]].forEach(function(ap) {
                // Outer cortex
                cCtx.beginPath(); cCtx.moveTo(W * (ap[0] - 0.015), H * ap[1]);
                cCtx.quadraticCurveTo(W * ap[0], H * (ap[1] - 0.008), W * (ap[0] + 0.015), H * ap[1]);
                cCtx.fillStyle = '#fbbf2440'; cCtx.fill(); cCtx.strokeStyle = '#f59e0b'; cCtx.lineWidth = 0.7; cCtx.stroke();
                // Inner medulla dot
                cCtx.beginPath(); cCtx.arc(W * ap[0], H * (ap[1] - 0.002), 1.5, 0, Math.PI * 2);
                cCtx.fillStyle = '#f59e0b'; cCtx.fill();
              });

              // Pancreas with islet clusters (enhanced — more islet dots, clearer outline)
              cCtx.beginPath();
              cCtx.moveTo(W * 0.47, H * 0.335); cCtx.quadraticCurveTo(W * 0.50, H * 0.33, W * 0.54, H * 0.34);
              cCtx.quadraticCurveTo(W * 0.55, H * 0.345, W * 0.53, H * 0.35);
              cCtx.quadraticCurveTo(W * 0.50, H * 0.348, W * 0.47, H * 0.345);
              cCtx.closePath();
              cCtx.fillStyle = endoColor + '20'; cCtx.fill(); cCtx.strokeStyle = endoStroke; cCtx.lineWidth = 0.7; cCtx.stroke();
              // Islets of Langerhans (scattered dots)
              for (var ei2 = 0; ei2 < 7; ei2++) {
                cCtx.beginPath(); cCtx.arc(W * (0.475 + ei2 * 0.009), H * (0.338 + Math.sin(ei2 * 2) * 0.003), 1.2, 0, Math.PI * 2);
                cCtx.fillStyle = endoColor; cCtx.fill();
              }

              // Gonads (ovaries — already shown in reproductive, but add endocrine context)
              cCtx.beginPath(); cCtx.ellipse(W * 0.44, H * 0.44, W * 0.008, H * 0.006, 0, 0, Math.PI * 2);
              cCtx.fillStyle = endoColor + '40'; cCtx.fill(); cCtx.strokeStyle = endoStroke; cCtx.lineWidth = 0.5; cCtx.stroke();
              cCtx.beginPath(); cCtx.ellipse(W * 0.56, H * 0.44, W * 0.008, H * 0.006, 0, 0, Math.PI * 2);
              cCtx.fillStyle = endoColor + '40'; cCtx.fill(); cCtx.stroke();
              cCtx.restore();
            }

            // ── REPRODUCTIVE OUTLINES (male/female toggle) ──
            if (sysKey === 'reproductive') {
              var maleAnatomy = d._maleAnatomy === true;
              cCtx.save(); cCtx.globalAlpha = 0.35;
              if (maleAnatomy) {
                // ── Male reproductive anatomy ──
                // Prostate gland (below bladder)
                cCtx.beginPath(); cCtx.ellipse(W * 0.50, H * 0.445, W * 0.012, H * 0.01, 0, 0, Math.PI * 2);
                var prostGrad = cCtx.createRadialGradient(W * 0.50, H * 0.443, 1, W * 0.50, H * 0.445, W * 0.012);
                prostGrad.addColorStop(0, '#a78bfa'); prostGrad.addColorStop(1, '#7c3aed40');
                cCtx.fillStyle = prostGrad; cCtx.fill(); cCtx.strokeStyle = '#7c3aed'; cCtx.lineWidth = 0.8; cCtx.stroke();
                // Seminal vesicles (paired, behind bladder)
                cCtx.beginPath(); cCtx.ellipse(W * 0.47, H * 0.44, W * 0.008, H * 0.005, 0.3, 0, Math.PI * 2);
                cCtx.fillStyle = '#c4b5fd40'; cCtx.fill(); cCtx.strokeStyle = '#7c3aed'; cCtx.lineWidth = 0.5; cCtx.stroke();
                cCtx.beginPath(); cCtx.ellipse(W * 0.53, H * 0.44, W * 0.008, H * 0.005, -0.3, 0, Math.PI * 2);
                cCtx.fillStyle = '#c4b5fd40'; cCtx.fill(); cCtx.stroke();
                // Vas deferens (tubes from testes to prostate)
                cCtx.beginPath(); cCtx.moveTo(W * 0.46, H * 0.52); cCtx.quadraticCurveTo(W * 0.44, H * 0.48, W * 0.47, H * 0.445);
                cCtx.strokeStyle = '#7c3aed'; cCtx.lineWidth = 0.7; cCtx.setLineDash([2, 2]); cCtx.stroke(); cCtx.setLineDash([]);
                cCtx.beginPath(); cCtx.moveTo(W * 0.54, H * 0.52); cCtx.quadraticCurveTo(W * 0.56, H * 0.48, W * 0.53, H * 0.445); cCtx.stroke();
                // Testes (bilateral in pelvic region)
                cCtx.beginPath(); cCtx.ellipse(W * 0.46, H * 0.525, W * 0.013, H * 0.012, 0, 0, Math.PI * 2);
                var testGrad = cCtx.createRadialGradient(W * 0.46, H * 0.523, 1, W * 0.46, H * 0.525, W * 0.013);
                testGrad.addColorStop(0, '#ddd6fe'); testGrad.addColorStop(1, '#a78bfa60');
                cCtx.fillStyle = testGrad; cCtx.fill(); cCtx.strokeStyle = '#7c3aed'; cCtx.lineWidth = 0.8; cCtx.stroke();
                cCtx.beginPath(); cCtx.ellipse(W * 0.54, H * 0.525, W * 0.013, H * 0.012, 0, 0, Math.PI * 2);
                cCtx.fillStyle = testGrad; cCtx.fill(); cCtx.stroke();
                // Epididymis (C-shaped on posterior testes)
                cCtx.beginPath(); cCtx.arc(W * 0.468, H * 0.525, W * 0.006, -0.5, Math.PI + 0.5);
                cCtx.strokeStyle = '#8b5cf6'; cCtx.lineWidth = 0.6; cCtx.stroke();
                cCtx.beginPath(); cCtx.arc(W * 0.532, H * 0.525, W * 0.006, Math.PI - 0.5, 0.5); cCtx.stroke();
                // Label
                cCtx.globalAlpha = 0.3; cCtx.font = 'bold 6px Inter, system-ui, sans-serif';
                cCtx.fillStyle = '#7c3aed'; cCtx.textAlign = 'center';
                cCtx.fillText('\u2642 MALE', W * 0.50, H * 0.56);
              } else {
                // ── Female reproductive anatomy (existing + enhanced) ──
                // Uterus (pear-shaped)
                cCtx.beginPath();
                cCtx.moveTo(W * 0.47, H * 0.40); cCtx.quadraticCurveTo(W * 0.45, H * 0.41, W * 0.45, H * 0.43);
                cCtx.quadraticCurveTo(W * 0.45, H * 0.45, W * 0.50, H * 0.46);
                cCtx.quadraticCurveTo(W * 0.55, H * 0.45, W * 0.55, H * 0.43);
                cCtx.quadraticCurveTo(W * 0.55, H * 0.41, W * 0.53, H * 0.40);
                var uterusGrad = cCtx.createRadialGradient(W * 0.50, H * 0.43, 2, W * 0.50, H * 0.43, W * 0.05);
                uterusGrad.addColorStop(0, '#fce7f3'); uterusGrad.addColorStop(1, '#fce7f300');
                cCtx.fillStyle = uterusGrad; cCtx.fill();
                cCtx.strokeStyle = '#ec4899'; cCtx.lineWidth = 1.5; cCtx.stroke();
                // Endometrial lining hint
                cCtx.beginPath();
                cCtx.moveTo(W * 0.47, H * 0.415); cCtx.quadraticCurveTo(W * 0.465, H * 0.43, W * 0.50, H * 0.445);
                cCtx.quadraticCurveTo(W * 0.535, H * 0.43, W * 0.53, H * 0.415);
                cCtx.strokeStyle = '#ec489960'; cCtx.lineWidth = 0.5; cCtx.stroke();
                // Cervix (narrow bottom of uterus)
                cCtx.beginPath(); cCtx.arc(W * 0.50, H * 0.46, 2, 0, Math.PI * 2);
                cCtx.fillStyle = '#ec489940'; cCtx.fill(); cCtx.strokeStyle = '#ec4899'; cCtx.lineWidth = 0.5; cCtx.stroke();
                // Fallopian tubes (with fimbriae detail)
                cCtx.beginPath(); cCtx.moveTo(W * 0.47, H * 0.40); cCtx.quadraticCurveTo(W * 0.43, H * 0.39, W * 0.40, H * 0.40);
                cCtx.strokeStyle = '#ec4899'; cCtx.lineWidth = 1; cCtx.stroke();
                cCtx.beginPath(); cCtx.moveTo(W * 0.53, H * 0.40); cCtx.quadraticCurveTo(W * 0.57, H * 0.39, W * 0.60, H * 0.40); cCtx.stroke();
                // Fimbriae (finger-like projections at tube ends)
                [[0.395, 0.398], [0.605, 0.398]].forEach(function(fp) {
                  for (var fmi = 0; fmi < 3; fmi++) {
                    var fAngle = -0.5 + fmi * 0.5;
                    cCtx.beginPath(); cCtx.moveTo(W * fp[0], H * fp[1]);
                    cCtx.lineTo(W * (fp[0] + Math.cos(fAngle) * 0.008), H * (fp[1] + Math.sin(fAngle) * 0.006));
                    cCtx.strokeStyle = '#ec4899'; cCtx.lineWidth = 0.5; cCtx.stroke();
                  }
                });
                // Ovaries (with follicle detail)
                cCtx.beginPath(); cCtx.ellipse(W * 0.39, H * 0.405, W * 0.012, H * 0.008, 0, 0, Math.PI * 2);
                cCtx.fillStyle = '#fce7f360'; cCtx.fill(); cCtx.strokeStyle = '#ec4899'; cCtx.lineWidth = 0.8; cCtx.stroke();
                // Follicle dots inside ovary
                cCtx.beginPath(); cCtx.arc(W * 0.392, H * 0.403, 1.5, 0, Math.PI * 2); cCtx.fillStyle = '#ec489960'; cCtx.fill();
                cCtx.beginPath(); cCtx.ellipse(W * 0.61, H * 0.405, W * 0.012, H * 0.008, 0, 0, Math.PI * 2);
                cCtx.fillStyle = '#fce7f360'; cCtx.fill(); cCtx.strokeStyle = '#ec4899'; cCtx.lineWidth = 0.8; cCtx.stroke();
                cCtx.beginPath(); cCtx.arc(W * 0.608, H * 0.403, 1.5, 0, Math.PI * 2); cCtx.fillStyle = '#ec489960'; cCtx.fill();
                // Label
                cCtx.globalAlpha = 0.3; cCtx.font = 'bold 6px Inter, system-ui, sans-serif';
                cCtx.fillStyle = '#ec4899'; cCtx.textAlign = 'center';
                cCtx.fillText('\u2640 FEMALE', W * 0.50, H * 0.485);
              }
              cCtx.restore();
            }

            // ── ANATOMICAL COMPASS ROSE ──
            cCtx.save(); cCtx.globalAlpha = 0.35;
            var compX = W - 28, compY = 20;
            cCtx.beginPath(); cCtx.arc(compX, compY, 14, 0, Math.PI * 2);
            cCtx.fillStyle = '#f8fafc'; cCtx.fill(); cCtx.strokeStyle = '#cbd5e1'; cCtx.lineWidth = 0.8; cCtx.stroke();
            cCtx.beginPath(); cCtx.moveTo(compX, compY - 11); cCtx.lineTo(compX, compY + 11);
            cCtx.moveTo(compX - 11, compY); cCtx.lineTo(compX + 11, compY);
            cCtx.strokeStyle = '#94a3b8'; cCtx.lineWidth = 0.5; cCtx.stroke();
            cCtx.font = 'bold 6px Inter, system-ui, sans-serif'; cCtx.fillStyle = '#94a3b8'; cCtx.textAlign = 'center';
            cCtx.fillText('S', compX, compY - 7);  // Superior
            cCtx.fillText('I', compX, compY + 10);  // Inferior
            cCtx.fillText('L', compX - 8, compY + 2);  // Lateral
            cCtx.fillText('M', compX + 8, compY + 2);  // Medial (for anterior view)
            cCtx.restore();

            // ── BODY REGION LABELS (subtle background labels) ──
            if (d._showRegionLabels === true) {
              cCtx.save(); cCtx.globalAlpha = 0.18;
              cCtx.font = 'bold 7px Inter, system-ui, sans-serif'; cCtx.textAlign = 'left'; cCtx.fillStyle = '#94a3b8';
              cCtx.fillText('HEAD', W * 0.03, H * 0.04);
              cCtx.fillText('THORAX', W * 0.03, H * 0.19);
              cCtx.fillText('ABDOMEN', W * 0.03, H * 0.33);
              cCtx.fillText('PELVIS', W * 0.03, H * 0.43);
              cCtx.fillText('UPPER', W * 0.03, H * 0.27);
              cCtx.fillText('LIMB', W * 0.03, H * 0.29);
              cCtx.fillText('LOWER', W * 0.03, H * 0.60);
              cCtx.fillText('LIMB', W * 0.03, H * 0.62);
              // Region dividing lines
              cCtx.beginPath();
              cCtx.moveTo(W * 0.30, H * 0.135); cCtx.lineTo(W * 0.70, H * 0.135);
              cCtx.moveTo(W * 0.34, H * 0.29); cCtx.lineTo(W * 0.66, H * 0.29);
              cCtx.moveTo(W * 0.38, H * 0.425); cCtx.lineTo(W * 0.62, H * 0.425);
              cCtx.strokeStyle = '#94a3b8'; cCtx.lineWidth = 0.5; cCtx.setLineDash([2, 3]); cCtx.stroke(); cCtx.setLineDash([]);
              cCtx.restore();
            }

            // ── BRAIN REGION MAPPING (all lobes + cerebellum + brainstem) ──
            if (sysKey === 'nervous') {
              cCtx.save(); cCtx.globalAlpha = 0.25;
              var bx = W * 0.50, by = H * 0.055, br = W * 0.044;
              if (view === 'anterior') {
                // Frontal lobe (front)
                cCtx.beginPath(); cCtx.ellipse(bx, by - br * 0.15, br * 0.5, br * 0.6, 0, Math.PI * 1.1, Math.PI * 1.9);
                cCtx.lineTo(bx, by); cCtx.closePath();
                cCtx.fillStyle = '#fca5a540'; cCtx.fill(); cCtx.strokeStyle = '#ef4444'; cCtx.lineWidth = 0.5; cCtx.stroke();
                // Parietal lobe (top)
                cCtx.beginPath(); cCtx.ellipse(bx, by - br * 0.3, br * 0.45, br * 0.35, 0, Math.PI * 1.2, Math.PI * 1.8);
                cCtx.fillStyle = '#93c5fd40'; cCtx.fill(); cCtx.strokeStyle = '#3b82f6'; cCtx.lineWidth = 0.5; cCtx.stroke();
                // Temporal lobes (sides)
                cCtx.beginPath(); cCtx.ellipse(bx - br * 0.55, by + br * 0.1, br * 0.25, br * 0.3, 0.3, 0, Math.PI * 2);
                cCtx.fillStyle = '#86efac40'; cCtx.fill(); cCtx.strokeStyle = '#22c55e'; cCtx.lineWidth = 0.5; cCtx.stroke();
                cCtx.beginPath(); cCtx.ellipse(bx + br * 0.55, by + br * 0.1, br * 0.25, br * 0.3, -0.3, 0, Math.PI * 2);
                cCtx.fillStyle = '#86efac40'; cCtx.fill(); cCtx.strokeStyle = '#22c55e'; cCtx.lineWidth = 0.5; cCtx.stroke();
                // Labels
                cCtx.font = 'bold 5px Inter, system-ui, sans-serif'; cCtx.textAlign = 'center';
                cCtx.globalAlpha = 0.5;
                cCtx.fillStyle = '#ef4444'; cCtx.fillText('F', bx, by - br * 0.05);
                cCtx.fillStyle = '#3b82f6'; cCtx.fillText('P', bx, by - br * 0.45);
                cCtx.fillStyle = '#22c55e'; cCtx.fillText('T', bx - br * 0.55, by + br * 0.15);
                cCtx.fillText('T', bx + br * 0.55, by + br * 0.15);
              } else {
                // Posterior view — occipital lobe + cerebellum visible
                // Occipital lobe (back of brain)
                cCtx.beginPath(); cCtx.ellipse(bx, by + br * 0.05, br * 0.45, br * 0.5, 0, 0, Math.PI * 2);
                cCtx.fillStyle = '#fde68a40'; cCtx.fill(); cCtx.strokeStyle = '#f59e0b'; cCtx.lineWidth = 0.5; cCtx.stroke();
                // Parietal lobe (top, still visible posteriorly)
                cCtx.beginPath(); cCtx.ellipse(bx, by - br * 0.3, br * 0.5, br * 0.35, 0, Math.PI * 1.1, Math.PI * 1.9);
                cCtx.fillStyle = '#93c5fd40'; cCtx.fill(); cCtx.strokeStyle = '#3b82f6'; cCtx.lineWidth = 0.5; cCtx.stroke();
                // Labels
                cCtx.font = 'bold 5px Inter, system-ui, sans-serif'; cCtx.textAlign = 'center';
                cCtx.globalAlpha = 0.5;
                cCtx.fillStyle = '#f59e0b'; cCtx.fillText('O', bx, by + br * 0.1);
                cCtx.fillStyle = '#3b82f6'; cCtx.fillText('P', bx, by - br * 0.35);
              }
              // Cerebellum (visible in both views — below/posterior to cerebrum)
              cCtx.globalAlpha = 0.2;
              cCtx.beginPath(); cCtx.ellipse(bx, H * 0.083, W * 0.024, H * 0.009, 0, 0, Math.PI * 2);
              cCtx.fillStyle = '#d8b4fe40'; cCtx.fill(); cCtx.strokeStyle = '#a855f6'; cCtx.lineWidth = 0.4; cCtx.stroke();
              cCtx.globalAlpha = 0.45;
              cCtx.font = 'bold 4px Inter, system-ui, sans-serif';
              cCtx.fillStyle = '#a855f6'; cCtx.fillText('Cb', bx, H * 0.085);
              // Lateral ventricles (CSF-filled spaces inside brain — C-shaped)
              cCtx.save(); cCtx.globalAlpha = 0.2;
              // Left lateral ventricle
              cCtx.beginPath();
              cCtx.moveTo(bx - br * 0.15, by - br * 0.2);
              cCtx.quadraticCurveTo(bx - br * 0.3, by - br * 0.1, bx - br * 0.35, by + br * 0.1);
              cCtx.quadraticCurveTo(bx - br * 0.25, by + br * 0.2, bx - br * 0.1, by);
              cCtx.strokeStyle = '#60a5fa'; cCtx.lineWidth = 1; cCtx.stroke();
              // Right lateral ventricle (mirror)
              cCtx.beginPath();
              cCtx.moveTo(bx + br * 0.15, by - br * 0.2);
              cCtx.quadraticCurveTo(bx + br * 0.3, by - br * 0.1, bx + br * 0.35, by + br * 0.1);
              cCtx.quadraticCurveTo(bx + br * 0.25, by + br * 0.2, bx + br * 0.1, by);
              cCtx.stroke();
              // Third ventricle (midline slit)
              cCtx.beginPath(); cCtx.moveTo(bx, by - br * 0.1); cCtx.lineTo(bx, by + br * 0.05);
              cCtx.strokeStyle = '#60a5fa'; cCtx.lineWidth = 0.5; cCtx.stroke();
              // Fourth ventricle (in brainstem area)
              cCtx.beginPath(); cCtx.ellipse(bx, H * 0.082, W * 0.004, H * 0.003, 0, 0, Math.PI * 2);
              cCtx.strokeStyle = '#60a5fa'; cCtx.lineWidth = 0.4; cCtx.stroke();
              cCtx.restore();
              // Brainstem label
              cCtx.fillStyle = '#78716c'; cCtx.fillText('BS', bx, H * 0.098);
              cCtx.restore();
            }

            // ── INTEGUMENTARY SKIN TEXTURE OVERLAY ──
            if (sysKey === 'integumentary') {
              cCtx.save(); cCtx.globalAlpha = 0.08;
              // Pore-like stipple pattern over skin areas
              for (var pxi = 0; pxi < 80; pxi++) {
                var px = W * (0.30 + Math.sin(pxi * 7.3) * 0.22);
                var py = H * (0.10 + (pxi / 80) * 0.85);
                if (py > H * 0.93) continue; // skip below feet
                cCtx.beginPath(); cCtx.arc(px, py, 0.8, 0, Math.PI * 2);
                cCtx.fillStyle = '#8d6e63'; cCtx.fill();
              }
              // Hair follicle suggestion on head area
              cCtx.globalAlpha = 0.12;
              for (var hfi = 0; hfi < 12; hfi++) {
                var hfx = W * (0.46 + hfi * 0.007);
                var hfy = H * (0.02 + Math.sin(hfi) * 0.008);
                cCtx.beginPath(); cCtx.moveTo(hfx, hfy); cCtx.lineTo(hfx + 1, hfy - 4);
                cCtx.strokeStyle = '#795548'; cCtx.lineWidth = 0.5; cCtx.stroke();
              }
              // Subtle nail beds at fingertips
              cCtx.globalAlpha = 0.2;
              [[0.13, 0.445], [0.14, 0.442], [0.148, 0.442], [0.155, 0.445], // left hand
               [0.87, 0.445], [0.86, 0.442], [0.852, 0.442], [0.845, 0.445]  // right hand
              ].forEach(function(np) {
                cCtx.beginPath(); cCtx.ellipse(W * np[0], H * np[1], 1.8, 1.2, 0, 0, Math.PI * 2);
                cCtx.fillStyle = '#fce4ec'; cCtx.fill(); cCtx.strokeStyle = '#d4b8a0'; cCtx.lineWidth = 0.3; cCtx.stroke();
              });
              // Body hair patterns (very subtle — anatomical distribution)
              cCtx.globalAlpha = 0.06;
              // Chest hair pattern (midsternal line + pectoral distribution)
              for (var bhi = 0; bhi < 15; bhi++) {
                var bhx = W * (0.45 + Math.sin(bhi * 3.7) * 0.06);
                var bhy = H * (0.16 + bhi * 0.012);
                var bhAngle = Math.sin(bhi * 2.1) * 0.5;
                cCtx.beginPath(); cCtx.moveTo(bhx, bhy);
                cCtx.lineTo(bhx + Math.cos(bhAngle) * 3, bhy + Math.sin(bhAngle) * 3);
                cCtx.strokeStyle = hairColor; cCtx.lineWidth = 0.3; cCtx.stroke();
              }
              // Forearm hair (downward direction)
              for (var ahi = 0; ahi < 8; ahi++) {
                var ahx = W * (0.19 + ahi * 0.005);
                var ahy = H * (0.36 + ahi * 0.012);
                cCtx.beginPath(); cCtx.moveTo(ahx, ahy); cCtx.lineTo(ahx - 1, ahy + 3);
                cCtx.strokeStyle = hairColor; cCtx.lineWidth = 0.2; cCtx.stroke();
                // Mirror right arm
                cCtx.beginPath(); cCtx.moveTo(W - ahx, ahy); cCtx.lineTo(W - ahx + 1, ahy + 3); cCtx.stroke();
              }
              // Leg hair (downward direction on shins)
              for (var lhi = 0; lhi < 10; lhi++) {
                var lhx = W * (0.37 + Math.sin(lhi * 4.3) * 0.02);
                var lhy = H * (0.72 + lhi * 0.018);
                cCtx.beginPath(); cCtx.moveTo(lhx, lhy); cCtx.lineTo(lhx, lhy + 3);
                cCtx.strokeStyle = hairColor; cCtx.lineWidth = 0.2; cCtx.stroke();
                cCtx.beginPath(); cCtx.moveTo(W * 1.0 - lhx, lhy); cCtx.lineTo(W * 1.0 - lhx, lhy + 3); cCtx.stroke();
              }
              // Axillary hair (armpit area — small cluster)
              for (var axi = 0; axi < 4; axi++) {
                var axx = W * (0.34 + Math.sin(axi * 2) * 0.005);
                var axy = H * (0.17 + axi * 0.004);
                cCtx.beginPath(); cCtx.moveTo(axx, axy); cCtx.lineTo(axx - 1, axy + 2);
                cCtx.strokeStyle = hairColor; cCtx.lineWidth = 0.3; cCtx.stroke();
                cCtx.beginPath(); cCtx.moveTo(W * 1.0 - axx, axy); cCtx.lineTo(W * 1.0 - axx + 1, axy + 2); cCtx.stroke();
              }
              cCtx.restore();
            }
            // ── INTEGUMENTARY CROSS-SECTION INSET ──
            if (sysKey === 'integumentary') {
              cCtx.save(); cCtx.globalAlpha = 0.80;
              var csX = W * 0.68, csY = H * 0.02, csW2 = W * 0.30, csH2 = H * 0.18;
              // Background
              cCtx.beginPath(); cCtx.roundRect(csX, csY, csW2, csH2, 6);
              cCtx.fillStyle = '#fff'; cCtx.fill();
              cCtx.strokeStyle = '#e2e8f0'; cCtx.lineWidth = 1; cCtx.stroke();
              cCtx.font = 'bold 7px Inter, system-ui, sans-serif'; cCtx.fillStyle = '#94a3b8'; cCtx.textAlign = 'left';
              cCtx.fillText('SKIN CROSS-SECTION', csX + 4, csY + 10);
              // Epidermis layer
              cCtx.fillStyle = '#fef3c7'; cCtx.fillRect(csX + 4, csY + 15, csW2 - 8, csH2 * 0.15);
              cCtx.font = '6px Inter, system-ui, sans-serif'; cCtx.fillStyle = '#92400e';
              cCtx.fillText('Epidermis', csX + 6, csY + 22);
              // Dermis layer
              cCtx.fillStyle = '#fce7f3'; cCtx.fillRect(csX + 4, csY + 15 + csH2 * 0.15, csW2 - 8, csH2 * 0.40);
              cCtx.fillStyle = '#9f1239';
              cCtx.fillText('Dermis', csX + 6, csY + 15 + csH2 * 0.35);
              // Hair follicle
              var hfX = csX + csW2 * 0.3, hfY0 = csY + 14;
              cCtx.beginPath(); cCtx.moveTo(hfX, hfY0); cCtx.lineTo(hfX - 1, hfY0 + csH2 * 0.45);
              cCtx.strokeStyle = '#78350f'; cCtx.lineWidth = 1.2; cCtx.stroke();
              cCtx.beginPath(); cCtx.arc(hfX - 1, hfY0 + csH2 * 0.45, 3, 0, Math.PI * 2);
              cCtx.fillStyle = '#92400e40'; cCtx.fill(); cCtx.strokeStyle = '#78350f'; cCtx.lineWidth = 0.5; cCtx.stroke();
              // Sweat gland
              var sgX = csX + csW2 * 0.6, sgY = csY + 15 + csH2 * 0.35;
              cCtx.beginPath();
              cCtx.moveTo(sgX, csY + 14); cCtx.lineTo(sgX, sgY - 4);
              cCtx.strokeStyle = '#3b82f6'; cCtx.lineWidth = 0.8; cCtx.stroke();
              cCtx.beginPath();
              for (var swi = 0; swi < 3; swi++) {
                cCtx.arc(sgX + (swi % 2 === 0 ? 2 : -2), sgY + swi * 3, 2, 0, Math.PI * 2);
              }
              cCtx.strokeStyle = '#3b82f6'; cCtx.lineWidth = 0.5; cCtx.stroke();
              // Hypodermis layer
              cCtx.fillStyle = '#fef9c3'; cCtx.fillRect(csX + 4, csY + 15 + csH2 * 0.55, csW2 - 8, csH2 * 0.30);
              cCtx.fillStyle = '#854d0e'; cCtx.fillText('Hypodermis', csX + 6, csY + 15 + csH2 * 0.72);
              // Fat cells
              for (var fci = 0; fci < 4; fci++) {
                cCtx.beginPath(); cCtx.arc(csX + 30 + fci * 14, csY + 15 + csH2 * 0.62, 4, 0, Math.PI * 2);
                cCtx.fillStyle = '#fef08a40'; cCtx.fill(); cCtx.strokeStyle = '#eab308'; cCtx.lineWidth = 0.4; cCtx.stroke();
              }
              // Blood vessel
              cCtx.beginPath();
              cCtx.moveTo(csX + csW2 * 0.75, csY + 15 + csH2 * 0.15);
              cCtx.quadraticCurveTo(csX + csW2 * 0.80, csY + 15 + csH2 * 0.30, csX + csW2 * 0.72, csY + 15 + csH2 * 0.45);
              cCtx.strokeStyle = '#ef4444'; cCtx.lineWidth = 1; cCtx.stroke();
              // Sebaceous gland (attached to hair follicle — produces sebum/oil)
              var sebX = hfX + 5, sebY = hfY0 + csH2 * 0.25;
              cCtx.beginPath(); cCtx.ellipse(sebX, sebY, 3, 2, 0.3, 0, Math.PI * 2);
              cCtx.fillStyle = '#fde68a60'; cCtx.fill(); cCtx.strokeStyle = '#d97706'; cCtx.lineWidth = 0.4; cCtx.stroke();
              // Duct to follicle
              cCtx.beginPath(); cCtx.moveTo(sebX - 2, sebY); cCtx.lineTo(hfX, hfY0 + csH2 * 0.22);
              cCtx.strokeStyle = '#d97706'; cCtx.lineWidth = 0.3; cCtx.stroke();
              cCtx.font = '4px Inter, system-ui, sans-serif'; cCtx.fillStyle = '#d97706'; cCtx.textAlign = 'left';
              cCtx.fillText('Sebaceous', sebX + 4, sebY + 1);
              // Sweat pore at epidermis surface
              cCtx.beginPath(); cCtx.arc(sgX, csY + 14, 1, 0, Math.PI * 2);
              cCtx.fillStyle = '#3b82f6'; cCtx.fill();
              cCtx.font = '4px Inter, system-ui, sans-serif'; cCtx.fillStyle = '#3b82f6';
              cCtx.fillText('Pore', sgX + 3, csY + 15);
              // Nerve fiber (enhanced — with sensory receptor endings)
              cCtx.beginPath();
              cCtx.moveTo(csX + csW2 * 0.85, csY + 15 + csH2 * 0.20);
              cCtx.lineTo(csX + csW2 * 0.85, csY + 15 + csH2 * 0.45);
              cCtx.strokeStyle = '#eab308'; cCtx.lineWidth = 0.6; cCtx.setLineDash([1, 2]); cCtx.stroke(); cCtx.setLineDash([]);
              // Meissner's corpuscle (touch receptor — encapsulated ending in dermis)
              var mcX = csX + csW2 * 0.85, mcY = csY + 15 + csH2 * 0.22;
              cCtx.beginPath(); cCtx.ellipse(mcX, mcY, 2.5, 3.5, 0, 0, Math.PI * 2);
              cCtx.strokeStyle = '#eab308'; cCtx.lineWidth = 0.4; cCtx.stroke();
              // Internal lamellae (concentric ovals inside)
              cCtx.beginPath(); cCtx.ellipse(mcX, mcY, 1.5, 2, 0, 0, Math.PI * 2);
              cCtx.strokeStyle = '#eab30860'; cCtx.lineWidth = 0.3; cCtx.stroke();
              cCtx.font = '4px Inter, system-ui, sans-serif'; cCtx.fillStyle = '#eab308'; cCtx.textAlign = 'left';
              cCtx.fillText('Meissner', mcX + 4, mcY + 1);
              // Pacinian corpuscle (deep pressure receptor — larger, in hypodermis)
              var pcX = csX + csW2 * 0.85, pcY = csY + 15 + csH2 * 0.45;
              cCtx.beginPath(); cCtx.ellipse(pcX, pcY, 3, 4.5, 0, 0, Math.PI * 2);
              cCtx.strokeStyle = '#eab308'; cCtx.lineWidth = 0.4; cCtx.stroke();
              for (var pli = 0; pli < 3; pli++) {
                cCtx.beginPath(); cCtx.ellipse(pcX, pcY, 1.5 + pli, 2.5 + pli, 0, 0, Math.PI * 2);
                cCtx.strokeStyle = '#eab30830'; cCtx.lineWidth = 0.2; cCtx.stroke();
              }
              cCtx.font = '4px Inter, system-ui, sans-serif'; cCtx.fillStyle = '#eab308';
              cCtx.fillText('Pacinian', pcX + 5, pcY + 1);
              // Layer labels with arrows
              cCtx.fillStyle = '#94a3b8'; cCtx.font = '4px Inter, system-ui, sans-serif';
              cCtx.fillText('Hair', hfX + 2, hfY0 + 5);
              cCtx.fillText('Sweat gland', sgX + 5, sgY + 6);
              cCtx.restore();
            }

            // ── SEARCH HIGHLIGHTING on canvas ──
            if (searchTerm && searchTerm.length >= 2) {
              filtered.forEach(function(st) {
                if (st.name.toLowerCase().indexOf(searchTerm) >= 0) {
                  var shx = st.x * W, shy = st.y * H;
                  cCtx.save();
                  var shPulse = 1.0 + Math.sin(anatTick * 0.08) * 0.3;
                  cCtx.globalAlpha = 0.3;
                  var shGlow = cCtx.createRadialGradient(shx, shy, 2, shx, shy, 14 + shPulse * 4);
                  shGlow.addColorStop(0, '#fbbf24');
                  shGlow.addColorStop(1, '#fbbf2400');
                  cCtx.beginPath(); cCtx.arc(shx, shy, 14 + shPulse * 4, 0, Math.PI * 2);
                  cCtx.fillStyle = shGlow; cCtx.fill();
                  cCtx.restore();
                }
              });
            }

            // ── MUSCLE ORIGIN/INSERTION MARKERS ──
            if (sel && sel.origin && sel.insertion) {
              cCtx.save(); cCtx.globalAlpha = 0.6;
              var oiX = sel.x * W, oiY = sel.y * H;
              // Origin marker (red, above)
              cCtx.beginPath(); cCtx.arc(oiX - 6, oiY - 10, 3.5, 0, Math.PI * 2);
              cCtx.fillStyle = '#ef4444'; cCtx.fill(); cCtx.strokeStyle = '#fff'; cCtx.lineWidth = 1; cCtx.stroke();
              cCtx.font = 'bold 5px Inter, system-ui, sans-serif'; cCtx.fillStyle = '#fff'; cCtx.textAlign = 'center';
              cCtx.fillText('O', oiX - 6, oiY - 8.5);
              // Insertion marker (blue, below)
              cCtx.beginPath(); cCtx.arc(oiX + 6, oiY + 10, 3.5, 0, Math.PI * 2);
              cCtx.fillStyle = '#3b82f6'; cCtx.fill(); cCtx.strokeStyle = '#fff'; cCtx.lineWidth = 1; cCtx.stroke();
              cCtx.fillStyle = '#fff';
              cCtx.fillText('I', oiX + 6, oiY + 11.5);
              cCtx.restore();
            }

            // ── CONFETTI PARTICLES ──
            if (confettiParticles.length > 0) {
              cCtx.save();
              var confettiColors = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#ec4899', '#8b5cf6', '#f97316'];
              confettiParticles.forEach(function(cp) {
                var age = (Date.now() - cp.born) * 0.001;
                if (age > 2) return;
                var cpx2 = cp.x * W + cp.vx * age * W * 0.15;
                var cpy2 = cp.y * H + cp.vy * age * H * 0.2 + age * age * H * 0.08;
                cCtx.globalAlpha = Math.max(0, 1 - age * 0.5);
                cCtx.save();
                cCtx.translate(cpx2, cpy2);
                cCtx.rotate(cp.rot + age * cp.spin);
                cCtx.fillStyle = confettiColors[cp.ci % confettiColors.length];
                cCtx.fillRect(-3, -1.5, 6, 3);
                cCtx.restore();
              });
              cCtx.restore();
            }

            // ── X-ray film label ──
            if (xrayMode) {
              cCtx.save(); cCtx.globalAlpha = 0.4;
              cCtx.font = 'bold 8px monospace'; cCtx.fillStyle = '#e0f0ff'; cCtx.textAlign = 'left';
              cCtx.fillText('X-RAY', 8, 14);
              cCtx.font = '6px monospace';
              cCtx.fillText(view === 'anterior' ? 'AP VIEW' : 'PA VIEW', 8, 22);
              cCtx.textAlign = 'right';
              cCtx.fillText('R', 14, H * 0.5);
              cCtx.textAlign = 'left';
              cCtx.fillText('L', W - 14, H * 0.5);
              cCtx.restore();
            }

            // ── Anatomical region glow for selected structure ──
            if (sel) {
              cCtx.save();
              var glowX = sel.x * W, glowY = sel.y * H;
              var regionGlow = cCtx.createRadialGradient(glowX, glowY, 2, glowX, glowY, 35);
              regionGlow.addColorStop(0, sys.accent + '25');
              regionGlow.addColorStop(0.6, sys.accent + '10');
              regionGlow.addColorStop(1, sys.accent + '00');
              cCtx.beginPath(); cCtx.arc(glowX, glowY, 35, 0, Math.PI * 2);
              cCtx.fillStyle = regionGlow; cCtx.fill();
              cCtx.restore();

              // ── Muscle origin (O) and insertion (I) indicators ──
              if (sel.origin && sel.insertion && sysKey === 'muscular') {
                cCtx.save(); cCtx.globalAlpha = 0.55;
                var sx = sel.x * W, sy = sel.y * H;
                // Origin: estimate ~20px above structure (toward proximal/central)
                var ox = sx + (W * 0.50 - sx) * 0.3, oy = sy - 20;
                // Insertion: estimate ~20px below structure (toward distal/peripheral)
                var ix = sx - (W * 0.50 - sx) * 0.1, iy = sy + 20;
                // Clamp within canvas
                oy = Math.max(15, Math.min(H - 15, oy));
                iy = Math.max(15, Math.min(H - 15, iy));
                // Dashed line showing muscle action vector
                cCtx.beginPath(); cCtx.moveTo(ox, oy); cCtx.lineTo(ix, iy);
                cCtx.strokeStyle = '#94a3b8'; cCtx.lineWidth = 1; cCtx.setLineDash([3, 3]); cCtx.stroke(); cCtx.setLineDash([]);
                // Origin dot (red — "O" for origin stays put)
                cCtx.beginPath(); cCtx.arc(ox, oy, 5, 0, Math.PI * 2);
                cCtx.fillStyle = '#ef444490'; cCtx.fill(); cCtx.strokeStyle = '#dc2626'; cCtx.lineWidth = 1; cCtx.stroke();
                cCtx.font = 'bold 7px Inter, system-ui, sans-serif';
                cCtx.fillStyle = '#dc2626'; cCtx.textAlign = 'center'; cCtx.fillText('O', ox, oy + 2.5);
                // Insertion dot (blue — "I" for insertion moves)
                cCtx.beginPath(); cCtx.arc(ix, iy, 5, 0, Math.PI * 2);
                cCtx.fillStyle = '#3b82f690'; cCtx.fill(); cCtx.strokeStyle = '#2563eb'; cCtx.lineWidth = 1; cCtx.stroke();
                cCtx.fillStyle = '#2563eb'; cCtx.fillText('I', ix, iy + 2.5);
                // Arrow on action vector (points from insertion toward origin — direction of pull)
                var adx = ox - ix, ady = oy - iy;
                var aLen = Math.sqrt(adx * adx + ady * ady);
                if (aLen > 0) {
                  var anx = adx / aLen, any = ady / aLen;
                  var arrowX = ix + anx * 10, arrowY = iy + any * 10;
                  cCtx.beginPath();
                  cCtx.moveTo(arrowX + any * 3, arrowY - anx * 3);
                  cCtx.lineTo(arrowX + anx * 5, arrowY + any * 5);
                  cCtx.lineTo(arrowX - any * 3, arrowY + anx * 3);
                  cCtx.fillStyle = '#94a3b8'; cCtx.fill();
                }
                cCtx.restore();
              }

              // ── Depth label (superficial / deep) for selected structure ──
              if (sel) {
                cCtx.save(); cCtx.globalAlpha = 0.4;
                // Estimate depth from Y position and system type
                var isDeep = (sel.id && (sel.id.indexOf('kidney') >= 0 || sel.id.indexOf('pancreas') >= 0 || sel.id.indexOf('aorta') >= 0 || sel.id.indexOf('vena') >= 0 || sel.id.indexOf('spinal') >= 0 || sel.id.indexOf('pituitary') >= 0 || sel.id.indexOf('adrenal') >= 0));
                var isMid = (sel.id && (sel.id.indexOf('heart') >= 0 || sel.id.indexOf('lung') >= 0 || sel.id.indexOf('liver') >= 0 || sel.id.indexOf('stomach') >= 0 || sel.id.indexOf('intestin') >= 0));
                var depthLabel = isDeep ? 'DEEP' : isMid ? 'INTERMEDIATE' : null;
                if (depthLabel) {
                  cCtx.font = 'bold 6px monospace';
                  cCtx.fillStyle = isDeep ? '#ef4444' : '#f59e0b';
                  cCtx.textAlign = 'left';
                  cCtx.fillText(depthLabel, sel.x * W + 14, sel.y * H - 14);
                }
                cCtx.restore();
              }
            }

            // ── Structure Markers ──
            filtered.forEach(function(st) {
              var placedMarker = markerPosition(st);
              var px = placedMarker.x * W, py = placedMarker.y * H;
              if (placedMarker.displaced) {
                cCtx.save();
                cCtx.beginPath();
                cCtx.moveTo(placedMarker.baseX * W, placedMarker.baseY * H);
                cCtx.lineTo(px, py);
                cCtx.strokeStyle = sys.accent + '55'; cCtx.lineWidth = 1; cCtx.stroke();
                cCtx.restore();
              }
              var isSel = sel && sel.id === st.id;
              var isHover = hoverStructure === st.id;
              var markerConfidence = structureConfidence[st.id] || null;
              var r = isSel ? 10 : isHover ? 8 : 6;
              if (isSel) {
                var pulse = 1.0 + Math.sin(anatTick * 0.06) * 0.3;
                cCtx.save();
                cCtx.globalAlpha = 0.3 - pulse * 0.1;
                cCtx.beginPath(); cCtx.arc(px, py, r + 6 + pulse * 4, 0, Math.PI * 2);
                cCtx.strokeStyle = sys.accent; cCtx.lineWidth = 1.5; cCtx.stroke();
                cCtx.restore();
                cCtx.save();
                var sGlow = cCtx.createRadialGradient(px, py, r * 0.3, px, py, r + 4);
                sGlow.addColorStop(0, sys.accent + '70');
                sGlow.addColorStop(1, sys.accent + '00');
                cCtx.beginPath(); cCtx.arc(px, py, r + 4, 0, Math.PI * 2);
                cCtx.fillStyle = sGlow; cCtx.fill();
                cCtx.restore();
              }
              if (isHover && !isSel) {
                cCtx.save();
                cCtx.beginPath(); cCtx.arc(px, py, r + 4, 0, Math.PI * 2);
                cCtx.strokeStyle = sys.accent + 'a0'; cCtx.lineWidth = 2; cCtx.stroke();
                cCtx.restore();
              }
              var mG = cCtx.createRadialGradient(px - 1, py - 1, 1, px, py, r);
              mG.addColorStop(0, isSel ? sys.accent + 'cc' : isHover ? sys.accent + 'bb' : sys.accent + '88');
              mG.addColorStop(1, sys.accent);
              cCtx.beginPath(); cCtx.arc(px, py, r, 0, Math.PI * 2);
              cCtx.fillStyle = mG; cCtx.fill();
              cCtx.strokeStyle = '#fff'; cCtx.lineWidth = 2; cCtx.stroke();
              var markerStatusVisible = !spotterActive || spotterFeedback !== null;
              if (markerConfidence && markerStatusVisible) {
                var markerStatusSymbol = markerConfidence === 'practice' ? '!' : markerConfidence === 'learning' ? '~' : '✓';
                cCtx.save();
                cCtx.font = '900 ' + (markerConfidence === 'mastered' ? 8 : 9) + 'px Inter, system-ui, sans-serif';
                cCtx.textAlign = 'center';
                cCtx.textBaseline = 'middle';
                cCtx.lineJoin = 'round';
                cCtx.strokeStyle = 'rgba(15,23,42,.7)';
                cCtx.lineWidth = 2;
                cCtx.strokeText(markerStatusSymbol, px, py + 0.5);
                cCtx.fillStyle = '#fff';
                cCtx.fillText(markerStatusSymbol, px, py + 0.5);
                cCtx.restore();
              }
              var showSelectedLabel = !spotterActive || spotterFeedback !== null;
              if (isSel && showSelectedLabel) {
                cCtx.save();
                var labelOnLeft = px > W * 0.55;
                var selectedLabel = st.name.length > 26 ? st.name.substring(0, 25).trim() + '...' : st.name;
                cCtx.font = 'bold 9px Inter, system-ui, sans-serif';
                var tw = cCtx.measureText(selectedLabel).width;
                var pillW = tw + 12;
                var pillX = labelOnLeft ? px - pillW - 18 : px + 18;
                pillX = Math.max(5, Math.min(W - pillW - 5, pillX));
                var pillY = py - 7;
                cCtx.beginPath();
                cCtx.moveTo(px + (labelOnLeft ? -r - 2 : r + 2), py);
                cCtx.lineTo(labelOnLeft ? pillX + pillW : pillX, py);
                cCtx.strokeStyle = sys.accent + '80'; cCtx.lineWidth = 1.25; cCtx.stroke();
                cCtx.save(); cCtx.shadowColor = 'rgba(15,23,42,0.22)'; cCtx.shadowBlur = 6; cCtx.shadowOffsetY = 2;
                cCtx.beginPath();
                cCtx.roundRect(pillX, pillY, pillW, 16, 5);
                cCtx.fillStyle = sys.accent; cCtx.fill();
                cCtx.restore();
                cCtx.textAlign = 'left';
                cCtx.fillStyle = '#fff';
                cCtx.fillText(selectedLabel, pillX + 6, py + 3);
                cCtx.restore();
              }
            });

            // ── Hover tooltip (enhanced callout with leader line) ──
            if (hoverStructure && (!sel || hoverStructure !== sel.id)) {
              var hSt = null;
              for (var hsi = 0; hsi < filtered.length; hsi++) {
                if (filtered[hsi].id === hoverStructure) { hSt = filtered[hsi]; break; }
              }
              if (hSt) {
                cCtx.save();
                var hoveredMarker = markerPosition(hSt);
                var pinX = hoveredMarker.x * W, pinY = hoveredMarker.y * H;
                // Determine label position (prefer right, fall back to left if near edge)
                var labelOnRight = pinX < W * 0.65;
                var offsetX = labelOnRight ? 20 : -20;

                // Spotter mode protection: if spotter is active and feedback is pending, hide name
                var showName = !spotterActive || spotterFeedback !== null;
                var displayName = showName ? hSt.name : 'Structure Pin';
                var displayFn = showName ? (hSt.fn || '') : 'Click to select this structure';

                // Structure name
                cCtx.font = 'bold 9px Inter, system-ui, sans-serif';
                var htw = cCtx.measureText(displayName).width;
                // Brief function text (first 40 chars)
                var briefFn = displayFn.substring(0, 45);
                if (displayFn.length >= 45) briefFn = briefFn.substring(0, briefFn.lastIndexOf(' ')) + '...';
                cCtx.font = '7px Inter, system-ui, sans-serif';
                var fnW = briefFn ? cCtx.measureText(briefFn).width : 0;
                var boxW = Math.max(htw, fnW) + 14;
                var boxH = briefFn ? 28 : 16;

                var htx = labelOnRight ? pinX + offsetX : pinX - offsetX - boxW;
                var hty = pinY - boxH / 2;
                if (htx < 4) htx = 4;
                if (htx + boxW > W - 4) htx = W - boxW - 4;
                if (hty < 4) hty = 4;
                if (hty + boxH > H - 4) hty = H - boxH - 4;

                // Leader line from pin to label box
                cCtx.beginPath();
                cCtx.moveTo(pinX, pinY);
                cCtx.lineTo(labelOnRight ? htx : htx + boxW, hty + boxH / 2);
                cCtx.strokeStyle = sys.accent + '80'; cCtx.lineWidth = 1; cCtx.stroke();

                // Pin dot
                cCtx.beginPath(); cCtx.arc(pinX, pinY, 3, 0, Math.PI * 2);
                cCtx.fillStyle = sys.accent; cCtx.fill();

                // Label callout box
                cCtx.beginPath(); cCtx.roundRect(htx, hty, boxW, boxH, 4);
                cCtx.fillStyle = 'var(--allo-stem-deeper, rgba(15,23,42,0.85))'; cCtx.fill();
                cCtx.strokeStyle = sys.accent + '60'; cCtx.lineWidth = 0.8; cCtx.stroke();

                // Structure name text
                cCtx.font = 'bold 9px Inter, system-ui, sans-serif';
                cCtx.fillStyle = '#fff'; cCtx.textAlign = 'left';
                cCtx.fillText(displayName, htx + 6, hty + 11);

                // Brief function text
                if (briefFn) {
                  cCtx.font = '7px Inter, system-ui, sans-serif';
                  cCtx.fillStyle = '#94a3b8';
                  cCtx.fillText(briefFn, htx + 6, hty + 22);
                }
                cCtx.restore();
              }
            }

            // ── Spotter test pin overlay (medical targeting reticle) ──
            if (spotterActive && spotterTarget) {
              var spSt = null;
              for (var spi2 = 0; spi2 < filtered.length; spi2++) {
                if (filtered[spi2].id === spotterTarget) { spSt = filtered[spi2]; break; }
              }
              if (spSt) {
                var spx = spSt.x * W, spy2 = spSt.y * H;
                var spPulse = 1.0 + Math.sin(anatTick * 0.1) * 0.4;
                var spRotation = anatTick * 0.02; // slow rotation
                cCtx.save();
                
                // Add drop shadow to make the reticle pop on any background color
                cCtx.shadowColor = 'rgba(0, 0, 0, 0.7)';
                cCtx.shadowBlur = 5;
                cCtx.shadowOffsetX = 0;
                cCtx.shadowOffsetY = 0;

                // Outer rotating dashed ring (Cyan/Teal)
                cCtx.globalAlpha = 0.6 + Math.sin(anatTick * 0.08) * 0.15;
                cCtx.save(); cCtx.translate(spx, spy2); cCtx.rotate(spRotation);
                cCtx.beginPath(); cCtx.arc(0, 0, 20 + spPulse * 5, 0, Math.PI * 2);
                cCtx.strokeStyle = '#06b6d4'; cCtx.lineWidth = 2.5; cCtx.setLineDash([6, 4]); cCtx.stroke(); cCtx.setLineDash([]);
                cCtx.restore();
                
                // Inner counter-rotating ring (Bright Turquoise)
                cCtx.globalAlpha = 0.7 + Math.sin(anatTick * 0.1) * 0.1;
                cCtx.save(); cCtx.translate(spx, spy2); cCtx.rotate(-spRotation * 0.7);
                cCtx.beginPath(); cCtx.arc(0, 0, 14 + spPulse * 2, 0, Math.PI * 2);
                cCtx.strokeStyle = '#22d3ee'; cCtx.lineWidth = 1.5; cCtx.setLineDash([3, 5]); cCtx.stroke(); cCtx.setLineDash([]);
                cCtx.restore();
                
                // Inner target fill (translucent cyan)
                cCtx.globalAlpha = 0.4;
                cCtx.beginPath(); cCtx.arc(spx, spy2, 8, 0, Math.PI * 2);
                cCtx.fillStyle = '#06b6d4'; cCtx.fill();
                
                // Center dot (bright cyan with dark shadow)
                cCtx.globalAlpha = 1.0;
                cCtx.beginPath(); cCtx.arc(spx, spy2, 3, 0, Math.PI * 2);
                cCtx.fillStyle = '#22d3ee'; cCtx.fill();
                cCtx.beginPath(); cCtx.arc(spx, spy2, 1, 0, Math.PI * 2);
                cCtx.fillStyle = '#ffffff'; cCtx.fill();
                
                // Crosshair lines (Cyan)
                cCtx.globalAlpha = 0.95;
                cCtx.beginPath(); cCtx.moveTo(spx - 14, spy2); cCtx.lineTo(spx - 5, spy2);
                cCtx.moveTo(spx + 5, spy2); cCtx.lineTo(spx + 14, spy2);
                cCtx.moveTo(spx, spy2 - 14); cCtx.lineTo(spx, spy2 - 5);
                cCtx.moveTo(spx, spy2 + 5); cCtx.lineTo(spx, spy2 + 14);
                cCtx.strokeStyle = '#06b6d4'; cCtx.lineWidth = 2; cCtx.stroke();
                
                // Corner brackets (L-shaped brackets at cardinal points)
                var brkR = 24 + spPulse * 4; var brkLen = 6;
                cCtx.globalAlpha = 0.85;
                cCtx.beginPath();
                // Top-left bracket
                cCtx.moveTo(spx - brkR, spy2 - brkR + brkLen); cCtx.lineTo(spx - brkR, spy2 - brkR); cCtx.lineTo(spx - brkR + brkLen, spy2 - brkR);
                // Top-right bracket
                cCtx.moveTo(spx + brkR - brkLen, spy2 - brkR); cCtx.lineTo(spx + brkR, spy2 - brkR); cCtx.lineTo(spx + brkR, spy2 - brkR + brkLen);
                // Bottom-left bracket
                cCtx.moveTo(spx - brkR, spy2 + brkR - brkLen); cCtx.lineTo(spx - brkR, spy2 + brkR); cCtx.lineTo(spx - brkR + brkLen, spy2 + brkR);
                // Bottom-right bracket
                cCtx.moveTo(spx + brkR - brkLen, spy2 + brkR); cCtx.lineTo(spx + brkR, spy2 + brkR); cCtx.lineTo(spx + brkR, spy2 + brkR - brkLen);
                cCtx.strokeStyle = '#06b6d4'; cCtx.lineWidth = 2; cCtx.stroke();
                cCtx.restore();
              }
            }

            // ── Compare highlight ──
            if (compareSel && (!sel || compareSel.id !== sel.id)) {
              var cpSt = null;
              for (var cpi = 0; cpi < filtered.length; cpi++) {
                if (filtered[cpi].id === compareSel.id) { cpSt = filtered[cpi]; break; }
              }
              if (cpSt) {
                var cpx = cpSt.x * W, cpy = cpSt.y * H;
                cCtx.save(); cCtx.globalAlpha = 0.5;
                cCtx.beginPath(); cCtx.arc(cpx, cpy, 11, 0, Math.PI * 2);
                cCtx.strokeStyle = '#8b5cf6'; cCtx.lineWidth = 2.5; cCtx.setLineDash([3, 3]); cCtx.stroke(); cCtx.setLineDash([]);
                cCtx.font = 'bold 8px Inter, system-ui, sans-serif';
                cCtx.fillStyle = '#8b5cf6'; cCtx.textAlign = 'center';
                cCtx.fillText('B', cpx, cpy + 3);
                cCtx.restore();
              }
            }

            // ── Quiz answer visual feedback on canvas ──
            if (quizFeedback && quizMode) {
              var quizQ2 = quizPool[quizRoundIdx % quizPool.length];
              if (quizQ2) {
                var qfx = quizQ2.x * W, qfy = quizQ2.y * H;
                var qfCorrect = quizFeedback.correct;
                var qfFade = Math.min(1, (anatTick % 120) / 15); // fade in over ~15 frames
                cCtx.save(); cCtx.globalAlpha = Math.max(0, 0.7 - Math.max(0, ((anatTick % 120) - 60) / 60)); // fade out after 60 frames
                if (qfCorrect) {
                  // Green checkmark with burst
                  var burstR = 15 + Math.min(8, (anatTick % 120) * 0.3);
                  var burstGlow = cCtx.createRadialGradient(qfx, qfy, 2, qfx, qfy, burstR);
                  burstGlow.addColorStop(0, '#22c55e66'); burstGlow.addColorStop(1, '#22c55e00');
                  cCtx.beginPath(); cCtx.arc(qfx, qfy, burstR, 0, Math.PI * 2);
                  cCtx.fillStyle = burstGlow; cCtx.fill();
                  // Checkmark
                  cCtx.beginPath(); cCtx.moveTo(qfx - 6, qfy); cCtx.lineTo(qfx - 2, qfy + 5); cCtx.lineTo(qfx + 7, qfy - 5);
                  cCtx.strokeStyle = '#16a34a'; cCtx.lineWidth = 3; cCtx.lineCap = 'round'; cCtx.stroke();
                } else {
                  // Red X with shake
                  var shakeX = Math.sin(anatTick * 0.5) * 2;
                  cCtx.beginPath(); cCtx.moveTo(qfx - 5 + shakeX, qfy - 5); cCtx.lineTo(qfx + 5 + shakeX, qfy + 5);
                  cCtx.moveTo(qfx + 5 + shakeX, qfy - 5); cCtx.lineTo(qfx - 5 + shakeX, qfy + 5);
                  cCtx.strokeStyle = '#dc2626'; cCtx.lineWidth = 3; cCtx.lineCap = 'round'; cCtx.stroke();
                }
                cCtx.restore();
              }
            }

            // ── PATHWAY ANIMATED PARTICLES (visual flow along active pathway) ──
            if (activePathwayId && PATHWAYS) {
              var activePW = null;
              for (var pwi = 0; pwi < PATHWAYS.length; pwi++) { if (PATHWAYS[pwi].id === activePathwayId) { activePW = PATHWAYS[pwi]; break; } }
              if (activePW && activePW.steps.length > 1) {
                cCtx.save(); cCtx.globalAlpha = 0.4;
                // Resolve step positions from structure IDs
                var stepPositions = [];
                activePW.steps.forEach(function(step) {
                  var stMatch = null;
                  for (var asi = 0; asi < allStructures.length; asi++) {
                    if (allStructures[asi].id === step.structure) { stMatch = allStructures[asi]; break; }
                  }
                  stepPositions.push(stMatch ? { x: stMatch.x * W, y: stMatch.y * H } : null);
                });
                // Draw pathway trace line connecting all step positions
                cCtx.beginPath();
                var firstPos = true;
                stepPositions.forEach(function(sp) {
                  if (sp) { if (firstPos) { cCtx.moveTo(sp.x, sp.y); firstPos = false; } else { cCtx.lineTo(sp.x, sp.y); } }
                });
                cCtx.strokeStyle = activePW.color; cCtx.lineWidth = 1.5; cCtx.setLineDash([4, 4]); cCtx.stroke(); cCtx.setLineDash([]);
                // Waypoint dots at each step
                stepPositions.forEach(function(sp, spIdx) {
                  if (!sp) return;
                  var isCurrent = spIdx === pathwayStepIdx;
                  cCtx.beginPath(); cCtx.arc(sp.x, sp.y, isCurrent ? 5 : 3, 0, Math.PI * 2);
                  cCtx.fillStyle = isCurrent ? activePW.color : activePW.color + '80';
                  cCtx.fill();
                  if (isCurrent) {
                    // Pulsing ring on current step
                    var pwPulse = 1.0 + Math.sin(anatTick * 0.1) * 0.3;
                    cCtx.beginPath(); cCtx.arc(sp.x, sp.y, 8 + pwPulse * 3, 0, Math.PI * 2);
                    cCtx.strokeStyle = activePW.color; cCtx.lineWidth = 1.5; cCtx.stroke();
                  }
                });
                // Animated traveling particles (3 particles spread along the path)
                for (var ppi = 0; ppi < 3; ppi++) {
                  var ppT = ((anatTick * 0.008 + ppi * 0.33) % 1.0);
                  var ppSegIdx = Math.floor(ppT * (stepPositions.length - 1));
                  var ppFrac = (ppT * (stepPositions.length - 1)) - ppSegIdx;
                  var ppFrom = stepPositions[ppSegIdx];
                  var ppTo = stepPositions[Math.min(ppSegIdx + 1, stepPositions.length - 1)];
                  if (ppFrom && ppTo) {
                    var ppx = ppFrom.x + (ppTo.x - ppFrom.x) * ppFrac;
                    var ppy = ppFrom.y + (ppTo.y - ppFrom.y) * ppFrac;
                    cCtx.beginPath(); cCtx.arc(ppx, ppy, 3.5, 0, Math.PI * 2);
                    cCtx.fillStyle = activePW.color; cCtx.globalAlpha = 0.7; cCtx.fill(); cCtx.globalAlpha = 0.4;
                    // Trail
                    cCtx.beginPath(); cCtx.arc(ppx, ppy, 6, 0, Math.PI * 2);
                    var trailGrad = cCtx.createRadialGradient(ppx, ppy, 1, ppx, ppy, 6);
                    trailGrad.addColorStop(0, activePW.color + '40'); trailGrad.addColorStop(1, activePW.color + '00');
                    cCtx.fillStyle = trailGrad; cCtx.fill();
                  }
                }
                // Step counter label
                cCtx.globalAlpha = 0.6;
                cCtx.font = 'bold 7px monospace';
                cCtx.fillStyle = activePW.color; cCtx.textAlign = 'right';
                cCtx.fillText(activePW.icon + ' ' + (pathwayStepIdx + 1) + '/' + activePW.steps.length, W - 8, 14);
                cCtx.restore();
              }
            }

            // ── CONNECTION VISUALIZATION (lines between connected systems) ──
            if (connectionsViewed && activeTab === 'connections') {
              cCtx.save(); cCtx.globalAlpha = 0.30;
              // Map system keys to representative body positions
              var sysPositions = {
                circulatory: { x: 0.50, y: 0.24 }, respiratory: { x: 0.42, y: 0.22 },
                nervous: { x: 0.50, y: 0.06 }, muscular: { x: 0.42, y: 0.54 },
                skeletal: { x: 0.50, y: 0.44 }, endocrine: { x: 0.50, y: 0.075 },
                reproductive: { x: 0.50, y: 0.44 }, lymphatic: { x: 0.50, y: 0.18 },
                integumentary: { x: 0.35, y: 0.30 }, organs: { x: 0.50, y: 0.32 }
              };
              CONNECTIONS.forEach(function(conn) {
                if (!connectionsViewed[conn.id]) return;
                var s1 = sysPositions[conn.systems[0]], s2 = sysPositions[conn.systems[1]];
                if (!s1 || !s2) return;
                var cx1 = s1.x * W, cy1 = s1.y * H, cx2 = s2.x * W, cy2 = s2.y * H;
                // Curved connecting line
                var cmx = (cx1 + cx2) / 2 + (cy2 - cy1) * 0.15; // offset midpoint for curve
                var cmy = (cy1 + cy2) / 2 - (cx2 - cx1) * 0.15;
                cCtx.beginPath(); cCtx.moveTo(cx1, cy1);
                cCtx.quadraticCurveTo(cmx, cmy, cx2, cy2);
                cCtx.strokeStyle = sys.accent; cCtx.lineWidth = 1.5; cCtx.setLineDash([4, 3]); cCtx.stroke(); cCtx.setLineDash([]);
                // System endpoint dots
                cCtx.beginPath(); cCtx.arc(cx1, cy1, 4, 0, Math.PI * 2);
                cCtx.fillStyle = sys.accent + '60'; cCtx.fill(); cCtx.strokeStyle = sys.accent; cCtx.lineWidth = 0.8; cCtx.stroke();
                cCtx.beginPath(); cCtx.arc(cx2, cy2, 4, 0, Math.PI * 2);
                cCtx.fillStyle = sys.accent + '60'; cCtx.fill(); cCtx.stroke();
                // Bidirectional arrow at midpoint
                cCtx.beginPath(); cCtx.arc(cmx, cmy, 3, 0, Math.PI * 2);
                cCtx.fillStyle = sys.accent; cCtx.fill();
                // Connection icon label at midpoint
                cCtx.font = '8px sans-serif'; cCtx.textAlign = 'center';
                cCtx.fillText(conn.icon, cmx, cmy - 6);
              });
              cCtx.restore();
            }

            // ── TOUR STEP CANVAS HIGHLIGHTING ──
            if (tourActive && currentTourStep) {
              cCtx.save();
              // Find the active tour structure position
              var tourSt = null;
              for (var tsi = 0; tsi < allStructures.length; tsi++) {
                if (allStructures[tsi].id === currentTourStep.structureId) { tourSt = allStructures[tsi]; break; }
              }
              if (tourSt) {
                var tsx = tourSt.x * W, tsy = tourSt.y * H;
                // Spotlight effect — bright circle with dimmed surroundings
                cCtx.globalAlpha = 0.15;
                cCtx.fillStyle = '#000';
                cCtx.fillRect(0, 0, W, H);
                // Cut out a spotlight circle around the structure
                cCtx.globalCompositeOperation = 'destination-out';
                var spotGrad = cCtx.createRadialGradient(tsx, tsy, 5, tsx, tsy, 50);
                spotGrad.addColorStop(0, 'rgba(0,0,0,1)');
                spotGrad.addColorStop(0.7, 'rgba(0,0,0,0.8)');
                spotGrad.addColorStop(1, 'rgba(0,0,0,0)');
                cCtx.fillStyle = spotGrad;
                cCtx.beginPath(); cCtx.arc(tsx, tsy, 50, 0, Math.PI * 2); cCtx.fill();
                cCtx.globalCompositeOperation = 'source-over';
                // Step counter badge
                cCtx.globalAlpha = 0.7;
                var tourLabel = 'Step ' + (tourStepIdx + 1) + '/' + tourSteps.length;
                cCtx.font = 'bold 7px Inter, system-ui, sans-serif';
                var tourLabelW = cCtx.measureText(tourLabel).width + 8;
                cCtx.beginPath(); cCtx.roundRect(tsx - tourLabelW / 2, tsy - 24, tourLabelW, 12, 3);
                cCtx.fillStyle = sys.accent; cCtx.fill();
                cCtx.fillStyle = '#fff'; cCtx.textAlign = 'center';
                cCtx.fillText(tourLabel, tsx, tsy - 15);
              }
              cCtx.restore();
            }

            // View label
            // ── Anatomical scale bar (approximate body proportions) ──
            if (!layerOn('circulatory')) { // hide when ECG is shown in same corner
              cCtx.save(); cCtx.globalAlpha = xrayMode ? 0.3 : 0.2;
              var scaleX = 10, scaleY = H - 22;
              var scaleLen = W * 0.12; // roughly represents ~20cm on an average adult figure
              // Scale bar line
              cCtx.beginPath(); cCtx.moveTo(scaleX, scaleY); cCtx.lineTo(scaleX + scaleLen, scaleY);
              cCtx.strokeStyle = xrayMode ? '#a0c4ff' : '#94a3b8'; cCtx.lineWidth = 1.5; cCtx.stroke();
              // End caps
              cCtx.beginPath(); cCtx.moveTo(scaleX, scaleY - 3); cCtx.lineTo(scaleX, scaleY + 3);
              cCtx.moveTo(scaleX + scaleLen, scaleY - 3); cCtx.lineTo(scaleX + scaleLen, scaleY + 3);
              cCtx.stroke();
              // Midpoint tick
              cCtx.beginPath(); cCtx.moveTo(scaleX + scaleLen / 2, scaleY - 2); cCtx.lineTo(scaleX + scaleLen / 2, scaleY + 2);
              cCtx.lineWidth = 0.8; cCtx.stroke();
              // Label
              cCtx.font = 'bold 6px monospace'; cCtx.textAlign = 'center';
              cCtx.fillStyle = xrayMode ? '#a0c4ff' : '#94a3b8';
              cCtx.fillText('~20 cm', scaleX + scaleLen / 2, scaleY - 5);
              cCtx.restore();
            }

            cCtx.save();
            var viewLbl = view === 'anterior' ? 'ANTERIOR VIEW' : 'POSTERIOR VIEW';
            cCtx.font = 'bold 9px Inter, system-ui, sans-serif';
            var vW = cCtx.measureText(viewLbl).width + 16;
            cCtx.beginPath();
            cCtx.roundRect(W * 0.5 - vW / 2, H - 18, vW, 14, 4);
            cCtx.fillStyle = xrayMode ? 'rgba(20,20,30,0.8)' : '#f8fafc'; cCtx.fill();
            cCtx.strokeStyle = xrayMode ? '#4a5568' : '#e2e8f0'; cCtx.lineWidth = 0.5; cCtx.stroke();
            cCtx.fillStyle = xrayMode ? '#a0c4ff' : '#94a3b8'; cCtx.textAlign = 'center';
            cCtx.fillText(viewLbl, W * 0.5, H - 8);
            cCtx.restore();

            // Anatomical orientation markers. In an anterior view the patient's right is
            // on the viewer's left; in a posterior view the directions align with the viewer.
            cCtx.save();
            cCtx.globalAlpha = xrayMode ? 0.85 : 0.72;
            cCtx.font = '900 11px Inter, system-ui, sans-serif';
            cCtx.textAlign = 'center';
            var leftMarker = view === 'anterior' ? 'R' : 'L';
            var rightMarker = view === 'anterior' ? 'L' : 'R';
            [[14, leftMarker], [W - 14, rightMarker]].forEach(function(marker) {
              cCtx.beginPath(); cCtx.arc(marker[0], 18, 10, 0, Math.PI * 2);
              cCtx.fillStyle = xrayMode ? 'rgba(8,47,73,.92)' : 'rgba(255,255,255,.92)'; cCtx.fill();
              cCtx.strokeStyle = xrayMode ? '#67e8f9' : sys.accent; cCtx.lineWidth = 1.25; cCtx.stroke();
              cCtx.fillStyle = xrayMode ? '#cffafe' : '#334155'; cCtx.fillText(marker[1], marker[0], 22);
            });
            cCtx.restore();

            // ── Subtle AlloFlow watermark ──
            cCtx.save(); cCtx.globalAlpha = xrayMode ? 0.12 : 0.06;
            cCtx.font = 'bold 8px Inter, system-ui, sans-serif';
            cCtx.fillStyle = xrayMode ? '#94a3b8' : '#94a3b8';
            cCtx.textAlign = 'right';
            cCtx.fillText('AlloFlow Anatomy', W - 6, H - 3);
            cCtx.restore();

            scheduleAnatomyFrame();
          }

          drawAnatomyFrame();
        };

        // ── Canvas click handler ──
        var handleClick = function(e) {
          if (e.currentTarget._anatomySuppressClick) {
            e.currentTarget._anatomySuppressClick = false;
            return;
          }
          var rect = e.target.getBoundingClientRect();
          var cx = (e.clientX - rect.left) / rect.width;
          var cy = (e.clientY - rect.top) / rect.height;
          var closest = null, minD = 0.06;
          filtered.forEach(function(st) {
            var clickMarker = markerPosition(st);
            var dist = Math.sqrt(Math.pow(clickMarker.x - cx, 2) + Math.pow(clickMarker.y - cy, 2));
            if (dist < minD) { minD = dist; closest = st; }
          });
          if (closest) {
            if (spotterActive && spotterFeedback === null) {
              // Spotter answers are given via the multiple-choice buttons ONLY. Canvas clicks never
              // submit — this blocks cheating (clicking the visible pin) and, just as importantly,
              // stops an exploratory/accidental click from instantly losing the round.
              if (addToast) addToast('🎯 Identify the marked structure using the buttons in the side panel.');
              return;
            } else {
              // Standard explore mode click
              updMulti(selectionPatch(closest.id)); announceStructure(closest.id);
              playSound('structureClick');
            }
          }
        };

        // ── Canvas mousemove handler (hover tooltip) ──
        var handleMouseMove = function(e) {
          if (e.currentTarget._anatomyDragState) return;
          var rect = e.currentTarget.getBoundingClientRect();
          var cx = (e.clientX - rect.left) / rect.width;
          var cy = (e.clientY - rect.top) / rect.height;
          var closest = null, minD = 0.04;
          filtered.forEach(function(st) {
            var hoverMarker = markerPosition(st);
            var dist = Math.sqrt(Math.pow(hoverMarker.x - cx, 2) + Math.pow(hoverMarker.y - cy, 2));
            if (dist < minD) { minD = dist; closest = st; }
          });
          var nextHoverId = closest ? closest.id : null;
          // A mousemove used to write coordinates into React state on every event. That
          // remounted the canvas and restarted its animation loop dozens of times per second.
          if (e.currentTarget._anatomyHoverId === nextHoverId) return;
          e.currentTarget._anatomyHoverId = nextHoverId;
          upd('_hoverStructure', nextHoverId);
        };
        var handleMouseLeave = function(e) {
          if (!e.currentTarget._anatomyHoverId) return;
          e.currentTarget._anatomyHoverId = null;
          upd('_hoverStructure', null);
        };

        // Direct manipulation complements the button and keyboard controls. Dragging only
        // activates while zoomed, previews locally to avoid remounting the animated canvas,
        // then commits one state update when the gesture ends.
        var handleCanvasPointerDown = function(e) {
          if (canvasZoom === 1 || (typeof e.button === 'number' && e.button !== 0)) return;
          var canvas = e.currentTarget;
          canvas._anatomyDragState = {
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            startPanX: canvasPanX,
            startPanY: canvasPanY,
            nextPanX: canvasPanX,
            nextPanY: canvasPanY,
            moved: false
          };
          canvas.style.transition = 'none';
          canvas.style.cursor = 'grabbing';
          if (typeof canvas.setPointerCapture === 'function') {
            try { canvas.setPointerCapture(e.pointerId); } catch (captureError) {}
          }
        };
        var handleCanvasPointerMove = function(e) {
          var canvas = e.currentTarget;
          var drag = canvas._anatomyDragState;
          if (!drag || drag.pointerId !== e.pointerId) return;
          e.preventDefault();
          var deltaX = e.clientX - drag.startX;
          var deltaY = e.clientY - drag.startY;
          drag.nextPanX = clampCanvasPan(drag.startPanX + deltaX, canvasZoom, 'x');
          drag.nextPanY = clampCanvasPan(drag.startPanY + deltaY, canvasZoom, 'y');
          if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) drag.moved = true;
          canvas.style.transform = 'translate(' + drag.nextPanX + 'px,' + drag.nextPanY + 'px) scale(' + canvasZoom + ')';
        };
        var finishCanvasPointerGesture = function(e, shouldCommit) {
          var canvas = e.currentTarget;
          var drag = canvas._anatomyDragState;
          if (!drag || drag.pointerId !== e.pointerId) return;
          canvas._anatomyDragState = null;
          canvas.style.transition = '';
          canvas.style.cursor = '';
          if (typeof canvas.releasePointerCapture === 'function') {
            try { canvas.releasePointerCapture(e.pointerId); } catch (releaseError) {}
          }
          if (drag.moved) canvas._anatomySuppressClick = true;
          if (shouldCommit && drag.moved) setCanvasView(canvasZoom, drag.nextPanX, drag.nextPanY);
          else canvas.style.transform = 'translate(' + canvasPanX + 'px,' + canvasPanY + 'px) scale(' + canvasZoom + ')';
        };
        var handleCanvasPointerUp = function(e) {
          finishCanvasPointerGesture(e, true);
        };
        var handleCanvasPointerCancel = function(e) {
          finishCanvasPointerGesture(e, false);
        };
        var handleCanvasWheel = function(e) {
          if (!(e.ctrlKey || e.metaKey)) return;
          e.preventDefault();
          var wheelDirection = e.deltaY < 0 ? 1 : -1;
          var nextZoomIndex = Math.max(0, Math.min(CANVAS_ZOOM_LEVELS.length - 1, canvasZoomIndex + wheelDirection));
          if (nextZoomIndex === canvasZoomIndex) return;
          setCanvasView(CANVAS_ZOOM_LEVELS[nextZoomIndex], canvasPanX, canvasPanY);
        };

        // ── Snapshot ──
        var takeSnapshot = function() {
          playSound('snapshot');
          if (setToolSnapshots) {
            var snap = {
              ts: Date.now(), tool: 'anatomy', system: sysKey, view: view,
              structure: sel ? sel.name : null,
              layers: LAYER_DEFS.filter(function(ld) { return isLayerVisible(ld.id); }).map(function(ld) { return ld.id; }),
              complexity: complexity
            };
            setToolSnapshots(function(prev) {
              var arr = (prev && prev.anatomy) ? prev.anatomy.slice() : [];
              arr.push(snap);
              return Object.assign({}, prev, { anatomy: arr });
            });
          }
          if (addToast) addToast('\uD83D\uDCF8 Snapshot saved!');
        };

        // ── AI Tutor state ──
        var aiMessages = Array.isArray(d._aiMessages) ? d._aiMessages.reduce(function(valid, message) {
          if (!message || (message.role !== 'user' && message.role !== 'ai')) return valid;
          var messageText = typeof message.text === 'string' ? message.text.trim() : '';
          if (messageText) valid.push({ role: message.role, text: messageText.slice(0, 4000) });
          return valid;
        }, []).slice(-40) : [];
        var aiInput = typeof d._aiInput === 'string' ? d._aiInput.slice(0, 500) : '';
        var activeAiRequestToken = window.__alloAnatomyAiPending || null;
        var aiLoading = !!d._aiLoading && !!activeAiRequestToken;
        var aiInterrupted = !!d._aiLoading && !activeAiRequestToken;

        function finishAiRequest(token, messages) {
          if (window.__alloAnatomyAiPending !== token) return;
          window.__alloAnatomyAiPending = null;
          updMulti({ _aiMessages: messages, _aiLoading: false });
        }
        var sendAiQuestion = function(question) {
          var cleanQuestion = typeof question === 'string' ? question.trim().slice(0, 500) : '';
          if (!cleanQuestion || aiLoading) return false;
          playSound('aiTutor');
          var newMsgs = aiMessages.concat([{ role: 'user', text: cleanQuestion }]).slice(-40);
          var savedAiQuestionCount = Number(d._aiQuestions);
          var newAiQ = (Number.isFinite(savedAiQuestionCount) && savedAiQuestionCount >= 0 ? Math.floor(savedAiQuestionCount) : 0) + 1;
          var requestToken = 'anatomy-ai-' + Date.now() + '-' + Math.random().toString(36).slice(2);
          window.__alloAnatomyAiPending = requestToken;
          updMulti({ _aiMessages: newMsgs, _aiLoading: true, _aiInput: '', _aiQuestions: newAiQ });
          var prompt = 'You are a friendly anatomy tutor. The student is studying the ' + sys.name + ' system' + (sel ? ' and is looking at the ' + sel.name : '') + '. Grade level: ' + (gradeLevel || 'unknown') + '. Answer concisely (2-3 sentences). Question: ' + cleanQuestion;
          var unavailableMessage = t('stem.anatomy.ai_tutor_is_not_available_in_this_envi', 'AI tutor is not available in this environment.');
          var errorMessage = t('stem.anatomy.sorry_i_could_not_connect_to_the_ai_tu', 'Sorry, I could not connect to the AI tutor right now.');
          if (callGemini) {
            var request;
            try { request = callGemini(prompt); }
            catch (error) { finishAiRequest(requestToken, newMsgs.concat([{ role: 'ai', text: errorMessage }])); return true; }
            Promise.resolve(request).then(function(resp) {
              var answer = (resp && (resp.text || resp)) || 'I could not generate a response right now.';
              finishAiRequest(requestToken, newMsgs.concat([{ role: 'ai', text: String(answer).slice(0, 4000) }]));
            })['catch'](function() {
              finishAiRequest(requestToken, newMsgs.concat([{ role: 'ai', text: errorMessage }]));
            });
          } else {
            finishAiRequest(requestToken, newMsgs.concat([{ role: 'ai', text: unavailableMessage }]));
          }
          return true;
        };

        // ── TTS button helper ──
        function renderHeartAtlas() {
          if (!regionalAtlas) return null;
          var activeStep = regionalAtlas.steps[regionalAtlasStep];
          function flowRoute(stepIndex, pathData, color, markerId) {
            return h('path', {
              d: pathData,
              className: 'anatomy-atlas-route' + (regionalAtlasStep === stepIndex ? ' is-active' : ''),
              stroke: color,
              markerEnd: 'url(#' + markerId + ')',
              'aria-hidden': 'true'
            });
          }
          function svgLabel(x, y, value, options) {
            var labelOptions = options || {};
            return h('text', {
              x: x, y: y,
              textAnchor: labelOptions.anchor || 'middle',
              fill: labelOptions.color || '#334155',
              fontSize: labelOptions.size || 12,
              fontWeight: labelOptions.weight || 800
            }, value);
          }
          return h('section', {
            id: 'anatomy-regional-atlas',
            className: 'anatomy-atlas' + (regionalAtlasPlaying ? '' : ' is-paused'),
            'aria-label': regionalAtlas.title,
            'data-anatomy-atlas': 'heart'
          },
            h('div', { className: 'anatomy-atlas-header' },
              h('div', null,
                h('h5', null, 'Heart regional atlas'),
                h('p', null, regionalAtlas.subtitle)
              ),
              h('button', {
                type: 'button',
                'aria-label': regionalAtlasPlaying ? 'Pause blood-flow animation' : 'Play blood-flow animation',
                'aria-pressed': regionalAtlasPlaying,
                onClick: function() { upd('_regionalAtlasPlaying', !regionalAtlasPlaying); },
                className: 'px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-rose-300 bg-white text-rose-700 hover:bg-rose-50 active:scale-[0.97]'
              }, regionalAtlasPlaying ? 'Pause flow' : 'Play flow')
            ),
            h('div', { className: 'anatomy-atlas-stage' },
              h('svg', {
                viewBox: '0 0 640 360',
                role: 'img',
                'aria-labelledby': 'anatomy-heart-atlas-title anatomy-heart-atlas-desc',
                preserveAspectRatio: 'xMidYMid meet'
              },
                h('title', { id: 'anatomy-heart-atlas-title' }, 'Four-chamber heart and double-circulation diagram'),
                h('desc', { id: 'anatomy-heart-atlas-desc' }, 'A selectable four-step diagram traces oxygen-poor blood from the body through the right heart to the lungs, then oxygen-rich blood through the left heart and aorta back to the body.'),
                h('defs', null,
                  h('marker', { id: 'anatomy-arrow-blue', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' },
                    h('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: '#2563eb' })
                  ),
                  h('marker', { id: 'anatomy-arrow-red', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' },
                    h('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: '#dc2626' })
                  )
                ),
                h('rect', { x: 12, y: 12, width: 616, height: 336, rx: 22, fill: '#f8fafc' }),
                h('ellipse', { cx: 112, cy: 145, rx: 62, ry: 92, fill: '#dbeafe', stroke: '#60a5fa', strokeWidth: 3 }),
                h('path', { d: 'M112 58 L112 230 M112 100 C82 112 70 142 72 178 M112 100 C142 112 154 142 152 178', fill: 'none', stroke: '#93c5fd', strokeWidth: 5, strokeLinecap: 'round' }),
                svgLabel(112, 274, 'LUNGS', { color: '#1d4ed8', size: 13 }),
                h('rect', { x: 538, y: 82, width: 80, height: 150, rx: 38, fill: '#f1f5f9', stroke: '#94a3b8', strokeWidth: 3 }),
                svgLabel(578, 252, 'BODY', { color: '#475569', size: 13 }),
                h('path', { d: 'M250 70 C250 42 295 34 322 62 C350 32 404 42 420 82 C448 150 410 276 324 318 C232 270 206 154 228 96 C233 83 240 75 250 70 Z', fill: '#ffe4e6', stroke: '#be123c', strokeWidth: 4 }),
                h('rect', { x: 250, y: 77, width: 68, height: 83, rx: 24, fill: '#bfdbfe', stroke: '#2563eb', strokeWidth: regionalAtlasStep < 2 ? 4 : 2 }),
                h('rect', { x: 250, y: 185, width: 68, height: 96, rx: 25, fill: '#93c5fd', stroke: '#1d4ed8', strokeWidth: regionalAtlasStep === 1 ? 4 : 2 }),
                h('rect', { x: 345, y: 77, width: 68, height: 83, rx: 24, fill: '#fecaca', stroke: '#dc2626', strokeWidth: regionalAtlasStep === 2 ? 4 : 2 }),
                h('rect', { x: 345, y: 185, width: 68, height: 105, rx: 25, fill: '#fca5a5', stroke: '#b91c1c', strokeWidth: regionalAtlasStep === 3 ? 5 : 3 }),
                svgLabel(284, 121, 'RIGHT', { color: '#1e3a8a', size: 10 }),
                svgLabel(284, 137, 'ATRIUM', { color: '#1e3a8a', size: 10 }),
                svgLabel(284, 226, 'RIGHT', { color: '#1e3a8a', size: 10 }),
                svgLabel(284, 242, 'VENTRICLE', { color: '#1e3a8a', size: 9 }),
                svgLabel(379, 121, 'LEFT', { color: '#7f1d1d', size: 10 }),
                svgLabel(379, 137, 'ATRIUM', { color: '#7f1d1d', size: 10 }),
                svgLabel(379, 226, 'LEFT', { color: '#7f1d1d', size: 10 }),
                svgLabel(379, 242, 'VENTRICLE', { color: '#7f1d1d', size: 9 }),
                h('line', { x1: 253, y1: 172, x2: 315, y2: 172, stroke: '#475569', strokeWidth: 4 }),
                h('line', { x1: 348, y1: 172, x2: 410, y2: 172, stroke: '#475569', strokeWidth: 4 }),
                svgLabel(284, 178, 'tricuspid', { color: '#334155', size: 7 }),
                svgLabel(379, 178, 'mitral', { color: '#334155', size: 7 }),
                flowRoute(0, 'M574 170 C505 170 504 48 360 48 C320 48 300 57 286 78', '#2563eb', 'anatomy-arrow-blue'),
                flowRoute(1, 'M284 145 L284 205 C238 270 170 242 136 186 C123 165 121 149 120 136', '#2563eb', 'anatomy-arrow-blue'),
                flowRoute(2, 'M120 120 C160 72 235 48 335 65 L371 82', '#dc2626', 'anatomy-arrow-red'),
                flowRoute(3, 'M379 145 L379 207 C428 279 492 232 523 188 C541 162 554 157 577 157', '#dc2626', 'anatomy-arrow-red'),
                h('circle', { cx: 28, cy: 322, r: 6, fill: '#2563eb' }),
                svgLabel(40, 326, 'oxygen-poor', { anchor: 'start', color: '#334155', size: 10, weight: 700 }),
                h('circle', { cx: 127, cy: 322, r: 6, fill: '#dc2626' }),
                svgLabel(139, 326, 'oxygen-rich', { anchor: 'start', color: '#334155', size: 10, weight: 700 })
              )
            ),
            h('div', { className: 'anatomy-atlas-steps', role: 'group', 'aria-label': 'Blood-flow steps' },
              regionalAtlas.steps.map(function(stepItem, stepIndex) {
                return h('button', {
                  key: stepItem.id,
                  type: 'button',
                  'aria-pressed': regionalAtlasStep === stepIndex,
                  onClick: function() {
                    updMulti({ _regionalAtlasStep: stepIndex, _regionalAtlasPlaying: true });
                    if (typeof announceToSR === 'function') announceToSR(stepItem.label + '. ' + stepItem.detail);
                  }
                },
                  h('span', { className: 'block' }, stepItem.label),
                  h('span', { className: 'block mt-1 font-normal' }, stepItem.short)
                );
              })
            ),
            h('div', { className: 'anatomy-atlas-step-detail', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' },
              h('strong', null, activeStep.label),
              h('span', null, activeStep.detail)
            )
          );
        }

        function renderKidneyAtlas() {
          if (!regionalAtlas) return null;
          var activeStep = regionalAtlas.steps[regionalAtlasStep];
          function kidneyRoute(stepIndex, pathData, color, markerId) {
            return h('path', {
              d: pathData,
              className: 'anatomy-atlas-route' + (regionalAtlasStep === stepIndex ? ' is-active' : ''),
              stroke: color,
              markerEnd: 'url(#' + markerId + ')',
              'aria-hidden': 'true'
            });
          }
          function kidneyLabel(x, y, value, options) {
            var labelOptions = options || {};
            return h('text', {
              x: x, y: y,
              textAnchor: labelOptions.anchor || 'middle',
              fill: labelOptions.color || '#334155',
              fontSize: labelOptions.size || 11,
              fontWeight: labelOptions.weight || 800
            }, value);
          }
          return h('section', {
            id: 'anatomy-regional-atlas',
            className: 'anatomy-atlas' + (regionalAtlasPlaying ? '' : ' is-paused'),
            'aria-label': regionalAtlas.title,
            'data-anatomy-atlas': 'kidneys'
          },
            h('div', { className: 'anatomy-atlas-header' },
              h('div', null,
                h('h5', null, 'Kidney and nephron regional atlas'),
                h('p', null, regionalAtlas.subtitle)
              ),
              h('button', {
                type: 'button',
                'aria-label': regionalAtlasPlaying ? 'Pause filtrate-flow animation' : 'Play filtrate-flow animation',
                'aria-pressed': regionalAtlasPlaying,
                onClick: function() { upd('_regionalAtlasPlaying', !regionalAtlasPlaying); },
                className: 'px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50 active:scale-[0.97]'
              }, regionalAtlasPlaying ? 'Pause flow' : 'Play flow')
            ),
            h('div', { className: 'anatomy-atlas-stage' },
              h('svg', {
                viewBox: '0 0 640 360',
                role: 'img',
                'aria-labelledby': 'anatomy-kidney-atlas-title anatomy-kidney-atlas-desc',
                preserveAspectRatio: 'xMidYMid meet'
              },
                h('title', { id: 'anatomy-kidney-atlas-title' }, 'Kidney cross-section and nephron processing diagram'),
                h('desc', { id: 'anatomy-kidney-atlas-desc' }, 'A selectable four-step diagram traces filtration at the glomerulus, reabsorption and secretion along the tubule, and final urine concentration in the collecting duct.'),
                h('defs', null,
                  [
                    { id: 'anatomy-arrow-purple', color: '#7c3aed' },
                    { id: 'anatomy-arrow-green', color: '#059669' },
                    { id: 'anatomy-arrow-orange', color: '#d97706' },
                    { id: 'anatomy-arrow-cyan', color: '#0284c7' }
                  ].map(function(marker) {
                    return h('marker', { key: marker.id, id: marker.id, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' },
                      h('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: marker.color })
                    );
                  })
                ),
                h('rect', { x: 12, y: 12, width: 616, height: 336, rx: 22, fill: '#f8fafc' }),
                h('path', { d: 'M149 42 C86 39 48 92 51 166 C54 254 105 310 166 289 C206 275 226 233 214 196 C205 168 180 158 177 132 C175 109 202 91 194 68 C188 50 171 42 149 42 Z', fill: '#fbcfe8', stroke: '#be185d', strokeWidth: 4 }),
                h('path', { d: 'M145 72 C100 72 78 111 82 165 C86 220 115 264 157 257 C181 253 193 229 184 205 C176 183 150 174 148 139 C147 115 170 102 166 85 C163 76 155 72 145 72 Z', fill: '#fde68a', stroke: '#d97706', strokeWidth: 3 }),
                h('path', { d: 'M149 120 C122 132 119 181 147 211 L181 181 C163 164 158 145 171 126 Z', fill: '#fff7ed', stroke: '#c2410c', strokeWidth: 3 }),
                h('path', { d: 'M177 168 C209 165 224 174 245 191', fill: 'none', stroke: '#0284c7', strokeWidth: 8, strokeLinecap: 'round' }),
                kidneyLabel(132, 326, 'KIDNEY CROSS-SECTION', { color: '#831843', size: 12 }),
                kidneyLabel(102, 63, 'cortex', { color: '#831843', size: 9 }),
                kidneyLabel(117, 178, 'medulla', { color: '#92400e', size: 9 }),
                kidneyLabel(202, 154, 'renal pelvis', { anchor: 'start', color: '#334155', size: 8 }),
                h('path', { d: 'M221 125 C245 110 255 89 270 82', fill: 'none', stroke: '#64748b', strokeWidth: 2, strokeDasharray: '5 5' }),
                kidneyLabel(238, 111, 'one nephron', { color: '#475569', size: 9 }),
                h('circle', { cx: 305, cy: 90, r: 38, fill: '#ede9fe', stroke: '#7c3aed', strokeWidth: 3 }),
                h('path', { d: 'M284 82 C289 57 324 59 326 85 C327 109 292 115 283 96 C274 78 299 65 318 75 C336 84 323 104 306 102 C289 100 285 87 294 78', fill: 'none', stroke: '#dc2626', strokeWidth: 5, strokeLinecap: 'round' }),
                h('path', { d: 'M246 77 L276 83', fill: 'none', stroke: '#dc2626', strokeWidth: 7, strokeLinecap: 'round' }),
                h('path', { d: 'M322 66 C389 35 489 51 530 116 C548 145 541 184 519 206', fill: 'none', stroke: '#f87171', strokeWidth: 4, strokeLinecap: 'round' }),
                h('path', { d: 'M335 104 C374 83 390 93 377 116 C365 136 397 143 420 123 C451 96 468 129 441 151 L420 166 C394 211 397 281 438 303 C482 282 489 211 470 164 C493 147 520 151 526 128 C531 110 546 108 559 122 L559 316', fill: 'none', stroke: '#94a3b8', strokeWidth: 8, strokeLinecap: 'round', strokeLinejoin: 'round' }),
                h('path', { d: 'M356 118 C382 160 376 243 424 275 C467 248 462 184 481 153 C505 116 535 146 535 183 C535 223 512 260 482 282', fill: 'none', stroke: '#fca5a5', strokeWidth: 3, strokeLinecap: 'round' }),
                kidneyLabel(305, 40, 'glomerulus', { color: '#5b21b6', size: 10 }),
                kidneyLabel(387, 89, 'proximal tubule', { color: '#334155', size: 9 }),
                kidneyLabel(439, 333, 'loop of Henle', { color: '#334155', size: 9 }),
                kidneyLabel(507, 102, 'distal tubule', { color: '#334155', size: 9 }),
                kidneyLabel(572, 225, 'collecting duct', { anchor: 'start', color: '#334155', size: 9 }),
                kidneyLabel(559, 337, 'to renal pelvis', { color: '#0369a1', size: 9 }),
                kidneyRoute(0, 'M246 77 L281 84 C289 86 296 91 312 103', '#7c3aed', 'anatomy-arrow-purple'),
                kidneyRoute(1, 'M335 104 C374 83 390 93 377 116 C365 136 397 143 420 123', '#059669', 'anatomy-arrow-green'),
                kidneyRoute(2, 'M510 72 C502 92 492 119 478 150', '#d97706', 'anatomy-arrow-orange'),
                kidneyRoute(3, 'M420 166 C394 211 397 281 438 303 C482 282 489 211 470 164 C500 142 526 149 559 122 L559 316', '#0284c7', 'anatomy-arrow-cyan'),
                h('circle', { cx: 28, cy: 323, r: 6, fill: '#7c3aed' }),
                kidneyLabel(40, 327, 'filtrate', { anchor: 'start', color: '#334155', size: 10, weight: 700 }),
                h('line', { x1: 100, y1: 323, x2: 122, y2: 323, stroke: '#f87171', strokeWidth: 4 }),
                kidneyLabel(130, 327, 'capillary blood', { anchor: 'start', color: '#334155', size: 10, weight: 700 })
              )
            ),
            h('div', { className: 'anatomy-atlas-steps', role: 'group', 'aria-label': 'Nephron processing steps' },
              regionalAtlas.steps.map(function(stepItem, stepIndex) {
                return h('button', {
                  key: stepItem.id,
                  type: 'button',
                  'aria-pressed': regionalAtlasStep === stepIndex,
                  onClick: function() {
                    updMulti({ _regionalAtlasStep: stepIndex, _regionalAtlasPlaying: true });
                    if (typeof announceToSR === 'function') announceToSR(stepItem.label + '. ' + stepItem.detail);
                  }
                },
                  h('span', { className: 'block' }, stepItem.label),
                  h('span', { className: 'block mt-1 font-normal' }, stepItem.short)
                );
              })
            ),
            h('div', { className: 'anatomy-atlas-step-detail', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' },
              h('strong', null, activeStep.label),
              h('span', null, activeStep.detail)
            )
          );
        }

        function renderAlveolusAtlas() {
          if (!regionalAtlas) return null;
          var activeStep = regionalAtlas.steps[regionalAtlasStep];
          function gasRoute(stepIndex, pathData, color, markerId) {
            return h('path', {
              d: pathData,
              className: 'anatomy-atlas-route' + (regionalAtlasStep === stepIndex ? ' is-active' : ''),
              stroke: color,
              markerEnd: 'url(#' + markerId + ')',
              'aria-hidden': 'true'
            });
          }
          function gasLabel(x, y, value, options) {
            var labelOptions = options || {};
            return h('text', {
              x: x, y: y,
              textAnchor: labelOptions.anchor || 'middle',
              fill: labelOptions.color || '#334155',
              fontSize: labelOptions.size || 11,
              fontWeight: labelOptions.weight || 800
            }, value);
          }
          return h('section', {
            id: 'anatomy-regional-atlas',
            className: 'anatomy-atlas' + (regionalAtlasPlaying ? '' : ' is-paused'),
            'aria-label': regionalAtlas.title,
            'data-anatomy-atlas': 'alveoli'
          },
            h('div', { className: 'anatomy-atlas-header' },
              h('div', null,
                h('h5', null, 'Alveolus and capillary regional atlas'),
                h('p', null, regionalAtlas.subtitle)
              ),
              h('button', {
                type: 'button',
                'aria-label': regionalAtlasPlaying ? 'Pause gas-exchange animation' : 'Play gas-exchange animation',
                'aria-pressed': regionalAtlasPlaying,
                onClick: function() { upd('_regionalAtlasPlaying', !regionalAtlasPlaying); },
                className: 'px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-sky-300 bg-white text-sky-700 hover:bg-sky-50 active:scale-[0.97]'
              }, regionalAtlasPlaying ? 'Pause exchange' : 'Play exchange')
            ),
            h('div', { className: 'anatomy-atlas-stage' },
              h('svg', {
                viewBox: '0 0 640 360',
                role: 'img',
                'aria-labelledby': 'anatomy-alveolus-atlas-title anatomy-alveolus-atlas-desc',
                preserveAspectRatio: 'xMidYMid meet'
              },
                h('title', { id: 'anatomy-alveolus-atlas-title' }, 'Alveolus, air-blood barrier, and pulmonary capillary gas-exchange diagram'),
                h('desc', { id: 'anatomy-alveolus-atlas-desc' }, 'A selectable four-step diagram traces fresh air into an alveolus, oxygen into capillary blood, carbon dioxide into alveolar air, and the onward movement of oxygenated blood and exhaled gas.'),
                h('defs', null,
                  [
                    { id: 'anatomy-arrow-air', color: '#0ea5e9' },
                    { id: 'anatomy-arrow-oxygen', color: '#dc2626' },
                    { id: 'anatomy-arrow-carbon', color: '#2563eb' },
                    { id: 'anatomy-arrow-transport', color: '#7c3aed' }
                  ].map(function(marker) {
                    return h('marker', { key: marker.id, id: marker.id, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' },
                      h('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: marker.color })
                    );
                  })
                ),
                h('rect', { x: 12, y: 12, width: 616, height: 336, rx: 22, fill: '#f8fafc' }),
                h('path', { d: 'M28 130 C78 130 111 127 143 137 C163 143 173 155 188 166', fill: 'none', stroke: '#94a3b8', strokeWidth: 22, strokeLinecap: 'round' }),
                h('path', { d: 'M28 130 C78 130 111 127 143 137 C163 143 173 155 188 166', fill: 'none', stroke: '#e0f2fe', strokeWidth: 15, strokeLinecap: 'round' }),
                h('circle', { cx: 272, cy: 153, r: 101, fill: '#e0f2fe', stroke: '#0284c7', strokeWidth: 4 }),
                h('circle', { cx: 272, cy: 153, r: 91, fill: '#f0f9ff', stroke: '#7dd3fc', strokeWidth: 3, strokeDasharray: '7 5' }),
                h('path', { d: 'M186 104 C152 86 139 59 159 43 C181 25 210 52 216 79 M335 76 C354 42 386 37 400 59 C414 83 383 101 358 108 M350 197 C390 201 408 228 393 248 C376 271 342 246 329 219', fill: '#e0f2fe', stroke: '#38bdf8', strokeWidth: 3 }),
                gasLabel(272, 142, 'ALVEOLAR', { color: '#075985', size: 13 }),
                gasLabel(272, 160, 'AIR SPACE', { color: '#075985', size: 13 }),
                gasLabel(90, 107, 'terminal airway', { color: '#475569', size: 9 }),
                h('path', { d: 'M133 268 C168 225 213 236 245 263 C283 296 332 298 372 265 C397 244 420 236 445 252', fill: 'none', stroke: '#93c5fd', strokeWidth: 30, strokeLinecap: 'round' }),
                h('path', { d: 'M133 268 C168 225 213 236 245 263 C283 296 332 298 372 265 C397 244 420 236 445 252', fill: 'none', stroke: '#ef4444', strokeWidth: 7, strokeLinecap: 'round', opacity: 0.72 }),
                [
                  { x: 169, y: 249, rotate: -22, fill: '#bfdbfe' },
                  { x: 235, y: 265, rotate: 18, fill: '#fecaca' },
                  { x: 310, y: 282, rotate: 0, fill: '#fecaca' },
                  { x: 382, y: 258, rotate: -18, fill: '#fecaca' }
                ].map(function(cell, cellIndex) {
                  return h('ellipse', { key: cellIndex, cx: cell.x, cy: cell.y, rx: 16, ry: 9, fill: cell.fill, stroke: '#991b1b', strokeWidth: 2, transform: 'rotate(' + cell.rotate + ' ' + cell.x + ' ' + cell.y + ')' });
                }),
                gasLabel(287, 329, 'PULMONARY CAPILLARY', { color: '#7f1d1d', size: 11 }),
                h('path', { d: 'M376 123 C414 110 434 94 458 84', fill: 'none', stroke: '#64748b', strokeWidth: 2, strokeDasharray: '5 5' }),
                h('rect', { x: 456, y: 39, width: 166, height: 224, rx: 14, fill: '#fff', stroke: '#cbd5e1', strokeWidth: 2 }),
                gasLabel(539, 60, 'AIR-BLOOD BARRIER', { color: '#334155', size: 10 }),
                h('rect', { x: 474, y: 74, width: 130, height: 34, rx: 8, fill: '#e0f2fe' }),
                gasLabel(539, 95, 'alveolar air', { color: '#075985', size: 9 }),
                h('rect', { x: 474, y: 111, width: 130, height: 8, fill: '#67e8f9' }),
                gasLabel(608, 118, 'surfactant', { anchor: 'end', color: '#155e75', size: 7 }),
                h('rect', { x: 474, y: 122, width: 130, height: 18, fill: '#bae6fd' }),
                gasLabel(539, 135, 'type I alveolar cell', { color: '#075985', size: 8 }),
                h('rect', { x: 474, y: 143, width: 130, height: 8, fill: '#e2e8f0' }),
                gasLabel(608, 150, 'thin interstitium', { anchor: 'end', color: '#475569', size: 7 }),
                h('rect', { x: 474, y: 154, width: 130, height: 18, fill: '#fecaca' }),
                gasLabel(539, 167, 'capillary endothelium', { color: '#7f1d1d', size: 8 }),
                h('rect', { x: 474, y: 175, width: 130, height: 70, rx: 8, fill: '#fee2e2' }),
                h('ellipse', { cx: 539, cy: 211, rx: 28, ry: 14, fill: '#fca5a5', stroke: '#b91c1c', strokeWidth: 2 }),
                gasLabel(539, 215, 'RBC', { color: '#7f1d1d', size: 9 }),
                gasRoute(0, 'M28 130 C78 130 132 124 182 160 L218 160', '#0ea5e9', 'anatomy-arrow-air'),
                gasRoute(1, 'M245 174 L245 243 M520 92 L520 201', '#dc2626', 'anatomy-arrow-oxygen'),
                gasRoute(2, 'M310 267 L310 181 M562 211 L562 92', '#2563eb', 'anatomy-arrow-carbon'),
                gasRoute(3, 'M150 270 C234 300 342 300 435 255 M218 126 C160 102 96 106 35 121', '#7c3aed', 'anatomy-arrow-transport'),
                h('circle', { cx: 28, cy: 323, r: 6, fill: '#dc2626' }),
                gasLabel(40, 327, 'oxygen', { anchor: 'start', color: '#334155', size: 10, weight: 700 }),
                h('circle', { cx: 98, cy: 323, r: 6, fill: '#2563eb' }),
                gasLabel(110, 327, 'carbon dioxide', { anchor: 'start', color: '#334155', size: 10, weight: 700 })
              )
            ),
            h('div', { className: 'anatomy-atlas-steps', role: 'group', 'aria-label': 'Alveolar gas-exchange steps' },
              regionalAtlas.steps.map(function(stepItem, stepIndex) {
                return h('button', {
                  key: stepItem.id,
                  type: 'button',
                  'aria-pressed': regionalAtlasStep === stepIndex,
                  onClick: function() {
                    updMulti({ _regionalAtlasStep: stepIndex, _regionalAtlasPlaying: true });
                    if (typeof announceToSR === 'function') announceToSR(stepItem.label + '. ' + stepItem.detail);
                  }
                },
                  h('span', { className: 'block' }, stepItem.label),
                  h('span', { className: 'block mt-1 font-normal' }, stepItem.short)
                );
              })
            ),
            h('div', { className: 'anatomy-atlas-step-detail', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' },
              h('strong', null, activeStep.label),
              h('span', null, activeStep.detail)
            )
          );
        }

        function renderKneeAtlas() {
          if (!regionalAtlas) return null;
          var activeStep = regionalAtlas.steps[regionalAtlasStep];
          function kneeRoute(stepIndex, pathData, color, markerId) {
            return h('path', {
              d: pathData,
              className: 'anatomy-atlas-route' + (regionalAtlasStep === stepIndex ? ' is-active' : ''),
              stroke: color,
              markerEnd: 'url(#' + markerId + ')',
              'aria-hidden': 'true'
            });
          }
          function kneeLabel(x, y, value, options) {
            var labelOptions = options || {};
            return h('text', {
              x: x, y: y,
              textAnchor: labelOptions.anchor || 'middle',
              fill: labelOptions.color || '#334155',
              fontSize: labelOptions.size || 10,
              fontWeight: labelOptions.weight || 800
            }, value);
          }
          function leader(x1, y1, x2, y2) {
            return h('path', { d: 'M' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2, fill: 'none', stroke: '#94a3b8', strokeWidth: 1.5, 'aria-hidden': 'true' });
          }
          return h('section', {
            id: 'anatomy-regional-atlas',
            className: 'anatomy-atlas' + (regionalAtlasPlaying ? '' : ' is-paused'),
            'aria-label': regionalAtlas.title,
            'data-anatomy-atlas': 'patella'
          },
            h('div', { className: 'anatomy-atlas-header' },
              h('div', null,
                h('h5', null, 'Knee joint lateral cutaway'),
                h('p', null, regionalAtlas.subtitle)
              ),
              h('button', {
                type: 'button',
                'aria-label': regionalAtlasPlaying ? 'Pause knee-mechanics animation' : 'Play knee-mechanics animation',
                'aria-pressed': regionalAtlasPlaying,
                onClick: function() { upd('_regionalAtlasPlaying', !regionalAtlasPlaying); },
                className: 'px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-amber-300 bg-white text-amber-800 hover:bg-amber-50 active:scale-[0.97]'
              }, regionalAtlasPlaying ? 'Pause motion' : 'Play motion')
            ),
            h('div', { className: 'anatomy-atlas-stage' },
              h('svg', {
                viewBox: '0 0 640 360',
                role: 'img',
                'aria-labelledby': 'anatomy-knee-atlas-title anatomy-knee-atlas-desc',
                preserveAspectRatio: 'xMidYMid meet'
              },
                h('title', { id: 'anatomy-knee-atlas-title' }, 'Lateral knee joint cutaway and movement mechanics diagram'),
                h('desc', { id: 'anatomy-knee-atlas-desc' }, 'A selectable four-step lateral knee diagram identifies the femur, tibia, fibula, patella, cartilage, menisci, cruciate and collateral ligaments, tendons, and the forces involved in flexion and extension.'),
                h('defs', null,
                  [
                    { id: 'anatomy-arrow-joint', color: '#64748b' },
                    { id: 'anatomy-arrow-extension', color: '#dc2626' },
                    { id: 'anatomy-arrow-flexion', color: '#7c3aed' },
                    { id: 'anatomy-arrow-stability', color: '#059669' }
                  ].map(function(marker) {
                    return h('marker', { key: marker.id, id: marker.id, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' },
                      h('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: marker.color })
                    );
                  })
                ),
                h('rect', { x: 12, y: 12, width: 616, height: 336, rx: 22, fill: '#f8fafc' }),
                h('path', { d: 'M277 20 L277 112 C265 124 256 139 258 154 C260 173 277 180 299 174 C313 170 326 169 342 175 C365 184 386 173 389 154 C392 134 374 119 356 109 L356 20 Z', fill: '#fef3c7', stroke: '#b45309', strokeWidth: 4 }),
                h('path', { d: 'M270 158 C284 168 300 165 315 160 C333 154 354 168 376 159', fill: 'none', stroke: '#22d3ee', strokeWidth: 9, strokeLinecap: 'round' }),
                h('path', { d: 'M266 193 C284 180 306 184 321 192 C338 182 360 180 384 194 L381 216 L281 215 Z', fill: '#fef3c7', stroke: '#b45309', strokeWidth: 4 }),
                h('path', { d: 'M281 215 L289 338 L358 338 L376 215 Z', fill: '#fef3c7', stroke: '#b45309', strokeWidth: 4 }),
                h('path', { d: 'M394 214 C408 208 422 220 423 239 L427 338 L398 338 L397 252 C395 237 386 226 394 214 Z', fill: '#fef3c7', stroke: '#b45309', strokeWidth: 3 }),
                h('path', { d: 'M270 187 C286 177 304 178 319 187 C306 196 287 199 270 194 Z', fill: '#cbd5e1', stroke: '#475569', strokeWidth: 2 }),
                h('path', { d: 'M324 187 C344 177 363 179 382 190 C365 198 345 199 326 194 Z', fill: '#cbd5e1', stroke: '#475569', strokeWidth: 2 }),
                h('path', { d: 'M289 193 L351 139', fill: 'none', stroke: '#059669', strokeWidth: regionalAtlasStep === 3 ? 9 : 6, strokeLinecap: 'round' }),
                h('path', { d: 'M333 191 L292 139', fill: 'none', stroke: '#0f766e', strokeWidth: regionalAtlasStep === 3 ? 9 : 6, strokeLinecap: 'round' }),
                h('path', { d: 'M369 136 C385 160 393 193 408 231', fill: 'none', stroke: '#16a34a', strokeWidth: regionalAtlasStep === 3 ? 8 : 5, strokeLinecap: 'round' }),
                h('path', { d: 'M220 22 C219 64 220 96 226 120', fill: 'none', stroke: '#be123c', strokeWidth: regionalAtlasStep === 1 ? 11 : 7, strokeLinecap: 'round' }),
                h('ellipse', { cx: 230, cy: 150, rx: 24, ry: 34, fill: '#fef3c7', stroke: '#b45309', strokeWidth: 4, transform: 'rotate(-12 230 150)' }),
                h('path', { d: 'M234 181 C244 201 256 222 275 244', fill: 'none', stroke: '#be123c', strokeWidth: regionalAtlasStep === 1 ? 11 : 7, strokeLinecap: 'round' }),
                h('circle', { cx: 278, cy: 246, r: 6, fill: '#b45309' }),
                kneeRoute(0, 'M249 151 C269 129 324 122 374 149 C390 165 385 194 366 207 C329 226 282 218 258 196', '#64748b', 'anatomy-arrow-joint'),
                kneeRoute(1, 'M220 28 L226 116 L230 180 C242 205 257 229 275 244', '#dc2626', 'anatomy-arrow-extension'),
                kneeRoute(2, 'M382 294 C414 263 421 214 405 175 C396 153 383 136 364 124', '#7c3aed', 'anatomy-arrow-flexion'),
                kneeRoute(3, 'M289 193 L351 139 M333 191 L292 139 M369 136 C385 160 393 193 408 231', '#059669', 'anatomy-arrow-stability'),
                leader(222, 34, 121, 34),
                kneeLabel(112, 38, 'quadriceps tendon', { anchor: 'end', color: '#7f1d1d', size: 9 }),
                leader(207, 150, 121, 150),
                kneeLabel(112, 154, 'patella', { anchor: 'end', color: '#92400e', size: 10 }),
                leader(275, 244, 121, 238),
                kneeLabel(112, 242, 'patellar tendon', { anchor: 'end', color: '#7f1d1d', size: 9 }),
                leader(316, 54, 474, 44),
                kneeLabel(482, 48, 'femur', { anchor: 'start', color: '#92400e', size: 10 }),
                leader(351, 164, 474, 76),
                kneeLabel(482, 80, 'articular cartilage', { anchor: 'start', color: '#0e7490', size: 9 }),
                leader(368, 188, 474, 108),
                kneeLabel(482, 112, 'meniscus', { anchor: 'start', color: '#334155', size: 10 }),
                leader(321, 164, 474, 140),
                kneeLabel(482, 144, 'ACL', { anchor: 'start', color: '#047857', size: 10 }),
                leader(310, 159, 474, 172),
                kneeLabel(482, 176, 'PCL', { anchor: 'start', color: '#0f766e', size: 10 }),
                leader(391, 177, 474, 204),
                kneeLabel(482, 208, 'collateral ligament', { anchor: 'start', color: '#166534', size: 9 }),
                leader(330, 274, 474, 268),
                kneeLabel(482, 272, 'tibia', { anchor: 'start', color: '#92400e', size: 10 }),
                leader(412, 275, 474, 302),
                kneeLabel(482, 306, 'fibula', { anchor: 'start', color: '#92400e', size: 10 })
              )
            ),
            h('div', { className: 'anatomy-atlas-steps', role: 'group', 'aria-label': 'Knee structure and movement steps' },
              regionalAtlas.steps.map(function(stepItem, stepIndex) {
                return h('button', {
                  key: stepItem.id,
                  type: 'button',
                  'aria-pressed': regionalAtlasStep === stepIndex,
                  onClick: function() {
                    updMulti({ _regionalAtlasStep: stepIndex, _regionalAtlasPlaying: true });
                    if (typeof announceToSR === 'function') announceToSR(stepItem.label + '. ' + stepItem.detail);
                  }
                },
                  h('span', { className: 'block' }, stepItem.label),
                  h('span', { className: 'block mt-1 font-normal' }, stepItem.short)
                );
              })
            ),
            h('div', { className: 'anatomy-atlas-step-detail', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' },
              h('strong', null, activeStep.label),
              h('span', null, activeStep.detail)
            )
          );
        }

        function renderNeuromuscularAtlas() {
          if (!regionalAtlas) return null;
          var activeStep = regionalAtlas.steps[regionalAtlasStep];
          function muscleRoute(stepIndex, pathData, color, markerId) {
            return h('path', {
              d: pathData,
              className: 'anatomy-atlas-route' + (regionalAtlasStep === stepIndex ? ' is-active' : ''),
              stroke: color,
              markerEnd: 'url(#' + markerId + ')',
              'aria-hidden': 'true'
            });
          }
          function muscleLabel(x, y, value, options) {
            var labelOptions = options || {};
            return h('text', {
              x: x, y: y,
              textAnchor: labelOptions.anchor || 'middle',
              fill: labelOptions.color || '#334155',
              fontSize: labelOptions.size || 10,
              fontWeight: labelOptions.weight || 800
            }, value);
          }
          return h('section', {
            id: 'anatomy-regional-atlas',
            className: 'anatomy-atlas' + (regionalAtlasPlaying ? '' : ' is-paused'),
            'aria-label': regionalAtlas.title,
            'data-anatomy-atlas': 'biceps'
          },
            h('div', { className: 'anatomy-atlas-header' },
              h('div', null,
                h('h5', null, 'Neuromuscular junction and sarcomere'),
                h('p', null, regionalAtlas.subtitle)
              ),
              h('button', {
                type: 'button',
                'aria-label': regionalAtlasPlaying ? 'Pause muscle-activation animation' : 'Play muscle-activation animation',
                'aria-pressed': regionalAtlasPlaying,
                onClick: function() { upd('_regionalAtlasPlaying', !regionalAtlasPlaying); },
                className: 'px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-pink-300 bg-white text-pink-800 hover:bg-pink-50 active:scale-[0.97]'
              }, regionalAtlasPlaying ? 'Pause activation' : 'Play activation')
            ),
            h('div', { className: 'anatomy-atlas-stage' },
              h('svg', {
                viewBox: '0 0 640 360',
                role: 'img',
                'aria-labelledby': 'anatomy-neuromuscular-atlas-title anatomy-neuromuscular-atlas-desc',
                preserveAspectRatio: 'xMidYMid meet'
              },
                h('title', { id: 'anatomy-neuromuscular-atlas-title' }, 'Neuromuscular junction, calcium release, and sarcomere contraction diagram'),
                h('desc', { id: 'anatomy-neuromuscular-atlas-desc' }, 'A selectable four-step diagram traces a motor-neuron action potential, acetylcholine release at the motor end plate, T-tubule signaling and calcium release, and ATP-powered sliding of actin past myosin.'),
                h('defs', null,
                  [
                    { id: 'anatomy-arrow-neuron', color: '#7c3aed' },
                    { id: 'anatomy-arrow-ach', color: '#d97706' },
                    { id: 'anatomy-arrow-calcium', color: '#0284c7' },
                    { id: 'anatomy-arrow-contraction', color: '#dc2626' }
                  ].map(function(marker) {
                    return h('marker', { key: marker.id, id: marker.id, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' },
                      h('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: marker.color })
                    );
                  })
                ),
                h('rect', { x: 12, y: 12, width: 616, height: 336, rx: 22, fill: '#f8fafc' }),
                h('rect', { x: 24, y: 173, width: 592, height: 162, rx: 20, fill: '#fce7f3', stroke: '#f9a8d4', strokeWidth: 2 }),
                h('path', { d: 'M20 72 C80 72 127 70 177 82 C197 87 207 91 221 101', fill: 'none', stroke: '#8b5cf6', strokeWidth: 18, strokeLinecap: 'round' }),
                h('path', { d: 'M202 86 C224 58 281 56 314 83 C338 103 329 135 298 143 C263 152 219 139 205 116 C198 105 198 96 202 86 Z', fill: '#ddd6fe', stroke: '#7c3aed', strokeWidth: 4 }),
                [
                  { x: 231, y: 94 }, { x: 259, y: 82 }, { x: 288, y: 95 },
                  { x: 242, y: 119 }, { x: 273, y: 116 }, { x: 304, y: 116 }
                ].map(function(vesicle, vesicleIndex) {
                  return h('circle', { key: vesicleIndex, cx: vesicle.x, cy: vesicle.y, r: 8, fill: '#fde68a', stroke: '#d97706', strokeWidth: 2 });
                }),
                [
                  { x: 240, y: 151 }, { x: 260, y: 157 }, { x: 281, y: 151 }, { x: 302, y: 158 }
                ].map(function(ach, achIndex) {
                  return h('circle', { key: achIndex, cx: ach.x, cy: ach.y, r: 4, fill: '#f59e0b' });
                }),
                h('path', { d: 'M26 184 C75 176 120 188 166 180 C211 173 245 190 284 179 C328 167 370 190 416 179 C463 168 515 190 614 180', fill: 'none', stroke: '#be185d', strokeWidth: 7, strokeLinecap: 'round' }),
                [
                  { x: 236, y: 177 }, { x: 258, y: 181 }, { x: 281, y: 177 }, { x: 304, y: 181 }
                ].map(function(receptor, receptorIndex) {
                  return h('path', { key: receptorIndex, d: 'M' + (receptor.x - 7) + ' ' + receptor.y + ' L' + receptor.x + ' ' + (receptor.y + 11) + ' L' + (receptor.x + 7) + ' ' + receptor.y, fill: '#fef3c7', stroke: '#b45309', strokeWidth: 2 });
                }),
                h('path', { d: 'M362 180 L362 252 C362 268 388 268 388 252 L388 180', fill: '#fdf2f8', stroke: '#be185d', strokeWidth: 6, strokeLinecap: 'round' }),
                h('rect', { x: 319, y: 241, width: 41, height: 54, rx: 17, fill: '#bae6fd', stroke: '#0284c7', strokeWidth: 3 }),
                h('rect', { x: 390, y: 241, width: 41, height: 54, rx: 17, fill: '#bae6fd', stroke: '#0284c7', strokeWidth: 3 }),
                [
                  { x: 335, y: 255 }, { x: 347, y: 271 }, { x: 405, y: 256 },
                  { x: 417, y: 272 }, { x: 375, y: 287 }, { x: 393, y: 302 }
                ].map(function(calcium, calciumIndex) {
                  return h('circle', { key: calciumIndex, cx: calcium.x, cy: calcium.y, r: 4, fill: '#0ea5e9' });
                }),
                h('rect', { x: 449, y: 226, width: 165, height: 94, rx: 10, fill: '#fff', stroke: '#cbd5e1', strokeWidth: 2 }),
                h('line', { x1: 462, y1: 238, x2: 462, y2: 309, stroke: '#475569', strokeWidth: 5 }),
                h('line', { x1: 601, y1: 238, x2: 601, y2: 309, stroke: '#475569', strokeWidth: 5 }),
                h('line', { x1: 462, y1: 258, x2: 527, y2: 258, stroke: '#ef4444', strokeWidth: 5, strokeLinecap: 'round' }),
                h('line', { x1: 601, y1: 291, x2: 536, y2: 291, stroke: '#ef4444', strokeWidth: 5, strokeLinecap: 'round' }),
                h('line', { x1: 493, y1: 275, x2: 570, y2: 275, stroke: '#7c3aed', strokeWidth: 11, strokeLinecap: 'round' }),
                [
                  { x: 510, y: 275, flip: -1 }, { x: 530, y: 275, flip: 1 }, { x: 551, y: 275, flip: -1 }
                ].map(function(head, headIndex) {
                  return h('path', { key: headIndex, d: 'M' + head.x + ' 274 l' + (9 * head.flip) + ' -12', stroke: '#5b21b6', strokeWidth: 4, strokeLinecap: 'round' });
                }),
                muscleLabel(92, 51, 'motor axon', { color: '#5b21b6', size: 10 }),
                muscleLabel(264, 48, 'axon terminal', { color: '#5b21b6', size: 10 }),
                muscleLabel(279, 72, 'synaptic vesicles', { color: '#92400e', size: 8 }),
                muscleLabel(171, 164, 'synaptic cleft', { color: '#475569', size: 9 }),
                muscleLabel(265, 211, 'nicotinic ACh receptors', { color: '#92400e', size: 8 }),
                muscleLabel(82, 207, 'muscle sarcolemma', { color: '#9d174d', size: 9 }),
                muscleLabel(375, 224, 'T-tubule', { color: '#9d174d', size: 9 }),
                muscleLabel(374, 319, 'sarcoplasmic reticulum + Ca2+', { color: '#0369a1', size: 8 }),
                muscleLabel(531, 218, 'SARCOMERE', { color: '#334155', size: 10 }),
                muscleLabel(476, 251, 'actin', { color: '#991b1b', size: 8 }),
                muscleLabel(554, 269, 'myosin', { color: '#5b21b6', size: 8 }),
                muscleLabel(462, 331, 'Z disc', { color: '#334155', size: 8 }),
                muscleLabel(601, 331, 'Z disc', { color: '#334155', size: 8 }),
                muscleRoute(0, 'M22 72 C94 72 160 69 218 101 C239 111 264 111 292 102', '#7c3aed', 'anatomy-arrow-neuron'),
                muscleRoute(1, 'M242 108 C242 132 242 149 242 174 M280 112 C280 139 280 153 280 178', '#d97706', 'anatomy-arrow-ach'),
                muscleRoute(2, 'M304 181 C334 181 362 195 375 225 L375 272 C375 289 390 297 407 300', '#0284c7', 'anatomy-arrow-calcium'),
                muscleRoute(3, 'M468 258 L523 258 M595 291 L540 291', '#dc2626', 'anatomy-arrow-contraction')
              )
            ),
            h('div', { className: 'anatomy-atlas-steps', role: 'group', 'aria-label': 'Neuromuscular activation steps' },
              regionalAtlas.steps.map(function(stepItem, stepIndex) {
                return h('button', {
                  key: stepItem.id,
                  type: 'button',
                  'aria-pressed': regionalAtlasStep === stepIndex,
                  onClick: function() {
                    updMulti({ _regionalAtlasStep: stepIndex, _regionalAtlasPlaying: true });
                    if (typeof announceToSR === 'function') announceToSR(stepItem.label + '. ' + stepItem.detail);
                  }
                },
                  h('span', { className: 'block' }, stepItem.label),
                  h('span', { className: 'block mt-1 font-normal' }, stepItem.short)
                );
              })
            ),
            h('div', { className: 'anatomy-atlas-step-detail', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' },
              h('strong', null, activeStep.label),
              h('span', null, activeStep.detail)
            )
          );
        }

        function renderRegionalAtlas() {
          if (!sel || !regionalAtlas) return null;
          if (sel.id === 'heart') return renderHeartAtlas();
          if (sel.id === 'kidneys') return renderKidneyAtlas();
          if (sel.id === 'alveoli') return renderAlveolusAtlas();
          if (sel.id === 'patella') return renderKneeAtlas();
          if (sel.id === 'biceps') return renderNeuromuscularAtlas();
          return null;
        }

        var ttsBtn = function(text) {
          return h('button', {
            onClick: function() { speakText(text, callTTS); },
            className: 'ml-1 px-1.5 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all border border-indigo-600 active:scale-[0.97]',
            title: t('stem.anatomy.read_aloud', 'Read aloud'), 'aria-label': t('stem.anatomy.read_aloud_2', 'Read aloud')
          }, '\uD83D\uDD0A');
        };

        function confidenceControls(structureId, label) {
          var currentConfidence = structureConfidence[structureId] || null;
          var confidenceOptions = [
            { id: 'practice', label: 'Need practice', icon: '!', active: 'bg-rose-700 text-white border-rose-700' },
            { id: 'learning', label: 'Learning', icon: '~', active: 'bg-amber-700 text-white border-amber-700' },
            { id: 'mastered', label: 'Got it', icon: 'OK', active: 'bg-emerald-700 text-white border-emerald-700' }
          ];
          return h('div', { className: 'anatomy-confidence', role: 'group', 'aria-label': 'Learning confidence for ' + label },
            h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
              h('p', { className: 'text-[11px] font-bold text-slate-700' }, 'How well do you know this?'),
              h('span', { className: 'text-[10px] text-slate-500' }, currentConfidence ? 'Saved to your study plan' : 'Choose after reviewing')
            ),
            h('div', { className: 'anatomy-confidence-actions' }, confidenceOptions.map(function(option) {
              var isActive = currentConfidence === option.id;
              return h('button', {
                key: option.id, type: 'button', 'aria-pressed': isActive,
                onClick: function() { setStructureConfidence(structureId, option.id); },
                className: 'px-2.5 py-1 text-[11px] font-bold border transition-all active:scale-[0.97] ' +
                  (isActive ? option.active : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100')
              }, option.icon + ' ' + option.label);
            }))
          );
        }

        // ── Progress tracker helper ──
        // Search narrows discovery; it must not change the learning-progress denominator.
        var exploredInSystem = 0;
        viewFiltered.forEach(function(st) { if (structuresViewed[st.id]) exploredInSystem++; });
        var progressPct = viewFiltered.length > 0 ? Math.round((exploredInSystem / viewFiltered.length) * 100) : 0;
        var systemsExploredCount = Object.keys(systemsExplored).length;
        var structuresViewedCount = Object.keys(structuresViewed).length;
        var badgesEarnedCount = Object.keys(badges).length;
        var completedChallengeCount = completedChallenges.length;
        var activeLayerCount = LAYER_DEFS.filter(function(ld) { return isLayerVisible(ld.id); }).length;
        var selectedConfidenceLabel = sel && structureConfidence[sel.id]
          ? ({ practice: 'Review', learning: 'Learning', mastered: 'Got it' })[structureConfidence[sel.id]] : 'Unrated';
        var canvasLabel = sys.name + ', ' + view + ' view. ' + activeLayerCount +
          (activeLayerCount === 1 ? ' layer visible. ' : ' layers visible. ') +
          (sel ? sel.name + ' selected. Study status ' + selectedConfidenceLabel + '. ' : 'No structure selected. ') +
          (view === 'anterior'
            ? 'Patient right is on the viewer left; patient left is on the viewer right. '
            : 'Patient left and right align with the viewer. ') +
          'Use arrow keys to move through structures, Shift plus arrow keys to pan, plus or minus to zoom, F to focus the selected structure, Home or zero to reset, and Escape to clear selection.';
        var missionPrompt = sel
          ? 'Now studying ' + sel.name + '. Compare its function, location, and clinical note against the model.'
          : gradeIntro;
        var showLegacyChallengeCard = false;

        // ── Keyboard navigation handler ──
        var unseenInSystem = viewFiltered.filter(function(structure) { return !structuresViewed[structure.id]; });
        var reviewInSystem = viewFiltered.filter(function(structure) {
          return structureConfidence[structure.id] === 'practice' || structureConfidence[structure.id] === 'learning';
        });
        var ratedInSystemCount = viewFiltered.filter(function(structure) { return !!structureConfidence[structure.id]; }).length;
        var recommendedNextStep;
        if (!tourCompleted && exploredInSystem < Math.min(3, viewFiltered.length)) {
          recommendedNextStep = { id: 'tour', title: 'Take the guided tour', detail: 'Build a structure-to-function map before testing recall.', action: 'Start tour' };
        } else if (reviewInSystem.length > 0) {
          recommendedNextStep = { id: 'review', title: 'Review ' + reviewInSystem[0].name, detail: currentSystemReviewCount + ' structure' + (currentSystemReviewCount === 1 ? '' : 's') + ' marked for review in this view.', action: 'Review now', structure: reviewInSystem[0] };
        } else if (unseenInSystem.length > 0) {
          recommendedNextStep = { id: 'unseen', title: 'Discover ' + unseenInSystem[0].name, detail: unseenInSystem.length + ' structure' + (unseenInSystem.length === 1 ? '' : 's') + ' remain unexplored in this view.', action: 'Open structure', structure: unseenInSystem[0] };
        } else if (ratedInSystemCount < Math.min(3, viewFiltered.length)) {
          recommendedNextStep = { id: 'cards', title: 'Check your recall', detail: 'Use flashcards and rate your confidence to build a focused review list.', action: 'Open cards' };
        } else if (totalCorrect < 5) {
          recommendedNextStep = { id: 'quiz', title: 'Test what you know', detail: 'Mix function, system, true/false, and clinical recall questions.', action: 'Start quiz' };
        } else {
          recommendedNextStep = { id: 'spotter', title: 'Practice visual identification', detail: 'Use the Spotter to transfer recall to the body diagram.', action: 'Open Spotter' };
        }
        function runRecommendedNextStep() {
          if (recommendedNextStep.id === 'tour') { activateAnatomyTab('tour'); return; }
          if (recommendedNextStep.id === 'review' || recommendedNextStep.id === 'unseen') {
            updMulti(structureFocusPatch(recommendedNextStep.structure.id, { _activeTab: 'explore', quizMode: false }));
            announceStructure(recommendedNextStep.structure.id);
            return;
          }
          if (recommendedNextStep.id === 'cards' && flashcardPool.length > 0) {
            updMulti(structureFocusPatch(flashcardPool[0].id, { _activeTab: 'flashcards', _flashcardIdx: 0, _flashcardFlipped: false }));
            announceStructure(flashcardPool[0].id);
            return;
          }
          if (recommendedNextStep.id === 'quiz') {
            updMulti({ _activeTab: 'explore', quizMode: true, quizIdx: 0, quizScore: 0, quizFeedback: null, _quizAttempts: 0 });
            return;
          }
          activateAnatomyTab('spotter');
        }
        function handleKeyNav(e) {
          if (activeTab !== 'explore') return;
          // Structure navigation belongs to the focused diagram only. The previous root-level
          // handler also intercepted arrows from tabs, buttons, and sliders.
          if (!e.currentTarget || e.currentTarget.tagName !== 'CANVAS') return;
          if (e.shiftKey && (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowLeft')) {
            e.preventDefault();
            var panStep = 18;
            var keyboardPanX = canvasPanX + (e.key === 'ArrowRight' ? -panStep : e.key === 'ArrowLeft' ? panStep : 0);
            var keyboardPanY = canvasPanY + (e.key === 'ArrowDown' ? -panStep : e.key === 'ArrowUp' ? panStep : 0);
            setCanvasView(canvasZoom, keyboardPanX, keyboardPanY);
            return;
          }
          if (e.key === '+' || e.key === '=') {
            e.preventDefault();
            setCanvasView(CANVAS_ZOOM_LEVELS[Math.min(CANVAS_ZOOM_LEVELS.length - 1, canvasZoomIndex + 1)], canvasPanX, canvasPanY);
            return;
          }
          if (e.key === '-' || e.key === '_') {
            e.preventDefault();
            setCanvasView(CANVAS_ZOOM_LEVELS[Math.max(0, canvasZoomIndex - 1)], canvasPanX, canvasPanY);
            return;
          }
          if (e.key === '0') {
            e.preventDefault(); setCanvasView(1, 0, 0); return;
          }
          if (e.key === 'Home') {
            e.preventDefault(); setCanvasView(1, 0, 0); return;
          }
          if (!e.ctrlKey && !e.metaKey && !e.altKey && String(e.key || '').toLowerCase() === 'f' && sel) {
            e.preventDefault();
            focusSelectedStructure();
            return;
          }
          var navList = filtered;
          if (navList.length === 0) return;
          var curIdx = -1;
          if (sel) {
            for (var ki = 0; ki < navList.length; ki++) {
              if (navList[ki].id === sel.id) { curIdx = ki; break; }
            }
          }
          if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            e.preventDefault();
            var nextIdx = curIdx < navList.length - 1 ? curIdx + 1 : 0;
            updMulti(selectionPatch(navList[nextIdx].id)); announceStructure(navList[nextIdx].id);
            playSound('structureClick');
          } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            e.preventDefault();
            var prevIdx = curIdx > 0 ? curIdx - 1 : navList.length - 1;
            updMulti(selectionPatch(navList[prevIdx].id)); announceStructure(navList[prevIdx].id);
            playSound('structureClick');
          } else if (e.key === 'Escape') {
            upd('selectedStructure', null);
          }
        }

        // ══════════════════════════════════════
        function openAnatomyScaleDestination(toolId, stateKey, patch, label) {
          setLabToolData(function(prev) {
            var next = Object.assign({}, prev || {});
            next[stateKey] = Object.assign({}, next[stateKey] || {}, patch || {}, { _scaleJourneySource: 'anatomy' });
            return next;
          });
          if (typeof setStemLabTab === 'function') setStemLabTab('explore');
          if (typeof setStemLabTool === 'function') setStemLabTool(toolId);
          if (typeof announceToSR === 'function') announceToSR('Scale Journey: opening ' + label);
        }

        // Optional spatial overview. The detailed 2D atlas and structure directory remain authoritative.
        var anatomy3dRef = function(canvas) {
          if (!canvas) {
            try { if (window.__alloAnatomy3dCleanup) window.__alloAnatomy3dCleanup(); } catch (e) {}
            return;
          }
          try { if (window.__alloAnatomy3dCleanup) window.__alloAnatomy3dCleanup(); } catch (e) {}
          var alive = true, renderer = null, scene = null, controls = null, raf = null;
          var statusEl = null;
          function setStatus(message, state) {
            canvas.setAttribute('data-anatomy-3d-state', state || 'loading');
            if (!statusEl && typeof document !== 'undefined') statusEl = document.getElementById('anatomy-3d-status');
            if (statusEl) statusEl.textContent = message;
          }
          function cleanup3d() {
            if (!alive) return;
            alive = false;
            if (raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf);
            try { canvas.removeEventListener('click', pickStructure); canvas.removeEventListener('keydown', on3dKey); } catch (e) {}
            if (controls) { try { controls.dispose(); } catch (e) {} }
            if (scene) scene.traverse(function(obj) { if (obj.geometry && obj.geometry.dispose) obj.geometry.dispose(); if (obj.material) { var mats = Array.isArray(obj.material) ? obj.material : [obj.material]; mats.forEach(function(mat) { if (mat && mat.dispose) mat.dispose(); }); } });
            if (renderer) { try { renderer.dispose(); renderer.forceContextLoss(); } catch (e) {} }
            if (window.__alloAnatomy3dCleanup === cleanup3d) window.__alloAnatomy3dCleanup = null;
          }
          function pickStructure(event) {
            if (!alive || !canvas._anatomy3dPick) return;
            canvas._anatomy3dPick(event);
          }
          function on3dKey(event) {
            if ((event.key === 'r' || event.key === 'R' || event.key === '0' || event.key === 'Home') && canvas._resetAnatomy3d) { event.preventDefault(); canvas._resetAnatomy3d(); }
          }
          window.__alloAnatomy3dCleanup = cleanup3d;
          canvas.addEventListener('click', pickStructure);
          canvas.addEventListener('keydown', on3dKey);
          setStatus('Loading the interactive 3D body overview…', 'loading');
          if (!window.StemLab || typeof window.StemLab.ensureThree !== 'function') {
            setStatus('3D is unavailable in this runtime. The detailed 2D diagram and structure directory remain available.', 'fallback');
            return;
          }
          var anatomyEnginePromise = window.StemLab.ensureThree({ orbit: true, failMessage: 'The 3D body engine could not load. The accessible 2D anatomy view remains available.' });
          if (window.__alloAnatomyModelUrl && typeof window.StemLab.loadScriptResilient === 'function') {
            anatomyEnginePromise = anatomyEnginePromise.then(function(THREE) {
              if (THREE.GLTFLoader) return THREE;
              return window.StemLab.loadScriptResilient(
                ['https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js', 'https://unpkg.com/three@0.128.0/examples/js/loaders/GLTFLoader.js'],
                { cacheKey: 'three-gltf-loader', check: function() { return !!(window.THREE && window.THREE.GLTFLoader); }, failMessage: 'The local anatomy model loader could not load; the procedural body remains available.' }
              ).then(function() { return window.THREE; }).catch(function() { return THREE; });
            });
          }
          anatomyEnginePromise.then(function(THREE) {
            if (!alive || !canvas.isConnected) return;
            try {
              var width = 360, height = 520;
              renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
              renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
              renderer.setSize(width, height, false);
              renderer.setClearColor(0x07111f, 1);
              renderer.outputEncoding = THREE.sRGBEncoding;
              scene = new THREE.Scene();
              scene.fog = new THREE.Fog(0x07111f, 7, 12);
              var camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
              camera.position.set(0, 0.15, 7.6);
              var bodyGroup = new THREE.Group();
              var silhouetteGroup = new THREE.Group(); bodyGroup.add(silhouetteGroup);
              if (view === 'posterior') bodyGroup.rotation.y = Math.PI;
              scene.add(bodyGroup);
              scene.add(new THREE.HemisphereLight(0xdbeafe, 0x172554, 1.45));
              var keyLight = new THREE.DirectionalLight(0xffffff, 1.15); keyLight.position.set(3, 4, 6); scene.add(keyLight);
              var rimLight = new THREE.DirectionalLight(new THREE.Color(sys.accent), 0.8); rimLight.position.set(-4, 1, -2); scene.add(rimLight);
              var skinMat = new THREE.MeshPhongMaterial({ color: 0xd8b4a0, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide, shininess: 35 });
              var outlineMat = new THREE.MeshPhongMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.18, wireframe: true, depthWrite: false });
              function bodyMesh(geometry, position, scale, rotation) {
                var mesh = new THREE.Mesh(geometry, skinMat.clone()); mesh.position.set(position[0], position[1], position[2]); mesh.scale.set(scale[0], scale[1], scale[2]); if (rotation) mesh.rotation.set(rotation[0], rotation[1], rotation[2]); silhouetteGroup.add(mesh);
                var outline = new THREE.Mesh(geometry.clone(), outlineMat.clone()); outline.position.copy(mesh.position); outline.scale.copy(mesh.scale); outline.rotation.copy(mesh.rotation); silhouetteGroup.add(outline);
              }
              bodyMesh(new THREE.SphereGeometry(0.48, 24, 18), [0, 2.35, 0], [0.82, 1, 0.82]);
              bodyMesh(new THREE.SphereGeometry(0.9, 24, 18), [0, 0.95, 0], [0.82, 1.42, 0.5]);
              bodyMesh(new THREE.SphereGeometry(0.72, 22, 16), [0, -0.22, 0], [0.92, 0.68, 0.62]);
              bodyMesh(new THREE.CylinderGeometry(0.18, 0.14, 2.15, 14), [-1.02, 0.72, 0], [1, 1, 1], [0, 0, -0.12]);
              bodyMesh(new THREE.CylinderGeometry(0.18, 0.14, 2.15, 14), [1.02, 0.72, 0], [1, 1, 1], [0, 0, 0.12]);
              bodyMesh(new THREE.CylinderGeometry(0.25, 0.18, 2.65, 16), [-0.42, -1.72, 0], [1, 1, 1], [0, 0, -0.035]);
              bodyMesh(new THREE.CylinderGeometry(0.25, 0.18, 2.65, 16), [0.42, -1.72, 0], [1, 1, 1], [0, 0, 0.035]);
              var structuresGroup = new THREE.Group(); bodyGroup.add(structuresGroup);
              var markerGeometry = new THREE.SphereGeometry(1, 18, 14);
              filtered.slice(0, 30).forEach(function(st, index) {
                var selected = !!sel && sel.id === st.id;
                var mat = new THREE.MeshPhongMaterial({ color: new THREE.Color(sys.accent), emissive: selected ? new THREE.Color(0xfacc15) : new THREE.Color(sys.accent), emissiveIntensity: selected ? 0.8 : 0.2, shininess: 90, transparent: true, opacity: selected ? 1 : 0.82 });
                var marker = new THREE.Mesh(markerGeometry.clone(), mat);
                marker.position.set((st.x - 0.5) * 3.1, (0.5 - st.y) * 5.25, 0.35 + ((index % 5) - 2) * 0.06);
                var size = selected ? 0.145 : 0.095; marker.scale.set(size, size, size); marker.userData.structureId = st.id; marker.userData.structureName = st.name; structuresGroup.add(marker);
              });
              var platform = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.9, 0.16, 40), new THREE.MeshPhongMaterial({ color: new THREE.Color(sys.accent), transparent: true, opacity: 0.42 })); platform.position.y = -3.05; bodyGroup.add(platform);
              if (window.__alloAnatomyModelUrl && THREE.GLTFLoader) {
                setStatus('Loading local anatomy GLB…', 'loading-model');
                new THREE.GLTFLoader().load(window.__alloAnatomyModelUrl, function(gltf) {
                  if (!alive || !gltf || !gltf.scene) return;
                  var imported = gltf.scene;
                  var bounds = new THREE.Box3().setFromObject(imported);
                  var size3d = bounds.getSize(new THREE.Vector3());
                  var center3d = bounds.getCenter(new THREE.Vector3());
                  var fitScale = size3d.y > 0 ? 5.5 / size3d.y : 1;
                  imported.scale.setScalar(fitScale);
                  imported.position.set(-center3d.x * fitScale, -center3d.y * fitScale, -center3d.z * fitScale);
                  imported.traverse(function(obj) { if (obj.isMesh) { obj.castShadow = false; obj.receiveShadow = false; if (obj.material) { obj.material = obj.material.clone(); obj.material.side = THREE.DoubleSide; } } });
                  silhouetteGroup.visible = false;
                  bodyGroup.add(imported);
                  render3d();
                  setStatus('Local GLB ready: ' + (window.__alloAnatomyModelName || 'anatomy model') + '. Structure markers remain schematic overlays. Preserve the model source attribution and share-alike terms.', 'ready-model');
                }, undefined, function() { if (alive) setStatus('The local GLB could not be read. The procedural 3D body remains available.', 'fallback-model'); });
              }
              if (THREE.OrbitControls) {
                controls = new THREE.OrbitControls(camera, canvas); controls.enableDamping = true; controls.dampingFactor = 0.08; controls.enablePan = false; controls.minDistance = 5; controls.maxDistance = 11; controls.target.set(0, -0.15, 0); controls.update();
              }
              var raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
              canvas._anatomy3dPick = function(event) {
                var rect = canvas.getBoundingClientRect(); pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1; pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1; raycaster.setFromCamera(pointer, camera);
                var hits = raycaster.intersectObjects(structuresGroup.children, false); if (!hits.length) return;
                var id = hits[0].object.userData.structureId; if (!id) return;
                updMulti(structureFocusPatch(id, { _lastSelectedSource: '3d' })); announceStructure(id); playSound('select');
              };
              function render3d() { if (alive && renderer && scene) renderer.render(scene, camera); }
              var reduced = false; try { reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}
              function animate3d() { if (!alive) return; if (controls) controls.update(); render3d(); raf = requestAnimationFrame(animate3d); }
              canvas._resetAnatomy3d = function() { camera.position.set(0, 0.15, 7.6); if (controls) { controls.target.set(0, -0.15, 0); controls.update(); } bodyGroup.rotation.y = view === 'posterior' ? Math.PI : 0; render3d(); if (typeof announceToSR === 'function') announceToSR('3D anatomy camera reset.'); };
              if (reduced) { if (controls) controls.addEventListener('change', render3d); render3d(); } else animate3d();
              setStatus('3D body overview ready. Drag to rotate, use the wheel to zoom, or select a glowing structure marker. The structure directory is the keyboard-accessible alternative.', 'ready');
            } catch (error) {
              setStatus('The 3D body view could not initialize. Switch to the detailed 2D diagram; all structures remain available there.', 'fallback');
            }
          }).catch(function() { if (alive) setStatus('The 3D body engine could not load. Switch to the detailed 2D diagram; all structures remain available there.', 'fallback'); });
        };
        // UI RENDER
        // ══════════════════════════════════════

        return h('div', {
          className: 'anatomy-tool-shell max-w-6xl mx-auto animate-in fade-in duration-200 outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-1',
          'data-anatomy-tool': 'true',
          style: { '--anatomy-accent': sys.accent, '--anatomy-soft': sys.color }
        },

          // Header
          h('div', { className: 'anatomy-topbar flex items-center gap-3 mb-3' },
            h('button', { onClick: function() { setStemLabTool(null); }, className: 'p-1.5 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-1 active:scale-[0.97]', 'aria-label': t('stem.anatomy.back_to_tools', 'Back to tools') }, h(ArrowLeft, { size: 18, className: 'text-slate-600' })),
            h('div', null,
              h('h3', { className: 'text-lg font-bold text-slate-800 tracking-tight' }, t('stem.anatomy.human_anatomy_explorer', '\uD83E\uDEC0 Human Anatomy Explorer')),
              h('p', { className: 'text-xs text-slate-600' }, sys.desc)
            ),
            h('button', { 'aria-label': t('stem.anatomy.snapshot', 'Snapshot'),
              onClick: takeSnapshot,
              className: 'ml-auto px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-600 hover:bg-amber-100 transition-all active:scale-[0.97]',
              title: t('stem.anatomy.save_snapshot', 'Save snapshot')
            }, t('stem.anatomy.snapshot_2', '\uD83D\uDCF8 Snapshot'))
          ),

          // Mission dashboard
          h('section', {
            className: 'anatomy-mission mb-3',
            'data-anatomy-mission': 'true',
            style: { borderColor: sys.accent + '26' }
          },
            h('div', { className: 'anatomy-mission-inner' },
              h('div', null,
                h('div', { className: 'anatomy-kicker' }, t('stem.anatomy.body_systems_lab', 'Body systems lab')),
                h('h2', { className: 'anatomy-mission-title' }, sys.icon + ' ' + sys.name + ' ' + t('stem.anatomy.system', 'system')),
                h('p', { className: 'anatomy-mission-text' }, missionPrompt),
                h('div', { className: 'anatomy-mission-actions' },
                  h('button', {
                    onClick: function() { activateAnatomyTab('explore'); },
                    className: 'px-3 py-1.5 text-xs font-bold border transition-all ' + (activeTab === 'explore' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 active:scale-[0.97]')
                  }, t('stem.anatomy.explore', 'Explore')),
                  h('button', {
                    onClick: function() { activateAnatomyTab('tour'); },
                    className: 'px-3 py-1.5 text-xs font-bold border transition-all ' + (activeTab === 'tour' ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50 active:scale-[0.97]')
                  }, t('stem.anatomy.guided_tour', 'Guided tour')),
                  h('button', {
                    onClick: function() { activateAnatomyTab('spotter'); },
                    className: 'px-3 py-1.5 text-xs font-bold border transition-all ' + (activeTab === 'spotter' ? 'bg-amber-700 text-white border-amber-700' : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50 active:scale-[0.97]')
                  }, t('stem.anatomy.spotter', 'Spotter'))
                )
              ),
              h('div', null,
                h('div', { className: 'anatomy-metric-grid' },
                  h('div', { className: 'anatomy-metric' },
                    h('strong', null, String(structuresViewedCount)),
                    h('span', null, t('stem.anatomy.structures_viewed', 'Structures viewed'))
                  ),
                  h('div', { className: 'anatomy-metric' },
                    h('strong', null, systemsExploredCount + '/10'),
                    h('span', null, t('stem.anatomy.systems_explored', 'Systems explored'))
                  ),
                  h('div', { className: 'anatomy-metric' },
                    h('strong', null, String(activeLayerCount)),
                    h('span', null, t('stem.anatomy.layers_on', 'Layers on'))
                  ),
                  h('div', { className: 'anatomy-metric' },
                    h('strong', null, badgesEarnedCount + '/' + BADGE_DEFS.length),
                    h('span', null, t('stem.anatomy.badges', 'Badges'))
                  ),
                  h('div', { className: 'anatomy-metric' },
                    h('strong', null, currentSystemMasteredCount + '/' + viewFiltered.length),
                    h('span', null, 'Got it in this view')
                  ),
                  h('div', { className: 'anatomy-metric' },
                    h('strong', null, String(currentSystemReviewCount)),
                    h('span', null, 'To review')
                  )
                ),
                h('div', { className: 'anatomy-challenge-strip', 'aria-label': t('stem.anatomy.challenge_progress', 'Challenge progress') },
                  ANAT_CHALLENGES.map(function(ch) {
                    var done = completedChallenges.indexOf(ch.id) !== -1;
                    return h('span', {
                      key: ch.id,
                      title: ch.name + ': ' + ch.desc + ' (' + ch.rp + ' RP)',
                      className: 'anatomy-challenge-chip',
                      'data-done': done ? 'true' : 'false'
                    }, ch.icon);
                  }),
                  h('span', { className: 'text-[11px] font-bold text-amber-700 self-center ml-1' }, researchPoints + ' RP - ' + completedChallengeCount + '/' + ANAT_CHALLENGES.length)
                ),
                h('section', { className: 'anatomy-coach', 'aria-label': 'Recommended next study step' },
                  h('span', { className: 'anatomy-kicker' }, 'Recommended next step'),
                  h('strong', null, recommendedNextStep.title),
                  h('p', null, recommendedNextStep.detail),
                  h('button', { type: 'button', onClick: runRecommendedNextStep,
                    className: 'px-3 py-1.5 rounded-lg text-[11px] font-bold bg-violet-700 text-white hover:bg-violet-800 active:scale-[0.97]'
                  }, recommendedNextStep.action)
                )
              )
            )
          ),

          // Tab bar (10 tabs)
          h('div', { className: 'anatomy-tab-strip flex flex-wrap gap-1 gap-y-1.5 mb-3', role: 'tablist', 'aria-label': t('stem.anatomy.learning_modes', 'Anatomy learning modes'), 'aria-orientation': 'horizontal', onKeyDown: handleAnatomyTabKey, 'data-anatomy-tab-strip': 'true' },
            h('button', { 'aria-label': t('stem.anatomy.explore', 'Explore'),
              role: 'tab', 'aria-controls': 'anatomy-mode-panel', 'aria-selected': activeTab === 'explore', tabIndex: activeTab === 'explore' ? 0 : -1,
              onClick: function() { activateAnatomyTab('explore'); },
              className: 'px-4 py-1.5 rounded-lg text-xs font-bold transition-all ' + (activeTab === 'explore' ? 'bg-slate-800 text-white border border-slate-800' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-300 active:scale-[0.97]')
            }, t('stem.anatomy.explore_2', '\uD83E\uDEC0 Explore')),
            h('button', { 'aria-label': 'Imaging Lab',
              role: 'tab', 'aria-controls': 'anatomy-mode-panel', 'aria-selected': activeTab === 'imaging', tabIndex: activeTab === 'imaging' ? 0 : -1,
              onClick: function() { activateAnatomyTab('imaging'); },
              className: 'px-4 py-1.5 rounded-lg text-xs font-bold transition-all ' + (activeTab === 'imaging' ? 'bg-cyan-800 text-white border border-cyan-800' : 'bg-white text-slate-600 hover:bg-cyan-50 border border-slate-300 active:scale-[0.97]')
            }, '🩻 Imaging'),
            h('button', { 'aria-label': 'Procedure Studio',
              role: 'tab', 'aria-controls': 'anatomy-mode-panel', 'aria-selected': activeTab === 'procedure', tabIndex: activeTab === 'procedure' ? 0 : -1,
              onClick: function() { activateAnatomyTab('procedure'); },
              className: 'px-4 py-1.5 rounded-lg text-xs font-bold transition-all ' + (activeTab === 'procedure' ? 'bg-rose-800 text-white border border-rose-800' : 'bg-white text-slate-600 hover:bg-rose-50 border border-slate-300 active:scale-[0.97]')
            }, '\uD83E\uDE7A Procedure'),            h('button', { 'aria-label': t('stem.anatomy.tour', 'Tour'),
              role: 'tab', 'aria-controls': 'anatomy-mode-panel', 'aria-selected': activeTab === 'tour', tabIndex: activeTab === 'tour' ? 0 : -1,
              onClick: function() { activateAnatomyTab('tour'); },
              className: 'px-4 py-1.5 rounded-lg text-xs font-bold transition-all ' + (activeTab === 'tour' ? 'bg-emerald-700 text-white border border-emerald-700' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-300 active:scale-[0.97]')
            }, t('stem.anatomy.tour_2', '\uD83E\uDDED Tour')),
            h('button', { 'aria-label': t('stem.anatomy.connect', 'Connect'),
              role: 'tab', 'aria-controls': 'anatomy-mode-panel', 'aria-selected': activeTab === 'connections', tabIndex: activeTab === 'connections' ? 0 : -1,
              onClick: function() { activateAnatomyTab('connections'); },
              className: 'px-4 py-1.5 rounded-lg text-xs font-bold transition-all ' + (activeTab === 'connections' ? 'bg-sky-700 text-white border border-sky-700' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-300 active:scale-[0.97]')
            }, t('stem.anatomy.connect_2', '\uD83D\uDD17 Connect')),
            h('button', { 'aria-label': t('stem.anatomy.ai_tutor', 'AI Tutor'),
              role: 'tab', 'aria-controls': 'anatomy-mode-panel', 'aria-selected': activeTab === 'aiTutor', tabIndex: activeTab === 'aiTutor' ? 0 : -1,
              onClick: function() { activateAnatomyTab('aiTutor'); },
              className: 'px-4 py-1.5 rounded-lg text-xs font-bold transition-all ' + (activeTab === 'aiTutor' ? 'bg-violet-700 text-white border border-violet-700' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-300 active:scale-[0.97]')
            }, t('stem.anatomy.ai_tutor_2', '\uD83E\uDD16 AI Tutor')),
            h('button', { 'aria-label': t('stem.anatomy.spotter', 'Spotter'),
              role: 'tab', 'aria-controls': 'anatomy-mode-panel', 'aria-selected': activeTab === 'spotter', tabIndex: activeTab === 'spotter' ? 0 : -1,
              onClick: function() { activateAnatomyTab('spotter'); },
              className: 'px-4 py-1.5 rounded-lg text-xs font-bold transition-all ' + (activeTab === 'spotter' ? 'bg-amber-700 text-white border border-amber-700' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-300 active:scale-[0.97]')
            }, t('stem.anatomy.spotter_2', '\uD83C\uDFAF Spotter')),
            h('button', { 'aria-label': t('stem.anatomy.pathways', 'Pathways'),
              role: 'tab', 'aria-controls': 'anatomy-mode-panel', 'aria-selected': activeTab === 'pathways', tabIndex: activeTab === 'pathways' ? 0 : -1,
              onClick: function() { activateAnatomyTab('pathways'); },
              className: 'px-4 py-1.5 rounded-lg text-xs font-bold transition-all ' + (activeTab === 'pathways' ? 'bg-rose-700 text-white border border-rose-700' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-300 active:scale-[0.97]')
            }, t('stem.anatomy.pathways_2', '\uD83D\uDEE4 Pathways')),
            h('button', { 'aria-label': t('stem.anatomy.cards', 'Cards'),
              role: 'tab', 'aria-controls': 'anatomy-mode-panel', 'aria-selected': activeTab === 'flashcards', tabIndex: activeTab === 'flashcards' ? 0 : -1,
              onClick: function() { activateAnatomyTab('flashcards'); },
              className: 'px-4 py-1.5 rounded-lg text-xs font-bold transition-all ' + (activeTab === 'flashcards' ? 'bg-teal-700 text-white border border-teal-700' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-300 active:scale-[0.97]')
            }, t('stem.anatomy.cards_2', '\uD83C\uDCCF Cards')),
            h('button', { 'aria-label': t('stem.anatomy.homeostasis_discovery', 'Homeostasis discovery'),
              role: 'tab', 'aria-controls': 'anatomy-mode-panel', 'aria-selected': activeTab === 'homeoHunt', tabIndex: activeTab === 'homeoHunt' ? 0 : -1,
              onClick: function() { activateAnatomyTab('homeoHunt'); },
              className: 'px-4 py-1.5 rounded-lg text-xs font-bold transition-all ' + (activeTab === 'homeoHunt' ? 'bg-indigo-700 text-white border border-indigo-700' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-300 active:scale-[0.97]')
            }, t('stem.anatomy.homeostasis', '\uD83C\uDFE0 Homeostasis')),
            h('span', { className: 'ml-auto text-[11px] font-bold text-amber-600 self-center' }, '\uD83C\uDFC5 ' + badgesEarnedCount + '/' + BADGE_DEFS.length + ' badges')
          ),

          // Challenges Progress Card
          showLegacyChallengeCard && h('div', {
            className: 'mb-3 rounded-xl p-4 border bg-gradient-to-r from-amber-50 to-orange-50 border-orange-200',
            style: { boxShadow: '0 2px 8px rgba(180,83,9,0.06)' }
          },
            h('div', { className: 'flex items-center justify-between mb-2' },
              h('div', { className: 'flex items-center gap-2' },
                h('span', { style: { fontSize: '18px' } }, '⭐'),
                h('span', { className: 'text-sm font-bold text-amber-700' }, researchPoints + ' RP')
              ),
              h('span', {
                className: 'text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-600'
              }, completedChallenges.length + '/' + ANAT_CHALLENGES.length + ' challenges')
            ),
            h('div', { className: 'w-full rounded-full h-2.5 bg-orange-100/50', style: { boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)' } },
              h('div', {
                className: 'bg-gradient-to-r from-amber-500 to-orange-500 h-2.5 rounded-full transition-all duration-500',
                style: { width: Math.min(100, (completedChallenges.length / ANAT_CHALLENGES.length) * 100) + '%', boxShadow: '0 0 8px rgba(245,158,11,0.4)' }
              })
            ),
            h('div', { className: 'flex flex-wrap gap-2 mt-3' },
              ANAT_CHALLENGES.map(function(ch) {
                var done = completedChallenges.indexOf(ch.id) !== -1;
                return h('div', {
                  key: ch.id, title: ch.name + ': ' + ch.desc + ' (' + ch.rp + ' RP)',
                  className: 'text-center cursor-default transition-all ' + (done ? 'drop-shadow-md' : 'opacity-25 grayscale'),
                  style: { fontSize: '18px' }
                }, ch.icon);
              })
            )
          ),

          // ── Topic-accent hero band per tab ──
          (function() {
            var TAB_META = {
              explore:     { accent: '#1e293b', soft: 'rgba(30,41,59,0.06)',  icon: '\uD83E\uDEC0', title: t('stem.anatomy.explore_the_system', 'Explore the system'),         hint: t('stem.anatomy.click_any_organ_to_see_its_structure_f', 'Click any organ to see its structure, function, and connections. Hover for plain-English labels; tap for the deep dive.') },
              imaging:     { accent: '#0e7490', soft: 'rgba(14,116,144,0.10)', icon: '🩻', title: 'CT / MRI Imaging Lab', hint: 'Scroll synthetic teaching slices, compare anatomical planes, adjust CT window and level or MRI display contrast, and record observations without patient data.' },
              procedure:   { accent: '#9f1239', soft: 'rgba(159,18,57,0.10)', icon: '\uD83E\uDE7A', title: 'Scan-to-cell Procedure Studio', hint: 'Plan from a synthetic scan, practice instrument choice and tissue control, preserve a specimen, and carry the evidence into cell microdissection.' },
              tour:        { accent: '#047857', soft: 'rgba(4,120,87,0.10)',  icon: '\uD83E\uDDED', title: t('stem.anatomy.guided_tour', 'Guided tour'),                 hint: t('stem.anatomy.step_through_each_major_part_in_pedago', 'Step through each major part in pedagogical order. Best path for first-time learners \u2014 covers structure \u2192 function \u2192 integration in one pass.') },
              connections: { accent: '#0284c7', soft: 'rgba(2,132,199,0.10)', icon: '\uD83D\uDD17', title: t('stem.anatomy.cross_system_connections', 'Cross-system connections'),    hint: t('stem.anatomy.no_system_works_alone_the_kidney_filte', 'No system works alone. The kidney filters blood (cardiovascular), responds to ADH (endocrine), and excretes urea (digestive byproduct). Find the links.') },
              aiTutor:     { accent: '#7c3aed', soft: 'rgba(124,58,237,0.10)', icon: '\uD83E\uDD16', title: t('stem.anatomy.ai_tutor_3', 'AI tutor'),                    hint: t('stem.anatomy.ask_a_question_about_the_active_organ_', 'Ask a question about the active organ or system. The tutor knows what is on screen and tailors answers to your grade band.') },
              spotter:     { accent: '#b45309', soft: 'rgba(180,83,9,0.10)',  icon: '\uD83C\uDFAF', title: t('stem.anatomy.structure_spotter', 'Structure spotter'),           hint: t('stem.anatomy.click_the_named_structure_on_the_diagr', 'Click the named structure on the diagram. Builds the click-the-thing reflex that AP and medical exams rely on.') },
              pathways:    { accent: '#be123c', soft: 'rgba(190,18,60,0.10)', icon: '\uD83D\uDEE4\uFE0F', title: t('stem.anatomy.trace_the_pathway', 'Trace the pathway'),          hint: t('stem.anatomy.follow_blood_air_food_or_signals_throu', 'Follow blood, air, food, or signals through the body in sequence. Pathways are how isolated facts become a system you can reason about.') },
              flashcards:  { accent: '#0f766e', soft: 'rgba(15,118,110,0.10)', icon: '\uD83C\uDCCF', title: t('stem.anatomy.spaced_repetition_cards', 'Spaced-repetition cards'),     hint: t('stem.anatomy.quick_recall_cards_with_spaced_repetit', 'Quick-recall cards with spaced repetition. Six-second review now beats five-minute re-read tomorrow \u2014 that is the testing effect.') },
              homeoHunt:   { accent: '#4338ca', soft: 'rgba(67,56,202,0.10)', icon: '🏠', title: t('stem.anatomy.homeostasis_hunt', 'Homeostasis Hunt'),         hint: t('stem.anatomy.compare_homeostasis_reference_ranges', 'Adjust the sliders to compare three adult teaching reference ranges and examine the limits of a simplified homeostasis model.') }
            };
            var meta = TAB_META[activeTab] || TAB_META.explore;
            return h('div', {
              className: 'anatomy-mode-card',
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
              h('div', { className: 'anatomy-mode-icon', style: { fontSize: 28, flexShrink: 0 }, 'aria-hidden': 'true' }, meta.icon),
              h('div', { style: { flex: 1, minWidth: 220 } },
                h('h3', { style: { color: meta.accent, fontSize: 15, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, meta.title),
                h('p', { style: { margin: '3px 0 0', color: 'var(--allo-stem-text-soft, #475569)', fontSize: 11, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
              )
            );
          })(),

          // ── System tabs (Always visible) ──
          !focusedAnatomyWorkspace && h('div', { className: 'anatomy-system-rail mb-3', 'data-anatomy-system-rail': 'true', role: 'group', 'aria-label': 'Body system' },
            Object.keys(SYSTEMS).map(function(key) {
              var s = SYSTEMS[key];
              var systemStructures = s.structures.filter(passesComplexity);
              var systemExploredCount = systemStructures.filter(function(structure) { return structuresViewed[structure.id]; }).length;
              var systemProgress = systemStructures.length > 0 ? Math.round((systemExploredCount / systemStructures.length) * 100) : 0;
              var systemIsActive = sysKey === key;
              return h('button', { key: key, 'aria-pressed': systemIsActive,
                'aria-label': s.name + '. ' + systemExploredCount + ' of ' + systemStructures.length + ' structures explored.',
                onClick: function() { showAnatomySystem(key); },
                className: 'anatomy-system-button px-3 py-1.5 rounded-lg text-xs font-bold transition-all outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-1 ' + (systemIsActive ? 'text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-300 active:scale-[0.97]'),
                style: systemIsActive ? { '--system-accent': s.accent, background: s.accent, boxShadow: 'inset 0 0 0 1px rgba(15,23,42,0.24), 0 4px 10px ' + s.accent + '30' } : { '--system-accent': s.accent }
              },
                h('span', { className: 'anatomy-system-label' },
                  h('span', null, s.icon + ' ' + s.name),
                  h('span', { className: 'anatomy-system-count', 'aria-hidden': 'true' }, systemExploredCount + '/' + systemStructures.length)
                ),
                h('span', { className: 'anatomy-system-meter', 'aria-hidden': 'true' },
                  h('span', { style: { width: systemProgress + '%' } })
                )
              );
            })
          ),

          // ── Fun fact banner (Always visible) ──
          !focusedAnatomyWorkspace && currentFact ? h('div', { className: 'mb-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2' },
            h('span', { className: 'text-base flex-shrink-0' }, '\uD83D\uDCA1'),
            h('div', { className: 'flex-1' },
              h('span', { className: 'text-[11px] font-bold text-amber-700 uppercase' }, t('stem.anatomy.did_you_know', 'Did you know?')),
              h('p', { className: 'text-xs text-amber-900 leading-relaxed' }, currentFact)
            ),
            h('button', { 'aria-label': t('stem.anatomy.next', 'Next'),
              onClick: function() { upd('_factIdx', (factIdx + 1) % sysFacts.length); playSound('funFact'); },
              className: 'px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-700 hover:bg-amber-200 transition-all flex-shrink-0 active:scale-[0.97]'
            }, t('stem.anatomy.next_2', 'Next \u2192'))
          ) : null,

          // ── Mnemonics section (Always visible) ──
          !focusedAnatomyWorkspace && MNEMONICS[sysKey] && MNEMONICS[sysKey].length > 0 ? h('div', { className: 'mb-3' },
            h('button', { onClick: function() { upd('_showMnemonics', !showMnemonics); },
              'aria-expanded': showMnemonics, 'aria-controls': 'anatomy-mnemonics-panel',
              className: 'w-full flex items-center justify-between px-3 py-2 rounded-lg bg-purple-50 border border-purple-600 hover:bg-purple-100 transition-all active:scale-[0.97]'
            },
              h('span', { className: 'text-[11px] font-bold text-purple-700 uppercase flex items-center gap-1' }, '\uD83E\uDDE0 Mnemonics (' + MNEMONICS[sysKey].length + ')'),
              h('span', { className: 'text-[11px] text-purple-500' }, showMnemonics ? '\u25B2' : '\u25BC')
            ),
            showMnemonics ? h('div', { id: 'anatomy-mnemonics-panel', className: 'mt-1 space-y-1.5' },
              MNEMONICS[sysKey].map(function(mn) {
                var isRevealed = mnemonicsViewed[mn.id];
                return h('div', { 
                  key: mn.id,
                  className: 'rounded-lg p-2.5 border transition-all ' + (isRevealed ? 'border-purple-300 bg-purple-50' : 'border-slate-200 bg-white')
                },
                  h('p', { className: 'text-[11px] font-bold text-purple-800 mb-0.5' }, mn.title),
                  h('p', { className: 'text-xs font-black text-purple-600 mb-1 italic' }, '"' + mn.phrase + '"'),
                  isRevealed ? h('div', null,
                    h('p', { className: 'text-[11px] text-slate-600 leading-relaxed' }, mn.meaning),
                    ttsBtn(mn.phrase + '. ' + mn.meaning)
                  ) : h('button', { 'aria-label': t('stem.anatomy.reveal_meaning', 'Reveal meaning'),
                    onClick: function() {
                      var newMV = Object.assign({}, mnemonicsViewed);
                      newMV[mn.id] = true;
                      upd('_mnemonicsViewed', newMV);
                      playSound('mnemonicReveal');
                      setTimeout(checkAnatomyChallenges, 50);
                    },
                    className: 'text-[11px] font-bold text-purple-600 hover:text-purple-800 transition-all'
                  }, t('stem.anatomy.reveal_meaning_2', 'Reveal meaning \u2192'))
                );
              })
            ) : null
          ) : null,

          // ── Progress tracker (Always visible) ──
          !focusedAnatomyWorkspace && h('div', { className: 'anatomy-progress-row mb-3 flex items-center gap-2' },
            h('span', { className: 'text-[11px] font-bold text-slate-600' }, sys.icon + ' ' + exploredInSystem + '/' + viewFiltered.length + ' explored'),
            h('div', { className: 'flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden', role: 'progressbar',
              'aria-label': sys.name + ' exploration progress', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': progressPct },
              h('div', { className: 'h-full rounded-full transition-all', style: { width: progressPct + '%', background: sys.accent } })
            ),
            h('span', { className: 'text-[11px] font-bold', style: { color: sys.accent } }, progressPct + '%')
          ),

          // ── Layer toggle bar (Always visible) ──
          !focusedAnatomyWorkspace && h('div', { className: 'anatomy-layer-bar flex items-center gap-1.5 mb-3 flex-wrap', 'data-anatomy-layer-bar': 'true' },
            h('span', { className: 'text-[11px] font-bold text-slate-600 uppercase tracking-wider mr-1' }, t('stem.anatomy.layers', '\uD83E\uDDE0 Layers')),
            LAYER_DEFS.map(function(ld) {
              var isOn = isLayerVisible(ld.id);
              return h('button', { 'aria-label': (isOn ? 'Hide ' : 'Show ') + ld.name + ' layer',
                key: ld.id,
                onClick: function() { toggleLayer(ld.id); },
                title: (isOn ? 'Hide ' : 'Show ') + ld.name + ' layer',
                className: 'px-2 py-1 rounded-lg text-[11px] font-bold transition-all border ' +
                  (isOn ? 'text-white shadow-sm border-transparent' : 'transition-colors bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-100 active:scale-[0.97]'),
                style: isOn ? { background: ld.accent, borderColor: ld.accent } : {}
              }, ld.icon + ' ' + ld.name);
            }),
            h('button', { 'aria-label': t('stem.anatomy.reset', 'Reset'),
              onClick: function() { upd('visibleLayers', { skin: true }); },
              title: t('stem.anatomy.reset_all_layers_to_default_skin_only', 'Reset to skin plus the current system layer'),
              className: 'ml-auto px-2 py-1 rounded-lg text-[11px] font-bold text-slate-600 hover:text-slate-600 hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200 active:scale-[0.97]'
            }, t('stem.anatomy.reset_2', '\u21BA Reset'))
          ),

          // ── Controls (Always visible) ──
          !focusedAnatomyWorkspace && h('div', { className: 'anatomy-controls-bar flex items-center gap-2 mb-3 flex-wrap', 'data-anatomy-controls': 'true' },
            h('div', { className: 'flex rounded-lg border border-slate-400 overflow-hidden', role: 'group', 'aria-label': 'Body orientation' },
              ['anterior', 'posterior'].map(function(v) {
                return h('button', {
                  key: v,
                  onClick: function() { updMulti({ view: v, selectedStructure: null, quizIdx: 0, quizScore: 0, quizFeedback: null, _quizAttempts: 0 }); playSound('viewSwitch'); },
                  'aria-pressed': view === v,
                  className: 'px-3 py-1 text-xs font-bold transition-all border-2 ' + (view === v ? 'bg-slate-800 text-white border-slate-800' : 'transition-colors bg-white text-slate-600 hover:bg-slate-50 border-transparent active:scale-[0.97]')
                }, v.charAt(0).toUpperCase() + v.slice(1));
              })
            ),
            h('input', {
              type: 'text', placeholder: t('stem.anatomy.search_structures', '\uD83D\uDD0D Search structures...'),
              'aria-label': t('stem.anatomy.search_anatomical_structures', 'Search anatomical structures'),
              value: searchValue, maxLength: 200,
              onChange: function(e) { updMulti({ search: e.target.value, selectedStructure: null }); },
              onKeyDown: function(e) {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  updMulti({ search: '', selectedStructure: null });
                  return;
                }
                if (e.key !== 'Enter') return;
                var query = String(e.currentTarget.value || '').trim().toLowerCase();
                var firstMatch = viewFiltered.find(function(st) {
                  return st.name.toLowerCase().indexOf(query) >= 0 || st.fn.toLowerCase().indexOf(query) >= 0;
                });
                if (!query || !firstMatch) return;
                e.preventDefault();
                var searchPatch = selectionPatch(firstMatch.id);
                if (lastSearchFind !== query) {
                  searchPatch._lastSearchFind = query;
                  searchPatch._searchFinds = searchFinds + 1;
                }
                updMulti(searchPatch);
                announceStructure(firstMatch.id);
                playSound('structureClick');
              },
              className: 'flex-1 min-w-[140px] px-3 py-1.5 text-xs border border-slate-400 rounded-lg focus:ring-2 focus:ring-rose-300 outline-none'
            }),
            searchTerm ? h('button', {
              'aria-label': 'Clear anatomy search', title: 'Clear search',
              onClick: function() { updMulti({ search: '', selectedStructure: null }); },
              className: 'px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-700 border border-slate-400 hover:bg-slate-100 active:scale-[0.97]'
            }, '\u2715 Clear') : null,
            h('button', { onClick: function() { updMulti({ quizMode: !quizMode, quizIdx: 0, quizScore: 0, quizFeedback: null, _quizAttempts: 0 }); },
              'aria-pressed': quizMode,
              className: 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all ' + (quizMode ? 'bg-green-700 text-white' : 'transition-colors bg-green-50 text-green-700 border border-green-600 hover:bg-green-100 active:scale-[0.97]')
            }, quizMode ? '\u2705 Quiz On' : '\uD83E\uDDEA Quiz'),
            h('div', { className: 'flex rounded-lg border border-slate-400 overflow-hidden', role: 'group', 'aria-label': 'Learning level' },
              [{ v: 1, label: 'K\u20135', tip: t('stem.anatomy.elementary', 'Elementary') }, { v: 2, label: '6\u20138', tip: t('stem.anatomy.middle', 'Middle') }, { v: 3, label: '9\u201312+', tip: t('stem.anatomy.advanced', 'Advanced') }].map(function(lv) {
                return h('button', { key: lv.v, title: lv.tip + ' level', 'aria-pressed': complexity === lv.v,
                  onClick: function() { updMulti({ complexity: lv.v, selectedStructure: null, quizIdx: 0, quizScore: 0, quizFeedback: null, _quizAttempts: 0 }); },
                  className: 'px-2 py-1 text-[11px] font-bold transition-all ' + (complexity === lv.v ? 'bg-indigo-600 text-white' : 'transition-colors bg-white text-slate-600 hover:bg-slate-50 active:scale-[0.97]')
                }, lv.label);
              })
            ),
            h('span', { className: 'text-[11px] text-slate-600 font-bold' }, filtered.length + ' structures'),
            h('button', { 'aria-label': t('stem.anatomy.regions', 'Regions'), 'aria-pressed': d._showRegionLabels === true,
              onClick: function() { upd('_showRegionLabels', d._showRegionLabels !== true); },
              title: t('stem.anatomy.toggle_body_region_labels', 'Toggle body region labels'),
              className: 'px-2 py-1 rounded-lg text-[11px] font-bold transition-all border ' + (d._showRegionLabels === true ? 'bg-slate-700 text-white border-slate-700' : 'transition-colors bg-white text-slate-600 border-slate-200 hover:bg-slate-50 active:scale-[0.97]')
            }, t('stem.anatomy.regions_2', '\uD83C\uDFF7 Regions')),
            h('button', { 'aria-label': 'X-ray',
              'aria-pressed': !!xrayMode,
              onClick: function() { upd('_xrayMode', !xrayMode); },
              title: t('stem.anatomy.toggle_x_ray_radiograph_mode', 'Toggle X-ray radiograph mode'),
              className: 'px-2 py-1 rounded-lg text-[11px] font-bold transition-all border ' + (xrayMode ? 'bg-cyan-800 text-cyan-200 border-cyan-600' : 'transition-colors bg-white text-slate-600 border-slate-200 hover:bg-slate-50 active:scale-[0.97]')
            }, t('stem.anatomy.x_ray', '\u2622 X-ray')),
            // Skin tone selector (representation & inclusion)
            h('div', { className: 'flex items-center gap-1 ml-1', title: t('stem.anatomy.skin_tone_representation', 'Skin tone (representation)') },
              h('span', { className: 'text-[11px] text-slate-200 font-bold' }, '\uD83C\uDFA8'),
              SKIN_TONES.map(function(tone) {
                return h('button', {
                  key: tone.id,
                  'aria-label': tone.label + ' skin tone',
                  'aria-pressed': skinToneId === tone.id,
                  onClick: function() { upd('_skinTone', tone.id); },
                  className: 'w-5 h-5 rounded-full border-2 transition-all ' + (skinToneId === tone.id ? 'border-slate-700 ring-2 ring-offset-1 ring-slate-700 scale-110' : 'transition-colors border-slate-400 hover:border-slate-600'),
                  style: { backgroundColor: tone.base }
                });
              })
            ),
            // Male/Female toggle (reproductive system only)
            sysKey === 'reproductive' ? h('button', {
              'aria-label': t('stem.anatomy.toggle_male_female_anatomy', 'Toggle male/female anatomy'),
              onClick: function() { upd('_maleAnatomy', d._maleAnatomy !== true); },
              className: 'px-2 py-1 rounded-lg text-[11px] font-bold transition-all border ml-1 ' + (d._maleAnatomy === true ? 'bg-violet-600 text-white border-violet-600' : 'transition-colors bg-pink-50 text-pink-600 border-pink-600 hover:bg-pink-100 active:scale-[0.97]'),
              title: t('stem.anatomy.switch_between_male_and_female_reprodu', 'Switch between male and female reproductive anatomy')
            }, d._maleAnatomy === true ? '\u2642 Male' : '\u2640 Female') : null
          ),

          // ── Main Content Area: Canvas (Left) + Tab Panel (Right) ──
          h('div', { className: 'anatomy-workspace', 'data-anatomy-workspace': 'true', style: focusedAnatomyWorkspace ? { gridTemplateColumns: 'minmax(0,1fr)' } : undefined },
            // The scan workspace uses the full width; every other mode keeps the body model visible.
            !focusedAnatomyWorkspace && h('div', { className: 'anatomy-body-shell', 'data-anatomy-model-shell': 'true', style: { borderColor: sys.accent + '24' } },
              h('div', { className: 'anatomy-body-header' },
                h('div', { className: 'anatomy-body-title' },
                  h('strong', null, sys.icon + ' ' + sys.name),
                  h('span', null, view.charAt(0).toUpperCase() + view.slice(1) + ' view')
                ),
                h('div', { className: 'anatomy-body-badges' },
                  h('span', { style: { color: sys.accent } }, filtered.length + ' structures'),
                  h('div', { className: 'anatomy-view-toggle', role: 'group', 'aria-label': 'Anatomy model view' },
                    h('button', { type: 'button', 'aria-pressed': bodyView3d ? 'false' : 'true', onClick: function() { upd('_bodyView3d', false); } }, '2D detail'),
                    h('button', { type: 'button', 'aria-pressed': bodyView3d ? 'true' : 'false', onClick: function() { upd('_bodyView3d', true); } }, '3D body')
                  ),
                  bodyView3d && h('label', { className: 'rounded-lg border border-indigo-200 bg-white px-2 py-1 text-[10px] font-black text-indigo-800 cursor-pointer', title: 'Import a local uncompressed GLB that you are licensed to use. The file is not uploaded.' },
                    window.__alloAnatomyModelName ? 'Replace GLB' : 'Import local GLB',
                    h('input', { type: 'file', accept: '.glb,model/gltf-binary', className: 'sr-only', 'aria-label': 'Import a licensed local anatomy GLB model', onChange: function(event) {
                      var file = event.target.files && event.target.files[0]; if (!file) return;
                      if (!/\.glb$/i.test(file.name)) { if (typeof addToast === 'function') addToast('Choose an uncompressed .glb model file.', 'warning'); return; }
                      try { if (window.__alloAnatomyModelUrl) URL.revokeObjectURL(window.__alloAnatomyModelUrl); } catch (e) {}
                      window.__alloAnatomyModelUrl = URL.createObjectURL(file); window.__alloAnatomyModelName = file.name;
                      updMulti({ _bodyView3d: true, _bodyModelRevision: Date.now() });
                      if (typeof announceToSR === 'function') announceToSR('Loading local anatomy model ' + file.name + '.');
                    } })
                  ),
                  bodyView3d && window.__alloAnatomyModelName && h('button', { type: 'button', className: 'rounded-lg border border-slate-300 bg-white px-2 py-1 text-[10px] font-black text-slate-700', onClick: function() {
                    try { if (window.__alloAnatomyModelUrl) URL.revokeObjectURL(window.__alloAnatomyModelUrl); } catch (e) {}
                    window.__alloAnatomyModelUrl = null; window.__alloAnatomyModelName = null; upd('_bodyModelRevision', Date.now());
                  } }, 'Use procedural model'),
                  h('span', {
                    className: 'anatomy-orientation-key',
                    'aria-label': view === 'anterior'
                      ? 'Patient perspective. R appears on the viewer left and L appears on the viewer right.'
                      : 'Patient perspective. L and R align with the viewer.'
                  }, 'Patient R / L')
                )
              ),
              h('div', { className: 'anatomy-canvas-toolbar' },
                h('span', null, bodyView3d ? 'Drag to rotate · wheel to zoom' : (view === 'anterior' ? 'Patient right is on your left' : 'Patient left/right align with you')),
                h('div', { className: 'anatomy-canvas-toolbar-group', role: 'group', 'aria-label': 'Diagram zoom and pan controls', style: bodyView3d ? { display: 'none' } : undefined },
                  h('button', {
                    type: 'button', 'aria-label': 'Zoom out of anatomy diagram', 'aria-keyshortcuts': '-',
                    disabled: canvasZoomIndex === 0,
                    onClick: function() { setCanvasView(CANVAS_ZOOM_LEVELS[Math.max(0, canvasZoomIndex - 1)], canvasPanX, canvasPanY); }
                  }, '−'),
                  h('span', { className: 'text-[10px] font-bold text-slate-600 min-w-[38px] text-center', role: 'status', 'aria-live': 'polite', 'aria-label': canvasViewStatus }, Math.round(canvasZoom * 100) + '%'),
                  h('button', {
                    type: 'button', 'aria-label': 'Zoom in on anatomy diagram', 'aria-keyshortcuts': '+',
                    disabled: canvasZoomIndex === CANVAS_ZOOM_LEVELS.length - 1,
                    onClick: function() { setCanvasView(CANVAS_ZOOM_LEVELS[Math.min(CANVAS_ZOOM_LEVELS.length - 1, canvasZoomIndex + 1)], canvasPanX, canvasPanY); }
                  }, '+'),
                  h('button', { type: 'button', 'aria-label': 'Pan anatomy diagram left', disabled: canvasZoom === 1,
                    onClick: function() { setCanvasView(canvasZoom, canvasPanX + 18, canvasPanY); } }, '←'),
                  h('button', { type: 'button', 'aria-label': 'Pan anatomy diagram up', disabled: canvasZoom === 1,
                    onClick: function() { setCanvasView(canvasZoom, canvasPanX, canvasPanY + 18); } }, '↑'),
                  h('button', { type: 'button', 'aria-label': 'Pan anatomy diagram down', disabled: canvasZoom === 1,
                    onClick: function() { setCanvasView(canvasZoom, canvasPanX, canvasPanY - 18); } }, '↓'),
                  h('button', { type: 'button', 'aria-label': 'Pan anatomy diagram right', disabled: canvasZoom === 1,
                    onClick: function() { setCanvasView(canvasZoom, canvasPanX - 18, canvasPanY); } }, '→'),
                  h('button', { type: 'button',
                    'aria-label': sel ? 'Focus anatomy diagram on ' + sel.name : 'Focus anatomy diagram on selected structure',
                    disabled: !sel, 'aria-keyshortcuts': 'F',
                    onClick: focusSelectedStructure }, 'Focus'),
                  h('button', { type: 'button', 'aria-label': 'Reset anatomy diagram view',
                    disabled: canvasZoom === 1 && canvasPanX === 0 && canvasPanY === 0, 'aria-keyshortcuts': 'Home 0',
                    onClick: function() { setCanvasView(1, 0, 0); } }, 'Reset')
                ),
                bodyView3d && h('div', { className: 'anatomy-canvas-toolbar-group', role: 'group', 'aria-label': '3D camera controls' },
                  h('button', { type: 'button', onClick: function() { var cv = document.querySelector('[data-anatomy-3d-canvas]'); if (cv && cv._resetAnatomy3d) cv._resetAnatomy3d(); }, 'aria-keyshortcuts': 'R 0 Home' }, 'Reset camera')
                )
              ),
              h('div', { className: 'anatomy-canvas-frame', 'data-anatomy-canvas-frame': 'true', 'data-anatomy-view': bodyView3d ? '3d' : '2d' },
                bodyView3d && h('canvas', { role: 'img', tabIndex: 0, width: 360, height: 520, ref: anatomy3dRef, className: 'anatomy-3d-canvas', 'data-anatomy-3d-canvas': 'true', 'aria-label': 'Interactive stylized 3D overview of the ' + sys.name + '. Drag to rotate and use the wheel to zoom. Use the adjacent structure directory for full keyboard access.', 'aria-describedby': 'anatomy-3d-status anatomy-canvas-instructions' }),
                !bodyView3d && h('canvas', { role: 'img', tabIndex: 0, 'aria-label': canvasLabel,
                  'aria-describedby': 'anatomy-canvas-instructions',
                  'aria-keyshortcuts': 'ArrowUp ArrowDown ArrowLeft ArrowRight Shift+ArrowUp Shift+ArrowDown Shift+ArrowLeft Shift+ArrowRight + - 0 Home F Escape',
                  ref: canvasRef,
                  onClick: handleClick,
                  onKeyDown: handleKeyNav,
                  onMouseMove: handleMouseMove,
                  onMouseLeave: handleMouseLeave,
                  onPointerDown: handleCanvasPointerDown,
                  onPointerMove: handleCanvasPointerMove,
                  onPointerUp: handleCanvasPointerUp,
                  onPointerCancel: handleCanvasPointerCancel,
                  onWheel: handleCanvasWheel,
                  className: 'anatomy-canvas border-2 ' + (canvasZoom > 1 ? 'is-zoomed' : 'cursor-crosshair'),
                  'data-anatomy-canvas': 'true',
                  style: {
                    borderColor: sys.accent + '50',
                    background: 'linear-gradient(rgba(148,163,184,0.08) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,0.08) 1px,transparent 1px),radial-gradient(circle at 50% 38%,#ffffff 0%,#f8fafc 62%,#eef2f7 100%)',
                    backgroundSize: '24px 24px,24px 24px,100% 100%',
                    boxShadow: '0 4px 16px rgba(15,23,42,0.06), 0 0 18px ' + sys.accent + '14, inset 0 1px 0 rgba(255,255,255,0.7)',
                    transform: 'translate(' + canvasPanX + 'px,' + canvasPanY + 'px) scale(' + canvasZoom + ')'
                  }
                }),
                !bodyView3d && canvasZoom > 1 ? h('div', {
                  className: 'anatomy-minimap',
                  'data-anatomy-minimap': 'true',
                  'aria-hidden': 'true'
                },
                  h('span', { className: 'anatomy-minimap-label' }, 'ZOOM'),
                  h('span', { className: 'anatomy-minimap-body' }),
                  h('span', {
                    className: 'anatomy-minimap-viewport',
                    style: {
                      left: minimapViewportLeft + '%', top: minimapViewportTop + '%',
                      width: minimapViewportWidth + '%', height: minimapViewportHeight + '%'
                    }
                  }),
                  minimapSelectedMarker ? h('span', { className: 'anatomy-minimap-selected',
                    style: { left: (minimapSelectedMarker.x * 100) + '%', top: (minimapSelectedMarker.y * 100) + '%' } }) : null
                ) : null
              ),
              h('div', { id: 'anatomy-canvas-instructions', className: 'anatomy-canvas-help', 'data-anatomy-canvas-help': 'true' },
                bodyView3d
                  ? h(React.Fragment, null, h('strong', { className: 'text-slate-700' }, '3D controls: '), 'Drag to rotate, use the wheel to zoom, and select a glowing marker. Press R, Home, or 0 to reset. This spatial overview is schematic; use 2D detail and the structure directory for precise labels and full keyboard access.')
                  : h(React.Fragment, null, h('strong', { className: 'text-slate-700' }, 'Diagram controls: '), 'Select markers with pointer or arrow keys. When zoomed, drag or use Shift + arrows to pan; use +/− or Ctrl + wheel to zoom. Press F to focus the selected structure; Home or 0 resets. R/L always indicates the patient\'s perspective.')
              ),
              bodyView3d && h('div', { id: 'anatomy-3d-status', className: 'anatomy-3d-status', role: 'status', 'aria-live': 'polite' }, 'Loading the interactive 3D body overview…'),
              h('nav', { className: 'anatomy-scale-journey', 'aria-label': 'Scale Journey destinations' },
                h('strong', { className: 'text-[11px] text-indigo-950' }, 'Scale Journey'),
                h('div', { className: 'text-[9px] leading-snug text-indigo-800' }, 'Move from body systems to organs, cells, and microscopy.'),
                h('div', { className: 'anatomy-scale-journey-buttons' },
                  h('button', { type: 'button', onClick: function() { openAnatomyScaleDestination('dissection', 'dissection', {}, 'Dissection Lab'); } }, 'Organ dissection'),
                  h('button', { type: 'button', onClick: function() { openAnatomyScaleDestination('cell', 'cell', { mode: 'microdissection', _cellPicked: true, _cellCategory: 'interactive' }, 'Cell Microdissection'); } }, 'Cell scale'),
                  h('button', { type: 'button', onClick: function() { openAnatomyScaleDestination('microbiology', 'microbiology', { tab: 'microscope' }, 'Microscope Lab'); } }, 'Microscope')
                )
              ),
              h('div', { className: 'anatomy-marker-legend', role: 'list', 'aria-label': 'Marker learning status legend' },
                h('span', { className: 'anatomy-marker-legend-title' }, 'Pin status'),
                [
                  { id: 'unrated', symbol: '•', label: 'Unrated' },
                  { id: 'practice', symbol: '!', label: 'Review' },
                  { id: 'learning', symbol: '~', label: 'Learning' },
                  { id: 'mastered', symbol: '✓', label: 'Got it' }
                ].map(function(statusItem) {
                  return h('span', { key: statusItem.id, className: 'anatomy-marker-legend-item', role: 'listitem' },
                    h('span', { className: 'anatomy-marker-legend-symbol', 'data-status': statusItem.id, 'aria-hidden': 'true' }, statusItem.symbol),
                    statusItem.label
                  );
                })
              ),
              // Blood-flow color legend — the circulatory canvas color-codes vessels but never said what the colors mean
              sysKey === 'circulatory' && h('div', { className: 'mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-700 bg-white/70 rounded-lg border border-slate-200 px-2 py-1.5', style: { maxWidth: 360 } },
                h('span', { className: 'flex items-center gap-1' }, h('span', { className: 'inline-block w-2.5 h-2.5 rounded-full', style: { background: '#ef4444' } }), t('stem.anatomy.oxygenated_arteries', 'Oxygenated (arteries)')),
                h('span', { className: 'flex items-center gap-1' }, h('span', { className: 'inline-block w-2.5 h-2.5 rounded-full', style: { background: '#3b82f6' } }), t('stem.anatomy.deoxygenated_veins', 'Deoxygenated (veins)')),
                h('span', { className: 'flex items-center gap-1' }, h('span', { className: 'inline-block w-2.5 h-2.5 rounded-full', style: { background: '#fbbf24' } }), t('stem.anatomy.coronary', 'Coronary')),
                h('span', { className: 'w-full text-[9px] italic text-slate-500' }, t('stem.anatomy.exception_the_pulmonary_artery_carries', 'Exception: the pulmonary artery carries deoxygenated blood (blue), the pulmonary veins carry oxygenated blood (red).'))
              )
            ),

            // Tab-specific Right Panel
            h('div', { id: 'anatomy-mode-panel', className: 'anatomy-side-panel', role: 'tabpanel', 'aria-label': activeTab + ' anatomy panel', 'data-anatomy-panel': activeTab },
              activeTab === 'explore' ? (
                quizMode ? (
                  // Quiz panel (enhanced with 4 types)
                  quizQ ? h('div', { className: 'bg-white rounded-xl border-2 border-green-200 p-4 space-y-3' },
                    h('div', { className: 'flex items-center justify-between mb-2' },
                      h('h4', { className: 'font-bold text-green-800 text-sm' }, t('stem.anatomy.anatomy_quiz', '\uD83E\uDDEA Anatomy Quiz')),
                      h('span', { className: 'text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700' },
                        '\u2B50 Score ' + quizScore + ' - Question ' + ((quizRoundIdx % quizPool.length) + 1) + '/' + quizPool.length)
                    ),
                    h('span', { className: 'text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 mb-1' },
                      quizType === 0 ? 'Function \u2192 Structure' :
                      quizType === 1 ? 'True or False' :
                      quizType === 2 ? 'System ID' : 'Clinical Challenge'
                    ),
                    h('p', { className: 'text-[11px] text-slate-600' }, 'Questions match the ' + view + ' diagram.'),
                    // Question text varies by type
                    quizType === 0 ? h('div', null,
                      h('p', { className: 'text-sm text-slate-800 font-bold leading-relaxed' }, t('stem.anatomy.which_structure_has_this_function', 'Which structure has this function?')),
                      h('p', { className: 'text-xs text-slate-600 bg-slate-50 rounded-lg p-3 leading-relaxed italic' }, quizQ.fn.substring(0, 120) + (quizQ.fn.length > 120 ? '...' : ''))
                    ) : quizType === 1 ? h('div', null,
                      h('p', { className: 'text-sm text-slate-800 font-bold leading-relaxed' }, t('stem.anatomy.true_or_false', 'True or False:')),
                      h('p', { className: 'text-xs text-slate-600 bg-slate-50 rounded-lg p-3 leading-relaxed italic' }, 'The ' + quizQ.name + ' belongs to the ' + tfClaimSys.name + ' system.')
                    ) : quizType === 2 ? h('div', null,
                      h('p', { className: 'text-sm text-slate-800 font-bold leading-relaxed' }, t('stem.anatomy.which_body_system_contains_this_struct', 'Which body system contains this structure?')),
                      h('p', { className: 'text-xs text-slate-600 bg-slate-50 rounded-lg p-3 leading-relaxed font-bold' }, quizQ.name)
                    ) : h('div', null,
                      h('p', { className: 'text-sm text-slate-800 font-bold leading-relaxed' }, t('stem.anatomy.which_structure_is_affected', 'Which structure is affected?')),
                      h('p', { className: 'text-xs text-slate-600 bg-slate-50 rounded-lg p-3 leading-relaxed italic' }, quizQ.clinical ? quizQ.clinical.substring(0, 120) + '...' : quizQ.fn.substring(0, 120) + '...')
                    ),
                    h('div', { className: 'grid grid-cols-1 gap-1.5' },
                      quizOptions.map(function(opt) {
                        var fb = quizFeedback;
                        var isCorrect = opt.id === quizCorrectId;
                        var wasChosen = fb && fb.chosen === opt.id;
                        var showResult = fb !== null && fb !== undefined;
                        return h('button', { key: opt.id,
                          disabled: showResult,
                          onClick: function() {
                            var correct = opt.id === quizCorrectId;
                            var quizPatch = {
                              quizFeedback: { chosen: opt.id, correct: correct },
                              _quizAttempts: quizAttempts + 1,
                              _streak: correct ? streak + 1 : 0
                            };
                            if (correct) {
                              quizPatch.quizScore = quizScore + 1;
                              quizPatch._totalCorrect = totalCorrect + 1;
                              playSound('quizCorrect');
                            } else playSound('quizWrong');
                            updMulti(quizPatch);
                          },
                          className: 'w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all border-2 ' +
                            (showResult && isCorrect ? 'border-green-400 bg-green-50 text-green-800' :
                              showResult && wasChosen && !isCorrect ? 'border-red-400 bg-red-50 text-red-700' :
                                'transition-colors border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 active:scale-[0.97]')
                        }, (showResult && isCorrect ? '\u2705 ' : showResult && wasChosen ? '\u274C ' : '') + opt.name);
                      })
                    ),
                    quizFeedback && h('div', { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', className: 'rounded-lg p-3 text-xs leading-relaxed space-y-1.5 ' + (quizFeedback.correct ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200') },
                      h('p', { className: 'font-black ' + (quizFeedback.correct ? 'text-green-800' : 'text-amber-800') }, (quizFeedback.correct ? '\u2705 Correct! ' : '\u274C The answer was: ') + quizAnswerLabel),
                      h('p', { className: 'text-slate-700' }, h('span', { className: 'font-bold text-slate-600' }, 'Function: '), quizQ.fn.substring(0, 150)),
                      quizQ.clinical && h('p', { className: 'text-slate-600 italic' }, h('span', { className: 'font-bold text-rose-500' }, t('stem.anatomy.clinical', '\u26A0 Clinical: ')), quizQ.clinical.substring(0, 120))
                    ),
                    quizFeedback && h('button', { 'aria-label': t('stem.anatomy.next_question', 'Next Question'),
                      onClick: function() { updMulti({ quizIdx: quizRoundIdx + 1, quizFeedback: null }); },
                      className: 'w-full py-2 mt-2 rounded-lg text-xs font-bold bg-green-700 text-white hover:bg-green-700 transition-all active:scale-[0.97]'
                    }, t('stem.anatomy.next_question_2', 'Next Question \u2192'))
                  ) : h('p', { className: 'text-sm text-slate-600 italic' }, t('stem.anatomy.no_quiz_questions_available', 'No quiz questions available.'))
                ) : (
                  sel ? (
                    // Detail panel — warm-anatomy gradient + system-color
                    // glow so each body system feels distinct without
                    // changing layout.
                    h('div', {
                      className: 'rounded-xl border-2 p-4 space-y-3',
                      style: {
                        borderColor: sys.accent + '50',
                        background: 'linear-gradient(135deg,#ffffff 0%,#fbf6ec 70%,#f5ebd9 100%)',
                        boxShadow: '0 4px 14px rgba(15,23,42,0.06), 0 0 16px ' + sys.accent + '14, inset 0 1px 0 rgba(255,255,255,0.7)'
                      }
                    },
                      h('div', { className: 'flex items-start justify-between' },
                        h('div', { className: 'flex-1' },
                          h('h4', { className: 'text-base font-black', style: { color: sys.accent } }, sel.name),
                          PRONUNCIATION[sel.id] ? h('p', { className: 'text-[11px] text-indigo-600 italic mt-0.5' }, '\uD83D\uDD0A ' + PRONUNCIATION[sel.id]) : null,
                          (gradeBand === 'k2' || gradeBand === 'g35') && SIMPLE_DESC[sel.id] && SIMPLE_DESC[sel.id][gradeBand] ? h('p', { className: 'text-xs text-sky-700 bg-sky-50 rounded-lg px-2 py-1.5 mt-1 border border-sky-200 leading-relaxed' }, SIMPLE_DESC[sel.id][gradeBand]) : null
                        ),
                        h('div', { className: 'flex gap-1' },
                          regionalAtlas ? h('button', {
                            type: 'button',
                            'aria-label': (regionalAtlasOpen ? 'Close ' : 'Open ') + regionalAtlas.title,
                            'aria-expanded': regionalAtlasOpen,
                            'aria-controls': 'anatomy-regional-atlas',
                            onClick: function() {
                              updMulti({ _regionalAtlasOpen: regionalAtlasOpen ? null : sel.id, _regionalAtlasStep: regionalAtlasOpen ? regionalAtlasStep : 0, _regionalAtlasPlaying: true });
                              if (!regionalAtlasOpen && typeof announceToSR === 'function') announceToSR(regionalAtlas.title + ' opened.');
                            },
                            className: 'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold border transition-all ' + (regionalAtlasOpen ? 'bg-rose-700 text-white border-rose-700' : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 active:scale-[0.97]')
                          }, regionalAtlasOpen ? 'Close atlas' : 'Deep dive') : null,
                          h('button', { 'aria-label': compareStructureId === sel.id ? 'Remove ' + sel.name + ' as comparison target' : 'Use ' + sel.name + ' as comparison target',
                            'aria-pressed': compareStructureId === sel.id, onClick: function() {
                              if (compareStructureId === sel.id) { upd('_compareStructure', null); }
                              else { upd('_compareStructure', sel.id); playSound('compareView'); }
                            },
                            title: compareStructureId === sel.id ? 'Remove from compare' : 'Set as compare target',
                            className: 'p-1 rounded text-[11px] font-bold transition-all ' + (compareStructureId === sel.id ? 'bg-violet-100 text-violet-700' : 'transition-colors hover:bg-violet-50 text-violet-400 active:scale-[0.97]')
                          }, '\u2696'),
                          h('button', { 'aria-label': 'Back to structures from ' + sel.name, onClick: function() { upd('selectedStructure', null); },
                            className: 'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 active:scale-[0.97]'
                          }, '\u2190 Structures')
                        )
                      ),
                      h('div', { className: 'space-y-2.5' },
                        h('div', null,
                          h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-0.5' }, t('stem.anatomy.function_2', 'Function'), ttsBtn(sel.fn)),
                          h('p', { className: 'text-xs text-slate-700 leading-relaxed' }, sel.fn)
                        ),
                        sel.origin && h('div', { className: 'grid grid-cols-2 gap-2' },
                          h('div', null,
                            h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-0.5' }, t('stem.anatomy.origin', 'Origin')),
                            h('p', { className: 'text-xs text-slate-600' }, sel.origin)
                          ),
                          h('div', null,
                            h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-0.5' }, t('stem.anatomy.insertion', 'Insertion')),
                            h('p', { className: 'text-xs text-slate-600' }, sel.insertion)
                          )
                        ),
                        // Clinical content is grade-gated: hidden for K-2; grades 3-5 see a softened
                        // "Staying Healthy" note (sel.clinicalKid) when authored, else nothing; grades
                        // 6-8 / 9-12 (and unknown/teacher band) see the full clinical text.
                        (gradeBand === 'k2' ? null :
                          gradeBand === 'g35' ? (sel.clinicalKid ? h('div', null,
                            h('p', { className: 'text-[11px] font-bold text-emerald-600 uppercase mb-0.5' }, t('stem.anatomy.staying_healthy', '\uD83D\uDC9A Staying Healthy'), ttsBtn(sel.clinicalKid)),
                            h('p', { className: 'text-xs text-slate-600 leading-relaxed bg-emerald-50 rounded-lg p-2' }, sel.clinicalKid)
                          ) : null) :
                          h('div', null,
                            h('p', { className: 'text-[11px] font-bold text-rose-500 uppercase mb-0.5' }, t('stem.anatomy.clinical_significance', '\u26A0 Clinical Significance'), ttsBtn(sel.clinical)),
                            h('p', { className: 'text-xs text-slate-600 leading-relaxed bg-rose-50 rounded-lg p-2' }, sel.clinical)
                          )),
                        sel.detail && h('div', null,
                          h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-0.5' }, t('stem.anatomy.detail', 'Detail')),
                          h('p', { className: 'text-xs text-slate-600 leading-relaxed' }, sel.detail)
                        ),
                        regionalAtlasOpen ? renderRegionalAtlas() : null,
                        confidenceControls(sel.id, sel.name),
                        // Brain Waves Section
                        sel.brainWaves && h('div', { className: 'mt-3 pt-3 border-t border-slate-200' },
                          h('p', { className: 'text-[11px] font-bold text-violet-600 uppercase mb-2' }, t('stem.anatomy.brain_wave_types_eeg', '\u26A1 Brain Wave Types (EEG)')),
                          h('div', { className: 'space-y-2' },
                            sel.brainWaves.map(function(w) {
                              return h('div', { key: w.type, className: 'rounded-lg p-2.5 border', style: { borderColor: w.color + '40', background: w.color + '08' } },
                                h('div', { className: 'flex items-center gap-2 mb-1' },
                                  h('span', { className: 'text-base' }, w.emoji),
                                  h('span', { className: 'text-xs font-black', style: { color: w.color } }, w.type),
                                  h('span', { className: 'ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full', style: { background: w.color + '18', color: w.color } }, w.freq)
                                ),
                                h('p', { className: 'text-[11px] font-bold text-slate-600 mb-0.5' }, 'State: ', h('span', { className: 'text-slate-700' }, w.state)),
                                h('p', { className: 'text-[11px] text-slate-600 leading-relaxed mb-1' }, w.characteristics),
                                h('p', { className: 'text-[11px] text-rose-600 italic leading-relaxed' }, '\u26A0 ', w.clinical)
                              );
                            })
                          )
                        ),
                        // Sleep Stages Section
                        sel.sleepStages && h('div', { className: 'mt-3 pt-3 border-t border-slate-200' },
                          h('p', { className: 'text-[11px] font-bold text-indigo-600 uppercase mb-2' }, t('stem.anatomy.sleep_architecture', '\uD83D\uDCA4 Sleep Architecture')),
                          h('div', { className: 'space-y-2' },
                            sel.sleepStages.map(function(s) {
                              return h('div', { key: s.stage, className: 'rounded-lg p-2.5 border border-indigo-100 bg-indigo-50/30' },
                                h('div', { className: 'flex items-center gap-2 mb-1' },
                                  h('span', { className: 'text-base' }, s.emoji),
                                  h('span', { className: 'text-xs font-black text-indigo-700' }, s.stage),
                                  h('span', { className: 'ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600' }, s.pct + ' of night')
                                ),
                                h('div', { className: 'flex gap-3 mb-1' },
                                  h('span', { className: 'text-[11px] text-slate-600' }, '\u23F1 ', h('span', { className: 'font-bold' }, s.duration)),
                                  h('span', { className: 'text-[11px] text-slate-600' }, '\uD83C\uDF0A ', h('span', { className: 'font-bold' }, s.waves))
                                ),
                                h('p', { className: 'text-[11px] text-slate-600 leading-relaxed mb-1' }, s.desc),
                                h('p', { className: 'text-[11px] text-rose-600 italic leading-relaxed' }, '\u26A0 ', s.clinical)
                              );
                            })
                          )
                        )
                      ),
                      // ── Compare Panel ──
                      compareSel && compareSel.id !== sel.id ? h('div', { className: 'mt-3 pt-3 border-t-2 border-violet-200' },
                        h('div', { className: 'flex items-center justify-between gap-2 mb-2 flex-wrap' },
                          h('p', { className: 'text-[11px] font-bold text-violet-600 uppercase' }, t('stem.anatomy.comparing_with', '\u2696 Comparing with:')),
                          h('div', { className: 'flex items-center gap-1.5' },
                            activeComparisonRecorded ? h('span', { role: 'status', className: 'text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5' }, '\u2713 Pair recorded') : h('button', {
                              onClick: function() { updMulti(comparisonTrackingPatch(sel.id, {}, sysKey)); setTimeout(checkAnatomyChallenges, 50); },
                              className: 'text-[11px] font-bold text-violet-700 bg-violet-50 border border-violet-200 rounded px-2 py-0.5 hover:bg-violet-100 active:scale-[0.97]'
                            }, 'Record pair'),
                            h('button', { 'aria-label': t('stem.anatomy.clear', 'Clear'),
                              onClick: function() { upd('_compareStructure', null); },
                              className: 'transition-colors text-[11px] font-bold text-slate-600 hover:text-slate-600 px-1 py-0.5 rounded hover:bg-slate-100 active:scale-[0.97]'
                            }, t('stem.anatomy.clear_2', '\u2715 Clear'))
                          )
                        ),
                        h('div', { className: 'bg-violet-50 rounded-lg p-3 border border-violet-200' },
                          h('h5', { className: 'text-sm font-black text-violet-800 mb-1' }, compareSel.name),
                          h('p', { className: 'text-[11px] text-slate-600 leading-relaxed mb-1' }, compareSel.fn.substring(0, 200) + (compareSel.fn.length > 200 ? '...' : '')),
                          compareSel.clinical ? h('p', { className: 'text-[11px] text-rose-600 italic leading-relaxed' }, '\u26A0 ' + compareSel.clinical.substring(0, 150) + (compareSel.clinical.length > 150 ? '...' : '')) : null
                        ),
                        h('table', { className: 'w-full mt-2 text-[11px]' },
                          h('caption', { className: 'sr-only' }, t('stem.anatomy.anatomy_data_table', 'anatomy data table')), h('thead', null,
                            h('tr', { className: 'border-b border-violet-200' },
                              h('th', { scope: 'col', className: 'text-left py-1 text-violet-600 font-bold' }, ''),
                              h('th', { scope: 'col', className: 'text-left py-1 font-bold', style: { color: sys.accent } }, sel.name),
                              h('th', { scope: 'col', className: 'text-left py-1 text-violet-700 font-bold' }, compareSel.name)
                            )
                          ),
                          h('tbody', null,
                            h('tr', { className: 'border-b border-slate-100' },
                              h('td', { className: 'py-1 font-bold text-slate-600' }, t('stem.anatomy.system', 'System')),
                              h('td', { className: 'py-1 text-slate-600' }, sys.name),
                              h('td', { className: 'py-1 text-slate-600' }, sys.name)
                            ),
                            h('tr', { className: 'border-b border-slate-100' },
                              h('td', { className: 'py-1 font-bold text-slate-600' }, t('stem.anatomy.view', 'View')),
                              h('td', { className: 'py-1 text-slate-600' }, sel.v === 'b' ? 'Both' : sel.v === 'a' ? 'Anterior' : 'Posterior'),
                              h('td', { className: 'py-1 text-slate-600' }, compareSel.v === 'b' ? 'Both' : compareSel.v === 'a' ? 'Anterior' : 'Posterior')
                            ),
                            sel.origin && compareSel.origin ? h('tr', { className: 'border-b border-slate-100' },
                              h('td', { className: 'py-1 font-bold text-slate-600' }, t('stem.anatomy.origin_2', 'Origin')),
                              h('td', { className: 'py-1 text-slate-600' }, sel.origin),
                              h('td', { className: 'py-1 text-slate-600' }, compareSel.origin)
                            ) : null,
                            sel.insertion && compareSel.insertion ? h('tr', null,
                              h('td', { className: 'py-1 font-bold text-slate-600' }, t('stem.anatomy.insertion_2', 'Insertion')),
                              h('td', { className: 'py-1 text-slate-600' }, sel.insertion),
                              h('td', { className: 'py-1 text-slate-600' }, compareSel.insertion)
                            ) : null
                          )
                        )
                      ) : null
                    )
                  ) : (
                    // Structure list
                    h('div', { className: 'anatomy-structure-panel', 'data-anatomy-structure-list': 'true' },
                      h('div', { className: 'flex items-start justify-between gap-3 mb-3' },
                        h('div', null,
                          h('h4', { className: 'text-sm font-black text-slate-900' }, t('stem.anatomy.structures_in_view', 'Structures in view')),
                          h('p', { className: 'text-[11px] text-slate-600 leading-relaxed', role: 'status', 'aria-live': 'polite' }, sys.name + ' - ' + view + ' - ' + studyFiltered.length + ' matching')
                        ),
                        h('span', { className: 'text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600' }, exploredInSystem + '/' + viewFiltered.length)
                      ),
                      h('div', { className: 'anatomy-study-filters', role: 'group', 'aria-label': 'Filter structures by study status' },
                        [{ id: 'all', label: 'All' }, { id: 'unseen', label: 'Unseen' }, { id: 'review', label: 'Review' }, { id: 'mastered', label: 'Got it' }].map(function(filterOption) {
                          var filterActive = studyFilter === filterOption.id;
                          return h('button', { key: filterOption.id, type: 'button', 'aria-pressed': filterActive,
                            onClick: function() { upd('_studyFilter', filterOption.id); },
                            className: 'px-2.5 py-1 text-[11px] font-bold border transition-all active:scale-[0.97] ' +
                              (filterActive ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100')
                          }, filterOption.label);
                        })
                      ),
                      h('div', { className: 'anatomy-structure-list space-y-1' },
                        studyFiltered.length === 0 && h('div', { className: 'rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center', role: 'status' },
                          h('p', { className: 'text-xs font-bold text-slate-700' }, searchTerm ? 'No structures match "' + searchValue + '".' : studyFilter !== 'all' ? 'No structures match this study filter.' : 'No structures are available in this view at the selected level.'),
                          h('p', { className: 'mt-1 text-[11px] text-slate-500' }, searchTerm ? 'Try a broader term or clear the search.' : studyFilter !== 'all' ? 'Choose All, or update confidence after reviewing a structure.' : 'Switch the body view or choose a more advanced level.'),
                          searchTerm ? h('button', {
                            onClick: function() { upd('search', ''); },
                            className: 'mt-3 px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-700 border border-slate-400 hover:bg-slate-100 active:scale-[0.97]'
                          }, 'Clear search') : studyFilter !== 'all' ? h('button', {
                            onClick: function() { upd('_studyFilter', 'all'); },
                            className: 'mt-3 px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-700 border border-slate-400 hover:bg-slate-100 active:scale-[0.97]'
                          }, 'Show all structures') : h('button', {
                            onClick: function() { upd('complexity', 3); },
                            className: 'mt-3 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.97]'
                          }, 'Show advanced structures')
                        ),
                        studyFiltered.map(function(st) {
                          return h('button', { key: st.id, 'aria-pressed': selectedStructureId === st.id,
                            onClick: function() { updMulti(selectionPatch(st.id)); announceStructure(st.id); playSound('structureClick'); },
                            className: 'w-full text-left px-3 py-2 text-xs transition-all hover:shadow-sm ' + (selectedStructureId === st.id ? 'font-bold border-2' : 'transition-colors bg-slate-50 hover:bg-white border border-slate-400 active:scale-[0.97]'),
                            style: selectedStructureId === st.id ? { borderColor: sys.accent, background: sys.color } : {}
                          },
                            h('div', { className: 'flex items-center justify-between gap-2' },
                              h('span', { className: 'font-bold text-slate-800' }, st.name),
                              structureConfidence[st.id] ? h('span', { className: 'text-[10px] font-bold text-slate-500' }, structureConfidence[st.id] === 'practice' ? 'Need practice' : structureConfidence[st.id] === 'learning' ? 'Learning' : 'Got it') : null
                            ),
                            h('div', { className: 'text-[11px] text-slate-600 mt-0.5 line-clamp-1' }, st.fn.substring(0, 80) + (st.fn.length > 80 ? '...' : ''))
                          );
                        })
                      )
                    )
                  )
                )
              ) : activeTab === 'aiTutor' ? (
                // AI Tutor Panel
                h('div', { className: 'bg-white rounded-xl border-2 border-violet-200 p-4 space-y-3' },
                  h('div', { className: 'flex items-center justify-between gap-2' },
                    h('h4', { className: 'font-bold text-violet-800 text-sm' }, t('stem.anatomy.ai_anatomy_tutor', '\uD83E\uDD16 AI Anatomy Tutor')),
                    aiMessages.length > 0 ? h('button', { 'aria-label': 'Clear AI tutor conversation',
                      onClick: function() { window.__alloAnatomyAiPending = null; updMulti({ _aiMessages: [], _aiLoading: false, _aiInput: '' }); },
                      className: 'px-2 py-1 rounded-lg text-[11px] font-bold text-slate-600 border border-slate-300 hover:bg-slate-100 active:scale-[0.97]'
                    }, 'Clear chat') : null
                  ),
                  h('p', { className: 'text-xs text-slate-600 mb-2' }, 'Currently studying: ' + sys.icon + ' ' + sys.name + (sel ? ' > ' + sel.name : '')),
                  aiInterrupted ? h('div', { role: 'status', className: 'rounded-lg bg-amber-50 border border-amber-200 p-2 text-[11px] text-amber-800' }, 'The previous AI request was interrupted. You can ask again.') : null,
                  h('div', { className: 'space-y-2 max-h-[340px] overflow-y-auto mb-3', role: 'log', 'aria-live': 'polite', 'aria-label': 'AI tutor conversation' },
                    aiMessages.length === 0 && h('p', { className: 'text-xs text-slate-600 italic text-center py-4' }, t('stem.anatomy.ask_a_question_about_anatomy_to_get_st', 'Ask a question about anatomy to get started!')),
                    aiMessages.map(function(msg, idx) {
                      return h('div', { key: idx, className: 'rounded-lg px-3 py-2 text-xs leading-relaxed ' + (msg.role === 'user' ? 'bg-violet-50 text-violet-800 ml-8' : 'bg-slate-50 text-slate-700 mr-8') },
                        h('span', { className: 'font-bold' }, msg.role === 'user' ? 'You: ' : 'AI: '),
                        msg.text,
                        msg.role === 'ai' ? ttsBtn(msg.text) : null
                      );
                    }),
                    aiLoading && h('div', { className: 'text-xs text-violet-500 italic text-center', role: 'status' }, 'Thinking...')
                  ),
                  h('div', { className: 'flex flex-wrap gap-1 mb-2' },
                    [
                      'What does the ' + sys.name + ' system do?',
                      sel ? 'Tell me about the ' + sel.name : 'What is the most important structure in this system?',
                      'What clinical conditions affect this system?'
                    ].map(function(q, qi) {
                      return h('button', { 'aria-label': t('stem.anatomy.ask_question', 'Ask question'),
                        key: qi,
                        onClick: function() { sendAiQuestion(q); }, disabled: aiLoading,
                        className: 'px-2 py-1 rounded-lg text-[11px] font-bold bg-violet-50 text-violet-600 hover:bg-violet-100 border border-violet-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]'
                      }, q);
                    })
                  ),
                  h('div', { className: 'flex gap-2' },
                    h('input', {
                      type: 'text', placeholder: t('stem.anatomy.ask_a_question', 'Ask a question...'),
                      'aria-label': t('stem.anatomy.ask_the_anatomy_ai_tutor_a_question', 'Ask the anatomy AI tutor a question'),
                      value: aiInput, maxLength: 500,
                      onChange: function(e) { upd('_aiInput', e.target.value); },
                      onKeyDown: function(e) { if (e.key === 'Enter') { e.preventDefault(); sendAiQuestion(aiInput); } },
                      className: 'flex-1 px-3 py-1.5 text-xs border border-violet-600 rounded-lg focus:ring-2 focus:ring-violet-300 outline-none'
                    }),
                    h('button', { 'aria-label': 'Ask',
                      onClick: function() { sendAiQuestion(aiInput); },
                      disabled: aiLoading || !aiInput.trim(),
                      className: 'px-3 py-1.5 rounded-lg text-xs font-bold bg-violet-600 text-white hover:bg-violet-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]'
                    }, aiLoading ? '…' : 'Ask')
                  )
                )
              ) : activeTab === 'tour' ? (
                // Guided Tour Panel
                h('div', { className: 'bg-white rounded-xl border-2 border-emerald-200 p-4 space-y-3' },
                  h('h4', { className: 'font-bold text-emerald-800 text-sm mb-2' }, '\uD83E\uDDED Guided Tour: ' + sys.icon + ' ' + sys.name),
                  tourSteps.length > 0 ? h('div', { className: 'space-y-3' },
                    h('div', { className: 'flex items-center justify-between mb-2' },
                      h('span', { className: 'text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700' }, 'Step ' + (tourStepIdx + 1) + ' of ' + tourSteps.length),
                      h('div', { className: 'flex-1 mx-3 h-1.5 rounded-full bg-emerald-100 overflow-hidden', role: 'progressbar', 'aria-label': 'Guided tour progress', 'aria-valuemin': 0, 'aria-valuemax': tourSteps.length, 'aria-valuenow': tourStepIdx + 1 },
                        h('div', { className: 'h-full rounded-full bg-emerald-500 transition-all', style: { width: (((tourStepIdx + 1) / tourSteps.length) * 100) + '%' } })
                      )
                    ),
                    currentTourStep ? h('div', { className: 'bg-emerald-50 rounded-lg p-4 border border-emerald-200', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' },
                      h('h5', { className: 'font-bold text-emerald-900 text-sm mb-2' }, currentTourStep.title),
                      h('div', { className: 'flex items-center gap-2 mb-2 flex-wrap' },
                        h('span', { className: 'text-[11px] font-bold px-2 py-0.5 rounded-full bg-white border border-emerald-200 text-slate-600' }, 'Diagram: ' + sys.name + ' - ' + (view === 'anterior' ? 'Anterior' : 'Posterior')),
                        !diagramMatchesTourStep ? h('button', {
                          onClick: function() { updMulti(structureFocusPatch(currentTourStep.structureId, { _tourStepIdx: tourStepIdx })); announceStructure(currentTourStep.structureId); },
                          className: 'px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-300 hover:bg-emerald-200 active:scale-[0.97]'
                        }, 'Focus diagram') : null
                      ),
                      h('p', { className: 'text-xs text-slate-700 leading-relaxed mb-2' }, currentTourStep.narration),
                      ttsBtn(currentTourStep.narration)
                    ) : null,
                    h('div', { className: 'flex gap-2 justify-between' },
                      h('button', { 'aria-label': t('stem.anatomy.previous', 'Previous'),
                        onClick: function() {
                          var prev = tourStepIdx - 1;
                          if (prev >= 0) { updMulti(structureFocusPatch(tourSteps[prev].structureId, { _tourStepIdx: prev })); announceStructure(tourSteps[prev].structureId); playSound('guidedStep'); }
                        },
                        disabled: tourStepIdx === 0,
                        className: 'px-4 py-1.5 rounded-lg text-xs font-bold transition-all ' + (tourStepIdx === 0 ? 'bg-slate-100 text-slate-400' : 'transition-colors bg-emerald-100 text-emerald-700 hover:bg-emerald-200 active:scale-[0.97]')
                      }, t('stem.anatomy.previous_2', '\u2190 Previous')),
                      tourStepIdx < tourSteps.length - 1 ? h('button', { 'aria-label': t('stem.anatomy.next_3', 'Next'),
                        onClick: function() {
                          var next = tourStepIdx + 1;
                          updMulti(structureFocusPatch(tourSteps[next].structureId, { _tourStepIdx: next })); announceStructure(tourSteps[next].structureId); playSound('guidedStep');
                        },
                        className: 'px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-700 transition-all active:scale-[0.97]'
                      }, t('stem.anatomy.next_4', 'Next \u2192')) : h('button', { 'aria-label': t('stem.anatomy.complete_tour', 'Complete Tour!'),
                        onClick: function() {
                          updMulti({ _tourCompleted: true, _tourActive: false, _activeTab: 'explore' });
                          playSound('badge');
                          if (typeof announceToSR === 'function') announceToSR('Guided anatomy tour complete. Returning to Explore.');
                          if (addToast) addToast('\uD83C\uDFC6 Guided tour complete!');
                        },
                        className: 'px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-700 text-white hover:bg-amber-600 transition-all active:scale-[0.97]'
                      }, t('stem.anatomy.complete_tour_2', '\uD83C\uDFC6 Complete Tour!'))
                    )
                  ) : h('p', { className: 'text-xs text-slate-600 italic' }, t('stem.anatomy.no_tour_available_for_this_system', 'No tour available for this system.'))
                )
              ) : activeTab === 'spotter' ? (
                // Spotter Panel
                h('div', { className: 'bg-white rounded-xl border-2 border-amber-200 p-4 space-y-3' },
                  h('div', { className: 'flex items-center justify-between mb-2' },
                    h('h4', { className: 'font-bold text-amber-800 text-sm' }, t('stem.anatomy.anatomy_spotter_test', '\uD83C\uDFAF Anatomy Spotter Test')),
                    h('div', { className: 'flex gap-2' },
                      h('span', { className: 'text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700' }, '\u2705 ' + spotterScore + '/' + spotterTotal),
                      spotterBestTime < 999 ? h('span', { className: 'text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700' }, '\u26A1 Best: ' + spotterBestTime.toFixed(1) + 's') : null
                    )
                  ),
                  h('p', { className: 'text-xs text-slate-600 mb-3' }, t('stem.anatomy.a_pin_is_placed_on_the_anatomical_figu', 'A pin is placed on the anatomical figure. Identify the structure as quickly as you can! Look for the pulsing crosshair on the canvas.')),
                  !spotterActive ? h('div', { className: 'text-center py-4' },
                    h('button', { 'aria-label': t('stem.anatomy.start_spotter_test', 'Start Spotter Test'),
                      onClick: function() { pickSpotterRound(true); },
                      className: 'px-6 py-2.5 rounded-xl text-sm font-bold bg-amber-700 text-white hover:bg-amber-600 transition-all shadow-sm active:scale-[0.97]'
                    }, t('stem.anatomy.start_spotter_test_2', '\uD83C\uDFAF Start Spotter Test')),
                    spotterTotal > 0 ? h('p', { className: 'text-[11px] text-slate-600 mt-2' }, 'Score: ' + spotterScore + ' correct out of ' + spotterTotal + ' attempts') : null
                  ) : h('div', { className: 'space-y-3' },
                    h('div', { className: 'bg-cyan-50 rounded-lg p-3 border border-cyan-200 text-center' },
                      h('p', { className: 'text-sm font-bold text-cyan-900 mb-1' }, t('stem.anatomy.what_structure_is_marked_on_the_figure', 'What structure is marked on the figure?')),
                      h('p', { className: 'text-[11px] text-cyan-700' }, (spotterCueText ? spotterCueText + ' ' : '') + 'Look for the pulsing cyan crosshair on the canvas.')
                    ),
                    !spotterRoundReady ? h('div', { className: 'bg-amber-50 border border-amber-300 rounded-lg p-2.5 text-[11px] text-amber-800', role: 'alert' },
                      h('p', { className: 'font-bold mb-0.5' }, 'This saved Spotter round is incomplete.'),
                      h('p', {}, 'Start a fresh round using structures visible in the current diagram.'),
                      h('button', { onClick: function() { pickSpotterRound(false); }, className: 'mt-2 px-3 py-1.5 rounded-lg bg-amber-700 text-white font-bold active:scale-[0.97]' }, 'Start a fresh round')
                    ) : null,
                    spotterRoundReady && !spotterTargetVisible ? h('div', { className: 'bg-amber-50 border border-amber-300 rounded-lg p-2.5 text-[11px] text-amber-800' },
                      h('p', { className: 'font-bold mb-0.5' }, '⚠ The marked structure is hidden by the current view or layer filters.'),
                      h('p', {}, 'Turn its system or layer back on to see the crosshair. The buttons below still work, or ',
                        h('button', { onClick: function() { pickSpotterRound(false); }, className: 'underline font-bold text-amber-900 active:scale-[0.97]' }, 'pick one in this view'),
                        '.'
                      )
                    ) : null,
                    h('div', { className: 'grid grid-cols-2 gap-2' },
                      (spotterRoundReady ? spotterOptions : []).map(function(opt) {
                        var isCorrect = opt.id === spotterTarget;
                        var showResult = spotterFeedback !== null;
                        var wasChosen = showResult && spotterFeedback === opt.id;
                        return h('button', { key: opt.id,
                          disabled: showResult,
                          onClick: function() {
                            var elapsed = Math.max(0, (Date.now() - spotterStartTime) / 1000);
                            var isRightAnswer = opt.id === spotterTarget;
                            var spotterUpdate = { _spotterFeedback: opt.id, _spotterElapsed: elapsed, _spotterTotal: spotterTotal + 1 };
                            if (isRightAnswer) {
                              spotterUpdate._spotterScore = spotterScore + 1;
                              if (elapsed < spotterBestTime) spotterUpdate._spotterBestTime = elapsed;
                            }
                            updMulti(spotterUpdate);
                            playSound(isRightAnswer ? 'spotterCorrect' : 'spotterWrong');
                            setTimeout(checkAnatomyChallenges, 50);
                          },
                          className: 'px-3 py-2.5 rounded-xl text-xs font-bold transition-all border-2 text-left ' +
                            (showResult && isCorrect ? 'border-green-400 bg-green-50 text-green-800' :
                              showResult && wasChosen && !isCorrect ? 'border-red-400 bg-red-50 text-red-700' :
                                'transition-colors border-slate-200 hover:border-amber-600 text-slate-700 hover:bg-amber-50 active:scale-[0.97]')
                        }, (showResult && isCorrect ? '\u2705 ' : showResult && wasChosen ? '\u274C ' : '') + opt.name);
                      })
                    ),
                    spotterFeedback && (function() {
                      var targetStruct = allStructures.find(function(s) { return s.id === spotterTarget; }) || {};
                      var selectedStruct = allStructures.find(function(s) { return s.id === spotterFeedback; }) || {};
                      var isRight = spotterFeedback === spotterTarget;

                      var vocabTerm = Object.keys(ANAT_VOCAB).find(function(k) {
                        return targetStruct.name && targetStruct.name.toLowerCase().indexOf(k.toLowerCase()) !== -1;
                      });

                      return h('div', { className: 'space-y-2', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' },
                        h('div', { className: 'rounded-lg p-3 text-xs leading-relaxed ' + (isRight ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200') },
                          h('p', { className: 'font-bold ' + (isRight ? 'text-green-800' : 'text-red-800') },
                            isRight ? '🎉 Correct! (' + spotterElapsed.toFixed(1) + 's)' : '🤔 Not quite! The correct structure is: ' + targetStruct.name
                          ),
                          h('p', { className: 'text-slate-600 mt-1' },
                            isRight
                              ? targetStruct.name + ' functions to: ' + targetStruct.fn
                              : 'You chose ' + selectedStruct.name + ', which functions to: ' + selectedStruct.fn + '. ' + targetStruct.name + ' functions to: ' + targetStruct.fn
                          )
                        ),

                        // Glossary card inside Spotter panel
                        vocabTerm && (function() {
                          var lookedUp = vocabLookedUp.indexOf(vocabTerm) !== -1;
                          return h('div', { className: 'p-3 rounded-lg border border-orange-200 bg-orange-50/50' },
                            h('div', { className: 'flex items-center justify-between' },
                              h('span', { className: 'text-xs font-bold text-orange-700' }, '🔍 Concept: ' + vocabTerm),
                              !lookedUp && h('button', {
                                onClick: function() {
                                  var newList = vocabLookedUp.slice();
                                  if (newList.indexOf(vocabTerm) === -1) {
                                    newList.push(vocabTerm);
                                    updMulti({ vocabLookedUp: newList, researchPoints: researchPoints + 5, totalRP: totalRP + 5 });
                                    playSound('spotterCorrect');
                                    setTimeout(checkAnatomyChallenges, 50);
                                  }
                                },
                                className: 'px-2 py-0.5 rounded bg-orange-100 hover:bg-orange-200 text-orange-700 text-[10px] font-bold transition-all active:scale-[0.97]'
                              }, t('stem.anatomy.study_term_5_rp', 'Study Term (+5 RP)'))
                            ),
                            lookedUp && h('div', { className: 'text-xs text-slate-600 mt-1' }, ANAT_VOCAB[vocabTerm])
                          );
                        })(),

                        h('button', { 'aria-label': t('stem.anatomy.next_structure', 'Next Structure'),
                          onClick: function() { pickSpotterRound(false); },
                          className: 'w-full py-2 rounded-lg text-xs font-bold bg-amber-700 text-white hover:bg-amber-600 transition-all active:scale-[0.97]'
                        }, t('stem.anatomy.next_structure_2', 'Next Structure ➔')),
                        h('button', { 'aria-label': t('stem.anatomy.end_test', 'End Test'),
                          onClick: function() { updMulti({ _spotterActive: false, _spotterTarget: null, _spotterFeedback: null, _spotterOpts: [], _spotterStartTime: 0, _spotterElapsed: 0 }); },
                          className: 'w-full py-1.5 rounded-lg text-[11px] font-bold text-slate-500 hover:bg-slate-100 transition-all active:scale-[0.97]'
                        }, t('stem.anatomy.end_test_2', 'End Test'))
                      );
                    })()
                  )
                )
              ) : activeTab === 'pathways' ? (
                // Pathways Panel
                h('div', { className: 'bg-white rounded-xl border-2 border-rose-200 p-4 space-y-3' },
                  h('div', { className: 'flex items-center justify-between mb-2' },
                    h('h4', { className: 'font-bold text-rose-800 text-sm' }, t('stem.anatomy.physiological_pathways', '\uD83D\uDEE4 Physiological Pathways')),
                    h('span', { className: 'text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-600' }, Object.keys(pathwaysCompleted).length + '/' + PATHWAYS.length + ' completed')
                  ),
                  h('p', { className: 'text-xs text-slate-600 mb-3' }, t('stem.anatomy.trace_step_by_step_how_blood_flows_air', 'Trace step-by-step how blood flows, air moves, food digests, or nerve signals travel through the body.')),
                  !activePathwayId ? h('div', { className: 'grid grid-cols-2 gap-2' },
                    PATHWAYS.map(function(pw) {
                      var isDone = pathwaysCompleted[pw.id];
                      return h('button', { key: pw.id,
                        onClick: function() { updMulti(structureFocusPatch(pw.steps[0].structure, { _activePathway: pw.id, _pathwayStep: 0 })); announceStructure(pw.steps[0].structure); playSound('pathwayStep'); },
                        className: 'text-left rounded-xl p-3 border-2 transition-all ' + (isDone ? 'border-rose-600 bg-rose-50' : 'transition-colors border-slate-200 hover:border-rose-200 hover:bg-rose-50/50 active:scale-[0.97]')
                      },
                        h('div', { className: 'flex items-center gap-2 mb-1' },
                          h('span', { className: 'text-lg' }, pw.icon),
                          h('span', { className: 'text-xs font-black', style: { color: pw.color } }, pw.title),
                          isDone ? h('span', { className: 'ml-auto text-[11px] text-emerald-500 font-bold' }, '\u2713') : null
                        ),
                        h('p', { className: 'text-[11px] text-slate-600 leading-relaxed' }, pw.desc)
                      );
                    })
                  ) : (function() {
                    var pw = null;
                    for (var pwi = 0; pwi < PATHWAYS.length; pwi++) { if (PATHWAYS[pwi].id === activePathwayId) { pw = PATHWAYS[pwi]; break; } }
                    if (!pw) return null;
                    var step = pw.steps[pathwayStepIdx];
                    var stepContext = step ? findStructureContext(step.structure, sysKey) : null;
                    var stepViewMatches = !stepContext || stepContext.structure.v === 'b' || (stepContext.structure.v === 'a' ? view === 'anterior' : view === 'posterior');
                    var diagramMatchesStep = !!stepContext && stepContext.systemId === sysKey && stepViewMatches;
                    return h('div', { className: 'space-y-3' },
                      h('div', { className: 'flex items-center gap-2 mb-2' },
                        h('span', { className: 'text-lg' }, pw.icon),
                        h('span', { className: 'text-sm font-black', style: { color: pw.color } }, pw.title),
                        h('button', { 'aria-label': t('stem.anatomy.back', 'Back'),
                          onClick: function() { updMulti({ _activePathway: null, _pathwayStep: 0 }); },
                          className: 'transition-colors ml-auto text-[11px] font-bold text-slate-600 hover:text-slate-600 px-2 py-1 rounded hover:bg-slate-100 active:scale-[0.97]'
                        }, t('stem.anatomy.back_2', '\u2190 Back'))
                      ),
                      h('div', { className: 'flex items-center justify-between mb-2' },
                        h('span', { className: 'text-xs font-bold px-2 py-0.5 rounded-full', style: { background: pw.color + '18', color: pw.color } }, 'Step ' + (pathwayStepIdx + 1) + ' of ' + pw.steps.length),
                        h('div', { className: 'flex-1 mx-3 h-1.5 rounded-full bg-slate-100 overflow-hidden', role: 'progressbar', 'aria-label': pw.title + ' pathway progress', 'aria-valuemin': 0, 'aria-valuemax': pw.steps.length, 'aria-valuenow': pathwayStepIdx + 1 },
                          h('div', { className: 'h-full rounded-full transition-all', style: { width: (((pathwayStepIdx + 1) / pw.steps.length) * 100) + '%', background: pw.color } })
                        )
                      ),
                      step ? h('div', { className: 'rounded-xl p-4 border-2', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', style: { borderColor: pw.color + '40', background: pw.color + '08' } },
                        h('h5', { className: 'font-bold text-sm mb-2', style: { color: pw.color } }, (pathwayStepIdx + 1) + '. ' + step.label),
                        h('div', { className: 'flex items-center gap-2 mb-2 flex-wrap' },
                          h('span', { className: 'text-[11px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600' }, 'Diagram: ' + sys.name + ' - ' + (view === 'anterior' ? 'Anterior' : 'Posterior')),
                          !diagramMatchesStep ? h('button', {
                            onClick: function() { updMulti(structureFocusPatch(step.structure, { _pathwayStep: pathwayStepIdx })); announceStructure(step.structure); },
                            className: 'px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-300 hover:bg-rose-200 active:scale-[0.97]'
                          }, 'Focus diagram') : null
                        ),
                        h('p', { className: 'text-xs text-slate-700 leading-relaxed mb-2' }, step.detail),
                        ttsBtn(step.detail)
                      ) : null,
                      h('div', { className: 'flex gap-2 justify-between' },
                        h('button', { 'aria-label': t('stem.anatomy.previous_3', 'Previous'),
                          onClick: function() {
                            if (pathwayStepIdx > 0) {
                              var prev = pathwayStepIdx - 1;
                              updMulti(structureFocusPatch(pw.steps[prev].structure, { _pathwayStep: prev })); announceStructure(pw.steps[prev].structure); playSound('pathwayStep');
                            }
                          },
                          disabled: pathwayStepIdx === 0,
                          className: 'px-4 py-1.5 rounded-lg text-xs font-bold transition-all ' + (pathwayStepIdx === 0 ? 'bg-slate-100 text-slate-400' : 'transition-colors bg-rose-100 text-rose-700 hover:bg-rose-200 active:scale-[0.97]')
                        }, t('stem.anatomy.previous_4', '\u2190 Previous')),
                        pathwayStepIdx < pw.steps.length - 1 ? h('button', { 'aria-label': t('stem.anatomy.next_5', 'Next'),
                          onClick: function() {
                            var next = pathwayStepIdx + 1;
                            updMulti(structureFocusPatch(pw.steps[next].structure, { _pathwayStep: next })); announceStructure(pw.steps[next].structure); playSound('pathwayStep');
                          },
                          className: 'px-4 py-1.5 rounded-lg text-xs font-bold text-white hover:opacity-90 transition-all',
                          style: { background: pw.color }
                        }, t('stem.anatomy.next_6', 'Next \u2192')) : h('button', { 'aria-label': t('stem.anatomy.complete_pathway', 'Complete Pathway!'),
                          onClick: function() {
                            var newPC = Object.assign({}, pathwaysCompleted);
                            newPC[pw.id] = true;
                            updMulti({ _pathwaysCompleted: newPC, _activePathway: null, _pathwayStep: 0 });
                            playSound('badge');
                            if (addToast) addToast('\uD83D\uDEE4 Pathway complete: ' + pw.title + '!');
                            if (typeof announceToSR === 'function') announceToSR('Pathway complete: ' + pw.title + '.');
                            setTimeout(checkAnatomyChallenges, 50);
                          },
                          className: 'px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-600 transition-all active:scale-[0.97]'
                        }, t('stem.anatomy.complete_pathway_2', '\uD83C\uDFC6 Complete Pathway!'))
                      )
                    );
                  })()
                )
              ) : activeTab === 'connections' ? (
                // Connections Panel
                h('div', { className: 'bg-white rounded-xl border-2 border-sky-200 p-4 space-y-3' },
                  h('div', { className: 'flex items-center justify-between mb-2' },
                    h('h4', { className: 'font-bold text-sky-800 text-sm' }, t('stem.anatomy.how_body_systems_connect', '\uD83D\uDD17 How Body Systems Connect')),
                    h('span', { className: 'text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-600' }, Object.keys(connectionsViewed).length + '/' + CONNECTIONS.length + ' explored')
                  ),
                  h('div', { className: 'space-y-2 max-h-[500px] overflow-y-auto' },
                    CONNECTIONS.map(function(conn) {
                      var isViewed = connectionsViewed[conn.id];
                      var isExpanded = expandedConnectionId === conn.id;
                      var detailsId = 'anatomy-connection-' + conn.id;
                      return h('div', {
                        key: conn.id,
                        className: 'w-full rounded-xl border-2 overflow-hidden transition-all ' + (isViewed ? 'border-sky-600 bg-sky-50' : 'border-slate-200 bg-white hover:border-sky-200')
                      },
                        h('button', {
                          'aria-label': (isExpanded ? 'Collapse ' : 'Expand ') + conn.title,
                          'aria-expanded': isExpanded,
                          'aria-controls': detailsId,
                          onClick: function() {
                            playSound('connectionView');
                            var connectionPatch = { _expandedConn: isExpanded ? null : conn.id };
                            if (!connectionsViewed[conn.id]) {
                              var newCV = Object.assign({}, connectionsViewed);
                              newCV[conn.id] = true;
                              connectionPatch._connectionsViewed = newCV;
                            }
                            updMulti(connectionPatch);
                          },
                          className: 'w-full text-left px-3 pt-3 pb-2 transition-colors hover:bg-sky-50 active:bg-sky-100'
                        },
                          h('span', { className: 'flex items-center gap-2' },
                            h('span', { className: 'text-base', 'aria-hidden': 'true' }, conn.icon),
                            h('span', { className: 'text-xs font-black text-sky-800' }, conn.title),
                            h('span', { className: 'ml-auto text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600', 'aria-hidden': 'true' },
                              SYSTEMS[conn.systems[0]].icon + ' + ' + SYSTEMS[conn.systems[1]].icon
                            ),
                            isViewed ? h('span', { className: 'text-[11px] text-emerald-600 font-bold', 'aria-label': 'Explored' }, '\u2713') : null,
                            h('span', { className: 'text-sky-600 text-xs', 'aria-hidden': 'true' }, isExpanded ? '\u25B2' : '\u25BC')
                          )
                        ),
                        h('p', { className: 'px-3 pb-3 text-[11px] text-slate-600 leading-relaxed' }, conn.desc),
                        isExpanded ? h('div', {
                          id: detailsId,
                          role: 'region',
                          'aria-label': conn.title + ' details',
                          className: 'mx-3 mb-3 pt-3 border-t border-sky-200 space-y-2'
                        },
                          h('p', { className: 'text-[11px] text-sky-700 italic leading-relaxed' }, '\uD83D\uDCA1 Example: ' + conn.example),
                          h('div', { className: 'flex flex-wrap gap-2', role: 'group', 'aria-label': 'Connected system diagrams' },
                            conn.systems.map(function(connectionSystemId) {
                              var connectionSystem = SYSTEMS[connectionSystemId];
                              if (!connectionSystem) return null;
                              return h('button', {
                                key: connectionSystemId,
                                'aria-label': 'Show ' + connectionSystem.name + ' diagram for ' + conn.title,
                                'aria-pressed': sysKey === connectionSystemId,
                                onClick: function() { showAnatomySystem(connectionSystemId, conn.title); },
                                className: 'px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all active:scale-[0.97] ' + (sysKey === connectionSystemId ? 'bg-sky-700 text-white border-sky-700' : 'bg-white text-sky-700 border-sky-300 hover:bg-sky-100')
                              }, connectionSystem.icon + ' View ' + connectionSystem.name)
                            })
                          )
                        ) : null
                      );
                    })
                  )
                )
              ) : activeTab === 'flashcards' ? (
                // Flashcards Panel
                h('div', { className: 'bg-white rounded-xl border-2 border-teal-200 p-4 space-y-3' },
                  h('div', { className: 'flex items-center justify-between mb-2' },
                    h('h4', { className: 'font-bold text-teal-800 text-sm' }, t('stem.anatomy.anatomy_flashcards', '\uD83C\uDCCF Anatomy Flashcards')),
                    h('span', { className: 'text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700', 'aria-label': 'Flashcard progress' }, flashcardPool.length > 0 ? (flashcardIdx + 1) + '/' + flashcardPool.length : '0/0')
                  ),
                  h('p', { className: 'text-xs text-slate-600 mb-2' }, 'Recall the function, then use Reveal function to check your answer. Study ' + sys.name + ' structures.'),
                  flashcardPool.length > 0 ? h('div', { className: 'space-y-3' },
                    h('div', { role: 'group', 'aria-label': 'Flashcard ' + (flashcardIdx + 1) + ' of ' + flashcardPool.length + ': ' + flashcardPool[flashcardIdx].name,
                      className: 'w-full min-h-[180px] rounded-xl p-5 border-2 transition-all text-left ' +
                        (flashcardFlipped ? 'border-teal-400 bg-teal-50' : 'border-slate-300 bg-gradient-to-br from-white to-slate-50')
                    },
                      h('div', { id: 'anatomy-flashcard-content', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' },
                        !flashcardFlipped ? h('div', null,
                          h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-3' }, t('stem.anatomy.structure_name', 'STRUCTURE NAME')),
                          h('h3', { className: 'text-xl font-black text-slate-800 mb-2 tracking-tight' }, flashcardPool[flashcardIdx % flashcardPool.length].name),
                          PRONUNCIATION[flashcardPool[flashcardIdx % flashcardPool.length].id] ? h('p', { className: 'text-xs text-indigo-500 italic' }, '\uD83D\uDD0A ' + PRONUNCIATION[flashcardPool[flashcardIdx % flashcardPool.length].id]) : null,
                          h('p', { className: 'text-[11px] text-slate-600 mt-4' }, 'Answer hidden')
                        ) : h('div', null,
                          h('p', { className: 'text-[11px] font-bold text-teal-600 uppercase mb-2' }, 'FUNCTION'),
                          h('p', { className: 'text-xs text-slate-700 leading-relaxed mb-2' }, flashcardPool[flashcardIdx % flashcardPool.length].fn),
                          flashcardPool[flashcardIdx % flashcardPool.length].clinical ? h('div', { className: 'mt-2 pt-2 border-t border-teal-200' },
                            h('p', { className: 'text-[11px] font-bold text-rose-500 uppercase mb-0.5' }, t('stem.anatomy.clinical_2', '\u26A0 Clinical')),
                            h('p', { className: 'text-[11px] text-slate-600 leading-relaxed' }, flashcardPool[flashcardIdx % flashcardPool.length].clinical.substring(0, 200))
                          ) : null
                        )
                      ),
                      h('div', { className: 'mt-4 pt-3 border-t border-slate-200 flex items-center justify-between gap-2 flex-wrap' },
                        flashcardFlipped ? ttsBtn(flashcardPool[flashcardIdx % flashcardPool.length].fn) : h('span', { className: 'text-[11px] text-slate-500' }, 'Say the function before revealing it.'),
                        h('button', {
                          'aria-expanded': flashcardFlipped,
                          'aria-controls': 'anatomy-flashcard-content',
                          onClick: function() { upd('_flashcardFlipped', !flashcardFlipped); },
                          className: 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-[0.97] ' + (flashcardFlipped ? 'bg-white text-teal-700 border border-teal-400 hover:bg-teal-50' : 'bg-teal-700 text-white hover:bg-teal-800')
                        }, flashcardFlipped ? 'Show structure name' : 'Reveal function')
                      )
                    ),
                    flashcardFlipped ? confidenceControls(flashcardPool[flashcardIdx % flashcardPool.length].id, flashcardPool[flashcardIdx % flashcardPool.length].name) : null,
                    h('div', { className: 'flex gap-2 justify-between', role: 'toolbar', 'aria-label': 'Flashcard navigation' },
                      h('button', { 'aria-label': t('stem.anatomy.previous_5', 'Previous'),
                        onClick: function() { var pi = flashcardIdx > 0 ? flashcardIdx - 1 : flashcardPool.length - 1; updMulti(structureFocusPatch(flashcardPool[pi].id, { _flashcardIdx: pi, _flashcardFlipped: false })); announceStructure(flashcardPool[pi].id); playSound('guidedStep'); },
                        className: 'px-4 py-1.5 rounded-lg text-xs font-bold bg-teal-100 text-teal-700 hover:bg-teal-200 transition-all active:scale-[0.97]'
                      }, t('stem.anatomy.previous_6', '\u2190 Previous')),
                      h('button', { 'aria-label': t('stem.anatomy.random', 'Random'),
                        onClick: function() {
                          var randomOffset = flashcardPool.length > 1 ? 1 + Math.floor(Math.random() * (flashcardPool.length - 1)) : 0;
                          var randIdx = (flashcardIdx + randomOffset) % flashcardPool.length;
                          updMulti(structureFocusPatch(flashcardPool[randIdx].id, { _flashcardIdx: randIdx, _flashcardFlipped: false })); announceStructure(flashcardPool[randIdx].id); playSound('guidedStep');
                        },
                        className: 'px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all active:scale-[0.97]'
                      }, t('stem.anatomy.random_2', '\uD83C\uDFB2 Random')),
                      h('button', { 'aria-label': t('stem.anatomy.next_7', 'Next'),
                        onClick: function() { var ni = (flashcardIdx + 1) % flashcardPool.length; updMulti(structureFocusPatch(flashcardPool[ni].id, { _flashcardIdx: ni, _flashcardFlipped: false })); announceStructure(flashcardPool[ni].id); playSound('guidedStep'); },
                        className: 'px-4 py-1.5 rounded-lg text-xs font-bold bg-teal-700 text-white hover:bg-teal-700 transition-all active:scale-[0.97]'
                      }, t('stem.anatomy.next_8', 'Next \u2192'))
                    )
                  ) : h('p', { className: 'text-xs text-slate-600 italic' }, t('stem.anatomy.no_flashcards_available_for_this_compl', 'No flashcards available for this complexity level.'))
                )
              ) : activeTab === 'procedure' ? (function() {
                var procedure = normalizeAnatomyProcedureState(d.procedure);
                var procedureSteps = ['Scan plan', 'Safety prep', 'Access tissue', 'Control field', 'Collect specimen', 'Microscopy', 'Debrief'];
                var procedureTools = [
                  { id: 'scalpel', label: 'Scalpel', use: 'Controlled access through layers' },
                  { id: 'retractor', label: 'Retractor', use: 'Increase field exposure' },
                  { id: 'suction', label: 'Suction', use: 'Reduce simulated fluid' },
                  { id: 'cautery', label: 'Cautery', use: 'Control bleeding with thermal cost' },
                  { id: 'forceps', label: 'Forceps', use: 'Collect the exposed target' }
                ];
                function setProcedure(patch) { upd('procedure', Object.assign({}, procedure, patch)); }
                function logProcedure(patch, label) {
                  var entry = { id: 'proc-' + Date.now() + '-' + procedure.actions, label: label, tool: procedure.tool, depth: Math.round(patch.incisionDepth == null ? procedure.incisionDepth : patch.incisionDepth), at: Date.now() };
                  setProcedure(Object.assign({}, patch, { actions: procedure.actions + 1, actionLog: procedure.actionLog.concat([entry]).slice(-14) }));
                }
                function lockProcedurePlan() {
                  var distance = Math.abs(procedure.planSlice - 58);
                  var feedback = distance <= 6 ? 'Target slice locked. The synthetic target is well centered for the planned approach.' : 'Plan locked, but the target is near the edge of this slice. You can continue and review the planning score later.';
                  setProcedure({ planLocked: true, stage: 1, feedback: feedback, actionLog: procedure.actionLog.concat([{ id: 'plan-' + Date.now(), label: 'Locked synthetic CT plan at slice ' + Math.round(procedure.planSlice), tool: 'imaging', depth: 0, at: Date.now() }]).slice(-14) });
                  if (typeof announceToSR === 'function') announceToSR(feedback);
                }
                function beginProcedureAccess() {
                  if (!procedure.timeoutConfirmed || !procedure.sterilePrep || !procedure.eyeProtection) {
                    setProcedure({ feedback: 'Complete all three preparation checks before beginning the simulation.' });
                    if (typeof announceToSR === 'function') announceToSR('Complete all preparation checks first.');
                    return;
                  }
                  setProcedure({ stage: 2, tool: 'scalpel', feedback: 'Preparation complete. Use moderate pressure and a controlled angle to advance through the layered model.' });
                }
                function completeProcedureStroke(points, inputType) {
                  var next = applyAnatomyProcedureStroke(procedure, { id: String(Date.now()), tool: procedure.tool, input: inputType || 'mouse', points: points, endedAt: Date.now() });
                  upd('procedure', next);
                  if (typeof announceToSR === 'function') announceToSR(next.feedback);
                  if (next.specimenCollected && !procedure.specimenCollected && typeof addToast === 'function') addToast('Synthetic specimen preserved', 'success');
                }
                function procedureCanvasPoint(event, canvas) {
                  var rect = canvas.getBoundingClientRect();
                  var pointerPressure = Number(event.pressure);
                  if (!Number.isFinite(pointerPressure) || pointerPressure <= 0) pointerPressure = procedure.pressure / 10;
                  return { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)), pressure: Math.max(0.05, Math.min(1, pointerPressure)), time: Date.now() };
                }
                function redrawProcedureGesture(canvas, points) {
                  var context = canvas && canvas.getContext && canvas.getContext('2d');
                  if (context) drawAnatomyProcedureField(context, canvas.width, canvas.height, Object.assign({}, procedure, { activeStroke: points }));
                }
                function beginProcedureGesture(event) {
                  if (!canApplyTool) return;
                  event.preventDefault();
                  var canvas = event.currentTarget;
                  try { canvas.setPointerCapture(event.pointerId); } catch (e) {}
                  canvas._procedurePointerId = event.pointerId;
                  canvas._procedureStroke = [procedureCanvasPoint(event, canvas)];
                  redrawProcedureGesture(canvas, canvas._procedureStroke);
                }
                function moveProcedureGesture(event) {
                  var canvas = event.currentTarget;
                  if (!canvas._procedureStroke || canvas._procedurePointerId !== event.pointerId) return;
                  event.preventDefault();
                  var point = procedureCanvasPoint(event, canvas);
                  var prior = canvas._procedureStroke[canvas._procedureStroke.length - 1];
                  if (!prior || Math.hypot(point.x - prior.x, point.y - prior.y) > 0.006 || point.time - prior.time > 40) canvas._procedureStroke.push(point);
                  if (canvas._procedureStroke.length > 96) canvas._procedureStroke = canvas._procedureStroke.slice(-96);
                  redrawProcedureGesture(canvas, canvas._procedureStroke);
                }
                function endProcedureGesture(event) {
                  var canvas = event.currentTarget;
                  if (!canvas._procedureStroke || canvas._procedurePointerId !== event.pointerId) return;
                  event.preventDefault();
                  var points = canvas._procedureStroke.concat([procedureCanvasPoint(event, canvas)]).slice(-96);
                  canvas._procedureStroke = null; canvas._procedurePointerId = null;
                  try { canvas.releasePointerCapture(event.pointerId); } catch (e) {}
                  completeProcedureStroke(points, ['mouse', 'pen', 'touch'].indexOf(event.pointerType) >= 0 ? event.pointerType : 'mouse');
                }
                function cancelProcedureGesture(event) {
                  var canvas = event.currentTarget;
                  canvas._procedureStroke = null; canvas._procedurePointerId = null;
                  redrawProcedureGesture(canvas, []);
                }
                function applyProcedureInstrument() {
                  if (!canApplyTool) return;
                  var now = Date.now(), pressure = procedure.pressure / 10;
                  var currentY = 0.114 + Math.max(0, Math.min(100, procedure.incisionDepth)) / 100 * 0.795;
                  var points;
                  if (procedure.tool === 'scalpel') {
                    var nextDepth = Math.min(76, procedure.incisionDepth + 9 + procedure.pressure * 1.2);
                    var nextY = 0.114 + nextDepth / 100 * 0.795;
                    points = [{ x: 0.5, y: Math.max(0.114, currentY - 0.08), pressure: pressure, time: now }, { x: 0.5, y: nextY, pressure: pressure, time: now + 520 }];
                  } else if (procedure.tool === 'retractor') points = [{ x: 0.46, y: Math.max(0.2, currentY - 0.04), pressure: pressure, time: now }, { x: 0.72, y: Math.max(0.2, currentY - 0.04), pressure: pressure, time: now + 600 }];
                  else if (procedure.tool === 'suction') points = [{ x: 0.42, y: currentY, pressure: pressure, time: now }, { x: 0.62, y: currentY, pressure: pressure, time: now + 650 }];
                  else if (procedure.tool === 'cautery') points = [{ x: 0.44, y: currentY, pressure: pressure, time: now }, { x: 0.6, y: currentY, pressure: pressure, time: now + 720 }];
                  else points = [{ x: 0.5, y: 0.68, pressure: pressure, time: now }, { x: 0.57, y: 0.78, pressure: pressure, time: now + 560 }];
                  completeProcedureStroke(points, 'keyboard');
                }
                function handleProcedureCanvasKey(event) {
                  if (!canApplyTool) return;
                  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); applyProcedureInstrument(); }
                  else if (event.key === 'ArrowUp') { event.preventDefault(); setProcedure({ pressure: Math.min(10, procedure.pressure + 1), feedback: 'Pressure increased to ' + Math.min(10, procedure.pressure + 1) + '.' }); }
                  else if (event.key === 'ArrowDown') { event.preventDefault(); setProcedure({ pressure: Math.max(1, procedure.pressure - 1), feedback: 'Pressure decreased to ' + Math.max(1, procedure.pressure - 1) + '.' }); }
                }
                function undoProcedureGesture() {
                  upd('procedure', undoAnatomyProcedureStroke(procedure));
                  if (typeof announceToSR === 'function') announceToSR('Last direct gesture undone.');
                }                function startProcedureMicroscopy() {
                  if (!procedure.specimenCollected) return;
                  var specimen = { id: procedure.specimenId || ('synthetic-specimen-' + Date.now()), source: 'anatomy-procedure', caseId: 'synthetic-thoracic-target', targetName: 'Synthetic thoracic tissue target', sampleIntegrity: Math.round(procedure.sampleIntegrity), planSlice: Math.round(procedure.planSlice), collectedAt: Date.now() };
                  setLabToolData(function(prev) {
                    var next = Object.assign({}, prev || {});
                    var anatomyState = Object.assign({}, next.anatomy || {});
                    anatomyState.procedure = Object.assign({}, normalizeAnatomyProcedureState(anatomyState.procedure), procedure, { stage: 5, microscopyStarted: true, specimenId: specimen.id, feedback: 'Specimen transferred to the Microdissection Studio.' });
                    next.anatomy = anatomyState;
                    next.cell = Object.assign({}, next.cell || {}, { mode: 'microdissection', _cellPicked: true, _cellCategory: 'interactive', microCellType: 'animal', microStage: 0, microTool: 'objective', microStain: 'none', microTarget: null, procedureSpecimen: specimen, _scaleJourneySource: 'anatomy-procedure' });
                    return next;
                  });
                  if (typeof setStemLabTab === 'function') setStemLabTab('explore');
                  if (typeof setStemLabTool === 'function') setStemLabTool('cell');
                  if (typeof announceToSR === 'function') announceToSR('Specimen transferred. Opening Cell Microdissection.');
                }
                function resetProcedure() {
                  upd('procedure', normalizeAnatomyProcedureState({}));
                  if (typeof announceToSR === 'function') announceToSR('Procedure scenario reset.');
                }
                var procedureScore = evaluateAnatomyProcedure(procedure);
                var prepared = procedure.timeoutConfirmed && procedure.sterilePrep && procedure.eyeProtection;
                var canApplyTool = procedure.stage >= 2 && procedure.stage <= 4;
                var lastProcedureStroke = procedure.strokes.length ? procedure.strokes[procedure.strokes.length - 1] : null;
                var lastProcedureMetrics = lastProcedureStroke && lastProcedureStroke.metrics ? lastProcedureStroke.metrics : null;
                return h('section', { className: 'rounded-2xl border-2 border-rose-200 bg-white p-4 shadow-sm', 'data-anatomy-procedure-workspace': 'true', 'aria-labelledby': 'anatomy-procedure-title' },
                  h('div', { className: 'flex flex-wrap items-start justify-between gap-3' },
                    h('div', null, h('div', { className: 'text-[11px] font-black uppercase tracking-wider text-rose-800' }, 'Integrated evidence journey'), h('h4', { id: 'anatomy-procedure-title', className: 'text-xl font-black text-slate-900' }, 'Scan-to-cell Procedure Studio'), h('p', { className: 'mt-1 max-w-3xl text-sm leading-relaxed text-slate-600' }, 'Use a synthetic scan to plan an approach, manage a layered tissue model, preserve a specimen, and complete the investigation at cell scale.')),
                    h('span', { className: 'rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-black text-amber-900' }, 'Educational simulation')
                  ),
                  h('div', { className: 'mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950', role: 'note' }, h('strong', null, 'Synthetic practice only: '), 'This simplified interaction does not teach or authorize a real procedure. It omits critical anatomy, team roles, sterile technique, consent, monitoring, and complication management. Never use it for patient care.'),
                  h('ol', { className: 'mt-3 grid gap-2 sm:grid-cols-4 xl:grid-cols-7', 'aria-label': 'Integrated procedure progress' }, procedureSteps.map(function(label, index) { var done = procedure.stage > index, active = procedure.stage === index; return h('li', { key: label, className: 'rounded-lg border px-2 py-2 text-center text-[11px] font-bold', style: { borderColor: done || active ? '#be123c' : '#cbd5e1', background: done ? '#ffe4e6' : active ? '#fff1f2' : '#fff', color: done || active ? '#9f1239' : '#64748b' }, 'aria-current': active ? 'step' : undefined }, (done ? '\u2713 ' : (index + 1) + '. ') + label); })),
                  procedure.stage === 0 ? h('div', { className: 'mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.7fr)]' },
                    h('div', null, h('div', { className: 'overflow-hidden rounded-xl border-2 border-slate-700 bg-slate-950' }, h('canvas', { width: 640, height: 480, role: 'img', 'data-procedure-planning-scan': 'true', 'aria-label': 'Synthetic axial chest CT planning slice ' + Math.round(procedure.planSlice) + ' with a teaching target near slice 58.', style: { display: 'block', width: '100%', height: 'auto' }, ref: function(canvas) { if (!canvas) return; var context = canvas.getContext && canvas.getContext('2d'); if (context) drawAnatomyImagingSlice(context, canvas.width, canvas.height, { modality: 'CT', region: 'chest', plane: 'axial', slice: procedure.planSlice, windowWidth: 400, windowLevel: 40, showLabels: true, showCrosshair: true, annotations: [{ type: 'pin', x: 0.57, y: 0.58, note: 'Synthetic target' }] }); } })), h('label', { className: 'mt-2 block text-xs font-black text-slate-700', htmlFor: 'procedure-plan-slice' }, 'Planning slice ' + Math.round(procedure.planSlice) + ' / 100'), h('input', { id: 'procedure-plan-slice', type: 'range', min: 0, max: 100, step: 1, value: procedure.planSlice, onChange: function(event) { setProcedure({ planSlice: Number(event.target.value) }); }, className: 'mt-1 w-full accent-rose-700' })),
                    h('aside', { className: 'rounded-xl border border-rose-200 bg-rose-50/60 p-4' }, h('h5', { className: 'text-sm font-black text-rose-950' }, 'Case: synthetic thoracic target'), h('p', { className: 'mt-2 text-xs leading-relaxed text-rose-900' }, 'Find the teaching target centered near slice 58. Choose a slice that shows it clearly, then lock the plan.'), h('ul', { className: 'mt-3 space-y-1 text-xs text-slate-700' }, h('li', null, '\u2022 Confirm chest / axial orientation'), h('li', null, '\u2022 Center the target rather than its edge'), h('li', null, '\u2022 Preserve your selected slice as evidence')), h('button', { type: 'button', onClick: lockProcedurePlan, className: 'mt-4 w-full rounded-xl bg-rose-800 px-4 py-3 text-sm font-black text-white hover:bg-rose-900' }, 'Lock scan plan'))
                  ) : h('div', { className: 'mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]' },
                    h('div', null,
                      h('div', { className: 'grid grid-cols-2 gap-2 sm:grid-cols-4 mb-3' }, [['Depth', Math.round(procedure.incisionDepth) + '%'], ['Exposure', Math.round(procedure.exposure) + '%'], ['Bleeding', Math.round(procedure.bleeding) + '%'], ['Integrity', Math.round(procedure.sampleIntegrity) + '%']].map(function(metric) { return h('div', { key: metric[0], className: 'rounded-lg border border-slate-200 bg-slate-50 p-2 text-center' }, h('div', { className: 'text-[10px] font-bold uppercase text-slate-500' }, metric[0]), h('div', { className: 'text-lg font-black text-slate-900' }, metric[1])); })),
                      h('div', { className: 'overflow-hidden rounded-xl border-2 border-slate-700 bg-slate-950' }, h('canvas', { key: [procedure.stage, procedure.tool, procedure.incisionDepth, procedure.exposure, procedure.bleeding, procedure.tissueDamage, procedure.specimenCollected, procedure.strokes.length, procedure.showReplay, procedure.reducedVisuals].join('-'), width: 760, height: 440, role: 'img', tabIndex: 0, 'aria-describedby': 'procedure-gesture-help', 'aria-keyshortcuts': 'Enter Space ArrowUp ArrowDown', 'data-anatomy-procedure-canvas': 'true', 'aria-label': 'Synthetic layered tissue model. Incision depth ' + Math.round(procedure.incisionDepth) + ' percent, exposure ' + Math.round(procedure.exposure) + ' percent, bleeding ' + Math.round(procedure.bleeding) + ' percent. Active tool: ' + procedure.tool + '.', onPointerDown: beginProcedureGesture, onPointerMove: moveProcedureGesture, onPointerUp: endProcedureGesture, onPointerCancel: cancelProcedureGesture, onLostPointerCapture: cancelProcedureGesture, onKeyDown: handleProcedureCanvasKey, onContextMenu: function(event) { event.preventDefault(); }, style: { display: 'block', width: '100%', height: 'auto', touchAction: 'none', cursor: canApplyTool ? 'crosshair' : 'default' }, ref: function(canvas) { if (!canvas) return; var context = canvas.getContext && canvas.getContext('2d'); if (context) drawAnatomyProcedureField(context, canvas.width, canvas.height, procedure); } })),
                      h('div', { id: 'procedure-gesture-help', className: 'mt-2 rounded-lg border border-cyan-200 bg-cyan-50 p-2 text-[11px] leading-relaxed text-cyan-950' }, h('strong', null, 'Direct control: '), 'Drag on the tissue field with a mouse, pen, or touch. Pen pressure is used when available. Keyboard: focus the field and press Enter or Space to perform the selected tool; use Up and Down arrows to adjust pressure.'),
                      h('div', { className: 'mt-3 flex flex-wrap gap-2', role: 'group', 'aria-label': 'Procedure instruments' }, procedureTools.map(function(item) { var selected = procedure.tool === item.id; return h('button', { key: item.id, type: 'button', disabled: !canApplyTool, 'aria-pressed': selected, onClick: function() { setProcedure({ tool: item.id, feedback: item.label + ': ' + item.use + '.' }); }, className: 'rounded-lg border px-3 py-2 text-left text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50 ' + (selected ? 'border-rose-800 bg-rose-800 text-white' : 'border-rose-200 bg-white text-slate-700 hover:bg-rose-50') }, item.label, h('span', { className: 'block text-[10px] font-normal opacity-80' }, item.use)); })),
                      h('div', { className: 'mt-3 grid gap-3 sm:grid-cols-2' }, h('label', { className: 'text-xs font-bold text-slate-700', htmlFor: 'procedure-pressure' }, 'Pressure ' + Math.round(procedure.pressure) + ' / 10', h('input', { id: 'procedure-pressure', type: 'range', min: 1, max: 10, step: 1, value: procedure.pressure, disabled: !canApplyTool, onChange: function(event) { setProcedure({ pressure: Number(event.target.value) }); }, className: 'mt-1 w-full accent-rose-700' })), h('label', { className: 'text-xs font-bold text-slate-700', htmlFor: 'procedure-angle' }, 'Blade approach angle ' + Math.round(procedure.angle) + '\u00B0', h('input', { id: 'procedure-angle', type: 'range', min: 15, max: 90, step: 1, value: procedure.angle, disabled: !canApplyTool, onChange: function(event) { setProcedure({ angle: Number(event.target.value) }); }, className: 'mt-1 w-full accent-rose-700' })))
                    ),
                    h('aside', { className: 'space-y-3' },
                      procedure.stage === 1 ? h('div', { className: 'rounded-xl border border-indigo-200 bg-indigo-50/60 p-3' }, h('h5', { className: 'text-sm font-black text-indigo-950' }, 'Preparation checkpoint'), [['timeoutConfirmed', 'Confirm synthetic case and target'], ['sterilePrep', 'Complete simulated field preparation'], ['eyeProtection', 'Confirm protective equipment']].map(function(item) { return h('label', { key: item[0], className: 'mt-2 flex items-start gap-2 text-xs text-indigo-950' }, h('input', { type: 'checkbox', checked: procedure[item[0]], onChange: function(event) { var patch = {}; patch[item[0]] = event.target.checked; setProcedure(patch); }, className: 'mt-0.5 accent-indigo-700' }), item[1]); }), h('button', { type: 'button', disabled: !prepared, onClick: beginProcedureAccess, className: 'mt-3 w-full rounded-lg bg-indigo-700 px-3 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-slate-400' }, 'Begin layered simulation')) : null,
                      procedure.stage >= 2 && procedure.stage <= 4 ? h('button', { type: 'button', onClick: applyProcedureInstrument, className: 'w-full rounded-xl bg-rose-800 px-4 py-3 text-sm font-black text-white hover:bg-rose-900', 'data-procedure-apply-tool': procedure.tool }, 'Use ' + procedureTools.filter(function(item) { return item.id === procedure.tool; })[0].label + ' without drawing') : null,
                      procedure.stage === 5 ? h('div', { className: 'rounded-xl border border-violet-200 bg-violet-50/60 p-3' }, h('h5', { className: 'text-sm font-black text-violet-950' }, procedure.microscopyComplete ? 'Cell evidence received' : 'Specimen handoff'), h('p', { className: 'mt-1 text-xs leading-relaxed text-violet-900' }, procedure.microscopyComplete ? 'The Microdissection Studio recorded cell-scale evidence. Continue to the debrief.' : 'The preserved specimen is ready for objective calibration, sectioning, staining, target isolation, and evidence recording.'), procedure.microscopyComplete ? h('button', { type: 'button', onClick: function() { setProcedure({ stage: 6, feedback: 'Evidence chain complete. Review the performance breakdown.' }); }, className: 'mt-3 w-full rounded-lg bg-violet-700 px-3 py-2 text-xs font-black text-white' }, 'Open debrief') : h('button', { type: 'button', onClick: startProcedureMicroscopy, className: 'mt-3 w-full rounded-lg bg-violet-700 px-3 py-2 text-xs font-black text-white' }, procedure.microscopyStarted ? 'Resume Cell Microdissection' : 'Continue to Cell Microdissection \u2192')) : null,
                      procedure.stage === 6 ? h('div', { className: 'rounded-xl border border-emerald-200 bg-emerald-50/60 p-3', 'data-procedure-debrief': 'true' }, h('div', { className: 'flex items-end justify-between gap-2' }, h('div', null, h('h5', { className: 'text-sm font-black text-emerald-950' }, 'Performance debrief'), h('p', { className: 'text-xs text-emerald-900' }, procedureScore.label)), h('strong', { className: 'text-3xl text-emerald-900' }, procedureScore.total + '/100')), h('dl', { className: 'mt-3 grid grid-cols-2 gap-2 text-xs' }, [['Planning', procedureScore.planning + '/20'], ['Preparation', procedureScore.preparation + '/15'], ['Safety', procedureScore.safety + '/25'], ['Specimen', procedureScore.specimen + '/15'], ['Efficiency', procedureScore.efficiency + '/15'], ['Microscopy', procedureScore.microscopy + '/10']].map(function(item) { return h('div', { key: item[0], className: 'rounded-lg bg-white p-2' }, h('dt', { className: 'text-slate-500' }, item[0]), h('dd', { className: 'font-black text-slate-900' }, item[1])); }))) : null,
                      h('div', { role: 'status', 'aria-live': 'polite', className: 'rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-700' }, procedure.feedback),
                      h('div', { className: 'rounded-xl border border-slate-200 bg-white p-3', 'data-procedure-replay': 'true' },
                        h('div', { className: 'flex items-center justify-between gap-2' }, h('h5', { className: 'text-xs font-black uppercase tracking-wide text-slate-700' }, 'Gesture replay and coaching'), h('span', { className: 'text-[10px] text-slate-500' }, procedure.strokes.length + ' gestures · ' + procedure.actions + ' actions')),
                        h('div', { className: 'mt-2 grid grid-cols-2 gap-1.5' },
                          h('button', { type: 'button', disabled: !procedure.strokes.length, 'aria-pressed': procedure.showReplay, onClick: function() { setProcedure({ showReplay: !procedure.showReplay, feedback: procedure.showReplay ? 'Replay overlay hidden.' : 'Replay overlay shows the planned centerline and highlights low-control paths.' }); }, className: 'rounded-lg border border-cyan-200 bg-cyan-50 px-2 py-1.5 text-[11px] font-bold text-cyan-900 disabled:opacity-50' }, procedure.showReplay ? 'Hide path heatmap' : 'Show path heatmap'),
                          h('button', { type: 'button', disabled: !procedure.strokes.length || procedure.microscopyStarted, onClick: undoProcedureGesture, className: 'rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[11px] font-bold text-slate-700 disabled:opacity-50' }, 'Undo last gesture'),
                          h('button', { type: 'button', 'aria-pressed': procedure.reducedVisuals, onClick: function() { setProcedure({ reducedVisuals: !procedure.reducedVisuals, feedback: procedure.reducedVisuals ? 'Full simulated fluid markers restored.' : 'Reduced visual intensity enabled; quantitative feedback remains unchanged.' }); }, className: 'col-span-2 rounded-lg border border-violet-200 bg-violet-50 px-2 py-1.5 text-[11px] font-bold text-violet-900' }, procedure.reducedVisuals ? 'Use standard visual intensity' : 'Reduce visual intensity')
                        ),
                        lastProcedureMetrics ? h('div', { className: 'mt-3', 'data-procedure-stroke-metrics': 'true' },
                          h('div', { className: 'grid grid-cols-2 gap-1.5' }, [['Precision', lastProcedureMetrics.precision + '%'], ['Steadiness', lastProcedureMetrics.steadiness + '%'], ['Pressure', Math.round(lastProcedureMetrics.meanPressure * 100) + '%'], ['Control', lastProcedureMetrics.control + '%'], ['Path angle', lastProcedureMetrics.pathAngle + '\u00B0'], ['Relative speed', lastProcedureMetrics.speed]].map(function(item) { return h('div', { key: item[0], className: 'rounded-lg bg-slate-50 p-2' }, h('div', { className: 'text-[9px] font-bold uppercase text-slate-500' }, item[0]), h('div', { className: 'text-sm font-black text-slate-900' }, item[1])); })),
                          h('div', { className: 'mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-[10px] leading-relaxed text-amber-950' }, h('strong', null, 'Adaptive coach: '), lastProcedureMetrics.recommendation),
                          procedure.showReplay ? h('p', { className: 'mt-2 text-[10px] text-slate-600' }, 'Cyan dashed = planned route · tool color = recorded path · rose = control below 60%.') : null
                        ) : h('p', { className: 'mt-2 text-[10px] text-slate-500' }, 'Draw on the tissue field or use the keyboard alternative to generate precision, steadiness, pressure, and control feedback.'),
                        procedure.actionLog.length ? h('ol', { className: 'mt-2 max-h-32 space-y-1 overflow-y-auto text-[10px] text-slate-700' }, procedure.actionLog.slice().reverse().map(function(item) { return h('li', { key: item.id, className: 'rounded bg-slate-50 px-2 py-1' }, item.label + ' \u00B7 depth ' + item.depth + '%'); })) : null
                      ),                      h('button', { type: 'button', onClick: resetProcedure, className: 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50' }, 'Reset scenario')
                    )
                  )
                );
              })() : activeTab === 'imaging' ? (function() {
                var savedImaging = d.imaging && typeof d.imaging === 'object' && !Array.isArray(d.imaging) ? d.imaging : {};
                var modality = savedImaging.modality === 'MRI' ? 'MRI' : 'CT';
                var region = ['head', 'chest', 'abdomen'].indexOf(savedImaging.region) >= 0 ? savedImaging.region : 'chest';
                var plane = ['axial', 'coronal', 'sagittal'].indexOf(savedImaging.plane) >= 0 ? savedImaging.plane : 'axial';
                var restoredSlice = Number(savedImaging.slice);
                var sliceValue = Math.max(0, Math.min(100, Number.isFinite(restoredSlice) ? restoredSlice : 50));
                var sequence = savedImaging.sequence === 'T2' ? 'T2' : 'T1';
                var windowWidth = Math.max(50, Math.min(2500, Number(savedImaging.windowWidth) || (modality === 'CT' ? 400 : 900)));
                var restoredWindowLevel = Number(savedImaging.windowLevel);
                var windowLevel = Math.max(-1000, Math.min(1200, Number.isFinite(restoredWindowLevel) ? restoredWindowLevel : (modality === 'CT' ? 40 : 450)));
                var imagingTool = savedImaging.tool === 'ruler' ? 'ruler' : 'pin';
                var showLabels = savedImaging.showLabels !== false;
                var showCrosshair = savedImaging.showCrosshair !== false;
                var imagingNote = typeof savedImaging.note === 'string' ? savedImaging.note.slice(0, 120) : '';
                var allImagingAnnotations = Array.isArray(savedImaging.annotations) ? savedImaging.annotations.filter(function(item) { return item && typeof item === 'object' && !Array.isArray(item); }).slice(-12) : [];
                var visibleImagingAnnotations = allImagingAnnotations.filter(function(item) { return item.modality === modality && item.region === region && item.plane === plane && Math.abs(Number(item.slice) - sliceValue) <= 3; });
                var regionStructures = {
                  head: ['Skull', 'Brain hemispheres', 'Ventricles', 'Cerebellum', 'Orbits'],
                  chest: ['Lungs', 'Heart', 'Trachea', 'Vertebra', 'Spinal canal', 'Diaphragm'],
                  abdomen: ['Liver', 'Kidneys', 'Bowel', 'Vertebra', 'Bladder']
                }[region];
                function setImaging(patch) { upd('imaging', Object.assign({}, savedImaging, patch)); }
                function chooseModality(nextModality) {
                  if (nextModality === 'MRI') setImaging({ modality: 'MRI', sequence: 'T1', windowWidth: 900, windowLevel: 450, rulerStart: null });
                  else setImaging({ modality: 'CT', windowWidth: 400, windowLevel: 40, rulerStart: null });
                }
                function applyWindowPreset(preset) {
                  var presets = { soft: [400, 40], lung: [1500, -600], bone: [2000, 300], brain: [100, 40] };
                  var values = presets[preset] || presets.soft;
                  setImaging({ windowPreset: preset, windowWidth: values[0], windowLevel: values[1] });
                  if (typeof announceToSR === 'function') announceToSR('CT ' + preset + ' window selected. Width ' + values[0] + ', level ' + values[1] + '.');
                }
                function handleImagingClick(event) {
                  var canvas = event.currentTarget, rect = canvas.getBoundingClientRect();
                  var x = Math.max(0, Math.min(1, ((event.clientX - rect.left) / rect.width - 44 / 640) / (552 / 640)));
                  var y = Math.max(0, Math.min(1, ((event.clientY - rect.top) / rect.height - 28 / 480) / (408 / 480)));
                  if (imagingTool === 'ruler' && savedImaging.rulerStart && typeof savedImaging.rulerStart === 'object') {
                    var start = savedImaging.rulerStart;
                    var dx = (x - start.x) * 552, dy = (y - start.y) * 408;
                    var distance = Math.sqrt(dx * dx + dy * dy) * 0.8;
                    var ruler = { id: 'img-' + Date.now(), type: 'ruler', x: start.x, y: start.y, x2: x, y2: y, distanceMm: Math.round(distance * 10) / 10, note: imagingNote || 'Measured span', modality: modality, region: region, plane: plane, slice: sliceValue };
                    setImaging({ annotations: allImagingAnnotations.concat([ruler]).slice(-12), rulerStart: null, note: '' });
                    if (typeof announceToSR === 'function') announceToSR('Ruler recorded: ' + ruler.distanceMm + ' millimeters in this teaching phantom.');
                  } else if (imagingTool === 'ruler') {
                    setImaging({ rulerStart: { x: x, y: y } });
                    if (typeof announceToSR === 'function') announceToSR('Ruler start placed. Select an end point.');
                  } else {
                    var pin = { id: 'img-' + Date.now(), type: 'pin', x: x, y: y, note: imagingNote || 'Observation pin', modality: modality, region: region, plane: plane, slice: sliceValue };
                    setImaging({ annotations: allImagingAnnotations.concat([pin]).slice(-12), note: '' });
                    if (typeof announceToSR === 'function') announceToSR('Observation pin recorded on slice ' + Math.round(sliceValue) + '.');
                  }
                }
                var drawingState = { modality: modality, region: region, plane: plane, slice: sliceValue, sequence: sequence, windowWidth: windowWidth, windowLevel: windowLevel, showLabels: showLabels, showCrosshair: showCrosshair, annotations: visibleImagingAnnotations };
                return h('section', { className: 'rounded-2xl border-2 border-cyan-200 bg-white p-4 shadow-sm', 'data-anatomy-imaging-workspace': 'true', 'aria-labelledby': 'anatomy-imaging-title' },
                  h('div', { className: 'flex flex-wrap items-start justify-between gap-3' },
                    h('div', null,
                      h('div', { className: 'text-[11px] font-black uppercase tracking-wider text-cyan-800' }, 'Medical imaging literacy'),
                      h('h4', { id: 'anatomy-imaging-title', className: 'text-xl font-black text-slate-900' }, 'CT / MRI Imaging Lab'),
                      h('p', { className: 'mt-1 max-w-3xl text-sm leading-relaxed text-slate-600' }, 'Explore a synthetic teaching phantom across anatomical planes. Practice display controls, orientation, observation, and measurement without using or uploading patient data.')),
                    h('span', { className: 'rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-black text-amber-900' }, 'Educational · non-diagnostic')
                  ),
                  h('div', { className: 'mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950', role: 'note' }, h('strong', null, 'Teaching model only: '), 'These are generated diagrams, not scans and not a clinical interpretation tool. Tissue appearance is simplified. Never use this workspace to diagnose, triage, or make treatment decisions.'),
                  h('div', { className: 'mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.8fr)]' },
                    h('div', null,
                      h('div', { className: 'flex flex-wrap gap-2 mb-2' },
                        h('div', { className: 'inline-flex rounded-lg border border-cyan-200 bg-cyan-50 p-1', role: 'group', 'aria-label': 'Imaging modality' }, ['CT', 'MRI'].map(function(item) { return h('button', { key: item, type: 'button', 'aria-pressed': modality === item, onClick: function() { chooseModality(item); }, className: 'rounded-md px-3 py-1.5 text-xs font-black ' + (modality === item ? 'bg-cyan-800 text-white' : 'text-cyan-900 hover:bg-white') }, item); })),
                        h('div', { className: 'inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1', role: 'group', 'aria-label': 'Body region' }, [['head', 'Head'], ['chest', 'Chest'], ['abdomen', 'Abdomen']].map(function(item) { return h('button', { key: item[0], type: 'button', 'aria-pressed': region === item[0], onClick: function() { setImaging({ region: item[0], slice: 50, rulerStart: null }); }, className: 'rounded-md px-2.5 py-1.5 text-xs font-bold ' + (region === item[0] ? 'bg-slate-800 text-white' : 'text-slate-700 hover:bg-white') }, item[1]); })),
                        h('div', { className: 'inline-flex rounded-lg border border-indigo-200 bg-indigo-50 p-1', role: 'group', 'aria-label': 'Anatomical plane' }, [['axial', 'Axial'], ['coronal', 'Coronal'], ['sagittal', 'Sagittal']].map(function(item) { return h('button', { key: item[0], type: 'button', 'aria-pressed': plane === item[0], onClick: function() { setImaging({ plane: item[0], rulerStart: null }); }, className: 'rounded-md px-2.5 py-1.5 text-xs font-bold ' + (plane === item[0] ? 'bg-indigo-700 text-white' : 'text-indigo-800 hover:bg-white') }, item[1]); }))
                      ),
                      h('div', { className: 'overflow-hidden rounded-xl border-2 border-slate-700 bg-slate-950 shadow-xl' },
                        h('canvas', { key: [modality, region, plane, sliceValue, sequence, windowWidth, windowLevel, showLabels, showCrosshair, visibleImagingAnnotations.length].join('-'), width: 640, height: 480, role: 'img', tabIndex: 0, 'data-anatomy-imaging-canvas': 'true', 'aria-label': modality + ' synthetic ' + region + ' phantom in the ' + plane + ' plane, slice ' + Math.round(sliceValue) + '. Visible teaching structures: ' + regionStructures.join(', ') + '. ' + visibleImagingAnnotations.length + ' annotations on this slice.', onClick: handleImagingClick, style: { display: 'block', width: '100%', height: 'auto', cursor: imagingTool === 'ruler' ? 'crosshair' : 'copy' }, ref: function(canvas) { if (!canvas) return; var context = canvas.getContext && canvas.getContext('2d'); if (context) drawAnatomyImagingSlice(context, canvas.width, canvas.height, drawingState); } })
                      ),
                      h('div', { className: 'mt-2 flex flex-wrap items-center gap-2' },
                        h('label', { htmlFor: 'anatomy-imaging-slice', className: 'text-xs font-black text-slate-700' }, 'Slice ' + Math.round(sliceValue) + ' / 100'),
                        h('input', { id: 'anatomy-imaging-slice', type: 'range', min: 0, max: 100, step: 1, value: sliceValue, onChange: function(event) { setImaging({ slice: Number(event.target.value), rulerStart: null }); }, className: 'min-w-[220px] flex-1 accent-cyan-700', 'aria-label': 'Imaging slice position' }),
                        h('button', { type: 'button', onClick: function() { setImaging({ showCrosshair: !showCrosshair }); }, 'aria-pressed': showCrosshair, className: 'rounded-lg border border-cyan-200 px-2 py-1 text-xs font-bold text-cyan-900' }, showCrosshair ? 'Hide crosshair' : 'Show crosshair'),
                        h('button', { type: 'button', onClick: function() { setImaging({ showLabels: !showLabels }); }, 'aria-pressed': showLabels, className: 'rounded-lg border border-cyan-200 px-2 py-1 text-xs font-bold text-cyan-900' }, showLabels ? 'Hide labels' : 'Show labels')
                      ),
                      h('div', { className: 'mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-[11px] leading-relaxed text-slate-700' }, h('strong', null, 'Orientation: '), 'R/L refer to the patient. S/I mean superior/inferior; sagittal views use A/P for anterior/posterior. The 50 mm scale assumes a simplified 0.8 mm display spacing.')
                    ),
                    h('aside', { className: 'space-y-3' },
                      h('div', { className: 'rounded-xl border border-cyan-200 bg-cyan-50/60 p-3' },
                        h('h5', { className: 'text-xs font-black uppercase tracking-wide text-cyan-900' }, modality === 'CT' ? 'CT window / level' : 'MRI display contrast'),
                        modality === 'MRI' ? h('div', { className: 'mt-2 flex gap-2', role: 'group', 'aria-label': 'MRI sequence' }, ['T1', 'T2'].map(function(item) { return h('button', { key: item, type: 'button', 'aria-pressed': sequence === item, onClick: function() { setImaging({ sequence: item }); }, className: 'flex-1 rounded-lg border px-3 py-2 text-xs font-bold ' + (sequence === item ? 'border-cyan-800 bg-cyan-800 text-white' : 'border-cyan-200 bg-white text-cyan-900') }, item); })) : h('div', { className: 'mt-2 grid grid-cols-2 gap-1.5', role: 'group', 'aria-label': 'CT window presets' }, [['soft', 'Soft tissue'], ['lung', 'Lung'], ['bone', 'Bone'], ['brain', 'Brain']].map(function(item) { return h('button', { key: item[0], type: 'button', onClick: function() { applyWindowPreset(item[0]); }, className: 'rounded-lg border border-cyan-200 bg-white px-2 py-1.5 text-xs font-bold text-cyan-900 hover:bg-cyan-100' }, item[1]); })),
                        h('label', { className: 'mt-3 block text-[11px] font-bold text-slate-700', htmlFor: 'imaging-window-width' }, 'Window width ' + Math.round(windowWidth)),
                        h('input', { id: 'imaging-window-width', type: 'range', min: 50, max: 2500, step: 10, value: windowWidth, onChange: function(event) { setImaging({ windowWidth: Number(event.target.value) }); }, className: 'w-full accent-cyan-700' }),
                        h('label', { className: 'mt-2 block text-[11px] font-bold text-slate-700', htmlFor: 'imaging-window-level' }, 'Window level ' + Math.round(windowLevel)),
                        h('input', { id: 'imaging-window-level', type: 'range', min: -1000, max: 1200, step: 10, value: windowLevel, onChange: function(event) { setImaging({ windowLevel: Number(event.target.value) }); }, className: 'w-full accent-cyan-700' }),
                        h('p', { className: 'mt-2 text-[10px] leading-relaxed text-slate-600' }, modality === 'CT' ? 'Width controls the displayed HU range; level sets its midpoint. Narrow windows increase contrast for a smaller tissue range.' : 'MRI signal intensity is sequence- and scanner-dependent; this display window is not a calibrated Hounsfield scale.')
                      ),
                      h('div', { className: 'rounded-xl border border-amber-200 bg-amber-50/60 p-3' },
                        h('h5', { className: 'text-xs font-black uppercase tracking-wide text-amber-900' }, 'Observe and measure'),
                        h('div', { className: 'mt-2 flex gap-2', role: 'group', 'aria-label': 'Imaging annotation tool' }, [['pin', 'Pin'], ['ruler', 'Ruler']].map(function(item) { return h('button', { key: item[0], type: 'button', 'aria-pressed': imagingTool === item[0], onClick: function() { setImaging({ tool: item[0], rulerStart: null }); }, className: 'flex-1 rounded-lg border px-3 py-2 text-xs font-black ' + (imagingTool === item[0] ? 'border-amber-700 bg-amber-700 text-white' : 'border-amber-200 bg-white text-amber-900') }, item[1]); })),
                        h('label', { htmlFor: 'imaging-note', className: 'mt-2 block text-[11px] font-bold text-slate-700' }, 'Observation note'),
                        h('input', { id: 'imaging-note', type: 'text', maxLength: 120, value: imagingNote, onChange: function(event) { setImaging({ note: event.target.value }); }, placeholder: imagingTool === 'ruler' ? 'What are you measuring?' : 'What do you notice?', className: 'mt-1 w-full rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-xs' }),
                        savedImaging.rulerStart ? h('div', { role: 'status', className: 'mt-2 rounded-lg bg-white p-2 text-xs font-bold text-amber-900' }, 'Ruler start placed—select the end point.') : null,
                        h('p', { className: 'mt-2 text-[10px] text-slate-600' }, 'Pins and rulers are stored only in this activity state. Measurements use the phantom scale and are not clinical measurements.')
                      ),
                      h('div', { className: 'rounded-xl border border-emerald-200 bg-emerald-50/60 p-3' },
                        h('div', { className: 'flex items-center justify-between gap-2' }, h('h5', { className: 'text-xs font-black uppercase tracking-wide text-emerald-900' }, 'Observation log'), allImagingAnnotations.length ? h('button', { type: 'button', onClick: function() { setImaging({ annotations: [], rulerStart: null }); }, className: 'text-[10px] font-bold text-emerald-800 underline' }, 'Clear all') : null),
                        allImagingAnnotations.length ? h('ol', { className: 'mt-2 max-h-40 space-y-1 overflow-y-auto text-[10px] text-emerald-950' }, allImagingAnnotations.slice().reverse().map(function(item) { return h('li', { key: item.id, className: 'rounded-lg border border-emerald-200 bg-white p-2' }, h('strong', null, item.type === 'ruler' ? (item.distanceMm + ' mm') : item.note), ' · ', item.modality, ' ', item.region, ' ', item.plane, ' · slice ', Math.round(item.slice), item.type === 'ruler' ? h('span', { className: 'block text-slate-600' }, item.note) : null); })) : h('p', { className: 'mt-2 text-[10px] text-emerald-900' }, 'Choose Pin or Ruler, then select the image to create an observation.')
                      )
                    )
                  ),
                  h('div', { className: 'mt-4 grid gap-3 lg:grid-cols-2' },
                    h('div', { className: 'rounded-xl border border-indigo-200 bg-indigo-50/60 p-3' },
                      h('h5', { className: 'text-sm font-black text-indigo-950' }, 'What should I identify?'),
                      h('ul', { className: 'mt-2 grid grid-cols-2 gap-1 text-xs text-indigo-900' }, regionStructures.map(function(item) { return h('li', { key: item, className: 'rounded-md bg-white px-2 py-1' }, '• ' + item); })),
                      h('button', { type: 'button', onClick: function() { openAnatomyScaleDestination('cell', 'cell', { mode: 'microdissection', _cellPicked: true, _cellCategory: 'interactive' }, 'Cell Microdissection'); }, className: 'mt-3 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-900 hover:bg-indigo-100' }, 'Continue to cell-scale imaging →')
                    ),
                    h('div', { className: 'rounded-xl border border-slate-300 bg-slate-50 p-3', 'data-anatomy-open-source-bridge': 'true' },
                      h('h5', { className: 'text-sm font-black text-slate-900' }, 'Open-source imaging and anatomy bridge'),
                      h('p', { className: 'mt-1 text-[11px] leading-relaxed text-slate-600' }, 'Use these external projects when a course needs real DICOM data or licensed mesh assets. External viewers open separately; do not upload protected health information unless your institution has approved the workflow.'),
                      h('div', { className: 'mt-2 grid gap-2 sm:grid-cols-2' },
                        h('a', { href: 'https://viewer.ohif.org/', target: '_blank', rel: 'noopener noreferrer', className: 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-100' }, 'OHIF Viewer ↗'),
                        h('a', { href: 'https://www.cornerstonejs.org/live-examples/local', target: '_blank', rel: 'noopener noreferrer', className: 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-100' }, 'Cornerstone local DICOM ↗'),
                        h('a', { href: 'https://lifesciencedb.jp/bp3d/info/index.html', target: '_blank', rel: 'noopener noreferrer', className: 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-100' }, 'BodyParts3D source ↗'),
                        h('a', { href: 'https://github.com/LluisV/Z-Anatomy', target: '_blank', rel: 'noopener noreferrer', className: 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-100' }, 'Z-Anatomy source ↗')
                      ),
                      h('p', { className: 'mt-2 text-[10px] leading-relaxed text-slate-500' }, 'OHIF and Cornerstone are MIT-licensed software. BodyParts3D data is distributed under CC BY-SA 2.1 JP; Z-Anatomy states CC BY-SA 4.0. Meshes are not bundled here so attribution, share-alike, file size, and structure-level provenance can be handled deliberately.')
                    )
                  )
                );
              })() : activeTab === 'homeoHunt' ? (function() {
                var homeoDefaults = { tempC: 37, pH: 7.4, glucose: 90, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
                var savedHomeo = d.homeoHunt && typeof d.homeoHunt === 'object' && !Array.isArray(d.homeoHunt) ? d.homeoHunt : {};
                function boundedHomeoNumber(value, min, max, fallback) {
                  if (value === null || value === '' || typeof value === 'boolean') return fallback;
                  var number = Number(value);
                  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
                }
                var iq = Object.assign({}, homeoDefaults, savedHomeo);
                iq.tempC = boundedHomeoNumber(savedHomeo.tempC, 30, 43, homeoDefaults.tempC);
                iq.pH = boundedHomeoNumber(savedHomeo.pH, 6.8, 7.8, homeoDefaults.pH);
                iq.glucose = boundedHomeoNumber(savedHomeo.glucose, 30, 400, homeoDefaults.glucose);
                iq.hypothesis = typeof savedHomeo.hypothesis === 'string' ? savedHomeo.hypothesis : '';
                iq.explanation = typeof savedHomeo.explanation === 'string' ? savedHomeo.explanation : '';
                iq.stuckRevealed = !!savedHomeo.stuckRevealed;
                iq.understood = !!savedHomeo.understood;
                iq.log = Array.isArray(savedHomeo.log) ? savedHomeo.log.filter(function(entry) {
                  return entry && typeof entry === 'object' && !Array.isArray(entry);
                }).slice(-8) : [];
                function setIQ(patch) { upd('homeoHunt', Object.assign({}, iq, patch)); }
                var referenceChecks = [
                  { key: 'temperature', inRange: iq.tempC >= 36.5 && iq.tempC <= 37.5 },
                  { key: 'blood pH', inRange: iq.pH >= 7.35 && iq.pH <= 7.45 },
                  { key: 'fasting glucose', inRange: iq.glucose >= 70 && iq.glucose <= 99 }
                ];
                var outOfRange = referenceChecks.filter(function(check) { return !check.inRange; });
                var state = outOfRange.length === 0 ? 'normal' : outOfRange.length === 1 ? 'mildStress' : outOfRange.length === 2 ? 'severeStress' : 'critical';
                var stateMeta = {
                  normal:       { label: t('stem.anatomy.within_teaching_references', 'All within teaching references'), color: '#047857', bg: '#ecfdf5', border: '#86efac', short: '0 outside', desc: 'Temperature, arterial blood pH, and fasting glucose are inside this model\'s adult reference ranges.' },
                  mildStress:   { label: t('stem.anatomy.one_variable_outside_reference', '1 variable outside reference'),  color: '#b45309', bg: '#fffbeb', border: '#fcd34d', short: '1 outside', desc: (outOfRange[0] ? outOfRange[0].key : 'One variable') + ' is outside this model\'s reference range.' },
                  severeStress: { label: t('stem.anatomy.two_variables_outside_reference', '2 variables outside reference'),       color: '#c2410c', bg: '#fff7ed', border: '#fdba74', short: '2 outside', desc: outOfRange.map(function(check) { return check.key; }).join(' and ') + ' are outside this model\'s reference ranges.' },
                  critical:     { label: t('stem.anatomy.three_variables_outside_reference', '3 variables outside reference'),   color: '#b91c1c', bg: '#fef2f2', border: '#fca5a5', short: '3 outside', desc: 'All three variables are outside this model\'s reference ranges.' }
                }[state];
                function logObs() {
                  setIQ({ log: iq.log.concat([{ t: iq.tempC, p: iq.pH, g: iq.glucose, st: stateMeta.short }]).slice(-8) });
                }
                return h('div', { className: 'bg-white rounded-xl border-2 border-indigo-200 p-4 space-y-3' },
                  h('h4', { className: 'font-bold text-indigo-800 text-sm' }, t('stem.anatomy.homeostasis_discovery_2', '🏠 Homeostasis discovery')),
                  h('p', { className: 'text-xs text-slate-700 leading-relaxed' },
                    'Explore a conceptual adult reference-range dashboard. Adjust body temperature, arterial blood pH, and fasting plasma glucose, then notice which measurements move outside their teaching ranges.'),
                  h('div', { className: 'p-3 rounded-lg text-center', role: 'status', 'aria-live': 'polite', style: { background: stateMeta.bg, border: '2px solid ' + stateMeta.border } },
                    h('div', { className: 'text-sm font-black', style: { color: stateMeta.color } }, stateMeta.label),
                    h('div', { className: 'text-[11px] text-slate-700 mt-1' }, stateMeta.desc)
                  ),
                  h('div', { className: 'grid grid-cols-1 sm:grid-cols-3 gap-3' },
                    [
                      { key: 'tempC',   label: t('stem.anatomy.body_temp_c', 'Body temp (°C)'), val: iq.tempC,   min: 30, max: 43, step: 0.1 },
                      { key: 'pH',      label: t('stem.anatomy.blood_ph', 'Blood pH'),       val: iq.pH,      min: 6.8, max: 7.8, step: 0.05 },
                      { key: 'glucose', label: t('stem.anatomy.fasting_glucose_mg_dl', 'Fasting glucose (mg/dL)'), val: iq.glucose, min: 30, max: 400, step: 5 }
                    ].map(function(s) {
                      return h('div', { key: s.key },
                        h('label', { htmlFor: 'hh-' + s.key, className: 'block text-[11px] font-bold text-slate-700' },
                          s.label + ': ', h('span', { className: 'font-mono text-indigo-700' }, s.val)),
                        h('input', { id: 'hh-' + s.key, type: 'range', min: s.min, max: s.max, step: s.step, value: s.val,
                          onChange: function(e) { var p = {}; p[s.key] = parseFloat(e.target.value); setIQ(p); },
                          className: 'w-full', 'aria-label': s.label, 'aria-valuetext': s.label + ': ' + s.val }));
                    })
                  ),
                  h('div', { className: 'flex gap-2 items-center flex-wrap' },
                    h('button', { onClick: logObs, className: 'px-2 py-1 rounded bg-slate-100 text-[11px] font-bold text-slate-700 border border-slate-300' }, t('stem.anatomy.log', '📋 Log')),
                    h('button', { onClick: function() { setIQ({ tempC: 37, pH: 7.4, glucose: 90, log: [], hypothesis: '', stuckRevealed: false, understood: false, explanation: '' }); }, className: 'px-2 py-1 rounded bg-white text-[11px] font-semibold text-slate-600 border border-slate-300' }, t('stem.anatomy.reset_3', '↺ Reset')),
                    iq.log.length > 0 && h('span', { className: 'text-[10px] text-slate-500 italic' }, iq.log.length + ' logged')
                  ),
                  iq.log.length > 0 && h('table', { className: 'text-[10px] w-full border-collapse text-slate-700', 'aria-label': 'Logged homeostasis observations' },
                    h('thead', null, h('tr', { className: 'bg-slate-100' }, ['temp °C', 'pH', 'gluc', 'state'].map(function(c, i) { return h('th', { key: 'h' + i, scope: 'col', className: 'px-1 border border-slate-200 text-left' }, c); }))),
                    h('tbody', null, iq.log.map(function(o, idx) {
                      return h('tr', { key: 'lr' + idx },
                        h('td', { className: 'px-1 border border-slate-200 font-mono' }, o.t),
                        h('td', { className: 'px-1 border border-slate-200 font-mono' }, o.p),
                        h('td', { className: 'px-1 border border-slate-200 font-mono' }, o.g),
                        h('td', { className: 'px-1 border border-slate-200' }, o.st));
                    }))
                  ),
                  h('textarea', { value: iq.hypothesis || '', onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, placeholder: t('stem.anatomy.homeostasis_reference_hypothesis', 'Hypothesis: Which reference range is narrowest, and why might the body regulate it tightly?'),
                    className: 'w-full text-[12px] border border-slate-300 rounded p-2 font-mono leading-snug', rows: 3 }),
                  !iq.stuckRevealed && h('button', { onClick: function() { setIQ({ stuckRevealed: true }); }, className: 'px-2 py-1 rounded bg-amber-50 text-[11px] font-bold text-amber-800 border border-amber-300' }, t('stem.anatomy.stuck_show_open_prompts', '🤔 Stuck — show open prompts')),
                  iq.stuckRevealed && h('div', { className: 'p-3 rounded bg-amber-50 border border-amber-200 text-[11px] text-slate-700 leading-relaxed' },
                    h('ul', { className: 'list-disc pl-5 space-y-1' },
                      h('li', null, t('stem.anatomy.hold_two_vital_signs_steady_move_the_t', 'Hold two vital signs steady. Move the third. Watch.')),
                      h('li', null, t('stem.anatomy.arterial_blood_ph_reference_prompt', 'A common arterial blood pH reference range is 7.35-7.45. Investigate why it is so narrow.')),
                      h('li', null, t('stem.anatomy.compare_outside_reference_counts', 'Find settings with one, two, and three variables outside the reference ranges. What changes?')))),
                  h('div', { className: 'p-3 rounded bg-emerald-50 border border-emerald-200' },
                    h('label', { className: 'flex items-center gap-2 text-[12px] font-bold text-emerald-800 cursor-pointer' },
                      h('input', { type: 'checkbox', checked: !!iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); }, className: 'w-4 h-4' }),
                      t('stem.anatomy.i_understand_explain_in_own_words', 'I understand — explain in own words')),
                    iq.understood && h('textarea', { value: iq.explanation || '', onChange: function(e) { setIQ({ explanation: e.target.value }); }, placeholder: t('stem.anatomy.explain_homeostasis_model_limit', 'Explain why a reference-range flag alone cannot diagnose a person.'),
                      className: 'w-full text-[12px] border border-emerald-300 rounded p-2 font-mono leading-snug mt-2', rows: 4 })),
                  h('div', { className: 'text-[10px] italic text-slate-500' }, t('stem.anatomy.homeostasis_model_limit', 'Teaching model only, not a clinical score or diagnosis. Real interpretation depends on age, context, symptoms, measurement method, trends, and rate of change.'))
                );
              })() : null
            )
          ),

          // ── Clinical Cases section (advanced only) ──
          !focusedAnatomyWorkspace && complexity >= 3 ? h('div', { className: 'mt-4 bg-rose-50 rounded-xl border border-rose-200 p-3' },
            h('div', { className: 'flex items-center justify-between mb-2' },
              h('p', { className: 'text-[11px] font-bold text-rose-600 uppercase tracking-wider' }, '\uD83E\uDE7A Clinical Cases (' + clinicalSolved + ' reviewed)'),
              h('button', { onClick: function() { upd('_showClinical', !showClinical); },
                'aria-expanded': showClinical, 'aria-controls': 'anatomy-clinical-cases',
                className: 'text-[11px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-600 hover:bg-rose-200 transition-all active:scale-[0.97]'
              }, showClinical ? 'Hide' : 'Show Cases')
            ),
            showClinical ? h('div', { id: 'anatomy-clinical-cases', className: 'space-y-2' },
              CLINICAL_CASES.filter(function(c) { return !sysKey || c.system === sysKey; }).slice(0, 3).map(function(cs, ci) {
                var solved = !!clinicalSolvedIds[cs.id];
                var caseFb = solved ? 'reviewed' : (activeCaseId === cs.id ? activeCaseFeedback : null);
                return h('div', { key: cs.id, className: 'bg-white rounded-lg p-3 border border-rose-200' },
                  h('p', { className: 'text-xs font-bold text-rose-800 mb-1' }, cs.title + ' (' + cs.difficulty + ')'),
                  h('p', { className: 'text-[11px] text-slate-600 leading-relaxed mb-2' }, cs.presentation),
                  h('p', { className: 'text-[11px] font-bold text-slate-700 mb-1' }, cs.question),
                  caseFb ? h('div', { className: 'mt-2 rounded-lg p-2 ' + (caseFb === 'reviewed' ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200') },
                    h('p', { className: 'text-[11px] font-bold ' + (caseFb === 'reviewed' ? 'text-green-800' : 'text-amber-800') }, caseFb === 'reviewed' ? '\u2705 Reviewed: ' + cs.answer : 'Answer: ' + cs.answer),
                    h('p', { className: 'text-[11px] text-slate-600 leading-relaxed mt-1' }, cs.explanation)
                  ) : h('div', { className: 'flex gap-1 flex-wrap' },
                    h('button', { 'aria-label': t('stem.anatomy.i_got_it', 'Review explanation'),
                      onClick: function() {
                        if (clinicalSolvedIds[cs.id]) return;
                        var newIds = Object.assign({}, clinicalSolvedIds); newIds[cs.id] = true;
                        updMulti({
                          _activeCaseId: cs.id,
                          _activeCaseFeedback: 'reveal',
                          _clinicalSolvedIds: newIds,
                          _clinicalSolved: Object.keys(newIds).length
                        });
                        playSound('spotterCorrect');
                        setTimeout(checkAnatomyChallenges, 50);
                      },
                      className: 'px-2 py-1 rounded text-[11px] font-bold bg-green-50 text-green-700 border border-green-600 hover:bg-green-100 transition-all active:scale-[0.97]'
                    }, t('stem.anatomy.i_got_it_2', '\u2705 Review explanation')),
                    h('button', { 'aria-label': t('stem.anatomy.reveal_answer', 'Reveal Answer'),
                      onClick: function() {
                        updMulti({ _activeCaseId: cs.id, _activeCaseFeedback: 'reveal' });
                      },
                      className: 'px-2 py-1 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-600 hover:bg-amber-100 transition-all active:scale-[0.97]'
                    }, t('stem.anatomy.reveal_answer_2', '\uD83D\uDC41 Reveal Answer'))
                  )
                );
              })
            ) : null
          ) : null,

          // ── Badge section ──
          !focusedAnatomyWorkspace && h('div', { className: 'anatomy-badge-panel mt-4 bg-slate-50 rounded-xl border border-slate-400 p-3' },
            h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2' }, '\uD83C\uDFC5 Badges (' + Object.keys(badges).length + '/' + BADGE_DEFS.length + ')'),
            h('div', { className: 'flex flex-wrap gap-1.5' },
              BADGE_DEFS.map(function(bd) {
                var earned = badges[bd.id];
                return h('div', {
                  key: bd.id,
                  title: bd.name + ': ' + bd.desc + ' (' + bd.xp + ' XP)',
                  className: 'px-2 py-1 rounded-lg text-[11px] font-bold border transition-all ' +
                    (earned ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-slate-100 border-slate-200 text-slate-600')
                }, bd.icon + ' ' + bd.name);
              })
            )
          ),

          // ── Stats Dashboard ──
          !focusedAnatomyWorkspace && h('div', { className: 'anatomy-stats-panel mt-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-3' },
            h('p', { className: 'text-[11px] font-bold text-indigo-700 uppercase tracking-wider mb-2' }, t('stem.anatomy.exploration_stats', '\uD83D\uDCCA Exploration Stats')),
            h('div', { className: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2' },
              // Structures Viewed
              h('div', { className: 'bg-white rounded-lg p-2 text-center border border-indigo-100' },
                h('p', { className: 'text-lg font-black text-indigo-700 tracking-tight' }, String(Object.keys(structuresViewed).length)),
                h('p', { className: 'text-[11px] text-slate-600 font-semibold' }, t('stem.anatomy.structures', 'Structures'))
              ),
              // Systems Explored
              h('div', { className: 'bg-white rounded-lg p-2 text-center border border-indigo-100' },
                h('p', { className: 'text-lg font-black text-emerald-600 tracking-tight' }, String(Object.keys(systemsExplored).length) + '/10'),
                h('p', { className: 'text-[11px] text-slate-600 font-semibold' }, t('stem.anatomy.systems', 'Systems'))
              ),
              // Quiz Score
              h('div', { className: 'bg-white rounded-lg p-2 text-center border border-indigo-100' },
                h('p', { className: 'text-lg font-black text-amber-600 tracking-tight' }, String(totalCorrect)),
                h('p', { className: 'text-[11px] text-slate-600 font-semibold' }, t('stem.anatomy.quiz_correct', 'Quiz Correct'))
              ),
              // Spotter Score
              h('div', { className: 'bg-white rounded-lg p-2 text-center border border-indigo-100' },
                h('p', { className: 'text-lg font-black text-rose-600 tracking-tight' }, String(spotterScore)),
                h('p', { className: 'text-[11px] text-slate-600 font-semibold' }, t('stem.anatomy.spotter_ids', 'Spotter IDs'))
              ),
              // Pathways Completed
              h('div', { className: 'bg-white rounded-lg p-2 text-center border border-indigo-100' },
                h('p', { className: 'text-lg font-black text-teal-600 tracking-tight' }, String(Object.keys(pathwaysCompleted).length)),
                h('p', { className: 'text-[11px] text-slate-600 font-semibold' }, t('stem.anatomy.pathways_3', 'Pathways'))
              ),
              // Comparisons
              h('div', { className: 'bg-white rounded-lg p-2 text-center border border-indigo-100' },
                h('p', { className: 'text-lg font-black text-purple-600 tracking-tight' }, String(comparisons)),
                h('p', { className: 'text-[11px] text-slate-600 font-semibold' }, t('stem.anatomy.comparisons', 'Comparisons'))
              )
            ),
            // Secondary stats row
            h('div', { className: 'mt-2 flex flex-wrap gap-2' },
              h('span', { className: 'text-[11px] px-2 py-0.5 rounded-full bg-white border border-indigo-100 text-slate-600 font-semibold' },
                '\uD83D\uDD25 Streak: ' + streak
              ),
              h('span', { className: 'text-[11px] px-2 py-0.5 rounded-full bg-white border border-indigo-100 text-slate-600 font-semibold' },
                '\uD83E\uDD16 AI Questions: ' + aiQuestions
              ),
              h('span', { className: 'text-[11px] px-2 py-0.5 rounded-full bg-white border border-indigo-100 text-slate-600 font-semibold' },
                '\uD83E\uDDE0 Mnemonics: ' + Object.keys(mnemonicsViewed).length
              ),
              h('span', { className: 'text-[11px] px-2 py-0.5 rounded-full bg-white border border-indigo-100 text-slate-600 font-semibold' },
                '\uD83D\uDD0D Searches: ' + searchFinds
              ),
              h('span', { className: 'text-[11px] px-2 py-0.5 rounded-full bg-white border border-indigo-100 text-slate-600 font-semibold' },
                '\uD83E\uDE7A Clinical Cases: ' + clinicalSolved
              ),
              spotterBestTime < 999 ? h('span', { className: 'text-[11px] px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-bold' },
                '\u26A1 Best Spotter: ' + spotterBestTime.toFixed(1) + 's'
              ) : null
            ),
            // XP total
            getStemXP ? h('div', { className: 'mt-2 text-center' },
              h('span', { className: 'text-xs font-black px-3 py-1 rounded-full bg-gradient-to-r from-amber-100 to-yellow-100 border border-amber-300 text-amber-800' },
                '\u2B50 Total XP: ' + (getStemXP() || 0)
              )
            ) : null,
            // Progress bar
            h('div', { className: 'mt-2' },
              h('div', { className: 'flex justify-between mb-1' },
                h('span', { className: 'text-[11px] text-slate-600 font-semibold' }, t('stem.anatomy.system_progress', 'System Progress')),
                h('span', { className: 'text-[11px] font-bold text-indigo-600' }, progressPct + '%')
              ),
              h('div', { className: 'w-full bg-slate-200 rounded-full h-1.5', role: 'progressbar',
                'aria-label': sys.name + ' system progress', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': progressPct },
                h('div', {
                  className: 'h-1.5 rounded-full transition-all duration-500',
                  style: { width: progressPct + '%', background: 'linear-gradient(90deg, ' + sys.accent + ', #6366f1)' }
                })
              )
            )
          )

        );
      })();
    }
  });

})();
}
