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
// stem_tool_moonmission.js — Apollo Moon Mission Simulator (standalone CDN module)
// Full mission experience: Launch → Orbit → Transit → Descent → EVA → Return
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

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('moonMission'))) {

(function() {
  'use strict';

  // ═══════════════════════════════════════════════════════════════
  // AUDIO SYSTEM — Immersive mission sounds
  // ═══════════════════════════════════════════════════════════════
  var _mmAC = null;
  function getMMAC() {
    if (!_mmAC) { try { _mmAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} }
    if (_mmAC && _mmAC.state === 'suspended') { try { _mmAC.resume(); } catch(e) {} }
    return _mmAC;
  }
  function mmTone(freq, dur, type, vol) {
    var ac = getMMAC(); if (!ac) return;
    try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = type || 'sine'; o.frequency.value = freq; g.gain.setValueAtTime(vol || 0.08, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (dur || 0.15)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + (dur || 0.15)); } catch(e) {}
  }
  function mmNoise(dur, vol, filterHz, filterType) {
    var ac = getMMAC(); if (!ac) return;
    try {
      var bufSize = Math.floor(ac.sampleRate * (dur || 0.1));
      var buf = ac.createBuffer(1, bufSize, ac.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
      var src = ac.createBufferSource(); src.buffer = buf;
      var filt = ac.createBiquadFilter(); filt.type = filterType || 'lowpass'; filt.frequency.value = filterHz || 800;
      var g = ac.createGain(); g.gain.setValueAtTime(vol || 0.04, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (dur || 0.1));
      src.connect(filt); filt.connect(g); g.connect(ac.destination); src.start();
    } catch(e) {}
  }

  // Individual mission sounds
  function sfxCountdown() { mmTone(800, 0.15, 'sine', 0.1); } // Countdown beep
  function sfxLaunch() {
    // Deep rumble + roar
    mmNoise(1.0, 0.12, 200, 'lowpass');
    mmTone(60, 0.8, 'sawtooth', 0.1);
    setTimeout(function() { mmTone(80, 0.6, 'sawtooth', 0.08); mmNoise(0.6, 0.08, 300); }, 200);
    setTimeout(function() { mmTone(100, 0.5, 'sawtooth', 0.06); }, 400);
  }
  function sfxEngineIgnition() { mmNoise(0.3, 0.08, 500, 'bandpass'); mmTone(150, 0.2, 'sawtooth', 0.06); }
  function sfxStageSeparation() {
    mmNoise(0.15, 0.1, 1200, 'bandpass'); // metallic clank
    setTimeout(function() { mmTone(400, 0.08, 'sine', 0.06); }, 80);
    setTimeout(function() { mmTone(300, 0.1, 'sine', 0.04); }, 150);
  }
  function sfxRadioChirp() {
    // Classic NASA radio chirp/static
    mmNoise(0.04, 0.06, 3000, 'bandpass');
    setTimeout(function() { mmTone(1200, 0.03, 'sine', 0.05); }, 30);
  }
  function sfxAlarm() {
    mmTone(880, 0.1, 'square', 0.08);
    setTimeout(function() { mmTone(660, 0.1, 'square', 0.08); }, 120);
    setTimeout(function() { mmTone(880, 0.1, 'square', 0.08); }, 240);
  }
  function sfxThrust() { mmNoise(0.2, 0.06, 300, 'lowpass'); mmTone(80, 0.15, 'sawtooth', 0.04); }
  function sfxLanding() {
    mmNoise(0.3, 0.1, 400, 'lowpass');
    setTimeout(function() { mmTone(200, 0.2, 'sine', 0.06); }, 100);
    setTimeout(function() { mmTone(300, 0.15, 'sine', 0.08); }, 250);
  }
  function sfxBootstep() { mmNoise(0.04, 0.03, 600, 'lowpass'); }
  function sfxSampleCollect() {
    mmTone(523, 0.06, 'sine', 0.06);
    setTimeout(function() { mmTone(659, 0.06, 'sine', 0.06); }, 50);
    setTimeout(function() { mmTone(784, 0.08, 'sine', 0.07); }, 100);
  }
  function sfxSplashdown() {
    mmNoise(0.5, 0.1, 250, 'lowpass');
    setTimeout(function() { mmNoise(0.3, 0.06, 400); }, 200);
  }
  function sfxQuizCorrect() { mmTone(523, 0.08, 'sine', 0.08); setTimeout(function() { mmTone(659, 0.08, 'sine', 0.08); }, 70); setTimeout(function() { mmTone(784, 0.12, 'sine', 0.1); }, 140); }
  function sfxQuizWrong() { mmTone(250, 0.2, 'sawtooth', 0.06); }
  function sfxPhaseAdvance() {
    mmTone(440, 0.06, 'sine', 0.06);
    setTimeout(function() { mmTone(554, 0.06, 'sine', 0.06); }, 50);
    setTimeout(function() { mmTone(659, 0.08, 'sine', 0.07); }, 100);
    setTimeout(function() { mmTone(880, 0.12, 'sine', 0.08); }, 160);
  }
  function sfxMissionComplete() {
    [523, 659, 784, 1047, 1319].forEach(function(f, i) {
      setTimeout(function() { mmTone(f, 0.15, 'sine', 0.08); }, i * 120);
    });
  }

  // Ambient engine loop
  var _mmAmbient = null;
  function startMissionAmbient(type) {
    stopMissionAmbient();
    var ac = getMMAC(); if (!ac) return;
    try {
      var bufSize = ac.sampleRate * 2;
      var buf = ac.createBuffer(1, bufSize, ac.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
      var src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
      var filt = ac.createBiquadFilter();
      var master = ac.createGain();
      if (type === 'launch' || type === 'thrust') {
        filt.type = 'lowpass'; filt.frequency.value = 250;
        master.gain.setValueAtTime(0, ac.currentTime);
        master.gain.linearRampToValueAtTime(0.015, ac.currentTime + 1);
      } else if (type === 'space') {
        filt.type = 'bandpass'; filt.frequency.value = 400; filt.Q.value = 2;
        master.gain.setValueAtTime(0, ac.currentTime);
        master.gain.linearRampToValueAtTime(0.006, ac.currentTime + 2);
      } else if (type === 'eva') {
        // EVA suit breathing
        filt.type = 'bandpass'; filt.frequency.value = 600; filt.Q.value = 3;
        master.gain.setValueAtTime(0, ac.currentTime);
        master.gain.linearRampToValueAtTime(0.008, ac.currentTime + 1.5);
      }
      src.connect(filt); filt.connect(master); master.connect(ac.destination);
      src.start();
      _mmAmbient = { src: src, master: master };
      // Periodic radio chirps for space/EVA. Self-cleaning: if the tool has been
      // unmounted by ANY path (not just the Back button), the next tick notices the
      // root marker is gone and stops the loop + audio nodes — no leaked interval.
      if (type === 'space' || type === 'eva') {
        _mmAmbient._interval = setInterval(function() {
          if (!document.querySelector('[data-moonmission-tool]')) { stopMissionAmbient(); return; }
          if (Math.random() > 0.5) sfxRadioChirp();
        }, 4000 + Math.random() * 6000);
      }
    } catch(e) {}
  }
  function stopMissionAmbient() {
    if (_mmAmbient) {
      try {
        var ac = getMMAC();
        if (ac && _mmAmbient.master) _mmAmbient.master.gain.linearRampToValueAtTime(0, ac.currentTime + 0.5);
        if (_mmAmbient._interval) clearInterval(_mmAmbient._interval);
        var nodes = _mmAmbient;
        setTimeout(function() { try { nodes.src.stop(); } catch(e) {} }, 600);
      } catch(e) {}
      _mmAmbient = null;
    }
  }

  // (Removed the duplicate reduced-motion stylesheet — the shared
  // 'allo-stem-motion-reduce-css' block at the top of this file already covers it —
  // and the .text-slate-200 color override entirely: the app-wide version recolored
  // every .text-slate-200 in the whole app, and this tool mixes a light header with
  // dark mission panels, so ANY blanket override breaks one surface or the other.
  // The one problem element — the MET readout on the light header — now simply uses
  // a dark text class directly.)

  // ═══════════════════════════════════════════════════════════════
  // SHARED PROCEDURAL DRAWING HELPERS
  // Pure canvas draw functions used across all mission phases.
  // ═══════════════════════════════════════════════════════════════

  // Seeded PRNG — deterministic so craters/stars don't jump per frame
  function _seededRand(seed) {
    var s = (seed * 16807 + 1) % 2147483647;
    return { next: function() { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }, s: s };
  }

  // ── Detailed Earth with continents, clouds, atmosphere ──
  function drawDetailedEarth(ctx, cx, cy, r, tick) {
    if (r < 3) { ctx.fillStyle = '#3b82f6'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); return; }
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    // Ocean base
    var og = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.25, 0, cx, cy, r);
    og.addColorStop(0, '#4a9aea'); og.addColorStop(0.5, '#2563eb'); og.addColorStop(1, '#1e3a6e');
    ctx.fillStyle = og; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    // Continents (3 blobs, slowly rotating)
    var rot = (tick || 0) * 0.0008;
    ctx.fillStyle = '#3a8a3a';
    // Americas
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(rot + 0.3) * r * 0.15, cy - r * 0.55);
    ctx.bezierCurveTo(cx + Math.cos(rot + 0.1) * r * 0.35, cy - r * 0.3, cx + Math.cos(rot - 0.1) * r * 0.25, cy + r * 0.1, cx + Math.cos(rot + 0.2) * r * 0.1, cy + r * 0.45);
    ctx.bezierCurveTo(cx + Math.cos(rot + 0.4) * r * 0.0, cy + r * 0.2, cx + Math.cos(rot + 0.5) * r * -0.05, cy - r * 0.2, cx + Math.cos(rot + 0.3) * r * 0.15, cy - r * 0.55);
    ctx.fill();
    // Eurasia/Africa
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(rot + 2.5) * r * 0.1, cy - r * 0.45);
    ctx.bezierCurveTo(cx + Math.cos(rot + 2.8) * r * 0.45, cy - r * 0.35, cx + Math.cos(rot + 3.0) * r * 0.55, cy - r * 0.05, cx + Math.cos(rot + 2.9) * r * 0.35, cy + r * 0.15);
    ctx.bezierCurveTo(cx + Math.cos(rot + 2.6) * r * 0.2, cy + r * 0.45, cx + Math.cos(rot + 2.3) * r * 0.05, cy + r * 0.25, cx + Math.cos(rot + 2.5) * r * 0.1, cy - r * 0.45);
    ctx.fill();
    // Australia
    ctx.fillStyle = '#5a7a3a';
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(rot + 4.2) * r * 0.3, cy + r * 0.25);
    ctx.bezierCurveTo(cx + Math.cos(rot + 4.5) * r * 0.45, cy + r * 0.2, cx + Math.cos(rot + 4.6) * r * 0.45, cy + r * 0.4, cx + Math.cos(rot + 4.3) * r * 0.3, cy + r * 0.4);
    ctx.closePath(); ctx.fill();
    // Ice caps
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.beginPath(); ctx.ellipse(cx, cy - r * 0.88, r * 0.35, r * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.9, r * 0.25, r * 0.08, 0, 0, Math.PI * 2); ctx.fill();
    // Cloud swirls
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1, r * 0.04);
    var ct = (tick || 0) * 0.0003;
    for (var ci = 0; ci < 7; ci++) {
      var ca = ci * 0.9 + ct;
      var crr = r * (0.3 + ci * 0.08);
      ctx.beginPath();
      ctx.arc(cx + Math.cos(ca) * r * 0.2, cy + Math.sin(ca * 1.3) * r * 0.3, crr, ca, ca + 1.2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    // Atmosphere glow (outside clip)
    ctx.save();
    ctx.globalAlpha = 0.25;
    var ag = ctx.createRadialGradient(cx, cy, r, cx, cy, r * 1.2);
    ag.addColorStop(0, '#60a5fa'); ag.addColorStop(0.6, '#38bdf8'); ag.addColorStop(1, 'transparent');
    ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(cx, cy, r * 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.07;
    var ag2 = ctx.createRadialGradient(cx, cy, r * 1.1, cx, cy, r * 1.45);
    ag2.addColorStop(0, '#93c5fd'); ag2.addColorStop(1, 'transparent');
    ctx.fillStyle = ag2; ctx.beginPath(); ctx.arc(cx, cy, r * 1.45, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // ── Detailed Moon with procedural craters and mare ──
  function drawDetailedMoon(ctx, cx, cy, r, seed) {
    if (r < 5) { ctx.fillStyle = '#d1d5db'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); return; }
    var rng = _seededRand(seed || 42);
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    // Base shading with light source offset
    var mg = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx + r * 0.1, cy + r * 0.1, r);
    mg.addColorStop(0, '#e8e8e8'); mg.addColorStop(0.6, '#c8c8c8'); mg.addColorStop(1, '#8a8a8a');
    ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    // Mare regions (darker seas)
    ctx.fillStyle = 'rgba(80,80,90,0.18)';
    ctx.beginPath(); ctx.ellipse(cx - r * 0.15, cy - r * 0.2, r * 0.4, r * 0.3, -0.3, 0, Math.PI * 2); ctx.fill(); // Imbrium
    ctx.fillStyle = 'rgba(80,80,90,0.15)';
    ctx.beginPath(); ctx.ellipse(cx + r * 0.2, cy - r * 0.05, r * 0.25, r * 0.2, 0.2, 0, Math.PI * 2); ctx.fill(); // Serenitatis
    ctx.fillStyle = 'rgba(80,80,90,0.12)';
    ctx.beginPath(); ctx.ellipse(cx + r * 0.1, cy + r * 0.25, r * 0.3, r * 0.18, 0, 0, Math.PI * 2); ctx.fill(); // Tranquillitatis
    ctx.fillStyle = 'rgba(80,80,90,0.1)';
    ctx.beginPath(); ctx.ellipse(cx + r * 0.4, cy - r * 0.2, r * 0.12, r * 0.12, 0, 0, Math.PI * 2); ctx.fill(); // Crisium
    // Procedural craters
    var craterCount = Math.min(25, Math.max(8, Math.round(r * 0.5)));
    for (var ci = 0; ci < craterCount; ci++) {
      var ccx = cx + (rng.next() - 0.5) * r * 1.6;
      var ccy = cy + (rng.next() - 0.5) * r * 1.6;
      var cr = r * (0.02 + rng.next() * 0.1);
      // Only draw if inside the moon circle
      var dx = ccx - cx, dy = ccy - cy;
      if (Math.sqrt(dx * dx + dy * dy) + cr > r * 0.95) continue;
      // Crater shadow
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.beginPath(); ctx.arc(ccx, ccy, cr, 0, Math.PI * 2); ctx.fill();
      // Bright rim on sun-facing side
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = Math.max(0.5, cr * 0.15);
      ctx.beginPath(); ctx.arc(ccx, ccy, cr, -2.2, -0.5); ctx.stroke();
    }
    // Terminator shadow (day/night)
    var tg = ctx.createLinearGradient(cx + r * 0.3, cy, cx + r, cy);
    tg.addColorStop(0, 'transparent'); tg.addColorStop(1, 'rgba(0,0,0,0.55)'); // deeper terminator — lunar night is near-black
    ctx.fillStyle = tg; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
  }

  // ── Enhanced starfield with size/color variation ──
  function drawStarfield(ctx, W, H, tick, count) {
    var rng = _seededRand(7919); // fixed seed for stable positions
    var colors = ['#ffffff','#ffffff','#ffffff','#ffffff','#ffffff','#ffffff','#ffffff',
                  '#b8c8ff','#b8c8ff','#fff5d0','#ffd8b0'];
    for (var si = 0; si < (count || 100); si++) {
      var sx = rng.next() * W;
      var sy = rng.next() * H;
      var sr = 0.3 + rng.next() * 1.5;
      var sc = colors[Math.floor(rng.next() * colors.length)];
      var twinkle = 0.7 + 0.3 * Math.sin((tick || 0) * 0.004 + si * 1.7); // smooth breath (the abs() cusp made stars snap at their dimmest)
      ctx.globalAlpha = twinkle;
      ctx.fillStyle = sc;
      ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ── Cinematic vignette overlay ──
  function drawVignette(ctx, W, H, intensity) {
    var vg = ctx.createRadialGradient(W * 0.5, H * 0.5, Math.min(W, H) * 0.3, W * 0.5, H * 0.5, Math.max(W, H) * 0.7);
    vg.addColorStop(0, 'transparent'); vg.addColorStop(1, 'rgba(0,0,0,' + (intensity || 0.25) + ')');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  }

  // ═══════════════════════════════════════════════════════════════
  // END SHARED HELPERS
  // ═══════════════════════════════════════════════════════════════

  // WCAG live region
  (function() {
    if (document.getElementById('allo-live-moonmission')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-moonmission';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();

  // Inject phase transition animation
  if (!document.getElementById('moon-mission-anim')) {
    var _mmStyle = document.createElement('style');
    _mmStyle.id = 'moon-mission-anim';
    _mmStyle.textContent = '@keyframes mmFadeSlideIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }';
    document.head.appendChild(_mmStyle);
  }

  window.StemLab.registerTool('moonMission', {
    icon: '\uD83D\uDE80',
    label: 'Moon Mission',
    desc: 'Live a 10-phase Apollo mission from Kennedy to splashdown. Pick decisions at real Apollo moments (oxygen leak, landing fuel margin, abort thresholds), land the Lunar Module, collect rock samples, and decode the science of orbital mechanics + EVA. Includes Apollo historical facts and AI-customizable mission objectives from any source text.',
    color: 'slate',
    category: 'science',
    questHooks: [
      { id: 'complete_mission', label: 'Complete the full Moon mission', icon: '\uD83C\uDF0A', check: function(d) { return (d.missionPhase || 0) >= 10; }, progress: function(d) { return 'Phase ' + ((d.missionPhase || 0) + 1) + '/10'; } },
      { id: 'collect_4_samples', label: 'Collect 4+ lunar rock samples', icon: '\uD83E\uDEA8', check: function(d) { return (d.lunarSamples || []).length >= 4; }, progress: function(d) { return (d.lunarSamples || []).length + '/4 samples'; } },
      { id: 'collect_all_samples', label: 'Collect all 8 sample types', icon: '\uD83D\uDC8E', check: function(d) { return (d.lunarSamples || []).length >= 8; }, progress: function(d) { return (d.lunarSamples || []).length + '/8 samples'; } },
      { id: 'quiz_5_correct', label: 'Answer 5+ space quiz questions correctly', icon: '\uD83C\uDF93', check: function(d) { return (d.quizCorrect || 0) >= 5; }, progress: function(d) { return (d.quizCorrect || 0) + '/5 correct'; } },
      { id: 'land_on_moon', label: 'Successfully land the Lunar Module', icon: '\uD83C\uDF15', check: function(d) { return (d.missionPhase || 0) >= 6; }, progress: function(d) { return (d.missionPhase || 0) >= 6 ? 'Landed!' : 'Not yet'; } },
      { id: 'commander_mode', label: 'Complete on Commander difficulty', icon: '\uD83D\uDE80', check: function(d) { return (d.missionPhase || 0) >= 10 && d.difficulty === 'commander'; }, progress: function(d) { return d.difficulty === 'commander' ? ((d.missionPhase || 0) >= 10 ? 'Done!' : 'In progress') : 'Wrong difficulty'; } }
    ],
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var addToast = ctx.addToast;
      // honor the 2nd-arg English fallback (ctx.t is single-arg & ignores it; see dev-tools/check_i18n_fallback.cjs)
      var t = function (k, fb) { var v; try { v = (typeof ctx.t === 'function') ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      var ArrowLeft = ctx.icons.ArrowLeft;
      var awardStemXP = ctx.awardXP;
      var callTTS = ctx.callTTS;
      var callGemini = ctx.callGemini;
      var sourceText = ctx.sourceText || ctx.inputText || '';
      var announceToSR = ctx.announceToSR;
      var gradeLevel = ctx.gradeLevel;

      // ── State Management ──
      var d = (labToolData && labToolData.moonMission) || {};
      function upd(key, val) {
        var patch = {};
        patch[key] = val;
        setLabToolData(function(prev) {
          return Object.assign({}, prev, { moonMission: Object.assign({}, (prev && prev.moonMission) || {}, patch) });
        });
      }

      var phase = d.missionPhase || 0;
      var missionLog = d.missionLog || [];
      var missionXP = d.missionXP || 0;
      var samples = d.lunarSamples || [];

      function log(entry) {
        var newLog = (d.missionLog || []).slice();
        newLog.push({ text: entry, time: new Date().toLocaleTimeString() });
        upd('missionLog', newLog);
      }

      function setPhase(p) {
        upd('missionPhase', p);
        var phaseName = PHASES[p] ? PHASES[p].name : 'Mission Complete';
        if (typeof announceToSR === 'function') announceToSR('Mission phase ' + (p + 1) + ' of 10: ' + phaseName + '. ' + (PHASES[p] ? PHASES[p].desc : 'The mission is complete.'));
        // Phase-specific sounds + ambient audio
        sfxPhaseAdvance();
        if (p === 1) { sfxLaunch(); startMissionAmbient('launch'); if (window._alloHaptic) window._alloHaptic('launch'); } // Launch
        else if (p === 2) { sfxStageSeparation(); startMissionAmbient('space'); if (window._alloHaptic) window._alloHaptic('bump'); } // Earth Orbit
        else if (p === 3) { sfxEngineIgnition(); startMissionAmbient('space'); }  // Trans-Lunar
        else if (p === 4) { sfxThrust(); startMissionAmbient('space'); }          // Lunar Orbit
        else if (p === 5) { sfxThrust(); startMissionAmbient('thrust'); if (window._alloHaptic) window._alloHaptic('launch'); } // Powered Descent
        else if (p === 6) { sfxLanding(); startMissionAmbient('eva'); if (window._alloHaptic) window._alloHaptic('land'); } // Moonwalk EVA
        else if (p === 7) { sfxEngineIgnition(); startMissionAmbient('thrust'); } // Lunar Ascent
        else if (p === 8) { sfxStageSeparation(); startMissionAmbient('space'); } // Trans-Earth
        else if (p === 9) { sfxSplashdown(); stopMissionAmbient(); }              // Re-entry
        else if (p >= 10) { sfxMissionComplete(); stopMissionAmbient(); }         // Complete
      }

      var _xpPending = 0;   // accumulates within one render pass so two same-pass awards (e.g. double badge unlock) don't overwrite each other off the stale snapshot
      function addXP(amount) {
        _xpPending += amount;
        upd('missionXP', (d.missionXP || 0) + _xpPending);
        if (typeof awardStemXP === 'function') awardStemXP('moonMission', amount);
      }

      // ── Mission Event System ──
      // advancePhase checks for eligible events before advancing. If an event
      // triggers, it shows the event modal and delays the phase transition until
      // the student makes a choice.
      function advancePhase(targetPhase) {
        var resolved = d.resolvedEvents || [];
        var eligible = MISSION_EVENTS.filter(function(evt) {
          return evt.phases.indexOf(targetPhase) >= 0
            && evt.difficulty.indexOf(difficulty) >= 0
            && resolved.indexOf(evt.id) < 0
            && Math.random() < (evt.probability * (diffSettings.eventFreq || 0.5));
        });
        if (eligible.length > 0) {
          var event = eligible[Math.floor(Math.random() * eligible.length)];
          upd('activeEvent', event);
          upd('eventPhaseTarget', targetPhase);
          log('\u26A0\uFE0F Mission Event: ' + event.title);
          if (typeof announceToSR === 'function') announceToSR('Mission event: ' + event.title + '. ' + event.scenario);
        } else {
          setPhase(targetPhase);
        }
      }

      function resolveEvent(event, chosenOption) {
        // Log the decision
        var newLog = (d.decisionLog || []).slice();
        var optimalLabel = '';
        for (var oi = 0; oi < event.options.length; oi++) { if (event.options[oi].quality === 'optimal') { optimalLabel = event.options[oi].label; break; } }
        newLog.push({
          eventId: event.id, title: event.title, chosen: chosenOption.label,
          quality: chosenOption.quality, optimal: optimalLabel,
          historical: event.historical, scienceReward: chosenOption.scienceReward
        });
        upd('decisionLog', newLog);
        // Mark event as resolved
        var resolved = (d.resolvedEvents || []).slice();
        resolved.push(event.id);
        upd('resolvedEvents', resolved);
        // Apply resource effects (currently morale only; expanded in Phase 2)
        if (chosenOption.effects) {
          if (chosenOption.effects.morale) upd('crewMorale', Math.max(0, Math.min(100, (d.crewMorale || 75) + chosenOption.effects.morale)));
        }
        // Award XP
        if (chosenOption.xp) addXP(chosenOption.xp);
        // Show outcome
        upd('eventOutcome', { outcome: chosenOption.scienceReward, quality: chosenOption.quality, label: chosenOption.label });
        upd('activeEvent', null);
        log((chosenOption.quality === 'optimal' ? '\u2B50' : chosenOption.quality === 'adequate' ? '\u2705' : '\u26A0\uFE0F') + ' ' + chosenOption.label);
        if (addToast) addToast(chosenOption.quality === 'optimal' ? '\u2B50 Excellent decision!' : chosenOption.quality === 'adequate' ? '\u2705 Acceptable solution' : '\u26A0\uFE0F Suboptimal choice \u2014 see the science note', chosenOption.quality === 'optimal' ? 'success' : 'info');
      }

      // ── Mission Data ──
      var PHASES = [
        { name: t('stem.moonmission.mission_briefing', 'Mission Briefing'), icon: '\uD83D\uDCCB', desc: t('stem.moonmission.review_your_mission_objectives_and_cre', 'Review your mission objectives and crew assignment') },
        { name: t('stem.moonmission.launch', 'Launch'), icon: '\uD83D\uDE80', desc: t('stem.moonmission.countdown_and_liftoff_from_kennedy_spa', 'Countdown and liftoff from Kennedy Space Center') },
        { name: t('stem.moonmission.earth_orbit', 'Earth Orbit'), icon: '\uD83C\uDF0D', desc: t('stem.moonmission.reach_low_earth_orbit_and_prepare_for_', 'Reach low Earth orbit and prepare for trans-lunar injection') },
        { name: t('stem.moonmission.trans_lunar_coast', 'Trans-Lunar Coast'), icon: '\uD83C\uDF11', desc: t('stem.moonmission.3_day_journey_to_the_moon_384_400_km', '3-day journey to the Moon \u2014 384,400 km') },
        { name: t('stem.moonmission.lunar_orbit', 'Lunar Orbit'), icon: '\uD83C\uDF15', desc: t('stem.moonmission.enter_orbit_around_the_moon', 'Enter orbit around the Moon') },
        { name: t('stem.moonmission.powered_descent', 'Powered Descent'), icon: '\u2B07\uFE0F', desc: t('stem.moonmission.pilot_the_lunar_module_to_the_surface', 'Pilot the Lunar Module to the surface') },
        { name: t('stem.moonmission.moonwalk_eva', 'Moonwalk EVA'), icon: '\uD83D\uDC68\u200D\uD83D\uDE80', desc: t('stem.moonmission.explore_the_lunar_surface_and_collect_', 'Explore the lunar surface and collect samples') },
        { name: t('stem.moonmission.lunar_ascent', 'Lunar Ascent'), icon: '\u2B06\uFE0F', desc: t('stem.moonmission.launch_from_the_moon_and_rendezvous_wi', 'Launch from the Moon and rendezvous with Command Module') },
        { name: t('stem.moonmission.trans_earth_coast', 'Trans-Earth Coast'), icon: '\uD83C\uDF0D', desc: t('stem.moonmission.return_journey_to_earth', 'Return journey to Earth') },
        { name: t('stem.moonmission.re_entry_splashdown', 'Re-entry & Splashdown'), icon: '\uD83C\uDF0A', desc: t('stem.moonmission.survive_re_entry_and_splash_down_in_th', 'Survive re-entry and splash down in the Pacific') }
      ];

      var CREW_ROLES = [
        { role: 'Commander (CDR)', name: 'You', desc: t('stem.moonmission.pilots_the_lunar_module_to_the_surface', 'Pilots the Lunar Module to the surface and leads the EVA'), tasks: 'Landing decisions, EVA leadership, sample selection' },
        { role: 'Command Module Pilot (CMP)', name: t('stem.moonmission.alex', 'Alex'), desc: t('stem.moonmission.orbits_the_moon_alone_in_the_command_m', 'Orbits the Moon alone in the Command Module while CDR and LMP explore'), tasks: 'Orbital science, photography, rendezvous navigation' },
        { role: 'Lunar Module Pilot (LMP)', name: t('stem.moonmission.jordan', 'Jordan'), desc: t('stem.moonmission.assists_with_descent_and_eva_operates_', 'Assists with descent and EVA, operates scientific instruments'), tasks: 'Systems monitoring, instrument deployment, sample documentation' }
      ];

      var APOLLO_FACTS = [
        'Apollo 11 landed on July 20, 1969. Neil Armstrong and Buzz Aldrin spent 2 hours 31 minutes on the surface.',
        'The Saturn V rocket stood 110.6 meters tall \u2014 taller than the Statue of Liberty.',
        'The Command Module had about the same interior space as a large car.',
        'Apollo astronauts left retroreflectors on the Moon that scientists still bounce lasers off today.',
        'The total Apollo program cost $25.4 billion (about $200 billion in today\'s dollars).',
        'Apollo 13\'s famous "Houston, we\'ve had a problem" was actually said by Jack Swigert, not Tom Hanks.',
        'Several Apollo astronauts said Moon dust smelled like spent gunpowder after it was brought into the cabin.',
        'Long exposure to unfiltered sunlight likely faded the Apollo flags; LRO images show several flag poles still casting shadows.',
        'The Lunar Module had less computing power than a modern calculator.',
        'Apollo 17\'s Gene Cernan was the last human to walk on the Moon (December 1972).',
        'The astronauts\' bootprints will last millions of years \u2014 there\'s no wind or rain to erode them.',
        'The Moon is moving away from Earth at 3.8 cm per year.'
      ];

      var LUNAR_SAMPLES_DATA = [
        { name: t('stem.moonmission.anorthosite', 'Anorthosite'), icon: '\u26AA', type: 'Highland Rock', xp: 15, fact: t('stem.moonmission.this_ancient_rock_from_the_lunar_highl', 'This ancient rock from the lunar highlands is 4.4 billion years old \u2014 nearly as old as the Moon itself. It tells us the Moon once had a global magma ocean.') },
        { name: t('stem.moonmission.basalt', 'Basalt'), icon: '\u26AB', type: 'Mare Rock', xp: 10, fact: t('stem.moonmission.dark_volcanic_basalt_filled_the_moon_s', 'Dark volcanic basalt filled the Moon\'s giant impact basins to create the dark "seas" (maria) visible from Earth. These lavas erupted 3-3.5 billion years ago.') },
        { name: t('stem.moonmission.breccia', 'Breccia'), icon: '\uD83D\uDFE4', type: 'Impact Rock', xp: 12, fact: t('stem.moonmission.a_jumbled_mix_of_rock_fragments_welded', 'A jumbled mix of rock fragments welded together by meteorite impacts. The Moon\'s surface has been pounded for 4+ billion years.') },
        { name: t('stem.moonmission.regolith_core', 'Regolith Core'), icon: '\uD83E\uDEA8', type: 'Soil Sample', xp: 8, fact: t('stem.moonmission.lunar_soil_is_ground_up_rock_from_bill', 'Lunar soil is ground-up rock from billions of years of micrometeorite bombardment. It contains tiny glass beads and even traces of solar wind particles.') },
        { name: t('stem.moonmission.orange_soil', 'Orange Soil'), icon: '\uD83D\uDFE0', type: 'Volcanic Glass', xp: 20, fact: t('stem.moonmission.apollo_17_found_orange_soil_tiny_glass', 'Apollo 17 found orange soil \u2014 tiny glass beads from an ancient volcanic eruption 3.7 billion years ago. This was one of Apollo\'s most exciting discoveries!') },
        { name: t('stem.moonmission.kreep_basalt', 'KREEP Basalt'), icon: '\uD83D\uDC8E', type: 'Rare Mineral', xp: 25, fact: t('stem.moonmission.kreep_stands_for_potassium_k_rare_eart', 'KREEP stands for Potassium (K), Rare Earth Elements, and Phosphorus. These minerals concentrated in the last dregs of the lunar magma ocean.') },
        { name: t('stem.moonmission.impact_glass', 'Impact Glass'), icon: '\u2728', type: 'Glass Bead', xp: 10, fact: t('stem.moonmission.meteorite_impacts_melt_rock_into_glass', 'Meteorite impacts melt rock into glass that flies through space and lands as tiny spheres. Some contain trapped gases from the ancient lunar atmosphere.') },
        { name: t('stem.moonmission.genesis_rock', 'Genesis Rock'), icon: '\uD83D\uDCA0', type: 'Primordial', xp: 30, fact: t('stem.moonmission.apollo_15_found_this_4_1_billion_year_', 'Apollo 15 found this 4.1 billion year old anorthosite, one of the oldest rocks ever collected. It helped prove the magma ocean theory of the Moon\'s formation.') }
      ];

      // ── Quiz Questions (shown between key phases) ──
      // Each question carries `why` — one short line PER DISTRACTOR explaining why that
      // specific wrong pick is wrong (null at the correct index). Misconception-targeted
      // feedback beats bare right/wrong (same pattern as the physics tool's predict quiz).
      var QUIZ_BANK = [
        { q: 'How far is the Moon from Earth?', opts: ['38,440 km', '384,400 km', '3,844,000 km', '38,440,000 km'], a: 1, fact: t('stem.moonmission.the_moon_is_about_384_400_km_away_ligh', 'The Moon is about 384,400 km away \u2014 light takes 1.3 seconds to travel there!'), why: ['That would put the Moon closer than many satellites — about 1/10 of the real distance.', null, 'That is ~10× too far — at that range the Moon would look tiny in our sky.', 'That is ~100× too far — a good fraction of the way to Venus.'] },
        { q: 'How long does it take to reach the Moon?', opts: ['3 hours', '3 days', '3 weeks', '3 months'], a: 1, fact: t('stem.moonmission.apollo_missions_took_about_3_days_each', 'Apollo missions took about 3 days each way, reaching ~39,000 km/h at injection, then coasting slower as it climbed away from Earth.'), why: ['3 hours barely gets you to high Earth orbit — the Moon is ~1,000× farther than the ISS.', null, '3 weeks would mean crawling — even the slowing coast averaged ~5,000 km/h.', '3 months is interplanetary-cruise territory, not a lunar hop.'] },
        { q: 'What is the Moon\'s gravity compared to Earth?', opts: ['1/2', '1/4', '1/6', '1/10'], a: 2, fact: t('stem.moonmission.the_moon_s_gravity_is_1_6_of_earth_s_a', 'The Moon\'s gravity is 1/6 of Earth\'s. A 70 kg person still has 70 kg of mass, but their weight feels like about 12 kg on Earth.'), why: ['1/2 would feel almost Earth-normal — no bunny-hop gait.', '1/4 is closer to Mars (~3/8) — still too strong for the footage you have seen.', null, 'At 1/10 the famous loping gait would look even floatier than it does.'] },
        { q: 'What is the temperature on the Moon\'s sunlit side?', opts: ['50\u00B0C', '127\u00B0C', '200\u00B0C', '327\u00B0C'], a: 1, fact: t('stem.moonmission.the_sunlit_side_reaches_127_c_while_th', 'The sunlit side reaches 127\u00B0C, while the dark side drops to -173\u00B0C!'), why: ['50 Celsius is just a hot day on Earth \u2014 with no atmosphere the Moon swings far wider.', null, 'Hotter than daytime regolith actually gets \u2014 the Moon receives the same sunlight as Earth, just unfiltered.', 'That is Mercury-dayside territory \u2014 the Moon is no closer to the Sun than Earth is.'] },
        { q: 'How many people have walked on the Moon?', opts: ['2', '6', '12', '24'], a: 2, fact: t('stem.moonmission.12_astronauts_walked_on_the_moon_acros', '12 astronauts walked on the Moon across Apollo 11, 12, 14, 15, 16, and 17.'), why: ['2 was just Apollo 11 — five more landings followed.', '6 is the number of LANDINGS — two astronauts walked on each.', null, '24 is roughly how many FLEW to the Moon (including orbit-only crews) — only half walked.'] },
        { q: 'What was the first word in Armstrong\'s famous landing report after touchdown?', opts: ['"Houston"', '"Tranquility"', '"Eagle"', '"That\'s"'], a: 0, fact: t('stem.moonmission.buzz_aldrin_said_contact_light_first_b', 'Armstrong reported: "Houston, Tranquility Base here. The Eagle has landed." Aldrin\'s technical "Contact light" call came just before touchdown.'), why: [null, '“Tranquility” came a beat later, in “Tranquility Base here”.', '“Eagle” was later in the sentence, not the first word.', 'The famous “one small step” line came hours later, on the ladder.'] },
        { q: 'What fuel did the Saturn V first stage use?', opts: ['Hydrogen', 'Kerosene (RP-1)', 'Methane', 'Solid fuel'], a: 1, fact: t('stem.moonmission.the_first_stage_burned_rp_1_kerosene_w', 'The first stage burned RP-1 kerosene with liquid oxygen \u2014 2,000+ tons of fuel in 2.5 minutes!'), why: ['Liquid hydrogen powered the SECOND and THIRD stages — too low-thrust-per-volume for liftoff.', null, 'Methane engines are a modern design — nothing flew on methane in the 1960s.', 'Big solid boosters came with the Shuttle era — the Saturn V was all-liquid.'] },
        { q: 'Why can\'t sound travel through open air on the Moon?', opts: ['Too cold', 'No atmosphere', 'Too much gravity', 'Solar radiation'], a: 1, fact: t('stem.moonmission.sound_needs_a_medium_air_water_to_trav', 'Sound needs matter to vibrate through. With almost no atmosphere, the Moon cannot carry ordinary open-air sound, though astronauts still hear radios and vibrations through suits or equipment.'), why: ['Cold does not stop sound — it travels fine through cold air and even solid ice.', null, 'Lunar gravity is WEAKER (1/6), and gravity does not carry sound anyway.', 'Radiation has nothing to do with it — sound just needs matter to vibrate.'] },
        { q: 'What does Moon dust smell like after it is brought inside a cabin?', opts: ['Nothing', 'Spent gunpowder', 'Sulfur', 'Roses'], a: 1, fact: t('stem.moonmission.every_apollo_astronaut_reported_that_m', 'Several Apollo astronauts reported that Moon dust smelled like spent gunpowder when brought inside the LM.'), why: ['Astronaut reports describe a noticeable smell once the dust came inside the LM.', null, 'Sulfur is a volcanic-Earth smell — lunar dust smelled burnt, not rotten.', 'Apollo reports point to “spent gunpowder,” not flowers.'] },
        { q: 'How old are the oldest Moon rocks collected?', opts: ['1 billion years', '2.5 billion years', '4.4 billion years', '6 billion years'], a: 2, fact: t('stem.moonmission.the_oldest_moon_rocks_are_4_4_billion_', 'The oldest Moon rocks are 4.4 billion years old \u2014 nearly as old as the solar system itself!'), why: ['1 billion years is younger than nearly all of the lunar surface.', '2.5 billion is still younger than the ancient highland crust the crews sampled.', null, '6 billion years would be older than the solar system itself (4.6 billion).'] }
      ];

      // ── AI-customized content override ──
      // When the teacher ran "Customize from source text," d.aiBriefing holds a parsed
      // { objectives, quiz, samples } object. Use that content in place of the hardcoded
      // defaults so the mission ties to the teacher's uploaded material.
      if (d.aiBriefing && typeof d.aiBriefing === 'object') {
        try {
          if (Array.isArray(d.aiBriefing.samples) && d.aiBriefing.samples.length >= 4) {
            // Preserve icons/types from defaults; apply AI names/facts/descriptions.
            LUNAR_SAMPLES_DATA = d.aiBriefing.samples.slice(0, 8).map(function(s, i) {
              var fallback = LUNAR_SAMPLES_DATA[i] || LUNAR_SAMPLES_DATA[0];
              return {
                name: String(s.name || fallback.name).substring(0, 30),
                icon: fallback.icon,
                type: String(s.desc || fallback.type).substring(0, 60),
                xp: typeof s.xp === 'number' ? Math.max(5, Math.min(30, s.xp)) : fallback.xp,
                fact: String(s.fact || fallback.fact).substring(0, 280)
              };
            });
          }
          if (Array.isArray(d.aiBriefing.quiz) && d.aiBriefing.quiz.length >= 3) {
            QUIZ_BANK = d.aiBriefing.quiz.slice(0, 10).filter(function(q) {
              return q && typeof q.q === 'string' && Array.isArray(q.opts) && q.opts.length >= 2 && typeof q.a === 'number';
            }).map(function(q) {
              return {
                q: String(q.q).substring(0, 220),
                opts: q.opts.slice(0, 4).map(function(o) { return String(o).substring(0, 80); }),
                a: Math.max(0, Math.min((q.opts.length - 1), q.a)),
                fact: String(q.fact || '').substring(0, 220)
              };
            });
            if (QUIZ_BANK.length < 3) {
              // Fallback: if validation dropped too many, restore defaults.
              QUIZ_BANK = [
                { q: 'How far is the Moon from Earth?', opts: ['38,440 km', '384,400 km', '3,844,000 km', '38,440,000 km'], a: 1, fact: t('stem.moonmission.the_moon_is_about_384_400_km_away_ligh_2', 'The Moon is about 384,400 km away \u2014 light takes 1.3 seconds to travel there!') }
              ];
            }
          }
        } catch (_aiErr) { /* fall back to defaults on any parsing issue */ }
      }

      // ═══════════════════════════════════════════════════════════════
      // MISSION EVENTS — Strategic decision points inspired by real missions
      // Each event triggers at phase transitions, presents 2-3 options with
      // different resource effects and quality grades, and logs the choice
      // for post-mission debrief analysis.
      // ═══════════════════════════════════════════════════════════════
      var MISSION_EVENTS = [
        {
          id: 'toilet_clog', title: t('stem.moonmission.waste_management_malfunction', 'Waste Management Malfunction'), emoji: '\uD83D\uDEBD',
          phases: [3, 8], difficulty: ['pilot', 'commander'], probability: 0.7,
          historical: 'Illustrative scenario (based on real spacecraft waste-system failures — Apollo 10 famously logged one, and Skylab and ISS crews fought vent-line freezing): frozen liquid blocks a vent line, and the fix is rotating the spacecraft so sunlight thaws the blockage via thermal radiation through the vacuum of space.',
          scenario: 'Houston reports a blockage in the waste management vent line. Frozen waste is preventing the toilet from functioning. With days of coast ahead, this needs solving \u2014 crew comfort and hygiene are critical for mission success.',
          stemConcepts: ['thermal radiation', 'phase changes of matter', 'heat transfer in vacuum'],
          options: [
            { label: t('stem.moonmission.rotate_spacecraft_to_expose_vent_to_su', 'Rotate spacecraft to expose vent to sunlight'), icon: '\u2600\uFE0F',
              effects: { morale: 10 }, quality: 'optimal', xp: 20,
              scienceReward: 'Thermal radiation travels through the vacuum of space \u2014 no air needed! The Sun delivers 1,361 watts per square meter. By rotating Orion, the crew used the Sun as a giant space heater. This is the same principle that makes the sunlit side of the Moon reach 127\u00B0C while the dark side drops to -173\u00B0C.' },
            { label: t('stem.moonmission.reroute_cabin_heater_duct_to_warm_the_', 'Reroute cabin heater duct to warm the pipe'), icon: '\uD83D\uDD25',
              effects: { morale: 5 }, quality: 'adequate', xp: 10,
              scienceReward: 'Conduction transfers heat through direct contact between molecules. It works, but uses electrical power from your limited fuel cell supply \u2014 and fuel cells also generate your oxygen and drinking water!' },
            { label: t('stem.moonmission.seal_the_vent_and_use_backup_waste_bag', 'Seal the vent and use backup waste bags'), icon: '\uD83D\uDDC4\uFE0F',
              effects: { morale: -10 }, quality: 'poor', xp: 5,
              scienceReward: 'Apollo astronauts (1969-1972) had NO toilet at all \u2014 they used adhesive collection bags for every bathroom visit. In microgravity, this was extremely difficult and unpleasant. The modern $23 million Universal Waste Management System was designed to fix this, but as every crewed program since has re-learned, space plumbing is hard!' }
          ]
        },
        {
          id: 'program_alarm', title: t('stem.moonmission.program_alarm_1202', 'Program Alarm 1202!'), emoji: '\u26A0\uFE0F',
          phases: [5], difficulty: ['pilot', 'commander'], probability: 0.8,
          historical: 'Apollo 11 (July 1969): During powered descent, the guidance computer triggered a 1202 "executive overflow" alarm \u2014 it was overloaded with data from the rendezvous radar left on by mistake. 26-year-old engineer Steve Bales in Mission Control made the call: "GO!" Armstrong continued the landing.',
          scenario: 'WARNING: The guidance computer is flashing a 1202 alarm \u2014 executive overflow! The computer is being asked to do more calculations than it can handle. The landing radar and rendezvous radar are both demanding processing time. You have seconds to decide.',
          stemConcepts: ['computer architecture', 'priority scheduling', 'real-time systems'],
          options: [
            { label: t('stem.moonmission.trust_the_computer_and_continue_go', 'Trust the computer and continue \u2014 "GO!"'), icon: '\u2705',
              effects: { morale: 15 }, quality: 'optimal', xp: 25,
              scienceReward: 'The Apollo Guidance Computer had just 74 KB of memory and ran at 0.043 MHz \u2014 thousands of times slower than your phone. But its software used a brilliant priority-based scheduling system designed by MIT\'s Margaret Hamilton. Low-priority tasks were shed automatically so critical navigation could continue. This is the same "priority scheduling" concept used in every modern operating system!' },
            { label: t('stem.moonmission.abort_the_descent_fire_ascent_engine', 'Abort the descent \u2014 fire ascent engine'), icon: '\uD83D\uDD3A',
              effects: { morale: -5 }, quality: 'adequate', xp: 10,
              scienceReward: 'An abort during powered descent was always an option. The abort guidance system (AGS) was a completely separate computer that could return the LM to orbit independently. Redundancy \u2014 having backup systems \u2014 is a core principle of engineering safety.' },
            { label: t('stem.moonmission.switch_to_full_manual_control', 'Switch to full manual control'), icon: '\uD83D\uDD79\uFE0F',
              effects: { morale: 5 }, quality: 'risky', xp: 15,
              scienceReward: 'Armstrong actually DID take semi-manual control during the final approach, using the hand controller to fly past a boulder field. But full manual control without ANY computer assistance would require superhuman precision \u2014 the computer was still calculating altitude and velocity even when Armstrong steered.' }
          ]
        },
        {
          id: 'boulder_field', title: t('stem.moonmission.boulder_field_at_landing_site', 'Boulder Field at Landing Site!'), emoji: '\uD83E\uDEA8',
          phases: [5], difficulty: ['tourist', 'pilot', 'commander'], probability: 0.65,
          historical: 'Apollo 11 (1969): Armstrong saw the computer was guiding Eagle toward a crater filled with boulders "the size of automobiles." He took manual control and flew 500 meters past the danger zone, landing with just 25 seconds of fuel remaining. Mission Control called: "60 seconds!" then "30 seconds!"',
          scenario: 'Looking out the window, you see the automated guidance is targeting a field of boulders! Large rocks surround the planned landing zone. You need to decide: trust the computer, take manual control, or abort.',
          stemConcepts: ['terrain analysis', 'fuel management', 'risk assessment'],
          options: [
            { label: t('stem.moonmission.take_manual_control_and_fly_past_the_b', 'Take manual control and fly past the boulders'), icon: '\uD83D\uDD79\uFE0F',
              effects: { morale: 15 }, quality: 'optimal', xp: 25,
              scienceReward: 'Armstrong flew the LM like a helicopter, translating horizontally while descending. This cost precious fuel but saved the mission. When he landed, only 25 seconds of hover fuel remained \u2014 about 200 kg of Aerozine-50 and nitrogen tetroxide. The fuel margin was so thin that a single additional hover would have triggered a mandatory abort.' },
            { label: t('stem.moonmission.land_where_the_computer_says', 'Land where the computer says'), icon: '\uD83E\uDD16',
              effects: { morale: -15 }, quality: 'poor', xp: 5,
              scienceReward: 'The guidance computer\'s landing target was calculated from orbital photographs, but those photos couldn\'t show every boulder. The lesson: automation is powerful but humans must monitor and override when reality differs from the plan. This is called "human-in-the-loop" design.' },
            { label: t('stem.moonmission.abort_and_try_again_next_orbit', 'Abort and try again next orbit'), icon: '\uD83D\uDD04',
              effects: { morale: -5 }, quality: 'adequate', xp: 10,
              scienceReward: 'Aborting and re-orbiting was always an option, but it would cost fuel and delay the landing by 2 hours. In some scenarios, discretion IS the better part of valor \u2014 but Armstrong\'s instinct told him he could make it, and he was right.' }
          ]
        },
        {
          id: 'fuel_cell_stir', title: t('stem.moonmission.oxygen_tank_pressure_spike', 'Oxygen Tank Pressure Spike'), emoji: '\u26A1',
          phases: [3, 8], difficulty: ['commander'], probability: 0.6,
          historical: 'Apollo 13 (April 1970): A routine "cryo stir" of the oxygen tanks caused an explosion that crippled the Service Module. The crew survived by using the Lunar Module as a lifeboat \u2014 one of the greatest rescues in history. Commander Lovell, Pilot Haise, and Pilot Swigert improvised solutions for 4 days.',
          scenario: 'During a routine cryogenic tank stir, you hear a loud bang and see the pressure gauge in O\u2082 Tank 2 spiking wildly. Cabin pressure is fluctuating. Houston is analyzing telemetry urgently.',
          stemConcepts: ['cryogenics', 'gas laws (Boyle\'s Law)', 'electrical systems', 'emergency procedures'],
          options: [
            { label: t('stem.moonmission.immediately_isolate_tank_2_and_switch_', 'Immediately isolate Tank 2 and switch to Tank 1'), icon: '\uD83D\uDEE1\uFE0F',
              effects: { morale: 5 }, quality: 'optimal', xp: 20,
              scienceReward: 'Cryogenic oxygen is stored at -183\u00B0C under extreme pressure. When pressure rises uncontrollably, the risk is rupture. Isolating the faulty tank preserves your remaining oxygen supply. Boyle\'s Law (P\u00D7V = constant at fixed temperature) tells us that as the tank heats up, pressure increases proportionally \u2014 that\'s what the gauges showed.' },
            { label: t('stem.moonmission.vent_tank_2_to_relieve_pressure', 'Vent Tank 2 to relieve pressure'), icon: '\uD83D\uDCA8',
              effects: { morale: -5 }, quality: 'adequate', xp: 10,
              scienceReward: 'Venting releases the pressure but wastes oxygen into space. On Apollo 13, the crew eventually lost ALL oxygen from the Service Module. They survived because the Lunar Module had its own independent life support \u2014 a lesson in the importance of redundant systems.' },
            { label: t('stem.moonmission.try_to_reset_the_tank_heater_circuit', 'Try to reset the tank heater circuit'), icon: '\uD83D\uDD27',
              effects: { morale: -10 }, quality: 'poor', xp: 5,
              scienceReward: 'On Apollo 13, the explosion was caused by damaged wiring inside the tank \u2014 a manufacturing defect from years earlier. Attempting to reset would have made it worse. This teaches a critical engineering principle: when you don\'t understand the root cause, don\'t poke at it \u2014 stabilize first, diagnose second.' }
          ]
        },
        {
          id: 'space_sickness', title: t('stem.moonmission.space_adaptation_syndrome', 'Space Adaptation Syndrome'), emoji: '\uD83E\uDD22',
          phases: [2, 3], difficulty: ['tourist', 'pilot', 'commander'], probability: 0.5,
          historical: 'About 60-80% of astronauts experience Space Adaptation Syndrome (SAS) in the first 1-3 days. Senator Jake Garn\'s 1985 Shuttle flight was so severe that NASA informally named the unit of space sickness the "Garn" \u2014 1 Garn being the maximum possible nausea.',
          scenario: 'A crew member is experiencing severe nausea and disorientation. In microgravity, the inner ear sends confusing signals to the brain because "up" and "down" no longer exist. This affects their ability to work and could impact mission tasks.',
          stemConcepts: ['vestibular system', 'inner ear physiology', 'microgravity adaptation'],
          options: [
            { label: t('stem.moonmission.administer_anti_nausea_medication_and_', 'Administer anti-nausea medication and rest period'), icon: '\uD83D\uDC8A',
              effects: { morale: 5 }, quality: 'optimal', xp: 15,
              scienceReward: 'The vestibular system in your inner ear uses fluid-filled semicircular canals to detect rotation and tiny calcium carbonate crystals (otoliths) to detect gravity. In microgravity, the otoliths float freely, sending signals that conflict with what your eyes see. Anti-nausea medication (like promethazine) blocks the brain\'s emetic center while the vestibular system adapts over 2-3 days.' },
            { label: t('stem.moonmission.tough_it_out_keep_working_through_the_', 'Tough it out \u2014 keep working through the nausea'), icon: '\uD83D\uDCAA',
              effects: { morale: -10 }, quality: 'poor', xp: 5,
              scienceReward: 'Working through severe SAS is counterproductive and dangerous. In microgravity, vomiting is a serious safety hazard \u2014 without gravity to direct it, vomit can be inhaled into the lungs (aspiration). Modern space medicine prioritizes crew health because a sick astronaut is an ineffective astronaut.' },
            { label: t('stem.moonmission.reduce_visual_stimulation_and_close_wi', 'Reduce visual stimulation and close window shades'), icon: '\uD83D\uDE36\u200D\uD83C\uDF2B\uFE0F',
              effects: { morale: 0 }, quality: 'adequate', xp: 10,
              scienceReward: 'Closing eyes or fixing gaze on a stable reference point reduces "sensory conflict" \u2014 the mismatch between what eyes see (floating objects) and what the inner ear feels (no gravity). This is similar to why reading in a car causes motion sickness: eyes say "still" but inner ear says "moving."' }
          ]
        }
      ];

      // ── Difficulty Settings (expanded with event parameters) ──
      var DIFFICULTIES = {
        tourist:    { label: t('stem.moonmission.tourist', 'Tourist'),    icon: '\uD83C\uDF1F', desc: t('stem.moonmission.guided_experience_auto_landing_extende', 'Guided experience \u2014 auto-landing, extended O\u2082'), gravity: 0.5, fuel: 150, o2Rate: 0.1, eventFreq: 0.55, showEffects: true, showOptimalHint: true },
        pilot:     { label: t('stem.moonmission.pilot', 'Pilot'),      icon: '\u2B50', desc: t('stem.moonmission.standard_apollo_parameters', 'Standard Apollo parameters'), gravity: 1.62, fuel: 100, o2Rate: 0.3, eventFreq: 0.6, showEffects: true, showOptimalHint: false },
        commander: { label: t('stem.moonmission.commander', 'Commander'),  icon: '\uD83C\uDFC5', desc: t('stem.moonmission.realistic_tight_fuel_budget_faster_o_d', 'Realistic \u2014 tight fuel budget, faster O\u2082 drain'), gravity: 1.62, fuel: 70, o2Rate: 0.6, eventFreq: 0.9, showEffects: false, showOptimalHint: false }
      };
      var difficulty = d.difficulty || 'pilot';
      var diffSettings = DIFFICULTIES[difficulty];

      // ── Achievement Badges ──
      var BADGES = [
        { id: 'first_step', name: t('stem.moonmission.one_small_step', 'One Small Step'), icon: '\uD83D\uDC63', desc: t('stem.moonmission.complete_your_first_eva_moonwalk', 'Complete your first EVA moonwalk'), check: function() { return phase >= 7; } },
        { id: 'geologist', name: t('stem.moonmission.lunar_geologist', 'Lunar Geologist'), icon: '\uD83E\uDEA8', desc: t('stem.moonmission.collect_4_rock_samples', 'Collect 4+ rock samples'), check: function() { return (d.lunarSamples || []).length >= 4; } },
        { id: 'collector', name: t('stem.moonmission.sample_return', 'Sample Return'), icon: '\uD83D\uDCE6', desc: t('stem.moonmission.collect_all_8_sample_types', 'Collect all 8 sample types'), check: function() { return (d.lunarSamples || []).length >= 8; } },
        { id: 'mission_complete', name: 'Splashdown!', icon: '\uD83C\uDF0A', desc: t('stem.moonmission.complete_the_full_mission', 'Complete the full mission'), check: function() { return phase >= 10; } },
        { id: 'quiz_master', name: t('stem.moonmission.space_scholar', 'Space Scholar'), icon: '\uD83C\uDF93', desc: t('stem.moonmission.answer_5_quiz_questions_correctly', 'Answer 5+ quiz questions correctly'), check: function() { return (d.quizCorrect || 0) >= 5; } },
        { id: 'commander_diff', name: t('stem.moonmission.right_stuff', 'Right Stuff'), icon: '\uD83D\uDE80', desc: t('stem.moonmission.complete_mission_on_commander_difficul', 'Complete mission on Commander difficulty'), check: function() { return phase >= 10 && difficulty === 'commander'; } }
      ];
      var earnedBadges = d.earnedBadges || {};
      function checkBadges() {
        BADGES.forEach(function(b) {
          if (!earnedBadges[b.id] && b.check()) {
            earnedBadges[b.id] = true;
            upd('earnedBadges', Object.assign({}, earnedBadges));
            if (addToast) addToast('\uD83C\uDFC5 Badge Earned: ' + b.name + ' \u2014 ' + b.desc, 'success');
            addXP(20);
          }
        });
      }

      // Check badges whenever phase changes
      setTimeout(checkBadges, 0);   // deferred: unlocking a badge calls upd()+addToast() — never setState during render

      // ── Quiz State ──
      var showQuiz = d.showQuiz || false;
      var quizIdx = d.quizIdx || 0;
      var quizCorrect = d.quizCorrect || 0;
      var quizAnswered = d.quizAnswered || false;
      var quizSelectedAnswer = d.quizSelectedAnswer || -1;

      // ── Mission Timer ──
      var missionStartTime = d.missionStartTime || 0;
      function getMissionElapsed() {
        if (!missionStartTime) return '00:00:00';
        var elapsed = Math.floor((Date.now() - missionStartTime) / 1000);
        var hh = Math.floor(elapsed / 3600).toString().padStart(2, '0');
        var mm = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
        var ss = (elapsed % 60).toString().padStart(2, '0');
        return hh + ':' + mm + ':' + ss;
      }

      var activePhase = PHASES[Math.min(phase, PHASES.length - 1)] || { name: t('stem.moonmission.complete', 'Complete'), icon: '\uD83C\uDF0A', desc: t('stem.moonmission.splashdown_debrief', 'Splashdown and debrief') };
      var nextPhase = phase + 1 < PHASES.length ? PHASES[phase + 1] : null;
      var phaseProgressPct = Math.min(100, Math.round((Math.min(phase, 10) / 10) * 100));
      var crewMorale = d.crewMorale != null ? d.crewMorale : 75;
      var earnedBadgeCount = Object.keys(d.earnedBadges || {}).length;
      var flightPlanGroups = [
        { id: 'brief', label: t('stem.moonmission.plan_brief', 'Brief'), icon: '\uD83D\uDCCB', phases: [0, 1] },
        { id: 'transit', label: t('stem.moonmission.plan_transit', 'Transit'), icon: '\uD83C\uDF0D', phases: [2, 3, 4] },
        { id: 'landing', label: t('stem.moonmission.plan_landing', 'Landing'), icon: '\uD83C\uDF15', phases: [5] },
        { id: 'surface', label: t('stem.moonmission.plan_surface', 'Surface'), icon: '\uD83E\uDEA8', phases: [6, 7] },
        { id: 'return', label: t('stem.moonmission.plan_return', 'Return'), icon: '\uD83C\uDF0A', phases: [8, 9] }
      ];

      // ═══════════════════════════════════
      // RENDER
      // ═══════════════════════════════════

      return h('div', { className: 'max-w-5xl mx-auto px-1 space-y-3', role: 'main', 'data-moonmission-tool': 'true', 'aria-label': 'Apollo Moon Mission Simulator - Phase ' + (phase + 1) + ': ' + (PHASES[phase] ? PHASES[phase].name : 'Mission Complete') },

        // Header
        h('div', { className: 'flex items-center justify-between mb-3' },
          h('div', { className: 'flex items-center gap-2' },
            h('button', { onClick: function() {
                // Tear down the EVA WebGL loop + looping mission audio before leaving — neither stops itself
                // on unmount, so exiting mid-EVA used to leak a forever-running render loop + ambient sound.
                var evaCanvas = document.querySelector('[data-eva-canvas]');
                if (evaCanvas && evaCanvas._evaCleanup) evaCanvas._evaCleanup();
                if (typeof stopMissionAmbient === 'function') stopMissionAmbient();
                setStemLabTool(null);
              }, className: 'p-1 rounded-lg hover:bg-slate-100 transition-colors', 'aria-label': t('stem.moonmission.back_to_stem_lab', 'Back to STEM Lab') },
              h(ArrowLeft, { size: 18 })
            ),
            h('div', null,
              h('h3', { className: 'text-lg font-black text-slate-800 flex items-center gap-2' }, t('stem.moonmission.apollo_moon_mission', '\uD83D\uDE80 Apollo Moon Mission')),
              h('p', { className: 'text-[11px] text-slate-600 -mt-0.5' }, t('stem.moonmission.full_mission_simulation_launch_to_spla', 'Full mission simulation \u2022 Launch to splashdown'))
            )
          ),
          h('div', { className: 'text-right' },
            h('div', { className: 'text-[11px] text-slate-600 font-mono' }, 'MET ' + getMissionElapsed()),
            h('div', { className: 'text-[11px] text-indigo-500 font-bold' }, '\u2B50 ' + missionXP + ' XP')
          )
        ),

        h('section', {
          className: 'rounded-2xl overflow-hidden border border-indigo-200 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white shadow-xl shadow-indigo-950/10',
          'data-moonmission-control': 'true',
          'aria-label': t('stem.moonmission.mission_control_dashboard', 'Mission Control dashboard')
        },
          h('div', { className: 'p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-4' },
            h('div', { className: 'lg:col-span-7' },
              h('div', { className: 'flex items-center gap-2 text-[11px] font-black uppercase text-cyan-200' },
                h('span', null, t('stem.moonmission.mission_control', 'Mission Control')),
                h('span', { className: 'px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-white' }, DIFFICULTIES[difficulty].icon + ' ' + DIFFICULTIES[difficulty].label)
              ),
              h('div', { className: 'mt-2 flex items-start gap-3' },
                h('div', { className: 'w-14 h-14 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-3xl flex-shrink-0' }, activePhase.icon),
                h('div', { className: 'min-w-0' },
                  h('h4', { className: 'text-xl sm:text-2xl font-black leading-tight' }, activePhase.name),
                  h('p', { className: 'mt-1 text-[12px] sm:text-sm text-indigo-100/85 leading-relaxed' }, activePhase.desc),
                  h('p', { className: 'mt-2 text-[11px] text-cyan-200 font-bold' },
                    nextPhase ? t('stem.moonmission.next_phase_prefix', 'Next: ') + nextPhase.name : t('stem.moonmission.ready_for_debrief', 'Ready for debrief and replay.')
                  )
                )
              ),
              h('div', { className: 'mt-4' },
                h('div', { className: 'flex justify-between text-[11px] font-bold text-indigo-100/80 mb-1' },
                  h('span', null, t('stem.moonmission.launch_2', 'Launch')),
                  h('span', null, phaseProgressPct + '%'),
                  h('span', null, t('stem.moonmission.splashdown', 'Splashdown'))
                ),
                h('div', { className: 'h-2 rounded-full bg-white/10 overflow-hidden' },
                  h('div', { className: 'h-full rounded-full bg-gradient-to-r from-cyan-300 via-indigo-300 to-fuchsia-300', style: { width: phaseProgressPct + '%' } })
                )
              )
            ),
            h('div', { className: 'lg:col-span-5 grid grid-cols-2 gap-2' },
              [
                { label: t('stem.moonmission.met', 'MET'), value: getMissionElapsed(), tone: 'text-cyan-200' },
                { label: t('stem.moonmission.mission_xp', 'Mission XP'), value: missionXP + ' XP', tone: 'text-amber-200' },
                { label: t('stem.moonmission.samples', 'Samples'), value: samples.length + '/' + LUNAR_SAMPLES_DATA.length, tone: 'text-lime-200' },
                { label: t('stem.moonmission.quiz', 'Quiz'), value: quizCorrect + '/' + QUIZ_BANK.length, tone: 'text-violet-200' },
                { label: t('stem.moonmission.crew_morale', 'Crew morale'), value: crewMorale + '%', tone: crewMorale >= 70 ? 'text-emerald-200' : crewMorale >= 45 ? 'text-amber-200' : 'text-rose-200' },
                { label: t('stem.moonmission.badges', 'Badges'), value: earnedBadgeCount + '/' + BADGES.length, tone: 'text-sky-200' }
              ].map(function(stat) {
                return h('div', { key: stat.label, className: 'rounded-xl bg-white/8 border border-white/10 px-3 py-2' },
                  h('div', { className: 'text-[10px] font-black uppercase text-slate-300' }, stat.label),
                  h('div', { className: 'text-sm font-black ' + stat.tone }, stat.value)
                );
              })
            )
          ),
          h('div', { className: 'px-4 sm:px-5 pb-4 grid grid-cols-2 sm:grid-cols-5 gap-2', 'data-moonmission-flight-plan': 'true' },
            flightPlanGroups.map(function(group) {
              var active = group.phases.indexOf(Math.min(phase, 9)) >= 0;
              var complete = group.phases[group.phases.length - 1] < phase;
              return h('div', { key: group.id, className: 'rounded-xl border px-3 py-2 ' + (active ? 'bg-cyan-400/15 border-cyan-300/40 text-cyan-100' : complete ? 'bg-emerald-400/10 border-emerald-300/30 text-emerald-100' : 'bg-white/5 border-white/10 text-slate-300') },
                h('div', { className: 'text-lg leading-none mb-1' }, complete ? '\u2713' : group.icon),
                h('div', { className: 'text-[11px] font-black' }, group.label),
                h('div', { className: 'text-[10px] opacity-75' }, active ? t('stem.moonmission.active', 'Active') : complete ? t('stem.moonmission.complete', 'Complete') : t('stem.moonmission.upcoming', 'Upcoming'))
              );
            })
          )
        ),

        // ── Mission Event modal (triggered by advancePhase) ──
        d.activeEvent && h('div', {
          className: 'mb-3 bg-gradient-to-br from-amber-950 to-slate-900 rounded-xl p-4 border border-amber-700/50 shadow-lg',
          role: 'alertdialog', 'aria-label': 'Mission event: ' + d.activeEvent.title
        },
          h('div', { className: 'flex items-center gap-2 mb-2' },
            h('span', { className: 'text-2xl' }, d.activeEvent.emoji),
            h('div', null,
              h('h5', { className: 'text-sm font-bold text-amber-300' }, d.activeEvent.title),
              h('div', { className: 'flex gap-1 mt-0.5' },
                d.activeEvent.stemConcepts.map(function(c) {
                  return h('span', { key: c, className: 'px-1.5 py-0.5 rounded-full text-[11px] bg-sky-500/15 text-sky-300 border border-sky-500/20' }, c);
                })
              )
            )
          ),
          h('p', { className: 'text-xs text-slate-300 leading-relaxed mb-3' }, d.activeEvent.scenario),
          h('div', { className: 'space-y-2' },
            d.activeEvent.options.map(function(opt, oi) {
              var isOptimal = opt.quality === 'optimal';
              return h('button', {
                key: oi,
                onClick: function() { resolveEvent(d.activeEvent, opt); },
                className: 'w-full text-left p-3 rounded-lg border transition-all hover:scale-[1.01] active:scale-[0.99] ' +
                  (diffSettings.showOptimalHint && isOptimal ? 'bg-green-500/10 border-green-500/30 hover:border-green-400/50' : 'bg-white/5 border-white/10 hover:border-amber-400/40 hover:bg-amber-500/5')
              },
                h('div', { className: 'flex items-center gap-2 mb-1' },
                  h('span', null, opt.icon),
                  h('span', { className: 'text-xs font-bold text-white' }, opt.label)
                ),
                diffSettings.showEffects && opt.effects && h('div', { className: 'flex flex-wrap gap-2 text-[11px] mt-1' },
                  Object.keys(opt.effects).map(function(k) {
                    var v = opt.effects[k];
                    return h('span', { key: k, className: v > 0 ? 'text-green-400' : 'text-red-400' },
                      (k === 'morale' ? '\uD83D\uDE0A' : k === 'power' ? '\u26A1' : k === 'time' ? '\u23F1' : '\u2699\uFE0F') + ' ' + (v > 0 ? '+' : '') + v + ' ' + k
                    );
                  })
                )
              );
            })
          ),
          h('details', { className: 'mt-3' },
            h('summary', { className: 'text-[11px] text-slate-600 cursor-pointer hover:text-slate-200 transition-colors' }, t('stem.moonmission.what_really_happened', '\uD83D\uDCDA What really happened?')),
            h('p', { className: 'text-[11px] text-indigo-300 mt-1 pl-3 leading-relaxed' }, d.activeEvent.historical)
          )
        ),

        // ── Event Outcome card (shown after resolving an event) ──
        d.eventOutcome && h('div', {
          className: 'mb-3 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-600/50'
        },
          h('div', { className: 'flex items-center gap-2 mb-2' },
            h('span', { className: 'text-lg' }, d.eventOutcome.quality === 'optimal' ? '\u2B50' : d.eventOutcome.quality === 'adequate' ? '\u2705' : '\u26A0\uFE0F'),
            h('span', { className: 'text-sm font-bold ' + (d.eventOutcome.quality === 'optimal' ? 'text-green-400' : d.eventOutcome.quality === 'adequate' ? 'text-yellow-400' : 'text-orange-400') },
              d.eventOutcome.quality === 'optimal' ? 'Excellent Decision!' : d.eventOutcome.quality === 'adequate' ? 'Acceptable Solution' : 'Suboptimal Choice'
            )
          ),
          h('p', { className: 'text-[11px] text-slate-200 mb-1' }, '\u201C' + d.eventOutcome.label + '\u201D'),
          h('div', { className: 'bg-sky-500/10 rounded-lg p-3 border border-sky-500/20' },
            h('p', { className: 'text-[11px] text-sky-200 leading-relaxed' }, '\uD83D\uDD2C ' + d.eventOutcome.outcome)
          ),
          h('button', {
            onClick: function() {
              upd('eventOutcome', null);
              setPhase(d.eventPhaseTarget);
            },
            className: 'w-full mt-3 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md transition-all'
          }, t('stem.moonmission.continue_mission', '\uD83D\uDE80 Continue Mission'))
        ),

        // ── Quiz overlay (shown between key phases) ──
        showQuiz && quizIdx < QUIZ_BANK.length && h('div', { className: 'mb-3 bg-gradient-to-br from-indigo-950 to-slate-900 rounded-xl p-4 border border-indigo-800', role: 'region', 'aria-label': 'Space knowledge quiz question ' + (quizIdx + 1) },
          h('div', { className: 'flex items-center gap-2 mb-3' },
            h('span', { className: 'text-xl' }, '\uD83E\uDDE0'),
            h('div', null,
              h('h5', { className: 'text-sm font-bold text-indigo-300' }, t('stem.moonmission.space_knowledge_check', 'Space Knowledge Check')),
              h('p', { className: 'text-[11px] text-slate-600' }, 'Question ' + (quizIdx + 1) + '/' + QUIZ_BANK.length + ' \u2022 ' + quizCorrect + ' correct so far')
            )
          ),
          h('p', { className: 'text-xs text-white font-bold mb-3' }, QUIZ_BANK[quizIdx].q),
          h('div', { className: 'space-y-1.5 mb-3' },
            QUIZ_BANK[quizIdx].opts.map(function(opt, oi) {
              var isCorrect = oi === QUIZ_BANK[quizIdx].a;
              var isSelected = quizSelectedAnswer === oi;
              var showResult = quizAnswered;
              return h('button', {
                key: oi,
                disabled: quizAnswered,
                'aria-label': 'Answer option ' + (oi + 1) + ': ' + opt + (showResult && isCorrect ? ', correct answer' : showResult && isSelected ? ', incorrect' : ''),
                role: 'radio',
                'aria-checked': isSelected ? 'true' : 'false',
                onClick: function() {
                  upd('quizAnswered', true);
                  upd('quizSelectedAnswer', oi);
                  if (oi === QUIZ_BANK[quizIdx].a) {
                    upd('quizCorrect', quizCorrect + 1);
                    addXP(10);
                    sfxQuizCorrect();
                    if (addToast) addToast('\u2705 Correct! +10 XP', 'success');
                    if (typeof announceToSR === 'function') announceToSR('Correct! ' + QUIZ_BANK[quizIdx].fact);
                  } else {
                    sfxQuizWrong();
                    // Per-distractor feedback: explain why THIS wrong pick is wrong, not just what the right one was.
                    var whyLine = (QUIZ_BANK[quizIdx].why && QUIZ_BANK[quizIdx].why[oi]) || '';
                    if (addToast) addToast('\u274C ' + (whyLine || ('Not quite \u2014 the answer is: ' + QUIZ_BANK[quizIdx].opts[QUIZ_BANK[quizIdx].a])), 'info');
                    if (typeof announceToSR === 'function') announceToSR('Incorrect. ' + whyLine + ' The correct answer is ' + QUIZ_BANK[quizIdx].opts[QUIZ_BANK[quizIdx].a] + '. ' + QUIZ_BANK[quizIdx].fact);
                  }
                },
                className: 'w-full text-left px-3 py-2 rounded-lg text-[11px] transition-all border ' +
                  (showResult && isCorrect ? 'bg-green-600/20 border-green-500 text-green-300' :
                   showResult && isSelected && !isCorrect ? 'bg-red-600/20 border-red-500 text-red-300' :
                   'bg-white/5 border-white/10 text-slate-300 hover:border-indigo-400/40 hover:bg-indigo-500/10')
              }, (showResult && isCorrect ? '\u2705 ' : showResult && isSelected ? '\u274C ' : '') + opt);
            })
          ),
          quizAnswered && quizSelectedAnswer !== QUIZ_BANK[quizIdx].a && QUIZ_BANK[quizIdx].why && QUIZ_BANK[quizIdx].why[quizSelectedAnswer] &&
            h('div', { className: 'bg-amber-500/10 rounded-lg p-2 border border-amber-500/20 mb-2' },
              h('p', { className: 'text-[11px] text-amber-300' }, '\uD83D\uDD0D ' + QUIZ_BANK[quizIdx].why[quizSelectedAnswer])
            ),
          quizAnswered && h('div', { className: 'bg-sky-500/10 rounded-lg p-2 border border-sky-500/20 mb-3' },
            h('p', { className: 'text-[11px] text-sky-300' }, '\uD83D\uDCA1 ' + QUIZ_BANK[quizIdx].fact)
          ),
          quizAnswered && h('button', {
            onClick: function() {
              var nextIdx = quizIdx + 1;
              upd('quizIdx', nextIdx);
              upd('quizAnswered', false);
              upd('quizSelectedAnswer', -1);
              if (nextIdx >= QUIZ_BANK.length || nextIdx % 5 === 0) {   // 5-question blocks: the 'answer 5' quest + Space Scholar badge are actually reachable (was % 2 → only 2 ever shown)
                upd('showQuiz', false);
              }
            },
            className: 'w-full py-2 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700'
          }, quizIdx + 1 < QUIZ_BANK.length ? '\u27A1\uFE0F Next Question' : '\u2705 Continue Mission')
        ),

        // Phase progress bar
        h('div', { className: 'mb-3', role: 'progressbar', 'aria-valuenow': phase + 1, 'aria-valuemin': 1, 'aria-valuemax': 10, 'aria-label': 'Mission progress: phase ' + (phase + 1) + ' of 10, ' + (PHASES[phase] ? PHASES[phase].name : 'Complete') },
          h('div', { className: 'flex gap-0.5 mb-1' },
            PHASES.map(function(p, i) {
              var status = i < phase ? 'completed' : i === phase ? 'active' : 'pending';
              return h('div', {
                key: i,
                className: 'flex-1 h-1.5 rounded-full transition-all ' +
                  (status === 'completed' ? 'bg-green-400' : status === 'active' ? 'bg-indigo-500 animate-pulse' : 'bg-slate-200'),
                title: p.name
              });
            })
          ),
          h('div', { className: 'flex justify-between text-[11px] text-slate-600' },
            h('span', null, t('stem.moonmission.launch_2', 'Launch')),
            h('span', null, 'Phase ' + (phase + 1) + '/10'),
            h('span', null, t('stem.moonmission.splashdown', 'Splashdown'))
          )
        ),

        // ═══ PHASE 0: MISSION BRIEFING ═══
        phase === 0 && h('div', { className: 'space-y-3', style: { animation: 'mmFadeSlideIn 0.4s ease-out' } },
          h('div', { className: 'bg-gradient-to-br from-slate-900 to-indigo-950 rounded-xl p-4 text-white' },
            h('div', { className: 'text-center mb-3' },
              h('div', { className: 'text-3xl mb-1' }, '\uD83C\uDF15'),
              h('h4', { className: 'text-lg font-black tracking-wide' }, t('stem.moonmission.mission_briefing_2', 'MISSION BRIEFING')),
              h('p', { className: 'text-xs text-slate-600' }, t('stem.moonmission.apollo_style_lunar_landing_mission', 'Apollo-style lunar landing mission'))
            ),
            h('div', { className: 'bg-white/5 rounded-lg p-3 mb-3 border border-white/10' },
              h('p', { className: 'text-[11px] text-slate-200 font-bold mb-1' },
                t('stem.moonmission.mission_objectives', '\uD83C\uDFAF MISSION OBJECTIVES'),
                d.aiBriefing && Array.isArray(d.aiBriefing.objectives) && h('span', { className: 'ml-2 text-[10px] text-emerald-300 font-normal' }, t('stem.moonmission.ai_customized', '\u2728 AI-customized'))
              ),
              h('div', { className: 'space-y-1' },
                ((d.aiBriefing && Array.isArray(d.aiBriefing.objectives) && d.aiBriefing.objectives.length >= 3)
                  ? d.aiBriefing.objectives.slice(0, 6).map(function(o) { return String(o).substring(0, 120); })
                  : [
                      'Launch from Kennedy Space Center aboard Saturn V',
                      'Enter lunar orbit and descend to the surface',
                      'Conduct EVA: collect geological samples, deploy instruments',
                      'Return safely to Earth with lunar samples'
                    ]
                ).map(function(obj, i) {
                  return h('div', { key: i, className: 'flex items-start gap-2 text-xs text-slate-300' },
                    h('span', { className: 'text-green-400 mt-0.5' }, '\u25CB'),
                    h('span', null, obj)
                  );
                })
              )
            ),
            h('div', { className: 'mb-3' },
              h('p', { className: 'text-[11px] text-slate-200 font-bold mb-2' }, t('stem.moonmission.your_crew', '\uD83D\uDC68\u200D\uD83D\uDE80 YOUR CREW')),
              h('div', { className: 'grid grid-cols-3 gap-2' },
                CREW_ROLES.map(function(crew, i) {
                  return h('div', { key: i, className: 'bg-white/5 rounded-lg p-2 border border-white/10 text-center' },
                    h('div', { className: 'text-lg mb-0.5' }, i === 0 ? '\uD83E\uDDD1\u200D\uD83D\uDE80' : i === 1 ? '\uD83D\uDC68\u200D\uD83D\uDE80' : '\uD83D\uDC69\u200D\uD83D\uDE80'),
                    h('p', { className: 'text-[11px] font-bold text-indigo-300' }, crew.role),
                    h('p', { className: 'text-[11px] text-slate-600' }, crew.name),
                    h('p', { className: 'text-[11px] text-slate-200 mt-1' }, crew.tasks)
                  );
                })
              )
            ),
            // Difficulty selector
            h('div', { className: 'mb-3', role: 'radiogroup', 'aria-label': t('stem.moonmission.mission_difficulty_selection', 'Mission difficulty selection') },
              h('p', { className: 'text-[11px] text-slate-200 font-bold mb-2', id: 'difficulty-label' }, t('stem.moonmission.mission_difficulty', '\uD83C\uDFAE MISSION DIFFICULTY')),
              h('div', { className: 'grid grid-cols-3 gap-2' },
                Object.keys(DIFFICULTIES).map(function(key) {
                  var diff = DIFFICULTIES[key];
                  var isSelected = difficulty === key;
                  return h('button', {
                    key: key,
                    role: 'radio',
                    'aria-checked': isSelected ? 'true' : 'false',
                    'aria-label': diff.label + ' difficulty: ' + diff.desc,
                    onClick: function() { upd('difficulty', key); },
                    className: 'rounded-lg p-2 border text-center transition-all ' +
                      (isSelected ? 'bg-indigo-600/30 border-indigo-500 ring-1 ring-indigo-400' : 'bg-white/5 border-white/10 hover:border-indigo-400/40')
                  },
                    h('div', { className: 'text-lg' }, diff.icon),
                    h('p', { className: 'text-[11px] font-bold ' + (isSelected ? 'text-indigo-300' : 'text-slate-300') }, diff.label),
                    h('p', { className: 'text-[11px] text-slate-600' }, diff.desc)
                  );
                })
              )
            ),
            h('div', { className: 'bg-indigo-500/10 rounded-lg p-2 border border-indigo-500/20 mb-3' },
              h('p', { className: 'text-[11px] text-indigo-300' }, '\uD83D\uDCA1 ' + APOLLO_FACTS[Math.floor(Math.random() * APOLLO_FACTS.length)])
            ),
            // AI-customize briefing — pulls in teacher's source text and regenerates objectives,
            // quiz questions, and sample descriptions tied to that content.
            callGemini && sourceText && sourceText.trim().length > 120 && h('div', { className: 'bg-emerald-500/10 rounded-lg p-3 border border-emerald-500/30 mb-3' },
              h('p', { className: 'text-[11px] text-emerald-300 font-bold mb-1' }, d.aiBriefing ? '\u2728 AI-customized briefing active' : '\uD83E\uDDE0 Customize with your source text'),
              h('p', { className: 'text-[11px] text-emerald-200/80 mb-2' }, d.aiBriefing
                ? 'Objectives, quiz, and sample facts are tied to your uploaded text.'
                : 'Generate mission objectives, quiz questions, and sample descriptions from the text you\'ve loaded (\u223C' + Math.round(sourceText.length / 100) * 100 + ' chars available). Adds ~10-15 sec.'),
              h('button', {
                disabled: !!d.aiBriefingLoading,
                'aria-busy': d.aiBriefingLoading ? 'true' : 'false',
                onClick: function() {
                  if (d.aiBriefingLoading) return;
                  upd('aiBriefingLoading', true);
                  var gradeHint = gradeLevel ? 'Target grade: ' + gradeLevel + '. ' : '';
                  var prompt = 'You are designing a Moon Mission space-exploration simulator for a student. Customize the mission content using this source text as inspiration.\n\n' +
                    gradeHint + 'Source text (first 3000 chars):\n"""\n' + sourceText.substring(0, 3000) + '\n"""\n\n' +
                    'Return ONLY a JSON object with this EXACT structure (no prose, no code fences):\n' +
                    '{\n' +
                    '  "objectives": ["4 short mission-phase objectives (one per line, 50-90 chars each, imperative verbs)"],\n' +
                    '  "quiz": [\n' +
                    '    {"q": "question text", "opts": ["A","B","C","D"], "a": 0, "fact": "1-sentence explanation"}\n' +
                    '  ],\n' +
                    '  "samples": [\n' +
                    '    {"name": "short sample name", "desc": "1-sentence description tying to source text", "fact": "1 educational fact", "xp": 15}\n' +
                    '  ]\n' +
                    '}\n' +
                    'Constraints: 4 objectives, 6 quiz questions (mix of space science and source-text concepts), 8 sample descriptions. All content must be accurate and age-appropriate.';
                  callGemini(prompt, true).then(function(raw) {
                    try {
                      var cleaned = String(raw || '').trim();
                      if (cleaned.indexOf('```') !== -1) { cleaned = cleaned.split('```')[1] || cleaned; if (cleaned.indexOf('\n') !== -1) cleaned = cleaned.substring(cleaned.indexOf('\n') + 1); }
                      var parsed = JSON.parse(cleaned);
                      if (!parsed || !Array.isArray(parsed.objectives) || !Array.isArray(parsed.quiz) || !Array.isArray(parsed.samples)) throw new Error('malformed');
                      setLabToolData(function(prev) {
                        return Object.assign({}, prev, { moonMission: Object.assign({}, (prev && prev.moonMission) || {}, {
                          aiBriefing: parsed,
                          aiBriefingLoading: false
                        })});
                      });
                      if (addToast) addToast('\u2728 Mission customized from your source text!', 'success');
                      if (typeof announceToSR === 'function') announceToSR('Mission customized with your source content. Objectives, quiz, and samples updated.');
                    } catch (e) {
                      upd('aiBriefingLoading', false);
                      if (addToast) addToast('Couldn\'t parse AI response \u2014 using default briefing.', 'error');
                    }
                  }).catch(function() {
                    upd('aiBriefingLoading', false);
                    if (addToast) addToast('Couldn\'t reach AI \u2014 using default briefing.', 'error');
                  });
                },
                className: 'w-full py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all disabled:opacity-60'
              }, d.aiBriefingLoading
                ? '\u231B Customizing mission\u2026'
                : (d.aiBriefing ? '\uD83D\uDD04 Regenerate from source text' : '\u2728 Customize from my source text'))
            )
          ),
          h('button', {
            'aria-label': 'Begin Moon mission. Proceed to launch phase. Difficulty: ' + DIFFICULTIES[difficulty].label,
            onClick: function() {
              setPhase(1);
              upd('missionStartTime', Date.now());
              log('\uD83D\uDCCB Mission briefing complete (' + DIFFICULTIES[difficulty].label + ' difficulty)' + (d.aiBriefing ? ' \u2014 AI customized' : ''));
              addXP(10);
              if (addToast) addToast('\uD83D\uDE80 Mission authorized! Difficulty: ' + DIFFICULTIES[difficulty].label, 'success');
            },
            className: 'w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg transition-all hover:scale-[1.01]'
          }, t('stem.moonmission.begin_mission_proceed_to_launch', '\uD83D\uDE80 Begin Mission \u2014 Proceed to Launch'))
        ),

        // ═══ PHASE 1: LAUNCH ═══
        phase === 1 && h('div', { className: 'space-y-3', style: { animation: 'mmFadeSlideIn 0.4s ease-out' } },
          h('div', { className: 'bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl overflow-hidden border border-slate-700' },
            // Launch canvas
            h('div', { className: 'relative', style: { height: '400px' } },
              h('canvas', { 
                'data-launch-canvas': 'true',
                role: 'img',
                'aria-label': t('stem.moonmission.animated_saturn_v_rocket_launch_sequen', 'Animated Saturn V rocket launch sequence. 5-second countdown followed by ascent through atmosphere to orbit. Shows altitude, velocity, G-force, and stage separations.'),
                style: { width: '100%', height: '100%', display: 'block' },
                ref: function(cvEl) {
                  if (!cvEl || cvEl._launchInit) return;
                  cvEl._launchInit = true;
                  var ctx = cvEl.getContext('2d');
                  var W = cvEl.offsetWidth || 500, H = cvEl.offsetHeight || 400;
                  cvEl.width = W * 2; cvEl.height = H * 2; ctx.scale(2, 2); if (typeof ResizeObserver === 'function' && !cvEl._mmRO) { cvEl._mmRO = new ResizeObserver(function() { var nw = cvEl.offsetWidth, nh = cvEl.offsetHeight; if (nw > 0 && nh > 0 && (nw !== W || nh !== H)) { W = nw; H = nh; cvEl.width = nw * 2; cvEl.height = nh * 2; ctx.setTransform(2, 0, 0, 2, 0, 0); } }); cvEl._mmRO.observe(cvEl); }   // rotate/resize used to leave the canvas stretched (backing store was locked at first mount)
                  var tick = 0;
                  var countdown = 300; // 5 seconds at 60fps
                  var launched = false;
                  var altitude = 0;
                  var velocity = 0;
                  var gForce = 1;
                  var stage = 1;
                  var maxAlt = 0;
                  var shakeIntensity = 0;

                  function drawLaunch() {
                    tick++;
                    ctx.clearRect(0, 0, W, H);

                    // Countdown phase
                    if (countdown > 0) {
                      countdown--;
                      // Beep on each second mark (every 60 frames)
                      if (countdown % 60 === 0 && countdown > 0) sfxCountdown();
                      // Background: launch pad
                      var skyGrad = ctx.createLinearGradient(0, 0, 0, H);
                      skyGrad.addColorStop(0, '#1a3a6a');
                      skyGrad.addColorStop(0.6, '#3a7aaa');
                      skyGrad.addColorStop(1, '#5aaa5a');
                      ctx.fillStyle = skyGrad;
                      ctx.fillRect(0, 0, W, H);
                      // Pad slab + hold-down structure
                      ctx.fillStyle = '#4b5563';
                      ctx.fillRect(W * 0.40, H * 0.795, W * 0.22, H * 0.03);
                      // Launch umbilical tower — lattice, not a plain grey bar
                      ctx.fillStyle = '#6b7280';
                      ctx.fillRect(W * 0.555, H * 0.18, 7, H * 0.62);
                      ctx.strokeStyle = 'rgba(156,163,175,0.75)';
                      ctx.lineWidth = 1.5;
                      for (var lt = 0; lt < 6; lt++) {
                        var ly = H * (0.22 + lt * 0.1);
                        ctx.beginPath(); ctx.moveTo(W * 0.555, ly); ctx.lineTo(W * 0.555 + 7, ly + H * 0.05); ctx.stroke();
                        ctx.beginPath(); ctx.moveTo(W * 0.555 + 7, ly); ctx.lineTo(W * 0.555, ly + H * 0.05); ctx.stroke();
                      }
                      // Swing arms reaching the stack
                      ctx.fillStyle = '#9ca3af';
                      ctx.fillRect(W * 0.53, H * 0.30, W * 0.03, 3);
                      ctx.fillRect(W * 0.53, H * 0.46, W * 0.03, 3);
                      ctx.fillRect(W * 0.53, H * 0.62, W * 0.03, 3);
                      // Saturn V stack — shaded body, black roll-pattern bands, engine skirt
                      var bodyX = W * 0.47, bodyW = W * 0.06;
                      var bodyGrad = ctx.createLinearGradient(bodyX, 0, bodyX + bodyW, 0);
                      bodyGrad.addColorStop(0, '#f8fafc');
                      bodyGrad.addColorStop(0.55, '#e2e8f0');
                      bodyGrad.addColorStop(1, '#94a3b8');           // sun-side → shadow-side
                      ctx.fillStyle = bodyGrad;
                      ctx.fillRect(bodyX, H * 0.35, bodyW, H * 0.45);
                      ctx.fillStyle = '#0f172a';                      // interstage roll-pattern bands
                      ctx.fillRect(bodyX, H * 0.475, bodyW, 3);
                      ctx.fillRect(bodyX, H * 0.60, bodyW, 3);
                      ctx.fillRect(bodyX, H * 0.775, bodyW, H * 0.012);
                      ctx.fillRect(bodyX + bodyW * 0.42, H * 0.35, bodyW * 0.16, H * 0.06); // upper black stripe
                      ctx.fillStyle = '#b91c1c';                      // tiny USA mark
                      ctx.fillRect(bodyX + bodyW * 0.2, H * 0.52, bodyW * 0.6, 2.5);
                      // Engine skirt + F-1 bells
                      ctx.fillStyle = '#475569';
                      ctx.beginPath();
                      ctx.moveTo(bodyX - bodyW * 0.12, H * 0.80);
                      ctx.lineTo(bodyX + bodyW * 1.12, H * 0.80);
                      ctx.lineTo(bodyX + bodyW, H * 0.78);
                      ctx.lineTo(bodyX, H * 0.78);
                      ctx.closePath(); ctx.fill();
                      // Nose cone + escape tower spike
                      ctx.fillStyle = '#f0f0f0';
                      ctx.beginPath();
                      ctx.moveTo(bodyX, H * 0.35);
                      ctx.lineTo(W * 0.5, H * 0.25);
                      ctx.lineTo(bodyX + bodyW, H * 0.35);
                      ctx.fill();
                      ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2;
                      ctx.beginPath(); ctx.moveTo(W * 0.5, H * 0.25); ctx.lineTo(W * 0.5, H * 0.21); ctx.stroke();
                      // Pre-launch LOX venting — drifting steam puffs at the pad base
                      for (var vp = 0; vp < 5; vp++) {
                        var vph = (tick * 0.6 + vp * 47) % 60;
                        var vpx = bodyX + bodyW * (vp % 2 === 0 ? -0.35 : 1.35) + Math.sin((tick + vp * 30) * 0.05) * 6;
                        ctx.fillStyle = 'rgba(240,244,248,' + (0.28 * (1 - vph / 60)) + ')';
                        ctx.beginPath();
                        ctx.arc(vpx, H * 0.78 - vph * 0.5, 5 + vph * 0.28, 0, Math.PI * 2);
                        ctx.fill();
                      }
                      // Countdown text
                      var countSec = Math.ceil(countdown / 60);
                      ctx.fillStyle = '#ffffff';
                      ctx.font = 'bold 48px monospace';
                      ctx.textAlign = 'center';
                      ctx.globalAlpha = 0.8 + Math.sin(tick * 0.1) * 0.2;
                      ctx.fillText(countSec > 0 ? 'T-' + countSec : 'LIFTOFF!', W * 0.5, H * 0.15);
                      ctx.globalAlpha = 1;
                      ctx.font = '12px system-ui';
                      ctx.fillStyle = '#94a3b8';
                      ctx.fillText('Kennedy Space Center, Florida', W * 0.5, H * 0.95);
                      if (countdown <= 0) { launched = true; shakeIntensity = 8; }
                    }

                    // Flight phase
                    if (launched) {
                      velocity += 0.15 + (stage === 2 ? 0.1 : 0) + (stage === 3 ? 0.05 : 0);
                      altitude += velocity * 0.5;
                      gForce = 1 + velocity * 0.08;
                      if (altitude > 2000 && stage === 1) { stage = 2; shakeIntensity = 6; }
                      if (altitude > 8000 && stage === 2) { stage = 3; shakeIntensity = 4; }
                      maxAlt = Math.max(maxAlt, altitude);
                      shakeIntensity *= 0.995;

                      // Camera shake
                      var sx = (Math.random() - 0.5) * shakeIntensity;
                      var sy = (Math.random() - 0.5) * shakeIntensity;
                      ctx.save();
                      ctx.translate(sx, sy);

                      // Sky transitions with altitude
                      var skyPct = Math.min(1, altitude / 15000);
                      var skyGrad2 = ctx.createLinearGradient(0, 0, 0, H);
                      if (skyPct < 0.3) {
                        skyGrad2.addColorStop(0, '#1a3a6a');
                        skyGrad2.addColorStop(1, '#5a9aca');
                      } else if (skyPct < 0.6) {
                        skyGrad2.addColorStop(0, '#0a1a3a');
                        skyGrad2.addColorStop(1, '#2a5a8a');
                      } else {
                        skyGrad2.addColorStop(0, '#000010');
                        skyGrad2.addColorStop(0.5, '#050520');
                        skyGrad2.addColorStop(1, '#0a1030');
                      }
                      ctx.fillStyle = skyGrad2;
                      ctx.fillRect(0, 0, W, H);

                      // Stars appear as we go higher
                      if (skyPct > 0.4) {
                        ctx.save();
                        ctx.globalAlpha = Math.min(1, (skyPct - 0.4) * 1.5);
                        drawStarfield(ctx, W, H, tick, 120);
                        ctx.restore();
                      }

                      // Earth horizon curves away
                      if (skyPct > 0.2) {
                        var earthR = W * 3 * (1 - skyPct * 0.3);
                        var earthY = H + earthR * (0.3 + skyPct * 0.5);
                        var earthGrad = ctx.createRadialGradient(W * 0.5, earthY, earthR * 0.95, W * 0.5, earthY, earthR);
                        earthGrad.addColorStop(0, '#2a6a3a');
                        earthGrad.addColorStop(0.7, '#3a7aca');
                        earthGrad.addColorStop(0.9, '#88ccff');
                        earthGrad.addColorStop(1, 'transparent');
                        ctx.fillStyle = earthGrad;
                        ctx.beginPath();
                        ctx.arc(W * 0.5, earthY, earthR, 0, Math.PI * 2);
                        ctx.fill();
                      }

                      // ── Saturn V Rocket (enhanced detail) ──
                      var rocketX = W * 0.5, rocketY = H * 0.55;
                      var rocketH = 50;
                      var rBase = rocketY + rocketH / 2;
                      var rTop = rocketY - rocketH / 2;
                      // Body gradient (silver with panel lines)
                      var bodyGrad = ctx.createLinearGradient(rocketX - 10, 0, rocketX + 10, 0);
                      bodyGrad.addColorStop(0, '#c8ccd0'); bodyGrad.addColorStop(0.3, '#e8ecf0'); bodyGrad.addColorStop(0.7, '#f0f4f8'); bodyGrad.addColorStop(1, '#b8bcc0');
                      ctx.fillStyle = bodyGrad;
                      ctx.fillRect(rocketX - 9, rTop, 18, rocketH);
                      // Stage separation lines
                      ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 0.5;
                      var stageLines = [0.33, 0.55];
                      for (var sli = 0; sli < stageLines.length; sli++) {
                        var sly = rTop + rocketH * stageLines[sli];
                        ctx.beginPath(); ctx.moveTo(rocketX - 9, sly); ctx.lineTo(rocketX + 9, sly); ctx.stroke();
                      }
                      // Nose cone (elongated, white with escape tower)
                      ctx.fillStyle = '#f8f8f8';
                      ctx.beginPath();
                      ctx.moveTo(rocketX - 9, rTop);
                      ctx.lineTo(rocketX - 3, rTop - 14);
                      ctx.lineTo(rocketX, rTop - 20);
                      ctx.lineTo(rocketX + 3, rTop - 14);
                      ctx.lineTo(rocketX + 9, rTop);
                      ctx.fill();
                      // Escape tower
                      ctx.strokeStyle = '#888'; ctx.lineWidth = 1;
                      ctx.beginPath(); ctx.moveTo(rocketX, rTop - 20); ctx.lineTo(rocketX, rTop - 28); ctx.stroke();
                      // USA text
                      ctx.font = 'bold 4px sans-serif'; ctx.fillStyle = '#1e40af'; ctx.textAlign = 'center';
                      ctx.fillText('USA', rocketX, rTop + rocketH * 0.25);
                      // Fins (4 visible as 2 on each side)
                      ctx.fillStyle = '#94a3b8';
                      ctx.beginPath(); ctx.moveTo(rocketX - 9, rBase); ctx.lineTo(rocketX - 15, rBase + 8); ctx.lineTo(rocketX - 9, rBase - 5); ctx.fill();
                      ctx.beginPath(); ctx.moveTo(rocketX + 9, rBase); ctx.lineTo(rocketX + 15, rBase + 8); ctx.lineTo(rocketX + 9, rBase - 5); ctx.fill();
                      // ── Engine flame (dual envelope + Mach diamonds + particles) ──
                      var flameLen = 25 + Math.random() * 12 + velocity * 1.0;
                      var flameW = 7 + velocity * 0.15;
                      // Outer envelope (orange-red, wider)
                      var outerGrad = ctx.createLinearGradient(rocketX, rBase, rocketX, rBase + flameLen);
                      outerGrad.addColorStop(0, 'rgba(255,120,0,0.8)');
                      outerGrad.addColorStop(0.4, 'rgba(255,60,0,0.5)');
                      outerGrad.addColorStop(1, 'rgba(200,0,0,0)');
                      ctx.fillStyle = outerGrad;
                      ctx.beginPath();
                      ctx.moveTo(rocketX - flameW, rBase);
                      ctx.quadraticCurveTo(rocketX - flameW * 0.6, rBase + flameLen * 0.4, rocketX, rBase + flameLen);
                      ctx.quadraticCurveTo(rocketX + flameW * 0.6, rBase + flameLen * 0.4, rocketX + flameW, rBase);
                      ctx.fill();
                      // Inner core (white-yellow, narrow)
                      var innerGrad = ctx.createLinearGradient(rocketX, rBase, rocketX, rBase + flameLen * 0.7);
                      innerGrad.addColorStop(0, 'rgba(255,255,255,0.95)');
                      innerGrad.addColorStop(0.3, 'rgba(255,240,100,0.7)');
                      innerGrad.addColorStop(1, 'rgba(255,180,0,0)');
                      ctx.fillStyle = innerGrad;
                      ctx.beginPath();
                      ctx.moveTo(rocketX - flameW * 0.4, rBase);
                      ctx.quadraticCurveTo(rocketX - flameW * 0.2, rBase + flameLen * 0.3, rocketX, rBase + flameLen * 0.7);
                      ctx.quadraticCurveTo(rocketX + flameW * 0.2, rBase + flameLen * 0.3, rocketX + flameW * 0.4, rBase);
                      ctx.fill();
                      // Mach diamonds (bright spots in the exhaust at high velocity)
                      if (velocity > 5) {
                        ctx.shadowColor = 'rgba(255,240,180,0.9)'; ctx.shadowBlur = 8;
                        ctx.fillStyle = 'rgba(255,255,200,0.6)';
                        for (var md = 0; md < 3; md++) {
                          var mdy = rBase + flameLen * (0.15 + md * 0.18);
                          var mdSize = 2 - md * 0.4;
                          ctx.beginPath(); ctx.arc(rocketX, mdy, mdSize, 0, Math.PI * 2); ctx.fill();
                        }
                        ctx.shadowBlur = 0;
                      }
                      // Exhaust particles (scattered sparks)
                      ctx.globalAlpha = 0.6;
                      for (var epi = 0; epi < 6; epi++) {
                        var epx = rocketX + (Math.random() - 0.5) * flameW * 1.5;
                        var epy = rBase + flameLen * (0.3 + Math.random() * 0.7);
                        var epr = 0.5 + Math.random() * 1.5;
                        ctx.fillStyle = epi < 3 ? 'rgba(255,200,50,0.7)' : 'rgba(255,100,0,0.5)';
                        ctx.beginPath(); ctx.arc(epx, epy, epr, 0, Math.PI * 2); ctx.fill();
                      }
                      ctx.globalAlpha = 1;
                      // Smoke trail (billowing at lower altitudes, thins in upper atmosphere)
                      if (skyPct < 0.6) {
                        var smokeOpacity = 0.2 * (1 - skyPct * 1.5);
                        for (var smi = 0; smi < 10; smi++) {
                          ctx.globalAlpha = smokeOpacity * (1 - smi * 0.08);
                          ctx.fillStyle = smi < 4 ? '#ddd' : '#bbb';
                          var smx = rocketX + (Math.random() - 0.5) * (6 + smi * 3);
                          var smy = rBase + flameLen + smi * 14;
                          var smr = 4 + smi * 3.5;
                          ctx.beginPath(); ctx.arc(smx, smy, smr, 0, Math.PI * 2); ctx.fill();
                        }
                        ctx.globalAlpha = 1;
                      }

                      ctx.restore(); // end shake

                      // HUD overlay
                      ctx.fillStyle = 'rgba(0,0,0,0.5)';
                      ctx.fillRect(8, 8, 150, 90);
                      ctx.fillRect(W - 158, W < 330 ? 106 : 8, 150, 70);   // right box drops under the left on narrow canvases (they collided < ~324px)
                      ctx.font = 'bold 10px monospace';
                      ctx.textAlign = 'left';
                      ctx.fillStyle = '#38bdf8';
                      ctx.fillText('ALTITUDE', 14, 22);
                      ctx.fillStyle = '#ffffff';
                      ctx.font = 'bold 16px monospace';
                      ctx.fillText(altitude > 1000 ? (altitude / 1000).toFixed(1) + ' km' : Math.round(altitude) + ' m', 14, 40);
                      ctx.font = 'bold 10px monospace';
                      ctx.fillStyle = '#38bdf8';
                      ctx.fillText('VELOCITY', 14, 56);
                      ctx.fillStyle = '#ffffff';
                      ctx.font = '13px monospace';
                      ctx.fillText((velocity * 100).toFixed(0) + ' m/s', 14, 70);
                      ctx.font = 'bold 10px monospace';
                      ctx.fillStyle = '#38bdf8';
                      ctx.fillText('STAGE ' + stage + '/3', 14, 88);

                      // G-force meter (right side; follows the narrow-screen drop)
                      ctx.save();
                      if (W < 330) ctx.translate(0, 98);
                      ctx.textAlign = 'right';
                      ctx.font = 'bold 10px monospace';
                      ctx.fillStyle = '#fbbf24';
                      ctx.fillText('G-FORCE', W - 14, 22);
                      ctx.fillStyle = gForce > 4 ? '#ef4444' : gForce > 3 ? '#f59e0b' : '#22c55e';
                      ctx.font = 'bold 20px monospace';
                      ctx.fillText(gForce.toFixed(1) + 'g', W - 14, 44);
                      // G bar
                      ctx.fillStyle = '#1e293b';
                      ctx.fillRect(W - 148, 52, 130, 8);
                      var gPct = Math.min(1, gForce / 6);
                      ctx.fillStyle = gForce > 4 ? '#ef4444' : gForce > 3 ? '#f59e0b' : '#22c55e';
                      ctx.fillRect(W - 148, 52, 130 * gPct, 8);
                      ctx.restore();

                      // Stage separation notification
                      if ((altitude > 1990 && altitude < 2100) || (altitude > 7900 && altitude < 8100)) {
                        ctx.textAlign = 'center';
                        ctx.fillStyle = '#fbbf24';
                        ctx.font = 'bold 14px system-ui';
                        ctx.fillText('\u26A0 STAGE ' + (stage - 1) + ' SEPARATION', W * 0.5, H * 0.3);
                      }

                      // Phase complete — reached orbit
                      if (altitude > 20000) {
                        ctx.textAlign = 'center';
                        ctx.fillStyle = '#22c55e';
                        ctx.font = 'bold 18px system-ui';
                        ctx.fillText('\u2705 ORBIT ACHIEVED', W * 0.5, H * 0.2);
                        ctx.font = '11px system-ui';
                        ctx.fillStyle = '#94a3b8';
                        ctx.fillText('Click "Proceed" to continue to Earth orbit phase', W * 0.5, H * 0.26);
                      }
                    }

                    drawVignette(ctx, W, H, 0.3);
                    if (document.contains(cvEl)) requestAnimationFrame(drawLaunch);
                  }
                  drawLaunch();
                }
              })
            ),
            // Launch controls
            h('div', { className: 'p-3 border-t border-slate-700' },
              h('div', { className: 'flex items-center justify-between' },
                h('div', null,
                  h('p', { className: 'text-xs text-slate-600' }, t('stem.moonmission.saturn_v_3_stages_7_5_million_lbs_thru', '\uD83D\uDE80 Saturn V \u2022 3 stages \u2022 7.5 million lbs thrust')),
                  h('p', { className: 'text-[11px] text-slate-600' }, t('stem.moonmission.watch_the_countdown_and_ascent_through', 'Watch the countdown and ascent through Earth\'s atmosphere'))
                ),
                h('button', {
                  'aria-label': t('stem.moonmission.proceed_to_earth_orbit_phase_after_suc', 'Proceed to Earth orbit phase after successful launch'),
                  onClick: function() {
                    advancePhase(2);
                    log('\uD83D\uDE80 Launch successful! Reached Earth orbit.');
                    addXP(20);
                    if (addToast) addToast('\uD83C\uDF0D Orbit achieved! Preparing trans-lunar injection.', 'success');
                  },
                  className: 'px-4 py-2 rounded-lg text-xs font-bold text-white bg-green-600 hover:bg-green-700 transition-colors'
                }, t('stem.moonmission.proceed_to_orbit', '\u2705 Proceed to Orbit'))
              )
            )
          )
        ),

        // ═══ PHASE 2: EARTH ORBIT ═══
        phase === 2 && h('div', { className: 'space-y-3', style: { animation: 'mmFadeSlideIn 0.4s ease-out' } },
          h('div', { className: 'bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl overflow-hidden border border-slate-700' },
            // Earth orbit canvas — shows CSM orbiting while TLI window sweeps toward Moon alignment
            h('div', { className: 'relative', style: { height: '260px' } },
              h('canvas', {
                role: 'img',
                'aria-label': t('stem.moonmission.animated_view_of_spacecraft_in_low_ear', 'Animated view of spacecraft in low Earth orbit at 185 kilometers. CSM completes 1.5 orbits while a trans-lunar injection burn window aligns with the Moon\'s future position. Orbit counter, altitude, velocity, and TLI readiness displayed.'),
                style: { width: '100%', height: '100%', display: 'block' },
                ref: function(cvEl) {
                  if (!cvEl || cvEl._orbitLeoInit) return;
                  cvEl._orbitLeoInit = true;
                  var ctx = cvEl.getContext('2d');
                  var W = cvEl.offsetWidth || 500, HL = cvEl.offsetHeight || 260;
                  cvEl.width = W * 2; cvEl.height = HL * 2; ctx.scale(2, 2); if (typeof ResizeObserver === 'function' && !cvEl._mmRO) { cvEl._mmRO = new ResizeObserver(function() { var nw = cvEl.offsetWidth, nh = cvEl.offsetHeight; if (nw > 0 && nh > 0 && (nw !== W || nh !== HL)) { W = nw; HL = nh; cvEl.width = nw * 2; cvEl.height = nh * 2; ctx.setTransform(2, 0, 0, 2, 0, 0); } }); cvEl._mmRO.observe(cvEl); }   // rotate/resize used to leave the canvas stretched (backing store was locked at first mount)
                  var tick = 0;
                  // 1.5 orbits over ~22 seconds of viewing (60fps × 22 = 1320 frames → angSpeed ~0.0071)
                  var orbitAngSpeed = 0.0071;
                  // Moon's "future position" sits ~48° ahead of current; TLI must fire when CSM is at the opposite side of its orbit
                  function drawEarthOrbit() {
                    tick++;
                    ctx.clearRect(0, 0, W, HL);
                    // Space background + stars
                    ctx.fillStyle = '#020617'; ctx.fillRect(0, 0, W, HL);
                    drawStarfield(ctx, W, HL, tick, 110);
                    // Earth (left-of-center)
                    var eX = W * 0.34, eY = HL * 0.52, eR = Math.min(42, HL * 0.18);
                    drawDetailedEarth(ctx, eX, eY, eR, tick);
                    // Orbital ellipse (slight tilt for depth)
                    var orbR = eR + 26;
                    var orbRy = orbR * 0.92;
                    ctx.save();
                    ctx.strokeStyle = 'rgba(148,163,184,0.35)';
                    ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.ellipse(eX, eY, orbR, orbRy, -0.12, 0, Math.PI * 2); ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.restore();
                    // Moon's future position (far right) with a faint trajectory arc indicating TLI target
                    var moonX = W - 32, moonY = HL * 0.38, moonR = 10;
                    drawDetailedMoon(ctx, moonX, moonY, moonR, 42);
                    ctx.fillStyle = 'rgba(148,163,184,0.7)'; ctx.font = '8px system-ui'; ctx.textAlign = 'center';
                    ctx.fillText('Moon (in 3 days)', moonX, moonY + moonR + 12);
                    // Dashed TLI trajectory arc from Earth toward Moon's future position
                    ctx.save();
                    ctx.strokeStyle = 'rgba(251,191,36,0.25)';
                    ctx.setLineDash([2, 5]); ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(eX + orbR * 0.98, eY);
                    ctx.quadraticCurveTo((eX + moonX) * 0.5, eY - 40, moonX - moonR - 2, moonY);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.restore();
                    // Orbit angle (CCW, starts at 270° = top of orbit — a plausible LEO insertion point)
                    var orbAng = -Math.PI * 0.5 + tick * orbitAngSpeed;
                    var orbits = (tick * orbitAngSpeed) / (Math.PI * 2);
                    // TLI burn window: must fire when CSM is on Earth-side-away-from-Moon
                    // Correct burn point = orbital position where spacecraft velocity vector points toward Moon's future position (roughly 0 rad = right side of orbit)
                    var tliTargetAng = 0;
                    var angDiff = ((orbAng - tliTargetAng + Math.PI) % (Math.PI * 2)) - Math.PI;
                    var windowHalfWidth = 0.35; // radians ~20°
                    var inWindow = Math.abs(angDiff) < windowHalfWidth && orbits > 1.35;
                    // Draw TLI burn window as highlighted arc on the orbit
                    ctx.save();
                    ctx.strokeStyle = inWindow ? 'rgba(34,197,94,0.85)' : 'rgba(251,191,36,0.55)';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.ellipse(eX, eY, orbR, orbRy, -0.12, tliTargetAng - windowHalfWidth, tliTargetAng + windowHalfWidth);
                    ctx.stroke();
                    ctx.restore();
                    // Compute CSM position on tilted ellipse
                    var cosT = Math.cos(-0.12), sinT = Math.sin(-0.12);
                    var px = Math.cos(orbAng) * orbR, py = Math.sin(orbAng) * orbRy;
                    var scX = eX + px * cosT - py * sinT;
                    var scY = eY + px * sinT + py * cosT;
                    // Orbit trail (last ~60° of arc)
                    ctx.save();
                    ctx.strokeStyle = 'rgba(56,189,248,0.45)'; ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.ellipse(eX, eY, orbR, orbRy, -0.12, orbAng - 1.0, orbAng);
                    ctx.stroke();
                    ctx.restore();
                    // CSM + LM stack
                    ctx.save();
                    ctx.translate(scX, scY);
                    // Velocity vector indicator (tangent to orbit, points in direction of motion)
                    var tanAng = orbAng + Math.PI * 0.5;
                    ctx.rotate(tanAng - 0.12);
                    // Service module
                    ctx.fillStyle = '#c0c8d0'; ctx.fillRect(-6, -2, 8, 4);
                    // Command module nose
                    ctx.fillStyle = '#e8ecf0';
                    ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(-1, -2); ctx.lineTo(-4, -2); ctx.lineTo(-4, 2); ctx.lineTo(-1, 2); ctx.closePath(); ctx.fill();
                    // LM adapter
                    ctx.fillStyle = '#a0a8b0'; ctx.fillRect(-10, -2.5, 4, 5);
                    // Window glint
                    ctx.fillStyle = '#38bdf8'; ctx.fillRect(-2, -0.8, 1.5, 1.5);
                    // Engine glow if in TLI window
                    if (inWindow) {
                      var glowR = 3 + Math.sin(tick * 0.12) * 1.5; // ~1.15 Hz engine breath (was ~2.4 Hz, close to the photosensitivity line)
                      var glowGrad = ctx.createRadialGradient(-12, 0, 0, -12, 0, glowR + 2);
                      glowGrad.addColorStop(0, 'rgba(56,189,248,0.9)');
                      glowGrad.addColorStop(1, 'rgba(56,189,248,0)');
                      ctx.fillStyle = glowGrad;
                      ctx.beginPath(); ctx.arc(-12, 0, glowR + 2, 0, Math.PI * 2); ctx.fill();
                    }
                    ctx.restore();
                    // HUD — altitude, velocity, orbit count
                    ctx.fillStyle = 'rgba(0,0,0,0.55)';
                    ctx.fillRect(8, 8, 138, 64);
                    ctx.textAlign = 'left'; ctx.font = 'bold 9px monospace';
                    ctx.fillStyle = '#38bdf8'; ctx.fillText('ALTITUDE', 14, 22);
                    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px monospace';
                    ctx.fillText('185 km', 14, 36);
                    ctx.font = 'bold 9px monospace'; ctx.fillStyle = '#38bdf8';
                    ctx.fillText('VELOCITY', 14, 50);
                    ctx.fillStyle = '#fff'; ctx.font = '11px monospace';
                    ctx.fillText('7.8 km/s (28,000 km/h)', 14, 64);
                    // Orbit counter (right side; drops under the left panel below ~270px)
                    ctx.save();
                    if (W < 270) ctx.translate(0, 72);
                    ctx.fillStyle = 'rgba(0,0,0,0.55)';
                    ctx.fillRect(W - 112, 8, 104, 64);
                    ctx.textAlign = 'right'; ctx.font = 'bold 9px monospace';
                    ctx.fillStyle = '#fbbf24'; ctx.fillText('ORBITS', W - 14, 22);
                    ctx.fillStyle = '#fff'; ctx.font = 'bold 18px monospace';
                    ctx.fillText(Math.min(1.5, orbits).toFixed(2), W - 14, 42);
                    ctx.font = 'bold 9px monospace'; ctx.fillStyle = inWindow ? '#22c55e' : '#94a3b8';
                    ctx.fillText(inWindow ? 'TLI WINDOW \u25B6 GO' : 'TLI WINDOW', W - 14, 58);
                    ctx.font = '8px monospace';
                    ctx.fillText(orbits >= 1.35 ? (inWindow ? 'BURN NOW' : 'aligning...') : ('in ' + Math.max(0, (1.35 - orbits)).toFixed(2) + ' orbit'), W - 14, 68);
                    ctx.restore();
                    // Footer explainer text (fades in after 3s, cycles)
                    var lessons = [
                      'At 7.8 km/s, one orbit takes ~90 minutes.',
                      'TLI must fire at the right point to hit the Moon\'s future position.',
                      'The Moon moves ~1 km/s — you aim where it WILL be.',
                      '1.5 orbits gives Houston time to verify systems before TLI.',
                      'A 1\u00B0 burn error misses the Moon by thousands of km.'
                    ];
                    var lIdx = Math.floor(tick / 260) % lessons.length;
                    var lFade = Math.min(1, (tick % 260) < 210 ? (tick % 260) / 25 : (260 - tick % 260) / 50);
                    if (tick > 120) {
                      ctx.globalAlpha = lFade * 0.85;
                      ctx.textAlign = 'center'; ctx.font = 'italic 10px system-ui';
                      ctx.fillStyle = '#a5b4fc';
                      ctx.fillText(lessons[lIdx], W * 0.5, HL - 10);
                      ctx.globalAlpha = 1;
                    }
                    drawVignette(ctx, W, HL, 0.25);
                    if (document.contains(cvEl)) requestAnimationFrame(drawEarthOrbit);
                  }
                  drawEarthOrbit();
                }
              })
            ),
            h('div', { className: 'p-4 text-white' },
            h('div', { className: 'text-center mb-3' },
              h('div', { className: 'text-3xl' }, '\uD83C\uDF0D'),
              h('h4', { className: 'text-base font-bold' }, t('stem.moonmission.low_earth_orbit', 'Low Earth Orbit')),
              h('p', { className: 'text-[11px] text-slate-600' }, t('stem.moonmission.altitude_185_km_speed_28_000_km_h_1_5_', 'Altitude: 185 km \u2022 Speed: 28,000 km/h \u2022 1.5 orbits before TLI burn'))
            ),
            h('div', { className: 'bg-white/5 rounded-lg p-3 border border-white/10 mb-3' },
              h('p', { className: 'text-[11px] text-sky-300 font-bold mb-1' }, t('stem.moonmission.trans_lunar_injection_tli', '\uD83D\uDE80 TRANS-LUNAR INJECTION (TLI)')),
              h('p', { className: 'text-[11px] text-slate-300 leading-relaxed' },
                t('stem.moonmission.the_s_ivb_third_stage_will_fire_for_5_', 'The S-IVB third stage will fire for 5 minutes 47 seconds to accelerate from 28,000 km/h to 38,900 km/h \u2014 trans-lunar injection speed, just under escape velocity. This single burn sends you on a trajectory to the Moon, 384,400 km away.')),
              h('div', { className: 'grid grid-cols-3 gap-2 mt-2' },
                [
                  ['\u0394v Required', '3.13 km/s'],
                  ['Burn Duration', '5m 47s'],
                  ['Coast Time', '~3 days']
                ].map(function(item) {
                  return h('div', { key: item[0], className: 'bg-white/5 rounded p-1.5 text-center' },
                    h('p', { className: 'text-[11px] text-slate-600' }, item[0]),
                    h('p', { className: 'text-[11px] font-bold text-sky-300' }, item[1])
                  );
                })
              )
            ),
            h('div', { className: 'bg-indigo-500/10 rounded-lg p-2 border border-indigo-500/20' },
              h('p', { className: 'text-[11px] text-indigo-300' }, '\uD83D\uDCA1 ' + APOLLO_FACTS[Math.floor(Math.random() * APOLLO_FACTS.length)])
            )
            )
          ),
          h('button', {
            'aria-label': t('stem.moonmission.execute_trans_lunar_injection_burn_to_', 'Execute trans-lunar injection burn to begin 3-day journey to the Moon'),
            onClick: function() {
              advancePhase(3);
              upd('showQuiz', true); // Trigger quiz during coast
              log('\uD83D\uDE80 TLI burn complete! En route to the Moon.');
              addXP(15);
              if (addToast) addToast('\uD83C\uDF11 Trans-lunar injection successful! Time for a space knowledge check.', 'success');
            },
            className: 'w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg'
          }, t('stem.moonmission.execute_tli_burn_head_to_the_moon', '\uD83D\uDE80 Execute TLI Burn \u2014 Head to the Moon'))
        ),

        // ═══ PHASE 3: TRANS-LUNAR COAST (Animated Canvas) ═══
        phase === 3 && h('div', { className: 'space-y-3', style: { animation: 'mmFadeSlideIn 0.4s ease-out' } },
          h('div', { className: 'bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl overflow-hidden border border-slate-700' },
            h('div', { className: 'relative', style: { height: '280px' } },
              h('canvas', { 
                role: 'img',
                'aria-label': t('stem.moonmission.animated_trans_lunar_coast_earth_shrin', 'Animated trans-lunar coast. Earth shrinks on the left, Moon grows on the right as the spacecraft travels 384,400 kilometers over 3 days. Shows distance counter and mission communications.'),
                style: { width: '100%', height: '100%', display: 'block' },
                ref: function(cvEl) {
                  if (!cvEl || cvEl._transitInit) return;
                  cvEl._transitInit = true;
                  var ctx = cvEl.getContext('2d');
                  var W = cvEl.offsetWidth || 500, H3 = cvEl.offsetHeight || 280;
                  cvEl.width = W * 2; cvEl.height = H3 * 2; ctx.scale(2, 2); if (typeof ResizeObserver === 'function' && !cvEl._mmRO) { cvEl._mmRO = new ResizeObserver(function() { var nw = cvEl.offsetWidth, nh = cvEl.offsetHeight; if (nw > 0 && nh > 0 && (nw !== W || nh !== H3)) { W = nw; H3 = nh; cvEl.width = nw * 2; cvEl.height = nh * 2; ctx.setTransform(2, 0, 0, 2, 0, 0); } }); cvEl._mmRO.observe(cvEl); }   // rotate/resize used to leave the canvas stretched (backing store was locked at first mount)
                  var tick = 0;
                  function drawTransit() {
                    tick++;
                    ctx.clearRect(0, 0, W, H3);
                    // Space background
                    ctx.fillStyle = '#010108'; ctx.fillRect(0, 0, W, H3);
                    // Enhanced starfield
                    drawStarfield(ctx, W, H3, tick, 150);
                    // Journey progress (0 to 1 over time)
                    var progress = Math.min(0.95, tick * 0.0005);
                    // Earth (left side, larger — ~3.7x Moon's initial size, shrinks as we depart)
                    var earthR = Math.max(8, 55 * (1 - progress * 0.5));
                    var earthX = 70 + progress * 15;
                    drawDetailedEarth(ctx, earthX, H3 * 0.5, earthR, tick);
                    // Moon (right side, grows as we approach)
                    var moonR = 8 + progress * 30;
                    var moonX = W - 50 - (1 - progress) * 10;
                    drawDetailedMoon(ctx, moonX, H3 * 0.5, moonR, 42);
                    // Spacecraft (CSM shape with trail)
                    var scX = earthX + earthR + 15 + (moonX - earthX - earthR - moonR - 30) * progress;
                    var scY = H3 * 0.5 + Math.sin(tick * 0.008) * 5;
                    // Fading dashed trail
                    ctx.save();
                    ctx.strokeStyle = 'rgba(56,189,248,0.12)';
                    ctx.lineWidth = 1;
                    ctx.setLineDash([3, 4]);
                    ctx.beginPath(); ctx.moveTo(earthX + earthR + 10, H3 * 0.5); ctx.lineTo(scX - 8, scY); ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.restore();
                    // CSM body (command module cone + service module rectangle)
                    ctx.save();
                    ctx.translate(scX, scY);
                    // Blue engine glow
                    ctx.fillStyle = 'rgba(56,189,248,0.3)';
                    ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
                    // Service module (silver rectangle)
                    ctx.fillStyle = '#c0c8d0';
                    ctx.fillRect(-8, -2.5, 10, 5);
                    // Command module (white cone)
                    ctx.fillStyle = '#e8ecf0';
                    ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(2, -3); ctx.lineTo(-1, -3); ctx.lineTo(-1, 3); ctx.lineTo(2, 3); ctx.closePath(); ctx.fill();
                    // Window
                    ctx.fillStyle = '#38bdf8';
                    ctx.fillRect(1, -1, 2, 2);
                    // LM adapter (wider section behind SM)
                    ctx.fillStyle = '#a0a8b0';
                    ctx.fillRect(-12, -3.5, 4, 7);
                    // Tiny engine glow at rear
                    ctx.fillStyle = 'rgba(100,180,255,0.5)';
                    ctx.beginPath(); ctx.arc(-13, 0, 1.5, 0, Math.PI * 2); ctx.fill();
                    ctx.restore();
                    // Distance readout
                    var distFromEarth = Math.round(progress * 384400);
                    var distToMoon = 384400 - distFromEarth;
                    ctx.font = '9px monospace'; ctx.textAlign = 'center';
                    ctx.fillStyle = '#38bdf8';
                    ctx.fillText(distFromEarth.toLocaleString() + ' km from Earth', scX, scY - 12);
                    ctx.fillStyle = '#94a3b8';
                    ctx.fillText(distToMoon.toLocaleString() + ' km to Moon', scX, scY + 18);
                    // Comms chatter
                    var commsMessages = [
                      'Houston: "You are GO for TLI."',
                      'CMP: "Transposition and docking complete."',
                      'CDR: "The Earth is getting smaller every hour."',
                      'LMP: "Mid-course correction burn nominal."',
                      'Houston: "Apollo, you are GO for LOI."',
                      'CDR: "We can see the Moon growing. Incredible."'
                    ];
                    var commsIdx = Math.floor(tick / 300) % commsMessages.length;
                    var commsFade = Math.min(1, (tick % 300) < 240 ? (tick % 300) / 30 : (300 - tick % 300) / 60);
                    ctx.globalAlpha = commsFade * 0.7;
                    ctx.font = 'italic 10px system-ui';
                    ctx.fillStyle = '#a5b4fc';
                    ctx.fillText(commsMessages[commsIdx], W * 0.5, H3 - 12);
                    ctx.globalAlpha = 1;
                    drawVignette(ctx, W, H3, 0.25);
                    if (document.contains(cvEl)) requestAnimationFrame(drawTransit);
                  }
                  drawTransit();
                }
              })
            ),
            h('div', { className: 'p-3 border-t border-slate-700' },
              h('div', { className: 'space-y-1.5 mb-2' },
                [
                  'The Command Module extracts the Lunar Module from the S-IVB third stage.',
                  'The spacecraft rotates slowly ("BBQ roll") to evenly distribute solar heating.',
                  'Even a 1\u00B0 trajectory error would miss the Moon by thousands of kilometers.'
                ].map(function(fact, i) {
                  return h('p', { key: i, className: 'text-[11px] text-slate-600' }, '\u2022 ' + fact);
                })
              ),
              h('div', { className: 'bg-indigo-500/10 rounded p-1.5 border border-indigo-500/20 mb-2' },
                h('p', { className: 'text-[11px] text-indigo-300' }, '\uD83D\uDCA1 ' + APOLLO_FACTS[Math.floor(Math.random() * APOLLO_FACTS.length)])
              )
            )
          ),
          h('button', {
            'aria-label': t('stem.moonmission.arrive_at_the_moon_and_enter_lunar_orb', 'Arrive at the Moon and enter lunar orbit at 110 kilometer altitude'),
            onClick: function() {
              advancePhase(4);
              log('\uD83C\uDF15 Approaching the Moon. Preparing for lunar orbit insertion.');
              addXP(15);
              if (addToast) addToast('\uD83C\uDF15 The Moon fills the window! Preparing LOI burn.', 'success');
            },
            className: 'w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 shadow-lg'
          }, t('stem.moonmission.arrive_at_the_moon_enter_lunar_orbit', '\uD83C\uDF15 Arrive at the Moon \u2014 Enter Lunar Orbit'))
        ),

        // ═══ PHASE 4: LUNAR ORBIT (Animated Canvas) ═══
        phase === 4 && h('div', { className: 'space-y-3', style: { animation: 'mmFadeSlideIn 0.4s ease-out' } },
          h('div', { className: 'bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl overflow-hidden border border-slate-700' },
            h('div', { className: 'relative', style: { height: '240px' } },
              h('canvas', { 
                role: 'img',
                'aria-label': t('stem.moonmission.animated_view_of_spacecraft_orbiting_t', 'Animated view of spacecraft orbiting the Moon at 110 kilometer altitude. Shows the Moon surface with craters, Sea of Tranquility landing site marked in green, and the spacecraft dot orbiting.'),
                style: { width: '100%', height: '100%', display: 'block' },
                ref: function(cvEl) {
                  if (!cvEl || cvEl._orbitInit) return;
                  cvEl._orbitInit = true;
                  var ctx = cvEl.getContext('2d');
                  var W = cvEl.offsetWidth || 500, HO = cvEl.offsetHeight || 240;
                  cvEl.width = W * 2; cvEl.height = HO * 2; ctx.scale(2, 2); if (typeof ResizeObserver === 'function' && !cvEl._mmRO) { cvEl._mmRO = new ResizeObserver(function() { var nw = cvEl.offsetWidth, nh = cvEl.offsetHeight; if (nw > 0 && nh > 0 && (nw !== W || nh !== HO)) { W = nw; HO = nh; cvEl.width = nw * 2; cvEl.height = nh * 2; ctx.setTransform(2, 0, 0, 2, 0, 0); } }); cvEl._mmRO.observe(cvEl); }   // rotate/resize used to leave the canvas stretched (backing store was locked at first mount)
                  var tick = 0;
                  function drawOrbit() {
                    tick++;
                    ctx.clearRect(0, 0, W, HO);
                    ctx.fillStyle = '#000008'; ctx.fillRect(0, 0, W, HO);
                    // Enhanced starfield
                    drawStarfield(ctx, W, HO, tick, 100);
                    // Earthrise — small Earth visible near top-right
                    drawDetailedEarth(ctx, W - 35, 25, 12, tick);
                    ctx.font = '6px system-ui'; ctx.fillStyle = 'rgba(147,197,253,0.5)'; ctx.textAlign = 'center';
                    ctx.fillText('Earth', W - 35, 42);
                    // Moon (large, fills most of the view) — detailed procedural rendering
                    var moonCx = W * 0.5, moonCy = HO * 0.55;
                    var moonR = Math.min(W, HO) * 0.38;
                    drawDetailedMoon(ctx, moonCx, moonCy, moonR, 77);
                    // Landing site marker (over the detailed moon)
                    ctx.save(); ctx.beginPath(); ctx.arc(moonCx, moonCy, moonR, 0, Math.PI * 2); ctx.clip();
                    var lsX = moonCx + moonR * 0.15, lsY = moonCy - moonR * 0.05;
                    ctx.shadowColor = 'rgba(74,222,128,0.9)'; ctx.shadowBlur = 9;
                    ctx.fillStyle = 'rgba(34,197,94,' + (0.4 + Math.sin(tick * 0.06) * 0.3) + ')';
                    ctx.beginPath(); ctx.arc(lsX, lsY, 3, 0, Math.PI * 2); ctx.fill();
                    ctx.shadowBlur = 0;
                    ctx.font = '7px system-ui'; ctx.fillStyle = '#4ade80'; ctx.textAlign = 'left';
                    ctx.fillText('Tranquility Base', lsX + 6, lsY + 3);
                    ctx.restore();
                    // Orbiting spacecraft
                    var orbitR = moonR * 1.2;
                    var scAngle = tick * 0.012;
                    var scX = moonCx + Math.cos(scAngle) * orbitR;
                    var scY = moonCy + Math.sin(scAngle) * orbitR * 0.3;
                    // Orbit path
                    ctx.strokeStyle = 'rgba(56,189,248,0.15)'; ctx.lineWidth = 0.5;
                    ctx.beginPath(); ctx.ellipse(moonCx, moonCy, orbitR, orbitR * 0.3, 0, 0, Math.PI * 2); ctx.stroke();
                    // Spacecraft
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath(); ctx.arc(scX, scY, 2, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = 'rgba(56,189,248,0.3)';
                    ctx.beginPath(); ctx.arc(scX, scY, 5, 0, Math.PI * 2); ctx.fill();
                    // Label
                    ctx.font = '8px monospace'; ctx.fillStyle = '#38bdf8'; ctx.textAlign = 'center';
                    ctx.fillText('CSM + LM', scX, scY - 8);
                    // HUD
                    ctx.font = 'bold 9px monospace'; ctx.textAlign = 'left';
                    ctx.fillStyle = '#94a3b8';
                    ctx.fillText('LUNAR ORBIT \u2022 ALT 110 km \u2022 PERIOD 2h', 10, 14);
                    // Comms
                    var orbitComms = ['Houston: "You are GO for undocking."', 'CMP: "I\'ll keep Columbia warm for you."', 'CDR: "The landing site looks smooth."', 'LMP: "Eagle systems nominal."'];
                    var ocIdx = Math.floor(tick / 250) % orbitComms.length;
                    ctx.globalAlpha = Math.min(1, (tick % 250) < 200 ? (tick % 250) / 30 : (250 - tick % 250) / 50) * 0.6;
                    ctx.font = 'italic 9px system-ui'; ctx.fillStyle = '#a5b4fc'; ctx.textAlign = 'center';
                    ctx.fillText(orbitComms[ocIdx], W * 0.5, HO - 10);
                    ctx.globalAlpha = 1;
                    drawVignette(ctx, W, HO, 0.2);
                    if (document.contains(cvEl)) requestAnimationFrame(drawOrbit);
                  }
                  drawOrbit();
                }
              })
            ),
            h('div', { className: 'p-3 border-t border-slate-700' },
              h('div', { className: 'grid grid-cols-2 gap-2 mb-2' },
                [
                  ['\uD83C\uDF15 Landing Site', 'Mare Tranquillitatis'],
                  ['\uD83D\uDCCD Coordinates', '0.674\u00B0N, 23.473\u00B0E'],
                  ['\uD83D\uDE80 LM "Eagle"', 'CDR + LMP aboard'],
                  ['\uD83D\uDEF0 CM "Columbia"', 'CMP orbiting solo']
                ].map(function(item) {
                  return h('div', { key: item[0], className: 'bg-slate-800 rounded p-1.5' },
                    h('p', { className: 'text-[11px] text-slate-600' }, item[0]),
                    h('p', { className: 'text-[11px] font-bold text-slate-200' }, item[1])
                  );
                })
              )
            )
          ),
          h('button', {
            'aria-label': t('stem.moonmission.undock_lunar_module_eagle_from_command', 'Undock Lunar Module Eagle from Command Module Columbia and begin powered descent to the Moon surface'),
            onClick: function() {
              advancePhase(5);
              log('\u2B07\uFE0F Undocked from Columbia. Beginning powered descent.');
              addXP(15);
              if (addToast) addToast('\u2B07\uFE0F "The Eagle has undocked!" Beginning powered descent.', 'success');
            },
            className: 'w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-lg'
          }, t('stem.moonmission.undock_begin_powered_descent', '\u2B07\uFE0F Undock & Begin Powered Descent'))
        ),

        // ═══ PHASE 5: POWERED DESCENT ═══
        phase === 5 && h('div', { className: 'space-y-3', style: { animation: 'mmFadeSlideIn 0.4s ease-out' } },
          // Onboarding overlay (before game starts)
          !d.descentStarted && h('div', { className: 'bg-gradient-to-b from-slate-900 to-indigo-950 rounded-xl p-5 border border-slate-700 text-white text-center' },
            h('div', { className: 'text-4xl mb-3' }, '\u2B07\uFE0F'),
            h('h4', { className: 'text-lg font-black mb-2' }, t('stem.moonmission.powered_descent_2', 'Powered Descent')),
            h('p', { className: 'text-xs text-slate-200 mb-4' }, 'You are piloting the Lunar Module to the Moon\'s surface. Control your thrust to land softly!'),
            h('div', { className: 'grid grid-cols-3 gap-3 mb-4 max-w-sm mx-auto' },
              h('div', { className: 'bg-white/5 rounded-lg p-3 border border-white/10' },
                h('div', { className: 'text-2xl mb-1' }, '\u2B06\uFE0F'),
                h('p', { className: 'text-[11px] font-bold text-sky-300' }, t('stem.moonmission.w', 'W / \u2191')),
                h('p', { className: 'text-[11px] text-slate-600' }, t('stem.moonmission.fire_engines_thrust_up', 'Fire engines (thrust UP)'))
              ),
              h('div', { className: 'bg-white/5 rounded-lg p-3 border border-white/10' },
                h('div', { className: 'text-2xl mb-1' }, '\u2194\uFE0F'),
                h('p', { className: 'text-[11px] font-bold text-sky-300' }, t('stem.moonmission.a_d_or', 'A/D or \u2190/\u2192')),
                h('p', { className: 'text-[11px] text-slate-600' }, t('stem.moonmission.lateral_movement', 'Lateral movement'))
              ),
              h('div', { className: 'bg-white/5 rounded-lg p-3 border border-white/10' },
                h('div', { className: 'text-2xl mb-1' }, '\uD83C\uDFAF'),
                h('p', { className: 'text-[11px] font-bold text-amber-300' }, t('stem.moonmission.goal', 'Goal')),
                h('p', { className: 'text-[11px] text-slate-600' }, t('stem.moonmission.v_3_m_s_h_5_m_s', 'V < 3 m/s, H < 5 m/s'))
              )
            ),
            h('div', { className: 'bg-amber-500/10 rounded-lg p-3 border border-amber-500/20 mb-4 max-w-sm mx-auto' },
              h('p', { className: 'text-[11px] text-amber-300 font-bold mb-1' }, t('stem.moonmission.tips_from_mission_control', '\u26A0\uFE0F Tips from Mission Control:')),
              h('ul', { className: 'text-[11px] text-amber-200 space-y-1 text-left pl-4' },
                h('li', null, t('stem.moonmission.start_slowing_down_early_moon_gravity_', 'Start slowing down early \u2014 Moon gravity is gentle but relentless')),
                h('li', null, t('stem.moonmission.watch_your_fuel_gauge_you_can_t_thrust', 'Watch your fuel gauge \u2014 you can\'t thrust without fuel!')),
                h('li', null, t('stem.moonmission.reduce_horizontal_speed_before_focusin', 'Reduce horizontal speed before focusing on vertical')),
                h('li', null, t('stem.moonmission.the_real_apollo_11_landed_with_only_25', 'The real Apollo 11 landed with only 25 seconds of fuel left!'))
              )
            ),
            h('button', {
              'aria-label': t('stem.moonmission.begin_powered_descent_piloting', 'Begin powered descent piloting'),
              onClick: function() { upd('descentStarted', true); },
              className: 'px-8 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-lg transition-all hover:scale-[1.02] animate-pulse'
            }, t('stem.moonmission.begin_descent_take_the_controls', '\uD83D\uDE80 Begin Descent \u2014 Take the Controls!'))
          ),
          // Game canvas (after onboarding)
          d.descentStarted && h('div', { className: 'bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl overflow-hidden border border-slate-700' },
            h('div', { className: 'relative', style: { height: '420px' } },
              h('canvas', { 
                'data-descent-canvas': 'true',
                role: 'application',
                'aria-label': t('stem.moonmission.interactive_lunar_descent_piloting_gam', 'Interactive lunar descent piloting game. Use W or Up Arrow for thrust, A and D or Left and Right arrows for lateral movement. Land with vertical speed under 3 meters per second and horizontal speed under 5 meters per second.'),
                style: { width: '100%', height: '100%', display: 'block' },
                ref: function(cvEl) {
                  if (!cvEl || cvEl._descentInit) return;
                  cvEl._descentInit = true;
                  var ctx = cvEl.getContext('2d');
                  var W = cvEl.offsetWidth || 500, H = cvEl.offsetHeight || 420;
                  cvEl.width = W * 2; cvEl.height = H * 2; ctx.scale(2, 2); if (typeof ResizeObserver === 'function' && !cvEl._mmRO) { cvEl._mmRO = new ResizeObserver(function() { var nw = cvEl.offsetWidth, nh = cvEl.offsetHeight; if (nw > 0 && nh > 0 && (nw !== W || nh !== H)) { W = nw; H = nh; cvEl.width = nw * 2; cvEl.height = nh * 2; ctx.setTransform(2, 0, 0, 2, 0, 0); } }); cvEl._mmRO.observe(cvEl); }   // rotate/resize used to leave the canvas stretched (backing store was locked at first mount)
                  var tick = 0;
                  var alt = 15000; // meters
                  var vVel = -20; // vertical velocity (negative = descending)
                  var hVel = 500; // horizontal velocity
                  var fuel = (diffSettings && diffSettings.fuel) || 100;      // difficulty was a dead setting here
                  var thrust = 0;
                  var landed = false;
                  var crashed = false;
                  var alarms = [];

                  // Controls
                  var keys = {};
                  cvEl.tabIndex = 0;
                  cvEl.addEventListener('keydown', function(e) { var k = e.key.toLowerCase(); if (['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d',' '].indexOf(k) === -1) return; keys[e.key] = true; e.preventDefault(); });   // only game keys — Tab must escape (WCAG 2.1.2)
                  cvEl.addEventListener('keyup', function(e) { keys[e.key] = false; });
                  cvEl.focus();

                  function drawDescent() {
                    tick++;
                    ctx.clearRect(0, 0, W, H);

                    if (!landed && !crashed) {
                      // Controls: up arrow = thrust, left/right = horizontal adjust
                      if (keys['ArrowUp'] || keys['w'] || keys['W']) {
                        thrust = Math.min(1, thrust + 0.03);
                        if (fuel > 0) fuel -= 0.08;
                      } else {
                        thrust *= 0.95;
                      }
                      if (keys['ArrowLeft'] || keys['a'] || keys['A']) hVel -= 0.5;
                      if (keys['ArrowRight'] || keys['d'] || keys['D']) hVel += 0.5;

                      // Physics
                      var gravity = (diffSettings && diffSettings.gravity) || 1.62; // Moon gravity m/s^2 (difficulty-scaled)
                      var thrustForce = thrust * (fuel > 0 ? 4 : 0);
                      vVel += (-gravity + thrustForce) * 0.016;
                      hVel *= 0.999;
                      alt += vVel * 0.5;

                      // Program alarms
                      if (alt < 500 && alarms.indexOf('1202') === -1) {
                        alarms.push('1202');
                      }

                      // Landing check
                      if (alt <= 0) {
                        alt = 0;
                        if (Math.abs(vVel) < 3 && Math.abs(hVel) < 5) {
                          landed = true;
                        } else {
                          crashed = true;
                        }
                      }
                    }

                    // Background: black space + Moon surface below
                    ctx.fillStyle = '#000005';
                    ctx.fillRect(0, 0, W, H);
                    // Enhanced starfield (upper portion of canvas only)
                    ctx.save();
                    ctx.beginPath(); ctx.rect(0, 0, W, H * 0.45); ctx.clip();
                    drawStarfield(ctx, W, H * 0.45, tick, 80);
                    ctx.restore();

                    // Moon surface (rises as altitude drops)
                    var surfaceY = H * 0.5 + Math.min(H * 0.45, (alt / 15000) * H * 0.45);
                    // ── Moon surface (gradient with procedural craters + boulders) ──
                    var surfGrad = ctx.createLinearGradient(0, surfaceY, 0, H);
                    surfGrad.addColorStop(0, '#9a9288'); surfGrad.addColorStop(0.3, '#8a8278'); surfGrad.addColorStop(1, '#6a6258');
                    ctx.fillStyle = surfGrad;
                    ctx.fillRect(0, surfaceY, W, H - surfaceY);
                    // Procedural craters (seeded so they're stable)
                    var sRng = _seededRand(314);
                    if (surfaceY < H - 10) {
                      for (var ci = 0; ci < 16; ci++) {
                        var crX = sRng.next() * W;
                        var crY = surfaceY + 5 + sRng.next() * Math.max(5, (H - surfaceY) * 0.7);
                        var crR = 3 + sRng.next() * 12;
                        // Shadow
                        ctx.fillStyle = 'rgba(80,70,60,0.3)';
                        ctx.beginPath(); ctx.arc(crX, crY, crR, 0, Math.PI * 2); ctx.fill();
                        // Bright rim (upper-left)
                        ctx.strokeStyle = 'rgba(180,170,160,0.25)';
                        ctx.lineWidth = Math.max(0.5, crR * 0.12);
                        ctx.beginPath(); ctx.arc(crX, crY, crR, -2.5, -0.8); ctx.stroke();
                      }
                      // Scattered boulders
                      ctx.fillStyle = 'rgba(100,90,80,0.4)';
                      for (var bi = 0; bi < 8; bi++) {
                        var bx = sRng.next() * W;
                        var by = surfaceY + 3 + sRng.next() * Math.max(3, (H - surfaceY) * 0.5);
                        var br = 1 + sRng.next() * 3;
                        ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
                      }
                    }

                    // ── Enhanced Lunar Module ──
                    var lmX = W * 0.5, lmY = Math.min(surfaceY - 18, H * 0.5);
                    // Descent stage (octagonal gold foil)
                    ctx.fillStyle = '#c9a04a';
                    ctx.beginPath();
                    ctx.moveTo(lmX - 14, lmY + 3); ctx.lineTo(lmX - 12, lmY); ctx.lineTo(lmX + 12, lmY);
                    ctx.lineTo(lmX + 14, lmY + 3); ctx.lineTo(lmX + 14, lmY + 13);
                    ctx.lineTo(lmX + 12, lmY + 16); ctx.lineTo(lmX - 12, lmY + 16); ctx.lineTo(lmX - 14, lmY + 13);
                    ctx.closePath(); ctx.fill();
                    // Gold foil texture lines
                    ctx.strokeStyle = 'rgba(160,120,40,0.3)'; ctx.lineWidth = 0.5;
                    for (var fl = 0; fl < 3; fl++) {
                      ctx.beginPath(); ctx.moveTo(lmX - 12, lmY + 4 + fl * 4); ctx.lineTo(lmX + 12, lmY + 4 + fl * 4); ctx.stroke();
                    }
                    // Ascent stage (angular silver with facets)
                    ctx.fillStyle = '#c8c8c8';
                    ctx.beginPath();
                    ctx.moveTo(lmX - 11, lmY); ctx.lineTo(lmX - 9, lmY - 16);
                    ctx.lineTo(lmX + 9, lmY - 16); ctx.lineTo(lmX + 11, lmY);
                    ctx.closePath(); ctx.fill();
                    // Facet shading
                    ctx.fillStyle = 'rgba(0,0,0,0.06)';
                    ctx.beginPath(); ctx.moveTo(lmX, lmY); ctx.lineTo(lmX + 9, lmY - 16); ctx.lineTo(lmX + 11, lmY); ctx.closePath(); ctx.fill();
                    // Triangular windows (like real LM)
                    ctx.fillStyle = '#1a2a3a';
                    ctx.beginPath(); ctx.moveTo(lmX - 5, lmY - 12); ctx.lineTo(lmX - 2, lmY - 6); ctx.lineTo(lmX - 8, lmY - 6); ctx.closePath(); ctx.fill();
                    ctx.beginPath(); ctx.moveTo(lmX + 5, lmY - 12); ctx.lineTo(lmX + 2, lmY - 6); ctx.lineTo(lmX + 8, lmY - 6); ctx.closePath(); ctx.fill();
                    // Antenna dish on top
                    ctx.strokeStyle = '#aaa'; ctx.lineWidth = 0.8;
                    ctx.beginPath(); ctx.moveTo(lmX + 2, lmY - 16); ctx.lineTo(lmX + 2, lmY - 22); ctx.stroke();
                    ctx.beginPath(); ctx.arc(lmX + 2, lmY - 22, 3, Math.PI, 0); ctx.stroke();
                    // RCS quads (small rectangles on corners)
                    ctx.fillStyle = '#999';
                    ctx.fillRect(lmX - 13, lmY - 10, 3, 4);
                    ctx.fillRect(lmX + 10, lmY - 10, 3, 4);
                    // 4 Legs (spread outward)
                    ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(lmX - 14, lmY + 14); ctx.lineTo(lmX - 24, lmY + 27);
                    ctx.moveTo(lmX + 14, lmY + 14); ctx.lineTo(lmX + 24, lmY + 27);
                    ctx.moveTo(lmX - 6, lmY + 16); ctx.lineTo(lmX - 10, lmY + 27);
                    ctx.moveTo(lmX + 6, lmY + 16); ctx.lineTo(lmX + 10, lmY + 27);
                    ctx.stroke();
                    // Foot pads (circles)
                    ctx.fillStyle = '#888';
                    ctx.beginPath(); ctx.arc(lmX - 24, lmY + 28, 2.5, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(lmX + 24, lmY + 28, 2.5, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(lmX - 10, lmY + 28, 2, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(lmX + 10, lmY + 28, 2, 0, Math.PI * 2); ctx.fill();
                    // ── Descent engine flame (dual envelope) ──
                    if (thrust > 0.1 && fuel > 0) {
                      var fLen = 12 + thrust * 28 + Math.random() * 5;
                      var fW = 4 + thrust * 3;
                      // Outer flame
                      var fOutGrad = ctx.createLinearGradient(lmX, lmY + 16, lmX, lmY + 16 + fLen);
                      fOutGrad.addColorStop(0, 'rgba(255,130,0,0.7)'); fOutGrad.addColorStop(0.5, 'rgba(255,60,0,0.3)'); fOutGrad.addColorStop(1, 'rgba(200,0,0,0)');
                      ctx.fillStyle = fOutGrad;
                      ctx.beginPath();
                      ctx.moveTo(lmX - fW, lmY + 16);
                      ctx.quadraticCurveTo(lmX - fW * 0.5, lmY + 16 + fLen * 0.4, lmX, lmY + 16 + fLen);
                      ctx.quadraticCurveTo(lmX + fW * 0.5, lmY + 16 + fLen * 0.4, lmX + fW, lmY + 16);
                      ctx.fill();
                      // Inner core
                      var fInGrad = ctx.createLinearGradient(lmX, lmY + 16, lmX, lmY + 16 + fLen * 0.65);
                      fInGrad.addColorStop(0, 'rgba(255,255,255,0.9)'); fInGrad.addColorStop(0.4, 'rgba(255,230,80,0.5)'); fInGrad.addColorStop(1, 'rgba(255,180,0,0)');
                      ctx.fillStyle = fInGrad;
                      ctx.beginPath();
                      ctx.moveTo(lmX - fW * 0.3, lmY + 16);
                      ctx.quadraticCurveTo(lmX, lmY + 16 + fLen * 0.3, lmX, lmY + 16 + fLen * 0.65);
                      ctx.quadraticCurveTo(lmX, lmY + 16 + fLen * 0.3, lmX + fW * 0.3, lmY + 16);
                      ctx.fill();
                      // Surface dust kick-up near landing
                      if (alt < 200 && surfaceY < H) {
                        ctx.globalAlpha = 0.15 * (1 - alt / 200);
                        ctx.fillStyle = '#b0a898';
                        for (var di = 0; di < 6; di++) {
                          var dx = lmX + (Math.random() - 0.5) * 60;
                          var dy = surfaceY + 2 + Math.random() * 8;
                          ctx.beginPath(); ctx.arc(dx, dy, 3 + Math.random() * 6, 0, Math.PI * 2); ctx.fill();
                        }
                        ctx.globalAlpha = 1;
                      }
                    }

                    // HUD
                    ctx.fillStyle = 'rgba(0,0,0,0.6)';
                    ctx.fillRect(6, 6, 140, 100);
                    ctx.fillRect(W - 146, W < 305 ? 110 : 6, 140, 80);   // tracks the right HUD's narrow-screen drop
                    ctx.font = 'bold 9px monospace';
                    ctx.textAlign = 'left';
                    ctx.fillStyle = '#38bdf8'; ctx.fillText('ALTITUDE', 12, 18);
                    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px monospace';
                    ctx.fillText(alt > 1000 ? (alt / 1000).toFixed(2) + ' km' : alt.toFixed(1) + ' m', 12, 34);
                    ctx.font = 'bold 9px monospace';
                    ctx.fillStyle = '#38bdf8'; ctx.fillText('V/SPEED', 12, 48);
                    ctx.fillStyle = vVel < -5 ? '#ef4444' : '#22c55e'; ctx.font = '12px monospace';
                    ctx.fillText(vVel.toFixed(1) + ' m/s', 12, 60);
                    ctx.font = 'bold 9px monospace';
                    ctx.fillStyle = '#38bdf8'; ctx.fillText('H/SPEED', 12, 74);
                    ctx.fillStyle = '#fff'; ctx.font = '12px monospace';
                    ctx.fillText(hVel.toFixed(1) + ' m/s', 12, 86);
                    ctx.fillStyle = '#38bdf8'; ctx.font = 'bold 9px monospace'; ctx.fillText('FUEL', 12, 100);
                    ctx.fillStyle = fuel < 20 ? '#ef4444' : '#22c55e'; ctx.font = '12px monospace';
                    ctx.fillText(fuel.toFixed(0) + '%', 50, 100);

                    // Right HUD \u2014 drops below the left panel on narrow canvases so the
                    // two fixed-width boxes can't overlap (they collided under ~305px).
                    ctx.save();
                    if (W < 305) ctx.translate(0, 104);
                    ctx.textAlign = 'right';
                    ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 9px monospace'; ctx.fillText('THRUST', W - 12, 18);
                    ctx.fillStyle = '#1e293b'; ctx.fillRect(W - 136, 22, 120, 8);
                    ctx.fillStyle = '#fbbf24'; ctx.fillRect(W - 136, 22, 120 * thrust, 8);
                    ctx.fillStyle = '#94a3b8'; ctx.font = '9px system-ui';
                    ctx.fillText('\u2191 or W = thrust', W - 12, 46);
                    ctx.fillText('\u2190\u2192 or A/D = lateral', W - 12, 58);
                    ctx.fillText('Land: V < 3 m/s, H < 5 m/s', W - 12, 72);
                    ctx.restore();

                    // Alarm
                    if (alarms.length > 0 && tick % 60 < 30) {
                      ctx.textAlign = 'center';
                      ctx.fillStyle = '#fbbf24';
                      ctx.font = 'bold 12px monospace';
                      ctx.fillText('\u26A0 PROGRAM ALARM 1202 \u2014 EXECUTIVE OVERFLOW', W * 0.5, H * 0.15);
                      ctx.font = '9px system-ui';
                      ctx.fillStyle = '#94a3b8';
                      ctx.fillText('(Same alarm Armstrong got \u2014 computer overloaded but mission continues!)', W * 0.5, H * 0.19);
                    }

                    // Landed!
                    if (landed) {
                      ctx.textAlign = 'center';
                      ctx.fillStyle = '#22c55e';
                      ctx.font = 'bold 20px system-ui';
                      ctx.fillText('\uD83C\uDF15 "The Eagle has landed!"', W * 0.5, H * 0.18);
                      ctx.font = '12px system-ui';
                      ctx.fillStyle = '#e2e8f0';
                      ctx.fillText('Touchdown! V: ' + Math.abs(vVel).toFixed(1) + ' m/s \u2022 Fuel remaining: ' + fuel.toFixed(0) + '%', W * 0.5, H * 0.24);
                      // Landing score
                      var landingScore = 0;
                      var landingGrade = 'C';
                      if (Math.abs(vVel) < 1) { landingScore += 30; } else if (Math.abs(vVel) < 2) { landingScore += 20; } else { landingScore += 10; }
                      if (Math.abs(hVel) < 2) { landingScore += 20; } else if (Math.abs(hVel) < 4) { landingScore += 10; }
                      if (fuel > 20) { landingScore += 30; } else if (fuel > 10) { landingScore += 20; } else if (fuel > 0) { landingScore += 10; }
                      landingScore += Math.min(20, Math.floor(fuel * 0.2)); // bonus for extra fuel
                      if (landingScore >= 90) landingGrade = 'A+'; else if (landingScore >= 80) landingGrade = 'A'; else if (landingScore >= 70) landingGrade = 'B'; else if (landingScore >= 50) landingGrade = 'C';
                      ctx.font = 'bold 14px system-ui';
                      ctx.fillStyle = landingScore >= 80 ? '#22c55e' : landingScore >= 50 ? '#fbbf24' : '#f97316';
                      ctx.fillText('Landing Score: ' + landingScore + '/100 (Grade: ' + landingGrade + ')', W * 0.5, H * 0.30);
                      ctx.font = '9px system-ui'; ctx.fillStyle = '#94a3b8';
                      ctx.fillText('Soft touch +30 | Low drift +20 | Fuel bonus +' + Math.min(20, Math.floor(fuel * 0.2)) + ' | Reserve +' + (fuel > 20 ? 30 : fuel > 10 ? 20 : fuel > 0 ? 10 : 0), W * 0.5, H * 0.34);
                      ctx.fillStyle = '#94a3b8'; ctx.font = '10px system-ui';
                      ctx.fillText('Click "Begin EVA" to walk on the Moon!', W * 0.5, H * 0.40);
                    }

                    // Crashed
                    if (crashed) {
                      ctx.textAlign = 'center';
                      ctx.fillStyle = '#ef4444';
                      ctx.font = 'bold 18px system-ui';
                      ctx.fillText('\u26A0 HARD LANDING', W * 0.5, H * 0.2);
                      ctx.font = '11px system-ui';
                      ctx.fillStyle = '#f87171';
                      ctx.fillText('Impact V: ' + Math.abs(vVel).toFixed(1) + ' m/s (limit: 3 m/s) \u2014 Try again or proceed', W * 0.5, H * 0.26);
                    }

                    drawVignette(ctx, W, H, 0.2);
                    if (!landed && !crashed && document.contains(cvEl)) requestAnimationFrame(drawDescent);
                    else {
                      // One more frame render for final state
                      if (document.contains(cvEl)) setTimeout(function() { drawDescent(); }, 100);   // stop re-rendering the frozen frame forever after unmount
                    }
                  }
                  drawDescent();
                }
              })
            ),
            h('div', { className: 'p-3 border-t border-slate-700 flex justify-between items-center' },
              h('p', { className: 'text-[11px] text-slate-600' }, t('stem.moonmission.w_thrust_ad_lateral_land_gently', '\u2191/W = thrust \u2022 \u2190\u2192/AD = lateral \u2022 Land gently!')),
              h('button', {
                'aria-label': t('stem.moonmission.begin_extravehicular_activity_moonwalk', 'Begin extravehicular activity moonwalk to explore the lunar surface and collect geological samples'),
                onClick: function() {
                  advancePhase(6);
                  log('\uD83C\uDF15 "The Eagle has landed!" Preparing for EVA.');
                  addXP(30);
                  if (addToast) addToast('\uD83D\uDC68\u200D\uD83D\uDE80 "That\'s one small step..." Preparing for moonwalk!', 'success');
                },
                className: 'px-4 py-2 rounded-lg text-xs font-bold text-white bg-green-600 hover:bg-green-700'
              }, t('stem.moonmission.begin_eva', '\uD83D\uDC68\u200D\uD83D\uDE80 Begin EVA'))
            )
          )
        ),

        // ═══ PHASE 6: MOONWALK EVA (3D) ═══
        phase === 6 && h('div', { className: 'space-y-3', style: { animation: 'mmFadeSlideIn 0.4s ease-out' } },
          // Onboarding overlay (before EVA starts) — matches the Phase 5
          // pattern so the 3D phases feel consistent. Lists the WASD +
          // Space + F + mouse controls, names the goal (collect 4+ rock
          // samples), and seeds two Apollo-era surface-ops facts.
          !d.evaStarted && h('div', { className: 'bg-gradient-to-b from-slate-900 to-indigo-950 rounded-xl p-5 border border-slate-700 text-white text-center' },
            h('div', { className: 'text-4xl mb-3' }, '👨‍🚀'),
            h('h4', { className: 'text-lg font-black mb-2' }, t('stem.moonmission.moonwalk_eva_2', 'Moonwalk EVA')),
            h('p', { className: 'text-xs text-slate-200 mb-4' }, 'You are standing on the lunar surface in a pressurized suit at one-sixth Earth gravity. Walk the regolith, collect rock samples, and earn science points for each unique geological find.'),
            h('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 max-w-2xl mx-auto' },
              h('div', { className: 'bg-white/5 rounded-lg p-3 border border-white/10' },
                h('div', { className: 'text-2xl mb-1' }, '🚶'),
                h('p', { className: 'text-[11px] font-bold text-sky-300' }, 'WASD'),
                h('p', { className: 'text-[11px] text-slate-300' }, t('stem.moonmission.walk_forward_back_strafe', 'Walk forward/back, strafe'))
              ),
              h('div', { className: 'bg-white/5 rounded-lg p-3 border border-white/10' },
                h('div', { className: 'text-2xl mb-1' }, '🦘'),
                h('p', { className: 'text-[11px] font-bold text-sky-300' }, t('stem.moonmission.space', 'Space')),
                h('p', { className: 'text-[11px] text-slate-300' }, t('stem.moonmission.jump_low_gravity_hop', 'Jump (low-gravity hop)'))
              ),
              h('div', { className: 'bg-white/5 rounded-lg p-3 border border-white/10' },
                h('div', { className: 'text-2xl mb-1' }, '🪨'),
                h('p', { className: 'text-[11px] font-bold text-amber-300' }, 'F'),
                h('p', { className: 'text-[11px] text-slate-300' }, t('stem.moonmission.collect_rock_at_your_feet', 'Collect rock at your feet'))
              ),
              h('div', { className: 'bg-white/5 rounded-lg p-3 border border-white/10' },
                h('div', { className: 'text-2xl mb-1' }, '🔭'),
                h('p', { className: 'text-[11px] font-bold text-sky-300' }, t('stem.moonmission.mouse', 'Mouse')),
                h('p', { className: 'text-[11px] text-slate-300' }, t('stem.moonmission.look_around_click_canvas_first', 'Look around (click canvas first)'))
              )
            ),
            h('div', { className: 'bg-amber-500/10 rounded-lg p-3 border border-amber-500/20 mb-4 max-w-xl mx-auto' },
              h('p', { className: 'text-[11px] text-amber-300 font-bold mb-1' }, t('stem.moonmission.mission_objective_apollo_facts', '🎯 Mission objective + Apollo facts:')),
              h('ul', { className: 'text-[11px] text-amber-200 space-y-1 text-left pl-4' },
                h('li', null, t('stem.moonmission.collect_at_least_4_unique_rock_samples', 'Collect at least 4 unique rock samples to satisfy the geology quest hook.')),
                h('li', null, t('stem.moonmission.apollo_11_brought_back_47_5_lb_of_luna', 'Apollo 11 brought back 47.5 lb of lunar samples; Apollo 17 brought 243 lb.')),
                h('li', null, t('stem.moonmission.in_one_sixth_gravity_a_hop_covers_abou', 'In one-sixth gravity, a hop covers about six times the horizontal distance for the same effort.')),
                h('li', null, t('stem.moonmission.earth_hangs_in_a_fixed_spot_in_the_lun', 'Earth hangs in a fixed spot in the lunar sky because the Moon is tidally locked.'))
              )
            ),
            h('button', {
              'aria-label': t('stem.moonmission.begin_eva_on_the_lunar_surface', 'Begin EVA on the lunar surface'),
              onClick: function() { upd('evaStarted', true); },
              className: 'px-8 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-lg transition-all hover:scale-[1.02] animate-pulse'
            }, t('stem.moonmission.step_onto_the_moon_begin_eva', '👨‍🚀 Step Onto the Moon · Begin EVA'))
          ),
          d.evaStarted && h('div', { className: 'bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl overflow-hidden border border-slate-700' },
            h('div', { className: 'relative', style: { height: '70vh', minHeight: '400px', maxHeight: '700px' } },
              d.webglError ? h('div', {
                className: 'flex flex-col items-center justify-center p-6 text-center text-white',
                style: { height: '100%', background: 'rgba(15, 23, 42, 0.8)' }
              },
                h('span', { style: { fontSize: '48px', marginBottom: '16px' } }, '⚠'),
                h('h4', { className: 'text-lg font-bold text-red-400 mb-2' }, t('stem.moonmission.moonwalk_3d_mode_unresolved', 'Moonwalk 3D Mode Unresolved')),
                h('p', { className: 'text-xs text-slate-300 max-w-sm mb-6' }, t('stem.moonmission.webgl_failed_to_initialize_your_browse', 'WebGL failed to initialize. Your browser or device might not support 3D hardware acceleration.')),
                h('button', {
                  onClick: function() {
                    upd('webglError', false);
                  },
                  className: 'px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg shadow-md transition-colors'
                }, t('stem.moonmission.retry_3d_mode', 'Retry 3D Mode'))
              ) : h('canvas', {
                'data-eva-canvas': 'true',
                role: 'application',
                'aria-label': t('stem.moonmission.interactive_3d_lunar_surface_eva_use_w', 'Interactive 3D lunar surface EVA. Use WASD to walk, Space to jump in one-sixth gravity, F to collect rock samples, mouse to look around. Collect geological samples and explore the Moon surface near the Lunar Module.'),
                style: { width: '100%', height: '100%', display: 'block', cursor: 'crosshair' },
                ref: function(canvasEl) {
                  if (!canvasEl || canvasEl._evaInit) return;
                  canvasEl._evaInit = true;

                  function doEvaInit(THREE) {
                    var W = canvasEl.clientWidth || 800, H2 = canvasEl.clientHeight || 500;
                    var scene = new THREE.Scene();
                    var camera = new THREE.PerspectiveCamera(70, W / H2, 0.1, 500);
                    camera.position.set(0, 1.8, 0); // astronaut eye height in 1/6 gravity suit
                    var renderer;
                    try {
                      renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true });
                    } catch (e) {
                      console.error('[MoonMission EVA] WebGLRenderer creation failed:', e);
                      setTimeout(function() {
                        upd('webglError', true);
                      }, 0);
                      return;
                    }
                    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
                    renderer.setSize(W, H2);
                    renderer.setClearColor(0x000000);

                    // ── Bloom: glow on the Earth + sun over the lunar surface (guarded) ──
                    // Same graceful, fully-guarded pattern as solarsystem — plain render until
                    // the r128 post-processing addons load, then a bloom composer; any failure
                    // falls back to renderer.render. Kill-switch + low-power/reduced-motion tier.
                    var composer = null;
                    (function setupBloom() {
                      if (window.AlloPostFXEnabled === false) return;
                      var ensure = function (cb) {
                        if (window.THREE && window.THREE.EffectComposer && window.THREE.UnrealBloomPass) { cb(); return; }
                        var urls = [
                          'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/CopyShader.js',
                          'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/LuminosityHighPassShader.js',
                          'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/EffectComposer.js',
                          'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/RenderPass.js',
                          'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/ShaderPass.js',
                          'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/UnrealBloomPass.js'
                        ];
                        var i = 0;
                        (function nextScript() {
                          if (i >= urls.length) { cb(); return; }
                          var s = document.createElement('script');
                          s.src = urls[i]; s.onload = function () { i++; nextScript(); }; s.onerror = function () { i++; nextScript(); };
                          document.head.appendChild(s);
                        })();
                      };
                      ensure(function () {
                        try {
                          var T = window.THREE;
                          if (!T || !T.EffectComposer || !T.RenderPass || !T.UnrealBloomPass) return;
                          var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
                          var lowPower = reduce || (!!navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
                          var res = lowPower ? 0.5 : 1;
                          var c = new T.EffectComposer(renderer);
                          c.addPass(new T.RenderPass(scene, camera));
                          // dark lunar scene → lower threshold so the bright Earth + sun glow.
                          c.addPass(new T.UnrealBloomPass(new T.Vector2(Math.max(1, Math.round(W * res)), Math.max(1, Math.round(H2 * res))), lowPower ? 0.7 : 1.0, 0.35, 0.82));
                          composer = c;
                        } catch (e) { composer = null; }
                      });
                    })();

                    // ── Lunar sky (black + stars only — Earth is a separate
                    // sprite below to avoid the equirectangular wrap distortion
                    // that turned the marble into a teardrop). Stars are tiny
                    // dots so the projection stretching is invisible at that scale.
                    var skyGeo = new THREE.SphereGeometry(200, 32, 16);
                    var skyCv = document.createElement('canvas'); skyCv.width = 512; skyCv.height = 256;
                    var sCtx = skyCv.getContext('2d');
                    sCtx.fillStyle = '#000000'; sCtx.fillRect(0, 0, 512, 256);
                    // Dense starfield
                    for (var si = 0; si < 400; si++) {
                      sCtx.fillStyle = 'rgba(255,255,255,' + (0.3 + Math.random() * 0.7) + ')';
                      sCtx.beginPath();
                      sCtx.arc(Math.random() * 512, Math.random() * 256, Math.random() * 1.2, 0, Math.PI * 2);
                      sCtx.fill();
                    }
                    var skyTex = new THREE.CanvasTexture(skyCv);
                    scene.add(new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide })));

                    // ── Earth as a billboard sprite ──
                    // Draw the marble onto a 256×256 canvas (centered, square),
                    // then attach as a Three.js Sprite so it always faces the
                    // camera and never gets distorted by sphere-projection math.
                    // Position high in the sky and off to one side, matching the
                    // actual Apollo EVA view (Earth was a fixed point in the
                    // lunar sky throughout the surface ops).
                    var earthCv = document.createElement('canvas'); earthCv.width = 256; earthCv.height = 256;
                    var eCtx = earthCv.getContext('2d');
                    eCtx.clearRect(0, 0, 256, 256);
                    drawDetailedEarth(eCtx, 128, 128, 86, 500); // r86: halo (r*1.45=125) now fits the 256px texture instead of square-clipping
                    var earthTex = new THREE.CanvasTexture(earthCv);
                    var earthSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: earthTex, transparent: true, depthWrite: false }));
                    earthSprite.position.set(-60, 70, -120);
                    earthSprite.scale.set(23, 23, 1); // compensates r 100->86 so the visible disc size is unchanged
                    scene.add(earthSprite);

                    // ── Lunar terrain (grey regolith with craters) ──
                    var terrainGeo = new THREE.PlaneGeometry(200, 200, 100, 100);
                    var tPos = terrainGeo.attributes.position.array;
                    for (var vi = 0; vi < tPos.length; vi += 3) {
                      var px = tPos[vi], py = tPos[vi + 1];
                      var h2 = Math.sin(px * 0.05) * Math.cos(py * 0.04) * 1.5;
                      h2 += Math.sin(px * 0.15 + py * 0.1) * 0.3;
                      // Craters
                      var cxs = [15, -25, 40, -10, 30], czs = [20, -15, -30, 35, -40], crs = [10, 7, 12, 5, 8];
                      for (var ci = 0; ci < cxs.length; ci++) {
                        var cd = Math.sqrt(Math.pow(px - cxs[ci], 2) + Math.pow(py - czs[ci], 2));
                        if (cd < crs[ci]) {
                          var rim = 1 - cd / crs[ci];
                          h2 += cd < crs[ci] * 0.8 ? -rim * 2 : rim * 1.5;
                        }
                      }
                      tPos[vi + 2] = h2;
                    }
                    terrainGeo.computeVertexNormals();
                    // Regolith texture via ImageData (the old per-pixel fillRect loop made 65k
                    // canvas calls at init AND its sin() term printed visible diagonal stripes
                    // that tiled 8× across the plain). Isotropic value noise, no banding.
                    var tCv = document.createElement('canvas'); tCv.width = 256; tCv.height = 256;
                    var tCx = tCv.getContext('2d');
                    (function paintRegolith() {
                      var img = tCx.createImageData(256, 256);
                      var dpx = img.data;
                      for (var tp = 0; tp < 256 * 256; tp++) {
                        var txx = tp % 256, tyy = (tp / 256) | 0;
                        var n = 128 + (Math.random() - 0.5) * 22;                       // fine grain
                        n += Math.sin(txx * 0.055 + Math.sin(tyy * 0.061) * 3.1) * 5;   // broad soft mottling (non-directional)
                        n += Math.sin(tyy * 0.047 + Math.sin(txx * 0.052) * 2.7) * 5;
                        if (Math.random() < 0.004) n -= 34;                             // occasional pebble fleck
                        var ni = Math.max(70, Math.min(190, n | 0));
                        var o4 = tp * 4;
                        dpx[o4] = ni; dpx[o4 + 1] = ni - 2; dpx[o4 + 2] = ni - 5; dpx[o4 + 3] = 255;
                      }
                      tCx.putImageData(img, 0, 0);
                    })();
                    var terrainTex = new THREE.CanvasTexture(tCv);
                    terrainTex.wrapS = terrainTex.wrapT = THREE.RepeatWrapping; terrainTex.repeat.set(8, 8);
                    var terrain = new THREE.Mesh(terrainGeo, new THREE.MeshStandardMaterial({ map: terrainTex, roughness: 0.95, metalness: 0.02, flatShading: true }));
                    terrain.rotation.x = -Math.PI / 2;
                    terrain.receiveShadow = true;   // lunar scene sells on hard black shadows (sun.castShadow above)
                    scene.add(terrain);
                    var _terrainRay = new THREE.Raycaster();
                    var _terrainHeightAt = function(x, z) {
                      _terrainRay.set(new THREE.Vector3(x, 50, z), new THREE.Vector3(0, -1, 0));
                      var hits = _terrainRay.intersectObject(terrain);
                      return hits.length > 0 ? hits[0].point.y : 0;
                    };

                    // ── Lighting (harsh unfiltered sunlight + no atmosphere) ──
                    // Real lunar look = pitch-black SHADOWS under a single hard sun, with a
                    // faint warm ground-bounce (regolith reflects ~12%) instead of a flat grey
                    // ambient. Shadow map skipped on low-power devices (same tier as bloom).
                    var _evaLowPower = false;
                    try { _evaLowPower = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) || (!!navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4); } catch (eLP) {}
                    scene.add(new THREE.AmbientLight(0x1a1a1e, 0.35));
                    scene.add(new THREE.HemisphereLight(0x050508, 0x35302a, 0.35));   // black sky above, regolith bounce below
                    var sun = new THREE.DirectionalLight(0xfff8e1, 1.6);
                    sun.position.set(40, 25, 15);
                    if (!_evaLowPower) {
                      renderer.shadowMap.enabled = true;
                      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
                      sun.castShadow = true;
                      sun.shadow.mapSize.width = 1024; sun.shadow.mapSize.height = 1024;
                      sun.shadow.camera.left = -60; sun.shadow.camera.right = 60;
                      sun.shadow.camera.top = 60; sun.shadow.camera.bottom = -60;
                      sun.shadow.camera.near = 1; sun.shadow.camera.far = 160;
                      sun.shadow.bias = -0.0015;
                    }
                    scene.add(sun);
                    // The sun itself — a hot disc in the sky along the light direction so the
                    // bloom pass (tuned for "Earth + sun glow") finally has a sun to bloom.
                    (function addSunDisc() {
                      var sc = document.createElement('canvas'); sc.width = 128; sc.height = 128;
                      var sg = sc.getContext('2d');
                      var grad = sg.createRadialGradient(64, 64, 4, 64, 64, 64);
                      grad.addColorStop(0, 'rgba(255,255,250,1)');
                      grad.addColorStop(0.25, 'rgba(255,246,220,0.9)');
                      grad.addColorStop(0.6, 'rgba(255,240,200,0.25)');
                      grad.addColorStop(1, 'rgba(255,240,200,0)');
                      sg.fillStyle = grad; sg.fillRect(0, 0, 128, 128);
                      var st = new THREE.CanvasTexture(sc);
                      var sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: st, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
                      var sd = new THREE.Vector3(40, 25, 15).normalize().multiplyScalar(170);
                      sunSprite.position.copy(sd);
                      sunSprite.scale.set(26, 26, 1);
                      scene.add(sunSprite);
                    })();

                    // ── Lunar Module on surface ──
                    var lmGroup = new THREE.Group();
                    // Descent stage (gold)
                    var dsGeo = new THREE.BoxGeometry(2.5, 1.5, 2.5);
                    lmGroup.add(new THREE.Mesh(dsGeo, new THREE.MeshStandardMaterial({ color: 0xc9a04a, metalness: 0.4, roughness: 0.6 })));
                    // Ascent stage (silver)
                    var asGeo = new THREE.BoxGeometry(2, 2, 2);
                    var asMesh = new THREE.Mesh(asGeo, new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.5, roughness: 0.4 }));
                    asMesh.position.y = 1.8; lmGroup.add(asMesh);
                    // Legs (4)
                    [[-1.3, 0, -1.3], [1.3, 0, -1.3], [-1.3, 0, 1.3], [1.3, 0, 1.3]].forEach(function(lp) {
                      var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2, 4), new THREE.MeshStandardMaterial({ color: 0x888888 }));
                      leg.position.set(lp[0], -0.8, lp[2]);
                      leg.rotation.z = lp[0] > 0 ? 0.3 : -0.3;
                      leg.rotation.x = lp[2] > 0 ? -0.3 : 0.3;
                      lmGroup.add(leg);
                      // Foot pad
                      var pad = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 8), new THREE.MeshStandardMaterial({ color: 0x888888 }));
                      pad.position.set(lp[0] * 1.5, -1.7, lp[2] * 1.5);
                      lmGroup.add(pad);
                    });
                    // ── Flag (grouped, terrain-anchored, real stripes + canton texture, and a
                    // FROZEN ripple — Apollo flags hung from a stiffening rod and kept the
                    // crinkle from handling; there's no air, so it must not animate) ──
                    // (Replaces a solid-red plane + a separately-floating blue patch that were
                    // not grouped, not anchored to the terrain, and read as "not the US flag".)
                    var flagGroup = new THREE.Group();
                    var flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 2.5, 8), new THREE.MeshStandardMaterial({ color: 0xb9bcc2, metalness: 0.6, roughness: 0.35 }));
                    flagPole.position.y = 1.25;
                    flagGroup.add(flagPole);
                    var flagCv = document.createElement('canvas'); flagCv.width = 192; flagCv.height = 112;
                    var fCtx = flagCv.getContext('2d');
                    for (var fsi = 0; fsi < 13; fsi++) {                       // 13 stripes
                      fCtx.fillStyle = fsi % 2 === 0 ? '#b22234' : '#f5f2ec';
                      fCtx.fillRect(0, Math.round(fsi * (112 / 13)), 192, Math.ceil(112 / 13));
                    }
                    fCtx.fillStyle = '#3c3b6e'; fCtx.fillRect(0, 0, 77, 60);   // canton
                    fCtx.fillStyle = '#ffffff';                                 // star dots (abstracted at this scale)
                    for (var fr2 = 0; fr2 < 5; fr2++) for (var fc2 = 0; fc2 < 6; fc2++) {
                      fCtx.beginPath(); fCtx.arc(8 + fc2 * 12.5 + (fr2 % 2) * 6, 7 + fr2 * 11.5, 1.7, 0, Math.PI * 2); fCtx.fill();
                    }
                    var flagTex = new THREE.CanvasTexture(flagCv);
                    var flagGeo = new THREE.PlaneGeometry(1.2, 0.7, 12, 4);
                    var fvp = flagGeo.attributes.position.array;
                    for (var fvi = 0; fvi < fvp.length; fvi += 3) {            // frozen crinkle, stronger toward the fly end
                      var fu = (fvp[fvi] + 0.6) / 1.2;
                      fvp[fvi + 2] = Math.sin(fu * 6.0) * 0.045 * fu + Math.sin(fu * 13.0 + 1.7) * 0.02 * fu;
                    }
                    flagGeo.computeVertexNormals();
                    var flag = new THREE.Mesh(flagGeo, new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide, roughness: 0.85 }));
                    flag.position.set(0.61, 2.1, 0);                            // hangs from the top rod, left edge at the pole
                    flagGroup.add(flag);
                    var flagRod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.22, 6), new THREE.MeshStandardMaterial({ color: 0xb9bcc2, metalness: 0.6, roughness: 0.35 }));
                    flagRod.rotation.z = Math.PI / 2; flagRod.position.set(0.61, 2.46, 0);
                    flagGroup.add(flagRod);
                    flagGroup.position.set(4, _terrainHeightAt(4, 2), 2);
                    scene.add(flagGroup);

                    lmGroup.position.set(0, _terrainHeightAt(0, 0) + 1.7, 0);
                    scene.add(lmGroup);

                    // ── ALSEP Science Station ──
                    var alsepX = -6, alsepZ = 5;
                    var alsepY = _terrainHeightAt(alsepX, alsepZ);
                    // Central station box
                    var alsepBox = new THREE.Mesh(
                      new THREE.BoxGeometry(0.6, 0.3, 0.6),
                      new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.5, roughness: 0.4 })
                    );
                    alsepBox.position.set(alsepX, alsepY + 0.15, alsepZ);
                    scene.add(alsepBox);
                    // Solar panel wing
                    var alsepPanel = new THREE.Mesh(
                      new THREE.BoxGeometry(1.2, 0.02, 0.4),
                      new THREE.MeshStandardMaterial({ color: 0x1a1a5e, metalness: 0.3, roughness: 0.5 })
                    );
                    alsepPanel.position.set(alsepX, alsepY + 0.35, alsepZ);
                    scene.add(alsepPanel);
                    // Seismometer (small cylinder nearby)
                    var seismo = new THREE.Mesh(
                      new THREE.CylinderGeometry(0.15, 0.15, 0.3, 8),
                      new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.4 })
                    );
                    seismo.position.set(alsepX + 2, alsepY + 0.15, alsepZ + 1);
                    scene.add(seismo);
                    // Laser retroreflector (flat panel angled up)
                    var retroGeo = new THREE.BoxGeometry(0.4, 0.02, 0.4);
                    var retroMat = new THREE.MeshStandardMaterial({ color: 0x88aacc, metalness: 0.8, roughness: 0.1 });
                    var retro = new THREE.Mesh(retroGeo, retroMat);
                    retro.position.set(alsepX - 2, alsepY + 0.3, alsepZ - 1);
                    retro.rotation.x = -0.5;
                    scene.add(retro);

                    // ── Lunar Rover (Apollo 15-17 style) ──
                    var roverGrp = new THREE.Group();
                    // Chassis
                    var rChassis = new THREE.Mesh(
                      new THREE.BoxGeometry(1.5, 0.2, 0.8),
                      new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.5, roughness: 0.4 })
                    );
                    rChassis.position.y = 0.3; roverGrp.add(rChassis);
                    // Wheels (4)
                    [[-0.7, 0.15, -0.4], [0.7, 0.15, -0.4], [-0.7, 0.15, 0.4], [0.7, 0.15, 0.4]].forEach(function(wp) {
                      var wheel = new THREE.Mesh(
                        new THREE.TorusGeometry(0.15, 0.04, 6, 12),
                        new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.3, roughness: 0.8 })
                      );
                      wheel.position.set(wp[0], wp[1], wp[2]);
                      wheel.rotation.y = Math.PI / 2;
                      roverGrp.add(wheel);
                    });
                    // Antenna dish
                    var rDish = new THREE.Mesh(
                      new THREE.CircleGeometry(0.3, 12),
                      new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, metalness: 0.3 })
                    );
                    rDish.position.set(0, 0.8, -0.3);
                    rDish.rotation.x = -0.7;
                    roverGrp.add(rDish);
                    var rvX = 8, rvZ = -4;
                    roverGrp.position.set(rvX, _terrainHeightAt(rvX, rvZ), rvZ);
                    roverGrp.rotation.y = 0.5;
                    scene.add(roverGrp);

                    // ── Scattered boulders ──
                    for (var bi = 0; bi < 30; bi++) {
                      var bx = (Math.random() - 0.5) * 100, bz = (Math.random() - 0.5) * 100;
                      var bScale = 0.2 + Math.random() * 1.2;
                      var bGeo = new THREE.DodecahedronGeometry(bScale, 0);
                      var bPos2 = bGeo.attributes.position.array;
                      for (var bvi = 0; bvi < bPos2.length; bvi += 3) {
                        bPos2[bvi] *= 0.6 + Math.random() * 0.8;
                        bPos2[bvi + 1] *= 0.4 + Math.random() * 0.6;
                      }
                      bGeo.computeVertexNormals();
                      var boulder = new THREE.Mesh(bGeo, new THREE.MeshStandardMaterial({ color: 0x8a8278, roughness: 0.95, flatShading: true }));
                      boulder.position.set(bx, _terrainHeightAt(bx, bz) + bScale * 0.2, bz);
                      boulder.rotation.set(Math.random(), Math.random(), 0);
                      scene.add(boulder);
                    }

                    // ── Hadley Rille (sinuous lava channel) ──
                    // A real trench ribbon along the path. (Replaces a LineBasicMaterial line —
                    // WebGL ignores linewidth, so it rendered as a 1-pixel scratch — plus a chain
                    // of small disconnected wall planes that floated above the terrain.)
                    (function addRille() {
                      var rPts = [];
                      for (var ri2 = 0; ri2 < 30; ri2++) {
                        var rx2 = -40 + ri2 * 3 + Math.sin(ri2 * 0.5) * 5;
                        var rz2 = 30 + Math.cos(ri2 * 0.3) * 8;
                        rPts.push(new THREE.Vector3(rx2, _terrainHeightAt(rx2, rz2), rz2));
                      }
                      var HALF_W = 1.6, DEPTH = 1.1;
                      var verts = [], idx = [];
                      for (var rp = 0; rp < rPts.length; rp++) {
                        var tangent = (rp < rPts.length - 1)
                          ? new THREE.Vector3().subVectors(rPts[rp + 1], rPts[rp])
                          : new THREE.Vector3().subVectors(rPts[rp], rPts[rp - 1]);
                        var norm = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
                        var P = rPts[rp];
                        // left rim → channel floor (sunken) → right rim: a shallow V trench
                        verts.push(P.x + norm.x * HALF_W, P.y + 0.05, P.z + norm.z * HALF_W);
                        verts.push(P.x, P.y - DEPTH, P.z);
                        verts.push(P.x - norm.x * HALF_W, P.y + 0.05, P.z - norm.z * HALF_W);
                        if (rp > 0) {
                          var a0 = (rp - 1) * 3, b0 = rp * 3;
                          idx.push(a0, b0, a0 + 1, b0, b0 + 1, a0 + 1);        // left wall
                          idx.push(a0 + 1, b0 + 1, a0 + 2, b0 + 1, b0 + 2, a0 + 2); // right wall
                        }
                      }
                      var rGeo = new THREE.BufferGeometry();
                      rGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
                      rGeo.setIndex(idx);
                      rGeo.computeVertexNormals();
                      var rille = new THREE.Mesh(rGeo, new THREE.MeshStandardMaterial({ color: 0x3d3833, roughness: 0.98, side: THREE.DoubleSide, flatShading: true }));
                      scene.add(rille);
                    })();

                    // ── Highland ridge in the distance ──
                    var ridgeGeo = new THREE.BoxGeometry(60, 6, 4);
                    var ridgePos = ridgeGeo.attributes.position.array;
                    for (var rpi = 0; rpi < ridgePos.length; rpi += 3) {
                      ridgePos[rpi] *= 0.8 + Math.random() * 0.4;
                      ridgePos[rpi + 1] *= 0.6 + Math.random() * 0.8;
                      ridgePos[rpi + 2] *= 0.7 + Math.random() * 0.6;
                    }
                    ridgeGeo.computeVertexNormals();
                    var ridgeMat = new THREE.MeshStandardMaterial({ color: 0x9a9288, roughness: 0.95, flatShading: true });
                    var ridge = new THREE.Mesh(ridgeGeo, ridgeMat);
                    ridge.position.set(0, _terrainHeightAt(0, -70) + 2, -70);
                    scene.add(ridge);

                    // ── Distant highland mountains ringing the horizon ──
                    // (Replaces the old "Earthrise glow" — a solid untextured blue ball + halos
                    // that sat on the horizon while the REAL Earth billboard already hung in the
                    // sky: two Earths at once, and the ball read as a flat blue blob. The Earth
                    // sprite up at (-60,70,-120) is the one true Earth, per the Apollo EVA view.)
                    (function addHorizonMountains() {
                      var mmSpots = [[-80, -60, 14, 9], [-95, 10, 18, 7], [70, -80, 16, 10], [95, 30, 20, 8], [-30, -95, 22, 11], [40, 90, 17, 8], [-90, 70, 15, 7]];
                      mmSpots.forEach(function (ms, mi) {
                        var mGeo = new THREE.ConeGeometry(ms[2], ms[3], 7, 1);
                        var mp = mGeo.attributes.position.array;
                        for (var mvi = 0; mvi < mp.length; mvi += 3) {         // roughen the silhouette
                          mp[mvi] *= 0.85 + ((mi * 131 + mvi * 17) % 100) / 100 * 0.3;
                          mp[mvi + 2] *= 0.85 + ((mi * 57 + mvi * 29) % 100) / 100 * 0.3;
                        }
                        mGeo.computeVertexNormals();
                        var m = new THREE.Mesh(mGeo, new THREE.MeshStandardMaterial({ color: 0x86807a, roughness: 0.98, flatShading: true }));
                        m.position.set(ms[0], ms[3] * 0.35, ms[1]);
                        scene.add(m);
                      });
                    })();

                    // All static scenery built → mark it as shadow CASTERS in one pass (the
                    // terrain receives). Sample orbs / bootprints are added after this on
                    // purpose: glowing beacons and decals shouldn't cast, and skipping them
                    // keeps the shadow pass cheap. No-op when shadows are off (low-power).
                    if (!_evaLowPower) {
                      scene.traverse(function (n3) {
                        if (!n3.isMesh || n3 === terrain) return;
                        var m3 = n3.material;
                        if (m3 && (m3.isSpriteMaterial || m3.side === THREE.BackSide)) return;   // sky shell must NEVER cast — it surrounds the shadow frustum
                        n3.castShadow = true;
                      });
                    }

                    // ── Sample collection orbs (lunar rocks) ──
                    var lunarSampleOrbs = [];
                    LUNAR_SAMPLES_DATA.forEach(function(sd, sdi) {
                      var ox = 8 + (Math.random() - 0.5) * 60;
                      var oz = 8 + (Math.random() - 0.5) * 60;
                      var oy = _terrainHeightAt(ox, oz) + 0.4;
                      var orbGroup = new THREE.Group();
                      var orbGeo = new THREE.DodecahedronGeometry(0.3, 0);
                      var orbMat = new THREE.MeshStandardMaterial({ color: 0xccccaa, emissive: 0xfbbf24, emissiveIntensity: 1.0, transparent: true, opacity: 0.8 }); // sample orbs bloom as findable beacons
                      orbGroup.add(new THREE.Mesh(orbGeo, orbMat));
                      var ringG = new THREE.Mesh(
                        new THREE.RingGeometry(0.45, 0.55, 12),
                        new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.3, side: THREE.DoubleSide })
                      );
                      ringG.rotation.x = -Math.PI / 2; ringG.position.y = -0.2;
                      orbGroup.add(ringG);
                      orbGroup.position.set(ox, oy, oz);
                      orbGroup._sampleData = sd;
                      orbGroup._collected = false;
                      orbGroup._pulsePhase = Math.random() * Math.PI * 2;
                      scene.add(orbGroup);
                      lunarSampleOrbs.push(orbGroup);
                    });

                    // ── Bootprint decals (leave prints as you walk) ──
                    var bootprints = [];

                    // ── Movement (1/6 gravity bouncing) ──
                    var moveState = { forward: false, back: false, left: false, right: false, sample: false };
                    var yaw = 0, pitch = 0;
                    var playerPos = new THREE.Vector3(3, _terrainHeightAt(3, 3) + 1.8, 3);
                    var playerVelY = 0;
                    var isJumping = false;
                    var speed3d = 0.06; // slower in spacesuit

                    // ── Comfort mode (reduced motion / mouse-sensitivity / vignette) ──
                    // Auto-enable if OS prefers-reduced-motion; persisted per-student in toolData.
                    var prefersReducedMotion = false;
                    try { prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch(_e) {}
                    var storedComfort = (d && typeof d.comfortMode === 'boolean') ? d.comfortMode : null;
                    var comfortMode = storedComfort !== null ? storedComfort : prefersReducedMotion;
                    var lookSensitivity = 0.003;
                    var applyComfortFactors = function() {
                      lookSensitivity = comfortMode ? 0.0012 : 0.003; // ~2.5x slower in comfort mode
                      speed3d = comfortMode ? 0.04 : 0.06;
                    };
                    applyComfortFactors();
                    // Click-to-move toggle (motor-impaired students: point-and-click instead of WASD)
                    var storedClick = (d && typeof d.clickToMove === 'boolean') ? d.clickToMove : false;
                    var clickToMove = storedClick;
                    var clickTarget = null; // THREE.Vector3 or null
                    // Vignette overlay (reduces peripheral motion-sickness triggers during fast movement)
                    var vignetteEl = null;
                    if (comfortMode) {
                      vignetteEl = document.createElement('div');
                      vignetteEl.setAttribute('aria-hidden', 'true');
                      vignetteEl.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:9;background:radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.55) 95%);opacity:0;transition:opacity 0.35s ease';
                      canvasEl.parentElement.appendChild(vignetteEl);
                    }

                    canvasEl.addEventListener('keydown', function(e) {
                      switch(e.key.toLowerCase()) {
                        case 'w': case 'arrowup': moveState.forward = true; clickTarget = null; break;
                        case 's': case 'arrowdown': moveState.back = true; clickTarget = null; break;
                        case 'a': case 'arrowleft': moveState.left = true; clickTarget = null; break;
                        case 'd': case 'arrowright': moveState.right = true; clickTarget = null; break;
                        case 'f': moveState.sample = true; break;
                        case ' ': if (!isJumping) { playerVelY = 0.12; isJumping = true; } break; // 1/6 gravity jump!
                        case 'c':
                          // Toggle comfort mode
                          comfortMode = !comfortMode;
                          applyComfortFactors();
                          try { upd('comfortMode', comfortMode); } catch(_){}
                          if (vignetteEl) { vignetteEl.parentElement && vignetteEl.parentElement.removeChild(vignetteEl); vignetteEl = null; }
                          if (comfortMode) {
                            vignetteEl = document.createElement('div');
                            vignetteEl.setAttribute('aria-hidden', 'true');
                            vignetteEl.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:9;background:radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.55) 95%);opacity:0;transition:opacity 0.35s ease';
                            canvasEl.parentElement.appendChild(vignetteEl);
                          }
                          if (addToast) addToast(comfortMode ? '🌿 Comfort mode ON — reduced motion & slower turn' : 'Comfort mode OFF', 'info');
                          if (typeof announceToSR === 'function') announceToSR(comfortMode ? 'Comfort mode enabled. Mouse sensitivity and walk speed reduced.' : 'Comfort mode disabled.');
                          break;
                        case 'm':
                          // Toggle click-to-move
                          clickToMove = !clickToMove;
                          clickTarget = null;
                          try { upd('clickToMove', clickToMove); } catch(_){}
                          if (addToast) addToast(clickToMove ? '🖱 Click-to-move ON — click terrain to walk there' : 'Click-to-move OFF', 'info');
                          if (typeof announceToSR === 'function') announceToSR(clickToMove ? 'Click to move enabled. Click on the ground to walk there.' : 'Click to move disabled.');
                          break;
                      }
                      // Only swallow the EVA control keys — an unconditional preventDefault
                      // also ate Tab, trapping keyboard users on the canvas (WCAG 2.1.2).
                      if (['w', 'a', 's', 'd', 'f', 'c', ' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].indexOf(e.key.toLowerCase()) !== -1) e.preventDefault();
                    });
                    canvasEl.addEventListener('keyup', function(e) {
                      switch(e.key.toLowerCase()) {
                        case 'w': case 'arrowup': moveState.forward = false; break;
                        case 's': case 'arrowdown': moveState.back = false; break;
                        case 'a': case 'arrowleft': moveState.left = false; break;
                        case 'd': case 'arrowright': moveState.right = false; break;
                        case 'f': moveState.sample = false; break;
                      }
                    });
                    var isLooking = false;
                    // Mouse down: in click-to-move mode, raycast to terrain; otherwise enable look.
                    canvasEl.addEventListener('mousedown', function(e) {
                      if (clickToMove && e.button === 0) {
                        // Raycast from camera through click point to the terrain plane.
                        try {
                          var rect = canvasEl.getBoundingClientRect();
                          var ndc = new THREE.Vector2(
                            ((e.clientX - rect.left) / rect.width) * 2 - 1,
                            -((e.clientY - rect.top) / rect.height) * 2 + 1
                          );
                          var raycaster = new THREE.Raycaster();
                          raycaster.setFromCamera(ndc, camera);
                          var hits = raycaster.intersectObjects(scene.children, false);
                          for (var hi = 0; hi < hits.length; hi++) {
                            // Prefer terrain hit — big plane rotated flat, positioned at y~0.
                            var hit = hits[hi];
                            if (hit && hit.point && hit.distance < 150) {
                              clickTarget = new THREE.Vector3(hit.point.x, 0, hit.point.z);
                              if (typeof announceToSR === 'function') announceToSR('Walking to selected point.');
                              break;
                            }
                          }
                        } catch (_rcErr) { /* raycast unavailable, fall through to look */ }
                        return;
                      }
                      isLooking = true;
                      canvasEl.requestPointerLock && canvasEl.requestPointerLock();
                    });
                    canvasEl.addEventListener('mouseup', function() { isLooking = false; });
                    function onMM(e) {
                      if (!isLooking && !document.pointerLockElement) return;
                      yaw -= e.movementX * lookSensitivity;
                      pitch = Math.max(-1.2, Math.min(1.2, pitch - e.movementY * lookSensitivity));
                    }
                    document.addEventListener('mousemove', onMM);
                    canvasEl.focus();

                    // ── EVA HUD ──
                    var evaHud = document.createElement('div');
                    evaHud.style.cssText = 'position:absolute;top:8px;left:8px;background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);border-radius:10px;padding:8px 12px;color:#38bdf8;font-family:monospace;font-size:10px;pointer-events:none;z-index:10;border:1px solid rgba(56,189,248,0.2);max-width:200px';
                    evaHud.innerHTML = '<div style="font-weight:bold;font-size:11px;color:#fbbf24;margin-bottom:4px">\uD83D\uDC68\u200D\uD83D\uDE80 LUNAR EVA</div>' +
                      '<div style="display:grid;grid-template-columns:auto 1fr;gap:2px 6px">' +
                      '<span style="color:#64748b">O\u2082</span><span id="eva-o2" style="color:#22c55e">100%</span>' +
                      '<span style="color:#64748b">\uD83E\uDEA8</span><span id="eva-samples">0 / ' + LUNAR_SAMPLES_DATA.length + ' samples</span>' +
                      '<span style="color:#64748b">\uD83D\uDC63</span><span id="eva-steps">0 steps</span>' +
                      '</div>' +
                      '<div style="border-top:1px solid rgba(56,189,248,0.1);margin-top:4px;padding-top:4px;color:#94a3b8;font-size:8px">WASD move \u2022 SPACE jump (1/6g!) \u2022 F collect \u2022 Mouse look \u2022 C comfort \u2022 M click-to-move</div>';
                    canvasEl.parentElement.appendChild(evaHud);

                    // ── Animation ──
                    var evaTick = 0;
                    var evaO2 = 100;
                    var evaSteps = 0;
                    var evaSampleCount = 0;
                    var evaSampleCooldown = 0;

                    function animateEva() {
                      // Stop + tear down if the EVA canvas left the DOM (tab switch / tool unmount). The loop
                      // used to reschedule unconditionally → a forever-running WebGL render loop leaked if the
                      // student left via the Back arrow instead of the "End EVA" button.
                      if (!document.contains(canvasEl)) { if (canvasEl._evaCleanup) canvasEl._evaCleanup(); return; }
                      if (_evaVRPaused) return;               // VR session owns the frame loop (AlloVR setAnimationLoop); resumeLoop restarts us
                      requestAnimationFrame(animateEva);
                      evaTick++;

                      // Movement
                      var dir = new THREE.Vector3();
                      // Click-to-move: auto-walk toward clickTarget; cancels on arrival or manual key press.
                      if (clickTarget && !moveState.forward && !moveState.back && !moveState.left && !moveState.right) {
                        var dx = clickTarget.x - playerPos.x;
                        var dz = clickTarget.z - playerPos.z;
                        var dist2d = Math.sqrt(dx * dx + dz * dz);
                        if (dist2d < 0.5) {
                          clickTarget = null;
                        } else {
                          // Walk toward target at speed3d; yaw the camera to face direction.
                          var walkAngle = Math.atan2(dx, -dz); // -dz because z forward is negative
                          // Gently ease yaw toward walkAngle (avoid motion-sick snap).
                          var yawDelta = walkAngle - yaw;
                          while (yawDelta > Math.PI) yawDelta -= Math.PI * 2;
                          while (yawDelta < -Math.PI) yawDelta += Math.PI * 2;
                          yaw += yawDelta * (comfortMode ? 0.05 : 0.1);
                          dir.set(Math.sin(walkAngle), 0, -Math.cos(walkAngle)).multiplyScalar(speed3d);
                          playerPos.add(dir);
                        }
                      } else {
                        if (moveState.forward) dir.z -= 1;
                        if (moveState.back) dir.z += 1;
                        if (moveState.left) dir.x -= 1;
                        if (moveState.right) dir.x += 1;
                        dir.normalize().multiplyScalar(speed3d);
                        dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
                        playerPos.add(dir);
                      }

                      // Vignette intensity: fade in when moving fast (comfort-mode peripheral blur).
                      if (vignetteEl && comfortMode) {
                        var movingFast = dir.length() > 0.01 || isJumping;
                        vignetteEl.style.opacity = movingFast ? '1' : '0.25';
                      }

                      // 1/6 gravity physics
                      playerVelY -= 0.0027; // Moon gravity (1/6 of Earth)
                      playerPos.y += playerVelY;
                      var groundH = _terrainHeightAt(playerPos.x, playerPos.z) + 1.8;
                      if (playerPos.y <= groundH) {
                        playerPos.y = groundH;
                        playerVelY = 0;
                        isJumping = false;
                      }

                      // Bootprints
                      if (dir.length() > 0.01 && !isJumping && evaTick % 20 === 0) {
                        evaSteps++;
                        var bpGeo = new THREE.PlaneGeometry(0.15, 0.25);
                        var bpMat = new THREE.MeshBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
                        var bp = new THREE.Mesh(bpGeo, bpMat);
                        bp.rotation.x = -Math.PI / 2;
                        bp.rotation.z = yaw;
                        bp.position.set(playerPos.x, groundH - 1.78, playerPos.z);
                        scene.add(bp);
                        bootprints.push(bp);
                        if (bootprints.length > 200) { scene.remove(bootprints.shift()); }
                      }

                      // Camera
                      camera.position.copy(playerPos);
                      camera.rotation.order = 'YXZ';
                      camera.rotation.y = yaw;
                      camera.rotation.x = pitch;

                      // O2 depletion (rate based on difficulty)
                      if (evaTick % 60 === 0) evaO2 = Math.max(0, evaO2 - diffSettings.o2Rate);
                      // O2 warnings
                      if (evaO2 < 30 && evaO2 > 29.5 && evaTick % 60 === 0) {
                        if (addToast) addToast('\u26A0\uFE0F O\u2082 at ' + Math.round(evaO2) + '% \u2014 Consider returning to the LM soon!', 'info');
                      }
                      if (evaO2 < 15 && evaO2 > 14.5 && evaTick % 60 === 0) {
                        if (addToast) addToast('\uD83D\uDEA8 CRITICAL: O\u2082 at ' + Math.round(evaO2) + '%! Return to LM immediately!', 'error');
                      }
                      // Vignette effect when O2 low
                      if (evaO2 < 20) {
                        var warningOverlay = document.getElementById('eva-o2-warning');
                        if (!warningOverlay) {
                          warningOverlay = document.createElement('div');
                          warningOverlay.id = 'eva-o2-warning';
                          warningOverlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:5;border-radius:inherit';
                          canvasEl.parentElement.appendChild(warningOverlay);
                        }
                        var urgency = (20 - evaO2) / 20;
                        warningOverlay.style.background = 'radial-gradient(ellipse at center, transparent 40%, rgba(220,38,38,' + (urgency * 0.3) + ') 100%)';
                        warningOverlay.style.animation = evaO2 < 10 ? 'pulse 1s infinite' : 'none';
                      }

                      // Sample collection
                      if (evaSampleCooldown > 0) evaSampleCooldown--;
                      lunarSampleOrbs.forEach(function(orb) {
                        if (orb._collected) return;
                        orb.children[0].rotation.y += 0.02;
                        orb.children[0].material.opacity = 0.6 + Math.sin(evaTick * 0.05 + orb._pulsePhase) * 0.2;
                        var sDist = playerPos.distanceTo(orb.position);
                        if (sDist < 2 && moveState.sample && evaSampleCooldown <= 0) {
                          orb._collected = true; orb.visible = false;
                          evaSampleCooldown = 60;
                          evaSampleCount++;
                          var sd = orb._sampleData;
                          var newSamples = (d.lunarSamples || []).slice();
                          newSamples.push({ name: sd.name, type: sd.type, icon: sd.icon, fact: sd.fact });
                          upd('lunarSamples', newSamples);
                          sfxSampleCollect();
                          if (addToast) addToast(sd.icon + ' Collected: ' + sd.name + ' \u2014 ' + sd.fact, 'success');
                          addXP(sd.xp);
                        }
                      });

                      // ── Proximity-based discovery cards ──
                      if (evaTick % 30 === 0) {
                        var landmarks = [
                          { x: alsepX, z: alsepZ, name: t('stem.moonmission.alsep_science_station', 'ALSEP Science Station'), fact: t('stem.moonmission.the_apollo_lunar_surface_experiments_p', 'The Apollo Lunar Surface Experiments Package ran for years after the astronauts left. The seismometer detected moonquakes and meteorite impacts until 1977.'), icon: '\uD83D\uDEF0' },
                          { x: 8, z: -4, name: t('stem.moonmission.lunar_rover_lrv', 'Lunar Rover (LRV)'), fact: t('stem.moonmission.the_lunar_roving_vehicle_cost_38_milli', 'The Lunar Roving Vehicle cost $38 million. Apollo 17\'s rover traveled 35.7 km \u2014 still parked on the Moon with the keys in it!'), icon: '\uD83D\uDE97' },
                          { x: 4, z: 2, name: t('stem.moonmission.american_flag', 'American Flag'), fact: t('stem.moonmission.the_flags_on_the_moon_have_been_bleach', 'The flags were exposed to decades of harsh sunlight and likely faded badly. Lunar Reconnaissance Orbiter images show several Apollo flag poles still casting shadows; Apollo 11\'s flag was probably knocked over by engine exhaust.'), icon: '\uD83C\uDDFA\uD83C\uDDF8' },
                          { x: alsepX + 2, z: alsepZ + 1, name: t('stem.moonmission.seismometer', 'Seismometer'), fact: t('stem.moonmission.lunar_seismometers_detected_deep_moonq', 'Lunar seismometers detected deep moonquakes at 700-1100 km depth, caused by tidal forces from Earth. The Moon still has a partially molten core!'), icon: '\uD83D\uDCCA' },
                          { x: alsepX - 2, z: alsepZ - 1, name: t('stem.moonmission.laser_retroreflector', 'Laser Retroreflector'), fact: t('stem.moonmission.scientists_bounce_lasers_off_this_mirr', 'Scientists bounce lasers off this mirror to measure the Earth-Moon distance to within 1 cm accuracy. The Moon moves 3.8 cm farther from Earth each year.'), icon: '\uD83D\uDD2C' }
                        ];
                        var nearestLM = null;
                        var nearestLMDist = 999;
                        landmarks.forEach(function(lm) {
                          var ldist = Math.sqrt(Math.pow(playerPos.x - lm.x, 2) + Math.pow(playerPos.z - lm.z, 2));
                          if (ldist < nearestLMDist) { nearestLMDist = ldist; nearestLM = lm; }
                        });
                        var discEl = document.getElementById('eva-discovery');
                        if (!discEl) {
                          discEl = document.createElement('div');
                          discEl.id = 'eva-discovery';
                          discEl.style.cssText = 'position:absolute;bottom:8px;right:8px;max-width:250px;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);border-radius:12px;padding:10px 14px;color:#e2e8f0;font-family:system-ui;font-size:10px;pointer-events:none;z-index:12;border:1px solid rgba(56,189,248,0.3);opacity:0;transition:opacity 0.5s';
                          canvasEl.parentElement.appendChild(discEl);
                        }
                        if (nearestLM && nearestLMDist < 6) {
                          discEl.innerHTML = '<div style="font-weight:bold;font-size:12px;color:#fbbf24;margin-bottom:3px">' + nearestLM.icon + ' ' + nearestLM.name + '</div>' +
                            '<div style="color:#cbd5e1;line-height:1.4">' + nearestLM.fact + '</div>';
                          discEl.style.opacity = '1';
                        } else {
                          discEl.style.opacity = '0';
                        }
                      }

                      // ── Radio comms chatter ──
                      if (evaTick % 600 === 0 && evaTick > 0) { // every ~10 seconds
                        var evaComms = [
                          'Houston: "How does it feel up there, Commander?"',
                          'LMP: "The regolith is incredibly fine \u2014 like talcum powder."',
                          'Houston: "Your O\u2082 looks good. Continue exploration."',
                          'CDR: "The colors here \u2014 it\u2019s all grays and browns, but the shadows are so sharp."',
                          'LMP: "No atmosphere means no scattering. The shadows are pure black."',
                          'Houston: "Can you describe the terrain near the rille?"',
                          'CDR: "I can see Earth from here. It\u2019s the most beautiful thing I\u2019ve ever seen."',
                          'LMP: "This rock has green crystals in it \u2014 olivine! Fantastic!"',
                          'Houston: "Roger that. Take a photo for the geologists back home."',
                          'CDR: "The silence is profound. Just my own breathing in the suit."',
                          'LMP: "I just jumped three feet in the air. One-sixth gravity is incredible!"',
                          'Houston: "We\u2019re monitoring your vitals. Heart rate is elevated \u2014 from excitement, we hope."'
                        ];
                        var commsIdx2 = Math.floor(evaTick / 600) % evaComms.length;
                        var commsEl = document.getElementById('eva-comms');
                        if (!commsEl) {
                          commsEl = document.createElement('div');
                          commsEl.id = 'eva-comms';
                          commsEl.style.cssText = 'position:absolute;top:60px;left:50%;transform:translateX(-50%);color:rgba(165,180,252,0.7);font-size:10px;font-style:italic;font-family:system-ui;pointer-events:none;z-index:11;text-align:center;transition:opacity 1s;max-width:350px;text-shadow:0 1px 4px rgba(0,0,0,0.8)';
                          canvasEl.parentElement.appendChild(commsEl);
                        }
                        commsEl.style.opacity = '0';
                        setTimeout(function() {
                          commsEl.textContent = '\uD83D\uDCE1 ' + evaComms[commsIdx2];
                          commsEl.style.opacity = '1';
                        }, 500);
                        setTimeout(function() { commsEl.style.opacity = '0'; }, 8000);
                      }

                      // HUD updates
                      if (evaTick % 10 === 0) {
                        var o2El = document.getElementById('eva-o2');
                        var sampEl = document.getElementById('eva-samples');
                        var stepsEl = document.getElementById('eva-steps');
                        if (o2El) { o2El.textContent = evaO2.toFixed(0) + '%'; o2El.style.color = evaO2 > 50 ? '#22c55e' : evaO2 > 20 ? '#f59e0b' : '#ef4444'; }
                        if (sampEl) sampEl.textContent = evaSampleCount + ' / ' + LUNAR_SAMPLES_DATA.length + ' samples';
                        if (stepsEl) stepsEl.textContent = evaSteps + ' steps';
                      }

                      if (composer) { try { composer.render(); } catch (e) { composer = null; renderer.render(scene, camera); } }
                      else { renderer.render(scene, camera); }
                    }
                    animateEva();

                    // ── WebXR (optional): stand on the Moon — room-scale EVA walk (thumbstick
                    //    glide + teleport + comfort vignette via AlloVR). Loads only when a headset
                    //    is present; presenting-only, so the 2D pointer-lock walk is untouched.
                    //    Seat/bounds are world-units — ON-DEVICE TUNABLE. ──
                    var _evaVR = null, _evaVRPaused = false, _evaVRBtnOff = null;
                    try {
                      if (navigator.xr && navigator.xr.isSessionSupported) {
                        navigator.xr.isSessionSupported('immersive-vr').then(function (ok) {
                          if (!ok || !document.contains(canvasEl)) return;
                          var ensureV = function (cb) {
                            if (window.AlloModules && window.AlloModules.AlloVR) { cb(window.AlloModules.AlloVR); return; }
                            var base = 'https://alloflow-cdn.pages.dev/', q = '';
                            try {
                              var scr = document.querySelectorAll('script[src]');
                              for (var i = 0; i < scr.length; i++) {
                                var m = (scr[i].getAttribute('src') || '').match(/^(.*\/)(?:allo_vr_module|prim3d_module|stem_lab\/stem_tool_[a-z0-9]+)\.js(\?.*)?$/);
                                if (m) { base = m[1]; q = m[2] || ''; break; }
                              }
                            } catch (e) {}
                            try {
                              var s = document.createElement('script'); s.src = base + 'allo_vr_module.js' + q; s.async = true;
                              s.onload = function () { cb(window.AlloModules && window.AlloModules.AlloVR); };
                              s.onerror = function () { cb(null); };
                              document.head.appendChild(s);
                            } catch (e) { cb(null); }
                          };
                          ensureV(function (V) {
                            if (!V || !document.contains(canvasEl)) return;
                            try {
                              _evaVR = V.enable({
                                THREE: THREE, renderer: renderer, scene: scene, camera: camera,
                                seat: { position: [playerPos.x, 0, playerPos.z], scale: 1.0, moveSpeed: 1.6 },   // lunar amble
                                bounds: { minX: -80, maxX: 80, minZ: -80, maxZ: 80 },
                                render: function () { if (composer) { try { composer.render(); return; } catch (e) {} } renderer.render(scene, camera); },
                                pauseLoop: function () { _evaVRPaused = true; },
                                resumeLoop: function () { if (_evaVRPaused) { _evaVRPaused = false; animateEva(); } }
                              });
                              _evaVRBtnOff = V.mountButton(evaHud, _evaVR);
                            } catch (e) {}
                          });
                        }).catch(function () {});
                      }
                    } catch (e) {}

                    // Cleanup ref
                    canvasEl._evaCleanup = function() {
                      try { if (_evaVRBtnOff) _evaVRBtnOff(); } catch (e) {}
                      try { if (_evaVR && _evaVR.destroy) _evaVR.destroy(); _evaVR = null; } catch (e) {}
                      document.removeEventListener('mousemove', onMM);
                      if (document.pointerLockElement === canvasEl) document.exitPointerLock();
                      if (composer) { try { (composer.passes || []).forEach(function (p) { if (p && p.dispose) p.dispose(); }); } catch (e) {} composer = null; }
                      renderer.dispose();
                      if (evaHud.parentElement) evaHud.parentElement.removeChild(evaHud);
                      if (vignetteEl && vignetteEl.parentElement) vignetteEl.parentElement.removeChild(vignetteEl);
                    };
                  }

                  if (window.THREE) doEvaInit(window.THREE);
                  else {
                    var s = document.createElement('script');
                    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
                    s.onload = function() { doEvaInit(window.THREE); };
                    document.head.appendChild(s);
                  }
                }
              })
            ),
            h('div', { className: 'p-3 border-t border-slate-700 flex justify-between items-center' },
              h('div', null,
                h('p', { className: 'text-xs text-white font-bold' }, t('stem.moonmission.moonwalk_eva_3', '\uD83D\uDC68\u200D\uD83D\uDE80 Moonwalk EVA')),
                h('p', { className: 'text-[11px] text-slate-600' }, t('stem.moonmission.explore_collect_samples_jump_in_1_6_gr', 'Explore \u2022 Collect samples \u2022 Jump in 1/6 gravity!'))
              ),
              h('button', {
                'aria-label': 'End moonwalk EVA and return to Lunar Module. ' + (d.lunarSamples || []).length + ' samples collected.',
                onClick: function() {
                  // Clean up EVA canvas (Three.js, RAF, event listeners)
                  var evaCanvas = document.querySelector('[data-eva-canvas]');
                  if (evaCanvas && evaCanvas._evaCleanup) evaCanvas._evaCleanup();
                  advancePhase(7);
                  log('\uD83D\uDC68\u200D\uD83D\uDE80 EVA complete. ' + (d.lunarSamples || []).length + ' samples collected. Preparing for ascent.');
                  addXP(25);
                  if (addToast) addToast('\u2B06\uFE0F EVA complete! Time to go home. Preparing lunar ascent.', 'success');
                },
                className: 'px-4 py-2 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700'
              }, t('stem.moonmission.end_eva_return_to_lm', '\u2B06\uFE0F End EVA \u2014 Return to LM'))
            )
          )
        ),

        // ═══ PHASE 7: LUNAR ASCENT & RENDEZVOUS (Animated Canvas) ═══
        phase === 7 && h('div', { className: 'space-y-3', style: { animation: 'mmFadeSlideIn 0.4s ease-out' } },
          h('div', { className: 'bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl overflow-hidden border border-slate-700' },
            h('div', { className: 'relative', style: { height: '300px' } },
              h('canvas', {
                role: 'img',
                'aria-label': t('stem.moonmission.animated_lunar_ascent_sequence_ascent_', 'Animated lunar ascent sequence. Ascent stage lifts off the Moon leaving the descent stage behind, climbs to lunar orbit over 60 kilometers, then rendezvous-docks with the orbiting Command Module Columbia. HUD shows altitude, phase, distance to CSM.'),
                style: { width: '100%', height: '100%', display: 'block' },
                ref: function(cvEl) {
                  if (!cvEl || cvEl._ascentInit) return;
                  cvEl._ascentInit = true;
                  var ctx = cvEl.getContext('2d');
                  var W = cvEl.offsetWidth || 500, HA = cvEl.offsetHeight || 300;
                  cvEl.width = W * 2; cvEl.height = HA * 2; ctx.scale(2, 2); if (typeof ResizeObserver === 'function' && !cvEl._mmRO) { cvEl._mmRO = new ResizeObserver(function() { var nw = cvEl.offsetWidth, nh = cvEl.offsetHeight; if (nw > 0 && nh > 0 && (nw !== W || nh !== HA)) { W = nw; HA = nh; cvEl.width = nw * 2; cvEl.height = nh * 2; ctx.setTransform(2, 0, 0, 2, 0, 0); } }); cvEl._mmRO.observe(cvEl); }   // rotate/resize used to leave the canvas stretched (backing store was locked at first mount)
                  var tick = 0;
                  function drawAscent() {
                    tick++;
                    ctx.clearRect(0, 0, W, HA);
                    // Black lunar sky + stars
                    ctx.fillStyle = '#000008'; ctx.fillRect(0, 0, W, HA);
                    drawStarfield(ctx, W, HA, tick, 130);
                    // Phase timing (frames): 0-90 prelaunch, 90-450 ascent, 450-780 rendezvous, 780+ docked
                    var prelaunch = tick < 90;
                    var launching = tick >= 90 && tick < 450;
                    var rendezvous = tick >= 450 && tick < 780;
                    var docked = tick >= 780;
                    // Lunar surface with curving horizon (we're on a small world)
                    var horizonY = HA * 0.78;
                    ctx.save();
                    ctx.fillStyle = '#8a8080';
                    ctx.beginPath();
                    ctx.moveTo(0, HA); ctx.lineTo(0, horizonY);
                    ctx.arc(W * 0.5, horizonY + W * 1.14, W * 1.2, -Math.PI * 0.58, -Math.PI * 0.42);
                    ctx.lineTo(W, HA); ctx.closePath(); ctx.fill();
                    // Regolith texture
                    ctx.fillStyle = 'rgba(60,55,50,0.35)';
                    for (var di = 0; di < 60; di++) {
                      var dx = (di * 17.3) % W;
                      var dy = horizonY + 4 + (di * 2.7) % (HA - horizonY - 4);
                      ctx.fillRect(dx, dy, 2, 1);
                    }
                    // Small craters
                    ctx.fillStyle = 'rgba(45,40,38,0.5)';
                    for (var ci = 0; ci < 6; ci++) {
                      var ccx = 40 + ci * 80;
                      var ccy = horizonY + 18 + (ci % 2) * 16;
                      ctx.beginPath(); ctx.arc(ccx, ccy, 5 + (ci % 3), 0, Math.PI * 2); ctx.fill();
                    }
                    ctx.restore();
                    // Earthrise on horizon (far left)
                    drawDetailedEarth(ctx, W * 0.12, horizonY - 24, 14, tick);
                    ctx.fillStyle = 'rgba(148,163,184,0.7)'; ctx.font = '8px system-ui'; ctx.textAlign = 'center';
                    ctx.fillText('Earthrise', W * 0.12, horizonY - 44);
                    // LM descent stage left behind on surface
                    var descentX = W * 0.44;
                    var descentY = horizonY - 8;
                    ctx.save();
                    ctx.translate(descentX, descentY);
                    ctx.fillStyle = '#c9a444'; // gold thermal foil
                    ctx.fillRect(-14, 0, 28, 10);
                    ctx.fillStyle = '#7a7a7a';
                    ctx.fillRect(-14, 9, 28, 3);
                    // Landing legs (4 visible as 2)
                    ctx.strokeStyle = '#555'; ctx.lineWidth = 1.5;
                    ctx.beginPath(); ctx.moveTo(-14, 12); ctx.lineTo(-22, 18); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(14, 12); ctx.lineTo(22, 18); ctx.stroke();
                    ctx.fillStyle = '#444';
                    ctx.fillRect(-24, 16, 4, 2); ctx.fillRect(20, 16, 4, 2);
                    // Panel line
                    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.5;
                    ctx.beginPath(); ctx.moveTo(-14, 5); ctx.lineTo(14, 5); ctx.stroke();
                    // US flag next to stage (post-EVA)
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(-34, -4, 5, 3);
                    ctx.strokeStyle = '#999'; ctx.lineWidth = 0.5;
                    ctx.beginPath(); ctx.moveTo(-32, -4); ctx.lineTo(-32, 12); ctx.stroke();
                    ctx.restore();
                    // CSM orbital position (across the sky)
                    var csmX, csmY;
                    if (prelaunch) {
                      csmX = W * 0.8 - (tick * 0.4);
                      csmY = HA * 0.15 + Math.sin(tick * 0.02) * 2;
                    } else if (launching) {
                      csmX = W * 0.8 - 36 - ((tick - 90) * 0.15);
                      csmY = HA * 0.17 + Math.sin(tick * 0.02) * 2;
                    } else if (rendezvous) {
                      var rF = (tick - 450) / 330;
                      csmX = W * 0.7 - 18 + rF * 8;
                      csmY = HA * 0.22 + rF * 6;
                    } else {
                      csmX = W * 0.62;
                      csmY = HA * 0.3;
                    }
                    // Ascent stage position
                    var ascentX, ascentY, ascentAng = 0;
                    if (prelaunch) {
                      ascentX = descentX; ascentY = descentY - 10;
                    } else if (launching) {
                      var lF = (tick - 90) / 360;
                      ascentX = descentX + lF * lF * 70;
                      ascentY = (descentY - 10) - lF * (descentY - 10 - HA * 0.28);
                      ascentAng = lF * 0.5;
                    } else if (rendezvous) {
                      var rF2 = (tick - 450) / 330;
                      var sX = descentX + 70, sY = HA * 0.28;
                      ascentX = sX + (csmX - 14 - sX) * rF2;
                      ascentY = sY + (csmY - sY) * rF2;
                      ascentAng = 0.5 + rF2 * 0.4;
                    } else {
                      ascentX = csmX - 14; ascentY = csmY;
                      ascentAng = 0.9;
                    }
                    // Trajectory trail (dashed arc from descent stage to ascent stage)
                    if (launching || rendezvous) {
                      ctx.save();
                      ctx.strokeStyle = 'rgba(56,189,248,0.3)';
                      ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
                      ctx.beginPath();
                      ctx.moveTo(descentX, descentY - 10);
                      ctx.quadraticCurveTo(descentX + 50, descentY - 60, ascentX, ascentY);
                      ctx.stroke();
                      ctx.setLineDash([]);
                      ctx.restore();
                    }
                    // Dust plume at liftoff
                    if (tick >= 85 && tick < 220) {
                      ctx.save();
                      var dustF = tick - 85;
                      for (var pi = 0; pi < 18; pi++) {
                        var pAlpha = Math.max(0, 0.55 - dustF * 0.004 - pi * 0.015);
                        ctx.globalAlpha = pAlpha;
                        ctx.fillStyle = pi < 9 ? '#e0d8c8' : '#b8b0a0';
                        var ppx = descentX + (Math.sin(pi * 1.7) * 35) + (Math.random() - 0.5) * 8;
                        var ppy = descentY + 10 + (Math.random() - 0.5) * 6;
                        var ppr = 3 + dustF * 0.1 + Math.random() * 2;
                        ctx.beginPath(); ctx.arc(ppx, ppy, ppr, 0, Math.PI * 2); ctx.fill();
                      }
                      ctx.restore();
                    }
                    // Draw CSM (Columbia)
                    ctx.save();
                    ctx.translate(csmX, csmY);
                    // Engine bell (rear)
                    ctx.fillStyle = '#888';
                    ctx.beginPath(); ctx.moveTo(-20, -2.5); ctx.lineTo(-24, -4.5); ctx.lineTo(-24, 4.5); ctx.lineTo(-20, 2.5); ctx.closePath(); ctx.fill();
                    // Service module
                    ctx.fillStyle = '#c0c8d0';
                    ctx.fillRect(-20, -3.5, 22, 7);
                    // Command module cone
                    ctx.fillStyle = '#e8ecf0';
                    ctx.beginPath();
                    ctx.moveTo(7, 0); ctx.lineTo(2, -3.5); ctx.lineTo(-3, -3.5); ctx.lineTo(-3, 3.5); ctx.lineTo(2, 3.5); ctx.closePath(); ctx.fill();
                    // Docking port
                    ctx.fillStyle = '#555';
                    ctx.fillRect(7, -1.5, 2, 3);
                    // Window
                    ctx.fillStyle = '#38bdf8';
                    ctx.fillRect(0, -1.2, 2, 2.4);
                    // RCS thruster quad
                    ctx.fillStyle = '#999';
                    ctx.fillRect(-10, -5, 3, 1.5); ctx.fillRect(-10, 3.5, 3, 1.5);
                    ctx.restore();
                    // CSM label
                    ctx.fillStyle = 'rgba(148,163,184,0.75)';
                    ctx.font = '8px system-ui'; ctx.textAlign = 'center';
                    ctx.fillText('CSM "Columbia"', csmX, csmY - 12);
                    // Draw ascent stage ("Eagle")
                    ctx.save();
                    ctx.translate(ascentX, ascentY);
                    ctx.rotate(ascentAng);
                    // Octagonal ascent body (gold foil) — an actual octagon path now,
                    // with a lit/shadow foil split (the comment used to promise an
                    // octagon while drawing a plain rectangle)
                    ctx.beginPath();
                    ctx.moveTo(-5, -1.5); ctx.lineTo(-3.2, -4); ctx.lineTo(3.2, -4); ctx.lineTo(5, -1.5);
                    ctx.lineTo(5, 1.5); ctx.lineTo(3.2, 4); ctx.lineTo(-3.2, 4); ctx.lineTo(-5, 1.5);
                    ctx.closePath();
                    ctx.fillStyle = '#c9a444';
                    ctx.fill();
                    ctx.fillStyle = 'rgba(90,62,20,0.35)';           // shadowed foil facet
                    ctx.beginPath();
                    ctx.moveTo(5, 1.5); ctx.lineTo(3.2, 4); ctx.lineTo(-3.2, 4); ctx.lineTo(-5, 1.5);
                    ctx.closePath(); ctx.fill();
                    // Top white section (RCS + docking tunnel)
                    ctx.fillStyle = '#e8ecf0';
                    ctx.fillRect(-3, -6, 6, 2);
                    ctx.fillStyle = '#888';
                    ctx.fillRect(-1, -7, 2, 1);
                    // Window (front-facing)
                    ctx.fillStyle = '#38bdf8';
                    ctx.fillRect(-3.5, -2, 2, 2);
                    // Antenna
                    ctx.strokeStyle = '#aaa'; ctx.lineWidth = 0.5;
                    ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(2, -10); ctx.stroke();
                    // Engine flame (below)
                    if (launching || rendezvous) {
                      var flameLen = launching ? (7 + Math.random() * 5) : (2 + Math.random() * 1.5);
                      var flameW = launching ? 3 : 1.5;
                      var fg = ctx.createLinearGradient(0, 4, 0, 4 + flameLen);
                      fg.addColorStop(0, 'rgba(255,220,100,0.9)');
                      fg.addColorStop(0.5, 'rgba(255,120,20,0.6)');
                      fg.addColorStop(1, 'rgba(200,0,0,0)');
                      ctx.fillStyle = fg;
                      ctx.beginPath();
                      ctx.moveTo(-flameW, 4); ctx.lineTo(0, 4 + flameLen); ctx.lineTo(flameW, 4); ctx.closePath();
                      ctx.fill();
                    }
                    ctx.restore();
                    // Ascent label (only during launch/rendezvous, fades when docked)
                    if (!docked) {
                      ctx.fillStyle = 'rgba(251,191,36,0.75)';
                      ctx.font = '8px system-ui'; ctx.textAlign = 'center';
                      ctx.fillText('"Eagle" ascent', ascentX, ascentY + 14);
                    }
                    // HUD left (altitude + phase)
                    ctx.fillStyle = 'rgba(0,0,0,0.62)';
                    ctx.fillRect(8, 8, 140, 74);
                    ctx.textAlign = 'left'; ctx.font = 'bold 9px monospace';
                    ctx.fillStyle = '#fbbf24'; ctx.fillText('LM ASCENT STAGE', 14, 22);
                    ctx.font = 'bold 8px monospace'; ctx.fillStyle = '#94a3b8';
                    ctx.fillText('ALTITUDE', 14, 36);
                    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px monospace';
                    var altKm = 0;
                    if (launching) altKm = ((tick - 90) / 360) * 110;
                    else if (rendezvous || docked) altKm = 110;
                    ctx.fillText(altKm.toFixed(1) + ' km', 14, 50);
                    ctx.font = 'bold 8px monospace'; ctx.fillStyle = '#94a3b8';
                    ctx.fillText('PHASE', 14, 64);
                    ctx.font = 'bold 10px monospace';
                    ctx.fillStyle = prelaunch ? '#fbbf24' : launching ? '#ef4444' : rendezvous ? '#38bdf8' : '#22c55e';
                    ctx.fillText(prelaunch ? 'PRE-LAUNCH' : launching ? 'ASCENT' : rendezvous ? 'RENDEZVOUS' : 'DOCKED', 14, 78);
                    // HUD right (distance to CSM; drops under the left panel below ~290px)
                    ctx.save();
                    if (W < 290) ctx.translate(0, 78);
                    ctx.fillStyle = 'rgba(0,0,0,0.62)';
                    ctx.fillRect(W - 128, 8, 120, 58);
                    ctx.textAlign = 'right'; ctx.font = 'bold 9px monospace';
                    ctx.fillStyle = '#fbbf24'; ctx.fillText('DIST TO CSM', W - 14, 22);
                    var dx1 = csmX - ascentX, dy1 = csmY - ascentY;
                    var pxDist = Math.sqrt(dx1 * dx1 + dy1 * dy1);
                    var distKm = (pxDist * 2.5).toFixed(1);
                    ctx.font = 'bold 17px monospace';
                    ctx.fillStyle = pxDist < 10 ? '#22c55e' : pxDist < 60 ? '#fbbf24' : '#fff';
                    ctx.fillText(distKm + ' km', W - 14, 42);
                    ctx.font = 'bold 8px monospace'; ctx.fillStyle = '#94a3b8';
                    ctx.fillText(docked ? 'HARD DOCK' : rendezvous ? 'closing...' : prelaunch ? 'aligned' : 'pursuing', W - 14, 56);
                    ctx.restore();
                    // Countdown during prelaunch
                    if (prelaunch) {
                      var secs = Math.max(1, Math.ceil((90 - tick) / 30));
                      ctx.textAlign = 'center'; ctx.font = 'bold 40px monospace';
                      ctx.globalAlpha = 0.75 + Math.sin(tick * 0.3) * 0.25;
                      ctx.fillStyle = '#fbbf24';
                      ctx.fillText('T-' + secs, W * 0.5, HA * 0.38);
                      ctx.globalAlpha = 1;
                      ctx.font = '10px system-ui'; ctx.fillStyle = '#94a3b8';
                      ctx.fillText('Ascent engine — single-start, cannot abort', W * 0.5, HA * 0.46);
                    }
                    // DOCKED confirmation
                    if (docked) {
                      var dPulse = 0.65 + Math.sin(tick * 0.15) * 0.3;
                      ctx.globalAlpha = dPulse;
                      ctx.textAlign = 'center'; ctx.font = 'bold 18px system-ui';
                      ctx.fillStyle = '#22c55e';
                      ctx.fillText('\u2705 HARD DOCK CONFIRMED', W * 0.5, HA * 0.52);
                      ctx.globalAlpha = 1;
                      ctx.font = '10px system-ui'; ctx.fillStyle = '#94a3b8';
                      ctx.fillText('Ready to jettison "Eagle" and head home', W * 0.5, HA * 0.58);
                    }
                    // Comms chatter
                    var msgs = prelaunch ? ['Houston: "Eagle, you are GO for ascent."'] :
                               launching ? ['Aldrin: "We\'re lifting off! Beautiful."', 'Houston: "Nominal ascent, Eagle."'] :
                               rendezvous ? ['Collins: "I have visual on Eagle."', 'Armstrong: "Closing to 100 feet."'] :
                                            ['Aldrin: "We are docked, Houston."', 'Houston: "Roger, Eagle. Great job."'];
                    var mIdx = Math.floor(tick / 180) % msgs.length;
                    var mFade = Math.min(1, (tick % 180) < 150 ? (tick % 180) / 25 : (180 - tick % 180) / 30);
                    ctx.globalAlpha = mFade * 0.85;
                    ctx.textAlign = 'center'; ctx.font = 'italic 10px system-ui';
                    ctx.fillStyle = '#a5b4fc';
                    ctx.fillText(msgs[mIdx], W * 0.5, HA - 10);
                    ctx.globalAlpha = 1;
                    drawVignette(ctx, W, HA, 0.25);
                    if (document.contains(cvEl)) requestAnimationFrame(drawAscent);
                  }
                  drawAscent();
                }
              })
            ),
            h('div', { className: 'p-4 text-white border-t border-slate-700' },
              h('div', { className: 'text-center mb-3' },
                h('div', { className: 'text-3xl' }, '\u2B06\uFE0F'),
                h('h4', { className: 'text-base font-bold' }, t('stem.moonmission.lunar_ascent_rendezvous', 'Lunar Ascent & Rendezvous')),
                h('p', { className: 'text-[11px] text-slate-600' }, t('stem.moonmission.ascent_stage_launches_from_moon_docks_', 'Ascent stage launches from Moon, docks with Columbia'))
              ),
              h('div', { className: 'bg-white/5 rounded-lg p-3 border border-white/10 mb-3' },
                h('p', { className: 'text-[11px] text-slate-300 leading-relaxed' },
                  t('stem.moonmission.the_lm_s_ascent_engine_a_single_start_', 'The LM\'s ascent engine — a single-start hypergolic motor with no abort option — fires to launch you off the lunar surface. The descent stage serves as the launch pad and stays behind. You rendezvous and dock with Columbia, then jettison "Eagle" (it eventually crashes into the Moon).')),
                h('div', { className: 'mt-2 bg-amber-500/10 rounded p-2 border border-amber-500/20' },
                  h('p', { className: 'text-[11px] text-amber-300' }, '\uD83E\uDEA8 Samples collected: ' + (d.lunarSamples || []).length + ' / ' + LUNAR_SAMPLES_DATA.length),
                  (d.lunarSamples || []).map(function(s, i) {
                    return h('p', { key: i, className: 'text-[11px] text-slate-600 ml-2' }, s.icon + ' ' + s.name + ' (' + s.type + ')');
                  })
                )
              ),
              h('div', { className: 'bg-indigo-500/10 rounded-lg p-2 border border-indigo-500/20' },
                h('p', { className: 'text-[11px] text-indigo-300' }, '\uD83D\uDCA1 ' + APOLLO_FACTS[Math.floor(Math.random() * APOLLO_FACTS.length)])
              )
            )
          ),
          h('button', {
            'aria-label': t('stem.moonmission.fire_trans_earth_injection_burn_to_beg', 'Fire trans-Earth injection burn to begin 3-day return journey home'),
            onClick: function() {
              advancePhase(8);
              log('\u2B06\uFE0F Docked with Columbia. LM jettisoned.');
              addXP(15);
              if (addToast) addToast('\uD83C\uDF0D TEI burn complete. Heading home.', 'success');
            },
            className: 'w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg'
          }, t('stem.moonmission.tei_burn_head_home', '\uD83D\uDE80 TEI Burn \u2014 Head Home'))
        ),

        // ═══ PHASE 8: TRANS-EARTH COAST ═══
        phase === 8 && h('div', { className: 'space-y-3', style: { animation: 'mmFadeSlideIn 0.4s ease-out' } },
          h('div', { className: 'bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl p-4 text-white' },
            h('div', { className: 'text-center mb-3' },
              h('div', { className: 'text-3xl' }, '\uD83C\uDF0D'),
              h('h4', { className: 'text-base font-bold' }, t('stem.moonmission.trans_earth_coast_2', 'Trans-Earth Coast')),
              h('p', { className: 'text-[11px] text-slate-600' }, t('stem.moonmission.returning_home_384_400_km_3_days', 'Returning home \u2022 384,400 km \u2022 ~3 days'))
            ),
            h('div', { className: 'bg-white/5 rounded-lg p-3 border border-white/10 mb-3' },
              h('p', { className: 'text-[11px] text-slate-300 leading-relaxed' },
                t('stem.moonmission.the_service_module_engine_fires_for_th', 'The Service Module engine fires for the Trans-Earth Injection burn. You coast for 3 days back to Earth, jettison the Service Module, and prepare the Command Module for re-entry \u2014 the most dangerous phase of the mission.'))
            ),
            h('div', { className: 'bg-indigo-500/10 rounded-lg p-2 border border-indigo-500/20' },
              h('p', { className: 'text-[11px] text-indigo-300' }, '\uD83D\uDCA1 ' + APOLLO_FACTS[Math.floor(Math.random() * APOLLO_FACTS.length)])
            )
          ),
          h('button', {
            'aria-label': t('stem.moonmission.begin_atmospheric_re_entry_sequence_at', 'Begin atmospheric re-entry sequence at 39,900 kilometers per hour'),
            onClick: function() {
              advancePhase(9);
              log('\uD83C\uDF0D Approaching Earth. Preparing for re-entry.');
              addXP(15);
            },
            className: 'w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg'
          }, t('stem.moonmission.begin_re_entry_sequence', '\uD83C\uDF0A Begin Re-entry Sequence'))
        ),

        // ═══ PHASE 9: RE-ENTRY & SPLASHDOWN (Animated Canvas) ═══
        phase === 9 && h('div', { className: 'space-y-3', style: { animation: 'mmFadeSlideIn 0.4s ease-out' } },
          h('div', { className: 'bg-gradient-to-b from-orange-950 to-slate-900 rounded-xl overflow-hidden border border-orange-900/50' },
            h('div', { className: 'relative', style: { height: '320px' } },
              h('canvas', { 
                role: 'img',
                'aria-label': t('stem.moonmission.animated_re_entry_sequence_command_mod', 'Animated re-entry sequence. Command Module enters atmosphere at 39,900 km/h with plasma heating to 2,760 degrees. Shows radio blackout, drogue chutes, main parachutes, and ocean splashdown.'),
                style: { width: '100%', height: '100%', display: 'block' },
                ref: function(cvEl) {
                  if (!cvEl || cvEl._reentryInit) return;
                  cvEl._reentryInit = true;
                  var ctx = cvEl.getContext('2d');
                  var W = cvEl.offsetWidth || 500, HR = cvEl.offsetHeight || 320;
                  cvEl.width = W * 2; cvEl.height = HR * 2; ctx.scale(2, 2); if (typeof ResizeObserver === 'function' && !cvEl._mmRO) { cvEl._mmRO = new ResizeObserver(function() { var nw = cvEl.offsetWidth, nh = cvEl.offsetHeight; if (nw > 0 && nh > 0 && (nw !== W || nh !== HR)) { W = nw; HR = nh; cvEl.width = nw * 2; cvEl.height = nh * 2; ctx.setTransform(2, 0, 0, 2, 0, 0); } }); cvEl._mmRO.observe(cvEl); }   // rotate/resize used to leave the canvas stretched (backing store was locked at first mount)
                  var tick = 0;
                  var reentryPhase = 0; // 0=heat, 1=blackout, 2=drogue, 3=main chutes, 4=splash
                  function drawReentry() {
                    tick++;
                    ctx.clearRect(0, 0, W, HR);
                    // Phase progression
                    if (tick > 180 && reentryPhase === 0) reentryPhase = 1; // blackout
                    if (tick > 360 && reentryPhase === 1) reentryPhase = 2; // drogue
                    if (tick > 480 && reentryPhase === 2) reentryPhase = 3; // main chutes
                    if (tick > 600 && reentryPhase === 3) reentryPhase = 4; // splash
                    var capsuleY = HR * 0.35;
                    // Background changes with phase
                    if (reentryPhase <= 1) {
                      // Space/upper atmosphere - dark with plasma glow
                      var heatPct = Math.min(1, tick / 180);
                      var bgGrad = ctx.createLinearGradient(0, 0, 0, HR);
                      bgGrad.addColorStop(0, '#000005');
                      bgGrad.addColorStop(0.5, 'rgb(' + Math.round(40 * heatPct) + ',0,' + Math.round(10 * heatPct) + ')');
                      bgGrad.addColorStop(1, 'rgb(' + Math.round(80 * heatPct) + ',' + Math.round(20 * heatPct) + ',0)');
                      ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, W, HR);
                      // Stars (fade out during heating)
                      ctx.save();
                      ctx.globalAlpha = Math.max(0, 0.3 * (1 - heatPct));
                      drawStarfield(ctx, W, HR, tick, 60);
                      ctx.restore();
                      // ── Enhanced plasma/fire effects ──
                      if (heatPct > 0.15) {
                        var fireIntensity = heatPct;
                        // Bow shock wave (curved arc ahead of capsule)
                        ctx.save();
                        ctx.globalAlpha = 0.4 * fireIntensity;
                        ctx.strokeStyle = '#fff';
                        ctx.lineWidth = 2 + fireIntensity * 2;
                        ctx.beginPath();
                        ctx.arc(W * 0.5, capsuleY - 5, 25 + fireIntensity * 10, Math.PI * 0.7, Math.PI * 0.3, true);
                        ctx.stroke();
                        // Second shock layer (wider, fainter)
                        ctx.globalAlpha = 0.15 * fireIntensity;
                        ctx.strokeStyle = '#ffa500';
                        ctx.lineWidth = 3 + fireIntensity * 3;
                        ctx.beginPath();
                        ctx.arc(W * 0.5, capsuleY - 10, 35 + fireIntensity * 15, Math.PI * 0.75, Math.PI * 0.25, true);
                        ctx.stroke();
                        ctx.restore();
                        // Plasma streaks (elongated trails behind capsule)
                        for (var fi = 0; fi < 12; fi++) {
                          var sx = W * 0.5 + (Math.random() - 0.5) * 30 * fireIntensity;
                          var sy = capsuleY + 15 + Math.random() * 20;
                          var sLen = 20 + Math.random() * 50 * fireIntensity;
                          var sGrad = ctx.createLinearGradient(sx, sy, sx + (Math.random() - 0.5) * 8, sy + sLen);
                          var r = 255, g = Math.round(200 - fi * 15), b = Math.round(fi * 8);
                          sGrad.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',' + (0.4 * fireIntensity) + ')');
                          sGrad.addColorStop(0.6, 'rgba(' + r + ',' + Math.max(0, g - 60) + ',0,' + (0.15 * fireIntensity) + ')');
                          sGrad.addColorStop(1, 'transparent');
                          ctx.strokeStyle = sGrad;
                          ctx.lineWidth = 1 + Math.random() * 2;
                          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + (Math.random() - 0.5) * 8, sy + sLen); ctx.stroke();
                        }
                        // Heat shield glow (intense white-hot center)
                        var hsGrad = ctx.createRadialGradient(W * 0.5, capsuleY + 8, 0, W * 0.5, capsuleY + 8, 18 * fireIntensity);
                        hsGrad.addColorStop(0, 'rgba(255,255,220,' + (0.6 * fireIntensity) + ')');
                        hsGrad.addColorStop(0.3, 'rgba(255,200,50,' + (0.3 * fireIntensity) + ')');
                        hsGrad.addColorStop(0.7, 'rgba(255,100,0,' + (0.15 * fireIntensity) + ')');
                        hsGrad.addColorStop(1, 'transparent');
                        ctx.fillStyle = hsGrad;
                        ctx.beginPath(); ctx.arc(W * 0.5, capsuleY + 8, 18 * fireIntensity, 0, Math.PI * 2); ctx.fill();
                        // Ablation sparks (small particles flying backward)
                        ctx.globalAlpha = 0.7;
                        for (var spi = 0; spi < 10; spi++) {
                          var spx = W * 0.5 + (Math.random() - 0.5) * 35;
                          var spy = capsuleY + 20 + Math.random() * 40 * fireIntensity;
                          var spr = 0.5 + Math.random() * 1.5;
                          ctx.fillStyle = spi < 5 ? '#ffee88' : '#ff8844';
                          ctx.beginPath(); ctx.arc(spx, spy, spr, 0, Math.PI * 2); ctx.fill();
                        }
                        ctx.globalAlpha = 1;
                        // Atmospheric orange tint on upper canvas
                        ctx.globalAlpha = 0.05 * fireIntensity;
                        ctx.fillStyle = '#ff6600';
                        ctx.fillRect(0, 0, W, HR * 0.5);
                        ctx.globalAlpha = 1;
                      }
                      // Blackout static + enhanced interference
                      if (reentryPhase === 1) {
                        ctx.globalAlpha = 0.2;
                        for (var ni = 0; ni < 60; ni++) {
                          ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : (Math.random() > 0.5 ? '#ff4400' : '#ff8800');
                          var nw = 1 + Math.random() * 3;
                          ctx.fillRect(Math.random() * W, Math.random() * HR, nw, 1);
                        }
                        // Scan lines
                        ctx.fillStyle = 'rgba(0,0,0,0.03)';
                        for (var sli = 0; sli < HR; sli += 3) { ctx.fillRect(0, sli, W, 1); }
                        ctx.globalAlpha = 1;
                        ctx.textAlign = 'center'; ctx.font = 'bold 14px monospace';
                        ctx.fillStyle = '#ff4444';
                        ctx.fillText('\u26A0 COMMUNICATIONS BLACKOUT', W * 0.5, 30);
                        ctx.font = '9px system-ui'; ctx.fillStyle = '#f87171';
                        ctx.fillText('Ionized plasma at 2,760\u00B0C blocking all radio signals...', W * 0.5, 46);
                      }
                    } else {
                      // Lower atmosphere - blue sky appearing
                      var skyProgress = (reentryPhase - 2) / 2;
                      var bgGrad2 = ctx.createLinearGradient(0, 0, 0, HR);
                      bgGrad2.addColorStop(0, 'rgb(' + Math.round(30 + skyProgress * 100) + ',' + Math.round(50 + skyProgress * 130) + ',' + Math.round(80 + skyProgress * 170) + ')');
                      bgGrad2.addColorStop(1, reentryPhase >= 4 ? '#3b82f6' : '#1e40af');
                      ctx.fillStyle = bgGrad2; ctx.fillRect(0, 0, W, HR);
                      capsuleY = HR * (0.3 + skyProgress * 0.25);
                      // Ocean at bottom for splash phase
                      if (reentryPhase >= 3) {
                        var oceanTop = HR * (0.85 - (reentryPhase >= 4 ? 0.15 : 0));
                        ctx.fillStyle = '#1e40af';
                        ctx.fillRect(0, oceanTop, W, HR - oceanTop);
                        // Waves
                        ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1;
                        for (var wi = 0; wi < 5; wi++) {
                          ctx.beginPath();
                          ctx.moveTo(0, oceanTop + wi * 8 + 5);
                          for (var wx = 0; wx < W; wx += 10) {
                            ctx.lineTo(wx, oceanTop + wi * 8 + 5 + Math.sin(wx * 0.03 + tick * 0.02 + wi) * 3);
                          }
                          ctx.stroke();
                        }
                      }
                    }
                    // Capsule — the Apollo CM gumdrop: truncated cone with curved shoulder,
                    // shaded silver body, hatch window (was a bare flat grey triangle)
                    var capX = W * 0.5;
                    var capGrad = ctx.createLinearGradient(capX - 12, 0, capX + 12, 0);
                    capGrad.addColorStop(0, '#e8ecf2');
                    capGrad.addColorStop(0.45, '#c3cad4');
                    capGrad.addColorStop(1, '#7d8794');
                    ctx.fillStyle = capGrad;
                    ctx.beginPath();
                    ctx.moveTo(capX - 12, capsuleY + 10);
                    ctx.lineTo(capX - 3.5, capsuleY - 8);
                    ctx.quadraticCurveTo(capX, capsuleY - 10.5, capX + 3.5, capsuleY - 8);   // rounded apex (docking tunnel shoulder)
                    ctx.lineTo(capX + 12, capsuleY + 10);
                    ctx.closePath(); ctx.fill();
                    ctx.fillStyle = '#64748b';                                               // apex docking probe stub
                    ctx.fillRect(capX - 1.5, capsuleY - 12, 3, 3);
                    ctx.fillStyle = '#38bdf8';                                               // crew hatch window
                    ctx.beginPath(); ctx.arc(capX - 4.5, capsuleY + 2.5, 1.8, 0, Math.PI * 2); ctx.fill();
                    ctx.strokeStyle = 'rgba(71,85,105,0.55)'; ctx.lineWidth = 0.8;           // panel seam
                    ctx.beginPath(); ctx.moveTo(capX - 9.5, capsuleY + 6); ctx.lineTo(capX + 9.5, capsuleY + 6); ctx.stroke();
                    // Heat shield (bottom, glows during re-entry)
                    if (reentryPhase <= 1) {
                      var shieldGlow = Math.min(1, tick / 120);
                      ctx.shadowColor = 'rgba(255,140,0,0.85)'; ctx.shadowBlur = 12 * shieldGlow;
                      ctx.fillStyle = 'rgb(' + Math.round(150 + shieldGlow * 105) + ',' + Math.round(50 + shieldGlow * 50) + ',0)';
                      ctx.fillRect(capX - 14, capsuleY + 10, 28, 4);
                      ctx.shadowBlur = 0;
                    }
                    // Parachutes
                    if (reentryPhase >= 2) {
                      var chuteCount = reentryPhase >= 3 ? 3 : 2;
                      var chuteColor = reentryPhase >= 3 ? '#ef4444' : '#f59e0b';
                      for (var pi = 0; pi < chuteCount; pi++) {
                        var pxOff = (pi - (chuteCount - 1) / 2) * 25;
                        // Lines
                        ctx.strokeStyle = '#888'; ctx.lineWidth = 0.5;
                        ctx.beginPath(); ctx.moveTo(capX + pxOff - 15, capsuleY - 35 - pi * 5); ctx.lineTo(capX - 5, capsuleY - 8); ctx.stroke();
                        ctx.beginPath(); ctx.moveTo(capX + pxOff + 15, capsuleY - 35 - pi * 5); ctx.lineTo(capX + 5, capsuleY - 8); ctx.stroke();
                        // Canopy
                        ctx.fillStyle = chuteColor;
                        ctx.beginPath();
                        ctx.ellipse(capX + pxOff, capsuleY - 40 - pi * 5, 18, 10, 0, Math.PI, 0);
                        ctx.fill();
                        // Stripe
                        ctx.fillStyle = '#ffffff';
                        ctx.beginPath();
                        ctx.ellipse(capX + pxOff, capsuleY - 40 - pi * 5, 18, 3, 0, Math.PI, 0);
                        ctx.fill();
                      }
                    }
                    // Splash effect
                    if (reentryPhase >= 4) {
                      ctx.fillStyle = 'rgba(255,255,255,0.4)';
                      for (var spi = 0; spi < 10; spi++) {
                        var spx = capX + (Math.random() - 0.5) * 40;
                        var spy = capsuleY + 15 + Math.random() * 10;
                        ctx.beginPath(); ctx.arc(spx, spy, 2 + Math.random() * 3, 0, Math.PI * 2); ctx.fill();
                      }
                    }
                    // Temperature HUD
                    if (reentryPhase <= 1) {
                      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(8, HR - 40, 140, 32);
                      ctx.font = 'bold 9px monospace'; ctx.textAlign = 'left';
                      ctx.fillStyle = '#ef4444'; ctx.fillText('HEAT SHIELD', 14, HR - 26);
                      var shieldTemp = Math.round(Math.min(2760, tick * 15));
                      ctx.fillStyle = shieldTemp > 2000 ? '#ef4444' : '#f59e0b';
                      ctx.font = 'bold 14px monospace';
                      ctx.fillText(shieldTemp + '\u00B0C', 14, HR - 12);
                    }
                    // Phase label
                    var phaseLabels = ['ATMOSPHERIC ENTRY', 'RADIO BLACKOUT', 'DROGUE CHUTES', 'MAIN CHUTES', 'SPLASHDOWN!'];
                    ctx.textAlign = 'center'; ctx.font = 'bold 11px system-ui';
                    ctx.fillStyle = reentryPhase === 4 ? '#22c55e' : reentryPhase <= 1 ? '#f97316' : '#38bdf8';
                    ctx.fillText(phaseLabels[reentryPhase], W * 0.5, HR - 8);
                    // Comms
                    var reComms = ['CDR: "Getting warm in here..."', 'Houston: "...Apollo, do you read?... Apollo..."', 'Houston: "We see your chutes! Welcome back!"', 'CDR: "Main chutes look good!"', 'Houston: "SPLASHDOWN! Welcome home!"'];
                    ctx.globalAlpha = 0.6; ctx.font = 'italic 9px system-ui'; ctx.fillStyle = '#a5b4fc';
                    ctx.fillText(reComms[reentryPhase], W * 0.5, 16);
                    ctx.globalAlpha = 1;
                    drawVignette(ctx, W, HR, 0.35);
                    if (reentryPhase < 4 && document.contains(cvEl)) requestAnimationFrame(drawReentry);
                  }
                  drawReentry();
                }
              })
            ),
            h('div', { className: 'p-3 border-t border-orange-900/30' },
              h('p', { className: 'text-[11px] text-slate-200 mb-2' }, t('stem.moonmission.watch_the_command_module_survive_re_en', 'Watch the Command Module survive re-entry at 39,900 km/h through 2,760\u00B0C plasma, deploy parachutes, and splash down in the Pacific Ocean.')),
              h('div', { className: 'bg-indigo-500/10 rounded p-1.5 border border-indigo-500/20' },
                h('p', { className: 'text-[11px] text-indigo-300' }, '\uD83D\uDCA1 ' + APOLLO_FACTS[Math.floor(Math.random() * APOLLO_FACTS.length)])
              )
            )
          ),
          h('button', {
            'aria-label': t('stem.moonmission.complete_the_mission_with_pacific_ocea', 'Complete the mission with Pacific Ocean splashdown. Welcome home Commander!'),
            onClick: function() {
              setPhase(10);
              log('\uD83C\uDF0A SPLASHDOWN! Mission complete.');
              addXP(50);
              if (addToast) addToast('\uD83C\uDF89 MISSION COMPLETE! Welcome home, Commander!', 'success');
              if (typeof announceToSR === 'function') announceToSR('Mission complete! Splashdown in the Pacific Ocean. Welcome home, Commander.');
            },
            className: 'w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 shadow-lg animate-pulse'
          }, t('stem.moonmission.mission_complete_splashdown', '\uD83C\uDF0A Mission Complete \u2014 SPLASHDOWN!'))
        ),

        // ═══ PHASE 10: MISSION COMPLETE ═══
        phase >= 10 && h('div', { className: 'space-y-3', style: { animation: 'mmFadeSlideIn 0.4s ease-out' } },
          h('div', { className: 'bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 rounded-xl p-5 text-white text-center' },
            h('div', { className: 'text-5xl mb-2' }, '\uD83C\uDF1F'),
            h('h4', { className: 'text-xl font-black tracking-wide mb-1' }, t('stem.moonmission.mission_complete', 'MISSION COMPLETE')),
            h('p', { className: 'text-sm text-indigo-300 mb-3' }, t('stem.moonmission.welcome_home_commander_the_world_celeb', 'Welcome home, Commander. The world celebrates.')),
            h('div', { className: 'grid grid-cols-3 gap-3 mb-4' },
              [
                ['\uD83D\uDE80', 'Launched', 'Saturn V'],
                ['\uD83C\uDF15', 'Landed', 'Sea of Tranquility'],
                ['\uD83E\uDEA8', 'Collected', (d.lunarSamples || []).length + ' samples']
              ].map(function(item) {
                return h('div', { key: item[0], className: 'bg-white/10 rounded-lg p-3' },
                  h('div', { className: 'text-2xl mb-1' }, item[0]),
                  h('p', { className: 'text-[11px] text-slate-600' }, item[1]),
                  h('p', { className: 'text-xs font-bold' }, item[2])
                );
              })
            ),
            h('div', { className: 'bg-white/5 rounded-lg p-3 border border-white/10 text-left mb-3' },
              h('p', { className: 'text-[11px] text-fuchsia-300 font-bold mb-1' }, t('stem.moonmission.mission_debrief', '\uD83C\uDFC5 MISSION DEBRIEF')),
              h('div', { className: 'grid grid-cols-4 gap-2 mb-2' },
                [
                  ['\u2B50', (d.missionXP || 0) + ' XP', 'Total'],
                  ['\uD83E\uDEA8', (d.lunarSamples || []).length + '/' + LUNAR_SAMPLES_DATA.length, 'Samples'],
                  ['\uD83E\uDDE0', (d.quizCorrect || 0) + '/' + QUIZ_BANK.length, 'Quiz'],
                  ['\u23F1', getMissionElapsed(), 'Time']
                ].map(function(s) {
                  return h('div', { key: s[2], className: 'bg-white/5 rounded-lg p-1.5 text-center' },
                    h('div', { className: 'text-sm' }, s[0]),
                    h('p', { className: 'text-[11px] font-bold text-white' }, s[1]),
                    h('p', { className: 'text-[11px] text-slate-600' }, s[2])
                  );
                })
              ),
              // Badges earned
              h('p', { className: 'text-[11px] text-slate-600 font-bold mb-1' }, t('stem.moonmission.badges_earned', '\uD83C\uDFC5 BADGES EARNED:')),
              h('div', { className: 'flex flex-wrap gap-1.5 mb-2' },
                BADGES.map(function(b) {
                  var earned = !!(d.earnedBadges || {})[b.id];
                  return h('div', { key: b.id, className: 'flex items-center gap-1 px-2 py-1 rounded-full text-[11px] ' + (earned ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' : 'bg-white/5 text-slate-600 border border-white/5'), title: b.desc },
                    h('span', null, earned ? b.icon : '\uD83D\uDD12'),
                    h('span', null, b.name)
                  );
                })
              ),
              // Sample gallery
              (d.lunarSamples || []).length > 0 && h('div', { className: 'mt-2' },
                h('p', { className: 'text-[11px] text-slate-600 font-bold mb-1.5' }, '\uD83E\uDEA8 LUNAR SAMPLE COLLECTION (' + (d.lunarSamples || []).length + '/' + LUNAR_SAMPLES_DATA.length + ')'),
                h('div', { className: 'grid grid-cols-2 gap-1.5' },
                  (d.lunarSamples || []).map(function(s, i) {
                    return h('div', { key: i, className: 'bg-white/10 rounded-lg p-2 border border-white/10' },
                      h('div', { className: 'flex items-center gap-1.5 mb-1' },
                        h('span', { className: 'text-lg' }, s.icon),
                        h('div', null,
                          h('p', { className: 'text-[11px] font-bold text-white' }, s.name),
                          h('p', { className: 'text-[11px] text-indigo-300' }, s.type)
                        )
                      ),
                      h('p', { className: 'text-[11px] text-slate-600 leading-relaxed' }, s.fact)
                    );
                  })
                ),
                // Collection completeness
                (d.lunarSamples || []).length >= LUNAR_SAMPLES_DATA.length && h('div', { className: 'mt-2 bg-amber-500/10 rounded-lg p-2 border border-amber-500/20 text-center' },
                  h('p', { className: 'text-[11px] font-bold text-amber-300' }, '\uD83C\uDFC6 COMPLETE COLLECTION! All ' + LUNAR_SAMPLES_DATA.length + ' samples recovered.'),
                  h('p', { className: 'text-[11px] text-amber-400' }, t('stem.moonmission.these_samples_will_be_studied_by_scien', 'These samples will be studied by scientists for decades to come.'))
                )
              )
            ),
            // ── Decision Analysis (from Mission Events) ──
            (d.decisionLog || []).length > 0 && h('div', { className: 'mt-3 bg-white/5 rounded-xl p-3 border border-white/10' },
              h('p', { className: 'text-[11px] text-slate-600 font-bold mb-2' }, t('stem.moonmission.decision_analysis', '\uD83D\uDCCA DECISION ANALYSIS')),
              (d.decisionLog || []).map(function(dec, i) {
                return h('div', { key: i, className: 'bg-white/5 rounded-lg p-2.5 border border-white/10 mb-1.5' },
                  h('div', { className: 'flex justify-between items-center mb-1' },
                    h('span', { className: 'text-[11px] font-bold text-white' }, dec.title),
                    h('span', { className: 'text-[11px] px-2 py-0.5 rounded-full ' +
                      (dec.quality === 'optimal' ? 'bg-green-500/20 text-green-300' :
                       dec.quality === 'adequate' ? 'bg-yellow-500/20 text-yellow-300' :
                       'bg-red-500/20 text-red-300')
                    }, dec.quality.toUpperCase())
                  ),
                  h('p', { className: 'text-[11px] text-slate-600' }, 'Your choice: "' + dec.chosen + '"'),
                  dec.quality !== 'optimal' && h('p', { className: 'text-[11px] text-indigo-300 mt-1' },
                    '\uD83D\uDCA1 Better option: "' + dec.optimal + '"'
                  ),
                  h('details', { className: 'mt-1' },
                    h('summary', { className: 'text-[11px] text-slate-600 cursor-pointer' }, t('stem.moonmission.historical_context', 'Historical context')),
                    h('p', { className: 'text-[11px] text-slate-200 mt-1 pl-2' }, dec.historical)
                  )
                );
              }),
              // Overall decision score
              (function() {
                var dlog = d.decisionLog || [];
                var optCount = dlog.filter(function(x) { return x.quality === 'optimal'; }).length;
                var total = dlog.length;
                var pct = total > 0 ? Math.round(optCount / total * 100) : 0;
                return h('div', { className: 'bg-indigo-500/10 rounded-lg p-2 border border-indigo-500/20 mt-2 text-center' },
                  h('p', { className: 'text-xs font-bold ' + (pct >= 80 ? 'text-green-300' : pct >= 50 ? 'text-yellow-300' : 'text-orange-300') },
                    'Decision Score: ' + optCount + '/' + total + ' optimal (' + pct + '%)'),
                  h('p', { className: 'text-[11px] text-slate-200 mt-0.5' },
                    pct >= 80 ? 'Outstanding problem-solving! You think like a real mission commander.' :
                    pct >= 50 ? 'Solid decisions. Review the notes above to learn what real astronauts did.' :
                    'Room for improvement \u2014 but every astronaut learns from experience. Try again!')
                );
              })()
            ),

            h('button', {
              'aria-label': t('stem.moonmission.reset_and_start_a_new_moon_mission_fro', 'Reset and start a new Moon mission from the beginning'),
              onClick: function() {
                upd('missionPhase', 0);
                upd('missionLog', []);
                upd('missionXP', 0);
                upd('lunarSamples', []);
                upd('missionStartTime', 0);
                upd('earnedBadges', {});
                upd('quizCorrect', 0);
                upd('quizIdx', 0);
                upd('showQuiz', false);
                upd('quizAnswered', false);
                // Full mission-slice reset — these were missed, so on replay the random
                // events never re-fired (all ids stuck in resolvedEvents) and the
                // descent/EVA onboarding never re-showed.
                upd('resolvedEvents', []);
                upd('decisionLog', []);
                upd('activeEvent', null);
                upd('eventOutcome', null);
                upd('crewMorale', 100);
                upd('aiBriefing', null);
                upd('aiBriefingLoading', false);
                upd('descentStarted', false);
                upd('evaStarted', false);
                upd('quizSelectedAnswer', -1);
                upd('deltaVHunt', null);
              },
              className: 'px-6 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700'
            }, t('stem.moonmission.fly_another_mission', '\uD83D\uDD04 Fly Another Mission'))
          )
        ),

        // === H7b'' inquiry widget: orbital delta-V discovery ===
        // Gated to the briefing + mission-complete phases — this light-theme panel was rendering on EVERY
        // phase, stacking a jarring light card beneath the dark immersive launch/orbit/EVA canvases.
        (phase === 0 || phase >= 10) && (function() {
          var iq = d.deltaVHunt || { massRatio: 3, burnDur: 180, isp: 311, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
          function setIQ(patch) { upd('deltaVHunt', Object.assign({}, iq, patch)); }
          var g = 9.81;
          var deltaV = iq.isp * g * Math.log(iq.massRatio);
          var orbit = deltaV < 7800 ? 'insufficient' : (deltaV < 11200 ? 'leo' : 'escape');
          var orbitMeta = {
            insufficient: { label: t('stem.moonmission.insufficient_suborbital', '🔴 Insufficient — suborbital'), color: '#dc2626', bg: 'rgba(220,38,38,0.10)', border: '#ef4444' },
            leo:          { label: t('stem.moonmission.leo_earth_orbit', '🟢 LEO / Earth orbit'),          color: '#059669', bg: 'rgba(16,185,129,0.10)', border: '#10b981' },
            escape:       { label: t('stem.moonmission.escape_velocity_lunar_beyond', '🚀 Escape velocity (lunar/beyond)'), color: '#0ea5e9', bg: 'rgba(14,165,233,0.10)', border: '#0ea5e9' }
          }[orbit];
          function logObs() {
            setIQ({ log: (iq.log || []).concat([{ mr: iq.massRatio, bd: iq.burnDur, isp: iq.isp, dv: Math.round(deltaV), o: orbit }]).slice(-8) });
          }
          return h('div', { className: 'mt-3 p-3 rounded-lg bg-slate-50 border border-indigo-300' },
            h('div', { className: 'text-sm font-black text-indigo-700 mb-1' }, t('stem.moonmission.orbital_delta_v_discovery', '🛰️ Orbital delta-V discovery')),
            h('p', { className: 'text-[11px] text-slate-700 mb-2 leading-relaxed' },
              t('stem.moonmission.tsiolkovsky_rocket_equation_adjust_mas', 'Tsiolkovsky rocket equation. Adjust mass ratio, burn duration, and specific impulse (Isp). Discrete 3-state outcome shows whether your delta-V is insufficient, achieves LEO, or escapes Earth. No score, no reveal.')),
            h('div', { className: 'mb-2 p-2 rounded text-center', style: { background: orbitMeta.bg, border: '1px solid ' + orbitMeta.border } },
              h('div', { className: 'text-sm font-black', style: { color: orbitMeta.color } }, orbitMeta.label),
              h('div', { className: 'text-[10px] text-slate-700 mt-1' }, 'Δv = ' + Math.round(deltaV) + ' m/s')
            ),
            h('div', { className: 'grid grid-cols-3 gap-2 mb-2' },
              [
                { key: 'massRatio', label: t('stem.moonmission.mass_ratio', 'Mass ratio'), val: iq.massRatio, min: 1.2, max: 12, step: 0.1 },
                { key: 'burnDur',   label: t('stem.moonmission.burn_dur_s', 'Burn dur (s)'), val: iq.burnDur,   min: 30, max: 600, step: 10 },
                { key: 'isp',       label: t('stem.moonmission.isp_s', 'Isp (s)'),     val: iq.isp,       min: 100, max: 450, step: 5 }
              ].map(function(s) {
                return h('div', { key: s.key },
                  h('label', { htmlFor: 'dv-' + s.key, className: 'block text-[10px] font-bold text-slate-700 mb-0.5' },
                    s.label + ': ', h('span', { className: 'font-mono text-indigo-700' }, s.val)),
                  h('input', { id: 'dv-' + s.key, type: 'range', 'aria-valuetext': (s.key === 'massRatio' ? (s.val + ' to 1 mass ratio') : s.key === 'isp' ? (s.val + ' seconds specific impulse') : (s.val + ' seconds')), min: s.min, max: s.max, step: s.step, value: s.val,
                    onChange: function(e) { var p = {}; p[s.key] = parseFloat(e.target.value); setIQ(p); },
                    className: 'w-full', 'aria-label': s.label }));
              })
            ),
            h('div', { className: 'flex gap-1 items-center mb-2 flex-wrap' },
              h('button', { onClick: logObs, className: 'px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-[10px] font-bold text-slate-700' }, t('stem.moonmission.log', '📋 Log')),
              h('button', { onClick: function() { setIQ({ massRatio: 3, burnDur: 180, isp: 311, log: [], hypothesis: '', stuckRevealed: false, understood: false, explanation: '' }); },
                className: 'px-2 py-0.5 rounded bg-white hover:bg-slate-100 text-[10px] font-semibold text-slate-600 border border-slate-300' }, t('stem.moonmission.reset', '↺ Reset')),
              (iq.log || []).length > 0 && h('span', { className: 'text-[10px] text-slate-500 italic' }, (iq.log || []).length + ' logged')
            ),
            (iq.log || []).length > 0 && h('table', { className: 'text-[10px] w-full border-collapse text-slate-700 mb-2' },
              h('thead', null, h('tr', { className: 'bg-slate-100' },
                ['mass ratio', 'burn s', 'Isp s', 'Δv m/s', 'outcome'].map(function(c, i) { return h('th', { key: 'h' + i, className: 'px-1 border border-slate-200 text-left' }, c); }))),
              h('tbody', null, iq.log.map(function(o, idx) {
                return h('tr', { key: 'lr' + idx },
                  h('td', { className: 'px-1 border border-slate-200 font-mono' }, o.mr),
                  h('td', { className: 'px-1 border border-slate-200 font-mono' }, o.bd),
                  h('td', { className: 'px-1 border border-slate-200 font-mono' }, o.isp),
                  h('td', { className: 'px-1 border border-slate-200 font-mono' }, o.dv),
                  h('td', { className: 'px-1 border border-slate-200' }, o.o));
              }))
            ),
            h('textarea', { value: iq.hypothesis || '', onChange: function(e) { setIQ({ hypothesis: e.target.value }); },
              placeholder: t('stem.moonmission.hypothesis_free_text_no_right_answer_w', 'Hypothesis (free text — no right answer): Which lever matters most?'),
              className: 'w-full text-[11px] border border-slate-300 rounded p-1 font-mono leading-snug mb-2', rows: 2 }),
            !iq.stuckRevealed && h('button', { onClick: function() { setIQ({ stuckRevealed: true }); },
              className: 'px-2 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-[10px] font-bold text-amber-800 border border-amber-300 mb-2' },
              t('stem.moonmission.stuck_show_open_prompts', '🤔 Stuck — show open prompts')),
            iq.stuckRevealed && h('div', { className: 'p-2 rounded bg-amber-50 border border-amber-200 text-[10px] text-slate-700 leading-relaxed mb-2' },
              h('ul', { className: 'list-disc pl-4 space-y-0.5' },
                h('li', null, t('stem.moonmission.hold_two_sliders_steady_move_one_watch', 'Hold two sliders steady. Move one. Watch.')),
                h('li', null, t('stem.moonmission.find_two_settings_producing_the_same_o', 'Find two settings producing the same outcome.')),
                h('li', null, t('stem.moonmission.which_slider_affects_v_the_most_use_th', 'Which slider affects Δv the most? Use the log.')),
                h('li', null, t('stem.moonmission.real_spacecraft_trade_fuel_mass_agains', 'Real spacecraft trade fuel mass against Isp. Investigate why.')))),
            h('div', { className: 'p-2 rounded bg-emerald-50 border border-emerald-200' },
              h('label', { className: 'flex items-center gap-1 text-[10px] font-bold text-emerald-800 cursor-pointer' },
                h('input', { type: 'checkbox', checked: !!iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); }, className: 'w-3 h-3' }),
                t('stem.moonmission.i_think_i_understand_the_trade_offs', 'I think I understand the trade-offs')),
              iq.understood && h('textarea', { value: iq.explanation || '', onChange: function(e) { setIQ({ explanation: e.target.value }); },
                placeholder: t('stem.moonmission.explain_in_your_own_words_how_do_mass_', 'Explain in your own words: how do mass ratio, burn duration, and Isp interact?'),
                className: 'w-full text-[11px] border border-emerald-300 rounded p-1 font-mono leading-snug mt-1', rows: 3 })),
            h('div', { className: 'mt-2 text-[10px] italic text-slate-500' },
              t('stem.moonmission.design_note_discrete_3_state_outcome_n', 'Design note: discrete 3-state outcome; no score; no reveal — by design.'))
          );
        })(),

        // Mission Log (collapsible)
        missionLog.length > 0 && h('div', { className: 'mt-3 bg-slate-50 rounded-lg p-2 border border-slate-400' },
          h('p', { className: 'text-[11px] text-slate-600 font-bold mb-1' }, '\uD83D\uDCCB MISSION LOG (' + missionLog.length + ' entries)'),
          h('div', { className: 'space-y-0.5 max-h-32 overflow-y-auto' },
            missionLog.slice(-8).reverse().map(function(entry, i) {
              return h('div', { key: i, className: 'flex justify-between text-[11px]' },
                h('span', { className: 'text-slate-600' }, entry.text),
                h('span', { className: 'text-slate-200 font-mono' }, entry.time)
              );
            })
          )
        )
      );
    }
  });
})();
}
